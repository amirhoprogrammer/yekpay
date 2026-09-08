import { apiClient } from "./client";
import type {
  CreateExchangeRequest,
  ExchangePreviewRequest,
  ExchangePreviewResponse,
  ExchangeTransaction,
} from "../types/exchange";

interface DataWrapper<T> {
  data: T;
}

export async function previewExchange(
  payload: ExchangePreviewRequest
): Promise<ExchangePreviewResponse> {
  const { data } = await apiClient.post<DataWrapper<ExchangePreviewResponse>>(
    "/exchanges/preview",
    payload
  );
  return data.data;
}

export async function createExchange(
  payload: CreateExchangeRequest,
  idempotencyKey: string
): Promise<ExchangeTransaction> {
  const { data } = await apiClient.post<
    DataWrapper<ExchangeTransaction> | ExchangeTransaction
  >("/exchanges", payload, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  if (data && typeof data === "object" && "data" in data) {
    return (data as DataWrapper<ExchangeTransaction>).data;
  }
  return data as ExchangeTransaction;
}
