/* eslint-disable @typescript-eslint/no-require-imports -- Actual schemas and presentation helpers; browser/API boundaries are isolated. */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
const root=path.resolve(__dirname,'..');const cache=new Map();
const {execFileSync}=require('node:child_process');
function load(file){const filename=path.resolve(root,file);if(cache.has(filename))return cache.get(filename).exports;const compiled=new Module(filename);compiled.filename=filename;compiled.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,compiled);const native=compiled.require.bind(compiled);compiled.require=name=>{if(name.startsWith('@/')){const base=path.join(root,name.slice(2));return path.extname(name)?native(base):load(path.relative(root,base)+'.ts');}if(name.startsWith('.')&&!path.extname(name))return load(path.relative(root,path.resolve(path.dirname(filename),name))+'.ts');return native(name);};compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return compiled.exports;}
let checks=0;function equal(actual,expected,label){assert.deepEqual(actual,expected,label);checks++;}
async function main(){
  const schemas=load('lib/validations/contactSchema.ts');
  equal(typeof schemas.createContactSchema,'function','Contact validation supports message injection without global locale');
  const translated=schemas.createContactSchema({fullName:'Name too short',email:'Invalid email',company:'Company too short',industry:'Choose industry',message:'Message too short'});
  const result=translated.safeParse({fullName:'A',email:'bad',company:'A',industry:'',message:'short'});
  equal(result.success,false,'Original constraints still reject invalid input');
  equal(result.error.issues.find(issue=>issue.path[0]==='email').message,'Invalid email','Localized validation message');
  equal(schemas.contactSchema.safeParse({fullName:'A',email:'bad',company:'A',industry:'',message:'short'}).error.issues.find(issue=>issue.path[0]==='email').message,'Format email tidak valid','Default Indonesian server export preserved');
  equal(fs.existsSync(path.join(root,'lib/rfq-presentation.ts')),true,'RFQ has a finite safe presentation boundary');
  const rfq=load('lib/rfq-presentation.ts');
  for(const [status,category]of [[400,'INVALID_REQUEST'],[413,'INVALID_REQUEST'],[429,'RATE_LIMITED'],[503,'SERVICE_UNAVAILABLE'],[500,'UNKNOWN']])equal(rfq.getRfqErrorCategory(status),category,'HTTP identity maps without parsing prose');
  equal(rfq.normalizeRfqFieldErrors({email:['raw backend text'],unknown:['SQL'],phoneNumber:'legacy field error',picName:[1,null]}),{email:['raw backend text'],phoneNumber:['legacy field error']},'Only known field paths/string arrays normalized');
  for(const value of [null,undefined,[],42,'bad'])equal(rfq.normalizeRfqFieldErrors(value),{},'Malformed field map safely ignored');
  const original=new Module(path.join(root,'baseline-contact.cjs'));original.filename=path.join(root,'baseline-contact.cjs');original.paths=Module._nodeModulePaths(root);original._compile(ts.transpileModule(execFileSync('git',['show','HEAD:lib/validations/contactSchema.ts'],{cwd:root,encoding:'utf8'}),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,original.filename);
  const valid={fullName:'Nama Asli',email:'original@example.com',company:'PT ASLI',industry:'Farmasi',message:'Spesifikasi asli panjang'};
  const custom={category:'custom_request',fullName:valid.fullName,email:valid.email,message:valid.message,productSlug:'slug-asli',productName:'PRODUK ASLI'};
  const cases=[{},null,valid,custom,{...custom,category:'changed'},{...custom,company:''},{...valid,extra:'ignored'}];
  for(const field of Object.keys(valid))for(const value of [undefined,null,'','A','ab',1])cases.push({...valid,[field]:value});
  for(const field of Object.keys(custom))for(const value of [undefined,null,'','A','ab',1])cases.push({...custom,[field]:value});
  for(const name of ['contactSchema','customRequestSchema','contactOrCustomSchema'])for(const input of cases)equal(JSON.parse(JSON.stringify(schemas[name].safeParse(input))),JSON.parse(JSON.stringify(original.exports[name].safeParse(input))),'Default server validation exactly matches HEAD '+name);
  const leaves=(value,prefix='')=>Object.fromEntries(Object.entries(value).flatMap(([key,item])=>typeof item==='string'?[[prefix+key,item]]:Object.entries(leaves(item,prefix+key+'.'))));
  for(const namespace of ['contact','requests','legal']){
    const id=leaves(require(path.join(root,'messages/id',namespace+'.json')));
    for(const locale of ['en','zh-CN']){const translated=leaves(require(path.join(root,'messages',locale,namespace+'.json')));equal(Object.keys(translated).sort(),Object.keys(id).sort(),'Catalog keys complete '+locale+'/'+namespace);for(const text of Object.values(translated))equal(text.trim().length>0,true,'No empty translated leaf');}
  }
  for(const route of ['privacy-policy','terms-of-service']){
    const before=execFileSync('git',['show',`HEAD:app/(public)/[locale]/(site)/${route}/page.tsx`],{cwd:root,encoding:'utf8'});const after=fs.readFileSync(path.join(root,`app/(public)/[locale]/(site)/${route}/page.tsx`),'utf8');
    const body=source=>source.match(/className="public-rich-text"[\s\S]*?>\s*([\s\S]*?)\s*<\/div>/)[1];equal(body(after),body(before),'Full Indonesian legal body unchanged '+route);equal(after.includes('lang="id"'),true,'Indonesian legal language marked');equal(after.includes('locale !== "id"'),true,'Notice limited to non-ID locale');
  }
  const modal=fs.readFileSync(path.join(root,'components/product/RfqModal.tsx'),'utf8');equal(modal.includes('href={result.waUrl}'),true,'Server WhatsApp URL remains authoritative');equal(modal.includes('data.message'),false,'Backend prose not displayed');equal(modal.includes('JSON.stringify({ ...form, productId: productId || "", productName: productName || "" })'),true,'RFQ request pins canonical identity props');
  if(!process.argv.includes('--unit'))await require('./verify-public-i18n-marketing-forms-browser.cjs')(equal);
  console.log(`PASS: ${checks} marketing form checks.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
