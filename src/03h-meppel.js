
// ============================================================ OS Meppel (Netbeheer Noord) aan de noordkant van de stad, voorbij het spoor
// Alleen beeld: het netmodel van Meppel (rail MP, velden MP1–MP3, de trafo van Netbeheer Noord) staat in 04-1-net.js.
// Twee 110 kV-lijnen komen van het noorden binnen op een portaal, met per veld scheiders en een vermogensschakelaar naar de rail,
// twee 110/10 kV-trafo's en een 10 kV-gebouw aan de weg. Alles is statisch met gedeelde materialen: bakeStatic voegt het samen tot een
// handvol tekenbeurten. Aanroep vanuit 06-build.js na buildDistrict().
const MEPPEL={x0:48,x1:128,z0:468,z1:548};
const MPM={};
function buildMeppel(){const M=MEPPEL,S=staticRoot,P=Math.PI;
  // inrit: het grootste gat in de bomenrij langs de hoofdweg (bomen staan in LAYOUT)
  {const zs=LAYOUT.filter(e=>e.kind==='tree'&&e.r[0]>29&&e.r[0]<37&&e.r[1]>M.z0-15&&e.r[1]<M.z1).map(e=>(e.r[1]+e.r[3])/2).sort((a,b)=>a-b);
    let best=[M.z0+20,M.z0+28],gap=0;for(let i=1;i<zs.length;i++){const a=Math.max(zs[i-1],M.z0+6),b=Math.min(zs[i],M.z1-30);if(b-a>gap){gap=b-a;best=[a,b];}}
    const c=(best[0]+best[1])/2;M.gate=[c-3.4,c+3.4];}
  const g0=M.gate[0],g1=M.gate[1],gc=(g0+g1)/2;
  // terrein: grind, inrit vanaf de hoofdweg, betonpad over het terrein
  groundQuad(M.x0,M.z0,M.x1,M.z1,0.03,MAT.gravel,4);
  groundQuad(28,g0+0.4,M.x0+2,g1-0.4,0.045,MAT.asphalt,6);groundQuad(M.x0+2,g0+0.4,M.x1-6,g1-0.4,0.05,MAT.concrete,4);
  // hek: één materiaal, de herhaling zit in de UV's
  MPM.fence??=(()=>{const t=toTex(C.chain);t.repeat.set(1,1);return mat({map:t,alphaTest:0.45,side:THREE.DoubleSide,metalness:0.6,roughness:0.45,color:0xcfd4d6});})();
  const H=2.4,fence=(ax,az,bx,bz)=>{const L=Math.hypot(bx-ax,bz-az);if(L<0.5)return;const g=new THREE.PlaneGeometry(L,H),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*L/0.11,uv.getY(i)*H/0.11);
    const pl=mesh(g,MPM.fence,S,(ax+bx)/2,H/2+0.05,(az+bz)/2);pl.rotation.y=Math.atan2(-(bz-az),bx-ax);pl.castShadow=false;
    const k=Math.ceil(L/3.5);for(let i=0;i<=k;i++)cyl(0.04,0.04,H+0.3,MAT.galv,S,ax+(bx-ax)*i/k,(H+0.3)/2,az+(bz-az)*i/k,6);};
  fence(M.x0,M.z0,M.x1,M.z0);fence(M.x1,M.z0,M.x1,M.z1);fence(M.x1,M.z1,M.x0,M.z1);fence(M.x0,M.z1,M.x0,g1);fence(M.x0,g0,M.x0,M.z0);
  for(const z of[g0,g1])box(0.25,2.8,0.25,MAT.galvDark,S,M.x0,1.4,z);
  // 10 kV-gebouw aan de weg, met het naambord naar de hoofdweg
  const bx0=M.x0+4,bx1=M.x0+16,bz0=gc+6,bz1=M.z1-14,BH=5,bw=bx1-bx0,bd=bz1-bz0;
  MPM.brick??=mat({map:toTex(C.brick,8,3),roughness:0.88});
  box(bw,BH,bd,MPM.brick,S,(bx0+bx1)/2,BH/2,(bz0+bz1)/2);box(bw+0.4,0.3,bd+0.4,MAT.roof,S,(bx0+bx1)/2,BH+0.15,(bz0+bz1)/2);
  box(bw+0.2,0.45,bd+0.2,MAT.concreteDark,S,(bx0+bx1)/2,0.22,(bz0+bz1)/2);
  for(const z of[bz0+5,bz0+14])box(0.08,2.6,2.0,MAT.door,S,bx1+0.04,1.5,z);
  MPM.sign??=mat({map:toTex(textCanvas(['OS MEPPEL','110/10 kV · Netbeheer Noord'],{w:1024,h:256,bg:'#1d2b45',fg:'#f3f3ee',border:false,font:'bold 92px Arial'})),roughness:0.5});
  const sg=mesh(new THREE.PlaneGeometry(9,2.25),MPM.sign,S,bx0-0.03,3.4,(bz0+bz1)/2);sg.rotation.y=-P/2;sg.castShadow=false;
  for(let i=0;i<3;i++)box(1.6,0.9,1.0,MAT.cabinet,S,(bx0+bx1)/2-4+i*4,BH+0.75,(bz0+bz1)/2);
  // twee velden: van het lijnportaal (noord) via lijnscheider, vermogensschakelaar en railscheider naar de rail, met de trafo (zuid) aan de rail
  const bays=[M.x0+38,M.x0+64],ph=[-1.6,0,1.6],zBus=M.z0+44,zCB=M.z0+56,zDS=M.z0+64,zG=M.z1-4,yB=7.2;
  // 110 kV-rail op steunen over de breedte van beide velden
  const xa=bays[0]-6,xb=bays[1]+6;for(const x of[xa,(xa+xb)/2,xb])support(S,x,zBus,yB-0.6);
  ph.forEach(d=>rod(V3(xa,yB,zBus+d),V3(xb,yB,zBus+d),0.07,MAT.alu,S,8));
  for(const x of[xa,(xa+xb)/2,xb])ph.forEach(d=>insulator(S,1.2,0.09,0.17,8,MAT.porcelain,yB-1.25,x,zBus+d));
  bays.forEach((bx,k)=>{
    // portaal met afspaninsulatoren
    for(const s of[-1,1])box(0.6,14,0.6,MAT.lattice,S,bx+s*5,7,zG);box(10.6,0.7,0.7,MAT.lattice,S,bx,13.6,zG);
    ph.forEach(d=>insString(V3(bx+d*1.8,13.2,zG),V3(bx+d*1.8,11.6,zG),8));
    // lijnscheider, vermogensschakelaar (drie polen op een stalen frame), railscheider
    for(const z of[zDS,zCB,zBus+6]){box(5.2,0.3,0.6,MAT.galv,S,bx,2.6,z);for(const s of[-1,1])box(0.3,2.6,0.3,MAT.galv,S,bx+s*2.4,1.3,z);
      ph.forEach(d=>{insulator(S,z===zCB?2.4:1.6,0.11,0.2,z===zCB?10:7,MAT.porcelain,2.75,bx+d*1.5,z);if(z===zCB)cyl(0.25,0.25,0.7,MAT.galvDark,S,bx+d*1.5,5.5,z,10);});}
    // geleiders: portaal → lijnscheider → schakelaar → railscheider → rail
    ph.forEach(d=>{const x=bx+d*1.5;wire(V3(bx+d*1.8,11.6,zG),V3(x,4.6,zDS),0.6,0.03,MAT.conductor,8);wire(V3(x,4.6,zDS),V3(x,5.85,zCB),0.15,0.03,MAT.conductor,6);
      wire(V3(x,5.85,zCB),V3(x,4.6,zBus+6),0.15,0.03,MAT.conductor,6);wire(V3(x,4.6,zBus+6),V3(x,yB,zBus+d),0.2,0.03,MAT.conductor,6);});
    // transformator in een olieopvangbak, met radiatoren, conservator en doorvoeren
    const tz=M.z0+17;box(8,0.35,7,MAT.concreteDark,S,bx,0.17,tz);box(4.6,3.2,3.4,MAT.trafo,S,bx,1.95,tz);box(4.8,0.25,3.6,MAT.trafoDark,S,bx,3.65,tz);
    for(const s of[-1,1])for(let i=0;i<6;i++)box(0.08,2.4,1.0,MAT.trafo,S,bx-1.9+i*0.76,1.75,tz+s*2.25);
    const con=cyl(0.45,0.45,2.6,MAT.trafo,S,bx-1.2,4.6,tz-1.2,12);con.rotation.z=P/2;
    ph.forEach(d=>{insulator(S,2.0,0.1,0.18,9,MAT.porcelain,3.8,bx+d*1.2,tz+0.6);insulator(S,0.8,0.08,0.13,4,MAT.porcelain,3.8,bx+d*1.2,tz-0.9);
      wire(V3(bx+d*1.2,5.8,tz+0.6),V3(bx+d*1.5,yB,zBus+d*0.2),1.0,0.03,MAT.conductor,8);});
    // 10 kV-kabels van de trafo naar het gebouw (in een goot)
    box(bx-bx1,0.12,0.6,MAT.concrete,S,(bx+bx1)/2,0.08,tz-2.6);
    // de 110 kV-lijn naar het noorden: twee masten
    for(const z of[M.z1+52,M.z1+142])tower(bx+(k?6:-6),z);
    const tx=bx+(k?6:-6);TOWER_ATT.forEach((a,i)=>{const d=ph[[0,1,2][i]];wire(V3(tx+a.x,a.y-1.9,M.z1+52),V3(bx+d*1.8,11.6,zG),3.2,0.035,MAT.lineCond,16);
      wire(V3(tx+a.x,a.y-1.9,M.z1+142),V3(tx+a.x,a.y-1.9,M.z1+52),4.5,0.035,MAT.lineCond,18);});});
  // terreinverlichting
  for(const [x,z] of[[M.x0+30,M.z0+6],[M.x1-6,M.z0+6],[M.x1-6,M.z1-6],[M.x0+30,M.z1-6]]){cyl(0.08,0.12,8,MAT.galv,S,x,4,z,8);box(0.7,0.25,0.5,MAT.lamp,S,x,8.1,z);}
  lay('site',M.x0,M.z0,M.x1,M.z1);}
