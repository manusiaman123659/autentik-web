/* eslint-disable @typescript-eslint/no-require-imports -- Real Store adapter/resolver; only cookie/auth/network boundaries are mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let checks = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

function loader(mocks = new Map()) {
  const loaded = new Map();
  return function load(file) {
    const filename = path.resolve(root, file);
    if (loaded.has(filename)) return loaded.get(filename).exports;
    const mod = new Module(filename); mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename)); loaded.set(filename, mod);
    const native = mod.require.bind(mod);
    mod.require = name => mocks.has(name) ? mocks.get(name)
      : name.startsWith('@/') ? load(name.slice(2) + '.ts')
      : name.startsWith('.') && !path.extname(name) ? load(path.relative(root, path.resolve(path.dirname(filename), name)) + '.ts')
      : native(name);
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
    return mod.exports;
  };
}

async function main() {
  const base = { id: 'component-1', slug: 'component-1', product_type: 'sparepart', name: 'Nama Indonesia', description: 'Deskripsi Indonesia', features: ['Fitur'],
    specs: [{ label: 'Tegangan', value: '12 V' }, { label: 'Material', value: 'Baja', value_kind: 'text' }], seo_title: 'SEO Indonesia', seo_description: null,
    brand: 'AKA', category: 'Kategori', sku: 'SKU-1', price: 20000, stock: 8, min_purchase_qty: 2, is_store_visible: true, status: 'published', is_active: true,
    deleted_at: null, translation_source_revision: 5, sort_order: 1 };
  const another = { ...base, id: 'component-2', slug: 'component-2', name: 'Kedua', sku: 'SKU-2', related_ids: null, sort_order: 2 };
  const stored = { product_id: base.id, locale: 'en', name: 'English name', description: 'English description', features: ['Feature'],
    specs: [{ label: 'Voltage', value_text: null }, { label: 'Material', value_text: 'Steel' }], seo_title: 'English SEO', seo_description: null,
    status: 'published', source_revision: 5 };
  const catalog = [base, another]; let rows = [stored]; let role = 'anon'; const queries = []; const memo = new Map();
  const matches = (row, filters) => filters.every(([field, value, kind]) => {
    const actual = field.startsWith('parent.') ? row.parent?.[field.slice(7)] : row[field];
    return kind === 'in' ? value.includes(actual) : kind === 'neq' ? actual !== value : actual === value;
  });
  const client = { from(table) {
    if (!['products', 'product_translations'].includes(table)) throw Error('Unapproved public table');
    const trace = { table, role, filters: [] }; queries.push(trace);
    const q = {
      select(value) { trace.select = value; return q; },
      eq(field, value) { trace.filters.push([field, value, 'eq']); return q; },
      neq(field, value) { trace.filters.push([field, value, 'neq']); return q; },
      is(field, value) { trace.filters.push([field, value, 'is']); return q; },
      in(field, value) { trace.filters.push([field, value, 'in']); trace.ids = value; return q; },
      limit(value) { trace.limit = value; return q; },
      async maybeSingle() { const matched = catalog.filter(row => matches(row, trace.filters)); return { data: matched[0] ?? null, error: null }; },
      async then(resolve) { // Supabase's PostgREST builder is awaitable.
        const available = table === 'products' ? catalog : rows.map(row => ({ ...row, parent: { id: row.product_id, status: 'published', is_active: true, deleted_at: null, translation_source_revision: 5 } }));
        const matched = available.filter(row => matches(row, trace.filters));
        return resolve({ data: trace.limit == null ? matched : matched.slice(0, trace.limit), error: null });
      },
    };
    return q;
  }, rpc() { throw Error('Public read must never mutate'); } };
  const mocks = new Map([
    ['server-only', {}],
    ['next/headers', { cookies: async () => ({}) }],
    ['@/utils/supabase/server', { createClient: () => client }],
    ['react', { ...require('react'), cache: fn => (...args) => { const key = JSON.stringify(args); if (!memo.has(key)) memo.set(key, fn(...args)); return memo.get(key); } }],
    ['@/lib/logger', { logError: () => {} }],
  ]);
  const load = loader(mocks);
  const projection = load('lib/public-store-presentation.ts');
  const api = load('lib/public-store-products.ts');

  check(projection.isPublicStoreProduct(base), true, 'Eligible Store product');
  for (const patch of [{ product_type: 'b2b_system' }, { is_store_visible: false }, { status: 'draft' }, { is_active: false }, { deleted_at: '2026-10-01' }, { deleted_at: undefined }]) {
    check(projection.isPublicStoreProduct({ ...base, ...patch }), false, 'Fail closed for public visibility ' + JSON.stringify(patch));
  }
  const frozen = Object.freeze({ ...base, features: Object.freeze([...base.features]), specs: Object.freeze(base.specs.map(spec => Object.freeze({ ...spec }))) });
  const before = JSON.stringify(frozen);
  const view = projection.projectStoreProduct(frozen, stored, 'en');
  check(view.canonical.name, 'Nama Indonesia', 'Canonical name not replaced by translated display');
  check(view.display, { name: 'English name', description: 'English description', features: ['Feature'], specs: [{ label: 'Voltage', value: '12 V' }, { label: 'Material', value: 'Steel' }], seo_title: 'English SEO', seo_description: null }, 'Resolved display and technical fallback');
  for (const field of ['id', 'slug', 'sku', 'brand', 'category', 'price', 'stock', 'min_purchase_qty']) check(view.canonical[field], frozen[field], 'Canonical invariant ' + field);
  check(JSON.stringify(frozen), before, 'Frozen canonical input never mutated');
  check(projection.toStoreRecentView(view), { id: base.id, slug: base.slug, brand: base.brand, image_url: null, price: base.price, displayName: 'English name' }, 'Recent DTO excludes raw translation and management data');
  for (const candidate of [null, { ...stored, status: 'draft' }, { ...stored, source_revision: 4 }, { ...stored, locale: 'zh-CN' }, { ...stored, product_id: 'foreign' }, { ...stored, features: [] }, { ...stored, specs: [{ label: 'Voltage', value_text: '900 V' }, stored.specs[1]] }]) {
    check(projection.projectStoreProduct(base, candidate, 'en').display.name, base.name, 'Invalid candidate falls back to Indonesian');
  }
  check(projection.projectStoreProduct(base, stored, 'id').display.name, base.name, 'ID always canonical');
  assert.throws(() => projection.projectStoreProduct({ ...base, status: 'draft' }, stored, 'en')); checks++;

  queries.length = 0;
  check((await api.resolvePublicStoreProducts([base], 'id'))[0].display.name, base.name, 'ID resolution no translation lookup');
  check(queries.length, 0, 'ID does not initialize Supabase');
  rows = [stored]; queries.length = 0;
  const resolved = await api.resolvePublicStoreProducts([base, base, another], 'en');
  check(resolved.map(item => item.canonical.id), [base.id, base.id, another.id], 'Order and duplicate input preserved');
  check(queries.length, 1, 'Duplicate IDs use one translation batch');
  check(queries[0].ids, [base.id, another.id], 'Unique IDs only');
  check(queries[0].filters.some(([field, value]) => field === 'locale' && value === 'en'), true, 'Only requested locale loaded');
  rows = [{ ...stored, locale: 'zh-CN', name: '中文名称' }]; queries.length = 0;
  check((await api.resolvePublicStoreProducts([base], 'zh-CN'))[0].display.name, '中文名称', 'Published ZH uses requested locale');
  check(queries[0].filters.some(([field, value]) => field === 'locale' && value === 'zh-CN'), true, 'ZH never queries EN');
  for (const candidate of [{ ...stored, status: 'draft' }, { ...stored, source_revision: 4 }, { ...stored, features: [] }]) {
    rows = [candidate];
    check((await api.resolvePublicStoreProducts([base], 'en'))[0].display.name, base.name, 'Server reader rejects Draft/stale/malformed translation');
  }
  rows = [stored];
  for (const state of ['anon', 'staff']) {
    role = state; queries.length = 0; memo.clear(); catalog.splice(0, catalog.length, base, another);
    const result = await api.getPublicStoreDetail(base.slug, 'en');
    check(result?.product.display.name, 'English name', state + ' gets eligible translation');
    check(result?.related.map(item => item.canonical.id), [another.id], state + ' related selection retains canonical order');
    check(queries.filter(q => q.table === 'product_translations').length, 1, state + ' detail and related read one translation batch');
    check(queries.filter(q => q.table === 'products').every(q => [['product_type', 'sparepart'], ['status', 'published'], ['is_active', true], ['is_store_visible', true], ['deleted_at', null]].every(([field, value]) => q.filters.some(([name, actual]) => name === field && actual === value))), true, state + ' explicit public filters independent of RLS');
    const productReads = queries.filter(q => q.table === 'products').length;
    const same = await api.getPublicStoreDetail(base.slug, 'en');
    check(same, result, state + ' metadata/page share request-scoped detail');
    check(queries.filter(q => q.table === 'products').length, productReads, state + ' cached call adds no reads');
  }
  const hidden = { ...base, id: 'hidden', slug: 'hidden', is_store_visible: false };
  const draft = { ...base, id: 'draft', slug: 'draft', status: 'draft' };
  const inactive = { ...base, id: 'inactive', slug: 'inactive', is_active: false };
  const archived = { ...base, id: 'archived', slug: 'archived', deleted_at: '2026-10-01' };
  const b2b = { ...base, id: 'b2b', slug: 'b2b', product_type: 'b2b_system' };
  catalog.splice(0, catalog.length, base, another, hidden, draft, inactive, archived, b2b);
  for (const state of ['anon', 'staff']) {
    role = state; memo.clear();
    for (const slug of ['hidden', 'draft', 'inactive', 'archived', 'b2b']) check(await api.getPublicStoreDetail(slug, 'en'), null, state + ' cannot see nonpublic detail ' + slug);
    queries.length = 0;
    const recent = await api.getPublicStoreRecentProducts(['hidden', 'draft', 'inactive', 'archived', 'b2b', another.id, base.id, base.id, 'extra'], 'en');
    check(recent.map(item => item.id), [another.id, base.id], state + ' recent preserves input order, excludes nonpublic and duplicate IDs');
    check(queries.filter(q => q.table === 'products')[0].ids.length <= 8, true, state + ' recent lookup bounded to eight IDs');
    check(recent.some(item => 'status' in item || 'source_revision' in item || 'version' in item), false, state + ' recent does not serialize management metadata');
  }
  catalog.splice(0, catalog.length, base, { ...another, brand: 'Other' }); memo.clear();
  check((await api.getPublicStoreDetail(base.slug, 'id'))?.related.map(item => item.canonical.id), [another.id], 'R-03 category-only fallback returns the eligible product');
  catalog.splice(0, catalog.length, base, ...Array.from({ length: 8 }, (_, index) => ({ ...another, id: `recent-${index}` })));
  const capped = await api.getPublicStoreRecentProducts([base.id, base.id, ...catalog.slice(1).map(item => item.id)], 'id');
  check(capped.map(item => item.id), [base.id, ...catalog.slice(1, 7).map(item => item.id)], 'Only first eight caller entries can influence recent lookup');
  const many = Array.from({ length: 205 }, (_, i) => ({ ...base, id: `p-${i}` }));
  queries.length = 0; await api.resolvePublicStoreProducts(many, 'zh-CN');
  check(queries.filter(q => q.table === 'product_translations').length, 3, '205 unique related/listing rows use bounded 100-row batches');
  check(queries.filter(q => q.table === 'product_translations').every(q => q.ids.length <= 100), true, 'Translation batch size is bounded');
  console.log(`PASS: ${checks} public Store localization data/presentation assertions; cookie-aware network mocked, no live database writes.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
