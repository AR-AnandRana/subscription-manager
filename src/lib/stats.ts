/**
 * Statistics engine, ported from includes/stats_calculations.php and
 * includes/stats_extra_calculations.php.
 *
 * Everything is expressed in the user's main currency. Lifetime figures assume
 * current prices, as upstream notes.
 */

import { CYCLE_ONE_TIME } from './constants';
import { addDays, diffInDays, endOfMonth, parseDate, today } from './dates';
import { convertPrice, getOccurrencesInRange, getPricePerMonth, shiftOccurrence } from './subscriptions';
import type { Category, HouseholdMember, PaymentMethod, Profile, SubscriptionView } from './types';

export interface DataPoint {
  label: string;
  y: number;
}

export interface SubscriptionHighlight {
  price: number;
  name: string;
  logo: string | null;
  logo_variant: string | null;
  logo_text_color: string | null;
}

export interface Stats {
  activeSubscriptions: number;
  inactiveSubscriptions: number;
  totalCostPerMonth: number;
  totalCostPerYear: number;
  averageSubscriptionCost: number;
  amountDueThisMonth: number;
  totalSavingsPerMonth: number;
  costPerDay: number;
  manualRenewalsCount: number;
  mostExpensive: SubscriptionHighlight | null;
  cheapest: SubscriptionHighlight | null;
  oldest: (SubscriptionHighlight & { years: number }) | null;
  averageSubscriptionAge: number | null;
  totalLifetimeSpend: number;
  heaviestMonth: { label: string; total: number } | null;
  projectionDataPoints: DataPoint[];
  categoryCost: DataPoint[];
  memberCost: DataPoint[];
  /** Monthly cost per payment method — what the split chart plots. */
  paymentMethodCost: DataPoint[];
  /** Active subscriptions per payment method, for the filter menu counts. */
  paymentMethodCount: DataPoint[];
  cycleDataPoints: DataPoint[];
  currencyDataPoints: DataPoint[];
  histogramDataPoints: DataPoint[];
  lifetimeDataPoints: DataPoint[];
  newPerYearDataPoints: DataPoint[];
  usesMultipleCurrencies: boolean;
}

interface StatsInput {
  subscriptions: SubscriptionView[];
  profile: Profile;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  household: HouseholdMember[];
  rates: Map<number, number>;
}

const CYCLE_NAMES: Record<number, string> = { 1: 'Daily', 2: 'Weekly', 3: 'Monthly', 4: 'Yearly' };

export function computeStats({
  subscriptions,
  profile,
  categories,
  paymentMethods,
  household,
  rates,
}: StatsInput): Stats {
  const now = today();
  const monthEnd = endOfMonth(now);

  let activeSubscriptions = 0;
  let inactiveSubscriptions = 0;
  let totalCostPerMonth = 0;
  let amountDueThisMonth = 0;
  let totalSavingsPerMonth = 0;
  let totalCostsInReplacementsPerMonth = 0;
  let usesMultipleCurrencies = false;

  let mostExpensive: SubscriptionHighlight | null = null;
  let cheapest: SubscriptionHighlight | null = null;
  let oldest: (SubscriptionHighlight & { years: number }) | null = null;

  const categoryCost = new Map<number, number>(categories.map((c) => [c.id, 0]));
  const memberCost = new Map<number, number>(household.map((m) => [m.id, 0]));
  const paymentCount = new Map<number, number>(paymentMethods.filter((p) => p.enabled).map((p) => [p.id, 0]));

  const paymentCost = new Map<number, number>(paymentMethods.filter((p) => p.enabled).map((p) => [p.id, 0]));
  const cycleSpend = new Map<number, number>();
  const currencySpend = new Map<string, number>();
  const activeMonthlyPrices: number[] = [];
  const lifetimeSpends: DataPoint[] = [];
  const subscriptionAges: number[] = [];
  const newPerYear = new Map<string, number>();
  const countedReplacements = new Set<number>();
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  let manualRenewalsCount = 0;
  let totalLifetimeSpend = 0;

  // 12 projection buckets, starting next month.
  const projectionStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const projectionEnd = new Date(projectionStart.getFullYear(), projectionStart.getMonth() + 12, 1);
  const projectionBuckets = new Map<string, { label: string; total: number }>();
  for (let i = 0; i < 12; i += 1) {
    const bucketDate = new Date(projectionStart.getFullYear(), projectionStart.getMonth() + i, 1);
    projectionBuckets.set(monthKey(bucketDate), {
      label: bucketDate.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      total: 0,
    });
  }

  for (const subscription of subscriptions) {
    const { cycle, frequency } = subscription;
    if (subscription.currency_id !== profile.main_currency) usesMultipleCurrencies = true;

    const converted = subscription.converted_price;
    const monthlyPrice = subscription.monthly_price;

    // New subscriptions per year counts every subscription, active or not.
    const startDate = parseDate(subscription.start_date);
    if (startDate) {
      const year = String(startDate.getFullYear());
      newPerYear.set(year, (newPerYear.get(year) ?? 0) + 1);
    }

    if (subscription.inactive) {
      inactiveSubscriptions += 1;
      totalSavingsPerMonth += monthlyPrice;

      // A replacement only offsets the saving once, however many subscriptions
      // were replaced by it.
      const replacementId = subscription.replacement_subscription_id;
      if (replacementId && !countedReplacements.has(replacementId)) {
        countedReplacements.add(replacementId);
        const replacement = byId.get(replacementId);
        if (replacement) {
          totalCostsInReplacementsPerMonth += getPricePerMonth(
            replacement.cycle,
            replacement.frequency,
            convertPrice(Number(replacement.price), replacement.currency_id, rates),
          );
        }
      }
      continue;
    }

    if (subscription.category_id != null && categoryCost.has(subscription.category_id)) {
      categoryCost.set(subscription.category_id, categoryCost.get(subscription.category_id)! + monthlyPrice);
    }
    if (subscription.payer_user_id != null && memberCost.has(subscription.payer_user_id)) {
      memberCost.set(subscription.payer_user_id, memberCost.get(subscription.payer_user_id)! + monthlyPrice);
    }

    totalCostPerMonth += monthlyPrice;

    if (!mostExpensive || monthlyPrice > mostExpensive.price) {
      mostExpensive = highlight(subscription, monthlyPrice);
    }

    if (monthlyPrice > 0) {
      if (subscription.payment_method_id != null && paymentCost.has(subscription.payment_method_id)) {
        paymentCost.set(
          subscription.payment_method_id,
          paymentCost.get(subscription.payment_method_id)! + monthlyPrice,
        );
      }
      cycleSpend.set(cycle, (cycleSpend.get(cycle) ?? 0) + monthlyPrice);
      currencySpend.set(subscription.currency_code, (currencySpend.get(subscription.currency_code) ?? 0) + monthlyPrice);
    }

    if (cycle === CYCLE_ONE_TIME) continue;

    activeSubscriptions += 1;
    if (subscription.payment_method_id != null && paymentCount.has(subscription.payment_method_id)) {
      paymentCount.set(subscription.payment_method_id, paymentCount.get(subscription.payment_method_id)! + 1);
    }

    activeMonthlyPrices.push(monthlyPrice);
    if (!cheapest || monthlyPrice < cheapest.price) cheapest = highlight(subscription, monthlyPrice);
    if (!subscription.auto_renew) manualRenewalsCount += 1;

    // Amount due this month: payments falling between today and month end.
    const nextPaymentDate = parseDate(subscription.next_payment);
    if (nextPaymentDate && nextPaymentDate >= now && nextPaymentDate <= monthEnd) {
      let timesToPay = 1;
      const daysRemaining = diffInDays(monthEnd, nextPaymentDate) + 1;
      if (cycle === 1) timesToPay = daysRemaining / frequency;
      if (cycle === 2) timesToPay = Math.ceil(daysRemaining / 7) / frequency;
      amountDueThisMonth += converted * timesToPay;
    }

    // Projection: walk renewals forward into the buckets.
    if (nextPaymentDate) {
      let paymentDate: Date | null = nextPaymentDate;
      let safety = 0;
      while (paymentDate && paymentDate < projectionEnd && safety < 1000) {
        if (paymentDate >= projectionStart) {
          const bucket = projectionBuckets.get(monthKey(paymentDate));
          if (bucket) bucket.total += converted;
        }
        paymentDate = shiftOccurrence(paymentDate, cycle, frequency, nextPaymentDate, 1);
        safety += 1;
      }
    }

    // Lifetime spend and age.
    if (startDate && startDate <= now) {
      const daysActive = diffInDays(startDate, now);
      const ageYears = daysActive / 365.25;
      subscriptionAges.push(ageYears);
      const lifetimeSpend = monthlyPrice * (daysActive / 30.44);
      totalLifetimeSpend += lifetimeSpend;
      lifetimeSpends.push({ label: subscription.name, y: round2(lifetimeSpend) });

      if (!oldest || ageYears > oldest.years) {
        oldest = { ...highlight(subscription, monthlyPrice), years: ageYears };
      }
    }
  }

  totalSavingsPerMonth -= totalCostsInReplacementsPerMonth;

  const totalCostPerYear = activeSubscriptions > 0 ? totalCostPerMonth * 12 : 0;
  const averageSubscriptionCost = activeSubscriptions > 0 ? totalCostPerMonth / activeSubscriptions : 0;
  const costPerDay = totalCostPerMonth > 0 ? (totalCostPerMonth * 12) / 365.25 : 0;

  const projectionDataPoints: DataPoint[] = [];
  let heaviestMonth: { label: string; total: number } | null = null;
  for (const bucket of projectionBuckets.values()) {
    const total = round2(bucket.total);
    projectionDataPoints.push({ label: bucket.label, y: total });
    if (!heaviestMonth || total > heaviestMonth.total) heaviestMonth = { label: bucket.label, total };
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const memberById = new Map(household.map((m) => [m.id, m]));
  const paymentById = new Map(paymentMethods.map((p) => [p.id, p]));

  return {
    activeSubscriptions,
    inactiveSubscriptions,
    totalCostPerMonth,
    totalCostPerYear,
    averageSubscriptionCost,
    amountDueThisMonth,
    totalSavingsPerMonth,
    costPerDay,
    manualRenewalsCount,
    mostExpensive,
    cheapest,
    oldest,
    averageSubscriptionAge:
      subscriptionAges.length > 0
        ? subscriptionAges.reduce((a, b) => a + b, 0) / subscriptionAges.length
        : null,
    totalLifetimeSpend,
    heaviestMonth,
    projectionDataPoints,
    categoryCost: toSortedPoints(categoryCost, (id) => categoryById.get(id)?.name ?? ''),
    memberCost: toSortedPoints(memberCost, (id) => memberById.get(id)?.name ?? ''),
    paymentMethodCost: toSortedPoints(paymentCost, (id) => paymentById.get(id)?.name ?? ''),
    paymentMethodCount: toSortedPoints(paymentCount, (id) => paymentById.get(id)?.name ?? ''),
    cycleDataPoints: buildCyclePoints(cycleSpend),
    currencyDataPoints: buildCurrencyPoints(currencySpend),
    histogramDataPoints: buildHistogram(activeMonthlyPrices),
    lifetimeDataPoints: lifetimeSpends.sort((a, b) => b.y - a.y).slice(0, 10),
    newPerYearDataPoints: [...newPerYear.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, count]) => ({ label: year, y: count })),
    usesMultipleCurrencies,
  };
}

function highlight(subscription: SubscriptionView, price: number): SubscriptionHighlight {
  return {
    price,
    name: subscription.name,
    logo: subscription.logo,
    logo_variant: subscription.logo_variant,
    logo_text_color: subscription.logo_text_color,
  };
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toSortedPoints(map: Map<number, number>, nameOf: (id: number) => string): DataPoint[] {
  return [...map.entries()]
    .filter(([, value]) => value > 0)
    .map(([id, value]) => ({ label: nameOf(id), y: round2(value) }))
    .sort((a, b) => b.y - a.y);
}

function buildCyclePoints(cycleSpend: Map<number, number>): DataPoint[] {
  return [...cycleSpend.entries()]
    .filter(([cycle, spend]) => cycle !== CYCLE_ONE_TIME && spend > 0)
    .map(([cycle, spend]) => ({ label: CYCLE_NAMES[cycle] ?? '', y: round2(spend) }))
    .sort((a, b) => b.y - a.y);
}

function buildCurrencyPoints(currencySpend: Map<string, number>): DataPoint[] {
  return [...currencySpend.entries()]
    .filter(([, spend]) => spend > 0)
    .map(([code, spend]) => ({ label: code, y: round2(spend) }))
    .sort((a, b) => b.y - a.y);
}

/** Price distribution across the same buckets upstream uses. */
function buildHistogram(prices: number[]): DataPoint[] {
  const boundaries = [5, 10, 20, 50];
  const counts = new Array(boundaries.length + 1).fill(0);

  for (const price of prices) {
    let index = boundaries.length;
    for (let i = 0; i < boundaries.length; i += 1) {
      if (price < boundaries[i]) {
        index = i;
        break;
      }
    }
    counts[index] += 1;
  }

  const points: DataPoint[] = [];
  let previous = 0;
  boundaries.forEach((boundary, index) => {
    points.push({ label: `${previous}–${boundary}`, y: counts[index] });
    previous = boundary;
  });
  points.push({ label: `${previous}+`, y: counts[boundaries.length] });
  return points;
}

/** Subscriptions whose next payment already passed and which never auto-renew. */
export function getOverdueSubscriptions(subscriptions: SubscriptionView[]): SubscriptionView[] {
  const now = today();
  return subscriptions
    .filter(
      (s) =>
        !s.inactive &&
        !s.auto_renew &&
        s.cycle !== CYCLE_ONE_TIME &&
        s.next_payment &&
        parseDate(s.next_payment)! < now,
    )
    .sort((a, b) => (a.next_payment ?? '').localeCompare(b.next_payment ?? ''));
}

export function getUpcomingPayments(subscriptions: SubscriptionView[], limit: number): SubscriptionView[] {
  const now = today();
  return subscriptions
    .filter(
      (s) =>
        !s.inactive &&
        s.cycle !== CYCLE_ONE_TIME &&
        s.next_payment &&
        parseDate(s.next_payment)! >= now,
    )
    .sort((a, b) => (a.next_payment ?? '').localeCompare(b.next_payment ?? ''))
    .slice(0, limit);
}

export function getUpcomingCancellations(subscriptions: SubscriptionView[]): SubscriptionView[] {
  const now = today();
  return subscriptions
    .filter(
      (s) =>
        !s.inactive &&
        s.cycle !== CYCLE_ONE_TIME &&
        s.cancellation_date &&
        parseDate(s.cancellation_date)! >= now,
    )
    .sort((a, b) => (a.cancellation_date ?? '').localeCompare(b.cancellation_date ?? ''));
}

/** Payments falling on each day of a month, for the calendar view. */
export function getMonthOccurrences(
  subscriptions: SubscriptionView[],
  year: number,
  month: number,
): Map<number, SubscriptionView[]> {
  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 1, 0);
  const byDay = new Map<number, SubscriptionView[]>();

  for (const subscription of subscriptions) {
    if (subscription.inactive) continue;
    for (const occurrence of getOccurrencesInRange(subscription, rangeStart, rangeEnd)) {
      const day = occurrence.getDate();
      const list = byDay.get(day) ?? [];
      list.push(subscription);
      byDay.set(day, list);
    }
  }
  return byDay;
}

export { addDays };
