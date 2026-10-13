/* eslint-disable @typescript-eslint/no-require-imports -- Actual TS server modules with isolated transport. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const root = path.resolve(__dirname,'..');
const base = 'https://recruitment.tekna.id/api/v1';
const aka = (id=2) => ({id,title:`IoT Engineer ${id}`,status:'Open',employment_type:'Contract',location:'Semarang',
  salary:{min:6000000,max:10000000,currency:'IDR',formatted:'Rp 6.000.000 - Rp 10.000.000'},quota:1,deadline:'2026-10-31',
  deadline_info:{is_active:true,is_expired:false,days_remaining:26,badge:{status:'open',label:'Batas: 31 Oct 2026',color:'emerald'}},
  company:{id:2,name:'PT Autentik Karya Analitika',logo:'https://res.cloudinary.com/demo/logo.png',city:'Semarang'},
  department:{id:4,name:'Engineering'},description:'Mengembangkan IoT.',apply_url:`https://recruitment.tekna.id/lowongan/${id}`});
const foreign = (id,company) => ({...aka(id),company:{...aka().company,id:company,name:company===1?'PT Mitra Karya Analitika':'PT Sapujagat Nirmana Tekna'}});
const json = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
function harness(options={}) {
  const modules=new Map();const requests=[];const dbReads=[];const authCalls=[];
  const data=options.jobs??[aka()];
  const fetcher=async(url,init)=>{
    const parsed=new URL(String(url));requests.push({url:parsed,init});
    if(options.unavailable)return json({success:false},503);
    if(options.fetch) return options.fetch(parsed,init);
    if(/\/jobs\/\d+$/.test(parsed.pathname)) {
      const job=data.find(job=>String(job.id)===parsed.pathname.split('/').at(-1));
      return job?json({success:true,data:job,related_jobs:options.related??[]}):json({success:false},404);
    }
    assert.ok(parsed.pathname.endsWith('/jobs'),'Unexpected unscoped discovery request');
    const page=Number(parsed.searchParams.get('page'));const per=Number(parsed.searchParams.get('per_page'));
    const selected=options.ignoreScope?data:data.filter(job=>job.company?.id===Number(parsed.searchParams.get('company_id')));
    const totalPages=Math.max(1,Math.ceil(selected.length/per));
    return json({success:true,data:selected.slice((page-1)*per,page*per),meta:{current_page:page,per_page:per,total_items:selected.length,total_pages:totalPages,has_next:page<totalPages,has_prev:page>1},links:{next:'https://evil.example/jobs?company_id=1'}});
  };
  const query=(table)=>{
    dbReads.push(table);
    if(table==='careers')throw new Error('UNVERIFIED_LEGACY_QUERY');
    const q={select:()=>q,eq:()=>q,is:()=>q,order:()=>q,limit:()=>q,in:()=>q,
      maybeSingle:async()=>({data:{value:{url:options.recruitmentUrl??'https://recruitment.tekna.id/'}},error:null}),
      then:(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject)};
    return q;
  };
  const stubs={
    'next-intl/server':{getLocale:async()=> 'id',getTranslations:async input=>require('use-intl/core').createTranslator({locale:'id',messages:{home:require('../messages/id/home.json'),company:require('../messages/id/company.json'),common:require('../messages/id/common.json'),navigation:require('../messages/id/navigation.json')},namespace:typeof input==='string'?input:input?.namespace})},
    'next-intl/middleware':require('./i18n-middleware-fixture.cjs'),
    '@/i18n/navigation':{__esModule:true,default:props=>require('react').createElement('a',props)},
    'next/headers':{cookies:async()=>({})},'next/navigation':{notFound:()=>{throw new Error('NOT_FOUND')}},
    '@/utils/supabase/server':{createClient:()=>({from:query})},
    '@/utils/supabase/admin':{createAdminClient:()=>{throw new Error('UNEXPECTED_SERVICE_ROLE')}},
    '@/utils/supabase/middleware':{createClient:request=>{
      authCalls.push('createClient');const response=require('next/server').NextResponse.next({request:{headers:request.headers}});
      response.cookies.set('fixture-refresh','preserved',{path:'/',httpOnly:true});
      return {supabaseResponse:response,supabase:{auth:{getUser:async()=>{authCalls.push('getUser');return {data:{user:null}}}}}};
    }},
  };
  if(options.realPresentation)stubs['next/link']={__esModule:true,default:props=>require('react').createElement('a',props)};
  const components=new Map();
  function load(name,parent=path.join(root,'index.ts')) {
    if(name.startsWith('@/app/(site)/'))name=name.replace('@/app/(site)/','@/app/(public)/[locale]/(site)/');
    if(stubs[name])return stubs[name];
    if((name.startsWith('@/components/')&&!options.realPresentation)||name==='./CareersClient'||name==='@/components/ui/ScrollAnimations') {
      if(!components.has(name)){const Component=props=>options.realPresentation?require('react').createElement('div',{className:props.className},props.children):null;Component.fixtureName=name;components.set(name,{__esModule:true,default:Component});}
      return components.get(name);
    }
    if(!name.startsWith('@/')&&!name.startsWith('.'))return require(name);
    const filenameBase=name.startsWith('@/')?path.join(root,name.slice(2)):path.resolve(path.dirname(parent),name);
    const filename=[filenameBase,filenameBase+'.ts',filenameBase+'.tsx'].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile());
    assert.ok(filename,`Missing source ${name}`);
    if(filename.endsWith('.json'))return JSON.parse(fs.readFileSync(filename,'utf8'));
    if(modules.has(filename))return modules.get(filename).exports;
    const loadedModule={exports:{}};modules.set(filename,loadedModule);
    const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    vm.runInNewContext(output,{module:loadedModule,exports:loadedModule.exports,require:specifier=>load(specifier,filename),console,
      process:{env:{MIKA_API_BASE_URL:base,NEXT_PUBLIC_SITE_URL:'https://aka.example.com',NODE_ENV:'production',
        ...(options.withSession?{NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key'}:{})}},
      fetch:fetcher,URL,URLSearchParams,Headers,Response,AbortSignal,Date,setTimeout,clearTimeout},{filename});
    return loadedModule.exports;
  }
  return {load,requests,dbReads,authCalls};
}
function elements(node) {
  const result=[];
  const visit=value=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object'&&value.props){result.push(value);visit(value.props.children)}};
  visit(node);return result;
}
async function main() {
  let checks=0;
  for(const jobs of [[],[aka()],[aka(42),aka(73)],[foreign(5,1),aka(42),foreign(3,3)]]) {
    const h=harness({jobs,ignoreScope:true});const result=await h.load('@/lib/api/mika-career').getMikaJobs();
    assert.equal(result.success,true);assert.equal(result.data.length,jobs.filter(job=>job.company.id===2).length);
    assert.equal(result.meta.total_items,result.data.length);assert.ok(result.data.every(job=>job.company.id===2));checks++;
  }
  for(const patch of [{company:undefined},{company:null},{company:[]},{company:'AKA'},{company:{...aka().company,id:'2'}},{company:{...aka().company,id:1}},
    {status:'Closed'},{status:undefined},{status:'open'},{deadline_info:{...aka().deadline_info,is_active:false}},
    {deadline_info:{...aka().deadline_info,is_expired:true}},{deadline_info:{...aka().deadline_info,is_active:'true'}},
    {deadline_info:null},{salary:null},{company:{...aka().company,name:'PT Mitra Karya Analitika'}}]) {
    const h=harness({jobs:[{...aka(),...patch}],ignoreScope:true});const api=h.load('@/lib/api/mika-career');
    assert.equal((await api.getMikaJobs()).data.length,0);
    const detail=await api.getMikaJobDetail(2);assert.notEqual(detail.status,'found');checks++;
  }
  for(const company of [1,3,999,'all','2&company_id=1',{malformed:true}]) {
    const h=harness();await h.load('@/lib/api/mika-career').getMikaJobs({company_id:company,company:'TEKNA',page:1,per_page:10});
    assert.ok(h.requests.every(request=>request.url.searchParams.get('company_id')==='2'));
    assert.ok(h.requests.every(request=>request.init.next.revalidate===60));checks++;
  }
  const paged=harness({jobs:Array.from({length:61},(_,i)=>i%3===0?foreign(i+1,3):aka(i+1)),ignoreScope:true});
  const paginationApi=paged.load('@/lib/api/mika-career');
  const expected=40;
  for(const page of [1,2,4]) {
    const result=await paginationApi.getMikaJobs({page,per_page:10,company_id:1});
    assert.equal(result.meta.total_items,expected);assert.equal(result.meta.total_pages,4);
    assert.equal(result.data.length,10);assert.equal(result.meta.current_page,page);assert.ok(result.data.every(job=>job.company.id===2));checks++;
  }
  assert.ok(paged.requests.some(request=>request.url.searchParams.get('page')==='2'&&request.url.searchParams.get('per_page')==='50'));
  assert.ok(paged.requests.every(request=>request.url.origin===new URL(base).origin&&request.url.searchParams.get('company_id')==='2'));
  for(const company of ['1','3','999','all','garbage']) {
    const h=harness({jobs:[foreign(5,1),aka(42),foreign(3,3)]});const route=h.load('@/app/api/careers/jobs/route');
    const response=await route.GET({nextUrl:new URL(`https://aka.example.com/api/careers/jobs?company_id=${company}&company=all`)});
    const body=await response.json();assert.equal(body.data.length,1);assert.equal(body.data[0].id,42);
    assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(h.requests.every(request=>request.url.searchParams.get('company_id')==='2'));checks++;
  }
  for(const unavailable of [false,true]) {
    const h=harness({jobs:[],unavailable});const result=await h.load('@/lib/public-data').getPublicCareerListings();
    assert.equal(result.response.success,!unavailable);assert.deepEqual(h.dbReads,[],'No Supabase fallback may even be queried');
    const page=await h.load('@/app/(site)/careers/page').default();assert.equal(page.props.available,!unavailable);
    const response=await h.load('@/app/api/careers/jobs/route').GET({nextUrl:new URL('https://aka.example.com/api/careers/jobs')});
    assert.equal(response.status,unavailable?503:200);checks++;
  }
  for(const job of [foreign(5,1),foreign(3,3),{...aka(),company:null},{...aka(),status:'Closed'}]) {
    const h=harness({jobs:[job]});const page=h.load('@/app/(site)/careers/[slug]/page');const props={params:Promise.resolve({slug:String(job.id)})};
    await assert.rejects(()=>page.default(props),/NOT_FOUND/);await assert.rejects(()=>page.generateMetadata(props),/NOT_FOUND/);
    assert.ok(!h.dbReads.includes('careers'));checks++;
  }
  const detailHarness=harness({jobs:[aka(42)],related:[foreign(3,3),aka(73),{...aka(99),deadline_info:{...aka().deadline_info,is_expired:true}}]});
  const detailPage=detailHarness.load('@/app/(site)/careers/[slug]/page');
  const tree=await detailPage.default({params:Promise.resolve({slug:'42'})});
  const nodes=elements(tree);const structured=nodes.find(node=>node.type.fixtureName==='@/components/seo/JsonLd');
  assert.equal(structured.props.data.hiringOrganization.name,'PT Autentik Karya Analitika');
  const relatedCards=nodes.filter(node=>node.type.fixtureName==='@/components/careers/MikaJobCard');
  assert.deepEqual(relatedCards.map(node=>node.props.job.id),[73]);
  assert.ok(nodes.some(node=>node.type==='a'&&node.props.href==='https://recruitment.tekna.id/lowongan/42'));checks++;
  const h=harness();const api=h.load('@/lib/api/mika-career');
  const canonical='https://recruitment.tekna.id/lowongan/42';assert.equal(api.getMikaApplyUrl(canonical),canonical);
  for(const url of ['javascript:alert(1)','data:text/html,x','https://user:pass@recruitment.tekna.id/lowongan/42','https://evil.example/lowongan/42','http://recruitment.tekna.id/lowongan/42','//recruitment.tekna.id/lowongan/42','bad']) {
    assert.equal(api.getMikaApplyUrl(url),null);checks++;
  }
  const urlPolicy=h.load('@/lib/recruitment-url');
  const urlSchema=h.load('@/lib/validations/recruitmentSchema').recruitmentSchema;
  for(const url of [canonical,'https://RECRUITMENT.TEKNA.ID:443/lowongan/42',
    'https://evil.example/collect','https://recruitment.tekna.id.evil.example/collect',
    'https://user:pass@recruitment.tekna.id/lowongan/42','http://recruitment.tekna.id/lowongan/42',
    'javascript:alert(1)','data:text/html,x','//recruitment.tekna.id/lowongan/42','bad']) {
    const allowed=[canonical,'https://RECRUITMENT.TEKNA.ID:443/lowongan/42'].includes(url);
    assert.equal(urlPolicy.getSafeRecruitmentUrl(url)!==null,allowed);
    assert.equal(urlSchema.safeParse({url}).success,allowed,'CMS validation shares the same origin policy');checks++;
  }
  for(const test of [
    {api:null,setting:'https://recruitment.tekna.id/',expected:'https://recruitment.tekna.id/'},
    {api:null,setting:'https://evil.example/collect',expected:'/contact'},
    {api:'https://evil.example/apply',setting:'https://evil.example/collect',expected:'/contact'},
    {api:null,setting:'https://user:pass@recruitment.tekna.id/',expected:'/contact'},
    {api:null,setting:'http://recruitment.tekna.id/',expected:'/contact'},
    {api:null,setting:'https://recruitment.tekna.id.evil.example/',expected:'/contact'},
    {api:canonical,setting:'https://evil.example/collect',expected:canonical},
    {api:'javascript:alert(1)',setting:'https://recruitment.tekna.id/',expected:'https://recruitment.tekna.id/'},
  ]) {
    const fallback=harness({jobs:[{...aka(42),apply_url:test.api}],recruitmentUrl:test.setting});
    const stored=await fallback.load('@/lib/public-data').getRecruitmentUrl();
    assert.equal(stored,urlPolicy.getSafeRecruitmentUrl(test.setting),'Stored legacy setting is revalidated at read time');
    const page=await fallback.load('@/app/(site)/careers/[slug]/page').default({params:Promise.resolve({slug:'42'})});
    const anchors=elements(page).filter(node=>node.type==='a');
    assert.ok(anchors.some(node=>node.props.href===test.expected));
    assert.ok(anchors.every(node=>node.props.href==='/contact'||urlPolicy.getSafeRecruitmentUrl(node.props.href)!==null),'No foreign setting can become an application anchor');checks++;
  }
  const React=require('react');const renderer=require('react-dom/server');
  const asText=value=>renderer.renderToStaticMarkup(React.createElement('span',null,value)).replace(/^<span>/,'').replace(/<\/span>$/,'');
  const convert=harness().load('@/lib/html-to-plain-text').htmlToPlainText;
  for(const [description,plain] of [
    ['<p>Pengalaman dengan ESP32 dan Arduino.</p>','Pengalaman dengan ESP32 dan Arduino.'],
    ['<p>a</p><p>b</p>','a\n\nb'],
    ['<p>Paragraf biasa</p><ul><li>Daftar biasa</li></ul>','Paragraf biasa\n\nDaftar biasa'],
    ['<ul><li>one</li><li>two</li></ul>','one\ntwo'],
    ['<p>a</p>\n<p>b</p>','a\n\nb'],
    ['<script>window.__aka_xss=1</script>',''],
    ['</script><img src=x onerror=window.__aka_xss=1>',''],
    ['<img src=x onerror=window.__aka_xss=1>',''],
    ['<p onclick=window.__aka_xss=1>Klik</p>','Klik'],
    ['<a href="javascript:window.__aka_xss=1">Lamar</a>','Lamar'],
    ['<iframe src="https://evil.example/collect"></iframe>',''],
    ['<svg onload=window.__aka_xss=1><script>window.__aka_xss=1</script></svg>',''],
    ['<a href="data:text/html,x" target="_blank">Lamar</a>','Lamar'],
    ['Pengalaman &lt;b&gt;IoT&lt;/b&gt; &amp; firmware','Pengalaman <b>IoT</b> & firmware'],
    ['Gaji &lt; 10 juta &amp; bonus &gt; 5%','Gaji < 10 juta & bonus > 5%'],
    ['<p>esc &lt;/script&gt; end</p>','esc </script> end'],
  ]) {
    assert.equal(convert(description),plain,'HTML description converts to readable plain text');
    const escaped=harness({jobs:[{...aka(42),description}],realPresentation:true});
    const tree=await escaped.load('@/app/(site)/careers/[slug]/page').default({params:Promise.resolve({slug:'42'})});
    const html=renderer.renderToStaticMarkup(tree);
    const jsonLd=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLd,'JobPosting remains available');
    const structured=JSON.parse(jsonLd[1]);
    assert.equal(structured.description,plain||structured.title,'Script-context encoding preserves readable structured data');
    const descriptionParagraphs=elements(tree).filter(node=>node.type==='p'&&typeof node.props.className==='string'&&node.props.className.includes('whitespace-pre-line'));
    if(plain) {
      assert.ok(html.includes(asText(plain)),'Readable description is rendered as React-escaped text');
      assert.equal(descriptionParagraphs.length,1,'Exactly one description paragraph is rendered');
      const rendered=descriptionParagraphs[0].props.children;
      assert.equal(Array.isArray(rendered)?rendered.join(''):rendered,plain,'Description reaches React as a plain-text child');
    } else {
      assert.ok(!html.includes('Deskripsi Pekerjaan'),'A description that converts to nothing renders no section');
      assert.deepEqual(descriptionParagraphs,[],'No description paragraph is rendered');
    }
    assert.ok(!html.includes('&lt;p&gt;'),'Literal markup tags must never reach the rendered page');
    assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(html),'No script node can be created from a description');
    assert.ok(!/on(?:error|load|click)\s*=/.test(html),'No event attribute can be created from a description');
    assert.ok(!html.includes('<iframe')&&!html.includes('javascript:'),'No iframe or javascript: URL can be created from a description');checks++;
  }
  const pageSource=fs.readFileSync(path.join(root,'app/(public)/[locale]/(site)/careers/[slug]/page.tsx'),'utf8');
  assert.doesNotMatch(pageSource,/dangerouslySetInnerHTML/,'No HTML injection sink remains in job detail');checks++;
  const snapshotCase=(kind)=>harness({fetch:async parsed=>{
    const page=Number(parsed.searchParams.get('page'));const per=Number(parsed.searchParams.get('per_page'));
    const total=kind==='over-capacity'?1001:kind==='empty-intermediate'?150:100;
    const reported=kind==='changed-total'&&page===2?99:total;
    const all=Array.from({length:reported},(_,i)=>kind==='complete-mixed'&&i%5===0?foreign(i+1,3):aka(i+1));
    let data=all.slice((page-1)*per,page*per);
    if(kind==='repeated-page'&&page===2)data=all.slice(0,per);
    if(kind==='cross-page-duplicate'&&page===2)data[0]=aka(50);
    if(kind==='within-page-duplicate'&&page===1&&data.length>1)data[1]=aka(1);
    if(kind==='numeric-alias-duplicate'&&page===2)data[0]={...aka(1),id:'01'};
    if(kind==='empty-intermediate'&&page===2)data=[];
    if(kind==='unidentifiable-row'&&page===1)data[0]={...aka(1),id:'bad'};
    if(kind==='short-page'&&page===1)data=data.slice(0,-1);
    const pages=Math.max(1,Math.ceil(reported/per));
    return json({success:true,data,meta:{current_page:kind==='wrong-page'&&page===2?1:page,per_page:per,total_items:reported,total_pages:pages,
      has_next:kind==='impossible-next'&&page===2?true:page<pages,has_prev:page>1}});
  }});
  for(const kind of ['repeated-page','cross-page-duplicate','within-page-duplicate','numeric-alias-duplicate','changed-total',
    'empty-intermediate','unidentifiable-row','short-page','wrong-page','impossible-next','over-capacity']) {
    const invalid=snapshotCase(kind);
    assert.equal(await invalid.load('@/lib/api/mika-career').getAllPublicMikaJobs(),null,`Incomplete snapshot must be discarded: ${kind}`);
    const entries=await invalid.load('@/app/sitemap').default();
    assert.equal(entries.filter(entry=>entry.url.includes('/careers/')).length,0,`No partial sitemap: ${kind}`);
    const listing=await invalid.load('@/lib/api/mika-career').getMikaJobs({page:1,per_page:10});
    assert.equal(listing.success,false,`Invalid reconciliation must be unavailable: ${kind}`);checks++;
  }
  for(const kind of ['complete','complete-mixed']) {
    const complete=snapshotCase(kind);const snapshot=await complete.load('@/lib/api/mika-career').getAllPublicMikaJobs();
    assert.equal(snapshot.length,kind==='complete'?100:80);
    assert.equal(new Set(snapshot.map(job=>job.id)).size,snapshot.length);
    assert.ok(snapshot.every(job=>job.company.id===2));
    assert.ok(complete.requests.every(request=>request.url.searchParams.get('company_id')==='2'));checks++;
  }
  const extra=harness({jobs:[{...aka(),related_jobs:[foreign(5,1)],unexpected:{job:foreign(3,3)},company:{...aka().company,unexpected:foreign(5,1)}}]});
  assert.doesNotMatch(JSON.stringify((await extra.load('@/lib/api/mika-career').getMikaJobs()).data),/Mitra|Sapujagat|unexpected|related_jobs/);checks++;
  for(const unavailable of [false,true]) {
    const sitemapHarness=harness({jobs:[aka(42),foreign(3,3)],ignoreScope:true,unavailable});
    const entries=await sitemapHarness.load('@/app/sitemap').default();
    const dynamic=entries.filter(entry=>entry.url.includes('/careers/'));
    assert.deepEqual(Array.from(dynamic,entry=>entry.url),unavailable?[]:['https://aka.example.com/careers/42','https://aka.example.com/en/careers/42','https://aka.example.com/zh-cn/careers/42']);
    for(const entry of dynamic)assert.equal(entry.alternates.languages['x-default'],'https://aka.example.com/careers/42');
    assert.ok(!sitemapHarness.dbReads.includes('careers'));checks++;
  }
  const brokenSnapshot=harness({fetch:async parsed=>{
    const page=Number(parsed.searchParams.get('page'));const per=Number(parsed.searchParams.get('per_page'));
    return page===2?json({success:false},503):json({success:true,data:Array.from({length:per},(_,i)=>aka(i+1)),meta:{current_page:page,per_page:per,total_items:51,total_pages:Math.ceil(51/per),has_next:true,has_prev:false}});
  }});
  assert.equal(await brokenSnapshot.load('@/lib/api/mika-career').getAllPublicMikaJobs(),null,'A failed page cannot yield a partial sitemap');checks++;
  const searchSource=fs.readFileSync(path.join(root,'components/layout/SearchModal.tsx'),'utf8');
  assert.doesNotMatch(searchSource,/\.from\(["']careers["']\)/);assert.match(searchSource,/\/api\/careers\/jobs/);checks++;
  const homepage=harness({jobs:[foreign(5,1),aka(42),foreign(3,3)],ignoreScope:true});
  const homeNodes=elements(await homepage.load('@/app/(site)/page').default());
  const homeCareers=homeNodes.find(node=>node.type.fixtureName==='@/components/home/HomeCareers');
  assert.deepEqual(Array.from(homeCareers.props.items,job=>job.id),[42]);assert.equal(homeCareers.props.available,true);checks++;
  for(const prefix of ['', '/en', '/zh-cn'])for(const slug of ['42','3','5','legacy-job','%34%32','missing.json','missing.pdf']){
    const routing=harness({jobs:[aka(42),foreign(3,3),foreign(5,1)],withSession:true});
    const response=await routing.load('@/proxy').proxy(new NextRequest(`https://aka.example.com${prefix}/careers/${slug}`));
    const allowed=['42','%34%32'].includes(slug);
    assert.equal(response.status,allowed?200:404);assert.equal(response.cookies.get('fixture-refresh').value,'preserved');
    assert.deepEqual(routing.authCalls,['createClient','getUser'],'Existing auth refresh must run before routing');
    if(!allowed){assert.equal(response.headers.get('x-robots-tag'),'noindex');assert.doesNotMatch(await response.text(),/JobPosting|Mitra|Sapujagat/);}checks++;
  }
  for(const pathname of ['/api/careers/jobs','/careers','/store/checkout','/auth/callback','/admin/orders','/products/test']){
    const routing=harness({withSession:true});const response=await routing.load('@/proxy').proxy(new NextRequest('https://aka.example.com'+pathname));
    if(['/careers','/store/checkout','/products/test'].includes(pathname))assert.ok(response.headers.get('x-middleware-rewrite'));
    else assert.equal(response.headers.get('x-middleware-next'),'1');assert.equal(routing.requests.length,0);
    assert.deepEqual(routing.authCalls,['createClient','getUser']);checks++;
  }
  const outageRouting=harness({unavailable:true,withSession:true});
  const outageResponse=await outageRouting.load('@/proxy').proxy(new NextRequest('https://aka.example.com/careers/42'));
  assert.ok(outageResponse.headers.get('x-middleware-rewrite'),'Outage must reach the locale-aware unavailable page');checks++;
  console.log(`PASS: ${checks} AKA careers scenarios using actual API/server/proxy/page/metadata/sitemap modules. Transport only is mocked; no backend or database mutations.`);
}
module.exports={harness,aka,foreign,elements};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1});
