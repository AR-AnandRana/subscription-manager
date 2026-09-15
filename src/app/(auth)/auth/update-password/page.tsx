'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthShell, ErrorBox } from '@/components/AuthShell';
import { createClient } from '@/lib/supabase/client';

/**
 * Landing page for the emailed reset link. Supabase has already exchanged the
 * link for a session by the time this renders, so it only needs to set the new
 * password.
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <AuthShell subtitle="Choose a new password">
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="password">New password:</label>
          <input
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirm-password">Confirm password:</label>
          <input
            type="password"
            id="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <input type="submit" value={pending ? 'Saving…' : 'Save password'} disabled={pending} />
        </div>
        <ErrorBox message={error} />
      </form>
    </AuthShell>
  );
}
