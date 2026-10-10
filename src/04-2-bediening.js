
// Bediening: vergrendelingen, schakelen, beveiligingstrips via de netgraaf, 110 kV-lijnen
// ---------------------------------------------------------- bediening
function addTimer(min,fn){SIM.timers.push({at:SIM.t+min,fn});}
const springOk=d=>performance.now()>=d.springAt;
function actionText(d,to){return d.type==='cb'||d.type==='lvs'?(to?'IN':'UIT'):(to?'GESLOTEN':'GEOPEND');}
function interlockCheck(d,to){
  const ls=lsInterlock(d,to);if(ls)return ls;
  if(d.type==='ds'){const cb=D[d.cb];if(d.sel&&to===1&&D[d.other].state===1&&D['V-K'].state!==1)return 'Vergrendeling: een veld mag alleen op beide rails als koppeling V-K gesloten is';
    if(cb.state===1&&!selPar(d))return d.sel?`Vergrendeling: ${cb.id} moet eerst UIT (of: V-K dicht en het veld eerst ook op de andere rail)`:`Vergrendeling: ${cb.id} moet eerst UIT`;if(to===1&&d.es&&D[d.es].state===1)return `Vergrendeling: aardschakelaar ${d.es} is gesloten`;}
  if(d.type==='es'&&to===1){if(d.ds&&D[d.ds].state===1)return `Vergrendeling: ${d.ds} moet eerst open`;if(d.cb&&D[d.cb].state===1)return `Vergrendeling: ${d.cb} moet eerst UIT`;if(EN.has(d.a))return 'Vergrendeling: spanning aanwezig (spanningsdetectie)';}
  if(d.link&&to===1){if(!EN.has(d.b))return 'Vergrendeling: de koppelkabel uit Meppel is spanningsloos – koppelen mag alleen om vanuit Meppel te voeden';
    if(EN.has(d.a))return 'Vergrendeling: niet parallel schakelen met het net van Netbeheer Noord – maak eerst de ringkant spanningsloos';}
  if(d.id==='V-K'&&to===0){const both=Object.values(D).find(x=>x.sel&&x.id.endsWith('QA')&&x.state===1&&D[x.other].state===1);if(both)return `Vergrendeling: veld ${both.bay} staat op beide rails – open eerst één railkeuzescheider`;}
  if(d.type==='cb'&&to===1&&d.need&&D[d.tr].ratio!==d.need)return `Vergrendeling: ${d.tr} staat op ${D[d.tr].ratio} kV – eerst omschakelen naar ${d.need} kV`;
  if(d.type==='cb'&&to===1){d.state=1;const sc=shortNode();d.state=0;if(sc)return 'Vergrendeling: inschakelen op een geaard deel';}
  return null;}
// railkoppelingen afgeleid uit BUSES: [rail, rail, max. spanningsverschil synchrocheck]
const COUPLERS={};BUS_IDS.forEach(b=>{if(BUSES[b].coupler)(COUPLERS[BUSES[b].coupler]??=[]).push(b);});Object.values(COUPLERS).forEach(v=>v.push(BUSES[v[0]].kv===20?0.5:0.25));
function syncCheck(d){const c=COUPLERS[d.id];if(!c||!EN.has(c[0])||!EN.has(c[1]))return null;const dU=Math.abs(FLOW.U[c[0]]-FLOW.U[c[1]]);
  return dU>c[2]?`Synchrocheck: spanningsverschil ${dU.toFixed(2).replace('.',',')} kV te groot (max ${String(c[2]).replace('.',',')}) – breng de trappen gelijk`:null;}
function operate(id,to,opts={}){
  const d=D[id];if(!d||!['cb','ds','es','lbs','lvs'].includes(d.type)||d.state===to)return;
  if(SIM.paused)return deny(GAME.ended?'De dienst is afgelopen':'Simulatie gepauzeerd – hervat om te schakelen');
  const dst=d.bay&&RING.stations.find(s=>s.id===d.bay);if(dst&&dst.damaged)return deny(`${dst.id} is beschadigd (${dst.damaged}) – niet bedienbaar. Isoleer vanaf het buurstation.`);
  if(d.type==='lvs'&&!opts.crew&&!localOk(id))return lsSwitchOrder(id,to);   // LS: lokaal of via een monteur
  if(SCADA_DOWN()&&!localOk(id))return deny('SCADA-verbinding verbroken – loop erheen (V) en bedien lokaal aan het veld');
  if(to===1&&/-T$/.test(id)&&RING.stations.find(s=>s.id+'-T'===id)?.fuse)return deny('Zekeringen nog niet vervangen – wacht op de monteur');
  if(d.busy)return deny('Bediening loopt nog…');
  if(d.type==='cb'&&manualRefuses(d)){pushAlarm(`${id} reageert niet op het ${to?'in':'uit'}schakelcommando (weigerde eerder ${d.refusals}×) – probeer het opnieuw en laat hem reviseren`,'warn');return deny(`${id} weigert – probeer het opnieuw`);}
  if(d.type==='cb'&&to===1){
    if(d.tr&&D[d.tr].blocked)return deny(`${d.tr} geblokkeerd door relais 86 (${D[d.tr].blockText}) – eerst resetten`);
    if(!springOk(d))return deny(`${id}: inschakelveer wordt nog geladen…`);}
  computeFlows();
  if(d.type==='cb'&&to===1){const s=syncCheck(d);if(s)return deny(s);}
  if(SIM.interlock){const r=interlockCheck(d,to);if(r)return deny(r);}
  if(!opts.radio){const n=crewNear(id);if(n)return openRadio(n,id,to);}   // pas melden als de schakeling ook echt mag
  let arc=null;
  if(d.type==='ds'){const cb=D[d.cb];if(cb.state===1&&!selPar(d)&&(EN.has(d.a)||EN.has(d.b)))arc=d.a;}
  const trDead=d.tr&&id.endsWith('-Q0')&&!EN.has(d.tr+'h');
  briefWatch(id,to);
  d.state=to;if(d.type==='cb')wearOp(d,false);else d.ops++;SIM.manualFlag=true;if(d.type==='cb'&&to===1)d.springAt=performance.now()+7000;
  pushAlarm(`Bediening ${id} ${actionText(d,to)}`,'op');
  const v=VIEWS[id];
  if(d.type==='cb')AudioSys.breaker(v?distGain(v.center):0.5);else if(d.type==='lbs'||d.type==='lvs')AudioSys.breaker(0.3);else{d.busy=!!v;AudioSys.motor(d.type==='es'?2.2:2.8,v?distGain(v.center):0.5);}
  if(d.type==='cb'&&to===1&&d.need&&D[d.tr].ratio!==d.need&&EN.has(d.a)){incident();d.state=0;tripBreaker(d.tr+'-Q0');
    pushAlarm(`${id} ingeschakeld terwijl ${d.tr} op ${D[d.tr].ratio} kV staat – verkeerde spanning op de rail, overspanningsbeveiliging en differentiaal grijpen in!`,'crit');
    spawnArc(v?v.arcPos:null,1.5);const t=D[d.tr];t.blocked=true;t.resettable=false;t.blockKind='ratio';t.blockText='wikkelingsschade door verkeerde omschakelstand';addTimer(90,()=>{t.resettable=true;readyNotice(`${d.tr}: inspectie na overspanning gereed – reset blokkeerrelais 86`,d.tr,()=>t.blocked);});refreshAll();return;}
  if(arc){incident();pushAlarm(`${id} geschakeld met ${d.cb} IN – vlamboog! Beveiliging grijpt in`,'crit');spawnArc(v?v.arcPos:null,1.3);tripFrom(arc);}
  else{const sc=shortNode();if(sc){incident();
    pushAlarm(d.type==='es'?`Aardschakelaar ${id} op spanning gesloten – kortsluiting!`:d.type==='cb'?`${id} ingeschakeld op geaard deel – kortsluiting!`:`Kortsluiting na bediening ${id}!`,'crit');
    spawnArc(v?v.arcPos:null,1.4);tripFrom(sc);}}
  if(trDead&&to===1){computeFlows();if(EN.has(d.tr+'h'))pushAlarm(`${d.tr}: inschakelstroom (inrush) – 2e-harmonische blokkering voorkomt onterechte differentiaaltrip`,'info');}
  const f=d.feeder;
  if(d.type==='cb'&&to===1&&f&&f.fault&&f.fault.stage==='search'){setTimeout(()=>{computeFlows();if(d.state===1&&EN.has(f.node)){d.state=0;AudioSys.breaker(0.5);GAME.stats.recloseFault++;award(-40,'Ingeschakeld op kortsluiting');pushAlarm(`${id}: ingeschakeld op kortsluiting – I>> momentaan trip. Wacht op de storingsdienst!`,'warn');refreshAll();}},220);}
  refreshAll();
}
// beveiligingstrip: vanaf de fout naar buiten de eerste gesloten vermogenschakelaar openen;
// weigert hij (50BF), dan gaat de trip erdoorheen naar de volgende schakelaars
function tripFrom(node){
  const seen=new Set([node]),q=[node],tripped=[];let src=null;
  while(q.length){const n=q.pop();if(n==='L1x'||n==='L2x')src=n.slice(0,2);
    for(const d of ADJ[n]||[]){if(d.type==='es')continue;if(d.type==='cb'){if(d.state!==1)continue;if(!d.noTrip&&!relayRefuses(d,n)&&!breakerFails(d)){d.state=0;tripped.push(d.id);wearOp(d,true);continue;}}if(d.type!=='tr'&&d.type!=='mstr'&&d.state!==1)continue;
      const m=d.a===n?d.b:d.a;if(!seen.has(m)){seen.add(m);q.push(m);}}}
  setTimeout(()=>{tripped.forEach(id=>pushAlarm(`${id}: beveiliging – UIT`,'warn'));if(tripped.length)AudioSys.breaker(0.6);},120);
  if(src){const ln=SIM.lines[src];if(ln.avail){ln.avail=false;ln.reason='afgeschakeld door TenneT (fout in station)';pushAlarm(`TenneT: lijn ${src} aan overzijde afgeschakeld – fout in OS Zuidwolde`,'crit');addTimer(rnd(10,18),()=>lineRestore(src));}}
}
// weigert de schakelaar of zijn relais, dan schakelt de reservebeveiliging de rail af en blijft deze schakelaar IN
function tripBreaker(id){const d=D[id];if(d.state!==1)return false;if(relayRefuses(d)||breakerFails(d)){d.noTrip=true;tripFrom(d.a);d.noTrip=false;return false;}d.state=0;wearOp(d,true);const v=VIEWS[id];AudioSys.breaker(v?distGain(v.center):0.5);return true;}
function lineRestore(L){const ln=SIM.lines[L];if(ln.avail||ln.maint)return;
  if(D[L+'-Q8'].state===1){pushAlarm(`TenneT: lijn ${L} kan niet onder spanning – ${L}-Q8 is geaard`,'warn');addTimer(5,()=>lineRestore(L));return;}
  ln.avail=true;ln.reason='';if(D[L+'-Q0'].state)pushAlarm(`TenneT: lijn ${L} ${ln.name} weer onder spanning`,'ok');else readyNotice(`TenneT: lijn ${L} ${ln.name} weer onder spanning – ${L}-Q0 mag weer IN`,L+'-Q0',()=>!D[L+'-Q0'].state&&SIM.lines[L].avail);}
function lineLockout(L){const ln=SIM.lines[L];ln.avail=false;ln.reason='blijvende fout, ploeg onderweg';const m=rnd(25,50);
  pushAlarm(`TenneT: blijvende fout op lijn ${L} – herstel verwacht over ±${Math.round(m)} min`,'warn');addTimer(m,()=>lineRestore(L));}
function toggleAR(L){const ln=SIM.lines[L];if(ln.arBroken)return deny(`AR-relais ${L} is defect`);ln.ar=!ln.ar;pushAlarm(`Automatische herinschakeling ${L} ${ln.ar?'IN':'UIT'}bedrijf gesteld`,'op');refreshAll();}
