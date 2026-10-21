/* eslint-disable @typescript-eslint/no-require-imports -- Actual Brand/shared components in Edge; only auth, Storage, router and action transport mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;

async function main() {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.ok(fs.existsSync(edge), 'Microsoft Edge required by existing fixture approach');
  const cssRoot = path.join(root, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(cssRoot, f), 'utf8')).join('\n');
  const bundle = await esbuild.build({ stdin: { contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
    import BrandForm from './components/admin/BrandForm';import ImageUploadField from './components/admin/ImageUploadField';
    const app=createRoot(document.getElementById('app'));window.errors=[];window.activeUrls=new Set();
    window.addEventListener('error',e=>window.errors.push(e.message));window.addEventListener('unhandledrejection',e=>window.errors.push(String(e.reason)));
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=f=>{const u=create(f);window.activeUrls.add(u);return u};URL.revokeObjectURL=u=>{window.activeUrls.delete(u);revoke(u)};
    window.base={id:'brand-a',name:'Brand A',segment:'Lab',segment_color:'#0EA5A0',accent_color:'#0EA5A0',tagline:'AKA',description:'Deskripsi',logo_light:'https://fixture.supabase.co/storage/v1/object/public/media/brands/light-existing.svg',logo_dark:'https://fixture.supabase.co/storage/v1/object/public/media/brands/dark-existing.svg',is_active:false,sort_order:7,created_at:'2026-10-10'};
    window.reset=()=>{window.uploads=[];window.submits=[];window.toasts=[];window.pushes=[];window.refreshes=0;window.delays={light:0,dark:0};window.failures={};window.actionFailure=null;window.actionDelay=0;window.decodeCalls=0;window.sessionMissing=false};
    window.mount=patch=>flushSync(()=>app.render(<BrandForm initial={patch===null?undefined:{...window.base,...patch}}/>));
    window.render=(patch={})=>{flushSync(()=>app.render(null));window.reset();window.mount(patch)};
    window.swap=(patch={})=>window.mount(patch);window.unmount=()=>flushSync(()=>app.render(null));
    window.plain=()=>flushSync(()=>app.render(<ImageUploadField id='plain-preview' label='Plain' value={window.base.logo_light} preview={null} phase='idle' accept='image/*' helperText='Fixture' onFileSelected={()=>{}} onRemove={()=>{}}/>));
    window.file=async(side,type='image/svg+xml',color='white',large=false,name)=>{
      const filename=name??side+' '+color+' (NEW).'+(type==='image/svg+xml'?'SVG':type.split('/')[1]);
      if(type==='image/svg+xml')return new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24"><circle cx="16" cy="12" r="8" fill="'+color+'"/></svg>'],filename,{type});
      if(type==='image/gif')return new File([Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),c=>c.charCodeAt(0))],filename,{type});
      if(!type.startsWith('image/'))return new File(['invalid'],filename,{type});
      const c=document.createElement('canvas');c.width=32;c.height=24;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(8,6,16,12);const b=await new Promise(r=>c.toBlob(r,type));return new File(large?[b,new Uint8Array(5*1024*1024)]:[b],filename,{type});
    };
    window.select=async(side,method='click',type='image/svg+xml',color='white',large=false,name)=>{const f=await window.file(side,type,color,large,name),dt=new DataTransfer();dt.items.add(f);const input=document.getElementById('brand-logo-'+side)??document.querySelectorAll('input[type=file]')[side==='light'?0:1];if(method==='click'){input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}else{const z=document.getElementById(input.id+'-dropzone');z.dispatchEvent(new DragEvent('dragenter',{bubbles:true,dataTransfer:dt}));z.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}))}};
    window.createImageBitmap=()=>{window.decodeCalls++;throw Error('Raster decode forbidden')};window.render();
  `, resolveDir: root, loader: 'jsx' }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root },
    plugins: [{ name: 'boundaries', setup(build) {
      build.onResolve({ filter: /^(next\/link|next\/navigation|@\/components\/admin\/Toast|@\/utils\/supabase\/client|@\/lib\/actions\/brands)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: {
        'next/link': "import React from 'react';export default function Link(p){return React.createElement('a',p)}",
        'next/navigation': 'export const useRouter=()=>({push:u=>window.pushes.push(u),refresh:()=>window.refreshes++});',
        '@/components/admin/Toast': 'export const useToast=()=>({toast:(tone,message)=>window.toasts.push({tone,message})});',
        '@/utils/supabase/client': `export const createClient=()=>({auth:{getSession:async()=>({data:{session:window.sessionMissing?null:{user:{id:'fixture'}}},error:null})},storage:{from:bucket=>({upload:async(path,file,options)=>{const side=file.name.toLowerCase().includes('light')?'light':'dark',failure=window.failures[side],delay=window.delays[side];window.uploads.push({side,bucket,path,type:file.type,size:file.size,options});if(delay)await new Promise(r=>setTimeout(r,delay));return {data:failure?null:{path},error:failure}},getPublicUrl:path=>({data:{publicUrl:'https://fixture.supabase.co/storage/v1/object/public/media/'+path}}),remove:()=>{throw Error('Physical deletion forbidden')}})}});`,
        '@/lib/actions/brands': `import {brandSchema} from '@/lib/validations/brandSchema';export const upsertBrand=async input=>{window.submits.push(input);const parsed=brandSchema.safeParse(input);if(!parsed.success)return {success:false,message:'Periksa isian.',errors:Object.fromEntries(parsed.error.issues.map(i=>[i.path.join('.'),i.message]))};if(window.actionDelay)await new Promise(r=>setTimeout(r,window.actionDelay));return window.actionFailure??{success:true,message:'Tersimpan'}};`,
      }[args.path], loader: 'js', resolveDir: root }));
    } }] });
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else res.end('<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><main class="p-4" id="app"></main><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'brand-upload-'));
  const browser = spawn(edge, ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=19583', 'about:blank'], { stdio: 'ignore' });
  let socket; let loaded = 0; let choosers = 0;
  try {
    let target;
    for (let i = 0; i < 60; i++) { try { target = (await (await fetch('http://127.0.0.1:19583/json/list')).json()).find(t => t.type === 'page'); if (target) break; } catch { /* startup */ } await sleep(100); }
    assert.ok(target); socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const pending = new Map(); let seq = 0;
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    socket.onmessage = event => {
      const d = JSON.parse(event.data);
      if (d.id) { const h = pending.get(d.id); pending.delete(d.id); if (d.error) h.reject(d.error); else h.resolve(d.result); }
      if (d.method === 'Page.domContentEventFired') loaded++;
      if (d.method === 'Fetch.requestPaused') {
        const color = d.params.request.url.includes('light') ? 'black' : 'white';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24"><circle cx="16" cy="12" r="8" fill="${color}"/></svg>`;
        void cdp('Fetch.fulfillRequest', { requestId: d.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }], body: Buffer.from(svg).toString('base64') });
      }
      if (d.method === 'Page.fileChooserOpened') { choosers++; void cdp('DOM.setFileInputFiles', { backendNodeId: d.params.backendNodeId, files: [] }); }
    };
    const evaluate = async expression => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const wait = async expression => { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await sleep(40); } throw Error(`Timed out: ${expression}`); };
    const test = async (expression, expected, label) => { assert.equal(await evaluate(expression), expected, label); checks++; };
    const render = async expression => { await evaluate(expression); await sleep(80); };
    const saveButton = "[...document.querySelectorAll('button')].find(b=>['Simpan Perubahan','Tambah Merek'].includes(b.textContent.trim()))";
    const save = async () => { await evaluate(`${saveButton}.click()`); await sleep(100); };
    const fieldSrc = side => `document.querySelector('#brand-logo-${side}-dropzone img')?.getAttribute('src')`;
    const uploaded = side => `document.getElementById('brand-logo-${side}-status')?.textContent.includes('Terunggah')`;
    const remove = async side => { await evaluate(`document.getElementById('brand-logo-${side}-dropzone').querySelectorAll('button')[1].click()`); await sleep(60); };
    const setInput = async (placeholder, value) => { await evaluate(`(()=>{const e=document.querySelector('input[placeholder="${placeholder}"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`); await sleep(60); };
    await cdp('Page.enable'); await cdp('Page.setInterceptFileChooserDialog', { enabled: true }); await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    await cdp('Fetch.enable', { patterns: [{ urlPattern: 'https://fixture.supabase.co/*' }] });
    const navigate = async () => { const before = loaded; await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` }); for (let i = 0; i < 100 && loaded === before; i++) await sleep(40); assert.ok(loaded > before); await wait('typeof window.render==="function"'); await cdp('Page.bringToFront'); };
    await navigate();

    // First red regression: old BrandForm permits saving while a logo replacement is pending.
    await evaluate("window.delays.light=300;window.select('light')"); await wait('window.uploads.length===1');
    await test(`${saveButton}.disabled`, true, 'Save must be blocked while light is uploading');
    await wait(uploaded('light')); await save();
    await test('window.submits[0].logoDark', 'https://fixture.supabase.co/storage/v1/object/public/media/brands/dark-existing.svg', 'Light upload does not change dark');
    await test('window.activeUrls.size', 0, 'Successful edit save releases previews');
    await test("document.body.textContent.includes('Terunggah — belum disimpan')", false, 'Successful edit save clears unsaved state');
    await test(`${fieldSrc('light')}===window.submits[0].logoLight`, true, 'Saved light URL remains current');
    await test('window.refreshes', 1, 'Edit refresh behavior preserved');
    await test('window.submits[0].isActive===false && window.submits[0].sortOrder===7', true, 'Unrelated Brand fields preserved');

    for (const side of ['light', 'dark']) for (const method of ['click', 'drop']) for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']) {
      await render('window.render()');
      await evaluate(`window.select('${side}','${method}','${type}','${side === 'light' ? 'white' : 'black'}')`); await wait(uploaded(side));
      await test('window.uploads.length', 1, `${side}/${method}/${type}`);
      await test('window.uploads[0].type', type, 'Original MIME preserved');
      await test("new RegExp('^brands/[0-9]+-(light|dark)-(white|black)--new-[.][a-z]+$').test(window.uploads[0].path)", true, 'Existing timestamp/sanitized lowercase filename');
      await test("window.uploads[0].bucket==='media' && window.uploads[0].options.upsert===false", true, 'Storage contract');
      await test('window.decodeCalls', 0, 'No raster decode');
      await test(`${fieldSrc(side)}.startsWith('blob:')`, true, 'Independent local preview');
      const peer = side === 'light' ? 'dark' : 'light';
      await test(`${fieldSrc(peer)}.endsWith('${peer}-existing.svg')`, true, 'Peer preview untouched');
      await save(); await test('window.uploads.length', 1, 'Save does not reupload');
      await test(`window.submits[0].${peer === 'light' ? 'logoLight' : 'logoDark'}.endsWith('${peer}-existing.svg')`, true, 'Peer URL untouched');
      await test('window.activeUrls.size', 0, 'Both adapters reset after Save');
    }
    await render('window.render()'); await evaluate("window.select('light','drop','image/png','white',true)"); await wait(uploaded('light'));
    await test('window.uploads[0].size>5*1024*1024', true, 'No new 5 MiB cap');
    for (const side of ['light', 'dark']) {
      await render('window.render()'); await evaluate(`window.select('${side}','click','application/pdf')`);
      await wait(`document.getElementById('brand-logo-${side}-error')?.textContent.includes('File harus berupa gambar.')`);
      await test('window.uploads.length', 0, 'Non-image rejected');
      await test(`document.getElementById('brand-logo-${side === 'light' ? 'dark' : 'light'}-error')===null`, true, 'Upload error isolated');
      await render('window.render()'); await evaluate(`window.failures.${side}={status:403,code:'AccessDenied',message:'raw RLS SQL'};window.select('${side}','drop')`);
      await wait(`document.getElementById('brand-logo-${side}-error')?.textContent.includes('Akun Anda belum')`);
      await test('document.body.textContent.includes("raw RLS")', false, 'No raw error details'); await test('window.activeUrls.size', 0, 'Failed candidate released');
      await save(); await test(`window.submits[0].${side === 'light' ? 'logoLight' : 'logoDark'}.endsWith('${side}-existing.svg')`, true, 'Failure preserves original URL');
      await render('window.render()'); await remove(side); await save();
      await test(`window.submits[0].${side === 'light' ? 'logoLight' : 'logoDark'}`, '', 'Remove reference only');
      await test(`window.submits[0].${side === 'light' ? 'logoDark' : 'logoLight'}.endsWith('${side === 'light' ? 'dark' : 'light'}-existing.svg')`, true, 'Removing one does not change peer');
    }
    for (const first of ['light', 'dark']) {
      const second = first === 'light' ? 'dark' : 'light';
      await render(`window.render();window.delays.${first}=100;window.delays.${second}=500`);
      await evaluate("Promise.all([window.select('light'),window.select('dark','drop','image/svg+xml','black')])");
      await wait('window.uploads.length===2'); await test(`${saveButton}.disabled`, true, 'Parallel uploads block Save');
      await wait(uploaded(first)); await test(`${saveButton}.disabled`, true, 'First completion never unlocks pending peer');
      await wait(uploaded(second)); await test(`${saveButton}.disabled`, false, 'Both complete unlock Save');
      await test('window.activeUrls.size', 2, 'Two independent local URLs');
      await evaluate("window.actionFailure={success:false,message:'Validasi',errors:{logoLight:'Light invalid',logoDark:'Dark invalid'}}"); await save();
      await test('document.body.textContent.split("Light invalid").length-1', 1, 'Light server error once');
      await test('document.body.textContent.split("Dark invalid").length-1', 1, 'Dark server error once');
      await test('window.activeUrls.size', 2, 'Save failure retains local previews');
      await remove('light'); await test('document.body.textContent.includes("Dark invalid")', true, 'Light correction preserves dark error');
      await evaluate("window.actionFailure=null;window.actionDelay=200"); await evaluate(`${saveButton}.click();${saveButton}.click()`); await sleep(300);
      await test('window.submits.length', 2, 'Duplicate submit blocked'); await test('window.uploads.length', 2, 'Retry never reuploads');
      await test('window.activeUrls.size', 0, 'Save success releases both previews');
    }
    await render('window.render();window.failures.light={status:500,message:"raw internal"};window.delays.dark=350');
    await evaluate("Promise.all([window.select('light'),window.select('dark','drop','image/svg+xml','black')])");
    await wait("document.getElementById('brand-logo-light-error')?.textContent.includes('Periksa koneksi')"); await test(`${saveButton}.disabled`, true, 'Failure of one waits for the other');
    await wait(uploaded('dark')); await save();
    await test('window.submits[0].logoLight.endsWith("light-existing.svg")', true, 'Failed field retained');
    await test('window.submits[0].logoDark.endsWith(window.uploads.find(u=>u.side==="dark").path)', true, 'Successful peer retained');
    await render('window.render();window.failures.light={status:403,code:"AccessDenied"};window.failures.dark={status:500}');
    await evaluate("Promise.all([window.select('light'),window.select('dark','drop','image/svg+xml','black')])");
    await wait("document.getElementById('brand-logo-light-error')?.textContent.includes('Akun Anda belum')");
    await wait("document.getElementById('brand-logo-dark-error')?.textContent.includes('Periksa koneksi')");
    await test(`${saveButton}.disabled`, false, 'Two failed uploads release aggregate busy');
    await test('window.activeUrls.size', 0, 'Two failed previews cleaned up independently');
    await save();
    await test('window.submits[0].logoLight.endsWith("light-existing.svg") && window.submits[0].logoDark.endsWith("dark-existing.svg")', true, 'Two failures preserve original references');

    await render('window.render()');
    await evaluate("Promise.all([window.select('light'),window.select('dark','drop','image/svg+xml','black')])");
    await wait(uploaded('light')); await wait(uploaded('dark'));
    await evaluate("window.actionFailure={success:false,message:'Coba lagi.'}"); await save();
    await test('window.activeUrls.size', 2, 'Both successful previews retained on failed Save');
    await test('window.submits[0].logoLight.endsWith(window.uploads.find(u=>u.side==="light").path) && window.submits[0].logoDark.endsWith(window.uploads.find(u=>u.side==="dark").path)', true, 'Failed Save retains both uploaded references');
    await test('window.refreshes', 0, 'Failed Save does not navigate/refresh');
    await evaluate('window.actionFailure=null'); await save();
    await test('window.submits[1].logoLight===window.submits[0].logoLight && window.submits[1].logoDark===window.submits[0].logoDark', true, 'Retry uses same two URLs');
    await test('window.uploads.length', 2, 'Two-logo retry never uploads again');
    await test(`${fieldSrc('light')}===window.submits[1].logoLight && ${fieldSrc('dark')}===window.submits[1].logoDark`, true, 'Saved references remain after adapter reset');
    await test('window.activeUrls.size', 0, 'Successful retry releases both local previews');

    for (const mode of ['switch', 'cancel']) {
      await render('window.render();window.delays.light=350;window.delays.dark=350');
      await evaluate("Promise.all([window.select('light'),window.select('dark','drop','image/svg+xml','black')])"); await wait('window.uploads.length===2');
      if (mode === 'cancel') await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Batal').click()");
      await render("window.swap({id:'brand-b',name:'Brand B',logo_light:window.base.logo_light.replace('existing','brand-b'),logo_dark:window.base.logo_dark.replace('existing','brand-b')})"); await sleep(450);
      await test('document.querySelector("input[placeholder=Talpha]").value', 'Brand B', 'Record identity resets form');
      await test('window.activeUrls.size', 0, 'Old previews released');
      await test("document.body.textContent.includes('(NEW)')", false, 'Old metadata cleared'); await save();
      await test('window.submits.at(-1).id', 'brand-b', 'New identity saved');
      await test('window.submits.at(-1).logoLight.endsWith("light-brand-b.svg") && window.submits.at(-1).logoDark.endsWith("dark-brand-b.svg")', true, 'Late completions ignored');
    }
    await render('window.render();window.delays.light=250'); await evaluate("window.select('light')"); await wait('window.uploads.length===1');
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Batal').click()"); await sleep(350); await save();
    await test('window.submits.length', 0, 'Cancelled instance cannot submit');
    await render('window.render();window.actionDelay=300'); await save();
    await render("window.swap({id:'brand-b',name:'Brand B'})"); await sleep(350);
    await test('document.querySelector("input[placeholder=Talpha]").value', 'Brand B', 'Old save completion cannot reset the new record');
    await test('window.refreshes', 0, 'Stale Save response does not refresh next record');
    for (const only of ['light', 'dark', 'both']) {
      await render('window.render(null)'); await setInput('Talpha', 'Brand Baru'); await setInput('talpha', 'brand-baru');
      if (only !== 'dark') { await evaluate("window.select('light')"); await wait(uploaded('light')); }
      if (only !== 'light') { await evaluate("window.select('dark','drop','image/svg+xml','black')"); await wait(uploaded('dark')); }
      await save(); await test('window.pushes.at(-1)', '/admin/merek', 'Create navigation preserved');
      await test('Boolean(window.submits[0].logoLight)', only !== 'dark', 'Light optional'); await test('Boolean(window.submits[0].logoDark)', only !== 'light', 'Dark optional');
    }
    await render('window.render();window.plain()');
    await test('getComputedStyle(document.querySelector("img")).backgroundImage', 'none', 'Default plain preserved');
    await test('getComputedStyle(document.querySelector("img")).backgroundColor', 'rgb(255, 255, 255)', 'Default white surface preserved');
    for (const width of [375,768,1366]) for (const dark of [false,true]) {
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
      await render(`document.documentElement.classList.toggle('dark',${dark});window.render()`);
      await evaluate(`Promise.all([window.select('light','drop','image/png','white',false,${JSON.stringify('light'.repeat(45)+'.PNG')}),window.select('dark','click','image/svg+xml','black')])`); await wait(uploaded('light')); await wait(uploaded('dark'));
      await test('document.documentElement.scrollWidth<=innerWidth',true,'No logo/filename overflow');
      for(const side of ['light','dark']) {
        await wait(`(()=>{const i=document.querySelector('#brand-logo-${side}-dropzone img');return i.complete&&i.naturalWidth>0})()`);
        await test(`getComputedStyle(document.querySelector('#brand-logo-${side}-dropzone img')).backgroundImage.includes('gradient')`,true,'Contrast surface enabled');
        await test(`getComputedStyle(document.querySelector('#brand-logo-${side}-dropzone img')).objectFit`,'contain','Logo not cropped');
        await test(`document.getElementById('brand-logo-${side}-browse').getBoundingClientRect().height>=44`,true,'Accessible target');
        await test(`document.getElementById('brand-logo-${side}-status').getAttribute('aria-live')`,'polite','Accessible status');
      }
      if((width===375&&dark)||(width===1366&&!dark)) {
        const box=await evaluate("(()=>{const a=document.getElementById('brand-logo-light-dropzone'),p=a.parentElement.parentElement,r=p.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
        const shot=await cdp('Page.captureScreenshot',{format:'png',clip:box,captureBeyondViewport:true});const file=path.join(profile,`brand-${width}-${dark?'dark':'light'}.png`);fs.writeFileSync(file,Buffer.from(shot.data,'base64'));console.log('Browser screenshot:',file);
      }
    }
    await test('window.errors.length',0,'No browser exceptions');
    for(const [key,code,vk]of [[' ','Space',32],['Enter','Enter',13]]) {
      await navigate();await evaluate("document.getElementById('brand-logo-light-browse').focus()");const before=choosers;
      await cdp('Input.dispatchKeyEvent',{type:'rawKeyDown',key,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});if(key==='Enter')await cdp('Input.dispatchKeyEvent',{type:'char',key,code,text:'\r',windowsVirtualKeyCode:vk});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});await sleep(120);assert.ok(choosers>before);checks++;
    }
    const protectedDiff=execFileSync('git',['diff','--name-only','HEAD','--','supabase','lib/actions','lib/validations','utils/supabase','lib/public-data.ts','components/admin/PortfolioForm.tsx','components/admin/GroupTab.tsx','components/admin/PartnerTab.tsx','components/admin/DistributionTab.tsx'],{cwd:root,encoding:'utf8'});
    assert.equal(require('./product-translation-scope.cjs')(protectedDiff),'','No unrelated protected changes outside approved i18n/Product foundation scope');checks++;
    const baselineBrands=execFileSync('git',['show','HEAD:components/home/Brands.tsx'],{cwd:root,encoding:'utf8'});
    const oldBrands=baselineBrands.includes('useTranslations')?baselineBrands:baselineBrands
      .replace('from "next/link"','from "@/i18n/navigation"')
      .replace('"use client";','"use client";\nimport { useTranslations } from "next-intl";')
      .replace('  const { theme } = useTheme();','  const t = useTranslations("home.brands");\n  const { theme } = useTheme();')
      .replace('BRAND AKA','{t("eyebrow")}').replace('Brand Manufaktur Kami','{t("title")}')
      .replace(/Brand utama dalam portofolio produk yang dikembangkan untuk kebutuhan\s+industri, laboratorium, dan lingkungan\./,'{t("description")}')
      .replace('aria-label={`Lihat produk ${brand.name}`}','aria-label={t("view", { name: brand.name })}');
    assert.equal(fs.readFileSync(path.join(root,'components/home/Brands.tsx'),'utf8').replace(/\s/g,''),oldBrands.replace(/\s/g,''),'Brand identity/filter/logo logic unchanged; only approved presentation extraction allowed');checks++;
    console.log(`PASS: ${checks} actual Brand browser checks; dual uploads, independent failures, SVG/PNG/GIF, contrast/default previews, busy/session safety, save retry/reset, keyboard and responsive light/dark. Transport mocked; no live writes.`);
  } finally {if(socket)socket.close();browser.kill();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1});
