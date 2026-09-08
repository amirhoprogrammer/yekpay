<?php

namespace Database\Seeders;

use App\Models\Currency;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CurrencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $currencies = [
            ['code' => 'USD', 'name' => 'US Dollar', 'decimal_places' => 2],
            ['code' => 'EUR', 'name' => 'Euro', 'decimal_places' => 2],
            ['code' => 'GBP', 'name' => 'British Pound', 'decimal_places' => 2],
            ['code' => 'AED', 'name' => 'UAE Dirham', 'decimal_places' => 2],
        ];
        
        foreach ($currencies as $currency) {
            Currency::updateOrCreate(
                ['code' => $currency['code']],
                [
                    'name' => $currency['name'],
                    'decimal_places' => $currency['decimal_places'],
                    'is_active' => true,
                ]
            );
        }
    }
}