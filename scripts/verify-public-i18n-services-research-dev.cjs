/* eslint-disable @typescript-eslint/no-require-imports -- Active normal dev + manual apply_patch catalog edit; read-only page smoke, owned browser artifacts. */
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');const parent=path.join(os.tmpdir(),'opencode');assert.ok(fs.existsSync(parent));const statusPath=path.join(parent,`services-research-dev-${process.pid}.json`);const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let checks=0;
const status=(stage,extra={})=>fs.writeFileSync(statusPath,JSON.stringify({stage,checks,...extra},null,2));
async function main(){let browser,socket;try{
  status('checking-pages');
  for(const [locale,prefix]of [['id',''],['en','/en'],['zh-CN','/zh-cn']])for(const [route,namespace]of [['/services','services'],['/distributors','distribution'],['/research-partnership','research']]){
    const response=await fetch('http://localhost:3000'+prefix+route,{signal:AbortSignal.timeout(60000)});const html=await response.text();const catalog=require(path.join(root,'messages',locale,namespace+'.json'));
    assert.equal(response.status,200);assert.ok(html.includes(catalog.metadata.title.replace(/&/g,'&amp;')),locale+route+' localized title');assert.ok(html.includes(namespace==='services'?catalog.ui.categories.all:catalog.hero.title));checks+=3;
  }
  const profile=fs.mkdtempSync(path.join(parent,'services-research-dev-browser-'));browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run',`--user-data-dir=${profile}`,'--remote-debugging-port=19637','about:blank'],{stdio:'ignore'});
  let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:19637/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{/* startup */}await sleep(100);}assert.ok(target);
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});let seq=0,loads=0;const pending=new Map();const errors=[];
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  socket.onmessage=event=>{const d=JSON.parse(event.data);if(d.id){const h=pending.get(d.id);pending.delete(d.id);if(d.error)h.reject(d.error);else h.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);if(d.method==='Page.domContentEventFired')loads++;};
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const wait=async expression=>{for(let i=0;i<600;i++){try{if(await evaluate(`Boolean(${expression})`))return;}catch{/* navigation */}await sleep(100);}throw Error('Timeout '+expression);};
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await cdp('Page.navigate',{url:'http://localhost:3000/en/services?from=review#services-list'});
  const catalogPath=path.join(root,'messages/en/services.json');const initial=JSON.parse(fs.readFileSync(catalogPath,'utf8')).ui.catalogue.consult;await wait(`document.body.textContent.includes(${JSON.stringify(initial)})&&document.getElementById('consulting')`);
  await evaluate("window.servicesHmrProbe='retained'");const initialTime=fs.statSync(catalogPath).mtimeMs;status('waiting-for-hmr',{instruction:'Apply the approved EN consultation-label polish; a catalog change must render with the same document.'});
  let changed=false;for(let i=0;i<1800;i++){const phrase=JSON.parse(fs.readFileSync(catalogPath,'utf8')).ui.catalogue.consult;if(fs.statSync(catalogPath).mtimeMs!==initialTime&&phrase!==initial&&await evaluate(`document.body.textContent.includes(${JSON.stringify(phrase)})`)){changed=true;break;}await sleep(100);}
  assert.ok(changed);assert.equal(await evaluate('window.servicesHmrProbe'),'retained');checks+=2;
  for(const [locale,url]of [['zh-CN','/zh-cn/services'],['id','/services'],['en','/en/services']]){
    await evaluate(`(()=>{const s=document.querySelector('[data-language-switcher=desktop]');s.value='${locale}';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);await wait(`location.pathname==='${url}'&&document.documentElement.lang==='${locale}'&&document.getElementById('consulting')`);
    assert.equal(await evaluate('location.search+location.hash'),'?from=review#services-list');checks++;
  }
  const settled=loads;await sleep(1500);assert.equal(loads,settled);assert.deepEqual(errors,[]);checks+=2;
  status('passed',{hmrDocumentRetained:true,reloadLoop:false,command:'Existing normal npm run dev (port 3000)',nineRoutesVerified:true,queryHashPreserved:true});
}catch(error){status('failed',{message:String(error)});throw error;}finally{if(socket)socket.close();if(browser)try{execFileSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore'});}catch{/* exited */}}}
main().catch(error=>{console.error(error);process.exitCode=1;});
