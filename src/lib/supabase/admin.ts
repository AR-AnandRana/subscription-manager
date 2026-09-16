import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from './server';

/**
 * A Supabase client with the service role key, for the few operations a
 * signed-in user cannot perform on their own: creating accounts, and the
 * maintenance jobs that touch every account.
 *
 * The key is server-only — it bypasses row level security entirely, so it must
 * never be exposed to the browser and is never prefixed NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Resolve the caller and confirm they are an admin, as admin.php does. */
export async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Not signed in' };

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { ok: false, status: 403, error: 'Forbidden' };

  return { ok: true };
}

export const SERVICE_KEY_MISSING =
  'This needs the service role key. Add SUPABASE_SERVICE_ROLE_KEY to the server environment (Netlify → Environment variables) and redeploy.';
