/* eslint-disable @typescript-eslint/no-require-imports -- Actual Admin list; mutations are forbidden in fixture and live smoke. */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const http=require('node:http');const {spawn}=require('node:child_process');const esbuild=require('esbuild');const {connection}=require('./verify-product-translation-editor-browser.cjs');
const root=path.resolve(__dirname,'..');const sleep=ms=>new Promise(r=>setTimeout(r,ms));let checks=0;
const testFor=d=>async(expression,expected,label)=>{assert.deepEqual(await d.evaluate(expression),expected,label);checks++};
async function fixtures(){
  const bundle=await esbuild.build({stdin:{resolveDir:root,loader:'jsx',contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import List from './components/admin/SparepartListClient';import {TableShell,Th,Td} from './components/admin/ui';import {ToastProvider} from './components/admin/Toast';
    const base={product_type:'sparepart',slug:'fixture',brand:'QA BRAND',category:'QA CATEGORY',description:'QA',image_url:null,status:'published',is_active:true,deleted_at:null,low_stock_threshold:5};
    window.products=Array.from({length:11},(_,i)=>({...base,id:'fixture-'+i,name:i===0?'FC-BPT10-30P/IMT-BB-STJ CEILING DUCT PLASTIC TYPE BPT/12/300/1100RPM/36W/220V':i===1?'UNBROKENPRODUCTNAME'.repeat(25):'Komponen '+i,sku:i===0?'SP-PAS-003':i===1?'SKU-'.repeat(35)+'END':'SP-QA-'+i,brand:i===1?'MEREK PANJANG '.repeat(15):'QA BRAND',price:i===1?999999999999:1739000,stock:i===0?6500:i===2?20:i===3?0:35,status:i===2?'draft':'published'}));
    window.products.push({...base,id:'archived-1',name:'NAMA PRODUK DIARSIPKAN '.repeat(12),sku:'SP-ARCH-001',price:1739000,stock:20,deleted_at:'2026-01-01T00:00:00Z'},{...base,id:'archived-2',name:'Arsip pendek',sku:'SP-ARCH-002',price:null,stock:0,status:'draft',deleted_at:'2026-01-01T00:00:00Z'});
    window.original=JSON.stringify(window.products);window.mutations=0;window.paths=[];window.errors=[];window.addEventListener('error',e=>window.errors.push(e.message));window.addEventListener('unhandledrejection',()=>window.errors.push('Unhandled rejection'));
    const app=createRoot(document.getElementById('app'));let key=0;
    window.renderCase=(collapsed=false,dark=true)=>{document.documentElement.classList.toggle('dark',dark);flushSync(()=>app.render(<ToastProvider key={++key}><div className='min-h-screen flex bg-slate-100 dark:bg-slate-950'><aside className='hidden lg:block shrink-0 bg-[#0B1F3A]' style={{width:collapsed?72:256}}/><main className='flex-1 min-w-0 p-4 sm:p-6 lg:p-8'><div className='max-w-6xl'><List products={window.products}/></div></main></div></ToastProvider>))};
    window.renderGeneric=()=>flushSync(()=>app.render(<TableShell><thead><tr><Th>Default</Th></tr></thead><tbody><tr><Td>Default cell</Td></tr></tbody></TableShell>));window.renderCase();
  `},bundle:true,write:false,platform:'browser',jsx:'automatic',alias:{'@':root},plugins:[{name:'boundaries',setup(build){build.onResolve({filter:/^(next\/link|next\/navigation|@\/lib\/actions\/products)$/},args=>({path:args.path,namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},args=>({resolveDir:root,loader:'jsx',contents:{
    'next/link':"import React from 'react';export default function Link({href,...props}){return <a {...props} href={href} onClick={e=>{props.onClick?.(e);e.preventDefault();window.paths.push(href)}}/>} ",
    'next/navigation':'export const useRouter=()=>({push:p=>window.paths.push(p),refresh:()=>{}});',
    '@/lib/actions/products':'const forbidden=async()=>{window.mutations++;throw Error("Mutation forbidden in presentation QA")};export const deleteProduct=forbidden;export const restoreProduct=forbidden;'
  }[args.path]}))}}]});
  const css=fs.readdirSync(path.join(root,'.next/static'),{recursive:true}).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(root,'.next/static',f),'utf8')).join('\n');
  const server=http.createServer((req,res)=>{if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text)}else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end(css)}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="app"></div><script src="/fixture.js"></script></body></html>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const parent=path.join(os.tmpdir(),'opencode');assert.ok(fs.existsSync(parent));const profile=fs.mkdtempSync(path.join(parent,'komponen-list-ui-'));const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run','--remote-debugging-port=19661','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});let d;
  try{for(let i=0;i<100;i++){try{d=await connection(19661);break}catch{await sleep(100)}}assert.ok(d);const{cdp,evaluate,wait,fill}=d;const test=testFor(d);await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});await wait('window.renderCase');
    for(const width of [375,768,1024,1280,1366,1440,1536])for(const collapsed of [false,true])for(const dark of [true,false]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate(`window.renderCase(${collapsed},${dark})`);await sleep(80);const context=width+'/'+collapsed+'/'+dark;
      await test('getComputedStyle(document.querySelector("table")).tableLayout','fixed',context+' Fixed layout');
      await test('document.documentElement.scrollWidth<=innerWidth',true,context+' Page not horizontally overflowing');
      await test('document.querySelector("table").getBoundingClientRect().width>=1024',true,context+' Table minimum width');
      await test('(()=>{const t=document.querySelector("table"),s=t.parentElement;return Math.abs(t.getBoundingClientRect().width-Math.max(1024,s.clientWidth))<3})()',true,context+' Names cannot expand table beyond width budget');
      await test('document.querySelector("table").parentElement.tabIndex',0,context+' Scroll region keyboard focus');await test('document.querySelector("table").parentElement.getAttribute("aria-label")','Katalog Komponen',context+' Scroll region label');
      await test('(()=>{const cells=document.querySelector("tbody tr").cells;return [...cells].slice(1).map(e=>Math.round(e.getBoundingClientRect().width))})()',[128,160,128,128,240],context+' Identifier/numeric/action allocations');
      await test('(()=>{const c=document.querySelector("tbody tr").cells[1];return c.textContent.trim()==="SP-PAS-003"&&getComputedStyle(c.querySelector("span")||c).whiteSpace==="nowrap"})()',true,context+' Normal SKU single line');
      await test('(()=>{const c=document.querySelector("tbody tr").cells[2],e=c.querySelector("span")||c;return c.textContent.trim().includes("1.739.000")&&getComputedStyle(e).whiteSpace==="nowrap"&&e.scrollWidth<=e.clientWidth+1})()',true,context+' Normal price fully readable');
      await test('document.querySelector("tbody tr").cells[3].textContent.trim()','6500 pcs',context+' Stock unchanged');await test('document.querySelector("tbody tr").cells[4].textContent.trim()','Tayang',context+' Status unchanged');
      await test('(()=>{const table=document.querySelector("table");return [...table.querySelectorAll("tbody tr")].every(r=>{const cell=r.cells[5].getBoundingClientRect(),controls=[...r.cells[5].querySelectorAll("a,button")].map(e=>e.getBoundingClientRect());return controls.every(e=>e.left>=cell.left&&e.right<=cell.right)&&controls.every((a,i)=>controls.every((b,j)=>i===j||a.right<=b.left||b.right<=a.left));})})()',true,context+' Actions inside columns, not overlapping');
      const originalWidth=await evaluate('document.querySelector("tbody tr").cells[0].getBoundingClientRect().width');await evaluate('document.querySelector("tbody tr a").focus()');await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await sleep(30);
      await test('(()=>{const e=document.querySelector("tbody tr a");return e.title===window.products[0].name&&e.textContent===window.products[0].name})()',true,context+' Full name preserved/discoverable');
      await test('(()=>{const e=document.querySelector("tbody tr a");e.focus();return getComputedStyle(e).webkitLineClamp==="none"||getComputedStyle(e).webkitLineClamp==="unset"})()',true,context+' Focus reveals full name');await test('document.querySelector("tbody tr").cells[0].getBoundingClientRect().width',originalWidth,context+' Focus cannot change columns');
      await test('document.querySelector("tbody tr td:last-child a").getAttribute("aria-label").includes(window.products[0].name)',true,context+' Contextual Edit label');await test('document.querySelector("tbody tr td:last-child button").getAttribute("aria-label").includes(window.products[0].name)',true,context+' Contextual Archive label');
      for(const selector of ['table','tbody tr td:last-child a','tbody tr td:last-child button']){
        const target=selector==='table'?'document.querySelector("table").parentElement':`document.querySelector('${selector}')`;
        await evaluate(`${target}.focus()`);await sleep(450);
        await test(`(()=>{const e=${target};const r=e.getBoundingClientRect(),s=document.querySelector('table').parentElement.getBoundingClientRect();return document.activeElement===e&&parseFloat(getComputedStyle(e).outlineWidth)>0&&r.left>=s.left-1&&r.right<=s.right+1})()`,true,context+' Keyboard focus visible and scrolled into view '+selector);
      }
      await test('(()=>{const row=document.querySelectorAll("tbody tr")[1],e=row.cells[1].querySelector("span");e.focus();const box=e.getBoundingClientRect(),price=row.cells[2].getBoundingClientRect();return e.title===window.products[1].sku&&e.textContent===window.products[1].sku&&e.scrollWidth>e.clientWidth&&getComputedStyle(e).overflowX==="auto"&&box.right<=price.left})()',true,context+' Long SKU discoverable without price overlap');
      await test('(()=>{const e=document.querySelectorAll("tbody tr")[1].cells[2].querySelector("span"),css=getComputedStyle(e);return css.textOverflow!=="ellipsis"&&css.whiteSpace==="nowrap"&&css.overflowX==="auto"&&e.textContent.includes("999.999.999.999")})()',true,context+' Large price not ellipsized');
      await test('document.querySelectorAll("tbody tr")[2].cells[3].textContent.trim()','20 pcs',context+' Normal stock readable');await test('document.querySelectorAll("tbody tr")[3].cells[3].textContent.trim()','Habis',context+' Zero stock unchanged');
      await test('document.querySelectorAll("tbody tr").length',8,context+' Pagination page size preserved');await fill('input[placeholder]', 'SP-PAS-003');await sleep(50);await test('document.querySelectorAll("tbody tr").length',1,context+' SKU filter preserved');await fill('input[placeholder]','');await sleep(50);
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Diarsipkan')).click()");await sleep(50);await test('document.querySelectorAll("tbody tr").length',2,context+' Archived filter preserved');
      await test('document.querySelector("tbody tr td:last-child button").getAttribute("aria-label").includes("NAMA PRODUK DIARSIPKAN")',true,context+' Restore contextual accessible');
      await test('(()=>{const e=document.querySelector("tbody tr td:last-child button");e.focus();return document.activeElement===e&&parseFloat(getComputedStyle(e).outlineWidth)>0})()',true,context+' Restore visible keyboard focus');
      await test('(()=>{const e=document.querySelector("tbody tr td:first-child [tabindex]");if(!e)return false;e.focus();return e.title===window.products[11].name&&getComputedStyle(e).webkitLineClamp==="none"})()',true,context+' Archived full name keyboard reveal');
    }
    await evaluate('window.renderGeneric()');await test('getComputedStyle(document.querySelector("table")).tableLayout','auto','Default shared table behavior unchanged');await test('document.querySelector("table").parentElement.hasAttribute("tabindex")',false,'Other tables opt out by default');
    await test('window.mutations',0,'No archive/restore invocation');await test('JSON.stringify(window.products)===window.original',true,'Read-only Product props unchanged');await test('window.errors',[],'No browser errors');console.log(`PASS: ${checks} Komponen table geometry/identifier/actions/focus/filter checks across 28 viewport/sidebar/theme combinations; no mutations.`);
  }finally{d?.socket.close();browser.kill();await new Promise(r=>server.close(r))}
}
async function liveSmoke(){
  const targets=await(await fetch('http://127.0.0.1:19657/json/list')).json();
  const target=targets.find(t=>t.type==='page'&&new URL(t.url).pathname==='/admin/sparepart');
  assert.ok(target,'Open the authenticated /admin/sparepart page manually. Smoke does not navigate, log in, or mutate records.');
  const d=await connection(19657,target.id);const{cdp,evaluate,wait}=d;const test=testFor(d);const results=[];
  try{
    await wait('document.querySelector("main table") && getComputedStyle(document.querySelector("main table")).tableLayout==="fixed"');
    const before=await evaluate('JSON.stringify([...document.querySelectorAll("main tbody tr")].map(r=>({text:r.textContent,links:[...r.querySelectorAll("a")].map(a=>a.getAttribute("href"))})))');
    for(const width of [375,768,1024,1280,1366,1440,1536]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await sleep(100);
      await test('document.documentElement.scrollWidth<=innerWidth',true,'Live page contained '+width);
      await test('JSON.stringify([...document.querySelectorAll("main tbody tr")].map(r=>({text:r.textContent,links:[...r.querySelectorAll("a")].map(a=>a.getAttribute("href"))})))',before,'Read-only values/links unchanged '+width);
      const geometry=await evaluate('(()=>{const t=document.querySelector("main table"),s=t.parentElement;return{viewport:innerWidth,table:Math.round(t.getBoundingClientRect().width),scrollClient:s.clientWidth,scrollContent:s.scrollWidth,layout:getComputedStyle(t).tableLayout,columns:[...t.querySelector("tbody tr").cells].slice(1).map(c=>Math.round(c.getBoundingClientRect().width)),scrollFocusable:s.tabIndex===0,scrollLabel:s.getAttribute("aria-label")}})()');
      assert.deepEqual(geometry.columns,[128,160,128,128,240]);checks++;assert.equal(geometry.scrollFocusable,true);checks++;assert.equal(geometry.scrollLabel,'Katalog Komponen');checks++;
      await evaluate('document.querySelector("main tbody tr td:last-child button").focus()');await sleep(50);
      await test('(()=>{const e=document.activeElement,s=document.querySelector("main table").parentElement.getBoundingClientRect(),r=e.getBoundingClientRect();return e.tagName==="BUTTON"&&r.left>=s.left-1&&r.right<=s.right+1})()',true,'Live actions reachable via focus '+width);
      results.push(geometry);
    }
    console.log(JSON.stringify({status:'passed',checks,readOnly:true,productMutations:0,viewports:results},null,2));
  }finally{
    await cdp('Emulation.clearDeviceMetricsOverride');await evaluate('document.querySelector("main table").parentElement.scrollLeft=0');d.socket.close();
  }
}
(process.argv.includes('--live')?liveSmoke():fixtures()).catch(e=>{console.error(e.message);process.exitCode=1});
