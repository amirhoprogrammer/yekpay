<?php

namespace App\Exceptions;

class SameCurrencyExchangeException extends ApiException
{
    protected $message = 'Cannot exchange a currency into itself.';
    protected $code = 422;

    public function errorCode(): string
    {
        return 'SAME_CURRENCY_EXCHANGE';
    }
}