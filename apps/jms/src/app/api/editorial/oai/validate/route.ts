import { NextResponse } from "next/server";

import { validateJournalOaiFromRequest } from "@/application/oai/validate-journal-oai-from-request";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function GET(request: Request) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const actorId = sessionUser.id;

  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    return NextResponse.json({ error: "Journal not found." }, { status: 404 });
  }

  try {
    const result = await validateJournalOaiFromRequest({
      journalId,
      actorId,
      request,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OAI validation failed.";
    const status = message.includes("authorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
