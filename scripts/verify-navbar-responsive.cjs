/* eslint-disable @typescript-eslint/no-require-imports -- Real navbar/i18n/cart/theme components in Edge; only Next navigation and Supabase transport are fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;

async function main() {
  const cssPath = path.join(root, '.next/static');
  const css = fs.readdirSync(cssPath, {recursive:true}).filter(file=>file.endsWith('.css')).map(file=>fs.readFileSync(path.join(cssPath,file),'utf8')).join('\n');
  const bundle = await esbuild.build({stdin:{resolveDir:root,loader:'jsx',contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
    import {NextIntlClientProvider} from 'next-intl';import Navbar from './components/layout/Navbar';
    import ThemeProvider from './components/ThemeProvider';import CartProvider from './components/cart/CartProvider';
    import idCommon from './messages/id/common.json';import idNavigation from './messages/id/navigation.json';
    import enCommon from './messages/en/common.json';import enNavigation from './messages/en/navigation.json';
    import zhCommon from './messages/zh-CN/common.json';import zhNavigation from './messages/zh-CN/navigation.json';
    const dictionaries={id:{common:idCommon,navigation:idNavigation},en:{common:enCommon,navigation:enNavigation},'zh-CN':{common:zhCommon,navigation:zhNavigation}};
    const app=createRoot(document.getElementById('app'));let version=0;
    window.case={locale:'id',signedIn:false,userId:'fixture'};window.name='Customer With A Very Long Display Name That Must Remain Inside The Account Menu';
    window.authListeners=new Set();window.pendingProfiles=[];window.profileRequests=[];window.delayProfile=false;
    const session=()=>window.case.signedIn?{user:{id:window.case.userId,email:'fixture@example.com',user_metadata:{full_name:window.name}}}:null;
    window.calls=[];window.errors=[];window.addEventListener('error',e=>window.errors.push(e.message));window.addEventListener('unhandledrejection',e=>window.errors.push(String(e.reason)));
    window.renderCase=(locale='id',signedIn=false,pathname='/products?brand=TALPHA&page=2#specifikasi',profile={role:'admin',is_active:true})=>{
      window.case={locale,signedIn,userId:'fixture'};window.profile=profile;window.delayProfile=false;window.pendingProfiles=[];window.profileRequests=[];const prefix=locale==='en'?'/en':locale==='zh-CN'?'/zh-cn':'';
      history.replaceState({},'',prefix+pathname);document.documentElement.lang=locale;
      flushSync(()=>app.render(<NextIntlClientProvider key={++version} locale={locale} messages={dictionaries[locale]}><ThemeProvider><CartProvider><Navbar/></CartProvider></ThemeProvider></NextIntlClientProvider>));
    };
    window.navigate=(href)=>{window.calls.push(href);history.replaceState({},'',href);const locale=location.pathname.startsWith('/zh-cn/')?'zh-CN':location.pathname.startsWith('/en/')?'en':'id';window.renderCase(locale,window.case.signedIn,href.replace(/^\\/(en|zh-cn)(?=\\/)/,''))};
    window.emitAuth=(event,signedIn,userId=window.case.userId,profile=window.profile)=>{
      window.case={...window.case,signedIn,userId};window.profile=profile;
      window.inAuthCallback=true;try{for(const listener of window.authListeners)listener(event,session())}finally{window.inAuthCallback=false}
    };
    const query=table=>{let userId;const q={select:()=>q,eq:(key,value)=>{if(key==='id')userId=value;return q},is:()=>q,order:async()=>({data:[],error:null}),single:()=>{
      if(window.inAuthCallback)throw Error('Profile SDK call inside auth callback can deadlock');
      window.profileRequests.push(userId);const profile=window.profile;
      if(profile==='throw')return Promise.reject(Error('PRIVATE PROFILE DETAIL'));
      const result=profile==='error'?{data:{role:'admin',is_active:true},error:{message:'PRIVATE PROFILE DETAIL'}}:{data:profile,error:null};
      return window.delayProfile?new Promise(resolve=>window.pendingProfiles.push(()=>resolve(result))):Promise.resolve(result);
    }};return q};
    window.client={auth:{getSession:async()=>({data:{session:session()}}),onAuthStateChange:listener=>{window.authListeners.add(listener);return{data:{subscription:{unsubscribe:()=>window.authListeners.delete(listener)}}}},signOut:async()=>{window.calls.push('signOut');window.emitAuth('SIGNED_OUT',false)}},from:query};
    localStorage.setItem('autentik-cart:v1',JSON.stringify([{key:'fixture::default',id:'fixture',variant_id:null,variant_label:null,slug:'fixture',name:'Fixture',brand:'AKA',price:15000,stock:5,quantity:2}]));
    window.renderCase();
  `},bundle:true,write:false,platform:'browser',jsx:'automatic',alias:{'@':root},plugins:[{name:'boundaries',setup(build){
    build.onResolve({filter:/^(next\/link|next\/navigation|next\/image|@\/utils\/supabase\/client)$/},args=>({path:args.path,namespace:'fixture'}));
    build.onLoad({filter:/.*/,namespace:'fixture'},args=>({resolveDir:root,loader:'jsx',contents:{
      'next/link':"import React from 'react';export default function Link({href,prefetch,locale,replace,scroll,...props}){const target=typeof href==='string'?href:href.pathname;return <a {...props} href={target} onClick={event=>{props.onClick?.(event);if(!event.defaultPrevented){event.preventDefault();if(window.deferNavigation)window.calls.push(target);else window.navigate(target)}}}/>} ",
      'next/image':"import React from 'react';export default function Image({fill,priority,...props}){return <img {...props}/>} ",
      'next/navigation':"export const useRouter=()=>({push:u=>window.navigate(u),replace:u=>window.navigate(u),refresh:()=>{}});export const usePathname=()=>location.pathname;export const useParams=()=>({locale:window.case.locale});export const useSearchParams=()=>new URLSearchParams(location.search);export const redirect=()=>{};export const permanentRedirect=()=>{};",
      '@/utils/supabase/client':'export const createClient=()=>window.client;',
    }[args.path]}));
  }}]});
  const server=http.createServer((req,res)=>{
    if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}
    else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end(css);}
    else if(req.url==='/images/logo_aka/LOGO_AKA.jpg'){res.setHeader('Content-Type','image/jpeg');res.end(fs.readFileSync(path.join(root,'public/images/logo_aka/LOGO_AKA.jpg')));}
    else if(req.url.startsWith('/api/careers/jobs')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,data:[]}));}
    else res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><main id="app"></main><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const parent=path.join(os.tmpdir(),'opencode');assert.ok(fs.existsSync(parent));
  const profile=fs.mkdtempSync(path.join(parent,'navbar-responsive-'));
  const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-port=19627','about:blank'],{stdio:'ignore'});
  let socket;
  try {
    let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:19627/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{/* startup */}await sleep(100);}
    assert.ok(target);socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    const pending=new Map();let seq=0;
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const h=pending.get(data.id);pending.delete(data.id);if(data.error)h.reject(data.error);else h.resolve(data.result);}};
    const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
    const test=async(expression,expected,label)=>{assert.deepEqual(await evaluate(expression),expected,label);checks++;};
    const wait=async expression=>{for(let i=0;i<200;i++){if(await evaluate(`Boolean(${expression})`))return;await sleep(30);}throw Error('Timeout: '+expression);};
    const key=async(name,code,vk,modifiers=0)=>{await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:name,code,windowsVirtualKeyCode:vk,modifiers});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:name,code,windowsVirtualKeyCode:vk,modifiers});};
    await cdp('Page.enable');await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
    await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});await wait('document.readyState==="complete" && typeof window.renderCase==="function"');
    await evaluate("window.visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';window.rect=e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})");
    const openAccount = async width => {
      if (await evaluate(`Boolean(document.getElementById('${width < 1280 ? 'mobile-navigation-drawer' : 'customer-account-menu'}'))`)) return;
      const selector = width < 1280 ? 'button[aria-controls=mobile-navigation-drawer]' : 'button[aria-controls=customer-account-menu]';
      await wait(`document.querySelector('${selector}')`);
      await evaluate(`document.querySelector('${selector}').click()`);
      await wait(`document.getElementById('${width < 1280 ? 'mobile-navigation-drawer' : 'customer-account-menu'}')`);
    };
    for (const width of [375, 1024, 1440]) for (const [locale, prefix] of [['id', ''], ['en', '/en'], ['zh-CN', '/zh-cn']]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      const menu = width < 1280 ? '#mobile-navigation-drawer' : '#customer-account-menu';
      for (const [label, profile, eligible] of [
        ...['super_admin', 'admin', 'staff', 'editor'].map(role => [role, { role, is_active: true }, true]),
        ['customer', { role: 'customer', is_active: true }, false],
        ['inactive CMS', { role: 'admin', is_active: false }, false],
        ['missing profile', null, false], ['failed profile', 'error', false], ['thrown profile', 'throw', false],
      ]) {
        await evaluate(`window.renderCase('${locale}',true,'/products',${JSON.stringify(profile)})`); await sleep(120);
        await openAccount(width); await sleep(120);
        const context = `${width}/${locale}/${label}`;
        await test(`window.visible(document.querySelector('${menu} a[href="/admin"]'))`, eligible, context + ' Trusted CMS shortcut eligibility');
        await test(`document.querySelector('${menu} a[href="/en/admin"],${menu} a[href="/zh-cn/admin"]')===null`, true, context + ' Admin never localized');
        await test(`document.querySelector('${menu} a[href="${prefix}/store/orders"]')!==null`, true, context + ' Customer order history retained');
        await test(`document.querySelector('${menu} a:has(svg.lucide-heart)')===null`, true, context + ' R-02 misleading Wishlist shortcut removed; legitimate Store CTA retained');
        if (eligible) {
          await test(`document.querySelector('${menu} a[href="/admin"]').textContent.trim()`, { id: 'Dashboard Admin', en: 'Admin Dashboard', 'zh-CN': '管理后台' }[locale], context + ' Translated Admin label');
          await evaluate(`window.deferNavigation=true;document.querySelector('${menu} a[href="/admin"]').click()`);
          await sleep(30);
          await test('window.calls.at(-1)', '/admin', context + ' Dashboard navigation target');
          await test(`document.querySelector('${menu}')===null`, true, context + ' Admin link closes menu');
          await evaluate('window.deferNavigation=false');
        }
      }
      await evaluate(`window.renderCase('${locale}',true,'/products')`); await sleep(120); await openAccount(width); await sleep(120);
      await test(`window.visible(document.querySelector('${menu} a[href="/admin"]'))`, true, 'CMS visible before logout ' + width + '/' + locale);
      await evaluate(`window.calls=[];document.querySelector('${menu} button:has(svg.lucide-log-out)').click()`); await sleep(120);
      await test('window.calls.includes("signOut")', true, 'Logout reaches SDK');
      await test('location.pathname', prefix || '/', 'Logout preserves locale home');
      await test('document.querySelector("a[href=\\"/admin\\"]")===null', true, 'Sign-out clears CMS shortcut');
      await evaluate("window.emitAuth('SIGNED_IN',true,'customer-after-admin',{role:'customer',is_active:true})"); await sleep(120);
      await openAccount(width); await sleep(120);
      await test(`document.querySelector('${menu} a[href="/admin"]')===null`, true, 'Customer cannot inherit CMS shortcut');
      // No remount: deliver an obsolete CMS response after the customer profile resolves.
      await evaluate("window.delayProfile=true;window.emitAuth('SIGNED_IN',true,'delayed-admin',{role:'admin',is_active:true})");
      await wait('window.pendingProfiles.length>0');
      await test(`document.querySelector('${menu} a[href="/admin"]')===null`, true, 'Pending new identity is not CMS proof');
      await evaluate("window.delayProfile=false;window.emitAuth('SIGNED_IN',true,'current-customer',{role:'customer',is_active:true})"); await sleep(120);
      await evaluate('window.pendingProfiles.splice(0).forEach(resolve=>resolve())'); await sleep(120);
      if (width >= 1280 && !await evaluate('Boolean(document.querySelector("#customer-account-menu"))')) await openAccount(width);
      await test(`document.querySelector('${menu} a[href="/admin"]')===null`, true, 'Delayed previous identity cannot restore CMS shortcut');
      await test('window.profileRequests.includes("current-customer")', true, 'Auth identity change loads current trusted profile');
      await evaluate("window.emitAuth('SIGNED_IN',true,'current-customer',{role:'admin',is_active:true})"); await sleep(120);
      if (width >= 1280) await openAccount(width);
      await test(`window.visible(document.querySelector('${menu} a[href="/admin"]'))`, true, 'Current profile refresh can enable CMS');
      await evaluate("window.emitAuth('SIGNED_OUT',false)"); await sleep(120);
      await evaluate("window.emitAuth('SIGNED_IN',true,'new-customer',{role:'customer',is_active:true})"); await sleep(120);
      if (width >= 1280) await openAccount(width);
      await test(`document.querySelector('${menu} a[href="/admin"]')===null`, true, 'Same mounted component clears CMS on sign-out/customer sign-in');
      await evaluate("window.delayProfile=true;window.emitAuth('TOKEN_REFRESHED',true,'new-customer',{role:'admin',is_active:true})");
      await wait('window.pendingProfiles.length>0');
      await evaluate("window.delayProfile=false;window.emitAuth('TOKEN_REFRESHED',true,'new-customer',null)"); await sleep(120);
      await evaluate('window.pendingProfiles.splice(0).forEach(resolve=>resolve())'); await sleep(120);
      await test(`document.querySelector('${menu} a[href="/admin"]')===null`, true, 'Old same-identity session result cannot override a missing current profile');
    }
    for(const [width,height]of [[375,812],[430,932],[768,900],[1024,768],[1280,800],[1366,768],[1440,900]])for(const [locale,prefix]of [['id',''],['en','/en'],['zh-CN','/zh-cn']])for(const signedIn of [false,true]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
      await evaluate(`window.renderCase('${locale}',${signedIn})`);await sleep(120);
      const context=`${width}/${locale}/${signedIn?'in':'out'}`;
      await test("window.visible(document.querySelector('header button:has(svg.lucide-search)'))",true,context+' Search always reachable');
      await test("document.querySelector('header').scrollWidth<=innerWidth",true,context+' No header overflow');
      await test("window.visible(document.querySelector('header a[href$=\"/store/cart\"]'))",true,context+' Cart reachable');
      await test("document.querySelector('header a[href$=\"/store/cart\"]').textContent.includes('2')",true,context+' Cart badge retained');
      await test("(()=>{const items=[...document.querySelectorAll('header a,header button,header label:has(select)')].filter(window.visible).map(e=>e.getBoundingClientRect());return items.every((a,i)=>items.every((b,j)=>i===j||Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1))})()",true,context+' Controls do not overlap');
      for(const button of ['header button:has(svg.lucide-search)','header a[href$="/store/cart"]'])await test(`window.rect(document.querySelector('${button}')).height>=40`,true,context+' Safe control target');
      if(width<1280){
        await test("window.visible(document.getElementById('theme-toggle'))",false,context+' Theme moved into drawer');
        await test("window.visible(document.getElementById('navbar-store-btn'))",false,context+' CTA moved into drawer');
        await test("window.visible(document.querySelector('header a[href$=\"/auth/login\"]'))",false,context+' Account text out of top row');
        await evaluate("document.querySelector('button[aria-controls=mobile-navigation-drawer]').click()");await wait('document.getElementById("mobile-navigation-drawer")');
        await test("document.activeElement.closest('#mobile-navigation-drawer')!==null",true,context+' Drawer initial focus');
        await evaluate("document.querySelector('button[aria-controls=mobile-company-navigation]').click()");
        for(const route of ['/','/products','/services','/careers','/contact','/about','/distributors','/research-partnership'])await test(`document.querySelector('#mobile-navigation-drawer a[href=${JSON.stringify(prefix+(route==='/'&&prefix?'':route))}]')!==null`,true,context+' Primary/company link '+route);
        await test("window.visible(document.querySelector('#mobile-navigation-drawer a[href=\"/admin\"]'))",signedIn,context+' CMS shortcut follows active Admin fixture');
        await test("window.visible(document.querySelector('[data-language-switcher=mobile]'))",true,context+' Mobile language reachable');
        await test("[...document.querySelector('[data-language-switcher=mobile]').options].map(o=>o.textContent)",['Bahasa Indonesia','English','简体中文'],context+' Full autonyms');
        await test("document.querySelector('#mobile-navigation-drawer').scrollWidth<=document.querySelector('#mobile-navigation-drawer').clientWidth",true,context+' Drawer no overflow');
        if(signedIn){await test('document.querySelector("#mobile-navigation-drawer").textContent.includes(window.name)',true,context+' Full account in drawer');await test(`document.querySelector('#mobile-navigation-drawer a[href="${prefix}/store/orders"]')!==null`,true,context+' Order history retained');}
        else await test(`document.querySelector('#mobile-navigation-drawer a[href="${prefix}/auth/login"]')!==null`,true,context+' Login retained');
        await evaluate("document.getElementById('mobile-store-btn').scrollIntoView({block:'end'})");
        await test("document.getElementById('mobile-store-btn').getBoundingClientRect().bottom<=innerHeight",true,context+' CTA fully reachable');
        if(width===375&&locale==='zh-CN'&&signedIn){const screenshot=await cdp('Page.captureScreenshot',{format:'png'});const file=path.join(profile,'mobile-chinese-account.png');fs.writeFileSync(file,Buffer.from(screenshot.data,'base64'));console.log('Screenshot:',file);}
        await key('Escape','Escape',27);await wait('!document.getElementById("mobile-navigation-drawer")');
        await test("document.activeElement.getAttribute('aria-controls')",'mobile-navigation-drawer',context+' Focus restored');
      }else{
        await test("window.visible(document.getElementById('navbar-store-btn'))",true,context+' Desktop CTA visible');
        await test("window.visible(document.getElementById('theme-toggle'))",true,context+' Desktop theme visible');
        await test("document.querySelector('[data-language-switcher=desktop]').parentElement.querySelector('span[aria-hidden=true]').textContent",{id:'ID',en:'EN','zh-CN':'中文'}[locale],context+' Compact language display');
        await test("document.querySelector('[data-language-switcher=desktop]').getBoundingClientRect().width<=88",true,context+' Compact language width');
        await evaluate("document.querySelector('button[aria-controls=company-navigation-menu]').click()");
        for(const route of ['/','/products','/services','/careers','/contact','/about','/distributors','/research-partnership'])await test(`document.querySelector('header a[href=${JSON.stringify(prefix+(route==='/'&&prefix?'':route))}]')!==null`,true,context+' Desktop primary/company link '+route);
        await key('Escape','Escape',27);
        if(signedIn){
          await test("document.querySelector('header').textContent.includes(window.name)",false,context+' Long name outside closed trigger');
          await evaluate("document.querySelector('header button[aria-controls=customer-account-menu]').click()");
          await test("document.getElementById('customer-account-menu').textContent.includes(window.name)",true,context+' Full name in dropdown');
          await test("window.visible(document.querySelector('#customer-account-menu a[href=\"/admin\"]'))",true,context+' Active Admin shortcut retained');
          await key('Escape','Escape',27);
          await test("document.activeElement.getAttribute('aria-controls')",'customer-account-menu',context+' Account Escape focus');
        }else await test(`window.visible(document.querySelector('header a[href="${prefix}/auth/login"]'))`,true,context+' Visible named login');
        if(width===1280&&locale==='en'){const shot=await cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width,height:100,scale:1}});const file=path.join(profile,`desktop-english-${signedIn?'account':'login'}.png`);fs.writeFileSync(file,Buffer.from(shot.data,'base64'));console.log('Screenshot:',file);}
      }
    }
    await evaluate("window.renderCase('id',false)");await sleep(120);
    await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    const picker=await evaluate("window.rect(document.querySelector('[data-language-switcher=desktop]'))");
    const pickerY=await evaluate("document.querySelector('[data-language-switcher=desktop]').getBoundingClientRect().top+22");
    await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:picker.left+picker.width/2,y:pickerY,button:'left',clickCount:1});
    await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:picker.left+picker.width/2,y:pickerY,button:'left',clickCount:1});
    const popup=await cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1440,height:250,scale:1}});
    const popupFile=path.join(profile,'desktop-native-language-menu.png');fs.writeFileSync(popupFile,Buffer.from(popup.data,'base64'));console.log('Screenshot:',popupFile);
    await key('Escape','Escape',27);
    for(const pathname of ['/products/wps-ss1500?brand=TALPHA#specifikasi','/careers/123?page=2#apply','/store/orders/AKA-123?payment=return','/store/checkout?mode=direct']) {
      await evaluate(`window.renderCase('id',false,${JSON.stringify(pathname)})`);await sleep(80);
      for(const [locale,prefix]of [['en','/en'],['zh-CN','/zh-cn'],['id','']]){
        await evaluate(`(()=>{const s=document.querySelector('[data-language-switcher=desktop]');s.value='${locale}';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);await sleep(80);
        await test('location.pathname+location.search+location.hash',prefix+pathname,'Route/slug/job/order/query/hash preserved');
        await test(`document.cookie.includes('autentik-locale=${locale}')`,true,'Cookie handler unchanged');
      }
    }
    await evaluate("window.renderCase('id',false)");await sleep(80);
    await cdp('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
    await evaluate("document.querySelector('button[aria-controls=mobile-navigation-drawer]').click()");await sleep(60);
    for(let i=0;i<24;i++){await key('Tab','Tab',9);await test("document.activeElement.closest('#mobile-navigation-drawer')!==null",true,'Drawer Tab containment');}
    const dark=await evaluate("document.documentElement.classList.contains('dark')");
    await evaluate("document.querySelector('#mobile-navigation-drawer button:has(svg.lucide-sun),#mobile-navigation-drawer button:has(svg.lucide-moon)').click()");
    await test("document.documentElement.classList.contains('dark')",!dark,'Drawer theme control works');
    await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await wait('!document.getElementById("mobile-navigation-drawer")');await test('document.body.style.overflow','','Desktop resize releases scroll lock');
    await evaluate("window.renderCase('en',true)");await sleep(100);
    await evaluate("document.querySelector('button[aria-controls=customer-account-menu]').focus()");
    await key('ArrowDown','ArrowDown',40);await wait('document.activeElement.getAttribute("role")==="menuitem"');
    await test("document.activeElement.getAttribute('role')",'menuitem','Account keyboard opens menu');
    await key('End','End',35);await test("document.activeElement.tagName",'BUTTON','Account keyboard reaches logout');
    await key('Home','Home',36);await test("document.activeElement.getAttribute('href')",'/en/store/orders','Account keyboard reaches order history');
    await key('Escape','Escape',27);
    await evaluate("document.querySelector('button[aria-controls=company-navigation-menu]').focus()");await key('ArrowDown','ArrowDown',40);await sleep(50);
    await test("document.activeElement.getAttribute('href')",'/en/about','Company keyboard submenu preserved');
    await key('Escape','Escape',27);
    await evaluate("window.renderCase('id',false)");await sleep(80);
    await cdp('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
    await evaluate("document.querySelector('header button:has(svg.lucide-search)').click()");
    await wait('document.querySelector("input[placeholder]")');await test("document.activeElement.matches('input')",true,'Search input remains focused');
    await key('Escape','Escape',27);
    await test('window.errors',[],'No browser exceptions');
    console.log(`PASS: ${checks} real navbar browser assertions across 42 viewport/locale/account combinations; isolated auth/Next transport, no live writes.`);
  }finally{if(socket)socket.close();browser.kill();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
