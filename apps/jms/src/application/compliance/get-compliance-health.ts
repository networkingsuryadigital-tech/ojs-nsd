import "server-only";

import { PRIVACY_POLICY_PAGE_SLUG } from "@/domain/tenancy/default-pages";

export function getComplianceHealth() {
  return {
    ok: true as const,
    features: {
      auditTrailExport: true,
      coiPreviewOnInvite: true,
      userDataExport: true,
      defaultPrivacyPolicyPage: true,
      operationalRunbook: true,
      accountDeletion: true,
      rejectedSubmissionRetention: true,
      privacySettingsAdminUi: true,
    },
    privacyPolicyPageSlug: PRIVACY_POLICY_PAGE_SLUG,
    roadmapSections: {
      "3.1": "OAI-PMH + Garuda metadata (S11)",
      "3.2": "EditorialEvent audit export",
      "3.3": "Anonymity pipeline + tests (S7)",
      "3.4": "COI warnings on invite + preview",
      "3.5": "User data export + privacy policy page",
      "3.6": "Retraction / correction workflow + DOI update",
      "3.7": "Runbook + webhook idempotency",
    },
  };
}
