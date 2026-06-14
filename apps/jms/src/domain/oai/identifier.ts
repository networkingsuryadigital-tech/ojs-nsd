/** OAI identifier helpers — pure, no I/O. */

export function buildOaiIdentifier(
  repositoryHost: string,
  submissionId: string,
): string {
  const host = normalizeRepositoryHost(repositoryHost);
  return `oai:${host}:${submissionId}`;
}

export function parseOaiIdentifier(
  identifier: string,
  repositoryHost: string,
): { ok: true; submissionId: string } | { ok: false } {
  const host = normalizeRepositoryHost(repositoryHost);
  const prefix = `oai:${host}:`;
  if (!identifier.startsWith(prefix)) {
    return { ok: false };
  }
  const submissionId = identifier.slice(prefix.length).trim();
  if (!submissionId) {
    return { ok: false };
  }
  return { ok: true, submissionId };
}

export function normalizeRepositoryHost(host: string): string {
  const trimmed = host.trim().toLowerCase();
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex === -1) {
    return trimmed;
  }
  return trimmed.slice(0, colonIndex);
}

export function buildIssueSetSpec(issueId: string): string {
  return `issue:${issueId}`;
}

export function parseIssueSetSpec(
  setSpec: string,
): { ok: true; issueId: string } | { ok: false } {
  const prefix = "issue:";
  if (!setSpec.startsWith(prefix)) {
    return { ok: false };
  }
  const issueId = setSpec.slice(prefix.length).trim();
  if (!issueId) {
    return { ok: false };
  }
  return { ok: true, issueId };
}
