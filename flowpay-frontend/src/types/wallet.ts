export type CurrencyCode = "USD" | "EUR" | "GBP" | "AED";

export interface Currency {
  code: CurrencyCode;
  name: string;
  decimal_places: number;
  symbol: string;
}

export interface Wallet {
  id: number;
  currency_code: CurrencyCode;
  balance_minor: number;
  available_balance: string;
  transactions_count?: number;
}

export interface WalletListResponse {
  wallets: Wallet[];
  total_balance: {
    amount: string;
    currency: CurrencyCode;
  };
}
