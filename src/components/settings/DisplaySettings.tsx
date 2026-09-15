'use client';

import { useAppData } from '../AppDataProvider';
import { showErrorMessage } from '../Toast';
import { updateSettings } from '@/lib/settings-actions';
import { UPCOMING_PAYMENTS_LIMITS } from '@/lib/constants';
import type { Settings } from '@/lib/types';

export function DisplaySettings() {
  const { settings, refresh, currencies } = useAppData();

  async function toggle(key: keyof Settings, value: boolean | number) {
    try {
      await updateSettings({ [key]: value } as Partial<Settings>);
      refresh();
    } catch {
      showErrorMessage('Could not save the setting');
    }
  }

  // Converting prices needs exchange rates, which only exist once rates have
  // been fetched; without them every rate is 1 and the conversion is a no-op.
  const hasExchangeRates = currencies.some((currency) => Number(currency.rate) !== 1);

  return (
    <section className="account-section">
      <header>
        <h2>Display Settings</h2>
      </header>
      <div className="account-settings-list">
        <h3>Price</h3>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="monthlyprice"
              checked={settings.monthly_price}
              onChange={(event) => toggle('monthly_price', event.target.checked)}
            />
            <label htmlFor="monthlyprice">Calculate monthly price</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="convertcurrency"
              checked={settings.convert_currency}
              disabled={!hasExchangeRates}
              onChange={(event) => toggle('convert_currency', event.target.checked)}
            />
            <label htmlFor="convertcurrency">Convert prices to main currency</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="showoriginalprice"
              checked={settings.show_original_price}
              onChange={(event) => toggle('show_original_price', event.target.checked)}
            />
            <label htmlFor="showoriginalprice">Show original price</label>
          </div>
        </div>

        <h3>Subscriptions</h3>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="hidedisabled"
              checked={settings.hide_disabled}
              onChange={(event) => toggle('hide_disabled', event.target.checked)}
            />
            <label htmlFor="hidedisabled">Hide disabled subscriptions</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="disabledtobottom"
              checked={settings.disabled_to_bottom}
              onChange={(event) => toggle('disabled_to_bottom', event.target.checked)}
            />
            <label htmlFor="disabledtobottom">Move disabled subscriptions to the bottom</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="subscriptionprogress"
              checked={settings.show_subscription_progress}
              onChange={(event) => toggle('show_subscription_progress', event.target.checked)}
            />
            <label htmlFor="subscriptionprogress">Show billing cycle progress</label>
          </div>
        </div>

        <h3>Interface</h3>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="mobilenav"
              checked={settings.mobile_nav}
              onChange={(event) => toggle('mobile_nav', event.target.checked)}
            />
            <label htmlFor="mobilenav">Use mobile navigation bar</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <input
              type="checkbox"
              id="weekstartssunday"
              checked={settings.week_starts_sunday}
              onChange={(event) => toggle('week_starts_sunday', event.target.checked)}
            />
            <label htmlFor="weekstartssunday">Week starts on Sunday</label>
          </div>
        </div>
        <div>
          <div className="form-group-inline">
            <label htmlFor="upcomingpaymentslimit">Upcoming payments on the dashboard</label>
            <select
              id="upcomingpaymentslimit"
              value={settings.upcoming_payments_limit}
              onChange={(event) => toggle('upcoming_payments_limit', Number(event.target.value))}
            >
              {UPCOMING_PAYMENTS_LIMITS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}
