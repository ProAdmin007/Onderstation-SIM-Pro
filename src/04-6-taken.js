
// Werkopdrachten: definities, haalbaarheid, aanbieden, uitvoeren en staken
// ---------------------------------------------------------- werkopdrachten
let TASK=null,taskSeq=411;
function lineTask(L){const ln=SIM.lines[L];return{line:L,onAbort:()=>{if(ln.maint){ln.maint=false;addTimer(3,()=>lineRestore(L));}},crew:()=>({box:VIEWS[L+'-Q9'].box,say:`Onderhoud scheider ${L}-Q9`,rel:[L+'-Q9',L+'-Q8',L+'-Q1',L+'-Q0']}),title:`Onderhoud lijnveld ${L} (${ln.name})`,desc:`Monteurs gaan scheider ${L}-Q9 smeren en inspecteren. Schakel het veld vrij en aard de lijn.`,steps:[
  {t:`Schakel ${L}-Q0 UIT`,act:[L+'-Q0',0],why:'Eerst de vermogenschakelaar uit: alleen die kan de belastingstroom onderbreken.',ok:()=>D[L+'-Q0'].state===0},
  {t:`Open lijnscheider ${L}-Q9`,act:[L+'-Q9',0],grp:'open',why:'Scheiders pas openen of sluiten als de vermogenschakelaar van het veld uit staat.',ok:()=>D[L+'-Q9'].state===0},
  {t:`Open railscheider ${L}-Q1`,act:[L+'-Q1',0],grp:'open',why:'Scheiders pas openen of sluiten als de vermogenschakelaar van het veld uit staat.',ok:()=>D[L+'-Q1'].state===0,done:()=>{ln.maint=true;pushAlarm(`TenneT: verzoek ontvangen – lijn ${L} wordt aan de overzijde vrijgeschakeld`,'info');
    addTimer(3,()=>{if(!ln.maint)return;if(ln.avail){ln.avail=false;ln.reason='vrijgeschakeld voor werkzaamheden';}pushAlarm(`TenneT: lijn ${L} spanningsloos – aarden toegestaan`,'info');});}},
  {t:'Wacht op TenneT: lijn spanningsloos',ok:()=>!ln.avail},
  {t:`Sluit aardschakelaar ${L}-Q8`,act:[L+'-Q8',1],why:'Pas aarden als alles open is en de kabel of lijn spanningsloos is. Wacht op TenneT.',ok:()=>D[L+'-Q8'].state===1,done:()=>pushAlarm(`Werkvergunning afgegeven – werkzaamheden ${L} gestart`,'info')},
  {t:'Werkzaamheden in uitvoering…',wait:40},
  {t:`Werk gereed – open aardschakelaar ${L}-Q8`,act:[L+'-Q8',0],why:'Eerst de aarding opheffen – anders schakel je straks in op een geaard deel.',ok:()=>D[L+'-Q8'].state===0,done:()=>{ln.maint=false;addTimer(3,()=>{ln.avail=true;ln.reason='';pushAlarm(`TenneT: lijn ${L} weer onder spanning`,'ok');});}},
  {t:'Wacht op TenneT: lijn onder spanning',ok:()=>ln.avail},
  {t:`Sluit railscheider ${L}-Q1`,act:[L+'-Q1',1],grp:'dicht',why:'Scheiders pas openen of sluiten als de vermogenschakelaar van het veld uit staat.',ok:()=>D[L+'-Q1'].state===1},
  {t:`Sluit lijnscheider ${L}-Q9`,act:[L+'-Q9',1],grp:'dicht',why:'Scheiders pas openen of sluiten als de vermogenschakelaar van het veld uit staat.',ok:()=>D[L+'-Q1'].state&&D[L+'-Q9'].state},
  {t:`Schakel ${L}-Q0 IN`,act:[L+'-Q0',1],why:'Als laatste de vermogenschakelaar weer inschakelen.',ok:()=>D[L+'-Q0'].state===1}]};}
function feederTask(F){const f=FEEDERS.find(x=>x.id===F);return{feeder:F,afterAbort:()=>{if(f.backfed)addTimer(4,()=>{f.backfed=false;pushAlarm(`Storingsdienst: terugvoeding ${F} opgeheven`,'ok');});},title:`Kabelwerk ${F} (${f.name})`,desc:`Een kabelploeg vervangt een mof in ${F}. De storingsdienst schakelt de klanten eerst om via het net; daarna kun je het veld vrijschakelen en de kabel aarden.`,steps:[
  {t:'Wacht: storingsdienst schakelt klanten om (terugvoeding)',wait:6,done:()=>{f.backfed=true;pushAlarm(`Storingsdienst: klanten van ${F} omgeschakeld via het net – ${f.cb} mag UIT`,'info');}},
  {t:`Schakel ${f.cb} UIT`,act:[f.cb,0],why:'Eerst het veld uitschakelen (de klanten zijn omgeschakeld).',ok:()=>D[f.cb].state===0},
  {t:`Sluit aardschakelaar ${F}-Q8 (kabelzijde)`,act:[F+'-Q8',1],why:'Pas aarden als alles open is en de kabel of lijn spanningsloos is.',ok:()=>D[F+'-Q8'].state===1,done:()=>pushAlarm(`Werkvergunning afgegeven – kabelwerk ${F} gestart`,'info')},
  {t:'Kabelwerk in uitvoering…',wait:35},
  {t:`Werk gereed – open ${F}-Q8`,act:[F+'-Q8',0],why:'Eerst de aarding opheffen – anders schakel je straks in op een geaard deel.',ok:()=>D[F+'-Q8'].state===0},
  {t:`Schakel ${f.cb} IN`,act:[f.cb,1],why:'Als laatste het veld weer inschakelen.',ok:()=>D[f.cb].state===1&&EN.has(f.node),done:()=>addTimer(4,()=>{f.backfed=false;pushAlarm(`Storingsdienst: terugvoeding ${F} opgeheven – normale situatie`,'ok');})}]};}
function reserveTask(main){const r=main==='T1'?'10':'20',lvM=TR_LV[main][0],lvR=r==='10'?'V-T3':'W-T3',rail=r==='10'?'rail A/B':'rail C1/C2';
  return{tr:main,crew:()=>({box:VIEWS[main].box,say:`Onderhoud ${main}`,rel:[main+'-Q0',main+'-Q1',lvM]}),title:`Onderhoud ${main} met reservetransformator`,desc:`${main} gaat uit bedrijf voor ${main==='T1'?'onderhoud aan de trappenschakelaar':'oliebemonstering'}. Neem eerst reservetransformator T3 op ${r} kV in bedrijf, zodat de klanten niets merken.`,steps:[
  {t:`Zorg dat T3 op ${r} kV staat (omschakelaar, alleen spanningsloos)`,ok:()=>D.T3.ratio===r},
  {t:'Zet T3 onder spanning (T3-Q1 en T3-Q0 IN)',ok:()=>EN.has('T3h')},
  {t:`Schakel ${lvR} IN – ${main} en T3 parallel op ${rail}`,act:[lvR,1],why:'Eerst de reserve parallel bijschakelen, zodat de klanten niets merken.',ok:()=>D[lvR].state===1},
  {t:`Schakel ${lvM} UIT`,act:[lvM,0],why:'Pas als de reserve meedraait het MS-veld van de hoofdtrafo uitschakelen.',ok:()=>D[lvM].state===0},
  {t:`Schakel ${main}-Q0 UIT (110 kV)`,act:[main+'-Q0',0],why:'Daarna de transformator aan de 110 kV-kant afschakelen.',ok:()=>D[main+'-Q0'].state===0},
  {t:`Open railscheider ${main}-Q1`,act:[main+'-Q1',0],why:'Scheiders pas openen of sluiten als de vermogenschakelaar van het veld uit staat.',ok:()=>D[main+'-Q1'].state===0,done:()=>pushAlarm(`Werkvergunning afgegeven – onderhoud ${main} gestart`,'info')},
  {t:'Onderhoud in uitvoering…',wait:30},
  {t:`Werk gereed – sluit ${main}-Q1`,act:[main+'-Q1',1],why:'Terug in omgekeerde volgorde: eerst de railscheider, met de vermogenschakelaar nog uit.',ok:()=>D[main+'-Q1'].state===1},
  {t:`Schakel ${main}-Q0 IN`,act:[main+'-Q0',1],why:'Dan de transformator aan de 110 kV-kant onder spanning brengen.',ok:()=>D[main+'-Q0'].state===1},
  {t:`Schakel ${lvM} IN`,act:[lvM,1],why:'Het MS-veld pas inschakelen als de transformator onder spanning staat.',ok:()=>D[lvM].state===1},
  {t:`Schakel ${lvR} UIT – T3 terug naar warme reserve`,act:[lvR,0],why:'Als laatste de reserve weer afschakelen.',ok:()=>D[lvR].state===0}]};}
// onderhoud rail B (10 kV): alle velden onder last naar rail A omzetten, rail B vrij en geaard
const RB_BAYS=['F4','F5','F6','T3'];
const canRailB=()=>D['V-K'].state===1&&EN.has('RB')&&!BUSF.RB&&!BUSF.RA&&RB_BAYS.every(b=>D[b+'-QB'].state===1&&D[b+'-QA'].state===0)&&['F1','F2','F3','T1'].every(b=>D[b+'-QA'].state===1&&D[b+'-QB'].state===0);
function railBTask(){const sw=(q,to,grp,why)=>RB_BAYS.map(b=>({t:`${to?'Sluit':'Open'} railkeuzescheider ${b}-${q}`,act:[b+'-'+q,to],grp,why,ok:()=>D[b+'-'+q].state===to}));
  return{bus:'RB',title:'Onderhoud rail B (10 kV)',crew:()=>({box:VIEWS.MS.box,say:'Onderhoud rail B',rel:['V-K','RB-Q8',...RB_BAYS.flatMap(b=>[b+'-QA',b+'-QB'])]}),
    desc:'Rail B krijgt een inspectie. Dankzij het dubbelrailsysteem merkt niemand er iets van: zet alle velden van rail B onder last over naar rail A (koppeling V-K blijft dicht), open dan V-K en aard rail B.',steps:[
  ...sw('QA',1,'qa','Met V-K gesloten mag een veld onder last ook op de andere rail: eerst de railkeuzescheider naar rail A sluiten.'),
  ...sw('QB',0,'qb','Daarna de railkeuzescheider naar rail B openen – de stroom loopt al via rail A.'),
  {t:'Schakel railkoppeling V-K UIT – rail B spanningsloos',act:['V-K',0],why:'Pas als alle velden van rail B af zijn de koppeling openen.',ok:()=>D['V-K'].state===0},
  {t:'Sluit railaardschakelaar RB-Q8',act:['RB-Q8',1],why:'Pas aarden als de rail aan alle kanten vrij en spanningsloos is.',ok:()=>D['RB-Q8'].state===1,done:()=>pushAlarm('Werkvergunning afgegeven – onderhoud rail B gestart','info')},
  {t:'Onderhoud rail B in uitvoering…',wait:40},
  {t:'Werk gereed – open RB-Q8',act:['RB-Q8',0],why:'Eerst de aarding opheffen.',ok:()=>D['RB-Q8'].state===0},
  {t:'Schakel V-K IN – rail B weer onder spanning',act:['V-K',1],why:'De koppeling sluiten: rail B komt onder spanning en de rails zijn weer gekoppeld.',ok:()=>D['V-K'].state===1},
  ...sw('QB',1,'qb2','Velden weer terug naar rail B: eerst de railkeuzescheider naar rail B sluiten.'),
  ...sw('QA',0,'qa2','Dan de railkeuzescheider naar rail A openen – normale situatie.')]};}
// onderhoud railhelft C2: klanten van G3/G4 omschakelen, rail vrijmaken en aarden
function railTask(){const g3=FEEDERS.find(x=>x.id==='G3'),g4=FEEDERS.find(x=>x.id==='G4'),bf=v=>{g3.backfed=g4.backfed=v;};
  return{bus:'RD',title:'Onderhoud railhelft C2 (20 kV)',crew:()=>({box:VIEWS.MS20.box,say:'Onderhoud rail C2',rel:['W-K','W-G3','W-G4','RD-Q8','W-T3']}),
    desc:'Rail C2 krijgt een inspectie van de steunisolatoren en railverbindingen. De storingsdienst schakelt de klanten van G3 en G4 om via het net; daarna maak je rail C2 vrij en aard je hem.',
    afterAbort:()=>addTimer(4,()=>bf(false)),steps:[
  {t:'Wacht: storingsdienst schakelt klanten van G3 en G4 om (terugvoeding)',wait:6,done:()=>{bf(true);pushAlarm('Storingsdienst: klanten van G3 en G4 omgeschakeld via het net – W-G3 en W-G4 mogen UIT','info');}},
  {t:'Schakel W-G3 UIT',act:['W-G3',0],grp:'uit',why:'Eerst de uitgaande velden van de railhelft uitschakelen (de klanten zijn omgeschakeld).',ok:()=>D['W-G3'].state===0},
  {t:'Schakel W-G4 UIT',act:['W-G4',0],grp:'uit',why:'Eerst de uitgaande velden van de railhelft uitschakelen (de klanten zijn omgeschakeld).',ok:()=>D['W-G4'].state===0},
  {t:'Schakel railkoppeling W-K UIT – rail C2 spanningsloos',act:['W-K',0],why:'Dan de koppeling openen: rail C2 is nu aan alle kanten vrij.',ok:()=>D['W-K'].state===0},
  {t:'Sluit railaardschakelaar RD-Q8',act:['RD-Q8',1],why:'Pas aarden als de rail aan alle kanten vrij en spanningsloos is.',ok:()=>D['RD-Q8'].state===1,done:()=>pushAlarm('Werkvergunning afgegeven – onderhoud rail C2 gestart','info')},
  {t:'Onderhoud rail C2 in uitvoering…',wait:40},
  {t:'Werk gereed – open RD-Q8',act:['RD-Q8',0],why:'Eerst de aarding opheffen – anders schakel je in op een geaarde rail.',ok:()=>D['RD-Q8'].state===0},
  {t:'Schakel W-K IN – rail C2 weer onder spanning',act:['W-K',1],why:'Dan de rail weer onder spanning brengen via de koppeling.',ok:()=>D['W-K'].state===1},
  {t:'Schakel W-G3 IN',act:['W-G3',1],grp:'in',why:'Als laatste de uitgaande velden weer inschakelen.',ok:()=>D['W-G3'].state===1},
  {t:'Schakel W-G4 IN',act:['W-G4',1],grp:'in',why:'Als laatste de uitgaande velden weer inschakelen.',ok:()=>D['W-G4'].state===1},
  {t:'Wacht: storingsdienst heft de terugvoeding op',wait:3,done:()=>{bf(false);pushAlarm('Storingsdienst: terugvoeding G3/G4 opgeheven – normale situatie','ok');}}]};}
// onderhoud MS-station: klanten op een noodaggregaat, station uit de ring halen
function stationTask(){const s=pick(RING.stations.filter(x=>!x.ring.nop.startsWith(x.id+'-'))),nop=s.ring.nop,L=s.id+'-L',R=s.id+'-R',Tt=s.id+'-T',
    bf=v=>{s.groups.forEach(g=>g.backfed=v);s.genset=v;};
  return{station:s.id,title:`Onderhoud MS-station ${s.id} ${s.name}`,crew:()=>({box:VIEWS[s.id].box,say:`Onderhoud RMU ${s.id}`,from:V3(s.pos[0]+6,0,s.pos[1]-8),rel:[L,R,Tt]}),
    desc:`De schakelinstallatie (RMU) van ${s.id} krijgt groot onderhoud. Een monteur sluit eerst een noodaggregaat aan voor de ${s.cust.toLocaleString('nl-NL')} klanten. Sluit dan de ring en haal het station eruit.`,
    afterAbort:()=>addTimer(3,()=>bf(false)),steps:[
  {t:`Wacht: monteur sluit een noodaggregaat aan bij ${s.id}`,wait:8,done:()=>{bf(true);pushAlarm(`${s.id} ${s.name}: noodaggregaat draait – de klanten worden lokaal gevoed`,'info');}},
  {t:`Sluit het normaal-open punt ${nop}`,act:[nop,1],why:'Eerst de ring sluiten, zodat de stations verderop gevoed blijven als je dit station uit de ring haalt.',ok:()=>D[nop].state===1},
  {t:`Open transformatorschakelaar ${Tt}`,act:[Tt,0],why:'Dan de distributietransformator afschakelen – de klanten draaien op het aggregaat.',ok:()=>D[Tt].state===0},
  {t:`Open lastscheider ${L}`,act:[L,0],grp:'open',why:'Daarna het station aan beide kanten uit de ring halen.',ok:()=>D[L].state===0},
  {t:`Open lastscheider ${R}`,act:[R,0],grp:'open',why:'Daarna het station aan beide kanten uit de ring halen.',ok:()=>D[R].state===0,done:()=>pushAlarm(`Werkvergunning afgegeven – onderhoud ${s.id} gestart`,'info')},
  {t:'Onderhoud schakelinstallatie (RMU) in uitvoering…',wait:35},
  {t:`Werk gereed – sluit ${L}`,act:[L,1],grp:'dicht',why:'Na het werk het station weer in de ring opnemen.',ok:()=>D[L].state===1},
  {t:`Sluit ${R}`,act:[R,1],grp:'dicht',why:'Na het werk het station weer in de ring opnemen.',ok:()=>D[R].state===1},
  {t:`Sluit transformatorschakelaar ${Tt}`,act:[Tt,1],why:'Dan de transformator weer onder spanning brengen.',ok:()=>D[Tt].state===1},
  {t:`Open het normaal-open punt ${nop} weer`,act:[nop,0],why:'Als laatste het normaal-open punt openen: de ring is genormaliseerd.',ok:()=>D[nop].state===0},
  {t:'Wacht: monteur koppelt het noodaggregaat af',wait:3,done:()=>{bf(false);pushAlarm(`${s.id}: noodaggregaat afgekoppeld – klanten weer op het net`,'ok');}}]};}
// thermografie-ronde: zelf langs de installatie lopen of vliegen; een hotspot leidt tot een herstel-opdracht
const nearDev=id=>{const v=VIEWS[id];return !!v&&!camInside()&&camera.position.distanceTo(v.center)<(FP.on?10:18);};
const THERMO_C=[{id:'T1',ok:()=>canRes('T1'),rep:()=>reserveTask('T1'),where:'de 110 kV-doorvoer van T1'},{id:'T2',ok:()=>canRes('T2'),rep:()=>reserveTask('T2'),where:'de 110 kV-doorvoer van T2'},
  {id:'L1-Q9',ok:()=>canLine(),rep:()=>lineTask('L1'),where:'het contact van lijnscheider L1-Q9'},{id:'L2-Q9',ok:()=>canLine(),rep:()=>lineTask('L2'),where:'het contact van lijnscheider L2-Q9'}];
const canThermo=()=>THERMO_C.some(c=>c.ok());
function thermoTask(){const hot=pick(THERMO_C.filter(c=>c.ok())),others=['T1','T2','T3','L1-Q9','L2-Q9'].filter(id=>id!==hot.id).sort(()=>Math.random()-0.5).slice(0,2);
  const route=[hot.id,...others].sort(()=>Math.random()-0.5),temp=Math.round(rnd(78,112));
  const t={hot:hot.id,title:'Thermografie-ronde buiten',desc:'Loop (V) of vlieg met de camera langs de installatie en inspecteer de onderdelen met de warmtebeeldcamera. Kom dichtbij genoeg; vind je een hotspot, dan volgt meteen een herstelopdracht.',steps:route.map(id=>({visit:id,
    t:`Inspecteer ${id} met de warmtebeeldcamera (ga er dichtbij staan)`,ok:()=>nearDev(id),done:()=>{if(id!==hot.id)return pushAlarm(`Thermografie ${id}: geen afwijkingen`,'info');
      t.found=true;GAME.stats.hotspots=(GAME.stats.hotspots||0)+1;award(30,'Hotspot gevonden');pushAlarm(`Thermografie: hotspot van ${temp} °C op ${hot.where} – na de ronde direct vrijschakelen en herstellen`,'warn');
      const r=hot.rep();t.steps.push(...r.steps.map(s=>({...s})));['tr','line','crew','onAbort','afterAbort','feeder'].forEach(k=>{if(r[k])t[k]=r[k];});t.title='Thermografie → herstel '+hot.id;t.desc=r.desc;renderTasks();}}))};
  return t;}
let taskCycle=0;
// werkopdracht alleen aanbieden als de uitgangssituatie normaal is (geen storing of blokkering op de betrokken delen)
const canRes=T=>!D[T].blocked&&!D.T3.blocked&&D[T+'-Q0'].state===1&&EN.has(T+'h')&&TR_LV[T].every(id=>D[id].state===1)&&!D['V-T3'].state&&!D['W-T3'].state;
const canLine=()=>['L1','L2'].every(L=>SIM.lines[L].avail&&D[L+'-Q0'].state===1);
const canFeeder=F=>{const f=FEEDERS.find(x=>x.id===F);return D[f.cb].state===1&&!f.fault&&EN.has(f.node);};
const canRing=()=>!RING.secs.some(s=>s.fault)&&RING.stations.every(s=>EN.has(s.node))&&RINGS.every(rg=>D[rg.nop].state===0);
const canRail=()=>!D['W-T3'].state&&D['W-K'].state===1&&D['W-T2'].state===1&&EN.has('RD')&&!BUSF.RD&&canFeeder('G3')&&canFeeder('G4');
function offerTask(){const defs=[[()=>reserveTask('T2'),()=>canRes('T2')],[()=>ringTask(),canRing],[()=>lineTask('L2'),canLine],[()=>thermoTask(),canThermo],[()=>reserveTask('T1'),()=>canRes('T1')],
    [()=>railTask(),canRail],[()=>railBTask(),canRailB],[()=>feederTask('G3'),()=>canFeeder('G3')],[()=>stationTask(),canRing],[()=>feederTask('F5'),()=>canFeeder('F5')],[()=>lineTask('L1'),canLine]];
  computeFlows();let def=null;for(let k=0;k<defs.length&&!def;k++){const d=defs[taskCycle++%defs.length];if(d[1]())def=d[0];}
  if(!def){SIM.nextTaskAt=SIM.t+10;return;}   // nu niets veilig uit te voeren: later opnieuw
  TASK=def();TASK.i=0;TASK.code='WV-2026-'+(taskSeq++);briefInit(TASK);
  pushAlarm(`Nieuwe werkopdracht ${TASK.code}: ${TASK.title}`,'info');AudioSys.chime();renderTasks();}
function taskTick(){if(!TASK)return;let guard=0;
  while(TASK&&guard++<20){const st=TASK.steps[TASK.i];
    if(st.wait!=null){if(st.until==null){st.until=SIM.t+st.wait;const c=TASK.crew&&TASK.crew();if(c)crewDispatch({...c,until:()=>!TASK||TASK.steps[TASK.i]!==st});}if(SIM.t<st.until)break;}else if(!st.ok())break;
    st.done&&st.done();TASK.i++;
    if(TASK.i>=TASK.steps.length){if(TASK.aborted){award(30,'Normale situatie hersteld');pushAlarm(`${TASK.code}: normale situatie hersteld ✓`,'ok');TASK.afterAbort&&TASK.afterAbort();}
      else{SIM.tasksDone++;award(150,'Werkopdracht voltooid');pushAlarm(`Werkopdracht ${TASK.code} voltooid ✓`,'ok');}AudioSys.chime();TASK=null;SIM.nextTaskAt=SIM.t+rnd(50,90);}
    renderTasks();}}

// werk staken: wat al geschakeld is, in omgekeerde volgorde terugzetten
function abortTask(){const t=TASK;if(!t||t.aborted)return;
  const orig={},last={};t.steps.slice(0,t.i).filter(s=>s.act).forEach((s,k)=>{const [id,to]=s.act;if(!(id in orig))orig[id]=1-to;last[id]=k;});
  const ids=Object.keys(orig).filter(id=>D[id].state!==orig[id]).sort((a,b)=>last[b]-last[a]);
  t.onAbort&&t.onAbort();
  const emergency=SIM.off>0||TR.some(T=>D[T].blocked)||['L1','L2'].some(L=>!SIM.lines[L].avail&&!SIM.lines[L].maint)||Object.keys(BUSF).length>0;
  if(!emergency)award(-20,'Werk gestaakt');
  pushAlarm(`Werkopdracht ${t.code} gestaakt${emergency?' vanwege de storing':''} – ${ids.length?'zet de installatie terug in de normale toestand':'er was nog niets geschakeld'}`,'warn');
  if(!ids.length){t.afterAbort&&t.afterAbort();TASK=null;SIM.nextTaskAt=SIM.t+rnd(40,70);renderTasks();return;}
  TASK={aborted:true,code:t.code,tr:t.tr,feeder:t.feeder,afterAbort:t.afterAbort,i:0,title:'Werk gestaakt: '+t.title,
    desc:'De ploeg is van het werk gehaald. Zet de installatie terug in de normale toestand, in omgekeerde volgorde van het vrijschakelen.',
    steps:ids.map(id=>({t:'Herstel: '+actLabel(actKey([id,orig[id]])),act:[id,orig[id]],why:'Terug naar de normale situatie, in omgekeerde volgorde.',ok:()=>D[id].state===orig[id]}))};
  renderTasks();}
