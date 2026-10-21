/* eslint-disable @typescript-eslint/no-require-imports -- Actual actions/loaders/routes with in-memory transport; no env files, network or database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cases = [];
let checks = 0;
const test = (name, run) => cases.push({ name, run });
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

function harness() {
  const state = { tables: new Map(), reads: [], writes: [], audits: [], paths: [], rpc: [], storage: [], allowed: true,
    readFailure: null, readThrow: false, nullData: false, writeError: null, childError: false, arrivals: 0, concurrent: 0, waiters: [] };
  const rows = table => { if (!state.tables.has(table)) state.tables.set(table, []); return state.tables.get(table); };
  const seed = (table, row) => rows(table).push(structuredClone(row));
  const client = { from(table) {
    let operation = 'read', record, pending;
    const filters = [];
    const execute = single => pending ??= (async () => {
      if (operation === 'read') {
        state.reads.push(table);
        if (state.readFailure === table) {
          if (state.readThrow) throw Error('fixture transport failure');
          return { data: null, error: { code: 'FIXTURE_READ', message: 'PRIVATE READ DETAIL' } };
        }
        if (state.nullData) return { data: null, error: null };
      } else {
        state.writes.push({ table, operation, record: structuredClone(record), filters: [...filters] });
        if (state.concurrent) {
          state.arrivals++;
          await new Promise(resolve => {
            state.waiters.push(resolve);
            if (state.arrivals === state.concurrent) state.waiters.splice(0).forEach(release => release());
          });
        }
        if (state.writeError) return { data: null, error: state.writeError };
      }
      const tableRows = rows(table);
      const matched = tableRows.filter(row => filters.every(([key, value, kind]) => kind === 'ilike'
        ? String(row[key]).toLowerCase() === String(value).toLowerCase() : row[key] === value));
      let result = matched;
      if (operation === 'insert' || operation === 'upsert') {
        const existing = tableRows.find(row => row.id === record.id);
        if (existing && operation === 'insert') return { data: null, error: { code: '23505', message: 'PRIVATE CONSTRAINT DETAIL' } };
        if (existing) Object.assign(existing, record);
        else tableRows.push(structuredClone(record));
        result = [existing ?? tableRows.at(-1)];
      } else if (operation === 'update') {
        matched.forEach(row => Object.assign(row, record));
      }
      return { data: single ? result[0] ?? null : result, error: null };
    })();
    const q = {
      select: () => q, order: () => q,
      eq: (key, value) => { filters.push([key, value, 'eq']); return q; },
      is: (key, value) => { filters.push([key, value, 'eq']); return q; },
      ilike: (key, value) => { filters.push([key, value, 'ilike']); return q; },
      insert: value => { operation = 'insert'; record = value; return q; },
      update: value => { operation = 'update'; record = value; return q; },
      upsert: value => { operation = 'upsert'; record = value; return q; },
      maybeSingle: () => execute(true), single: () => execute(true),
      then: (resolve, reject) => execute(false).then(resolve, reject),
    };
    return q;
  }, async rpc(name, args) {
    state.rpc.push({ name, args });
    return { error: state.childError ? { code: 'FIXTURE_CHILD', message: 'child warning' } : null };
  }, storage: { from: bucket => ({ remove: async objects => { state.storage.push({ bucket, objects }); return { error: null }; } }) } };
  const actor = async () => state.allowed ? { id: 'fixture-actor' } : null;
  const editor = props => ({ type: 'fixture-editor', props });
  const mocks = new Map([
    ['server-only', {}], ['next/headers', { cookies: async () => ({}) }],
    ['next/cache', { revalidatePath: p => state.paths.push(p) }],
    ['next/navigation', { notFound: () => { throw Error('NOT_FOUND'); } }],
    ['next/link', { __esModule: true, default: 'a' }],
    ['@/utils/supabase/server', { createClient: () => client }],
    ['@/lib/admin', { requireOperationalStaff: actor, requireContentManager: actor, requireAdmin: actor, getAdminUser: actor,
      requireCapability: async () => { if (!state.allowed) throw Error('ACCESS_DENIED'); return actor(); } }],
    ['@/lib/audit', { recordAudit: async (...args) => state.audits.push(args) }],
    ['@/lib/product-public-revalidation', { revalidateB2BProduct: slugs => state.paths.push(...slugs) }],
    ['@/lib/admin-product-translations', { readManagedProductTranslations: async () => [] }],
    ['@/components/admin/ProductEditor', { __esModule: true, default: editor }],
    ['@/components/admin/ui', { PageHeader: 'h1' }],
  ]);
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, mod);
    const native = mod.require.bind(mod);
    mod.require = name => {
      if (mocks.has(name)) return mocks.get(name);
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
        const resolved = ['.ts', '.tsx', '.json'].map(ext => base + ext).find(f => fs.existsSync(f));
        if (resolved?.endsWith('.json')) return native(resolved);
        if (resolved) return load(resolved);
      }
      return native(name);
    };
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText, filename);
    return mod.exports;
  }
  return { state, rows, seed, load, editor };
}

const b2b = { slug: 'fixture', name: 'Produk Fixture', brand: 'AKA', brandId: 'aka', category: 'Fixture',
  description: 'Deskripsi produk fixture.', brandColor: '#0EA5A0', categoryColor: '#0B1F3A', productType: 'b2b_system' };
const entities = [
  { label: 'B2B', file: 'products', action: 'upsertProduct', table: 'products', input: b2b, id: 'fixture' },
  { label: 'Komponen', file: 'products', action: 'upsertProduct', table: 'products', id: 'fixture',
    input: { ...b2b, productType: 'sparepart', sku: 'FIXTURE', price: 20000, stock: 12, weightGrams: 500 } },
  { label: 'Merek', file: 'brands', action: 'upsertBrand', table: 'brands', id: 'fixture',
    input: { name: 'Fixture', slug: 'fixture', segment: 'Lab', segmentColor: 'teal', accentColor: '#0EA5A0' } },
  { label: 'Karir', file: 'careers', action: 'upsertCareer', table: 'careers', id: 'fixture',
    input: { slug: 'fixture', title: 'Fixture', department: 'AKA', location: 'Office', type: 'Full-time', typeBadgeColor: 'green', summary: 'Fixture', description: 'Fixture' } },
  { label: 'Tim', file: 'relasi', action: 'saveTeamMember', table: 'team_members', id: 'fixture', input: { name: 'Fixture', role: 'Fixture', roleColor: 'teal' } },
  { label: 'Grup', file: 'relasi', action: 'saveGroupCompany', table: 'group_companies', id: 'fixture', input: { name: 'Fixture' } },
  { label: 'Partner', file: 'relasi', action: 'savePartner', table: 'partners', id: 'fixture', input: { name: 'Fixture', shortName: 'Fixture' } },
];
const noSuccessEffects = state => {
  eq(state.audits, [], 'No success audit'); eq(state.paths, [], 'No success invalidation');
  eq(state.rpc, [], 'No child RPC'); eq(state.storage, [], 'No Storage cleanup');
};
for (const entity of entities) {
  const action = h => h.load(`lib/actions/${entity.file}.ts`)[entity.action];
  test(`${entity.label}: duplicate create preserves existing record`, async () => {
    const h = harness(); const original = { id: entity.id, name: 'Existing', slug: 'old-slug', stock: 99, marker: 'KEEP', deleted_at: null };
    h.seed(entity.table, original);
    const result = await action(h)(entity.input, [], [], []);
    eq(result.success, false, 'Duplicate must fail'); eq(h.rows(entity.table), [original], 'Existing data unchanged');
    assert.ok(Object.keys(result.errors ?? {}).length, 'Visible field error'); checks++;
    assert.ok(!JSON.stringify(result).includes('PRIVATE'), 'Do not expose constraint details'); checks++;
    noSuccessEffects(h.state);
  });
  test(`${entity.label}: concurrent creates cannot overwrite`, async () => {
    const h = harness(); h.state.concurrent = 2;
    const save = action(h);
    const results = await Promise.all([save(entity.input), save({ ...entity.input, description: 'A different payload from the second request.' })]);
    eq(h.state.arrivals, 2, 'Both requests reached the write barrier');
    eq(results.filter(r => r.success).length, 1, 'Exactly one create succeeds');
    eq(h.rows(entity.table).length, 1, 'One row remains'); eq(h.state.audits.length, 1, 'One success audit');
    eq(h.state.writes.map(w => w.operation), ['insert', 'insert'], 'Atomic INSERT is the conflict boundary, not check-then-upsert');
  });
  test(`${entity.label}: nonexistent update does not insert`, async () => {
    const h = harness(); eq((await action(h)({ ...entity.input, id: 'missing' }, [], [], [])).success, false);
    eq(h.rows(entity.table), [], 'No replacement record'); noSuccessEffects(h.state);
  });
  test(`${entity.label}: valid update preserves ID and intentional empty fields`, async () => {
    const h = harness(); h.seed(entity.table, { id: 'immutable-id', slug: 'old-slug', name: 'Old', marker: 'KEEP', deleted_at: null });
    eq((await action(h)({ ...entity.input, id: ' immutable-id ', imageUrl: '', logoUrl: '', bio: '' })).success, true);
    eq(h.rows(entity.table).length, 1); eq(h.rows(entity.table)[0].id, 'immutable-id'); eq(h.rows(entity.table)[0].marker, 'KEEP');
    eq(h.state.writes[0].operation, 'update'); eq(h.state.writes[0].filters.some(([k,v]) => k === 'id' && v === 'immutable-id'), true);
    if (entity.table === 'team_members') eq(h.rows(entity.table)[0].bio, '');
    eq(h.state.audits[0][0].endsWith('.updated'), true);
  });
  test(`${entity.label}: blank ID remains create`, async () => {
    const h = harness(); eq((await action(h)({ ...entity.input, id: '  ' })).success, true);
    eq(h.state.writes[0].operation, 'insert'); eq(h.state.audits[0][0].endsWith('.created'), true);
  });
  test(`${entity.label}: authorization and validation precede mutation`, async () => {
    const h = harness(); h.state.allowed = false; eq((await action(h)(entity.input, [], [], [])).success, false);
    eq(h.state.reads, []); eq(h.state.writes, []); noSuccessEffects(h.state);
    h.state.allowed = true; eq((await action(h)({})).success, false); eq(h.state.writes, []);
  });
  test(`${entity.label}: failed parent write has no success side effects`, async () => {
    for (const code of ['23505', '42501', 'FIXTURE_WRITE']) {
      const h = harness(); h.seed(entity.table, { id: entity.id, deleted_at: null,
        brochure_url: 'https://fixture.supabase.co/storage/v1/object/public/media/products/old.pdf' });
      h.state.writeError = { code, message: 'PRIVATE WRITE DETAIL' };
      const before = structuredClone(h.rows(entity.table));
      eq((await action(h)({ ...entity.input, id: entity.id }, [], [], [])).success, false);
      eq(h.rows(entity.table), before); noSuccessEffects(h.state);
    }
  });
}

const children = [
  ['product_variants', 'getProductVariants', 'sparepart', 'initialVariants', 'upsert_product_variants', 'p_variants'],
  ['product_hotspots', 'getProductHotspots', 'produk', 'initialHotspots', 'upsert_product_hotspots', 'p_hotspots'],
  ['product_photo_hotspots', 'getProductPhotoHotspots', 'produk', 'initialPhotoHotspots', 'upsert_product_photo_hotspots', 'p_hotspots'],
];
const childRow = { id: '00000000-0000-4000-8000-000000000001', product_id: 'fixture', label: '1 m', title: 'Hotspot',
  stock: 7, price_override: 25000, position_x: 1, position_y: 2, position_z: 3, description: 'Existing', deleted_at: null,
  target_image_url: '/fixture.jpg', callout_image_url: 'https://fixture.supabase.co/storage/v1/object/public/media/products/photo-hotspots/old.png' };
function seedProduct(h, route) {
  h.seed('products', { id: 'fixture', slug: 'fixture', name: 'Produk Fixture', description: 'Deskripsi produk fixture.',
    product_type: route === 'sparepart' ? 'sparepart' : 'b2b_system', brand: 'AKA', category: 'Fixture',
    status: 'published', is_active: true, deleted_at: null, translation_source_revision: 1,
    features: [], specs: [], seo_title: null, seo_description: null });
}
function findEditor(node, editor) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === editor) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const found = findEditor(child, editor); if (found) return found; }
  return null;
}
for (const [table, reader, route, prop, rpc, key] of children) {
  test(`${reader}: errors are not loaded-empty`, async () => {
    for (const mode of ['error', 'throw', 'null']) {
      const h = harness(); h.state.readFailure = mode === 'null' ? null : table;
      h.state.readThrow = mode === 'throw'; h.state.nullData = mode === 'null';
      await assert.rejects(() => h.load('lib/admin-data.ts')[reader]('fixture')); checks++;
      noSuccessEffects(h.state);
    }
  });
  test(`${reader}: successful empty and populated loads remain valid`, async () => {
    const h = harness(); const read = h.load('lib/admin-data.ts')[reader];
    eq(await read('fixture'), []); h.seed(table, childRow); eq(await read('fixture'), [childRow]);
    h.state.allowed = false; const reads = h.state.reads.length;
    await assert.rejects(() => read('fixture')); checks++; eq(h.state.reads.length, reads);
  });
  test(`${reader}: edit page fails closed, then reload retains child data`, async () => {
    const h = harness(); seedProduct(h, route); h.seed(table, childRow); h.state.readFailure = table;
    const page = h.load(`app/admin/(dashboard)/${route}/[id]/page.tsx`).default;
    const props = { params: Promise.resolve({ id: 'fixture' }), searchParams: Promise.resolve({}) };
    await assert.rejects(() => page(props)); checks++; noSuccessEffects(h.state);
    h.state.readFailure = null;
    const rendered = findEditor(await page(props), h.editor);
    assert.ok(rendered, 'Editor only returned after successful reload'); checks++;
    eq(rendered.props[prop][0].id, childRow.id); eq(h.rows(table), [childRow]);
    h.rows(table).length = 0; eq(findEditor(await page(props), h.editor).props[prop], [], 'Successful-empty opens editor');
  });
  test(`${reader}: undefined skips RPC; intentional [] still clears`, async () => {
    const h = harness(); seedProduct(h, route); h.seed(table, childRow);
    const input = { ...(route === 'sparepart' ? entities[1].input : b2b), id: 'fixture' };
    const save = h.load('lib/actions/products.ts').upsertProduct;
    eq((await save(input)).success, true); eq(h.state.rpc, []);
    const args = [undefined, undefined, undefined]; args[children.findIndex(c => c[0] === table)] = [];
    eq((await save(input, ...args)).success, true);
    eq(h.state.rpc, [{ name: rpc, args: { p_product_id: 'fixture', [key]: [] } }]);
    if (table === 'product_photo_hotspots') eq(h.state.storage.at(-1).objects, ['products/photo-hotspots/old.png']);
  });
}
test('Existing child-warning/parent-success contract remains intact', async () => {
  const h = harness(); seedProduct(h, 'produk'); h.state.childError = true;
  const result = await h.load('lib/actions/products.ts').upsertProduct({ ...b2b, id: 'fixture' }, undefined, []);
  eq(result.success, true); assert.ok(result.hotspotWarning); checks++; eq(h.state.audits.length, 1);
  assert.ok(h.state.paths.length); checks++;
});
test('Admin error button refetches through Next 16.3 retry', () => {
  const h = harness(); let retries = 0; let resets = 0;
  const boundary = h.load('app/admin/error.tsx').default;
  function findButton(node) {
    if (!node || typeof node !== 'object') return null;
    if (typeof node.type === 'function') return findButton(node.type(node.props));
    if (node.type === 'button') return node;
    for (const child of [node.props?.children].flat(Infinity)) { const found = findButton(child); if (found) return found; }
    return null;
  }
  const button = findButton(boundary({ error: Error('fixture'), retry: () => retries++, reset: () => resets++ }));
  assert.ok(button); checks++; button.props.onClick(); eq(retries, 1, 'Refetch, not just error-state reset'); eq(resets, 0);
});

async function main() {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.supabase.co';
  let failed = 0;
  try {
    for (const { name, run } of cases) {
      try { await run(); } catch (error) { failed++; console.error(`FAIL ${name}: ${error.message.split('\n')[0]}`); }
    }
  } finally {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  }
  console.log(`${failed ? 'RED' : 'GREEN'}: ${cases.length - failed}/${cases.length} scenarios; ${checks} assertions passed. Actual modules, mocked transport/unique-key race; no DB/SQL/network.`);
  if (failed) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
