'use client';

import { AiRecommendationSettings } from '../settings/AiRecommendationSettings';
import { BudgetSettings } from '../settings/BudgetSettings';
import { CategorySettings } from '../settings/CategorySettings';
import { CurrencySettings } from '../settings/CurrencySettings';
import { DisplaySettings } from '../settings/DisplaySettings';
import { ExperimentalSettings } from '../settings/ExperimentalSettings';
import { FixerSettings } from '../settings/FixerSettings';
import { GoogleSearchSettings } from '../settings/GoogleSearchSettings';
import { HouseholdSettings } from '../settings/HouseholdSettings';
import { NotificationSettings } from '../settings/NotificationSettings';
import { PaymentMethodSettings } from '../settings/PaymentMethodSettings';
import { ThemeSettings } from '../settings/ThemeSettings';

/**
 * The settings page.
 *
 * Section order follows settings.php exactly — budgets, household,
 * notifications, categories, currencies, the two API keys, AI, payment methods,
 * then theme, display and experimental.
 */
export function Settings() {
  return (
    <section className="contain settings">
      <BudgetSettings />
      <HouseholdSettings />
      <NotificationSettings />
      <CategorySettings />
      <CurrencySettings />
      <FixerSettings />
      <GoogleSearchSettings />
      <AiRecommendationSettings />
      <PaymentMethodSettings />
      <ThemeSettings />
      <DisplaySettings />
      <ExperimentalSettings />
    </section>
  );
}
