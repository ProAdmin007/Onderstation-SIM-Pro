
// ============================================================ simulatie
const SIM={t:9*60,speed:60,paused:true,interlock:true,cml:0,incidents:0,tasksDone:0,off:0,
  nextEvent:9*60+16,nextTaskAt:9*60+3,timers:[],
  lines:{L1:{name:'Hoogeveen',avail:true,reason:'',maint:false,ar:true},L2:{name:'Meppel',avail:true,reason:'',maint:false,ar:true}}};
if(params.get('t')){SIM.t=parseFloat(params.get('t'))*60;SIM.nextEvent=SIM.t+16;SIM.nextTaskAt=SIM.t+3;}
const FEEDERS=[
  {id:'F1',name:'Centrum',short:'Centrum',kind:'city',base:6.5,cust:3600,bus:'RA'},
  {id:'F2',name:'Bedrijventerrein De Vaart',short:'De Vaart',kind:'ind',base:7.0,cust:140,bus:'RA'},
  {id:'F3',name:'Woonwijk Noord',short:'Noord',kind:'res',base:6.0,cust:4200,bus:'RA'},
  {id:'F4',name:'Woonwijk Zuid',short:'Zuid',kind:'res',base:5.5,cust:3900,bus:'RB'},
  {id:'F5',name:'Ziekenhuis',short:'Ziekenh.',kind:'hosp',base:2.8,cust:1,bus:'RB',prio:true},
  {id:'F6',name:'Glastuinbouw Oost',short:'Kassen',kind:'green',base:7.5,cust:40,bus:'RB'}];
const D={};
function dev(id,o){D[id]=Object.assign({id,state:0,ops:0,I:0,busy:false,springAt:0},o);return D[id];}
for(const L of['L1','L2']){const nm=SIM.lines[L].name;
  dev(L+'-Q9',{type:'ds',bay:L,label:'Lijnscheider',a:L+'x',b:L+'a',state:1,cb:L+'-Q0',es:L+'-Q8'});
  dev(L+'-Q8',{type:'es',bay:L,label:'Aardschakelaar (lijnzijde)',a:L+'x',ds:L+'-Q9'});
  dev(L+'-Q0',{type:'cb',bay:L,label:'Vermogenschakelaar 110 kV',a:L+'a',b:L+'b',state:1,line:L});
  dev(L+'-Q1',{type:'ds',bay:L,label:'Railscheider',a:L+'b',b:'BB',state:1,cb:L+'-Q0'});
  dev(L+'-CT',{type:'ct',bay:L,label:'Stroomtransformatoren',node:L+'a',ref:L+'-Q0'});
  dev(L+'-SA',{type:'sa',bay:L,label:'Overspanningsafleiders',node:L+'x',count:3});
  dev(L+'-LIJN',{type:'line',bay:L,label:'110 kV-lijn '+nm,node:L+'x',line:L});}
for(const T of['T1','T2']){const bus=T==='T1'?'RA':'RB';
  dev(T+'-Q1',{type:'ds',bay:T,label:'Railscheider',a:'BB',b:T+'b',state:1,cb:T+'-Q0'});
  dev(T+'-Q0',{type:'cb',bay:T,label:'Vermogenschakelaar 110 kV',a:T+'b',b:T+'h',state:1,tr:T});
  dev(T+'-CT',{type:'ct',bay:T,label:'Stroomtransformatoren',node:T+'h',ref:T+'-Q0'});
  dev(T+'-SA',{type:'sa',bay:T,label:'Overspanningsafleiders',node:T+'h',count:2});
  dev(T,{type:'tr',bay:T,label:'Transformator 110/10,5 kV · 20/25 MVA',a:T+'h',b:T+'l',state:1,oil:47,fans:false,
    blocked:false,blockText:'',blockKind:'',resettable:false,S:0,Sc:0,P:0,tap:9,avr:'auto',avrT:0,tapBusy:false,tapOps:0,U0:0,Ulv:0});
  dev('V-'+T,{type:'cb',bay:T,label:'Inkomend veld 10 kV',a:T+'l',b:bus,state:1,tr:T});}
dev('V-K',{type:'cb',bay:'K',label:'Railkoppeling 10 kV (synchrocheck)',a:'RA',b:'RB',state:0});
FEEDERS.forEach(f=>{Object.assign(f,{node:f.id,cb:'V-'+f.id,fault:null,outFrac:0,clp:1,offSince:null,oc:0,backfed:false,noise:0,wasOn:true,P:0,demand:0});
  dev(f.cb,{type:'cb',bay:f.id,label:'Uitgaand veld · '+f.name,a:f.bus,b:f.id,state:1,feeder:f});
  dev(f.id+'-Q8',{type:'es',bay:f.id,label:'Aardschakelaar kabelzijde',a:f.id,cb:f.cb});});
dev('RAIL',{type:'bb',label:'110 kV-railsysteem',node:'BB'});
dev('MS',{type:'bld',label:'10 kV-schakelinstallatie (binnen)',node:'RA'});
const LVN=new Set(['T1l','T2l','RA','RB','F1','F2','F3','F4','F5','F6']);
const ADJ={};
Object.values(D).forEach(d=>{if(['cb','ds','tr'].includes(d.type)){(ADJ[d.a]??=[]).push(d);(ADJ[d.b]??=[]).push(d);}if(d.type==='es')(ADJ[d.a]??=[]).push(d);});

const conducts=d=>d.type==='tr'||((d.type==='cb'||d.type==='ds')&&d.state===1);
function energized(){const en=new Set(),q=[];for(const L of['L1','L2'])if(SIM.lines[L].avail){en.add(L+'x');q.push(L+'x');}
  while(q.length){const n=q.pop();for(const d of ADJ[n]||[]){if(!conducts(d))continue;const m=d.a===n?d.b:d.a;if(!en.has(m)){en.add(m);q.push(m);}}}return en;}
function earthed(){const er=new Set(),q=[];Object.values(D).forEach(d=>{if(d.type==='es'&&d.state===1&&!er.has(d.a)){er.add(d.a);q.push(d.a);}});
  while(q.length){const n=q.pop();for(const d of ADJ[n]||[]){if(d.type==='tr'||!conducts(d))continue;const m=d.a===n?d.b:d.a;if(!er.has(m)){er.add(m);q.push(m);}}}return er;}
function shortNode(){const en=energized(),er=earthed();for(const n of er)if(en.has(n))return n;return null;}

const hourOf=()=>((SIM.t/60)%24+24)%24;
function profile(k,h){const g=(m,s)=>Math.exp(-(((h-m)/s)**2));
  switch(k){case 'res':return 0.36+0.22*g(7.8,1.3)+0.12*g(12.5,2.5)+0.64*g(18.8,2.0)+0.1*g(21.5,1.5);
    case 'city':return 0.42+0.35*g(10.5,3)+0.25*g(15,3)+0.35*g(18.5,2);
    case 'ind':return h>6.5&&h<17.5?0.85+0.08*Math.sin(h*1.3):0.33;
    case 'hosp':return 0.72+0.18*g(11,4);
    case 'green':return (h<6.5||h>17.5)?1.0:0.32+0.1*g(12,3);}return 1;}
let EN=new Set(),ER=new Set();
const FLOW={P110:0,U110:110,U:{RA:0,RB:0},lineP:{L1:0,L2:0},load:0};
const TAP_STEP=0.0125,U_SET=10.5,U_BAND=0.126,Z_DROP=0.05;
function computeFlows(){
  EN=energized();ER=earthed();const h=hourOf();const busLoad={RA:0,RB:0};
  FEEDERS.forEach(f=>{f.demand=f.base*profile(f.kind,h)*(1+f.noise)*f.clp;f.P=EN.has(f.node)?f.demand*(1-f.outFrac):0;busLoad[f.bus]+=f.P;D[f.cb].I=f.P*57.9;});
  FLOW.load=busLoad.RA+busLoad.RB;
  // 110 kV-netspanning (TenneT) varieert over de dag
  const U110=110.5+1.6*Math.sin((h-4)/24*2*Math.PI)+0.25*Math.sin(SIM.t*0.05)-0.012*FLOW.P110;FLOW.U110=U110;
  const feeds={RA:[],RB:[]};
  ['T1','T2'].forEach(T=>{const t=D[T];t.S=0;t.Sc=0;t.U0=EN.has(T+'h')?U110/110*10.5*(1+(t.tap-9)*TAP_STEP):0;
    const inc=D['V-'+T];if(inc.state===1&&EN.has(T+'l'))feeds[inc.b].push(T);});
  const coupled=D['V-K'].state===1;
  FLOW.U.RA=FLOW.U.RB=0;
  (coupled?[['RA','RB']]:[['RA'],['RB']]).forEach(g=>{const load=g.reduce((s,b)=>s+busLoad[b],0);const tf=g.flatMap(b=>feeds[b]);if(!tf.length)return;
    tf.forEach(T=>D[T].S+=load/tf.length/0.95);
    if(tf.length===2){const sc=25*0.052*Math.abs(D.T1.tap-D.T2.tap);tf.forEach(T=>D[T].Sc=sc);}
    const U=tf.reduce((s,T)=>s+D[T].U0-Z_DROP*10.5*(D[T].S/25),0)/tf.length;
    g.forEach(b=>FLOW.U[b]=U);tf.forEach(T=>D[T].Ulv=U);});
  ['T1','T2'].forEach(T=>{const t=D[T];if(!feeds.RA.includes(T)&&!feeds.RB.includes(T))t.Ulv=t.U0;if(t.Sc)t.S=Math.hypot(t.S,t.Sc);});
  let k=0;if(coupled){const genA=feeds.RA.reduce((s,T)=>s+D[T].S*0.95,0);k=Math.abs(genA-busLoad.RA);}D['V-K'].I=k*57.9;
  let P110=0;
  ['T1','T2'].forEach(T=>{const t=D[T];t.P=t.S*0.95;if(EN.has(T+'h'))P110+=t.P*1.006+0.02;D['V-'+T].I=t.S*55;const I=t.S*5.25;D[T+'-Q0'].I=I;D[T+'-Q1'].I=I;});
  FLOW.P110=P110;
  const feeding=['L1','L2'].filter(L=>SIM.lines[L].avail&&D[L+'-Q9'].state&&D[L+'-Q0'].state&&D[L+'-Q1'].state);
  ['L1','L2'].forEach(L=>{const p=feeding.includes(L)?P110/feeding.length:0;FLOW.lineP[L]=p;const I=p/0.95*5.25;[L+'-Q9',L+'-Q0',L+'-Q1'].forEach(id=>D[id].I=I);});
}
function nodeU(n){if(!EN.has(n))return 0;if(LVN.has(n)){if(n==='RA'||n==='RB')return FLOW.U[n];if(n[0]==='F')return FLOW.U[FEEDERS.find(f=>f.node===n).bus];return D[n.slice(0,2)].Ulv;}return FLOW.U110;}

// ---------------------------------------------------------- bediening
function addTimer(min,fn){SIM.timers.push({at:SIM.t+min,fn});}
const springOk=d=>performance.now()>=d.springAt;
function actionText(d,to){return d.type==='cb'?(to?'IN':'UIT'):(to?'GESLOTEN':'GEOPEND');}
function interlockCheck(d,to){
  if(d.type==='ds'){const cb=D[d.cb];if(cb.state===1)return `Vergrendeling: ${cb.id} moet eerst UIT`;if(to===1&&d.es&&D[d.es].state===1)return `Vergrendeling: aardschakelaar ${d.es} is gesloten`;}
  if(d.type==='es'&&to===1){if(d.ds&&D[d.ds].state===1)return `Vergrendeling: ${d.ds} moet eerst open`;if(d.cb&&D[d.cb].state===1)return `Vergrendeling: ${d.cb} moet eerst UIT`;if(EN.has(d.a))return 'Vergrendeling: spanning aanwezig (spanningsdetectie)';}
  if(d.type==='cb'&&to===1){d.state=1;const sc=shortNode();d.state=0;if(sc)return 'Vergrendeling: inschakelen op een geaard deel';}
  return null;}
function syncCheck(d){if(d.id!=='V-K'||!EN.has('RA')||!EN.has('RB'))return null;const dU=Math.abs(FLOW.U.RA-FLOW.U.RB);
  return dU>0.25?`Synchrocheck: spanningsverschil ${dU.toFixed(2).replace('.',',')} kV te groot (max 0,25) – breng de trappen gelijk`:null;}
function operate(id,to){
  const d=D[id];if(!d||!['cb','ds','es'].includes(d.type)||d.state===to)return;
  if(d.busy)return deny('Bediening loopt nog…');
  if(d.type==='cb'&&to===1){
    if(d.tr&&D[d.tr].blocked)return deny(`${d.tr} geblokkeerd door relais 86 (${D[d.tr].blockText}) – eerst resetten`);
    if(!springOk(d))return deny(`${id}: inschakelveer wordt nog geladen…`);}
  computeFlows();
  if(d.type==='cb'&&to===1){const s=syncCheck(d);if(s)return deny(s);}
  if(SIM.interlock){const r=interlockCheck(d,to);if(r)return deny(r);}
  let arc=null;
  if(d.type==='ds'){const cb=D[d.cb];if(cb.state===1&&(EN.has(d.a)||EN.has(d.b)))arc=d.a;}
  const trDead=d.tr&&id.endsWith('-Q0')&&!EN.has(d.tr+'h');
  d.state=to;d.ops++;if(d.type==='cb'&&to===1)d.springAt=performance.now()+7000;
  pushAlarm(`Bediening ${id} ${actionText(d,to)}`,'op');
  const v=VIEWS[id];
  if(d.type==='cb')AudioSys.breaker(v?distGain(v.center):0.5);else{d.busy=!!v;AudioSys.motor(d.type==='es'?2.2:2.8,v?distGain(v.center):0.5);}
  if(arc){SIM.incidents++;pushAlarm(`${id} geschakeld met ${d.cb} IN – vlamboog! Beveiliging grijpt in`,'crit');spawnArc(v?v.arcPos:null,1.3);tripFrom(arc);}
  else{const sc=shortNode();if(sc){SIM.incidents++;
    pushAlarm(d.type==='es'?`Aardschakelaar ${id} op spanning gesloten – kortsluiting!`:d.type==='cb'?`${id} ingeschakeld op geaard deel – kortsluiting!`:`Kortsluiting na bediening ${id}!`,'crit');
    spawnArc(v?v.arcPos:null,1.4);tripFrom(sc);}}
  if(trDead&&to===1){computeFlows();if(EN.has(d.tr+'h'))pushAlarm(`${d.tr}: inschakelstroom (inrush) – 2e-harmonische blokkering voorkomt onterechte differentiaaltrip`,'info');}
  const f=d.feeder;
  if(d.type==='cb'&&to===1&&f&&f.fault&&f.fault.stage==='search'){setTimeout(()=>{computeFlows();if(d.state===1&&EN.has(f.node)){d.state=0;AudioSys.breaker(0.5);pushAlarm(`${id}: ingeschakeld op kortsluiting – I>> momentaan trip. Wacht op de storingsdienst!`,'warn');refreshAll();}},220);}
  refreshAll();
}
function tripFrom(node){
  const seen=new Set([node]),q=[node],tripped=[];let src=null;
  while(q.length){const n=q.pop();if(n==='L1x'||n==='L2x')src=n.slice(0,2);
    for(const d of ADJ[n]||[]){if(d.type==='es')continue;if(d.type==='cb'){if(d.state===1){d.state=0;tripped.push(d.id);}continue;}if(d.type==='ds'&&d.state!==1)continue;
      const m=d.a===n?d.b:d.a;if(!seen.has(m)){seen.add(m);q.push(m);}}}
  setTimeout(()=>{tripped.forEach(id=>pushAlarm(`${id}: beveiliging – UIT`,'warn'));if(tripped.length)AudioSys.breaker(0.6);},120);
  if(src){const ln=SIM.lines[src];if(ln.avail){ln.avail=false;ln.reason='afgeschakeld door TenneT (fout in station)';pushAlarm(`TenneT: lijn ${src} aan overzijde afgeschakeld – fout in OS Zuidwolde`,'crit');addTimer(rnd(10,18),()=>lineRestore(src));}}
}
function tripBreaker(id){const d=D[id];if(d.state!==1)return false;d.state=0;const v=VIEWS[id];AudioSys.breaker(v?distGain(v.center):0.5);return true;}
function lineRestore(L){const ln=SIM.lines[L];if(ln.avail||ln.maint)return;
  if(D[L+'-Q8'].state===1){pushAlarm(`TenneT: lijn ${L} kan niet onder spanning – ${L}-Q8 is geaard`,'warn');addTimer(5,()=>lineRestore(L));return;}
  ln.avail=true;ln.reason='';pushAlarm(`TenneT: lijn ${L} ${ln.name} weer onder spanning – ${L}-Q0 mag weer IN`,'ok');}
function lineLockout(L){const ln=SIM.lines[L];ln.avail=false;ln.reason='blijvende fout, ploeg onderweg';const m=rnd(25,50);
  pushAlarm(`TenneT: blijvende fout op lijn ${L} – herstel verwacht over ±${Math.round(m)} min`,'warn');addTimer(m,()=>lineRestore(L));}
function toggleAR(L){const ln=SIM.lines[L];ln.ar=!ln.ar;pushAlarm(`Automatische herinschakeling ${L} ${ln.ar?'IN':'UIT'}bedrijf gesteld`,'op');refreshAll();}

// ---------------------------------------------------------- transformator: blokkering 86, trappenschakelaar
function tripTrafo(T,reason,inspectMin,kind){const t=D[T];tripBreaker(T+'-Q0');tripBreaker('V-'+T);
  t.blocked=true;t.resettable=false;t.blockText=reason;t.blockKind=kind;
  pushAlarm(`${T}: ${reason} – ${T}-Q0 en V-${T} UIT, blokkeerrelais 86 aangesproken`,'crit');
  if(inspectMin)addTimer(inspectMin,()=>{t.resettable=true;pushAlarm(`${T}: inspectie gereed, geen schade gevonden – reset blokkeerrelais 86 in het transformatorpaneel`,'ok');});
  setTimeout(()=>{computeFlows();if(FEEDERS.some(f=>!EN.has(f.node)&&D[f.cb].state===1))pushAlarm('Tip: sluit railkoppeling V-K om de klanten via de andere transformator te voeden (let op de belasting!)','info');},600);}
function resetLockout(T){const t=D[T];if(!t.blocked)return;
  if(!t.resettable)return deny(`Reset 86 niet mogelijk: ${t.blockKind==='temp'?'transformator nog te warm (< 75 °C)':'inspectie nog niet gereed'}`);
  t.blocked=false;t.blockText='';pushAlarm(`${T}: blokkeerrelais 86 gereset – transformator vrijgegeven`,'op');refreshAll();}
function setAVR(T,mode){D[T].avr=mode;D[T].avrT=0;pushAlarm(`${T}: spanningsregelaar op ${mode==='auto'?'AUTOMATISCH':'HAND'}`,'op');refreshAll();}
function moveTap(T,dir,manual){const t=D[T];const n=clamp(t.tap+dir,1,17);if(n===t.tap)return false;
  t.tapBusy=true;const v=VIEWS[T];AudioSys.motor(1.4,v?distGain(v.center)*0.6:0.2);
  setTimeout(()=>{t.tap=n;t.tapOps++;t.tapBusy=false;refreshAll();},manual?1500:300);return true;}
function tapStep(T,dir){const t=D[T];if(t.avr==='auto')return deny(`${T}: regelaar staat op AUTO – zet eerst op HAND`);if(t.tapBusy)return deny('Trappenschakelaar draait nog…');
  if(!moveTap(T,dir,true))return deny(`${T}: eindstand trappenschakelaar bereikt`);pushAlarm(`${T}: trap ${dir>0?'hoger':'lager'} → ${t.tap+dir}`,'op');}
function regulate(dm){
  const both=D['V-K'].state===1&&['T1','T2'].every(T=>D[T].Ulv>0&&D['V-'+T].state===1&&EN.has(T+'l'));
  ['T1','T2'].forEach(T=>{const t=D[T];if(t.avr!=='auto'||!EN.has(T+'h')||t.tapBusy){t.avrT=0;return;}
    if(both&&T==='T2'&&D.T1.avr==='auto'){if(t.tap!==D.T1.tap)moveTap(T,Math.sign(D.T1.tap-t.tap));return;}  // follower
    const dev=t.Ulv-U_SET;
    if(Math.abs(dev)>U_BAND){t.avrT+=dm;if(t.avrT>=1){moveTap(T,dev<0?1:-1);t.avrT=0.75;}}else t.avrT=0;});
  const dk=Math.abs(D.T1.tap-D.T2.tap);
  if(both&&dk>=2&&!SIM.circAlarm){SIM.circAlarm=true;pushAlarm(`Circulatiestroom tussen T1 en T2 (${dk} trappen verschil) – breng de trappen gelijk of zet de regelaars op AUTO`,'warn');}
  if(!both||dk<2)SIM.circAlarm=false;
  ['RA','RB'].forEach(b=>{const U=FLOW.U[b],k='uAl'+b;if(U>0&&(U<10.0||U>11.0)){if(!SIM[k]){SIM[k]=true;pushAlarm(`Rail ${b==='RA'?'A':'B'}: spanning ${U.toFixed(2).replace('.',',')} kV buiten band (10,0 – 11,0 kV)`,'warn');}}else if(U>=10.1&&U<=10.9)SIM[k]=false;});
}
function thermal(dm){const h=hourOf(),amb=11+5*Math.sin((h-9)/24*2*Math.PI);
  ['T1','T2'].forEach(T=>{const t=D[T],on=EN.has(T+'h'),k=t.S/(t.fans?25:20);
    const target=amb+(on?8:0)+62*k*k;t.oil+=(target-t.oil)*(1-Math.exp(-dm/32));
    if(!t.fans&&on&&t.oil>65){t.fans=true;pushAlarm(`${T}: olie ${t.oil.toFixed(0)} °C – koeling ONAF, ventilatoren aan`,'info');}
    if(t.fans&&(t.oil<57||!on))t.fans=false;
    if(t.oil>90&&!t.hot){t.hot=true;pushAlarm(`${T}: olietemperatuur hoog (${t.oil.toFixed(0)} °C) – overbelast! Verlaag de belasting`,'warn');}
    if(t.oil<85)t.hot=false;
    if(t.oil>=100&&(D[T+'-Q0'].state||D['V-'+T].state))tripTrafo(T,'thermische beveiliging (olie ≥ 100 °C)',0,'temp');
    if(t.blocked&&t.blockKind==='temp'&&!t.resettable&&t.oil<75){t.resettable=true;pushAlarm(`${T}: afgekoeld tot ${t.oil.toFixed(0)} °C – blokkeerrelais 86 mag worden gereset`,'ok');}});}

// ---------------------------------------------------------- 10 kV-velden: koude-lastopname en overstroom
function feederTick(dm){FEEDERS.forEach(f=>{const on=EN.has(f.node);
  if(f.backfed)f.offSince=null;
  else if(!on){if(f.offSince==null)f.offSince=SIM.t;}
  else if(f.offSince!=null){const dur=SIM.t-f.offSince;f.offSince=null;
    if(dur>5){f.clp=Math.max(f.clp,1+0.6*Math.min(1,dur/90));if(f.clp>1.12)pushAlarm(`${f.id} ${f.name}: koude-lastopname na ${Math.round(dur)} min uitval – belasting +${Math.round((f.clp-1)*100)}%`,'info');}}
  f.clp=1+(f.clp-1)*Math.exp(-dm/18);
  const r=f.P/(f.base*1.15);
  if(r>1.3&&D[f.cb].state===1){f.oc+=dm*(r*r-1)/10;if(f.oc>=1){f.oc=0;tripBreaker(f.cb);pushAlarm(`${f.cb} ${f.name}: overstroombeveiliging I> na ${Math.round(r*100)}% belasting (koude-lastopname)`,'warn');}}
  else f.oc=Math.max(0,f.oc-dm*0.1);});}

// ---------------------------------------------------------- storingen
function randomEvent(){const r=Math.random();if(r<0.3)return lineFault();if(r<0.75)return feederFault();return trafoFault();}
function lineFault(){const c=['L1','L2'].filter(L=>SIM.lines[L].avail&&!SIM.lines[L].maint&&D[L+'-Q0'].state===1);if(!c.length)return feederFault();const L=pick(c),ln=SIM.lines[L];
  lightning(L);const perm=Math.random()<0.35;
  setTimeout(()=>{tripBreaker(L+'-Q0');pushAlarm(`${L} ${ln.name}: blikseminslag – distantiebeveiliging zone 1, ${L}-Q0 UIT`,'crit');
    if(ln.ar){pushAlarm(`${L}: automatische herinschakeling gestart (dode tijd 1 s)`,'info');
      setTimeout(()=>{const d=D[L+'-Q0'];if(d.state!==0||!ln.avail)return;
        if(!springOk(d)){pushAlarm(`${L}: herinschakeling geblokkeerd – inschakelveer niet geladen`,'warn');if(perm)lineLockout(L);return;}
        d.state=1;d.ops++;d.springAt=performance.now()+7000;const v=VIEWS[d.id];AudioSys.breaker(v?distGain(v.center):0.5);
        if(!perm)pushAlarm(`${L}: herinschakeling geslaagd – lijn weer in bedrijf`,'ok');
        else setTimeout(()=>{tripBreaker(d.id);pushAlarm(`${L}: herinschakeling mislukt (blijvende fout) – ${L}-Q0 definitief UIT`,'crit');lineLockout(L);refreshAll();},260);
        refreshAll();},1200);}
    else if(perm)lineLockout(L);
    else pushAlarm(`TenneT: lijn ${L} na herinschakeling aan de overzijde weer onder spanning – ${L}-Q0 mag weer IN`,'info');
    refreshAll();},700);}
function feederFault(){const c=FEEDERS.filter(f=>D[f.cb].state===1&&EN.has(f.node)&&!f.fault&&!f.backfed);if(!c.length)return;const f=pick(c);
  tripBreaker(f.cb);f.fault={stage:'search',frac:rnd(0.12,0.35)};
  const why=pick(['kabelbeschadiging door graafwerk','mofstoring','kortsluiting in een middenspanningsruimte','kabelfout (veroudering)']);
  const ts=rnd(12,25);
  pushAlarm(`${f.cb} ${f.name}: overstroombeveiliging I>> – ${why}`,'crit');
  pushAlarm(`Storingsdienst: monteur onderweg naar ${f.id}, foutzoeken ±${Math.round(ts)} min. Veld nog niet inschakelen!`,'info');
  addTimer(ts,()=>{f.fault.stage='isolated';f.outFrac=f.fault.frac;
    pushAlarm(`Storingsdienst: fout in ${f.id} gelokaliseerd en weggeschakeld – ${f.cb} mag IN. ${Math.round(f.cust*f.outFrac)} klanten wachten op reparatie`,'ok');
    addTimer(rnd(40,80),()=>{f.fault=null;f.outFrac=0;pushAlarm(`Storingsdienst: kabel ${f.id} gerepareerd – alle klanten van ${f.name} terug`,'ok');});});
  refreshAll();}
function trafoFault(){const c=['T1','T2'].filter(T=>!D[T].blocked&&D[T+'-Q0'].state===1&&EN.has(T+'h')&&!(TASK&&TASK.tr===T));if(!c.length)return feederFault();const T=pick(c);
  const v=VIEWS[T];if(v)spawnArc(v.arcPos,0.6);
  tripTrafo(T,pick(['Buchholz-beveiliging (gasontwikkeling)','differentiaalbeveiliging','drukontlastklep aangesproken']),rnd(40,80),'prot');refreshAll();}

// ---------------------------------------------------------- werkopdrachten
let TASK=null,taskSeq=411;
function lineTask(L){const ln=SIM.lines[L];return{title:`Onderhoud lijnveld ${L} (${ln.name})`,desc:`Monteurs gaan scheider ${L}-Q9 smeren en inspecteren. Schakel het veld vrij en aard de lijn.`,steps:[
  {t:`Schakel ${L}-Q0 UIT`,ok:()=>D[L+'-Q0'].state===0},
  {t:`Open lijnscheider ${L}-Q9`,ok:()=>D[L+'-Q9'].state===0},
  {t:`Open railscheider ${L}-Q1`,ok:()=>D[L+'-Q1'].state===0,done:()=>{ln.maint=true;pushAlarm(`TenneT: verzoek ontvangen – lijn ${L} wordt aan de overzijde vrijgeschakeld`,'info');
    addTimer(3,()=>{if(ln.avail){ln.avail=false;ln.reason='vrijgeschakeld voor werkzaamheden';}pushAlarm(`TenneT: lijn ${L} spanningsloos – aarden toegestaan`,'info');});}},
  {t:'Wacht op TenneT: lijn spanningsloos',ok:()=>!ln.avail},
  {t:`Sluit aardschakelaar ${L}-Q8`,ok:()=>D[L+'-Q8'].state===1,done:()=>pushAlarm(`Werkvergunning afgegeven – werkzaamheden ${L} gestart`,'info')},
  {t:'Werkzaamheden in uitvoering…',wait:40},
  {t:`Werk gereed – open aardschakelaar ${L}-Q8`,ok:()=>D[L+'-Q8'].state===0,done:()=>{ln.maint=false;addTimer(3,()=>{ln.avail=true;ln.reason='';pushAlarm(`TenneT: lijn ${L} weer onder spanning`,'ok');});}},
  {t:'Wacht op TenneT: lijn onder spanning',ok:()=>ln.avail},
  {t:`Sluit ${L}-Q1 en ${L}-Q9`,ok:()=>D[L+'-Q1'].state&&D[L+'-Q9'].state},
  {t:`Schakel ${L}-Q0 IN`,ok:()=>D[L+'-Q0'].state===1}]};}
function trafoTask(T){return{tr:T,title:`Onderhoud transformator ${T}`,desc:`De trappenschakelaar van ${T} krijgt onderhoud. Neem ${T} uit bedrijf zonder klanten af te schakelen.`,steps:[
  {t:'Sluit 10 kV-railkoppeling V-K (synchrocheck)',ok:()=>D['V-K'].state===1},
  {t:`Schakel V-${T} UIT (10 kV)`,ok:()=>D['V-'+T].state===0},
  {t:`Schakel ${T}-Q0 UIT (110 kV)`,ok:()=>D[T+'-Q0'].state===0},
  {t:`Open railscheider ${T}-Q1`,ok:()=>D[T+'-Q1'].state===0,done:()=>pushAlarm(`Werkvergunning afgegeven – onderhoud ${T} gestart`,'info')},
  {t:'Onderhoud in uitvoering…',wait:35},
  {t:`Werk gereed – sluit ${T}-Q1`,ok:()=>D[T+'-Q1'].state===1},
  {t:`Schakel ${T}-Q0 IN`,ok:()=>D[T+'-Q0'].state===1},
  {t:`Schakel V-${T} IN`,ok:()=>D['V-'+T].state===1},
  {t:'Open railkoppeling V-K',ok:()=>D['V-K'].state===0}]};}
function feederTask(F){const f=FEEDERS.find(x=>x.id===F);return{feeder:F,title:`Kabelwerk ${F} (${f.name})`,desc:`Een kabelploeg vervangt een mof in ${F}. De storingsdienst schakelt de klanten eerst om via het net; daarna kun je het veld vrijschakelen en de kabel aarden.`,steps:[
  {t:'Wacht: storingsdienst schakelt klanten om (terugvoeding)',wait:6,done:()=>{f.backfed=true;pushAlarm(`Storingsdienst: klanten van ${F} omgeschakeld via het net – ${f.cb} mag UIT`,'info');}},
  {t:`Schakel ${f.cb} UIT`,ok:()=>D[f.cb].state===0},
  {t:`Sluit aardschakelaar ${F}-Q8 (kabelzijde)`,ok:()=>D[F+'-Q8'].state===1,done:()=>pushAlarm(`Werkvergunning afgegeven – kabelwerk ${F} gestart`,'info')},
  {t:'Kabelwerk in uitvoering…',wait:35},
  {t:`Werk gereed – open ${F}-Q8`,ok:()=>D[F+'-Q8'].state===0},
  {t:`Schakel ${f.cb} IN`,ok:()=>D[f.cb].state===1&&EN.has(f.node),done:()=>addTimer(4,()=>{f.backfed=false;pushAlarm(`Storingsdienst: terugvoeding ${F} opgeheven – normale situatie`,'ok');})}]};}
let taskCycle=0;
function offerTask(){const defs=[()=>trafoTask('T2'),()=>feederTask('F3'),()=>lineTask('L2'),()=>feederTask('F5'),()=>trafoTask('T1'),()=>lineTask('L1')];
  TASK=defs[taskCycle++%defs.length]();TASK.i=0;TASK.code='WV-2026-'+(taskSeq++);
  pushAlarm(`Nieuwe werkopdracht ${TASK.code}: ${TASK.title}`,'info');AudioSys.chime();renderTasks();}
function taskTick(){if(!TASK)return;let guard=0;
  while(TASK&&guard++<20){const st=TASK.steps[TASK.i];
    if(st.wait!=null){if(st.until==null)st.until=SIM.t+st.wait;if(SIM.t<st.until)break;}else if(!st.ok())break;
    st.done&&st.done();TASK.i++;
    if(TASK.i>=TASK.steps.length){SIM.tasksDone++;pushAlarm(`Werkopdracht ${TASK.code} voltooid ✓`,'ok');AudioSys.chime();TASK=null;SIM.nextTaskAt=SIM.t+rnd(50,90);}
    renderTasks();}}

function initTaps(){for(let i=0;i<3;i++){computeFlows();['T1','T2'].forEach(T=>{const t=D[T];if(t.Ulv>0)t.tap=clamp(t.tap+Math.round((U_SET-t.Ulv)/(10.5*TAP_STEP)),1,17);});}computeFlows();}
const custOff=f=>f.backfed?0:!EN.has(f.node)?f.cust:Math.round(f.cust*f.outFrac);
function simStep(dtReal){
  if(SIM.paused)return;
  const dm=dtReal*SIM.speed/60;SIM.t+=dm;
  SIM.timers.sort((a,b)=>a.at-b.at);while(SIM.timers.length&&SIM.timers[0].at<=SIM.t)SIM.timers.shift().fn();
  FEEDERS.forEach(f=>{f.noise+=(-f.noise*0.08+(Math.random()-0.5)*0.03)*Math.min(1,dm);});
  computeFlows();thermal(dm);regulate(dm);feederTick(dm);
  let off=0;FEEDERS.forEach(f=>{const on=EN.has(f.node);off+=custOff(f);
    if(on!==f.wasOn){f.wasOn=on;if(on)pushAlarm(`${f.id} ${f.name}: spanning hersteld`,'ok');
      else if(f.backfed)pushAlarm(`${f.id} ${f.name}: veld spanningsloos – klanten via terugvoeding gevoed`,'info');
      else pushAlarm(`${f.id} ${f.name}: spanningsloos – ${f.cust.toLocaleString('nl-NL')} ${f.cust===1?'aansluiting (prioriteit!)':'klanten'} zonder stroom`,f.prio?'crit':'warn');}});
  SIM.off=off;SIM.cml+=off*dm;
  if(SIM.t>=SIM.nextEvent){randomEvent();SIM.nextEvent=SIM.t+rnd(35,75);}
  if(!TASK&&SIM.t>=SIM.nextTaskAt)offerTask();
  taskTick();
}
