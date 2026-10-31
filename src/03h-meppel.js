
// ============================================================ OS Meppel (Netbeheer Noord) aan de noordkant van de stad, voorbij het spoor
// Alleen beeld: het netmodel van Meppel (rail MP, velden MP1–MP3, de trafo van Netbeheer Noord) staat in 04-1-net.js.
// Gebouwd met dezelfde bouwers als OS Zuidwolde (scheiders, vermogensschakelaars, stroomtrafo's, afleiders, portalen, masten,
// transformatoren en een bakstenen gebouw), als kleinere kopie: twee lijnvelden naar het noorden, een rail, twee trafovelden en het
// 10 kV-gebouw. Alles wordt eerst in lokale coördinaten gebouwd (zoals Zuidwolde: lijnen naar -z), daarna in één groep gedraaid en
// verplaatst. De apparaten zijn niet bedienbaar: hun registraties en klikvakken gaan weer weg en de bewegende delen worden vastgezet,
// zodat bakeStatic alles samenvoegt. Alleen de deuren van het gebouw blijven bewegen. Aanroep vanuit 06-build.js na buildDistrict().
const MEPPEL={cx:80,cz:505,x0:46,x1:114,z0:451,z1:547};
const MPM={};
// detailniveau: op afstand alleen de grote delen van Meppel tekenen (portalen, trafo's, gebouw, terrein en hek)
function meppelLod(){if(!MPM.fine){const keep=[MAT.lattice,MAT.trafo,MAT.trafoDark,MAT.roof,MAT.gravel,MAT.concrete,MAT.concreteDark,MPM.fence];
    const plates=new Set(plateCache.values());
    MPM.fine=scene.children.filter(o=>o.userData.baked&&o.userData.zone==='meppel'&&!keep.includes(o.material)&&(!o.material.map||plates.has(o.material)));}
  const far=Math.hypot(camera.position.x-MEPPEL.cx,camera.position.z-MEPPEL.cz)>280;if(far!==MPM.far){MPM.far=far;MPM.fine.forEach(o=>o.visible=!far);}}
function buildMeppel(){const M=MEPPEL,P=Math.PI;
  // inrit: het grootste gat in de bomenrij langs de hoofdweg, binnen het hek (bomen staan in LAYOUT)
  {const zs=LAYOUT.filter(e=>e.kind==='tree'&&e.r[0]>29&&e.r[0]<37&&e.r[1]>M.z0-15&&e.r[1]<M.z1).map(e=>(e.r[1]+e.r[3])/2).sort((a,b)=>a-b);
    let best=[M.z0+30,M.z0+40],gap=0;for(let i=1;i<zs.length;i++){const a=Math.max(zs[i-1],M.z0+8),b=Math.min(zs[i],M.z1-8);if(b-a>gap){gap=b-a;best=[a,b];}}
    const c=(best[0]+best[1])/2;M.gate=[c-3.4,c+3.4];}
  const before={scene:new Set(scene.children),st:new Set(staticRoot.children),views:new Set(Object.keys(VIEWS)),pick:pickables.length,lay:LAYOUT.length,doors:DOORS.length,steps:STEPS.length};
  // ---- lokaal bouwen (wereld = centrum min lokaal: lokale -z is het noorden, lokale +x het westen)
  const LX=[-14,14],gz=M.cz-(M.gate[0]+M.gate[1])/2;
  groundQuad(-34,-42,34,54,0.03,MAT.gravel,4);groundQuad(20,gz-3,34,gz+3,0.05,MAT.concrete,4);groundQuad(-22,37,18,43,0.05,MAT.concrete,4);
  // rail op steunen, zoals buildBus
  {const root=grp();[-26,-8,8,26].forEach(x=>{support(root,x,-3.7,6.3);support(root,x,3.7,6.3);box(0.3,0.35,8.0,MAT.galv,root,x,6.475,0);
      BUSZ.forEach(z=>{insulator(root,1.6,0.1,0.22,10,MAT.porcelain,6.65,x,z);box(0.22,0.14,0.22,MAT.alu,root,x,8.28,z);});});
    BUSZ.forEach(z=>{const m=mesh(new THREE.CylinderGeometry(0.06,0.06,53,16),MAT.alu,root,0,BUSY,z);m.rotation.z=P/2;for(const x of[-26.5,26.5])mesh(new THREE.SphereGeometry(0.09,12,8),MAT.alu,root,x,BUSY,z);});
    plate('RAIL 110 kV',root,-26,2.2,-3.55,0,0.6);}
  // twee lijnvelden met portaal en een lijn met drie masten, zoals buildLineBay
  LX.forEach((bx,k)=>{const L='MPL'+(k+1);
    const q1=buildDS(L+'-Q1',bx,-7.5),q0=buildCB(L+'-Q0',bx,-13,1),ct=buildCT(L+'-CT',bx,-18.5),q9=buildDS(L+'-Q9',bx,-24.5,{earth:-1,earthId:L+'-Q8'}),sa=buildSA(L+'-SA',bx,-30.5);buildGantry(L,bx,-36);
    PH.forEach((p,i)=>{wire(V3(bx+p,BUSY-0.07,BUSZ[i]),q1.B[i],0.35);wire(q1.A[i],q0.low[i],0.12);wire(q0.top[i],ct.B[i],0.12);wire(ct.A[i],q9.B[i],0.15);wire(q9.A[i],sa.top[i],0.2);wire(sa.top[i],V3(bx+W_G[i],11.85,-38.2),0.45);});
    const tw=[-90,-360,-630];tw.forEach(z=>tower(bx,z));
    PH.forEach((p,i)=>{let prev=V3(bx+W_G[i],11.9,-38.3);tw.forEach((z,j)=>{const a=TOWER_ATT[i],pt=V3(bx+a.x,a.y-1.9,z);wire(prev,pt,j?7:1.4,0.032,MAT.lineCond,j?40:24);prev=pt;});});
    let pe=[V3(bx-6,16,-36),V3(bx+6,16,-36)];tw.forEach((z,j)=>{const pt=V3(bx,27.5,z);pe.forEach(a=>wire(a,pt,j?6:1.2,0.014,MAT.lineCond,j?40:24));pe=[pt];});});
  // twee trafovelden, zoals buildTrafoBay
  LX.forEach((bx,k)=>{const T='TR10'+(k+1);
    const q1=buildDS(T+'-Q1',bx,7.5),q0=buildCB(T+'-Q0',bx,13.5,-1),ct=buildCT(T+'-CT',bx,18.5),sa=buildSA(T+'-SA',bx,25),tr=buildTR(T,bx,31,'110/10,5 kV');
    PH.forEach((p,i)=>{wire(V3(bx+p,BUSY-0.07,BUSZ[i]),q1.A[i],0.35);wire(q1.B[i],q0.low[i],0.12);wire(q0.top[i],ct.A[i],0.12);wire(ct.B[i],tr.hv[i],0.5);wire(sa.top[i],tr.hv[i],0.25);});});
  // 10 kV-gebouw met de uitgaande velden; deuren en naambord aan de terreinkant
  buildBuilding({id:'MPB',x0:-22,x1:18,z0:43,z1:52,doors:[-14,10],label:'OS MEPPEL  ·  10 kV'});
  // hek met poort aan de weg (lokale +x), en terreinverlichting
  MPM.fence??=(()=>{const t=toTex(C.chain);t.repeat.set(1,1);return mat({map:t,alphaTest:0.45,side:THREE.DoubleSide,metalness:0.6,roughness:0.45,color:0xcfd4d6});})();
  const H=2.4,fence=(ax,az,bx,bz)=>{const Ln=Math.hypot(bx-ax,bz-az);if(Ln<0.5)return;const g=new THREE.PlaneGeometry(Ln,H),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Ln/0.11,uv.getY(i)*H/0.11);
    const pl=mesh(g,MPM.fence,staticRoot,(ax+bx)/2,H/2+0.05,(az+bz)/2);pl.rotation.y=Math.atan2(-(bz-az),bx-ax);pl.castShadow=false;
    const n=Math.ceil(Ln/3.5);for(let i=0;i<=n;i++)cyl(0.04,0.04,H+0.3,MAT.galv,staticRoot,ax+(bx-ax)*i/n,(H+0.3)/2,az+(bz-az)*i/n,6);};
  fence(-34,-42,34,-42);fence(-34,-42,-34,54);fence(-34,54,34,54);fence(34,54,34,gz+3.4);fence(34,gz-3.4,34,-42);for(const z of[gz-3.4,gz+3.4])box(0.25,2.8,0.25,MAT.galvDark,staticRoot,34,1.4,z);
  for(const [x,z] of[[-30,-38],[30,-38],[-30,34],[30,34]]){cyl(0.08,0.12,9,MAT.galv,staticRoot,x,4.5,z,8);box(0.7,0.25,0.5,MAT.lamp,staticRoot,x,9.1,z);}
  // ---- apparaten in de juiste stand zetten (scheiders dicht, aarding open), daarna registraties en klikvakken weghalen
  const newViews=Object.keys(VIEWS).filter(k=>!before.views.has(k)),tmp=[];
  for(const k of newViews)for(const id of[k,k.replace(/-Q9$/,'-Q8')])if(!D[id]){D[id]={id,state:/-Q8$/.test(id)?0:1,fans:false,a:'',busy:false};tmp.push(id);}
  for(let i=0;i<6;i++)newViews.forEach(k=>VIEWS[k].update?.(3));
  tmp.forEach(id=>delete D[id]);newViews.forEach(k=>delete VIEWS[k]);
  const picks=pickables.splice(before.pick);picks.forEach(p=>scene.remove(p));
  // ---- alles in één groep, gedraaid en op zijn plek
  const grpM=new THREE.Group();grpM.position.set(M.cx,0,M.cz);grpM.rotation.y=P;
  scene.children.filter(o=>!before.scene.has(o)).forEach(o=>{scene.remove(o);grpM.add(o);});
  staticRoot.children.filter(o=>!before.st.has(o)).forEach(o=>{staticRoot.remove(o);grpM.add(o);});
  staticRoot.add(grpM);grpM.updateMatrixWorld(true);
  // bewegende delen vastzetten (worden dan samengevoegd), behalve de deurbladen; deur- en tredeposities naar de wereld
  const doors=DOORS.slice(before.doors),keep=new Set(doors.flatMap(d=>d.leaves.map(l=>l.g)));
  grpM.traverse(o=>{if(o.userData.dyn&&!keep.has(o))o.userData.dyn=false;});
  doors.forEach(d=>{d.p=grpM.localToWorld(d.p.clone());});
  for(let i=before.steps;i<STEPS.length;i++){const s=STEPS[i],a=grpM.localToWorld(V3(s[0],0,s[1])),b=grpM.localToWorld(V3(s[2],0,s[3]));STEPS[i]=[Math.min(a.x,b.x),Math.min(a.z,b.z),Math.max(a.x,b.x),Math.max(a.z,b.z),s[4]];}
  LAYOUT.splice(before.lay);
  // inrit vanaf de hoofdweg (in wereldcoördinaten)
  groundQuad(28,M.gate[0]+0.4,M.x0+0.2,M.gate[1]-0.4,0.045,MAT.asphalt,6);
  lay('site',M.x0,M.z0,M.x1,M.z1);}
