import { NextResponse } from "next/server";

import { getReviewerMatchingHealth } from "@/application/reviewer-matching/get-reviewer-matching-health";

export async function GET() {
  const health = await getReviewerMatchingHealth();
  return NextResponse.json(health);
}
