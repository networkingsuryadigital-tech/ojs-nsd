import { NextResponse } from "next/server";

import { getDoiHealth } from "@/application/doi/get-doi-health";

export async function GET() {
  return NextResponse.json(getDoiHealth());
}
