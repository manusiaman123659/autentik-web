/* eslint-disable @typescript-eslint/no-require-imports -- Isolated real Next.js Server Action integration. */
// Runs the installed Next.js in a disposable app, not the production app.
// Actual staff actions, schemas and authorization helpers are transpiled from
// current source. Only Supabase transport is replaced. Next.js cookies,
// redirect, React action decoding, HTTP and Flight rendering are REAL.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const actor = '00000000-0000-4000-8000-000000000001';
const version = '2026-10-04T12:00:00.123456+00:00';
const pause = (ms) => new Promise(resolve=>setTimeout(resolve,ms));
let checks = 0;

async function main() {
  // Keep generated files on the workspace drive: Next's Windows resolver
  // cannot relativize client entries across C: fixture / D: dependencies.
  // This disposable subdirectory is inside the already ignored build output.
  const parent = path.join(root,'.next');
  assert.ok(fs.existsSync(parent),'Run npm run build once to create the ignored build-output parent');
  const temporary = fs.mkdtempSync(path.join(parent,'staff-next-'));
  let child;
  let logs = '';
  const write = (name,text) => { const file=path.join(temporary,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text); };
  try {
    fs.symlinkSync(path.join(root,'node_modules'),path.join(temporary,'node_modules'),'junction');
    write('package.json',JSON.stringify({name:'isolated-staff-actions-fixture',private:true,type:'module'}));
    write('next.config.mjs',`export default { turbopack: { root: ${JSON.stringify(root)} } };\n`);
    const aliases = {
      '@/lib/admin':'./admin.js', '@/lib/admin-permissions':'./admin-permissions.js',
      '@/lib/admin-sections':'./admin-sections.js', '@/lib/validations/staffSchema':'./staffSchema.js',
      '@/utils/supabase/server':'./supabase.js',
    };
    for (const [source,destination] of [
      ['lib/actions/staff.ts','lib/staff.js'],['lib/admin.ts','lib/admin.js'],
      ['lib/admin-permissions.ts','lib/admin-permissions.js'],['lib/admin-sections.ts','lib/admin-sections.js'],
      ['lib/validations/staffSchema.ts','lib/staffSchema.js'],
    ]) {
      let text=ts.transpileModule(fs.readFileSync(path.join(root,source),'utf8'),{
        compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
      }).outputText;
      for(const [name,replacement] of Object.entries(aliases))text=text.replaceAll(`"${name}"`,`"${replacement}"`);
      assert.doesNotMatch(text,/["']@\//,`Unmapped source import in ${source}`);
      write(destination,text);
    }
    write('lib/state.js',`
      const key=Symbol.for('aka004.next-fixture');
      export const state=globalThis[key]??=( {} );
      export function reset(options={}){Object.assign(state,{role:'super_admin',active:true,signedOut:false,committed:false,
        protectedRendersAfterCommit:0,refreshOnAuth:false,refreshes:0,logoutFailure:null,events:[],...options});}
      if(!state.role)reset();
    `);
    write('lib/supabase.js',`
      import {state} from './state.js';
      export function createClient(cookieStore){return {
        auth:{
          async getUser(){
            if(state.refreshOnAuth){cookieStore.set('fixture-session','refreshed',{path:'/'});state.refreshOnAuth=false;state.refreshes++;state.events.push('refresh-cookie');}
            return {data:{user:state.signedOut?null:{id:'${actor}',email:'fixture@example.com'}}};
          },
          async signOut(options){
            state.events.push('signOut:'+options.scope);
            if(!state.committed||state.active)throw new Error('Logout occurred before inactive commit');
            if(state.logoutFailure==='error')return {error:{message:'Fixture cleanup failure'}};
            cookieStore.delete('fixture-session');state.events.push('logout-cookie');
            if(state.logoutFailure==='throw')throw new Error('Fixture partial cleanup failure');
            state.signedOut=true;return {error:null};
          },
        },
        from(table){if(table!=='profiles')throw new Error('Unexpected table');const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:'${actor}',email:'fixture@example.com',full_name:'Fixture',role:state.role,is_active:state.active},error:null})};return q;},
        async rpc(name,args){
          if(name!=='manage_staff_access'||args.p_target_user_id!=='${actor}'||args.p_expected_updated_at!=='${version}')throw new Error('Unexpected mutation');
          state.role=args.p_role;state.active=args.p_is_active;state.committed=true;state.events.push('commit');
          return {data:{id:'${actor}',role:state.role,is_active:state.active,changed:true,updated_at:'${version}'},error:null};
        },
      };}
    `);
    write('app/layout.jsx','export default function Layout({children}){return <html lang="id"><body>{children}</body></html>}');
    write('app/admin/akses-staff/page.jsx',`
      import {requireCapability} from '../../../lib/admin.js';
      import {manageStaffAccess} from '../../../lib/staff.js';
      import {state} from '../../../lib/state.js';
      export const dynamic='force-dynamic';
      export default async function Page(){
        if(state.committed)state.protectedRendersAfterCommit++;
        await requireCapability('users');
        const input={targetId:'${actor}',role:state.desiredRole??'staff',isActive:state.desiredActive??true,expectedUpdatedAt:'${version}',reason:'isolated lifecycle test'};
        return <form id="self-form" action={manageStaffAccess.bind(null,input)}><button>Konfirmasi</button></form>;
      }
    `);
    write('app/admin/page.jsx',`
      import {getAdminUser} from '../../lib/admin.js';import {redirect} from 'next/navigation';
      export const dynamic='force-dynamic';
      export default async function Page(){const user=await getAdminUser();if(!user)redirect('/admin/login');return <p>Dashboard allowed: {user.role}</p>}
    `);
    write('app/admin/login/page.jsx','export default function Page(){return <p>Login fixture</p>}');
    write('app/control/route.js',`
      import {state,reset} from '../../lib/state.js';
      export async function GET(){return Response.json(state)}
      export async function POST(request){const input=await request.json();if(input.reset)reset(input.options);else Object.assign(state,input);return Response.json(state)}
    `);
    const portServer=http.createServer();await new Promise(resolve=>portServer.listen(0,'127.0.0.1',resolve));
    const port=portServer.address().port;await new Promise(resolve=>portServer.close(resolve));
    const base=`http://127.0.0.1:${port}`;
    const env={...process.env,NEXT_TELEMETRY_DISABLED:'1',NODE_ENV:'development'};
    for(const key of Object.keys(env))if(/SUPABASE|MIDTRANS|MIKA|GEMINI/.test(key))delete env[key];
    child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],{cwd:temporary,env,stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',data=>{logs+=data.toString()});child.stderr.on('data',data=>{logs+=data.toString()});
    let ready=false;
    for(let i=0;i<180;i++){
      let response;try{response=await fetch(base+'/control')}catch{/* startup */}
      if(response?.ok){ready=true;break;}
      if(response && response.status>=500)throw new Error(`Fixture compile failed: ${await response.text()}`);
      if(child.exitCode!==null)break;
      await pause(200);
    }
    assert.ok(ready,`Next.js fixture did not start:\n${logs}`);
    const control=async(value)=>{const response=await fetch(base+'/control',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)});assert.equal(response.ok,true);return response.json()};
    const decode=(text)=>text.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
    for(const transport of ['native-form','fetch-action']) {
      for(const scenario of [
        {role:'admin',active:true},{role:'staff',active:true},{role:'editor',active:true},
        {role:'super_admin',active:false},{role:'super_admin',active:false,logoutFailure:'error'},
        {role:'super_admin',active:false,logoutFailure:'throw'},
      ]) {
        await control({reset:true,options:{desiredRole:scenario.role,desiredActive:scenario.active,logoutFailure:scenario.logoutFailure??null}});
        const page=await fetch(base+'/admin/akses-staff',{headers:{cookie:'fixture-session=valid'}});assert.equal(page.status,200);
        const html=await page.text();const form=html.match(/<form\b[^>]*id="self-form"[^>]*>([\s\S]*?)<\/form>/);
        assert.ok(form,`Missing real React Server Action form:\n${html.slice(0,2000)}\n${logs}`);
        const fields=[...form[1].matchAll(/<input\b[^>]*>/g)].map(([tag])=>({
          name:decode(tag.match(/\bname="([^"]*)"/)?.[1]??''),value:decode(tag.match(/\bvalue="([^"]*)"/)?.[1]??''),
        }));
        await control({refreshOnAuth:true});
        let response;
        if(transport==='native-form') {
          const body=new FormData();for(const field of fields)body.append(field.name,field.value);
          response=await fetch(base+'/admin/akses-staff',{method:'POST',headers:{origin:base,cookie:'fixture-session=valid'},body,redirect:'manual'});
          assert.equal(response.status,303,`Redirect was swallowed: ${transport}/${JSON.stringify(scenario)}\n${await response.text()}\n${logs}`);
          assert.equal(new URL(response.headers.get('location'),base).pathname,scenario.active?'/admin':'/admin/login');
        } else {
          const metadata=fields.map(field=>{try{return JSON.parse(field.value)}catch{return null}}).find(value=>value?.id&&value?.bound);
          assert.ok(metadata?.id,'Cannot locate compiled Next.js action ID');
          response=await fetch(base+'/admin/akses-staff',{method:'POST',headers:{origin:base,cookie:'fixture-session=valid','Next-Action':metadata.id,'Content-Type':'text/plain;charset=UTF-8',Accept:'text/x-component'},body:JSON.stringify([{targetId:actor,role:scenario.role,isActive:scenario.active,expectedUpdatedAt:version,reason:'isolated lifecycle test'}]),redirect:'manual'});
          const flight=await response.text();
          assert.equal(response.status,200,flight);
          assert.equal(response.headers.get('x-action-redirect')?.split(';')[0],scenario.active?'/admin':'/admin/login',`Missing framework Flight redirect:\n${flight}\n${logs}`);
          assert.doesNotMatch(flight,/Hasil perubahan belum dapat dipastikan|Akses staf belum dapat diperbarui/,'No false failure/rollback result');
        }
        const responseCookies=response.headers.getSetCookie().join('; ');
        assert.match(responseCookies,/fixture-session=/,'Real cookie mutations must reach the redirect response');
        if(scenario.active||scenario.logoutFailure==='error')assert.match(responseCookies,/fixture-session=refreshed/);
        else assert.match(responseCookies,/fixture-session=;/,'Successful or partial logout clears the local cookie');
        const state=await (await fetch(base+'/control')).json();
        assert.equal(state.committed,true);assert.equal(state.role,scenario.role);assert.equal(state.active,scenario.active);
        assert.equal(state.refreshes,1,'Real cookie refresh must occur in the action');
        assert.equal(state.protectedRendersAfterCommit,0,'No attempt to render the forbidden staff page after commit');
        assert.equal(state.events[0],'refresh-cookie');assert.equal(state.events[1],'commit');
        if(!scenario.active){assert.equal(state.events[2],'signOut:local');assert.equal((await fetch(base+'/admin/akses-staff')).status,404,'Inactive profile rejected by actual authoritative guard');}
        else {const destination=await fetch(base+'/admin');assert.equal(destination.status,200);assert.match(await destination.text(),new RegExp(`Dashboard allowed:.*${scenario.role}`));}
        checks++;
      }
    }
    console.log(`PASS: ${checks} real Next.js lifecycle scenarios: native 303 + fetch/Flight redirects, actual cookies/refresh, committed self-demotion to admin/staff/editor, self-deactivation, logout return/throw failures, no forbidden post-commit render. Supabase transport only is isolated.`);
  } catch(error) {
    if(logs)console.error(logs);
    throw error;
  } finally {
    if(child){child.kill();await Promise.race([new Promise(resolve=>child.once('exit',resolve)),pause(1000)]);}
    // Remove the junction separately; never recurse into project node_modules.
    try{fs.rmdirSync(path.join(temporary,'node_modules'));}catch{/* already removed */}
    try{fs.rmSync(temporary,{recursive:true,force:true});}catch{/* Windows process may still release temporary artifacts */}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
