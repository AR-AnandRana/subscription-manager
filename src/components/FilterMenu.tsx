'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppData } from './AppDataProvider';
import { hasActiveFilters, type Filters } from '@/lib/filters';
import type { SubscriptionView } from '@/lib/types';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  subscriptions: SubscriptionView[];
  hideDisabled: boolean;
}

/**
 * Filter dropdown, mirroring includes/filters_menu.php.
 *
 * Counts come from the unfiltered list so that selecting one value does not
 * make its siblings vanish from the menu — the same reason upstream keeps a
 * separate set of "menu counts".
 */
export function FilterMenu({ filters, onChange, subscriptions, hideDisabled }: Props) {
  const { categories, paymentMethods, household, t } = useAppData();
  const [open, setOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const memberCounts = countBy(subscriptions, (s) => s.payer_user_id);
  const categoryCounts = countBy(subscriptions, (s) => s.category_id);
  const paymentCounts = countBy(subscriptions.filter((s) => !s.inactive), (s) => s.payment_method_id);

  function toggle<K extends keyof Filters>(key: K, value: Filters[K][number]) {
    const current = filters[key] as (string | number)[];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next } as Filters);
  }

  function isSelected<K extends keyof Filters>(key: K, value: Filters[K][number]) {
    return (filters[key] as (string | number)[]).includes(value);
  }

  return (
    <div className={`filtermenu on-dashboard${open ? ' is-open' : ''}`} ref={containerRef}>
      <button
        className="button secondary-button"
        id="filtermenu-button"
        title={t('filter')}
        onClick={() => setOpen((value) => !value)}
      >
        <i className="fa-solid fa-filter" />
      </button>

      <div className={`filtermenu-content${open ? ' is-open' : ''}`}>
        {household.length > 1 && (
          <Submenu id="member" title={t('member')} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu}>
            {household
              .filter((member) => (memberCounts.get(member.id) ?? 0) > 0 || isSelected('members', member.id))
              .map((member) => (
                <div
                  key={member.id}
                  className={`filter-item ${isSelected('members', member.id) ? 'selected' : ''}`}
                  onClick={() => toggle('members', member.id)}
                >
                  {member.name}
                </div>
              ))}
          </Submenu>
        )}

        {categories.length > 1 && (
          <Submenu id="category" title={t('category')} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu}>
            {categories
              .filter(
                (category) =>
                  (categoryCounts.get(category.id) ?? 0) > 0 || isSelected('categories', category.id),
              )
              .map((category) => (
                <div
                  key={category.id}
                  className={`filter-item ${isSelected('categories', category.id) ? 'selected' : ''}`}
                  onClick={() => toggle('categories', category.id)}
                >
                  {category.name === 'No category' ? t('no_category') : category.name}
                </div>
              ))}
          </Submenu>
        )}

        {paymentMethods.length > 1 && (
          <Submenu
            id="payment"
            title={t('payment_method')}
            openSubmenu={openSubmenu}
            setOpenSubmenu={setOpenSubmenu}
          >
            {paymentMethods
              .filter((method) => (paymentCounts.get(method.id) ?? 0) > 0 || isSelected('payments', method.id))
              .map((method) => (
                <div
                  key={method.id}
                  className={`filter-item ${isSelected('payments', method.id) ? 'selected' : ''}`}
                  onClick={() => toggle('payments', method.id)}
                >
                  {method.name}
                </div>
              ))}
          </Submenu>
        )}

        {!hideDisabled && (
          <Submenu id="state" title={t('state')} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu}>
            <div
              className={`filter-item capitalize ${isSelected('states', 0) ? 'selected' : ''}`}
              onClick={() => toggle('states', 0)}
            >
              {t('enabled')}
            </div>
            <div
              className={`filter-item capitalize ${isSelected('states', 1) ? 'selected' : ''}`}
              onClick={() => toggle('states', 1)}
            >
              {t('disabled')}
            </div>
          </Submenu>
        )}

        <Submenu
          id="renewal_type"
          title={t('renewal_type')}
          openSubmenu={openSubmenu}
          setOpenSubmenu={setOpenSubmenu}
        >
          {[
            { value: '1', label: t('auto_renewal') },
            { value: '0', label: t('manual_renewal') },
            { value: 'onetime', label: t('One-time') },
          ].map(({ value, label }) => (
            <div
              key={value}
              className={`filter-item capitalize ${isSelected('renewalTypes', value) ? 'selected' : ''}`}
              onClick={() => toggle('renewalTypes', value)}
            >
              {label}
            </div>
          ))}
        </Submenu>

        <Submenu
          id="notification"
          title={t('notifications')}
          openSubmenu={openSubmenu}
          setOpenSubmenu={setOpenSubmenu}
        >
          {[
            { value: 'reminder', label: t('reminder') },
            { value: 'cancellation', label: t('cancellation') },
            { value: 'none', label: t('none') },
          ].map(({ value, label }) => (
            <div
              key={value}
              className={`filter-item capitalize ${isSelected('notificationTypes', value) ? 'selected' : ''}`}
              onClick={() => toggle('notificationTypes', value)}
            >
              {label}
            </div>
          ))}
        </Submenu>

        {hasActiveFilters(filters) && (
          <div className="filtermenu-submenu" id="clear-filters">
            <div
              className="filter-title filter-clear"
              onClick={() =>
                onChange({
                  members: [],
                  categories: [],
                  payments: [],
                  states: [],
                  renewalTypes: [],
                  notificationTypes: [],
                })
              }
            >
              <i className="fa-solid fa-times-circle" /> {t('clear')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Submenu({
  id,
  title,
  openSubmenu,
  setOpenSubmenu,
  children,
}: {
  id: string;
  title: string;
  openSubmenu: string | null;
  setOpenSubmenu: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const isOpen = openSubmenu === id;
  return (
    <div className="filtermenu-submenu">
      <div className="filter-title" onClick={() => setOpenSubmenu(isOpen ? null : id)}>
        {title}
      </div>
      <div
        className={`filtermenu-submenu-content${isOpen ? ' is-open' : ''}`}
        id={`filter-${id}`}
      >
        {children}
      </div>
    </div>
  );
}

function countBy(subscriptions: SubscriptionView[], keyOf: (s: SubscriptionView) => number | null) {
  const counts = new Map<number, number>();
  for (const subscription of subscriptions) {
    const key = keyOf(subscription);
    if (key == null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
