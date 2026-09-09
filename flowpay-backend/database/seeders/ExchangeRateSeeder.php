<?php

namespace Database\Seeders;

use App\Models\ExchangeRate;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ExchangeRateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    private const RATES_FROM_USD = [
        'EUR' => '0.9200000000',
        'GBP' => '0.7900000000',
        'AED' => '3.6725000000',
    ];
    public function run(): void
    {
        $validFrom = now()->subDay();
        $rates = $this->buildFullRateMatrix();

        foreach ($rates as $base => $quotes) {
            foreach ($quotes as $quote => $rate) {
                ExchangeRate::create([
                    'base_currency' => $base,
                    'quote_currency' => $quote,
                    'rate' => $rate,
                    'valid_from' => $validFrom,
                ]);
            }
        }
    }
    /**
     * ماتریس کامل نرخ بین همه‌ی جفت‌ارزها را می‌سازد (هر دو جهت،
     * از جمله بین ارزهایی که هیچ‌کدام USD نیستند)، با استفاده از
     * USD به‌عنوان واسطه‌ی محاسبه (Pivot) و دقت کامل bcmath.
     *
     * @return array<string, array<string, string>>
     */
    private function buildFullRateMatrix(): array
    {
        $rates = [];

        // USD -> X و X -> USD
        foreach (self::RATES_FROM_USD as $code => $rate) {
            $rates['USD'][$code] = $rate;
            $rates[$code]['USD'] = bcdiv('1', $rate, 10);
        }

        // بین ارزهای غیر از USD (مثلاً EUR <-> GBP) از طریق USD محاسبه می‌شود
        $nonUsdCurrencies = array_keys(self::RATES_FROM_USD);

        foreach ($nonUsdCurrencies as $base) {
            foreach ($nonUsdCurrencies as $quote) {
                if ($base === $quote) {
                    continue;
                }

                // rate(base -> quote) = rate(base -> USD) × rate(USD -> quote)
                $baseToUsd = $rates[$base]['USD'];
                $usdToQuote = $rates['USD'][$quote];

                $rates[$base][$quote] = bcmul($baseToUsd, $usdToQuote, 10);
            }
        }

        return $rates;
    }
}