#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- Local-only Stage 0F route-contract verifier. */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "https://autentik.example.test";
const TOKEN = "a".repeat(64);
const report = { cases: [], checks: 0, failures: [] };
let nextResetResult = { status: "invalid", code: "invalid_token" };
let digestThrows = false;
let resetCalls = 0;

function loader(mocks = new Map()) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(ROOT, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const entry = new Module(filename);
    entry.filename = filename;
    entry.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, entry);
    const native = entry.require.bind(entry);
    entry.require = (name) => {
      if (mocks.has(name)) return mocks.get(name);
      if (name.startsWith("@/") || name.startsWith(".")) {
        const target = name.startsWith("@/")
          ? path.join(ROOT, name.slice(2))
          : path.resolve(path.dirname(filename), name);
        if (target.endsWith(".json")) return JSON.parse(fs.readFileSync(target, "utf8"));
        return load(`${target}${fs.existsSync(`${target}.ts`) ? ".ts" : ".tsx"}`);
      }
      return native(name);
    };
    entry._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText,
      filename,
    );
    return entry.exports;
  }
  return load;
}

function loadRoute() {
  return loader(
    new Map([
      [
        "@/lib/auth-response",
        {
          authJson(body, status = 200) {
            return new Response(JSON.stringify(body), {
              status,
              headers: { "content-type": "application/json" },
            });
          },
        },
      ],
      [
        "@/lib/customer-recovery",
        {
          CUSTOMER_RECOVERY_INVALID_MESSAGE: "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.",
          CUSTOMER_RECOVERY_REJECTED_MESSAGE: "Kata sandi belum memenuhi kebijakan keamanan. Gunakan kata sandi yang lebih kuat, lalu minta tautan baru.",
          CUSTOMER_RECOVERY_UNAVAILABLE_MESSAGE: "Hasil pembaruan belum dapat dipastikan. Masuk ulang atau minta tautan pemulihan baru.",
          createDefaultCustomerRecoveryDeps() {
            return {};
          },
          digestCustomerRecoveryToken(token) {
            if (digestThrows) throw new Error("synthetic secret configuration failure");
            return `digest:${token}`;
          },
          getCustomerRecoveryRequestIp(request) {
            return request.headers.get("x-real-ip") ?? "unknown";
          },
          hasSameCustomerRecoveryOrigin(request) {
            return request.headers.get("origin") === ORIGIN;
          },
          async resetCustomerPassword() {
            resetCalls += 1;
            return nextResetResult;
          },
        },
      ],
    ]),
  ).call(null, "app/api/auth/customer/reset-password/route.ts");
}

async function test(name, run) {
  try {
    await run();
    report.cases.push({ name, result: "PASS" });
    console.log("PASS", name);
  } catch (error) {
    report.cases.push({ name, result: "FAIL" });
    report.failures.push({ name, message: error instanceof Error ? error.message : String(error) });
    console.error("FAIL", name, error instanceof Error ? error.stack : error);
  }
}

const eq = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  report.checks++;
};
const ok = (value, label) => {
  assert.ok(value, label);
  report.checks++;
};

function request(body, options = {}) {
  return new Request(`${ORIGIN}/api/auth/customer/reset-password`, {
    method: "POST",
    headers: {
      origin: options.origin ?? ORIGIN,
      "content-type": "application/json",
      "x-real-ip": options.ip ?? "198.51.100.77",
    },
    body: JSON.stringify(body),
  });
}

async function reset(route, password, options = {}) {
  const response = await route.POST(
    request(
      {
        token: options.token ?? TOKEN,
        password,
        confirmPassword: options.confirmPassword ?? password,
      },
      options,
    ),
  );
  return { response, json: await response.json() };
}

async function cases() {
  const route = loadRoute();

  await test("malformed token is invalid_token, not a password-policy rejection", async () => {
    resetCalls = 0;
    const result = await reset(route, "Synthetic-password-42", { token: "not-a-token" });
    eq(result.response.status, 400, "status");
    eq(result.json, {
      success: false,
      code: "invalid_token",
      passwordUpdated: false,
      needsNewLink: true,
      message: "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.",
    }, "body");
    eq(resetCalls, 0, "claim was not attempted");
  });

  await test("weak password is a pre-claim validation error and does not consume the token", async () => {
    resetCalls = 0;
    const result = await reset(route, "short");
    eq(result.response.status, 400, "status");
    eq(result.json?.code, "invalid_input", "code");
    eq(result.json?.needsNewLink, false, "token remains usable");
    eq(result.json?.passwordUpdated, false, "no update claim");
    eq(resetCalls, 0, "claim was not attempted");
  });

  await test("confirmation mismatch is a pre-claim validation error", async () => {
    resetCalls = 0;
    const result = await reset(route, "Synthetic-password-42", { confirmPassword: "Synthetic-other-42" });
    eq(result.response.status, 400, "status");
    eq(result.json?.code, "invalid_input", "code");
    eq(result.json?.needsNewLink, false, "token remains usable");
    eq(resetCalls, 0, "claim was not attempted");
  });

  await test("invalid or consumed token is invalid_token", async () => {
    nextResetResult = { status: "invalid", code: "identity_not_eligible" };
    const result = await reset(route, "Synthetic-password-42");
    eq(result.response.status, 400, "status");
    eq(result.json?.code, "invalid_token", "code");
    eq(result.json?.needsNewLink, true, "new link required");
    eq(result.json?.passwordUpdated, false, "password not updated");
  });

  await test("definite password-policy rejection is password_rejected and requires a new link", async () => {
    nextResetResult = { status: "rejected", code: "password_rejected" };
    const result = await reset(route, "Synthetic-password-42");
    eq(result.response.status, 400, "status");
    eq(result.json, {
      success: false,
      code: "password_rejected",
      passwordUpdated: false,
      needsNewLink: true,
      message: "Kata sandi belum memenuhi kebijakan keamanan. Gunakan kata sandi yang lebih kuat, lalu minta tautan baru.",
    }, "body");
    eq(result.response.headers.get("content-type"), "application/json", "json response");
  });

  await test("ambiguous auth failure is unavailable and never claims success", async () => {
    nextResetResult = { status: "unavailable", code: "password_update_ambiguous" };
    const result = await reset(route, "Synthetic-password-42");
    eq(result.response.status, 502, "status");
    eq(result.json?.code, "unavailable", "code");
    eq(result.json?.passwordUpdated, null, "uncertain update");
    eq(result.json?.needsNewLink, true, "new link required");
  });

  await test("success is explicit and does not expose credentials", async () => {
    nextResetResult = { status: "success", passwordUpdated: true, sessionsRevoked: false };
    const result = await reset(route, "Synthetic-password-42");
    eq(result.response.status, 200, "status");
    eq(result.json?.code, "success", "code");
    eq(result.json?.success, true, "success");
    eq(result.json?.passwordUpdated, true, "password updated");
    eq(result.json?.sessionsRevoked, false, "honest partial signout");
    eq(result.json?.needsNewLink, false, "no new link required");
    ok(!JSON.stringify(result.json).includes(TOKEN), "token not disclosed");
    ok(!JSON.stringify(result.json).includes("Synthetic-password-42"), "password not disclosed");
  });

  await test("rate limiting is explicit and does not ask for a new link", async () => {
    nextResetResult = { status: "invalid", code: "invalid_token" };
    let last;
    for (let index = 0; index < 21; index += 1) {
      last = await reset(route, "Synthetic-password-42", { ip: "198.51.100.88" });
    }
    eq(last.response.status, 429, "twenty-first request limited");
    eq(last.json?.code, "rate_limited", "code");
    eq(last.json?.needsNewLink, false, "token not consumed");
  });

  await test("service configuration failure is unavailable and does not consume the token", async () => {
    digestThrows = true;
    const result = await reset(route, "Synthetic-password-42");
    digestThrows = false;
    eq(result.response.status, 503, "status");
    eq(result.json?.code, "service_unavailable", "code");
    eq(result.json?.needsNewLink, false, "token not consumed");
  });

  await test("responses do not enumerate accounts or disclose recovery secrets", async () => {
    nextResetResult = { status: "invalid", code: "identity_not_eligible" };
    const result = await reset(route, "Synthetic-password-42");
    const text = JSON.stringify(result.json);
    ok(!text.includes("customer@example.test"), "no account email");
    ok(!text.toLowerCase().includes("not found"), "no account-existence clue");
    ok(!text.includes(TOKEN), "no token");
    ok(!text.includes("Synthetic-password-42"), "no password");
    ok(!text.toLowerCase().includes("supabase"), "no internal provider detail");
  });
}

(async () => {
  await cases();
  report.verdict = report.failures.length ? "RED" : "GREEN";
  console.log(`\n${report.verdict}: ${report.cases.length - report.failures.length}/${report.cases.length} cases; ${report.checks} assertions; ${report.failures.length} failures.`);
  if (report.failures.length) {
    for (const failure of report.failures) console.error(`- ${failure.name}: ${failure.message}`);
    process.exitCode = 1;
  }
  process.exit(report.failures.length ? 1 : 0);
})();
