/* eslint-disable @typescript-eslint/no-require-imports -- Real Services/PortfolioImage components, real server HTML and built-app smoke; transport/navigation boundaries only. */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const http=require('node:http');const {spawn}=require('node:child_process');const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
module.exports=async function browserChecks(base,equal,html){
  const cssRoot=path.join(root,'.next/static');const css=fs.readdirSync(cssRoot,{recursive:true}).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(cssRoot,f),'utf8')).join('\n');
  const bundle=await esbuild.build({stdin:{resolveDir:root,loader:'jsx',contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {NextIntlClientProvider} from 'next-intl';
    import Services from './app/(public)/[locale]/(site)/services/ServicesClient';import PortfolioImage from './components/ui/PortfolioImage';
    import id from './messages/id/services.json';import en from './messages/en/services.json';import zh from './messages/zh-CN/services.json';
    const catalogs={id,en,'zh-CN':zh};const app=createRoot(document.getElementById('app'));let key=0;window.locale='id';window.html=${JSON.stringify(html)};
    window.render=(locale='id',mode='services',number='628123456789')=>{window.locale=locale;document.documentElement.lang=locale;flushSync(()=>app.render(mode==='services'?<NextIntlClientProvider key={++key} locale={locale} timeZone='Asia/Jakarta' messages={{services:catalogs[locale]}}><Services waNumber={number}/></NextIntlClientProvider>:mode==='image'?<PortfolioImage key={++key} src='/broken-original.png' alt='ALT CMS ASLI' caption='CAPTION CMS ASLI' failureLabel={(${JSON.stringify({id:'Gambar tidak tersedia.',en:'Image unavailable.','zh-CN':'图片暂不可用。'})})[locale]}/>:<div key={++key} dangerouslySetInnerHTML={{__html:window.html[locale][mode]}}/>))};
    window.render();
  `},bundle:true,write:false,platform:'browser',jsx:'automatic',alias:{'@':root},plugins:[{name:'boundaries',setup(build){
    build.onResolve({filter:/^(next\/image|@\/i18n\/navigation|@\/components\/ui\/ScrollAnimations)$/},args=>({path:args.path,namespace:'fixture'}));
    build.onLoad({filter:/.*/,namespace:'fixture'},args=>({resolveDir:root,loader:'jsx',contents:args.path==='next/image'?"import React from 'react';export default function Image({src,alt,onError,width,height,className}){return <img src={src} alt={alt} onError={onError} width={width} height={height} className={className}/>}"
      :args.path==='@/i18n/navigation'?"import React from 'react';import {localizeHref} from './i18n/locales';export default function Link({href,children,...p}){return <a {...p} href={localizeHref(href,window.locale)}>{children}</a>}"
      :"import React from 'react';export default function Animated({children,className,style}){return <div className={className} style={style}>{children}</div>}"}));
  }}]});
  const server=http.createServer((req,res)=>{if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end(css);}else if(req.url==='/broken-original.png'){res.statusCode=404;res.end();}else if(/^\/images\/compro\/slide-\d+[.]jpg$/.test(req.url)){res.setHeader('Content-Type','image/jpeg');res.end(fs.readFileSync(path.join(root,'public',req.url)));}else res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><main id="app"></main><script src="/fixture.js"></script></body></html>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const parent=path.join(os.tmpdir(),'opencode');assert.ok(fs.existsSync(parent));const profile=fs.mkdtempSync(path.join(parent,'services-research-i18n-'));
  const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run',`--user-data-dir=${profile}`,'--remote-debugging-port=19636','about:blank'],{stdio:'ignore'});let socket;const exceptions=[];
  try{
    let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:19636/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{/* startup */}await sleep(100);}assert.ok(target);socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});let seq=0;const pending=new Map();
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    socket.onmessage=event=>{const d=JSON.parse(event.data);if(d.id){const h=pending.get(d.id);pending.delete(d.id);if(d.error)h.reject(d.error);else h.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')exceptions.push(d.params.exceptionDetails.text);};
    const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const wait=async expression=>{for(let i=0;i<400;i++){try{if(await evaluate(`Boolean(${expression})`))return;}catch{/* navigation */}await sleep(100);}throw Error('Timeout '+expression);};
    const test=async(expression,expected,label)=>equal(await evaluate(expression),expected,label);
    await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
    for(const width of [375,768,1024,1280,1366])for(const [locale,prefix]of [['id',''],['en','/en'],['zh-CN','/zh-cn']])for(const [route,namespace]of [['/services','services'],['/distributors','distribution'],['/research-partnership','research']]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});await cdp('Page.navigate',{url:base+prefix+route});
      const catalog=require(path.join(root,'messages',locale,namespace+'.json'));await wait(`document.documentElement.lang==='${locale}'&&document.title===${JSON.stringify(catalog.metadata.title)}&&document.querySelector('main h1')`);await sleep(150);
      await test('document.documentElement.scrollWidth<=innerWidth',true,'Built page no overflow '+width+'/'+locale+route);
      await test(`document.body.textContent.includes(${JSON.stringify(namespace==='services'?catalog.ui.hero.badge:catalog.hero.title)})`,true,'Built static presentation localized');
      await test("document.querySelector('link[rel=canonical]').href.replace(/\\/$/,'')",'https://autentik-web.vercel.app'+prefix+route,'Self canonical unchanged');
      for(const lang of ['id','en','zh-CN','x-default'])await test(`document.querySelector('link[hreflang="${lang}"]')!==null`,true,'Reciprocal alternate exists');
    }
    await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}`});await wait('window.render');await cdp('Page.bringToFront');
    const ids=['iot-monitoring','lab-engineering','calibration','water-treatment','platform-integration','consulting'];
    for(const width of [375,768,1024,1280,1366])for(const [locale,prefix]of [['id',''],['en','/en'],['zh-CN','/zh-cn']]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});const services=require(path.join(root,'messages',locale,'services.json')).ui;
      await evaluate(`window.render('${locale}')`);await sleep(70);
      await test('document.documentElement.scrollWidth<=innerWidth',true,'Services fixture natural wrapping');
      for(const [category,expected]of [['iot',['iot-monitoring','platform-integration']],['lab',['lab-engineering','consulting']],['maintenance',['calibration']],['water',['water-treatment']],['all',ids]]){
        await evaluate(`[...document.querySelectorAll('#services-list button')].find(b=>b.textContent===${JSON.stringify(services.categories[category])}).click()`);await sleep(30);
        await test(`[...document.querySelectorAll('#services-list [id]')].map(e=>e.id)`,expected,'Untranslated category IDs drive filter');
      }
      for(const id of ids)await test(`document.getElementById('${id}').querySelectorAll('[class~="space-y-2.5"] > div').length`,4,'Four highlights retained');
      await test("document.querySelectorAll('button[aria-controls^=service-faq-]').length",4,'Four FAQs retained');
      await test("document.querySelector('button[aria-controls=service-faq-calibration]').getAttribute('aria-expanded')",'true','Initial FAQ index unchanged');
      await evaluate("document.querySelector('button[aria-controls=service-faq-system]').click()");await sleep(30);
      await test("document.getElementById('service-faq-system')!==null&&document.getElementById('service-faq-calibration')===null",true,'Accordion remains single-open');
      await evaluate("document.querySelector('button[aria-controls=service-faq-system]').click()");await sleep(30);await test("document.querySelectorAll('[id^=service-faq-]').length",0,'Accordion closes');
      for(const href of ['/store','/custom-request'])await test(`document.querySelector('a[href="${prefix}${href}"]')!==null`,true,'Fulfillment locale route');
      const wa=await evaluate("[...document.querySelectorAll('a')].find(a=>a.href.startsWith('https://wa.me/')).href");equal(new URL(wa).pathname,'/628123456789','WA destination stable');equal(new URL(wa).searchParams.get('text'),services.fulfillment.whatsapp,'Decoded localized WA text');
      await evaluate(`window.render('${locale}','services',null)`);await sleep(30);
      await test(`document.querySelector('a[target=_blank]').getAttribute('href')`,prefix+'/contact','Missing WA contact retains locale-aware fallback and target');
      for(const mode of ['distribution','research']){
        await evaluate(`window.render('${locale}','${mode}')`);await sleep(40);await test('document.documentElement.scrollWidth<=innerWidth',true,'Mixed-language entity fixture no overflow');
        if(mode==='research'){
          await test("document.querySelectorAll('figure').length",1,'Shared Cylab/Ullun certificate dedup');await test("document.querySelector('img').getAttribute('alt')",'ALT ASLI','CMS alt unchanged');await test("document.querySelector('figcaption').textContent",'CAPTION ASLI','CMS caption unchanged');
          await evaluate("document.querySelector('details summary').click()");await test("document.querySelector('details').open",true,'Disclosure toggles');
          if(width===375&&locale==='zh-CN'){const shot=await cdp('Page.captureScreenshot',{format:'png'});const file=path.join(profile,'research-375-chinese-mixed.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));console.log('Screenshot:',file);}
        }else await test("[...document.querySelectorAll('h3')].filter(e=>e.textContent==='Jawa Tengah').length",1,'Regional first label remains original');
      }
      await evaluate(`window.render('${locale}','image')`);await wait('document.querySelector("figure [role=status]")');
      await test("document.querySelector('figure [role=status]').textContent",require(path.join(root,'messages',locale,'research.json')).imageUnavailable,'Localized image failure');await test("document.querySelector('figcaption').textContent",'CAPTION CMS ASLI','Caption survives image failure');
    }
    equal(exceptions,[],'No browser exceptions');console.log('PASS: 45 built-app page/locale/viewport combinations plus real filter/FAQ/WA/image/disclosure mixed-entity fixtures. No backend writes.');
  }finally{if(socket)socket.close();browser.kill();await new Promise(resolve=>server.close(resolve));}
};
