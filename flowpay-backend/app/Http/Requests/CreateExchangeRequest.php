<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class CreateExchangeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; 
    }

    ///**
    // * Get the validation rules that apply to the request.
    // *
    // * @return array<string, ValidationRule|array<mixed>|string>
    // */
    public function rules(): array
    {
        return [
            'from_currency' => [
                'required',
                'string',
                'size:3',
                Rule::exists('currencies', 'code')->where('is_active', true),
            ],
            'to_currency' => [
                'required',
                'string',
                'size:3',
                'different:from_currency',
                Rule::exists('currencies', 'code')->where('is_active', true),
            ],
            'amount' => [
                'required',
                'string',
                'regex:/^\d+(\.\d{1,10})?$/',
            ],
        ];
    }
    public function messages(): array
    {
        return [
            'to_currency.different' => 'Source and destination currency must be different.',
            'amount.regex' => 'Amount must be a valid positive decimal number.',
        ];
    }
}