'use client';

import { useMemo } from 'react';
import { useAppData } from '../AppDataProvider';
import { SubscriptionLogo } from '../SubscriptionLogo';
import { BarGraph, PieGraph } from '../Charts';
import { getActiveBudgetPeriod } from '@/lib/budget';
import { endOfMonth, startOfMonth, today } from '@/lib/dates';
import { computeAmountNeededInPeriod } from '@/lib/subscriptions';
import { computeStats, type SubscriptionHighlight } from '@/lib/stats';

export function Stats() {
  const data = useAppData();
  const { profile, views, formatPrice, rates, categories, paymentMethods, household } = data;

  const stats = useMemo(
    () => computeStats({ subscriptions: views, profile, categories, paymentMethods, household, rates }),
    [views, profile, categories, paymentMethods, household, rates],
  );

  const now = today();
  const budgetPeriod = useMemo(
    () => getActiveBudgetPeriod(now, profile.budget_period_type, profile.budget_period_anchor_date),
    [now, profile.budget_period_type, profile.budget_period_anchor_date],
  );

  const amountNeededThisPeriod = useMemo(
    () => computeAmountNeededInPeriod(data.subscriptions, budgetPeriod.end, rates),
    [data.subscriptions, budgetPeriod.end, rates],
  );

  const budget = Number(profile.budget);
  const periodBudget = Number(profile.period_budget);
  const periodDiffersFromCalendarMonth =
    budgetPeriod.start.getTime() !== startOfMonth(now).getTime() ||
    budgetPeriod.end.getTime() !== endOfMonth(now).getTime();

  const budgetUsed = budget > 0 ? Math.min(100, (stats.totalCostPerMonth / budget) * 100) : 0;
  const budgetLeft = Math.max(0, budget - stats.totalCostPerMonth);
  const overBudget = stats.totalCostPerMonth > budget ? stats.totalCostPerMonth - budget : 0;

  const periodBudgetUsed =
    periodBudget > 0 ? Math.min(100, (amountNeededThisPeriod / periodBudget) * 100) : 0;
  const periodBudgetLeft = Math.max(0, periodBudget - amountNeededThisPeriod);
  const periodOverBudget =
    amountNeededThisPeriod > periodBudget ? amountNeededThisPeriod - periodBudget : 0;

  const monthsOverBudget =
    budget > 0 && stats.heaviestMonth && stats.heaviestMonth.total > 0
      ? stats.projectionDataPoints.filter((point) => point.y > budget).length
      : null;

  const showProjection = stats.activeSubscriptions > 0 && (stats.heaviestMonth?.total ?? 0) > 0;
  const showBudgetSection = budget > 0 || (periodDiffersFromCalendarMonth && periodBudget > 0);
  const money = (value: number) => formatPrice(value);

  return (
    <section className="contain">
      <section className="stats-section">
        <h2>Overview</h2>
        <div className="statistics">
          <Statistic value={String(stats.activeSubscriptions)} title="Active Subscriptions" />
          <Statistic value={money(stats.totalCostPerMonth)} title="Monthly Cost" />
          <Statistic value={money(stats.totalCostPerYear)} title="Yearly Cost" />
          {stats.totalCostPerMonth > 0 && (
            <Statistic value={money(stats.costPerDay)} title="Cost per Day" />
          )}
          <Statistic value={money(stats.averageSubscriptionCost)} title="Average Monthly Subscription Cost" />
          {stats.mostExpensive && (
            <Statistic
              value={money(stats.mostExpensive.price)}
              title="Most Expensive Subscription Cost"
              highlight={stats.mostExpensive}
              short
            />
          )}
          {stats.cheapest && (
            <Statistic
              value={money(stats.cheapest.price)}
              title="Cheapest Subscription Cost"
              highlight={stats.cheapest}
              short
            />
          )}
          <Statistic value={money(stats.amountDueThisMonth)} title="Amount due this month" />
          {stats.manualRenewalsCount > 0 && (
            <Statistic value={String(stats.manualRenewalsCount)} title="Manual Renewals" />
          )}
        </div>
      </section>

      {showProjection && (
        <section className="stats-section">
          <h2>Trends &amp; Forecast</h2>
          <div className="statistics">
            {stats.heaviestMonth && (
              <Statistic
                value={money(stats.heaviestMonth.total)}
                title="Heaviest Upcoming Month"
                subtitle={stats.heaviestMonth.label}
                short
              />
            )}
            {monthsOverBudget !== null && (
              <Statistic value={String(monthsOverBudget)} title="Months Over Budget" />
            )}
          </div>
          <div className="graphs">
            <BarGraph
              title="Projected Cost (Next 12 Months)"
              data={stats.projectionDataPoints}
              wide
              formatValue={money}
            />
          </div>
        </section>
      )}

      {showBudgetSection && (
        <section className="stats-section">
          <h2>Budget</h2>
          <div className="statistics">
            {budget > 0 && (
              <>
                <Statistic value={`${budgetUsed.toFixed(2)}%`} title="Monthly Budget - Percentage used" />
                <Statistic value={money(budgetLeft)} title="Monthly Budget - Budget remaining" />
                {overBudget > 0 && (
                  <Statistic value={money(overBudget)} title="Monthly Budget - Amount over budget" />
                )}
              </>
            )}
            {periodDiffersFromCalendarMonth && periodBudget > 0 && (
              <>
                <Statistic value={money(amountNeededThisPeriod)} title="Amount needed this period" />
                <Statistic
                  value={`${periodBudgetUsed.toFixed(2)}%`}
                  title="Period Budget - Percentage used"
                />
                <Statistic value={money(periodBudgetLeft)} title="Period Budget - Budget remaining" />
                {periodOverBudget > 0 && (
                  <Statistic value={money(periodOverBudget)} title="Period Budget - Amount over budget" />
                )}
              </>
            )}
          </div>
        </section>
      )}

      <section className="stats-section">
        <h2>Split Views</h2>
        <div className="graphs">
          {household.length > 1 && stats.memberCost.length > 0 && (
            <PieGraph
              title="Household Split"
              subHeader="Monthly cost"
              data={stats.memberCost}
              formatValue={money}
            />
          )}
          {stats.categoryCost.length > 1 && (
            <PieGraph
              title="Category Split"
              subHeader="Monthly cost"
              data={stats.categoryCost}
              formatValue={money}
            />
          )}
          {stats.paymentMethodCount.length > 1 && (
            <PieGraph
              title="Payment Method Split"
              subHeader="Subscriptions"
              data={stats.paymentMethodCount}
            />
          )}
          {stats.cycleDataPoints.length > 1 && (
            <PieGraph
              title="Billing Cycle Split"
              subHeader="Monthly cost"
              data={stats.cycleDataPoints}
              formatValue={money}
            />
          )}
          {stats.currencyDataPoints.length > 1 && (
            <PieGraph
              title="Currency Split"
              subHeader="Monthly cost"
              data={stats.currencyDataPoints}
              formatValue={money}
            />
          )}
          {stats.histogramDataPoints.some((point) => point.y > 0) && (
            <BarGraph title="Price Distribution" subHeader="Monthly cost" data={stats.histogramDataPoints} />
          )}
        </div>
      </section>

      {(stats.lifetimeDataPoints.length >= 2 || stats.newPerYearDataPoints.length >= 2) && (
        <section className="stats-section">
          <h2>History &amp; Lifetime</h2>
          <div className="statistics">
            {stats.totalLifetimeSpend > 0 && (
              <Statistic value={money(stats.totalLifetimeSpend)} title="All-time Spend" />
            )}
            {stats.oldest && (
              <Statistic
                value={`${stats.oldest.years.toFixed(1)} yrs`}
                title="Longest Running"
                highlight={stats.oldest}
                short
              />
            )}
            {stats.averageSubscriptionAge !== null && (
              <Statistic
                value={`${stats.averageSubscriptionAge.toFixed(1)} yrs`}
                title="Average Subscription Age"
              />
            )}
          </div>
          <div className="graphs">
            {stats.lifetimeDataPoints.length >= 2 && (
              <BarGraph
                title="Lifetime Spend by Subscription"
                subHeader="Top 10"
                data={stats.lifetimeDataPoints}
                wide
                formatValue={money}
              />
            )}
            {stats.newPerYearDataPoints.length >= 2 && (
              <BarGraph
                title="New Subscriptions per Year"
                data={stats.newPerYearDataPoints}
                wide
              />
            )}
          </div>
        </section>
      )}
    </section>
  );
}

function Statistic({
  value,
  title,
  subtitle,
  highlight,
  short,
}: {
  value: string;
  title: string;
  subtitle?: string;
  highlight?: SubscriptionHighlight;
  short?: boolean;
}) {
  return (
    <div className={`statistic${short ? ' short' : ''}`}>
      <span>{value}</span>
      <div className="title">{title}</div>
      {highlight &&
        (highlight.logo ? (
          <div className="subtitle">
            <SubscriptionLogo
              logo={highlight.logo}
              logoVariant={highlight.logo_variant}
              logoTextColor={highlight.logo_text_color}
              name={highlight.name}
            />
          </div>
        ) : (
          <div className="subtitle">{highlight.name}</div>
        ))}
      {subtitle && <div className="subtitle capitalize">{subtitle}</div>}
    </div>
  );
}
