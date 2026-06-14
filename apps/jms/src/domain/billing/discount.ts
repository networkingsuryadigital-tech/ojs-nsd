import { BillingValidationError } from "./errors";

export type DiscountInput =
  | { discountAmount: number; discountPercent?: never }
  | { discountPercent: number; discountAmount?: never };

export function computeDiscountedAmount(
  originalAmount: number,
  discount: DiscountInput,
): number {
  if (originalAmount < 0) {
    throw new BillingValidationError("Original amount cannot be negative.");
  }

  let discounted: number;
  if ("discountAmount" in discount && discount.discountAmount !== undefined) {
    discounted = originalAmount - discount.discountAmount;
  } else if ("discountPercent" in discount && discount.discountPercent !== undefined) {
    const percent = discount.discountPercent;
    if (percent < 0 || percent > 100) {
      throw new BillingValidationError("Discount percent must be between 0 and 100.");
    }
    discounted = Math.round(originalAmount * (1 - percent / 100));
  } else {
    throw new BillingValidationError("Either discountAmount or discountPercent is required.");
  }

  if (discounted < 0) {
    throw new BillingValidationError("Discount exceeds invoice amount.");
  }

  return discounted;
}

export function formatDiscountNote(
  note: string | undefined,
  discount: DiscountInput,
  originalAmount: number,
  finalAmount: number,
): string {
  const parts: string[] = [];
  if ("discountAmount" in discount && discount.discountAmount !== undefined) {
    parts.push(`Diskon Rp ${discount.discountAmount.toLocaleString("id-ID")}`);
  } else if ("discountPercent" in discount && discount.discountPercent !== undefined) {
    parts.push(`Diskon ${discount.discountPercent}%`);
  }
  parts.push(`Dari Rp ${originalAmount.toLocaleString("id-ID")} → Rp ${finalAmount.toLocaleString("id-ID")}`);
  if (note?.trim()) {
    parts.push(note.trim());
  }
  return parts.join(" — ");
}
