'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { SubscriptionDetails } from '../SubscriptionDetails';
import { SubscriptionLogo } from '../SubscriptionLogo';
import { getActiveBudgetPeriod } from '@/lib/budget';
import { formatShortDate, endOfMonth, startOfMonth, today } from '@/lib/dates';
import { computeAmountNeededInPeriod } from '@/lib/subscriptions';
import {
  computeStats,
  getOverdueSubscriptions,
  getUpcomingCancellations,
  getUpcomingPayments,
} from '@/lib/stats';
import type { SubscriptionView } from '@/lib/types';

export function Dashboard() {
  const data = useAppData();
  const { profile, settings, views, formatPrice, rates, categories, paymentMethods, household } = data;
  const [selected, setSelected] = useState<SubscriptionView | null>(null);

  const stats = useMemo(
    () => computeStats({ subscriptions: views, profile, categories, paymentMethods, household, rates }),
    [views, profile, categories, paymentMethods, household, rates],
  );

  const overdue = useMemo(() => getOverdueSubscriptions(views), [views]);
  const upcoming = useMemo(
    () => getUpcomingPayments(views, settings.upcoming_payments_limit),
    [views, settings.upcoming_payments_limit],
  );
  const cancellations = useMemo(() => getUpcomingCancellations(views), [views]);

  const budgetPeriod = useMemo(
    () => getActiveBudgetPeriod(today(), profile.budget_period_type, profile.budget_period_anchor_date),
    [profile.budget_period_type, profile.budget_period_anchor_date],
  );

  const amountNeededThisPeriod = useMemo(
    () => computeAmountNeededInPeriod(data.subscriptions, budgetPeriod.end, rates),
    [data.subscriptions, budgetPeriod.end, rates],
  );

  // A monthly period anchored to the 1st is just the calendar month, so there
  // would be nothing distinct to show alongside the monthly budget.
  const now = today();
  const periodDiffersFromCalendarMonth =
    budgetPeriod.start.getTime() !== startOfMonth(now).getTime() ||
    budgetPeriod.end.getTime() !== endOfMonth(now).getTime();

  const budget = Number(profile.budget);
  const showMonthlyBudget = budget > 0;
  const budgetLeft = Math.max(0, budget - stats.totalCostPerMonth);
  const budgetUsed = budget > 0 ? Math.min(100, (stats.totalCostPerMonth / budget) * 100) : 0;
  const overBudget = stats.totalCostPerMonth > budget ? stats.totalCostPerMonth - budget : 0;

  const periodBudget = Number(profile.period_budget);
  const showPeriodBudget = periodDiffersFromCalendarMonth && periodBudget > 0;
  const periodBudgetLeft = Math.max(0, periodBudget - amountNeededThisPeriod);
  const periodBudgetUsed = periodBudget > 0 ? Math.min(100, (amountNeededThisPeriod / periodBudget) * 100) : 0;
  const periodOverBudget = amountNeededThisPeriod > periodBudget ? amountNeededThisPeriod - periodBudget : 0;

  const firstName = profile.firstname || profile.username;

  return (
    <>
      <section className="contain dashboard">
        <h1>Hello {firstName}</h1>

        {overdue.length > 0 && (
          <div className="overdue-subscriptions">
            <h2>Overdue Renewals</h2>
            <SubscriptionItemList
              subscriptions={overdue}
              onSelect={setSelected}
              dateOf={(s) => s.next_payment}
            />
          </div>
        )}

        <div className="upcoming-subscriptions">
          <h2>Upcoming Payments</h2>
          {upcoming.length === 0 ? (
            <div className="dashboard-subscriptions-container">
              <div className="dashboard-subscriptions-list">
                <p>No upcoming payments</p>
              </div>
            </div>
          ) : (
            <SubscriptionItemList
              subscriptions={upcoming}
              onSelect={setSelected}
              dateOf={(s) => s.next_payment}
            />
          )}
        </div>

        {cancellations.length > 0 && (
          <div className="cancellation-subscriptions">
            <h2>Upcoming Cancellations</h2>
            <SubscriptionItemList
              subscriptions={cancellations}
              onSelect={setSelected}
              dateOf={(s) => s.cancellation_date}
            />
          </div>
        )}

        {showMonthlyBudget && (
          <div className="budget-subscriptions">
            <h2>Monthly Budget</h2>
            <div className="dashboard-subscriptions-container">
              <div className="dashboard-subscriptions-list">
                <StatTile title="Monthly Cost" value={formatPrice(stats.totalCostPerMonth)} />
                <StatTile title="Budget" value={formatPrice(budget)} />
                <StatTile title="Budget Used" value={`${budgetUsed.toFixed(0)}%`} />
                <StatTile title="Budget Remaining" value={formatPrice(budgetLeft)} />
                {overBudget > 0 && <StatTile title="Over Budget" value={formatPrice(overBudget)} />}
              </div>
            </div>
          </div>
        )}

        {showPeriodBudget && (
          <div className="budget-subscriptions">
            <h2>Period Budget</h2>
            <div className="split-header">
              <p className="header-subtitle">Current period: {budgetPeriod.label}</p>
            </div>
            <div className="dashboard-subscriptions-container">
              <div className="dashboard-subscriptions-list">
                <StatTile title="Amount needed this period" value={formatPrice(amountNeededThisPeriod)} />
                <StatTile title="Budget" value={formatPrice(periodBudget)} />
                <StatTile title="Budget Used" value={`${periodBudgetUsed.toFixed(0)}%`} />
                <StatTile title="Budget Remaining" value={formatPrice(periodBudgetLeft)} />
                {periodOverBudget > 0 && (
                  <StatTile title="Over Budget" value={formatPrice(periodOverBudget)} />
                )}
              </div>
            </div>
          </div>
        )}

        <div className="current-subscriptions">
          <h2>Your Subscriptions</h2>
          <div className="dashboard-subscriptions-container">
            <div className="dashboard-subscriptions-list">
              <StatTile title="Active Subscriptions" value={String(stats.activeSubscriptions)} />
              <StatTile title="Monthly Cost" value={formatPrice(stats.totalCostPerMonth)} />
              <StatTile title="Yearly Cost" value={formatPrice(stats.totalCostPerYear)} />
            </div>
          </div>
        </div>

        {stats.inactiveSubscriptions > 0 && (
          <div className="savings-subscriptions">
            <h2>Your Savings</h2>
            <div className="dashboard-subscriptions-container">
              <div className="dashboard-subscriptions-list">
                <StatTile title="Inactive Subscriptions" value={String(stats.inactiveSubscriptions)} />
                <StatTile title="Monthly Savings" value={formatPrice(stats.totalSavingsPerMonth)} />
                <StatTile title="Yearly Savings" value={formatPrice(stats.totalSavingsPerMonth * 12)} />
              </div>
            </div>
          </div>
        )}
      </section>

      <SubscriptionDetails subscription={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function StatTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="subscription-item thin">
      <p className="subscription-item-title">{title}</p>
      <div className="subscription-item-info">
        <p className="subscription-item-value">{value}</p>
      </div>
    </div>
  );
}

function SubscriptionItemList({
  subscriptions,
  onSelect,
  dateOf,
}: {
  subscriptions: SubscriptionView[];
  onSelect: (subscription: SubscriptionView) => void;
  dateOf: (subscription: SubscriptionView) => string | null;
}) {
  const { formatPrice } = useAppData();

  return (
    <div className="dashboard-subscriptions-container">
      <div className="dashboard-subscriptions-list">
        {subscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="subscription-item"
            data-id={subscription.id}
            onClick={() => onSelect(subscription)}
          >
            {subscription.logo ? (
              <SubscriptionLogo
                logo={subscription.logo}
                logoVariant={subscription.logo_variant}
                logoTextColor={subscription.logo_text_color}
                name={subscription.name}
                className="subscription-item-logo"
              />
            ) : (
              <p className="subscription-item-title">{subscription.name}</p>
            )}
            <div className="subscription-item-info">
              <p className="subscription-item-date">{formatShortDate(dateOf(subscription))}</p>
              <p className="subscription-item-price">
                {formatPrice(subscription.price, subscription.currency_code)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
