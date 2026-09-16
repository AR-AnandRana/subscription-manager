'use client';

import { useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { upsertUserRow } from '@/lib/settings-actions';

/** The SerpAPI key that adds Google image results to the logo search. */
export function GoogleSearchSettings() {
  const { googleSearch, t, refresh } = useAppData();
  const [apiKey, setApiKey] = useState(googleSearch.api_key);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await upsertUserRow('google_search', { api_key: apiKey });
      showSuccessMessage(t('api_key_saved'));
      refresh();
    } catch {
      showErrorMessage(t('failed_to_store_api_key'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>Google Search (SerpAPI)</h2>
      </header>
      <div className="account-google-search">
        <div className="form-group">
          <input
            type="text"
            name="google-search-key"
            id="googleSearchKey"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={t('api_key')}
          />
        </div>
        <div className="buttons">
          <input
            type="submit"
            value={t('save')}
            id="saveGoogleSearch"
            className="thin mobile-grow"
            disabled={saving}
            onClick={save}
          />
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" /> {t('google_search_info')}
          </p>
          <p>
            {t('get_key')}:{' '}
            <span>
              https://serpapi.com/
              <a href="https://serpapi.com/users/sign_up?plan=free" title="SerpAPI" target="_blank" rel="noreferrer">
                <i className="fa-solid fa-arrow-up-right-from-square" />
              </a>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
