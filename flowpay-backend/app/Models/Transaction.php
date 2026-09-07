<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'type',
        'from_currency',
        'to_currency',
        'source_amount_minor',
        'fee_minor',
        'exchange_rate',
        'destination_amount_minor',
        'status',
        'exchange_rate_id',
        'failure_reason',
    ];

    protected function casts(): array
    {
        return [
            'source_amount_minor' => 'integer',
            'fee_minor' => 'integer',
            'exchange_rate' => 'decimal:10',
            'destination_amount_minor' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fromCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'from_currency', 'code');
    }

    public function toCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'to_currency', 'code');
    }

    public function exchangeRate(): BelongsTo
    {
        return $this->belongsTo(ExchangeRate::class);
    }

    // --- Status helpers برای خوانایی بهتر کد ---

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }
}