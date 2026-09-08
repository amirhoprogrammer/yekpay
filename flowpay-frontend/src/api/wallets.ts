import { apiClient } from "./client";
import type { WalletListResponse } from "../types/wallet";

export async function fetchWallets(): Promise<WalletListResponse> {
  const { data } = await apiClient.get<WalletListResponse>("/wallets");
  return data;
}
