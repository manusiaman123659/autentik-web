/* eslint-disable @typescript-eslint/no-require-imports -- Offline Store route/component contract with isolated Next/auth/network boundaries. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
let checks = 0;
function eq(actual, expected, label) { assert.deepEqual(actual, expected, label); checks++; }
function loader(mocks) {
  const cache = new Map();
  return function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, mod);
    const native = mod.require.bind(mod);
    mod.require = name => mocks.has(name) ? mocks.get(name) : name.startsWith('@/') ? load(name.slice(2) + (fs.existsSync(path.join(root, name.slice(2) + '.ts')) ? '.ts' : '.tsx'))
      : name.startsWith('.') && !path.extname(name) ? load(path.relative(root, path.resolve(path.dirname(filename), name)) + (fs.existsSync(path.resolve(path.dirname(filename), name + '.ts')) ? '.ts' : '.tsx')) : native(name);
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
    return mod.exports;
  };
}

async function main() {
  const canonical = { id: 'id-aka', slug: 'slug-aka', product_type: 'sparepart', is_store_visible: true, status: 'published', is_active: true, deleted_at: null,
    name: 'Nama kanonis', description: 'Deskripsi kanonis', seo_description: 'SEO kanonis', sku: 'AKA-01', brand: 'AKA', category: 'Komponen', price: 12345, stock: 7,
    features: ['Fitur kanonis'], specs: [{ label: 'Tegangan', value: '12 V' }], translation_source_revision: 2 };
  const localized = { canonical, display: { name: 'English display', description: 'English description', features: ['English feature'], specs: [{ label: 'Voltage', value: '12 V' }], seo_title: 'English SEO', seo_description: 'English summary' } };
  let locale = 'en'; let rpcEnabled = false; let canonicalReads = 0; const calls = []; const carts = [];
  const displays = {
    id: { name: canonical.name, description: canonical.description, features: canonical.features, specs: canonical.specs, seo_title: null, seo_description: canonical.seo_description },
    en: localized.display,
    'zh-CN': { ...localized.display, name: '中文名称', description: '中文说明', seo_title: null, seo_description: null },
  };
  const view = current => ({ canonical, display: displays[current] });
  const links = loader(new Map())('i18n/locales.ts');
  const mocks = new Map([
    ['next-intl', { useTranslations: namespace => require('use-intl/core').createTranslator({ locale, messages: { products: require('../messages/'+locale+'/products.json') }, namespace }) }],
    ['next-intl/server', { getLocale: async () => locale, getTranslations: async () => key => ({title:'Store '+locale,description:'Store description '+locale})[key] }],
    ['next/navigation', { notFound: () => { throw Error('404'); } }],
    ['@/lib/public-store-products', {
      resolvePublicStoreProducts: async (rows, requested) => { calls.push(['listing', requested, rows]); return [view(requested)]; },
      getPublicStoreDetail: async (slug, requested) => { calls.push(['detail', slug, requested]); return slug === 'hidden' ? null : { product: view(requested), related: [view(requested)] }; },
      getPublicStoreRecentProducts: async (ids, requested) => { calls.push(['recent', ids, requested]); return ids.map(id => ({ id, slug: canonical.slug, brand: canonical.brand, image_url: null, price: canonical.price, displayName: displays[requested].name })); },
    }],
    ['@/lib/admin-data', { listStoreProducts: async () => { canonicalReads++; return [canonical]; } }],
    ['@/lib/public-store-search', { isStoreSearchEnabled: () => rpcEnabled }],
    ['@/lib/public-data', { getWhatsAppContacts: async () => ({ ppicAka: null, mikaSales: null }) }],
    ['@/utils/supabase/server', { createClient: () => ({ from: () => { const q = { select: () => q, eq: () => q, is: () => q, order: async () => ({ data: [], error: null }) }; return q; } }) }],
    ['next/headers', { cookies: async () => ({}) }],
    ['@/components/store/StoreProductDetail', { __esModule: true, default: props => React.createElement('div', {}, props.display.name + ':' + props.product.name) }],
    ['@/components/seo/JsonLd', { __esModule: true, default: () => null }],
    ['@/components/cart/AddToCartButton', { __esModule: true, default: props => { carts.push(props.product); return React.createElement('button', {}, 'Keranjang'); } }],
    ['@/components/requests/ProductFulfillmentCta', { __esModule: true, default: () => null }],
    ['@/components/store/WishlistButton', { __esModule: true, default: () => null }],
    ['next/image', { __esModule: true, default: ({ alt }) => React.createElement('img', { alt }) }],
    ['@/i18n/navigation', { __esModule: true, default: ({ href, children }) => React.createElement('a', { href: links.localizeHref(href, locale) }, children), useRouter: () => ({ push: () => {} }) }],
  ]);
  const load = loader(mocks);
  const listing = load('app/(public)/[locale]/(site)/store/page.tsx');
  const listingTree = await listing.default({ searchParams: Promise.resolve({ q: '' }) });
  eq(calls[0]?.slice(0, 2), ['listing', 'en'], 'Listing uses active locale and A1 resolution');
  eq(listingTree.props.products[0], localized, 'Listing passes separate canonical/display view');
  eq(canonicalReads,1,'Disabled RPC gate retains canonical Store listing');
  rpcEnabled=true;
  const gated=await listing.default({searchParams:Promise.resolve({q:''})});
  eq(gated.props.rpcEnabled,true,'Enabled Store uses RPC listing mode');
  eq(gated.props.products,[],'Enabled Store never serializes the full product table');
  eq(canonicalReads,1,'Enabled Store does not fetch canonical full table');
  rpcEnabled=false;
  const detail = load('app/(public)/[locale]/(site)/store/[slug]/page.tsx');
  for (const current of ['id','en','zh-CN']) {
    locale = current;
    const meta = await detail.generateMetadata({ params: Promise.resolve({ slug: canonical.slug }) });
    const display = displays[current];
    eq(meta.title, display.seo_title || `${display.name} — AKA | PT Autentik Karya Analitika`, current+' detail SEO title');
    eq(meta.description, display.seo_description || display.description, current+' detail SEO description/fallback');
    eq(meta.alternates.canonical, links.localizeHref('/store/slug-aka',current), current+' canonical URL retains source slug');
    eq(meta.alternates.languages['x-default'], '/store/slug-aka', current+' x-default retains source slug');
    const tree = await detail.default({ params: Promise.resolve({ slug: canonical.slug }) });
    eq(renderToStaticMarkup(tree).includes(display.name+':Nama kanonis'), true, current+' detail displays localized name alongside canonical');
    const listingMeta = await listing.generateMetadata();
    eq(listingMeta.title,'Store '+current,current+' listing metadata locale');
    eq(listingMeta.alternates.canonical,links.localizeHref('/store',current),current+' listing canonical');
    const jsonLd = load('lib/seo/jsonLd.ts').productOfferSchema(canonical,current,display);
    eq(jsonLd.name,display.name,current+' JSON-LD display name');
    eq(jsonLd.sku,canonical.sku,current+' JSON-LD SKU canonical');
    eq(jsonLd.offers.price,canonical.price,current+' JSON-LD price canonical');
    eq(jsonLd.offers.availability,'https://schema.org/InStock',current+' JSON-LD availability remains canonical');
    eq(jsonLd.url.endsWith(links.localizeHref('/store/'+canonical.slug,current)),true,current+' JSON-LD slug canonical');
  }
  await assert.rejects(() => detail.generateMetadata({ params: Promise.resolve({ slug: 'hidden' }) }), /404/); checks++;
  await assert.rejects(() => detail.default({ params: Promise.resolve({ slug: 'hidden' }) }), /404/); checks++;
  locale='en';
  const card = load('components/store/StoreProductCard.tsx').default;
  const cardHtml = renderToStaticMarkup(React.createElement(card, { product: localized, mikaSalesNumber: null }));
  eq(cardHtml.includes('English display'), true, 'Card displays translated name');
  eq(cardHtml.includes('12345'), false, 'Card formats canonical price rather than raw number');
  eq(carts.at(-1)?.name, canonical.name, 'Cart always receives canonical name');
  const detailed = new Map(mocks);
  const mini = name => ({ __esModule:true, default: props => React.createElement('span',{},props?.name ?? name) });
  detailed.set('@/utils/supabase/client',{createClient:()=>({auth:{getUser:async()=>({data:{user:null}})}})});
  detailed.set('@/components/cart/CartProvider',{useCart:()=>({addItem:()=>{}})});
  detailed.set('@/components/store/useRecentlyViewed',{useRecentlyViewed:()=>({add:()=>{}})});
  detailed.set('@/components/store/ProductImageGallery',mini('gallery'));
  detailed.set('@/components/store/RelatedProducts',{__esModule:true,default:({products})=>React.createElement('span',{},products.map(p=>p.display.name).join(','))});
  detailed.set('@/components/store/RecentlyViewed',{__esModule:true,default:({locale:current})=>React.createElement('span',{},'recent-'+current)});
  detailed.set('@/components/store/ShareProductButton',mini('share'));
  detailed.set('@/components/store/CopyLinkButton',mini('copy'));
  detailed.set('@/components/store/StickyMobileBar',{__esModule:true,default:({product,displayName})=>React.createElement('span',{},displayName+':'+product.name)});
  detailed.set('@/components/product/ProductAttributes',mini('attributes'));
  detailed.set('@/components/ui/WhatsAppButton',mini('wa'));
  const detailHtml=renderToStaticMarkup(React.createElement(loader(detailed)('components/store/StoreProductDetail.tsx').default,
    {product:canonical,display:localized.display,locale:'en',ppicAkaNumber:null,mikaSalesNumber:null,relatedProducts:[localized],variants:[]}));
  for(const text of ['English display','English description','English feature','recent-en','English display:Nama kanonis'])
    eq(detailHtml.includes(text),true,'Rendered Store detail has localized presentation '+text);
  eq(detailHtml.includes('SKU: AKA-01'),true,'Rendered Store detail SKU remains canonical');
  eq(carts.at(-1)?.name,canonical.name,'Detail cart receives canonical name');
  const listingMocks=new Map(mocks);
  for(const id of ['StoreSearchBar','CategoryToolbar','StoreFilterSidebar','StoreTrustStrip','StorePromoBanner'])
    listingMocks.set('@/components/store/'+id,mini(id));
  listingMocks.set('@/components/store/StoreProductCard',{__esModule:true,default:({product})=>React.createElement('span',{},product.display.name)});
  listingMocks.set('@/components/ui/EmptyState',{__esModule:true,default:({title})=>React.createElement('span',{},title)});
  listingMocks.set('@/components/ui/WhatsAppButton',mini('wa'));
  const StoreClient=loader(listingMocks)('app/(public)/[locale]/(site)/store/StoreClient.tsx').default;
  const filtered=renderToStaticMarkup(React.createElement(StoreClient,{products:[localized],compatible:null,ppicAkaNumber:null,mikaSalesNumber:null,initialQuery:'english display'}));
  eq(filtered.includes(require('../messages/en/products.json').storeUi.empty),true,'Listing search remains canonical-only in A2');
  const matched=renderToStaticMarkup(React.createElement(StoreClient,{products:[localized],compatible:null,ppicAkaNumber:null,mikaSalesNumber:null,initialQuery:'Nama kanonis'}));
  eq(matched.includes('English display'),true,'Canonical search result renders localized card');
  const route = load('app/api/store/recent/route.ts');
  const recent = await route.POST(new Request('http://localhost/api/store/recent', { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:[canonical.id],locale:'zh-CN'}) }));
  eq(recent.status,200,'Recent route accepts bounded IDs and locale');
  eq((await recent.json()).data[0].displayName,'中文名称','Recent route returns resolved localized display name');
  eq(recent.headers.get('cache-control'),'private, no-store','Recent response is private and uncached');
  const readCount=calls.length;
  const invalid=await route.POST(new Request('http://localhost/api/store/recent',{method:'POST',body:JSON.stringify({ids:Array(9).fill(canonical.id),locale:'en'})}));
  eq(invalid.status,400,'Recent route rejects more than eight IDs');
  eq(calls.length,readCount,'Invalid recent request never reaches data reader');
  const malformed=await route.POST(new Request('http://localhost/api/store/recent',{method:'POST',body:'{broken'}));
  eq(malformed.status,400,'Malformed recent JSON is rejected before public lookup');
  const oversized=await route.POST(new Request('http://localhost/api/store/recent',{method:'POST',body:'x'.repeat(8193)}));
  eq(oversized.status,413,'Oversized recent request is rejected');
  eq(calls.length,readCount,'Malformed/oversized requests never reach data reader');
  const wrongLocale=await route.POST(new Request('http://localhost/api/store/recent',{method:'POST',body:JSON.stringify({ids:[canonical.id],locale:'fr'})}));
  eq(wrongLocale.status,400,'Recent route rejects unsupported locale');
  eq(calls.length,readCount,'Unsupported locale never reaches data reader');
  console.log(`PASS: ${checks} focused Store A2 route/SEO/card/canonical assertions; no network or database.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
