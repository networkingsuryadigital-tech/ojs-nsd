import { NextResponse } from "next/server";

import { getOperationalHealth } from "@/application/operational/get-operational-health";

export async function GET() {
  return NextResponse.json(getOperationalHealth());
}
