<?php

use App\Exceptions\InsufficientBalanceException;
use App\Models\Currency;
use App\Models\ExchangeRate;
use App\Models\User;
use App\Models\Wallet;
use App\Services\CurrencyConverter;
use App\Services\ExchangeService;
use App\Services\FeeCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * ⚠️ محدودیت شناخته‌شده:
 * چون تست‌ها روی SQLite در حافظه (:memory:) اجرا می‌شوند، امکان شبیه‌سازی
 * دو Request *واقعاً* هم‌زمان (Race Condition واقعی در سطح دیتابیس) در این محیط وجود ندارد.
 * این تست به‌جای آن، فراخوانی‌های پی‌درپی سریع را بررسی می‌کند تا مطمئن شود
 * منطق چک موجودی و آپدیت، پایدار عمل می‌کند و هیچ‌گاه موجودی منفی نمی‌شود.
 *
 * تست همزمانی واقعی (با دو کانکشن هم‌زمان روی MySQL) به‌صورت دستی با دو
 * ترمینال curl انجام و تأیید شده است (مستند در README).
 */
uses(RefreshDatabase::class);

function makeService(): ExchangeService
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
        'email' => 'concurrent@example.com',
        'password' => bcrypt('password'),
    ]);

    $this->usdWallet = Wallet::create([
        'user_id' => $this->user->id,
        'currency_code' => 'USD',
        'balance_minor' => 1000, // فقط $10.00 موجودی
        'version' => 0,
    ]);

    Wallet::create([
        'user_id' => $this->user->id,
        'currency_code' => 'EUR',
        'balance_minor' => 0,
        'version' => 0,
    ]);
});

it('never allows balance to go negative across sequential rapid calls', function () {
    $service = makeService();

    // درخواست اول: $6 از $10 موجودی — باید موفق باشد
    $first = $service->exchange($this->user, 'USD', 'EUR', '6.00');
    expect($first->status)->toBe('completed');

    // درخواست دوم: $6 دیگر — فقط $4 باقی مانده، باید Fail شود
    expect(fn () => $service->exchange($this->user, 'USD', 'EUR', '6.00'))
        ->toThrow(InsufficientBalanceException::class);

    $this->usdWallet->refresh();

    // موجودی هرگز نباید منفی شود
    expect($this->usdWallet->balance_minor)->toBeGreaterThanOrEqual(0);
    expect($this->usdWallet->balance_minor)->toBe(400); // 1000 - 600
});

it('increments the wallet version on each successful update', function () {
    $service = makeService();

    expect($this->usdWallet->version)->toBe(0);

    $service->exchange($this->user, 'USD', 'EUR', '5.00');

    $this->usdWallet->refresh();

    expect($this->usdWallet->version)->toBe(1);
});