import { NextResponse } from "next/server";

import { getSubmissionWorkflowHealth } from "@/application/submission/get-submission-workflow-health";

export async function GET() {
  return NextResponse.json(getSubmissionWorkflowHealth());
}
