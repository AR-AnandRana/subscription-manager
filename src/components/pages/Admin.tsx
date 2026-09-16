'use client';

import { useEffect, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import {
  createUser,
  deleteUser,
  runCronJob,
  updateAdminSettings,
  updateOauthSettings,
} from '@/lib/admin-actions';
import { exportAllData } from '@/lib/export';
import { CRON_JOBS, WALLOS_VERSION } from '@/lib/constants';
import type { AdminSettings, OauthSettings } from '@/lib/types';

/**
 * The admin page, section for section from admin.php: registrations, user
 * management, OIDC, SMTP, security, maintenance and backup.
 */
export function Admin() {
  const { admin, profile, t, refresh } = useAppData();

  if (!admin) {
    return (
      <section className="contain settings">
        <section className="account-section">
          <header>
            <h2>{t('admin')}</h2>
          </header>
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-triangle-exclamation" /> You do not have administrator access.
            </p>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="contain settings">
      <Registrations settings={admin.settings} userCount={admin.users.length} refresh={refresh} />
      <UserManagement users={admin.users} currentUserId={profile.id} refresh={refresh} />
      <Oidc oauth={admin.oauth} refresh={refresh} />
      <Smtp settings={admin.settings} refresh={refresh} />
      <Security settings={admin.settings} refresh={refresh} />
      <Maintenance settings={admin.settings} refresh={refresh} />
      <BackupAndRestore />
    </section>
  );
}

function Registrations({
  settings,
  userCount,
  refresh,
}: {
  settings: AdminSettings;
  userCount: number;
  refresh: () => void;
}) {
  const { t } = useAppData();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  // Upstream only allows bypassing login on a single-account, closed install.
  const loginDisabledAllowed = userCount === 1 && !form.registrations_open;

  async function save() {
    setSaving(true);
    try {
      await updateAdminSettings({
        registrations_open: form.registrations_open,
        max_users: Number(form.max_users) || 0,
        require_email_verification: form.require_email_verification,
        server_url: form.server_url,
        login_disabled: loginDisabledAllowed ? form.login_disabled : false,
      });
      showSuccessMessage(t('notifications_settings_saved', 'Settings saved'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('registrations')}</h2>
      </header>
      <div className="admin-form">
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="registrations"
            checked={form.registrations_open}
            onChange={(event) => setForm({ ...form, registrations_open: event.target.checked })}
          />
          <label htmlFor="registrations">{t('enable_user_registrations')}</label>
        </div>
        <div className="form-group">
          <label htmlFor="maxUsers">{t('maximum_number_users')}</label>
          <input
            type="number"
            id="maxUsers"
            autoComplete="off"
            value={form.max_users}
            onChange={(event) => setForm({ ...form, max_users: Number(event.target.value) })}
          />
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" /> {t('max_users_info')}
          </p>
          <p>
            <i className="fa-solid fa-circle-info" /> {t('registrations_disable_login_info')}
          </p>
        </div>
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="requireEmail"
            checked={form.require_email_verification}
            disabled={!form.smtp_address}
            onChange={(event) => setForm({ ...form, require_email_verification: event.target.checked })}
          />
          <label htmlFor="requireEmail">{t('require_email_verification')}</label>
        </div>
        {!form.smtp_address && (
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-circle-info" /> {t('configure_smtp_settings_to_enable')}
            </p>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="serverUrl">{t('server_url')}</label>
          <input
            type="text"
            id="serverUrl"
            autoComplete="off"
            value={form.server_url}
            onChange={(event) => setForm({ ...form, server_url: event.target.value })}
          />
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" /> {t('server_url_info')}
          </p>
          <p>
            <i className="fa-solid fa-circle-info" /> {t('server_url_password_reset')}
          </p>
        </div>
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="disableLogin"
            checked={form.login_disabled}
            disabled={!loginDisabledAllowed}
            onChange={(event) => setForm({ ...form, login_disabled: event.target.checked })}
          />
          <label htmlFor="disableLogin">{t('disable_login')}</label>
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {t('disable_login_info')}
          </p>
          <p>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {t('disable_login_info2')}
          </p>
          <p>
            <i className="fa-solid fa-circle-info" /> Registration limits and email verification are also
            enforced by Supabase Auth — set the matching options in your Supabase project.
          </p>
        </div>
        <div className="buttons">
          <input
            type="submit"
            className="thin mobile-grow"
            value={saving ? `${t('save')}…` : t('save')}
            disabled={saving}
            onClick={save}
          />
        </div>
      </div>
    </section>
  );
}

function UserManagement({
  users,
  currentUserId,
  refresh,
}: {
  users: { id: string; username: string; email: string; is_admin: boolean }[];
  currentUserId: string;
  refresh: () => void;
}) {
  const { t } = useAppData();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function remove(id: string, name: string) {
    if (!window.confirm(`${t('delete_user')}: ${name}?`)) return;
    try {
      await deleteUser(id);
      showSuccessMessage(t('delete_user'));
      refresh();
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : t('error'));
    }
  }

  async function add() {
    setBusy(true);
    try {
      await createUser(username, email, password);
      showSuccessMessage(t('create_user'));
      setUsername('');
      setEmail('');
      setPassword('');
      refresh();
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('user_management')}</h2>
      </header>
      <div className="user-list">
        {users.map((user) => (
          <div className="form-group-inline" data-userid={user.id} key={user.id}>
            <div className="user-list-row">
              <div title={t('username')}>
                <div className="user-list-icon">
                  <i className={`fa-solid ${user.is_admin ? 'fa-user-shield' : 'fa-user'}`} />
                </div>
                {user.username}
              </div>
              <div title={t('email')}>
                <div className="user-list-icon">
                  <i className="fa-solid fa-at" />
                </div>
                <a href={`mailto:${user.email}`}>{user.email}</a>
              </div>
            </div>
            <div>
              {user.id === currentUserId ? (
                <button className="image-button medium disabled" disabled title={t('delete_user')}>
                  <i className="fa-solid fa-trash-can" />
                </button>
              ) : (
                <button
                  className="image-button medium"
                  onClick={() => remove(user.id, user.username)}
                  title={t('delete_user')}
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="settings-notes">
        <p>
          <i className="fa-solid fa-circle-info" /> {t('delete_user_info')}
        </p>
      </div>
      <h2>{t('create_user')}</h2>
      <div className="form-group">
        <input
          type="text"
          id="newUsername"
          autoComplete="off"
          placeholder={t('username')}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </div>
      <div className="form-group">
        <input
          type="email"
          id="newEmail"
          autoComplete="off"
          placeholder={t('email')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="form-group-inline">
        <input
          type="password"
          id="newPassword"
          autoComplete="off"
          placeholder={t('password')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <input type="submit" className="thin" value={t('add')} disabled={busy} onClick={add} />
      </div>
    </section>
  );
}

const OIDC_FIELDS: { key: keyof OauthSettings; placeholder: string }[] = [
  { key: 'name', placeholder: 'Provider Name' },
  { key: 'client_id', placeholder: 'Client ID' },
  { key: 'client_secret', placeholder: 'Client Secret' },
  { key: 'authorization_url', placeholder: 'Auth URL' },
  { key: 'token_url', placeholder: 'Token URL' },
  { key: 'user_info_url', placeholder: 'User Info URL' },
  { key: 'redirect_url', placeholder: 'Redirect URL' },
  { key: 'logout_url', placeholder: 'Logout URL' },
  { key: 'user_identifier_field', placeholder: 'User Identifier Field' },
  { key: 'scopes', placeholder: 'Scopes' },
];

function Oidc({ oauth, refresh }: { oauth: OauthSettings; refresh: () => void }) {
  const { t } = useAppData();
  const [form, setForm] = useState(oauth);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const { id: _id, ...values } = form;
      await updateOauthSettings(values);
      showSuccessMessage(t('save'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('oidc_settings')}</h2>
      </header>
      <div className="admin-form">
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="oidcEnabled"
            checked={form.enabled}
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
          />
          <label htmlFor="oidcEnabled">{t('oidc_oauth_enabled')}</label>
        </div>
        {OIDC_FIELDS.map(({ key, placeholder }) => (
          <div className="form-group" key={key}>
            <input
              type="text"
              id={`oidc-${key}`}
              placeholder={placeholder}
              autoComplete="off"
              value={String(form[key] ?? '')}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          </div>
        ))}
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="oidcAutoCreateUser"
            checked={form.auto_create_user}
            onChange={(event) => setForm({ ...form, auto_create_user: event.target.checked })}
          />
          <label htmlFor="oidcAutoCreateUser">{t('create_user_automatically')}</label>
        </div>
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="oidcPasswordLoginDisabled"
            checked={form.password_login_disabled}
            onChange={(event) => setForm({ ...form, password_login_disabled: event.target.checked })}
          />
          <label htmlFor="oidcPasswordLoginDisabled">{t('disable_password_login')}</label>
        </div>
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="oidcRequireEmailVerified"
            checked={form.require_email_verified}
            onChange={(event) => setForm({ ...form, require_email_verified: event.target.checked })}
          />
          <label htmlFor="oidcRequireEmailVerified">{t('require_email_verified_linking')}</label>
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" /> Supabase Auth performs the OIDC exchange itself. Add
            the same provider under Authentication → Providers for these details to take effect.
          </p>
        </div>
        <div className="buttons">
          <input
            type="submit"
            className="thin mobile-grow"
            value={t('save')}
            disabled={saving}
            onClick={save}
          />
        </div>
      </div>
    </section>
  );
}

function Smtp({ settings, refresh }: { settings: AdminSettings; refresh: () => void }) {
  const { t } = useAppData();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateAdminSettings({
        smtp_address: form.smtp_address,
        smtp_port: Number(form.smtp_port) || 587,
        smtp_username: form.smtp_username,
        smtp_password: form.smtp_password,
        from_email: form.from_email,
        encryption: form.encryption,
      });
      showSuccessMessage(t('save'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('smtp_settings')}</h2>
      </header>
      <div className="admin-form">
        <div className="form-group-inline">
          <input
            type="text"
            id="smtpaddress"
            autoComplete="off"
            placeholder={t('smtp_address')}
            value={form.smtp_address}
            onChange={(event) => setForm({ ...form, smtp_address: event.target.value })}
          />
          <input
            type="text"
            id="smtpport"
            autoComplete="off"
            className="one-third"
            placeholder={t('port')}
            value={form.smtp_port}
            onChange={(event) => setForm({ ...form, smtp_port: Number(event.target.value) })}
          />
        </div>
        <div className="form-group-inline">
          {(['none', 'tls', 'ssl'] as const).map((value) => (
            <div key={value}>
              <input
                type="radio"
                name="admin-encryption"
                id={`encryption${value}`}
                value={value}
                checked={(form.encryption || 'none') === value}
                onChange={() => setForm({ ...form, encryption: value })}
              />
              <label htmlFor={`encryption${value}`}>{value === 'none' ? t('none') : t(value)}</label>
            </div>
          ))}
        </div>
        <div className="form-group-inline">
          <input
            type="text"
            id="smtpusername"
            autoComplete="off"
            placeholder={t('smtp_username')}
            value={form.smtp_username}
            onChange={(event) => setForm({ ...form, smtp_username: event.target.value })}
          />
        </div>
        <div className="form-group-inline">
          <input
            type="password"
            id="smtppassword"
            autoComplete="off"
            placeholder={t('smtp_password')}
            value={form.smtp_password}
            onChange={(event) => setForm({ ...form, smtp_password: event.target.value })}
          />
        </div>
        <div className="form-group-inline">
          <input
            type="text"
            id="fromemail"
            autoComplete="off"
            placeholder={t('from_email')}
            value={form.from_email}
            onChange={(event) => setForm({ ...form, from_email: event.target.value })}
          />
        </div>
        <div className="buttons">
          <input
            type="submit"
            className="thin mobile-grow"
            value={t('save')}
            disabled={saving}
            onClick={save}
          />
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" /> {t('smtp_info')}
          </p>
          <p>
            <i className="fa-solid fa-circle-info" /> {t('smtp_usage_info')}
          </p>
        </div>
      </div>
    </section>
  );
}

function Security({ settings, refresh }: { settings: AdminSettings; refresh: () => void }) {
  const { t } = useAppData();
  const [allowlist, setAllowlist] = useState(settings.local_webhook_notifications_allowlist);
  const [allowStandard, setAllowStandard] = useState(settings.allow_standard_users_local_webhooks);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateAdminSettings({
        local_webhook_notifications_allowlist: allowlist,
        allow_standard_users_local_webhooks: allowStandard,
      });
      showSuccessMessage(t('save'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('security_settings')}</h2>
      </header>
      <div className="admin-form">
        <div className="form-group-inline">
          <input
            type="text"
            id="local_webhook_notifications_allowlist"
            autoComplete="off"
            placeholder="e.g., 192.168.1.5:8123, homeassistant.local"
            value={allowlist}
            onChange={(event) => setAllowlist(event.target.value)}
          />
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" /> {t('ssrf_protection_info')}
          </p>
          <p>
            <i className="fa-solid fa-circle-info" />{' '}
            <span dangerouslySetInnerHTML={{ __html: t('local_webhook_info') }} />
          </p>
        </div>
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="allow_standard_users_local_webhooks"
            checked={allowStandard}
            onChange={(event) => setAllowStandard(event.target.checked)}
          />
          <label htmlFor="allow_standard_users_local_webhooks">
            {t('allow_standard_users_local_webhooks')}
          </label>
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />{' '}
            {t('allow_standard_users_local_webhooks_info')}
          </p>
        </div>
        <div className="buttons">
          <input
            type="submit"
            className="thin mobile-grow"
            value={t('save')}
            disabled={saving}
            onClick={save}
          />
        </div>
      </div>
    </section>
  );
}

function Maintenance({ settings, refresh }: { settings: AdminSettings; refresh: () => void }) {
  const { t } = useAppData();
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState<string | null>(null);
  const [orphans, setOrphans] = useState<number | null>(null);
  const [deletingLogos, setDeletingLogos] = useState(false);

  // Uploaded logos no subscription or payment method points at any more.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/orphaned-logos')
      .then((response) => (response.ok ? response.json() : { count: null }))
      .then((body: { count?: number | null }) => {
        if (!cancelled) setOrphans(body.count ?? null);
      })
      .catch(() => {
        if (!cancelled) setOrphans(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function deleteOrphans() {
    setDeletingLogos(true);
    try {
      const response = await fetch('/api/admin/orphaned-logos', { method: 'DELETE' });
      const body = (await response.json()) as { deleted?: number; error?: string };
      if (!response.ok) throw new Error(body.error ?? t('error'));
      showSuccessMessage(`${body.deleted ?? 0} ${t('orphaned_logos')}`);
      setOrphans(0);
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : t('error'));
    } finally {
      setDeletingLogos(false);
    }
  }

  async function toggleUpdateNotification(value: boolean) {
    try {
      await updateAdminSettings({ update_notification: value });
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  async function run(task: string) {
    setRunning(task);
    setOutput((current) => `${current}${current ? '\n' : ''}▶ ${task}…`);
    try {
      const result = await runCronJob(task);
      setOutput((current) => `${current}\n${result || 'done'}`);
      refresh();
    } catch (error) {
      setOutput((current) => `${current}\n${error instanceof Error ? error.message : 'failed'}`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('maintenance_tasks')}</h2>
      </header>
      <div className="maintenance-tasks">
        <h3>{t('update')}</h3>
        <div className="form-group">
          {settings.latest_version && settings.latest_version !== WALLOS_VERSION ? (
            <div className="updates-list">
              <p>{t('new_version_available')}.</p>
              <p>
                {t('current_version')}: <span>{WALLOS_VERSION}</span>
              </p>
              <p>
                {t('latest_version')}:{' '}
                <span>
                  {settings.latest_version}
                  <a
                    href={`https://github.com/ellite/Wallos/releases/tag/${settings.latest_version}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fa-solid fa-external-link" />
                  </a>
                </span>
              </p>
            </div>
          ) : (
            t('on_current_version')
          )}
        </div>
        <div className="form-group-inline">
          <input
            type="checkbox"
            id="updateNotification"
            checked={settings.update_notification}
            onChange={(event) => toggleUpdateNotification(event.target.checked)}
          />
          <label htmlFor="updateNotification">{t('show_update_notification')}</label>
        </div>

        <h3>{t('orphaned_logos')}</h3>
        <div className="form-group-inline">
          <input
            type="button"
            className="button thin mobile-grow"
            value={t('delete')}
            id="deleteUnusedLogos"
            disabled={orphans === null || orphans === 0 || deletingLogos}
            onClick={deleteOrphans}
          />
          <span className="number-of-logos bold">{orphans ?? '—'}</span>
          {t('orphaned_logos')}
        </div>

        <h3>{t('cronjobs')}</h3>
        <div>
          <div className="inline-row">
            {CRON_JOBS.map(({ task, label }) => (
              <input
                key={task}
                type="button"
                value={label}
                className="button tiny mobile-grow"
                disabled={running !== null}
                onClick={() => run(task)}
              />
            ))}
          </div>
          <div className="inline-row">
            <textarea id="cronjobResult" className="thin" readOnly value={output} />
          </div>
        </div>
      </div>
    </section>
  );
}

function BackupAndRestore() {
  const { t, ...data } = useAppData();

  return (
    <section className="account-section">
      <header>
        <h2>{t('backup_and_restore')}</h2>
      </header>
      <div className="form-group-inline">
        <input
          type="button"
          className="button thin mobile-grow"
          value={t('backup')}
          onClick={() => exportAllData(data)}
        />
      </div>
      <div className="settings-notes">
        <p>
          <i className="fa-solid fa-circle-info" /> Backup downloads this account&apos;s data as JSON. The
          database itself is managed by Supabase — use its dashboard for a full point-in-time restore.
        </p>
      </div>
    </section>
  );
}
