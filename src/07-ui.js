
// ============================================================ SCADA-eénlijnschema
const SLD={nodes:[],devs:{},meas:{}};
function buildSLD(){
  const o=[];
  const W=(x1,y1,x2,y2,n,c='w')=>o.push(`<line class="${c}" data-n="${n}" data-c="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
  const T=(x,y,t,a='middle',c='')=>o.push(`<text x="${x}" y="${y}" text-anchor="${a}" class="${c}">${t}</text>`);
  const M=(id,x,y,a='middle',c='m')=>o.push(`<text data-m="${id}" x="${x}" y="${y}" text-anchor="${a}" class="${c}"></text>`);
  const hit=(w,h,y0=-h/2)=>`<rect class="hit" x="${-w/2}" y="${y0}" width="${w}" height="${h}" rx="5"/>`;
  const CB=(id,x,y,lbl,side=-1)=>{o.push(`<g class="dev cb" data-id="${id}" transform="translate(${x} ${y})"><title>${id} · ${D[id].label}</title>${hit(28,28)}<rect class="body" x="-8" y="-8" width="16" height="16" rx="2"/></g>`);if(lbl)T(x+side*14,y+3.5,lbl,side<0?'end':'start','dl');};
  const DS=(id,x,y,lbl,side=-1)=>{o.push(`<g class="dev ds" data-id="${id}" transform="translate(${x} ${y})"><title>${id} · ${D[id].label}</title>${hit(28,28)}<line class="tick" x1="-6" y1="-11" x2="6" y2="-11"/><line class="blade" x1="0" y1="11" x2="0" y2="-11" style="transform-origin:0px 11px"/><circle class="piv" cx="0" cy="11" r="2.6"/></g>`);if(lbl)T(x+side*14,y+3.5,lbl,side<0?'end':'start','dl');};
  const ES=(id,x,y,lbl='')=>{o.push(`<g class="dev es" data-id="${id}" transform="translate(${x} ${y})"><title>${id} · ${D[id].label}</title>${hit(24,38,-16)}<line class="tick" x1="-5" y1="-12" x2="5" y2="-12"/><line class="blade" x1="0" y1="8" x2="0" y2="-12" style="transform-origin:0px 8px"/><circle class="piv" cx="0" cy="8" r="2.4"/><line class="gnd" x1="-8" y1="13" x2="8" y2="13"/><line class="gnd" x1="-5" y1="16.5" x2="5" y2="16.5"/><line class="gnd" x1="-2" y1="20" x2="2" y2="20"/></g>`);T(x+12,y+3,lbl,'start','dl');};
  // lijnvelden
  for(const [L,x] of[['L1',70],['L2',390]]){
    o.push(`<g class="dev ln" data-id="${L}-LIJN">${`<rect class="hit" x="${x-48}" y="2" width="96" height="30" rx="5"/>`}</g>`);
    T(x,14,`${L} · ${SIM.lines[L].name.toUpperCase()}`,'middle','h');M('ln'+L,x,27,'middle','mh');
    W(x,34,x,67,L+'x');W(x,52,x+26,52,L+'x');ES(L+'-Q8',x+26,64,'Q8');
    DS(L+'-Q9',x,78,'Q9');W(x,89,x,114,L+'a');CB(L+'-Q0',x,122,'Q0');W(x,130,x,152,L+'b');DS(L+'-Q1',x,163,'Q1');W(x,174,x,200,'BB');
  }
  o.push(`<g class="dev bb" data-id="RAIL"><rect class="hit" x="24" y="192" width="412" height="16" rx="4"/></g>`);
  W(28,200,432,200,'BB','w bus');T(28,216,'110 kV RAIL','start','dl');M('bb',432,216,'end');
  // transformatorvelden
  for(const [Tn,x,bus,side] of[['T1',180,'RA',-1],['T2',280,'RB',1]]){
    W(x,200,x,224,'BB');DS(Tn+'-Q1',x,235,'Q1',side);W(x,246,x,271,Tn+'b');CB(Tn+'-Q0',x,279,'Q0',side);W(x,287,x,306,Tn+'h');
    o.push(`<g class="dev tr" data-id="${Tn}"><title>${Tn} · ${D[Tn].label}</title><rect class="hit" x="${x-16}" y="304" width="32" height="44" rx="5"/><circle class="w" data-n="${Tn}h" data-c="w" cx="${x}" cy="318" r="12"/><circle class="w" data-n="${Tn}l" data-c="w" cx="${x}" cy="334" r="12"/></g>`);
    const tx=x+side*20,an=side<0?'end':'start';T(tx,316,Tn,an,'h');M('tr'+Tn,tx,330,an);M('to'+Tn,tx,343,an);
    W(x,346,x,374,Tn+'l');CB('V-'+Tn,x,382,'V-'+Tn,side);W(x,390,x,420,bus);
  }
  W(20,420,222,420,'RA','w bus');W(238,420,440,420,'RB','w bus');
  CB('V-K',230,420,null);T(230,442,'V-K','middle','dl');
  T(20,412,'10 kV RAIL A','start','dl');M('RA',110,412,'start');T(440,412,'RAIL B 10 kV','end','dl');M('RB',350,412,'end');
  FEEDERS.forEach((f,i)=>{const x=[45,95,145,320,370,420][i];
    W(x,420,x,447,f.bus);CB(f.cb,x,455,null);W(x,463,x,494,f.node);W(x,474,x+15,474,f.node);ES(f.id+'-Q8',x+15,486,'');
    o.push(`<polygon class="w arrow" data-n="${f.node}" data-c="w arrow" points="${x-6},494 ${x+6},494 ${x},506"/>`);
    T(x,522,f.short,'middle','dl');M('f'+f.id,x,535);M('fc'+f.id,x,548,'middle','');T(x,561,f.id,'middle','');});
  const svg=$('#sld');svg.innerHTML=o.join('');
  SLD.nodes=[...svg.querySelectorAll('[data-n]')];
  svg.querySelectorAll('.dev').forEach(el=>{SLD.devs[el.dataset.id]=el;el.addEventListener('click',()=>{selectDevice(el.dataset.id);});});
  svg.querySelectorAll('[data-m]').forEach(el=>SLD.meas[el.dataset.m]=el);
}
function nodeClass(n){return ER.has(n)?'earth':EN.has(n)?(LVN.has(n)?'mv':'hv'):'dead';}
function updateSLD(){
  SLD.nodes.forEach(el=>el.setAttribute('class',el.dataset.c+' '+nodeClass(el.dataset.n)));
  for(const [id,el] of Object.entries(SLD.devs)){const d=D[id];if(['cb','ds','es'].includes(d.type)){el.classList.toggle('closed',d.state===1);el.classList.toggle('open',d.state!==1);
      const bl=el.querySelector('.blade');if(bl)bl.style.transform=d.state?'':'rotate(-35deg)';}
    el.classList.toggle('sel',id===SEL);}
  const m=SLD.meas,fx=(v,n=1)=>v.toFixed(n).replace('.',',');
  for(const L of['L1','L2']){const ln=SIM.lines[L];m['ln'+L].textContent=ln.avail?`${fx(FLOW.lineP[L])} MW`:'GEEN SPANNING';m['ln'+L].setAttribute('class',ln.avail?'mh':'bad');}
  m.bb.textContent=EN.has('BB')?`${fx(FLOW.U110)} kV`:'0 kV';
  for(const Tn of['T1','T2']){const t=D[Tn];m['tr'+Tn].textContent=`${fx(t.S)} MVA · ${Math.round(t.S/(t.fans?25:20)*100)}%`;
    m['to'+Tn].textContent=t.blocked?'BLOKKERING 86':`olie ${Math.round(t.oil)}°C · trap ${t.tap}${t.avr==='auto'?'A':'H'}`;m['to'+Tn].setAttribute('class',t.blocked||t.oil>90?'bad':'m');}
  m.RA.textContent=`${fx(FLOW.U.RA,2)} kV`;m.RB.textContent=`${fx(FLOW.U.RB,2)} kV`;
  FEEDERS.forEach(f=>{const on=EN.has(f.node);m['f'+f.id].textContent=on?`${fx(f.P)} MW`:'UIT';m['f'+f.id].setAttribute('class',on?'m':'bad');m['fc'+f.id].textContent=f.cust>=1000?`${fx(f.cust/1000)}k kl`:`${f.cust} kl`;});
}

// ============================================================ meldingen, toast, opdrachten
let alarmCount=0;
function pushAlarm(text,level='info'){
  alarmCount++;const el=document.createElement('div');el.className=`al ${level} new`;
  el.innerHTML=`<span class="tm">${fmtClock(SIM.t)}</span><span class="lv"></span><span>${text}</span>`;
  const list=$('#alarmList');list.prepend(el);while(list.children.length>80)list.lastChild.remove();
  $('#alarmCnt').textContent=alarmCount;if(level==='crit'||level==='warn')AudioSys.alarm(level);
}
let toastT=0;
function deny(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2800);AudioSys.deny();}
function renderTasks(){
  const body=$('#taskBody'),gh=gameHeader();$('#taskTitle').textContent=GAME.mode==='free'?'Werkopdracht':MODES[GAME.mode].scen?'Scenario':'Dienst & werkopdracht';
  if(!TASK&&!GAME.tasks){$('#taskCode').textContent='';body.innerHTML=gh||'<div class="idle">Geen werkopdrachten in dit scenario.</div>';return;}
  if(!TASK){$('#taskCode').textContent='';body.innerHTML=gh+`<div class="idle">Geen actieve werkopdracht. Houd de installatie in de gaten en reageer op meldingen.<br><br><b style="color:var(--text)">Volgende opdracht</b> rond ${fmtClock(SIM.nextTaskAt)}.</div>`;return;}
  $('#taskCode').textContent=TASK.code;
  body.innerHTML=gh+`<h3>${TASK.title}</h3><p>${TASK.desc}</p>`+TASK.steps.map((s,i)=>`<div class="step ${i<TASK.i?'done':i===TASK.i?'cur':''}"><span class="b">${i<TASK.i?'✓':''}</span><span>${s.t}${i===TASK.i&&s.wait!=null&&s.until!=null?` <span class="tag">tot ${fmtClock(s.until)}</span>`:''}</span></div>`).join('');
}

// ============================================================ apparaatpaneel
let SEL=null,panelRows=[];
const fmtKV=v=>v>0?`${v.toFixed(v<20?2:1).replace('.',',')} kV`:'0 kV';
function bayName(d){const b=d.bay;if(!b)return 'OS Zuidwolde';if(b[0]==='L')return `Lijnveld ${b} · ${SIM.lines[b].name}`;if(b==='T1'||b==='T2')return `Transformatorveld ${b}`;if(b==='K')return '10 kV-installatie';const f=FEEDERS.find(f=>f.id===b);return `10 kV-veld ${b} · ${f.name}`;}
function statusOf(d){
  if(d.type==='cb')return d.state?['INGESCHAKELD','on']:['UITGESCHAKELD','off'];
  if(d.type==='ds')return d.state?['GESLOTEN','on']:['OPEN','off'];
  if(d.type==='es')return d.state?['GEAARD','earth']:['OPEN','off'];
  if(d.type==='tr')return d.blocked?['GEBLOKKEERD','bad']:EN.has(d.a)?['IN BEDRIJF','on']:['SPANNINGSLOOS','off'];
  if(d.type==='line')return SIM.lines[d.line].avail?['ONDER SPANNING','on']:['SPANNINGSLOOS','bad'];
  return EN.has(d.node)?['ONDER SPANNING','on']:['SPANNINGSLOOS','off'];}
const fmtU=v=>`${v.toFixed(2).replace('.',',')} kV`;
function feederState(f){if(f.fault&&f.fault.stage==='search')return '<span class="bad">FOUT · foutzoeken</span>';if(f.fault)return `<span class="warnc">geïsoleerd · ${Math.round(f.cust*f.outFrac)} kl. wachten</span>`;return 'in orde';}
function rowsFor(d){const r=[],A=(k,f)=>r.push([k,f]);
  A('Status',()=>{const s=statusOf(d);return `<span class="chip ${s[1]}">${s[0]}</span>`;});
  if(d.type==='cb'||d.type==='ds')A('Spanning',()=>fmtKV(Math.max(nodeU(d.a),nodeU(d.b))));
  if(d.type==='es')A(d.cb?'Spanning kabelzijde':'Spanning lijnzijde',()=>fmtKV(nodeU(d.a)));
  if(['ct','sa','bb','line'].includes(d.type))A('Spanning',()=>fmtKV(nodeU(d.node)));
  if(d.type==='cb'||d.type==='ds'||d.type==='ct')A('Stroom',()=>`${Math.round(D[d.ref||d.id].I)} A`);
  if(d.type==='cb'){A('Inschakelveer',()=>springOk(d)?'geladen':'<span class="warnc">laden…</span>');A('Schakelingen',()=>d.ops);}
  if(d.line)A('Herinschakeling (AR)',()=>SIM.lines[d.line].ar?'IN bedrijf':'<span class="warnc">UIT bedrijf</span>');
  if(d.id==='V-K')A('Spanningsverschil',()=>EN.has('RA')&&EN.has('RB')?`<span class="${Math.abs(FLOW.U.RA-FLOW.U.RB)>0.25?'bad':''}">${Math.abs(FLOW.U.RA-FLOW.U.RB).toFixed(2).replace('.',',')} kV</span>`:'—');
  if(d.type==='tr'){A('Belasting',()=>`${d.S.toFixed(1)} MVA · ${Math.round(d.S/(d.fans?25:20)*100)}%`);
    A('Spanning 10 kV',()=>d.Ulv>0?`<span class="${Math.abs(d.Ulv-U_SET)>U_BAND?'warnc':''}">${fmtU(d.Ulv)}</span> (doel 10,50)`:'0 kV');
    A('Trappenschakelaar',()=>`stand ${d.tap} / 17 · ${d.avr==='auto'?'AUTO':'<span class="warnc">HAND</span>'}${d.tapBusy?' · draait…':''}`);
    A('Circulatiestroom',()=>d.Sc>0.1?`<span class="warnc">${Math.round(d.Sc*55)} A</span>`:'—');
    A('Olietemperatuur',()=>`<span class="${d.oil>90?'bad':d.oil>75?'warnc':''}">${d.oil.toFixed(1)} °C</span>`);
    A('Koeling',()=>d.fans?'ONAF · ventilatoren aan':'ONAN');
    A('Blokkeerrelais 86',()=>d.blocked?`<span class="bad">${d.blockText}</span>${d.resettable?' · reset mogelijk':''}`:'normaal');}
  if(d.type==='line'){A('Vermogen',()=>`${FLOW.lineP[d.line].toFixed(1)} MW`);A('Opmerking',()=>SIM.lines[d.line].reason||'—');}
  if(d.type==='bb')A('Doorvoer',()=>`${FLOW.P110.toFixed(1)} MW`);
  if(d.type==='bld'){A('Rail A',()=>fmtKV(FLOW.U.RA));A('Rail B',()=>fmtKV(FLOW.U.RB));A('Totale belasting',()=>`${FLOW.load.toFixed(1)} MW`);A('Koppeling V-K',()=>D['V-K'].state?'gesloten':'open');}
  if(d.feeder){const f=d.feeder;A('Belasting',()=>`${f.P.toFixed(2)} MW${f.clp>1.03?` <span class="warnc">(+${Math.round((f.clp-1)*100)}% KLO)</span>`:''}`);A('Klanten',()=>f.cust.toLocaleString('nl-NL'));
    A('Kabel',()=>feederState(f));A('Terugvoeding',()=>f.backfed?'<span class="warnc">actief (via net)</span>':'—');}
  if(d.type==='sa')A('Ontladingsteller',()=>d.count);
  if(['cb','ds','es'].includes(d.type))A('Vergrendeling',()=>{if(!SIM.interlock)return '<span class="warnc">UIT</span>';if(d.busy)return 'bezig…';const r=interlockCheck(d,d.state?0:1);return r?`<span class="warnc">${r.replace('Vergrendeling: ','')}</span>`:'vrij';});
  return r;}
function renderDevPanel(){
  const p=$('#devpanel');if(!SEL){p.classList.add('hidden');return;}
  const d=D[SEL];panelRows=rowsFor(d);
  let ctl='';
  if(d.type==='cb')ctl=`<div class="dp-ctl"><button class="b1" data-act="1">IN</button><button class="b0" data-act="0">UIT</button></div>`;
  else if(d.type==='ds'||d.type==='es')ctl=`<div class="dp-ctl"><button class="b1" data-act="1">SLUITEN</button><button class="b0" data-act="0">OPENEN</button></div>`;
  else if(d.type==='tr')ctl=`<div class="dp-ctl"><button data-act="avr"></button><button data-act="tap-1" title="Trap lager">▼ trap</button><button data-act="tap1" title="Trap hoger">▲ trap</button></div>`;
  const sub=[];if(VIEWS[SEL])sub.push(`<button data-act="fly">Bekijk in 3D</button>`);if(d.type==='bld')sub.push(`<button data-act="inside">Ga naar binnen</button>`);if(d.type==='bld'||VIEWS[SEL]?.inside)sub.push(`<button data-act="scada">Toon in SCADA</button>`);
  if(d.type==='tr')sub.push(`<button data-act="reset">Reset blokkeerrelais 86</button>`);
  const ln=d.line||(d.type==='line'&&d.line);if(d.line)sub.push(`<button data-act="ar"></button>`);
  if(d.feeder)sub.push(`<button data-act="sel:${d.feeder.id}-Q8">Aardschakelaar ${d.feeder.id}-Q8</button>`);
  if(d.type==='es'&&d.cb)sub.push(`<button data-act="sel:${d.cb}">Naar ${d.cb}</button>`);
  p.innerHTML=`<div class="dp-head"><div><div class="dp-id">${d.id}</div><div class="dp-type">${d.label}</div></div><button class="x" data-act="x" title="Sluiten (Esc)">✕</button></div>
    <div class="dp-bay">${bayName(d)}</div><div class="dp-rows">${panelRows.map((r,i)=>`<div class="row"><span>${r[0]}</span><b data-r="${i}"></b></div>`).join('')}</div>${ctl}${sub.length?`<div class="dp-sub" style="flex-wrap:wrap">${sub.join('')}</div>`:''}`;
  p.classList.remove('hidden');refreshDevPanel();}
function refreshDevPanel(){if(!SEL)return;const p=$('#devpanel'),d=D[SEL];
  p.querySelectorAll('[data-r]').forEach(el=>{const v=panelRows[+el.dataset.r][1]();if(el._v!==v){el._v=v;el.innerHTML=v;}});
  p.querySelectorAll('[data-act="1"],[data-act="0"]').forEach(b=>{b.classList.toggle('cur',String(d.state)===b.dataset.act);b.disabled=d.busy;});
  const avr=p.querySelector('[data-act="avr"]');if(avr)avr.textContent=d.avr==='auto'?'AUTO → HAND':'HAND → AUTO';
  p.querySelectorAll('[data-act^="tap"]').forEach(b=>b.disabled=d.avr==='auto'||d.tapBusy);
  const rs=p.querySelector('[data-act="reset"]');if(rs)rs.disabled=!d.blocked;
  const ar=p.querySelector('[data-act="ar"]');if(ar)ar.textContent=SIM.lines[d.line].ar?'AR uitzetten':'AR aanzetten';}
$('#devpanel').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const a=b.dataset.act;
  if(a==='1'||a==='0')operate(SEL,+a);else if(a==='x')selectDevice(null);else if(a==='fly')flyToDevice(SEL);else if(a==='inside')flyTo(VIEWPOS[5][0].clone(),VIEWPOS[5][1].clone(),2);
  else if(a==='avr')setAVR(SEL,D[SEL].avr==='auto'?'hand':'auto');else if(a.startsWith('tap'))tapStep(SEL,+a.slice(3));
  else if(a==='reset')resetLockout(SEL);else if(a==='ar')toggleAR(D[SEL].line);else if(a.startsWith('sel:'))selectDevice(a.slice(4));
  else if(a==='scada'){$('#scada').classList.remove('min');$('#scada').animate([{boxShadow:'0 0 0 3px #f0a43a'},{boxShadow:'0 0 0 0 transparent'}],{duration:900});}});
function selectDevice(id){SEL=id&&D[id]?id:null;renderDevPanel();updateSLD();
  const v=SEL&&VIEWS[SEL];selBox.visible=!!v;if(v)selBox.box.copy(v.box).expandByScalar(0.25);}
function flyToDevice(id){const v=VIEWS[id];if(!v)return;if(v.flyPos)return flyTo(v.flyPos.clone(),v.flyTarget.clone());const s=v.box.getSize(V3()).length();const dist=clamp(s*1.3,9,60);
  const dir=camera.position.clone().sub(v.center).setY(0).normalize();flyTo(v.center.clone().addScaledVector(dir,dist).setY(v.center.y+dist*0.45),v.center.clone());}
function refreshAll(){computeFlows();updateSLD();refreshDevPanel();updateLabels(true);}

// ============================================================ 3D-labels, selectie, hover
const selBox=new THREE.Box3Helper(new THREE.Box3(),0xf0a43a);selBox.visible=false;scene.add(selBox);
const hovBox=new THREE.Box3Helper(new THREE.Box3(),0xffffff);hovBox.visible=false;hovBox.material.transparent=true;hovBox.material.opacity=0.45;scene.add(hovBox);
const LABELS=[];
function buildLabels(){const wrap=$('#labels');
  Object.values(VIEWS).forEach(v=>{const d=D[v.id];if(!d)return;const el=document.createElement('div');el.className='lbl';el.innerHTML=`<i></i>${v.id}`;wrap.appendChild(el);LABELS.push({v,d,el,cls:''});});}
const _p=new THREE.Vector3();
function updateLabels(force){const w=innerWidth,h=innerHeight,ins=camInside();
  for(const L of LABELS){_p.copy(L.v.labelPos).project(camera);const dist=camera.position.distanceTo(L.v.labelPos);
    const vis=L.v.inside===ins&&_p.z<1&&dist<(L.d.type==='line'||L.d.type==='bld'||L.d.type==='bb'?260:120)&&Math.abs(_p.x)<1.05&&Math.abs(_p.y)<1.05;
    if(!vis){if(L.el.style.display!=='none')L.el.style.display='none';continue;}
    if(L.el.style.display==='none')L.el.style.display='';
    L.el.style.transform=`translate(${((_p.x+1)/2*w).toFixed(1)}px,${((1-_p.y)/2*h).toFixed(1)}px) translate(-50%,-100%)`;
    const d=L.d;const c=(d.type==='es'?(d.state?'earth':'open'):['cb','ds'].includes(d.type)?(d.state?'':'open'):d.type==='tr'?(EN.has(d.a)?'':'open'):d.type==='line'?(SIM.lines[d.line].avail?'':'open'):'info')+(d.id===SEL?' sel':'');
    if(c!==L.cls||force){L.cls=c;L.el.className='lbl '+c;}}}
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function pickAt(cx,cy){ndc.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);ray.setFromCamera(ndc,camera);
  const ins=camInside();const hits=ray.intersectObjects(pickables,false).filter(h=>h.object.userData.inside===ins);if(!hits.length)return null;const d0=hits[0].distance;
  return hits.filter(h=>h.distance<d0+8).sort((a,b)=>a.object.userData.vol-b.object.userData.vol)[0].object.userData.devId;}
let downXY=null,hoverId=null,moveEv=null;
renderer.domElement.addEventListener('pointerdown',e=>{downXY=[e.clientX,e.clientY];fly=null;});
renderer.domElement.addEventListener('pointerup',e=>{if(!downXY||e.button!==0)return;if(Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1])<5)selectDevice(pickAt(e.clientX,e.clientY));downXY=null;});
renderer.domElement.addEventListener('pointermove',e=>{moveEv=e;});
renderer.domElement.addEventListener('pointerleave',()=>{moveEv=null;hoverId=null;hovBox.visible=false;$('#tooltip').style.display='none';});
function updateHover(){if(!moveEv)return;const e=moveEv;moveEv=null;const id=e.buttons?null:pickAt(e.clientX,e.clientY);const tt=$('#tooltip');
  if(id!==hoverId){hoverId=id;hovBox.visible=!!id&&id!==SEL;if(id)hovBox.box.copy(VIEWS[id].box).expandByScalar(0.15);renderer.domElement.style.cursor=id?'pointer':'';}
  if(id){const d=D[id];const s=statusOf(d);tt.innerHTML=`<b>${id}</b> · ${d.label}<br><span style="color:var(--muted)">${s[0].toLowerCase()} · klik om te bedienen</span>`;tt.style.display='block';tt.style.left=(e.clientX+14)+'px';tt.style.top=(e.clientY+14)+'px';}
  else tt.style.display='none';}

// ============================================================ camera
const VIEWPOS=[[V3(68,40,96),V3(0,3,6)],[V3(-4,13,-2),V3(-30,5,-22)],[V3(31,11,15),V3(1,4,31)],[V3(36,8,34),V3(4,3,50)],[V3(0.1,175,32),V3(0,0,10)],[V3(-2.2,2.5,47.6),V3(0.4,1.6,54.2)]];
let fly=null;
function flyTo(pos,target,dur=1.5){fly={t:0,dur,p0:camera.position.clone(),t0:controls.target.clone(),p1:pos,t1:target};controls.autoRotate=false;}
function fmtClock(t){const m=((t%1440)+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.floor(m%60)).padStart(2,'0')}`;}
