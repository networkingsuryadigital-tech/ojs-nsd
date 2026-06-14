import { getSupabaseUserFromRequest } from "@nsd/auth/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { buildLoginRedirectUrl } from "@/application/auth/login-redirect";
import {
  isAuthExemptPath,
  isProtectedPath,
} from "@/domain/auth/protected-paths";

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export async function enforceProtectedRouteAuth(
  request: NextRequest,
  response: NextResponse,
  config: SupabaseEnv,
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  if (!isProtectedPath(pathname) || isAuthExemptPath(pathname)) {
    return response;
  }

  const user = await getSupabaseUserFromRequest(request, config);
  if (user) {
    return response;
  }

  const returnPath = `${pathname}${request.nextUrl.search}`;
  const loginUrl = new URL(buildLoginRedirectUrl(returnPath), request.url);
  return NextResponse.redirect(loginUrl);
}
