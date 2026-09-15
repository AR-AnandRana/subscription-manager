'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/actions';
import { updateProfile } from '@/lib/settings-actions';
import { exportAsCsv, exportAsJson } from '@/lib/export';

const BUNDLED_AVATARS = Array.from({ length: 10 }, (_, i) => `images/avatars/${i}.svg`);

export function Profile() {
  const { profile, currencies, views, refresh } = useAppData();
  const router = useRouter();

  const [firstname, setFirstname] = useState(profile.firstname);
  const [lastname, setLastname] = useState(profile.lastname);
  const [email, setEmail] = useState(profile.email);
  const [mainCurrency, setMainCurrency] = useState(profile.main_currency ?? 0);
  const [avatar, setAvatar] = useState(profile.avatar ?? BUNDLED_AVATARS[0]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();

    if (password && password !== confirmPassword) {
      showErrorMessage('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        firstname,
        lastname,
        email,
        main_currency: mainCurrency,
        avatar,
      });

      // Email and password live in Supabase Auth, not in the profile row, so
      // changing either has to go through the auth API as well.
      const supabase = createClient();
      if (email !== profile.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
      }
      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword('');
        setConfirmPassword('');
      }

      showSuccessMessage('Profile saved');
      refresh();
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : 'Could not save the profile');
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadAvatar(file);
      setAvatar(url);
      await updateProfile({ avatar: url });
      showSuccessMessage('Avatar updated');
      refresh();
    } catch {
      showErrorMessage('Could not upload the avatar');
    }
  }

  async function regenerateApiKey() {
    const key = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    try {
      await updateProfile({ api_key: key });
      showSuccessMessage('API key regenerated');
      refresh();
    } catch {
      showErrorMessage('Could not regenerate the API key');
    }
  }

  async function deleteAccount() {
    if (!window.confirm('Delete your account and every subscription in it? This cannot be undone.')) {
      return;
    }
    try {
      const supabase = createClient();
      // Removing the profile cascades to every owned row; auth deletion needs
      // the service role, so the account row is cleared and the session ended.
      await supabase.from('profiles').delete().eq('id', profile.id);
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      showErrorMessage('Could not delete the account');
    }
  }

  return (
    <section className="contain settings">
      <section className="account-section">
        <header>
          <h2>User Details</h2>
        </header>
        <form onSubmit={save}>
          <div className="account-details">
            <div>
              <div className="avatar-list">
                {BUNDLED_AVATARS.map((path) => (
                  <div className="avatar-wrapper" key={path}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/${path}`}
                      alt=""
                      className={`avatar-option${avatar === path ? ' selected' : ''}`}
                      onClick={() => setAvatar(path)}
                    />
                  </div>
                ))}
                <label htmlFor="profile_pic" className="add-avatar" title="Upload avatar">
                  <i className="fa-solid fa-arrow-up-from-bracket" />
                </label>
              </div>
              <input
                type="file"
                id="profile_pic"
                className="hidden-input"
                accept="image/jpeg, image/png, image/gif, image/webp"
                onChange={onAvatarUpload}
              />
            </div>

            <div className="grow">
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input type="text" id="username" value={profile.username} disabled />
              </div>
              <div className="form-group">
                <label htmlFor="firstname">First name:</label>
                <input
                  type="text"
                  id="firstname"
                  value={firstname}
                  onChange={(event) => setFirstname(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastname">Last name:</label>
                <input
                  type="text"
                  id="lastname"
                  value={lastname}
                  onChange={(event) => setLastname(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep the current password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm_password">Confirm password:</label>
                <input
                  type="password"
                  id="confirm_password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="currency">Main currency:</label>
                <select
                  id="currency"
                  value={mainCurrency}
                  onChange={(event) => setMainCurrency(Number(event.target.value))}
                >
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.name} ({currency.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="buttons">
            <input type="submit" value={saving ? 'Saving…' : 'Save'} id="userSubmit" disabled={saving} />
          </div>
        </form>
      </section>

      <section className="account-section">
        <header>
          <h2>API Key</h2>
        </header>
        <div className="form-group-inline">
          <input type={apiKeyVisible ? 'text' : 'password'} value={profile.api_key} readOnly />
          <button
            type="button"
            className="image-button medium"
            onClick={() => setApiKeyVisible((value) => !value)}
            title={apiKeyVisible ? 'Hide' : 'Show'}
          >
            <i className={`fa-solid ${apiKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`} />
          </button>
          <input type="button" value="Regenerate" id="regenerateApiKey" onClick={regenerateApiKey} />
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" /> Regenerating the key immediately invalidates the old
            one.
          </p>
        </div>
      </section>

      <section className="account-section">
        <header>
          <h2>Account</h2>
        </header>
        <div className="account-settings-list">
          <h3>Export subscriptions</h3>
          <div className="buttons">
            <input
              type="button"
              value="Export as JSON"
              onClick={() => exportAsJson(views)}
              className="secondary-button thin mobile-grow"
            />
            <input
              type="button"
              value="Export as CSV"
              onClick={() => exportAsCsv(views)}
              className="secondary-button thin mobile-grow"
            />
          </div>

          <h3>Danger zone</h3>
          <div className="buttons">
            <input
              type="button"
              value="Delete account"
              onClick={deleteAccount}
              className="warning-button thin mobile-grow"
            />
          </div>
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-circle-info" /> Deleting your account removes every subscription,
              category and setting stored with it. This cannot be undone.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
