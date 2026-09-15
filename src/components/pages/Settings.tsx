'use client';

import { BudgetSettings } from '../settings/BudgetSettings';
import { CategorySettings } from '../settings/CategorySettings';
import { CurrencySettings } from '../settings/CurrencySettings';
import { DisplaySettings } from '../settings/DisplaySettings';
import { HouseholdSettings } from '../settings/HouseholdSettings';
import { NotificationSettings } from '../settings/NotificationSettings';
import { PaymentMethodSettings } from '../settings/PaymentMethodSettings';
import { ThemeSettings } from '../settings/ThemeSettings';

export function Settings() {
  return (
    <section className="contain settings">
      <BudgetSettings />
      <HouseholdSettings />
      <ThemeSettings />
      <DisplaySettings />
      <NotificationSettings />
      <CategorySettings />
      <CurrencySettings />
      <PaymentMethodSettings />
    </section>
  );
}
