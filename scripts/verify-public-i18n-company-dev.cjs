/* eslint-disable @typescript-eslint/no-require-imports -- Read-only dev smoke; manual apply_patch content edit proves real catalog HMR. */
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');const parent=path.join(os.tmpdir(),'opencode');assert.ok(fs.existsSync(parent));
const statusPath=path.join(parent,`company-dev-${process.pid}.json`);const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let checks=0;
const status=(stage,extra={})=>fs.writeFileSync(statusPath,JSON.stringify({stage,checks,...extra},null,2));
async function main(){
  let browser,socket;
  try{
    status('checking-pages');
    if(process.argv.includes('--start')){
      const logPath=path.join(parent,`company-normal-dev-${process.pid}.log`);const fd=fs.openSync(logPath,'a');
      const dev=spawn('cmd.exe',['/d','/s','/c','npm run dev'],{cwd:root,stdio:['ignore',fd,fd]});fs.closeSync(fd);
      let ready=false;for(let i=0;i<300;i++){if(dev.exitCode!==null)throw Error(fs.readFileSync(logPath,'utf8'));try{if((await fetch('http://localhost:3000/en')).status===200){ready=true;break;}}catch{/* startup */}await sleep(100);}
      assert.ok(ready,'Fresh normal dev server starts');checks++;
    }
    for(const [locale,prefix]of [['id',''],['en','/en'],['zh-CN','/zh-cn']])for(const page of ['','/about']){
      const response=await fetch('http://localhost:3000'+prefix+(page||(!prefix?'/':'')),{signal:AbortSignal.timeout(60000)});const html=await response.text();
      assert.equal(response.status,200);checks++;
      const messages=require(path.join(root,'messages',locale,page?'company.json':'home.json'));
      assert.ok(html.includes(messages.metadata.title));checks++;
      assert.ok(html.includes(page?messages.about.vision:messages.aboutUs.eyebrow));checks++;
    }
    const profile=fs.mkdtempSync(path.join(parent,'company-dev-browser-'));
    browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run',`--user-data-dir=${profile}`,'--remote-debugging-port=19634','about:blank'],{stdio:'ignore'});
    let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:19634/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{/* startup */}await sleep(100);}assert.ok(target);
    socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});let seq=0,loads=0;const pending=new Map();const errors=[];
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    socket.onmessage=event=>{const d=JSON.parse(event.data);if(d.id){const h=pending.get(d.id);pending.delete(d.id);if(d.error)h.reject(d.error);else h.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);if(d.method==='Page.domContentEventFired')loads++;};
    const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const wait=async expression=>{for(let i=0;i<600;i++){try{if(await evaluate(`Boolean(${expression})`))return;}catch{/* navigation */}await sleep(100);}throw Error('Timeout '+expression);};
    await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Page.navigate',{url:'http://localhost:3000/en'});
    const catalogPath=path.join(root,'messages/en/home.json');
    const initialPhrase=JSON.parse(fs.readFileSync(catalogPath,'utf8')).aboutUs.process;
    await wait(`document.body.textContent.includes(${JSON.stringify(initialPhrase)})&&document.querySelector('main h1')`);
    await evaluate("window.companyHmrProbe='retained'");
    const initialTime=fs.statSync(catalogPath).mtimeMs;
    status('waiting-for-hmr',{instruction:'Apply the approved sentence-case polish to the EN process heading; a changed catalog leaf must appear without reloading the document.'});
    let changed=false;for(let i=0;i<1800;i++){
      const currentPhrase=JSON.parse(fs.readFileSync(catalogPath,'utf8')).aboutUs.process;
      if(fs.statSync(catalogPath).mtimeMs!==initialTime&&currentPhrase!==initialPhrase&&await evaluate(`document.body.textContent.includes(${JSON.stringify(currentPhrase)})`)){changed=true;break;}
      await sleep(100);
    }
    assert.ok(changed);assert.equal(await evaluate('window.companyHmrProbe'),'retained');checks+=2;
    const originalNames=await evaluate("[...document.querySelectorAll('main h1, main h3')].map(node=>node.textContent.trim())");
    for(const [locale,url]of [['zh-CN','/zh-cn'],['id','/'],['en','/en']]){
      await evaluate(`(()=>{const s=document.querySelector('[data-language-switcher=desktop]');s.value='${locale}';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
      await wait(`location.pathname==='${url}'&&document.documentElement.lang==='${locale}'&&document.querySelector('main h1')`);
      assert.ok(originalNames.includes(await evaluate("document.querySelector('main h1').textContent.trim()")),'Timed carousel still displays an original CMS product name');checks++;
    }
    const settled=loads;await sleep(1500);assert.equal(loads,settled);assert.deepEqual(errors,[]);checks+=2;
    status('passed',{hmrDocumentRetained:true,reloadLoop:false,command:'Existing normal npm run dev (port 3000)',pages:['/','/en','/zh-cn','/about','/en/about','/zh-cn/about'],dynamicHeroUnchanged:true});
  }catch(error){status('failed',{message:String(error)});throw error;}
  finally{if(socket)socket.close();if(browser)try{execFileSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore'});}catch{/* exited */}}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
