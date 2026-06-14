import { NextResponse } from "next/server";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { downloadUserDataJson } from "@/application/privacy/export-user-data";

export async function GET() {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const userId = sessionUser.id;
  const requesterId = sessionUser.id;

  try {
    const download = await downloadUserDataJson({ userId, requesterId });

    return new NextResponse(download.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${download.filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "User data not available.";
    const status = message.includes("own personal data") ? 403 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
