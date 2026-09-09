import type { CurrencyCode } from "./wallet";

export type TransactionType = "exchange" | "deposit" | "withdrawal";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  source_amount: string;
  fee: string;
  exchange_rate: string;
  destination_amount: string;
  failure_reason: string | null;
  created_at: string;
}

export interface TransactionFilters {
  type?: TransactionType | "";
  status?: TransactionStatus | "";
  currency?: CurrencyCode | "";
  date_from?: string;
  date_to?: string;
  search?: string;
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
