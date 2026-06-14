import { NextResponse } from "next/server";

import { processOaiHttpRequest } from "@/application/oai/process-oai-http-request";

export async function GET(request: Request) {
  const result = await processOaiHttpRequest(request);

  if (result.kind === "text") {
    const contentType = result.status === 429 ? "text/plain" : "text/xml";
    const headers: Record<string, string> = {
      "Content-Type": `${contentType}; charset=utf-8`,
    };
    if (result.status === 429 && result.retryAfterSeconds) {
      headers["Retry-After"] = String(result.retryAfterSeconds);
    }
    return new NextResponse(result.body, {
      status: result.status,
      headers,
    });
  }

  return new NextResponse(result.xml, {
    status: result.status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
