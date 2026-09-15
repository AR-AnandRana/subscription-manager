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
  const { profile, settings } = useAppData();
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
                <img src={`/${profile.avatar ?? 'images/avatars/0.svg'}`} alt="me" id="avatar" />
                <span id="user" className={hideOnMobile}>
                  {profile.username}
                </span>
              </button>
              <div className="dropdown-content">
                <Link href="/" className={hideOnMobile}>
                  <IconMobileMenuHome />
                  Dashboard
                </Link>
                <Link href="/subscriptions" className={hideOnMobile}>
                  <IconMobileMenuSubscriptions />
                  Subscriptions
                </Link>
                <Link href="/calendar" className={hideOnMobile}>
                  <IconMobileMenuCalendar />
                  Calendar
                </Link>
                <Link href="/stats" className={hideOnMobile}>
                  <IconMobileMenuStatistics />
                  Statistics
                </Link>
                <Link href="/settings" className={hideOnMobile}>
                  <IconMobileMenuSettings />
                  Settings
                </Link>
                <Link href="/profile">
                  <IconMobileMenuProfile />
                  Profile
                </Link>
                {profile.is_admin && (
                  <Link href="/admin">
                    <IconMobileMenuAdmin />
                    Admin
                  </Link>
                )}
                <Link href="/about">
                  <IconMobileMenuAbout />
                  About
                </Link>
                <a
                  href="/login"
                  onClick={(event) => {
                    event.preventDefault();
                    void logout();
                  }}
                >
                  <IconMobileMenuLogout />
                  Logout
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
  { href: '/', label: 'Dashboard', Icon: IconMobileMenuHome },
  { href: '/subscriptions', label: 'Subscriptions', Icon: IconMobileMenuSubscriptions },
  { href: '/calendar', label: 'Calendar', Icon: IconMobileMenuCalendar },
  { href: '/stats', label: 'Statistics', Icon: IconMobileMenuStatistics },
  { href: '/settings', label: 'Settings', Icon: IconMobileMenuSettings },
];

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="mobile-nav">
      {MOBILE_LINKS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link${pathname === href ? ' active' : ''}`}
          title={label}
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
