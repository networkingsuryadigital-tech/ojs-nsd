import { NextResponse } from "next/server";

import { getSimilarityHealth } from "@/application/similarity/get-similarity-health";

export async function GET() {
  return NextResponse.json(getSimilarityHealth());
}
