/* eslint-disable @typescript-eslint/no-require-imports -- Actual auth policy/routes; Auth and request boundaries use synthetic fixtures only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const qa = require('./verify-auth-cookie-refresh.cjs');
const report = { cases: [], assertions: 0, failures: [] };
const eq = (a, b, label) => { assert.deepEqual(a, b, label); report.assertions++; };
async function test(name, run) {
  try { await run(); report.cases.push({ name, result: 'PASS' }); console.log('PASS', name); }
  catch (error) { report.cases.push({ name, result: 'FAIL' }); report.failures.push({ name, error: error.message }); console.error('FAIL', name, error.stack); }
}
async function cookieTests() {
  const policy = qa.loader().call(null, 'lib/auth-cookie-policy.ts');
  const base = qa.COOKIE;
  const token = { name: base, value: 'synthetic', options: { path: '/', sameSite: 'lax', maxAge: 34560000, expires: new Date('2030-01-01'), secure: true } };
  await test('Unchecked/default strips SDK Max-Age and Expires on login/refresh', () => {
    for (const current of [[], [{ name: policy.REMEMBER_COOKIE, value: 'session' }]]) {
      const output = policy.applyAuthCookiePolicy([token], current, qa.PROJECT);
      const cookie = output.find(c => c.name === base);
      eq(Object.hasOwn(cookie.options, 'maxAge'), false, 'No Max-Age');
      eq(Object.hasOwn(cookie.options, 'expires'), false, 'No Expires');
      eq(cookie.options.secure, true, 'Other SDK attributes retained');
      eq(output.find(c => c.name === policy.REMEMBER_COOKIE).value, 'session', 'Shared mode explicit');
    }
  });
  await test('Checked cookies and preference roll for 30 days including chunks', () => {
    const current = [{ name: policy.REMEMBER_COOKIE, value: '30d' }];
    const output = policy.applyAuthCookiePolicy([token, { ...token, name: base + '.0' }, { ...token, name: base + '.1' }], current, qa.PROJECT);
    eq(output.length, 4, 'Session chunks plus preference');
    for (const cookie of output) { eq(cookie.options.maxAge, 2592000, '30 days'); eq(Object.hasOwn(cookie.options, 'expires'), false, 'No stale SDK expiry'); }
  });
  await test('Rolling renewal reissues unchanged surviving chunks omitted by SDK', () => {
    const output = policy.applyAuthCookiePolicy([{ ...token, name: base + '.0' }], [
      { name: policy.REMEMBER_COOKIE, value: '30d' }, { name: base + '.0', value: 'old' }, { name: base + '.1', value: 'unchanged-tail' },
    ], qa.PROJECT);
    eq(output.some(cookie => cookie.name === base + '.1' && cookie.value === 'unchanged-tail' && cookie.options.maxAge === 2592000), true, 'Unchanged chunk also rolls');
    const deleted = policy.applyAuthCookiePolicy([{ ...token, name: base + '.0' }, { name: base + '.1', value: '', options: { path: '/', maxAge: 0 } }], [{ name: base + '.1', value: 'old-tail' }], qa.PROJECT);
    eq(deleted.filter(cookie => cookie.name === base + '.1').length, 1, 'Deleted chunk is not resurrected');
    eq(deleted.find(cookie => cookie.name === base + '.1').options.maxAge, 0, 'Deletion wins');
    const earlierDeletion = policy.applyAuthCookiePolicy([{ ...token, name: base + '.0' }], [{ name: base, value: '' }, { name: base + '.1', value: 'live-tail' }], qa.PROJECT);
    eq(earlierDeletion.some(cookie => cookie.name === base), false, 'Empty cookie from an earlier deletion is not reissued');
  });
  await test('Chunk cleanup preserves deletion and does not clear active preference', () => {
    const deletion = { name: base, value: '', options: { path: '/', maxAge: 0 } };
    const output = policy.applyAuthCookiePolicy([deletion, { ...token, name: base + '.0' }], [{ name: policy.REMEMBER_COOKIE, value: '30d' }], qa.PROJECT);
    eq(output[0].options.maxAge, 0, 'Deletion remains zero');
    eq(output.at(-1).value, '30d', 'Chunked session still remembered');
  });
  await test('Logout deletes session chunks and Remember preference', () => {
    const changes = [base, base + '.0', base + '.1'].map(name => ({ name, value: '', options: { path: '/', maxAge: 0 } }));
    const output = policy.applyAuthCookiePolicy(changes, [{ name: policy.REMEMBER_COOKIE, value: '30d' }], qa.PROJECT);
    eq(output.every(c => c.options.maxAge === 0), true, 'Every cookie is deletion');
    eq(output.at(-1).name, policy.REMEMBER_COOKIE, 'Preference cleared');
  });
  await test('Non-session/PKCE cookies are not mistaken for auth chunks', () => {
    for (const name of [base + '-code-verifier', base + '.oops', 'unrelated']) {
      const output = policy.applyAuthCookiePolicy([{ ...token, name }], [], qa.PROJECT);
      eq(output.length, 1, 'No preference mutation'); eq(output[0].options.maxAge, 34560000, 'Unrelated cookie unchanged');
    }
  });
}
async function browserTests() {
  await test('Real browser SDK: checked/unchecked login, failed login, refresh, singleton and logout', async () => {
    const sdk = require('@supabase/ssr');
    const { parseSetCookie } = require('next/dist/compiled/@edge-runtime/cookies');
    const jar = new Map();
    const attributes = new Map();
    const document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {},
      get cookie() { return [...jar].map(([name, value]) => name + '=' + encodeURIComponent(value)).join('; '); },
      set cookie(field) { const cookie = parseSetCookie(field); const row = qa.auditSetCookieFields([field], qa.PROJECT)[0]; attributes.set(cookie.name, row); if (row.mutation === 'delete') jar.delete(cookie.name); else jar.set(cookie.name, cookie.value); },
    };
    const previous = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch };
    globalThis.document = document;
    globalThis.window = { document, location: new URL(qa.PROJECT + '/admin/login'), addEventListener() {}, removeEventListener() {} };
    const transport = qa.makeTransport([]);
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      if (url.origin === qa.PROJECT && url.searchParams.get('grant_type') === 'password') {
        const failed = JSON.parse(init.body).password === 'synthetic-wrong';
        return new Response(JSON.stringify(failed ? { code: 'invalid_credentials', message: 'Synthetic rejection' } : qa.session('login')), { status: failed ? 400 : 200, headers: { 'content-type': 'application/json', 'x-supabase-api-version': '2024-01-01' } });
      }
      return transport(input, init);
    };
    let client;
    try {
      const load = qa.loader(new Map([['@supabase/ssr', { ...sdk, createBrowserClient(url, key, options) {
        return sdk.createBrowserClient(url, key, { ...options, auth: { autoRefreshToken: false, detectSessionInUrl: false } });
      } }]]));
      const browser = load('utils/supabase/client.ts');
      const result = await browser.signInAdmin('fixture@example.invalid', 'synthetic-correct', true);
      eq(result.error, null, 'Checked login succeeds');
      client = browser.createClient();
      eq(browser.createClient() === client, true, 'Browser client remains singleton');
      eq(attributes.get(qa.COOKIE).maxAge, 2592000, 'Checked final cookie overrides SDK maxAge');
      eq(jar.get('aka-auth-remember'), '30d', 'Preference committed after success');
      const failed = await browser.signInAdmin('fixture@example.invalid', 'synthetic-wrong', false);
      eq(!!failed.error, true, 'Credentials rejected');
      eq(jar.get('aka-auth-remember'), '30d', 'Failed login does not change preference');
      await client.auth.refreshSession();
      eq(attributes.get(qa.COOKIE).maxAge, 2592000, 'Customer/Admin refresh retains shared checked mode');
      await browser.signInAdmin('fixture@example.invalid', 'synthetic-correct', false);
      eq(attributes.get(qa.COOKIE).maxAge, null, 'Unchecked final cookie has no Max-Age');
      eq(attributes.get(qa.COOKIE).expires, null, 'Unchecked final cookie has no Expires');
      await client.auth.refreshSession();
      eq(attributes.get(qa.COOKIE).maxAge, null, 'Unchecked refresh remains session cookie');
      await client.auth.signOut({ scope: 'local' });
      eq(jar.has(qa.COOKIE), false, 'Logout clears tokens');
      eq(jar.has('aka-auth-remember'), false, 'Logout clears preference');
    } finally {
      client?.auth.stopAutoRefresh(); client?.auth.broadcastChannel?.close();
      globalThis.document = previous.document; globalThis.window = previous.window; globalThis.fetch = previous.fetch;
    }
  });
}
async function nativeChunkTest() {
  await test('Actual server SDK renews metadata chunks even when SDK filters unchanged bytes', async () => {
    const sdk = require('@supabase/ssr');
    const oldChunks = sdk.createChunks(qa.COOKIE, qa.encode(qa.session('aaaa', { large: true })));
    const next = qa.session('bbbb', { large: true });
    const newChunks = sdk.createChunks(qa.COOKIE, qa.encode(next));
    eq(oldChunks[1].value === newChunks[1].value, true, 'Fixture has an unchanged metadata chunk');
    const jar = new Map([...oldChunks.map(c => [c.name, c.value]), ['aka-auth-remember', '30d']]);
    const writes = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async input => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      assert.equal(url.origin, qa.PROJECT, 'Synthetic only');
      return new Response(JSON.stringify(url.pathname === '/auth/v1/token' ? next : qa.user), { headers: { 'content-type': 'application/json', 'x-supabase-api-version': '2024-01-01' } });
    };
    try {
      const client = qa.loader()('utils/supabase/server.ts').createClient({ getAll: () => [...jar].map(([name, value]) => ({ name, value })), set(name, value, options) { writes.push({ name, options }); if (options.maxAge === 0) jar.delete(name); else jar.set(name, value); } }, new Headers());
      await client.auth.refreshSession();
      eq(writes.some(c => c.name === qa.COOKIE + '.1' && c.options.maxAge === 2592000), true, 'Unchanged chunk renewed through real SDK adapter');
    } finally { globalThis.fetch = originalFetch; }
  });
}
async function loginUiTest() {
  await test('Actual Admin login component defaults Remember Me unchecked and exposes recovery link', () => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const load = qa.loader(new Map([['next/navigation', { useRouter: () => ({ push() {}, refresh() {} }) }]]));
    const component = load('app/admin/login/LoginClient.tsx').default;
    const html = require('next/dist/compiled/node-html-parser').parse(renderToStaticMarkup(React.createElement(component)));
    eq(html.querySelector('input[type="checkbox"]').hasAttribute('checked'), false, 'Checkbox default unchecked');
    eq(!!html.querySelector('a[href="/admin/forgot-password"]'), true, 'Recovery link exists');
  });
}
function authFixture(options = {}) {
  const userId = options.userId || '00000000-0000-4000-8000-000000000001';
  const sessionId = options.sessionId || '00000000-0000-4000-8000-000000000002';
  const calls = [];
  const usedTokens = new Set();
  const token = 'synthetic.' + Buffer.from(JSON.stringify({ sub: userId, session_id: sessionId })).toString('base64url') + '.signature';
  const client = {
    auth: {
      getUser: async () => ({ data: { user: options.noUser ? null : { id: userId } }, error: null }),
      getSession: async () => ({ data: { session: { access_token: token } }, error: null }),
      resetPasswordForEmail: async (_email, args) => { calls.push(['request', args.redirectTo]); return { error: options.requestError ? { code: 'over_email_send_rate_limit' } : null }; },
      verifyOtp: async args => { calls.push(['verify', args.type]); const invalid = options.invalidToken || usedTokens.has(args.token_hash); usedTokens.add(args.token_hash); return { data: {}, error: invalid ? { code: 'otp_expired' } : null }; },
      updateUser: async () => { calls.push(['password']); return { error: options.updateError ? typeof options.updateError === 'object' ? options.updateError : { name: 'AuthApiError', code: 'weak_password', status: 422 } : null }; },
      signOut: async args => { calls.push(['logout', args.scope]); return { error: options.logoutError ? { code: 'synthetic_failure' } : null }; },
      admin: { signOut: async (_token, scope) => { calls.push(['logout', scope]); return { error: options.logoutError ? { code: 'synthetic_failure', status: 403 } : null }; } },
    },
    from() { return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { id: userId, role: options.role || 'admin', is_active: !options.inactive }, error: null }) }; },
  };
  return { client, userId, sessionId, calls };
}
async function recoveryTests() {
  const state = qa.loader(new Map([['server-only', {}]]))('lib/admin-password-recovery.ts');
  await test('Recovery context binds active CMS user and session; login alone is rejected', async () => {
    const actor = authFixture();
    eq(await state.validateRecoveryContext(actor.client, undefined), null, 'Ordinary login has no context');
    const nonce = state.issueRecoveryContext({ userId: actor.userId, sessionId: actor.sessionId });
    eq(!!await state.validateRecoveryContext(actor.client, nonce), true, 'Valid recovery accepted');
    eq(await state.validateRecoveryContext(authFixture({ sessionId: '00000000-0000-4000-8000-000000000003' }).client, nonce), null, 'Session switch rejected');
    eq(await state.validateRecoveryContext(authFixture({ userId: '00000000-0000-4000-8000-000000000004' }).client, nonce), null, 'User switch rejected');
    eq(await state.validateRecoveryContext(authFixture({ inactive: true }).client, nonce), null, 'Inactive CMS rejected');
    eq(await state.validateRecoveryContext(authFixture({ role: 'customer' }).client, nonce), null, 'Customer rejected');
    state.destroyRecoveryContext(nonce);
  });
  await test('Recovery context has expiry and atomic single-use claim', async () => {
    const actor = authFixture();
    const nonce = state.issueRecoveryContext(actor);
    eq(!!state.claimRecoveryContext(nonce), true, 'First claim works');
    eq(state.claimRecoveryContext(nonce), null, 'Concurrent/replay claim denied');
    state.destroyRecoveryContext(nonce);
    eq(await state.validateRecoveryContext(actor.client, nonce), null, 'Consumed context denied');
    const expired = state.issueRecoveryContext(actor);
    const now = Date.now;
    try { Date.now = () => now() + 11 * 60_000; eq(await state.validateRecoveryContext(actor.client, expired), null, 'Expired context denied'); }
    finally { Date.now = now; }
  });
}
function routeHarness(options = {}) {
  const actor = authFixture(options);
  const jar = new Map([[qa.COOKIE, 'synthetic-session'], ['aka-auth-remember', '30d']]);
  const cookieStore = {
    get: name => jar.has(name) ? { name, value: jar.get(name) } : undefined,
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set(name, value, opts) { if (opts?.maxAge === 0) jar.delete(name); else jar.set(name, value); },
  };
  const load = qa.loader(new Map([
    ['server-only', {}], ['next/headers', { cookies: async () => cookieStore }],
    ['@/utils/supabase/server', { createClient: () => actor.client }],
    ['@/lib/rate-limit', { checkRateLimit: () => ({ allowed: !options.limited }) }],
  ]));
  const state = load('lib/admin-password-recovery.ts');
  function issue() { const nonce = state.issueRecoveryContext(actor); jar.set(state.RECOVERY_COOKIE, nonce); return nonce; }
  function request(route, body, origin = qa.PROJECT) {
    return new Request(qa.PROJECT + route, { method: body === undefined ? 'GET' : 'POST', headers: { origin, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  return { ...actor, jar, load, state, issue, request };
}
async function routeTests() {
  const forgot = 'app/api/admin/auth/forgot-password/route.ts';
  const callback = 'app/auth/recovery/route.ts';
  const reset = 'app/api/admin/auth/reset-password/route.ts';
  await test('Forgot request is neutral for accepted and provider-rejected email', async () => {
    const results = [];
    for (const options of [{}, { requestError: true }]) {
      const h = routeHarness(options);
      const response = await h.load(forgot).POST(h.request('/api/admin/auth/forgot-password', { email: 'staff@example.invalid' }));
      eq(response.status, 202, 'Neutral accepted status'); results.push(await response.json());
      eq(h.calls[0], ['request', qa.PROJECT + '/auth/recovery'], 'Fixed canonical callback');
      eq(response.headers.get('cache-control').includes('no-store'), true, 'No cache');
    }
    eq(results[0], results[1], 'No account/provider disclosure');
  });
  await test('Forgot validation, same-origin and rate-limit handling', async () => {
    const h = routeHarness();
    eq((await h.load(forgot).POST(h.request('/api/admin/auth/forgot-password', { email: 'bad' }))).status, 400, 'Email validation');
    eq((await h.load(forgot).POST(h.request('/api/admin/auth/forgot-password', { email: 'staff@example.invalid' }, 'https://evil.invalid'))).status, 403, 'Cross-origin denied');
    const limited = routeHarness({ limited: true });
    const response = await limited.load(forgot).POST(limited.request('/api/admin/auth/forgot-password', { email: 'staff@example.invalid' }));
    eq(response.status, 429, 'IP throttle'); eq(response.headers.get('retry-after'), '60', 'Cooldown advertised');
  });
  await test('Recovery callback issues bound context and scrubs token URL; replay denied', async () => {
    const h = routeHarness();
    const request = h.request('/auth/recovery?token_hash=' + 'a'.repeat(64) + '&type=recovery');
    const first = await h.load(callback).GET(request);
    eq(first.headers.get('location'), qa.PROJECT + '/admin/reset-password', 'Clean fixed destination');
    const nonce = h.jar.get(h.state.RECOVERY_COOKIE);
    eq(!!await h.state.validateRecoveryContext(h.client, nonce), true, 'Valid bound context');
    const replay = await h.load(callback).GET(request);
    eq(replay.headers.get('location').includes('/admin/forgot-password?error=recovery_invalid'), true, 'Token replay rejected');
  });
  await test('Invalid/expired token, wrong type, destination and inactive CMS are rejected', async () => {
    for (const [options, suffix] of [
      [{ invalidToken: true }, '&type=recovery'], [{}, '&type=signup'], [{}, '&type=recovery&next=https://evil.invalid'], [{ inactive: true }, '&type=recovery'], [{ role: 'customer' }, '&type=recovery'],
    ]) {
      const h = routeHarness(options);
      const response = await h.load(callback).GET(h.request('/auth/recovery?token_hash=' + 'b'.repeat(64) + suffix));
      eq(response.headers.get('location').includes('/admin/forgot-password?error=recovery_invalid'), true, 'Invalid recovery denied');
      eq(h.jar.has(h.state.RECOVERY_COOKIE), false, 'No recovery grant');
    }
  });
  await test('Ordinary login cannot update password; inactive CMS cannot use a prior context', async () => {
    for (const options of [{}, { inactive: true }]) {
      const h = routeHarness(options);
      if (options.inactive) h.issue();
      const response = await h.load(reset).POST(h.request('/api/admin/auth/reset-password', { password: 'Synthetic-test-only-42', confirmPassword: 'Synthetic-test-only-42' }));
      eq(response.status, 403, 'Context/CMS required'); eq(h.calls.length, 0, 'No password mutation');
    }
  });
  await test('Password update uses global logout, destroys context and clears local preferences', async () => {
    const h = routeHarness(); const nonce = h.issue();
    const response = await h.load(reset).POST(h.request('/api/admin/auth/reset-password', { password: 'Synthetic-test-only-42', confirmPassword: 'Synthetic-test-only-42' }));
    eq(response.status, 200, 'Success'); eq(h.calls, [['password'], ['logout', 'global']], 'Update before global signout');
    eq((await response.json()).passwordUpdated, true, 'Password result explicit');
    eq(h.jar.size, 0, 'Local auth/preference/context cookies cleared');
    eq(await h.state.validateRecoveryContext(h.client, nonce), null, 'Replay denied after update');
  });
  await test('Password validation/provider failure has no false success; logout failure is partial', async () => {
    const bad = routeHarness(); bad.issue();
    eq((await bad.load(reset).POST(bad.request('/api/admin/auth/reset-password', { password: 'short', confirmPassword: 'short' }))).status, 400, 'Password validation');
    eq(bad.calls.length, 0, 'No mutation on invalid input');
    const rejected = routeHarness({ updateError: true }); const nonce = rejected.issue();
    const failed = await rejected.load(reset).POST(rejected.request('/api/admin/auth/reset-password', { password: 'Synthetic-test-only-42', confirmPassword: 'Synthetic-test-only-42' }));
    eq((await failed.json()).success, false, 'Update failure honest'); eq(rejected.calls, [['password']], 'No logout on rejected update');
    eq(!!await rejected.state.validateRecoveryContext(rejected.client, nonce), true, 'Definitive rejection allows retry');
    const partial = routeHarness({ logoutError: true }); partial.issue();
    const response = await partial.load(reset).POST(partial.request('/api/admin/auth/reset-password', { password: 'Synthetic-test-only-42', confirmPassword: 'Synthetic-test-only-42' }));
    const body = await response.json();
    eq(response.status, 502, 'Partial status'); eq(body.passwordUpdated, true, 'Password did change'); eq(body.signedOut, false, 'Global logout not falsely claimed');
    eq(partial.jar.size, 0, 'Local cleanup despite remote logout failure');
  });
  await test('Returned retryable password error is indeterminate and consumes the context', async () => {
    const h = routeHarness({ updateError: { name: 'AuthRetryableFetchError', status: 504 } });
    const nonce = h.issue();
    const response = await h.load(reset).POST(h.request('/api/admin/auth/reset-password', { password: 'Synthetic-test-only-42', confirmPassword: 'Synthetic-test-only-42' }));
    const body = await response.json();
    eq(body.passwordUpdated, null, 'No claim that uncertain update failed');
    eq(body.needsNewLink, true, 'New recovery required');
    eq(h.jar.size, 0, 'Uncertain context/session/preferences cleared');
    eq(await h.state.validateRecoveryContext(h.client, nonce), null, 'Context not reusable');
  });
}
async function main() {
  process.env.NEXT_PUBLIC_SITE_URL = qa.PROJECT;
  process.env.NEXT_PUBLIC_SUPABASE_URL = qa.PROJECT;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-key';
  try { await cookieTests(); await browserTests(); await nativeChunkTest(); await loginUiTest(); await recoveryTests(); await routeTests(); }
  catch (error) { report.failures.push({ name: 'setup', error: error.message }); console.error(error.stack); }
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'aka-admin-auth-'));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${report.failures.length ? 'RED' : 'GREEN'}: ${report.cases.length} cases; ${report.assertions} assertions; ${report.failures.length} failures. EVIDENCE ${output}`);
  if (report.failures.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
