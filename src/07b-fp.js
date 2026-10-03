
// ============================================================ rondlopen (first person)
const FP={on:false,yaw:0,pitch:0,keys:{},pos:new THREE.Vector3(),y:null,bob:0,stepPhase:0,look:null,rects:[]};
const REACH=6;
function addRect(x0,z0,x1,z1){FP.rects.push([Math.min(x0,x1),Math.min(z0,z1),Math.max(x0,x1),Math.max(z0,z1)]);}
function buildColliders(){
  FP.rects=[];
  // apparatuur: de selectieboxen van alle velden en panelen
  Object.values(VIEWS).forEach(v=>{const d=D[v.id];if(!d||['bld','line','bb','es','kiosk','mstr'].includes(d.type))return;addRect(v.box.min.x,v.box.min.z,v.box.max.x,v.box.max.z);});
  // portaalkolommen en railsteunen
  for(const L of['L1','L2'])for(const sx of[-6,6]){const x=BAYS[L].x+sx;addRect(x-0.6,-36.6,x+0.6,-35.4);}
  for(const x of[-38,-20,0,18,44,70])for(const z of[-3.7,3.7])addRect(x-0.45,z-0.45,x+0.45,z+0.45);
  // gebouwmuren met deuropeningen aan de noordzijde
  BUILDINGS.forEach(b=>{const t=0.3;addRect(b.x0,b.z1-t,b.x1,b.z1);addRect(b.x0,b.z0,b.x0+t,b.z1);addRect(b.x1-t,b.z0,b.x1,b.z1);
    let x=b.x0;[...b.doors].sort((a,c)=>a-c).forEach(dx=>{addRect(x,b.z0,dx-1.05,b.z0+t);x=dx+1.05;});addRect(x,b.z0,b.x1,b.z0+t);});
  // inrichting binnen
  addRect(-19.4,54.8,-14.0,55.7);addRect(-17.1,46.7,-13.9,47.7);addRect(13.3,54.9,17.9,55.5);addRect(16.9,47.0,18.3,48.2);addRect(47.9,54.8,51.2,55.7);
  addRect(37.2,39.9,43.0,42.1);   // busje
  // hek met open poort, poortvleugels opzij
  const F=FENCE,t=0.25;addRect(F.x0,F.z0-t,F.x1,F.z0+t);addRect(F.x0-t,F.z0,F.x0+t,F.z1);addRect(F.x1-t,F.z0,F.x1+t,F.z1);
  addRect(F.x0,F.z1-t,F.gate[0],F.z1+t);addRect(F.gate[1],F.z1-t,F.x1,F.z1+t);addRect(F.gate[1],F.z1+0.2,F.gate[1]+10.2,F.z1+1.1);
  DISTRICT_RECTS.forEach(r=>addRect(...r));
}
function blockedAt(x,z){const r=0.3;if(x<-200||x>250||z<-110||z>440)return true;
  for(const q of FP.rects)if(x>q[0]-r&&x<q[2]+r&&z>q[1]-r&&z<q[3]+r)return true;return false;}
function floorAt(x,z){const r=ROOMS.find(r=>x>r.x0-0.05&&x<r.x1+0.05&&z>r.z0-0.05&&z<r.z1+0.05);return r?r.y0:0.02;}
const canvasEl=renderer.domElement;
function enterFP(){
  if(FP.on)return;FP.on=true;fly=null;controls.enabled=false;controls.autoRotate=false;
  const ins=camInside();
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  if(FP.last){FP.pos.set(FP.last.x,0,FP.last.z);FP.yaw=FP.last.yaw;FP.pitch=FP.last.pitch;}   // verder waar je was
  else if(ins&&!blockedAt(camera.position.x,camera.position.z)){FP.pos.set(camera.position.x,0,camera.position.z);FP.yaw=Math.atan2(-dir.x,-dir.z);FP.pitch=0;}
  else{FP.pos.set(25,0,62);FP.yaw=0;FP.pitch=0;}
  FP.y=null;
  camera.rotation.order='YXZ';camera.fov=70;camera.updateProjectionMatrix();
  document.body.classList.add('fp');hovBox.visible=false;$('#tooltip').style.display='none';
  canvasEl.requestPointerLock?.();if(!FP.hinted){FP.hinted=true;pushAlarm('Rondlopen: WASD lopen, Shift rennen, muis kijken, F schakelen, E paneel, V stoppen, Esc menu','info');}
}
function exitFP(){
  if(!FP.on)return;FP.on=false;FP.keys={};FP.last={x:FP.pos.x,z:FP.pos.z,yaw:FP.yaw,pitch:FP.pitch};unlockPointer();
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  camera.rotation.order='XYZ';camera.fov=42;camera.updateProjectionMatrix();
  controls.target.copy(camera.position).addScaledVector(dir,8);controls.enabled=true;controls.update();
  document.body.classList.remove('fp');FP.look=null;hovBox.visible=false;
}
function toggleFP(){FP.on?exitFP():enterFP();}
function pickCenter(){camera.updateMatrixWorld();ray.setFromCamera(new THREE.Vector2(0,0),camera);ray.far=REACH;const ins=camInside();
  const hits=ray.intersectObjects(pickables,false).filter(h=>h.object.userData.inside===ins);ray.far=Infinity;if(!hits.length)return null;
  const d0=hits[0].distance;return hits.filter(h=>h.distance<d0+2.5).sort((a,b)=>a.object.userData.vol-b.object.userData.vol)[0].object.userData.devId;}
function actionLabel(d){if(d.type==='cb'||d.type==='lvs')return d.state?'UIT schakelen':'IN schakelen';if(['ds','es','lbs'].includes(d.type))return d.state?'openen':'sluiten';return null;}
function updateFP(dt){
  if(!FP.on)return;
  const k=FP.keys,run=k.ShiftLeft||k.ShiftRight,sprint=k.KeyQ,sp=sprint?16:run?8:2.2;
  const fx=-Math.sin(FP.yaw),fz=-Math.cos(FP.yaw),rx=Math.cos(FP.yaw),rz=-Math.sin(FP.yaw);
  let mx=0,mz=0;
  if(k.KeyW||k.ArrowUp){mx+=fx;mz+=fz;}if(k.KeyS||k.ArrowDown){mx-=fx;mz-=fz;}
  if(k.KeyD||k.ArrowRight){mx+=rx;mz+=rz;}if(k.KeyA||k.ArrowLeft){mx-=rx;mz-=rz;}
  const len=Math.hypot(mx,mz),moving=len>0&&!!document.pointerLockElement;
  if(moving){mx=mx/len*sp*dt;mz=mz/len*sp*dt;
    if(!blockedAt(FP.pos.x+mx,FP.pos.z))FP.pos.x+=mx;if(!blockedAt(FP.pos.x,FP.pos.z+mz))FP.pos.z+=mz;
    FP.bob+=dt*sp*3.2;const ph=Math.floor(FP.bob/Math.PI);
    if(ph!==FP.stepPhase){FP.stepPhase=ph;const inside=camInside();
      if(inside)AudioSys.burst({type:'lowpass',f:500,q:0.7,gain:0.12,dur:0.07});else AudioSys.burst({f:1700+Math.random()*900,q:0.9,gain:0.1+(run?0.05:0),dur:0.13});}}
  const fl=floorAt(FP.pos.x,FP.pos.z);FP.y=FP.y==null?fl:lerp(FP.y,fl,Math.min(1,dt*10));
  // springen: eenvoudige zwaartekracht, landen met een plof
  if(FP.jh>0||FP.vy>0){FP.jh=(FP.jh||0)+FP.vy*dt;FP.vy-=13*dt;if(FP.jh<=0){FP.jh=0;FP.vy=0;AudioSys.burst({type:'lowpass',f:camInside()?400:900,q:0.7,gain:0.18,dur:0.12});}}
  camera.position.set(FP.pos.x,FP.y+1.68+(FP.jh||0)+(moving&&!FP.jh?Math.sin(FP.bob)*0.035:0),FP.pos.z);
  camera.rotation.set(FP.pitch,FP.yaw,0);
  // waar kijk je naar?
  const id=pickCenter();
  if(id!==FP.look){FP.look=id;const v=id&&VIEWS[id];hovBox.visible=!!v&&id!==SEL;if(v)hovBox.box.copy(v.box).expandByScalar(0.1);}
  const hint=$('#fpHint');
  if(id){const d=D[id],a=actionLabel(d);hint.innerHTML=`<b>${id}</b> · ${d.label}<br>${a?`<kbd>F</kbd> ${a} &nbsp; `:''}<kbd>E</kbd> paneel`;hint.style.display='block';}
  else hint.style.display='none';
}
addEventListener('mousemove',e=>{if(!FP.on||document.pointerLockElement!==canvasEl)return;
  FP.yaw-=e.movementX*0.0022;FP.pitch=clamp(FP.pitch-e.movementY*0.0022,-1.45,1.45);});
function unlockPointer(){if(document.pointerLockElement){FP.expectUnlock=true;document.exitPointerLock();}}
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvasEl;document.body.classList.toggle('fplocked',locked);
  if(!locked&&FP.on&&!FP.expectUnlock)openMenu();   // Esc tijdens rondlopen → pauzemenu
  FP.expectUnlock=false;});
canvasEl.addEventListener('click',()=>{if(!FP.on||menuOpen())return;if(document.pointerLockElement!==canvasEl){canvasEl.requestPointerLock?.();return;}if(FP.look)selectDevice(FP.look);});
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;
  if(e.code==='KeyV'){toggleFP();return;}
  // E: tijdens rondlopen cursor vrijgeven (paneel open als je naar iets kijkt), nog een keer E = verder lopen
  if(e.code==='KeyE'){e.preventDefault();
    if(FP.on){if(document.pointerLockElement===canvasEl){if(FP.look)selectDevice(FP.look);FP.keys={};unlockPointer();}else{if(SEL)selectDevice(null);if(!menuOpen())canvasEl.requestPointerLock?.();}}
    else if(SEL)selectDevice(null);
    return;}
  if(!FP.on)return;FP.keys[e.code]=true;
  if(e.code==='Space'){e.preventDefault();if(!FP.jh&&document.pointerLockElement===canvasEl){FP.vy=4.6;FP.jh=0.001;}return;}
  if(e.code==='KeyF'&&FP.look){const d=D[FP.look];if(actionLabel(d))operate(FP.look,d.state?0:1);}
});
addEventListener('keyup',e=>{FP.keys[e.code]=false;});
addEventListener('blur',()=>{FP.keys={};});
$('#fpBtn').addEventListener('click',toggleFP);
