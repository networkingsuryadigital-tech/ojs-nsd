const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type JournalEmailFromSettings = {
  emailFromName: string | null;
  emailFromAddress: string | null;
};

export function parseJournalEmailFromNameInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > 120) {
    throw new Error("Nama pengirim maksimal 120 karakter.");
  }
  return trimmed;
}

export function parseJournalEmailFromAddressInput(
  value: string,
): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (!EMAIL_ADDRESS_PATTERN.test(trimmed)) {
    throw new Error("Alamat email pengirim tidak valid.");
  }
  return trimmed;
}

export function evaluateEmailDeliverabilityReadiness(input: {
  settings: JournalEmailFromSettings;
  platformFallbackFrom: string | null;
}): {
  configured: boolean;
  usesCustomFrom: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const hasName = Boolean(input.settings.emailFromName?.trim());
  const hasAddress = Boolean(input.settings.emailFromAddress?.trim());

  if (hasName !== hasAddress) {
    warnings.push("Isi nama dan alamat pengirim bersamaan, atau kosongkan keduanya.");
  }

  if (hasAddress && !input.platformFallbackFrom) {
    warnings.push(
      "RESEND_FROM_EMAIL belum dikonfigurasi di platform — verifikasi domain di Resend diperlukan.",
    );
  }

  return {
    configured: hasName && hasAddress,
    usesCustomFrom: hasAddress,
    warnings,
  };
}
