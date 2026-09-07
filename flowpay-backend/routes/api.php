<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ExchangeController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

// Public routes (بدون نیاز به Login)
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes (نیاز به Login دارند)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/wallets', [WalletController::class, 'index']);
    Route::get('/wallets/{wallet}', [WalletController::class, 'show']);

    Route::post('/exchanges', [ExchangeController::class, 'store']);
    Route::post('/exchanges/preview', [ExchangeController::class, 'preview']);
});