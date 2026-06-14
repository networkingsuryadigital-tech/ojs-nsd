import { expect, test } from "@playwright/test";

type Sample = {
  status: number;
  latencyMs: number;
  retryAfter: string | null;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
}

test("OAI ListRecords light load stays healthy on demo tenant", async ({ request }) => {
  test.setTimeout(120_000);

  const path = "/api/oai?verb=ListRecords&metadataPrefix=oai_dc";
  const totalRequests = 8;
  const samples: Sample[] = [];

  for (let index = 0; index < totalRequests; index += 1) {
    const started = Date.now();
    const response = await request.get(path);
    samples.push({
      status: response.status(),
      latencyMs: Date.now() - started,
      retryAfter: response.headers()["retry-after"] ?? null,
    });
  }

  const latencies = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
  const errors = samples.filter((sample) => sample.status >= 500);
  const rateLimited = samples.filter((sample) => sample.status === 429);

  expect(errors).toHaveLength(0);
  expect(percentile(latencies, 95)).toBeLessThan(15_000);

  for (const sample of rateLimited) {
    expect(sample.retryAfter).toBeTruthy();
  }

  test.info().attach("oai-load-summary", {
    body: JSON.stringify(
      {
        totalRequests,
        statusCounts: samples.reduce<Record<string, number>>((counts, sample) => {
          const key = String(sample.status);
          counts[key] = (counts[key] ?? 0) + 1;
          return counts;
        }, {}),
        latencyMs: {
          p50: percentile(latencies, 50),
          p95: percentile(latencies, 95),
          max: latencies[latencies.length - 1] ?? 0,
        },
        rateLimited: rateLimited.length,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

test("OAI Identify responds with XML on demo tenant", async ({ request }) => {
  const response = await request.get("/api/oai?verb=Identify");
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain("<OAI-PMH");
  expect(body).toContain("<Identify>");
});
