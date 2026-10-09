/* eslint-disable @typescript-eslint/no-require-imports -- Executes actual TypeScript modules with isolated transport mocks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const id = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';
const origin = 'https://fixture.supabase.co';
const mediaUrl = `${origin}/storage/v1/object/public/media/portfolio/${id}/image.png`;
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
function fixture(overrides = {}) {
  return { id, title: 'Entri', summary: 'Ringkasan', description: '', entry_kind: 'portfolio',
    category_label: null, organization_name: null, image_url: null, image_alt: null, image_caption: null,
    source_reference: 'INTERNAL-PROVENANCE', status: 'published', sort_order: 0,
    created_at: '2026-10-09T00:00:00Z', updated_at: '2026-10-09T00:00:00Z', ...overrides };
}
function harness(options = {}) {
  let rows = (options.rows ?? []).map(row => ({ ...row }));
  const effects = [];
  const modules = new Map();
  function query(table) {
    effects.push({ read: table });
    const filters = []; const sorts = [];
    let mutation; let payload; let columns;
    const q = {
      select: value => { columns = value; return q; },
      eq: (key, value) => { filters.push([key, value]); return q; },
      order: key => { sorts.push(key); return q; },
      insert: value => { mutation = 'insert'; payload = value; return q; },
      update: value => { mutation = 'update'; payload = value; return q; },
      delete: () => { mutation = 'delete'; return q; },
      maybeSingle: async () => result(true),
      then: (resolve, reject) => Promise.resolve().then(() => result(false)).then(resolve, reject),
    };
    function result(single) {
      if (options.transportThrows) throw new Error('Transport unavailable');
      if (options.dbError) return { data: null, error: { message: 'Mock database error' } };
      if (table === 'profiles') return { data: options.signedOut || options.missingProfile ? null : {
        id, email: 'fixture@example.com', role: options.role ?? 'editor', is_active: options.active !== false,
      }, error: null };
      let selected = rows.filter(row => filters.every(([key, value]) => row[key] === value));
      if (mutation) {
        effects.push({ mutation, payload, filters });
        if (mutation === 'insert') { const row = fixture({ ...payload, id: rows.length ? secondId : id }); rows.push(row); selected = [row]; }
        if (mutation === 'update') selected.forEach(row => Object.assign(row, payload));
        if (mutation === 'delete') rows = rows.filter(row => !selected.includes(row));
      }
      selected.sort((a, b) => { for (const key of sorts) { if (a[key] < b[key]) return -1; if (a[key] > b[key]) return 1; } return 0; });
      effects.push({ columns, filters, sorts });
      const projected = selected.map(row => columns === '*' || !columns ? { ...row }
        : Object.fromEntries(columns.split(',').map(key => [key, row[key]])));
      return { data: single ? projected[0] ?? null : projected, error: null };
    }
    return q;
  }
  const client = { from: query, auth: { getUser: async () => ({ data: { user: options.signedOut ? null : { id, email: 'fixture@example.com' } } }) } };
  const stubs = {
    'server-only': {}, react: { ...React, cache: fn => fn },
    'next/headers': { cookies: async () => ({}) },
    'next/cache': { revalidatePath: url => effects.push({ revalidate: url }) },
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
    '@/utils/supabase/server': { createClient: () => client },
    '@/utils/supabase/admin': { createAdminClient: () => { throw new Error('SERVICE_ROLE_FORBIDDEN'); } },
    '@/lib/audit': { recordAudit: async (...args) => effects.push({ audit: args }) },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/components/ui/ScrollAnimations': { __esModule: true, default: ({ children, className, style }) => React.createElement('div', { className, style }, children) },
    '@/components/ui/PortfolioImage': { __esModule: true, default: ({ src, alt, caption }) => React.createElement('figure', {}, React.createElement('img', { src, alt }), caption) },
  };
  function load(specifier) {
    if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
    if (!specifier.startsWith('@/')) return require(specifier);
    const filename = ['.ts', '.tsx'].map(ext => path.join(root, specifier.slice(2) + ext)).find(file => fs.existsSync(file));
    if (!filename) throw new Error(`Missing ${specifier}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loadedModule = { exports: {} }; modules.set(filename, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: load, console, URL,
      process: { env: { NEXT_PUBLIC_SUPABASE_URL: origin } }, Set, Map, Promise }, { filename });
    return loadedModule.exports;
  }
  return { load, effects, rows: () => rows };
}
async function main() {
  const validation = harness().load('@/lib/validations/portfolioSchema').portfolioSchema;
  check(validation.parse({ title: 'Duplicate permitted' }).status === 'draft', 'Create defaults Draft');
  for (const patch of [{ title: ' \n\t' }, { status: 'paid' }, { sortOrder: -1 }, { sortOrder: 1.5 }, { sortOrder: 10000 },
    { status: 'published' }, { status: 'published', summary: ' \n\t' },
    { status: 'published', summary: 'OK', imageUrl: mediaUrl },
    { imageUrl: 'https://attacker.example/image.png' }, { title: 'x'.repeat(161) }, { summary: 'x'.repeat(501) },
    { description: 'x'.repeat(10001) }, { entryKind: 'patent' }]) {
    check(!validation.safeParse({ title: 'Entri', ...patch }).success, `Reject invalid fields: ${JSON.stringify(patch).slice(0, 120)}`);
  }
  check(validation.safeParse({ title: 'ePal', summary: 'OK', status: 'published', imageUrl: mediaUrl, imageAlt: 'Gambar' }).success, 'Published with image/alt');
  check(validation.parse({ title: '  ePal  ', description: '<script>text</script>' }).title === '  ePal  ', 'Meaningful text/case preserved');
  const media = harness().load('@/lib/portfolio-media');
  for (const url of [mediaUrl, '/images/compro/slide-10.jpg', '/images/compro/slide-11.jpg']) check(media.safePortfolioImageUrl(url) === url, 'Accept scoped media/bootstrap');
  for (const url of ['javascript:alert(1)', '//attacker.example/a.png', mediaUrl + '?x=1', mediaUrl + '#x',
    mediaUrl.replace('fixture.supabase.co', 'attacker.example'), mediaUrl.replace('portfolio/', 'brands/'),
    mediaUrl.replace('https:', 'http:'), mediaUrl.replace('image.png', 'image.svg'), mediaUrl.replace('/image.png', '%2fimage.png'),
    '/images/compro/slide-12.jpg', 'data:image/png;base64,abc']) check(media.safePortfolioImageUrl(url) === null, 'Reject unsafe/wrong-namespace image');
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) check(media.validatePortfolioImageFile({ type, size: 5 * 1024 * 1024 }) === null, 'Accept supported type/size');
  for (const file of [{ type: 'image/svg+xml', size: 10 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 5 * 1024 * 1024 + 1 }]) check(Boolean(media.validatePortfolioImageFile(file)), 'Reject unsafe/oversize file');
  const created = harness();
  check((await created.load('@/lib/actions/portfolio').savePortfolio({ title: 'Entri' })).success, 'Create succeeds');
  check(created.rows()[0].status === 'draft', 'Created Draft persisted');
  check(created.effects.some(effect => effect.mutation === 'insert') && !created.effects.some(effect => effect.mutation === 'update'), 'Create uses INSERT');
  check((await created.load('@/lib/actions/portfolio').savePortfolio({ title: 'Entri' })).success && created.rows().length === 2, 'Duplicate titles create distinct identities');
  const edited = harness({ rows: [fixture()] });
  check((await edited.load('@/lib/actions/portfolio').savePortfolio({ id, title: 'Edited', summary: 'Updated' })).success, 'Edit succeeds');
  check(edited.rows()[0].status === 'published', 'Edit without explicit status preserves Published');
  check(edited.effects.some(effect => effect.mutation === 'update') && !edited.effects.some(effect => effect.mutation === 'insert'), 'Edit uses UUID UPDATE only');
  check(edited.effects.some(effect => effect.audit) && edited.effects.some(effect => effect.revalidate === '/research-partnership'), 'Successful edit audited/revalidated');
  const explicitUndefined = harness({ rows: [fixture()] });
  check((await explicitUndefined.load('@/lib/actions/portfolio').savePortfolio({ id, title: 'Edited', summary: 'Updated', status: undefined })).success
    && explicitUndefined.rows()[0].status === 'published', 'Undefined status is not an explicit unpublish');
  const incomplete = harness({ rows: [fixture()] });
  check(!(await incomplete.load('@/lib/actions/portfolio').savePortfolio({ id, title: 'Edited' })).success, 'Preserved Published still requires summary');
  check(!incomplete.effects.some(effect => effect.mutation || effect.audit), 'Validation failure no write/audit');
  for (const [action, args] of [['savePortfolio', [{ id, title: 'Missing' }]], ['deletePortfolio', [id]], ['setPortfolioStatus', [id, 'published']]]) {
    const missing = harness(); check(!(await missing.load('@/lib/actions/portfolio')[action](...args)).success, `Missing target fails ${action}`);
    check(!missing.effects.some(effect => effect.audit || effect.revalidate), 'No success effects for missing row');
  }
  for (const options of [{ dbError: true }, { role: 'staff' }, { role: 'customer' }, { active: false }, { signedOut: true }, { missingProfile: true }]) {
    for (const [action, args] of [['savePortfolio', [{ title: 'Entri' }]], ['setPortfolioStatus', [id, 'published']], ['deletePortfolio', [id]]]) {
      const denied = harness({ ...options, rows: [fixture()] });
      check(!(await denied.load('@/lib/actions/portfolio')[action](...args)).success, `Denied/DB error ${action}`);
      check(!denied.effects.some(effect => effect.mutation || effect.audit || effect.revalidate), 'No mutation/success effects for denied action');
    }
  }
  const lifecycle = harness({ rows: [fixture({ image_url: mediaUrl, image_alt: 'Image' })] });
  const actions = lifecycle.load('@/lib/actions/portfolio');
  const readers = lifecycle.load('@/lib/portfolio-data');
  check((await readers.listPublishedPortfolios()).entries.length === 1, 'Published visible');
  check((await actions.setPortfolioStatus(id, 'draft')).success, 'Unpublish succeeds');
  check((await readers.listPublishedPortfolios()).entries.length === 0 && (await readers.listAdminPortfolios()).length === 1, 'Draft hidden public, visible CMS');
  check((await actions.setPortfolioStatus(id, 'published')).success && (await readers.listPublishedPortfolios()).entries.length === 1, 'Next request reflects republish');
  check((await actions.deletePortfolio(id)).success && (await readers.listPublishedPortfolios()).entries.length === 0, 'Next request reflects hard delete, no Storage deletion method available');
  for (const role of ['super_admin', 'admin', 'editor', 'staff', 'customer']) {
    const reader = harness({ role, rows: [fixture(), fixture({ id: secondId, status: 'draft' })] });
    const result = await reader.load('@/lib/portfolio-data').listPublishedPortfolios();
    check(result.entries.length === 1, `Public published-only, including ${role}`);
    check(!JSON.stringify(result).includes('INTERNAL-PROVENANCE') && !('status' in result.entries[0]), 'Public DTO excludes internal fields');
    check(reader.effects.some(effect => effect.filters?.some(([key, value]) => key === 'status' && value === 'published')), 'Explicit query filter');
    if (['staff', 'customer'].includes(role)) {
      const denied = harness({ role }); await assert.rejects(() => denied.load('@/lib/portfolio-data').listAdminPortfolios(), /NOT_FOUND/); checks++;
      check(!denied.effects.some(effect => effect.read === 'research_portfolios'), 'Reader guard before content query');
    }
  }
  for (const options of [{}, { dbError: true }, { transportThrows: true }]) {
    const result = await harness(options).load('@/lib/portfolio-data').listPublishedPortfolios();
    check(result.entries.length === 0 && result.unavailable === Boolean(options.dbError || options.transportThrows), 'Empty/error distinct, no legacy fallback');
  }
  const unsafeImage = await harness({ rows: [fixture({ image_url: 'https://attacker.example/a.png', image_alt: 'Image' })] }).load('@/lib/portfolio-data').listPublishedPortfolios();
  check(unsafeImage.entries[0].image_url === null, 'Public DTO neutralizes unsafe images');
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/0065_research_portfolios.sql'), 'utf8');
  const baseline = fs.readFileSync(path.join(root, 'supabase/migrations/0061_rbac_roles.sql'), 'utf8');
  const normalize = text => text.replace(/\s/g, '');
  check(normalize(sql.match(/\$baseline\$([\s\S]*?)\$baseline\$/)[1]) === normalize(baseline.match(/CREATE FUNCTION public.can_manage_cms_media[\s\S]*?AS \$\$([\s\S]*?)\$\$/)[1]), 'Preflight matches exact 0061 helper body');
  check(/ENABLE ROW LEVEL SECURITY/.test(sql) && /FOR SELECT TO anon, authenticated USING \(status = 'published'\)/.test(sql), 'Public RLS Published only');
  for (const operation of ['select', 'insert', 'update', 'delete']) check(sql.includes(`research_portfolios_content_${operation}`), 'Separate capability policy');
  check(/USING \(\(SELECT public.has_cms_capability\('content'\)\)\) WITH CHECK/.test(sql), 'UPDATE old/new row guard');
  check(/REVOKE ALL ON public.research_portfolios FROM PUBLIC, anon, authenticated/.test(sql), 'Explicit ACL reset');
  check(/GRANT SELECT ON public.research_portfolios TO anon, authenticated/.test(sql) && !/GRANT (?:INSERT|UPDATE|DELETE).*TO anon/.test(sql), 'Anon has no writes');
  check(/STABLE SECURITY DEFINER SET search_path = ''/.test(sql), 'Media helper security attributes explicit');
  check(!/DROP FUNCTION|GRANT EXECUTE|REVOKE EXECUTE/.test(sql), 'CREATE OR REPLACE retains existing media helper ACL');
  check(/research_portfolios_published_summary/.test(sql) && /summary ~ '\[\^\[:space:\]\]'/.test(sql), 'DB non-whitespace summary constraint');
  check(/research_portfolios_published_image_alt/.test(sql), 'DB Published image alt constraint');
  const content = harness().load('@/lib/data/research-partnership');
  for (const row of content.verifiedCollaborations) for (const value of [row.organization, row.scope, row.category, row.source]) check(sql.includes(`'${value}'`), 'Bootstrap collaboration fidelity');
  for (const row of content.registeredTrademarks) for (const value of [row.name, row.holder, row.category, row.source]) check(sql.includes(`'${value}'`), 'Bootstrap trademark fidelity/case');
  for (const row of content.trademarkDocuments) for (const value of [row.imageSrc, row.alt]) check(sql.includes(`'${value}'`), 'Bootstrap certificate fidelity');
  check((sql.match(/a0650000-0000-4000-8000-00000000000[1-7]/g) ?? []).length === 7, 'Seven deterministic seed identities');
  const mediaBody = sql.match(/CREATE OR REPLACE FUNCTION public.can_manage_cms_media[\s\S]*?AS \$\$([\s\S]*?)\$\$/)[1];
  const oldBody = baseline.match(/CREATE FUNCTION public.can_manage_cms_media[\s\S]*?AS \$\$([\s\S]*?)\$\$/)[1];
  check(normalize(mediaBody).startsWith(normalize(oldBody).replace(/;$/, '') + 'OR'), 'Existing media authorization branches retained verbatim');
  const portfolioPathPattern = new RegExp(mediaBody.match(/p_path ~ '([^']+)'/)[1]);
  const permissions = harness().load('@/lib/admin-permissions');
  for (const role of ['super_admin', 'admin', 'editor', 'staff', 'customer']) {
    for (const namespace of ['products', 'brochures', 'models', 'documents', 'brands', 'team', 'grup_kami', 'partners', 'distribution', 'compro', 'portfolio']) {
      const capability = ['products', 'brochures', 'models', 'documents'].includes(namespace) ? 'operations' : 'content';
      const objectPath = namespace === 'portfolio' ? `portfolio/${id}/image.png` : `${namespace}/fixture.png`;
      const modeled = permissions.hasCapability(role, 'sensitive') || (namespace !== 'portfolio' || portfolioPathPattern.test(objectPath)) && permissions.hasCapability(role, capability);
      const expected = role === 'super_admin' || role === 'admin' || role === (capability === 'operations' ? 'staff' : 'editor');
      check(modeled === expected, `Media policy declaration model ${role}/${namespace}`);
    }
  }
  for (const objectPath of ['portfolio/file.png', `portfolio/${id}/file.svg`, `portfolio/${id}/nested/file.jpg`, `portfolio/${id}/file.pdf`]) check(!portfolioPathPattern.test(objectPath), 'Portfolio media declaration rejects malformed paths');
  for (const namespace of ['products', 'brochures', 'models', 'documents', 'brands', 'team', 'grup_kami', 'partners', 'distribution', 'compro']) check(mediaBody.includes(`'${namespace}'`), `Preserve media namespace ${namespace}`);
  const route = '@/app/(site)/research-partnership/page';
  const rendered = renderToStaticMarkup(await harness({ rows: [fixture({ title: '<script>alert(1)</script>', description: '<img src=x onerror=alert(1)>', summary: 'New summary' }), fixture({ id: secondId, status: 'draft', title: 'SECRET-DRAFT' })] }).load(route).default());
  check(rendered.includes('&lt;script&gt;alert(1)&lt;/script&gt;') && rendered.includes('&lt;img src=x onerror=alert(1)&gt;'), 'Editorial text escaped by React');
  check(!rendered.includes('SECRET-DRAFT') && !rendered.includes('INTERNAL-PROVENANCE'), 'No Draft/provenance in HTML');
  check(rendered.includes('<details') && rendered.includes('Selengkapnya'), 'Inline descriptions only');
  for (const [options, message] of [[{}, 'Belum ada entri portofolio'], [{ dbError: true }, 'Informasi portofolio belum dapat dimuat']]) {
    const html = renderToStaticMarkup(await harness(options).load(route).default());
    check(html.includes(message) && !html.includes('BBSPJPPI'), 'Empty/error page does not revive hardcoded entries');
    check(html.includes('Pengembangan Produk') && html.includes('Diskusikan Kolaborasi'), 'Static capabilities/CTA survive empty/error');
  }
  const trademarks = [fixture({ entry_kind: 'trademark', title: 'TALPHA', image_url: '/images/compro/slide-10.jpg', image_alt: 'Cert' }),
    fixture({ id: secondId, entry_kind: 'trademark', title: 'ePal', image_url: '/images/compro/slide-10.jpg', image_alt: 'Cert' })];
  const trademarkHtml = renderToStaticMarkup(await harness({ rows: trademarks }).load(route).default());
  check(trademarkHtml.includes('TALPHA') && trademarkHtml.includes('ePal') && (trademarkHtml.match(/<figure/g) ?? []).length === 1, 'Shared figure dedup does not dedup trademark entries');
  const pageSource = fs.readFileSync(path.join(root, 'app/(site)/research-partnership/page.tsx'), 'utf8');
  check(pageSource.includes('force-dynamic') && !/dangerouslySetInnerHTML|source_reference|href=.*research-partnership\//.test(pageSource), 'Dynamic listing, no public provenance/HTML/detail routes');
  check(fs.readFileSync(path.join(root, 'components/ui/PortfolioImage.tsx'), 'utf8').includes('onError='), 'Image failure has graceful fallback');
  console.log(`PASS: ${checks} research portfolio checks (real schemas/actions/readers/page with mocked transport, SQL declarations/bootstrap/media regressions). Migration NOT APPLIED; no live DB/RLS/upload execution.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
