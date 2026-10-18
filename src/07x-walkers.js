
// ============================================================ voetgangers op de stoepen van de woonwijk en het centrum
// Alle mensen samen zijn een paar InstancedMeshes (weinig tekenbeurten). Overdag en in de spits lopen er meer, 's nachts en in de regen weinig.
const WALK_N=48;
const WK=(()=>{const mk=(geo,n)=>{const m=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.85}),n);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow=true;m.frustumCulled=false;m.userData.dyn=true;m.count=0;scene.add(m);return m;};
  return {torso:mk(new THREE.BoxGeometry(0.44,0.62,0.25),WALK_N),head:mk(new THREE.SphereGeometry(0.12,10,8),WALK_N),hair:mk(new THREE.SphereGeometry(0.128,10,6,0,Math.PI*2,0,Math.PI/2.2),WALK_N),
    leg:mk(new THREE.BoxGeometry(0.15,0.86,0.18).translate(0,-0.43,0),WALK_N*2),arm:mk(new THREE.BoxGeometry(0.12,0.58,0.14).translate(0,-0.29,0),WALK_N*2)};})();
const WALK_COL={shirt:[0x2f5d8a,0x8a2f3a,0x3d6b3a,0xc9a227,0x6b4a8a,0xdadada,0x22262c,0xb5653a,0x5a7f9a,0x9a9a92],legs:[0x2a3550,0x1d1f24,0x7a6a4e,0x44484e,0x2a3550],
  skin:[0xe0b394,0xd6a17e,0xa8754f,0x7a4f32,0xf0c8a8],hair:[0x2a1d14,0x8a6a3a,0x111111,0xb0b0b0,0xc8a060,0x5a3a20]};
// routes: de echte stoepstroken uit het layoutregister. Aan het eind van een stoep steekt een voetganger over naar een aansluitende stoep
// (of keert om). Staat er iets op de stoep (lantaarnpaal, kast, station), dan loopt hij aan de andere helft van de stoep.
const WALK_OBST=new Set(['kiosk','kast','kk','lamp','tree','small','hall','house','apt']);
let WALKERS=null,WSTRIPS=null;
function initWalkers(){WSTRIPS=LAYOUT.filter(e=>e.kind==='stoep').map(e=>{const [x0,z0,x1,z1]=e.r,h=x1-x0>z1-z0;
    return {h,a0:h?x0:z0,a1:h?x1:z1,c:h?(z0+z1)/2:(x0+x1)/2,w:h?z1-z0:x1-x0,obs:[]};}).filter(t=>t.a1-t.a0>12);
  for(const t of WSTRIPS)for(const e of LAYOUT){if(!WALK_OBST.has(e.kind))continue;const [x0,z0,x1,z1]=e.r,[b0,b1,c0,c1]=t.h?[x0,x1,z0,z1]:[z0,z1,x0,x1];
    if(b1<t.a0||b0>t.a1||c1<t.c-t.w/2||c0>t.c+t.w/2)continue;const oc=(c0+c1)/2;t.obs.push({a0:b0-0.6,a1:b1+0.6,side:oc>t.c?1:-1,full:c0<=t.c-t.w/2+0.2&&c1>=t.c+t.w/2-0.2});}
  const c=new THREE.Color();WALKERS=Array.from({length:WALK_N},(_,i)=>{const t=WSTRIPS[Math.floor(R()*WSTRIPS.length)],dir=R()<0.5?1:-1;
    WK.torso.setColorAt(i,c.setHex(pick(WALK_COL.shirt)));WK.arm.setColorAt(2*i,c);WK.arm.setColorAt(2*i+1,c);WK.head.setColorAt(i,c.setHex(pick(WALK_COL.skin)));WK.hair.setColorAt(i,c.setHex(pick(WALK_COL.hair)));
    c.setHex(pick(WALK_COL.legs));WK.leg.setColorAt(2*i,c);WK.leg.setColorAt(2*i+1,c);
    const w={v:1.05+R()*0.5,ph:R()*6,lat:(R()-0.5)*0.5,adj:0,x:0,z:0,yaw:0};walkStrip(w,t,t.a0+R()*(t.a1-t.a0),dir);return w;});
  for(const m of Object.values(WK))if(m.instanceColor)m.instanceColor.needsUpdate=true;}
const wPos=(t,a,l)=>t.h?[a,t.c+l]:[t.c+l,a];
function walkStrip(w,t,a,dir){w.t=t;w.a=a;w.dir=dir;w.cross=null;}
// eind van de stoep: een stoep in de buurt kiezen (oversteken), anders omkeren
function walkNext(w){const t=w.t,end=w.dir>0?t.a1:t.a0,[ex,ez]=wPos(t,end,0),opts=[];
  for(const u of WSTRIPS){if(u===t)continue;for(const [ua,ud] of[[u.a0,1],[u.a1,-1]]){const [ux,uz]=wPos(u,ua,0),d=Math.hypot(ux-ex,uz-ez);if(d<10&&d>0.5)opts.push([u,ua,ud,ux,uz]);}}
  if(!opts.length||R()<0.15)return walkStrip(w,t,end,-w.dir);const [u,ua,ud,ux,uz]=pick(opts);w.cross={x0:w.x,z0:w.z,x1:ux,z1:uz,f:0,len:Math.hypot(ux-w.x,uz-w.z)||1,u,ua,ud};}
function walkLevel(h){return clamp(0.06+0.7*Math.max(gs(h,12.5,3),gs(h,17.5,2))+0.18*(h>7.5&&h<21.5?1:0),0,1)*(1-0.6*clamp(WX.cur.rain||0,0,1));}
const _wr=new THREE.Object3D(),_wp=new THREE.Object3D(),_wm=new THREE.Matrix4();
function wSet(m,i,x,y,z,rx){_wp.position.set(x,y,z);_wp.rotation.set(rx,0,0);_wp.updateMatrix();m.setMatrixAt(i,_wm.multiplyMatrices(_wr.matrix,_wp.matrix));}
function updateWalkers(dt){if(!WALKERS){if(!LAYOUT.length)return;initWalkers();}
  const far=camera.position.distanceTo(_wcen)>750,show=GFX.life&&!camInside()&&!far&&WSTRIPS.length,n=show?Math.round(WALK_N*walkLevel(viewHour())):0;
  for(const m of[WK.torso,WK.head,WK.hair])m.count=n;WK.leg.count=WK.arm.count=2*n;if(!n)return;const run=!SIM.paused&&!GAME.ended;
  for(let i=0;i<n;i++){const w=WALKERS[i],step=run?w.v*dt:0;if(run)w.ph+=dt*w.v*3.3;
    if(w.cross){const c=w.cross;c.f=Math.min(1,c.f+step/c.len);w.x=c.x0+(c.x1-c.x0)*c.f;w.z=c.z0+(c.z1-c.z0)*c.f;w.yaw=Math.atan2(c.x1-c.x0,c.z1-c.z0);if(c.f>=1)walkStrip(w,c.u,c.ua,c.ud);}
    else{const t=w.t;w.a+=step*w.dir;if(w.a>t.a1||w.a<t.a0){w.a=clamp(w.a,t.a0,t.a1);walkNext(w);}
      const o=t.obs.find(o=>w.a>o.a0&&w.a<o.a1&&!o.full),want=o?-o.side*t.w*0.28:w.lat;w.adj+=(want-w.adj)*Math.min(1,dt*3);
      [w.x,w.z]=wPos(t,w.a,w.adj);w.yaw=t.h?(w.dir>0?Math.PI/2:-Math.PI/2):(w.dir>0?0:Math.PI);}
    const s=run?Math.sin(w.ph)*0.5:0;_wr.position.set(w.x,0.1,w.z);_wr.rotation.set(0,w.yaw,0);_wr.updateMatrix();
    wSet(WK.torso,i,0,1.23,0,0);wSet(WK.head,i,0,1.68,0,0);wSet(WK.hair,i,0,1.71,-0.01,0);
    wSet(WK.leg,2*i,-0.11,0.92,0,s);wSet(WK.leg,2*i+1,0.11,0.92,0,-s);wSet(WK.arm,2*i,-0.29,1.5,0,-s*0.8);wSet(WK.arm,2*i+1,0.29,1.5,0,s*0.8);}
  for(const m of Object.values(WK))m.instanceMatrix.needsUpdate=true;}
const _wcen=new THREE.Vector3(25,0,245);
