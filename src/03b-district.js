
// ============================================================ wijk achter het station: MS-stations, woningen en bedrijven
const DISTRICT_RECTS=[];
function facadeCanvas(tint){const c=cnv(256,256),g=c.getContext('2d');g.drawImage(C.brick,0,0,512,512,0,0,256,256);
  g.fillStyle=tint;g.fillRect(0,0,256,256);
  const win=(x,y,w,h)=>{g.fillStyle='#f1efe8';g.fillRect(x-4,y-4,w+8,h+8);const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,'#2b3a47');gr.addColorStop(0.5,'#6f8496');gr.addColorStop(1,'#26323d');
    g.fillStyle=gr;g.fillRect(x,y,w,h);g.fillStyle='#f1efe8';g.fillRect(x+w/2-2,y,4,h);g.fillRect(x,y+h*0.35,w,3);};
  win(28,40,70,62);win(158,40,70,62);win(28,150,90,70);
  g.fillStyle='#f1efe8';g.fillRect(160,140,58,116);g.fillStyle=['#1f3b5c','#5c1f24','#2f4a2c'][Math.floor(R()*3)];g.fillRect(166,146,46,110);
  g.fillStyle='#c9b27a';g.fillRect(200,196,5,10);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
function metalCanvas(col){const c=cnv(256),g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,256,256);
  for(let x=0;x<256;x+=16){g.fillStyle='rgba(0,0,0,0.18)';g.fillRect(x,0,3,256);g.fillStyle='rgba(255,255,255,0.12)';g.fillRect(x+6,0,2,256);}noiseFill(g,256,10);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
const DM={
  facades:['rgba(120,40,20,0.15)','rgba(60,30,20,0.25)','rgba(200,170,140,0.25)'].map(t=>mat({map:facadeCanvas(t),roughness:0.85})),
  brick:[0x9c5a42,0x7d4535,0xb08a6a].map(c=>mat({map:toTex(C.brick,3,3),color:c,roughness:0.9})),
  roof:[0x3a3d40,0x5b2b20,0x2e3236].map(c=>mat({color:c,roughness:0.8})),
  hall:mat({map:metalCanvas('#9aa3a8'),roughness:0.55,metalness:0.4}),
  hallBlue:mat({map:metalCanvas('#4f6f8f'),roughness:0.55,metalness:0.4}),
  kiosk:mat({map:toTex(concreteCanvas('#c9c1ab')),roughness:0.9}),
  green:mat({color:0x3d5a3a,roughness:0.6,metalness:0.3}),
  flag:mat({color:0x331a00,emissive:0xff8a00,emissiveIntensity:0}),
};
// ---- verlichte ramen: per MS-station een eigen materiaal, zodat de lichten uitgaan als dat station spanningsloos is
const nearestStation=(x,z)=>RING.stations.reduce((a,b)=>Math.hypot(b.pos[0]-x,b.pos[1]-z)<Math.hypot(a.pos[0]-x,a.pos[1]-z)?b:a);
const glowRect=(g,x,y,w,h)=>{const gr=g.createLinearGradient(x,y,x,y+h);gr.addColorStop(0,'rgba(255,196,112,0.95)');gr.addColorStop(1,'rgba(240,140,60,0.9)');g.fillStyle=gr;g.fillRect(x,y,w,h);};
// huisgevel: dezelfde ramen als facadeCanvas, per variant een ander deel aan
const WIN_TEX=[[1,0,1],[0,1,1],[1,1,0]].map(lit=>{const c=cnv(256,256),g=c.getContext('2d');[[28,40,70,62],[158,40,70,62],[28,150,90,70]].forEach((r,i)=>lit[i]&&glowRect(g,...r));
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;});
// appartementen: 4 × 4 tegels met willekeurig verlichte ramen (patroon van aptCanvas)
const APT_GLOW=(()=>{const c=cnv(1024,1024),g=c.getContext('2d');for(let ty=0;ty<4;ty++)for(let tx=0;tx<4;tx++)for(let i=0;i<2;i++)if(R()<0.55)glowRect(g,tx*256+24+i*128,ty*256+64,80,98);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;})();
const glowMat=map=>new THREE.MeshBasicMaterial({map,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
function winGlow(s,variant){s.winMats??=[];return s.winMats[variant]??=glowMat(WIN_TEX[variant]);}
function houseRow(x0,z,n,faceSouth){const W=6,Dp=9,H=5.6,len=n*W,cx=x0+len/2,v=Math.floor(R()*3);
  box(len,H,Dp,DM.brick[v],staticRoot,cx,H/2,z);
  for(let i=0;i<n;i++){const x=x0+W/2+i*W;for(const s of[-1,1]){const p=mesh(new THREE.PlaneGeometry(W-0.1,H),DM.facades[(v+i)%3],staticRoot,x,H/2,z+s*(Dp/2+0.02));p.rotation.y=s>0?0:Math.PI;p.castShadow=false;
    const gl=mesh(new THREE.PlaneGeometry(W-0.1,H),winGlow(nearestStation(x,z),(v+i+(s>0?0:1))%3),staticRoot,x,H/2,z+s*(Dp/2+0.05));gl.rotation.y=p.rotation.y;gl.castShadow=gl.receiveShadow=false;gl.renderOrder=1;}}
  const sh=new THREE.Shape();sh.moveTo(-Dp/2-0.4,0);sh.lineTo(0,3.4);sh.lineTo(Dp/2+0.4,0);sh.closePath();
  const rg=new THREE.ExtrudeGeometry(sh,{depth:len+0.4,bevelEnabled:false});rg.rotateY(Math.PI/2);rg.translate(-len/2-0.2,0,0);mesh(rg,DM.roof[v],staticRoot,cx,H,z);
  for(let i=1;i<n;i+=2)box(0.5,1.2,0.5,MAT.concreteDark,staticRoot,x0+i*W,H+2.6,z);   // schoorstenen
  // tuintjes met schuurtjes aan de achterkant
  const back=faceSouth?-1:1;for(let i=0;i<n;i++)box(2.2,2.1,2,DM.brick[(v+1)%3],staticRoot,x0+W/2+i*W,1.05,z+back*(Dp/2+6));
  DISTRICT_RECTS.push([x0,z-Dp/2,x0+len,z+Dp/2]);}
function hall(cx,cz,w,d,h,label,blue){box(w,h,d,blue?DM.hallBlue:DM.hall,staticRoot,cx,h/2,cz);box(w+0.6,0.4,d+0.6,MAT.roof,staticRoot,cx,h+0.2,cz);
  for(let i=0;i<3;i++){const p=mesh(new THREE.PlaneGeometry(4,4.5),MAT.louvre,staticRoot,cx-w/2+5+i*6,2.25,cz-d/2-0.02);p.rotation.y=Math.PI;p.castShadow=false;}
  const t=toTex(textCanvas(label,{w:1024,h:160,bg:'#ffffff',fg:'#1d2b45',font:'bold 92px Arial',border:false}));const sg=mesh(new THREE.PlaneGeometry(9,1.4),mat({map:t,roughness:0.5}),staticRoot,cx+w/2-7,h-1.4,cz-d/2-0.03);sg.rotation.y=Math.PI;sg.castShadow=false;
  DISTRICT_RECTS.push([cx-w/2,cz-d/2,cx+w/2,cz+d/2]);}
// inloop-MS-station: 5 × 3,2 m, deur aan de straatkant (lokaal +z), binnen RMU, LS-rek en trafo achter gaas
const KW=5.0,KD=3.2,KH=2.8,KT=0.15,KY=0.25;
const kioskLight=new THREE.PointLight(0xf4f2ea,0,7,2);scene.add(kioskLight);const KUPD=[];
function kioskVpis(on){return mat({color:0x3a3320,emissive:0xffd23a,emissiveIntensity:on?3:0});}
function kiosk(s){
  const [x,z]=s.pos,ry=[Math.PI,-Math.PI/2,0][s.face],root=grp(x,z);root.rotation.y=ry;
  const cs=Math.cos(ry),sn=Math.sin(ry),L2W=(lx,lz)=>[x+lx*cs+lz*sn,z-lx*sn+lz*cs];
  const wrect=(lx0,lz0,lx1,lz1)=>{const a=L2W(lx0,lz0),b=L2W(lx1,lz1);DISTRICT_RECTS.push([Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])]);};
  const Y=KY,fz=KD/2-KT/2,hw=KW/2;
  // casco
  box(KW+0.1,KY,KD+0.1,MAT.concreteDark,root,0,KY/2,0);
  box(KW,KH,KT,DM.kiosk,root,0,Y+KH/2,-fz);box(KT,KH,KD,DM.kiosk,root,-hw+KT/2,Y+KH/2,0);box(KT,KH,KD,DM.kiosk,root,hw-KT/2,Y+KH/2,0);
  box(0.45,KH,KT,DM.kiosk,root,-2.275,Y+KH/2,fz);box(3.25,KH,KT,DM.kiosk,root,0.875,Y+KH/2,fz);box(1.3,0.6,KT,DM.kiosk,root,-1.4,Y+KH-0.3,fz);
  box(KW+0.3,0.18,KD+0.3,MAT.concreteDark,root,0,Y+KH+0.09,0);
  const fl=mesh(new THREE.PlaneGeometry(KW-0.3,KD-0.3),IM.floor,root,0,Y+0.01,0);fl.rotation.x=-Math.PI/2;fl.castShadow=false;
  // openstaande deur en dichte trafodeur
  const dg=new THREE.Group();dg.position.set(-2.05,Y,fz+0.08);dg.rotation.y=-1.75;root.add(dg);box(1.3,2.15,0.05,MAT.door,dg,0.65,1.08,0);
  box(1.3,2.15,0.05,MAT.door,root,1.65,Y+1.08,fz+0.1);
  const hz=mesh(new THREE.PlaneGeometry(0.32,0.4),MAT.hazard,root,1.65,Y+1.6,fz+0.135);hz.castShadow=false;
  plate(s.id,root,0.4,Y+1.9,fz+0.08,0,0.42);
  const nm=toTex(textCanvas(s.name,{w:512,h:96,bg:'#f3f3ee',fg:'#1d2b45',font:'bold 46px Arial',border:false}));const np=mesh(new THREE.PlaneGeometry(1.6,0.3),mat({map:nm,roughness:0.5}),root,0.4,Y+2.45,fz+0.08);np.castShadow=false;
  for(const sx of[-1,1]){const lv=mesh(new THREE.PlaneGeometry(1.2,0.5),MAT.louvre,root,sx*(hw+0.01),Y+2.1,0.6);lv.rotation.y=sx*Math.PI/2;lv.castShadow=false;}
  const flm=mat({color:0x331a00,emissive:0xff8a00,emissiveIntensity:0});const lamp=cyl(0.09,0.09,0.16,flm,root,2.1,Y+KH+0.26,1.2,12);lamp.userData.dyn=true;
  regView(s.id,root,()=>{flm.emissiveIntensity=s.flag&&(performance.now()%900<450)?4:0;},{box:(()=>{const a=L2W(-hw,-KD/2),b=L2W(hw,KD/2);return new THREE.Box3(V3(Math.min(a[0],b[0]),0,Math.min(a[1],b[1])),V3(Math.max(a[0],b[0]),Y+KH+0.3,Math.max(a[1],b[1])));})(),labelPos:V3(x,4,z)});
  // botsingsvlakken: muren met deuropening, inrichting
  wrect(-hw,-KD/2,hw,-KD/2+KT);wrect(-hw,-KD/2,-hw+KT,KD/2);wrect(hw-KT,-KD/2,hw,KD/2);wrect(-hw,KD/2-KT,-2.05,KD/2);wrect(-0.75,KD/2-KT,hw,KD/2);
  const idx=ROOMS.length+1,ri=L2W(-hw+KT,-KD/2+KT),rj=L2W(hw-KT,KD/2-KT);
  const room={idx,kiosk:true,kioskId:s.id,x0:Math.min(ri[0],rj[0]),x1:Math.max(ri[0],rj[0]),z0:Math.min(ri[1],rj[1]),z1:Math.max(ri[1],rj[1]),y0:Y,y1:Y+KH,doors:[],
    cx:L2W(-0.8,0.6)[0],cz:L2W(-0.8,0.6)[1],yaw:ry};ROOMS.push(room);
  const inside=(id,g,lx,ly,lz,fx,fz2)=>{const w=L2W(lx,lz),f=L2W(fx,fz2);regView(id,g,g.userData.upd||null,{inside:idx,labelPos:V3(w[0],ly,w[1]),flyPos:V3(f[0],Y+1.65,f[1]),flyTarget:V3(w[0],Y+1.1,w[1])});};
  // ---- RMU (drie velden: L, T, R)
  const rz=-KD/2+KT+0.375,rf=rz+0.38;
  box(1.32,0.2,0.75,MAT.black,root,-1.6,Y+0.1,rz);wrect(-2.26,-KD/2,-0.94,rf);
  [['L',-2.03,s.id+'-L'],['T',-1.6,s.id+'-T'],['R',-1.17,s.id+'-R']].forEach(([lbl,px,id])=>{const d=D[id],g=new THREE.Group();g.position.set(px,0,0);root.add(g);
    box(0.42,1.4,0.75,IM.panel,g,0,Y+0.9,rz);box(0.36,0.5,0.02,IM.door,g,0,Y+0.5,rf);
    const mp=mesh(new THREE.PlaneGeometry(0.36,0.135),mat({map:mimicTex(lbl==='T'?'feed':'inc'),roughness:0.5}),g,0,Y+1.18,rf+0.012);mp.castShadow=false;
    const ind=mat({color:0x111111,emissive:0xff2020,emissiveIntensity:2.2});const im=box(0.05,0.05,0.02,ind,g,0,Y+1.18,rf+0.02);im.userData.dyn=true;
    cyl(0.03,0.03,0.04,MAT.black,g,0,Y+1.0,rf+0.02,12).rotation.x=Math.PI/2;
    const vp=kioskVpis(false);for(let k=0;k<3;k++){const l=cyl(0.011,0.011,0.02,vp,g,-0.08+k*0.08,Y+1.42,rf+0.012,8);l.rotation.x=Math.PI/2;l.userData.dyn=true;}
    plate(lbl,g,0,Y+1.52,rf+0.012,0,0.16);
    g.userData.upd=()=>{ind.emissive.setHex(d.state?0xff2020:0x20ff50);vp.emissiveIntensity=EN.has(lbl==='T'?d.b:(lbl==='L'?d.a:d.b))?3:0;};
    inside(id,g,px,Y+1.9,rz,px+0.3,0.7);});
  const ksv=mat({color:0x331a00,emissive:0xff8a00,emissiveIntensity:0});box(0.5,0.14,0.2,MAT.black,root,-1.6,Y+1.7,rz+0.2);const kl=box(0.42,0.06,0.02,ksv,root,-1.6,Y+1.7,rz+0.31);kl.userData.dyn=true;
  plate('KSV',root,-1.6,Y+1.86,rz+0.3,0,0.18);
  KUPD.push(()=>{ksv.emissiveIntensity=s.flag&&(performance.now()%700<350)?4:0;});
  // ---- laagspanningsrek met NH-lastscheiders per LS-veld
  const lz=-KD/2+KT+0.18,lf=lz+0.18;
  box(1.62,1.95,0.06,MAT.galvDark,root,0.2,Y+0.975,lz-0.12);for(const sx of[-0.6,1.0])box(0.05,1.95,0.36,MAT.galv,root,sx,Y+0.975,lz);
  for(let k=0;k<4;k++)box(1.55,0.035,0.012,MAT.copper,root,0.2,Y+1.62+k*0.07,lf-0.05);
  box(0.36,0.3,0.16,MAT.black,root,-0.36,Y+1.25,lf-0.04);plate('HOOFD',root,-0.36,Y+1.48,lf+0.05,0,0.22);
  wrect(-0.65,-KD/2,1.05,lf+0.05);
  s.groups.forEach((gr,j)=>{const px=-0.02+j*Math.min(0.24,1.0/s.groups.length),g=new THREE.Group();g.position.set(px,0,0);root.add(g);
    box(0.13,0.48,0.12,MAT.black,g,0,Y+1.1,lf-0.02);
    const lid=new THREE.Group();lid.position.set(0,Y+1.34,lf+0.04);lid.userData.dyn=true;g.add(lid);box(0.12,0.46,0.03,mat({color:0x9aa1a6,roughness:0.5}),lid,0,-0.23,0);
    plate('G'+(j+1),g,0,Y+1.43,lf+0.05,0,0.12);rod(V3(px,Y+0.86,lf-0.02),V3(px,Y+0.02,lf-0.02),0.03,MAT.cable,root,6);
    const d=D[gr.id];let o=-1;g.userData.upd=(dt)=>{const t=d.state?0:1;if(o<0)o=t;o=approach(o,t,(dt||0.016)*4);lid.rotation.x=-o*0.95;};
    inside(gr.id,g,px,Y+1.75,lz,px-0.4,0.8);});
  // ---- distributietrafo achter gaashek
  const gm=mat({map:(()=>{const t=toTex(C.chain);t.repeat.set(KD/0.11,2.2/0.11);t.needsUpdate=true;return t;})(),alphaTest:0.45,side:THREE.DoubleSide,metalness:0.6,roughness:0.45});
  const mesh2=new THREE.Mesh(new THREE.PlaneGeometry(KD-0.3,2.2),gm);mesh2.position.set(1.15,Y+1.1,0);mesh2.rotation.y=Math.PI/2;root.add(mesh2);wrect(1.1,-KD/2,1.2,KD/2);
  const tg=new THREE.Group();root.add(tg);
  box(1.0,1.1,0.8,MAT.trafo,tg,1.75,Y+0.75,0.1);
  for(let k=0;k<6;k++){box(0.03,0.85,0.25,MAT.trafo,tg,1.3+k*0.18,Y+0.72,0.62);box(0.03,0.85,0.25,MAT.trafo,tg,1.3+k*0.18,Y+0.72,-0.42);}
  // MS: haakse steekconnectoren op de trafo, kabels recht naar beneden de vloergoot in
  for(let k=0;k<3;k++){const bx=1.5+k*0.25;cyl(0.05,0.06,0.18,MAT.black,tg,bx,Y+1.4,0.25,10);
    rod(V3(bx,Y+1.5,0.25),V3(bx,Y+1.5,0.62),0.04,MAT.black,tg,8);rod(V3(bx,Y+1.5,0.62),V3(bx,Y+0.02,0.62),0.035,MAT.cable,tg,8);}
  // kabelgoot met traanplaten: van de trafo langs de voorwand naar het T-veld van de RMU
  const goot=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(L/0.6));for(let i=0;i<n;i++){const t=(i+0.5)/n;
    const p=box(Math.abs(x1-x0)>0.01?L/n-0.01:0.34,0.018,Math.abs(x1-x0)>0.01?0.34:L/n-0.01,MAT.galvDark,root,x0+(x1-x0)*t,Y+0.009,z0+(z1-z0)*t);p.castShadow=false;}};
  goot(2.2,0.62,-1.6,0.62);goot(-1.6,0.45,-1.6,-0.62);
  // LS: koperrails omhoog, als bundel over het gaas en van boven het LS-rek in
  for(let k=0;k<4;k++){const bx=1.45+k*0.2,h=Y+2.3+k*0.07,bz=-0.15,rz=lf-0.05,ry=Y+1.62+k*0.07,cu=(a,b)=>rod(a,b,0.016,MAT.copper,root,5);
    cyl(0.03,0.03,0.14,MAT.white,tg,bx,Y+1.37,bz,8);
    cu(V3(bx,Y+1.44,bz),V3(bx,h,bz));cu(V3(bx,h,bz),V3(0.98-k*0.05,h,bz));cu(V3(0.98-k*0.05,h,bz),V3(0.98-k*0.05,h,rz));cu(V3(0.98-k*0.05,h,rz),V3(0.98-k*0.05,ry,rz));}
  for(const x of[1.3,2.2])rod(V3(x,Y+2.2,-0.15),V3(x,Y+KH,-0.15),0.012,MAT.galv,root,4);   // ophangstangen
  const tw=L2W(1.75,0.1);D[s.id+'-TR'].node=s.node+'v';
  regView(s.id+'-TR',tg,null,{inside:idx,labelPos:V3(tw[0],Y+1.9,tw[1]),flyPos:V3(...L2W(0.3,0.9).flatMap((v,i)=>i?[Y+1.65,v]:[v])),flyTarget:V3(tw[0],Y+0.9,tw[1])});
  // ---- inrichting
  box(0.9,0.05,0.2,IM.led,root,-0.8,Y+KH-0.04,0.2);
  cyl(0.08,0.08,0.55,IM.redPaint,root,-2.2,Y+0.3,1.2,14);
  for(let k=0;k<3;k++)rod(V3(-hw+KT+0.02,Y+1.6,-0.2+k*0.25),V3(-hw+KT+0.02,Y+0.9,-0.1+k*0.25),0.02,mat({color:0x5aa02c,roughness:0.6}),root,5);
  const po=mesh(new THREE.PlaneGeometry(0.55,0.75),mat({map:posterTex(),roughness:0.7}),root,-hw+KT+0.01,Y+1.4,0.75);po.rotation.y=Math.PI/2;po.castShadow=false;
}
function updateKioskLight(){KUPD.forEach(f=>f());const i=camInside(),r=i&&ROOMS[i-1];if(r&&r.kiosk){kioskLight.position.set((r.x0+r.x1)/2,r.y1-0.3,(r.z0+r.z1)/2);kioskLight.intensity=22;}else kioskLight.intensity=0;}
function enterKiosk(id){const r=ROOMS.find(r=>r.kioskId===id);if(!r)return;FP.last={x:r.cx,z:r.cz,yaw:r.yaw,pitch:-0.08};
  if(FP.on){FP.pos.set(r.cx,0,r.cz);FP.yaw=r.yaw;FP.pitch=-0.08;}else enterFP();if(SEL)selectDevice(null);}

// appartementenblok met winkelplint (centrum)
function aptCanvas(){const c=cnv(256,256),g=c.getContext('2d');g.fillStyle='#b9b2a3';g.fillRect(0,0,256,256);noiseFill(g,256,12);
  for(let i=0;i<2;i++){const x=24+i*128;g.fillStyle='#e9e6de';g.fillRect(x-5,58,90,110);const gr=g.createLinearGradient(x,64,x+80,160);gr.addColorStop(0,'#2b3a47');gr.addColorStop(0.5,'#7d93a6');gr.addColorStop(1,'#26323d');
    g.fillStyle=gr;g.fillRect(x,64,80,98);g.fillStyle='#e9e6de';g.fillRect(x+38,64,4,98);g.fillStyle='#55595c';g.fillRect(x-8,170,96,10);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
function shopCanvas(){const c=cnv(512,128),g=c.getContext('2d');g.fillStyle='#3a3f44';g.fillRect(0,0,512,128);
  const cols=['#b33a2f','#2f6db3','#2f9a5a','#d38a1f'];for(let i=0;i<4;i++){const x=i*128;g.fillStyle=cols[i];g.fillRect(x+6,6,116,22);
    const gr=g.createLinearGradient(x,30,x+120,120);gr.addColorStop(0,'#c9d6df');gr.addColorStop(1,'#56646f');g.fillStyle=gr;g.fillRect(x+10,34,108,90);g.fillStyle='#3a3f44';g.fillRect(x+60,34,4,90);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
const APT={tex:aptCanvas(),shop:shopCanvas()};
function aptBlock(x0,z0,x1,z1,floors){const W=x1-x0,Dz=z1-z0,H=floors*3+3.6,cx=(x0+x1)/2,cz=(z0+z1)/2;
  const facade=(len)=>{const t=APT.tex.clone();t.repeat.set(len/8,floors);t.needsUpdate=true;return mat({map:t,roughness:0.85});};
  const shop=(len)=>{const t=APT.shop.clone();t.repeat.set(len/16,1);t.needsUpdate=true;return mat({map:t,roughness:0.6});};
  box(W,H,Dz,DM.kiosk,staticRoot,cx,H/2,cz);
  const st=nearestStation(cx,cz),glow=(len,x,z,ry)=>{const t=APT_GLOW.clone();t.repeat.set(len/32,floors/4);t.needsUpdate=true;const m=glowMat(t);(st.winApt??=[]).push(m);
    const g=mesh(new THREE.PlaneGeometry(len,floors*3),m,staticRoot,x,3.6+floors*1.5,z);g.rotation.y=ry;g.castShadow=g.receiveShadow=false;g.renderOrder=1;};
  for(const s of[-1,1]){const f=mesh(new THREE.PlaneGeometry(W,floors*3),facade(W),staticRoot,cx,3.6+floors*1.5,cz+s*(Dz/2+0.02));f.rotation.y=s>0?0:Math.PI;f.castShadow=false;glow(W,cx,cz+s*(Dz/2+0.05),f.rotation.y);
    const sp=mesh(new THREE.PlaneGeometry(W,3.4),shop(W),staticRoot,cx,1.7,cz+s*(Dz/2+0.02));sp.rotation.y=s>0?0:Math.PI;sp.castShadow=false;
    box(W,0.15,1.6,MAT.trim,staticRoot,cx,3.5,cz+s*(Dz/2+0.8));}
  for(const s of[-1,1]){const f=mesh(new THREE.PlaneGeometry(Dz,floors*3),facade(Dz),staticRoot,cx+s*(W/2+0.02),3.6+floors*1.5,cz);f.rotation.y=s*Math.PI/2;f.castShadow=false;glow(Dz,cx+s*(W/2+0.05),cz,f.rotation.y);}
  box(W+0.4,0.6,Dz+0.4,MAT.concreteDark,staticRoot,cx,H+0.3,cz);box(3,1.4,2,MAT.cabinet,staticRoot,cx-W/4,H+1.3,cz);box(2,1,2,MAT.cabinet,staticRoot,cx+W/4,H+1.1,cz);
  DISTRICT_RECTS.push([x0,z0-1.7,x1,z1+1.7]);}
// straatlantaarn, gevoed uit het LS-veld openbare verlichting van het dichtstbijzijnde MS-station
const poolTex=(()=>{const c=cnv(128),g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,214,150,0.9)');gr.addColorStop(0.45,'rgba(255,190,110,0.35)');gr.addColorStop(1,'rgba(255,170,90,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
function streetLight(x,z){
  const s=RING.stations.reduce((a,b)=>Math.hypot(b.pos[0]-x,b.pos[1]-z)<Math.hypot(a.pos[0]-x,a.pos[1]-z)?b:a);
  if(!s.lampMat){s.lampMat=mat({color:0x2a2c2e,emissive:0xffd9a0,emissiveIntensity:0});s.poolMat=new THREE.MeshBasicMaterial({map:poolTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});s.lamps=0;}
  s.lamps++;cyl(0.06,0.09,7,MAT.galv,staticRoot,x,3.5,z,8);box(0.7,0.12,0.25,s.lampMat,staticRoot,x+0.3,7,z);
  const pool=new THREE.Mesh(new THREE.PlaneGeometry(11,11),s.poolMat);pool.rotation.x=-Math.PI/2;pool.position.set(x+0.3,0.07,z);pool.renderOrder=2;staticRoot.add(pool);}
function updateStreetLights(){RING.stations.forEach(s=>{if(!s.lampMat)return;const on=NIGHT>0.3&&EN.has(s.ovl);s.lampMat.emissiveIntensity=on?5:0;s.poolMat.opacity=on?0.55*NIGHT:0;});}
function buildDistrict(){
  // straten
  groundQuad(-150,98,165,104,0.04,MAT.asphalt,6);groundQuad(-150,236,165,242,0.04,MAT.asphalt,6);
  groundQuad(-100,104,-94,236,0.04,MAT.asphalt,6);groundQuad(60,104,66,236,0.04,MAT.asphalt,6);
  for(let x=-140;x<160;x+=30){streetLight(x,96.5);streetLight(x+15,243.5);}
  for(let z=120;z<236;z+=30){streetLight(-101.5,z);streetLight(67.5,z);}
  // woningen
  [[-84,118,6,0],[-40,118,6,0],[-84,145,6,1],[-40,145,6,1],[-84,190,6,0],[-40,190,6,0],[-84,220,6,1],[-40,220,6,1],
   [-140,150,5,0],[-140,185,5,1],[40,130,3,0],[40,170,3,0],[40,205,3,1],[72,220,6,1],[112,220,6,1],[72,190,6,0]].forEach(([x,z,n,s])=>houseRow(x,z,n,!!s));
  // bedrijventerrein bij MS5
  hall(100,140,30,20,8,'TRANSPORT');hall(145,140,30,22,9,'KOELHUIS',true);hall(130,175,40,18,7,'GARAGE · KANTOREN');
  // LS-verdeelkasten in de straat
  [[-62,112],[-18,112],[-104,165],[-36,228],[52,124],[96,226],[150,114]].forEach(([x,z])=>{box(0.9,1.15,0.35,DM.green,staticRoot,x,0.6,z);});
  // ---- Centrum en bedrijventerrein De Vaart (ring 2)
  groundQuad(-130,270,200,276,0.04,MAT.asphalt,6);groundQuad(-130,384,200,390,0.04,MAT.asphalt,6);
  groundQuad(-64,276,-58,384,0.04,MAT.asphalt,6);groundQuad(106,276,112,384,0.04,MAT.asphalt,6);
  groundQuad(-125,364,-70,380,0.035,MAT.concrete,3);   // marktplein
  for(let x=-120;x<-72;x+=12)tree(x,372,0.9,false);
  aptBlock(-125,292,-70,310,4);aptBlock(-52,292,8,310,5);aptBlock(-125,330,-70,356,3);aptBlock(-52,330,8,360,4);
  hall(62,318,38,24,9,'METAALBEWERKING SMIT');hall(158,322,50,32,11,'DISTRIBUTIECENTRUM',true);hall(70,362,32,18,7,'BOUWMARKT');
  box(14,0.5,9,MAT.trim,staticRoot,96,5.2,300);for(const [dx,dz] of[[-6,-4],[6,-4],[-6,4],[6,4]])cyl(0.15,0.15,5,MAT.galv,staticRoot,96+dx,2.5,300+dz,8);   // tankstation
  for(let x=-120;x<190;x+=30){streetLight(x,268.5);streetLight(x+15,391.5);}
  RING.stations.forEach(kiosk);
}
