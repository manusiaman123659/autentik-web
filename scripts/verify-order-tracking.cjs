/* eslint-disable @typescript-eslint/no-require-imports -- Isolated verification of actual modules, without database/network mutations. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const id = '00000000-0000-4000-8000-000000000001';
const version = '2026-10-06T12:00:00.123456+00:00';

function fixture(role = 'staff', options = {}) {
  const effects = [];
  const filters = [];
  const selections = [];
  const modules = new Map();
  const user = options.signedOut ? null : { id, email: 'actor@example.com' };
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    rpc: async (name, args) => { effects.push({ name, args }); return options.rpcError
      ? { data: null, error: { code: options.rpcError, message: 'Fixture error' } } : { data: true, error: null }; },
    from: (table) => {
      const q = {
        select: (columns) => { selections.push([table, columns]); return q; }, eq: (key, value) => { filters.push([table, key, value]); return q; },
        is: (key, value) => { filters.push([table, key, value]); return q; },
        upsert: async (value) => { effects.push({ table, upsert: value }); return { error: null }; },
        maybeSingle: async () => ({ data: table === 'profiles'
          ? { id, email: 'actor@example.com', full_name: 'Fixture', role, is_active: options.active !== false }
          : table === 'site_settings' ? { value: { currency: 'IDR', couriers: [], midtrans: { enabled: true }, retainedSetting: 'unchanged' } }
          : options.foreign ? null : { order_code: 'ORD-FIXTURE', status: options.orderStatus ?? 'shipped', payment_status: options.paymentStatus ?? 'paid',
            tracking_courier: options.courier ?? 'JNE', tracking_number: options.trackingNumber ?? 'AWB123', order_items: [], midtrans_init_state: 'idle',
            customer_name: 'Customer Fixture', payment_method: 'midtrans', subtotal: 100000, shipping_cost: 0, total: 100000,
            shipping_total_weight_g: null, shipping_zone_id: null, shipping_rate_id: null, paid_at: version,
            midtrans_redirect_url: null, midtrans_order_id: null, created_at: version }, error: null }),
      };
      return q;
    },
  };
  const stubs = {
    react: { ...require('react'), cache: fn => fn },
    'next/headers': { cookies: async () => ({}), headers: async () => ({ get: () => '127.0.0.1' }) },
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { useRouter: () => ({ refresh: () => {} }), redirect: () => { throw new Error('REDIRECT'); }, notFound: () => { throw new Error('NOT_FOUND'); } },
    'next/link': { __esModule: true, default: props => require('react').createElement('a', props) },
    '@/utils/supabase/server': { createClient: () => client },
    '@/lib/audit': { recordAudit: async (...args) => effects.push({ audit: args }) },
    '@/lib/logger': { logError: () => {} },
    '@/lib/public-data': { getWhatsAppContact: async () => null, getOwnedLegacyTransferBankAccount: async () => null },
    '@/lib/rate-limit': { checkRateLimit: () => ({ allowed: true }) },
    '@/lib/actions/checkout': { regenerateMidtransPayment: async () => { throw new Error('UNEXPECTED_PAYMENT_CALL'); } },
  };
  if (!options.fullConfirmation) stubs['@/components/orders/OrderConfirmationClient'] = { default: () => null };
  function load(name, parent = root) {
    if (stubs[name]) return stubs[name];
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name);
    const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(parent), name);
    const file = [base, `${base}.ts`, `${base}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!file) throw new Error(`Module missing: ${name}`);
    if (modules.has(file)) return modules.get(file).exports;
    const loadedModule = { exports: {} }; modules.set(file, loadedModule);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    vm.runInNewContext(source, { module: loadedModule, exports: loadedModule.exports, require: name => load(name, file),
      console, process: { env: {} }, URL, Date, setTimeout, clearTimeout }, { filename: file });
    return loadedModule.exports;
  }
  return { load, effects, filters, selections };
}

async function main() {
  const { orderStatusSchema, courierNameSchema, storeSettingsSchema } = fixture().load('@/lib/validations/storeSchema');
  const configured = ['JNE', 'J&T', 'SiCepat', 'Ninja Xpress'];
  const settingsInput = { currency: 'IDR', enableShipping: false, couriers: configured };
  check(storeSettingsSchema.safeParse({ ...settingsInput, couriers: [] }).success, 'Empty courier list supported');
  check(JSON.stringify(storeSettingsSchema.parse(settingsInput).couriers) === JSON.stringify(configured), 'Clean courier display labels preserved');
  check(courierNameSchema.parse(' Ninja Xpress ') === 'Ninja Xpress', 'Courier display label trimmed without uppercasing');
  for (const duplicate of ['jne', 'Jne', ' JNE ']) {
    check(!storeSettingsSchema.safeParse({ ...settingsInput, couriers: ['JNE', duplicate] }).success, 'Case-insensitive duplicate rejected');
  }
  for (const value of ['', ' ', '\u200b', 'x'.repeat(81), '<script>', 'javascript:evil', 'https://evil.test', 'www.evil.test', 'evil.dev', 'JNE\n', 'JNE\u0085']) {
    check(!courierNameSchema.safeParse(value).success, `Settings reject courier ${JSON.stringify(value)}`);
  }
  for (const role of ['super_admin', 'admin', 'staff', 'editor', 'customer']) {
    const f = fixture(role);
    const result = await f.load('@/lib/actions/settings').saveStoreSettings(settingsInput);
    check(result.success === (role === 'super_admin'), `${role} sensitive settings permission unchanged`);
    const writes = f.effects.filter(e => e.upsert);
    check(writes.length === (role === 'super_admin' ? 1 : 0), 'Unauthorized settings mutation has no write');
    if (writes.length) {
      check(writes[0].table === 'site_settings' && writes[0].upsert.key === 'store', 'Only store settings changed, not historical orders');
      check(writes[0].upsert.value.midtrans.enabled === true && writes[0].upsert.value.retainedSetting === 'unchanged', 'Unrelated store/payment configuration retained');
      check(JSON.stringify(writes[0].upsert.value.couriers) === JSON.stringify(configured), 'Configured labels persisted exactly');
    }
  }
  const invalidSettings = fixture('super_admin');
  check(!(await invalidSettings.load('@/lib/actions/settings').saveStoreSettings({ ...settingsInput, couriers: ['JNE', 'jne'] })).success
    && invalidSettings.effects.length === 0, 'Server rejects duplicates before database effects');
  for (const options of [{ active: false }, { signedOut: true }]) {
    const f = fixture('super_admin', options);
    check(!(await f.load('@/lib/actions/settings').saveStoreSettings(settingsInput)).success
      && f.effects.length === 0, 'Inactive/signed-out settings user denied before writes');
  }
  const removal = fixture('super_admin');
  check((await removal.load('@/lib/actions/settings').saveStoreSettings({ ...settingsInput, couriers: ['Ninja Xpress'] })).success, 'Courier removal uses existing settings flow');
  check(removal.effects.filter(e => e.upsert).every(e => e.table === 'site_settings')
    && !removal.effects.some(e => e.name), 'Courier removal performs no order update or fulfillment RPC');
  const input = { status: 'shipped', trackingCourier: 'JNE', trackingNumber: 'AWB 12-34_5.6/7', expectedUpdatedAt: version };
  check(orderStatusSchema.safeParse(input).success, 'Reasonable AWB separators accepted');
  for (const value of ['', ' ', 'x'.repeat(101), '<script>alert(1)</script>', 'javascript:alert(1)', 'https://evil.test', '//evil.test', 'www.evil.test', 'evil.com', 'ABC\n123', 'ABC\t123']) {
    check(!orderStatusSchema.safeParse({ ...input, trackingNumber: value }).success, `Reject tracking ${JSON.stringify(value)}`);
  }
  for (const value of ['', ' ', 'x'.repeat(81), '<script>', 'javascript:evil', 'JNE\n', 'JNE\u0085']) {
    check(!orderStatusSchema.safeParse({ ...input, trackingCourier: value }).success, `Reject courier ${JSON.stringify(value)}`);
  }
  check(!orderStatusSchema.safeParse({ ...input, expectedUpdatedAt: undefined }).success, 'Version required');
  check(orderStatusSchema.safeParse({ ...input, status: 'processing', trackingNumber: '' }).success, 'Preparation allowed');
  const trimmed = orderStatusSchema.parse({ ...input, trackingCourier: ' JNE ', trackingNumber: ' AWB123 ' });
  check(trimmed.trackingCourier === 'JNE' && trimmed.trackingNumber === 'AWB123', 'Trim supported');
  for (const role of ['super_admin', 'admin', 'staff', 'editor', 'customer']) {
    const f = fixture(role);
    const result = await f.load('@/lib/actions/store').updateOrderStatus(id, input);
    const allowed = ['super_admin', 'admin', 'staff'].includes(role);
    check(result.success === allowed, `${role} permission`);
    check(f.effects.filter(e => e.name).length === (allowed ? 1 : 0), `${role} mutation boundary`);
    if (allowed) {
      const call = f.effects.find(e => e.name);
      check(call.name === 'update_order_fulfillment_v2' && call.args.p_expected_updated_at === version, 'Version forwarded');
      check(Object.keys(call.args).sort().join(',') === 'p_expected_updated_at,p_order_id,p_status,p_tracking_courier,p_tracking_number', 'No payment/financial mutation payload');
      check(!f.effects.some(e => e.audit), 'No duplicate non-atomic fulfillment audit');
    }
  }
  for (const options of [{ active: false }, { signedOut: true }]) {
    const f = fixture('staff', options);
    check(!(await f.load('@/lib/actions/store').updateOrderStatus(id, input)).success && f.effects.length === 0, 'Inactive/signed-out denied');
  }
  const stale = fixture('staff', { rpcError: 'P0063' });
  const staleResult = await stale.load('@/lib/actions/store').updateOrderStatus(id, input);
  check(!staleResult.success && staleResult.message.includes('Pesanan sudah berubah'), 'Stale error surfaced');
  const cancelled = fixture();
  check((await cancelled.load('@/lib/actions/store').updateOrderStatus(id, { ...input, status: 'cancelled', cancelReason: 'Fixture' })).success, 'Cancellation remains available');
  check(cancelled.effects.find(e => e.name)?.name === 'cancel_order', 'Cancellation/stock RPC unchanged');
  const urls = fixture().load('@/lib/shipping/tracking');
  check(urls.getTrackingDestination(' jne ') === 'https://jne.co.id/tracking-package', 'Exact verified JNE destination');
  for (const name of ['Unknown', 'JNE<script>', 'https://evil.test', null]) check(urls.getTrackingDestination(name) === null, 'Unknown destination fails closed');
  const owned = fixture('customer');
  const rendered = await owned.load('@/app/(site)/store/orders/[code]/page').default({ params: Promise.resolve({ code: 'ORD-FIXTURE' }), searchParams: Promise.resolve({}) });
  check(owned.filters.some(f => f[0] === 'orders' && f[1] === 'user_id' && f[2] === id), 'Customer page owner filter');
  check(rendered.props.dbOrder.tracking_number === 'AWB123', 'Safe DTO includes tracking');
  const confirmation = fixture('customer', { fullConfirmation: true, trackingNumber: 'TEST123456789' });
  const confirmationPage = await confirmation.load('@/app/(site)/store/orders/[code]/page').default({ params: Promise.resolve({ code: 'ORD-FIXTURE' }), searchParams: Promise.resolve({ payment: 'return' }) });
  const confirmationHtml = require('react-dom/server').renderToStaticMarkup(confirmationPage);
  check(confirmation.selections.some(([table, columns]) => table === 'orders' && columns.includes('tracking_courier') && columns.includes('tracking_number')), 'Real confirmation route selects both tracking columns');
  check(confirmationHtml.includes('Pembayaran Berhasil') && confirmationHtml.includes('Informasi Pengiriman'), 'Payment-success page mounts shipping card through actual component tree');
  check(confirmationHtml.includes('TEST123456789') && confirmationHtml.includes('Salin nomor resi'), 'Route DTO reaches shipment text and copy control');
  check(confirmationHtml.includes('href="https://jne.co.id/tracking-package"'), 'Actual confirmation page exposes exact JNE destination');
  check(confirmationHtml.indexOf('Informasi Pengiriman') > confirmationHtml.indexOf('Status Pesanan')
    && confirmationHtml.indexOf('Informasi Pengiriman') < confirmationHtml.indexOf('Detail Pesanan'), 'Shipping card ordered between status and products');
  for (const options of [{ foreign: true }, { signedOut: true }]) {
    const f = fixture('customer', options);
    await assert.rejects(() => f.load('@/app/(site)/store/orders/[code]/page').default({ params: Promise.resolve({ code: 'ORD-FIXTURE' }), searchParams: Promise.resolve({}) }), options.foreign ? /NOT_FOUND/ : /REDIRECT/);
    checks++;
  }
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/0063_order_tracking_hardening.sql'), 'utf8');
  check(!/ADD COLUMN|ALTER TABLE public.orders|payment_status\s*=|shipping_cost\s*=|subtotal\s*=|total\s*=|stock\s*=/i.test(sql), 'No order columns or financial/stock mutation');
  check(sql.includes('FOR UPDATE') && sql.includes('IS DISTINCT FROM p_expected_updated_at'), 'Locked version comparison');
  check(sql.includes("'order.tracking_updated'") && sql.includes('INSERT INTO public.audit_log'), 'Atomic audit in mutation body');
  check(sql.includes('CREATE FUNCTION public.update_order_fulfillment_v2('), 'Expand migration creates V2');
  check(/GRANT EXECUTE ON FUNCTION public\.get_order_couriers\(\),\s*public\.update_order_fulfillment_v2\(uuid, text, text, text, timestamptz\) TO authenticated;/.test(sql), 'V2 and narrow reader granted to authenticated');
  check(!/(?:GRANT|REVOKE)[^;]*\b(?:public|rbac_internal)\.update_order_fulfillment\(/i.test(sql), 'Expand migration neither broadens nor retires V1 ACL');
  check(!/(?:CREATE|ALTER|DROP) FUNCTION (?:public|rbac_internal)\.update_order_fulfillment\(/i.test(sql), 'V1 authorization implementation preserved');
  const body = sql.match(/CREATE FUNCTION public\.update_order_fulfillment_v2\([\s\S]*?AS \$\$([\s\S]*?)\$\$;/)?.[1];
  check(Boolean(body), 'Actual V2 function body extracted for source-order verification');
  const noOp = body.match(/IF v_before\.status IS NOT DISTINCT FROM p_status\s+AND v_before\.tracking_courier IS NOT DISTINCT FROM v_courier\s+AND v_before\.tracking_number IS NOT DISTINCT FROM v_number THEN\s+RETURN true;\s+END IF;/);
  check(Boolean(noOp), 'Same persisted status and normalized final tracking return success');
  const beforeNoOp = body.slice(0, noOp.index);
  const afterNoOp = body.slice(noOp.index + noOp[0].length);
  check(!/\b(?:UPDATE public\.orders|INSERT INTO|DELETE FROM)\b/i.test(beforeNoOp + noOp[0]), 'No-op path issues no writes: updated_at and audit stay unchanged');
  check(beforeNoOp.includes('FOR UPDATE') && beforeNoOp.includes("NOT public.has_cms_capability('operations')"), 'Authorization and row locking precede no-op return');
  check(/IF v_before\.updated_at IS DISTINCT FROM p_expected_updated_at THEN\s+RAISE EXCEPTION [^;]*USING ERRCODE = 'P0063';\s+END IF;/.test(beforeNoOp), 'Stale version always raises before otherwise no-op return');
  check(beforeNoOp.includes("v_before.status IN ('completed', 'cancelled')") && beforeNoOp.includes('IF NOT (CASE v_before.status'), 'Terminal and transition validation precede no-op');
  check(beforeNoOp.includes("v_number text := NULLIF(btrim(p_tracking_number), '')")
    && beforeNoOp.includes('char_length(COALESCE(p_tracking_number')
    && beforeNoOp.includes('public.get_order_couriers() @> jsonb_build_array(v_courier)'), 'Normalization and input/configuration validation precede no-op');
  check(afterNoOp.indexOf('UPDATE public.orders') >= 0
    && afterNoOp.indexOf('INSERT INTO public.audit_log') > afterNoOp.indexOf('UPDATE public.orders'), 'Mutation and atomic audits remain after no-op return');
  check(sql.includes("auth.uid() IS NULL OR NOT public.has_cms_capability('operations')"), 'RPC capability guard');
  check(sql.includes("NEW.updated_at := GREATEST(pg_catalog.clock_timestamp()"), 'Tracking version strictly advances');
  console.log(`PASS: ${checks} tracking validation/action/ownership/security checks (mocked boundaries; not live DB verification).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
