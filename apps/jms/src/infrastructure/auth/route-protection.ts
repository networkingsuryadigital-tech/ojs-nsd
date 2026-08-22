import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { buildLoginRedirectUrl } from "@/application/auth/login-redirect";
import {
  isAuthExemptPath,
  isProtectedPath,
} from "@/domain/auth/protected-paths";

export async function enforceProtectedRouteAuth(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  if (!isProtectedPath(pathname) || isAuthExemptPath(pathname)) {
    return response;
  }

  const hasSession = Boolean(getSessionCookie(request));
  if (hasSession) {
    return response;
  }

  const returnPath = `${pathname}${request.nextUrl.search}`;
  const loginUrl = new URL(buildLoginRedirectUrl(returnPath), request.url);
  return NextResponse.redirect(loginUrl);
}
