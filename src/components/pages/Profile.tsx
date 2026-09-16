'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/actions';
import { updateProfile } from '@/lib/settings-actions';
import { exportAsCsv, exportAsJson } from '@/lib/export';
import { LANGUAGES } from '@/lib/i18n';

const BUNDLED_AVATARS = Array.from({ length: 10 }, (_, i) => `images/avatars/${i}.svg`);

/** Mirrors profile.php: user details, two factor authentication, API key, account. */
export function Profile() {
  const { profile, currencies, views, t, refresh } = useAppData();
  const router = useRouter();

  const [firstname, setFirstname] = useState(profile.firstname);
  const [lastname, setLastname] = useState(profile.lastname);
  const [email, setEmail] = useState(profile.email);
  const [mainCurrency, setMainCurrency] = useState(profile.main_currency ?? 0);
  const [language, setLanguage] = useState(profile.language);
  const [avatar, setAvatar] = useState(profile.avatar ?? BUNDLED_AVATARS[0]);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (password && password !== confirmPassword) {
      showErrorMessage(t('passwords_dont_match'));
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        firstname,
        lastname,
        email,
        main_currency: mainCurrency,
        language,
        avatar,
      });

      // Email and password live in Supabase Auth, not in the profile row.
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

      showSuccessMessage(t('user_details_saved'));
      refresh();
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : t('error_updating_user_data'));
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      showErrorMessage(t('file_type_error'));
      return;
    }
    try {
      const url = await uploadAvatar(file);
      setAvatar(url);
      setAvatarOpen(false);
    } catch {
      showErrorMessage(t('error'));
    }
  }

  async function regenerateApiKey() {
    const key = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    try {
      await updateProfile({ api_key: key });
      showSuccessMessage(t('api_key_saved'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  async function deleteAccount() {
    if (!window.confirm(t('delete_account_info'))) return;
    try {
      const supabase = createClient();
      await supabase.from('profiles').delete().eq('id', profile.id);
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      showErrorMessage(t('error'));
    }
  }

  const avatarSrc = avatar.startsWith('http') ? avatar : `/${avatar}`;

  return (
    <section className="contain settings">
      <section className="account-section">
        <header>
          <h2>{t('user_details')}</h2>
        </header>
        <form onSubmit={save} id="userForm">
          <div className="user-form">
            <div className="fields">
              <div>
                <div className="user-avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="avatar"
                    id="avatarImg"
                    onClick={() => setAvatarOpen((value) => !value)}
                  />
                  <span
                    className="edit-avatar"
                    onClick={() => setAvatarOpen((value) => !value)}
                    title="Change Avatar"
                  >
                    <i className="fa-solid fa-pencil" />
                  </span>
                </div>

                <div className={`avatar-select${avatarOpen ? ' is-open' : ''}`} id="avatarSelect">
                  <div className="avatar-list">
                    {BUNDLED_AVATARS.map((path) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={path}
                        src={`/${path}`}
                        alt={path}
                        className="avatar-option"
                        data-src={path}
                        onClick={() => {
                          setAvatar(path);
                          setAvatarOpen(false);
                        }}
                      />
                    ))}
                    <label htmlFor="profile_pic" className="add-avatar" title={t('upload_avatar')}>
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
              </div>

              <div className="grow">
                <div className="form-group">
                  <label htmlFor="username">{t('username')}:</label>
                  <input type="text" id="username" value={profile.username} disabled />
                </div>
                <div className="form-group">
                  <label htmlFor="firstname">{t('firstname')}:</label>
                  <input
                    type="text"
                    id="firstname"
                    autoComplete="given-name"
                    value={firstname}
                    onChange={(event) => setFirstname(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastname">{t('lastname')}:</label>
                  <input
                    type="text"
                    id="lastname"
                    autoComplete="family-name"
                    value={lastname}
                    onChange={(event) => setLastname(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">{t('email')}:</label>
                  <input
                    type="email"
                    id="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">{t('password')}:</label>
                  <input
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm_password">{t('confirm_password')}:</label>
                  <input
                    type="password"
                    id="confirm_password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="currency">{t('main_currency')}:</label>
                  <select
                    id="currency"
                    value={mainCurrency}
                    onChange={(event) => setMainCurrency(Number(event.target.value))}
                  >
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="language">{t('language')}:</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                  >
                    {Object.entries(LANGUAGES).map(([code, info]) => (
                      <option key={code} value={code}>
                        {info.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="buttons">
              <input
                type="submit"
                value={t('save')}
                id="userSubmit"
                className="thin mobile-grow"
                disabled={saving}
              />
            </div>
          </div>
        </form>
      </section>

      <TwoFactor />

      <section className="account-section">
        <header>
          <h2>{t('api_key')}</h2>
        </header>
        <div className="account-api-key">
          <div className="form-group-inline">
            <input type="text" id="apikey" value={profile.api_key} placeholder="API Key" readOnly />
            <input
              type="submit"
              value={t('regenerate')}
              id="regenerateApiKey"
              onClick={regenerateApiKey}
            />
          </div>
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-circle-info" /> {t('api_key_info')}
            </p>
          </div>
        </div>
      </section>

      <section className="account-section">
        <header>
          <h2>{t('account')}</h2>
        </header>
        <div className="account-list">
          <div>
            <h3>{t('export_subscriptions')}</h3>
            <div className="form-group-inline wrap">
              <input
                type="button"
                value={t('export_as_json')}
                onClick={() => exportAsJson(views)}
                className="secondary-button thin mobile-grow"
                id="export-json"
              />
              <input
                type="button"
                value={t('export_as_csv')}
                onClick={() => exportAsCsv(views)}
                className="secondary-button thin mobile-grow"
                id="export-csv"
              />
            </div>
          </div>
        </div>
        <div>
          {/* Upstream hides this from the admin account, which cannot delete itself. */}
          {!profile.is_admin && (
            <>
              <h3>{t('danger_zone')}</h3>
              <div className="form-group-inline">
                <input
                  type="button"
                  value={t('delete_account')}
                  onClick={deleteAccount}
                  className="warning-button thin mobile-grow"
                  id="delete-account"
                />
              </div>
              <div className="settings-notes">
                <p>
                  <i className="fa-solid fa-circle-info" /> {t('delete_account_info')}
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </section>
  );
}

/**
 * Two factor authentication.
 *
 * Upstream stores its own TOTP secret and backup codes. Supabase Auth has
 * multi-factor built in, so enrolment, verification and removal go through it:
 * the secret never touches this app, and sign-in enforces the second factor.
 */
function TwoFactor() {
  const { t, refresh } = useAppData();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // `totp` lists only verified factors; `all` includes pending enrolments.
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const active = data?.totp?.[0];
      if (active) {
        setFactorId(active.id);
        setVerified(true);
      }
    });
  }, []);

  async function enable() {
    const supabase = createClient();
    // A half-finished enrolment from an earlier attempt would block a new one.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const pending = existing?.all?.find(
      (factor) => factor.factor_type === 'totp' && factor.status !== 'verified',
    );
    if (pending) await supabase.auth.mfa.unenroll({ factorId: pending.id });

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error || !data) {
      showErrorMessage(error?.message ?? t('error'));
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setOpen(true);
  }

  async function verify() {
    if (!factorId) return;
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      showErrorMessage(challengeError?.message ?? t('error'));
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    if (error) {
      showErrorMessage(t('totp_code_incorrect'));
      return;
    }
    setVerified(true);
    setOpen(false);
    setCode('');
    showSuccessMessage(t('success'));
    refresh();
  }

  async function disable() {
    if (!factorId) return;
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      showErrorMessage(error.message);
      return;
    }
    setVerified(false);
    setFactorId(null);
    setDisableOpen(false);
    showSuccessMessage(t('success'));
    refresh();
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('two_factor_authentication')}</h2>
      </header>
      <div className="account-2fa">
        <div className="buttons">
          {!verified ? (
            <>
              <input
                type="button"
                value={t('enable_two_factor_authentication')}
                id="enableTotp"
                onClick={enable}
                className="button thin mobile-grow"
              />
              <div className={`totp-popup${open ? ' is-open' : ''}`} id="totp-popup">
                <header>
                  <h3>{t('enable_two_factor_authentication')}</h3>
                  <span className="fa-solid fa-xmark close-form" onClick={() => setOpen(false)} />
                </header>
                <div className="totp-popup-content">
                  <div className="totp-setup" id="totp-setup">
                    <div className="totp-qrcode-container">
                      {/* Supabase returns the QR code as an SVG data URL. */}
                      {qr && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qr} alt="TOTP QR code" />
                      )}
                    </div>
                    <p className="totp-secret" id="totp-secret-code">
                      {secret}
                    </p>
                    <div className="form-group-inline">
                      <input
                        type="text"
                        id="totp"
                        autoComplete="one-time-code"
                        placeholder={t('totp_code')}
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                      />
                      <input type="button" value={t('enable')} onClick={verify} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <input
                type="button"
                className="button secondary-button thin mobile-grow"
                value={t('disable_two_factor_authentication')}
                onClick={() => setDisableOpen(true)}
              />
              <div className={`totp-popup${disableOpen ? ' is-open' : ''}`} id="totp-disable-popup">
                <header>
                  <h3>{t('disable_two_factor_authentication')}</h3>
                  <span className="fa-solid fa-xmark close-form" onClick={() => setDisableOpen(false)} />
                </header>
                <div className="totp-popup-content">
                  <div className="form-group-inline">
                    <input type="button" value={t('disable')} onClick={disable} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" />{' '}
            <span
              dangerouslySetInnerHTML={{
                __html: verified ? t('two_factor_enabled_info') : t('two_factor_info'),
              }}
            />
          </p>
        </div>
      </div>
    </section>
  );
}
