import { Select } from "../../../components/ui/Select";
import { SUPPORTED_CURRENCIES } from "../../../lib/money";
import type { TransactionFilters } from "../../../types/transaction";

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

const typeOptions = [
  { value: "", label: "All types" },
  { value: "exchange", label: "Exchange" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
];

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const currencyOptions = [
  { value: "", label: "All currencies" },
  ...SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c })),
];

export function TransactionFiltersBar({
  filters,
  onChange,
}: TransactionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select
        options={typeOptions}
        value={filters.type ?? ""}
        onChange={(e) =>
          onChange({ ...filters, type: e.target.value as TransactionFilters["type"], page: 1 })
        }
        className="w-40"
      />
      <Select
        options={statusOptions}
        value={filters.status ?? ""}
        onChange={(e) =>
          onChange({ ...filters, status: e.target.value as TransactionFilters["status"], page: 1 })
        }
        className="w-40"
      />
      <Select
        options={currencyOptions}
        value={filters.currency ?? ""}
        onChange={(e) =>
          onChange({ ...filters, currency: e.target.value as TransactionFilters["currency"], page: 1 })
        }
        className="w-36"
      />
    </div>
  );
}
