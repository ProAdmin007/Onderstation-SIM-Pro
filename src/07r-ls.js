
// ============================================================ laagspanning: SCADA-tabblad LS, LS-venster (toets N) en kabelkasten op straat
// ---- kabelkasten: groen kastje op de stoep tussen de twee stations, lokaal te bedienen (rondlopen, F)
const KK_MAT=mat({color:0x2f5a3c,roughness:0.7}),KK_ON=mat({color:0x111111,emissive:0x30ff60,emissiveIntensity:0});
LS_LINKS.forEach(d=>{const sa=RING.stations.find(s=>s.id===D[d.a].bay),sb=RING.stations.find(s=>s.id===D[d.b].bay);
  let x=sa.pos[0]+(sb.pos[0]-sa.pos[0])*0.5,z=sa.pos[1]+(sb.pos[1]-sa.pos[1])*0.5;
  // vrije plek zoeken: niet op de weg, niet in een gebouw, auto, boom of lantaarn
  const KK_AVOID=['road','woonerf','parkeer','house','apt','hall','kiosk','car','tree','lamp','kast','shed','hedge'],bad=(x,z)=>blockedAt(x,z)||!layFree([x-0.6,z-0.4,x+0.6,z+0.4],KK_AVOID,0.3);
  for(let r=0;r<60&&bad(x,z);r++){const a=r*2.4,d=1.5+r*0.15;x+=Math.cos(a)*d;z+=Math.sin(a)*d;}
  const root=grp(x,z),ind=mat({color:0x111111,emissive:0x30ff60,emissiveIntensity:0});root.userData.dyn=true;
  box(0.9,1.15,0.38,KK_MAT,root,0,0.6,0);box(0.92,0.05,0.4,MAT.galvDark,root,0,1.2,0);box(0.06,0.06,0.02,ind,root,0.3,1.0,0.2);
  plate(d.id,root,0,0.95,0.2,0,0.34);d.pos=[x,z];lay('kk',x-0.45,z-0.2,x+0.45,z+0.2);
  regView(d.id,root,()=>{ind.emissiveIntensity=d.state?2.5:0;},{labelPos:V3(x,1.9,z)});});

// ---- SCADA-tabblad LS (overzicht; klik op een station voor het LS-venster)
// eenlijnschema per MS-station (alleen kijken: schakelen gaat lokaal of via een monteur in het LS-venster)
function renderLSTab(){const g=$('#lsG');if(!g||SLD.tab!=='L')return;const o=[],CW=152,CH=176;
  const vcol=g=>!g.U?'var(--muted)':g.U>U_MAX||g.U<U_MIN?'var(--red)':g.U>248||g.U<212?'var(--accent)':'#9be15d';
  const ln=(x1,y1,x2,y2,cls,extra='')=>o.push(`<line class="w ${cls}" style="stroke-width:2" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`);
  o.push('<text x="235" y="12" text-anchor="middle" class="h">LAAGSPANNING · EENLIJNSCHEMA PER MS-STATION</text>',
    '<text x="235" y="24" text-anchor="middle" class="fs dl">spanning per straat 207–253 V · ◆ aggregaat · ⇄ kabelkast · klik = LS-venster</text>');
  RING.stations.forEach((s,k)=>{const x0=6+(k%3)*(CW+4),y0=32+Math.floor(k/3)*(CH+5),cx=x0+CW/2,M=s.node,live=stationLive(s),gs=s.gs?.state==='aan';
    const busCls=gs?'lv':nodeClass(M+'v'),n=s.groups.length;
    o.push(`<g class="cab" data-ls="${s.id}"><title>${s.id} ${s.name} – klik voor het LS-venster</title><rect x="${x0}" y="${y0}" width="${CW}" height="${CH}" rx="6" fill="rgba(255,255,255,0.025)" stroke="${live?'rgba(255,255,255,0.09)':'rgba(229,72,77,0.55)'}"/>`,
      `<text x="${x0+6}" y="${y0+13}" class="fs" style="fill:#d6dde4"><tspan style="font-weight:700">${s.id}</tspan> ${s.short}</text>`,
      `<text x="${x0+6}" y="${y0+25}" class="fs dl" style="font-size:8.5px">${EN.has(M+'v')?`${Math.round(Math.abs(s.trLoad||0)*100)}% · trap ${s.tapLv>0?'+':''}${s.tapLv}`:gs?'aggregaat':'uit'}</text>`);
    // MS-voeding en distributietrafo
    ln(cx,y0+18,cx,y0+24,nodeClass(M+'t'));
    o.push(`<circle class="w ${nodeClass(M+'t')}" style="stroke-width:2" cx="${cx}" cy="${y0+30}" r="6"/><circle class="w ${busCls}" style="stroke-width:2" cx="${cx}" cy="${y0+40}" r="6"/>`);
    o.push(`<text x="${cx+10}" y="${y0+34}" class="fs dl" style="font-size:8px">${s.kva} kVA</text>`);
    ln(cx,y0+46,cx,y0+54,busCls);ln(x0+10,y0+54,x0+CW-10,y0+54,busCls,'stroke-linecap="butt"');
    if(s.gs)o.push(`<text x="${x0+8}" y="${y0+47}" class="fs" style="fill:var(--accent);font-size:9px">◆ ${gs?Math.round((s.gs.load||0)*100)+'%':'UIT'}</text>`);
    // LS-afgangen met NH-lastscheider, spanning en kabelkast
    s.groups.forEach((gr,j)=>{const gx=x0+10+(j+0.5)*(CW-20)/n,on=D[gr.id].state===1,fed=gr.backfed&&gs,cls=fed?'lv':nodeClass(gr.node),kk=LS_LINKS.find(d=>d.a===gr.id||d.b===gr.id);
      ln(gx,y0+54,gx,y0+62,busCls);
      o.push(`<rect x="${gx-3.5}" y="${y0+62}" width="7" height="11" rx="1" style="fill:${on?'#e5484d':'transparent'};stroke:${on?'#e5484d':'#3fcf72'};stroke-width:1.4"/>`);
      ln(gx,y0+73,gx,y0+98,cls,fed?'stroke-dasharray="3 2"':'');
      o.push(`<polygon class="w arrow ${cls}" points="${gx-3.5},${y0+98} ${gx+3.5},${y0+98} ${gx},${y0+104}"/>`);
      if(kk){const st=kk.state===1;o.push(`<circle cx="${gx}" cy="${y0+86}" r="3" style="fill:${st?'#9be15d':'#0f1418'};stroke:${st?'#9be15d':'#9aa5b1'};stroke-width:1.2"/>`);}
      o.push(`<text x="${gx}" y="${y0+114}" text-anchor="middle" class="fs" style="font-size:8px">${gr.kind==='ovl'?'OVL':(n>5?'':'G')+(j+1)}</text>`,
        `<text x="${gx}" y="${y0+124}" text-anchor="middle" class="fs" style="font-size:8px;fill:${vcol(gr)}">${gr.U?Math.round(gr.U):'—'}</text>`);
      if(gr.pvTrip>SIM.t)o.push(`<text x="${gx}" y="${y0+134}" text-anchor="middle" style="font-size:8px;fill:var(--red)">☀✕</text>`);});
    // kabelkasten van dit station
    LS_LINKS.filter(d=>D[d.a].bay===s.id||D[d.b].bay===s.id).forEach((d,i)=>{const other=D[d.a].bay===s.id?D[d.b].bay:D[d.a].bay,st=d.state===1;
      o.push(`<text x="${x0+6}" y="${y0+150+i*11}" class="fs" style="font-size:8.5px;fill:${st?(d.load>1?'var(--red)':'#9be15d'):'var(--muted)'}">⇄ ${d.id} → ${other} · ${st?Math.round((d.load||0)*280)+' kW':'open'}</text>`);});
    o.push('</g>');});
  g.innerHTML=o.join('');}
$('#sld').addEventListener('click',e=>{const c=e.target.closest('[data-ls]');if(c)return openLS(c.dataset.ls);const g=e.target.closest('[data-goto]');if(g)setTab(g.dataset.goto);});

// ---- LS-venster
let lsPrev=false,lsSt='MS1';
const lsOpen=()=>!$('#lsWin').classList.contains('hidden');
function openLS(stId){if(stId)lsSt=stId;else{const dead=RING.stations.find(s=>!stationLive(s));if(dead)lsSt=dead.id;}
  if(!lsOpen()){modalOpen('ls');if(FP.on)unlockPointer();$('#lsWin').classList.remove('hidden');}renderLS();}
function closeLS(){$('#lsWin').classList.add('hidden');modalClose('ls');}
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
