import assert from "node:assert/strict";
import {
  getMikaJobDetail,
  getMikaJobs,
  MIKA_JOB_DETAIL_TIMEOUT_MS,
} from "../lib/api/mika-career";

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.MIKA_API_BASE_URL;

const validJob = {
  id: 2,
  title: "IoT Engineer",
  employment_type: "Full-time",
  status: "Open",
  location: "Semarang",
  salary: { min: null, max: null, currency: "IDR", formatted: "" },
  quota: 1,
  deadline: "2026-10-31",
  deadline_info: {
    is_expired: false,
    is_active: true,
    days_remaining: 30,
    badge: { status: "open", label: "Aktif", color: "emerald" },
  },
  company: {
    id: 2,
    name: "PT Autentik Karya Analitika",
    logo: "/storage/logo/aka.png",
    city: "Semarang",
  },
  department: { id: 1, name: "Engineering" },
  description: "Mengembangkan solusi IoT.",
  responsibilities: ["Mengembangkan perangkat"],
  requirements: ["Memahami IoT"],
  benefits: [],
  skills: ["TypeScript"],
  apply_url: null,
};

const validRelatedJob = {
  ...validJob,
  id: 3,
  title: "Quality Assurance",
  education_requirements: [],
  responsibilities: null,
  requirements: null,
  benefits: null,
  skills: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(handler: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = handler as typeof fetch;
}

async function main() {
  console.log("Running CAREER-002 MIKA detail resilience assertions...\n");
  process.env.MIKA_API_BASE_URL = "https://career.example.com/api/v1";

  assert.equal(MIKA_JOB_DETAIL_TIMEOUT_MS, 8000, "Detail timeout must be 8 seconds");

  mockFetch(async () =>
    jsonResponse({ success: true, data: validJob, related_jobs: [validRelatedJob] }),
  );
  const found = await getMikaJobDetail(2);
  assert.equal(found.status, "found", "Valid detail response must be found");
  if (found.status === "found") {
    assert.equal(
      found.job.company.logo,
      "https://career.example.com/storage/logo/aka.png",
      "CAREER-001 logo normalization must still run for detail responses",
    );
    assert.equal(found.job.related_jobs?.length, 1, "Nullable related-job fields must remain valid");
  }

  mockFetch(
    async (_input, init) =>
      new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(
          () => resolve(jsonResponse({ success: true, data: validJob, related_jobs: [] })),
          4100,
        );
        init?.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(init.signal?.reason ?? new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      }),
  );
  assert.equal(
    (await getMikaJobDetail(2)).status,
    "found",
    "A valid response slower than the old 4-second boundary must still be found",
  );

  mockFetch(async () => jsonResponse({ message: "Not found" }, 404));
  assert.deepEqual(await getMikaJobDetail(999999), { status: "not_found" });

  const timeoutError = new Error("Simulated timeout");
  timeoutError.name = "TimeoutError";
  mockFetch(async () => {
    throw timeoutError;
  });
  assert.deepEqual(await getMikaJobDetail(2), { status: "unavailable", reason: "timeout" });

  mockFetch(async () => jsonResponse({ message: "Server error" }, 500));
  assert.deepEqual(await getMikaJobDetail(2), { status: "unavailable", reason: "upstream" });

  mockFetch(async () => jsonResponse({ success: true, data: { ...validJob, salary: null } }));
  assert.deepEqual(await getMikaJobDetail(2), {
    status: "unavailable",
    reason: "invalid_response",
  });

  mockFetch(async () => {
    throw new TypeError("Simulated network failure");
  });
  assert.deepEqual(await getMikaJobDetail(2), { status: "unavailable", reason: "network" });

  delete process.env.MIKA_API_BASE_URL;
  assert.deepEqual(await getMikaJobDetail(2), {
    status: "unavailable",
    reason: "configuration",
  });

  process.env.MIKA_API_BASE_URL = "https://career.example.com/api/v1";
  mockFetch(async () =>
    jsonResponse({
      success: true,
      data: [validJob],
      meta: {
        current_page: 1,
        per_page: 10,
        total_items: 1,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    }),
  );
  const listing = await getMikaJobs({ page: 1, per_page: 10 });
  assert.equal(listing.success, true, "Listing behavior must remain successful");
  assert.equal(listing.data.length, 1, "Listing data must remain intact");

  console.log("All CAREER-002 assertions passed successfully!");
}

main()
  .finally(() => {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) {
      delete process.env.MIKA_API_BASE_URL;
    } else {
      process.env.MIKA_API_BASE_URL = originalBaseUrl;
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
