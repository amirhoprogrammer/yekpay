<?php

use App\Services\FeeCalculator;
use App\Support\ValueObjects\Money;

it('calculates 0.75% fee correctly', function () {
    $calculator = new FeeCalculator();
    $amount = Money::fromMinorUnits(10000, 'USD'); // $100.00

    $fee = $calculator->calculate($amount);

    expect($fee->minorUnits)->toBe(75); // $100 * 0.75% = $0.75
    expect($fee->currencyCode)->toBe('USD');
});

it('rounds the fee down when the result has a fractional minor unit', function () {
    $calculator = new FeeCalculator();
    $amount = Money::fromMinorUnits(1000, 'USD'); // $10.00

    $fee = $calculator->calculate($amount);

    // 1000 * 0.75 / 100 = 7.5 → باید به 7 گرد بشه (Round Down)
    expect($fee->minorUnits)->toBe(7);
});

it('returns zero fee for a zero amount', function () {
    $calculator = new FeeCalculator();
    $amount = Money::fromMinorUnits(0, 'USD');

    $fee = $calculator->calculate($amount);

    expect($fee->minorUnits)->toBe(0);
    expect($fee->isZero())->toBeTrue();
});

it('preserves the currency code of the input amount', function () {
    $calculator = new FeeCalculator();
    $amount = Money::fromMinorUnits(5000, 'EUR');

    $fee = $calculator->calculate($amount);

    expect($fee->currencyCode)->toBe('EUR');
});