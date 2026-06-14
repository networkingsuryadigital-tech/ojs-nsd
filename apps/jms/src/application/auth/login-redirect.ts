const LOGIN_PATH = "/login";

export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }
  if (path.startsWith(LOGIN_PATH)) {
    return false;
  }
  return true;
}

export function buildLoginRedirectUrl(returnPath?: string): string {
  if (!returnPath || !isSafeInternalPath(returnPath)) {
    return LOGIN_PATH;
  }
  const params = new URLSearchParams({ next: returnPath });
  return `${LOGIN_PATH}?${params.toString()}`;
}
