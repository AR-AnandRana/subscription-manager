'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthShell, ErrorBox, SuccessBox } from '@/components/AuthShell';
import { createClient } from '@/lib/supabase/client';

export default function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (resetError) setError(resetError.message);
    else setSent(true);
    setPending(false);
  }

  return (
    <AuthShell subtitle="Reset your password">
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <input type="submit" value={pending ? 'Sending…' : 'Send reset link'} disabled={pending} />
        </div>

        <ErrorBox message={error} />
        <SuccessBox message={sent ? 'If that email is registered, a reset link is on its way.' : null} />

        <div className="login-form-link account-switch">
          <span>Remembered it?</span>
          <Link href="/login">Login</Link>
        </div>
      </form>
    </AuthShell>
  );
}
