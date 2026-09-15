'use client';

import { useEffect, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { fetchUserRow, upsertUserRow } from '@/lib/settings-actions';

/**
 * Notification preferences and per-channel credentials.
 *
 * Upstream also sends test messages from the server. Delivery needs a server
 * that can reach SMTP and the various webhook hosts, which a Supabase-backed
 * client cannot do on its own, so this screen stores the configuration and
 * leaves sending to a scheduled function — see NOTIFICATIONS.md.
 */
export function NotificationSettings() {
  const { notificationSettings, refresh } = useAppData();
  const [days, setDays] = useState(notificationSettings.days);
  const [periodSummary, setPeriodSummary] = useState(
    notificationSettings.period_summary_at_period_start,
  );

  async function saveGeneral() {
    try {
      await upsertUserRow('notification_settings', {
        days,
        period_summary_at_period_start: periodSummary,
      });
      showSuccessMessage('Notification settings saved');
      refresh();
    } catch {
      showErrorMessage('Could not save the notification settings');
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>Notifications</h2>
      </header>

      <div className="account-settings-list">
        <div className="form-group-inline">
          <label htmlFor="days">Notify me</label>
          <select id="days" value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={0}>On due date</option>
            <option value={1}>1 day before</option>
            {[2, 3, 4, 5, 6, 7, 10, 14, 30].map((value) => (
              <option key={value} value={value}>
                {value} days before
              </option>
            ))}
          </select>
          <input type="submit" className="thin" value="Save" onClick={saveGeneral} />
        </div>

        <div className="form-group-inline">
          <input
            type="checkbox"
            id="period_summary_at_period_start"
            checked={periodSummary}
            onChange={(event) => setPeriodSummary(event.target.checked)}
          />
          <label htmlFor="period_summary_at_period_start">Send a period summary at the period start</label>
        </div>
      </div>

      <ChannelForm
        table="email_notifications"
        title="Email"
        fields={[
          { key: 'smtp_address', label: 'SMTP address' },
          { key: 'smtp_port', label: 'Port', type: 'number' },
          { key: 'smtp_username', label: 'SMTP username' },
          { key: 'smtp_password', label: 'SMTP password', type: 'password' },
          { key: 'from_email', label: 'From email' },
          { key: 'other_emails', label: 'Also send to (comma separated)' },
          {
            key: 'encryption',
            label: 'Encryption',
            type: 'select',
            options: [
              { value: 'none', label: 'None' },
              { value: 'tls', label: 'TLS' },
              { value: 'ssl', label: 'SSL' },
            ],
          },
        ]}
      />

      <ChannelForm
        table="discord_notifications"
        title="Discord"
        fields={[
          { key: 'webhook_url', label: 'Webhook URL' },
          { key: 'bot_username', label: 'Bot username' },
          { key: 'bot_avatar_url', label: 'Bot avatar URL' },
        ]}
      />

      <ChannelForm
        table="telegram_notifications"
        title="Telegram"
        fields={[
          { key: 'bot_token', label: 'Bot token', type: 'password' },
          { key: 'chat_id', label: 'Chat ID' },
        ]}
      />

      <ChannelForm
        table="gotify_notifications"
        title="Gotify"
        fields={[
          { key: 'url', label: 'URL' },
          { key: 'token', label: 'Token', type: 'password' },
          { key: 'ignore_ssl', label: 'Ignore SSL errors', type: 'checkbox' },
        ]}
      />

      <ChannelForm
        table="ntfy_notifications"
        title="Ntfy"
        fields={[
          { key: 'host', label: 'Host' },
          { key: 'topic', label: 'Topic' },
          { key: 'headers', label: 'Custom headers' },
          { key: 'ignore_ssl', label: 'Ignore SSL errors', type: 'checkbox' },
        ]}
      />

      <ChannelForm
        table="pushover_notifications"
        title="Pushover"
        fields={[
          { key: 'user_key', label: 'User key' },
          { key: 'token', label: 'Token', type: 'password' },
        ]}
      />

      <ChannelForm
        table="mattermost_notifications"
        title="Mattermost"
        fields={[
          { key: 'webhook_url', label: 'Webhook URL' },
          { key: 'bot_username', label: 'Bot username' },
          { key: 'bot_icon_emoji', label: 'Bot icon emoji' },
        ]}
      />

      <ChannelForm
        table="pushplus_notifications"
        title="PushPlus"
        fields={[{ key: 'token', label: 'Token', type: 'password' }]}
      />

      <ChannelForm
        table="serverchan_notifications"
        title="ServerChan"
        fields={[{ key: 'sendkey', label: 'Send key', type: 'password' }]}
      />

      <ChannelForm
        table="webhook_notifications"
        title="Webhook"
        fields={[
          {
            key: 'request_method',
            label: 'Request method',
            type: 'select',
            options: [
              { value: 'POST', label: 'POST' },
              { value: 'GET', label: 'GET' },
              { value: 'PUT', label: 'PUT' },
            ],
          },
          { key: 'url', label: 'Webhook URL' },
          { key: 'headers', label: 'Custom headers' },
          { key: 'payload', label: 'Payment notification payload', type: 'textarea' },
          { key: 'cancelation_payload', label: 'Cancellation notification payload', type: 'textarea' },
          { key: 'ignore_ssl', label: 'Ignore SSL errors', type: 'checkbox' },
        ]}
      />
    </section>
  );
}

interface Field {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'checkbox' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
}

type ChannelRow = Record<string, string | number | boolean | null>;

function ChannelForm({ table, title, fields }: { table: string; title: string; fields: Field[] }) {
  const [row, setRow] = useState<ChannelRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserRow<ChannelRow>(table).then((data) => setRow(data ?? { enabled: false }));
  }, [table]);

  if (!row) return null;

  function set(key: string, value: string | number | boolean) {
    setRow((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!row) return;
    setSaving(true);
    try {
      const { user_id: _userId, ...values } = row;
      await upsertUserRow(table, values);
      showSuccessMessage(`${title} settings saved`);
    } catch {
      showErrorMessage(`Could not save the ${title} settings`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="account-notifications-section">
      <header>
        <h3>{title}</h3>
      </header>
      <div className="form-group-inline">
        <input
          type="checkbox"
          id={`${table}-enabled`}
          checked={Boolean(row.enabled)}
          onChange={(event) => set('enabled', event.target.checked)}
        />
        <label htmlFor={`${table}-enabled`}>Enabled</label>
      </div>

      {fields.map((field) => {
        const id = `${table}-${field.key}`;
        const value = row[field.key];

        if (field.type === 'checkbox') {
          return (
            <div className="form-group-inline" key={field.key}>
              <input
                type="checkbox"
                id={id}
                checked={Boolean(value)}
                onChange={(event) => set(field.key, event.target.checked)}
              />
              <label htmlFor={id}>{field.label}</label>
            </div>
          );
        }

        if (field.type === 'select') {
          return (
            <div className="form-group-inline" key={field.key}>
              <label htmlFor={id}>{field.label}</label>
              <select id={id} value={String(value ?? '')} onChange={(event) => set(field.key, event.target.value)}>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === 'textarea') {
          return (
            <div className="form-group" key={field.key}>
              <label htmlFor={id}>{field.label}</label>
              <textarea
                id={id}
                className="thin"
                value={String(value ?? '')}
                onChange={(event) => set(field.key, event.target.value)}
              />
            </div>
          );
        }

        return (
          <div className="form-group-inline" key={field.key}>
            <label htmlFor={id}>{field.label}</label>
            <input
              type={field.type ?? 'text'}
              id={id}
              autoComplete="off"
              value={String(value ?? '')}
              onChange={(event) =>
                set(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)
              }
            />
          </div>
        );
      })}

      <div className="buttons">
        <input type="submit" className="thin" value={saving ? 'Saving…' : 'Save'} onClick={save} disabled={saving} />
      </div>
    </section>
  );
}
