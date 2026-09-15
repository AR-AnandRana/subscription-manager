'use client';

import { useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { updateProfile } from '@/lib/settings-actions';
import { BUDGET_PERIOD_TYPES, type BudgetPeriodType } from '@/lib/constants';

export function BudgetSettings() {
  const { profile, currencies, refresh } = useAppData();
  const symbol = currencies.find((currency) => currency.id === profile.main_currency)?.symbol ?? '';

  const [budget, setBudget] = useState(String(profile.budget));
  const [periodBudget, setPeriodBudget] = useState(String(profile.period_budget));
  const [periodType, setPeriodType] = useState<BudgetPeriodType>(profile.budget_period_type);
  const [anchorDate, setAnchorDate] = useState(profile.budget_period_anchor_date);

  async function saveMonthlyBudget() {
    try {
      await updateProfile({ budget: Number(budget) || 0 });
      showSuccessMessage('Budget saved');
      refresh();
    } catch {
      showErrorMessage('Could not save the budget');
    }
  }

  async function savePeriodBudget() {
    try {
      await updateProfile({
        period_budget: Number(periodBudget) || 0,
        budget_period_type: periodType,
        budget_period_anchor_date: anchorDate,
      });
      showSuccessMessage('Period budget saved');
      refresh();
    } catch {
      showErrorMessage('Could not save the period budget');
    }
  }

  return (
    <>
      <section className="account-section">
        <header>
          <h2>Monthly Budget</h2>
        </header>
        <div className="account-budget">
          <div className="form-group-inline">
            <label htmlFor="monthly_budget">{symbol}</label>
            <input
              type="number"
              id="monthly_budget"
              autoComplete="off"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="Budget"
            />
            <input type="submit" value="Save" id="saveMonthlyBudget" onClick={saveMonthlyBudget} />
          </div>
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-circle-info" /> Your monthly budget is compared against the total
              monthly cost of your active subscriptions.
            </p>
          </div>
        </div>
      </section>

      <section className="account-section">
        <header>
          <h2>Period Budget</h2>
        </header>
        <div className="account-budget">
          <div className="form-group-inline">
            <label htmlFor="period_budget">{symbol}</label>
            <input
              type="number"
              id="period_budget"
              autoComplete="off"
              value={periodBudget}
              onChange={(event) => setPeriodBudget(event.target.value)}
              placeholder="Budget"
            />
          </div>
          <div className="form-group-inline">
            <label htmlFor="budget_period_type">Budget period</label>
            <select
              id="budget_period_type"
              value={periodType}
              onChange={(event) => setPeriodType(event.target.value as BudgetPeriodType)}
            >
              {BUDGET_PERIOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group-inline">
            <label htmlFor="budget_period_anchor_date">Budget anchor date</label>
            <input
              type="date"
              id="budget_period_anchor_date"
              value={anchorDate}
              onChange={(event) => setAnchorDate(event.target.value)}
            />
            <input
              type="submit"
              value="Save"
              id="savePeriodBudget"
              className="period-budget-save"
              onClick={savePeriodBudget}
            />
          </div>
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-circle-info" /> A period budget follows your pay cycle rather than
              the calendar month. The anchor date sets when each period begins.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
