
// ============================================================ bedrijventerreinen aankleden: terreinen, laadperrons, opleggers, daken en per bedrijf eigen details
// Alles statisch met gedeelde materialen: bakeStatic voegt het per materiaal en zone samen (een handvol tekenbeurten extra).
const BZ={dock:mat({color:0x1b1d20,roughness:0.9}),bump:mat({color:0xe8c21c,roughness:0.6}),trailer:[0xf2f2ee,0x2f5d8a,0xb22a2a].map(c=>mat({color:c,roughness:0.55,metalness:0.15})),
  pallet:mat({color:0x9c7a4c,roughness:0.95}),goods:mat({color:0xcfc2a6,roughness:0.9}),
  fence:mat({color:0x3c4a40,roughness:0.6,metalness:0.4}),sky:mat({color:0xcfe4ee,roughness:0.2,metalness:0.1,emissive:0x2a3a44,emissiveIntensity:0.15}),
  hvac:mat({color:0xb9bec2,roughness:0.5,metalness:0.5}),steel:mat({color:0x6f757a,roughness:0.45,metalness:0.7}),brick:mat({color:0x8a4a36,roughness:0.9}),yel:mat({color:0xf0c419,roughness:0.5})};
// terreinen: daar geen bomen uit de verre boomgroepen
SITE_RECTS.push([84,106,162,151],[66,152,151,166],[132,278,185,306],[44,278,77,306],[46,331,105,352]);
// gedeelde materialen: cabines en containers in de opleggerkleuren, banden en glas van de geparkeerde auto's
BZ.cab=BZ.trailer;BZ.chassis=BZ.dock;BZ.tyre=SM.tyre;BZ.glass=SM.carGlass;BZ.cont=[BZ.trailer[2],BZ.trailer[1],BZ.fence,BZ.yel];
const ib=(w,h,d,m,x,y,z,ry=0)=>{const o=box(w,h,d,m,staticRoot,x,y,z);if(ry)o.rotation.y=ry;return o;};
// terrein van beton (of asfalt), met belijnde parkeervakken
function yard(x0,z0,x1,z1,m=MAT.concrete){groundQuad(x0,z0,x1,z1,0.035,m,4);lay('terrein',x0,z0,x1,z1);}
function bays(x0,z,n,dir=1,w=2.6,len=5){for(let i=0;i<=n;i++){const q=groundQuad(x0+i*w-0.06,z,x0+i*w+0.06,z+dir*len,0.05,SM.line,1);q.receiveShadow=true;}}
// laadperron: dockshelter (zwart kader), stootblokken en een verlichte deur
function dock(x,z,face=-1,ry=0){const dz=face*0.12;ib(4.6,0.35,0.5,BZ.dock,x,4.6,z+dz,ry);for(const s of[-1,1])ib(0.35,4.4,0.5,BZ.dock,x+s*2.3,2.3,z+dz,ry);
  for(const s of[-1,1])ib(0.3,0.4,0.25,BZ.bump,x+s*1.4,1.2,z+face*0.3,ry);ib(4.2,0.12,0.6,BZ.bump,x,0.06,z+face*0.4,ry);}
// oplegger met de achterkant tegen het dock, eventueel met trekker ervoor (dir: richting van de neus, -1 is naar -z)
function trailer(x,z0,dir=-1,col=0,tractor=false,reefer=false){const L=13.2,m=BZ.trailer[col%BZ.trailer.length],cz=z0+dir*L/2;
  ib(2.55,2.75,L,m,x,2.6,cz);ib(2.4,0.35,L-0.4,BZ.chassis,x,1.05,cz);
  for(const k of[0,1.4,2.8])for(const s of[-1,1]){const w=cyl(0.5,0.5,0.35,BZ.tyre,staticRoot,x+s*0.95,0.5,z0+dir*(1.6+k),12);w.rotation.z=Math.PI/2;}
  for(const s of[-1,1])ib(0.15,1.1,0.15,BZ.chassis,x+s*0.8,0.55,z0+dir*(L-3));   // poten
  if(reefer)ib(2.2,1.6,0.6,BZ.hvac,x,2.9,z0+dir*(L+0.3));
  if(tractor){const tz=z0+dir*(L-0.6),c=BZ.cab[col%BZ.cab.length];ib(2.5,1.0,6.0,BZ.chassis,x,0.95,tz+dir*1.5);ib(2.5,2.7,2.3,c,x,2.5,tz+dir*3.2);ib(2.52,1.0,0.1,BZ.glass,x,2.9,tz+dir*4.36);
    for(const k of[0.4,3.6])for(const s of[-1,1]){const w=cyl(0.52,0.52,0.4,BZ.tyre,staticRoot,x+s*1.05,0.52,tz+dir*k,12);w.rotation.z=Math.PI/2;}}
  lay('truck',...(dir<0?[x-1.3,z0-L-(tractor?4.6:0.5),x+1.3,z0]:[x-1.3,z0,x+1.3,z0+L+(tractor?4.6:0.5)]));}
function container(x,z,y=0,col=0,along=true){ib(along?2.44:6.06,2.59,along?6.06:2.44,BZ.cont[col],x,y+1.3,z);}
function palletStack(x,z,n=3){for(let i=0;i<n;i++){ib(1.2,0.15,0.8,BZ.pallet,x,0.08+i*1.05,z);ib(1.1,0.85,0.75,BZ.goods,x,0.6+i*1.05,z);}}
// hekwerk (spijlenhek) langs een lijn
function fenceLine(x0,z0,x1,z1){const L=Math.hypot(x1-x0,z1-z0),ry=-Math.atan2(z1-z0,x1-x0);ib(L,0.08,0.08,BZ.fence,(x0+x1)/2,1.9,(z0+z1)/2,ry);ib(L,0.08,0.08,BZ.fence,(x0+x1)/2,0.25,(z0+z1)/2,ry);
  for(let d=0;d<=L;d+=0.25){const t=d/L;ib(0.04,1.95,0.04,BZ.fence,x0+(x1-x0)*t,1.0,z0+(z1-z0)*t);}}
// lichtstraten op een dak (strookjes doorschijnend dak)
function skylights(cx,cz,w,d,h,n){for(let i=0;i<n;i++){const z=cz-d/2+(i+1)*d/(n+1);ib(w-6,0.35,1.4,BZ.sky,cx,h+0.55,z);}}
function hvac(x,z,h,n=2){for(let i=0;i<n;i++){ib(2.2,1.2,1.4,BZ.hvac,x+i*2.8,h+1.0,z);cyl(0.45,0.45,0.08,BZ.dock,staticRoot,x+i*2.8,h+1.65,z,12);}}
// extra deuren in de voorgevel (zelfde rolluik als de hal)
function doors(xs,zf){xs.forEach(x=>{const p=mesh(new THREE.PlaneGeometry(4,4.5),MAT.louvre,staticRoot,x,2.25,zf-0.02);p.rotation.y=Math.PI;p.castShadow=false;});}

function buildIndustry(){
  // ---- Bedrijvenpark Zuid (MS5): transport en koelhuis aan de straat, garage met kantoren erachter
  yard(84,106.2,130,129.8);yard(130,106.2,161,128.9);bays(85.5,106.6,4,1,2.6,4.6);
  for(let i=0;i<4;i++)parkedCar(86.8+i*2.6,109,false,i+20);
  [90,96,102].forEach(x=>dock(x,130));[135,141,147].forEach(x=>dock(x,129));
  trailer(90,129.6,-1,0,false);trailer(102,129.6,-1,2,true);trailer(135,128.6,-1,1,false,true);trailer(147,128.6,-1,0,true,true);
  fenceLine(83.6,106.6,83.6,150);fenceLine(161.6,106.6,161.6,151);
  // tussen transport en koelhuis: containers en pallets
  yard(116,130,129,150);container(119.5,138,0,0);container(122.5,138,0,1);container(119.5,138,2.59,3);container(125.5,143,0,2);
  for(let i=0;i<4;i++)palletStack(117.5+i*1.6,131.8,1+(i%3));
  skylights(100,140,30,20,8,3);hvac(140,150-5,9,3);hvac(140,150-12,9,3);   // koelhuis: condensors op het dak
  // garage met kantoren: eigen terrein met toegangsweg vanaf de straat, kantoorvleugel en parkeervakken
  groundQuad(66,154.5,110,160.5,0.04,MAT.asphalt,6);lay('terrein',66,154.5,110,160.5);yard(110,151.5,151,165.8);
  bays(112,165.5,9,-1,2.6,4.8);for(let i=0;i<9;i+=2)parkedCar(113.3+i*2.6,163,false,i+30);
  {const ox=145,oz=163,W=10,H=7.5;ib(W,H,5,DM.hall,ox,H/2,oz);ib(W+0.4,0.3,5.4,MAT.roof,ox,H+0.15,oz);for(const y of[1.8,4.8]){const g=mesh(new THREE.PlaneGeometry(W-1,1.6),BAND_GLASS,staticRoot,ox,y,oz-2.52);g.rotation.y=Math.PI;g.castShadow=false;}}
  skylights(130,175,40,18,7,2);
  // ---- De Vaart: distributiecentrum met een rij docks en zonnepanelen, metaalbewerking met schoorsteen en staalrekken, bouwmarkt met parkeerterrein
  yard(132,278.5,184.5,305.6);const dcx=[138,144,150,156,162,168,174];doors([156,162,168,174],306);dcx.forEach(x=>dock(x,306));
  [[138,0,false],[144,1,true],[156,3,false],[162,0,false],[174,2,true]].forEach(([x,c,t])=>trailer(x,305.6,-1,c,t));
  for(let i=0;i<3;i++)trailer(181,281+i*0.01,1,i%4,false);   // geparkeerde opleggers langs de oostkant
  for(let r=0;r<5;r++)groundQuad(136,310+r*5.4,180,313.6+r*5.4,11.48,SM.pv,1);hvac(140,334,11,2);
  yard(44,278.5,76,305.6);dock(48,306);
  for(let i=0;i<3;i++){const z=284+i*5;for(const x of[50,64])for(let k=0;k<4;k++)ib(9,0.25,0.3,BZ.steel,x+4.5,0.3+k*0.32,z+k*0.05);ib(0.2,1.6,3.8,BZ.steel,50,0.8,z);ib(0.2,1.6,3.8,BZ.steel,73,0.8,z);}   // staalrekken
  cyl(0.8,1.0,18,BZ.brick,staticRoot,78.5,9,327,14);cyl(0.85,0.85,0.4,BZ.dock,staticRoot,78.5,18.1,327,14);   // schoorsteen
  ib(14,0.9,0.9,BZ.hvac,62,9.9,322);ib(0.9,2.6,0.9,BZ.hvac,55.5,10.7,322);ib(0.9,2.6,0.9,BZ.hvac,68.5,10.7,322);skylights(62,318,38,24,9,3);
  // bouwmarkt: parkeerterrein met toegang vanaf de Vaartweg, entree-luifel, karrenstalling en tuincentrumhek
  yard(46,331.5,94,352.5,MAT.asphalt);groundQuad(94,338,104,346,0.04,MAT.asphalt,6);lay('terrein',94,338,104,346);
  for(const z of[333,346.5]){bays(48,z,16,z<340?1:-1,2.7,5);for(let i=0;i<16;i++)if((i*7+z)%3)parkedCar(49.35+i*2.7,z<340?335.5:344,false,i+40);}
  ib(10,0.3,4,MAT.trim,70,4.2,350.5);for(const s of[-1,1])cyl(0.15,0.15,4,MAT.galv,staticRoot,70+s*4.6,2,348.8,8);
  ib(4,2.2,1.6,BZ.fence,58,1.1,351.2);ib(4.2,0.15,1.8,MAT.roof,58,2.25,351.2);
  fenceLine(86.5,353,95,353);fenceLine(95,353,95,371);fenceLine(95,371,86.5,371);ib(1.2,1.0,0.8,BZ.goods,90,0.5,360);ib(1.2,1.0,0.8,BZ.goods,92,0.5,364);
  skylights(70,362,32,18,7,2);}
