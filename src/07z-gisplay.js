
// ============================================================ kabels in het spel: foutplaats bepalen, graafwerk (KLIC) en oude moffen
const GIS_YEAR=2026;
const cableOf=o=>o&&CABLES.find(c=>c.sec===o||c.f===o||c.g===o);
const mofW=m=>Math.max(0,2002-m.year)/12;   // ouderdomsgewicht: een mof van vóór 1990 telt flink mee
const cableRisk=c=>c?1+c.moffen.reduce((a,m)=>a+mofW(m),0):1;
function wpick(arr,w){const t=arr.reduce((a,x)=>a+w(x),0);let r=Math.random()*t;for(const x of arr){r-=w(x);if(r<=0)return x;}return arr[arr.length-1];}
// waar zit de fout: vaak bij een oude mof, anders ergens in de kabel
function faultSpot(c){if(!c)return null;const old=c.moffen.filter(m=>mofW(m)>0);
  if(old.length&&Math.random()<0.65){const m=wpick(old,mofW);return {d:m.d,x:m.x,z:m.z,mof:true,known:false};}
  const d=rnd(Math.min(10,c.len/3),Math.max(c.len-10,c.len*2/3)),[x,z]=polyAt(c.pts,d);return {d,x,z,mof:false,known:false};}
const spotFrom=c=>c.kind==='ring'?(c.sec.a||'OS Zuidwolde'):c.kind==='feeder'?'OS Zuidwolde':c.g?.st.id||'het station';
// de lopende storing op een kabel (ringstuk, MS-veld of LS-groep)
const faultOf=c=>!c?null:c.kind==='ring'?(c.sec.fault?c.sec:null):c.kind==='feeder'?c.f.fault||null:c.kind==='ls'?c.g.lvf||null:null;

// ---- reparatie: op het tijdstip repairAt (een foutplaatsbepaling haalt dat naar voren)
function ringRepair(s){if(!s.fault||SIM.t+0.05<s.repairAt)return;const c=cableOf(s),sp=s.spot;s.fault=false;s.located=false;s.spot=null;s.meas=null;RING.stations.forEach(x=>x.flag=false);
  pushAlarm(`Storingsdienst: kabel ${secName(s)} gerepareerd${sp?.known?' (nieuwe mof op de foutplek)':''} – normaliseer de ring (normaal-open punt ${s.ring.nop} weer open)`,'ok');gisAfterRepair(c,sp);refreshAll();}
function feederRepair(f){const F=f.fault;if(!F||SIM.t+0.05<F.repairAt)return;const c=cableOf(f),sp=F.spot;f.fault=null;f.outFrac=0;
  pushAlarm(`Storingsdienst: kabel ${f.id} gerepareerd – alle klanten van ${f.name} terug`,'ok');gisAfterRepair(c,sp);refreshAll();}
function gisAfterRepair(c,sp){if(!c||!sp)return;digStop(sp);if(sp.known||sp.mof){const i=c.moffen.findIndex(m=>Math.abs(m.d-sp.d)<1);if(i>=0)c.moffen.splice(i,1);c.moffen.push({d:sp.d,x:sp.x,z:sp.z,year:GIS_YEAR});c.moffen.sort((a,b)=>a.d-b.d);buildMofMesh();}}

// ---- foutplaatsbepaling: meetwagen met reflectiemeter op een spanningsloze kabel
// kan er nu gemeten worden? (null = ja, anders de reden)
function measBlock(c){const F=faultOf(c);if(!F||c.kind==='ls')return 'Deze kabel heeft geen MS-storing om in te meten';
  if(c.kind==='ring'&&!c.sec.located)return 'Eerst moet duidelijk zijn wélke kabel het is: de storingsdienst leest de verklikkers';
  if(c.kind==='feeder'&&F.stage==='search')return 'De storingsdienst zoekt nog – wacht tot de fout is weggeschakeld';
  if(F.spot?.known)return 'De foutplaats is al bekend';if(F.meas)return 'De meetwagen is al onderweg';
  if(c.kind==='ring'){const open=isoSwitches(c.sec).filter(id=>D[id].state===1);if(open.length||EN.has(c.sec.node))return `Meten kan alleen op een geïsoleerde kabel: open eerst ${open.join(' en ')||'de lastscheiders aan beide kanten'}`;}
  return null;}
function gisMeasure(c,auto=false){const why=measBlock(c);if(why)return auto?null:deny(why);const F=faultOf(c);
  F.meas=SIM.t;measVan(c,F);const t=rnd(6,10);pushAlarm(`Meetwagen ${auto?'rukt automatisch uit':'onderweg'} naar ${c.name}: foutplaatsbepaling met de reflectiemeter (±${Math.round(t)} min)`,'info');
  addTimer(t,()=>measDone(c,F));drawTablet();}
// de meetwagen bij een meting (niet opgeslagen: alleen beeld); de meting is pas klaar als de wagen er een paar minuten staat
const MEAS_VAN=new WeakMap();
function measDone(c,F){if(faultOf(c)!==F)return;const V=MEAS_VAN.get(F);if(V&&VANS.includes(V)&&SIM.t<F.meas+40&&(V.state==='heen'||SIM.t<(V.parkedAt??1e9)+4))return addTimer(1,()=>measDone(c,F));F.spot??=faultSpot(c);F.spot.known=true;const rest=rnd(28,42);
  if((F.repairAt??1e9)>SIM.t+rest){F.repairAt=SIM.t+rest;addTimer(rest,()=>c.kind==='ring'?ringRepair(c.sec):feederRepair(c.f));}
  award(10,'Foutplaats bepaald');digStart(F.spot);
  pushAlarm(`Meetwagen: fout in ${c.name} op ${Math.round(F.spot.d)} m vanaf ${spotFrom(c)}${F.spot.mof?' – bij een oude mof':''}. De graafploeg gaat direct naar de plek (reparatie ±${Math.round(rest)} min)`,'ok');}

// ---- kabelmeetwagen: rijdt naar het meetpunt (station aan de kabel, of het eind bij de klant), parkeert op de stoep met open achterdeuren;
// een technicus sluit de meetkabel aan in het station, een tweede bedient de reflectiemeter achter in de wagen
const MV={red:mat({color:0xc81f2a,roughness:0.5}),orange:mat({color:0xf07a14,roughness:0.6}),screen:mat({color:0x0a2a1a,emissive:0x2cff8a,emissiveIntensity:1.2}),table:mat({color:0x3a3d42,roughness:0.6})};
let MV_SIGN=null;
function measVanModel(){const g=vGroup();vBox(g,2.0,2.5,4.8,CM.white,0,1.55,-0.5);vBox(g,2.0,1.4,1.4,CM.white,0,1.05,2.5);vBox(g,2.02,0.6,0.9,CM.glass,0,1.95,1.9);
  vBox(g,2.02,0.3,4.82,MV.red,0,1.0,-0.5);cyl(0.04,0.04,2.2,MAT.galv,g,0.6,3.9,-1.6,6);vBox(g,0.6,0.08,0.3,MAT.galv,g,0.6,4.9,-1.6);
  const sm=MV_SIGN??=new THREE.MeshBasicMaterial({map:signTex('KABELMEETWAGEN','#ffffff','#c81f2a',1024,128,'bold 80px Arial')});
  for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.42),sm);p.position.set(s*1.02,1.75,-0.6);p.rotation.y=s*Math.PI/2;g.add(p);}
  for(const x of[-0.7,0.7])vBox(g,0.3,0.15,0.05,CM.head,x,0.95,3.21);vWheels(g,[-0.9,0.9],[-1.9,2.2],0.38);g.visible=true;return g;}
function measPoint(c){if(c.kind==='ring'){const st=RING.stations.find(x=>x.id===(c.sec.a||c.sec.b));if(st)return VIEWS[st.id].box;}
  const p=c.pts[c.pts.length-1];return new THREE.Box3(V3(p[0]-1,0,p[1]-1),V3(p[0]+1,2.5,p[1]+1));}
function measVan(c,F){if(LITE)return;const box=measPoint(c),tgt=box.getCenter(V3());
  const V=crewDispatch({box,n:1,say:'Meettechnicus: meetkabel aansluiten',model:measVanModel,until:()=>faultOf(c)!==F||!!F.spot?.known,
    onPark:(V,x,z,yaw)=>{const g=new THREE.Group();g.userData.dyn=true;const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=x-fx*3.0,rz=z-fz*3.0;
      // open achterdeuren, tafeltje met de reflectiemeter, de technicus erachter en de meetkabel naar het station
      for(const s of[-1,1]){const d=vBox(g,0.05,2.2,0.95,CM.white,rx+fz*s*1.3,1.35,rz-fx*s*1.3);d.rotation.y=yaw+s*0.35;}
      const tx=rx-fx*1.0,tz=rz-fz*1.0;vBox(g,0.9,0.05,0.6,MV.table,tx,0.85,tz);for(const s of[-1,1])vBox(g,0.05,0.85,0.05,MV.table,tx+fz*s*0.4,0.42,tz-fx*s*0.4);
      const scr=vBox(g,0.42,0.3,0.05,MV.screen,tx,1.05,tz);scr.rotation.y=yaw;
      const P=makePerson(4);g.add(P.g);P.g.position.set(tx-fx*0.8,0,tz-fz*0.8);P.g.rotation.y=yaw;P.armL.rotation.x=P.armR.rotation.x=-0.7;
      const L=Math.hypot(tgt.x-rx,tgt.z-rz),cab=vBox(g,0.07,0.07,L,MV.orange,(rx+tgt.x)/2,0.05,(rz+tgt.z)/2);cab.rotation.y=Math.atan2(tgt.x-rx,tgt.z-rz);cab.castShadow=false;
      scene.add(g);V.extra=g;},
    onLeave:V=>{if(V.extra){scene.remove(V.extra);disposeTree(V.extra);V.extra=null;}}});
  if(V&&VANS.includes(V))MEAS_VAN.set(F,V);}
// ---- graafwerk: KLIC-meldingen van aannemers; kabels laten aanwijzen voorkomt graafschade
const KLIC={jobs:[],next:null,seq:0};
const KLIC_R=8;   // straal van het graafgebied (m)
const klicCables=j=>CABLES.filter(c=>!c.far&&cableDist(c,j.x,j.z).d<=KLIC_R);
function klicFocus(j){if(!j)return;openTablet();TAB.follow=false;TAB.cx=j.x;TAB.cz=j.z;TAB.zoom=3.2;TAB.sel=null;TAB.klic=j;renderTabletChrome();refreshInfo();drawTablet();}
function klicCard(j){const cs=klicCables(j);return `<div class="gt-card"><b style="color:#f08a1a">■</b> <b>Graafmelding ${j.id}</b> · ${j.firm}<br><small>${j.why} bij ${j.where} · ${j.state==='plan'?`begint om ${fmtClock(j.start)}`:'nu aan het graven'} · ${j.marked?'<b>kabels aangewezen ✓</b>':j.order?'monteur onderweg om aan te wijzen':'<b>kabels niet aangewezen</b>'}</small>
  <div class="gt-x">In het graafgebied (${KLIC_R} m):<br>${cs.map(c=>`<span style="color:${cableCol(c)}">■</span> ${c.nr} – ${c.name}`).join('<br>')||'geen kabels'}</div>${!j.marked&&!j.order?`<div class="gt-act"><button class="mini primary" data-gact="klic:${j.id}">👷 Kabels aanwijzen</button></div>`:''}</div>`;}
// tablet zonder keuze: de open graafmeldingen met een knop om erheen te gaan
function tabletHome(){const js=KLIC.jobs;return (js.length?`<div class="gt-x"><b>Graafmeldingen (KLIC)</b><br>${js.map(j=>`${j.marked?'✓':'⚠'} ${j.firm} – ${j.where}, ${j.state==='plan'?fmtClock(j.start):'graaft nu'} <button class="mini" data-gact="klicgo:${j.id}">Toon</button>`).join('<br>')}</div>`:'')+'<small>Klik op een kabel of graafgebied voor de gegevens. Slepen schuift de kaart, scrollen zoomt.</small>';}
const KLIC_FIRMS=['Bouwbedrijf Jansen','Van der Veen Infra','GWW De Vries','Glasvezel Noord','Waterbedrijf Drenthe','Hoveniersbedrijf Bakker','Rioleringsbedrijf Mulder'];
const KLIC_WHY=['een sleuf voor glasvezel','vervanging van de riolering','een nieuwe waterleiding','het planten van straatbomen','een laadpaal-aansluiting','een warmtenet'];
function klicNew(forceCable){const cs=CABLES.filter(c=>!c.far&&c.kind!=='kk'&&c.len>30),c=forceCable||wpick(cs,c=>c.kind==='ls'?0.5:1);
  const d=rnd(Math.min(8,c.len/3),Math.max(c.len-8,c.len*2/3)),[x,z]=polyAt(c.pts,d),st=nearestStation(x,z),start=SIM.t+rnd(25,45);
  const j={id:'KLIC'+(++KLIC.seq),c,d,x,z,firm:pick(KLIC_FIRMS),why:pick(KLIC_WHY),where:`${st.name} (${st.id})`,start,end:start+rnd(40,70),hitAt:start+rnd(8,30),state:'plan',marked:false,order:false};
  KLIC.jobs.push(j);pushAlarm(`📋 KLIC-melding: ${j.firm} graaft vanaf ${fmtClock(j.start)} bij ${j.where} voor ${j.why}. Het graafgebied kruist ${c.nr} – laat de kabels aanwijzen (klik in Lopende storingen voor de kaart)`,'warn');drawTablet();if(TAB.on&&!TAB.sel&&!TAB.klic)refreshInfo();return j;}
function klicMark(j){if(!j||j.state==='klaar')return;if(j.marked)return deny('De kabels zijn al aangewezen');if(j.order)return deny('Er is al een monteur onderweg');
  j.order=true;const t=Math.min(rnd(8,14),Math.max(3,j.start-SIM.t-2));pushAlarm(`Monteur onderweg om ${j.c.name} aan te wijzen bij ${j.where} (±${Math.round(t)} min)`,'info');addTimer(t,()=>klicMarked(j));drawTablet();}
function klicMarked(j){if(j.state==='klaar'||j.hit)return;j.marked=true;award(5,'Kabels aangewezen bij graafwerk');pushAlarm(`Monteur: ${j.c.name} aangewezen en gemarkeerd bij de sleuf van ${j.firm} (${j.where})`,'ok');drawTablet();}
function klicHit(j){const c=j.c,spot={d:j.d,x:j.x,z:j.z,known:true,mof:false},live=['aan','warm'].includes(cableState(c));j.hit=true;
  // een kabel onder spanning geeft een vlamboog; bij een LS-kabel blijft de graafplek bij het graafwerk (geen foutplek met reparatie)
  digHit(j,c.kind==='ls'||c.kind==='kk'?j:spot,c.kind,live);award(-30,'Graafschade aan een kabel');GAME.stats.graaf=(GAME.stats.graaf||0)+1;
  pushAlarm(`💥 Graafschade: ${j.firm} heeft ${c.name} geraakt bij ${j.where}! De plek is bekend: de graafploeg kan direct aan de slag`,'crit');
  if(c.kind==='ring'){const s=c.sec,f=FEEDERS.find(x=>x.cb===FLOW.TAG[s.node]?.cb)||FD(s.ring.from);if(!s.fault)ringFault(f,s,rnd(50,80));s.located=true;s.spot=spot;}
  else if(c.kind==='feeder'){if(!c.f.fault)feederFault(c.f.id,rnd(5,8));if(c.f.fault)c.f.fault.spot=spot;}
  else if(c.kind==='ls'&&!c.g.lvf&&EN.has(c.g.node))lvFault(c.g.id);refreshAll();}
function klicTick(){if(!GAME.events||MODES[GAME.mode]?.les)return;KLIC.next??=SIM.t+rnd(40,110);
  if(SIM.t>=KLIC.next){KLIC.next=SIM.t+rnd(140,260);if(KLIC.jobs.length<2)klicNew();}
  for(const j of KLIC.jobs){if(j.state==='plan'&&SIM.t>=j.start){j.state='graaf';digStart(j);pushAlarm(`${j.firm} is begonnen met graven bij ${j.where}${j.marked?' – kabels aangewezen ✓':' – de kabels zijn NIET aangewezen!'}`,j.marked?'info':'warn');}
    if(j.state==='graaf'){if(!j.hitDone&&SIM.t>=j.hitAt){j.hitDone=true;if(Math.random()<(j.marked?0.03:0.5))klicHit(j);}
      if(SIM.t>=j.end){j.state='klaar';digStop(j);pushAlarm(`${j.firm}: graafwerk bij ${j.where} klaar${j.hit?'':' – zonder schade'}`,'info');}}}
  KLIC.jobs=KLIC.jobs.filter(j=>j.state!=='klaar');}

// ---- oude moffen preventief vervangen: alleen op een spanningsloze, gezonde kabel; niet onder spanning brengen zolang de ploeg bezig is
function gisMofReplace(c){const old=c.moffen.filter(m=>m.year<1990);if(!old.length)return deny('Deze kabel heeft geen moffen van vóór 1990');
  if(c.work)return deny('De ploeg is al bezig');if(faultOf(c))return deny('Eerst de storing laten repareren');
  if(['aan','warm'].includes(cableState(c)))return deny('Maak de kabel eerst spanningsloos (isoleren, terugvoeden via het normaal-open punt)');
  const t=25+old.length*10;c.work={until:SIM.t+t,n:old.length,x:old[0].x,z:old[0].z};digStart(c.work);
  pushAlarm(`Montageploeg vervangt ${old.length} oude mof${old.length>1?'fen':''} in ${c.name} (±${t} min). Breng de kabel niet onder spanning zolang ze bezig zijn!`,'info');drawTablet();}
function gisWorkTick(){for(const c of CABLES){const w=c.work;if(!w)continue;
  if(['aan','warm'].includes(cableState(c))){digStop(w);c.work=null;incident();pushAlarm(`Montageploeg: ${c.name} kwam onder spanning terwijl wij aan de moffen werkten!`,'crit');continue;}
  if(SIM.t>=w.until){digStop(w);c.work=null;c.moffen.forEach(m=>{if(m.year<1990)m.year=GIS_YEAR;});buildMofMesh();award(4*w.n,'Oude moffen preventief vervangen');
    pushAlarm(`Montageploeg: ${w.n} mof${w.n>1?'fen':''} in ${c.name} vervangen – de kabel mag weer in bedrijf`,'ok');drawTablet();}}}
// automatisch uitrukken (instelling): zodra een MS-kabelfout gevonden en de kabel geïsoleerd of weggeschakeld is
let AUTO_MEET=true;try{AUTO_MEET=localStorage.getItem('osz-automeet')!=='0';}catch(e){}
function setAutoMeet(on){AUTO_MEET=!!on;try{localStorage.setItem('osz-automeet',AUTO_MEET?'1':'0');}catch(e){}}
function autoMeasure(){if(!AUTO_MEET||MODES[GAME.mode]?.les)return;for(const c of CABLES)if((c.kind==='ring'||c.kind==='feeder')&&faultOf(c)&&!measBlock(c))gisMeasure(c,true);}
function gisSimTick(){klicTick();gisWorkTick();autoMeasure();}

// ---- graafplek in 3D: graafmachine die echt graaft (giek, steel en bak), groeiende sleuf en grondhoop, afzetting en grondwerkers
// Bij graafschade: vlamboog met vonken en rook, de machine stopt met de giek omhoog, de grondwerkers rennen weg en de geraakte kabel ligt zwartgeblakerd in de sleuf.
const DIGS=new Map(),DIGM={yel:mat({color:0xe8b81c,roughness:0.5}),dark:mat({color:0x2a2c30,roughness:0.7}),red:mat({color:0xd8262c,roughness:0.5}),white:mat({color:0xf0f0ea,roughness:0.5}),
  sand:mat({color:0xb89a6a,roughness:1}),pit:mat({color:0x3b2f22,roughness:1}),cable:mat({color:0x151515,roughness:0.6}),burn:mat({color:0x220800,emissive:0xff5a10,emissiveIntensity:0}),
  deep:mat({color:0x1d1710,roughness:1}),plate:mat({color:0x4a4f55,roughness:0.55,metalness:0.6}),tape:mat({color:0xd8262c,roughness:0.6}),
  amber:mat({color:0x3a2200,emissive:0xffa012,emissiveIntensity:0}),beacon:mat({color:0x3a2200,emissive:0xff9a10,emissiveIntensity:0}),
  sign:mat({map:(()=>{const c=cnv(128),g=c.getContext('2d');g.fillStyle='#fff';g.beginPath();g.moveTo(64,8);g.lineTo(122,116);g.lineTo(6,116);g.closePath();g.fill();g.strokeStyle='#d8262c';g.lineWidth=12;g.stroke();
    g.fillStyle='#111';g.beginPath();g.arc(58,56,7,0,7);g.fill();g.fillRect(50,64,12,22);g.fillRect(62,70,18,5);g.fillRect(44,86,8,16);g.fillRect(60,86,8,16);g.fillRect(74,88,22,8);const t=toTex(c);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t;})(),transparent:true,alphaTest:0.5,side:THREE.DoubleSide}),
  scorch:new THREE.MeshBasicMaterial({map:(()=>{const c=cnv(128),g=c.getContext('2d'),gr=g.createRadialGradient(64,64,4,64,64,62);gr.addColorStop(0,'rgba(8,6,4,0.95)');gr.addColorStop(0.5,'rgba(14,11,8,0.6)');gr.addColorStop(1,'rgba(20,16,12,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return toTex(c);})(),transparent:true,depthWrite:false})};
const DIRT_MAT=new THREE.SpriteMaterial({map:smokeTex,color:0x5a4632,transparent:true,depthWrite:false}),BALL_MAT=new THREE.SpriteMaterial({map:glowTex,color:0xffa040,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
// grond uit de bak of uit de sleuf: brokjes met zwaartekracht
function dirtBit(p,v,life=1.2,s=0.35){const m=new THREE.Sprite(DIRT_MAT);m.scale.setScalar(s*(0.6+Math.random()*0.8));m.position.copy(p);scene.add(m);
  FX.push({t:0,update(dt){this.t+=dt;v.y-=9.8*dt;m.position.addScaledVector(v,dt);if(m.position.y<0.08){m.position.y=0.08;v.set(0,0,0);}if(this.t>life){scene.remove(m);return false;}return true;}});}
function digStart(key){if(!key||DIGS.has(key))return;const g=new THREE.Group();g.position.set(key.x,0,key.z);g.userData.dyn=true;
  // de machine staat aan de straatkant (lokale +x wijst naar de weg), de sleuf ligt in de lengte van de kabel (lokale z)
  {const sn=gisSnap(key.x,key.z);if(sn&&sn.d>0.5)g.rotation.y=Math.atan2(-(sn.z-key.z),sn.x-key.x);}
  const U={t:Math.random()*6,prog:key.c?0:0.35,hit:null,workers:[]};g.userData.dig=U;
  // onderwagen met rupsen, bovenwagen (draait) met cabine, giek, steel en bak
  box(2.4,0.6,3.6,DIGM.dark,g,3.4,0.3,0);const tur=new THREE.Group();tur.position.set(3.4,0.6,0);g.add(tur);
  box(2.2,1.0,2.8,DIGM.yel,tur,0.2,0.5,0);box(1.3,1.2,1.3,DIGM.yel,tur,0.3,1.6,0.7);box(1.32,0.7,1.1,FT.glass,tur,0.3,1.75,0.7);box(0.9,0.5,2.6,DIGM.dark,tur,1.15,0.6,0);
  const boom=new THREE.Group();boom.position.set(-0.7,1.0,0);tur.add(boom);box(3.0,0.35,0.35,DIGM.yel,boom,-1.5,0,0);
  const stick=new THREE.Group();stick.position.set(-3.0,0,0);boom.add(stick);box(0.3,2.0,0.3,DIGM.yel,stick,0,-1.0,0);
  const bucket=new THREE.Group();bucket.position.set(0,-2.0,0);stick.add(bucket);box(0.8,0.55,0.7,DIGM.dark,bucket,-0.15,-0.2,0);
  Object.assign(U,{tur,boom,stick,bucket});
  // sleuf, grondhoop, afzetting met rood-witte hekken
  U.trench=new THREE.Group();g.add(U.trench);{const pt=mesh(new THREE.PlaneGeometry(0.9,1),DIGM.pit,U.trench,0,0.045,0);pt.rotation.x=-Math.PI/2;pt.receiveShadow=false;
    const dp=mesh(new THREE.PlaneGeometry(0.5,0.9),DIGM.deep,U.trench,0,0.05,0);dp.rotation.x=-Math.PI/2;dp.receiveShadow=false;
    for(const s of[-1,1])box(0.3,0.16,1,DIGM.sand,U.trench,s*0.6,0.08,0).castShadow=false;
    const tp=mesh(new THREE.PlaneGeometry(0.12,0.8),DIGM.tape,U.trench,0.08,0.055,0);tp.rotation.x=-Math.PI/2;tp.receiveShadow=false;}
  // rijplaten over de stoep, een bord 'werk in uitvoering' en een zwaailicht op de cabine
  for(const dz of[-1.6,1.6])box(1.5,0.03,3.0,DIGM.plate,g,1.2,0.05,dz).castShadow=false;
  cyl(0.03,0.03,1.5,DIGM.white,g,-1.8,0.75,-4.6,6);const sg=mesh(new THREE.PlaneGeometry(0.75,0.7),DIGM.sign,g,-1.8,1.65,-4.6);sg.castShadow=false;
  cyl(0.11,0.11,0.16,DIGM.beacon,tur,0.3,2.3,0.7,10);box(0.08,0.6,0.08,DIGM.dark,tur,1.0,1.3,-0.9);Object.assign(U,{exh:V3(1.0,1.65,-0.9)});
  U.pile=cyl(0.15,1.3,0.9,DIGM.sand,g,2.0,0.45,3.3,10);U.pile.castShadow=false;
  // afzetting om sleuf, machine en grondhoop
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,a2=(i+1)/10*Math.PI*2,x=1.7+Math.cos(a)*4.4,z=0.6+Math.sin(a)*3.8,x2=1.7+Math.cos(a2)*4.4,z2=0.6+Math.sin(a2)*3.8;
    box(0.06,1.0,0.06,DIGM.white,g,x,0.5,z);if(i%2===0)box(0.12,0.12,0.12,DIGM.amber,g,x,1.06,z);const r=box(Math.hypot(x2-x,z2-z),0.16,0.04,i%2?DIGM.red:DIGM.white,g,(x+x2)/2,0.85,(z+z2)/2);r.rotation.y=-Math.atan2(z2-z,x2-x);}
  // grondwerkers van de aannemer (alleen bij graafwerk van derden)
  if(key.c)for(const [x,z,ry] of[[-1.4,-1.6,0.9],[0.4,-2.4,0.2]]){const P=makePerson(Math.floor(Math.random()*6));g.add(P.g);P.g.position.set(x,0,z);P.g.rotation.y=ry;U.workers.push({P,x,z,ry});}
  {const P=makePerson(3);g.add(P.g);P.g.position.set(-0.9,0,0.9);P.g.rotation.y=Math.PI/2;const sh=new THREE.Group();sh.position.set(0,1.05,0.35);P.g.add(sh);rod(V3(0,0,0),V3(0,-1.0,0.25),0.02,DIGM.dark,sh,5);box(0.22,0.28,0.03,DIGM.plate,sh,0,-1.1,0.28);
    U.workers.push({P,x:-0.9,z:0.9,ry:Math.PI/2,shovel:sh});}
  scene.add(g);DIGS.set(key,g);return g;}
function digStop(key){const g=key&&DIGS.get(key);if(g){scene.remove(g);disposeTree(g);DIGS.delete(key);}}
// graafwerk van derden raakt een kabel: de graafplek blijft dezelfde (nu de foutplek), met de effecten
function digHit(key,spot,kind,live=true){let g=DIGS.get(key)||digStart(key);if(spot!==key){DIGS.delete(key);DIGS.delete(spot);DIGS.set(spot,g);}const U=g.userData.dig;U.hit=0;U.prog=Math.max(U.prog,0.5);
  const k=kind==='ls'?0.6:1.3;g.updateMatrixWorld(true);const p=U.bucket.getWorldPosition(V3());p.y=Math.max(0.4,p.y);
  if(!live){U.cable=cyl(0.09,0.09,2.6,DIGM.cable,g,0,0.12,0,10);U.cable.rotation.x=Math.PI/2;U.sparks=0;U.smoke=0;return;}
  const sh=shake;spawnArc(p,k);shake=Math.max(sh,0.5*k*clamp((distGain(p)-0.12)*1.2,0,1));   // geen schok als je ver weg kijkt
  digBlast(g,p,k);
  // de geraakte kabel in de sleuf, met een gloeiend uiteinde
  U.cable=cyl(0.09,0.09,2.6,DIGM.cable,g,0,0.12,0,10);U.cable.rotation.x=Math.PI/2;const end=cyl(0.1,0.1,0.25,DIGM.burn,g,0,0.12,-0.15,10);end.rotation.x=Math.PI/2;U.end=end;
  U.sparks=4;U.smoke=70;}
function digBlast(g,p,k){const near=camera.position.distanceTo(p)<220;
  if(near){const b=new THREE.Sprite(BALL_MAT.clone());b.position.copy(p).setY(0.6);scene.add(b);FX.push({t:0,update(dt){this.t+=dt;const q=this.t/0.9;b.scale.setScalar(3.6*k*Math.min(1,this.t/0.12));b.material.opacity=Math.max(0,1-q);if(q>=1){scene.remove(b);b.material.dispose();return false;}return true;}});
    for(let i=0;i<Math.round(16*k);i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*4;dirtBit(V3(p.x,0.3,p.z),V3(Math.cos(a)*s,3+Math.random()*4,Math.sin(a)*s),1.6);}
    for(let i=0;i<Math.round(40*k);i++)spark(V3(p.x,0.35,p.z));}
  const sc=mesh(new THREE.PlaneGeometry(2.4*k,2.4*k),DIGM.scorch,g,0,0.058,0);sc.rotation.x=-Math.PI/2;sc.receiveShadow=false;sc.castShadow=false;
  const v=distGain(p);if(camera.position.distanceTo(p)<500){AudioSys.burst({type:'lowpass',f:500,q:0.7,gain:0.9*v*k,dur:0.6});AudioSys.tone({f:70,f2:40,gain:0.4*v*k,dur:0.5});AudioSys.tone({f:100,type:'sawtooth',lp:900,gain:0.05*v*k,dur:1.4,hold:true});
    for(let i=0;i<14;i++)AudioSys.burst({type:'highpass',f:2500+Math.random()*2000,gain:(0.08+Math.random()*0.12)*v,dur:0.04,delay:0.3+Math.random()*3});}}
// elke frame: graven, de effecten na een treffer en de piketpaaltjes bij aangewezen kabels
const MARKS=new Map();
function digTick(dt){const run=!SIM.paused;
  for(const [key,g] of DIGS){const U=g.userData.dig;if(!U)continue;U.t+=run?dt:0;
    if(U.hit==null){// graafcyclus: giek omlaag en bak dicht, omhoog, draaien naar de grondhoop, legen, terugdraaien
      const digging=!key.c||key.state==='graaf',p=digging?(U.t%7)/7:0.05,sm=x=>x*x*(3-2*x);
      let sw=0,bd=-0.2,st=0.1,bk=0;
      if(p<0.4){const q=p/0.4;bd=0.3*Math.sin(q*Math.PI)-0.05;st=0.35*Math.sin(q*Math.PI);bk=q>0.5?-0.9:0;}
      else if(p<0.55){sw=sm((p-0.4)/0.15)*1.2;bd=-0.25;bk=-0.9;}else if(p<0.7){sw=1.2;bd=-0.25;bk=-0.9+sm((p-0.55)/0.15)*1.6;}else if(p<0.85){sw=1.2-sm((p-0.7)/0.15)*1.2;bd=-0.2;bk=0.7;}
      U.tur.rotation.y=sw;U.boom.rotation.z=bd;U.stick.rotation.z=st;U.bucket.rotation.z=bk;if(digging&&run)U.prog=Math.min(1,U.prog+dt*0.012);
      const near=run&&camera.position.distanceTo(g.position)<160;
      if(near&&digging&&p>0.58&&p<0.68&&Math.random()<dt*10){g.updateMatrixWorld(true);dirtBit(U.bucket.getWorldPosition(V3()),V3((Math.random()-0.5)*0.6,-0.5,(Math.random()-0.5)*0.6),1.0,0.3);}
      if(near&&digging){U.ex=(U.ex||0)+dt;if(U.ex>(p<0.4?0.5:1.1)){U.ex=0;g.updateMatrixWorld(true);const e=U.tur.localToWorld(U.exh.clone());smokePuff(e.x,e.y+0.3,e.z,0.35,0x6a6a66);}}
      U.workers.forEach((w,i)=>{if(w.shovel){const q=(U.t*0.9+i)%2,s=q<1?Math.sin(q*Math.PI):0;w.shovel.rotation.x=-0.3+s*0.9;w.P.armL.rotation.x=w.P.armR.rotation.x=-0.6-s*0.5;w.P.g.rotation.x=0.15*s;}
        else w.P.head.rotation.y=Math.sin(U.t*0.6+i)*0.5;});}
    else{U.hit+=dt;U.boom.rotation.z+=(-0.45-U.boom.rotation.z)*Math.min(1,dt*2);U.tur.rotation.y*=0.98;
      // grondwerkers rennen weg van de sleuf
      U.workers.forEach(w=>{const f=clamp(U.hit/2,0,1),L=Math.hypot(w.x,w.z)||1;w.P.g.position.set(w.x+w.x/L*6*f,0,w.z+w.z/L*6*f);w.P.g.rotation.y=Math.atan2(w.x,w.z);
        const s=f<1?Math.sin(U.hit*14)*0.7:0;w.P.legL.rotation.x=s;w.P.legR.rotation.x=-s;w.P.armL.rotation.x=-s;w.P.armR.rotation.x=s;});
      // nog even vonken uit de kabel, daarna rook uit de sleuf
      if(U.sparks>0&&run){U.sparks-=dt;if(Math.random()<dt*14)spark(g.position.clone().add(V3(0,0.25,0)));}
      if(U.smoke>0&&run){U.smoke-=dt;U.sm=(U.sm||0)+dt;if(U.sm>0.6){U.sm=0;smokePuff(g.position.x,0.4,g.position.z,0.5,0x3a3a3a);}}
      if(U.end)DIGM.burn.emissiveIntensity=U.hit<8?3*(0.6+0.4*Math.sin(U.hit*20)):Math.max(0,2-(U.hit-8)*0.2);}
    const len=0.6+2.6*U.prog;U.trench.scale.z=len;U.pile.scale.setScalar(0.35+0.85*U.prog);}
  // knipperlampen op de hekken (bij schemer en donker) en het zwaailicht op de graafmachine
  if(DIGS.size){const now=performance.now();DIGM.amber.emissiveIntensity=NIGHT>0.2&&now%1000<400?4:0;DIGM.beacon.emissiveIntensity=now%600<300?5:0.3;}
  // piketpaaltjes en gespoten lijnen langs de aangewezen kabels in het graafgebied
  for(const j of KLIC.jobs)if(j.marked&&!MARKS.has(j))MARKS.set(j,klicMarks(j));
  for(const [j,g] of MARKS)if(!KLIC.jobs.includes(j)){scene.remove(g);disposeTree(g);MARKS.delete(j);}}
// één vonk: klein heet deeltje met zwaartekracht
const SPARK_MAT=new THREE.SpriteMaterial({map:glowTex,color:0xffb050,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
function spark(p){const s=new THREE.Sprite(SPARK_MAT);s.scale.setScalar(0.18+Math.random()*0.15);s.position.copy(p);scene.add(s);const v=V3((Math.random()-0.5)*5,2+Math.random()*4,(Math.random()-0.5)*5),life=0.5+Math.random()*0.6;
  FX.push({t:0,update(dt){this.t+=dt;v.y-=9.8*dt;s.position.addScaledVector(v,dt);if(s.position.y<0.05){s.position.y=0.05;v.multiplyScalar(0.3);v.y=Math.abs(v.y);}if(this.t>life){scene.remove(s);return false;}return true;}});}
const MARK_MAT={ms:mat({color:0xe0281e,roughness:0.6}),ls:mat({color:0xf2c419,roughness:0.6}),stake:mat({color:0xe8dcc0,roughness:0.8})};
function klicMarks(j){const g=new THREE.Group();g.userData.dyn=true;
  for(const c of klicCables(j)){const m=c.kind==='ls'||c.kind==='kk'?MARK_MAT.ls:MARK_MAT.ms;let prev=null;
    for(let d=0;d<=c.len;d+=0.75){const [x,z]=polyAt(c.pts,d);if(Math.hypot(x-j.x,z-j.z)>KLIC_R){prev=null;continue;}
      // gespoten lijn op de grond (stukjes van 0,75 m), om de 1,5 m een piketpaaltje met een gekleurde kop
      if(prev){const L=Math.hypot(x-prev[0],z-prev[1]),q=box(L,0.01,0.1,m,g,(x+prev[0])/2,0.13,(z+prev[1])/2);q.rotation.y=-Math.atan2(z-prev[1],x-prev[0]);q.castShadow=false;}
      if(Math.round(d/0.75)%2===0){box(0.05,0.75,0.05,MARK_MAT.stake,g,x,0.37,z);box(0.07,0.14,0.07,m,g,x,0.78,z);}prev=[x,z];}}
  scene.add(g);return g;}

// ---- tablet: storing, graafwerk en moffen in de kabelkaart en de knoppen
function gisCardExtra(c){const F=faultOf(c),out=[],act=[];
  if(F&&c.kind!=='ls'){const sp=F.spot;
    if(sp?.known)out.push(`🔴 Fout op <b>${Math.round(sp.d)} m</b> vanaf ${spotFrom(c)}${sp.mof?' (oude mof)':''} – graafploeg aan het werk`);
    else if(F.meas)out.push('📡 Meetwagen is aan het meten…');
    else if(c.kind==='ring'&&!c.sec.located)out.push('🔎 Storingsdienst zoekt nog welke kabel het is (verklikkers)');
    else{out.push('Foutplaats onbekend: zonder meting graaft de ploeg proefsleuven (duurt lang)');act.push('<button class="mini primary" data-gact="meet">📡 Foutplaats bepalen</button>');}}
  if(F&&c.kind==='ls')out.push('🔴 LS-storing: de monteur zoekt en repareert');
  KLIC.jobs.filter(j=>j.c===c).forEach(j=>{out.push(`🚧 ${j.firm}: ${j.why}, ${j.state==='plan'?`vanaf ${fmtClock(j.start)}`:'nu aan het graven'} – ${j.marked?'kabels aangewezen ✓':j.order?'monteur onderweg':'<b>niet aangewezen</b>'}`);
    if(!j.marked&&!j.order)act.push(`<button class="mini primary" data-gact="klic:${j.id}">👷 Kabels aanwijzen</button>`);});
  const old=c.moffen.filter(m=>m.year<1990).length;if(c.work)out.push(`🔧 Ploeg vervangt moffen (klaar ${fmtClock(c.work.until)}) – niet inschakelen!`);
  else if(old)act.push(`<button class="mini" data-gact="mof" title="Alleen op een spanningsloze kabel">🔧 ${old} oude mof${old>1?'fen':''} vervangen</button>`);
  return (out.length?`<div class="gt-x">${out.join('<br>')}</div>`:'')+(act.length?`<div class="gt-act">${act.join('')}</div>`:'');}
$('#gtInfo').addEventListener('click',e=>{const b=e.target.closest('[data-gact]');if(!b)return;const a=b.dataset.gact;
  if(a.startsWith('klicgo:'))return klicFocus(KLIC.jobs.find(j=>j.id===a.slice(7)));
  if(a.startsWith('klic:')){klicMark(KLIC.jobs.find(j=>j.id===a.slice(5)));return refreshInfo();}
  const c=TAB.sel||nearestCable(camera.position.x,camera.position.z,12)?.c;if(!c)return;
  if(a==='meet')gisMeasure(c);else if(a==='mof')gisMofReplace(c);
  if(TAB.sel)refreshInfo();else $('#gtInfo').innerHTML=cableCard(c);});
// kaart: graafwerk (oranje), bekende foutplekken (rood kruis) en werkplekken
function gisDrawExtra(g,cv){const s=TAB.zoom,now=performance.now();
  for(const j of KLIC.jobs){const [a,b]=tabXY(j.x,j.z,cv),r=Math.max(7,KLIC_R*s),col=j.marked?'#2f8a4a':'#f08a1a',sel=TAB.klic===j;
    g.save();g.beginPath();g.arc(a,b,r,0,7);g.fillStyle=j.marked?'rgba(47,138,74,0.16)':'rgba(240,138,26,0.2)';g.fill();g.clip();
    for(const c of klicCables(j)){g.beginPath();c.pts.forEach(([x,z],i)=>{const [p,q]=tabXY(x,z,cv);i?g.lineTo(p,q):g.moveTo(p,q);});g.strokeStyle=col;g.lineWidth=7;g.globalAlpha=0.55;g.stroke();g.globalAlpha=1;g.strokeStyle=cableCol(c);g.lineWidth=2.5;g.stroke();}
    g.restore();g.beginPath();g.arc(a,b,r,0,7);g.strokeStyle=col;g.lineWidth=sel?3:2;g.setLineDash([5,3]);g.stroke();g.setLineDash([]);
    g.font='bold 11px Arial';g.textAlign='center';const lab=`${j.state==='graaf'?'GRAAFT':'KLIC'} ${j.state==='plan'?fmtClock(j.start):''}`,w=g.measureText(lab).width+8;g.fillStyle='rgba(255,255,255,0.9)';g.fillRect(a-w/2,b-r-17,w,14);g.fillStyle=col;g.fillText(lab,a,b-r-6);}
  for(const c of CABLES){const F=faultOf(c),sp=F?.spot;if(!sp?.known)continue;const [a,b]=tabXY(sp.x,sp.z,cv),k=6+2*Math.sin(now/150);g.strokeStyle='#ff2b2b';g.lineWidth=3;
    g.beginPath();g.moveTo(a-k,b-k);g.lineTo(a+k,b+k);g.moveTo(a+k,b-k);g.lineTo(a-k,b+k);g.stroke();}
  for(const c of CABLES)if(c.work){const [a,b]=tabXY(c.work.x,c.work.z,cv);g.fillStyle='#e8b81c';g.beginPath();g.arc(a,b,6,0,7);g.fill();}}
