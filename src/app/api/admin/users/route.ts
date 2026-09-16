import { NextResponse } from 'next/server';
import { createAdminClient, requireAdmin, SERVICE_KEY_MISSING } from '@/lib/supabase/admin';

/**
 * Create a user, replacing endpoints/admin/adduser.php.
 *
 * Creating an account is an auth-admin operation, so it needs the service role
 * key rather than the caller's session. The sign-up trigger seeds the new
 * account exactly as it does for a self-registered one.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: SERVICE_KEY_MISSING }, { status: 501 });

  const { username, email, password } = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };

  if (!username?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Please fill all fields' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
  }

  const { error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { username: username.trim() },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
