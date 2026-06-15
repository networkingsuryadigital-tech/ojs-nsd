/**
 * Dev-only: wipe ALL journals and descendant rows (submissions, reviews, billing, etc.).
 * Does NOT delete User rows or Supabase Auth accounts.
 *
 * Usage:
 *   CONFIRM_WIPE=YES pnpm db:wipe:journals
 */

import "./seed-setup-env";

import type { PrismaClient } from "@prisma/client";

import {
  disconnectSeedClients,
  getSeedPrismaClient,
  releaseSeedDbConnection,
} from "./seed-db";

const CONFIRM_VALUE = "YES";

export type WipeJournalsSummary = {
  journalCountBefore: number;
  deleted: Record<string, number>;
  totalDeleted: number;
};

type DeleteCounts = Record<string, number>;

function requireWipeConfirmation(): void {
  if (process.env.CONFIRM_WIPE?.trim() !== CONFIRM_VALUE) {
    console.error(`
⚠️  PENGHAPUSAN DIBATALKAN — penjaga CONFIRM_WIPE tidak aktif.

Perintah ini MENGHAPUS SEMUA jurnal dan data turunannya (submission, review, issue,
invoice, membership, domain, halaman, dll.) dari database JMS.

Baris User / akun Supabase Auth TIDAK dihapus.

Untuk melanjutkan, jalankan:
  CONFIRM_WIPE=YES pnpm db:wipe:journals
`);
    process.exit(1);
  }
}

async function recordDelete(
  counts: DeleteCounts,
  label: string,
  result: { count: number },
): Promise<void> {
  if (result.count > 0) {
    counts[label] = (counts[label] ?? 0) + result.count;
  }
}

async function wipeAllJournals(db: PrismaClient): Promise<WipeJournalsSummary> {
  const journalRows = await db.journal.findMany({
    select: { id: true, subdomain: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const journalCountBefore = journalRows.length;
  const journalIds = journalRows.map((row) => row.id);
  const deleted: DeleteCounts = {};

  if (journalIds.length === 0) {
    return { journalCountBefore: 0, deleted, totalDeleted: 0 };
  }

  const submissionRows = await db.submission.findMany({
    where: { journalId: { in: journalIds } },
    select: { id: true },
  });
  const submissionIds = submissionRows.map((row) => row.id);

  const invoiceRows = await db.apcInvoice.findMany({
    where: { journalId: { in: journalIds } },
    select: { id: true },
  });
  const invoiceIds = invoiceRows.map((row) => row.id);

  await db.$transaction(
    async (tx) => {
      if (invoiceIds.length > 0) {
        await recordDelete(
          deleted,
          "paymentTransaction",
          await tx.paymentTransaction.deleteMany({
            where: { invoiceId: { in: invoiceIds } },
          }),
        );
      }

      await recordDelete(
        deleted,
        "notification",
        await tx.notification.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      if (submissionIds.length > 0) {
        await recordDelete(
          deleted,
          "galley",
          await tx.galley.deleteMany({
            where: { submissionId: { in: submissionIds } },
          }),
        );
        await recordDelete(
          deleted,
          "review",
          await tx.review.deleteMany({
            where: { submissionId: { in: submissionIds } },
          }),
        );
        await recordDelete(
          deleted,
          "reviewAssignment",
          await tx.reviewAssignment.deleteMany({
            where: { submissionId: { in: submissionIds } },
          }),
        );
        await recordDelete(
          deleted,
          "editorialDecision",
          await tx.editorialDecision.deleteMany({
            where: { submissionId: { in: submissionIds } },
          }),
        );
        await recordDelete(
          deleted,
          "submissionFile",
          await tx.submissionFile.deleteMany({
            where: { submissionId: { in: submissionIds } },
          }),
        );
        await recordDelete(
          deleted,
          "submissionTranslation",
          await tx.submissionTranslation.deleteMany({
            where: { submissionId: { in: submissionIds } },
          }),
        );
        await recordDelete(
          deleted,
          "submissionParticipant",
          await tx.submissionParticipant.deleteMany({
            where: { submissionId: { in: submissionIds } },
          }),
        );
        await recordDelete(
          deleted,
          "submissionAuthor",
          await tx.submissionAuthor.deleteMany({
            where: { submissionId: { in: submissionIds } },
          }),
        );
      }

      await recordDelete(
        deleted,
        "editorialEvent",
        await tx.editorialEvent.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "doiDepositJob",
        await tx.doiDepositJob.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "similarityCheckJob",
        await tx.similarityCheckJob.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "journalLedgerEntry",
        await tx.journalLedgerEntry.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "apcInvoice",
        await tx.apcInvoice.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      if (submissionIds.length > 0) {
        await recordDelete(
          deleted,
          "submission",
          await tx.submission.deleteMany({
            where: { id: { in: submissionIds } },
          }),
        );
      }

      await recordDelete(
        deleted,
        "issue",
        await tx.issue.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "journalPayout",
        await tx.journalPayout.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "journalDomain",
        await tx.journalDomain.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "journalPage",
        await tx.journalPage.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "journalTheme",
        await tx.journalTheme.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "journalMembership",
        await tx.journalMembership.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "section",
        await tx.section.deleteMany({
          where: { journalId: { in: journalIds } },
        }),
      );

      await recordDelete(
        deleted,
        "journal",
        await tx.journal.deleteMany({
          where: { id: { in: journalIds } },
        }),
      );
    },
    { timeout: 120_000, maxWait: 30_000 },
  );

  const totalDeleted = Object.values(deleted).reduce((sum, count) => sum + count, 0);

  return {
    journalCountBefore,
    deleted,
    totalDeleted,
  };
}

export async function runWipeJournals(options?: {
  skipGuard?: boolean;
  releaseConnections?: boolean;
}): Promise<WipeJournalsSummary> {
  if (!options?.skipGuard) {
    requireWipeConfirmation();
  }

  const db = getSeedPrismaClient();

  console.log("[wipe:journals] Menghapus semua jurnal dan data turunan…");

  const summary = await wipeAllJournals(db);

  console.log(
    `\n[wipe:journals] Selesai — ${summary.journalCountBefore} jurnal dihapus, ${summary.totalDeleted} baris total.\n`,
  );

  if (summary.journalCountBefore === 0) {
    console.log("Tidak ada jurnal di database.");
  } else {
    console.log("Rincian baris terhapus:");
    for (const [table, count] of Object.entries(summary.deleted).sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      console.log(`  ${table}: ${count}`);
    }
    console.log(`  ── total: ${summary.totalDeleted}`);
  }

  console.log("\nUser / Supabase Auth tidak disentuh.");

  if (options?.releaseConnections !== false) {
    await releaseSeedDbConnection();
    await disconnectSeedClients();
  }

  return summary;
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").includes("wipe-journals");

if (isDirectRun) {
  runWipeJournals()
    .then(() => {
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("[wipe:journals] Gagal:", error);
      process.exit(1);
    });
}
