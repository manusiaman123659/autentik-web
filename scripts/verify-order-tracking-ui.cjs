/* eslint-disable @typescript-eslint/no-require-imports -- Actual components in a local browser fixture, no live services. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;
async function main() {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.ok(fs.existsSync(edge), 'Microsoft Edge unavailable');
  const cssRoot = path.join(root, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter(name => name.endsWith('.css')).map(name => fs.readFileSync(path.join(cssRoot, name), 'utf8')).join('\n');
  const bundle = await esbuild.build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import OrderShippingInfo from './components/orders/OrderShippingInfo';
      import OrderStatusForm from './components/admin/OrderStatusForm';
      import StoreSettingsForm from './components/admin/StoreSettingsForm';
      import OrderConfirmationClient from './components/orders/OrderConfirmationClient';
      const app=createRoot(document.getElementById('app')); let version=0;
      window.errors=[]; window.toasts=[]; window.submits=[]; window.refreshes=0;
      window.addEventListener('error',e=>window.errors.push(e.message));
      window.addEventListener('unhandledrejection',e=>window.errors.push(String(e.reason)));
      window.shipping=(status='shipped',courier='JNE',trackingNumber='AWB123',paymentStatus='paid')=>app.render(<OrderShippingInfo key={++version} {...{status,courier,trackingNumber,paymentStatus}}/>);
      window.admin=(status='processing',courier='',number='',couriers=['JNE','UNKNOWN'])=>app.render(<OrderStatusForm key={++version} orderId='fixture' couriers={couriers} initial={{status,trackingCourier:courier,trackingNumber:number,cancelReason:'',updatedAt:'2026-10-06T12:00:00.123456Z'}}/>);
      window.settings=(couriers=[])=>app.render(<StoreSettingsForm key={++version} initial={{currency:'IDR',enableShipping:false,couriers}}/>);
      window.confirmation=(status='shipped',courier='JNE',trackingNumber='TEST123456789',paymentStatus='paid')=>app.render(<OrderConfirmationClient key={++version} code='ORD-20261007-9941' waNumber={null} bankAccount={null} paymentFlow='midtrans' paymentReturn={true} dbOrder={{order_code:'ORD-20261007-9941',customer_name:'Customer Fixture',status,payment_status:paymentStatus,tracking_courier:courier,tracking_number:trackingNumber,payment_method:'midtrans',subtotal:100000,shipping_cost:0,total:100000,shipping_total_weight_g:null,shipping_zone_id:null,shipping_rate_id:null,paid_at:'2026-10-07T12:00:00Z',midtrans_redirect_url:null,midtrans_order_id:null,midtrans_init_state:'idle',created_at:'2026-10-07T12:00:00Z',order_items:[]}}/>);
      window.shipping();
    `, resolveDir: root, loader: 'jsx' }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root },
    plugins: [{ name: 'boundaries', setup(build) {
      build.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'fixture-link' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture-link' }, () => ({ contents: "import React from 'react';export default function Link(props){return React.createElement('a',props)}", loader: 'js', resolveDir: root }));
      build.onResolve({ filter: /^next\/image$/ }, () => ({ path: 'image', namespace: 'fixture-image' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture-image' }, () => ({ contents: "import React from 'react';export default function Image({src,alt,width,height}){return React.createElement('img',{src,alt,width,height})}", loader: 'js', resolveDir: root }));
      build.onResolve({ filter: /^(next\/navigation|@\/lib\/actions\/(store|settings|checkout)|@\/components\/admin\/Toast)$/ }, () => ({ path: 'boundary', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export const useRouter=()=>({refresh:()=>window.refreshes++});
        export const useToast=()=>({toast:(tone,message)=>window.toasts.push({tone,message})});
        export const updateOrderStatus=async(id,input)=>{window.submits.push(input);return window.stale?{success:false,message:'Pesanan sudah berubah. Muat ulang halaman sebelum menyimpan kembali.'}:{success:true,message:'Disimpan'};};
        export const saveStoreSettings=async(input)=>{window.savedSettings=input;return {success:true,message:'Pengaturan toko berhasil disimpan.'};};
        export const regenerateMidtransPayment=async()=>{throw new Error('Unexpected payment call in tracking fixture');};
      `, loader: 'js', resolveDir: root }));
    } }],
  });
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0"><main class="p-4 max-w-4xl" id="app"></main><script src="/fixture.js"></script></body></html>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'tracking-ui-'));
  const port = 19463;
  const browser = spawn(edge, ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  let socket;
  try {
    let target;
    for (let i = 0; i < 60; i++) {
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(e => e.type === 'page'); if (target) break; } catch { /* wait for browser */ }
      await sleep(100);
    }
    assert.ok(target); socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const pending = new Map(); let sequence = 0;
    socket.onmessage = event => { const data = JSON.parse(event.data); if (data.id) { const handler = pending.get(data.id); pending.delete(data.id); if (data.error) handler.reject(data.error); else handler.resolve(data.result); } };
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
    const test = async (expression, expected, label) => { assert.equal(await evaluate(expression), expected, label); checks++; };
    const render = async expression => { await evaluate(expression); await sleep(100); };
    const click = async label => { await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`); await sleep(100); };
    const setInput = async (selector, value) => {
      await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await sleep(80);
    };
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
    for (let i = 0; i < 50; i++) { if (await evaluate('typeof window.shipping==="function"')) break; await sleep(100); }
    assert.equal(await evaluate('typeof window.shipping'), 'function', 'Browser bundle must load');
    for (const width of [375, 768, 1366]) for (const dark of [false, true]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await render(`document.documentElement.classList.toggle('dark',${dark});window.shipping('shipped','JNE','${'A'.repeat(100)}')`);
      await test('document.documentElement.scrollWidth<=innerWidth', true, `Shipping overflow ${width}/${dark}`);
      await test("document.querySelector('a').getAttribute('href')", 'https://jne.co.id/tracking-package', 'Verified tracking URL');
      await test("document.querySelector('a').getAttribute('rel')", 'noopener noreferrer', 'External security');
      await test("document.querySelector('a').target", '_blank', 'New tab');
      await render("window.admin('shipped','JNE','AWB123')");
      await test('document.documentElement.scrollWidth<=innerWidth', true, `Admin overflow ${width}/${dark}`);
      await test("document.querySelector('select').value", 'JNE', 'Prefilled select');
    }
    for (const [status, message] of [['pending', 'Informasi pengiriman akan tersedia'], ['processing', 'Pesanan sedang diproses'], ['cancelled', 'Tidak ada pengiriman aktif']]) {
      await render(`window.shipping('${status}','JNE','AWB123')`);
      await test(`document.querySelector('main').textContent.includes(${JSON.stringify(message)})`, true, status);
      await test('document.querySelectorAll("a,button").length', 0, `${status} no active shipping CTA`);
    }
    await render("window.shipping('completed')"); await test('document.querySelectorAll("button").length', 1, 'Completed tracking remains readable/copyable');
    await render("window.shipping('shipped','UNKNOWN')"); await test('document.querySelectorAll("a").length', 0, 'Unknown has no guessed destination');
    await render("window.shipping('shipped','JNE',null)"); await test("document.querySelector('main').textContent.includes('Nomor resi belum tersedia.')", true, 'Legacy missing tracking');
    await render("window.shipping('shipped','JNE','<script>alert(1)</script>')"); await test('document.querySelectorAll("a,button").length', 0, 'Unsafe legacy tracking hidden');
    await render("window.shipping('shipped','JNE','AWB123','failed')"); await test('document.querySelectorAll("a,button").length', 0, 'Failed payment no active shipping');
    await render("window.shipping();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copiedValue=value;}}})");
    await click('Salin'); await test('window.copiedValue', 'AWB123', 'Clipboard exact AWB'); await test("document.querySelector('[role=status]').textContent", 'Disalin', 'Accessible success');
    await render("window.shipping();Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined})");
    await click('Salin'); await test("document.querySelector('[role=status]').textContent.includes('secara manual')", true, 'Clipboard unavailable fallback');
    await test("document.querySelector('button').textContent", 'Salin', 'No false success');
    await render("window.shipping();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied')}}})");
    await click('Salin'); await test("document.querySelector('[role=status]').textContent.includes('secara manual')", true, 'Clipboard denied fallback');
    await render("window.admin('shipped')"); await click('Simpan Perubahan');
    await test("document.querySelector('select').getAttribute('aria-invalid')", 'true', 'Courier field validation');
    await test("document.querySelector('input').getAttribute('aria-invalid')", 'true', 'Tracking field validation');
    await render("window.admin('shipped','JNE','AWB123');window.stale=true"); await click('Simpan Perubahan');
    await test("window.toasts.some(t=>t.message.includes('Pesanan sudah berubah'))", true, 'Stale UI feedback');
    for (const status of ['completed', 'cancelled']) {
      await render(`window.admin('${status}','JNE','AWB123')`);
      await test('!document.querySelector("select") && document.querySelector("input").readOnly', true, `${status} read-only display, no editable courier`);
      await test("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Simpan Perubahan').disabled", true, 'Terminal save disabled');
    }
    await render('window.settings()');
    await test("document.querySelector('main').textContent.includes('Belum ada kurir yang dikonfigurasi.')", true, 'Settings empty state');
    for (const label of ['JNE', 'J&T', 'SiCepat', 'Ninja Xpress']) {
      await setInput('#store-courier-name', ` ${label} `); await click('Tambah Kurir');
      await test(`Boolean(document.querySelector('[aria-label="Hapus kurir ${label}"]'))`, true, 'Courier added with exact display label');
    }
    await setInput('#store-courier-name', 'jne'); await click('Tambah Kurir');
    await test("document.querySelector('#store-courier-error').textContent.includes('sudah terdaftar')", true, 'Duplicate feedback');
    await test(`document.querySelectorAll('[aria-label^="Hapus kurir"]').length`, 4, 'No duplicate silently added');
    for (const bad of [' ', 'X'.repeat(81), '<script>alert(1)</script>', 'https://evil.test', 'evil.dev']) {
      await setInput('#store-courier-name', bad); await click('Tambah Kurir');
      await test("document.querySelector('#store-courier-error').textContent.length>0", true, 'Invalid courier field feedback');
    }
    await setInput('#store-courier-name', ''); await click('Simpan Pengaturan');
    await test("JSON.stringify(window.savedSettings.couriers)", JSON.stringify(['JNE', 'J&T', 'SiCepat', 'Ninja Xpress']), 'Settings save exact labels');
    await evaluate(`window.confirm=()=>false;document.querySelector('[aria-label="Hapus kurir JNE"]').click()`); await sleep(80);
    await test(`document.querySelectorAll('[aria-label^="Hapus kurir"]').length`, 4, 'Removal confirmation cancel');
    await evaluate(`window.confirm=()=>true;document.querySelector('[aria-label="Hapus kurir JNE"]').click()`); await sleep(80);
    await test(`document.querySelectorAll('[aria-label^="Hapus kurir"]').length`, 3, 'Confirmed removal');
    await click('Simpan Pengaturan'); await test('window.savedSettings.couriers.includes("JNE")', false, 'Removal persisted through existing save');
    await render("window.admin('processing','','',[]);window.stale=false");
    await test('document.querySelector("select").disabled && document.querySelector("input").disabled', true, 'Empty list disables shipping fields');
    await test("document.querySelector('main').textContent.includes('Tambahkan kurir melalui Pengaturan Toko terlebih dahulu.')", true, 'Empty-list instruction');
    await test("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Simpan Perubahan').disabled", false, 'Unrelated processing save stays available');
    await click('Dikirim');
    await test("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Simpan Perubahan').disabled", true, 'Empty list blocks shipping save');
    await click('Dibatalkan'); await setInput('textarea', 'Fixture cancellation'); await click('Simpan Perubahan');
    await test('window.submits.at(-1).status', 'cancelled', 'Cancellation remains usable with empty list');
    await render("window.admin('shipped','ABC Cargo','AWB123',['JNE','J&T','SiCepat','Ninja Xpress'])");
    await test("document.querySelector('main').textContent.includes('Kurir tersimpan: ABC Cargo')", true, 'Removed legacy courier remains visible');
    await test("document.querySelector('main').textContent.includes('Pilih kurir lain sebelum menyimpan.')", true, 'Inactive courier warning');
    await test("document.querySelector('select').value", '', 'Removed courier shows active-selection placeholder');
    await test("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Simpan Perubahan').disabled", true, 'Inactive courier cannot be saved silently');
    await test("JSON.stringify([...document.querySelector('select').options].filter(o=>o.value&&!o.disabled).map(o=>o.value))", JSON.stringify(['JNE', 'J&T', 'SiCepat', 'Ninja Xpress']), 'Controlled configured options exactly');
    await setInput('select', 'Ninja Xpress'); await click('Simpan Perubahan');
    await test('window.submits.at(-1).trackingCourier', 'Ninja Xpress', 'Active selection required before correction');
    await render("window.admin('shipped','<img src=x onerror=alert(1)>','AWB123',['JNE'])");
    await test("document.querySelectorAll('img').length", 0, 'Legacy courier rendered as text, no HTML injection');
    for (const status of ['completed', 'cancelled']) {
      await render(`window.admin('${status}','ABC Cargo','AWB123',[])`);
      await test("document.querySelector('main').textContent.includes('Kurir tersimpan: ABC Cargo')", true, 'Terminal legacy value remains visible');
      await test('document.querySelector("input").readOnly', true, 'Terminal legacy read-only');
    }
    await render("window.shipping('shipped','Ninja Xpress','DYNAMIC123');Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copiedValue=value;}}})");
    await test("document.querySelector('main').textContent.includes('Ninja Xpress') && !document.querySelector('a')", true, 'Dynamic courier safely displayed without guessed URL');
    await click('Salin'); await test('window.copiedValue', 'DYNAMIC123', 'Dynamic tracking copy works');
    for (const width of [375, 768, 1366]) for (const dark of [false, true]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await render(`document.documentElement.classList.toggle('dark',${dark});window.settings(['${'A'.repeat(80)}'])`);
      await test('document.documentElement.scrollWidth<=innerWidth', true, `Settings long-label overflow ${width}/${dark}`);
    }
    for (const status of ['processing', 'shipped']) {
      await render(`window.admin('${status}','JNE','TEST123456789',['JNE','Ninja Xpress']);window.stale=false`);
      await test("document.querySelector('[id^=courier-]').tagName", 'SELECT', `${status} courier controlled select`);
      await test("document.querySelectorAll('input[id^=courier-]').length", 0, `${status} no editable free-text courier`);
      await test("JSON.stringify([...document.querySelector('select').options].filter(o=>o.value).map(o=>o.value))", JSON.stringify(['JNE', 'Ninja Xpress']), 'Dynamic active options only');
    }
    await setInput('select', 'Ninja Xpress'); await setInput('input', 'CORRECTED123'); await click('Simpan Perubahan');
    await test('window.submits.at(-1).status', 'shipped', 'Shipped correction preserves fulfillment status');
    await test('window.submits.at(-1).trackingCourier', 'Ninja Xpress', 'Shipped correction uses selected courier');
    await test('window.submits.at(-1).trackingNumber', 'CORRECTED123', 'Shipped correction forwards new resi');
    await render("window.confirmation();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copiedValue=value;}}})");
    await test("[...document.querySelectorAll('h1')].some(h=>h.textContent==='Pembayaran Berhasil')", true, 'Actual payment-success page tested, not only isolated shipment card');
    await test(`document.querySelector('[aria-label="Informasi Pengiriman"]').textContent.includes('TEST123456789')`, true, 'Full confirmation renders runtime AWB');
    await click('Salin'); await test('window.copiedValue', 'TEST123456789', 'Full confirmation copy works');
    await test(`document.querySelector('[aria-label="Informasi Pengiriman"] a').getAttribute('href')`, 'https://jne.co.id/tracking-package', 'Full confirmation exact JNE URL');
    await test(`document.querySelector('[aria-label="Informasi Pengiriman"] a').target`, '_blank', 'Full confirmation tracking new tab');
    await test(`document.querySelector('[aria-label="Informasi Pengiriman"] a').rel`, 'noopener noreferrer', 'Full confirmation tracking safe rel');
    for (const status of ['processing', 'completed', 'cancelled']) {
      await render(`window.confirmation('${status}')`);
      await test(`Boolean(document.querySelector('[aria-label="Informasi Pengiriman"]'))`, true, 'Full confirmation always mounts shipment section');
      await test(`Boolean(document.querySelector('[aria-label="Informasi Pengiriman"] a'))`, status === 'completed', `${status} correct tracking CTA state`);
      if (status === 'processing') await test(`document.querySelector('[aria-label="Informasi Pengiriman"]').textContent.includes('Pesanan sedang diproses')`, true, 'Prepared tracking does not imply shipment');
    }
    for (const payment of ['failed', 'refunded']) {
      await render(`window.confirmation('shipped','JNE','TEST123456789','${payment}')`);
      await test(`document.querySelector('[aria-label="Informasi Pengiriman"]').querySelectorAll('a,button').length`, 0, 'Full confirmation inactive payment has no shipment CTA');
    }
    await render("window.confirmation('shipped','Ninja Xpress')");
    await test(`document.querySelector('[aria-label="Informasi Pengiriman"]').textContent.includes('Ninja Xpress')`, true, 'Full confirmation dynamic courier visible');
    await test(`document.querySelector('[aria-label="Informasi Pengiriman"]').querySelectorAll('a').length`, 0, 'Full confirmation no guessed dynamic destination');
    await click('Salin'); await test('window.copiedValue', 'TEST123456789', 'Full confirmation unknown courier copy');
    await render('window.shipping()'); await evaluate('document.querySelector("button").focus()');
    await test('document.activeElement.getAttribute("aria-label")', 'Salin nomor resi', 'Keyboard focus label');
    await test('window.errors.length', 0, 'No browser runtime errors');
    console.log(`PASS: ${checks} actual-component browser checks; responsive 375/768/1366, light/dark, states, copy and admin validation.`);
  } finally {
    if (socket) socket.close(); browser.kill(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
