<?php

use App\Exceptions\InsufficientBalanceException;
use App\Exceptions\SameCurrencyExchangeException;
use App\Exceptions\WalletNotFoundException;
use App\Models\Currency;
use App\Models\ExchangeRate;
use App\Models\User;
use App\Models\Wallet;
use App\Services\CurrencyConverter;
use App\Services\ExchangeService;
use App\Services\FeeCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeExchangeService(): ExchangeService
{
    return new ExchangeService(new CurrencyConverter(), new FeeCalculator());
}

beforeEach(function () {
    Currency::create(['code' => 'USD', 'name' => 'US Dollar', 'decimal_places' => 2, 'is_active' => true]);
    Currency::create(['code' => 'EUR', 'name' => 'Euro', 'decimal_places' => 2, 'is_active' => true]);

    ExchangeRate::create([
        'base_currency' => 'USD',
        'quote_currency' => 'EUR',
        'rate' => '0.9200000000',
        'valid_from' => now()->subDay(),
    ]);

    $this->user = User::create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    $this->usdWallet = Wallet::create([
        'user_id' => $this->user->id,
        'currency_code' => 'USD',
        'balance_minor' => 10000, // $100.00
        'version' => 0,
    ]);

    $this->eurWallet = Wallet::create([
        'user_id' => $this->user->id,
        'currency_code' => 'EUR',
        'balance_minor' => 0,
        'version' => 0,
    ]);
});

it('completes an exchange, debiting source and crediting destination correctly', function () {
    $service = makeExchangeService();

    $transaction = $service->exchange($this->user, 'USD', 'EUR', '10.00');

    expect($transaction->status)->toBe('completed');
    expect($transaction->source_amount_minor)->toBe(1000);
    expect($transaction->fee_minor)->toBe(7); // 1000 * 0.75% = 7.5 → 7
    expect($transaction->destination_amount_minor)->toBe(913); // (1000-7)*0.92 = 913.56 → 913

    $this->usdWallet->refresh();
    $this->eurWallet->refresh();

    expect($this->usdWallet->balance_minor)->toBe(9000); // 10000 - 1000
    expect($this->eurWallet->balance_minor)->toBe(913);
});

it('throws InsufficientBalanceException and rolls back when balance is too low', function () {
    $service = makeExchangeService();

    expect(fn () => $service->exchange($this->user, 'USD', 'EUR', '1000.00'))
        ->toThrow(InsufficientBalanceException::class);

    $this->usdWallet->refresh();
    $this->eurWallet->refresh();

    // مطمئن می‌شویم هیچ تغییری در موجودی‌ها رخ نداده (Rollback کامل)
    expect($this->usdWallet->balance_minor)->toBe(10000);
    expect($this->eurWallet->balance_minor)->toBe(0);

    // و هیچ رکورد Transaction ای هم باقی نمانده
    expect(\App\Models\Transaction::count())->toBe(0);
});

it('throws SameCurrencyExchangeException when converting a currency to itself', function () {
    $service = makeExchangeService();

    expect(fn () => $service->exchange($this->user, 'USD', 'USD', '10.00'))
        ->toThrow(SameCurrencyExchangeException::class);
});

it('throws WalletNotFoundException when the user has no wallet for the target currency', function () {
    Currency::create(['code' => 'GBP', 'name' => 'British Pound', 'decimal_places' => 2, 'is_active' => true]);
    ExchangeRate::create([
        'base_currency' => 'USD',
        'quote_currency' => 'GBP',
        'rate' => '0.7900000000',
        'valid_from' => now()->subDay(),
    ]);

    $service = makeExchangeService();

    // کاربر Wallet برای GBP ندارد
    expect(fn () => $service->exchange($this->user, 'USD', 'GBP', '10.00'))
        ->toThrow(WalletNotFoundException::class);
});