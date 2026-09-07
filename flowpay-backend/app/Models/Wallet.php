<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Wallet extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'currency_code',
        'balance_minor',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'balance_minor' => 'integer',
            'version' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'currency_code', 'code');
    }

    //public function sentTransactions(): HasMany
    //{
    //    return $this->hasMany(Transaction::class, 'from_currency', 'currency_code')
    //        ->where('user_id', $this->user_id);
    //}
}