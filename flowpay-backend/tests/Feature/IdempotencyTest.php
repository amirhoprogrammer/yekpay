<?php

use App\Exceptions\DuplicateRequestException;
use App\Exceptions\RequestInProgressException;
use App\Models\Currency;
use App\Models\ExchangeRate;
use App\Models\IdempotencyKey;
use App\Models\User;
use App\Models\Wallet;
use App\Services\IdempotencyService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

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
        'email' => 'idem@example.com',
        'password' => bcrypt('password'),
    ]);

    Wallet::create(['user_id' => $this->user->id, 'currency_code' => 'USD', 'balance_minor' => 10000, 'version' => 0]);
    Wallet::create(['user_id' => $this->user->id, 'currency_code' => 'EUR', 'balance_minor' => 0, 'version' => 0]);
});

// --- تست‌های مستقیم روی IdempotencyService ---

it('creates a new placeholder record on the first call with a given key', function () {
    $service = new IdempotencyService();
    $payload = ['from_currency' => 'USD', 'to_currency' => 'EUR', 'amount' => '10.00'];

    $record = $service->begin($this->user, 'key-001', $payload);

    expect($record->wasRecentlyCreated)->toBeTrue();
    expect($record->isProcessing())->toBeTrue();
});

it('throws RequestInProgressException when the same key is still being processed', function () {
    $service = new IdempotencyService();
    $payload = ['from_currency' => 'USD', 'to_currency' => 'EUR', 'amount' => '10.00'];

    $service->begin($this->user, 'key-002', $payload); // اولین بار، هنوز complete نشده

    expect(fn () => $service->begin($this->user, 'key-002', $payload))
        ->toThrow(RequestInProgressException::class);
});

it('returns the completed record when the same key and payload are reused', function () {
    $service = new IdempotencyService();
    $payload = ['from_currency' => 'USD', 'to_currency' => 'EUR', 'amount' => '10.00'];

    $record = $service->begin($this->user, 'key-003', $payload);
    $service->complete($record, 201, ['id' => 'fake-transaction-id']);

    $second = $service->begin($this->user, 'key-003', $payload);

    expect($second->wasRecentlyCreated)->toBeFalse();
    expect($second->id)->toBe($record->id);
    expect(json_decode($second->response_body, true))->toBe(['id' => 'fake-transaction-id']);
});

it('throws DuplicateRequestException when the same key is reused with a different payload', function () {
    $service = new IdempotencyService();

    $record = $service->begin($this->user, 'key-004', ['amount' => '10.00']);
    $service->complete($record, 201, ['id' => 'fake-id']);

    expect(fn () => $service->begin($this->user, 'key-004', ['amount' => '99.00']))
        ->toThrow(DuplicateRequestException::class);
});

it('is not affected by key ordering in the payload when hashing', function () {
    $service = new IdempotencyService();

    $record = $service->begin($this->user, 'key-005', ['a' => 1, 'b' => 2]);
    $service->complete($record, 201, ['id' => 'fake-id']);

    // همان محتوا، فقط با ترتیب کلید متفاوت — نباید Duplicate تشخیص داده شود
    $second = $service->begin($this->user, 'key-005', ['b' => 2, 'a' => 1]);

    expect($second->wasRecentlyCreated)->toBeFalse();
    expect($second->id)->toBe($record->id);
});

// --- تست کامل در سطح HTTP (End-to-End) ---

it('returns the exact same transaction when the exchange endpoint is called twice with the same idempotency key', function () {
    $payload = ['from_currency' => 'USD', 'to_currency' => 'EUR', 'amount' => '10.00'];
    $headers = ['Idempotency-Key' => 'http-test-key-001'];

    $firstResponse = $this->actingAs($this->user)
        ->postJson('/api/exchanges', $payload, $headers);

    $firstResponse->assertStatus(201);
    $firstId = $firstResponse->json('data.id');

    $secondResponse = $this->actingAs($this->user)
        ->postJson('/api/exchanges', $payload, $headers);

    $secondResponse->assertStatus(201);
    $secondId = $secondResponse->json('data.id');

    expect($secondId)->toBe($firstId);

    // مهم‌ترین بخش: موجودی نباید دوبار کم شده باشد
    $wallet = Wallet::where('user_id', $this->user->id)->where('currency_code', 'USD')->first();
    expect($wallet->balance_minor)->toBe(9000); // فقط یک‌بار کم شده: 10000 - 1000
});

it('rejects the request when the Idempotency-Key header is missing', function () {
    $payload = ['from_currency' => 'USD', 'to_currency' => 'EUR', 'amount' => '10.00'];

    $response = $this->actingAs($this->user)->postJson('/api/exchanges', $payload);

    $response->assertStatus(422);
    expect($response->json('code'))->toBe('IDEMPOTENCY_KEY_MISSING');
});