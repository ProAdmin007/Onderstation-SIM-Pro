
// ============================================================ beveiligingsinstellingen: venster (de instellingen en hun effect staan in 04-4-beveiliging.js)
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
