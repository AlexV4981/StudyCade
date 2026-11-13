#!/usr/bin/env node
// Deterministic, network-free educational illustrations. No stock photos are scraped.
// Run: node scripts/generate-chemistry-assets.mjs [--check]
// CC0-1.0: https://creativecommons.org/publicdomain/zero/1.0/
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ELEMENTS, CHEMISTRY_ELEMENT_ASSETS, CHEMISTRY_TOPICS } from '../frontend/src/chemistry-library.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'frontend/public/assets/chemistry');
const checkOnly = process.argv.includes('--check');
const C = { bg:'#0c1729', ink:'#eef7fc', muted:'#b5cadd', panel:'#152941', line:'#45647e', teal:'#66e3cf',
  gold:'#ffcc75', red:'#fb8792', blue:'#7fbeff', violet:'#bbabff', green:'#a9e79f', white:'#f2f7ff' };
const esc = (x) => String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const T = (x,y,value,size=25,color=C.ink,anchor='middle',weight=500) => '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-family="Arial,DejaVu Sans,sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'">'+esc(value)+'</text>';
const R = (x,y,w,h,fill=C.panel,stroke=C.line,rx=16) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
const O = (x,y,r,color=C.teal,stroke='none',width=2) => '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+color+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
const L = (x,y,x2,y2,color=C.teal,width=4,dash='') => '<path d="M'+x+' '+y+' L'+x2+' '+y2+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
const A = (x,y,x2,y2,color=C.teal,width=4) => L(x,y,x2,y2,color,width)+
  '<path d="M'+x2+' '+y2+' l'+(-12*Math.cos(Math.atan2(y2-y,x2-x)-0.55)).toFixed(1)+' '+(-12*Math.sin(Math.atan2(y2-y,x2-x)-0.55)).toFixed(1)+' M'+x2+' '+y2+' l'+(-12*Math.cos(Math.atan2(y2-y,x2-x)+0.55)).toFixed(1)+' '+(-12*Math.sin(Math.atan2(y2-y,x2-x)+0.55)).toFixed(1)+'" stroke="'+color+'" stroke-width="'+width+'" fill="none" stroke-linecap="round"/>';
const P = (points,color=C.teal,width=5,dash='') => '<polyline points="'+points.map(v=>v.join(',')).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
const atom = (x,y,label,r=23,color=C.blue) => O(x,y,r,color)+T(x,y+7,label,20,C.bg,'middle',700);
const box = (x,y,w,h,heading,body,accent=C.teal) => R(x,y,w,h)+T(x+w/2,y+49,heading,23,accent,'middle',700)+T(x+w/2,y+112,body,23);
function frame(title,description,scene, footer='Schematic illustration • not to scale') {
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 640" role="img" aria-labelledby="title desc">'+
 '<title id="title">'+esc(title)+'</title><desc id="desc">'+esc(description)+'</desc>'+
 '<rect width="1024" height="640" fill="'+C.bg+'"/>'+
 '<rect x="24" y="22" width="976" height="596" rx="28" fill="none" stroke="'+C.line+'" stroke-width="2"/>'+
 T(55,79,title,42,C.ink,'start',700)+T(56,118,description,17,C.muted,'start')+
 scene+L(55,564,969,564,C.line,1)+T(56,590,footer,16,C.muted,'start')+
 T(970,591,'StudyCade • CC0',15,C.teal,'end')+'</svg>\n';
}
function row3(items,colors=[C.teal,C.blue,C.gold]) {
 const xs=[64,383,702];
 return items.map((item,i)=>box(xs[i],206,260,220,item[0],item[1],colors[i])).join('')+
  A(330,316,370,316)+A(648,316,688,316);
}
function axes(x,y,w,h,xLabel,yLabel) {
 return L(x,y,x,y-h,C.muted,3)+L(x,y,x+w,y,C.muted,3)+
 T(x+w/2,y+43,xLabel,18,C.muted)+T(x-18,y-h-10,yLabel,18,C.muted,'start');
}
function plot(x,y,points,color=C.teal) {
 return P(points.map(([u,v])=>[x+u,y-v]),color,5);
}
function molecular(x,y,kind) {
 if(kind==='H2')return atom(x-26,y,'H',20,C.white)+atom(x+26,y,'H',20,C.white)+L(x-6,y,x+6,y,C.muted,5);
 if(kind==='O2')return atom(x-27,y,'O',23,C.red)+atom(x+27,y,'O',23,C.red)+L(x-7,y-6,x+7,y-6,C.muted,3)+L(x-7,y+6,x+7,y+6,C.muted,3);
 if(kind==='H2O')return atom(x,y,'O',25,C.red)+atom(x-48,y+33,'H',18,C.white)+atom(x+48,y+33,'H',18,C.white)+L(x-20,y+15,x-34,y+25,C.muted,4)+L(x+20,y+15,x+34,y+25,C.muted,4);
 return '';
}
function scene(id) {
 let s='';
 switch(id) {
 case 'periodic-trends':
   s=R(100,177,824,342)+T(512,245,'Across a period →',28,C.teal)+A(250,310,780,310,C.teal,9)+
   T(515,289,'Electronegativity / ionization energy generally ↑',19,C.ink)+A(245,455,245,351,C.gold,8)+
   T(275,415,'Up a group',19,C.gold,'start')+T(513,492,'Atomic radius generally increases down and left.',20,C.muted);
   break;
 case 'isotope-notation':
   s=R(90,172,842,335)+T(330,360,'¹⁴₆C',115,C.teal)+
   T(645,251,'Atomic number Z = 6',27)+T(645,309,'Mass number A = 14',27)+
   T(645,375,'Neutrons = 14 − 6 = 8',25,C.gold)+T(640,441,'Neutral carbon: 6 electrons',21,C.muted);
   break;
 case 'atomic-structure':
   s=R(102,177,817,354)+
   '<ellipse cx="404" cy="350" rx="216" ry="112" fill="none" stroke="'+C.blue+'" stroke-dasharray="7 12" stroke-width="3"/>'+
   '<ellipse cx="404" cy="350" rx="110" ry="193" fill="none" stroke="'+C.blue+'" stroke-dasharray="7 12" stroke-width="3"/>'+
   O(398,347,58,C.gold)+T(398,352,'p⁺   n⁰',24,C.bg)+O(205,315,11,C.teal)+O(598,365,11,C.teal)+O(358,164,11,C.teal)+
   T(700,300,'Nucleus',28,C.gold)+L(500,317,610,302,C.gold,3)+T(713,389,'Electron cloud',23,C.blue)+
   T(713,433,'Not a literal orbit',18,C.muted);
   break;
 case 'electron-shells':
   s=R(102,155,817,388)+O(413,350,34,C.gold)+T(413,357,'Na⁺?',18,C.bg)+
   [68,124,182].map(r=>'<circle cx="413" cy="350" r="'+r+'" fill="none" stroke="'+C.line+'" stroke-width="3"/>').join('')+
   [[68,2],[124,8],[182,1]].map(([r,n])=>Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;return O((413+r*Math.cos(a)).toFixed(1),(350+r*Math.sin(a)).toFixed(1),8,C.teal)}).join('')).join('')+
   T(743,268,'Na atom (neutral)',28,C.teal)+T(742,331,'11 electrons',25)+T(742,397,'Shells: 2 • 8 • 1',24,C.gold)+
   T(741,448,'Shell model only',18,C.muted);
   // Neutral atom: the nucleus is labeled Na instead of a sodium ion.
   s=s.replace('Na⁺?','Na');
   break;
 case 'orbital-shapes':
   s=R(80,175,864,360)+O(300,356,102,'#345680')+
   '<ellipse cx="300" cy="350" rx="85" ry="85" fill="#507f9f" opacity="0.6"/>'+
   T(299,494,'s orbital: spherical',24,C.teal)+
   '<ellipse cx="687" cy="285" rx="70" ry="110" fill="'+C.violet+'" opacity="0.72"/>'+
   '<ellipse cx="687" cy="433" rx="70" ry="110" fill="'+C.violet+'" opacity="0.72"/>'+
   O(687,359,9,C.gold)+T(688,507,'p orbital: two lobes',24,C.violet);
   break;
 case 'orbital-filling':
   s=R(80,175,864,348)+T(512,236,'Carbon: 1s² 2s² 2p²',31,C.teal)+
   [['1s',210,1],['2s',415,1],['2p',627,3]].map(([name,x,n])=>T(x+54,294,name,24,C.muted)+
    Array.from({length:n},(_,i)=>R(x+i*74,333,66,67,'none',C.line,5)).join('')).join('')+
   T(264,380,'↑↓',38,C.gold)+T(468,380,'↑↓',38,C.gold)+T(660,380,'↑',38,C.teal)+T(734,380,'↑',38,C.teal)+
   T(513,469,'Pauli exclusion • Hund’s rule • Aufbau',23,C.muted);
   break;
 case 'photon-spectrum':
   s=R(72,178,880,360)+T(268,238,'Short wavelength',27,C.blue)+T(759,238,'Long wavelength',27,C.gold)+
   '<path d="'+Array.from({length:121},(_,i)=>{let x=128+i*3.2,y=330+44*Math.sin(i*0.45);return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ')+'" stroke="'+C.blue+'" fill="none" stroke-width="4"/>'+
   '<path d="'+Array.from({length:121},(_,i)=>{let x=550+i*3.2,y=330+44*Math.sin(i*0.12);return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ')+'" stroke="'+C.gold+'" fill="none" stroke-width="4"/>'+
   T(286,449,'Higher photon energy',23,C.blue)+T(752,449,'Lower photon energy',23,C.gold)+T(512,508,'E = h c / λ',35,C.ink);
   break;
 case 'energy-levels':
   s=R(116,162,788,375)+[ [465,'n = 1'],[355,'n = 2'],[235,'n = 3'] ].map(([y,n])=>L(265,y,765,y,C.line,4)+T(775,y+7,n,22,C.muted,'start')).join('')+
   A(363,452,363,245,C.teal,6)+T(355,204,'Absorption',25,C.teal)+A(617,246,617,342,C.gold,6)+T(615,408,'Emission',25,C.gold);
   break;
 case 'ionic-bonding':
   s=R(95,181,833,344)+atom(295,337,'Na',54,C.blue)+atom(726,337,'Cl',54,C.gold)+
   A(376,325,636,325,C.teal,5)+O(505,292,10,C.teal)+T(501,267,'electron transfer',23,C.muted)+
   T(295,449,'Na⁺',27,C.blue)+T(725,449,'Cl⁻',27,C.gold)+T(512,491,'Opposite ions attract electrostatically.',21,C.muted);
   break;
 case 'covalent-bonding':
   s=R(70,173,883,347)+[['H—H','Single bond'],['O=O','Double bond'],['N≡N','Triple bond']].map(([v,l],i)=>{const x=213+i*292;return T(x,338,v,54,i===0?C.teal:i===1?C.gold:C.violet)+T(x,398,l,24,C.muted)}).join('');
   break;
 case 'lewis-water':
   s=R(90,177,844,343)+T(519,251,'H₂O: 2 bonding pairs + 2 lone pairs',27,C.muted)+
   T(335,369,'H',58,C.white)+T(512,369,'O',74,C.red)+T(687,369,'H',58,C.white)+
   L(386,349,467,349,C.ink,5)+L(562,349,637,349,C.ink,5)+
   O(488,277,7,C.teal)+O(535,277,7,C.teal)+O(488,409,7,C.teal)+O(535,409,7,C.teal);
   break;
 case 'molecular-shapes':
   s=R(64,171,896,352)+[['CO₂','Linear','180°'],['H₂O','Bent','~104.5°'],['BF₃','Trigonal planar','120°'],['CH₄','Tetrahedral','~109.5°']].map(([formula,name,angle],i)=>{const x=179+i*220;return R(x-96,210,193,258)+T(x,257,formula,36,C.teal)+T(x,321,name,22,C.ink)+T(x,382,angle,26,C.gold)+T(x,429,'Ideal / example',15,C.muted)}).join('');
   break;
 case 'hydrogen-bonding':
   s=R(90,175,844,355)+molecular(309,337,'H2O')+
   atom(712,337,'O',25,C.red)+atom(760,304,'H',18,C.white)+atom(760,376,'H',18,C.white)+
   L(731,324,747,313,C.muted,4)+L(731,351,747,365,C.muted,4)+
   L(357,370,688,342,C.teal,4,'8 10')+T(515,290,'H···O hydrogen bond',23,C.teal)+T(513,484,'Intermolecular attraction, not an O—H covalent bond',21,C.muted);
   break;
 case 'mole-conversions':
   s=row3([['Mass (g)','÷ molar mass'],['Amount (mol)','× 6.022 × 10²³'],['Particles','atoms / molecules']]);
   break;
 case 'balanced-reaction':
   s=R(63,179,899,354)+molecular(171,326,'H2')+molecular(283,326,'H2')+T(353,335,'+',37,C.muted)+molecular(460,326,'O2')+
   A(551,331,661,331,C.teal,6)+molecular(766,318,'H2O')+molecular(885,318,'H2O')+
   T(512,490,'2 H₂ + O₂ → 2 H₂O',32,C.gold);
   break;
 case 'limiting-reactant':
   s=R(73,173,878,360)+T(507,267,'4 H₂ + 1 O₂',43,C.ink)+A(400,319,629,319,C.teal,6)+
   T(512,392,'2 H₂O + 2 H₂ left over',33,C.gold)+T(512,474,'O₂ is limiting; H₂ is in excess.',25,C.muted);
   break;
 case 'reaction-types':
   s=R(77,165,866,369)+[
      ['Synthesis','A + B → AB'],['Decomposition','AB → A + B'],['Single replacement','A + BC → AC + B'],['Combustion','Fuel + O₂ → CO₂ + H₂O']
   ].map(([name,e],i)=>{let x=i%2?532:100,y=i<2?197:366;return R(x,y,391,147)+T(x+195,y+51,name,25,C.teal)+T(x+195,y+104,e,26)}).join('');
   break;
 case 'stoichiometry-map':
   s=row3([['Known mass A','g A ÷ g/mol A'],['Mole ratio','mol B / mol A'],['Unknown mass B','mol B × g/mol B']]);
   break;
 case 'states-of-matter':
   s=R(60,169,904,363)+['Solid','Liquid','Gas'].map((label,i)=>{let x=87+i*302;s='';const dots=[];for(let k=0;k<(i===2?9:16);k++){let xx=x+35+(i===2?(k*61)%190:(k%4)*55)+(i===1?k%3*7:0),yy=300+(i===2?((k*43)%140):Math.floor(k/4)*41)+(i===1?k%2*4:0);dots.push(O(xx,yy,10,C.teal));}return R(x,208,253,281)+T(x+127,257,label,27,C.gold)+dots.join('')}).join('');
   break;
 case 'heating-curve':
   s=R(86,170,852,363)+axes(185,464,678,241,'Heat added','Temperature')+
    P([[190,442],[295,395],[382,395],[522,286],[612,286],[759,205]],C.red,5)+
    T(322,380,'0 °C',21,C.blue)+T(639,270,'100 °C',21,C.gold)+T(512,508,'Pure water at approximately 1 atm',20,C.muted);
   break;
 case 'phase-diagram':
   s=R(90,168,844,367)+axes(177,466,659,252,'Temperature','Pressure')+
   P([[186,458],[335,340],[456,280],[565,191]],C.teal,5)+P([[335,340],[655,333],[762,269]],C.gold,5)+
   T(283,407,'Solid',25,C.ink)+T(485,320,'Liquid',25,C.ink)+T(701,428,'Gas',25,C.ink)+
   O(335,340,9,C.violet)+T(336,319,'Triple point',16,C.violet)+O(762,269,9,C.red)+T(764,246,'Critical point',18,C.red);
   break;
 case 'boyle-law':
   s=R(70,169,884,367)+axes(166,449,296,201,'Volume','Pressure')+
   P(Array.from({length:18},(_,i)=>[177+i*15,205+(-122/(1+i*0.23))]),C.teal,5)+
   T(305,248,'Boyle: P ∝ 1/V',24,C.teal)+axes(592,449,295,201,'Temperature (K)','Volume')+
   P([[597,449],[856,259]],C.gold,5)+T(735,233,'Charles: V ∝ T',24,C.gold);
   break;
 case 'ideal-gas-law':
   s=R(74,177,877,354)+R(130,226,440,241,'#132941',C.blue,3)+
   Array.from({length:23},(_,i)=>O(160+(i*67)%368,253+(i*89)%188,8,i%3?C.teal:C.gold)).join('')+
   T(351,496,'Collisions produce pressure',21,C.muted)+T(750,318,'PV = nRT',48,C.teal)+T(754,389,'T in kelvin (K)',24,C.gold);
   break;
 case 'molarity':
   s=R(73,175,880,354)+R(141,245,220,241,'#203e62',C.blue,9)+T(250,405,'Solution',25)+
   T(679,285,'M = n / V',48,C.teal)+T(674,360,'0.50 mol in 1.00 L',24)+T(672,429,'= 0.50 mol/L',32,C.gold);
   break;
 case 'dilution':
   s=R(75,177,874,356)+box(126,243,266,209,'Before','1.0 M × 0.10 L',C.gold)+
   A(424,340,589,340,C.teal,7)+box(624,243,266,209,'After','0.10 M × 1.0 L',C.teal)+
   T(513,501,'M₁V₁ = M₂V₂: amount of solute unchanged',22,C.muted);
   break;
 case 'solubility':
   s=R(94,175,846,356)+axes(179,466,648,239,'Temperature','Solubility')+
   P([[183,414],[255,393],[336,359],[432,309],[541,256],[693,217],[791,195]],C.teal,6)+
   T(514,479,'Illustrative only: actual curves depend on the substance',19,C.muted);
   break;
 case 'pH-scale':
   s=R(70,179,884,351)+Array.from({length:15},(_,i)=>R(100+i*55,278,55,103,i<7?'#a14350':i===7?'#519d71':'#466d9f','none',0)+T(127+i*55,341,String(i),20,C.white)).join('')+
   T(254,246,'Acidic',28,C.red)+T(511,246,'Neutral',28,C.green)+T(769,246,'Basic',28,C.blue)+
   T(513,446,'pH 7 is neutral for pure water at 25 °C',22,C.muted);
   break;
 case 'titration-setup':
   s=R(100,166,823,366)+R(444,201,48,198,'#a9d5ee',C.blue,4)+
   L(467,399,467,437,C.gold,5)+A(467,436,467,468,C.gold,3)+
   '<path d="M390 488 L428 429 L518 429 L561 488 Z" fill="#1c5681" stroke="'+C.blue+'" stroke-width="4"/>'+
   T(639,240,'Burette',26,C.teal)+L(505,236,593,237,C.teal,3)+
   T(673,460,'Erlenmeyer flask',24,C.teal)+L(559,462,566,462,C.teal,3)+T(265,368,'Titrant added slowly',20,C.gold);
   break;
 case 'titration-curve':
   s=R(82,173,864,353)+axes(168,469,676,255,'Volume of base added','pH')+
   P([[171,445],[330,431],[457,412],[520,383],[548,331],[556,272],[564,234],[582,207],[734,190],[819,187]],C.teal,6)+
   O(557,304,11,C.gold)+T(700,291,'pH ≈ 7 at equivalence',20,C.gold)+T(514,507,'Strong acid titrated with strong base, near 25 °C',19,C.muted);
   break;
 case 'calorimetry':
   s=R(85,168,858,359)+R(160,273,341,186,'#283c4c',C.blue,6)+R(182,312,297,124,'#345f84','none',5)+
   L(321,195,321,371,C.gold,8)+O(321,371,14,C.red)+T(321,498,'Insulated cup + thermometer',20,C.muted)+
   T(725,313,'q = m c ΔT',37,C.teal)+T(720,379,'qsolution = −qreaction',20,C.gold);
   break;
 case 'enthalpy':
   s=R(75,166,877,362)+T(294,217,'Exothermic',27,C.teal)+T(743,217,'Endothermic',27,C.gold)+
   L(147,289,401,289,C.teal,6)+L(147,407,401,407,C.teal,6)+A(274,301,274,391,C.teal,5)+
   L(607,407,870,407,C.gold,6)+L(607,286,870,286,C.gold,6)+A(739,392,739,301,C.gold,5)+
   T(275,467,'ΔH < 0',26,C.teal)+T(739,467,'ΔH > 0',26,C.gold);
   break;
 case 'hess-law':
   s=R(87,178,852,353)+T(240,288,'A',43,C.teal)+T(803,288,'B',43,C.gold)+T(519,454,'C',43,C.blue)+
   A(271,274,754,274,C.teal,6)+T(517,250,'ΔH(A → B)',22)+
   A(266,322,492,413,C.blue,5)+A(544,416,769,325,C.blue,5)+
   T(512,501,'ΔH(A → B) = ΔH(A → C) + ΔH(C → B)',24,C.muted);
   break;
 case 'activation-energy':
   s=R(90,166,844,363)+axes(167,469,657,244,'Reaction progress','Potential energy')+
   '<path d="M176 423 C295 419,330 198,454 244 C545 282,571 403,806 386" fill="none" stroke="'+C.red+'" stroke-width="5"/>'+
   '<path d="M176 423 C295 423,339 298,452 321 C564 338,597 400,806 386" fill="none" stroke="'+C.teal+'" stroke-width="5"/>'+
   T(636,229,'Uncatalyzed barrier',21,C.red)+T(649,332,'Catalyzed barrier',21,C.teal)+
   T(503,511,'Same reactants, products and ΔH',20,C.muted);
   break;
 case 'equilibrium':
   s=R(95,177,834,354)+T(317,334,'A + B',46,C.teal)+
   A(440,302,592,302,C.gold,6)+A(592,348,440,348,C.blue,6)+T(725,333,'C + D',46,C.teal)+
   T(515,449,'Dynamic equilibrium: forward rate = reverse rate',23,C.muted);
   break;
 case 'galvanic-cell':
   s=R(73,166,879,366)+R(150,335,265,152,'#245270',C.blue,3)+R(609,335,265,152,'#355d77',C.blue,3)+
   R(260,260,28,179,'#b9b4a4',C.muted,4)+R(716,260,28,179,'#cc8d59',C.muted,4)+
   L(274,242,274,217,C.gold,5)+L(274,217,728,217,C.gold,5)+L(728,217,728,246,C.gold,5)+
   A(400,217,601,217,C.teal,5)+T(507,196,'e⁻ flow →',19,C.teal)+
   '<path d="M382 371 Q505 280 631 371" fill="none" stroke="'+C.violet+'" stroke-width="15"/>'+
   T(278,502,'Zn anode (oxidation)',20,C.gold)+T(725,502,'Cu cathode (reduction)',20,C.teal)+
   T(511,349,'Salt bridge',18,C.violet);
   break;
 case 'redox':
   s=R(84,181,851,340)+box(122,235,336,212,'Oxidation','Lose electrons (e⁻)',C.gold)+
   box(567,235,336,212,'Reduction','Gain electrons (e⁻)',C.teal)+A(469,339,551,339,C.blue,6);
   break;
 case 'nuclear-decay':
   s=R(79,177,867,347)+[['α alpha','⁴₂He emitted'],['β⁻ beta','e⁻ emitted'],['γ gamma','photon emitted']].map(([a,b],i)=>{
      let x=83+i*291;return R(x,227,275,230)+T(x+137,293,a,34,[C.gold,C.blue,C.violet][i])+T(x+137,379,b,24);
   }).join('');
   break;
 case 'laboratory-glassware':
   s=R(70,168,881,365)+
   '<path d="M171 244 L171 461 Q171 488 198 488 L261 488 Q285 488 285 461 L285 244" stroke="'+C.blue+'" stroke-width="5" fill="none"/>'+
   '<path d="M421 238 L421 405 Q396 452 421 488 L510 488 Q537 450 510 405 L510 238" stroke="'+C.teal+'" stroke-width="5" fill="none"/>'+
   '<path d="M706 218 L742 218 L742 470 Q742 487 727 487 Q712 487 712 470 L712 218" stroke="'+C.gold+'" stroke-width="5" fill="none"/>'+
   T(225,514,'Beaker',20)+T(464,514,'Volumetric flask',20)+T(725,514,'Burette',20);
   break;
 case 'solution-hydration':
   s=R(85,177,853,356)+atom(312,341,'Na⁺',56,C.gold)+atom(711,341,'Cl⁻',56,C.blue)+
   Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return O(Math.round(312+117*Math.cos(a)),Math.round(341+117*Math.sin(a)),16,C.red)+O(Math.round(711+117*Math.cos(a)),Math.round(341+117*Math.sin(a)),16,C.white)}).join('')+
   T(511,498,'Water dipoles orient differently around cations and anions',20,C.muted);
   break;
 default: throw Error('Diagram has no dedicated geometry: '+id);
 }
 return s;
}
function family(z) {
 if(z===1)return 'Nonmetal';
 if([2,10,18,36,54,86,118].includes(z))return 'Noble gas';
 if([3,11,19,37,55,87].includes(z))return 'Alkali metal';
 if([4,12,20,38,56,88].includes(z))return 'Alkaline earth';
 if([9,17,35,53,85,117].includes(z))return 'Halogen';
 if(z>=57&&z<=71)return 'Lanthanide';
 if(z>=89&&z<=103)return 'Actinide';
 if([5,14,32,33,51,52].includes(z))return 'Metalloid';
 if([6,7,8,15,16,34].includes(z))return 'Nonmetal';
 if((z>=21&&z<=30)||(z>=39&&z<=48)||(z>=72&&z<=80)||(z>=104&&z<=112))return 'Transition metal';
 return 'Other metal / element';
}
const familyColor=(f)=>f==='Noble gas'?C.blue:f==='Alkali metal'?C.gold:f==='Alkaline earth'?'#f5ac83':f==='Halogen'?C.green:f==='Nonmetal'?C.teal:f==='Metalloid'?C.violet:f==='Lanthanide'?'#f5a3ce':f==='Actinide'?'#cd99ec':C.muted;
function pos(z){
 if(z===1)return [1,1];
 if(z===2)return [18,1];
 if(z>=3&&z<=10)return [z<=4?z-2:z+8,2];
 if(z>=11&&z<=18)return [z<=12?z-10:z,3];
 if(z>=19&&z<=36)return [z-18,4];
 if(z>=37&&z<=54)return [z-36,5];
 if(z===55||z===56)return [z-54,6];
 if(z>=57&&z<=71)return [z-54,8];
 if(z>=72&&z<=86)return [z-68,6];
 if(z===87||z===88)return [z-86,7];
 if(z>=89&&z<=103)return [z-86,9];
 return [z-100,7];
}
function periodicTable(){
 const W=1880,H=1210,cw=92,ch=83,left=100,top=170;
 const cells=ELEMENTS.map(e=>{let [g,p]=pos(e.atomicNumber),x=left+(g-1)*cw,y=top+(p-1)*ch,fill=familyColor(family(e.atomicNumber));
  return '<g><title>'+esc(e.name)+' (atomic number '+e.atomicNumber+')</title>'+
   '<rect x="'+x+'" y="'+y+'" width="87" height="78" rx="9" fill="'+C.panel+'" stroke="'+fill+'" stroke-width="3"/>'+
   T(x+9,y+18,e.atomicNumber,15,fill,'start',700)+T(x+44,y+52,e.symbol,31,C.ink,'middle',700)+'</g>';
 }).join('');
 let head='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="title desc">'+
 '<title id="title">Periodic table of all 118 chemical elements</title><desc id="desc">All 118 IUPAC element symbols and atomic numbers, arranged by group, period, lanthanide and actinide series. Atomic weights not shown.</desc>'+
 '<rect width="'+W+'" height="'+H+'" fill="'+C.bg+'"/>'+T(93,79,'Periodic table • all 118 elements',54,C.ink,'start',700)+
 T(93,120,'Atomic number · element symbol · group · period',25,C.muted,'start')+
 Array.from({length:18},(_,i)=>T(left+i*cw+44,158,i+1,20,C.muted)).join('')+
 Array.from({length:7},(_,i)=>T(62,top+i*ch+47,i+1,22,C.muted)).join('')+cells+
 R(left+2*cw,top+5*ch,87,78,C.panel,C.line,9)+T(left+2*cw+44,top+5*ch+38,'57–71',15,C.muted)+
 R(left+2*cw,top+6*ch,87,78,C.panel,C.line,9)+T(left+2*cw+44,top+6*ch+38,'89–103',15,C.muted)+
 T(91,top+7*ch+51,'Lanthanides',19,C.muted,'start')+T(91,top+8*ch+51,'Actinides',19,C.muted,'start')+
 [
   ['Alkali metal',C.gold],['Alkaline earth', '#f5ac83'],['Transition metal',C.muted],
   ['Metalloid',C.violet],['Nonmetal',C.teal],['Halogen',C.green],
   ['Noble gas',C.blue],['Lanthanide', '#f5a3ce'],['Actinide', '#cd99ec']
 ].map(([name,color],i)=>{const x=96+(i%5)*336,y=980+Math.floor(i/5)*50;return O(x,y,12,color)+T(x+22,y+7,name,21,C.ink,'start')}).join('')+
 T(90,1100,'Reference: symbols and atomic numbers only. Group-3 convention can vary.',19,C.muted,'start')+
 T(90,1130,'StudyCade • original vector chart • CC0-1.0',18,C.teal,'start')+
 T(1790,1130,'Element names: IUPAC',17,C.muted,'end')+'</svg>\n';
 return head;
}
function tile(e){
 const col=familyColor(family(e.atomicNumber));
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 440" role="img" aria-labelledby="title desc">'+
 '<title id="title">Element '+e.atomicNumber+': '+esc(e.name)+'</title>'+
 '<desc id="desc">Periodic table element tile with symbol '+esc(e.symbol)+'. This is not a photograph of the element.</desc>'+
 '<rect width="440" height="440" rx="24" fill="'+C.bg+'"/>'+
 R(26,24,388,388,C.panel,col,21)+T(59,88,e.atomicNumber,40,col,'start',700)+
 T(220,255,e.symbol,139,C.ink,'middle',700)+T(220,323,e.name,35,C.ink,'middle',650)+
 T(220,371,family(e.atomicNumber),19,col)+T(220,425,'StudyCade • element reference, not a sample photo',14,C.muted)+'</svg>\n';
}
async function save(relative, source){
 const full=path.join(base,relative);
 if(!full.startsWith(base+path.sep))throw Error('Unsafe output');
 let old=null;try{old=await readFile(full,'utf8');}catch{}
 if(checkOnly){if(old!==source)throw Error('Asset not generated or stale: '+relative);return;}
 if(old===source)return;
 await mkdir(path.dirname(full),{recursive:true});
 await writeFile(full,source,'utf8');
}
if(ELEMENTS.length!==118 || CHEMISTRY_TOPICS.length!==40) throw Error('Catalogue counts changed');
const output=[];
for(const topic of CHEMISTRY_TOPICS) {
 const svg=topic.id==='periodic-table'?periodicTable():frame(topic.title,topic.description,scene(topic.id));
 output.push([topic.id+'.svg',svg]);
}
for(let i=0;i<ELEMENTS.length;i++) {
 const e=ELEMENTS[i],id=String(e.atomicNumber).padStart(3,'0');
 output.push(['elements/'+id+'-'+e.symbol.toLowerCase()+'.svg',tile(e)]);
}
const manifest={
 schemaVersion:1,
 generatedBy:'scripts/generate-chemistry-assets.mjs',
 license:'CC0-1.0',
 notice:'Original vector diagrams are schematic and not measured apparatus photos. Element cards are symbols, not specimen photographs.',
 topics:CHEMISTRY_TOPICS,
 elements:CHEMISTRY_ELEMENT_ASSETS,
 externalReferenceCollections:[
  {title:'Wikimedia Commons — element samples',page:'https://commons.wikimedia.org/wiki/Category:Element_samples',note:'Each individual photo has its own license; verify before reuse.'},
  {title:'Wikimedia Commons — CC0 simple periodic table',page:'https://commons.wikimedia.org/wiki/File:Simple_Periodic_Table_Chart.svg',license:'CC0-1.0'},
  {title:'Wikimedia Commons — CC0 element samples photo',page:'https://commons.wikimedia.org/wiki/File:Element_samples.jpg',license:'CC0-1.0'},
  {title:'IUPAC element symbols',page:'https://iupac.org/what-we-do/periodic-table-of-elements/',note:'Data reference, not a license to reproduce IUPAC artwork.'},
 ]
};
output.push(['catalog.json',JSON.stringify(manifest,null,2)+'\n']);
for(const [rel,svg] of output){
 if(rel.endsWith('.svg') && (/<(?:script|foreignObject|image|iframe)\b/i.test(svg)||/onload\s*=|href\s*=/i.test(svg)))throw Error('Unsafe SVG '+rel);
 await save(rel,svg);
}
console.log((checkOnly?'Verified ':'Generated ')+output.length+' chemistry assets (40 diagrams, 118 element tiles, 1 catalogue).');
