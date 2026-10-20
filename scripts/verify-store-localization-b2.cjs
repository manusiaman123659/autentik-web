/* eslint-disable @typescript-eslint/no-require-imports -- Offline RPC boundary checks; network/database mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
let checks = 0;
const eq = (a,b,label) => { assert.deepEqual(a,b,label); checks++; };
function loader(mocks) {
  const cache = new Map();
  return function load(file) {
    const filename = path.resolve(root,file);
    if(cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,mod);
    const native=mod.require.bind(mod);
    mod.require=name=>mocks.has(name)?mocks.get(name):name.startsWith('@/')?load(name.slice(2)+(fs.existsSync(path.join(root,name.slice(2)+'.ts'))?'.ts':'.tsx')):native(name);
    mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
    return mod.exports;
  };
}
async function main() {
  const previous=process.env.STORE_SEARCH_RPC_ENABLED;
  try {
    delete process.env.STORE_SEARCH_RPC_ENABLED;
    const calls=[];
    const canonical={id:'aka-01',slug:'slug-aka',name:'Nama kanonis',sku:'AKA-01',brand:'AKA',category:'Komponen',image_url:null,
      price:12500,compare_at_price:null,stock:4,low_stock_threshold:5,fulfillment_type:'ready_stock',min_purchase_qty:1,unit:null,has_active_variants:false};
    let data={mode:'listing',items:[{canonical,display:{name:'English name'}}],total:'12',resolved_page:2,total_pages:'2',page_size:9,
      facets:{brands:[{name:'AKA',count:'12'}],categories:[{name:'Komponen',count:'12'}]}};
    let error=null;
    const client={rpc:async(name,args)=>{calls.push([name,args]);return{data,error}}};
    const load=loader(new Map([['server-only',{}],['next/headers',{cookies:async()=>({})}],['@/utils/supabase/server',{createClient:()=>client}]]));
    const api=load('lib/public-store-search.ts');
    eq(api.isStoreSearchEnabled(),false,'Disabled by default');
    await assert.rejects(()=>api.searchStoreProducts({locale:'en',query:'English name',page:2}),/nonaktif/);checks++;
    eq(calls.length,0,'Disabled gate never invokes RPC');
    process.env.STORE_SEARCH_RPC_ENABLED='true';
    const result=await api.searchStoreProducts({locale:'en',query:'English name',brands:['AKA'],categories:['Komponen'],stock:'low',priceMin:0,priceMax:25000,page:2,mode:'listing'});
    eq(calls[0],["search_store_products_v1",{p_locale:'en',p_query:'English name',p_brands:['AKA'],p_categories:['Komponen'],p_stock:'low',p_price_min:0,p_price_max:25000,p_page:2,p_mode:'listing'}],'Nine RPC arguments in approved signature order');
    eq(result.items[0].canonical.id,canonical.id,'Canonical identity preserved');
    eq(result.items[0].display.name,'English name','Eligible translated display name retained');
    eq([result.total,result.resolved_page,result.total_pages,result.facets.brands[0].count],['12',2,'2','12'],'Decimal count, page and global facets retained');
    eq(result.items.length,1,'One item per returned canonical ID');
    data={mode:'suggest',items:[{id:canonical.id,slug:canonical.slug,displayName:'中文名称',brand:'AKA',sku:canonical.sku,image_url:null,price:canonical.price}],total:null,
      resolved_page:1,total_pages:null,page_size:6,facets:{brands:[],categories:[]}};
    const suggestion=await api.searchStoreProducts({locale:'zh-CN',query:'中文',mode:'suggest'});
    eq(calls[1][1].p_locale,'zh-CN','Suggestions isolate ZH locale');
    eq([calls[1][1].p_mode,calls[1][1].p_page,calls[1][1].p_brands.length],['suggest',1,0],'Suggestions bounded via RPC mode and empty filters');
    eq(suggestion.items[0].displayName,'中文名称','Suggestion display name from requested locale');
    error={code:'42883'};
    await assert.rejects(()=>api.searchStoreProducts({locale:'en',query:'English',mode:'suggest'}),/Pencarian/);checks++;
    eq(calls.length,3,'Missing RPC not silently replaced with canonical list');
    error=null;data={...data,items:[...data.items,...data.items]};
    await assert.rejects(()=>api.searchStoreProducts({locale:'zh-CN',query:'中文',mode:'suggest'}),/Pencarian/);checks++;
    data={mode:'listing',items:[{canonical,display:{name:'English name'}}],total:'12',resolved_page:2,total_pages:'2',page_size:9,
      facets:{brands:[{name:'AKA',count:'12'}],categories:[{name:'Komponen',count:'12'}]}};
    const { NextRequest }=require('next/server');
    const route=loader(new Map([['@/lib/public-store-search',api]]))('app/api/store/search/route.ts');
    delete process.env.STORE_SEARCH_RPC_ENABLED;
    const count=calls.length;
    const disabled=await route.GET(new NextRequest('http://localhost/api/store/search?locale=en&q=English'));
    eq(disabled.status,404,'Production-default API gate refuses RPC use');
    eq(calls.length,count,'Production-default route performs no RPC');
    process.env.STORE_SEARCH_RPC_ENABLED='true';
    const url='http://localhost/api/store/search?locale=en&q=English&brand=AKA&category=Komponen&stock=low&min=0&max=25000&page=2';
    const response=await route.GET(new NextRequest(url));
    eq(response.status,200,'Enabled listing route returns RPC result');
    eq((await response.json()).data.total,'12','Enabled route forwards exact decimal total');
    eq(calls.at(-1)[1].p_page,2,'Enabled route forwards page without client-side filtering');
    eq(response.headers.get('cache-control'),'private, no-store','Search responses are not public cacheable');
    const invalid=await route.GET(new NextRequest('http://localhost/api/store/search?locale=fr&q=English'));
    eq(invalid.status,400,'Unsupported locale rejected before RPC');
    eq(calls.length,count+1,'Invalid locale never reaches RPC');
    data={mode:'suggest',items:[{id:canonical.id,slug:canonical.slug,displayName:'中文名称',brand:'AKA',sku:canonical.sku,image_url:null,price:canonical.price}],
      total:null,resolved_page:1,total_pages:null,page_size:6,facets:{brands:[],categories:[]}};
    const suggested=await route.GET(new NextRequest('http://localhost/api/store/search?locale=zh-CN&q=中文&mode=suggest'));
    eq(suggested.status,200,'Enabled autocomplete route returns bounded suggest response');
    eq((await suggested.json()).data.items[0].displayName,'中文名称','Autocomplete response uses ZH display');
    eq([calls.at(-1)[1].p_mode,calls.at(-1)[1].p_page],['suggest',1],'Autocomplete route calls six-result RPC mode');
    const rejected=await route.GET(new NextRequest('http://localhost/api/store/search?locale=en&q=x&min=NaN'));
    eq(rejected.status,400,'Invalid numeric filter rejected at API boundary');
    eq(calls.length,count+2,'Invalid numeric filter never reaches RPC');
    error={code:'42883'};
    const unavailable=await route.GET(new NextRequest(url));
    eq(unavailable.status,503,'Missing RPC yields explicit error');
    eq((await unavailable.json()).success,false,'Missing RPC never returns fake empty success');
    data={mode:'listing',items:[{canonical,display:{name:'English name'}}],total:'12',resolved_page:2,total_pages:'2',page_size:9,
      facets:{brands:[{name:'AKA',count:'12'}],categories:[{name:'Komponen',count:'12'}]}};
    const filters={query:'English name',brands:['AKA'],categories:[],stockStatus:'all',priceMin:'',priceMax:''};
    const requestKey=JSON.stringify(['en',filters,2,0]);
    const state=[filters,2,false,0,{key:requestKey,data}];
    const mini=name=>({__esModule:true,default:props=>React.createElement('span',{},props.brands?.map(b=>b.name+':'+b.count).join(',')||name)});
    const intl={useTranslations:namespace=>require('use-intl/core').createTranslator({locale:'en',messages:{products:require('../messages/en/products.json')},namespace})};
    const mocks=new Map([['next-intl',intl],['react',{...React,useState:initial=>[state.shift()??(typeof initial==='function'?initial():initial),()=>{}]}]]);
    for(const name of ['StoreSearchBar','StoreProductCard','CategoryToolbar','StoreFilterSidebar','StoreTrustStrip','StorePromoBanner'])
      mocks.set('@/components/store/'+name,name==='StoreProductCard'?{__esModule:true,default:({product})=>React.createElement('span',{},product.display.name)}:mini(name));
    mocks.set('@/components/ui/WhatsAppButton',mini('WhatsApp'));
    mocks.set('@/components/ui/EmptyState',{__esModule:true,default:({title})=>React.createElement('span',{},title)});
    const StoreClient=loader(mocks)('app/(public)/[locale]/(site)/store/StoreClient.tsx').default;
    const html=renderToStaticMarkup(React.createElement(StoreClient,{products:[],rpcEnabled:true,locale:'en',initialQuery:'English name',compatible:null,ppicAkaNumber:null,mikaSalesNumber:null}));
    eq(html.includes('English name'),true,'Enabled page renders translated match from RPC');
    eq(html.includes('12 products found'),true,'Result total comes from RPC, not 1 page row');
    eq(html.includes('Page 2 of 2'),true,'RPC resolved page determines navigation');
    eq(html.includes('AKA:12'),true,'Global facet count comes from RPC');
    const failure=[filters,2,false,0,{key:requestKey,error:true}];
    const failedMocks=new Map(mocks);failedMocks.set('react',{...React,useState:initial=>[failure.shift()??(typeof initial==='function'?initial():initial),()=>{}]});
    const failed=loader(failedMocks)('app/(public)/[locale]/(site)/store/StoreClient.tsx').default;
    const failedHtml=renderToStaticMarkup(React.createElement(failed,{products:[],rpcEnabled:true,locale:'en',initialQuery:'English name',compatible:null,ppicAkaNumber:null,mikaSalesNumber:null}));
    eq(failedHtml.includes(require('../messages/en/products.json').storeUi.error),true,'Enabled RPC failure visible instead of canonical fallback');
    const zhSuggestion={id:canonical.id,slug:canonical.slug,displayName:'中文名称',brand:canonical.brand,sku:canonical.sku,image_url:null,price:canonical.price};
    const suggestions=['中文',true,-1,{key:JSON.stringify(['zh-CN','中文']),items:[zhSuggestion]}];
    const barMocks=new Map([
      ['next-intl',intl],
      ['react',{...React,useState:initial=>[suggestions.shift()??(typeof initial==='function'?initial():initial),()=>{}]}],
      ['next/navigation',{useSearchParams:()=>new URLSearchParams('q=中文')}],
      ['@/i18n/navigation',{useRouter:()=>({push:()=>{}})}],
    ]);
    const Bar=loader(barMocks)('components/store/StoreSearchBar.tsx').default;
    const barHtml=renderToStaticMarkup(React.createElement(Bar,{products:[],rpcEnabled:true,locale:'zh-CN',onQueryChange:()=>{}}));
    eq(barHtml.includes('中文名称'),true,'Bounded remote suggestion displays ZH name without full product list');
    eq(barHtml.includes('AKA-01'),true,'Suggestion keeps canonical SKU');
    const badState=['中文',true,-1,{key:JSON.stringify(['zh-CN','中文']),error:true}];
    barMocks.set('react',{...React,useState:initial=>[badState.shift()??(typeof initial==='function'?initial():initial),()=>{}]});
    const BadBar=loader(barMocks)('components/store/StoreSearchBar.tsx').default;
    const badHtml=renderToStaticMarkup(React.createElement(BadBar,{products:[],rpcEnabled:true,locale:'zh-CN',onQueryChange:()=>{}}));
    eq(badHtml.includes(require('../messages/en/products.json').storeUi.error),true,'Suggestion RPC errors are visible');
    console.log(`PASS: ${checks} Store B2 gate/RPC payload/response/error assertions; no database or network.`);
  } finally { if(previous===undefined)delete process.env.STORE_SEARCH_RPC_ENABLED;else process.env.STORE_SEARCH_RPC_ENABLED=previous; }
}
main().catch(e=>{console.error(e);process.exitCode=1});
