import { createServerClient } from "@supabase/ssr";
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

  let response = NextResponse.redirect(new URL(next, origin));
  const config = getSupabaseConfig();

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(new URL(next, origin));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Tautan reset kedaluwarsa atau tidak valid. Minta tautan baru.")}`,
        origin,
      ),
    );
  }

  return response;
}
