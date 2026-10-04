/* eslint-disable @typescript-eslint/no-require-imports -- Real components in an isolated browser fixture. */
// Requires a successful next build (for real CSS) and installed Microsoft Edge.
// Only action/network boundaries are mocked. No application server/Auth is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let checks = 0;

async function main() {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.ok(fs.existsSync(edge), 'Microsoft Edge unavailable');
  const cssRoot = path.join(root, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter((name) => name.endsWith('.css')).map((name) => fs.readFileSync(path.join(cssRoot,name),'utf8')).join('\n');
  assert.ok(css.length, 'Run npm run build first');
  const stub = `
    export const useRouter = () => ({ refresh: () => { window.refreshes++; } });
    export { unstable_rethrow } from 'next/dist/client/components/unstable-rethrow.browser';
    export const useToast = () => ({ toast: (tone,message) => window.toasts.push({tone,message}) });
    const wait = () => new Promise(resolve => { if(window.holdAction)window.releaseAction=resolve;else setTimeout(resolve,window.actionDelay); });
    export async function lookupStaffCandidate({email}) {
      window.lookups++; await wait();
      return email.toLowerCase()==='customer@example.com' ? { success:true,message:'Akun ditemukan.',candidate:{id:'customer-fixture',full_name:'Customer Fixture',email,role:'customer',is_active:true,updated_at:'2026-10-04T12:00:00.123456Z'} } : {success:false,message:'Akun tidak ditemukan.'};
    }
    export async function manageStaffAccess(input) { window.submits++; window.lastInput=input; await wait(); if(window.redirectAction){const error=new Error('NEXT_REDIRECT');error.digest='NEXT_REDIRECT;push;/admin;303;';throw error;} return window.failAction ? {success:false,message:'Data akses sudah berubah. Muat ulang daftar.'} : {success:true,message:'Akses staf berhasil diperbarui.'}; }
    export const provisionStaffAccess = manageStaffAccess;
  `;
  const bundle = await esbuild.build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import StaffListClient from './components/admin/StaffListClient';
      window.frameworkErrors=[];
      window.addEventListener('error',event=>{window.frameworkErrors.push(event.error?.digest??event.message);event.preventDefault();});
      window.addEventListener('unhandledrejection',event=>{window.frameworkErrors.push(event.reason?.digest??String(event.reason));event.preventDefault();});
      const app=createRoot(document.getElementById('app'),{onUncaughtError:error=>window.frameworkErrors.push(error.digest??error.message)}); let key=0;
      window.toasts=[]; window.refreshes=0; window.lookups=0; window.submits=0; window.actionDelay=0;
      window.resetFixture=(secondSuper=false,empty=false)=>{
        const rows=Array.from({length:12},(_,i)=>({id:'fixture-'+i,email:'staff'+i+'@example.com',full_name:'Staf '+i,
          role:i===0 || i===9 ? 'super_admin' : i===1 && secondSuper ? 'super_admin' : ['admin','staff','editor'][i%3],
          is_active:i!==9,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-10-04T12:00:00.123456Z'}));
        app.render(<StaffListClient key={++key} staff={empty?[]:rows} meId='fixture-0'/>);
      }; window.resetFixture();
    `, resolveDir: root, loader: 'jsx' },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    alias: { '@': root },
    plugins: [{ name: 'isolated-boundaries', setup(build) {
      build.onResolve({ filter: /^(next\/navigation|@\/lib\/actions\/staff|@\/components\/admin\/Toast)$/ }, () => ({ path:'boundaries', namespace:'fixture' }));
      build.onLoad({ filter: /.*/, namespace:'fixture' }, () => ({ contents:stub, loader:'js', resolveDir:root }));
      build.onResolve({ filter: /^next\/link$/ }, () => ({ path:'link', namespace:'fixture-link' }));
      build.onLoad({ filter: /.*/, namespace:'fixture-link' }, () => ({ contents:"import React from 'react'; export default function Link(props){return React.createElement('a',props)}", loader:'js', resolveDir:root }));
    } }],
  });
  const js = bundle.outputFiles[0].text;
  const server = http.createServer((req,res) => {
    if (req.url==='/fixture.js') { res.setHeader('Content-Type','text/javascript'); res.end(js); }
    else if (req.url==='/fixture.css') { res.setHeader('Content-Type','text/css'); res.end(css); }
    else { res.setHeader('Content-Type','text/html'); res.end('<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0"><main class="p-4 max-w-6xl" id="app"></main><script src="/fixture.js"></script></body></html>'); }
  });
  await new Promise((resolve) => server.listen(0,'127.0.0.1',resolve));
  const temporaryParent = path.join(os.tmpdir(),'opencode');
  assert.ok(fs.existsSync(temporaryParent), 'Pre-approved temporary parent missing');
  const userData = fs.mkdtempSync(path.join(temporaryParent,'staff-ui-'));
  const debugPort = 19462;
  const browser = spawn(edge,['--headless=new','--no-first-run','--no-default-browser-check',`--user-data-dir=${userData}`,`--remote-debugging-port=${debugPort}`,'about:blank'],{stdio:'ignore'});
  let socket;
  try {
    let target;
    for (let i=0;i<60;i++) {
      try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find((entry)=>entry.type==='page'); if (target) break; } catch { /* wait for browser */ }
      await sleep(100);
    }
    assert.ok(target,'Browser debugging endpoint unavailable');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    const pending = new Map(); let sequence=0;
    socket.onmessage=(event)=>{const message=JSON.parse(event.data); if(message.id){ const handler=pending.get(message.id); pending.delete(message.id); if(!handler)return; if(message.error)handler.reject(new Error(JSON.stringify(message.error)));else handler.resolve(message.result); }};
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async(expression)=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value;};
    const click=async(label,scope='document')=>{assert.equal(await evaluate(`(()=>{const b=[...${scope}.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)return false;b.focus();b.click();return true})()`),true,`Button ${label}`);await sleep(80);};
    const setInput=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const key=async(key,code,modifiers=0)=>{await cdp('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:key==='Tab'?9:27,modifiers});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:key==='Tab'?9:27,modifiers});};
    await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}`});
    for(let i=0;i<50;i++){if(await evaluate("document.querySelectorAll('tbody tr').length===8"))break;await sleep(100);}
    for(const width of [375,768,1366,1440]) {
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
      for(const dark of [false,true]) {
        await evaluate(`document.documentElement.classList.toggle('dark',${dark});window.resetFixture()`);await sleep(100);
        assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true,`Page overflow ${width}/${dark}`);
        assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"),8);
        assert.equal(await evaluate("document.querySelector('tbody tr').textContent.includes('Anda')"),true);
        assert.equal(await evaluate("[...document.querySelector('tbody tr').querySelectorAll('button')].find(b=>b.textContent==='Nonaktifkan').disabled"),true);
        await click('Ubah Role');
        assert.equal(await evaluate("[...document.querySelector('#staff-role').options].filter(o=>o.value!=='super_admin').every(o=>o.disabled)"),true);
        assert.equal(await evaluate("(()=>{const r=document.querySelector('dialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"),true,`Dialog bounds ${width}/${dark}`);
        const background=await evaluate("getComputedStyle(document.querySelector('dialog')).backgroundColor");
        const expectedBackground=await evaluate(`(()=>{const e=document.createElement('div');e.className=${JSON.stringify(dark?'bg-slate-900':'bg-white')};document.body.append(e);const color=getComputedStyle(e).backgroundColor;e.remove();return color})()`);
        assert.equal(background,expectedBackground);
        assert.notEqual(background,'rgba(0, 0, 0, 0)');
        for(let i=0;i<7;i++){await key('Tab','Tab');assert.equal(await evaluate("document.querySelector('dialog').contains(document.activeElement)"),true);}
        await key('Tab','Tab',8);assert.equal(await evaluate("document.querySelector('dialog').contains(document.activeElement)"),true);
        await key('Escape','Escape');await sleep(80);
        assert.equal(await evaluate("!document.querySelector('dialog')"),true);
        assert.equal(await evaluate("document.activeElement.textContent"),'Ubah Role','Focus restored to opener');
        checks++;
      }
    }
    await evaluate('window.resetFixture(true)');await sleep(100);
    await evaluate("document.querySelector('[aria-label=\"Halaman berikutnya\"]').click()");await sleep(100);
    assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"),4);
    assert.equal(await evaluate("document.querySelector('tbody tr').textContent.includes('Staf 8')"),true);
    await evaluate("document.querySelector('[aria-label=\"Halaman sebelumnya\"]').click()");await sleep(100);
    assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"),8);checks++;
    await click('Ubah Role');await setInput('#staff-role','admin');await sleep(60);await click('Simpan Perubahan');
    assert.equal(await evaluate("document.querySelector('dialog').textContent.includes('Konfirmasi Perubahan Akses')"),true);checks++;
    await click('Batal');
    await click('Tambah Staff dari Akun');await setInput('#staff-email','customer@example.com');await click('Cari Akun');
    assert.equal(await evaluate("document.querySelector('dialog').textContent.includes('Customer Fixture')"),true);
    await setInput('#staff-role','super_admin');await sleep(60);
    assert.equal(await evaluate("document.querySelector('dialog').textContent.includes('seluruh akses CMS')"),true);checks++;
    await click('Simpan Perubahan');await evaluate('window.holdAction=true;window.submits=0');
    await evaluate("(()=>{const b=[...document.querySelector('dialog').querySelectorAll('button')].find(b=>b.textContent==='Konfirmasi & Simpan');b.click();b.click()})()");await sleep(100);
    assert.equal(await evaluate('window.submits'),1);
    await key('Escape','Escape');assert.equal(await evaluate("document.querySelector('dialog').open"),true,'Busy dialog cannot dismiss');
    assert.equal(await evaluate("[...document.querySelector('dialog').querySelectorAll('button,input,select,textarea')].every(e=>e.disabled)"),true);
    await evaluate('window.holdAction=false;window.releaseAction()');
    for(let i=0;i<30;i++){if(await evaluate("!document.querySelector('dialog')"))break;await sleep(50);}
    assert.equal(await evaluate("!document.querySelector('dialog')"),true);assert.equal(await evaluate('window.refreshes>0'),true);checks++;
    await evaluate('window.actionDelay=0;window.failAction=true;window.resetFixture(true)');await sleep(100);
    await click('Nonaktifkan');await click('Konfirmasi & Simpan');
    assert.equal(await evaluate("document.querySelector('[role=alert]').textContent.includes('sudah berubah')"),true);
    assert.equal(await evaluate("document.querySelector('dialog').open"),true);checks++;
    await click('Batal');
    await evaluate('window.resetFixture(false,true)');await sleep(100);
    await click('Tambah Staff dari Akun');assert.equal(await evaluate("document.querySelector('dialog').open"),true);checks++;
    await click('Batal');
    await evaluate('window.resetFixture(true);window.failAction=false;window.redirectAction=true');await sleep(100);
    await click('Nonaktifkan');await click('Konfirmasi & Simpan');
    for(let i=0;i<30;i++){if(await evaluate('window.frameworkErrors.length>0'))break;await sleep(50);}
    assert.equal(await evaluate('window.frameworkErrors[0]'),'NEXT_REDIRECT;push;/admin;303;','Component catch must pass redirect control flow through the real Next browser rethrow helper');checks++;
    console.log(`PASS: ${checks} browser scenarios with real staff components and built CSS: 375/768/1366/1440, light/dark, pagination, sole-super guard, dialog geometry, Tab/Shift+Tab/Escape/focus restoration, provision warning/confirmation, double-submit/busy dismissal, stale-error feedback, empty-state provision, NEXT_REDIRECT not swallowed. Actions mocked; Next browser rethrow helper is real; no production requests.`);
  } finally {
    if(socket?.readyState===WebSocket.OPEN) socket.send(JSON.stringify({id:999999,method:'Browser.close'}));
    await sleep(200);
    socket?.close();browser.kill();server.close();
    // Edge may still be releasing its profile files on Windows. Cleanup is best effort.
    await sleep(400);
    try { fs.rmSync(userData,{recursive:true,force:true}); } catch { /* temp only */ }
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
