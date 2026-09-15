/**
 * Date helpers.
 *
 * Wallos stores dates as bare `YYYY-MM-DD` strings and compares them at
 * midnight local time. `new Date('2026-07-01')` parses as UTC midnight, which
 * shifts the day backwards west of Greenwich, so every date here is built from
 * its parts instead.
 */

/** Parse a `YYYY-MM-DD` string as local midnight. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Format a Date as `YYYY-MM-DD` in local time. */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today at local midnight. */
export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Add months, clamping the day to the target month's length so that adding one
 * month to Jan 31 lands on Feb 28, matching PHP's `getDateWithClampedDay`
 * rather than its `+1 month` overflow.
 */
export function addMonthsClamped(date: Date, months: number, anchorDay = date.getDate()): Date {
  const total = date.getFullYear() * 12 + date.getMonth() + months;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  return dateWithClampedDay(year, month, anchorDay);
}

export function dateWithClampedDay(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(Math.max(1, day), lastDay));
}

/** Whole days between two dates (absolute), matching PHP's DateTime::diff->days. */
export function diffInDays(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.round(ms / 86_400_000);
}

/** Signed whole days from `a` to `b`. */
export function signedDiffInDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Wallos shows `MMM d` for dates in the current year and `MMM yyyy` otherwise,
 * so a renewal years out reads as a month rather than a precise day.
 */
export function formatShortDate(value: string | null | undefined, locale = 'en'): string {
  const date = parseDate(value);
  if (!date) return '';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(locale, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', year: 'numeric' });
}

export function formatLongDate(value: string | null | undefined, locale = 'en'): string {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}
