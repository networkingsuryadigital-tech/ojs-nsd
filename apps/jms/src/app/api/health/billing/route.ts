import { NextResponse } from "next/server";

import { getBillingHealth } from "@/application/billing/get-billing-health";

export async function GET() {
  return NextResponse.json(getBillingHealth());
}
