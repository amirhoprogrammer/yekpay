<?php

namespace App\Services;

use App\Exceptions\ExchangeRateNotFoundException;
use App\Models\Currency;
use App\Models\ExchangeRate;
use App\Support\ValueObjects\Money;

class CurrencyConverter
{
    public function convert(Money $amount, string $toCurrency): array
    {
        $rate = ExchangeRate::latestRate($amount->currencyCode, $toCurrency);

        if ($rate === null) {
            throw new ExchangeRateNotFoundException();
        }

        $targetCurrency = Currency::findOrFail($toCurrency);

        // amount.minorUnits * rate ← نتیجه هنوز در "minorUnits واحد مبدا برابر با مقصد" است
        $convertedMinorUnits = bcmul((string) $amount->minorUnits, (string) $rate->rate, 0);

        return [
            'amount' => Money::fromMinorUnits((int) $convertedMinorUnits, $targetCurrency->code),
            'rate' => $rate,
        ];
    }
}