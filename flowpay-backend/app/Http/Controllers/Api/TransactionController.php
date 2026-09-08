<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TransactionIndexRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;

class TransactionController extends Controller
{
    public function index(TransactionIndexRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $user = $request->user();

        $query = Transaction::with(['fromCurrency', 'toCurrency'])
            ->where('user_id', $user->id);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (! empty($filters['currency'])) {
            $currency = strtoupper($filters['currency']);
            $query->where(function ($q) use ($currency) {
                $q->where('from_currency', $currency)
                  ->orWhere('to_currency', $currency);
            });
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (! empty($filters['search'])) {
            $search = strtoupper($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('from_currency', 'like', "%{$search}%")
                  ->orWhere('to_currency', 'like', "%{$search}%")
                  ->orWhere('status', 'like', "%{$search}%")
                  ->orWhere('type', 'like', "%{$search}%");
            });
        }

        $perPage = $filters['per_page'] ?? 15;

        $transactions = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => TransactionResource::collection($transactions),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function show(Transaction $transaction): JsonResponse
    {
        $this->authorize('view', $transaction);

        $transaction->load(['fromCurrency', 'toCurrency']);

        return response()->json([
            'data' => new TransactionResource($transaction),
        ]);
    }
}