import "server-only";

import { prisma } from "@/infrastructure/db/prisma";

export type HealthStatus = {
  status: "ok" | "degraded";
  database: "connected" | "unavailable";
  timestamp: string;
};

export async function getHealthStatus(): Promise<HealthStatus> {
  let database: HealthStatus["database"] = "unavailable";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "unavailable";
  }

  return {
    status: database === "connected" ? "ok" : "degraded",
    database,
    timestamp: new Date().toISOString(),
  };
}
