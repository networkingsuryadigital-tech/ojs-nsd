# 02 — Skema Data (Prisma)

> Menjawab **Poin 1** brief. Berisi skema Prisma lengkap untuk entitas inti, termasuk pemodelan **role-per-context** (bukan role hierarkis flat).

Prinsip:
- Semua tabel tenant-scoped punya `journalId` (RLS, lihat `01`).
- ID `cuid()` (konsisten dengan e-learning).
- Transisi status submission tidak pernah di-update langsung — selalu lewat use-case + tulis `EditorialEvent`.
- Anonimitas reviewer adalah invariant: lihat `Review` & catatan di `03`.

---

## 1. Pemodelan peran — kunci desain

Tiga lapis peran:

1. **Platform** — `User.platformRole` (`USER` / `SUPER_ADMIN`). Hanya untuk operasi lintas-tenant.
2. **Per-jurnal** — `JournalMembership` menghubungkan `User`↔`Journal` dengan satu/lebih peran fungsional (Journal Admin, Editor, Section Editor, Reviewer pool, Author). Seorang user bisa Editor di Jurnal A dan Author di Jurnal B.
3. **Per-submission** — `SubmissionParticipant` menetapkan peran konkret pada satu naskah (siapa author-nya, siapa handling editor, reviewer mana yang ditugaskan). Inilah yang dipakai untuk otorisasi aksi editorial dan untuk menjaga anonimitas.

Otorisasi efektif = gabungan ketiganya, di-resolusi oleh `application/identity/resolveEffectiveRole`.

---

## 2. Skema Prisma

> File nyata: `apps/jms/prisma/schema.prisma`. Di bawah adalah rancangan kanonik.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ──────────────────────────── ENUMS ────────────────────────────

enum PlatformRole {
  USER
  SUPER_ADMIN
}

/// Peran fungsional dalam satu jurnal (boleh banyak per membership).
enum JournalRole {
  JOURNAL_ADMIN     // mengelola jurnal: tim, kebijakan, billing, domain
  EDITOR_IN_CHIEF   // keputusan akhir editorial
  SECTION_EDITOR    // handling editor per section/rubrik
  REVIEWER          // anggota pool reviewer jurnal
  AUTHOR            // pernah/akan submit ke jurnal ini
  COPYEDITOR        // galley/copyediting
  READER            // langganan/akses konten (opsional)
}

/// Peran konkret pada satu submission.
enum SubmissionRoleType {
  AUTHOR
  CORRESPONDING_AUTHOR
  HANDLING_EDITOR
  REVIEWER
  COPYEDITOR
}

enum SubmissionStatus {
  DRAFT
  SUBMITTED
  DESK_REVIEW
  DESK_REJECTED
  UNDER_REVIEW
  REVISIONS_REQUESTED   // minor/major revision diminta
  RESUBMITTED
  ACCEPTED
  REJECTED
  WITHDRAWN
  PAYMENT_PENDING       // APC invoice dibuat, menunggu bayar
  IN_PRODUCTION         // copyediting/galley
  PUBLISHED
}

enum ReviewRecommendation {
  ACCEPT
  MINOR_REVISION
  MAJOR_REVISION
  REJECT
  SEE_COMMENTS
}

enum ReviewAssignmentStatus {
  INVITED
  ACCEPTED
  DECLINED
  SUBMITTED
  CANCELLED
  OVERDUE
}

enum ReviewModel {
  SINGLE_BLIND
  DOUBLE_BLIND
  OPEN
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PAID
  FAILED
  REFUNDED
  WAIVED        // waiver/discount penuh
  CANCELLED
}

enum PaymentProvider {
  MIDTRANS
  XENDIT
  MANUAL_TRANSFER
}

enum LedgerEntryType {
  APC_EARNED
  PAYOUT
  ADJUSTMENT
}

enum PayoutStatus {
  PENDING
  COMPLETED
  CANCELLED
}

enum DomainSslStatus {
  PENDING
  ACTIVE
  FAILED
}

enum DoiStatus {
  NONE
  PENDING
  REGISTERED
  FAILED
}

enum SimilarityStatus {
  NOT_RUN
  PENDING
  COMPLETED
  FAILED
}

enum FileType {
  MANUSCRIPT          // naskah utama
  ANONYMIZED_MANUSCRIPT
  SUPPLEMENTARY
  REVIEW_ATTACHMENT
  REVISION
  GALLEY              // versi terbit
  COVER_LETTER
}

// ──────────────────────────── IDENTITY ────────────────────────────

model User {
  id            String   @id @default(cuid())
  supabaseId    String   @unique
  email         String   @unique
  name          String?
  affiliation   String?           // institusi/afiliasi
  orcid         String?           // ORCID iD (penting untuk metadata)
  country       String?
  avatarUrl     String?
  platformRole  PlatformRole @default(USER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  memberships          JournalMembership[]
  submissionRoles      SubmissionParticipant[]
  reviewAssignments    ReviewAssignment[]
  reviewsAuthored      Review[]
  triggeredEvents      EditorialEvent[]        @relation("EventActor")
  reviewerProfile      ReviewerProfile?
  notifications        Notification[]
}

/// Profil keahlian reviewer (untuk AI auto-assign & matching).
model ReviewerProfile {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  keywords            String[]              // bidang keahlian
  maxLoad             Int       @default(3) // batas review aktif bersamaan
  embedding           Json?                 // vektor topik (cache matching semantik)
  embeddingModel      String?               // model ID saat embed terakhir (S18)
  embeddingSourceHash String?               // fingerprint keywords — skip re-embed jika tidak berubah (S18)
  updatedAt           DateTime  @updatedAt
}

// ──────────────────────────── TENANT / JOURNAL ────────────────────────────

model Journal {
  id            String   @id @default(cuid())
  name          String
  subdomain     String   @unique            // nama-jurnal.jms.nsd.id
  issnPrint     String?
  issnOnline    String?
  publisher     String?
  reviewModel   ReviewModel @default(DOUBLE_BLIND)
  apcAmount     Int        @default(0)       // dalam IDR (rupiah penuh)
  apcCurrency   String     @default("IDR")
  apcRevenueShareBps Int   @default(8500)    // basis points — bagian jurnal (8500 = 85%)
  oaiRepoName   String?                      // nama repository utk OAI Identify
  doiPrefix     String?                      // prefix CrossRef (mis. 10.12345)
  crossrefDepositorName  String?
  crossrefCredentialRef  String?             // referensi ke secret store (bukan plaintext)
  similarityProvider       SimilarityProviderKind?  // override provider; null = env platform
  similarityGatePolicy     SimilarityGatePolicy @default(WARN)  // gate sendToReview
  similarityBlockThreshold Float?                 // % ambang; null = domain default (25)
  isActive      Boolean    @default(true)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  domains       JournalDomain[]
  theme         JournalTheme?
  memberships   JournalMembership[]
  sections      Section[]
  submissions   Submission[]
  issues        Issue[]
  invoices      ApcInvoice[]
  pages         JournalPage[]
}

model JournalDomain {
  id          String   @id @default(cuid())
  journalId   String
  journal     Journal  @relation(fields: [journalId], references: [id], onDelete: Cascade)
  host        String   @unique          // jurnal.univX.ac.id
  isPrimary   Boolean  @default(false)
  verified    Boolean  @default(false)
  sslStatus   DomainSslStatus @default(PENDING)
  verifyToken String?                   // utk TXT/CNAME verification
  createdAt   DateTime @default(now())

  @@index([journalId])
}

model JournalTheme {
  id           String  @id @default(cuid())
  journalId    String  @unique
  journal      Journal @relation(fields: [journalId], references: [id], onDelete: Cascade)
  logoUrl      String?
  faviconUrl   String?
  primaryColor String?  @default("#1d4ed8")
  secondaryColor String?
  fontFamily   String?
  emailFromName  String?
  emailFromAddress String?
  locale       String  @default("id")
}

/// Halaman white-label per jurnal (about, author guidelines, kebijakan).
model JournalPage {
  id        String  @id @default(cuid())
  journalId String
  journal   Journal @relation(fields: [journalId], references: [id], onDelete: Cascade)
  slug      String                 // "about", "author-guidelines", "peer-review-policy"
  title     String
  content   String                 // markdown / rich blocks
  isPublished Boolean @default(true)
  updatedAt DateTime @updatedAt

  @@unique([journalId, slug])
}

/// Peran user di satu jurnal (banyak peran via array).
model JournalMembership {
  id        String        @id @default(cuid())
  journalId String
  journal   Journal       @relation(fields: [journalId], references: [id], onDelete: Cascade)
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  roles     JournalRole[]                  // satu user bisa banyak peran di jurnal
  isActive  Boolean       @default(true)
  createdAt DateTime      @default(now())

  @@unique([journalId, userId])
  @@index([journalId])
}

model Section {
  id        String  @id @default(cuid())
  journalId String
  journal   Journal @relation(fields: [journalId], references: [id], onDelete: Cascade)
  title     String                       // "Artikel", "Review", "Studi Kasus"
  policy    String?
  submissions Submission[]

  @@index([journalId])
}

// ──────────────────────────── SUBMISSION ────────────────────────────

model Submission {
  id            String   @id @default(cuid())
  journalId     String
  journal       Journal  @relation(fields: [journalId], references: [id], onDelete: Cascade)
  sectionId     String?
  section       Section? @relation(fields: [sectionId], references: [id])
  /// Bahasa utama naskah (ISO 639). Judul/abstrak/keyword dwibahasa ada di SubmissionTranslation.
  primaryLanguage String @default("id")
  status        SubmissionStatus @default(DRAFT)
  reviewRound   Int      @default(0)      // bertambah tiap siklus revisi
  doi           String?
  doiStatus     DoiStatus @default(NONE)
  similarityStatus    SimilarityStatus @default(NOT_RUN)
  similarityScore     Float?               // % kemiripan
  similarityReportUrl String?              // URL laporan provider
  submittedAt   DateTime?
  acceptedAt    DateTime?
  publishedAt   DateTime?
  issueId       String?
  issue         Issue?   @relation(fields: [issueId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  translations  SubmissionTranslation[]  // judul/abstrak/keyword per bahasa (dwibahasa)
  participants  SubmissionParticipant[]
  authors       SubmissionAuthor[]       // urutan & metadata author untuk publikasi
  files         SubmissionFile[]
  reviewAssignments ReviewAssignment[]
  reviews       Review[]
  events        EditorialEvent[]
  decisions     EditorialDecision[]
  invoice       ApcInvoice?
  galleys       Galley[]

  @@index([journalId, status])
  @@index([journalId, issueId])
}

/// Metadata artikel per bahasa. Jurnal Indonesia umumnya dwibahasa (id + en)
/// untuk keperluan indeksasi (DOAJ/Scopus). Satu baris per (submission, language).
model SubmissionTranslation {
  id            String   @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  language      String                   // ISO 639: "id", "en", ...
  title         String
  abstract      String
  keywords      String[]
  isPrimary     Boolean  @default(false)  // bahasa utama naskah

  @@unique([submissionId, language])
  @@index([submissionId])
}

/// Peran konkret seseorang pada satu submission (otorisasi & anonimitas).
model SubmissionParticipant {
  id           String   @id @default(cuid())
  submissionId String
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role         SubmissionRoleType
  createdAt    DateTime @default(now())

  @@unique([submissionId, userId, role])
  @@index([submissionId])
}

/// Author untuk publikasi/metadata (bisa berbeda dari akun user; ada co-author non-user).
model SubmissionAuthor {
  id            String  @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  fullName      String
  email         String?
  affiliation   String?
  orcid         String?
  order         Int                       // urutan penulis
  isCorresponding Boolean @default(false)

  @@index([submissionId])
}

model SubmissionFile {
  id            String   @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  type          FileType
  round         Int       @default(0)     // versi/round revisi
  storageKey    String                    // path di Supabase Storage
  originalName  String
  mimeType      String
  sizeBytes     Int
  /// true bila file sudah dibersihkan dari metadata identitas (untuk blind review)
  isAnonymized  Boolean   @default(false)
  uploadedById  String?
  createdAt     DateTime  @default(now())

  @@index([submissionId, type])
}

// ──────────────────────────── REVIEW ────────────────────────────

model ReviewAssignment {
  id            String   @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  reviewerId    String
  reviewer      User     @relation(fields: [reviewerId], references: [id], onDelete: Cascade)
  round         Int       @default(1)
  status        ReviewAssignmentStatus @default(INVITED)
  invitedAt     DateTime  @default(now())
  respondedAt   DateTime?
  dueAt         DateTime?
  /// label anonim yang dilihat author (mis. "Reviewer A") — stabil per submission
  anonymousLabel String?
  review        Review?

  @@unique([submissionId, reviewerId, round])
  @@index([submissionId, status])
}

model Review {
  id              String   @id @default(cuid())
  assignmentId    String   @unique
  assignment      ReviewAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  submissionId    String
  submission      Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  reviewerId      String
  reviewer        User     @relation(fields: [reviewerId], references: [id], onDelete: Cascade)
  recommendation  ReviewRecommendation?
  /// komentar untuk author (anonim) — TIDAK boleh mengandung identitas reviewer
  commentsToAuthor String?
  /// komentar rahasia hanya untuk editor
  commentsToEditor String?
  scoreOriginality Int?     // skala 1-5 (opsional rubrik)
  scoreClarity     Int?
  scoreContribution Int?
  submittedAt     DateTime?
  createdAt       DateTime @default(now())

  @@index([submissionId])
}

// ──────────────────────────── KEPUTUSAN & AUDIT ────────────────────────────

model EditorialDecision {
  id            String   @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  round         Int
  decidedById   String                       // editor
  decision      ReviewRecommendation         // ACCEPT/REJECT/MINOR/MAJOR
  note          String?
  createdAt     DateTime @default(now())

  @@index([submissionId])
}

/// Audit trail immutable — satu baris per transisi/aksi editorial.
model EditorialEvent {
  id            String   @id @default(cuid())
  journalId     String
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  actorId       String?
  actor         User?    @relation("EventActor", fields: [actorId], references: [id])
  type          String                       // "STATUS_CHANGED","REVIEWER_INVITED","DECISION_MADE",...
  fromStatus    SubmissionStatus?
  toStatus      SubmissionStatus?
  payload       Json?                        // detail tambahan
  createdAt     DateTime @default(now())

  @@index([submissionId, createdAt])
  @@index([journalId, createdAt])
}

// ──────────────────────────── PUBLISHING ────────────────────────────

model Issue {
  id          String   @id @default(cuid())
  journalId   String
  journal     Journal  @relation(fields: [journalId], references: [id], onDelete: Cascade)
  volume      Int
  number      Int
  year        Int
  title       String?
  isPublished Boolean  @default(false)
  publishedAt DateTime?
  submissions Submission[]

  @@unique([journalId, volume, number, year])
  @@index([journalId])
}

model Galley {
  id            String  @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  label         String                  // "PDF", "HTML", "XML"
  storageKey    String
  mimeType      String
  createdAt     DateTime @default(now())

  @@index([submissionId])
}

// ──────────────────────────── BILLING (APC) ────────────────────────────

model ApcInvoice {
  id             String   @id @default(cuid())
  journalId      String
  journal        Journal  @relation(fields: [journalId], references: [id], onDelete: Cascade)
  submissionId   String   @unique
  submission     Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  originalAmount Int                       // tarif dasar sebelum diskon
  amount         Int                       // tagihan final (IDR)
  currency       String   @default("IDR")
  status         InvoiceStatus @default(DRAFT)
  provider       PaymentProvider?
  externalRef    String?                   // order id di gateway
  paymentUrl     String?
  discountNote   String?                   // waiver/diskon
  issuedAt       DateTime?
  paidAt         DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  payments      PaymentTransaction[]
  ledgerEntries JournalLedgerEntry[]

  @@index([journalId, status])
}

/// Buku besar pendapatan APC per jurnal (platform-as-merchant).
model JournalLedgerEntry {
  id        String          @id @default(cuid())
  journalId String
  journal   Journal         @relation(fields: [journalId], references: [id], onDelete: Cascade)
  invoiceId String?
  invoice   ApcInvoice?     @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  payoutId  String?
  payout    JournalPayout?  @relation(fields: [payoutId], references: [id], onDelete: SetNull)
  type      LedgerEntryType // APC_EARNED | PAYOUT | ADJUSTMENT
  amount    Int             // signed: positif = kredit jurnal
  currency  String          @default("IDR")
  note      String?
  createdAt DateTime        @default(now())

  @@index([journalId, createdAt])
}

/// Pencatatan payout/settlement ke rekening jurnal.
model JournalPayout {
  id          String       @id @default(cuid())
  journalId   String
  journal     Journal      @relation(fields: [journalId], references: [id], onDelete: Cascade)
  amount      Int
  currency    String       @default("IDR")
  status      PayoutStatus @default(PENDING)
  reference   String?
  note        String?
  completedAt DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  ledgerEntries JournalLedgerEntry[]

  @@index([journalId, status])
}

model PaymentTransaction {
  id            String   @id @default(cuid())
  invoiceId     String
  invoice       ApcInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  provider      PaymentProvider
  externalId    String
  amount        Int
  status        String                    // mentah dari provider
  rawPayload    Json?
  createdAt     DateTime @default(now())

  @@index([invoiceId])
}

/// Idempotensi webhook (pola dari e-learning).
model ProcessedWebhook {
  id        String   @id @default(cuid())
  eventId   String   @unique
  source    String                         // "midtrans","xendit","crossref"
  createdAt DateTime @default(now())
}

// ──────────────────────────── NOTIFIKASI ────────────────────────────

model Notification {
  id        String   @id @default(cuid())
  journalId String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String                         // "REVIEW_INVITED","REVISION_REQUESTED",...
  title     String
  body      String?
  link      String?
  isRead    Boolean  @default(false)
  emailSent Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, isRead])
}
```

---

## 3. Catatan relasi & invariant penting

- **Role-per-context** terwujud lewat `JournalMembership.roles[]` (jurnal) + `SubmissionParticipant.role` (submission). Tidak ada kolom `role` global selain `User.platformRole`.
- **Siklus revisi**: `Submission.reviewRound` & `ReviewAssignment.round` & `SubmissionFile.round` naik bersama tiap putaran. Riwayat tetap tersimpan (file & review lama tidak dihapus).
- **Anonimitas**: `Review.commentsToAuthor` tidak boleh mengandung identitas; author melihat `ReviewAssignment.anonymousLabel`. File yang ditunjukkan ke reviewer adalah `ANONYMIZED_MANUSCRIPT`. Penegakan di lapisan aplikasi + review code (lihat `03`).
- **APC**: `ApcInvoice` hanya dibuat oleh use-case saat `status` mencapai `ACCEPTED`. `Submission.status` lalu pindah ke `PAYMENT_PENDING` hingga `PAID`.
- **Audit**: setiap perubahan status menulis `EditorialEvent`. Tabel ini append-only (jangan update/delete).
- **RLS**: semua tabel ber-`journalId` di atas mendapat policy isolasi (lihat `01` §3.2). `User` & `ProcessedWebhook` adalah global (tanpa `journalId`).

---

Lanjut: `03-editorial-workflow.md`.
