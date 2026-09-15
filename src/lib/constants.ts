/**
 * Static lookup data. Upstream Wallos keeps `cycles` and `frequencies` in
 * SQLite tables, but the rows never change, so they are constants here.
 */

export const CYCLES = [
  { id: 1, days: 1, name: 'Daily' },
  { id: 2, days: 7, name: 'Weekly' },
  { id: 3, days: 30, name: 'Monthly' },
  { id: 4, days: 365, name: 'Yearly' },
  { id: 5, days: 0, name: 'One-time' },
] as const;

export const FREQUENCIES = Array.from({ length: 31 }, (_, i) => i + 1);

export const CYCLE_DAILY = 1;
export const CYCLE_WEEKLY = 2;
export const CYCLE_MONTHLY = 3;
export const CYCLE_YEARLY = 4;
export const CYCLE_ONE_TIME = 5;

export const COLOR_THEMES = ['blue', 'red', 'green', 'yellow', 'purple'] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number];

export const THEMES = ['automatic', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const UPCOMING_PAYMENTS_LIMITS = [3, 5, 10, 20] as const;

export const SORT_OPTIONS = [
  { value: 'name', label: 'Alphanumeric' },
  { value: 'id', label: 'Recently added' },
  { value: 'next_payment', label: 'Next payment' },
  { value: 'price', label: 'Price' },
  { value: 'payer_user_id', label: 'Payer' },
  { value: 'category_id', label: 'Category' },
  { value: 'payment_method_id', label: 'Payment method' },
  { value: 'inactive', label: 'State' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

export const BUDGET_PERIOD_TYPES = ['weekly', 'fortnightly', 'monthly'] as const;
export type BudgetPeriodType = (typeof BUDGET_PERIOD_TYPES)[number];
