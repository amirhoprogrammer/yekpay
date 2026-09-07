<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExchangeRate extends Model
{
    protected $fillable = [
        'base_currency',
        'quote_currency',
        'rate',
        'valid_from',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:10',
            'valid_from' => 'datetime',
        ];
    }

    public function baseCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'base_currency', 'code');
    }

    public function quoteCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'quote_currency', 'code');
    }

    /**
     * آخرین نرخ معتبر بین دو ارز رو برمی‌گردونه.
     * این متد بعداً در CurrencyConverter/ExchangeService استفاده می‌شه.
     */
    public static function latestRate(string $base, string $quote): ?self
    {
        return static::where('base_currency', strtoupper($base))
            ->where('quote_currency', strtoupper($quote))
            ->where('valid_from', '<=', now())
            ->orderByDesc('valid_from')
            ->first();
    }
}