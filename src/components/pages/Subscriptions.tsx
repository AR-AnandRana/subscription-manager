'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { FilterMenu } from '../FilterMenu';
import { SortMenu } from '../SortMenu';
import { SubscriptionCard } from '../SubscriptionCard';
import { SubscriptionDetails } from '../SubscriptionDetails';
import { SubscriptionForm } from '../SubscriptionForm';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { useLocalStorageState } from '@/lib/browser-state';
import { DEFAULT_SORT, DEFAULT_VIEW } from '@/lib/constants';
import { applyFilters, applySort, EMPTY_FILTERS, groupHeadingFor, type Filters } from '@/lib/filters';
import {
  cloneSubscription,
  deleteSubscription,
  renewSubscription,
  syncOverdueRenewals,
} from '@/lib/actions';
import type { SubscriptionView } from '@/lib/types';

type View = 'grid' | 'list';

export function Subscriptions() {
  const { views, settings, subscriptions, t, refresh } = useAppData();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<SubscriptionView | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionView | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // View and sort are per-device preferences upstream keeps in a cookie, and it
  // defaults to the list view ordered by next payment.
  const [view, changeView] = useLocalStorageState<View>('wallos-subscriptions-view', DEFAULT_VIEW);
  const [sort, changeSort] = useLocalStorageState<string>('wallos-sort-order', DEFAULT_SORT);

  // Auto-renewing subscriptions whose date has passed roll forward here, the
  // job the upstream nightly cron does.
  useEffect(() => {
    let cancelled = false;
    syncOverdueRenewals(subscriptions).then((changed) => {
      if (changed && !cancelled) refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [subscriptions, refresh]);

  const visible = useMemo(() => {
    const filtered = applyFilters(views, filters, search, settings.hide_disabled);
    return applySort(filtered, sort, settings.disabled_to_bottom);
  }, [views, filters, search, sort, settings.hide_disabled, settings.disabled_to_bottom]);

  async function handleDelete(subscription: SubscriptionView) {
    if (!window.confirm(`${t('delete')} "${subscription.name}"?`)) return;
    try {
      await deleteSubscription(subscription.id);
      showSuccessMessage(t('success'));
      refresh();
    } catch {
      showErrorMessage(t('error_deleting_subscription'));
    }
  }

  async function handleClone(subscription: SubscriptionView) {
    try {
      await cloneSubscription(subscription);
      showSuccessMessage(t('subscription_added_successfuly'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  async function handleRenew(subscription: SubscriptionView) {
    try {
      await renewSubscription(subscription);
      showSuccessMessage(t('subscription_updated_successfuly'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(subscription: SubscriptionView) {
    setEditing(subscription);
    setFormOpen(true);
  }

  return (
    <>
      <section className="contain">
        {/* Upstream hides the toolbar entirely until the first subscription exists. */}
        <header
          id="main-actions"
          className={`main-actions${views.length === 0 ? ' hidden' : ''}${
            mobileSearchOpen ? ' search-open' : ''
          }`}
        >
          <button className="button" onClick={openAdd}>
            <i className="fa-solid fa-circle-plus" />
            {t('new_subscription')}
          </button>

          <div className="top-actions">
            <button
              className="button secondary-button mobile-search-toggle"
              id="mobile-search-toggle"
              title={t('search')}
              onClick={() => setMobileSearchOpen((value) => !value)}
            >
              <i className="fa-solid fa-magnifying-glass" />
            </button>

            <div className="search">
              <input
                type="text"
                autoComplete="off"
                name="search"
                id="search"
                placeholder={t('search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="fa-solid fa-magnifying-glass search-icon" />
              <span className="fa-solid fa-xmark clear-search" onClick={() => setSearch('')} />
            </div>

            <FilterMenu
              filters={filters}
              onChange={setFilters}
              subscriptions={views}
              hideDisabled={settings.hide_disabled}
            />

            <SortMenu sort={sort} onChange={changeSort} hideDisabled={settings.hide_disabled} />

            <div className="view-toggle" id="view-toggle">
              <button
                type="button"
                className={`view-toggle-button${view === 'list' ? ' selected' : ''}`}
                id="view-list-button"
                title={t('list_view')}
                onClick={() => changeView('list')}
              >
                <i className="fa-solid fa-list" />
              </button>
              <button
                type="button"
                className={`view-toggle-button${view === 'grid' ? ' selected' : ''}`}
                id="view-grid-button"
                title={t('grid_view')}
                onClick={() => changeView('grid')}
              >
                <i className="fa-solid fa-table-cells-large" />
              </button>
            </div>
          </div>
        </header>

        <div className={`subscriptions${view === 'grid' ? ' grid-view' : ''}`} id="subscriptions">
          {visible.map((subscription, index) => {
            const heading = groupHeadingFor(subscription, visible[index - 1], sort, t);
            return (
              <div key={subscription.id} style={{ display: 'contents' }}>
                {heading && <div className="subscription-list-title">{heading}</div>}
                <SubscriptionCard
                  subscription={subscription}
                  showProgress={settings.show_subscription_progress}
                  showOriginalPrice={settings.show_original_price}
                  onOpen={setSelected}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onClone={handleClone}
                  onRenew={handleRenew}
                />
              </div>
            );
          })}

          {views.length === 0 && (
            <div className="empty-page">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/siteimages/empty.png" alt={t('empty_page')} />
              <p>{t('no_subscriptions_yet')}</p>
              <button className="button" onClick={openAdd}>
                <i className="fa-solid fa-circle-plus" />
                {t('add_first_subscription')}
              </button>
            </div>
          )}

          {views.length > 0 && visible.length === 0 && (
            <div className="empty-page">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/siteimages/empty.png" alt={t('empty_page')} />
              <p>{t('no_matching_subscriptions')}</p>
              <button
                className="button"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSearch('');
                }}
              >
                {t('clear_filters')}
              </button>
            </div>
          )}
        </div>
      </section>

      <SubscriptionDetails subscription={selected} onClose={() => setSelected(null)} />

      <SubscriptionForm
        open={formOpen}
        subscription={editing}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />
    </>
  );
}
