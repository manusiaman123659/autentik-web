/* eslint-disable @typescript-eslint/no-require-imports -- Real routing, messages and browser components; auth transport is isolated. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const { spawn, execFileSync } = require('node:child_process');
const { NextRequest, NextResponse } = require('next/server');
const root = path.resolve(__dirname, '..');
const loaded = new Map();
const mocks = new Map();
mocks.set('next-intl/middleware', require('./i18n-middleware-fixture.cjs'));
function load(file) {
  const filename = path.resolve(root, file);
  if (loaded.has(filename)) return loaded.get(filename).exports;
  const compiledModule = new Module(filename);
  loaded.set(filename, compiledModule);
  compiledModule.filename = filename;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const native = compiledModule.require.bind(compiledModule);
  compiledModule.require = name => {
    if (mocks.has(name)) return mocks.get(name);
    if (name.startsWith('@/')) return path.extname(name) ? native(path.join(root, name.slice(2))) : load(name.slice(2) + '.ts');
    if (name.startsWith('.') && !path.extname(name)) return load(path.relative(root, path.resolve(path.dirname(filename), name)) + '.ts');
    return native(name);
  };
  compiledModule._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return compiledModule.exports;
}
let checks = 0;
function equal(actual, expected, label) { assert.deepEqual(actual, expected, label); checks++; }
async function main() {
  const { getSafeCustomerRedirect } = load('lib/auth-redirect.ts');
  const { getPublicRoute } = load('i18n/locales.ts');
  equal(getPublicRoute('/products/brochure.pdf'), null, 'Asset path is never a locale page');
  equal(getSafeCustomerRedirect('/en/store/checkout?mode=direct#payment'), '/en/store/checkout?mode=direct#payment', 'English customer return preserves path/query/hash');
  equal(getSafeCustomerRedirect('/zh-cn/store/orders/AKA-1?payment=return'), '/zh-cn/store/orders/AKA-1?payment=return', 'Chinese customer return');
  for (const unsafe of ['https://evil.example/store', '//evil.example/store', '/fr/store', '/en/admin', '/en/api/orders', '/store\\evil', '/en/storehouse', '/zh-CN/store']) {
    equal(getSafeCustomerRedirect(unsafe), '/store', 'Unsafe/unsupported return rejected: ' + unsafe);
  }
  const { localizeHref, localeAlternates, isPublicLocale } = load('i18n/locales.ts');
  for (const [locale, prefix] of [['id',''],['en','/en'],['zh-CN','/zh-cn']]) {
    equal(isPublicLocale(locale), true, 'Supported internal locale');
    for (const pathname of ['/', '/products', '/products/model-123', '/store/cart', '/store/checkout', '/store/orders/AKA-1/print', '/careers/123', '/research-partnership', '/auth/login']) {
      const expected = prefix + (pathname === '/' && prefix ? '' : pathname);
      equal(localizeHref(pathname, locale), expected, 'Corresponding URL ' + locale + pathname);
      equal(getPublicRoute(expected).locale, locale, 'URL authoritative locale');
      equal(localizeHref(expected + '?brand=TALPHA&page=2#specifikasi', 'en'), '/en' + (pathname === '/' ? '' : pathname) + '?brand=TALPHA&page=2#specifikasi', 'Switch retains query/hash/identity');
    }
    for (const excluded of ['/admin','/admin/orders/1/invoice','/api/contact','/api/webhooks/midtrans','/api/orders/1/status','/auth/callback','/_next/static/app.js','/robots.txt','/sitemap.xml','/images/a.png','/products/brochure.pdf','/models/a.glb','https://wa.me/628123']) {
      equal(localizeHref(excluded, locale), excluded, 'Machine/admin/external exclusion');
    }
    for (const namespace of ['common','navigation']) {
      const base = require(path.join(root, 'messages/id', namespace + '.json'));
      const selected = require(path.join(root, 'messages', locale, namespace + '.json'));
      equal(Object.keys(selected).sort(), Object.keys(base).sort(), 'Namespace key parity');
      for (const key of Object.keys(base)) {
        equal(typeof selected[key] === 'string' && selected[key].trim().length > 0, true, 'No blank message');
        equal(selected[key].match(/\{[^}]+\}/g) ?? [], base[key].match(/\{[^}]+\}/g) ?? [], 'Interpolation parity');
      }
    }
  }
  equal(localeAlternates('/products/foo')['x-default'], '/products/foo', 'x-default is Indonesian');
  mocks.set('@/messages/en/common.json', { search: 'Search' });
  const fallbackMessages = await load('i18n/messages.ts').loadMessages('en');
  equal(fallbackMessages.common.search, 'Search', 'Available message used');
  equal(fallbackMessages.common.language, 'Bahasa', 'Missing Foundation message falls back to Indonesian');
  mocks.delete('@/messages/en/common.json');
  for (const invalid of ['fr','zh','zh-TW','zh-cn','en-US',null,'../../en']) equal(isPublicLocale(invalid), false, 'Arbitrary locale rejected');

  // Real proxy and next-intl routing; only auth/recruitment transport is simulated.
  let refreshes = 0;
  mocks.set('@/utils/supabase/middleware', { createClient: request => {
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set('session-fixture', 'refreshed', { path: '/', httpOnly: true });
    return { supabaseResponse: response, supabase: { auth: { getUser: async () => { refreshes++; request.cookies.set('session-auth-fixture','fresh-request-token'); return { data: { user: { id: 'fixture' } } }; } } } };
  } });
  mocks.set('@/lib/api/mika-career', { getMikaJobDetail: async id => ({ status: id === '123' ? 'found' : 'not_found' }) });
  const env = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'fixture-publishable';
  const { proxy, config } = load('proxy.ts');
  const request = (url, method = 'GET') => new NextRequest('https://example.com' + url, { method, headers: { cookie: 'autentik-locale=zh-CN', 'accept-language':'en', 'x-public-pathname':'/forged' } });
  for (const pathname of ['/','/products','/en','/en/products','/zh-cn','/zh-cn/products','/en/store/checkout']) {
    const before = refreshes;
    const response = await proxy(request(pathname));
    equal(refreshes, before + 1, 'Session refresh still runs');
    equal(response.headers.get('location'), null, 'Cookie/browser preference cannot override URL');
    equal(response.cookies.get('session-fixture').value, 'refreshed', 'Refreshed cookie retained');
    equal(response.headers.get('x-middleware-request-cookie').includes('session-auth-fixture=fresh-request-token'),true,'Refreshed request cookie forwarded into public render');
    const rewrite = response.headers.get('x-middleware-rewrite');
    equal(rewrite ? new URL(rewrite).pathname : pathname, '/' + getPublicRoute(pathname).locale + (getPublicRoute(pathname).pathname === '/' ? '' : getPublicRoute(pathname).pathname), 'Actual internal locale route');
    equal(response.headers.get('x-middleware-request-x-public-pathname'), getPublicRoute(pathname).pathname, 'Metadata path overwritten from URL');
  }
  for (const pathname of ['/admin','/admin/login','/api/contact','/api/webhooks/midtrans','/api/orders/AKA/status','/auth/callback','/robots.txt','/sitemap.xml','/models/model.glb','/products/data.pdf']) {
    const before = refreshes;
    const response = await proxy(request(pathname));
    equal(refreshes, before + 1, 'Existing refresh scope preserved');
    equal(response.headers.get('location'), null, 'Excluded endpoint not redirected');
    equal(response.headers.get('x-middleware-rewrite'), null, 'Excluded endpoint not rewritten');
  }
  for (const alias of ['/id/products?q=test', '/zh-CN/products?q=test']) {
    const response = await proxy(request(alias));
    equal(new URL(response.headers.get('location')).pathname, alias.startsWith('/id') ? '/products' : '/zh-cn/products', 'Compatibility alias normalizes');
    equal(new URL(response.headers.get('location')).search, '?q=test', 'Normalization retains query');
  }
  for (const prefix of ['', '/en', '/zh-cn']) for (const method of ['GET','HEAD']) {
    const response = await proxy(request(prefix + '/careers/not-a-job', method));
    equal(response.status, 404, 'Localized careers pre-stream 404');
    equal(response.cookies.get('session-fixture').value, 'refreshed', '404 retains refreshed cookie');
    if (method === 'HEAD') equal(await response.text(), '', 'HEAD has no body');
    else equal((await response.text()).includes(`href="${prefix}/careers"`), true, '404 return stays in locale');
  }
  for(const prefix of ['', '/en', '/zh-cn'])for(const suffix of ['json','pdf'])for(const method of ['GET','HEAD']) {
    const response = await proxy(request(`${prefix}/careers/missing.${suffix}`,method));
    equal(response.status,404,'Asset-looking invalid career ID remains pre-stream 404');
    equal(response.headers.get('x-robots-tag'),'noindex','Invalid career remains nonindexable');
    equal(response.cookies.get('session-fixture').value,'refreshed','Career edge case retains refreshed cookies');
  }
  equal((await proxy(request('/en/careers/123'))).status, 200, 'Numeric career guard permits eligible result');
  equal((await proxy(request('/en/careers/not-a-job','POST'))).status, 200, 'Career guard remains GET/HEAD only');
  equal((await proxy(request('/en/store/checkout','POST'))).headers.get('location'), null, 'Server-action POST not redirected');
  equal(config.matcher, ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'], 'Existing matcher unchanged');
  if (env[0] === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = env[0];
  if (env[1] === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = env[1];
  const protectedDiff = execFileSync('git',['diff','--name-only','--','supabase','utils/supabase','lib/actions','lib/validations','lib/public-data.ts','lib/portfolio-data.ts','lib/midtrans.ts','components/admin'],{cwd:root,encoding:'utf8'});
  equal(require('./product-translation-scope.cjs')(protectedDiff), '', 'No unrelated protected changes outside approved i18n/Product foundation scope');
  const beforePackage = JSON.parse(execFileSync('git',['show','HEAD:package.json'],{cwd:root,encoding:'utf8'}));
  const afterPackage = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  equal(afterPackage.dependencies['next-intl'],'4.14.9','Only approved i18n dependency pinned');
  delete afterPackage.dependencies['next-intl']; equal(afterPackage,beforePackage,'Other direct dependencies unchanged');
  console.log(`PASS: ${checks} unit/real-proxy checks; auth/recruitment transport mocked.`);
  if (!process.argv.includes('--unit')) await runtimeSmoke();
}
async function runtimeSmoke() {
  const { localizeHref, localeAlternates } = load('i18n/locales.ts');
  const app = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','-p','3198'], { cwd:root, env:{...process.env,NEXT_PUBLIC_SITE_URL:'https://autentik-web.vercel.app'}, stdio:['ignore','pipe','pipe'] });
  let logs = ''; app.stdout.on('data', d => logs += d); app.stderr.on('data', d => logs += d);
  const base = 'http://localhost:3198';
  try {
    for (let i=0;i<120&&!logs.includes('Ready in');i++) { if(app.exitCode!==null) throw Error(logs); await new Promise(r=>setTimeout(r,100)); }
    assert.ok(logs.includes('Ready in'), logs);
    for (const [prefix,locale] of [['','id'],['/en','en'],['/zh-cn','zh-CN']]) for (const page of ['','/products','/store']) {
      const response = await fetch(base + prefix + (page || '/'), { headers:{cookie:'autentik-locale=en'}, signal:AbortSignal.timeout(60000) });
      const html = await response.text();
      equal(response.status,200,'Built customer route resolves');
      equal(html.includes(`<html lang="${locale}"`),true,'SSR document language');
      equal(html.includes(`property="og:locale" content="${{id:'id_ID',en:'en_US','zh-CN':'zh_CN'}[locale]}"`),true,'OpenGraph locale');
      const pathname = page || '/';
      const canonical = 'https://autentik-web.vercel.app' + localizeHref(pathname,locale);
      const actualCanonical = html.match(/<link rel="canonical" href="([^"]+)"/);
      equal(actualCanonical && new URL(actualCanonical[1]).href,new URL(canonical).href,'Self canonical');
      for(const [lang,href] of Object.entries(localeAlternates(pathname))) {
        const alternate = html.match(new RegExp(`<link rel="alternate" hrefLang="${lang}" href="([^"]+)"`));
        equal(alternate && new URL(alternate[1]).href,new URL('https://autentik-web.vercel.app'+href).href,'SSR reciprocal alternate '+lang);
      }
    }
    for (const prefix of ['/en','/zh-cn']) {
      const response = await fetch(base+prefix+'/store/orders/FOUNDATION-NOT-AN-ORDER/print',{redirect:'manual',signal:AbortSignal.timeout(60000)});
      const printHtml = await response.text();
      const destination = response.headers.get('location') ?? printHtml.match(/NEXT_REDIRECT;replace;([^;]+);307/)?.[1];
      equal(Boolean(destination),true,'Customer print requires authentication (HTTP or streamed Next redirect)');
      equal(new URL(destination,base).pathname,prefix+'/auth/login','Print login preserves locale');
      equal(printHtml.includes('class="document-sheet"'),false,'No order proof before authentication');
      if(response.status===200)equal(printHtml.includes('content="noindex, nofollow"'),true,'Streamed print remains noindex');
    }
    const admin = await fetch(base+'/admin/login',{headers:{cookie:'autentik-locale=zh-CN'},signal:AbortSignal.timeout(60000)});
    const adminHtml = await admin.text();
    equal(adminHtml.includes('<html lang="id"'),true,'Admin remains Indonesian');
    equal(adminHtml.includes('data-language-switcher'),false,'No switcher in admin');
    for (const invalid of ['/fr/products','/en/admin/login','/zh-cn/auth/callback']) equal((await fetch(base+invalid,{signal:AbortSignal.timeout(60000)})).status,404,'Invalid route is 404');
    const robots = await fetch(base+'/robots.txt'); equal(robots.status,200,'Robots endpoint stable');
    equal((await robots.text()).includes('Disallow: /admin/'),true,'Admin crawl exclusion retained');
    const sitemap = await fetch(base+'/sitemap.xml',{signal:AbortSignal.timeout(60000)});
    const xml = await sitemap.text(); equal(sitemap.status,200,'Sitemap endpoint stable');
    for(const href of ['/products','/en/products','/zh-cn/products']) equal(xml.includes('https://autentik-web.vercel.app'+href),true,'Sitemap localized URLs');
    const concurrent = await Promise.all([['/products','id'],['/en/products','en'],['/zh-cn/products','zh-CN']].map(async([pathname,locale]) => {
      const html = await (await fetch(base+pathname,{signal:AbortSignal.timeout(60000)})).text();
      return {locale,correct:html.includes(`<html lang="${locale}"`)};
    }));
    for(const result of concurrent)equal(result.correct,true,'Concurrent locale isolation '+result.locale);
    for(const [endpoint,status] of [['/api/webhooks/midtrans',405],['/api/orders/FOUNDATION/status',401],['/api/integrations/mika/v1/products',401]]) {
      const response = await fetch(base+endpoint,{redirect:'manual',signal:AbortSignal.timeout(60000)});
      equal(response.status,status,'Machine method/auth contract unchanged');
      equal(response.headers.get('location'),null,'Machine endpoint has no locale redirect');
    }
    equal((await fetch(base+'/images/logo_aka/LOGO_AKA.jpg',{redirect:'manual'})).status,200,'Public image served without localization');
    const callback = await fetch(base+'/auth/callback?error=access_denied&next=%2Fen%2Fstore%2Fcheckout',{redirect:'manual'});
    equal(new URL(callback.headers.get('location')).pathname,'/en/auth/login','Unprefixed callback returns localized safe login');
    await require('./verify-public-i18n-browser.cjs')(base, equal);
    console.log(`PASS: ${checks} total Foundation checks; built-app anonymous HTTP/browser smoke and isolated transports. No authenticated/payment writes.`);
  } catch(error) { console.error(logs.replace(/https?:\/\/[^\s'\"]+/g,'[URL]')); throw error; }
  finally { app.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
