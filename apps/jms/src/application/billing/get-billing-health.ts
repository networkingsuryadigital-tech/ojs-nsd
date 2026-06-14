import "server-only";

import {
  LEDGER_ENTRY_TYPES,
  PAYOUT_STATUSES,
} from "@/domain/billing/ledger";
import {
  APC_ORDER_ID_PREFIX,
  DEFAULT_APC_REVENUE_SHARE_BPS,
  INVOICE_STATUSES,
  PAYMENT_PROVIDERS,
} from "@/domain/billing/types";
import {
  getDuitkuConfig,
  getMidtransConfig,
  resolvePaymentAdapter,
} from "@/infrastructure/payment/payment-config";
import { isDuitkuConfigured, isMidtransConfigured } from "@nsd/payments";

export function getBillingHealth() {
  const midtransConfigured = isMidtransConfigured(getMidtransConfig());
  const duitkuConfigured = isDuitkuConfigured(getDuitkuConfig());
  const activeAdapter = resolvePaymentAdapter();

  return {
    ok: true as const,
    invoiceStatuses: [...INVOICE_STATUSES],
    paymentProviders: [...PAYMENT_PROVIDERS],
    orderIdPrefix: APC_ORDER_ID_PREFIX,
    gateways: {
      midtrans: midtransConfigured,
      duitku: duitkuConfigured,
      active: activeAdapter?.provider ?? null,
    },
    ledgerEntryTypes: [...LEDGER_ENTRY_TYPES],
    payoutStatuses: [...PAYOUT_STATUSES],
    defaultRevenueShareBps: DEFAULT_APC_REVENUE_SHARE_BPS,
    features: {
      apcInvoiceOnAccept: true,
      paymentAdaptor: true,
      midtransWebhook: true,
      webhookIdempotency: true,
      paymentSettledTransition: true,
      apcDiscount: true,
      apcWaiver: true,
      journalLedger: true,
      journalPayout: true,
    },
  };
}
