
// ============================================================ opslaan en later verder spelen (vrije dienst en dag-/avonddienst)
// De toestand van de installatie wordt bewaard; geplande gebeurtenissen (reparaties, TenneT, monteurs) worden bij het hervatten
// opnieuw ingepland op basis van die toestand, want stukjes programma kun je niet opslaan.
var RESUMING=false;
const SAVE_KEY='osz-save',SAVE_V=1;
const BASE0=new Map(CONS.map(c=>[c.id,c.base]));   // normale belasting per afnemer (voor het opruimen van een lopend incident)
const KEYS={dev:['state','ops','wear','stuck','year','wearWarn','oil','tap','avr','fans','fanFail','blocked','resettable','blockText','blockKind','ratio','gas','hot'],
  feed:['relay','relayYear','relayKnown','fault','outFrac','clp','offSince','oc','temp','hotWarn','backfed','interruptible','base','unplanned','wait','wasOn'],
  lvg:['outFrac','lvf','backfed','cut','base','offSince','clp'],sec:['fault','located','temp','ovl','hot'],
  st:['flag','damaged','evac','fuse','genset','trOt','trWarn','unplanned','wait','wasOn']};
const grab=(o,keys)=>{const r={};keys.forEach(k=>{if(o[k]!==undefined)r[k]=o[k];});return r;};
const canSave=()=>['free','day','eve'].includes(GAME.mode)&&!GAME.ended&&!RP.on&&$('#intro').classList.contains('hidden');
// ---- werkopdracht: welk soort opdracht en met welke keuzes, zodat hij exact opnieuw te maken is
const TASKF={relayTask,cbMaintTask,thermoTask,stationTask,ringTask,lineTask,reserveTask,railTask,railBTask,feederTask};
function specOf(t){if(!t)return null;if(t.relayF)return['relayTask',t.relayF];if(t.cbm)return['cbMaintTask',t.cbm];if(t.hot)return['thermoTask',t.hot,t.route,t.temp];if(t.station)return['stationTask',t.station];
  if(t.sec)return['ringTask',t.sec];if(t.line)return['lineTask',t.line];if(t.tr)return['reserveTask',t.tr];if(t.bus==='RD')return['railTask'];if(t.bus==='RB')return['railBTask'];
  if(t.feeder)return['feederTask',t.feeder];return null;}
function taskSave(){const t=TASK;if(!t)return null;
  return{spec:t.aborted?null:specOf(t),origSpec:t.origSpec||null,i:t.i,code:t.code,until:t.steps.map(s=>s.until??null),found:!!t.found,kit:t.kit||null,approved:!!t.approved,briefMode:!!t.briefMode,tries:t.tries||0,brief:t.brief||null,
    aborted:t.aborted?{title:t.title,acts:t.steps.map(s=>s.act)}:null};}
function taskLoad(s){if(!s)return;
  if(s.aborted){const o=s.origSpec?TASKF[s.origSpec[0]](...s.origSpec.slice(1)):null;
    TASK={aborted:true,code:s.code,title:s.aborted.title,origSpec:s.origSpec,tr:o?.tr,feeder:o?.feeder,afterAbort:o?.afterAbort,i:s.i,
      desc:'De ploeg is van het werk gehaald. Zet de installatie terug in de normale toestand, in omgekeerde volgorde van het vrijschakelen.',
      steps:s.aborted.acts.map(([id,to])=>({t:'Herstel: '+actLabel(actKey([id,to])),act:[id,to],why:'Terug naar de normale situatie, in omgekeerde volgorde.',ok:()=>D[id].state===to}))};return;}
  if(!s.spec||!TASKF[s.spec[0]])return;const t=TASKF[s.spec[0]](...s.spec.slice(1));if(s.found&&t.reveal)t.reveal();if(s.kit&&t.kit){t.kit=s.kit;const w=t.steps.find(x=>/Relais vervangen/.test(x.t));if(w&&s.kit.verdict==='reject')w.wait=20;}
  t.code=s.code;t.i=s.i;briefInit(t);Object.assign(t,{approved:s.approved,briefMode:s.briefMode,tries:s.tries});if(s.brief)t.brief=s.brief;
  t.steps.forEach((st,k)=>{if(s.until[k]!=null)st.until=s.until[k];});TASK=t;
  const st=t.steps[t.i];if(st&&st.wait!=null&&st.until!=null&&t.crew){const c=t.crew();if(c)crewDispatch({...c,until:()=>!TASK||TASK.steps[TASK.i]!==st});}}
// ---- opslaan
function saveGame(silent){if(!canSave())return false;
  const data={v:SAVE_V,at:Date.now(),mode:GAME.mode,diff:GAME.diff,season:Object.keys(SEASONS).find(k=>SEASONS[k]===SEASON),
    SIM:{...grab(SIM,['t','speed','cml','incidents','tasksDone','nextEvent','nextTaskAt','interlock']),lines:JSON.parse(JSON.stringify(SIM.lines)),meppel:{...SIM.meppel}},
    GAME:{...grab(GAME,['score','stats','flags','endT','t0','countdown','planCb','hold']),obj:GAME.obj.map(o=>o.state)},
    ho:GAME.handover?GAME.handover.items.map(i=>({id:i.id,done:!!i.done,f:grab(i,['L','until'])})):null,hoOp:GAME.handover?.op,
    D:Object.fromEntries(Object.values(D).map(d=>[d.id,grab(d,KEYS.dev)])),F:Object.fromEntries(FEEDERS.map(f=>[f.id,grab(f,KEYS.feed)])),
    LV:Object.fromEntries(LVG.map(g=>[g.id,grab(g,KEYS.lvg)])),SEC:Object.fromEntries(RING.secs.map(s=>[s.id,grab(s,KEYS.sec)])),
    ST:Object.fromEntries(RING.stations.map(s=>[s.id,grab(s,KEYS.st)])),BUSF:Object.keys(BUSF),
    WX:{type:WX.type,lock:WX.lock,next:WX.next,cur:{...WX.cur},cover:WX.cover},FLEX:FLEX.map(f=>({id:f.id,req:f.req,at:f.at})),PROT:JSON.parse(JSON.stringify(PROT)),
    TASK:taskSave(),taskSeq,taskCycle,INC:{next:INC.next,done:INC.done,active:INC.active?.def.id||null},PHONE:{...PHONE.stats},
    REC:{samples:REC.samples.slice(-600),events:REC.events.slice(-1500)}};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));}catch(e){if(!silent)deny('Opslaan mislukt: niet genoeg ruimte in de browser');return false;}
  if(!silent){pushAlarm(`💾 Spel opgeslagen (${MODES[GAME.mode].name}, ${fmtClock(SIM.t)})`,'ok');toastSaved('Spel opgeslagen');}else toastSaved('Automatisch opgeslagen');return true;}
function toastSaved(t){const el=$('#saved');el.textContent='💾 '+t;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
function readSave(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return d&&d.v===SAVE_V&&MODES[d.mode]?d:null;}catch(e){return null;}}
function deleteSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}
// ---- hervatten
function resumeGame(d){$('#intro').classList.add('hidden');AudioSys.init();controls.autoRotate=false;
  GAME.diff=d.diff;GAME.season=d.season;RESUMING=true;try{applyMode(d.mode);}finally{RESUMING=false;}
  Object.assign(SIM,d.SIM);LINES.forEach(L=>Object.assign(SIM.lines[L],d.SIM.lines[L]));
  Object.assign(GAME,d.GAME,{obj:GAME.obj,ended:false});GAME.obj.forEach((o,k)=>{o.state=d.GAME.obj[k]??null;});
  if(d.ho){GAME.handover={op:d.hoOp,open:false,dev:[],items:d.ho.map(h=>{const o=Object.create(HO_POOL.find(x=>x.id===h.id));Object.assign(o,h.f);o.done=h.done;return o;})};}
  for(const id in d.D)if(D[id])Object.assign(D[id],d.D[id]);
  FEEDERS.forEach(f=>Object.assign(f,d.F[f.id]||{}));LVG.forEach(g=>Object.assign(g,d.LV[g.id]||{}));
  RING.secs.forEach(s=>Object.assign(s,d.SEC[s.id]||{}));RING.stations.forEach(s=>Object.assign(s,d.ST[s.id]||{}));
  for(const k in BUSF)delete BUSF[k];d.BUSF.forEach(b=>BUSF[b]=true);
  setSeason(d.season);Object.assign(WX,d.WX);WX.cur={...d.WX.cur};applySnowCover?.();
  for(let i=FLEX.length-1;i>=0;i--)if(!FLEX_DEF.some(x=>x.id===FLEX[i].id))FLEX.splice(i,1);
  d.FLEX.forEach(s=>{const f=FLEX.find(x=>x.id===s.id);if(f){f.req=s.req;f.at=s.at;}});
  for(const k of ['f','ln','tr'])for(const id in d.PROT[k])if(PROT[k][id])Object.assign(PROT[k][id],d.PROT[k][id]);
  TASK=null;taskSeq=d.taskSeq;taskCycle=d.taskCycle;taskLoad(d.TASK);
  Object.assign(PHONE.stats,d.PHONE);REC.samples=d.REC.samples;REC.events=d.REC.events;REC.lastM=null;
  INC.next=d.INC.next;INC.done=d.INC.done;INC.active=null;if(d.INC.active)clearIncident(d.INC.active);
  resumeTimers();computeFlows();FEEDERS.concat(RING.stations).forEach(f=>{f.wasOn=EN.has(f.node);});
  updateSky(hourOf());refreshAll();renderTasks();setSpeed(d.SIM.speed||60);
  const v=VIEWPOS[0];flyTo(v[0].clone(),v[1].clone(),2);
  pushAlarm(`💾 Spel hervat: ${MODES[d.mode].name} (${DIFFS[d.diff].label}), opgeslagen ${new Date(d.at).toLocaleString('nl-NL',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`,'ok');}
// een incident dat liep tijdens het opslaan: netjes afronden
function clearIncident(id){GAME.flags.scadaDown=false;$('#scada').classList.remove('down');GAME.flags.mustOpen=null;GAME.flags.lineLimit=null;FIRE.on=false;if(INC_WATER)INC_WATER.visible=false;
  RING.stations.forEach(s=>{if(s.damaged||s.evac){s.damaged=false;s.evac=false;}if(s.genset&&TASK?.station!==s.id){s.genset=false;s.groups.forEach(g=>g.backfed=false);}});
  CONS.forEach(c=>{if(BASE0.has(c.id))c.base=BASE0.get(c.id);});D.T1.fanFail=false;
  const def=INCIDENTS.find(x=>x.id===id);pushAlarm(`Het incident “${def?def.name:id}” is tijdens het opslaan afgerond`,'info');}
// geplande gebeurtenissen opnieuw inplannen op basis van de opgeslagen toestand
function resumeTimers(){
  FEEDERS.forEach(f=>{if(!f.fault)return;const repair=()=>addTimer(rnd(25,55),()=>{f.fault=null;f.outFrac=0;pushAlarm(`Storingsdienst: kabel ${f.id} gerepareerd – alle klanten van ${f.name} terug`,'ok');});
    if(f.fault.stage==='search')addTimer(rnd(4,10),()=>{if(!f.fault)return;f.fault.stage='isolated';f.outFrac=f.fault.frac;readyNotice(`Storingsdienst: fout in ${f.id} ${f.name} gevonden en weggeschakeld – ${f.cb} mag weer IN`,f.cb,()=>!D[f.cb].state);repair();});else repair();});
  RING.secs.forEach(s=>{if(!s.fault)return;if(!s.located)addTimer(rnd(4,10),()=>{if(s.fault){s.located=true;pushAlarm(`Storingsdienst: kabelfout gevonden tussen ${secName(s)} – isoleer de kabel en voed terug via het normaal-open punt`,'info');}});
    addTimer(rnd(30,70),()=>{s.fault=false;s.located=false;RING.stations.forEach(x=>x.flag=false);pushAlarm(`Storingsdienst: kabel ${secName(s)} gerepareerd – normaliseer de ring`,'ok');refreshAll();});});
  LINES.forEach(L=>{const ln=SIM.lines[L];if(!ln.avail&&!ln.maint)addTimer(rnd(8,20),()=>lineRestore(L));
    if(ln.maint&&ln.avail)addTimer(3,()=>{if(ln.maint&&ln.avail){ln.avail=false;ln.reason='vrijgeschakeld voor werkzaamheden';pushAlarm(`TenneT: lijn ${L} spanningsloos – aarden toegestaan`,'info');}});});
  TR.forEach(T=>{const t=D[T];if(t.blocked&&!t.resettable&&t.blockKind!=='temp')addTimer(rnd(15,35),()=>{if(!t.blocked)return;t.resettable=true;readyNotice(`${T}: inspectie gereed – reset blokkeerrelais 86`,T,()=>t.blocked);});});
  Object.keys(BUSF).forEach(b=>addTimer(rnd(15,30),()=>{delete BUSF[b];readyNotice(`Rail ${BUSES[b].nm}: fout verholpen – de rail mag weer onder spanning`,null);refreshAll();}));
  if(!SIM.meppel.avail)addTimer(rnd(5,15),()=>{Object.assign(SIM.meppel,{avail:true,reason:''});readyNotice('Netbeheer Noord: OS Meppel weer onder spanning',null);refreshAll();});
  RING.stations.forEach(s=>{if(s.fuse)addTimer(rnd(8,15),()=>{s.fuse=false;readyNotice(`${s.id}: nieuwe zekeringen geplaatst – ${s.id}-T mag weer dicht`,s.id+'-T',()=>!D[s.id+'-T'].state);});});
  LVG.forEach(g=>{if(!g.lvf)return;addTimer(rnd(2,5),()=>g.lvf&&callFrom(g,'lv'));addTimer(90,()=>{if(!g.lvf)return;g.lvf=null;g.outFrac=0;pushAlarm(`Storingsdienst (0800-nummer): LS-storing ${g.st.id} ${g.name} verholpen`,'warn');});});}
// ---- automatisch opslaan: elke 2 minuten en bij het sluiten van de pagina
setInterval(()=>{if(canSave()&&!SIM.paused)saveGame(true);},120000);
addEventListener('beforeunload',()=>{if(canSave())saveGame(true);});
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&(e.key==='s'||e.key==='S')){e.preventDefault();if(canSave())saveGame();else deny('Opslaan kan in de vrije dienst en in de dag- en avonddienst');}});
