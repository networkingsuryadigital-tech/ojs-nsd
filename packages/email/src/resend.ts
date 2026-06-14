import "server-only";

import { Resend } from "resend";
import type { ResendConfig } from "./types";

const clients = new Map<string, Resend>();

export function getResendClient(config: ResendConfig): Resend | null {
  if (!config.apiKey) return null;
  const existing = clients.get(config.apiKey);
  if (existing) return existing;
  const client = new Resend(config.apiKey);
  clients.set(config.apiKey, client);
  return client;
}

export function getFromEmail(config: ResendConfig): string {
  return config.fromEmail ?? "JMS <onboarding@resend.dev>";
}
