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
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // exchange | deposit | withdrawal
            $table->string('from_currency', 3);
            $table->string('to_currency', 3);
            $table->unsignedBigInteger('source_amount_minor');
            $table->unsignedBigInteger('fee_minor')->default(0);
            $table->decimal('exchange_rate', 20, 10);
            $table->unsignedBigInteger('destination_amount_minor');
            $table->string('status')->default('pending'); // pending | completed | failed
            $table->foreignId('exchange_rate_id')->nullable()->constrained('exchange_rates')->nullOnDelete();
            $table->text('failure_reason')->nullable();
            $table->timestamps();

            $table->foreign('from_currency')->references('code')->on('currencies');
            $table->foreign('to_currency')->references('code')->on('currencies');

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};