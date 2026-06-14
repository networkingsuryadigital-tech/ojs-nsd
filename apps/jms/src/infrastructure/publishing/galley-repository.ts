import "server-only";

import { withTenant } from "@/infrastructure/db/with-tenant";

export type GalleyRecord = {
  id: string;
  submissionId: string;
  label: string;
  storageKey: string;
  mimeType: string;
  createdAt: Date;
};

export async function createGalleyRecord(
  journalId: string,
  data: {
    submissionId: string;
    label: string;
    storageKey: string;
    mimeType: string;
  },
): Promise<GalleyRecord> {
  return withTenant(journalId, (tx) =>
    tx.galley.create({
      data: {
        submissionId: data.submissionId,
        label: data.label,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
      },
      select: {
        id: true,
        submissionId: true,
        label: true,
        storageKey: true,
        mimeType: true,
        createdAt: true,
      },
    }),
  );
}

export async function listGalleysForSubmission(
  journalId: string,
  submissionId: string,
): Promise<GalleyRecord[]> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.findFirst({
      where: { id: submissionId, journalId },
      select: { id: true },
    });
    if (!submission) return [];

    return tx.galley.findMany({
      where: { submissionId },
      select: {
        id: true,
        submissionId: true,
        label: true,
        storageKey: true,
        mimeType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  });
}

export async function findGalleyForSubmission(
  journalId: string,
  submissionId: string,
  galleyId: string,
): Promise<(GalleyRecord & { submissionStatus: string }) | null> {
  return withTenant(journalId, async (tx) => {
    const galley = await tx.galley.findFirst({
      where: { id: galleyId, submissionId },
      select: {
        id: true,
        submissionId: true,
        label: true,
        storageKey: true,
        mimeType: true,
        createdAt: true,
        submission: {
          select: { journalId: true, status: true },
        },
      },
    });

    if (!galley || galley.submission.journalId !== journalId) {
      return null;
    }

    return {
      id: galley.id,
      submissionId: galley.submissionId,
      label: galley.label,
      storageKey: galley.storageKey,
      mimeType: galley.mimeType,
      createdAt: galley.createdAt,
      submissionStatus: galley.submission.status,
    };
  });
}
