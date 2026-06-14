import { NextResponse } from "next/server";

import { getGalleyDownloadUrl } from "@/application/publishing/get-galley-download-url";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

type RouteParams = {
  params: Promise<{ submissionId: string; galleyId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { submissionId, galleyId } = await params;

  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  try {
    const result = await getGalleyDownloadUrl({
      journalId,
      submissionId,
      galleyId,
    });
    return NextResponse.redirect(result.url);
  } catch {
    return NextResponse.json({ error: "Galley not available." }, { status: 404 });
  }
}
