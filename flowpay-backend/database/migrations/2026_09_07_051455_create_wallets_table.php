<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('currency_code', 3);
            $table->foreign('currency_code')->references('code')->on('currencies');
            $table->unsignedBigInteger('balance_minor')->default(0);
            $table->unsignedInteger('version')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'currency_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};