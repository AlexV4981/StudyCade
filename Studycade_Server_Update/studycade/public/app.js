(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Text stays escaped; only explicitly delimited math is handed to KaTeX.
  const rich = value => String(value ?? '').split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g).map(part=>{
    const display=part.startsWith('\\[')||part.startsWith('$$');
    const inline=part.startsWith('\\(')||part.startsWith('$');
    if(!display&&!inline)return esc(part).replaceAll('\n','<br>');
    const latex=part.slice(display?2:part.startsWith('\\(')?2:1,display?-2:part.startsWith('\\(')?-2:-1);
    try{return window.katex?window.katex.renderToString(latex,{displayMode:display,throwOnError:false,trust:false,strict:'warn'}):esc(part);}catch{return esc(part);}
  }).join('');
  const shuffled = a => {const copy=[...a];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
  const sample = (a,n) => shuffled(a).slice(0,n);
  const modes = [['flash','▣','Flashcards'],['memory','▦','Memory'],['match','⇄','Match pairs'],['choice','◉','Multiple choice'],['bank','▤','Word bank'],['meteor','☄','Meteors']];
  let visibleSets=[],user=null,progress={},selected=localStorage.getItem('chem-arcade-selected')||'reactions',mode='flash',state={},raf=0,timer=0,meteor=null,editingId=null,activeCards=[],loadedSetId=null,loadSerial=0,listPage=0,termLimit=24,mathCaret=0;
  const allSets=()=>visibleSets;
  const set=()=>visibleSets.find(s=>s.id===selected)||visibleSets[0];
  const cards=()=>loadedSetId===selected?activeCards:[];
  const gamePanel=$('#game-panel');
  async function api(path,options={}){
    const res=await fetch(path,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
    if(!res.headers.get('content-type')?.includes('application/json'))throw Error('Your sign-in may have expired. Refresh the page.');
    const data=await res.json();if(!res.ok)throw Error(data.error||`Request failed (${res.status}).`);return data;
  }
  async function refresh(){
    const data=await api('/api/bootstrap');user=data.user;visibleSets=data.sets;progress=Object.fromEntries(data.progress.map(p=>[p.setId,p]));
    if(!visibleSets.some(s=>s.id===selected))selected=visibleSets[0]?.id;
    $('#user-pill').textContent=`${user.email} · ${user.role}`;
    $('#import-open').hidden=!['editor','admin'].includes(user.role);
    $('#admin-open').hidden=user.role!=='admin';
    if(selected)await selectSet(selected);else{renderMeta();gamePanel.innerHTML='<p>No sets are available.</p>';}
  }
  function renderMeta(){
    const sets=allSets(),current=set();
    $('#set-count').textContent=`/ ${sets.length}`;
    $('#total-count').textContent=`${sets.reduce((n,s)=>n+s.cardCount,0).toLocaleString()} cards across ${sets.length.toLocaleString()} sets`;
    if(!current)return;
    $('#selected-title').textContent=current.title;
    const p=progress[selected]||{right:0,wrong:0};
    $('#selected-meta').textContent=`${current.source} · ${current.visibility==='private'?'Private':'Shared'} · ${p.right} correct, ${p.wrong} missed`;
    $('#selected-count').textContent=`${current.cardCount} CARDS`;
    const canEdit=!current.builtin&&(user.role==='admin'||(user.role==='editor'&&current.owner===user.email));
    $('#edit-set').hidden=!canEdit;$('#delete-set').hidden=!canEdit;
    const q=$('#set-search').value.trim().toLocaleLowerCase();
    const filtered=sets.filter(s=>s.title.toLocaleLowerCase().includes(q));
    const pages=Math.max(1,Math.ceil(filtered.length/25));listPage=Math.min(listPage,pages-1);
    $('#set-grid').innerHTML=filtered.slice(listPage*25,(listPage+1)*25).map(s=>`<button class="set-card ${s.id===selected?'active':''}" data-set="${esc(s.id)}" aria-pressed="${s.id===selected}"><span class="set-card-top"><span class="set-icon">${s.builtin?'⌬':'＋'}</span><span class="tiny-count">${s.cardCount} cards</span></span><span><h3>${esc(s.title)}</h3><p>${esc(s.source)} · ${s.visibility==='private'?'Private':'Shared'}</p></span></button>`).join('')||'<p class="empty-list">No sets match your search.</p>';
    $('#sets-page').textContent=`${listPage+1} / ${pages}`;$('#sets-prev').disabled=listPage===0;$('#sets-next').disabled=listPage>=pages-1;
    $('#mode-nav').innerHTML=modes.map(([id,icon,label])=>`<button class="mode-button ${mode===id?'active':''}" data-mode="${id}" aria-pressed="${mode===id}"><span>${icon}</span>${label}</button>`).join('');
    $('#terms-count').textContent=loadedSetId===selected?`${activeCards.length} cards`:'Loading…';
    $('#terms-list').innerHTML=cards().slice(0,termLimit).map((c,i)=>`<div class="term-row"><span class="term-number">${i+1}</span><div class="term-text">${rich(c.term)}</div><div class="definition-text">${rich(c.definition)}</div></div>`).join('');
    $('#terms-more').hidden=termLimit>=cards().length;
  }
  function record(right,wrong){
    const setId=selected,p=progress[setId]||{right:0,wrong:0};progress[setId]=p;p.right+=right;p.wrong+=wrong;renderMeta();
    api('/api/progress',{method:'POST',body:JSON.stringify({setId,right,wrong})}).then(result=>{const current=progress[setId];progress[setId]={right:Math.max(current.right,result.right),wrong:Math.max(current.wrong,result.wrong)};if(selected===setId)renderMeta();}).catch(err=>{p.right=Math.max(0,p.right-right);p.wrong=Math.max(0,p.wrong-wrong);if(selected===setId){renderMeta();$('#selected-meta').textContent=`Progress could not save: ${err.message}`;}});
  }
  const cancelTasks=()=>{cancelAnimationFrame(raf);clearTimeout(timer);raf=0;timer=0;meteor=null;};
  async function selectSet(id){
    if(!allSets().some(s=>s.id===id))return;
    cancelTasks();selected=id;loadedSetId=null;activeCards=[];termLimit=24;
    localStorage.setItem('chem-arcade-selected',id);renderMeta();gamePanel.innerHTML='<p>Loading cards…</p>';
    const serial=++loadSerial;
    try{const detail=await api('/api/sets/'+encodeURIComponent(id));if(serial!==loadSerial)return;activeCards=detail.cards;loadedSetId=id;renderMeta();startMode();}
    catch(e){if(serial===loadSerial)gamePanel.innerHTML=`<div class="status-error">${esc(e.message)}</div>`;}
  }
  function selectMode(id){if(!modes.some(m=>m[0]===id))return;cancelTasks();mode=id;renderMeta();startMode();gamePanel.scrollIntoView({block:'nearest',behavior:'smooth'});}
  function header(title,desc,chips=''){return `<div class="game-header"><div><h3>${esc(title)}</h3><p>${esc(desc)}</p></div><div class="score-line">${chips}</div></div>`;}
  function chip(text){return `<span class="score-chip">${esc(text)}</span>`;}
  function complete(title,detail){gamePanel.innerHTML=header(title,'Round complete')+`<div class="completion"><div class="seal">✦</div><h3>${esc(title)}</h3><p>${esc(detail)}</p><button class="primary" data-action="restart">Play another round</button></div>`;}
  function startMode(){
    cancelTasks();
    const c=cards();
    if(loadedSetId!==selected){gamePanel.innerHTML='<p>Loading cards…</p>';return;}
    if(c.length<4){gamePanel.innerHTML=header('Add more cards','Games need at least four cards')+'<div class="completion">Import a larger set to play.</div>';return;}
    if(mode==='flash') startFlash(); else if(mode==='memory') startMemory(); else if(mode==='match') startMatch(); else if(mode==='choice') startQuiz('choice'); else if(mode==='bank') startQuiz('bank'); else startMeteor();
  }
  function startFlash(){state={deck:shuffled(cards()),index:0,flipped:false};renderFlash();}
  function renderFlash(){const {deck,index,flipped}=state,c=deck[index];gamePanel.innerHTML=header('Flashcards','Tap to flip. Learn the term, then check its definition.',chip(`${index+1} / ${deck.length}`))+`<div class="card-stage"><button class="flip-card" data-action="flip" aria-label="Flip flashcard"><span class="flip-label">${flipped?'DEFINITION':'TERM'}</span><span class="flip-content">${rich(flipped?c.definition:c.term)}</span><span class="flip-hint">TAP TO FLIP ↻</span></button><div class="controls"><button data-action="prev" ${index===0?'disabled':''}>← Previous</button><button data-action="flip">Flip card</button><button data-action="next" ${index===deck.length-1?'disabled':''}>Next →</button><button data-action="reshuffle">Shuffle</button></div><div class="progress-track"><div class="progress-fill" style="width:${((index+1)/deck.length)*100}%"></div></div></div>`;}
  function eligiblePairs(){const terms=new Set(cards().map(c=>c.term.trim().toLowerCase()));const counts=new Map();for(const c of cards()){const d=c.definition.trim().toLowerCase();counts.set(d,(counts.get(d)||0)+1);}return cards().filter(c=>c.term.trim().toLowerCase()!==c.definition.trim().toLowerCase()&&!terms.has(c.definition.trim().toLowerCase())&&counts.get(c.definition.trim().toLowerCase())===1);}
  function startMemory(){const pool=eligiblePairs();if(pool.length<4){gamePanel.innerHTML=header('Memory','This set needs four distinct term–definition pairs.')+'<div class="completion">Try another set or add more distinct definitions.</div>';return;}const pairs=sample(pool,Math.min(6,pool.length));state={tiles:shuffled(pairs.flatMap(c=>[{key:c.id,side:'term',text:c.term},{key:c.id,side:'definition',text:c.definition}])),open:[],matched:new Set(),moves:0,locked:false};renderMemory();}
  function renderMemory(){const s=state;gamePanel.innerHTML=header('Memory','Flip two tiles to find each term and definition.',chip(`${s.matched.size/2} / ${s.tiles.length/2} pairs`)+chip(`${s.moves} turns`))+`<div class="game-body"><div class="pair-grid">${s.tiles.map((t,i)=>{const shown=s.open.includes(i)||s.matched.has(i);return `<button class="tile ${shown?'':'hidden'} ${s.matched.has(i)?'done':''}" data-tile="${i}" ${s.matched.has(i)?'disabled':''} aria-label="${shown?esc(t.text):`Hidden tile ${i+1}`}">${shown?rich(t.text):'⌬'}</button>`}).join('')}</div><div class="controls"><button data-action="restart">New shuffle</button></div></div>`;}
  function clickMemory(i){const s=state;if(s.locked||s.open.includes(i)||s.matched.has(i)||!s.tiles[i])return;s.open.push(i);if(s.open.length===2){s.moves++;const [a,b]=s.open;const hit=s.tiles[a].key===s.tiles[b].key&&s.tiles[a].side!==s.tiles[b].side;if(hit){s.matched.add(a);s.matched.add(b);s.open=[];record(1,0);renderMemory();if(s.matched.size===s.tiles.length)timer=setTimeout(()=>complete('Memory cleared',`${s.tiles.length/2} pairs found in ${s.moves} turns.`),650);}else{s.locked=true;record(0,1);renderMemory();timer=setTimeout(()=>{s.open=[];s.locked=false;renderMemory();},1000);}}else renderMemory();}
  function startMatch(){const pool=eligiblePairs();if(pool.length<4){gamePanel.innerHTML=header('Match the pairs','This set needs four distinct term–definition pairs.')+'<div class="completion">Try another set or add more distinct definitions.</div>';return;}const chosen=sample(pool,Math.min(6,pool.length));state={left:shuffled(chosen),right:shuffled(chosen),picked:{},matched:new Set(),attempts:0,locked:false,wrong:''};renderMatch();}
  function renderMatch(){const s=state;const col=(arr,side)=>`<div class="match-column"><h4>${side==='term'?'TERMS':'DEFINITIONS'}</h4>${arr.map(c=>`<button class="match-button ${s.picked[side]===c.id?'selected':''} ${s.matched.has(c.id)?'matched':''} ${s.wrong===side+'-'+c.id?'wrong':''}" data-side="${side}" data-id="${c.id}" ${s.matched.has(c.id)?'disabled':''}>${rich(c[side])}</button>`).join('')}</div>`;gamePanel.innerHTML=header('Match the pairs','Choose a term on the left and its meaning on the right.',chip(`${s.matched.size} / ${s.left.length} pairs`)+chip(`${s.attempts} attempts`))+`<div class="game-body"><div class="match-columns">${col(s.left,'term')}${col(s.right,'definition')}</div><div class="controls"><button data-action="restart">New round</button></div></div>`;}
  function clickMatch(side,id){const s=state;if(s.locked||s.matched.has(id))return;s.picked[side]=id;s.wrong='';renderMatch();if(s.picked.term&&s.picked.definition){s.attempts++;if(s.picked.term===s.picked.definition){s.matched.add(id);s.picked={};record(1,0);renderMatch();if(s.matched.size===s.left.length)timer=setTimeout(()=>complete('All pairs matched',`${s.left.length} matches in ${s.attempts} attempts.`),650);}else{s.wrong=`${side}-${id}`;s.locked=true;record(0,1);renderMatch();timer=setTimeout(()=>{s.picked={};s.wrong='';s.locked=false;renderMatch();},650);}}}
  function quizQuestion(){const s=state,c=s.deck[s.index];if(!c)return;const distract=sample(cards().filter(x=>x.id!==c.id&&x.term!==c.term&&x.definition!==c.definition),s.type==='bank'?Math.min(7,cards().length-1):3);s.options=shuffled([c,...distract]);s.answered=false;s.chosen=null;}
  function startQuiz(type){state={type,deck:shuffled(cards()),index:0,right:0,options:[],answered:false,chosen:null};quizQuestion();renderQuiz();}
  function renderQuiz(){const s=state,c=s.deck[s.index];if(!c){complete('Round complete',`${s.right} / ${s.deck.length} correct. Try another round to practice again.`);return;}const isBank=s.type==='bank';const prompt=`${rich(c.definition)}<br><span class="blank">${s.answered?rich(c.term):'__________'}</span>`;const options=s.options.map(x=>`<button class="${isBank?'word-choice':'answer'} ${s.answered?(x.id===c.id?'correct':x.id===s.chosen?'wrong':''):''}" data-answer="${x.id}" ${s.answered?'disabled':''}>${rich(x.term)}</button>`).join('');const fb=s.answered?`<p class="feedback ${s.chosen===c.id?'good':'bad'}">${s.chosen===c.id?'Correct!':`Answer: ${rich(c.term)}`}</p><div class="controls"><button class="primary" data-action="advance">${s.index===s.deck.length-1?'See results':'Next question →'}</button></div>`:'<p class="prompt-note">Choose the term that completes the definition.</p>';gamePanel.innerHTML=header(isBank?'Word bank':'Multiple choice',isBank?'Complete each blank using a term from the bank.':'Select one of four terms to fill the blank.',chip(`${s.index+1} / ${s.deck.length}`)+chip(`${s.right} correct`))+`<div class="question">${prompt}</div><div class="${isBank?'word-bank':'answers'}">${options}</div>${fb}<div class="progress-track"><div class="progress-fill" style="width:${s.index/s.deck.length*100}%"></div></div>`;}
  function answerQuiz(id){const s=state;if(s.answered)return;const c=s.deck[s.index];s.answered=true;s.chosen=id;if(id===c.id){s.right++;record(1,0);}else record(0,1);renderQuiz();}
  const speeds={slow:14000,normal:10000,fast:7000};
  function startMeteor(){state={deck:shuffled(cards()),index:0,right:0,lives:3,speed:'normal',paused:false,elapsed:0,last:0,locked:false,options:[]};newMeteor();renderMeteor();raf=requestAnimationFrame(tick);}
  function newMeteor(){const s=state;if(s.index>=s.deck.length||s.lives<=0){meteor=null;return;}const c=s.deck[s.index];const unique=[...new Map(cards().filter(x=>x.id!==c.id&&x.definition!==c.definition).map(x=>[x.definition,x])).values()];s.options=shuffled([c,...sample(unique,3)]);s.elapsed=0;s.last=0;meteor=c;}
  function renderMeteor(){const s=state;if(!meteor){complete('Meteor run finished',`${s.right} correct · ${s.lives} lives left · ${s.index} meteors faced.`);return;}const opts=s.options.map((c,i)=>`<button class="meteor-answer" data-shot="${c.id}" ${s.paused||s.locked?'disabled':''}><b>${i+1}</b>${rich(c.definition)}</button>`).join('');gamePanel.innerHTML=header('Meteor Defense','The incoming meteor shows a term. Shoot its definition before impact.',chip(`${s.right} hits`)+chip(`${s.index+1} / ${s.deck.length}`))+`<div class="meteor-controls"><div class="lives" aria-label="${s.lives} lives">${'♥'.repeat(s.lives)}${'♡'.repeat(3-s.lives)}</div><div><label for="meteor-speed">Speed </label><select id="meteor-speed"><option value="slow" ${s.speed==='slow'?'selected':''}>Slow</option><option value="normal" ${s.speed==='normal'?'selected':''}>Normal</option><option value="fast" ${s.speed==='fast'?'selected':''}>Fast</option></select> <button class="secondary" data-action="pause">${s.paused?'Resume':'Pause'}</button></div></div><div class="meteor-sky"><div class="meteor" id="meteor-object">${rich(meteor.term)}</div><div class="ground"></div></div><div class="meteor-answers">${opts}</div><p class="prompt-note">Tap a definition or press 1–4 to fire. Wrong answers cost one life.</p>`;positionMeteor();}
  function positionMeteor(){const obj=$('#meteor-object'),sky=$('.meteor-sky');if(!obj||!sky)return;const max=sky.clientHeight-obj.offsetHeight-16;obj.style.setProperty('--y',`${Math.max(0,Math.min(max,max*state.elapsed/speeds[state.speed]))}px`);}
  function tick(now){const s=state;if(mode!=='meteor'||!meteor)return;if(!s.paused&&!s.locked){if(s.last)s.elapsed+=Math.min(now-s.last,100);s.last=now;positionMeteor();if(s.elapsed>=speeds[s.speed]){s.lives--;record(0,1);s.index++;newMeteor();renderMeteor();}}else s.last=0;raf=requestAnimationFrame(tick);}
  function shoot(id){const s=state;if(s.paused||s.locked||!meteor)return;const hit=id===meteor.id;if(hit){s.right++;record(1,0);s.locked=true;const obj=$('#meteor-object');if(obj)obj.classList.add('explode');const btn=$(`[data-shot="${id}"]`);if(btn)btn.classList.add('correct');timer=setTimeout(()=>{s.index++;s.locked=false;newMeteor();renderMeteor();},280);}else{s.lives--;record(0,1);const btn=$(`[data-shot="${id}"]`);if(btn)btn.classList.add('wrong');if(s.lives<=0){s.locked=true;timer=setTimeout(()=>{meteor=null;renderMeteor();},450);}else {s.locked=true;timer=setTimeout(()=>{s.locked=false;renderMeteor();},450);}}}
  $('#set-search').addEventListener('input',()=>{listPage=0;renderMeta();});
  $('#sets-prev').onclick=()=>{listPage=Math.max(0,listPage-1);renderMeta();};
  $('#sets-next').onclick=()=>{listPage++;renderMeta();};
  $('#terms-more').onclick=()=>{termLimit+=24;renderMeta();};
  $('#set-grid').addEventListener('click',e=>{const b=e.target.closest('[data-set]');if(b)selectSet(b.dataset.set);});
  $('#mode-nav').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)selectMode(b.dataset.mode);});
  gamePanel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tile!==undefined&&mode==='memory')return clickMemory(Number(b.dataset.tile));
    if(b.dataset.side&&mode==='match')return clickMatch(b.dataset.side,Number(b.dataset.id));
    if(b.dataset.answer&&['choice','bank'].includes(mode))return answerQuiz(Number(b.dataset.answer));
    if(b.dataset.shot&&mode==='meteor')return shoot(Number(b.dataset.shot));
    switch(b.dataset.action){case 'flip':state.flipped=!state.flipped;renderFlash();break;case 'prev':state.index--;state.flipped=false;renderFlash();break;case 'next':state.index++;state.flipped=false;renderFlash();break;case 'reshuffle':startFlash();break;case 'restart':startMode();break;case 'advance':state.index++;quizQuestion();renderQuiz();break;case 'pause':state.paused=!state.paused;state.last=0;renderMeteor();break;}
  });
  gamePanel.addEventListener('change',e=>{if(e.target.id==='meteor-speed')state.speed=e.target.value;});
  document.addEventListener('keydown',e=>{if(mode!=='meteor'||!meteor||document.querySelector('dialog[open]')||!['1','2','3','4'].includes(e.key))return;const c=state.options[Number(e.key)-1];if(c)shoot(c.id);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='meteor'&&meteor&&!state.paused){state.paused=true;state.last=0;renderMeteor();}});
  document.addEventListener('app-tab-change',e=>{if(e.detail.tab==='viewer'&&mode==='meteor'&&meteor&&!state.paused){state.paused=true;state.last=0;renderMeteor();}});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-close]');if(b)document.getElementById(b.dataset.close)?.close();});
  function openImport(edit=false){
    editingId=edit?selected:null;$('#import-error').textContent='';
    $('#import-title').textContent=edit?'Edit flashcard set':'Import a flashcard set';$('#import-save').textContent=edit?'Save changes':'Save set';
    $('#import-name').value=edit?set().title:'';$('#import-visibility').value=edit?set().visibility:'private';$('#import-delimiter').value='tab';
    const quote=x=>/[\t\r\n"]/.test(x)?`"${x.replaceAll('"','""')}"`:x;
    $('#import-data').value=edit?cards().map(c=>`${quote(c.term)}\t${quote(c.definition)}`).join('\n'):'';
    $('#import-file').value='';$('#import-dialog').showModal();
  }
  $('#math-open').onclick=()=>{const area=$('#import-data');mathCaret=area.selectionStart||0;$('#math-dialog').showModal();$('#math-field').focus();};
  $('#math-insert').onclick=()=>{const field=$('#math-field'),latex=field.value?.trim();if(!latex)return;const area=$('#import-data');area.focus();area.setSelectionRange(mathCaret,mathCaret);area.setRangeText(`\\(${latex}\\)`,'end');field.value='';$('#math-dialog').close();};
  $('#import-open').onclick=()=>openImport(false);
  $('#edit-set').onclick=()=>openImport(true);
  $('#delete-set').onclick=async()=>{if(!confirm(`Delete “${set().title}” and its cards? This also removes study progress for that set.`))return;try{await api('/api/sets/'+encodeURIComponent(selected),{method:'DELETE'});await refresh();}catch(e){alert(e.message);}};
  $('#import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1_000_000){$('#import-error').textContent='Choose a file under 1 MB.';return;}$('#import-data').value=await file.text();if(file.name.toLowerCase().endsWith('.csv'))$('#import-delimiter').value='comma';});
  $('#import-save').onclick=async()=>{
    const button=$('#import-save');button.disabled=true;$('#import-error').textContent='';
    const delimiter={tab:'\t',comma:',',semicolon:';'}[$('#import-delimiter').value];
    try{const path=editingId?'/api/sets/'+encodeURIComponent(editingId):'/api/sets';const result=await api(path,{method:editingId?'PUT':'POST',body:JSON.stringify({title:$('#import-name').value,visibility:$('#import-visibility').value,delimiter,text:$('#import-data').value})});$('#import-dialog').close();if(result.id)selected=result.id;await refresh();}
    catch(e){$('#import-error').textContent=e.message;}finally{button.disabled=false;}
  };
  $('#export-open').onclick=()=>{$('#export-error').textContent='';$('#export-dialog').showModal();};
  $('#export-save').onclick=async()=>{try{const data=await api('/api/export');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='studycade-sets-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);$('#export-dialog').close();}catch(e){$('#export-error').textContent=e.message;}};
  async function loadUsers(){const [data,audit]=await Promise.all([api('/api/admin/users'),api('/api/admin/audit')]);$('#admin-list').innerHTML=data.users.map(u=>`<div class="admin-row"><span><b>${esc(u.email)}</b><small>${esc(u.role)} · ${u.active?'Approved':'Disabled'}</small></span><button data-email="${esc(u.email)}" data-role="${esc(u.role)}" data-active="${u.active?'true':'false'}">Edit</button></div>`).join('');$('#admin-audit').innerHTML=audit.events.slice(0,20).map(e=>`<div class="admin-row"><span><b>${esc(e.target)}</b><small>${esc(e.action)} by ${esc(e.actor)} · ${esc(e.createdAt)}</small></span></div>`).join('')||'<p>No account changes recorded yet.</p>';}
  $('#admin-open').onclick=async()=>{$('#admin-error').textContent='';$('#admin-dialog').showModal();try{await loadUsers();}catch(e){$('#admin-error').textContent=e.message;}};
  $('#admin-list').addEventListener('click',e=>{const b=e.target.closest('[data-email]');if(!b)return;$('#admin-email').value=b.dataset.email;$('#admin-role').value=b.dataset.role;$('#admin-active').value=b.dataset.active;});
  $('#admin-save').onclick=async()=>{const button=$('#admin-save');button.disabled=true;$('#admin-error').textContent='';try{await api('/api/admin/users',{method:'POST',body:JSON.stringify({email:$('#admin-email').value,role:$('#admin-role').value,active:$('#admin-active').value==='true'})});await loadUsers();$('#admin-email').value='';}catch(e){$('#admin-error').textContent=e.message;}finally{button.disabled=false;}};
  refresh().catch(e=>{gamePanel.innerHTML=`<div class="status-error">${esc(e.message)} Refresh the page after signing in or ask the administrator to approve your account.</div>`;});
})();
