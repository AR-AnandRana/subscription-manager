'use client';

import { useEffect, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { updateSettings } from '@/lib/settings-actions';
import { COLOR_THEMES, type ColorTheme, type Theme } from '@/lib/constants';

const COLOR_THEME_IDS: Record<ColorTheme, string | null> = {
  blue: null, // the base theme.css palette; no override file
  red: 'red-theme',
  green: 'green-theme',
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

export function ThemeSettings() {
  const { settings, refresh } = useAppData();
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
    try {
      await updateSettings({ main_color: mainColor, accent_color: accentColor, hover_color: hoverColor });
      localStorage.setItem(
        'wallos-custom-colors',
        JSON.stringify({ main_color: mainColor, accent_color: accentColor, hover_color: hoverColor }),
      );
      showSuccessMessage('Custom colors saved. Reload to apply.');
      refresh();
    } catch {
      showErrorMessage('Could not save the custom colors');
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
      showSuccessMessage('Custom colors reset');
      refresh();
    } catch {
      showErrorMessage('Could not reset the custom colors');
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
      showSuccessMessage('Custom CSS saved');
      refresh();
    } catch {
      showErrorMessage('Could not save the custom CSS');
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>Theme Settings</h2>
      </header>
      <div className="account-settings-theme">
        <div>
          <h3>Theme</h3>
          <div className="form-group-inline wrap">
            <button
              type="button"
              className={`dark-theme-button capitalize ${theme === 'light' ? 'selected' : ''}`}
              onClick={() => chooseTheme('light')}
              id="theme-light"
            >
              <i className="fa-solid fa-sun" /> Light Theme
            </button>
            <button
              type="button"
              className={`dark-theme-button capitalize ${theme === 'dark' ? 'selected' : ''}`}
              onClick={() => chooseTheme('dark')}
              id="theme-dark"
            >
              <i className="fa-solid fa-moon" /> Dark Theme
            </button>
            <button
              type="button"
              className={`dark-theme-button capitalize ${theme === 'automatic' ? 'selected' : ''}`}
              onClick={() => chooseTheme('automatic')}
              id="theme-automatic"
            >
              <i className="fa-solid fa-circle-half-stroke" /> Automatic
            </button>
          </div>
        </div>

        <div>
          <form className="theme-selector" onSubmit={(event) => event.preventDefault()}>
            <h3>Colors</h3>
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
          <h3>Custom Colors</h3>
          <div className="custom-colors wrap">
            <div className="form-group-inline mobile-grow color-picker-button">
              <input
                type="color"
                id="mainColor"
                value={mainColor}
                onChange={(event) => setMainColor(event.target.value)}
                className="color-picker fa-solid fa-eye-dropper"
              />
              <label htmlFor="mainColor">Main Color</label>
            </div>
            <div className="form-group-inline mobile-grow color-picker-button">
              <input
                type="color"
                id="accentColor"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                className="color-picker fa-solid fa-eye-dropper"
              />
              <label htmlFor="accentColor">Accent Color</label>
            </div>
            <div className="form-group-inline mobile-grow color-picker-button">
              <input
                type="color"
                id="hoverColor"
                value={hoverColor}
                onChange={(event) => setHoverColor(event.target.value)}
                className="color-picker fa-solid fa-eye-dropper"
              />
              <label htmlFor="hoverColor">Hover Color</label>
            </div>
          </div>
          <div className="custom-colors wrap">
            <input
              type="button"
              value="Reset custom colors"
              onClick={resetCustomColors}
              className="secondary-button thin mobile-grow"
              id="reset-colors"
            />
            <input
              type="button"
              value="Save custom colors"
              onClick={saveCustomColors}
              className="buton thin mobile-grow"
              id="save-colors"
            />
          </div>
        </div>

        <div>
          <h3>Custom CSS</h3>
          <div className="form-group">
            <div className="form-group-inline">
              <textarea
                name="customCss"
                id="customCss"
                placeholder="Custom CSS"
                className="thin"
                value={customCss}
                onChange={(event) => setCustomCss(event.target.value)}
              />
            </div>
            <div className="form-group-inline">
              <input
                type="button"
                value="Save custom CSS"
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
