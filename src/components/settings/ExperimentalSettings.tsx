'use client';

import { useAppData } from '../AppDataProvider';
import { showErrorMessage } from '../Toast';
import { updateSettings } from '@/lib/settings-actions';

/** The experimental section from settings.php: background removal on logos. */
export function ExperimentalSettings() {
  const { settings, t, refresh } = useAppData();

  async function toggle(value: boolean) {
    try {
      await updateSettings({ remove_background: value });
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('experimental_settings')}</h2>
      </header>
      <div className="account-settings-list">
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="removebackground"
              checked={settings.remove_background}
              onChange={(event) => toggle(event.target.checked)}
            />
            <label htmlFor="removebackground">{t('remove_background')}</label>
          </div>
        </div>
      </div>
      <div className="settings-notes">
        <p>
          <i className="fa-solid fa-circle-info" /> {t('remove_background_info')}
        </p>
        <p>
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {t('experimental_info')}
        </p>
      </div>
    </section>
  );
}
