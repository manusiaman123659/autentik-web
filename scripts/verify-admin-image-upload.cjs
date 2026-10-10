/* eslint-disable @typescript-eslint/no-require-imports -- Actual React components in an isolated browser; auth, Storage and actions are mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
let checks = 0;

async function main() {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.ok(fs.existsSync(edge), 'Existing Edge browser fixture requires Microsoft Edge');
  const cssRoot = path.join(root, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter(name => name.endsWith('.css'))
    .map(name => fs.readFileSync(path.join(cssRoot, name), 'utf8')).join('\n');
  const bundle = await esbuild.build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client'; import {flushSync} from 'react-dom';
      import PortfolioForm from './components/admin/PortfolioForm';
      const app=createRoot(document.getElementById('app')); let version=0;
      window.errors=[]; window.uploads=[]; window.submits=[]; window.toasts=[]; window.events=[];
      window.createdUrls=[]; window.revokedUrls=[]; window.activeUrls=new Set();
      window.addEventListener('error',e=>window.errors.push(e.message));
      window.addEventListener('unhandledrejection',e=>window.errors.push(String(e.reason)));
      const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
      URL.createObjectURL=blob=>{const url=create(blob);window.createdUrls.push(url);window.activeUrls.add(url);return url;};
      URL.revokeObjectURL=url=>{window.revokedUrls.push(url);window.activeUrls.delete(url);revoke(url);};
      const decode=window.createImageBitmap.bind(window);
      window.createImageBitmap=async file=>{window.events.push('decode');if(window.decodeDelay)await new Promise(r=>setTimeout(r,window.decodeDelay));return decode(file);};
      window.base={id:'00000000-0000-4000-8000-000000000001',title:'Fixture AKA',summary:'Ringkasan',description:'',entry_kind:'portfolio',category_label:null,organization_name:null,image_url:null,image_alt:null,image_caption:null,source_reference:null,status:'draft',sort_order:0,created_at:'2026-10-10',updated_at:'2026-10-10'};
      window.render=(patch={})=>{window.uploads=[];window.submits=[];window.toasts=[];window.events=[];window.failUpload=null;window.sessionMissing=false;window.badUrl=false;window.uploadDelay=0;window.decodeDelay=0;window.actionFailure=null;flushSync(()=>app.render(<PortfolioForm key={++version} initial={patch===null?undefined:{...window.base,...patch}}/>));};
      window.unmount=()=>flushSync(()=>app.render(null));
      window.makeFile=async(type='image/png',name='foto.png',mode='valid')=>{
        if(mode==='corrupt')return new File(['not an image'],name,{type});
        if(mode==='oversize')return new File([new Uint8Array(5*1024*1024+1)],name,{type});
        if(mode==='empty')return new File([],name,{type});
        const canvas=document.createElement('canvas');canvas.width=32;canvas.height=24;
        canvas.getContext('2d').fillRect(0,0,32,24);
        const blob=await new Promise(r=>canvas.toBlob(r,type));return new File([blob],name,{type});
      };
      window.choose=async(type,name,mode)=>{const file=await window.makeFile(type,name,mode);const dt=new DataTransfer();dt.items.add(file);const input=document.getElementById('portfolio-image');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));};
      window.drop=async(type,name,mode,twice=false)=>{const file=await window.makeFile(type,name,mode);const dt=new DataTransfer();dt.items.add(file);const zone=document.getElementById('portfolio-image-dropzone');zone.dispatchEvent(new DragEvent('dragenter',{bubbles:true,dataTransfer:dt}));zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));if(twice)zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));};
      window.render();
    `, resolveDir: root, loader: 'jsx' },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root },
    define: { 'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify('https://fixture.supabase.co') },
    plugins: [{ name: 'external-boundaries', setup(build) {
      build.onResolve({ filter: /^next\/image$/ }, () => ({ path: 'image', namespace: 'fixture' }));
      build.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'fixture' }));
      build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'fixture' }));
      build.onResolve({ filter: /^@\/components\/admin\/Toast$/ }, () => ({ path: 'toast', namespace: 'fixture' }));
      build.onResolve({ filter: /^@\/utils\/supabase\/client$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
      build.onResolve({ filter: /^@\/lib\/actions\/portfolio$/ }, () => ({ path: 'actions', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: {
        image: "import React from 'react';export default function Image(props){return React.createElement('img',props)}",
        link: "import React from 'react';export default function Link(props){return React.createElement('a',props)}",
        navigation: 'export const useRouter=()=>({push:()=>{},refresh:()=>{}});',
        toast: 'export const useToast=()=>({toast:(tone,message)=>window.toasts.push({tone,message})});',
        actions: 'export const savePortfolio=async(input)=>{window.submits.push(input);return window.actionFailure??{success:true,message:"Tersimpan"};};',
        storage: `export const createClient=()=>({auth:{getSession:async()=>{window.events.push('session');return {data:{session:window.sessionMissing?null:{user:{id:window.base.id}}},error:null}}},storage:{from:bucket=>({upload:async(path,file,options)=>{window.events.push('upload');window.uploads.push({bucket,path,type:file.type,options});if(window.uploadDelay)await new Promise(r=>setTimeout(r,window.uploadDelay));return {data:window.failUpload?null:{path,id:crypto.randomUUID(),fullPath:bucket+'/'+path},error:window.failUpload}},getPublicUrl:path=>({data:{publicUrl:window.badUrl?'https://untrusted.example/image.png':'https://fixture.supabase.co/storage/v1/object/public/media/'+path}}),remove:()=>{throw Error('Destructive Storage cleanup forbidden')}})}});`,
      }[args.path], loader: 'js', resolveDir: root }));
    } }],
  });
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else res.end('<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><main class="p-4" id="app"></main><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'admin-image-ui-'));
  const port = 19581;
  const browser = spawn(edge, ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  let socket; let chooserCount = 0; let completingPicker = false; let documentsLoaded = 0;
  const pickerFixture = path.join(profile, 'picker.png');
  try {
    let target;
    for (let i = 0; i < 60; i++) {
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(e => e.type === 'page'); if (target) break; } catch { /* browser starting */ }
      await sleep(100);
    }
    assert.ok(target, 'Browser debugger unavailable');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const pending = new Map(); let sequence = 0;
    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    socket.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.id) { const handler = pending.get(data.id); pending.delete(data.id); if (data.error) handler.reject(data.error); else handler.resolve(data.result); }
      if (data.method === 'Page.domContentEventFired') documentsLoaded++;
      if (data.method === 'Fetch.requestPaused') void cdp('Fetch.fulfillRequest', {
        requestId: data.params.requestId, responseCode: data.params.request.url.endsWith('/broken.png') ? 404 : 200,
        responseHeaders: [{ name: 'Content-Type', value: 'image/png' }], body: data.params.request.url.endsWith('/broken.png') ? '' : pixel,
      });
      if (data.method === 'Page.fileChooserOpened') { chooserCount++; void cdp('DOM.setFileInputFiles', { backendNodeId: data.params.backendNodeId, files: completingPicker ? [pickerFixture] : [] }); }
    };
    const evaluate = async expression => {
      const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const waitFor = async expression => { for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await sleep(50); } throw Error(`Timed out: ${expression}`); };
    const test = async (expression, expected, label) => { assert.equal(await evaluate(expression), expected, label); checks++; };
    const render = async expression => { await evaluate(expression); await sleep(100); };
    const click = async label => { await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`); await sleep(100); };
    const setField = async (id, value) => {
      await evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await sleep(50);
    };
    const existing = 'https://fixture.supabase.co/storage/v1/object/public/media/portfolio/00000000-0000-4000-8000-000000000001/existing.png';
    await cdp('Fetch.enable', { patterns: [{ urlPattern: 'https://fixture.supabase.co/*', requestStage: 'Request' }] });
    await cdp('Page.enable'); await cdp('Page.setInterceptFileChooserDialog', { enabled: true });
    await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
    await cdp('Page.bringToFront');
    await waitFor('typeof window.render==="function" && Boolean(document.querySelector("form"))');

    // Regression: real validation must make the alt failure discoverable, not only toast it.
    await render(`window.render({status:'published',image_url:${JSON.stringify(existing)}})`);
    await click('Simpan Entri');
    await test("Boolean(document.querySelector('[role=alert]')?.textContent.includes('Teks alternatif gambar wajib diisi untuk publikasi'))", true, 'Published missing-alt failure has an accessible form summary');
    await waitFor("document.activeElement.id==='portfolio-imageAlt'");
    await test('document.activeElement.id', 'portfolio-imageAlt', 'First invalid field receives focus');
    await test("document.getElementById('portfolio-imageAlt').closest('[aria-label=\"Gambar portfolio\"]')!==null", true, 'Alt belongs to the image card');
    await test('window.submits.length', 0, 'Invalid publication never calls save');

    await render('window.render(null)');
    await test("document.getElementById('portfolio-image').type==='file' && getComputedStyle(document.getElementById('portfolio-image')).display==='none'", true, 'Native picker retained and visually hidden');
    await test("document.body.textContent.includes('Tarik gambar')", true, 'Empty dropzone guidance');
    for (const method of ['choose', 'drop']) for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      await render('window.render()');
      if (method === 'choose') { await evaluate("document.getElementById('portfolio-image-browse').click()"); await sleep(70); }
      await evaluate(`window.${method}('${type}','My Photo.${type.split('/')[1]}')`);
      await waitFor("document.body.textContent.includes('Terunggah — belum disimpan ke entri')");
      await test('window.uploads.length', 1, `${method}/${type} one upload`);
      await test("window.events.indexOf('decode')<window.events.indexOf('upload')", true, 'Actual browser decode precedes upload');
      await test(String.raw`/^portfolio\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(window.uploads[0].path)`, true, 'UUID-v4 policy-compatible path ignores original filename');
      await test("window.uploads[0].bucket==='media' && window.uploads[0].options.upsert===false && window.uploads[0].options.contentType===window.uploads[0].type", true, 'Storage contract preserved');
      await test("document.body.textContent.includes('32 × 24')", true, 'Decoded dimensions displayed');
      await test("document.getElementById('portfolio-image').value", '', 'Same file can be reselected');
      await click('Simpan Entri');
      await test('window.submits.length', 1, 'Draft image with blank alt saves');
    }
    assert.ok(chooserCount >= 3, 'Click browse must open native chooser'); checks++;

    await render("window.render({status:'published'})");
    await evaluate("window.choose('image/png','new.png')");
    await waitFor("document.body.textContent.includes('Terunggah — belum disimpan ke entri')");
    await click('Simpan Entri');
    await test("document.getElementById('portfolio-imageAlt').getAttribute('aria-invalid')", 'true', 'Specific alt error linked to input');
    await test('window.uploads.length', 1, 'Successful upload retained after failed save');
    await setField('portfolio-imageAlt', 'Foto perangkat AKA'); await click('Simpan Entri');
    await test('window.submits.length', 1, 'Corrected Published alt permits save');
    await test('window.uploads.length', 1, 'Correcting alt never reuploads');
    await test('window.submits[0].imageAlt', 'Foto perangkat AKA', 'Editorial alt persisted unchanged');

    for (const [type, mode, message] of [['image/png', 'oversize', 'maksimal 5 MB'], ['text/plain', 'corrupt', 'Format gambar'], ['image/png', 'corrupt', 'tidak dapat dibaca'], ['image/png', 'empty', 'kosong']]) {
      await render(`window.render({image_url:${JSON.stringify(existing)}})`);
      await evaluate(`window.choose('${type}','invalid.png','${mode}')`);
      await waitFor(`Boolean(document.getElementById('portfolio-image-error')?.textContent.includes('${message}'))`);
      await test('window.uploads.length', 0, 'Rejected file never reaches Storage');
      await test('window.activeUrls.size', 0, 'Rejected candidate preview released');
      await click('Simpan Entri'); await test('window.submits[0].imageUrl', existing, 'Invalid replacement preserves reference');
    }
    for (const error of [{ name: 'StorageApiError', status: 403, statusCode: '403', code: 'AccessDenied', message: 'raw row-level security SQL secret' }, { name: 'StorageUnknownError', message: 'network raw internal' }]) {
      await render(`window.render({image_url:${JSON.stringify(existing)}});window.failUpload=${JSON.stringify(error)}`);
      await evaluate("window.drop('image/png','replace.png')");
      await waitFor("Boolean(document.getElementById('portfolio-image-error')?.textContent)");
      await test('document.body.textContent.includes("raw") || document.body.textContent.includes("row-level security")', false, 'Safe upload error does not expose internals');
      await test('window.activeUrls.size', 0, 'Failed upload revokes candidate');
      await test(`document.querySelector('[aria-label="Gambar portfolio"] img')?.getAttribute('src')`, existing, 'Failed replacement returns to old preview');
      await click('Simpan Entri'); await test('window.submits[0].imageUrl', existing, 'Failed replacement preserves old DB payload');
    }
    await render('window.render();window.sessionMissing=true'); await evaluate("window.choose('image/png','session.png')");
    await waitFor("document.body.textContent.includes('Sesi Anda berakhir')"); await test('window.uploads.length', 0, 'Missing session does not upload');
    await render(`window.render({image_url:${JSON.stringify(existing)}});window.badUrl=true`); await evaluate("window.choose('image/png','url.png')");
    await waitFor("Boolean(document.getElementById('portfolio-image-error')?.textContent)"); await click('Simpan Entri');
    await test('window.submits[0].imageUrl', existing, 'Untrusted returned URL never enters form');

    await render('window.render();window.uploadDelay=300'); await evaluate("window.drop('image/png','duplicate.png','valid',true)");
    await waitFor('window.uploads.length===1'); await test("document.querySelector('button[type=submit]').disabled", true, 'Save locked during upload');
    await waitFor("document.body.textContent.includes('Terunggah — belum disimpan ke entri')"); await test('window.uploads.length', 1, 'Handler rejects rapid duplicate drop');
    await evaluate("window.choose('image/png','duplicate.png')"); await waitFor('window.uploads.length===2 && document.body.textContent.includes("Terunggah — belum disimpan ke entri")');
    await test('window.activeUrls.size', 1, 'Replacement releases previous local URL');
    await click('Simpan Entri');
    await test('window.submits.at(-1).imageUrl.endsWith(window.uploads[1].path)', true, 'Successful replacement persists the new object reference');
    await click('Lepas gambar'); await test('window.activeUrls.size', 0, 'Remove releases local URL');
    await click('Simpan Entri'); await test('window.submits.at(-1).imageUrl', '', 'Remove only clears record reference');
    await render(`window.render({status:'published',image_url:${JSON.stringify(existing)}})`);
    await click('Simpan Entri'); await setField('portfolio-status', 'draft'); await click('Simpan Entri');
    await test('window.submits[0].status', 'draft', 'Published to Draft permits blank image alt');
    await test('window.submits[0].imageUrl', existing, 'Changing publication state retains the image');
    await render(`window.render({status:'published',image_url:${JSON.stringify(existing)}})`);
    await click('Lepas gambar'); await click('Simpan Entri');
    await test('window.submits[0].status', 'published', 'Removing image preserves Published');
    await test('window.submits[0].imageUrl', '', 'Published without an image does not require alt');

    await render('window.render();window.decodeDelay=200');
    await evaluate("(async()=>{await window.choose('image/png','unmount.png');window.unmount()})()"); await sleep(350);
    await test('window.uploads.length', 0, 'Unmounted decode cannot start upload'); await test('window.activeUrls.size', 0, 'Unmount releases candidate URL');
    await render('window.render();window.uploadDelay=200'); await evaluate("window.choose('image/png','late.png')"); await waitFor('window.uploads.length===1');
    await evaluate('window.unmount()'); await sleep(300); await test('window.activeUrls.size', 0, 'Unmounted upload releases local URL');

    await render(`window.render({image_url:${JSON.stringify(existing.replace('existing.png', 'broken.png'))}})`);
    await waitFor("document.body.textContent.includes('Pratinjau gambar tidak tersedia')"); await click('Simpan Entri');
    await test('window.submits[0].imageUrl', existing.replace('existing.png', 'broken.png'), 'Broken preview does not clear reference');
    if (await evaluate('window.errors.length')) console.error('Browser fixture exceptions:', await evaluate('window.errors'));
    await test('window.errors.length', 0, 'No runtime exceptions in upload scenarios');
    const pickerBytes = await evaluate('(async()=>Array.from(new Uint8Array(await (await window.makeFile()).arrayBuffer())))()');
    fs.writeFileSync(pickerFixture, Buffer.from(pickerBytes));
    completingPicker = true;
    for (const [key, code, vk] of [[' ', 'Space', 32], ['Enter', 'Enter', 13]]) {
      // Isolate each native chooser activation from previously intercepted/cancelled dialogs.
      const previousDocument = documentsLoaded;
      await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
      for (let i = 0; i < 80 && documentsLoaded === previousDocument; i++) await sleep(50);
      assert.ok(documentsLoaded > previousDocument, 'New keyboard fixture document must load');
      await waitFor('typeof window.render==="function" && Boolean(document.getElementById("portfolio-image-browse"))');
      await cdp('Page.bringToFront');
      await evaluate("document.getElementById('portfolio-image-browse').focus()");
      const beforeKeyboard = chooserCount;
      await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      if (key === 'Enter') await cdp('Input.dispatchKeyEvent', { type: 'char', key, code, text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: vk });
      await sleep(120);
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); await sleep(100);
      assert.ok(chooserCount > beforeKeyboard, `${code} must open native chooser`); checks++;
      await waitFor("document.body.textContent.includes('Terunggah — belum disimpan ke entri')");
    }
    await test("document.querySelectorAll('button button').length", 0, 'No nested buttons');

    for (const width of [375, 768, 1366]) for (const dark of [false, true]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 375 });
      await render(`document.documentElement.classList.toggle('dark',${dark});window.render()`);
      await evaluate(`window.choose('image/webp',${JSON.stringify('nama'.repeat(70) + '.webp')})`);
      await waitFor("document.body.textContent.includes('Terunggah — belum disimpan ke entri')");
      await test('document.documentElement.scrollWidth<=innerWidth', true, `No filename/layout overflow ${width}/${dark}`);
      await test("(()=>{const img=document.querySelector('[aria-label=\"Gambar portfolio\"] img');return img.getBoundingClientRect().width<=img.parentElement.getBoundingClientRect().width})()", true, 'Preview contained');
      await test("document.getElementById('portfolio-image-browse').getBoundingClientRect().height>=44", true, 'Usable mobile/desktop browse target');
      if ((width === 375 && dark) || (width === 1366 && !dark)) {
        await evaluate("document.querySelector('[aria-label=\"Gambar portfolio\"]').scrollIntoView({block:'start'})");
        const image = await cdp('Page.captureScreenshot', { format: 'png' });
        const screenshot = path.join(profile, `portfolio-image-${width}-${dark ? 'dark' : 'light'}.png`);
        fs.writeFileSync(screenshot, Buffer.from(image.data, 'base64'));
        console.log('Browser screenshot:', screenshot);
      }
    }
    await render('window.render();window.actionFailure={success:false,message:"Periksa isian.",errors:{imageCaption:"Keterangan terlalu panjang"}}');
    await click('Simpan Entri'); await waitFor("document.activeElement.id==='portfolio-imageCaption'");
    await test('document.activeElement.id', 'portfolio-imageCaption', 'Server field error receives focus');
    await test('window.errors.length', 0, 'No browser runtime exceptions');

    const component = fs.readFileSync(path.join(root, 'components/admin/ImageUploadField.tsx'), 'utf8');
    assert.doesNotMatch(component, /supabase|storage[.]|portfolioSchema|savePortfolio|createImageBitmap/i, 'Shared field must not own domain or transport'); checks++;
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'components/admin/PortfolioForm.tsx'), 'utf8'), /storage[\s\S]{0,40}[.]remove\(/, 'No physical Storage deletion'); checks++;
    assert.equal(execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'supabase/migrations'], { cwd: root, encoding: 'utf8' }).trim(), '', 'Migrations unchanged'); checks++;
    console.log(`PASS: ${checks} real-component Edge browser checks; real JPEG/PNG/WebP decoding, click/drop, alt/save regression, errors, lifecycle, keyboard, responsive light/dark. Storage/auth/actions mocked; no live writes.`);
  } finally {
    if (socket) socket.close(); browser.kill(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
