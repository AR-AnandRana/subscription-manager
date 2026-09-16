import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { ThemeScript } from '@/components/ThemeScript';
import { Stylesheet } from '@/components/Stylesheet';
import { ThemeSync } from '@/components/ThemeSync';
import { Header } from '@/components/Header';
import { AppDataProvider } from '@/components/AppDataProvider';
import { ToastHost } from '@/components/Toast';
import { loadAppData } from '@/lib/data';
import { textDirection } from '@/lib/i18n';
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
  themeColor: '#12151C',
};

/**
 * Root layout for the signed-in app. The stylesheets are Wallos's own, served
 * from /public unchanged, so the rendered pages match the PHP app's design
 * token for token. Theme variants ship as separate files toggled at runtime,
 * exactly as upstream does.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await loadAppData();
  if (!data) redirect('/login');

  // Upstream puts the language direction on <html> and the same class on <body>,
  // which the stylesheet's `.rtl` rules key off.
  const direction = textDirection(data.profile.language);
  const bodyClasses = [direction, data.settings.mobile_nav ? 'mobile-navigation' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <html lang={data.profile.language} dir={direction} suppressHydrationWarning>
      <head>
        <Stylesheet href="/styles/theme.css" />
        <Stylesheet href="/styles/styles.css" />
        <Stylesheet href="/styles/dark-theme.css" id="dark-theme" disabled />
        <Stylesheet href="/styles/themes/red.css" id="red-theme" disabled />
        <Stylesheet href="/styles/themes/green.css" id="green-theme" disabled />
        <Stylesheet href="/styles/themes/yellow.css" id="yellow-theme" disabled />
        <Stylesheet href="/styles/themes/purple.css" id="purple-theme" disabled />
        <Stylesheet href="/styles/barlow.css" />
        <Stylesheet href="/styles/font-awesome.min.css" />
        <Stylesheet href="/styles/brands.css" />
        <ThemeScript />
      </head>
      <body suppressHydrationWarning className={bodyClasses}>
        <AppDataProvider value={data}>
          <ThemeSync />
          <Header />
          <main>{children}</main>
          <ToastHost />
        </AppDataProvider>
      </body>
    </html>
  );
}
