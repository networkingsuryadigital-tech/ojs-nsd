# 08 — Operational Runbook (JMS)

> Panduan operasional untuk tim NSD saat production. Melengkapi [`07-production-deploy-checklist.md`](./07-production-deploy-checklist.md).

---

## 1. Rekonsiliasi side-effect gagal

**Gejala:** Submission sudah `ACCEPTED` tapi tidak ada invoice APC, atau artikel `PUBLISHED` tanpa job DOI.

**Diagnosis:**
1. Cek `EditorialEvent` dengan `type = SIDE_EFFECT_FAILED` pada submission terkait.
2. `GET /api/health/billing` dan `/api/health/doi` — pastikan integrasi aktif.

**Perbaikan:**
1. Cron otomatis: `GET /api/cron/side-effect-reconciliation` (Bearer `CRON_SECRET`) setiap 6 jam.
2. Manual: jalankan cron sekali dari Vercel dashboard atau `curl` dengan header auth.
3. Verifikasi invoice/job muncul setelah cron.

---

## 2. DOI deposit gagal / tertahan

**Gejala:** `DoiDepositJob.status = FAILED` atau `PENDING` lama.

**Diagnosis:**
1. Cek env `CROSSREF_*` production.
2. Lihat log Sentry untuk error deposit.
3. `GET /api/cron/doi-deposits` — retry otomatis setiap 30 menit.

**Perbaikan:**
1. Perbaiki kredensial CrossRef jika 401/403.
2. Trigger cron manual.
3. Jika XML invalid: perbaiki metadata submission (ISSN, title, authors) lalu reset job ke `PENDING` via Prisma Studio (tenant-scoped).

---

## 3. Similarity check tertahan

**Gejala:** `SimilarityCheckJob` `PENDING` / `SUBMITTED` lama; skor tidak muncul di desk review.

**Diagnosis:**
1. `GET /api/health/similarity` — provider aktif (`copyleaks` / `ithenticate` / `mock`).
2. Copyleaks: pastikan webhook `POST /api/webhooks/copyleaks` terdaftar.
3. iThenticate: pastikan webhook `POST /api/webhooks/turnitin` + polling cron.

**Perbaikan:**
1. Cron: `GET /api/cron/similarity-checks` setiap 10 menit.
2. Duplikat webhook aman — `ProcessedWebhook` idempoten.
3. Job `FAILED`: periksa `externalScanId` dan unggah ulang naskah jika perlu (buat submission baru atau reset via admin).

---

## 4. Reviewer embedding stale

**Gejala:** Saran reviewer menampilkan "Embedding: perlu refresh".

**Perbaikan:**
1. Cron: `GET /api/cron/reviewer-embeddings` — jadwal `0 2 * * *`.
2. Editor dapat update profil reviewer di dashboard editorial (trigger refresh per user).
3. Tanpa `OPENAI_API_KEY`: sistem memakai mock embedding (dev-safe).

---

## 5. Webhook payment Midtrans

**Gejala:** Invoice `PENDING` setelah pembayaran sukses.

**Diagnosis:**
1. Dashboard Midtrans — notification URL harus `https://<host>/api/webhooks/midtrans`.
2. Cek `ProcessedWebhook` untuk duplikat/gagal parse.

**Perbaikan:**
1. Kirim ulang notifikasi dari dashboard Midtrans.
2. Jangan hapus URL webhook lama sebelum deploy baru stabil.

---

## 6. Ekspor audit trail (akreditasi / etika)

Editor jurnal dapat mengunduh jejak audit per submission:

```
GET /api/editorial/submissions/{submissionId}/audit-trail?actorId={editorUserId}
```

Header tenant: host jurnal (subdomain/CNAME). Output: JSON `EditorialEvent` berurutan kronologis.

---

## 7. Ekspor data pribadi (UU PDP)

User dapat meminta ekspor data sendiri:

```
GET /api/privacy/export?userId={id}&requesterId={id}
```

Hanya `userId === requesterId`. Output: profil, keanggotaan jurnal, partisipasi submission (tanpa PII pihak lain).

> **Catatan:** Penghapusan akun penuh memerlukan koordinasi Supabase Auth + anonimisasi submission — belum otomatis di S20.

---

## 8. Alerting disarankan

| Sinyal | Aksi |
|--------|------|
| Error rate webhook payment > 0 | Cek Midtrans + invoice stuck |
| `SIDE_EFFECT_FAILED` events | Jalankan side-effect-reconciliation |
| OAI 429 (rate limit) | Normal untuk harvester agresif; pantau Upstash |
| Sentry spike pasca-deploy | Rollback Vercel jika kritis |

---

## Referensi

| Dokumen | Isi |
|---------|-----|
| `07-production-deploy-checklist.md` | Checklist deploy |
| `05-repo-shared-roadmap.md` §3 | Risiko compliance |
| `sprints/s20-compliance-operational.md` | Deliverable sprint S20 |
