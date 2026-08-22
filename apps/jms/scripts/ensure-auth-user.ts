/**
 * One-off: create/reset Better Auth user + link Prisma User + grant journal roles.
 * Usage (on VPS):
 *   EMAIL=... PASSWORD=... NAME=... ROLES=JOURNAL_ADMIN,EDITOR_IN_CHIEF \
 *   node --import ./scripts/stub-server-only.ts --import tsx scripts/ensure-auth-user.ts
 *
 * Avoids scripts/seed-db.ts (that remaps port 5432→6543 for old Supabase pooler).
 */
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../.env") });
config({ path: path.resolve(__dirname, "../../../.env") });
config({ path: "/home/jms/.env" });

// Prefer direct Postgres (5432), not PgBouncer quirks for scripts
if (process.env.DIRECT_URL?.trim()) {
  process.env.DATABASE_URL = process.env.DIRECT_URL.trim();
}

import { upsertSeedAuthUser, findAuthUserIdByEmail } from "@/infrastructure/auth/seed-auth-user";
import { prisma } from "@/infrastructure/db/prisma";

async function main() {
  const email = (process.env.EMAIL || "").trim().toLowerCase();
  const password = process.env.PASSWORD || "";
  const name = (process.env.NAME || "Admin NSD").trim();
  const subdomain = (process.env.SUBDOMAIN || "nsd").trim();
  const roles = (process.env.ROLES || "JOURNAL_ADMIN,EDITOR_IN_CHIEF")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  if (!email || !password) {
    throw new Error("EMAIL and PASSWORD env required");
  }
  if (password.length < 8) {
    throw new Error("PASSWORD min 8 chars");
  }

  console.log(
    JSON.stringify({
      dbHost: (() => {
        try {
          return new URL(process.env.DATABASE_URL || "").host;
        } catch {
          return "invalid";
        }
      })(),
    }),
  );

  const authId = await upsertSeedAuthUser({ email, password, name });
  console.log(JSON.stringify({ ok: true, step: "auth", email, authId }));

  try {
    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, supabaseId: authId },
      });
      console.log(JSON.stringify({ ok: true, step: "prisma_user_created", userId: user.id }));
    } else if (user.supabaseId !== authId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: authId, name: name || user.name },
      });
      console.log(JSON.stringify({ ok: true, step: "prisma_user_linked", userId: user.id }));
    } else {
      console.log(JSON.stringify({ ok: true, step: "prisma_user_ok", userId: user.id }));
    }

    if (process.env.PLATFORM_ROLE?.trim() === "SUPER_ADMIN") {
      await prisma.user.update({
        where: { id: user.id },
        data: { platformRole: "SUPER_ADMIN" },
      });
      console.log(JSON.stringify({ ok: true, step: "platform_super_admin", userId: user.id }));
    }

    const journal = await prisma.journal.findFirst({
      where: { subdomain },
      select: { id: true, name: true, subdomain: true },
    });
    if (!journal) {
      console.log(
        JSON.stringify({
          ok: true,
          step: "no_journal",
          subdomain,
          note: "auth ready; grant role later",
        }),
      );
      return;
    }

    const existing = await prisma.journalMembership.findUnique({
      where: {
        journalId_userId: { journalId: journal.id, userId: user.id },
      },
    });

    if (!existing) {
      await prisma.journalMembership.create({
        data: {
          journalId: journal.id,
          userId: user.id,
          roles: roles as never,
        },
      });
      console.log(
        JSON.stringify({
          ok: true,
          step: "membership_created",
          journal: journal.subdomain,
          roles,
        }),
      );
    } else {
      const merged = Array.from(new Set([...(existing.roles as string[]), ...roles]));
      await prisma.journalMembership.update({
        where: { id: existing.id },
        data: { roles: merged as never },
      });
      console.log(
        JSON.stringify({
          ok: true,
          step: "membership_updated",
          journal: journal.subdomain,
          roles: merged,
        }),
      );
    }

    const verify = await findAuthUserIdByEmail(email);
    console.log(JSON.stringify({ ok: true, step: "done", authId: verify, login: email }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
