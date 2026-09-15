import type { Currency } from './types';

/**
 * Format a price the way Wallos does: locale-aware currency formatting, but
 * with the ISO code swapped for the user's stored symbol when Intl falls back
 * to printing the code (it does this for currencies it has no symbol for).
 */
export function formatPrice(
  price: number,
  currencyCode: string | null | undefined,
  currencies: Currency[] = [],
  locale = 'en',
): string {
  const code = currencyCode || 'EUR';
  let formatted: string;

  try {
    formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    formatted = `${code} ${price.toFixed(2)}`;
  }

  if (formatted.includes(code)) {
    const symbol = currencies.find((c) => c.code === code)?.symbol;
    if (symbol) formatted = formatted.replace(code, symbol).trim();
  }

  return formatted;
}

export function makePriceFormatter(currencies: Currency[], mainCurrencyId: number | null, locale = 'en') {
  const main = currencies.find((c) => c.id === mainCurrencyId);
  const mainCode = main?.code ?? 'EUR';
  return (price: number, code?: string | null) => formatPrice(price, code ?? mainCode, currencies, locale);
}
