import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseConfig } from "./types";

export async function updateSupabaseSession(
  request: NextRequest,
  config: SupabaseConfig,
) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Network errors to Supabase must not break every request in dev.
  }

  return supabaseResponse;
}

export async function getSupabaseUserFromRequest(
  request: NextRequest,
  config: SupabaseConfig,
) {
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Read-only auth check for route protection.
      },
    },
  });

  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Exchanges a Supabase auth `code` for a session and attaches cookies to a redirect.
 * Used by `/auth/callback` (password recovery, magic link, OAuth PKCE).
 */
export async function exchangeSupabaseAuthCode(
  request: NextRequest,
  config: SupabaseConfig,
  input: { code: string; redirectUrl: URL },
): Promise<{ ok: true; response: NextResponse } | { ok: false; error: string }> {
  let response = NextResponse.redirect(input.redirectUrl);

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(input.redirectUrl);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(input.code);
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, response };
}
