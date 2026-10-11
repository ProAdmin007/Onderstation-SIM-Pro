
// ============================================================ beveiligingsinstellingen: venster (de instellingen en hun effect staan in 04-4-beveiliging.js)
// ---------- venster
let protPrev=false;
const protOpen=()=>!$('#prot').classList.contains('hidden');
function openProt(){if(protOpen())return;modalOpen('prot');if(FP.on)unlockPointer();renderProt();$('#prot').classList.remove('hidden');}
function closeProt(){$('#prot').classList.add('hidden');modalClose('prot');}
function renderProt(){
  const sel=(kind,id,key)=>`<select data-p="${kind}:${id}:${key}">${PROT_OPT[key].vals.map(v=>`<option value="${v}"${PROT[kind][id][key]===v?' selected':''}>${protTxt(key,v)}</option>`).join('')}</select>`;
  const th=keys=>keys.map(k=>`<th title="${PROT_OPT[k].tip}">${PROT_OPT[k].label} <i>?</i></th>`).join('');
  const fRows=FEEDERS.filter(f=>!f.gen).map(f=>{const r=f.P/f.rate;return `<tr><td><b>${f.cb}</b><span>${f.name}</span></td><td class="pv ${r>1?'bad':''}">${Math.round(Math.max(0,r)*100)} %</td><td>${sel('f',f.id,'pick')}</td><td>${sel('f',f.id,'tms')}</td></tr>`;}).join('');
  const lRows=LINES.map(L=>`<tr><td><b>${L}-Q0</b><span>${SIM.lines[L].name}</span></td><td><button data-ar="${L}" ${SIM.lines[L].arBroken?'disabled':''}>${SIM.lines[L].arBroken?'AR defect':SIM.lines[L].ar?'AR IN':'AR UIT'}</button></td><td>${sel('ln',L,'dt')}</td></tr>`).join('');
  const tRows=TR.map(T=>`<tr><td><b>${T}</b><span>${D[T].label.split('·')[0]}</span></td><td class="pv ${D[T].oil>90?'bad':''}">${Math.round(D[T].oil)} °C</td><td>${sel('tr',T,'trip')}</td><td>${sel('tr',T,'oc')}</td></tr>`).join('');
  $('#prot').innerHTML=`<div class="card pr"><div class="eyebrow">Beveiligingsinstellingen · OS Zuidwolde</div><h2>Relais-instellingen</h2>
    <p class="bf-desc">Elke instelling is een afweging: te scherp geeft onnodige afschakelingen, te ruim laat schade toe. Wijzigingen gaan direct in. Beweeg over een kolomkop voor uitleg.</p>
    <div class="mh">Uitgaande velden · overstroom I></div><table><tr><th>Veld</th><th>Belasting</th>${th(['pick','tms'])}</tr>${fRows}</table>
    <div class="mh">110 kV-lijnen · automatische herinschakeling</div><table><tr><th>Lijn</th><th>AR</th>${th(['dt'])}</tr>${lRows}</table>
    <div class="mh">Transformatoren · thermische beveiliging</div><table><tr><th>Trafo</th><th>Olie</th>${th(['trip','oc'])}</tr>${tRows}</table>
    <div class="mh">Selectiviteit · tijd-stroomkarakteristiek</div>${selChart()}
    <div class="rep-btns"><button class="primary" data-pclose>Sluiten <kbd>B</kbd></button><button data-pdef>Standaardwaarden</button></div></div>`;}
$('#prot').addEventListener('change',e=>{const s=e.target.closest('[data-p]');if(!s)return;const [kind,id,key]=s.dataset.p.split(':');setProt(kind,id,key,+s.value);});
$('#prot').addEventListener('click',e=>{if(e.target.closest('[data-pclose]')||e.target.id==='prot')return closeProt();
  const ar=e.target.closest('[data-ar]');if(ar){toggleAR(ar.dataset.ar);renderProt();}
  if(e.target.closest('[data-pdef]')){FEEDERS.forEach(f=>{setProt('f',f.id,'pick',1.3);setProt('f',f.id,'tms',1);});LINES.forEach(L=>setProt('ln',L,'dt',1));TR.forEach(T=>{setProt('tr',T,'trip',100);setProt('tr',T,'oc',0.2);});}
  const sf=e.target.closest('[data-self]');if(sf){PROT_SELF=sf.dataset.self;renderProt();}});
$('#protBtn').addEventListener('click',()=>protOpen()?closeProt():openProt());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if((e.key==='b'||e.key==='B')&&$('#intro').classList.contains('hidden'))protOpen()?closeProt():openProt();});
// ---------- selectiviteitsgrafiek (log-log): veld I>/I>> tegenover de reserve-overstroom van het inkomende veld
let PROT_SELF='F6';
function selChart(){const fs=FEEDERS.filter(f=>!f.gen&&f.bus!=='MP'),f=FD(PROT_SELF)||fs[0],sel=selectivity(f),T=sel.T,W=560,H=230,L=46,B=28,Tp=8;
  const I0=100,I1=20000,t0=0.01,t1=20,X=I=>L+(W-L-8)*Math.log10(I/I0)/Math.log10(I1/I0),Y=t=>Tp+(H-Tp-B)*(1-Math.log10(Math.min(t1,Math.max(t0,t))/t0)/Math.log10(t1/t0));
  const pts=fn=>{const o=[];for(let I=I0;I<=sel.Ik*1.02;I*=1.02){const t=fn(I);if(isFinite(t)&&t<=t1)o.push(`${X(I).toFixed(1)},${Y(t).toFixed(1)}`);}return o.join(' ');};
  const grid=[];[100,200,500,1000,2000,5000,10000,20000].forEach(I=>grid.push(`<line x1="${X(I)}" x2="${X(I)}" y1="${Tp}" y2="${H-B}" stroke="rgba(255,255,255,.07)"/><text x="${X(I)}" y="${H-B+12}" text-anchor="middle" class="ax">${I>=1000?I/1000+' kA':I+' A'}</text>`));
  [0.01,0.1,1,10].forEach(t=>grid.push(`<line x1="${L}" x2="${W-8}" y1="${Y(t)}" y2="${Y(t)}" stroke="rgba(255,255,255,.07)"/><text x="${L-5}" y="${Y(t)+3}" text-anchor="end" class="ax">${String(t).replace('.',',')} s</text>`));
  const bad=sel.bad?`<rect x="${X(sel.bad[0])}" y="${Tp}" width="${Math.max(2,X(sel.bad[1])-X(sel.bad[0]))}" height="${H-Tp-B}" fill="rgba(229,72,77,.18)"/>`:'';
  const fmtI=I=>I>=1000?(I/1000).toFixed(1).replace('.',',')+' kA':Math.round(I)+' A';
  const btns=fs.map(x=>`<button class="mini ${x===f?'on':''}" data-self="${x.id}">${x.cb}</button>`).join('');
  return `<div class="sel-btns">${btns}</div><svg class="selc" viewBox="0 0 ${W} ${H}">${grid.join('')}${bad}
    <line x1="${X(sel.Ik)}" x2="${X(sel.Ik)}" y1="${Tp}" y2="${H-B}" stroke="#e5484d" stroke-dasharray="4 3"/><text x="${X(sel.Ik)-4}" y="${Tp+10}" text-anchor="end" class="ax" style="fill:#e5484d">Ik max ${fmtI(sel.Ik)}</text>
    <polyline points="${pts(I=>incT(T,I))}" fill="none" stroke="#4aa3ff" stroke-width="2"/>
    <polyline points="${pts(I=>feederT(f,I))}" fill="none" stroke="#f0a43a" stroke-width="2.4"/>
    <text x="${L+6}" y="${Tp+12}" class="ax" style="fill:#f0a43a">${f.cb}: I> ${fmtI(feederIp(f))} · TMS ${String(PROT.f[f.id].tms*0.1).replace('.',',')} · I>> ${fmtI(feederIinst(f))} (50 ms)</text>
    <text x="${L+6}" y="${Tp+25}" class="ax" style="fill:#4aa3ff">${incCb(T)} (reserve): I> ${fmtI(incIp(T))} · TMS ${String(PROT.tr[T].oc).replace('.',',')}</text></svg>
    <p class="bf-desc ${sel.bad?'bad':''}" style="margin-top:4px">${sel.bad?`✗ <b>Niet selectief</b> tussen ${fmtI(sel.bad[0])} en ${fmtI(sel.bad[1])}: daar schakelt ${incCb(T)} binnen ${String(SEL_MARGE).replace('.',',')} s na het veld af. Bij een kabelfout in dat bereik valt de hele rail uit. Zet de reserve-overstroom trager of het veld sneller.`:`✓ <b>Selectief</b>: over het hele foutstroombereik schakelt ${f.cb} minstens ${String(SEL_MARGE).replace('.',',')} s eerder af dan ${incCb(T)}.`}</p>`;}
