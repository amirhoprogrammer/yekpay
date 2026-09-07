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

    public function exchange(User $user, string $fromCurrency, string $toCurrency, string $amount): Transaction
    {
        $fromCurrency = strtoupper($fromCurrency);
        $toCurrency = strtoupper($toCurrency);

        if ($fromCurrency === $toCurrency) {
            throw new SameCurrencyExchangeException();
        }

        return DB::transaction(function () use ($user, $fromCurrency, $toCurrency, $amount) {
            [$sourceWallet, $destinationWallet] = $this->lockWalletsInOrder($user, $fromCurrency, $toCurrency);

            $sourceCurrency = Currency::findOrFail($fromCurrency);
            $sourceAmount = Money::fromDecimal($amount, $fromCurrency, $sourceCurrency->decimal_places);

            $sourceBalance = Money::fromMinorUnits($sourceWallet->balance_minor, $fromCurrency);

            if (! $sourceBalance->isGreaterThanOrEqual($sourceAmount)) {
                throw new InsufficientBalanceException();
            }

            $fee = $this->feeCalculator->calculate($sourceAmount);
            $amountAfterFee = $sourceAmount->subtract($fee);

            $conversion = $this->converter->convert($amountAfterFee, $toCurrency);
            $destinationAmount = $conversion['amount'];
            $rate = $conversion['rate'];

            $transaction = Transaction::create([
                'user_id' => $user->id,
                'type' => 'exchange',
                'from_currency' => $fromCurrency,
                'to_currency' => $toCurrency,
                'source_amount_minor' => $sourceAmount->minorUnits,
                'fee_minor' => $fee->minorUnits,
                'exchange_rate' => $rate->rate,
                'destination_amount_minor' => $destinationAmount->minorUnits,
                'status' => 'pending',
                'exchange_rate_id' => $rate->id,
            ]);

            // --- Debit source wallet ---
            $newSourceBalance = $sourceBalance->subtract($sourceAmount);
            $sourceWallet->update([
                'balance_minor' => $newSourceBalance->minorUnits,
                'version' => $sourceWallet->version + 1,
            ]);

            // --- Credit destination wallet ---
            $destBalance = Money::fromMinorUnits($destinationWallet->balance_minor, $toCurrency);
            $newDestBalance = $destBalance->add($destinationAmount);
            $destinationWallet->update([
                'balance_minor' => $newDestBalance->minorUnits,
                'version' => $destinationWallet->version + 1,
            ]);

            $transaction->update(['status' => 'completed']);

            return $transaction->fresh();
        });
    }

    /**
     * هر دو Wallet مربوط به کاربر رو قفل می‌کند، همیشه به ترتیب صعودی id
     * تا از Deadlock بین درخواست‌های همزمان جلوگیری شود.
     */
    private function lockWalletsInOrder(User $user, string $currencyA, string $currencyB): array
    {
        $wallets = Wallet::where('user_id', $user->id)
            ->whereIn('currency_code', [$currencyA, $currencyB])
            ->orderBy('id') // ترتیب ثابت و پیش‌بینی‌پذیر برای گرفتن قفل
            ->lockForUpdate()
            ->get()
            ->keyBy('currency_code');

        if (! isset($wallets[$currencyA]) || ! isset($wallets[$currencyB])) {
            throw new WalletNotFoundException();
        }

        return [$wallets[$currencyA], $wallets[$currencyB]];
    }
}