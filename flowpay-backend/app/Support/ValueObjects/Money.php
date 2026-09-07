<?php

namespace App\Support\ValueObjects;

use InvalidArgumentException;

final class Money
{
    private function __construct(
        public readonly int $minorUnits,
        public readonly string $currencyCode,
    ) {
        if ($minorUnits < 0) {
            throw new InvalidArgumentException('Money amount cannot be negative.');
        }
    }

    public static function fromMinorUnits(int $minorUnits, string $currencyCode): self
    {
        return new self($minorUnits, strtoupper($currencyCode));
    }

    /**
     * Create Money from a "human" decimal amount, e.g. "10.50" for USD.
     * $decimalPlaces must come from the currencies table (not hardcoded).
     */
    public static function fromDecimal(string|float $amount, string $currencyCode, int $decimalPlaces): self
    {
        $normalized = bcmul((string) $amount, bcpow('10', (string) $decimalPlaces), 0);

        return new self((int) $normalized, strtoupper($currencyCode));
    }

    public function toDecimalString(int $decimalPlaces): string
    {
        return bcdiv((string) $this->minorUnits, bcpow('10', (string) $decimalPlaces), $decimalPlaces);
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->minorUnits + $other->minorUnits, $this->currencyCode);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        $result = $this->minorUnits - $other->minorUnits;

        if ($result < 0) {
            throw new InvalidArgumentException('Resulting amount cannot be negative.');
        }

        return new self($result, $this->currencyCode);
    }

    public function isGreaterThanOrEqual(self $other): bool
    {
        $this->assertSameCurrency($other);

        return $this->minorUnits >= $other->minorUnits;
    }

    public function isZero(): bool
    {
        return $this->minorUnits === 0;
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currencyCode !== $other->currencyCode) {
            throw new InvalidArgumentException(
                "Currency mismatch: {$this->currencyCode} vs {$other->currencyCode}"
            );
        }
    }
}