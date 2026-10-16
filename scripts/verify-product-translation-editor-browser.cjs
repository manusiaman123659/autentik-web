/* eslint-disable @typescript-eslint/no-require-imports -- Actual editor UI in Edge; live mode explicitly scopes writes to 002-owned fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;
async function connection(port, targetId, onEvent) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targetId ? targets.find(item => item.id === targetId) : targets.find(item => item.type === 'page'); assert.ok(target, 'Controlled browser page required.');
  const socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0; const pending = new Map();
  socket.onmessage = event => { const result = JSON.parse(event.data); if (!result.id) { onEvent?.(result); return; } const waiter = pending.get(result.id); pending.delete(result.id); if (!waiter) return; if (result.error) waiter.reject(Error('Browser command failed.')); else waiter.resolve(result.result); };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(Error('Browser command timed out.')); }, 120000); pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (result.exceptionDetails) throw Error('Browser expression failed; no private exception data exported.'); return result.result.value; };
  const wait = async expression => { for (let i = 0; i < 1200; i++) { try { if (await evaluate(`Boolean(${expression})`)) return; } catch { /* navigation */ } await sleep(100); } throw Error('Timed out waiting for ' + expression); };
  const test = async (expression, expected, label) => { assert.deepEqual(await evaluate(expression), expected, label); checks++; };
  const fill = async (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing field');const proto=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const click = async (text, scope = 'document') => evaluate(`(()=>{const parent=${scope};const button=[...parent.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!button||button.disabled)throw Error('Missing enabled button');button.click()})()`);
  await cdp('Page.enable'); await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
  return { socket, cdp, evaluate, wait, test, fill, click };
}
async function fixtureTests() {
  const bundle = await esbuild.build({ stdin: { resolveDir: root, loader: 'jsx', contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
    import ProductEditor from './components/admin/ProductEditor';import {ToastProvider} from './components/admin/Toast';
    import {productTranslationSaveSchema} from './lib/validations/productTranslationSchema';
    const source={id:'qa-002-browser',slug:'qa-002-browser',product_type:'sparepart',name:'Sumber Indonesia',description:'Deskripsi sumber tersimpan.',features:['Fitur A','Fitur B'],specs:[{label:'Volume',value:'850 L'},{label:'Material',value:'Baja',value_kind:'text'}],seo_title:'SEO sumber',seo_description:'Ringkasan sumber',status:'draft',is_active:false,deleted_at:null,translation_source_revision:5};
    window.snapshot={source,rows:[]};window.actions=[];window.errors=[];window.failReload=false;window.forcedFailure='';window.paths=[];
    window.addEventListener('error',e=>window.errors.push(e.message));window.addEventListener('unhandledrejection',()=>window.errors.push('Unhandled rejection'));
    window.router={push:path=>window.paths.push(path),refresh:()=>{}};
    window.reload=async()=>window.failReload?{success:false,message:'Data belum dapat dimuat.'}:{success:true,message:'Dimuat',snapshot:structuredClone(window.snapshot)};
    window.save=async raw=>{window.actions.push({kind:'save',input:raw});if(window.forcedFailure)return {success:false,message:window.forcedFailure};const data=productTranslationSaveSchema.parse(raw);const row=window.snapshot.rows.find(r=>r.locale===data.locale);if(data.expectedSourceRevision!==window.snapshot.source.translation_source_revision)return{success:false,message:'Konten sumber berubah. Muat ulang dan tinjau terjemahan.'};if((row?.version??null)!==data.expectedTranslationVersion||(row?.id??null)!==data.expectedTranslationId)return{success:false,message:'Terjemahan sudah berubah. Muat ulang sebelum menyimpan kembali.'};const p=data.payload;const next={id:row?.id??crypto.randomUUID(),version:(row?.version??0)+1,locale:data.locale,product_id:source.id,source_revision:window.snapshot.source.translation_source_revision,status:data.status,...p,features:p.features?.map(f=>f.text)??null,specs:p.specs?.map(({label,value_text})=>({label,value_text}))??null};window.snapshot.rows=window.snapshot.rows.filter(r=>r.locale!==data.locale).concat(next);return{success:true,message:'Tersimpan'}};
    window.withdraw=async(raw,remove)=>{window.actions.push({kind:remove?'delete':'unpublish',input:raw});const row=window.snapshot.rows.find(r=>r.locale===raw.locale);if(row?.id!==raw.expectedTranslationId||row?.version!==raw.expectedTranslationVersion)return{success:false,message:'Terjemahan sudah berubah. Muat ulang sebelum menyimpan kembali.'};if(remove)window.snapshot.rows=window.snapshot.rows.filter(r=>r.locale!==raw.locale);else{row.status='draft';row.version++}return{success:true,message:'Tersimpan'}};
    const app=createRoot(document.getElementById('app'));let version=0;
    window.renderEditor=(create=false,error=false)=>flushSync(()=>app.render(<ToastProvider key={++version}><ProductEditor productType={window.snapshot.source.product_type} initial={create?undefined:window.snapshot.source} initialSnapshot={create||error?null:structuredClone(window.snapshot)} translationError={error?'Data belum dapat dimuat.':''}/></ToastProvider>));
    window.renderEditor();
  ` }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root }, plugins: [{ name: 'boundaries', setup(build) {
    build.onResolve({ filter: /^(next\/link|next\/image|next\/navigation|@\/lib\/actions\/productTranslations|@\/lib\/actions\/productTranslationEditor|@\/lib\/actions\/productTranslationGeneration)$|^\.\/ProductForm$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: root, loader: 'jsx', contents: {
      'next/navigation': 'export const useRouter=()=>window.router;',
      'next/image': "import React from 'react';export default function Image({unoptimized,priority,fill,...props}){return <img {...props}/>} ",
      'next/link': "import React from 'react';export default function Link({href,...props}){return <a {...props} href={href}/>} ",
      '@/lib/actions/productTranslations': 'export const saveProductTranslation=x=>window.save(x);export const unpublishProductTranslation=x=>window.withdraw(x,false);export const deleteProductTranslation=x=>window.withdraw(x,true);',
      '@/lib/actions/productTranslationEditor': 'export const reloadProductTranslationEditor=()=>window.reload();',
      '@/lib/actions/productTranslationGeneration': 'export const generateProductTranslationDraft=async()=>({success:false,message:"Layanan draf AI belum dikonfigurasi."});',
      './ProductForm': "import React,{useState} from 'react';export default function ProductForm({initial,onBeforeNavigate}){const [name,setName]=useState(initial?.name??'');return <div><label>Konten utama<input id='fixture-source-name' value={name} onChange={e=>setName(e.target.value)}/></label><button onClick={async()=>{if(await onBeforeNavigate())window.router.push('/admin/sparepart')}}>Simpan sumber fixture</button></div>}",
    }[args.path] }));
  } }] });
  const css = fs.readdirSync(path.join(root, '.next/static'), { recursive: true }).filter(file => file.endsWith('.css')).map(file => fs.readFileSync(path.join(root, '.next/static', file), 'utf8')).join('\n');
  const server = http.createServer((req, res) => { if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); } else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); } else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="app"></div><script src="/fixture.js"></script></body></html>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'translation-002-ui-'));
  const browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=19658', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  let driver;
  try {
    for (let i = 0; i < 100; i++) { try { driver = await connection(19658); break; } catch { await sleep(100); } } assert.ok(driver);
    const { cdp, evaluate, wait, test, fill, click } = driver;
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` }); await wait('typeof window.renderEditor==="function"');
    await evaluate('window.renderEditor(true)'); await test('document.getElementById("product-tab-en").disabled', true, 'Create translation tabs disabled');
    await test('document.body.textContent.includes("Simpan produk terlebih dahulu")', true, 'Create explanation');
    await evaluate('window.renderEditor(false,true)'); await test('document.getElementById("product-tab-en").disabled', true, 'Lookup failure cannot become create');
    await click('Muat ulang data'); await wait('!document.getElementById("product-tab-en").disabled');
    await fill('#fixture-source-name', 'Indonesia belum disimpan');
    await evaluate('document.getElementById("product-tab-en").click()');
    await test('document.querySelector("[data-translation-editor=en]").textContent.includes("Sumber Indonesia")', true, 'Reference is persisted source, not unsaved canonical input');
    await fill('#en-name', 'English name'); await fill('#en-description', 'English description'); await fill('#en-seo_title', 'English SEO'); await fill('#en-seo_description', 'English summary');
    await evaluate("[...document.querySelectorAll('#product-panel-en label')].find(e=>e.textContent.trim()==='Terjemahkan fitur').querySelector('input').click()");
    await fill('#en-feature-0', 'Feature A'); await fill('#en-feature-1', 'Feature B');
    await evaluate("[...document.querySelectorAll('#product-panel-en label')].find(e=>e.textContent.trim()==='Terjemahkan spesifikasi').querySelector('input').click()");
    await fill('#en-spec-0-label', 'Capacity'); await fill('#en-spec-1-label', 'Material'); await fill('#en-spec-1-value', 'Steel');
    await test('document.querySelector("#en-spec-0-value")===null', true, 'Technical value is read-only');
    await evaluate('document.getElementById("product-tab-zh-CN").click()'); await fill('#zh-CN-name', '中文未保存');
    await evaluate('document.getElementById("product-tab-en").click()'); await test('document.querySelector("#en-description").value', 'English description', 'Tab switch retains buffer');
    await click('Simpan Draf', 'document.getElementById("product-panel-en")'); await wait('window.snapshot.rows.some(r=>r.locale==="en"&&r.status==="draft")'); await sleep(120);
    await test('Object.keys(window.actions.at(-1).input.payload).sort()', ['description','features','name','seo_description','seo_title','specs'], 'Actual UI submits six explicit fields');
    await evaluate('document.getElementById("product-tab-zh-CN").click()'); await test('document.querySelector("#zh-CN-name").value', '中文未保存', 'EN refresh preserves dirty ZH');
    await click('Simpan Draf', 'document.getElementById("product-panel-zh-CN")'); await sleep(120);
    await evaluate('document.getElementById("product-tab-en").click()'); await fill('#en-name', 'English changed');
    await evaluate('document.getElementById("product-tab-zh-CN").click()'); await fill('#zh-CN-name', '中文已发布'); await click('Terbitkan', 'document.getElementById("product-panel-zh-CN")'); await sleep(120);
    await evaluate('document.getElementById("product-tab-en").click()'); await test('document.querySelector("#en-name").value', 'English changed', 'ZH refresh preserves dirty EN');
    await click('Terbitkan', 'document.getElementById("product-panel-en")'); await sleep(120);
    await test('window.snapshot.rows.find(r=>r.locale==="en").description', 'English description', 'Single-field publication preserves stored other fields');
    await click('Batalkan Terbit', 'document.getElementById("product-panel-en")'); await sleep(120);
    await test('window.snapshot.rows.find(r=>r.locale==="en").status', 'draft', 'Unpublish RPC called');
    await evaluate("window.snapshot.source.description='Sumber berubah';window.snapshot.source.translation_source_revision++");
    await click('Muat ulang data', 'document.getElementById("product-panel-en")'); await sleep(120);
    await test('document.querySelector("#product-panel-en").textContent.includes("Perlu ditinjau ulang")', true, 'Stale visible');
    await test('[...document.querySelectorAll("#product-panel-en button")].find(e=>e.textContent.trim()==="Terbitkan").disabled', true, 'Stale cannot publish without acknowledgement');
    await evaluate("[...document.querySelectorAll('#product-panel-en label')].find(e=>e.textContent.includes('Saya telah meninjau')).querySelector('input').click()");
    await click('Terbitkan', 'document.getElementById("product-panel-en")'); await sleep(120);
    await test('window.snapshot.rows.find(r=>r.locale==="en").source_revision', 6, 'Explicit review rebases source');
    await evaluate('document.getElementById("product-tab-zh-CN").click()'); await click('Batalkan Terbit', 'document.getElementById("product-panel-zh-CN")'); await sleep(120);
    await test('window.snapshot.rows.find(r=>r.locale==="zh-CN").status', 'draft', 'Stale other locale can unpublish without source rebase');
    await evaluate('document.getElementById("product-tab-en").click()');
    await evaluate("window.snapshot.source.features.push('Fitur C');window.snapshot.source.translation_source_revision++");
    await click('Muat ulang data', 'document.getElementById("product-panel-en")'); await sleep(120);
    await test('document.querySelector("#product-panel-en").textContent.includes("Feature A")', true, 'Changed-length saved reference retained');
    await click('Susun ulang fitur', 'document.getElementById("product-panel-en")');
    await test('document.querySelector("#en-feature-2")!==null', true, 'Rebuild uses current source count');
    await fill('#en-feature-0', 'New A'); await fill('#en-feature-1', 'New B'); await fill('#en-feature-2', 'New C');
    await evaluate("[...document.querySelectorAll('#product-panel-en label')].find(e=>e.textContent.includes('Saya telah meninjau')).querySelector('input').click()");
    await click('Simpan Draf', 'document.getElementById("product-panel-en")'); await sleep(120);
    await fill('#en-name', 'Local conflict draft');
    await evaluate("window.snapshot.rows.find(r=>r.locale==='en').version++");
    await click('Simpan Draf', 'document.getElementById("product-panel-en")'); await sleep(120);
    await test('document.querySelector("#en-name").value', 'Local conflict draft', 'Conflict keeps local buffer');
    await test('document.querySelector("#product-panel-en").textContent.includes("Terjemahan sudah berubah")', true, 'Version conflict safely displayed');
    await click('Muat ulang data', 'document.getElementById("product-panel-en")'); await click('Batal', 'document.querySelector("[role=dialog]")'); await test('document.querySelector("#en-name").value', 'Local conflict draft', 'Cancel reload preserves edits');
    await click('Muat ulang data', 'document.getElementById("product-panel-en")'); await click('Lanjutkan', 'document.querySelector("[role=dialog]")'); await sleep(120);
    await fill('#en-name', 'Saved but refetch unavailable'); await evaluate('window.failReload=true'); await click('Simpan Draf', 'document.getElementById("product-panel-en")'); await sleep(120);
    await test('document.querySelector("#product-panel-en").textContent.includes("Tersimpan, data terbaru belum dapat dimuat.")', true, 'Successful write plus failed refetch blocks retries');
    await evaluate('window.failReload=false'); await click('Muat ulang data', 'document.getElementById("product-panel-en")'); await click('Lanjutkan', 'document.querySelector("[role=dialog]")'); await sleep(120);
    await fill('#en-name', 'Dirty before source navigation'); await evaluate('document.getElementById("product-tab-source").click()');
    await test('document.querySelector("#fixture-source-name").value', 'Indonesia belum disimpan', 'Canonical state preserved');
    await click('Simpan sumber fixture'); await click('Batal', 'document.querySelector("[role=dialog]")'); await test('window.paths.length', 0, 'Source navigation cancelled without losing buffers');
    if (await evaluate('!!window.navigation')) {
      await evaluate("history.pushState({},'', '/editor-qa');history.back()"); await wait('document.querySelector("[role=dialog]")'); await click('Batal', 'document.querySelector("[role=dialog]")');
      await test('location.pathname', '/editor-qa', 'Browser Back cancellation retains editor and buffers');
    }
    await evaluate('document.getElementById("product-tab-en").click()'); await click('Hapus Terjemahan', 'document.getElementById("product-panel-en")'); await click('Lanjutkan', 'document.querySelector("[role=dialog]")'); await sleep(120);
    await test('window.snapshot.rows.some(r=>r.locale==="en")', false, 'Delete locale only'); await test('window.snapshot.rows.some(r=>r.locale==="zh-CN")', true, 'Other locale survives delete');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: false }); await evaluate('document.documentElement.classList.add("dark")');
    await test('document.documentElement.scrollWidth<=innerWidth', true, 'Narrow dark editor has no horizontal overflow');
    await evaluate('document.getElementById("product-tab-source").focus()'); await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 }); await sleep(100);
    await test('document.getElementById("product-tab-en").getAttribute("aria-selected")', 'true', 'Keyboard selects next tab');
    await test('document.getElementById("product-panel-source").hidden', true, 'Hidden panel excluded from navigation');
    await test('window.errors', [], 'No browser exceptions');
    console.log(`PASS: ${checks} actual editor browser fixture assertions (isolated actions/auth; no database writes).`);
  } finally { driver?.socket.close(); browser.kill(); await new Promise(resolve => server.close(resolve)); }
}

async function liveTests() {
  require('@next/env').loadEnvConfig(root);
  const report = { phase: '002', status: 'running', checks: 0, fixtures: [], cleanup: [], actors: {} };
  const output = path.join(os.tmpdir(), 'opencode', 'product-translation-002-live-report.json');
  assert.ok(fs.existsSync(path.dirname(output)));
  const fixtures = ['b2b_system', 'sparepart'].map(type => ({ type, id: `qa-translation-002-${type === 'sparepart' ? 'component' : 'b2b'}-${randomUUID()}` }));
  report.fixtures = fixtures;
  const actor = await require('./product-translation-browser-session.cjs')(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  assert.ok(actor.canMaintain, 'Normal manually signed-in Admin required for owned QA cleanup.');
  report.actors.operations = { role: actor.role, active: actor.active, method: 'existing controlled visible browser' };
  await actor.close();
  const maintenance = await esbuild.build({ stdin: { resolveDir: root, loader: 'js', contents: `
    import {createClient} from './utils/supabase/client';const client=createClient();const owned=${JSON.stringify(fixtures)};
    window.__translation002QA=async(operation,id)=>{
      const fixture=owned.find(f=>f.id===id);if(!fixture)throw Error('QA scope denied');
      const {data:product,error}=await client.from('products').select('id,product_type,brand,name,description,features,specs,seo_title,seo_description,translation_source_revision,status,is_active,is_store_visible,deleted_at,sku,price,stock,weight_grams').eq('id',id).maybeSingle();
      if(error)throw Error('Owned QA lookup failed');if(!product)return null;
      if(product.brand!=='QA INTERNAL 002'||product.product_type!==fixture.type||product.name!=='QA INTERNAL 002 — BUKAN PRODUK JUAL')throw Error('Owned QA identity mismatch');
      const getRows=async()=>{const r=await client.from('product_translations').select('*').eq('product_id',id).order('locale');if(r.error)throw Error('Owned QA translation lookup failed');return r.data};
      if(operation==='setup'){
        const result=await client.from('products').update({features:['Fitur Indonesia A','Fitur Indonesia B'],specs:[{label:'Kapasitas',value:'850 L'},{label:'Material',value:'Baja',value_kind:'text'}]}).eq('id',id);
        if(result.error)throw Error('Owned QA source setup failed');return true;
      }
      if(operation==='cleanup'){
        for(const row of await getRows()){const r=await client.rpc('delete_product_translation',{p_product_id:id,p_locale:row.locale,p_expected_translation_version:row.version,p_expected_translation_id:row.id});if(r.error)throw Error('Owned QA guarded cleanup failed')}
        const r=await client.from('products').update({status:'draft',is_active:false,is_store_visible:false,deleted_at:new Date().toISOString()}).eq('id',id);if(r.error)throw Error('Owned QA archive failed');
        const verified=await client.from('products').select('deleted_at,status,is_active,is_store_visible').eq('id',id).single();
        if(verified.error||!verified.data?.deleted_at||verified.data.status!=='draft'||verified.data.is_active!==false||verified.data.is_store_visible!==false)throw Error('Owned QA archive not confirmed');
        const translationsRemoved=(await getRows()).length===0;if(!translationsRemoved)throw Error('Owned QA translations still present');return{translationsRemoved,archived:true,canonicalProductDeleted:false};
      }
      if(operation!=='inspect')throw Error('QA operation denied');return{product,rows:await getRows()};
    };
  ` }, bundle: true, write: false, platform: 'browser', define: { 'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL), 'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) } });
  const targets = await (await fetch('http://127.0.0.1:19657/json/list')).json();
  const target = targets.find(item => item.type === 'page' && item.url.startsWith('http://localhost:3000/')); assert.ok(target);
  const controller = await connection(19657, target.id);
  const qaTarget = await controller.cdp('Target.createTarget', { url: 'http://localhost:3000/admin/produk/new' });
  const driver = await connection(19657, qaTarget.targetId); let second; let secondTarget;
  const { cdp, evaluate, wait, test, fill, click } = driver;
  const inspect = async id => { await evaluate(maintenance.outputFiles[0].text); return evaluate(`window.__translation002QA('inspect',${JSON.stringify(id)})`); };
  const navigate = async (d, url) => { await d.cdp('Page.navigate', { url: 'http://localhost:3000' + url }); await d.wait('document.querySelector("[data-product-editor]")'); };
  const editRoute = fixture => `/admin/${fixture.type === 'sparepart' ? 'sparepart' : 'produk'}/${fixture.id}`;
  const canonical = async (d, label, value) => {
    await d.evaluate(`(()=>{const label=[...document.querySelectorAll('#product-panel-source label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const e=label?.parentElement.querySelector('input:not([type=color]),textarea');if(!e)throw Error('Canonical field missing');e.setAttribute('data-qa-field',${JSON.stringify(label)})})()`);
    await d.fill(`[data-qa-field=${JSON.stringify(label)}]`, value);
  };
  const tab = async (d, locale) => { await d.evaluate(`document.getElementById('product-tab-${locale}').click()`); await d.wait(`!document.getElementById('product-panel-${locale}').hidden`); };
  const operation = async (d, locale, action, confirm = false) => {
    await d.click(action, `document.getElementById('product-panel-${locale}')`);
    if (confirm) { await d.wait('document.querySelector("[role=dialog]")'); await d.click('Lanjutkan', 'document.querySelector("[role=dialog]")'); }
    await d.wait(`document.querySelector('#product-panel-${locale} fieldset').disabled`);
    await d.wait(`!document.querySelector('#product-panel-${locale} fieldset').disabled`);
  };
  try {
    await cdp('Page.bringToFront'); await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const fixture of fixtures) {
      await navigate(driver, `/admin/${fixture.type === 'sparepart' ? 'sparepart' : 'produk'}/new`);
      await test('document.getElementById("product-tab-en").disabled && document.getElementById("product-tab-zh-CN").disabled', true, fixture.type + ' Create tabs disabled');
      await canonical(driver, fixture.type === 'sparepart' ? 'Nama Komponen' : 'Nama Produk', 'QA INTERNAL 002 — BUKAN PRODUK JUAL');
      await canonical(driver, 'Slug (URL)', fixture.id); await canonical(driver, 'Merek', 'QA INTERNAL 002'); await canonical(driver, 'Kategori', 'QA INTERNAL 002');
      await canonical(driver, 'Deskripsi', 'Produk uji internal khusus editor terjemahan 002. Tidak dijual.');
      if (fixture.type === 'sparepart') { await canonical(driver, 'SKU', fixture.id); await canonical(driver, 'Harga (Rp)', '1000'); await canonical(driver, 'Berat (gram)', '100'); await canonical(driver, 'Stok', '0'); }
      await evaluate("[...document.querySelectorAll('#product-panel-source label')].filter(e=>e.textContent.includes('Aktif & tampil di situs')||e.textContent.includes('Tampil di Marketplace Komponen')).forEach(label=>{const c=label.querySelector('input[type=checkbox]');if(c?.checked)c.click()})");
      await click(fixture.type === 'sparepart' ? 'Simpan Komponen' : 'Simpan Produk');
      if (fixture.type === 'sparepart') {
        await wait('location.pathname==="/admin/sparepart"');
        await navigate(driver, editRoute(fixture));
      }
      await wait(`location.pathname===${JSON.stringify(editRoute(fixture))} && !document.getElementById('product-tab-en').disabled`);
      checks++; fixture.created = true;
      const created = await inspect(fixture.id); assert.equal(created.product.is_active, false); checks++; assert.equal(created.product.status, 'draft'); checks++;
      await evaluate(maintenance.outputFiles[0].text); await evaluate(`window.__translation002QA('setup',${JSON.stringify(fixture.id)})`);
      const canonicalBefore = (await inspect(fixture.id)).product;
      await navigate(driver, editRoute(fixture)); await tab(driver, 'en');
      await fill('#en-name', 'Internal English 002'); await fill('#en-description', 'Internal English description.'); await fill('#en-seo_title', 'English SEO 002'); await fill('#en-seo_description', 'English SEO summary.');
      await evaluate("[...document.querySelectorAll('#product-panel-en label')].filter(e=>['Terjemahkan fitur','Terjemahkan spesifikasi'].includes(e.textContent.trim())).forEach(e=>e.querySelector('input').click())");
      await fill('#en-feature-0', 'Internal feature A'); await fill('#en-feature-1', 'Internal feature B'); await fill('#en-spec-0-label', 'Capacity'); await fill('#en-spec-1-label', 'Material'); await fill('#en-spec-1-value', 'Steel');
      await test('document.querySelector("#en-spec-0-value")===null', true, fixture.type + ' Technical value read-only');
      await operation(driver, 'en', 'Simpan Draf');
      let data = await inspect(fixture.id); let en = data.rows.find(row => row.locale === 'en'); assert.equal(en.status, 'draft'); checks++;
      assert.equal(en.specs[0].value_text, null); checks++; assert.equal(en.specs[1].value_text, 'Steel'); checks++;
      await tab(driver, 'zh-CN'); await fill('#zh-CN-name', '中文尚未保存'); await tab(driver, 'en'); await fill('#en-name', 'English single-field edit'); await operation(driver, 'en', 'Terbitkan');
      data = await inspect(fixture.id); en = data.rows.find(row => row.locale === 'en'); assert.equal(en.description, 'Internal English description.'); checks++; assert.deepEqual(en.features, ['Internal feature A', 'Internal feature B']); checks++; assert.equal(en.seo_title, 'English SEO 002'); checks++; assert.equal(en.seo_description, 'English SEO summary.'); checks++;
      assert.deepEqual(data.product, canonicalBefore, 'Translation UI saves never alter canonical Product content/configuration'); checks++;
      await tab(driver, 'zh-CN'); await test('document.getElementById("zh-CN-name").value', '中文尚未保存', fixture.type + ' Dirty ZH survives EN refresh');
      await operation(driver, 'zh-CN', 'Simpan Draf'); await operation(driver, 'zh-CN', 'Terbitkan'); await operation(driver, 'zh-CN', 'Batalkan Terbit');
      await tab(driver, 'en'); await operation(driver, 'en', 'Batalkan Terbit');
      await tab(driver, 'source'); await canonical(driver, 'Deskripsi', 'Sumber Indonesia berubah untuk tinjauan terjemahan 002.'); await click(fixture.type === 'sparepart' ? 'Simpan Komponen' : 'Simpan Produk');
      await wait(`location.pathname===${JSON.stringify(fixture.type === 'sparepart' ? '/admin/sparepart' : '/admin/produk')}`);
      await navigate(driver, editRoute(fixture)); await tab(driver, 'en');
      await test('document.getElementById("product-panel-en").textContent.includes("Perlu ditinjau ulang")', true, fixture.type + ' Source edit makes translation stale');
      await test('[...document.querySelectorAll("#product-panel-en button")].find(e=>e.textContent.trim()==="Terbitkan").disabled', true, fixture.type + ' Review acknowledgement required');
      await evaluate("[...document.querySelectorAll('#product-panel-en label')].find(e=>e.textContent.includes('Saya telah meninjau')).querySelector('input').click()"); await operation(driver, 'en', 'Terbitkan');
      data = await inspect(fixture.id); assert.equal(data.rows.find(row => row.locale === 'en').source_revision, data.product.translation_source_revision); checks++;
      await tab(driver, 'zh-CN'); await operation(driver, 'zh-CN', 'Hapus Terjemahan', true); await tab(driver, 'en'); await operation(driver, 'en', 'Hapus Terjemahan', true);
      data = await inspect(fixture.id); assert.equal(data.rows.length, 0); checks++;
      console.log(JSON.stringify({ product_type: fixture.type, createRedirect: true, lifecycle: 'passed', sourceReview: 'passed', publicProductActivated: false }));
    }
    const fixture = fixtures[1]; await tab(driver, 'en'); await fill('#en-name', 'Original UUID 002'); await operation(driver, 'en', 'Simpan Draf');
    secondTarget = await cdp('Target.createTarget', { url: 'http://localhost:3000' + editRoute(fixture) }); second = await connection(19657, secondTarget.targetId); await second.wait('document.querySelector("[data-product-editor]")'); await tab(second, 'en');
    await fill('#en-name', 'Local version conflict 002'); await second.fill('#en-name', 'Other editor saves 002'); await operation(second, 'en', 'Simpan Draf');
    await operation(driver, 'en', 'Simpan Draf'); await test('document.getElementById("product-panel-en").textContent.includes("Terjemahan sudah berubah")', true, 'Real two-editor version conflict'); await test('document.getElementById("en-name").value', 'Local version conflict 002', 'Real conflict retains local work');
    await click('Muat ulang data', 'document.getElementById("product-panel-en")'); await click('Batal', 'document.querySelector("[role=dialog]")'); await test('document.getElementById("en-name").value', 'Local version conflict 002', 'Real reload cancellation preserves buffer');
    await click('Muat ulang data', 'document.getElementById("product-panel-en")'); await click('Lanjutkan', 'document.querySelector("[role=dialog]")'); await sleep(500); await wait('document.getElementById("en-name").value==="Other editor saves 002"');
    await fill('#en-name', 'Local source conflict 002'); await tab(second, 'source'); await canonical(second, 'Deskripsi', 'Perubahan sumber dari editor kedua untuk konflik 002.'); await second.click('Simpan Komponen'); await second.wait('location.pathname==="/admin/sparepart"');
    await operation(driver, 'en', 'Simpan Draf'); await test('document.getElementById("product-panel-en").textContent.includes("Konten sumber berubah")', true, 'Real source revision conflict');
    await click('Muat ulang data', 'document.getElementById("product-panel-en")'); await click('Lanjutkan', 'document.querySelector("[role=dialog]")'); await sleep(500); await wait('!document.querySelector("#product-panel-en fieldset").disabled');
    await operation(driver, 'en', 'Hapus Terjemahan', true); await fill('#en-name', 'ABA original 002'); await operation(driver, 'en', 'Simpan Draf'); const original = (await inspect(fixture.id)).rows.find(row => row.locale === 'en');
    await navigate(second, editRoute(fixture)); await tab(second, 'en'); await operation(second, 'en', 'Hapus Terjemahan', true); await second.fill('#en-name', 'ABA recreated 002'); await operation(second, 'en', 'Simpan Draf');
    const recreated = (await inspect(fixture.id)).rows.find(row => row.locale === 'en'); assert.equal(original.version, recreated.version); checks++; assert.notEqual(original.id, recreated.id); checks++;
    await fill('#en-name', 'Must not overwrite recreated locale'); await operation(driver, 'en', 'Simpan Draf'); await test('document.getElementById("product-panel-en").textContent.includes("Terjemahan sudah berubah")', true, 'Real UUID/equal-version conflict');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: false });
    await evaluate('document.documentElement.classList.add("dark")');
    await test('document.documentElement.scrollWidth<=innerWidth', true, 'Live narrow editor no horizontal overflow');
    await test('document.documentElement.classList.contains("dark")', true, 'Live dark editor');
    await evaluate('document.getElementById("product-tab-source").focus()'); await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35 }); await sleep(120);
    await test('document.getElementById("product-tab-zh-CN").getAttribute("aria-selected")', 'true', 'Live keyboard End selects Chinese');
    report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.failure = error.message; process.exitCode = 1; }
  finally {
    try { for (const fixture of fixtures) { await evaluate(maintenance.outputFiles[0].text); const cleanup = await evaluate(`window.__translation002QA('cleanup',${JSON.stringify(fixture.id)})`); if (cleanup) report.cleanup.push({ id: fixture.id, ...cleanup }); } }
    catch { report.cleanupFailure = 'Inspect/archive only the listed 002-owned QA fixtures; never delete a canonical Product.'; report.status = 'failed'; process.exitCode = 1; }
    if (secondTarget) await controller.cdp('Target.closeTarget', { targetId: secondTarget.targetId }); second?.socket.close();
    await evaluate('delete window.__translation002QA'); await cdp('Emulation.clearDeviceMetricsOverride');
    await controller.cdp('Target.closeTarget', { targetId: qaTarget.targetId }); driver.socket.close(); controller.socket.close(); report.checks = checks; fs.writeFileSync(output, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
}
module.exports = { connection };
if (require.main === module) (process.argv.includes('--live') ? liveTests() : fixtureTests()).catch(error => { console.error(error.message); process.exitCode = 1; });
