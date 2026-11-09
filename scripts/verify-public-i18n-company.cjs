/* eslint-disable @typescript-eslint/no-require-imports -- Actual message loader and UI; backend transport is isolated in fixtures. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {NextIntlClientProvider} = require('next-intl');
const {createTranslator} = require('use-intl/core');
const {execFileSync,spawn} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const mocks = new Map([
  ['@/components/ui/ScrollAnimations',{__esModule:true,default:({children,...props})=>React.createElement('div',props,children)}],
  ['@/components/home/ScrollAnimations',{__esModule:true,default:({children,...props})=>React.createElement('div',props,children)}],
  ['@/i18n/navigation',{__esModule:true,default:({href,children,...props})=>React.createElement('a',{...props,href},children)}],
  ['next/image',{__esModule:true,default:({src,alt,width,height,className})=>React.createElement('img',{src,alt,width,height,className})}],
  ['@/components/ThemeProvider',{useTheme:()=>({theme:'light'})}],
  ['@/components/ui/CompanyProfileViewer',{__esModule:true,default:({manifest})=>React.createElement('div',{'data-document-url':manifest?.pdfUrl},manifest?.title)}],
  ['@/components/layout/DocumentRoot',{__esModule:true,default:({children})=>children}],
]);
let activeLocale='id';const catalogs={};let projection;
mocks.set('next-intl/server',{
  getLocale:async()=>activeLocale,
  getTranslations:async input=>createTranslator({locale:typeof input==='object'?input.locale??activeLocale:activeLocale,messages:catalogs[typeof input==='object'?input.locale??activeLocale:activeLocale],namespace:typeof input==='string'?input:input?.namespace}),
});
mocks.set('next/headers',{cookies:async()=>({})});
mocks.set('@/utils/supabase/server',{createClient:()=>({from:()=>{const query={select:()=>query,eq:()=>query,is:()=>query,in:async()=>({data:[],error:null}),maybeSingle:async()=>({data:{value:projection.manifest}})};return query;}})});
mocks.set('@/lib/public-data',{
  listPublicBrands:async()=>projection.brands,getPublicCareerListings:async()=>({response:{data:projection.jobs,success:true}}),
  getHomepageFeaturedProducts:async()=>projection.products,listPublicProductsByType:async()=>projection.products,
  listPublicDistributionEntities:async()=>projection.distribution,getWhatsAppContact:async()=>({number:'628123456789'}),
  resolveHeroSlides:products=>products.length?products.map(p=>({key:p.id,badge:p.brand,subtitle:p.description,ctaLink:'/products/'+p.slug,ctaLabel:'Lihat Produk',productImage:p.image_url,productName:p.name,accentColor:'#0EA5A0',isCompanyFallback:false})):[{key:'company',badge:'Perusahaan Manufaktur',subtitle:'Produsen produk teknologi industri Indonesia.',ctaLink:'/products',ctaLabel:'Lihat Produk',productImage:null,productName:'PT Autentik Karya Analitika',accentColor:'#0EA5A0',isCompanyFallback:true}],
  listPublicGroups:async()=>projection.groups,listPublicPartners:async()=>projection.partners,listPublicTeamMembers:async()=>projection.team,
});
function load(file) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename); compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, compiled);
  const native = compiled.require.bind(compiled);
  compiled.require = name => {
    if(mocks.has(name))return mocks.get(name);
    if (name.startsWith('@/')) return path.extname(name) ? native(path.join(root,name.slice(2))) : load(name.slice(2)+(fs.existsSync(path.join(root,name.slice(2)+'.ts'))?'.ts':'.tsx'));
    if (name.startsWith('.') && !path.extname(name)) {const target=path.resolve(path.dirname(filename),name);return load(path.relative(root,target)+(fs.existsSync(target+'.ts')?'.ts':'.tsx'));}
    return native(name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
  return compiled.exports;
}
let checks=0;
function equal(actual,expected,label){assert.deepEqual(actual,expected,label);checks++;}
function leaves(value,prefix=''){return Object.fromEntries(Object.entries(value).flatMap(([key,item])=>typeof item==='string'?[[prefix+key,item]]:Object.entries(leaves(item,prefix+key+'.'))));}
async function resolveServer(node){
  if(Array.isArray(node))return Promise.all(React.Children.toArray(node).map(resolveServer));
  if(!React.isValidElement(node))return node;
  if(typeof node.type==='function'&&node.type.constructor.name==='AsyncFunction'){
    const rendered=await resolveServer(await node.type(node.props));
    return React.isValidElement(rendered)&&node.key!==null?React.cloneElement(rendered,{key:node.key}):rendered;
  }
  if(node.props.children!==undefined)return React.cloneElement(node,{...node.props,children:await resolveServer(node.props.children)});
  return node;
}
async function renderPage(file){return renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale:activeLocale,timeZone:'Asia/Jakarta',messages:{common:catalogs[activeLocale].common,navigation:catalogs[activeLocale].navigation}},await resolveServer(await load(file).default())));}
async function main(){
  const {mergeMessages}=load('i18n/messages.ts');
  equal(typeof mergeMessages,'function','Nested Indonesian fallback is implemented');
  const base={hero:{title:'Judul',cta:'Lihat Produk'},items:['satu','dua']};
  const original=JSON.stringify(base);
  equal(mergeMessages(base,{hero:{title:'Title'},items:['one']}),{hero:{title:'Title',cta:'Lihat Produk'},items:['one']},'Missing nested leaf preserves translated sibling; arrays replace atomically');
  equal(mergeMessages(base,{hero:{cta:'查看产品'}}),{hero:{title:'Judul',cta:'查看产品'},items:['satu','dua']},'Chinese leaf and Indonesian sibling');
  equal(mergeMessages(base,{hero:{title:''}}).hero.title,'Judul','Blank leaf falls back safely');
  equal(JSON.stringify(base),original,'Fallback never mutates source catalog');
  for(const locale of ['id','en','zh-CN'])catalogs[locale]=await load('i18n/messages.ts').loadMessages(locale);
  for(const namespace of ['home','company','documents'])for(const locale of ['en','zh-CN']){
    const base=leaves(require(path.join(root,'messages/id',namespace+'.json'))),translated=leaves(require(path.join(root,'messages',locale,namespace+'.json')));
    equal(Object.keys(translated).sort(),Object.keys(base).sort(),'Nested semantic key parity');
    for(const key of Object.keys(base)){
      equal(translated[key].trim().length>0,true,'Nonblank message '+locale+'/'+key);
      equal((translated[key].match(/\{[a-zA-Z]+\}/g)??[]).sort(),(base[key].match(/\{[a-zA-Z]+\}/g)??[]).sort(),'Interpolation parity '+key);
      equal((translated[key].match(/<\/?[a-zA-Z]+>/g)??[]).sort(),(base[key].match(/<\/?[a-zA-Z]+>/g)??[]).sort(),'Rich-tag parity '+key);
    }
  }
  const messages=catalogs.en;
  const AboutUs=load('components/home/AboutUs.tsx').default;
  const html=renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale:'en',messages,timeZone:'Asia/Jakarta'},React.createElement(AboutUs)));
  equal(html.includes(messages.home.aboutUs.eyebrow),true,'Home company introduction responds to English locale');
  projection={
    products:[{id:'product-1',slug:'model-ss1500',product_type:'b2b_system',status:'published',is_active:true,deleted_at:null,translation_source_revision:1,features:[],specs:[],seo_title:null,seo_description:null,name:'PERANGKAT ASLI SS1500',description:'Deskripsi produk asli dari CMS.',brand:'TALPHA',category:'Kategori Asli',image_url:null,model_3d_url:'/models/original.glb'}],
    brands:[{id:'talpha',name:'TALPHA',brandFilter:'TALPHA',logoSrc:'/images/brand-light.png',logoSrcDark:'/images/brand-dark.png'}],
    distribution:[{id:'distribution-1',name:'PT DISTRIBUTOR ASLI',description:'Deskripsi distribusi asli.',marketSegment:'Segmen asli',distributionType:'group_distribution'}],
    jobs:[{id:123,title:'POSISI ASLI',description:'Deskripsi lowongan asli.',employment_type:'Contract',department:{name:'Departemen Asli'},company:{name:'PT Autentik Karya Analitika'},location:'Lokasi Asli'}],
    team:[{id:'team-1',name:'ANGGOTA ASLI',role:'Jabatan asli CMS',imageUrl:null}],
    groups:[{id:'group-1',name:'GRUP ASLI',legalName:'PT GRUP ASLI'}],partners:[{id:'partner-1',name:'PARTNER ASLI',shortName:'PARTNER ASLI'}],
    manifest:{title:'JUDUL PDF ASLI',pdfUrl:'https://fixture.supabase.co/original.pdf',pdfFilename:'original.pdf'},
  };
  const originalProjection=JSON.stringify(projection);
  const Brands=load('components/home/Brands.tsx').default;
  for(const locale of ['id','en','zh-CN'])for(const theme of ['light','dark']){
    mocks.get('@/components/ThemeProvider').useTheme=()=>({theme});
    const brandHtml=renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale,timeZone:'Asia/Jakarta',messages:catalogs[locale]},React.createElement(Brands,{items:projection.brands})));
    equal(brandHtml.includes(theme==='dark'?'/images/brand-dark.png':'/images/brand-light.png'),true,'Brand light/dark source mapping preserved');
    equal(brandHtml.includes('href="/products?brand=TALPHA"'),true,'Canonical brand filter retained');
    equal(brandHtml.includes('alt="TALPHA"'),true,'Brand identity remains original');
  }
  mocks.get('@/components/ThemeProvider').useTheme=()=>({theme:'light'});
  for(const locale of ['id','en','zh-CN']){
    activeLocale=locale;
    const home=await renderPage('app/(public)/[locale]/(site)/page.tsx');
    for(const value of ['PERANGKAT ASLI SS1500','Deskripsi produk asli dari CMS.','PT DISTRIBUTOR ASLI','Deskripsi distribusi asli.','Segmen asli','POSISI ASLI','Deskripsi lowongan asli.','Departemen Asli','Lokasi Asli'])equal(home.includes(value),true,'CMS/external text preserved '+locale);
    for(const value of [catalogs[locale].home.hero.portfolioLabel,catalogs[locale].home.hero.viewProduct,catalogs[locale].home.hero.quotation,catalogs[locale].home.featured.title,catalogs[locale].home.solutions.title,catalogs[locale].home.careers.title])equal(home.includes(value.replace(/&/g,'&amp;')),true,'Localized home presentation '+locale);
    equal(home.includes('/products/model-ss1500'),true,'Product identity URL unchanged');
    const about=await renderPage('app/(public)/[locale]/(site)/about/page.tsx');
    for(const value of ['ANGGOTA ASLI','Jabatan asli CMS','GRUP ASLI','PT GRUP ASLI','PARTNER ASLI','JUDUL PDF ASLI','https://fixture.supabase.co/original.pdf','FIRST','ISO 9001:2015','Smart Technology is Yours'])equal(about.includes(value),true,'About entity/document identity preserved');
    for(const value of [catalogs[locale].company.about.vision,catalogs[locale].company.about.mission.opportunities,catalogs[locale].company.about.quality.title])equal(about.includes(value),true,'Selected-language About content');
    for(const [letter,title] of [['F','Faith in God'],['I','Innovative'],['R','Resilience'],['S','Service'],['T','Totality']])equal(about.includes(title),true,'English FIRST title '+locale+'/'+letter);
    for(const letter of ['F','I','R','S','T'])equal(about.includes(catalogs[locale].company.about.values[letter].description),true,'Localized FIRST description '+locale+'/'+letter);
    equal([...about.matchAll(/class="text-6xl font-black text-slate-300[^"]*"[^>]*>([FIRST])<\/div>/g)].map(match=>match[1]).join(''),'FIRST','FIRST card letters '+locale);
    for(const other of ['id','en','zh-CN'].filter(value=>value!==locale))equal(about.includes(catalogs[other].company.about.vision),false,'No parallel translated vision');
    const metadata=await load('app/(public)/[locale]/(site)/page.tsx').generateMetadata();
    equal(metadata.title,catalogs[locale].home.metadata.title,'Localized Home title');
    equal(metadata.openGraph.description,catalogs[locale].home.metadata.description,'Localized OG description');
    equal(metadata.openGraph.type,'website','Inherited OG type');
    equal(metadata.alternates.languages['x-default'],'/','Default alternate preserved');
    const aboutMetadata=await load('app/(public)/[locale]/(site)/about/page.tsx').generateMetadata();
    equal(aboutMetadata.title,catalogs[locale].company.metadata.title,'Localized About title');
    equal(aboutMetadata.alternates.canonical,locale==='en'?'/en/about':locale==='zh-CN'?'/zh-cn/about':'/about','About self canonical');
    equal(JSON.stringify(projection),originalProjection,'Entity payload never mutated');
  }
  activeLocale='zh-CN';const products=projection.products;projection.products=[];
  const fallbackHome=await renderPage('app/(public)/[locale]/(site)/page.tsx');projection.products=products;
  equal(fallbackHome.includes(catalogs['zh-CN'].home.hero.companySubtitle),true,'Company hero fallback localizes');
  equal(fallbackHome.includes('PT Autentik Karya Analitika'),true,'Company fallback identity unchanged');
  const protectedDiff=execFileSync('git',['diff','--name-only','--','supabase','lib/actions','lib/validations','lib/public-data.ts','lib/portfolio-data.ts','utils/supabase','components/admin'],{cwd:root,encoding:'utf8'});
  // Exact-file waiver matching the approved Release 2 Auth adapter overlay; no directory-wide exemption.
  const authAdapters=new Set(['utils/supabase/client.ts','utils/supabase/middleware.ts','utils/supabase/server.ts']);
  const withoutAuthAdapters=diff=>diff.split(/\r?\n/).filter(file=>file&&!authAdapters.has(file)).join('\n');
  const translationScope=require('./product-translation-scope.cjs');
  equal(translationScope(withoutAuthAdapters(protectedDiff)),'','No unrelated protected changes outside approved i18n/Product foundation scope');
  equal(withoutAuthAdapters([...authAdapters].join('\n')),'','Only the three exact approved Auth adapter paths are exempt');
  for(const file of ['utils/supabase/admin.ts','utils/supabase/server.ts.bak','utils/supabase/nested/server.ts','utils/supabase/middleware.tsx'])equal(translationScope(withoutAuthAdapters([...authAdapters,file].join('\n'))),file,'Unapproved Auth sibling/lookalike remains protected: '+file);
  const publicRoot=await load('app/(public)/[locale]/layout.tsx').default({params:Promise.resolve({locale:'en'}),children:'fixture'});
  equal(Object.keys(publicRoot.props.children.props.messages).sort(),['common','navigation'],'Root client payload remains Foundation-only');
  const homeTree=await load('app/(public)/[locale]/(site)/page.tsx').default();
  equal(Object.keys(homeTree.props.messages).sort(),['common','home','navigation','requests'],'Home client namespace scope');
  equal(Object.keys(homeTree.props.messages.requests),['rfq'],'Only shared RFQ presentation shipped');
  equal(homeTree.props.messages.home.metadata,undefined,'Metadata not shipped to Home client');
  equal(homeTree.props.messages.home.featured,undefined,'Server-only product labels not shipped');
  console.log(`PASS: ${checks} company catalog/fallback/real-page/identity/SEO checks; backend DTO fixtures.`);
  if(process.argv.includes('--unit'))return;
  const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3199'],{cwd:root,env:{...process.env,NEXT_PUBLIC_SITE_URL:'https://autentik-web.vercel.app'},stdio:['ignore','pipe','pipe']});
  let logs='';app.stdout.on('data',data=>logs+=data);app.stderr.on('data',data=>logs+=data);
  try{
    for(let i=0;i<120&&!logs.includes('Ready in');i++){if(app.exitCode!==null)throw Error(logs);await new Promise(resolve=>setTimeout(resolve,100));}
    assert.ok(logs.includes('Ready in'),logs);
    await require('./verify-public-i18n-company-browser.cjs')('http://localhost:3199',equal);
    console.log(`PASS: ${checks} total company assertions; source/DTO fixtures, built-app anonymous browser, controlled PDF transport. No live writes.`);
  }catch(error){console.error(logs.replace(/https?:\/\/[^\s'\"]+/g,'[URL]'));throw error;}
  finally{app.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
