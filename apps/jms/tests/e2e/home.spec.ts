import { expect, test } from "@playwright/test";

test("platform home page renders JMS title", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "JMS — PT. NSD" }),
  ).toBeVisible();
});

test("platform home lists journal directory when seeded", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Direktori jurnal" })).toBeVisible();
  const demoLink = page.getByRole("link", { name: "Jurnal Demo NSD" });
  if ((await demoLink.count()) > 0) {
    await expect(demoLink).toHaveAttribute("href", /demo\.localhost/);
  }
});

test("health endpoint returns JSON", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok() || res.status() === 503).toBeTruthy();
  const body = (await res.json()) as { status: string; database: string };
  expect(body).toHaveProperty("status");
  expect(body).toHaveProperty("database");
});

test("tenant static page route returns 404 without tenant host", async ({ page }) => {
  const response = await page.goto("/pages/about");
  expect(response?.status()).toBe(404);
});

test("journal-domains cron endpoint returns JSON in non-production", async ({
  request,
}) => {
  const res = await request.get("/api/cron/journal-domains");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    checked: number;
    dnsVerified: number;
    sslUpdated: number;
    failed: number;
  };
  expect(body.ok).toBe(true);
  expect(body).toHaveProperty("checked");
});

test("submission workflow health endpoint exposes full transition table", async ({
  request,
}) => {
  const res = await request.get("/api/health/submission");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    transitionCount: number;
    transitions: Array<{
      name: string;
      from: string[];
      to: string;
      eventType: string;
    }>;
  };
  expect(body.ok).toBe(true);
  expect(body.transitionCount).toBe(16);
  const submit = body.transitions.find((t) => t.name === "submit");
  expect(submit?.from).toContain("DRAFT");
  expect(submit?.to).toBe("SUBMITTED");
  expect(body.transitions.some((t) => t.name === "recordDecision")).toBe(true);
  expect(body.transitions.some((t) => t.eventType === "DECISION_MADE")).toBe(
    true,
  );
});

test("review health endpoint exposes anonymization features", async ({ request }) => {
  const res = await request.get("/api/health/review");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    reviewModels: string[];
    features: {
      doubleBlindAnonymization: boolean;
      parallelReviewers: boolean;
      coiCoAuthorHistory: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.reviewModels).toContain("DOUBLE_BLIND");
  expect(body.features.doubleBlindAnonymization).toBe(true);
  expect(body.features.parallelReviewers).toBe(true);
  expect(body.features.coiCoAuthorHistory).toBe(true);
});

test("decision health endpoint exposes revision cycle features", async ({
  request,
}) => {
  const res = await request.get("/api/health/decision");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    editorialDecisionTypes: string[];
    revisionDecisions: string[];
    features: {
      recordEditorDecision: boolean;
      authorResubmit: boolean;
      multiRoundReview: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.editorialDecisionTypes).toContain("ACCEPT");
  expect(body.revisionDecisions).toContain("MINOR_REVISION");
  expect(body.features.recordEditorDecision).toBe(true);
  expect(body.features.multiRoundReview).toBe(true);
});

test("notifications health endpoint exposes notification features", async ({
  request,
}) => {
  const res = await request.get("/api/health/notifications");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    notificationTypes: string[];
    transitionNotifications: string[];
    features: {
      inAppNotifications: boolean;
      emailNotifications: boolean;
      overdueReviewReminders: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.notificationTypes).toContain("REVIEW_INVITED");
  expect(body.transitionNotifications).toContain("submit");
  expect(body.features.inAppNotifications).toBe(true);
  expect(body.features.overdueReviewReminders).toBe(true);
});

test("OAI health endpoint exposes OAI-PMH features", async ({ request }) => {
  const res = await request.get("/api/health/oai");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    metadataPrefix: string;
    verbs: string[];
    features: {
      dublinCore: boolean;
      resumptionTokens: boolean;
      harvestValidation: boolean;
      garudaReadinessValidation: boolean;
      editorialOaiValidationUi: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.metadataPrefix).toBe("oai_dc");
  expect(body.verbs).toContain("ListRecords");
  expect(body.verbs).toContain("GetRecord");
  expect(body.features.dublinCore).toBe(true);
  expect(body.features.resumptionTokens).toBe(true);
  expect(body.features.garudaReadinessValidation).toBe(true);
  expect(body.features.editorialOaiValidationUi).toBe(true);
});

test("publishing health endpoint exposes issue/galley features", async ({
  request,
}) => {
  const res = await request.get("/api/health/publishing");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    galleyLabels: string[];
    publishingTransitions: string[];
    features: {
      issueManagement: boolean;
      galleyUpload: boolean;
      publishSubmission: boolean;
      publicArchive: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.galleyLabels).toContain("PDF");
  expect(body.publishingTransitions).toContain("publishToIssue");
  expect(body.features.galleyUpload).toBe(true);
  expect(body.features.publicArchive).toBe(true);
});

test("review-reminders cron endpoint returns JSON in non-production", async ({
  request,
}) => {
  const res = await request.get("/api/cron/review-reminders");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    scanned: number;
    remindersSent: number;
  };
  expect(body.ok).toBe(true);
  expect(body).toHaveProperty("scanned");
});

test("DOI health endpoint exposes CrossRef deposit features", async ({ request }) => {
  const res = await request.get("/api/health/doi");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    crossrefSchemaVersion: string;
    doiStatuses: string[];
    features: {
      crossRefDeposit: boolean;
      depositJobRetry: boolean;
      pollSubmittedDeposits: boolean;
      retractionWorkflow: boolean;
      correctionWorkflow: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.crossrefSchemaVersion).toBe("5.4.0");
  expect(body.doiStatuses).toContain("REGISTERED");
  expect(body.features.crossRefDeposit).toBe(true);
  expect(body.features.depositJobRetry).toBe(true);
  expect(body.features.retractionWorkflow).toBe(true);
  expect(body.features.correctionWorkflow).toBe(true);
});

test("doi-deposits cron endpoint returns JSON in non-production", async ({
  request,
}) => {
  const res = await request.get("/api/cron/doi-deposits");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    scanned: number;
    registered: number;
    submitted: number;
  };
  expect(body.ok).toBe(true);
  expect(body).toHaveProperty("scanned");
});

test("billing health endpoint exposes APC payment features", async ({ request }) => {
  const res = await request.get("/api/health/billing");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    orderIdPrefix: string;
    defaultRevenueShareBps: number;
    ledgerEntryTypes: string[];
    features: {
      apcInvoiceOnAccept: boolean;
      midtransWebhook: boolean;
      webhookIdempotency: boolean;
      apcDiscount: boolean;
      apcWaiver: boolean;
      journalLedger: boolean;
      journalPayout: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.orderIdPrefix).toBe("apc-");
  expect(body.defaultRevenueShareBps).toBe(8500);
  expect(body.ledgerEntryTypes).toContain("APC_EARNED");
  expect(body.features.apcInvoiceOnAccept).toBe(true);
  expect(body.features.midtransWebhook).toBe(true);
  expect(body.features.webhookIdempotency).toBe(true);
  expect(body.features.apcDiscount).toBe(true);
  expect(body.features.apcWaiver).toBe(true);
  expect(body.features.journalLedger).toBe(true);
  expect(body.features.journalPayout).toBe(true);
});

test("midtrans webhook rejects invalid payload", async ({ request }) => {
  const res = await request.post("/api/webhooks/midtrans", {
    data: { order_id: "invalid" },
  });
  expect(res.status()).toBe(400);
});

test("similarity health endpoint exposes check features", async ({ request }) => {
  const res = await request.get("/api/health/similarity");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    activeProvider: string;
    similarityStatuses: string[];
    features: {
      similarityOnDeskReview: boolean;
      copyleaksIntegration: boolean;
      ithenticateIntegration: boolean;
      similarityGate: boolean;
      mockProviderFallback: boolean;
      deskReviewUi: boolean;
      similaritySettingsAdminUi: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.similarityStatuses).toContain("COMPLETED");
  expect(body.activeProvider).toMatch(/mock|copyleaks|ithenticate/);
  expect(body.features.similarityOnDeskReview).toBe(true);
  expect(body.features.copyleaksIntegration).toBe(true);
  expect(body.features.ithenticateIntegration).toBe(true);
  expect(body.features.similarityGate).toBe(true);
  expect(body.features.mockProviderFallback).toBe(true);
  expect(body.features.deskReviewUi).toBe(true);
  expect(body.features.similaritySettingsAdminUi).toBe(true);
});

test("similarity-checks cron endpoint returns JSON in non-production", async ({
  request,
}) => {
  const res = await request.get("/api/cron/similarity-checks");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    scanned: number;
    completed: number;
  };
  expect(body.ok).toBe(true);
  expect(body).toHaveProperty("scanned");
});

test("reviewer-matching health endpoint exposes AI suggestion features", async ({
  request,
}) => {
  const res = await request.get("/api/health/reviewer-matching");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    activeProvider: string;
    defaultTopN: number;
    embeddingPersistence: boolean;
    pendingRefreshCount: number;
    features: {
      keywordMatching: boolean;
      semanticEmbedding: boolean;
      embeddingPersistence: boolean;
      editorSuggestionsOnly: boolean;
      deskReviewUi: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.activeProvider).toMatch(/mock|openai/);
  expect(body.defaultTopN).toBeGreaterThan(0);
  expect(body.embeddingPersistence).toBe(true);
  expect(body.pendingRefreshCount).toBeGreaterThanOrEqual(0);
  expect(body.features.keywordMatching).toBe(true);
  expect(body.features.semanticEmbedding).toBe(true);
  expect(body.features.embeddingPersistence).toBe(true);
  expect(body.features.editorSuggestionsOnly).toBe(true);
  expect(body.features.deskReviewUi).toBe(true);
});

test("reviewer-embeddings cron endpoint returns JSON in non-production", async ({
  request,
}) => {
  const res = await request.get("/api/cron/reviewer-embeddings");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    scanned: number;
    refreshed: number;
    skipped: number;
    failed: number;
  };
  expect(body.ok).toBe(true);
  expect(body).toHaveProperty("scanned");
  expect(body).toHaveProperty("refreshed");
});

test("statistics health endpoint exposes dashboard features", async ({ request }) => {
  const res = await request.get("/api/health/statistics");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    dashboardSections: string[];
    features: {
      editorialDashboardUi: boolean;
      acceptanceRate: boolean;
      billingSummaryForAdmin: boolean;
      monthlySubmissionTrend: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.dashboardSections).toContain("submissions");
  expect(body.dashboardSections).toContain("billing");
  expect(body.features.editorialDashboardUi).toBe(true);
  expect(body.features.acceptanceRate).toBe(true);
  expect(body.features.billingSummaryForAdmin).toBe(true);
  expect(body.features.monthlySubmissionTrend).toBe(true);
});

test("side-effect-reconciliation cron endpoint returns JSON in non-production", async ({
  request,
}) => {
  const res = await request.get("/api/cron/side-effect-reconciliation");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    missingInvoicesFound: number;
    invoicesRepaired: number;
    missingDoiJobsFound: number;
    doiJobsRepaired: number;
    notifications: {
      pendingFound: number;
      retried: number;
      dispatched: number;
      skipped: number;
    };
  };
  expect(body.ok).toBe(true);
  expect(body).toHaveProperty("missingInvoicesFound");
  expect(body).toHaveProperty("doiJobsRepaired");
  expect(body.notifications).toMatchObject({
    pendingFound: expect.any(Number),
    retried: expect.any(Number),
    dispatched: expect.any(Number),
    skipped: expect.any(Number),
  });
});

test("compliance health endpoint exposes audit export and privacy features", async ({
  request,
}) => {
  const res = await request.get("/api/health/compliance");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    features: {
      auditTrailExport: boolean;
      coiPreviewOnInvite: boolean;
      userDataExport: boolean;
      defaultPrivacyPolicyPage: boolean;
      operationalRunbook: boolean;
      accountDeletion: boolean;
      rejectedSubmissionRetention: boolean;
    };
    privacyPolicyPageSlug: string;
  };
  expect(body.ok).toBe(true);
  expect(body.features.auditTrailExport).toBe(true);
  expect(body.features.coiPreviewOnInvite).toBe(true);
  expect(body.features.userDataExport).toBe(true);
  expect(body.features.defaultPrivacyPolicyPage).toBe(true);
  expect(body.features.accountDeletion).toBe(true);
  expect(body.features.rejectedSubmissionRetention).toBe(true);
  expect(body.privacyPolicyPageSlug).toBe("privacy-policy");
});

test("purge-rejected-submissions cron endpoint returns JSON in non-production", async ({
  request,
}) => {
  const res = await request.get("/api/cron/purge-rejected-submissions");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    journalsScanned: number;
    submissionsPurged: number;
  };
  expect(body.ok).toBe(true);
  expect(body).toHaveProperty("journalsScanned");
});

test("operational health endpoint exposes OAI rate-limit and email settings", async ({
  request,
}) => {
  const res = await request.get("/api/health/operational");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    ok: boolean;
    oaiRateLimitPerMinute: number;
    productionReady?: boolean;
    warnings?: string[];
    features: {
      oaiRateLimiting: boolean;
      oaiRetryAfterHeader: boolean;
      journalEmailFromSettings: boolean;
      journalEmailSettingsAdminUi: boolean;
    };
  };
  expect(body.ok).toBe(true);
  expect(body.oaiRateLimitPerMinute).toBeGreaterThanOrEqual(5);
  expect(body).toHaveProperty("productionReady");
  expect(body.features.oaiRateLimiting).toBe(true);
  expect(body.features.oaiRetryAfterHeader).toBe(true);
  expect(body.features.journalEmailFromSettings).toBe(true);
  expect(body.features.journalEmailSettingsAdminUi).toBe(true);
});
