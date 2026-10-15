'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');const os=require('node:os'),path=require('node:path');
const {generateKeyPairSync,sign}=require('node:crypto');const {createVerifier}=require('../auth');const {parseDelimited}=require('../import');const {createApp}=require('../server');const {openDb,createSet}=require('../db');
const envBase={CF_ACCESS_TEAM_DOMAIN:'https://test-team.cloudflareaccess.com',CF_ACCESS_AUD:'aud-test',INITIAL_ADMIN_EMAIL:'admin@example.com',PUBLIC_ORIGIN:'https://cards.example.com'};
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});const jwk={...publicKey.export({format:'jwk'}),kid:'test-key',alg:'RS256',use:'sig'};
function token(payload={}){const now=Math.floor(Date.now()/1000),h=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-key'})).toString('base64url'),p=Buffer.from(JSON.stringify({iss:envBase.CF_ACCESS_TEAM_DOMAIN,aud:envBase.CF_ACCESS_AUD,iat:now,exp:now+300,email:'admin@example.com',...payload})).toString('base64url'),s=sign('RSA-SHA256',Buffer.from(h+'.'+p),privateKey).toString('base64url');return `${h}.${p}.${s}`;}
test('Access token validation rejects tampering and wrong claims',async()=>{
  const verify=createVerifier({team:envBase.CF_ACCESS_TEAM_DOMAIN,aud:'aud-test'},{getJwks:async()=>[jwk]});
  assert.equal(await verify(token()),'admin@example.com');
  await assert.rejects(verify(token({aud:'other'})),/claims/);
  await assert.rejects(verify(token({exp:0})),/claims/);
  await assert.rejects(verify(token({email:''})),/email/);
  const t=token();await assert.rejects(verify(t.slice(0,-2)+'ab'),/signature/);
});
test('Quizlet tabs and quoted CSV imports',()=>{
  assert.equal(parseDelimited('A\tOne\nB\tTwo\nC\tThree\nD\tFour','\t').length,4);
  assert.deepEqual(parseDelimited('term,definition\nA,"One, two"\nB,Two\nC,Three\nD,Four',',')[0],{term:'A',definition:'One, two'});
  assert.throws(()=>parseDelimited('A\tOne\nA\tTwo\nC\tThree\nD\tFour','\t'),/unique/);
  assert.throws(()=>parseDelimited('A\tOne\nB\tTwo','\t'),/4/);
});
test('account approval, role permissions, private sets, progress and origin protection',async t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'arcade-test-'));const env={...envBase,DB_PATH:path.join(dir,'test.db')};
  const app=createApp({env,verifyJwt:async raw=>{if(!raw)throw Error('missing');return raw.toLowerCase();}});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>app.close(resolve));rmSync(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${app.address().port}`;
  async function call(who,route,method='GET',data,origin=env.PUBLIC_ORIGIN){const r=await fetch(base+route,{method,headers:{...(who?{'Cf-Access-Jwt-Assertion':who}:{}),...(data?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:origin}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json()};}
  assert.equal((await call(null,'/api/bootstrap')).status,401);
  assert.equal((await call('stranger@example.com','/api/bootstrap')).status,403);
  const boot=await call('admin@example.com','/api/bootstrap');assert.equal(boot.status,200);assert.equal(boot.body.sets.length,9);
  assert.equal(boot.body.sets[0].cards,undefined);
  assert.ok((await call('admin@example.com','/api/sets/reactions')).body.cards.length>0);
  const mathAsset=await fetch(base+'/vendor/katex/katex.min.js',{headers:{'Cf-Access-Jwt-Assertion':'admin@example.com'}});assert.equal(mathAsset.status,200);assert.match(await mathAsset.text(),/katex/);
  const mathEditor=await fetch(base+'/vendor/mathlive/mathlive.min.mjs',{headers:{'Cf-Access-Jwt-Assertion':'admin@example.com'}});assert.equal(mathEditor.status,200);assert.match(await mathEditor.text(),/MathfieldElement/);
  const editorInit=await fetch(base+'/math-editor.js',{headers:{'Cf-Access-Jwt-Assertion':'admin@example.com'}});assert.equal(editorInit.status,200);assert.match(await editorInit.text(),/fontsDirectory/);
  assert.equal((await call('admin@example.com','/api/admin/users','POST',{email:'editor@example.com',role:'editor',active:true})).status,200);
  assert.equal((await call('admin@example.com','/api/admin/users','POST',{email:'viewer@example.com',role:'viewer',active:true})).status,200);
  assert.equal((await call('viewer@example.com','/api/admin/audit')).status,403);
  assert.equal((await call('admin@example.com','/api/admin/audit')).body.events.length,2);
  const text='A\tOne\nB\tTwo\nC\tThree\nD\tFour';
  assert.equal((await call('viewer@example.com','/api/sets','POST',{title:'No',visibility:'shared',delimiter:'\t',text})).status,403);
  assert.equal((await call('editor@example.com','/api/sets','POST',{title:'No',visibility:'private',delimiter:'\t',text},'https://evil.example')).status,403);
  const created=await call('editor@example.com','/api/sets','POST',{title:'Private deck',visibility:'private',delimiter:'\t',text});assert.equal(created.status,201);const id=created.body.id;
  const attackTitle="x'); DROP TABLE users; -- <img src=x onerror=alert(1)>";
  const injected=await call('editor@example.com','/api/sets','POST',{title:attackTitle,visibility:'private',delimiter:'\t',text});assert.equal(injected.status,201);
  assert.equal((await call('editor@example.com','/api/bootstrap')).body.sets.find(s=>s.id===injected.body.id).title,attackTitle);
  assert.equal((await call('admin@example.com','/api/admin/users')).status,200);
  assert.ok((await call('editor@example.com','/api/bootstrap')).body.sets.some(s=>s.id===id));
  assert.ok(!(await call('viewer@example.com','/api/bootstrap')).body.sets.some(s=>s.id===id));
  assert.ok((await call('admin@example.com','/api/bootstrap')).body.sets.some(s=>s.id===id));
  assert.equal((await call('viewer@example.com','/api/progress','POST',{setId:id,right:1,wrong:0})).status,404);
  assert.equal((await call('editor@example.com','/api/progress','POST',{setId:id,right:1,wrong:0})).body.right,1);
  assert.equal((await call('editor@example.com','/api/progress','POST',{setId:id,right:5,wrong:0})).status,400);
  assert.equal((await call('viewer@example.com','/api/sets/'+id,'PUT',{title:'Hijack',visibility:'shared',delimiter:'\t',text})).status,403);
  assert.equal((await call('editor@example.com','/api/sets/reactions','DELETE')).status,403);
  assert.equal((await call('editor@example.com','/api/sets/'+id,'PUT',{title:'Shared deck',visibility:'shared',delimiter:'\t',text})).status,200);
  assert.ok((await call('viewer@example.com','/api/bootstrap')).body.sets.some(s=>s.id===id));
  assert.equal((await call('viewer@example.com','/api/progress','POST',{setId:id,right:0,wrong:1})).body.wrong,1);
  assert.equal((await call('admin@example.com','/api/admin/users','POST',{email:'viewer@example.com',role:'viewer',active:false})).status,200);
  assert.equal((await call('viewer@example.com','/api/bootstrap')).status,403);
  assert.equal((await call('admin@example.com','/api/admin/users','POST',{email:'admin@example.com',role:'viewer',active:false})).status,400);
  assert.equal((await call('editor@example.com','/api/sets/'+id,'DELETE')).status,200);
});

test('five approved users have independent progress and 1,000 sets load as summaries',async t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'arcade-scale-')),file=path.join(dir,'scale.db');
  const db=openDb(file,'admin@example.com',require('../seed.json'));
  const cards=[{term:'A',definition:'One'},{term:'B',definition:'Two'},{term:'C',definition:'Three'},{term:'D',definition:'Four'}];
  for(let i=0;i<991;i++)createSet(db,{title:`Set ${i}`,visibility:'shared',source:'Test',owner:'admin@example.com',cards});
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sets').get().n,1000);
  assert.throws(()=>createSet(db,{title:'Overflow',visibility:'shared',source:'Test',owner:'admin@example.com',cards}),/1,000-set limit/);
  for(let i=0;i<5;i++)db.prepare("INSERT INTO users(email,role) VALUES(?,'viewer')").run(`learner${i}@example.com`);
  db.close();
  const app=createApp({env:{...envBase,DB_PATH:file},verifyJwt:async raw=>raw||Promise.reject(Error('missing'))});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>app.close(resolve));rmSync(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${app.address().port}`;
  const snapshots=await Promise.all(Array.from({length:5},(_,i)=>fetch(base+'/api/bootstrap',{headers:{'Cf-Access-Jwt-Assertion':`learner${i}@example.com`}}).then(r=>r.json())));
  for(const snapshot of snapshots){assert.equal(snapshot.sets.length,1000);assert.equal(snapshot.sets[0].cards,undefined);}
  await Promise.all(Array.from({length:5},(_,i)=>fetch(base+'/api/progress',{method:'POST',headers:{'Content-Type':'application/json',Origin:envBase.PUBLIC_ORIGIN,'Cf-Access-Jwt-Assertion':`learner${i}@example.com`},body:JSON.stringify({setId:'reactions',right:1,wrong:0})}).then(r=>assert.equal(r.status,200))));
  const check=await fetch(base+'/api/bootstrap',{headers:{'Cf-Access-Jwt-Assertion':'learner4@example.com'}}).then(r=>r.json());
  assert.equal(check.progress.find(p=>p.setId==='reactions').right,1);
});
