'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AppData } from '@/lib/data';
import { makePriceFormatter } from '@/lib/currency';
import {
  buildRateMap,
  convertPrice,
  getBillingCycle,
  getPricePerMonth,
  getSubscriptionProgress,
} from '@/lib/subscriptions';
import { CYCLE_ONE_TIME } from '@/lib/constants';
import { makeTranslator } from '@/lib/i18n';
import type { SubscriptionView } from '@/lib/types';

interface AppDataContextValue extends AppData {
  /** Subscriptions joined with their lookup rows and derived prices. */
  views: SubscriptionView[];
  rates: Map<number, number>;
  mainCurrencyCode: string;
  formatPrice: (price: number, code?: string | null) => string;
  /** Translate a key, exactly as upstream's translate() does. */
  t: (key: string, fallback?: string) => string;
  /** Re-fetch server data after a mutation. */
  refresh: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ value, children }: { value: AppData; children: React.ReactNode }) {
  const router = useRouter();

  const contextValue = useMemo<AppDataContextValue>(() => {
    const rates = buildRateMap(value.currencies);
    const currencyById = new Map(value.currencies.map((c) => [c.id, c]));
    const categoryById = new Map(value.categories.map((c) => [c.id, c]));
    const paymentById = new Map(value.paymentMethods.map((p) => [p.id, p]));
    const memberById = new Map(value.household.map((m) => [m.id, m]));

    const mainCurrency = currencyById.get(value.profile.main_currency ?? -1);
    const mainCurrencyCode = mainCurrency?.code ?? 'EUR';
    const formatPrice = makePriceFormatter(value.currencies, value.profile.main_currency);
    const t = makeTranslator(value.i18n);

    const views: SubscriptionView[] = value.subscriptions.map((subscription) => {
      const currency = currencyById.get(subscription.currency_id ?? -1);
      const price = Number(subscription.price);
      const converted = convertPrice(price, subscription.currency_id, rates);

      // The display price follows the two display settings, in upstream's
      // order: convert to the main currency first, then reduce to a month.
      let displayPrice = price;
      let displayCurrencyCode = currency?.code ?? mainCurrencyCode;
      if (value.settings.convert_currency && subscription.currency_id !== value.profile.main_currency) {
        displayPrice = converted;
        displayCurrencyCode = mainCurrencyCode;
      }
      if (value.settings.monthly_price) {
        displayPrice = getPricePerMonth(subscription.cycle, subscription.frequency, displayPrice);
      }

      return {
        ...subscription,
        price,
        currency_code: currency?.code ?? mainCurrencyCode,
        currency_symbol: currency?.symbol ?? '',
        payment_method_name: paymentById.get(subscription.payment_method_id ?? -1)?.name ?? '',
        payment_method_icon: paymentById.get(subscription.payment_method_id ?? -1)?.icon ?? null,
        category_name: categoryById.get(subscription.category_id ?? -1)?.name ?? t('no_category'),
        payer_name: memberById.get(subscription.payer_user_id ?? -1)?.name ?? '',
        converted_price: converted,
        monthly_price: getPricePerMonth(subscription.cycle, subscription.frequency, converted),
        display_price: displayPrice,
        display_currency_code: displayCurrencyCode,
        billing_cycle: getBillingCycle(subscription.cycle, subscription.frequency, t),
        one_time: subscription.cycle === CYCLE_ONE_TIME,
        progress: getSubscriptionProgress(
          subscription.cycle,
          subscription.frequency,
          subscription.next_payment,
        ),
      };
    });

    return {
      ...value,
      views,
      rates,
      mainCurrencyCode,
      formatPrice,
      t,
      refresh: () => router.refresh(),
    };
  }, [value, router]);

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider');
  return context;
}

/** Translations on their own, for components that need nothing else. */
export function useT() {
  return useAppData().t;
}

/** Convenience hook for components that only need to invalidate server data. */
export function useRefresh() {
  const router = useRouter();
  return useCallback(() => router.refresh(), [router]);
}
