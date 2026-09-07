<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    ///**
    // * Transform the resource into an array.
    // *
    // * @return array<string, mixed>
    // */
    public function toArray(Request $request): array
    {
        $fromDecimals = $this->fromCurrency->decimal_places;
        $toDecimals = $this->toCurrency->decimal_places;

        return [
            'id' => $this->id,
            'type' => $this->type,
            'status' => $this->status,
            'from_currency' => $this->from_currency,
            'to_currency' => $this->to_currency,
            'source_amount' => bcdiv((string) $this->source_amount_minor, bcpow('10', (string) $fromDecimals), $fromDecimals),
            'fee' => bcdiv((string) $this->fee_minor, bcpow('10', (string) $fromDecimals), $fromDecimals),
            'exchange_rate' => (string) $this->exchange_rate,
            'destination_amount' => bcdiv((string) $this->destination_amount_minor, bcpow('10', (string) $toDecimals), $toDecimals),
            'failure_reason' => $this->failure_reason,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}