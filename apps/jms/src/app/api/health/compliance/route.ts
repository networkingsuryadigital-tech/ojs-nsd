import { NextResponse } from "next/server";

import { getComplianceHealth } from "@/application/compliance/get-compliance-health";

export async function GET() {
  return NextResponse.json(getComplianceHealth());
}
