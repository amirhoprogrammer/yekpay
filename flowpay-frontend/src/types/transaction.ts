import type { CurrencyCode } from "./wallet";

export type TransactionType = "exchange" | "deposit" | "withdrawal";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  currency: CurrencyCode;
  amount: string;
  amount_formatted: string;
  description: string | null;
  failure_reason: string | null;
  created_at: string;
  // exchange-specific fields
  from_currency?: CurrencyCode;
  to_currency?: CurrencyCode;
  source_amount?: string;
  exchange_rate?: string;
  fee?: string;
  destination_amount?: string;
}

export interface TransactionFilters {
  type?: TransactionType | "";
  status?: TransactionStatus | "";
  currency?: CurrencyCode | "";
  from_date?: string;
  to_date?: string;
  page?: number;
}

export interface TransactionListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  meta: TransactionListMeta;
}
