/**
 * Better Auth CSRF checks the page origin against `trustedOrigins`.
 * Custom-domain journals (e.g. infomanet.ptnsd.co.id) are extra origins
 * beyond `BETTER_AUTH_URL` / the primary platform host.
 */
export function parseAuthTrustedOrigins(
  appUrl: string,
  extraCsv: string | undefined,
): string[] {
  const canonical = appUrl.replace(/\/$/, "");
  const extras = (extraCsv ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter((origin) => origin.length > 0 && origin !== canonical);
  return [canonical, ...extras];
}
