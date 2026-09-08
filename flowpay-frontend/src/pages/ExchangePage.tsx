import { useEffect, useState } from "react";
import { ExchangeForm } from "../features/exchange/components/ExchangeForm";
import { fetchWallets } from "../api/wallets";
import type { CurrencyCode } from "../types/wallet";
import { getApiError } from "../api/client";

interface WalletBalance {
  currency_code: CurrencyCode;
  available: string;
}

export function ExchangePage() {
  const [balances, setBalances] = useState<WalletBalance[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWallets();
        if (cancelled) return;
        setBalances(
          data.wallets.map((w) => ({
            currency_code: w.currency_code,
            available: w.available_balance,
          }))
        );
      } catch (err) {
        console.warn("Could not load wallets:", getApiError(err).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <ExchangeForm
        balances={balances}
        onSuccess={(id) => {
          console.log("Exchange success:", id);
        }}
      />
    </div>
  );
}
