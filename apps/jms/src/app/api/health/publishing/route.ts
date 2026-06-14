import { NextResponse } from "next/server";

import { getPublishingHealth } from "@/application/publishing/get-publishing-health";

export async function GET() {
  return NextResponse.json(getPublishingHealth());
}
