#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- Local-only Stage 0C backend verifier. */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const SECRET = "stage0c-test-secret-".padEnd(64, "x");
const USER_ID = "00000000-0000-4000-8000-0000000000c1";
const RECOVERY_ID = "00000000-0000-4000-8000-0000000000c2";
const report = { cases: [], checks: 0, failures: [] };

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
        const target = name.startsWith("@/") ? path.join(ROOT, name.slice(2)) : path.resolve(path.dirname(filename), name);
        if (target.endsWith(".json")) return JSON.parse(fs.readFileSync(target, "utf8"));
        return load(target + (fs.existsSync(target + ".ts") ? ".ts" : ".tsx"));
      }
      return native(name);
    };
    entry._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return entry.exports;
  }
  return load;
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

function loadRecovery() {
  return loader(new Map([["server-only", {}]])).call(null, "lib/customer-recovery.ts");
}

function loadEmail() {
  return loader(new Map([["server-only", {}]])).call(null, "lib/customer-recovery-email.ts");
}

function makeAuth(overrides = {}) {
  const calls = [];
  return {
    calls,
    session: {
      async verifyRecoveryToken(tokenHash) {
        calls.push(["verify", tokenHash]);
        return { error: overrides.verifyError ?? null };
      },
      async getUser() {
        calls.push(["getUser"]);
        return overrides.sessionUser === undefined ? { id: USER_ID } : overrides.sessionUser;
      },
      async updatePassword(password) {
        calls.push(["update", password]);
        return { error: overrides.updateError ?? null };
      },
      async getAccessToken() {
        calls.push(["accessToken"]);
        return overrides.accessToken === undefined ? "synthetic-access-token" : overrides.accessToken;
      },
      async globalSignOut(accessToken) {
        calls.push(["signOut", accessToken]);
        if (overrides.signOutThrows) throw new Error("synthetic signout throw");
        return { error: overrides.signOutError ?? null };
      },
    },
  };
}

function makeDeps(overrides = {}) {
  const calls = [];
  const state = { profileCalls: 0 };
  const auth = overrides.auth ?? makeAuth();
  return {
    calls,
    auth,
    deps: {
      async claim(digest) {
        calls.push(["claim", digest]);
        if (overrides.claimThrows) throw new Error("synthetic claim throw");
        return overrides.claim === undefined ? { recoveryId: RECOVERY_ID, userId: USER_ID } : overrides.claim;
      },
      async finish(recoveryId, outcome, failureCode) {
        calls.push(["finish", recoveryId, outcome, failureCode ?? null]);
        if (overrides.finishThrows) throw new Error("synthetic finish throw");
        return true;
      },
      async getUserById(userId) {
        calls.push(["getUserById", userId]);
        if (overrides.identityThrows) throw new Error("synthetic identity throw");
        return overrides.identity === undefined
          ? { id: USER_ID, email: "customer@example.test", deletedAt: null, bannedUntil: null }
          : overrides.identity;
      },
      async getProfile(userId) {
        state.profileCalls++;
        calls.push(["getProfile", userId, state.profileCalls]);
        if (overrides.profileThrowsOn === state.profileCalls) throw new Error("synthetic profile throw");
        if (state.profileCalls === 1 && overrides.firstProfile !== undefined) return overrides.firstProfile;
        if (state.profileCalls > 1 && overrides.secondProfile !== undefined) return overrides.secondProfile;
        return { role: "customer", isActive: true };
      },
      async generateRecoveryTokenHash(email) {
        calls.push(["generate", email]);
        if (overrides.generateThrows) throw new Error("synthetic generate throw");
        return overrides.generate === undefined ? { ok: true, tokenHash: "synthetic-token-hash" } : overrides.generate;
      },
      createAuthSession() {
        calls.push(["createAuthSession"]);
        if (overrides.authThrows) throw new Error("synthetic auth session throw");
        return auth.session;
      },
    },
  };
}

function callsFor(calls, name) {
  return calls.filter((call) => call[0] === name);
}

async function runReset(recovery, input, overrides = {}) {
  const fixture = makeDeps(overrides);
  const result = await recovery.resetCustomerPassword(input, fixture.deps);
  return { result, calls: fixture.calls, authCalls: fixture.auth.calls, deps: fixture.deps };
}

async function unitTests() {
  process.env.CUSTOMER_RECOVERY_TOKEN_SECRET = SECRET;
  process.env.NEXT_PUBLIC_SITE_URL = "https://autentik.example.test";
  const recovery = loadRecovery();
  const email = loadEmail();
  const token = recovery.generateCustomerRecoveryToken();
  const otherToken = recovery.generateCustomerRecoveryToken();

  await test("token is 256-bit lowercase hex and unique", () => {
    eq(token.length, 64, "64 hex characters");
    eq(/^[a-f0-9]{64}$/.test(token), true, "lowercase hex");
    eq(token === otherToken, false, "tokens differ");
    eq(recovery.isCustomerRecoveryToken(token), true, "valid token accepted");
    for (const value of [token.toUpperCase(), token.slice(1), `${token}0`, 42, null, "g".repeat(64)]) {
      eq(recovery.isCustomerRecoveryToken(value), false, `invalid token rejected: ${String(value).slice(0, 12)}`);
    }
  });

  await test("HMAC digest and URL use the raw token only in the fragment", () => {
    const digest = recovery.digestCustomerRecoveryToken(token);
    eq(digest.length, 64, "digest length");
    eq(/^[a-f0-9]{64}$/.test(digest), true, "digest hex");
    eq(digest === token, false, "digest differs from token");
    eq(recovery.digestCustomerRecoveryToken(token), digest, "digest deterministic");
    eq(recovery.digestCustomerRecoveryToken(otherToken) === digest, false, "digest differs per token");
    const url = recovery.buildCustomerRecoveryUrl("https://autentik.example.test/", token);
    eq(url, `https://autentik.example.test/auth/reset-password#token=${token}`, "fragment URL");
    eq(url.includes("?"), false, "token is not a query parameter");
    assert.throws(() => recovery.buildCustomerRecoveryUrl("https://autentik.example.test", "bad"), /tidak valid/);
    report.checks++;
    assert.throws(() => recovery.digestCustomerRecoveryToken("bad"), /tidak valid/);
    report.checks++;
  });

  await test("origin, request IP and email-key helpers stay strict", () => {
    const same = new Request("https://autentik.example.test/api/auth/customer/forgot-password", {
      headers: { origin: "https://autentik.example.test" },
    });
    const foreign = new Request("https://autentik.example.test/api/auth/customer/forgot-password", {
      headers: { origin: "https://evil.example.test" },
    });
    eq(recovery.hasSameCustomerRecoveryOrigin(same), true, "same origin");
    eq(recovery.hasSameCustomerRecoveryOrigin(foreign), false, "foreign origin");
    const forwarded = new Request("https://autentik.example.test/api", { headers: { "x-forwarded-for": " 203.0.113.9, 10.0.0.1" } });
    eq(recovery.getCustomerRecoveryRequestIp(forwarded), "203.0.113.9", "first forwarded IP");
    const real = new Request("https://autentik.example.test/api", { headers: { "x-real-ip": "198.51.100.7" } });
    eq(recovery.getCustomerRecoveryRequestIp(real), "198.51.100.7", "real IP fallback");
    eq(recovery.hashCustomerRecoveryEmail(" User@Example.Test ").length, 64, "email hash length");
    eq(recovery.hashCustomerRecoveryEmail("User@Example.Test"), recovery.hashCustomerRecoveryEmail("user@example.test"), "email normalized");
  });

  await test("missing/short recovery secret fails closed", () => {
    const previous = process.env.CUSTOMER_RECOVERY_TOKEN_SECRET;
    delete process.env.CUSTOMER_RECOVERY_TOKEN_SECRET;
    assert.throws(() => recovery.generateCustomerRecoveryToken() && recovery.digestCustomerRecoveryToken(token), /CUSTOMER_RECOVERY_TOKEN_SECRET/);
    process.env.CUSTOMER_RECOVERY_TOKEN_SECRET = "short";
    assert.throws(() => recovery.digestCustomerRecoveryToken(token), /CUSTOMER_RECOVERY_TOKEN_SECRET/);
    process.env.CUSTOMER_RECOVERY_TOKEN_SECRET = previous;
    report.checks += 2;
  });

  const input = { token, password: "Synthetic-new-password-42" };
  const digest = recovery.digestCustomerRecoveryToken(token);

  await test("reset success claims, verifies, updates, consumes and signs out that user", async () => {
    const { result, calls, authCalls } = await runReset(recovery, input);
    eq(result, { status: "success", passwordUpdated: true, sessionsRevoked: true }, "success result");
    eq(callsFor(calls, "claim")[0][1], digest, "claim uses digest, not raw token");
    eq(callsFor(calls, "generate")[0][1], "customer@example.test", "link generated for claimed identity email");
    eq(callsFor(calls, "finish").at(-1).slice(1), [RECOVERY_ID, "consumed", null], "consumed recorded");
    eq(callsFor(authCalls, "verify")[0][1], "synthetic-token-hash", "verify uses generated token hash");
    eq(callsFor(authCalls, "update")[0][1], input.password, "password update called");
    eq(callsFor(authCalls, "signOut")[0][1], "synthetic-access-token", "global signout uses this user token");
    eq(calls.some((call) => call[0] === "finish" && call[2] === "failed"), false, "no failure recorded");
  });

  await test("missing claim is invalid without auth work", async () => {
    const { result, calls, authCalls } = await runReset(recovery, input, { claim: null });
    eq(result, { status: "invalid", code: "invalid_token" }, "invalid token");
    eq(callsFor(calls, "finish").length, 0, "no row to finish");
    eq(authCalls.length, 0, "no auth session work");
  });

  await test("claim errors propagate to the route boundary", async () => {
    await assert.rejects(() => runReset(recovery, input, { claimThrows: true }), /synthetic claim throw/);
    report.checks++;
  });

  await test("auth session creation failure fails closed", async () => {
    const { result, calls } = await runReset(recovery, input, { authThrows: true });
    eq(result, { status: "unavailable", code: "auth_unavailable" }, "unavailable");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "auth_session_failed"], "failure recorded");
  });

  for (const [label, identity] of [
    ["missing identity", null],
    ["deleted identity", { id: USER_ID, email: "customer@example.test", deletedAt: new Date().toISOString(), bannedUntil: null }],
    ["banned identity", { id: USER_ID, email: "customer@example.test", deletedAt: null, bannedUntil: new Date(Date.now() + 60000).toISOString() }],
    ["identity without email", { id: USER_ID, email: null, deletedAt: null, bannedUntil: null }],
  ]) {
    await test(`identity not eligible: ${label}`, async () => {
      const { result, calls } = await runReset(recovery, input, { identity });
      eq(result, { status: "invalid", code: "identity_not_eligible" }, "invalid");
      eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "identity_not_eligible"], "failure recorded");
      eq(callsFor(calls, "generate").length, 0, "no link generated");
    });
  }

  for (const [label, profile] of [
    ["inactive profile", { role: "customer", isActive: false }],
    ["staff profile", { role: "admin", isActive: true }],
    ["missing profile", null],
  ]) {
    await test(`profile not eligible: ${label}`, async () => {
      const { result, calls } = await runReset(recovery, input, { firstProfile: profile });
      eq(result, { status: "invalid", code: "identity_not_eligible" }, "invalid");
      eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "identity_not_eligible"], "failure recorded");
      eq(callsFor(calls, "generate").length, 0, "no link generated");
    });
  }

  await test("identity lookup failure fails closed", async () => {
    const { result, calls } = await runReset(recovery, input, { identityThrows: true });
    eq(result, { status: "unavailable", code: "auth_unavailable" }, "unavailable");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "identity_lookup_failed"], "failure recorded");
  });

  await test("profile lookup failure fails closed", async () => {
    const { result, calls } = await runReset(recovery, input, { profileThrowsOn: 1 });
    eq(result, { status: "unavailable", code: "auth_unavailable" }, "unavailable");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "identity_lookup_failed"], "failure recorded");
  });

  await test("generateLink definite failure invalidates without verify", async () => {
    const { result, calls, authCalls } = await runReset(recovery, input, { generate: { ok: false, error: { status: 404, code: "user_not_found" } } });
    eq(result, { status: "invalid", code: "identity_changed" }, "invalid");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "generate_recovery_link_failed"], "failure recorded");
    eq(authCalls.filter((call) => call[0] === "verify").length, 0, "no verify after generate failure");
  });

  await test("generateLink ambiguous/transport failure is fail-closed unavailable", async () => {
    const { result, calls } = await runReset(recovery, input, { generateThrows: true });
    eq(result, { status: "unavailable", code: "auth_unavailable" }, "unavailable");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "generate_recovery_link_failed"], "failure recorded");
    const second = await runReset(recovery, input, { generate: { ok: false, error: { status: 503 } } });
    eq(second.result, { status: "unavailable", code: "auth_unavailable" }, "5xx unavailable");
  });

  await test("verifyOtp definite failure does not update", async () => {
    const { result, calls, authCalls } = await runReset(recovery, input, { auth: makeAuth({ verifyError: { status: 403, code: "otp_expired" } }) });
    eq(result, { status: "invalid", code: "identity_changed" }, "invalid");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "verify_recovery_token_failed"], "failure recorded");
    eq(callsFor(authCalls, "update").length, 0, "no password update");
  });

  await test("verifyOtp transport failure fails closed unavailable", async () => {
    const { result, calls, authCalls } = await runReset(recovery, input, { auth: makeAuth({ verifyError: new TypeError("network") }) });
    eq(result, { status: "unavailable", code: "auth_unavailable" }, "unavailable");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "verify_recovery_token_failed"], "failure recorded");
    eq(callsFor(authCalls, "update").length, 0, "no password update");
  });

  await test("session identity mismatch invalidates", async () => {
    const { result, calls, authCalls } = await runReset(recovery, input, {
      auth: makeAuth({ sessionUser: { id: "00000000-0000-4000-8000-0000000000ff" } }),
    });
    eq(result, { status: "invalid", code: "identity_changed" }, "invalid");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "identity_mismatch"], "failure recorded");
    eq(callsFor(authCalls, "update").length, 0, "no password update");
  });

  await test("account status change before update invalidates without update", async () => {
    const { result, calls, authCalls } = await runReset(recovery, input, { secondProfile: { role: "customer", isActive: false } });
    eq(result, { status: "invalid", code: "identity_changed" }, "invalid");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "identity_changed"], "failure recorded");
    eq(callsFor(authCalls, "update").length, 0, "no password update");
  });

  await test("profile recheck transport failure fails closed without update", async () => {
    const { result, calls, authCalls } = await runReset(recovery, input, { profileThrowsOn: 2 });
    eq(result, { status: "unavailable", code: "auth_unavailable" }, "unavailable");
    eq(callsFor(calls, "finish")[0].slice(1), [RECOVERY_ID, "failed", "identity_recheck_failed"], "failure recorded");
    eq(callsFor(authCalls, "update").length, 0, "no password update");
  });

  for (const [label, updateError] of [
    ["definite rejection", { status: 422, code: "weak_password" }],
    ["weak password code", { code: "weak_password" }],
  ]) {
    await test(`password update ${label} is rejected and not consumed`, async () => {
      const { result, calls } = await runReset(recovery, input, { auth: makeAuth({ updateError }) });
      eq(result, { status: "rejected", code: "password_rejected" }, "rejected");
      eq(callsFor(calls, "finish").at(-1).slice(1), [RECOVERY_ID, "failed", "password_update_failed"], "failure recorded");
      eq(callsFor(calls, "finish").some((call) => call[2] === "consumed"), false, "not consumed");
    });
  }

  for (const [label, updateError] of [
    ["504", { status: 504 }],
    ["429", { status: 429 }],
    ["network", new TypeError("lost response")],
  ]) {
    await test(`password update ambiguous ${label} is fail-closed`, async () => {
      const { result, calls } = await runReset(recovery, input, { auth: makeAuth({ updateError }) });
      eq(result, { status: "unavailable", code: "password_update_ambiguous" }, "unavailable");
      eq(callsFor(calls, "finish").at(-1).slice(1), [RECOVERY_ID, "failed", "password_update_ambiguous"], "failure recorded");
      eq(callsFor(calls, "finish").some((call) => call[2] === "consumed"), false, "not consumed");
    });
  }

  await test("global logout failure still reports password updated with sessionsRevoked false", async () => {
    const { result, calls, authCalls } = await runReset(recovery, input, { auth: makeAuth({ signOutError: { status: 403 } }) });
    eq(result, { status: "success", passwordUpdated: true, sessionsRevoked: false }, "honest partial success");
    eq(callsFor(calls, "finish").at(-1).slice(1), [RECOVERY_ID, "consumed", null], "consumed recorded");
    eq(callsFor(authCalls, "signOut").length, 1, "logout attempted");
  });

  await test("global logout throw and missing access token never fail the password update", async () => {
    const thrown = await runReset(recovery, input, { auth: makeAuth({ signOutThrows: true }) });
    eq(thrown.result, { status: "success", passwordUpdated: true, sessionsRevoked: false }, "throw is partial success");
    const missing = await runReset(recovery, input, { auth: makeAuth({ accessToken: null }) });
    eq(missing.result, { status: "success", passwordUpdated: true, sessionsRevoked: false }, "missing token is partial success");
    eq(callsFor(missing.authCalls, "signOut").length, 0, "no signout without token");
  });

  await test("consumed bookkeeping failure does not undo a successful password update", async () => {
    const { result } = await runReset(recovery, input, { finishThrows: true });
    eq(result, { status: "success", passwordUpdated: true, sessionsRevoked: true }, "success retained");
  });

  await test("failure bookkeeping throw is contained", async () => {
    const { result } = await runReset(recovery, input, { identity: null, finishThrows: true });
    eq(result, { status: "invalid", code: "identity_not_eligible" }, "original result retained");
  });

  const originalFetch = globalThis.fetch;
  const originalEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_API_URL: process.env.RESEND_API_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  const recoveryUrl = `https://autentik.example.test/auth/reset-password#token=${token}`;

  await test("email success posts escaped HTML to Resend and returns quietly", async () => {
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    process.env.RESEND_FROM_EMAIL = "Autentik <noreply@example.test>";
    delete process.env.RESEND_API_URL;
    let captured;
    globalThis.fetch = async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ id: "synthetic-email-id" }), { status: 200 });
    };
    await email.sendCustomerRecoveryEmail({ to: "customer@example.test", recoveryUrl });
    eq(captured.url, "https://api.resend.com/emails", "Resend endpoint");
    const body = JSON.parse(captured.init.body);
    eq(body.to, ["customer@example.test"], "recipient");
    eq(body.from, "Autentik <noreply@example.test>", "sender");
    eq(body.subject, "Atur ulang kata sandi akun Autentik", "subject");
    ok(body.text.includes(recoveryUrl), "text link retained");
    ok(body.html.includes(`#token=${token}`), "html link retained");
    eq(captured.init.headers.Authorization, "Bearer synthetic-resend-key", "bearer key");
    eq(captured.init.cache, "no-store", "no-store fetch");
  });

  await test("email escapes HTML in the recovery URL", async () => {
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    process.env.RESEND_FROM_EMAIL = "noreply@example.test";
    let captured;
    globalThis.fetch = async (url, init) => {
      captured = { url, init };
      return new Response("{}", { status: 200 });
    };
    await email.sendCustomerRecoveryEmail({ to: "customer@example.test", recoveryUrl: "https://autentik.example.test/reset#token=a&b=<tag>" });
    const body = JSON.parse(captured.init.body);
    eq(body.html.includes("#token=a&b=<tag>"), false, "no raw HTML-sensitive characters");
    ok(body.html.includes("#token=a&amp;b=%3Ctag%3E"), "HTML-escaped link");
    ok(body.text.includes("#token=a&b=%3Ctag%3E"), "plain text keeps URL encoding without HTML escaping");
  });

  await test("email config and URL validation are definitive failures", async () => {
    process.env.RESEND_API_KEY = "";
    process.env.RESEND_FROM_EMAIL = "noreply@example.test";
    await assert.rejects(() => email.sendCustomerRecoveryEmail({ to: "customer@example.test", recoveryUrl }), (error) => error.delivery === "definitive" && error.code === "resend_config");
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    process.env.RESEND_FROM_EMAIL = "";
    await assert.rejects(() => email.sendCustomerRecoveryEmail({ to: "customer@example.test", recoveryUrl }), (error) => error.delivery === "definitive" && error.code === "resend_config");
    process.env.RESEND_FROM_EMAIL = "noreply@example.test";
    await assert.rejects(() => email.sendCustomerRecoveryEmail({ to: "customer@example.test", recoveryUrl: "javascript:alert(1)" }), (error) => error.delivery === "definitive" && error.code === "invalid_recovery_url");
    report.checks += 3;
  });

  await test("production rejects plaintext non-local Resend endpoint", async () => {
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    process.env.RESEND_FROM_EMAIL = "noreply@example.test";
    process.env.RESEND_API_URL = "http://resend.example.test/emails";
    process.env.NODE_ENV = "production";
    await assert.rejects(() => email.sendCustomerRecoveryEmail({ to: "customer@example.test", recoveryUrl }), (error) => error.delivery === "definitive" && error.code === "resend_config");
    report.checks++;
  });

  await test("definitive Resend non-2xx and ambiguous network failures are classified", async () => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    delete process.env.RESEND_API_URL;
    globalThis.fetch = async () => new Response("{}", { status: 500 });
    await assert.rejects(() => email.sendCustomerRecoveryEmail({ to: "customer@example.test", recoveryUrl }), (error) => error.delivery === "definitive" && error.code === "resend_500");
    globalThis.fetch = async () => { throw new TypeError("synthetic network"); };
    await assert.rejects(() => email.sendCustomerRecoveryEmail({ to: "customer@example.test", recoveryUrl }), (error) => error.delivery === "ambiguous" && error.code === "resend_network");
    report.checks += 2;
  });

  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

(async () => {
  await unitTests();
  report.verdict = report.failures.length ? "RED" : "GREEN";
  console.log(`${report.verdict}: ${report.cases.length - report.failures.length}/${report.cases.length} cases; ${report.checks} assertions; ${report.failures.length} failures.`);
  if (report.failures.length) {
    for (const failure of report.failures) console.error(`- ${failure.name}: ${failure.message}`);
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
