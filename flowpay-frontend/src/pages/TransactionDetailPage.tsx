import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { TransactionDetail } from "../features/transactions/components/TransactionDetail";
import { fetchTransaction } from "../api/transaction";
import { getApiError } from "../api/client";
import type { Transaction } from "../types/transaction";

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransaction(id);
      setTransaction(data);
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <Link
        to="/transactions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to transactions
      </Link>

      <h1 className="text-xl font-semibold text-slate-900">
        Transaction detail
      </h1>

      <TransactionDetail
        transaction={transaction}
        loading={loading}
        error={error}
        onRetry={load}
      />
    </div>
  );
}
