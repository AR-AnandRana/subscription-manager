'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppData } from './AppDataProvider';
import { SubscriptionLogo, logoSrc } from './SubscriptionLogo';
import { IconAutomatic, IconLogo, IconManual } from './Icons';
import { formatShortDate } from '@/lib/dates';
import type { SubscriptionView } from '@/lib/types';

interface Props {
  subscription: SubscriptionView;
  showProgress: boolean;
  showOriginalPrice: boolean;
  onOpen: (subscription: SubscriptionView) => void;
  onEdit: (subscription: SubscriptionView) => void;
  onDelete: (subscription: SubscriptionView) => void;
  onClone: (subscription: SubscriptionView) => void;
  onRenew: (subscription: SubscriptionView) => void;
}

/**
 * One subscription tile. The markup mirrors includes/list_subscriptions.php so
 * Wallos's stylesheet lays out both the grid and list views unchanged.
 */
export function SubscriptionCard({
  subscription,
  showProgress,
  showOriginalPrice,
  onOpen,
  onEdit,
  onDelete,
  onClone,
  onRenew,
}: Props) {
  const { formatPrice, t } = useAppData();
  const [actionsOpen, setActionsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionsOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setActionsOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [actionsOpen]);

  const hasLogo = Boolean(subscription.logo);
  const classes = ['subscription', subscription.inactive ? 'inactive' : '', subscription.auto_renew ? '' : 'manual']
    .filter(Boolean)
    .join(' ');

  // Upstream only prints the original alongside once a conversion or a monthly
  // calculation actually changed the figure being shown.
  const showOriginal = showOriginalPrice && subscription.display_price !== subscription.price;
  const progress = Math.min(100, subscription.progress);

  function runAction(event: React.MouseEvent, action: () => void) {
    event.stopPropagation();
    setActionsOpen(false);
    action();
  }

  return (
    <div className="subscription-container" ref={containerRef}>
      <div
        className={classes}
        data-id={subscription.id}
        data-name={subscription.name}
        onClick={() => onOpen(subscription)}
      >
        <div className="subscription-main">
          <span className={`logo ${!hasLogo ? 'hideOnMobile' : ''}`}>
            {hasLogo ? (
              <SubscriptionLogo
                logo={subscription.logo}
                logoVariant={subscription.logo_variant}
                logoTextColor={subscription.logo_text_color}
                name={subscription.name}
              />
            ) : (
              <IconLogo />
            )}
          </span>

          <span className={`name ${hasLogo ? 'hideOnMobile' : ''}`}>{subscription.name}</span>

          <span
            className="cycle"
            title={
              subscription.one_time
                ? subscription.billing_cycle
                : subscription.auto_renew
                  ? t('automatically_renews')
                  : t('manual_renewal')
            }
          >
            {!subscription.one_time && (subscription.auto_renew ? <IconAutomatic /> : <IconManual />)}
            {subscription.billing_cycle}
          </span>

          <span className="next">{formatShortDate(subscription.next_payment)}</span>

          <span className="price">
            <span className="value">
              {formatPrice(subscription.display_price, subscription.display_currency_code)}
              {showOriginal && (
                <span className="original_price">
                  ({formatPrice(subscription.price, subscription.currency_code)})
                </span>
              )}
            </span>
          </span>

          <span className="payment_method">
            {subscription.payment_method_icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc(subscription.payment_method_icon) ?? ''}
                alt=""
                title={`${t('payment_method')}: ${subscription.payment_method_name}`}
              />
            )}
          </span>

          <button
            type="button"
            className="actions-expand"
            onClick={(event) => {
              event.stopPropagation();
              setActionsOpen((value) => !value);
            }}
            aria-label={t('sort', 'Actions')}
          >
            <i className="fas fa-ellipsis-v" />
          </button>

          <ul className="actions" style={actionsOpen ? { display: 'block' } : undefined}>
            <li
              className="edit"
              title={t('edit_subscription')}
              onClick={(event) => runAction(event, () => onEdit(subscription))}
            >
              <i className="fa-solid fa-pen-to-square" />
              {t('edit_subscription')}
            </li>
            <li
              className="delete"
              title={t('delete')}
              onClick={(event) => runAction(event, () => onDelete(subscription))}
            >
              <i className="fa-solid fa-trash-can" />
              {t('delete')}
            </li>
            <li
              className="clone"
              title={t('clone')}
              onClick={(event) => runAction(event, () => onClone(subscription))}
            >
              <i className="fa-solid fa-copy" />
              {t('clone')}
            </li>
            {!subscription.auto_renew && !subscription.one_time && (
              <li
                className="renew"
                title={t('renew')}
                onClick={(event) => runAction(event, () => onRenew(subscription))}
              >
                <i className="fa-solid fa-rotate-right" />
                {t('renew')}
              </li>
            )}
          </ul>
        </div>
      </div>

      {showProgress && !subscription.inactive && (
        <div className="subscription-progress-container">
          <span className="subscription-progress" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
