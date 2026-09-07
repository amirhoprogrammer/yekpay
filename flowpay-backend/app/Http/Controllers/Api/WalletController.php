<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WalletResource;
use App\Models\Wallet;
use App\Services\CurrencyConverter;
use App\Support\ValueObjects\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WalletController extends Controller
{
    public function __construct(
        private readonly CurrencyConverter $currencyConverter
    ) {}

    /**
     * GET /api/wallets
     * لیست کیف‌پول‌ها + Total Balance به ارز پایه (USD)
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $wallets = Wallet::with('currency')
            ->where('user_id', $user->id)
            ->orderBy('currency_code')
            ->get();

        $baseCurrency = 'USD';

        $totalBalanceMinor = 0;

        foreach ($wallets as $wallet) {
            if ($wallet->currency_code === $baseCurrency) {
                $totalBalanceMinor += $wallet->balance_minor;
                continue;
            }

            $money = Money::fromMinorUnits($wallet->balance_minor, $wallet->currency_code);
            $result = $this->currencyConverter->convert($money, $baseCurrency);

            $totalBalanceMinor += $result['amount']->minorUnits;
        }

        return response()->json([
            'data' => [
                'wallets' => WalletResource::collection($wallets),
                'total_balance' => [
                    'amount_minor' => $totalBalanceMinor,
                    'currency' => $baseCurrency,
                    'formatted' => $this->formatMoney($totalBalanceMinor, $baseCurrency),
                ],
            ],
        ]);
    }

    /**
     * GET /api/wallets/{wallet}
     */
    public function show(Wallet $wallet): JsonResponse
    {
        $user = Auth::user();

        if ($wallet->user_id !== $user->id) {
            abort(403, 'Access denied');
        }

        $wallet->load('currency');

        return response()->json([
            'data' => new WalletResource($wallet),
        ]);
    }

    private function formatMoney(int $amountMinor, string $currencyCode): string
    {
        $decimalPlaces = 2;
        $amount = $amountMinor / (10 ** $decimalPlaces);

        return number_format($amount, $decimalPlaces) . ' ' . $currencyCode;
    }
}