<?php

namespace App\Exceptions;

use Exception;

abstract class ApiException extends Exception
{
    abstract public function errorCode(): string;
}