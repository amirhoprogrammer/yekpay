import { apiClient } from "./client";
import type {
  Transaction,
  TransactionFilters,
  TransactionListResponse,
} from "../types/transaction";

interface DataWrapper<T> {
  data: T;
}

export async function fetchTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionListResponse> {
  const params: Record<string, string> = {};
  if (filters.type) params.type = filters.type;
  if (filters.status) params.status = filters.status;
  if (filters.currency) params.currency = filters.currency;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.page) params.page = String(filters.page);

  const { data } = await apiClient.get<TransactionListResponse>(
    "/transactions",
    { params }
  );
  return data;
}

export async function fetchTransaction(id: string): Promise<Transaction> {
  const { data } = await apiClient.get<DataWrapper<Transaction>>(
    `/transactions/${id}`
  );
  return data.data;
}
