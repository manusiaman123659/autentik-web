/* eslint-disable @typescript-eslint/no-require-imports -- Actual ProductForm/editor; only navigation/auth/action boundaries are fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const esbuild = require('esbuild');
const { connection } = require('./verify-product-translation-editor-browser.cjs');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;
const driverTest = driver => async (expression, expected, label) => { assert.deepEqual(await driver.evaluate(expression), expected, label); checks++; };

async function fixtureTests() {
  const bundle = await esbuild.build({ stdin: { resolveDir: root, loader: 'jsx', contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
    import ProductEditor from './components/admin/ProductEditor';import {ToastProvider} from './components/admin/Toast';
    import {parseEditorSnapshot} from './lib/product-translation-editor';import {productSchema} from './lib/validations/productSchema';
    window.calls=[];window.paths=[];window.refreshes=0;window.fail=false;window.errors=[];
    window.addEventListener('error',e=>window.errors.push(e.message));window.addEventListener('unhandledrejection',()=>window.errors.push('Unhandled rejection'));
    window.router={push:path=>window.paths.push(path),refresh:()=>window.refreshes++};
    window.save=async(...args)=>{window.calls.push(args);const parsed=productSchema.safeParse(args[0]);if(!parsed.success||window.fail)return {success:false,message:'Periksa isian QA.',errors:{name:'Kesalahan QA'}};return{success:true,message:'Tersimpan',productId:args[0].id||args[0].slug}};
    const app=createRoot(document.getElementById('app'));let version=0;
    window.renderCase=(type='sparepart',edit=false)=>{window.calls=[];window.paths=[];window.refreshes=0;window.fail=false;const source={id:'qa-save',slug:'qa-save',product_type:type,name:'QA Komponen First Save',brand:'QA INTERNAL SAVE',brand_id:null,category:'QA SAVE',description:'Deskripsi QA first-save.',features:[],specs:[],seo_title:null,seo_description:null,translation_source_revision:1,deleted_at:null,status:'draft',is_active:false,is_store_visible:false,sku:'QA-DOUBLE-SAVE-001',price:12345,stock:17,weight_grams:250,fulfillment_type:'ready_stock'};flushSync(()=>app.render(<ToastProvider key={++version}><ProductEditor productType={type} initial={edit?source:undefined} initialSnapshot={edit?parseEditorSnapshot(source,[]):null}/></ToastProvider>))};
    window.renderCase();
  ` }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root }, plugins: [{ name: 'boundaries', setup(build) {
    build.onResolve({ filter: /^(next\/link|next\/navigation|next\/dynamic|next\/image|@\/utils\/supabase\/client|@\/lib\/actions\/products|@\/lib\/actions\/technicalDocuments|@\/lib\/actions\/productTranslations|@\/lib\/actions\/productTranslationEditor)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: root, loader: 'jsx', contents: {
      'next/link': "import React from 'react';export default function Link({href,...props}){return <a {...props} href={href}/>} ",
      'next/navigation': 'export const useRouter=()=>window.router;',
      'next/dynamic': 'export default function dynamic(){return ()=>null}',
      'next/image': "import React from 'react';export default function Image({fill,priority,...props}){return <img {...props}/>} ",
      '@/utils/supabase/client': 'export const createClient=()=>({auth:{getSession:async()=>({data:{session:null}})}});',
      '@/lib/actions/products': 'export const upsertProduct=(...args)=>window.save(...args);',
      '@/lib/actions/technicalDocuments': 'export const upsertTechnicalDocument=async()=>({success:true});export const deleteTechnicalDocument=async()=>({success:true});',
      '@/lib/actions/productTranslations': 'export const saveProductTranslation=async()=>({success:true});export const unpublishProductTranslation=async()=>({success:true});export const deleteProductTranslation=async()=>({success:true});',
      '@/lib/actions/productTranslationEditor': 'export const reloadProductTranslationEditor=async()=>({success:false,message:"Tidak dimuat pada fixture ini."});',
    }[args.path] }));
  } }] });
  const css = fs.readdirSync(path.join(root, '.next/static'), { recursive: true }).filter(file => file.endsWith('.css')).map(file => fs.readFileSync(path.join(root, '.next/static', file), 'utf8')).join('\n');
  const server = http.createServer((req, res) => { if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); } else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); } else res.end('<html><head><link rel="stylesheet" href="/fixture.css"></head><body><div id="app"></div><script src="/fixture.js"></script></body></html>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'komponen-save-'));
  const browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--no-first-run', '--remote-debugging-port=19659', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  let driver;
  try {
    for (let i = 0; i < 100; i++) { try { driver = await connection(19659); break; } catch { await sleep(100); } } assert.ok(driver);
    const { cdp, evaluate, wait, fill, click } = driver; const test = driverTest(driver);
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` }); await wait('typeof window.renderCase==="function"');
    const fillField = async (label, value) => { await evaluate(`(()=>{const label=[...document.querySelectorAll('#product-panel-source label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const input=label?.parentElement.querySelector('input:not([type=color]),textarea');if(!input)throw Error('Field missing');input.setAttribute('data-qa-field',${JSON.stringify(label)})})()`); await fill(`[data-qa-field=${JSON.stringify(label)}]`, value); };
    for (const [type, edit, destination] of [['sparepart',false,'/admin/sparepart'],['b2b_system',false,'/admin/produk/qa-save?created=1'],['sparepart',true,'/admin/sparepart'],['b2b_system',true,'/admin/produk']]) {
      await evaluate(`window.renderCase('${type}',${edit})`); await sleep(100);
      if (!edit) {
        for (const [label,value] of [[type==='sparepart'?'Nama Komponen':'Nama Produk','QA Komponen First Save'],['Slug (URL)','qa-save'],['Merek','QA INTERNAL SAVE'],['Kategori','QA SAVE'],['Deskripsi','Deskripsi QA first-save.']]) await fillField(label,value);
        if(type==='sparepart')for(const [label,value]of [['SKU','QA-DOUBLE-SAVE-001'],['Harga (Rp)','12345'],['Stok','17'],['Berat (gram)','250']])await fillField(label,value);
      }
      await click(type==='sparepart'?'Simpan Komponen':'Simpan Produk'); await wait('window.paths.length>0');
      await test('window.calls.length',1,type+'/'+edit+' Exactly one upsert'); await test('window.paths',[destination],type+'/'+edit+' First-save navigation');
      if(type==='sparepart')await test('(()=>{const p=window.calls[0][0];return {name:p.name,sku:p.sku,stock:p.stock,price:p.price,weight:p.weightGrams,brand:p.brand,category:p.category,description:p.description}})()', {name:'QA Komponen First Save',sku:'QA-DOUBLE-SAVE-001',stock:'17',price:'12345',weight:'250',brand:'QA INTERNAL SAVE',category:'QA SAVE',description:'Deskripsi QA first-save.'}, 'Expected raw controlled-state payload');
      await test('document.querySelector("[role=dialog]")===null',true,'Clean save no needless confirmation');
    }
    await evaluate("window.renderCase('sparepart',true);window.fail=true"); await sleep(100); await click('Simpan Komponen'); await sleep(100);
    await test('window.calls.length',1,'Failed save attempted once'); await test('window.paths',[],'Failed save no navigation');
    for(const locale of ['en','zh-CN']) {
      await evaluate("window.renderCase('sparepart',true)"); await sleep(100); await evaluate(`document.getElementById('product-tab-${locale}').click()`); await fill(`#${locale}-name`,'Unsaved locale'); await evaluate('document.getElementById("product-tab-source").click()');
      await click('Simpan Komponen'); await wait('document.querySelector("[role=dialog]")'); await click('Batal','document.querySelector("[role=dialog]")');
      await test('window.calls.length',0,locale+' Cancel no save'); await test('window.paths',[],locale+' Cancel no navigation'); await test(`document.getElementById('${locale}-name').value`,'Unsaved locale',locale+' Cancel retains buffer');
      await click('Simpan Komponen'); await click('Lanjutkan','document.querySelector("[role=dialog]")'); await wait('window.paths.length>0');
      await test('window.calls.length',1,locale+' Continue exactly one save'); await test('window.paths',['/admin/sparepart'],locale+' Continue correct destination');
    }
    await test('window.errors',[],'No fixture browser errors'); console.log(`PASS: ${checks} real ProductForm navigation/payload/dirty-guard assertions (no DB writes).`);
  } finally { driver?.socket.close(); browser.kill(); await new Promise(resolve => server.close(resolve)); }
}
async function liveTests() {
  require('@next/env').loadEnvConfig(root);
  const report = { status:'running',actor:null,checks:0,flows:[],cleanup:[] };
  const output = path.join(os.tmpdir(),'opencode','komponen-first-save-report.json'); assert.ok(fs.existsSync(path.dirname(output)));
  const fixtures = [
    {type:'sparepart',id:'qa-double-save-a-'+randomUUID(),name:'QA Komponen First Save',sku:'QA-DOUBLE-SAVE-001'},
    {type:'sparepart',id:'qa-double-save-b-'+randomUUID(),name:'QA Komponen First Save — Blur',sku:'QA-DOUBLE-SAVE-002'},
    {type:'b2b_system',id:'qa-double-save-b2b-'+randomUUID(),name:'QA B2B First Save',sku:null},
  ];
  report.fixtures=fixtures;
  const actor = await require('./product-translation-browser-session.cjs')(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  assert.ok(actor.canMaintain,'Manually signed-in Admin required for owned QA maintenance.');report.actor={role:actor.role,active:actor.active};await actor.close();
  const maintenance = await esbuild.build({stdin:{resolveDir:root,loader:'js',contents:`
    import {createClient} from './utils/supabase/client';const client=createClient();const owned=${JSON.stringify(fixtures)};
    window.__saveQA=async(operation,id)=>{
      const fixture=owned.find(f=>f.id===id);if(!fixture)throw Error('QA scope denied');
      const p=await client.from('products').select('id,slug,name,sku,brand,category,price,stock,weight_grams,description,product_type,status,is_active,is_store_visible,deleted_at').eq('id',id).maybeSingle();
      if(p.error)throw Error('QA lookup failed');if(!p.data)return null;
      if(p.data.product_type!==fixture.type||!p.data.brand.startsWith('QA SAVE')||!p.data.name.startsWith(fixture.type==='sparepart'?'QA Komponen First Save':'QA B2B First Save'))throw Error('QA ownership not confirmed');
      if(operation==='inspect')return p.data;
      if(operation!=='cleanup')throw Error('QA operation denied');
      const rows=await client.from('product_translations').select('id,locale,version').eq('product_id',id);if(rows.error)throw Error('QA translation cleanup lookup failed');
      for(const row of rows.data){const r=await client.rpc('delete_product_translation',{p_product_id:id,p_locale:row.locale,p_expected_translation_version:row.version,p_expected_translation_id:row.id});if(r.error)throw Error('Guarded QA translation cleanup failed')}
      const v=await client.from('product_variants').select('id').eq('product_id',id).is('deleted_at',null);if(v.error||v.data.length)throw Error('Unexpected QA child rows; inspect only owned QA before cleanup');
      const r=await client.from('products').update({deleted_at:new Date().toISOString(),status:'draft',is_active:false,is_store_visible:false}).eq('id',id);if(r.error)throw Error('QA archive failed');
      const verified=await client.from('products').select('id,deleted_at,status,is_active,is_store_visible').eq('id',id).single();if(verified.error||!verified.data.deleted_at||verified.data.is_active||verified.data.is_store_visible||verified.data.status!=='draft')throw Error('QA archive unconfirmed');
      const remaining=await client.from('product_translations').select('id').eq('product_id',id);if(remaining.error||remaining.data.length)throw Error('QA translations still present');
      return{archived:true,canonicalProductExists:true,translationsRemoved:true,childRows:0};
    };
  `},bundle:true,write:false,platform:'browser',define:{'process.env.NEXT_PUBLIC_SUPABASE_URL':JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL),'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)}});
  const targets=await(await fetch('http://127.0.0.1:19657/json/list')).json();const original=targets.find(t=>t.type==='page'&&t.url.startsWith('http://localhost:3000/'));assert.ok(original);
  const controller=await connection(19657,original.id);const target=await controller.cdp('Target.createTarget',{url:'http://localhost:3000/admin/sparepart/new'});
  const traces=[];const requestMap=new Map();const captureErrors=[];const loadedDocuments=new Set();let driver;
  const fields=['id','slug','productType','name','sku','brand','category','price','stock','weightGrams','description'];
  const selectPayload=p=>Object.fromEntries(fields.filter(key=>p[key]!==undefined&&p[key]!=='$undefined').map(key=>[key,p[key]]));
  driver=await connection(19657,target.targetId,event=>{
    if(event.method==='Page.lifecycleEvent'&&event.params.name==='load')loadedDocuments.add(event.params.loaderId);
    // Only QA action bodies/results are selected. No headers, cookies or storage are read.
    if(event.method==='Network.requestWillBeSent') {
      const r=event.params.request;if(r.method!=='POST'||!r.url.startsWith('http://localhost:3000/admin/')||!r.postData)return;
      try{const args=JSON.parse(r.postData);const p=Array.isArray(args)?args[0]:null;const id=p?.id&&p.id!=='$undefined'?p.id:p?.slug;if(!p||typeof p!=='object'||!fixtures.some(f=>f.id===id))return;const trace={payload:selectPayload(p),result:null};traces.push(trace);requestMap.set(event.params.requestId,trace)}catch{/* Non-QA or non-product action */}
    }
    if(event.method==='Network.loadingFinished'&&requestMap.has(event.params.requestId)) {
      const trace=requestMap.get(event.params.requestId);
      void driver.cdp('Network.getResponseBody',{requestId:event.params.requestId}).then(response=>{
        const body=response.base64Encoded?Buffer.from(response.body,'base64').toString('utf8'):response.body;
        for(const line of body.split('\n')){const colon=line.indexOf(':');if(colon<0)continue;try{const value=JSON.parse(line.slice(colon+1));if(value&&typeof value.success==='boolean'&&(!value.productId||value.productId===(trace.payload.id||trace.payload.slug))){trace.result={success:value.success,message:value.message,productId:value.productId};break}}catch{/* Not action result */}}
      }).catch(()=>captureErrors.push('Owned QA action result could not be captured.'));
    }
  });
  const {cdp,evaluate,wait,fill,click}=driver;const test=driverTest(driver);
  await cdp('Network.enable');await cdp('Page.setLifecycleEventsEnabled',{enabled:true});await cdp('Page.bringToFront');await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const route=f=>`/admin/${f.type==='sparepart'?'sparepart':'produk'}/${f.id}`;
  const navigate=async url=>{const nav=await cdp('Page.navigate',{url:'http://localhost:3000'+url});if(nav.loaderId){for(let i=0;i<1200&&!loadedDocuments.has(nav.loaderId);i++)await sleep(100);assert.ok(loadedDocuments.has(nav.loaderId),'New QA document must finish loading before entering values')}await wait(`location.pathname===${JSON.stringify(url)} && document.querySelector('[data-product-editor]')`)};
  const inspect=async id=>{await evaluate(maintenance.outputFiles[0].text);return evaluate(`window.__saveQA('inspect',${JSON.stringify(id)})`)};
  const labels={name:'Nama Komponen',sku:'SKU',brand:'Merek',category:'Kategori',price:'Harga (Rp)',stock:'Stok',weightGrams:'Berat (gram)',description:'Deskripsi'};
  const fieldSelector=async(label)=>{await evaluate(`(()=>{const l=[...document.querySelectorAll('#product-panel-source label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const e=l?.parentElement.querySelector('input:not([type=color]),textarea');if(!e)throw Error('QA field missing');e.setAttribute('data-save-qa',${JSON.stringify(label)})})()`);return `[data-save-qa=${JSON.stringify(label)}]`};
  const typeField=async(label,value)=>{const selector=await fieldSelector(label);await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await cdp('Input.insertText',{text:String(value)});return selector};
  const physicalSave=async f=>{const rect=await evaluate(`(()=>{const b=[...document.querySelectorAll('#product-panel-source button')].find(e=>e.textContent.trim()===${JSON.stringify(f.type==='sparepart'?'Simpan Komponen':'Simpan Produk')});if(!b||b.disabled)throw Error('Save unavailable');b.scrollIntoView({block:'center',behavior:'instant'});const r=b.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;if(document.elementFromPoint(x,y)?.closest('button')!==b)throw Error('Save hit target is not ready');return{x,y}})()`);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect})};
  const valuesBefore=async f=>evaluate(`(()=>{const out={};for(const [key,label]of Object.entries(${JSON.stringify({...labels,slug:'Slug (URL)',name:f.type==='sparepart'?'Nama Komponen':'Nama Produk'})})){const l=[...document.querySelectorAll('#product-panel-source label')].find(e=>e.textContent.trim()===label);const e=l?.parentElement.querySelector('input:not([type=color]),textarea');if(e)out[key]=e.value}return out})()`);
  const rawExpected=(f,values)=>({slug:f.id,...Object.fromEntries(Object.entries(values).filter(([key])=>f.type==='sparepart'||!['sku','price','stock','weightGrams'].includes(key)).map(([key,value])=>[key,String(value)]))});
  const verifyValues=(data,f,expected)=>{const out={};for(const [key,value]of Object.entries(expected)){if(f.type!=='sparepart'&&['sku','price','stock','weightGrams'].includes(key))continue;const dbKey=key==='weightGrams'?'weight_grams':key;const normalized=['price','stock','weightGrams'].includes(key)?Number(value):value;assert.deepEqual(data[dbKey],normalized,'First-save DB field '+key);checks++;out[dbKey]=data[dbKey]}return out};
  const saveAndCheck=async(f,expected,destination,description,{blur=false,dirty=null}={})=>{
    const before=await valuesBefore(f);const start=traces.length;
    report.pending={description,fixtureId:f.id,before,expected:rawExpected(f,expected)};
    assert.deepEqual(before,rawExpected(f,expected),'Owned QA fields must match before any submit');checks++;
    if(blur)await evaluate('document.activeElement.blur()');await physicalSave(f);
    if(dirty){await wait('document.querySelector("[role=dialog]")');await click('Lanjutkan','document.querySelector("[role=dialog]")')}
    await wait(`location.pathname===${JSON.stringify(destination)}`);
    for(let i=0;i<300&&!traces.slice(start).some(t=>t.result);i++)await sleep(100);
    const submitted=traces.slice(start);assert.equal(submitted.length,1,description+' one action');checks++;assert.equal(submitted[0].result?.success,true,description+' action succeeded');checks++;
    const expectedRaw=rawExpected(f,expected);for(const [key,value]of Object.entries(expectedRaw)){assert.equal(submitted[0].payload[key],value,'Payload field '+key);checks++}
    const db=await inspect(f.id);assert.ok(db);checks++;const database=verifyValues(db,f,expected);
    const entry={description,fixtureId:f.id,before,action:submitted[0],database,destination,explicitBlur:blur};report.flows.push(entry);
    if(f.type==='sparepart') {
      const selector='input[placeholder="Cari nama, slug, merek, kategori, SKU..."]';await wait(`document.querySelector(${JSON.stringify(selector)})`);await fill(selector,f.id);
      await wait(`document.querySelector('tbody a[href=${JSON.stringify(route(f))}]')`);
      const rendered=await evaluate(`(()=>{const row=document.querySelector('tbody a[href=${JSON.stringify(route(f))}]').closest('tr');return [...row.querySelectorAll('td')].map(e=>e.textContent.trim())})()`);
      assert.ok(rendered[0].includes(expected.name));assert.equal(rendered[1],expected.sku);assert.ok(rendered[2].includes(new Intl.NumberFormat('id-ID').format(Number(expected.price))));assert.equal(rendered[3],expected.stock+' pcs');checks+=4;entry.list=rendered.slice(0,5);
    }
    await navigate(route(f));const persisted=await valuesBefore(f);assert.deepEqual(persisted,expectedRaw,'Reopening edit without saving reads persisted fields');checks++;entry.reopened=persisted;
    console.log(JSON.stringify({flow:description,fixtureId:f.id,actionCount:submitted.length,firstSaveMatches:true,destination}));
  };
  try {
    for(const [index,f]of fixtures.entries()) {
      await navigate(`/admin/${f.type==='sparepart'?'sparepart':'produk'}/new`);
      const expected={name:f.name,sku:f.sku,stock:'17',price:'12345',weightGrams:'250',brand:'QA SAVE',category:'QA SAVE',description:'Deskripsi QA first-save, tidak dijual.'};
      await typeField(f.type==='sparepart'?'Nama Komponen':'Nama Produk',expected.name);await typeField('Slug (URL)',f.id);
      for(const key of ['brand','category',...(f.type==='sparepart'?['sku','price','stock','weightGrams']:[]),'description'])await typeField(labels[key],expected[key]);
      await evaluate("[...document.querySelectorAll('#product-panel-source label')].filter(l=>l.textContent.includes('Aktif & tampil di situs')||l.textContent.includes('Tampil di Marketplace Komponen')).forEach(l=>{const c=l.querySelector('input[type=checkbox]');if(c?.checked)c.click()})");
      await typeField('Deskripsi',expected.description);
      await saveAndCheck(f,expected,f.type==='sparepart'?'/admin/sparepart':route(f),'CREATE '+f.type+(index===1?' blur':' immediate'),{blur:index===1});
      f.expected=expected;
    }
    const f=fixtures[0];let expected={...f.expected};await navigate(route(f));
    const edits={name:'QA Komponen First Save — Edit',sku:'QA-DOUBLE-SAVE-001-EDIT',brand:'QA SAVE EDIT',category:'QA SAVE EDIT',price:'23456',stock:'29',weightGrams:'350',description:'Deskripsi QA diubah dengan satu kali simpan.'};
    for(const [key,value]of Object.entries(edits)) {
      expected={...expected,[key]:value};await typeField(labels[key],value);await saveAndCheck(f,expected,'/admin/sparepart','EDIT '+key+' immediate');
      await typeField(labels[key],value);await saveAndCheck(f,expected,'/admin/sparepart','EDIT '+key+' explicit blur',{blur:true});
    }
    const b2b=fixtures[2];const b2bExpected={...b2b.expected,description:'Deskripsi B2B QA diubah satu kali.'};await navigate(route(b2b));await typeField('Deskripsi',b2bExpected.description);await saveAndCheck(b2b,b2bExpected,'/admin/produk','B2B EDIT');
    await navigate(route(f));
    for(const locale of ['en','zh-CN']) {
      await evaluate(`document.getElementById('product-tab-${locale}').click()`);await fill(`#${locale}-name`,'Dirty QA locale');await evaluate('document.getElementById("product-tab-source").click()');
      expected={...expected,description:'Deskripsi QA dirty '+locale};await typeField('Deskripsi',expected.description);const start=traces.length;await physicalSave(f);await wait('document.querySelector("[role=dialog]")');await click('Batal','document.querySelector("[role=dialog]")');await sleep(300);
      assert.equal(traces.length,start,'Dirty cancel no source action');checks++;await test('location.pathname',route(f),locale+' Cancel no navigation');await test(`document.getElementById('${locale}-name').value`,'Dirty QA locale',locale+' Cancel preserves locale');
      await saveAndCheck(f,expected,'/admin/sparepart','DIRTY '+locale+' continue',{dirty:locale});
    }
    assert.deepEqual(captureErrors,[]);checks++;report.status='passed';
  } catch(error) {report.status='failed';report.failure=error.message;report.actionTraces=traces;report.failureState=await evaluate('({path:location.pathname,fieldErrors:[...document.querySelectorAll("#product-panel-source li")].map(e=>e.textContent.trim())})');process.exitCode=1}
  finally {
    try{for(const f of fixtures){await evaluate(maintenance.outputFiles[0].text);const cleaned=await evaluate(`window.__saveQA('cleanup',${JSON.stringify(f.id)})`);if(cleaned)report.cleanup.push({id:f.id,...cleaned})}}
    catch{report.cleanupFailure='Check only the listed owned QA IDs before retrying.';report.status='failed';process.exitCode=1}
    await evaluate('delete window.__saveQA');await controller.cdp('Target.closeTarget',{targetId:target.targetId});driver.socket.close();controller.socket.close();report.checks=checks;fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks,flows:report.flows.length,actor:report.actor,fixtures:fixtures.map(f=>({id:f.id,type:f.type})),cleanup:report.cleanup,failure:report.failure,report:output},null,2));
  }
}
(process.argv.includes('--live') ? liveTests() : fixtureTests()).catch(error => { console.error(error.message); process.exitCode=1; });
