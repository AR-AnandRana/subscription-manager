/**
 * Budget period arithmetic, ported from includes/budget_period_calculations.php.
 *
 * A budget period is anchored to a user-chosen date and repeats weekly,
 * fortnightly or monthly, so "this period" is rarely the calendar month.
 */

import type { BudgetPeriodType } from './constants';
import { dateWithClampedDay, parseDate, signedDiffInDays, toDateString } from './dates';

export interface BudgetPeriod {
  start: Date;
  end: Date;
  label: string;
  type: BudgetPeriodType;
}

export function sanitizeBudgetPeriodType(value: string | null | undefined): BudgetPeriodType {
  return value === 'weekly' || value === 'fortnightly' || value === 'monthly' ? value : 'monthly';
}

export function sanitizeBudgetAnchorDate(value: string | null | undefined): string {
  const parsed = parseDate(value);
  return parsed ? toDateString(parsed) : toDateString(new Date());
}

export function getActiveBudgetPeriod(
  todayDate: Date,
  periodType: string | null | undefined,
  anchorDate: string | null | undefined,
): BudgetPeriod {
  const type = sanitizeBudgetPeriodType(periodType);
  const anchor = parseDate(sanitizeBudgetAnchorDate(anchorDate))!;

  let start: Date;
  let end: Date;

  if (type === 'weekly' || type === 'fortnightly') {
    const periodLength = type === 'weekly' ? 7 : 14;
    const diffDays = signedDiffInDays(anchor, todayDate);
    const offset = Math.floor(diffDays / periodLength);

    start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offset * periodLength);
    if (start > todayDate) {
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate() - periodLength);
    }
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + periodLength - 1);
  } else {
    const anchorDay = anchor.getDate();
    let monthStart = dateWithClampedDay(todayDate.getFullYear(), todayDate.getMonth(), anchorDay);
    if (todayDate < monthStart) {
      monthStart = dateWithClampedDay(todayDate.getFullYear(), todayDate.getMonth() - 1, anchorDay);
    }
    start = monthStart;
    const nextStart = dateWithClampedDay(start.getFullYear(), start.getMonth() + 1, anchorDay);
    end = new Date(nextStart.getFullYear(), nextStart.getMonth(), nextStart.getDate() - 1);
  }

  return { start, end, label: formatBudgetPeriodLabel(start, end), type };
}

export function formatBudgetPeriodLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  let startLabel = start.toLocaleDateString('en', opts);
  let endLabel = end.toLocaleDateString('en', opts);
  if (start.getFullYear() !== end.getFullYear()) {
    startLabel += `, ${start.getFullYear()}`;
    endLabel += `, ${end.getFullYear()}`;
  }
  return `${startLabel} - ${endLabel}`;
}
