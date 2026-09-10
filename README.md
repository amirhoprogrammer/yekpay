# FlowPay — Multi-Currency Wallet & Exchange Platform

A full-stack FinTech application built as a technical assessment. Users can hold balances in multiple currencies, exchange between them at a fee, and review a complete, auditable transaction history.

**Stack:** Laravel 11 (API) · MySQL · React 19 + TypeScript (Vite) · Tailwind CSS

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Key Design Decisions](#key-design-decisions)
4. [API Reference](#api-reference)
5. [Testing](#testing)
6. [Known Limitations & Trade-offs](#known-limitations--trade-offs)
7. [Possible Future Improvements](#possible-future-improvements)

---

## Quick Start

### Backend

```bash
cd flowpay-backend
composer install
cp .env.example .env
php artisan key:generate
```

Configure your database in `.env` (MySQL required):

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=flowpay
DB_USERNAME=root
DB_PASSWORD=secret
```

If you don't have MySQL installed locally, you can run it via Docker:

```bash
docker run --name flowpay-mysql -e MYSQL_ROOT_PASSWORD=secret -e MYSQL_DATABASE=flowpay -p 3306:3306 -d mysql:8
```

Then:

```bash
composer require laravel/sanctum
php artisan install:api
php artisan migrate --seed
php artisan serve
```

Seeding creates:
- 4 currencies: **USD, EUR, GBP, AED**
- Exchange rates in **both directions** for every currency pair (see [Exchange Rate Storage](#3-exchange-rates-are-stored-bidirectionally-and-explicitly) below)
- A demo user: **`test@test.com`** / **`password`**, with a funded USD wallet and empty wallets in the other three currencies

### Frontend

```bash
cd flowpay-frontend
npm install
echo "VITE_API_URL=http://localhost:8000/api" > .env
npm run dev
```

Visit `http://localhost:5173`, register a new account or log in with the demo user above.

---

## Architecture Overview

### Backend layers

**Stack:** PHP 8.3 · Laravel 13 · Laravel Sanctum · SQLite · Pest

```
Controller → FormRequest (validation) → Service (business logic) → Model / Eloquent
```

Financial logic never lives in controllers. All money movement goes through `ExchangeService`, which is the single place responsible for locking, calculating, and persisting an exchange. This keeps controllers thin and lets the core logic be unit-tested without HTTP overhead.

```
app/
├── Http/
│   ├── Controllers/Api/     AuthController, WalletController, TransactionController, ExchangeController
│   ├── Requests/            Form validation (RegisterRequest, CreateExchangeRequest, ...)
│   └── Resources/           API response shaping (TransactionResource, WalletResource)
├── Models/                  User, Wallet, Currency, ExchangeRate, Transaction, IdempotencyKey
├── Services/
│   ├── ExchangeService.php      Orchestrates locking, fee, conversion, atomicity
│   ├── FeeCalculator.php        Isolated, unit-testable fee math
│   ├── CurrencyConverter.php    Rate lookup + conversion
│   └── IdempotencyService.php   Duplicate-request protection
├── Support/ValueObjects/
│   └── Money.php             Immutable, currency-safe amount (integer minor units + bcmath)
└── Exceptions/               ApiException hierarchy → uniform JSON error format
```

### Frontend structure

```
src/
├── api/            One file per resource (auth, wallets, transaction, exchange), all going through a shared axios client
├── stores/         Zustand store for auth session state
├── features/       Feature-scoped components (auth, exchange, wallets, transactions, dashboard)
├── components/ui/  Reusable primitives (Button, Input, Select, Card, Modal, Skeleton, EmptyState, ErrorState)
├── lib/             money.ts (formatting, no business math), cn.ts (Tailwind class merging)
└── pages/          Route-level components
```

---

## Key Design Decisions

These are the ambiguous points the assessment intentionally left open, and the reasoning behind each choice.

### 1. Money is never stored or computed as a float

All monetary amounts are stored as **integers in the currency's smallest unit** (e.g. cents for USD — `$10.50` is stored as `1050`). A `currencies.decimal_places` column drives this per currency, so adding a zero-decimal currency (like JPY) later requires no code change.

Any arithmetic involving a non-integer factor (exchange rates, percentage fees) is done with **`bcmath`**, never native PHP float operators, and rounded back to an integer minor unit at the end. This eliminates floating-point drift entirely — the same reason Stripe and most payment platforms use this pattern.

The `App\Support\ValueObjects\Money` class enforces this everywhere: it's immutable, currency-aware (`add`/`subtract` throw on currency mismatch), and only ever constructed through validated factory methods.

### 2. Fee rounding rounds down (floor), not to nearest

The 0.75% fee is calculated with `bcmul`/`bcdiv`, and the final conversion to an integer minor unit uses truncation (round-down), not round-half-up. For example, a fee that computes to `7.5` minor units becomes `7`, not `8`.

**Trade-off:** this consistently rounds in the platform's favor by a fraction of a cent. This was chosen for implementation simplicity within the assessment's time-box; a production system would make this an explicit, documented business rule (and likely use banker's rounding or round-half-up depending on jurisdiction/compliance requirements).

### 3. Exchange rates are stored bidirectionally and explicitly

Rather than deriving `EUR → USD` at runtime from `USD → EUR` (as `1 / rate`), both directions are stored as separate rows in the `exchange_rates` table. Cross-pair rates (e.g. `EUR → GBP`, where neither currency is USD) are computed once at seed time by pivoting through USD (`rate(EUR→GBP) = rate(EUR→USD) × rate(USD→GBP)`, using `bcmath`) and stored as their own explicit row.

**Why:** every completed transaction stores the `exchange_rate_id` it used, for audit purposes. If rates were derived on the fly, a transaction's rate reference would point to a value that doesn't correspond to any real, timestamped rate record — weakening auditability. The trade-off is more rows to maintain, but the seeder handles this automatically (`ExchangeRateSeeder`), so it costs nothing operationally.

### 4. "Current rate" means the latest row with `valid_from <= now()`

Rates are timestamped (`valid_from`), and multiple historical rates for the same pair can coexist. "The current rate" is defined as the most recent row that has already become valid — future-dated rates are ignored until their time arrives. This gives the system a natural mechanism for scheduling rate changes in advance without any extra code, and preserves full rate history for auditing.

### 5. Concurrency control: pessimistic locking + deterministic lock order

An exchange locks both the source and destination wallets with `SELECT ... FOR UPDATE` inside a single database transaction (`DB::transaction`), so a concurrent request against the same wallet blocks until the first completes — this is what actually prevents a balance from going negative under load, not just a check-then-act pattern.

Wallets are always locked in ascending `id` order, regardless of which currency is "from" and which is "to". This prevents a classic deadlock scenario: two simultaneous requests exchanging in opposite directions (`USD→EUR` and `EUR→USD`) would otherwise each hold one lock while waiting for the other.

The balance-sufficiency check happens **after** acquiring the lock, not before — checking first would leave a window for a race condition (time-of-check to time-of-use).

A `version` column on `wallets` is also incremented on every update, as a defense-in-depth optimistic-locking signal, even though the pessimistic lock is the primary safeguard.

### 6. Idempotency uses an atomic "claim" pattern, not check-then-act

A naive idempotency implementation (check if a key exists → if not, proceed → then save the result) has a race window: two truly simultaneous requests with the same key could both pass the "does it exist?" check before either saves.

Instead, `IdempotencyService::begin()` immediately attempts an `INSERT` with a placeholder row (`response_status = 0`, meaning "in progress"), relying on a **database-level unique constraint** on `(user_id, idempotency_key)` to guarantee only one request can win that insert. The loser catches the constraint violation and either:
- returns the already-completed response (if the winner has finished), or
- throws `RequestInProgressException` (409) if the winner is still processing, or
- throws `DuplicateRequestException` (409) if the same key was reused with a **different** request payload (detected via a SHA-256 hash of the sorted payload).

If the exchange logic itself throws (e.g. insufficient balance), the placeholder row is deleted so the client can safely retry with the same key once the underlying problem is fixed.

### 7. Transactions are created as `pending`, then updated to `completed`, inside the same DB transaction

Even though a single exchange executes synchronously and (from the user's perspective) instantly, a transaction record is created as `pending` and updated to `completed` at the end of the same database transaction — not created directly as `completed`. This anticipates future scenarios (e.g. an async external rate provider) without requiring a schema change, and gives every transaction a coherent state-machine (`pending → completed` / `pending → failed`).

**Documented trade-off:** because this happens inside `DB::transaction()`, if the exchange fails (e.g. `InsufficientBalanceException`), the *entire* transaction — including the `pending` row — is rolled back. This means **failed attempts leave no audit trail** in the `transactions` table by design. A production system wanting to audit failed attempts would log them outside the DB transaction (e.g. to a separate log table or observability system), which was out of scope here.

### 8. Search on transactions targets currency/status/type, not the transaction ID

Transaction IDs are UUIDs (chosen deliberately over auto-increment integers, so IDs are non-guessable — see below). A UUID is not something a user could plausibly type to search for, so the `search` query parameter matches against `from_currency`, `to_currency`, `status`, and `type` instead. This was a conscious trade-off between building a proper short reference-number system (e.g. `TXN-00123`) — which was judged to be over-engineering for the assessment's time-box — versus a `search` parameter with no realistic use case.

### 9. Transaction IDs are UUIDs

`transactions.id` is a UUID, not an auto-incrementing integer. This is a small extra security layer: it prevents a user from guessing at other transactions' IDs by incrementing a number in the URL — even though `TransactionPolicy` already blocks unauthorized access, defense-in-depth is preferred for anything touching financial records.

### 10. Authorization is enforced via Policies, not manual ownership checks

`WalletPolicy` and `TransactionPolicy` centralize the "does this record belong to the current user?" check, invoked via `$this->authorize(...)` in controllers. This is testable in isolation (no HTTP required) and keeps the same rule from being duplicated (and potentially drifting) across multiple controller methods. List endpoints (`GET /wallets`, `GET /transactions`) filter by `user_id` directly at the query level instead, since a Policy is designed to authorize access to a single record, not to scope a collection.

### 11. Centralized exception handling with a consistent error contract

Every API error — from custom domain exceptions, Laravel validation, authentication, authorization, or unexpected failures — is normalized to the same JSON shape:

```json
{ "message": "...", "code": "MACHINE_READABLE_CODE", "errors": null }
```

`code` is a stable identifier the frontend can safely branch on (e.g. `INSUFFICIENT_BALANCE`); `message` is human-readable and free to change or be localized later. All custom exceptions extend an abstract `ApiException` base class, so the handler only needs one rule to catch all of them, rather than enumerating each exception type by hand.

---

## API Reference

All endpoints are prefixed with `/api`. Authenticated endpoints require `Authorization: Bearer <token>` (Laravel Sanctum tokens).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | – | Create an account, returns a token |
| POST | `/auth/login` | – | Returns a token |
| POST | `/auth/logout` | ✓ | Revokes the current token only |
| GET | `/me` | ✓ | Current authenticated user |
| GET | `/wallets` | ✓ | List the user's wallets + total balance (converted to USD) |
| GET | `/wallets/{id}` | ✓ | Single wallet (403 if not owned) |
| GET | `/exchange-rates` | ✓ | Current exchange rates |
| POST | `/exchanges/preview` | ✓ | Computes rate/fee/received amount without persisting anything |
| POST | `/exchanges` | ✓ | Executes an exchange. **Requires an `Idempotency-Key` header** |
| GET | `/transactions` | ✓ | Paginated, filterable (`status`, `type`, `currency`, `date_from`, `date_to`, `search`) |
| GET | `/transactions/{id}` | ✓ | Single transaction (403 if not owned) |

**Error format** (all non-2xx responses):
```json
{ "message": "Insufficient balance to complete this exchange.", "code": "INSUFFICIENT_BALANCE", "errors": null }
```

---

## Testing

Backend tests use **Pest**. 23 automated tests cover the core financial logic:

```bash
cd flowpay-backend
php artisan test
```

| Suite | Focus |
|---|---|
| `FeeCalculatorTest` | Fee math correctness and rounding behavior, in isolation |
| `CurrencyConverterTest` | Rate lookup, historical/future rate filtering |
| `ExchangeTest` | Full exchange flow: debit/credit correctness, atomic rollback on failure, validation exceptions |
| `ConcurrentExchangeTest` | Sequential rapid-call safety, wallet `version` incrementing (see limitation below) |
| `IdempotencyTest` | Duplicate-key handling, in-progress detection, payload-mismatch detection, full HTTP round-trip |

Manual end-to-end verification was performed throughout development via `curl` and the browser UI, including registration, login/logout, exchange (same-currency-pair and cross-pair via USD pivot), wallet listing, transaction filtering, and authorization boundary checks (attempting to access another user's wallet/transaction).

---

## Known Limitations & Trade-offs

Documented honestly, as several were explicit time-boxed decisions rather than oversights:

- **No automated test for true concurrent (simultaneous) requests.** The test suite runs against an in-memory SQLite database, which cannot meaningfully simulate two parallel database connections racing against each other. `ConcurrentExchangeTest` instead verifies that rapid *sequential* calls never push a balance negative, and that the `version` column increments correctly — a weaker but still useful guarantee. The actual concurrency-safety mechanism (`lockForUpdate` + deterministic lock ordering, described above) was manually verified by issuing two overlapping `curl` requests against the real MySQL database during development, but this isn't captured in the automated suite.
- **Failed exchange attempts are not persisted.** As explained above, a failed attempt is rolled back entirely, including its `pending` transaction row. There's no audit trail of *why* an exchange failed unless it's observed at the time (e.g. via application logs).
- **Only `exchange`-type transactions are actually implemented.** The `transactions.type` column and frontend types support `deposit` and `withdrawal` as future-facing values, but no endpoint currently creates them — wallets can currently only be funded via direct database/seeder access (there's no top-up flow).
- **The frontend assumes every currency has exactly 2 decimal places.** This matches all 4 seeded currencies (USD, EUR, GBP, AED), but is hardcoded in `lib/money.ts` rather than read dynamically from the currency's `decimal_places` field returned by the API. A currency like JPY (0 decimal places) would display incorrectly until that's made dynamic.
- **Total balance is always expressed in USD.** There's no per-user preference for a different base display currency; this was deferred as a "nice to have" rather than a core requirement.
- **Exchange rates are static seed data**, not sourced from a live market-rate API. This was an explicit, in-scope simplification — the task doesn't require live rates, and the rate-storage/lookup architecture is designed to make swapping in a real provider straightforward later (a scheduled job could simply insert new `exchange_rates` rows).
- **The `search` filter on transactions is a best-effort match** across currency/status/type text, not a dedicated reference-number search (see Design Decision #8).
- **No Docker/CI-CD setup** for the full application (only used ad hoc, locally, to run MySQL) — listed in the assessment as optional/bonus.
- **Double-entry ledger** (the optional bonus) was not implemented; the current model tracks wallet balances directly rather than through debit/credit ledger entries.

---

## Possible Future Improvements

- Promote transaction `status`/`type` string literals to a proper PHP enum for type safety and IDE autocomplete.
- Add a real concurrency test suite that runs against MySQL with multiple actual connections (e.g. via separate PHP processes or a dedicated integration-test environment), rather than relying on manual verification.
- Log failed exchange attempts to a separate, non-transactional store for auditing.
- Make currency decimal-place handling fully dynamic on the frontend.
- Add a scheduled job to refresh exchange rates from a real provider.
- Implement a double-entry ledger for stronger financial auditability.
- Add deposit/withdrawal flows so wallets can be funded without direct database access.

این فایل مستندات معماری، طراحی دیتابیس، Backend، Frontend، API و روش‌های تست پروژه YekPay را بر اساس مستندات پروژه ارائه می‌کند.

## معماری و اصول اصلی
حالا بذارید معماری کلی و ساختار دیتابیس رو نشونتون بدم:

![database_1]( https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182803.png)
![database_2]( https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182812.png)

چند نکته کلیدی درباره این طراحی:

- تمام مقادیر پولی به صورت **اعداد صحیح در واحدهای جزئی** (مثلاً سنت) ذخیره می‌شوند تا از خطاهای ممیز شناور جلوگیری شود.
- محاسبات نرخ ارز با PHP **bcmath** برای دقت کامل انجام می‌شود.
- **قفل خوش‌بینانه** (ستون `version` در کیف پول‌ها) از خرج کردن دوباره در درخواست‌های همزمان جلوگیری می‌کند.
- **کلیدهای Idempotency** تضمین می‌کنند که درخواست‌های مبادله دقیقاً یک بار پردازش می‌شوند.
چرا currencies یک جدول جداست، نه Enum؟
اضافه‌کردن ارز جدید صرفاً یک ردیف INSERT می‌شه، بدون تغییر در کد یا Migration جدید. این دقیقاً همون چیزیه که تست ازتون می‌خواد ("اضافه‌کردن Currency جدید نیازمند تغییرات اساسی در معماری نباشد").

چرا exchange_rate هم توی transactions ذخیره می‌شه؟
چون نرخ ممکنه بعداً تغییر کنه، ولی تراکنش تکمیل‌شده باید نرخِ لحظه‌ی انجامش رو برای همیشه نگه داره (Auditability). این جواب به یکی از سوالات صریح متن تسته.

فیلد version روی wallets برای چیه؟
برای Optimistic Locking به عنوان یک لایه‌ی دفاعی اضافه — توضیح کامل‌ترش رو در بخش Concurrency زیر می‌دم.

idempotency_keys چطور کار می‌کنه؟
کلاینت با هر درخواست POST /api/exchanges یک هدر Idempotency-Key (مثلاً UUID تولیدشده در Frontend) می‌فرسته. روی (user_id, idempotency_key) یک Unique Index می‌ذارید. اگر همون کلید دوباره اومد (دبل‌کلیک یا Retry شبکه)، سرور به جای اجرای مجدد Exchange، همون response_body ذخیره‌شده رو برمی‌گردونه.

backend/

├── app/

│   ├── Http/

│   │   ├── Controllers/Api/

│   │   │   ├── AuthController.php

│   │   │   ├── WalletController.php

│   │   │   ├── ExchangeRateController.php

│   │   │   ├── ExchangeController.php

│   │   │   └── TransactionController.php

│   │   ├── Requests/

│   │   │   ├── Auth/RegisterRequest.php

│   │   │   ├── Auth/LoginRequest.php

│   │   │   ├── CreateExchangeRequest.php

│   │   │   └── TransactionIndexRequest.php

│   │   ├── Resources/

│   │   │   ├── WalletResource.php

│   │   │   ├── TransactionResource.php

│   │   │   └── ExchangeRateResource.php

│   │   └── Middleware/

│   │       └── EnsureIdempotencyKey.php

│   ├── Models/

│   │   ├── User.php

│   │   ├── Wallet.php

│   │   ├── Currency.php

│   │   ├── ExchangeRate.php

│   │   ├── Transaction.php

│   │   └── IdempotencyKey.php

│   ├── Services/

│   │   ├── ExchangeService.php          # منطق اصلی تبدیل ارز (Lock, Fee, Rollback)

│   │   ├── FeeCalculator.php

│   │   ├── CurrencyConverter.php

│   │   └── IdempotencyService.php

│   ├── Support/ValueObjects/

│   │   └── Money.php                     # Wrapper روی minor units + currency code

│   └── Exceptions/

│       ├── InsufficientBalanceException.php

│       ├── InvalidCurrencyException.php

│       ├── SameCurrencyExchangeException.php

│       └── DuplicateRequestException.php

├── database/

│   ├── migrations/

│   └── seeders/

│       ├── CurrencySeeder.php

│       └── ExchangeRateSeeder.php

├── routes/api.php

└── tests/

├── Feature/

│   ├── ExchangeTest.php

│   ├── ConcurrentExchangeTest.php

│   └── IdempotencyTest.php

└── Unit/

├── FeeCalculatorTest.php

└── CurrencyConverterTest.php

## ساختار فرانت اند

frontend/

├── src/

│   ├── api/

│   │   ├── client.ts              # axios instance + interceptors (401 handling)

│   │   ├── auth.ts

│   │   ├── wallets.ts

│   │   ├── exchange.ts

│   │   └── transactions.ts

│   ├── features/

│   │   ├── auth/ (LoginForm, RegisterForm, useAuth hook)

│   │   ├── dashboard/ (TotalBalance, WalletList, RecentTransactions)

│   │   ├── wallets/ (WalletCard, WalletDetail)

│   │   ├── exchange/ (ExchangeForm, ExchangePreview, ExchangeConfirmModal)

│   │   └── transactions/ (TransactionTable, TransactionFilters, TransactionDetail)

│   ├── components/ui/             # Button, Input, Modal, Skeleton, ErrorState, EmptyState

│   ├── hooks/ (useDebounce, useIdempotencyKey)

│   ├── types/ (wallet.ts, transaction.ts, exchange.ts)

│   └── pages/ (یا routes/ اگر Next.js)

نکته معماری: منطق مالی (Lock گرفتن، محاسبه‌ی Fee، Rollback) داخل Controller نیست — همه توی ExchangeService هست. Controller فقط Validate می‌کنه، Service صدا می‌زنه، و Resource برمی‌گردونه. این باعث می‌شه تست‌نویسی روی منطق مالی بدون نیاز به HTTP request ساده باشه.

## لیست دقیق API
![Api_list](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-09%20114052.png)ا
## Screenshots

### Sign In
![Sign In](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-09%20161352.png)

### Dashboard
![Dashboard](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-09%20161415.png)

### Exchange
![Exchange](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-09%20161632.png)

### Transactions
![Transactions](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-09%20161448.png)

### Transaction Detail
![Transaction Detail](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-09%20161521.png)

### Wallet Detail
![Wallet Detail](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-09%20161559.png)

### Setup

```bash
cd flowpay-backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve   # runs on http://localhost:8000
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns Bearer token |
| POST | `/api/auth/logout` | ✓ | Revoke token |
| GET | `/api/me` | ✓ | Authenticated user info |
| GET | `/api/wallets` | ✓ | List wallets + total balance |
| GET | `/api/wallets/{id}` | ✓ | Single wallet detail |
| POST | `/api/exchanges/preview` | ✓ | Preview exchange (rate, fee, destination amount) |
| POST | `/api/exchanges` | ✓ | Execute exchange (idempotent via `Idempotency-Key` header) |
| GET | `/api/transactions` | ✓ | List transactions (filterable by type, status, currency) |
| GET | `/api/transactions/{id}` | ✓ | Single transaction detail |

### Key Services

- **ExchangeService** — orchestrates rate lookup, fee calculation, bcmath arithmetic, wallet balance update with optimistic locking, and transaction recording
- **CurrencyConverter** — converts amounts between currencies using stored exchange rates
- **FeeCalculator** — calculates exchange fees (0.75% of source amount)
- **IdempotencyService** — deduplicates POST requests using hashed request body + key

### Running Tests

```bash
php artisan test
# or
vendor/bin/pest
```

Test coverage includes: authentication, exchange flow, concurrent exchange (race condition), idempotency, currency conversion, fee calculation.

---

## Frontend

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS · Zustand · Axios · React Router v7 · Sonner

### Setup

```bash
cd flowpay-frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:8000/api
npm run dev            # runs on http://localhost:5173
```

### Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | DashboardPage | Total balance, wallet list, recent transactions |
| `/exchange` | ExchangePage | Currency exchange with live preview |
| `/wallets/:id` | WalletDetailPage | Wallet balance + transaction history |
| `/transactions` | TransactionsPage | Filterable paginated transaction list |
| `/transactions/:id` | TransactionDetailPage | Full transaction breakdown |
| `/login` | LoginPage | Email/password sign in |
| `/register` | RegisterPage | New account creation |

### Notable Design Decisions

- **Auth hydration** — on app load, the token is verified against `/api/me` before any redirect, preventing stale-token flicker
- **Idempotency keys** — generated client-side per exchange attempt, reset on field change to avoid replaying stale requests
- **Debounced exchange preview** — 400ms debounce + request cancellation via cleanup flag prevents stale preview results
- **Minor-unit amounts** — all monetary display goes through `formatMoney()` in `lib/money.ts`, never raw floats

---

## Supported Currencies

| Code | Name |
|------|------|
| USD | US Dollar |
| EUR | Euro |
| GBP | British Pound |
| AED | UAE Dirham |

---
## Run 

with the account in .env.example 

## License

Amirhossein Aminegareshi
