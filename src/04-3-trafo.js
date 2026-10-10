
// Transformatoren: blokkeerrelais 86, omschakelaar T3, spanningsregeling en thermiek
// ---------------------------------------------------------- transformator: blokkering 86, trappenschakelaar
function tripTrafo(T,reason,inspectMin,kind){const t=D[T];tripBreaker(T+'-Q0');TR_LV[T].forEach(tripBreaker);
  t.blocked=true;t.resettable=false;t.blockText=reason;t.blockKind=kind;if(kind==='temp'){GAME.stats.thermal++;award(-100,`${T} thermisch afgeschakeld`);}
  pushAlarm(`${T}: ${reason} – ${T}-Q0 en ${TR_LV[T].join('/')} UIT, blokkeerrelais 86 aangesproken`,'crit');
  if(inspectMin)crewDispatch({box:VIEWS[T].box,say:`Inspectie ${T}: Buchholz-relais en olie`,until:()=>!t.blocked||t.resettable,rel:[T+'-Q0',T+'-Q1',...TR_LV[T]]});
  if(inspectMin)addTimer(inspectMin,()=>{t.resettable=true;readyNotice(`${T}: inspectie gereed, geen schade gevonden – reset blokkeerrelais 86 in het transformatorpaneel`,T,()=>t.blocked);});
  setTimeout(()=>{computeFlows();const dead=FEEDERS.filter(f=>!EN.has(f.node)&&D[f.cb].state===1);if(!dead.length)return;
    if(dead.some(f=>is20(f.bus)))pushAlarm(`Tip: neem reservetransformator T3 in bedrijf op 20 kV (W-T3 voedt rail C2, via W-K ook C1) – T3 staat nu op ${D.T3.ratio} kV`,'info');
    if(dead.some(f=>f.bus==='RA'||f.bus==='RB'))pushAlarm(`Tip: neem reservetransformator T3 in bedrijf op 10 kV (V-T3) – T3 staat nu op ${D.T3.ratio} kV. Let op de belasting!`,'info');},600);}
function resetLockout(T){const t=D[T];if(!t.blocked)return;
  if(!t.resettable)return deny(`Reset 86 niet mogelijk: ${t.blockKind==='temp'?'transformator nog te warm (< 75 °C)':t.blockKind==='ratio'?'wikkelingsschade, inspectie loopt':'inspectie nog niet gereed'}`);
  t.blocked=false;t.blockText='';pushAlarm(`${T}: blokkeerrelais 86 gereset – transformator vrijgegeven`,'op');refreshAll();}
function setRatio(r){const t=D[RES];if(t.ratio===r)return;
  if(EN.has('T3h')||D['V-T3'].state||D['W-T3'].state)return deny('Omschakelen alleen spanningsloos: schakel T3-Q0, V-T3 en W-T3 eerst UIT');
  if(t.ratioBusy)return deny('Omschakelaar draait nog…');t.ratioBusy=true;const v=VIEWS[RES];AudioSys.motor(3,v?distGain(v.center):0.4);
  pushAlarm(`T3: wikkelingsomschakelaar naar ${r} kV gestart`,'op');
  setTimeout(()=>{t.ratio=r;t.ratioBusy=false;t.tap=9;pushAlarm(`T3: omgeschakeld naar ${r} kV – schakel nu ${r==='10'?'V-T3':'W-T3'} in`,'op');refreshAll();},3000);}
function setAVR(T,mode){D[T].avr=mode;D[T].avrT=0;pushAlarm(`${T}: spanningsregelaar op ${mode==='auto'?'AUTOMATISCH':'HAND'}`,'op');refreshAll();}
function moveTap(T,dir,manual){const t=D[T];const n=clamp(t.tap+dir,1,17);if(n===t.tap)return false;
  t.tapBusy=true;const v=VIEWS[T];AudioSys.motor(1.4,v?distGain(v.center)*0.6:0.2);
  setTimeout(()=>{t.tap=n;t.tapOps++;t.tapBusy=false;refreshAll();},manual?1500:300);return true;}
function tapStep(T,dir){const t=D[T];if(t.avr==='auto')return deny(`${T}: regelaar staat op AUTO – zet eerst op HAND`);if(t.tapBusy)return deny('Trappenschakelaar draait nog…');
  if(!moveTap(T,dir,true))return deny(`${T}: eindstand trappenschakelaar bereikt`);pushAlarm(`${T}: trap ${dir>0?'hoger':'lager'} → ${t.tap+dir}`,'op');}
const BUS_BAND=Object.fromEntries(BUS_IDS.map(b=>[b,[...BUSES[b].band,BUSES[b].nm]]));
function regulate(dm){
  // parallelbedrijf: per gevoede railgroep regelt één transformator (master), de rest volgt
  const followers=new Set();
  FLOW.groups.forEach(g=>{const auto=g.tf.filter(T=>D[T].avr==='auto');auto.slice(1).forEach(T=>{followers.add(T);const t=D[T];if(!t.tapBusy&&t.tap!==D[auto[0]].tap)moveTap(T,Math.sign(D[auto[0]].tap-t.tap));});
    const taps=g.tf.map(T=>D[T].tap),dk=g.tf.length>1?Math.max(...taps)-Math.min(...taps):0,k='circ'+g.buses.join('');
    SIM['t'+k]=dk>=2?(SIM['t'+k]||0)+dm:0;   // de volgregelaar krijgt 1 min om de trappen gelijk te trekken
    if(dk>=2&&SIM['t'+k]>=1&&!SIM[k]){SIM[k]=true;award(-20,'Circulatiestroom');pushAlarm(`Circulatiestroom tussen ${g.tf.join(' en ')} (${dk} trappen verschil) – breng de trappen gelijk of zet de regelaars op AUTO`,'warn');}
    if(dk<2)SIM[k]=false;});
  TR.forEach(T=>{const t=D[T];if(followers.has(T)||t.avr!=='auto'||!EN.has(T+'h')||t.tapBusy){t.avrT=0;return;}
    const set=trafoUn(T),dev=t.Ulv-set;
    if(Math.abs(dev)>set*0.012){t.avrT+=dm;if(t.avrT>=1){moveTap(T,dev<0?1:-1);t.avrT=0.75;}}else t.avrT=0;});
  // railspanning pas na 2 min buiten de band melden: de regelaar krijgt eerst de kans
  Object.entries(BUS_BAND).forEach(([b,[lo,hi,nm]])=>{const U=FLOW.U[b],k='uAl'+b,m=(hi-lo)*0.1;
    if(U>0&&(U<lo||U>hi)){SIM['t'+k]=(SIM['t'+k]||0)+dm;if(!SIM[k]&&SIM['t'+k]>=2){SIM[k]=true;GAME.stats.volt++;award(-20,'Spanning buiten band');pushAlarm(`Rail ${nm}: spanning ${U.toFixed(2).replace('.',',')} kV buiten band (${lo},0 – ${hi},0 kV)`,'warn');}}
    else{SIM['t'+k]=0;if(U>=lo+m&&U<=hi-m)SIM[k]=false;}});
}
function thermal(dm){const h=hourOf(),amb=ambient(h);
  TR.forEach(T=>{const t=D[T],on=EN.has(T+'h'),k=t.S/(t.fans&&!t.fanFail?t.rAF:t.rON);
    const target=amb+(on?8:0)+62*k*k;t.oil+=(target-t.oil)*(1-Math.exp(-dm/32));
    if(!t.fans&&on&&t.oil>65&&!t.fanFail){t.fans=true;pushAlarm(`${T}: olie ${t.oil.toFixed(0)} °C – koeling ONAF, ventilatoren aan`,'info');}
    if(t.fans&&(t.oil<57||!on))t.fans=false;
    if(t.oil>90&&!t.hot){t.hot=true;pushAlarm(`${T}: olietemperatuur hoog (${t.oil.toFixed(0)} °C) – overbelast! Verlaag de belasting`,'warn');}
    if(t.oil<85)t.hot=false;
    const tp=PROT.tr[T].trip;trafoOverheat(T,t,dm);
    if(t.oil>=tp&&(D[T+'-Q0'].state||TR_LV[T].some(id=>D[id].state)))tripTrafo(T,`thermische beveiliging (olie ≥ ${tp} °C)`,0,'temp');
    if(t.blocked&&t.blockKind==='temp'&&!t.resettable&&t.oil<75){t.resettable=true;readyNotice(`${T}: afgekoeld tot ${t.oil.toFixed(0)} °C – blokkeerrelais 86 mag worden gereset`,T,()=>t.blocked);}});}
