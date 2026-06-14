/** Mirrors Prisma `InvoiceStatus` without importing Prisma in domain. */
export const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PAID",
  "FAILED",
  "REFUNDED",
  "WAIVED",
  "CANCELLED",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Mirrors Prisma `PaymentProvider` without importing Prisma in domain. */
export const PAYMENT_PROVIDERS = ["MIDTRANS", "XENDIT", "MANUAL_TRANSFER"] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const APC_ORDER_ID_PREFIX = "apc-" as const;

/** Default journal share when `Journal.apcRevenueShareBps` is unset (85%). */
export const DEFAULT_APC_REVENUE_SHARE_BPS = 8500;
