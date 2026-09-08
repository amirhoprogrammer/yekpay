<?php

namespace App\Exceptions;

class ExchangeRateNotFoundException extends ApiException
{
    protected $message = 'No valid exchange rate found for this currency pair.';
    protected $code = 422;

    public function errorCode(): string
    {
        return 'EXCHANGE_RATE_NOT_FOUND';
    }
}