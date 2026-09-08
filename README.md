# FlowPay — Multi-Currency Wallet

A full-stack multi-currency wallet application with real-time exchange rates, idempotent transactions, and a clean React frontend.

---

## Screenshots

### Sign In
![Sign In](docs/screenshots/login.png)

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Exchange
![Exchange](docs/screenshots/exchange.png)

### Transactions
![Transactions](docs/screenshots/transactions.png)

### Transaction Detail
![Transaction Detail](docs/screenshots/transaction-detail.png)

### Wallet Detail
![Wallet Detail](docs/screenshots/wallet-detail.png)

---

## Architecture

```
flowpay/
├── flowpay-backend/    # Laravel 13 REST API
└── flowpay-frontend/   # React 19 + Vite SPA
```

### Database Schema

6 tables — Users, Wallets, Currencies, Transactions, ExchangeRates, IdempotencyKeys.

- All monetary values stored as **integers in minor units** (e.g. cents) to avoid floating-point errors
- Exchange rate arithmetic done with PHP **bcmath** for full precision
- **Optimistic locking** (`version` column on wallets) prevents double-spend on concurrent requests
- **Idempotency keys** guarantee exchange requests are processed exactly once

---

## Backend

**Stack:** PHP 8.3 · Laravel 13 · Laravel Sanctum · SQLite · Pest

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

### Project Structure

```
src/
├── api/              # Axios API calls (auth, wallets, exchange, transactions)
├── components/
│   ├── ui/           # Button, Input, Select, Modal, Card, Skeleton, ErrorState, EmptyState
│   └── AppLayout.tsx # Navbar + route outlet
├── features/
│   ├── auth/         # LoginForm, RegisterForm
│   ├── dashboard/    # TotalBalance, WalletList, RecentTransactions
│   ├── exchange/     # ExchangeForm, ExchangePreview, ExchangeConfirmModal
│   ├── wallets/      # WalletCard, WalletDetail
│   └── transactions/ # TransactionTable, TransactionFilters, TransactionDetail
├── hooks/            # useDebounce, useIdempotencyKey
├── pages/            # Route-level page components
├── stores/           # Zustand auth store
└── types/            # TypeScript interfaces (wallet, transaction, exchange, auth)
```

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

## License

MIT
