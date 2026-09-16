'use client';

import { useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { upsertUserRow } from '@/lib/settings-actions';

/**
 * The exchange-rate provider key, from settings.php's "Fixer API Key" section.
 *
 * Rates themselves are refreshed by the Update Exchange Rates maintenance job.
 */
export function FixerSettings() {
  const { fixer, t, refresh } = useAppData();
  const [apiKey, setApiKey] = useState(fixer.api_key);
  const [provider, setProvider] = useState(fixer.provider);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await upsertUserRow('fixer', { api_key: apiKey, provider });
      showSuccessMessage(t('api_key_saved'));
      refresh();
    } catch {
      showErrorMessage(t('failed_to_store_api_key'));
    } finally {
      setSaving(false);
    }
  }

  const used = fixer.usage_used ?? null;
  const limit = fixer.usage_limit ?? null;
  const percent = used != null && limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <section className="account-section">
      <header>
        <h2>Fixer API Key</h2>
      </header>
      <div className="account-fixer">
        <div className="form-group">
          <input
            type="text"
            name="fixer-key"
            id="fixerKey"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={t('api_key')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="fixerProvider">{t('provider')}:</label>
          <select
            name="fixer-provider"
            id="fixerProvider"
            value={provider}
            onChange={(event) => setProvider(Number(event.target.value))}
          >
            <option value={0}>fixer.io</option>
            <option value={1}>apilayer.com</option>
          </select>
        </div>
        <div className="buttons">
          <input
            type="submit"
            value={t('save')}
            id="addFixerKey"
            className="thin mobile-grow"
            disabled={saving}
            onClick={save}
          />
        </div>
        {used != null && (
          <div className="api-usage" id="fixerUsage">
            <div className="api-usage-label">
              <span>{t('monthly_requests_used')}</span>
              <span id="fixerUsageCount">{limit ? `${used} / ${limit}` : used}</span>
            </div>
            <div className="api-usage-track">
              <span className="api-usage-fill" id="fixerUsageFill" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" />
            {t('fixer_info')}
          </p>
          <p>
            {t('get_key')}:{' '}
            <span>
              https://fixer.io/
              <a href="https://fixer.io/#pricing_plan" title={t('get_free_fixer_api_key')} target="_blank" rel="noreferrer">
                <i className="fa-solid fa-arrow-up-right-from-square" />
              </a>
            </span>
          </p>
          <p>
            {t('get_key_alternative')}{' '}
            <span>
              https://apilayer.com
              <a
                href="https://apilayer.com/marketplace/fixer-api"
                title="Get free fixer api key"
                target="_blank"
                rel="noreferrer"
              >
                <i className="fa-solid fa-arrow-up-right-from-square" />
              </a>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
