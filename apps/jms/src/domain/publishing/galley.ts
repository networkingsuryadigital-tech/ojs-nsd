import {
  GALLEY_LABELS,
  GALLEY_MIME_TYPES,
  type GalleyLabel,
} from "./types";

export type GalleyValidationResult =
  | { ok: true; label: GalleyLabel }
  | { ok: false; reason: string };

export function normalizeGalleyLabel(raw: string): GalleyLabel | null {
  const upper = raw.trim().toUpperCase();
  return GALLEY_LABELS.includes(upper as GalleyLabel)
    ? (upper as GalleyLabel)
    : null;
}

export function validateGalleyUpload(
  label: string,
  mimeType: string,
): GalleyValidationResult {
  const normalized = normalizeGalleyLabel(label);
  if (!normalized) {
    return {
      ok: false,
      reason: `Galley label must be one of: ${GALLEY_LABELS.join(", ")}.`,
    };
  }

  const allowed = GALLEY_MIME_TYPES[normalized];
  if (!allowed.includes(mimeType)) {
    return {
      ok: false,
      reason: `MIME type "${mimeType}" is not valid for ${normalized} galley.`,
    };
  }

  return { ok: true, label: normalized };
}
