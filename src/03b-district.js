
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
function houseRow(x0,z,n,faceSouth){const W=6,Dp=9,H=5.6,len=n*W,cx=x0+len/2,v=Math.floor(R()*3);
  box(len,H,Dp,DM.brick[v],staticRoot,cx,H/2,z);
  for(let i=0;i<n;i++){const x=x0+W/2+i*W;for(const s of[-1,1]){const p=mesh(new THREE.PlaneGeometry(W-0.1,H),DM.facades[(v+i)%3],staticRoot,x,H/2,z+s*(Dp/2+0.02));p.rotation.y=s>0?0:Math.PI;p.castShadow=false;}}
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
function kiosk(s){const [x,z]=s.pos,root=grp(x,z);root.rotation.y=[Math.PI,-Math.PI/2,0][s.face];
  box(3.4,2.5,2.4,DM.kiosk,root,0,1.25,0);box(3.7,0.18,2.7,MAT.concreteDark,root,0,2.59,0);box(3.5,0.25,2.5,MAT.concreteDark,root,0,0.12,0);
  for(const dx of[-0.85,0.85]){box(1.0,2.0,0.05,MAT.door,root,dx,1.15,1.22);box(0.03,0.2,0.05,MAT.trim,root,dx+(dx<0?0.38:-0.38),1.15,1.26);}
  const hz=mesh(new THREE.PlaneGeometry(0.32,0.4),MAT.hazard,root,-0.85,1.6,1.25);hz.castShadow=false;
  plate(s.id,root,0.85,1.75,1.25,0,0.42);
  for(const sx of[-1,1]){const lv=mesh(new THREE.PlaneGeometry(1.2,0.5),MAT.louvre,root,sx*1.71,1.9,0);lv.rotation.y=sx*Math.PI/2;lv.castShadow=false;}
  const nm=toTex(textCanvas(s.name,{w:512,h:96,bg:'#f3f3ee',fg:'#1d2b45',font:'bold 46px Arial',border:false}));const np=mesh(new THREE.PlaneGeometry(1.5,0.28),mat({map:nm,roughness:0.5}),root,0,2.3,1.22);np.castShadow=false;
  const fl=mat({color:0x331a00,emissive:0xff8a00,emissiveIntensity:0});const lamp=cyl(0.09,0.09,0.16,fl,root,1.3,2.76,0.9,12);lamp.userData.dyn=true;
  regView(s.id,root,()=>{fl.emissiveIntensity=s.flag&&(performance.now()%900<450)?4:0;},{labelPos:V3(x,3.6,z)});
  const w=s.face===1?[2.6,3.8]:[3.8,2.6];DISTRICT_RECTS.push([x-w[0]/2,z-w[1]/2,x+w[0]/2,z+w[1]/2]);}
function streetLight(x,z){cyl(0.06,0.09,7,MAT.galv,staticRoot,x,3.5,z,8);box(0.7,0.12,0.25,MAT.lamp,staticRoot,x+0.3,7,z);}
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
  RING.stations.forEach(kiosk);
}
