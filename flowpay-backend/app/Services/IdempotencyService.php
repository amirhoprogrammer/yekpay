<?php

namespace App\Services;

use App\Exceptions\DuplicateRequestException;
use App\Exceptions\RequestInProgressException;
use App\Models\IdempotencyKey;
use App\Models\User;
use Illuminate\Database\QueryException;

class IdempotencyService
{
    public function begin(User $user, string $key, array $payload): IdempotencyKey
    {
        $hash = $this->hashPayload($payload);

        try {
            return IdempotencyKey::create([
                'user_id' => $user->id,
                'idempotency_key' => $key,
                'request_hash' => $hash,
                'response_status' => 0, // 0 = "در حال پردازش"، هیچ HTTP status واقعی این مقدار را ندارد
                'response_body' => '',
            ]);
        } catch (QueryException $e) {
            if (! $this->isUniqueConstraintViolation($e)) {
                throw $e;
            }

            $existing = IdempotencyKey::where('user_id', $user->id)
                ->where('idempotency_key', $key)
                ->firstOrFail();

            if ($existing->request_hash !== $hash) {
                throw new DuplicateRequestException();
            }

            if ($existing->isProcessing()) {
                throw new RequestInProgressException();
            }

            return $existing;
        }
    }

    /**
     * پس از اجرای موفق منطق اصلی، پاسخ نهایی را روی همان رکورد ذخیره می‌کند.
     */
    public function complete(IdempotencyKey $record, int $status, array $responseBody): void
    {
        $record->update([
            'response_status' => $status,
            'response_body' => json_encode($responseBody),
        ]);
    }

    private function hashPayload(array $payload): string
    {
        ksort($payload);

        return hash('sha256', json_encode($payload));
    }

    private function isUniqueConstraintViolation(QueryException $e): bool
    {
        return (int) $e->getCode() === 23000;
    }
}