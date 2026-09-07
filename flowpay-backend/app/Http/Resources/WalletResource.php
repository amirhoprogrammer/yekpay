<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WalletResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $decimalPlaces = $this->currency?->decimal_places ?? 2;
        $balance = $this->balance_minor / (10 ** $decimalPlaces);

        return [
            'id' => $this->id,
            'currency' => [
                'code' => $this->currency_code,
                'name' => $this->currency?->name,
                'decimal_places' => $decimalPlaces,
            ],
            'balance_minor' => $this->balance_minor,
            'balance' => number_format($balance, $decimalPlaces, '.', ''),
            'balance_formatted' => number_format($balance, $decimalPlaces) . ' ' . $this->currency_code,
            'transactions_count' => $this->whenCounted('transactions'),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}