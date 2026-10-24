
// ============================================================ stadsleven: spontane dingen die gebeuren (alleen beeld en geluid, geen invloed op het net)
// trein met spoorwegovergang, stadsbus met haltes, vuilniswagen, pakketbezorger, ambulance, weekmarkt, kinderen op het schoolplein, fietsers.
// Alles in echte tijd (zoals de auto's); welke dag en welk uur komt uit de speltijd. Uit te zetten met 'Verkeer en buren' (instellingen).
const cityDay=()=>new Date(SEASON.date.getTime()+Math.floor(SIM.t/1440)*864e5).getDay();   // 0 = zondag … 6 = zaterdag
const CM={white:mat({color:0xf2f2ee,roughness:0.45,metalness:0.1}),grey:mat({color:0x5d6369,roughness:0.6}),dark:mat({color:0x1d2024,roughness:0.6}),glass:mat({color:0x1e2a34,roughness:0.1,metalness:0.5}),
  red:mat({color:0xc81f2a,roughness:0.5}),green:mat({color:0x2f7a3c,roughness:0.6}),orange:mat({color:0xe8761c,roughness:0.5}),yellow:mat({color:0xf0c419,roughness:0.5}),tyre:mat({color:0x111111,roughness:0.9}),
  blue:mat({color:0x234a8a,roughness:0.5}),brown:mat({color:0x7a5a3a,roughness:0.8}),
  head:mat({color:0xdddddd,emissive:0xfff2d0,emissiveIntensity:0.4}),tail:mat({color:0x400000,emissive:0xff2a1a,emissiveIntensity:0.5}),
  blink:mat({color:0x0a1430,emissive:0x2a6bff,emissiveIntensity:0})};
function vBox(g,w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;}
function vWheels(g,xs,zs,r=0.45){for(const x of xs)for(const z of zs){const w=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.3,12),CM.tyre);w.rotation.z=Math.PI/2;w.position.set(x,r,z);g.add(w);}}
function vGroup(){const g=new THREE.Group();g.userData.dyn=true;g.visible=false;scene.add(g);return g;}

// ---- route over de wegen (hartlijn), rechts rijden; in bochten een nette hoek
function cityRoute(pts,lane=1.7){const n=pts.length,dirs=[];for(let i=0;i<n-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1],L=Math.hypot(bx-ax,bz-az);dirs.push([(bx-ax)/L,(bz-az)/L]);}
  const off=d=>[-d[1]*lane,d[0]*lane],P=pts.map((p,i)=>{const a=dirs[i-1],b=dirs[i];if(!a)return [p[0]+off(b)[0],p[1]+off(b)[1]];if(!b)return [p[0]+off(a)[0],p[1]+off(a)[1]];
    const oa=off(a),ob=off(b),dot=a[0]*b[0]+a[1]*b[1];return Math.abs(dot)>0.99?(dot>0?[p[0]+oa[0],p[1]+oa[1]]:[p[0],p[1]]):[p[0]+oa[0]+ob[0],p[1]+oa[1]+ob[1]];});
  const segs=[];for(let i=1;i<n;i++){const [ax,az]=P[i-1],[bx,bz]=P[i],L=Math.hypot(bx-ax,bz-az);segs.push({ax,az,bx,bz,L,yaw:Math.atan2(bx-ax,bz-az)});}
  return {segs,total:segs.reduce((a,s)=>a+s.L,0)};}
function routeAt(r,d){d=clamp(d,0,r.total);for(const s of r.segs){if(d<=s.L){const f=s.L?d/s.L:0;return [s.ax+(s.bx-s.ax)*f,s.az+(s.bz-s.az)*f,s.yaw];}d-=s.L;}const s=r.segs[r.segs.length-1];return [s.bx,s.bz,s.yaw];}
function routeNear(r,x,z){let best=0,bd=1e9;for(let d=0;d<=r.total;d+=1){const [px,pz]=routeAt(r,d),q=Math.hypot(px-x,pz-z);if(q<bd){bd=q;best=d;}}return best;}
const angLerp=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
// spoorwegovergang op de hoofdweg (x 22–28, z 416–428): voertuigen wachten als de bomen dicht zijn
const XING={closed:false,k:0};
const inXing=(x,z)=>x>18&&x<32&&z>411&&z<433;

// ---- een voertuig rijdt een route af en stopt op ingestelde punten (halte, kliko's, bezorging)
function driveVehicle(V,dt){const r=V.r;if(V.wait>0){V.wait-=dt;if(V.wait<=0)V.onGo?.(V);}
  else{const st=V.stops?.find(s=>s.d>V.d-0.5&&!s.done),ahead=st?st.d-V.d:1e9,vmax=V.vmax*(V.slow||1);V.v=Math.min(vmax,Math.max(1.2,Math.sqrt(2*1.6*Math.max(0,ahead))),V.v+3*dt);
    let nd=V.d+V.v*dt;const h=(V.len||6)/2+1,[nx,nz]=routeAt(r,nd+h),[cx,cz]=routeAt(r,V.d+h);if(XING.k>0.05&&!inXing(cx,cz)&&inXing(nx,nz)){nd=V.d;V.v=0;}
    if(st&&nd>=st.d){nd=st.d;st.done=true;V.v=0;V.wait=st.dur;V.onStop?.(V,st);}V.d=nd;}
  const [x,z,yaw]=routeAt(r,V.d);V.g.position.set(x,0,z);V.g.rotation.y=angLerp(V.g.rotation.y,yaw,Math.min(1,dt*4));}

// ---- modellen
function busModel(){const g=vGroup();vBox(g,2.5,2.6,11.5,CM.white,0,1.75,0);vBox(g,2.52,0.9,10.6,CM.glass,0,2.3,-0.2);vBox(g,2.52,0.3,11.52,CM.green,0,1.0,0);vBox(g,2.4,0.9,0.06,CM.glass,0,2.2,5.76);
  vBox(g,1.4,0.3,0.06,CM.dark,0,2.95,5.77);for(const x of[-0.8,0.8]){vBox(g,0.3,0.15,0.05,CM.head,x,1.1,5.77);vBox(g,0.3,0.15,0.05,CM.tail,x,1.2,-5.77);}vWheels(g,[-1.1,1.1],[-3.8,3.8],0.5);return g;}
function garbageModel(){const g=vGroup();vBox(g,2.5,2.4,2.4,CM.orange,0,1.7,3.2);vBox(g,2.52,0.9,1.2,CM.glass,0,2.2,3.9);vBox(g,2.5,2.8,6,CM.grey,0,1.9,-1.2);vBox(g,2.3,1.6,1.2,CM.dark,0,1.5,-4.6);
  vBox(g,2.52,0.25,6.02,CM.orange,0,0.9,-1.2);for(const x of[-0.8,0.8])vBox(g,0.3,0.15,0.05,CM.head,x,1.1,4.41);vWheels(g,[-1.1,1.1],[-3,-1.6,3],0.5);return g;}
function parcelModel(){const g=vGroup();vBox(g,2.0,2.5,4.4,CM.white,0,1.55,-0.4);vBox(g,2.0,1.4,1.4,CM.white,0,1.05,2.5);vBox(g,2.02,0.6,0.9,CM.glass,0,1.95,1.9);vBox(g,2.02,0.35,4.42,CM.blue,0,1.0,-0.4);
  for(const x of[-0.7,0.7])vBox(g,0.3,0.15,0.05,CM.head,x,0.95,3.21);vWheels(g,[-0.9,0.9],[-1.8,2.2],0.38);return g;}
function ambulanceModel(){const g=vGroup();vBox(g,2.2,2.5,4.6,CM.white,0,1.6,-0.6);vBox(g,2.1,1.5,1.6,CM.white,0,1.1,2.4);vBox(g,2.12,0.6,0.9,CM.glass,0,1.95,1.9);
  vBox(g,2.22,0.3,4.62,CM.blue,0,1.35,-0.6);vBox(g,2.22,0.25,4.62,CM.yellow,0,0.95,-0.6);for(const x of[-0.6,0.6])vBox(g,0.45,0.18,0.3,CM.blink,x,2.95,1.3);vBox(g,0.4,0.18,0.3,CM.blink,0,2.95,-2.8);
  for(const x of[-0.7,0.7])vBox(g,0.3,0.15,0.05,CM.head,x,0.95,3.21);vWheels(g,[-0.95,0.95],[-2,2.2],0.4);return g;}

// ---- bushaltes: wachthuisje op de stoep; wie wacht staat erbij en stapt in als de bus er is
const BUS_PTS=[[25,560],[25,387],[-61,387],[-61,273],[25,273],[25,239],[-97,239],[-97,101],[25,101],[25,560]];
const BUS={g:null,len:11.5,r:cityRoute(BUS_PTS),d:0,v:0,vmax:9,wait:0,stops:[],idle:20,on:false};
const HALTES=[{name:'Station / Marktplein',x:-48,z:387},{name:'Molenweg',x:-40,z:239},{name:'Esdoornlaan',x:-97,z:142}].map((h,i)=>{
  const d=routeNear(BUS.r,h.x,h.z),[px,pz,yaw]=routeAt(BUS.r,d),nx=-Math.cos(yaw),nz=Math.sin(yaw),alongX=Math.abs(Math.sin(yaw))>0.5;   // rechts van de rijrichting (stoepkant)
  let sx=px+nx*2.8,sz=pz+nz*2.8;const hw=alongX?1.6:0.8,hd=alongX?0.8:1.6,ok=(x,z)=>layFree([x-hw,z-hd,x+hw,z+hd],['kiosk','lamp','tree','kast','kk','car','hedge','shed','house','apt','small','hall'],0.2);
  for(let k=0;k<20&&!ok(sx,sz);k++){const s=(k%2?1:-1)*Math.ceil((k+1)/2)*2.5;sx=px+nx*2.8+Math.sin(yaw)*s;sz=pz+nz*2.8+Math.cos(yaw)*s;}
  const g=new THREE.Group();g.position.set(sx,0.1,sz);g.rotation.y=yaw-Math.PI/2;staticRoot.add(g);   // achterwand van de weg af
  const gl=mat({color:0xbfd6e2,roughness:0.1,metalness:0.2,transparent:true,opacity:0.35,depthWrite:false});
  box(0.08,2.3,1.2,gl,g,-1.5,1.15,0);box(0.08,2.3,1.2,gl,g,1.5,1.15,0);box(3.1,2.3,0.06,gl,g,0,1.15,0.6);box(3.3,0.12,1.5,MAT.galvDark||MAT.galv,g,0,2.36,0);box(2.4,0.08,0.4,CM.brown,g,0,0.48,0.3);
  cyl(0.05,0.05,2.7,MAT.galv,g,1.9,1.35,-0.5,6);const sg=mesh(new THREE.PlaneGeometry(0.6,0.6),new THREE.MeshBasicMaterial({map:signTex('BUS','#f2c419','#1d2b45',256,256,'bold 110px Arial')}),g,1.9,2.55,-0.5);sg.rotation.y=Math.PI/2;
  lay('halte',sx-hw,sz-hd,sx+hw,sz+hd);return {...h,d,sx,sz,yaw,wait:i===0?2:1,fig:[16+i*3,17+i*3,18+i*3]};});
BUS.stops=HALTES.map(h=>({d:h.d,dur:9,h}));
BUS.onStop=(V,st)=>{st.h.boarding=true;};BUS.onGo=V=>{for(const h of HALTES)if(h.boarding){h.boarding=false;h.wait=0;}};

// ---- vuilniswagen (werkdagen 's ochtends): stopt om de 30 m bij de kliko's
const GARB_PTS=[[25,101],[-97,101],[-97,239],[63,239],[63,101],[25,101]];
const GARB={g:null,len:8.5,r:cityRoute(GARB_PTS),d:0,v:0,vmax:5,wait:0,stops:[],on:false,done:false};
// ---- pakketbezorger (ma–za overdag): stopt op willekeurige plekken; de bezorger loopt naar de voordeur en terug
const PARCEL_PTS=[[25,101],[63,101],[63,239],[25,239],[25,273],[109,273],[109,387],[25,387],[25,101]];
const PARCEL={g:null,len:5.6,r:cityRoute(PARCEL_PTS),d:0,v:0,vmax:8,wait:0,stops:[],on:false,cour:null};
// ---- ambulance: af en toe met sirene naar de spoedeisende hulp van het ziekenhuis, daarna rustig terug
const AMB={g:null,len:6.2,r:null,d:0,v:0,vmax:13,wait:0,stops:[],state:'idle',next:rnd(60,140),sir:0};

// ---- trein: sprinter stopt bij het station (spoor aan de perronkant), intercity rijdt door; overweg met bomen, lichten en bel
const TRAIN={cars:[],state:'idle',next:rnd(15,40),dir:1,x:0,v:0,kind:'sprinter',wait:0,z:419.25,ring:0,rumble:0};
function trainCar(front,back){const g=new THREE.Group();g.userData.dyn=true;vBox(g,24,3.3,3,CM.white,0,2.15,0);vBox(g,24.02,0.95,3.02,CM.glass,0,2.6,0);vBox(g,24.04,0.28,3.04,CM.red,0,1.2,0);
  vBox(g,23.6,0.35,2.6,CM.grey,0,3.95,0);for(const x of[-8.5,8.5])vBox(g,2.6,0.7,2.4,CM.dark,x,0.55,0);
  for(const [s,on] of[[1,front],[-1,back]])if(on)for(const zz of[-0.9,0.9])vBox(g,0.06,0.25,0.4,s>0?CM.head:CM.tail,s*12.03,1.4,zz);return g;}
const TRAIN_G=vGroup();for(let i=0;i<4;i++){const c=trainCar(true,true);c.position.x=-i*25;TRAIN_G.add(c);TRAIN.cars.push(c);}
// overwegbomen en -lichten (beweegbaar; de palen staan er al), twee lampen die om en om knipperen
const XING_LAMPS=[mat({color:0x300000,emissive:0xff2010,emissiveIntensity:0}),mat({color:0x300000,emissive:0xff2010,emissiveIntensity:0})];
const XING_ARMS=[[20.5,414.5,1],[29.5,429.5,-1]].map(([x,z,s])=>{const p=new THREE.Group();p.position.set(x,1.25,z);p.userData.dyn=true;scene.add(p);
  for(let i=0;i<6;i++)vBox(p,0.86,0.12,0.1,i%2?CM.white:CM.red,s*(0.45+i*0.86),0,0);p.rotation.z=s*Math.PI*0.47;
  [0,1].forEach(k=>{const o=vBox(scene,0.22,0.22,0.12,XING_LAMPS[k],x+(k?0.18:-0.18),2.35,z+(s>0?-0.12:0.12));o.userData.dyn=true;});return {p,s};});

function trainLen(){return TRAIN.kind==='sprinter'?3*25:4*25;}
function trainTick(dt){const T=TRAIN,run=!SIM.paused&&!GAME.ended;
  if(T.state==='idle'){TRAIN_G.visible=false;if(run&&(T.next-=dt)<=0){T.kind=Math.random()<0.6?'sprinter':'intercity';T.dir=Math.random()<0.5?1:-1;T.z=T.kind==='sprinter'?419.25:424.25;
      T.x=-T.dir*1150;T.v=T.kind==='sprinter'?26:36;T.state='rijdt';T.cars.forEach((c,i)=>{c.visible=i<trainLen()/25;});}}
  if(T.state==='idle')return;const len=trainLen();
  if(run){if(T.state==='stopt'){T.wait-=dt;if(T.wait<=0){T.state='rijdt';T.left=true;AudioSys.tone?.({f:180,f2:150,type:'sawtooth',gain:0.03*distGain(V3(-35,2,419)),dur:0.8});}}
    else{let vmax=T.kind==='sprinter'?26:36;if(T.kind==='sprinter'&&!T.left){const stopX=-35+T.dir*len/2,dist=(stopX-T.x)*T.dir;vmax=Math.min(vmax,Math.sqrt(2*0.9*Math.max(0,dist)));if(dist<0.3){T.v=0;T.state='stopt';T.wait=16;}}
      T.v=T.state==='stopt'?0:Math.min(vmax,T.v+0.8*dt);T.x+=T.v*T.dir*dt;}}
  if((T.x-T.dir*len)*T.dir>1200){T.state='idle';T.left=false;T.next=rnd(45,110);return;}
  TRAIN_G.visible=true;TRAIN_G.position.set(T.x,0.15,T.z);TRAIN_G.rotation.y=T.dir>0?0:Math.PI;T.cars.forEach((c,i)=>c.position.x=-12-i*25);
  // dreun van de trein als hij dichtbij is
  if(run&&T.v>3){T.rumble-=dt;const d=Math.abs(camera.position.x-T.x)+Math.abs(camera.position.z-T.z);if(T.rumble<=0&&d<260){T.rumble=0.5;AudioSys.burst?.({type:'lowpass',f:180,gain:0.18*distGain(V3(T.x,1,T.z))*Math.min(1,T.v/20),dur:0.7,attack:0.2});}}}
// overweg (x 20–30) dicht als de trein erop staat, eraan komt en er nog overheen moet, of als hij aan het perron staat en zo vertrekt richting overweg.
// Een sprinter die vóór de overweg stopt, laat de bomen open tot vlak voor vertrek.
function xingNear(){const T=TRAIN;if(T.state==='idle')return false;const len=trainLen(),head=T.x,tail=T.x-T.dir*len,ahead=(25-head)*T.dir;
  if(Math.max(head,tail)>18&&Math.min(head,tail)<32)return true;
  if(T.state==='stopt')return T.wait<9&&ahead>0&&ahead<140;
  if(ahead<=0||ahead>320)return false;
  if(T.kind==='sprinter'&&!T.left){const stopHead=-35+T.dir*len/2;if((25-stopHead)*T.dir>0)return false;}   // stopt eerst bij het perron, vóór de overweg
  return true;}
function xingTick(dt){const near=xingNear();
  XING.closed=near;XING.k=clamp(XING.k+(near?1:-1)*dt/2.5,0,1);XING_ARMS.forEach(a=>a.p.rotation.z=a.s*Math.PI*0.47*(1-XING.k));
  const blink=near&&(performance.now()%1000)<500;XING_LAMPS[0].emissiveIntensity=near&&blink?4:0;XING_LAMPS[1].emissiveIntensity=near&&!blink?4:0;
  if(near&&!SIM.paused){XING.bell=(XING.bell||0)-dt;if(XING.bell<=0){XING.bell=0.5;const v=distGain(V3(25,2,422));if(camera.position.distanceTo(V3(25,2,422))<300)AudioSys.tone?.({f:1250,type:'triangle',gain:0.035*v,dur:0.12});}}}

// ---- weekmarkt op het Marktplein: woensdag en zaterdag 8:00–13:30, kramen met gestreepte luifels
const MARKET=(()=>{const g=vGroup(),awn=c=>{const cv=cnv(64,16),x=cv.getContext('2d');for(let i=0;i<8;i++){x.fillStyle=i%2?'#ffffff':c;x.fillRect(i*8,0,8,16);}return toTex(cv);};
  const cols=['#c81f2a','#2f7a3c','#234a8a','#e8761c'],goods=[0xd83a2a,0xf0c419,0x7ac043,0xe8761c,0x8a5a3a,0xf2f2ee];
  for(const z of[366.6,377.4])for(const x of[-114,-102,-90,-78]){const k=new THREE.Group();k.position.set(x,0,z);k.rotation.y=z<372?0:Math.PI;g.add(k);
    vBox(k,3.4,0.9,1.4,CM.brown,0,0.45,0);for(const [dx,dz] of[[-1.65,-0.65],[1.65,-0.65],[-1.65,0.65],[1.65,0.65]])vBox(k,0.06,2.4,0.06,CM.grey,dx,1.2,dz);
    const a=new THREE.Mesh(new THREE.PlaneGeometry(3.6,1.9),mat({map:awn(pick(cols)),roughness:0.8,side:THREE.DoubleSide}));a.rotation.x=-Math.PI/2+0.25;a.position.set(0,2.45,0.1);k.add(a);
    for(let i=0;i<4;i++)vBox(k,0.7,0.22,0.5,mat({color:pick(goods),roughness:0.8}),-1.15+i*0.77,1.02,0.2);}
  return g;})();
const marketOn=()=>{const d=cityDay(),h=viewHour();return (d===3||d===6)&&h>=8&&h<13.5;};
const schoolBreak=()=>{const d=cityDay(),h=viewHour();return d>=1&&d<=5&&(h>=10.25&&h<10.5||h>=12&&h<12.75&&d!==3||h>=14.9&&h<15.15&&d!==3);};
// vrije figuren laten rondlopen binnen een rechthoek (markt, schoolplein)
function wander(f,rect,dt,spd,run){if(!f.tx||Math.random()<0.002){f.tx=rnd(rect[0],rect[2]);f.tz=rnd(rect[1],rect[3]);}
  if(f.pause>0){f.pause-=dt;f.walk=false;return;}const dx=f.tx-f.x,dz=f.tz-f.z,L=Math.hypot(dx,dz);
  if(L<0.4){f.pause=rnd(1,5);f.tx=rnd(rect[0],rect[2]);f.tz=rnd(rect[1],rect[3]);return;}f.walk=run;if(run){f.x+=dx/L*spd*dt;f.z+=dz/L*spd*dt;}f.yaw=Math.atan2(dx,dz);}
function crowd(idx,rect,on,dt,spd,s,run){idx.forEach(k=>{const f=FIG[k];if(!on){f.on=false;return;}if(!f.on){f.on=true;f.x=rnd(rect[0],rect[2]);f.z=rnd(rect[1],rect[3]);f.pause=rnd(0,3);f.s=s*(0.95+Math.random()*0.1);}wander(f,rect,dt,spd,run);});}
const MARKET_FIG=[...Array(16).keys()],KID_FIG=[...Array(16).keys()].map(i=>32+i),PERRON_FIG=[25,26,27,28,29,30],COURIER_FIG=31;

// ---- fietsers op de rijbaan (rechts), eigen InstancedMeshes: fiets en fietser
const CY_N=10;
const CY=(()=>{const mk=(geo,n,m)=>{const o=new THREE.InstancedMesh(geo,m||new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.7}),n);o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);o.frustumCulled=false;o.castShadow=true;o.userData.dyn=true;o.count=0;scene.add(o);return o;};
  const wheel=new THREE.TorusGeometry(0.33,0.04,6,14).rotateY(Math.PI/2);
  return {frame:mk(new THREE.BoxGeometry(0.06,0.06,1.0).translate(0,0.62,0),CY_N,CM.dark),wheel:mk(wheel,CY_N*2,CM.tyre),torso:mk(new THREE.BoxGeometry(0.42,0.6,0.24),CY_N),head:mk(new THREE.SphereGeometry(0.12,8,6),CY_N,mat({color:0xd6a17e,roughness:0.7})),
    leg:mk(new THREE.BoxGeometry(0.14,0.62,0.16).translate(0,-0.31,0),CY_N*2,mat({color:0x2a3550,roughness:0.85}))};})();
const CYCLISTS=Array.from({length:CY_N},(_,i)=>{const loop=LOOPS[i%2],dir=i%4<2?1:-1,lane=(()=>{const off=dir>0?2.5:-2.5,xs=loop.map(p=>p[0]),zs=loop.map(p=>p[1]),x0=Math.min(...xs)+off,x1=Math.max(...xs)-off,z0=Math.min(...zs)+off,z1=Math.max(...zs)-off,pts=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];return dir>0?pts:pts.reverse();})();
  const segs=lane.map((p,k)=>{const q=lane[(k+1)%4];return {p,q,len:Math.hypot(q[0]-p[0],q[1]-p[1])};}),total=segs.reduce((a,s)=>a+s.len,0);return {segs,total,d:(i*0.29%1)*total,v:rnd(4,6),ph:Math.random()*6,k:(i+0.5)/CY_N};});
(()=>{const c=new THREE.Color();for(let i=0;i<CY_N;i++)CY.torso.setColorAt(i,c.setHex(pick(WALK_COL.shirt)));CY.torso.instanceColor.needsUpdate=true;})();
const _cy=new THREE.Object3D(),_cp=new THREE.Object3D(),_cm=new THREE.Matrix4();
function cySet(m,i,x,y,z,rx,rz=0){_cp.position.set(x,y,z);_cp.rotation.set(rx,0,rz);_cp.updateMatrix();m.setMatrixAt(i,_cm.multiplyMatrices(_cy.matrix,_cp.matrix));}
function cyclistsTick(dt,show,run){const lvl=show?walkLevel(viewHour())*0.9:0;let n=0;
  for(const c of CYCLISTS){if(c.k>=lvl)continue;const i=n++;if(run){c.d=(c.d+c.v*dt)%c.total;c.ph+=dt*c.v*1.6;}let d=c.d,x=0,z=0,yaw=0;
    for(const s of c.segs){if(d<=s.len){const f=d/s.len;x=s.p[0]+(s.q[0]-s.p[0])*f;z=s.p[1]+(s.q[1]-s.p[1])*f;yaw=Math.atan2(s.q[0]-s.p[0],s.q[1]-s.p[1]);break;}d-=s.len;}
    _cy.position.set(x,0.06,z);_cy.rotation.set(0,yaw,0);_cy.updateMatrix();const p=Math.sin(c.ph)*0.6;
    cySet(CY.frame,i,0,0,0,0);cySet(CY.wheel,2*i,0,0.36,0.55,0);cySet(CY.wheel,2*i+1,0,0.36,-0.5,0);cySet(CY.torso,i,0,1.35,-0.12,0.25);cySet(CY.head,i,0,1.78,0.0,0);
    cySet(CY.leg,2*i,-0.1,1.05,-0.2,-0.9+p);cySet(CY.leg,2*i+1,0.1,1.05,-0.2,-0.9-p);}
  for(const m of[CY.frame,CY.torso,CY.head])m.count=n;CY.wheel.count=CY.leg.count=2*n;for(const m of Object.values(CY))m.instanceMatrix.needsUpdate=true;}

// ---- elke frame
function cityTick(dt){const show=GFX.life&&!camInside(),run=!SIM.paused&&!GAME.ended,h=viewHour(),day=cityDay(),dd=run?dt:0;
  trainTick(dt);xingTick(dt);
  for(const V of[BUS,GARB,PARCEL,AMB])if(V.g)V.g.visible=show&&V.on;MARKET.visible=show&&marketOn();cyclistsTick(dt,show,run);
  if(!show){FIG.forEach(f=>f.on=false);return;}
  // bus: rijdt van 6:00 tot 23:30, elke ronde opnieuw (met pauze buiten beeld)
  BUS.g??=busModel();if(!BUS.on){if(h>=6&&h<23.5&&run&&(BUS.idle-=dt)<=0){BUS.on=true;BUS.d=0;BUS.v=0;BUS.stops.forEach(s=>s.done=false);}}
  else{driveVehicle(BUS,dd);if(BUS.d>=BUS.r.total-0.5){BUS.on=false;BUS.idle=rnd(25,60);}}
  HALTES.forEach(hl=>{if(run&&!hl.boarding&&h>=6&&h<23.5){hl.t=(hl.t||rnd(20,60))-dt;if(hl.t<=0){hl.t=rnd(25,70);hl.wait=Math.min(3,hl.wait+1);}}
    hl.fig.forEach((k,j)=>{const f=FIG[k];f.on=j<hl.wait&&!hl.boarding&&h>=6&&h<23.5;if(!f.on)return;const s=Math.sin(hl.yaw),c=Math.cos(hl.yaw);
      f.x=hl.sx+s*(j-1)*0.9+Math.cos(hl.yaw)*0.4;f.z=hl.sz+c*(j-1)*0.9-Math.sin(hl.yaw)*0.4;f.yaw=hl.yaw+Math.PI/2;f.walk=false;f.s=0.97+0.03*j;});
    if(hl.boarding)hl.fig.forEach(k=>FIG[k].on=false);});
  // vuilniswagen: werkdagen tussen 7:30 en 11:00, één ronde door de woonwijk
  const garbDay=day>=1&&day<=5&&h>=7.5&&h<11;if(!garbDay)GARB.doneDay=null;
  if(garbDay&&!GARB.on&&GARB.doneDay!==Math.floor(SIM.t/1440)){GARB.g??=garbageModel();GARB.on=true;GARB.d=0;GARB.v=0;GARB.stops=[];for(let d=30;d<GARB.r.total-10;d+=rnd(24,36))GARB.stops.push({d,dur:rnd(4,7)});}
  if(GARB.on){driveVehicle(GARB,dd);if(GARB.d>=GARB.r.total-0.5){GARB.on=false;GARB.doneDay=Math.floor(SIM.t/1440);}}
  // pakketbezorger: ma–za 9:00–20:00
  const parcelOn=day>=1&&day<=6&&h>=9&&h<20;
  if(parcelOn&&!PARCEL.on&&run){PARCEL.g??=parcelModel();PARCEL.on=true;PARCEL.d=0;PARCEL.v=0;PARCEL.stops=[];for(let d=rnd(60,140);d<PARCEL.r.total-20;d+=rnd(140,260))PARCEL.stops.push({d,dur:16});}
  if(PARCEL.on){driveVehicle(PARCEL,dd);if(PARCEL.d>=PARCEL.r.total-0.5)PARCEL.on=false;}
  {const f=FIG[COURIER_FIG];f.on=false;if(PARCEL.on&&PARCEL.wait>0){const t=16-PARCEL.wait,[x,z,yaw]=routeAt(PARCEL.r,PARCEL.d),nx=-Math.cos(yaw),nz=Math.sin(yaw),out=t<6?t/6:t<10?1:Math.max(0,(16-t)/6);
      f.on=true;f.x=x+nx*(1.4+out*6.5);f.z=z+nz*(1.4+out*6.5);f.yaw=t<6?Math.atan2(nx,nz):t<10?Math.atan2(nx,nz):Math.atan2(-nx,-nz);f.walk=!(t>=6&&t<10)&&run;f.s=1;}}
  // ambulance: af en toe naar de spoedeisende hulp, met sirene en zwaailicht
  ambTick(dt,run,h);
  // weekmarkt en schoolplein
  crowd(MARKET_FIG,[-121,369.5,-75,374.5],marketOn(),dt,0.9,1,run);
  crowd(KID_FIG,[-106,82,-76,94.5],schoolBreak(),dt,2.4,0.62,run);
  // perron: wachtende reizigers als er een sprinter aankomt; ze stappen in
  {const T=TRAIN,due=T.state==='rijdt'&&T.kind==='sprinter'&&!T.left&&Math.abs(T.x+35)<900;PERRON_FIG.forEach((k,j)=>{const f=FIG[k];const want=due&&j<4+(h>7&&h<9||h>16&&h<18?2:0);
    if(want&&!f.on){f.on=true;f.x=-70+j*13+rnd(-3,3);f.z=413.2+rnd(-0.6,0.6);f.yaw=Math.PI;f.walk=false;f.s=1;}if(!want)f.on=false;});}}
function ambTick(dt,run,h){const A=AMB;if(!SITE?.zkh)return;
  if(A.state==='idle'){if(run&&(A.next-=dt)<=0){A.g??=ambulanceModel();const S=SITE.zkh,sx=S.x+34,sz=S.z-34;
      A.r=cityRoute([[25,560],[25,239],[-176,239],[-176,262],[sx,262],[sx,sz-4]]);A.d=0;A.v=0;A.stops=[];A.on=true;A.state='heen';A.vmax=13;}}
  else if(A.state==='heen'){driveVehicle(A,run?dt:0);if(A.d>=A.r.total-0.3){A.state='seh';A.wait=rnd(18,30);}}
  else if(A.state==='seh'){if(run)A.wait-=dt;if(A.wait<=0){A.r=cityRoute([[SITE.zkh.x+34,SITE.zkh.z-38],[SITE.zkh.x+34,262],[-176,262],[-176,239],[25,239],[25,560]]);A.d=0;A.v=0;A.state='terug';A.vmax=9;}}
  else if(A.state==='terug'){driveVehicle(A,run?dt:0);if(A.d>=A.r.total-0.3){A.state='idle';A.on=false;A.next=rnd(240,480);}}
  const sir=A.state==='heen';CM.blink.emissiveIntensity=(A.state==='heen'||A.state==='seh')&&(performance.now()%300)<150?6:0.2;
  if(sir&&run&&A.g){A.sir-=dt;if(A.sir<=0){A.sir=1.2;const v=distGain(A.g.position);if(camera.position.distanceTo(A.g.position)<400)AudioSys.siren?.(v*0.8);}}}
