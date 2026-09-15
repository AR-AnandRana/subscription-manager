'use client';

import { useEffect } from 'react';
import { useAppData } from './AppDataProvider';

const COLOR_THEME_IDS = ['red', 'green', 'yellow', 'purple'];

/**
 * Applies the theme stored on the account.
 *
 * ThemeScript runs before paint but can only read localStorage, so on a device
 * that has never loaded the app the saved theme would otherwise be ignored.
 * This mirrors the account's settings into localStorage once the server data
 * arrives, and applies them immediately so the first visit on a new device
 * still looks right.
 */
export function ThemeSync() {
  const { settings } = useAppData();

  useEffect(() => {
    const { theme, color_theme: colorTheme, main_color, accent_color, hover_color, custom_css } = settings;

    try {
      localStorage.setItem('wallos-theme', theme);
      localStorage.setItem('wallos-color-theme', colorTheme);
      if (main_color || accent_color || hover_color) {
        localStorage.setItem(
          'wallos-custom-colors',
          JSON.stringify({ main_color, accent_color, hover_color }),
        );
      } else {
        localStorage.removeItem('wallos-custom-colors');
      }
      if (custom_css) localStorage.setItem('wallos-custom-css', custom_css);
      else localStorage.removeItem('wallos-custom-css');
    } catch {
      // Blocked site data; the theme still applies for this page view.
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'automatic' && prefersDark);

    const darkLink = document.getElementById('dark-theme') as HTMLLinkElement | null;
    if (darkLink) darkLink.disabled = !isDark;
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);

    for (const name of COLOR_THEME_IDS) {
      const link = document.getElementById(`${name}-theme`) as HTMLLinkElement | null;
      if (link) link.disabled = name !== colorTheme;
    }
  }, [settings]);

  return null;
}
