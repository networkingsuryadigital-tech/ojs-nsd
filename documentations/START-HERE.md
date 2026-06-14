# ⭐ MULAI DARI SINI — Urutan Eksekusi JMS

> Halaman jangkar. Kerjakan dari atas ke bawah. Jangan lompat.
> Status kode: S0–S30 selesai. Sisa = hardening (S31–S35) + deploy + onboarding pilot.

---

## Cuma ada 2 cara "menjalankan" file di sini

- **🤖 Cursor** = buka file → salin **blok prompt** → tempel ke chat Cursor. Cursor yang menulis kode.
- **🧑 Anda** = ikuti langkah panduan sendiri (klik di Vercel/cPanel/Supabase + perintah terminal).
- File `evaluasi-*.md` hanya **dibaca**, tidak dijalankan.

---

## 7 Langkah (urut)

| # | Langkah | Siapa | File / prompt |
|---|---------|-------|----------------|
| 1 | Keamanan privacy API (BLOCKER) | 🤖 Cursor | [`13-...md`](./13-eksekusi-post-s30-hardening.md) → **Prompt 1** (S31-A) |
| 2 | Guardrail mock production | 🤖 Cursor | [`13-...md`](./13-eksekusi-post-s30-hardening.md) → **Prompt 2** (S31-B) |
| 3 | Data dummy untuk tim uji coba | 🤖 Cursor | [`sprints/s34-dummy-data-generator.md`](./sprints/s34-dummy-data-generator.md) → blok **Prompt eksekusi** |
| 4 | Tampilan menarik (UI/UX) | 🤖 Cursor | [`sprints/s35-ui-ux-engagement.md`](./sprints/s35-ui-ux-engagement.md) → blok **Prompt eksekusi** |
| 5 | Rapikan dokumen + header cron | 🤖 Cursor | [`14-deploy-vercel-cpanelcron.md`](./14-deploy-vercel-cpanelcron.md) → **Prompt Cursor** (paling bawah) |
| 6 | **Deploy** (Vercel + Supabase + cPanel cron + domain) | 🧑 Anda | [`14-deploy-vercel-cpanelcron.md`](./14-deploy-vercel-cpanelcron.md) → Langkah 1–5 |
| 7 | Onboard jurnal pilot | 🧑 Anda | [`12-onboarding-jurnal-pilot.md`](./12-onboarding-jurnal-pilot.md) |

**Nanti (tidak mendesak, 🤖 Cursor):** [`13-...md`](./13-eksekusi-post-s30-hardening.md) Prompt 3–8 (S32, S33).

---

## 🤖 AUTOPILOT — kerjakan Langkah 1–5 sekaligus tanpa ditunggui

Tempel **satu blok ini** ke chat Cursor. Cursor akan mengerjakan kelima langkah kode berurutan, menjalankan pemeriksaan setelah tiap langkah, dan lanjut sendiri — supaya laptop Anda bekerja walau ditinggal.

> **Agar benar-benar tanpa henti:** di Cursor, aktifkan mode auto-run (Settings → "Auto-Run"/YOLO) supaya agen tidak berhenti menunggu izin tiap perintah. Pastikan database Supabase **tidak ter-pause** (langkah 3 menulis data).

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan 5 langkah ini BERURUTAN, tanpa berhenti menunggu
konfirmasi saya. Setelah TIAP langkah: jalankan pnpm lint + pnpm typecheck + pnpm test
(+ pnpm build/test:e2e bila relevan), centang checklist di file sprint terkait, update
documentations/06-sprint-log.md, lalu commit dengan pesan ringkas, lalu LANJUT ke langkah berikutnya.
Berhenti HANYA jika sebuah langkah gagal DoD-nya yang tidak bisa kamu perbaiki — tulis laporan
jelas lalu stop. Jika ragu antar pilihan minor, ambil opsi paling aman/minimal-diff dan lanjut.

LANGKAH 1 (BLOCKER keamanan): kerjakan documentations/sprints/s31-security-production-guardrails.md
  §Prompt A (privacy API export & delete WAJIB pakai session, bukan query userId/requesterId).
LANGKAH 2: kerjakan s31-security-production-guardrails.md §Prompt B (guardrail mock production + health).
LANGKAH 3: kerjakan documentations/sprints/s34-dummy-data-generator.md (generator @faker-js/faker
  ter-seed, bukan hardcode; semua status + skenario; tulis 13b-peta-telusur-dummy.md). Jalankan
  pnpm db:seed:dummy 2× untuk verifikasi idempoten (butuh DB Supabase aktif).
LANGKAH 4: kerjakan documentations/sprints/s35-ui-ux-engagement.md (tema terang-default + dark toggle,
  homepage platform direktori jurnal, sisi publik jurnal + halaman artikel, /login berbranding).
  HANYA presentasi — jangan ubah logika auth/tenant/state-machine.
LANGKAH 5: kerjakan Prompt Cursor di documentations/14-deploy-vercel-cpanelcron.md (perbaiki header
  cron pada contoh curl + longgarkan kalimat "Vercel Pro wajib" jadi "Pro ATAU cPanel cron",
  daftarkan dok 14 & START-HERE ke 00-index.md).

Setelah kelima langkah selesai & hijau: tulis ringkasan akhir (file diubah, hasil DoD tiap langkah,
sisa yang perlu operator) di akhir documentations/06-sprint-log.md. Lalu STOP — Langkah 6–7 (deploy +
onboarding) dikerjakan operator manusia, bukan kamu.
```

---

## Setelah Autopilot selesai → giliran Anda (🧑)

- **Langkah 6 — Deploy:** ikuti [`14-deploy-vercel-cpanelcron.md`](./14-deploy-vercel-cpanelcron.md). Inti: deploy app ke Vercel free, arahkan domain Anda, jalankan `pnpm db:migrate` + `pnpm db:seed:dummy` dari laptop, pasang 7 cron di cPanel, smoke test.
- **Langkah 7 — Pilot:** ikuti [`12-onboarding-jurnal-pilot.md`](./12-onboarding-jurnal-pilot.md) untuk menyiapkan satu jurnal nyata + akun admin.

> Deploy & onboarding **tidak bisa unattended** — perlu Anda klik di Vercel/cPanel/Supabase. Itu wajar.

---

## Yang masih perlu Anda urus paralel (di luar kode, makan waktu lama)

Mulai sekarang karena prosesnya berminggu-minggu: keanggotaan **CrossRef** + prefix DOI, validasi **OAI** (validator OpenArchives), pendaftaran **Garuda**, lalu **ARJUNA→SINTA**. Rincian di [`11-go-live-pilot-checklist.md`](./11-go-live-pilot-checklist.md).

---

## Patokan biaya (uji coba)

Vercel free + Supabase free + cPanel (sudah punya) + domain (sudah punya) = **Rp 0**.
Naikkan **Supabase → Pro** hanya saat pilot nyata mulai (auto-pause/koneksi). Itu biaya penting berikutnya.
