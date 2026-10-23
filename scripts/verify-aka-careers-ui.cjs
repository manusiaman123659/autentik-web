/* eslint-disable @typescript-eslint/no-require-imports -- Browser fixture for real Careers presentation. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const http=require('node:http');
const {spawn}=require('node:child_process');const esbuild=require('esbuild');const ReactDOMServer=require('react-dom/server');
const React=require('react');const {NextIntlClientProvider}=require('next-intl');
const {harness,aka,foreign}=require('./verify-aka-careers.cjs');
const root=path.resolve(__dirname,'..');const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  const cssRoot=path.join(root,'.next/static');
  const css=fs.readdirSync(cssRoot,{recursive:true}).filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(path.join(cssRoot,name),'utf8')).join('\n');
  assert.ok(css.length,'Run npm run build first');
  const jobs=[aka(42),aka(73),aka(99)].map(job=>({...job,company:{...job.company,logo:null}}));
  const presentation=node=>React.createElement(NextIntlClientProvider,{locale:'id',timeZone:'Asia/Jakarta',messages:{common:require('../messages/id/common.json'),navigation:require('../messages/id/navigation.json'),careers:require('../messages/id/careers.json')}},node);
  const detailHarness=harness({jobs:[jobs[0]],related:[jobs[1]],realPresentation:true});
  const detailHtml=ReactDOMServer.renderToStaticMarkup(presentation(await detailHarness.load('@/app/(site)/careers/[slug]/page').default({params:Promise.resolve({slug:'42'})})));
  const attackDescription='</script><script>window.__aka_xss=1</script><p onclick="window.__aka_xss=1">Klik</p><img src=x onerror="window.__aka_xss=1"><a href="javascript:window.__aka_xss=1" target="_blank">Lamar</a><iframe src="https://evil.example/"></iframe><svg onload="window.__aka_xss=1"></svg>';
  const attackHarness=harness({jobs:[{...jobs[0],description:attackDescription}],realPresentation:true});
  const attackHtml=ReactDOMServer.renderToStaticMarkup(presentation(await attackHarness.load('@/app/(site)/careers/[slug]/page').default({params:Promise.resolve({slug:'42'})})));
  const homePresentation=harness({realPresentation:true}).load('@/components/home/HomeCareers').default;
  const homeEmptyHtml=ReactDOMServer.renderToStaticMarkup(await homePresentation({items:[],available:true}));
  const homeUnavailableHtml=ReactDOMServer.renderToStaticMarkup(await homePresentation({items:[],available:false}));
  const apiHarness=harness({jobs:[foreign(5,1),jobs[0],foreign(3,3)],ignoreScope:true});
  const route=apiHarness.load('@/app/api/careers/jobs/route');
  const unavailableRoute=harness({unavailable:true}).load('@/app/api/careers/jobs/route');
  const bundle=await esbuild.build({stdin:{resolveDir:root,loader:'jsx',contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';
     import CareersClient from './app/(public)/[locale]/(site)/careers/CareersClient';
     import {NextIntlClientProvider} from 'next-intl';
      import common from './messages/id/common.json';import navigation from './messages/id/navigation.json';
      import careers from './messages/id/careers.json';
     import SearchModal from './components/layout/SearchModal';
    const root=createRoot(document.getElementById('app'));const jobs=${JSON.stringify(jobs)};let key=0;
    window.renderCase=(mode)=>{const data=mode==='multiple'?jobs:mode==='one'?[jobs[0]]:[];const available=mode!=='unavailable';
      const meta={current_page:1,per_page:10,total_items:data.length,total_pages:1,has_next:false,has_prev:false};
      if(mode==='detail')root.render(<div key={++key} dangerouslySetInnerHTML={{__html:${JSON.stringify(detailHtml)}}}/>);
      else if(mode==='html-attack')root.render(<div key={++key} dangerouslySetInnerHTML={{__html:${JSON.stringify(attackHtml)}}}/>);
       else if(mode==='home-empty'||mode==='home-unavailable')root.render(<div key={++key} dangerouslySetInnerHTML={{__html:mode==='home-empty'?${JSON.stringify(homeEmptyHtml)}:${JSON.stringify(homeUnavailableHtml)}}}/>);
       else if(mode==='search')root.render(<NextIntlClientProvider locale='id' messages={{common,navigation}}><SearchModal key={++key} isOpen={true} onClose={()=>{}}/></NextIntlClientProvider>);
       else root.render(<NextIntlClientProvider locale='id' timeZone='Asia/Jakarta' messages={{common,navigation,careers}}><CareersClient key={++key} initialJobs={data} initialMeta={meta} departments={[jobs[0].department]} available={available} recruitmentUrl='https://recruitment.tekna.id/'/></NextIntlClientProvider>);
    };window.renderCase('one');
  `},bundle:true,write:false,platform:'browser',jsx:'automatic',alias:{'@':root},plugins:[{name:'boundaries',setup(build){
     build.onResolve({filter:/^(next\/link|next\/navigation|@\/i18n\/navigation|@\/components\/ui\/ScrollAnimations|@\/utils\/supabase\/client)$/},args=>({path:args.path,namespace:'fixture'}));
     build.onLoad({filter:/.*/,namespace:'fixture'},args=>({resolveDir:root,loader:'jsx',contents:(args.path==='next/link'||args.path==='@/i18n/navigation')?"import React from 'react';export default function Link(props){return <a {...props}/>}export const useRouter=()=>({push:()=>{}})":
      args.path==='next/navigation'?"export const useRouter=()=>({push:()=>{}})":
      args.path==='@/utils/supabase/client'?"export const createClient=()=>({from:table=>{if(table!=='products')throw new Error('LEGACY_CAREERS_READ');const q={select:()=>q,eq:()=>q,is:()=>q,order:async()=>({data:[],error:null})};return q}})":
      "import React from 'react';export default function Animated({children,className}){return <div className={className}>{children}</div>}"}));
  }}]});
  const server=http.createServer(async(req,res)=>{
    if(req.url.startsWith('/api/careers/jobs')){
      const nextUrl=new URL(req.url,'http://127.0.0.1');
      const response=await (nextUrl.searchParams.get('search')==='api-unavailable'?unavailableRoute:route).GET({nextUrl});res.statusCode=response.status;res.setHeader('Content-Type','application/json');res.end(await response.text());
    }else if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text)}
    else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end(css)}
    else res.end('<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><main id="app"></main><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const parent=path.join(os.tmpdir(),'opencode');assert.ok(fs.existsSync(parent));const profile=fs.mkdtempSync(path.join(parent,'aka-careers-ui-'));
  const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-port=19463','about:blank'],{stdio:'ignore'});
  let socket;let checks=0;
  try{
    let target;for(let i=0;i<60;i++){try{target=(await(await fetch('http://127.0.0.1:19463/json/list')).json()).find(t=>t.type==='page');if(target)break}catch{/* start */}await delay(100)}assert.ok(target);
    socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
    const pending=new Map();let id=0;
    socket.onmessage=event=>{const message=JSON.parse(event.data);const handler=pending.get(message.id);if(handler){pending.delete(message.id);if(message.error)handler.reject(new Error(JSON.stringify(message.error)));else handler.resolve(message.result)}};
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}))});
    const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value};
    await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}`});
    for(let i=0;i<60;i++){if(await evaluate("typeof window.renderCase==='function'"))break;await delay(100)}
    for(const width of [375,768,1366,1440]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
      for(const mode of ['one','multiple','empty','unavailable','detail']){
        await evaluate(`window.renderCase(${JSON.stringify(mode)})`);await delay(150);
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Horizontal overflow ${width}/${mode}`);
        assert.equal(await evaluate("document.body.textContent.includes('PT Mitra Karya Analitika')||document.body.textContent.includes('PT Sapujagat Nirmana Tekna')"),false);
        assert.equal(await evaluate("document.querySelector('[aria-label=\"Filter perusahaan\"]')===null"),true);
        const text=await evaluate('document.body.textContent');
        if(mode==='empty')assert.match(text,/Saat ini belum ada lowongan yang tersedia di PT Autentik Karya Analitika\./);
        if(mode==='unavailable')assert.match(text,/Informasi lowongan sedang tidak tersedia\. Silakan coba lagi beberapa saat\./);
        if(mode==='one'||mode==='multiple'){
          assert.equal(await evaluate("[...document.querySelectorAll('a')].filter(a=>a.textContent.trim()==='Detail & Lamar').length"),mode==='one'?1:3);
          assert.match(text,/Rp 6\.000\.000 - Rp 10\.000\.000/);
        }
        if(mode==='detail'){
          assert.match(text,/Portal Rekrutmen/);assert.doesNotMatch(text,/mikacares\.co\.id/);
          assert.equal(await evaluate("[...document.querySelectorAll('a')].some(a=>a.textContent.includes('Lamar Posisi Ini')&&a.href==='https://recruitment.tekna.id/lowongan/42')"),true);
        }
        checks++;
      }
    }
    for(const mode of ['home-empty','home-unavailable']){await evaluate(`window.renderCase('${mode}')`);await delay(100);const text=await evaluate('document.body.textContent');assert.match(text,mode==='home-empty'?/belum ada lowongan/:/sedang tidak tersedia/);checks++;}
    await evaluate("window.renderCase('one')");await delay(100);
    await evaluate("(()=>{const input=document.querySelector('[aria-label=\"Cari lowongan pekerjaan\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'api-unavailable');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
    for(let i=0;i<40;i++){if(await evaluate("document.body.textContent.includes('Lowongan sementara tidak tersedia')"))break;await delay(100)}
    assert.match(await evaluate('document.body.textContent'),/Informasi lowongan sedang tidak tersedia/);
    assert.equal(await evaluate("[...document.querySelectorAll('a')].filter(a=>a.textContent.trim()==='Detail & Lamar').length"),0,'Failed refresh must not retain apparently available cards');checks++;
    await evaluate("window.renderCase('search')");await delay(150);
    await evaluate("(()=>{const input=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'IoT');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
    for(let i=0;i<40;i++){if(await evaluate("document.body.textContent.includes('IoT Engineer 42')"))break;await delay(100)}
    const searchText=await evaluate('document.body.textContent');assert.match(searchText,/IoT Engineer 42/);assert.doesNotMatch(searchText,/Mitra|Sapujagat|UNVERIFIED|LEGACY/);checks++;
    await evaluate("window.renderCase('html-attack')");await delay(300);
    assert.equal(await evaluate('typeof window.__aka_xss'), 'undefined','Description handlers must not execute');
    assert.equal(await evaluate("(()=>{const section=[...document.querySelectorAll('h2')].find(h=>h.textContent==='Deskripsi Pekerjaan').parentElement;return section.querySelectorAll('script,img,svg,iframe,a,style,object,embed,math').length})()"),0,'Description has no active HTML/link elements');
    const attackText=await evaluate('document.body.textContent');
    assert.match(attackText,/Klik\s*Lamar/,'Description text stays readable after HTML conversion');
    assert.ok(!attackText.includes('<p'),'Literal markup tags must never reach rendered text');checks++;
    console.log(`PASS: ${checks} responsive/browser scenarios: 375/768/1366/1440 one/multiple/empty/unavailable/detail, homepage states, failed-refresh clearing, SearchModal, and inert description attack payloads. Real built CSS/components; upstream transport isolated.`);
  }finally{
    if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({id:999999,method:'Browser.close'}));await delay(200);socket?.close();browser.kill();server.close();await delay(300);try{fs.rmSync(profile,{recursive:true,force:true})}catch{/* Windows releases temp files asynchronously */}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1});
