import "server-only";

import { env } from "@/lib/env";

export function getSubmissionStorageBucket(): string {
  return env.JMS_STORAGE_BUCKET ?? "submissions";
}
