/* eslint-disable @typescript-eslint/no-require-imports -- Actual modules with in-memory query/auth boundaries; no env, network, SQL or database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
let checks = 0, failures = 0, scenarios = 0;
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
async function test(name, run) {
  scenarios++;
  try { await run(); console.log('PASS', name); }
  catch (error) { failures++; console.error('FAIL', name, '\n' + error.stack); }
}
function loader(mocks = new Map()) {
  const cache = new Map();
  return function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, mod);
    const native = mod.require.bind(mod);
    const resolve = base => fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx';
    mod.require = name => mocks.has(name) ? mocks.get(name)
      : name.startsWith('@/') ? load(resolve(name.slice(2)))
      : name.startsWith('.') && !path.extname(name) ? load(resolve(path.relative(root, path.resolve(path.dirname(filename), name)))) : native(name);
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
    return mod.exports;
  };
}
const product = (id, patch = {}) => ({ id, slug: id, name: 'Canonical ' + id, description: '', brand: 'AKA', category: 'Sensor', product_type: 'sparepart', status: 'published', is_active: true, is_store_visible: true, deleted_at: null, updated_at: '2026-10-01T00:00:00Z', features: [], specs: [], translation_source_revision: 1, price: 100, stock: 10, ...patch });
function dataHarness(catalog, role = 'staff', translations = []) {
  const queries = [];
  const publicRow = row => row.status === 'published' && row.is_active === true && row.deleted_at === null;
  const client = { from(table) {
    const trace = { table, filters: [], limit: null }; queries.push(trace);
    const result = () => {
      const source = table === 'products' ? catalog.filter(row => role === 'staff' || publicRow(row)) : translations.map(row => {
        const parent = catalog.find(p => p.id === row.product_id);
        return { ...row, parent: parent ? { id: parent.id, status: parent.status, is_active: parent.is_active, deleted_at: parent.deleted_at, translation_source_revision: parent.translation_source_revision } : null };
      });
      const rows = source.filter(row => trace.filters.every(([field, value, kind]) => {
        const actual = field.startsWith('parent.') ? row.parent?.[field.slice(7)] : row[field];
        return kind === 'in' ? value.includes(actual) : kind === 'neq' ? actual !== value : actual === value;
      }));
      return { data: trace.limit === null ? rows : rows.slice(0, trace.limit), error: null };
    };
    const q = { select: () => q, order: () => q,
      eq: (key, value) => { trace.filters.push([key, value, 'eq']); return q; },
      is: (key, value) => { trace.filters.push([key, value, 'is']); return q; },
      neq: (key, value) => { trace.filters.push([key, value, 'neq']); return q; },
      in: (key, value) => { trace.filters.push([key, value, 'in']); return q; },
      limit: value => { trace.limit = value; return q; },
      maybeSingle: async () => ({ ...result(), data: result().data[0] ?? null }),
      then: resolve => Promise.resolve(result()).then(resolve),
    }; return q;
  }, rpc: () => { throw Error('RPC must remain unused'); } };
  const mocks = new Map([
    ['server-only', {}], ['next/headers', { cookies: async () => ({}) }],
    ['@/utils/supabase/server', { createClient: () => client }],
    ['react', { ...React, cache: fn => fn }],
    ['@/lib/public-url', { getCanonicalOrigin: () => 'https://fixture.invalid' }],
    ['@/lib/api/mika-career', { getAllPublicMikaJobs: async () => [{ id: 42, created_at: null }] }],
  ]);
  return { load: loader(mocks), queries };
}
async function main() {
  const hidden = [product('draft', { status: 'draft' }), product('inactive', { is_active: false }), product('archived', { deleted_at: '2026-10-01' }), product('hidden', { is_store_visible: false })];
  await test('R-08: Store sitemap public eligibility identical for anon/staff, with all locale alternates', async () => {
    const catalog = [product('public'), ...hidden, product('b2b', { product_type: 'b2b_system' })];
    let anon;
    for (const role of ['anon', 'staff']) {
      const h = dataHarness(catalog, role);
      const entries = await h.load('app/sitemap.ts').default();
      const store = entries.filter(entry => /\/store\//.test(entry.url));
      eq(store.map(entry => new URL(entry.url).pathname).sort(), ['/store/public', '/en/store/public', '/zh-cn/store/public'].sort(), role + ' public Store URLs only');
      for (const entry of store) {
        eq(Object.keys(entry.alternates.languages).sort(), ['en', 'id', 'x-default', 'zh-CN'].sort(), 'Locale alternates preserved');
        eq(entry.lastModified.toISOString(), '2026-10-01T00:00:00.000Z', 'Canonical timestamp retained');
      }
      eq(entries.some(entry => entry.url === 'https://fixture.invalid/products/b2b'), true, 'B2B sitemap preserved');
      eq(entries.some(entry => entry.url === 'https://fixture.invalid/careers/42'), true, 'Recruitment sitemap preserved');
      if (anon) eq(store, anon, 'Staff cannot widen Store eligibility'); else anon = store;
    }
  });
  const cases = [
    ['category only', [product('category', { brand: 'Other' })], ['category']],
    ['one brand, duplicate category prefix', [product('brand'), ...Array.from({ length: 5 }, (_, i) => product('category-' + i, { brand: 'Other' }))], ['brand', 'category-0', 'category-1', 'category-2']],
    ['three brands, category duplicates cannot consume the remaining slot', [product('b0'), product('b1'), product('b2'), product('fill', { brand: 'Other' })], ['b0', 'b1', 'b2', 'fill']],
    ['full brand does not query category', Array.from({ length: 6 }, (_, i) => product('brand-' + i)), ['brand-0', 'brand-1', 'brand-2', 'brand-3']],
    ['short catalog', [product('one')], ['one']],
    ['no eligible match', [], []],
  ];
  for (const [name, matches, expected] of cases) for (const role of ['anon', 'staff']) {
    await test('R-03: ' + role + ' ' + name, async () => {
      const current = product('self');
      const h = dataHarness([current, ...hidden, product('b2b', { product_type: 'b2b_system' }), ...matches], role);
      const result = await h.load('lib/public-store-products.ts').getPublicStoreDetail(current.slug, 'id');
      const ids = result.related.map(p => p.canonical.id);
      eq(ids, expected, 'Brand priority plus category supplement'); eq(new Set(ids).size, ids.length, 'No duplicates');
      eq(ids.includes('self'), false, 'Self excluded'); eq(ids.length <= 4, true, 'Four-product cap');
      const category = h.queries.filter(q => q.filters.some(([field]) => field === 'category'));
      eq(category.length, matches.length >= 4 && matches.every(p => p.brand === 'AKA') ? 0 : 1, 'Category only queried when needed');
    });
  }
  await test('R-03: explicit related IDs preserve priority, exclude self and nonpublic rows', async () => {
    const current = product('self', { related_ids: ['self', 'picked', 'picked', 'draft'] });
    const h = dataHarness([current, product('picked'), ...hidden, product('other')]);
    const result = await h.load('lib/public-store-products.ts').getPublicStoreDetail(current.slug, 'id');
    eq(result.related.map(p => p.canonical.id), ['picked'], 'Explicit public IDs remain preferred');
    eq(h.queries.some(q => q.filters.some(([field]) => field === 'brand' || field === 'category')), false, 'No fallback after explicit match');
  });
  for (const locale of ['id', 'en', 'zh-CN']) await test('R-03: category fallback localized without changing canonical/cart fields: ' + locale, async () => {
    const current = product('self'); const related = product('related', { brand: 'Other', sku: 'AKA-1', min_purchase_qty: 2 });
    const h = dataHarness([current, related], 'staff', [{ product_id: related.id, locale, status: 'published', source_revision: 1, name: 'Translated ' + locale, description: '', seo_title: null, seo_description: null, features: [], specs: [] }]);
    const result = await h.load('lib/public-store-products.ts').getPublicStoreDetail(current.slug, locale);
    eq(result.related.length, 1, 'Related product exists');
    const view = result.related[0];
    eq(view.display.name, locale === 'id' ? related.name : 'Translated ' + locale, 'Active locale display');
    for (const key of ['id', 'slug', 'name', 'sku', 'price', 'stock', 'min_purchase_qty']) eq(view.canonical[key], related[key], 'Canonical invariant ' + key);
  });
  for (const locale of ['id', 'en', 'zh-CN']) for (const variant of ['desktop', 'mobile']) for (const signedIn of [false, true]) {
    await test(`R-02: no misleading Wishlist navigation, ${locale}/${variant}/${signedIn}`, () => {
      const states = [false, signedIn, 'Fixture customer', signedIn, true]; let cursor = 0;
      const locales = loader()('i18n/locales.ts');
      const messages = { navigation: require('../messages/' + locale + '/navigation.json'), common: require('../messages/' + locale + '/common.json') };
      const translate = namespace => require('use-intl/core').createTranslator({ locale, namespace, messages });
      const load = loader(new Map([
        ['react', { ...React, useState: () => [states[cursor++], () => {}], useEffect: () => {}, useRef: () => ({ current: null }) }],
        ['next-intl', { useTranslations: translate }],
        ['@/utils/supabase/client', { createClient: () => ({}) }],
        ['@/components/store/useWishlist', { useWishlist: () => ({ items: [product('saved')], hydrated: true }) }],
        ['@/i18n/navigation', { __esModule: true, default: ({ href, children, ...props }) => React.createElement('a', { ...props, href: locales.localizeHref(href, locale) }, children), useRouter: () => ({}) }],
      ]));
      const tree = load('components/auth/CustomerAuthButton.tsx').default({ variant });
      const html = renderToStaticMarkup(tree);
      eq(html.includes(translate('navigation')('wishlist')), false, 'Removed by explicit user decision; no substitute dead link');
      if (signedIn) {
        eq(html.includes(locales.localizeHref('/store/orders', locale)), true, 'Order history remains');
        eq(html.includes('href="/admin"'), true, 'CMS shortcut remains unprefixed');
        eq(html.includes(translate('navigation')('logout')), true, 'Logout remains');
      } else eq(html.includes(locales.localizeHref('/auth/login', locale)), true, 'Login remains');
    });
  }
  await test('R-02: existing Wishlist hook and heart still save, remove and persist favorites', () => {
    const storage = new Map(), states = []; let cursor = 0; let mounted = false; const effects = [];
    const savedWindow = global.window;
    global.window = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
    try {
      const load = loader(new Map([['react', { useState: initial => {
        const slot = cursor++; if (!(slot in states)) states[slot] = initial;
        return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }];
      }, useEffect: fn => { if (!mounted) effects.push(fn); }, useCallback: fn => fn, useMemo: fn => fn() }],
      ['next-intl', { useTranslations: () => key => key }]]));
      const hook = load('components/store/useWishlist.ts').useWishlist;
      const render = () => { cursor = 0; return hook(); };
      render(); mounted = true; effects.forEach(run => run());
      let value = render(); eq(value.hydrated, true, 'Hydration retained'); eq(value.items, [], 'Initially empty');
      const saved = { id: 'saved', slug: 'saved', name: 'Canonical saved', brand: 'AKA', image_url: null, price: 100 };
      value.toggle(saved); value = render(); eq(value.has(saved.id), true, 'Favorite added');
      eq(JSON.parse(storage.get('autentik-wishlist:v1')), [saved], 'Existing storage contract unchanged');
      const button = load('components/store/WishlistButton.tsx').default;
      cursor = 0; const heart = button({ product: saved }); eq(heart.props['aria-pressed'], true, 'Heart reads stored favorite');
      heart.props.onClick({ preventDefault() {}, stopPropagation() {} });
      value = render(); eq(value.has(saved.id), false, 'Heart removes favorite');
      eq(JSON.parse(storage.get('autentik-wishlist:v1')), [], 'Removal persisted');
    } finally { if (savedWindow === undefined) delete global.window; else global.window = savedWindow; }
  });
  console.log(`${failures ? 'RED' : 'GREEN'}: ${scenarios - failures}/${scenarios} scenarios; ${checks} assertions passed; ${failures} failures. No network/database.`);
  if (failures) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
