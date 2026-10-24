
// ============================================================ storingen in MS-stations: koperdiefstal en een brandende distributietrafo
// De toestand staat op het station (theft en burn, met tijdstippen in speltijd). De simulatiestap zet de fases door
// Zo gaat alles vanzelf mee bij opslaan en hervatten. De beelden (politie, afzetlint, vlammen, brandweer) volgen de toestand.
const stAdjSecs=s=>RING.secs.filter(x=>x.a===s.id||x.b===s.id);
// spanningsloos: het station zelf én de kabels ernaartoe
const stIsolated=s=>!EN.has(s.node)&&stAdjSecs(s).every(x=>!EN.has(x.node));
// de schakelaars aan de overkant van de kabels naar dit station (buurstation of veld in het OS)
const stNeighborSwitches=s=>stAdjSecs(s).map(x=>x.a===s.id?(x.b?x.b+'-L':'V-'+x.ring.to):(x.a?x.a+'-R':'V-'+x.ring.from));
const stationCandidates=()=>RING.stations.filter(s=>!s.damaged&&!s.theft&&!s.burn&&!s.fuse&&!s.gs&&stationLive(s));
// mag er aan dit station geschakeld worden? (wordt door operate() en de LS-opdrachten gevraagd)
function stationBlock(s,id,to,local){if(!s)return null;
  if(s.burn&&s.burn.phase!=='vervangen')return `${s.id} brandt – niet bedienbaar. Maak het station spanningsloos vanaf de buren (${stNeighborSwitches(s).join(', ')})`;
  if(s.burn?.phase==='vervangen'&&id===s.id+'-T'&&to===1)return `${s.id}: de trafo wordt nog vervangen – ${s.id}-T blijft open`;
  if(s.theft?.phase==='onveilig'&&local)return `${s.id} is niet veilig: het aardingskoper is gestolen. Niet lokaal schakelen tot de aarding hersteld is (via SCADA mag wel)`;
  return null;}

// ---- koperdiefstal
function copperTheft(force){const s=force||pick(stationCandidates());if(!s)return feederFault();
  s.theft={phase:'melding',t:SIM.t,until:SIM.t+rnd(12,20),lv:null};
  pushAlarm(`🚨 Inbraakalarm ${s.id} ${s.name}: de deur is geforceerd. Een monteur en de politie gaan kijken`,'crit');
  crewDispatch({box:VIEWS[s.id].box,n:1,say:`Inbraak ${s.id}: schade opnemen`,until:()=>!s.theft});refreshAll();return s;}
// ---- brandende distributietrafo
function trafoFire(force){const s=force||pick(stationCandidates());if(!s)return feederFault();
  D[s.id+'-T'].state=0;s.unplanned=true;s.burn={phase:'brand',t:SIM.t,arrive:SIM.t+rnd(8,12),warn:SIM.t+10};computeFlows();
  pushAlarm(`🔥 Brandmelding: rook en vlammen uit MS-station ${s.id} ${s.name}. De trafozekeringen zijn doorgeslagen – de straten van ${s.id} zitten zonder stroom. Brandweer onderweg`,'crit');
  pushAlarm(`Tip: de brandweer blust pas als ${s.id} en de kabels ernaartoe spanningsloos zijn. ${s.id} zelf is niet bedienbaar: open ${stNeighborSwitches(s).join(' en ')} en voed de rest van de ring terug via het normaal-open punt`,'info');
  refreshAll();return s;}

// ---- fases (speltijd)
function stationTick(){for(const s of RING.stations){const T=s.theft,B=s.burn;
  if(T){if(T.phase==='melding'&&SIM.t>=T.until){T.phase='onveilig';T.until=SIM.t+rnd(60,90);let extra='';
      if(Math.random()<0.45){const g=pick(s.groups.filter(g=>g.cust>1&&g.kind!=='ovl'&&!g.lvf));if(g){g.lvf={at:SIM.t,frac:1,theft:true};g.outFrac=1;T.lv=g.id;extra=` Ook is er een stuk LS-kabel van ${g.name} weggenomen: die straat zit zonder stroom tot de reparatie.`;}}
      pushAlarm(`Monteur ${s.id}: het aardingskoper is gestolen – het station is niet veilig. Niet lokaal schakelen tot de aarding hersteld is (klaar om ${fmtClock(T.until)}).${extra}`,'warn');refreshAll();}
    else if(T.phase==='onveilig'&&SIM.t>=T.until){const g=T.lv&&LVG.find(x=>x.id===T.lv);if(g?.lvf?.theft){g.lvf=null;g.outFrac=0;}s.theft=null;award(15,`Aarding ${s.id} hersteld`);
      readyNotice(`${s.id}: aarding hersteld, het station is weer veilig${g?` en ${g.name} heeft weer stroom`:''}`,null);refreshAll();}}
  if(B){const iso=stIsolated(s);
    if(B.phase==='brand'&&SIM.t>=B.arrive){B.phase='wacht';B.wait=SIM.t;pushAlarm(`Brandweer ter plaatse bij ${s.id}: maak het station en de kabels ernaartoe spanningsloos (${stNeighborSwitches(s).join(' en ')} UIT) – dan blussen we`,'crit');}
    if(B.phase==='wacht'){if(iso){B.phase='blussen';B.until=SIM.t+rnd(15,22);award(B.wait&&SIM.t-B.wait<=10?25:10,`${s.id} spanningsloos voor de brandweer`);pushAlarm(`Brandweer: ${s.id} spanningsloos bevestigd – we blussen`,'ok');}
      else if(SIM.t-B.wait>25){stNeighborSwitches(s).forEach(id=>{if(D[id].state===1)D[id].state=0;});computeFlows();award(-40,`Brandweer liet ${s.id} zelf afschakelen`);
        pushAlarm(`Storingsdienst: niemand schakelde – ${stNeighborSwitches(s).join(' en ')} zijn op verzoek van de brandweer afgeschakeld`,'crit');refreshAll();}
      else if(SIM.t>=B.warn){B.warn=SIM.t+10;award(-10,`Brandweer wacht bij ${s.id}`);pushAlarm(`Brandweer wacht nog steeds bij ${s.id}: ${stNeighborSwitches(s).filter(id=>D[id].state===1).join(' en ')||'het station'} nog in bedrijf`,'warn');}}
    else if(B.phase==='blussen'){if(!iso&&!B.danger){B.danger=true;incident();pushAlarm(`Brandweer: er staat weer spanning op ${s.id} terwijl wij blussen!`,'crit');}
      if(SIM.t>=B.until){B.phase='vervangen';B.until=SIM.t+rnd(120,180);
        pushAlarm(`Brandweer: brand bij ${s.id} geblust. De trafo is verbrand en wordt vervangen (klaar ±${fmtClock(B.until)}). De ring mag weer onder spanning; ${s.id}-T blijft open. Voed de klanten met een noodaggregaat of via een kabelkast (N)`,'ok');
        crewDispatch({box:VIEWS[s.id].box,n:2,say:`Trafo ${s.id} vervangen`,until:()=>!s.burn});refreshAll();}}
    else if(B.phase==='vervangen'&&SIM.t>=B.until){s.burn=null;readyNotice(`${s.id}: nieuwe distributietrafo geplaatst – sluit ${s.id}-T om de straten weer te voeden`,s.id+'-T',()=>D[s.id+'-T'].state===0);refreshAll();}}}}
// ---- regels in Lopende storingen
function stationFaults(add){RING.stations.forEach(s=>{const T=s.theft,B=s.burn,go={tab:'R',dev:s.id};
  if(T?.phase==='melding')add('th'+s.id,'warn',`Inbraakalarm ${s.id} ${s.name}`,'monteur en politie gaan kijken',go);
  if(T?.phase==='onveilig')add('th'+s.id,'crit',`${s.id}: aardingskoper gestolen`,`niet lokaal schakelen · aarding hersteld om ${fmtClock(T.until)}`,go);
  if(B&&B.phase!=='vervangen'){const open=stNeighborSwitches(s).filter(id=>D[id].state===1);
    add('br'+s.id,'crit',`Trafobrand ${s.id} ${s.name}`,B.phase==='blussen'?'brandweer blust – geen spanning terugzetten':B.phase==='brand'?'brandweer onderweg':`brandweer wacht: ${open.length?open.join(' en ')+' UIT':'nog spanning op het station'}`,go);}
  if(B?.phase==='vervangen')add('br'+s.id,'warn',`${s.id}: trafo wordt vervangen`,`klaar om ${fmtClock(B.until)} · klanten via noodaggregaat of kabelkast`,go);});}

// ---- beelden: politieauto, afzetlint, vlammen en rook, brandweerwagen met brandweerlieden (echte tijd)
const STV=new Map();
function stRoadSpot(s){const sn=gisSnap(...s.pos);if(!sn)return {x:s.pos[0],z:s.pos[1],yaw:0};const a=GIS_NET.nodes[sn.a],b=GIS_NET.nodes[sn.b],yaw=Math.atan2(b.x-a.x,b.z-a.z);
  const dx=s.pos[0]-sn.x,dz=s.pos[1]-sn.z,L=Math.hypot(dx,dz)||1;return {x:sn.x+dx/L*1.7,z:sn.z+dz/L*1.7,yaw};}
function policeModel(){const g=vGroup();vBox(g,1.8,0.75,4.3,CM.white,0,0.65,0);vBox(g,1.6,0.6,2.2,CM.glass,0,1.25,-0.2);vBox(g,1.82,0.22,4.32,CM.blue,0,0.75,0);vBox(g,1.82,0.1,4.32,CM.orange,0,0.95,0);
  for(const x of[-0.4,0.4])vBox(g,0.5,0.15,0.25,CM.blink,x,1.62,-0.2);vWheels(g,[-0.85,0.85],[-1.3,1.3],0.33);g.visible=true;return g;}
function tapeAround(s){const b=VIEWS[s.id].box,g=new THREE.Group(),x0=b.min.x-1.4,x1=b.max.x+1.4,z0=b.min.z-1.4,z1=b.max.z+1.4,pts=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
  for(let i=0;i<4;i++){const [ax,az]=pts[i],[bx,bz]=pts[(i+1)%4],L=Math.hypot(bx-ax,bz-az);vBox(g,0.08,1.1,0.08,CM.white,ax,0.55,az);
    for(let k=0;k<Math.floor(L/0.8);k++){const f=(k+0.5)/Math.floor(L/0.8),t=vBox(g,0.8,0.08,0.02,k%2?CM.white:CM.red,ax+(bx-ax)*f,0.95,az+(bz-az)*f);t.rotation.y=-Math.atan2(bz-az,bx-ax);t.castShadow=false;}}
  g.userData.dyn=true;scene.add(g);return g;}
function stationVisuals(dt){const run=!SIM.paused,now=performance.now();
  for(const s of RING.stations){const T=s.theft,B=s.burn;let v=STV.get(s);
    if(!T&&!B){if(v){[v.police,v.tape,v.truck?.g,v.soot].forEach(o=>o&&scene.remove(o));(v.flames||[]).forEach(f=>scene.remove(f));STV.delete(s);}continue;}
    if(!v){v={};STV.set(s,v);}
    // koperdiefstal: politieauto bij het station, afzetlint zolang het onveilig is
    if(T&&!v.police){const p=stRoadSpot(s);v.police=policeModel();v.police.position.set(p.x,0,p.z);v.police.rotation.y=p.yaw;}
    if(!T&&v.police){scene.remove(v.police);v.police=null;}
    const tapeWant=T?.phase==='onveilig'||(B&&B.phase!=='vervangen');if(tapeWant&&!v.tape)v.tape=tapeAround(s);if(!tapeWant&&v.tape){scene.remove(v.tape);v.tape=null;}
    // trafobrand: vlammen en rook uit het station tot het blussen klaar is
    const burning=B&&B.phase!=='vervangen',bx=VIEWS[s.id].box,c=bx.getCenter(V3()),k=!B?0:B.phase==='blussen'?clamp((B.until-SIM.t)/18,0.1,1):1;
    if(burning&&!v.flames){v.flames=[];for(let i=0;i<6;i++){const m=new THREE.SpriteMaterial({map:flameTex,transparent:true,depthWrite:false,blending:i%2?THREE.AdditiveBlending:THREE.NormalBlending,color:i%2?0xffffff:0xffb040});
      const f=new THREE.Sprite(m);f.userData={ox:rnd(-1.6,1.6),oz:rnd(-1,1),h:rnd(1.8,3.2),ph:Math.random()*9};scene.add(f);v.flames.push(f);}}
    if(!burning&&v.flames){v.flames.forEach(f=>scene.remove(f));v.flames=null;}
    if(v.flames){for(const f of v.flames){const u=f.userData,fl=0.75+0.25*Math.sin(now/70+u.ph),h=u.h*fl*(0.4+0.6*k);f.scale.set(h*0.55,h,1);f.position.set(c.x+u.ox,bx.max.y+h*0.4,c.z+u.oz);f.material.opacity=0.9*k;}
      v.smoke=(v.smoke||0)+dt;if(v.smoke>0.45){v.smoke=0;smokePuff(c.x+rnd(-1.5,1.5),bx.max.y+1.5,c.z,0.6+0.4*k,B.phase==='blussen'?0xb4b4b0:0x3a3a3a);}}
    if(B&&!v.soot){v.soot=mesh(new THREE.PlaneGeometry(bx.max.x-bx.min.x+0.2,bx.max.z-bx.min.z+0.2),mat({color:0x151515,roughness:1}),scene,c.x,bx.max.y+0.04,c.z);v.soot.rotation.x=-Math.PI/2;v.soot.castShadow=false;}
    // brandweerwagen: rijdt met sirene vanaf de rand van de stad naar het station; daarna stappen de brandweerlieden uit
    if(burning&&!v.truck){const p=stRoadSpot(s),sn=gisSnap(p.x,p.z),path=sn&&gisPath(25,560,sn.x,sn.z),r=path&&vanRoute([[25,560],...path]);const t=fireTruck(true);scene.add(t.g);
      v.truck={g:t.g,bm:t.bm,r,d:0,v:0,vmax:14,wait:0,stops:[],len:9,sir:0};if(!r||B.phase!=='brand'){t.g.position.set(p.x,0,p.z);t.g.rotation.y=p.yaw;v.truck.r=null;}}
    if(v.truck){const tr=v.truck;if(tr.r&&run){if(B?.phase!=='brand')tr.d=tr.r.total;driveVehicle(tr,dt);if(tr.d>=tr.r.total-0.3)tr.r=null;
        tr.sir-=dt;if(tr.r&&tr.sir<=0){tr.sir=1.2;if(camera.position.distanceTo(tr.g.position)<400)AudioSys.siren?.(distGain(tr.g.position)*0.8);}}
      tr.bm.emissiveIntensity=burning?(now%400<200?6:0.3):0;
      if(!tr.r&&burning&&!v.crew&&B.phase!=='brand'){const q=tr.g.position;v.crew=crewSpawn({box:bx,n:3,say:'Brandweer',kind:'fire',from:V3(q.x+1.5,0,q.z+1.5),until:()=>!s.burn||s.burn.phase==='vervangen'});}
      if(!burning){scene.remove(tr.g);v.truck=null;v.crew=null;}}}}
