import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ============================================================ basis
const params = new URLSearchParams(location.search);
const $ = s => document.querySelector(s);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const R = mulberry32(20261003);            // vaste seed voor het landschap
const rr = (a,b) => a + R()*(b-a);
const rnd = (a,b) => a + Math.random()*(b-a); // gameplay
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const smooth = (a,b,x) => { const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const V3 = (x,y,z) => new THREE.Vector3(x,y,z);

// ============================================================ renderer / scene
const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
$('#scene').appendChild(renderer.domElement);
const MAXANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xb9c6d2, 0.0008);
const camera = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, 0.3, 6000);
camera.position.set(68,40,96);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,3,6);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI*0.49; controls.minDistance = 4; controls.maxDistance = 450;
controls.update();

// ============================================================ procedurele texturen
function cnv(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function toTex(c,rx=1,ry=1,srgb=true){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=MAXANISO;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;}
function wrapEach(s,x,y,r,draw){for(const dx of[-s,0,s]){const X=x+dx;if(X<-r||X>s+r)continue;for(const dy of[-s,0,s]){const Y=y+dy;if(Y<-r||Y>s+r)continue;draw(X,Y);}}}
function noiseFill(g,s,amt){const id=g.getImageData(0,0,s,s),d=id.data;for(let i=0;i<d.length;i+=4){const n=(R()-0.5)*amt;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}g.putImageData(id,0,0);}
function blotches(g,s,n,cols,rmin,rmax,blur){g.filter=`blur(${blur}px)`;for(let i=0;i<n;i++){g.fillStyle=cols[Math.floor(R()*cols.length)];const x=R()*s,y=R()*s,r=rr(rmin,rmax);wrapEach(s,x,y,r+blur*2,(X,Y)=>{g.beginPath();g.arc(X,Y,r,0,7);g.fill();});}g.filter='none';}

function gravelCanvas(){const s=512,c=cnv(s),g=c.getContext('2d');g.fillStyle='#6d6860';g.fillRect(0,0,s,s);
  for(let i=0;i<7500;i++){const x=R()*s,y=R()*s,r=1.4+R()*3.3,ro=R()*Math.PI,el=0.55+R()*0.45;const v=100+R()*100|0,tn=(R()*18-9)|0;
    wrapEach(s,x,y,r+2,(X,Y)=>{g.fillStyle='rgba(22,20,18,0.45)';g.beginPath();g.ellipse(X+1,Y+1.3,r,r*el,ro,0,7);g.fill();
      g.fillStyle=`rgb(${v+tn},${v},${v-tn-6})`;g.beginPath();g.ellipse(X,Y,r,r*el,ro,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,0.13)';g.beginPath();g.ellipse(X-r*0.3,Y-r*0.3,r*0.45,r*0.3*el,ro,0,7);g.fill();});}
  return c;}
function grassCanvas(){const s=512,c=cnv(s),g=c.getContext('2d');g.fillStyle='#4b6430';g.fillRect(0,0,s,s);
  blotches(g,s,50,['rgba(105,125,55,0.35)','rgba(40,62,25,0.35)','rgba(120,120,60,0.2)'],20,70,14);
  for(let i=0;i<15000;i++){const x=R()*s,y=R()*s,l=3+R()*7,a=-Math.PI/2+(R()-0.5)*1.0;g.strokeStyle=`hsl(${78+R()*35},${35+R()*20}%,${20+R()*26}%)`;g.lineWidth=1+R()*0.8;
    wrapEach(s,x,y,l,(X,Y)=>{g.beginPath();g.moveTo(X,Y);g.lineTo(X+Math.cos(a)*l,Y+Math.sin(a)*l);g.stroke();});}
  return c;}
function soilCanvas(){const s=512,c=cnv(s),g=c.getContext('2d');g.fillStyle='#5a4532';g.fillRect(0,0,s,s);
  blotches(g,s,40,['rgba(90,70,50,0.4)','rgba(50,38,28,0.4)'],20,60,12);
  for(let y=0;y<s;y+=16){g.fillStyle='rgba(30,22,15,0.45)';g.fillRect(0,y,s,5);g.fillStyle='rgba(140,110,80,0.18)';g.fillRect(0,y+7,s,3);}
  noiseFill(g,s,30);return c;}
function concreteCanvas(base='#a9a79f'){const s=512,c=cnv(s),g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,s,s);
  blotches(g,s,70,['rgba(60,58,55,0.08)','rgba(210,208,200,0.1)','rgba(90,85,70,0.06)'],10,50,10);
  noiseFill(g,s,24);
  for(let i=0;i<500;i++){g.fillStyle=`rgba(40,40,40,${R()*0.35})`;g.fillRect(R()*s,R()*s,1.5,1.5);}
  return c;}
function asphaltCanvas(){const s=512,c=cnv(s),g=c.getContext('2d');g.fillStyle='#3b3c3e';g.fillRect(0,0,s,s);
  blotches(g,s,40,['rgba(20,20,22,0.25)','rgba(90,90,90,0.15)'],15,60,12);
  noiseFill(g,s,40);
  for(let i=0;i<2500;i++){g.fillStyle=`rgba(180,180,175,${R()*0.25})`;g.fillRect(R()*s,R()*s,1.4,1.4);}
  return c;}
function brickCanvas(){const s=512,c=cnv(s),g=c.getContext('2d');g.fillStyle='#aaa395';g.fillRect(0,0,s,s);
  const rows=24,bh=s/rows,bw=64;
  for(let r=0;r<rows;r++){const off=(r%2)*bw/2;for(let k=-1;k<9;k++){const x=k*bw+off,y=r*bh;
    g.fillStyle=`hsl(${8+R()*14},${38+R()*22}%,${22+R()*14}%)`;g.fillRect(x+2.5,y+2.5,bw-5,bh-5);
    for(let j=0;j<14;j++){g.fillStyle=`rgba(0,0,0,${R()*0.18})`;g.fillRect(x+3+R()*(bw-8),y+3+R()*(bh-7),2,2);}}}
  noiseFill(g,s,14);return c;}
function chainCanvas(){const s=128,c=cnv(s),g=c.getContext('2d');g.strokeStyle='#c4cacd';g.lineWidth=5;g.lineCap='round';
  for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(k*64,0);g.lineTo(k*64+s,s);g.stroke();g.beginPath();g.moveTo(k*64+s,0);g.lineTo(k*64,s);g.stroke();}
  return c;}
function louvreCanvas(){const c=cnv(128),g=c.getContext('2d');g.fillStyle='#5b6166';g.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=10){g.fillStyle='#2b2f33';g.fillRect(4,y+5,120,4);g.fillStyle='#8c939a';g.fillRect(4,y+3,120,2);}return c;}
function hazardCanvas(){const c=cnv(256,320),g=c.getContext('2d');g.fillStyle='#f5c400';g.fillRect(0,0,256,320);g.strokeStyle='#111';g.lineWidth=10;g.strokeRect(5,5,246,310);
  g.beginPath();g.moveTo(128,30);g.lineTo(225,195);g.lineTo(31,195);g.closePath();g.lineWidth=12;g.lineJoin='round';g.stroke();
  g.fillStyle='#111';g.beginPath();g.moveTo(140,70);g.lineTo(108,135);g.lineTo(132,135);g.lineTo(112,182);g.lineTo(152,118);g.lineTo(128,118);g.lineTo(150,70);g.closePath();g.fill();
  g.font='bold 30px Arial';g.textAlign='center';g.fillText('LEVENSGEVAAR',128,250);g.font='bold 24px Arial';g.fillText('HOOGSPANNING',128,288);return c;}
function textCanvas(lines,{w=256,h=128,bg='#f3f3ee',fg='#111',border=true,font='bold 64px Arial'}={}){const c=cnv(w,h),g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,w,h);
  if(border){g.strokeStyle=fg;g.lineWidth=Math.max(4,h*0.045);g.strokeRect(h*0.04,h*0.04,w-h*0.08,h-h*0.08);}
  g.fillStyle=fg;g.font=font;g.textAlign='center';g.textBaseline='middle';const L=[].concat(lines);
  L.forEach((t,i)=>g.fillText(t,w/2,h*(i+1)/(L.length+1)+h*0.02));return c;}

const C = {gravel:gravelCanvas(),grass:grassCanvas(),soil:soilCanvas(),conc:concreteCanvas(),asph:asphaltCanvas(),brick:brickCanvas(),chain:chainCanvas(),louvre:louvreCanvas(),hazard:hazardCanvas()};

// ============================================================ materialen
const mat = o => new THREE.MeshStandardMaterial(o);
const MAT = {
  galv: mat({color:0xa3a9ad,metalness:0.8,roughness:0.4}),
  galvDark: mat({color:0x7d8387,metalness:0.75,roughness:0.5}),
  lattice: mat({color:0x9ba2a6,metalness:0.7,roughness:0.52}),
  alu: mat({color:0xd0d3d5,metalness:0.95,roughness:0.28}),
  copper: mat({color:0xb87333,metalness:1,roughness:0.35}),
  porcelain: new THREE.MeshPhysicalMaterial({color:0x5e2c18,roughness:0.2,clearcoat:0.7,clearcoatRoughness:0.12}),
  silicone: mat({color:0x8e959b,roughness:0.62}),
  glass: new THREE.MeshPhysicalMaterial({color:0x4d7a6a,roughness:0.06,metalness:0.1,clearcoat:1}),
  trafo: mat({color:0x737c74,metalness:0.35,roughness:0.55}),
  trafoDark: mat({color:0x5a625c,metalness:0.4,roughness:0.6}),
  fanRing: mat({color:0x5a625c,metalness:0.4,roughness:0.6,side:THREE.DoubleSide}),
  cabinet: mat({color:0xbfc2bb,metalness:0.2,roughness:0.5}),
  conductor: mat({color:0xa6abae,metalness:0.85,roughness:0.4}),
  lineCond: mat({color:0x8d9295,metalness:0.8,roughness:0.5}),
  cable: mat({color:0x151617,roughness:0.7}),
  black: mat({color:0x1a1c1e,roughness:0.6}),
  white: mat({color:0xe9e9e4,roughness:0.55}),
  turbine: mat({color:0xeef0f0,roughness:0.45}),
  door: mat({color:0x3d454c,metalness:0.4,roughness:0.5}),
  roof: mat({color:0x2d2f31,roughness:0.9}),
  trim: mat({color:0x8f969b,metalness:0.7,roughness:0.4}),
  glassDark: mat({color:0x1c262e,metalness:0.6,roughness:0.08}),
  orange: mat({color:0xe8701a,roughness:0.5}),
  red: mat({color:0x8c2a1e,roughness:0.75}),
  roofTile: mat({color:0x5b2b20,roughness:0.85}),
  bark: mat({color:0x4a3b2c,roughness:1}),
  leaf: [0x3d5a26,0x4a6a2c,0x34502a].map(c=>mat({color:c,roughness:0.95})),
  water: mat({color:0x2a3534,roughness:0.06,metalness:0.1}),
  concrete: mat({map:toTex(C.conc),roughness:0.92}),
  concreteDark: mat({map:toTex(C.conc),color:0x9a9890,roughness:0.95}),
  gravel: mat({map:toTex(C.gravel),bumpMap:toTex(C.gravel,1,1,false),bumpScale:1.2,roughness:0.95}),
  gravelDark: mat({map:toTex(C.gravel),color:0x8e8a84,roughness:0.95}),
  asphalt: mat({map:toTex(C.asph),roughness:0.88}),
  grass: mat({map:toTex(C.grass),roughness:1}),
  grassLight: mat({map:toTex(C.grass),color:0xd6e3a8,roughness:1}),
  grassDark: mat({map:toTex(C.grass),color:0xa9bd96,roughness:1}),
  stubble: mat({map:toTex(C.grass),color:0xf0dd9a,roughness:1}),
  soil: mat({map:toTex(C.soil),roughness:1}),
  louvre: mat({map:toTex(C.louvre),metalness:0.5,roughness:0.5}),
  hazard: mat({map:toTex(C.hazard),roughness:0.5}),
  lamp: mat({color:0x2a2c2e,emissive:0xffe2b0,emissiveIntensity:0}),
};
MAT.hazard.map.wrapS = MAT.hazard.map.wrapT = THREE.ClampToEdgeWrapping;

// ============================================================ geometrie-helpers
const staticRoot = new THREE.Group(); scene.add(staticRoot);
function grp(x=0,z=0,y=0){const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);return g;}
function mesh(geo,m,p,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
const box = (w,h,d,m,p,x,y,z) => mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
const cyl = (rt,rb,h,m,p,x,y,z,seg=20) => mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m,p,x,y,z);
function rod(a,b,r,m,p,seg=8){const d=new THREE.Vector3().subVectors(b,a);const len=d.length();const o=mesh(new THREE.CylinderGeometry(r,r,len,seg,1),m,p);o.position.copy(a).addScaledVector(d,0.5);o.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize());return o;}
function groundQuad(x0,z0,x1,z1,y,m,s=4,p=staticRoot){const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([x0,y,z0,x1,y,z0,x1,y,z1,x0,y,z1],3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0],3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute([x0/s,-z0/s,x1/s,-z0/s,x1/s,-z1/s,x0/s,-z1/s],2));
  g.setIndex([0,2,1,0,3,2]);const o=new THREE.Mesh(g,m);o.receiveShadow=true;p.add(o);return o;}

const insCache = new Map();
function insGeo(h,cr,sr,n){const key=[h,cr,sr,n].join();if(insCache.has(key))return insCache.get(key);
  const P=[];const v=(x,y)=>P.push(new THREE.Vector2(x,y));
  v(0.001,0);v(cr*1.5,0);v(cr*1.5,h*0.05);v(cr,h*0.06);
  const y0=h*0.07,y1=h*0.93,p=(y1-y0)/n;
  for(let i=0;i<n;i++){const y=y0+i*p;const r=(i%2)?cr+(sr-cr)*0.72:sr;v(cr,y+p*0.3);v(r,y+p*0.05);v(r,y+p*0.14);v(cr,y+p*0.55);}
  v(cr,h*0.94);v(cr*1.5,h*0.95);v(cr*1.5,h);v(0.001,h);
  const g=new THREE.LatheGeometry(P,20);insCache.set(key,g);return g;}
function insulator(p,h,cr,sr,n,m,y=0,x=0,z=0){mesh(insGeo(h,cr,sr,n),m,p,x,y,z);cyl(cr*1.65,cr*1.65,0.09,MAT.galv,p,x,y+0.045,z);cyl(cr*1.65,cr*1.65,0.09,MAT.galv,p,x,y+h-0.045,z);}

const hCache = new Map();
function hBeamGeo(h){if(hCache.has(h))return hCache.get(h);const w=0.13,t=0.018,tw=0.012;const s=new THREE.Shape();
  s.moveTo(-w,-w);s.lineTo(w,-w);s.lineTo(w,-w+t);s.lineTo(tw/2,-w+t);s.lineTo(tw/2,w-t);s.lineTo(w,w-t);s.lineTo(w,w);s.lineTo(-w,w);s.lineTo(-w,w-t);s.lineTo(-tw/2,w-t);s.lineTo(-tw/2,-w+t);s.lineTo(-w,-w+t);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:1});g.rotateX(-Math.PI/2);hCache.set(h,g);return g;}
function support(p,x,z,h){mesh(hBeamGeo(h-0.45),MAT.galv,p,x,0.45,z);box(0.85,0.6,0.85,MAT.concrete,p,x,0.15,z);box(0.42,0.03,0.42,MAT.galv,p,x,0.465,z);box(0.34,0.03,0.34,MAT.galv,p,x,h-0.015,z);}

const plateCache = new Map();
function plateMat(text){if(plateCache.has(text))return plateCache.get(text);const t=toTex(textCanvas(text,{font:`bold ${text.length>5?50:62}px Arial`}));t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;const m=mat({map:t,roughness:0.5});plateCache.set(text,m);return m;}
function plate(text,p,x,y,z,ry=0,w=0.42){const o=mesh(new THREE.PlaneGeometry(w,w/2),plateMat(text),p,x,y,z);o.rotation.y=ry;o.castShadow=false;return o;}

function wire(a,b,sag,r=0.03,m=MAT.conductor,seg=16){const pts=[];for(let i=0;i<=seg;i++){const t=i/seg;const q=a.clone().lerp(b,t);q.y-=sag*4*t*(1-t);pts.push(q);}
  const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),seg*2,r,6,false);const o=new THREE.Mesh(g,m);o.castShadow=true;staticRoot.add(o);return o;}

const discGeo = new THREE.LatheGeometry([[0.001,0.075],[0.045,0.075],[0.055,0.045],[0.135,-0.005],[0.135,-0.02],[0.05,0.0],[0.035,-0.05],[0.001,-0.05]].map(([x,y])=>new THREE.Vector2(x,y)),16);
function insString(a,b,n,p=staticRoot){const d=new THREE.Vector3().subVectors(b,a);const q=new THREE.Quaternion().setFromUnitVectors(V3(0,1,0),d.clone().normalize());
  for(let i=0;i<n;i++){const o=mesh(discGeo,MAT.glass,p);o.position.copy(a).addScaledVector(d,(i+0.5)/n);o.quaternion.copy(q);}rod(a,b,0.02,MAT.galv,p,6);}

function membersGeo(list){const geos=[];const up=V3(0,1,0);
  for(const [a,b,t] of list){const d=new THREE.Vector3().subVectors(b,a);const len=d.length();const g=new THREE.BoxGeometry(t,len,t);
    const m=new THREE.Matrix4().compose(a.clone().addScaledVector(d,0.5),new THREE.Quaternion().setFromUnitVectors(up,d.clone().normalize()),V3(1,1,1));g.applyMatrix4(m);geos.push(g);}
  return mergeGeometries(geos);}

// alle statische meshes samenvoegen per materiaal (minder draw calls)
function bakeStatic(){
  scene.updateMatrixWorld(true);
  const buckets=new Map(),remove=[];
  scene.traverse(o=>{
    if(!o.isMesh||o.userData.noBake)return;
    for(let p=o;p;p=p.parent)if(p.userData.dyn)return;
    let g=o.geometry.clone();
    for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    g.clearGroups();g.applyMatrix4(o.matrixWorld);
    const key=o.material.uuid+(o.castShadow?'s':'n')+(g.index?'i':'x');
    if(!buckets.has(key))buckets.set(key,{m:o.material,cast:o.castShadow,geos:[]});
    buckets.get(key).geos.push(g);remove.push(o);
  });
  remove.forEach(o=>o.parent.remove(o));
  for(const {m,cast,geos} of buckets.values()){const mg=mergeGeometries(geos,false);if(!mg)continue;const o=new THREE.Mesh(mg,m);o.castShadow=cast;o.receiveShadow=true;o.userData.noBake=true;o.frustumCulled=false;scene.add(o);}
}
