import { getHealthStatus } from "@/application/health/get-health";

export async function GET() {
  const health = await getHealthStatus();
  const statusCode = health.status === "ok" ? 200 : 503;
  return Response.json(health, { status: statusCode });
}
