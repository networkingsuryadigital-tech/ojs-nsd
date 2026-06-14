import { NextResponse } from "next/server";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { deleteUserAccount } from "@/application/privacy/delete-user-account";

export async function DELETE() {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const userId = sessionUser.id;
  const requesterId = sessionUser.id;

  try {
    const result = await deleteUserAccount({ userId, requesterId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Account deletion failed.";
    const status = message.includes("own account") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
