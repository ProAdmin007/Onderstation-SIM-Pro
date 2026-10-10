
// ============================================================ laagspanning: SCADA-tabblad LS, LS-venster (toets N) en kabelkasten op straat
// ---- kabelkasten: groen kastje op de stoep tussen de twee stations, lokaal te bedienen (rondlopen, F)
const KK_MAT=mat({color:0x2f5a3c,roughness:0.7}),KK_ON=mat({color:0x111111,emissive:0x30ff60,emissiveIntensity:0});
LS_LINKS.forEach(d=>{const sa=RING.stations.find(s=>s.id===D[d.a].bay),sb=RING.stations.find(s=>s.id===D[d.b].bay);
  let x=sa.pos[0]+(sb.pos[0]-sa.pos[0])*0.5,z=sa.pos[1]+(sb.pos[1]-sa.pos[1])*0.5;
  for(let r=0;r<30&&blockedAt(x,z);r++){const a=r*2.4;x+=Math.cos(a)*1.5;z+=Math.sin(a)*1.5;}
  const root=grp(x,z),ind=mat({color:0x111111,emissive:0x30ff60,emissiveIntensity:0});root.userData.dyn=true;
  box(0.9,1.15,0.38,KK_MAT,root,0,0.6,0);box(0.92,0.05,0.4,MAT.galvDark,root,0,1.2,0);box(0.06,0.06,0.02,ind,root,0.3,1.0,0.2);
  plate(d.id,root,0,0.95,0.2,0,0.34);d.pos=[x,z];
  regView(d.id,root,()=>{ind.emissiveIntensity=d.state?2.5:0;},{labelPos:V3(x,1.9,z)});});

// ---- SCADA-tabblad LS (overzicht; klik op een station voor het LS-venster)
function renderLSTab(){const g=$('#lsG');if(!g||SLD.tab!=='L')return;const o=[];let y=20;
  const col=g=>!g.U?'var(--muted)':g.U>U_MAX||g.U<U_MIN?'var(--red)':g.U>248||g.U<212?'var(--accent)':'var(--green)';
  o.push(`<text x="235" y="${y-4}" text-anchor="middle" class="h">LAAGSPANNING PER MS-STATION</text>`,`<text x="235" y="${y+9}" text-anchor="middle" class="fs dl">spanning per straat (207–253 V) · ◆ aggregaat · klik voor het LS-venster (N)</text>`);y+=28;
  RINGS.forEach(rg=>{o.push(`<text x="10" y="${y}" class="h">${rg.name.toUpperCase()}</text>`);y+=14;
    rg.stations.forEach(s=>{const live=stationLive(s),tl=Math.round(Math.abs(s.trLoad||0)*100);
      o.push(`<g class="cab" data-ls="${s.id}"><rect x="6" y="${y-11}" width="458" height="${30}" rx="4" fill="rgba(255,255,255,.03)"/>`,
        `<text x="12" y="${y}" class="fs" style="fill:#d6dde4"><tspan style="font-weight:600">${s.id}</tspan> ${s.short}</text>`,
        `<text x="458" y="${y}" text-anchor="end" class="fs ${live?'':'dl'}">${s.gs?`<tspan style="fill:var(--accent)">◆ aggregaat ${s.gs.state==='aan'?Math.round((s.gs.load||0)*100)+'%':'UIT'}</tspan> · `:''}${EN.has(s.node+'v')?`trafo ${tl}% · trap ${s.tapLv>0?'+':''}${s.tapLv}`:live?'':'spanningsloos'}${s.eta&&s.aOff?` · herstel ${fmtClock(s.eta)}`:''}</text>`);
      s.groups.filter(g=>g.kind!=='ovl').forEach((g,j)=>{const x=12+j*90,on=D[g.id].state===1;
        o.push(`<rect x="${x}" y="${y+5}" width="84" height="11" rx="2" fill="${on?'rgba(255,255,255,.06)':'transparent'}" stroke="${col(g)}" stroke-width="${on?1:0.6}" ${on?'':'stroke-dasharray="2 2"'}/>`,
          `<text x="${x+3}" y="${y+13.5}" class="fs" style="font-size:8px;fill:${col(g)}">G${j+1} ${on?(g.U?Math.round(g.U)+' V':'0 V'):'UIT'}${g.pvTrip>SIM.t?' ☀✕':''}${g.backfed&&s.gs?' ◆':''}</text>`);});
      o.push('</g>');y+=34;});y+=4;});
  o.push(`<text x="10" y="${y}" class="h">KABELKASTEN (LS-KOPPELINGEN, MAX. 280 kW)</text>`);y+=14;
  LS_LINKS.forEach(d=>{o.push(`<g class="cab" data-ls="${d.bay}"><text x="12" y="${y}" class="fs" style="fill:#d6dde4">${d.id}</text><text x="52" y="${y}" class="fs dl">${d.a} ↔ ${d.b}</text>`,
    `<text x="458" y="${y}" text-anchor="end" class="fs" style="fill:${d.state?(d.load>1?'var(--red)':'var(--green)'):'var(--muted)'}">${d.state?`dicht · ${Math.round((d.load||0)*280)} kW`:'open'}</text></g>`);y+=14;});
  g.innerHTML=o.join('');}
$('#sld').addEventListener('click',e=>{const c=e.target.closest('[data-ls]');if(c)openLS(c.dataset.ls);});

// ---- LS-venster
let lsPrev=false,lsSt='MS1';
const lsOpen=()=>!$('#lsWin').classList.contains('hidden');
function openLS(stId){if(stId)lsSt=stId;else{const dead=RING.stations.find(s=>!stationLive(s));if(dead)lsSt=dead.id;}
  if(!lsOpen()){lsPrev=SIM.paused;SIM.paused=true;syncSpeed();if(FP.on)unlockPointer();$('#lsWin').classList.remove('hidden');}renderLS();}
function closeLS(){$('#lsWin').classList.add('hidden');SIM.paused=lsPrev;syncSpeed();}
function renderLS(){renderLSTab();if(!lsOpen())return;const s=RING.stations.find(x=>x.id===lsSt),pend=o=>LS_ORDERS.find(o);
  const vcls=g=>!g.U?'dl':g.U>U_MAX||g.U<U_MIN?'bad':g.U>248||g.U<212?'warnc':'';
  const tabs=RING.stations.map(x=>`<button class="mini ${x.id===lsSt?'on':''} ${stationLive(x)?'':'off'}" data-lst="${x.id}">${x.id}${stationLive(x)?'':' ⚠'}${x.gs?' ◆':''}</button>`).join('');
  const grows=s.groups.map((g,j)=>{const d=D[g.id],o=pend(o=>o.kind==='sw'&&o.args.id===g.id);
    return `<tr><td><b>G${j+1}</b><span>${g.name}</span></td><td class="pv">${g.cust?g.cust.toLocaleString('nl-NL'):'—'}</td><td class="pv">${Math.round((g.Pc||0)*1000)} kW${g.pv?`<span>zon ${Math.round(Math.max(0,-g.pv*profile('pv',hourOf()))*1000)} kW</span>`:''}</td>
      <td class="pv ${vcls(g)}">${g.U?Math.round(g.U)+' V':'—'}${g.pvTrip>SIM.t?'<span class="bad">omvormers uit</span>':''}</td>
      <td>${d.state?'<b style="color:var(--green)">IN</b>':'<b class="dl">UIT</b>'}${g.backfed&&s.gs?' <span class="warnc">◆</span>':''}</td>
      <td>${o?`<span class="warnc">monteur ${fmtClock(o.at)}</span>`:`<button class="mini" data-lsw="${g.id}:${d.state?0:1}">Monteur: ${d.state?'UIT':'IN'}</button>`}</td></tr>`;}).join('');
  const links=LS_LINKS.filter(d=>D[d.a].bay===s.id||D[d.b].bay===s.id).map(d=>{const o=pend(o=>o.kind==='sw'&&o.args.id===d.id);
    return `<tr><td><b>${d.id}</b><span>${d.a} ↔ ${d.b}</span></td><td class="pv">${d.state?`${Math.round((d.load||0)*280)} / 280 kW`:'open'}</td>
      <td>${o?`<span class="warnc">monteur ${fmtClock(o.at)}</span>`:`<button class="mini" data-lsw="${d.id}:${d.state?0:1}">Monteur: ${d.state?'open':'dicht'}</button>`}</td></tr>`;}).join('');
  const gs=s.gs,gsO=pend(o=>o.st===s.id&&/^gs/.test(o.kind));
  const gsHtml=gs?`Aggregaat ${gs.state==='aan'?`draait · belasting <b class="${gs.load>1?'bad':''}">${Math.round((gs.load||0)*100)}%</b> van 400 kVA`:'<b class="bad">uitgevallen (overbelast)</b>'}
      ${gsO?`<span class="warnc"> · monteur ${fmtClock(gsO.at)}</span>`:gs.state==='trip'?'<button class="mini" data-lsa="gsrestart">Herstarten</button>':''}${gsO?'':'<button class="mini" data-lsa="gsoff">Afkoppelen</button>'}`
    :gsO?`<span class="warnc">Aggregaat onderweg – aankomst ±${fmtClock(gsO.at)}</span>`
    :`${GENSET.units-GENSET.busy} van ${GENSET.units} beschikbaar <button class="mini" data-lsa="gs" ${stationLive(s)||GENSET.busy>=GENSET.units?'disabled':''}>Noodaggregaat sturen</button>`;
  const tapO=pend(o=>o.kind==='tap'&&o.st===s.id);
  const areas=lsAreas().filter(a=>a.aOff),prio=PRIO().filter(c=>c.lsOff);
  const comm=areas.length?areas.map(a=>`<tr><td><b>${a.id}</b><span>${a.name} · uit sinds ${fmtClock(a.aOffAt)}</span></td><td class="pv">${a.cust.toLocaleString('nl-NL')} klanten</td>
      <td>${a.eta?`herstel ${fmtClock(a.eta)} `:''}<select data-eta="${a.id}"><option value="">${a.eta?'wijzig…':'verwachte hersteltijd…'}</option><option value="30">over 30 min</option><option value="60">over 1 uur</option><option value="120">over 2 uur</option><option value="240">over 4 uur</option></select></td></tr>`).join('')
    :'<tr><td colspan="3" class="dl">Geen uitgevallen gebieden.</td></tr>';
  const prioHtml=prio.length?prio.map(c=>`<button class="mini" data-prio="${c.id}" ${c.called?'disabled':''}>${c.called?'✓ ':''}☎ ${c.name}</button>`).join(' '):'<span class="dl">Alle prioriteitsklanten hebben stroom.</span>';
  $('#lsWin').innerHTML=`<div class="card pr"><div class="eyebrow">Laagspanning · bediening lokaal of via een monteur</div><h2>${s.id} ${s.name}</h2>
    <div class="ls-tabs">${tabs}</div>
    <p class="bf-desc">Trafo ${s.kva} kVA · ${EN.has(s.node+'v')?`belasting ${Math.round(Math.abs(s.trLoad||0)*100)}%`:'<b class="bad">spanningsloos</b>'} · vaste trap <b>${s.tapLv>0?'+':''}${s.tapLv}</b> (${(s.tapLv*2.5).toFixed(1).replace('.',',')}%)
      ${tapO?`<span class="warnc">monteur ${fmtClock(tapO.at)}</span>`:`<button class="mini" data-lsa="tap-1">Trap ▼</button><button class="mini" data-lsa="tap1">Trap ▲</button>`} <span class="dl">(alleen spanningsloos: open eerst ${s.id}-T)</span></p>
    <table><tr><th>LS-veld</th><th>Klanten</th><th>Afname</th><th>Spanning</th><th></th><th></th></tr>${grows}</table>
    ${links?`<table><tr><th>Kabelkast</th><th>Belasting</th><th></th></tr>${links}</table>`:''}
    <p class="bf-desc">⚡ ${gsHtml}</p>
    <div class="eyebrow" style="margin-top:12px">Klanten informeren</div>
    <table>${comm}</table><p class="bf-desc">Prioriteitsklanten zonder stroom: ${prioHtml}</p>
    <p class="bf-desc dl">Een kabelkast mag alleen dicht als één kant spanningsloos is én het LS-veld aan die kant open staat. Een aggregaat voedt alleen de LS-velden die IN staan – houd het onder 400 kVA.</p>
    <div class="rep-btns"><button class="primary" data-lsclose>Sluiten <kbd>N</kbd></button></div></div>`;}
$('#lsWin').addEventListener('click',e=>{if(e.target.closest('[data-lsclose]')||e.target.id==='lsWin')return closeLS();
  const t=e.target.closest('[data-lst]');if(t){lsSt=t.dataset.lst;return renderLS();}
  const sw=e.target.closest('[data-lsw]');if(sw){const [id,v]=sw.dataset.lsw.split(':');lsSwitchOrder(id,+v);return renderLS();}
  const p=e.target.closest('[data-prio]');if(p){callPrio(CONS.find(c=>c.id===p.dataset.prio));return renderLS();}
  const a=e.target.closest('[data-lsa]');if(!a||a.disabled)return;const s=RING.stations.find(x=>x.id===lsSt),k=a.dataset.lsa;
  if(k==='gs')gsSend(s);else if(k==='gsoff')gsOff(s);else if(k==='gsrestart')gsRestart(s);else if(k.startsWith('tap'))tapOrder(s,+k.slice(3));renderLS();});
$('#lsWin').addEventListener('change',e=>{const s=e.target.closest('[data-eta]');if(!s||!s.value)return;setEta(lsAreas().find(a=>a.id===s.dataset.eta),+s.value);});
$('#lsBtn').addEventListener('click',()=>lsOpen()?closeLS():openLS());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.ctrlKey||e.metaKey)return;if((e.key==='n'||e.key==='N')&&$('#intro').classList.contains('hidden'))lsOpen()?closeLS():openLS();});
