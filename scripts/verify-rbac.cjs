/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS harness for actual Server Action modules; no live services. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const actorId = '00000000-0000-4000-8000-000000000001';

function harness(role, options = {}) {
  const modules = new Map();
  const effects = [];
  const profile = options.missingProfile ? null : {
    id: actorId, email: 'rbac-test@example.com', full_name: 'Test', role,
    is_active: options.active !== false,
  };
  function query(table) {
    if (table !== 'profiles') effects.push({ read: table });
    let mutation = null;
    let isSingle = false;
    const q = {
      select: () => q, eq: () => q, in: () => q, is: () => q, not: () => q,
      order: () => q, limit: () => q, gte: () => q,
      update: (value) => { mutation = value; return q; },
      upsert: (value) => { mutation = value; return q; },
      insert: (value) => { mutation = value; return q; },
      delete: () => { mutation = {}; return q; },
      single: async () => { isSingle = true; return result(); },
      maybeSingle: async () => { isSingle = true; return result(); },
      then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
    };
    function result() {
      if (mutation) effects.push({ table, mutation });
      return { data: table === 'profiles' ? (!isSingle && options.staffRows ? options.staffRows : profile) : { id: actorId }, error: null };
    }
    return q;
  }
  const client = {
    auth: {
      getUser: async () => ({ data: { user: options.signedOut ? null : {
        id: actorId, email: 'rbac-test@example.com', user_metadata: { role: 'super_admin' },
      } } }),
      exchangeCodeForSession: async () => ({ error: null }),
      signOut: async (args) => { effects.push({ signOut: true, args }); if (options.logoutThrows) throw new Error('Logout unavailable'); return { error: options.logoutError ? { message: 'Logout unavailable' } : null }; },
    },
    from: query,
    rpc: async (name, args) => { effects.push({ rpc: name, args }); if (options.rpcThrows) throw new Error('Transport unavailable'); return options.rpcResponse ?? { data: true, error: null }; },
  };
  const collisionFilters = {};
  const collisionQuery = {
    select: () => collisionQuery,
    neq: (key, value) => { collisionFilters.exclude = { key, value }; return collisionQuery; },
    ilike: (key, value) => { collisionFilters.email = { key, value }; return collisionQuery; },
    in: (key, values) => { collisionFilters.roles = { key, values }; return collisionQuery; },
    eq: (key, value) => { collisionFilters.active = { key, value }; return collisionQuery; },
    limit: async () => {
      if (options.collisionError) return { data: null, error: { message: 'Mock query error' } };
      const candidateId = options.selfCollision ? actorId : '00000000-0000-4000-8000-000000000002';
      const match = options.collisionRole
        && collisionFilters.roles?.values.includes(options.collisionRole)
        && collisionFilters.roles.key === 'role'
        && collisionFilters.active?.key === 'is_active'
        && collisionFilters.active.value === (options.collisionActive !== false)
        && collisionFilters.exclude?.key === 'id'
        && collisionFilters.exclude.value !== candidateId
        && collisionFilters.email?.key === 'email'
        && collisionFilters.email.value === 'rbac-test@example.com';
      return { data: match ? [{ id: candidateId }] : [], error: null };
    },
  };
  const stubs = {
    react: { cache: (fn) => fn },
    'next/headers': { cookies: async () => ({}) },
    'next/cache': { revalidatePath: (url) => { effects.push({ revalidate: url }); if (options.cacheThrows) throw new Error('Cache unavailable'); } },
    'next/server': { NextResponse: { redirect: (url) => ({ status: 307, location: String(url) }) } },
    'next/navigation': {
      notFound: () => { throw new Error('NOT_FOUND'); },
      redirect: (url) => { throw new Error(`REDIRECT:${url}`); },
    },
    '@/components/admin/AdminShell': { default: () => null },
    '@/components/admin/AdminThemeProvider': { default: () => null },
    '@/components/admin/Toast': { ToastProvider: () => null },
    '@/utils/supabase/server': { createClient: () => client },
    '@/utils/supabase/admin': { createAdminClient: () => {
      if (options.oauth) return { from: (table) => { assert.equal(table, 'profiles'); return collisionQuery; } };
      throw new Error('UNEXPECTED_SERVICE_CLIENT');
    } },
    '@/lib/rate-limit': { checkRateLimit: () => ({ allowed: true }) },
    '@/lib/payments/midtransInquiry': {
      inquireMidtransPaymentStatus: async () => { effects.push({ provider: 'inquiry' }); return { success: true }; },
    },
    '@/lib/payments/midtransReconciliation': {
      reconcileMidtransPayment: async () => { effects.push({ provider: 'reconciliation' }); return { success: true }; },
    },
  };
  function load(specifier, parent = root) {
    if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
    if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return require(specifier);
    const base = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(parent), specifier);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!filename) throw new Error(`Missing module ${specifier}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loadedModule = { exports: {} };
    modules.set(filename, loadedModule);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(source, {
      module: loadedModule, exports: loadedModule.exports, require: (name) => load(name, filename),
      console, process: { env: {} }, URL, Date, Object, Set, Map, Promise,
      setTimeout, clearTimeout,
    }, { filename });
    return loadedModule.exports;
  }
  return { load, effects, collisionFilters };
}

async function main() {
  const pure = harness('customer').load('@/lib/admin-permissions');
  const expected = {
    super_admin: ['cms', 'operations', 'content', 'shipping', 'audit', 'sensitive', 'users'],
    admin: ['cms', 'operations', 'content', 'shipping', 'audit'],
    staff: ['cms', 'operations'], editor: ['cms', 'content'], customer: [], viewer: [],
  };
  let checks = 0;
  for (const [role, permissions] of Object.entries(expected)) {
    for (const capability of pure.CMS_CAPABILITIES) {
      assert.equal(pure.hasCapability(role, capability), permissions.includes(capability), `${role}/${capability}`);
      checks++;
    }
    assert.equal(pure.hasCapability(role, 'unknown'), false);
    assert.equal(pure.canAccessSection(role, '__proto__'), false);
    const test = harness(role);
    const guards = test.load('@/lib/admin');
    const nav = test.load('@/lib/admin-sections');
    assert.equal(Boolean(await guards.getAdminUser()), permissions.includes('cms'));
    for (const group of permissions.includes('cms') ? nav.getAdminNavGroups(role) : []) {
      for (const section of group.items) assert.ok(pure.canAccessSection(role, section.key));
    }
    if (!permissions.includes('operations')) await assert.rejects(() => guards.requireSectionAccess('orders'), /NOT_FOUND/);
    if (!permissions.includes('users')) await assert.rejects(() => guards.requireSectionAccess('akses-staff'), /NOT_FOUND/);
    const dashboardLayout = test.load('@/app/admin/(dashboard)/layout');
    if (!permissions.includes('cms')) {
      await assert.rejects(() => dashboardLayout.default({ children: null }), /REDIRECT:\/admin\/login/);
    } else assert.ok(await dashboardLayout.default({ children: null }));

    // Invoke real exported server actions, using mock auth/storage only. The
    // forged auth metadata role must never override the authoritative profile.
    const actions = [
      ['@/lib/actions/settings', 'saveBankAccount', [{ bankName: 'Test', accountNumber: '123', accountHolder: 'Test' }], 'sensitive'],
      ['@/lib/actions/settings', 'saveStoreSettings', [{ currency: 'IDR', enableShipping: false, couriers: [] }], 'sensitive'],
      ['@/lib/actions/settings', 'saveHeroSlides', [{ slides: [] }], 'content'],
      ['@/lib/actions/brands', 'upsertBrand', [{ name: 'Test', slug: 'test', segment: 'Lab', segmentColor: 'teal', tagline: 'Test', description: 'Test', accentColor: '#0EA5A0', logoLight: '', logoDark: '', isActive: true, sortOrder: 0 }], 'content'],
      ['@/lib/actions/settings', 'markMessageRead', [actorId, true], 'operations'],
      ['@/lib/actions/store', 'updateStock', ['test-product', { stock: 3 }], 'operations'],
      ['@/lib/actions/store', 'updateOrderStatus', [actorId, { status: 'processing' }], 'operations'],
      ['@/lib/actions/store', 'recordManualOrderRefund', [actorId, { note: 'Test only' }], 'sensitive'],
      ['@/lib/actions/rfq', 'updateRfqStatusAction', [actorId, 'processing'], 'operations'],
      ['@/lib/actions/shipping', 'saveZone', [{ name: 'Test', sortOrder: 0, isActive: true }], 'shipping'],
      ['@/lib/actions/paymentInquiry', 'checkMidtransPaymentStatus', [actorId], 'sensitive'],
    ];
    for (const [file, action, args, capability] of actions) {
      const isolated = harness(role);
      const result = await isolated.load(file)[action](...args);
      const allowed = permissions.includes(capability);
      assert.equal(result.success, allowed, `${role}/${action}: ${JSON.stringify(result)}`);
      if (!allowed) {
        assert.equal(result.message, 'Anda tidak memiliki akses.');
        assert.equal(isolated.effects.length, 0, `${role}/${action} reached a write/provider call`);
      } else assert.ok(isolated.effects.length > 0, `${role}/${action} did not reach the operation`);
      checks++;
    }
    for (const [file, action, args, capability] of [
      ['@/lib/actions/products', 'upsertProduct', [{}], 'operations'],
      ['@/lib/actions/brands', 'upsertBrand', [{}], 'content'],
      ['@/lib/actions/technicalDocuments', 'upsertTechnicalDocument', [{}], 'operations'],
    ]) {
      if (permissions.includes(capability)) continue;
      const isolated = harness(role);
      const result = await isolated.load(file)[action](...args);
      assert.equal(result.message, 'Anda tidak memiliki akses.');
      assert.equal(isolated.effects.length, 0);
      checks++;
    }
    const guardedModules = {
      settings: 'sensitive', store: 'operations', products: 'operations',
      brands: 'content', careers: 'content', compro: 'content', recruitment: 'content',
      relasi: 'content', rfq: 'operations', technicalDocuments: 'operations',
      shipping: 'shipping', paymentInquiry: 'sensitive', staff: 'users',
    };
    for (const [file, defaultCapability] of Object.entries(guardedModules)) {
      const exports = harness(role).load(`@/lib/actions/${file}`);
      for (const [action, fn] of Object.entries(exports)) {
        if (typeof fn !== 'function' || action === 'submitDocLeadAndGetUrl') continue;
        const capability = file === 'settings'
          ? ({ markMessageRead: 'operations', saveHeroSlides: 'content' }[action] || defaultCapability)
          : ['deleteProduct', 'restoreProduct', 'deleteOrder', 'restoreOrder', 'deleteBrand'].includes(action)
            ? 'shipping'
            : action === 'recordManualOrderRefund' ? 'sensitive' : defaultCapability;
        if (permissions.includes(capability)) continue;
        const isolated = harness(role);
        const result = await isolated.load(`@/lib/actions/${file}`)[action]();
        if (action === 'listTechnicalDocuments') assert.equal(result.length, 0);
        else assert.equal(result.message, 'Anda tidak memiliki akses.', `${role}/${file}/${action}`);
        assert.equal(isolated.effects.length, 0, `Forbidden side effect in ${role}/${file}/${action}`);
        checks++;
      }
    }
    for (const [reader, args, capability] of [
      ['listProductsByType', ['sparepart'], 'operations'],
      ['getOrder', [actorId], 'operations'],
      ['listOrders', [], 'operations'],
      ['listContactMessages', [], 'operations'],
      ['listRfq', [], 'operations'],
      ['getDashboardStats', [], 'operations'],
      ['getStoreSettings', [], 'sensitive'],
      ['getShippingAdminData', [], 'shipping'],
      ['listAudit', [], 'audit'],
      ['listStaff', [], 'users'],
      ['listTeamMembers', [], 'content'],
    ]) {
      if (permissions.includes(capability)) continue;
      const isolated = harness(role);
      await assert.rejects(() => isolated.load('@/lib/admin-data')[reader](...args), /NOT_FOUND/);
      assert.equal(isolated.effects.length, 0, `Forbidden reader reached data: ${role}/${reader}`);
      checks++;
    }
  }
  // Deliberately return mixed rows without applying the mock .in() filter:
  // verify listStaff's defensive runtime filtering, not just SQL construction.
  const staffRoles = ['super_admin', 'admin', 'staff', 'editor'];
  const mixedRows = [...staffRoles, 'customer', 'viewer', 'unknown'].map((role, index) => ({
    id: `staff-fixture-${index}`, email: `${role}@example.com`, full_name: role,
    role, is_active: role !== 'staff', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00.123456+00:00',
  }));
  const staffListHarness = harness('super_admin', { staffRows: mixedRows });
  const staffList = await staffListHarness.load('@/lib/admin-data').listStaff();
  assert.deepEqual(Array.from(staffList, (row) => row.role), staffRoles);
  for (const role of [...staffRoles, 'customer', 'viewer', 'unknown']) {
    assert.equal(staffList.some((row) => row.role === role), staffRoles.includes(role), `listStaff role filter: ${role}`);
    checks++;
  }
  assert.equal(staffList.find((row) => row.role === 'staff').is_active, false, 'Inactive staff remains visible in the privileged directory');
  assert.equal(staffList[0].updated_at, '2026-01-01T00:00:00.123456+00:00', 'Directory version must retain original microseconds');
  // Real staff actions; only the transport is stubbed. SQL invariants are
  // verified separately by the isolated PostgreSQL integration harness.
  const targetId = '00000000-0000-4000-8000-000000000002';
  const version = '2026-10-04T12:00:00.123456+00:00';
  const input = { targetId, role: 'staff', isActive: true, expectedUpdatedAt: version, reason: 'Test' };
  const committed = (id = targetId, role = 'staff', is_active = true, changed = true) => ({
    data: { id, role, is_active, changed, updated_at: version }, error: null,
  });
  for (const options of [{ active: false }, { missingProfile: true }, { signedOut: true }]) {
    for (const action of ['manageStaffAccess', 'provisionStaffAccess', 'lookupStaffCandidate']) {
      const isolated = harness('super_admin', options);
      assert.equal((await isolated.load('@/lib/actions/staff')[action](input)).success, false);
      assert.equal(isolated.effects.length, 0);
      checks++;
    }
  }
  for (const patch of [{ role: 'customer' }, { role: 'viewer' }, { role: 'unknown' }, { isActive: null }, { expectedUpdatedAt: 'bad' }, { targetId: 'bad' }, { actorId }, { reason: 'x'.repeat(501) }]) {
    const isolated = harness('super_admin');
    assert.equal((await isolated.load('@/lib/actions/staff').manageStaffAccess({ ...input, ...patch })).success, false);
    assert.equal(isolated.effects.length, 0);
    checks++;
  }
  const managed = harness('super_admin', { rpcResponse: committed() });
  assert.equal((await managed.load('@/lib/actions/staff').manageStaffAccess(input)).success, true);
  assert.equal(managed.effects[0].args.p_expected_updated_at, version, 'Microsecond version passed verbatim');
  assert.equal(managed.effects.filter((effect) => effect.rpc).length, 1);
  assert.equal(managed.effects.some((effect) => effect.table === 'audit_log' || effect.table === 'profiles'), false);
  assert.deepEqual(managed.effects.filter((effect) => effect.revalidate).map((effect) => effect.revalidate), ['/admin/akses-staff', '/admin/riwayat']);
  checks++;
  const provisioned = harness('super_admin', { rpcResponse: committed() });
  assert.equal((await provisioned.load('@/lib/actions/staff').provisionStaffAccess({ targetId, role: 'staff', reason: '' })).success, true);
  assert.equal(provisioned.effects[0].rpc, 'provision_staff_access');
  assert.equal(provisioned.effects[0].args.p_target_user_id, targetId);
  checks++;
  const noop = harness('super_admin', { rpcResponse: committed(targetId, 'staff', true, false) });
  assert.match((await noop.load('@/lib/actions/staff').manageStaffAccess(input)).message, /sudah sesuai/);
  checks++;
  for (const code of ['P0061', 'P0062', 'P0063', 'P0064', 'P0065', '42501', '22023', 'XX000']) {
    const isolated = harness('super_admin', { rpcResponse: { data: null, error: { code } } });
    assert.equal((await isolated.load('@/lib/actions/staff').manageStaffAccess(input)).success, false);
    assert.equal(isolated.effects.length, 1);
    checks++;
  }
  for (const options of [{ rpcThrows: true }, { rpcResponse: { data: true, error: null } }]) {
    const isolated = harness('super_admin', options);
    assert.match((await isolated.load('@/lib/actions/staff').manageStaffAccess(input)).message, /belum dapat dipastikan/);
    checks++;
  }
  for (const role of ['admin','staff','editor']) {
    const demoted = harness('super_admin', { rpcResponse: committed(actorId, role) });
    await assert.rejects(() => demoted.load('@/lib/actions/staff').manageStaffAccess({ ...input, targetId: actorId, role }), /^Error: REDIRECT:\/admin$/);
    assert.equal(demoted.effects.some((effect) => effect.signOut || effect.revalidate), false);
    assert.equal(demoted.effects.filter((effect) => effect.rpc).length,1);
    checks++;
  }
  for (const options of [{}, { logoutError: true }, { logoutThrows: true }]) {
    const isolated = harness('super_admin', { ...options, rpcResponse: committed(actorId, 'super_admin', false) });
    await assert.rejects(() => isolated.load('@/lib/actions/staff').manageStaffAccess({ ...input, targetId: actorId, role: 'super_admin', isActive: false }), /REDIRECT:\/admin\/login/);
    assert.equal(isolated.effects.find((effect) => effect.signOut).args.scope, 'local');
    assert.equal(isolated.effects.some((effect) => effect.revalidate),false);
    assert.equal(isolated.effects[0].rpc,'manage_staff_access','Commit result precedes local logout');
    checks++;
  }
  const cacheFailure = harness('super_admin', { cacheThrows: true, rpcResponse: committed() });
  assert.equal((await cacheFailure.load('@/lib/actions/staff').manageStaffAccess(input)).success, true);
  checks++;
  const candidate = { id: targetId, email: 'customer@example.com', full_name: 'Customer', role: 'customer', is_active: true, updated_at: version };
  for (const rows of [[], [candidate], [candidate, candidate]]) {
    const isolated = harness('super_admin', { rpcResponse: { data: rows, error: null } });
    const result = await isolated.load('@/lib/actions/staff').lookupStaffCandidate({ email: ' Customer@Example.com ' });
    assert.equal(result.success, rows.length === 1);
    assert.equal(isolated.effects[0].args.p_email, 'Customer@Example.com');
    checks++;
  }
  for (const options of [{ active: false }, { missingProfile: true }, { signedOut: true }]) {
    const isolated = harness('super_admin', options);
    assert.equal(await isolated.load('@/lib/admin').getAdminUser(), null);
    const result = await isolated.load('@/lib/actions/settings').saveBankAccount({});
    assert.equal(result.success, false);
    assert.equal(isolated.effects.length, 0);
    checks++;
  }
  // Execute the OAuth GET route, including its real query construction. The
  // mock honors role, activity, email and self-ID filters; it cannot fabricate
  // a passing test when a CMS role is missing from the collision allowlist.
  const request = {
    url: 'https://example.com/auth/callback?code=mock-code&next=/store',
    nextUrl: { origin: 'https://example.com' }, headers: new Headers(),
  };
  for (const collisionRole of ['super_admin', 'admin', 'staff', 'editor']) {
    const isolated = harness('customer', { oauth: true, collisionRole });
    const response = await isolated.load('@/app/(site)/auth/callback/route').GET(request);
    assert.equal(response.location, 'https://example.com/auth/login?error=oauth_not_customer', collisionRole);
    assert.equal(isolated.effects.filter((event) => event.signOut).length, 1);
    assert.deepEqual(Array.from(isolated.collisionFilters.roles.values).sort(), ['admin', 'editor', 'staff', 'super_admin']);
    checks++;
  }
  for (const options of [{}, { collisionRole: 'customer' }, { collisionRole: 'unknown' }, { collisionRole: 'staff', collisionActive: false }, { collisionRole: 'super_admin', selfCollision: true }]) {
    const isolated = harness('customer', { oauth: true, ...options });
    const response = await isolated.load('@/app/(site)/auth/callback/route').GET(request);
    assert.equal(response.location, 'https://example.com/store');
    assert.equal(isolated.effects.length, 0);
    checks++;
  }
  for (const role of ['super_admin', 'admin', 'staff', 'editor', 'viewer', 'unknown']) {
    const isolated = harness(role, { oauth: true });
    const response = await isolated.load('@/app/(site)/auth/callback/route').GET(request);
    assert.equal(response.location, 'https://example.com/auth/login?error=oauth_not_customer');
    assert.equal(isolated.collisionFilters.roles, undefined);
    assert.equal(isolated.effects.filter((event) => event.signOut).length, 1);
    checks++;
  }
  const oauthFailure = harness('customer', { oauth: true, collisionError: true });
  const failedCallback = await oauthFailure.load('@/app/(site)/auth/callback/route').GET(request);
  assert.equal(failedCallback.location, 'https://example.com/auth/login?error=oauth_failed');
  assert.equal(oauthFailure.effects.filter((event) => event.signOut).length, 1);
  checks++;
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/0061_rbac_roles.sql'), 'utf8');
  // Verify newsletter ACL + RLS composition against the actual migration
  // declaration. This is a policy model, NOT execution of migration/live SQL.
  assert.match(migration, /DROP POLICY IF EXISTS subscribers_staff_all ON public\.newsletter_subscribers/);
  assert.match(migration, /DROP POLICY IF EXISTS subscribers_staff_select ON public\.newsletter_subscribers/);
  const newsletterPolicy = migration.match(/CREATE POLICY subscribers_operational_all ON public\.newsletter_subscribers\s+FOR ALL TO authenticated\s+USING \(public\.has_cms_capability\('([^']+)'\)\)\s+WITH CHECK \(public\.has_cms_capability\('([^']+)'\)\);/);
  assert.ok(newsletterPolicy, 'Newsletter management must be authenticated and guarded on old/new rows');
  assert.equal(newsletterPolicy[1], 'operations');
  assert.equal(newsletterPolicy[2], 'operations');
  assert.doesNotMatch(migration, /(?:DROP|ALTER) POLICY(?: IF EXISTS)? subscribers_public_insert/);
  assert.doesNotMatch(migration, /CREATE POLICY subscribers_staff_(?:all|select)/);
  assert.match(migration, /REVOKE ALL ON public\.newsletter_subscribers FROM PUBLIC, anon, authenticated/);
  const anonGrant = migration.match(/GRANT ([A-Z, ]+) ON public\.newsletter_subscribers TO anon;/);
  const authenticatedGrant = migration.match(/GRANT ([A-Z, ]+) ON public\.newsletter_subscribers TO authenticated;/);
  assert.ok(anonGrant && authenticatedGrant);
  const privileges = {
    anon: anonGrant[1].split(',').map((value) => value.trim()),
    authenticated: authenticatedGrant[1].split(',').map((value) => value.trim()),
  };
  assert.deepEqual(privileges.anon, ['INSERT']);
  for (const role of ['super_admin', 'admin', 'staff', 'editor', 'customer', 'viewer', 'unknown']) {
    for (const command of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      const operational = pure.hasCapability(role, newsletterPolicy[1]);
      // Existing PUBLIC INSERT policy remains applicable to authenticated
      // customer/editor too: subscription is not subscriber administration.
      const allowed = privileges.authenticated.includes(command) && (command === 'INSERT' || operational);
      assert.equal(allowed, command === 'INSERT' || ['super_admin', 'admin', 'staff'].includes(role), `Newsletter ${role}/${command}`);
      checks++;
    }
  }
  for (const command of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    assert.equal(privileges.anon.includes(command) && command === 'INSERT', command === 'INSERT', `Public newsletter ${command}`);
    checks++;
  }
  const knownNewsletterPolicies = [
    { name: 'subscribers_staff_all', condition: 'is_staff()' },
    { name: 'subscribers_staff_select', condition: 'is_staff()' },
    { name: 'subscribers_public_insert', condition: 'true' },
  ];
  const remainingNewsletterPolicies = knownNewsletterPolicies.filter((policy) =>
    !migration.includes(`DROP POLICY IF EXISTS ${policy.name} ON public.newsletter_subscribers`),
  );
  remainingNewsletterPolicies.push({ name: 'subscribers_operational_all', condition: `public.has_cms_capability('${newsletterPolicy[1]}')` });
  assert.equal(remainingNewsletterPolicies.some((policy) => /(public[.])?is_staff[(][)]/.test(policy.condition)), false, 'Newsletter must not trigger the final legacy-is_staff guard');
  assert.match(migration, /CHECK \(role IN \('super_admin', 'admin', 'staff', 'editor', 'customer'\)\)/);
  assert.match(migration, /WHERE role = 'viewer'/);
  assert.match(migration, /DROP POLICY IF EXISTS profiles_admin_all/);
  assert.doesNotMatch(migration, /UPDATE public\.profiles SET role|admin@autentik/);
  for (const capability of pure.CMS_CAPABILITIES) {
    const clause = migration.match(new RegExp(`WHEN '${capability}' THEN p[.]role (?:IN \\(([^)]+)\\)|= '([^']+)')`));
    assert.ok(clause, `SQL capability missing: ${capability}`);
    const roles = clause[1] ? [...clause[1].matchAll(/'([^']+)'/g)].map((match) => match[1]) : [clause[2]];
    for (const role of Object.keys(expected)) assert.equal(roles.includes(role), expected[role].includes(capability), `SQL/TypeScript capability mismatch: ${role}/${capability}`);
  }
  console.log(`PASS: ${checks} permission/action checks; all five roles, legacy viewer, inactive/missing/signed-out users. No network or database mutations.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
