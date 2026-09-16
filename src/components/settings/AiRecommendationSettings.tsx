'use client';

import { useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { upsertUserRow } from '@/lib/settings-actions';
import { runCronJob } from '@/lib/admin-actions';
import { AI_PROVIDERS } from '@/lib/constants';

/**
 * AI recommendation settings, from settings.php.
 *
 * The provider is called from the server (the key must not reach the browser),
 * so both Test and Generate go through the recommendations job.
 */
export function AiRecommendationSettings() {
  const { aiSettings, t, refresh } = useAppData();
  const [form, setForm] = useState(aiSettings);
  const [models, setModels] = useState<string[]>(aiSettings.model ? [aiSettings.model] : []);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const needsUrl = form.type === 'ollama' || form.type === 'openai-compatible';
  const needsKey = form.type !== 'ollama';
  const canRun = Boolean(form.model) && form.enabled;

  async function save() {
    setSaving(true);
    try {
      const { user_id: _userId, ...values } = form;
      await upsertUserRow('ai_settings', values);
      showSuccessMessage(t('save'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    } finally {
      setSaving(false);
    }
  }

  async function fetchModels() {
    try {
      const response = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: form.type, api_key: form.api_key, url: form.url }),
      });
      const body = (await response.json()) as { models?: string[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? t('ai_provider_error'));
      setModels(body.models ?? []);
      showSuccessMessage(t('success'));
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : t('ai_provider_error'));
    }
  }

  async function generate() {
    setRunning(true);
    try {
      await runCronJob('generaterecommendations');
      showSuccessMessage(t('success'));
      refresh();
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : t('error'));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('ai_recommendations')}</h2>
      </header>
      <div className="account-ai-settings">
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="ai_enabled"
            checked={form.enabled}
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
          />
          <label htmlFor="ai_enabled" className="capitalize">
            {t('enabled')}
          </label>
        </div>
        <div className="form-group">
          <label htmlFor="ai_type">{t('provider')}:</label>
          <select
            id="ai_type"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          >
            {AI_PROVIDERS.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>
        {needsUrl && (
          <div className="form-group-inline" id="ai_url_group">
            <input
              type="text"
              id="ai_ollama_host"
              autoComplete="off"
              placeholder={form.type === 'openai-compatible' ? 'http://localhost:11434/v1' : 'http://localhost:11434'}
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
            />
            {form.type === 'ollama' && (
              <button type="button" className="button thin" onClick={fetchModels}>
                {t('test')}
              </button>
            )}
          </div>
        )}
        <div className="form-group-inline">
          {needsKey && (
            <input
              type="password"
              id="ai_api_key"
              autoComplete="off"
              placeholder={t('api_key')}
              value={form.api_key}
              onChange={(event) => setForm({ ...form, api_key: event.target.value })}
            />
          )}
          <button type="button" id="fetchModelsButton" className="button thin" onClick={fetchModels}>
            {t('test')}
          </button>
        </div>
        <div className="form-group">
          <label htmlFor="ai_model">{t('ai_model')}:</label>
          <select
            id="ai_model"
            value={form.model}
            onChange={(event) => setForm({ ...form, model: event.target.value })}
          >
            <option value="">{t('select_ai_model')}</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="ai_run_schedule" className="flex">
            {t('run_schedule')}:
          </label>
          <select
            id="ai_run_schedule"
            value={form.run_schedule}
            onChange={(event) => setForm({ ...form, run_schedule: event.target.value })}
          >
            <option value="manual">{t('manually')}</option>
            <option value="weekly">{t('Weekly')}</option>
            <option value="monthly">{t('Monthly')}</option>
          </select>
        </div>
        <div className="buttons wrap mobile-reverse">
          {canRun && (
            <input
              type="button"
              id="runAiRecommendations"
              className="secondary-button thin mobile-grow-force"
              value={running ? `${t('generate_recommendations')}…` : t('generate_recommendations')}
              disabled={running}
              onClick={generate}
            />
          )}
          <input
            type="submit"
            className="thin mobile-grow-force"
            value={t('save')}
            id="saveAiSettings"
            disabled={saving}
            onClick={save}
          />
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" />
            {t('ai_recommendations_info')}
          </p>
          <p>
            <i className="fa-solid fa-circle-info" />
            {t('may_take_time')}
          </p>
          <p>
            <i className="fa-solid fa-circle-info" />
            {t('recommendations_visible_on_dashboard')}
          </p>
        </div>
      </div>
    </section>
  );
}
