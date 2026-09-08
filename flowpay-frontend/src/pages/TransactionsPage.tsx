import { useEffect, useState } from "react";
import { Card, CardHeader } from "../components/ui/Card";
import { TransactionTable } from "../features/transactions/components/TransactionTable";
import { TransactionFiltersBar } from "../features/transactions/components/TransactionFilters";
import { fetchTransactions } from "../api/transaction";
import type { Transaction, TransactionFilters, TransactionListMeta } from "../types/transaction";

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<TransactionListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTransactions(filters)
      .then((data) => {
        if (cancelled) return;
        setTransactions(data.data);
        setMeta(data.meta);
      })
      .catch(() => {
        if (!cancelled) setTransactions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">Transactions</h1>

      <Card>
        <CardHeader>
          <TransactionFiltersBar
            filters={filters}
            onChange={setFilters}
          />
        </CardHeader>
        <TransactionTable
          transactions={transactions}
          meta={meta}
          loading={loading}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </Card>
    </div>
  );
}
