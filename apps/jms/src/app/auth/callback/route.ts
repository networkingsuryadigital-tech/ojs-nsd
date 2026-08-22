import { NextResponse } from "next/server";

/** Legacy Supabase PKCE callback — Better Auth handles recovery at /api/auth. */
export async function GET() {
  return NextResponse.redirect(new URL("/login/forgot", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
