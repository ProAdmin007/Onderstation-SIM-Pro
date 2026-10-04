
// ============================================================ SCADA-eénlijnschema (tabbladen 10 kV en 20 kV)
const SLD={nodes:[],devs:{},meas:{},devTab:{},tab:'10'};
function buildSLD(){
  const out={10:[],20:[]};let o;
  const W=(x1,y1,x2,y2,n,c='w')=>o.push(`<line class="${c}" data-n="${n}" data-c="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
  const T=(x,y,t,a='middle',c='')=>o.push(`<text x="${x}" y="${y}" text-anchor="${a}" class="${c}">${t}</text>`);
  const M=(id,x,y,a='middle',c='m')=>o.push(`<text data-m="${id}" x="${x}" y="${y}" text-anchor="${a}" class="${c}"></text>`);
  const hit=(w,h,y0=-h/2)=>`<rect class="hit" x="${-w/2}" y="${y0}" width="${w}" height="${h}" rx="5"/>`;
  const CB=(id,x,y,lbl,side=-1)=>{o.push(`<g class="dev cb" data-id="${id}" transform="translate(${x} ${y})"><title>${id} · ${D[id].label}</title>${hit(28,28)}<rect class="body" x="-8" y="-8" width="16" height="16" rx="2"/></g>`);if(lbl)T(x+side*14,y+3.5,lbl,side<0?'end':'start','dl');};
  const DS=(id,x,y,lbl,side=-1)=>{o.push(`<g class="dev ds" data-id="${id}" transform="translate(${x} ${y})"><title>${id} · ${D[id].label}</title>${hit(28,28)}<line class="tick" x1="-6" y1="-11" x2="6" y2="-11"/><line class="blade" x1="0" y1="11" x2="0" y2="-11" style="transform-origin:0px 11px"/><circle class="piv" cx="0" cy="11" r="2.6"/></g>`);if(lbl)T(x+side*14,y+3.5,lbl,side<0?'end':'start','dl');};
  const ES=(id,x,y,lbl='')=>{o.push(`<g class="dev es" data-id="${id}" transform="translate(${x} ${y})"><title>${id} · ${D[id].label}</title>${hit(24,38,-16)}<line class="tick" x1="-5" y1="-12" x2="5" y2="-12"/><line class="blade" x1="0" y1="8" x2="0" y2="-12" style="transform-origin:0px 8px"/><circle class="piv" cx="0" cy="8" r="2.4"/><line class="gnd" x1="-8" y1="13" x2="8" y2="13"/><line class="gnd" x1="-5" y1="16.5" x2="5" y2="16.5"/><line class="gnd" x1="-2" y1="20" x2="2" y2="20"/></g>`);if(lbl)T(x+12,y+3,lbl,'start','dl');};
  const SDS=(id,x,y)=>o.push(`<g class="dev ds sds" data-id="${id}" transform="translate(${x} ${y})"><title>${id} · ${D[id].label}</title>${hit(14,16)}<line class="tick" x1="-4" y1="-6" x2="4" y2="-6"/><line class="blade" x1="0" y1="6" x2="0" y2="-6" style="transform-origin:0px 6px"/><circle class="piv" cx="0" cy="6" r="1.8"/></g>`);
  const RA_Y=404,RB_Y=420;
  const line=(L,x)=>{o.push(`<g class="dev ln" data-id="${L}-LIJN"><rect class="hit" x="${x-48}" y="2" width="96" height="30" rx="5"/></g>`);
    T(x,14,`${L} · ${SIM.lines[L].name.toUpperCase()}`,'middle','h');M('ln'+L,x,27,'middle','mh');
    W(x,34,x,67,L+'x');W(x,52,x+26,52,L+'x');ES(L+'-Q8',x+26,64,'Q8');
    DS(L+'-Q9',x,78,'Q9');W(x,89,x,114,L+'a');CB(L+'-Q0',x,122,'Q0');W(x,130,x,152,L+'b');DS(L+'-Q1',x,163,'Q1');W(x,174,x,200,'BB');};
  const top=()=>{line('L1',60);line('L2',415);
    o.push(`<g class="dev bb" data-id="RAIL"><rect class="hit" x="24" y="192" width="424" height="16" rx="4"/></g>`);
    W(28,200,444,200,'BB','w bus');T(28,216,'110 kV RAIL','start','dl');M('bb',444,216,'end');};
  const bay=(Tn,x,side,lv,bus)=>{W(x,200,x,224,'BB');DS(Tn+'-Q1',x,235,'Q1',side);W(x,246,x,271,Tn+'b');CB(Tn+'-Q0',x,279,'Q0',side);W(x,287,x,306,Tn+'h');
    o.push(`<g class="dev tr" data-id="${Tn}"><title>${Tn} · ${D[Tn].label}</title><rect class="hit" x="${x-16}" y="304" width="32" height="44" rx="5"/><circle class="w" data-n="${Tn}h" data-c="w" cx="${x}" cy="318" r="12"/><circle class="w" data-n="${Tn}l" data-c="w" cx="${x}" cy="334" r="12"/></g>`);
    const tx=x+side*18,an=side<0?'end':'start';T(tx,316,Tn+(Tn===RES?' reserve':''),an,'h');M('tr'+Tn,tx,330,an);M('to'+Tn,tx,343,an);if(Tn===RES)M('rt'+RES,tx,356,an,'mh');
    if(bus!=='RAB'){W(x,346,x,374,Tn+'l');CB(lv,x,382,lv,side);W(x,390,x,420,bus);return;}
    const sn=Tn+'s';W(x,346,x,354,Tn+'l');CB(lv,x,362,lv,-side);W(x,370,x,378,sn);W(x-8,378,x+8,378,sn);
    SDS(Tn+'-QA',x-8,386);W(x-8,392,x-8,RA_Y,'RA');SDS(Tn+'-QB',x+8,386);W(x+8,392,x+8,RB_Y,'RB');};
  const feeder=(f,x)=>{if(is20(f.bus))W(x,420,x,447,f.bus);else{const sn=f.sel;W(x-8,RA_Y,x-8,426,'RA');SDS(f.id+'-QA',x-8,432);W(x+8,RB_Y,x+8,426,'RB');SDS(f.id+'-QB',x+8,432);W(x-8,438,x+8,438,sn);W(x,438,x,447,sn);}CB(f.cb,x,455,null);W(x,463,x,494,f.node);W(x,474,x+15,474,f.node);ES(f.id+'-Q8',x+15,486,'');
    o.push(`<polygon class="w arrow" data-n="${f.node}" data-c="w arrow" points="${f.gen?`${x-6},506 ${x+6},506 ${x},494`:`${x-6},494 ${x+6},494 ${x},506`}"/>`);
    T(x,522,f.short,'middle','dl fs');M('f'+f.id,x,535);M('fc'+f.id,x,548,'middle','');T(x,561,f.id,'middle','');};
  const F=id=>FEEDERS.find(f=>f.id===id);
  // tabblad 10 kV
  o=out[10];top();bay('T1',160,-1,'V-T1','RAB');bay('T3',330,1,'V-T3','RAB');
  W(20,RA_Y,452,RA_Y,'RA','w bus');W(20,RB_Y,452,RB_Y,'RB','w bus');CB('V-K',230,412,null);T(240,400,'V-K','start','dl');
  T(14,RA_Y+3,'A','end','dl');T(14,RB_Y+3,'B','end','dl');T(20,398,'10 kV RAIL A','start','dl');M('RA',98,398,'start');T(452,398,'RAIL B','end','dl');M('RB',412,398,'end');
  W(196,RA_Y,196,426,'RA');ES('RA-Q8',196,438,'');W(264,RB_Y,264,426,'RB');ES('RB-Q8',264,438,'');
  [['F1',35],['F2',82],['F3',128],['F4',285],['F5',395],['F6',440]].forEach(([id,x])=>feeder(F(id),x));
  // tabblad 20 kV
  o=out[20];top();bay('T2',160,-1,'W-T2','RC');bay('T3',330,1,'W-T3','RD');
  W(20,420,222,420,'RC','w bus');W(238,420,452,420,'RD','w bus');CB('W-K',230,420,null);T(230,442,'W-K','middle','dl');
  T(20,412,'20 kV RAIL C1','start','dl');M('RC',104,412,'start');T(452,412,'RAIL C2','end','dl');M('RD',405,412,'end');
  W(200,420,200,428,'RC');ES('RC-Q8',200,440,'');W(262,420,262,428,'RD');ES('RD-Q8',262,440,'');
  [['G1',45],['G2',110],['G3',370],['G4',430]].forEach(([id,x])=>feeder(F(id),x));
  // tabblad Ring: alle 10 kV-ringen onder elkaar
  out.R=[];o=out.R;const HS=(id,x,y)=>{o.push(`<g class="dev ds" data-id="${id}" transform="translate(${x} ${y}) rotate(-90)"><title>${id} · ${D[id].label}</title>${hit(26,26)}<line class="tick" x1="-6" y1="-11" x2="6" y2="-11"/><line class="blade" x1="0" y1="11" x2="0" y2="-11" style="transform-origin:0px 11px"/><circle class="piv" cx="0" cy="11" r="2.4"/></g>`);};
  const drawRing=(rg,oy)=>{const st=rg.stations,n=st.length,RY=oy+92,x0=(470-(n-1)*84)/2,XS=st.map((s,i)=>x0+i*84),fb=F(rg.from).sel,tb=F(rg.to).sel;
    T(235,oy+16,`${rg.name.toUpperCase()} · normaal-open punt ${rg.nop}`,'middle','h');
    M('fa'+rg.from,24,oy+33,'start','fs');M('fa'+rg.to,446,oy+33,'end','fs');
    W(14,oy+24,14,oy+36,fb);CB('V-'+rg.from,14,oy+44);W(14,oy+52,14,RY,rg.from);
    W(456,oy+24,456,oy+36,tb);CB('V-'+rg.to,456,oy+44);W(456,oy+52,456,RY,rg.to);
    st.forEach((s,i)=>{const x=XS[i],n2=s.node,Y=RY;
      o.push(`<rect x="${x-38}" y="${oy+58}" width="76" height="196" rx="7" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.09)"/>`);
      o.push(`<g class="dev kiosk" data-id="${s.id}"><title>${s.id} · ${s.name}</title><rect class="hit" x="${x-38}" y="${oy+58}" width="76" height="27" rx="6"/></g>`);
      T(x,oy+70,s.id,'middle','h');T(x,oy+81,s.short,'middle','dl fs');M('fi'+s.id,x+28,oy+71,'middle','flag');
      HS(s.id+'-L',x-24,Y);HS(s.id+'-R',x+24,Y);W(x-13,Y,x+13,Y,n2,'w bus2');
      W(x,Y,x,Y+12,n2);DS(s.id+'-T',x,Y+23);W(x,Y+34,x,Y+42,n2+'t');
      o.push(`<circle class="w" data-n="${n2}t" data-c="w" cx="${x}" cy="${Y+49}" r="7"/><circle class="w" data-n="${n2}v" data-c="w" cx="${x}" cy="${Y+60}" r="7"/>`);
      W(x,Y+67,x,Y+74,n2+'v');W(x-32,Y+74,x+32,Y+74,n2+'v','w bus2');
      s.groups.forEach((g,j)=>{const gx=x-32+(j+0.5)*64/s.groups.length;W(gx,Y+74,gx,Y+84,n2+'v');
        o.push(`<g class="dev cb lvs" data-id="${g.id}" transform="translate(${gx} ${Y+90})"><title>${g.id} · ${g.name}</title>${hit(14,18)}<rect class="body" x="-4.5" y="-4.5" width="9" height="9" rx="1.5"/></g>`);
        W(gx,Y+95,gx,Y+104,g.node);o.push(`<polygon class="w arrow" data-n="${g.node}" data-c="w arrow" points="${gx-4},${Y+104} ${gx+4},${Y+104} ${gx},${Y+111}"/>`);T(gx,Y+121,'G'+(j+1),'middle','fs');});
      M('stc'+s.id,x,Y+133);M('stp'+s.id,x,Y+144);M('stu'+s.id,x,Y+155,'middle','');
      if(s.id+'-R'===rg.nop)T(x+24,Y+20,'NOP','middle','mh fs');});
    RING.secs.filter(c=>c.ring===rg).forEach((sec,i)=>{const x1=i?XS[i-1]+35:14,x2=i<n?XS[i]-35:456;W(x1,RY,x2,RY,sec.node);M('flt'+sec.id,(x1+x2)/2,RY-8,'middle','bad');});};
  RINGS.forEach((rg,k)=>drawRing(rg,k*262));
  T(235,540,'⚑ verklikker aangesproken · ⚡ kabelfout','middle','fs');T(235,553,'klik op een station voor alle schakelaars','middle','fs');
  const svg=$('#sld');svg.innerHTML=`<g data-tab="10">${out[10].join('')}</g><g data-tab="20" style="display:none">${out[20].join('')}</g><g data-tab="R" style="display:none">${out.R.join('')}</g><g data-tab="P" style="display:none"><g id="progG"></g></g><g data-tab="K" style="display:none"><g id="cabG"></g></g>`;
  SLD.nodes=[...svg.querySelectorAll('[data-n]')];SLD.byNode={};SLD.nodes.forEach(el=>(SLD.byNode[el.dataset.n]??=[]).push(el));
  svg.querySelectorAll('.dev').forEach(el=>{const id=el.dataset.id,tab=el.closest('[data-tab]').dataset.tab;(SLD.devs[id]??=[]).push(el);(SLD.devTab[id]??=new Set()).add(tab);
    el.addEventListener('click',()=>selectDevice(id));});
  svg.querySelectorAll('[data-m]').forEach(el=>(SLD.meas[el.dataset.m]??=[]).push(el));
  $('#sldTabs').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(b)setTab(b.dataset.t);});
}
// ---- tabbladen laten oplichten zolang er in dat deel van de installatie een storing is
function tabAlarms(){const out={'10':[],'20':[],R:[]},add=(t,why)=>out[t].push(why),both=why=>{add('10',why);add('20',why);};
  LINES.forEach(L=>{if(!SIM.lines[L].avail&&!SIM.lines[L].maint)both(`lijn ${L} spanningsloos`);});
  if(D.T3.blocked)both('T3 geblokkeerd');
  BUS_IDS.forEach(b=>{const t=is20(b)?'20':'10',nm=BUSES[b].nm;if(BUSF[b])add(t,`railfout rail ${nm}`);else if(!EN.has(b))add(t,`rail ${nm} spanningsloos`);});
  if(D.T1.blocked)add('10','T1 geblokkeerd');if(D.T2.blocked)add('20','T2 geblokkeerd');
  FEEDERS.forEach(f=>{const t=is20(f.bus)?'20':'10';if(f.ring)return;if(f.fault)add(t,`kabelfout ${f.id}`);else if(f.unplanned&&!EN.has(f.node))add(t,`${f.id} spanningsloos`);});
  CB_IDS.forEach(id=>{const d=D[id];if(d.stuck)add(d.feeder&&is20(d.feeder.bus)?'20':'10',`${id} zit vast`);});
  RING.secs.forEach(s=>{if(s.fault)add('R',`kabelfout ${secName(s)}`);});
  RING.stations.forEach(s=>{if(s.damaged)add('R',`${s.id} beschadigd`);else if(s.fuse)add('R',`zekeringen ${s.id}`);else if(s.unplanned&&!EN.has(s.node))add('R',`${s.id} spanningsloos`);});
  return out;}
function updateTabAlarms(){const a=tabAlarms();document.querySelectorAll('#sldTabs button').forEach(b=>{if(b.dataset.tip0==null)b.dataset.tip0=b.title||'';const l=a[b.dataset.t];const on=!!(l&&l.length);
    b.classList.toggle('alarm',on);const tip=on?`Storing: ${l.slice(0,4).join(', ')}${l.length>4?` (+${l.length-4})`:''}`:'';if(b._tip!==tip){b._tip=tip;b.title=tip||b.dataset.tip0;}});}
function setTab(t){SLD.tab=t;if(t==='P')setTimeout(renderProg);if(t==='K')setTimeout(renderCables);document.querySelectorAll('#sld [data-tab]').forEach(g=>g.style.display=g.dataset.tab===t?'':'none');
  document.querySelectorAll('#sldTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));}
function nodeClass(n){if(ER.has(n))return 'earth';if(!EN.has(n))return 'dead';const v=lvl(n);return v===110?'hv':v===20?'mv20':v<1?'lv':'mv';}
function setM(k,txt,cls){(SLD.meas[k]||[]).forEach(el=>{el.textContent=txt;if(cls)el.setAttribute('class',cls);});}
function updateSLD(){
  SLD.nodes.forEach(el=>el.setAttribute('class',el.dataset.c+' '+nodeClass(el.dataset.n)));
  for(const [id,c] of READY)if(!c())READY.delete(id);
  for(const [id,els] of Object.entries(SLD.devs)){const d=D[id];els.forEach(el=>{el.classList.toggle('ready',READY.has(id));if(['cb','ds','es','lbs','lvs'].includes(d.type)){el.classList.toggle('closed',d.state===1);el.classList.toggle('open',d.state!==1);
      const bl=el.querySelector('.blade');if(bl)bl.style.transform=d.state?'':'rotate(-35deg)';}
    el.classList.toggle('sel',id===SEL);});}
  const fx=(v,n=1)=>v.toFixed(n).replace('.',',');
  for(const L of LINES){const ln=SIM.lines[L];setM('ln'+L,ln.avail?`${fx(FLOW.lineP[L])} MW`:'GEEN SPANNING',ln.avail?'mh':'bad');}
  setM('bb',EN.has('BB')?`${fx(FLOW.U110)} kV`:'0 kV');
  TR.forEach(Tn=>{const t=D[Tn];setM('tr'+Tn,`${fx(t.S)} MVA ${Math.round(t.S/(t.fans?t.rAF:t.rON)*100)}%`);
    setM('to'+Tn,t.blocked?'86 BLOKKADE':`${Math.round(t.oil)}°C · t${t.tap}${t.avr==='auto'?'A':'H'}`,t.blocked||t.oil>90?'bad':'m');});
  setM('rt'+RES,`stand ${D[RES].ratio} kV${D[RES].ratioBusy?'…':''}`);
  BUS_IDS.forEach(b=>setM(b,`${fx(FLOW.U[b],2)} kV`));
  RING.stations.forEach(s=>{const on=EN.has(s.node),u=nodeU(s.node);setM('fi'+s.id,s.flag?'⚑':'');setM('stc'+s.id,`${s.cust>=1000?fx(s.cust/1000)+'k':s.cust} kl`);setM('stp'+s.id,on?`${fx(s.P,2)} MW`:'UIT',on?'m':'bad');setM('stu'+s.id,on?`${fx(u,2)} kV`:'',u<9.9?'bad':'');});
  RING.secs.forEach(s=>(SLD.byNode[s.node]||[]).forEach(el=>{el.classList.toggle('ovl',s.load>0.85&&s.load<=1);el.classList.toggle('ovl2',s.load>1);}));
  FEEDERS.filter(f=>f.ring).forEach(f=>setM('fa'+f.id,`V-${f.id} · rail ${BUS_BAND[railOf(f.sel)]?.[2]||'–'} · ${Math.round(D[f.cb].I)} A`));
  RING.secs.forEach(s=>setM('flt'+s.id,s.fault?'⚡':''));
  updateTabAlarms();
  FEEDERS.forEach(f=>{const on=EN.has(f.node);setM('f'+f.id,on?`${fx(f.P)} MW`:'UIT',on?(f.gen?'mh':'m'):'bad');setM('fc'+f.id,f.ring?'ring':f.gen?'productie':f.cust>=1000?`${fx(f.cust/1000)}k kl`:`${f.cust} kl`);});
}

// ============================================================ meldingen, toast, opdrachten
const READY=new Map();   // velden die weer geschakeld mogen worden (knipperen groen)
function readyNotice(text,id,cond){pushAlarm(text,'ok');AudioSys.ready();
  const n=$('#notice');n.innerHTML=`<b>✓ Klaar om te schakelen</b><span>${text}</span>`;n.classList.remove('show');void n.offsetWidth;n.classList.add('show');
  clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove('show'),8000);if(id)READY.set(id,cond||(()=>true));updateSLD();updateLabels(true);}
let alarmCount=0;
function pushAlarm(text,level='info'){
  recEvent(SIM.t,level,text);
  alarmCount++;const el=document.createElement('div');el.className=`al ${level} new`;
  el.innerHTML=`<span class="tm">${fmtClock(SIM.t)}</span><span class="lv"></span><span>${text}</span>`;
  const list=$('#alarmList');list.prepend(el);while(list.children.length>80)list.lastChild.remove();
  $('#alarmCnt').textContent=alarmCount;if(level==='crit'||level==='warn')AudioSys.alarm(level);
}
let toastT=0;
function deny(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2800);AudioSys.deny();}
function renderTasks(){
  const body=$('#taskBody'),gh=gameHeader();$('#taskTitle').textContent=GAME.lesson?'Les':GAME.mode==='free'?'Werkopdracht':MODES[GAME.mode].scen?'Scenario':'Dienst & werkopdracht';
  if(GAME.lesson){$('#taskCode').textContent='';const h=lessonPanel();if(body._les!==h){body._les=h;body.innerHTML=h;}return;}
  if(!TASK&&!GAME.tasks){$('#taskCode').textContent='';body.innerHTML=gh||'<div class="idle">Geen werkopdrachten in dit scenario.</div>';return;}
  if(!TASK){$('#taskCode').textContent='';body.innerHTML=gh+`<div class="idle">Geen actieve werkopdracht. Houd de installatie in de gaten en reageer op meldingen.<br><br><b style="color:var(--text)">Volgende opdracht</b> rond ${fmtClock(SIM.nextTaskAt)}.</div>`;return;}
  $('#taskCode').textContent=TASK.code;
  if(TASK.pool&&TASK.briefMode&&!TASK.approved){body.innerHTML=gh+`<h3>${TASK.title}</h3><p>${TASK.desc}</p><div class="bf-status">📝 Schakelbrief in de maak${TASK.tries?` · ${TASK.tries}× afgekeurd`:''} – stappen verborgen tot goedkeuring</div><button class="primary bf-open" data-brief>Schakelbrief verder opstellen</button>`;return;}
  const bf=!TASK.pool?'':TASK.approved?'<div class="bf-status ok">✓ Eigen schakelbrief goedgekeurd</div>':(TASK.i===0?'<button class="bf-opt" data-brief>📝 Zelf een schakelbrief opstellen (optioneel, +40)</button>':'');
  const ab=TASK.aborted?'':`<button class="bf-opt ab" data-abort>${TASK.abortAsk&&performance.now()-TASK.abortAsk<4000?'⏹ Zeker? Klik nogmaals om het werk te staken':'⏹ Werk staken (bij een storing)'}</button>`;
  body.innerHTML=gh+`<h3>${TASK.title}</h3><p>${TASK.desc}</p>${bf}`+TASK.steps.map((s,i)=>`<div class="step ${i<TASK.i?'done':i===TASK.i?'cur':''}"><span class="b">${i<TASK.i?'✓':''}</span><span>${s.t}${i===TASK.i&&s.wait!=null&&s.until!=null?` <span class="tag">tot ${fmtClock(s.until)}</span>`:''}${i===TASK.i&&s.visit?` <span class="tag">${nearDev(s.visit)?'in beeld':Math.round(camera.position.distanceTo(VIEWS[s.visit].center))+' m'}</span>`:''}</span></div>`).join('')+ab;
}
$('#taskBody').addEventListener('click',e=>{if(e.target.closest('[data-lnext]')&&GAME.lesson&&!GAME.lesson.done)return lessonGo();if(!e.target.closest('[data-abort]')||!TASK)return;if(TASK.abortAsk&&performance.now()-TASK.abortAsk<4000)abortTask();else{TASK.abortAsk=performance.now();renderTasks();}});

// ============================================================ apparaatpaneel
let SEL=null,panelRows=[];
const fmtKV=v=>v>0?`${v.toFixed(v<20?2:1).replace('.',',')} kV`:'0 kV';
function bayName(d){const b=d.bay;if(!b)return 'OS Zuidwolde';const rs=RING.stations.find(s=>s.id===b);if(rs)return `10 kV-ring · ${rs.id} ${rs.name}`;if(b[0]==='L')return `Lijnveld ${b} · ${SIM.lines[b].name}`;if(/^T\d$/.test(b))return `Transformatorveld ${b}${b===RES?' · reserve':''}`;if(b==='K')return '10 kV-installatie';if(b==='WK')return '20 kV-installatie · rail C1/C2';const f=FEEDERS.find(f=>f.id===b);return `${is20(f.bus)?20:10} kV-veld ${b} · ${f.name} · rail ${BUS_BAND[railOf(f.sel)]?.[2]||'–'}`;}
function statusOf(d){
  if(d.type==='cb')return d.state?['INGESCHAKELD','on']:['UITGESCHAKELD','off'];
  if(d.type==='ds')return d.state?['GESLOTEN','on']:['OPEN','off'];
  if(d.type==='es')return d.state?['GEAARD','earth']:['OPEN','off'];
  if(d.type==='tr')return d.blocked?['GEBLOKKEERD','bad']:EN.has(d.a)?['IN BEDRIJF','on']:['SPANNINGSLOOS','off'];
  if(d.type==='line')return SIM.lines[d.line].avail?['ONDER SPANNING','on']:['SPANNINGSLOOS','bad'];
  return EN.has(d.node)?['ONDER SPANNING','on']:['SPANNINGSLOOS','off'];}
const fmtU=v=>`${v.toFixed(2).replace('.',',')} kV`;
function ringState(){const f=RING.secs.filter(s=>s.fault);return f.length?f.map(s=>`<span class="bad">FOUT ${secName(s)}</span>${s.located?' (gevonden)':''}`).join(', '):'in orde';}
function feederState(f){if(f.ring)return ringState();if(f.fault&&f.fault.stage==='search')return '<span class="bad">FOUT · foutzoeken</span>';if(f.fault)return `<span class="warnc">geïsoleerd · ${Math.round(f.cust*f.outFrac)} kl. wachten</span>`;return 'in orde';}
function rowsFor(d){const r=[],A=(k,f)=>r.push([k,f]);
  A('Status',()=>{const s=statusOf(d);return `<span class="chip ${s[1]}">${s[0]}</span>`;});
  if(['cb','ds','lbs','lvs'].includes(d.type))A('Spanning',()=>fmtKV(Math.max(nodeU(d.a),nodeU(d.b))));
  if(d.type==='mstr'){A('Belasting',()=>`${(d.id&&RING.stations.find(s=>s.id+'-TR'===d.id).P*1000).toFixed(0)} kW · ${Math.round(RING.stations.find(s=>s.id+'-TR'===d.id).P/trMW(RING.stations.find(s=>s.id+'-TR'===d.id))*100)}% van ${RING.stations.find(s=>s.id+'-TR'===d.id).kva} kVA`);A('LS-spanning',()=>`${Math.round(nodeU(d.b)*1000)} V`);}
  if(d.type==='lvs')A(d.lvg.kind==='ovl'?'Lantaarns':'Klanten',()=>d.lvg.kind==='ovl'?`${d.lvg.st.lamps||0} (schemerschakeling)`:d.lvg.cust.toLocaleString('nl-NL'));
  if(d.type==='lvs')A('Belasting',()=>`${(d.lvg.Pc*1000).toFixed(0)} kW`);
  if(d.type==='kiosk'){const s=d.st;A('Klanten',()=>s.cust.toLocaleString('nl-NL'));A('Straatverlichting',()=>`${s.lamps||0} lantaarns · ${EN.has(s.ovl)?(profile('ovl',hourOf())?'<span class="warnc">brandt</span>':'uit (dag)'):'<span class="bad">geen spanning</span>'}`);A('Belasting',()=>`${s.P.toFixed(2)} MW`);
    A('Gevoed via',()=>{const t=FLOW.TAG[s.node];return t&&t.cb?`${t.cb} (rail ${BUS_BAND[t.bus][2]})`:'<span class="bad">geen voeding</span>';});
    const kab=sec=>()=>sec?(EN.has(sec.node)?`<span class="${sec.load>1?'bad':sec.load>0.85?'warnc':''}">${Math.round(sec.I)} A · ${Math.round(sec.load*100)}%</span>`:'spanningsloos'):'—';
    A('Kabel links',kab(RING.secs.find(x=>x.b===s.id)));A('Kabel rechts',kab(RING.secs.find(x=>x.a===s.id)));
    A('Kortsluitverklikker',()=>s.flag?'<span class="warnc">⚑ AANGESPROKEN</span>':'normaal');}
  if(d.type==='es')A(d.cb?'Spanning kabelzijde':'Spanning lijnzijde',()=>fmtKV(nodeU(d.a)));
  if(['ct','sa','bb','line','kiosk'].includes(d.type))A('Spanning',()=>fmtKV(nodeU(d.node)));
  if(['cb','ds','ct','lbs'].includes(d.type))A('Stroom',()=>`${Math.round(D[d.ref||d.id].I)} A`);
  if(d.type==='cb'){A('Conditie',()=>`<span class="${d.stuck||cond(d)<0.25?'bad':cond(d)<0.4?'warnc':''}">${d.stuck?'VAST (weigering) · ':''}${Math.round(cond(d)*100)}%</span> · revisie ${d.year}`);A('Inschakelveer',()=>springOk(d)?'geladen':'<span class="warnc">laden…</span>');A('Schakelingen',()=>d.ops);}
  if(d.line)A('Herinschakeling (AR)',()=>(SIM.lines[d.line].ar?'IN bedrijf':'<span class="warnc">UIT bedrijf</span>')+` · dode tijd ${protTxt('dt',PROT.ln[d.line].dt)}`);
  if(d.feeder&&!d.feeder.gen)A('Beveiliging I>',()=>`${protTxt('pick',PROT.f[d.feeder.id].pick)} · t ${protTxt('tms',PROT.f[d.feeder.id].tms)}`);
  if(d.type==='tr')A('Thermische trip',()=>protTxt('trip',PROT.tr[d.id].trip)+(d.gas>0.5?' · <span class="bad">gasvorming!</span>':''));
  if(COUPLERS[d.id]){const [a,b,lim]=COUPLERS[d.id];A('Spanningsverschil',()=>EN.has(a)&&EN.has(b)?`<span class="${Math.abs(FLOW.U[a]-FLOW.U[b])>lim?'bad':''}">${Math.abs(FLOW.U[a]-FLOW.U[b]).toFixed(2).replace('.',',')} kV</span>`:'—');}
  if(d.type==='es'&&BUS_BAND[d.a])A('Rail',()=>BUSF[d.a]?'<span class="bad">RAILFOUT</span>':'in orde');
  if(d.type==='tr'){A('Belasting',()=>`${d.S.toFixed(1)} MVA · ${Math.round(d.S/(d.fans?d.rAF:d.rON)*100)}% van ${d.fans?d.rAF:d.rON} MVA`);
    if(d.id===RES)A('Wikkeling (omschakelaar)',()=>`<b style="color:var(--accent)">${d.ratio} kV</b>${d.ratioBusy?' · schakelt…':''}`);
    A('Spanning MS',()=>{const u=trafoUn(d.id);return d.Ulv>0?`<span class="${Math.abs(d.Ulv-u)>u*0.012?'warnc':''}">${fmtU(d.Ulv)}</span> (doel ${u.toFixed(2).replace('.',',')})`:'0 kV';});
    A('Trappenschakelaar',()=>`stand ${d.tap} / 17 · ${d.avr==='auto'?'AUTO':'<span class="warnc">HAND</span>'}${d.tapBusy?' · draait…':''}`);
    A('Circulatiestroom',()=>d.Sc>0.1?`<span class="warnc">${Math.round(d.Sc*55)} A</span>`:'—');
    A('Olietemperatuur',()=>`<span class="${d.oil>90?'bad':d.oil>75?'warnc':''}">${d.oil.toFixed(1)} °C</span>`);
    A('Koeling',()=>d.fanFail?'<span class="bad">ventilatoren defect · ONAN</span>':d.fans?'ONAF · ventilatoren aan':'ONAN');
    A('Blokkeerrelais 86',()=>d.blocked?`<span class="bad">${d.blockText}</span>${d.resettable?' · reset mogelijk':''}`:'normaal');}
  if(d.type==='line'){A('Vermogen',()=>`${FLOW.lineP[d.line].toFixed(1)} MW`);A('Opmerking',()=>SIM.lines[d.line].reason||'—');}
  if(d.type==='bb')A('Doorvoer',()=>`${FLOW.P110.toFixed(1)} MW`);
  if(d.id==='MS'){A('Rail A',()=>fmtKV(FLOW.U.RA)+(BUSF.RA?' <span class="bad">RAILFOUT</span>':''));A('Rail B',()=>fmtKV(FLOW.U.RB)+(BUSF.RB?' <span class="bad">RAILFOUT</span>':''));A('Totale belasting',()=>`${FLOW.load.toFixed(1)} MW`);A('Koppeling V-K',()=>D['V-K'].state?'gesloten':'open');A('Reserve V-T3',()=>D['V-T3'].state?'IN':'uit');}
  if(d.id==='MS20'){A('Rail C1',()=>fmtKV(FLOW.U.RC)+(BUSF.RC?' <span class="bad">RAILFOUT</span>':''));A('Rail C2',()=>fmtKV(FLOW.U.RD)+(BUSF.RD?' <span class="bad">RAILFOUT</span>':''));A('Koppeling W-K',()=>D['W-K'].state?'gesloten':'open');A('Netto belasting',()=>`${FLOW.load20.toFixed(1)} MW${FLOW.load20<0?' (teruglevering)':''}`);A('Voeding',()=>['W-T2','W-T3'].filter(id=>D[id].state).join(' + ')||'geen');}
  if(d.sel||(d.feeder&&!is20(d.feeder.bus))||d.id==='V-T1'||d.id==='V-T3'){const bay=d.sel?d.bay:d.feeder?d.feeder.id:d.tr;A('Railkeuze',()=>{const a=D[bay+'-QA'].state,b=D[bay+'-QB'].state;return a&&b?'<span class="warnc">rail A + B (omzetten)</span>':a?'rail A':b?'rail B':'<span class="bad">geen rail</span>';});}
  if(d.feeder){const f=d.feeder;A('Belasting',()=>`${f.P.toFixed(2)} MW${f.clp>1.03?` <span class="warnc">(+${Math.round((f.clp-1)*100)}% KLO)</span>`:''}`);A('Klanten',()=>f.ring?RING.stations.filter(s=>FLOW.TAG[s.node]?.cb===f.cb).reduce((a,s)=>a+s.cust,0).toLocaleString('nl-NL')+' (ring)':f.cust.toLocaleString('nl-NL'));
    A('Kabel',()=>feederState(f));A('Terugvoeding',()=>f.backfed?'<span class="warnc">actief (via net)</span>':'—');}
  if(d.type==='sa')A('Ontladingsteller',()=>d.count);
  if(['cb','ds','es','lbs'].includes(d.type))A('Vergrendeling',()=>{if(!SIM.interlock)return '<span class="warnc">UIT</span>';if(d.busy)return 'bezig…';const r=interlockCheck(d,d.state?0:1);return r?`<span class="warnc">${r.replace('Vergrendeling: ','')}</span>`:'vrij';});
  return r;}
function renderDevPanel(){
  const p=$('#devpanel');if(!SEL){p.classList.add('hidden');return;}
  const d=D[SEL];panelRows=rowsFor(d);
  let ctl='';
  if(d.type==='cb')ctl=`<div class="dp-ctl"><button class="b1" data-act="1">IN</button><button class="b0" data-act="0">UIT</button></div>`;
  else if(d.type==='ds'||d.type==='es'||d.type==='lbs')ctl=`<div class="dp-ctl"><button class="b1" data-act="1">SLUITEN</button><button class="b0" data-act="0">OPENEN</button></div>`;
  else if(d.type==='lvs')ctl=`<div class="dp-ctl"><button class="b1" data-act="1">IN</button><button class="b0" data-act="0">UIT</button></div>`;
  else if(d.type==='kiosk'){const s=d.st,ids=[s.id+'-L',s.id+'-R',s.id+'-T',...s.groups.map(g=>g.id)];
    ctl=`<div class="swlist">${ids.map(id=>`<div class="swr"><span><b>${id.slice(s.id.length+1)}</b>${D[id].type==='lvs'?D[id].lvg.name:D[id].label}</span><button class="b1" data-op="${id}:1">${D[id].type==='lvs'?'IN':'DICHT'}</button><button class="b0" data-op="${id}:0">${D[id].type==='lvs'?'UIT':'OPEN'}</button></div>`).join('')}</div>`;}
  else if(d.type==='tr')ctl=`<div class="dp-ctl"><button data-act="avr"></button><button data-act="tap-1" title="Trap lager">▼ trap</button><button data-act="tap1" title="Trap hoger">▲ trap</button></div>`;
  const sub=[];if(VIEWS[SEL])sub.push(`<button data-act="fly">Bekijk in 3D</button>`);if(d.type==='bld')sub.push(`<button data-act="inside">Ga naar binnen</button>`);if(d.type==='bld'||VIEWS[SEL]?.inside)sub.push(`<button data-act="scada">Toon in SCADA</button>`);
  if(d.type==='tr')sub.push(`<button data-act="reset">Reset blokkeerrelais 86</button>`);
  if(d.type==='tr'||d.line||(d.feeder&&!d.feeder.gen))sub.push(`<button data-act="prot">Beveiligingsinstellingen</button>`);
  if(d.type==='kiosk')sub.push(`<button data-act="kin">Naar binnen (rondlopen)</button>`,`<button data-act="lvsend">Monteur sturen (LS-storing)</button>`);
  if(d.id===RES)sub.push(`<button data-act="ratio10">Omschakelen → 10 kV</button>`,`<button data-act="ratio20">Omschakelen → 20 kV</button>`);
  const ln=d.line||(d.type==='line'&&d.line);if(d.line)sub.push(`<button data-act="ar"></button>`);
  if(d.feeder)sub.push(`<button data-act="sel:${d.feeder.id}-Q8">Aardschakelaar ${d.feeder.id}-Q8</button>`);
  const selBay=d.sel?d.bay:Object.keys(SEL_BAYS).find(b=>SEL_BAYS[b].cb===d.id)||null;
  if(selBay)sub.push(...['QA','QB'].filter(q=>d.id!==selBay+'-'+q).map(q=>`<button data-act="sel:${selBay}-${q}">Railkeuze ${q.slice(1)} (${selBay}-${q})</button>`));
  if(d.sel)sub.push(`<button data-act="sel:${d.cb}">Naar ${d.cb}</button>`);
  if(d.type==='es'&&BUS_BAND[d.a])sub.push(`<button data-act="sel:${d.a==='RC'?'W-T2':'W-T3'}">Inkomend veld</button>`,`<button data-act="sel:W-K">Koppeling W-K</button>`);
  if(d.type==='es'&&d.cb)sub.push(`<button data-act="sel:${d.cb}">Naar ${d.cb}</button>`);
  p.innerHTML=`<div class="dp-head"><div><div class="dp-id">${d.id}</div><div class="dp-type">${d.label}</div></div><button class="x" data-act="x" title="Sluiten (Esc)">✕</button></div>
    <div class="dp-bay">${bayName(d)}</div><div class="dp-rows">${panelRows.map((r,i)=>`<div class="row"><span>${r[0]}</span><b data-r="${i}"></b></div>`).join('')}</div>${ctl}${sub.length?`<div class="dp-sub" style="flex-wrap:wrap">${sub.join('')}</div>`:''}`;
  p.classList.remove('hidden');refreshDevPanel();}
function refreshDevPanel(){if(!SEL)return;const p=$('#devpanel'),d=D[SEL];
  p.querySelectorAll('[data-r]').forEach(el=>{const v=panelRows[+el.dataset.r][1]();if(el._v!==v){el._v=v;el.innerHTML=v;}});
  p.querySelectorAll('[data-act="1"],[data-act="0"]').forEach(b=>{b.classList.toggle('cur',String(d.state)===b.dataset.act);b.disabled=d.busy;});
  p.querySelectorAll('[data-op]').forEach(b=>{const [id,v]=b.dataset.op.split(':');b.classList.toggle('cur',String(D[id].state)===v);});
  const avr=p.querySelector('[data-act="avr"]');if(avr)avr.textContent=d.avr==='auto'?'AUTO → HAND':'HAND → AUTO';
  p.querySelectorAll('[data-act^="tap"]').forEach(b=>b.disabled=d.avr==='auto'||d.tapBusy);
  const rs=p.querySelector('[data-act="reset"]');if(rs)rs.disabled=!d.blocked;p.querySelectorAll('[data-act^="ratio"]').forEach(b=>b.disabled=d.ratioBusy||b.dataset.act==='ratio'+d.ratio);
  const ar=p.querySelector('[data-act="ar"]');if(ar)ar.textContent=SIM.lines[d.line].ar?'AR uitzetten':'AR aanzetten';}
$('#devpanel').addEventListener('click',e=>{const op=e.target.closest('[data-op]');if(op){const [id,v]=op.dataset.op.split(':');operate(id,+v);return;}
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const a=b.dataset.act;
  if(a==='1'||a==='0')operate(SEL,+a);else if(a==='x')selectDevice(null);else if(a==='fly')flyToDevice(SEL);else if(a==='inside'){const v=VIEWPOS[SEL==='MS20'?6:5];flyTo(v[0].clone(),v[1].clone(),2);}
  else if(a.startsWith('ratio'))setRatio(a.slice(5));else if(a==='kin')enterKiosk(SEL);else if(a==='lvsend')dispatchLV(SEL);
  else if(a==='avr')setAVR(SEL,D[SEL].avr==='auto'?'hand':'auto');else if(a.startsWith('tap'))tapStep(SEL,+a.slice(3));
  else if(a==='reset')resetLockout(SEL);else if(a==='prot')openProt();else if(a==='ar')toggleAR(D[SEL].line);else if(a.startsWith('sel:'))selectDevice(a.slice(4));
  else if(a==='scada'){$('#scada').classList.remove('min');$('#scada').animate([{boxShadow:'0 0 0 3px #f0a43a'},{boxShadow:'0 0 0 0 transparent'}],{duration:900});}});
function selectDevice(id){SEL=id&&D[id]?id:null;const tabs=SEL&&SLD.devTab[SEL];if(tabs&&!tabs.has(SLD.tab))setTab([...tabs][0]);renderDevPanel();updateSLD();
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
    const vis=L.v.inside===ins&&_p.z<1&&dist<(['line','bld','bb','kiosk'].includes(L.d.type)?260:120)&&Math.abs(_p.x)<1.05&&Math.abs(_p.y)<1.05;
    if(!vis){if(L.el.style.display!=='none')L.el.style.display='none';continue;}
    if(L.el.style.display==='none')L.el.style.display='';
    L.el.style.transform=`translate(${((_p.x+1)/2*w).toFixed(1)}px,${((1-_p.y)/2*h).toFixed(1)}px) translate(-50%,-100%)`;
    const d=L.d;const c=(d.type==='es'?(d.state?'earth':'open'):['cb','ds','lbs','lvs'].includes(d.type)?(d.state?'':'open'):d.type==='tr'?(EN.has(d.a)?'':'open'):d.type==='line'?(SIM.lines[d.line].avail?'':'open'):'info')+(d.id===SEL?' sel':'')+(READY.has(d.id)?' ready':'');
    if(c!==L.cls||force){L.cls=c;L.el.className='lbl '+c;}}}
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function pickAt(cx,cy){ndc.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);ray.setFromCamera(ndc,camera);
  const ins=camInside();const hits=ray.intersectObjects(pickables,false).filter(h=>h.object.userData.inside===ins);if(!hits.length)return null;const d0=hits[0].distance;
  return hits.filter(h=>h.distance<d0+8).sort((a,b)=>a.object.userData.vol-b.object.userData.vol)[0].object.userData.devId;}
let downXY=null,hoverId=null,moveEv=null;
renderer.domElement.addEventListener('pointerdown',e=>{downXY=[e.clientX,e.clientY];fly=null;});
renderer.domElement.addEventListener('pointerup',e=>{if(FP.on||!downXY||e.button!==0)return;if(Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1])<5)selectDevice(pickAt(e.clientX,e.clientY));downXY=null;});
renderer.domElement.addEventListener('pointermove',e=>{moveEv=e;});
renderer.domElement.addEventListener('pointerleave',()=>{moveEv=null;hoverId=null;hovBox.visible=false;$('#tooltip').style.display='none';});
function updateHover(){if(FP.on||!moveEv)return;const e=moveEv;moveEv=null;const id=e.buttons?null:pickAt(e.clientX,e.clientY);const tt=$('#tooltip');
  if(id!==hoverId){hoverId=id;hovBox.visible=!!id&&id!==SEL;if(id)hovBox.box.copy(VIEWS[id].box).expandByScalar(0.15);renderer.domElement.style.cursor=id?'pointer':'';}
  if(id){const d=D[id];const s=statusOf(d);tt.innerHTML=`<b>${id}</b> · ${d.label}<br><span style="color:var(--muted)">${s[0].toLowerCase()} · klik om te bedienen</span>`;tt.style.display='block';tt.style.left=(e.clientX+14)+'px';tt.style.top=(e.clientY+14)+'px';}
  else tt.style.display='none';}

// ============================================================ camera
const VIEWPOS=[[V3(100,52,118),V3(22,3,8)],[V3(-4,13,-2),V3(-30,5,-22)],[V3(88,17,14),V3(32,3,32)],[V3(64,11,32),V3(30,3,50)],[V3(22.1,215,34),V3(22,0,10)],
  [V3(-2.2,2.5,47.6),V3(0.4,1.6,54.2)],[V3(58.8,2.5,47.6),V3(61.4,1.6,54.2)],[V3(30,95,330),V3(10,0,175)],[V3(40,90,470),V3(30,0,330)]];
let fly=null;
function flyTo(pos,target,dur=1.5){if(FP.on)exitFP();fly={t:0,dur,p0:camera.position.clone(),t0:controls.target.clone(),p1:pos,t1:target};controls.autoRotate=false;}
function fmtClock(t){const m=((t%1440)+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.floor(m%60)).padStart(2,'0')}`;}

// ============================================================ thermografie: hotspot zichtbaar met de warmtebeeldcamera
const HOTSPR=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,4,64,64,62);
  gr.addColorStop(0,'rgba(255,255,220,1)');gr.addColorStop(0.25,'rgba(255,180,40,0.9)');gr.addColorStop(0.6,'rgba(255,60,0,0.45)');gr.addColorStop(1,'rgba(120,0,80,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false,blending:THREE.AdditiveBlending}));s.visible=false;s.renderOrder=999;scene.add(s);return s;})();
function updateHotspot(){const id=TASK&&TASK.hot,on=!!id&&(TASK.found||nearDev(id));HOTSPR.visible=on;if(!on)return;
  const v=VIEWS[id];HOTSPR.position.copy(v.center).setY(v.box.max.y-0.6);const k=1.6+0.35*Math.sin(performance.now()/180);HOTSPR.scale.set(k,k,1);}
