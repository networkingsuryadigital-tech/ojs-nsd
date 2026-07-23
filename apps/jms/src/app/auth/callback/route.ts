import { exchangeSupabaseAuthCode } from "@nsd/auth/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { isSafeAuthCallbackNext } from "@/application/auth/login-redirect";
import { getSupabaseConfig } from "@/lib/supabase-config";

/**
 * Completes Supabase PKCE / email redirect (password recovery).
 * Exchanges ?code= for a session cookie on the redirect response.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/login/update-password";
  const next = isSafeAuthCallbackNext(nextRaw)
    ? nextRaw
    : "/login/update-password";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Tautan+reset+tidak+valid", origin),
    );
  }

  const result = await exchangeSupabaseAuthCode(
    request,
    getSupabaseConfig(),
    { code, redirectUrl: new URL(next, origin) },
  );

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Tautan reset kedaluwarsa atau tidak valid. Minta tautan baru.")}`,
        origin,
      ),
    );
  }

  return result.response;
}
