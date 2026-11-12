#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- Isolated local-only Stage 0C verifier. */
"use strict";

const assert = require("node:assert/strict");
const { exec, execSync } = require("node:child_process");
const { createHash, randomBytes, randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");
const { createClient } = require("@supabase/supabase-js");

const execAsync = promisify(exec);
const ROOT = path.resolve(__dirname, "..");
const MIGRATION = path.join(ROOT, "supabase", "migrations", "20261109120000_customer_password_recovery.sql");
const TTL_MS = 15 * 60 * 1000;
const PREFLIGHT = process.argv.includes("--preflight");
const FUNCTIONS = [
  "issue_customer_password_recovery",
  "claim_customer_password_recovery",
  "fail_customer_password_recovery_delivery",
  "finish_customer_password_recovery",
];

const results = [];
const rawTokens = [];
const createdUserIds = [];
const tempFiles = new Set();

function log(message) {
  process.stdout.write(`${message}\n`);
}

function command(name, args) {
  return process.platform === "win32" ? `${name}.cmd ${args.join(" ")}` : `${name} ${args.join(" ")}`;
}

function preflight() {
  assert.ok(fs.existsSync(MIGRATION), `migration not found: ${MIGRATION}`);
  const sql = fs.readFileSync(MIGRATION, "utf8");
  const lower = sql.toLowerCase();
  const ddl = sql.match(/create\s+table\s+if\s+not\s+exists[\s\S]*?\);/i)?.[0] ?? "";
  const issueDef =
    sql.match(/create\s+or\s+replace\s+function\s+public\.issue_customer_password_recovery[\s\S]*?\$\$;/i)?.[0] ?? "";
  const claimDef =
    sql.match(/create\s+or\s+replace\s+function\s+public\.claim_customer_password_recovery[\s\S]*?\$\$;/i)?.[0] ?? "";
  const failDeliveryDef =
    sql.match(/create\s+or\s+replace\s+function\s+public\.fail_customer_password_recovery_delivery[\s\S]*?\$\$;/i)?.[0] ?? "";
  const finishDef =
    sql.match(/create\s+or\s+replace\s+function\s+public\.finish_customer_password_recovery[\s\S]*?\$\$;/i)?.[0] ?? "";

  const checks = [
    ["table exists", /create\s+table\s+if\s+not\s+exists\s+(?:public\.|"public"\.)?"?customer_password_recovery"?/i.test(sql)],
    ["id column", /^\s*id\s+/im.test(ddl)],
    ["user_id column", /^\s*user_id\s+/im.test(ddl)],
    ["token_digest column", /^\s*token_digest\s+/im.test(ddl)],
    ["state column", /^\s*state\s+/im.test(ddl)],
    ["created_at column", /^\s*created_at\s+/im.test(ddl)],
    ["updated_at column", /^\s*updated_at\s+/im.test(ddl)],
    ["expires_at column", /^\s*expires_at\s+/im.test(ddl)],
    ["claimed_at column", /^\s*claimed_at\s+/im.test(ddl)],
    ["consumed_at column", /^\s*consumed_at\s+/im.test(ddl)],
    ["failure_code column", /^\s*failure_code\s+/im.test(ddl)],
    ["all states", ["issued", "claimed", "consumed", "failed", "expired"].every((state) => lower.includes(`'${state}'`))],
    ["unique token_digest", /unique\s*\(\s*token_digest\s*\)/i.test(sql)],
    ["partial unique active user", /create\s+unique\s+index[\s\S]{0,500}?where\s+state\s+in\s*\(\s*'issued'\s*,\s*'claimed'\s*\)/i.test(sql)],
    ["auth.users foreign key", /references\s+auth\.users\s*\(\s*id\s*\)/i.test(sql)],
    ["RLS enabled", /alter\s+table\s+(?:public\.|"public"\.)?"?customer_password_recovery"?\s+enable\s+row\s+level\s+security/i.test(sql)],
    ["no anon/authenticated grant", !/grant\s+[^;]{0,300}\bto\s+(?:anon|authenticated)\b/i.test(sql)],
    ["no executable raw token/password column", !/^\s*(?:password|token|raw_token)\s+/im.test(ddl)],
    ["no delete lifecycle", !/\bdelete\s+from\b/i.test(sql)],
    ["no unqualified target table", !/(?:from|join|update|into)\s+(?!public\.|auth\.|pg_catalog\.)customer_password_recovery\b/i.test(sql)],
    ["lifecycle constraint", /customer_password_recovery_lifecycle_check/i.test(sql)],
    ["retention documented", /terminal states.*retained for audit/is.test(sql)],
    ["exact-one eligibility count", /count\(\*\) filter/i.test(issueDef) && /into\s+strict/i.test(issueDef)],
    ["staff collision includes CMS roles", /super_admin[\s\S]*admin[\s\S]*staff[\s\S]*editor/i.test(issueDef)],
    ["auth status filters on issue and claim", /u\.deleted_at is null/i.test(issueDef) && /u\.banned_until/i.test(issueDef) && /u\.deleted_at is null/i.test(claimDef)],
    ["resend cooldown", /interval\s+'60 seconds'/i.test(issueDef)],
    ["claim returning aliased", /returning\s+r\.id\s*,\s*r\.user_id/i.test(claimDef)],
    ["delivery failure only from issued", /state\s*=\s*'issued'/i.test(failDeliveryDef) && /set\s+state\s*=\s*'failed'/i.test(failDeliveryDef)],
    ["finish does not gate on profile status", !/public\.profiles|auth\.users/i.test(finishDef)],
    ["four security definer functions", (lower.match(/\bsecurity\s+definer\b/g) ?? []).length >= 4],
    ["fixed search_path on all functions", (sql.match(/set\s+search_path\s*=\s*''/gi) ?? []).length >= 4],
    ["revoke execute from public", (lower.match(/revoke\s+execute\s+on\s+function/gi) ?? []).length >= 4 && /from\s+public/i.test(sql)],
    ["grant execute only to service_role", (lower.match(/grant\s+execute\s+on\s+function/gi) ?? []).length >= 4 && /to\s+service_role/i.test(sql)],
    ["table grants are read-only for service_role", /grant\s+select\s+on\s+table\s+(?:public\.|"public"\.)?"?customer_password_recovery"?\s+to\s+service_role/i.test(sql) && !/grant\s+(?:all|insert|update|delete)[^;]*on\s+table/i.test(sql)],
    ["postgrest reload", /notify\s+pgrst\s*,\s*'reload schema'/i.test(sql)],
  ];

  for (const name of FUNCTIONS) {
    checks.push([`function ${name}`, lower.includes(`function public.${name}`)]);
  }

  checks.push(["claim locks the row", /for\s+update/i.test(claimDef)]);

  const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failures.length > 0) {
    throw new Error(`preflight failed: ${failures.join(", ")}`);
  }
}

function sqlFile(sql) {
  const file = path.join(os.tmpdir(), `aka-recovery-${randomUUID()}.sql`);
  fs.writeFileSync(file, sql, "utf8");
  tempFiles.add(file);
  return file;
}

function cleanupTempFiles() {
  for (const file of tempFiles) {
    try {
      fs.unlinkSync(file);
    } catch {
      // Best-effort cleanup only.
    }
  }
  tempFiles.clear();
}

async function runSql(sql) {
  const file = sqlFile(sql);
  try {
    const { stdout } = await execAsync(command("npx", ["--yes", "supabase", "db", "query", "-f", `"${file}"`]), {
      cwd: ROOT,
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout;
  } finally {
    try {
      fs.unlinkSync(file);
      tempFiles.delete(file);
    } catch {
      // Best-effort cleanup only.
    }
  }
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
  const host = parsed.hostname.toLowerCase();
  if (!["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(host)) {
    throw new Error(`${label} must point to local Supabase, got ${parsed.origin}`);
  }
  return parsed.origin;
}

function makeToken() {
  const token = randomBytes(32).toString("hex");
  rawTokens.push(token);
  return { token, digest: createHash("sha256").update(token).digest("hex") };
}

async function test(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: "PASS", detail: detail ?? null });
    log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: "FAIL", error: error instanceof Error ? error.message : String(error) });
    log(`FAIL ${name}: ${results[results.length - 1].error}`);
  }
}

async function main() {
  preflight();
  log("PREFLIGHT PASS");
  if (PREFLIGHT) return;

  const status = localStatus();
  const apiUrl = requireLocalUrl(status.API_URL || status.SUPABASE_URL || "", "API_URL");
  const serviceKey = status.SERVICE_ROLE_KEY || status.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = status.ANON_KEY || status.SUPABASE_ANON_KEY;
  assert.ok(serviceKey, "local SERVICE_ROLE_KEY not found");
  assert.ok(anonKey, "local ANON_KEY not found");
  log(`TARGET ${apiUrl}`);

  const admin = createClient(apiUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const anon = createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  async function createQaUser(label, role, active) {
    const email = `stage0c-${label}-${randomUUID()}@example.test`;
    const password = `Qa0!${randomUUID()}`;
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

  async function issue(email, digest, expiresAt = new Date(Date.now() + TTL_MS)) {
    const { data, error } = await admin.rpc("issue_customer_password_recovery", {
      p_email: email,
      p_token_digest: digest,
      p_expires_at: expiresAt.toISOString(),
    });
    if (error) throw error;
    return data;
  }

  async function claim(digest, client = admin) {
    const { data, error } = await client.rpc("claim_customer_password_recovery", {
      p_token_digest: digest,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] ?? null : data ?? null;
  }

  async function finish(recoveryId, outcome, failureCode = null) {
    const { data, error } = await admin.rpc("finish_customer_password_recovery", {
      p_recovery_id: recoveryId,
      p_outcome: outcome,
      p_failure_code: failureCode,
    });
    if (error) throw error;
    return data === true;
  }

  async function failDelivery(recoveryId, failureCode = "smtp_550") {
    const { data, error } = await admin.rpc("fail_customer_password_recovery_delivery", {
      p_recovery_id: recoveryId,
      p_failure_code: failureCode,
    });
    if (error) throw error;
    return data === true;
  }

  async function row(id) {
    const { data, error } = await admin
      .from("customer_password_recovery")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function setActive(userId, active) {
    const { error } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
    if (error) throw error;
  }

  async function resetActive(userId) {
    await runSql(
      `update public.customer_password_recovery set state = 'expired', updated_at = pg_catalog.now() where user_id = '${userId}' and state in ('issued', 'claimed');`,
    );
  }

  async function ageIssued(userId, seconds = 120) {
    await runSql(
      `update public.customer_password_recovery set created_at = pg_catalog.now() - interval '${seconds} seconds' where user_id = '${userId}' and state = 'issued';`,
    );
  }

  const A = await createQaUser("customer-a", "customer", true);
  const B = await createQaUser("customer-b", "customer", true);
  const C = await createQaUser("admin-c", "admin", true);
  const D = await createQaUser("inactive-d", "customer", false);
  const E = await createQaUser("missing-profile-e", "customer", true);
  const F = await createQaUser("staff-f", "staff", true);
  {
    const { error } = await admin.from("profiles").delete().eq("id", E.id);
    if (error) throw error;
  }

  await test("issuance: active customer gets one issued row", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    const id = await issue(A.email, digest);
    assert.ok(id);
    const record = await row(id);
    assert.equal(record.state, "issued");
    assert.equal(record.user_id, A.id);
    assert.equal(record.token_digest, digest);
    assert.ok(new Date(record.expires_at).getTime() > Date.now());
  });

  await test("issuance: unknown email returns null", async () => {
    const { digest } = makeToken();
    assert.equal(await issue(`missing-${randomUUID()}@example.test`, digest), null);
  });

  await test("issuance: staff/admin identity is rejected", async () => {
    const { digest } = makeToken();
    assert.equal(await issue(C.email, digest), null);
  });

  await test("issuance: staff identity is rejected", async () => {
    const { digest } = makeToken();
    assert.equal(await issue(F.email, digest), null);
  });

  await test("issuance: duplicate auth identity is rejected upstream", async () => {
    const result = await admin.auth.admin.createUser({
      email: A.email,
      password: `Qa0!${randomUUID()}`,
      email_confirm: true,
    });
    if (result.data?.user) createdUserIds.push(result.data.user.id);
    assert.ok(result.error, "duplicate auth email unexpectedly accepted");
  });

  await test("issuance: inactive customer returns null", async () => {
    const { digest } = makeToken();
    assert.equal(await issue(D.email, digest), null);
  });

  await test("issuance: missing profile returns null", async () => {
    const { digest } = makeToken();
    assert.equal(await issue(E.email, digest), null);
  });

  await test("resend cooldown: immediate reissue is denied, then old token is invalidated", async () => {
    await resetActive(A.id);
    const first = makeToken();
    const second = makeToken();
    const firstId = await issue(A.email, first.digest);
    assert.ok(firstId);
    assert.equal(await issue(A.email, second.digest), null);
    assert.equal((await row(firstId)).state, "issued");
    await ageIssued(A.id);
    const secondId = await issue(A.email, second.digest);
    assert.ok(secondId);
    assert.equal((await row(firstId)).state, "expired");
    assert.equal(await claim(first.digest), null);
    assert.ok(await claim(second.digest));
  });

  await test("email collision: newer issuance expires older token and blocks reuse", async () => {
    await resetActive(A.id);
    const first = makeToken();
    const second = makeToken();
    const firstId = await issue(A.email, first.digest);
    await ageIssued(A.id);
    const secondId = await issue(A.email, second.digest);
    assert.ok(firstId && secondId);
    assert.equal((await row(firstId)).state, "expired");
    assert.equal((await row(secondId)).state, "issued");
    assert.equal(await claim(first.digest), null);
    assert.ok(await claim(second.digest));
  });

  await test("ambiguous delivery: timeout does not reopen or auto-invalidate", async () => {
    await resetActive(A.id);
    const timedOut = makeToken();
    const replacement = makeToken();
    const oldId = await issue(A.email, timedOut.digest);
    assert.equal(await issue(A.email, replacement.digest), null);
    assert.equal((await row(oldId)).state, "issued");
    await ageIssued(A.id);
    const newId = await issue(A.email, replacement.digest);
    assert.ok(newId);
    assert.equal((await row(oldId)).state, "expired");
    assert.equal(await claim(timedOut.digest), null);
    assert.ok(await claim(replacement.digest));
  });

  await test("definitive delivery failure: terminal failed row allows immediate resend", async () => {
    await resetActive(A.id);
    const failedToken = makeToken();
    const replacement = makeToken();
    const failedId = await issue(A.email, failedToken.digest);
    assert.equal(await failDelivery(failedId, "smtp_550"), true);
    const failedRow = await row(failedId);
    assert.equal(failedRow.state, "failed");
    assert.equal(failedRow.failure_code, "smtp_550");
    assert.equal(await claim(failedToken.digest), null);
    const replacementId = await issue(A.email, replacement.digest);
    assert.ok(replacementId);
    assert.ok(await claim(replacement.digest));
  });

  await test("delivery failure: valid claimed recovery is never overwritten", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    const id = await issue(A.email, digest);
    assert.ok(await claim(digest));
    assert.equal(await failDelivery(id, "late_smtp_error"), false);
    assert.equal((await row(id)).state, "claimed");
  });

  await test("digest collision: duplicate token_digest is rejected", async () => {
    await resetActive(A.id);
    await resetActive(B.id);
    const collision = makeToken();
    assert.ok(await issue(A.email, collision.digest));
    assert.equal(await issue(B.email, collision.digest), null);
  });

  await test("rollback: losing digest collision preserves its old token", async () => {
    await resetActive(A.id);
    await resetActive(B.id);
    const oldA = makeToken();
    const oldB = makeToken();
    const shared = makeToken();
    const oldAId = await issue(A.email, oldA.digest);
    await ageIssued(A.id);
    const oldBId = await issue(B.email, oldB.digest);
    await ageIssued(B.id);
    const [newAId, newBId] = await Promise.all([
      issue(A.email, shared.digest),
      issue(B.email, shared.digest),
    ]);
    assert.equal([newAId, newBId].filter(Boolean).length, 1);
    const oldStates = [(await row(oldAId)).state, (await row(oldBId)).state].sort();
    assert.deepEqual(oldStates, ["expired", "issued"]);
  });

  await test("expiry: expired token cannot be claimed", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    const id = await issue(A.email, digest, new Date(Date.now() + 60_000));
    assert.ok(id);
    await runSql(`update public.customer_password_recovery set expires_at = now() - interval '1 second' where id = '${id}';`);
    assert.equal(await claim(digest), null);
    assert.equal((await row(id)).state, "expired");
  });

  await test("replay: sequential second claim is rejected", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    await issue(A.email, digest);
    assert.ok(await claim(digest));
    assert.equal(await claim(digest), null);
  });

  await test("concurrency: 200 parallel claims produce exactly one winner", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    await issue(A.email, digest);
    const settled = await Promise.all(Array.from({ length: 200 }, () => claim(digest)));
    assert.equal(settled.filter(Boolean).length, 1);
  });

  await test("concurrency: separate requests produce one claimed row", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    await issue(A.email, digest);
    const settled = await Promise.all(Array.from({ length: 8 }, () => claim(digest)));
    assert.equal(settled.filter(Boolean).length, 1);
    const { data, error } = await admin
      .from("customer_password_recovery")
      .select("state")
      .eq("token_digest", digest)
      .single();
    if (error) throw error;
    assert.equal(data.state, "claimed");
  });

  await test("two different tokens: independent users claim independently", async () => {
    await resetActive(A.id);
    await resetActive(B.id);
    const a = makeToken();
    const b = makeToken();
    await issue(A.email, a.digest);
    await issue(B.email, b.digest);
    const [aClaim, bClaim] = await Promise.all([claim(a.digest), claim(b.digest)]);
    assert.equal(aClaim.user_id, A.id);
    assert.equal(bClaim.user_id, B.id);
  });

  await test("stale claimed: new issuance expires stale claim", async () => {
    await resetActive(A.id);
    const oldToken = makeToken();
    const newToken = makeToken();
    const oldId = await issue(A.email, oldToken.digest);
    assert.ok(await claim(oldToken.digest));
    await runSql(`update public.customer_password_recovery set claimed_at = now() - interval '31 minutes' where id = '${oldId}';`);
    const newId = await issue(A.email, newToken.digest);
    assert.ok(newId);
    assert.equal((await row(oldId)).state, "expired");
    assert.equal((await row(newId)).state, "issued");
    assert.ok(await claim(newToken.digest));
  });

  await test("account change: inactive profile cannot claim", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    await issue(A.email, digest);
    await setActive(A.id, false);
    assert.equal(await claim(digest), null);
    await setActive(A.id, true);
  });

  await test("restart: a fresh client can claim persisted state", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    await issue(A.email, digest);
    const fresh = createClient(apiUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    assert.ok(await claim(digest, fresh));
  });

  await test("finish: consumed and failed transitions are one-way", async () => {
    await resetActive(A.id);
    const consumed = makeToken();
    const consumedId = await issue(A.email, consumed.digest);
    await claim(consumed.digest);
    assert.equal(await finish(consumedId, "consumed"), true);
    assert.equal((await row(consumedId)).state, "consumed");
    assert.equal(await finish(consumedId, "consumed"), false);

    const failed = makeToken();
    const failedId = await issue(A.email, failed.digest);
    await claim(failed.digest);
    assert.equal(await finish(failedId, "failed", "provider_timeout"), true);
    const failedRow = await row(failedId);
    assert.equal(failedRow.state, "failed");
    assert.equal(failedRow.failure_code, "provider_timeout");
  });

  await test("finish: profile status change after claim does not block terminal recording", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    const id = await issue(A.email, digest);
    assert.ok(await claim(digest));
    await setActive(A.id, false);
    assert.equal(await finish(id, "consumed"), true);
    assert.equal((await row(id)).state, "consumed");
    await setActive(A.id, true);
  });

  await test("finish: invalid outcome or missing failure code leaves claimed intact", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    const id = await issue(A.email, digest);
    assert.ok(await claim(digest));
    assert.equal(await finish(id, "bogus"), false);
    assert.equal(await finish(id, "failed", ""), false);
    assert.equal((await row(id)).state, "claimed");
  });

  await test("finish: stale claimed cannot be completed", async () => {
    await resetActive(A.id);
    const { digest } = makeToken();
    const id = await issue(A.email, digest);
    assert.ok(await claim(digest));
    await runSql(`update public.customer_password_recovery set claimed_at = now() - interval '31 minutes' where id = '${id}';`);
    assert.equal(await finish(id, "consumed"), false);
    assert.equal((await row(id)).state, "expired");
  });

  await test("old and new token: only the newest token can win", async () => {
    await resetActive(A.id);
    const oldToken = makeToken();
    const newToken = makeToken();
    await issue(A.email, oldToken.digest);
    await ageIssued(A.id);
    await issue(A.email, newToken.digest);
    const [oldClaim, newClaim] = await Promise.all([claim(oldToken.digest), claim(newToken.digest)]);
    assert.equal(oldClaim, null);
    assert.ok(newClaim);
  });

  await test("permissions: anon and authenticated cannot call RPCs or read the table", async () => {
    const { digest } = makeToken();
    const anonRpc = await anon.rpc("claim_customer_password_recovery", { p_token_digest: digest });
    assert.ok(anonRpc.error, "anon claim unexpectedly succeeded");
    const anonFail = await anon.rpc("fail_customer_password_recovery_delivery", {
      p_recovery_id: randomUUID(),
      p_failure_code: "smtp_550",
    });
    assert.ok(anonFail.error, "anon delivery failure unexpectedly succeeded");
    const anonRead = await anon.from("customer_password_recovery").select("*").limit(1);
    assert.ok(anonRead.error, "anon table read unexpectedly succeeded");

    const auth = createClient(apiUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const signIn = await auth.auth.signInWithPassword({ email: B.email, password: B.password });
    assert.ifError(signIn.error);
    const authRpc = await auth.rpc("claim_customer_password_recovery", { p_token_digest: digest });
    assert.ok(authRpc.error, "authenticated claim unexpectedly succeeded");
    const authFail = await auth.rpc("fail_customer_password_recovery_delivery", {
      p_recovery_id: randomUUID(),
      p_failure_code: "smtp_550",
    });
    assert.ok(authFail.error, "authenticated delivery failure unexpectedly succeeded");
    const authRead = await auth.from("customer_password_recovery").select("*").limit(1);
    assert.ok(authRead.error, "authenticated table read unexpectedly succeeded");
  });

  await test("storage: no raw token or password column, and no raw token rows", async () => {
    const { data, error } = await admin.from("customer_password_recovery").select("*");
    if (error) throw error;
    for (const record of data) {
      const keys = Object.keys(record).map((key) => key.toLowerCase());
      assert.equal(keys.includes("token"), false);
      assert.equal(keys.includes("raw_token"), false);
      assert.equal(keys.includes("password"), false);
    }
    const serialized = JSON.stringify(data);
    for (const token of rawTokens) {
      assert.equal(serialized.includes(token), false, "raw token found in recovery table");
    }
  });
}

main()
  .catch((error) => {
    results.push({ name: "fatal", status: "FAIL", error: error instanceof Error ? error.message : String(error) });
    log(`FATAL ${results[results.length - 1].error}`);
  })
  .finally(async () => {
    if (!PREFLIGHT) {
      try {
        const status = localStatus();
        const apiUrl = status.API_URL || status.SUPABASE_URL;
        const serviceKey = status.SERVICE_ROLE_KEY || status.SUPABASE_SERVICE_ROLE_KEY;
        if (apiUrl && serviceKey) {
          const admin = createClient(apiUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          });
          for (const id of createdUserIds) {
            await admin.auth.admin.deleteUser(id).catch(() => {});
          }
        }
      } catch {
        // Cleanup is best-effort; the local database is disposable.
      }
    }
    cleanupTempFiles();
    const passed = results.filter((result) => result.status === "PASS").length;
    const failed = results.filter((result) => result.status === "FAIL").length;
    log(`SUMMARY ${passed} passed, ${failed} failed, ${results.length} total`);
    if (failed > 0) process.exitCode = 1;
  });
