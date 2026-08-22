/**
 * Xendit adaptor — not implemented. Use Midtrans (production) or Duitku (optional).
 * Kept so PaymentProvider.XENDIT in Prisma remains documented without silent mocks.
 */
export function createXenditAdapter(): never {
  throw new Error("Xendit payment adapter is not implemented");
}
