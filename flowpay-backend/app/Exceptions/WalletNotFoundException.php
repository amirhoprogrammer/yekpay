<?php

namespace App\Exceptions;

class WalletNotFoundException extends ApiException
{
    protected $message = 'Wallet not found for the given currency.';
    protected $code = 404;

    public function errorCode(): string
    {
        return 'WALLET_NOT_FOUND';
    }
}