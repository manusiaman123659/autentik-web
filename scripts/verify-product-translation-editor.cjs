/* eslint-disable @typescript-eslint/no-require-imports -- Real editor modules with isolated auth/data boundaries. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let checks = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
function loader(mocks = new Map()) {
  const cache = new Map();
  return function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename); compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, compiled);
    const native = compiled.require.bind(compiled);
    compiled.require = name => mocks.has(name) ? mocks.get(name) : name.startsWith('@/') ? load(name.slice(2) + '.ts') : name.startsWith('.') && !path.extname(name) ? load(path.relative(root, path.resolve(path.dirname(filename), name)) + '.ts') : native(name);
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
    return compiled.exports;
  };
}
async function main() {
  check(fs.existsSync(path.join(root, 'lib/product-translation-editor.ts')), true, 'Editor model exists');
  const model = loader()('lib/product-translation-editor.ts');
  const source = { id: 'qa-002', slug: 'qa-002', product_type: 'sparepart', name: 'Sumber Indonesia', description: 'Deskripsi Indonesia', features: ['Fitur A', 'Fitur B'], specs: [{ label: 'Volume', value: '850 L' }, { label: 'Material', value: 'Baja', value_kind: 'text' }], seo_title: 'SEO Indonesia', seo_description: null, translation_source_revision: 5, status: 'draft', is_active: false, deleted_at: null };
  const canonicalBefore = JSON.stringify(source);
  const row = { id: '00000000-0000-4000-8000-000000000001', product_id: source.id, locale: 'en', version: 3, source_revision: 5, status: 'published', name: 'English name', description: 'English description', features: ['Feature A', 'Feature B'], specs: [{ label: 'Capacity', value_text: null }, { label: 'Material', value_text: 'Steel' }], seo_title: 'English SEO', seo_description: 'English summary' };
  const snapshot = model.parseEditorSnapshot(source, [row]);
  let en = model.createLocaleDraft(snapshot, 'en');
  const zh = model.createLocaleDraft(snapshot, 'zh-CN');
  const payload = model.buildSaveInput(en, 'published');
  check(Object.keys(payload.payload).sort(), ['description', 'features', 'name', 'seo_description', 'seo_title', 'specs'], 'All six fields explicitly present');
  check(payload.payload.features, [{ source_index: 0, text: 'Feature A' }, { source_index: 1, text: 'Feature B' }], 'Feature order and source indices retained');
  check(payload.payload.specs, [{ source_index: 0, label: 'Capacity', value_text: null }, { source_index: 1, label: 'Material', value_text: 'Steel' }], 'Technical fallback and explicit textual translation');
  check([payload.expectedSourceRevision, payload.expectedTranslationVersion, payload.expectedTranslationId], [5, 3, row.id], 'Concurrency baseline retained');
  en = { ...en, content: { ...en.content, name: 'Changed only name' } };
  check(model.buildSaveInput(en, 'draft').payload.description, row.description, 'Field edit preserves hidden full-state fields');
  check(model.isLocaleDirty(en), true, 'EN dirty'); check(model.isLocaleDirty(zh), false, 'ZH independent');
  check(model.buildSaveInput(zh, 'draft').payload.features, null, 'Authoritative absent row starts whole-block fallback');
  check(model.buildSaveInput(zh, 'draft').payload.specs, null, 'Spec fallback is NULL');
  check(model.buildSaveInput(zh, 'draft').expectedTranslationId, null, 'Authoritative absence allows create');
  assert.throws(() => model.buildSaveInput(zh, 'published'), /./); checks++;
  check(model.localeStatus(zh), 'Belum dibuat', 'Successful absence is distinct from failed loading');
  assert.throws(() => model.parseEditorSnapshot(source, [{ ...row, id: undefined }]), /./); checks++;
  assert.throws(() => model.parseEditorSnapshot(source, [{ ...row, version: undefined }]), /./); checks++;
  assert.throws(() => model.parseEditorSnapshot({ ...source, translation_source_revision: undefined }, []), /./); checks++;
  assert.throws(() => model.parseEditorSnapshot(source, [row, row]), /./); checks++;
  assert.throws(() => model.parseEditorSnapshot(source, [{ ...row, product_id: 'foreign' }]), /./); checks++;
  const staleSnapshot = model.parseEditorSnapshot({ ...source, translation_source_revision: 6 }, [row]);
  let stale = model.createLocaleDraft(staleSnapshot, 'en');
  check(model.localeStatus(stale), 'Perlu ditinjau ulang', 'Stale overrides publication badge');
  check(stale.content.features, row.features, 'Equal-length stale candidates retained intact');
  assert.throws(() => model.buildSaveInput(stale, 'draft'), /Tinjau/); checks++;
  stale = { ...stale, reviewedRevision: 6 };
  check(model.buildSaveInput(stale, 'published').expectedSourceRevision, 6, 'Explicit review binds rebase to loaded revision');
  assert.throws(() => model.buildSaveInput({ ...stale, reviewedRevision: 5 }, 'draft'), /Tinjau/); checks++;
  let changed = model.createLocaleDraft(model.parseEditorSnapshot({ ...source, features: ['A', 'B', 'C'], translation_source_revision: 6 }, [row]), 'en');
  check(changed.content.features, row.features, 'Changed length never truncates/pads saved values');
  assert.throws(() => model.buildSaveInput({ ...changed, reviewedRevision: 6 }, 'draft'), /Struktur/); checks++;
  changed = model.rebuildLocaleBlock(changed, 'features');
  check(changed.content.features, ['', '', ''], 'Deliberate rebuild follows current source only');
  check(changed.row.features, row.features, 'Old values remain read-only reference');
  const changedSpecs = model.createLocaleDraft(model.parseEditorSnapshot({ ...source, specs: [source.specs[0]], translation_source_revision: 6 }, [row]), 'en');
  check(changedSpecs.content.specs.length, 2, 'Changed spec length retains original rows until deliberate rebuild');
  const rebuiltSpecs = model.rebuildLocaleBlock(changedSpecs, 'specs');
  check(rebuiltSpecs.content.specs.length, 1, 'Rebuilt specs follow current structure');
  check(rebuiltSpecs.row.specs.length, 2, 'Saved spec reference preserved');
  check(model.buildSaveInput({ ...en, content: { ...en.content, features: null, specs: null } }, 'draft').payload.features, null, 'Explicit whole-block fallback is retained');
  const technical = { ...en, content: { ...en.content, specs: [{ label: 'Capacity', value_text: '900 L' }, en.content.specs[1]] } };
  check(model.buildSaveInput(technical, 'draft').payload.specs[0].value_text, null, 'Missing value_kind never sends translated technical value');
  assert.throws(() => model.buildSaveInput({ ...en, source: { ...source, specs: [null] } }, 'draft'), /Spesifikasi|Struktur/); checks++;
  const buffers = { en, 'zh-CN': { ...zh, content: { ...zh.content, name: '中文草稿' } } };
  const refreshedEn = model.acceptLocaleRefresh(buffers, 'en', model.parseEditorSnapshot(source, [{ ...row, version: 4 }]));
  check(refreshedEn['zh-CN'], buffers['zh-CN'], 'Successful EN refresh does not overwrite dirty ZH');
  check(refreshedEn.en.row.version, 4, 'Acted locale receives authoritative version');
  const refreshedZh = model.acceptLocaleRefresh(buffers, 'zh-CN', snapshot);
  check(refreshedZh.en, en, 'Successful ZH refresh does not overwrite dirty EN');
  const failed = model.blockLocaleDraft(en, 'Konten sumber berubah.');
  check(failed.content, en.content, 'Mutation failure preserves buffer');
  check(failed.row, en.row, 'Mutation failure does not advance UUID/version');
  assert.throws(() => model.buildSaveInput(failed, 'draft'), /Muat ulang/); checks++;
  check(model.hasDirtyTranslations(buffers), true, 'Source navigation requires dirty confirmation');
  check(model.hasDirtyTranslations({ en: model.createLocaleDraft(snapshot, 'en'), 'zh-CN': zh }), false, 'Clean navigation has no needless confirmation');
  const roles = loader()('lib/admin-permissions.ts');
  for (const role of ['super_admin', 'admin', 'staff', 'editor', 'customer']) check(roles.hasCapability(role, 'operations'), ['super_admin', 'admin', 'staff'].includes(role), 'Existing operations mapping: ' + role);
  await reloadChecks(source, row);
  check(JSON.stringify(source), canonicalBefore, 'Editor operations never mutate canonical technical source');
  console.log(`PASS: ${checks} Product Translation 002 model/loading/full-state/safety checks.`);
}
async function reloadChecks(source, row) {
  let allowed = false; let reads = 0; let failure = false; let rows = [row];
  const actions = loader(new Map([
    ['@/lib/admin', { requireOperationalStaff: async () => allowed ? { id: 'actor' } : null }],
    ['@/lib/admin-data', { getProduct: async () => { reads++; return source; } }],
    ['@/lib/admin-product-translations', { readManagedProductTranslations: async () => { reads++; if (failure) throw Error('PRIVATE DATABASE DETAIL'); return rows; } }],
  ]))('lib/actions/productTranslationEditor.ts');
  check((await actions.reloadProductTranslationEditor(source.id)).success, false, 'Unauthorized reload denied'); check(reads, 0, 'Authorization first, no queries');
  allowed = true;
  check((await actions.reloadProductTranslationEditor('')).success, false, 'Invalid ID denied'); check(reads, 0, 'Invalid ID no queries');
  const result = await actions.reloadProductTranslationEditor(source.id);
  check(result.success, true, 'Authorized snapshot load'); check(result.snapshot.source.id, source.id, 'Minimal source provided');
  check('stock' in result.snapshot.source, false, 'No commerce configuration in translation snapshot');
  rows = [{ ...row, id: undefined }]; check((await actions.reloadProductTranslationEditor(source.id)).success, false, 'Missing row identity does not enable create');
  failure = true; const failed = await actions.reloadProductTranslationEditor(source.id); check(failed.success, false, 'Lookup failure does not mean absence'); check('snapshot' in failed, false, 'No authoritative data on failure'); check(failed.message.includes('PRIVATE'), false, 'Safe loading error');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
