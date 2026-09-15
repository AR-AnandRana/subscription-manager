'use client';

import { useEffect, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { createClient } from '@/lib/supabase/client';

interface AdminSettings {
  registrations_open: boolean;
  max_users: number;
  require_email_verification: boolean;
  login_disabled: boolean;
  server_url: string;
}

/**
 * Instance-wide settings, replacing admin.php.
 *
 * Wallos's admin screen also lists and deletes users. Reading `auth.users`
 * needs the service role key, which must never reach the browser, so user
 * management belongs in a server route with that key — see README.
 */
export function Admin() {
  const { profile } = useAppData();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setSettings(data as AdminSettings | null));
  }, []);

  if (!profile.is_admin) {
    return (
      <section className="contain settings">
        <section className="account-section">
          <header>
            <h2>Admin</h2>
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

  if (!settings) return null;

  function set<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('admin_settings').update(settings).eq('id', 1);
      if (error) throw error;
      showSuccessMessage('Admin settings saved');
    } catch {
      showErrorMessage('Could not save the admin settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="contain settings">
      <section className="account-section">
        <header>
          <h2>Registrations</h2>
        </header>
        <div className="account-settings-list">
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="registrations_open"
              checked={settings.registrations_open}
              onChange={(event) => set('registrations_open', event.target.checked)}
            />
            <label htmlFor="registrations_open">Open registrations</label>
          </div>
          <div className="form-group-inline">
            <label htmlFor="max_users">Maximum users (0 = unlimited)</label>
            <input
              type="number"
              id="max_users"
              min={0}
              value={settings.max_users}
              onChange={(event) => set('max_users', Number(event.target.value))}
            />
          </div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="require_email_verification"
              checked={settings.require_email_verification}
              onChange={(event) => set('require_email_verification', event.target.checked)}
            />
            <label htmlFor="require_email_verification">Require email verification</label>
          </div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="login_disabled"
              checked={settings.login_disabled}
              onChange={(event) => set('login_disabled', event.target.checked)}
            />
            <label htmlFor="login_disabled">Disable password login</label>
          </div>
          <div className="form-group-inline">
            <label htmlFor="server_url">Server URL</label>
            <input
              type="text"
              id="server_url"
              value={settings.server_url}
              onChange={(event) => set('server_url', event.target.value)}
            />
          </div>
          <div className="buttons">
            <input
              type="submit"
              className="thin"
              value={saving ? 'Saving…' : 'Save'}
              onClick={save}
              disabled={saving}
            />
          </div>
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-circle-info" /> Registration and email-verification behaviour is
              enforced by Supabase Auth; set the matching options in your Supabase project&apos;s Auth
              settings for them to take effect.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
