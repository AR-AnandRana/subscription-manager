/**
 * Search, filter and sort for the subscriptions list, matching the behaviour of
 * scripts/subscriptions.js and includes/list_subscriptions.php.
 */

import { CYCLE_ONE_TIME } from './constants';
import type { SubscriptionView } from './types';

type Translate = (key: string, fallback?: string) => string;

export interface Filters {
  members: number[];
  categories: number[];
  payments: number[];
  states: number[];
  renewalTypes: string[];
  notificationTypes: string[];
}

export const EMPTY_FILTERS: Filters = {
  members: [],
  categories: [],
  payments: [],
  states: [],
  renewalTypes: [],
  notificationTypes: [],
};

export function hasActiveFilters(filters: Filters): boolean {
  return Object.values(filters).some((value) => value.length > 0);
}

export function applyFilters(
  subscriptions: SubscriptionView[],
  filters: Filters,
  search: string,
  hideDisabled: boolean,
): SubscriptionView[] {
  const query = search.trim().toLowerCase();

  return subscriptions.filter((subscription) => {
    if (hideDisabled && subscription.inactive) return false;
    if (query && !subscription.name.toLowerCase().includes(query)) return false;

    if (filters.members.length > 0 && !filters.members.includes(subscription.payer_user_id ?? -1)) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(subscription.category_id ?? -1)) return false;
    if (filters.payments.length > 0 && !filters.payments.includes(subscription.payment_method_id ?? -1)) return false;
    if (filters.states.length > 0 && !filters.states.includes(subscription.inactive ? 1 : 0)) return false;

    if (filters.renewalTypes.length > 0) {
      const type = subscription.one_time ? 'onetime' : subscription.auto_renew ? '1' : '0';
      if (!filters.renewalTypes.includes(type)) return false;
    }

    if (filters.notificationTypes.length > 0) {
      const types: string[] = [];
      if (subscription.notify) types.push('reminder');
      if (subscription.cancellation_date) types.push('cancellation');
      if (types.length === 0) types.push('none');
      if (!filters.notificationTypes.some((type) => types.includes(type))) return false;
    }

    return true;
  });
}

/**
 * Sort a list of subscriptions.
 *
 * Two rules survive every sort order, as upstream: one-time purchases always
 * sink to the bottom under their own heading, and — when the setting is on —
 * disabled subscriptions sink below the active ones.
 */
export function applySort(
  subscriptions: SubscriptionView[],
  sort: string,
  disabledToBottom: boolean,
): SubscriptionView[] {
  const sorted = [...subscriptions];

  sorted.sort((a, b) => {
    switch (sort) {
      case 'price':
        return b.price - a.price;
      case 'id':
        return b.id - a.id;
      case 'next_payment':
        return (a.next_payment ?? '').localeCompare(b.next_payment ?? '');
      case 'payer_user_id':
        return a.payer_name.localeCompare(b.payer_name) || a.name.localeCompare(b.name);
      case 'category_id':
        return a.category_name.localeCompare(b.category_name) || a.name.localeCompare(b.name);
      case 'payment_method_id':
        return (
          a.payment_method_name.localeCompare(b.payment_method_name) || a.name.localeCompare(b.name)
        );
      case 'inactive':
        return Number(a.inactive) - Number(b.inactive) || a.name.localeCompare(b.name);
      case 'renewal_type':
        return Number(b.auto_renew) - Number(a.auto_renew) || a.name.localeCompare(b.name);
      case 'alphanumeric':
        // Upstream sorts these with strnatcmp, so "Item 10" follows "Item 9".
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), undefined, { numeric: true });
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (disabledToBottom) {
    sorted.sort((a, b) => Number(a.inactive) - Number(b.inactive));
  }

  // One-time purchases always go to the bottom regardless of sort order.
  sorted.sort((a, b) => Number(a.one_time) - Number(b.one_time));

  return sorted;
}

/**
 * The group heading a subscription starts, or null when it continues the
 * previous group. Only the grouping sort orders produce headings.
 */
export function groupHeadingFor(
  subscription: SubscriptionView,
  previous: SubscriptionView | undefined,
  sort: string,
  t: Translate = (key) => key,
): string | null {
  if (subscription.one_time && (!previous || !previous.one_time)) {
    return t('lifetime_purchases');
  }
  if (subscription.one_time) return null;

  switch (sort) {
    case 'category_id':
      return previous?.category_name === subscription.category_name
        ? null
        : subscription.category_name || t('no_category');
    case 'payer_user_id':
      return previous?.payer_name === subscription.payer_name ? null : subscription.payer_name;
    case 'payment_method_id':
      return previous?.payment_method_name === subscription.payment_method_name
        ? null
        : subscription.payment_method_name;
    default:
      return null;
  }
}

export { CYCLE_ONE_TIME };
