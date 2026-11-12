#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- Local-only Stage 0C browser verifier. */
"use strict";

const assert = require("node:assert/strict");
const cp = require("node:child_process");
const { execSync, execFileSync } = cp;
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { randomBytes, randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "..");
const SUPABASE_DUMMY = "https://supabase.local.test";
const EVIDENCE_ROOT = "D:\\aka-task3-evidence";

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

const report = { checkedAt: new Date().toISOString(), cases: [], checks: 0, failures: [] };
const createdUserIds = [];
const emails = [];
let apiUrl = "";
let anonKey = "";
let serviceKey = "";
let admin;
let child;
let childLog = "";
let mockServer;
let edge;
let serverOrigin = "";
let evidenceDir = "";
let resetRequests = [];
let forgotStatuses = [];
let resetStatuses = [];

const idAuth = require("../messages/id/auth.json");
const enAuth = require("../messages/en/auth.json");
const zhAuth = require("../messages/zh-CN/auth.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ok(value, label) {
  assert.ok(value, label);
  report.checks++;
}
function eq(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  report.checks++;
}
async function test(name, run) {
  try {
    await run();
    report.cases.push({ name, result: "PASS" });
    console.log("PASS", name);
  } catch (error) {
    report.cases.push({ name, result: "FAIL", message: error instanceof Error ? error.message : String(error) });
    report.failures.push({ name, message: error instanceof Error ? error.message : String(error) });
    console.error("FAIL", name, error instanceof Error ? error.stack : error);
  }
}

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
function stopChild(processChild) {
  if (!processChild || processChild.exitCode !== null) return;
  try {
    execFileSync("taskkill", ["/pid", String(processChild.pid), "/T", "/F"], { stdio: "ignore" });
  } catch {
    try {
      processChild.kill();
    } catch {
      // Process already gone.
    }
  }
}
async function waitForNext() {
  const deadline = Date.now() + 120000;
  while (!childLog.includes("Ready in")) {
    if (child.exitCode !== null) throw new Error(`Next exited early. Log: ${childLog.slice(-4000)}`);
    if (Date.now() > deadline) throw new Error(`Next did not become ready. Log: ${childLog.slice(-4000)}`);
    await sleep(200);
  }
  const origin = `http://127.0.0.1:${new URL(serverOrigin).port}`;
  const deadline2 = Date.now() + 60000;
  while (Date.now() < deadline2) {
    try {
      const response = await fetch(`${origin}/auth/login`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // Next still compiling.
    }
    await sleep(300);
  }
  throw new Error(`Next auth page did not respond. Log: ${childLog.slice(-4000)}`);
}

async function createUser(label, role, active) {
  const email = `qa-task3-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`;
  const password = `Old-${randomUUID()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role, is_active: active })
    .eq("id", data.user.id);
  if (profileError) throw profileError;
  return { id: data.user.id, email, password };
}

function extractToken(mail, kind) {
  const pattern = new RegExp(`/auth/${kind}#token=([a-f0-9]{64})`);
  const match = pattern.exec(mail.text || "");
  if (!match) throw new Error("Email link token missing");
  return match[1];
}
function mailFor(email) {
  return emails.filter((mail) => JSON.stringify(mail.to).includes(email)).at(-1);
}
async function recoveryRow(userId) {
  const { data, error } = await admin
    .from("customer_password_recovery")
    .select("state, failure_code")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
async function waitForRecoveryState(userId, state) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const row = await recoveryRow(userId);
    if (row?.state === state) return row;
    await sleep(200);
  }
  throw new Error(`Recovery row did not reach ${state}`);
}
async function postJson(route, body, ip) {
  const response = await fetch(`${serverOrigin}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, origin: serverOrigin },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

async function launchEdge(port, profileDir) {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  assert.ok(fs.existsSync(edgePath), "Edge browser available");
  const browser = cp.spawn(
    edgePath,
    [
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${port}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let target;
  for (let i = 0; i < 150; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((item) => item.type === "page");
      if (target) break;
    } catch {
      // Browser startup.
    }
    await sleep(100);
  }
  if (!target) throw new Error("Edge CDP target unavailable");
  return { browser, target };
}

async function browserSession(port) {
  const { connection } = require("./verify-product-translation-editor-browser.cjs");
  const onEvent = (event) => {
    if (event.method === "Network.requestWillBeSent") {
      const request = event.params.request;
      if (request.url.includes("/api/auth/customer/reset-password")) {
        resetRequests.push({ url: request.url, postData: request.postData || "" });
      }
    }
    if (event.method === "Network.responseReceived") {
      const response = event.params.response;
      if (response.url.includes("/api/auth/customer/forgot-password")) forgotStatuses.push(response.status);
      if (response.url.includes("/api/auth/customer/reset-password")) resetStatuses.push(response.status);
    }
  };
  const session = await connection(port, null, onEvent);
  await session.cdp("Network.enable");
  await session.cdp("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      window.__qaConsole = [];
      for (const key of ["log", "warn", "error", "info", "debug"]) {
        const original = console[key].bind(console);
        console[key] = (...args) => {
          try { window.__qaConsole.push(args.map((value) => String(value)).join(" ")); } catch {}
          return original(...args);
        };
      }
      const realFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const value = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (value && value.startsWith("${SUPABASE_DUMMY}")) {
          const rewritten = value.replace("${SUPABASE_DUMMY}", "${apiUrl}");
          if (input instanceof Request) return realFetch(new Request(rewritten, input), init);
          return realFetch(rewritten, init);
        }
        return realFetch(input, init);
      };
    })()`,
  });
  return session;
}

async function navigate(session, pathname, selector) {
  await session.cdp("Page.navigate", { url: `${serverOrigin}${pathname}` });
  const cleanPath = pathname.split(/[?#]/)[0];
  await session.wait(`document.readyState === "complete" && location.pathname === ${JSON.stringify(cleanPath)}`);
  if (selector) await session.wait(`document.querySelector(${JSON.stringify(selector)})`);
  await sleep(900);
}
async function bodyText(session) {
  return session.evaluate("document.body.innerText");
}
async function noOverflow(session, label) {
  const overflow = await session.evaluate("document.documentElement.scrollWidth > innerWidth");
  eq(overflow, false, label);
}
async function screenshot(session, name) {
  const result = await session.cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(evidenceDir, name), Buffer.from(result.data, "base64"));
}
async function submitForm(session, selector = "form button[type=submit]") {
  await session.evaluate(`(() => { const button = document.querySelector(${JSON.stringify(selector)}); if (!button || button.disabled) throw Error("submit button unavailable"); button.click(); })()`);
}
async function setViewport(session, width, height) {
  await session.cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await sleep(250);
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

  const nextPort = await freePort();
  serverOrigin = `http://127.0.0.1:${nextPort}`;
  const secret = randomBytes(32).toString("hex");
  const mock = await startMockResend();
  mockServer = mock.server;
  child = startNext(nextPort, mock.port, secret);
  await waitForNext();

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  evidenceDir = path.join(EVIDENCE_ROOT, `run-${runId}`);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const profileDir = path.join(evidenceDir, "browser-profile");
  fs.mkdirSync(profileDir, { recursive: true });
  const debugPort = await freePort();
  const launched = await launchEdge(debugPort, profileDir);
  edge = launched.browser;
  const session = await browserSession(debugPort);

  const resetUser = await createUser("reset", "customer", true);
  const layoutUser = await createUser("layout", "customer", true);
  const adminUser = await createUser("admin", "admin", true);

  const adminLogin = await createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).auth.signInWithPassword({ email: adminUser.email, password: adminUser.password });
  assert.ok(!adminLogin.error, "admin fixture login");
  const adminAccessToken = adminLogin.data.session?.access_token;
  assert.ok(adminAccessToken, "admin access token");

  const layoutRequest = await postJson("/api/auth/customer/forgot-password", { email: layoutUser.email }, "198.51.100.201");
  eq(layoutRequest.status, 202, "layout token issued");
  await sleep(500);
  const layoutMail = mailFor(layoutUser.email);
  assert.ok(layoutMail, "layout email captured");
  const layoutToken = extractToken(layoutMail, "reset-password");

  let resetToken = "";

  await test("Login links are localized", async () => {
    await setViewport(session, 1366, 900);
    await navigate(session, "/auth/login", "#customer-email");
    eq(await session.evaluate("document.querySelector('a[href=\"/auth/forgot-password\"]')?.textContent.trim()"), idAuth.login.forgotPassword, "id login link");
    await navigate(session, "/en/auth/login", "#customer-email");
    eq(await session.evaluate("document.querySelector('a[href=\"/en/auth/forgot-password\"]')?.textContent.trim()"), enAuth.login.forgotPassword, "en login link");
    await navigate(session, "/zh-cn/auth/login", "#customer-email");
    eq(await session.evaluate("document.querySelector('a[href=\"/zh-cn/auth/forgot-password\"]')?.textContent.trim()"), zhAuth.login.forgotPassword, "zh login link");
  });

  await test("Forgot password pages render in three locales without overflow", async () => {
    for (const [prefix, locale, catalog] of [["", "id", idAuth], ["/en", "en", enAuth], ["/zh-cn", "zh-CN", zhAuth]]) {
      await navigate(session, `${prefix}/auth/forgot-password`, "#forgot-email");
      for (const width of [375, 1440]) {
        await setViewport(session, width, 900);
        await noOverflow(session, `${locale} forgot ${width}`);
      }
      const text = await bodyText(session);
      ok(text.includes(catalog.forgot.title), `${locale} forgot title`);
      ok(text.includes(catalog.forgot.submit), `${locale} forgot submit`);
    }
  });

  await test("Forgot form validates and shows neutral success", async () => {
    await setViewport(session, 375, 900);
    await navigate(session, "/auth/forgot-password", "#forgot-email");
    const before = forgotStatuses.length;
    await session.fill("#forgot-email", "not-an-email");
    await submitForm(session);
    await session.wait(`document.body.innerText.includes(${JSON.stringify(idAuth.forgot.errors.emailInvalid)})`);
    eq(forgotStatuses.length, before, "invalid email does not call API");
    await session.fill("#forgot-email", resetUser.email);
    await submitForm(session);
    await session.wait(`document.body.innerText.includes(${JSON.stringify(idAuth.forgot.neutralTitle)})`);
    ok((await bodyText(session)).includes(idAuth.forgot.neutralBody), "neutral body");
    eq(await session.evaluate("document.querySelector('h1').parentElement.parentElement.querySelectorAll('a[href=\"/auth/login\"]').length"), 1, "single neutral login link");
    eq(forgotStatuses.at(-1), 202, "forgot API 202");
    await screenshot(session, "forgot-neutral-mobile-id.png");
    await sleep(500);
    const mail = mailFor(resetUser.email);
    assert.ok(mail, "reset email captured");
    resetToken = extractToken(mail, "reset-password");
    await waitForRecoveryState(resetUser.id, "issued");
  });

  await test("Recovery form reads fragment only and clears it", async () => {
    await setViewport(session, 1366, 900);
    const before = resetRequests.length;
    await navigate(session, `/auth/customer-recovery#token=${layoutToken}`, "#customer-recovery-password");
    await session.wait("location.hash === ''");
    eq(await session.evaluate("location.search"), "", "no query string");
    eq(await session.evaluate("location.pathname"), "/auth/customer-recovery", "recovery path");
    const leak = await session.evaluate(`(() => {
      const token = ${JSON.stringify(layoutToken)};
      const storage = [];
      for (const area of [localStorage, sessionStorage]) for (let i = 0; i < area.length; i++) storage.push(area.key(i) + "=" + area.getItem(area.key(i)));
      return { url: location.href.includes(token), dom: document.body.innerHTML.includes(token), storage: storage.some((value) => value.includes(token)), console: (window.__qaConsole || []).some((value) => value.includes(token)) };
    })()`);
    eq(leak, { url: false, dom: false, storage: false, console: false }, "token not exposed");
    eq(resetRequests.length, before, "no reset request on page load");
    await waitForRecoveryState(layoutUser.id, "issued");
    ok((await bodyText(session)).includes(idAuth.recovery.title), "id recovery title");
    await screenshot(session, "recovery-form-desktop-id.png");
  });

  await test("Recovery pages render in three locales without overflow", async () => {
    for (const [prefix, locale, catalog] of [["", "id", idAuth], ["/en", "en", enAuth], ["/zh-cn", "zh-CN", zhAuth]]) {
      await navigate(session, `${prefix}/auth/customer-recovery#token=${layoutToken}`, "#customer-recovery-password");
      for (const width of [375, 1440]) {
        await setViewport(session, width, 900);
        await noOverflow(session, `${locale} recovery ${width}`);
      }
      ok((await bodyText(session)).includes(catalog.recovery.title), `${locale} recovery title`);
    }
  });

  await test("Backend canonical reset path serves the same UI", async () => {
    await navigate(session, `/auth/reset-password#token=${layoutToken}`, "#customer-recovery-password");
    ok((await bodyText(session)).includes(idAuth.recovery.title), "reset-password alias works");
    await screenshot(session, "recovery-alias-mobile-id.png");
  });

  await test("Password mismatch is blocked client-side", async () => {
    await navigate(session, `/auth/customer-recovery#token=${resetToken}`, "#customer-recovery-password");
    const before = resetRequests.length;
    await session.fill("#customer-recovery-password", "NewPass!234");
    await session.fill("#customer-recovery-confirm", "Different!234");
    await submitForm(session);
    await session.wait(`document.body.innerText.includes(${JSON.stringify(idAuth.recovery.errors.mismatch)})`);
    eq(resetRequests.length, before, "mismatch does not call API");
    eq((await recoveryRow(resetUser.id))?.state, "issued", "row remains issued");
  });

  await test("Valid reset succeeds, is replay-safe, and login works", async () => {
    await session.fill("#customer-recovery-password", "NewPass!234");
    await session.fill("#customer-recovery-confirm", "NewPass!234");
    await submitForm(session);
    await session.wait(`document.body.innerText.includes(${JSON.stringify(idAuth.recovery.successTitle)})`);
    ok((await bodyText(session)).includes(idAuth.recovery.successBody), "success body");
    eq(await session.evaluate("document.querySelector('h1').parentElement.parentElement.querySelectorAll('a[href=\"/auth/login\"]').length"), 1, "single success login link");
    eq(resetRequests.length, 1, "one reset request");
    ok(resetRequests[0].postData.includes(resetToken), "token sent only on submit");
    await waitForRecoveryState(resetUser.id, "consumed");
    await screenshot(session, "reset-success-mobile-id.png");

    await navigate(session, "/auth/login", "#customer-email");
    await session.fill("#customer-email", resetUser.email);
    await session.fill("#customer-password", "NewPass!234");
    await submitForm(session);
    await session.wait("location.pathname.startsWith('/store')");
    eq(await session.evaluate("location.pathname"), "/store", "customer login lands in store");

    await navigate(session, `/auth/customer-recovery#token=${resetToken}`, "#customer-recovery-password");
    await session.fill("#customer-recovery-password", "Another!234");
    await session.fill("#customer-recovery-confirm", "Another!234");
    await submitForm(session);
    await session.wait(`document.body.innerText.includes(${JSON.stringify(idAuth.recovery.invalidTitle)})`);
    eq(resetRequests.length, 2, "replay request sent");
    eq(resetStatuses.at(-1), 400, "replay rejected");
    eq((await recoveryRow(resetUser.id))?.state, "consumed", "row stays consumed");
  });

  await test("Missing and query tokens are rejected without an API call", async () => {
    await navigate(session, "/auth/customer-recovery");
    await session.wait(`document.body.innerText.includes(${JSON.stringify(idAuth.recovery.invalidTitle)})`);
    const before = resetRequests.length;
    await navigate(session, `/auth/customer-recovery?token=${resetToken}`);
    await session.wait(`document.body.innerText.includes(${JSON.stringify(idAuth.recovery.invalidTitle)})`);
    eq(resetRequests.length, before, "query token never read");
  });

  await test("Admin session survives customer reset", async () => {
    const { data, error } = await admin.auth.getUser(adminAccessToken);
    ok(!error, "admin token still valid");
    eq(data.user?.id, adminUser.id, "admin identity intact");
    await navigate(session, "/admin/login", "#admin-email");
    ok((await bodyText(session)).toLowerCase().includes("masuk"), "admin login page reachable");
  });

  await test("Unrelated auth/store pages still render", async () => {
    await navigate(session, "/auth/register", "form");
    ok((await session.evaluate("Boolean(document.querySelector('form'))")), "register form");
    await navigate(session, "/store/cart");
    ok((await bodyText(session)).length > 20, "cart page renders");
  });

  fs.writeFileSync(path.join(evidenceDir, "qa-summary.json"), JSON.stringify(report, null, 2));
  console.log(`\nChecks: ${report.checks}`);
  console.log(`Cases: ${report.cases.filter((item) => item.result === "PASS").length}/${report.cases.length} PASS`);
  console.log(`Evidence: ${evidenceDir}`);
  if (report.failures.length) process.exitCode = 1;
}

async function cleanup() {
  stopChild(child);
  if (mockServer) await new Promise((resolve) => mockServer.close(resolve));
  if (edge && edge.exitCode === null) {
    try {
      execFileSync("taskkill", ["/pid", String(edge.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      try {
        edge.kill();
      } catch {
        // Already gone.
      }
    }
  }
  for (const id of createdUserIds.reverse()) {
    try {
      await admin.auth.admin.deleteUser(id);
    } catch {
      // Best effort cleanup.
    }
  }
  if (evidenceDir) {
    const profileDir = path.join(evidenceDir, "browser-profile");
    for (let i = 0; i < 10; i++) {
      try {
        fs.rmSync(profileDir, { recursive: true, force: true });
        break;
      } catch {
        await sleep(300);
      }
    }
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("FATAL", error instanceof Error ? error.stack : error);
      report.failures.push({ name: "fatal", message: error instanceof Error ? error.message : String(error) });
      if (evidenceDir) fs.writeFileSync(path.join(evidenceDir, "qa-summary.json"), JSON.stringify(report, null, 2));
      process.exitCode = 1;
    })
    .finally(cleanup);
}
