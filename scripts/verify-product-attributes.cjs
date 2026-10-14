/* eslint-disable @typescript-eslint/no-require-imports -- Execute real TypeScript validation and purchase rules. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const mocks = new Map();
let checks = 0;
function load(file) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename); mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, mod);
  const native = mod.require.bind(mod);
  mod.require = name => mocks.has(name) ? mocks.get(name) : name.startsWith('@/') ? load(name.slice(2) + '.ts') : native(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const { productSchema } = load('lib/validations/productSchema.ts');
const b2bSource = { productType: 'b2b_system', slug: 'owned-attributes-fixture', name: 'Produk fixture',
  brand: 'Autentik', category: 'Fixture', description: 'Deskripsi fixture untuk validasi', brandColor: '#0EA5A0', categoryColor: '#0B1F3A' };
const attributeInputs = ['minPurchaseQty','unit','length','width','height','dimensionUnit','dimensionsNote','weightGrams'];
const b2bParsed = productSchema.parse({ ...b2bSource, minPurchaseQty: 10, unit: 'Pack', length: 12.5, dimensionUnit: 'cm', weightGrams: 500 });
eq(attributeInputs.filter(key => Object.hasOwn(b2bParsed,key)), [], 'B2B schema does not expose or validate Product Attributes');
const source = { ...b2bSource, productType: 'sparepart', sku: 'OWNED-ATTR', price: '10000', stock: '100', weightGrams: '500' };
const parsed = productSchema.parse(source);
eq(parsed.minPurchaseQty, 1, 'Legacy Product defaults to minimum 1');
eq([parsed.unit, parsed.length, parsed.width, parsed.height, parsed.dimensionUnit, parsed.dimensionsNote, parsed.weightGrams],
   [null, null, null, null, null, null, 500], 'Optional Komponen attributes do not fabricate values; weight stays required');
for (const minimum of [1, 10, 100, 999]) eq(productSchema.parse({ ...source, minPurchaseQty: minimum }).minPurchaseQty, minimum, 'Valid minimum ' + minimum);
for (const minimum of [0, 1000, 1.5, 'abc', '', null, true, Infinity]) eq(productSchema.safeParse({ ...source, minPurchaseQty: minimum }).success, false, 'Invalid minimum ' + minimum);
eq(productSchema.parse({ ...source, length: '12,5', width: '8', height: '3', dimensionUnit: 'cm' }).length, 12.5, 'Comma decimal normalized');
for (const value of ['0', '-1', '1.2345', '1.2300', '1,2,3', '1.2cm', 'NaN', 'Infinity', '1e2', NaN, Infinity, true]) {
  eq(productSchema.safeParse({ ...source, length: value, dimensionUnit: 'cm' }).success, false, 'Reject malformed/overprecise dimension ' + value);
}
eq(productSchema.safeParse({ ...source, length: '2' }).success, false, 'Axis requires dimension unit');
eq(productSchema.parse({ ...source, dimensionUnit: 'cm' }).dimensionUnit, null, 'No axes normalizes unit to null');
eq(productSchema.parse({ ...source, length: '', width: ' ', height: null }).length, null, 'Blank is null not zero');
eq(productSchema.parse({ ...source, dimensionsNote: ' Diameter 20 mm ' }).dimensionsNote, 'Diameter 20 mm', 'Note only allowed and trimmed');
eq(productSchema.parse({ ...source, unit: ' Pack ' }).unit, 'Pack', 'Custom sale unit trimmed');
for (const input of [{ unit: 'a'.repeat(51) }, { unit: 'Pcs\nPack' }, { unit: 'Pcs\u0085' }, { dimensionsNote: 'a'.repeat(2001) }, { dimensionsNote: 'bad\u0001' }]) {
  eq(productSchema.safeParse({ ...source, ...input }).success, false, 'Unsafe/bounded text rejected');
}
eq(productSchema.parse({ ...source, weightGrams: '500' }).weightGrams, 500, 'Komponen weight persists');
const component = { ...source, productType: 'sparepart', sku: 'OWNED-ATTR', price: '10000', stock: '100', weightGrams: '500' };
eq(productSchema.parse(component).weightGrams, 500, 'Komponen positive weight retained');
for (const weightGrams of ['', null, '0', '-1', '1.5']) eq(productSchema.safeParse({ ...component, weightGrams }).success, false, 'Komponen requires positive integer weight');
const rules = load('lib/product-attributes.ts');
eq(rules.purchaseQuantity(1, 100, 10), 10, 'New add starts at minimum');
eq(rules.purchaseQuantity(11, 100, 10), 11, 'Minimum is not a multiple');
eq(rules.purchaseQuantity(9, 100, 10), 10, 'Explicit decrement floors at minimum');
eq(rules.purchaseQuantity(10, 9, 10), null, 'Stock below minimum blocked');
eq(rules.purchaseQuantity(1001, 5000, 10), 999, 'Global maximum enforced');
eq(rules.purchaseQuantity(2.5, 100, 1), null, 'Fractional quantity rejected');
  eq(rules.purchaseQuantity(NaN, 100, 1), null, 'Invalid quantity rejected');
eq(rules.needsPurchaseReview({ id: 'fixture', variant_id: null, quantity: 10, stock: NaN, min_purchase_qty: 10 }), true, 'Invalid stock requires review');
const item = { key: 'fixture::default', id: 'fixture', variant_id: null, quantity: 5, stock: 100, price: 10000 };
const row = { id: 'fixture', min_purchase_qty: 10, unit: 'Pack', stock: 100, product_variants: [] };
const refreshed = rules.refreshPurchaseRules([item], [row])[0];
eq(refreshed.quantity, 5, 'Refresh does not silently increase payable quantity');
eq(refreshed.min_purchase_qty, 10, 'Refresh uses current canonical rule');
eq(rules.needsPurchaseReview(refreshed), true, 'Legacy below-minimum item requires review');
eq(rules.refreshPurchaseRules([item], [])[0].purchase_unavailable, true, 'Unavailable Product is retained and blocked');
const variantRows = [{ ...row, product_variants: [{ id: 'A', stock: 9, is_active: true, deleted_at: null }, { id: 'B', stock: 100, is_active: true, deleted_at: null }] }];
const lines = rules.refreshPurchaseRules([{ ...item, variant_id: 'A' }, { ...item, variant_id: 'B' }], variantRows);
eq(lines.map(rules.needsPurchaseReview), [true, true], 'Different variants do not combine quantities');
eq(lines[0].stock, 9, 'Uses selected variant stock');
eq(rules.refreshPurchaseRules([item], variantRows)[0].purchase_unavailable, true, 'Legacy unselected variant blocked');
const crypto = require('node:crypto');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/0068_product_attributes.sql'), 'utf8').replace(/\r\n?/g, '\n');
const oldSQL = fs.readFileSync(path.join(root, 'supabase/migrations/0047_shipping_safety_admin_patch.sql'), 'utf8').replace(/\r\n?/g, '\n');
const wrapperSQL = fs.readFileSync(path.join(root, 'supabase/migrations/0060_checkout_idempotency.sql'), 'utf8').replace(/\r\n?/g, '\n');
const definition = (sql, name) => sql.match(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION public[.]${name}\\([^]*?\\$\\$;`))[0];
const body = sql => sql.slice(sql.indexOf('AS $$') + 5, sql.lastIndexOf('$$;'));
const md5 = value => crypto.createHash('md5').update(value).digest('hex');
const base = definition(oldSQL, 'create_checkout_order');
eq(md5(body(base)), 'a734e5a8aa5967d2d50a0b7a62d2cdca', 'Repository base equals approved live fingerprint');
eq(md5(body(definition(wrapperSQL, 'create_checkout_order_v2'))), '5a0f78d8166ce81f679cb957ab299174', 'V2 equals approved live fingerprint');
const select = migration.match(/v_select text := '([^']+)'/)[1];
const anchor = migration.match(/v_anchor text := '([^']+)'/)[1];
const check = migration.match(/v_check text := \$check\$([^]*?)\$check\$/)[1];
const replacement = migration.match(/v_definition := replace\(v_original, v_select,\s*'([^']+)'\)/)[1];
eq(base.split(select).length, 2, 'Single locked Product SELECT anchor');
eq(base.split(anchor).length, 2, 'Single pre-mutation line anchor');
const patched = base.replace(select, replacement).replace(anchor, check + anchor);
eq(patched.replace(replacement, select).replace(check, ''), base, 'Checkout diff is ONLY minimum read/check');
assert.ok(patched.indexOf("ERRCODE = 'P1064'") > patched.indexOf('FOR UPDATE')); checks++;
assert.ok(patched.indexOf("ERRCODE = 'P1064'") < patched.indexOf('UPDATE public.product_variants')); checks++;
console.log('Checkout body after narrow patch MD5:', md5(body(patched)));
eq(md5(body(patched)), '6fd1aa190ee315a9c373afefe508825c', 'Applied base checkout fingerprint unchanged by scope correction');
if (process.argv.includes('--print-checkout')) console.log(patched);

async function actionChecks() {
  const records = new Map(); const writes = []; let allowed = true; let writeCount = 0;
  const client = { from(table) { let id; return {
    select() { return this; }, eq(key, value) { if (key === 'id') id = value; return this; },
    is() { return this; }, ilike() { return this; },
    async maybeSingle() { return { data: table === 'products' ? records.get(id) ?? null : null, error: null }; },
    async upsert(record) { writeCount++; writes.push(record); records.set(record.id, { ...records.get(record.id), ...record }); return { error: null }; },
  }; } };
  mocks.set('next/cache', { revalidatePath() {} }); mocks.set('next/headers', { cookies: async () => ({}) });
  mocks.set('@/lib/admin', { requireOperationalStaff: async () => allowed ? { id: 'owned-actor' } : null });
  mocks.set('@/utils/supabase/server', { createClient: () => client });
  mocks.set('@/lib/audit', { recordAudit: async () => {} });
  mocks.set('@/lib/product-public-revalidation', { revalidateB2BProduct() {} });
  const { upsertProduct } = load('lib/actions/products.ts');
  for (const input of [component]) {
    const id = 'owned-attributes-' + input.productType;
    const data = { ...input, id, minPurchaseQty: 10, unit: ' Pack ', length: '12.5', dimensionUnit: 'cm', dimensionsNote: 'Diameter 20 mm', weightGrams: 500 };
    eq((await upsertProduct(data)).success, true, 'Actual server action accepts attributes ' + input.productType);
    const row = records.get(id);
    eq([row.min_purchase_qty, row.unit, row.length, row.width, row.height, row.dimension_unit, row.dimensions_note, row.weight_grams],
      [10, 'Pack', 12.5, null, null, 'cm', 'Diameter 20 mm', 500], 'Explicit Komponen canonical DB write');
    eq((await upsertProduct({ ...data, minPurchaseQty: 11 })).success, true, 'Actual edit succeeds');
    eq(records.get(id).weight_grams, 500, 'Komponen edit preserves required weight');
  }
  const b2bId='owned-attributes-b2b-excluded';
  records.set(b2bId,{id:b2bId,min_purchase_qty:41,unit:'Existing technical value',length:2});
  eq((await upsertProduct({...b2bSource,id:b2bId,minPurchaseQty:0,unit:'Pack',length:'bad',dimensionUnit:'cm',weightGrams:500})).success,true,'B2B save retains pre-task validation even with irrelevant hidden attributes');
  const b2bWrite=writes.at(-1);
  eq(b2bWrite.weight_grams,null,'B2B canonical weight save restored to pre-task NULL behavior');
  eq(['min_purchase_qty','unit','length','width','height','dimension_unit','dimensions_note'].filter(key=>Object.hasOwn(b2bWrite,key)),[],'B2B action never writes new attribute columns');
  eq([records.get(b2bId).min_purchase_qty,records.get(b2bId).unit,records.get(b2bId).length],[41,'Existing technical value',2],'B2B save leaves backing-table attributes untouched');
  const before = writeCount;
  eq((await upsertProduct({ ...source, minPurchaseQty: 0 })).success, false, 'Invalid attributes rejected before DB write');
  allowed = false;
  eq((await upsertProduct(source)).success, false, 'Unauthorized cannot save attributes');
  eq(writeCount, before, 'Invalid/unauthorized inputs cause no write');
  let paymentCalls = 0; let request;
  mocks.set('@/utils/supabase/server', { createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'owned-customer' } }, error: null }) },
    rpc: async (name, payload) => { request = { name, payload }; return { data: null, error: { code: 'P1064', message: 'private-db-detail-do-not-leak' } }; },
  }) });
  mocks.set('@/utils/supabase/admin', { createAdminClient: () => { throw Error('Privileged/payment read must not run after rejected checkout'); } });
  mocks.set('@/lib/midtrans', { createMidtransTransaction: () => { paymentCalls++; throw Error('Payment must not initialize'); } });
  const checkout = load('lib/actions/checkout.ts');
  const rejected = await checkout.submitCheckout({ idempotencyKey: '00000000-0000-4000-8000-000000000001',
    customerName: 'Owned fixture', customerEmail: '', address: 'Alamat fixture valid', city: 'Fixture', province: 'Fixture',
    items: [{ productId: 'owned-attributes', quantity: 9, min_purchase_qty: 1 }] });
  eq([rejected.success, rejected.minimumPurchaseRejected], [false, true], 'Stable minimum error mapped to actionable client result');
  eq(rejected.message.includes('private-db-detail'), false, 'Internal database error does not leak');
  eq(request.name, 'create_checkout_order_v2', 'Checkout keeps v2 idempotency boundary');
  eq(request.payload.p_items, [{ product_id: 'owned-attributes', quantity: 9, variant_id: null }], 'Only identity/quantity/variant reach DB, no client minimum');
  eq(paymentCalls, 0, 'Minimum rejection does not initialize payment');
}
actionChecks().then(() => console.log(`PASS: ${checks} attribute validation, purchase rules, actual server-action payload, and static checkout contract assertions. SQL execution/live QA not claimed.`))
  .catch(error => { console.error(error); process.exitCode = 1; });
