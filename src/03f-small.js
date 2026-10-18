
// ============================================================ kleine afnemers in de wijk: school, supermarkt, sporthal, huisartsenpost, laadplein, bibliotheek, gemeentehuis en treinstation
// Elk hangt aan een eigen LS-groep van een MS-station. Naambord, ramen, buitenlamp (en de laadpalen) gaan uit als die groep geen spanning heeft.
const SMALL=[];
const lvgLive=g=>!!g&&(EN.has(g.node)||!!g.backfed);
function smallReg(name,hours=[7,22],day=0.3){let E=SMALL.find(e=>e.name===name);
  if(!E){E={name,hours,day,g:null,signs:[],glow:[],led:null};E.lampMat=mat({color:0x2a2c2e,emissive:0xffd9a0,emissiveIntensity:0});E.poolMat=new THREE.MeshBasicMaterial({map:poolTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});SMALL.push(E);}return E;}
// brede etalage-/kantoorramen: een strook die oplicht als er stroom is
const BAND_GLOW=(()=>{const c=cnv(256,64),g=c.getContext('2d');for(let i=0;i<4;i++)glowRect(g,i*64+5,6,54,52);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;})();
const BAND_GLASS=mat({color:0x26343c,roughness:0.15,metalness:0.4});
// gedeelde materialen (per kleur één), zodat het samenvoegen van statische objecten weinig tekenbeurten oplevert
const SMAT={};const smMat=(c,r=0.85)=>SMAT[c+'/'+r]??=mat({color:c,roughness:r});
// raamstrook: één lichtmateriaal per afnemer; de herhaling van het raampatroon zit in de UV's
function bandPlane(E,w,h,x,y,z,ry){const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*w/8);
  if(!E.glowMat){E.glowMat=glowMat(BAND_GLOW);E.glow.push(E.glowMat);}const p=mesh(g,E.glowMat,staticRoot,x,y,z);p.rotation.y=ry;p.castShadow=p.receiveShadow=false;p.renderOrder=1;return p;}
// terreinen van de kleine afnemers: daar geen bomen uit de verre boomgroepen
SITE_RECTS.push([-152,52,-70,97],[-150,196,-104,230],[-130,246,-96,266],[-52,246,-28,266],[66,246,106,266],[-128,393,-14,420],[-3000,413,3000,431]);
// voorgevel: +z, -z, +x of -x (de richting waar de gevel naar kijkt)
const FRONT={'+z':[0,1,0],'-z':[0,-1,Math.PI],'+x':[1,0,Math.PI/2],'-x':[-1,0,-Math.PI/2]};
function smallPlane(w,h,m,x,y,z,ry){const p=mesh(new THREE.PlaneGeometry(w,h),m,staticRoot,x,y,z);p.rotation.y=ry;p.castShadow=false;return p;}
function smallBuild(E,{x,z,w,d,h,col,front,sign,signW=10,bg='#ffffff',fg='#1d2b45',band=[1,2.4],back=true,canopy=true}){
  lay('small',x-w/2,z-d/2,x+w/2,z+d/2);DISTRICT_RECTS.push([x-w/2,z-d/2,x+w/2,z+d/2]);
  box(w,h,d,smMat(col),staticRoot,x,h/2,z);box(w+0.5,0.4,d+0.5,MAT.concreteDark,staticRoot,x,h+0.2,z);
  const [nx,nz,ry]=FRONT[front],len=nx?d:w,dep=nx?w:d,ax=Math.cos(ry),az=-Math.sin(ry);
  const at=(s,off,along=0)=>[x+s*nx*(dep/2+off)+ax*along*s,z+s*nz*(dep/2+off)+az*along*s];
  for(const s of back?[1,-1]:[1]){const r=s>0?ry:ry+Math.PI,[gx,gz]=at(s,0.03),[lx,lz]=at(s,0.06),bh=band[1]-band[0],by=(band[0]+band[1])/2;
    smallPlane(len-2,bh,BAND_GLASS,gx,by,gz,r);
    bandPlane(E,len-2,bh,lx,by,lz,r);
    if(h>7){smallPlane(len-2,1.6,BAND_GLASS,gx,band[1]+2.4,gz,r);bandPlane(E,len-2,1.6,lx,band[1]+2.4,lz,r);}}
  // naambord (licht zelf op) en entree met luifel en lamp
  const sm=new THREE.MeshBasicMaterial({map:signTex(sign,bg,fg,1024,160,`bold ${Math.min(92,Math.floor(1500/sign.length))}px Arial`),color:0xffffff});E.signs.push(sm);
  {const [sx,sz]=at(1,0.1,len/2-signW/2-1);smallPlane(signW,signW*0.156,sm,sx,h-1.1,sz,ry);}
  if(canopy){const [cx,cz]=at(1,1,-len/4);const cb=box(nx?2:4.5,0.25,nx?4.5:2,MAT.trim,staticRoot,cx,band[1]+0.4,cz);cb.castShadow=false;
    const [lx,lz]=at(1,0.2,-len/4);box(nx?0.25:0.6,0.18,nx?0.6:0.25,E.lampMat,staticRoot,lx,band[1]+0.15,lz);}
  return {at,ry,len,dep};}
function buildSmall(){
  // ---- MS1: supermarkt en basisschool aan de noordkant van de wijk (tussen de populieren en de straat)
  {const E=smallReg('Supermarkt',[8,21],0.4);smallBuild(E,{x:-134,z:68,w:32,d:20,h:6,col:0xd9d4c6,front:'+z',sign:'SUPERMARKT',signW:11,bg:'#e3262e',fg:'#ffffff',band:[0.3,3]});
    groundQuad(-150,80,-118,95.5,0.035,MAT.asphalt,6);lay('parkeer',-150,80,-118,95.5);for(let i=0;i<5;i++){parkedCar(-146+i*6.2,84,false,i);parkedCar(-146+i*6.2,91.5,false,i+1);}
    for(const x of[-148,-120])siteLamp(E,x,88);}
  {const E=smallReg('Basisschool De Linde',[7.5,17],0.3);smallBuild(E,{x:-91,z:70,w:34,d:18,h:7,col:0xc98a5a,front:'+z',sign:'BASISSCHOOL DE LINDE',signW:12,bg:'#fff8e8',fg:'#2b5d3c'});
    groundQuad(-108,80,-74,95.5,0.035,SM.tiles,3);lay('plein',-108,80,-74,95.5);
    for(let x=-107;x<=-75;x+=4)box(0.05,1.2,0.05,MAT.galv,staticRoot,x,0.6,95.6);box(32,0.05,0.05,MAT.galv,staticRoot,-91,1.15,95.6);   // hekje langs de stoep
    cyl(0.08,0.08,3.4,MAT.galv,staticRoot,-100,1.7,93,8);box(1.8,1.05,0.06,smMat(0xf4f4f0,0.5),staticRoot,-100,3.3,92.9);box(0.5,0.03,0.5,smMat(0xe2591c,0.6),staticRoot,-100,3.0,92.6);   // basketbalpaal
    tree(-80,89,0.8,true,true);tree(-86,89,0.7,false,true);}
  // ---- MS2: sporthal aan de westrand
  {const E=smallReg('Sporthal',[8,23],0.25);smallBuild(E,{x:-128,z:213,w:40,d:26,h:9,col:0x7a8a99,front:'+x',sign:'SPORTHAL',signW:9,bg:'#1d4f91',fg:'#ffffff',band:[0.3,2.8],back:false});
    for(const z of[202,224])siteLamp(E,-105,z);}
  // ---- MS3: huisartsenpost (dag en nacht open)
  {const E=smallReg('Huisartsenpost',[0,24],0.35);smallBuild(E,{x:-40,z:256,w:20,d:12,h:4.5,col:0xeeeeea,front:'-z',sign:'✚ HUISARTSENPOST',signW:8,bg:'#ffffff',fg:'#1b8a4a',band:[0.4,2.6]});}
  // ---- MS4: laadplein met laadpalen onder een overkapping met zonnepanelen
  {const E=smallReg("Laadplein elektrische auto's",[0,24],0);groundQuad(68,248,104,264,0.035,MAT.asphalt,6);lay('laad',68,248,104,264);
    E.led=mat({color:0x0a1a0e,emissive:0x2cff6a,emissiveIntensity:0});
    for(let i=0;i<6;i++){const x=71+i*6;box(0.4,1.5,0.3,smMat(0xf2f2ee,0.4),staticRoot,x,0.75,253.2);box(0.3,0.25,0.05,E.led,staticRoot,x,1.25,253.04);
      if(i%3!==1)parkedCar(x+3,257.5,false,i);}
    for(const x of[70,102])for(const z of[250,262])cyl(0.12,0.12,3.6,MAT.galv,staticRoot,x,1.8,z,8);
    box(34,0.2,14,MAT.trim,staticRoot,86,3.7,256).castShadow=false;const pv=groundQuad(70,250,102,262,3.82,SM.pv,1);pv.castShadow=false;
    const sm=new THREE.MeshBasicMaterial({map:signTex('⚡ LAADPLEIN','#0f6b3a','#ffffff',1024,160,'bold 92px Arial'),color:0xffffff});E.signs.push(sm);smallPlane(8,1.25,sm,86,3.2,248.9,Math.PI);
    const lm=new THREE.MeshBasicMaterial({color:0xfff0d8,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});E.glow.push(lm);
    const ul=mesh(new THREE.PlaneGeometry(32,12),lm,staticRoot,86,3.55,256);ul.rotation.x=Math.PI/2;ul.userData.noBake=true;ul.castShadow=ul.receiveShadow=false;}
  // ---- MS6: bibliotheek aan de rand van het centrum
  {const E=smallReg('Bibliotheek',[10,20],0.3);smallBuild(E,{x:-112,z:256,w:30,d:14,h:7,col:0x9aa3a8,front:'+z',sign:'BIBLIOTHEEK',signW:9,bg:'#ffffff',fg:'#7a1f4c',band:[0.3,3.2]});}
  // ---- MS6: horeca aan het marktplein: lichtsnoeren boven het plein en een café met terras
  {const E=smallReg('Horeca Marktplein',[10,24],0.3);const sm=new THREE.MeshBasicMaterial({map:signTex('CAFÉ DE MARKT','#2a1a12','#ffd27a',1024,160,'bold 92px Arial'),color:0xffffff});E.signs.push(sm);
    smallPlane(9,1.4,sm,-112,4.7,356.3,0);const bulb=new THREE.SphereGeometry(0.14,6,4),bm=E.bulbMat=mat({color:0xe8dcc0,emissive:0xffc070,emissiveIntensity:0});
    for(const z of[367,377])for(let x=-123;x<=-72;x+=2.6){const b=mesh(bulb,bm,staticRoot,x,3.6-Math.sin((x+123)/12*Math.PI)**2*0.5,z);b.castShadow=false;}
    for(const x of[-123,-72])for(const z of[367,377])cyl(0.06,0.06,3.8,MAT.galv,staticRoot,x,1.9,z,6);
    const tbl=smMat(0x3a3a36,0.6);for(let i=0;i<4;i++){const x=-120+i*4.5;cyl(0.45,0.45,0.05,tbl,staticRoot,x,0.75,360,10);cyl(0.04,0.04,0.75,MAT.galv,staticRoot,x,0.37,360,5);}}
  // ---- MS7: gemeentehuis met klokkentoren en het treinstation aan het spoor
  {const E=smallReg('Gemeentehuis',[8,18],0.25);smallBuild(E,{x:-105,z:405,w:40,d:18,h:10,col:0xb5654a,front:'-z',sign:'GEMEENTEHUIS',signW:10,bg:'#f4efe4',fg:'#5a2a1a'});
    box(6,19,6,smMat(0xa5583f),staticRoot,-88,9.5,405);box(6.6,0.5,6.6,MAT.concreteDark,staticRoot,-88,19.2,405);
    const cm=new THREE.MeshBasicMaterial({map:toTex(clockCanvas()),color:0xffffff});E.signs.push(cm);smallPlane(3.6,3.6,cm,-88,16,401.95,Math.PI);}
  {const E=smallReg('Treinstation',[5,24.5],0.3);smallBuild(E,{x:-34,z:401,w:28,d:10,h:5,col:0xd8cfb8,front:'-z',sign:'STATION ZUIDWOLDE',signW:10,bg:'#003082',fg:'#ffc917',band:[0.3,2.8]});
    // perron met overkapping en lampen
    box(90,0.8,5,MAT.concrete,staticRoot,-35,0.4,413.5);lay('perron',-80,411,10,416);box(90,0.06,0.3,smMat(0xf2d200,0.6),staticRoot,-35,0.83,415.7);
    for(let x=-60;x<=-10;x+=10)cyl(0.12,0.12,3.4,MAT.galv,staticRoot,x,2.5,412.5,8);box(56,0.2,4.4,MAT.trim,staticRoot,-35,4.2,413.3).castShadow=false;
    const lm=new THREE.MeshBasicMaterial({color:0xfff0d8,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});E.glow.push(lm);
    const ul=mesh(new THREE.PlaneGeometry(54,4),lm,staticRoot,-35,4.05,413.3);ul.rotation.x=Math.PI/2;ul.userData.noBake=true;ul.castShadow=ul.receiveShadow=false;
    for(const x of[-75,5])siteLamp(E,x,412);}
  buildRailway();}
function clockCanvas(){const c=cnv(128),g=c.getContext('2d');g.fillStyle='#a5583f';g.fillRect(0,0,128,128);g.fillStyle='#f4efe4';g.beginPath();g.arc(64,64,58,0,7);g.fill();
  g.strokeStyle='#222';g.lineWidth=4;g.stroke();for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.moveTo(64+Math.sin(a)*46,64-Math.cos(a)*46);g.lineTo(64+Math.sin(a)*54,64-Math.cos(a)*54);g.stroke();}
  g.lineWidth=6;g.beginPath();g.moveTo(64,64);g.lineTo(64,26);g.moveTo(64,64);g.lineTo(90,76);g.stroke();return c;}
// ---- spoorlijn langs de zuidkant van het centrum (ballastbed met dwarsliggers, twee sporen)
function buildRailway(){const c=cnv(256,64),g=c.getContext('2d');g.fillStyle='#6f6a62';g.fillRect(0,0,256,64);noiseFill(g,256,40);
  g.fillStyle='#4a3a2c';for(const x of[10,74,138,202])g.fillRect(x,0,30,64);
  const bal=mat({map:toTex(c),roughness:1});groundQuad(-2600,416,2600,428,0.025,MAT.gravel,3);
  for(const z of[419.25,424.25])groundQuad(-2600,z-1.85,2600,z+1.85,0.03,bal,2.4);
  const rail=mat({color:0x8a8580,roughness:0.35,metalness:0.8});for(const z of[418.5,420,423.5,425])box(5200,0.16,0.08,rail,staticRoot,0,0.12,z).castShadow=false;
  // spoorwegovergang bij de hoofdweg: weg over het spoor en twee slagbomen
  groundQuad(22,415.5,28,428.5,0.06,MAT.asphalt,6);for(const [x,z] of[[20.5,414.5],[29.5,429.5]]){cyl(0.12,0.12,1.4,MAT.galv,staticRoot,x,0.7,z,8);box(0.1,0.1,5,smMat(0xd8262c,0.5),staticRoot,x,1.3,z+(z<420?2.5:-2.5));}}
// ---- elke frame: per LS-groep aan of uit
function updateSmall(){const h=viewHour(),night=clamp((NIGHT-0.15)*1.5,0,1);
  for(const E of SMALL){E.g??=LVG.find(g=>g.name===E.name)||false;const on=lvgLive(E.g),[a,b]=E.hours,open=a<=b?h>=a&&h<b:h>=a||h<b;
    const o=on?(open?Math.max(E.day,night*0.95):night*0.12):0;E.glow.forEach(m=>m.opacity=o);E.signs.forEach(m=>m.color.setScalar(on?1:0.16));
    E.lampMat.emissiveIntensity=on&&NIGHT>0.3?4:0;if(E.poolMat)E.poolMat.opacity=on&&NIGHT>0.3?0.55*NIGHT:0;if(E.led)E.led.emissiveIntensity=on?2.5:0;if(E.bulbMat)E.bulbMat.emissiveIntensity=on&&NIGHT>0.2?3:0;}}
