export type UserProfileExport = {
  id: string;
  email: string;
  name: string | null;
  affiliation: string | null;
  orcid: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JournalMembershipExport = {
  journalId: string;
  journalName: string;
  roles: string[];
  isActive: boolean;
  joinedAt: string;
};

export type SubmissionParticipationExport = {
  submissionId: string;
  journalId: string;
  role: string;
  submissionStatus: string;
  title: string | null;
  joinedAt: string;
};

export type UserDataExport = {
  exportedAt: string;
  profile: UserProfileExport;
  journalMemberships: JournalMembershipExport[];
  submissionParticipations: SubmissionParticipationExport[];
};

export function serializeUserDataExportJson(exportData: UserDataExport): string {
  return JSON.stringify(exportData, null, 2);
}
