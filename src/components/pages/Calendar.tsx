'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { SubscriptionDetails } from '../SubscriptionDetails';
import { IconExportIcal } from '../Icons';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { getMonthOccurrences } from '@/lib/stats';
import { convertPrice } from '@/lib/subscriptions';
import { today } from '@/lib/dates';
import type { SubscriptionView } from '@/lib/types';

const WEEK_DAY_KEYS_SUNDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEK_DAY_KEYS_MONDAY = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MONTH_KEYS = [
  'month-01', 'month-02', 'month-03', 'month-04', 'month-05', 'month-06',
  'month-07', 'month-08', 'month-09', 'month-10', 'month-11', 'month-12',
];

export function Calendar() {
  const { views, settings, profile, formatPrice, rates, t } = useAppData();
  const now = today();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<SubscriptionView | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const paymentsByDay = useMemo(() => getMonthOccurrences(views, year, month), [views, year, month]);

  const weekDayKeys = settings.week_starts_sunday ? WEEK_DAY_KEYS_SUNDAY : WEEK_DAY_KEYS_MONDAY;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
  // Offset of the 1st within the displayed week, given where the week starts.
  const leadingBlanks = settings.week_starts_sunday ? firstWeekday : (firstWeekday + 6) % 7;

  const { totalCostThisMonth, subscriptionsToPay, amountDueThisMonth } = useMemo(() => {
    let total = 0;
    let due = 0;
    const seen = new Set<number>();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    for (const [day, subscriptions] of paymentsByDay.entries()) {
      for (const subscription of subscriptions) {
        const price = convertPrice(subscription.price, subscription.currency_id, rates);
        total += price;
        seen.add(subscription.id);
        // "Amount due" only counts what is still ahead in the month.
        if (!isCurrentMonth || day >= now.getDate()) due += price;
      }
    }
    return { totalCostThisMonth: total, subscriptionsToPay: seen.size, amountDueThisMonth: due };
  }, [paymentsByDay, rates, year, month, now]);

  const budget = Number(profile.budget);
  const overBudget = budget > 0 && totalCostThisMonth > budget ? totalCostThisMonth - budget : 0;

  function step(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const feedUrl =
    typeof window === 'undefined' ? '' : `${window.location.origin}/api/ical?api_key=${profile.api_key}`;

  async function copyFeedUrl() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      showSuccessMessage(t('copy_to_clipboard'));
    } catch {
      showErrorMessage(t('error'));
    }
  }

  // Lay the month out as whole weeks so each row is a complete calendar-row.
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <>
      <section className="contain">
        <div className="split-header">
          <div className="calendar-title">
            <h2>
              {t(MONTH_KEYS[month])} {year}
            </h2>
            <div className="calendar-nav">
              <button
                className="button secondary-button"
                id="prev"
                onClick={() => step(-1)}
                disabled={isCurrentMonth}
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button className="button secondary-button" id="next" onClick={() => step(1)}>
                <i className="fa-solid fa-chevron-right" />
              </button>
              {!isCurrentMonth && (
                <button
                  className="button secondary-button"
                  onClick={() => {
                    setYear(now.getFullYear());
                    setMonth(now.getMonth());
                  }}
                  title={t('reset')}
                >
                  <i className="fa-solid fa-calendar-day" />
                </button>
              )}
            </div>
          </div>

          <button
            className="button secondary-button export-ical"
            onClick={() => setExportOpen(true)}
            title={t('export_icalendar')}
            aria-label={t('export_icalendar')}
          >
            <IconExportIcal />
          </button>

          <div
            id="subscriptions_calendar"
            className={`subscription-modal${exportOpen ? ' is-open' : ''}`}
          >
            <div className="modal-header">
              <h3>{t('export_icalendar')}</h3>
              <span className="fa-solid fa-xmark close-modal" onClick={() => setExportOpen(false)} />
            </div>
            <div className="form-group-inline">
              <input id="iCalendarUrl" type="text" value={feedUrl} readOnly />
              <button onClick={copyFeedUrl} className="button tiny">
                {t('copy_to_clipboard')}
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="calendar">
            <div className="calendar-header">
              {weekDayKeys.map((key) => (
                <div className="calendar-cell" key={key}>
                  {t(key)}
                </div>
              ))}
            </div>

            <div className="calendar-body">
              {weeks.map((week, weekIndex) => (
                <div className="week calendar-row" key={weekIndex}>
                  {week.map((day, dayIndex) => {
                    if (day === null) return <div className="calendar-cell empty" key={dayIndex} />;

                    const isToday =
                      day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                    const payments = paymentsByDay.get(day);

                    return (
                      <div className={`calendar-cell${isToday ? ' today' : ''}`} key={dayIndex}>
                        <span className="day">{day}</span>
                        {payments && payments.length > 0 && (
                          <div className="calendar-cell-content">
                            {payments.map((payment) => (
                              <div
                                className="calendar-event"
                                key={`${payment.id}-${day}`}
                                title={payment.name}
                                onClick={() => setSelected(payment)}
                              >
                                {payment.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {overBudget > 0 && (
          <div className="over-budget">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>
              {t('over_budget_warning')} <strong>({formatPrice(overBudget)})</strong>
            </span>
          </div>
        )}

        <div className="calendar-monthly-stats">
          <div className="calendar-monthly-stats-header">
            <h3>{t('stats')}</h3>
          </div>
          <div className="statistics">
            <div className="statistic">
              <span>{subscriptionsToPay}</span>
              <div className="title">{t('active_subscriptions')}</div>
            </div>
            <div className="statistic">
              <span>{formatPrice(totalCostThisMonth)}</span>
              <div className="title">{t('total_cost')}</div>
            </div>
            <div className="statistic">
              <span>{formatPrice(amountDueThisMonth)}</span>
              <div className="title">{t('amount_due')}</div>
            </div>
          </div>
        </div>
      </section>

      <SubscriptionDetails subscription={selected} onClose={() => setSelected(null)} />
    </>
  );
}
