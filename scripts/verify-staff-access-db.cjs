/* eslint-disable @typescript-eslint/no-require-imports -- Local-only PostgreSQL integration harness. */
// Starts a disposable, network-disabled container from an EXISTING local image.
// No published ports, mounts, application env, Supabase URL, or production data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, execFile } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const image = 'public.ecr.aws/supabase/postgres:17.6.1.155';
const container = `aka-staff-access-test-${process.pid}`;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const quote = (value) => value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const args = ['exec', '-i', '-e', 'PGPASSWORD=isolated-fixture-only', container, 'psql', '-h', '127.0.0.1', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-U', 'postgres', '-d', 'staff_access_test'];
let checks = 0;
const sql = (text) => execFileSync('docker', args, { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const tx = (actor, text) => `BEGIN; SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub" = ${quote(actor ?? '')}; ${text}; COMMIT;`;
const call = (actor, text) => JSON.parse(sql(tx(actor, `SELECT ${text}`)));
const manage = (target, role, active, version, reason = null) => `public.manage_staff_access(${quote(target)}::uuid,${quote(role)},${active === null ? 'NULL' : active},${quote(version)}::timestamptz,${quote(reason)})`;
const provision = (target, role) => `public.provision_staff_access(${quote(target)}::uuid,${quote(role)},'fixture only')`;
const row = (n) => JSON.parse(sql(`SELECT row_to_json(p) FROM public.profiles p WHERE id=${quote(id(n))}`));
const auditCount = () => Number(sql('SELECT count(*) FROM public.audit_log'));
function rejects(actor, expression, code) {
  assert.throws(() => call(actor, expression), (error) => String(error.stderr).includes(code));
  checks++;
}
function reset() {
  sql(`TRUNCATE public.profiles, public.audit_log, auth.users;
    INSERT INTO auth.users(id,email) SELECT ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'fixture'||n||'@example.com' FROM generate_series(1,10) n;
    INSERT INTO public.profiles(id,email,full_name,role,is_active,updated_at)
    SELECT u.id,u.email,'Fixture', CASE n WHEN 1 THEN 'super_admin' WHEN 2 THEN 'super_admin' WHEN 3 THEN 'staff' WHEN 4 THEN 'customer' WHEN 5 THEN 'admin' WHEN 6 THEN 'editor' WHEN 7 THEN 'viewer' WHEN 8 THEN 'unknown' WHEN 9 THEN 'customer' ELSE 'super_admin' END,
    n NOT IN (9,10),'2026-01-01T00:00:00.123456Z' FROM auth.users u JOIN generate_series(1,10) n ON u.email='fixture'||n||'@example.com';`);
}
function asyncTx(actor, expression) {
  return asyncSql(tx(actor, expression));
}
function asyncSql(text) {
  return new Promise((resolve) => {
    const child = execFile('docker', args, { encoding: 'utf8', timeout: 15000 }, (error, out, err) => resolve({ ok: !error, out, err }));
    child.stdin.end(text);
  });
}
async function race(firstTarget, secondTarget, firstRole, secondRole, firstActive, secondActive) {
  reset();
  const version = row(1).updated_at;
  const first = asyncTx(id(1), `SELECT pg_advisory_xact_lock(hashtextextended('aka-staff-access-v1',0)); SELECT ${manage(id(firstTarget), firstRole, firstActive, version)}; SELECT pg_sleep(2)`);
  // Observe the lock holder before starting the competing transaction.
  let observedHolder = false;
  for (let i = 0; i < 50; i++) {
    if (Number(sql("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted")) > 0) { observedHolder = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(observedHolder, 'First transaction must hold the shared advisory lock');
  const second = asyncTx(id(2), `SELECT ${manage(id(secondTarget), secondRole, secondActive, version)}`);
  let observedWaiter = false;
  for (let i = 0; i < 30; i++) {
    if (Number(sql("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND NOT granted")) > 0) { observedWaiter = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const results = await Promise.all([first, second]);
  assert.ok(observedWaiter, 'Competing transaction must actually wait, rather than execute sequentially');
  assert.equal(results.filter((result) => result.ok).length, 1, JSON.stringify(results));
  assert.equal(Number(sql("SELECT count(*) FROM public.profiles WHERE role='super_admin' AND is_active")), 1);
  assert.equal(auditCount(), 1);
  checks++;
}
async function main() {
  execFileSync('docker', ['image', 'inspect', image], { stdio: 'ignore' });
  execFileSync('docker', ['run', '--pull=never', '--rm', '-d', '--name', container, '--network', 'none', '-e', 'POSTGRES_PASSWORD=isolated-fixture-only', image], { stdio: 'pipe' });
  try {
    let ready = false;
    for (let i = 0; i < 90; i++) {
      try {
        // TCP is enabled only by the final server, not entrypoint's temporary
        // initialization server, which subsequently shuts down.
        execFileSync('docker', ['exec', '-e', 'PGPASSWORD=isolated-fixture-only', container, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'postgres', '-c', 'SELECT 1'], { stdio: 'ignore' });
        ready = true; break;
      } catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
    }
    assert.ok(ready, 'Isolated PostgreSQL did not become ready');
    execFileSync('docker', ['exec', '-e', 'PGPASSWORD=isolated-fixture-only', container, 'createdb', '-h', '127.0.0.1', '-U', 'postgres', 'staff_access_test']);
    sql(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      ALTER TABLE auth.users ADD COLUMN banned_until timestamptz, ADD COLUMN deleted_at timestamptz;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,email text,full_name text,role text NOT NULL,is_active boolean NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,user_email text,action text NOT NULL,entity_type text NOT NULL,entity_id text,details jsonb,created_at timestamptz NOT NULL DEFAULT now());
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      GRANT SELECT ON public.profiles TO authenticated;
      REVOKE INSERT,UPDATE,DELETE ON public.profiles FROM PUBLIC,anon,authenticated;
      CREATE POLICY profiles_self_select ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());`);
    // Use the real Phase 1 authorization helpers, not a rewritten permission model.
    const phase1 = fs.readFileSync(path.join(root, 'supabase/migrations/0061_rbac_roles.sql'), 'utf8');
    for (const name of ['has_cms_capability', 'is_super_admin']) {
      const definition = phase1.match(new RegExp(`CREATE OR REPLACE FUNCTION public[.]${name}\\([^]*?\\$\\$;`));
      assert.ok(definition, `Missing actual authorization helper ${name}`);
      sql(definition[0]);
    }
    // Reproduce actual production audit grants/RLS, including the old policy
    // that allowed reserved-event spoofing, before applying the correction.
    sql(`ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON public.audit_log TO anon,authenticated,service_role;
      CREATE POLICY audit_staff_insert ON public.audit_log FOR INSERT WITH CHECK (
        public.has_cms_capability('cms') AND user_id=auth.uid()
        AND COALESCE(user_email,'')=COALESCE((SELECT p.email FROM public.profiles p WHERE p.id=auth.uid()),auth.jwt()->>'email','')
      );`);
    reset();
    const directAudit = (actor, action, userId = id(actor), email = `fixture${actor}@example.com`) => sql(tx(id(actor),
      `INSERT INTO public.audit_log(user_id,user_email,action,entity_type,entity_id,details) VALUES(${quote(userId)},${quote(email)},${quote(action)},'profile',${quote(id(4))},'{"fixture":true}')`));
    directAudit(3,'staff_access_updated');
    assert.equal(auditCount(),1,'Fixture must reproduce the production vulnerability before 0062'); checks++;
    sql(fs.readFileSync(path.join(root, 'supabase/migrations/0062_staff_access_management.sql'), 'utf8'));
    reset();
    for (const actor of [1,3,5,6]) { // Super Admin, Staff, Admin, Editor.
      directAudit(actor,'product.updated');
      for (const action of ['staff_access_updated','staff_access_provisioned']) {
        assert.throws(() => directAudit(actor,action),(error) => String(error.stderr).includes('42501')); checks++;
      }
      assert.throws(() => directAudit(actor,'product.updated',id(2)),(error) => String(error.stderr).includes('42501'));
      assert.throws(() => directAudit(actor,'product.updated',id(actor),'forged@example.com'),(error) => String(error.stderr).includes('42501'));
      checks++;
    }
    assert.equal(auditCount(),4,'Ordinary events remain insertable; reserved/forged events create no rows'); checks++;
    for (const actor of [4,9,10]) {
      assert.throws(() => directAudit(actor,'product.updated'),(error) => String(error.stderr).includes('42501')); checks++;
    }
    for (const name of ['lookup_staff_candidate','manage_staff_access','provision_staff_access']) {
      assert.equal(sql(`SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${quote(name)}`),'postgres'); checks++;
    }
    reset();
    for (const actor of [3,4,5,6,7,8,9,10]) {
      rejects(id(actor), manage(id(3),'admin',true,row(3).updated_at), '42501');
      rejects(id(actor), provision(id(4),'staff'), '42501');
      rejects(id(actor), "public.lookup_staff_candidate('fixture4@example.com')", '42501');
    }
    rejects(null, provision(id(4),'staff'), '42501');
    for (const role of ['customer','viewer','unknown',null]) {
      rejects(id(1), manage(id(3),role,true,row(3).updated_at), '22023');
      rejects(id(1), provision(id(4),role), '22023');
    }
    rejects(id(1), manage(null,'staff',true,row(3).updated_at), '22023');
    rejects(id(1), manage(id(3),'staff',null,row(3).updated_at), '22023');
    rejects(id(1), manage(id(3),'staff',true,null), '22023');
    rejects(id(1), manage(id(3),'staff',true,row(3).updated_at,'x'.repeat(501)), '22023');
    for (const target of [4,7,8]) rejects(id(1), manage(id(target),'staff',true,row(target).updated_at), 'P0062');
    rejects(id(1), manage(id(999),'staff',true,row(3).updated_at), 'P0061');
    for (const target of [1,3,5,6,7,8,9,10]) rejects(id(1), provision(id(target),'staff'), 'P0062');
    rejects(id(1), provision(id(999),'staff'), 'P0061');
    sql(`DELETE FROM auth.users WHERE id=${quote(id(4))}`);
    rejects(id(1), provision(id(4),'staff'), 'P0061');
    reset();
    const candidates = JSON.parse(sql(tx(id(1), "SELECT COALESCE(json_agg(c),'[]'::json) FROM public.lookup_staff_candidate(' FIXTURE4@EXAMPLE.COM ') c")));
    assert.equal(candidates.length, 1); assert.equal(candidates[0].id,id(4));
    assert.deepEqual(Object.keys(candidates[0]).sort(), ['email','full_name','id','is_active','role','updated_at']); checks++;
    for (const email of ['fixture%', 'fixture', 'fixture9@example.com', 'fixture3@example.com']) {
      assert.equal(Number(sql(tx(id(1), `SELECT count(*) FROM public.lookup_staff_candidate(${quote(email)})`))),0); checks++;
    }
    for (const state of [
      { banned: null, deleted: null, allowed: true },
      { banned: '2000-01-01T00:00:00Z', deleted: null, allowed: true },
      { banned: 'infinity', deleted: null, allowed: false },
      { banned: '2099-01-01T00:00:00Z', deleted: null, allowed: false },
      { banned: null, deleted: '2026-01-01T00:00:00Z', allowed: false },
    ]) {
      reset();
      sql(`UPDATE auth.users SET banned_until=${quote(state.banned)}::timestamptz,deleted_at=${quote(state.deleted)}::timestamptz WHERE id=${quote(id(4))}`);
      const before = sql(`SELECT row_to_json(u) FROM auth.users u WHERE id=${quote(id(4))}`);
      assert.equal(Number(sql(tx(id(1),"SELECT count(*) FROM public.lookup_staff_candidate('fixture4@example.com')"))),state.allowed ? 1 : 0);
      if (state.allowed) {
        assert.equal(call(id(1),provision(id(4),'staff')).changed,true);
        assert.equal(auditCount(),1);
        assert.equal(sql("SELECT action FROM public.audit_log"),'staff_access_provisioned');
      } else {
        rejects(id(1),provision(id(4),'super_admin'),'P0065');
        assert.equal(row(4).role,'customer'); assert.equal(auditCount(),0);
      }
      assert.equal(sql(`SELECT row_to_json(u) FROM auth.users u WHERE id=${quote(id(4))}`),before,'Provision never modifies Auth state'); checks++;
    }
    for (const stateSql of ["banned_until=clock_timestamp()+interval '1 day'",'deleted_at=clock_timestamp()']) {
      reset();
      assert.equal(Number(sql(tx(id(1),"SELECT count(*) FROM public.lookup_staff_candidate('fixture4@example.com')"))),1);
      sql(`UPDATE auth.users SET ${stateSql} WHERE id=${quote(id(4))}`);
      rejects(id(1),provision(id(4),'super_admin'),'P0065');
      assert.equal(row(4).role,'customer'); assert.equal(auditCount(),0); checks++;
    }
    for (const stateSql of ["banned_until=clock_timestamp()+interval '1 day'",'deleted_at=clock_timestamp()']) {
      reset();
      const changeAuth = asyncSql(`BEGIN; UPDATE auth.users SET ${stateSql} WHERE id=${quote(id(4))}; SELECT pg_sleep(2); COMMIT;`);
      let holder=false;
      for(let i=0;i<40;i++) {
        if(Number(sql("SELECT count(*) FROM pg_stat_activity WHERE datname='staff_access_test' AND wait_event='PgSleep'"))>0){holder=true;break;}
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      assert.ok(holder,'Auth state update must hold its row lock');
      const provisioning=asyncTx(id(1),`SELECT ${provision(id(4),'super_admin')}`);
      let waiter=false;
      for(let i=0;i<30;i++) {
        if(Number(sql("SELECT count(*) FROM pg_stat_activity WHERE datname='staff_access_test' AND wait_event_type='Lock'"))>0){waiter=true;break;}
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      const [authResult,provisionResult]=await Promise.all([changeAuth,provisioning]);
      assert.ok(waiter,'Provision must actually wait for Auth state lock');
      assert.equal(authResult.ok,true);assert.equal(provisionResult.ok,false);assert.match(provisionResult.err,/P0065/);
      assert.equal(row(4).role,'customer');assert.equal(auditCount(),0);checks++;
    }
    reset();
    for (const dbRole of ['anon','service_role']) {
      assert.throws(() => sql(`BEGIN; SET LOCAL ROLE ${dbRole}; SELECT public.lookup_staff_candidate('fixture4@example.com'); COMMIT;`), (error) => String(error.stderr).includes('42501')); checks++;
    }
    for (const signature of ['public.lookup_staff_candidate(text)', 'public.manage_staff_access(uuid,text,boolean,timestamptz,text)', 'public.provision_staff_access(uuid,text,text)']) {
      for (const dbRole of ['anon','service_role','authenticated']) {
        assert.equal(sql(`SELECT has_function_privilege(${quote(dbRole)},${quote(signature)},'EXECUTE')`),dbRole==='authenticated' ? 't' : 'f'); checks++;
      }
    }
    assert.throws(() => sql(tx(id(1), `UPDATE public.profiles SET role='admin' WHERE id=${quote(id(3))}`)), (error) => String(error.stderr).includes('42501')); checks++;
    const original = row(3);
    assert.equal(call(id(1), manage(id(3),'staff',true,original.updated_at)).changed,false);
    assert.equal(auditCount(),0); assert.equal(row(3).updated_at,original.updated_at); checks++;
    const updated = call(id(1), manage(id(3),'admin',false,original.updated_at,'reason fixture'));
    assert.equal(updated.changed,true); assert.notEqual(updated.updated_at,original.updated_at);
    assert.equal(auditCount(),1,'RPC must create exactly one reserved audit despite the direct INSERT denial');
    rejects(id(1), manage(id(3),'editor',true,original.updated_at), 'P0063');
    const audit = JSON.parse(sql('SELECT row_to_json(a) FROM public.audit_log a'));
    assert.equal(audit.action,'staff_access_updated'); assert.equal(audit.user_id,id(1));
    assert.equal(audit.details.target_id,id(3)); assert.equal(audit.details.old_role,'staff'); assert.equal(audit.details.new_role,'admin');
    assert.equal(audit.details.old_is_active,true); assert.equal(audit.details.new_is_active,false); assert.equal(audit.details.reason,'reason fixture');
    assert.ok(audit.details.timestamp); checks++;
    reset(); sql(`UPDATE public.profiles SET is_active=false WHERE id=${quote(id(2))}`);
    rejects(id(1), manage(id(1),'super_admin',false,row(1).updated_at), 'P0064');
    rejects(id(1), manage(id(1),'admin',true,row(1).updated_at), 'P0064');
    assert.equal(auditCount(),0); checks++;
    for (const action of ['staff_access_updated','staff_access_provisioned']) {
      reset(); const before = row(action.endsWith('updated') ? 3 : 4);
      sql(`ALTER TABLE public.audit_log ADD CONSTRAINT qa_audit_failure CHECK(action<>${quote(action)})`);
      rejects(id(1), action.endsWith('updated') ? manage(id(3),'editor',true,before.updated_at) : provision(id(4),'staff'), '23514');
      const after = row(action.endsWith('updated') ? 3 : 4);
      assert.equal(after.role,before.role); assert.equal(after.updated_at,before.updated_at); assert.equal(auditCount(),0); checks++;
      sql('ALTER TABLE public.audit_log DROP CONSTRAINT qa_audit_failure');
    }
    for (const role of ['super_admin','admin','staff','editor']) {
      reset(); const before = row(4).updated_at;
      assert.equal(call(id(1),provision(id(4),role)).role,role);
      assert.notEqual(row(4).updated_at,before); assert.equal(auditCount(),1);
      rejects(id(1),provision(id(4),role),'P0062'); checks++;
      reset();
      assert.equal(call(id(1),manage(id(3),role,true,row(3).updated_at)).role,role);
      assert.equal(call(id(1),manage(id(3),role,false,row(3).updated_at)).is_active,false);
      assert.equal(call(id(1),manage(id(3),role,true,row(3).updated_at)).is_active,true); checks++;
    }
    reset();
    sql(`DO $$ DECLARE first_version timestamptz; second_version timestamptz; BEGIN
      UPDATE public.profiles SET updated_at=clock_timestamp()+interval '1 day' WHERE id=${quote(id(3))};
      SELECT updated_at INTO first_version FROM public.profiles WHERE id=${quote(id(3))};
      UPDATE public.profiles SET role='editor' WHERE id=${quote(id(3))} RETURNING updated_at INTO second_version;
      IF second_version <> first_version+interval '1 microsecond' THEN RAISE EXCEPTION 'Version did not advance monotonically'; END IF;
      UPDATE public.profiles SET is_active=false WHERE id=${quote(id(3))} RETURNING updated_at INTO first_version;
      IF first_version <= second_version THEN RAISE EXCEPTION 'Same transaction version did not advance'; END IF;
      END $$;
      ALTER TABLE public.profiles ALTER COLUMN updated_at DROP NOT NULL;
      UPDATE public.profiles SET updated_at=NULL WHERE id=${quote(id(3))};
      UPDATE public.profiles SET role='admin' WHERE id=${quote(id(3))};
      ALTER TABLE public.profiles ALTER COLUMN updated_at SET NOT NULL;`); checks++;
    await race(2,1,'super_admin','super_admin',false,false); // Mutual deactivation: waiting actor is rechecked.
    await race(1,2,'super_admin','super_admin',false,false); // Simultaneous self-deactivation: last admin survives.
    await race(1,2,'admin','editor',true,true); // Simultaneous self-demotion.
    await race(2,1,'admin','editor',true,true); // Mutual demotion rechecks the waiting actor's role.
    reset();
    const duplicate = await Promise.all([asyncTx(id(1),`SELECT ${provision(id(4),'staff')}`),asyncTx(id(2),`SELECT ${provision(id(4),'editor')}`)]);
    assert.equal(duplicate.filter((result) => result.ok).length,1); assert.equal(auditCount(),1); checks++;
    console.log(`PASS: ${checks} isolated PostgreSQL checks: real 0062 migration, ACLs, authorization, lookup, stale/no-op, atomic audit rollback, monotonic timestamps, concurrent deactivation/demotion/provisioning. Production untouched.`);
  } finally {
    execFileSync('docker', ['rm', '-f', '-v', container], { stdio: 'pipe' });
  }
}
main().catch((error) => { console.error(error.message); if (error.stderr) console.error(String(error.stderr)); process.exitCode=1; });
