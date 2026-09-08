import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { CURRENCY_SYMBOLS } from "../../../lib/money";
import type { Wallet } from "../../../types/wallet";

interface WalletListProps {
  wallets: Wallet[];
  loading?: boolean;
}

function WalletRow({ wallet }: { wallet: Wallet }) {
  const symbol = CURRENCY_SYMBOLS[wallet.currency.code];
  return (
    <Link
      to={`/wallets/${wallet.id}`}
      className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
          {symbol}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">
            {wallet.currency.name}
          </p>
          <p className="text-xs text-slate-400">{wallet.currency.code}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold tabular-nums text-slate-900">
          {wallet.balance_formatted}
        </p>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </Link>
  );
}

export function WalletList({ wallets, loading }: WalletListProps) {
  if (loading) {
    return (
      <div className="divide-y divide-slate-100">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!wallets.length) {
    return <EmptyState title="No wallets found" />;
  }

  return (
    <div className="divide-y divide-slate-100">
      {wallets.map((wallet) => (
        <WalletRow key={wallet.id} wallet={wallet} />
      ))}
    </div>
  );
}
