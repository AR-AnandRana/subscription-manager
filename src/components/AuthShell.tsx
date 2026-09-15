'use client';

import { IconLogo } from './Icons';
import { useLocalStorageState, usePrefersDark } from '@/lib/browser-state';
import type { Theme } from '@/lib/constants';

/**
 * The split-screen frame shared by login, registration and password reset,
 * matching the `.auth-split` markup in login.php.
 */
export function AuthShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <>
      <ThemeToggle />
      <div className="content auth-split">
        <aside className="auth-brand" aria-hidden="true">
          <div className="auth-brand-logo">
            <IconLogo />
          </div>
          <div className="auth-brand-text">
            <h1>Know where your money goes.</h1>
            <p>Track your subscriptions, see your spending, and never miss a renewal.</p>
          </div>
          <div className="auth-brand-footer">Wallos &mdash; Subscription Tracker</div>
        </aside>
        <section className="container">
          <header>
            <div className="logo-image" title="Wallos - Subscription Tracker">
              <IconLogo />
            </div>
            <p>{subtitle}</p>
          </header>
          {children}
        </section>
      </div>
    </>
  );
}

/** Light/dark switch for the signed-out pages, which have no settings to read. */
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorageState<Theme>('wallos-theme', 'automatic');
  const prefersDark = usePrefersDark();
  const isDark = theme === 'dark' || (theme === 'automatic' && prefersDark);

  function toggle() {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    const link = document.getElementById('dark-theme') as HTMLLinkElement | null;
    if (link) link.disabled = next !== 'dark';
    document.documentElement.style.colorScheme = next;
  }

  return (
    <button type="button" className="theme-toggle" id="theme-toggle" title="Theme" aria-label="Theme" onClick={toggle}>
      <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} />
    </button>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <ul className="error-box">
      <li>
        <i className="fa-solid fa-triangle-exclamation" />
        {message}
      </li>
    </ul>
  );
}

export function SuccessBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <ul className="success-box">
      <li>
        <i className="fa-solid fa-check" />
        {message}
      </li>
    </ul>
  );
}
