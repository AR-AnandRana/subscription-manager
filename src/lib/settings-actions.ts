/**
 * Settings mutations, replacing the endpoints under endpoints/settings/,
 * endpoints/categories/, endpoints/currency/, endpoints/payments/,
 * endpoints/household/ and endpoints/notifications/.
 */

import { createClient } from './supabase/client';
import type { Settings } from './types';

export async function updateSettings(patch: Partial<Settings>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase.from('settings').update(patch).eq('user_id', user.id);
  if (error) throw error;
}

export async function updateProfile(patch: Record<string, unknown>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) throw error;
}

/** Insert a row into a per-user table, stamping the owner. */
export async function insertOwned(table: string, values: Record<string, unknown>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase.from(table).insert({ ...values, user_id: user.id });
  if (error) throw error;
}

export async function updateRow(table: string, id: number, values: Record<string, unknown>) {
  const supabase = createClient();
  const { error } = await supabase.from(table).update(values).eq('id', id);
  if (error) throw error;
}

export async function deleteRow(table: string, id: number) {
  const supabase = createClient();
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

/** Upsert a singleton settings row that is keyed by user_id rather than id. */
export async function upsertUserRow(table: string, values: Record<string, unknown>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase
    .from(table)
    .upsert({ ...values, user_id: user.id }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function fetchUserRow<T>(table: string): Promise<T | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from(table).select('*').eq('user_id', user.id).maybeSingle();
  return (data as T) ?? null;
}

/**
 * Whether a lookup row is still referenced by a subscription.
 *
 * Wallos refuses to delete a category, currency or payment method that is in
 * use rather than silently orphaning subscriptions, so the UI has to ask first.
 */
export async function countSubscriptionsUsing(
  column: 'category_id' | 'currency_id' | 'payment_method_id' | 'payer_user_id',
  id: number,
): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq(column, id);
  return count ?? 0;
}
