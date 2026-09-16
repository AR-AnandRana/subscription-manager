'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from './AppDataProvider';
import {
  IconLogo,
  IconMobileMenuAbout,
  IconMobileMenuAdmin,
  IconMobileMenuCalendar,
  IconMobileMenuHome,
  IconMobileMenuLogout,
  IconMobileMenuProfile,
  IconMobileMenuSettings,
  IconMobileMenuStatistics,
  IconMobileMenuSubscriptions,
} from './Icons';

export function Header() {
  const { profile, settings, t } = useAppData();
  const pathname = usePathname();
  const router = useRouter();
  // Storing the route the menu was opened on, rather than a plain boolean,
  // closes it on navigation without an effect that reacts to the new route.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpenedOn(null);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const hideOnMobile = settings.mobile_nav ? 'mobileNavigationHideOnMobile' : '';
  const avatar = profile.avatar ?? 'images/avatars/0.svg';
  const avatarSrc = avatar.startsWith('http') ? avatar : `/${avatar}`;

  return (
    <>
      <header>
        <div className="contain">
          <div className="logo">
            <Link href="/">
              <div className="logo-image" title="Wallos - Subscription Tracker">
                <IconLogo />
              </div>
            </Link>
          </div>
          <nav>
            <div className={`dropdown${open ? ' is-open' : ''}`} ref={dropdownRef}>
              <button className="dropbtn" onClick={() => setOpenedOn(open ? null : pathname)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarSrc} alt="me" id="avatar" />
                <span id="user" className={hideOnMobile}>
                  {profile.username}
                </span>
              </button>
              <div className="dropdown-content">
                <Link href="/" className={hideOnMobile}>
                  <IconMobileMenuHome />
                  {t('dashboard')}
                </Link>
                <Link href="/subscriptions" className={hideOnMobile}>
                  <IconMobileMenuSubscriptions />
                  {t('subscriptions')}
                </Link>
                <Link href="/calendar" className={hideOnMobile}>
                  <IconMobileMenuCalendar />
                  {t('calendar')}
                </Link>
                <Link href="/stats" className={hideOnMobile}>
                  <IconMobileMenuStatistics />
                  {t('stats')}
                </Link>
                <Link href="/settings" className={hideOnMobile}>
                  <IconMobileMenuSettings />
                  {t('settings')}
                </Link>
                <Link href="/profile">
                  <IconMobileMenuProfile />
                  {t('profile')}
                </Link>
                {profile.is_admin && (
                  <Link href="/admin">
                    <IconMobileMenuAdmin />
                    {t('admin')}
                  </Link>
                )}
                <Link href="/about">
                  <IconMobileMenuAbout />
                  {t('about')}
                </Link>
                <a
                  href="/login"
                  onClick={(event) => {
                    event.preventDefault();
                    void logout();
                  }}
                >
                  <IconMobileMenuLogout />
                  {t('logout')}
                </a>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {settings.mobile_nav && <MobileNav pathname={pathname} />}
    </>
  );
}

const MOBILE_LINKS = [
  { href: '/', labelKey: 'dashboard', Icon: IconMobileMenuHome },
  { href: '/subscriptions', labelKey: 'subscriptions', Icon: IconMobileMenuSubscriptions },
  { href: '/calendar', labelKey: 'calendar', Icon: IconMobileMenuCalendar },
  { href: '/stats', labelKey: 'stats', Icon: IconMobileMenuStatistics },
  { href: '/settings', labelKey: 'settings', Icon: IconMobileMenuSettings },
];

function MobileNav({ pathname }: { pathname: string }) {
  const { t } = useAppData();
  return (
    <nav className="mobile-nav">
      {MOBILE_LINKS.map(({ href, labelKey, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link${pathname === href ? ' active' : ''}`}
          title={t(labelKey)}
        >
          <Icon />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
