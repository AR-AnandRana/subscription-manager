/**
 * Subscription export, replacing endpoints/subscriptions/export.php, plus the
 * account backup behind the admin page's Backup button.
 */

import type { SubscriptionView } from './types';

const CSV_COLUMNS = [
  'name',
  'price',
  'currency_code',
  'billing_cycle',
  'next_payment',
  'start_date',
  'category_name',
  'payment_method_name',
  'payer_name',
  'auto_renew',
  'inactive',
  'url',
  'notes',
] as const;

function download(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAsJson(subscriptions: SubscriptionView[]) {
  download(JSON.stringify(subscriptions, null, 2), 'subscriptions.json', 'application/json');
}

/** Quote a CSV field, doubling any embedded quotes per RFC 4180. */
function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportAsCsv(subscriptions: SubscriptionView[]) {
  const rows = [
    CSV_COLUMNS.join(','),
    ...subscriptions.map((subscription) =>
      CSV_COLUMNS.map((column) => csvEscape(subscription[column])).join(','),
    ),
  ];
  download(rows.join('\r\n'), 'subscriptions.csv', 'text/csv');
}

/**
 * Everything this account owns, as one JSON file.
 *
 * Upstream's backup zips the whole SQLite file plus the uploaded logos, which
 * only makes sense when the app owns the database. Supabase owns it here, so
 * this exports the account's rows and leaves full restores to the Supabase
 * dashboard's point-in-time recovery.
 */
export function exportAllData(data: Record<string, unknown>) {
  const backup = {
    exported_at: new Date().toISOString(),
    profile: data.profile,
    settings: data.settings,
    notification_settings: data.notificationSettings,
    channels: data.channels,
    currencies: data.currencies,
    categories: data.categories,
    payment_methods: data.paymentMethods,
    household: data.household,
    subscriptions: data.subscriptions,
    ai_settings: data.aiSettings,
    ai_recommendations: data.aiRecommendations,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  download(JSON.stringify(backup, null, 2), `wallos-backup-${stamp}.json`, 'application/json');
}
