<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\RequestInProgressException;
use App\Http\Controllers\Controller;
use App\Http\Requests\CreateExchangeRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Services\ExchangeService;
use App\Services\IdempotencyService;
use Illuminate\Http\Response;

class ExchangeController extends Controller
{
    public function __construct(
        private readonly ExchangeService $exchangeService,
        private readonly IdempotencyService $idempotencyService,
    ) {}

    public function store(CreateExchangeRequest $request)
    {
        $idempotencyKey = $request->header('Idempotency-Key');

        if (! $idempotencyKey) {
            return response()->json([
                'message' => 'The Idempotency-Key header is required.',
                'code' => 'IDEMPOTENCY_KEY_MISSING',
                'errors' => null,
            ], 422);
        }

        $user = $request->user();
        $payload = $request->validated();

        $record = $this->idempotencyService->begin($user, $idempotencyKey, $payload);

        // اگر رکورد از قبل کامل شده بود (نه در حال پردازش)، پاسخ Cache‌شده را برگردان
        if (! $record->wasRecentlyCreated) {
            return response(
                $record->response_body,
                $record->response_status
            )->header('Content-Type', 'application/json');
        }

        try {
            $transaction = $this->exchangeService->exchange(
                user: $user,
                fromCurrency: $payload['from_currency'],
                toCurrency: $payload['to_currency'],
                amount: $payload['amount'],
            );

            $transaction->load(['fromCurrency', 'toCurrency']);
            $responseData = (new TransactionResource($transaction))->response()->getData(true);

            $this->idempotencyService->complete($record, 201, $responseData);

            return response()->json($responseData, 201);
        } catch (\Throwable $e) {
            // مهم: اگر Exchange واقعی Fail شد، رکورد "در حال پردازش" را حذف می‌کنیم
            // تا کاربر بتواند با همان Idempotency-Key دوباره تلاش کند.
            $record->delete();

            throw $e;
        }
    }
}