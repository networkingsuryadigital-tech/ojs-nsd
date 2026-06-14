import "server-only";

import type { NotificationPayload } from "@nsd/notifications";
import type { SubmissionRole } from "@/domain/submission/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

export async function createNotification(
  journalId: string,
  input: NotificationPayload,
): Promise<{ id: string }> {
  return withTenant(journalId, (tx) =>
    tx.notification.create({
      data: {
        journalId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      },
      select: { id: true },
    }),
  );
}

export async function markNotificationEmailSent(
  journalId: string,
  notificationId: string,
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.notification.update({
      where: { id: notificationId },
      data: { emailSent: true },
    }),
  );
}

export type UserNotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  emailSent: boolean;
  createdAt: Date;
};

export async function listNotificationsForUser(
  journalId: string,
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<UserNotificationRecord[]> {
  const limit = options.limit ?? 50;
  return withTenant(journalId, (tx) =>
    tx.notification.findMany({
      where: {
        journalId,
        userId,
        ...(options.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        isRead: true,
        emailSent: true,
        createdAt: true,
      },
    }),
  );
}

export async function markNotificationRead(
  journalId: string,
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const result = await withTenant(journalId, (tx) =>
    tx.notification.updateMany({
      where: { id: notificationId, journalId, userId, isRead: false },
      data: { isRead: true },
    }),
  );
  return result.count > 0;
}

export async function countUnreadNotifications(
  journalId: string,
  userId: string,
): Promise<number> {
  return withTenant(journalId, (tx) =>
    tx.notification.count({
      where: { journalId, userId, isRead: false },
    }),
  );
}

export async function hasRecentNotification(
  journalId: string,
  userId: string,
  type: string,
  link: string,
  since: Date,
): Promise<boolean> {
  const existing = await withTenant(journalId, (tx) =>
    tx.notification.findFirst({
      where: {
        journalId,
        userId,
        type,
        link,
        createdAt: { gte: since },
      },
      select: { id: true },
    }),
  );
  return existing !== null;
}

export type NotificationContextRecord = {
  journalName: string;
  submissionTitle: string;
  emailFromName: string | null;
  emailFromAddress: string | null;
};

export async function loadNotificationContext(
  journalId: string,
  submissionId: string,
): Promise<NotificationContextRecord | null> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.findFirst({
      where: { id: submissionId, journalId },
      select: {
        journal: {
          select: {
            name: true,
            theme: {
              select: { emailFromName: true, emailFromAddress: true },
            },
          },
        },
        translations: {
          where: { isPrimary: true },
          take: 1,
          select: { title: true },
        },
      },
    });
    if (!submission) return null;

    return {
      journalName: submission.journal.name,
      submissionTitle: submission.translations[0]?.title ?? "Naskah tanpa judul",
      emailFromName: submission.journal.theme?.emailFromName ?? null,
      emailFromAddress: submission.journal.theme?.emailFromAddress ?? null,
    };
  });
}

export async function listJournalEditorUserIds(
  journalId: string,
): Promise<string[]> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const memberships = await adminDb.journalMembership.findMany({
    where: {
      journalId,
      isActive: true,
      roles: {
        hasSome: ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF", "SECTION_EDITOR"],
      },
    },
    select: { userId: true },
  });
  return memberships.map((membership) => membership.userId);
}

export async function listSubmissionParticipantUserIds(
  journalId: string,
  submissionId: string,
  roles: SubmissionRole[],
): Promise<string[]> {
  const participants = await withTenant(journalId, (tx) =>
    tx.submissionParticipant.findMany({
      where: {
        submissionId,
        role: { in: roles },
      },
      select: { userId: true },
    }),
  );
  return [...new Set(participants.map((participant) => participant.userId))];
}

export async function findUserEmail(
  userId: string,
): Promise<{ email: string; name: string | null } | null> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  return adminDb.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
}

export type OverdueReviewAssignment = {
  id: string;
  dueAt: Date;
  anonymousLabel: string | null;
  reviewerId: string;
  submissionId: string;
  journalId: string;
  submissionTitle: string;
  journalName: string;
};

export async function listOverdueReviewAssignments(
  now: Date,
): Promise<OverdueReviewAssignment[]> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const assignments = await adminDb.reviewAssignment.findMany({
    where: {
      status: { in: ["INVITED", "ACCEPTED"] },
      dueAt: { lt: now },
      review: { is: null },
    },
    select: {
      id: true,
      dueAt: true,
      anonymousLabel: true,
      reviewerId: true,
      submission: {
        select: {
          id: true,
          journalId: true,
          journal: { select: { name: true } },
          translations: {
            where: { isPrimary: true },
            take: 1,
            select: { title: true },
          },
        },
      },
    },
  });

  return assignments
    .filter((assignment) => assignment.dueAt !== null)
    .map((assignment) => ({
      id: assignment.id,
      dueAt: assignment.dueAt as Date,
      anonymousLabel: assignment.anonymousLabel,
      reviewerId: assignment.reviewerId,
      submissionId: assignment.submission.id,
      journalId: assignment.submission.journalId,
      submissionTitle:
        assignment.submission.translations[0]?.title ?? "Naskah tanpa judul",
      journalName: assignment.submission.journal.name,
    }));
}

export async function markReviewAssignmentsOverdue(
  assignmentIds: string[],
): Promise<number> {
  if (assignmentIds.length === 0) return 0;
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const result = await adminDb.reviewAssignment.updateMany({
    where: {
      id: { in: assignmentIds },
      status: { in: ["INVITED", "ACCEPTED"] },
    },
    data: { status: "OVERDUE" },
  });
  return result.count;
}
