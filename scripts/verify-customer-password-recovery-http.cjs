#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- Local-only Stage 0C HTTP verifier. */
"use strict";

const assert = require("node:assert/strict");
const cp = require("node:child_process");
const { execSync, execFileSync } = require("node:child_process");
const { createHmac, randomBytes, randomUUID } = require("node:crypto");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "..");
const SUPABASE_DUMMY = "https://supabase.local.test";
if (process.env.AKA_HTTP_SHIM === "1") {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const value = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (value.startsWith(SUPABASE_DUMMY)) {
      return realFetch(value.replace(SUPABASE_DUMMY, process.env.AKA_SUPABASE_REAL), init);
    }
    return realFetch(input, init);
  };
}
const report = { cases: [], checks: 0, failures: [] };
const emails = [];
const createdUserIds = [];
const issuedTokens = [];
let serverOrigin = "";
let apiUrl = "";
let anonKey = "";
let serviceKey = "";
let admin;
let child;
let childLog = "";
let ipCounter = 0;
let mockServer;

function test(name, run) {
  return (async () => {
    try {
      await run();
      report.cases.push({ name, result: "PASS" });
      console.log("PASS", name);
    } catch (error) {
      report.cases.push({ name, result: "FAIL" });
      report.failures.push({ name, message: error instanceof Error ? error.message : String(error) });
      console.error("FAIL", name, error instanceof Error ? error.stack : error);
      if (error && typeof error === "object" && "cause" in error) console.error("CAUSE", error.cause);
    }
  })();
}

const eq = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  report.checks++;
};
const ok = (value, label) => {
  assert.ok(value, label);
  report.checks++;
};

function command(name, args) {
  return process.platform === "win32" ? `${name}.cmd ${args.join(" ")}` : `${name} ${args.join(" ")}`;
}

function localStatus() {
  const raw = execSync(command("npx", ["--yes", "supabase", "status", "-o", "env"]), {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function requireLocalUrl(value, label) {
  const parsed = new URL(value);
  if (!["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(parsed.hostname.toLowerCase())) {
    throw new Error(`${label} must point to local Supabase, got ${parsed.origin}`);
  }
  return parsed.origin;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function startMockResend() {
  const server = http.createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      if (request.method !== "POST" || request.url !== "/emails") {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ message: "not found" }));
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ message: "invalid json" }));
        return;
      }
      const recipient = Array.isArray(parsed.to) ? String(parsed.to[0] ?? "") : "";
      if (recipient.includes("resend-drop")) {
        request.socket.destroy();
        return;
      }
      if (recipient.includes("resend-500")) {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ message: "synthetic provider failure" }));
        return;
      }
      emails.push({ to: parsed.to, subject: parsed.subject, text: parsed.text, html: parsed.html });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ id: randomUUID() }));
    });
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function startNext(port, resendPort, secret) {
  const env = Object.fromEntries(
    ["SystemRoot", "WINDIR", "PATH", "Path", "PATHEXT", "ComSpec", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP"]
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]]),
  );
  Object.assign(env, {
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_DUMMY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
    CUSTOMER_RECOVERY_TOKEN_SECRET: secret,
    RESEND_API_KEY: "synthetic-resend-key",
    RESEND_FROM_EMAIL: "Autentik <noreply@example.test>",
    RESEND_API_URL: `http://127.0.0.1:${resendPort}/emails`,
    NODE_OPTIONS: `--require=${JSON.stringify(__filename)}`,
    AKA_HTTP_SHIM: "1",
    AKA_SUPABASE_REAL: apiUrl,
    HOSTNAME: "127.0.0.1",
    PORT: String(port),
  });
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const processChild = cp.spawn(process.execPath, [nextBin, "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  processChild.stdout.on("data", (bytes) => {
    childLog += bytes;
  });
  processChild.stderr.on("data", (bytes) => {
    childLog += bytes;
  });
  return processChild;
}

function stopChild() {
  if (!child || child.exitCode !== null) return;
  try {
    execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } catch {
    try {
      child.kill();
    } catch {
      // Process may already be gone.
    }
  }
}

async function waitForReady(deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (!childLog.includes("Ready in")) {
    if (child.exitCode !== null || Date.now() > deadline) {
      throw new Error(`Local Next failed to start. Log: ${childLog.slice(-4000)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function freshIp() {
  ipCounter += 1;
  return `198.51.100.${(ipCounter % 250) + 1}`;
}

async function post(route, body, options = {}) {
  const headers = {
    "content-type": "application/json",
    "x-forwarded-for": options.ip ?? freshIp(),
  };
  if (options.origin !== null) headers.origin = options.origin ?? serverOrigin;
  const response = await fetch(`${serverOrigin}${route}`, {
    method: "POST",
    headers,
    body: options.rawBody ?? JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Non-JSON responses are asserted by status and text.
  }
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  return { response, text, json, setCookies };
}

function expectNoCookies(result) {
  eq(result.setCookies, [], "no Set-Cookie headers");
  eq(result.response.headers.get("set-cookie"), null, "no raw Set-Cookie header");
}

function expectNeutral(result) {
  eq(result.response.status, 202, "neutral 202");
  eq(result.json?.success, true, "neutral success");
  eq(typeof result.json?.message, "string", "neutral message");
  expectNoCookies(result);
}

function extractToken(mail) {
  const matches = [...String(mail.text ?? "").matchAll(/\/auth\/reset-password#token=([a-f0-9]{64})/g)];
  assert.equal(matches.length, 1, "exactly one recovery link");
  report.checks++;
  const token = matches[0][1];
  issuedTokens.push(token);
  return token;
}

async function createUser(label, role, active = true) {
  const email = `stage0c-http-${label}-${randomUUID()}@example.test`;
  const password = `Qa0!${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  const { error: profileError } = await admin.from("profiles").update({ role, is_active: active }).eq("id", data.user.id);
  if (profileError) throw profileError;
  return { id: data.user.id, email, password };
}

async function setActive(userId, active) {
  const { error } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) throw error;
}

async function recoveryRow(userId) {
  const { data, error } = await admin
    .from("customer_password_recovery")
    .select("id,user_id,state,failure_code,token_digest")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function makeAnonClient() {
  return createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function signIn(user) {
  const client = makeAnonClient();
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw error;
  return client;
}

async function forgot(email, ip) {
  return post("/api/auth/customer/forgot-password", { email }, { ip });
}

async function reset(token, password, ip) {
  return post("/api/auth/customer/reset-password", { token, password, confirmPassword: password }, { ip });
}

async function runHttpTests(users, secret) {
  const forgotPath = "/api/auth/customer/forgot-password";
  const resetPath = "/api/auth/customer/reset-password";

  await test("forgot success is neutral, sends one fragment link and stores only a digest", async () => {
    const before = emails.length;
    const result = await forgot(users.ok.email, freshIp());
    expectNeutral(result);
    eq(emails.length, before + 1, "one email sent");
    const mail = emails.at(-1);
    eq(mail.to, [users.ok.email], "recipient");
    eq(mail.subject, "Atur ulang kata sandi akun Autentik", "subject");
    const token = extractToken(mail);
    eq(result.text.includes(token), false, "response does not expose token");
    ok(mail.text.includes(`${serverOrigin}/auth/reset-password#token=${token}`), "email link uses the canonical origin and fragment");
    ok(mail.html.includes(`#token=${token}`), "HTML link contains fragment token");
    const row = await recoveryRow(users.ok.id);
    eq(row.state, "issued", "row issued");
    eq(row.token_digest.length, 64, "digest length");
    eq(row.token_digest === token, false, "raw token not stored");
    eq(row.token_digest, createHmac("sha256", secret).update(token).digest("hex"), "HMAC digest stored");
  });

  await test("forgot remains neutral for unknown, Admin, inactive and missing-profile identities", async () => {
    const identities = [
      `unknown-${randomUUID()}@example.test`,
      users.admin.email,
      users.inactive.email,
      users.missingProfile.email,
    ];
    for (const email of identities) {
      const before = emails.length;
      const result = await forgot(email, freshIp());
      expectNeutral(result);
      eq(emails.length, before, `no email for ${email.split("@")[0]}`);
    }
  });

  await test("definitive Resend failure marks the issued row failed", async () => {
    const before = emails.length;
    const result = await forgot(users.resend500.email, freshIp());
    expectNeutral(result);
    eq(emails.length, before, "500 response is not captured as delivered");
    const row = await recoveryRow(users.resend500.id);
    eq(row.state, "failed", "row failed");
    eq(row.failure_code, "resend_500", "definitive code recorded");
  });

  await test("ambiguous Resend network failure leaves the row issued", async () => {
    const result = await forgot(users.resendDrop.email, freshIp());
    expectNeutral(result);
    const row = await recoveryRow(users.resendDrop.id);
    eq(row.state, "issued", "issued row remains");
    eq(row.failure_code, null, "no definitive failure code");
  });

  await test("forgot cooldown prevents a second link and keeps the response neutral", async () => {
    const before = emails.length;
    const result = await forgot(users.ok.email, freshIp());
    expectNeutral(result);
    eq(emails.length, before, "cooldown sends no email");
  });

  await test("forgot origin, body and validation boundaries", async () => {
    const noOrigin = await post(forgotPath, { email: users.ok.email }, { origin: null, ip: freshIp() });
    eq(noOrigin.response.status, 403, "missing origin denied");
    const badOrigin = await post(forgotPath, { email: users.ok.email }, { origin: "https://evil.example.test", ip: freshIp() });
    eq(badOrigin.response.status, 403, "foreign origin denied");
    const tooLarge = await post(forgotPath, null, { rawBody: JSON.stringify({ email: `${"a".repeat(9000)}@example.test` }), ip: freshIp() });
    eq(tooLarge.response.status, 413, "8KB body limited");
    const badJson = await post(forgotPath, null, { rawBody: "{", ip: freshIp() });
    eq(badJson.response.status, 400, "invalid JSON rejected");
    const badEmail = await post(forgotPath, { email: "not-an-email" }, { ip: freshIp() });
    eq(badEmail.response.status, 400, "invalid email rejected");
    expectNoCookies(noOrigin);
    expectNoCookies(badOrigin);
    expectNoCookies(tooLarge);
    expectNoCookies(badJson);
    expectNoCookies(badEmail);
  });

  await test("forgot IP and hashed-email rate limits", async () => {
    const ip = "203.0.113.200";
    let last;
    for (let index = 0; index < 11; index += 1) {
      last = await forgot(`rate-ip-${index}-${randomUUID()}@example.test`, ip);
      if (index < 10) eq(last.response.status, 202, `IP request ${index + 1} allowed`);
      else eq(last.response.status, 429, "eleventh IP request limited");
    }
    const email = `rate-email-${randomUUID()}@example.test`;
    const statuses = [];
    for (let index = 0; index < 4; index += 1) statuses.push((await forgot(email, freshIp())).response.status);
    eq(statuses, [202, 202, 202, 429], "fourth email request limited");
  });

  const resetUser = users.reset;
  const otherClient = await signIn(users.other);
  const resetOldClient = await signIn(resetUser);
  const resetNewPassword = `New-pass-${randomUUID()}`;
  let resetToken = "";

  await test("reset success consumes token, updates password, revokes that user's sessions only", async () => {
    const requested = await forgot(resetUser.email, freshIp());
    expectNeutral(requested);
    resetToken = extractToken(emails.at(-1));
    const result = await reset(resetToken, resetNewPassword, freshIp());
    eq(result.response.status, 200, "200 success");
    eq(result.json?.success, true, "success true");
    eq(result.json?.passwordUpdated, true, "password updated");
    eq(result.json?.sessionsRevoked, true, "global sessions revoked");
    expectNoCookies(result);
    eq(result.text.includes(resetToken), false, "response does not expose token");
    const row = await recoveryRow(resetUser.id);
    eq(row.state, "consumed", "row consumed");

    const oldLogin = await makeAnonClient().auth.signInWithPassword({ email: resetUser.email, password: resetUser.password });
    ok(oldLogin.error, "old password rejected");
    const newLogin = await makeAnonClient().auth.signInWithPassword({ email: resetUser.email, password: resetNewPassword });
    ok(!newLogin.error, "new password accepted");

    const refresh = await resetOldClient.auth.refreshSession();
    ok(refresh.error, "old reset-user session revoked");
    const otherUser = await otherClient.auth.getUser();
    eq(otherUser.data.user?.id, users.other.id, "other user's session remains");
    const otherRefresh = await otherClient.auth.refreshSession();
    ok(!otherRefresh.error, "other user's refresh token remains");
  });

  await test("reset replay is invalid and cannot consume again", async () => {
    const replay = await reset(resetToken, `Replay-${randomUUID()}`, freshIp());
    eq(replay.response.status, 400, "replay rejected");
    eq(replay.json?.success, false, "replay failure");
    eq(replay.json?.needsNewLink, true, "replay needs new link");
    expectNoCookies(replay);
    eq(replay.text.includes(resetToken), false, "replay response does not expose token");
    const row = await recoveryRow(resetUser.id);
    eq(row.state, "consumed", "row remains consumed");
  });

  await test("reset invalid token, origin, body and validation boundaries", async () => {
    const invalid = await reset("a".repeat(64), "Synthetic-new-password-42", freshIp());
    eq(invalid.response.status, 400, "unknown token invalid");
    eq(invalid.json?.success, false, "unknown token failure");
    eq(invalid.json?.needsNewLink, true, "unknown token needs new link");
    expectNoCookies(invalid);

    const noOrigin = await post(resetPath, { token: "a".repeat(64), password: "Synthetic-new-password-42", confirmPassword: "Synthetic-new-password-42" }, { origin: null, ip: freshIp() });
    eq(noOrigin.response.status, 403, "missing origin denied");
    const badOrigin = await post(resetPath, { token: "a".repeat(64), password: "Synthetic-new-password-42", confirmPassword: "Synthetic-new-password-42" }, { origin: "https://evil.example.test", ip: freshIp() });
    eq(badOrigin.response.status, 403, "foreign origin denied");
    const tooLarge = await post(resetPath, null, { rawBody: JSON.stringify({ token: "a".repeat(64), password: "x".repeat(9000), confirmPassword: "x".repeat(9000) }), ip: freshIp() });
    eq(tooLarge.response.status, 413, "8KB body limited");
    const badJson = await post(resetPath, null, { rawBody: "{", ip: freshIp() });
    eq(badJson.response.status, 400, "invalid JSON rejected");
    const mismatch = await post(resetPath, { token: "a".repeat(64), password: "Synthetic-new-password-42", confirmPassword: "Synthetic-other-password-42" }, { ip: freshIp() });
    eq(mismatch.response.status, 400, "confirmation mismatch rejected");
    for (const result of [noOrigin, badOrigin, tooLarge, badJson, mismatch]) expectNoCookies(result);
  });

  await test("reset IP and token rate limits", async () => {
    const ip = "203.0.113.201";
    for (let index = 0; index < 21; index += 1) {
      const token = randomBytes(32).toString("hex");
      const result = await reset(token, "Synthetic-new-password-42", ip);
      if (index < 20) eq(result.response.status, 400, `IP request ${index + 1} reaches validation`);
      else eq(result.response.status, 429, "twenty-first IP request limited");
    }
    const token = "b".repeat(64);
    for (let index = 0; index < 11; index += 1) {
      const result = await reset(token, "Synthetic-new-password-42", freshIp());
      if (index < 10) eq(result.response.status, 400, `token request ${index + 1} reaches validation`);
      else eq(result.response.status, 429, "eleventh token request limited");
    }
  });

  await test("inactive account after issue is rejected before password update", async () => {
    const requested = await forgot(users.deactivate.email, freshIp());
    expectNeutral(requested);
    const token = extractToken(emails.at(-1));
    await setActive(users.deactivate.id, false);
    const result = await reset(token, `Deactivated-${randomUUID()}`, freshIp());
    eq(result.response.status, 400, "inactive account rejected");
    eq(result.json?.success, false, "inactive account failure");
    const oldLogin = await makeAnonClient().auth.signInWithPassword({ email: users.deactivate.email, password: users.deactivate.password });
    ok(!oldLogin.error, "password unchanged for inactive account");
  });

  await test("concurrent reset has exactly one winner", async () => {
    const requested = await forgot(users.concurrent.email, freshIp());
    expectNeutral(requested);
    const token = extractToken(emails.at(-1));
    const passwords = [`Concurrent-a-${randomUUID()}`, `Concurrent-b-${randomUUID()}`];
    const results = await Promise.all(passwords.map((password) => reset(token, password, freshIp())));
    const successes = results.filter((result) => result.response.status === 200);
    const invalid = results.filter((result) => result.response.status === 400 && result.json?.success === false);
    eq(successes.length, 1, "exactly one success");
    eq(invalid.length, 1, "exactly one loser");
    const winner = results.findIndex((result) => result.response.status === 200);
    const login = await makeAnonClient().auth.signInWithPassword({ email: users.concurrent.email, password: passwords[winner] });
    ok(!login.error, "winner password accepted");
    const row = await recoveryRow(users.concurrent.id);
    eq(row.state, "consumed", "row consumed once");
  });

  await test("server logs and responses never contain raw tokens, secrets or passwords", async () => {
    const forbidden = [secret, resetNewPassword, ...issuedTokens];
    for (const value of forbidden) {
      eq(childLog.includes(value), false, "server log excludes sensitive material");
    }
  });
}

async function main() {
  const status = localStatus();
  apiUrl = requireLocalUrl(status.API_URL || status.SUPABASE_URL || "", "API_URL");
  anonKey = status.PUBLISHABLE_KEY || status.ANON_KEY || status.SUPABASE_ANON_KEY;
  serviceKey = status.SERVICE_ROLE_KEY || status.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(anonKey, "local publishable/anon key not found");
  assert.ok(serviceKey, "local service role key not found");
  admin = createClient(apiUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const secret = randomBytes(32).toString("hex");
  const port = await freePort();
  serverOrigin = `http://127.0.0.1:${port}`;
  const mock = await startMockResend();
  mockServer = mock.server;
  child = startNext(port, mock.port, secret);

  try {
    await Promise.race([
      waitForReady(180_000),
      new Promise((_, reject) => {
        child.on("exit", (code) => reject(new Error(`Local Next exited early with code ${code}. Log: ${childLog.slice(-4000)}`)));
      }),
    ]);

    const users = {
      ok: await createUser("ok", "customer", true),
      admin: await createUser("admin", "admin", true),
      inactive: await createUser("inactive", "customer", false),
      missingProfile: await createUser("missing-profile", "customer", true),
      resend500: await createUser("resend-500", "customer", true),
      resendDrop: await createUser("resend-drop", "customer", true),
      reset: await createUser("reset", "customer", true),
      other: await createUser("other", "customer", true),
      deactivate: await createUser("deactivate", "customer", true),
      concurrent: await createUser("concurrent", "customer", true),
    };
    const { error: missingProfileError } = await admin.from("profiles").delete().eq("id", users.missingProfile.id);
    if (missingProfileError) throw missingProfileError;

    await runHttpTests(users, secret);
  } finally {
    for (const id of createdUserIds) {
      try {
        await admin.auth.admin.deleteUser(id);
      } catch {
        // Best-effort local cleanup only.
      }
    }
    stopChild();
    await new Promise((resolve) => {
      mock.server.closeAllConnections?.();
      mock.server.close(() => resolve());
    });
  }

  report.verdict = report.failures.length ? "RED" : "GREEN";
  console.log(`${report.verdict}: ${report.cases.length - report.failures.length}/${report.cases.length} cases; ${report.checks} assertions; ${report.failures.length} failures.`);
  if (report.failures.length) {
    for (const failure of report.failures) console.error(`- ${failure.name}: ${failure.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    stopChild();
    if (mockServer) {
      mockServer.closeAllConnections?.();
      mockServer.close();
    }
    console.error(error);
    process.exitCode = 1;
  });
}
