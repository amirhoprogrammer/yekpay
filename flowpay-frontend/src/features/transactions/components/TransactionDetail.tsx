import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ErrorState } from "../../../components/ui/ErrorState";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/money";
import type { Transaction } from "../../../types/transaction";

interface TransactionDetailProps {
  transaction: Transaction | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

export function TransactionDetail({
  transaction: tx,
  loading,
  error,
  onRetry,
}: TransactionDetailProps) {
  if (loading) {
    return (
      <Card>
        <CardBody className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <ErrorState message={error} onRetry={onRetry} />
        </CardBody>
      </Card>
    );
  }

  if (!tx) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold capitalize text-slate-900">
            {tx.type}
          </h2>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
              tx.status === "completed"
                ? "bg-green-50 text-green-700"
                : tx.status === "failed"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            )}
          >
            {tx.status}
          </span>
        </div>
      </CardHeader>
      <CardBody className="divide-y divide-slate-100">
        <Row
          label="ID"
          value={<span className="font-mono text-xs">{tx.id}</span>}
        />

        {tx.type === "exchange" && (
          <>
            <Row
              label="From"
              value={
                tx.from_currency && tx.source_amount
                  ? formatMoney(
                      tx.source_amount ?? tx.destination_amount,
                      tx.from_currency,
                      { showCode: true }
                    )
                  : tx.from_currency ?? "—"
              }
            />
            <Row
              label="To"
              value={
                tx.to_currency && tx.destination_amount
                  ? formatMoney(tx.destination_amount, tx.to_currency, {
                      showCode: true,
                    })
                  : tx.to_currency ?? "—"
              }
            />
            {tx.exchange_rate && (
              <Row
                label="Rate"
                value={`1 ${tx.from_currency} = ${tx.exchange_rate} ${tx.to_currency}`}
              />
            )}
            {tx.fee && (
              <Row
                label="Fee"
                value={
                  tx.from_currency
                    ? formatMoney(tx.fee, tx.from_currency, { showCode: true })
                    : tx.fee
                }
              />
            )}
          </>
        )}
        {tx.failure_reason && (
          <Row
            label="Failure reason"
            value={<span className="text-red-600">{tx.failure_reason}</span>}
          />
        )}
        <Row
          label="Date"
          value={new Date(tx.created_at).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
      </CardBody>
    </Card>
  );
}
