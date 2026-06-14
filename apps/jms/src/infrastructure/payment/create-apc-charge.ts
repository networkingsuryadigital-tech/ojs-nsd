import "server-only";

import { buildApcOrderId } from "@/domain/billing/order-id";
import {
  loadCorrespondingAuthor,
  updateApcInvoicePayment,
  type ApcInvoiceRecord,
} from "@/infrastructure/payment/apc-invoice-repository";
import { resolvePaymentAdapter } from "@/infrastructure/payment/payment-config";

export async function createApcPaymentCharge(
  journalId: string,
  submissionId: string,
  invoice: ApcInvoiceRecord,
): Promise<string | undefined> {
  const payment = resolvePaymentAdapter();
  if (!payment) {
    return undefined;
  }

  const author = await loadCorrespondingAuthor(journalId, submissionId);
  if (!author) {
    throw new Error("Corresponding author is required for APC payment.");
  }

  const orderId = buildApcOrderId(invoice.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const charge = await payment.adapter.createCharge({
    orderId,
    amount: invoice.amount,
    currency: invoice.currency,
    customer: {
      email: author.email,
      name: author.name ?? undefined,
    },
    itemName: `APC ${submissionId.slice(0, 8)}`,
    callbacks: {
      finish: `${appUrl}/editorial/submissions/${submissionId}`,
      error: `${appUrl}/editorial/submissions/${submissionId}`,
      pending: `${appUrl}/editorial/submissions/${submissionId}`,
    },
    callbackUrl: `${appUrl}/api/webhooks/midtrans`,
    returnUrl: `${appUrl}/editorial/submissions/${submissionId}`,
  });

  if (!charge) {
    return undefined;
  }

  await updateApcInvoicePayment(journalId, invoice.id, {
    provider: "MIDTRANS",
    externalRef: orderId,
    paymentUrl: charge.paymentUrl,
  });

  return charge.paymentUrl;
}
