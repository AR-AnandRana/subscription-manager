'use client';

import { useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { upsertUserRow } from '@/lib/settings-actions';
import type { ChannelTable } from '@/lib/types';

/**
 * Notification preferences and per-channel credentials, from settings.php.
 *
 * Each channel is a collapsed row that opens on click, one at a time, exactly
 * as scripts/notifications.js does it. Sending happens server-side in the
 * notification jobs; this screen stores the configuration.
 */
export function NotificationSettings() {
  const { notificationSettings, t, refresh } = useAppData();
  const [days, setDays] = useState(notificationSettings.days);
  const [periodSummary, setPeriodSummary] = useState(
    notificationSettings.period_summary_at_period_start,
  );
  const [open, setOpen] = useState<ChannelTable | null>(null);

  async function saveGeneral() {
    try {
      await upsertUserRow('notification_settings', {
        days,
        period_summary_at_period_start: periodSummary,
      });
      showSuccessMessage(t('notifications_settings_saved'));
      refresh();
    } catch {
      showErrorMessage(t('error_saving_notifications'));
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('notifications')}</h2>
      </header>
      <div className="account-notifications">
        <section>
          <label htmlFor="days">{t('notify_me')}:</label>
          <div className="form-group-inline">
            <select id="days" value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={0}>{t('on_due_date')}</option>
              <option value={1}>1 {t('day_before')}</option>
              {[2, 3, 4, 5, 6, 7].map((value) => (
                <option key={value} value={value}>
                  {value} {t('day_before')}
                </option>
              ))}
            </select>
            <input type="submit" className="thin" value={t('save')} onClick={saveGeneral} />
          </div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="period_summary_at_period_start"
              checked={periodSummary}
              onChange={(event) => setPeriodSummary(event.target.checked)}
            />
            <label htmlFor="period_summary_at_period_start">
              {t('send_period_summary_at_period_start')}
            </label>
          </div>
        </section>

        {CHANNELS.map((channel) => (
          <Channel
            key={channel.table}
            channel={channel}
            open={open === channel.table}
            onToggle={() => setOpen(open === channel.table ? null : channel.table)}
          />
        ))}
      </div>
    </section>
  );
}

interface Field {
  key: string;
  labelKey?: string;
  placeholderKey?: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'number' | 'checkbox' | 'select' | 'textarea' | 'encryption';
  options?: { value: string; label: string }[];
  className?: string;
}

interface ChannelSpec {
  table: ChannelTable;
  titleKey?: string;
  title?: string;
  icon: string;
  fields: Field[];
  notes?: string[];
  variables?: boolean;
}

/** Channels in the order settings.php renders them, with upstream's icons. */
const CHANNELS: ChannelSpec[] = [
  {
    table: 'email_notifications',
    titleKey: 'email',
    icon: 'fa-solid fa-envelope',
    fields: [
      { key: 'smtp_address', placeholderKey: 'smtp_address' },
      { key: 'smtp_port', placeholderKey: 'port', type: 'number', className: 'one-third' },
      { key: 'encryption', type: 'encryption' },
      { key: 'smtp_username', placeholderKey: 'smtp_username' },
      { key: 'smtp_password', placeholderKey: 'smtp_password', type: 'password' },
      { key: 'from_email', placeholderKey: 'from_email' },
      { key: 'other_emails', labelKey: 'send_to_other_emails', placeholderKey: 'other_emails_placeholder' },
    ],
    notes: ['smtp_info'],
  },
  {
    table: 'discord_notifications',
    titleKey: 'discord',
    icon: 'fa-brands fa-discord',
    fields: [
      { key: 'webhook_url', placeholderKey: 'webhook_url' },
      { key: 'bot_username', placeholderKey: 'discord_bot_username' },
      { key: 'bot_avatar_url', placeholderKey: 'discord_bot_avatar_url' },
    ],
  },
  {
    table: 'gotify_notifications',
    titleKey: 'gotify',
    icon: 'fa-solid fa-envelopes-bulk',
    fields: [
      { key: 'url', placeholderKey: 'url' },
      { key: 'token', placeholderKey: 'token' },
      { key: 'ignore_ssl', labelKey: 'ignore_ssl_errors', type: 'checkbox' },
    ],
  },
  {
    table: 'pushover_notifications',
    titleKey: 'pushover',
    icon: 'fa-brands fa-pinterest-p',
    fields: [
      { key: 'user_key', placeholderKey: 'pushover_user_key' },
      { key: 'token', placeholderKey: 'token' },
    ],
  },
  {
    table: 'telegram_notifications',
    titleKey: 'telegram',
    icon: 'fa-solid fa-paper-plane',
    fields: [
      { key: 'bot_token', placeholderKey: 'telegram_bot_token' },
      { key: 'chat_id', placeholderKey: 'telegram_chat_id' },
    ],
  },
  {
    table: 'pushplus_notifications',
    titleKey: 'pushplus',
    icon: 'fa-solid fa-bell',
    fields: [{ key: 'token', placeholderKey: 'pushplus_token' }],
  },
  {
    table: 'mattermost_notifications',
    titleKey: 'mattermost',
    icon: 'fa-solid fa-gauge-simple-high',
    fields: [
      { key: 'webhook_url', placeholderKey: 'mattermost_webhook_url' },
      { key: 'bot_username', placeholderKey: 'mattermost_bot_username' },
      { key: 'bot_icon_emoji', placeholderKey: 'mattermost_bot_icon_emoji' },
    ],
  },
  {
    table: 'ntfy_notifications',
    title: 'Ntfy',
    icon: 'fa-solid fa-terminal',
    fields: [
      { key: 'host', placeholderKey: 'host' },
      { key: 'topic', placeholderKey: 'topic' },
      { key: 'headers', placeholderKey: 'custom_headers', type: 'textarea' },
      { key: 'ignore_ssl', labelKey: 'ignore_ssl_errors', type: 'checkbox' },
    ],
  },
  {
    table: 'serverchan_notifications',
    titleKey: 'serverchan',
    icon: 'fa-solid fa-code',
    fields: [{ key: 'sendkey', placeholderKey: 'serverchan_sendkey' }],
  },
  {
    table: 'webhook_notifications',
    titleKey: 'webhook',
    icon: 'fa-solid fa-bolt',
    fields: [
      {
        key: 'request_method',
        labelKey: 'request_method',
        type: 'select',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
        ],
      },
      { key: 'url', placeholderKey: 'webhook_url' },
      { key: 'headers', placeholderKey: 'custom_headers', type: 'textarea' },
      { key: 'payload', placeholderKey: 'payment_notifications_payload', type: 'textarea' },
      { key: 'cancelation_payload', placeholderKey: 'cancelation_notification_payload', type: 'textarea' },
      { key: 'ignore_ssl', labelKey: 'ignore_ssl_errors', type: 'checkbox' },
    ],
    variables: true,
  },
];

function Channel({
  channel,
  open,
  onToggle,
}: {
  channel: ChannelSpec;
  open: boolean;
  onToggle: () => void;
}) {
  const { channels, t, refresh } = useAppData();
  const [row, setRow] = useState<Record<string, unknown>>(
    channels[channel.table] as unknown as Record<string, unknown>,
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const title = channel.title ?? t(channel.titleKey ?? '');

  function set(key: string, value: unknown) {
    setRow((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const { user_id: _userId, ...values } = row;
      await upsertUserRow(channel.table, values);
      showSuccessMessage(t('notifications_settings_saved'));
      refresh();
    } catch {
      showErrorMessage(t('error_saving_notifications'));
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channel.table }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? t('notification_failed'));
      showSuccessMessage(t('notification_sent_successfuly'));
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : t('notification_failed'));
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="account-notifications-section">
      <header className="account-notification-section-header" onClick={onToggle}>
        <h3>
          <i className={channel.icon} />
          {title}
        </h3>
      </header>
      <div
        className={`account-notification-section-settings${open ? ' is-open' : ''}`}
        data-type={channel.table}
      >
        <div className="form-group-inline">
          <input
            type="checkbox"
            id={`${channel.table}-enabled`}
            checked={Boolean(row.enabled)}
            onChange={(event) => set('enabled', event.target.checked)}
          />
          <label htmlFor={`${channel.table}-enabled`} className="capitalize">
            {t('enabled')}
          </label>
        </div>

        {channel.fields.map((field) => {
          const id = `${channel.table}-${field.key}`;
          const value = row[field.key];
          const placeholder = field.placeholderKey ? t(field.placeholderKey) : field.placeholder;

          if (field.type === 'encryption') {
            return (
              <div className="form-group-inline" key={field.key}>
                {(['none', 'tls', 'ssl'] as const).map((option) => (
                  <div key={option}>
                    <input
                      type="radio"
                      name={`${channel.table}-encryption`}
                      id={`${id}-${option}`}
                      value={option}
                      checked={(String(value) || 'tls') === option}
                      onChange={() => set(field.key, option)}
                    />
                    <label htmlFor={`${id}-${option}`}>{option === 'none' ? t('none') : t(option)}</label>
                  </div>
                ))}
              </div>
            );
          }

          if (field.type === 'checkbox') {
            return (
              <div className="form-group-inline" key={field.key}>
                <input
                  type="checkbox"
                  id={id}
                  checked={Boolean(value)}
                  onChange={(event) => set(field.key, event.target.checked)}
                />
                <label htmlFor={id}>{t(field.labelKey ?? '')}</label>
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <div key={field.key}>
                <label htmlFor={id} className="capitalize">
                  {t(field.labelKey ?? '')}:
                </label>
                <div className="form-group-inline">
                  <select id={id} value={String(value ?? '')} onChange={(event) => set(field.key, event.target.value)}>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          }

          if (field.type === 'textarea') {
            return (
              <div className="form-group-inline" key={field.key}>
                <textarea
                  id={id}
                  className="thin"
                  placeholder={placeholder}
                  value={String(value ?? '')}
                  onChange={(event) => set(field.key, event.target.value)}
                />
              </div>
            );
          }

          return (
            <div key={field.key}>
              {field.labelKey && <label htmlFor={id}>{t(field.labelKey)}</label>}
              <div className="form-group-inline">
                <input
                  type={field.type === 'password' ? 'password' : 'text'}
                  id={id}
                  autoComplete="off"
                  className={field.className}
                  placeholder={placeholder}
                  value={String(value ?? '')}
                  onChange={(event) =>
                    set(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)
                  }
                />
              </div>
            </div>
          );
        })}

        <div className="buttons">
          <input
            type="button"
            className="secondary-button thin mobile-grow"
            value={t('test')}
            disabled={testing}
            onClick={test}
          />
          <input
            type="submit"
            className="thin mobile-grow"
            value={t('save')}
            disabled={saving}
            onClick={save}
          />
        </div>

        {channel.notes && (
          <div className="settings-notes">
            {channel.notes.map((note) => (
              <p key={note}>
                <i className="fa-solid fa-circle-info" /> {t(note)}
              </p>
            ))}
          </div>
        )}

        {channel.variables && (
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-circle-info" /> {t('variables_available')}: {'{{days_until}}'},{' '}
              {'{{subscription_name}}'}, {'{{subscription_price}}'}, {'{{subscription_currency}}'},{' '}
              {'{{subscription_category}}'}, {'{{subscription_date}}'}, {'{{subscription_payer}}'},{' '}
              {'{{subscription_days_until_payment}}'}, {'{{subscription_notes}}'}, {'{{subscription_url}}'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
