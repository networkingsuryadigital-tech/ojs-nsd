export type HappyPathFixture = {
  journalId: string;
  submissionId: string;
  uniqueTitle: string;
  editorId: string;
  reviewerId: string;
  adminId: string;
  issueId: string | null;
  tenantBaseUrl: string;
};

export const HAPPY_PATH_FIXTURE_PATH = ".happy-path-fixture.json";
