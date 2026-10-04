
// ============================================================ leven in de wijk: verlichte ramen per MS-station, auto's met koplampen en buren bij een storing
const gs=(h,m,s)=>Math.exp(-(((h-m)/s)**2));
const stationLive=s=>EN.has(s.node+'v')||!!s.genset;   // laagspanning aanwezig (of noodaggregaat)
// ---- ramen: 's avonds vol, 's nachts maar een paar; donker als het station geen spanning heeft
function occupancy(h){return h>=17&&h<23.5?1:h>=23.5||h<0.5?0.55:h<6?0.12:h<8.5?0.7:0.25;}
function updateWindows(){const h=hourOf(),base=clamp((NIGHT-0.15)*1.5,0,1)*occupancy(h);
  RING.stations.forEach(s=>{const o=stationLive(s)?base*0.95:0;(s.winMats||[]).forEach(m=>m.opacity=o);(s.winApt||[]).forEach(m=>m.opacity=o*0.9);});}

// ---- auto's: rondjes over de straten van beide wijken, rechts rijden, koplampen in het donker
const LOOPS=[[[-97,101],[63,101],[63,239],[-97,239]],[[-61,273],[109,273],[109,387],[-61,387]]];
const laneOf=(loop,dir)=>{const off=dir>0?1.6:-1.6,xs=loop.map(p=>p[0]),zs=loop.map(p=>p[1]),x0=Math.min(...xs)+off,x1=Math.max(...xs)-off,z0=Math.min(...zs)+off,z1=Math.max(...zs)-off;
  const pts=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];return dir>0?pts:pts.reverse();};   // met de klok mee: binnenbaan is rechts
const CAR_COL=[0xb8bec4,0x1c2a3a,0x8a1c1c,0xe8e8e4,0x2d4a2d,0x3a3f45,0x6a5232,0x14161a];
const CMAT={glass:mat({color:0x1a242c,roughness:0.15,metalness:0.6}),tyre:mat({color:0x111111,roughness:0.9}),
  tail:mat({color:0x400000,emissive:0xff2a1a,emissiveIntensity:0}),head:mat({color:0xdddddd,emissive:0xfff2d0,emissiveIntensity:0})};
const beamTex=(()=>{const c=cnv(64,256),g=c.getContext('2d'),gr=g.createLinearGradient(0,256,0,0);gr.addColorStop(0,'rgba(255,240,210,0.75)');gr.addColorStop(1,'rgba(255,240,210,0)');
  g.fillStyle=gr;g.beginPath();g.moveTo(22,256);g.lineTo(42,256);g.lineTo(64,0);g.lineTo(0,0);g.fill();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const beamMat=new THREE.MeshBasicMaterial({map:beamTex,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
function makeCar(i){const g=new THREE.Group(),body=mat({color:CAR_COL[i%CAR_COL.length],roughness:0.35,metalness:0.55}),B=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
  B(1.8,0.7,4.2,body,0,0.6,0);B(1.6,0.6,2.2,CMAT.glass,0,1.2,-0.2);
  for(const [x,z] of[[-0.85,1.3],[0.85,1.3],[-0.85,-1.3],[0.85,-1.3]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(0.33,0.33,0.25,12),CMAT.tyre);w.rotation.z=Math.PI/2;w.position.set(x,0.33,z);g.add(w);}
  for(const x of[-0.6,0.6]){B(0.35,0.15,0.05,CMAT.head,x,0.75,2.11);B(0.35,0.12,0.05,CMAT.tail,x,0.8,-2.11);}
  const beam=new THREE.Mesh(new THREE.PlaneGeometry(4,12),beamMat);beam.rotation.x=-Math.PI/2;beam.position.set(0,0.06,8.2);g.add(beam);
  g.traverse(o=>o.userData.dyn=true);scene.add(g);return g;}
const CARS=Array.from({length:12},(_,i)=>{const loop=LOOPS[i%2],dir=i%4<2?1:-1,lane=laneOf(loop,dir),segs=lane.map((p,k)=>{const q=lane[(k+1)%4];return {p,q,len:Math.hypot(q[0]-p[0],q[1]-p[1])};});
  const total=segs.reduce((a,s)=>a+s.len,0);return {g:makeCar(i),segs,total,d:(i*0.37%1)*total,v:rnd(7,11),k:i/12};});
function trafficLevel(h){return clamp(0.12+0.8*Math.max(gs(h,8,1.2),gs(h,17.5,1.6))+0.35*(h>7&&h<22?1:0),0,1);}
function updateCars(dt){const lvl=trafficLevel(hourOf()),night=NIGHT;CMAT.head.emissiveIntensity=night>0.2?4:0.3;CMAT.tail.emissiveIntensity=night>0.2?3:0.4;beamMat.opacity=night*0.45;
  const run=!SIM.paused&&!GAME.ended;
  CARS.forEach(c=>{const on=c.k<lvl;c.g.visible=on;if(!on)return;if(run)c.d=(c.d+c.v*dt)%c.total;let d=c.d;
    for(const s of c.segs){if(d<=s.len){const f=d/s.len,x=s.p[0]+(s.q[0]-s.p[0])*f,z=s.p[1]+(s.q[1]-s.p[1])*f;c.g.position.set(x,0,z);c.g.rotation.y=Math.atan2(s.q[0]-s.p[0],s.q[1]-s.p[1]);break;}d-=s.len;}});}

// ---- buren: komen naar buiten als hun station een paar minuten zonder stroom zit ('s avonds met de zaklamp van hun telefoon)
const CIV={shirt:[0x2f5d8a,0x8a2f3a,0x3d6b3a,0xc9a227,0x6b4a8a,0xdadada].map(c=>mat({color:c,roughness:0.8})),jeans:mat({color:0x2a3550,roughness:0.85}),hair:[0x2a1d14,0x8a6a3a,0x111111,0xb0b0b0].map(c=>mat({color:c,roughness:0.9}))};
const phoneMat=new THREE.SpriteMaterial({map:glowTex,color:0xf2f6ff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0});
function makeCivilian(v){const g=new THREE.Group(),sh=CIV.shirt[v%CIV.shirt.length],B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  for(const x of[-0.11,0.11]){npcMesh(B(0.15,0.86,0.18),CIV.jeans,g,x,0.5,0);npcMesh(B(0.16,0.1,0.26),NM.boot,g,x,0.05,0.03);}
  npcMesh(B(0.44,0.62,0.25),sh,g,0,1.23,0);npcMesh(B(0.12,0.58,0.14),sh,g,-0.29,1.22,0);
  const arm=new THREE.Group();arm.position.set(0.29,1.5,0);arm.rotation.x=-1.1;g.add(arm);npcMesh(B(0.12,0.58,0.14),sh,arm,0,-0.29,0);npcMesh(new THREE.SphereGeometry(0.06,8,6),NM.skin,arm,0,-0.62,0);
  const ph=new THREE.Sprite(phoneMat);ph.scale.set(0.7,0.7,1);ph.position.set(0,-0.68,0.06);arm.add(ph);
  const head=new THREE.Group();head.position.set(0,1.62,0);g.add(head);npcMesh(new THREE.SphereGeometry(0.12,14,10),NM.skin,head,0,0.08,0);
  npcMesh(new THREE.SphereGeometry(0.128,14,8,0,Math.PI*2,0,Math.PI/2.2),CIV.hair[v%CIV.hair.length],head,0,0.11,-0.01);
  g.traverse(o=>o.userData.dyn=true);scene.add(g);return {g,head};}
const CROWD_SPOTS=[[6,-8],[9,-10],[-6,-9],[3,-12],[11,-6]];
function updateNeighbours(dt){phoneMat.opacity=NIGHT>0.3?0.9:0;
  RING.stations.forEach(s=>{const live=stationLive(s),off=s.groups.find(g=>g.cust>0&&g.offSince!=null)?.offSince;
    const want=!live&&off!=null&&SIM.t-off>3&&s.cust>50;
    if(want&&!s.crowd){s.crowd=[];CROWD_SPOTS.slice(0,3+(s.cust>1000?2:0)).forEach(([dx,dz],i)=>{let x=s.pos[0]+dx,z=s.pos[1]+dz;if(blockedAt(x,z))return;
        const p=makeCivilian(i+s.id.charCodeAt(2));p.g.position.set(x,0,z);p.g.rotation.y=Math.atan2(s.pos[0]-x,s.pos[1]-z)+rnd(-0.5,0.5);p.ph=rnd(0,6);s.crowd.push(p);});
      if(s.crowd.length&&camera.position.distanceTo(V3(s.pos[0],0,s.pos[1]))<60)pushAlarm(`Buren rond ${s.id} ${s.name} staan op straat – “Weet u wat er aan de hand is?”`,'info');}
    if(s.crowd){if(!want){s.crowdLeft=(s.crowdLeft||0)+dt;if(s.crowdLeft>4){s.crowd.forEach(p=>scene.remove(p.g));s.crowd=null;s.crowdLeft=0;}}
      else{s.crowdLeft=0;s.crowd.forEach(p=>{p.ph+=dt;p.head.rotation.y=Math.sin(p.ph*0.6)*0.5;});}}});}
function updateLife(dt){updateCars(dt);updateNeighbours(dt);}
