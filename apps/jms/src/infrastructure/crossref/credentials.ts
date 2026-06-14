import "server-only";

export type CrossRefCredentials = {
  depositorEmail: string;
  depositorPassword: string;
  depositorName: string;
  registrant: string;
  isProduction: boolean;
};

export type ResolveCrossRefCredentialsInput = {
  crossrefDepositorName?: string | null;
  crossrefCredentialRef?: string | null;
  journalPublisher?: string | null;
  journalName: string;
};

function readEnvPassword(ref?: string | null): string | undefined {
  if (ref?.trim()) {
    const fromRef = process.env[ref.trim()];
    if (fromRef?.trim()) {
      return fromRef.trim();
    }
  }
  const fallback = process.env.CROSSREF_DEPOSITOR_PASSWORD?.trim();
  return fallback || undefined;
}

export function resolveCrossRefCredentials(
  input: ResolveCrossRefCredentialsInput,
): CrossRefCredentials | null {
  const email = process.env.CROSSREF_DEPOSITOR_EMAIL?.trim();
  const password = readEnvPassword(input.crossrefCredentialRef);
  if (!email || !password) {
    return null;
  }

  const depositorName =
    input.crossrefDepositorName?.trim() ||
    process.env.CROSSREF_DEPOSITOR_NAME?.trim() ||
    input.journalPublisher?.trim() ||
    input.journalName;

  const registrant =
    input.journalPublisher?.trim() ||
    process.env.CROSSREF_REGISTRANT?.trim() ||
    depositorName;

  return {
    depositorEmail: email,
    depositorPassword: password,
    depositorName,
    registrant,
    isProduction: process.env.CROSSREF_IS_PRODUCTION === "true",
  };
}

export function getCrossRefApiBaseUrl(isProduction: boolean): string {
  return isProduction ?
      "https://api.crossref.org"
    : "https://api.test.crossref.org";
}
