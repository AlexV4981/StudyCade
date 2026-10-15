'use strict';
function parseDelimited(input,delimiter){
  if(!['\t',',',';'].includes(delimiter))throw new Error('Choose tab, comma, or semicolon as the separator.');
  if(typeof input!=='string'||!input.trim()||Buffer.byteLength(input,'utf8')>1_000_000)throw new Error('Paste a text export under 1 MB.');
  const rows=[];let fields=[],field='',quoted=false;
  const str=input.replace(/^\uFEFF/,'');
  for(let i=0;i<str.length;i++){
    const ch=str[i];
    if(quoted){if(ch==='"'&&str[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}
    else if(ch==='"'&&field==='')quoted=true;
    else if(ch===delimiter){fields.push(field);field='';}
    else if(ch==='\n'||ch==='\r') {if(ch==='\r'&&str[i+1]==='\n')i++;fields.push(field);field='';if(fields.some(f=>f.trim()))rows.push(fields);fields=[];}
    else field+=ch;
  }
  if(quoted)throw new Error('A quoted CSV field was not closed.');
  fields.push(field);if(fields.some(f=>f.trim()))rows.push(fields);
  if(rows[0]?.length===2&&/^(term|front|question)$/i.test(rows[0][0].trim())&&/^(definition|back|answer)$/i.test(rows[0][1].trim()))rows.shift();
  if(rows.length<4||rows.length>2000)throw new Error('A set needs 4–2,000 cards.');
  const cards=rows.map((row,i)=>{
    if(row.length!==2||!row[0].trim()||!row[1].trim())throw new Error(`Row ${i+1} needs exactly a term and definition.`);
    const term=row[0].trim(),definition=row[1].trim();
    if(term.length>500||definition.length>2000)throw new Error(`Row ${i+1} is too long.`);
    return {term,definition};
  });
  if(new Set(cards.map(c=>c.term.toLocaleLowerCase())).size!==cards.length)throw new Error('Each term must be unique within a set.');
  return cards;
}
module.exports={parseDelimited};
