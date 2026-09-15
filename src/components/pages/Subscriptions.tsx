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
import {
  applyFilters,
  applySort,
  EMPTY_FILTERS,
  groupHeadingFor,
  type Filters,
} from '@/lib/filters';
import {
  cloneSubscription,
  deleteSubscription,
  renewSubscription,
  syncOverdueRenewals,
} from '@/lib/actions';
import type { SubscriptionView } from '@/lib/types';

type View = 'grid' | 'list';

export function Subscriptions() {
  const { views, settings, subscriptions, refresh } = useAppData();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<SubscriptionView | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionView | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // View and sort are per-device preferences upstream keeps in a cookie.
  const [view, changeView] = useLocalStorageState<View>('wallos-subscriptions-view', 'grid');
  const [sort, changeSort] = useLocalStorageState<string>('wallos-sort-order', 'name');

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
    if (!window.confirm(`Delete "${subscription.name}"?`)) return;
    try {
      await deleteSubscription(subscription.id);
      showSuccessMessage('Subscription deleted');
      refresh();
    } catch {
      showErrorMessage('Could not delete the subscription');
    }
  }

  async function handleClone(subscription: SubscriptionView) {
    try {
      await cloneSubscription(subscription);
      showSuccessMessage('Subscription cloned');
      refresh();
    } catch {
      showErrorMessage('Could not clone the subscription');
    }
  }

  async function handleRenew(subscription: SubscriptionView) {
    try {
      await renewSubscription(subscription);
      showSuccessMessage('Subscription renewed');
      refresh();
    } catch {
      showErrorMessage('Could not renew the subscription');
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
            New Subscription
          </button>

          <div className="top-actions">
            <button
              className="button secondary-button mobile-search-toggle"
              id="mobile-search-toggle"
              title="Search"
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
                placeholder="Search"
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
                title="List view"
                onClick={() => changeView('list')}
              >
                <i className="fa-solid fa-list" />
              </button>
              <button
                type="button"
                className={`view-toggle-button${view === 'grid' ? ' selected' : ''}`}
                id="view-grid-button"
                title="Grid view"
                onClick={() => changeView('grid')}
              >
                <i className="fa-solid fa-table-cells-large" />
              </button>
            </div>
          </div>
        </header>

        <div className={`subscriptions${view === 'grid' ? ' grid-view' : ''}`} id="subscriptions">
          {visible.length === 0 ? (
            <div className="empty-page">
              <h2>No subscriptions found</h2>
              <p>
                {views.length === 0
                  ? 'Add your first subscription to start tracking your spending.'
                  : 'No subscription matches the current search or filters.'}
              </p>
              <button className="button" onClick={openAdd}>
                <i className="fa-solid fa-circle-plus" />
                New Subscription
              </button>
            </div>
          ) : (
            visible.map((subscription, index) => {
              const heading = groupHeadingFor(subscription, visible[index - 1], sort);
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
            })
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
