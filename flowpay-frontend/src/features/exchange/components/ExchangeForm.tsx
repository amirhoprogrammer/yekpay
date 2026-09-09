import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { ExchangePreviewCard } from "./ExchangePreview";
import { ExchangeConfirmModal } from "./ExchangeConfirmModal";
import { useIdempotencyKey } from "../../../hooks/useIdempotencyKey";
import { getApiError } from "../../../api/client";
import { createExchange, previewExchange } from "../../../api/exchange";
import {
  CURRENCY_NAMES,
  SUPPORTED_CURRENCIES,
  formatMoney,
  parseAmountInput,
} from "../../../lib/money";
import type { CurrencyCode } from "../../../types/wallet";
import type { ExchangePreviewResponse } from "../../../types/exchange";

interface WalletBalance {
  currency_code: CurrencyCode;
  available: string;
}

interface ExchangeFormProps {
  balances?: WalletBalance[];
  onSuccess?: (transactionId: string) => void;
}

const currencyOptions = SUPPORTED_CURRENCIES.map((code) => ({
  value: code,
  label: `${code} — ${CURRENCY_NAMES[code]}`,
}));

export function ExchangeForm({ balances = [], onSuccess }: ExchangeFormProps) {
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("USD");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("EUR");
  const [amountInput, setAmountInput] = useState("1000");
  const [preview, setPreview] = useState<ExchangePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const { next: nextIdempotencyKey, reset: resetIdempotencyKey } =
    useIdempotencyKey();

  const fromBalance = useMemo(
    () => balances.find((b) => b.currency_code === fromCurrency)?.available,
    [balances, fromCurrency]
  );

  useEffect(() => {
    const amount = parseAmountInput(amountInput);
    if (!amount || fromCurrency === toCurrency) {
      setPreview(null);
      setPreviewError(
        fromCurrency === toCurrency
          ? "Source and destination currency must be different."
          : null
      );
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const data = await previewExchange({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount: String(amount),
        });
        if (cancelled) return;
        setPreview(data);
        setPreviewError(null);
      } catch (err) {
        if (cancelled) return;
        const apiErr = getApiError(err);
        setPreview(null);
        setPreviewError(apiErr.message);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [fromCurrency, toCurrency, amountInput]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    resetIdempotencyKey();
  };

  const handleOpenConfirm = () => {
    if (!preview) return;
    setConfirmError(null);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    const amount = parseAmountInput(amountInput);
    if (!amount || !preview) return;

    setConfirmLoading(true);
    setConfirmError(null);

    try {
      const key = nextIdempotencyKey();
      const tx = await createExchange(
        {
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount: String(amount),
        },
        key
      );
      setConfirmOpen(false);
      toast.success("Exchange completed successfully");
      resetIdempotencyKey();
      onSuccess?.(tx.id);
    } catch (err) {
      const apiErr = getApiError(err);
      setConfirmError(apiErr.message);
      if (apiErr.code === "INSUFFICIENT_BALANCE") {
        toast.error(apiErr.message);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const amountValid = parseAmountInput(amountInput) !== null;
  const canSubmit =
    amountValid &&
    fromCurrency !== toCurrency &&
    !!preview &&
    !previewLoading &&
    !previewError;

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <h1 className="text-lg font-semibold text-slate-900">Exchange</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Convert between your wallets at the current rate
          </p>
        </CardHeader>

        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="From"
              value={fromCurrency}
              options={currencyOptions}
              onChange={(e) => {
                setFromCurrency(e.target.value as CurrencyCode);
                resetIdempotencyKey();
              }}
            />
            <Select
              label="To"
              value={toCurrency}
              options={currencyOptions}
              onChange={(e) => {
                setToCurrency(e.target.value as CurrencyCode);
                resetIdempotencyKey();
              }}
            />
          </div>

          <div className="flex justify-center -my-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="!rounded-full !h-9 !w-9 !p-0"
              onClick={swapCurrencies}
              aria-label="Swap currencies"
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
          </div>

          <Input
            label="Amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value);
              resetIdempotencyKey();
            }}
            suffix={fromCurrency}
            error={
              amountInput && !amountValid
                ? "Enter a valid positive amount"
                : undefined
            }
            hint={
              fromBalance
                ? `Available: ${formatMoney(fromBalance, fromCurrency, {
                    showCode: true,
                  })}`
                : undefined
            }
          />

          {(preview || previewLoading) && (
            <ExchangePreviewCard preview={preview!} loading={previewLoading} />
          )}

          {previewError && !previewLoading && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              {previewError}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
            onClick={handleOpenConfirm}
          >
            Review & Confirm
          </Button>
        </CardBody>
      </Card>

      <ExchangeConfirmModal
        open={confirmOpen}
        onClose={() => !confirmLoading && setConfirmOpen(false)}
        onConfirm={handleConfirm}
        preview={preview}
        loading={confirmLoading}
        error={confirmError}
      />
    </>
  );
}
