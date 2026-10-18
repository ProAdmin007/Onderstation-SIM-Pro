
// ============================================================ brand in het 10 kV-gebouw: vlammen uit het dak, brandbel, brandweer met wagens, mensen en waterstraal
// Gedeeld door het scenario 'brand' en het grote incident. fireStart → (spanningsloos) fireDouse → fireStop.
const FIRE={on:false,acc:0,glow:null,flames:[],k:1,douseAt:null,bellT:0,sirenT:0,trucks:[],scorch:null,water:0};
const flameTex=(()=>{const c=cnv(64,128),g=c.getContext('2d'),gr=g.createRadialGradient(32,92,2,32,80,58);
  gr.addColorStop(0,'rgba(255,250,210,1)');gr.addColorStop(0.25,'rgba(255,200,70,0.95)');gr.addColorStop(0.55,'rgba(255,110,20,0.7)');gr.addColorStop(1,'rgba(200,40,0,0)');
  g.fillStyle=gr;g.beginPath();g.moveTo(32,0);g.bezierCurveTo(58,50,64,90,32,128);g.bezierCurveTo(0,90,6,50,32,0);g.fill();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const fireSpot=()=>{const b=VIEWS.MS.box;return {x:(b.min.x+b.max.x)/2-8,y:b.max.y,z:(b.min.z+b.max.z)/2,b};};
function fireStart(){if(FIRE.on)return;const {x,y,z,b}=fireSpot();Object.assign(FIRE,{on:true,k:1,douseAt:null,bellT:0,acc:0,water:0});
  FIRE.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff7a1a,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  FIRE.glow.position.set(x,b.min.y+2.5,b.min.z-0.4);FIRE.glow.scale.set(6,4,1);scene.add(FIRE.glow);
  // vlammen die uit het dak slaan, met een gloed erboven en een zwartgeblakerde plek op het dak
  for(let i=0;i<16;i++){const core=i%2===0,m=new THREE.SpriteMaterial({map:flameTex,transparent:true,depthWrite:false,blending:core?THREE.NormalBlending:THREE.AdditiveBlending,color:core?0xffb040:0xffffff});const s=new THREE.Sprite(m);
    s.userData={ox:rnd(-5.5,5.5),oz:rnd(-3.5,3.5),h:rnd(core?4:3,core?8.5:6),ph:Math.random()*9};s.position.set(x+s.userData.ox,y,z+s.userData.oz);scene.add(s);FIRE.flames.push(s);}
  const hm=new THREE.SpriteMaterial({map:glowTex,color:0xff6a10,transparent:true,opacity:0.5,depthWrite:false,blending:THREE.AdditiveBlending});const h=new THREE.Sprite(hm);h.position.set(x,y+4,z);h.scale.set(22,14,1);scene.add(h);FIRE.flames.push(h);h.userData={halo:true};
  FIRE.scorch=mesh(new THREE.CircleGeometry(4.5,20),mat({color:0x101010,roughness:1}),scene,x,y+0.08,z);FIRE.scorch.rotation.x=-Math.PI/2;FIRE.scorch.castShadow=false;
  // brandweer: twee wagens rijden met sirene over de hoofdweg naar de poort, vier brandweerlieden gaan op verkenning
  FIRE.trucks.forEach(t=>scene.remove(t.g));FIRE.trucks=[[25,79,true],[25,91,false]].map(([tx,tz,ladder],i)=>{const t=fireTruck(ladder);t.g.position.set(tx,0,tz+380+i*24);t.g.rotation.y=Math.PI;scene.add(t.g);
    return Object.assign(t,{x:tx,z:tz,state:'come'});});
  crewDispatch({box:b,say:'Brandweer',until:()=>!FIRE.on,n:4,kind:'fire'});}
function fireDouse(){if(FIRE.on&&FIRE.douseAt==null)FIRE.douseAt=SIM.t;}
function fireStop(){FIRE.on=false;if(FIRE.glow){scene.remove(FIRE.glow);FIRE.glow=null;}FIRE.flames.forEach(s=>{scene.remove(s);s.material.dispose();});FIRE.flames=[];
  if(FIRE.scorch){scene.remove(FIRE.scorch);FIRE.scorch=null;}FIRE.douseAt=null;FIRE.trucks.forEach(t=>{if(t.state!=='gone')t.state='wait';t.wait=12;});}
// brandweerwagen: rood met geel-rode blokken, blauwe zwaailichten, (eventueel) ladder
const FT={red:mat({color:0xc4141f,roughness:0.45,metalness:0.2}),yel:mat({color:0xe6d81a,roughness:0.5}),blk:mat({color:0x15181c,roughness:0.6}),glass:mat({color:0x1e2a34,roughness:0.1,metalness:0.5}),
  tyre:mat({color:0x111111,roughness:0.9}),ladder:mat({color:0xb8bcbf,roughness:0.4,metalness:0.7})};
function fireTruck(ladder){const g=new THREE.Group(),bm=mat({color:0x0a1430,emissive:0x2a6bff,emissiveIntensity:0});
  box(2.5,0.7,9,FT.blk,g,0,0.75,0);box(2.5,2.3,6.2,FT.red,g,0,2.25,-1.3);box(2.5,2.2,2.5,FT.red,g,0,2.2,3.15);box(2.52,0.9,1.2,FT.glass,g,0,2.65,3.9);box(2.2,0.9,0.05,FT.glass,g,0,2.65,4.42);
  for(let i=0;i<8;i++)for(const s of[-1,1])box(0.02,0.35,0.75,i%2?FT.yel:FT.red,g,s*1.26,1.35,-4.1+i*0.78+0.39);
  for(const s of[-1,1])box(0.03,0.35,8.6,FT.yel,g,s*1.265,1.7,-0.2);
  for(const s of[-1,1])box(0.5,0.2,0.3,bm,g,s*0.75,3.42,3.7);box(0.4,0.2,0.3,bm,g,0,3.5,-4.3);
  for(const zz of[-3,-1.6,3])for(const s of[-1,1]){const w=cyl(0.5,0.5,0.4,FT.tyre,g,s*1.1,0.5,zz,12);w.rotation.z=Math.PI/2;}
  let lad=null;if(ladder){box(0.6,0.5,0.6,FT.ladder,g,0,3.6,-4.2);lad=new THREE.Group();lad.position.set(0,3.9,-4.2);g.add(lad);box(0.9,0.35,12,FT.ladder,lad,0,0,6);box(0.5,0.4,0.5,FT.red,lad,0,0.1,12);}
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return {g,bm,lad,ladder};}
// ---- elke frame (echte tijd): vlammen flakkeren, rook, brandbel, sirene, rijden, water
function fireTick(dt){const now=performance.now(),run=!SIM.paused,sp=clamp(SIM.speed/30,1,4);
  for(const t of FIRE.trucks){if(t.state==='gone')continue;if(t.lad&&FIRE.douseAt==null&&t.lad.rotation.x<0)t.lad.rotation.x=Math.min(0,t.lad.rotation.x+dt*0.4);const flash=(now%500<250)!==(t.ladder?true:false);t.bm.emissiveIntensity=t.state==='leave'?0:(now%400<200?6:0.3)*(flash?1:0.5);
    if(t.state==='come'&&run){t.g.position.z-=Math.min(t.g.position.z-t.z,20*sp*dt);if(t.g.position.z-t.z<0.05)t.state='park';
      FIRE.sirenT-=dt;if(FIRE.sirenT<=0){FIRE.sirenT=1.2;const v=distGain(t.g.position);AudioSys.siren?.(v);}}
    else if(t.state==='wait'&&run){t.wait-=dt;if(t.wait<=0){t.state='leave';t.g.rotation.y=0;}}
    else if(t.state==='leave'&&run){t.g.position.z+=14*sp*dt;if(t.g.position.z>t.z+420){scene.remove(t.g);t.state='gone';}}}
  if(FIRE.trucks.length&&FIRE.trucks.every(t=>t.state==='gone'))FIRE.trucks=[];
  if(!FIRE.on)return;const {x,y,z,b}=fireSpot();
  // na het spanningsloos maken blust de brandweer: in ±30 min worden de vlammen klein en de rook wit (stoom)
  FIRE.k=FIRE.douseAt==null?1:clamp(1-(SIM.t-FIRE.douseAt)/28,0.08,1);
  for(const s of FIRE.flames){const u=s.userData;if(u.halo){s.material.opacity=(0.35+0.15*Math.sin(now/120))*FIRE.k;continue;}
    const f=0.75+0.25*Math.sin(now/70+u.ph)*Math.sin(now/43+u.ph*2),hh=u.h*f*(0.35+0.65*FIRE.k);s.scale.set(hh*0.55,hh,1);s.position.set(x+u.ox+Math.sin(now/300+u.ph)*0.3,y+hh*0.42,z+u.oz);s.material.opacity=0.9*FIRE.k;}
  if(FIRE.glow)FIRE.glow.material.opacity=(0.55+0.35*Math.sin(now/90)*Math.sin(now/37))*FIRE.k;
  FIRE.acc+=dt;if(FIRE.acc>0.3){FIRE.acc=0;smokePuff(x+rnd(-5,5),y+2+3*FIRE.k,z,1+0.5*FIRE.k,FIRE.douseAt==null?0x4a4a4a:0xb4b4b0);}
  // brandbel tot de brandweer binnen is
  if(FIRE.douseAt==null&&run){FIRE.bellT-=dt;if(FIRE.bellT<=0){FIRE.bellT=1;AudioSys.fireBell?.(distGain(V3(x,2,z)));}}
  // waterstraal van de brandweer op het dak
  if(FIRE.douseAt!=null&&run){FIRE.water+=dt;const L=FIRE.trucks.find(t=>t.lad&&t.state==='park');if(L){L.lad.rotation.x=Math.max(-0.62,L.lad.rotation.x-dt*0.4);const tip=L.lad.localToWorld(_tip.set(0,0.2,12.3));
      if(L.lad.rotation.x<-0.6)while(FIRE.water>0.04){FIRE.water-=0.04;waterDrop(tip,V3(x+rnd(-3,3),y+0.5,z+rnd(-2,2)));}}else FIRE.water=0;}}
const _tip=new THREE.Vector3();
const waterMat=new THREE.SpriteMaterial({map:glowTex,color:0xe4f2ff,transparent:true,opacity:0.9,depthWrite:false});
function waterDrop(a,tg){const s=new THREE.Sprite(waterMat);s.scale.setScalar(0.9+Math.random()*0.5);s.position.copy(a);scene.add(s);const T=1.3,v=tg.clone().sub(a).divideScalar(T);v.y+=4.9*T;
  FX.push({t:0,update(dt){this.t+=dt;v.y-=9.8*dt;s.position.addScaledVector(v,dt);if(this.t>T){scene.remove(s);return false;}return true;}});}
