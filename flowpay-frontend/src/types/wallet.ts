export type CurrencyCode = "USD" | "EUR" | "GBP" | "AED";

export interface Currency {
  code: CurrencyCode;
  name: string;
  decimal_places: number;
}

export interface Wallet {
  id: number;
  currency: Currency;
  balance_minor: number;
  balance: string;
  balance_formatted: string;
  updated_at: string;
}

export interface TotalBalance {
  amount_minor: number;
  currency: CurrencyCode;
  formatted: string;
}

export interface WalletListData {
  wallets: Wallet[];
  total_balance: TotalBalance;
}

export interface WalletListResponse {
  data: WalletListData;
}
