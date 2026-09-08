import { Link } from "react-router-dom";
import { Card, CardBody } from "../../../components/ui/Card";
import { CURRENCY_SYMBOLS } from "../../../lib/money";
import type { Wallet } from "../../../types/wallet";

interface WalletCardProps {
  wallet: Wallet;
}

export function WalletCard({ wallet }: WalletCardProps) {
  const symbol = CURRENCY_SYMBOLS[wallet.currency.code];

  return (
    <Link to={`/wallets/${wallet.id}`} className="block">
      <Card className="hover:border-brand-200 transition-colors">
        <CardBody className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-base font-bold text-brand-700">
              {symbol}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {wallet.currency.code}
              </p>
              <p className="text-xs text-slate-400">{wallet.currency.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold tabular-nums text-slate-900">
              {wallet.balance_formatted}
            </p>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
