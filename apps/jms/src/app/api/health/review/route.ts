import { NextResponse } from "next/server";

import { getReviewHealth } from "@/application/review/get-review-health";

export async function GET() {
  return NextResponse.json(getReviewHealth());
}
