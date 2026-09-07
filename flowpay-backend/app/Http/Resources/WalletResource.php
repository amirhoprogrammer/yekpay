<?php

namespace App\Http\Resources;

use App\Support\ValueObjects\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WalletResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $decimalPlaces = $this->currency->decimal_places;
        $money = Money::fromMinorUnits($this->balance_minor, $this->currency_code);

        return [
            'id' => $this->id,
            'currency' => [
                'code' => $this->currency_code,
                'name' => $this->currency->name,
                'decimal_places' => $decimalPlaces,
            ],
            'balance_minor' => $this->balance_minor,
            'balance' => $money->toDecimalString($decimalPlaces),
            'balance_formatted' => $money->toDecimalString($decimalPlaces) . ' ' . $this->currency_code,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}