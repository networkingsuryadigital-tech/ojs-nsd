import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { listEditorialQueue } from "@/application/editorial/list-editorial-queue";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import { EditorialQueueView } from "@/components/editorial/editorial-queue-view";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    pipeline?: string;
    attention?: string;
  }>;
};

export default async function EditorialSubmissionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const actorId = await requireAuthenticatedUserId();
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  let queue;
  try {
    queue = await listEditorialQueue({
      journalId,
      actorId,
      status: params.status,
      pipeline: params.pipeline,
      attention: params.attention,
    });
  } catch {
    notFound();
  }

  const t = await getTranslations("editorial");

  return (
    <EditorialQueueView
      queue={queue}
      statusLabel={(status) => {
        switch (status) {
          case "DRAFT":
          case "SUBMITTED":
          case "DESK_REVIEW":
          case "DESK_REJECTED":
          case "UNDER_REVIEW":
          case "REVISIONS_REQUESTED":
          case "RESUBMITTED":
          case "ACCEPTED":
          case "REJECTED":
          case "WITHDRAWN":
          case "PAYMENT_PENDING":
          case "IN_PRODUCTION":
          case "PUBLISHED":
          case "RETRACTED":
            return t(`status.${status}`);
          default:
            return status;
        }
      }}
    />
  );
}
