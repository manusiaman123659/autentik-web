/* eslint-disable @typescript-eslint/no-require-imports -- Actual adapter/forms in an isolated Edge fixture; transport only is mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const esbuild = require('esbuild');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;

function serverHarness({ children = 0, hierarchy = [] } = {}) {
  const modules = new Map(); const writes = [];
  const id = '00000000-0000-4000-8000-000000000001';
  const client = { from: table => {
    let record; let head = false;
    const q = { select: (_columns, options) => { head = options?.head === true; return q; }, eq: () => q, is: () => q,
      insert: value => { record = value; return q; }, update: value => { record = value; return q; },
      single: async () => result(), maybeSingle: async () => result(), then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject) };
    function result() { if (record) writes.push({ table, record }); return { data: record ? { id } : head ? null : hierarchy, count: head ? children : null, error: null }; }
    return q;
  } };
  const stubs = { 'next/headers': { cookies: async () => ({}) }, 'next/cache': { revalidatePath() {} },
    '@/lib/admin': { requireContentManager: async () => ({ id }) }, '@/lib/audit': { recordAudit: async () => {} }, '@/utils/supabase/server': { createClient: () => client } };
  function load(spec) {
    if (Object.hasOwn(stubs, spec)) return stubs[spec];
    if (!spec.startsWith('@/')) return require(spec);
    const file = path.join(root, spec.slice(2) + '.ts');
    if (modules.has(file)) return modules.get(file).exports;
    const loaded = { exports: {} }; modules.set(file, loaded);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, { module: loaded, exports: loaded.exports, require: load, console, Date, Set, Map });
    return loaded.exports;
  }
  return { actions: load('@/lib/actions/relasi'), writes };
}

async function main() {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.ok(fs.existsSync(edge), 'Microsoft Edge required by existing browser-fixture approach');
  const cssRoot = path.join(root, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(cssRoot, f), 'utf8')).join('\n');
  const bundle = await esbuild.build({ stdin: { contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
    import MediaUploadField from './components/admin/MediaUploadField';import GroupTab from './components/admin/GroupTab';import PartnerTab from './components/admin/PartnerTab';import DistributionTab from './components/admin/DistributionTab';
    const app=createRoot(document.getElementById('app'));let version=0;
    window.errors=[];window.activeUrls=new Set();window.changes=[];
    window.addEventListener('error',e=>window.errors.push(e.message));window.addEventListener('unhandledrejection',e=>window.errors.push(String(e.reason)));
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=f=>{const u=create(f);window.activeUrls.add(u);return u};URL.revokeObjectURL=u=>{window.activeUrls.delete(u);revoke(u)};
    window.existing='https://fixture.supabase.co/storage/v1/object/public/media/partners/existing.svg';
    const logo=(name)=>'https://fixture.supabase.co/storage/v1/object/public/media/partners/'+name+'.svg';
    window.groups=[{id:'g1',name:'Grup A',legal_name:'PT Grup A',logo_url:logo('a'),url:'https://a.example',is_visible:false,sort_order:7},{id:'g2',name:'Grup B',legal_name:'PT Grup B',logo_url:logo('b'),url:'',is_visible:true,sort_order:9}];
    window.partners=[{id:'p1',name:'Partner A',short_name:'PA',logo_url:logo('a'),url:'https://a.example',is_visible:false,sort_order:7},{id:'p2',name:'Partner B',short_name:'PB',logo_url:logo('b'),url:'',is_visible:true,sort_order:9}];
    window.entities=[{id:'00000000-0000-4000-8000-000000000001',name:'Distribusi A',legal_name:'PT DA',short_name:'DA',distribution_type:'sub_distributor',parent_id:'00000000-0000-4000-8000-000000000002',market_segment:'ENV',region_label:'Semarang',city:'Semarang',province:'Jawa Tengah',address:'Alamat',phone:'123',email:'a@example.com',website_url:'https://a.example',contact_name:'AKA',logo_url:logo('a'),description:'Teruji',is_active:false,sort_order:7},{id:'00000000-0000-4000-8000-000000000002',name:'Distribusi B',distribution_type:'distributor',parent_id:null,is_active:true,sort_order:9,logo_url:logo('b')}];
    function Adapter(){const [value,setValue]=React.useState(window.initialValue);return <MediaUploadField id='adapter-image' label='Logo fixture' value={value} pathPrefix='partners' errorContext='Logo fixture' onChange={u=>{window.changes.push(u);setValue(u)}}/>}
    window.reset=()=>{window.uploads=[];window.submits=[];window.toasts=[];window.changes=[];window.uploadDelay=0;window.sessionDelay=0;window.failUpload=null;window.sessionMissing=false;window.actionFailure=null;window.actionDelay=0;window.decodeCalls=0};
    window.render=(kind='adapter',value='')=>{window.reset();window.initialValue=value;window.kind=kind;flushSync(()=>app.render(kind==='adapter'?<Adapter key={++version}/>:kind==='group'?<GroupTab key={++version} groups={window.groups}/>:kind==='partner'?<PartnerTab key={++version} partners={window.partners}/>:<DistributionTab key={++version} entities={window.entities}/>))};
    window.unmount=()=>flushSync(()=>app.render(null));
    window.makeFile=async(type='image/png',name='My Logo.PNG',large=false)=>{
      if(type==='image/svg+xml')return new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24"><rect width="32" height="24" fill="teal"/></svg>'],name,{type});
      if(type==='image/gif')return new File([Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),c=>c.charCodeAt(0))],name,{type});
      if(!type.startsWith('image/'))return new File(['invalid'],name,{type});
      const c=document.createElement('canvas');c.width=32;c.height=24;c.getContext('2d').fillRect(0,0,32,24);const b=await new Promise(r=>c.toBlob(r,type));return new File(large?[b,new Uint8Array(5*1024*1024)]:[b],name,{type});
    };
    window.select=async(method='click',type='image/png',name='My Logo.PNG',large=false,duplicate=false,submitImmediately=false)=>{const f=await window.makeFile(type,name,large),dt=new DataTransfer();dt.items.add(f);const input=document.querySelector('input[type=file]');if(method==='click'){input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}else{const z=document.getElementById(input.id+'-dropzone');z.dispatchEvent(new DragEvent('dragenter',{bubbles:true,dataTransfer:dt}));z.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));if(duplicate)z.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}))}if(submitImmediately){const b=[...document.querySelectorAll('button')].find(b=>['Simpan Perubahan','Simpan'].includes(b.textContent.trim()));window.saveAttemptWasDisabled=b.disabled;b.click()}};
    window.mix=async()=>{const f=await window.makeFile(),dt=new DataTransfer();dt.items.add(f);const input=document.querySelector('input[type=file]'),zone=document.getElementById(input.id+'-dropzone');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}))};
    window.createImageBitmap=()=>{window.decodeCalls++;throw Error('Raster decode not allowed for adoption')};window.render();
  `, resolveDir: root, loader: 'jsx' }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root },
    plugins: [{ name: 'boundaries', setup(build) {
      build.onResolve({ filter: /^(next\/link|next\/navigation|@\/components\/admin\/Toast|@\/utils\/supabase\/client|@\/lib\/actions\/relasi)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: {
        'next/link': "import React from 'react';export default function Link(p){return React.createElement('a',p)}",
        'next/navigation': 'export const useRouter=()=>({refresh:()=>{}});',
        '@/components/admin/Toast': 'export const useToast=()=>({toast:(tone,message)=>window.toasts.push({tone,message})});',
        '@/utils/supabase/client': `export const createClient=()=>({auth:{getSession:async()=>{if(window.sessionDelay)await new Promise(r=>setTimeout(r,window.sessionDelay));return {data:{session:window.sessionMissing?null:{user:{id:'fixture'}}},error:null}}},storage:{from:bucket=>({upload:async(path,file,options)=>{const error=window.failUpload;window.uploads.push({bucket,path,type:file.type,size:file.size,options});if(window.uploadDelay)await new Promise(r=>setTimeout(r,window.uploadDelay));return {data:error?null:{path},error}},getPublicUrl:path=>({data:{publicUrl:'https://fixture.supabase.co/storage/v1/object/public/media/'+path}}),remove:()=>{throw Error('Physical deletion forbidden')}})}});`,
        '@/lib/actions/relasi': `const save=async(module,input)=>{window.submits.push({module,input});if(window.actionDelay)await new Promise(r=>setTimeout(r,window.actionDelay));return window.actionFailure??{success:true,message:'Tersimpan'}};export const saveGroupCompany=i=>save('group',i),savePartner=i=>save('partner',i),saveDistributionEntity=i=>save('distribution',i);export const deleteGroupCompany=async()=>({success:true}),deletePartner=deleteGroupCompany,deleteDistributionEntity=deleteGroupCompany,toggleGroupCompany=deleteGroupCompany,togglePartner=deleteGroupCompany,toggleDistributionEntity=deleteGroupCompany;`,
      }[args.path], loader: 'js', resolveDir: root }));
    } }] });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24"><rect width="32" height="24" fill="teal"/></svg>';
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else res.end('<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><main class="p-4" id="app"></main><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'media-adoption-'));
  const browser = spawn(edge, ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=19582', 'about:blank'], { stdio: 'ignore' });
  let socket; let choosers = 0; let loaded = 0;
  try {
    let target;
    for (let i = 0; i < 60; i++) { try { target = (await (await fetch('http://127.0.0.1:19582/json/list')).json()).find(t => t.type === 'page'); if (target) break; } catch { /* startup */ } await sleep(100); }
    assert.ok(target); socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const pending = new Map(); let seq = 0;
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    socket.onmessage = event => {
      const d = JSON.parse(event.data);
      if (d.id) { const h = pending.get(d.id); pending.delete(d.id); if (d.error) h.reject(d.error); else h.resolve(d.result); }
      if (d.method === 'Page.domContentEventFired') loaded++;
      if (d.method === 'Fetch.requestPaused') void cdp('Fetch.fulfillRequest', { requestId: d.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }], body: Buffer.from(svg).toString('base64') });
      if (d.method === 'Page.fileChooserOpened') { choosers++; void cdp('DOM.setFileInputFiles', { backendNodeId: d.params.backendNodeId, files: [] }); }
    };
    const evaluate = async expression => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const wait = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await sleep(40); } throw Error(`Timed out: ${expression}`); };
    const test = async (expression, expected, label) => { assert.equal(await evaluate(expression), expected, label); checks++; };
    const render = async expression => { await evaluate(expression); await sleep(80); };
    const click = async label => { await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`); await sleep(80); };
    const edit = async index => { await evaluate(`[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Edit')[${index}].click()`); await sleep(80); };
    const currentSave = "[...document.querySelectorAll('button')].find(b=>['Simpan Perubahan','Simpan'].includes(b.textContent.trim()))";
    await cdp('Page.enable'); await cdp('Page.setInterceptFileChooserDialog', { enabled: true }); await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    await cdp('Fetch.enable', { patterns: [{ urlPattern: 'https://fixture.supabase.co/*' }] });
    const navigate = async () => { const before = loaded; await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` }); for (let i = 0; i < 100 && loaded === before; i++) await sleep(40); assert.ok(loaded > before); await wait('typeof window.render==="function" && Boolean(document.querySelector("input[type=file]"))'); await cdp('Page.bringToFront'); };
    await navigate();
    await test("document.body.textContent.includes('Tarik gambar ke area ini')", true, 'Adapter adopts shared dropzone, not legacy thumbnail-only UI');
    for (const method of ['click', 'drop']) for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']) {
      await render('window.render()'); await evaluate(`window.select('${method}','${type}','Á Logo (NEW).SVG')`); await wait("document.body.textContent.includes('Terunggah — belum disimpan ke entri')");
      await test('window.uploads.length', 1, `${method}/${type} accepted`);
      await test('window.uploads[0].type', type, 'Original MIME preserved');
      await test("new RegExp('^partners/[0-9]+---logo--new-[.]svg$').test(window.uploads[0].path)", true, 'Timestamp and original lowercase sanitization preserved');
      await test("window.uploads[0].bucket==='media' && window.uploads[0].options.upsert===false", true, 'Storage contract');
      await test('window.decodeCalls', 0, 'No raster decode gate');
      await test("document.querySelector('img').getAttribute('src').startsWith('blob:')", true, 'Local preview');
      if (type === 'image/svg+xml') await test("document.body.textContent.includes('32 × 24')", false, 'SVG dimensions not fabricated');
    }
    await render('window.render()'); await evaluate("window.select('drop','image/png','large.png',true)"); await wait('window.uploads.length===1');
    await test('window.uploads[0].size>5*1024*1024', true, 'No accidental Portfolio size cap');
    await render('window.render()'); await evaluate("window.select('click','application/pdf','file.pdf')"); await wait("document.body.textContent.includes('File harus berupa gambar.')"); await test('window.uploads.length', 0, 'Non-image blocked');
    await render("window.render('adapter',window.existing);window.uploadDelay=250"); await evaluate("window.select('click','image/png','pending.png')"); await wait('window.uploads.length===1');
    await test('window.changes.length', 0, 'Authoritative reference unchanged before upload completes');
    await wait('window.changes.length===1'); await click('Lepas gambar'); await test('window.changes.at(-1)', '', 'Adapter removal is reference-only');
    await test('window.activeUrls.size', 0, 'Adapter removal revokes preview');
    await render('window.render();window.uploadDelay=250'); await evaluate('window.mix()'); await wait('window.uploads.length===1');
    await wait("document.body.textContent.includes('Terunggah — belum disimpan ke entri')"); await test('window.uploads.length', 1, 'Click plus drop cannot race two uploads');
    await render('window.render();window.sessionMissing=true'); await evaluate("window.select('click','image/png','session.png')");
    await wait("document.body.textContent.includes('Sesi Anda berakhir')"); await test('window.uploads.length', 0, 'Missing session blocks Storage');
    await render("window.render('adapter',window.existing);window.failUpload={status:500,message:'raw Storage SQL internals'}");
    await evaluate("window.select('drop','image/png','network.png')"); await wait("document.body.textContent.includes('Periksa koneksi lalu coba lagi')");
    await test('window.changes.length', 0, 'Network/Storage failure preserves authoritative URL');
    await test('document.body.textContent.includes("raw Storage")', false, 'No raw network/Storage details');
    await test('window.activeUrls.size', 0, 'Failure releases local preview');

    for (const [kind, prefix] of [['group', 'grup_kami'], ['partner', 'partners'], ['distribution', 'distribution']]) {
      await render(`window.render('${kind}')`); await edit(0);
      await test("document.querySelector('input[type=file]').accept", 'image/*', 'Parent preserves accepted formats');
      await test("document.querySelector('[id$=-dropzone] img').getAttribute('src').endsWith('/a.svg')", true, 'Existing record image');
      await evaluate("window.uploadDelay=250");
      await evaluate("window.select('drop','image/svg+xml','Logo Baru.SVG',false,true,true)");
      await wait('window.uploads.length===1'); await test(`${currentSave}.disabled`, true, 'Save disabled during upload');
      await evaluate(`${currentSave}.click()`); await test('window.submits.length', 0, 'Handler-level save guard');
      await wait("document.body.textContent.includes('Terunggah — belum disimpan ke entri')"); await test('window.uploads.length', 1, 'Rapid duplicate drop blocked');
      await test(`window.uploads[0].path.startsWith('${prefix}/')`, true, 'Namespace unchanged');
      await evaluate("window.actionFailure={success:false,message:'Valider',errors:{logoUrl:'Logo fixture invalid'}}"); await evaluate(`${currentSave}.click()`); await sleep(120);
      await test("document.body.textContent.split('Logo fixture invalid').length-1", 1, 'Logo field error rendered once');
      await evaluate('window.actionFailure=null'); await evaluate(`${currentSave}.click()`); await sleep(120);
      await test('window.uploads.length', 1, 'Retry save does not reupload');
      await test('window.submits.at(-1).input.logoUrl.endsWith(window.uploads[0].path)', true, 'Parent saves new URL');
      await test('window.submits.at(-1).input.sortOrder', 7, 'Sort order preserved');
      await test(kind === 'distribution' ? 'window.submits.at(-1).input.isActive' : 'window.submits.at(-1).input.isVisible', false, 'Visibility/active semantics preserved');
      if (kind === 'partner') await test('window.submits.at(-1).input.shortName', 'PA', 'Partner shortName unchanged');
      if (kind === 'distribution') { await test('window.submits.at(-1).input.parentId', '00000000-0000-4000-8000-000000000002', 'Distribution parent unchanged'); await test('window.submits.at(-1).input.distributionType', 'sub_distributor', 'Distribution type unchanged'); }
      await edit(0); await evaluate("window.actionDelay=200"); await evaluate(`${currentSave}.click();${currentSave}.click()`); await sleep(300);
      await test('window.submits.length', 3, 'Duplicate save does not dispatch two actions');
      await edit(0); await evaluate("window.uploadDelay=0;window.actionDelay=0");
      await evaluate("document.querySelector('[id$=-browse]').click()"); await evaluate("window.select('click','image/png','click.png')");
      await wait("document.body.textContent.includes('Terunggah — belum disimpan ke entri')");
      await evaluate(`${currentSave}.click()`); await sleep(100); await test("window.submits.at(-1).input.logoUrl.endsWith('-click.png')", true, 'Parent click selection persists reference');
      await edit(0); await click('Lepas gambar'); await evaluate(`${currentSave}.click()`); await sleep(100); await test('window.submits.at(-1).input.logoUrl', '', 'Remove sends existing empty-string contract');
      await edit(0); await evaluate("window.failUpload={status:403,code:'AccessDenied',message:'raw RLS SQL secrets'}"); await evaluate("window.select('drop','image/svg+xml','failure.svg')");
      await wait("document.body.textContent.includes('Akun Anda belum memiliki akses')"); await test('document.body.textContent.includes("raw RLS")', false, 'No raw storage error');
      await evaluate(`${currentSave}.click()`); await sleep(100); await test("window.submits.at(-1).input.logoUrl.endsWith('/a.svg')", true, 'Failed replacement retains old URL');

      await edit(0); await evaluate("window.failUpload=null;window.uploadDelay=350"); await evaluate("window.select('drop','image/png','stale.png')"); await wait('window.uploads.at(-1).path.endsWith("-stale.png")');
      await edit(1); await sleep(450);
      await test("document.querySelector('[id$=-dropzone] img').getAttribute('src').endsWith('/b.svg')", true, 'Old completion cannot update next record');
      await test('window.activeUrls.size', 0, 'Switch record releases transient preview');
      await test("document.body.textContent.includes('stale.png')", false, 'Old filename/phase cleared');
      await evaluate(`${currentSave}.click()`); await sleep(100); await test("window.submits.at(-1).input.logoUrl.endsWith('/b.svg')", true, 'Next record payload retains its own logo');
      await edit(0); await evaluate("window.uploadDelay=350"); await evaluate("window.select('drop','image/png','cancelled.png')"); await wait('window.uploads.at(-1).path.endsWith("-cancelled.png")'); await click('Batal'); await edit(1); await sleep(450);
      await test("document.querySelector('[id$=-dropzone] img').getAttribute('src').endsWith('/b.svg')", true, 'Cancel/reopen ignores late result');
      await click('Batal'); await click(kind === 'group' ? 'Tambah Grup' : kind === 'partner' ? 'Tambah Partner' : 'Tambah Jaringan');
      await test("document.querySelector('[id$=-dropzone] img')===null", true, 'Create mode resets upload state');
      await click('Batal'); await edit(0);
      await evaluate("window.sessionDelay=250"); await evaluate("window.select('drop','image/png','cancel-before-storage.png')"); await click('Batal'); await sleep(350);
      await test('window.uploads.some(u=>u.path.endsWith("-cancel-before-storage.png"))', false, 'Unmounted session lookup cannot start upload');

      for (const width of [375, 768, 1366]) for (const dark of [false, true]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 375 });
        await render(`document.documentElement.classList.toggle('dark',${dark});window.render('${kind}')`); await edit(0);
        await evaluate(`window.select('drop','image/svg+xml',${JSON.stringify('logo'.repeat(65) + '.svg')})`); await wait("document.body.textContent.includes('Terunggah — belum disimpan ke entri')");
        await test('document.documentElement.scrollWidth<=innerWidth', true, `${kind}/${width}/${dark} no overflow`);
        await test("document.querySelector('[id$=-browse]').getBoundingClientRect().height>=44", true, 'Usable browse target');
        await test("document.querySelector('[role=status]')?.getAttribute('aria-live')", 'polite', 'Accessible state');
        if (width === 375 && dark) {
          await evaluate("document.querySelector('[id$=-dropzone]').scrollIntoView({block:'start',behavior:'instant'})");
          await wait("(()=>{const img=document.querySelector('[id$=-dropzone] img');return img.complete&&img.naturalWidth>0})()");
          const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
          const file = path.join(profile, `${kind}-375-dark.png`); fs.writeFileSync(file, Buffer.from(screenshot.data, 'base64')); console.log('Browser screenshot:', file);
        }
      }
    }
    await test('window.errors.length', 0, 'No browser runtime exceptions');
    for (const [key, code, vk] of [[' ', 'Space', 32], ['Enter', 'Enter', 13]]) {
      await navigate(); await evaluate("document.querySelector('[id$=-browse]').focus()"); const before = choosers;
      await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      if (key === 'Enter') await cdp('Input.dispatchKeyEvent', { type: 'char', key, code, text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: vk });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); await sleep(150);
      assert.ok(choosers > before, `${code} opens native picker`); checks++;
    }
    for (const logoUrl of ['', '/images/logo.svg', 'http://example.com/logo.svg', 'https://example.com/logo.svg']) {
      const h = serverHarness();
      const result = await h.actions.saveDistributionEntity({ name: 'Distribusi Fixture', distributionType: 'distributor', logoUrl, isActive: true, sortOrder: 7 });
      assert.equal(result.success, true); assert.equal(h.writes[0].record.logo_url, logoUrl || null); checks += 2;
    }
    const tooLong = serverHarness();
    assert.equal((await tooLong.actions.saveDistributionEntity({ name: 'Fixture', distributionType: 'distributor', logoUrl: 'https://example.com/' + 'x'.repeat(2000) })).success, false); checks++;
    const parentId = '00000000-0000-4000-8000-000000000002';
    const parent = serverHarness({ hierarchy: [{ id: parentId, parent_id: null, is_active: false }] });
    assert.equal((await parent.actions.saveDistributionEntity({ name: 'Fixture', distributionType: 'sub_distributor', parentId, isActive: true })).success, false);
    assert.equal(parent.writes.length, 0); checks += 2;
    const blockedDelete = serverHarness({ children: 1 });
    assert.equal((await blockedDelete.actions.deleteDistributionEntity(parentId)).success, false); assert.equal(blockedDelete.writes.length, 0); checks += 2;
    const deleted = serverHarness();
    assert.equal((await deleted.actions.deleteDistributionEntity(parentId)).success, true);
    assert.equal(deleted.writes[0].record.is_active, false); assert.ok(deleted.writes[0].record.deleted_at); checks += 3;
    const changed = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'supabase', 'lib/actions', 'lib/validations', 'utils/supabase', 'components/admin/ImageUploadField.tsx', 'components/admin/PortfolioForm.tsx', 'package.json', 'package-lock.json'], { cwd: root, encoding: 'utf8' });
    assert.equal(changed.trim(), '', 'Protected domain/authorization/primitive files unchanged'); checks++;
    console.log(`PASS: ${checks} actual adapter + Grup/Partner/Distribution browser checks; image/* including SVG/GIF, unchanged paths, state/busy/session safety and responsive light/dark. Transport mocked; no live writes.`);
  } finally { if (socket) socket.close(); browser.kill(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
