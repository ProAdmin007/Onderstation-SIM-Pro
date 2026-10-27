
// ============================================================ storingsbusjes: monteurs rijden vanaf het onderstation naar werk buiten het hek
// Het busje rijdt over het wegennet (dezelfde routering als de kabeltracés, rechts rijden, wacht bij een dichte overweg),
// parkeert op de rijbaan bij het werk met knipperende zwaailamp, de monteurs stappen uit en lopen het laatste stuk.
// Zijn ze klaar, dan lopen ze terug, stappen in en rijdt het busje terug naar het station.
const VAN_DEPOT=[62,41];   // parkeerplek op het stationsterrein (stationsweg, binnen het hek)
const VANS=[];
let VAN_SIGN_M=null;const VAN_SIGN=()=>VAN_SIGN_M??=new THREE.MeshBasicMaterial({map:signTex('STORINGSDIENST','#ffffff','#1d2b45',1024,128,'bold 86px Arial')});
// verwijderde objecten ook uit het GPU-geheugen halen (geometrie altijd, materialen alleen als ze niet gedeeld zijn)
function disposeTree(o,mats=false){o.traverse(x=>{if(x.geometry)x.geometry.dispose();if(mats&&x.material)[].concat(x.material).forEach(m=>{m.map?.dispose();m.dispose();});});}
const outsideFence=p=>p.x<FENCE.x0-2||p.x>FENCE.x1+2||p.z<FENCE.z0-2||p.z>FENCE.z1+2;
const VAN_BEACON=mat({color:0x3a2000,emissive:0xffa21a,emissiveIntensity:0});
function serviceVanModel(){const g=vGroup();vBox(g,2.0,2.4,4.6,CM.white,0,1.5,-0.4);vBox(g,2.0,1.4,1.4,CM.white,0,1.05,2.5);vBox(g,2.02,0.6,0.9,CM.glass,0,1.95,1.9);
  vBox(g,2.02,0.28,4.62,CM.orange,0,1.0,-0.4);vBox(g,2.02,0.12,4.62,CM.yellow,0,1.2,-0.4);vBox(g,0.5,0.22,0.3,VAN_BEACON,0,2.81,0.9);vBox(g,1.8,0.06,1.6,CM.grey,0,2.73,-1.2);   // imperiaal
  const sm=VAN_SIGN();
  for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(3.2,0.4),sm);p.position.set(s*1.02,1.75,-0.6);p.rotation.y=s*Math.PI/2;g.add(p);}
  for(const x of[-0.7,0.7])vBox(g,0.3,0.15,0.05,CM.head,x,0.95,3.21);vWheels(g,[-0.9,0.9],[-1.9,2.2],0.38);g.visible=true;return g;}
// waar langs de route stoppen: zo dicht mogelijk bij het doel, maar niet dichterbij dan 'park' meter
function routeStopAt(r,c,park){if(!park)return r.total;for(let d=r.total;d>0;d-=1){const [x,z]=routeAt(r,d);if(Math.hypot(x-c.x,z-c.z)>=park)return d;}return r.total;}
// route over de hartlijnen; dubbele punten eruit (anders een stuk van lengte 0)
function vanRoute(pts){const out=[];for(const p of pts){const l=out[out.length-1];if(!l||Math.hypot(l[0]-p[0],l[1]-p[1])>0.5)out.push(p);}return out.length>1?cityRoute(out,1.7):null;}
// monteurs sturen: buiten het hek met het busje, binnen het hek (en de brandweer) lopend vanaf de poort
function crewDispatch(o){if(!o?.box)return;const c=o.box.getCenter(V3());
  if(o.kind==='fire'||o.walk||!outsideFence(c))return crewSpawn(o);
  const sn=gisSnap(c.x,c.z),path=sn&&gisPath(VAN_DEPOT[0],VAN_DEPOT[1],sn.x,sn.z),r=path&&vanRoute([VAN_DEPOT,...path]);
  if(!r)return crewSpawn(o);
  const V={tow:o.tow||null,trailer:null,g:(o.model||serviceVanModel)(),r,pts:[VAN_DEPOT,...path],d:0,v:0,vmax:12,wait:0,stops:[],len:5.6,o,state:'heen',npcs:[],emergency:!!o.park,stopAt:routeStopAt(r,c,o.park)};VANS.push(V);
  if(V.tow){V.trailer=gensetModel(true);V.trailer.position.set(0,0,-5.9);V.g.add(V.trailer);}
  const [x,z,yaw]=routeAt(r,0);V.g.position.set(x,0,z);V.g.rotation.y=yaw;return V;}
function vanTick(dt){const run=!SIM.paused&&!GAME.ended,blink=(performance.now()%700)<350;
  for(let i=VANS.length-1;i>=0;i--){const V=VANS[i],o=V.o;
    if(V.state==='heen'){if(o.until?.()){vanBack(V);continue;}if(V.stopAt<V.r.total&&!V.stops.length)V.stops=[{d:V.stopAt,dur:1e9}];driveVehicle(V,run?dt:0);
      if(V.d>=V.stopAt-0.3){V.state='werk';const pk=vanParkSpot(V),[x,z,yaw]=routeAt(V.r,pk.d),nx=-Math.cos(yaw),nz=Math.sin(yaw);   // stoepkant
        V.d=pk.d;V.base=[x,z];V.pn=[nx,nz];V.side=0;V.curb=pk.curb;V.parked=true;driveVehicle(V,0);V.parkedAt=SIM.t;
        o.onPark?.(V,x+nx*pk.curb,z+nz*pk.curb,V.g.rotation.y);
        if(V.trailer&&V.tow){V.g.remove(V.trailer);disposeTree(V.trailer);V.trailer=null;gensetPlace(V.tow);}
        const cs=pk.curb+Math.sign(pk.curb||1)*1.8;V.npcs=crewSpawn({...o,from:V3(x+nx*cs,0,z+nz*cs)})||[];if(!V.npcs.length)vanBack(V);}}
    else if(V.state==='werk'){V.side+=clamp(V.curb-V.side,-(run?dt:0)*1.6,(run?dt:0)*1.6);V.g.position.set(V.base[0]+V.pn[0]*V.side,Math.abs(V.side-V.curb)<0.3?0.1:0,V.base[1]+V.pn[1]*V.side);
      if(!V.npcs.some(n=>NPCS.includes(n)))vanBack(V);}
    else if(V.state==='terug'){driveVehicle(V,run?dt:0);if(V.side){V.side-=clamp(V.side,-(run?dt:0)*2,(run?dt:0)*2);const p=V.g.position;p.x+=V.pn[0]*V.side;p.z+=V.pn[1]*V.side;p.y=0;}if(V.d>=V.r.total-0.3){scene.remove(V.g);disposeTree(V.g);VANS.splice(i,1);continue;}}
    V.beacon=V.state==='werk'||V.state==='heen';}
  VAN_BEACON.emissiveIntensity=VANS.some(V=>V.beacon)&&blink?5:0.3;}
function vanBack(V){V.o.onLeave?.(V);const back=V.pts.slice().reverse(),r=vanRoute(back);if(!r){scene.remove(V.g);disposeTree(V.g);VANS.splice(VANS.indexOf(V),1);return;}
  // eerst keren: begin op het punt waar het busje nu staat
  V.r=r;V.d=Math.min(routeNear(r,V.g.position.x,V.g.position.z),r.total);V.v=0;V.wait=0;V.stops=[];V.state='terug';
  // van de stoep af: de terugweg ligt op de andere rijstrook (±3,4 m verder)
  if(V.parked&&V.side)V.side=V.side+3.4;else V.side=0;}
// het busje staat helemaal op de stoep (4,2 m uit het midden van de weg), zodat auto's erlangs kunnen
const VAN_CURB=2.5;
// vrije plek op de stoep: vanaf het stoppunt terug langs de route (dan vooruit), niet tegen een station, lantaarn, kast, boom of halte
const VAN_AVOID=['kiosk','lamp','kast','kk','tree','halte','house','apt','hall','small','shed','hedge','aggregaat','car'];
function vanParkSpot(V){const r=V.r,free=(d,curb)=>{const [x,z,yaw]=routeAt(r,d),nx=-Math.cos(yaw),nz=Math.sin(yaw),px=x+nx*curb,pz=z+nz*curb,al=Math.abs(Math.sin(yaw))>0.5;
    const rc=al?[px-2.9,pz-1.05,px+2.9,pz+1.05]:[px-1.05,pz-2.9,px+1.05,pz+2.9],onStoep=curb!==0&&LAYOUT.some(e=>e.kind==='stoep'&&(al?px-2.8>=e.r[0]&&px+2.8<=e.r[2]&&pz>=e.r[1]&&pz<=e.r[3]:pz-2.8>=e.r[1]&&pz+2.8<=e.r[3]&&px>=e.r[0]&&px<=e.r[2]));
    return onStoep&&layFree(rc,VAN_AVOID,0.1);};
  const tg=V.o.box.getCenter(V3()),[sx,sz,sy]=routeAt(r,V.stopAt),left=(-Math.cos(sy))*(tg.x-sx)+Math.sin(sy)*(tg.z-sz)<0,
    curbs=left?[-VAN_CURB-3.4,-VAN_CURB-2.8,VAN_CURB,1.9]:[VAN_CURB,1.9,-VAN_CURB-3.4,-VAN_CURB-2.8];
  for(const curb of curbs)for(let k=0;k<=30;k++)for(const sg of[-1,1]){const d=V.stopAt+sg*k*1.5;if(d<6||d>V.r.total)continue;if(free(d,curb))return {d,curb};}
  return {d:V.stopAt,curb:0};}

// ---- noodaggregaat: op een aanhanger achter het busje; ter plaatse in het gras naast het station, met rook en motorgeluid
const GSM={body:mat({color:0x2f6a3c,roughness:0.6}),roof:mat({color:0x23502d,roughness:0.6}),grill:mat({color:0x1d2024,roughness:0.7}),stripe:mat({color:0xf0c419,roughness:0.5})};
function gensetModel(trailer){const g=new THREE.Group();g.userData.dyn=true;
  box(1.6,0.12,3.0,GSM.grill,g,0,0.55,0);for(const s of[-1,1]){const w=cyl(0.33,0.33,0.25,CM.tyre,g,s*0.92,0.33,-0.3,12);w.rotation.z=Math.PI/2;}
  box(0.1,0.1,1.4,GSM.grill,g,0,0.45,2.1);   // dissel
  box(1.5,1.35,2.7,GSM.body,g,0,1.3,0);box(1.56,0.08,2.76,GSM.roof,g,0,2.0,0);box(1.52,0.14,2.72,GSM.stripe,g,0,0.75,0);
  for(const s of[-1,1])box(0.02,0.7,1.2,GSM.grill,g,s*0.76,1.35,-0.6);   // ventilatieroosters
  cyl(0.07,0.07,0.6,MAT.galv,g,0.45,2.3,-0.9,8);
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.28),GEN_SIGN());for(const s of[-1,1]){const q=pl.clone();q.position.set(s*0.77,1.65,0.4);q.rotation.y=s*Math.PI/2;g.add(q);}
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;}
let GEN_SIGN_M=null;const GEN_SIGN=()=>GEN_SIGN_M??=new THREE.MeshBasicMaterial({map:signTex('NOODSTROOM','#ffffff','#1d2b45',512,100,'bold 64px Arial')});
// vrije plek in het gras naast het station (niet op weg, stoep, in een tuin of tegen een gebouw)
const GS_AVOID=['road','stoep','woonerf','parkeer','plein','house','apt','hall','small','kiosk','kast','kk','tree','lamp','hedge','shed','car','halte','laad'];
function gensetSpot(s){const b=VIEWS[s.id].box,c=b.getCenter(V3()),sn=gisSnap(c.x,c.z),best=[];
  for(let r=3.2;r<=12;r+=0.8)for(let a=0;a<24;a++){const ang=a/24*Math.PI*2,x=c.x+Math.cos(ang)*r,z=c.z+Math.sin(ang)*r;
    if(!layFree([x-1.1,z-1.7,x+1.1,z+1.7],GS_AVOID,0.2))continue;best.push({x,z,d:r+(sn?Math.hypot(x-sn.x,z-sn.z)*0.3:0)});}
  best.sort((p,q)=>p.d-q.d);const p=best[0]||{x:c.x+4,z:c.z};return {x:p.x,z:p.z,ry:sn?Math.atan2(sn.x-p.x,sn.z-p.z):0};}
const GSV=new Map();
function gensetPlace(s){if(GSV.has(s))return;const p=gensetSpot(s),g=gensetModel(false);g.position.set(p.x,0,p.z);g.rotation.y=p.ry;scene.add(g);
  GSV.set(s,{g,exh:V3(),t:0});lay('aggregaat',p.x-1.1,p.z-1.7,p.x+1.1,p.z+1.7);}
let GS_SND=null;
function gensetSound(v){const A=AudioSys;if(!A.ctx)return;if(!GS_SND){const c=A.ctx,n=A.loopNoise('lowpass',160,1.4,0),o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();
    o.type='sawtooth';o.frequency.value=31;f.type='lowpass';f.frequency.value=180;g.gain.value=0;o.connect(f);f.connect(g);g.connect(A.bus.omgeving);o.start();GS_SND={n,g};}
  A.set(GS_SND.n,v*0.5);A.set(GS_SND.g,v*0.35);}
// elke frame: aggregaat neerzetten of weghalen volgens de toestand van het station, rook uit de uitlaat en motorgeluid
function gensetTick(dt){let snd=0;const run=!SIM.paused;
  for(const s of RING.stations){const want=!!(s.gs||s.genset),v=GSV.get(s);
    if(want&&!v&&!VANS.some(V=>V.tow===s&&V.trailer))gensetPlace(s);
    if(!want&&v){scene.remove(v.g);disposeTree(v.g);GSV.delete(s);const i=LAYOUT.findIndex(e=>e.kind==='aggregaat'&&Math.abs((e.r[0]+e.r[2])/2-v.g.position.x)<0.1);if(i>=0)LAYOUT.splice(i,1);continue;}
    if(!v||!s.genset)continue;const ex=v.g.localToWorld(v.exh.set(0.45,2.6,-0.9)),d=camera.position.distanceTo(ex);
    if(run&&d<350){v.t+=dt;if(v.t>0.35){v.t=0;smokePuff(ex.x,ex.y,ex.z,0.35,0x555555);}}snd=Math.max(snd,clamp(1-d/90,0,1));}
  gensetSound(GFX.life&&!SIM.paused?snd:0);}
