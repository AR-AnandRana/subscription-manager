'use client';

import { useMemo, useRef, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { SubscriptionLogo } from '../SubscriptionLogo';
import { ApexChart, Graph } from '../ApexChart';
import { getActiveBudgetPeriod } from '@/lib/budget';
import { endOfMonth, startOfMonth, today } from '@/lib/dates';
import { computeAmountNeededInPeriod, getPricePerMonth } from '@/lib/subscriptions';
import { computeStats, getUpcomingCancellations, type SubscriptionHighlight } from '@/lib/stats';

/** Mirrors stats.php: a filterable header, then one section per group of stats. */
export function Stats() {
  const data = useAppData();
  const { profile, views, formatPrice, rates, categories, paymentMethods, household, t, mainCurrencyCode } =
    data;

  const [members, setMembers] = useState<number[]>([]);
  const [cats, setCats] = useState<number[]>([]);
  const [payments, setPayments] = useState<number[]>([]);

  const filtered = useMemo(
    () =>
      views.filter(
        (s) =>
          (members.length === 0 || members.includes(s.payer_user_id ?? -1)) &&
          (cats.length === 0 || cats.includes(s.category_id ?? -1)) &&
          (payments.length === 0 || payments.includes(s.payment_method_id ?? -1)),
      ),
    [views, members, cats, payments],
  );

  const stats = useMemo(
    () =>
      computeStats({ subscriptions: filtered, profile, categories, paymentMethods, household, rates }),
    [filtered, profile, categories, paymentMethods, household, rates],
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

  const cancellations = useMemo(() => getUpcomingCancellations(filtered), [filtered]);
  const potentialMonthlySavings = cancellations.reduce(
    (total, s) => total + getPricePerMonth(s.cycle, s.frequency, s.converted_price),
    0,
  );

  const budget = Number(profile.budget);
  const periodBudget = Number(profile.period_budget);
  const periodDiffers =
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

  const showProjection =
    stats.activeSubscriptions > 0 && (stats.heaviestMonth?.total ?? 0) > 0;
  const monthsOverBudget =
    budget > 0 && showProjection
      ? stats.projectionDataPoints.filter((point) => point.y > budget).length
      : null;

  const showBudgetSection = budget > 0 || (periodDiffers && periodBudget > 0);
  const showSplit =
    stats.memberCost.length > 1 ||
    stats.categoryCost.length > 1 ||
    stats.paymentMethodCost.length > 1 ||
    stats.cycleDataPoints.length > 1 ||
    stats.currencyDataPoints.length > 1 ||
    stats.histogramDataPoints.some((point) => point.y > 0);
  const showHistory =
    stats.totalLifetimeSpend > 0 ||
    stats.oldest !== null ||
    stats.averageSubscriptionAge !== null ||
    stats.lifetimeDataPoints.length >= 2 ||
    stats.newPerYearDataPoints.length >= 2;

  const money = (value: number) => formatPrice(value);
  const percent = (value: number) => `${value.toFixed(2)}%`;
  const subtitle = [
    ...members.map((id) => household.find((m) => m.id === id)?.name),
    ...cats.map((id) => categories.find((c) => c.id === id)?.name),
    ...payments.map((id) => paymentMethods.find((p) => p.id === id)?.name),
  ].filter(Boolean);

  return (
    <section className="contain">
      <div className="split-header">
        <h2>
          {t('general_statistics')}{' '}
          <span className="header-subtitle">{subtitle.length > 0 ? `(${subtitle.join(', ')})` : ''}</span>
        </h2>
        <StatsFilterMenu
          members={members}
          cats={cats}
          payments={payments}
          setMembers={setMembers}
          setCats={setCats}
          setPayments={setPayments}
        />
      </div>

      <section className="stats-section">
        <h2>{t('overview')}</h2>
        <div className="statistics">
          <Statistic value={String(stats.activeSubscriptions)} title={t('active_subscriptions')} />
          <Statistic value={money(stats.totalCostPerMonth)} title={t('monthly_cost')} />
          <Statistic value={money(stats.totalCostPerYear)} title={t('yearly_cost')} />
          {stats.totalCostPerMonth > 0 && (
            <Statistic value={money(stats.costPerDay)} title={t('cost_per_day')} />
          )}
          <Statistic value={money(stats.averageSubscriptionCost)} title={t('average_monthly')} />
          {stats.mostExpensive && (
            <Statistic
              value={money(stats.mostExpensive.price)}
              title={t('most_expensive')}
              highlight={stats.mostExpensive}
              short
            />
          )}
          {stats.cheapest && (
            <Statistic
              value={money(stats.cheapest.price)}
              title={t('cheapest_subscription')}
              highlight={stats.cheapest}
              short
            />
          )}
          <Statistic value={money(stats.amountDueThisMonth)} title={t('amount_due')} />
          {stats.manualRenewalsCount > 0 && (
            <Statistic value={String(stats.manualRenewalsCount)} title={t('manual_renewals')} />
          )}
        </div>
      </section>

      {showProjection && (
        <section className="stats-section">
          <h2>{t('trends_and_forecast')}</h2>
          <div className="statistics">
            {stats.heaviestMonth && (
              <Statistic
                value={money(stats.heaviestMonth.total)}
                title={t('heaviest_month')}
                subtitle={stats.heaviestMonth.label}
                short
              />
            )}
            {monthsOverBudget !== null && (
              <Statistic value={String(monthsOverBudget)} title={t('months_over_budget')} />
            )}
          </div>
          <div className="graphs">
            <Graph title={t('projected_cost')} wide>
              <ApexChart
                kind="bar"
                data={stats.projectionDataPoints}
                currency={mainCurrencyCode}
                threshold={budget > 0 ? budget : null}
              />
            </Graph>
          </div>
        </section>
      )}

      {showBudgetSection && (
        <section className="stats-section">
          <h2>{t('budget')}</h2>
          <div className="statistics">
            {budget > 0 && (
              <>
                <Statistic
                  value={percent(budgetUsed)}
                  title={`${t('monthly_budget')} - ${t('percentage_budget_used')}`}
                />
                <Statistic
                  value={money(budgetLeft)}
                  title={`${t('monthly_budget')} - ${t('budget_remaining')}`}
                />
                {overBudget > 0 && (
                  <Statistic
                    value={money(overBudget)}
                    title={`${t('monthly_budget')} - ${t('amount_over_budget')}`}
                  />
                )}
              </>
            )}
            {periodDiffers && periodBudget > 0 && (
              <>
                <Statistic
                  value={money(amountNeededThisPeriod)}
                  title={t('amount_needed_this_period')}
                  periodRange={budgetPeriod.label}
                />
                <Statistic
                  value={percent(periodBudgetUsed)}
                  title={`${t('period_budget')} - ${t('percentage_budget_used')}`}
                  periodRange={budgetPeriod.label}
                />
                <Statistic
                  value={money(periodBudgetLeft)}
                  title={`${t('period_budget')} - ${t('budget_remaining')}`}
                  periodRange={budgetPeriod.label}
                />
                {periodOverBudget > 0 && (
                  <Statistic
                    value={money(periodOverBudget)}
                    title={`${t('period_budget')} - ${t('amount_over_budget')}`}
                    periodRange={budgetPeriod.label}
                  />
                )}
              </>
            )}
          </div>
          <div className="graphs">
            {budget > 0 && (
              <Graph
                title={`${t('cost_vs_monthly_budget')} (${money(budget)})`}
                subHeader={t('monthly_cost')}
              >
                <ApexChart
                  kind="donut"
                  currency={mainCurrencyCode}
                  data={[
                    { label: t('budget_remaining'), y: budgetLeft },
                    { label: t('monthly_cost'), y: stats.totalCostPerMonth },
                  ]}
                />
              </Graph>
            )}
            {periodDiffers && periodBudget > 0 && (
              <Graph
                title={`${t('cost_vs_period_budget')} (${money(periodBudget)})`}
                subHeader={t('amount_needed_this_period')}
              >
                <ApexChart
                  kind="donut"
                  currency={mainCurrencyCode}
                  data={[
                    { label: t('budget_remaining'), y: periodBudgetLeft },
                    { label: t('amount_needed_this_period'), y: amountNeededThisPeriod },
                  ]}
                />
              </Graph>
            )}
          </div>
        </section>
      )}

      {showSplit && (
        <section className="stats-section">
          <h2>{t('split_views')}</h2>
          <div className="graphs">
            {stats.memberCost.length > 1 && (
              <Graph title={t('household_split')} subHeader={t('monthly_cost')}>
                <ApexChart kind="donut" data={stats.memberCost} currency={mainCurrencyCode} />
              </Graph>
            )}
            {stats.categoryCost.length > 1 && (
              <Graph title={t('category_split')} subHeader={t('monthly_cost')}>
                <ApexChart kind="donut" data={stats.categoryCost} currency={mainCurrencyCode} />
              </Graph>
            )}
            {stats.paymentMethodCost.length > 1 && (
              <Graph title={t('payment_method_split')} subHeader={t('monthly_cost')}>
                <ApexChart kind="donut" data={stats.paymentMethodCost} currency={mainCurrencyCode} />
              </Graph>
            )}
            {stats.cycleDataPoints.length > 1 && (
              <Graph title={t('billing_cycle_split')} subHeader={t('monthly_cost')}>
                <ApexChart kind="donut" data={stats.cycleDataPoints} currency={mainCurrencyCode} />
              </Graph>
            )}
            {stats.currencyDataPoints.length > 1 && (
              <Graph title={t('currency_split')} subHeader={t('monthly_cost')}>
                <ApexChart kind="donut" data={stats.currencyDataPoints} currency={mainCurrencyCode} />
              </Graph>
            )}
            {stats.histogramDataPoints.some((point) => point.y > 0) && (
              <Graph
                title={t('price_distribution')}
                subHeader={`${t('monthly_cost')}, ${mainCurrencyCode}`}
              >
                <ApexChart kind="bar" data={stats.histogramDataPoints} />
              </Graph>
            )}
          </div>
        </section>
      )}

      {showHistory && (
        <section className="stats-section">
          <h2>{t('history_and_lifetime')}</h2>
          <div className="statistics">
            {stats.totalLifetimeSpend > 0 && (
              <Statistic value={money(stats.totalLifetimeSpend)} title={t('all_time_spend')} />
            )}
            {stats.oldest && (
              <Statistic
                value={stats.oldest.years.toFixed(1)}
                title={t('oldest_subscription')}
                highlight={stats.oldest}
                short
              />
            )}
            {stats.averageSubscriptionAge !== null && (
              <Statistic
                value={stats.averageSubscriptionAge.toFixed(1)}
                title={t('average_subscription_age')}
              />
            )}
          </div>
          <div className="graphs">
            {stats.newPerYearDataPoints.length >= 2 && (
              <Graph title={t('new_subscriptions_per_year')}>
                <ApexChart kind="bar" data={stats.newPerYearDataPoints} />
              </Graph>
            )}
            {stats.lifetimeDataPoints.length >= 2 && (
              <Graph title={t('lifetime_spend')} subHeader={t('estimated_from_current_prices')}>
                <ApexChart
                  kind="horizontalBar"
                  data={stats.lifetimeDataPoints}
                  currency={mainCurrencyCode}
                />
              </Graph>
            )}
          </div>
        </section>
      )}

      {cancellations.length > 0 && (
        <section className="stats-section">
          <h2>{t('upcoming_cancellations')}</h2>
          <div className="statistics">
            <Statistic value={String(cancellations.length)} title={t('subscriptions')} />
            {potentialMonthlySavings > 0 && (
              <>
                <Statistic
                  value={money(potentialMonthlySavings)}
                  title={t('potential_monthly_savings')}
                />
                <Statistic
                  value={money(potentialMonthlySavings * 12)}
                  title={t('potential_yearly_savings')}
                />
              </>
            )}
          </div>
        </section>
      )}

      {stats.inactiveSubscriptions > 0 && (
        <section className="stats-section">
          <h2>{t('your_savings')}</h2>
          <div className="statistics">
            <Statistic value={String(stats.inactiveSubscriptions)} title={t('inactive_subscriptions')} />
            {stats.totalSavingsPerMonth > 0 && (
              <>
                <Statistic value={money(stats.totalSavingsPerMonth)} title={t('monthly_savings')} />
                <Statistic
                  value={money(stats.totalSavingsPerMonth * 12)}
                  title={t('yearly_savings')}
                />
              </>
            )}
          </div>
        </section>
      )}
    </section>
  );
}

function StatsFilterMenu({
  members,
  cats,
  payments,
  setMembers,
  setCats,
  setPayments,
}: {
  members: number[];
  cats: number[];
  payments: number[];
  setMembers: (value: number[]) => void;
  setCats: (value: number[]) => void;
  setPayments: (value: number[]) => void;
}) {
  const { household, categories, paymentMethods, views, t } = useAppData();
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const used = (pick: (id: number) => boolean) => views.some((s) => pick(s.id));
  const memberCounts = new Set(views.map((s) => s.payer_user_id));
  const categoryCounts = new Set(views.map((s) => s.category_id));
  const paymentCounts = new Set(views.filter((s) => !s.inactive).map((s) => s.payment_method_id));
  void used;

  const toggle = (list: number[], set: (value: number[]) => void, id: number) =>
    set(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

  const hasFilters = members.length > 0 || cats.length > 0 || payments.length > 0;

  return (
    <div className={`filtermenu${open ? ' is-open' : ''}`} ref={ref}>
      <button
        className="button secondary-button"
        id="filtermenu-button"
        title={t('filter')}
        onClick={() => setOpen((value) => !value)}
      >
        <i className="fa-solid fa-filter" />
      </button>
      <div className={`filtermenu-content${open ? ' is-open' : ''}`}>
        {household.length > 1 && (
          <div className="filtermenu-submenu">
            <div className="filter-title" onClick={() => setSubmenu(submenu === 'member' ? null : 'member')}>
              {t('member')}
            </div>
            <div
              className={`filtermenu-submenu-content${submenu === 'member' ? ' is-open' : ''}`}
              id="filter-member"
            >
              {household
                .filter((member) => memberCounts.has(member.id) || members.includes(member.id))
                .map((member) => (
                  <div
                    key={member.id}
                    className={`filter-item ${members.includes(member.id) ? 'selected' : ''}`}
                    onClick={() => toggle(members, setMembers, member.id)}
                  >
                    {member.name}
                  </div>
                ))}
            </div>
          </div>
        )}
        {categories.length > 1 && (
          <div className="filtermenu-submenu">
            <div
              className="filter-title"
              onClick={() => setSubmenu(submenu === 'category' ? null : 'category')}
            >
              {t('category')}
            </div>
            <div
              className={`filtermenu-submenu-content${submenu === 'category' ? ' is-open' : ''}`}
              id="filter-category"
            >
              {categories
                .filter((category) => categoryCounts.has(category.id) || cats.includes(category.id))
                .map((category) => (
                  <div
                    key={category.id}
                    className={`filter-item ${cats.includes(category.id) ? 'selected' : ''}`}
                    onClick={() => toggle(cats, setCats, category.id)}
                  >
                    {category.name}
                  </div>
                ))}
            </div>
          </div>
        )}
        {paymentMethods.length > 1 && (
          <div className="filtermenu-submenu">
            <div
              className="filter-title"
              onClick={() => setSubmenu(submenu === 'payment' ? null : 'payment')}
            >
              {t('payment_method')}
            </div>
            <div
              className={`filtermenu-submenu-content${submenu === 'payment' ? ' is-open' : ''}`}
              id="filter-payment"
            >
              {paymentMethods
                .filter((method) => paymentCounts.has(method.id) || payments.includes(method.id))
                .map((method) => (
                  <div
                    key={method.id}
                    className={`filter-item ${payments.includes(method.id) ? 'selected' : ''}`}
                    onClick={() => toggle(payments, setPayments, method.id)}
                  >
                    {method.name}
                  </div>
                ))}
            </div>
          </div>
        )}
        {hasFilters && (
          <div className="filtermenu-submenu">
            <div
              className="filter-title filter-clear"
              onClick={() => {
                setMembers([]);
                setCats([]);
                setPayments([]);
              }}
            >
              <i className="fa-solid fa-times-circle" /> {t('clear')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Statistic({
  value,
  title,
  subtitle,
  periodRange,
  highlight,
  short,
}: {
  value: string;
  title: string;
  subtitle?: string;
  periodRange?: string;
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
      {periodRange && <div className="period-range">{periodRange}</div>}
    </div>
  );
}
