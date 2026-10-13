/* eslint-disable @typescript-eslint/no-require-imports -- Real Team/cropper/canvas in Edge; only transport and controlled delays/errors are mocked. */
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
  assert.ok(fs.existsSync(edge));
  const cssRoot = path.join(root, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(cssRoot, f), 'utf8')).join('\n');
  const bundle = await esbuild.build({ stdin: { contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
    import TeamTab from './components/admin/TeamTab';import CroppedMediaUploadField from './components/admin/CroppedMediaUploadField';
    const app=createRoot(document.getElementById('app'));let version=0;
    window.errors=[];window.activeUrls=new Set();window.revocations=[];
    window.addEventListener('error',e=>window.errors.push(e.message));window.addEventListener('unhandledrejection',e=>window.errors.push(String(e.reason)));
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=f=>{const u=create(f);window.activeUrls.add(u);return u};URL.revokeObjectURL=u=>{window.activeUrls.delete(u);window.revocations.push(u);revoke(u)};
    const toBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(cb,type,quality){window.encodings.push({type,quality});return toBlob.call(this,cb,window.forcePng&&quality===0.92?'image/png':type,quality)};
    window.existing='https://fixture.supabase.co/storage/v1/object/public/media/team/existing.png';
    window.members=[{id:'team-a',name:'Anggota A',role:'Engineer',role_color:'teal',bio:'AKA',image_url:window.existing,is_visible:false,sort_order:7},{id:'team-b',name:'Anggota B',role:'Designer',role_color:'blue',bio:'AKA B',image_url:window.existing.replace('existing','team-b'),is_visible:true,sort_order:9}];
    function Adapter(){const [value,setValue]=React.useState(window.existing);return <CroppedMediaUploadField id='team-photo' label='Foto Profil' value={value} pathPrefix='team' errorContext='Foto profil' onChange={u=>{window.changes.push(u);setValue(u)}} onBusyChange={v=>window.activity.push(v)}/>}
    window.reset=()=>{window.uploads=[];window.submits=[];window.changes=[];window.toasts=[];window.activity=[];window.cropCalls=0;window.cropOutputs=[];window.encodings=[];window.cropDelay=0;window.cropFailure=false;window.uploadDelay=0;window.sessionMissing=false;window.uploadError=null;window.actionFailure=null;window.actionDelay=0;window.forcePng=false;window.largeOutput=false};
    window.render=(mode='adapter')=>{window.reset();flushSync(()=>app.render(mode==='adapter'?<Adapter key={++version}/>:<TeamTab key={++version} team={window.members}/>))};
    window.unmount=()=>flushSync(()=>app.render(null));
    window.file=async(type='image/png',mode='valid')=>{
      if(mode==='corrupt')return new File(['not image'],'source.png',{type});
      if(mode==='oversize')return new File([new Uint8Array(5*1024*1024+1)],'big.png',{type});
      if(type==='image/svg+xml')return new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64"><rect width="48" height="64" fill="red"/><rect x="48" width="48" height="64" fill="blue"/></svg>'],'source.svg',{type});
      if(type==='image/gif')return new File([Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),c=>c.charCodeAt(0))],'source.gif',{type});
      const c=document.createElement('canvas');c.width=96;c.height=64;const x=c.getContext('2d');x.fillStyle='red';x.fillRect(0,0,48,64);x.fillStyle='blue';x.fillRect(48,0,48,64);const b=await new Promise(r=>c.toBlob(r,type));return new File(mode==='boundary'?[b,new Uint8Array(5*1024*1024-b.size)]:[b],'source.'+type.split('/')[1],{type});
    };
    window.select=async(method='click',type='image/png',mode='valid')=>{const f=await window.file(type,mode),dt=new DataTransfer();dt.items.add(f);const i=document.querySelector('input[type=file]');if(method==='click'){i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}))}else{const z=document.getElementById(i.id+'-dropzone');z.dispatchEvent(new DragEvent('dragenter',{bubbles:true,dataTransfer:dt}));z.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}))}};
    window.render();
  `, resolveDir: root, loader: 'jsx' }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root }, plugins: [{ name: 'boundaries', setup(build) {
    build.onResolve({ filter: /^(next\/link|next\/navigation|next\/dynamic|@\/components\/admin\/Toast|@\/utils\/supabase\/client|@\/lib\/actions\/relasi|@\/lib\/media\/cropImage)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: {
      'next/link': "import React from 'react';export default function Link(p){return React.createElement('a',p)}",
      'next/navigation': 'export const useRouter=()=>({refresh:()=>{}});',
      'next/dynamic': "import React from 'react';export default function dynamic(loader){const C=React.lazy(loader);return p=>React.createElement(React.Suspense,{fallback:null},React.createElement(C,p))}",
      '@/components/admin/Toast': 'export const useToast=()=>({toast:(tone,message)=>window.toasts.push({tone,message})});',
      '@/utils/supabase/client': `export const createClient=()=>({auth:{getSession:async()=>({data:{session:window.sessionMissing?null:{user:{id:'fixture'}}},error:null})},storage:{from:bucket=>({upload:async(path,file,options)=>{const delay=window.uploadDelay,error=window.uploadError;const bitmap=await createImageBitmap(file);const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;c.getContext('2d').drawImage(bitmap,0,0);const alpha=c.getContext('2d').getImageData(0,0,1,1).data[3];window.uploads.push({bucket,path,type:file.type,size:file.size,width:bitmap.width,height:bitmap.height,cornerAlpha:alpha,options});bitmap.close();if(delay)await new Promise(r=>setTimeout(r,delay));return {data:error?null:{path},error}},getPublicUrl:path=>({data:{publicUrl:'https://fixture.supabase.co/storage/v1/object/public/media/'+path}}),remove:()=>{throw Error('Physical removal forbidden')}})}});`,
      '@/lib/actions/relasi': `export const saveTeamMember=async input=>{window.submits.push(input);const failure=window.actionFailure;if(window.actionDelay)await new Promise(r=>setTimeout(r,window.actionDelay));if(failure)return failure;const row=window.members.find(m=>m.id===input.id);if(row)Object.assign(row,{name:input.name,role:input.role,role_color:input.roleColor,bio:input.bio,image_url:input.imageUrl,is_visible:input.isVisible,sort_order:input.sortOrder});return {success:true,message:'Tersimpan'}};export const deleteTeamMember=async()=>({success:true}),toggleTeamMember=deleteTeamMember;`,
      '@/lib/media/cropImage': `import {getCroppedImg as real} from './lib/media/cropImage';export async function getCroppedImg(...args){window.cropCalls++;const delay=window.cropDelay,failure=window.cropFailure,large=window.largeOutput;const blob=await real(...args);window.cropOutputs.push({type:blob.type,size:blob.size,rotation:args[2],area:args[1]});if(delay)await new Promise(r=>setTimeout(r,delay));if(failure)throw Error('raw crop processing failure');return large?new Blob([blob,new Uint8Array(5*1024*1024)],{type:blob.type}):blob}`,
    }[args.path], loader: 'js', resolveDir: root }));
  } }] });
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else res.end('<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><main class="p-4" id="app"></main><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'team-crop-'));
  const browser = spawn(edge, ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=19584', 'about:blank'], { stdio: 'ignore' });
  let socket; let loaded = 0; let choosers = 0;
  try {
    let target;
    for (let i = 0; i < 60; i++) { try { target = (await (await fetch('http://127.0.0.1:19584/json/list')).json()).find(t => t.type === 'page'); if (target) break; } catch { /* startup */ } await sleep(100); }
    assert.ok(target); socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const pending = new Map(); let seq = 0;
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    socket.onmessage = event => {
      const d = JSON.parse(event.data);
      if (d.id) { const h = pending.get(d.id); pending.delete(d.id); if (d.error) h.reject(d.error); else h.resolve(d.result); }
      if (d.method === 'Page.domContentEventFired') loaded++;
      if (d.method === 'Fetch.requestPaused') void cdp('Fetch.fulfillRequest', { requestId: d.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }], body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="teal"/></svg>').toString('base64') });
      if (d.method === 'Page.fileChooserOpened') { choosers++; void cdp('DOM.setFileInputFiles', { backendNodeId: d.params.backendNodeId, files: [] }); }
    };
    const evaluate = async expression => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const wait = async expression => { for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await sleep(40); } throw Error(`Timed out: ${expression}`); };
    const test = async (expression, expected, label) => { assert.equal(await evaluate(expression), expected, label); checks++; };
    const render = async expression => { await evaluate(expression); await sleep(80); };
    const applyButton = "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Gunakan Foto Ini'))";
    const cancelCrop = async () => { await evaluate("(document.querySelector('dialog')??document.body).querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Batal')b.click()})"); await sleep(80); };
    const ready = () => wait(`${applyButton} && !${applyButton}.disabled`);
    const select = async (method = 'click', type = 'image/png', mode = 'valid') => { await evaluate(`window.select('${method}','${type}','${mode}')`); await ready(); };
    const apply = async () => { await evaluate(`${applyButton}.click()`); };
    const uploaded = () => wait("document.body.textContent.includes('Terunggah — belum disimpan ke entri')");
    const saveButton = "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Simpan Perubahan')";
    const save = async () => { await evaluate(`${saveButton}.click()`); await sleep(100); };
    const edit = async index => { await evaluate(`[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Edit')[${index}].click()`); await sleep(80); };
    await cdp('Page.enable'); await cdp('Page.setInterceptFileChooserDialog', { enabled: true }); await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    await cdp('Fetch.enable', { patterns: [{ urlPattern: 'https://fixture.supabase.co/*' }] });
    const navigate = async () => { const before = loaded; await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` }); for (let i = 0; i < 150 && loaded === before; i++) await sleep(40); assert.ok(loaded > before); await wait('typeof window.render==="function"'); await cdp('Page.bringToFront'); };
    await navigate();

    // Mandatory red regression: delay a REAL cropped output, cancel, then resolve the crop Promise.
    await evaluate('window.cropDelay=350'); await select(); await apply(); await wait('window.cropOutputs.length===1');
    await cancelCrop(); await sleep(450);
    await test('window.uploads.length', 0, 'Cancelled late crop must NEVER start Storage upload');
    await test('window.changes.length', 0, 'Cancel preserves original URL');
    await test('window.activeUrls.size', 0, 'Cancel releases source');

    for (const method of ['click', 'drop']) for (const type of ['image/png','image/jpeg','image/webp','image/svg+xml','image/gif']) {
      await render('window.render()'); await select(method, type);
      await test('window.uploads.length', 0, 'Selection alone never uploads');
      await test('window.changes.length', 0, 'Source never changes current URL');
      await test("document.querySelector('dialog').open", true, 'Native modal mandatory');
      await apply(); await uploaded();
      await test('window.cropCalls', 1, 'One crop per Apply'); await test('window.uploads.length', 1, 'One upload per Apply');
      await test('window.uploads[0].type', 'image/webp', 'WebP output preserved');
      await test('window.encodings.some(e=>e.type==="image/webp"&&e.quality===0.92)', true, 'Encoding request/quality unchanged');
      await test('window.uploads[0].width===window.uploads[0].height && window.uploads[0].width>0', true, 'Actual square output');
      await test('window.uploads[0].cornerAlpha', 255, 'Round mask does not make circular output');
      await test("new RegExp('^team/[0-9]+-cropped[.]webp$').test(window.uploads[0].path)", true, 'Existing Team path');
      await test('window.uploads[0].bucket==="media" && window.uploads[0].options.upsert===false && window.uploads[0].options.contentType===window.uploads[0].type', true, 'Storage contract');
      await test('window.activeUrls.size', 1, 'Only final cropped preview retained');
    }
    await render('window.render();window.forcePng=true'); await select(); await apply(); await uploaded();
    await test('window.uploads[0].type', 'image/png', 'Actual fallback Blob MIME honored'); await test('window.uploads[0].path.endsWith("-cropped.png")', true, 'Extension matches actual encoder output');
    await render('window.render();window.largeOutput=true'); await select(); await apply(); await uploaded();
    await test('window.uploads[0].size>5*1024*1024', true, 'No second output size cap');
    await render('window.render()'); await select();
    await test('document.activeElement.getAttribute("aria-label")', 'Tutup pemotongan', 'Initial modal focus');
    await test('getComputedStyle(document.querySelector("[data-testid=cropper]")).borderRadius', '50%', 'Round viewport mask retained');
    await evaluate("window.originalTransform=document.querySelector('.reactEasyCrop_Image').style.transform;document.querySelector('[data-testid=cropper]').focus()");
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await wait("document.querySelector('.reactEasyCrop_Image').style.transform!==window.originalTransform");
    await test('document.querySelector("[data-testid=cropper]").tabIndex', 0, 'Library keyboard crop remains focusable');
    await evaluate("(()=>{const e=document.querySelector('dialog input[type=range]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'2');e.dispatchEvent(new Event('input',{bubbles:true}))})()");
    await wait("document.querySelector('dialog input[type=range]').value==='2'");
    await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent.includes('Putar Kanan')).click()");
    await wait("document.querySelector('.reactEasyCrop_Image').style.transform.includes('rotate(90deg)')");
    await apply(); await uploaded();
    await test('window.cropOutputs[0].rotation', 90, 'Rotation forwarded to real crop helper');
    await test('window.cropOutputs[0].area.width===window.cropOutputs[0].area.height', true, 'Crop coordinates remain 1:1');
    await test('window.uploads[0].width<64', true, 'Zoom changes actual output crop dimensions');
    await render('window.render()'); await select();
    for (let i = 0; i < 12; i++) {
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await test('document.activeElement.closest("dialog")!==null', true, 'Tab focus remains in native modal');
    }
    await evaluate(`${applyButton}.focus()`);
    await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await cdp('Input.dispatchKeyEvent', { type: 'char', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await uploaded(); await test('window.cropCalls', 1, 'Keyboard Apply produces one real crop');
    for (const [type, mode, message] of [['application/pdf','corrupt','File harus berupa gambar.'],['image/png','oversize','Ukuran gambar maksimal 5 MB.'],['image/png','corrupt','File tidak dapat dibaca sebagai gambar.']]) {
      await render('window.render()'); await evaluate(`window.select('click','${type}','${mode}')`); await wait(`document.body.textContent.includes('${message}')`);
      await test('window.uploads.length', 0, 'Invalid source never uploads'); await test('document.querySelector("dialog")===null', true, 'Fatal failure ends modal'); await test('window.activeUrls.size', 0, 'Fatal source cleanup');
    }
    await render('window.render()'); await select('click','image/png','boundary'); await cancelCrop(); await test('window.uploads.length', 0, 'Exactly 5 MiB source accepted for crop');
    await render('window.render();window.cropFailure=true'); await select(); await apply(); await wait("document.body.textContent.includes('Gambar gagal diproses saat pemotongan.')");
    await test('window.activeUrls.size', 0, 'Crop failure propagated and cleaned'); await test('window.activity.at(-1)', false, 'Crop failure clears busy');
    for (const [setting, message] of [["window.sessionMissing=true",'Sesi Anda berakhir'],["window.uploadError={status:403,code:'AccessDenied',message:'raw RLS SQL'}",'Akun Anda belum'],["window.uploadError={status:500,message:'raw SQL'}",'Periksa koneksi']]) {
      await render('window.render();'+setting); await select(); await apply(); await wait(`document.body.textContent.includes('${message}')`);
      await test('window.changes.length', 0, 'Failure retains current URL'); await test('window.activity.at(-1)', false, 'Failure releases busy'); await test('window.activeUrls.size', 0, 'Failed previews cleaned'); await test('document.body.textContent.includes("raw")', false, 'No raw error');
    }
    await render('window.render();window.cropDelay=300'); await select(); await evaluate(`${applyButton}.click();${applyButton}.click()`);
    await wait("document.querySelector('dialog [role=status]')?.textContent.includes('Memproses hasil crop')");
    await test("document.querySelector('dialog [role=status]').closest('[aria-busy=true]')===null", true, 'Processing announcement is outside deferred busy region');
    await uploaded(); await test('window.cropCalls', 1, 'Synchronous double Apply guard');
    await render('window.render();window.uploadDelay=350'); await select(); await apply(); await wait('window.uploads.length===1'); await test('document.querySelector("dialog").open', true, 'Dialog stays open during upload');
    await cancelCrop(); await sleep(450); await test('window.changes.length', 0, 'Cancelled Storage result ignored'); await test('window.activity.at(-1)', false, 'Cancelled upload clears activity'); await test('window.activeUrls.size', 0, 'Cancel cleans both URLs');

    await render("window.render('team')"); await edit(0); await select('drop');
    await test(`${saveButton}.disabled`, true, 'Save blocked while candidate/modal open');
    await evaluate('window.cropDelay=150;window.uploadDelay=150'); await apply(); await test(`${saveButton}.disabled`, true, 'Save blocked during processing'); await wait('window.uploads.length===1'); await test(`${saveButton}.disabled`, true, 'Save blocked during upload'); await uploaded();
    await evaluate("window.actionFailure={success:false,message:'Periksa isian',errors:{name:'Nama fixture invalid'}}"); await save(); await test('window.activeUrls.size', 1, 'Failed Save retains final preview');
    await evaluate('window.actionFailure=null'); await save(); await test('window.uploads.length', 1, 'Retry Save never uploads again'); await test('window.cropCalls', 1, 'Retry Save never recrops');
    await test('window.submits[1].imageUrl===window.submits[0].imageUrl', true, 'Retry keeps uploaded URL'); await test('window.submits[1].role==="Engineer"&&window.submits[1].isVisible===false&&window.submits[1].sortOrder===7', true, 'Team payload unchanged'); await test('window.activeUrls.size', 0, 'Successful Save unmount resets preview');
    await edit(0); await test("document.querySelector('[id$=-dropzone] img').getAttribute('src')===window.submits[1].imageUrl", true, 'Reopen uses simulated persisted URL without crop metadata');
    await test("document.body.textContent.includes('Terunggah — belum disimpan ke entri')", false, 'Reopen displays current-image state');
    await evaluate('window.actionDelay=200'); await evaluate(`${saveButton}.click();${saveButton}.click()`); await sleep(300);
    await test('window.submits.length', 3, 'Duplicate Team Save blocked'); await evaluate('window.actionDelay=0');
    await edit(0); await evaluate("document.querySelector('[id$=-dropzone]').querySelectorAll('button')[1].click()"); await save(); await test('window.submits.at(-1).imageUrl', '', 'Remove reference only');
    for (const stage of ['crop','upload']) {
      await render("window.render('team')"); await edit(0); await evaluate(stage==='crop'?'window.cropDelay=400':'window.uploadDelay=400'); await select(); await apply(); await wait(stage==='crop'?'window.cropOutputs.length===1':'window.uploads.length===1');
      await edit(1); await select(); await test(`${saveButton}.disabled`, true, 'New session remains busy'); await sleep(500); await test(`${saveButton}.disabled`, true, 'Old completion cannot clear new busy');
      await test('document.querySelector("dialog")!==null', true, 'New crop session retained'); await cancelCrop(); await save(); await test('window.submits.at(-1).imageUrl.endsWith("team-b.png")', true, 'Old result never overwrites Team B');
    }
    await render("window.render('team')"); await edit(0); await select(); await cancelCrop(); await wait("document.activeElement.id==='team-photo-browse'"); await test('document.activeElement.id', 'team-photo-browse', 'Focus restored to captured opener');
    await select(); await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27}); await wait('document.querySelector("dialog")===null'); await test('window.uploads.length',0,'Escape safe');
    for (const [width,height] of [[375,812],[768,900],[1366,900],[667,375]]) for (const dark of [false,true]) {
      await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===375||height===375}); await render(`document.documentElement.classList.toggle('dark',${dark});window.render()`); await select();
      await test('document.documentElement.scrollWidth<=innerWidth',true,'No horizontal overflow'); await test('document.querySelector("dialog").getBoundingClientRect().height<=innerHeight-24',true,'Modal viewport bounded');
      await test('document.querySelector("dialog").getAttribute("aria-labelledby")?.length>0',true,'Named dialog');
      await test('document.querySelector("dialog input[type=range]").getAttribute("aria-label")', 'Zoom foto', 'Zoom labeled');
      await test("document.querySelector('dialog button[aria-label=\"Tutup pemotongan\"]').getBoundingClientRect().height>=44",true,'Close touch target');
      await evaluate("document.querySelector('dialog button:last-child').scrollIntoView({block:'end',behavior:'instant'})"); await test('document.querySelector("dialog button:last-child").getBoundingClientRect().bottom<=innerHeight',true,'Footer reachable');
      if(width===375&&dark){const shot=await cdp('Page.captureScreenshot',{format:'png'});const file=path.join(profile,'team-crop-375-dark.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));console.log('Browser screenshot:',file)}
      await cancelCrop();
    }
    await test('window.errors.length',0,'No browser exceptions');
    await test('new Set(window.revocations).size===window.revocations.length', true, 'Object URL cleanup is idempotent');
    for (const [key, code, vk] of [[' ', 'Space', 32], ['Enter', 'Enter', 13]]) {
      await navigate(); await evaluate("document.getElementById('team-photo-browse').focus()"); const before = choosers;
      await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      if (key === 'Enter') await cdp('Input.dispatchKeyEvent', { type: 'char', key, code, text: '\r', windowsVirtualKeyCode: vk });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); await sleep(120);
      assert.ok(choosers > before, `${code} opens picker`); checks++;
    }
    const changed=execFileSync('git',['diff','--name-only','HEAD','--','supabase','lib/actions','lib/validations','lib/media/cropImage.ts','utils/supabase','components/admin/ImageUploadField.tsx','components/admin/MediaUploadField.tsx','components/admin/BrandForm.tsx','components/admin/PortfolioForm.tsx'],{cwd:root,encoding:'utf8'});assert.equal(require('./product-translation-scope.cjs')(changed),'','No unrelated protected changes outside approved i18n/Product foundation scope');checks++;
    console.log(`PASS: ${checks} actual Team/cropper/canvas browser checks; critical Cancel race, mandatory crop, encoding, upload/Save/session safety, cleanup, dialog and responsive behavior. Transport mocked; no live writes.`);
  } finally {if(socket)socket.close();browser.kill();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1});
