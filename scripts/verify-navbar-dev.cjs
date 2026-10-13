/* eslint-disable @typescript-eslint/no-require-imports -- Normal npm dev + real browser/HMR smoke; writes only owned temporary status/artifacts. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawn,execFileSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const parent = path.join(os.tmpdir(),'opencode');
assert.ok(fs.existsSync(parent));
const statusPath = path.join(parent,`navbar-dev-${process.pid}.json`);
const sleep = ms=>new Promise(resolve=>setTimeout(resolve,ms));
let logs = ''; let checks = 0;
const status = (stage,extra={})=>fs.writeFileSync(statusPath,JSON.stringify({stage,checks,...extra},null,2));
async function main(){
  status('starting');
  const existing=process.argv.includes('--existing');
  const base=existing?'http://localhost:3000':'http://localhost:3208';
  const dev=existing?null:spawn('cmd.exe',['/d','/s','/c','npm run dev -- --port 3208'],{cwd:root,stdio:['ignore','pipe','pipe']});
  dev?.stdout.on('data',data=>logs+=data);dev?.stderr.on('data',data=>logs+=data);
  let browser;let socket;
  const stop=child=>{if(!child)return;try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});}catch{/* already exited */}};
  try{
    if(dev){for(let i=0;i<300&&!logs.includes('Ready in');i++){if(dev.exitCode!==null)throw Error(logs);await sleep(100);}assert.ok(logs.includes('Ready in'),logs);}
    else assert.equal((await fetch(base+'/en/products')).status,200,'Existing dev route available');
    checks++;
    const profile=fs.mkdtempSync(path.join(parent,'navbar-dev-browser-'));
    browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run',`--user-data-dir=${profile}`,'--remote-debugging-port=19628','about:blank'],{stdio:'ignore'});
    let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:19628/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{/* browser starting */}await sleep(100);}assert.ok(target);
    socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    const pending=new Map();let seq=0;let documentLoads=0;const exceptions=[];
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const callback=pending.get(data.id);pending.delete(data.id);if(data.error)callback.reject(data.error);else callback.resolve(data.result);}if(data.method==='Runtime.exceptionThrown')exceptions.push(data.params.exceptionDetails.text);if(data.method==='Page.domContentEventFired')documentLoads++;};
    const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
    const wait=async(expression,limit=600)=>{for(let i=0;i<limit;i++){try{if(await evaluate(`Boolean(${expression})`))return;}catch{/* refresh context */}await sleep(100);}throw Error('Timeout '+expression);};
    await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
    await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await cdp('Page.navigate',{url:base+'/en/products?brand=TALPHA&page=2#specifikasi'});
    await wait("document.documentElement.lang==='en'&&document.querySelector('[data-language-switcher=desktop]')");
    await wait("document.querySelector('header a[href$=\"/auth/login\"]')");
    assert.equal(await evaluate("document.querySelector('header').scrollWidth<=innerWidth"),true);checks++;
    await evaluate("window.navbarHmrProbe='retained'");
    const initialMarkup=await evaluate("document.querySelector('header nav').outerHTML");
    const navbarPath=path.join(root,'components/layout/Navbar.tsx');
    const initialTimestamp=fs.statSync(navbarPath).mtimeMs;
    status('waiting-for-hmr',{instruction:'Make an approved navbar UI edit with apply_patch; the driver requires a source change and a rendered markup update.'});
    let updated=false;
    for(let i=0;i<1800;i++){
      if(fs.statSync(navbarPath).mtimeMs!==initialTimestamp && await evaluate("document.querySelector('header nav').outerHTML")!==initialMarkup){updated=true;break;}
      await sleep(100);
    }
    assert.ok(updated,'Source edit must produce a real HMR markup update');checks++;
    assert.equal(await evaluate('window.navbarHmrProbe'),'retained','HMR preserves the document');checks++;
    for(const [locale,pathname]of [['zh-CN','/zh-cn/products'],['id','/products'],['en','/en/products']]){
      await evaluate(`(()=>{const s=document.querySelector('[data-language-switcher=desktop]');s.value=${JSON.stringify(locale)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
      await wait(`location.pathname===${JSON.stringify(pathname)}&&document.documentElement.lang===${JSON.stringify(locale)}`);
      assert.equal(await evaluate('location.search+location.hash'),'?brand=TALPHA&page=2#specifikasi');checks++;
    }
    await cdp('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
    await evaluate("document.querySelector('button[aria-controls=mobile-navigation-drawer]').click()");await wait('document.getElementById("mobile-navigation-drawer")');
    assert.equal(await evaluate("document.activeElement.closest('#mobile-navigation-drawer')!==null"),true);checks++;
    await evaluate("document.getElementById('mobile-store-btn').scrollIntoView({block:'end'})");
    assert.equal(await evaluate("document.getElementById('mobile-store-btn').getBoundingClientRect().bottom<=innerHeight"),true);checks++;
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await wait('!document.getElementById("mobile-navigation-drawer")');
    assert.equal(await evaluate("document.activeElement.getAttribute('aria-controls')"),'mobile-navigation-drawer');checks++;
    await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    const shot=await cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1280,height:100,scale:1}});const screenshot=path.join(profile,'live-dev-1280-english.png');fs.writeFileSync(screenshot,Buffer.from(shot.data,'base64'));
    assert.deepEqual(exceptions,[]);checks++;
    const settledLoads=documentLoads;await sleep(1500);assert.equal(documentLoads,settledLoads,'No idle refresh loop');checks++;
    assert.ok(!/Turbopack.*panic|thread.*panicked|FATAL|fatal error/i.test(logs),'No Turbopack panic');checks++;
    status('passed',{hmrDocumentRetained:true,turbopackPanic:existing?'review-active-server-log':false,refreshLoop:false,screenshot,command:existing?'Existing npm run dev (port 3000)':'npm run dev -- --port 3208'});
  }catch(error){status('failed',{message:String(error),logs:logs.replace(/https?:\/\/[^\s'\"]+/g,'[URL]').slice(-6000)});throw error;}
  finally{if(socket)socket.close();stop(browser);stop(dev);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
