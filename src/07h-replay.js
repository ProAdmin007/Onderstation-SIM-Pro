
// ============================================================ tijdlijn en herhaling: elke spelminuut de toestand vastleggen, na afloop analyseren en terugkijken
var REC={samples:[],events:[],lastM:null,ids:null},RP={on:false,i:0,play:false,live:null,liveT:0,acc:0};
const snapState=()=>({sw:REC.ids.map(id=>D[id].state).join(''),la:LINES.map(L=>SIM.lines[L].avail?1:0).join(''),bf:Object.keys(BUSF).join(','),
  rf:RING.secs.map(s=>s.fault?1:0).join(''),tb:TR.map(T=>D[T].blocked?1:0).join(''),r:D.T3.ratio,dm:RING.stations.filter(s=>s.damaged).map(s=>s.id+'|'+s.damaged).join(',')});
function recTick(){if(GAME.ended||!$('#intro').classList.contains('hidden')||RP.on)return;const m=Math.floor(SIM.t);if(m===REC.lastM)return;REC.lastM=m;
  REC.ids??=Object.values(D).filter(d=>['cb','ds','es','lbs','lvs'].includes(d.type)).map(d=>d.id);
  REC.samples.push({t:SIM.t,off:SIM.off,cml:Math.round(SIM.cml),score:Math.round(GAME.score),l10:FLOW.load,l20:FLOW.load20,...snapState()});}
function recEvent(t,level,text,pts){if(!REC||!RP||RP.on||!$('#intro').classList.contains('hidden'))return;REC.events.push({t,level,text,pts});if(REC.events.length>3000)REC.events.shift();}
function applyState(s){[...s.sw].forEach((c,i)=>{D[REC.ids[i]].state=+c;});LINES.forEach((L,i)=>{SIM.lines[L].avail=s.la[i]==='1';});
  for(const k in BUSF)delete BUSF[k];s.bf.split(',').filter(Boolean).forEach(b=>BUSF[b]=true);
  RING.secs.forEach((x,i)=>{x.fault=s.rf[i]==='1';});TR.forEach((T,i)=>{D[T].blocked=s.tb[i]==='1';});D.T3.ratio=s.r;
  RING.stations.forEach(x=>{x.damaged=false;});s.dm.split(',').filter(Boolean).forEach(v=>{const [id,why]=v.split('|');RING.stations.find(x=>x.id===id).damaged=why;});
  computeFlows();updateSLD();updateLabels(true);refreshDevPanel();}
// ---------- analyse: leermomenten
const TIPS=[[/kortsluiting|kabelfout|railfout|beschadigd station/i,'Wacht met inschakelen tot de storingsdienst de fout heeft gevonden en geïsoleerd (groene melding).'],
  [/Circulatiestroom/,'Breng de trappen van beide transformatoren gelijk (of zet beide regelaars op AUTO) voordat je ze parallel schakelt.'],
  [/overbelast afgeschakeld/,'Schakel na een lange onderbreking velden één voor één in: koude-lastopname geeft tijdelijk veel meer belasting. Kijk ook naar de beveiligingsinstellingen.'],
  [/thermisch|gasvorming/,'Kijk op tijd naar het tabblad Prognose: zet T3 bij of schakel de kassen af vóór de piek.'],
  [/Spanning buiten band|Spanning te laag/,'Laat de regelaars op AUTO staan, en vermijd lange voedingsroutes in de ring.'],
  [/Niet gemeld/,'Werkt er een monteur bij het veld? Meld je eerst via de portofoon.'],
  [/hing op|verkeerd|ten onrechte|Monteur naar verkeerd|voor niets/,'Neem de telefoon snel op en zoek het adres op: in het ringschema zie je welke straten en bedrijven op welk station zitten.'],
  [/schakelbrief/i,'Voer een goedgekeurde schakelbrief stap voor stap uit, in de volgorde van de brief.'],
  [/Werk gestaakt/,'Werk staken zonder storing kost punten: maak de opdracht af als het kan.'],
  [/Afspraak overdracht/,'Lees de dienstoverdracht goed: afspraken met klanten gelden ook in jouw dienst.'],
  [/Veiligheidsincident/,'Schakel altijd in de juiste volgorde: eerst de vermogenschakelaar, dan pas scheiders; aarden alleen spanningsloos.'],
  [/Doel gemist/,'Lees bij een scenario de doelen links goed: ze geven aan wat er van je verwacht wordt.']];
function analyse(){const S=REC.samples.filter(s=>s.t>=GAME.t0),E=REC.events.filter(e=>e.t>=GAME.t0),out=[];
  // onderbrekingen: aaneengesloten periodes met klanten zonder stroom
  const eps=[];let cur=null;S.forEach(s=>{if(s.off>0){if(!cur)cur={a:s.t,b:s.t,max:0,cml:0};cur.b=s.t;cur.max=Math.max(cur.max,s.off);cur.cml+=s.off;}else if(cur){eps.push(cur);cur=null;}});if(cur)eps.push(cur);
  eps.sort((x,y)=>y.cml-x.cml).slice(0,3).forEach(ep=>{const dur=Math.round(ep.b-ep.a+1),cause=E.find(e=>e.level==='crit'&&e.t>=ep.a-1&&e.t<=ep.a+1),act=E.find(e=>e.level==='op'&&e.t>=ep.a);
    out.push({k:'out',t:ep.a,txt:`<b>${fmtClock(ep.a)}–${fmtClock(ep.b+1)}</b>: tot ${ep.max.toLocaleString('nl-NL')} klanten ${dur} min zonder stroom${cause?` – ${cause.text.replace(/<[^>]+>/g,'').slice(0,90)}`:''}.${act?` Eerste handeling na <b>${Math.max(0,Math.round(act.t-ep.a))} min</b> (${act.text.replace('Bediening ','')}).`:''}`});});
  // waar liet je punten liggen
  const lost={};E.filter(e=>e.level==='score'&&e.pts<0).forEach(e=>{const k=e.text;(lost[k]??={n:0,pts:0,t:e.t});lost[k].n++;lost[k].pts+=e.pts;});
  Object.entries(lost).sort((a,b)=>a[1].pts-b[1].pts).slice(0,5).forEach(([k,v])=>{const tip=TIPS.find(([re])=>re.test(k));out.push({k:'neg',t:v.t,txt:`<b>${v.n}× ${k}</b> (${v.pts}) – eerste keer om ${fmtClock(v.t)}.${tip?` <i>${tip[1]}</i>`:''}`});});
  const best=E.filter(e=>e.level==='score'&&e.pts>0).sort((a,b)=>b.pts-a.pts)[0];if(best)out.push({k:'pos',t:best.t,txt:`Beste moment: <b>${best.text}</b> (+${best.pts}) om ${fmtClock(best.t)}.`});
  if(!eps.length)out.push({k:'pos',txt:'Geen enkele klant heeft stroom gemist – uitstekend!'});
  return out;}
// ---------- tijdlijn in het rapport
function timelineHTML(){const S=REC.samples.filter(s=>s.t>=GAME.t0);if(S.length<3)return '';const E=REC.events.filter(e=>e.t>=GAME.t0);
  const W=640,H=150,X0=40,X1=630,Y0=24,Y1=118,t0=S[0].t,t1=Math.max(S[S.length-1].t,t0+1),x=t=>X0+(t-t0)/(t1-t0)*(X1-X0);
  const mo=Math.max(1,...S.map(s=>s.off)),sc=S.map(s=>s.score),smin=Math.min(...sc),smax=Math.max(...sc,smin+1),yo=v=>Y1-v/mo*(Y1-Y0),ys=v=>Y1-(v-smin)/(smax-smin)*(Y1-Y0);
  const area=`M${x(t0)},${Y1} `+S.map(s=>`L${x(s.t).toFixed(1)},${yo(s.off).toFixed(1)}`).join(' ')+` L${x(S[S.length-1].t)},${Y1} Z`;
  const o=[`<rect x="${X0}" y="${Y0}" width="${X1-X0}" height="${Y1-Y0}" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.08)"/>`];
  const step=(t1-t0)>240?60:30;for(let t=Math.ceil(t0/step)*step;t<=t1;t+=step)o.push(`<line x1="${x(t)}" x2="${x(t)}" y1="${Y0}" y2="${Y1}" stroke="rgba(255,255,255,.06)"/><text x="${x(t)}" y="${Y1+13}" text-anchor="middle" class="tl-ax">${fmtClock(t)}</text>`);
  o.push(`<path d="${area}" fill="rgba(229,72,77,.35)" stroke="rgba(229,72,77,.8)" stroke-width="1"/>`,`<polyline fill="none" stroke="var(--accent)" stroke-width="1.8" points="${S.map(s=>`${x(s.t).toFixed(1)},${ys(s.score).toFixed(1)}`).join(' ')}"/>`);
  o.push(`<text x="${X0-4}" y="${Y0+8}" text-anchor="end" class="tl-ax" style="fill:#ff8f92">${mo.toLocaleString('nl-NL')}</text><text x="${X1}" y="${Y0-6}" text-anchor="end" class="tl-ax" style="fill:var(--accent)">score ${smin}–${smax}</text>`);
  E.forEach(e=>{const cx=x(e.t).toFixed(1),tt=`<title>${fmtClock(e.t)} · ${e.text.replace(/<[^>]+>/g,'').replace(/"/g,'')}</title>`;
    if(e.level==='crit')o.push(`<g class="tl-m" data-tt="${e.t}"><polygon points="${cx-4},${Y0-12} ${+cx+4},${Y0-12} ${cx},${Y0-4}" fill="#ff5a5f"/>${tt}</g>`);
    else if(e.level==='op')o.push(`<g class="tl-m" data-tt="${e.t}"><line x1="${cx}" x2="${cx}" y1="${Y1+16}" y2="${Y1+24}" stroke="#9fb3c8" stroke-width="1.4"/>${tt}</g>`);
    else if(e.level==='ok'&&/Doel behaald|voltooid|hersteld ✓/.test(e.text))o.push(`<g class="tl-m" data-tt="${e.t}"><circle cx="${cx}" cy="${Y1+20}" r="3.2" fill="var(--green)"/>${tt}</g>`);});
  o.push(`<rect class="tl-hit" x="${X0}" y="${Y0}" width="${X1-X0}" height="${Y1-Y0}" fill="transparent" data-t0="${t0}" data-t1="${t1}"/>`);
  const ins=analyse();
  return `<div class="rep-h">Tijdlijn <span class="tl-leg"><i style="background:rgba(229,72,77,.7)"></i>klanten zonder stroom <i style="background:var(--accent)"></i>score <i style="background:#ff5a5f"></i>storing <i style="background:#9fb3c8"></i>jouw handeling · klik om terug te kijken</span></div>
    <svg class="tl" viewBox="0 0 ${W} ${H}">${o.join('')}</svg>
    <div class="rep-h">Leermomenten</div><div class="tl-ins">${ins.map(i=>`<div class="tl-i ${i.k}" ${i.t!=null?`data-tt="${i.t}"`:''}>${i.txt}</div>`).join('')}</div>`;}
// ---------- herhaling
function startReplay(t){const S=REC.samples.filter(s=>s.t>=GAME.t0);if(!S.length)return;RP.S=S;if(!RP.on){RP.live=snapState();RP.liveT=SIM.t;RP.on=true;}
  RP.i=t==null?0:Math.max(0,S.findIndex(s=>s.t>=t-0.5));RP.play=t==null;$('#report').classList.add('hidden');$('#replay').classList.remove('hidden');
  const sl=$('#rpSlider');sl.max=S.length-1;showReplay();}
function showReplay(){const s=RP.S[RP.i];applyState(s);SIM.t=s.t;updateHUD();$('#kOff').textContent=s.off.toLocaleString('nl-NL');$('#kScore').textContent=s.score.toLocaleString('nl-NL');$('#kCml').textContent=(s.cml||0).toLocaleString('nl-NL');
  $('#rpSlider').value=RP.i;$('#rpTime').textContent=fmtClock(s.t);$('#rpPlay').textContent=RP.play?'❚❚':'▶';
  const ev=REC.events.filter(e=>e.t<=s.t+0.01&&e.t>=GAME.t0&&e.level!=='score').slice(-3).reverse();
  $('#rpEv').innerHTML=ev.map(e=>`<div class="al ${e.level}"><span class="tm">${fmtClock(e.t)}</span><span class="lv"></span><span>${e.text}</span></div>`).join('');}
function stopReplay(){if(!RP.on)return;RP.on=false;RP.play=false;applyState(RP.live);SIM.t=RP.liveT;updateHUD();$('#replay').classList.add('hidden');$('#report').classList.remove('hidden');}
function replayTick(dt){if(!RP.on||!RP.play)return;RP.acc+=dt*(+$('#rpSpeed').value);const n=Math.floor(RP.acc);if(!n)return;RP.acc-=n;RP.i=Math.min(RP.S.length-1,RP.i+n);if(RP.i===RP.S.length-1)RP.play=false;showReplay();}
$('#replay').addEventListener('click',e=>{const b=e.target.closest('[data-rp]');if(!b)return;const a=b.dataset.rp;
  if(a==='play'){if(RP.i>=RP.S.length-1)RP.i=0;RP.play=!RP.play;showReplay();}else if(a==='exit')stopReplay();
  else if(a==='back'){RP.i=Math.max(0,RP.i-10);showReplay();}else if(a==='fwd'){RP.i=Math.min(RP.S.length-1,RP.i+10);showReplay();}});
$('#rpSlider').addEventListener('input',e=>{RP.i=+e.target.value;RP.play=false;showReplay();});
$('#report').addEventListener('click',e=>{const m=e.target.closest('[data-tt]');if(m)return startReplay(+m.dataset.tt);
  const h=e.target.closest('.tl-hit');if(h){const r=h.getBoundingClientRect(),f=(e.clientX-r.left)/r.width;startReplay(+h.dataset.t0+f*(h.dataset.t1-h.dataset.t0));}});
