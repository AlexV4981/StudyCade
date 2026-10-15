(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const prompt = `Create a study recap from the material I provide. Return only the complete Markdown file, ready to save as .md. Use the facts in my source; do not invent course requirements or answers. Keep all subjects in their original notation.

Format for Better MD Viewer:
- Start with one # Title and a short purpose paragraph.
- Use ## Section heading for every topic. Each ## heading becomes a reviewable section in the outline.
- Use ordinary Markdown paragraphs, numbered or bulleted lists, and tables. Use **bold** for important terms.
- Put each retrieval question in a callout: > [!RECALL] followed by > Your question. Put its answer in a separate > [!ANSWER] callout after the question so it can be hidden until opened.
- Use > [!RULE], > [!EXAMPLE], or > [!MISTAKE] for short teaching notes when helpful.
- For math and chemistry, use \\(inline math\\) or \\[display math\\]. Within math, use \\ce{H2O -> H2 + O2} for chemical notation. Keep expressions valid KaTeX / mhchem. Unicode subscripts also work.
- Use fenced code blocks for literal code. Avoid raw HTML, embedded scripts, external images, and custom plugins.
- Finish with a cumulative retrieval section and its answers in [!ANSWER] callouts.

Source material follows:\n[PASTE NOTES OR ATTACH SOURCE HERE]`;
  $('viewer-prompt').textContent=prompt;
  let currentKey='', sections=[],savedFiles=[],currentAccount='';
  async function api(route,options={}) {const res=await fetch(route,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});const data=await res.json();if(!res.ok)throw Error(data.error||`Request failed (${res.status}).`);return data;}
  async function loadSaved(){const data=await api('/api/study-files');currentAccount=data.account;savedFiles=data.files;
    $('viewer-saved-list').innerHTML=savedFiles.length?savedFiles.map((f,i)=>`<div class="saved-file"><span><strong>${escapeHtml(f.name)}</strong><small>${escapeHtml(f.folder)} · ${Math.ceil(f.size/1024)} KB</small></span><span><button class="quiet" type="button" data-open-file="${i}">Open</button> <button class="quiet danger" type="button" data-delete-file="${i}">Delete</button></span></div>`).join(''):'<p>No saved files yet. Enter a folder name and upload your first Markdown file.</p>';}
  function showDocument(name,source,folder){let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619)>>>0;currentKey='better-md-review:'+currentAccount+':'+folder+':'+name+':'+hash;
    $('viewer-file-name').textContent=folder+' / '+name;$('viewer-content').innerHTML=render(source);updateOutline();$('viewer-home').hidden=true;$('viewer-document').hidden=false;$('viewer-search').value='';}
  const safeLink = url => {try {const parsed=new URL(url,location.href);return ['http:','https:','mailto:'].includes(parsed.protocol)?escapeHtml(parsed.href):null;}catch{return null;}};
  function inline(source) {
    const tokens=/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|`[^`\n]+`|\[([^\]]+)\]\(([^)\s]+)\))/g;
    const plain = s => escapeHtml(s).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/__([^_\n]+)__/g,'<strong>$1</strong>').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>').replace(/(?<!_)_([^_\n]+)_(?!_)/g,'<em>$1</em>').replace(/~~([^~\n]+)~~/g,'<del>$1</del>').replace(/~([^~\n]+)~/g,'<sub>$1</sub>').replace(/\^([^\^\n]+)\^/g,'<sup>$1</sup>');
    let result='', last=0;
    for(const m of source.matchAll(tokens)) {
      result+=plain(source.slice(last,m.index));const token=m[0];last=m.index+token.length;
      if(token[0]==='`')result+='<code>'+escapeHtml(token.slice(1,-1))+'</code>';
      else if(m[2]){const href=safeLink(m[2]);result+=href?`<a href="${href}" target="_blank" rel="noopener noreferrer">${plain(m[1])}</a>`:escapeHtml(token);}
      else {const display=token.startsWith('\\[')||token.startsWith('$$');const latex=token.slice(token.startsWith('\\')||token.startsWith('$$')?2:1,display||token.startsWith('\\(')?-2:-1);
        try {result+=window.katex?window.katex.renderToString(latex,{displayMode:display,throwOnError:false,trust:false,strict:'ignore'}):escapeHtml(token);}catch{result+=escapeHtml(token);}
      }
    }
    return result+plain(source.slice(last));
  }
  const cells = line => line.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(x=>x.trim().replace(/\\\|/g,'|'));
  function render(markdown) {
    let source=markdown.replace(/\r\n?/g,'\n');
    if(source.startsWith('---\n')){const end=source.indexOf('\n---\n',4);if(end>=0)source=source.slice(end+5);}
    const lines=source.split('\n'),out=[];sections=[];
    let i=0, sectionIndex=0;
    const special = line => /^\s*$/.test(line)||/^\s*(#{1,6}\s|```|~~~|>|[-*+]\s|\d+[.)]\s|---\s*$)/.test(line)||(/^\s*\|/.test(line));
    while(i<lines.length){const line=lines[i];if(!line.trim()){i++;continue;}
      const fence=line.match(/^\s*(```+|~~~+)(.*)$/);
      if(fence){const marker=fence[1];const code=[];i++;while(i<lines.length&&!lines[i].trimStart().startsWith(marker)){code.push(lines[i++]);}if(i<lines.length)i++;out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);continue;}
      const heading=line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
      if(heading){const depth=heading[1].length, id='md-section-'+sectionIndex++,title=heading[2].trim();if(depth===2 || (depth===1 && !sections.length))sections.push({id,title});out.push(`<h${depth} id="${id}">${inline(title)}</h${depth}>`);i++;continue;}
      if(/^\s*---\s*$/.test(line)){out.push('<hr>');i++;continue;}
      if(/^\s*\|/.test(line)&&i+1<lines.length&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])){
        const head=cells(line),body=[];i+=2;while(i<lines.length&&/^\s*\|/.test(lines[i]))body.push(cells(lines[i++]));out.push('<div class="md-table-wrap"><table><thead><tr>'+head.map(x=>`<th>${inline(x)}</th>`).join('')+'</tr></thead><tbody>'+body.map(row=>'<tr>'+head.map((_,j)=>`<td>${inline(row[j]||'')}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>');continue;}
      if(/^\s*>/.test(line)){
        const group=[];while(i<lines.length&&/^\s*>/.test(lines[i])){const next=lines[i].replace(/^\s*>\s?/,'');if(group.length&&/^\[![A-Z]+\]/i.test(next))break;group.push(next);i++;}
        const match=group[0]?.match(/^\[!([A-Z]+)\]\s*(.*)$/i);
        if(match){const kind=match[1].toUpperCase(),caption=match[2]||kind;const body=group.slice(1).filter(Boolean).map(x=>inline(x)).join('<br>');out.push(kind==='ANSWER'?`<details class="md-callout md-answer"><summary>${escapeHtml(caption==='ANSWER'?'Reveal answer':caption)}</summary><p>${body}</p></details>`:`<aside class="md-callout md-${kind.toLowerCase()}"><strong>${escapeHtml(caption)}</strong><p>${body}</p></aside>`);}
        else out.push(`<blockquote>${group.map(x=>inline(x)).join('<br>')}</blockquote>`);continue;}
      const list=line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if(list){const ordered=/\d/.test(list[2]),items=[];while(i<lines.length){const m=lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);if(!m||/\d/.test(m[2])!==ordered)break;items.push(`<li>${inline(m[3])}</li>`);i++;}out.push(`<${ordered?'ol':'ul'}>${items.join('')}</${ordered?'ol':'ul'}>`);continue;}
      const paragraph=[line];i++;while(i<lines.length&&!special(lines[i]))paragraph.push(lines[i++]);out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }
    return out.join('\n');
  }
  function storage(){try{const data=JSON.parse(localStorage.getItem(currentKey)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}}
  function save(data){try{localStorage.setItem(currentKey,JSON.stringify(data));}catch{$('viewer-error').textContent='Browser storage is full or unavailable; review choices will not persist.';}}
  function updateOutline(){const saved=storage();$('viewer-outline-list').innerHTML=sections.map((s,n)=>{const v=saved[n]||{},confidence=['green','yellow','red'].includes(v.confidence)?v.confidence:'';return `<div class="outline-row"><a href="#${s.id}">${escapeHtml(s.title)}</a><button type="button" data-review="${n}" aria-pressed="${!!v.reviewed}">${v.reviewed?'✓ Reviewed':'Mark reviewed'}</button><button type="button" data-confidence="${n}" class="confidence ${confidence}" aria-label="Confidence for ${escapeHtml(s.title)}: ${confidence||'not set'}. Click to cycle Green, Yellow, Red.">${confidence||'Confidence —'}</button></div>`;}).join('');$('viewer-progress').textContent=`Sections reviewed: ${sections.filter((_,i)=>saved[i]?.reviewed).length} / ${sections.length}`;}
  function showTab(name){const viewer=name==='viewer';$('sets-view').hidden=viewer;$('viewer-view').hidden=!viewer;document.querySelectorAll('[data-app-tab]').forEach(b=>{const active=b.dataset.appTab===name;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});location.hash=viewer?'viewer':'home';document.dispatchEvent(new CustomEvent('app-tab-change',{detail:{tab:name}}));if(viewer)loadSaved().catch(e=>$('viewer-error').textContent=e.message);}
  document.querySelectorAll('[data-app-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.appTab)));
  $('viewer-open-home').onclick=()=>{if(!$('viewer-folder').value.trim()){$('viewer-error').textContent='Name the folder before choosing a file.';$('viewer-folder').focus();return;}$('viewer-error').textContent='';$('viewer-file').click();};
  $('viewer-open').onclick=()=>{$('viewer-document').hidden=true;$('viewer-home').hidden=false;$('viewer-open-home').click();};
  $('viewer-back').onclick=()=>{$('viewer-document').hidden=true;$('viewer-home').hidden=false;loadSaved().catch(e=>$('viewer-error').textContent=e.message);};
  $('viewer-print').onclick=()=>window.print();
  $('viewer-copy-prompt').onclick=async()=>{try{await navigator.clipboard.writeText(prompt);$('viewer-copy-prompt').textContent='Copied';setTimeout(()=>$('viewer-copy-prompt').textContent='Copy prompt',1800);}catch{$('viewer-error').textContent='Copy failed. Select and copy the prompt text instead.';}};
  $('viewer-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;$('viewer-error').textContent='';const folder=$('viewer-folder').value.trim();if(!folder){$('viewer-error').textContent='Name the folder before choosing a file.';return;}if(file.size>2_000_000){$('viewer-error').textContent='Choose a Markdown file under 2 MB.';return;}if(!/\.(md|markdown|txt)$/i.test(file.name)){$('viewer-error').textContent='Choose a .md, .markdown, or .txt file.';return;}
    try{const source=await file.text();$('viewer-save-status').textContent='Uploading…';const saved=await api('/api/study-files',{method:'POST',body:JSON.stringify({folder,name:file.name,content:source})});$('viewer-save-status').textContent=`Saved to ${saved.folder} / ${saved.name}`;await loadSaved();showDocument(saved.name,source,saved.folder);$('viewer-file').value='';}catch(err){$('viewer-save-status').textContent='';$('viewer-error').textContent=err.message||'This file could not be saved.';}};
  $('viewer-saved-list').onclick=async e=>{const open=e.target.closest('[data-open-file]'),remove=e.target.closest('[data-delete-file]');if(!open&&!remove)return;const f=savedFiles[Number((open||remove).dataset.openFile??(open||remove).dataset.deleteFile)];if(!f)return;const url='/api/study-files/'+encodeURIComponent(f.folder)+'/'+encodeURIComponent(f.name);$('viewer-error').textContent='';
    try{if(open){const data=await api(url);showDocument(data.name,data.content,data.folder);}else if(confirm(`Delete “${f.name}” from “${f.folder}”?`)){await api(url,{method:'DELETE'});await loadSaved();}}catch(err){$('viewer-error').textContent=err.message;}};
  $('viewer-outline-list').onclick=e=>{const review=e.target.closest('[data-review]'),confidence=e.target.closest('[data-confidence]');if(!review&&!confidence)return;const n=Number((review||confidence).dataset.review??(review||confidence).dataset.confidence),saved=storage();saved[n]??={};if(review)saved[n].reviewed=!saved[n].reviewed;else {const order=['green','yellow','red'];saved[n].confidence=order[(order.indexOf(saved[n].confidence)+1)%order.length];}save(saved);updateOutline();};
  $('viewer-search').oninput=e=>{const q=e.target.value.trim().toLocaleLowerCase();$('viewer-content').querySelectorAll('p, li, h1, h2, h3, h4, td, th, blockquote, .md-callout').forEach(node=>node.classList.toggle('md-search-hit',!!q&&node.textContent.toLocaleLowerCase().includes(q)));};
  $('viewer-view').addEventListener('dragover',e=>{e.preventDefault();});$('viewer-view').addEventListener('drop',e=>{e.preventDefault();const file=e.dataTransfer?.files?.[0];if(file){const transfer=new DataTransfer();transfer.items.add(file);$('viewer-file').files=transfer.files;$('viewer-file').dispatchEvent(new Event('change'));}});
  if(location.hash==='#viewer')showTab('viewer');
})();
