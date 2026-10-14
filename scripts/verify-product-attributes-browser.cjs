/* eslint-disable @typescript-eslint/no-require-imports -- Real components, isolated browser/action/data boundaries; no live DB writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const http = require('node:http'); const { spawn } = require('node:child_process'); const esbuild = require('esbuild');
const { connection } = require('./verify-product-translation-editor-browser.cjs');
const root = path.resolve(__dirname, '..'); const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;
async function main() {
  const bundle = await esbuild.build({ stdin: { resolveDir: root, loader: 'jsx', contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {NextIntlClientProvider} from 'next-intl';
    import ProductForm from './components/admin/ProductForm';import {ToastProvider} from './components/admin/Toast';
    import CartProvider,{useCart} from './components/cart/CartProvider';import CartClient from './components/cart/CartClient';
    import AddToCartButton from './components/cart/AddToCartButton';import ProductAttributes from './components/product/ProductAttributes';
    import StickyMobileBar from './components/store/StickyMobileBar';import {setDirectBuyItem,getDirectBuyItem} from './lib/direct-buy';
    import {productSchema} from './lib/validations/productSchema';
    import id from './messages/id/products.json';import en from './messages/en/products.json';import zh from './messages/zh-CN/products.json';
    const messages={id,en,'zh-CN':zh};window.catalogs=messages;window.errors=[];window.paths=[];window.calls=[];window.buy=[];
    window.addEventListener('error',e=>window.errors.push(e.message));window.addEventListener('unhandledrejection',()=>window.errors.push('Unhandled rejection'));
    window.router={push:p=>window.paths.push(p),refresh:()=>{}};
    window.source={id:'owned-attr-browser',slug:'owned-attr-browser',name:'QA Attribute',brand:'QA ATTR',category:'QA',description:'Deskripsi fixture atribut',product_type:'sparepart',features:[],specs:[],status:'draft',is_active:false,weight_grams:null};
    window.save=async raw=>{window.calls.push(raw);const result=productSchema.safeParse(raw);if(!result.success){window.lastErrors=result.error.flatten().fieldErrors;return{success:false,message:'Periksa atribut',errors:Object.fromEntries(Object.entries(window.lastErrors).map(([k,v])=>[k,v[0]]))}}window.parsed=result.data;return{success:true,productId:raw.id||raw.slug}};
    window.query=()=>{const q={select:()=>q,in:()=>q,eq:()=>q,is:()=>q,then:(ok,bad)=>Promise.resolve(window.failRules?{data:null,error:{code:'QA_ERROR'}}:{data:window.rules||[],error:null}).then(ok,bad)};return q};
    const app=createRoot(document.getElementById('app'));let key=0;
    function Probe({product,card=false}){const cart=useCart();window.cart=cart;return <><pre id='cart-state'>{JSON.stringify(cart.items)}</pre><AddToCartButton product={product} variant={card?'card':'detail'} onBuyNow={quantity=>{window.buy.push(quantity);setDirectBuyItem({...product,key:product.id+'::default',variant_id:null,variant_label:null,quantity})}}/><StickyMobileBar product={product} effectivePrice={10000} effectiveStock={product.stock} selectedVariant={null} hasVariants={false} waNumber={null} onAddToCart={()=>cart.addItem(product,product.min_purchase_qty)} onBuyNow={()=>{}}/></>}
    window.render=(mode='attributes',locale='id',attributes={},options={})=>{window.errors=[];window.paths=[];window.calls=[];window.buy=[];window.lastErrors=null;localStorage.clear();sessionStorage.clear();window.failRules=false;
      const product={...window.source,price:10000,stock:100,fulfillmentType:'ready_stock',min_purchase_qty:10,unit:'Pack',...attributes};
      window.rules=[{id:product.id,min_purchase_qty:options.currentMinimum||product.min_purchase_qty,unit:product.unit,stock:product.stock,product_variants:[]}];
      if(mode==='cart')localStorage.setItem('autentik-cart:v1',JSON.stringify([{...product,key:product.id+'::default',variant_id:null,variant_label:null,quantity:options.quantity||5}]));
      flushSync(()=>app.render(<NextIntlClientProvider key={++key} locale={locale} messages={{products:messages[locale]}} timeZone='Asia/Jakarta'>
        {mode==='admin'?<ToastProvider><ProductForm productType={options.type||'b2b_system'} initial={options.create?undefined:{...window.source,...attributes,product_type:options.type||'b2b_system',sku:'QA-ATTR',price:10000,stock:100,weight_grams:attributes.weight_grams??(options.type==='sparepart'?500:null)}}/></ToastProvider>
        :mode==='attributes'?<ProductAttributes attributes={attributes}/>:<CartProvider>{mode==='cart'?<CartClient/>:<Probe product={product} card={mode==='card'}/>}</CartProvider>}
      </NextIntlClientProvider>))};window.direct=()=>getDirectBuyItem();window.render();
  ` }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': root }, plugins: [{ name: 'fixture-boundaries', setup(build) {
    build.onResolve({ filter: /^(next\/link|next\/image|next\/navigation|next\/dynamic|@\/i18n\/navigation|@\/utils\/supabase\/client|@\/lib\/actions\/products|@\/lib\/actions\/technicalDocuments)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: root, loader: 'jsx', contents: {
      'next/link': "import React from 'react';export default function Link({href,...p}){return <a href={href} {...p}/>} ",
      '@/i18n/navigation': "import React from 'react';export default function Link({href,...p}){return <a href={href} {...p}/>}export const useRouter=()=>window.router;",
      'next/image': "import React from 'react';export default function Image({fill,priority,sizes,...p}){return <img {...p}/>}",
      'next/dynamic': 'export default function dynamic(){return ()=>null}',
      'next/navigation': 'export const useRouter=()=>window.router;',
      '@/utils/supabase/client': 'export const createClient=()=>({from:()=>window.query(),auth:{getSession:async()=>({data:{session:null}})}});',
      '@/lib/actions/products': 'export const upsertProduct=(raw)=>window.save(raw);',
      '@/lib/actions/technicalDocuments': 'export const upsertTechnicalDocument=async()=>({success:true});export const deleteTechnicalDocument=async()=>({success:true});',
    }[args.path] }));
  } }] });
  const css = fs.readdirSync(path.join(root, '.next/static'), { recursive: true }).filter(p => p.endsWith('.css')).map(p => fs.readFileSync(path.join(root, '.next/static', p), 'utf8')).join('\n');
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="app"></div><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const parent = path.join(os.tmpdir(), 'opencode'); assert.ok(fs.existsSync(parent));
  const profile = fs.mkdtempSync(path.join(parent, 'product-attributes-'));
  const browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--no-first-run', '--remote-debugging-port=19662', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  let d;
  try {
    for (let i = 0; i < 100; i++) { try { d = await connection(19662); break; } catch { await sleep(100); } }
    assert.ok(d); const { cdp, evaluate, wait, fill, click } = d;
    const test = async (expression, expected, label) => { assert.deepEqual(await evaluate(expression), expected, label); checks++; };
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` }); await wait('window.render');
    for (const width of [375, 1440]) for (const locale of ['id', 'en', 'zh-CN']) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, mobile: false, deviceScaleFactor: 1 });
      await evaluate(`window.render('attributes','${locale}',{min_purchase_qty:10,unit:'Pack',length:12.5,width:8,height:3,dimension_unit:'cm',weight_grams:500,dimensions_note:'Diameter kanonis'})`);
      await test('document.querySelector("dl").textContent.includes(window.catalogs[' + JSON.stringify(locale) + '].attributes.minimum)', true, 'Localized labels ' + width + '/' + locale);
      await test('document.querySelector("dl").textContent.includes("Pack") && document.querySelector("dl").textContent.includes("Diameter kanonis")', true, 'Canonical values unchanged');
      await test('document.documentElement.scrollWidth<=innerWidth', true, 'No attribute overflow');
      await evaluate(`window.render('attributes','${locale}',{length:2,dimension_unit:'m'})`);
      await test('document.querySelector("dl").textContent.includes(window.catalogs[' + JSON.stringify(locale) + '].attributes.length)', true, 'Partial uses explicit axis');
      await test('document.querySelector("dl").textContent.includes("×")', false, 'Partial does not invent full dimensions');
    }
    await evaluate("window.render('attributes','id',{dimensions_note:'Diameter 20 mm'})"); await test('document.querySelectorAll("dd").length', 1, 'Note only');
    await evaluate("window.render('attributes','id',{})"); await test('document.querySelector("dl")', null, 'Empty renders nothing');
    for (const minimum of [1,10,100,999]) {
      await evaluate(`window.render('purchase','en',{min_purchase_qty:${minimum},stock:1000})`); await wait('window.cart?.hydrated');
      await click('Cart'); await test('window.cart.items[0].quantity', minimum, 'Add starts at ' + minimum);
      await evaluate(`document.querySelector('button[aria-label="Decrease quantity"]').click()`);
      await test(`document.querySelector('button[aria-label="Decrease quantity"]').disabled`, true, 'Decrement floor');
    }
    await evaluate("window.render('card','en',{stock:100})"); await click('Cart (10 Pack)'); await test('window.cart.items[0].quantity', 10, 'Quick add minimum visible and enforced');
    await evaluate("window.render('purchase','en',{stock:9})"); await test('[...document.querySelectorAll("button")].filter(b=>b.textContent.includes("Cart")).every(b=>b.disabled)', true, 'Detail/sticky below minimum disabled');
    await evaluate("window.render('purchase','en',{stock:10})"); await click('Buy Now'); await test('window.direct().quantity', 10, 'Direct snapshot respects minimum');
    await evaluate("window.render('purchase','en',{stock:100})"); await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Cart"&&b.className.includes("h-11")).click()'); await test('window.cart.items[0].quantity', 10, 'Sticky uses minimum');
    await evaluate("window.render('cart','en',{min_purchase_qty:1,stock:100},{quantity:5,currentMinimum:10})"); await wait('window.cart===undefined || document.querySelector("button").textContent'); await sleep(150);
    await test('JSON.parse(localStorage.getItem("autentik-cart:v1"))[0].quantity', 5, 'Canonical refresh keeps legacy payable quantity');
    await test(`document.querySelector('a[href="/store/checkout"]')===null`, true, 'Below current minimum blocks checkout link');
    await click('Change quantity to 10'); await test('JSON.parse(localStorage.getItem("autentik-cart:v1"))[0].quantity', 10, 'Correction requires explicit click');
    await test(`document.querySelector('a[href="/store/checkout"]')!==null`, true, 'Corrected cart can proceed');
    for (const width of [375,1440]) for (const type of ['b2b_system','sparepart']) for (const create of [false,true]) {
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:950,mobile:false,deviceScaleFactor:1});
      await evaluate(`window.render('admin','id',{min_purchase_qty:77,unit:'Hidden technical value',length:12.5,dimension_unit:'cm',weight_grams:500}, {type:'${type}',create:${create}})`);
      if (create) {
        for (const [label,value] of [[type==='sparepart'?'Nama Komponen':'Nama Produk','QA Attribute'],['Slug (URL)','owned-attributes-create-'+type],['Merek','QA ATTR'],['Kategori','QA'],['Deskripsi','Deskripsi fixture atribut'],...(type==='sparepart'?[['SKU','QA-ATTR'],['Harga (Rp)','10000'],['Stok','100']]:[])]) {
          await evaluate(`(()=>{const label=[...document.querySelectorAll('label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const input=label?.parentElement.querySelector('input:not([type=color]),textarea');if(!input)throw Error('Missing fixture control');input.setAttribute('data-fixture-field','entry')})()`);
          await fill('[data-fixture-field="entry"]',value);
          await evaluate("document.querySelector('[data-fixture-field]').removeAttribute('data-fixture-field')");
        }
      }
      if(type==='b2b_system'){
        await test('document.querySelectorAll("[id^=attribute-]").length',0,'B2B has no new attribute/weight controls '+width+'/'+create);
        await click('Simpan Produk');await wait('window.paths.length>0');
        await test(`['minPurchaseQty','unit','length','width','height','dimensionUnit','dimensionsNote','weightGrams'].filter(k=>Object.hasOwn(window.calls[0],k))`,[],'B2B raw form payload omits hidden/default attribute values');
        await test(`['minPurchaseQty','unit','length','width','height','dimensionUnit','dimensionsNote','weightGrams'].filter(k=>Object.hasOwn(window.parsed,k))`,[],'B2B validation remains pre-task');
        await test('window.calls.length',1,'B2B source save still happens once');
        await test('window.paths[0]',create?'/admin/produk/owned-attributes-create-b2b-system?created=1':'/admin/produk','B2B source save navigation unchanged');
        continue;
      }
      await fill('#attribute-minimum','10'); await fill('#attribute-unit','Pack'); await fill('#attribute-length','12,5');
      await fill('#attribute-width','8'); await fill('#attribute-height','3');
      await fill('#attribute-weight','500'); await fill('#attribute-note','Diameter kanonis');
      await evaluate('document.getElementById("attribute-dimension-unit").value="cm";document.getElementById("attribute-dimension-unit").dispatchEvent(new Event("change",{bubbles:true}))');
      await click(type==='sparepart'?'Simpan Komponen':'Simpan Produk'); await wait('window.paths.length>0');
      await test('[window.calls.length,window.parsed.minPurchaseQty,window.parsed.unit,window.parsed.length,window.parsed.width,window.parsed.height,window.parsed.weightGrams]', [1,10,'Pack',12.5,8,3,500], 'Single Komponen full-dimension/required-weight save ' + width + '/' + create);
      await test('document.documentElement.scrollWidth<=innerWidth',true,'Komponen attribute controls fit viewport '+width);
      await test('window.paths[0]', type==='sparepart'?'/admin/sparepart':create?'/admin/produk/owned-attributes-create-b2b-system?created=1':'/admin/produk', 'First-save/edit destination remains correct');
      await evaluate(`window.render('admin','id',{min_purchase_qty:10,unit:'Pack',length:12.5,dimension_unit:'cm',dimensions_note:'Diameter kanonis',weight_grams:500},{type:'${type}'})`);
      await test('[document.getElementById("attribute-minimum").value,document.getElementById("attribute-length").value,document.getElementById("attribute-unit").value]', ['10','12.5','Pack'], 'Reopen initializes canonical attributes');
      await test('document.querySelectorAll("#attribute-weight").length', 1, 'Only one weight control');
      await test('document.getElementById("attribute-weight").value', '500', 'Reopen preserves supplied weight');
    }
    for (const attributes of [{length:2,dimension_unit:'m'}, {dimensions_note:'Diameter saja'}, {}]) {
      await evaluate(`window.render('admin','id',${JSON.stringify(attributes)},{type:'sparepart'})`);
      await click('Simpan Komponen'); await wait('window.paths.length>0');
      await test('[window.parsed.length,window.parsed.width,window.parsed.height,window.parsed.dimensionUnit,window.parsed.dimensionsNote]',
        [attributes.length??null,null,null,attributes.dimension_unit??null,attributes.dimensions_note??null], 'Komponen Admin partial/note-only/blank save');
    }
    await evaluate("window.render('admin','id',{}, {type:'sparepart'})"); await fill('#attribute-weight',''); await click('Simpan Komponen'); await wait('window.lastErrors');
    await test('window.paths', [], 'Komponen blank weight blocks save/navigation');
    console.log(`PASS: ${checks} real-component attribute/Admin/cart/direct-buy/browser assertions. No live Product or payment mutations.`);
  } finally { d?.socket.close(); browser.kill(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
