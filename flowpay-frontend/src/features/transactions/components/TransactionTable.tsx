import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/cn";
import type {
  Transaction,
  TransactionListMeta,
  TransactionType,
} from "../../../types/transaction";
import {
  formatTransactionAmount,
  formatTransactionSummary,
} from "../../../lib/money";

interface TransactionTableProps {
  transactions: Transaction[];
  meta: TransactionListMeta | null;
  loading?: boolean;
  onPageChange?: (page: number) => void;
}

const typeIcon: Record<TransactionType, React.ReactNode> = {
  deposit: <ArrowDownLeft className="h-4 w-4 text-green-600" />,
  withdrawal: <ArrowUpRight className="h-4 w-4 text-red-500" />,
  exchange: <ArrowRightLeft className="h-4 w-4 text-brand-600" />,
};

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TransactionTable({
  transactions,
  meta,
  loading,
  onPageChange,
}: TransactionTableProps) {
  if (loading) return <TableSkeleton />;

  if (!transactions.length) {
    return (
      <EmptyState
        title="No transactions found"
        description="Try adjusting your filters"
      />
    );
  }

  return (
    <div>
      <div className="divide-y divide-slate-100">
        {transactions.map((tx) => (
          <Link
            key={tx.id}
            to={`/transactions/${tx.id}`}
            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
              {typeIcon[tx.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium capitalize text-slate-900">
                {tx.type}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(tx.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">
                {formatTransactionSummary(tx)}
              </p>
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {formatTransactionAmount(tx)}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                tx.status === "completed"
                  ? "bg-green-50 text-green-700"
                  : tx.status === "failed"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
              )}
            >
              {tx.status}
            </span>
          </Link>
        ))}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-500">
            Page {meta.current_page} of {meta.last_page} ({meta.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.current_page <= 1}
              onClick={() => onPageChange?.(meta.current_page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => onPageChange?.(meta.current_page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
