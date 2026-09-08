import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { cn } from "../../../lib/cn";
import type { Transaction, TransactionType } from "../../../types/transaction";

interface RecentTransactionsProps {
  transactions: Transaction[];
  loading?: boolean;
}

const typeIcon: Record<TransactionType, React.ReactNode> = {
  deposit: <ArrowDownLeft className="h-4 w-4 text-green-600" />,
  withdrawal: <ArrowUpRight className="h-4 w-4 text-red-500" />,
  exchange: <ArrowRightLeft className="h-4 w-4 text-brand-600" />,
};

const typeLabel: Record<TransactionType, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  exchange: "Exchange",
};

function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.type === "deposit";
  return (
    <Link
      to={`/transactions/${tx.id}`}
      className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
          {typeIcon[tx.type]}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">
            {typeLabel[tx.type]}
          </p>
          <p className="text-xs text-slate-400">
            {new Date(tx.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isCredit ? "text-green-600" : "text-slate-900"
          )}
        >
          {isCredit ? "+" : ""}
          {tx.amount_formatted}
        </p>
        <p
          className={cn(
            "text-xs capitalize",
            tx.status === "completed"
              ? "text-green-500"
              : tx.status === "failed"
                ? "text-red-500"
                : "text-amber-500"
          )}
        >
          {tx.status}
        </p>
      </div>
    </Link>
  );
}

export function RecentTransactions({
  transactions,
  loading,
}: RecentTransactionsProps) {
  if (loading) {
    return (
      <div className="divide-y divide-slate-100">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <EmptyState
        title="No transactions yet"
        description="Your recent activity will show here"
      />
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {transactions.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} />
      ))}
    </div>
  );
}
