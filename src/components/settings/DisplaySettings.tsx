'use client';

import { useAppData } from '../AppDataProvider';
import { showErrorMessage } from '../Toast';
import { updateSettings } from '@/lib/settings-actions';
import { UPCOMING_PAYMENTS_LIMITS } from '@/lib/constants';
import type { Settings } from '@/lib/types';

/**
 * Display settings, from settings.php: Price, Experience and Disabled
 * Subscriptions, in that order and with upstream's wording.
 */
export function DisplaySettings() {
  const { settings, fixer, t, refresh } = useAppData();

  async function set(key: keyof Settings, value: boolean | number) {
    try {
      await updateSettings({ [key]: value } as Partial<Settings>);
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  // Converting prices needs exchange rates, which need a Fixer key — the same
  // condition upstream uses to disable this checkbox.
  const canConvert = Boolean(fixer.api_key);

  return (
    <section className="account-section">
      <header>
        <h2>{t('display_settings')}</h2>
      </header>
      <div className="account-settings-list">
        <h3>{t('price')}</h3>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="monthlyprice"
              checked={settings.monthly_price}
              onChange={(event) => set('monthly_price', event.target.checked)}
            />
            <label htmlFor="monthlyprice">{t('calculate_monthly_price')}</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="convertcurrency"
              checked={settings.convert_currency}
              disabled={!canConvert}
              onChange={(event) => set('convert_currency', event.target.checked)}
            />
            <label htmlFor="convertcurrency">{t('convert_prices')}</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="showoriginalprice"
              checked={settings.show_original_price}
              onChange={(event) => set('show_original_price', event.target.checked)}
            />
            <label htmlFor="showoriginalprice">{t('show_original_price')}</label>
          </div>
        </div>
        <div>
          <div className="form-group">
            <label htmlFor="upcomingpaymentslimit">{t('upcoming_payments_to_show')}</label>
            <select
              id="upcomingpaymentslimit"
              value={settings.upcoming_payments_limit}
              onChange={(event) => set('upcoming_payments_limit', Number(event.target.value))}
            >
              {UPCOMING_PAYMENTS_LIMITS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h3>{t('experience')}</h3>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="mobilenavigation"
              checked={settings.mobile_nav}
              onChange={(event) => set('mobile_nav', event.target.checked)}
            />
            <label htmlFor="mobilenavigation">{t('use_mobile_navigation_bar')}</label>
          </div>
          <div className="mobile-nav-image" />
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="showsubscriptionprogress"
              checked={settings.show_subscription_progress}
              onChange={(event) => set('show_subscription_progress', event.target.checked)}
            />
            <label htmlFor="showsubscriptionprogress">{t('show_subscription_progress')}</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="weekstartssunday"
              checked={settings.week_starts_sunday}
              onChange={(event) => set('week_starts_sunday', event.target.checked)}
            />
            <label htmlFor="weekstartssunday">{t('week_starts_on_sunday')}</label>
          </div>
        </div>

        <h3>{t('disabled_subscriptions')}</h3>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="disabledtobottom"
              checked={settings.disabled_to_bottom}
              onChange={(event) => set('disabled_to_bottom', event.target.checked)}
            />
            <label htmlFor="disabledtobottom">{t('show_disabled_subscriptions_at_the_bottom')}</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="hidedisabled"
              checked={settings.hide_disabled}
              onChange={(event) => set('hide_disabled', event.target.checked)}
            />
            <label htmlFor="hidedisabled">{t('hide_disabled_subscriptions')}</label>
          </div>
        </div>
      </div>
    </section>
  );
}
