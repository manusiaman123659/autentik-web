/* eslint-disable @typescript-eslint/no-require-imports -- Browser smoke against the real built application; no service mocks or writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function browserSmoke(base, equal) {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.ok(fs.existsSync(edge), 'Edge browser available');
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'public-i18n-'));
  const browser = spawn(edge, ['--headless=new','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-port=19619','about:blank'], { stdio:'ignore' });
  let socket;
  const errors = [];
  try {
    let target;
    for(let i=0;i<100;i++) {
      try { target=(await (await fetch('http://127.0.0.1:19619/json/list')).json()).find(t=>t.type==='page'); if(target)break; } catch { /* browser startup */ }
      await sleep(100);
    }
    assert.ok(target);
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    const pending = new Map(); let seq=0;
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    socket.onmessage=event=>{
      const data=JSON.parse(event.data);
      if(data.id){const callback=pending.get(data.id);pending.delete(data.id);if(data.error)callback.reject(data.error);else callback.resolve(data.result);}
      if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);
    };
    const evaluate=async expression=>{
      const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
      if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const wait=async expression=>{
      for(let i=0;i<300;i++){try{if(await evaluate(`Boolean(${expression})`))return;}catch{/* navigation context replaced */}await sleep(100);}
      throw Error('Browser timeout: '+expression+' '+JSON.stringify(await evaluate("({url:location.href,lang:document.documentElement.lang,title:document.title,body:document.body.innerText.slice(0,1200)})"))+' errors='+JSON.stringify(errors));
    };
    const test=async(expression,expected,label)=>equal(await evaluate(expression),expected,label);
    const navigate=async(url,locale)=>{
      await cdp('Page.navigate',{url:base+url});
      await wait(`location.pathname===${JSON.stringify(url.split(/[?#]/)[0])} && document.documentElement.lang===${JSON.stringify(locale)} && document.querySelector('[data-language-switcher=desktop]')`);
      await sleep(350);
    };
    const key=async(name,code,vk,modifiers=0)=>{
      await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:name,code,windowsVirtualKeyCode:vk,modifiers});
      await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:name,code,windowsVirtualKeyCode:vk,modifiers});
    };
    await cdp('Page.enable'); await cdp('Runtime.enable');
    await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
    await cdp('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
    for(const [prefix,locale,label]of [['','id','Produk'],['/en','en','Products'],['/zh-cn','zh-CN','产品']])for(const page of ['','/products','/store']){
      await navigate(prefix+(page||(!prefix?'/':'')),locale);
      await test("document.querySelector('header').textContent.includes("+JSON.stringify(label)+")",true,'Built navbar translation');
      await test("document.querySelector('header a[href="+JSON.stringify(prefix+'/products')+"]')!==null",true,'Product link remains localized');
      await test("document.querySelector('header a[href="+JSON.stringify(prefix+'/store')+"]')!==null",true,'Store link remains localized');
      await test("document.querySelector('header a[href="+JSON.stringify(prefix+'/contact')+"]')!==null",true,'Contact link remains localized');
    }
    await navigate('/products?brand=TALPHA&page=2#specifikasi','id');
    await evaluate(`localStorage.setItem('autentik-cart:v1',JSON.stringify([{key:'fixture::default',id:'fixture',variant_id:null,variant_label:null,slug:'fixture',name:'Original',brand:'AKA',image_url:null,price:15000,stock:5,quantity:2}]));sessionStorage.setItem('autentik-checkout-intent:v1:fixture:cart','keep-intent');window.foundationDocument='original'`);
    for(const [locale,pathPrefix]of [['en','/en'],['zh-CN','/zh-cn'],['id','']]){
      await evaluate("window.foundationDocument='original'");
      await evaluate(`(()=>{const select=document.querySelector('[data-language-switcher=desktop]');select.value=${JSON.stringify(locale)};select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
      await wait(`location.pathname===${JSON.stringify(pathPrefix+'/products')}&&document.documentElement.lang===${JSON.stringify(locale)}`);
      await sleep(300);
      console.log(`Locale switch ${locale}: document ${await evaluate("window.foundationDocument==='original'") ? 'retained' : 'reloaded'}; cart/intent preservation checked.`);
      await test('location.search','?brand=TALPHA&page=2','Switcher retains query');
      await test('location.hash','#specifikasi','Switcher retains hash');
      await test('document.cookie.includes('+JSON.stringify('autentik-locale='+locale)+')',true,'Language preference cookie updated');
      await test("JSON.parse(localStorage.getItem('autentik-cart:v1'))[0].quantity",2,'Cart survives locale/root navigation');
      await test("sessionStorage.getItem('autentik-checkout-intent:v1:fixture:cart')",'keep-intent','Intent storage untouched');
      await cdp('Page.reload');
      await wait(`document.documentElement.lang===${JSON.stringify(locale)}&&document.querySelector('[data-language-switcher=desktop]')`);
      await test('location.pathname',pathPrefix+'/products','Refresh keeps locale');
    }
    await navigate('/products','id');
    await evaluate("document.querySelector('[data-language-switcher=desktop]').focus()");
    await key('Tab','Tab',9); await key('Tab','Tab',9,8);
    await test("document.activeElement.matches('[data-language-switcher=desktop]')",true,'Switcher keyboard reachable');
    await test("document.activeElement.matches(':focus-visible')",true,'Visible keyboard focus');
    await key('ArrowDown','ArrowDown',40);
    await wait("location.pathname==='/en/products'&&document.documentElement.lang==='en'");
    await test('location.pathname','/en/products','Native keyboard changes language');
    for(const width of [375,768,1366])for(const [prefix,locale]of [['/en','en'],['/zh-cn','zh-CN']]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});
      await navigate(prefix+'/products',locale);
      await test("document.querySelector('header').scrollWidth<=innerWidth",true,'Navbar no horizontal overflow');
      if(width<1280){
        await evaluate("document.querySelector('button[aria-controls=mobile-navigation-drawer]').click()");
        await wait("document.querySelector('[data-language-switcher=mobile]')");
        await test("document.querySelector('#mobile-navigation-drawer').scrollWidth<=288",true,'English/Chinese drawer fits');
        await test("document.querySelector('[data-language-switcher=mobile]').labels[0].textContent.trim().length>0",true,'Mobile selector accessible name');
        await test("document.querySelector('#mobile-navigation-drawer a[href="+JSON.stringify(prefix+'/products')+"]')!==null",true,'Mobile localized link');
        if(width===375&&locale==='zh-CN'){
          const screenshot=await cdp('Page.captureScreenshot',{format:'png'});
          const file=path.join(profile,'foundation-375-chinese.png');fs.writeFileSync(file,Buffer.from(screenshot.data,'base64'));console.log('Browser screenshot:',file);
          await evaluate("(()=>{const select=document.querySelector('[data-language-switcher=mobile]');select.value='en';select.dispatchEvent(new Event('change',{bubbles:true}))})()");
          await wait("location.pathname==='/en/products'&&document.documentElement.lang==='en'");
          await test('location.pathname','/en/products','Mobile language selection');
        }
      }
    }
    await cdp('Page.navigate',{url:base+'/admin/login'});await wait("document.documentElement.lang==='id'&&document.querySelector('form')");
    await test("document.querySelector('[data-language-switcher]')===null",true,'Admin root/provider isolated');
    equal(errors,[],'No browser JavaScript exceptions');
    console.log('PASS: real built-app Edge navigation, switching, refresh, storage preservation, keyboard and 375/768/1366 responsive smoke. Authenticated sessions/payment not tested.');
  } finally { if(socket)socket.close();browser.kill(); }
};
