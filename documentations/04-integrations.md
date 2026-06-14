# 04 — Integrasi Eksternal

> Menjawab **Poin 4** brief: OAI-PMH + Dublin Core, CrossRef DOI, payment gateway APC (timing setelah accept), serta nice-to-have: similarity check & AI auto-assign reviewer.
>
> Semua integrasi **dirancang penuh** di skema & arsitektur; roadmap (`05`) menandai MVP vs fase lanjut.

---

## 1. OAI-PMH + Dublin Core (WAJIB sejak awal — untuk Garuda & SINTA)

Garuda (Garba Rujukan Digital, Kemdiktisaintek) memanen metadata via **OAI-PMH 2.0** dengan format metadata **Dublin Core (`oai_dc`)**. SINTA menarik data dari Garuda. Maka endpoint OAI-PMH harus benar dan stabil.

### 1.1 Endpoint

Satu base URL **per jurnal** (tenant-scoped), mis.:
```
https://<host-jurnal>/api/oai        (atau /oai)
```
Route Handler `app/api/oai/route.ts` membaca tenant dari host (lihat `01`).

### 1.2 Verb yang wajib didukung

`Identify`, `ListMetadataFormats`, `ListSets`, `ListIdentifiers`, `ListRecords`, `GetRecord`. Dukung `oai_dc` minimal; resumption token untuk paginasi.

### 1.3 Identifier & datestamp

- Format identifier OAI: `oai:<host-jurnal>:<submissionId>` (atau pakai DOI bila ada).
- `datestamp` = `Submission.publishedAt`/`updatedAt` (UTC, presisi detik).
- Hanya artikel `PUBLISHED` yang muncul di `ListRecords`/`GetRecord`.

### 1.4 Mapping Dublin Core (`oai_dc`)

| DC element | Sumber |
|-----------|--------|
| `dc:title` | `SubmissionTranslation.title` — satu `dc:title` per bahasa (id + en) dengan `xml:lang` |
| `dc:creator` | tiap `SubmissionAuthor.fullName` (urut `order`) |
| `dc:subject` | `SubmissionTranslation.keywords[]` — per bahasa, `xml:lang` |
| `dc:description` | `SubmissionTranslation.abstract` — per bahasa, `xml:lang` |
| `dc:publisher` | `Journal.publisher` |
| `dc:date` | `Submission.publishedAt` (YYYY-MM-DD) |
| `dc:type` | "article" |
| `dc:format` | mime galley (mis. application/pdf) |
| `dc:identifier` | DOI (jika ada) + URL artikel |
| `dc:source` | `Journal.name`, Vol/No/Tahun (dari `Issue`) + ISSN |
| `dc:language` | `Submission.primaryLanguage` (ISO 639) |
| `dc:relation` | URL issue |
| `dc:rights` | lisensi (mis. CC-BY 4.0) |

### 1.5 Implementasi

`infrastructure/oai/` membangun XML (gunakan builder eksplisit, escape entitas, deklarasi namespace `oai_dc`/`dc` benar). Cache respons `ListRecords` di Upstash (invalidasi saat ada artikel terbit). Validasi keluaran dengan validator OAI-PMH (mis. tool resmi OpenArchives / re3data) sebelum mendaftarkan jurnal ke Garuda.

> Setelah valid: daftarkan base URL OAI ke Garuda (registrasi manual lewat portal Garuda) dan ke SINTA (akreditasi ARJUNA) — proses administratif, bukan kode.

## 2. CrossRef — registrasi DOI

CrossRef = registration agency DOI. Deposit metadata via **HTTPS POST** ke endpoint deposit dengan skema XML CrossRef terbaru (saat ini seri **5.4.0**).

### 2.1 Kapan

Saat `publishToIssue` (artikel `PUBLISHED`) — set `Submission.doiStatus = PENDING`, kirim deposit, lalu update ke `REGISTERED`/`FAILED` berdasarkan hasil polling/submission log.

### 2.2 Alur

```
publishToIssue
  → generate DOI: <Journal.doiPrefix>/<suffix unik>   (suffix: slug+id atau pola jurnal)
  → bangun XML CrossRef (journal article): journal metadata + ISSN + issue + article + authors(+ORCID) + DOI + resource URL
  → POST multipart/form-data ke endpoint deposit CrossRef (kredensial dari secret store; jangan plaintext di DB — Journal.crossrefCredentialRef menunjuk ke secret)
  → simpan submission log id; job background poll status
  → set Submission.doi + doiStatus
```

`infrastructure/crossref/` = klien deposit + builder XML + parser hasil. Retry dengan backoff (job queue); idempotensi via `ProcessedWebhook`/log agar tidak deposit ganda. Mode `test` vs `production` (CrossRef punya environment terpisah) lewat env.

### 2.3 Catatan

- Butuh keanggotaan CrossRef berbayar + prefix DOI per penerbit. Satu prefix bisa dipakai banyak jurnal di bawah penerbit yang sama (`Journal.doiPrefix`).
- DOI harus resolve ke halaman artikel (landing page) yang menampilkan metadata — pastikan URL artikel publik stabil.

## 3. Payment Gateway — model APC

### 3.1 Timing (kritis)

Invoice dibuat **hanya setelah `ACCEPTED`** (lihat `03` §3). Tidak ada pembayaran saat submit.

```
acceptSubmission
  → if Journal.apcAmount == 0: buat ApcInvoice{status: WAIVED} → IN_PRODUCTION
  → else: createApcInvoice → status ISSUED, Submission → PAYMENT_PENDING
        → kirim email invoice ke corresponding author dengan paymentUrl
```

### 3.2 Adaptor

Pakai `packages/payments` (di-share dari e-learning: Midtrans/Duitku sudah ada). Untuk JMS tambah/abstraksi `PaymentProvider` (Midtrans / Xendit). Antarmuka adaptor:

```ts
interface PaymentAdapter {
  createCharge(input: { invoiceId; amount; currency; customer; metadata }): Promise<{ externalRef; paymentUrl }>;
  verifyWebhook(req): Promise<{ eventId; externalRef; status }>;
}
```

### 3.3 Webhook

Route Handler `app/api/webhooks/[provider]/route.ts`:
1. Verifikasi signature provider.
2. Cek idempotensi `ProcessedWebhook(eventId)`.
3. Map status → `PaymentTransaction` + `ApcInvoice.status`.
4. Jika `PAID`: `transitionSubmission('paymentSettled')` → `IN_PRODUCTION`.

Pola idempotensi & verifikasi identik dengan webhook Stripe/Midtrans e-learning yang sudah ada.

### 3.4 Multi-tenant billing

Dua model (konfigurasikan per jurnal):
- **Platform sebagai merchant** (sederhana): semua APC masuk akun NSD, lalu settlement/payout ke jurnal (catat sebagai ledger). Cocok untuk awal.
- **Sub-merchant per jurnal** (fase lanjut): tiap jurnal punya kredensial gateway sendiri (mirip Stripe Connect di e-learning). `Journal` menyimpan referensi kredensial (di secret store).

## 4. Similarity check (nice-to-have)

- Abstraksi `infrastructure/similarity/` dengan antarmuka `SimilarityProvider.check(file): { score, reportUrl }`.
- Provider: **iThenticate/Turnitin** (berbayar, standar jurnal) sebagai target; sediakan adaptor alternatif (mis. PlagScan/Copyleaks) di belakang antarmuka sama.
- Dipicu di `DESK_REVIEW` (atau saat submit): set `Submission.similarityStatus = PENDING`, simpan `similarityScore` + `reportUrl` saat selesai. Editor melihat skor sebelum `sendToReview`.
- MVP: kolom & UI placeholder + unggah laporan manual; integrasi API di fase lanjut.

## 5. AI auto-assign reviewer (nice-to-have)

- `infrastructure/ai/` mencocokkan `SubmissionTranslation.keywords`/abstract dengan `ReviewerProfile.keywords`/`embedding`.
- Pendekatan bertingkat:
  1. **MVP**: pencocokan kata kunci + filter beban (`maxLoad`) + hindari konflik kepentingan (afiliasi sama / co-author sebelumnya).
  2. **Lanjut**: embedding semantik (abstrak ↔ profil reviewer) untuk ranking; sarankan top-N ke editor (editor tetap yang memutuskan & mengundang).
- Output = saran, bukan auto-invite, agar editor tetap memegang kendali (dan menjaga akuntabilitas).

## 6. Storage file

- Supabase Storage; key berprefix `journals/<journalId>/submissions/<submissionId>/...`.
- Signed URL berdurasi pendek; akses divalidasi lewat use-case (peran pada submission). File anonim disimpan terpisah dari versi asli.

---

Lanjut: `05-repo-shared-roadmap.md`.
