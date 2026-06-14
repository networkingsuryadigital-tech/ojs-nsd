/**
 * Light load test for OAI ListRecords (S27-A).
 *
 * Usage (dev server must be running on demo tenant):
 *   pnpm oai:load-test
 *   pnpm oai:load-test -- --baseUrl=http://demo.localhost:3000 --requests=50 --concurrency=5
 *
 * Optional: set OAI_RATE_LIMIT_PER_MIN=5 and valid UPSTASH_REDIS_* to verify 429 + Retry-After.
 */

type LoadTestOptions = {
  baseUrl: string;
  requests: number;
  concurrency: number;
  path: string;
};

type RequestSample = {
  status: number;
  latencyMs: number;
  retryAfter: string | null;
};

type LoadTestReport = {
  baseUrl: string;
  path: string;
  totalRequests: number;
  concurrency: number;
  durationMs: number;
  statusCounts: Record<string, number>;
  errorRatePercent: number;
  latencyMs: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
  };
  rateLimited: {
    count: number;
    retryAfterValues: string[];
  };
  cacheHint: string;
};

function parseArgs(argv: string[]): LoadTestOptions {
  const defaults: LoadTestOptions = {
    baseUrl: process.env.OAI_LOAD_BASE_URL ?? "http://demo.localhost:3000",
    requests: 30,
    concurrency: 3,
    path: "/api/oai?verb=ListRecords&metadataPrefix=oai_dc",
  };

  for (const arg of argv) {
    if (arg.startsWith("--baseUrl=")) {
      defaults.baseUrl = arg.slice("--baseUrl=".length);
    } else if (arg.startsWith("--requests=")) {
      defaults.requests = Number.parseInt(arg.slice("--requests=".length), 10);
    } else if (arg.startsWith("--concurrency=")) {
      defaults.concurrency = Number.parseInt(arg.slice("--concurrency=".length), 10);
    } else if (arg.startsWith("--path=")) {
      defaults.path = arg.slice("--path=".length);
    }
  }

  return defaults;
}

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

async function runOne(url: string): Promise<RequestSample> {
  const started = performance.now();
  const response = await fetch(url, {
    headers: { Accept: "text/xml" },
  });
  const latencyMs = performance.now() - started;
  return {
    status: response.status,
    latencyMs,
    retryAfter: response.headers.get("Retry-After"),
  };
}

async function runLoadTest(options: LoadTestOptions): Promise<LoadTestReport> {
  const url = `${options.baseUrl.replace(/\/$/, "")}${options.path}`;
  const samples: RequestSample[] = [];
  let nextIndex = 0;
  const started = performance.now();

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= options.requests) {
        return;
      }
      samples.push(await runOne(url));
    }
  }

  const workers = Array.from({ length: Math.max(1, options.concurrency) }, () =>
    worker(),
  );
  await Promise.all(workers);

  const durationMs = performance.now() - started;
  const latencies = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
  const statusCounts: Record<string, number> = {};
  for (const sample of samples) {
    const key = String(sample.status);
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }

  const errors = samples.filter((sample) => sample.status >= 500).length;
  const rateLimited = samples.filter((sample) => sample.status === 429);
  const retryAfterValues = [
    ...new Set(
      rateLimited
        .map((sample) => sample.retryAfter)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const avg =
    latencies.length === 0
      ? 0
      : latencies.reduce((sum, value) => sum + value, 0) / latencies.length;

  return {
    baseUrl: options.baseUrl,
    path: options.path,
    totalRequests: options.requests,
    concurrency: options.concurrency,
    durationMs: Math.round(durationMs),
    statusCounts,
    errorRatePercent: Number(((errors / Math.max(samples.length, 1)) * 100).toFixed(2)),
    latencyMs: {
      min: Math.round(latencies[0] ?? 0),
      max: Math.round(latencies[latencies.length - 1] ?? 0),
      avg: Math.round(avg),
      p50: Math.round(percentile(latencies, 50)),
      p95: Math.round(percentile(latencies, 95)),
    },
    rateLimited: {
      count: rateLimited.length,
      retryAfterValues,
    },
    cacheHint:
      "Cache hit rate requires Upstash Redis + repeated identical OAI query; compare p50 on run 2.",
  };
}

const options = parseArgs(process.argv.slice(2));

runLoadTest(options)
  .then((report) => {
    console.log("\n✅ OAI load test selesai\n");
    console.log(JSON.stringify(report, null, 2));
    if (report.errorRatePercent > 0) {
      process.exitCode = 1;
    }
  })
  .catch((error: unknown) => {
    console.error("\n❌ OAI load test gagal\n", error);
    process.exitCode = 1;
  });
