
// ============================================================ SCADA-infrastructuur: datacenter op het onderstation en een RTU-kast in elk MS-station
// Het datacenter (gebouw SRV) heeft twee rijen 19"-racks rond een afgesloten koude gang, koeling, UPS met accukasten, gasblussing met
// rookaanzuiging en een bedienplek. In elk MS-station hangt een RTU-kast met LTE-router en glasvezelaansluiting.
// De LEDs knipperen en worden rood als SCADA wegvalt (cyberaanval).
function ledCanvas(rows=14){const c=cnv(64,256),g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,64,256);
  for(let i=0;i<rows;i++){const y=6+i*(250/rows);for(let k=0;k<5;k++)if(R()<0.6){g.fillStyle=R()<0.85?'#3cff7a':'#ffb030';g.fillRect(40+k*4,y,2,2);}g.fillStyle='#2a7cff';if(R()<0.4)g.fillRect(8,y+1,2,2);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
// kleine tekening op canvas als textuur (niet herhalend)
function drawTex(w,h,fn){const c=cnv(w,h),g=c.getContext('2d');fn(g,w,h);const t=toTex(c);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t;}
const perfDoor=(g,w,h)=>{g.fillStyle='rgba(0,0,0,0.38)';for(let y=0;y<h;y+=4)for(let x=(y/4)%2?2:0;x<w;x+=4)g.fillRect(x,y,2,2);};
// rackfront: servers, opslag, netwerk of vooral blindplaten, achter een geperforeerde deur
function rackFront(kind){return drawTex(128,512,(g,w,h)=>{g.fillStyle='#0e1012';g.fillRect(0,0,w,h);const U=11.4;let y=14;
  while(y<h-16){let n=1,col='#17191c';const r=R();
    if(kind==='srv'){n=r<0.5?1:2;col=r<0.85?'#2b2f34':'#17191c';}
    else if(kind==='stor'){n=r<0.7?2:4;col=r<0.9?'#30343a':'#17191c';}
    else if(kind==='net'){n=1;col=r<0.45?'#1d1f22':r<0.8?'#2c3036':'#17191c';}
    else{n=1;col=r<0.15?'#2b2f34':'#17191c';}
    const hh=n*U-1;if(y+hh>h-14)break;g.fillStyle=col;g.fillRect(10,y,108,hh);
    if(col==='#2b2f34'){g.fillStyle='#3a3f45';g.fillRect(10,y,5,hh);g.fillRect(113,y,5,hh);g.fillStyle='#16181b';for(let k=0;k<(n>1?8:4);k++)g.fillRect(20+k*(n>1?11:22),y+2,n>1?9:18,hh-4);}
    else if(col==='#30343a'){g.fillStyle='#15171a';for(let k=0;k<12;k++)g.fillRect(14+k*8.5,y+2,7,hh-4);g.fillStyle='#4a8cff';for(let k=0;k<12;k++)if(R()<0.5)g.fillRect(16+k*8.5,y+hh-4,2,2);}
    else if(col==='#1d1f22'){g.fillStyle='#050505';for(let k=0;k<12;k++)g.fillRect(16+k*8,y+3,6,5);const cc=['#2f6fd6','#f2c419','#d63a3a','#2bb24c','#e8e8e8'];for(let k=0;k<12;k++)if(R()<0.75){g.fillStyle=cc[(R()*cc.length)|0];g.fillRect(17+k*8,y+7,4,6);}}
    else if(col==='#2c3036'){g.fillStyle='#090909';for(let k=0;k<12;k++)g.fillRect(16+k*8,y+3,6,5);g.fillStyle='#8a9196';g.fillRect(104,y+3,10,5);}
    else{g.fillStyle='#1e2125';g.fillRect(10,y+hh/2,108,1);}
    y+=hh+1;}
  perfDoor(g,w,h);g.fillStyle='#24272b';g.fillRect(0,0,w,8);g.fillRect(0,h-8,w,8);g.fillRect(0,0,6,h);g.fillRect(w-6,0,6,h);
  g.fillStyle='#8a9196';g.fillRect(w-14,h*0.44,4,48);});}
// achterkant: serverachterkanten met ventilatoren, twee stekkerdozen (PDU) en kabelbundels
function rackRear(){return drawTex(128,512,(g,w,h)=>{g.fillStyle='#0f1113';g.fillRect(0,0,w,h);
  for(let y=16;y<h-24;y+=24){g.fillStyle='#24282d';g.fillRect(16,y,96,21);g.fillStyle='#0b0c0e';for(let k=0;k<4;k++){g.beginPath();g.arc(30+k*22,y+10,7,0,7);g.fill();}}
  for(const x of[6,114]){g.fillStyle='#1a1a1a';g.fillRect(x-2,20,8,h-40);g.fillStyle=x<64?'#c43b3b':'#3b6fc4';for(let y=28;y<h-30;y+=14)g.fillRect(x,y,4,5);}
  for(const [x,c] of[[20,'#2f6fd6'],[25,'#8a9196'],[30,'#f2c419'],[98,'#2f6fd6'],[103,'#8a9196']]){g.fillStyle=c;g.fillRect(x,10,3,h-20);}
  perfDoor(g,w,h);g.fillStyle='#24272b';g.fillRect(0,0,w,8);g.fillRect(0,h-8,w,8);});}
// RTU-kast: frontjes van de modules
const RTUF={
  psu:drawTex(64,96,(g,w,h)=>{g.fillStyle='#b9bec2';g.fillRect(0,0,w,h);g.fillStyle='#555';for(let k=0;k<4;k++){g.fillRect(8+k*13,6,8,8);g.fillRect(8+k*13,h-14,8,8);}g.fillStyle='#1d2b45';g.font='bold 12px Arial';g.fillText('24 V DC',8,46);g.font='10px Arial';g.fillText('10 A',8,62);g.fillStyle='#2cff6a';g.fillRect(48,70,6,6);}),
  cpu:drawTex(96,112,(g,w,h)=>{g.fillStyle='#24364d';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='bold 16px Arial';g.fillText('RTU',8,22);g.font='9px Arial';g.fillText('IEC 60870-5-104',8,36);
    g.fillStyle='#8fd18f';g.fillRect(8,44,56,18);g.fillStyle='#10301a';g.font='bold 10px monospace';g.fillText('ONLINE',12,57);g.fillStyle='#0b0b0b';g.fillRect(8,76,22,18);g.fillRect(36,76,22,18);g.fillStyle='#8a9196';g.fillRect(66,76,20,10);}),
  io:drawTex(32,96,(g,w,h)=>{g.fillStyle='#3a3f45';g.fillRect(0,0,w,h);g.fillStyle='#7d848a';g.fillRect(2,2,28,12);g.fillRect(2,h-14,28,12);g.fillStyle='#333';for(let k=0;k<4;k++){g.fillRect(4+k*7,5,4,6);g.fillRect(4+k*7,h-11,4,6);}
    for(let k=0;k<8;k++){g.fillStyle=k%3===2?'#ffb030':'#3cff7a';g.fillRect(12,22+k*8,6,4);}}),
  lte:drawTex(128,96,(g,w,h)=>{g.fillStyle='#f2f2ee';g.fillRect(0,0,w,h);g.fillStyle='#1d2b45';g.font='bold 20px Arial';g.fillText('LTE',10,30);g.font='10px Arial';g.fillText('4G-ROUTER',10,46);
    for(let k=0;k<4;k++)g.fillRect(84+k*8,34-k*6,5,8+k*6);g.fillStyle='#0b0b0b';for(let k=0;k<4;k++)g.fillRect(10+k*20,64,16,14);g.fillStyle='#2cff6a';for(let k=0;k<4;k++)g.fillRect(12+k*20,84,4,3);}),
  sw:drawTex(96,80,(g,w,h)=>{g.fillStyle='#1f2226';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='bold 10px Arial';g.fillText('FIREWALL',8,16);g.fillStyle='#090909';for(let k=0;k<8;k++)g.fillRect(6+(k%4)*16,28+Math.floor(k/4)*22,13,12);
    g.fillStyle='#2cff6a';for(let k=0;k<8;k++)g.fillRect(8+(k%4)*16,24+Math.floor(k/4)*22,3,3);g.fillStyle='#8a9196';g.fillRect(72,30,16,9);g.fillRect(72,52,16,9);}),
  odf:drawTex(112,96,(g,w,h)=>{g.fillStyle='#cfd3d5';g.fillRect(0,0,w,h);g.fillStyle='#1d2b45';g.font='bold 12px Arial';g.fillText('ODF',8,18);g.font='9px Arial';g.fillText('GLASVEZEL',40,18);
    for(let k=0;k<12;k++){g.fillStyle=k<6?'#2a6fd6':'#2bb24c';g.fillRect(10+(k%6)*16,30+Math.floor(k/6)*26,11,14);}g.fillStyle='#f2c419';for(let k=0;k<4;k++)g.fillRect(13+k*16,44,5,10);}),
  doc:drawTex(64,80,(g,w,h)=>{g.fillStyle='#f6f4ec';g.fillRect(0,0,w,h);g.strokeStyle='#333';g.lineWidth=1;g.strokeRect(4,4,w-8,h-8);g.beginPath();
    for(let k=0;k<6;k++){g.moveTo(10,16+k*10);g.lineTo(30+R()*24,16+k*10);}g.moveTo(40,20);g.lineTo(40,60);g.moveTo(40,40);g.lineTo(54,40);g.stroke();g.fillStyle='#333';g.font='7px Arial';g.fillText('SCHEMA RTU',10,h-8);})};
const SRV={ledTex:ledCanvas(),t:0};
const SVM={body:mat({color:0x1a1c1f,roughness:0.6,metalness:0.4}),
  front:{srv:mat({map:rackFront('srv'),roughness:0.6,metalness:0.3}),stor:mat({map:rackFront('stor'),roughness:0.6,metalness:0.3}),net:mat({map:rackFront('net'),roughness:0.6,metalness:0.3}),blank:mat({map:rackFront('blank'),roughness:0.6,metalness:0.3})},
  rear:mat({map:rackRear(),roughness:0.6,metalness:0.3}),
  led:new THREE.MeshBasicMaterial({map:SRV.ledTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:0xffffff}),
  tile:mat({map:(()=>{const c=cnv(128),g=c.getContext('2d');g.fillStyle='#c9ccce';g.fillRect(0,0,128,128);g.strokeStyle='#9da2a6';g.lineWidth=3;g.strokeRect(1,1,126,126);return toTex(c,1,1);})(),roughness:0.7}),
  perf:mat({map:(()=>{const c=cnv(128),g=c.getContext('2d');g.fillStyle='#c4c8ca';g.fillRect(0,0,128,128);g.fillStyle='#7f868b';for(let y=10;y<120;y+=6)for(let x=10;x<120;x+=6)g.fillRect(x,y,3,3);
    g.strokeStyle='#9da2a6';g.lineWidth=3;g.strokeRect(1,1,126,126);return toTex(c,1,1);})(),roughness:0.6,metalness:0.2}),
  glass:new THREE.MeshStandardMaterial({color:0xcfe3ee,transparent:true,opacity:0.2,roughness:0.05,metalness:0.1,depthWrite:false,side:THREE.DoubleSide}),
  frame:mat({color:0x2b2e32,roughness:0.5,metalness:0.5}),
  crac:mat({color:0xe8e9e6,roughness:0.5}),
  fCrac:mat({map:drawTex(256,256,(g,w,h)=>{g.fillStyle='#e8e9e6';g.fillRect(0,0,w,h);g.fillStyle='#0e2a3a';g.fillRect(150,20,80,40);g.fillStyle='#7dffa8';g.font='bold 18px monospace';g.fillText('22,0°',158,47);
    g.fillStyle='#b9bcbd';for(let y=80;y<240;y+=8)g.fillRect(16,y,224,4);g.fillStyle='#1d2b45';g.font='bold 16px Arial';g.fillText('PRECISIEKOELING',16,44);}),roughness:0.5}),
  ups:mat({color:0x2c2f33,roughness:0.5,metalness:0.3}),
  fUps:mat({map:drawTex(128,256,(g,w,h)=>{g.fillStyle='#2c2f33';g.fillRect(0,0,w,h);g.fillStyle='#0e2a3a';g.fillRect(22,30,84,48);g.fillStyle='#7dffa8';g.font='bold 12px monospace';g.fillText('ONLINE',30,48);g.fillText('100 %',30,66);
    for(let k=0;k<4;k++){g.fillStyle=k<3?'#2cff6a':'#444';g.fillRect(26+k*20,88,8,8);}g.fillStyle='#1d1f22';for(let y=150;y<240;y+=7)g.fillRect(14,y,100,3);g.fillStyle='#e7ecf1';g.font='bold 11px Arial';g.fillText('UPS · 40 kVA',22,20);}),roughness:0.5,metalness:0.3}),
  fBat:mat({map:drawTex(128,256,(g,w,h)=>{g.fillStyle='#2c2f33';g.fillRect(0,0,w,h);g.fillStyle='#1d1f22';for(let y=60;y<240;y+=7)g.fillRect(14,y,100,3);g.fillStyle='#f2c419';g.fillRect(22,18,84,26);g.fillStyle='#111';g.font='bold 12px Arial';g.fillText('ACCU 480 V',28,36);}),roughness:0.5,metalness:0.3}),
  screen:new THREE.MeshBasicMaterial({map:drawTex(512,288,(g,w,h)=>{g.fillStyle='#0d1117';g.fillRect(0,0,w,h);g.fillStyle='#e7ecf1';g.font='bold 22px Arial';g.fillText('DATACENTER · BEWAKING',18,34);
    for(let i=0;i<16;i++){g.fillStyle=i<14?'#1e9a46':'#56616b';g.fillRect(18+(i%8)*36,56+Math.floor(i/8)*40,30,32);}
    g.fillStyle='#9fd0ff';g.font='16px monospace';['Koude gang   22,4 °C','Warme gang   34,8 °C','Luchtvocht   45 %','UPS A/B      online','Autonomie    18 min','Blussing     gereed'].forEach((s,i)=>g.fillText(s,320,64+i*26));
    g.strokeStyle='#4aa3ff';g.lineWidth=2;g.beginPath();for(let x=0;x<280;x+=8)g.lineTo(18+x,230-Math.sin(x/30)*12-R()*8);g.stroke();g.fillStyle='#9fd0ff';g.fillText('Belasting 24 u',18,270);})}),
  gas:mat({color:0xb51e22,roughness:0.4,metalness:0.3}),yellow:mat({color:0xf2c419,roughness:0.5}),
  fiber:mat({color:0xf2c419,roughness:0.6}),cat:mat({color:0x2f6fd6,roughness:0.7}),catG:mat({color:0x8a9196,roughness:0.7}),
  // RTU-kast
  encl:mat({color:0xd6d7d1,roughness:0.5,metalness:0.2}),duct:mat({color:0x8f969b,roughness:0.7}),
  mod:mat({color:0x9aa0a5,roughness:0.5}),modB:mat({color:0x24364d,roughness:0.5}),router:mat({color:0xf2f2ee,roughness:0.5}),dark:mat({color:0x22252a,roughness:0.5}),odf:mat({color:0xc8ccce,roughness:0.5}),
  mcb:mat({color:0xf4f4f0,roughness:0.5}),term:mat({color:0x9aa1a6,roughness:0.6}),termB:mat({color:0x2f6fd6,roughness:0.6}),fduct:mat({color:0xff7a1a,roughness:0.6}),sig:mat({color:0x6b7177,roughness:0.7}),
  fPsu:mat({map:RTUF.psu,roughness:0.5}),fCpu:mat({map:RTUF.cpu,roughness:0.5}),fIo:mat({map:RTUF.io,roughness:0.5}),fLte:mat({map:RTUF.lte,roughness:0.5}),fSw:mat({map:RTUF.sw,roughness:0.5}),fOdf:mat({map:RTUF.odf,roughness:0.5}),doc:mat({map:RTUF.doc,roughness:0.8}),
  flash:mat({color:0x8a5a10,emissive:0xff3a10,emissiveIntensity:0,roughness:0.3}),
  rtuOk:mat({color:0x0a2a14,emissive:0x2cff6a,emissiveIntensity:2}),rtuLte:mat({color:0x0a1430,emissive:0x2a8bff,emissiveIntensity:2}),rtuFo:mat({color:0x2a1a00,emissive:0xffa21a,emissiveIntensity:2})};
// breed bordje voor lange opschriften (het standaardplaatje is voor korte codes)
const WSIGN=new Map();
function wsign(text,parent,x,y,z,ry,w){const m=WSIGN.get(text)||WSIGN.set(text,mat({map:signTex(text,'#f3f3ee','#1d2b45',1024,128,'bold 72px Arial'),roughness:0.5})).get(text);
  const o=mesh(new THREE.PlaneGeometry(w,w/8),m,parent,x,y,z);o.rotation.y=ry;o.castShadow=false;return o;}
function facePlane(w,h,m,p,x,y,z,ry){const o=mesh(new THREE.PlaneGeometry(w,h),m,p,x,y,z);o.rotation.y=ry;o.castShadow=false;return o;}
// ---- RTU-kast in een MS-station (aanroep vanuit kiosk(); lokale coördinaten van het station)
// Wandkast tegen de binnenkant van de voorwand, front naar binnen (-z), deur open: montageplaat met DIN-rails, kabelgoten,
// voeding, RTU met I/O-kaarten, LTE-router, firewall, glasvezellas (ODF), automaten, rijgklemmen en accu's; kabels van onderen.
function kioskRTU(root,Y,KH,wrect){const E=SVM,x=0.15,zb=1.45,W=0.8,H=1.0,Dp=0.3,zf=zb-Dp,cy=Y+1.35,P=Math.PI;
  box(W,H,0.02,E.encl,root,x,cy,zb-0.01);for(const s of[-1,1]){box(0.02,H,Dp,E.encl,root,x+s*(W/2-0.01),cy,zb-Dp/2);box(W,0.02,Dp,E.encl,root,x,cy+s*(H/2-0.01),zb-Dp/2);}
  const zp=zb-0.03,zm=zp-0.006;box(W-0.08,H-0.08,0.01,MAT.galv,root,x,cy,zp);
  // kabelgoten (horizontaal tussen de rijen, verticaal aan de zijkanten)
  for(const dy of[0.41,0.135,-0.125,-0.33])box(W-0.12,0.05,0.06,E.duct,root,x,cy+dy,zm-0.03);
  for(const s of[-1,1])box(0.05,0.74,0.06,E.duct,root,x+s*0.335,cy+0.04,zm-0.03);
  const mod=(w,h,d,m,f,px,py)=>{box(w,h,d,m,root,px,py,zm-d/2);if(f)facePlane(w*0.94,h*0.94,f,root,px,py,zm-d-0.002,P);};
  for(const dy of[0.27,0.0,-0.235])box(0.6,0.035,0.008,MAT.galv,root,x,cy+dy,zm-0.004);
  // rij 1: voeding, RTU-CPU, vier I/O-kaarten, overspanningsbeveiliging
  const y1=cy+0.27;mod(0.1,0.13,0.11,E.mod,E.fPsu,x-0.24,y1);mod(0.12,0.14,0.12,E.modB,E.fCpu,x-0.12,y1);
  for(let k=0;k<4;k++)mod(0.045,0.13,0.11,E.dark,E.fIo,x-0.03+k*0.05,y1);mod(0.07,0.1,0.08,E.mod,null,x+0.22,y1);
  box(0.02,0.012,0.02,E.rtuOk,root,x-0.12,y1+0.076,zm-0.105);
  // rij 2: LTE-router met antennes en coax naar de dakantenne, firewall, glasvezellas met gele patchkabels
  const y2=cy;mod(0.17,0.12,0.05,E.router,E.fLte,x-0.2,y2);for(const s of[-1,1])cyl(0.008,0.008,0.12,MAT.black,root,x-0.2+s*0.06,y2+0.12,zm-0.03,6);
  box(0.02,0.02,0.01,E.rtuLte,root,x-0.14,y2-0.035,zm-0.055);
  mod(0.12,0.1,0.07,E.dark,E.fSw,x-0.02,y2);box(0.02,0.012,0.02,E.rtuFo,root,x-0.02,y2+0.056,zm-0.055);
  mod(0.15,0.13,0.07,E.odf,E.fOdf,x+0.17,y2);
  for(const [a,b,m] of[[[x+0.13,y2-0.03],[x+0.02,y2-0.02],E.fiber],[[x+0.15,y2-0.03],[x+0.0,y2-0.02],E.fiber],[[x-0.05,y2-0.02],[x-0.15,y2-0.03],E.cat],[[x-0.07,y2-0.02],[x-0.12,y1-0.04],E.cat]]){
    const mid=V3((a[0]+b[0])/2,Math.min(a[1],b[1])-0.06,zm-0.1);rod(V3(a[0],a[1],zm-0.075),mid,0.004,m,root,4);rod(mid,V3(b[0],b[1],zm-0.075),0.004,m,root,4);}
  rod(V3(x-0.26,y2+0.06,zm-0.03),V3(x-0.26,Y+KH,zm-0.03),0.006,MAT.black,root,5);cyl(0.035,0.035,0.55,MAT.white,root,x-0.26,Y+KH+0.47,zm-0.03,8);
  // rij 3: automaten, rijgklemmen en relais
  const y3=cy-0.235;for(let k=0;k<6;k++){box(0.017,0.085,0.065,E.mcb,root,x-0.28+k*0.018,y3,zm-0.0325);box(0.008,0.02,0.012,MAT.black,root,x-0.28+k*0.018,y3+0.005,zm-0.07);}
  for(let k=0;k<24;k++)box(0.0065,0.06,0.045,k%6===5?E.termB:E.term,root,x-0.14+k*0.0075,y3,zm-0.0225);
  for(let k=0;k<3;k++)box(0.022,0.07,0.06,E.mod,root,x+0.1+k*0.03,y3,zm-0.03);
  // accu's onderin
  for(const dx of[-0.12,0.08])box(0.15,0.075,0.07,IM.battery,root,x+dx,cy-0.42,zm-0.035);
  // invoer van onderen: glasvezel-microbuis, voeding en signaalkabels naar de schakelinstallatie
  for(const [dx,m,r] of[[0.25,E.fduct,0.012],[0.19,MAT.cable,0.012],[0.12,E.sig,0.01],[0.06,E.sig,0.01]])rod(V3(x+dx,Y+0.02,zb-0.08),V3(x+dx,cy-H/2,zb-0.08),r,m,root,6);
  // deur: scharnier rechts, staat open naar de trafokant; binnenkant schemahouder, buitenkant bordjes
  const dg=new THREE.Group();dg.position.set(x+W/2,cy,zf);dg.rotation.y=-1.95;root.add(dg);box(W,H,0.02,E.encl,dg,-W/2,0,-0.01);
  box(0.3,0.36,0.015,E.dark,dg,-W/2,-0.05,0.008);facePlane(0.24,0.3,E.doc,dg,-W/2,-0.03,0.017,0);
  facePlane(0.16,0.2,MAT.hazard,dg,-W/2,0.28,-0.022,P);wsign('RTU · SCADA',dg,-W/2,0.08,-0.022,P,0.5);box(0.03,0.12,0.03,MAT.black,dg,-W+0.06,0,-0.03);
  wrect(x-W/2-0.02,zf-0.03,x+W/2+0.02,zb);wrect(x+W/2-0.02,zf-0.76,x+W/2+0.33,zf);}
// ---- datacenter: gebouw SRV (zie BUILDINGS), aangeroepen vanuit buildInterior()
function buildServerRoom(r){if(!r)return;const Y=r.y0,E=SVM,S=staticRoot,cx=(r.x0+r.x1)/2,P=Math.PI,RECT=(...a)=>DISTRICT_RECTS.push(a);
  groundQuad(r.x0+0.2,r.z0+0.2,r.x1-0.2,r.z1-0.2,Y+0.02,E.tile,0.6);
  // twee rijen van acht racks (600 × 1200 mm, 47U) met de fronten naar de koude gang; geperforeerde vloertegels in de gang
  const N=8,RW=0.6,RD=1.07,RH=2.2,xa=r.x0+1.7,xA=xa-RW/2,xB=xa+(N-1)*RW+RW/2,zA=49.7,zB=52.7,fA=zA+RD/2,fB=zB-RD/2,gz=(fA+fB)/2,gW=fB-fA,ym=Y+0.02+RH/2;
  groundQuad(xA,fA,xB,fB,Y+0.026,E.perf,0.6);
  const rows=[[zA,1,[['SCADA A','srv'],['SCADA B','srv'],['HISTORIAN','stor'],['FRONT-END 1','srv'],['FRONT-END 2','srv'],['NETWERK','net'],['GLASVEZEL ODF','net'],['LTE-GATEWAY','net']]],
    [zB,-1,[['DOMEIN · AD','srv'],['BACK-UP','stor'],['OPSLAG','stor'],['TIJD · GPS','net'],['FIREWALL','net'],['BEHEER · KVM','srv'],['RESERVE','blank'],['RESERVE','blank']]]];
  for(const [rz,face,list] of rows){list.forEach(([nm,kind],i)=>{const x=xa+i*RW,zf=rz+face*RD/2,ry=face>0?0:P;
      box(RW-0.01,RH,RD,E.body,S,x,ym,rz);facePlane(RW-0.04,RH-0.1,E.front[kind],S,x,ym,zf+face*0.003,ry);
      if(kind!=='blank'){const l=facePlane(RW-0.04,RH-0.1,E.led,S,x,ym,zf+face*0.006,ry);l.renderOrder=2;}
      facePlane(RW-0.04,RH-0.1,E.rear,S,x,ym,rz-face*(RD/2+0.003),ry+P);plate(nm,S,x,Y+RH-0.13,zf+face*0.01,ry,0.34);
      if(i%3===1)box(0.05,0.05,0.02,MAT.white,S,x+0.2,Y+1.75,zf+face*0.012);});
    RECT(xA,rz-RD/2,xB,rz+RD/2);}
  // koude-gang-insluiting: glazen dak en schuifdeuren; west dicht, oost open (beide deuren naar één kant geschoven)
  const roof=mesh(new THREE.PlaneGeometry(xB-xA,gW),E.glass,S,(xA+xB)/2,Y+RH+0.03,gz);roof.rotation.x=-P/2;roof.castShadow=false;
  for(let k=0;k<=4;k++)box(0.04,0.04,gW,E.frame,S,xA+k*(xB-xA)/4,Y+RH+0.03,gz);for(const z of[fA,fB])box(xB-xA,0.05,0.04,E.frame,S,(xA+xB)/2,Y+RH+0.03,z);
  const pw=gW/2-0.03,ph=RH-0.2;
  for(const [ex,open] of[[xA-0.05,false],[xB+0.05,true]]){for(const z of[fA,fB])box(0.06,RH,0.06,E.frame,S,ex,ym,z);box(0.06,0.12,gW,E.frame,S,ex,Y+RH-0.04,gz);
    (open?[fB-pw/2-0.04,fB-pw/2-0.08]:[fA+pw/2+0.03,fB-pw/2-0.03]).forEach((z,k)=>{const ox=ex+(k?0.025:-0.025),oy=Y+0.04+ph/2;
      const g=mesh(new THREE.PlaneGeometry(pw,ph),E.glass,S,ox,oy,z);g.rotation.y=P/2;g.castShadow=false;
      for(const s of[-1,1])box(0.03,ph,0.03,E.frame,S,ox,oy,z+s*pw/2);box(0.03,0.03,pw,E.frame,S,ox,Y+0.06,z);box(0.04,0.3,0.025,MAT.galv,S,ox+(open?0.03:-0.03),Y+1.1,z+(k?pw/2-0.08:-pw/2+0.08));});
    wsign('KOUDE GANG',S,ex+(open?0.04:-0.04),Y+RH+0.14,gz,open?P/2:-P/2,1.0);
    RECT(ex-0.06,open?fB-pw-0.12:fA,ex+0.06,fB);}
  // kabelladders boven de rijen met kabelbundels en afgangen naar de racks; gele glasvezelgoot erboven
  const L=xB-xA+0.4,mx=(xA+xB)/2,yl=Y+2.62;
  for(const [rz,face] of[[zA,1],[zB,-1]]){for(const s of[-1,1])box(L,0.07,0.02,MAT.galv,S,mx,yl,rz+s*0.22);
    for(let k=0;k<=Math.floor(L/0.3);k++)box(0.025,0.02,0.44,MAT.galv,S,mx-L/2+k*0.3,yl-0.03,rz);
    for(const [dz,rr,m] of[[-0.1,0.045,E.cat],[0.0,0.04,E.catG],[0.11,0.035,MAT.cable]])rod(V3(mx-L/2,yl+0.02,rz+dz),V3(mx+L/2,yl+0.02,rz+dz),rr,m,S,8);
    for(const hx of[mx-L/2+0.3,mx,mx+L/2-0.3])for(const s of[-1,1])rod(V3(hx,yl,rz+s*0.22),V3(hx,r.y1,rz+s*0.22),0.01,MAT.galv,S,5);
    for(let i=0;i<N;i++)rod(V3(xa+i*RW,yl-0.02,rz-face*0.3),V3(xa+i*RW,Y+RH+0.02,rz-face*0.3),0.03,i%2?E.cat:E.catG,S,6);
    box(L,0.08,0.15,E.fiber,S,mx,Y+2.9,rz-face*0.32);
    for(const i of face>0?[5,6,7]:[3,4])rod(V3(xa+i*RW+0.15,Y+2.86,rz-face*0.32),V3(xa+i*RW+0.15,Y+RH+0.02,rz-face*0.32),0.025,E.fiber,S,6);}
  // precisiekoeling langs de oostwand
  for(const [cz,nm] of[[49.6,'KOELING A'],[53.0,'KOELING B']]){box(0.9,2.0,1.8,E.crac,S,r.x1-0.45,Y+1.0,cz);facePlane(1.7,1.9,E.fCrac,S,r.x1-0.905,Y+1.0,cz,-P/2);
    wsign(nm,S,r.x1-0.91,Y+2.2,cz,-P/2,1.1);RECT(r.x1-0.95,cz-0.9,r.x1,cz+0.9);}
  // UPS en accukasten langs de noordwand, UPS-verdeler aan de wand
  [['UPS A',E.fUps],['UPS B',E.fUps],['ACCU A',E.fBat],['ACCU B',E.fBat]].forEach(([nm,f],k)=>{const x=-31.45-k*0.85;box(0.8,1.9,0.9,E.ups,S,x,Y+0.97,r.z1-0.45);
    facePlane(0.74,1.84,f,S,x,Y+0.97,r.z1-0.905,P);plate(nm,S,x,Y+2.02,r.z1-0.9,P,0.3);});
  RECT(-34.45,r.z1-0.95,-31.0,r.z1);
  box(0.9,1.4,0.25,MAT.cabinet,S,-29.9,Y+1.3,r.z1-0.125);wsign('UPS-VERDELER',S,-29.9,Y+2.12,r.z1-0.01,P,0.9);
  for(const dx of[-0.3,0,0.3])rod(V3(-29.9+dx,Y+2.0,r.z1-0.12),V3(-29.9+dx,r.y1,r.z1-0.12),0.03,MAT.galv,S,6);RECT(-30.4,r.z1-0.3,-29.4,r.z1);
  // gasblussing (INERGEN): flessenbatterij met verzamelleiding, stijgleiding en sproeiers aan het plafond
  for(let i=0;i<6;i++){const x=r.x0+0.25+(i%3)*0.3,z=r.z1-0.25-Math.floor(i/3)*0.32;cyl(0.13,0.13,1.5,E.gas,S,x,Y+0.77,z,12);cyl(0.045,0.045,0.12,MAT.black,S,x,Y+1.58,z,8);
    rod(V3(x,Y+1.64,z),V3(x,Y+1.76,z),0.012,MAT.galv,S,5);}
  for(const z of[r.z1-0.25,r.z1-0.57])rod(V3(r.x0+0.15,Y+1.76,z),V3(r.x0+0.95,Y+1.76,z),0.025,E.gas,S,8);
  const yc=r.y1-0.3,gx=r.x0+0.95;rod(V3(gx,Y+1.76,r.z1-0.57),V3(gx,Y+1.76,r.z1-0.25),0.025,E.gas,S,8);
  rod(V3(gx,Y+1.76,r.z1-0.4),V3(gx,yc,r.z1-0.4),0.03,E.gas,S,8);rod(V3(gx,yc,r.z1-0.4),V3(gx,yc,gz),0.03,E.gas,S,8);rod(V3(gx,yc,gz),V3(r.x1-1.5,yc,gz),0.03,E.gas,S,8);
  for(const nx of[-39,-36,-33,-30]){cyl(0.025,0.025,0.14,E.gas,S,nx,yc-0.09,gz,8);cyl(0.05,0.05,0.03,MAT.galv,S,nx,yc-0.17,gz,10);}
  wsign('INERGEN · GASBLUSSING',S,r.x0+0.55,Y+2.05,r.z1-0.02,P,1.1);RECT(r.x0,r.z1-0.75,r.x0+1.0,r.z1);
  // rookaanzuiging (VESDA) met rode aanzuigleidingen boven de rijen, rookmelders aan het plafond
  const vx=-38.4,yv=r.y1-0.6;box(0.4,0.32,0.14,MAT.white,S,vx,Y+1.55,r.z0+0.07);box(0.22,0.07,0.01,E.dark,S,vx,Y+1.6,r.z0+0.145);
  rod(V3(vx,Y+1.71,r.z0+0.07),V3(vx,yv,r.z0+0.07),0.015,E.gas,S,6);rod(V3(vx,yv,r.z0+0.07),V3(vx,yv,zB),0.015,E.gas,S,6);
  for(const z of[zA,zB]){rod(V3(xA,yv,z),V3(xB,yv,z),0.015,E.gas,S,6);for(let x=xA+0.4;x<xB;x+=1.2)cyl(0.008,0.008,0.05,E.gas,S,x,yv-0.03,z,5);}
  plate('VESDA',S,vx,Y+1.8,r.z0+0.02,0,0.24);
  for(const x of[-39,-35,-31,-28])for(const z of[48,51.2,54.2])cyl(0.06,0.06,0.04,MAT.white,S,x,r.y1-0.02,z,12);
  // bij de deur: waarschuwing gasblussing met flitslicht, blusknop, nood-uit en pasjeslezer
  wsign('GASBLUSSING · BIJ ALARM DIRECT VERLATEN',S,-36,Y+2.8,r.z0+0.02,0,2.2);box(0.2,0.14,0.08,E.gas,S,-36,Y+3.05,r.z0+0.04);box(0.12,0.06,0.02,E.flash,S,-36,Y+3.05,r.z0+0.085);
  box(0.14,0.18,0.06,E.yellow,S,-33.9,Y+1.4,r.z0+0.03);plate('BLUSSEN',S,-33.9,Y+1.58,r.z0+0.02,0,0.2);
  box(0.14,0.14,0.06,IM.redBtn,S,-33.6,Y+1.4,r.z0+0.03);plate('NOOD-UIT',S,-33.6,Y+1.58,r.z0+0.02,0,0.2);
  box(0.08,0.12,0.03,MAT.black,S,-37.35,Y+1.25,r.z0+0.02);
  // bewakingsscherm aan de zuidwand
  box(1.5,0.88,0.05,MAT.black,S,-31.0,Y+2.0,r.z0+0.03);iplane(1.42,0.8,E.screen,-31.0,Y+2.0,r.z0+0.057,0);
  // bedienplek met twee schermen en een stoel
  const dx=r.x1-2.6,dz=r.z0+0.9;box(1.6,0.05,0.7,IM.wood,S,dx,Y+0.75,dz);for(const s of[-0.7,0.7])box(0.05,0.73,0.6,MAT.galvDark,S,dx+s,Y+0.37,dz);RECT(dx-0.85,dz-0.4,dx+0.85,dz+0.4);
  if(deskScreens)deskScreens.forEach((s,i)=>{const x=dx-0.38+i*0.76;box(0.7,0.43,0.04,MAT.black,S,x,Y+1.18,dz-0.25);iplane(0.64,0.4,new THREE.MeshBasicMaterial({map:s.t}),x,Y+1.18,dz-0.228,0);});
  box(0.5,0.08,0.5,E.dark,S,dx,Y+0.48,dz+0.75);box(0.5,0.55,0.06,E.dark,S,dx,Y+0.8,dz+1.0);cyl(0.03,0.03,0.4,MAT.galvDark,S,dx,Y+0.25,dz+0.75,8);
  wsign('SCADA · DATACENTER',S,cx,Y+3.4,r.z1-0.02,P,3.2);}
// ---- elke frame: LEDs knipperen (patroon verschuift); rood als de SCADA-verbinding is weggevallen (cyberaanval)
// na de brand: roet op racks en kasten, geen LEDs meer
const dcMats=()=>[...Object.values(SVM.front),SVM.rear,SVM.body,SVM.fUps,SVM.fBat,SVM.ups,SVM.crac,SVM.fCrac];
function dcBurnt(){if(SRV.burnt)return;SRV.burnt=true;SRV.orig=dcMats().map(m=>m.color.getHex());dcMats().forEach(m=>m.color.setHex(0x3c3835));SVM.led.opacity=0;}
function dcRestore(){if(!SRV.burnt)return;SRV.burnt=false;dcMats().forEach((m,i)=>m.color.setHex(SRV.orig[i]));SVM.led.opacity=1;}
function serverTick(dt){SVM.flash.emissiveIntensity=GAME.flags.dcAlarm&&performance.now()%700<300?5:0;SRV.t+=dt;if(SRV.t<0.22)return;SRV.t=0;const down=GAME.flags.scadaDown===true;
  SRV.ledTex.offset.y=Math.floor(Math.random()*8)/8;SVM.led.color.setHex(down?0xff3030:0xffffff);
  const b=performance.now()%1000<500;SVM.rtuOk.emissive.setHex(down?0xff2020:0x2cff6a);SVM.rtuOk.emissiveIntensity=b?2.5:0.6;SVM.rtuLte.emissiveIntensity=down?0:(Math.random()<0.5?2.5:0.5);SVM.rtuFo.emissiveIntensity=down?0:Math.random()<0.6?2.5:0.6;}
