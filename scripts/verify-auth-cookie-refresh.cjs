/* eslint-disable @typescript-eslint/no-require-imports -- Actual auth modules and SDK; only backend transport/framework context are fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');
const sdk = require('@supabase/ssr');
const root = path.resolve(__dirname, '..');
const PROJECT = 'https://boundary-build.invalid';
const COOKIE = 'sb-boundary-build-auth-token';
const CACHE = { 'cache-control': 'private, no-cache, no-store, must-revalidate, max-age=0', expires: '0', pragma: 'no-cache' };
const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

// Local loader replaces the unrelated, retired Store SEO verifier dependency.
function loader(mocks = new Map()) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const entry = new Module(filename);
    entry.filename = filename;
    entry.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, entry);
    const native = entry.require.bind(entry);
    entry.require = name => {
      if (mocks.has(name)) return mocks.get(name);
      if (name.startsWith('@/') || name.startsWith('.')) {
        const target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
        if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
        return load(target + (fs.existsSync(target + '.ts') ? '.ts' : '.tsx'));
      }
      return native(name);
    };
    entry._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return entry.exports;
  }
  return load;
}
function jwt(label, expires) {
  const text = [{ alg: 'HS256', typ: 'JWT' }, { sub: user.id, session_id: '00000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', iat: Math.floor(Date.now() / 1000) - 7200, exp: expires, qa: label }]
    .map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return text + '.' + crypto.createHmac('sha256', 'synthetic-test-material-only').update(text).digest('base64url');
}
function session(label, { expired = false, proactive = false, large = false } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return { access_token: jwt(label, now + (expired ? -3600 : proactive ? 30 : 3600)), refresh_token: 'fixture:' + label, token_type: 'bearer', expires_in: 3600,
    expires_at: now + (expired ? -3600 : proactive ? 30 : 3600), user: { ...user, user_metadata: large ? { padding: 'x'.repeat(4000) } : {} } };
}
const encode = value => 'base64-' + Buffer.from(JSON.stringify(value)).toString('base64url');
function seeded(mode) {
  if (mode === 'missing') return [];
  if (mode === 'corrupt') return [{ name: COOKIE, value: 'base64-eA' }];
  if (mode === 'invalid') return [{ name: COOKIE, value: encode({ invalid: true }) }];
  return sdk.createChunks(COOKIE, encode(session(mode, { expired: !['fresh', 'proactive'].includes(mode), proactive: mode === 'proactive', large: ['shrink', 'multi'].includes(mode) })));
}
function marker(cookies) {
  try {
    const value = cookies.find(c => c.name === COOKIE)?.value || cookies.filter(c => c.name.startsWith(COOKIE + '.'))
      .sort((a, b) => Number(a.name.split('.').at(-1)) - Number(b.name.split('.').at(-1))).map(c => c.value).join('');
    const data = JSON.parse(Buffer.from(value.replace(/^base64-/, ''), 'base64url').toString());
    return labelOfToken(data.access_token);
  } catch { return null; }
}
function labelOfToken(value) {
  try { return JSON.parse(Buffer.from(value.replace(/^Bearer /i, '').split('.')[1], 'base64url').toString()).qa; }
  catch { return null; }
}
function makeTransport(trace, advanceClock = () => {}) {
  return async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url || String(input));
    const method = init.method || input?.method || 'GET';
    const label = labelOfToken(new Headers(init.headers || input?.headers).get('authorization') || '');
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-supabase-api-version': '2024-01-01' } });
    if (url.origin === 'https://mika-fixture.invalid' && method === 'GET') {
      trace.push({ kind: 'mika', method, path: url.pathname });
      return json({ success: true, data: require('./verify-aka-careers.cjs').aka(42), related_jobs: [] });
    }
    if (url.origin !== PROJECT || !url.pathname.startsWith('/auth/v1/')) throw Error('Non-fixture backend denied');
    trace.push({ kind: 'auth', method, path: url.pathname, fixtureMarker: label });
    if (url.pathname === '/auth/v1/token' && method === 'POST') {
      const body = JSON.parse(init.body), grant = url.searchParams.get('grant_type');
      if (grant === 'pkce') return json(session('callback-B'));
      assert.equal(grant, 'refresh_token');
      const mode = String(body.refresh_token).replace(/^fixture:/, '');
      if (['rejected', 'proactive'].includes(mode)) return json({ code: 'refresh_token_not_found', message: 'Synthetic rejection' }, 400);
      if (mode === 'retryable') { advanceClock(); return json({ message: 'Synthetic retryable failure' }, 503); }
      return json(session('rotated-' + mode, { large: mode === 'grow' }));
    }
    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      if (label === 'rotated-multi') return json({ code: 'session_not_found', message: 'Synthetic session missing after refresh' }, 401);
      return json(user);
    }
    if (url.pathname === '/auth/v1/logout' && method === 'POST') return json({});
    throw Error('Unexpected synthetic Auth operation');
  };
}
function auditSetCookieFields(fields, responseUrl) {
  const { parseSetCookie } = require('next/dist/compiled/@edge-runtime/cookies');
  const url = new URL(responseUrl);
  const defaultPath = url.pathname.lastIndexOf('/') > 0 ? url.pathname.slice(0, url.pathname.lastIndexOf('/')) : '/';
  return fields.map((raw, index) => {
    const parts = raw.split(';');
    const attrs = Object.fromEntries(parts.slice(1).map(part => { const i = part.indexOf('='); return i < 0 ? [part.trim().toLowerCase(), ''] : [part.slice(0, i).trim().toLowerCase(), part.slice(i + 1).trim()]; }));
    const cookie = parseSetCookie(raw);
    assert.ok(cookie, 'Invalid Set-Cookie field');
    const domain = (cookie.domain || url.hostname).replace(/^\./, '').toLowerCase();
    const cookiePath = cookie.path?.startsWith('/') ? cookie.path : defaultPath;
    const maxAge = /^-?\d+$/.test(attrs['max-age'] ?? '') ? Number(attrs['max-age']) : null;
    const expires = cookie.expires?.toISOString() ?? null;
    return { index, name: cookie.name, identity: JSON.stringify([cookie.name, domain, cookiePath]), hostOnly: !cookie.domain, path: cookiePath,
      maxAge, expires, secure: cookie.secure ?? false, httpOnly: cookie.httpOnly ?? false, sameSite: cookie.sameSite ?? null,
      mutation: (maxAge !== null ? maxAge <= 0 : expires !== null && Date.parse(expires) <= Date.now()) ? 'delete' : 'set' };
  });
}
function assertUniqueCookieIdentities(rows) {
  assert.equal(new Set(rows.map(row => row.identity)).size, rows.length, 'No duplicate raw Set-Cookie storage identity');
}
function identitySelfCheck(eq) {
  const url = 'https://app.boundary-build.invalid/auth/callback';
  const scopes = auditSetCookieFields(['qa=a; Path=/', 'qa=b; Path=/auth', 'qa=c; Domain=boundary-build.invalid; Path=/'], url);
  assertUniqueCookieIdentities(scopes);
  assert.throws(() => assertUniqueCookieIdentities(auditSetCookieFields(['qa=a; Path=/', 'qa=b; Path=/'], url)), assert.AssertionError);
  const flags = auditSetCookieFields(['qa=; Path=/; Max-Age=60', 'qb=nonempty; Path=/; Max-Age=0', 'qc=x; Max-Age=60; Expires=Thu, 01 Jan 1970 00:00:00 GMT', 'qd=x; Expires=Thu, 01 Jan 1970 00:00:00 GMT'], url);
  eq(flags.map(v => v.mutation), ['set', 'delete', 'set', 'delete'], 'Max-Age takes precedence over Expires/empty value');
  eq(flags[2].path, '/auth', 'RFC default path');
  eq(scopes[0].hostOnly, true, 'Host-only recorded separately');
  eq(JSON.stringify(scopes).includes('"value"'), false, 'Reports contain no cookie value');
}
const cases = [
  { name: 'fresh control', mode: 'fresh' }, { name: 'expired refresh', mode: 'expired' }, { name: 'missing session', mode: 'missing' },
  ...Object.keys(CACHE).map(headerFirst => ({ name: 'SDK header ' + headerFirst, mode: 'expired', headerFirst })),
  { name: 'invalid shape', mode: 'invalid' }, { name: 'corrupt encoding', mode: 'corrupt' }, { name: 'rejected refresh', mode: 'rejected' },
  { name: 'retryable failure', mode: 'retryable' }, { name: 'proactive rejection preserves valid session', mode: 'proactive' },
  { name: 'single grows to chunks', mode: 'grow' }, { name: 'chunks shrink to single', mode: 'shrink' }, { name: 'refresh then invalidation', mode: 'multi' },
  { name: 'unexpected thrown error keeps fallback', mode: 'throw' },
  { name: 'ID rewrite', mode: 'expired', pathname: '/store/qa-offer-simple', rewrite: '/id/store/qa-offer-simple' },
  { name: 'ZH rewrite', mode: 'expired', pathname: '/zh-cn/store/qa-offer-simple', rewrite: '/zh-CN/store/qa-offer-simple' },
  { name: 'canonical redirect', mode: 'expired', pathname: '/zh-CN/store/qa-offer-simple', status: 308, location: '/zh-cn/store/qa-offer-simple' },
  { name: 'ID alias redirect', mode: 'expired', pathname: '/id/store/qa-offer-simple', status: 307, location: '/store/qa-offer-simple' },
  { name: 'internal rewrite', mode: 'expired', pathname: '/id/store/qa-offer-simple', internal: true },
  { name: 'API early return', mode: 'expired', pathname: '/api/contact' },
  { name: 'callback without code still refreshes', mode: 'expired', pathname: '/auth/callback' },
  { name: 'non-GET callback still refreshes', mode: 'expired', pathname: '/auth/callback?code=synthetic-code', method: 'POST' },
  { name: 'HEAD', mode: 'expired', method: 'HEAD' }, { name: 'POST', mode: 'expired', method: 'POST' },
  { name: 'RSC/prefetch envelope', mode: 'expired', rsc: true },
  { name: 'Careers not-found', mode: 'expired', pathname: '/en/careers/not-a-job', status: 404 },
  { name: 'Careers found', mode: 'expired', pathname: '/en/careers/42' },
];
async function proxyChecks(test, eq) {
  const { NextRequest } = require('next/server');
  const original = { fetch: globalThis.fetch, now: Date.now, warn: console.warn, error: console.error };
  try {
    await test('proxy delegates OAuth code exchange without a competing session refresh', async () => {
      let refreshes = 0;
      const load = loader(new Map([
        ['next-intl/middleware', require('./i18n-middleware-fixture.cjs')],
        ['@/utils/supabase/middleware', { createClient() { return { supabaseResponse: require('next/server').NextResponse.next(), supabase: { auth: { getUser: async () => { refreshes++; return { data: { user: null } }; } } } }; } }],
      ]));
      const response = await load('proxy.ts').proxy(new NextRequest(PROJECT + '/auth/callback?code=synthetic-code'));
      eq(refreshes, 0, 'OAuth handler is the only refresh/exchange owner');
      eq(response.status, 200, 'Callback continues to its handler');
      eq(response.cookies.getAll(), [], 'No competing proxy cookie');
      eq(response.headers.get('x-middleware-next'), '1', 'Callback is not redirected by proxy');
    });
    for (const fixture of cases) await test('proxy: ' + fixture.name, async () => {
      const batches = [], trace = [], calls = [];
      let offset = 0, verified = false;
      Date.now = () => original.now() + offset;
      globalThis.fetch = makeTransport(trace, () => { offset = 60000; });
      console.warn = () => {}; console.error = () => {};
      try {
        const load = loader(new Map([
          ['next-intl/middleware', require('./i18n-middleware-fixture.cjs')],
          ['@supabase/ssr', { ...sdk, createServerClient(url, key, options) {
            calls.push('createClient');
            const setAll = options.cookies.setAll;
            const client = sdk.createServerClient(url, key, { ...options, cookies: { ...options.cookies, setAll(cookies, headers) { batches.push({ cookies, headers }); return setAll(cookies, headers); } } });
            const getUser = client.auth.getUser.bind(client.auth);
            client.auth.getUser = async (...args) => { calls.push('getUser'); if (fixture.mode === 'throw') throw Error('Synthetic unexpected Auth failure'); const value = await getUser(...args); verified = value.error === null && value.data.user?.id === user.id; return value; };
            return client;
          } }],
        ]));
        const headers = new Headers({ cookie: seeded(fixture.mode === 'throw' ? 'fresh' : fixture.mode).map(c => c.name + '=' + c.value).join('; ') });
        if (fixture.internal) headers.set('x-public-pathname', '/store/qa-offer-simple');
        if (fixture.rsc) { headers.set('rsc', '1'); headers.set('next-router-prefetch', '1'); }
        const request = new NextRequest('https://website-fixture.invalid' + (fixture.pathname || '/en/store/qa-offer-simple'), { method: fixture.method || 'GET', headers });
        const response = await load('proxy.ts').proxy(request);
        const expected = new Map();
        for (const batch of batches) for (const cookie of batch.cookies) expected.set(cookie.name, cookie);
        eq(calls, ['createClient', 'getUser'], 'Original auth call order');
        eq(response.status, fixture.status || 200, 'Status unchanged');
        eq(response.headers.get('location') ? new URL(response.headers.get('location')).pathname : null, fixture.location || null, 'Location unchanged');
        eq(response.headers.get('x-middleware-rewrite') ? new URL(response.headers.get('x-middleware-rewrite')).pathname : null, fixture.rewrite || null, 'Rewrite unchanged');
        if (fixture.headerFirst) eq(response.headers.get(fixture.headerFirst), CACHE[fixture.headerFirst], 'SDK cache header retained');
        const actual = response.cookies.getAll().filter(c => c.name.startsWith(COOKIE));
        eq(actual.length, expected.size, 'All SDK cookie mutations retained');
        for (const [name, cookie] of expected) {
          const value = response.cookies.get(name);
          eq(!!value, true, 'SDK cookie retained'); eq(value.value === cookie.value, true, 'Exact cookie bytes retained (redacted)');
          for (const field of ['path', 'sameSite', 'domain']) eq(value[field], cookie.options[field], 'SDK attribute ' + field);
          eq(value.maxAge, cookie.options.maxAge === 0 ? 0 : undefined, 'Default shared session policy overrides SDK lifetime, preserves deletion');
          if (cookie.options.maxAge !== 0) eq(value.expires, undefined, 'Session cookie has no Expires');
          for (const field of ['httpOnly', 'secure']) eq(value[field] ?? false, cookie.options[field] ?? false, 'SDK boolean ' + field);
        }
        if (batches.length) for (const name of Object.keys(CACHE)) eq(response.headers.get(name), new Headers(batches.at(-1).headers).get(name), 'SDK anti-cache ' + name);
        else { eq(actual.length, 0, 'No invented cookie'); if (fixture.status !== 404) for (const name of Object.keys(CACHE)) eq(response.headers.get(name), null, 'No invented cache header'); }
        if (batches.length && !fixture.location && fixture.status !== 404) eq(response.headers.get('x-middleware-request-cookie'), request.headers.get('cookie'), 'Latest cookie reaches downstream request');
        if (fixture.status === 404) { eq(response.headers.get('x-middleware-override-headers'), null, 'Terminal 404 has no upstream request'); eq(response.headers.get('x-robots-tag'), 'noindex', '404 remains noindex'); }
        if (['fresh', 'expired', 'grow', 'shrink', 'proactive'].includes(fixture.mode)) eq(verified, true, 'SDK verified user');
        if (fixture.mode === 'multi') eq(batches.length >= 2, true, 'Multiple real SDK callbacks exercised');
        if (fixture.mode === 'grow') eq(actual.filter(c => c.value).length >= 2, true, 'Large session is chunked');
        if (fixture.mode === 'shrink') { eq(actual.filter(c => c.value).length, 1, 'Shrinks to one cookie'); eq(actual.some(c => c.value === '' && c.maxAge === 0), true, 'Stale chunks deleted'); }
        if (['invalid', 'rejected', 'multi'].includes(fixture.mode)) eq(actual.every(c => c.value === '' && c.maxAge === 0), true, 'Invalidation remains deletion');
        if (fixture.rsc) eq(response.headers.get('x-middleware-request-rsc'), '1', 'RSC header preserved upstream');
      } finally { Date.now = original.now; console.warn = original.warn; console.error = original.error; }
    });
  } finally { globalThis.fetch = original.fetch; }
}
async function serverChecks(test, eq) {
  const originalFetch = globalThis.fetch;
  try {
    await test('middleware adapter retains disjoint callback cookies and prior cache headers', () => {
      const { NextRequest } = require('next/server');
      let setAll;
      const load = loader(new Map([['@supabase/ssr', { createServerClient(_url, _key, options) { setAll = options.cookies.setAll; return {}; } }]]));
      const request = new NextRequest(PROJECT + '/admin');
      const client = load('utils/supabase/middleware.ts').createClient(request);
      setAll([{ name: 'qa-first', value: 'synthetic-a', options: { path: '/', maxAge: 60 } }], CACHE);
      setAll([{ name: 'qa-second', value: 'synthetic-b', options: { path: '/', maxAge: 60 } }], {});
      setAll([{ name: 'qa-first', value: '', options: { path: '/', maxAge: 0 } }], {});
      eq(client.supabaseResponse.cookies.get('qa-second')?.value === 'synthetic-b', true, 'Earlier disjoint mutation retained');
      eq(client.supabaseResponse.cookies.get('qa-first')?.maxAge, 0, 'Latest deletion wins');
      for (const [name, value] of Object.entries(CACHE)) eq(client.supabaseResponse.headers.get(name), value, 'Prior cache protection retained');
      eq(client.supabaseResponse.headers.get('x-middleware-request-cookie'), request.headers.get('cookie'), 'Latest downstream request cookies retained');
    });
    for (const mode of ['fresh', 'missing', 'expired', 'grow', 'shrink', 'multi', 'readonly', 'default-action', 'partial-write']) await test('server adapter: ' + mode, async () => {
      const batches = [], written = [], trace = [];
      const seed = ['readonly', 'default-action'].includes(mode) ? 'expired' : mode === 'partial-write' ? 'grow' : mode;
      const jar = new Map(seeded(seed).map(c => [c.name, c.value]));
      if (['fresh', 'missing'].includes(mode)) jar.set(COOKIE + '-code-verifier', encode('synthetic-local-pkce'));
      globalThis.fetch = makeTransport(trace);
      const channel = new Headers();
      const load = loader(new Map([['@supabase/ssr', { ...sdk, createServerClient(url, key, options) {
        const setAll = options.cookies.setAll;
        return sdk.createServerClient(url, key, { ...options, cookies: { ...options.cookies, setAll(cookies, headers) { batches.push({ cookies, headers }); return setAll(cookies, headers); } } });
      } }]]));
      const store = { getAll: () => [...jar].map(([name, value]) => ({ name, value })), set(name, value, options) {
        if (mode === 'readonly' || mode === 'partial-write' && written.length === 1) throw Error('Synthetic cookie write restriction');
        written.push({ name, value, options }); if (options.maxAge === 0) jar.delete(name); else jar.set(name, value);
      } };
      const client = load('utils/supabase/server.ts').createClient(store, mode === 'default-action' ? undefined : channel);
      await client.auth.getUser();
      if (['fresh', 'missing'].includes(mode)) await client.auth.exchangeCodeForSession('synthetic-code');
      if (mode === 'default-action') await client.auth.signOut({ scope: 'local' });
      eq(batches.length > 0, true, 'Actual SDK mutation callback exercised');
      if (['readonly', 'default-action'].includes(mode)) eq([...channel], [], 'Optional channel remains backwards compatible');
      else for (const [name, value] of Object.entries(CACHE)) eq(channel.get(name), value, 'Server adapter preserves SDK ' + name);
      const expected = batches.flatMap(b => b.cookies);
      const sdkWrites = written.filter(cookie => cookie.name !== 'aka-auth-remember');
      eq(sdkWrites.length, mode === 'readonly' ? 0 : mode === 'partial-write' ? 1 : expected.length, 'SDK cookie writes retained');
      eq(sdkWrites.every((c, i) => c.name === expected[i].name && c.value === expected[i].value), true, 'SDK bytes/order retained');
      for (const [i, cookie] of sdkWrites.entries()) {
        if (cookie.name === COOKIE || cookie.name.startsWith(COOKIE + '.')) eq(cookie.options.maxAge, expected[i].options.maxAge === 0 ? 0 : undefined, 'Session lifetime policy');
        for (const field of ['path', 'sameSite', 'domain', 'secure', 'httpOnly']) eq(cookie.options[field], expected[i].options[field], 'Other SDK options retained');
      }
      if (!['readonly', 'partial-write'].includes(mode)) eq(written.filter(c => c.name === 'aka-auth-remember').length, batches.length, 'Preference follows session writes');
      if (mode === 'default-action') eq(jar.size, 0, 'Existing local logout removes session');
      if (mode === 'multi') eq(batches.length >= 2, true, 'Repeated callbacks retain cache protection');
    });
    for (const fixture of [
      { name: 'empty mutation', cookies: [], headers: {}, want: [] },
      { name: 'cache allowlist excludes credentials', cookies: [{ name: 'qa', value: 'synthetic', options: { path: '/' } }], headers: { ...CACHE, authorization: 'synthetic', cookie: 'synthetic', 'set-cookie': 'synthetic', 'x-middleware-override-headers': 'synthetic' }, want: Object.entries(CACHE) },
      { name: 'later empty headers retain prior cache', cookies: [{ name: 'qa', value: 'synthetic', options: { path: '/' } }], headers: {}, initial: CACHE, want: Object.entries(CACHE) },
      { name: 'header sink errors propagate', cookies: [{ name: 'qa', value: 'synthetic', options: { path: '/' } }], headers: CACHE, throws: true },
    ]) await test('server control: ' + fixture.name, () => {
      let setAll;
      const channel = new Headers(fixture.initial);
      const load = loader(new Map([['@supabase/ssr', { createServerClient(_url, _key, options) { setAll = options.cookies.setAll; return {}; } }]]));
      load('utils/supabase/server.ts').createClient({ getAll: () => [], set() {} }, channel);
      if (fixture.throws) { channel.set = () => { throw Error('Header sink failure'); }; assert.throws(() => setAll(fixture.cookies, fixture.headers), /Header sink failure/); }
      else { setAll(fixture.cookies, fixture.headers); eq([...channel].sort(), fixture.want.toSorted(), 'Only supplied SDK cache headers copied'); }
    });
  } finally { globalThis.fetch = originalFetch; }
}
async function callbackChecks(test, eq) {
  const { NextRequest, NextResponse } = require('next/server');
  const original = { fetch: globalThis.fetch, log: console.log, warn: console.warn };
  try {
    for (const fixture of [
      { name: 'actual SDK headers' },
      { name: 'stricter existing policy', policy: 'private, no-store, no-transform' },
      { name: 'cacheable policy replaced', policy: 'public, max-age=3600' },
      { name: 'quoted no-store is not a directive', policy: 'no-cache="x,no-store,y", max-age=3600' },
      { name: 'early return has no invented headers', noCode: true },
      ...['super_admin', 'admin', 'staff', 'editor', 'viewer'].map(role => ({ name: role + ' rejected', role, denied: true })),
      { name: 'inactive customer rejected', inactive: true, denied: true },
    ]) await test('OAuth callback: ' + fixture.name, async () => {
      const jar = new Map([...seeded('fresh'), { name: COOKIE + '-code-verifier', value: encode('synthetic-local-pkce') }].map(c => [c.name, c.value]));
      const trace = [], batches = [], transport = makeTransport(trace);
      globalThis.fetch = (input, init = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url);
        if (url.origin === PROJECT && url.pathname === '/rest/v1/profiles') return Promise.resolve(new Response(JSON.stringify({ id: user.id, email: user.email, role: fixture.role || 'customer', is_active: !fixture.inactive }), { headers: { 'content-type': 'application/json' } }));
        return transport(input, init);
      };
      const admin = { select() { return this; }, neq() { return this; }, ilike() { return this; }, in() { return this; }, eq() { return this; }, limit: async () => ({ data: [], error: null }) };
      const load = loader(new Map([
        ['next/headers', { cookies: async () => ({ getAll: () => [...jar].map(([name, value]) => ({ name, value })), set(name, value, options) { if (options.maxAge === 0) jar.delete(name); else jar.set(name, value); } }) }],
        ['next/server', { NextRequest, NextResponse: class extends NextResponse { static redirect(url, init) { const response = NextResponse.redirect(url, init); if (fixture.policy) response.headers.set('Cache-Control', fixture.policy); return response; } } }],
        ['@/utils/supabase/admin', { createAdminClient: () => ({ from: () => admin }) }],
        ['@/lib/public-url', { getCanonicalOrigin: () => PROJECT }],
        ['@supabase/ssr', { ...sdk, createServerClient(url, key, options) {
          const setAll = options.cookies.setAll;
          return sdk.createServerClient(url, key, { ...options, cookies: { ...options.cookies, setAll(cookies, headers) { batches.push({ cookies, headers }); return setAll(cookies, headers); } } });
        } }],
      ]));
      console.log = () => {}; console.warn = () => {};
      try {
        const response = await load('app/auth/callback/route.ts').GET(new NextRequest(PROJECT + '/auth/callback?next=%2Fen%2Fstore' + (fixture.noCode ? '' : '&code=synthetic-code')));
        eq(response.status, 307, '307 retained');
        eq(new URL(response.headers.get('location')).pathname, fixture.noCode || fixture.denied ? '/en/auth/login' : '/en/store', 'Customer-only redirect retained');
        if (fixture.noCode) { eq(batches.length, 0, 'No SDK mutation on early return'); for (const name of Object.keys(CACHE)) eq(response.headers.get(name), null, 'No invented header'); }
        else { eq(batches.length > 0, true, 'Actual SDK mutation exercised'); for (const [name, value] of Object.entries(CACHE)) eq(response.headers.get(name), name === 'cache-control' && fixture.policy?.includes('no-transform') ? fixture.policy : value, 'Cache policy retained'); }
        if (fixture.denied) eq(jar.has(COOKIE), false, 'Rejected account session cleared');
        for (const name of ['cookie', 'authorization', 'set-cookie', 'x-middleware-override-headers']) eq(response.headers.get(name), null, 'Composer does not expose credentials/internal headers');
      } finally { console.log = original.log; console.warn = original.warn; }
    });
  } finally { globalThis.fetch = original.fetch; }
}
async function main() {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'aka-auth-unit-'));
  const report = { cases: [], checks: 0, failures: [], productionAccess: 0 };
  const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); report.checks++; };
  const test = async (name, run) => {
    try { await run(); report.cases.push({ name, result: 'PASS' }); console.log('PASS', name); }
    catch (error) { report.cases.push({ name, result: 'FAIL' }); report.failures.push({ name, message: error.message }); console.error('FAIL', name, error.stack); }
  };
  const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SITE_URL', 'MIKA_API_BASE_URL'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: PROJECT, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key', NEXT_PUBLIC_SITE_URL: PROJECT, MIKA_API_BASE_URL: 'https://mika-fixture.invalid/api/v1' });
  try {
    await test('raw cookie identity parser controls', () => identitySelfCheck(eq));
    await proxyChecks(test, eq);
    await serverChecks(test, eq);
    await callbackChecks(test, eq);
  } finally {
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
    report.verdict = report.failures.length ? 'RED' : 'GREEN';
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`${report.verdict}: ${report.cases.length - report.failures.length}/${report.cases.length} cases; ${report.checks} assertions; ${report.failures.length} failures. Actual SDK/modules; synthetic transport only.`);
    console.log('EVIDENCE', output);
    if (report.failures.length) process.exitCode = 1;
  }
}
module.exports = { loader, PROJECT, COOKIE, CACHE, user, session, seeded, encode, marker, labelOfToken, makeTransport, auditSetCookieFields, assertUniqueCookieIdentities };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
