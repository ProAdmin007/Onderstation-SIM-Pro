
// ============================================================ omgeving
const FENCE = {x0:-48,x1:92,z0:-44,z1:68,gate:[20,30]};
function buildGround(){
  groundQuad(-10000,-10000,10000,10000,-0.5,MAT.water,20);
  // kavels met sloten (Nederlands polderlandschap)
  const xs=[-170,210],zs=[-230,420];
  for(let x=170;x<3200;x+=rr(260,460)){xs.push(x+rr(260,460));xs.unshift(-x-rr(260,460));}
  for(let z=260;z<3200;z+=rr(170,320))zs.push(z+rr(170,320));
  for(let z=-230;z>-3200;z-=rr(170,320))zs.unshift(z-rr(170,320));
  xs.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);
  const types=[MAT.grass,MAT.grass,MAT.grassLight,MAT.grassDark,MAT.soil,MAT.stubble];
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
    const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1];
    const home=x0<0&&x1>0&&z0<0&&z1>0;
    groundQuad(x0+1.6,z0+1.6,x1-1.6,z1-1.6,0,home?MAT.grass:types[Math.floor(R()*types.length)],home?5:7);
  }
  const g=FENCE;
  groundQuad(g.x0,g.z0,g.x1,g.z1,0.02,MAT.gravel,3);
  // wegen
  groundQuad(22,38,28,3000,0.04,MAT.asphalt,6);
  groundQuad(-30,38,22,44,0.04,MAT.asphalt,6);
  groundQuad(28,38,86,44,0.04,MAT.asphalt,6);
  // kabelgoten
  for(const bx of[-10,30,60])for(let z=35.2;z<37.8;z+=0.62)box(0.9,0.1,0.58,MAT.concreteDark,staticRoot,bx,0.07,z);
  for(let x=-40;x<80;x+=0.62)if(Math.abs(x)>3&&Math.abs(x-40)>3)box(0.58,0.1,0.7,MAT.concreteDark,staticRoot,x,0.07,-3.9);
}

function buildFence(){
  const {x0,x1,z0,z1,gate}=FENCE,H=2.2,cx=22,cz=12;
  const segs=[[V3(x0,0,z0),V3(x1,0,z0)],[V3(x1,0,z0),V3(x1,0,z1)],[V3(x1,0,z1),V3(gate[1],0,z1)],[V3(gate[0],0,z1),V3(x0,0,z1)],[V3(x0,0,z1),V3(x0,0,z0)]];
  const base=toTex(C.chain);
  segs.forEach(([a,b])=>{
    const L=a.distanceTo(b),d=new THREE.Vector3().subVectors(b,a).normalize();
    let n=V3(-d.z,0,d.x);if(n.dot(V3(a.x-cx,0,a.z-cz))<0)n.negate();
    const t=base.clone();t.repeat.set(L/0.11,H/0.11);t.needsUpdate=true;
    const m=mat({map:t,alphaTest:0.45,side:THREE.DoubleSide,metalness:0.6,roughness:0.45,color:0xcfd4d6});
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(L,H),m);pl.position.copy(a).lerp(b,0.5);pl.position.y=H/2+0.05;pl.rotation.y=Math.atan2(-d.z,d.x);staticRoot.add(pl);
    const k=Math.ceil(L/3);
    for(let i=0;i<=k;i++){const p=a.clone().lerp(b,i/k);cyl(0.035,0.035,H+0.25,MAT.galv,staticRoot,p.x,(H+0.25)/2,p.z,8);
      rod(V3(p.x,H+0.2,p.z),V3(p.x+n.x*0.35,H+0.55,p.z+n.z*0.35),0.02,MAT.galv,staticRoot,5);}
    rod(V3(a.x,H,a.z),V3(b.x,H,b.z),0.022,MAT.galv,staticRoot,6);
    for(let w=1;w<=3;w++){const o=V3(n.x*0.11*w,H+0.22+0.11*w,n.z*0.11*w);rod(a.clone().add(o),b.clone().add(o),0.006,MAT.galv,staticRoot,4);}
    for(let s=12;s<L-4;s+=24){const p=a.clone().lerp(b,s/L);const sg=mesh(new THREE.PlaneGeometry(0.4,0.5),MAT.hazard,staticRoot,p.x+n.x*0.04,1.5,p.z+n.z*0.04);sg.rotation.y=Math.atan2(n.x,n.z);sg.castShadow=false;}
  });
  // poort
  for(const gx of gate){cyl(0.08,0.08,2.6,MAT.galv,staticRoot,gx,1.3,z1,12);}
  const gl=mat({map:(()=>{const t=base.clone();t.repeat.set(4.6/0.11,1.9/0.11);t.needsUpdate=true;return t;})(),alphaTest:0.45,side:THREE.DoubleSide,metalness:0.6,roughness:0.45});
  for(const s of[0,1]){const x=gate[1]+0.4+s*4.9;const f=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.9),gl);f.position.set(x+2.35,1.15,z1+0.5+s*0.3);staticRoot.add(f);
    for(const y of[0.2,2.1])rod(V3(x,y,z1+0.5+s*0.3),V3(x+4.7,y,z1+0.5+s*0.3),0.03,MAT.galv,staticRoot,6);
    for(const xx of[x,x+4.7])rod(V3(xx,0.2,z1+0.5+s*0.3),V3(xx,2.1,z1+0.5+s*0.3),0.03,MAT.galv,staticRoot,6);}
  // naambord
  const sb=toTex(textCanvas(['ONDERSTATION','ZUIDWOLDE 110/10 kV'],{w:512,h:256,bg:'#1d2b45',fg:'#ffffff',font:'bold 42px Arial'}));
  const sign=mesh(new THREE.PlaneGeometry(2.4,1.2),mat({map:sb,roughness:0.5}),staticRoot,17,1.9,z1+1.5);sign.castShadow=false;
  for(const x of[16,18])cyl(0.04,0.04,2.5,MAT.galv,staticRoot,x,1.25,z1+1.45,8);
}

const BUILDINGS=[{id:'MS',x0:-20,x1:20,z0:46,z1:56,doors:[-14,-6,6],label:'OS ZUIDWOLDE  ·  10 kV'},
  {id:'MS20',x0:46,x1:76,z0:46,z1:56,doors:[51,59,69],label:'OS ZUIDWOLDE  ·  20 kV'}];
function buildBuilding({id,x0,x1,z0,z1,doors,label}){
  const H=5.2,root=grp(),bt=C.brick,W=x1-x0,Dz=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
  const brick=(len)=>{const t=toTex(bt,len/1.76,H/1.5);return mat({map:t,bumpMap:toTex(bt,len/1.76,H/1.5,false),bumpScale:0.8,roughness:0.88});};
  const bl=brick(W),bs=brick(Dz);
  box(W,H,0.3,bl,root,cx,H/2,z0+0.15);box(W,H,0.3,bl,root,cx,H/2,z1-0.15);
  box(0.3,H,Dz,bs,root,x0+0.15,H/2,cz);box(0.3,H,Dz,bs,root,x1-0.15,H/2,cz);
  box(W+0.1,0.45,Dz+0.1,MAT.concreteDark,root,cx,0.22,cz);
  box(W+0.3,0.25,Dz+0.3,MAT.roof,root,cx,H+0.12,cz);
  for(const z of[z0-0.03,z1+0.03])box(W+0.5,0.3,0.12,MAT.trim,root,cx,H+0.22,z);
  for(const x of[x0-0.03,x1+0.03])box(0.12,0.3,Dz+0.5,MAT.trim,root,x,H+0.22,cz);
  box(2.2,1.2,1.4,MAT.cabinet,root,cx+W*0.2,H+0.85,cz);box(1.2,0.6,1.2,MAT.cabinet,root,cx-W*0.25,H+0.55,cz-1);
  doors.forEach(x=>{box(2.3,2.75,0.12,MAT.trim,root,x,1.4+0.03,z0-0.03);box(1.0,2.6,0.08,MAT.door,root,x-0.52,1.35,z0-0.08);box(1.0,2.6,0.08,MAT.door,root,x+0.52,1.35,z0-0.08);
    box(0.04,0.3,0.05,MAT.trim,root,x-0.12,1.3,z0-0.14);
    const hz=mesh(new THREE.PlaneGeometry(0.4,0.5),MAT.hazard,root,x,3.15,z0-0.1);hz.rotation.y=Math.PI;hz.castShadow=false;
    box(0.4,0.12,0.25,MAT.lamp,root,x,3.65,z0-0.15);});
  for(let x=x0+3;x<x1-2;x+=W/6){const lv=mesh(new THREE.PlaneGeometry(1.2,0.8),MAT.louvre,root,x,3.6,z1+0.01);lv.castShadow=false;}
  [x0+W*0.42,x0+W*0.82].forEach(x=>{const lv=mesh(new THREE.PlaneGeometry(1.2,0.8),MAT.louvre,root,x,4.1,z0-0.01);lv.rotation.y=Math.PI;lv.castShadow=false;});
  box(1.1,2.3,0.08,MAT.door,root,x1-6,1.6,z1+0.05);box(2,0.1,1.2,MAT.trim,root,x1-6,3.0,z1+0.6);
  const nb=toTex(textCanvas(label,{w:1024,h:128,bg:'#1d2b45',fg:'#ffffff',font:'bold 64px Arial',border:false}));
  const sg=mesh(new THREE.PlaneGeometry(6,0.75),mat({map:nb,roughness:0.5}),root,doors[1]+3.6,4.4,z0-0.02);sg.rotation.y=Math.PI;sg.castShadow=false;
  regView(id,root,null,{labelPos:V3(cx,H+1.6,cz)});
}

const crownGeos=[0,1,2].map(i=>{let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
  const p=g.attributes.position;for(let k=0;k<p.count;k++){const v=V3(p.getX(k),p.getY(k),p.getZ(k));const n=1+Math.sin(v.x*3.1+i)*Math.cos(v.y*2.7+i)*Math.sin(v.z*3.7+i*2)*0.22;v.multiplyScalar(n);p.setXYZ(k,v.x,v.y,v.z);}
  g.computeVertexNormals();g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(p.count*2),2));return g;});
function tree(x,z,s=1,cast=false){const h=rr(4,6)*s;const t=cyl(0.18*s,0.28*s,h,MAT.bark,staticRoot,x,h/2,z,7);t.castShadow=cast;
  const n=3+Math.floor(R()*3),lm=MAT.leaf[Math.floor(R()*3)];
  for(let i=0;i<n;i++){const r=rr(1.8,3.0)*s;const c=mesh(crownGeos[i%3],lm,staticRoot,x+rr(-1.5,1.5)*s,h+rr(-0.5,2.5)*s,z+rr(-1.5,1.5)*s);c.scale.set(r,r*rr(0.8,1.1),r);c.rotation.y=R()*6;c.castShadow=cast;}}
function poplar(x,z){const h=rr(14,18);cyl(0.2,0.3,h*0.5,MAT.bark,staticRoot,x,h*0.25,z,7).castShadow=false;const c=mesh(crownGeos[Math.floor(R()*3)],MAT.leaf[0],staticRoot,x,h*0.58,z);c.scale.set(rr(1.3,1.8),h*0.42,rr(1.3,1.8));c.castShadow=Math.abs(x)<200&&Math.abs(z)<200;}
function buildTrees(){
  for(let z=78;z<1200;z+=rr(9,13)){if(Math.abs(z-101)<7||Math.abs(z-239)<7||Math.abs(z-273)<7||Math.abs(z-387)<7)continue;tree(17+rr(-0.5,0.5),z,rr(0.9,1.1),z<160);tree(33+rr(-0.5,0.5),z,rr(0.9,1.1),z<160);}
  for(let z=-70;z<110;z+=rr(8,11)){poplar(-64+rr(-1,1),z);poplar(108+rr(-1,1),z);}
  for(let x=-64;x<110;x+=rr(8,11))poplar(x,-62+rr(-1,1));
  for(let k=0;k<26;k++){const cx=rr(-2200,2200),cz=rr(-2200,2200);if(Math.abs(cx)<350&&cz>-400&&cz<500)continue;const n=4+Math.floor(R()*10);for(let i=0;i<n;i++)tree(cx+rr(-30,30),cz+rr(-30,30),rr(1.2,1.8));}
  for(let x=-2000;x<2000;x+=rr(10,16))tree(x,-1300+rr(-3,3),1.5);
}
function farm(x,z,ry){const g=grp(x,z);g.rotation.y=ry;
  box(9,3.2,14,MAT.white,g,0,1.6,0);
  const roof=new THREE.Shape();roof.moveTo(-5.2,0);roof.lineTo(0,4.5);roof.lineTo(5.2,0);roof.closePath();
  const rg=new THREE.ExtrudeGeometry(roof,{depth:14.6,bevelEnabled:false});rg.translate(0,0,-7.3);mesh(rg,MAT.roofTile,g,0,3.2,0);
  box(16,5,24,MAT.door,g,16,2.5,4);const r2=new THREE.Shape();r2.moveTo(-8.6,0);r2.lineTo(0,3.5);r2.lineTo(8.6,0);r2.closePath();const rg2=new THREE.ExtrudeGeometry(r2,{depth:24.4,bevelEnabled:false});rg2.translate(0,0,-12.2);mesh(rg2,MAT.roof,g,16,5,4);
  for(let i=0;i<5;i++)tree(x+rr(-16,-8),z+rr(-14,14),1.3);}
const ROTORS=[],BEACONS=[];
function turbine(x,z,ry){const g=grp(x,z);g.rotation.y=ry;
  mesh(new THREE.CylinderGeometry(1.4,2.4,95,20),MAT.turbine,g,0,47.5,0).castShadow=false;
  box(3.5,3.6,11,MAT.turbine,g,0,96.5,-1.5).castShadow=false;
  const rot=new THREE.Group();rot.position.set(0,96.5,4.6);rot.userData.dyn=true;g.add(rot);
  mesh(new THREE.SphereGeometry(1.8,16,10),MAT.turbine,rot,0,0,0.4).scale.z=1.5;
  for(let b=0;b<3;b++){const bl=new THREE.Group();bl.rotation.z=b*Math.PI*2/3;rot.add(bl);const geo=new THREE.BoxGeometry(2.6,56,0.5);geo.translate(0,29,0);
    const p=geo.attributes.position;for(let k=0;k<p.count;k++){const y=p.getY(k);const s=1-0.75*(y/57);p.setX(k,p.getX(k)*s);p.setZ(k,p.getZ(k)*s);}geo.computeVertexNormals();mesh(geo,MAT.turbine,bl,0,0,0).castShadow=false;}
  rot.rotation.z=R()*6;ROTORS.push({r:rot,s:rr(0.9,1.2)});
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff2a1a,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));sp.position.set(0,99,-1.5);sp.scale.setScalar(9);g.add(sp);BEACONS.push(sp);}
function van(x,z,ry){const g=grp(x,z);g.rotation.y=ry;const vw=mat({color:0xf2f2ef,roughness:0.35,metalness:0.2});
  box(2.0,2.1,4.4,vw,g,0,1.45,-0.4);box(1.98,1.15,1.0,vw,g,0,0.95,2.3);
  const ws=box(1.85,0.95,0.06,MAT.glassDark,g,0,1.95,1.9);ws.rotation.x=-0.35;
  for(const s of[-1,1])box(0.04,0.6,0.9,MAT.glassDark,g,s*1.0,2.05,1.25);
  box(2.02,0.22,4.42,MAT.orange,g,0,1.0,-0.4);box(0.5,0.12,0.2,MAT.orange,g,0,2.56,1.2);
  for(const sx of[-0.92,0.92])for(const sz of[-1.6,1.9]){const w=cyl(0.36,0.36,0.26,MAT.black,g,sx,0.36,sz,16);w.rotation.z=Math.PI/2;}}

const SPOTS=[];
function buildLights(){
  [[-45,-41],[89,-41],[-45,65],[89,65],[22,-41]].forEach(([x,z])=>{cyl(0.09,0.14,12,MAT.galv,staticRoot,x,6,z,10);box(0.6,0.6,0.6,MAT.concrete,staticRoot,x,0.2,z);
    const dx=-Math.sign(x),dz=z<0?1:-1;const hd=box(0.6,0.15,0.4,MAT.lamp,staticRoot,x+dx*0.35,12,z+dz*0.35);hd.rotation.y=Math.atan2(dx,dz);
    const s=new THREE.SpotLight(0xffe2b8,0,140,0.85,0.7,1.6);s.position.set(x+dx*0.4,11.8,z+dz*0.4);s.target.position.set(x+dx*40,0,z+dz*40);scene.add(s,s.target);SPOTS.push(s);});
  for(const x of[-44,88]){cyl(0.08,0.3,24,MAT.galv,staticRoot,x,12,-8,10);box(1,0.6,1,MAT.concrete,staticRoot,x,0.15,-8);}
}

const glowTex=(()=>{const c=cnv(128),g=c.getContext('2d');const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.15,'rgba(210,228,255,0.9)');gr.addColorStop(0.45,'rgba(120,160,255,0.25)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const smokeTex=(()=>{const c=cnv(128),g=c.getContext('2d');for(let i=0;i<30;i++){const x=64+rr(-25,25),y=64+rr(-25,25),r=rr(15,40);const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,0.18)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);}const t=new THREE.CanvasTexture(c);return t;})();

// ============================================================ hemel, zon, licht
const sky=new Sky();sky.scale.setScalar(4500);sky.userData.noBake=true;scene.add(sky);
const su=sky.material.uniforms;su.turbidity.value=5.5;su.rayleigh.value=1.5;su.mieCoefficient.value=0.004;su.mieDirectionalG.value=0.82;
const envScene=new THREE.Scene();const envSky=new Sky();envSky.material=sky.material;envSky.scale.setScalar(60);envScene.add(envSky);
const envGroundMat=new THREE.MeshBasicMaterial({color:0x4f5446});const eg=new THREE.Mesh(new THREE.CircleGeometry(40,24),envGroundMat);eg.rotation.x=-Math.PI/2;eg.position.y=-2;envScene.add(eg);
const pmrem=new THREE.PMREMGenerator(renderer);let envRT=null,lastEnvElev=-999;
function updateEnv(){const rt=pmrem.fromScene(envScene,0.02,0.1,200);if(envRT)envRT.dispose();envRT=rt;scene.environment=rt.texture;}
const sun=new THREE.DirectionalLight(0xffffff,3);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera,{left:-100,right:100,top:95,bottom:-95,near:10,far:540});sun.shadow.bias=-0.0003;sun.shadow.normalBias=0.03;
sun.target.position.set(22,0,10);scene.add(sun,sun.target);
const hemi=new THREE.HemisphereLight(0xbfd4ff,0x4a4436,0.3);scene.add(hemi);
const flashLight=new THREE.DirectionalLight(0xdfe8ff,0);flashLight.position.set(0,300,-400);scene.add(flashLight);
const arcLight=new THREE.PointLight(0xcfe0ff,0,0,2);scene.add(arcLight);
const stars=(()=>{const n=1800,p=new Float32Array(n*3);for(let i=0;i<n;i++){const th=R()*Math.PI*2,ph=Math.acos(rr(0.05,1));const r=2000;p[i*3]=r*Math.sin(ph)*Math.cos(th);p[i*3+1]=r*Math.cos(ph);p[i*3+2]=r*Math.sin(ph)*Math.sin(th);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const s=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(s);return s;})();
const fogDay=new THREE.Color(0xc3cfd9),fogDusk=new THREE.Color(0xc9a184),fogNight=new THREE.Color(0x0b1119),tmpC=new THREE.Color();
let NIGHT=0;
function sunAngles(h){const S=SEASON,rise=S.rise,set=S.set,len=set-rise;let el;
  if(h>=rise&&h<=set)el=S.maxEl*Math.sin(Math.PI*(h-rise)/len);else{const d=h<rise?rise-h:h-set;el=-Math.min(45,d*13);}
  const az=S.az[0]+(h-rise)/len*(S.az[1]-S.az[0]);return {el,az};}
function updateSky(h){
  const {el,az}=sunAngles(h);const e=THREE.MathUtils.degToRad(el),a=THREE.MathUtils.degToRad(az);
  const dir=V3(Math.sin(a)*Math.cos(e),Math.sin(e),-Math.cos(a)*Math.cos(e));
  su.sunPosition.value.copy(dir);
  const day=smooth(-6,8,el);NIGHT=1-smooth(-7,2,el);
  if(el>-1.5){sun.position.copy(sun.target.position).addScaledVector(dir,260);sun.intensity=3.0*smooth(-1,14,el);
    sun.color.setRGB(1,lerp(0.62,0.96,smooth(0,25,el)),lerp(0.4,0.9,smooth(0,25,el)));}
  else{sun.position.copy(sun.target.position).add(V3(-90,200,80));sun.intensity=0.12*NIGHT;sun.color.setHex(0x9db4ff);}
  hemi.intensity=0.06+0.3*day;scene.environmentIntensity=0.1+0.9*day;
  renderer.toneMappingExposure=lerp(1.05,0.6,day);
  tmpC.copy(fogNight).lerp(fogDusk,smooth(-7,1,el)).lerp(fogDay,smooth(2,16,el));scene.fog.color.copy(tmpC);
  envGroundMat.color.setRGB(0.3*day+0.01,0.32*day+0.012,0.27*day+0.015);
  stars.material.opacity=NIGHT;
  SPOTS.forEach(s=>s.intensity=NIGHT>0.35?900:0);MAT.lamp.emissiveIntensity=NIGHT>0.35?6:0;
  // weer: bewolking dempt de zon, neerslag en mist maken het zicht korter
  const W=WX.cur,cl=W.cloud;
  sun.intensity*=1-0.85*cl;hemi.intensity*=1-0.2*cl;scene.environmentIntensity*=1-0.5*cl;
  scene.fog.density=0.0008+0.0016*cl*(0.3+W.rain+W.snow)+0.006*W.fog;scene.fog.color.multiplyScalar(1-0.35*cl*(1-W.fog));
  su.turbidity.value=5.5+14.5*cl;su.rayleigh.value=1.5-0.9*cl;su.mieCoefficient.value=0.004+0.026*cl;
  applySnowCover();
  if(Math.abs(el-lastEnvElev)>0.6||Math.abs(cl-lastEnvCloud)>0.08){lastEnvElev=el;lastEnvCloud=cl;updateEnv();}
}
