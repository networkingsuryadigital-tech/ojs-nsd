import { NextResponse } from "next/server";

import { getDecisionHealth } from "@/application/submission/get-decision-health";

export async function GET() {
  return NextResponse.json(getDecisionHealth());
}
