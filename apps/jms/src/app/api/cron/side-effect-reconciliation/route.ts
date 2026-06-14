import { reconcileFailedNotifications } from "@/application/notification/reconcile-failed-notifications";
import { reconcileSubmissionSideEffects } from "@/application/submission/reconcile-submission-side-effects";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.includes("...")) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  const cronHeader = request.headers.get("x-cron-secret");
  return cronHeader === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [submissionSideEffects, notificationSideEffects] = await Promise.all([
    reconcileSubmissionSideEffects(),
    reconcileFailedNotifications(),
  ]);

  return Response.json({
    ok: true,
    ...submissionSideEffects,
    notifications: notificationSideEffects,
  });
}
