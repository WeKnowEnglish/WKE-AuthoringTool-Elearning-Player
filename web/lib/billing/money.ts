/** Currencies this product currently sells in. */
export const BILLING_CURRENCIES = ["vnd", "usd"] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

export const LESSONS_PER_PACK = 8;
export const MAX_PACK_QUANTITY = 6;
export const MAX_PACKAGE_LESSONS = 96;

const ZERO_DECIMAL_CURRENCIES = new Set(["vnd", "jpy", "krw", "clp"]);

export function isBillingCurrency(value: string): value is BillingCurrency {
  return (BILLING_CURRENCIES as readonly string[]).includes(value.toLowerCase());
}

export function normalizeCurrency(value: string): BillingCurrency | null {
  const currency = value.trim().toLowerCase();
  return isBillingCurrency(currency) ? currency : null;
}

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency.trim().toLowerCase());
}

export function isValidLessonCount(lessonCount: number): boolean {
  return (
    Number.isInteger(lessonCount) &&
    lessonCount > 0 &&
    lessonCount % LESSONS_PER_PACK === 0 &&
    lessonCount <= MAX_PACKAGE_LESSONS
  );
}

export function isValidPackQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_PACK_QUANTITY;
}

export function stripeAmountToMajor(unitAmount: number, currency: string): number {
  if (!Number.isFinite(unitAmount)) return 0;
  return isZeroDecimalCurrency(currency) ? unitAmount : unitAmount / 100;
}

export function majorToStripeAmount(major: number, currency: string): number {
  if (!Number.isFinite(major) || major <= 0) return 0;
  if (isZeroDecimalCurrency(currency)) return Math.round(major);
  return Math.round(major * 100);
}

export function parseMajorToStripeAmount(
  raw: string,
  currency: string,
): number | null {
  const normalized = raw.trim().replaceAll(",", "").replaceAll(" ", "");
  if (!normalized) return null;
  const major = Number(normalized);
  if (!Number.isFinite(major) || major <= 0) return null;
  if (isZeroDecimalCurrency(currency) && !Number.isInteger(major)) return null;
  const unitAmount = majorToStripeAmount(major, currency);
  return unitAmount > 0 ? unitAmount : null;
}

export function formatStripeMoney(
  unitAmount: number,
  currency: string,
  locale: string,
): string {
  const code = currency.trim().toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: isZeroDecimalCurrency(currency) ? 0 : 2,
    }).format(stripeAmountToMajor(unitAmount, currency));
  } catch {
    return `${stripeAmountToMajor(unitAmount, currency)} ${code}`;
  }
}
