
// ============================================================ kabeltracés (GIS): waar de kabels fysiek liggen
// Elke kabel heeft een tracé langs de straten (in de stoep of berm) met moffen en een aanlegjaar.
// Röntgenblik (X): de kabels oplichtend op straat in 3D. Kabeltablet (G): kaart met je positie, GIS-stijl of luchtfoto.

// ---- wegennet: hartlijnen van de geregistreerde wegen, plus de hoofdweg en de stationsweg
const GIS_NET=(()=>{const segs=[];const add=(x0,z0,x1,z1)=>segs.push({x0:Math.min(x0,x1),z0:Math.min(z0,z1),x1:Math.max(x0,x1),z1:Math.max(z0,z1),h:z0===z1});
  for(const e of LAYOUT){if(e.kind!=='road')continue;const [x0,z0,x1,z1]=e.r;if(x1-x0>=z1-z0){const z=(z0+z1)/2;add(x0-4,z,x1+4,z);}else{const x=(x0+x1)/2;add(x,z0-4,x,z1+4);}}
  add(25,37,25,470);add(-34,41,90,41);
  // knooppunten: eindpunten en kruisingen; per weg de knooppunten erop, gesorteerd: dat zijn de takken
  const nodes=[],key=(x,z)=>Math.round(x*2)+','+Math.round(z*2),idx=new Map();
  const node=(x,z)=>{const k=key(x,z);if(!idx.has(k)){idx.set(k,nodes.length);nodes.push({x,z,e:[]});}return idx.get(k);};
  const on=(s,x,z)=>s.h?Math.abs(z-s.z0)<0.6&&x>=s.x0-0.6&&x<=s.x1+0.6:Math.abs(x-s.x0)<0.6&&z>=s.z0-0.6&&z<=s.z1+0.6;
  const pts=[];segs.forEach(s=>pts.push([s.x0,s.z0],[s.x1,s.z1]));
  for(const a of segs)for(const b of segs)if(a.h&&!b.h&&b.x0>=a.x0-0.6&&b.x0<=a.x1+0.6&&a.z0>=b.z0-0.6&&a.z0<=b.z1+0.6)pts.push([b.x0,a.z0]);
  for(const s of segs){const on_=pts.filter(([x,z])=>on(s,x,z)).map(([x,z])=>s.h?[x,s.z0]:[s.x0,z]).sort((p,q)=>s.h?p[0]-q[0]:p[1]-q[1]);
    for(let i=1;i<on_.length;i++){const a=node(...on_[i-1]),b=node(...on_[i]);if(a===b)continue;const L=Math.hypot(nodes[a].x-nodes[b].x,nodes[a].z-nodes[b].z);nodes[a].e.push([b,L]);nodes[b].e.push([a,L]);}}
  return {segs,nodes};})();
// dichtstbijzijnde punt op het wegennet (projectie op een tak)
function gisSnap(x,z){let best=null;for(const n of GIS_NET.nodes)for(const [j] of n.e){const m=GIS_NET.nodes[j],dx=m.x-n.x,dz=m.z-n.z,L2=dx*dx+dz*dz||1,t=clamp(((x-n.x)*dx+(z-n.z)*dz)/L2,0,1),px=n.x+dx*t,pz=n.z+dz*t,d=Math.hypot(px-x,pz-z);
    if(!best||d<best.d)best={d,x:px,z:pz,a:GIS_NET.nodes.indexOf(n),b:j};}return best;}
// kortste route over het wegennet (Dijkstra) tussen twee punten; geeft de punten op de hartlijn
function gisPath(ax,az,bx,bz){const A=gisSnap(ax,az),B=gisSnap(bx,bz),N=GIS_NET.nodes;if(!A||!B)return null;
  if((A.a===B.a&&A.b===B.b)||(A.a===B.b&&A.b===B.a))return [[A.x,A.z],[B.x,B.z]];
  const dist=new Map(),prev=new Map(),done=new Set(),q=[];const push=(i,d,p)=>{if(d<(dist.get(i)??1e18)){dist.set(i,d);prev.set(i,p);q.push([d,i]);}};
  for(const i of[A.a,A.b])push(i,Math.hypot(N[i].x-A.x,N[i].z-A.z),-1);
  while(q.length){q.sort((p,r)=>p[0]-r[0]);const [d,i]=q.shift();if(done.has(i))continue;done.add(i);if(i===B.a||i===B.b)break;for(const [j,L] of N[i].e)push(j,d+L,i);}
  const tot=i=>(dist.get(i)??1e18)+Math.hypot(N[i].x-B.x,N[i].z-B.z),end=tot(B.a)<=tot(B.b)?B.a:B.b;if(!dist.has(end))return null;
  const out=[[B.x,B.z]];for(let i=end;i!==-1;i=prev.get(i))out.push([N[i].x,N[i].z]);out.push([A.x,A.z]);return out.reverse();}
// tracé van P naar Q: haakse aansluiting (spruit) vanaf P naar de sleuf, langs de sleuf (hartlijn + verschuiving), haaks naar Q
function gisRoute(P,Q,off){const c=gisPath(P[0],P[1],Q[0],Q[1]);if(!c)return [P,Q];const o=c.map(([x,z])=>[x+off,z+off]),out=[P];
  const spur=(p,q)=>{const s=gisSnap(q[0]-off,q[1]-off),hz=s&&GIS_NET.nodes[s.a].z===GIS_NET.nodes[s.b].z;return hz?[p[0],q[1]]:[q[0],p[1]];};
  out.push(spur(P,o[0]),...o,spur(Q,o[o.length-1]),Q);
  const r=[];for(const p of out){const l=r[r.length-1];if(l&&Math.hypot(l[0]-p[0],l[1]-p[1])<0.2)continue;r.push(p);}
  for(let i=r.length-2;i>0;i--){const [a,b,c2]=[r[i-1],r[i],r[i+1]];if((Math.abs(a[0]-b[0])<0.05&&Math.abs(b[0]-c2[0])<0.05)||(Math.abs(a[1]-b[1])<0.05&&Math.abs(b[1]-c2[1])<0.05))r.splice(i,1);}
  return r;}
const polyLen=p=>p.reduce((a,q,i)=>i?a+Math.hypot(q[0]-p[i-1][0],q[1]-p[i-1][1]):0,0);
function polyAt(p,d){for(let i=1;i<p.length;i++){const L=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);if(d<=L||i===p.length-1){const f=L?clamp(d/L,0,1):0;return [p[i-1][0]+(p[i][0]-p[i-1][0])*f,p[i-1][1]+(p[i][1]-p[i-1][1])*f];}d-=L;}return p[0];}

// ---- de kabels
const CABLES=[];
const OS_EXIT={F1:-14,F2:-10,F3:-6,F4:-2,F5:2,F6:6,G1:52,G2:56,G3:60,G4:64};   // waar de kabel het gebouw verlaat (x, voorgevel z 46)
const osExit=f=>[OS_EXIT[f]??0,46];
const R_GIS=mulberry32(4242);   // eigen vaste reeks: het landschap blijft hetzelfde
function cableType(kind,year){if(kind==='ls'||kind==='kk')return year<1985?'GPLK 4×95 Al (papier-lood)':'VMvKas 4×150 Al';
  return year<1990?'GPLK 3×150 Cu (papier-lood)':year<2005?'XLPE 3×1×150 Al':'XLPE 3×1×240 Al';}
function addCable(o){const len=polyLen(o.pts),year=o.year??(1966+Math.floor(R_GIS()*56)),moffen=[];
  for(let d=rr2(40,140);d<len-20;d+=rr2(90,200)){const [x,z]=polyAt(o.pts,d),y=R_GIS()<0.3?year+Math.floor(R_GIS()*(2024-year)):year;moffen.push({d,x,z,year:Math.min(2024,y)});}
  const c=Object.assign({len,year,moffen,type:cableType(o.kind,year)},o);CABLES.push(c);return c;}
function rr2(a,b){return a+R_GIS()*(b-a);}
// 10 kV ringkabels: per kabelstuk tussen twee stations (of tussen het OS en het eerste station)
RINGS.forEach((rg,ri)=>RING.secs.filter(s=>s.ring===rg).forEach(s=>{const st=id=>RING.stations.find(x=>x.id===id);
  const P=s.a?st(s.a).pos:osExit(rg.from),Q=s.b?st(s.b).pos:osExit(rg.to);
  addCable({id:s.id,kind:'ring',kv:10,sec:s,name:`10 kV ringkabel ${secName(s)}`,pts:gisRoute([...P],[...Q],3.6+ri*0.35)});}));
// MS-velden naar de grote afnemers; zonnepark, industrie en buitengebied lopen het kaartbeeld uit
[['F5',()=>[SITE.zkh.x+40,SITE.zkh.z-62]],['F6',()=>[SITE.kassen.x0+6,101]],['G4',()=>[SITE.rwzi.x+10,SITE.rwzi.z+62]]].forEach(([id,q],i)=>{const f=FD(id);
  addCable({id,kind:'feeder',kv:is20(f.bus)?20:10,f,name:`${is20(f.bus)?20:10} kV kabel ${f.cb} → ${f.name}`,pts:gisRoute(osExit(id),q(),4.3+i*0.3)});});
[['G1',[1500,47],'Zonnepark De Hoeve (±3 km)'],['G2',[-1500,47],'Industrieterrein Noord (±2,5 km)'],['G3',[1500,49],'Buitengebied Oost (±4 km)']].forEach(([id,q,to],i)=>{const f=FD(id),P=osExit(id);
  addCable({id,kind:'feeder',kv:20,f,far:to,name:`20 kV kabel ${f.cb} → ${to}`,pts:[P,[P[0],45+i],[q[0]<0?-300:600,45+i],q]});});
// laagspanning: per LS-groep een kabel van het MS-station naar de straat of het gebouw van die groep
// het eindpunt ligt op de gevel aan de straatkant (daar zit de aansluiting), niet midden in het gebouw
const rectAt=(x,z)=>LAYOUT.find(e=>['house','apt','hall','small'].includes(e.kind)&&x>=e.r[0]-0.5&&x<=e.r[2]+0.5&&z>=e.r[1]-0.5&&z<=e.r[3]+0.5)?.r;
// per gevel het punt het dichtst bij de straat; kies de gevel met de kortste vrije aansluiting (niet dwars door andere gebouwen)
function facadePoint(r){const cx=(r[0]+r[2])/2,cz=(r[1]+r[3])/2,cands=[[cx,r[1]-0.4],[cx,r[3]+0.4],[r[0]-0.4,cz],[r[2]+0.4,cz]];let best=null;
  const blocked=(ax,az,bx,bz)=>{const L=Math.hypot(bx-ax,bz-az);for(let d=0.8;d<L;d+=1){const x=ax+(bx-ax)*d/L,z=az+(bz-az)*d/L;
    if(LAYOUT.some(e=>e.r!==r&&['house','apt','hall','small','kiosk'].includes(e.kind)&&x>e.r[0]&&x<e.r[2]&&z>e.r[1]&&z<e.r[3]))return true;}return false;};
  for(const [x0,z0] of cands){const sn=gisSnap(x0,z0);if(!sn)continue;const hz=GIS_NET.nodes[sn.a].z===GIS_NET.nodes[sn.b].z;
    // langs de gevel naar het punt recht tegenover de straat schuiven (binnen de gevel)
    const x=hz?clamp(sn.x,r[0],r[2]):x0,z=hz?z0:clamp(sn.z,r[1],r[3]),fx=x0===cx?x:x0,fz=z0===cz?z:z0,ex=hz?fx:sn.x,ez=hz?sn.z:fz,d=Math.hypot(ex-fx,ez-fz);
    if(!blocked(fx,fz,ex,ez)&&(!best||d<best.d))best={d,p:[fx,fz]};}
  return best?.p||[cx,r[3]+0.4];}
const LS_ANCHOR=(()=>{const A=new Map(),rows=LAYOUT.filter(e=>e.kind==='house'||e.kind==='apt').map(e=>({x:(e.r[0]+e.r[2])/2,z:(e.r[1]+e.r[3])/2,r:e.r}));
  RING.stations.forEach(s=>{const res=s.groups.filter(g=>g.kind==='res'),mine=rows.filter(r=>nearestStation(r.x,r.z)===s).sort((a,b)=>Math.atan2(a.z-s.pos[1],a.x-s.pos[0])-Math.atan2(b.z-s.pos[1],b.x-s.pos[0]));
    res.forEach((g,i)=>{const r=mine[Math.floor((i+0.5)*mine.length/Math.max(1,res.length))];if(r)A.set(g.id,facadePoint(r.r));});
    s.groups.forEach(g=>{const E=SMALL.find(e=>e.name===g.name);if(!E?.pos||A.has(g.id))return;const r=rectAt(...E.pos);A.set(g.id,r?facadePoint(r):E.pos);});});return A;})();
RING.stations.forEach(s=>s.groups.forEach((g,j)=>{if(g.kind==='ovl')return;const a=LS_ANCHOR.get(g.id)||[s.pos[0]+(j%2?40:-40),s.pos[1]+(j<2?-6:6)];
  addCable({id:g.id,kind:'ls',kv:0.4,g,name:`LS-kabel ${g.id} ${g.name}`,pts:gisRoute([...s.pos],a,4.7+(j%3)*0.25)});}));
// kabelkasten: LS-koppelkabel van beide stations naar de kast
LS_LINKS.forEach(d=>[d.a,d.b].forEach((gid,i)=>{const s=RING.stations.find(x=>x.id===D[gid].bay);
  addCable({id:d.id+'-'+(i?'b':'a'),kind:'kk',kv:0.4,kk:d,name:`LS-koppelkabel ${s.id} → ${d.id}`,pts:gisRoute([...s.pos],d.pos,5.2)});}));

// ---- status per kabel: aan, uit, fout, warm (overbelast), open (kabelkast open)
function cableState(c){if(c.kind==='ring'){const s=c.sec;return s.fault?'fout':!EN.has(s.node)?'uit':(s.temp||0)>CABLE.max?'warm':'aan';}
  if(c.kind==='feeder'){const f=c.f;return f.fault?'fout':!EN.has(f.node)?'uit':(f.temp||0)>CABLE.max?'warm':'aan';}
  if(c.kind==='ls'){const g=c.g;return g.lvf?'fout':!lvgLive(g)?'uit':'aan';}
  return c.kk.state!==1?'open':'aan';}
const GIS_COL={aan10:'#3d9bff',aan20:'#b57cff',aanls:'#f2c94c',uit:'#7a828a',fout:'#ff3b3b',warm:'#ff9a2a',open:'#8fa0b0'};
const cableCol=(c,st=cableState(c))=>st==='aan'?GIS_COL[c.kv===20?'aan20':c.kv===10?'aan10':'aanls']:GIS_COL[st];
const mofCol=y=>y<1985?'#ff5a4a':y<2000?'#f5b335':'#5ccf72';

// ---- röntgenblik (X): lintjes op straat in de kleur van de status, moffen als blokjes
const XRAY={on:false,root:new THREE.Group(),mats:new Map(),mof:null};XRAY.root.visible=false;XRAY.root.userData.dyn=true;scene.add(XRAY.root);
(()=>{
  for(const c of CABLES){const w=c.kind==='ring'||c.kind==='feeder'?0.8:0.55,pos=[],idx=[];
    for(let i=1;i<c.pts.length;i++){const [ax,az]=c.pts[i-1],[bx,bz]=c.pts[i],L=Math.hypot(bx-ax,bz-az)||1,nx=-(bz-az)/L*w/2,nz=(bx-ax)/L*w/2,k=pos.length/3,y=0.2+(c.kv===0.4?0.01:0.02);
      pos.push(ax+nx,y,az+nz,ax-nx,y,az-nz,bx+nx,y,bz+nz,bx-nx,y,bz-nz);idx.push(k,k+2,k+1,k+1,k+2,k+3);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);
    const m=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.92,depthWrite:false,side:THREE.DoubleSide,fog:false});XRAY.mats.set(c,m);
    const me=new THREE.Mesh(g,m);me.renderOrder=6;me.userData.dyn=true;XRAY.root.add(me);}
  buildMofMesh();})();
// moffen als blokjes (opnieuw opgebouwd na een reparatie of vervanging)
function buildMofMesh(){const all=CABLES.flatMap(c=>c.moffen);if(XRAY.mof){XRAY.root.remove(XRAY.mof);XRAY.mof.dispose();}
  const im=new THREE.InstancedMesh(new THREE.BoxGeometry(0.7,0.35,0.7),new THREE.MeshBasicMaterial({color:0xffffff,fog:false}),Math.max(1,all.length)),M4=new THREE.Matrix4(),col=new THREE.Color();
  all.forEach((m,i)=>{im.setMatrixAt(i,M4.makeTranslation(m.x,0.3,m.z));im.setColorAt(i,col.set(mofCol(m.year)));});im.count=all.length;im.userData.dyn=true;XRAY.mof=im;XRAY.root.add(im);}
// foutplek en graafwerk in 3D: rode baken (gevonden fout) – later ook de KLIC-sleuven
const SPOT_MAT=new THREE.SpriteMaterial({map:glowTex,color:0xff3020,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
function gisColors(){if(!XRAY.on)return;const blink=(performance.now()%900)<450;
  for(const [c,m] of XRAY.mats){const st=cableState(c);m.color.set(cableCol(c,st));m.opacity=st==='fout'?(blink?1:0.35):st==='uit'||st==='open'?0.55:0.92;}}
function setXray(on){XRAY.on=on??!XRAY.on;XRAY.root.visible=XRAY.on;$('#xrayBtn')?.classList.toggle('on',XRAY.on);if(XRAY.on)gisColors();gisToast(XRAY.on?'Röntgenblik aan: je ziet de kabels onder straat en stoep (X)':'Röntgenblik uit');}
function gisToast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2400);}

// ---- kabeltablet (G): kaart rond je positie; GIS-stijl of luchtfoto
const TAB={on:false,style:'gis',zoom:1.6,follow:true,cx:0,cz:100,sel:null,aerial:null,layers:{ms:true,ls:true,mof:true}};
const gisOpen=()=>TAB.on;
function openTablet(){if(TAB.on)return;TAB.on=true;TAB.follow=true;$('#gisTab').classList.remove('hidden');renderTabletChrome();drawTablet();}
function closeTablet(){TAB.on=false;$('#gisTab').classList.add('hidden');}
// luchtfoto: één keer van bovenaf gerenderd (overdag, zonder mist) op het moment dat je hem voor het eerst kiest
const AERIAL_B=[-460,-300,700,470];
function captureAerial(){if(TAB.aerial||LITE)return TAB.aerial;const [x0,z0,x1,z1]=AERIAL_B,W=2048,H=Math.round(W*(z1-z0)/(x1-x0));
  const cam=new THREE.OrthographicCamera(x0,x1,-z0,-z1,10,1500);cam.position.set(0,800,0);cam.up.set(0,0,-1);cam.lookAt(0,0,0);
  // ortho-camera kijkt omlaag met 'boven' = -z: links/rechts = x, boven/onder = z0/z1
  cam.left=x0;cam.right=x1;cam.top=-z0;cam.bottom=-z1;cam.updateProjectionMatrix();
  const rt=new THREE.WebGLRenderTarget(W,H,{colorSpace:THREE.SRGBColorSpace}),fog=scene.fog,xr=XRAY.root.visible;updateSky(13);scene.fog=null;XRAY.root.visible=false;
  renderer.setRenderTarget(rt);renderer.render(scene,cam);const px=new Uint8Array(W*H*4);renderer.readRenderTargetPixels(rt,0,0,W,H,px);renderer.setRenderTarget(null);
  scene.fog=fog;XRAY.root.visible=xr;updateSky(viewHour());SHADOW_DIRTY=true;rt.dispose();
  const c=cnv(W,H),g=c.getContext('2d'),id=g.createImageData(W,H);for(let y=0;y<H;y++)id.data.set(px.subarray((H-1-y)*W*4,(H-y)*W*4),y*W*4);g.putImageData(id,0,0);TAB.aerial=c;return c;}
function tabCenter(){if(TAB.follow){const p=FP.on?camera.position:controls.target;TAB.cx=p.x;TAB.cz=p.z;}return [TAB.cx,TAB.cz];}
const tabXY=(x,z,cv)=>{const [cx,cz]=[TAB.cx,TAB.cz],s=TAB.zoom;return [(x-cx)*s+cv.width/2,(z-cz)*s+cv.height/2];};
const tabWorld=(px,py,cv)=>[(px-cv.width/2)/TAB.zoom+TAB.cx,(py-cv.height/2)/TAB.zoom+TAB.cz];
const cableVisible=c=>c.kind==='ring'||c.kind==='feeder'?TAB.layers.ms:TAB.layers.ls;
function drawTablet(){if(!TAB.on)return;const cv=$('#gtMap'),g=cv.getContext('2d'),W=cv.width,H=cv.height,s=TAB.zoom;tabCenter();
  g.setTransform(1,0,0,1,0,0);
  if(TAB.style==='lucht'&&captureAerial()){g.fillStyle='#4b6b3a';g.fillRect(0,0,W,H);const [x0,z0,x1,z1]=AERIAL_B,[ax,ay]=tabXY(x0,z0,cv);g.drawImage(TAB.aerial,ax,ay,(x1-x0)*s,(z1-z0)*s);}
  else{g.fillStyle='#f3f1ea';g.fillRect(0,0,W,H);
    const fill={road:'#cfcfcc',stoep:'#e4e1d8',plein:'#e4e1d8',parkeer:'#d6d5cf',woonerf:'#dcd3c8',site:'#e9eee3',house:'#d9cfc1',apt:'#d1c8bc',hall:'#cfd3d6',small:'#d6d0c6',kiosk:'#9fb4c8',perron:'#d8d4cc',laad:'#d6d5cf'};
    const stroke={house:'#a89a87',apt:'#a09484',hall:'#9aa2a8',small:'#a3998a',kiosk:'#5d7a96',site:'#b7c4ac'};
    for(const k of['site','parkeer','plein','woonerf','stoep','road','perron','laad','hall','apt','house','small','kiosk'])for(const e of LAYOUT){if(e.kind!==k)continue;const [a,b]=tabXY(e.r[0],e.r[1],cv),w=(e.r[2]-e.r[0])*s,h=(e.r[3]-e.r[1])*s;
      if(a>W||b>H||a+w<0||b+h<0)continue;g.fillStyle=fill[k];g.fillRect(a,b,w,h);if(stroke[k]){g.strokeStyle=stroke[k];g.lineWidth=1;g.strokeRect(a+0.5,b+0.5,w-1,h-1);}}
    // hoofdweg, stationsweg en het OS-terrein (niet in het layoutregister)
    g.fillStyle='#cfcfcc';{const [a,b]=tabXY(22,38,cv);g.fillRect(a,b,6*s,432*s);const [c,d]=tabXY(-30,38,cv);g.fillRect(c,d,116*s,6*s);}
    g.strokeStyle='#8a8f96';g.setLineDash([4,3]);{const [a,b]=tabXY(-64,-62,cv);g.strokeRect(a,b,174*s,160*s);}g.setLineDash([]);
    g.fillStyle='#b9a99a';BUILDINGS.forEach(B=>{const [a,b]=tabXY(B.x0,B.z0,cv);g.fillRect(a,b,(B.x1-B.x0)*s,(B.z1-B.z0)*s);});}
  // kabels: dikker voor MS, gestippeld als ze uit staan; de gekozen kabel met een witte rand
  for(const c of CABLES){if(!cableVisible(c))continue;const st=cableState(c);g.beginPath();c.pts.forEach(([x,z],i)=>{const [a,b]=tabXY(x,z,cv);i?g.lineTo(a,b):g.moveTo(a,b);});
    const w=(c.kind==='ring'||c.kind==='feeder'?3.2:2)*Math.min(1.6,Math.max(0.7,s/1.4));
    if(TAB.sel===c){g.strokeStyle='#ffffff';g.lineWidth=w+4;g.setLineDash([]);g.stroke();}
    g.strokeStyle=cableCol(c,st);g.lineWidth=w;g.setLineDash(st==='uit'||st==='open'?[6,4]:[]);g.globalAlpha=st==='fout'&&(performance.now()%900)<450?0.35:1;g.stroke();g.globalAlpha=1;}
  g.setLineDash([]);
  if(TAB.layers.mof&&s>0.8)for(const c of CABLES){if(!cableVisible(c))continue;for(const m of c.moffen){const [a,b]=tabXY(m.x,m.z,cv);if(a<-5||b<-5||a>W+5||b>H+5)continue;g.fillStyle=mofCol(m.year);g.strokeStyle='#222';g.lineWidth=1;g.beginPath();g.arc(a,b,3.2,0,7);g.fill();g.stroke();}}
  gisDrawExtra(g,cv);
  // MS-stations en kabelkasten
  g.font='bold 11px Arial';g.textAlign='center';
  RING.stations.forEach(st=>{const [a,b]=tabXY(...st.pos,cv);g.fillStyle=stationLive(st)?'#1d4f91':'#6b7177';g.fillRect(a-5,b-5,10,10);g.fillStyle='#111';g.fillText(st.id,a,b-8);});
  LS_LINKS.forEach(d=>{const [a,b]=tabXY(...d.pos,cv);g.fillStyle=d.state?'#2f8a4a':'#ffffff';g.strokeStyle='#2f5a3c';g.lineWidth=1.5;g.fillRect(a-3.5,b-3.5,7,7);g.strokeRect(a-3.5,b-3.5,7,7);});
  // eigen positie: pijl in kijkrichting
  {const p=camera.position,dir=camera.getWorldDirection(_tdir),[a,b]=tabXY(p.x,p.z,cv),ang=Math.atan2(dir.x,-dir.z);g.save();g.translate(a,b);g.rotate(ang);g.fillStyle='#e8412c';g.strokeStyle='#fff';g.lineWidth=2;
    g.beginPath();g.moveTo(0,-9);g.lineTo(6,7);g.lineTo(0,3);g.lineTo(-6,7);g.closePath();g.stroke();g.fill();g.restore();}
  // schaalbalk en noordpijl
  {const m=TAB.zoom>2?20:TAB.zoom>0.9?50:TAB.zoom>0.45?100:250,L=m*s;g.fillStyle='rgba(255,255,255,0.85)';g.fillRect(8,H-24,L+44,18);g.fillStyle='#222';g.fillRect(12,H-12,L,3);g.font='11px Arial';g.textAlign='left';g.fillText(`${m} m`,16+L,H-9);
    g.textAlign='center';g.fillStyle='rgba(255,255,255,0.85)';g.fillRect(W-26,8,18,22);g.fillStyle='#222';g.font='bold 11px Arial';g.fillText('N',W-17,20);g.fillText('▲',W-17,29);}
  // dichtstbijzijnde kabel (rondlopen: waar sta ik boven?)
  if(FP.on&&!TAB.sel){const n=nearestCable(camera.position.x,camera.position.z,12);$('#gtInfo').innerHTML=n?cableCard(n.c,n.d):'<small>Geen kabel binnen 12 m. Loop over de stoep: daar liggen de kabels.</small>';}}
const _tdir=new THREE.Vector3();
function nearestCable(x,z,max=8){let best=null;for(const c of CABLES){if(!cableVisible(c))continue;for(let i=1;i<c.pts.length;i++){const [ax,az]=c.pts[i-1],[bx,bz]=c.pts[i],dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz||1,t=clamp(((x-ax)*dx+(z-az)*dz)/L2,0,1),d=Math.hypot(ax+dx*t-x,az+dz*t-z);
    if(d<max&&(!best||d<best.d))best={c,d};}}return best;}
const fmtLen=m=>m>=1000?(m/1000).toFixed(1).replace('.',',')+' km':Math.round(m)+' m';
function cableCard(c,d){const st=cableState(c),old=c.moffen.reduce((a,m)=>Math.min(a,m.year),9999),stTxt={aan:'onder spanning',uit:'spanningsloos',fout:'storing',warm:'overbelast – te warm',open:'open (kabelkast)'}[st];
  const I=c.kind==='ring'?c.sec.I:c.kind==='feeder'?c.f.I:null;
  return `<div class="gt-card"><b style="color:${cableCol(c,st)}">■</b> <b>${c.name}</b>${d!=null?` <small>· ${d.toFixed(1).replace('.',',')} m van je af</small>`:''}<br>
    <small>${c.type} · aangelegd ${c.year} · ${c.far?'tracé loopt het kaartbeeld uit':fmtLen(c.len)} · ${c.moffen.length} mof${c.moffen.length===1?'':'fen'}${c.moffen.length?` (oudste ${old})`:''}<br>
    Status: <b>${stTxt}</b>${I!=null&&st==='aan'?` · ${Math.round(I)} A`:''}</small>${gisCardExtra(c)}</div>`;}
function renderTabletChrome(){$('#gtStyle').textContent=TAB.style==='gis'?'🛰 Luchtfoto':'🗺 Kaart';$('#gtFollow').classList.toggle('on',TAB.follow);
  $('#gisTab').classList.toggle('fp',FP.on);for(const k in TAB.layers){const b=$(`#gisTab [data-gl="${k}"]`);if(b)b.checked=TAB.layers[k];}}
// bediening van de tablet: knoppen, lagen, slepen (overzicht), scrollen om te zoomen, klik op een kabel
(()=>{const T=$('#gisTab'),cv=$('#gtMap');let drag=null;
  T.addEventListener('click',e=>{const b=e.target.closest('[data-gt]');if(!b)return;const a=b.dataset.gt;
    if(a==='close')closeTablet();else if(a==='style'){TAB.style=TAB.style==='gis'?'lucht':'gis';if(TAB.style==='lucht'&&LITE)gisToast('Luchtfoto niet beschikbaar in de testmodus');}
    else if(a==='in')TAB.zoom=Math.min(5,TAB.zoom*1.4);else if(a==='out')TAB.zoom=Math.max(0.25,TAB.zoom/1.4);else if(a==='follow')TAB.follow=true;
    renderTabletChrome();drawTablet();});
  T.addEventListener('change',e=>{const k=e.target.dataset.gl;if(k){TAB.layers[k]=e.target.checked;drawTablet();}});
  cv.addEventListener('wheel',e=>{e.preventDefault();TAB.zoom=clamp(TAB.zoom*(e.deltaY<0?1.15:1/1.15),0.25,5);drawTablet();},{passive:false});
  cv.addEventListener('pointerdown',e=>{drag={x:e.offsetX,y:e.offsetY,moved:false};});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3){drag.moved=true;TAB.follow=false;TAB.cx-=dx/TAB.zoom;TAB.cz-=dy/TAB.zoom;drag.x=e.offsetX;drag.y=e.offsetY;renderTabletChrome();drawTablet();}});
  cv.addEventListener('pointerup',e=>{const d=drag;drag=null;if(d&&d.moved)return;const r=cv.getBoundingClientRect(),[x,z]=tabWorld((e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height,cv),n=nearestCable(x,z,10/TAB.zoom+2);
    TAB.sel=n?.c||null;$('#gtInfo').innerHTML=TAB.sel?cableCard(TAB.sel):'<small>Klik op een kabel voor de gegevens. Slepen schuift de kaart, scrollen zoomt.</small>';drawTablet();});})();
$('#gisBtn')?.addEventListener('click',()=>TAB.on?closeTablet():openTablet());
$('#xrayBtn')?.addEventListener('click',()=>setXray());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.ctrlKey||e.metaKey||!$('#intro').classList.contains('hidden'))return;
  if(e.code==='KeyG'){TAB.on?closeTablet():openTablet();}else if(e.code==='KeyX')setXray();});
let gisT=0;function gisTick(dt){if((gisT+=dt)<0.25)return;gisT=0;gisColors();if(TAB.on){renderTabletChrome();drawTablet();}}
