import { NextResponse } from "next/server";

import { getOaiHealth } from "@/application/oai/get-oai-health";

export async function GET() {
  return NextResponse.json(getOaiHealth());
}
