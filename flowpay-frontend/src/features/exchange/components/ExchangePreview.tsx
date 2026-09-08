import { ArrowRightLeft } from "lucide-react";
import type { ExchangePreviewResponse } from "../../../types/exchange";
import { formatMoney } from "../../../lib/money";
import { Card, CardBody } from "../../../components/ui/Card";

interface ExchangePreviewProps {
  preview: ExchangePreviewResponse;
  loading?: boolean;
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className={
          emphasize
            ? "text-base font-semibold tabular-nums text-slate-900"
            : "text-sm font-medium tabular-nums text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}

export function ExchangePreviewCard({
  preview,
  loading,
}: ExchangePreviewProps) {
  if (loading) {
    return (
      <Card>
        <CardBody className="space-y-3 animate-pulse">
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          <div className="h-4 w-2/3 rounded bg-slate-100" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-10 w-full rounded-xl bg-slate-100" />
        </CardBody>
      </Card>
    );
  }

  const rateDisplay = `1 ${preview.from_currency} = ${preview.exchange_rate} ${preview.to_currency}`;

  return (
    <Card>
      <CardBody className="space-y-1">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-brand-700">
          <ArrowRightLeft className="h-4 w-4" />
          Exchange summary
        </div>

        <Row
          label="You send"
          value={formatMoney(preview.source_amount, preview.from_currency, {
            showCode: true,
            showSymbol: true,
          })}
        />
        <Row
          label="Fee"
          value={formatMoney(preview.fee, preview.from_currency, {
            showSymbol: true,
            showCode: true,
          })}
        />
        <Row label="Rate" value={rateDisplay} />

        <div className="my-2 border-t border-dashed border-slate-200" />

        <Row
          label="You receive"
          value={formatMoney(preview.destination_amount, preview.to_currency, {
            showCode: true,
            showSymbol: true,
          })}
          emphasize
        />
      </CardBody>
    </Card>
  );
}
