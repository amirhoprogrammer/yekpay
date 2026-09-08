<?php

namespace App\Exceptions;

class InsufficientBalanceException extends ApiException
{
    protected $message = 'Insufficient balance to complete this exchange.';
    protected $code = 422;

    public function errorCode(): string
    {
        return 'INSUFFICIENT_BALANCE';
    }
}