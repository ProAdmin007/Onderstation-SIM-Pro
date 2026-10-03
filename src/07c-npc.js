
// ============================================================ collega's: monteurs die komen kijken en werken
const NPCS=[];
const NM={vest:mat({color:0xf28c1a,roughness:0.6}),vestY:mat({color:0xcfe83a,roughness:0.6}),strip:mat({color:0xe6e9eb,emissive:0x2a2a2a,roughness:0.25,metalness:0.5}),
  trouser:mat({color:0x22304a,roughness:0.85}),skin:mat({color:0xd6a17e,roughness:0.7}),helmet:mat({color:0xf4f4f0,roughness:0.3}),helmetY:mat({color:0xf2c200,roughness:0.3}),boot:mat({color:0x1b1b1b,roughness:0.8})};
function npcMesh(geo,m,p,x,y,z){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;}
function makePerson(v){
  const g=new THREE.Group(),vest=v%2?NM.vestY:NM.vest,B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  const limb=(x,y)=>{const j=new THREE.Group();j.position.set(x,y,0);g.add(j);return j;};
  const legL=limb(-0.11,0.92),legR=limb(0.11,0.92);
  for(const l of[legL,legR]){npcMesh(B(0.15,0.84,0.18),NM.trouser,l,0,-0.42,0);npcMesh(B(0.16,0.1,0.28),NM.boot,l,0,-0.87,0.04);}
  npcMesh(B(0.46,0.64,0.27),vest,g,0,1.23,0);
  for(const y of[1.08,1.3])npcMesh(B(0.47,0.05,0.28),NM.strip,g,0,y,0);
  const armL=limb(-0.3,1.5),armR=limb(0.3,1.5);
  for(const a of[armL,armR]){npcMesh(B(0.12,0.6,0.14),vest,a,0,-0.3,0);npcMesh(new THREE.SphereGeometry(0.06,8,6),NM.skin,a,0,-0.64,0);}
  const head=new THREE.Group();head.position.set(0,1.62,0);g.add(head);
  npcMesh(B(0.1,0.08,0.1),NM.skin,head,0,-0.04,0);
  npcMesh(new THREE.SphereGeometry(0.12,14,10),NM.skin,head,0,0.08,0);
  npcMesh(new THREE.SphereGeometry(0.135,14,8,0,Math.PI*2,0,Math.PI/2),v%3?NM.helmet:NM.helmetY,head,0,0.12,0);
  npcMesh(new THREE.CylinderGeometry(0.17,0.17,0.02,16),v%3?NM.helmet:NM.helmetY,head,0,0.12,0.02);
  scene.add(g);return {g,legL,legR,armL,armR,head};}

// ---- routeplanning op een raster van 1 m (A*), met de botsingsvakken van het rondlopen
const GRID={x0:-210,z0:-120,w:470,h:460,cache:null};
function cellFree(ix,iz){if(ix<0||iz<0||ix>=GRID.w||iz>=GRID.h)return false;const k=iz*GRID.w+ix;
  if(!GRID.cache)GRID.cache=new Uint8Array(GRID.w*GRID.h);let v=GRID.cache[k];
  if(!v){v=blockedAt(GRID.x0+ix+0.5,GRID.z0+iz+0.5)?2:1;GRID.cache[k]=v;}return v===1;}
const toCell=(x,z)=>[Math.floor(x-GRID.x0),Math.floor(z-GRID.z0)];
function nearestFree(x,z){const [cx,cz]=toCell(x,z);for(let r=0;r<12;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;if(cellFree(cx+dx,cz+dz))return [cx+dx,cz+dz];}return null;}
function findPath(ax,az,bx,bz){
  const s=nearestFree(ax,az),t=nearestFree(bx,bz);if(!s||!t)return null;
  const W=GRID.w,sk=s[1]*W+s[0],tk=t[1]*W+t[0],g=new Map([[sk,0]]),came=new Map(),heap=[[0,sk]];
  const h=k=>{const x=k%W,z=(k/W)|0;return Math.hypot(x-t[0],z-t[1]);};
  const push=e=>{heap.push(e);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m;}}return top;};
  let it=0;
  while(heap.length&&it++<90000){const [,k]=pop();if(k===tk)break;const x=k%W,z=(k/W)|0,gk=g.get(k);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz;if(!cellFree(nx,nz))continue;if(dx&&dz&&(!cellFree(x+dx,z)||!cellFree(x,z+dz)))continue;
      const nk=nz*W+nx,ng=gk+(dx&&dz?1.414:1);if(ng<(g.get(nk)??Infinity)){g.set(nk,ng);came.set(nk,k);push([ng+h(nk),nk]);}}}
  if(!came.has(tk)&&sk!==tk)return null;
  const pts=[];for(let k=tk;k!==undefined;k=came.get(k)){pts.push(V3(GRID.x0+(k%W)+0.5,0,GRID.z0+((k/W)|0)+0.5));if(k===sk)break;}
  pts.reverse();
  // vereenvoudigen: alleen knikpunten bewaren
  const out=[pts[0]];for(let i=1;i<pts.length-1;i++){const a=out[out.length-1],b=pts[i],c=pts[i+1];if(Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))>0.01)out.push(b);}
  out.push(pts[pts.length-1]);return out;}

// ---- inzet van een ploeg
const CREW_FROM=V3(25,0,74);   // bij de poort
function standPoints(box,n,from){const c=box.getCenter(V3()),pts=[];
  const cand=[];for(let a=0;a<16;a++){const ang=a/16*Math.PI*2;const r=Math.max(box.max.x-box.min.x,box.max.z-box.min.z)/2+1.2;cand.push(V3(c.x+Math.cos(ang)*r,0,c.z+Math.sin(ang)*r));}
  cand.sort((p,q)=>p.distanceTo(from)-q.distanceTo(from));
  for(const p of cand){const f=nearestFree(p.x,p.z);if(!f)continue;const q=V3(GRID.x0+f[0]+0.5,0,GRID.z0+f[1]+0.5);if(pts.every(o=>o.distanceTo(q)>1.4))pts.push(q);if(pts.length>=n)break;}
  return pts;}
function crewDispatch({box,say,until,n=2,from=CREW_FROM}){
  if(!box)return;const look=box.getCenter(V3());
  standPoints(box,n,from).forEach((sp,i)=>{
    const start=from.clone().add(V3(i*0.9,0,i*0.6)),path=findPath(start.x,start.z,sp.x,sp.z);if(!path)return;
    const P=makePerson(NPCS.length+i);P.g.position.copy(path[0]);
    const el=document.createElement('div');el.className='npc';el.textContent=say;$('#labels').appendChild(el);
    NPCS.push({P,path,i:1,state:'in',look,until,home:start,phase:Math.random()*6,el,say,t:0,talk:i===0});
  });}
function npcWalk(n,dt,spd){const tgt=n.path[n.i];if(!tgt)return true;const p=n.P.g.position,d=V3(tgt.x-p.x,0,tgt.z-p.z),L=d.length();
  if(L<0.15){n.i++;return n.i>=n.path.length;}
  const step=Math.min(L,spd*dt);p.addScaledVector(d,step/L);
  const yaw=Math.atan2(d.x,d.z);n.P.g.rotation.y+=Math.atan2(Math.sin(yaw-n.P.g.rotation.y),Math.cos(yaw-n.P.g.rotation.y))*Math.min(1,dt*8);
  n.phase+=dt*spd*3.4;const s=Math.sin(n.phase)*0.55;n.P.legL.rotation.x=s;n.P.legR.rotation.x=-s;n.P.armL.rotation.x=-s*0.8;n.P.armR.rotation.x=s*0.8;
  p.y=Math.abs(Math.cos(n.phase))*0.04;return false;}
const _np=new THREE.Vector3();
function updateNPCs(dt){
  const spd=SIM.paused?0:1.5*clamp(SIM.speed/30,1,3.5),w=innerWidth,h=innerHeight,ins=camInside();
  for(let k=NPCS.length-1;k>=0;k--){const n=NPCS[k];n.t+=dt;
    if(n.state==='in'){if(spd&&npcWalk(n,dt,spd)){n.state='work';n.P.legL.rotation.x=n.P.legR.rotation.x=0;}}
    else if(n.state==='work'){
      const d=V3(n.look.x-n.P.g.position.x,0,n.look.z-n.P.g.position.z);n.P.g.rotation.y=Math.atan2(d.x,d.z);
      n.P.armR.rotation.x=-1.1-Math.sin(n.t*1.3)*0.25;n.P.armL.rotation.x=-0.3;n.P.head.rotation.x=-0.25+Math.sin(n.t*0.7)*0.15;n.P.head.rotation.y=Math.sin(n.t*0.4)*0.4;
      if(n.until()){const back=findPath(n.P.g.position.x,n.P.g.position.z,n.home.x,n.home.z);n.path=back||[n.home];n.i=0;n.state='out';n.el.textContent='Klaar, op weg terug';n.P.head.rotation.set(0,0,0);n.P.armL.rotation.x=n.P.armR.rotation.x=0;}}
    else if(n.state==='out'){if(spd&&npcWalk(n,dt,spd)){scene.remove(n.P.g);n.el.remove();NPCS.splice(k,1);continue;}}
    // tekstwolkje boven het hoofd
    _np.copy(n.P.g.position).setY(2.25).project(camera);const dist=camera.position.distanceTo(n.P.g.position);
    const vis=!ins&&dist<60&&(n.talk||n.state!=='work');
    if(vis&&_np.z<1&&Math.abs(_np.x)<1.1&&Math.abs(_np.y)<1.1){n.el.style.display='';n.el.style.transform=`translate(${((_np.x+1)/2*w).toFixed(1)}px,${((1-_np.y)/2*h).toFixed(1)}px) translate(-50%,-100%)`;}
    else n.el.style.display='none';}}
