import { updateSupabaseSession } from "@nsd/auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import { JOURNAL_ID_HEADER } from "@/domain/tenancy/request-headers";
import { enforceProtectedRouteAuth } from "@/infrastructure/auth/route-protection";
import { resolveJournalByHost } from "@/infrastructure/tenancy/resolver";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function withJournalRequestHeaders(
  request: NextRequest,
  journalId: string,
): NextRequest {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(JOURNAL_ID_HEADER, journalId);
  return new NextRequest(request.url, {
    headers: requestHeaders,
  });
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "localhost:3000";
  const journal = await resolveJournalByHost(host);

  const requestForDownstream = journal
    ? withJournalRequestHeaders(request, journal.id)
    : request;

  const supabaseEnv = getSupabaseEnv();
  if (supabaseEnv) {
    const sessionResponse = await updateSupabaseSession(
      requestForDownstream,
      supabaseEnv,
    );
    return enforceProtectedRouteAuth(
      requestForDownstream,
      sessionResponse,
      supabaseEnv,
    );
  }

  return NextResponse.next({
    request: journal ? { headers: requestForDownstream.headers } : undefined,
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
