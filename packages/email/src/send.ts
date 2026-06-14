import "server-only";

import { getFromEmail, getResendClient } from "./resend";
import type { ResendConfig } from "./types";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmail(
  config: ResendConfig,
  input: { to: string | string[]; subject: string; html: string },
): Promise<{ id: string } | null> {
  const resend = getResendClient(config);
  if (!resend) return null;

  const { data, error } = await resend.emails.send({
    from: getFromEmail(config),
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Resend returned no message id");
  return { id: data.id };
}
