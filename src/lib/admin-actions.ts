/**
 * Admin mutations, replacing endpoints/admin/* and endpoints/cronjobs/*.
 *
 * Settings go straight to Supabase, guarded by the admin-only policies. The two
 * operations that need more than a signed-in user's rights — creating an account
 * and running a maintenance job — go through server routes holding the service
 * role key, which must never reach the browser.
 */

import { createClient } from './supabase/client';
import type { AdminSettings, OauthSettings } from './types';

export async function updateAdminSettings(patch: Partial<AdminSettings>) {
  const supabase = createClient();
  const { error } = await supabase.from('admin_settings').update(patch).eq('id', 1);
  if (error) throw error;
}

export async function updateOauthSettings(patch: Partial<OauthSettings>) {
  const supabase = createClient();
  const { error } = await supabase.from('oauth_settings').update(patch).eq('id', 1);
  if (error) throw error;
}

export async function deleteUser(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc('admin_delete_user', { target: id });
  if (error) throw error;
}

export async function createUser(username: string, email: string, password: string) {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const body = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'Could not create the user');
}

/** Run one maintenance job and return whatever it printed. */
export async function runCronJob(task: string): Promise<string> {
  const response = await fetch(`/api/cron/${task}`, { method: 'POST' });
  const body = (await response.json()) as { output?: string; error?: string };
  if (!response.ok) throw new Error(body.error ?? `${task} failed`);
  return body.output ?? '';
}
