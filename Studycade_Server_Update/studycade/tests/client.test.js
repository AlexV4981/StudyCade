'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const katex=require('katex');require('katex/contrib/mhchem');
test('client boots and renders all six study views from server data',async()=>{
  const callbacks={},elements=new Map();
  const el=selector=>{if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',value:'',hidden:false,style:{setProperty(){}},clientHeight:300,offsetHeight:80,addEventListener(type,fn){callbacks[selector+':'+type]=fn},scrollIntoView(){},showModal(){},close(){},classList:{add(){}}});return elements.get(selector)};
  const cards=[{id:1,term:'Synthesis',definition:'Two combine \\(x^2\\)'},{id:2,term:'Decomposition',definition:'One breaks'},{id:3,term:'Combustion',definition:'React with oxygen'},{id:4,term:'Replacement',definition:'Swap a part'}];
  const boot={user:{email:'admin@example.com',role:'admin'},sets:[{id:'reactions',title:'Reaction Types',source:'Lecture',visibility:'shared',builtin:1,owner:null,cardCount:4}],progress:[]};
  const paths=[];
  const context={window:{katex},document:{querySelector:el,getElementById:el,addEventListener(type,fn){callbacks['document:'+type]=fn},hidden:false},localStorage:{getItem(){return null},setItem(){}},fetch:async url=>{paths.push(url);return {ok:true,headers:{get:()=> 'application/json'},json:async()=>url==='/api/bootstrap'?boot:{id:'reactions',cards}}},requestAnimationFrame(){return 1},cancelAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},console,Blob,URL:{createObjectURL(){return 'blob:'},revokeObjectURL(){}}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8'),context);await new Promise(r=>setTimeout(r,20));
  assert.match(el('#game-panel').innerHTML,/Flashcards/);
  assert.deepEqual(paths,['/api/bootstrap','/api/sets/reactions']);
  assert.match(el('#terms-list').innerHTML,/class="katex"/);
  assert.equal(el('#import-open').hidden,false);assert.equal(el('#admin-open').hidden,false);
  for(const [id,title] of [['memory','Memory'],['match','Match the pairs'],['choice','Multiple choice'],['bank','Word bank'],['meteor','Meteor Defense']]){
    callbacks['#mode-nav:click']({target:{closest:()=>({dataset:{mode:id}})}});
    assert.match(el('#game-panel').innerHTML,new RegExp(title),id);
  }
});
