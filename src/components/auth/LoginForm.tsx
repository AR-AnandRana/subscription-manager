'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthShell, ErrorBox, SuccessBox } from '@/components/AuthShell';
import { createClient } from '@/lib/supabase/client';

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const registered = searchParams.get('registered') === 'true';

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('Login failed. Please check your credentials.');
      setPending(false);
      return;
    }

    router.push(searchParams.get('redirect') || '/');
    router.refresh();
  }

  return (
    <AuthShell subtitle="Please login">
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <input type="submit" value={pending ? 'Logging in…' : 'Login'} disabled={pending} />
        </div>

        <ErrorBox message={error} />
        <SuccessBox message={registered ? 'Registration successful' : null} />

        <div className="login-form-link">
          <Link href="/password-reset">Forgot Password</Link>
        </div>
        <div className="login-form-link account-switch">
          <span>Don&apos;t have an account yet?</span>
          <Link href="/register">Register</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
