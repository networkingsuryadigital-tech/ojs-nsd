import "server-only";

import type { Prisma } from "@prisma/client";

import type { ReviewRecommendation } from "@/domain/review/types";
import type { EditorialDecisionType } from "@/domain/submission/types";
import type { SubmissionRole, SubmissionStatus, TransitionName } from "@/domain/submission/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type SubmissionRecord = {
  id: string;
  journalId: string;
  sectionId: string | null;
  status: SubmissionStatus;
  primaryLanguage: string;
  reviewRound: number;
};

export type SubmissionTransitionRecord = SubmissionRecord & {
  hasManuscript: boolean;
  hasPrimaryTranslation: boolean;
  hasRevisionFile: boolean;
  apcAmount: number;
  hasInvoice: boolean;
  invoiceStatus: string | null;
  hasActiveReviewAssignment: boolean;
  reviewerAlreadyAssigned: boolean;
  activeAssignmentId: string | null;
  issueId: string | null;
  hasGalley: boolean;
  hasRegisteredDoi: boolean;
};

export async function findSectionInJournal(
  journalId: string,
  sectionId: string,
): Promise<{ id: string } | null> {
  return withTenant(journalId, (tx) =>
    tx.section.findFirst({
      where: { id: sectionId, journalId },
      select: { id: true },
    }),
  );
}

export async function findUserById(
  userId: string,
): Promise<{ id: string; email: string; name: string | null } | null> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  return adminDb.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
}

export async function loadSubmission(
  journalId: string,
  submissionId: string,
): Promise<SubmissionRecord | null> {
  return withTenant(journalId, (tx) =>
    tx.submission.findFirst({
      where: { id: submissionId, journalId },
      select: {
        id: true,
        journalId: true,
        sectionId: true,
        status: true,
        primaryLanguage: true,
        reviewRound: true,
      },
    }),
  );
}

export type SubmissionTransitionLoadOptions = {
  actorId?: string;
  issueId?: string;
  reviewerId?: string;
};

export async function loadSubmissionTransitionContext(
  journalId: string,
  submissionId: string,
  options?: SubmissionTransitionLoadOptions,
): Promise<SubmissionTransitionRecord | null> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.findFirst({
      where: { id: submissionId, journalId },
      select: {
        id: true,
        journalId: true,
        sectionId: true,
        status: true,
        primaryLanguage: true,
        reviewRound: true,
        issueId: true,
        doi: true,
        doiStatus: true,
        journal: { select: { apcAmount: true } },
        files: {
          select: { id: true, type: true, round: true },
        },
        translations: {
          where: { isPrimary: true },
          select: { id: true },
          take: 1,
        },
        invoice: { select: { id: true, status: true } },
        galleys: { select: { id: true } },
      },
    });

    if (!submission) return null;

    type AssignmentFilter = {
      reviewerId: string;
      status?: { in: Array<"INVITED" | "ACCEPTED"> };
      round?: number;
    };

    const assignmentFilters: AssignmentFilter[] = [];
    if (options?.actorId) {
      assignmentFilters.push({
        reviewerId: options.actorId,
        status: { in: ["INVITED", "ACCEPTED"] },
      });
    }
    if (options?.reviewerId) {
      assignmentFilters.push({
        reviewerId: options.reviewerId,
        round: submission.reviewRound,
      });
    }

    const assignments =
      assignmentFilters.length > 0
        ? await tx.reviewAssignment.findMany({
            where: { submissionId, OR: assignmentFilters },
            select: { id: true, round: true, status: true, reviewerId: true },
          })
        : [];

    const nextRound = submission.reviewRound + 1;
    const hasManuscript = submission.files.some(
      (file) => file.type === "MANUSCRIPT" && file.round === 0,
    );
    const hasRevisionFile = submission.files.some(
      (file) => file.type === "REVISION" && file.round === nextRound,
    );
    const actorAssignment = options?.actorId
      ? assignments.find(
          (assignment) =>
            assignment.reviewerId === options.actorId &&
            ["INVITED", "ACCEPTED"].includes(assignment.status),
        )
      : undefined;

    const hasActiveReviewAssignment = Boolean(actorAssignment);
    const reviewerAlreadyAssigned = options?.reviewerId
      ? assignments.some(
          (assignment) =>
            assignment.reviewerId === options.reviewerId &&
            assignment.round === submission.reviewRound,
        )
      : false;

    return {
      id: submission.id,
      journalId: submission.journalId,
      sectionId: submission.sectionId,
      status: submission.status,
      primaryLanguage: submission.primaryLanguage,
      reviewRound: submission.reviewRound,
      hasManuscript,
      hasPrimaryTranslation: submission.translations.length > 0,
      hasRevisionFile,
      apcAmount: submission.journal.apcAmount,
      hasInvoice: submission.invoice !== null,
      invoiceStatus: submission.invoice?.status ?? null,
      hasActiveReviewAssignment,
      reviewerAlreadyAssigned,
      activeAssignmentId: actorAssignment?.id ?? null,
      issueId: options?.issueId ?? submission.issueId,
      hasGalley: submission.galleys.length > 0,
      hasRegisteredDoi:
        submission.doiStatus === "REGISTERED" && Boolean(submission.doi?.trim()),
    };
  });
}

export async function listSubmissionRoles(
  journalId: string,
  submissionId: string,
  userId: string,
): Promise<SubmissionRole[]> {
  const participants = await withTenant(journalId, (tx) =>
    tx.submissionParticipant.findMany({
      where: { submissionId, userId },
      select: { role: true },
    }),
  );
  return participants.map((participant) => participant.role);
}

export async function createDraftSubmissionRecords(
  journalId: string,
  data: {
    actorUserId: string;
    sectionId?: string;
    primaryLanguage: string;
    authors: Array<{
      fullName: string;
      email?: string;
      affiliation?: string;
      orcid?: string;
      order: number;
      isCorresponding: boolean;
    }>;
    translation: {
      language: string;
      title: string;
      abstract: string;
      keywords: string[];
    };
    participantRoles: SubmissionRole[];
  },
): Promise<{
  submissionId: string;
  authorIds: string[];
  translationId: string;
}> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.create({
      data: {
        journalId,
        sectionId: data.sectionId,
        primaryLanguage: data.primaryLanguage,
        status: "DRAFT",
      },
    });

    const authors = await Promise.all(
      data.authors.map((author) =>
        tx.submissionAuthor.create({
          data: {
            submissionId: submission.id,
            fullName: author.fullName,
            email: author.email,
            affiliation: author.affiliation,
            orcid: author.orcid,
            order: author.order,
            isCorresponding: author.isCorresponding,
          },
        }),
      ),
    );

    await Promise.all(
      data.participantRoles.map((role) =>
        tx.submissionParticipant.create({
          data: {
            submissionId: submission.id,
            userId: data.actorUserId,
            role,
          },
        }),
      ),
    );

    const translation = await tx.submissionTranslation.create({
      data: {
        submissionId: submission.id,
        language: data.translation.language,
        title: data.translation.title,
        abstract: data.translation.abstract,
        keywords: data.translation.keywords,
        isPrimary: true,
      },
    });

    return {
      submissionId: submission.id,
      authorIds: authors.map((author) => author.id),
      translationId: translation.id,
    };
  });
}

export async function createManuscriptFileRecord(
  journalId: string,
  data: {
    submissionId: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedById: string;
    round?: number;
  },
): Promise<{ id: string; storageKey: string }> {
  return withTenant(journalId, async (tx) => {
    const file = await tx.submissionFile.create({
      data: {
        submissionId: data.submissionId,
        type: "MANUSCRIPT",
        round: data.round ?? 0,
        storageKey: data.storageKey,
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedById: data.uploadedById,
      },
    });

    return { id: file.id, storageKey: file.storageKey };
  });
}

export async function createRevisionFileRecord(
  journalId: string,
  data: {
    submissionId: string;
    round: number;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedById: string;
  },
): Promise<{ id: string }> {
  return withTenant(journalId, async (tx) => {
    const file = await tx.submissionFile.create({
      data: {
        submissionId: data.submissionId,
        type: "REVISION",
        round: data.round,
        storageKey: data.storageKey,
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedById: data.uploadedById,
      },
    });
    return { id: file.id };
  });
}

export async function addSubmissionParticipant(
  journalId: string,
  data: {
    submissionId: string;
    userId: string;
    role: SubmissionRole;
  },
): Promise<void> {
  await withTenant(journalId, async (tx) => {
    await tx.submissionParticipant.upsert({
      where: {
        submissionId_userId_role: {
          submissionId: data.submissionId,
          userId: data.userId,
          role: data.role,
        },
      },
      create: {
        submissionId: data.submissionId,
        userId: data.userId,
        role: data.role,
      },
      update: {},
    });
  });
}

export type ApplySubmissionTransitionInput = {
  submissionId: string;
  actorId: string | null;
  transitionName: TransitionName;
  fromStatus: SubmissionStatus;
  toStatus: SubmissionStatus;
  eventType: string;
  payload?: Record<string, unknown>;
  reviewRound?: number;
  submittedAt?: Date;
  acceptedAt?: Date;
  publishedAt?: Date;
  issueId?: string;
  publicationNoticeType?: "RETRACTION" | "CORRECTION" | "ERRATUM";
  publicationNoticeReason?: string;
  publicationNoticeAt?: Date;
  decision?: EditorialDecisionType;
  apcAmount?: number;
  apcCurrency?: string;
  reviewerId?: string;
  anonymousLabel?: string;
  reviewDueAt?: Date;
  reviewPayload?: {
    assignmentId: string;
    reviewerId: string;
    recommendation: ReviewRecommendation;
    commentsToAuthor?: string;
    commentsToEditor?: string;
    scoreOriginality?: number;
    scoreClarity?: number;
    scoreContribution?: number;
  };
};

export async function loadJournalReviewModel(
  journalId: string,
): Promise<"SINGLE_BLIND" | "DOUBLE_BLIND" | "OPEN"> {
  const journal = await withTenant(journalId, (tx) =>
    tx.journal.findFirst({
      where: { id: journalId },
      select: { reviewModel: true },
    }),
  );
  return journal?.reviewModel ?? "DOUBLE_BLIND";
}

export async function applySubmissionTransition(
  journalId: string,
  data: ApplySubmissionTransitionInput,
): Promise<void> {
  await withTenant(journalId, async (tx) => {
    await tx.submission.update({
      where: { id: data.submissionId },
      data: {
        status: data.toStatus,
        ...(data.reviewRound !== undefined
          ? { reviewRound: data.reviewRound }
          : {}),
        ...(data.submittedAt ? { submittedAt: data.submittedAt } : {}),
        ...(data.acceptedAt ? { acceptedAt: data.acceptedAt } : {}),
        ...(data.publishedAt ? { publishedAt: data.publishedAt } : {}),
        ...(data.issueId ? { issueId: data.issueId } : {}),
        ...(data.publicationNoticeType
          ? { publicationNoticeType: data.publicationNoticeType }
          : {}),
        ...(data.publicationNoticeReason
          ? { publicationNoticeReason: data.publicationNoticeReason }
          : {}),
        ...(data.publicationNoticeAt
          ? { publicationNoticeAt: data.publicationNoticeAt }
          : {}),
      },
    });

    if (data.transitionName === "recordDecision" && data.decision && data.actorId) {
      await tx.editorialDecision.create({
        data: {
          submissionId: data.submissionId,
          round: data.reviewRound ?? 0,
          decidedById: data.actorId,
          decision: data.decision,
          note:
            typeof data.payload?.note === "string" ? data.payload.note : undefined,
        },
      });
    }

    if (
      data.transitionName === "createApcInvoice" &&
      data.apcAmount !== undefined &&
      data.apcAmount > 0
    ) {
      await tx.apcInvoice.create({
        data: {
          journalId,
          submissionId: data.submissionId,
          originalAmount: data.apcAmount,
          amount: data.apcAmount,
          currency: data.apcCurrency ?? "IDR",
          status: "ISSUED",
          issuedAt: new Date(),
        },
      });
    }

    if (
      (data.transitionName === "paymentSettled" ||
        data.transitionName === "waiveApc") &&
      data.toStatus === "IN_PRODUCTION"
    ) {
      const waiveNote =
        data.transitionName === "waiveApc" &&
        typeof data.payload?.note === "string"
          ? data.payload.note.trim()
          : undefined;

      await tx.apcInvoice.updateMany({
        where: { submissionId: data.submissionId, journalId },
        data: {
          status: data.transitionName === "waiveApc" ? "WAIVED" : "PAID",
          paidAt: new Date(),
          ...(waiveNote
            ? { discountNote: waiveNote }
            : data.transitionName === "waiveApc"
              ? { discountNote: "Waiver penuh APC" }
              : {}),
        },
      });
    }

    if (
      data.transitionName === "inviteReviewer" &&
      data.reviewerId &&
      data.anonymousLabel
    ) {
      const round = data.reviewRound ?? 0;
      await tx.reviewAssignment.create({
        data: {
          submissionId: data.submissionId,
          reviewerId: data.reviewerId,
          round,
          anonymousLabel: data.anonymousLabel,
          dueAt: data.reviewDueAt,
          status: "INVITED",
        },
      });

      await tx.submissionParticipant.upsert({
        where: {
          submissionId_userId_role: {
            submissionId: data.submissionId,
            userId: data.reviewerId,
            role: "REVIEWER",
          },
        },
        create: {
          submissionId: data.submissionId,
          userId: data.reviewerId,
          role: "REVIEWER",
        },
        update: {},
      });
    }

    if (data.transitionName === "submitReview" && data.reviewPayload) {
      await tx.review.create({
        data: {
          assignmentId: data.reviewPayload.assignmentId,
          submissionId: data.submissionId,
          reviewerId: data.reviewPayload.reviewerId,
          recommendation: data.reviewPayload.recommendation,
          commentsToAuthor: data.reviewPayload.commentsToAuthor,
          commentsToEditor: data.reviewPayload.commentsToEditor,
          scoreOriginality: data.reviewPayload.scoreOriginality,
          scoreClarity: data.reviewPayload.scoreClarity,
          scoreContribution: data.reviewPayload.scoreContribution,
          submittedAt: new Date(),
        },
      });

      await tx.reviewAssignment.update({
        where: { id: data.reviewPayload.assignmentId },
        data: { status: "SUBMITTED" },
      });
    }

    await tx.editorialEvent.create({
      data: {
        journalId,
        submissionId: data.submissionId,
        actorId: data.actorId,
        type: data.eventType,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        payload: data.payload
          ? (data.payload as Prisma.InputJsonValue)
          : undefined,
      },
    });
  });
}

export async function appendEditorialEvent(
  journalId: string,
  data: {
    submissionId: string;
    actorId?: string | null;
    type: string;
    fromStatus?: SubmissionStatus | null;
    toStatus?: SubmissionStatus | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.editorialEvent.create({
      data: {
        journalId,
        submissionId: data.submissionId,
        actorId: data.actorId ?? undefined,
        type: data.type,
        fromStatus: data.fromStatus ?? undefined,
        toStatus: data.toStatus ?? undefined,
        payload: data.payload
          ? (data.payload as Prisma.InputJsonValue)
          : undefined,
      },
    }),
  );
}
