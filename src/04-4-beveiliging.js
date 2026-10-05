
// Beveiliging van de uitgaande velden: railfout-herinschakeling, overstroom I>, koude-lastopname
// ---------------------------------------------------------- 10 kV-velden: koude-lastopname en overstroom
function feederTick(dm){
  for(const b in BUSF)if(EN.has(b)){tripFrom(b);GAME.stats.recloseFault++;award(-40,'Ingeschakeld op railfout');pushAlarm(`Rail ${BUS_BAND[b][2]} met kortsluiting onder spanning gebracht – railbeveiliging schakelt af`,'warn');}
  FEEDERS.forEach(f=>{const on=EN.has(f.node);
    if(on&&f.fault&&f.fault.stage==='search'&&D[f.cb].state===1){tripBreaker(f.cb);GAME.stats.recloseFault++;award(-40,'Ingeschakeld op kortsluiting');
      pushAlarm(`${f.cb}: kabel onder spanning gebracht met fout – I>> momentaan trip. Wacht op de storingsdienst!`,'warn');return;}
    // een verlopen of traag relais (zie relaistest) spreekt later aan dan de instelling
    const r=f.gen?0:f.P/f.rate,ps=PROT.f[f.id],rl=f.relay||{},pk=ps.pick*(rl.drift||1);overloadHeat(f,r,dm);
    if(r>pk&&D[f.cb].state===1){f.oc+=dm*(r*r-1)/(10*ps.tms*(rl.delay||1));if(f.oc>=1){f.oc=0;tripBreaker(f.cb);GAME.stats.clpTrips++;award(-30,`${f.id} overbelast afgeschakeld`);pushAlarm(`${f.cb} ${f.name}: overstroombeveiliging I> (${Math.round(ps.pick*100)}%) na ${Math.round(r*100)}% belasting${f.clp>1.05?' (koude-lastopname)':''}`,'warn');}}
    else f.oc=Math.max(0,f.oc-dm*0.1);});
  // koude-lastopname per afnemer
  CONS.forEach(c=>{const on=EN.has(c.node);
    if(c.backfed)c.offSince=null;
    else if(!on){if(c.offSince==null)c.offSince=SIM.t;}
    else if(c.offSince!=null){const dur=SIM.t-c.offSince;c.offSince=null;
      if(dur>5&&!c.gen){c.clp=Math.max(c.clp,1+0.6*Math.min(1,dur/90));if(c.clp>1.12&&!c.st)pushAlarm(`${c.id} ${c.name}: koude-lastopname na ${Math.round(dur)} min uitval – belasting +${Math.round((c.clp-1)*100)}%`,'info');}}
    c.clp=1+(c.clp-1)*Math.exp(-dm/18);});
  ringProtection(dm);}

// ---------- relais-instellingen (aan te passen in het beveiligingsvenster) en hun effect
const PROT={f:{},ln:{L1:{dt:1},L2:{dt:1}},tr:{T1:{trip:100},T2:{trip:100},T3:{trip:100}}};
FEEDERS.forEach(f=>{PROT.f[f.id]={pick:1.3,tms:1};});
const PROT_OPT={
  pick:{label:'I> aanspreekwaarde',vals:[1.1,1.2,1.3,1.5],fmt:v=>Math.round(v*100)+' %',tip:'Laag: ook koude-lastopname leidt tot afschakeling. Hoog: een overbelaste kabel blijft te lang in bedrijf en kan beschadigen.'},
  tms:{label:'Tijdfactor',vals:[0.5,1,2],fmt:v=>'× '+String(v).replace('.',','),tip:'Snel: kortere overbelasting wordt al afgeschakeld. Traag: meer ruimte voor koude-lastopname, maar de kabel warmt langer op.'},
  dt:{label:'AR dode tijd',vals:[0.3,1,3],fmt:v=>String(v).replace('.',',')+' s',tip:'Kort: de vlamboog is soms nog niet gedoofd, dan mislukt de herinschakeling (±30%). 3 s: herinschakeling slaagt altijd, maar draait het station op één lijn, dan vallen processen bij klanten uit.'},
  trip:{label:'Thermische trip',vals:[95,100,110],fmt:v=>'olie ≥ '+v+' °C',tip:'95 °C: veilig, maar de trafo schakelt eerder af bij een piek. 110 °C: meer reserve, maar boven 105 °C ontstaat gasvorming en dreigt een Buchholz-trip met lange inspectie.'}};
const protTxt=(k,v)=>PROT_OPT[k].fmt(v);
function setProt(kind,id,key,val){const o=PROT[kind][id];if(!o||o[key]===val)return;o[key]=val;
  const nm=kind==='f'?FEEDERS.find(f=>f.id===id).cb:id;
  pushAlarm(`Beveiliging ${nm}: ${PROT_OPT[key].label.toLowerCase()} → ${protTxt(key,val)}`,'op');if(protOpen())renderProt();refreshDevPanel();}
// effecten (aangeroepen vanuit de simulatie)
function arFails(L){const dt=PROT.ln[L].dt;return dt<=0.3?Math.random()<0.3:dt>=3?false:Math.random()<0.04;}
// kabeltemperatuur: de geleider warmt langzaam op naar grondtemperatuur + 65 °C × (belasting)² (XLPE: max. 90 °C, beschadiging vanaf 105 °C)
const CABLE={max:90,warn:85,burn:105,rise:65};
const soilT=()=>clamp(ambient()*0.45+8,5,22);   // temperatuur van de grond rond de kabel
function cableHeat(o,load,on,dm,tau){const soil=soilT(),tgt=on?soil+CABLE.rise*load*load:soil;o.temp=o.temp??Math.min(tgt,CABLE.max-10);o.temp+=(tgt-o.temp)*(1-Math.exp(-dm/tau));return o.temp;}
function overloadHeat(f,r,dm){   // kabel van een uitgaand veld (tijdconstante 30 min)
  if(f.gen)return;const T=cableHeat(f,Math.max(0,r),D[f.cb].state&&EN.has(f.node),dm,30);
  if(T>CABLE.warn&&!f.hotWarn){f.hotWarn=true;pushAlarm(`${f.cb} ${f.name}: kabel loopt warm (${Math.round(T)} °C, max. ${CABLE.max} °C) – verlaag de belasting`,'warn');}
  if(T<CABLE.warn-8)f.hotWarn=false;
  if(T>=CABLE.burn&&!f.fault){f.temp=soilT()+30;GAME.stats.burn=(GAME.stats.burn||0)+1;pushAlarm(`${f.cb} ${f.name}: kabel door oververhitting (${Math.round(T)} °C) beschadigd – de beveiliging stond te ruim ingesteld`,'crit');feederFault(f.id);}}
function trafoOverheat(T,t,dm){if(t.oil>105&&EN.has(T+'h')){t.gas=(t.gas||0)+dm;if(t.gas>12){t.gas=0;GAME.stats.thermal++;award(-100,`${T} gasvorming door oververhitting`);
    tripTrafo(T,'Buchholz-beveiliging (gasvorming door oververhitting)',rnd(90,120),'prot');}}else t.gas=Math.max(0,(t.gas||0)-dm*0.5);}
