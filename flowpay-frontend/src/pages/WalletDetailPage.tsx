import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { WalletDetail } from "../features/wallets/components/WalletDetail";
import { TransactionTable } from "../features/transactions/components/TransactionTable";
import { Card, CardHeader } from "../components/ui/Card";
import { fetchWallets } from "../api/wallets";
import { fetchTransactions } from "../api/transaction";
import { getApiError } from "../api/client";
import type { Wallet } from "../types/wallet";
import type { Transaction, TransactionListMeta } from "../types/transaction";

export function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<TransactionListMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  const loadWallet = async () => {
    if (!id) return;
    setLoadingWallet(true);
    setWalletError(null);
    try {
      const data = await fetchWallets();
      const found = data.wallets.find((w) => String(w.id) === id);
      setWallet(found ?? null);
      if (!found) setWalletError("Wallet not found");
    } catch (err) {
      setWalletError(getApiError(err).message);
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [id]);

  useEffect(() => {
    if (!wallet) return;
    setLoadingTx(true);
    fetchTransactions({ currency: wallet.currency.code, page })
      .then((data) => {
        setTransactions(data.data);
        setMeta(data.meta);
      })
      .catch(() => {
        // silent
      })
      .finally(() => setLoadingTx(false));
  }, [wallet, page]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <WalletDetail
        wallet={wallet}
        loading={loadingWallet}
        error={walletError}
        onRetry={loadWallet}
      />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-700">Transactions</h2>
        </CardHeader>
        <TransactionTable
          transactions={transactions}
          meta={meta}
          loading={loadingTx}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
