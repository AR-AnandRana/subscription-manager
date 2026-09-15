import type { Metadata, Viewport } from 'next';
import { ThemeScript } from '@/components/ThemeScript';
import { Stylesheet } from '@/components/Stylesheet';
import { ToastHost } from '@/components/Toast';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Wallos - Subscription Tracker',
  description: 'Open source personal subscription tracker',
  icons: {
    icon: '/images/icon/favicon.ico',
    apple: '/images/icon/apple-touch-icon-180.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Root layout for the signed-out pages. Upstream serves login, registration and
 * password reset with login.css *instead of* styles.css — the two define
 * conflicting rules for shared selectors — so these pages get their own root
 * layout rather than sharing the app's.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <Stylesheet href="/styles/theme.css" />
        <Stylesheet href="/styles/login.css" />
        <Stylesheet href="/styles/login-dark-theme.css" id="dark-theme" disabled />
        <Stylesheet href="/styles/themes/red.css" id="red-theme" disabled />
        <Stylesheet href="/styles/themes/green.css" id="green-theme" disabled />
        <Stylesheet href="/styles/themes/yellow.css" id="yellow-theme" disabled />
        <Stylesheet href="/styles/themes/purple.css" id="purple-theme" disabled />
        <Stylesheet href="/styles/barlow.css" />
        <Stylesheet href="/styles/font-awesome.min.css" />
        <ThemeScript />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
