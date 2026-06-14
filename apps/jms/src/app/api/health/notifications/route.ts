import { NextResponse } from "next/server";

import { getNotificationHealth } from "@/application/notification/get-notification-health";

export async function GET() {
  return NextResponse.json(getNotificationHealth());
}
