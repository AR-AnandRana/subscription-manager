import { createAdminClient, SERVICE_KEY_MISSING } from '@/lib/supabase/admin';
import { icalEscape, icalFold } from '@/lib/ical';
import { parseDate } from '@/lib/dates';
import { CYCLE_ONE_TIME } from '@/lib/constants';
import type { Subscription } from '@/lib/types';

/**
 * The subscribable calendar feed, replacing api/subscriptions/get_ical_feed.php.
 *
 * Calendar apps fetch this URL without a session, so the caller is identified by
 * the account's API key alone — the same scheme upstream uses. That means the
 * lookup cannot run as the user, hence the service role key.
 *
 * Recurring subscriptions are emitted as a single event with an RRULE, so the
 * calendar expands future occurrences itself rather than the feed listing years
 * of dates.
 */
export async function GET(request: Request) {
  const apiKey = new URL(request.url).searchParams.get('api_key');
  if (!apiKey) return new Response('Missing api_key', { status: 400 });

  const admin = createAdminClient();
  if (!admin) return new Response(SERVICE_KEY_MISSING, { status: 501 });

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('api_key', apiKey)
    .maybeSingle();
  if (!profile) return new Response('Invalid api_key', { status: 403 });

  const [{ data: subscriptions }, { data: currencies }] = await Promise.all([
    admin.from('subscriptions').select('*').eq('user_id', profile.id).eq('inactive', false),
    admin.from('currencies').select('id, symbol').eq('user_id', profile.id),
  ]);

  const symbols = new Map((currencies ?? []).map((currency) => [currency.id, currency.symbol]));
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wallos//Subscription Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Wallos',
  ];

  for (const subscription of (subscriptions ?? []) as Subscription[]) {
    const date = parseDate(subscription.next_payment);
    if (!date) continue;

    const day =
      `${date.getFullYear()}` +
      `${String(date.getMonth() + 1).padStart(2, '0')}` +
      `${String(date.getDate()).padStart(2, '0')}`;
    const symbol = symbols.get(subscription.currency_id ?? -1) ?? '';
    const price = Number(subscription.price).toFixed(2);

    lines.push(
      'BEGIN:VEVENT',
      `UID:wallos-subscription-${subscription.id}@wallos`,
      `DTSTAMP:${stamp}`,
      icalFold(`SUMMARY:${icalEscape(subscription.name)}`),
      icalFold(`DESCRIPTION:${icalEscape(`${symbol}${price}`)}`),
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${day}`,
    );

    const rule = recurrenceRule(subscription);
    if (rule) lines.push(rule);

    lines.push('STATUS:CONFIRMED', 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="wallos.ics"',
      'Cache-Control': 'no-store',
    },
  });
}

/** Map a Wallos cycle onto an iCalendar recurrence rule. */
function recurrenceRule(subscription: Subscription): string | null {
  if (subscription.cycle === CYCLE_ONE_TIME || !subscription.auto_renew) return null;
  const interval = Math.max(1, subscription.frequency);
  const frequency = { 1: 'DAILY', 2: 'WEEKLY', 3: 'MONTHLY', 4: 'YEARLY' }[subscription.cycle];
  return frequency ? `RRULE:FREQ=${frequency};INTERVAL=${interval}` : null;
}
