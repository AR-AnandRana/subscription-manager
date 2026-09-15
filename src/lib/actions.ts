/**
 * Subscription mutations. These replace the PHP endpoints under
 * endpoints/subscription/ — Supabase's row level security does the tenant
 * scoping those endpoints did by hand.
 */

import { createClient } from './supabase/client';
import { toDateString } from './dates';
import { rollForwardNextPayment } from './subscriptions';
import type { Subscription, SubscriptionView } from './types';

export type SubscriptionInput = Omit<Subscription, 'id' | 'user_id' | 'created_at'>;

export async function createSubscription(input: SubscriptionInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase.from('subscriptions').insert({ ...input, user_id: user.id });
  if (error) throw error;
}

export async function updateSubscription(id: number, input: Partial<SubscriptionInput>) {
  const supabase = createClient();
  const { error } = await supabase.from('subscriptions').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteSubscription(id: number) {
  const supabase = createClient();
  const { error } = await supabase.from('subscriptions').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Duplicate a subscription. Upstream appends "(1)" to the name so the copy is
 * distinguishable in the list straight away.
 */
export async function cloneSubscription(subscription: Subscription) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const {
    id: _id,
    user_id: _userId,
    created_at: _createdAt,
    ...rest
  } = subscription;

  const { error } = await supabase
    .from('subscriptions')
    .insert({ ...rest, name: `${subscription.name} (1)`, user_id: user.id });
  if (error) throw error;
}

/**
 * Advance a manual-renewal subscription to its next payment date.
 *
 * Auto-renewing subscriptions roll forward on read; manual ones only move when
 * the user says the payment happened, which is what this does.
 */
export async function renewSubscription(subscription: SubscriptionView) {
  const next = rollForwardNextPayment(
    subscription.next_payment,
    subscription.cycle,
    subscription.frequency,
  );
  if (!next) return;

  await updateSubscription(subscription.id, { next_payment: toDateString(next) });
}

/** Upload a logo to Supabase Storage and return its public URL. */
export async function uploadLogo(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const extension = file.name.split('.').pop() ?? 'png';
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('logos').getPublicUrl(path);
  return publicUrl;
}

/** Upload a profile avatar and return its public URL. */
export async function uploadAvatar(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const extension = file.name.split('.').pop() ?? 'png';
  const path = `${user.id}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);
  return publicUrl;
}

/**
 * Roll every overdue auto-renewing subscription forward.
 *
 * This is the upstream `updatenextpayment` cron. Running it opportunistically
 * when the app loads keeps dates correct without a scheduler; it writes only
 * when something is actually stale.
 */
export async function syncOverdueRenewals(subscriptions: Subscription[]): Promise<boolean> {
  const todayString = toDateString(new Date());
  const stale = subscriptions.filter(
    (s) =>
      !s.inactive &&
      s.auto_renew &&
      s.cycle !== 5 &&
      s.next_payment !== null &&
      s.next_payment < todayString,
  );
  if (stale.length === 0) return false;

  const supabase = createClient();
  await Promise.all(
    stale.map((subscription) => {
      const next = rollForwardNextPayment(
        subscription.next_payment,
        subscription.cycle,
        subscription.frequency,
      );
      if (!next) return Promise.resolve();
      return supabase
        .from('subscriptions')
        .update({ next_payment: toDateString(next) })
        .eq('id', subscription.id);
    }),
  );
  return true;
}
