import type { CurrencyCode } from "./wallet";

export interface ExchangePreviewRequest {
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  amount: string;
}

export interface ExchangePreviewResponse {
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  source_amount: string;
  fee: string;
  exchange_rate: string;
  destination_amount: string;
}

export interface CreateExchangeRequest {
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  amount: string;
}

export interface ExchangeTransaction {
  id: string;
  type: "exchange";
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  source_amount: string;
  fee: string;
  exchange_rate: string;
  destination_amount: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

export interface ExchangeTransaction {
  id: string;
  type: "exchange";
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  source_amount: string;
  fee: string;
  exchange_rate: string;
  destination_amount: string;
  status: "pending" | "completed" | "failed";
  failure_reason: string | null;
  created_at: string;
}
