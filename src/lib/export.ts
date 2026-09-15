/**
 * Subscription export, replacing endpoints/subscriptions/export.php.
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
  download(JSON.stringify(subscriptions, null, 2), 'wallos-subscriptions.json', 'application/json');
}

/** Quote a CSV field, doubling any embedded quotes per RFC 4180. */
function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportAsCsv(subscriptions: SubscriptionView[]) {
  const rows = [
    CSV_COLUMNS.join(','),
    ...subscriptions.map((subscription) =>
      CSV_COLUMNS.map((column) => csvEscape(subscription[column])).join(','),
    ),
  ];
  download(rows.join('\r\n'), 'wallos-subscriptions.csv', 'text/csv');
}
