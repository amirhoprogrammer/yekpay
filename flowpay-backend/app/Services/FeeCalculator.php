<?php

namespace App\Services;

use App\Support\ValueObjects\Money;

class FeeCalculator
{
    /**
     * نرخ کارمزد صرافی — طبق تست فنی، 0.75%
     */
    private const FEE_PERCENTAGE = '0.75';

    public function calculate(Money $sourceAmount): Money
    {
        // sourceAmount->minorUnits * 0.75 / 100 با دقت کامل (bcmath)
        $feeMinorUnits = bcdiv(
            bcmul((string) $sourceAmount->minorUnits, self::FEE_PERCENTAGE, 10),
            '100',
            0 // نتیجه رو به عدد صحیح (بدون اعشار) گرد کن، چون minorUnits باید Integer باشه
        );

        return Money::fromMinorUnits((int) $feeMinorUnits, $sourceAmount->currencyCode);
    }
}