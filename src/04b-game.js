
// ============================================================ spelmodi, score en scenario's
const DIFFS={rustig:{label:'Rustig',ev:1.6,perm:0.2},normaal:{label:'Normaal',ev:1,perm:0.35},zwaar:{label:'Zwaar',ev:0.6,perm:0.5}};
const GAME={mode:'free',diff:'normaal',score:1000,ended:false,events:true,tasks:true,storm:0,endT:null,t0:0,obj:[],flags:{},countdown:null,
  stats:{fast:0,thermal:0,volt:0,recloseFault:0,clpTrips:0,maxOil:0,hospMin:0}};
const TOTAL_CUST=FEEDERS.reduce((s,f)=>s+f.cust,0);
const at=(min,fn)=>SIM.timers.push({at:GAME.t0+min,fn});
const setCB=(id,s)=>{D[id].state=s;};
const noIncidents={t:'Geen veiligheidsincidenten',check:()=>SIM.incidents?'fail':null,final:()=>!SIM.incidents};

const MODES={
  free:{name:'Vrije dienst',tag:'Eindeloos',start:9,desc:'Speel zo lang je wilt. Storingen en werkopdrachten komen vanzelf.'},
  day:{name:'Dagdienst',tag:'Dienst · 8 uur',start:7,dur:480,desc:'07:00–15:00. Ochtendpiek, werkopdrachten en storingen. Afsluiten met een dienstrapport.'},
  eve:{name:'Avonddienst',tag:'Dienst · 8 uur',start:15,dur:480,desc:'15:00–23:00. De zware avondpiek en kassen die ’s avonds gaan belichten.'},
  zkh:{scen:true,name:'Kabelstoring ziekenhuis',tag:'Scenario · makkelijk',start:10,dur:50,
    desc:'Een rustige ochtend… tot T1 uitvalt en het ziekenhuis op noodstroom overgaat.',
    setup(){pushAlarm('Rustige ochtend in OS Zuidwolde. Fijne dienst!','info');
      at(1,()=>{feederFault('F5',14);trafoFault('T1');GAME.flags.tripAt=SIM.t;GAME.flags.fuelEnd=SIM.t+25;
        GAME.countdown={label:'Noodstroom ziekenhuis',until:SIM.t+25};pushAlarm('Ziekenhuis: noodstroomaggregaat gestart – brandstof voor ±25 minuten!','crit');});},
    obj:()=>[
      {t:'Ziekenhuis terug op het net vóór de noodstroom op is',check:()=>GAME.flags.fuelEnd==null?null:EN.has('F5')?'done':SIM.t>GAME.flags.fuelEnd?'fail':null},
      {t:'Woonwijken (F3 en F4) binnen 5 min na de trip hersteld',check:()=>GAME.flags.tripAt==null?null:EN.has('F3')&&EN.has('F4')?'done':SIM.t>GAME.flags.tripAt+5?'fail':null},
      {t:'Niet inschakelen op de kabelfout',check:()=>GAME.stats.recloseFault?'fail':null,final:()=>true},noIncidents]},
  storm:{scen:true,name:'Storm boven Drenthe',tag:'Scenario · gemiddeld',start:16,dur:90,
    desc:'Onweersbuien trekken over de lijnen en het AR-relais van L2 is defect. Houd het licht aan.',
    setup(){GAME.storm=1;lastEnvElev=-999;Object.assign(SIM.lines.L2,{ar:false,arBroken:true});
      pushAlarm('KNMI: code oranje – zware onweersbuien met windstoten boven Drenthe','warn');
      pushAlarm('Storing: AR-relais L2 defect – na een afschakeling moet je L2-Q0 zelf inschakelen','warn');
      at(2,()=>lineFault('L1',false));at(9,()=>lineFault('L2',false));at(16,()=>feederFault('F3'));at(24,()=>lineFault('L1',true));
      at(31,()=>lineFault('L2',false));at(45,()=>feederFault('F6'));at(58,()=>lineFault('L2',false));at(70,()=>feederFault('F1'));at(80,()=>lineFault('L1',false));},
    obj:()=>[{t:'Overleef 90 minuten storm',final:()=>true},
      {t:'Ziekenhuis nooit langer dan 5 min zonder net',check:()=>GAME.flags.hospRun>5?'fail':null,final:()=>true},
      {t:'Minder dan 40.000 klantminuten',check:()=>SIM.cml>40000?'fail':null,final:()=>SIM.cml<=40000},noIncidents]},
  piek:{scen:true,name:'Avondpiek op één poot',tag:'Scenario · gemiddeld',start:16.5,dur:150,
    desc:'T1 staat in onderhoud en reservetrafo T3 (25 MVA) draagt de hele 10 kV. De avondpiek komt eraan: houd T3 heel, de kassen hebben een afschakelbaar contract.',
    setup(){setCB('T1-Q0',0);setCB('V-T1',0);setCB('T1-Q1',0);setCB('V-T3',1);setCB('V-K',1);
      Object.assign(D.T1,{blocked:true,resettable:false,blockText:'onderhoud trappenschakelaar',blockKind:'maint'});D.T3.oil=62;FEEDERS[5].interruptible=true;
      pushAlarm('T1 staat uit bedrijf voor onderhoud – gereed verwacht rond 17:50. Reservetransformator T3 voedt de 10 kV.','info');
      pushAlarm('Glastuinbouw Oost (F6) heeft een afschakelbaar contract: afschakelen kost maar 10% klantminuten','info');
      at(80,()=>{D.T1.resettable=true;readyNotice('Onderhoud T1 gereed – reset blokkeerrelais 86, sluit T1-Q1 en neem T1 weer in bedrijf','T1',()=>D.T1.blocked);});},
    obj:()=>[{t:'T3 wordt niet thermisch afgeschakeld',check:()=>GAME.stats.thermal?'fail':null,final:()=>true},
      {t:'Ziekenhuis (F5) blijft onder spanning',check:()=>GAME.flags.hospRun>1?'fail':null,final:()=>true},
      {t:'T1 vóór 18:30 weer in bedrijf',check:()=>EN.has('T1l')&&D['V-T1'].state?'done':SIM.t>18.5*60?'fail':null},
      {t:'Minder dan 15.000 klantminuten',check:()=>SIM.cml>15000?'fail':null,final:()=>SIM.cml<=15000}]},
  blackout:{scen:true,name:'Black-out',tag:'Scenario · moeilijk',start:6.33,dur:45,
    desc:'Landelijke storing: het station is volledig zwart. Bouw alles weer op, veld voor veld.',
    setup(){for(const L of['L1','L2'])Object.assign(SIM.lines[L],{avail:false,reason:'landelijke storing (black-out)'});
      Object.values(D).forEach(d=>{if(d.type==='cb')d.state=0;});D.T1.oil=D.T2.oil=24;
      FEEDERS.forEach(f=>{f.offSince=SIM.t-120;f.unplanned=true;});
      GAME.countdown={label:'Deadline volledig herstel',until:SIM.t+30};
      pushAlarm('BLACK-OUT: landelijke storing in het 380 kV-net – OS Zuidwolde volledig spanningsloos','crit');
      pushAlarm('Alle vermogenschakelaars zijn door onderspanning uitgeschakeld. Wacht op TenneT.','info');
      at(2,()=>{Object.assign(SIM.lines.L2,{avail:true,reason:''});pushAlarm('TenneT: lijn L2 Meppel onder spanning – start het herstel. Tip: velden één voor één, let op koude-lastopname','ok');});
      at(14,()=>{Object.assign(SIM.lines.L1,{avail:true,reason:''});pushAlarm('TenneT: lijn L1 Hoogeveen onder spanning','ok');});},
    obj:()=>[{t:'Ziekenhuis (F5) binnen 12 min terug',check:()=>EN.has('F5')?'done':SIM.t>GAME.t0+12?'fail':null},
      {t:'Alle klanten binnen 30 min terug',check:()=>SIM.off===0?'done':SIM.t>GAME.t0+30?'fail':null},
      {t:'Geen beveiligingsafschakeling tijdens herstel',check:()=>GAME.stats.clpTrips||GAME.stats.thermal||GAME.stats.recloseFault?'fail':null,final:()=>true},noIncidents]},
};

function award(pts,text){GAME.score+=pts;if(!text)return;const el=document.createElement('div');el.className='sf '+(pts>=0?'plus':'min');
  el.textContent=`${pts>0?'+':''}${pts}  ${text}`;$('#scoreFeed').prepend(el);setTimeout(()=>el.remove(),4200);}
function incident(){SIM.incidents++;award(-150,'Veiligheidsincident');}
function restoreTrack(f,on){if(!on){f.unplanned=!SIM.manualFlag;f.wait=0;return;}
  if(f.unplanned){const w=f.wait||0;if(w<=15){GAME.stats.fast++;award(40,`${f.id} bliksemsnel hersteld`);}else if(w<=40){GAME.stats.fast++;award(20,`${f.id} snel hersteld`);}f.unplanned=false;}}

function applyMode(id){
  const m=MODES[id]||MODES.free;GAME.mode=MODES[id]?id:'free';const df=DIFFS[GAME.diff]||DIFFS.normaal;
  SIM.t=(params.get('t')?parseFloat(params.get('t')):m.start)*60;GAME.t0=SIM.t;GAME.endT=m.dur?SIM.t+m.dur:null;
  GAME.events=!m.scen;GAME.tasks=!m.scen;SIM.nextEvent=SIM.t+16*df.ev;SIM.nextTaskAt=m.scen?Infinity:SIM.t+3;
  FEEDERS.forEach(f=>{f.unplanned=false;f.wait=0;});
  initTaps();m.setup&&m.setup();
  GAME.obj=m.obj?m.obj().map(o=>({...o,state:null})):[];
  computeFlows();FEEDERS.forEach(f=>{f.wasOn=EN.has(f.node);});
  updateSky(hourOf());refreshAll();renderTasks();
}
function gameTick(dm,dtReal){
  if(GAME.ended)return;
  GAME.score-=FEEDERS.reduce((s,f)=>s+custOff(f)*(f.interruptible?0.1:1),0)*dm/500;
  const hosp=FEEDERS[4];
  if(!EN.has(hosp.node)&&!hosp.backfed){GAME.score-=5*dm;GAME.flags.hospRun=(GAME.flags.hospRun||0)+dm;GAME.stats.hospMin+=dm;}else GAME.flags.hospRun=0;
  TR.forEach(T=>GAME.stats.maxOil=Math.max(GAME.stats.maxOil,D[T].oil));
  const canRestore=SIM.lines.L1.avail||SIM.lines.L2.avail;
  FEEDERS.forEach(f=>{if(f.unplanned&&!EN.has(f.node)&&canRestore&&!(f.fault&&f.fault.stage==='search'))f.wait=(f.wait||0)+dtReal;});
  GAME.obj.forEach(o=>{if(o.state||!o.check)return;const r=o.check();if(!r)return;o.state=r;
    if(r==='done'){award(100,'Doel behaald');pushAlarm(`Doel behaald: ${o.t}`,'ok');}else{award(-150,'Doel gemist');pushAlarm(`Doel gemist: ${o.t}`,'warn');}});
  if(GAME.countdown&&GAME.obj.every(o=>o.state))GAME.countdown=null;
  if(GAME.storm&&Math.random()<dtReal/14)lightningAt(V3(rnd(-1500,1500),0,rnd(-1600,-300)),rnd(2500,5000));
  if(GAME.endT&&SIM.t>=GAME.endT)endGame();
}
function grade(s){return s>=1400?['A+',5]:s>=1250?['A',4]:s>=1100?['B',3]:s>=950?['C',2]:s>=750?['D',1]:['E',0];}
function finalizeGame(){if(GAME.ended)return;GAME.ended=true;SIM.paused=true;
  GAME.obj.forEach(o=>{if(o.state)return;const ok=o.final?o.final():false;o.state=ok?'done':'fail';award(ok?100:-150);});
  if(!SIM.incidents&&SIM.t-GAME.t0>=60)award(200,'Veilig gewerkt');}   // bonus pas na minimaal een uur dienst
function saveBest(){const s=Math.round(GAME.score),best=getBest(GAME.mode,GAME.diff),rec=s>best;if(rec){try{localStorage.setItem(bestKey(GAME.mode,GAME.diff),s);}catch(e){}}return {s,best,rec};}
function endGame(){finalizeGame();syncSpeed();showReport();}
function bestKey(id,diff){return `osz-best-${id}-${diff}`;}
function getBest(id,diff){try{return +localStorage.getItem(bestKey(id,diff))||0;}catch(e){return 0;}}
function showReport(){
  const m=MODES[GAME.mode],s=Math.round(GAME.score),[g,stars]=grade(s),st=GAME.stats;
  const {best,rec}=saveBest();
  const badges=[];
  if(!SIM.incidents)badges.push(['Veilig gewerkt','geen enkel veiligheidsincident']);
  if(st.hospMin<0.01)badges.push(['Zorgzaam','het ziekenhuis bleef aan het net']);
  if(st.fast>=3)badges.push(['Snelle hersteller',`${st.fast}× snel hersteld`]);
  if(!st.thermal)badges.push(['Koel hoofd','geen thermische transformatortrip']);
  if(SIM.tasksDone>=2)badges.push(['Planner',`${SIM.tasksDone} werkopdrachten afgerond`]);
  const rows=[['Klantminuten (CML)',Math.round(SIM.cml).toLocaleString('nl-NL')],['Uitvalduur per klant',`${(SIM.cml/TOTAL_CUST).toFixed(1).replace('.',',')} min`],
    ['Veiligheidsincidenten',SIM.incidents],['Werkopdrachten',SIM.tasksDone],['Snelle herstellingen',st.fast],['Thermische trips',st.thermal],
    ['Spanningsafwijkingen',st.volt],['Hoogste olietemperatuur',`${Math.round(st.maxOil)} °C`]];
  $('#report').innerHTML=`<div class="card rep">
    <div class="eyebrow">${m.scen?'Scenario afgerond':'Dienstrapport'} · ${DIFFS[GAME.diff].label}</div><h2>${m.name}</h2>
    <div class="rep-top"><div class="grade g${g.replace('+','p')}">${g}</div><div><div class="rs">${s.toLocaleString('nl-NL')} <span>punten</span></div>
      <div class="stars">${'★'.repeat(stars)}<span>${'★'.repeat(5-stars)}</span></div>${rec?'<div class="rec">Nieuw record!</div>':best?`<div class="prev">Beste score: ${best.toLocaleString('nl-NL')}</div>`:''}</div></div>
    ${GAME.obj.length?`<div class="rep-h">Doelen</div>${GAME.obj.map(o=>`<div class="step ${o.state==='done'?'done':'fail'}"><span class="b">${o.state==='done'?'✓':'✕'}</span><span>${o.t}</span></div>`).join('')}`:''}
    <div class="rep-h">Statistieken</div><div class="rep-grid">${rows.map(r=>`<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>
    ${badges.length?`<div class="rep-h">Badges</div><div class="badges">${badges.map(b=>`<div class="badge"><b>${b[0]}</b><span>${b[1]}</span></div>`).join('')}</div>`:''}
    <div class="rep-btns"><button class="primary" data-r="again">Opnieuw spelen</button><button data-r="menu">Hoofdmenu</button><button data-r="cont">Vrij doorspelen</button></div></div>`;
  $('#report').classList.remove('hidden');
}
$('#report').addEventListener('click',e=>{const b=e.target.closest('[data-r]');if(!b)return;const a=b.dataset.r;
  if(a==='again')location.search=`?play=${GAME.mode}&diff=${GAME.diff}`;
  else if(a==='menu')location.search='';
  else{$('#report').classList.add('hidden');GAME.endT=null;GAME.ended=false;GAME.events=true;GAME.tasks=true;GAME.countdown=null;SIM.nextTaskAt=SIM.t+5;setSpeed(60);}});
function renderMenu(){
  const card=id=>{const m=MODES[id],b=getBest(id,GAME.diff);return `<button class="mode" data-mode="${id}"><span class="mt">${m.tag}</span><b>${m.name}</b><span class="md">${m.desc}</span>${b?`<span class="mb">Beste: ${b.toLocaleString('nl-NL')} (${grade(b)[0]})</span>`:''}</button>`;};
  $('#menu').innerHTML=`<div class="mh">Dienst draaien</div><div class="mgrid">${['free','day','eve'].map(card).join('')}</div>
    <div class="mh">Scenario's</div><div class="mgrid">${['zkh','storm','piek','blackout'].map(card).join('')}</div>`;
  document.querySelectorAll('#diff button').forEach(b=>b.classList.toggle('on',b.dataset.d===GAME.diff));
}
const fmtDur=min=>min>=60?`${Math.floor(min/60)}:${String(Math.floor(min%60)).padStart(2,'0')} u`:`${Math.max(0,Math.ceil(min))} min`;
function gameHeader(){if(GAME.mode==='free')return '';const m=MODES[GAME.mode];
  let h=`<div class="gh"><div class="gt"><span>${m.scen?'Scenario':'Dienst'} · ${m.name}</span>${GAME.endT?`<span class="tag">nog ${fmtDur(GAME.endT-SIM.t)}</span>`:''}</div>`;
  if(GAME.countdown&&SIM.t<GAME.countdown.until){const left=GAME.countdown.until-SIM.t;h+=`<div class="gcd ${left<5?'hot':''}">${GAME.countdown.label}<b>${fmtDur(left)}</b></div>`;}
  h+=GAME.obj.map(o=>`<div class="step ${o.state==='done'?'done':o.state==='fail'?'fail':''}"><span class="b">${o.state==='done'?'✓':o.state==='fail'?'✕':''}</span><span>${o.t}</span></div>`).join('');
  return h+'</div>';}
