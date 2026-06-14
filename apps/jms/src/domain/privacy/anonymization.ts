/** Redacted email pattern for deleted users (PDP S23). */

export function anonymizedUserEmail(userId: string): string {
  return `deleted-${userId}@redacted.local`;
}

export function isAnonymizedUserEmail(email: string, userId: string): boolean {
  return email === anonymizedUserEmail(userId);
}
