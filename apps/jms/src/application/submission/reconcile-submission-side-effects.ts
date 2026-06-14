import "server-only";

import {
  submissionNeedsApcInvoiceReconciliation,
  submissionNeedsDoiDepositReconciliation,
} from "@/domain/submission/side-effect-reconciliation";
import { issueApcInvoice } from "@/application/billing/issue-apc-invoice";
import { enqueueDoiDeposit } from "@/application/doi/enqueue-doi-deposit";
import { reportSideEffectFailure } from "@/infrastructure/observability/report-side-effect-failure";

const RECONCILIATION_BATCH_LIMIT = 50;

export type ReconcileSubmissionSideEffectsResult = {
  missingInvoicesFound: number;
  invoicesRepaired: number;
  missingDoiJobsFound: number;
  doiJobsRepaired: number;
};

export async function reconcileSubmissionSideEffects(): Promise<ReconcileSubmissionSideEffectsResult> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");

  const [invoiceCandidates, doiCandidates] = await Promise.all([
    adminDb.submission.findMany({
      where: {
        status: "ACCEPTED",
        invoice: null,
      },
      select: {
        id: true,
        journalId: true,
        invoice: { select: { id: true } },
      },
      take: RECONCILIATION_BATCH_LIMIT,
    }),
    adminDb.submission.findMany({
      where: {
        status: "PUBLISHED",
        journal: {
          doiPrefix: { not: null },
        },
        doiDepositJob: null,
      },
      select: {
        id: true,
        journalId: true,
        journal: { select: { doiPrefix: true } },
        doiDepositJob: { select: { id: true } },
      },
      take: RECONCILIATION_BATCH_LIMIT,
    }),
  ]);

  const invoiceTargets = invoiceCandidates.filter((submission) =>
    submissionNeedsApcInvoiceReconciliation({
      status: "ACCEPTED",
      hasInvoice: submission.invoice !== null,
    }),
  );

  const doiTargets = doiCandidates.filter((submission) =>
    submissionNeedsDoiDepositReconciliation({
      status: "PUBLISHED",
      doiPrefix: submission.journal.doiPrefix,
      hasDoiDepositJob: submission.doiDepositJob !== null,
    }),
  );

  let invoicesRepaired = 0;
  for (const submission of invoiceTargets) {
    try {
      const result = await issueApcInvoice({
        journalId: submission.journalId,
        submissionId: submission.id,
      });
      if (result.issued) {
        invoicesRepaired += 1;
      }
    } catch (error) {
      await reportSideEffectFailure({
        journalId: submission.journalId,
        submissionId: submission.id,
        effect: "reconcileApcInvoice",
        error,
      });
    }
  }

  let doiJobsRepaired = 0;
  for (const submission of doiTargets) {
    try {
      const result = await enqueueDoiDeposit({
        journalId: submission.journalId,
        submissionId: submission.id,
      });
      if (result.enqueued) {
        doiJobsRepaired += 1;
      }
    } catch (error) {
      await reportSideEffectFailure({
        journalId: submission.journalId,
        submissionId: submission.id,
        effect: "reconcileDoiDeposit",
        error,
      });
    }
  }

  return {
    missingInvoicesFound: invoiceTargets.length,
    invoicesRepaired,
    missingDoiJobsFound: doiTargets.length,
    doiJobsRepaired,
  };
}
