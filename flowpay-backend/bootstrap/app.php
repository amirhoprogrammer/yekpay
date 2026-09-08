<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // ۱. Exceptionهای اختصاصی خودمان (ApiException و فرزندانش)
        $exceptions->renderable(function (\App\Exceptions\ApiException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => $e->errorCode(),
                    'errors' => null,
                ], $e->getCode());
            }
        });

        // ۲. خطاهای Validation (از FormRequest)
        $exceptions->renderable(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => 'VALIDATION_ERROR',
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        // ۳. عدم احراز هویت (Token نامعتبر/موجود نیست)
        $exceptions->renderable(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                    'code' => 'UNAUTHENTICATED',
                    'errors' => null,
                ], 401);
            }
        });

        // ۴. عدم دسترسی (خروجی Policyها، مثل $this->authorize())
        $exceptions->renderable(function (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => $e->getMessage() ?: 'This action is unauthorized.',
                    'code' => 'FORBIDDEN',
                    'errors' => null,
                ], 403);
            }
        });

        // ۵. رکورد پیدا نشد (findOrFail، یا Route Model Binding ناموفق)
        $exceptions->renderable(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Resource not found.',
                    'code' => 'NOT_FOUND',
                    'errors' => null,
                ], 404);
            }
        });

        // ۶. Fallback نهایی: هر خطای پیش‌بینی‌نشده‌ی دیگر (فقط وقتی Debug خاموش است)
        $exceptions->renderable(function (\Throwable $e, $request) {
            if ($request->is('api/*') && ! config('app.debug')) {
                return response()->json([
                    'message' => 'Something went wrong. Please try again later.',
                    'code' => 'SERVER_ERROR',
                    'errors' => null,
                ], 500);
            }
        });
    })->create();