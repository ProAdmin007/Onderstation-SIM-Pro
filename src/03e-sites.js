
// ============================================================ grote afnemers in de wereld: ziekenhuis (F5), kassen (F6) en waterzuivering (G4)
// Alleen visueel: je ziet of ze stroom hebben. Ver van het station (zoals in het echt); statisch en samengevoegd, licht via oplichtende materialen.
const SITE={zkh:{f:'F5',x:-560,z:300,glow:[],on:true},kassen:{f:'F6',x0:430,z0:60,x1:830,z1:330,glow:[],halo:[],on:true},rwzi:{f:'G4',x:-680,z:-260,on:true}};
const siteLive=s=>{const f=FEEDERS.find(x=>x.id===s.f);return !!f&&EN.has(f.node);};
// terreinverlichting die aan het veld van de afnemer hangt (gaat uit bij uitval)
function siteLamp(S,x,z){if(!S.lampMat){S.lampMat=mat({color:0x2a2c2e,emissive:0xffd9a0,emissiveIntensity:0});S.poolMat=new THREE.MeshBasicMaterial({map:poolTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});}
  cyl(0.08,0.12,8,MAT.galv,staticRoot,x,4,z,8);box(0.8,0.14,0.3,S.lampMat,staticRoot,x+0.35,8,z);
  const pool=new THREE.Mesh(new THREE.PlaneGeometry(16,16),S.poolMat);pool.rotation.x=-Math.PI/2;pool.position.set(x+0.35,0.08,z);pool.renderOrder=2;staticRoot.add(pool);}
function signTex(t,bg,fg,w=512,h=128,font='bold 64px Arial'){return toTex(textCanvas(t,{w,h,bg,fg,font,border:false}));}

// ---- ziekenhuis: hoofdgebouw met verpleegafdelingen, poliklinieken, helikopterplatform, ambulances en noodstroomaggregaat
function buildHospital(){const S=SITE.zkh,{x,z}=S,W=96,Dz=34,F=6,H=F*3.4+2;
  groundQuad(x-110,z-80,x+110,z+90,0.03,MAT.asphalt,6);groundQuad(x-104,z-74,x+104,z-46,0.035,SM.tiles,2);
  lay('site',x-110,z-80,x+110,z+90);
  const wall=mat({color:0xeef0ee,roughness:0.85});box(W,H,Dz,wall,staticRoot,x,H/2,z);
  const fac=(len,fl)=>{const t=APT.tex.clone();t.repeat.set(len/8,fl);t.needsUpdate=true;return mat({map:t,roughness:0.8,color:0xffffff});};
  const glow=(len,fl,px,py,pz,ry)=>{const t=APT_GLOW.clone();t.repeat.set(len/32,fl/4);t.needsUpdate=true;const m=glowMat(t);S.glow.push(m);
    const g=mesh(new THREE.PlaneGeometry(len,fl*3),m,staticRoot,px,py,pz);g.rotation.y=ry;g.castShadow=g.receiveShadow=false;g.renderOrder=1;};
  for(const s of[-1,1]){const p=mesh(new THREE.PlaneGeometry(W,F*3),fac(W,F),staticRoot,x,2+F*1.5,z+s*(Dz/2+0.03));p.rotation.y=s>0?0:Math.PI;p.castShadow=false;glow(W,F,x,2+F*1.5,z+s*(Dz/2+0.06),p.rotation.y);
    const q=mesh(new THREE.PlaneGeometry(Dz,F*3),fac(Dz,F),staticRoot,x+s*(W/2+0.03),2+F*1.5,z);q.rotation.y=s*Math.PI/2;q.castShadow=false;glow(Dz,F,x+s*(W/2+0.06),2+F*1.5,z,q.rotation.y);}
  box(W+0.6,0.6,Dz+0.6,MAT.concreteDark,staticRoot,x,H+0.3,z);
  // poliklinieken: lage vleugel aan de voorkant, entree met luifel
  const wx=x-24,wz=z-Dz/2-14;box(46,8,28,wall,staticRoot,wx,4,wz);box(48,0.5,30,MAT.concreteDark,staticRoot,wx,8.25,wz);
  {const p=mesh(new THREE.PlaneGeometry(46,4),fac(46,1),staticRoot,wx,5.5,wz-14.04);p.rotation.y=Math.PI;p.castShadow=false;glow(46,1,wx,5,wz-14.07,Math.PI);}
  box(16,0.4,8,MAT.trim,staticRoot,wx,3.4,wz-18);for(const dx of[-7,7])cyl(0.2,0.2,3.4,MAT.galv,staticRoot,wx+dx,1.7,wz-21.6,8);
  // helikopterplatform op het dak
  cyl(10,10,0.4,MAT.concreteDark,staticRoot,x+26,H+0.8,z,32);
  const hp=mesh(new THREE.CircleGeometry(8.5,32),mat({map:signTex('H','#2b5d3c','#ffffff',256,256,'bold 200px Arial'),roughness:0.7}),staticRoot,x+26,H+1.02,z);hp.rotation.x=-Math.PI/2;
  // naambord met rood kruis (licht op zolang er stroom is)
  S.sign=new THREE.MeshBasicMaterial({map:signTex('✚ ZIEKENHUIS','#ffffff','#c8102e',1024,160,'bold 110px Arial'),color:0xffffff});
  const sg=mesh(new THREE.PlaneGeometry(26,4),S.sign,staticRoot,x-10,H-2.2,z-Dz/2-0.12);sg.rotation.y=Math.PI;sg.castShadow=false;
  // ambulances bij de spoedeisende hulp
  const amb=mat({color:0xf2f0e6,roughness:0.5}),ambS=mat({color:0x1d63c9,roughness:0.5}),ambY=mat({color:0xe0c020,roughness:0.5});
  for(const [ax,az] of[[x+30,z-Dz/2-8],[x+38,z-Dz/2-8]]){box(2.4,2.6,6.2,amb,staticRoot,ax,1.6,az);box(2.42,0.35,6.22,ambS,staticRoot,ax,1.4,az);box(2.42,0.3,6.22,ambY,staticRoot,ax,0.9,az);}
  box(14,0.3,12,MAT.trim,staticRoot,x+34,4.2,z-Dz/2-8);   // overkapping SEH
  // parkeerplaats
  for(let i=0;i<16;i++)parkedCar(x-96+i*6.2,z+62+(i%2)*6.4,false,i);
  // noodstroomaggregaat in een container; bij uitval draait hij en komt er rook uit de uitlaat
  const gx=x+W/2+10,gz=z+20;box(12,3,2.6,mat({color:0x2f5a3c,roughness:0.7}),staticRoot,gx,1.5,gz);cyl(0.25,0.25,2.2,MAT.galv,staticRoot,gx+4,4.1,gz,8);
  S.genLamp=mat({color:0x331a00,emissive:0xff8a00,emissiveIntensity:0});const lp=box(0.3,0.3,0.3,S.genLamp,staticRoot,gx-5,3.2,gz);lp.userData.dyn=true;S.exhaust=V3(gx+4,5.3,gz);
  plate('NOODSTROOM',staticRoot,gx-1,2.2,gz-1.32,Math.PI,1.6);
  for(const [lx,lz] of[[-95,62],[-55,62],[-15,62],[25,62],[65,62],[-40,-60],[0,-60],[40,-60],[95,0]])siteLamp(S,x+lx,z+lz);
  tree(x-100,z-60,1.1,false,true);tree(x+100,z-60,1.1,false,true);tree(x-100,z+80,1,false,true);tree(x+102,z+80,1,false,true);}

// ---- kassen: vier glazen Venlo-kassen met assimilatiebelichting, waterbassin en ketelhuis
function buildGreenhouses(){const S=SITE.kassen,{x0,z0,x1,z1}=S;
  groundQuad(x0-20,z0-20,x1+20,z1+20,0.03,MAT.concrete,4);lay('site',x0-20,z0-20,x1+20,z1+20);
  const glass=mat({color:0xd4ecf3,roughness:0.08,metalness:0.1,transparent:true,opacity:0.32,depthWrite:false,side:THREE.DoubleSide}),frame=mat({color:0xb9bfc2,roughness:0.5,metalness:0.6});
  const crop=mat({map:toTex(C.grass,4,4),color:0x5f9a3c,roughness:1});
  const kap=(()=>{const sh=new THREE.Shape();sh.moveTo(-2,0);sh.lineTo(0,0.95);sh.lineTo(2,0);sh.closePath();return sh;})();
  const blocks=[[x0,z0,(x0+x1)/2-6,(z0+z1)/2-6],[(x0+x1)/2+6,z0,x1,(z0+z1)/2-6],[x0,(z0+z1)/2+6,(x0+x1)/2-6,z1],[(x0+x1)/2+6,(z0+z1)/2+6,x1,z1]];
  blocks.forEach(([a,b,c,d])=>{const L=c-a,Wd=d-b,cx=(a+c)/2,cz=(b+d)/2,H=6;
    groundQuad(a,b,c,d,0.06,crop,6);
    for(const s of[-1,1]){const p=mesh(new THREE.PlaneGeometry(L,H),glass,staticRoot,cx,H/2,cz+s*Wd/2);p.castShadow=false;const q=mesh(new THREE.PlaneGeometry(Wd,H),glass,staticRoot,cx+s*L/2,H/2,cz);q.rotation.y=Math.PI/2;q.castShadow=false;}
    const geo=new THREE.ExtrudeGeometry(kap,{depth:L,bevelEnabled:false});geo.rotateY(Math.PI/2);geo.translate(-L/2,0,0);
    for(let zz=b+2;zz<d-1;zz+=4){const r=mesh(geo,glass,staticRoot,cx,H,zz);r.castShadow=false;box(L,0.08,0.08,frame,staticRoot,cx,H,zz-2);}
    for(let xx=a;xx<=c;xx+=12)box(0.12,H,Wd,frame,staticRoot,xx,H/2,cz);
    // assimilatiebelichting: lichtvlak onder het dak en een gloed boven de kas (van ver te zien)
    const lm=new THREE.MeshBasicMaterial({color:0xffa040,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});S.glow.push(lm);
    const lp=mesh(new THREE.PlaneGeometry(L-1,Wd-1),lm,staticRoot,cx,H-0.3,cz);lp.rotation.x=-Math.PI/2;lp.castShadow=lp.receiveShadow=false;lp.userData.noBake=true;lp.renderOrder=3;
    const hm=new THREE.SpriteMaterial({map:glowTex,color:0xff9a3a,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});S.halo.push(hm);
    const halo=new THREE.Sprite(hm);halo.position.set(cx,26,cz);halo.scale.set(L*1.6,60,1);scene.add(halo);});
  // ketelhuis met schoorsteen, waterbassin
  const kx=x0-6,kz=z1+10;box(24,9,14,mat({color:0x8b9196,roughness:0.6,metalness:0.3}),staticRoot,kx+20,4.5,kz);cyl(0.9,1.1,26,MAT.concreteDark,staticRoot,kx+30,13,kz,14);
  S.chimney=V3(kx+30,26.5,kz);
  const bw=groundQuad(x1-60,z1+4,x1,z1+18,0.08,MAT.water,4);bw.receiveShadow=false;
  for(let lx=x0;lx<=x1;lx+=100)siteLamp(S,lx,z0-14);
  plate('GLASTUINBOUW OOST',staticRoot,kx+20,7,kz-7.05,Math.PI,6);}

// ---- waterzuivering: twee nabezinktanks met draaiende brug, beluchtingstanks, gistingstank en bedrijfsgebouw
function buildRWZI(){const S=SITE.rwzi,{x,z}=S;
  groundQuad(x-110,z-80,x+110,z+80,0.03,MAT.concrete,4);lay('site',x-110,z-80,x+110,z+80);
  const wallM=mat({map:toTex(C.conc),color:0xb8b6ae,roughness:0.9,side:THREE.DoubleSide});
  const waterM=mat({color:0x3d4f4a,roughness:0.15,metalness:0.2});
  S.bridges=[];
  for(const [cx,cz] of[[x-55,z-25],[x-55,z+38]]){const ring=mesh(new THREE.CylinderGeometry(22,22,3,48,1,true),wallM,staticRoot,cx,1.5,cz);ring.castShadow=false;
    const wd=mesh(new THREE.CircleGeometry(21.8,48),waterM,staticRoot,cx,2.6,cz);wd.rotation.x=-Math.PI/2;wd.receiveShadow=false;
    cyl(1.2,1.2,3.6,MAT.concreteDark,staticRoot,cx,1.8,cz,12);
    const br=new THREE.Group();br.position.set(cx,3.6,cz);br.userData.dyn=true;scene.add(br);
    box(22,0.6,1.6,MAT.trim,br,11,0,0);box(22,0.9,0.05,MAT.galv,br,11,0.75,0.8);box(22,0.9,0.05,MAT.galv,br,11,0.75,-0.8);box(1.4,1.2,2,MAT.cabinet,br,21.6,0.4,0);
    S.bridges.push(br);}
  // beluchtingstanks: het water bruist zolang de beluchting draait
  const foam=(()=>{const c=cnv(256),g=c.getContext('2d');g.fillStyle='#4e6560';g.fillRect(0,0,256,256);for(let i=0;i<420;i++){g.fillStyle=`rgba(235,240,235,${0.25+R()*0.5})`;g.beginPath();g.arc(R()*256,R()*256,1+R()*3.5,0,7);g.fill();}return toTex(c,6,2);})();
  S.foam=mat({map:foam,roughness:0.6});
  for(let i=0;i<3;i++){const tz=z-45+i*22,tx=x+40;box(64,3,1,wallM,staticRoot,tx,1.5,tz-8);box(64,3,1,wallM,staticRoot,tx,1.5,tz+8);box(1,3,16,wallM,staticRoot,tx-32,1.5,tz);box(1,3,16,wallM,staticRoot,tx+32,1.5,tz);
    const w=mesh(new THREE.PlaneGeometry(63,15),S.foam,staticRoot,tx,2.5,tz);w.rotation.x=-Math.PI/2;w.receiveShadow=false;w.userData.noBake=true;}
  // gistingstanks en bedrijfsgebouw
  for(const dx of[0,18]){cyl(7,7,14,mat({color:0x6d7a5a,roughness:0.6,metalness:0.3}),staticRoot,x+20+dx,7,z+52,24);const d=mesh(new THREE.SphereGeometry(7,24,12,0,Math.PI*2,0,Math.PI/2),MAT.concreteDark,staticRoot,x+20+dx,14,z+52);d.castShadow=false;}
  box(30,8,16,mat({color:0xd8d4c8,roughness:0.8}),staticRoot,x+75,4,z+55);box(31,0.5,17,MAT.concreteDark,staticRoot,x+75,8.25,z+55);
  for(const [lx,lz] of[[-100,-70],[-100,10],[-100,70],[0,-70],[0,70],[100,-70],[100,10],[60,40]])siteLamp(S,x+lx,z+lz);
  plate('RWZI · WATERSCHAP',staticRoot,x+75,6,z+46.95,Math.PI,8);
  S.lamp=mat({color:0x111111,emissive:0x30ff60,emissiveIntensity:0});const l=box(0.5,0.5,0.5,S.lamp,staticRoot,x+62,7.5,z+46.8);l.userData.dyn=true;}

function buildSites(){buildHospital();buildGreenhouses();buildRWZI();}

// ---- elke frame: stroom aan of uit zichtbaar maken (goedkoop: alleen materialen en een paar objecten)
let siteSmoke=0;
function updateSites(dt){const h=hourOf(),night=clamp((NIGHT-0.15)*1.5,0,1),cam=camera.position;siteSmoke+=dt;
  const z=SITE.zkh;z.on=siteLive(z);const win=night*(z.on?0.95:0.06);z.glow.forEach(m=>m.opacity=win);z.sign.color.setScalar(z.on?1:0.12);
  for(const S of[SITE.zkh,SITE.kassen,SITE.rwzi]){if(!S.lampMat)continue;const on=siteLive(S)&&NIGHT>0.3;S.lampMat.emissiveIntensity=on?5:0;S.poolMat.opacity=on?0.55*NIGHT:0;}
  z.genLamp.emissiveIntensity=z.on?0:(performance.now()%900<450?4:0.5);
  const k=SITE.kassen;k.on=siteLive(k);const lightsOn=k.on&&(h<SEASON.rise+1||h>SEASON.set-1);k.glow.forEach(m=>m.opacity=lightsOn?0.55:0);k.halo.forEach(m=>m.opacity=lightsOn?0.4*clamp(NIGHT*1.4,0.2,1):0);
  const r=SITE.rwzi;r.on=siteLive(r);if(r.on&&!SIM.paused)r.bridges.forEach((b,i)=>{b.rotation.y+=dt*(i?0.035:0.03)*Math.min(SIM.speed,60)/30;});
  if(r.on&&!SIM.paused){r.foam.map.offset.x+=dt*0.02;r.foam.map.offset.y+=dt*0.013;}r.foam.color.setScalar(r.on?1:0.6);r.lamp.emissiveIntensity=r.on?2.5:0;
  // rook: alleen als de camera in de buurt is
  if(siteSmoke>0.45){siteSmoke=0;if(!z.on&&cam.distanceTo(z.exhaust)<1400)smokePuff(z.exhaust.x,z.exhaust.y,z.exhaust.z,0.7);
    if(k.on&&cam.distanceTo(k.chimney)<1600)smokePuff(k.chimney.x,k.chimney.y,k.chimney.z,1.4);}}
