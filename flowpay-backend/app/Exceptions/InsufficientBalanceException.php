<?php

namespace App\Exceptions;

use Exception;

class InsufficientBalanceException extends Exception
{
    protected $message = 'Insufficient balance to complete this exchange.';
    protected $code = 422;

    public function errorCode(): string
    {
        return 'INSUFFICIENT_BALANCE';
    }
}