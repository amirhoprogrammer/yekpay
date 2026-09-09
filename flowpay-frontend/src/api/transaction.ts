import { apiClient } from "./client";
import type {
  Transaction,
  TransactionFilters,
  TransactionListResponse,
} from "../types/transaction";

//interface DataWrapper<T> {
//  data: T;
//}

export async function fetchTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionListResponse> {
  const params: Record<string, string> = {};
  if (filters.type) params.type = filters.type;
  if (filters.status) params.status = filters.status;
  if (filters.currency) params.currency = filters.currency;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = String(filters.page);

  const { data } = await apiClient.get<TransactionListResponse>(
    "/transactions",
    { params }
  );
  return data;
}

export async function fetchTransaction(id: string): Promise<Transaction> {
  const { data } = await apiClient.get<{ data: Transaction }>(
    `/transactions/${id}`
  );
  return data.data;
}
