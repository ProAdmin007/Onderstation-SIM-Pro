
// ============================================================ storingsbusjes: monteurs rijden vanaf het onderstation naar werk buiten het hek
// Het busje rijdt over het wegennet (dezelfde routering als de kabeltracés, rechts rijden, wacht bij een dichte overweg),
// parkeert op de rijbaan bij het werk met knipperende zwaailamp, de monteurs stappen uit en lopen het laatste stuk.
// Zijn ze klaar, dan lopen ze terug, stappen in en rijdt het busje terug naar het station.
const VAN_DEPOT=[62,41];   // parkeerplek op het stationsterrein (stationsweg, binnen het hek)
const VANS=[];
const outsideFence=p=>p.x<FENCE.x0-2||p.x>FENCE.x1+2||p.z<FENCE.z0-2||p.z>FENCE.z1+2;
const VAN_BEACON=mat({color:0x3a2000,emissive:0xffa21a,emissiveIntensity:0});
function serviceVanModel(){const g=vGroup();vBox(g,2.0,2.4,4.6,CM.white,0,1.5,-0.4);vBox(g,2.0,1.4,1.4,CM.white,0,1.05,2.5);vBox(g,2.02,0.6,0.9,CM.glass,0,1.95,1.9);
  vBox(g,2.02,0.28,4.62,CM.orange,0,1.0,-0.4);vBox(g,2.02,0.12,4.62,CM.yellow,0,1.2,-0.4);vBox(g,0.5,0.22,0.3,VAN_BEACON,0,2.81,0.9);vBox(g,1.8,0.06,1.6,CM.grey,0,2.73,-1.2);   // imperiaal
  const sm=new THREE.MeshBasicMaterial({map:signTex('STORINGSDIENST','#ffffff','#1d2b45',1024,128,'bold 86px Arial')});
  for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(3.2,0.4),sm);p.position.set(s*1.02,1.75,-0.6);p.rotation.y=s*Math.PI/2;g.add(p);}
  for(const x of[-0.7,0.7])vBox(g,0.3,0.15,0.05,CM.head,x,0.95,3.21);vWheels(g,[-0.9,0.9],[-1.9,2.2],0.38);g.visible=true;return g;}
// route over de hartlijnen; dubbele punten eruit (anders een stuk van lengte 0)
function vanRoute(pts){const out=[];for(const p of pts){const l=out[out.length-1];if(!l||Math.hypot(l[0]-p[0],l[1]-p[1])>0.5)out.push(p);}return out.length>1?cityRoute(out,1.7):null;}
// monteurs sturen: buiten het hek met het busje, binnen het hek (en de brandweer) lopend vanaf de poort
function crewDispatch(o){if(!o?.box)return;const c=o.box.getCenter(V3());
  if(o.kind==='fire'||o.walk||!outsideFence(c))return crewSpawn(o);
  const sn=gisSnap(c.x,c.z),path=sn&&gisPath(VAN_DEPOT[0],VAN_DEPOT[1],sn.x,sn.z),r=path&&vanRoute([VAN_DEPOT,...path]);
  if(!r)return crewSpawn(o);
  const V={g:serviceVanModel(),r,pts:[VAN_DEPOT,...path],d:0,v:0,vmax:12,wait:0,stops:[],len:5.6,o,state:'heen',npcs:[]};VANS.push(V);
  const [x,z,yaw]=routeAt(r,0);V.g.position.set(x,0,z);V.g.rotation.y=yaw;return V;}
function vanTick(dt){const run=!SIM.paused&&!GAME.ended,blink=(performance.now()%700)<350;
  for(let i=VANS.length-1;i>=0;i--){const V=VANS[i],o=V.o;
    if(V.state==='heen'){if(o.until?.()){vanBack(V);continue;}driveVehicle(V,run?dt:0);
      if(V.d>=V.r.total-0.3){V.state='werk';const [x,z,yaw]=routeAt(V.r,V.r.total),nx=-Math.cos(yaw),nz=Math.sin(yaw);   // uitstappen aan de stoepkant
        V.npcs=crewSpawn({...o,from:V3(x+nx*1.8,0,z+nz*1.8)})||[];if(!V.npcs.length)vanBack(V);}}
    else if(V.state==='werk'){if(!V.npcs.some(n=>NPCS.includes(n)))vanBack(V);}
    else if(V.state==='terug'){driveVehicle(V,run?dt:0);if(V.d>=V.r.total-0.3){scene.remove(V.g);VANS.splice(i,1);continue;}}
    V.beacon=V.state==='werk'||V.state==='heen';}
  VAN_BEACON.emissiveIntensity=VANS.some(V=>V.beacon)&&blink?5:0.3;}
function vanBack(V){const back=V.pts.slice().reverse(),r=vanRoute(back);if(!r){scene.remove(V.g);VANS.splice(VANS.indexOf(V),1);return;}
  // eerst keren: begin op het punt waar het busje nu staat
  V.r=r;V.d=Math.min(routeNear(r,V.g.position.x,V.g.position.z),r.total);V.v=0;V.wait=0;V.state='terug';}
