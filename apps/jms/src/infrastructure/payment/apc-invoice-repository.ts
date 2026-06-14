import "server-only";

import type { PaymentProvider, Prisma } from "@prisma/client";

import { parseApcOrderId } from "@/domain/billing/order-id";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type ApcInvoiceRecord = {
  id: string;
  journalId: string;
  submissionId: string;
  originalAmount: number;
  amount: number;
  currency: string;
  status: string;
  externalRef: string | null;
  paymentUrl: string | null;
  discountNote: string | null;
};

export type CorrespondingAuthorRecord = {
  userId: string;
  email: string;
  name: string | null;
};

export async function findApcInvoiceById(
  journalId: string,
  invoiceId: string,
): Promise<ApcInvoiceRecord | null> {
  return withTenant(journalId, (tx) =>
    tx.apcInvoice.findFirst({
      where: { id: invoiceId, journalId },
      select: {
        id: true,
        journalId: true,
        submissionId: true,
        originalAmount: true,
        amount: true,
        currency: true,
        status: true,
        externalRef: true,
        paymentUrl: true,
        discountNote: true,
      },
    }),
  );
}

export async function findApcInvoiceByOrderId(
  orderId: string,
): Promise<ApcInvoiceRecord | null> {
  const invoiceId = parseApcOrderId(orderId);
  if (!invoiceId) {
    return null;
  }

  const { adminDb } = await import("@/infrastructure/db/admin-db");
  return adminDb.apcInvoice.findFirst({
    where: { id: invoiceId },
    select: {
      id: true,
      journalId: true,
      submissionId: true,
      originalAmount: true,
      amount: true,
      currency: true,
      status: true,
      externalRef: true,
      paymentUrl: true,
      discountNote: true,
    },
  });
}

export async function updateApcInvoiceDiscount(
  journalId: string,
  invoiceId: string,
  data: {
    amount: number;
    discountNote: string;
  },
): Promise<ApcInvoiceRecord> {
  return withTenant(journalId, (tx) =>
    tx.apcInvoice.update({
      where: { id: invoiceId },
      data: {
        amount: data.amount,
        discountNote: data.discountNote,
      },
      select: {
        id: true,
        journalId: true,
        submissionId: true,
        originalAmount: true,
        amount: true,
        currency: true,
        status: true,
        externalRef: true,
        paymentUrl: true,
        discountNote: true,
      },
    }),
  );
}

export async function loadCorrespondingAuthor(
  journalId: string,
  submissionId: string,
): Promise<CorrespondingAuthorRecord | null> {
  return withTenant(journalId, async (tx) => {
    const participant = await tx.submissionParticipant.findFirst({
      where: {
        submissionId,
        role: "CORRESPONDING_AUTHOR",
      },
      select: { userId: true },
    });

    const userId = participant?.userId;
    if (!userId) {
      return null;
    }

    const { adminDb } = await import("@/infrastructure/db/admin-db");
    const user = await adminDb.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
    };
  });
}

export async function updateApcInvoicePayment(
  journalId: string,
  invoiceId: string,
  data: {
    provider: PaymentProvider;
    externalRef: string;
    paymentUrl: string;
  },
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.apcInvoice.update({
      where: { id: invoiceId },
      data: {
        provider: data.provider,
        externalRef: data.externalRef,
        paymentUrl: data.paymentUrl,
      },
    }),
  );
}

export async function recordPaymentTransaction(
  journalId: string,
  input: {
    invoiceId: string;
    provider: PaymentProvider;
    externalId: string;
    amount: number;
    status: string;
    rawPayload?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.paymentTransaction.create({
      data: {
        invoiceId: input.invoiceId,
        provider: input.provider,
        externalId: input.externalId,
        amount: input.amount,
        status: input.status,
        rawPayload: input.rawPayload,
      },
    }),
  );
}

export async function findSubmissionInvoice(
  journalId: string,
  submissionId: string,
): Promise<ApcInvoiceRecord | null> {
  return withTenant(journalId, (tx) =>
    tx.apcInvoice.findFirst({
      where: { submissionId, journalId },
      select: {
        id: true,
        journalId: true,
        submissionId: true,
        originalAmount: true,
        amount: true,
        currency: true,
        status: true,
        externalRef: true,
        paymentUrl: true,
        discountNote: true,
      },
    }),
  );
}
