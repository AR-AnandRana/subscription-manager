'use client';

import { useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { updateProfile } from '@/lib/settings-actions';
import { BUDGET_PERIOD_TYPES, type BudgetPeriodType } from '@/lib/constants';

/** The Monthly Budget and Period Budget sections from settings.php. */
export function BudgetSettings() {
  const { profile, currencies, t, refresh } = useAppData();
  const symbol = currencies.find((currency) => currency.id === profile.main_currency)?.symbol ?? '';

  const [budget, setBudget] = useState(String(profile.budget));
  const [periodBudget, setPeriodBudget] = useState(String(profile.period_budget));
  const [periodType, setPeriodType] = useState<BudgetPeriodType>(profile.budget_period_type);
  const [anchorDate, setAnchorDate] = useState(profile.budget_period_anchor_date);

  async function saveMonthlyBudget() {
    try {
      await updateProfile({ budget: Number(budget) || 0 });
      showSuccessMessage(t('save'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  async function savePeriodBudget() {
    try {
      await updateProfile({
        period_budget: Number(periodBudget) || 0,
        budget_period_type: periodType,
        budget_period_anchor_date: anchorDate,
      });
      showSuccessMessage(t('save'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  return (
    <>
      <section className="account-section">
        <header>
          <h2>{t('monthly_budget')}</h2>
        </header>
        <div className="account-budget">
          <div className="form-group-inline">
            <label htmlFor="monthly_budget">{symbol}</label>
            <input
              type="number"
              id="monthly_budget"
              name="monthly_budget"
              autoComplete="off"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="Budget"
            />
            <input type="submit" value={t('save')} id="saveMonthlyBudget" onClick={saveMonthlyBudget} />
          </div>
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-circle-info" /> {t('monthly_budget_info')}
            </p>
          </div>
        </div>
      </section>

      <section className="account-section">
        <header>
          <h2>{t('period_budget')}</h2>
        </header>
        <div className="account-budget">
          <div className="form-group-inline">
            <label htmlFor="period_budget">{symbol}</label>
            <input
              type="number"
              id="period_budget"
              name="period_budget"
              autoComplete="off"
              value={periodBudget}
              onChange={(event) => setPeriodBudget(event.target.value)}
              placeholder="Budget"
            />
          </div>
          <div className="form-group-inline period-budget-controls">
            <div className="period-budget-field">
              <label htmlFor="budget_period_type">{t('budget_period')}</label>
              <select
                id="budget_period_type"
                value={periodType}
                onChange={(event) => setPeriodType(event.target.value as BudgetPeriodType)}
              >
                {BUDGET_PERIOD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="period-budget-field">
              <label htmlFor="budget_period_anchor_date">{t('budget_anchor_date')}</label>
              <input
                type="date"
                id="budget_period_anchor_date"
                value={anchorDate}
                onChange={(event) => setAnchorDate(event.target.value)}
              />
            </div>
            <input
              type="submit"
              value={t('save')}
              id="savePeriodBudget"
              className="period-budget-save"
              onClick={savePeriodBudget}
            />
          </div>
          <div className="settings-notes">
            <p>
              <i className="fa-solid fa-circle-info" /> {t('period_budget_info')}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
