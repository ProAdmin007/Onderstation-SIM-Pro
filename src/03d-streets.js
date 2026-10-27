
// ============================================================ straatbeeld: stoepen, klinkers, belijning, voortuinen, schuttingen, daken met pannen en zonnepanelen
// Alles statisch en procedureel: bakeStatic voegt het per materiaal samen, dus het kost weinig extra rekenkracht.
function tileCanvas(){const c=cnv(256),g=c.getContext('2d');g.fillStyle='#8e8c85';g.fillRect(0,0,256,256);noiseFill(g,256,16);
  g.strokeStyle='rgba(60,58,54,0.55)';g.lineWidth=2;for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke();}return c;}
function paverCanvas(){const c=cnv(256),g=c.getContext('2d');g.fillStyle='#5a4a42';g.fillRect(0,0,256,256);   // gebakken klinkers in keperverband
  for(let y=0;y<256;y+=16)for(let x=-32;x<256;x+=32){const off=(y/16)%2?16:0,h=110+R()*35;g.fillStyle=`rgb(${h},${h*0.55|0},${h*0.45|0})`;
    if((x/32+y/16)%2)g.fillRect(x+off+1,y+1,30,14);else g.fillRect(x+off+1,y+1,14,14),g.fillRect(x+off+17,y+1,14,14);}
  noiseFill(g,256,18);return c;}
function roofTileCanvas(col){const c=cnv(256),g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,256,256);   // gegolfde dakpannen
  for(let y=0;y<256;y+=21){for(let x=0;x<256;x+=32){const gr=g.createLinearGradient(x,0,x+32,0);gr.addColorStop(0,'rgba(0,0,0,0.28)');gr.addColorStop(0.5,'rgba(255,255,255,0.10)');gr.addColorStop(1,'rgba(0,0,0,0.28)');
    g.fillStyle=gr;g.fillRect(x,y,32,21);}g.fillStyle='rgba(0,0,0,0.45)';g.fillRect(0,y+19,256,2);}noiseFill(g,256,10);return c;}
function pvCanvas(){const c=cnv(128,192),g=c.getContext('2d');g.fillStyle='#c9ccd0';g.fillRect(0,0,128,192);g.fillStyle='#14203a';g.fillRect(4,4,120,184);
  g.strokeStyle='rgba(140,160,200,0.35)';g.lineWidth=1;for(let x=4;x<124;x+=20){g.beginPath();g.moveTo(x,4);g.lineTo(x,188);g.stroke();}for(let y=4;y<188;y+=20){g.beginPath();g.moveTo(4,y);g.lineTo(124,y);g.stroke();}
  const gr=g.createLinearGradient(0,0,128,192);gr.addColorStop(0,'rgba(255,255,255,0.18)');gr.addColorStop(0.5,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(4,4,120,184);return c;}
const SM={
  tiles:mat({map:toTex(tileCanvas()),roughness:0.95}),pavers:mat({map:toTex(paverCanvas()),roughness:0.95}),
  curb:mat({color:0xbab7ae,roughness:0.9}),line:mat({color:0xe8e8e2,roughness:0.7}),
  roofs:['#3b3f44','#7a3b2a','#2e3236'].map(c=>mat({map:toTex(roofTileCanvas(c),0.5,0.5),roughness:0.85})),
  pv:mat({map:toTex(pvCanvas()),roughness:0.25,metalness:0.4}),gutter:mat({color:0x2a2c2e,roughness:0.5,metalness:0.4}),
  hedge:mat({map:toTex(C.grass,0.5,0.5),color:0x6f9a48,roughness:1}),wood:mat({color:0x6b4f36,roughness:0.95}),woodGrey:mat({color:0x8a8478,roughness:0.95}),
  bin:[0x2d5a2d,0x3a3f45,0x6a5a2a].map(c=>mat({color:c,roughness:0.6})),shedRoof:mat({color:0x232527,roughness:0.8}),
  balcony:mat({color:0xcfcac0,roughness:0.85}),rail:mat({color:0x9fb4c2,roughness:0.15,metalness:0.3,transparent:true,opacity:0.55}),
  dormer:mat({color:0xe9e6de,roughness:0.6}),glass:mat({color:0x2b3a47,roughness:0.15,metalness:0.5}),
  frame:mat({color:0xf1efe8,roughness:0.6}),bike:mat({color:0x1d2124,roughness:0.5,metalness:0.4}),bikeCol:[0x2f6db3,0x8a1c1c,0x2d4a2d,0xd9d4c8].map(c=>mat({color:c,roughness:0.45,metalness:0.3})),
  car:[0xb8bec4,0x1c2a3a,0x8a1c1c,0xe8e8e4,0x2d4a2d,0x3a3f45,0x6a5232].map(c=>mat({color:c,roughness:0.35,metalness:0.55})),carGlass:mat({color:0x1a242c,roughness:0.15,metalness:0.6}),tyre:mat({color:0x111111,roughness:0.9})};

// ---- stoep met stoeprand langs een straat (horizontaal: langs x, verticaal: langs z)
function sidewalk(x0,z0,x1,z1,curbSide){lay('stoep',x0,z0,x1,z1);groundQuad(x0,z0,x1,z1,0.1,SM.tiles,2);const along=x1-x0>z1-z0;
  const cz=curbSide==='-'?(along?z0:x0):(along?z1:x1);
  if(along)box(x1-x0,0.12,0.18,SM.curb,staticRoot,(x0+x1)/2,0.06,cz);else box(0.18,0.12,z1-z0,SM.curb,staticRoot,cz,0.06,(z0+z1)/2);}
// stoepen aan beide kanten van een rechte straat, met onderbrekingen bij kruisingen
// een onderbreking geldt voor beide kanten, of alleen voor de lage ('lo') of hoge ('hi') kant: bij een T-kruising loopt de stoep aan de overkant door
function streetSidewalks(a,b,c0,c1,horiz,gaps){for(const side of['lo','hi']){const segs=[];let s=a;
    for(const [g0,g1] of gaps.filter(g=>!g[2]||g[2]===side).sort((p,q)=>p[0]-q[0])){if(g0>s)segs.push([s,g0]);s=Math.max(s,g1);}if(s<b)segs.push([s,b]);
    for(const [p,q] of segs){if(side==='lo'){if(horiz)sidewalk(p,c0-2,q,c0,'+');else sidewalk(c0-2,p,c0,q,'+');}else{if(horiz)sidewalk(p,c1,q,c1+2,'-');else sidewalk(c1,p,c1+2,q,'-');}}}}
// onderbroken middenstreep
function centerLine(a,b,c,horiz,gaps=[]){for(let t=a+2;t<b-3;t+=9){if(gaps.some(([g0,g1])=>t+3>g0&&t<g1))continue;const m=groundQuad(horiz?t:c-0.06,horiz?c-0.06:t,horiz?t+3:c+0.06,horiz?c+0.06:t+3,0.05,SM.line,1);m.receiveShadow=true;}}
// MS-stations staan op vaste plekken: daar geen parkeerstrook of auto
const kioskNear=(x,z,mx=4.6,mz=3.6)=>RING.stations.some(s=>Math.abs(s.pos[0]-x)<mx&&Math.abs(s.pos[1]-z)<mz);
// strook langs x van a tot b, met openingen bij MS-stations
function stripSegs(a,b,z0,z1){const cut=RING.stations.filter(s=>s.pos[1]>z0-3.5&&s.pos[1]<z1+3.5).map(s=>[s.pos[0]-3.4,s.pos[0]+3.4]).sort((p,q)=>p[0]-q[0]),out=[];let s=a;
  for(const [c0,c1] of cut){if(c1<a||c0>b)continue;if(c0>s)out.push([s,c0]);s=Math.max(s,c1);}if(s<b)out.push([s,b]);return out;}
// geparkeerde auto (statisch, kijkt langs de straat)
function parkedCar(x,z,along,i){if(kioskNear(x,z)||!layFree(along?[x-2.2,z-1,x+2.2,z+1]:[x-1,z-2.2,x+1,z+2.2],['road'],0))return;const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=along?Math.PI/2+(i%2?Math.PI:0):(i%2?Math.PI:0);staticRoot.add(g);
  box(1.8,0.7,4.2,SM.car[i%SM.car.length],g,0,0.6,0);box(1.6,0.6,2.2,SM.carGlass,g,0,1.2,-0.2);
  for(const [wx,wz] of[[-0.85,1.3],[0.85,1.3],[-0.85,-1.3],[0.85,-1.3]])cyl(0.33,0.33,0.25,SM.tyre,g,wx,0.33,wz,10).rotation.z=Math.PI/2;
  DISTRICT_RECTS.push(along?[x-2.2,z-1,x+2.2,z+1]:[x-1,z-2.2,x+1,z+2.2]);lay('car',...(along?[x-2.2,z-1,x+2.2,z+1]:[x-1,z-2.2,x+1,z+2.2]));}

// ---- per woning: voortuin met heg en tuinpad, kliko, schutting tussen de achtertuinen; dak: goten, zonnepanelen of dakkapel
function houseExtras(x0,z,n,faceSouth,W,Dp,H,v){const f=faceSouth?1:-1,len=n*W,fz=z+f*Dp/2,bz=z-f*Dp/2,ang=Math.atan2(3.4,Dp/2+0.4);
  // dakgoten aan beide kanten
  for(const s of[-1,1])box(len+0.4,0.14,0.16,SM.gutter,staticRoot,x0+len/2,H+0.02,z+s*(Dp/2+0.42));
  for(let i=0;i<n;i++){const x=x0+W/2+i*W,door=x+f*1.44,r=R();
    // voortuin: heg langs de straatkant (opening bij het pad), tuinpad van tegels, kliko naast de deur
    const gz=fz+f*4.2,hl=door-0.6-(x-W/2),hr=x+W/2-(door+0.6),free=(cx,l)=>!RING.stations.some(s=>Math.abs(s.pos[0]-cx)<l/2+3&&Math.abs(s.pos[1]-gz)<2.5);   // niet door een MS-station heen
    if(free(x-W/2+hl/2,hl)){box(hl,0.85,0.5,SM.hedge,staticRoot,x-W/2+hl/2,0.43,gz);lay('hedge',x-W/2,gz-0.25,x-W/2+hl,gz+0.25);}if(free(door+0.6+hr/2,hr)){box(hr,0.85,0.5,SM.hedge,staticRoot,door+0.6+hr/2,0.43,gz);lay('hedge',door+0.6,gz-0.25,door+0.6+hr,gz+0.25);}
    groundQuad(door-0.6,Math.min(fz,gz),door+0.6,Math.max(fz,gz),0.06,SM.tiles,2);
    box(0.6,1.0,0.7,SM.bin[(i+v)%3],staticRoot,door+(door>x?-1.1:1.1),0.5,fz+f*0.6);
    // achtertuin: schutting tussen de tuinen en achterlangs
    const tz=bz-f*7.6;box(0.06,1.8,7.6,SM.wood,staticRoot,x0+i*W,0.9,bz-f*3.8);
    box(W,1.8,0.06,i%2?SM.wood:SM.woodGrey,staticRoot,x,0.9,tz);
    // dak: ±1 op 3 zonnepanelen (zuidkant), soms een dakkapel aan de andere kant
    const south=1,pvSide=r<0.38?south:0,dorm=r>0.72?-south:0;
    if(pvSide){const p=new THREE.Group();p.position.set(x,H+1.7+0.06,z+pvSide*2.45);p.rotation.x=pvSide*ang;staticRoot.add(p);
      const pm=mesh(new THREE.PlaneGeometry(W-1.3,3.6),SM.pv,p,0,0.05,0);pm.rotation.x=-Math.PI/2;pm.castShadow=false;}
    if(dorm){const d=new THREE.Group();d.position.set(x,H+0.9,z+dorm*2.6);staticRoot.add(d);
      box(2.6,1.5,2.4,SM.dormer,d,0,0.75,0);box(2.9,0.12,2.7,SM.shedRoof,d,0,1.55,0);const w=mesh(new THREE.PlaneGeometry(2.0,0.9),SM.glass,d,0,0.8,dorm*1.21);w.rotation.y=dorm>0?0:Math.PI;w.castShadow=false;}}
  // ook een schutting aan het eind van de rij
  box(0.06,1.8,7.6,SM.wood,staticRoot,x0+len,0.9,bz-f*3.8);
  // achterpad van tegels langs de achterschuttingen
  const tz=bz-f*7.6;groundQuad(x0,Math.min(tz,tz-f*1.3),x0+len,Math.max(tz,tz-f*1.3),0.05,SM.tiles,2);
  // kopgevels: ramen op de begane grond, de verdieping en een zolderraampje in de punt
  for(const [gx,ry] of[[x0-0.03,-Math.PI/2],[x0+len+0.03,Math.PI/2]])for(const [wz,wy,ww,wh] of[[z-1.6,1.5,1.3,1.3],[z+1.4,4.0,1.2,1.2],[z,H+1.3,0.8,0.8]]){
    const fr=mesh(new THREE.PlaneGeometry(ww+0.16,wh+0.16),SM.frame,staticRoot,gx,wy,wz);fr.rotation.y=ry;fr.castShadow=false;
    const gl=mesh(new THREE.PlaneGeometry(ww,wh),SM.glass,staticRoot,gx+(ry>0?0.01:-0.01),wy,wz);gl.rotation.y=ry;gl.castShadow=false;}
  for(let i=0;i<n;i++){const x=x0+W/2+i*W,door=x+f*1.44;
    // luifel boven de voordeur
    box(1.6,0.08,0.7,SM.shedRoof,staticRoot,door,2.35,fz+f*0.35);
    // hoekwoningen: erker op de begane grond
    if(i===0||i===n-1){const ex=x-f*1.4;box(2.6,2.4,0.9,DM.brick[v],staticRoot,ex,1.2,fz+f*0.45);box(2.8,0.16,1.1,SM.shedRoof,staticRoot,ex,2.48,fz+f*0.5);
      const g=mesh(new THREE.PlaneGeometry(2.2,1.3),SM.glass,staticRoot,ex,1.45,fz+f*0.915);g.rotation.y=f>0?0:Math.PI;g.castShadow=false;}
    // fiets tegen de gevel (ongeveer een op de drie huizen)
    if(R()<0.36){const bx=door+(door>x?0.95:-0.95),bzz=fz+f*0.55,c=SM.bikeCol[(i+v)%4];
      for(const dx of[-0.5,0.5]){const w=mesh(new THREE.TorusGeometry(0.32,0.025,6,18),SM.bike,staticRoot,bx+dx,0.34,bzz);w.castShadow=false;}
      box(1.0,0.05,0.05,c,staticRoot,bx,0.62,bzz);const st=box(0.05,0.5,0.05,c,staticRoot,bx-0.18,0.55,bzz);st.rotation.z=-0.35;
      box(0.22,0.05,0.12,SM.bike,staticRoot,bx-0.26,0.84,bzz);box(0.05,0.05,0.5,SM.bike,staticRoot,bx+0.4,0.92,bzz);}}}

// ---- kast langs de straat (LS-verdeelkast, kabelkast): direct achter de stoep aan de kant van de huizen, evenwijdig aan de straat,
// met de deur naar de stoep. Staat daar iets (heg, tuinpad, boom, lantaarn), dan schuift hij langs de stoep op.
const CURB_AVOID=['truck','house','apt','hall','small','kiosk','hedge','shed','tree','lamp','kast','kk','car','road','woonerf','parkeer','halte','stoep','plein','laad'];
function curbPlace(x,z,w=0.9,d=0.38){const strips=LAYOUT.filter(e=>e.kind==='stoep').map(e=>{const [x0,z0,x1,z1]=e.r,h=x1-x0>=z1-z0,cx=clamp(x,x0,x1),cz=clamp(z,z0,z1);return {e,h,dist:Math.hypot(cx-x,cz-z)};}).sort((a,b)=>a.dist-b.dist);
  const roadAt=(px,pz)=>LAYOUT.some(o=>o.kind==='road'&&px>o.r[0]&&px<o.r[2]&&pz>o.r[1]&&pz<o.r[3]);
  for(const s of strips.slice(0,6)){const [x0,z0,x1,z1]=s.e.r;
    // welke kant ligt de weg? de andere kant is de achterkant van de stoep
    const roadLow=s.h?roadAt((x0+x1)/2,z0-1.5):roadAt(x0-1.5,(z0+z1)/2),out=roadLow?1:-1,c=s.h?(roadLow?z1:z0):(roadLow?x1:x0),cc=c+out*(d/2+0.3);
    const a0=s.h?x0:z0,a1=s.h?x1:z1,a=clamp(s.h?x:z,a0+1,a1-1),ry=s.h?(roadLow?Math.PI:0):(roadLow?-Math.PI/2:Math.PI/2);
    for(let k=0;k<40;k++){const off=(k%2?1:-1)*Math.ceil(k/2)*1.2,aa=a+off;if(aa<a0+0.8||aa>a1-0.8)continue;
      const px=s.h?aa:cc,pz=s.h?cc:aa,hw=(s.h?w:d)/2,hd=(s.h?d:w)/2;
      if(layFree([px-hw,pz-hd,px+hw,pz+hd],CURB_AVOID,0.15))return {x:px,z:pz,ry,r:[px-hw,pz-hd,px+hw,pz+hd]};}}
  return {x,z,ry:0,r:[x-w/2,z-d/2,x+w/2,z+d/2]};}
// ---- straten aankleden
function dressStreets(){
  // woonwijk: hoofdstraten (asfalt) met stoepen en middenstreep
  // stoepen onderbroken bij de zijstraten en de hoofdweg (x 22–28); de stoepen van de zijstraten lopen door tot de rand van de rijbaan
  streetSidewalks(-150,165,98,104,true,[[-102,-92,'hi'],[21,29],[58,68,'hi']]);streetSidewalks(-150,165,236,242,true,[[-102,-92,'lo'],[21,29],[58,68,'lo']]);
  streetSidewalks(104,236,-100,-94,false,[[156,167]]);streetSidewalks(104,236,60,66,false,[]);
  const X1=[[-102,-92],[20,30],[58,68]];centerLine(-150,165,101,true,X1);centerLine(-150,165,239,true,X1);
  // nieuwe woonstraat met klinkers tussen de rijen die met de voorkant naar elkaar toe staan (woonerf, geen stoep)
  // (z 157,5–165,5: MS2 staat ernaast aan de noordkant)
  groundQuad(-94,157.5,36,165.5,0.045,SM.pavers,4);lay('woonerf',-94,157.5,36,165.5);for(const z of[157.5,165.5]){box(115,0.12,0.18,SM.curb,staticRoot,-36.5,0.06,z);box(7,0.12,0.18,SM.curb,staticRoot,32.5,0.06,z);}   // onderbroken bij de hoofdweg
  for(let x=-82,i=0;x<30;x+=7.5,i++)if(i%3!==1)parkedCar(x,i%2?159.4:163.6,true,i);
  for(let x=-80;x<34;x+=24)streetLight(x,157);
  for(let x=-70;x<34;x+=24)tree(x,166.6,0.75,false);
  // centrum: stoepen langs alle straten, parkeren langs de flats
  streetSidewalks(-130,200,270,276,true,[[-66,-56,'hi'],[21,29],[104,114,'hi']]);streetSidewalks(-130,200,384,390,true,[[-66,-56,'lo'],[21,29],[104,114,'lo']]);
  streetSidewalks(276,384,-64,-58,false,[]);streetSidewalks(276,384,106,112,false,[]);
  const X2=[[-66,-56],[20,30],[104,114]];centerLine(-130,200,273,true,X2);centerLine(-130,200,387,true,X2);
  // winkelstraat: parkeerstrook en een brede stoep voor de winkels; tussen de flats een parkeerterrein, achter de flats een plein van tegels
  for(const [a,b] of[[-125,-66],[-56,8]]){groundQuad(a,278,b,282.5,0.07,SM.tiles,2);   // tegels onder de strook: bij een MS-station blijft het bestraat
    for(const [p,q] of stripSegs(a,b,278,282.5)){groundQuad(p,278,q,282.5,0.09,MAT.asphalt,6);lay('parkeer',p,278,q,282.5);box(q-p,0.12,0.18,SM.curb,staticRoot,(p+q)/2,0.06,282.5);}groundQuad(a,282.5,b,291.5,0.085,SM.tiles,2);
    groundQuad(a,312,b,328,0.06,SM.pavers,4);lay('parkeer',a,312,b,328);groundQuad(a,357,b,382,0.055,SM.tiles,2);}
  for(let x=-122,i=0;x<4;x+=6.5,i++)if(i%4!==2&&Math.abs(x+61)>6)parkedCar(x,280.2,true,i+3);
  for(let x=-120,i=0;x<4;x+=6.5,i++)if(i%3!==0&&Math.abs(x+61)>6)parkedCar(x,i%2?316:324,false,i+5);
  for(const x of[-110,-90,-40,-15])tree(x,362.5,0.8,false);}

// ---- balkons en entree aan de flats
function aptExtras(x0,z0,x1,z1,floors){const W=x1-x0,Dz=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
  for(const s of[-1,1])for(let f=1;f<floors;f++)for(let bx=x0+4;bx<x1-2;bx+=8){const z=cz+s*(Dz/2+0.6),y=3.6+f*3;
    box(3.2,0.16,1.2,SM.balcony,staticRoot,bx+2,y,z);box(3.2,1.0,0.05,SM.rail,staticRoot,bx+2,y+0.58,cz+s*(Dz/2+1.18));}}
