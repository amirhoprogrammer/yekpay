<?php

namespace App\Exceptions;

class DuplicateRequestException extends ApiException
{
    protected $message = 'This Idempotency-Key was already used with a different request body.';
    protected $code = 409;

    public function errorCode(): string
    {
        return 'DUPLICATE_REQUEST_MISMATCH';
    }
}