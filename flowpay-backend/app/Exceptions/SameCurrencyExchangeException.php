<?php

namespace App\Exceptions;

use Exception;

class SameCurrencyExchangeException extends Exception
{
    protected $message = 'Cannot exchange a currency into itself.';
    protected $code = 422;

    public function errorCode(): string
    {
        return 'SAME_CURRENCY_EXCHANGE';
    }
}