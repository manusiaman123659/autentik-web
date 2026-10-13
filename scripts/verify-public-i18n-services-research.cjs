/* eslint-disable @typescript-eslint/no-require-imports -- Real presentation modules and catalogs; server DTOs/Next boundaries are fixtures. */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {NextIntlClientProvider}=require('next-intl');
const {createTranslator}=require('use-intl/core');const {execFileSync,spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');const cache=new Map();const mocks=new Map([
  ['@/components/ui/ScrollAnimations',{__esModule:true,default:({children,className,style})=>React.createElement('div',{className,style},children)}],
  ['@/i18n/navigation',{__esModule:true,default:({href,children,...props})=>React.createElement('a',{...props,href},children)}],
  ['next/image',{__esModule:true,default:({src,alt,width,height,className})=>React.createElement('img',{src,alt,width,height,className})}],
]);
let activeLocale='id';const catalogs={};let entities=[];let entries=[];let unavailable=false;let number='628123456789';
mocks.set('next-intl/server',{getLocale:async()=>activeLocale,getTranslations:async input=>createTranslator({locale:typeof input==='object'?input.locale??activeLocale:activeLocale,messages:catalogs[typeof input==='object'?input.locale??activeLocale:activeLocale],namespace:typeof input==='string'?input:input?.namespace})});
mocks.set('@/lib/public-data',{getWhatsAppContact:async()=>({number}),listPublicDistributionEntities:async()=>entities});
mocks.set('@/lib/portfolio-data',{listPublishedPortfolios:async()=>({entries,unavailable})});
function leaves(value,prefix=''){return Object.fromEntries(Object.entries(value).flatMap(([key,item])=>typeof item==='string'?[[prefix+key,item]]:Object.entries(leaves(item,prefix+key+'.'))));}
async function resolveServer(node){if(Array.isArray(node))return Promise.all(React.Children.toArray(node).map(resolveServer));if(!React.isValidElement(node))return node;if(typeof node.type==='function'&&node.type.constructor.name==='AsyncFunction'){const rendered=await resolveServer(await node.type(node.props));return React.isValidElement(rendered)&&node.key!==null?React.cloneElement(rendered,{key:node.key}):rendered;}return node.props.children!==undefined?React.cloneElement(node,{...node.props,children:await resolveServer(node.props.children)}):node;}
async function page(file){return renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale:activeLocale,timeZone:'Asia/Jakarta',messages:catalogs[activeLocale]},await resolveServer(await load(file).default())));}
function load(file){
  const filename=path.resolve(root,file);if(cache.has(filename))return cache.get(filename).exports;
  const compiled=new Module(filename);compiled.filename=filename;compiled.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,compiled);const native=compiled.require.bind(compiled);
  compiled.require=name=>{if(mocks.has(name))return mocks.get(name);if(name.startsWith('@/')){const base=path.join(root,name.slice(2));return path.extname(name)?native(base):load(path.relative(root,base)+(fs.existsSync(base+'.ts')?'.ts':'.tsx'));}if(name.startsWith('.')&&!path.extname(name)){const base=path.resolve(path.dirname(filename),name);return load(path.relative(root,base)+(fs.existsSync(base+'.ts')?'.ts':'.tsx'));}return native(name);};
  compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);return compiled.exports;
}
let checks=0;function equal(actual,expected,label){assert.deepEqual(actual,expected,label);checks++;}
async function main(){
  const fixtureHtml={};
  for(const locale of ['id','en','zh-CN'])catalogs[locale]=await load('i18n/messages.ts').loadMessages(locale);
  for(const namespace of ['services','distribution','research'])for(const locale of ['en','zh-CN']){
    const base=leaves(require(path.join(root,'messages/id',namespace+'.json'))),translated=leaves(require(path.join(root,'messages',locale,namespace+'.json')));
    equal(Object.keys(translated).sort(),Object.keys(base).sort(),'Nested semantic key parity');
    for(const key of Object.keys(base)){equal(translated[key].trim().length>0,true,'Nonblank presentation');equal((translated[key].match(/\{[a-zA-Z]+\}/g)??[]).sort(),(base[key].match(/\{[a-zA-Z]+\}/g)??[]).sort(),'Interpolation parity');}
  }
  const messages=catalogs.en;
  const Services=load('app/(public)/[locale]/(site)/services/ServicesClient.tsx').default;
  const html=renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale:'en',timeZone:'Asia/Jakarta',messages},React.createElement(Services,{waNumber:'628123456789'})));
  equal(html.includes('Integrated Services &amp; Engineering'),true,'English Services static hero responds to locale');
  entities=[
    {id:'group',name:'PT NAMA GRUP ASLI',legalName:'PT NAMA GRUP LEGAL ASLI',description:'Deskripsi grup asli',marketSegment:'Segmen pasar asli',distributionType:'group_distribution'},
    {id:'distributor',name:'DISTRIBUTOR ASLI',description:'Deskripsi distributor asli',distributionType:'distributor',regionLabel:' Jawa Tengah ',city:'Jawa Tengah',province:'Provinsi Asli',address:'ALAMAT ASLI',phone:'08123456',email:'original@example.com',websiteUrl:'https://example.com/original',contactName:'KONTAK ASLI'},
    {id:'child',name:'SUBDISTRIBUTOR ASLI',description:'Deskripsi sub asli',distributionType:'sub_distributor',parentId:'distributor',regionLabel:'jawa tengah',city:'Kota Asli'},
    {id:'other',name:'TANPA WILAYAH ASLI',distributionType:'distributor'},
  ];
  const record=(id,kind,title,image=null)=>({id,entry_kind:kind,title,summary:'RINGKASAN ASLI '+id,description:'DESKRIPSI ASLI '+id,category_label:'Kolaborasi',organization_name:'ORGANISASI ASLI',image_url:image,image_alt:image?'ALT ASLI':null,image_caption:image?'CAPTION ASLI':null});
  entries=[record('portfolio','portfolio','JUDUL PORTOFOLIO ASLI'),record('collaboration','collaboration','JUDUL KOLABORASI ASLI'),record('cylab','trademark','Cylab','/images/compro/slide-11.jpg'),record('ullun','trademark','Ullun','/images/compro/slide-11.jpg')];
  const snapshot=JSON.stringify({entities,entries});
  const expectedIds=['iot-monitoring','lab-engineering','calibration','water-treatment','platform-integration','consulting'];
  for(const locale of ['id','en','zh-CN']){
    activeLocale=locale;
    const servicesHtml=renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale,timeZone:'Asia/Jakarta',messages:{common:catalogs[locale].common,navigation:catalogs[locale].navigation,services:{ui:catalogs[locale].services.ui}}},React.createElement(Services,{waNumber:number})));
    for(const id of expectedIds){equal(servicesHtml.includes(`id="${id}"`),true,'Stable service ID');equal(servicesHtml.includes(catalogs[locale].services.ui.items[id].target.replace(/&/g,'&amp;')),true,'Localized target audience');equal(Object.keys(catalogs[locale].services.ui.items[id].highlights).length,4,'Four ordered highlights');}
    equal(servicesHtml.includes('Integrasi sensor pintar &amp; sistem peringatan dini otomatis'),false,'Unused subtitle stays unrendered');
    for(const key of ['ready','custom','thirdParty'])equal(servicesHtml.includes(catalogs[locale].services.ui.fulfillment.items[key].title.replace(/&/g,'&amp;')),true,'Three fulfillment paths retained');
    for(const key of ['01','02','03','04','05'])equal(servicesHtml.includes(catalogs[locale].services.ui.process.steps[key].title.replace(/&/g,'&amp;')),true,'Five ordered process steps retained');
    for(const href of ['/store','/custom-request'])equal(servicesHtml.includes(`href="${locale==='en'?'/en':locale==='zh-CN'?'/zh-cn':''}${href}"`),true,'Internal fulfillment locale retained');
    const wa=servicesHtml.match(/href="(https:\/\/wa[.]me\/[^\"]+)"/)[1];equal(new URL(wa).pathname,'/'+number,'Service WA destination preserved');equal(new URL(wa).searchParams.get('text'),catalogs[locale].services.ui.fulfillment.whatsapp,'WA template encoded once');
    const distributionHtml=await page('app/(public)/[locale]/(site)/distributors/page.tsx');
    for(const value of ['PT NAMA GRUP ASLI','PT NAMA GRUP LEGAL ASLI','Deskripsi grup asli','Segmen pasar asli','DISTRIBUTOR ASLI','Deskripsi distributor asli','ALAMAT ASLI','original@example.com','KONTAK ASLI','SUBDISTRIBUTOR ASLI','Kota Asli','TANPA WILAYAH ASLI'])equal(distributionHtml.includes(value),true,'Distribution entity identity/content unchanged');
    equal((distributionHtml.match(/<h3[^>]*>Jawa Tengah<\/h3>/g)??[]).length,1,'Regional normalization/first spelling preserved');
    equal(distributionHtml.includes(catalogs[locale].distribution.card.parent.replace('{name}','DISTRIBUTOR ASLI')),true,'Parent lookup remains original');
    equal(distributionHtml.includes('href="https://example.com/original"'),true,'Entity URL preserved');
    const researchHtml=await page('app/(public)/[locale]/(site)/research-partnership/page.tsx');
    fixtureHtml[locale]={distribution:distributionHtml,research:researchHtml};
    for(const value of ['JUDUL PORTOFOLIO ASLI','JUDUL KOLABORASI ASLI','RINGKASAN ASLI portfolio','DESKRIPSI ASLI collaboration','ORGANISASI ASLI','Kolaborasi','Cylab','Ullun','ALT ASLI','CAPTION ASLI'])equal(researchHtml.includes(value),true,'Published CMS portfolio content unchanged');
    equal((researchHtml.match(/<figure/g)??[]).length,1,'Cylab/Ullun shared certificate remains one figure');
    for(const key of ['productDevelopment','embedded','design'])equal(researchHtml.includes(catalogs[locale].research.capabilities[key].title),true,'Three static capabilities localized in order');
    equal(researchHtml.includes(catalogs[locale].research.disclosure),true,'Disclosure localized');
    equal(JSON.stringify({entities,entries}),snapshot,'Presentation never mutates entity DTOs');
    for(const [file,namespace,route]of [['services/layout.tsx','services','/services'],['distributors/page.tsx','distribution','/distributors'],['research-partnership/page.tsx','research','/research-partnership']]){
      const metadata=await load('app/(public)/[locale]/(site)/'+file).generateMetadata();equal(metadata.title,catalogs[locale][namespace].metadata.title,'Localized static metadata');equal(metadata.openGraph.description,catalogs[locale][namespace].metadata.description,'Localized OG copy');equal(metadata.openGraph.type,'website','Inherited OG type');equal(metadata.alternates.languages['x-default'],route,'Default alternate unchanged');
    }
    const servicesPage=await load('app/(public)/[locale]/(site)/services/page.tsx').default();equal(Object.keys(servicesPage.props.messages).sort(),['common','navigation','services'],'Scoped Services client namespace');equal(servicesPage.props.messages.services.metadata,undefined,'Metadata remains server-only');
  }
  const savedEntries=entries;entries=[];
  for(const locale of ['id','en','zh-CN']){activeLocale=locale;unavailable=false;equal((await page('app/(public)/[locale]/(site)/research-partnership/page.tsx')).includes(catalogs[locale].research.states.empty),true,'Empty state localizes');unavailable=true;equal((await page('app/(public)/[locale]/(site)/research-partnership/page.tsx')).includes(catalogs[locale].research.states.unavailable),true,'Unavailable remains distinct');}
  unavailable=false;entries=savedEntries.map(row=>({...row,category_label:null}));activeLocale='en';const fallback=await page('app/(public)/[locale]/(site)/research-partnership/page.tsx');equal(fallback.includes(catalogs.en.research.collaboration.fallbackCategory),true,'Explicit absent-CMS category fallback');
  const categories=load('lib/validations/distributionSchema.ts').DISTRIBUTION_TYPE_LABELS;equal(categories.sub_distributor,'Sub-distributor','Admin shared label stays Indonesian');
  const protectedDiff=execFileSync('git',['diff','--name-only','--','supabase','utils/supabase','lib/actions','lib/validations','lib/public-data.ts','lib/portfolio-data.ts','components/admin'],{cwd:root,encoding:'utf8'});equal(require('./product-translation-scope.cjs')(protectedDiff),'','No unrelated protected changes outside approved i18n/Product foundation scope');
  console.log(`PASS: ${checks} catalog/real-page/identity/hierarchy/dedup/SEO checks; DTO transport fixtures.`);
  if(process.argv.includes('--unit'))return;
  const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3211'],{cwd:root,env:{...process.env,NEXT_PUBLIC_SITE_URL:'https://autentik-web.vercel.app'},stdio:['ignore','pipe','pipe']});let logs='';app.stdout.on('data',data=>logs+=data);app.stderr.on('data',data=>logs+=data);
  try{for(let i=0;i<120&&!logs.includes('Ready in');i++){if(app.exitCode!==null)throw Error(logs);await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(logs.includes('Ready in'));await require('./verify-public-i18n-services-research-browser.cjs')('http://localhost:3211',equal,fixtureHtml);console.log(`PASS: ${checks} total 002B assertions; real UI/built-app anonymous browser, transport fixtures, no writes.`);}finally{app.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
