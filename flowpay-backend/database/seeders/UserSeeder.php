<?php

namespace Database\Seeders;

use App\Models\Currency;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'test@test.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
            ]
        );

        $initialBalances = [
            'USD' => 100000, // 1000.00
            'EUR' => 0,
            'GBP' => 0,
            'AED' => 0,
        ];

        foreach (Currency::where('is_active', true)->get() as $currency) {
            Wallet::firstOrCreate(
                ['user_id' => $user->id, 'currency_code' => $currency->code],
                [
                    'balance_minor' => $initialBalances[$currency->code] ?? 0,
                    'version' => 0,
                ]
            );
        }
    }
}