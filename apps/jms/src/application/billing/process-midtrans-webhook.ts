import "server-only";

import {
  isMidtransPaymentSettled,
  verifyMidtransNotificationSignature,
  processWebhookEvent,
} from "@nsd/payments";

import { parseApcOrderId } from "@/domain/billing/order-id";
import { recordApcLedgerSettlement } from "@/application/billing/record-apc-ledger-settlement";
import { transitionSubmission } from "@/application/submission/transition-submission";
import {
  findApcInvoiceByOrderId,
  recordPaymentTransaction,
} from "@/infrastructure/payment/apc-invoice-repository";
import { getMidtransConfig } from "@/infrastructure/payment/payment-config";
import { createProcessedWebhookStore } from "@/infrastructure/payment/processed-webhook-store";

export type MidtransNotification = {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  fraud_status?: string;
};

export type ProcessMidtransWebhookResult =
  | { ok: true; processed: boolean; settled: boolean }
  | { ok: false; error: string };

export async function processMidtransWebhook(
  notification: MidtransNotification,
): Promise<ProcessMidtransWebhookResult> {
  const config = getMidtransConfig();
  const valid = verifyMidtransNotificationSignature(
    config,
    notification.order_id,
    notification.status_code,
    notification.gross_amount,
    notification.signature_key,
  );

  if (!valid) {
    return { ok: false, error: "Invalid signature." };
  }

  const invoiceId = parseApcOrderId(notification.order_id);
  if (!invoiceId) {
    return { ok: false, error: "Unknown order id." };
  }

  const invoice = await findApcInvoiceByOrderId(notification.order_id);
  if (!invoice) {
    return { ok: false, error: "Invoice not found." };
  }

  const grossAmount = Number.parseFloat(notification.gross_amount);
  if (!Number.isFinite(grossAmount) || Math.round(grossAmount) !== invoice.amount) {
    return { ok: false, error: "Amount mismatch." };
  }

  const eventId = `midtrans:${notification.transaction_id}:${notification.transaction_status}`;
  const store = createProcessedWebhookStore();
  const settled = isMidtransPaymentSettled(
    notification.transaction_status,
    notification.fraud_status,
  );

  const { processed } = await processWebhookEvent(
    store,
    eventId,
    "midtrans",
    async () => {
      await recordPaymentTransaction(invoice.journalId, {
        invoiceId: invoice.id,
        provider: "MIDTRANS",
        externalId: notification.transaction_id,
        amount: invoice.amount,
        status: notification.transaction_status,
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
