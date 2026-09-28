import assert from "node:assert/strict";
import {
  normalizeMikaLogoUrl,
  normalizeMikaJob,
  normalizeMikaCompany,
  getSafeMikaOrigin,
} from "../lib/api/mika-career";
import type { MikaJob, MikaCompany } from "../types/mika-career";

console.log("Running CAREER-001-R1 MIKA logo URL normalization tests...\n");

// Origin extraction tests
assert.equal(getSafeMikaOrigin("https://abc.ngrok-free.dev"), "https://abc.ngrok-free.dev");
assert.equal(getSafeMikaOrigin("https://career.example.com/api/v1"), "https://career.example.com");
assert.equal(getSafeMikaOrigin("http://localhost:8000"), null);
assert.equal(getSafeMikaOrigin("https://user:pass@example.com"), null);
assert.equal(getSafeMikaOrigin(null), null);
assert.equal(getSafeMikaOrigin(""), null);

// Case A: Legacy Cloudinary absolute HTTPS URL preserved
assert.equal(
  normalizeMikaLogoUrl("https://res.cloudinary.com/demo/logo.png"),
  "https://res.cloudinary.com/demo/logo.png",
  "Case A: Cloudinary absolute HTTPS URL must be preserved",
);

// Case B: Absolute HTTPS URL from MIKA preserved
assert.equal(
  normalizeMikaLogoUrl("https://career.example.com/storage/logo/a.png"),
  "https://career.example.com/storage/logo/a.png",
  "Case B: MIKA absolute HTTPS URL must be preserved",
);

// Case C: Relative Laravel public storage path with leading slash
assert.equal(
  normalizeMikaLogoUrl("/storage/logo/a.png", "https://career.example.com"),
  "https://career.example.com/storage/logo/a.png",
  "Case C: /storage/logo/a.png must be resolved against MIKA_API_BASE_URL origin",
);

// Case D: Relative Laravel public storage path without leading slash
assert.equal(
  normalizeMikaLogoUrl("storage/logo/a.png", "https://career.example.com"),
  "https://career.example.com/storage/logo/a.png",
  "Case D: storage/logo/a.png must be resolved against MIKA_API_BASE_URL origin",
);

// Case E: Localhost URL from Laravel with valid storage path rewritten to ngrok origin
assert.equal(
  normalizeMikaLogoUrl("http://localhost:8000/storage/logo/a.png", "https://abc.ngrok-free.dev"),
  "https://abc.ngrok-free.dev/storage/logo/a.png",
  "Case E: http://localhost:8000/storage/logo/a.png must be rewritten to MIKA public HTTPS origin",
);

// Case F: 127.0.0.1 URL from Laravel with valid storage path rewritten to ngrok origin
assert.equal(
  normalizeMikaLogoUrl("http://127.0.0.1:8000/storage/logo/a.png", "https://abc.ngrok-free.dev"),
  "https://abc.ngrok-free.dev/storage/logo/a.png",
  "Case F: http://127.0.0.1:8000/storage/logo/a.png must be rewritten to MIKA public HTTPS origin",
);

// Case G: javascript: scheme rejected
assert.equal(
  normalizeMikaLogoUrl("javascript:alert(1)"),
  null,
  "Case G: javascript: must be rejected",
);

// Case H: data: scheme rejected
assert.equal(
  normalizeMikaLogoUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
  null,
  "Case H: data:image/... must be rejected",
);

// Case I: null, empty string, malformed values
assert.equal(normalizeMikaLogoUrl(null), null, "Case I: null must return null");
assert.equal(normalizeMikaLogoUrl(undefined), null, "Case I: undefined must return null");
assert.equal(normalizeMikaLogoUrl(""), null, "Case I: empty string must return null");
assert.equal(normalizeMikaLogoUrl("   "), null, "Case I: whitespace string must return null");
assert.equal(normalizeMikaLogoUrl("not-a-url"), null, "Case I: malformed string must return null");
assert.equal(normalizeMikaLogoUrl("http://"), null, "Case I: incomplete http:// must return null");

// Case J: Foreign arbitrary localhost path that is NOT /storage/...
assert.equal(
  normalizeMikaLogoUrl("http://localhost:8000/arbitrary/path.png", "https://abc.ngrok-free.dev"),
  null,
  "Case J: foreign arbitrary localhost path must not be rewritten",
);
assert.equal(
  normalizeMikaLogoUrl("http://127.0.0.1:8000/api/v1/logo.png", "https://abc.ngrok-free.dev"),
  null,
  "Case J: foreign arbitrary 127.0.0.1 path must not be rewritten",
);

// Additional Edge Cases:
// Credentials rejected
assert.equal(
  normalizeMikaLogoUrl("https://user:pass@example.com/storage/logo/a.png"),
  null,
  "Edge Case: embedded credentials in URL must be rejected",
);

// Protocol-relative rejected
assert.equal(
  normalizeMikaLogoUrl("//res.cloudinary.com/demo/logo.png"),
  null,
  "Edge Case: protocol-relative URL must be rejected",
);

// Non-HTTP(S) schemes rejected
assert.equal(
  normalizeMikaLogoUrl("blob:https://example.com/abc"),
  null,
  "Edge Case: blob: must be rejected",
);
assert.equal(
  normalizeMikaLogoUrl("ftp://example.com/logo.png"),
  null,
  "Edge Case: ftp: must be rejected",
);
assert.equal(
  normalizeMikaLogoUrl("file:///C:/logo.png"),
  null,
  "Edge Case: file: must be rejected",
);

// External insecure HTTP rejected
assert.equal(
  normalizeMikaLogoUrl("http://example.com/storage/logo/a.png"),
  null,
  "Edge Case: external insecure HTTP must be rejected",
);

// Directory traversal prevented
assert.equal(
  normalizeMikaLogoUrl("/storage/../etc/passwd", "https://abc.ngrok-free.dev"),
  null,
  "Edge Case: directory traversal out of /storage/ must be rejected",
);

// Empty storage path
assert.equal(
  normalizeMikaLogoUrl("/storage/", "https://abc.ngrok-free.dev"),
  null,
  "Edge Case: empty storage path /storage/ must be rejected",
);

// Missing or invalid MIKA base URL when resolving relative/localhost
assert.equal(
  normalizeMikaLogoUrl("/storage/logo/a.png", null),
  null,
  "Edge Case: relative path with null base URL must return null",
);
assert.equal(
  normalizeMikaLogoUrl("http://localhost:8000/storage/logo/a.png", null),
  null,
  "Edge Case: localhost path with null base URL must return null",
);

// Query parameters preserved
assert.equal(
  normalizeMikaLogoUrl("/storage/logo/a.png?v=123", "https://career.example.com"),
  "https://career.example.com/storage/logo/a.png?v=123",
  "Edge Case: query parameters on relative path must be preserved",
);
assert.equal(
  normalizeMikaLogoUrl("http://localhost:8000/storage/logo/a.png?w=200", "https://abc.ngrok-free.dev"),
  "https://abc.ngrok-free.dev/storage/logo/a.png?w=200",
  "Edge Case: query parameters on rewritten localhost must be preserved",
);

// Origin extraction handles subpaths
assert.equal(
  normalizeMikaLogoUrl("/storage/logo/a.png", "https://career.example.com/api/v1"),
  "https://career.example.com/storage/logo/a.png",
  "Edge Case: base URL with subpath must resolve storage at root origin",
);

// Company & Job normalizer helper verification
const mockCompany: MikaCompany = {
  id: 1,
  name: "PT Mitra Karya Analitika",
  logo: "/storage/logo/mika.png",
  city: "Semarang",
};

const normalizedComp = normalizeMikaCompany(mockCompany, "https://career.example.com");
assert.equal(
  normalizedComp.logo,
  "https://career.example.com/storage/logo/mika.png",
  "normalizeMikaCompany must normalize company.logo",
);

const mockJob: MikaJob = {
  id: 10,
  title: "Frontend Developer",
  employment_type: "Full-time",
  location: "Semarang",
  salary: { min: null, max: null, currency: "IDR", formatted: "" },
  quota: 2,
  deadline: "2026-12-31",
  deadline_info: {
    is_expired: false,
    is_active: true,
    days_remaining: 30,
    badge: { status: "open", label: "Open", color: "emerald" },
  },
  company: mockCompany,
  department: { id: 1, name: "Engineering" },
};

const normalizedJob = normalizeMikaJob(mockJob, "https://career.example.com");
assert.equal(
  normalizedJob.company.logo,
  "https://career.example.com/storage/logo/mika.png",
  "normalizeMikaJob must normalize job.company.logo",
);

console.log("All CAREER-001-R1 assertions passed successfully!");
