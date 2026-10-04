
// Net: toestand, velden en apparaten, 10 kV-ringen, netgraaf (spanning/aarding) en belastingstromen
// ============================================================ simulatie
const SIM={t:9*60,speed:60,paused:true,interlock:true,cml:0,incidents:0,tasksDone:0,off:0,
  nextEvent:9*60+16,nextTaskAt:9*60+3,timers:[],
  lines:{L1:{name:'Hoogeveen',avail:true,reason:'',maint:false,ar:true},L2:{name:'Meppel',avail:true,reason:'',maint:false,ar:true}},
  meppel:{avail:true,reason:''}};   // OS Meppel: 110 kV-zijde en trafo van Netbeheer Noord
// ---------- centrale definities: rails en lijnen staan op één plek, de rest wordt hiervan afgeleid
const BUSES={RA:{nm:'A',kv:10,band:[10,11],coupler:'V-K'},RB:{nm:'B',kv:10,band:[10,11],coupler:'V-K'},
  RC:{nm:'C1',kv:20,band:[20,22],coupler:'W-K'},RD:{nm:'C2',kv:20,band:[20,22],coupler:'W-K'},
  MP:{nm:'Meppel',kv:10,band:[10,11],coupler:null,ext:true}};   // 10 kV-rail van OS Meppel (Netbeheer Noord); alleen de uitgaande velden zijn van ons
const BUS_IDS=Object.keys(BUSES),perBus=v=>Object.fromEntries(BUS_IDS.map(b=>[b,typeof v==='function'?v():v]));
const LINES=Object.keys(SIM.lines);
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
  {id:'G3',name:'Buitengebied Oost',short:'Buitengeb.',kind:'res',base:6.5,cust:5200,bus:'RD'},
  {id:'G4',name:'Waterzuivering',short:'RWZI',kind:'hosp',base:2.4,cust:1,bus:'RD'},
  // uitgaande velden in OS Meppel: van ons, de rest van het station is van Netbeheer Noord
  {id:'MP1',name:'Meppel-Oost',short:'Meppel-O',kind:'res',base:4.2,cust:3800,bus:'MP'},
  {id:'MP2',name:'Bedrijventerrein Blankenstein',short:'Blankenst.',kind:'ind',base:5,cust:45,bus:'MP'},
  {id:'MP3',name:'Koppelkabel naar MS5 Zuidwolde',short:'Koppeling',kind:'res',base:0,cust:0,bus:'MP',link:true}];
const is20=b=>BUSES[b]?.kv===20;
const FD=id=>FEEDERS.find(f=>f.id===id);   // 20 kV: rail C1 (RC) en rail C2 (RD)
const D={};
function dev(id,o){D[id]=Object.assign({id,state:0,ops:0,I:0,busy:false,springAt:0},o);return D[id];}
for(const L of LINES){const nm=SIM.lines[L].name;
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
// 10 kV dubbelrailsysteem: elk veld heeft een railkeuzescheider naar rail A (QA) en naar rail B (QB)
const SEL_BAYS={};   // register van alle velden met railkeuzescheiders: knooppunt, vermogenschakelaar en normale rail
function selPair(bay,node,cb,home){SEL_BAYS[bay]={node,cb,home};for(const [b,nm,o] of [['RA','A','B'],['RB','B','A']])dev(bay+'-Q'+nm,{type:'ds',bay,label:'Railkeuzescheider rail '+nm,a:b,b:node,state:b===home?1:0,cb,sel:true,other:bay+'-Q'+o});}
const selPar=d=>!!d.sel&&D[d.other].state===1&&D['V-K'].state===1;   // veld staat ook op de andere rail en de rails zijn gekoppeld: omzetten onder last mag
dev('V-T1',{type:'cb',bay:'T1',label:'Inkomend veld 10 kV',a:'T1l',b:'T1s',state:1,tr:'T1'});selPair('T1','T1s','V-T1','RA');
dev('W-T2',{type:'cb',bay:'T2',label:'Inkomend veld 20 kV (rail C1)',a:'T2l',b:'RC',state:1,tr:'T2'});
dev('V-T3',{type:'cb',bay:'T3',label:'Reserve-inkomend veld 10 kV',a:'T3l',b:'T3s',state:0,tr:'T3',need:'10'});selPair('T3','T3s','V-T3','RB');
dev('W-T3',{type:'cb',bay:'T3',label:'Reserve-inkomend veld 20 kV (rail C2)',a:'T3l',b:'RD',state:0,tr:'T3',need:'20'});
dev('V-K',{type:'cb',bay:'K',label:'Railkoppeling 10 kV (synchrocheck)',a:'RA',b:'RB',state:1});
for(const [b,nm] of [['RA','A'],['RB','B']])dev(b+'-Q8',{type:'es',bay:'K',label:'Railaardschakelaar rail '+nm,a:b});
dev('W-K',{type:'cb',bay:'WK',label:'Railkoppeling 20 kV C1–C2 (synchrocheck)',a:'RC',b:'RD',state:1});
for(const [b,nm] of [['RC','C1'],['RD','C2']])dev(b+'-Q8',{type:'es',bay:'WK',label:'Railaardschakelaar rail '+nm,a:b});
FEEDERS.forEach(f=>{const dbl=f.bus==='RA'||f.bus==='RB';f.sel=dbl?f.id+'s':f.bus;Object.assign(f,{node:f.id,cb:(f.bus==='MP'?'M-':is20(f.bus)?'W-':'V-')+f.id,rate:f.ring?9:f.link?4:f.base*1.15,fault:null,outFrac:0,clp:1,offSince:null,oc:0,backfed:false,noise:0,wasOn:true,P:0,demand:0});
  dev(f.cb,{type:'cb',bay:f.id,label:(f.gen?'Productieveld · ':'Uitgaand veld · ')+f.name,a:f.sel,b:f.id,state:1,feeder:f});if(dbl)selPair(f.id,f.sel,f.cb,f.bus);
  dev(f.id+'-Q8',{type:'es',bay:f.id,label:'Aardschakelaar kabelzijde',a:f.id,cb:f.cb});});
// ---------- 10 kV-ringen achter het station: elke ring loopt tussen twee uitgaande velden en heeft een normaal-open punt
const RINGS=[
 {id:'R1',name:'Ring Woonwijk',from:'F3',to:'F4',nop:'MS3-R',stations:[
  {id:'MS1',name:'Esdoornlaan',short:'Esdoornln',pos:[-60,108],face:0,groups:[['Woningen Esdoornlaan',600,'res',0.45],['Woningen Lindehof',520,'res',0.4],['Basisschool De Linde',1,'city',0.15],['Supermarkt',1,'city',0.3]]},
  {id:'MS2',name:'Berkenhof',short:'Berkenhof',pos:[-91,170],face:1,groups:[['Woningen Berkenhof',700,'res',0.5],['Woningen Populierenlaan',650,'res',0.45],['Sporthal',1,'city',0.2]]},
  {id:'MS3',name:'Molenweg',short:'Molenweg',pos:[-60,232],face:2,groups:[['Woningen Molenweg',800,'res',0.6],['Appartementen De Molen',420,'res',0.35],['Huisartsenpost',1,'hosp',0.1],['Woningen Kerkpad',500,'res',0.4]]},
  {id:'MS4',name:'Zuiderveld',short:'Zuiderveld',pos:[86,232],face:2,groups:[['Woningen Zuiderveld',900,'res',0.65],['Woningen Akkerweg',780,'res',0.55],['Laadplein elektrische auto\'s',1,'ev',0.6]]},
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
  st.forEach(s=>s.groups.push(['Openbare verlichting',0,'ovl',0.015]));
  st.forEach((s,i)=>{const M='M'+s.id.slice(2);Object.assign(s,{node:M,ring:rg,flag:false,wasOn:true,unplanned:false,wait:0,P:0,cust:0});
    RING_MV.add(M);RING_MV.add(M+'t');RING_LV.add(M+'v');RING.stations.push(s);
    dev(s.id,{type:'kiosk',bay:s.id,label:'MS-station '+s.name+' · 10/0,4 kV 1600 kVA',node:M,st:s});
    dev(s.id+'-L',{type:'lbs',bay:s.id,label:'Lastscheider kabel '+(i?'naar '+st[i-1].id:'naar OS (V-'+rg.from+')'),a:cable[i],b:M,state:1});
    dev(s.id+'-R',{type:'lbs',bay:s.id,label:'Lastscheider kabel '+(i<n-1?'naar '+st[i+1].id:'naar OS (V-'+rg.to+')'),a:M,b:cable[i+1],state:s.id+'-R'===rg.nop?0:1});
    dev(s.id+'-T',{type:'lbs',bay:s.id,label:'Transformatorschakelaar met zekeringen',a:M,b:M+'t',state:1});
    dev(s.id+'-TR',{type:'mstr',bay:s.id,label:'Distributietransformator 10/0,4 kV',a:M+'t',b:M+'v',state:1});
    s.groups=s.groups.map(([name,cust,kind,base],j)=>{const id=s.id+'-G'+(j+1);RING_LV.add(id);s.cust+=cust;
      const g={id,name,short:name,cust,kind,base,node:id,st:s,noise:0,clp:1,offSince:null,outFrac:0,backfed:false,Pc:0};LVG.push(g);
      dev(id,{type:'lvs',bay:s.id,label:'Laagspanningsveld · '+name,a:M+'v',b:id,state:1,lvg:g});if(kind==='ovl')s.ovl=id;return g;});});
  for(let i=0;i<=n;i++)RING.secs.push({id:cable[i],node:cable[i],ring:rg,a:i?st[i-1].id:null,b:i<n?st[i].id:null,fault:false,located:false});});
// OS Meppel: trafo van Netbeheer Noord (altijd 'in', niet bedienbaar) en de koppelkabel naar MS5 (normaal open, tussen twee netbeheerders)
dev('MP-TR',{type:'ext',bay:'MPx',label:'Transformator 110/10 kV OS Meppel · Netbeheer Noord (niet bedienbaar)',a:'MPs',b:'MP',state:1});
dev('MS5-K',{type:'lbs',bay:'MS5',label:'Lastscheider koppelkabel naar OS Meppel (normaal open)',a:'M5',b:'MP3',state:0,link:true});
const CONS=FEEDERS.filter(f=>!f.ring).concat(LVG);   // alle afnemers (MS-velden en LS-groepen in de ring)
// algemeen belastingsniveau: alle afnemers (niet de opwekking) iets zwaarder; de ratings van de velden schalen mee
const LOAD_SCALE=1.25;CONS.forEach(c=>{if(c.gen)return;c.base*=LOAD_SCALE;if(c.rate&&!c.link)c.rate=c.base*1.15;});
dev('RAIL',{type:'bb',label:'110 kV-railsysteem',node:'BB'});
dev('MS',{type:'bld',label:'10 kV-schakelinstallatie (binnen)',node:'RA'});
dev('MS20',{type:'bld',label:'20 kV-schakelinstallatie (binnen)',node:'RC'});
const lvNodes=kv=>[...BUS_IDS.filter(b=>BUSES[b].kv===kv),...FEEDERS.filter(f=>(is20(f.bus)?20:10)===kv).flatMap(f=>[f.id,f.sel]),...Object.values(SEL_BAYS).filter(v=>BUSES[v.home].kv===kv).map(v=>v.node)];
const LV10=new Set(['T1l',...lvNodes(10)]),LV20=new Set(['T2l',...lvNodes(20)]);
function lvl(n){if(RING_LV.has(n))return 0.4;if(RING_MV.has(n))return 10;if(n===RES+'l')return +D[RES].ratio;return LV10.has(n)?10:LV20.has(n)?20:110;}
const trafoUn=T=>T===RES?(D[RES].ratio==='10'?10.5:21):D[T].un;
const kA=b=>is20(b)?28.9:57.9;   // A per MW bij cos φ 0,95
const ADJ={};
Object.values(D).forEach(d=>{if(['cb','ds','tr','lbs','lvs','mstr','ext'].includes(d.type)){(ADJ[d.a]??=[]).push(d);(ADJ[d.b]??=[]).push(d);}if(d.type==='es')(ADJ[d.a]??=[]).push(d);});

const conducts=d=>d.type==='tr'||d.type==='mstr'||d.type==='ext'||(['cb','ds','lbs','lvs'].includes(d.type)&&d.state===1);
function energized(){const en=new Set(),q=[];for(const L of LINES)if(SIM.lines[L].avail){en.add(L+'x');q.push(L+'x');}if(SIM.meppel.avail){en.add('MPs');q.push('MPs');}
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
    case 'ev':return 0.22+0.25*g(9,2)+0.95*g(18.6,1.6)+0.45*g(21.8,1.4);   // laden na het werk en 's avonds
    case 'green':return (h<SEASON.rise+1||h>SEASON.set-1)?1.0:0.32+0.1*g(12,3);   // assimilatiebelichting als het donker is
    case 'ovl':return isDark(h,0.25)||WX.cur.fog>0.6?1:0;   // schemerschakeling straatverlichting
    case 'pv':{const r=SEASON.rise+0.5,s=SEASON.set-0.5;return -Math.max(0,Math.sin(Math.PI*(h-r)/(s-r)))*SEASON.pv*(1-0.8*WX.cur.cloud)*(1-0.85*WX.cover)*(0.88+0.12*Math.sin(SIM.t*0.011));}}return 1;}
let EN=new Set(),ER=new Set();
const FLOW={P110:0,U110:110,U:perBus(0),lineP:{L1:0,L2:0},load:0,load20:0,groups:[]};
const TAP_STEP=0.0125,Z_DROP=0.05;
function computeFlows(){
  EN=energized();ER=earthed();const h=hourOf();const busLoad=perBus(0);
  FLOW.TAG=supplyTags();const feederP={};
  CONS.forEach(c=>{c.demand=c.base*profile(c.kind,h)*(c.gen?1:seasonMul(c.kind))*(1+c.noise)*(c.gen?1:c.clp)*(1-(c.cut||0));c.Pc=EN.has(c.node)?c.demand*(1-c.outFrac):0;
    const t=FLOW.TAG[c.node];if(t&&c.Pc){busLoad[t.bus]+=c.Pc;if(t.cb)feederP[t.cb]=(feederP[t.cb]||0)+c.Pc;}});
  FEEDERS.forEach(f=>{f.P=feederP[f.cb]||0;D[f.cb].I=Math.abs(f.P)*kA(f.bus);});
  RING.stations.forEach(s=>{s.P=s.groups.reduce((a,g)=>a+g.Pc,0);});
  FLOW.load=busLoad.RA+busLoad.RB;FLOW.load20=busLoad.RC+busLoad.RD;
  // 110 kV-netspanning (TenneT) varieert over de dag
  const U110=110.5+1.6*Math.sin((h-4)/24*2*Math.PI)+0.25*Math.sin(SIM.t*0.05)-0.012*FLOW.P110;FLOW.U110=U110;
  const feeds=perBus(()=>[]);
  TR.forEach(T=>{const t=D[T];t.S=0;t.Sc=0;t.rev=false;t.U0=EN.has(T+'h')?U110/110*trafoUn(T)*(1+(t.tap-9)*TAP_STEP):0;
    TR_LV[T].forEach(id=>{const c=D[id];c.I=0;const b=railOf(c.b);if(c.state===1&&EN.has(T+'l')&&b)feeds[b].push(T);});});
  const coupled=D['V-K'].state===1,coupled20=D['W-K'].state===1;
  FLOW.U=perBus(0);FLOW.groups=[];
  // railgroepen: twee railhelften vormen één groep als hun koppeling dicht is
  Object.entries(COUPLERS).flatMap(([cb,[a,b]])=>D[cb].state===1?[[a,b]]:[[a],[b]]).forEach(g=>{const load=g.reduce((s,b)=>s+busLoad[b],0);const tf=[...new Set(g.flatMap(b=>feeds[b]))];if(!tf.length)return;
    FLOW.groups.push({buses:g,tf});
    tf.forEach(T=>{D[T].S+=Math.abs(load)/tf.length/0.95;D[T].rev=load<0;});
    if(tf.length>=2){const taps=tf.map(T=>D[T].tap),sc=25*0.052*(Math.max(...taps)-Math.min(...taps));tf.forEach(T=>D[T].Sc=sc);}
    const U=tf.reduce((s,T)=>s+D[T].U0-Z_DROP*trafoUn(T)*(D[T].S/D[T].rAF)*(load<0?-1:1),0)/tf.length;
    g.forEach(b=>FLOW.U[b]=U);tf.forEach(T=>D[T].Ulv=U);});
  TR.forEach(T=>{const t=D[T];if(!FLOW.groups.some(g=>g.tf.includes(T)))t.Ulv=t.U0;if(t.Sc)t.S=Math.hypot(t.S,t.Sc);
    TR_LV[T].forEach(id=>{const c=D[id];if(c.state===1&&EN.has(T+'l'))c.I=t.S*0.95*kA(c.b);});});
  FLOW.U.MP=EN.has('MP')?10.55-0.025*Math.max(0,busLoad.MP):0;   // OS Meppel: spanning door Netbeheer Noord geregeld
  let k=0;if(coupled){const genA=feeds.RA.reduce((s,T)=>s+D[T].S*0.95,0);k=Math.abs(genA-busLoad.RA);}D['V-K'].I=k*57.9;
  let k20=0;if(coupled20){const genC=feeds.RC.reduce((s,T)=>s+D[T].S*0.95,0);k20=Math.abs(genC-Math.abs(busLoad.RC));}D['W-K'].I=EN.has('RC')&&EN.has('RD')&&coupled20?k20*28.9:0;
  let P110=0;
  TR.forEach(T=>{const t=D[T];t.P=t.S*0.95*(t.rev?-1:1);if(EN.has(T+'h'))P110+=t.P*1.006+0.02;const I=t.S*5.25;D[T+'-Q0'].I=I;D[T+'-Q1'].I=I;});
  FLOW.P110=P110;
  ringFlows();
  const feeding=LINES.filter(L=>SIM.lines[L].avail&&D[L+'-Q9'].state&&D[L+'-Q0'].state&&D[L+'-Q1'].state);
  LINES.forEach(L=>{const p=feeding.includes(L)?P110/feeding.length:0;FLOW.lineP[L]=p;const I=Math.abs(p)/0.95*5.25;[L+'-Q9',L+'-Q0',L+'-Q1'].forEach(id=>D[id].I=I);});
}
// op welke rail staat een vermogenschakelaar normaal (voor incomers met railkeuzescheiders: de normale rail van het veld)
function homeBus(id){const n=D[id]?.b;return BUSES[n]?n:Object.values(SEL_BAYS).find(v=>v.node===n)?.home||null;}
const railOf=n=>BUS_BAND[n]?n:(FLOW.TAG?.[n]?.bus||null);   // op welke rail staat dit knooppunt nu
function nodeU(n){if(!EN.has(n))return 0;const L=lvl(n);if(L===110)return FLOW.U110;if(FLOW.U[n]!=null)return FLOW.U[n];
  if(RING_LV.has(n)||RING_MV.has(n)){const s=RING.stations.find(s=>n===s.node+'v'||n.startsWith(s.id+'-'));const t=FLOW.TAG[s?s.node:n]||FLOW.TAG[n];if(!t)return 0;const sn=s?s.node:n;return L===0.4?(FLOW.UN?.[sn]??FLOW.U[t.bus])*0.039:(FLOW.UN?.[n]??FLOW.U[t.bus]);}
  const f=FEEDERS.find(f=>f.node===n||f.sel===n);if(f)return FLOW.U[railOf(f.sel)]||0;return D[n.slice(0,2)].Ulv;}
