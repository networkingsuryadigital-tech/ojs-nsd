import type { PaymentProvider } from "./types";

export type MidtransSettlementInput = {
  transactionStatus: string;
  fraudStatus?: string | null;
};

export function isMidtransPaymentSettled(input: MidtransSettlementInput): boolean {
  if (input.transactionStatus === "capture" && input.fraudStatus === "challenge") {
    return false;
  }
  return (
    input.transactionStatus === "capture" || input.transactionStatus === "settlement"
  );
}

export function isPaymentSettled(
  provider: PaymentProvider,
  rawStatus: string,
  fraudStatus?: string | null,
): boolean {
  switch (provider) {
    case "MIDTRANS":
      return isMidtransPaymentSettled({
        transactionStatus: rawStatus,
        fraudStatus,
      });
    default:
      return false;
  }
}
