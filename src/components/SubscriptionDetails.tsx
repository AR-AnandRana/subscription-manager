'use client';

import { useEffect } from 'react';
import { useAppData } from './AppDataProvider';
import { SubscriptionLogo, logoSrc } from './SubscriptionLogo';
import { formatLongDate } from '@/lib/dates';
import { buildIcsFile } from '@/lib/ical';
import type { SubscriptionView } from '@/lib/types';

interface Props {
  subscription: SubscriptionView | null;
  onClose: () => void;
}

/**
 * The read-only detail sheet, opened by clicking a subscription anywhere in the
 * app. Markup and class names follow includes/subscription_details_popup.php so
 * Wallos's stylesheet drives the layout and open/close animation unchanged.
 */
export function SubscriptionDetails({ subscription, onClose }: Props) {
  const { formatPrice, paymentMethods, subscriptions } = useAppData();

  // The sheet locks scrolling behind it; make sure that never outlives the sheet.
  useEffect(() => {
    if (!subscription) return;
    document.body.classList.add('details-open');
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('details-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [subscription, onClose]);

  const open = Boolean(subscription);
  const isOneTime = subscription?.cycle === 5;
  const paymentMethod = paymentMethods.find((p) => p.id === subscription?.payment_method_id);
  const replacementName = subscription?.replacement_subscription_id
    ? subscriptions.find((s) => s.id === subscription.replacement_subscription_id)?.name
    : null;

  const showProgress = Boolean(subscription) && !isOneTime && !subscription!.inactive;
  const progress = Math.min(100, subscription?.progress ?? 0);

  let notificationsText = subscription?.notify ? 'enabled' : 'disabled';
  if (subscription?.notify && subscription.notify_days_before != null && subscription.notify_days_before >= 0) {
    const days = subscription.notify_days_before;
    if (days === 0) notificationsText += ' · on due date';
    else if (days === 1) notificationsText += ' · 1 day before';
    else notificationsText += ` · ${days} days before`;
  }

  function exportCalendar() {
    if (!subscription) return;
    buildIcsFile(subscription);
  }

  return (
    <>
      <div
        className={`details-backdrop${open ? ' is-open' : ''}`}
        id="details-backdrop"
        onClick={onClose}
      />
      <section
        className={`subscription-details${open ? ' is-open' : ''}`}
        id="subscription-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-name"
      >
        {subscription && (
          <>
            <button type="button" className="details-close" onClick={onClose} title="Cancel">
              <i className="fa-solid fa-xmark" />
            </button>

            <header className="details-hero">
              <div className="details-heading">
                <span className="details-logo" id="details-logo">
                  {subscription.logo ? (
                    <SubscriptionLogo
                      logo={subscription.logo}
                      logoVariant={subscription.logo_variant}
                      logoTextColor={subscription.logo_text_color}
                      name={subscription.name}
                    />
                  ) : (
                    <span className="details-logo-fallback">
                      {(subscription.name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <div className="details-chips" id="details-chips">
                  {subscription.inactive && <span className="details-chip warn">disabled</span>}
                  {isOneTime ? (
                    <span className="details-chip muted">One-time</span>
                  ) : subscription.auto_renew ? (
                    <span className="details-chip ok">automatic</span>
                  ) : (
                    <span className="details-chip manual">manual renewal</span>
                  )}
                </div>
              </div>
              <h3 id="details-name">{subscription.name}</h3>
            </header>

            <div className="details-price-row">
              <span className="details-price" id="details-price">
                {formatPrice(subscription.price, subscription.currency_code)}
              </span>
              <span className="details-cycle" id="details-billing-cycle">
                {isOneTime ? '' : subscription.billing_cycle}
              </span>
              <button
                type="button"
                className="button secondary-button details-action-button details-export-button"
                onClick={exportCalendar}
                title="Export to iCalendar"
                aria-label="Export to iCalendar"
              >
                <i className="fa-solid fa-calendar-plus" />
              </button>
              {subscription.url && (
                <a
                  className="button secondary-button details-action-button"
                  href={/^https?:\/\//.test(subscription.url) ? subscription.url : `https://${subscription.url}`}
                  target="_blank"
                  rel="noreferrer"
                  title="External URL"
                  aria-label="External URL"
                >
                  <i className="fa-solid fa-globe" />
                </a>
              )}
            </div>

            <div className={`details-progress-track${showProgress ? '' : ' hide'}`}>
              <span className="details-progress" style={{ width: `${progress}%` }} />
            </div>

            <dl className="details-grid">
              <div className="details-item">
                <dt>Next payment</dt>
                <dd>{formatLongDate(subscription.next_payment) || 'none'}</dd>
              </div>
              <div className="details-item">
                <dt>Start date</dt>
                <dd>{formatLongDate(subscription.start_date) || 'none'}</dd>
              </div>
              <div className="details-item">
                <dt>Category</dt>
                <dd>{subscription.category_name || 'none'}</dd>
              </div>
              <div className="details-item">
                <dt>Paid by</dt>
                <dd>{subscription.payer_name || 'none'}</dd>
              </div>
              <div className="details-item">
                <dt>Payment method</dt>
                <dd id="details-payment-method">
                  {paymentMethod?.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoSrc(paymentMethod.icon) ?? ''} alt="" />
                  )}
                  <span>{paymentMethod?.name ?? 'none'}</span>
                </dd>
              </div>
              <div className="details-item">
                <dt>Notifications</dt>
                <dd>{notificationsText}</dd>
              </div>
              {subscription.cancellation_date && (
                <div className="details-item">
                  <dt>Cancellation notification</dt>
                  <dd>{formatLongDate(subscription.cancellation_date)}</dd>
                </div>
              )}
              {replacementName && (
                <div className="details-item">
                  <dt>Replaced with</dt>
                  <dd>{replacementName}</dd>
                </div>
              )}
            </dl>

            {subscription.notes && (
              <div className="details-notes" id="details-notes-item">
                <i className="fa-solid fa-note-sticky" />
                <div>{subscription.notes}</div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
