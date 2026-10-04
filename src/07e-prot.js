
// ============================================================ beveiligingsinstellingen: overstroom per veld, AR per lijn, thermisch per trafo
const PROT={f:{},ln:{L1:{dt:1},L2:{dt:1}},tr:{T1:{trip:100},T2:{trip:100},T3:{trip:100}}};
FEEDERS.forEach(f=>{PROT.f[f.id]={pick:1.3,tms:1};});
const PROT_OPT={
  pick:{label:'I> aanspreekwaarde',vals:[1.1,1.2,1.3,1.5],fmt:v=>Math.round(v*100)+' %',tip:'Laag: ook koude-lastopname leidt tot afschakeling. Hoog: een overbelaste kabel blijft te lang in bedrijf en kan beschadigen.'},
  tms:{label:'Tijdfactor',vals:[0.5,1,2],fmt:v=>'× '+String(v).replace('.',','),tip:'Snel: kortere overbelasting wordt al afgeschakeld. Traag: meer ruimte voor koude-lastopname, maar de kabel warmt langer op.'},
  dt:{label:'AR dode tijd',vals:[0.3,1,3],fmt:v=>String(v).replace('.',',')+' s',tip:'Kort: de vlamboog is soms nog niet gedoofd, dan mislukt de herinschakeling (±30%). 3 s: herinschakeling slaagt altijd, maar draait het station op één lijn, dan vallen processen bij klanten uit.'},
  trip:{label:'Thermische trip',vals:[95,100,110],fmt:v=>'olie ≥ '+v+' °C',tip:'95 °C: veilig, maar de trafo schakelt eerder af bij een piek. 110 °C: meer reserve, maar boven 105 °C ontstaat gasvorming en dreigt een Buchholz-trip met lange inspectie.'}};
const protTxt=(k,v)=>PROT_OPT[k].fmt(v);
function setProt(kind,id,key,val){const o=PROT[kind][id];if(!o||o[key]===val)return;o[key]=val;
  const nm=kind==='f'?FEEDERS.find(f=>f.id===id).cb:id;
  pushAlarm(`Beveiliging ${nm}: ${PROT_OPT[key].label.toLowerCase()} → ${protTxt(key,val)}`,'op');if(protOpen())renderProt();refreshDevPanel();}
// effecten (aangeroepen vanuit de simulatie)
function arFails(L){const dt=PROT.ln[L].dt;return dt<=0.3?Math.random()<0.3:dt>=3?false:Math.random()<0.04;}
function overloadHeat(f,r,dm){   // kabel van een uitgaand veld warmt op bij langdurige overbelasting
  if(f.gen||!D[f.cb].state)return;const q=r*r-1.9;f.heat=Math.max(0,(f.heat||0)+(q>0?q:q*0.3)*dm);
  if(f.heat>=6&&!f.fault){f.heat=0;GAME.stats.burn=(GAME.stats.burn||0)+1;pushAlarm(`${f.cb} ${f.name}: kabel door langdurige overbelasting beschadigd – de beveiliging stond te ruim ingesteld`,'crit');feederFault(f.id);}}
function trafoOverheat(T,t,dm){if(t.oil>105&&EN.has(T+'h')){t.gas=(t.gas||0)+dm;if(t.gas>12){t.gas=0;GAME.stats.thermal++;award(-100,`${T} gasvorming door oververhitting`);
    tripTrafo(T,'Buchholz-beveiliging (gasvorming door oververhitting)',rnd(90,120),'prot');}}else t.gas=Math.max(0,(t.gas||0)-dm*0.5);}

// ---------- venster
let protPrev=false;
const protOpen=()=>!$('#prot').classList.contains('hidden');
function openProt(){if(protOpen())return;protPrev=SIM.paused;SIM.paused=true;syncSpeed();if(FP.on)unlockPointer();renderProt();$('#prot').classList.remove('hidden');}
function closeProt(){$('#prot').classList.add('hidden');SIM.paused=protPrev;syncSpeed();}
function renderProt(){
  const sel=(kind,id,key)=>`<select data-p="${kind}:${id}:${key}">${PROT_OPT[key].vals.map(v=>`<option value="${v}"${PROT[kind][id][key]===v?' selected':''}>${protTxt(key,v)}</option>`).join('')}</select>`;
  const th=keys=>keys.map(k=>`<th title="${PROT_OPT[k].tip}">${PROT_OPT[k].label} <i>?</i></th>`).join('');
  const fRows=FEEDERS.filter(f=>!f.gen).map(f=>{const r=f.P/f.rate;return `<tr><td><b>${f.cb}</b><span>${f.name}</span></td><td class="pv ${r>1?'bad':''}">${Math.round(Math.max(0,r)*100)} %</td><td>${sel('f',f.id,'pick')}</td><td>${sel('f',f.id,'tms')}</td></tr>`;}).join('');
  const lRows=['L1','L2'].map(L=>`<tr><td><b>${L}-Q0</b><span>${SIM.lines[L].name}</span></td><td><button data-ar="${L}" ${SIM.lines[L].arBroken?'disabled':''}>${SIM.lines[L].arBroken?'AR defect':SIM.lines[L].ar?'AR IN':'AR UIT'}</button></td><td>${sel('ln',L,'dt')}</td></tr>`).join('');
  const tRows=TR.map(T=>`<tr><td><b>${T}</b><span>${D[T].label.split('·')[0]}</span></td><td class="pv ${D[T].oil>90?'bad':''}">${Math.round(D[T].oil)} °C</td><td>${sel('tr',T,'trip')}</td></tr>`).join('');
  $('#prot').innerHTML=`<div class="card pr"><div class="eyebrow">Beveiligingsinstellingen · OS Zuidwolde</div><h2>Relais-instellingen</h2>
    <p class="bf-desc">Elke instelling is een afweging: te scherp geeft onnodige afschakelingen, te ruim laat schade toe. Wijzigingen gaan direct in. Beweeg over een kolomkop voor uitleg.</p>
    <div class="mh">Uitgaande velden · overstroom I></div><table><tr><th>Veld</th><th>Belasting</th>${th(['pick','tms'])}</tr>${fRows}</table>
    <div class="mh">110 kV-lijnen · automatische herinschakeling</div><table><tr><th>Lijn</th><th>AR</th>${th(['dt'])}</tr>${lRows}</table>
    <div class="mh">Transformatoren · thermische beveiliging</div><table><tr><th>Trafo</th><th>Olie</th>${th(['trip'])}</tr>${tRows}</table>
    <div class="rep-btns"><button class="primary" data-pclose>Sluiten <kbd>B</kbd></button><button data-pdef>Standaardwaarden</button></div></div>`;}
$('#prot').addEventListener('change',e=>{const s=e.target.closest('[data-p]');if(!s)return;const [kind,id,key]=s.dataset.p.split(':');setProt(kind,id,key,+s.value);});
$('#prot').addEventListener('click',e=>{if(e.target.closest('[data-pclose]')||e.target.id==='prot')return closeProt();
  const ar=e.target.closest('[data-ar]');if(ar){toggleAR(ar.dataset.ar);renderProt();}
  if(e.target.closest('[data-pdef]')){FEEDERS.forEach(f=>{setProt('f',f.id,'pick',1.3);setProt('f',f.id,'tms',1);});['L1','L2'].forEach(L=>setProt('ln',L,'dt',1));TR.forEach(T=>setProt('tr',T,'trip',100));}});
$('#protBtn').addEventListener('click',()=>protOpen()?closeProt():openProt());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if((e.key==='b'||e.key==='B')&&$('#intro').classList.contains('hidden'))protOpen()?closeProt():openProt();});
