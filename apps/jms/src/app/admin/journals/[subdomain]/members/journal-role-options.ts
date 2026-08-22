/** Form options for journal roles — presentation only; use-case still validates. */
export const JOURNAL_ROLE_OPTIONS = [
  "JOURNAL_ADMIN",
  "EDITOR_IN_CHIEF",
  "SECTION_EDITOR",
  "REVIEWER",
  "AUTHOR",
  "COPYEDITOR",
  "READER",
] as const;

export type JournalRoleOption = (typeof JOURNAL_ROLE_OPTIONS)[number];
