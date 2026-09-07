<?php

namespace App\Exceptions;

use Exception;

class ExchangeRateNotFoundException extends Exception
{
    protected $message = 'No valid exchange rate found for this currency pair.';
    protected $code = 422;

    public function errorCode(): string
    {
        return 'EXCHANGE_RATE_NOT_FOUND';
    }
}