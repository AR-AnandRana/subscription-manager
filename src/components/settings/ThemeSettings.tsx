'use client';

import { useEffect, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { updateSettings } from '@/lib/settings-actions';
import { COLOR_THEMES, type ColorTheme, type Theme } from '@/lib/constants';

const COLOR_THEME_IDS: Record<ColorTheme, string | null> = {
  blue: null, // the base theme.css palette; no override file
  green: 'green-theme',
  red: 'red-theme',
  yellow: 'yellow-theme',
  purple: 'purple-theme',
};

/** Apply the theme to the live document the way ThemeScript does on load. */
function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'automatic' && prefersDark);
  const link = document.getElementById('dark-theme') as HTMLLinkElement | null;
  if (link) link.disabled = !isDark;
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('light', !isDark);
}

function applyColorTheme(colorTheme: ColorTheme) {
  for (const [name, id] of Object.entries(COLOR_THEME_IDS)) {
    if (!id) continue;
    const link = document.getElementById(id) as HTMLLinkElement | null;
    if (link) link.disabled = name !== colorTheme;
  }
}

/** Theme settings, from settings.php: theme, colours, custom colours, custom CSS. */
export function ThemeSettings() {
  const { settings, t, refresh } = useAppData();
  const [theme, setTheme] = useState<Theme>(settings.theme);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(settings.color_theme);
  const [mainColor, setMainColor] = useState(settings.main_color ?? '#FFFFFF');
  const [accentColor, setAccentColor] = useState(settings.accent_color ?? '#FFFFFF');
  const [hoverColor, setHoverColor] = useState(settings.hover_color ?? '#FFFFFF');
  const [customCss, setCustomCss] = useState(settings.custom_css);

  // Keep localStorage in step so ThemeScript applies the right theme on the
  // next load, before React has mounted.
  useEffect(() => {
    localStorage.setItem('wallos-theme', settings.theme);
    localStorage.setItem('wallos-color-theme', settings.color_theme);
  }, [settings.theme, settings.color_theme]);

  async function chooseTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
    localStorage.setItem('wallos-theme', next);
    await updateSettings({ theme: next });
    refresh();
  }

  async function chooseColorTheme(next: ColorTheme) {
    setColorTheme(next);
    applyColorTheme(next);
    localStorage.setItem('wallos-color-theme', next);
    await updateSettings({ color_theme: next });
    refresh();
  }

  async function saveCustomColors() {
    if (mainColor.toLowerCase() === accentColor.toLowerCase()) {
      showErrorMessage(t('main_accent_color_error'));
      return;
    }
    try {
      await updateSettings({ main_color: mainColor, accent_color: accentColor, hover_color: hoverColor });
      localStorage.setItem(
        'wallos-custom-colors',
        JSON.stringify({ main_color: mainColor, accent_color: accentColor, hover_color: hoverColor }),
      );
      showSuccessMessage(t('save'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  async function resetCustomColors() {
    try {
      await updateSettings({ main_color: null, accent_color: null, hover_color: null });
      localStorage.removeItem('wallos-custom-colors');
      document.getElementById('custom_theme_colors')?.remove();
      setMainColor('#FFFFFF');
      setAccentColor('#FFFFFF');
      setHoverColor('#FFFFFF');
      showSuccessMessage(t('reset'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  async function saveCustomCss() {
    try {
      await updateSettings({ custom_css: customCss });
      localStorage.setItem('wallos-custom-css', customCss);
      let style = document.getElementById('custom_css');
      if (!style) {
        style = document.createElement('style');
        style.id = 'custom_css';
        document.head.appendChild(style);
      }
      style.textContent = customCss;
      showSuccessMessage(t('save'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('theme_settings')}</h2>
      </header>
      <div className="account-settings-theme">
        <div>
          <h3>{t('theme')}</h3>
          <div className="form-group-inline wrap">
            <button
              type="button"
              className={`dark-theme-button capitalize ${theme === 'light' ? 'selected' : ''}`}
              onClick={() => chooseTheme('light')}
              id="theme-light"
            >
              <i className="fa-solid fa-sun" /> {t('light_theme')}
            </button>
            <button
              type="button"
              className={`dark-theme-button capitalize ${theme === 'dark' ? 'selected' : ''}`}
              onClick={() => chooseTheme('dark')}
              id="theme-dark"
            >
              <i className="fa-solid fa-moon" /> {t('dark_theme')}
            </button>
            <button
              type="button"
              className={`dark-theme-button capitalize ${theme === 'automatic' ? 'selected' : ''}`}
              onClick={() => chooseTheme('automatic')}
              id="theme-automatic"
            >
              <i className="fa-solid fa-circle-half-stroke" /> {t('automatic')}
            </button>
          </div>
        </div>

        <div>
          <form className="theme-selector" onSubmit={(event) => event.preventDefault()}>
            <h3>{t('colors')}</h3>
            <div className="form-group-inline wrap">
              {COLOR_THEMES.map((name) => (
                <div className="theme" key={name}>
                  <input
                    type="radio"
                    name="theme"
                    id={`theme-${name}`}
                    value={name}
                    checked={colorTheme === name}
                    onChange={() => chooseColorTheme(name)}
                  />
                  <label
                    htmlFor={`theme-${name}`}
                    className={`theme-preview ${name} ${colorTheme === name ? 'is-selected' : ''}`}
                  >
                    <span className="main-color" />
                    <span className="accent-color" />
                    <span className="hover-color" />
                  </label>
                </div>
              ))}
            </div>
          </form>
        </div>

        <div>
          <h3>{t('custom_colors')}</h3>
          <div className="custom-colors wrap">
            <div className="form-group-inline mobile-grow color-picker-button">
              <input
                type="color"
                id="mainColor"
                value={mainColor}
                onChange={(event) => setMainColor(event.target.value)}
                className="color-picker fa-solid fa-eye-dropper"
              />
              <label htmlFor="mainColor">{t('main_color')}</label>
            </div>
            <div className="form-group-inline mobile-grow color-picker-button">
              <input
                type="color"
                id="accentColor"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                className="color-picker fa-solid fa-eye-dropper"
              />
              <label htmlFor="accentColor">{t('accent_color')}</label>
            </div>
            <div className="form-group-inline mobile-grow color-picker-button">
              <input
                type="color"
                id="hoverColor"
                value={hoverColor}
                onChange={(event) => setHoverColor(event.target.value)}
                className="color-picker fa-solid fa-eye-dropper"
              />
              <label htmlFor="hoverColor">{t('hover_color')}</label>
            </div>
          </div>
          <div className="custom-colors wrap">
            <input
              type="button"
              value={t('reset_custom_colors')}
              onClick={resetCustomColors}
              className="secondary-button thin mobile-grow"
              id="reset-colors"
            />
            <input
              type="button"
              value={t('save_custom_colors')}
              onClick={saveCustomColors}
              className="buton thin mobile-grow"
              id="save-colors"
            />
          </div>
        </div>

        <div>
          <h3>{t('custom_css')}</h3>
          <div className="form-group">
            <div className="form-group-inline">
              <textarea
                name="customCss"
                id="customCss"
                placeholder={t('custom_css')}
                className="thin"
                value={customCss}
                onChange={(event) => setCustomCss(event.target.value)}
              />
            </div>
            <div className="form-group-inline">
              <input
                type="button"
                value={t('save_custom_css')}
                onClick={saveCustomCss}
                className="buton thin mobile-grow"
                id="save-css"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
