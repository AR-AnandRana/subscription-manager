'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { SubscriptionDetails } from '../SubscriptionDetails';
import { getMonthOccurrences } from '@/lib/stats';
import { convertPrice } from '@/lib/subscriptions';
import { today } from '@/lib/dates';
import type { SubscriptionView } from '@/lib/types';

const WEEK_DAYS_SUNDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_DAYS_MONDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Calendar() {
  const { views, settings, profile, formatPrice, rates } = useAppData();
  const now = today();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<SubscriptionView | null>(null);

  const paymentsByDay = useMemo(() => getMonthOccurrences(views, year, month), [views, year, month]);

  const weekDays = settings.week_starts_sunday ? WEEK_DAYS_SUNDAY : WEEK_DAYS_MONDAY;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
  // Offset of the 1st within the displayed week, given where the week starts.
  const leadingBlanks = settings.week_starts_sunday ? firstWeekday : (firstWeekday + 6) % 7;

  const { totalCostThisMonth, subscriptionsToPay, amountDueThisMonth } = useMemo(() => {
    let total = 0;
    let due = 0;
    const seen = new Set<number>();

    for (const [day, subscriptions] of paymentsByDay.entries()) {
      for (const subscription of subscriptions) {
        const price = convertPrice(subscription.price, subscription.currency_id, rates);
        total += price;
        seen.add(subscription.id);
        // "Amount due" only counts what is still ahead in the month.
        const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
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

  function resetToCurrentMonth() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

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
              {new Date(year, month, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="calendar-nav">
              <button className="button secondary-button" id="prev" onClick={() => step(-1)} title="Previous">
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button className="button secondary-button" id="next" onClick={() => step(1)} title="Next">
                <i className="fa-solid fa-chevron-right" />
              </button>
              {!isCurrentMonth && (
                <button className="button secondary-button" onClick={resetToCurrentMonth} title="Reset">
                  <i className="fa-solid fa-calendar-day" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="calendar">
          <div className="calendar-header">
            {weekDays.map((weekDay) => (
              <div className="calendar-cell" key={weekDay}>
                {weekDay}
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

        {overBudget > 0 && (
          <div className="over-budget">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>
              This month exceeds your budget <strong>({formatPrice(overBudget)})</strong>
            </span>
          </div>
        )}

        <div className="calendar-monthly-stats">
          <div className="calendar-monthly-stats-header">
            <h3>Statistics</h3>
          </div>
          <div className="statistics">
            <div className="statistic">
              <span>{subscriptionsToPay}</span>
              <div className="title">Active Subscriptions</div>
            </div>
            <div className="statistic">
              <span>{formatPrice(totalCostThisMonth)}</span>
              <div className="title">Total Cost</div>
            </div>
            <div className="statistic">
              <span>{formatPrice(amountDueThisMonth)}</span>
              <div className="title">Amount due this month</div>
            </div>
          </div>
        </div>
      </section>

      <SubscriptionDetails subscription={selected} onClose={() => setSelected(null)} />
    </>
  );
}
