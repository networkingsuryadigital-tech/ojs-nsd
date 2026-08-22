import "server-only";

import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth";
import { prisma } from "@/infrastructure/db/prisma";

/**
 * Create or update a Better Auth user for seed/provision scripts.
 * Returns AuthUser.id (stored in User.supabaseId during migration).
 */
export async function upsertSeedAuthUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.authUser.findUnique({ where: { email } });

  if (existing) {
    await setCredentialPassword(existing.id, input.password);
    await prisma.authUser.update({
      where: { id: existing.id },
      data: { name: input.name, emailVerified: true },
    });
    return existing.id;
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password: input.password,
        name: input.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("already")) {
      throw error;
    }
    const raced = await prisma.authUser.findUnique({ where: { email } });
    if (!raced) {
      throw error;
    }
    await setCredentialPassword(raced.id, input.password);
    await prisma.authUser.update({
      where: { id: raced.id },
      data: { name: input.name, emailVerified: true },
    });
    return raced.id;
  }

  const created = await prisma.authUser.findUnique({ where: { email } });
  if (!created) {
    throw new Error(`Auth user not found after signUpEmail: ${email}`);
  }

  await prisma.authUser.update({
    where: { id: created.id },
    data: { emailVerified: true },
  });

  return created.id;
}

export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const row = await prisma.authUser.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function setCredentialPassword(userId: string, password: string): Promise<void> {
  const context = await auth.$context;
  const hashedPassword = await context.password.hash(password);
  const credentialAccount = await prisma.authAccount.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
  });

  if (credentialAccount) {
    await prisma.authAccount.update({
      where: { id: credentialAccount.id },
      data: {
        password: hashedPassword,
        accountId: userId,
        issuer: "local:credential",
      },
    });
    return;
  }

  await prisma.authAccount.create({
    data: {
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      issuer: "local:credential",
    },
  });
}
