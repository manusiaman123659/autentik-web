/* eslint-disable @typescript-eslint/no-require-imports -- Actual Careers/i18n modules; Next and upstream transport are offline fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NextIntlClientProvider } = require('next-intl');
const { createTranslator } = require('use-intl/core');
const { parse } = require('next/dist/compiled/node-html-parser');
const root = path.resolve(__dirname, '..');
const folder = 'app/(public)/[locale]/(site)/careers/';
const expected = {
  id: { title: 'Lowongan Kerja & Karir | PT Autentik Karya Analitika', heading: 'Wujudkan Potensi Terbaik Anda Bersama Kami', search: 'Cari lowongan pekerjaan', placeholder: 'Cari posisi pekerjaan, skill (Next.js, IoT, Sales), atau kata kunci...', empty: 'Belum ada lowongan', unavailable: 'Lowongan sementara tidak tersedia', cta: 'Kirim Lamaran Terbuka', detail: 'Detail & Lamar', next: 'Selanjutnya' },
  en: { title: 'Careers & Job Opportunities | PT Autentik Karya Analitika', heading: 'Build Your Future With Us', search: 'Search job openings', placeholder: 'Search job titles, skills (Next.js, IoT, Sales), or keywords...', empty: 'No open positions yet', unavailable: 'Job openings temporarily unavailable', cta: 'Send an Open Application', detail: 'Details & Apply', next: 'Next' },
  'zh-CN': { title: '招聘与职业机会 | PT Autentik Karya Analitika', heading: '与我们共创职业未来', search: '搜索招聘职位', placeholder: '搜索职位、技能（Next.js、IoT、销售）或关键词...', empty: '暂无招聘职位', unavailable: '招聘信息暂时不可用', cta: '提交开放申请', detail: '详情与申请', next: '下一页' },
};
const job = { id: 42, title: 'MIKA ORIGINAL JOB TITLE', description: 'Deskripsi lowongan asli dari MIKA.', employment_type: 'Contract', location: 'Semarang',
  company: { id: 2, name: 'PT Autentik Karya Analitika', city: 'Semarang', logo: null }, department: { id: 4, name: 'DEPARTEMEN ASLI' },
  salary: { min: 6000000, max: 10000000, currency: 'IDR', formatted: 'Rp 6.000.000 - Rp 10.000.000' }, quota: 2, deadline: '2026-12-31',
  deadline_info: { is_active: true, is_expired: false, days_remaining: 20, badge: { status: 'open', label: 'MIKA ORIGINAL BADGE', color: 'emerald' } },
  apply_url: 'https://recruitment.tekna.id/lowongan/42' };
const meta = { current_page: 1, per_page: 10, total_items: 11, total_pages: 2, has_next: true, has_prev: false };
let checks = 0, failures = 0, cases = 0;
const eq = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };
async function test(name, run) { cases++; try { await run(); console.log('PASS', name); } catch (e) { failures++; console.error('FAIL', name, '\n' + e.stack); } }
function harness(locale) {
  const cache = new Map(), calls = []; let catalogs;
  const locales = require('../i18n/locales.ts');
  const mocks = new Map([
    ['server-only', {}],
    ['@/lib/public-url', { getCanonicalOrigin: () => 'https://fixture.invalid' }],
    ['@/lib/public-data', { getPublicCareerListings: async input => { calls.push(input); return { response: { success: true, data: [job], meta, message: 'UPSTREAM STATUS MUST NOT BECOME UI COPY' } }; }, getRecruitmentUrl: async () => 'https://recruitment.tekna.id/' }],
    ['@/lib/api/mika-career', { getDepartmentsFromJobs: rows => rows.map(row => row.department) }],
    ['next-intl/server', { getLocale: async () => locale, getTranslations: async input => createTranslator({ locale, messages: catalogs, namespace: typeof input === 'string' ? input : input.namespace }) }],
    ['@/i18n/navigation', { __esModule: true, default: ({ href, children, ...props }) => React.createElement('a', { ...props, href: locales.localizeHref(href, locale) }, children) }],
    ['@/components/ui/ScrollAnimations', { __esModule: true, default: ({ children, className, style }) => React.createElement('div', { className, style }, children) }],
    ['next/image', { __esModule: true, default: ({ src, alt }) => React.createElement('img', { src, alt }) }],
  ]);
  function load(file) {
    const filename = path.resolve(root, file); if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, mod);
    const native = mod.require.bind(mod);
    mod.require = name => {
      if (mocks.has(name)) return mocks.get(name);
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
        if (base.endsWith('.json')) return JSON.parse(fs.readFileSync(base, 'utf8'));
        return load(base + (fs.existsSync(base + '.ts') ? '.ts' : '.tsx'));
      }
      return native(name);
    };
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
    return mod.exports;
  }
  return { load, calls, async messages() { catalogs = await load('i18n/messages.ts').loadMessages(locale); return catalogs; } };
}
async function main() {
  for (const locale of ['id', 'en', 'zh-CN']) {
    await test(locale + ' metadata uses locale and canonical SEO without reading jobs', async () => {
      const h = harness(locale); await h.messages(); const page = h.load(folder + 'page.tsx');
      const metadata = page.generateMetadata ? await page.generateMetadata() : page.metadata;
      eq(metadata.title, expected[locale].title, 'Localized title');
      const description = { id: 'Temukan lowongan kerja PT Autentik Karya Analitika melalui portal rekrutmen resmi.', en: 'Explore job opportunities at PT Autentik Karya Analitika through the official recruitment portal.', 'zh-CN': '通过官方招聘门户了解 PT Autentik Karya Analitika 的职位机会。' }[locale];
      eq(metadata.description, description, 'Localized description');
      eq(metadata.alternates?.canonical, locale === 'id' ? '/careers' : (locale === 'en' ? '/en/careers' : '/zh-cn/careers'), 'Canonical locale');
      eq(metadata.alternates?.languages?.['x-default'], '/careers', 'ID x-default'); eq(h.calls, [], 'Metadata does not fetch MIKA');
    });
    await test(locale + ' heading, filters, cards, status and pagination; MIKA values remain unchanged', async () => {
      const h = harness(locale), messages = await h.messages(); const Component = h.load(folder + 'CareersClient.tsx').default;
      const before = JSON.stringify(job);
      const html = renderToStaticMarkup(React.createElement(NextIntlClientProvider, { locale, timeZone: 'Asia/Jakarta', messages }, React.createElement(Component, { initialJobs: [job], initialMeta: meta, departments: [job.department], available: true, recruitmentUrl: 'https://recruitment.tekna.id/', apiMessage: 'UPSTREAM STATUS MUST NOT BECOME UI COPY' })));
      const dom = parse(html);
      eq(dom.querySelector('h1').text, expected[locale].heading, 'Localized H1');
      eq(dom.querySelector('input').getAttribute('placeholder'), expected[locale].placeholder, 'Localized placeholder');
      eq(dom.querySelector('input').getAttribute('aria-label'), expected[locale].search, 'Localized accessible name');
      eq(html.includes('UPSTREAM STATUS MUST NOT BECOME UI COPY'), false, 'Status pill uses owned UI copy, not untranslated API prose');
      eq(dom.text.includes(expected[locale].detail), true, 'Localized card CTA'); eq(dom.text.includes(expected[locale].next), true, 'Localized next page'); eq(dom.text.includes(expected[locale].cta), true, 'Localized recruitment CTA');
      for (const value of [job.title, job.description, job.company.name, job.department.name, job.salary.formatted, job.location]) eq(dom.text.includes(value), true, 'Original MIKA content ' + value);
      eq(dom.querySelector('a[href^="https://recruitment.tekna.id"]').getAttribute('href'), 'https://recruitment.tekna.id/', 'Official recruitment URL preserved');
      eq(dom.querySelector('a[href$="/careers/42"]').getAttribute('href'), (locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '') + '/careers/42', 'Localized detail link retains numeric ID');
      eq(dom.querySelectorAll('select')[1].querySelectorAll('option').map(o => o.getAttribute('value')), ['all', 'Full-time', 'Internship', 'Part-time', 'Contract'], 'Filter API discriminator values unchanged');
      eq(JSON.stringify(job), before, 'No DTO mutation');
    });
    for (const available of [true, false]) await test(locale + ' distinct empty/unavailable and contact fallback ' + available, async () => {
      const h = harness(locale), messages = await h.messages(); const Component = h.load(folder + 'CareersClient.tsx').default;
      const html = renderToStaticMarkup(React.createElement(NextIntlClientProvider, { locale, timeZone: 'Asia/Jakarta', messages }, React.createElement(Component, { initialJobs: [], initialMeta: { ...meta, total_items: 0, total_pages: 1 }, departments: [], available, recruitmentUrl: null })));
      const dom = parse(html);
      eq(dom.text.includes(expected[locale][available ? 'empty' : 'unavailable']), true, 'Correct localized state');
      eq(dom.text.includes(expected[locale][available ? 'unavailable' : 'empty']), false, 'Empty is not an outage');
      eq(dom.querySelector('a[href$="/contact"]').getAttribute('href'), (locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '') + '/contact', 'Contact fallback stays locale-aware');
      eq(dom.querySelectorAll('a[href*="/careers/"]').length, 0, 'No stale job cards');
    });
  }
  await test('Catalog parity and scoped Careers provider', async () => {
    const h = harness('en'); const messages = await h.messages();
    eq(messages.careers !== undefined, true, 'Careers namespace is loaded');
    const leaves = (value, prefix = '') => Object.fromEntries(Object.entries(value).flatMap(([key, child]) => typeof child === 'string' ? [[prefix + key, child]] : Object.entries(leaves(child, prefix + key + '.'))));
    for (const locale of ['en', 'zh-CN']) {
      const base = leaves(require('../messages/id/careers.json')); const translated = leaves(require('../messages/' + locale + '/careers.json'));
      eq(Object.keys(translated).sort(), Object.keys(base).sort(), 'All locale keys match');
      for (const value of Object.values(translated)) eq(value.trim().length > 0, true, 'No empty translations');
    }
    const layout = await h.load(folder + 'layout.tsx').default({ children: React.createElement('div', null, 'child') });
    eq(Object.keys(layout.props.messages).sort(), ['careers', 'common', 'navigation'], 'Scoped provider');
    eq(layout.props.messages.careers.ui, messages.careers.ui, 'Client UI catalog'); eq(layout.props.messages.careers.metadata, undefined, 'Metadata stays server-side');
    const page = await h.load(folder + 'page.tsx').default(); eq(h.calls, [{ page: 1, per_page: 10 }], 'Existing reader input unchanged');
    eq(page.props.initialJobs[0], job, 'Page does not replace upstream values'); eq(page.props.recruitmentUrl, 'https://recruitment.tekna.id/', 'Page retains trusted resolver');
  });
  console.log(`${failures ? 'RED' : 'GREEN'}: ${cases - failures}/${cases} scenarios, ${checks} assertions; ${failures} failures; no network/database.`);
  if (failures) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
