import type { CurrencyCode } from "../types/wallet";

export const DECIMAL_PLACES: Record<CurrencyCode, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
};

export const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  AED: "UAE Dirham",
};

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  "USD",
  "EUR",
  "GBP",
  "AED",
];

export function formatMoney(
  amount: string | number,
  currency: CurrencyCode,
  options?: { showCode?: boolean; showSymbol?: boolean }
): string {
  const { showCode = false, showSymbol = true } = options ?? {};
  const decimals = DECIMAL_PLACES[currency];
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (Number.isNaN(num)) return "—";

  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const symbol = CURRENCY_SYMBOLS[currency];
  const prefix = showSymbol ? `${symbol}` : "";
  const suffix = showCode ? ` ${currency}` : "";

  return `${prefix}${formatted}${suffix}`.trim();
}

export function parseAmountInput(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}
