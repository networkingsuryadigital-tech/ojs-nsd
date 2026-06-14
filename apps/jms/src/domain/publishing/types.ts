export const GALLEY_LABELS = ["PDF", "HTML", "XML"] as const;

export type GalleyLabel = (typeof GALLEY_LABELS)[number];

export const GALLEY_MIME_TYPES: Record<GalleyLabel, string[]> = {
  PDF: ["application/pdf"],
  HTML: ["text/html"],
  XML: ["application/xml", "text/xml"],
};
