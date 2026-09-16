'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { SubscriptionDetails } from '../SubscriptionDetails';
import { SubscriptionLogo } from '../SubscriptionLogo';
import { showErrorMessage } from '../Toast';
import { getActiveBudgetPeriod } from '@/lib/budget';
import { endOfMonth, formatShortDate, startOfMonth, today } from '@/lib/dates';
import { computeAmountNeededInPeriod } from '@/lib/subscriptions';
import { deleteAiRecommendation } from '@/lib/settings-actions';
import {
  computeStats,
  getOverdueSubscriptions,
  getUpcomingCancellations,
  getUpcomingPayments,
} from '@/lib/stats';
import type { SubscriptionView } from '@/lib/types';

export function Dashboard() {
  const data = useAppData();
  const {
    profile,
    settings,
    views,
    formatPrice,
    rates,
    categories,
    paymentMethods,
    household,
    aiRecommendations,
    t,
  } = data;
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

  const now = today();
  // A monthly period anchored to the 1st is just the calendar month, so there
  // would be nothing distinct to show alongside the monthly budget.
  const periodDiffersFromCalendarMonth =
    budgetPeriod.start.getTime() !== startOfMonth(now).getTime() ||
    budgetPeriod.end.getTime() !== endOfMonth(now).getTime();

  const budget = Number(profile.budget);
  const budgetLeft = Math.max(0, budget - stats.totalCostPerMonth);
  const budgetUsed = budget > 0 ? Math.min(100, (stats.totalCostPerMonth / budget) * 100) : 0;
  const overBudget = stats.totalCostPerMonth > budget ? stats.totalCostPerMonth - budget : 0;

  const periodBudget = Number(profile.period_budget);
  const showPeriodBudget = periodDiffersFromCalendarMonth && periodBudget > 0;
  const periodBudgetLeft = Math.max(0, periodBudget - amountNeededThisPeriod);
  const periodBudgetUsed =
    periodBudget > 0 ? Math.min(100, (amountNeededThisPeriod / periodBudget) * 100) : 0;
  const periodOverBudget =
    amountNeededThisPeriod > periodBudget ? amountNeededThisPeriod - periodBudget : 0;

  const firstName = profile.firstname || profile.username;
  const percent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <>
      <section className="contain dashboard">
        <h1>
          {t('hello')} {firstName}
        </h1>

        {overdue.length > 0 && (
          <div className="overdue-subscriptions">
            <h2>{t('overdue_renewals')}</h2>
            <SubscriptionItemList
              subscriptions={overdue}
              onSelect={setSelected}
              dateOf={(s) => s.next_payment}
            />
          </div>
        )}

        <div className="upcoming-subscriptions">
          <h2>{t('upcoming_payments')}</h2>
          {upcoming.length === 0 ? (
            <div className="dashboard-subscriptions-container">
              <div className="dashboard-subscriptions-list">
                <p>{t('no_upcoming_payments')}</p>
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
            <h2>{t('upcoming_cancellations')}</h2>
            <SubscriptionItemList
              subscriptions={cancellations}
              onSelect={setSelected}
              dateOf={(s) => s.cancellation_date}
            />
          </div>
        )}

        {aiRecommendations.length > 0 && <AiRecommendations />}

        <div className="budget-subscriptions">
          <h2>{t('monthly_budget')}</h2>
          <div className="dashboard-subscriptions-container">
            <div className="dashboard-subscriptions-list">
              <StatTile title={t('monthly_cost')} value={formatPrice(stats.totalCostPerMonth)} />
              {budget > 0 && (
                <>
                  <StatTile title={t('budget')} value={formatPrice(budget)} />
                  <StatTile title={t('budget_used')} value={percent(budgetUsed)} />
                  <StatTile title={t('budget_remaining')} value={formatPrice(budgetLeft)} />
                  {overBudget > 0 && (
                    <StatTile title={t('over_budget')} value={formatPrice(overBudget)} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {showPeriodBudget && (
          <div className="budget-subscriptions">
            <h2>{t('period_budget')}</h2>
            <p className="header-subtitle">
              {t('current_period')}: {budgetPeriod.label}
            </p>
            <div className="dashboard-subscriptions-container">
              <div className="dashboard-subscriptions-list">
                <StatTile
                  title={t('amount_needed_this_period')}
                  value={formatPrice(amountNeededThisPeriod)}
                />
                <StatTile title={t('budget')} value={formatPrice(periodBudget)} />
                <StatTile title={t('budget_used')} value={percent(periodBudgetUsed)} />
                <StatTile title={t('budget_remaining')} value={formatPrice(periodBudgetLeft)} />
                {periodOverBudget > 0 && (
                  <StatTile title={t('over_budget')} value={formatPrice(periodOverBudget)} />
                )}
              </div>
            </div>
          </div>
        )}

        {stats.activeSubscriptions > 0 && (
          <div className="current-subscriptions">
            <h2>{t('your_subscriptions')}</h2>
            <div className="dashboard-subscriptions-container">
              <div className="dashboard-subscriptions-list">
                <StatTile title={t('active_subscriptions')} value={String(stats.activeSubscriptions)} />
                <StatTile title={t('monthly_cost')} value={formatPrice(stats.totalCostPerMonth)} />
                <StatTile title={t('yearly_cost')} value={formatPrice(stats.totalCostPerYear)} />
              </div>
            </div>
          </div>
        )}

        {stats.inactiveSubscriptions > 0 && (
          <div className="savings-subscriptions">
            <h2>{t('your_savings')}</h2>
            <div className="dashboard-subscriptions-container">
              <div className="dashboard-subscriptions-list">
                <StatTile
                  title={t('inactive_subscriptions')}
                  value={String(stats.inactiveSubscriptions)}
                />
                {stats.totalSavingsPerMonth > 0 && (
                  <>
                    <StatTile
                      title={t('monthly_savings')}
                      value={formatPrice(stats.totalSavingsPerMonth)}
                    />
                    <StatTile
                      title={t('yearly_savings')}
                      value={formatPrice(stats.totalSavingsPerMonth * 12)}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <SubscriptionDetails subscription={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/** The collapsible recommendation list from index.php. */
function AiRecommendations() {
  const { aiRecommendations, t, refresh } = useAppData();
  const [open, setOpen] = useState<number | null>(null);

  async function remove(id: number) {
    try {
      await deleteAiRecommendation(id);
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  return (
    <div className="ai-recommendations">
      <h2>{t('ai_recommendations')}</h2>
      <div className="ai-recommendations-container">
        <ul className="ai-recommendations-list">
          {aiRecommendations.map((recommendation, index) => (
            <li
              className={`ai-recommendation-item${open === recommendation.id ? ' is-open' : ''}`}
              data-id={recommendation.id}
              key={recommendation.id}
            >
              <div
                className="ai-recommendation-header"
                onClick={() => setOpen(open === recommendation.id ? null : recommendation.id)}
              >
                <h3>
                  <span>{index + 1}. </span>
                  {recommendation.title}
                </h3>
                <span className="item-arrow-down fa fa-caret-down" />
              </div>
              <p className="collapsible" style={open === recommendation.id ? { display: 'block' } : undefined}>
                {recommendation.description}
              </p>
              <p className="ai-recommendation-savings">
                {recommendation.savings}
                <span>
                  <a
                    href="#"
                    className="delete-ai-recommendation"
                    title={t('delete')}
                    onClick={(event) => {
                      event.preventDefault();
                      void remove(recommendation.id);
                    }}
                  >
                    <i className="fa fa-trash" />
                  </a>
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
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
