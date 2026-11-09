/* eslint-disable @typescript-eslint/no-require-imports -- Local Next HTTP regression runner and synthetic-only backend preload. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const net = require('node:net');
const qa = require('./verify-auth-cookie-refresh.cjs');
const root = path.resolve(__dirname, '..');

function installTransport() {
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, qa.PROJECT, 'Fixture preload requires synthetic project');
  assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY, 'synthetic-server-only-key', 'Fixture preload refuses real credentials');
  const record = entry => fs.appendFileSync(process.env.AKA_AUTH_TRACE, JSON.stringify(entry) + '\n');
  const trace = [];
  const usedRecoveryTokens = new Set();
  const auth = qa.makeTransport(trace);
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url || String(input));
    const method = init.method || input?.method || 'GET';
    const headers = new Headers(init.headers || input?.headers);
    const label = qa.labelOfToken(headers.get('authorization') || '');
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-supabase-api-version': '2024-01-01' } });
    if (url.origin === qa.PROJECT && url.pathname.startsWith('/rest/v1/') && ['GET', 'HEAD'].includes(method)) {
      record({ kind: 'rest', method, path: url.pathname, fixtureMarker: label });
      if (url.pathname === '/rest/v1/profiles') {
        if (url.searchParams.has('id') && url.searchParams.get('id').startsWith('neq.')) return json([]);
        return json([{ id: qa.user.id, email: qa.user.email, role: label === 'callback-admin' || label?.startsWith('recovery') ? 'admin' : 'customer', is_active: !['callback-inactive', 'recovery-inactive'].includes(label) }]);
      }
      return json([]);
    }
    if (url.origin === qa.PROJECT && url.pathname === '/auth/v1/recover' && method === 'POST') {
      record({ kind: 'auth', method, path: url.pathname });
      return json({});
    }
    if (url.origin === qa.PROJECT && url.pathname === '/auth/v1/verify' && method === 'POST') {
      record({ kind: 'auth', method, path: url.pathname });
      const body = JSON.parse(init.body);
      const token = body.token_hash;
      if (body.type !== 'recovery' || !['a'.repeat(64), 'c'.repeat(64), 'd'.repeat(64), 'e'.repeat(64), 'f'.repeat(64)].includes(token) || usedRecoveryTokens.has(token)) return json({ code: 'otp_expired', message: 'Synthetic expired/used token' }, 403);
      usedRecoveryTokens.add(token);
      return json(qa.session(token[0] === 'c' ? 'recovery-partial' : token[0] === 'd' ? 'recovery-inactive' : token[0] === 'e' ? 'recovery-forbidden' : token[0] === 'f' ? 'recovery-uncertain' : 'recovery'));
    }
    if (url.origin === qa.PROJECT && url.pathname === '/auth/v1/user' && method === 'PUT') {
      record({ kind: 'auth', method, path: url.pathname, passwordUpdate: true });
      if (label === 'recovery-uncertain') return json({ message: 'Synthetic response lost after commit' }, 504);
      return json(qa.user);
    }
    if (url.origin === qa.PROJECT && url.pathname === '/auth/v1/logout' && ['recovery-partial', 'recovery-forbidden'].includes(label) && url.searchParams.get('scope') === 'global') {
      record({ kind: 'auth', method, path: url.pathname, scope: 'global', partial: true });
      return json({ code: 'synthetic_global_logout_failure', message: 'Synthetic logout failure' }, label === 'recovery-forbidden' ? 403 : 400);
    }
    if (url.origin === qa.PROJECT && url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'pkce') {
      const code = JSON.parse(init.body).auth_code;
      const tag = code === 'fixture-admin' ? 'callback-admin' : code === 'fixture-inactive' ? 'callback-inactive' : 'callback-B';
      record({ kind: 'auth', method, path: url.pathname, fixtureMarker: null, grantType: 'pkce' });
      return json(qa.session(tag));
    }
    const start = trace.length;
    try { return await auth(input, init); }
    catch (error) { record({ blocked: true, method, origin: url.origin, path: url.pathname }); throw error; }
    finally { for (const entry of trace.slice(start)) record({ ...entry, ...(url.pathname === '/auth/v1/token' ? { grantType: url.searchParams.get('grant_type') } : {}) }); }
  };
}

async function main() {
  const { parseSetCookie } = require('next/dist/compiled/@edge-runtime/cookies');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'aka-auth-http-'));
  const traceFile = path.join(output, 'transport.jsonl');
  fs.writeFileSync(traceFile, '');
  const report = { cases: [], failures: [], checks: 0, productionAccess: 0 };
  const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); report.checks++; };
  const trace = () => fs.readFileSync(traceFile, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  const origin = 'http://127.0.0.1:' + port;
  const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'PATH', 'Path', 'PATHEXT', 'ComSpec', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  Object.assign(env, { NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: qa.PROJECT, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key', NEXT_PUBLIC_SITE_URL: qa.PROJECT,
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-only-key', MIKA_API_BASE_URL: 'https://mika-fixture.invalid/api/v1', NODE_OPTIONS: '--require=' + JSON.stringify(__filename), AKA_AUTH_FIXTURE: '1', AKA_AUTH_TRACE: traceFile, HOSTNAME: '127.0.0.1', PORT: String(port) });
  const child = cp.spawn(process.execPath, ['.next/standalone/server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', bytes => { log += bytes; });
  child.stderr.on('data', bytes => { log += bytes; });
  const fixtures = [
    { name: 'callback owns final session without duplicate proxy cookie', url: '/auth/callback?code=fixture-code&next=%2Fen%2Fstore', status: 307, location: '/en/store', callback: true },
    { name: 'CMS callback stays denied', url: '/auth/callback?code=fixture-admin&next=%2Fen%2Fstore', status: 307, location: '/en/auth/login', callback: true, deleted: true },
    { name: 'inactive callback stays denied', url: '/auth/callback?code=fixture-inactive&next=%2Fen%2Fstore', status: 307, location: '/en/auth/login', callback: true, deleted: true },
    { name: 'EN two-request cookie jar', url: '/en/auth/login' },
    { name: 'Remembered shared customer navigation refresh', url: '/en/auth/login', remember: true },
    { name: 'Remembered chunk growth', url: '/api/store/recent', status: 405, mode: 'grow', remember: true },
    { name: 'Remembered callback retains policy', url: '/auth/callback?code=fixture-code&next=%2Fen%2Fstore', status: 307, location: '/en/store', callback: true, remember: true },
    { name: 'ID rewrite cookie jar', url: '/auth/login' },
    { name: 'ZH rewrite cookie jar', url: '/zh-cn/auth/login' },
    { name: 'canonical redirect', url: '/zh-CN/auth/login', status: 308, location: '/zh-cn/auth/login' },
    { name: 'ID alias redirect', url: '/id/auth/login', status: 307, location: '/auth/login' },
    { name: 'internal rewrite', url: '/id/auth/login', headers: { 'x-public-pathname': '/auth/login' } },
    { name: 'HEAD cookie jar', url: '/en/auth/login', method: 'HEAD' },
    { name: 'POST validation without insert', url: '/api/contact', method: 'POST', status: 400 },
    { name: 'API 405 early return', url: '/api/store/recent', status: 405 },
    { name: 'RSC cookie jar', url: '/en/auth/login', headers: { rsc: '1', 'next-router-prefetch': '1' } },
    { name: 'Careers terminal 404', url: '/en/careers/not-a-job', status: 404 },
    { name: 'Careers found', url: '/en/careers/42' },
    { name: 'single grows to chunks', url: '/api/store/recent', status: 405, mode: 'grow' },
    { name: 'chunks shrink to single', url: '/api/store/recent', status: 405, mode: 'shrink' },
    { name: 'SDK session deletion', url: '/api/store/recent', status: 405, mode: 'rejected', deleted: true },
    { name: 'protected Admin remains denied', url: '/admin', streamedRedirect: '/admin/login' },
  ];
  try {
    const deadline = Date.now() + 60000;
    while (!log.includes('Ready in')) {
      if (child.exitCode !== null || Date.now() > deadline) throw Error('Local Next failed to start: ' + log);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    for (const fixture of fixtures) {
      const jar = new Map(qa.seeded(fixture.mode || 'expired').map(cookie => [cookie.name, cookie.value]));
      if (fixture.remember) jar.set('aka-auth-remember', '30d');
      if (fixture.callback) jar.set(qa.COOKIE + '-code-verifier', qa.encode('fixture-pkce-verifier'));
      const requestUrl = new URL(fixture.url, origin);
      if (fixture.headers?.rsc) await require('next/dist/client/components/router-reducer/set-cache-busting-search-param').setCacheBustingSearchParam(requestUrl, fixture.headers);
      async function send(url, options = {}) {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(60000), ...options,
          headers: { ...fixture.headers, ...options.headers, cookie: [...jar].map(([name, value]) => name + '=' + encodeURIComponent(value)).join('; ') } });
        const fields = response.headers.getSetCookie();
        const identities = qa.auditSetCookieFields(fields, url);
        for (const [index, field] of fields.entries()) {
          const cookie = parseSetCookie(field);
          if (!cookie.name.startsWith(qa.COOKIE) && cookie.name !== 'aka-auth-remember') continue;
          if (identities[index].mutation === 'delete') jar.delete(cookie.name);
          else jar.set(cookie.name, cookie.value);
        }
        return { response, fields };
      }
      try {
        const start = trace().length;
        const options = { method: fixture.method || 'GET' };
        if (options.method === 'POST') options.body = '{}';
        const { response, fields } = await send(requestUrl, options);
        eq(response.status, fixture.status || 200, 'HTTP status retained');
        eq(response.headers.get('location') ? new URL(response.headers.get('location'), origin).pathname : null, fixture.location || null, 'Redirect retained');
        const body = await response.text();
        if (fixture.streamedRedirect) eq(body.includes('NEXT_REDIRECT;replace;' + fixture.streamedRedirect + ';307;'), true, 'Protected layout remains denied');
        if (fixture.headers?.rsc) eq(response.headers.get('content-type')?.includes('text/x-component'), true, 'Actual RSC response');
        const directives = value => value?.split(',').map(v => v.trim().toLowerCase()).sort();
        for (const [name, value] of Object.entries(qa.CACHE)) eq(name === 'cache-control' ? directives(response.headers.get(name)) : response.headers.get(name), name === 'cache-control' ? directives(value) : value, 'HTTP anti-cache ' + name);
        const expected = fixture.deleted ? null : fixture.callback ? 'callback-B' : 'rotated-' + (fixture.mode || 'expired');
        eq(qa.marker([...jar].map(([name, value]) => ({ name, value }))), expected, 'Cookie jar holds final session (values redacted)');
        const rows = qa.auditSetCookieFields(fields, requestUrl);
        qa.assertUniqueCookieIdentities(rows); report.checks++;
        for (const row of rows.filter(row => row.name.startsWith(qa.COOKIE) && row.mutation === 'set')) {
          eq(row.path, '/', 'SDK cookie path'); eq(row.sameSite, 'lax', 'SDK SameSite'); eq(row.httpOnly, false, 'SDK HttpOnly unchanged'); eq(row.secure, false, 'SDK Secure unchanged'); eq(row.maxAge, fixture.remember ? 2592000 : null, 'Shared cookie policy overrides SDK lifetime');
          eq(row.expires === null || fixture.remember, true, 'Unchecked cookie has no Expires');
        }
        if (fixture.deleted) { eq([...jar.keys()].filter(name => name.startsWith(qa.COOKIE)).length, 0, 'Session/deletion reaches jar'); eq(jar.has('aka-auth-remember'), false, 'Preference deleted'); }
        if (fixture.mode === 'grow') eq([...jar.keys()].filter(name => name.startsWith(qa.COOKIE + '.')).length >= 2, true, 'Chunks reach HTTP jar');
        if (fixture.mode === 'shrink') eq(rows.some(row => row.name.startsWith(qa.COOKIE + '.') && row.mutation === 'delete'), true, 'Stale chunks deleted over HTTP');
        for (const name of ['cookie', 'authorization', 'x-middleware-request-cookie', 'x-middleware-set-cookie', 'x-middleware-override-headers']) eq(response.headers.get(name), null, 'No credential/internal header leak');
        if (options.method === 'HEAD') eq(body.length, 0, 'HEAD has no body');
        const firstTrace = trace().slice(start);
        // The SDK INITIAL_SESSION subscriber may refresh the old expired session inside the handler.
        eq(firstTrace.filter(row => row.path === '/auth/v1/token').length, fixture.callback ? 2 : 1, 'Expected SDK refresh/exchange count');
        if (fixture.callback) {
          eq(firstTrace.filter(row => row.grantType === 'pkce').length, 1, 'Exactly one code exchange');
          eq(firstTrace.some(row => row.path === '/auth/v1/user' && row.fixtureMarker === 'rotated-expired'), false, 'Proxy did not verify/emit a competing refresh session');
        }
        const afterFirst = trace().length;
        const second = await send(fixture.callback ? new URL('/en/auth/login', origin) : requestUrl, options);
        await second.response.arrayBuffer();
        eq(trace().slice(afterFirst).filter(row => row.path === '/auth/v1/token').length, 0, 'Followup does not repeat refresh');
        if (fixture.callback && !fixture.deleted) eq(trace().slice(afterFirst).some(row => row.path === '/auth/v1/user' && row.fixtureMarker === 'callback-B'), true, 'Followup verifies callback B');
        report.cases.push({ name: fixture.name, result: 'PASS', status: response.status, cookies: rows });
        console.log('PASS HTTP', fixture.name);
      } catch (error) {
        report.cases.push({ name: fixture.name, result: 'FAIL' }); report.failures.push({ name: fixture.name, message: error.message });
        console.error('FAIL HTTP', fixture.name, error.stack);
      }
    }
    async function api(jar, pathname, body, requestOrigin = qa.PROJECT) {
      const url = new URL(pathname, origin);
      const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', redirect: 'manual', signal: AbortSignal.timeout(60000),
        headers: { origin: requestOrigin, 'content-type': 'application/json', cookie: [...jar].map(([name, value]) => name + '=' + encodeURIComponent(value)).join('; ') },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const fields = response.headers.getSetCookie();
      const rows = qa.auditSetCookieFields(fields, url);
      qa.assertUniqueCookieIdentities(rows); report.checks++;
      for (const [index, field] of fields.entries()) {
        const cookie = parseSetCookie(field);
        if (rows[index].mutation === 'delete') jar.delete(cookie.name); else jar.set(cookie.name, cookie.value);
      }
      eq(response.headers.get('cache-control')?.includes('no-store'), true, 'Auth endpoint no-store');
      return response;
    }
    const recoveryCases = [
      ['Anonymous Admin login remains available and noindex', async () => {
        const response = await api(new Map(), '/admin/login');
        eq(response.status, 200, 'Anonymous Admin login renders');
        const text = await response.text();
        const html = require('next/dist/compiled/node-html-parser').parse(text);
        // Existing ThemeProvider intentionally renders children only after hydration.
        eq(html.querySelector('meta[name="robots"]').getAttribute('content').includes('noindex'), true, 'Login stays noindex');
      }],
      ['Forgot requests remain neutral over HTTP', async () => {
        const responses = [];
        for (const email of ['fixture@example.invalid', 'unknown@example.invalid']) {
          const response = await api(new Map(), '/api/admin/auth/forgot-password', { email });
          eq(response.status, 202, 'Neutral request status'); responses.push(await response.json());
        }
        eq(responses[0], responses[1], 'No account enumeration');
      }],
      ['Ordinary Admin login cannot use reset operation', async () => {
        const jar = new Map(qa.seeded('fresh').map(cookie => [cookie.name, cookie.value]));
        eq((await (await api(jar, '/api/admin/auth/reset-password')).json()).valid, false, 'No recovery context');
        eq((await api(jar, '/api/admin/auth/reset-password', { password: 'Synthetic-new-password-42', confirmPassword: 'Synthetic-new-password-42' })).status, 403, 'Normal login denied');
      }],
      ['Recovery callback, password update, global logout and replay over HTTP', async () => {
        const jar = new Map([['aka-auth-remember', '30d']]);
        const callback = await api(jar, '/auth/recovery?token_hash=' + 'a'.repeat(64) + '&type=recovery');
        eq(callback.headers.get('location'), qa.PROJECT + '/admin/reset-password', 'Token removed from destination URL');
        eq(jar.has('aka-admin-recovery'), true, 'Context cookie issued');
        eq((await (await api(jar, '/api/admin/auth/reset-password')).json()).valid, true, 'Context works across actual route bundles');
        eq((await api(jar, '/api/admin/auth/reset-password', { password: 'Synthetic-new-password-42', confirmPassword: 'Synthetic-new-password-42' }, 'https://evil.invalid')).status, 403, 'CSRF denied');
        const changed = await api(jar, '/api/admin/auth/reset-password', { password: 'Synthetic-new-password-42', confirmPassword: 'Synthetic-new-password-42' });
        eq(await changed.json(), { success: true, passwordUpdated: true, signedOut: true, message: 'Kata sandi berhasil diperbarui. Silakan masuk kembali.' }, 'Actual SDK update/logout flow succeeds');
        eq([...jar.keys()].some(name => name.startsWith(qa.COOKIE) || name === 'aka-auth-remember' || name === 'aka-admin-recovery'), false, 'All local auth/context/preferences cleared');
        const replay = await api(jar, '/auth/recovery?token_hash=' + 'a'.repeat(64) + '&type=recovery');
        eq(replay.headers.get('location'), qa.PROJECT + '/admin/forgot-password?error=recovery_invalid', 'Used token rejected');
        eq(jar.has('aka-admin-recovery'), false, 'No replay context');
      }],
      ['Recovery invalid/expired/inactive cases remain denied over HTTP', async () => {
        for (const token of ['b'.repeat(64), 'd'.repeat(64)]) {
          const jar = new Map();
          const response = await api(jar, '/auth/recovery?token_hash=' + token + '&type=recovery');
          eq(response.headers.get('location'), qa.PROJECT + '/admin/forgot-password?error=recovery_invalid', 'Invalid or inactive denied');
          eq(jar.has('aka-admin-recovery'), false, 'No reset grant');
        }
      }],
      ['Global logout failure is honest and local cleanup still completes over HTTP', async () => {
        const jar = new Map();
        await api(jar, '/auth/recovery?token_hash=' + 'c'.repeat(64) + '&type=recovery');
        const response = await api(jar, '/api/admin/auth/reset-password', { password: 'Synthetic-new-password-42', confirmPassword: 'Synthetic-new-password-42' });
        const body = await response.json();
        eq(response.status, 502, 'Partial response'); eq(body.passwordUpdated, true, 'Password did change'); eq(body.signedOut, false, 'No false global logout claim');
        eq([...jar.keys()].some(name => name.startsWith(qa.COOKIE) || name === 'aka-auth-remember' || name === 'aka-admin-recovery'), false, 'Local session still removed');
      }],
      ['SDK-normalized 403 logout is not reported as global success', async () => {
        const jar = new Map();
        await api(jar, '/auth/recovery?token_hash=' + 'e'.repeat(64) + '&type=recovery');
        const response = await api(jar, '/api/admin/auth/reset-password', { password: 'Synthetic-new-password-42', confirmPassword: 'Synthetic-new-password-42' });
        const body = await response.json();
        eq(response.status, 502, 'Rejected remote logout is partial'); eq(body.signedOut, false, 'No normalized false success'); eq(body.passwordUpdated, true, 'Password update still reported');
        eq([...jar.keys()].some(name => name.startsWith(qa.COOKIE) || name === 'aka-auth-remember' || name === 'aka-admin-recovery'), false, 'Local cleanup independent of 403');
      }],
      ['SDK-returned 504 update response remains indeterminate over HTTP', async () => {
        const jar = new Map();
        await api(jar, '/auth/recovery?token_hash=' + 'f'.repeat(64) + '&type=recovery');
        const response = await api(jar, '/api/admin/auth/reset-password', { password: 'Synthetic-new-password-42', confirmPassword: 'Synthetic-new-password-42' });
        const body = await response.json();
        eq(response.status, 502, 'Indeterminate response'); eq(body.passwordUpdated, null, 'No false failure/success'); eq(body.needsNewLink, true, 'Context cannot be reused');
        eq([...jar.keys()].some(name => name.startsWith(qa.COOKIE) || name === 'aka-auth-remember' || name === 'aka-admin-recovery'), false, 'Local cleanup on uncertain outcome');
      }],
    ];
    for (const [name, run] of recoveryCases) {
      try { await run(); report.cases.push({ name, result: 'PASS' }); console.log('PASS HTTP', name); }
      catch (error) { report.cases.push({ name, result: 'FAIL' }); report.failures.push({ name, message: error.message }); console.error('FAIL HTTP', name, error.stack); }
    }
    eq(trace().some(row => row.blocked), false, 'No non-fixture backend or database mutations');
    eq(/⨯|TypeError:|ReferenceError:|Unhandled/.test(log), false, 'No hidden server render/runtime errors');
  } finally {
    child.kill();
    report.verdict = report.failures.length ? 'RED' : 'GREEN';
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(output, 'server.log'), log);
    console.log(`${report.verdict} HTTP: ${report.cases.length - report.failures.length}/${report.cases.length} cases; ${report.checks} assertions; ${report.failures.length} failures.`);
    console.log('EVIDENCE', output);
    if (report.failures.length) process.exitCode = 1;
  }
}

if (process.env.AKA_AUTH_FIXTURE === '1') installTransport();
else if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
