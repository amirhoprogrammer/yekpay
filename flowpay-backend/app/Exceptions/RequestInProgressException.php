<?php

namespace App\Exceptions;

use Exception;

class RequestInProgressException extends Exception
{
    protected $message = 'An identical request is already being processed. Please try again shortly.';
    protected $code = 409;

    public function errorCode(): string
    {
        return 'REQUEST_IN_PROGRESS';
    }
}