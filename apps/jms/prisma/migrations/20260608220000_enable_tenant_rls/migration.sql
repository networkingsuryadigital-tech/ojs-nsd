-- Row-Level Security policies for JMS multi-tenant isolation (Sprint 1).

ALTER TABLE "Journal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Journal" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Journal"
  USING (id = current_setting('app.current_journal_id', true))
  WITH CHECK (id = current_setting('app.current_journal_id', true));

ALTER TABLE "JournalDomain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalDomain" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "JournalDomain"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "JournalTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalTheme" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "JournalTheme"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "JournalPage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalPage" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "JournalPage"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "JournalMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalMembership" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "JournalMembership"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "Section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Section" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Section"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "Submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Submission" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Submission"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "EditorialEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EditorialEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EditorialEvent"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Issue" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Issue"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "ApcInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApcInvoice" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ApcInvoice"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Notification"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "SubmissionTranslation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubmissionTranslation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SubmissionTranslation"
  USING (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "SubmissionTranslation"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "SubmissionTranslation"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  );

ALTER TABLE "SubmissionParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubmissionParticipant" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SubmissionParticipant"
  USING (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "SubmissionParticipant"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "SubmissionParticipant"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  );

ALTER TABLE "SubmissionAuthor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubmissionAuthor" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SubmissionAuthor"
  USING (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "SubmissionAuthor"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "SubmissionAuthor"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  );

ALTER TABLE "SubmissionFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubmissionFile" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SubmissionFile"
  USING (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "SubmissionFile"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "SubmissionFile"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  );

ALTER TABLE "ReviewAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewAssignment" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ReviewAssignment"
  USING (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "ReviewAssignment"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "ReviewAssignment"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  );

ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Review"
  USING (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "Review"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "Review"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  );

ALTER TABLE "EditorialDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EditorialDecision" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EditorialDecision"
  USING (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "EditorialDecision"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "EditorialDecision"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  );

ALTER TABLE "Galley" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Galley" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Galley"
  USING (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "Galley"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Submission" s
      WHERE s.id = "Galley"."submissionId"
        AND s."journalId" = current_setting('app.current_journal_id', true)
    )
  );

ALTER TABLE "PaymentTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentTransaction" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PaymentTransaction"
  USING (
    EXISTS (
      SELECT 1 FROM "ApcInvoice" i
      WHERE i.id = "PaymentTransaction"."invoiceId"
        AND i."journalId" = current_setting('app.current_journal_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "ApcInvoice" i
      WHERE i.id = "PaymentTransaction"."invoiceId"
        AND i."journalId" = current_setting('app.current_journal_id', true)
    )
  );
