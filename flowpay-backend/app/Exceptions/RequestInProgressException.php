<?php

namespace App\Exceptions;

class RequestInProgressException extends ApiException
{
    protected $message = 'An identical request is already being processed. Please try again shortly.';
    protected $code = 409;

    public function errorCode(): string
    {
        return 'REQUEST_IN_PROGRESS';
    }
}