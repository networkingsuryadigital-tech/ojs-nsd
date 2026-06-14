# Prompt untuk Chat Baru: Merancang Journal Management System (JMS)

Salin teks di bawah ini ke chat baru:

---

Saya dari PT. Networking Surya Digital (PT. NSD). Kami sudah punya platform e-learning (Next.js + Supabase + Prisma, dengan payment gateway Midtrans/Duitku yang sudah hampir rampung), dan sekarang berencana membangun produk SaaS baru: **Journal Management System (JMS)** — alternatif custom dari OJS (Open Journal Systems) untuk pengelolaan jurnal ilmiah di Indonesia.

Dari diskusi sebelumnya dengan Claude, kami sudah sepakat: **bangun repo baru** (bukan konversi dari proyek e-learning), dengan menarik komponen yang sudah matang dari e-learning (payment/webhook, auth, notifikasi/email, storage, UI kit) menjadi shared library/package.

## Konteks produk

- **Target pengguna**: dosen dan mahasiswa yang mengelola/menerbitkan jurnal akademik (untuk publikasi, akreditasi, kenaikan pangkat).
- **Target klien**: universitas swasta, jurnal kampus, dosen pengelola jurnal mandiri.
- **Model bisnis**: APC (Article Processing Charge) — penulis bayar setelah artikel diterima (accepted), bukan saat submit.
- **Wajib**: kompatibilitas indeksasi SINTA & Garuda (artinya OAI-PMH endpoint harus ada sejak rancangan awal, dengan metadata Dublin Core).

## Alur editorial inti (workflow engine)

```
Submit Artikel → Desk Review → Peer Review (blind/double-blind)
→ Revisi & Resubmit → Accept/Reject → Invoice APC → Payment Gateway
→ Galley Editing → Published
```

Catatan: ini BUKAN alur linear seperti progres kursus di e-learning — ada percabangan, perulangan (siklus revisi-resubmit), penugasan reviewer paralel, dan keputusan kondisional di tiap tahap.

## Fitur teknis wajib

- Multi-tenant (satu sistem, banyak jurnal/institusi) + custom domain per klien (CNAME) + SSL per tenant
- OAI-PMH endpoint + metadata Dublin Core per artikel
- DOI Registration via CrossRef API
- Payment Gateway lokal (Midtrans/Xendit) untuk model APC
- White-label per klien
- Notifikasi otomatis per tahap workflow
- Role management kontekstual: Author, Reviewer, Editor, Admin Jurnal, Super Admin (satu orang bisa punya peran berbeda di submission berbeda — bukan hierarki flat seperti di e-learning)

## Fitur tambahan (nice to have)

- AI layer: auto-assign reviewer berdasarkan topik/keahlian
- Similarity check (integrasi iThenticate atau alternatif)
- Dashboard statistik per jurnal

## Yang saya minta dari Anda

Tolong rancang aplikasi ini secara konkret, termasuk (tapi jangan terbatas pada):

1. **Skema data** (model Prisma/database) untuk entitas inti: Journal/Tenant, Article/Submission, Review, Author, Reviewer Assignment, APC Invoice, dll — termasuk bagaimana relasi peran-per-konteks (bukan role hierarkis) dimodelkan.
2. **Rancangan workflow/state machine editorial** — state apa saja, transisi apa yang valid, siapa yang bisa memicu transisi apa, bagaimana menangani siklus revisi-resubmit.
3. **Arsitektur multi-tenant**: bagaimana isolasi data antar jurnal, resolusi tenant dari custom domain (CNAME), strategi SSL otomatis, dan pendekatan white-label.
4. **Rancangan integrasi eksternal**: OAI-PMH endpoint (struktur XML/Dublin Core), CrossRef DOI registration, payment gateway untuk APC (timing invoice setelah accept).
5. **Struktur repo dan shared library**: apa yang masuk shared package vs. spesifik JMS, dan bagaimana keduanya (e-learning & JMS) bisa saling memanfaatkan tanpa saling mengikat.
6. **Hal-hal yang mungkin belum kami pikirkan** — silakan tambahkan poin, risiko, atau pertanyaan yang menurut Anda penting tapi belum disebutkan dalam brief ini (misalnya: kepatuhan terhadap persyaratan SINTA/Garuda secara detail, kebutuhan audit trail untuk proses peer review, masalah anonimitas reviewer, retensi data, dsb).

Silakan ajukan pertanyaan klarifikasi dulu sebelum mulai merancang jika ada yang kurang jelas.

---

**Catatan**: Anda bisa lampirkan folder proyek e-learning (academy.cursor) ke chat baru ini agar Claude bisa langsung merujuk pola kode yang sudah ada (payment, auth, notifikasi, dll) saat merancang skema dan arsitektur baru.
