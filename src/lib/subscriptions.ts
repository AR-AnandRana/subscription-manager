/**
 * Subscription math, ported from Wallos's PHP.
 *
 * The constants here are upstream's, not rounded approximations: a weekly
 * subscription counts as 4.35 payments a month and a yearly one divides by 12,
 * so totals match the PHP app to the cent.
 */

import { CYCLE_ONE_TIME } from './constants';
import {
  addDays,
  addMonthsClamped,
  dateWithClampedDay,
  diffInDays,
  parseDate,
  today,
} from './dates';
import type { Currency, Subscription } from './types';

/** Monthly-equivalent price. Mirrors `getPricePerMonth()`. */
export function getPricePerMonth(cycle: number, frequency: number, price: number): number {
  switch (cycle) {
    case 1:
      return price * (30 / frequency);
    case 2:
      return price * (4.35 / frequency);
    case 3:
      return price * (1 / frequency);
    case 4:
      return price / (12 * frequency);
    case 5:
    default:
      return 0;
  }
}

/**
 * Convert a price into the user's main currency. Rates are stored relative to
 * the main currency, so conversion divides. An unknown or zero rate leaves the
 * price untouched, matching `wallos_convert_price()`.
 */
export function convertPrice(
  price: number,
  currencyId: number | null,
  rates: Map<number, number>,
): number {
  if (currencyId == null) return price;
  const rate = rates.get(currencyId);
  if (!rate) return price;
  return price / rate;
}

export function buildRateMap(currencies: Currency[]): Map<number, number> {
  return new Map(currencies.map((c) => [c.id, Number(c.rate)]));
}

/** Human-readable billing cycle, e.g. "Monthly" or "3 months". */
export function getBillingCycle(cycle: number, frequency: number): string {
  switch (cycle) {
    case 1:
      return frequency === 1 ? 'Daily' : `${frequency} days`;
    case 2:
      return frequency === 1 ? 'Weekly' : `${frequency} weeks`;
    case 3:
      return frequency === 1 ? 'Monthly' : `${frequency} months`;
    case 4:
      return frequency === 1 ? 'Yearly' : `${frequency} years`;
    case 5:
    default:
      return 'One-time';
  }
}

/**
 * Percentage of the current billing period that has elapsed.
 *
 * `next_payment` can sit several cycles ahead when renewals have not been run,
 * so this walks back whole cycles until the window actually contains today —
 * the same correction upstream makes.
 */
export function getSubscriptionProgress(
  cycle: number,
  frequency: number,
  nextPayment: string | null,
): number {
  if (cycle === CYCLE_ONE_TIME) return 0;
  const nextPaymentDate = parseDate(nextPayment);
  if (!nextPaymentDate) return 0;

  const currentDate = today();

  let cycleDays = 30;
  if (cycle === 1) cycleDays = 1 * frequency;
  else if (cycle === 2) cycleDays = 7 * frequency;
  else if (cycle === 3) cycleDays = 30 * frequency;
  else if (cycle === 4) cycleDays = 365 * frequency;
  if (cycleDays <= 0) return 0;

  const daysUntilNextPayment = diffInDays(currentDate, nextPaymentDate);
  const cyclesBack =
    currentDate <= nextPaymentDate ? Math.max(1, Math.ceil(daysUntilNextPayment / cycleDays)) : 1;

  const lastPaymentDate = addDays(nextPaymentDate, -(cyclesBack * cycleDays));
  const daysSinceLastPayment = diffInDays(lastPaymentDate, currentDate);

  return Math.floor((daysSinceLastPayment / cycleDays) * 100);
}

/** Step a payment date forward or backward one interval. */
export function shiftOccurrence(
  date: Date,
  cycle: number,
  frequency: number,
  anchor: Date,
  direction: 1 | -1,
): Date | null {
  const freq = Math.max(1, frequency);
  const step = direction * freq;

  if (cycle === 1) return addDays(date, step);
  if (cycle === 2) return addDays(date, step * 7);
  if (cycle === 3) return addMonthsClamped(date, step, anchor.getDate());
  if (cycle === 4) {
    return dateWithClampedDay(date.getFullYear() + step, anchor.getMonth(), anchor.getDate());
  }
  return null;
}

/**
 * Every payment date for a subscription that falls inside a range.
 *
 * A manual-renewal subscription only ever has the single date stored on it —
 * it does not roll forward on its own, so projecting future renewals for it
 * would invent payments the user has not committed to.
 */
export function getOccurrencesInRange(
  subscription: Pick<Subscription, 'next_payment' | 'cycle' | 'frequency' | 'auto_renew'>,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const nextPayment = parseDate(subscription.next_payment);
  if (!nextPayment) return [];
  if (subscription.cycle === CYCLE_ONE_TIME) {
    return nextPayment >= rangeStart && nextPayment <= rangeEnd ? [nextPayment] : [];
  }
  if (!subscription.auto_renew) {
    return nextPayment >= rangeStart && nextPayment <= rangeEnd ? [nextPayment] : [];
  }

  const { cycle, frequency } = subscription;
  let current = nextPayment;
  let safety = 0;

  while (current > rangeStart && safety++ < 10_000) {
    const prev = shiftOccurrence(current, cycle, frequency, nextPayment, -1);
    if (!prev) return [];
    current = prev;
  }
  while (current < rangeStart && safety++ < 10_000) {
    const next = shiftOccurrence(current, cycle, frequency, nextPayment, 1);
    if (!next) return [];
    current = next;
  }

  const occurrences: Date[] = [];
  while (current <= rangeEnd && safety++ < 10_000) {
    if (current >= rangeStart) occurrences.push(current);
    const next = shiftOccurrence(current, cycle, frequency, nextPayment, 1);
    if (!next || next <= current) break;
    current = next;
  }
  return occurrences;
}

/**
 * Roll a payment date forward until it is in the future.
 *
 * This is what the upstream `updatenextpayment` cron does nightly. Running it
 * on read keeps a browser-only deployment correct without a scheduler.
 */
export function rollForwardNextPayment(
  nextPayment: string | null,
  cycle: number,
  frequency: number,
): Date | null {
  const date = parseDate(nextPayment);
  if (!date || cycle === CYCLE_ONE_TIME) return date;

  const now = today();
  let current = date;
  let safety = 0;
  while (current < now && safety++ < 10_000) {
    const next = shiftOccurrence(current, cycle, frequency, date, 1);
    if (!next || next <= current) break;
    current = next;
  }
  return current;
}

/** Total needed between today and the end of the budget period. */
export function computeAmountNeededInPeriod(
  subscriptions: Subscription[],
  periodEnd: Date,
  rates: Map<number, number>,
): number {
  const rangeStart = today();
  let amount = 0;
  for (const subscription of subscriptions) {
    if (subscription.inactive) continue;
    const occurrences = getOccurrencesInRange(subscription, rangeStart, periodEnd);
    if (occurrences.length === 0) continue;
    amount += convertPrice(Number(subscription.price), subscription.currency_id, rates) * occurrences.length;
  }
  return amount;
}
