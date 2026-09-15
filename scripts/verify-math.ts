import { getPricePerMonth, getOccurrencesInRange, getSubscriptionProgress, rollForwardNextPayment } from '../src/lib/subscriptions';
import { getActiveBudgetPeriod } from '../src/lib/budget';
import { addMonthsClamped, parseDate, toDateString } from '../src/lib/dates';

const eq = (label: string, got: unknown, want: unknown) =>
  console.log(`${JSON.stringify(got) === JSON.stringify(want) ? 'PASS' : 'FAIL'}  ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);

// getPricePerMonth mirrors the PHP switch exactly.
eq('daily f=1 price 1', getPricePerMonth(1, 1, 1), 30);
eq('weekly f=1 price 10', getPricePerMonth(2, 1, 10), 43.5);
eq('monthly f=3 price 30', getPricePerMonth(3, 3, 30), 10);
eq('yearly f=1 price 120', getPricePerMonth(4, 1, 120), 10);
eq('one-time', getPricePerMonth(5, 1, 99), 0);

// Month-end clamping: Jan 31 + 1 month is Feb 28, not Mar 3.
eq('clamp Jan31+1mo (2025)', toDateString(addMonthsClamped(parseDate('2025-01-31')!, 1)), '2025-02-28');
eq('clamp Jan31+1mo (2024 leap)', toDateString(addMonthsClamped(parseDate('2024-01-31')!, 1)), '2024-02-29');

// Monthly occurrences inside a range, anchored on the 31st.
const occ = getOccurrencesInRange(
  { next_payment: '2025-01-31', cycle: 3, frequency: 1, auto_renew: true },
  parseDate('2025-01-01')!, parseDate('2025-05-01')!,
).map(toDateString);
eq('monthly occurrences anchored on 31st', occ, ['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30']);

// A manual-renewal subscription contributes only its stored date.
const manual = getOccurrencesInRange(
  { next_payment: '2025-02-10', cycle: 3, frequency: 1, auto_renew: false },
  parseDate('2025-01-01')!, parseDate('2025-06-01')!,
).map(toDateString);
eq('manual renewal yields one date', manual, ['2025-02-10']);

// Weekly budget period anchored to a Monday.
const weekly = getActiveBudgetPeriod(parseDate('2025-03-13')!, 'weekly', '2025-03-03');
eq('weekly period start', toDateString(weekly.start), '2025-03-10');
eq('weekly period end', toDateString(weekly.end), '2025-03-16');

// Monthly period anchored to the 15th.
const monthly = getActiveBudgetPeriod(parseDate('2025-03-10')!, 'monthly', '2025-01-15');
eq('monthly period start', toDateString(monthly.start), '2025-02-15');
eq('monthly period end', toDateString(monthly.end), '2025-03-14');

// A stale date rolls forward past today, never landing in the past.
const rolled = rollForwardNextPayment('2020-01-15', 3, 1)!;
eq('rolled forward is in the future', rolled >= new Date(new Date().toDateString()), true);

// Progress is 0 for one-time purchases and bounded for recurring ones.
eq('one-time progress', getSubscriptionProgress(5, 1, '2025-01-01'), 0);
