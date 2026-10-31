
// ============================================================ SCADA-infrastructuur: serverruimte op het onderstation en een RTU-kast in elk MS-station
// De serverruimte (gebouw SRV) heeft twee rijen racks met de SCADA-servers, een UPS met accu's, koeling, gasblussing en een bedienplek.
// In elk MS-station hangt een RTU-kast met LTE-router en glasvezelaansluiting; de LEDs knipperen en worden rood als SCADA wegvalt.
function ledCanvas(rows=14){const c=cnv(64,256),g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,64,256);
  for(let i=0;i<rows;i++){const y=6+i*(250/rows);for(let k=0;k<5;k++)if(R()<0.6){g.fillStyle=R()<0.85?'#3cff7a':'#ffb030';g.fillRect(40+k*4,y,2,2);}g.fillStyle='#2a7cff';if(R()<0.4)g.fillRect(8,y+1,2,2);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
function rackCanvas(rows=14){const c=cnv(64,256),g=c.getContext('2d');g.fillStyle='#16181b';g.fillRect(0,0,64,256);
  for(let i=0;i<rows;i++){const y=4+i*(250/rows),h=250/rows-3;g.fillStyle=i%5===4?'#2a2d31':'#23262a';g.fillRect(4,y,56,h);g.fillStyle='#0d0e10';for(let k=0;k<6;k++)g.fillRect(8+k*4,y+2,2,h-4);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const SRV={ledTex:ledCanvas(),t:0};
const SVM={rack:mat({map:rackCanvas(),roughness:0.6,metalness:0.3}),body:mat({color:0x1a1c1f,roughness:0.6,metalness:0.4}),
  led:new THREE.MeshBasicMaterial({map:SRV.ledTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:0xffffff}),
  tile:mat({map:(()=>{const c=cnv(128),g=c.getContext('2d');g.fillStyle='#c9ccce';g.fillRect(0,0,128,128);g.strokeStyle='#9da2a6';g.lineWidth=3;g.strokeRect(1,1,126,126);
    g.fillStyle='#b4b9bc';for(let i=0;i<40;i++)g.fillRect(20+(i%8)*12,20+Math.floor(i/8)*20,4,4);return toTex(c,1,1);})(),roughness:0.7}),
  crac:mat({color:0xe8e9e6,roughness:0.5}),ups:mat({color:0x2c2f33,roughness:0.5,metalness:0.3}),gas:mat({color:0xb51e22,roughness:0.4,metalness:0.3}),
  tray:mat({color:0x9aa1a6,roughness:0.5,metalness:0.6}),fiber:mat({color:0xf2c419,roughness:0.6}),
  rtu:mat({map:(()=>{const c=cnv(160,200),g=c.getContext('2d');g.fillStyle='#d8dbdc';g.fillRect(0,0,160,200);g.fillStyle='#8a9196';for(const y of[40,100,160])g.fillRect(8,y,144,5);
    const mod=(x,y,w,col,t)=>{g.fillStyle=col;g.fillRect(x,y-26,w,24);g.fillStyle='#fff';g.font='bold 9px Arial';g.fillText(t,x+2,y-14);};
    mod(10,40,40,'#1d3f7a','RTU');mod(52,40,22,'#4b5258','I/O');mod(76,40,22,'#4b5258','I/O');mod(100,40,22,'#4b5258','I/O');mod(124,40,26,'#3b6e3b','24V');
    mod(10,100,60,'#f2f2ee','');g.fillStyle='#1d2b45';g.font='bold 11px Arial';g.fillText('LTE-ROUTER',13,88);mod(80,100,70,'#2a2d31','FIREWALL');
    g.fillStyle='#f2c419';g.fillRect(10,124,140,28);g.fillStyle='#1d2b45';g.font='bold 11px Arial';g.fillText('GLASVEZEL · ODF',30,142);
    g.fillStyle='#2a2d31';g.fillRect(10,166,140,26);g.fillStyle='#fff';g.font='bold 10px Arial';g.fillText('ACCU 24 V · 4 UUR',30,183);return toTex(c);})(),roughness:0.6}),
  rtuOk:mat({color:0x0a2a14,emissive:0x2cff6a,emissiveIntensity:2}),rtuLte:mat({color:0x0a1430,emissive:0x2a8bff,emissiveIntensity:2}),rtuFo:mat({color:0x2a1a00,emissive:0xffa21a,emissiveIntensity:2})};
// breed bordje voor lange opschriften (het standaardplaatje is voor korte codes)
const WSIGN=new Map();
function wsign(text,parent,x,y,z,ry,w){const m=WSIGN.get(text)||WSIGN.set(text,mat({map:signTex(text,'#f3f3ee','#1d2b45',1024,128,'bold 72px Arial'),roughness:0.5})).get(text);
  const o=mesh(new THREE.PlaneGeometry(w,w/8),m,parent,x,y,z);o.rotation.y=ry;o.castShadow=false;return o;}
// ---- RTU-kast in een MS-station (aanroep vanuit kiosk(); lokale coördinaten van het station, kast aan de binnenkant van de voorwand)
function kioskRTU(root,Y,KH,wrect){const x=0.15,zf=1.45,d=0.26,z=zf-d/2,h=0.9,y=Y+1.35;
  box(0.72,h,d,MAT.cabinet,root,x,y,z);const fp=mesh(new THREE.PlaneGeometry(0.64,0.8),SVM.rtu,root,x,y,z-d/2-0.006);fp.rotation.y=Math.PI;fp.castShadow=false;
  [[SVM.rtuOk,-0.24],[SVM.rtuLte,-0.18],[SVM.rtuFo,-0.12]].forEach(([m,dx])=>box(0.025,0.025,0.01,m,root,x+dx,y+0.34,z-d/2-0.012));
  for(const s of[-1,1])cyl(0.012,0.012,0.22,MAT.black,root,x-0.12+s*0.06,y+h/2+0.11,z,6);   // antennes van de LTE-router
  rod(V3(x+0.2,y+h/2,z),V3(x+0.2,Y+KH,z),0.012,MAT.black,root,5);cyl(0.035,0.035,0.55,MAT.white,root,x+0.2,Y+KH+0.47,z,8);   // kabel naar de LTE-antenne op het dak
  rod(V3(x+0.28,Y+0.02,z+0.05),V3(x+0.28,y-h/2,z+0.05),0.025,SVM.fiber,root,6);rod(V3(x+0.2,Y+0.02,z+0.05),V3(x+0.2,y-h/2,z+0.05),0.02,MAT.cable,root,6);   // glasvezel en voeding uit de vloer
  wsign('RTU · SCADA',root,x,y+h/2+0.08,z-d/2-0.01,Math.PI,0.6);wrect(x-0.4,zf-d-0.05,x+0.4,zf);}
// ---- serverruimte: gebouw SRV (zie BUILDINGS), aangeroepen vanuit buildInterior()
function buildServerRoom(r){if(!r)return;const Y=r.y0,cx=(r.x0+r.x1)/2;
  groundQuad(r.x0+0.2,r.z0+0.2,r.x1-0.2,r.z1-0.2,Y+0.02,SVM.tile,0.6);   // computervloer
  // twee rijen racks met een koude gang ertussen (fronten naar de gang)
  const names=['SCADA A','SCADA B','HISTORIAN','FRONT-END','FIREWALL','NETWERK','GLASVEZEL ODF','LTE-GATEWAY','TIJD · GPS'],x0=r.x0+1.4;
  for(const [rz,face] of[[49.75,1],[52.65,-1]])names.forEach((nm,i)=>{const x=x0+i*0.64;box(0.6,2.05,1.0,SVM.body,staticRoot,x,Y+1.05,rz);
    const f=mesh(new THREE.PlaneGeometry(0.54,1.9),SVM.rack,staticRoot,x,Y+1.05,rz+face*0.505);f.rotation.y=face>0?0:Math.PI;f.castShadow=false;
    const l=mesh(new THREE.PlaneGeometry(0.54,1.9),SVM.led,staticRoot,x,Y+1.05,rz+face*0.51);l.rotation.y=f.rotation.y;l.castShadow=false;l.renderOrder=2;
    plate(face>0?nm:names[(i+3)%names.length],staticRoot,x,Y+2.2,rz+face*0.51,face>0?0:Math.PI,0.5);});
  const rowEnd=x0+names.length*0.64;DISTRICT_RECTS.push([x0-0.35,49.2,rowEnd,50.3],[x0-0.35,52.1,rowEnd,53.2]);
  // kabelgoten boven de racks met gele glasvezelgoten
  for(const z of[49.75,52.65]){box(rowEnd-x0+0.4,0.06,0.4,SVM.tray,staticRoot,(x0+rowEnd)/2-0.3,Y+2.6,z);box(rowEnd-x0+0.4,0.08,0.12,SVM.fiber,staticRoot,(x0+rowEnd)/2-0.3,Y+2.67,z+0.08);}
  // UPS met accukasten, koeling (CRAC), gasblussing en een bedienplek bij de deur
  const ux=rowEnd+1.2;for(let i=0;i<3;i++)box(0.8,1.9,0.9,SVM.ups,staticRoot,ux+i*0.85,Y+0.95,r.z1-0.55);wsign('UPS · 2 × 40 kVA',staticRoot,ux+0.85,Y+2.1,r.z1-1.01,Math.PI,1.6);
  DISTRICT_RECTS.push([ux-0.45,r.z1-1.05,ux+2.15,r.z1]);
  box(0.9,2.0,2.2,SVM.crac,staticRoot,r.x1-0.5,Y+1.0,51.2);wsign('KOELING',staticRoot,r.x1-0.96,Y+1.75,51.2,-Math.PI/2,1.2);DISTRICT_RECTS.push([r.x1-1.0,50.0,r.x1,52.4]);
  for(let i=0;i<3;i++)cyl(0.13,0.13,1.5,SVM.gas,staticRoot,r.x0+0.3+i*0.3,Y+0.75,r.z1-0.3,12);wsign('INERGEN · GASBLUSSING',staticRoot,r.x0+0.6,Y+1.75,r.z1-0.47,Math.PI,1.2);
  const dx=r.x1-2.6,dz=r.z0+0.9;box(1.6,0.05,0.7,IM.wood,staticRoot,dx,Y+0.75,dz);for(const s of[-0.7,0.7])box(0.05,0.73,0.6,MAT.galvDark,staticRoot,dx+s,Y+0.37,dz);DISTRICT_RECTS.push([dx-0.85,dz-0.4,dx+0.85,dz+0.4]);
  if(deskScreens)deskScreens.forEach((s,i)=>{const x=dx-0.38+i*0.76;box(0.7,0.43,0.04,MAT.black,staticRoot,x,Y+1.18,dz-0.25);iplane(0.64,0.4,new THREE.MeshBasicMaterial({map:s.t}),x,Y+1.18,dz-0.228,0);});
  wsign('SCADA · SERVERRUIMTE',staticRoot,cx,Y+3.1,r.z1-0.02,Math.PI,3.2);}
// ---- elke frame: LEDs knipperen (patroon verschuift); rood als de SCADA-verbinding is weggevallen (cyberaanval)
function serverTick(dt){SRV.t+=dt;if(SRV.t<0.22)return;SRV.t=0;const down=SCADA_DOWN();
  SRV.ledTex.offset.y=Math.floor(Math.random()*8)/8;SVM.led.color.setHex(down?0xff3030:0xffffff);
  const b=performance.now()%1000<500;SVM.rtuOk.emissive.setHex(down?0xff2020:0x2cff6a);SVM.rtuOk.emissiveIntensity=b?2.5:0.6;SVM.rtuLte.emissiveIntensity=down?0:(Math.random()<0.5?2.5:0.5);SVM.rtuFo.emissiveIntensity=down?0:Math.random()<0.6?2.5:0.6;}
