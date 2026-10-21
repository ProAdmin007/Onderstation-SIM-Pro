
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
function gisMeasure(c){const F=faultOf(c);if(!F||c.kind==='ls')return deny('Deze kabel heeft geen MS-storing om in te meten');
  if(c.kind==='ring'&&!c.sec.located)return deny('Eerst moet duidelijk zijn wélke kabel het is: de storingsdienst leest de verklikkers');
  if(c.kind==='feeder'&&F.stage==='search')return deny('De storingsdienst zoekt nog – wacht tot de fout is weggeschakeld');
  if(F.spot?.known)return deny('De foutplaats is al bekend');if(F.meas)return deny('De meetwagen is al onderweg');
  if(c.kind==='ring'){const open=isoSwitches(c.sec).filter(id=>D[id].state===1);if(open.length||EN.has(c.sec.node))return deny(`Meten kan alleen op een geïsoleerde kabel: open eerst ${open.join(' en ')||'de lastscheiders aan beide kanten'}`);}
  F.meas=SIM.t;const t=rnd(6,10);pushAlarm(`Meetwagen onderweg naar ${c.name}: foutplaatsbepaling met de reflectiemeter (±${Math.round(t)} min)`,'info');
  addTimer(t,()=>measDone(c,F));drawTablet();}
function measDone(c,F){if(faultOf(c)!==F)return;F.spot??=faultSpot(c);F.spot.known=true;const rest=rnd(28,42);
  if((F.repairAt??1e9)>SIM.t+rest){F.repairAt=SIM.t+rest;addTimer(rest,()=>c.kind==='ring'?ringRepair(c.sec):feederRepair(c.f));}
  award(10,'Foutplaats bepaald');digStart(F.spot);
  pushAlarm(`Meetwagen: fout in ${c.name} op ${Math.round(F.spot.d)} m vanaf ${spotFrom(c)}${F.spot.mof?' – bij een oude mof':''}. De graafploeg gaat direct naar de plek (reparatie ±${Math.round(rest)} min)`,'ok');}

// ---- graafwerk: KLIC-meldingen van aannemers; kabels laten aanwijzen voorkomt graafschade
const KLIC={jobs:[],next:null,seq:0};
const KLIC_FIRMS=['Bouwbedrijf Jansen','Van der Veen Infra','GWW De Vries','Glasvezel Noord','Waterbedrijf Drenthe','Hoveniersbedrijf Bakker','Rioleringsbedrijf Mulder'];
const KLIC_WHY=['een sleuf voor glasvezel','vervanging van de riolering','een nieuwe waterleiding','het planten van straatbomen','een laadpaal-aansluiting','een warmtenet'];
function klicNew(forceCable){const cs=CABLES.filter(c=>!c.far&&c.kind!=='kk'&&c.len>30),c=forceCable||wpick(cs,c=>c.kind==='ls'?0.5:1);
  const d=rnd(Math.min(8,c.len/3),Math.max(c.len-8,c.len*2/3)),[x,z]=polyAt(c.pts,d),st=nearestStation(x,z),start=SIM.t+rnd(25,45);
  const j={id:'KLIC'+(++KLIC.seq),c,d,x,z,firm:pick(KLIC_FIRMS),why:pick(KLIC_WHY),where:`${st.name} (${st.id})`,start,end:start+rnd(40,70),hitAt:start+rnd(8,30),state:'plan',marked:false,order:false};
  KLIC.jobs.push(j);pushAlarm(`📋 KLIC-melding: ${j.firm} graaft vanaf ${fmtClock(j.start)} bij ${j.where} voor ${j.why}. Het graafgebied kruist ${c.name} – laat de kabels aanwijzen (tablet, G)`,'warn');drawTablet();return j;}
function klicMark(j){if(!j||j.state==='klaar')return;if(j.marked)return deny('De kabels zijn al aangewezen');if(j.order)return deny('Er is al een monteur onderweg');
  j.order=true;const t=Math.min(rnd(8,14),Math.max(3,j.start-SIM.t-2));pushAlarm(`Monteur onderweg om ${j.c.name} aan te wijzen bij ${j.where} (±${Math.round(t)} min)`,'info');addTimer(t,()=>klicMarked(j));drawTablet();}
function klicMarked(j){if(j.state==='klaar'||j.hit)return;j.marked=true;award(5,'Kabels aangewezen bij graafwerk');pushAlarm(`Monteur: ${j.c.name} aangewezen en gemarkeerd bij de sleuf van ${j.firm} (${j.where})`,'ok');drawTablet();}
function klicHit(j){const c=j.c,spot={d:j.d,x:j.x,z:j.z,known:true,mof:false};j.hit=true;award(-30,'Graafschade aan een kabel');GAME.stats.graaf=(GAME.stats.graaf||0)+1;
  pushAlarm(`💥 Graafschade: ${j.firm} heeft ${c.name} geraakt bij ${j.where}! De plek is bekend: de graafploeg kan direct aan de slag`,'crit');
  if(c.kind==='ring'){const s=c.sec,f=FEEDERS.find(x=>x.cb===FLOW.TAG[s.node]?.cb)||FD(s.ring.from);if(!s.fault)ringFault(f,s,rnd(50,80));s.located=true;s.spot=spot;}
  else if(c.kind==='feeder'){if(!c.f.fault)feederFault(c.f.id,rnd(5,8));if(c.f.fault)c.f.fault.spot=spot;}
  else if(c.kind==='ls')lvFault(c.g.id);refreshAll();}
function klicTick(){if(!GAME.events||MODES[GAME.mode]?.les)return;KLIC.next??=SIM.t+rnd(40,110);
  if(SIM.t>=KLIC.next){KLIC.next=SIM.t+rnd(140,260);if(KLIC.jobs.length<2)klicNew();}
  for(const j of KLIC.jobs){if(j.state==='plan'&&SIM.t>=j.start){j.state='graaf';digStart(j);pushAlarm(`${j.firm} is begonnen met graven bij ${j.where}${j.marked?' – kabels aangewezen ✓':' – de kabels zijn NIET aangewezen!'}`,j.marked?'info':'warn');}
    if(j.state==='graaf'){if(!j.hitDone&&SIM.t>=j.hitAt){j.hitDone=true;if(Math.random()<(j.marked?0.03:0.5))klicHit(j);}
      if(SIM.t>=j.end){j.state='klaar';digStop(j);pushAlarm(`${j.firm}: graafwerk bij ${j.where} klaar${j.hit?'':' – zonder schade'}`,'info');}}}
  KLIC.jobs=KLIC.jobs.filter(j=>j.state!=='klaar');}

// ---- oude moffen preventief vervangen: alleen op een spanningsloze, gezonde kabel; niet onder spanning brengen zolang de ploeg bezig is
function gisMofReplace(c){const old=c.moffen.filter(m=>m.year<1990);if(!old.length)return deny('Deze kabel heeft geen moffen van vóór 1990');
  if(c.work)return deny('De ploeg is al bezig');if(faultOf(c))return deny('Eerst de storing laten repareren');
  if(cableState(c)==='aan')return deny('Maak de kabel eerst spanningsloos (isoleren, terugvoeden via het normaal-open punt)');
  const t=25+old.length*10;c.work={until:SIM.t+t,n:old.length,x:old[0].x,z:old[0].z};digStart(c.work);
  pushAlarm(`Montageploeg vervangt ${old.length} oude mof${old.length>1?'fen':''} in ${c.name} (±${t} min). Breng de kabel niet onder spanning zolang ze bezig zijn!`,'info');drawTablet();}
function gisWorkTick(){for(const c of CABLES){const w=c.work;if(!w)continue;
  if(cableState(c)==='aan'){digStop(w);c.work=null;incident();pushAlarm(`Montageploeg: ${c.name} kwam onder spanning terwijl wij aan de moffen werkten!`,'crit');continue;}
  if(SIM.t>=w.until){digStop(w);c.work=null;c.moffen.forEach(m=>{if(m.year<1990)m.year=GIS_YEAR;});buildMofMesh();award(4*w.n,'Oude moffen preventief vervangen');
    pushAlarm(`Montageploeg: ${w.n} mof${w.n>1?'fen':''} in ${c.name} vervangen – de kabel mag weer in bedrijf`,'ok');drawTablet();}}}
function gisSimTick(){klicTick();gisWorkTick();}

// ---- graafplek in 3D: graafmachine, afzetting met rood-witte hekken en een zandhoop
const DIGS=new Map(),DIGM={yel:mat({color:0xe8b81c,roughness:0.5}),dark:mat({color:0x2a2c30,roughness:0.7}),red:mat({color:0xd8262c,roughness:0.5}),white:mat({color:0xf0f0ea,roughness:0.5}),sand:mat({color:0xb89a6a,roughness:1})};
function digStart(key){if(!key||DIGS.has(key))return;const g=new THREE.Group();g.position.set(key.x,0,key.z);g.userData.dyn=true;
  box(2.2,1.1,3.2,DIGM.yel,g,3.2,1.0,0);box(1.4,1.2,1.4,DIGM.yel,g,3.5,2.15,0.6);box(1.42,0.7,1.2,FT.glass,g,3.5,2.3,0.6);box(2.4,0.6,3.6,DIGM.dark,g,3.2,0.3,0);
  const arm=box(0.35,0.35,3.6,DIGM.yel,g,2.4,2.2,-1.4);arm.rotation.x=0.5;box(0.8,0.6,0.7,DIGM.dark,g,2.4,1.0,-3);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.cos(a)*3.2,z=Math.sin(a)*2.4;box(0.06,1.0,0.06,DIGM.white,g,x,0.5,z);const r=box(2.4,0.16,0.04,i%2?DIGM.red:DIGM.white,g,x,0.85,z);r.rotation.y=-a+Math.PI/2;}
  const pile=cyl(0.2,1.3,0.9,DIGM.sand,g,-1.6,0.45,0.8,10);pile.castShadow=false;box(2.6,0.06,0.9,DIGM.dark,g,0,0.05,0);
  scene.add(g);DIGS.set(key,g);}
function digStop(key){const g=key&&DIGS.get(key);if(g){scene.remove(g);DIGS.delete(key);}}

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
$('#gtInfo').addEventListener('click',e=>{const b=e.target.closest('[data-gact]');if(!b)return;const c=TAB.sel||nearestCable(camera.position.x,camera.position.z,12)?.c;if(!c)return;const a=b.dataset.gact;
  if(a==='meet')gisMeasure(c);else if(a==='mof')gisMofReplace(c);else if(a.startsWith('klic:'))klicMark(KLIC.jobs.find(j=>j.id===a.slice(5)));
  $('#gtInfo').innerHTML=cableCard(c);});
// kaart: graafwerk (oranje), bekende foutplekken (rood kruis) en werkplekken
function gisDrawExtra(g,cv){const s=TAB.zoom,now=performance.now();
  for(const j of KLIC.jobs){const [a,b]=tabXY(j.x,j.z,cv),r=Math.max(6,7*s);g.strokeStyle=j.marked?'#2f8a4a':'#f08a1a';g.lineWidth=2;g.setLineDash([4,3]);g.strokeRect(a-r,b-r,2*r,2*r);g.setLineDash([]);
    g.fillStyle=j.marked?'#2f8a4a':'#f08a1a';g.font='bold 10px Arial';g.textAlign='center';g.fillText(j.state==='graaf'?'GRAAFT':'KLIC',a,b-r-3);}
  for(const c of CABLES){const F=faultOf(c),sp=F?.spot;if(!sp?.known)continue;const [a,b]=tabXY(sp.x,sp.z,cv),k=6+2*Math.sin(now/150);g.strokeStyle='#ff2b2b';g.lineWidth=3;
    g.beginPath();g.moveTo(a-k,b-k);g.lineTo(a+k,b+k);g.moveTo(a+k,b-k);g.lineTo(a-k,b+k);g.stroke();}
  for(const c of CABLES)if(c.work){const [a,b]=tabXY(c.work.x,c.work.z,cv);g.fillStyle='#e8b81c';g.beginPath();g.arc(a,b,6,0,7);g.fill();}}
