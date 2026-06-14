const PROTECTED_PREFIXES = [
  "/editorial",
  "/author",
  "/reviewer",
  "/notifications",
  "/privacy",
  "/api/editorial",
  "/api/privacy",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthExemptPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}
