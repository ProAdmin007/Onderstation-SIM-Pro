
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
    if(B.phase==='brand'&&SIM.t>=B.arrive){B.phase='wacht';B.wait=SIM.t;B.warn=SIM.t+10;pushAlarm(`Brandweer ter plaatse bij ${s.id}: maak het station en de kabels ernaartoe spanningsloos (${stNeighborSwitches(s).join(' en ')} UIT) – dan blussen we`,'crit');}
    if(B.phase==='wacht'){if(iso){B.phase='blussen';B.until=SIM.t+rnd(15,22);if(!B.forced)award(B.wait&&SIM.t-B.wait<=10?25:10,`${s.id} spanningsloos voor de brandweer`);pushAlarm(`Brandweer: ${s.id} spanningsloos bevestigd – we blussen`,'ok');}
      else if(SIM.t-B.wait>25){B.forced=true;stNeighborSwitches(s).forEach(id=>{if(D[id].state===1)D[id].state=0;});computeFlows();award(-40,`Brandweer liet ${s.id} zelf afschakelen`);
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


// ---- beelden (echte tijd): politie, afzetting, storingsploeg, brandweer met schuim; alles op afstand van het brandende station
const STV=new Map();
const FIRE_CORDON=22,PARK={politie:26,brandweer:16,ploeg:30};
function stRoadSpot(s){const sn=gisSnap(...s.pos);if(!sn)return {x:s.pos[0],z:s.pos[1],yaw:0};const a=GIS_NET.nodes[sn.a],b=GIS_NET.nodes[sn.b],yaw=Math.atan2(b.x-a.x,b.z-a.z);
  const dx=s.pos[0]-sn.x,dz=s.pos[1]-sn.z,L=Math.hypot(dx,dz)||1;return {x:sn.x+dx/L*1.7,z:sn.z+dz/L*1.7,yaw};}
function policeModel(){const g=vGroup();vBox(g,1.8,0.75,4.3,CM.white,0,0.65,0);vBox(g,1.6,0.6,2.2,CM.glass,0,1.25,-0.2);vBox(g,1.82,0.22,4.32,CM.blue,0,0.75,0);vBox(g,1.82,0.1,4.32,CM.orange,0,0.95,0);
  for(const x of[-0.4,0.4])vBox(g,0.5,0.15,0.25,POLICE_BLINK,x,1.62,-0.2);vWheels(g,[-0.85,0.85],[-1.3,1.3],0.33);g.visible=true;return g;}
const POLICE_BLINK=mat({color:0x0a1430,emissive:0x2a6bff,emissiveIntensity:0});
// lint met paaltjes rond het station (marge in meters)
function tapeAround(s,m=1.4){const b=VIEWS[s.id].box,g=new THREE.Group(),x0=b.min.x-m,x1=b.max.x+m,z0=b.min.z-m,z1=b.max.z+m,pts=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
  for(let i=0;i<4;i++)tapeLine(g,...pts[i],...pts[(i+1)%4]);g.userData.dyn=true;scene.add(g);return g;}
function tapeLine(g,ax,az,bx,bz){const L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.floor(L/0.8));vBox(g,0.08,1.1,0.08,CM.white,ax,0.55,az);vBox(g,0.08,1.1,0.08,CM.white,bx,0.55,bz);
  for(let k=0;k<n;k++){const f=(k+0.5)/n,t=vBox(g,L/n,0.08,0.02,k%2?CM.white:CM.red,ax+(bx-ax)*f,0.95,az+(bz-az)*f);t.rotation.y=-Math.atan2(bz-az,bx-ax);t.castShadow=false;}}
// afzetting door de politie: hekken met lint over elke straat die het afzetgebied in loopt
function cordonUp(s){const c=VIEWS[s.id].center,R=FIRE_CORDON,rect=[c.x-R,c.z-R,c.x+R,c.z+R],g=new THREE.Group();g.userData.dyn=true;
  GIS_NET.nodes.forEach((n,ni)=>{for(const [j] of n.e){if(ni>j)continue;const m=GIS_NET.nodes[j];
    for(const [ax,az,bx,bz] of[[rect[0],rect[1],rect[0],rect[3]],[rect[2],rect[1],rect[2],rect[3]],[rect[0],rect[1],rect[2],rect[1]],[rect[0],rect[3],rect[2],rect[3]]]){
      // snijpunt van de straat (n naar m) met de rand van het afzetgebied
      const vert=ax===bx,den=vert?m.x-n.x:m.z-n.z;if(Math.abs(den)<1e-6)continue;const t=vert?(ax-n.x)/den:(az-n.z)/den;if(t<0||t>1)continue;
      const x=n.x+(m.x-n.x)*t,z=n.z+(m.z-n.z)*t;if(vert?(z<rect[1]||z>rect[3]):(x<rect[0]||x>rect[2]))continue;
      const L=Math.hypot(m.x-n.x,m.z-n.z)||1,px=-(m.z-n.z)/L,pz=(m.x-n.x)/L;   // dwars op de straat
      tapeLine(g,x-px*5,z-pz*5,x+px*5,z+pz*5);
      for(const k of[-2.2,0,2.2]){const b=vBox(g,1.9,0.5,0.12,k?CM.white:CM.red,x+px*k,0.75,z+pz*k);b.rotation.y=Math.atan2(px,pz)-Math.PI/2;}}}});
  scene.add(g);CORDONS.push(rect);return {g,rect};}
function cordonDown(cd){if(!cd)return;scene.remove(cd.g);disposeTree(cd.g);const i=CORDONS.indexOf(cd.rect);if(i>=0)CORDONS.splice(i,1);}
// hulpdienst rijdt vanaf de rand van de stad naar het station en parkeert op afstand
function respond(model,s,park,vmax){const c=VIEWS[s.id].center,sn=gisSnap(c.x,c.z),path=sn&&gisPath(25,560,sn.x,sn.z),r=path&&vanRoute([[25,560],...path]);
  if(!r){const p=stRoadSpot(s);model.position.set(p.x,0,p.z);model.rotation.y=p.yaw;return {g:model,arrived:true};}
  const stopAt=routeStopAt(r,c,park),V={g:model,r,d:0,v:0,vmax,wait:0,stops:[{d:stopAt,dur:1e9}],len:8,emergency:true,stopAt,arrived:false,sir:0};
  const [x,z,yaw]=routeAt(r,0);model.position.set(x,0,z);model.rotation.y=yaw;return V;}
function respondTick(V,dt,run,siren){if(!V||V.arrived)return;driveVehicle(V,run?dt:0);if(V.d>=V.stopAt-0.3)V.arrived=true;
  if(siren&&run){V.sir-=dt;if(V.sir<=0){V.sir=1.2;if(camera.position.distanceTo(V.g.position)<400)AudioSys.siren?.(distGain(V.g.position)*0.8,siren);}}}
// zet een hulpdienst direct op zijn plek (na hervatten, of als het spel verder is dan het beeld)
function respondPark(V){if(!V||V.arrived||!V.r)return;V.d=V.stopAt;V.v=0;driveVehicle(V,0);V.arrived=true;}
// schuim: vlokken uit de straalpijp en een groeiende schuimlaag op en rond het station
const FOAM_MAT=new THREE.SpriteMaterial({map:glowTex,color:0xffffff,transparent:true,opacity:0.95,depthWrite:false});
const FOAM_BLOB=mat({color:0xf4f6f2,roughness:0.9});
function foamDrop(a,tg){const s=new THREE.Sprite(FOAM_MAT);s.scale.setScalar(0.7+Math.random()*0.6);s.position.copy(a);scene.add(s);const T=1.1,v=tg.clone().sub(a).divideScalar(T);v.y+=4.9*T;
  FX.push({t:0,update(dt){this.t+=dt;v.y-=9.8*dt;s.position.addScaledVector(v,dt);if(this.t>T){scene.remove(s);return false;}return true;}});}
function foamLayer(s){const b=VIEWS[s.id].box,c=b.getCenter(V3()),g=new THREE.Group(),blobs=[];g.userData.dyn=true;
  for(let i=0;i<14;i++){const top=i<7,o=mesh(new THREE.SphereGeometry(1,10,6),FOAM_BLOB,g,top?rnd(b.min.x+0.4,b.max.x-0.4):c.x+(Math.random()<0.5?-1:1)*rnd(1.8,3),top?b.max.y+0.05:0.05,top?rnd(b.min.z+0.3,b.max.z-0.3):c.z+rnd(-2.2,2.2));
    o.userData.r=top?rnd(0.7,1.1):rnd(0.6,1.2);o.scale.set(0.01,0.01,0.01);o.castShadow=false;blobs.push(o);}scene.add(g);return {g,blobs};}
function stationVisuals(dt){const run=!SIM.paused,now=performance.now();POLICE_BLINK.emissiveIntensity=[...STV.values()].some(v=>v.police)&&now%300<150?6:0.2;
  for(const s of RING.stations){const T=s.theft,B=s.burn;let v=STV.get(s);
    if(!T&&!B){if(v){[v.police?.g,v.tape,v.truck?.g,v.soot,v.foam?.g].forEach(o=>{if(o){scene.remove(o);disposeTree(o,o===v.soot);}});(v.flames||[]).forEach(f=>{scene.remove(f);f.material.dispose();});cordonDown(v.cordon);STV.delete(s);}continue;}
    if(!v){v={};STV.set(s,v);}
    // koperdiefstal: politieauto bij het station en lint zolang het onveilig is
    if(T){if(!v.police){const p=stRoadSpot(s),g=policeModel();g.position.set(p.x,0,p.z);g.rotation.y=p.yaw;v.police={g,arrived:true};}
      const want=T.phase==='onveilig';if(want&&!v.tape)v.tape=tapeAround(s);if(!want&&v.tape){scene.remove(v.tape);v.tape=null;}continue;}
    const burning=B.phase!=='vervangen',bx=VIEWS[s.id].box,c=bx.getCenter(V3()),k=B.phase==='blussen'?clamp((B.until-SIM.t)/18,0.08,1):1;
    if(burning){
      // politie, storingsploeg en brandweer rijden tegelijk uit; de politie is het snelst en zet de omgeving af
      if(!v.police)v.police=respond(policeModel(),s,PARK.politie,16);
      if(!v.truck){const t=fireTruck(true);scene.add(t.g);v.truck=respond(t.g,s,PARK.brandweer,13);v.truck.bm=t.bm;}
      if(!v.ploeg){v.ploeg=true;crewDispatch({box:bx,n:2,say:`Storingsdienst ${s.id}: toezicht`,park:PARK.ploeg,standOff:16,until:()=>!s.burn||s.burn.phase==='vervangen'});}
      if(B.phase!=='brand'){respondPark(v.police);respondPark(v.truck);}
      respondTick(v.police,dt,run,'politie');respondTick(v.truck,dt,run,'brandweer');
      if(v.truck.bm)v.truck.bm.emissiveIntensity=now%400<200?6:0.3;
      // afzetting en lint pas als de politie er is
      if(v.police.arrived&&!v.cordon){v.cordon=cordonUp(s);v.tape=tapeAround(s,5);}
      // vlammen en rook tot het blussen klaar is
      if(!v.flames){v.flames=[];for(let i=0;i<6;i++){const m=new THREE.SpriteMaterial({map:flameTex,transparent:true,depthWrite:false,blending:i%2?THREE.AdditiveBlending:THREE.NormalBlending,color:i%2?0xffffff:0xffb040});
        const f=new THREE.Sprite(m);f.userData={ox:rnd(-1.6,1.6),oz:rnd(-1,1),h:rnd(1.8,3.2),ph:Math.random()*9};scene.add(f);v.flames.push(f);}}
      for(const f of v.flames){const u=f.userData,fl=0.75+0.25*Math.sin(now/70+u.ph),h=u.h*fl*(0.4+0.6*k);f.scale.set(h*0.55,h,1);f.position.set(c.x+u.ox,bx.max.y+h*0.4,c.z+u.oz);f.material.opacity=0.9*k;}
      v.smoke=(v.smoke||0)+dt;if(v.smoke>0.45){v.smoke=0;smokePuff(c.x+rnd(-1.5,1.5),bx.max.y+1.5,c.z,0.6+0.4*k,B.phase==='blussen'?0xb4b4b0:0x3a3a3a);}
      // brandweerlieden met de slang op afstand (±7 m) zodra de wagen er staat
      if(v.truck.arrived&&!v.crew){const q=v.truck.g.position;v.crew=crewSpawn({box:bx,n:3,say:'Brandweer',kind:'fire',standOff:7,from:V3(q.x+1.5,0,q.z+1.5),until:()=>!s.burn||s.burn.phase==='vervangen'});}
      // blussen met schuim: vlokken uit de straalpijpen en een groeiende schuimlaag
      if(B.phase==='blussen'){if(!v.foam)v.foam=foamLayer(s);const p=clamp(1-(B.until-SIM.t)/18,0,1);
        v.foam.blobs.forEach((o,i)=>{const r=o.userData.r*(0.15+0.85*clamp(p*1.3-i*0.03,0,1));o.scale.set(r,r*0.45,r);});
        if(run&&v.crew){v.fz=(v.fz||0)+dt;while(v.fz>0.05){v.fz-=0.05;const n=v.crew[Math.floor(Math.random()*v.crew.length)];
          if(n&&NPCS.includes(n)&&n.state==='work'){const a=n.P.g.position.clone().setY(1.3),d=V3(c.x-a.x,0,c.z-a.z).normalize();foamDrop(a.addScaledVector(d,0.6),V3(c.x+rnd(-1.2,1.2),bx.max.y+0.3,c.z+rnd(-0.8,0.8)));}}}}}
    if(!v.soot){v.soot=mesh(new THREE.PlaneGeometry(bx.max.x-bx.min.x+0.2,bx.max.z-bx.min.z+0.2),mat({color:0x151515,roughness:1}),scene,c.x,bx.max.y+0.04,c.z);v.soot.rotation.x=-Math.PI/2;v.soot.castShadow=false;}
    // geblust: vlammen, afzetting en wagens weg; het schuim blijft liggen tot de trafo vervangen is
    if(!burning){if(v.flames){v.flames.forEach(f=>{scene.remove(f);f.material.dispose();});v.flames=null;}cordonDown(v.cordon);v.cordon=null;if(v.tape){scene.remove(v.tape);disposeTree(v.tape);v.tape=null;}
      if(v.police){scene.remove(v.police.g);disposeTree(v.police.g);v.police=null;}
      if(v.truck&&!(v.crew||[]).some(n=>NPCS.includes(n))){scene.remove(v.truck.g);disposeTree(v.truck.g);v.truck=null;v.crew=null;}}}}
