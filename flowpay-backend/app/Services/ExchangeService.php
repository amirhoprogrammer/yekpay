<?php

namespace App\Services;

use App\Exceptions\InsufficientBalanceException;
use App\Exceptions\SameCurrencyExchangeException;
use App\Exceptions\WalletNotFoundException;
use App\Models\Currency;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Support\ValueObjects\Money;
use Illuminate\Support\Facades\DB;

class ExchangeService
{
    public function __construct(
        private readonly CurrencyConverter $converter,
        private readonly FeeCalculator $feeCalculator,
    ) {}

    /**
     * محاسبه‌ی کامل یک تبدیل ارز، بدون اعمال هیچ تغییری در دیتابیس.
     * هم توسط preview() و هم توسط exchange() استفاده می‌شود.
     */
    private function calculateConversion(string $fromCurrency, string $toCurrency, string $amount): array
    {
        $fromCurrency = strtoupper($fromCurrency);
        $toCurrency = strtoupper($toCurrency);

        if ($fromCurrency === $toCurrency) {
            throw new SameCurrencyExchangeException();
        }

        $sourceCurrency = Currency::findOrFail($fromCurrency);
        $sourceAmount = Money::fromDecimal($amount, $fromCurrency, $sourceCurrency->decimal_places);

        $fee = $this->feeCalculator->calculate($sourceAmount);
        $amountAfterFee = $sourceAmount->subtract($fee);

        $conversion = $this->converter->convert($amountAfterFee, $toCurrency);

        return [
            'from_currency' => $fromCurrency,
            'to_currency' => $toCurrency,
            'source_amount' => $sourceAmount,
            'fee' => $fee,
            'exchange_rate' => $conversion['rate'],
            'destination_amount' => $conversion['amount'],
        ];
    }

    public function preview(string $fromCurrency, string $toCurrency, string $amount): array
    {
        return $this->calculateConversion($fromCurrency, $toCurrency, $amount);
    }

    public function exchange(User $user, string $fromCurrency, string $toCurrency, string $amount): Transaction
    {
        $calc = $this->calculateConversion($fromCurrency, $toCurrency, $amount);

        return DB::transaction(function () use ($user, $calc) {
            [$sourceWallet, $destinationWallet] = $this->lockWalletsInOrder(
                $user,
                $calc['from_currency'],
                $calc['to_currency']
            );

            $sourceBalance = Money::fromMinorUnits($sourceWallet->balance_minor, $calc['from_currency']);

            if (! $sourceBalance->isGreaterThanOrEqual($calc['source_amount'])) {
                throw new InsufficientBalanceException();
            }

            $transaction = Transaction::create([
                'user_id' => $user->id,
                'type' => 'exchange',
                'from_currency' => $calc['from_currency'],
                'to_currency' => $calc['to_currency'],
                'source_amount_minor' => $calc['source_amount']->minorUnits,
                'fee_minor' => $calc['fee']->minorUnits,
                'exchange_rate' => $calc['exchange_rate']->rate,
                'destination_amount_minor' => $calc['destination_amount']->minorUnits,
                'status' => 'pending',
                'exchange_rate_id' => $calc['exchange_rate']->id,
            ]);

            $newSourceBalance = $sourceBalance->subtract($calc['source_amount']);
            $sourceWallet->update([
                'balance_minor' => $newSourceBalance->minorUnits,
                'version' => $sourceWallet->version + 1,
            ]);

            $destBalance = Money::fromMinorUnits($destinationWallet->balance_minor, $calc['to_currency']);
            $newDestBalance = $destBalance->add($calc['destination_amount']);
            $destinationWallet->update([
                'balance_minor' => $newDestBalance->minorUnits,
                'version' => $destinationWallet->version + 1,
            ]);

            $transaction->update(['status' => 'completed']);

            return $transaction->fresh();
        });
    }

    private function lockWalletsInOrder(User $user, string $currencyA, string $currencyB): array
    {
        $wallets = Wallet::where('user_id', $user->id)
            ->whereIn('currency_code', [$currencyA, $currencyB])
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('currency_code');

        if (! isset($wallets[$currencyA]) || ! isset($wallets[$currencyB])) {
            throw new WalletNotFoundException();
        }

        return [$wallets[$currencyA], $wallets[$currencyB]];
    }
}