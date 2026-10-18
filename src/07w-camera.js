
// ============================================================ muisbesturing in het overzicht: als een 3D-kaart
// kaart (standaard): links slepen = schuiven over de grond, rechts slepen of Shift + links = draaien en kantelen
// klassiek: links slepen = draaien, rechts slepen = schuiven. Altijd: scrollen zoomt naar de muis, dubbelklik vliegt erheen.
let MOUSE_MODE='kaart';try{MOUSE_MODE=localStorage.getItem('osz-mouse')||'kaart';}catch(e){}
function applyMouse(){const k=MOUSE_MODE==='kaart';
  controls.mouseButtons={LEFT:k?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:k?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN};
  controls.touches={ONE:k?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};}
function setMouseMode(m){MOUSE_MODE=m==='klassiek'?'klassiek':'kaart';try{localStorage.setItem('osz-mouse',MOUSE_MODE);}catch(e){}applyMouse();}
controls.zoomToCursor=true;           // zoomen naar het punt onder de muis
controls.screenSpacePanning=false;    // schuiven over de grond, niet omhoog of de grond in
controls.maxDistance=1400;controls.zoomSpeed=1.15;controls.rotateSpeed=0.55;
applyMouse();
// kijkpunt op de grond en binnen de wereld houden; camera nooit onder de grond
const CAM_BOUNDS={x0:-1300,x1:1300,z0:-1600,z1:1300};
function clampCamera(){if(FP.on||camInside())return;const t=controls.target,c=camera.position;
  const dx=clamp(t.x,CAM_BOUNDS.x0,CAM_BOUNDS.x1)-t.x,dz=clamp(t.z,CAM_BOUNDS.z0,CAM_BOUNDS.z1)-t.z;if(dx||dz){t.x+=dx;t.z+=dz;c.x+=dx;c.z+=dz;}
  if(t.y<0||t.y>30){const dy=clamp(t.y,0,30)-t.y;t.y+=dy;c.y+=dy;}if(c.y<1.6)c.y=1.6;}
// toetsenbord: WASD of pijltjes schuiven het beeld (sneller als je verder weg bent)
const OVK={};
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.ctrlKey||e.metaKey||FP.on)return;OVK[e.code]=true;});
addEventListener('keyup',e=>{OVK[e.code]=false;});
addEventListener('blur',()=>{for(const k in OVK)OVK[k]=false;});
const _f=new THREE.Vector3(),_r=new THREE.Vector3(),_m=new THREE.Vector3();
function cameraKeys(dt){if(FP.on||fly||!$('#intro').classList.contains('hidden')||camInside())return;
  const fwd=(OVK.KeyW||OVK.ArrowUp?1:0)-(OVK.KeyS||OVK.ArrowDown?1:0),side=(OVK.KeyD||OVK.ArrowRight?1:0)-(OVK.KeyA||OVK.ArrowLeft?1:0);if(!fwd&&!side)return;
  camera.getWorldDirection(_f);_f.y=0;if(_f.lengthSq()<1e-6)return;_f.normalize();_r.crossVectors(_f,camera.up).normalize();
  const sp=Math.max(12,camera.position.distanceTo(controls.target)*0.9)*Math.min(dt,0.1);_m.copy(_f).multiplyScalar(fwd*sp).addScaledVector(_r,side*sp);
  controls.target.add(_m);camera.position.add(_m);}
// dubbelklik: naar dat punt vliegen en inzoomen
const _ray=new THREE.Raycaster(),_gp=new THREE.Plane(new THREE.Vector3(0,1,0),0),_hit=new THREE.Vector3();
renderer.domElement.addEventListener('dblclick',e=>{if(FP.on||camInside())return;const r=renderer.domElement.getBoundingClientRect();
  _ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
  const hits=_ray.intersectObjects(scene.children.filter(o=>o!==camera),true).filter(h=>h.object.visible&&!h.object.isSprite&&h.object.material?.visible!==false&&!h.object.material?.transparent),p=hits[0]?.point||_ray.ray.intersectPlane(_gp,_hit);
  if(!p)return;const tgt=p.clone();tgt.y=Math.max(0,Math.min(tgt.y,20));const off=camera.position.clone().sub(controls.target).multiplyScalar(0.55);
  if(off.length()<12)off.setLength(12);flyTo(tgt.clone().add(off),tgt,0.8);});
// eenmalige uitleg bij het eerste spel
function mouseHint(){let seen=false;try{seen=!!localStorage.getItem('osz-mousehint');localStorage.setItem('osz-mousehint','1');}catch(e){}
  if(!seen&&!LITE)pushAlarm(MOUSE_MODE==='kaart'?'Tip: links slepen schuift, rechts slepen draait, scrollen zoomt naar de muis en dubbelklik vliegt erheen. WASD/pijltjes schuiven ook. Andere bediening? Instellingen (I) → Muis':'Tip: links slepen draait, rechts slepen schuift, scrollen zoomt naar de muis, dubbelklik vliegt erheen','info');}
