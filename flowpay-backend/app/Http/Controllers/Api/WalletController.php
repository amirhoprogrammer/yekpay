<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WalletResource;
use App\Models\Currency;
use App\Models\Wallet;
use App\Services\CurrencyConverter;
use App\Support\ValueObjects\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    private const BASE_CURRENCY = 'USD';

    public function __construct(
        private readonly CurrencyConverter $currencyConverter,
    ) {}

    /**
     * GET /api/wallets
     * لیست کیف‌پول‌ها + Total Balance به ارز پایه
     */
    public function index(Request $request): JsonResponse
    {
        $wallets = Wallet::with('currency')
            ->where('user_id', $request->user()->id)
            ->orderBy('currency_code')
            ->get();

        $totalBalanceMinor = $this->calculateTotalBalance($wallets);
        $baseCurrency = Currency::findOrFail(self::BASE_CURRENCY);
        $totalMoney = Money::fromMinorUnits($totalBalanceMinor, self::BASE_CURRENCY);

        return response()->json([
            'data' => [
                'wallets' => WalletResource::collection($wallets),
                'total_balance' => [
                    'amount_minor' => $totalBalanceMinor,
                    'currency' => self::BASE_CURRENCY,
                    'formatted' => $totalMoney->toDecimalString($baseCurrency->decimal_places) . ' ' . self::BASE_CURRENCY,
                ],
            ],
        ]);
    }

    /**
     * GET /api/wallets/{wallet}
     */
    public function show(Request $request, Wallet $wallet): JsonResponse
    {
        $this->authorize('view', $wallet);

        $wallet->load('currency');

        return response()->json([
        'data' => new WalletResource($wallet),
    ]);
    }

    /**
     * جمع موجودی همه‌ی Walletها را به ارز پایه (USD) محاسبه می‌کند.
     */
    private function calculateTotalBalance($wallets): int
    {
        $totalMinor = 0;

        foreach ($wallets as $wallet) {
            if ($wallet->currency_code === self::BASE_CURRENCY) {
                $totalMinor += $wallet->balance_minor;
                continue;
            }

            if ($wallet->balance_minor === 0) {
                continue;
            }

            $money = Money::fromMinorUnits($wallet->balance_minor, $wallet->currency_code);
            $converted = $this->currencyConverter->convert($money, self::BASE_CURRENCY);

            $totalMinor += $converted['amount']->minorUnits;
        }

        return $totalMinor;
    }
}