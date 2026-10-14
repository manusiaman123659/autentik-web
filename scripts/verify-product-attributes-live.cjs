/* eslint-disable @typescript-eslint/no-require-imports -- Scope-correction audit: reads only; empty-cart RPC probes fail before any mutation. */
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const { createHash } = require('node:crypto'); const esbuild = require('esbuild');
const { spawn } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const { connection } = require('./verify-product-translation-editor-browser.cjs');
const root = path.resolve(__dirname, '..'); require('@next/env').loadEnvConfig(root);
const run = '88c48dfb-d655-4d48-9f94-f454a0ab6b29';
const ownedIds = ['b2b','component','variant'].map(kind => `qa-attributes001-${kind}-${run}`);
const codes = ['ORD-20261014-9105','ORD-20261014-8526','ORD-20261014-4603','ORD-20261014-4651','ORD-20261014-6129','ORD-20261014-5402','ORD-20261014-8170'];
const baselineHash = '2eae7e28486d3d7e6851e13c6cc4fb172faad339e414b1a12a974e20cac58b81';
const output = path.join(os.tmpdir(),'opencode','product-attributes-scope-audit.json');
assert.ok(fs.existsSync(path.dirname(output)));
const options = { auth: { persistSession:false,autoRefreshToken:false,detectSessionInUrl:false } };
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const report = { mode:'read-only scope correction',checks:0,passed:[],status:'running' };
const eq = (actual,expected,label) => { assert.deepEqual(actual,expected,label);report.checks++;report.passed.push(label); };
const demand = r => { if(r.error)throw Error('Read-only audit rejected: '+r.error.code);return r.data; };
const stable = v => v&&typeof v==='object'?Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash = rows => createHash('sha256').update(JSON.stringify(stable([...rows].sort((a,b)=>a.id.localeCompare(b.id))))).digest('hex');
const denied = r => r.error?.code==='PGRST202'||r.error?.message?.includes('permission denied for function')===true;
async function main(){
  const rows=demand(await db.from('products').select('*').order('id'));
  const original=rows.filter(p=>!ownedIds.includes(p.id));
  eq(original.length,80,'Original Product count unchanged');
  eq(hash(original),baselineHash,'Every original Product field, including weights, unchanged');
  eq(original.filter(p=>p.product_type==='sparepart'&&p.weight_grams===null).length,1,'Existing NULL Komponen weight untouched');
  eq(original.filter(p=>p.product_type==='b2b_system').every(p=>p.weight_grams===null),true,'Original B2B weights unchanged');
  const owned=rows.filter(p=>ownedIds.includes(p.id));
  eq(owned.length,3,'Three canonical QA rows preserved');
  eq(owned.every(p=>p.deleted_at!==null&&p.status==='draft'&&p.is_active===false&&p.is_store_visible===false),true,'QA Products remain archived/inactive/hidden');
  eq(demand(await db.from('product_translations').select('id').in('product_id',ownedIds)).length,0,'QA translations remain removed');
  eq(demand(await db.from('product_variants').select('id').in('product_id',ownedIds).is('deleted_at',null)).length,0,'No active QA variants');
  const orders=demand(await db.from('orders').select('order_code,notes,status,payment_status,midtrans_init_state,midtrans_order_id,midtrans_redirect_url,order_items(product_id)').in('order_code',codes));
  eq(orders.length,7,'All seven retained test orders preserved');
  eq(orders.every(o=>o.notes==='QA ATTRIBUTES001 '+run&&o.order_items.every(i=>ownedIds.includes(i.product_id))),true,'Retained order ownership unchanged');
  eq(orders.every(o=>o.status==='cancelled'&&o.payment_status==='pending'&&o.midtrans_init_state==='idle'&&o.midtrans_order_id===null&&o.midtrans_redirect_url===null),true,'Retained financial/gateway state untouched');
  const args={p_items:[],p_customer_name:'QA ATTRIBUTES001 READ ONLY ACL',p_shipping_address:{}};
  for(const [role,client]of [['anon',anon],['service_role',db]]){
    eq(denied(await client.rpc('create_checkout_order',args)),true,role+' base EXECUTE denied');
    eq(denied(await client.rpc('create_checkout_order_v2',{...args,p_idempotency_key:'00000000-0000-4000-8000-000000000001'})),true,role+' v2 EXECUTE denied');
  }
  const targets=await fetch('http://127.0.0.1:19657/json/list').then(r=>r.json()).catch(()=>[]);
  const target=targets.find(t=>t.type==='page'&&t.url.startsWith('http://localhost:3000/admin/'));
  if(target){
    const d=await connection(19657,target.id);
    try{
    const bundle=await esbuild.build({stdin:{resolveDir:root,loader:'js',contents:`
      import {createClient} from './utils/supabase/client';const client=createClient();
      window.__attributesScopeProbe=async name=>{
        if(!['create_checkout_order','create_checkout_order_v2'].includes(name))throw Error('Probe scope denied');
        const args={p_items:[],p_customer_name:'QA ATTRIBUTES001 READ ONLY ACL',p_shipping_address:{}};
        if(name==='create_checkout_order_v2')args.p_idempotency_key='00000000-0000-4000-8000-000000000001';
        const r=await client.rpc(name,args);return{code:r.error?.code,executeDenied:r.error?.code==='PGRST202'||r.error?.message?.includes('permission denied for function')===true};
      };
    `},bundle:true,write:false,platform:'browser',define:{'process.env.NEXT_PUBLIC_SUPABASE_URL':JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL),'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)}});
    await d.evaluate(bundle.outputFiles[0].text);
    eq((await d.evaluate("window.__attributesScopeProbe('create_checkout_order')")).executeDenied,true,'authenticated base EXECUTE denied');
    // Empty cart is rejected before locks, order lookup, stock or payment mutation.
    eq((await d.evaluate("window.__attributesScopeProbe('create_checkout_order_v2')")).code,'22023','authenticated v2 callable; empty cart safely rejected');
      report.authenticatedProbe={available:true,passed:true};
    }finally{await d.evaluate('delete window.__attributesScopeProbe');d.socket.close();}
  }else report.authenticatedProbe={available:false,reason:'Controlled browser is closed; authenticated ACL evidence remains the prior successful live audit. No login/account mutation attempted.'};
  const b2b=original.find(p=>p.product_type==='b2b_system'&&p.status==='published'&&p.deleted_at===null);
  const component=original.find(p=>p.product_type==='sparepart'&&p.status==='published'&&p.deleted_at===null&&p.is_active&&p.is_store_visible&&p.weight_grams>0);
  assert.ok(b2b&&component,'Existing published Products required for read-only layout smoke');
  const profile=fs.mkdtempSync(path.join(path.dirname(output),'attributes-scope-public-'));
  const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run','--remote-debugging-port=19664','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  let publicDriver;
  try{
    for(let i=0;i<100;i++){try{publicDriver=await connection(19664);break;}catch{await new Promise(r=>setTimeout(r,100));}}assert.ok(publicDriver,'Public read-only browser required');
    for(const [locale,prefix,title]of [['id','','Atribut Produk'],['en','/en','Product Attributes'],['zh-CN','/zh-cn','产品属性']]){
    const publicB2B=await fetch('http://localhost:3000'+prefix+'/products/'+encodeURIComponent(b2b.slug));
    eq(publicB2B.status,200,locale+' existing B2B detail still renders');const b2bHtml=await publicB2B.text();
    eq(b2bHtml.includes('aria-label="'+title+'"'),false,locale+' B2B has no attribute block');
    eq(b2bHtml.includes('minimumContext'),false,locale+' B2B does not receive attribute message namespace');
    const store=await fetch('http://localhost:3000'+prefix+'/store/'+encodeURIComponent(component.slug));
    eq(store.status,200,locale+' existing Komponen detail renders');const storeHtml=await store.text();
    eq(storeHtml.includes('minimumContext'),true,locale+' Store-scoped attribute messages available');
    await publicDriver.cdp('Page.navigate',{url:'http://localhost:3000'+prefix+'/products/'+encodeURIComponent(b2b.slug)});
    await publicDriver.wait('document.readyState==="complete"&&document.querySelector("main h1")');
    eq(await publicDriver.evaluate('document.querySelector('+JSON.stringify('dl[aria-label="'+title+'"]')+')===null'),true,locale+' hydrated B2B has no attribute block');
    await publicDriver.cdp('Page.navigate',{url:'http://localhost:3000'+prefix+'/store/'+encodeURIComponent(component.slug)});
    await publicDriver.wait('document.readyState==="complete"&&document.querySelector("main h1")');
    await publicDriver.wait('document.querySelector('+JSON.stringify('dl[aria-label="'+title+'"]')+')');
    eq(await publicDriver.evaluate('document.querySelector('+JSON.stringify('dl[aria-label="'+title+'"]')+')!==null'),true,locale+' hydrated Store attribute presentation retained');
    }
  }finally{publicDriver?.socket.close();browser.kill();}
  eq(hash(demand(await db.from('products').select('*').order('id')).filter(p=>!ownedIds.includes(p.id))),baselineHash,'Read-only probes preserve original Product baseline');
  report.status='passed';report.productCounts={total:rows.length,nonArchived:rows.filter(p=>p.deleted_at===null).length};report.retainedOrders=7;report.baselineHash=baselineHash;
  fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,report:output},null,2));
}
main().catch(e=>{report.status='failed';report.failure=e.message;fs.writeFileSync(output,JSON.stringify(report,null,2));console.error(e.message);process.exitCode=1;});
