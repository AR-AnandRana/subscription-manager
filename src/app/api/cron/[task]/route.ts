import { NextResponse } from 'next/server';
import { createAdminClient, requireAdmin, SERVICE_KEY_MISSING } from '@/lib/supabase/admin';
import { rollForwardNextPayment, getPricePerMonth } from '@/lib/subscriptions';
import { toDateString } from '@/lib/dates';
import { WALLOS_VERSION } from '@/lib/constants';
import type { Subscription } from '@/lib/types';

/**
 * The maintenance jobs behind the admin page's Cronjobs buttons, replacing
 * endpoints/cronjobs/*.
 *
 * These run across every account, so they use the service role key. Jobs that
 * depend on delivery infrastructure this deployment does not have say so rather
 * than reporting success.
 */
export async function POST(request: Request, context: { params: Promise<{ task: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: SERVICE_KEY_MISSING }, { status: 501 });

  const { task } = await context.params;

  try {
    switch (task) {
      case 'updatenextpayment':
        return NextResponse.json({ output: await updateNextPayments(admin) });
      case 'storetotalyearlycost':
        return NextResponse.json({ output: await storeTotalYearlyCost(admin) });
      case 'checkforupdates':
        return NextResponse.json({ output: await checkForUpdates(admin) });
      case 'updateexchange':
        return NextResponse.json({ output: await updateExchangeRates(admin) });
      case 'sendnotifications':
      case 'sendcancellationnotifications':
      case 'sendresetpasswordemails':
      case 'sendverificationemails':
        return NextResponse.json({
          output:
            `${task}: not run. Sending needs an SMTP transport on the server; password reset and ` +
            'verification emails are sent by Supabase Auth itself. See NOTIFICATIONS in the README.',
        });
      case 'generaterecommendations':
        return NextResponse.json({
          output:
            'generaterecommendations: not run. Configure an AI provider under Settings → AI ' +
            'Recommendations; the provider call runs from the server once a model is selected.',
        });
      default:
        return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Job failed' },
      { status: 500 },
    );
  }
}

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/** Roll every overdue auto-renewing subscription forward. */
async function updateNextPayments(admin: Admin): Promise<string> {
  const todayString = toDateString(new Date());
  const { data } = await admin
    .from('subscriptions')
    .select('id, next_payment, cycle, frequency')
    .eq('inactive', false)
    .eq('auto_renew', true)
    .neq('cycle', 5)
    .lt('next_payment', todayString);

  const stale = (data ?? []) as Pick<Subscription, 'id' | 'next_payment' | 'cycle' | 'frequency'>[];
  let updated = 0;

  for (const subscription of stale) {
    const next = rollForwardNextPayment(subscription.next_payment, subscription.cycle, subscription.frequency);
    if (!next) continue;
    await admin.from('subscriptions').update({ next_payment: toDateString(next) }).eq('id', subscription.id);
    updated += 1;
  }

  return `Updated next payment dates: ${updated} subscription(s).`;
}

/** Record each account's current yearly cost, for the cost trend chart. */
async function storeTotalYearlyCost(admin: Admin): Promise<string> {
  const { data: profiles } = await admin.from('profiles').select('id, main_currency');
  const { data: currencies } = await admin.from('currencies').select('id, code, rate, user_id');
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('user_id, price, currency_id, cycle, frequency, inactive');

  const month = new Date().toISOString().slice(0, 7);
  let stored = 0;

  for (const profile of profiles ?? []) {
    const rates = new Map(
      (currencies ?? [])
        .filter((currency) => currency.user_id === profile.id)
        .map((currency) => [currency.id, Number(currency.rate)]),
    );
    const code =
      (currencies ?? []).find((currency) => currency.id === profile.main_currency)?.code ?? 'EUR';

    const yearly =
      (subscriptions ?? [])
        .filter((subscription) => subscription.user_id === profile.id && !subscription.inactive)
        .reduce((total, subscription) => {
          const rate = rates.get(subscription.currency_id as number) || 1;
          return (
            total + getPricePerMonth(subscription.cycle, subscription.frequency, Number(subscription.price) / rate)
          );
        }, 0) * 12;

    await admin
      .from('total_yearly_cost')
      .upsert(
        { user_id: profile.id, date: month, cost: Number(yearly.toFixed(2)), currency: code },
        { onConflict: 'user_id,date' },
      );
    stored += 1;
  }

  return `Stored total yearly cost for ${stored} account(s) for ${month}.`;
}

/** Compare the running version against the latest upstream release. */
async function checkForUpdates(admin: Admin): Promise<string> {
  const response = await fetch('https://api.github.com/repos/ellite/Wallos/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) return `Could not reach GitHub (HTTP ${response.status}).`;

  const release = (await response.json()) as { tag_name?: string };
  const latest = release.tag_name ?? '';
  await admin.from('admin_settings').update({ latest_version: latest }).eq('id', 1);

  return latest && latest !== WALLOS_VERSION
    ? `Latest upstream release is ${latest}; this build tracks ${WALLOS_VERSION}.`
    : `Up to date (${WALLOS_VERSION}).`;
}

/**
 * Refresh exchange rates for every account that has a Fixer key.
 *
 * Rates are stored relative to the account's main currency, because that is the
 * divisor the price conversion uses.
 */
async function updateExchangeRates(admin: Admin): Promise<string> {
  const { data: keys } = await admin.from('fixer').select('user_id, api_key, provider').neq('api_key', '');
  if (!keys || keys.length === 0) return 'No Fixer API key configured; nothing to update.';

  const lines: string[] = [];

  for (const entry of keys) {
    const { data: profile } = await admin
      .from('profiles')
      .select('main_currency')
      .eq('id', entry.user_id)
      .single();
    const { data: currencies } = await admin
      .from('currencies')
      .select('id, code')
      .eq('user_id', entry.user_id);
    if (!currencies?.length) continue;

    const base = currencies.find((currency) => currency.id === profile?.main_currency)?.code ?? 'EUR';
    const symbols = currencies.map((currency) => currency.code).join(',');
    const host = entry.provider === 1 ? 'https://api.apilayer.com/fixer' : 'https://data.fixer.io/api';
    const url =
      entry.provider === 1
        ? `${host}/latest?base=${base}&symbols=${symbols}`
        : `${host}/latest?access_key=${entry.api_key}&base=${base}&symbols=${symbols}`;

    const response = await fetch(url, {
      headers: entry.provider === 1 ? { apikey: entry.api_key } : {},
    });
    const body = (await response.json()) as { success?: boolean; rates?: Record<string, number>; error?: unknown };

    if (!response.ok || body.success === false || !body.rates) {
      lines.push(`Rates for one account failed: ${JSON.stringify(body.error ?? response.status)}`);
      continue;
    }

    for (const currency of currencies) {
      const rate = body.rates[currency.code];
      if (rate) await admin.from('currencies').update({ rate }).eq('id', currency.id);
    }
    await admin
      .from('last_exchange_update')
      .upsert({ user_id: entry.user_id, date: toDateString(new Date()) }, { onConflict: 'user_id' });

    lines.push(`Updated ${currencies.length} rates against ${base}.`);
  }

  return lines.join('\n') || 'Nothing to update.';
}
