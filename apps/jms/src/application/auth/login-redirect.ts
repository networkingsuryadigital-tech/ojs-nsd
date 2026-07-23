const LOGIN_PATH = "/login";
const PASSWORD_UPDATE_PATH = "/login/update-password";

export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }
  if (path.startsWith(LOGIN_PATH)) {
    return false;
  }
  return true;
}

/** Safe `next` targets after Supabase auth callback (incl. password recovery). */
export function isSafeAuthCallbackNext(path: string): boolean {
  if (path === PASSWORD_UPDATE_PATH) {
    return true;
  }
  return isSafeInternalPath(path);
}

export function buildLoginRedirectUrl(returnPath?: string): string {
  if (!returnPath || !isSafeInternalPath(returnPath)) {
    return LOGIN_PATH;
  }
  const params = new URLSearchParams({ next: returnPath });
  return `${LOGIN_PATH}?${params.toString()}`;
}
