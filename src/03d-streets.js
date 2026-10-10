
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
  car:[0xb8bec4,0x1c2a3a,0x8a1c1c,0xe8e8e4,0x2d4a2d,0x3a3f45,0x6a5232].map(c=>mat({color:c,roughness:0.35,metalness:0.55})),carGlass:mat({color:0x1a242c,roughness:0.15,metalness:0.6}),tyre:mat({color:0x111111,roughness:0.9})};

// ---- stoep met stoeprand langs een straat (horizontaal: langs x, verticaal: langs z)
function sidewalk(x0,z0,x1,z1,curbSide){groundQuad(x0,z0,x1,z1,0.1,SM.tiles,2);const along=x1-x0>z1-z0;
  const cz=curbSide==='-'?(along?z0:x0):(along?z1:x1);
  if(along)box(x1-x0,0.12,0.18,SM.curb,staticRoot,(x0+x1)/2,0.06,cz);else box(0.18,0.12,z1-z0,SM.curb,staticRoot,cz,0.06,(z0+z1)/2);}
// stoepen aan beide kanten van een rechte straat, met onderbrekingen bij kruisingen
function streetSidewalks(a,b,c0,c1,horiz,gaps){const segs=[];let s=a;for(const [g0,g1] of gaps.sort((p,q)=>p[0]-q[0])){if(g0>s)segs.push([s,g0]);s=Math.max(s,g1);}if(s<b)segs.push([s,b]);
  for(const [p,q] of segs){if(horiz){sidewalk(p,c0-2,q,c0,'+');sidewalk(p,c1,q,c1+2,'-');}else{sidewalk(c0-2,p,c0,q,'+');sidewalk(c1,p,c1+2,q,'-');}}}
// onderbroken middenstreep
function centerLine(a,b,c,horiz){for(let t=a+2;t<b-3;t+=9){const m=groundQuad(horiz?t:c-0.06,horiz?c-0.06:t,horiz?t+3:c+0.06,horiz?c+0.06:t+3,0.05,SM.line,1);m.receiveShadow=true;}}
// geparkeerde auto (statisch, kijkt langs de straat)
function parkedCar(x,z,along,i){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=along?Math.PI/2+(i%2?Math.PI:0):(i%2?Math.PI:0);staticRoot.add(g);
  box(1.8,0.7,4.2,SM.car[i%SM.car.length],g,0,0.6,0);box(1.6,0.6,2.2,SM.carGlass,g,0,1.2,-0.2);
  for(const [wx,wz] of[[-0.85,1.3],[0.85,1.3],[-0.85,-1.3],[0.85,-1.3]])cyl(0.33,0.33,0.25,SM.tyre,g,wx,0.33,wz,10).rotation.z=Math.PI/2;
  DISTRICT_RECTS.push(along?[x-2.2,z-1,x+2.2,z+1]:[x-1,z-2.2,x+1,z+2.2]);}

// ---- per woning: voortuin met heg en tuinpad, kliko, schutting tussen de achtertuinen; dak: goten, zonnepanelen of dakkapel
function houseExtras(x0,z,n,faceSouth,W,Dp,H,v){const f=faceSouth?1:-1,len=n*W,fz=z+f*Dp/2,bz=z-f*Dp/2,ang=Math.atan2(3.4,Dp/2+0.4);
  // dakgoten aan beide kanten
  for(const s of[-1,1])box(len+0.4,0.14,0.16,SM.gutter,staticRoot,x0+len/2,H+0.02,z+s*(Dp/2+0.42));
  for(let i=0;i<n;i++){const x=x0+W/2+i*W,door=x+f*1.44,r=R();
    // voortuin: heg langs de straatkant (opening bij het pad), tuinpad van tegels, kliko naast de deur
    const gz=fz+f*4.2,hl=door-0.6-(x-W/2),hr=x+W/2-(door+0.6),free=(cx,l)=>!RING.stations.some(s=>Math.abs(s.pos[0]-cx)<l/2+3&&Math.abs(s.pos[1]-gz)<2.5);   // niet door een MS-station heen
    if(free(x-W/2+hl/2,hl))box(hl,0.85,0.5,SM.hedge,staticRoot,x-W/2+hl/2,0.43,gz);if(free(door+0.6+hr/2,hr))box(hr,0.85,0.5,SM.hedge,staticRoot,door+0.6+hr/2,0.43,gz);
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
  box(0.06,1.8,7.6,SM.wood,staticRoot,x0+len,0.9,bz-f*3.8);}

// ---- straten aankleden
function dressStreets(){
  // woonwijk: hoofdstraten (asfalt) met stoepen en middenstreep
  streetSidewalks(-150,165,98,104,true,[[-102,-92],[58,68]]);streetSidewalks(-150,165,236,242,true,[[-102,-92],[58,68]]);
  streetSidewalks(106,234,-100,-94,false,[[156,167]]);streetSidewalks(106,234,60,66,false,[]);
  centerLine(-150,165,101,true);centerLine(-150,165,239,true);
  // nieuwe woonstraat met klinkers tussen de rijen die met de voorkant naar elkaar toe staan (woonerf, geen stoep)
  // (z 157,5–165,5: MS2 staat ernaast aan de noordkant)
  groundQuad(-94,157.5,36,165.5,0.045,SM.pavers,4);box(130,0.12,0.18,SM.curb,staticRoot,-29,0.06,157.5);box(130,0.12,0.18,SM.curb,staticRoot,-29,0.06,165.5);
  for(let x=-82,i=0;x<30;x+=7.5,i++)if(i%3!==1)parkedCar(x,i%2?159.4:163.6,true,i);
  for(let x=-80;x<34;x+=24)streetLight(x,157);
  for(let x=-70;x<34;x+=24)tree(x,166.6,0.75,false);
  // centrum: stoepen langs alle straten, parkeren langs de flats
  streetSidewalks(-130,200,270,276,true,[[-66,-56],[104,114]]);streetSidewalks(-130,200,384,390,true,[[-66,-56],[104,114]]);
  streetSidewalks(278,382,-64,-58,false,[]);streetSidewalks(278,382,106,112,false,[]);
  centerLine(-130,200,273,true);centerLine(-130,200,387,true);
  // winkelstraat: parkeerstrook en een brede stoep voor de winkels; tussen de flats een parkeerterrein, achter de flats een plein van tegels
  for(const [a,b] of[[-125,-66],[-56,8]]){groundQuad(a,278,b,282.5,0.09,MAT.asphalt,6);groundQuad(a,282.5,b,291.5,0.085,SM.tiles,2);box(b-a,0.12,0.18,SM.curb,staticRoot,(a+b)/2,0.06,282.5);
    groundQuad(a,312,b,328,0.06,SM.pavers,4);groundQuad(a,357,b,382,0.055,SM.tiles,2);}
  for(let x=-122,i=0;x<4;x+=6.5,i++)if(i%4!==2&&Math.abs(x+61)>6)parkedCar(x,280.2,true,i+3);
  for(let x=-120,i=0;x<4;x+=6.5,i++)if(i%3!==0&&Math.abs(x+61)>6)parkedCar(x,i%2?316:324,false,i+5);
  for(const x of[-110,-90,-40,-15])tree(x,358.5,0.8,false);}

// ---- balkons en entree aan de flats
function aptExtras(x0,z0,x1,z1,floors){const W=x1-x0,Dz=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
  for(const s of[-1,1])for(let f=1;f<floors;f++)for(let bx=x0+4;bx<x1-2;bx+=8){const z=cz+s*(Dz/2+0.6),y=3.6+f*3;
    box(3.2,0.16,1.2,SM.balcony,staticRoot,bx+2,y,z);box(3.2,1.0,0.05,SM.rail,staticRoot,bx+2,y+0.58,cz+s*(Dz/2+1.18));}}
