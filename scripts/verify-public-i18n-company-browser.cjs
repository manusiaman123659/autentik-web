/* eslint-disable @typescript-eslint/no-require-imports -- Built-app marketing smoke + real viewer UI with controlled PDF transport; no backend writes. */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const http=require('node:http');
const {spawn}=require('node:child_process');const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

module.exports=async function companyBrowser(base,equal){
  const cssRoot=path.join(root,'.next/static');
  const css=fs.readdirSync(cssRoot,{recursive:true}).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(cssRoot,f),'utf8')).join('\n');
  const bundle=await esbuild.build({stdin:{resolveDir:root,loader:'jsx',contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {NextIntlClientProvider} from 'next-intl';
    import Viewer from './components/ui/CompanyProfileViewer';import id from './messages/id/documents.json';import en from './messages/en/documents.json';import zh from './messages/zh-CN/documents.json';
    const app=createRoot(document.getElementById('app'));const messages={id,en,'zh-CN':zh};let version=0;window.mode='fallback';window.locale='id';
    window.renderViewer=(locale='id',mode='fallback',remount=true)=>{window.locale=locale;window.mode=mode;document.documentElement.lang=locale;if(remount)version++;
      const manifest={title:'MANIFEST ASLI',pdfFilename:'original.pdf',...(mode==='fallback'?{}:{pdfUrl:'/fixture-doc.pdf'})};
      flushSync(()=>app.render(<NextIntlClientProvider locale={locale} timeZone='Asia/Jakarta' messages={{documents:messages[locale]}}><Viewer key={version} manifest={manifest}/></NextIntlClientProvider>))};
    window.renderViewer();
  `},bundle:true,write:false,platform:'browser',jsx:'automatic',alias:{'@':root},logLevel:'silent',plugins:[{name:'fixture',setup(build){
    build.onResolve({filter:/^(next\/image|pdfjs-dist)$/},args=>({path:args.path,namespace:'fixture'}));
    build.onLoad({filter:/.*/,namespace:'fixture'},args=>({resolveDir:root,loader:'jsx',contents:args.path==='next/image'
      ?"import React from 'react';export default function Image({fill,priority,sizes,onLoad,className,...p}){return <img {...p} onLoad={onLoad} className={className} style={{width:'100%',height:'100%',objectFit:'contain'}}/>}"
      :`export const GlobalWorkerOptions={workerSrc:'fixture-worker'};export const getDocument=()=>({promise:window.mode==='loading'?new Promise(()=>{}):window.mode==='error'?Promise.reject(Error('Controlled transport failure')):new Promise(resolve=>setTimeout(()=>resolve({numPages:2,cleanup:async()=>{},getPage:async()=>({getViewport:({scale})=>({width:800*scale,height:450*scale}),render:({canvasContext,viewport})=>{canvasContext.fillStyle='#eee';canvasContext.fillRect(0,0,viewport.width,viewport.height);canvasContext.fillStyle='#0B1F3A';canvasContext.font='20px sans-serif';canvasContext.fillText('ORIGINAL PDF CONTENT',20,30);return {promise:Promise.resolve(),cancel:()=>{}}}})}),200))});`
    }));
  }}]});
  const fixture=http.createServer((req,res)=>{
    if(req.url==='/viewer.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}
    else if(req.url==='/viewer.css'){res.setHeader('Content-Type','text/css');res.end(css);}
    else if(/^\/images\/compro\/slide-\d+[.]jpg$/.test(req.url)){res.setHeader('Content-Type','image/jpeg');res.end(fs.readFileSync(path.join(root,'public',req.url)));}
    else res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/viewer.css"></head><body><main id="app" class="mx-auto max-w-5xl p-4"></main><script src="/viewer.js"></script></body></html>');
  });
  await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));
  const parent=path.join(os.tmpdir(),'opencode');assert.ok(fs.existsSync(parent));const profile=fs.mkdtempSync(path.join(parent,'company-i18n-'));
  const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run',`--user-data-dir=${profile}`,'--remote-debugging-port=19633','about:blank'],{stdio:'ignore'});
  let socket;const errors=[];
  try{
    let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:19633/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{/* startup */}await sleep(100);}assert.ok(target);
    socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});const pending=new Map();let seq=0;
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    socket.onmessage=event=>{const d=JSON.parse(event.data);if(d.id){const h=pending.get(d.id);pending.delete(d.id);if(d.error)h.reject(d.error);else h.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);};
    const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const wait=async expression=>{for(let i=0;i<400;i++){try{if(await evaluate(`Boolean(${expression})`))return;}catch{/* navigation */}await sleep(100);}throw Error('Timeout: '+expression+' '+JSON.stringify(await evaluate("({url:location.href,enabled:document.fullscreenEnabled,focus:document.hasFocus(),activation:navigator.userActivation.isActive,errors:window.fullscreenFailures})")));};
    const test=async(expression,expected,label)=>equal(await evaluate(expression),expected,label);
    const key=async(name,code,vk)=>{await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:name,code,windowsVirtualKeyCode:vk});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:name,code,windowsVirtualKeyCode:vk});};
    await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
    let heroName,heroDescription;
    for(const width of [375,768,1024,1280,1366])for(const [locale,prefix]of [['id',''],['en','/en'],['zh-CN','/zh-cn']])for(const page of ['','/about']){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});
      await cdp('Page.navigate',{url:base+prefix+(page||(!prefix?'/':''))});
      const expectedTitle=require(path.join(root,'messages',locale,page?'company.json':'home.json')).metadata.title;
      await wait(`document.documentElement.lang==='${locale}'&&document.title===${JSON.stringify(expectedTitle)}&&document.querySelector('footer')&&document.querySelector('main h1')`);await sleep(200);
      await test('document.documentElement.scrollWidth<=innerWidth',true,'Marketing page no horizontal overflow '+width+'/'+locale+page);
      if(!page){
        if(heroName===undefined){heroName=await evaluate("document.querySelector('main h1').textContent.trim()");heroDescription=await evaluate("document.querySelector('main h1').nextElementSibling.textContent.trim()");}
        await test("document.querySelector('main h1').textContent.trim()",heroName,'Product hero identity remains original');
        await test("document.querySelector('main h1').nextElementSibling.textContent.trim()",heroDescription,'Product description remains original');
        const home=require(path.join(root,'messages',locale,'home.json'));
        await test(`document.body.textContent.includes(${JSON.stringify(home.aboutUs.eyebrow)})`,true,'Static Home translated');
        await test(`document.body.textContent.includes(${JSON.stringify(home.hero.viewProduct)})`,true,'Hero CTA translated');
      }else{
        const company=require(path.join(root,'messages',locale,'company.json'));
        await test(`document.body.textContent.includes(${JSON.stringify(company.about.vision)})`,true,'Selected vision');
        for(const other of ['id','en','zh-CN'].filter(value=>value!==locale))await test(`document.body.textContent.includes(${JSON.stringify(require(path.join(root,'messages',other,'company.json')).about.vision)})`,false,'No dual vision');
        if(width===375&&locale==='zh-CN'){await evaluate("document.querySelector('h1').scrollIntoView({block:'start'})");const shot=await cdp('Page.captureScreenshot',{format:'png'});const file=path.join(profile,'about-375-chinese.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));console.log('Screenshot:',file);}
      }
      const company=require(path.join(root,'messages',locale,'company.json'));
      await test(`document.querySelector('footer').textContent.includes(${JSON.stringify(company.footer.rights)})`,true,'Footer localized');
      await test("document.querySelector('footer').textContent.includes('autentik.info@gmail.com')",true,'Contact identity unchanged');
    }
    await cdp('Page.navigate',{url:`http://127.0.0.1:${fixture.address().port}`});await wait('window.renderViewer');await cdp('Page.bringToFront');
    await evaluate("window.fullscreenFailures=[];const request=document.documentElement.requestFullscreen.bind(document.documentElement);document.documentElement.requestFullscreen=(...args)=>request(...args).catch(e=>{window.fullscreenFailures.push(e.message);throw e})");
    for(const width of [375,768,1024,1280,1366])for(const locale of ['id','en','zh-CN']){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});
      const t=require(path.join(root,'messages',locale,'documents.json')).viewer;
      await evaluate(`window.renderViewer('${locale}','fallback')`);await sleep(80);
      await test('document.documentElement.scrollWidth<=innerWidth',true,'Viewer embed no overflow');
      await test("document.body.textContent.includes('MANIFEST ASLI')",true,'Manifest title unchanged');
      await test("document.querySelector('a[download]').getAttribute('href')",'/images/compro/COMPRO-AKA-2026.pdf','Fallback PDF unchanged');
      await test(`document.querySelector('button[aria-label=${JSON.stringify(t.next)}]')!==null`,true,'Localized next control');
      await key('ArrowRight','ArrowRight',39);await test("document.querySelector('img').getAttribute('src')",'/images/compro/slide-2.jpg','Keyboard/slide identity unchanged');
      await evaluate(`document.querySelector('button[aria-label=${JSON.stringify(t.fullscreen)}]').click()`);await wait('document.fullscreenElement');
      await test('document.documentElement.scrollWidth<=innerWidth',true,'Viewer fullscreen no overflow');
      await test("[...document.querySelectorAll('.fixed.bottom-6 button')].every(button=>{const r=button.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})",true,'Fullscreen toolbar controls stay on-screen');
      await key('g','KeyG',71);
      await test(`document.querySelector('button[aria-label=${JSON.stringify(t.goToPage.replace('{page}','1'))}]')!==null`,true,'Localized thumbnail buttons');
      await key('g','KeyG',71);await key('Escape','Escape',27);await wait('!document.fullscreenElement');
    }
    await evaluate("window.renderViewer('en','loading')");await sleep(100);
    await test("document.body.textContent.includes('Loading document…')",true,'PDF loading localizes');
    await evaluate("window.renderViewer('id','error')");await wait("document.body.textContent.includes('Gagal memuat file PDF.')");
    await evaluate("window.renderViewer('zh-CN','error',false)");
    await test("document.body.textContent.includes('无法加载 PDF 文件。')",true,'Existing error responds to locale change');
    await test("document.body.textContent.includes('Gagal memuat file PDF.')",false,'No old translated error sentence');
    await test("document.querySelector('a[download]').getAttribute('href')",'/fixture-doc.pdf','Error download uses original PDF');
    await test("document.querySelector('a[download]').getAttribute('download')",'original.pdf','Filename unchanged');
    await evaluate("window.renderViewer('en','ready')");await wait("document.querySelector('canvas')&&document.querySelector('canvas').width>0");
    await test("document.body.textContent.includes('MANIFEST ASLI')",true,'PDF title stays original');
    await evaluate("document.querySelector('button[aria-label=Fullscreen]').click()");await wait('document.fullscreenElement');
    await evaluate("document.querySelector('button[aria-label=\"Zoom in\"]').click()");
    await test("document.body.textContent.includes('125%')",true,'Zoom behavior unchanged');
    await key('Escape','Escape',27);await wait('!document.fullscreenElement');
    equal(errors,[],'No browser exceptions');
    console.log('PASS: real built Home/About/Footer responsive smoke + controlled viewer loading/error/canvas/navigation/fullscreen checks. PDF transport mocked; no authenticated writes.');
  }finally{if(socket)socket.close();browser.kill();await new Promise(resolve=>fixture.close(resolve));}
};
