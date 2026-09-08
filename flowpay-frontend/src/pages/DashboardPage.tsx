import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/ErrorState";
import { TotalBalance } from "../features/dashboard/components/TotalBalance";
import { WalletList } from "../features/dashboard/components/WalletList";
import { RecentTransactions } from "../features/dashboard/components/RecentTransactions";
import { fetchWallets } from "../api/wallets";
import { fetchTransactions } from "../api/transaction";
import { getApiError } from "../api/client";
import type { Wallet, TotalBalance as TotalBalanceType } from "../types/wallet";
import type { Transaction } from "../types/transaction";

export function DashboardPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [totalBalance, setTotalBalance] = useState<TotalBalanceType | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [walletsError, setWalletsError] = useState<string | null>(null);

  const loadWallets = async () => {
    setLoadingWallets(true);
    setWalletsError(null);
    try {
      const data = await fetchWallets();
      setWallets(data.wallets);
      setTotalBalance(data.total_balance);
    } catch (err) {
      setWalletsError(getApiError(err).message);
    } finally {
      setLoadingWallets(false);
    }
  };

  useEffect(() => {
    loadWallets();
    (async () => {
      try {
        const data = await fetchTransactions({ page: 1 });
        setRecentTx(data.data.slice(0, 5));
      } catch {
        // silent — recent tx is non-critical
      } finally {
        setLoadingTx(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Total Balance */}
      <Card>
        <CardBody className="flex items-start justify-between gap-4">
          <TotalBalance totalBalance={totalBalance} loading={loadingWallets} />
          <Link to="/exchange">
            <Button size="sm">Exchange</Button>
          </Link>
        </CardBody>
      </Card>

      {/* Wallets */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-700">My Wallets</h2>
        </CardHeader>
        {walletsError ? (
          <CardBody>
            <ErrorState message={walletsError} onRetry={loadWallets} />
          </CardBody>
        ) : (
          <WalletList wallets={wallets} loading={loadingWallets} />
        )}
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Recent Transactions
            </h2>
            <Link
              to="/transactions"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <RecentTransactions transactions={recentTx} loading={loadingTx} />
      </Card>
    </div>
  );
}
