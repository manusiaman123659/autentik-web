/* eslint-disable @typescript-eslint/no-require-imports -- Local fixtures exercise actual document modules without live services. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const http = require('node:http');
const { spawn } = require('node:child_process');
const ts = require('typescript');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const id = '00000000-0000-4000-8000-000000000001';
const code = 'ORD-PRINT-FIXTURE';
const longValues = {
  name: 'tEsT Custmer WrOng Speling ' + 'nama panjang '.repeat(5),
  email: 'Mixed.CASE.snapshot.'.repeat(6) + '@example.com',
  phone: '08' + '1234567890'.repeat(8),
  address: 'Jl. atak WrOnG, Semraang, Semraang, jawaa tengha. '.repeat(4),
};
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function fixture(role = 'staff', options = {}) {
  const effects = [];
  const filters = [];
  const modules = new Map();
  const order = {
    id, order_code: code, customer_name: 'Customer Fixture', customer_email: 'customer@example.com', customer_phone: 'CUSTOMER-PHONE',
    shipping_address: { address: 'Alamat panjang ' + 'Sendangmulyo '.repeat(8), city: 'Semarang', province: 'Jawa Tengah', postal_code: '50272' },
    status: options.status ?? 'processing', payment_status: options.payment ?? 'paid', payment_method: options.method ?? 'midtrans',
    created_at: '2026-10-07T18:30:00Z', subtotal: options.subtotal ?? 100000, shipping_cost: options.shipping ?? 10000, total: options.total ?? 110000,
    tracking_courier: options.noTracking ? null : 'JNE', tracking_number: options.noTracking ? null : 'AWB-PRINT123',
    midtrans_order_id: 'PRIVATE-MIDTRANS-ID', cancel_reason: 'PRIVATE-CANCEL-REASON', notes: 'Catatan pesanan fixture',
  };
  const items = Array.from({ length: options.count ?? 1 }, (_, index) => ({ id: `item-${index}`, order_id: id,
    product_name: options.long ? `Produk snapshot ${index + 1} ${'spesifikasi panjang '.repeat(9)}` : 'Produk Snapshot',
    sku: options.noSku ? null : `SKU-${index + 1}`, variant_label: 'Varian Snapshot', quantity: 1, unit_price: options.price ?? 100000,
  }));
  const original = JSON.stringify({ order, items });
  const user = options.signedOut ? null : { id, email: 'actor@example.com' };
  const client = { auth: { getUser: async () => ({ data: { user }, error: null }) }, from(table) {
    const query = { select: columns => { effects.push({ table, columns }); return query; },
      eq: (key, value) => { filters.push([table, key, value]); return query; }, is: (key, value) => { filters.push([table, key, value]); return query; },
      maybeSingle: async () => ({ data: table === 'profiles' ? { id, email: 'actor@example.com', full_name: 'Actor', role, is_active: options.active !== false }
        : options.foreign ? null : { ...order, order_items: items }, error: null }),
    }; return query;
  } };
  const stubs = {
    react: { ...React, cache: fn => fn }, 'server-only': {},
    'next/headers': { cookies: async () => ({}) },
    'next/navigation': { redirect: href => { throw new Error(`REDIRECT:${href}`); }, notFound: () => { throw new Error('NOT_FOUND'); } },
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    'next/image': { __esModule: true, default: ({ src, alt, width, height, className }) => React.createElement('img', { src, alt, width, height, className }) },
    '@/utils/supabase/server': { createClient: () => client },
    '@/utils/supabase/admin': { createAdminClient: () => {
      effects.push({ privilegedIdentity: true });
      const query = { select: columns => { effects.push({ identityProjection: columns }); return query; }, eq: () => query,
        maybeSingle: async () => ({ data: options.contact ?? { address: 'Jl. Klipang Ruko Amsterdam No.9E, Sendangmulyo, Tembalang, Kota Semarang, Jawa Tengah 50272', email: 'autentik.info@gmail.com', phone: 'UNVERIFIED-COMPANY-PHONE' }, error: options.identityError ? { message: 'Fixture failure' } : null }),
      }; return { from: table => { assert.equal(table, 'site_settings'); return query; } };
    } },
    '@/lib/admin-data': {
      getOrder: async () => { effects.push({ adminOrderRead: true }); return options.foreign ? null : { order, items }; },
      getAdminBankAccount: async () => { const actor = await load('@/lib/admin').getAdminUser('sensitive'); effects.push({ bankRead: Boolean(actor) }); return actor ? { bankName: 'BANK-FIXTURE', accountHolder: 'Company Fixture', accountNumber: 'BANK-NUMBER-FIXTURE' } : null; },
    },
  };
  function load(name, parent = root) {
    if (name.endsWith('.css')) return {};
    if (Object.hasOwn(stubs, name)) return stubs[name];
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name);
    const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(parent), name);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    if (!filename) throw new Error(`Missing module ${name}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loadedModule = { exports: {} }; modules.set(filename, loadedModule);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(source, { module: loadedModule, exports: loadedModule.exports, require: next => load(next, filename), console, process: { env: {} }, URL, Date, Intl, Object, Set, Map, Promise, setTimeout, clearTimeout }, { filename });
    return loadedModule.exports;
  }
  return { load, effects, filters, order, items, original };
}

const routes = {
  invoice: '@/app/(print)/admin/orders/[id]/invoice/page',
  delivery: '@/app/(print)/admin/orders/[id]/surat-jalan/page',
  proof: '@/app/(print)/store/orders/[code]/print/page',
};
const params = kind => ({ params: Promise.resolve(kind === 'proof' ? { code } : { id }) });

async function verifyModules() {
  for (const [kind, module] of Object.entries(routes)) {
    const f = fixture(kind === 'proof' ? 'customer' : 'staff');
    const element = await f.load(module).default(params(kind));
    const html = renderToStaticMarkup(f.load('@/app/(print)/layout').default({ children: element }));
    check(html.includes('print-document') && html.includes('/images/logo_aka/LOGO_AKA.jpg'), `${kind} real logo document`);
    check(html.includes('PT Autentik Karya Analitika') && html.includes('autentik.info@gmail.com'), `${kind} verified identity`);
    check(html.includes('Kode Pesanan') && html.includes(code) && html.includes('8 Oktober 2026'), `${kind} reference/date Asia Jakarta`);
    check(!/info@autentik.co.id|Jl. Raya Teknologi|PRIVATE-MIDTRANS|PRIVATE-CANCEL|UNVERIFIED-COMPANY-PHONE|Surat Jalan &amp; Packing Slip/.test(html), `${kind} no dummy/internal data`);
    check(!/INV-001|NPWP|PPN|DPP|Due date/.test(html), `${kind} no fabricated invoice/tax fields`);
    check(html.includes('Produk Snapshot') && html.includes('Varian Snapshot'), `${kind} order item snapshot`);
    check(!/<nav|<aside/.test(html), `${kind} no website navigation`);
    check(html.includes('Rudy Alfiansyah') === (kind !== 'proof'), `${kind} correct signature policy`);
    check(JSON.stringify({ order: f.order, items: f.items }) === f.original, `${kind} source values unchanged`);
    if (kind === 'proof') check(f.filters.some(([table, key, value]) => table === 'orders' && key === 'user_id' && value === id), 'Proof explicit owner scope');
    if (kind === 'delivery') check(!/Harga|Subtotal|TOTAL|Rp|Status Pembayaran|BANK-/.test(html), 'Delivery HTML contains no financial data');
    if (kind === 'invoice') check(html.includes('Email: customer@example.com') && html.includes('Telepon: CUSTOMER-PHONE'), 'Invoice contact labels explicit');
    if (kind === 'delivery') check(html.includes('Telepon: CUSTOMER-PHONE'), 'Delivery recipient phone labeled');
  }
  for (const role of ['super_admin', 'admin', 'staff', 'editor', 'customer']) for (const kind of ['invoice', 'delivery']) {
    const f = fixture(role); const allowed = ['super_admin', 'admin', 'staff'].includes(role);
    if (allowed) { await f.load(routes[kind]).default(params(kind)); checks++; }
    else { await assert.rejects(() => f.load(routes[kind]).default(params(kind)), /NOT_FOUND/); check(!f.effects.some(e => e.adminOrderRead || e.privilegedIdentity), 'Unauthorized print denied before reads'); }
  }
  for (const options of [{ active: false }, { signedOut: true }]) {
    const f = fixture('staff', options); await assert.rejects(() => f.load(routes.invoice).default(params('invoice')), /NOT_FOUND/); checks++;
  }
  for (const status of ['pending', 'completed', 'cancelled']) {
    const f = fixture('staff', { status }); await assert.rejects(() => f.load(routes.delivery).default(params('delivery')), /NOT_FOUND/); checks++;
  }
  for (const options of [{ foreign: true }, { signedOut: true }]) {
    const f = fixture('customer', options); await assert.rejects(() => f.load(routes.proof).default(params('proof')), options.foreign ? /NOT_FOUND/ : /REDIRECT:\/auth\/login\?next=/);
    check(!f.effects.some(e => e.privilegedIdentity), 'Foreign/anonymous proof does not read identity');
  }
  const delivery = await fixture().load('@/lib/print/document-data').getDeliveryNoteDocument(id);
  check(!/subtotal|shippingCost|total|unitPrice|lineTotal|payment|bank|midtrans/i.test(JSON.stringify(Object.keys(delivery))), 'Delivery DTO contains no financial/internal fields');
  check(!delivery.items.some(row => Object.hasOwn(row, 'unitPrice') || Object.hasOwn(row, 'lineTotal')), 'Delivery item DTO has no price');
  const total = await fixture('staff', { total: 777777 }).load('@/lib/print/document-data').getInvoiceDocument(id);
  check(total.total === 777777 && total.items[0].lineTotal === 100000, 'Stored total preserved, only line amount derived');
  const fraction = fixture('staff', { price: 1234.5, subtotal: 1234.5, shipping: 0, total: 1234.5 });
  const fractionData = await fraction.load('@/lib/print/document-data').getInvoiceDocument(id);
  const fractionHtml = renderToStaticMarkup(React.createElement(fraction.load('@/components/admin/PrintInvoiceDocument').default, { data: fractionData, identity: await fraction.load('@/lib/print/identity').getDocumentIdentity() }));
  check(fractionData.total === 1234.5 && fractionHtml.includes('1.234,50'), 'Stored fractional legacy currency is displayed without rounding to whole rupiah');
  for (const [payment, label] of [['paid', 'Lunas'], ['pending', 'Menunggu Pembayaran'], ['failed', 'Pembayaran Gagal'], ['refunded', 'Dikembalikan'], ['unpaid', 'Belum Dibayar']]) {
    const data = await fixture('customer', { payment }).load('@/lib/print/document-data').getCustomerProofDocument(code);
    check(data.paymentStatus === label, `Proof payment status ${payment}`);
    check(!Object.hasOwn(data, 'bankAccount') && !Object.hasOwn(data, 'midtrans_order_id'), 'Customer DTO no admin financial/internal metadata');
  }
  const missing = fixture('staff', { noTracking: true, noSku: true });
  const blank = await missing.load('@/lib/print/document-data').getDeliveryNoteDocument(id);
  const identity = await missing.load('@/lib/print/identity').getDocumentIdentity();
  const blankHtml = renderToStaticMarkup(React.createElement(missing.load('@/components/admin/PrintPackingSlip').default, { data: blank, identity }));
  check(!blankHtml.includes('Nomor Resi') && !blankHtml.includes('Kurir') && !blankHtml.includes('>SKU<'), 'Missing tracking/SKU omitted');
  for (const role of ['staff', 'super_admin']) {
    const f = fixture(role, { method: 'transfer' }); const data = await f.load('@/lib/print/document-data').getInvoiceDocument(id);
    check(Boolean(data.bankAccount) === (role === 'super_admin'), 'Legacy bank access retains sensitive guard');
  }
  const badIdentity = fixture('staff', { contact: { address: 'Jl. Raya Teknologi No. 123', email: 'info@autentik.co.id', phone: 'DUMMY' } });
  const safeIdentity = await badIdentity.load('@/lib/print/identity').getDocumentIdentity();
  check(safeIdentity.email === 'autentik.info@gmail.com' && safeIdentity.address.includes('Klipang') && safeIdentity.phone === null, 'Verified identity fallback, no unverified phone');
  const actions = fixture().load('@/components/admin/OrderPrintActions').default;
  for (const status of ['pending', 'processing', 'shipped', 'completed', 'cancelled']) {
    const html = renderToStaticMarkup(React.createElement(actions, { orderId: id, status }));
    check(html.includes(`/admin/orders/${id}/invoice`) && html.includes('target="_blank"'), 'Invoice opens dedicated preview');
    check(html.includes('/surat-jalan') === ['processing', 'shipped'].includes(status), 'Delivery action availability preserved');
  }
  const actionSource = fs.readFileSync(path.join(root, 'components/admin/OrderPrintActions.tsx'), 'utf8');
  const confirmationSource = fs.readFileSync(path.join(root, 'components/orders/OrderConfirmationClient.tsx'), 'utf8');
  check(!/createPortal|setTimeout|window.print|PrintInvoiceDocument|PrintPackingSlip/.test(actionSource), 'Admin legacy portal/timer system removed');
  check(!/window.print|PrintCustomerInvoice/.test(confirmationSource) && confirmationSource.includes('/print`'), 'Customer print button uses dedicated route, no hidden duplicate');
  const layoutSource = fs.readFileSync(path.join(root, 'app/(print)/layout.tsx'), 'utf8');
  check(!/Navbar|Footer|FaqWidget|AdminShell|CartProvider/.test(layoutSource), 'Print architecture excludes ordinary chrome');
  const css = fs.readFileSync(path.join(root, 'app/(print)/print.css'), 'utf8');
  check(css.includes('size: A4 portrait') && css.includes('margin: 12mm') && css.includes('table-header-group'), 'A4 and multipage CSS');
  check(css.includes('.print-toolbar { display: none !important; }') && css.includes('box-shadow: none'), 'Toolbar and shadows absent from print');
  const controls = fs.readFileSync(path.join(root, 'components/print/PrintDocumentControls.tsx'), 'utf8');
  check(controls.includes('document.fonts.ready') && controls.includes('image.decode') && !controls.includes('setTimeout'), 'Print waits for fonts/logo without timer');
  return { invoice: await fixture().load('@/lib/print/document-data').getInvoiceDocument(id), delivery,
    proof: await fixture('customer').load('@/lib/print/document-data').getCustomerProofDocument(code), identity };
}

async function verifyBrowser(models) {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  check(fs.existsSync(edge), 'Microsoft Edge available');
  const cssRoot = path.join(root, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter(name => name.endsWith('.css')).map(name => fs.readFileSync(path.join(cssRoot, name), 'utf8')).join('\n');
  const bundle = await esbuild.build({ stdin: { contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import Invoice from './components/admin/PrintInvoiceDocument';import Delivery from './components/admin/PrintPackingSlip';
    import Proof from './components/orders/PrintCustomerInvoice';import Controls from './components/print/PrintDocumentControls';
    const models=${JSON.stringify(models)};const longValues=${JSON.stringify(longValues)};window.longValues=longValues;const app=createRoot(document.getElementById('app'));let key=0;
    window.errors=[];window.printCalls=0;window.print=()=>{window.printCalls++;window.logoReady=!!document.querySelector('.document-logo').naturalWidth;window.fontsReady=document.fonts.status;};
    window.addEventListener('error',e=>{if(e.error)window.errors.push(e.message)});window.addEventListener('unhandledrejection',e=>window.errors.push(String(e.reason)));
    window.printFixture=(kind='invoice',count=1,logoPath=models.identity.logoPath,longInfo=false)=>{
      const source=models[kind];const items=Array.from({length:count},(_,i)=>({...source.items[0],id:'row-'+i,name:count>5?'Produk '+i+' '+('spesifikasi panjang '.repeat(9)):source.items[0].name}));
      const fixtureTotals=kind==='delivery'?{}:{subtotal:source.items[0].lineTotal*count,total:source.items[0].lineTotal*count+source.shippingCost};
      const data={...source,...fixtureTotals,items};if(longInfo){
        if(kind==='delivery')data.recipient={...source.recipient,name:longValues.name,phone:longValues.phone,address:longValues.address};
        else data.customer=kind==='invoice'?{...source.customer,...longValues}:{...source.customer,name:longValues.name,address:longValues.address};
        data.items=items.map(item=>({...item,name:item.name+' '+('produk panjang '.repeat(12)),sku:'SKU-SNAPSHOT-1234'.repeat(4)}));
      }const identity={...models.identity,logoPath};const Component={invoice:Invoice,delivery:Delivery,proof:Proof}[kind];
      app.render(<main className='print-preview' key={++key}><Controls backHref='/fixture'/><Component data={data} identity={identity}/></main>);
    };window.printFixture();
  `, resolveDir: root, loader: 'jsx' }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root }, plugins: [{ name: 'next-boundaries', setup(build) {
    build.onResolve({ filter: /^next\/(image|link)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'next/image'
      ? "import React from 'react';export default function Image({src,alt,width,height,className}){return React.createElement('img',{src,alt,width,height,className})}"
      : "import React from 'react';export default function Link(props){return React.createElement('a',props)}", loader: 'js', resolveDir: root }));
  } }] });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else if (url.pathname === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else if (url.pathname.startsWith('/images/')) {
      const file = path.resolve(root, 'public', '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(path.join(root, 'public') + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; res.end(); }
      else { res.setHeader('Content-Type', file.endsWith('.png') ? 'image/png' : 'image/jpeg'); res.end(fs.readFileSync(file)); }
    } else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0"><div id="app"></div><script src="/fixture.js"></script></body></html>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const parent = path.join(os.tmpdir(), 'opencode'); check(fs.existsSync(parent), 'Approved temp parent exists');
  const output = fs.mkdtempSync(path.join(parent, 'print-documents-'));
  const browser = spawn(edge, ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${path.join(output, 'profile')}`, '--remote-debugging-port=19465', 'about:blank'], { stdio: 'ignore' });
  let socket;
  try {
    let target;
    for (let i = 0; i < 60; i++) { try { target = (await (await fetch('http://127.0.0.1:19465/json/list')).json()).find(e => e.type === 'page'); if (target) break; } catch { /* wait for browser */ } await sleep(100); }
    check(Boolean(target), 'Browser debugging endpoint ready'); socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const pending = new Map(); let sequence = 0;
    socket.onmessage = event => { const data = JSON.parse(event.data); if (data.id) { const handler = pending.get(data.id); pending.delete(data.id); if (data.error) handler.reject(data.error); else handler.resolve(data.result); } };
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => { const data = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (data.exceptionDetails) throw new Error(JSON.stringify(data.exceptionDetails)); return data.result.value; };
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/fixture` });
    for (let i = 0; i < 50; i++) { if (await evaluate('typeof window.printFixture==="function"')) break; await sleep(100); }
    const render = async (kind, count, logo) => { await evaluate(`window.printFixture(${JSON.stringify(kind)},${count}${logo ? ',' + JSON.stringify(logo) : ''})`); await sleep(100); await evaluate('document.querySelector(".document-logo").decode()'); };
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1100, height: 1200, deviceScaleFactor: 1, mobile: false });
    for (const [name, logo] of [['icon', '/images/logo_aka/LOGO_AKA.jpg'], ['wordmark', "/images/logo_aka/AKA'S LOGO PNG.png"]]) {
      await render('invoice', 5, logo); const shot = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(output, `invoice-logo-${name}.png`), Buffer.from(shot.data, 'base64'));
    }
    for (const kind of ['invoice', 'delivery', 'proof']) for (const count of [1, 5, 25]) for (const dark of [false, true]) {
      await evaluate(`document.documentElement.classList.toggle('dark',${dark})`); await render(kind, count);
      check(await evaluate('document.querySelectorAll("tbody tr").length') === count, 'All item rows rendered');
      check(await evaluate('document.querySelectorAll("nav,aside").length') === 0, 'No website/admin navigation');
      check(await evaluate('getComputedStyle(document.querySelector(".print-document")).backgroundColor') === 'rgb(255, 255, 255)', 'White document in both themes');
      await cdp('Emulation.setEmulatedMedia', { media: 'print' });
      check(await evaluate('getComputedStyle(document.querySelector(".print-toolbar")).display') === 'none', 'Toolbar excluded from print');
      check(await evaluate('getComputedStyle(document.querySelector("thead")).display') === 'table-header-group', 'Repeating table header');
      check(await evaluate('getComputedStyle(document.querySelector(".print-document")).boxShadow') === 'none', 'No print shadow');
      check(await evaluate('document.querySelector(".print-document").scrollWidth<=document.querySelector(".print-document").clientWidth'), 'No document horizontal clipping');
      if (kind !== 'delivery') check(await evaluate("[...document.querySelectorAll('tbody .money')].every(cell=>{const range=document.createRange();range.selectNodeContents(cell);return range.getClientRects().length===1})"), 'Long products do not squeeze ordinary monetary values into broken lines');
      if (!dark) {
        const result = await cdp('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
        const pdf = Buffer.from(result.data, 'base64'); fs.writeFileSync(path.join(output, `${kind}-${count}.pdf`), pdf);
        const text = pdf.toString('latin1'); const pages = (text.match(/\/Type\s*\/Page\b/g) ?? []).length;
        check(pages >= 1 && (count < 25 || pages >= 2), 'PDF handles short and multipage orders');
        const box = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
        check(Boolean(box) && Math.abs(Number(box[1]) - 595.28) < 2 && Math.abs(Number(box[2]) - 841.89) < 2, 'PDF A4 portrait MediaBox');
      }
      await cdp('Emulation.setEmulatedMedia', { media: 'screen' });
    }
    const metrics = [];
    for (const kind of ['invoice', 'delivery', 'proof']) {
      await render(kind, 1);
      metrics.push(await evaluate("(()=>{const rows=['.document-company h1','.document-company p','.document-title h2','.document-title','.print-document','.document-table'].map(selector=>{const css=getComputedStyle(document.querySelector(selector));return [css.fontSize,css.paddingTop,css.paddingBottom]});const logo=getComputedStyle(document.querySelector('.document-logo'));return [logo.width,logo.height,rows]})()"));
      await evaluate(`window.printFixture(${JSON.stringify(kind)},1,undefined,true)`); await sleep(100);
      await evaluate('document.querySelector(".document-logo").decode()');
      check(await evaluate('document.querySelector(".document-info").textContent.includes(window.longValues.name)&&document.querySelector(".document-info").textContent.includes(window.longValues.address)'), 'Unusual snapshot spelling/case/repeated address preserved verbatim');
      if (kind !== 'proof') check(await evaluate('document.querySelector(".document-info").textContent.includes("Telepon: "+window.longValues.phone)'), 'Long phone preserved and labeled');
      if (kind === 'invoice') check(await evaluate('document.querySelector(".document-info").textContent.includes("Email: "+window.longValues.email)'), 'Long mixed-case email preserved and labeled');
      if (kind === 'delivery') check(await evaluate('!/Harga|Subtotal|TOTAL|Rp|Status Pembayaran|BANK-/.test(document.querySelector(".print-document").textContent)'), 'Polished delivery still fulfillment-only');
      if (kind === 'proof') check(await evaluate('!document.querySelector(".document-signatures")'), 'Customer proof remains unsigned');
      for (const width of [375, 1100]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1200, deviceScaleFactor: 1, mobile: false });
        check(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Long contact/address/product/SKU safely wraps in preview');
      }
      await cdp('Emulation.setEmulatedMedia', { media: 'print' });
      const result = await cdp('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
      fs.writeFileSync(path.join(output, `${kind}-long.pdf`), Buffer.from(result.data, 'base64'));
      await cdp('Emulation.setEmulatedMedia', { media: 'screen' });
    }
    check(JSON.stringify(metrics[0]) === JSON.stringify(metrics[1]) && JSON.stringify(metrics[0]) === JSON.stringify(metrics[2]), 'Three documents share letterhead/title/body/table scale and spacing');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: false });
    await render('invoice', 5); check(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Mobile preview no horizontal overflow');
    await evaluate('document.querySelector(".print-toolbar button").click()'); await sleep(100);
    check(await evaluate('window.printCalls===1&&window.logoReady&&window.fontsReady==="loaded"'), 'Print waits for actual logo/font readiness');
    await evaluate('document.querySelector(".document-logo").src="/images/missing-print-logo.jpg"'); await sleep(150);
    await evaluate('document.querySelector(".print-toolbar button").click()'); await sleep(100);
    check(await evaluate('window.printCalls===1&&!!document.querySelector("[role=alert]")'), 'Missing logo prevents premature print with feedback');
    check(await evaluate('window.errors.length') === 0, 'No uncaught browser errors');
    console.log(`Browser/PDF artifacts: ${output}`);
  } finally { if (socket) socket.close(); browser.kill(); await new Promise(resolve => server.close(resolve)); }
}

async function main() {
  const models = await verifyModules();
  await verifyBrowser(models);
  console.log(`PASS: ${checks} print document module/authorization/browser/PDF checks; no live services or business mutations.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
