import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import type { ExchangePreviewResponse } from "../../../types/exchange";
import { formatMoney } from "../../../lib/money";

interface ExchangeConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  preview: ExchangePreviewResponse | null;
  loading?: boolean;
  error?: string | null;
}

export function ExchangeConfirmModal({
  open,
  onClose,
  onConfirm,
  preview,
  loading,
  error,
}: ExchangeConfirmModalProps) {
  if (!preview) return null;

  const rateDisplay = `1 ${preview.from_currency} = ${preview.exchange_rate} ${preview.to_currency}`;

  return (
    <Modal open={open} onClose={onClose} title="Confirm Exchange">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">You are exchanging</p>

        <div className="rounded-xl bg-slate-50 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Amount</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {formatMoney(preview.source_amount, preview.from_currency, {
                showCode: true,
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Rate</span>
            <span className="font-medium tabular-nums text-slate-800">
              {rateDisplay}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Fee</span>
            <span className="font-medium tabular-nums text-slate-800">
              {formatMoney(preview.fee, preview.from_currency, {
                showSymbol: true,
              })}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
            <span className="font-medium text-slate-700">You receive</span>
            <span className="text-base font-bold tabular-nums text-brand-700">
              {formatMoney(preview.destination_amount, preview.to_currency, {
                showCode: true,
              })}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            Confirm Exchange
          </Button>
        </div>
      </div>
    </Modal>
  );
}
