'use strict';
const fs=require('node:fs');
const path=require('node:path');
const MAX_BYTES=2_000_000,MAX_FILES=250;
const fail=(message,status=400)=>Object.assign(Error(message),{status});
function safeName(value,extension=false){
  if(typeof value!=='string')throw fail('Provide a name.');
  const name=value.normalize('NFC').trim();
  if(!name||name.length>120||name==='.'||name==='..'||name.startsWith('.')||/[\/\\\u0000-\u001f\u007f<>:"|?*]/u.test(name))throw fail('Use a name without slashes, special path characters, or a leading dot.');
  if(extension&&!/\.(md|markdown|txt)$/i.test(name))throw fail('Choose a .md, .markdown, or .txt file.');
  return name;
}
function accountPath(root,email){
  // A normal address appears unchanged on disk; uncommon path characters are encoded.
  return path.join(root,email.toLowerCase().replace(/[^a-z0-9@._+-]/gu,c=>encodeURIComponent(c)));
}
function regularDirectory(dir){if(fs.existsSync(dir)&&!fs.lstatSync(dir).isDirectory())throw fail('Storage folder is unavailable.',500);}
function regularFile(file){try{const stat=fs.lstatSync(file);if(!stat.isFile())throw fail('File is unavailable.',404);return stat;}catch(e){if(e.code==='ENOENT')throw fail('File not found.',404);throw e;}}
function list(root,email){const userDir=accountPath(root,email);regularDirectory(userDir);if(!fs.existsSync(userDir))return [];
  const result=[];for(const folder of fs.readdirSync(userDir,{withFileTypes:true})){if(!folder.isDirectory())continue;const dir=path.join(userDir,folder.name);for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(!entry.isFile()||!/\.(md|markdown|txt)$/i.test(entry.name))continue;const stat=fs.statSync(path.join(dir,entry.name));result.push({folder:folder.name,name:entry.name,size:stat.size,updatedAt:stat.mtime.toISOString()});}}
  return result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
function save(root,email,rawFolder,rawName,content){const folder=safeName(rawFolder),name=safeName(rawName,true);
  if(typeof content!=='string'||Buffer.byteLength(content,'utf8')>MAX_BYTES)throw fail('File must be text under 2 MB.');
  if(content.includes('\0'))throw fail('File contains unsupported characters.');
  const userDir=accountPath(root,email),dir=path.join(userDir,folder);
  fs.mkdirSync(root,{recursive:true,mode:0o700});regularDirectory(userDir);fs.mkdirSync(userDir,{recursive:true,mode:0o700});regularDirectory(dir);
  if(list(root,email).length>=MAX_FILES)throw fail(`This account has reached its ${MAX_FILES}-file limit.`,409);
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const ext=path.extname(name),stem=name.slice(0,-ext.length);let stored='';
  for(let n=1;n<=1000;n++){const candidate=n===1?name:`${stem} (${n})${ext}`;if(candidate.length>150)throw fail('Choose a shorter file name.');
    try{fs.writeFileSync(path.join(dir,candidate),content,{encoding:'utf8',flag:'wx',mode:0o600});stored=candidate;break;}catch(e){if(e.code!=='EEXIST')throw e;}}
  if(!stored)throw fail('Too many files with the same name.',409);
  return {folder,name:stored};
}
function read(root,email,rawFolder,rawName){const folder=safeName(rawFolder),name=safeName(rawName,true),userDir=accountPath(root,email),dir=path.join(userDir,folder);regularDirectory(userDir);regularDirectory(dir);const file=path.join(dir,name);const stat=regularFile(file);if(stat.size>MAX_BYTES)throw fail('File is too large to open.',413);return {folder,name,content:fs.readFileSync(file,'utf8')};}
function remove(root,email,rawFolder,rawName){const folder=safeName(rawFolder),name=safeName(rawName,true),userDir=accountPath(root,email),dir=path.join(userDir,folder);regularDirectory(userDir);regularDirectory(dir);const file=path.join(dir,name);regularFile(file);fs.unlinkSync(file);if(fs.readdirSync(dir).length===0)fs.rmdirSync(dir);return {deleted:true};}
module.exports={list,save,read,remove,safeName};
