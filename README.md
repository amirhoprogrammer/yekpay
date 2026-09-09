# YekPay — Currency Exchange Platform

این فایل مستندات معماری، طراحی دیتابیس، Backend، Frontend، API و روش‌های تست پروژه YekPay را بر اساس مستندات پروژه ارائه می‌کند.

## معماری و اصول اصلی

برای مدیریت اعداد مالی، بهترین و رایج‌ترین روش (که Stripe و اکثر پلتفرم‌های FinTem استفاده می‌کنن) اینه:

ذخیره به صورت Integer در کوچکترین واحد پول (Minor Units) — یعنی به جای 10000.50 دلار، عدد 1000050 سنت رو ذخیره کنید (BIGINT در MySQL). این کاملاً خطای Floating Point رو حذف می‌کنه چون هیچ عملیات اعشاری روی balance انجام نمی‌گیره. برای هر ارز، تعداد اعشار (decimal_places) رو توی جدول currencies نگه می‌دارید (اکثر ارزها ۲ رقم، بعضی مثل JPY صفر رقم دارن) — این باعث می‌شه اضافه‌کردن ارز جدید فقط یک INSERT باشه، نه تغییر کد.

فقط جایی که واقعاً نیاز به اعشار دارید (ضرب در نرخ تبدیل) از bcmath یا کتابخانه brick/money در PHP استفاده می‌کنید و در نهایت نتیجه رو Round کرده و به Integer برمی‌گردونید — با یک استراتژی Rounding مشخص و مستند (مثلاً Round Half Up در سطح کوچکترین واحد).

حالا بذارید معماری کلی و ساختار دیتابیس رو نشونتون بدم:

![database_1]

( https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182803.png)

![database_2]

( https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182812.png)

چند نکته کلیدی درباره این طراحی:

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

## نکات طراحی API

چرا POST /api/exchanges به جای دو مرحله (preview + confirm) جدا نیست؟
پیشنهادم اینه که یک endpoint جدا برای Preview هم اضافه کنید تا نرخ و Fee رو بدون اجرای واقعی نشون بدید:

Frontend اول preview رو صدا می‌زنه (برای صفحه‌ی تأیید)، و فقط وقتی کاربر روی «Confirm» کلیک کرد، POST /api/exchanges واقعی با Idempotency-Key ارسال می‌شه.

فرمت خطا (طبق چیزی که تست خواسته):

json

{

"message": "Insufficient USD balance.",

"code": "INSUFFICIENT_BALANCE",

"errors": null

}

یک Handler مرکزی توی Laravel تمام Exceptionهای سفارشی (InsufficientBalanceException و بقیه) رو به این فرمت تبدیل می‌کنه، به جای برگردوندن Stack Trace خام یا 500.

Authorization در سطح Route:
هر endpoint که به {id} نیاز داره (wallets/{id}, transactions/{id}) باید با Laravel Policy چک کنه که wallet.user_id === auth()->id() یا transaction.user_id === auth()->id() — در غیر این صورت 403 برگردونه، نه اینکه صرفاً از دیتابیس فیلتر نشه.

## فایل های دیتابیس migrate

Table:currencies -> create_currencies

### چرا این‌طوری؟

code به عنوان Primary Key (نه یک id عددی جدا): چون کد ارز (USD, EUR) خودش یکتا و معنادار هست و توی جداول دیگه (wallets, transactions) راحت‌تر به‌عنوان Foreign Key استفاده می‌شه بدون نیاز به Join اضافه برای گرفتن کد ارز.

decimal_places: چون ارزهایی مثل ین ژاپن (JPY) اصلاً اعشار ندارن، ولی اکثر ارزها ۲ رقم اعشار دارن. این فیلد باعث می‌شه منطق تبدیل Minor Units ↔ Display Amount کاملاً Data-Driven باشه، نه Hardcode.

is_active: برای اینکه بتونید بعداً یک ارز رو بدون حذف کامل از دیتابیس، موقتاً غیرفعال کنید (مثلاً برای تعمیرات یا توقف موقت پشتیبانی از یک ارز).

Table:Wallets ->create_Wallets

### چرا این‌طوری؟

چرا balance_minor به‌جای balance با اعشار؟
همون‌طور که قبلاً توضیح دادم — Integer در کوچکترین واحد پول (مثلاً سنت برای USD)، تا هیچ خطای Floating Point توی محاسبات مالی پیش نیاد. مقدار نمایشی ($100.00) رو موقع نمایش در Frontend یا API Resource، با استفاده از decimal_places همون ارز از روی balance_minor محاسبه می‌کنیم.

چرا unsignedBigInteger (نه integer معمولی)؟
چون Integer معمولی حداکثر حدود ۲.۱ میلیارد رو پشتیبانی می‌کنه که برای واحدهای خیلی کوچک پول (مثل سنت) با موجودی‌های بزرگ ممکنه کافی نباشه؛ unsignedBigInteger این ریسک رو از بین می‌بره. unsigned هم هست چون موجودی هیچ‌وقت نباید منفی باشه.

چرا unique(['user_id', 'currency_code'])؟
تا از لحاظ دیتابیسی (نه فقط منطق برنامه) تضمین بشه هر کاربر برای هر ارز فقط یک Wallet داره — دو بار Wallet با همون ارز برای یک کاربر ساخته نمی‌شه، حتی اگه یه باگ توی کد Application باشه.

فیلد version چیه؟
یک لایه‌ی دفاعی اضافه برای Concurrency، به‌نام Optimistic Locking. وقتی می‌خوایم موجودی رو Update کنیم، Query رو این‌طوری می‌نویسیم:

این جدا از lockForUpdate() (که در سطح Transaction دیتابیس قفل می‌گیره) یک لایه‌ی اضافه‌ست؛ در عمل توی ExchangeService از lockForUpdate() به‌عنوان مکانیزم اصلی استفاده می‌کنیم چون قوی‌تره، ولی وجود version بی‌ضرره و برای مستندسازی/دفاع بیشتر خوبه.

چرا foreign('currency_code') جدا نوشته شده، نه با constrained()؟
چون constrained() به‌صورت پیش‌فرض انتظار داره ستونی که بهش وصل می‌شه id باشه، ولی اینجا Primary Key جدول currencies رشته‌ی code هست، پس باید صریح مشخص کنیم references('code').

Table: exchange_rates -> create_ exchange_rates

### چرا این‌طوری؟

چرا decimal(20, 10) برای نرخ ارز؟
نرخ تبدیل بین دو ارز، برخلاف موجودی Wallet، خودش ذاتاً یک عدد اعشاری دقیقه (مثلاً 1 USD = 0.9234567891 EUR). اینجا برخلاف balance_minor که Integer بود، از DECIMAL دیتابیس استفاده می‌کنیم چون:

MySQL نوع DECIMAL رو به‌صورت دقیق (نه Floating Point تقریبی) ذخیره می‌کنه.

۱۰ رقم اعشار کافیه که حتی نرخ‌های خیلی دقیق (بین ارزهایی با تفاوت ارزش زیاد) رو بدون گرد کردن زودهنگام نگه داره.

چرا valid_from به‌جای فقط یک نرخ ثابت؟
چون در تست صراحتاً پرسیده «نرخ ارز چقدر باید معتبر باشه؟» — این طراحی به شما اجازه می‌ده تاریخچه‌ی نرخ‌ها رو نگه دارید (هر بار نرخ جدید میاد، یک ردیف جدید اضافه می‌کنید، نه Update رکورد قبلی). این‌طوری:

همیشه می‌تونید با ORDER BY valid_from DESC LIMIT 1 آخرین نرخ معتبر رو پیدا کنید.

اگه بعداً بخواید ببینید یک تراکنش با چه نرخی انجام شده (Audit)، تاریخچه‌ش موجوده.

چرا Composite Index روی (base_currency, quote_currency, valid_from)؟
چون رایج‌ترین Query‌ای که روی این جدول می‌زنید دقیقاً همینه: «آخرین نرخ معتبر بین این دو ارز چیه؟» — این ایندکس این Query رو خیلی سریع می‌کنه، به‌خصوص وقتی جدول با گذر زمان بزرگ بشه.

نکته‌ی مهم برای تصمیم محصولی که خودتون توی README باید مستند کنید:
باید تصمیم بگیرید نرخ «معتبر» یعنی چی — مثلاً «آخرین ردیفی که valid_from <= NOW() باشه» یا اینکه نرخ‌ها فقط چند دقیقه اعتبار دارن و بعدش باید Refresh بشن. برای این پروژه (چون واقعاً به API خارجی وصل نمی‌شیم)، پیشنهاد من اینه: یک Seeder بسازیم که چندتا نرخ ثابت (mock) رو Seed کنه و همیشه همون آخرین ردیف رو به‌عنوان نرخ فعلی استفاده کنیم — ساده و کافیه برای این سطح از تست.

Table: transactions ->create_ transactions

### چرا این‌طوری؟

چرا id از نوع UUID، نه Auto-increment معمولی؟
برای تراکنش‌های مالی، بهتره شناسه‌ها غیرقابل‌حدس باشن. با Auto-increment، یک کاربر می‌تونه با تغییر عدد توی URL (/transactions/1234 → /transactions/1235) حدس بزنه تراکنش‌های بقیه کجان (حتی اگه Policy جلوی دسترسی رو بگیره، بهتره از اول قابل‌حدس نباشه). این یه لایه‌ی امنیتی اضافه‌ست، نه جایگزین Authorization.

چرا هم exchange_rate (مقدار) هم exchange_rate_id (لینک به رکورد نرخ) رو نگه می‌داریم؟

exchange_rate: مقدار واقعی نرخی که استفاده شده، برای همیشه ثابت می‌مونه، حتی اگه بعداً رکورد exchange_rates حذف یا Update بشه (Denormalization عمدی برای Audit).

exchange_rate_id: لینک برای Traceability — اگه خواستید بدونید این نرخ از کدوم رکورد اومده.

چرا failure_reason؟
وقتی یک Exchange به هر دلیلی (مثلاً موجودی ناکافی) Fail می‌شه، به‌جای اینکه فقط status = 'failed' بذاریم و دلیلش رو گم کنیم، این پیام رو ذخیره می‌کنیم — هم برای نمایش خطا به کاربر، هم برای دیباگ بعدی.

چرا دو تا Composite Index جدا؟

(user_id, created_at): برای لیست تاریخچه‌ی تراکنش‌های یک کاربر، Sort شده بر اساس تاریخ (دقیقاً همون Query که صفحه‌ی Dashboard و History می‌زنه).

(user_id, status): برای فیلتر کردن سریع (مثلاً «فقط تراکنش‌های Pending من رو نشون بده»).

⚠️ نکته‌ی مهم: چون id این جدول از نوع UUID هست (نه عددی Auto-increment)، وقتی بعداً مدل Transaction رو می‌سازیم، باید صریح به Eloquent بگیم که Key از نوع String هست و Auto-increment نیست — این کار رو در مرحله‌ی نوشتن مدل انجام می‌دیم.

Table: idempotency_keys -> create_ idempotency_keys

### چرا این‌طوری؟

چرا unique(['user_id', 'idempotency_key'])؟
این خط دقیقاً همون تضمینیه که کل مکانیزم Idempotency رو محکم می‌کنه. حتی اگه دو تا Request کاملاً همزمان (Race Condition) با همون کلید به سرور برسن، دیتابیس خودش جلوی درج دوتایی رو می‌گیره — یکی موفق می‌شه، اون یکی با خطای Unique Constraint مواجه می‌شه و کد ما اون خطا رو می‌گیره و پاسخ ذخیره‌شده رو برمی‌گردونه. این خیلی قوی‌تر از چک‌کردن صرفاً در سطح Application (مثل if (exists) return;) هست، چون اون روش زیر بار همزمانی شکست می‌خوره.

چرا user_id هم توی این Unique هست، نه فقط idempotency_key؟
چون کلید Idempotency رو کلاینت (Frontend) تولید می‌کنه، ممکنه دو کاربر مختلف تصادفاً (یا با کد باگ‌دار) یک UUID یکسان بفرستن. با محدود کردنش به هر کاربر، از تداخل بین کاربرهای مختلف هم جلوگیری می‌شه.

چرا request_hash رو هم نگه می‌داریم؟
یک لایه‌ی محافظتی اضافه: اگه یک کلاینت (به اشتباه یا بدخواهانه) همون Idempotency-Key رو با بدنه‌ی درخواست متفاوت دوباره بفرسته (مثلاً دفعه‌ی اول تبدیل ۱۰۰ دلار، دفعه‌ی دوم با همون کلید ۵۰۰ دلار)، با مقایسه‌ی request_hash می‌تونیم این ناهماهنگی رو تشخیص بدیم و خطای مشخص برگردونیم، نه اینکه بی‌صدا نتیجه‌ی اشتباه (تراکنش اول) رو برگردونیم.

چرا response_body و response_status رو کامل ذخیره می‌کنیم، نه فقط یک Flag؟
چون هدف Idempotency اینه که اگه Request تکراری اومد، دقیقاً همون پاسخ اولی (با همون Status Code و همون Body) برگرده — نه اینکه دوباره منطق Exchange اجرا بشه یا پاسخ متفاوتی بسازیم.

## حالا در مدل user تغییر میدیم

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

use Illuminate\Foundation\Auth\User as Authenticatable;

use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable

{

use HasApiTokens, HasFactory, Notifiable;

// ... بقیه‌ی فایل بدون تغییر

}

این Trait به مدل User متدهایی مثل createToken() می‌ده که در AuthController برای صدور Token بعد از Login/Register استفاده می‌کنیم.

بعد از این تغییر، دیگه Backend کاملاً آماده‌ست که بریم سراغ نوشتن مدل‌های اصلی (Wallet, Currency, Transaction, ...) و Money Value Object. آماده‌اید؟

## مدل app/Support/ValueObjects/Money.php

چرا این‌طوری طراحیش کردم؟

چرا readonly و بدون Setter (Immutable)؟
یک شیء Money بعد از ساخته‌شدن هیچ‌وقت نباید تغییر کنه. عملیات‌هایی مثل add/subtract به‌جای تغییر خود شیء، یک شیء جدید برمی‌گردونن. این جلوی یک دسته کامل از باگ‌های مالی رو می‌گیره — مثلاً اینکه یک متد ناخواسته موجودی رو تغییر بده بدون اینکه صریح Assign بشه.

چرا Constructor خصوصیه و باید از fromMinorUnits/fromDecimal استفاده کنیم؟
برای اینکه هیچ‌وقت نتونید یک Money نامعتبر (مثلاً منفی یا بدون Currency) بسازید — تمام مسیرهای ساخت شیء از Validation عبور می‌کنن.

چرا از bcmul/bcdiv/bcpow (توابع BCMath) استفاده شده، نه فقط * یا /؟
چون حتی تبدیل بین Decimal String و Integer اگه با عملیات معمولی PHP (*, /) انجام بشه، ممکنه به خاطر نحوه‌ی نمایش اعداد اعشاری در حافظه (IEEE 754) خطای گرد کردن ایجاد کنه. توابع bc* محاسبات رو روی رشته انجام می‌دن و کاملاً دقیق‌ان — دقیقاً برای همین اینجا استفاده شدن.

چرا assertSameCurrency قبل از هر عملیات؟
تا از اشتباه‌های منطقی فاجعه‌بار جلوگیری بشه — مثلاً جمع کردن ۱۰۰ دلار با ۵۰ یورو بدون تبدیل، که یک باگ مالی خیلی جدیه. این چک، خطا رو در همون لحظه، نه بعداً، آشکار می‌کنه.

نکته‌ی مهم درباره‌ی این کلاس: این کلاس عمداً هیچ اطلاعی از decimal_places نداره به‌صورت داخلی. شما هر بار که می‌خواید Money رو نمایش بدید (toDecimalString) یا از روی یک عدد اعشاری بسازید (fromDecimal)، باید decimal_places رو از جدول currencies بگیرید و صریح پاس بدید. این باعث می‌شه این کلاس کاملاً مستقل و قابل تست باشه، بدون وابستگی به دیتابیس.

## مدل app/Models/Currency.php

چرا این تنظیمات؟

چرا $incrementing = false و $keyType = 'string'؟
چون Primary Key این جدول code (رشته‌ای مثل "USD") هست، نه یک عدد Auto-increment. اگه این دو خط رو ننویسید، Eloquent فرض می‌کنه Primary Key از نوع عدد Auto-increment هست و در Query‌هایی مثل Currency::find('USD') یا موقع Update رفتار اشتباهی نشون می‌ده (سعی می‌کنه 'USD' رو به عدد تبدیل کنه).

چرا casts() به‌جای آرایه‌ی قدیمی $casts؟
در نسخه‌های اخیر Laravel (۱۱+)، نوشتن casts() به‌عنوان متد به‌جای Property، روش پیشنهادی و رسمیه — همون کارکرد قبلی رو داره، فقط استایل جدیدتره.

چرا این wallets() Relationship رو نوشتیم؟
برای این‌که بعداً بتونید راحت بنویسید $currency->wallets و همه‌ی Walletهایی که با این ارز کار می‌کنن رو بگیرید — مثلاً برای گزارش‌گیری («چند نفر کیف‌پول AED دارن؟»).

آماده‌اید بریم سراغ مدل Wallet

## مدل app/Models/Wallet.php

چرا این تنظیمات؟

چرا currency() نوشته شده با پارامترهای صریح 'currency_code', 'code'؟
چون به‌صورت پیش‌فرض، Eloquent فرض می‌کنه Foreign Key دنبال ستونی به اسم currency_id باشه که به id جدول currencies وصل بشه. ولی همون‌طور که یادتونه، جدول currencies به‌جای id، از code به‌عنوان Primary Key استفاده می‌کنه — پس باید صریح بگیم Foreign Key محلی (currency_code) به کدوم ستون از جدول مقصد (code) وصل می‌شه.

## مدل app/Models/Transaction.php

چرا این تنظیمات؟

HasUuids چیه؟
یک Trait آماده‌ی خود Laravel که خودکار موقع ساخت رکورد جدید (Transaction::create(...))، یک UUID تصادفی برای فیلد id تولید می‌کنه — دیگه نیازی نیست خودتون دستی Str::uuid() صدا بزنید. دقیقاً چیزیه که برای Primary Key از نوع UUID لازمه.

چرا $incrementing = false و $keyType = 'string' هنوزم لازمه با وجود HasUuids؟
چون HasUuids فقط مسئول تولید مقدار UUID هست، ولی به Eloquent هنوز باید بگیم که این کلید Auto-increment (عددی) نیست، وگرنه در Query‌های Update/Delete رفتار اشتباه می‌کنه.

چرا 'exchange_rate' => 'decimal:10'؟
تا وقتی این فیلد رو از دیتابیس می‌خونید، Eloquent به‌جای Float معمولی PHP، به‌صورت رشته‌ی دقیق با ۱۰ رقم اعشار برگردونه (مطابق دقتی که در Migration تعریف کردیم) — این از خطای گرد کردن موقع خوندن مقدار هم جلوگیری می‌کنه.

چرا متدهای isPending(), isCompleted(), isFailed()؟
اینا صرفاً برای خوانایی کد در جاهای دیگه‌ست — به‌جای این‌که همه‌جا بنویسید $transaction->status === 'completed' (که مستعد Typo هست)، می‌نویسید $transaction->isCompleted(). یه تمرین خوب برای کد تمیزتر، مخصوصاً وقتی چند نفر روی پروژه کار می‌کنن.

نکته: مقادیر 'pending', 'completed', 'failed' رو مستقیم به‌صورت رشته نوشتم، ولی برای پروژه‌ی واقعی‌تر می‌تونید یک PHP Enum بسازید (App\Enums\TransactionStatus) تا این مقادیر Type-safe بشن و IDE هم Autocomplete بده. اگه خواستید، می‌تونیم بعداً این Refactor رو هم انجام بدیم — فعلاً برای سادگی همین رشته‌ها کافیه.

## مدل app/Models/ExchangeRate.php

چرا این تنظیمات؟

چرا متد استاتیک latestRate() رو مستقیم روی مدل نوشتیم؟
چون این دقیقاً همون Query تکراری‌ایه که هر بار برای پیدا کردن «نرخ فعلی معتبر» لازم داریم (هم در Preview، هم در Exchange واقعی). نوشتنش یک‌جا روی مدل باعث می‌شه در ExchangeService فقط بنویسیم:

php

$rate = ExchangeRate::latestRate('USD', 'EUR');

به‌جای این‌که هر بار Query کامل رو تکرار کنیم.

چرا where('valid_from', '<=', now())؟
این دقیقاً همون تصمیم محصولی‌ایه که قبلاً بهش اشاره کردیم — تعریف ما از «نرخ معتبر» اینه: آخرین نرخی که valid_fromش گذشته یا الان باشه (نه نرخی که برای آینده تنظیم شده). این تصمیم رو باید توی README مستند کنید.

## مدل app/Models/IdempotencyKey.php

نکات هر Execption

### چرا این‌طوری؟

چرا هر Exception یک errorCode() جدا از پیام معمولی داره؟
چون طبق طراحی API که قبلاً توافق کردیم، پاسخ خطا باید این فرمت رو داشته باشه:

json

{"message": "...", "code": "INSUFFICIENT_BALANCE", "errors": null}

فیلد code باید یک شناسه‌ی ثابت و ماشین‌خوان باشه (که Frontend می‌تونه روش switch بزنه)، در حالی که message می‌تونه بعداً برای ترجمه یا تغییر متن، آزادانه عوض بشه. جدا نگه‌داشتنشون این انعطاف رو می‌ده.

چرا protected $code = 422;؟
این کد HTTP Status پیشنهادیه (422 Unprocessable Entity برای خطاهای Validation/Business Logic، 409 Conflict برای تناقض Idempotency). این مقدار رو بعداً در Exception Handler مرکزی می‌خونیم تا Status Code درست به کاربر برگرده.

## Services->app/Services/FeeCalculator.php

### چرا این‌طوری؟

چرا این منطق توی یک کلاس جدا (FeeCalculator) و نه مستقیم توی ExchangeService؟
تا بتونیم این محاسبه رو مستقل و ساده تست کنیم (FeeCalculatorTest)، بدون نیاز به راه‌انداختن کل فرآیند Exchange (دیتابیس، Lock، و غیره). این دقیقاً همون Unit Testای هست که در ساختار پوشه‌بندی اولیه پیش‌بینی کرده بودیم.

چرا هنوز از bcmul/bcdiv استفاده می‌کنیم، با وجود این‌که $sourceAmount->minorUnits خودش Integer هست؟
چون با این‌که ورودی Integer هست، ضرب کردنش در 0.75 (یک عدد اعشاری) و بعد تقسیم بر 100، اگه با عملگرهای معمولی PHP (*, /) انجام بشه، دوباره ریسک خطای Floating Point برمی‌گرده (چون PHP این محاسبه رو داخلی به Float تبدیل می‌کنه). با bcmul/bcdiv، کل محاسبه از اول تا آخر روی رشته و دقیق انجام می‌شه.

چرا نتیجه‌ی نهایی رو با bcdiv(..., 0) گرد می‌کنیم؟
چون minorUnits باید همیشه Integer باشه (نمی‌شه ۰.۵ سنت داشت). این آخرین مرحله، اعشار احتمالی باقی‌مونده از محاسبه رو حذف می‌کنه. نکته‌ی مهم برای README: پیش‌فرض bcdiv گرد کردن به سمت پایین (Floor) هست، نه Round-Half-Up معمول. این یه تصمیم محصولیه که باید مستند کنید (مثلاً: «کارمزد همیشه به نفع پلتفرم گرد می‌شه»، یا برعکس اگه خواستید Round Half Up کنید باید یه منطق اضافه بنویسید).

## Sercivces->app/Services/CurrencyConverter.php

### چرا این‌طوری؟

چرا خروجی یک array هست، نه فقط یک Money؟
چون بعداً در ExchangeService نیاز داریم هم به مبلغ تبدیل‌شده دسترسی داشته باشیم، هم به خود رکورد ExchangeRate (برای این‌که exchange_rate_id و مقدار دقیق نرخ رو در جدول transactions ذخیره کنیم — یادتونه توی طراحی دیتابیس گفتیم چرا این مهمه؟). اگه فقط Money برمی‌گردوندیم، این اطلاعات رو گم می‌کردیم.

نکته‌ی مهم درباره‌ی دقت این محاسبه: چون minorUnits مبدأ و مقصد ممکنه decimal_places متفاوتی داشته باشن (مثلاً از USD با ۲ رقم اعشار به JPY با ۰ رقم اعشار)، این فرمول ساده (amount.minorUnits * rate) فقط زمانی درست کار می‌کنه که نرخ ذخیره‌شده در دیتابیس از قبل این تفاوت دقت رو در نظر گرفته باشه (یعنی وقتی نرخ رو Seed می‌کنیم، باید حواسمون به این نکته باشه). این دقیقاً یکی از همون تصمیمات ظریفیه که باید توی README توضیح بدید — پیشنهاد می‌کنم موقع نوشتن Seeder به این نکته برگردیم و با هم دقیق حلش کنیم.

آماده‌اید حالا بریم سراغ خود ExchangeService (که همه‌ی این تیکه‌ها رو کنار هم می‌ذاره)

## Exception->WalletNotFoundException.php

## Service->app/Services/ExchangeService.php

حالا بذارید دقیق توضیح بدم چرا هر بخش این‌طوریه:

چرا کل منطق داخل DB::transaction(function () { ... }) پیچیده شده؟
این همون Atomicity ایه که قول داده بودیم. اگه در هر نقطه‌ای از این Closure یک Exception پرتاب بشه (مثلاً InsufficientBalanceException)، Laravel خودکار تمام تغییراتی که تا اون لحظه انجام شده (حتی Transaction::create که بالاتر اجرا شده) رو Rollback می‌کنه — یعنی یا کل عملیات با موفقیت کامل می‌شه، یا هیچ اثری از خودش باقی نمی‌ذاره.

چرا lockWalletsInOrder رو جدا نوشتیم و چرا orderBy('id') قبل از lockForUpdate() مهمه؟
این دقیقاً همون راه‌حل Deadlock‌ایه که قبلاً توضیح دادم. فرض کنید کاربر همزمان دو درخواست بفرسته: یکی «USD → EUR» و یکی «EUR → USD». اگه یکی این دو Wallet رو به ترتیب (USD اول) قفل کنه و اون یکی برعکس (EUR اول)، ممکنه هر دو Request منتظر همدیگه بمونن (Deadlock). با orderBy('id')، هر دو Request همیشه ابتدا Walletی با id کوچیک‌تر رو قفل می‌کنن، پس هیچ‌وقت این تناقض پیش نمیاد.

چرا lockForUpdate() (Pessimistic Locking) به‌جای فقط اتکا به version (Optimistic Locking)؟
lockForUpdate() باعث می‌شه اگه دو درخواست همزمان بیان، دومی واقعاً صبر کنه (Block بشه) تا اولی کامل تموم بشه، نه اینکه هر دو همزمان مقدار قدیمی رو بخونن و یکی روی دیگری Overwrite کنه. این قوی‌ترین تضمین برای جلوگیری از منفی‌شدن موجودی زیر بار همزمانیه — دقیقاً چیزی که تست ازمون خواسته.

چرا بررسی موجودی کافی (isGreaterThanOrEqual) بعد از گرفتن قفل انجام می‌شه، نه قبلش؟
اگه قبل از قفل چک می‌کردیم، ممکن بود بین لحظه‌ی چک‌کردن و لحظه‌ی واقعاً کم‌کردن پول، یک Request دیگه موازی موجودی رو تغییر بده (Race Condition کلاسیک، به اسم Time-of-Check to Time-of-Use). با چک‌کردن بعد از lockForUpdate()، مطمئنیم داریم روی جدیدترین و قطعی‌ترین مقدار موجودی تصمیم می‌گیریم.

چرا Transaction با status = 'pending' ساخته می‌شه و بعد در همون تابع به 'completed' تغییر می‌کنه، به‌جای این‌که مستقیم 'completed' بسازیمش؟
همون‌طور که قبلاً گفتیم، این برای Auditability و آمادگی برای توسعه‌ی آینده‌ست (مثلاً وقتی نرخ ارز واقعی نیاز به یک API خارجی کند داشته باشه، وضعیت pending معنادار می‌شه). چون همه‌چیز داخل یک Transaction دیتابیسیه، از دید کاربر نهایی این دو Update تقریباً آنی اتفاق می‌افتن.

⚠️ یه نکته‌ی مهم که باید بدونید و در README مستند کنید: چون تراکنش pending داخل همون DB Transaction ساخته می‌شه، اگه یک خطا (مثلاً InsufficientBalanceException) رخ بده، کل چیز از جمله همون رکورد pending هم Rollback می‌شه — یعنی از تلاش‌های ناموفق هیچ اثری در جدول transactions باقی نمی‌مونه. این یک Trade-off عمدیه (سادگی در برابر Audit کامل تلاش‌های ناموفق). اگه بخواید حتی تلاش‌های Fail‌شده رو هم ثبت کنید، باید یک مکانیزم لاگ جدا (خارج از این Transaction، مثلاً یک جدول Log یا Log::warning()) اضافه کنید — این یه بهبود اختیاریه که می‌تونیم بعداً اضافه کنیم.

## Service-> app/Services/IdempotencyService.php

### چرا این‌طوری؟

چرا دو تا متد جدا (findExisting و store) به‌جای یک متد ترکیبی؟
چون این دو کار در زمان‌های متفاوتی از چرخه‌ی Request اتفاق می‌افتن: findExisting باید قبل از اجرای منطق Exchange صدا زده بشه (برای این‌که اصلاً دوباره اجرا نکنیم)، و store باید بعد از موفقیت Exchange صدا زده بشه (برای ذخیره‌ی پاسخ نهایی). Controller این دو رو در دو نقطه‌ی متفاوت صدا می‌زنه.

چرا hashPayload با ksort شروع می‌شه؟
چون JSON با ترتیب کلیدهای متفاوت (مثلاً {"amount":100,"currency":"USD"} در برابر {"currency":"USD","amount":100}) از نظر معنایی یکسانه، ولی اگه مستقیم Hash بگیریم، دو Hash متفاوت تولید می‌شه. با ksort قبل از Hash گرفتن، مطمئن می‌شیم بدون توجه به ترتیب کلیدها، محتوای یکسان همیشه یک Hash یکسان تولید کنه.

چرا try/catch دور IdempotencyKey::create()؟
این دقیقاً همون سناریوی Race Condition واقعیه که قبلاً بحث کردیم: فرض کنید دو Request کاملاً همزمان با یک Idempotency-Key به سرور برسن. هر دو findExisting() رو صدا می‌زنن و هیچ‌کدوم چیزی پیدا نمی‌کنن (چون هنوز هیچ‌کدوم رکورد نساخته). هر دو منطق Exchange رو اجرا می‌کنن (بد!) و بعد هر دو سعی می‌کنن store() کنن. اینجا دیتابیس (به لطف unique(['user_id', 'idempotency_key']) که در Migration گذاشتیم) جلوی دومی رو می‌گیره با یک Exception به کد 23000 (Unique Constraint Violation). ما این خطا رو می‌گیریم و به‌جای شکست دادن Request، پاسخِ (رکورد) اولی رو که برنده شده برمی‌گردونیم.

⚠️ نکته‌ی مهم و صادقانه: این راه‌حل جلوی دوبار پول رد و بدل شدن رو می‌گیره (چون خود ExchangeService با lockForUpdate درست کار می‌کنه)، ولی در همین سناریوی نادر race، ممکنه هر دو Request واقعاً منطق Exchange رو اجرا کرده باشن قبل از این‌که به store() برسن! یعنی موجودی کاربر ممکنه دوبار کم بشه، حتی اگه در پاسخ نهایی فقط یکی رو برگردونیم.

راه‌حل درست‌تر و قوی‌تر: چک کردن Idempotency Key باید قبل از اجرای ExchangeService، با یک تلاش برای Insert (نه فقط Select) انجام بشه — یعنی اول سعی کنیم یک رکورد "in-progress" بسازیم، و اگه Unique Constraint خورد، یعنی یکی دیگه از قبل داره پردازشش می‌کنه. بذارید این نسخه‌ی بهتر رو در Controller پیاده کنیم (با یک الگوی متفاوت):

## Exception-> app/Exceptions/RequestInProgressException.php

قبلاً: چک می‌کردیم آیا کلید وجود داره (findExisting)، بعد منطق Exchange رو اجرا می‌کردیم، بعد نتیجه رو ذخیره می‌کردیم (store). مشکل: بین این سه مرحله، یک Request دوم می‌تونست از لای در رد بشه و همون منطق Exchange رو دوباره اجرا کنه.

الان: قبل از هر کاری، فوراً و در یک عملیات اتمی (INSERT)، یک «جای‌نگه‌دار» می‌سازیم. چون این INSERT به Unique Constraint دیتابیس تکیه داره (نه یک چک ساده در سطح Application)، هیچ Race Condition‌ای نمی‌تونه ازش رد بشه — دیتابیس خودش تضمین می‌کنه فقط یکی از Requestها موفق به ساخت این رکورد بشه.

چرا حالت سوم (RequestInProgressException با کد ۴۰۹) رو اضافه کردیم؟
چون اگه Request دوم دقیقاً وقتی برسه که اولی هنوز در حال اجراست (هنوز به complete() نرسیده)، دیگه نمی‌تونیم پاسخ نهایی رو بهش بدیم (چون هنوز وجود نداره). به‌جای این‌که غلط بمونیم یا Block بشیم، صادقانه بهش می‌گیم «همین الان یه نسخه‌ی دیگه از این درخواست داره پردازش می‌شه، کمی صبر کن و دوباره امتحان کن».

## Resource-> TransactionResource

چرا اینجا مستقیم bcdiv نوشتیم، نه از Money::toDecimalString؟
راستش بهتره از خود Money استفاده کنیم تا منطق تکراری نشه. بذارید یه متد Helper کوچیک هم به مدل Transaction اضافه کنیم که تمیزتره — ولی برای سادگی همین نسخه هم درست کار می‌کنه. اگه دوست داشتید بعداً Refactor می‌کنیم؛ فعلاً روی عملکرد تمرکز کنیم.

چرا $this->fromCurrency->decimal_places و نه Hardcode عدد ۲؟
دقیقاً همون اصل اول پروژه‌مون — تعداد رقم اعشار باید همیشه از جدول currencies خونده بشه، نه فرض‌شده. این یعنی وقتی مدل رو لود می‌کنیم، باید fromCurrency و toCurrency رو Eager Load کنیم (توی Controller این کار رو می‌کنیم، with(['fromCurrency', 'toCurrency'])).

## Request-> CreateExchangeRequest

### چرا این‌طوری؟

چرا amount از نوع string است، نه numeric؟
چون قراره این مقدار مستقیم وارد Money::fromDecimal() بشه که با bcmath کار می‌کنه (که روی رشته کار می‌کنه، نه Float). اگه از Validation Rule numeric استفاده کنیم، Laravel ممکنه داخلی این مقدار رو به Float تبدیل کنه که همون خطر گرد کردن رو برمی‌گردونه. با string + الگوی regex، هم فرمتش رو کنترل می‌کنیم، هم مطمئنیم دقتش دست‌نخورده باقی می‌مونه.

چرا Rule::exists('currencies', 'code')->where('is_active', true)؟
دو کار همزمان انجام می‌ده: هم مطمئن می‌شه ارز واقعاً در دیتابیس وجود داره (نه یک کد جعلی مثل "XYZ")، هم مطمئن می‌شه غیرفعال نباشه (یادتونه فیلد is_active رو برای همین ساختیم).

چرا different:from_currency روی to_currency؟
این چک رو در سطح Validation هم گذاشتیم (علاوه بر چک داخل ExchangeService)، تا خطا زودتر و با فرمت استاندارد Validation برگرده، بدون نیاز به رسیدن به لایه‌ی Service. این یه لایه‌ی دفاعی تکراری عمدیه (Defense in Depth) — بی‌ضرره و تجربه‌ی کاربری بهتری می‌ده.

## Controller -> Api/ExchangeController

### چرا این‌طوری؟

چرا اول چک Idempotency-Key هست، قبل از هر کار دیگه‌ای؟
چون بدون این هدر، اصلاً نمی‌تونیم از مکانیزم Idempotency استفاده کنیم — بهتره زودهنگام و با پیام واضح رد کنیم، تا Frontend همیشه مجبور باشه این هدر رو بفرسته (طراحی عمدی: این هدر اختیاری نیست).

چرا if (! $record->wasRecentlyCreated) برای تشخیص Cache‌شده استفاده کردیم؟
wasRecentlyCreated یک Property استاندارد خود Eloquent هست که فقط در همون Request‌ای که رکورد تازه ساخته شده، true است. اگه رکورد از یک Request قبلی اومده باشه (یعنی از catch داخل IdempotencyService::begin برگشته)، این مقدار false خواهد بود — دقیقاً سیگنالی که لازم داریم بفهمیم «این یه تلاش تکراریه، نه اولین بار».

چرا در catch بلاک، رکورد Idempotency رو حذف می‌کنیم؟
این یه تصمیم مهمه: اگه Exchange به هر دلیلی (مثلاً موجودی ناکافی) Fail بشه، نباید کاربر برای همیشه با همون Idempotency-Key قفل بمونه — باید بتونه دوباره (مثلاً بعد از شارژ کردن موجودی) با همون کلید (که Frontend شاید عمداً یا سهواً دوباره بفرسته) امتحان کنه. اگه رکورد رو نگه می‌داشتیم، دفعه‌ی بعد به‌خاطر isProcessing()... در واقع نه، چون response_status صفر می‌مونه برای همیشه و RequestInProgressException می‌گرفت، که غلطه. پس حذف کردن، منطقی‌ترین راهه.

حال من route ساختم

use App\Http\Controllers\Api\ExchangeController;

use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {

Route::post('/exchanges', [ExchangeController::class, 'store']);

});

من برای تست کردن هم با tinker و هم با curl انجام دادم

داخل Tinker

// ۱. دو ارز بسازید

\App\Models\Currency::create(['code' => 'USD', 'name' => 'US Dollar', 'decimal_places' => 2, 'is_active' => true]);

\App\Models\Currency::create(['code' => 'EUR', 'name' => 'Euro', 'decimal_places' => 2, 'is_active' => true]);

// ۲. یک نرخ تبدیل بسازید (1 USD = 0.92 EUR)

\App\Models\ExchangeRate::create(['base_currency' => 'USD', 'quote_currency' => 'EUR', 'rate' => '0.92', 'valid_from' => now()->subDay()]);

// ۳. یک کاربر تستی بسازید

$user = \App\Models\User::create(['name' => 'Test User', 'email' => 'test@test.com', 'password' => bcrypt('password')]);

// ۴. دو Wallet برای این کاربر بسازید (USD با موجودی، EUR خالی)

\App\Models\Wallet::create(['user_id' => $user->id, 'currency_code' => 'USD', 'balance_minor' => 10000, 'version' => 0]); // معادل 100.00 دلار

\App\Models\Wallet::create(['user_id' => $user->id, 'currency_code' => 'EUR', 'balance_minor' => 0, 'version' => 0]);

// ۵. یک Token برای این کاربر بسازید

$token = $user->createToken('test-token')->plainTextToken;

echo $token;

و با curl این ها

curl -X POST http://127.0.0.1:8000/api/exchanges ^

-H "Authorization: Bearer <TOKEN>" ^

-H "Content-Type: application/json" ^

-H "Accept: application/json" ^

-H "Idempotency-Key: test-key-001" ^

-d "{\"from_currency\":\"USD\",\"to_currency\":\"EUR\",\"amount\":\"10.00\"}"

راه دیگر تست با curl این است که اول json  بسازیم و با curl تستش می کنیم

{"from_currency":"USD","to_currency":"EUR","amount":"10.00"}

curl.exe -X POST http://127.0.0.1:8000/api/exchanges -H "Authorization: Bearer 1|PyTWSdyqX8P5roU8BxEUtLQWQErQmtNxVTG77mx04b0ae53e" -H "Content-Type: application/json" -H "Accept: application/json" -H "Idempotency-Key: test-key-001" --data "@exchange.json"

controller -> app/Http/Requests/Auth/RegisterRequest.php,  app/Http/Requests/Auth/LoginRequest.php

### چرا این‌طوری؟

چرا 'password' => ['required', 'confirmed', Password::defaults()]؟

confirmed: یعنی انتظار داره یک فیلد دیگه هم به اسم password_confirmation بیاد و باید دقیقاً برابر password باشه (استاندارد رایج فرم‌های Register).

Password::defaults(): یک Rule آماده‌ی خود Laravel که قوانین امنیتی پیش‌فرض (حداقل طول، و غیره) رو اعمال می‌کنه — به‌جای این‌که خودمون Regex بنویسیم.

چرا unique:users,email فقط در Register هست، نه در Login؟
چون در Login، ایمیل باید از قبل وجود داشته باشه (که با چک کردن Credential در Controller بررسی می‌شه)، نه این‌که یکتا باشه — این دو منطق کاملاً متفاوتن.

## Controller -> app/Http/Controllers/Api/AuthController.php

### چرا این‌طوری؟

چرا از ValidationException::withMessages برای خطای Login استفاده کردیم، نه یک Exception اختصاصی؟
چون این دقیقاً همون فرمت استاندارد خطای Validation در Laravel هست (کد ۴۲۲ با ساختار errors) — برای Frontend، خطای «ایمیل یا رمز اشتباه» از نظر UX دقیقاً مثل بقیه‌ی خطاهای فرم رفتار می‌کنه (نمایش زیر همون فیلد).

چرا پیام رو زیر فیلد email می‌ذاریم، نه یک پیام جدا برای password؟
یک تصمیم امنیتی عمدی: اگه پیام دقیق بگیم «ایمیل پیدا نشد» در برابر «رمز اشتباهه»، یک مهاجم می‌تونه بفهمه کدوم ایمیل‌ها توی سیستم Register شدن (Enumeration Attack). با یک پیام یکسان («Credentials نادرسته»)، این اطلاعات لو نمی‌ره.

چرا logout با currentAccessToken()->delete() کار می‌کنه، نه حذف همه‌ی Tokenهای کاربر؟
چون کاربر ممکنه همزمان از چند دستگاه (موبایل، وب) Login کرده باشه؛ Logout باید فقط همون Session/Token فعلی رو باطل کنه، نه بقیه‌ی دستگاه‌ها رو هم بیرون بندازه.

یه سری route اضافه می کنیم

Route::middleware('auth:sanctum')->group(function () { Route::post('/auth/logout', [AuthController::class, 'logout']); Route::get('/me', [AuthController::class, 'me']); Route::post('/exchanges', [ExchangeController::class, 'store']); });

### چرا این‌طوری؟

چرا register و login بیرون از middleware('auth:sanctum') هستن؟
چون منطقی‌ست — کاربری که هنوز وارد نشده، نمی‌تونه Token داشته باشه که با auth:sanctum چک بشه؛ این دو Route باید برای همه در دسترس باشن (Public).

بعد از این تغییرات، بذارید تست کنیم. این دستور رو بزنید (توجه کنید دیگه از فایل JSON استفاده می‌کنیم، چون قبلاً یاد گرفتیم این روش مطمئن‌تره):

بعد تست می کنیم

## Policy -> app/Policies/WalletPolicy.php

چرا فقط متد view؟

چون فعلاً تنها Actionی که روی یک Wallet منفرد داریم show (دیدن جزئیات) هست. بعداً اگه مثلاً بخوایم Endpoint حذف Wallet یا ویرایش تنظیماتش رو اضافه کنیم، متدهای delete, update رو هم به همین Policy اضافه می‌کنیم.

۲. آیا نیاز به Register دستی داریم؟

نه — در Laravel 11+ (که شما دارید)، به لطف قرارداد نام‌گذاری (Wallet مدل → WalletPolicy)، خود Laravel این Policy رو خودکار کشف می‌کنه، بدون نیاز به ثبت دستی در AuthServiceProvider. فقط کافیه اسم فایل و کلاس دقیقاً همین باشه.

۳. اضافه‌کردن Trait لازم به Controller پایه

فایل app/Http/Controllers/Controller.php رو باز کنید — در Laravel 11، این فایل احتمالاً کاملاً خالیه:

باید Trait مربوط به Authorization رو بهش اضافه کنید تا متد $this->authorize() در همه‌ی Controllerهای فرزند در دسترس باشه:

بعد Wallet controller آپدیت کردم .

چرا $this->authorize('view', $wallet) بهتر از چک دستیه؟

۱. کد تمیزتر و کوتاه‌تر: یک خط به‌جای سه خط if.

۲. مدیریت خطای یکپارچه: اگه دسترسی رد بشه، خودکار یک AuthorizationException پرت می‌کنه که Laravel به‌صورت پیش‌فرض به 403 Forbidden با پیام مناسب تبدیلش می‌کنه — دیگه نیازی نیست خودتون abort(403, ...) بنویسید.

۳. قابل تست مستقل: می‌تونید یک WalletPolicyTest جدا بنویسید که فقط منطق view() رو تست کنه، بدون نیاز به شبیه‌سازی کامل HTTP Request:

۴. مقیاس‌پذیری: وقتی بعداً TransactionController رو می‌سازیم (که دقیقاً همین نیاز رو داره — کاربر فقط تراکنش‌های خودش رو ببینه)، دقیقاً همین الگو رو تکرار می‌کنیم (TransactionPolicy).

اضافه کردن route و تست با curl

app/Exceptions/ApiException.php حالا این می سازیم وHandler  می سازیم

policy -> app/Policies/TransactionPolicy.php این می سازیم

Request -> app/Http/Requests/TransactionIndexRequest.php

### چرا این‌طوری؟

چرا همه‌ی فیلدها sometimes هستن، نه required؟
چون همه‌ی این Filterها اختیاریان — کاربر می‌تونه بدون هیچ Query Parameterی درخواست بده و کل تاریخچه رو ببینه، یا فقط بعضی از فیلترها رو اعمال کنه.

چرا currency رو محدود به یک لیست خاص (Rule::in) نکردیم، ولی status و type رو کردیم؟
چون تعداد وضعیت‌ها (status) و نوع‌ها (type) ثابت و از پیش مشخصه (فقط همین چندتا مقدار معتبرن)، ولی ارزها می‌تونن در آینده اضافه بشن — پس به‌جای Hardcode کردن لیست ارزها اینجا، فقط فرمتش (۳ حرف) رو چک می‌کنیم؛ اگه ارز نامعتبر بود، خودِ Query چیزی پیدا نمی‌کنه (نتیجه‌ی خالی)، که مشکلی نیست.

چرا per_page رو محدود به max:100 کردیم؟
یک لایه‌ی دفاعی در برابر کاربری که سعی کنه با ?per_page=999999 کل دیتابیس رو یک‌جا بگیره و به سرور فشار بیاره.

۲.۳ به‌روزرسانی TransactionResource

یادتونه قبلاً TransactionResource رو نوشتیم؟ فقط یک فیلد کوچیک بهش اضافه می‌کنیم (id که از قبل هست، خوبه، فقط مطمئن بشیم type هم هست که هست). این Resource از قبل کامله، نیازی به تغییر نداره.

app/Http/Controllers/Api/TransactionController.php

### چرا این‌طوری؟

چرا where('user_id', $user->id) مستقیم توی Query، نه با یک Policy جدا برای index؟
چون Policy برای چک‌کردن دسترسی به یک رکورد مشخص طراحی شده (view($user, $transaction))، نه برای فیلتر کردن یک لیست. برای لیست، درست‌ترین و بهینه‌ترین راه همینه که از همون ابتدا در سطح Query محدودش کنیم — این‌طوری هیچ‌وقت حتی رکوردهای بقیه‌ی کاربران از دیتابیس خونده نمی‌شن (نه این‌که خونده بشن و بعد فیلتر بشن).

چرا فیلتر currency هم from_currency هم to_currency رو چک می‌کنه؟
چون از دید کاربر، اگه بخواد «همه‌ی تراکنش‌های مربوط به EUR» رو ببینه، باید هم تراکنش‌هایی که از EUR خارج شدن، هم اونایی که به EUR وارد شدن رو ببینه — این دقیقاً معنای طبیعی این فیلتره.

چرا whereDate به‌جای where معمولی برای فیلتر تاریخ؟
چون created_at یک Timestamp کامل با ساعت و دقیقه‌ست، ولی کاربر معمولاً فقط یک تاریخ (بدون ساعت) وارد می‌کنه (مثلاً 2026-09-01). whereDate فقط بخش تاریخ رو مقایسه می‌کنه، نه کل Timestamp رو — پس رکوردهای همون روز، با هر ساعتی، درست فیلتر می‌شن.

چرا search فقط روی id جستجو می‌کنه؟ آیا این کافیه؟
راستش این یه محدودیت واقعیه که باید صادقانه بگم: چون id از نوع UUID هست (یه رشته‌ی طولانی و غیرقابل‌حدس)، جستجوی معنادار توسط کاربر روی این فیلد عملاً بی‌فایده‌ست (کسی UUID کامل یه تراکنش رو حفظ نمی‌کنه که Search کنه). این یه Gap واقعیه که باید حلش کنیم

پیشنهاد من استفاده از (Free-text Search روی چند فیلد مرتبط) هست، به این دلایل:

زمان محدود پروژه: گزینه”‌ی ۳ (شناسه‌ی کوتاه) نیاز به یک Migration جدید، منطق تولید شناسه‌ی یکتا (Sequential یا Random)، و تغییر در TransactionResource داره — برای یک تست ۲ روزه، Over-engineering حساب می‌شه، مگر این‌که وقت اضافه داشته باشید.

ارزش واقعی برای کاربر: چیزی که یک کاربر معمولاً واقعاً می‌خواد جستجو کنه، چیزهاییه مثل «آیا تراکنشی با EUR داشتم؟» یا «تراکنش‌های Failed رو نشونم بده» — که این‌ها همین الان توسط فیلترهای currency/status/type جدا پوشش داده می‌شن. یک search عمومی که همین‌ها رو هم‌زمان چک کنه، یک تجربه‌ی کاربری معقول و ساده می‌سازه بدون افزودن پیچیدگی غیرضروری.

گزینه‌ی ۱ (حذف کامل) ریسکش اینه که تسک صراحتاً «Search» رو در کنار Pagination/Filter خواسته — اگه کامل حذفش کنیم، ممکنه به نظر برسه یک قابلیت خواسته‌شده رو نادیده گرفتیم.

## بعد از آن seedersها رو نوشتم .

## Seeders -> database/seeders/CurrencySeeder.php

چرا updateOrCreate به‌جای create؟
تا Seeder Idempotent باشه — یعنی اگه چندبار اجراش کنید (مثلاً بعد از migrate:fresh)، خطای Duplicate Key نده، بلکه فقط رکورد رو Update کنه اگه از قبل وجود داشته باشه.

## Seeders -> database/seeders/ExchangeRateSeeder.php

### چرا این‌طوری بهتره؟

چرا فقط ۳ نرخ دستی وارد می‌کنیم، به‌جای ۱۲ تا؟
چون نگه‌داشتن ۱۲ نرخ دستی، مستعد ناهماهنگیه (مثلاً اگه یه روز نرخ USD→EUR رو عوض کنید ولی یادتون بره EUR→USD رو هم عوض کنید، دو نرخ دیگه با هم Consistent نیستن). با این روش، فقط یک منبع حقیقت داریم (RATES_FROM_USD) و همه‌چیز دیگه از همون محاسبه می‌شه.

چرا rate(base→quote) = rate(base→USD) × rate(USD→quote) ریاضیاتش درسته؟
چون تبدیل ارز خاصیت Transitive داره: اگه ۱ واحد base معادل X واحد USD باشه، و ۱ واحد USD معادل Y واحد quote باشه، اون‌وقت ۱ واحد base معادل X × Y واحد quote هست. این دقیقاً همون منطق Cross Rate در صرافی‌های واقعیه.

چرا bcmul/bcdiv با ۱۰ رقم اعشار، نه عملگرهای معمولی PHP؟
همون دلیل همیشگی — این محاسبات میرن مستقیم توی دیتابیس و پایه‌ی تمام تراکنش‌های آینده می‌شن؛ حتی یک خطای کوچیک گرد کردن اینجا می‌تونه به‌مرور به یک مغایرت واقعی تبدیل بشه.

## بعد هم Dataseeders آپدیت می کردیم

## Seeders -> database/seeders/UserSeeder.php

### چرا این‌طوری؟

چرا updateOrCreate برای User، ولی firstOrCreate برای Wallet؟

User: می‌خوایم اگه از قبل با همین ایمیل وجود داشت، اطلاعاتش (مثلاً رمز عبور) رو Update کنیم تا همیشه با رمز شناخته‌شده‌ی password قابل Login باشه.

Wallet: برعکس، نمی‌خوایم موجودی Walletهای موجود رو Reset کنیم (اگه کاربر قبلاً باهاش Exchange زده و موجودیش تغییر کرده). firstOrCreate فقط وقتی Wallet وجود نداره می‌سازتش؛ اگه از قبل بود، دست‌نخورده باقی می‌مونه.

چرا این حلقه به‌جای Hardcode کردن ۴ تا Wallet::create جدا؟
چون به‌صورت خودکار برای هر ارز فعالی که در currencies باشه یک Wallet می‌سازه — اگه بعداً یک ارز پنجم (مثلاً JPY) اضافه کنید، UserSeeder بدون نیاز به تغییر، خودش یک Wallet جدید براش می‌سازه.

چرا ترتیب Currency → ExchangeRate → User مهمه؟
چون ExchangeRateSeeder به وجود currencies نیاز داره (Foreign Key)، و UserSeeder هم به currencies (برای ساخت Wallet) نیاز داره — پس باید همیشه بعد از CurrencySeeder اجرا بشن.

تست انجام دادم با curl بعد هم تست خودکار می سازیم

## Screenshots

### Sign In
![Sign In](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182006.png)

### Dashboard
![Dashboard](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182023.png)

### Exchange
![Exchange](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182134.png)

### Transactions
![Transactions](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182031.png)

### Transaction Detail
![Transaction Detail](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182309.png)

### Wallet Detail
![Wallet Detail](https://github.com/amirhoprogrammer/yekpay/blob/main/docs/screenshots/Screenshot%202026-09-08%20182301.png)

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
## Run 

with the account in .env.example in flowpay-frontend

## License

Amirhossein Aminegareshi
