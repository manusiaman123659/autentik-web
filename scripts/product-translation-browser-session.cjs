/* eslint-disable @typescript-eslint/no-require-imports -- Verification transport only; auth remains inside the normal browser SDK. */
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const fixture = 'i18n-qa-698604be-49de-4eb2-b01c-1fc8c4ba64a1';

module.exports = async function browserSession(url, publishableKey) {
  const targets = await (await fetch('http://127.0.0.1:19657/json/list')).json();
  const target = targets.find(item => item.type === 'page' && item.url.startsWith('http://localhost:3000/'));
  assert.ok(target, 'Controlled local application browser not found.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0; const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const waiter = pending.get(message.id); pending.delete(message.id);
    if (!waiter) return;
    if (message.error) waiter.reject(new Error('Controlled browser command failed.'));
    else waiter.resolve(message.result);
  };
  const command = (method, params) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Controlled browser command timed out.')); }, 120000);
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    // Exception objects/console/network/storage are deliberately never collected.
    if (response.exceptionDetails) throw new Error('Browser verification expression failed; no private details exported.');
    return response.result.value;
  };
  try {
    await command('Page.bringToFront', {});
    await command('Emulation.setFocusEmulationEnabled', { enabled: true });
    assert.equal(await evaluate('location.origin'), 'http://localhost:3000', 'Checks must remain in the local application context');
    const bundle = await esbuild.build({ stdin: { resolveDir: path.resolve(__dirname, '..'), loader: 'js', contents: `
      import {createClient} from './utils/supabase/client.ts';
      const client=createClient(); const fixture=${JSON.stringify(fixture)}; let actor=null;
      const safe=result=>({data:result.data,error:result.error?{code:result.error.code||'QA_BROWSER_ERROR'}:null});
      window.__productTranslationVerification=async(operation,input)=>{
        try {
          window.__productTranslationVerificationStage=operation;
          if(operation==='actor'){
            window.__productTranslationVerificationStage='actor-user';
            const user=await client.auth.getUser();
            if(user.error||!user.data.user)return {data:{available:false},error:null};
            window.__productTranslationVerificationStage='actor-profile';
            const profile=await client.from('profiles').select('role,is_active,email').eq('id',user.data.user.id).single();
            window.__productTranslationVerificationStage='actor-capabilities';
            const permission=await client.rpc('has_cms_capability',{p_capability:'operations'});
            const shipping=await client.rpc('has_cms_capability',{p_capability:'shipping'});
            const audit=await client.rpc('has_cms_capability',{p_capability:'audit'});
            const valid=!profile.error&&profile.data?.is_active===true&&['super_admin','admin','staff'].includes(profile.data.role)&&permission.data===true;
            if(valid)actor={id:user.data.user.id,email:profile.data.email||user.data.user.email||''};
            return {data:{available:valid,role:profile.data?.role,active:profile.data?.is_active,operations:permission.data===true,canMaintain:shipping.data===true&&audit.data===true},error:null};
          }
          if(!actor)return {data:null,error:{code:'QA_NO_OPERATIONS_SESSION'}};
          if(operation==='rpc'){
            if(!['save_product_translation','unpublish_product_translation','delete_product_translation'].includes(input.name)||input.args.p_product_id!==fixture)return {data:null,error:{code:'QA_SCOPE_DENIED'}};
            if(input.name==='save_product_translation'&&!['name','description','features','specs','seo_title','seo_description'].every(key=>Object.prototype.hasOwnProperty.call(input.args.p_payload||{},key)))return {data:null,error:{code:'QA_FULL_STATE_REQUIRED'}};
            return safe(await client.rpc(input.name,input.args));
          }
          if(operation==='query'){
            if(!['product_translations','products','audit_log'].includes(input.table))return {data:null,error:{code:'QA_SCOPE_DENIED'}};
            let query=client.from(input.table);let inserted=false;
            const filter=query=>input.table==='products'?query.eq('id',fixture):input.table==='audit_log'?query.contains('details',{product_id:fixture}):query.eq('product_id',fixture);
            for(const [method,args]of input.steps){
              if(!['select','eq','is','in','contains','limit','order','single','insert','update','delete'].includes(method))return {data:null,error:{code:'QA_SCOPE_DENIED'}};
              if(input.table==='products'&&['insert','delete'].includes(method))return {data:null,error:{code:'QA_SCOPE_DENIED'}};
              if(input.table==='audit_log'&&['insert','update','delete'].includes(method))return {data:null,error:{code:'QA_SCOPE_DENIED'}};
              if(input.table==='audit_log'&&method==='select')args[0]='id,action,entity_id,details';
              if(method==='insert'){if(Array.isArray(args[0])||args[0]?.product_id!==fixture)return {data:null,error:{code:'QA_SCOPE_DENIED'}};inserted=true;}
              // Apply the ownership filter before terminal single().
              if(method==='single'&&!inserted)query=filter(query);
              query=query[method](...args);
            }
            if(!inserted&&!input.steps.some(([method])=>method==='single'))query=filter(query);
            return safe(await query);
          }
          if(operation==='audit-spoof'){
            if(!['product.translation_saved','product.translation_published','product.translation_unpublished','product.translation_deleted'].includes(input.action))return {data:null,error:{code:'QA_SCOPE_DENIED'}};
            return safe(await client.from('audit_log').insert({user_id:actor.id,user_email:actor.email,action:input.action,entity_type:'product_translation',entity_id:input.id,details:{product_id:fixture,spoof_probe:true}}));
          }
          return {data:null,error:{code:'QA_SCOPE_DENIED'}};
        }catch{return {data:null,error:{code:'QA_BROWSER_ERROR'}};}
      };
    ` }, bundle: true, write: false, platform: 'browser', define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(url),
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(publishableKey),
    } });
    await evaluate(bundle.outputFiles[0].text);
    const invoke = (operation, input = {}) => evaluate(`window.__productTranslationVerification(${JSON.stringify(operation)},${JSON.stringify(input)})`);
    const identity = await invoke('actor');
    assert.ok(identity.data?.available, 'The controlled browser needs an active operations login.');
    return {
      ...identity.data,
      client: {
        rpc: (name, args) => invoke('rpc', { name, args }),
        from: table => {
          const steps = []; const builder = {};
          for (const method of ['select', 'eq', 'is', 'in', 'contains', 'limit', 'order', 'single', 'insert', 'update', 'delete']) builder[method] = (...args) => { steps.push([method, args]); return builder; };
          builder.then = (resolve, reject) => invoke('query', { table, steps }).then(resolve, reject);
          return builder;
        },
      },
      auditSpoof: (action, id) => invoke('audit-spoof', { action, id }),
      close: async () => { try { await evaluate('delete window.__productTranslationVerification'); } finally { socket.close(); } },
    };
  } catch (error) { socket.close(); throw error; }
};
