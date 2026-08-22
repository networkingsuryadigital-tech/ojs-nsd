import "server-only";

import {
  processWebhookEvent,
  verifyDuitkuCallbackSignature,
} from "@nsd/payments";

import { parseApcOrderId } from "@/domain/billing/order-id";
import { recordApcLedgerSettlement } from "@/application/billing/record-apc-ledger-settlement";
import { transitionSubmission } from "@/application/submission/transition-submission";
import {
  findApcInvoiceByOrderId,
  recordPaymentTransaction,
} from "@/infrastructure/payment/apc-invoice-repository";
import { getDuitkuConfig } from "@/infrastructure/payment/payment-config";
import { createProcessedWebhookStore } from "@/infrastructure/payment/processed-webhook-store";

export type DuitkuNotification = {
  merchantOrderId: string;
  amount: string;
  signature: string;
  resultCode: string;
  reference?: string;
};

export type ProcessDuitkuWebhookResult =
  | { ok: true; processed: boolean; settled: boolean }
  | { ok: false; error: string };

export async function processDuitkuWebhook(
  notification: DuitkuNotification,
): Promise<ProcessDuitkuWebhookResult> {
  const config = getDuitkuConfig();
  const valid = verifyDuitkuCallbackSignature(
    config,
    notification.merchantOrderId,
    notification.amount,
    notification.signature,
  );
  if (!valid) {
    return { ok: false, error: "Invalid signature." };
  }

  const invoiceId = parseApcOrderId(notification.merchantOrderId);
  if (!invoiceId) {
    return { ok: false, error: "Unknown order id." };
  }

  const invoice = await findApcInvoiceByOrderId(notification.merchantOrderId);
  if (!invoice) {
    return { ok: false, error: "Invoice not found." };
  }

  const amount = Number.parseFloat(notification.amount);
  if (!Number.isFinite(amount) || Math.round(amount) !== invoice.amount) {
    return { ok: false, error: "Amount mismatch." };
  }

  const settled = notification.resultCode === "00";
  const eventId = `duitku:${notification.reference ?? notification.merchantOrderId}:${notification.resultCode}`;
  const store = createProcessedWebhookStore();

  const { processed } = await processWebhookEvent(
    store,
    eventId,
    "duitku",
    async () => {
      await recordPaymentTransaction(invoice.journalId, {
        invoiceId: invoice.id,
        provider: "DUITKU",
        externalId: notification.reference ?? notification.merchantOrderId,
        amount: invoice.amount,
        status: notification.resultCode,
        rawPayload: notification,
      });

      if (settled && invoice.status === "ISSUED") {
        await transitionSubmission({
          journalId: invoice.journalId,
          submissionId: invoice.submissionId,
          isSystemActor: true,
          name: "paymentSettled",
        });
        try {
          await recordApcLedgerSettlement({
            journalId: invoice.journalId,
            invoiceId: invoice.id,
            paidAmount: invoice.amount,
            currency: invoice.currency,
          });
        } catch (error) {
          console.error("recordApcLedgerSettlement failed", error);
        }
      }
    },
  );

  return { ok: true, processed, settled };
}
