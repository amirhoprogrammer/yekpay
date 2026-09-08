import { Skeleton } from "../../../components/ui/Skeleton";
import type { TotalBalance as TotalBalanceType } from "../../../types/wallet";

interface TotalBalanceProps {
  totalBalance: TotalBalanceType | null;
  loading?: boolean;
}

export function TotalBalance({ totalBalance, loading }: TotalBalanceProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500">Total Balance</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
        {totalBalance?.formatted ?? "—"}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">
        Equivalent in {totalBalance?.currency ?? "USD"}
      </p>
    </div>
  );
}
