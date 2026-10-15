'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtempSync,rmSync,existsSync}=require('node:fs');const path=require('node:path'),os=require('node:os');
const {createApp}=require('../server');
const baseEnv={CF_ACCESS_TEAM_DOMAIN:'https://team.cloudflareaccess.com',CF_ACCESS_AUD:'aud',INITIAL_ADMIN_EMAIL:'admin@example.com',PUBLIC_ORIGIN:'https://study.example.com'};
test('account folders isolate saved Markdown and reject path traversal',async t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'studycade-files-')),env={...baseEnv,DB_PATH:path.join(dir,'db.sqlite')};
  const app=createApp({env,verifyJwt:async token=>token||Promise.reject(Error('missing'))});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>app.close(resolve));rmSync(dir,{recursive:true,force:true});});
  const url=`http://127.0.0.1:${app.address().port}`;
  async function call(who,route,method='GET',data,origin=baseEnv.PUBLIC_ORIGIN){const res=await fetch(url+route,{method,headers:{'Cf-Access-Jwt-Assertion':who,...(data?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:origin}:{})},body:data?JSON.stringify(data):undefined});return {status:res.status,data:await res.json()};}
  await call('admin@example.com','/api/admin/users','POST',{email:'other@example.com',role:'viewer',active:true});
  const payload={folder:'Calculus II',name:'Review.md',content:'# Integrals\n\\(x^2\\)'};
  assert.equal((await call('admin@example.com','/api/study-files','POST',payload,'https://evil.example')).status,403);
  assert.equal((await call('admin@example.com','/api/study-files','POST',{...payload,folder:'../other@example.com'})).status,400);
  assert.equal((await call('admin@example.com','/api/study-files','POST',{...payload,name:'../../secret.md'})).status,400);
  const first=await call('admin@example.com','/api/study-files','POST',payload);assert.equal(first.status,201);assert.deepEqual(first.data,{folder:'Calculus II',name:'Review.md'});
  assert.equal((await call('admin@example.com','/api/study-files','POST',payload)).data.name,'Review (2).md');
  assert.ok(existsSync(path.join(dir,'studycade-files','admin@example.com','Calculus II','Review.md')));
  assert.equal((await call('other@example.com','/api/study-files')).data.files.length,0);
  const route='/api/study-files/Calculus%20II/Review.md';assert.equal((await call('other@example.com',route)).status,404);
  assert.equal((await call('admin@example.com',route)).data.content,payload.content);
  assert.equal((await call('admin@example.com','/api/study-files/..%2Fother/Review.md')).status,400);
  assert.equal((await call('admin@example.com',route,'DELETE')).status,200);
  assert.equal((await call('admin@example.com',route)).status,404);
  for(let i=0;i<12;i++)assert.equal((await call('other@example.com','/api/study-files','POST',{...payload,name:`upload-${i}.md`})).status,201);
  assert.equal((await call('other@example.com','/api/study-files','POST',{...payload,name:'too-many.md'})).status,429);
});
