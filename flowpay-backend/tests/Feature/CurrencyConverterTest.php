<?php

use App\Exceptions\ExchangeRateNotFoundException;
use App\Models\Currency;
use App\Models\ExchangeRate;
use App\Services\CurrencyConverter;
use App\Support\ValueObjects\Money;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    Currency::create(['code' => 'USD', 'name' => 'US Dollar', 'decimal_places' => 2, 'is_active' => true]);
    Currency::create(['code' => 'EUR', 'name' => 'Euro', 'decimal_places' => 2, 'is_active' => true]);
});

it('converts an amount using the latest valid exchange rate', function () {
    ExchangeRate::create([
        'base_currency' => 'USD',
        'quote_currency' => 'EUR',
        'rate' => '0.9200000000',
        'valid_from' => now()->subDay(),
    ]);

    $converter = new CurrencyConverter();
    $amount = Money::fromMinorUnits(10000, 'USD'); // $100.00

    $result = $converter->convert($amount, 'EUR');

    expect($result['amount']->minorUnits)->toBe(9200); // €92.00
    expect($result['amount']->currencyCode)->toBe('EUR');
    expect($result['rate']->rate)->toBe('0.9200000000');
});

it('throws an exception when no exchange rate exists for the pair', function () {
    $converter = new CurrencyConverter();
    $amount = Money::fromMinorUnits(10000, 'USD');

    $converter->convert($amount, 'EUR');
})->throws(ExchangeRateNotFoundException::class);

it('uses the most recent rate when multiple historical rates exist', function () {
    ExchangeRate::create([
        'base_currency' => 'USD',
        'quote_currency' => 'EUR',
        'rate' => '0.9000000000',
        'valid_from' => now()->subDays(5),
    ]);

    ExchangeRate::create([
        'base_currency' => 'USD',
        'quote_currency' => 'EUR',
        'rate' => '0.9500000000',
        'valid_from' => now()->subDay(),
    ]);

    $converter = new CurrencyConverter();
    $amount = Money::fromMinorUnits(10000, 'USD');

    $result = $converter->convert($amount, 'EUR');

    expect($result['rate']->rate)->toBe('0.9500000000');
});

it('ignores exchange rates that are not yet valid (future-dated)', function () {
    ExchangeRate::create([
        'base_currency' => 'USD',
        'quote_currency' => 'EUR',
        'rate' => '0.9000000000',
        'valid_from' => now()->subDay(),
    ]);

    ExchangeRate::create([
        'base_currency' => 'USD',
        'quote_currency' => 'EUR',
        'rate' => '0.9900000000', // نرخ آینده، نباید انتخاب بشه
        'valid_from' => now()->addDay(),
    ]);

    $converter = new CurrencyConverter();
    $amount = Money::fromMinorUnits(10000, 'USD');

    $result = $converter->convert($amount, 'EUR');

    expect($result['rate']->rate)->toBe('0.9000000000');
});