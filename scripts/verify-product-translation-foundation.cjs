/* eslint-disable @typescript-eslint/no-require-imports -- Actual domain modules; only auth/Next/network boundaries are fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
let checks = 0;
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
function loader(mocks = new Map()) {
  const cache = new Map();
  return function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename); compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, compiled);
    const native = compiled.require.bind(compiled);
    compiled.require = name => {
      if (mocks.has(name)) return mocks.get(name);
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      if (name.startsWith('.') && !path.extname(name)) return load(path.relative(root, path.resolve(path.dirname(filename), name)) + '.ts');
      return native(name);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
    return compiled.exports;
  };
}
async function main() {
  for (const file of ['lib/product-translations.ts', 'lib/validations/productTranslationSchema.ts', 'lib/product-translation-data.ts', 'lib/actions/productTranslations.ts', 'supabase/migrations/0066_product_translation_foundation.sql']) {
    equal(fs.existsSync(path.join(root, file)), true, 'Required foundation artifact: ' + file);
  }
  const load = loader();
  const { resolveLocalizedProductContent, validateProductTranslationBlocks } = load('lib/product-translations.ts');
  const { productTranslationSaveSchema } = load('lib/validations/productTranslationSchema.ts');
  const source = { id: 'source-product', slug: 'source-slug', brand: 'ULLUN', sku: 'SKU-ASLI', product_type: 'b2b_system', name: 'NAMA ASLI', description: 'DESKRIPSI ASLI', features: ['Fitur A', 'Fitur B'], specs: [{ label: 'Volume', value: '850 L' }, { label: 'Material', value: 'Baja tahan karat', value_kind: 'text' }], seo_title: 'SEO ASLI', seo_description: null, status: 'published', is_active: true, deleted_at: null, is_store_visible: false, translation_source_revision: 5 };
  const before = JSON.stringify(source);
  const row = { product_id: source.id, locale: 'en', status: 'published', source_revision: 5, name: 'Localized name', description: null, features: ['Feature A', 'Feature B'], specs: [{ label: 'Capacity', value_text: null }, { label: 'Material', value_text: 'Stainless steel' }], seo_title: null, seo_description: 'Localized SEO' };
  const base = { name: 'NAMA ASLI', description: 'DESKRIPSI ASLI', features: ['Fitur A', 'Fitur B'], specs: [{ label: 'Volume', value: '850 L' }, { label: 'Material', value: 'Baja tahan karat' }], seo_title: 'SEO ASLI', seo_description: null };
  equal(resolveLocalizedProductContent(source, row, 'id'), base, 'ID does not use translations');
  for (const translation of [null, undefined, { ...row, status: 'draft' }, { ...row, source_revision: 4 }, { ...row, locale: 'zh-CN' }, { ...row, product_id: 'foreign' }, { ...row, features: ['only one'] }, { ...row, specs: [{ label: 'bad', value: '220 V' }] }, { ...row, price: 1 }]) equal(resolveLocalizedProductContent(source, translation, 'en'), base, 'Missing/draft/stale/malformed/foreign fails closed');
  equal(resolveLocalizedProductContent(source, row, 'en'), { name: 'Localized name', description: 'DESKRIPSI ASLI', features: ['Feature A', 'Feature B'], specs: [{ label: 'Capacity', value: '850 L' }, { label: 'Material', value: 'Stainless steel' }], seo_title: 'SEO ASLI', seo_description: 'Localized SEO' }, 'Current translation overlays presentation only');
  equal(resolveLocalizedProductContent(source, { ...row, locale: 'zh-CN', name: '产品名称' }, 'zh-CN').name, '产品名称', 'Chinese locale uses the same resolver');
  equal(resolveLocalizedProductContent(source, { ...row, name: ' \n ', features: null, specs: null }, 'en').name, source.name, 'Blank optional name cannot suppress source');
  equal(resolveLocalizedProductContent(source, { ...row, features: null, specs: null }, 'en').specs, base.specs, 'NULL structured block falls back as a whole');
  for (const patch of [{ status: 'draft' }, { is_active: false }, { deleted_at: '2026-01-01' }]) equal(resolveLocalizedProductContent({ ...source, ...patch }, row, 'en'), base, 'Ineligible parent never localized');
  const missingDeletion = { ...source }; delete missingDeletion.deleted_at;
  equal(resolveLocalizedProductContent(missingDeletion, row, 'en'), base, 'Missing deletion metadata is not proof of eligibility');
  equal(resolveLocalizedProductContent(source, { product_id: source.id, locale: 'en', status: 'published', source_revision: 5, name: 'partial projection' }, 'en'), base, 'Incomplete stored projection fails closed');
  equal(resolveLocalizedProductContent({ ...source, features: {}, specs: [null] }, null, 'en').features, [], 'Malformed canonical JSON does not throw during fallback');
  equal(resolveLocalizedProductContent(source, { ...row, specs: [{ label: 'Capacity', value_text: '900 L' }, row.specs[1]] }, 'en'), base, 'Technical override rejected');
  const payload = { name: '  English name  ', features: [{ source_index: 0, text: 'Feature A' }, { source_index: 1, text: 'Feature B' }], specs: [{ source_index: 0, label: 'Capacity' }, { source_index: 1, label: 'Material', value_text: 'Stainless steel' }], description: ' \t\n ' };
  const input = { productId: source.id, locale: 'en', payload, status: 'published', expectedSourceRevision: 5, expectedTranslationVersion: null };
  const parsed = productTranslationSaveSchema.safeParse(input);
  equal(parsed.success, true, 'Valid source-indexed request accepted');
  equal(parsed.data.payload.name, 'English name', 'Strings normalized');
  equal(parsed.data.payload.description, null, 'Whitespace means fallback');
  equal(validateProductTranslationBlocks(source, parsed.data.payload), true, 'Matching source block accepted');
  for (const patch of [{ features: payload.features.slice(0, 1) }, { features: [...payload.features].reverse() }, { specs: [{ ...payload.specs[0], value_text: '900 L' }, payload.specs[1]] }, { specs: [...payload.specs].reverse() }]) equal(validateProductTranslationBlocks(source, { ...parsed.data.payload, ...patch }), false, 'Count/order/technical violation rejected');
  for (const patch of [{ locale: 'id' }, { locale: 'zh-cn' }, { expectedSourceRevision: 0 }, { expectedTranslationVersion: -1 }, { payload: { stock: 10 } }, { payload: { name: ' \n ' } }, { payload: { features: [] } }]) equal(productTranslationSaveSchema.safeParse({ ...input, ...patch }).success, false, 'Invalid identity/version/empty publication rejected');
  equal(productTranslationSaveSchema.safeParse({ ...input, expectedTranslationVersion: 1 }).success, false, 'Existing version requires row UUID against delete/recreate ABA');
  equal(productTranslationSaveSchema.safeParse({ ...input, expectedTranslationVersion: 1, expectedTranslationId: '00000000-0000-4000-8000-000000000001' }).success, true, 'Version and identity form an update expectation');
  equal(productTranslationSaveSchema.safeParse({ ...input, payload: { name: '𠮷'.repeat(400) } }).success, true, 'Chinese supplementary characters use PostgreSQL character-count limits');
  sourceSupportChecks(load, source);
  equal(JSON.stringify(source), before, 'Resolver does not mutate source');
  const presentation = resolveLocalizedProductContent(source, row, 'en'); presentation.features.reverse(); presentation.specs[0].value = 'changed'; equal(JSON.stringify(source), before, 'Returned arrays do not alias canonical source');
  await adapterChecks(source, row);
  await actionChecks(source, input);
  await managementChecks(source, row);
  const domainChecks = checks;
  migrationChecks();
  hotfixChecks();
  auditEvidenceChecks();
  console.log(`DOMAIN / TRANSPORT CONTRACT: PASS (${domainChecks} checks; actual modules, isolated auth/network).`);
  console.log(`MIGRATION STATIC CONTRACT: PASS (${checks - domainChecks} checks; SQL execution not claimed).`);
  if (process.argv.includes('--dev')) await devChecks();
  console.log(`PASS: ${checks} Product translation foundation domain/adapter/action/static migration checks.`);
  console.log('LIVE DATABASE CONTRACT: separate verifier/user SQL audit; this isolated run does not claim live results.');
}
async function devChecks() {
  const { spawn } = require('node:child_process'); const os = require('node:os');
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'product-translation-dev-'));
  const browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--no-first-run', `--user-data-dir=${profile}`, '--remote-debugging-port=19649', 'about:blank'], { stdio: 'ignore' });
  let socket;
  try {
    let target; for (let i = 0; i < 100; i++) { try { target = (await (await fetch('http://127.0.0.1:19649/json/list')).json()).find(item => item.type === 'page'); if (target) break; } catch { /* startup */ } await sleep(100); }
    assert.ok(target); socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const pending = new Map(); let seq = 0; let loads = 0; const exceptions = [];
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    socket.onmessage = event => { const data = JSON.parse(event.data); if (data.id) { const item = pending.get(data.id); pending.delete(data.id); if (data.error) item.reject(data.error); else item.resolve(data.result); } if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.text); if (data.method === 'Page.domContentEventFired') loads++; };
    const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
    const wait = async expression => { for (let i = 0; i < 600; i++) { try { if (await evaluate(`Boolean(${expression})`)) return; } catch { /* navigation */ } await sleep(100); } throw Error('Timeout ' + expression); };
    await cdp('Page.enable'); await cdp('Runtime.enable');
    for (const [url, locale] of [['/', 'id'], ['/en', 'en'], ['/zh-cn', 'zh-CN'], ['/products', 'id'], ['/en/products', 'en'], ['/zh-cn/products', 'zh-CN']]) {
      const response = await fetch('http://localhost:3000' + url, { signal: AbortSignal.timeout(60000) }); equal(response.status, 200, 'Existing normal dev route ' + url);
      await cdp('Page.navigate', { url: 'http://localhost:3000' + url }); await wait(`document.documentElement.lang==='${locale}' && document.querySelector('main h1')`);
      const settled = loads; await sleep(1000); equal(loads, settled, 'No dev reload loop ' + url);
    }
    await cdp('Page.navigate', { url: 'http://localhost:3000/admin/produk' }); await wait("location.pathname==='/admin/login' && document.querySelector('form')"); equal(await evaluate('document.documentElement.lang'), 'id', 'Admin guard/login remains Indonesian'); equal(exceptions, [], 'No dev browser exceptions');
    const logPath = path.join(root, '.next/dev/logs/next-development.log');
    equal(/Turbopack.*panic|thread.*panicked|FATAL|Hydration failed/.test(fs.readFileSync(logPath, 'utf8')), false, 'No dev panic/hydration failure');
    console.log('DEV CONTRACT: PASS (existing normal npm run dev on port 3000; public routes and anonymous Admin guard). Authorized Admin session not exercised.');
  } finally { if (socket) socket.close(); browser.kill(); }
}
async function adapterChecks(source, row) {
  const calls = []; const queries = []; let sourceAvailable = true;
  const client = { from: table => { calls.push(table); let selected = ''; const q = { select: value => { selected = value; return q; }, eq: (field, value) => { queries.push([field, value]); return q; }, is: () => q, in: (field, values) => { queries.push([field, values]); const data = [row, { ...row, product_id: 'draft-parent' }, { ...row, product_id: 'extra' }, { ...row, product_id: source.id, status: 'draft' }].map(item => selected.includes('parent:') ? { ...item, parent: { id: item.product_id, status: 'published', is_active: sourceAvailable, deleted_at: null, translation_source_revision: 5 } } : item); return Promise.resolve({ data: [null, ...data], error: null }); } }; return q; } };
  const { readPublicProductTranslations } = loader(new Map())('lib/product-translation-data.ts');
  equal((await readPublicProductTranslations(client, [source], 'id')).size, 0, 'ID no lookup'); equal(calls.length, 0, 'ID performs no query');
  equal((await readPublicProductTranslations(client, [], 'en')).size, 0, 'Empty set no lookup'); equal(calls.length, 0, 'Empty no query');
  const products = Array.from({ length: 10 }, (_, i) => ({ ...source, id: i === 0 ? source.id : 'p-' + i })); products.push({ ...source, id: 'draft-parent', status: 'draft' });
  const map = await readPublicProductTranslations(client, products, 'en'); equal(calls, ['product_translations'], 'Ten products one batch'); equal([...map.keys()], [source.id], 'Reader excludes draft/ineligible/extraneous rows under privileged transport'); equal(queries.slice(0, 2), [['locale', 'en'], ['status', 'published']], 'Explicit public query filters');
  equal(queries.find(([field]) => field === 'product_id')[1].length, 10, 'Only eligible IDs requested');
  sourceAvailable = false; equal((await readPublicProductTranslations(client, [source], 'en')).size, 0, 'Live parent eligibility rechecked if source snapshot changed under operational transport');
  const failed = { from: () => ({ select() { return this; }, eq() { return this; }, is() { return this; }, async in() { return { data: null, error: { code: '42P01' } }; } }) };
  equal((await readPublicProductTranslations(failed, [source], 'en')).size, 0, 'Missing schema/network errors preserve source fallback');
}
async function actionChecks(source, input) {
  let allowed = true; let rpcError = null; let throwRpc = false; let resultType = source.product_type; const calls = []; const paths = [];
  const mocks = new Map([
    ['@/lib/admin', { requireOperationalStaff: async () => allowed ? { id: 'actor' } : null }],
    ['next/headers', { cookies: async () => ({}) }],
    ['next/cache', { revalidatePath: value => paths.push(value) }],
    ['@/utils/supabase/server', { createClient: () => ({ rpc: async (name, args) => { if (throwRpc) throw new Error('PRIVATE NETWORK DETAIL'); calls.push({ name, args }); return { data: { product_id: source.id, slug: source.slug, product_type: resultType, locale: args.p_locale, version: 2 }, error: rpcError }; } }) }],
    ['@/lib/logger', { logError: () => {} }],
  ]);
  const actions = loader(mocks)('lib/actions/productTranslations.ts');
  allowed = false; equal((await actions.saveProductTranslation(input)).success, false, 'Operations guard first'); equal(calls.length, 0, 'Unauthorized no RPC');
  allowed = true; equal((await actions.saveProductTranslation({ ...input, locale: 'id' })).success, false, 'Invalid locale no write'); equal(calls.length, 0, 'Invalid no RPC');
  equal((await actions.saveProductTranslation(input)).success, true, 'Valid action reaches guarded save'); equal(calls[0].name, 'save_product_translation', 'Independent translation lifecycle');
  equal(calls[0].args.p_expected_source_revision, 5, 'Expected source sent'); equal(calls[0].args.p_expected_translation_version, null, 'Explicit create expectation');
  equal(paths, ['/admin/produk/source-product', '/en', '/en/products', '/en/products/source-slug'], 'Locale and route-tree destinations only');
  equal((await actions.saveProductTranslation({ ...input, payload: { name: 'Name-only replacement' } })).success, true, 'Full-state save accepts deliberately partial input');
  equal(calls.at(-1).args.p_payload, { name: 'Name-only replacement', description: null, features: null, specs: null, seo_title: null, seo_description: null }, 'Full-state API clears omitted fields; action does not PATCH or merge old state');
  const messages = {
    P1061: 'Konten sumber berubah. Muat ulang dan tinjau terjemahan.',
    P1062: 'Terjemahan sudah berubah. Muat ulang sebelum menyimpan kembali.',
    P1063: 'Produk tidak tersedia atau sudah diarsipkan. Muat ulang halaman.',
    '42501': 'Anda tidak memiliki akses.',
    '22023': 'Periksa isi terjemahan dan kesesuaiannya dengan sumber.',
    '23514': 'Periksa isi terjemahan dan kesesuaiannya dengan sumber.',
    XX000: 'Terjemahan tidak dapat disimpan. Muat ulang lalu coba kembali.',
    PT001: 'Terjemahan tidak dapat disimpan. Muat ulang lalu coba kembali.',
  };
  const rejectionInput = { productId: source.id, locale: 'en', expectedTranslationVersion: 2, expectedTranslationId: '00000000-0000-4000-8000-000000000001' };
  for (const [code, message] of Object.entries(messages)) {
    rpcError = { code, message: 'PRIVATE SQL DETAIL Konten sumber berubah.' };
    for (const action of ['saveProductTranslation', 'unpublishProductTranslation', 'deleteProductTranslation']) {
      equal(await actions[action](action === 'saveProductTranslation' ? input : rejectionInput), { success: false, message }, 'SQLSTATE-only safe ActionResult: ' + action + '/' + code);
    }
  }
  rpcError = null;
  const withdraw = { productId: source.id, locale: 'en', expectedTranslationVersion: 2, expectedTranslationId: '00000000-0000-4000-8000-000000000001' };
  for (const [action, rpc] of [['unpublishProductTranslation', 'unpublish_product_translation'], ['deleteProductTranslation', 'delete_product_translation']]) {
    equal((await actions[action](withdraw)).success, true, 'Withdraw/delete does not require source rebase'); equal(calls.at(-1).name, rpc, 'Correct independent RPC'); equal(calls.at(-1).args.p_expected_translation_id, withdraw.expectedTranslationId, 'Row identity sent');
    allowed = false; const count = calls.length; equal((await actions[action](withdraw)).success, false, 'Mutator operations guard'); equal(calls.length, count, 'Unauthorized withdrawal no write'); allowed = true;
  }
  resultType = 'sparepart'; paths.length = 0; equal((await actions.saveProductTranslation({ ...input, locale: 'zh-CN' })).success, true, 'Chinese Store mutation validated'); equal(paths, ['/admin/sparepart/source-product', '/zh-CN', '/zh-CN/store', '/zh-CN/store/source-slug'], 'Chinese route-tree destination and Store type-specific invalidation');
  throwRpc = true; const failure = await actions.saveProductTranslation(input); equal(failure.success, false, 'Thrown transport error safely classified'); equal(failure.message.includes('PRIVATE'), false, 'Network detail not exposed');
}
async function managementChecks(source, row) {
  let allowed = false; let calls = 0;
  const mocks = new Map([
    ['@/lib/admin', { requireOperationalStaff: async () => allowed ? { id: 'actor' } : null }],
    ['next/headers', { cookies: async () => ({}) }],
    ['@/utils/supabase/server', { createClient: () => ({ from: () => { calls++; return { select() { return this; }, eq() { return this; }, async order() { return { data: [{ ...row, status: 'draft', source_revision: 4 }], error: null }; } }; } }) }],
  ]);
  // This module imports auth relatively, so isolate the same boundary under both spellings.
  mocks.set('./admin', mocks.get('@/lib/admin'));
  const { readManagedProductTranslations } = loader(mocks)('lib/admin-product-translations.ts');
  await assert.rejects(readManagedProductTranslations(source.id), /akses/); checks++; equal(calls, 0, 'Unauthorized management read no query');
  allowed = true; const rows = await readManagedProductTranslations(source.id); equal(rows[0].status, 'draft', 'Management intentionally reads Draft'); equal(rows[0].source_revision, 4, 'Management retains stale content');
}
function sourceSupportChecks(load, source) {
  const { productSchema } = load('lib/validations/productSchema.ts');
  const raw = { productType: 'b2b_system', slug: source.slug, name: source.name, brand: source.brand, category: 'Kategori', description: source.description, brandColor: '#fff', categoryColor: '#000', specs: source.specs };
  equal(productSchema.parse(raw).specs[1].value_kind, 'text', 'Base source validator retains explicit classification');
  const filename = path.join(root, 'baseline-product.cjs'); const original = new Module(filename); original.filename = filename; original.paths = Module._nodeModulePaths(root);
  original._compile(ts.transpileModule(execFileSync('git', ['show', 'HEAD:lib/validations/productSchema.ts'], { cwd: root, encoding: 'utf8' }), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  const legacy = { ...raw, specs: [{ label: 'Volume', value: '850 L' }] };
  for (const data of [legacy, { ...legacy, name: 'A' }, { ...legacy, description: 'short' }, { ...legacy, slug: 'UPPER' }, { ...legacy, specs: [] }]) equal(JSON.parse(JSON.stringify(productSchema.safeParse(data))), JSON.parse(JSON.stringify(original.exports.productSchema.safeParse(data))), 'Legacy source schema behavior preserved');
  const filenameForm = path.join(root, 'components/admin/ProductForm.tsx'); const text = fs.readFileSync(filenameForm, 'utf8');
  const ast = ts.createSourceFile(filenameForm, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'toFormValues'); assert.ok(fn);
  const compiled = ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const mapper = new Function(compiled + '\nreturn toFormValues;')();
  equal(mapper(source, 'b2b_system').specs, source.specs, 'Actual ProductForm initialization preserves metadata without controls');
  equal(mapper({ ...source, specs: legacy.specs }, 'b2b_system').specs, legacy.specs, 'Actual ProductForm does not add default JSON fields to legacy records');
}
function migrationChecks() {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/0066_product_translation_foundation.sql'), 'utf8');
  for (const required of ['translation_source_revision', 'ON DELETE CASCADE', 'UNIQUE (product_id, locale)', 'ENABLE ROW LEVEL SECURITY', "public.has_cms_capability('operations')", "SET search_path = ''", 'IS DISTINCT FROM', 'FOR UPDATE', "NOTIFY pgrst, 'reload schema'", 'public.audit_log']) equal(sql.includes(required), true, 'Migration static contract ' + required);
  equal(/INSERT\s+INTO\s+public\.product_translations\s*\([^)]*\)\s*VALUES/i.test(sql), true, 'Guarded insert exists, not seed assertion');
  const publicPolicy = sql.slice(sql.indexOf('CREATE POLICY product_translations_public_select'), sql.indexOf('CREATE POLICY product_translations_operational_select'));
  for (const required of ["status = 'published'", 'translation_source_revision', 'is_active', 'deleted_at IS NULL']) equal(publicPolicy.includes(required), true, 'Explicit parent public predicate');
  equal(publicPolicy.includes('is_store_visible'), false, 'Common RLS does not impose Store visibility on B2B');
  equal(/UPDATE\s+public\.products\s+SET/i.test(sql), false, 'No Product content rewrite');
  equal(/>\s+CASE\b/.test(sql), false, 'PLpgSQL IF expressions must parenthesize nested CASE before THEN');
  equal(sql.includes('CREATE FUNCTION public.normalize_product_translation_text(p_text text)'), true, 'Static SQL defines locale-independent Unicode normalization');
  const trimLiteral = sql.match(/U&'([^']+)'/)[1];
  equal([...trimLiteral.matchAll(/\\([0-9A-F]{4})/g)].map(match => parseInt(match[1], 16)), [9,10,11,12,13,32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288,65279], 'Static SQL trim character contract equals ECMAScript whitespace set');
}
const normalizeFunctionBody = body => body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const bodyFingerprint = body => createHash('md5').update(normalizeFunctionBody(body)).digest('hex');
function translationFunctions(sql) {
  const result = new Map();
  const expression = /CREATE(?: OR REPLACE)? FUNCTION public\.((?:save|unpublish|delete)_product_translation)\s*\(([\s\S]*?)\)\s*(RETURNS jsonb[\s\S]*?)\bAS\s+(\$\w*\$)([\s\S]*?)\4/gi;
  for (const match of sql.matchAll(expression)) result.set(match[1], {
    parameters: match[2].replace(/NULL::uuid/g, 'NULL').replace(/\s+/g, ' ').trim(),
    attributes: match[3].replace(/SET search_path TO/g, 'SET search_path =').replace(/\s+/g, ' ').trim(),
    body: normalizeFunctionBody(match[5]),
  });
  return result;
}
function compareDeployed(file) {
  const baseline = translationFunctions(fs.readFileSync(path.join(root, 'supabase/migrations/0066_product_translation_foundation.sql'), 'utf8'));
  const deployed = translationFunctions(fs.readFileSync(file, 'utf8'));
  equal([...deployed.keys()], [...baseline.keys()], 'Exact three deployed RPCs');
  for (const [name, definition] of baseline) {
    equal(deployed.get(name), definition, 'Deployed definition matches 0066 with only PostgreSQL formatting normalized: ' + name);
    console.log(`${name}: body md5 ${createHash('md5').update(definition.body).digest('hex')}`);
    if (process.argv.includes('--live-crlf-proof')) {
      const liveRawHashes = {
        save_product_translation: '2bd762426ddb90114204015e73eff81f',
        unpublish_product_translation: '5bfc47cdb038220253ed025ea155049c',
        delete_product_translation: 'fd4a601cebb8a38827fb112c1617507c',
      };
      const crlf = definition.body.replace(/\n/g, '\r\n');
      const raw = createHash('md5').update(crlf).digest('hex');
      equal(raw, liveRawHashes[name], 'CRLF-only transformation reproduces fresh live raw MD5: ' + name);
      equal(crlf.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), definition.body, 'No other byte or SQL statement changes: ' + name);
      console.log(`${name}: CRLF raw md5 ${raw} — exact match to supplied fresh live evidence`);
    }
  }
  console.log('DEPLOYED PRECHECK: PASS — all statements, messages, defaults and function attributes match 0066.');
}
function hotfixChecks() {
  const original = fs.readFileSync(path.join(root, 'supabase/migrations/0066_product_translation_foundation.sql'));
  equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${original.length}\0`), original])).digest('hex'), '52110d1ec292745153cb1febf6db5fff57056bbd', 'Applied 0066 remains byte-for-byte unchanged');
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/0067_product_translation_conflict_sqlstates.sql'), 'utf8');
  const before = translationFunctions(original.toString()); const after = translationFunctions(sql);
  const fingerprintExpression = sql.match(/IF (pg_catalog\.md5\([\s\S]*?\)) IS DISTINCT FROM v_expected\.body_md5/)[1];
  const normalizedExpression = String.raw`pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(v_proc.prosrc, E'\r\n', E'\n'), E'\r', E'\n'))`;
  // Model only the extracted hash predicate; exact SQL expression is asserted below.
  const deployedFingerprint = body => createHash('md5').update(fingerprintExpression === normalizedExpression ? normalizeFunctionBody(body) : body).digest('hex');
  equal([...after.keys()], [...before.keys()], 'Hotfix replaces exactly three RPCs');
  let substitutions = 0;
  for (const [name, definition] of before) {
    const body = definition.body.replace(/'PT00([123])'/g, (_, code) => { substitutions++; return `'P106${code}'`; });
    equal(after.get(name), { ...definition, body }, 'Strict complete function equivalence except SQLSTATE: ' + name);
    equal(sql.includes(createHash('md5').update(definition.body).digest('hex')), true, 'Deployed body drift fails closed: ' + name);
    const expected = bodyFingerprint(definition.body);
    for (const representation of [definition.body, definition.body.replace(/\n/g, '\r\n'), definition.body.replace(/\n/g, '\r')]) {
      equal(bodyFingerprint(representation), expected, 'LF/CRLF/CR share the approved normalized fingerprint: ' + name);
      equal(deployedFingerprint(representation), expected, 'Actual guard expression accepts only representation drift: ' + name);
      const mutation = representation.replace('FOR UPDATE', 'FOR SHARE');
      equal(deployedFingerprint(mutation) === expected, false, 'Actual guard hash still rejects a changed SQL lock statement: ' + name);
    }
  }
  equal(fingerprintExpression, normalizedExpression, 'Only CRLF and lone CR are normalized by the SQL precondition');
  equal(substitutions, 7, 'Exactly seven SQLSTATE substitutions');
  equal((sql.match(/ERRCODE = 'P106[123]'/g) || []).length, 7, 'Exactly seven new domain error sites');
  equal(/\b(?:DROP|GRANT|REVOKE|ALTER|CREATE TABLE|CREATE POLICY|CREATE TRIGGER)\b/i.test(sql), false, 'No object/ACL/schema changes');
  equal(/ERRCODE = 'PT00[123]'/.test(sql), false, 'No reserved PT codes remain in hotfix bodies');
  for (const required of ['BEGIN;', 'to_regprocedure', 'prosecdef', 'proconfig', 'proowner', 'proacl', 'pronargdefaults', "NOTIFY pgrst, 'reload schema';", 'COMMIT;']) equal(sql.includes(required), true, 'Transactional hotfix precondition: ' + required);
  equal(sql.includes("a.grantee NOT IN (v_proc.proowner, 'authenticated'::regrole)"), true, 'Fail closed on unexpected direct EXECUTE grantees');
  equal(sql.includes('pg_catalog.has_function_privilege(r.oid, v_proc.oid'), true, 'Fail closed on unexpected effective inherited EXECUTE');
  const audit = fs.readFileSync(path.join(root, 'docs/sql/0067_product_translation_conflict_post_apply_audit.sql'), 'utf8');
  equal(audit.includes('AND NOT unexpected_execute'), true, 'Post-apply audit rejects unexpected EXECUTE');
}
function auditEvidenceChecks() {
  const file = path.join(root, 'scripts/verify-product-translation-live.cjs');
  const text = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'verifyAuditEvents');
  equal(Boolean(fn), true, 'Live audit assertions isolate fresh-run evidence');
  const verify = new Function('check', fn.getText(ast) + '\nreturn verifyAuditEvents;')(equal);
  const actions = ['product.translation_saved', 'product.translation_published', 'product.translation_unpublished', 'product.translation_deleted'];
  const historical = actions.map((action, id) => ({ id: 'old-' + id, action, details: {} }));
  const previous = new Set(historical.map(event => event.id));
  assert.throws(() => verify(historical, previous), /Live RPC audit event/, 'Historical events cannot prove current-run audit creation'); checks++;
  const fresh = actions.map((action, id) => ({ id: 'new-' + id, action, details: {} }));
  verify([...historical, ...fresh], previous);
  assert.throws(() => verify([...historical, ...fresh, { id: 'spoof', details: { spoof_probe: true } }], previous), /No spoofed audit/, 'Spoofed audit persistence is rejected'); checks++;
}
if (process.argv.includes('--compare-deployed')) {
  try { compareDeployed(process.argv[process.argv.indexOf('--compare-deployed') + 1]); } catch (error) { console.error(error); process.exitCode = 1; }
} else main().catch(error => { console.error(error); process.exitCode = 1; });
