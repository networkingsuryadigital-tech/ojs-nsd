import { NextResponse } from "next/server";

import { getStatisticsHealth } from "@/application/statistics/get-statistics-health";

export async function GET() {
  return NextResponse.json(getStatisticsHealth());
}
