import { apiClient } from "./client";
import type { WalletListData, WalletListResponse } from "../types/wallet";

export async function fetchWallets(): Promise<WalletListData> {
  const { data } = await apiClient.get<WalletListResponse>("/wallets");
  return data.data;
}
