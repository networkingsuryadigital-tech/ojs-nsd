export type JournalThemeBranding = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  fontFamily?: string | null;
};

const FALLBACK_PRIMARY = "#0f766e";
const FALLBACK_SECONDARY = "#1e3a5f";

/** Maps journal theme colors to CSS custom properties for white-label rendering. */
export function buildThemeCssVariables(
  theme: JournalThemeBranding,
): Record<string, string> {
  const vars: Record<string, string> = {
    "--journal-primary": theme.primaryColor?.trim() || FALLBACK_PRIMARY,
    "--journal-secondary": theme.secondaryColor?.trim() || FALLBACK_SECONDARY,
  };

  if (theme.fontFamily?.trim()) {
    vars["--journal-font"] = theme.fontFamily.trim();
  }

  return vars;
}
