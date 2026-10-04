
// Simulatiestap: tijd, timers, stromen, beveiliging, meldingen en score per tik
function initTaps(){for(let i=0;i<3;i++){computeFlows();TR.forEach(T=>{const t=D[T];if(t.Ulv>0){const u=trafoUn(T);t.tap=clamp(t.tap+Math.round((u-t.Ulv)/(u*TAP_STEP)),1,17);}});}computeFlows();}
const custOff=f=>f.backfed?0:!EN.has(f.node)?f.cust:Math.round(f.cust*f.outFrac);
// (vrije dienst: storingen komen vaker, factor 0,6 op de wachttijd)
function simStep(dtReal){
  if(SIM.paused)return;
  const dm=dtReal*SIM.speed/60;SIM.t+=dm;
  SIM.timers.sort((a,b)=>a.at-b.at);while(SIM.timers.length&&SIM.timers[0].at<=SIM.t)SIM.timers.shift().fn();
  CONS.forEach(f=>{f.noise+=(-f.noise*0.08+(Math.random()-0.5)*0.03)*Math.min(1,dm);});
  weatherTick(dm);computeFlows();thermal(dm);regulate(dm);feederTick(dm);flexTick(dm);
  let off=0;CONS.forEach(c=>{off+=custOff(c);});
  FEEDERS.forEach(f=>{if(f.ring)return;const on=EN.has(f.node);
    if(on!==f.wasOn){f.wasOn=on;restoreTrack(f,on);if(on)pushAlarm(`${f.id} ${f.name}: spanning hersteld`,'ok');
      else if(f.gen)pushAlarm(`${f.id} ${f.name}: productie afgeschakeld`,'info');
      else if(f.backfed)pushAlarm(`${f.id} ${f.name}: veld spanningsloos – klanten via terugvoeding gevoed`,'info');
      else pushAlarm(`${f.id} ${f.name}: spanningsloos – ${f.cust.toLocaleString('nl-NL')} ${f.cust===1?(f.prio?'aansluiting (prioriteit!)':'aansluiting'):'klanten'} zonder stroom`,f.prio?'crit':'warn');}});
  RING.stations.forEach(s=>{const on=EN.has(s.node);if(on===s.wasOn)return;s.wasOn=on;restoreTrack(s,on);
    if(on)pushAlarm(`${s.id} ${s.name}: spanning hersteld`,'ok');else if(s.genset)pushAlarm(`${s.id} ${s.name}: MS-zijde spanningsloos – klanten op het noodaggregaat`,'info');else pushAlarm(`${s.id} ${s.name}: spanningsloos – ${s.cust.toLocaleString('nl-NL')} klanten zonder stroom`,'warn');});
  SIM.off=off;SIM.cml+=CONS.reduce((s,c)=>s+custOff(c)*(c.interruptible?0.1:1),0)*dm;SIM.manualFlag=false;
  if(GAME.events&&SIM.t>=SIM.nextEvent){randomEvent();SIM.nextEvent=SIM.t+rnd(35,75)*DIFFS[GAME.diff].ev*(GAME.mode==='free'?0.6:1);}
  if(GAME.tasks&&!TASK&&SIM.t>=SIM.nextTaskAt)offerTask();
  taskTick();gameTick(dm,dtReal);recTick();
}
