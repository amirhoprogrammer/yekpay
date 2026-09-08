import type { CurrencyCode } from "../types/wallet";

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  "USD",
  "EUR",
  "GBP",
  "AED",
];

export const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  AED: "UAE Dirham",
};

// نکته: این نمادها صرفاً برای نمایش در Frontend هستند و از Backend نمی‌آیند
// (چون مدل Currency در دیتابیس چنین فیلدی ندارد). اگر ارز جدیدی به Backend
// اضافه شود، این Map هم باید به‌صورت دستی به‌روزرسانی شود.
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED",
};

// نکته: تمام ۴ ارز پشتیبانی‌شده در این پروژه ۲ رقم اعشار دارند (طبق CurrencySeeder).
// اگر بعداً ارزی با تعداد رقم اعشار متفاوت (مثل JPY با ۰ رقم) اضافه شود،
// این مقدار باید از پاسخ API (فیلد decimal_places) خوانده شود، نه Hardcode.
const DISPLAY_DECIMAL_PLACES = 2;

/**
 * ورودی خام کاربر (رشته) را اعتبارسنجی و نرمال‌سازی می‌کند.
 * عمداً به number تبدیل نمی‌شود تا از خطای دقت اعشاری جلوگیری شود؛
 * دقیقاً همان رشته (بدون فاصله‌ی اضافه) به Backend فرستاده می‌شود.
 *
 * @returns رشته‌ی معتبر، یا null اگر فرمت نادرست/غیرمثبت باشد.
 */
export function parseAmountInput(raw: string): string | null {
  const trimmed = raw.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  // رد کردن مقادیر صفر یا منفی (Regex بالا خودش منفی را رد می‌کند، ولی صفر را نه)
  if (Number(trimmed) <= 0) {
    return null;
  }

  return trimmed;
}

interface FormatMoneyOptions {
  showCode?: boolean;
  showSymbol?: boolean;
}

/**
 * یک مقدار Decimal (رشته‌ای که از API آمده، مثل "1000.50") را برای نمایش
 * با جداکننده‌ی هزارگان و نماد/کد ارز فرمت می‌کند.
 *
 * توجه: این تابع فقط برای *نمایش* است. مقدار ورودی همیشه باید مستقیماً
 * از API آمده باشد (که با دقت کامل bcmath محاسبه شده)، نه یک محاسبه‌ی
 * محلی در Frontend.
 */
export function formatMoney(
  value: string,
  currency: CurrencyCode,
  options: FormatMoneyOptions = {}
): string {
  const numeric = Number(value);

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: DISPLAY_DECIMAL_PLACES,
    maximumFractionDigits: DISPLAY_DECIMAL_PLACES,
  }).format(numeric);

  const symbol = options.showSymbol ? CURRENCY_SYMBOLS[currency] : "";
  const code = options.showCode ? ` ${currency}` : "";

  return `${symbol}${formatted}${code}`.trim();
}
