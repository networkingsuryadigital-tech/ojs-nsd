# Sprint Execution Docs

> **Log eksekusi** roadmap (`05-repo-shared-roadmap.md` §2). Setiap sprint yang **sudah selesai** punya file sendiri berisi deliverable, verifikasi, dan **prompt langkah selanjutnya**.
>
> Rancangan desain (`01`–`05`) = kontrak arsitektur. Folder ini = catatan **apa yang sudah dibangun** di repo.

## Cara pakai

1. Cek status ringkas di [`06-sprint-log.md`](../06-sprint-log.md).
2. Buka file sprint terakhir yang berstatus ✅ untuk detail & verifikasi.
3. Salin blok **Prompt langkah selanjutnya** di akhir file itu ke chat AI Agent untuk melanjutkan **sprint berikutnya** — jangan lompat sprint.
4. Sebelum deploy production: [`07-production-deploy-checklist.md`](../07-production-deploy-checklist.md) + [`08-operational-runbook.md`](../08-operational-runbook.md).

## Daftar sprint

| Sprint | File | Status | Fokus |
|--------|------|--------|-------|
| S0 | [`s0-foundation.md`](./s0-foundation.md) | ✅ Selesai | Monorepo, `apps/jms` scaffold, shared packages |
| S1 | [`s1-schema-rls.md`](./s1-schema-rls.md) | ✅ Selesai | Skema Prisma penuh + migrasi + RLS + `withTenant()` |
| S2 | [`s2-tenant-identity.md`](./s2-tenant-identity.md) | ✅ Selesai | Provisioning jurnal, middleware tenant, cache Upstash |
| S3 | [`s3-white-label-locale.md`](./s3-white-label-locale.md) | ✅ Selesai | White-label + locale (next-intl) |
| S4 | [`s4-custom-domain-ssl.md`](./s4-custom-domain-ssl.md) | ✅ Selesai | Custom domain + SSL |
| S5 | [`s5-submission.md`](./s5-submission.md) | ✅ Selesai | Submission DRAFT→SUBMITTED |
| S6 | [`s6-state-machine.md`](./s6-state-machine.md) | ✅ Selesai | State machine + EditorialEvent audit |
| S7 | [`s7-review-desk.md`](./s7-review-desk.md) | ✅ Selesai | Desk review + peer review + anonimitas |
| S8 | [`s8-editorial-decision.md`](./s8-editorial-decision.md) | ✅ Selesai | Keputusan editor + revisi-resubmit |
| S9 | [`s9-notifications.md`](./s9-notifications.md) | ✅ Selesai | Notifikasi in-app + email + cron |
| S10 | [`s10-issue-galley-publish.md`](./s10-issue-galley-publish.md) | ✅ Selesai | Issue, galley, publish |
| S11 | [`s11-oai-pmh-dublin-core.md`](./s11-oai-pmh-dublin-core.md) | ✅ Selesai | OAI-PMH + Dublin Core |
| S12 | [`s12-crossref-doi-deposit.md`](./s12-crossref-doi-deposit.md) | ✅ Selesai | CrossRef DOI deposit |
| S13 | [`s13-apc-billing.md`](./s13-apc-billing.md) | ✅ Selesai | APC billing |
| S14 | [`s14-apc-waiver-ledger.md`](./s14-apc-waiver-ledger.md) | ✅ Selesai | Waiver/diskon + ledger |
| S15 | [`s15-journal-statistics-dashboard.md`](./s15-journal-statistics-dashboard.md) | ✅ Selesai | Dashboard statistik |
| S16 | [`s16-similarity-check.md`](./s16-similarity-check.md) | ✅ Selesai | Similarity check (Copyleaks) |
| S17 | [`s17-ai-reviewer-matching.md`](./s17-ai-reviewer-matching.md) | ✅ Selesai | AI reviewer matching |
| S18 | [`s18-reviewer-embedding-persistence.md`](./s18-reviewer-embedding-persistence.md) | ✅ Selesai | Persistensi embedding reviewer + cron batch |
| S19 | [`s19-similarity-ithenticate-gate.md`](./s19-similarity-ithenticate-gate.md) | ✅ Selesai | iThenticate adaptor + gate sendToReview |
| S20 | [`s20-compliance-operational.md`](./s20-compliance-operational.md) | ✅ Selesai | Compliance §3 + runbook operasional |
| S21 | [`s21-similarity-settings-admin.md`](./s21-similarity-settings-admin.md) | ✅ Selesai | UI admin kebijakan similarity |
| S22 | [`s22-retraction-correction-doi.md`](./s22-retraction-correction-doi.md) | ✅ Selesai | Retraction/correction + DOI update |
| S23 | [`s23-privacy-account-deletion.md`](./s23-privacy-account-deletion.md) | ✅ Selesai | Hapus akun + retensi naskah ditolak |
| S24 | [`s24-coi-coauthor-history.md`](./s24-coi-coauthor-history.md) | ✅ Selesai | COI co-author history lintas submission |
| S25 | [`s25-oai-garuda-validation.md`](./s25-oai-garuda-validation.md) | ✅ Selesai | Validasi OAI Garuda sebelum pendaftaran |
| S26 | [`s26-operational-hardening.md`](./s26-operational-hardening.md) | ✅ Selesai | Rate-limit OAI + pengirim email per jurnal |
| S27 | [`s27-launch-readiness.md`](./s27-launch-readiness.md) | ✅ Selesai | Pra-launch: beban OAI, e2e penuh, reliabilitas |
| S28 | [`s28-auth-ui.md`](./s28-auth-ui.md) | ✅ Selesai | Auth UI `/login` + session guard |
| S29 | [`s29-author-reviewer-portal.md`](./s29-author-reviewer-portal.md) | ✅ Selesai | Portal author/reviewer + landing platform |
| S30 | [`s30-go-live-execution.md`](./s30-go-live-execution.md) | ✅ Selesai (kode) | Cron, DoD, checklist go-live, onboarding pilot |
| S31 | [`s31-security-production-guardrails.md`](./s31-security-production-guardrails.md) | ⏳ Belum | Privacy API auth + guardrail mock production |
| S32 | [`s32-ci-anonymization-docs-sync.md`](./s32-ci-anonymization-docs-sync.md) | ⏳ Belum | CI e2e, anonimisasi DOCX, sync docs/RLS |
| S33 | [`s33-post-pilot-platform.md`](./s33-post-pilot-platform.md) | ⏳ Belum | Lisensi artikel, SUPER_ADMIN, Duitku webhook |

> **Pasca-S30:** salin prompt berurutan dari [`13-eksekusi-post-s30-hardening.md`](../13-eksekusi-post-s30-hardening.md) — **S31-A blocker deploy**.
>
> **Pasca-S26 (legacy):** [`10-eksekusi-chat-berurutan.md`](../10-eksekusi-chat-berurutan.md) (S27–S29, selesai).
