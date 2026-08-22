import { NextRequest, NextResponse } from "next/server";

import { enforceProtectedRouteAuth } from "@/infrastructure/auth/route-protection";

/**
 * Auth gate only. Tenant journal is resolved in Node (Prisma + Redis)
 * via request-tenant / resolveJournalByHost — not in Edge middleware.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  return enforceProtectedRouteAuth(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
