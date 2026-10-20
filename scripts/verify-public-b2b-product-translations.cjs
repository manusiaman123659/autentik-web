/* eslint-disable @typescript-eslint/no-require-imports -- Real public modules; isolated auth/Next/network boundaries. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let checks = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
function loader(mocks = new Map()) {
  const cache = new Map();
  return function load(file) {
    const filename = path.resolve(root, file); if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename); compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, compiled);
    const native = compiled.require.bind(compiled);
    const local = file => load(file + (fs.existsSync(path.join(root,file+'.ts'))?'.ts':'.tsx'));
    compiled.require = name => mocks.has(name) ? mocks.get(name) : name.startsWith('@/') ? path.extname(name) ? native(path.join(root,name.slice(2))) : local(name.slice(2)) : name.startsWith('.') && !path.extname(name) ? local(path.relative(root, path.resolve(path.dirname(filename), name))) : native(name);
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
    return compiled.exports;
  };
}
async function main() {
  check(fs.existsSync(path.join(root,'lib/public-b2b-products.ts')),true,'Public B2B pipeline exists');
  const source={id:'canonical-id',slug:'canonical-slug',product_type:'b2b_system',name:'Nama Indonesia',description:'Deskripsi Indonesia',brand:'TALPHA',category:'Kategori Indonesia',sku:'SKU-ORIGINAL',price:12345,stock:17,fulfillment_type:'ready_stock',image_url:'/images/original.jpg',model_3d_url:'/models/original.glb',features:['Fitur A','Fitur B'],specs:[{label:'Volume',value:'850 L'},{label:'Material',value:'Baja',value_kind:'text'}],seo_title:'SEO Indonesia',seo_description:null,status:'published',is_active:true,deleted_at:null,translation_source_revision:5};
  const before=JSON.stringify(source);
  const row={product_id:source.id,locale:'en',name:'English name',description:'English description',features:['Feature A','Feature B'],specs:[{label:'Capacity',value_text:null},{label:'Material',value_text:'Steel'}],seo_title:'English SEO',seo_description:'English summary',status:'published',source_revision:5};
  let rows=[row];let queryError=false;const queries=[];const memo=new Map();let canonicalReads=0;const invalidations=[];
  const client={from:table=>{const trace={table,filters:[]};queries.push(trace);const q={select:value=>{trace.select=value;return q},eq:(field,value)=>{trace.filters.push([field,value]);return q},is:()=>q,order:async()=>({data:[source],error:queryError?{code:'XX000'}:null}),in:async(field,ids)=>{trace.ids=ids;return{data:rows.filter(r=>ids.includes(r.product_id)).map(r=>({...r,parent:{id:r.product_id,status:'published',is_active:true,deleted_at:null,translation_source_revision:5}})),error:queryError?{code:'42P01'}:null}}};return q}};
  const load=loader(new Map([
    ['next/headers',{cookies:async()=>({})}],['next/cache',{revalidatePath:p=>invalidations.push(p)}],
    ['@/utils/supabase/server',{createClient:()=>client}],
    ['@/lib/public-data',{getPublicProductBySlug:async()=>{canonicalReads++;return source}}],
    ['./public-data',{getPublicProductBySlug:async()=>{canonicalReads++;return source}}],
    ['react',{...require('react'),cache:fn=>(...args)=>{const key=JSON.stringify(args);if(!memo.has(key))memo.set(key,fn(...args));return memo.get(key)}}],
  ]));
  const api=load('lib/public-b2b-products.ts');const projection=load('lib/public-product-presentation.ts');
  const resolved=async locale=>(await api.resolvePublicB2BProducts([source],locale))[0];
  const id=await resolved('id');check(id.content.name,source.name,'ID always source');check(queries.length,0,'ID zero translation reads');
  const en=await resolved('en');check(en.content.name,'English name','Current Published EN');check(en.content.features,row.features,'Translated features whole block');check(en.content.specs,[{label:'Capacity',value:'850 L'},{label:'Material',value:'Steel'}],'Technical canonical / explicit text overlay');
  const card=projection.toB2BCatalogueView(en);check(card.canonicalName,source.name,'RFQ/matching canonical name');check(card.display.name,row.name,'Card display separate');
  for(const key of ['id','slug','brand','category'])check(card[key],source[key],'Canonical identity '+key);
  const home=projection.toB2BHomeView(en);check(home.display.name,row.name,'Home projection');check(home.model3dUrl,source.model_3d_url,'3D media canonical');
  const search=projection.toB2BSearchView(en);check(projection.matchesCanonicalB2BSearch(search,'nama indonesia'),true,'Canonical search still matches');check(projection.matchesCanonicalB2BSearch(search,'english name'),false,'No translated-text search introduced');check(search.display.name,row.name,'Search localized display');
  for(const view of [card,home,search])for(const field of ['translation_source_revision','source_revision','version','status','created_at','rows'])check(JSON.stringify(view).includes('"'+field+'"'),false,'No management metadata '+field);
  rows=[{...row,locale:'zh-CN',name:'中文名称'}];check((await resolved('zh-CN')).content.name,'中文名称','Current Published ZH');
  for(const candidate of [null,{...row,status:'draft'},{...row,source_revision:4},{...row,features:['wrong length']},{...row,specs:[{label:'Capacity',value_text:'900 L'},row.specs[1]]},{...row,locale:'zh-CN'}]){rows=candidate?[candidate]:[];check((await resolved('en')).content,id.content,'Missing/Draft/stale/invalid complete source fallback')}
  rows=[{...row,name:null,description:null,features:null,specs:null,seo_title:null}];const partial=(await resolved('en')).content;check(partial.name,source.name,'Scalar fallback');check(partial.features,source.features,'Features NULL whole block');check(partial.specs,id.content.specs,'Specs NULL whole block');check(partial.seo_title,source.seo_title,'SEO field fallback');
  queryError=true;check((await resolved('en')).content,id.content,'Translation read error safely falls back');queryError=false;rows=[row];
  queries.length=0;await api.resolvePublicB2BProducts([source,source], 'en');check(queries.length,1,'Duplicate rows one batch');check(queries[0].ids,[source.id],'IDs deduplicated');check(queries[0].filters.find(([key])=>key==='locale')[1],'en','Only requested locale');
  const many=Array.from({length:250},(_,i)=>({...source,id:'p-'+i}));queries.length=0;await api.resolvePublicB2BProducts(many,'zh-CN');check(queries.length,3,'250 products use three bounded batches, not N+1');check(queries.every(q=>q.ids.length<=100),true,'Batch count bounded');check(queries.every(q=>q.filters.find(([f])=>f==='locale')[1]==='zh-CN'),true,'ZH never queries EN');
  const long=Array.from({length:30},(_,i)=>({...source,id:'产品'.repeat(90)+i}));queries.length=0;await api.resolvePublicB2BProducts(long,'en');check(queries.every(q=>q.ids.reduce((n,id)=>n+encodeURIComponent(id).length+6,0)<=6000),true,'Encoded IDs URL budget bounded');
  queries.length=0;await api.resolvePublicB2BProducts([],'en');check(queries.length,0,'Empty list no query');
  queries.length=0;const oversized=await api.resolvePublicB2BProducts([{...source,id:'x'.repeat(7000)},source],'en');check(oversized[0].content.name,source.name,'Oversized legacy ID safe fallback');check(queries[0].ids,[source.id],'Oversized ID cannot break ordinary batch');
  memo.clear();canonicalReads=0;queries.length=0;await Promise.all([api.getResolvedB2BProduct(source.slug,'en'),api.getResolvedB2BProduct(source.slug,'en')]);check(canonicalReads,1,'Metadata/page share canonical read');check(queries.length,1,'Metadata/page share translation read');
  memo.clear();rows=[{...row,status:'draft'}];check((await api.getResolvedB2BProduct(source.slug,'en')).content.name,source.name,'New request does not retain previous publication');
  const paths=load('lib/product-public-revalidation.ts');paths.revalidateB2BProduct(['old-slug','new-slug']);for(const prefix of ['/id','/en','/zh-CN'])for(const suffix of ['','/products','/products/old-slug','/products/new-slug'])check(invalidations.includes(prefix+suffix),true,'Locale destination invalidation '+prefix+suffix);
  const schemas=load('lib/seo/jsonLd.ts');const ld=schemas.productSchema(source,'en',en.content);check(ld.name,row.name,'JSON-LD resolved name');check(ld.description,row.description,'JSON-LD resolved description');check(ld.sku,source.sku,'JSON-LD canonical SKU');check(ld.brand.name,source.brand,'JSON-LD canonical brand');check(ld.category,source.category,'JSON-LD canonical category');check(ld.url.endsWith('/en/products/'+source.slug),true,'JSON-LD canonical slug with locale');check('offers' in ld,false,'No invented B2B offers');
  const JsonLd=load('components/seo/JsonLd.tsx').default;const html=require('react-dom/server').renderToStaticMarkup(require('react').createElement(JsonLd,{data:{name:'</script><script>bad</script>'}}));check(html.includes('\\u003c/script>'),true,'Hostile JSON-LD text encoded');
  check(JSON.stringify(source),before,'Canonical Product never mutated');
  await mutationInvalidationChecks();
  await surfaceChecks(source,row);
  console.log(`PASS: ${checks} public B2B resolver/DTO/search/batching/metadata/JSON-LD/revalidation checks.`);
}
async function surfaceChecks(source,row) {
  const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {createTranslator}=require('use-intl/core');
  let locale='id';let candidate=row;const queries=[];
  const client={from:table=>{const q={select:()=>q,eq:()=>q,is:()=>q,in:async()=>{queries.push(table);return{data:[{...candidate,parent:{id:source.id,status:'published',is_active:true,deleted_at:null,translation_source_revision:5}}],error:null}},order:async()=>({data:[],error:null})};return q}};
  const mocks=new Map([
    ['next/headers',{cookies:async()=>({})}],['@/utils/supabase/server',{createClient:()=>client}],
    ['@/utils/supabase/admin',{createAdminClient:()=>client}],
    ['@/lib/actions/technicalDocuments',{submitDocLeadAndGetUrl:async()=>({success:false})}],
    ['next/navigation',{notFound:()=>{throw Error('404')},useSearchParams:()=>new URLSearchParams(),useRouter:()=>({})}],
    ['next/dynamic',{__esModule:true,default:()=>()=>null}],
    ['next/image',{__esModule:true,default:({src,alt})=>React.createElement('img',{src,alt})}],
    ['@/components/ui/ScrollAnimations',{__esModule:true,default:({children,...props})=>React.createElement('div',props,children)}],
    ['@/lib/public-data',{getPublicProductBySlug:async()=>source,getWhatsAppContact:async()=>({number:null})}],
  ]);
  mocks.set('./public-data',mocks.get('@/lib/public-data'));
  // Navigation fixture preserves the actual locale URL helper.
  const localize=loader()('i18n/locales.ts').localizeHref;
  mocks.set('@/i18n/navigation',{__esModule:true,default:({href,children,...props})=>React.createElement('a',{...props,href:localize(href,locale)},children),useRouter:()=>({})});
  const load=loader(mocks);const catalogs={};for(const value of ['id','en','zh-CN'])catalogs[value]=await load('i18n/messages.ts').loadMessages(value);
  mocks.set('next-intl/server',{getLocale:async()=>locale,getTranslations:async input=>createTranslator({locale,messages:catalogs[locale],namespace:typeof input==='string'?input:input.namespace})});
  const page=load('app/(public)/[locale]/(site)/products/[slug]/page.tsx');
  for(const value of ['id','en','zh-CN']) {
    locale=value;candidate={...row,locale:value==='id'?'en':value,name:value==='zh-CN'?'中文名称':row.name};
    const tree=await page.default({params:Promise.resolve({slug:source.slug})});const html=renderToStaticMarkup(tree);const name=value==='id'?source.name:candidate.name;
    check(html.includes(name),true,'Actual detail displays '+value);check(html.includes('850 L'),true,'Detail technical value canonical');
    const metadata=await page.generateMetadata({params:Promise.resolve({slug:source.slug})});check(metadata.title,value==='id'?source.seo_title:row.seo_title,'Actual metadata resolved SEO');check(metadata.alternates.languages['x-default'],'/products/'+source.slug,'Metadata x-default');
    check(metadata.openGraph.url,localize('/products/'+source.slug,value),'OG locale identity');
    const rfq=tree.props.children.flat(Infinity).filter(Boolean);
    check(html.includes(catalogs[value].products.detail.specifications),true,'Translated detail shell');check(rfq.length>0,true,'Detail provider boundary');
  }
  const allFiles=['components/home/FeaturedProducts.tsx','components/home/Product3DTeaser.tsx','app/(public)/[locale]/(site)/page.tsx','components/layout/SearchModal.tsx'];
  for(const file of allFiles)check(fs.readFileSync(path.join(root,file),'utf8').includes(file.includes('SearchModal')?'matchesCanonicalB2BSearch':file.includes('page.tsx')?'resolvePublicB2BProducts':'.display.name'),true,'Consumer uses shared display '+file);
  const catalogue=fs.readFileSync(path.join(root,'app/(public)/[locale]/(site)/products/KatalogClient.tsx'),'utf8');check(catalogue.includes('productName={rfqProduct?.canonicalName}'),true,'Catalogue RFQ canonical name');check(catalogue.includes('p.canonicalName.toLowerCase()'),true,'Catalogue matching remains canonical');check(catalogue.includes('t("detail")'),true,'Detail CTA messages');
  const viewer=fs.readFileSync(path.join(root,'components/product/Product3DViewer.tsx'),'utf8');check(viewer.includes('useTranslations'),false,'Shared Admin viewer has no next-intl hook');check(viewer.includes('loading: "Memuat model 3D..."'),true,'Admin Indonesian default retained');
  for(const value of ['en','zh-CN'])check(catalogs[value].products.catalogue.detail!=='Detail',true,'Translated Detail CTA '+value);
}
async function mutationInvalidationChecks() {
  const paths=[];let allowed=true;let writes=0;
  const row={id:'source',slug:'old-slug',product_type:'b2b_system',brochure_url:null,model_3d_url:null};
  const client={from:()=>{const q={select:()=>q,eq:()=>q,is:()=>q,not:()=>q,maybeSingle:async()=>({data:row,error:null}),upsert:async()=>{writes++;return{error:null}},update:()=>{writes++;return q}};return q},rpc:async()=>({error:{code:'QA_CHILD_WARNING',message:'QA child warning'}})};
  const actions=loader(new Map([
    ['next/headers',{cookies:async()=>({})}],['next/cache',{revalidatePath:p=>paths.push(p)}],
    ['@/lib/admin',{requireOperationalStaff:async()=>allowed?{id:'actor'}:null,requireAdmin:async()=>allowed?{id:'actor'}:null}],
    ['@/utils/supabase/server',{createClient:()=>client}],['@/lib/audit',{recordAudit:async()=>{}}],
  ]))('lib/actions/products.ts');
  const input={id:'source',slug:'new-slug',productType:'b2b_system',name:'QA B2B',brand:'TALPHA',brandId:'talpha',category:'Canonical',description:'Canonical source description',brandColor:'#0EA5A0',categoryColor:'#0B1F3A'};
  const saved=await actions.upsertProduct(input,undefined,[]);
  check(saved.success,true,'Primary source save with child warning still succeeds');
  for(const prefix of ['/id','/en','/zh-CN'])for(const suffix of ['','/products','/products/old-slug','/products/new-slug'])check(paths.includes(prefix+suffix),true,'Source update invalidates before child warning '+prefix+suffix);
  paths.length=0;await actions.deleteProduct('source');for(const prefix of ['/id','/en','/zh-CN'])check(paths.includes(prefix+'/products/old-slug'),true,'Archive invalidates locale detail');
  paths.length=0;await actions.restoreProduct('source');for(const prefix of ['/id','/en','/zh-CN'])check(paths.includes(prefix+'/products/old-slug'),true,'Restore invalidates locale detail');
  allowed=false;const count=writes;await actions.upsertProduct(input);check(writes,count,'Unauthorized source mutation still denied');
}
main().catch(error=>{console.error(error);process.exitCode=1});
