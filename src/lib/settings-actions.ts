/**
 * Settings mutations, replacing the endpoints under endpoints/settings/,
 * endpoints/categories/, endpoints/currency/, endpoints/payments/,
 * endpoints/household/, endpoints/notifications/ and endpoints/ai/.
 */

import { createClient } from './supabase/client';
import type { Settings } from './types';

async function currentUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

export async function updateSettings(patch: Partial<Settings>) {
  const supabase = createClient();
  const userId = await currentUserId();
  const { error } = await supabase.from('settings').update(patch).eq('user_id', userId);
  if (error) throw error;
}

export async function updateProfile(patch: Record<string, unknown>) {
  const supabase = createClient();
  const userId = await currentUserId();
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

/** Insert a row into a per-user table, stamping the owner. */
export async function insertOwned(table: string, values: Record<string, unknown>) {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from(table)
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
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

/** Persist a drag-and-drop ordering, as upstream's sort endpoints do. */
export async function saveOrder(table: string, orderedIds: number[]) {
  const supabase = createClient();
  await Promise.all(
    orderedIds.map((id, index) => supabase.from(table).update({ sort_order: index }).eq('id', id)),
  );
}

/** Upsert a singleton settings row that is keyed by user_id rather than id. */
export async function upsertUserRow(table: string, values: Record<string, unknown>) {
  const supabase = createClient();
  const userId = await currentUserId();
  const { error } = await supabase
    .from(table)
    .upsert({ ...values, user_id: userId }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function fetchUserRow<T>(table: string): Promise<T | null> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data } = await supabase.from(table).select('*').eq('user_id', userId).maybeSingle();
  return (data as T) ?? null;
}

export async function deleteAiRecommendation(id: number) {
  const supabase = createClient();
  const { error } = await supabase.from('ai_recommendations').delete().eq('id', id);
  if (error) throw error;
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

/** Upload a custom payment-method icon and return its public URL. */
export async function uploadPaymentIcon(file: File): Promise<string> {
  const supabase = createClient();
  const userId = await currentUserId();
  const extension = file.name.split('.').pop() ?? 'png';
  const path = `${userId}/icon-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('logos').getPublicUrl(path);
  return publicUrl;
}
