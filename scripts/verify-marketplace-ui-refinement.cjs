/* eslint-disable @typescript-eslint/no-require-imports -- Offline real-component browser fixtures; no application environment or database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const esbuild = require('esbuild');
const sharp = require('sharp');
const { connection } = require('./verify-product-translation-editor-browser.cjs');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;

async function main() {
  const parent = path.join(os.tmpdir(), 'opencode');
  assert.ok(fs.existsSync(parent));
  const output = fs.mkdtempSync(path.join(parent, 'marketplace-ui-'));
  const cssRoot = process.env.MARKETPLACE_QA_BUILD || path.join(parent, 'pt004-runtime-build');
  const cssDir = path.join(cssRoot, '.next/static');
  assert.ok(fs.existsSync(cssDir), 'Run the isolated current-source production build first');
  const css = fs.readdirSync(cssDir, { recursive: true }).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n').replaceAll('../media/', '/_next/static/media/');
  const bundle = await esbuild.build({ stdin: { resolveDir: root, loader: 'jsx', contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
    import {NextIntlClientProvider} from 'next-intl';
    import Store from './app/(public)/[locale]/(site)/store/StoreClient';
    import Detail from './components/store/StoreProductDetail';
    import ListingLoading from './app/(public)/[locale]/(site)/store/loading';
    import DetailLoading from './app/(public)/[locale]/(site)/store/[slug]/loading';
    import FaqWidget from './components/chatbot/FaqWidget';
    import pi from './messages/id/products.json';import pe from './messages/en/products.json';import pz from './messages/zh-CN/products.json';
    import ci from './messages/id/common.json';import ce from './messages/en/common.json';import cz from './messages/zh-CN/common.json';
    import ri from './messages/id/requests.json';import re from './messages/en/requests.json';import rz from './messages/zh-CN/requests.json';
    window.catalogs={id:{products:pi,common:ci,requests:ri},en:{products:pe,common:ce,requests:re},'zh-CN':{products:pz,common:cz,requests:rz}};
    window.errors=[];window.paths=[];window.carts=[];window.user=null;window.network=[];window.responseMode='ok';
    window.addEventListener('error',e=>window.errors.push(e.message));
    window.addEventListener('unhandledrejection',e=>window.errors.push(String(e.reason)));
    const source={id:'qa-component',slug:'qa-component',name:'Nama kanonis',brand:'AUTENTIK',category:'Sensor & Otomasi Industri',sku:'AKA-SENSOR-24V-001',price:125000,stock:12,min_purchase_qty:2,unit:'pcs',low_stock_threshold:5,fulfillment_type:'ready_stock',product_type:'sparepart',is_active:true,status:'published',is_store_visible:true,deleted_at:null,image_url:null,gallery:[],features:[],specs:[],has_active_variants:false};
    const names={id:'Sensor Proximity Induktif Industri 24V dengan Konektor M12',en:'Industrial Inductive Proximity Sensor 24V with Heavy-Duty M12 Connector and Adjustable Mounting Bracket','zh-CN':'工业电感式接近传感器24V带重型M12连接器和可调安装支架'};
    window.rows=()=>Array.from({length:12},(_,i)=>({canonical:{...source,id:'qa-'+i,slug:'qa-'+i,sku:'AKA-'+i,brand:i<6?'AUTENTIK':'TALPHA',category:i%2?'Konektor':'Sensor & Otomasi Industri',stock:i===2?0:12,price:i===3?null:125000+i*1000},display:{name:names[window.locale]+(i?' '+(i+1):'')}}));
    window.variants=[{id:'variant-a',label:'1 m',price_override:null,stock:12,sku:'SKU-A'},{id:'variant-b',label:'3 m / Heavy Duty',price_override:175000,stock:5,sku:'SKU-B'},{id:'variant-out',label:'5 m',price_override:250000,stock:0,sku:'SKU-C'}];
    const app=createRoot(document.getElementById('app'));let version=0;
    window.renderCase=(locale='id',mode='listing',theme='light',scenario='normal')=>{
      window.locale=locale;window.mode=mode;document.documentElement.lang=locale;document.documentElement.className=theme==='dark'?'dark':'';
      window.responseMode=scenario;window.paths=[];window.carts=[];
      const product={...source,...(scenario==='image'?{image_url:'/fixture.jpg',gallery:['/fixture.jpg?two']}:{}),...(scenario==='out'?{stock:0}:{}),...(scenario==='price-null'?{price:null}:{}),...(scenario==='custom'?{fulfillment_type:'custom_request'}:{})};
      const display={name:names[locale],description:locale==='zh-CN'?'适用于工厂自动化设备的工业传感器。稳定可靠，便于安装和维护。':'Reliable industrial sensor for automation systems. Designed for straightforward installation and maintenance.',features:['IP67','24 V DC'],specs:[{label:locale==='zh-CN'?'工作电压':'Operating voltage',value:'24 V DC'},{label:locale==='zh-CN'?'材料':'Housing material',value:'Stainless steel / baja tahan karat / 不锈钢'},{label:'Technical reference',value:'ABCDEF0123456789'.repeat(10)}]};
      flushSync(()=>app.render(<NextIntlClientProvider key={++version} locale={locale} messages={window.catalogs[locale]} timeZone='Asia/Jakarta'>
        <header className='sticky top-0 z-50 border-b border-base bg-card-base'><div className='container-custom h-16 flex items-center font-bold text-heading'>AUTENTIK</div></header>
        <main>{mode==='listing-loading'?<ListingLoading/>:mode==='detail-loading'?<DetailLoading/>:mode==='detail'?<Detail product={product} display={display} locale={locale} ppicAkaNumber='62000000001' mikaSalesNumber='62000000002' variants={scenario==='normal'?window.variants:[]} relatedProducts={window.rows().slice(0,4)}/>:<Store products={window.rows()} locale={locale} rpcEnabled={scenario==='error'||scenario==='pending'} compatible={null} ppicAkaNumber='62000000001' mikaSalesNumber='62000000002'/>}</main><FaqWidget/>
      </NextIntlClientProvider>));window.scrollTo(0,0);
    };
    const nativeFetch=window.fetch.bind(window);window.fetch=async(input,options)=>{
      const url=String(input);window.network.push(url);
      if(url.startsWith('/api/store/recent'))return new Response(JSON.stringify({success:true,data:window.rows().slice(0,3).map(p=>({...p.canonical,displayName:p.display.name}))}));
      if(url.startsWith('/api/store/search')){if(window.responseMode==='pending')return new Promise(()=>{});return new Response(JSON.stringify({success:false}),{status:503})}
      return nativeFetch(input,options);
    };
    window.renderCase();
  ` }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root }, plugins: [{ name: 'isolated-boundaries', setup(build) {
    build.onResolve({ filter: /^(next\/image|next\/navigation|@\/i18n\/navigation|@\/utils\/supabase\/client|@\/components\/cart\/CartProvider)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: root, loader: 'jsx', contents: {
      'next/image': "import React from 'react';export default function Image({fill,priority,sizes,style,...props}){return <img {...props} style={{...style,...(fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:{})}}/>}",
      'next/navigation': "export const useSearchParams=()=>new URLSearchParams();",
      '@/i18n/navigation': "import React from 'react';export default function Link({href,...props}){const prefix=window.locale==='en'?'/en':window.locale==='zh-CN'?'/zh-cn':'';return <a {...props} href={prefix+href}/>};export const useRouter=()=>({push:p=>window.paths.push(p),replace:p=>window.paths.push(p)});export const usePathname=()=>window.mode==='detail'?'/store/qa-component':'/store';",
      '@/components/cart/CartProvider': "export const useCart=()=>({addItem:(product,quantity)=>window.carts.push({product,quantity})});",
      '@/utils/supabase/client': "export const createClient=()=>({auth:{getUser:async()=>({data:{user:window.user}})},from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q}});",
    }[args.path] }));
  } }] });
  const image = fs.readFileSync(path.join(root, 'public/images/logo_aka/LOGO_AKA.jpg'));
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else if (/^\/_next\/static\/media\/[a-zA-Z0-9_.-]+\.woff2$/.test(req.url)) { res.setHeader('Content-Type','font/woff2');res.end(fs.readFileSync(path.join(cssDir,'media',path.basename(req.url)))); }
    else if (req.url.startsWith('/fixture.jpg')) { res.setHeader('Content-Type', 'image/jpeg'); res.end(image); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="app"></div><script src="/fixture.js"></script></body></html>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const profile = fs.mkdtempSync(path.join(parent, 'marketplace-edge-'));
  const browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--no-first-run', '--remote-debugging-port=19680', '--user-data-dir='+profile, 'about:blank'], { stdio: 'ignore' });
  let d;
  const shots = [];
  try {
    for (let i=0;i<100;i++) { try { d=await connection(19680); break; } catch { await sleep(100); } }
    assert.ok(d, 'Edge/CDP available');
    const test = async (expression, expected, label) => { let actual;try{actual=await d.evaluate(expression);}catch{throw Error(label+': '+JSON.stringify(await d.evaluate('({errors:window.errors,heading:document.querySelector("h1")?.textContent,buttons:[...document.querySelectorAll("button[aria-label]")].map(e=>e.getAttribute("aria-label"))})')));}assert.deepEqual(actual, expected, label); checks++; };
    await d.cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
    await d.wait('window.renderCase');
    await d.evaluate('document.fonts.ready');
    for (const mode of ['listing','detail']) for (const locale of ['id','en','zh-CN']) for (const theme of ['light','dark']) {
      const tiles=[];
      for (const width of [320,375,390,768,1024,1440]) {
        const label=`${mode}-${locale}-${theme}-${width}`;
        await d.cdp('Emulation.setDeviceMetricsOverride', { width, height:900, deviceScaleFactor:1, mobile:false });
        await d.evaluate(`window.renderCase('${locale}','${mode}','${theme}')`); await sleep(350);
        await test('document.documentElement.scrollWidth<=innerWidth',true,label+' no page overflow');
        await test('document.querySelectorAll("h1").length',1,label+' single heading');
        await test('document.querySelectorAll("[data-store-placeholder]").length>0',true,label+' honest no-image state');
        await test(`(()=>{
          const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
          const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
          const luminance=c=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
          return [...document.querySelectorAll('h1,[data-effective-price],[data-store-placeholder] p,[data-purchase-panel] button:not(:disabled),[data-store-card] button:not(:disabled),[data-store-card] button:not(:disabled) svg')].filter(e=>e.tagName==='svg'||e.textContent.trim()).map(e=>{
            let parent=e,bg;while(parent){bg=rgb(getComputedStyle(parent).backgroundColor);if(bg[3]===255)break;parent=parent.parentElement;}
            const fg=luminance(rgb(getComputedStyle(e).color)),back=luminance(bg?.[3]===255?bg:[255,255,255,255]);
            return {text:e.textContent,ratio:(Math.max(fg,back)+.05)/(Math.min(fg,back)+.05),minimum:e.tagName==='svg'?3:4.5};
          }).filter(e=>e.ratio<e.minimum);
        })()`,[],label+' key text/CTA contrast at least 4.5');
        if(mode==='detail') {
          await test('document.querySelectorAll("[data-purchase-panel] fieldset").length',1,label+' one variant selector');
          if(width>=1024) await test('document.querySelector("[data-purchase-panel]").getBoundingClientRect().width>=360',true,label+' purchase width');
          if(width<1024) {
            await test('document.querySelector("[data-store-purchase-bar]").getBoundingClientRect().height<parseFloat(getComputedStyle(document.querySelector("[data-store-detail]")).paddingBottom)',true,label+' content clearance');
            await test(`document.querySelector('button[aria-label="Buka pusat bantuan"]').getBoundingClientRect().bottom<=document.querySelector('[data-store-purchase-bar]').getBoundingClientRect().top`,true,label+' FAQ clearance');
          }
        }
        const shot=await d.cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:await d.evaluate('document.documentElement.scrollHeight'),scale:1}});
        const file=path.join(output,label+'.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));shots.push(label);
        const tile=await sharp(file).extract({left:0,top:0,width,height:900}).resize(320,900*320/width|0).extend({top:30,bottom:0,left:0,right:0,background:theme==='dark'?'#111827':'#fff'}).png().toBuffer();
        tiles.push({input:tile,left:tiles.length*320,top:0});
      }
      await sharp({create:{width:1920,height:940,channels:3,background:theme==='dark'?'#111827':'#fff'}}).composite(tiles).png().toFile(path.join(output,`${mode}-${locale}-${theme}-review.png`));
    }
    await d.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});
    await d.evaluate("window.renderCase('en','listing');document.querySelector('button[aria-controls=\"store-filter-drawer\"]').focus();document.activeElement.click()");
    await d.wait('document.querySelector("[role=dialog]")');
    await test('document.querySelector("[role=dialog]").contains(document.activeElement)',true,'Drawer receives focus');
    await test('document.body.style.overflow','hidden','Drawer locks body scroll');
    await d.evaluate(`document.querySelector('[role=dialog]').querySelectorAll('button').item(document.querySelector('[role=dialog]').querySelectorAll('button').length-1).focus()`);
    await d.cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});
    await test(`document.activeElement===document.querySelector('[role=dialog] button')`,true,'Tab wraps to first drawer control');
    await d.cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',modifiers:8});
    await test(`document.activeElement.textContent===window.catalogs.en.products.storeUi.showResults`,true,'Shift-Tab wraps to results control');
    await d.evaluate("[...document.querySelectorAll('[role=dialog] input[type=checkbox]')].find(e=>e.parentElement.textContent.includes('Konektor')).click()");
    await d.evaluate("document.querySelector('[role=dialog] button:last-child').focus()");
    await d.cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await d.wait('!document.querySelector("[role=dialog]")');
    await test('document.activeElement.getAttribute("aria-controls")','store-filter-drawer','Escape restores opener focus');
    await test('document.body.style.overflow','','Scroll restored');
    await test('[...document.querySelectorAll("[data-store-card]")].every(e=>e.textContent.includes("Konektor"))',true,'Filters update actual results');
    await d.evaluate("window.renderCase('en','listing')");
    await d.evaluate(`document.querySelector('button[aria-label="Next page"]').click()`);
    await test('document.querySelectorAll("[data-store-card]").length',3,'Pagination renders remaining canonical rows');
    await d.evaluate("window.renderCase('en','listing')");
    await d.fill('input[role=combobox]','Nama kanonis'); await sleep(400);
    await test('document.querySelectorAll("[role=option]").length',6,'Canonical suggestions capped at six');
    await test('document.querySelector("[role=combobox]").getAttribute("aria-expanded")','true','Combobox opens');
    await d.evaluate(`document.querySelector('[role=combobox]').focus()`);
    await d.cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown'});
    await test(`!!document.getElementById(document.querySelector('[role=combobox]').getAttribute('aria-activedescendant'))`,true,'Keyboard active option exists');
    for (const scenario of ['error','pending']) {
      await d.evaluate(`window.renderCase('en','listing','dark','${scenario}')`); await sleep(100);
      await test(scenario==='error'?'document.body.innerText.includes(window.catalogs.en.products.storeUi.error)':'document.querySelectorAll("[data-store-card]").length===0',true,scenario+' state');
    }
    await d.evaluate("window.renderCase('en','listing')");await d.fill('input[role=combobox]','no-such-part');await sleep(400);
    await test('document.body.innerText.includes(window.catalogs.en.products.storeUi.empty)',true,'Empty state');
    for (const mode of ['listing-loading','detail-loading']) { await d.evaluate(`window.renderCase('zh-CN','${mode}','dark')`);await test('document.documentElement.scrollWidth<=innerWidth && !!document.querySelector("[aria-busy=true]")',true,mode+' safe loading'); }
    await d.evaluate("window.renderCase('en','detail')");await sleep(100);
    await d.evaluate("[...document.querySelectorAll('[data-purchase-panel] fieldset button')].find(e=>e.textContent.includes('3 m')).click()");
    await test('document.querySelector("[data-effective-price]").textContent.includes("175")',true,'Variant price updates');
    await test('document.querySelector("[data-effective-stock]").textContent.includes("5")',true,'Variant stock updates');
    await d.evaluate(`document.querySelector('[data-store-purchase-bar] button').click()`);
    await test('window.carts.at(-1).quantity',2,'Sticky cart preserves minimum purchase');
    await test('window.carts.at(-1).product.variant_id','variant-b','Sticky cart preserves selected variant');
    await d.evaluate(`document.querySelector('header button[aria-pressed]').click()`);
    await test(`document.querySelector('header button[aria-pressed]').getAttribute('aria-pressed')`,'true','Wishlist toggles');
    await d.evaluate("document.querySelector('[data-purchase-panel] button[aria-label=\"Increase quantity\"]').click()");
    await d.evaluate("[...document.querySelectorAll('[data-purchase-panel] button')].find(e=>e.textContent.includes('+')).click()");
    await test('({id:window.carts.at(-1)?.product.id,name:window.carts.at(-1)?.product.name,variant:window.carts.at(-1)?.product.variant_id,quantity:window.carts.at(-1)?.quantity,price:window.carts.at(-1)?.product.price})',{id:'qa-component',name:'Nama kanonis',variant:'variant-b',quantity:3,price:175000},'Cart canonical payload/effective variant/quantity');
    await d.evaluate("[...document.querySelectorAll('[data-purchase-panel] button')].find(e=>e.textContent===window.catalogs.en.products.attributes.buy).click()");await sleep(50);
    await test('window.paths.at(-1).startsWith("/auth/login?redirect=")',true,'Direct buy auth redirect preserved');
    await test('JSON.parse(sessionStorage.getItem("autentik-direct-buy:v1")).name','Nama kanonis','Direct buy canonical snapshot');
    await d.evaluate("window.user={id:'fixture'};[...document.querySelectorAll('[data-purchase-panel] button')].find(e=>e.textContent===window.catalogs.en.products.attributes.buy).click()");await sleep(50);
    await test('window.paths.at(-1)','/store/checkout?mode=direct','Authenticated direct buy preserved');
    await test(`document.querySelector('[data-purchase-panel] a[href^="https://wa.me/"]').href.includes('62000000001')`,true,'PPIC WhatsApp routing');
    for (const scenario of ['out','price-null']) {
      await d.evaluate(`window.renderCase('en','detail','light','${scenario}')`);
      await test('[...document.querySelectorAll("[data-purchase-panel] button")].filter(b=>b.textContent.includes(window.catalogs.en.products.attributes.cart)||b.textContent===window.catalogs.en.products.attributes.buy).every(b=>b.disabled)',true,scenario+' prevents purchase');
    }
    await d.evaluate("window.renderCase('en','detail','light','image')");await sleep(100);
    await test(`document.querySelectorAll('button[aria-label^="View image"]').length`,2,'Real images retain thumbnail strip');
    await d.evaluate("document.querySelectorAll('button[aria-label^=\"View image\"]')[1].click()");
    await test(`document.querySelector('img[alt*="image 2"]')!==null`,true,'Gallery selection retained');
    await d.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await test('window.matchMedia("(prefers-reduced-motion: reduce)").matches',true,'Reduced motion environment');
    await test('window.errors',[],'No browser/translation exceptions');
    assert.equal(shots.length,72);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({checks,screenshots:shots,scope:'Real Store components, production CSS; Next/navigation/auth/cart transport mocked; synthetic fixtures; no backend writes.'},null,2));
    console.log(`PASS: ${checks} browser assertions; ${shots.length} screenshots and 12 review sheets.\nArtifacts: ${output}`);
  } finally { d?.socket.close();browser.kill();await new Promise(resolve=>server.close(resolve)); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
