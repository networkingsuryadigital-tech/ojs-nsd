# 11 — Checklist Operator: Garuda, CrossRef & Email (Pra-Launch)

> Panduan **manual** untuk tim operasional NSD sebelum jurnal pilot go-live dan pendaftaran indeksasi. Melengkapi [`07-production-deploy-checklist.md`](./07-production-deploy-checklist.md) §5–6.

**Terakhir diverifikasi teknis:** 2026-06-13 — endpoint OAI & validasi internal diuji di `demo.localhost:3000` (tanpa staging URL terpisah).

---

## Kapan dipakai

Jalankan checklist ini **setelah** deploy production/staging stabil dan **sebelum** mengajukan jurnal ke Garuda atau mengaktifkan deposit DOI production.

| Peran | Tanggung jawab |
|-------|----------------|
| **Journal Admin** (klien) | Lengkapi metadata jurnal, terbitkan ≥1 issue, review halaman kebijakan |
| **Operator NSD** | Verifikasi OAI, Resend DNS, env CrossRef, submit formulir Garuda |
| **DevOps** | Pastikan host jurnal HTTPS aktif, cron DOI jalan, env production terisi |

---

## 0. Prasyarat teknis (sudah di kode JMS)

Item berikut **tidak perlu dikembangkan lagi** — cukup diverifikasi di environment target:

| Item | Bukti di kode | Cara cek cepat |
|------|---------------|----------------|
| Endpoint OAI-PMH per tenant | `app/api/oai/route.ts` | `GET https://<host-jurnal>/api/oai?verb=Identify` → HTTP 200, XML valid |
| Health OAI | `GET /api/health/oai` | JSON `ok: true`, `metadataPrefix: "oai_dc"` |
| `ListRecords` hanya artikel terbit | `OAI_HARVEST_STATUSES = ["PUBLISHED","RETRACTED"]` | `ListRecords` tidak memuat submission `DRAFT`/`UNDER_REVIEW` |
| `dc:source` (nama jurnal + Vol/No + ISSN) | `domain/oai/dublin-core.ts` + validasi S25 | Lihat sample di `ListRecords` atau UI validasi |
| Validasi internal Garuda | S25 — `/editorial/settings/oai` | Semua cek hijau (`ready: true`) |
| Pengirim email per jurnal | S26 — `/editorial/settings/email` | Form nama + alamat tersedia untuk Journal Admin |
| Deposit DOI otomatis | S12 — `enqueueDoiDeposit` saat publish | `GET /api/health/doi` → integrasi aktif |
| Halaman kebijakan default | `domain/tenancy/default-pages.ts` | `/pages/peer-review-policy`, `/open-access-policy`, `/privacy-policy` |

---

## 1. Validasi OAI internal (wajib sebelum Garuda)

**Tujuan:** memastikan repository siap di-harvest tanpa menunggu proses manual Garuda.

### Langkah

1. Login sebagai **Journal Admin** atau **Editor in Chief** (production: setelah S28 auth; dev: `?actorId=<userId>`).
2. Buka **`/editorial/settings/oai`** pada host jurnal (bukan host platform polos).
3. Pastikan semua cek **lulus**:
   - ISSN jurnal terkonfigurasi
   - Minimal satu artikel `PUBLISHED`
   - Verb `Identify`, `ListMetadataFormats`, `ListRecords` valid
   - Sample `dc:source` memuat nama jurnal + ISSN

### API alternatif (operator/dev)

```http
GET /api/editorial/oai/validate?actorId=<journalAdminUserId>
Host: <host-jurnal>
```

Respons `ready: true` = siap lanjut ke validasi eksternal.

### Verifikasi lokal (2026-06-13)

| Endpoint | Hasil |
|----------|-------|
| `http://demo.localhost:3000/api/oai?verb=Identify` | HTTP 200, `protocolVersion` 2.0 |
| `http://demo.localhost:3000/api/oai?verb=ListRecords&metadataPrefix=oai_dc` | 1 record; `dc:source`: `Jurnal Demo NSD; Vol. 1, No. 1 (2026); ISSN 1234-5678` |
| `http://demo.localhost:3000/api/editorial/oai/validate?actorId=cmq7aqgfg000096k4vltbgcss` | `ready: true`, 8/8 cek lulus |
| `http://demo.localhost:3000/api/health/oai` | `ok: true`, semua verb terdaftar |

> **Staging:** ulangi URL di atas dengan host production/staging jurnal pilot. Ganti `demo.localhost` dengan subdomain atau custom domain aktif.

---

## 2. Validasi OAI eksternal (OpenArchives)

**Tujuan:** konfirmasi independen bahwa XML memenuhi OAI-PMH 2.0 sebelum submit ke Garuda.

### Langkah

1. Pastikan OAI dapat diakses **publik tanpa auth** dari internet (HTTPS disarankan).
2. Buka [OAI-PMH Validator](https://www.openarchives.org/Register/ValidateSite) (OpenArchives.org).
3. Masukkan **base URL OAI** jurnal:
   ```
   https://<host-jurnal>/api/oai
   ```
   Contoh production: `https://informatika.jms.nsd.id/api/oai` atau custom domain `https://jurnal.universitas.ac.id/api/oai`.
4. Jalankan validasi; perbaiki error yang dilaporkan (biasanya namespace, encoding, atau record kosong).
5. Uji manual verb kritis:
   - `?verb=Identify`
   - `?verb=ListMetadataFormats`
   - `?verb=ListRecords&metadataPrefix=oai_dc`
6. Simpan tangkapan layar / log validator untuk arsip operasional.

### Kesalahan umum

| Gejala | Penyebab | Perbaikan |
|--------|----------|-----------|
| Validator tidak bisa reach URL | DNS/SSL belum aktif, firewall | Selesaikan custom domain (S4), cek dari luar jaringan kantor |
| `ListRecords` kosong | Belum ada artikel `PUBLISHED` | Terbitkan issue via editorial workflow |
| `dc:source` tanpa ISSN | Metadata jurnal belum lengkap | Isi `issnOnline`/`issnPrint` di pengaturan jurnal |
| HTTP 429 | Rate limit OAI (S26) | Tunggu `Retry-After` atau naikkan `OAI_RATE_LIMIT_PER_MIN` sementara saat validasi |

---

## 3. Pendaftaran Garuda (manual)

**Tujuan:** memasukkan jurnal ke [Garba Rujukan Digital](https://garuda.kemdiktisaintek.go.id/) agar metadata dapat di-harvest dan mengalir ke SINTA.

### Prasyarat administratif

- [ ] ISSN terdaftar (cetak dan/atau online)
- [ ] Minimal **dua issue** telah terbit (persyaratan umum Garuda — konfirmasi ke helpdesk jika pilot hanya 1 issue)
- [ ] Kebijakan peer-review, etika, open access, dan privasi dapat diakses publik
- [ ] OAI internal **lulus** (§1) dan validator OpenArchives **lulus** (§2)
- [ ] Homepage jurnal aktif di HTTPS

### Langkah pendaftaran

1. Buka formulir saran jurnal: **https://garuda.kemdiktisaintek.go.id/suggest**
2. Isi formulir selengkap mungkin (hanya **editor/penerbit** yang disarankan mengisi).
3. Informasi kunci untuk JMS (bukan OJS):

   | Field formulir | Nilai JMS |
   |----------------|-----------|
   | URL homepage jurnal | `https://<host-jurnal>/` |
   | URL OAI-PMH | `https://<host-jurnal>/api/oai` |
   | Sistem manajemen jurnal | JMS PT. NSD (custom, **bukan** OJS) — jelaskan dukungan OAI-PMH 2.0 + Dublin Core |
   | ISSN | Dari pengaturan jurnal |
   | Subjek ARJUNA | Pilih bidang sesuai jurnal |

4. Lampirkan bukti jika diminta: tangkapan validasi OAI, contoh issue terbit, kebijakan peer-review.
5. Kirim formulir; tunggu email evaluasi (biasanya 2–3 hari kerja).
6. Kontak bantuan: **hdgaruda@kemdiktisaintek.go.id**

### Setelah disetujui

- [ ] Monitor harvest pertama: cek artikel muncul di portal Garuda
- [ ] Jika metadata tidak ter-update setelah publish baru: verifikasi `ListRecords` dan hubungi helpdesk Garuda
- [ ] SINTA/ARJUNA: akreditasi jurnal adalah proses terpisah di portal Kemdiktisaintek

---

## 4. Keanggotaan CrossRef & DOI production

**Tujuan:** artikel terbit memiliki DOI yang resolve ke landing page JMS.

### 4.1 Keanggotaan & prefix (sekali per penerbit)

1. Daftar keanggotaan CrossRef di [crossref.org](https://www.crossref.org/) (biaya tahunan).
2. Dapatkan **DOI prefix** (mis. `10.12345`) untuk penerbit NSD atau per klien.
3. Simpan kredensial depositor di secret store — **jangan** plaintext di database (`Journal.crossrefCredentialRef` menunjuk ke env).

### 4.2 Konfigurasi platform (env production)

| Variabel | Fungsi |
|----------|--------|
| `CROSSREF_DEPOSITOR_EMAIL` | Akun depositor |
| `CROSSREF_DEPOSITOR_PASSWORD` | Password default platform |
| `CROSSREF_DEPOSITOR_NAME` | Nama depositor (opsional) |
| `CROSSREF_REGISTRANT` | Registrant metadata (opsional) |
| `CROSSREF_IS_PRODUCTION` | `"true"` di production (`api.crossref.org`) |

Lihat `.env.example` dan [`sprints/s12-crossref-doi-deposit.md`](./sprints/s12-crossref-doi-deposit.md).

### 4.3 Konfigurasi per jurnal

Di Prisma / admin jurnal (saat provisioning atau Studio):

| Field `Journal` | Isi |
|-----------------|-----|
| `doiPrefix` | Prefix DOI penerbit, mis. `10.12345` |
| `crossrefDepositorName` | Nama depositor khusus jurnal (opsional) |
| `crossrefCredentialRef` | Nama env var password override (opsional) |

Tanpa `doiPrefix`, deposit **tidak** diantrikan (DOI opsional per jurnal).

### 4.4 Verifikasi setelah go-live

1. Terbitkan artikel uji → cek `DoiDepositJob` status `REGISTERED`.
2. `GET /api/health/doi` — integrasi aktif.
3. Cron `GET /api/cron/doi-deposits` terjadwal (Bearer `CRON_SECRET`).
4. Resolve DOI di [doi.org](https://doi.org/) → harus mengarah ke `/issues/<issueId>#article-<submissionId>`.
5. Jika gagal: lihat runbook §2 di [`08-operational-runbook.md`](./08-operational-runbook.md).

### 4.5 Mode uji (pre-production)

Set `CROSSREF_IS_PRODUCTION="false"` → endpoint `api.test.crossref.org`. Deposit uji **tidak** menghasilkan DOI production.

---

## 5. SPF & DKIM Resend per domain jurnal

**Tujuan:** email transaksional (invite reviewer, keputusan, invoice APC) tidak masuk spam.

### 5.1 Domain platform (wajib)

1. Login [Resend Dashboard](https://resend.com/domains) → **Add Domain**.
2. Tambahkan domain pengirim platform, mis. `mail.nsd.id` atau domain klien yang dikelola NSD.
3. Pasang record DNS yang ditampilkan Resend:
   - **SPF** — TXT record `v=spf1 include:...`
   - **DKIM** — CNAME/TXT record dari Resend
   - (Opsional) **DMARC** — `v=DMARC1; p=none` → naikkan ke `quarantine`/`reject` setelah stabil
4. Tunggu status **Verified** di Resend.
5. Set env production:
   ```
   RESEND_FROM_EMAIL="Jurnal NSD <noreply@mail.nsd.id>"
   ```
   **Jangan** pakai `onboarding@resend.dev` di production.

### 5.2 Domain per jurnal (white-label)

Jika jurnal mengirim dari domain sendiri (mis. `noreply@jurnal.universitas.ac.id`):

1. Verifikasi domain tersebut di Resend (langkah DNS sama seperti §5.1).
2. Journal Admin isi di **`/editorial/settings/email`**:
   - Nama pengirim (mis. "Jurnal Informatika UNXYZ")
   - Alamat email (harus domain terverifikasi di Resend)
3. UI menampilkan peringatan jika nama/alamat tidak lengkap atau `RESEND_FROM_EMAIL` platform belum diset.
4. Jika kosong, sistem fallback ke `RESEND_FROM_EMAIL` platform.

### 5.3 Uji kirim (manual)

- [ ] Invite reviewer → sampai inbox (bukan spam)
- [ ] Notifikasi keputusan accept/reject → author menerima
- [ ] Invoice APC → corresponding author menerima link bayar
- [ ] **Blind review:** email ke author **tidak** menyertakan nama reviewer (`anonymousLabel`)

---

## 6. Checklist ringkas operator

Centang sebelum menandai jurnal "siap indeks":

### Teknis (NSD)

- [ ] `GET /api/health/oai` → `ok: true` di host jurnal
- [ ] `/editorial/settings/oai` → semua cek hijau
- [ ] OpenArchives validator lulus untuk `https://<host>/api/oai`
- [ ] `ListRecords` memuat ≥1 artikel dengan `dc:source` lengkap
- [ ] Resend domain verified (SPF + DKIM)
- [ ] `RESEND_FROM_EMAIL` production bukan `resend.dev`
- [ ] Env `CROSSREF_*` production (jika DOI aktif)
- [ ] Cron `/api/cron/doi-deposits` terjadwal

### Konten (Journal Admin + NSD)

- [ ] ISSN valid terisi
- [ ] Halaman `/pages/peer-review-policy`, `/open-access-policy`, `/privacy-policy` dapat diakses dan relevan
- [ ] Minimal satu issue terbit dengan artikel lengkap (title, abstract, authors, galley PDF)

### Administratif (manual eksternal)

- [ ] Formulir Garuda disubmit di https://garuda.kemdiktisaintek.go.id/suggest
- [ ] Keanggotaan CrossRef aktif + prefix DOI dikonfigurasi (jika DOI diperlukan)
- [ ] Uji kirim email ketiga alur (reviewer / keputusan / APC) lulus

---

## Referensi

| Dokumen | Isi |
|---------|-----|
| [`07-production-deploy-checklist.md`](./07-production-deploy-checklist.md) | Checklist deploy §5–6 |
| [`04-integrations.md`](./04-integrations.md) | Spesifikasi OAI & CrossRef |
| [`08-operational-runbook.md`](./08-operational-runbook.md) | Troubleshooting DOI & cron |
| [`09-preview-lokal.md`](./09-preview-lokal.md) | Preview `demo.localhost:3000` |
| [`sprints/s25-oai-garuda-validation.md`](./sprints/s25-oai-garuda-validation.md) | Validasi OAI internal |
| [`sprints/s12-crossref-doi-deposit.md`](./sprints/s12-crossref-doi-deposit.md) | Deposit DOI |
