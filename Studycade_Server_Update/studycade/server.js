'use strict';
process.umask(0o077);
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {authConfig,createVerifier}=require('./auth');const {parseDelimited}=require('./import');const {openDb,createSet,updateSet}=require('./db');
const seed=require('./seed.json');
const studyFiles=require('./files');
const publicDir=path.join(__dirname,'public');
const commonHeaders={
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'Strict-Transport-Security':'max-age=15552000',
  'Cross-Origin-Resource-Policy':'same-origin','Cross-Origin-Opener-Policy':'same-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Cache-Control':'no-store'
};
function send(res,status,data){res.writeHead(status,{...commonHeaders,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function problem(res,status,message){send(res,status,{error:message});}
async function body(req,limit=1_200_000){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>limit){const e=Error('Request is too large.');e.status=413;throw e;}chunks.push(chunk);}try{const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();return parsed;}catch{const e=Error('Send a JSON object.');e.status=400;throw e;}}
function validTitle(t){if(typeof t!=='string'||!t.trim()||t.trim().length>100)throw Object.assign(Error('Set title must be 1–100 characters.'),{status:400});return t.trim();}
function validVisibility(v){if(v!=='private'&&v!=='shared')throw Object.assign(Error('Choose private or shared visibility.'),{status:400});return v;}
function canRead(s,user){return !!s&&(s.visibility==='shared'||s.owner_email===user.email||user.role==='admin');}
function canEdit(s,user){return !!s&&!s.builtin&&(user.role==='admin'||(user.role==='editor'&&s.owner_email===user.email));}
function createApp({env=process.env,verifyJwt}={}){
  const config=authConfig(env);
  const db=openDb(env.DB_PATH||path.join(__dirname,'data','arcade.db'),config.admin,seed);
  const filesRoot=env.STUDY_FILES_DIR||path.join(path.dirname(env.DB_PATH||path.join(__dirname,'data','arcade.db')),'studycade-files');
  const verifyAccess=verifyJwt||createVerifier(config);
  const rates=new Map();
  function limited(email,pathname,method){
    const now=Date.now();let bucket=rates.get(email);
    if(!bucket||now-bucket.start>=60_000){bucket={start:now,requests:0,writes:0,uploads:0,admin:0};rates.set(email,bucket);}
    bucket.requests++;
    if(bucket.requests>240)return true;
    if(!['GET','HEAD'].includes(method)){
      bucket.writes++;if(bucket.writes>60)return true;
      if(pathname==='/api/study-files'&&method==='POST'&&++bucket.uploads>12)return true;
      if(pathname.startsWith('/api/admin/')&&++bucket.admin>20)return true;
    }
    return false;
  }
  const app=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');const pathname=url.pathname;
      if(pathname==='/healthz'&&req.method==='GET')return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)?send(res,200,{status:'ok'}):problem(res,404,'Not found.');
      let email;try{email=await verifyAccess(req.headers['cf-access-jwt-assertion']);}catch{return problem(res,401,'Cloudflare Access authentication is required.');}
      const user=db.prepare('SELECT email,role,active FROM users WHERE email=?').get(email);
      if(!user||!user.active)return problem(res,403,'This account has not been approved.');
      if(limited(email,pathname,req.method))return problem(res,429,'Too many requests. Wait a minute and try again.');
      if(!['GET','HEAD'].includes(req.method)){
        if(req.headers.origin!==config.origin)return problem(res,403,'Request origin is not allowed.');
        if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']||'')&&req.method!=='DELETE')return problem(res,415,'Send JSON.');
      }
      if(pathname==='/api/bootstrap'&&req.method==='GET'){
        const sets=db.prepare("SELECT s.id,s.title,s.owner_email AS owner,s.visibility,s.source,s.builtin,COUNT(c.id) AS cardCount FROM sets s LEFT JOIN cards c ON c.set_id=s.id WHERE s.visibility='shared' OR s.owner_email=? OR ?='admin' GROUP BY s.id ORDER BY s.builtin DESC,s.title COLLATE NOCASE").all(email,user.role);
        const progress=db.prepare('SELECT set_id AS setId,right_count AS right,wrong_count AS wrong FROM progress WHERE email=?').all(email);
        return send(res,200,{user:{email:user.email,role:user.role},sets,progress});
      }
      if(pathname==='/api/study-files'&&req.method==='GET')return send(res,200,{account:email,files:studyFiles.list(filesRoot,email)});
      if(pathname==='/api/study-files'&&req.method==='POST'){
        const b=await body(req,2_500_000);
        return send(res,201,studyFiles.save(filesRoot,email,b.folder,b.name,b.content));
      }
      const fileRoute=pathname.match(/^\/api\/study-files\/([^/]+)\/([^/]+)$/);
      if(fileRoute&&['GET','DELETE'].includes(req.method)){
        let folder,name;try{folder=decodeURIComponent(fileRoute[1]);name=decodeURIComponent(fileRoute[2]);}catch{return problem(res,400,'Invalid file address.');}
        return send(res,200,req.method==='GET'?studyFiles.read(filesRoot,email,folder,name):studyFiles.remove(filesRoot,email,folder,name));
      }
      if(pathname==='/api/export'&&req.method==='GET'){
        const rows=db.prepare('SELECT id,title,visibility,source FROM sets WHERE owner_email=? AND builtin=0').all(email);
        const sets=rows.map(s=>({...s,cards:db.prepare('SELECT term,definition FROM cards WHERE set_id=? ORDER BY position').all(s.id)}));
        const progress=db.prepare('SELECT set_id AS setId,right_count AS right,wrong_count AS wrong FROM progress WHERE email=?').all(email);
        return send(res,200,{version:1,exportedAt:new Date().toISOString(),sets,progress});
      }
      if(pathname==='/api/sets'&&req.method==='POST'){
        if(!['editor','admin'].includes(user.role))return problem(res,403,'Editor permission required.');
        const b=await body(req),title=validTitle(b.title),visibility=validVisibility(b.visibility);
        let cards;try{cards=parseDelimited(b.text,b.delimiter);}catch(e){return problem(res,400,e.message);}
        const source=b.delimiter==='\t'?'Tab-separated import':'CSV import';
        const id=createSet(db,{title,visibility,source,owner:email,cards});return send(res,201,{id});
      }
      const setRoute=pathname.match(/^\/api\/sets\/([a-zA-Z0-9-]+)$/);
      if(setRoute&&req.method==='GET'){
        const s=db.prepare('SELECT id,title,owner_email AS owner,visibility,source,builtin FROM sets WHERE id=?').get(setRoute[1]);
        if(!canRead(s,user))return problem(res,404,'Set not found.');
        return send(res,200,{...s,cards:db.prepare('SELECT id,term,definition FROM cards WHERE set_id=? ORDER BY position').all(s.id)});
      }
      if(setRoute&&['PUT','DELETE'].includes(req.method)){
        const id=setRoute[1],s=db.prepare('SELECT * FROM sets WHERE id=?').get(id);
        if(!s)return problem(res,404,'Set not found.');if(!canEdit(s,user))return problem(res,403,'You cannot edit this set.');
        if(req.method==='DELETE'){db.prepare('DELETE FROM sets WHERE id=?').run(id);return send(res,200,{deleted:true});}
        const b=await body(req),title=validTitle(b.title),visibility=validVisibility(b.visibility);
        let cards;try{cards=parseDelimited(b.text,b.delimiter);}catch(e){return problem(res,400,e.message);}
        updateSet(db,id,{title,visibility,cards});return send(res,200,{updated:true});
      }
      if(pathname==='/api/progress'&&req.method==='POST'){
        const b=await body(req);const s=typeof b.setId==='string'?db.prepare('SELECT id,owner_email,visibility FROM sets WHERE id=?').get(b.setId):null;
        if(!canRead(s,user))return problem(res,404,'Set not found.');
        if(!Number.isInteger(b.right)||!Number.isInteger(b.wrong)||b.right<0||b.wrong<0||b.right+b.wrong!==1)return problem(res,400,'Submit one result at a time.');
        db.prepare(`INSERT INTO progress(email,set_id,right_count,wrong_count) VALUES(?,?,?,?) ON CONFLICT(email,set_id) DO UPDATE SET right_count=right_count+excluded.right_count,wrong_count=wrong_count+excluded.wrong_count`).run(email,s.id,b.right,b.wrong);
        return send(res,200,db.prepare('SELECT right_count AS right,wrong_count AS wrong FROM progress WHERE email=? AND set_id=?').get(email,s.id));
      }
      if(pathname==='/api/admin/users'&&req.method==='GET'){
        if(user.role!=='admin')return problem(res,403,'Admin permission required.');
        return send(res,200,{users:db.prepare('SELECT email,role,active,created_at AS createdAt FROM users ORDER BY email').all()});
      }
      if(pathname==='/api/admin/audit'&&req.method==='GET'){
        if(user.role!=='admin')return problem(res,403,'Admin permission required.');
        return send(res,200,{events:db.prepare('SELECT actor_email AS actor,target_email AS target,action,detail,created_at AS createdAt FROM audit_events ORDER BY id DESC LIMIT 100').all()});
      }
      if(pathname==='/api/admin/users'&&req.method==='POST'){
        if(user.role!=='admin')return problem(res,403,'Admin permission required.');
        const b=await body(req),target=typeof b.email==='string'?b.email.trim().toLowerCase():'';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)||target.length>254||!['viewer','editor','admin'].includes(b.role)||typeof b.active!=='boolean')return problem(res,400,'Provide a valid email, role, and active status.');
        if(target===config.admin&&(b.role!=='admin'||!b.active))return problem(res,400,'The configured initial administrator cannot be deactivated.');
        if(target===email&&(!b.active||b.role!=='admin'))return problem(res,400,'You cannot remove your own admin access.');
        const before=db.prepare('SELECT role,active FROM users WHERE email=?').get(target);
        db.exec('BEGIN IMMEDIATE');try{
          db.prepare(`INSERT INTO users(email,role,active) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,active=excluded.active`).run(target,b.role,b.active?1:0);
          db.prepare('INSERT INTO audit_events(actor_email,target_email,action,detail) VALUES(?,?,?,?)').run(email,target,before?'account.updated':'account.created',JSON.stringify({from:before||null,to:{role:b.role,active:b.active}}));
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e;}
        return send(res,200,{email:target,role:b.role,active:b.active});
      }
      if(req.method==='GET'&&pathname.startsWith('/vendor/')){
        const assets={
          '/vendor/katex/katex.min.css':'katex/dist/katex.min.css',
          '/vendor/katex/katex.min.js':'katex/dist/katex.min.js',
          '/vendor/katex/mhchem.min.js':'katex/dist/contrib/mhchem.min.js',
          '/vendor/mathlive/mathlive.min.mjs':'mathlive/mathlive.min.mjs'
        };
        let name=assets[pathname];
        if(/^\/vendor\/(katex|mathlive)\/fonts\/[a-zA-Z0-9_-]+\.woff2?$/.test(pathname)){
          const match=pathname.match(/^\/vendor\/(katex|mathlive)\/fonts\/(.+)$/);
          name=match[1]==='katex'?`katex/dist/fonts/${match[2]}`:`mathlive/fonts/${match[2]}`;
        }
        if(!name)return problem(res,404,'Not found.');
        const file=path.join(__dirname,'node_modules',name);
        if(!fs.existsSync(file))return problem(res,404,'Not found.');
        const mime=name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':name.endsWith('.mjs')?'text/javascript':'font/woff2';
        res.writeHead(200,{...commonHeaders,'Content-Type':mime});return fs.createReadStream(file).pipe(res);
      }
      if(req.method==='GET'&&['/','/index.html','/style.css','/app.js','/math-editor.js','/md-viewer.js'].includes(pathname)){
        const file=pathname==='/'?'/index.html':pathname;
        const mime=file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html';
        res.writeHead(200,{...commonHeaders,'Content-Type':mime+'; charset=utf-8'});return fs.createReadStream(path.join(publicDir,file)).pipe(res);
      }
      return problem(res,404,'Not found.');
    }catch(e){if(e.status)return problem(res,e.status,e.message);console.error('Request failed:',e);return problem(res,500,'Server error.');}
  });
  app.headersTimeout=10_000;app.requestTimeout=30_000;app.keepAliveTimeout=5_000;
  app.on('close',()=>db.close());return app;
}
if(require.main===module){const app=createApp();const port=Number(process.env.PORT||8000);app.listen(port,'0.0.0.0',()=>console.log(`Studycade listening on ${port}`));}
module.exports={createApp};
