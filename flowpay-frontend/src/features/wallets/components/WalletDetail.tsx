import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ErrorState } from "../../../components/ui/ErrorState";
import { CURRENCY_SYMBOLS } from "../../../lib/money";
import type { Wallet } from "../../../types/wallet";

interface WalletDetailProps {
  wallet: Wallet | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function WalletDetail({
  wallet,
  loading,
  error,
  onRetry,
}: WalletDetailProps) {
  if (loading) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3 w-32" />
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

  if (!wallet) return null;

  const symbol = CURRENCY_SYMBOLS[wallet.currency.code];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-700">
            {symbol}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {wallet.currency.name}
            </h2>
            <p className="text-sm text-slate-400">{wallet.currency.code}</p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-xs text-slate-500">Available Balance</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
          {wallet.balance_formatted}
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Last updated{" "}
          {new Date(wallet.updated_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </CardBody>
    </Card>
  );
}
