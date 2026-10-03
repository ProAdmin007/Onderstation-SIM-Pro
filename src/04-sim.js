
// ============================================================ simulatie
const SIM={t:9*60,speed:60,paused:true,interlock:true,cml:0,incidents:0,tasksDone:0,off:0,
  nextEvent:9*60+16,nextTaskAt:9*60+3,timers:[],
  lines:{L1:{name:'Hoogeveen',avail:true,reason:'',maint:false,ar:true},L2:{name:'Meppel',avail:true,reason:'',maint:false,ar:true}}};
if(params.get('t')){SIM.t=parseFloat(params.get('t'))*60;SIM.nextEvent=SIM.t+16;SIM.nextTaskAt=SIM.t+3;}
const FEEDERS=[
  {id:'F1',name:'Ring Centrum (MS6–MS7)',short:'Centrum',kind:'city',base:0,cust:0,bus:'RA',ring:true},
  {id:'F2',name:'Ring De Vaart (MS8–MS9)',short:'De Vaart',kind:'ind',base:0,cust:0,bus:'RA',ring:true},
  {id:'F3',name:'Ring west (MS1–MS3)',short:'Ring W',kind:'res',base:0,cust:0,bus:'RA',ring:true},
  {id:'F4',name:'Ring oost (MS4–MS5)',short:'Ring O',kind:'res',base:0,cust:0,bus:'RB',ring:true},
  {id:'F5',name:'Ziekenhuis',short:'Ziekenh.',kind:'hosp',base:2.8,cust:1,bus:'RB',prio:true},
  {id:'F6',name:'Glastuinbouw Oost',short:'Kassen',kind:'green',base:7.5,cust:40,bus:'RB'},
  {id:'G1',name:'Zonnepark De Hoeve',short:'Zonnepark',kind:'pv',base:12,cust:0,bus:'RC',gen:true},
  {id:'G2',name:'Industrieterrein Noord',short:'Ind. Noord',kind:'ind',base:8.5,cust:60,bus:'RC'},
  {id:'G3',name:'Buitengebied Oost',short:'Buitengeb.',kind:'res',base:6.5,cust:5200,bus:'RC'},
  {id:'G4',name:'Waterzuivering',short:'RWZI',kind:'hosp',base:2.4,cust:1,bus:'RC'}];
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
// transformatoren: T1 → 10 kV, T2 → 20 kV, T3 = omschakelbare reserve voor 10 of 20 kV
const TR=['T1','T2','T3'],RES='T3';
const TR_LV={T1:['V-T1'],T2:['W-T2'],T3:['V-T3','W-T3']};
const TR_INFO={T1:{label:'Transformator 110/10,5 kV · 31,5/40 MVA',un:10.5,rON:31.5,rAF:40},
  T2:{label:'Transformator 110/21 kV · 20/25 MVA',un:21,rON:20,rAF:25},
  T3:{label:'Reservetransformator 110/10,5-21 kV · 20/25 MVA · omschakelbaar',un:10.5,rON:20,rAF:25}};
for(const T of TR){
  dev(T+'-Q1',{type:'ds',bay:T,label:'Railscheider',a:'BB',b:T+'b',state:1,cb:T+'-Q0'});
  dev(T+'-Q0',{type:'cb',bay:T,label:'Vermogenschakelaar 110 kV',a:T+'b',b:T+'h',state:1,tr:T});
  dev(T+'-CT',{type:'ct',bay:T,label:'Stroomtransformatoren',node:T+'h',ref:T+'-Q0'});
  dev(T+'-SA',{type:'sa',bay:T,label:'Overspanningsafleiders',node:T+'h',count:2});
  dev(T,{type:'tr',bay:T,label:TR_INFO[T].label,un:TR_INFO[T].un,rON:TR_INFO[T].rON,rAF:TR_INFO[T].rAF,a:T+'h',b:T+'l',state:1,oil:T===RES?30:47,fans:false,
    blocked:false,blockText:'',blockKind:'',resettable:false,S:0,Sc:0,P:0,tap:9,avr:'auto',avrT:0,tapBusy:false,tapOps:0,U0:0,Ulv:0,rev:false});}
D[RES].ratio='10';D[RES].reserve=true;
dev('V-T1',{type:'cb',bay:'T1',label:'Inkomend veld 10 kV',a:'T1l',b:'RA',state:1,tr:'T1'});
dev('W-T2',{type:'cb',bay:'T2',label:'Inkomend veld 20 kV',a:'T2l',b:'RC',state:1,tr:'T2'});
dev('V-T3',{type:'cb',bay:'T3',label:'Reserve-inkomend veld 10 kV (rail B)',a:'T3l',b:'RB',state:0,tr:'T3',need:'10'});
dev('W-T3',{type:'cb',bay:'T3',label:'Reserve-inkomend veld 20 kV',a:'T3l',b:'RC',state:0,tr:'T3',need:'20'});
dev('V-K',{type:'cb',bay:'K',label:'Railkoppeling 10 kV (synchrocheck)',a:'RA',b:'RB',state:1});
FEEDERS.forEach(f=>{Object.assign(f,{node:f.id,cb:(f.bus==='RC'?'W-':'V-')+f.id,rate:f.ring?9:f.base*1.15,fault:null,outFrac:0,clp:1,offSince:null,oc:0,backfed:false,noise:0,wasOn:true,P:0,demand:0});
  dev(f.cb,{type:'cb',bay:f.id,label:(f.gen?'Productieveld · ':'Uitgaand veld · ')+f.name,a:f.bus,b:f.id,state:1,feeder:f});
  dev(f.id+'-Q8',{type:'es',bay:f.id,label:'Aardschakelaar kabelzijde',a:f.id,cb:f.cb});});
// ---------- 10 kV-ringen achter het station: elke ring loopt tussen twee uitgaande velden en heeft een normaal-open punt
const RINGS=[
 {id:'R1',name:'Ring Woonwijk',from:'F3',to:'F4',nop:'MS3-R',stations:[
  {id:'MS1',name:'Esdoornlaan',short:'Esdoornln',pos:[-60,108],face:0,groups:[['Woningen Esdoornlaan',600,'res',0.45],['Woningen Lindehof',520,'res',0.4],['Basisschool De Linde',1,'city',0.15],['Supermarkt',1,'city',0.3]]},
  {id:'MS2',name:'Berkenhof',short:'Berkenhof',pos:[-91,170],face:1,groups:[['Woningen Berkenhof',700,'res',0.5],['Woningen Populierenlaan',650,'res',0.45],['Sporthal',1,'city',0.2]]},
  {id:'MS3',name:'Molenweg',short:'Molenweg',pos:[-60,232],face:2,groups:[['Woningen Molenweg',800,'res',0.6],['Appartementen De Molen',420,'res',0.35],['Huisartsenpost',1,'hosp',0.1],['Woningen Kerkpad',500,'res',0.4]]},
  {id:'MS4',name:'Zuiderveld',short:'Zuiderveld',pos:[86,232],face:2,groups:[['Woningen Zuiderveld',900,'res',0.65],['Woningen Akkerweg',780,'res',0.55],['Laadplein elektrische auto\'s',1,'city',0.4]]},
  {id:'MS5',name:'Bedrijvenpark Zuid',short:'Bedr.park',pos:[118,108],face:0,groups:[['Transportbedrijf',1,'ind',0.6],['Koelhuis',1,'ind',0.8],['Garage en werkplaats',1,'ind',0.25],['Kantoren',25,'city',0.4],['Woningen Zuidrand',520,'res',0.4]]}]},
 {id:'R2',name:'Ring Centrum – De Vaart',from:'F1',to:'F2',nop:'MS7-R',stations:[
  {id:'MS6',name:'Marktplein',short:'Marktplein',pos:[-95,281],face:0,groups:[['Winkels Marktplein',85,'city',0.55],['Horeca Marktplein',30,'city',0.4],['Appartementen De Markt',380,'res',0.3],['Bibliotheek',1,'city',0.12]]},
  {id:'MS7',name:'Stationsstraat',short:'Stationsstr',pos:[-30,379],face:2,groups:[['Kantoren Stationsstraat',40,'city',0.55],['Appartementen Spoorzicht',460,'res',0.35],['Treinstation',1,'city',0.25],['Gemeentehuis',1,'city',0.3]]},
  {id:'MS8',name:'De Vaart Noord',short:'Vaart N',pos:[80,281],face:0,groups:[['Metaalbewerking Smit',1,'ind',0.9],['Bedrijfsunits Noord',24,'ind',0.35],['Tankstation',1,'city',0.12]]},
  {id:'MS9',name:'De Vaart Zuid',short:'Vaart Z',pos:[150,379],face:2,groups:[['Distributiecentrum',1,'ind',1.1],['Bouwmarkt',1,'city',0.35],['Bedrijfsunits Zuid',30,'ind',0.3]]}]}];
const RING={secs:[],stations:[]};   // alle stations en kabelsecties van alle ringen
const RING_MV=new Set(),RING_LV=new Set(),LVG=[];
RINGS.forEach(rg=>{const st=rg.stations,n=st.length,cable=[rg.from];
  for(let i=1;i<n;i++)cable.push('K'+st[i-1].id.slice(2)+st[i].id.slice(2));cable.push(rg.to);cable.forEach(c=>RING_MV.add(c));rg.cable=cable;
  st.forEach((s,i)=>{const M='M'+s.id.slice(2);Object.assign(s,{node:M,ring:rg,flag:false,wasOn:true,unplanned:false,wait:0,P:0,cust:0});
    RING_MV.add(M);RING_MV.add(M+'t');RING_LV.add(M+'v');RING.stations.push(s);
    dev(s.id,{type:'kiosk',bay:s.id,label:'MS-station '+s.name+' · 10/0,4 kV 1600 kVA',node:M,st:s});
    dev(s.id+'-L',{type:'lbs',bay:s.id,label:'Lastscheider kabel '+(i?'naar '+st[i-1].id:'naar OS (V-'+rg.from+')'),a:cable[i],b:M,state:1});
    dev(s.id+'-R',{type:'lbs',bay:s.id,label:'Lastscheider kabel '+(i<n-1?'naar '+st[i+1].id:'naar OS (V-'+rg.to+')'),a:M,b:cable[i+1],state:s.id+'-R'===rg.nop?0:1});
    dev(s.id+'-T',{type:'lbs',bay:s.id,label:'Transformatorschakelaar met zekeringen',a:M,b:M+'t',state:1});
    dev(s.id+'-TR',{type:'mstr',bay:s.id,label:'Distributietransformator 10/0,4 kV',a:M+'t',b:M+'v',state:1});
    s.groups=s.groups.map(([name,cust,kind,base],j)=>{const id=s.id+'-G'+(j+1);RING_LV.add(id);s.cust+=cust;
      const g={id,name,short:name,cust,kind,base,node:id,st:s,noise:0,clp:1,offSince:null,outFrac:0,backfed:false,Pc:0};LVG.push(g);
      dev(id,{type:'lvs',bay:s.id,label:'Laagspanningsveld · '+name,a:M+'v',b:id,state:1,lvg:g});return g;});});
  for(let i=0;i<=n;i++)RING.secs.push({id:cable[i],node:cable[i],ring:rg,a:i?st[i-1].id:null,b:i<n?st[i].id:null,fault:false,located:false});});
const CONS=FEEDERS.filter(f=>!f.ring).concat(LVG);   // alle afnemers (MS-velden en LS-groepen in de ring)
dev('RAIL',{type:'bb',label:'110 kV-railsysteem',node:'BB'});
dev('MS',{type:'bld',label:'10 kV-schakelinstallatie (binnen)',node:'RA'});
dev('MS20',{type:'bld',label:'20 kV-schakelinstallatie (binnen)',node:'RC'});
const LV10=new Set(['T1l','RA','RB','F1','F2','F3','F4','F5','F6']),LV20=new Set(['T2l','RC','G1','G2','G3','G4']);
function lvl(n){if(RING_LV.has(n))return 0.4;if(RING_MV.has(n))return 10;if(n===RES+'l')return +D[RES].ratio;return LV10.has(n)?10:LV20.has(n)?20:110;}
const trafoUn=T=>T===RES?(D[RES].ratio==='10'?10.5:21):D[T].un;
const kA=b=>b==='RC'?28.9:57.9;   // A per MW bij cos φ 0,95
const ADJ={};
Object.values(D).forEach(d=>{if(['cb','ds','tr','lbs','lvs','mstr'].includes(d.type)){(ADJ[d.a]??=[]).push(d);(ADJ[d.b]??=[]).push(d);}if(d.type==='es')(ADJ[d.a]??=[]).push(d);});

const conducts=d=>d.type==='tr'||d.type==='mstr'||(['cb','ds','lbs','lvs'].includes(d.type)&&d.state===1);
function energized(){const en=new Set(),q=[];for(const L of['L1','L2'])if(SIM.lines[L].avail){en.add(L+'x');q.push(L+'x');}
  while(q.length){const n=q.pop();for(const d of ADJ[n]||[]){if(!conducts(d))continue;const m=d.a===n?d.b:d.a;if(!en.has(m)){en.add(m);q.push(m);}}}return en;}
function earthed(){const er=new Set(),q=[];Object.values(D).forEach(d=>{if(d.type==='es'&&d.state===1&&!er.has(d.a)){er.add(d.a);q.push(d.a);}});
  while(q.length){const n=q.pop();for(const d of ADJ[n]||[]){if(d.type==='tr'||d.type==='mstr'||!conducts(d))continue;const m=d.a===n?d.b:d.a;if(!er.has(m)){er.add(m);q.push(m);}}}return er;}
function shortNode(){const en=energized(),er=earthed();for(const n of er)if(en.has(n))return n;return null;}

const hourOf=()=>((SIM.t/60)%24+24)%24;
function profile(k,h){const g=(m,s)=>Math.exp(-(((h-m)/s)**2));
  switch(k){case 'res':return 0.36+0.22*g(7.8,1.3)+0.12*g(12.5,2.5)+0.64*g(18.8,2.0)+0.1*g(21.5,1.5);
    case 'city':return 0.42+0.35*g(10.5,3)+0.25*g(15,3)+0.35*g(18.5,2);
    case 'ind':return h>6.5&&h<17.5?0.85+0.08*Math.sin(h*1.3):0.33;
    case 'hosp':return 0.72+0.18*g(11,4);
    case 'green':return (h<6.5||h>17.5)?1.0:0.32+0.1*g(12,3);
    case 'pv':return -Math.max(0,Math.sin(Math.PI*(h-8)/11))*(0.75+0.25*Math.sin(SIM.t*0.011));}return 1;}
let EN=new Set(),ER=new Set();
const FLOW={P110:0,U110:110,U:{RA:0,RB:0,RC:0},lineP:{L1:0,L2:0},load:0,load20:0,groups:[]};
const TAP_STEP=0.0125,Z_DROP=0.05;
function computeFlows(){
  EN=energized();ER=earthed();const h=hourOf();const busLoad={RA:0,RB:0,RC:0};
  FLOW.TAG=supplyTags();const feederP={};
  CONS.forEach(c=>{c.demand=c.base*profile(c.kind,h)*(1+c.noise)*(c.gen?1:c.clp);c.Pc=EN.has(c.node)?c.demand*(1-c.outFrac):0;
    const t=FLOW.TAG[c.node];if(t&&c.Pc){busLoad[t.bus]+=c.Pc;if(t.cb)feederP[t.cb]=(feederP[t.cb]||0)+c.Pc;}});
  FEEDERS.forEach(f=>{f.P=feederP[f.cb]||0;D[f.cb].I=Math.abs(f.P)*kA(f.bus);});
  RING.stations.forEach(s=>{s.P=s.groups.reduce((a,g)=>a+g.Pc,0);});
  FLOW.load=busLoad.RA+busLoad.RB;FLOW.load20=busLoad.RC;
  // 110 kV-netspanning (TenneT) varieert over de dag
  const U110=110.5+1.6*Math.sin((h-4)/24*2*Math.PI)+0.25*Math.sin(SIM.t*0.05)-0.012*FLOW.P110;FLOW.U110=U110;
  const feeds={RA:[],RB:[],RC:[]};
  TR.forEach(T=>{const t=D[T];t.S=0;t.Sc=0;t.rev=false;t.U0=EN.has(T+'h')?U110/110*trafoUn(T)*(1+(t.tap-9)*TAP_STEP):0;
    TR_LV[T].forEach(id=>{const c=D[id];c.I=0;if(c.state===1&&EN.has(T+'l'))feeds[c.b].push(T);});});
  const coupled=D['V-K'].state===1;
  FLOW.U={RA:0,RB:0,RC:0};FLOW.groups=[];
  (coupled?[['RA','RB']]:[['RA'],['RB']]).concat([['RC']]).forEach(g=>{const load=g.reduce((s,b)=>s+busLoad[b],0);const tf=[...new Set(g.flatMap(b=>feeds[b]))];if(!tf.length)return;
    FLOW.groups.push({buses:g,tf});
    tf.forEach(T=>{D[T].S+=Math.abs(load)/tf.length/0.95;D[T].rev=load<0;});
    if(tf.length>=2){const taps=tf.map(T=>D[T].tap),sc=25*0.052*(Math.max(...taps)-Math.min(...taps));tf.forEach(T=>D[T].Sc=sc);}
    const U=tf.reduce((s,T)=>s+D[T].U0-Z_DROP*trafoUn(T)*(D[T].S/D[T].rAF)*(load<0?-1:1),0)/tf.length;
    g.forEach(b=>FLOW.U[b]=U);tf.forEach(T=>D[T].Ulv=U);});
  TR.forEach(T=>{const t=D[T];if(!FLOW.groups.some(g=>g.tf.includes(T)))t.Ulv=t.U0;if(t.Sc)t.S=Math.hypot(t.S,t.Sc);
    TR_LV[T].forEach(id=>{const c=D[id];if(c.state===1&&EN.has(T+'l'))c.I=t.S*0.95*kA(c.b);});});
  let k=0;if(coupled){const genA=feeds.RA.reduce((s,T)=>s+D[T].S*0.95,0);k=Math.abs(genA-busLoad.RA);}D['V-K'].I=k*57.9;
  let P110=0;
  TR.forEach(T=>{const t=D[T];t.P=t.S*0.95*(t.rev?-1:1);if(EN.has(T+'h'))P110+=t.P*1.006+0.02;const I=t.S*5.25;D[T+'-Q0'].I=I;D[T+'-Q1'].I=I;});
  FLOW.P110=P110;
  const feeding=['L1','L2'].filter(L=>SIM.lines[L].avail&&D[L+'-Q9'].state&&D[L+'-Q0'].state&&D[L+'-Q1'].state);
  ['L1','L2'].forEach(L=>{const p=feeding.includes(L)?P110/feeding.length:0;FLOW.lineP[L]=p;const I=Math.abs(p)/0.95*5.25;[L+'-Q9',L+'-Q0',L+'-Q1'].forEach(id=>D[id].I=I);});
}
function nodeU(n){if(!EN.has(n))return 0;const L=lvl(n);if(L===110)return FLOW.U110;if(FLOW.U[n]!=null)return FLOW.U[n];
  if(RING_LV.has(n)||RING_MV.has(n)){const s=RING.stations.find(s=>n===s.node+'v'||n.startsWith(s.id+'-'));const t=FLOW.TAG[s?s.node:n]||FLOW.TAG[n];if(!t)return 0;return L===0.4?FLOW.U[t.bus]*0.039:FLOW.U[t.bus]-0.02;}
  const f=FEEDERS.find(f=>f.node===n);if(f)return FLOW.U[f.bus];return D[n.slice(0,2)].Ulv;}

// ---------------------------------------------------------- bediening
function addTimer(min,fn){SIM.timers.push({at:SIM.t+min,fn});}
const springOk=d=>performance.now()>=d.springAt;
function actionText(d,to){return d.type==='cb'||d.type==='lvs'?(to?'IN':'UIT'):(to?'GESLOTEN':'GEOPEND');}
function interlockCheck(d,to){
  if(d.type==='ds'){const cb=D[d.cb];if(cb.state===1)return `Vergrendeling: ${cb.id} moet eerst UIT`;if(to===1&&d.es&&D[d.es].state===1)return `Vergrendeling: aardschakelaar ${d.es} is gesloten`;}
  if(d.type==='es'&&to===1){if(d.ds&&D[d.ds].state===1)return `Vergrendeling: ${d.ds} moet eerst open`;if(d.cb&&D[d.cb].state===1)return `Vergrendeling: ${d.cb} moet eerst UIT`;if(EN.has(d.a))return 'Vergrendeling: spanning aanwezig (spanningsdetectie)';}
  if(d.type==='cb'&&to===1&&d.need&&D[d.tr].ratio!==d.need)return `Vergrendeling: ${d.tr} staat op ${D[d.tr].ratio} kV – eerst omschakelen naar ${d.need} kV`;
  if(d.type==='cb'&&to===1){d.state=1;const sc=shortNode();d.state=0;if(sc)return 'Vergrendeling: inschakelen op een geaard deel';}
  return null;}
function syncCheck(d){if(d.id!=='V-K'||!EN.has('RA')||!EN.has('RB'))return null;const dU=Math.abs(FLOW.U.RA-FLOW.U.RB);
  return dU>0.25?`Synchrocheck: spanningsverschil ${dU.toFixed(2).replace('.',',')} kV te groot (max 0,25) – breng de trappen gelijk`:null;}
function operate(id,to){
  const d=D[id];if(!d||!['cb','ds','es','lbs','lvs'].includes(d.type)||d.state===to)return;
  if(SIM.paused)return deny(GAME.ended?'De dienst is afgelopen':'Simulatie gepauzeerd – hervat om te schakelen');
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
  d.state=to;d.ops++;SIM.manualFlag=true;if(d.type==='cb'&&to===1)d.springAt=performance.now()+7000;
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
function tripFrom(node){
  const seen=new Set([node]),q=[node],tripped=[];let src=null;
  while(q.length){const n=q.pop();if(n==='L1x'||n==='L2x')src=n.slice(0,2);
    for(const d of ADJ[n]||[]){if(d.type==='es')continue;if(d.type==='cb'){if(d.state===1){d.state=0;tripped.push(d.id);}continue;}if(d.type!=='tr'&&d.type!=='mstr'&&d.state!==1)continue;
      const m=d.a===n?d.b:d.a;if(!seen.has(m)){seen.add(m);q.push(m);}}}
  setTimeout(()=>{tripped.forEach(id=>pushAlarm(`${id}: beveiliging – UIT`,'warn'));if(tripped.length)AudioSys.breaker(0.6);},120);
  if(src){const ln=SIM.lines[src];if(ln.avail){ln.avail=false;ln.reason='afgeschakeld door TenneT (fout in station)';pushAlarm(`TenneT: lijn ${src} aan overzijde afgeschakeld – fout in OS Zuidwolde`,'crit');addTimer(rnd(10,18),()=>lineRestore(src));}}
}
function tripBreaker(id){const d=D[id];if(d.state!==1)return false;d.state=0;const v=VIEWS[id];AudioSys.breaker(v?distGain(v.center):0.5);return true;}
function lineRestore(L){const ln=SIM.lines[L];if(ln.avail||ln.maint)return;
  if(D[L+'-Q8'].state===1){pushAlarm(`TenneT: lijn ${L} kan niet onder spanning – ${L}-Q8 is geaard`,'warn');addTimer(5,()=>lineRestore(L));return;}
  ln.avail=true;ln.reason='';if(D[L+'-Q0'].state)pushAlarm(`TenneT: lijn ${L} ${ln.name} weer onder spanning`,'ok');else readyNotice(`TenneT: lijn ${L} ${ln.name} weer onder spanning – ${L}-Q0 mag weer IN`,L+'-Q0',()=>!D[L+'-Q0'].state&&SIM.lines[L].avail);}
function lineLockout(L){const ln=SIM.lines[L];ln.avail=false;ln.reason='blijvende fout, ploeg onderweg';const m=rnd(25,50);
  pushAlarm(`TenneT: blijvende fout op lijn ${L} – herstel verwacht over ±${Math.round(m)} min`,'warn');addTimer(m,()=>lineRestore(L));}
function toggleAR(L){const ln=SIM.lines[L];if(ln.arBroken)return deny(`AR-relais ${L} is defect`);ln.ar=!ln.ar;pushAlarm(`Automatische herinschakeling ${L} ${ln.ar?'IN':'UIT'}bedrijf gesteld`,'op');refreshAll();}

// ---------------------------------------------------------- transformator: blokkering 86, trappenschakelaar
function tripTrafo(T,reason,inspectMin,kind){const t=D[T];tripBreaker(T+'-Q0');TR_LV[T].forEach(tripBreaker);
  t.blocked=true;t.resettable=false;t.blockText=reason;t.blockKind=kind;if(kind==='temp'){GAME.stats.thermal++;award(-100,`${T} thermisch afgeschakeld`);}
  pushAlarm(`${T}: ${reason} – ${T}-Q0 en ${TR_LV[T].join('/')} UIT, blokkeerrelais 86 aangesproken`,'crit');
  if(inspectMin)crewDispatch({box:VIEWS[T].box,say:`Inspectie ${T}: Buchholz-relais en olie`,until:()=>!t.blocked||t.resettable});
  if(inspectMin)addTimer(inspectMin,()=>{t.resettable=true;readyNotice(`${T}: inspectie gereed, geen schade gevonden – reset blokkeerrelais 86 in het transformatorpaneel`,T,()=>t.blocked);});
  setTimeout(()=>{computeFlows();const dead=FEEDERS.filter(f=>!EN.has(f.node)&&D[f.cb].state===1);if(!dead.length)return;
    if(dead.some(f=>f.bus==='RC'))pushAlarm(`Tip: neem reservetransformator T3 in bedrijf op 20 kV (W-T3) – T3 staat nu op ${D.T3.ratio} kV`,'info');
    if(dead.some(f=>f.bus!=='RC'))pushAlarm(`Tip: neem reservetransformator T3 in bedrijf op 10 kV (V-T3) – T3 staat nu op ${D.T3.ratio} kV. Let op de belasting!`,'info');},600);}
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
const BUS_BAND={RA:[10,11,'A'],RB:[10,11,'B'],RC:[20,22,'C']};
function regulate(dm){
  // parallelbedrijf: per gevoede railgroep regelt één transformator (master), de rest volgt
  const followers=new Set();
  FLOW.groups.forEach(g=>{const auto=g.tf.filter(T=>D[T].avr==='auto');auto.slice(1).forEach(T=>{followers.add(T);const t=D[T];if(!t.tapBusy&&t.tap!==D[auto[0]].tap)moveTap(T,Math.sign(D[auto[0]].tap-t.tap));});
    const taps=g.tf.map(T=>D[T].tap),dk=g.tf.length>1?Math.max(...taps)-Math.min(...taps):0,k='circ'+g.buses.join('');
    if(dk>=2&&!SIM[k]){SIM[k]=true;award(-20,'Circulatiestroom');pushAlarm(`Circulatiestroom tussen ${g.tf.join(' en ')} (${dk} trappen verschil) – breng de trappen gelijk of zet de regelaars op AUTO`,'warn');}
    if(dk<2)SIM[k]=false;});
  TR.forEach(T=>{const t=D[T];if(followers.has(T)||t.avr!=='auto'||!EN.has(T+'h')||t.tapBusy){t.avrT=0;return;}
    const set=trafoUn(T),dev=t.Ulv-set;
    if(Math.abs(dev)>set*0.012){t.avrT+=dm;if(t.avrT>=1){moveTap(T,dev<0?1:-1);t.avrT=0.75;}}else t.avrT=0;});
  Object.entries(BUS_BAND).forEach(([b,[lo,hi,nm]])=>{const U=FLOW.U[b],k='uAl'+b,m=(hi-lo)*0.1;
    if(U>0&&(U<lo||U>hi)){if(!SIM[k]){SIM[k]=true;GAME.stats.volt++;award(-20,'Spanning buiten band');pushAlarm(`Rail ${nm}: spanning ${U.toFixed(2).replace('.',',')} kV buiten band (${lo},0 – ${hi},0 kV)`,'warn');}}
    else if(U>=lo+m&&U<=hi-m)SIM[k]=false;});
}
function thermal(dm){const h=hourOf(),amb=11+5*Math.sin((h-9)/24*2*Math.PI);
  TR.forEach(T=>{const t=D[T],on=EN.has(T+'h'),k=t.S/(t.fans?t.rAF:t.rON);
    const target=amb+(on?8:0)+62*k*k;t.oil+=(target-t.oil)*(1-Math.exp(-dm/32));
    if(!t.fans&&on&&t.oil>65){t.fans=true;pushAlarm(`${T}: olie ${t.oil.toFixed(0)} °C – koeling ONAF, ventilatoren aan`,'info');}
    if(t.fans&&(t.oil<57||!on))t.fans=false;
    if(t.oil>90&&!t.hot){t.hot=true;pushAlarm(`${T}: olietemperatuur hoog (${t.oil.toFixed(0)} °C) – overbelast! Verlaag de belasting`,'warn');}
    if(t.oil<85)t.hot=false;
    if(t.oil>=100&&(D[T+'-Q0'].state||TR_LV[T].some(id=>D[id].state)))tripTrafo(T,'thermische beveiliging (olie ≥ 100 °C)',0,'temp');
    if(t.blocked&&t.blockKind==='temp'&&!t.resettable&&t.oil<75){t.resettable=true;readyNotice(`${T}: afgekoeld tot ${t.oil.toFixed(0)} °C – blokkeerrelais 86 mag worden gereset`,T,()=>t.blocked);}});}

// ---------------------------------------------------------- 10 kV-velden: koude-lastopname en overstroom
function feederTick(dm){
  FEEDERS.forEach(f=>{const on=EN.has(f.node);
    if(on&&f.fault&&f.fault.stage==='search'&&D[f.cb].state===1){tripBreaker(f.cb);GAME.stats.recloseFault++;award(-40,'Ingeschakeld op kortsluiting');
      pushAlarm(`${f.cb}: kabel onder spanning gebracht met fout – I>> momentaan trip. Wacht op de storingsdienst!`,'warn');return;}
    const r=f.gen?0:f.P/f.rate;
    if(r>1.3&&D[f.cb].state===1){f.oc+=dm*(r*r-1)/10;if(f.oc>=1){f.oc=0;tripBreaker(f.cb);GAME.stats.clpTrips++;award(-30,`${f.id} overbelast afgeschakeld`);pushAlarm(`${f.cb} ${f.name}: overstroombeveiliging I> na ${Math.round(r*100)}% belasting (koude-lastopname)`,'warn');}}
    else f.oc=Math.max(0,f.oc-dm*0.1);});
  // koude-lastopname per afnemer
  CONS.forEach(c=>{const on=EN.has(c.node);
    if(c.backfed)c.offSince=null;
    else if(!on){if(c.offSince==null)c.offSince=SIM.t;}
    else if(c.offSince!=null){const dur=SIM.t-c.offSince;c.offSince=null;
      if(dur>5&&!c.gen){c.clp=Math.max(c.clp,1+0.6*Math.min(1,dur/90));if(c.clp>1.12&&!c.st)pushAlarm(`${c.id} ${c.name}: koude-lastopname na ${Math.round(dur)} min uitval – belasting +${Math.round((c.clp-1)*100)}%`,'info');}}
    c.clp=1+(c.clp-1)*Math.exp(-dm/18);});
  ringProtection();}

// ---------------------------------------------------------- storingen
function randomEvent(){const r=Math.random();if(r<0.3)return lineFault();if(r<0.75)return feederFault();return trafoFault();}
function lineFault(forceL,forcePerm){const c=['L1','L2'].filter(L=>SIM.lines[L].avail&&!SIM.lines[L].maint&&D[L+'-Q0'].state===1&&(!forceL||L===forceL));if(!c.length)return forceL?null:feederFault();const L=pick(c),ln=SIM.lines[L];
  lightning(L);const perm=forcePerm??(Math.random()<DIFFS[GAME.diff].perm);
  setTimeout(()=>{tripBreaker(L+'-Q0');pushAlarm(`${L} ${ln.name}: blikseminslag – distantiebeveiliging zone 1, ${L}-Q0 UIT`,'crit');
    if(ln.ar){pushAlarm(`${L}: automatische herinschakeling gestart (dode tijd 1 s)`,'info');
      setTimeout(()=>{const d=D[L+'-Q0'];if(d.state!==0||!ln.avail)return;
        if(!springOk(d)){pushAlarm(`${L}: herinschakeling geblokkeerd – inschakelveer niet geladen`,'warn');if(perm)lineLockout(L);return;}
        d.state=1;d.ops++;d.springAt=performance.now()+7000;const v=VIEWS[d.id];AudioSys.breaker(v?distGain(v.center):0.5);
        if(!perm)pushAlarm(`${L}: herinschakeling geslaagd – lijn weer in bedrijf`,'ok');
        else setTimeout(()=>{tripBreaker(d.id);pushAlarm(`${L}: herinschakeling mislukt (blijvende fout) – ${L}-Q0 definitief UIT`,'crit');lineLockout(L);refreshAll();},260);
        refreshAll();},1200);}
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
function trafoFault(forceT){const c=TR.filter(T=>!D[T].blocked&&D[T+'-Q0'].state===1&&EN.has(T+'h')&&!(TASK&&TASK.tr===T)&&(!forceT||T===forceT));if(!c.length)return forceT?null:feederFault();const T=pick(c);
  const v=VIEWS[T];if(v)spawnArc(v.arcPos,0.6);
  tripTrafo(T,pick(['Buchholz-beveiliging (gasontwikkeling)','differentiaalbeveiliging','drukontlastklep aangesproken']),rnd(40,80),'prot');refreshAll();}

// ---------------------------------------------------------- werkopdrachten
let TASK=null,taskSeq=411;
function lineTask(L){const ln=SIM.lines[L];return{crew:()=>({box:VIEWS[L+'-Q9'].box,say:`Onderhoud scheider ${L}-Q9`}),title:`Onderhoud lijnveld ${L} (${ln.name})`,desc:`Monteurs gaan scheider ${L}-Q9 smeren en inspecteren. Schakel het veld vrij en aard de lijn.`,steps:[
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
function feederTask(F){const f=FEEDERS.find(x=>x.id===F);return{feeder:F,title:`Kabelwerk ${F} (${f.name})`,desc:`Een kabelploeg vervangt een mof in ${F}. De storingsdienst schakelt de klanten eerst om via het net; daarna kun je het veld vrijschakelen en de kabel aarden.`,steps:[
  {t:'Wacht: storingsdienst schakelt klanten om (terugvoeding)',wait:6,done:()=>{f.backfed=true;pushAlarm(`Storingsdienst: klanten van ${F} omgeschakeld via het net – ${f.cb} mag UIT`,'info');}},
  {t:`Schakel ${f.cb} UIT`,ok:()=>D[f.cb].state===0},
  {t:`Sluit aardschakelaar ${F}-Q8 (kabelzijde)`,ok:()=>D[F+'-Q8'].state===1,done:()=>pushAlarm(`Werkvergunning afgegeven – kabelwerk ${F} gestart`,'info')},
  {t:'Kabelwerk in uitvoering…',wait:35},
  {t:`Werk gereed – open ${F}-Q8`,ok:()=>D[F+'-Q8'].state===0},
  {t:`Schakel ${f.cb} IN`,ok:()=>D[f.cb].state===1&&EN.has(f.node),done:()=>addTimer(4,()=>{f.backfed=false;pushAlarm(`Storingsdienst: terugvoeding ${F} opgeheven – normale situatie`,'ok');})}]};}
function reserveTask(main){const r=main==='T1'?'10':'20',lvM=TR_LV[main][0],lvR=r==='10'?'V-T3':'W-T3',rail=r==='10'?'rail A/B':'rail C';
  return{tr:main,crew:()=>({box:VIEWS[main].box,say:`Onderhoud ${main}`}),title:`Onderhoud ${main} met reservetransformator`,desc:`${main} gaat uit bedrijf voor ${main==='T1'?'onderhoud aan de trappenschakelaar':'oliebemonstering'}. Neem eerst reservetransformator T3 op ${r} kV in bedrijf, zodat de klanten niets merken.`,steps:[
  {t:`Zorg dat T3 op ${r} kV staat (omschakelaar, alleen spanningsloos)`,ok:()=>D.T3.ratio===r},
  {t:'Zet T3 onder spanning (T3-Q1 en T3-Q0 IN)',ok:()=>EN.has('T3h')},
  {t:`Schakel ${lvR} IN – ${main} en T3 parallel op ${rail}`,ok:()=>D[lvR].state===1},
  {t:`Schakel ${lvM} UIT`,ok:()=>D[lvM].state===0},
  {t:`Schakel ${main}-Q0 UIT (110 kV)`,ok:()=>D[main+'-Q0'].state===0},
  {t:`Open railscheider ${main}-Q1`,ok:()=>D[main+'-Q1'].state===0,done:()=>pushAlarm(`Werkvergunning afgegeven – onderhoud ${main} gestart`,'info')},
  {t:'Onderhoud in uitvoering…',wait:30},
  {t:`Werk gereed – sluit ${main}-Q1`,ok:()=>D[main+'-Q1'].state===1},
  {t:`Schakel ${main}-Q0 IN`,ok:()=>D[main+'-Q0'].state===1},
  {t:`Schakel ${lvM} IN`,ok:()=>D[lvM].state===1},
  {t:`Schakel ${lvR} UIT – T3 terug naar warme reserve`,ok:()=>D[lvR].state===0}]};}
let taskCycle=0;
function offerTask(){const defs=[()=>reserveTask('T2'),()=>ringTask(),()=>lineTask('L2'),()=>reserveTask('T1'),()=>feederTask('G3'),()=>feederTask('F5'),()=>lineTask('L1')];
  TASK=defs[taskCycle++%defs.length]();TASK.i=0;TASK.code='WV-2026-'+(taskSeq++);
  pushAlarm(`Nieuwe werkopdracht ${TASK.code}: ${TASK.title}`,'info');AudioSys.chime();renderTasks();}
function taskTick(){if(!TASK)return;let guard=0;
  while(TASK&&guard++<20){const st=TASK.steps[TASK.i];
    if(st.wait!=null){if(st.until==null){st.until=SIM.t+st.wait;const c=TASK.crew&&TASK.crew();if(c)crewDispatch({...c,until:()=>!TASK||TASK.steps[TASK.i]!==st});}if(SIM.t<st.until)break;}else if(!st.ok())break;
    st.done&&st.done();TASK.i++;
    if(TASK.i>=TASK.steps.length){SIM.tasksDone++;award(150,'Werkopdracht voltooid');pushAlarm(`Werkopdracht ${TASK.code} voltooid ✓`,'ok');AudioSys.chime();TASK=null;SIM.nextTaskAt=SIM.t+rnd(50,90);}
    renderTasks();}}

function initTaps(){for(let i=0;i<3;i++){computeFlows();TR.forEach(T=>{const t=D[T];if(t.Ulv>0){const u=trafoUn(T);t.tap=clamp(t.tap+Math.round((u-t.Ulv)/(u*TAP_STEP)),1,17);}});}computeFlows();}
const custOff=f=>f.backfed?0:!EN.has(f.node)?f.cust:Math.round(f.cust*f.outFrac);
function simStep(dtReal){
  if(SIM.paused)return;
  const dm=dtReal*SIM.speed/60;SIM.t+=dm;
  SIM.timers.sort((a,b)=>a.at-b.at);while(SIM.timers.length&&SIM.timers[0].at<=SIM.t)SIM.timers.shift().fn();
  CONS.forEach(f=>{f.noise+=(-f.noise*0.08+(Math.random()-0.5)*0.03)*Math.min(1,dm);});
  computeFlows();thermal(dm);regulate(dm);feederTick(dm);
  let off=0;CONS.forEach(c=>{off+=custOff(c);});
  FEEDERS.forEach(f=>{if(f.ring)return;const on=EN.has(f.node);
    if(on!==f.wasOn){f.wasOn=on;restoreTrack(f,on);if(on)pushAlarm(`${f.id} ${f.name}: spanning hersteld`,'ok');
      else if(f.gen)pushAlarm(`${f.id} ${f.name}: productie afgeschakeld`,'info');
      else if(f.backfed)pushAlarm(`${f.id} ${f.name}: veld spanningsloos – klanten via terugvoeding gevoed`,'info');
      else pushAlarm(`${f.id} ${f.name}: spanningsloos – ${f.cust.toLocaleString('nl-NL')} ${f.cust===1?(f.prio?'aansluiting (prioriteit!)':'aansluiting'):'klanten'} zonder stroom`,f.prio?'crit':'warn');}});
  RING.stations.forEach(s=>{const on=EN.has(s.node);if(on===s.wasOn)return;s.wasOn=on;restoreTrack(s,on);
    if(on)pushAlarm(`${s.id} ${s.name}: spanning hersteld`,'ok');else pushAlarm(`${s.id} ${s.name}: spanningsloos – ${s.cust.toLocaleString('nl-NL')} klanten zonder stroom`,'warn');});
  SIM.off=off;SIM.cml+=CONS.reduce((s,c)=>s+custOff(c)*(c.interruptible?0.1:1),0)*dm;SIM.manualFlag=false;
  if(GAME.events&&SIM.t>=SIM.nextEvent){randomEvent();SIM.nextEvent=SIM.t+rnd(35,75)*DIFFS[GAME.diff].ev;}
  if(GAME.tasks&&!TASK&&SIM.t>=SIM.nextTaskAt)offerTask();
  taskTick();gameTick(dm,dtReal);
}
