<?php

namespace App\Services;

use App\Support\ValueObjects\Money;

class FeeCalculator
{
    private const FEE_PERCENTAGE = '0.75';

    public function calculate(Money $sourceAmount): Money
    {
        $feeMinorUnits = bcdiv(
            bcmul((string) $sourceAmount->minorUnits, self::FEE_PERCENTAGE, 10),
            '100',
            0 
        );

        return Money::fromMinorUnits((int) $feeMinorUnits, $sourceAmount->currencyCode);
    }
}