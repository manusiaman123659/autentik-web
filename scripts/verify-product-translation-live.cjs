/* eslint-disable @typescript-eslint/no-require-imports -- Explicitly opted-in live checks; only an owned, hidden QA Product is mutated. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
require('@next/env').loadEnvConfig(process.cwd());
require('tsx/cjs');
const { createClient } = require('@supabase/supabase-js');
const { resolveLocalizedProductContent } = require('../lib/product-translations.ts');
const { readPublicProductTranslations } = require('../lib/product-translation-data.ts');
const { productTranslationSaveSchema } = require('../lib/validations/productTranslationSchema.ts');

const report = { migration: '0066 APPLIED; 0067 application must be confirmed separately', mode: process.argv.includes('--remaining-only') ? 'remaining-only' : 'full', checks: 0, passed: [], actors: {}, unavailable: [], fixture: null, cleanup: null, status: 'running' };
const output = path.join(os.tmpdir(), 'opencode', 'product-translation-live-report.json');
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); report.checks++; report.passed.push(label); };
const demand = result => { if (result.error) throw new Error(`Data API rejected verification operation (${result.error.code || 'unknown'}).`); return result.data; };
let admin; let ops; let productId; let baseline; let owned = false; let browser;
let auditBoundary = new Set();
const options = token => ({ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}) });
const saveArgs = (source, locale, payload, status, row = null) => {
  const data = productTranslationSaveSchema.parse({ productId, locale, payload, status, expectedSourceRevision: source.translation_source_revision, expectedTranslationVersion: row?.version ?? null, expectedTranslationId: row?.id ?? null });
  return { p_product_id: productId, p_locale: data.locale, p_payload: data.payload, p_status: data.status, p_expected_source_revision: data.expectedSourceRevision, p_expected_translation_version: data.expectedTranslationVersion, p_expected_translation_id: data.expectedTranslationId };
};
const withdrawArgs = row => ({ p_product_id: productId, p_locale: row.locale, p_expected_translation_version: row.version, p_expected_translation_id: row.id });
const source = async () => demand(await admin.from('products').select('*').eq('id', productId).single());
const translations = async client => demand(await client.from('product_translations').select('*').eq('product_id', productId).order('locale'));
const auditEvents = async () => demand(await admin.from('audit_log').select('id,action,entity_id,details').eq('entity_type', 'product_translation').contains('details', { product_id: productId }));
const managed = async locale => demand(await ops.client.from('product_translations').select('*').eq('product_id', productId).eq('locale', locale).single());
const updateSource = async patch => { demand(await admin.from('products').update(patch).eq('id', productId)); return source(); };
async function denied(result, label, code = '42501') { check(result.error?.code, code, label); }
async function save(locale, payload, status, row = null) { demand(await ops.client.rpc('save_product_translation', saveArgs(await source(), locale, payload, status, row))); return managed(locale); }
async function unpublish(row) { demand(await ops.client.rpc('unpublish_product_translation', withdrawArgs(row))); return managed(row.locale); }
async function remove(row) { demand(await ops.client.rpc('delete_product_translation', withdrawArgs(row))); }

async function actors(url, key) {
  const clients = { anon: { client: createClient(url, key, options()) } };
  report.actors.anon = { available: true, kind: 'publishable-key anonymous session' };
  for (const label of ['operations', 'customer', 'editor', 'inactive']) {
    const token = process.env[`PRODUCT_TRANSLATION_QA_${label.toUpperCase()}_JWT`];
    if (!token) { report.unavailable.push(label); report.actors[label] = { available: false, reason: 'Local session variable not configured' }; continue; }
    const client = createClient(url, key, options(token));
    const authenticated = await client.auth.getUser(token);
    if (authenticated.error || !authenticated.data.user) { report.unavailable.push(label); report.actors[label] = { available: false, reason: 'Session could not be authenticated' }; continue; }
    const user = authenticated.data.user;
    const profileResult = await client.from('profiles').select('role,is_active,email').eq('id', user.id).single();
    const profile = profileResult.data;
    const valid = !profileResult.error && profile && (label === 'inactive' ? profile.is_active === false
      : profile.is_active === true && (label === 'operations' ? ['super_admin', 'admin', 'staff'].includes(profile.role) : profile.role === label));
    if (!valid) { report.unavailable.push(label); report.actors[label] = { available: false, reason: 'Profile does not match the designated test actor' }; continue; }
    clients[label] = { client, id: user.id, email: profile.email ?? user.email ?? '' };
    report.actors[label] = { available: true, role: profile.role, active: profile.is_active };
    check(demand(await client.rpc('has_cms_capability', { p_capability: 'operations' })), label === 'operations', `Real ${label} operations capability`);
  }
  return clients;
}

async function createFixture() {
  if (process.argv.includes('--resume-owned')) {
    const previous = JSON.parse(fs.readFileSync(output, 'utf8'));
    productId = browser ? 'i18n-qa-698604be-49de-4eb2-b01c-1fc8c4ba64a1' : previous.fixture?.product_id;
    assert.match(productId || '', /^i18n-qa-[0-9a-f-]{36}$/);
    report.fixture = { ...previous.fixture, product_id: productId, reused: true };
    baseline = await source();
    assert.ok(baseline.brand === 'QA INTERNAL' && baseline.sku === productId && baseline.product_type === 'sparepart'
      && baseline.is_store_visible === false && baseline.status === 'draft' && baseline.is_active === false
      && baseline.name === 'UJI INTERNAL TERJEMAHAN — BUKAN PRODUK JUAL', 'Only the previously owned/restored hidden QA Product may be resumed.');
    check((await translations(admin)).length, 0, 'Resumed owned fixture has no translations');
    owned = true;
    await updateSource({ deleted_at: null });
    check((await source()).translation_source_revision, baseline.translation_source_revision, 'Resuming owned fixture never resets source revision');
    return;
  }
  productId = `i18n-qa-${randomUUID()}`;
  report.fixture = { product_id: productId, type: 'sparepart', store_visible: false };
  const row = { id: productId, slug: productId, name: 'UJI INTERNAL TERJEMAHAN — BUKAN PRODUK JUAL', brand: 'QA INTERNAL', category: 'Uji internal',
    description: 'Produk sementara khusus verifikasi terjemahan. Tidak dijual.', features: ['Fitur sumber pertama', 'Fitur sumber kedua'],
    specs: [{ label: 'Volume', value: '850 L' }, { label: 'Material', value: 'Baja tahan karat', value_kind: 'text' }],
    seo_title: 'Uji internal sumber', seo_description: 'Deskripsi SEO sumber uji internal.', product_type: 'sparepart',
    sku: productId, price: 1, stock: 0, sort_order: 2000000000, is_store_visible: false, status: 'draft', is_active: false, fulfillment_type: 'ready_stock' };
  baseline = { ...row, image_url: null };
  demand(await admin.from('products').insert(row)); owned = true;
  baseline = await source(); report.fixture = { product_id: productId, type: 'sparepart', store_visible: false, initial_revision: baseline.translation_source_revision };
  check(baseline.translation_source_revision, 1, 'Live source default/INSERT trigger initializes revision 1');
  check((await translations(admin)).length, 0, 'Owned test Product begins without translations');
}

async function revisionChecks() {
  let current = await source();
  for (const [label, patch] of [
    ['no-op', { name: current.name, description: current.description, features: current.features, specs: current.specs, seo_title: current.seo_title, seo_description: current.seo_description }],
    ['stock', { stock: 4 }], ['price', { price: 2 }], ['image', { image_url: '/images/qa-reversible-placeholder.png' }], ['sort', { sort_order: 1999999999 }],
  ]) { const before = current.translation_source_revision; current = await updateSource(patch); check(current.translation_source_revision, before, `Live ${label} update preserves revision`); }
  for (const [field, value] of [
    ['name', baseline.name + ' — revisi'], ['description', baseline.description + ' Revisi.'], ['features', [...baseline.features].reverse()],
    ['specs', [baseline.specs[1], baseline.specs[0]]], ['seo_title', baseline.seo_title + ' revisi'], ['seo_description', baseline.seo_description + ' Revisi.'],
  ]) { const before = current.translation_source_revision; current = await updateSource({ [field]: value }); check(current.translation_source_revision, before + 1, `Live ${field} update increments exactly once`); }
  const before = current.translation_source_revision;
  current = await updateSource(Object.fromEntries(['name', 'description', 'features', 'specs', 'seo_title', 'seo_description'].map(field => [field, baseline[field]])));
  check(current.translation_source_revision, before + 1, 'Live multi-field restoration increments once');
  await updateSource({ stock: baseline.stock, price: baseline.price, image_url: baseline.image_url, sort_order: baseline.sort_order });
}

async function permissionChecks(clients) {
  const current = await source();
  for (const [label, actor] of Object.entries(clients)) {
    for (const [method, request] of [
      ['INSERT', () => actor.client.from('product_translations').insert({ product_id: productId, locale: 'en', name: 'Unauthorized probe', status: 'draft', source_revision: current.translation_source_revision })],
      ['UPDATE', () => actor.client.from('product_translations').update({ name: 'Unauthorized probe' }).eq('product_id', productId)],
      ['DELETE', () => actor.client.from('product_translations').delete().eq('product_id', productId)],
    ]) await denied(await request(), `Real ${label} direct ${method} denied`);
    if (label !== 'operations') {
      await denied(await actor.client.rpc('save_product_translation', saveArgs(current, 'en', { name: 'Unauthorized probe' }, 'draft')), `Real ${label} guarded save denied`);
      await denied(await actor.client.rpc('unpublish_product_translation', { p_product_id: productId, p_locale: 'en', p_expected_translation_version: 1, p_expected_translation_id: randomUUID() }), `Real ${label} unpublish denied`);
      await denied(await actor.client.rpc('delete_product_translation', { p_product_id: productId, p_locale: 'en', p_expected_translation_version: 1, p_expected_translation_id: randomUUID() }), `Real ${label} translation delete denied`);
    }
  }
  check((await translations(admin)).length, 0, 'Rejected DML/RPC probes leave no translations');
}

const fullPayload = locale => ({ name: locale === 'en' ? 'Internal QA English product' : '内部测试产品', description: locale === 'en' ? 'Internal QA description.' : '内部测试说明。',
  features: [{ source_index: 0, text: locale === 'en' ? 'First approved QA feature' : '第一项测试功能' }, { source_index: 1, text: locale === 'en' ? 'Second approved QA feature' : '第二项测试功能' }],
  specs: [{ source_index: 0, label: locale === 'en' ? 'Capacity' : '容量', value_text: null }, { source_index: 1, label: locale === 'en' ? 'Material' : '材料', value_text: locale === 'en' ? 'Stainless steel' : '不锈钢' }],
  seo_title: locale === 'en' ? 'Internal QA SEO' : '内部测试标题', seo_description: locale === 'en' ? 'Internal QA SEO description.' : '内部测试搜索说明。' });

async function publicCount(client, count, label) { check((await translations(client)).length, count, label); }
async function lifecycle(clients) {
  for (const locale of ['en', 'zh-CN']) {
    const otherBefore = (await translations(ops.client)).filter(row => row.locale !== locale);
    let row = await save(locale, fullPayload(locale), 'draft'); check(row.status, 'draft', `Live ${locale} management reads Draft`);
    await publicCount(clients.anon.client, 0, `Live ${locale} Draft hidden from anonymous`);
    row = await save(locale, fullPayload(locale), 'published', row); check(row.version, 2, `Live ${locale} publish advances version`);
    await publicCount(clients.anon.client, 1, `Live ${locale} Published/current readable anonymously`);
    const current = await source(); const map = await readPublicProductTranslations(clients.anon.client, [current], locale);
    check(map.size, 1, `Real ${locale} batch reader includes current row`);
    check(resolveLocalizedProductContent(current, map.get(productId), locale).specs[0].value, '850 L', `Live ${locale} legacy technical value preserved`);
    check(resolveLocalizedProductContent(current, map.get(productId), locale).specs[1].value, locale === 'en' ? 'Stainless steel' : '不锈钢', `Live ${locale} explicit textual value translated`);
    row = await save(locale, { name: locale === 'en' ? 'Name only QA' : '仅测试名称' }, 'published', row);
    for (const field of ['description', 'features', 'specs', 'seo_title', 'seo_description']) check(row[field], null, `Live full-state replacement clears omitted ${field}`);
    check(resolveLocalizedProductContent(current, row, locale).description, current.description, `Live ${locale} NULL description falls back`);
    row = await unpublish(row); check(row.status, 'draft', `Live ${locale} unpublish retains Draft`); check(row.name, locale === 'en' ? 'Name only QA' : '仅测试名称', `Live ${locale} unpublish retains content`);
    await publicCount(clients.anon.client, 0, `Live ${locale} unpublish hides translation`);
    check((await translations(ops.client)).filter(item => item.locale !== locale), otherBefore, `Live ${locale} changes leave other locale untouched`);
  }
  let en = await save('en', fullPayload('en'), 'published', await managed('en'));
  let zh = await save('zh-CN', fullPayload('zh-CN'), 'published', await managed('zh-CN'));
  await publicCount(clients.anon.client, 2, 'EN and ZH published independently');
  const zhBefore = { ...zh }; en = await save('en', { ...fullPayload('en'), name: 'EN-only change' }, 'published', en); check(await managed('zh-CN'), zhBefore, 'EN save preserves all ZH fields/version/timestamp');
  const enBefore = { ...en }; zh = await save('zh-CN', { ...fullPayload('zh-CN'), name: '独立中文修改' }, 'published', zh); check(await managed('en'), enBefore, 'ZH save preserves all EN fields/version/timestamp');
  for (const [label, actor] of Object.entries(clients).filter(([label]) => label !== 'operations' && label !== 'inactive')) await publicCount(actor.client, 2, `Real ${label} sees current published translations`);
  await staleAndConflicts(clients);
}

async function staleAndConflicts(clients) {
  let current = await source(); let en = await managed('en'); const old = { ...en };
  const changed = await updateSource({ description: current.description + ' Perubahan sumber uji.' });
  check(changed.translation_source_revision, current.translation_source_revision + 1, 'Live source change stales published translation');
  check(await managed('en'), old, 'Stale content/status/version remain unchanged'); await publicCount(clients.anon.client, 0, 'Live stale translations hidden anonymously');
  check((await readPublicProductTranslations(ops.client, [changed], 'en')).size, 0, 'Operational public adapter rejects stale management-visible row');
  check(resolveLocalizedProductContent(changed, old, 'en').name, changed.name, 'Live stale record resolves source content');
  await denied(await ops.client.rpc('save_product_translation', saveArgs(current, 'en', { name: 'Must not overwrite' }, 'published', en)), 'Live old source revision rejected', 'P1061'); check(await managed('en'), old, 'Source conflict leaves row unchanged');
  en = await save('en', fullPayload('en'), 'published', en); check(en.source_revision, changed.translation_source_revision, 'Live review restores current translation');
  const stockChanged = await updateSource({ stock: 7, price: 3 }); check(stockChanged.translation_source_revision, changed.translation_source_revision, 'Live unrelated stock/price do not stale Published translation');
  check((await readPublicProductTranslations(clients.anon.client, [stockChanged], 'en')).size, 1, 'Published remains current after unrelated update');
  const bad = fullPayload('en'); bad.specs[0].value_text = '900 L';
  await denied(await ops.client.rpc('save_product_translation', saveArgs(stockChanged, 'en', bad, 'published', en)), 'Live missing value_kind technical override rejected', '22023'); check(await managed('en'), en, 'Rejected technical override leaves row/version unchanged');
  const raceArgs = saveArgs(stockChanged, 'en', { name: 'Concurrent QA result' }, 'published', en);
  const race = await Promise.all([ops.client.rpc('save_product_translation', raceArgs), ops.client.rpc('save_product_translation', raceArgs)]);
  check(race.filter(item => !item.error).length, 1, 'Concurrent RPC requests have one winner'); check(race.find(item => item.error)?.error.code, 'P1062', 'Concurrent loser receives version conflict');
  const winner = await translations(ops.client);
  await denied(await ops.client.rpc('save_product_translation', raceArgs), 'Live old version cannot overwrite winner', 'P1062');
  check(await translations(ops.client), winner, 'Version conflict preserves winner and other locale');
  en = await managed('en');
  for (const [label, expectation] of [['old version', { ...en, version: en.version - 1 }], ['wrong UUID', { ...en, id: randomUUID() }]]) {
    for (const rpc of ['save_product_translation', 'unpublish_product_translation', 'delete_product_translation']) {
      const before = await translations(ops.client);
      const args = rpc === 'save_product_translation' ? saveArgs(await source(), 'en', { name: 'Must not overwrite' }, 'published', expectation) : withdrawArgs(expectation);
      await denied(await ops.client.rpc(rpc, args), `Live ${rpc} ${label} rejected`, 'P1062');
      check(await translations(ops.client), before, `Live ${rpc} ${label} preserves both locales`);
    }
  }
  await remove(en); check((await source()).id, productId, 'Live translation delete preserves Product');
  en = await save('en', { name: 'ABA original' }, 'published'); check(en.version, 1, 'ABA original starts version 1'); const oldIdentity = { ...en };
  await remove(en); en = await save('en', { name: 'ABA recreated' }, 'published'); check(en.version, 1, 'ABA recreated also version 1'); check(en.id === oldIdentity.id, false, 'Recreated locale has new UUID');
  for (const rpc of ['save_product_translation', 'unpublish_product_translation', 'delete_product_translation']) {
    const before = await translations(ops.client);
    const args = rpc === 'save_product_translation' ? saveArgs(await source(), 'en', { name: 'Must not overwrite recreated row' }, 'published', oldIdentity) : withdrawArgs(oldIdentity);
    await denied(await ops.client.rpc(rpc, args), `Live ${rpc} old UUID/equal version rejected`, 'P1062');
    check(await translations(ops.client), before, `Live ${rpc} identity conflict leaves recreated row and other locale intact`);
  }
  const stale = await updateSource({ seo_title: stockChanged.seo_title + ' stale withdraw test' }); check(stale.translation_source_revision, stockChanged.translation_source_revision + 1, 'Stale withdraw source revision changes');
  en = await unpublish(en); check(en.status, 'draft', 'Stale translation can unpublish without rebase');
  en = await save('en', { name: 'Eligibility QA' }, 'published', en);
  for (const [label, patch] of [['Draft parent', { status: 'draft' }], ['Inactive parent', { is_active: false }], ['Deleted parent', { deleted_at: new Date().toISOString() }]]) {
    await updateSource(patch); for (const [role, actor] of Object.entries(clients).filter(([role]) => role !== 'operations' && role !== 'inactive')) await publicCount(actor.client, 0, `Real ${role}: ${label} hidden`);
    check((await readPublicProductTranslations(ops.client, [await source()], 'en')).size, 0, `Operational public adapter: ${label} hidden`);
    if (label === 'Deleted parent') {
      const before = await translations(ops.client);
      for (const rpc of ['save_product_translation', 'unpublish_product_translation', 'delete_product_translation']) {
        const args = rpc === 'save_product_translation' ? saveArgs(await source(), 'en', { name: 'Must not overwrite archived parent' }, 'published', en) : withdrawArgs(en);
        await denied(await ops.client.rpc(rpc, args), `Live ${rpc} archived parent unavailable`, 'P1063');
        check(await translations(ops.client), before, `Live ${rpc} unavailable parent preserves both locales`);
      }
    }
    await updateSource({ status: 'published', is_active: true, deleted_at: null });
  }
  check((await readPublicProductTranslations(clients.anon.client, [await source()], 'en')).size, 1, 'Common translation policy permits store-invisible eligible Product');
  for (const action of ['product.translation_saved', 'product.translation_published', 'product.translation_unpublished', 'product.translation_deleted']) {
    const attempt = ops.auditSpoof ? await ops.auditSpoof(action, en.id) : await ops.client.from('audit_log').insert({ user_id: ops.id, user_email: ops.email, action, entity_type: 'product_translation', entity_id: en.id, details: { product_id: productId, spoof_probe: true } });
    await denied(attempt, `Real operations client cannot spoof ${action}`);
  }
  verifyAuditEvents(await auditEvents(), auditBoundary);
}

function verifyAuditEvents(events, previousIds) {
  const fresh = events.filter(event => !previousIds.has(event.id));
  for (const action of ['product.translation_saved', 'product.translation_published', 'product.translation_unpublished', 'product.translation_deleted']) check(fresh.some(event => event.action === action), true, `Live RPC audit event ${action} created in this run`);
  check(events.some(event => event.details.spoof_probe), false, 'No spoofed audit record persisted');
}

async function anonymousFixtures(anon) {
  // Service role is fixture setup only, never proof of operations RPC authorization.
  const current = await source();
  demand(await admin.from('product_translations').insert({ product_id: productId, locale: 'en', name: 'RLS visibility fixture only', status: 'draft', source_revision: current.translation_source_revision }));
  await publicCount(anon, 0, 'Real anonymous read hides fixture Draft');
  demand(await admin.from('product_translations').update({ status: 'published' }).eq('product_id', productId));
  const publishedBefore = (await translations(admin))[0];
  await publicCount(anon, 1, 'Real anonymous read exposes current Published fixture');
  check((await readPublicProductTranslations(anon, [await source()], 'en')).size, 1, 'Live anonymous batch adapter with actual FK join works');
  const unrelated = await updateSource({ stock: 6, price: 4 });
  check(unrelated.translation_source_revision, current.translation_source_revision, 'Current Published fixture remains current after stock/price update');
  await publicCount(anon, 1, 'Real anonymous Published read survives unrelated stock/price update');
  const changed = await updateSource({ description: current.description + ' Test stale RLS.' }); await publicCount(anon, 0, 'Real anonymous read hides stale fixture');
  const staleRow = (await translations(admin))[0];
  check(staleRow, publishedBefore, 'Live source change preserves translation content/status/source revision/version');
  check(resolveLocalizedProductContent(changed, staleRow, 'en').name, changed.name, 'Actual stale fixture resolves source');
  demand(await admin.from('product_translations').update({ source_revision: changed.translation_source_revision }).eq('product_id', productId));
  for (const [label, patch] of [['Draft parent', { status: 'draft' }], ['Inactive parent', { is_active: false }], ['Deleted parent', { deleted_at: new Date().toISOString() }]]) {
    await updateSource(patch); await publicCount(anon, 0, `Real anonymous ${label} hidden`); await updateSource({ status: 'published', is_active: true, deleted_at: null });
  }
  report.unavailable.push('guarded RPC lifecycle/concurrency/audit: operations session unavailable');
}

async function cleanup() {
  if (!owned || !baseline) return;
  await updateSource({ status: 'draft', is_active: false, deleted_at: null });
  for (const row of await translations(admin)) {
    if (browser) await remove(row);
    else demand(await admin.from('product_translations').delete().eq('id', row.id).eq('product_id', productId));
  }
  const restore = Object.fromEntries(['name','description','features','specs','seo_title','seo_description','stock','price','image_url','sort_order'].map(field => [field, baseline[field]]));
  const final = await updateSource({ ...restore, status: 'draft', is_active: false, is_store_visible: false, deleted_at: new Date().toISOString() });
  report.cleanup = { translations_removed: (await translations(admin)).length === 0, source_restored: ['name','description','features','specs','seo_title','seo_description','stock','price','image_url','sort_order'].every(field => JSON.stringify(final[field]) === JSON.stringify(baseline[field])), product_soft_archived: final.deleted_at != null, final_revision: final.translation_source_revision, canonical_product_deleted: false };
  assert.ok(report.cleanup.translations_removed && report.cleanup.source_restored && report.cleanup.product_soft_archived);
}

async function main() {
  assert.ok(process.argv.includes('--run'), 'Live writes require explicit --run. Only a new hidden QA Product is used.');
  if (process.argv.includes('--remaining-only')) assert.ok(process.argv.includes('--browser-session') && process.argv.includes('--resume-owned'), 'Remaining checks require the real browser session and owned fixture.');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(url && key, 'Configured public project settings required.');
  let clients;
  if (process.argv.includes('--browser-session')) {
    assert.ok(process.argv.includes('--resume-owned'), 'Browser verification must resume the existing owned QA fixture.');
    browser = await require('./product-translation-browser-session.cjs')(url, key);
    assert.ok(browser.canMaintain, 'This archived fixture needs an existing Admin/Super Admin for restoration and audit reading; no secrets or tokens are required.');
    clients = { anon: { client: createClient(url, key, options()) }, operations: browser };
    report.actors = { anon: { available: true, kind: 'separate clean anonymous client' }, operations: { available: true, role: browser.role, active: browser.active, method: 'normal manual application browser login' } };
    for (const role of ['customer', 'editor', 'inactive']) { report.actors[role] = { available: false, reason: 'UNAVAILABLE — NO SAFE QA SESSION' }; report.unavailable.push(role); }
    admin = browser.client;
  } else {
    assert.ok(service, 'Trusted fixture-maintenance client required for non-browser verification.');
    clients = await actors(url, key); admin = createClient(url, service, options());
  }
  ops = clients.operations;
  demand(await clients.anon.client.from('product_translations').select('product_id,locale,status,source_revision').limit(1));
  demand(await admin.from('products').select('id,translation_source_revision').limit(1));
  await createFixture();
  if (ops) auditBoundary = new Set((await auditEvents()).map(event => event.id));
  if (!process.argv.includes('--remaining-only')) {
    if (browser) await permissionChecks({ operations: ops });
    else { await revisionChecks(); await permissionChecks(clients); }
  }
  await updateSource({ status: 'published', is_active: true });
  if (process.argv.includes('--remaining-only')) {
    // Seed only the RPC state required by unfinished conflicts/technical/audit checks.
    for (const locale of ['en', 'zh-CN']) { const draft = await save(locale, fullPayload(locale), 'draft'); await save(locale, fullPayload(locale), 'published', draft); }
    await staleAndConflicts(clients);
  } else if (ops) await lifecycle(clients); else await anonymousFixtures(clients.anon.client);
  report.status = ops ? 'passed' : 'partial';
}
if (!process.argv.includes('--run')) {
  console.error('Usage: node scripts/verify-product-translation-live.cjs --run [--resume-owned]. No live checks were performed.');
  process.exitCode = 2;
} else main().catch(error => { report.status = 'failed'; report.failure = error.message; process.exitCode = 1; }).finally(async () => {
  try { await cleanup(); } catch { report.cleanup = { failed: true, product_id: productId, instruction: 'Restore/archive only this owned QA Product and remove only its translations.' }; report.status = 'failed'; process.exitCode = 1; }
  if (browser) await browser.close();
  assert.ok(fs.existsSync(path.dirname(output))); fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, checks: report.checks, actors: report.actors, unavailable: report.unavailable, fixture: report.fixture, cleanup: report.cleanup, report: output }, null, 2));
});
