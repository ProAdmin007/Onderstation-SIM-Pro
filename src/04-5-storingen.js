
// Storingen: lijnen, velden, LS, rails en transformatoren
// ---------------------------------------------------------- storingen
// storing aan de 110 kV-kant van OS Meppel (Netbeheer Noord): onze velden daar vallen even weg
function meppelFault(){if(!SIM.meppel.avail)return feederFault();Object.assign(SIM.meppel,{avail:false,reason:'storing 110 kV-zijde (Netbeheer Noord)'});
  pushAlarm('Netbeheer Noord: storing in OS Meppel aan de 110 kV-kant – de velden MP1–MP3 zijn spanningsloos. Herstel door Netbeheer Noord','crit');
  addTimer(rnd(12,25),()=>{Object.assign(SIM.meppel,{avail:true,reason:''});readyNotice('Netbeheer Noord: OS Meppel weer onder spanning – controleer uw velden MP1–MP3',null);refreshAll();});refreshAll();}
function randomEvent(){const r=Math.random();if(r>0.97)return meppelFault();if(r<(WX.cur.thunder>0.5?0.65:0.3))return lineFault();if(r<0.62)return feederFault();if(r<0.72)return lvFault();
  if(r<0.8&&!GAME.flags.busf){GAME.flags.busf=true;return busFault(pick(['RC','RD','RB']));}return trafoFault();}
function lineFault(forceL,forcePerm){const c=LINES.filter(L=>SIM.lines[L].avail&&!SIM.lines[L].maint&&D[L+'-Q0'].state===1&&(!forceL||L===forceL));if(!c.length)return forceL?null:feederFault();const L=pick(c),ln=SIM.lines[L];
  lightning(L);const perm=forcePerm??(Math.random()<DIFFS[GAME.diff].perm);
  setTimeout(()=>{tripBreaker(L+'-Q0');pushAlarm(`${L} ${ln.name}: blikseminslag – distantiebeveiliging zone 1, ${L}-Q0 UIT`,'crit');
    const dt=PROT.ln[L].dt,fail=!perm&&arFails(L);
    if(ln.ar){pushAlarm(`${L}: automatische herinschakeling gestart (dode tijd ${String(dt).replace('.',',')} s)`,'info');
      if(dt>=3&&!LINES.some(x=>x!==L&&SIM.lines[x].avail&&D[x+'-Q0'].state)){award(-15,'Lange dode tijd');pushAlarm('Klanten melden processtoringen: het station was 3 s zonder spanning (lange dode tijd op de enige voedende lijn)','warn');}
      setTimeout(()=>{const d=D[L+'-Q0'];if(d.state!==0||!ln.avail)return;
        if(!springOk(d)){pushAlarm(`${L}: herinschakeling geblokkeerd – inschakelveer niet geladen`,'warn');if(perm)lineLockout(L);return;}
        d.state=1;d.ops++;d.springAt=performance.now()+7000;const v=VIEWS[d.id];AudioSys.breaker(v?distGain(v.center):0.5);
        if(fail){setTimeout(()=>{tripBreaker(d.id);pushAlarm(`${L}: herinschakeling mislukt – de vlamboog was nog niet gedoofd (dode tijd ${String(dt).replace('.',',')} s te kort)`,'crit');
          readyNotice(`TenneT: lijn ${L} is gezond – ${L}-Q0 mag weer IN`,L+'-Q0',()=>!D[L+'-Q0'].state&&SIM.lines[L].avail);refreshAll();},260);}
        else if(!perm)pushAlarm(`${L}: herinschakeling geslaagd – lijn weer in bedrijf`,'ok');
        else setTimeout(()=>{tripBreaker(d.id);pushAlarm(`${L}: herinschakeling mislukt (blijvende fout) – ${L}-Q0 definitief UIT`,'crit');lineLockout(L);refreshAll();},260);
        refreshAll();},dt*1000+200);}
    else if(perm)lineLockout(L);
    else readyNotice(`TenneT: lijn ${L} na herinschakeling aan de overzijde weer onder spanning – ${L}-Q0 mag weer IN`,L+'-Q0',()=>!D[L+'-Q0'].state&&SIM.lines[L].avail);
    refreshAll();},700);}
function feederFault(forceF,searchMin){const c=FEEDERS.filter(f=>D[f.cb].state===1&&EN.has(f.node)&&!f.fault&&!f.backfed&&(!forceF||f.id===forceF));if(!c.length)return;const f=pick(c);if(f.ring)return ringFault(f);
  tripBreaker(f.cb);f.fault={stage:'search',frac:f.prio?0:rnd(0.12,0.35)};
  const why=pick(['kabelbeschadiging door graafwerk','mofstoring','kortsluiting in een middenspanningsruimte','kabelfout (veroudering)']);
  const ts=searchMin||rnd(12,25);
  pushAlarm(`${f.cb} ${f.name}: overstroombeveiliging I>> – ${why}`,'crit');
  pushAlarm(`Storingsdienst: monteur onderweg naar ${f.id}, foutzoeken ±${Math.round(ts)} min. Veld nog niet inschakelen!`,'info');
  addTimer(ts,()=>{f.fault.stage='isolated';f.outFrac=f.fault.frac;
    readyNotice(`Storingsdienst: fout in ${f.id} ${f.name} gevonden en weggeschakeld – ${f.cb} mag weer IN${f.outFrac?` (${Math.round(f.cust*f.outFrac)} klanten wachten nog op reparatie)`:''}`,f.cb,()=>!D[f.cb].state);
    addTimer(rnd(40,80),()=>{f.fault=null;f.outFrac=0;pushAlarm(`Storingsdienst: kabel ${f.id} gerepareerd – alle klanten van ${f.name} terug`,'ok');});});
  refreshAll();}
const BUSF={};   // rails met een kortsluiting (tot de monteur hem heeft verholpen)
function busFault(bus,repairMin){if(BUSF[bus]||!EN.has(bus))return null;const nm=BUS_BAND[bus][2],kv=is20(bus)?20:10;
  BUSF[bus]=true;const v=VIEWS[is20(bus)?'W-K':'V-K'];if(v)spawnArc(v.arcPos,1.2);tripFrom(bus);
  pushAlarm(`Railbeveiliging ${kv} kV rail ${nm}: kortsluiting op de rail – alle velden van rail ${nm} UIT`,'crit');
  pushAlarm(`Tip: rail ${nm} blijft spanningsloos tot de fout is verholpen. Voed de andere railhelft apart${is20(bus)?' (T3 op 20 kV via W-T3 voor rail C2, of T2 voor rail C1)':' (T1 voor rail A, T3 via V-T3 voor rail B)'} en houd de koppeling open.`,'info');
  const b=VIEWS[is20(bus)?'MS20':'MS'];if(b)crewDispatch({box:b.box,say:`Railfout ${nm} zoeken`,until:()=>!BUSF[bus]});
  addTimer(repairMin||rnd(40,65),()=>{delete BUSF[bus];readyNotice(`Monteur: overslag op steunisolator rail ${nm} verholpen – rail ${nm} mag weer onder spanning`,null);refreshAll();});refreshAll();}
function trafoFault(forceT){const c=TR.filter(T=>(forceT||!GAME.flags['trf'+T])&&!D[T].blocked&&D[T+'-Q0'].state===1&&EN.has(T+'h')&&!(TASK&&TASK.tr===T)&&(!forceT||T===forceT));if(!c.length)return forceT?null:feederFault();const T=pick(c);GAME.flags['trf'+T]=true;
  const v=VIEWS[T];if(v)spawnArc(v.arcPos,0.6);
  tripTrafo(T,pick(['Buchholz-beveiliging (gasontwikkeling)','differentiaalbeveiliging','drukontlastklep aangesproken']),rnd(40,80),'prot');refreshAll();}
