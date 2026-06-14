import { NextResponse } from "next/server";

import { downloadSubmissionAuditTrailJson } from "@/application/compliance/export-submission-audit-trail";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

type RouteParams = {
  params: Promise<{ submissionId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { submissionId } = await params;

  const sessionUser = await resolveSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const actorId = sessionUser.id;

  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  try {
    const download = await downloadSubmissionAuditTrailJson({
      journalId,
      submissionId,
      actorId,
    });

    return new NextResponse(download.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${download.filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit trail not available.";
    const status = message.includes("may export") || message.includes("Only journal") ? 403 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
