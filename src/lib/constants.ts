/**
 * Static lookup data. Upstream Wallos keeps `cycles` and `frequencies` in
 * SQLite tables, but the rows never change, so they are constants here.
 */

/** The upstream release this replication tracks; shown on the About page. */
export const WALLOS_VERSION = 'v5.7.1';

export const CYCLES = [
  { id: 1, days: 1, name: 'Daily', labelKey: 'daily' },
  { id: 2, days: 7, name: 'Weekly', labelKey: 'weekly' },
  { id: 3, days: 30, name: 'Monthly', labelKey: 'monthly' },
  { id: 4, days: 365, name: 'Yearly', labelKey: 'yearly' },
  { id: 5, days: 0, name: 'One-time', labelKey: 'one-time' },
] as const;

/** Upstream offers 1-366 in the subscription form's frequency select. */
export const FREQUENCIES = Array.from({ length: 366 }, (_, i) => i + 1);

export const CYCLE_DAILY = 1;
export const CYCLE_WEEKLY = 2;
export const CYCLE_MONTHLY = 3;
export const CYCLE_YEARLY = 4;
export const CYCLE_ONE_TIME = 5;

export const COLOR_THEMES = ['blue', 'green', 'red', 'yellow', 'purple'] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number];

export const THEMES = ['automatic', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const UPCOMING_PAYMENTS_LIMITS = [3, 5, 10, 20] as const;

/** Sort options, in the order and wording sort_options.php renders them. */
export const SORT_OPTIONS = [
  { value: 'name', labelKey: 'name' },
  { value: 'id', labelKey: 'last_added' },
  { value: 'price', labelKey: 'price' },
  { value: 'next_payment', labelKey: 'next_payment' },
  { value: 'payer_user_id', labelKey: 'member' },
  { value: 'category_id', labelKey: 'category' },
  { value: 'payment_method_id', labelKey: 'payment_method' },
  { value: 'inactive', labelKey: 'state', needsDisabled: true },
  { value: 'alphanumeric', labelKey: 'alphanumeric' },
  { value: 'renewal_type', labelKey: 'renewal_type' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

/** Upstream defaults the subscriptions list to next payment order, list view. */
export const DEFAULT_SORT = 'next_payment';
export const DEFAULT_VIEW = 'list';

export const BUDGET_PERIOD_TYPES = ['weekly', 'fortnightly', 'monthly'] as const;
export type BudgetPeriodType = (typeof BUDGET_PERIOD_TYPES)[number];

/** AI providers offered by the settings page, in upstream's order. */
export const AI_PROVIDERS = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'ollama', label: 'Local Ollama' },
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
] as const;

/** The maintenance buttons on the admin page, with upstream's labels. */
export const CRON_JOBS = [
  { task: 'checkforupdates', label: 'Check for Updates' },
  { task: 'sendnotifications', label: 'Send Notifications' },
  { task: 'sendcancellationnotifications', label: 'Send Cancellation Notifications' },
  { task: 'sendresetpasswordemails', label: 'Send Password Reset Emails' },
  { task: 'sendverificationemails', label: 'Send Verification Emails' },
  { task: 'updateexchange', label: 'Update Exchange Rates' },
  { task: 'updatenextpayment', label: 'Update Next Payments' },
  { task: 'storetotalyearlycost', label: 'Store Total Yearly Cost' },
  { task: 'generaterecommendations', label: 'Generate AI Recommendations' },
] as const;
