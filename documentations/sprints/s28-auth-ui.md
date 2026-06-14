# Sprint 28 — Auth UI Produksi

| | |
|---|---|
| **Status** | ✅ Selesai (2026-06-13) |
| **Roadmap** | [`10-eksekusi-chat-berurutan.md`](../10-eksekusi-chat-berurutan.md) Prompt 5 |
| **Prasyarat** | ✅ Sprint S27 selesai |

---

## Tujuan

Halaman login produksi (Supabase email/password), session guard menggantikan `?actorId=`, middleware proteksi editorial, dan dokumentasi demo login.

---

## Deliverable (checklist)

- [x] Halaman `/login` (tenant jurnal + platform) — email + password Supabase
- [x] Link **Masuk** di `TenantHeader`; navigasi editorial/notifikasi saat sudah login
- [x] Session guard: `resolveSessionUser()` → `User.id` Prisma via `supabaseId`
- [x] Ganti `?actorId=` di halaman editorial, notifications, dan server actions
- [x] Middleware proteksi `/editorial/*`, `/notifications`, `/api/editorial/*`
- [x] Redirect pasca-login sesuai peran (`resolvePostLoginRedirect`)
- [x] Seed/demo docs: `admin@demo.test` / `Demo12345!` (sudah di seed + `09-preview-lokal.md`)
- [x] E2e: `auth-login.spec.ts` + update editorial specs pakai `loginAsDemoUser`
- [x] Vitest: `auth-ui.test.ts`, `protected-paths.test.ts`
- [x] Update [`06-sprint-log.md`](../06-sprint-log.md)
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Lokasi penting

```
apps/jms/src/
├── application/
│   ├── auth/
│   │   ├── sign-in-with-password.ts
│   │   ├── sign-out.ts
│   │   ├── resolve-post-login-redirect.ts
│   │   └── login-redirect.ts
│   └── identity/
│       ├── resolve-session-user.ts
│       └── require-authenticated-user.ts
├── domain/auth/protected-paths.ts
├── infrastructure/
│   ├── auth/route-protection.ts
│   └── identity/user-repository.ts
├── app/login/                    # halaman + server actions
├── middleware.ts                 # Supabase session + auth gate
└── components/tenant/
    ├── tenant-header.tsx         # link Masuk / Keluar
    └── sign-out-button.tsx

tests/e2e/helpers/auth.ts         # loginAsDemoUser()
```

---

## Alur login

1. User membuka `/login` (dari TenantHeader atau redirect middleware).
2. Server action `signInWithPassword` → Supabase Auth → lookup `User` Prisma.
3. Redirect:
   - `next` query (jika aman, path internal)
   - Peran editorial → `/editorial/dashboard`
   - Author saja → `/notifications`
   - Lainnya / platform → `/`

---

## Proteksi rute

| Path | Perilaku tanpa session |
|------|------------------------|
| `/editorial/*` | Redirect `/login?next=...` |
| `/notifications` | Redirect `/login?next=...` |
| `/api/editorial/*` | Middleware redirect (browser) / 401 (API dengan session di handler) |

---

## Verifikasi manual (demo lokal)

```bash
pnpm db:seed:demo   # pastikan SUPABASE_SERVICE_ROLE_KEY terisi
pnpm dev
```

1. Buka `http://demo.localhost:3000` → klik **Masuk**
2. Login `admin@demo.test` / `Demo12345!`
3. Harus redirect ke `/editorial/dashboard` (admin punya peran editorial)
4. Buka `/editorial/submissions/{id}` tanpa `?actorId=` — harus 200
5. Klik **Keluar** → kembali ke beranda, `/editorial/dashboard` redirect ke login

---

## Prompt — langkah selanjutnya (Sprint 29)

```
Sprint 28 selesai. Baca documentations/sprints/s28-auth-ui.md.

Lanjut Sprint 29 (10-eksekusi-chat-berurutan.md Prompt 6):
1. Landing platform localhost:3000
2. Portal author (submit DRAFT, upload, status)
3. Dashboard reviewer (undangan, submit review)
4. Buat s29-*.md + update 06-sprint-log.md
```
