import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { createClient } from '@/lib/supabase/server';

/**
 * A signed-in user has nothing to do on the login page, so send them home.
 * This check lives here rather than in a proxy: Netlify's adapter cannot yet
 * bundle a Next.js 16 proxy (see README), and the (app) layout already guards
 * the signed-in pages on the server.
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/');

  return <LoginForm />;
}
