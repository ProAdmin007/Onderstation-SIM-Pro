
// ============================================================ laagspanning, noodaggregaten, rotatie en klantcommunicatie
// Bij een grote uitval verdien je punten terug met acties: herstelbonus, noodaggregaten, eerlijk rouleren en goed informeren.
// De LS is een eigen netvlak: LS-velden per station, kabelkasten tussen buurstations en de spanning per straat (zonnepanelen).
// LS is niet op afstand bedienbaar: lokaal (rondlopen) of via een monteur.

// ---- zonnepanelen op woningen (±1,2 kWp per woning gemiddeld) en de lengte van de straat (spanningsverandering)
LVG.filter(g=>g.kind==='res').forEach((g,i)=>{g.pv=g.cust*0.0012;g.kz=[0.075,0.09,0.06,0.085,0.055,0.07][i%6];});
LVG.forEach(g=>{g.kz??=0.05;g.U=0;});
RING.stations.forEach(s=>{s.tapLv=0;});
const LVBUS={};RING.stations.forEach(s=>{LVBUS[s.node+'v']=s;});
// belasting per distributietrafo: ook LS-groepen van een buurstation die via een kabelkast meedraaien
function stationLoads(){RING.stations.forEach(s=>{s.P=0;});
  LVG.forEach(g=>{if(!g.Pc)return;let n=g.node;while(n&&FLOW.TAG[n]){const s=LVBUS[n];if(s){s.P+=g.Pc;break;}n=FLOW.TAG[n].parent;}});}
const lvSource=g=>{let n=g.node;while(n&&FLOW.TAG[n]){if(LVBUS[n])return LVBUS[n];n=FLOW.TAG[n].parent;}return null;};

// ---- LS-koppelingen: kabelkasten tussen twee straten van buurstations (normaal open, zekering 400 A ≈ 0,28 MW)
const LS_LINKS=[['KK12','MS1-G2','MS2-G1'],['KK23','MS2-G2','MS3-G1'],['KK34','MS3-G4','MS4-G1'],['KK45','MS4-G2','MS5-G5'],['KK67','MS6-G3','MS7-G2']].map(([id,a,b])=>{
  const d=dev(id,{type:'lvs',lslink:true,bay:D[a].bay,label:`LS-koppeling (kabelkast) ${a} ↔ ${b}`,a,b,state:0,rate:0.28,I:0});
  (ADJ[a]??=[]).push(d);(ADJ[b]??=[]).push(d);return d;});
const linkLoad=d=>d.state!==1?0:Math.abs(EN.has(d.a)&&FLOW.TAG[d.b]?.parent===d.a?FLOW.NL?.[d.b]||0:FLOW.TAG[d.a]?.parent===d.b?FLOW.NL?.[d.a]||0:0);

// ---- LS-vergrendeling: niet parallel via het LS-net, en niet via de distributietrafo het MS-net terugvoeden
function lsInterlock(d,to){if(to!==1)return null;
  if(d.lslink){const ea=EN.has(d.a),eb=EN.has(d.b);
    if(ea&&eb)return 'Vergrendeling (LS): beide kanten onder spanning – twee distributietrafo\'s via het LS-net parallel schakelen is niet toegestaan';
    const dead=ea?d.b:eb?d.a:null;
    if(dead&&D[dead].state===1)return `Vergrendeling (LS): open eerst LS-veld ${dead} in ${D[dead].bay} – anders voed je via de distributietrafo het MS-net terug`;
    return null;}
  if(d.lvg&&EN.has(d.b))return EN.has(d.a)?'Vergrendeling (LS): deze straat hangt aan een kabelkast naar een ander station – open eerst de koppeling (parallel niet toegestaan)'
    :'Vergrendeling (LS): deze straat wordt via een kabelkast gevoed – open eerst de koppeling, anders voed je het station terug';
  const s=RING.stations.find(x=>x.id+'-T'===d.id);if(s&&s.gs)return `Vergrendeling: het noodaggregaat bij ${s.id} is nog aangesloten – laat het eerst afkoppelen (LS-venster, N)`;
  return null;}

// ---- spanning per straat: nullast 420 V bij 10,5 kV, vaste trap van de distributietrafo ±2,5% per stand,
// daling door afname en stijging door teruglevering van zonnepanelen (langere straat = groter effect)
const U_NOM=230,U_MAX=253,U_MIN=207;
function lvVolt(g){if(g.backfed&&g.st.gs?.state==='aan')return 231;const src=lvSource(g);if(!src||!EN.has(g.node))return 0;
  const Ums=FLOW.UN?.[src.node]||10.5,ref=Math.max(g.base*1.2,g.cust*0.0011,0.02);   // referentie: de eigen belasting van de straat of het bedrijf
  return U_NOM*1.052*(Ums/10.5)*(1+0.025*src.tapLv)*(1-g.kz*(g.Pc||0)/ref);}

// ---- noodaggregaten: drie mobiele aggregaten van 400 kVA
const GENSET={units:3,kva:400,busy:0};
const gsCap=()=>GENSET.kva*0.95/1000;
const gsLoad=s=>s.groups.reduce((a,g)=>a+(D[g.id].state===1?Math.max(0,g.demand||0):0),0);

// ---- monteursopdrachten in de LS (schakelen, aggregaat, vaste trap)
const LS_ORDERS=[],LS_CREW={};let lsSeq=0;
function lsPlace(o){const s=RING.stations.find(x=>x.id===o.st);return s?{box:VIEWS[s.id]?.box,from:V3(s.pos[0]+6,0,s.pos[1]-8)}:{};}
function lsOrder(kind,stId,args,label){
  const here=(LS_CREW[stId]||-99)>SIM.t-15||LS_ORDERS.some(o=>o.st===stId),travel=kind==='gs'?rnd(15,25):here?rnd(1.5,3):rnd(7,11);
  const o={id:++lsSeq,kind,st:stId,args:args||{},at:SIM.t+travel,label};LS_ORDERS.push(o);
  pushAlarm(`Monteur ${here?'ter plaatse bij':'onderweg naar'} ${stId}: ${label} (±${Math.round(travel)} min)`,'op');
  const p=lsPlace(o);if(p.box&&!LITE)crewDispatch({box:p.box,n:1,say:label,from:p.from,until:()=>!LS_ORDERS.includes(o)&&SIM.t>o.at+4});
  renderLS?.();return o;}
// LS-schakelaar bedienen vanaf afstand: een monteur doet het
function lsSwitchOrder(id,to){const d=D[id];if(!d||d.state===to)return;
  if(LS_ORDERS.some(o=>o.kind==='sw'&&o.args.id===id))return deny(`Er is al een monteur onderweg voor ${id}`);
  lsOrder('sw',d.bay,{id,to},`${d.lslink?'kabelkast '+id:'LS-veld '+id} ${to?'IN':'UIT'}`);}
function lsExec(o){const s=RING.stations.find(x=>x.id===o.st);LS_CREW[o.st]=SIM.t;
  if(o.kind==='sw'){const d=D[o.args.id],to=o.args.to;if(d.state===to)return;
    computeFlows();const why=SIM.interlock?interlockCheck(d,to):null;
    if(why)return pushAlarm(`Monteur ${o.st}: ${d.id} niet geschakeld – ${why}`,'warn');
    operate(d.id,to,{crew:true,radio:true});return pushAlarm(`Monteur ${o.st}: ${d.id} ${to?'ingeschakeld':'uitgeschakeld'}`,'ok');}
  if(o.kind==='gs'){if(EN.has(s.node+'v')){GENSET.busy--;return pushAlarm(`Monteur ${s.id}: het station heeft weer spanning – aggregaat niet meer nodig, terug naar de werf`,'info');}
    if(D[s.id+'-T'].state===1){D[s.id+'-T'].state=0;D[s.id+'-T'].ops++;}
    s.gs={state:'aan',at:SIM.t,ot:0};s.genset=true;computeFlows();
    const L=gsLoad(s)/gsCap();return pushAlarm(`Noodaggregaat bij ${s.id} draait (${s.id}-T geopend) – belasting ${Math.round(L*100)}% van 400 kVA${L>1?': te zwaar! Schakel LS-groepen af':''}`,L>1?'warn':'ok');}
  if(o.kind==='gsrestart'){if(s.gs?.state==='trip'){s.gs.state='aan';s.gs.ot=0;s.genset=true;pushAlarm(`Noodaggregaat bij ${s.id} herstart`,'ok');}return;}
  if(o.kind==='gsoff'){if(!s.gs)return;s.gs=null;s.genset=false;s.groups.forEach(g=>{g.backfed=false;});addTimer(20,()=>{GENSET.busy=Math.max(0,GENSET.busy-1);renderLS?.();});
    computeFlows();if(EN.has(s.node)&&!D[s.id+'-T'].state&&!s.fuse){D[s.id+'-T'].state=1;D[s.id+'-T'].ops++;computeFlows();}
    return pushAlarm(`Noodaggregaat bij ${s.id} afgekoppeld${D[s.id+'-T'].state?` en ${s.id}-T weer gesloten – het station draait op het net`:''}`,'ok');}
  if(o.kind==='tap'){computeFlows();if(D[s.id+'-T'].state===1&&EN.has(s.node))return pushAlarm(`Monteur ${s.id}: de vaste trap kan alleen spanningsloos – open eerst ${s.id}-T (voed klanten zo nodig via een kabelkast of aggregaat)`,'warn');
    const old=s.tapLv;s.tapLv=clamp(s.tapLv+o.args.dir,-2,2);
    pushAlarm(`Monteur ${s.id}: vaste trap distributietrafo ${old} → ${s.tapLv} (${s.tapLv>0?'+':''}${(s.tapLv*2.5).toFixed(1).replace('.',',')}%) – sluit ${s.id}-T weer`,'ok');
    if(s.groups.some(g=>g.ovAt&&SIM.t-g.ovAt<90)&&o.args.dir<0&&!s.ovFixed){s.ovFixed=SIM.t;award(30,'Spanningsklacht opgelost');}}}

// acties vanuit het LS-venster
function gsSend(s){if(GENSET.busy>=GENSET.units)return deny('Alle noodaggregaten zijn in gebruik');if(stationLive(s))return deny(`${s.id} heeft spanning – een aggregaat is niet nodig`);
  if(s.gs||s.genset||LS_ORDERS.some(o=>o.kind==='gs'&&o.st===s.id))return deny(`Er staat of komt al een aggregaat bij ${s.id}`);GENSET.busy++;lsOrder('gs',s.id,{},'noodaggregaat 400 kVA aansluiten');}
function gsOff(s){if(!s.gs)return;if(LS_ORDERS.some(o=>o.kind==='gsoff'&&o.st===s.id))return;lsOrder('gsoff',s.id,{},'noodaggregaat afkoppelen');}
function gsRestart(s){if(s.gs?.state!=='trip')return;lsOrder('gsrestart',s.id,{},'noodaggregaat herstarten');}
function tapOrder(s,dir){const t=s.tapLv+dir;if(t<-2||t>2)return deny('De vaste trap gaat van −2 tot +2');lsOrder('tap',s.id,{dir},`vaste trap distributietrafo ${dir<0?'omlaag':'omhoog'}`);}
// ---- klantcommunicatie: verwachte hersteltijd per gebied en prioriteitsklanten bellen
const lsAreas=()=>[...RING.stations,...FEEDERS.filter(f=>!f.ring&&!f.gen&&f.cust>0)];
const areaOff=a=>a.groups?!stationLive(a)&&a.groups.some(g=>g.cust>0&&!g.backfed):!EN.has(a.node)&&!a.backfed;
const areaCust=a=>a.groups?a.groups.reduce((n,g)=>n+(g.backfed?0:g.cust),0):a.cust;
const PRIO=()=>CONS.filter(c=>c.cust>0&&(c.prio||c.kind==='hosp'));
function setEta(a,min){if(!a.aOff)return deny('Dit gebied heeft stroom');const first=!a.eta;a.eta=SIM.t+min;a.etaAt=SIM.t;
  if(first)award(SIM.t-a.aOffAt<=10?10:3,'Hersteltijd doorgegeven');
  pushAlarm(`📢 Verwachte hersteltijd ${a.id} ${a.name}: ${fmtClock(a.eta)} – ook op het storingsbandje en op de website`,'op');renderLS?.();}
function callPrio(c){if(c.called||!c.lsOff)return;c.called=true;const fast=SIM.t-c.lsOffAt<=10;award(fast?20:5,'Prioriteitsklant geïnformeerd');
  pushAlarm(`☎ Jij → ${c.name}: storing bekend${(c.st||c).eta?`, verwacht herstel ${fmtClock((c.st||c).eta)}`:''}. ${c.kind==='hosp'||c.prio?'Noodstroom aan, wij houden u op de hoogte.':''}`,'radio');renderLS?.();}

// ---- rotatie: bij te weinig transformatorcapaciteit zelf groepen afschakelen en rouleren
const shortage=()=>SIM.t<(GAME.flags.shortUntil||0);
const shedFactor=c=>c.shed&&SIM.t-c.lsOffAt<=45?0.5:1;   // aangekondigde afschakeling telt de eerste 45 min half

function lsTick(dm){if(!dm)return;
  // capaciteitstekort: een 110/10 kV-trafo boven 88%
  TR.forEach(T=>{const t=D[T];if(!EN.has(T+'h'))return;if(t.S/(t.fans&&!t.fanFail?t.rAF:t.rON)>0.88)GAME.flags.shortUntil=SIM.t+30;});
  // monteursopdrachten die klaar zijn
  for(const o of LS_ORDERS.filter(o=>SIM.t>=o.at)){LS_ORDERS.splice(LS_ORDERS.indexOf(o),1);lsExec(o);}
  // noodaggregaten
  RING.stations.forEach(s=>{const gs=s.gs;if(!gs)return;
    if(gs.state==='aan'){s.groups.forEach(g=>{g.backfed=D[g.id].state===1;});const k=gsLoad(s)/gsCap();gs.load=k;
      GAME.stats.gsEur=(GAME.stats.gsEur||0)+dm/60*90;GAME.score-=dm/60*0.9;
      if(k>1.1){gs.ot+=dm;if(gs.ot>2){gs.state='trip';gs.ot=0;s.genset=false;s.groups.forEach(g=>{g.backfed=false;});award(-20,`Aggregaat ${s.id} overbelast`);
        pushAlarm(`Noodaggregaat bij ${s.id} overbelast (${Math.round(k*100)}%) en uitgevallen – schakel LS-groepen af en herstart het (LS-venster, N)`,'crit');}}
      else gs.ot=Math.max(0,gs.ot-dm);
      if(EN.has(s.node)&&!gs.told){gs.told=true;readyNotice(`${s.id}: het MS-net heeft weer spanning – laat het noodaggregaat afkoppelen (LS-venster, N)`,null);}}});
  // kabelkasten: zekering smelt bij langdurige overbelasting
  LS_LINKS.forEach(d=>{const P=linkLoad(d);d.I=P*1443;const k=P/d.rate;d.load=k;
    if(k>1.05){d.ot=(d.ot||0)+dm*(k-1)*4;if(d.ot>3){d.ot=0;d.state=0;GAME.stats.kkFuse=(GAME.stats.kkFuse||0)+1;award(-15,`Zekering kabelkast ${d.id}`);
      pushAlarm(`Kabelkast ${d.id}: zekering gesmolten door overbelasting (${Math.round(k*100)}%) – de koppeling kan maar ±280 kW aan`,'warn');computeFlows();}}
    else d.ot=Math.max(0,(d.ot||0)-dm*0.5);});
  // spanning per straat en de gevolgen
  LVG.forEach(g=>{const U=g.U=lvVolt(g);
    if(g.pv&&U>U_MAX&&!(g.pvTrip>SIM.t)){g.ovT=(g.ovT||0)+dm;if(g.ovT>1){g.ovT=0;g.pvTrip=SIM.t+10;g.ovAt=SIM.t;GAME.stats.pvTrips=(GAME.stats.pvTrips||0)+1;award(-3,'Omvormers uit door overspanning');
      if(!g.ovWarn||SIM.t-g.ovWarn>60){g.ovWarn=SIM.t;pushAlarm(`${g.st.id} ${g.name}: ${Math.round(U)} V (max. 253 V) – omvormers van zonnepanelen schakelen af. Verlaag de vaste trap van de distributietrafo (LS-venster, N)`,'warn');}
      callFrom(g,'pv');}}else if(U<=U_MAX)g.ovT=0;
    if(U>0&&U<U_MIN){GAME.score-=dm*0.4;g.uvT=(g.uvT||0)+dm;if(g.uvT>2&&(!g.uvWarn||SIM.t-g.uvWarn>60)){g.uvWarn=SIM.t;pushAlarm(`${g.st.id} ${g.name}: onderspanning ${Math.round(U)} V (min. 207 V) – verhoog de vaste trap of verlaag de belasting`,'warn');}}else g.uvT=0;});
  // herstelbonus, rotatie en hersteltijden
  let bonus=0,rot=0;const lang=[];
  CONS.forEach(c=>{if(c.gen||!c.cust)return;const off=!c.backfed&&!EN.has(c.node);
    if(off&&!c.lsOff){c.lsOff=true;c.lsOffAt=SIM.t;c.lsManual=SIM.manualFlag;c.shed=SIM.manualFlag&&shortage();c.shedWarn=false;c.called=false;}
    else if(!off&&c.lsOff){c.lsOff=false;const dur=SIM.t-c.lsOffAt;
      if(c.shed){if(dur>=10&&dur<=75)rot+=Math.max(3,c.cust/80);c.shed=false;}
      else if(!c.lsManual&&dur>0.5)bonus+=c.cust/60*(dur<=20?1.5:dur<=60?1:0.5)+(c.prio||c.kind==='hosp'?15:0);}
    if(c.lsOff&&c.shed&&!c.shedWarn&&SIM.t-c.lsOffAt>45){c.shedWarn=true;lang.push(c.st?c.st.id:c.id);}});
  if(bonus>=1)award(Math.round(bonus),'Herstelbonus: klanten weer aan');
  if(rot>=1)award(Math.round(rot),'Rotatie: afgeschakelde klanten weer aan');
  if(lang.length)pushAlarm(`Klanten in ${[...new Set(lang)].join(', ')} al 45 min afgeschakeld – rouleer: schakel een andere groep af en deze weer in`,'warn');
  lsAreas().forEach(a=>{const off=areaOff(a);
    if(off&&!a.aOff){a.aOff=true;a.aOffAt=SIM.t;a.eta=null;}
    else if(!off&&a.aOff){a.aOff=false;if(a.eta){const n=Math.max(5,Math.round(a.cust/150));
      if(SIM.t<=a.eta+2)award(n,`Hersteltijd ${a.id} gehaald`);else{award(-n,`Hersteltijd ${a.id} niet gehaald`);pushAlarm(`${a.id} ${a.name}: later hersteld dan de doorgegeven tijd (${fmtClock(a.eta)})`,'warn');}}a.eta=null;}});}
