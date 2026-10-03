
// ============================================================ apparatuur (3D)
const PH = [-2.2,0,2.2];          // faseafstand binnen een veld
const BUSZ = [-2.4,0,2.4];        // fasen van de 110 kV-rail
const BUSY = 8.32;
const W_G = [-4,0,4];             // fasen bij het lijnportaal
const BAYS = {L1:{x:-30},L2:{x:30},T1:{x:-10},T2:{x:10},T3:{x:50},T4:{x:70}};
const VIEWS = {}, pickables = [];
const pickMat = new THREE.MeshBasicMaterial({visible:false});
const easeIO = t => t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

function regView(id,root,update,opt={}){
  root.updateMatrixWorld(true);
  const box3=opt.box||new THREE.Box3().setFromObject(root);
  const c=box3.getCenter(new THREE.Vector3()),s=box3.getSize(new THREE.Vector3());
  const pm=new THREE.Mesh(new THREE.BoxGeometry(s.x+0.4,s.y+0.4,s.z+0.4),pickMat);pm.position.copy(c);
  pm.userData={devId:id,vol:(s.x+0.4)*(s.y+0.4)*(s.z+0.4),noBake:true,inside:opt.inside||0};scene.add(pm);pickables.push(pm);
  VIEWS[id]={id,root,box:box3,center:c,arcPos:opt.arcPos||V3(c.x,box3.max.y-0.5,c.z),labelPos:opt.labelPos||V3(c.x,box3.max.y+0.7,c.z),update:update||null,inside:opt.inside||0,flyPos:opt.flyPos,flyTarget:opt.flyTarget};
  return VIEWS[id];
}
function approach(cur,target,step){return target>cur?Math.min(target,cur+step):Math.max(target,cur-step);}

// --- scheider (draaiende middenonderbreking), optioneel met aardschakelaar
function buildDS(id,bx,z0,{earth=0,earthId=null}={}){
  const root=grp(bx,z0),hs=3.6,posts=[],hinges=[];
  for(const sx of[-3.45,3.45])support(root,sx,0,hs);
  box(7.4,0.28,0.22,MAT.galv,root,0,hs-0.14,0);
  PH.forEach(p=>{
    box(0.2,0.16,2.9,MAT.galv,root,p,hs+0.08,0);
    for(const side of[-1,1]){
      const zz=side*1.15;
      cyl(0.15,0.17,0.2,MAT.galvDark,root,p,hs+0.26,zz);
      const g=new THREE.Group();g.position.set(p,hs+0.36,zz);g.userData.dyn=true;root.add(g);
      insulator(g,1.5,0.085,0.2,9,MAT.porcelain);
      cyl(0.11,0.11,0.12,MAT.alu,g,0,1.56,0);
      rod(V3(0,1.68,0),V3(0,1.68,-side*1.04),0.045,MAT.alu,g,10);
      cyl(0.07,0.07,0.14,MAT.alu,g,0,1.66,0);
      if(side<0)box(0.035,0.1,0.3,MAT.copper,g,0,1.68,1.1);
      else{box(0.16,0.035,0.24,MAT.copper,g,0,1.74,-1.0);box(0.16,0.035,0.24,MAT.copper,g,0,1.62,-1.0);}
      posts.push({g,side});
    }
    if(earth){
      const hz=earth*1.55;
      box(0.3,0.12,0.18,MAT.galv,root,p+0.22,hs+0.1,hz);
      const h=new THREE.Group();h.position.set(p+0.22,hs+0.22,hz);h.userData.dyn=true;root.add(h);
      rod(V3(0,0,0),V3(0,1.58,0),0.03,MAT.alu,h,8);box(0.07,0.14,0.07,MAT.copper,h,0,1.58,0);
      rod(V3(p,hs+1.94,earth*1.2),V3(p+0.22,hs+1.84,hz),0.02,MAT.copper,root,6);
      hinges.push(h);
    }
  });
  for(const s of[-1,1])rod(V3(PH[0],hs+0.24,s*1.15+0.22),V3(PH[2],hs+0.24,s*1.15+0.22),0.022,MAT.galv,root,6);
  box(0.55,0.8,0.32,MAT.cabinet,root,3.45,1.5,0.32);
  rod(V3(3.45,1.9,0.3),V3(3.45,hs-0.3,0.3),0.025,MAT.galv,root,6);
  plate(id,root,-3.45,2.0,0.15);
  if(earth)plate(earthId,root,-3.45,1.6,0.15);
  const st={o:-1,e:-1};
  regView(id,root,(dt)=>{
    const d=D[id],t=d.state?0:1;
    if(st.o<0)st.o=t;
    st.o=approach(st.o,t,dt/2.8);d.busy=st.o!==t;
    const a=easeIO(st.o)*Math.PI/2;posts.forEach(({g,side})=>g.rotation.y=(side<0?1:-1)*a);
    if(earth){const e=D[earthId],te=e.state;if(st.e<0)st.e=te;st.e=approach(st.e,te,dt/2.2);e.busy=st.e!==te;
      hinges.forEach(h=>h.rotation.x=earth*(1-easeIO(st.e))*Math.PI/2*0.97);}
  },{arcPos:V3(bx,hs+2.0,z0)});
  if(earth){const cz=z0+earth*1.7;regView(earthId,new THREE.Group(),null,{box:new THREE.Box3(V3(bx-3,hs,cz-0.9),V3(bx+3,hs+2,cz+0.9)),arcPos:V3(bx,hs+1.8,z0+earth*1.3),labelPos:V3(bx+3.6,hs+1.2,cz)});}
  return {A:PH.map(p=>V3(bx+p,hs+1.94,z0-1.15)),B:PH.map(p=>V3(bx+p,hs+1.94,z0+1.15))};
}

// --- vermogenschakelaar (SF6, live tank)
function buildCB(id,bx,z0,lowDir){
  const root=grp(bx,z0),hs=2.4;
  PH.forEach(p=>support(root,p,0,hs));
  box(5.0,0.2,0.3,MAT.galv,root,0,hs-0.1,0);
  const cz=0.5;
  box(0.95,1.35,0.5,MAT.cabinet,root,0,1.45,cz);
  box(0.03,0.16,0.04,MAT.black,root,0.38,1.45,cz+0.27);
  const ind=mat({color:0x111111,emissive:0xff2020,emissiveIntensity:2.5});
  const im=box(0.15,0.15,0.02,ind,root,-0.22,1.85,cz+0.26);im.userData.dyn=true;
  plate(id,root,0.18,1.85,cz+0.26,0,0.36);
  PH.forEach(p=>{
    box(0.42,0.3,0.42,MAT.galvDark,root,p,hs+0.15,0);
    insulator(root,1.6,0.12,0.25,10,MAT.silicone,hs+0.3,p,0);
    cyl(0.2,0.2,0.2,MAT.alu,root,p,4.4,0);
    insulator(root,1.3,0.15,0.29,8,MAT.silicone,4.5,p,0);
    cyl(0.21,0.21,0.26,MAT.alu,root,p,5.93,0);
    mesh(new THREE.SphereGeometry(0.21,20,8,0,Math.PI*2,0,Math.PI/2),MAT.alu,root,p,6.06,0);
    box(0.1,0.1,0.32,MAT.alu,root,p,4.4,lowDir*0.32);
    box(0.1,0.1,0.32,MAT.alu,root,p,5.93,-lowDir*0.32);
    cyl(0.06,0.06,0.05,MAT.white,root,p+0.24,hs+0.2,0.2);
  });
  regView(id,root,()=>{const on=D[id].state===1;ind.emissive.setHex(on?0xff2020:0x20ff50);});
  return {low:PH.map(p=>V3(bx+p,4.4,z0+lowDir*0.48)),top:PH.map(p=>V3(bx+p,5.93,z0-lowDir*0.48))};
}

// --- stroomtransformator
function buildCT(id,bx,z0){
  const root=grp(bx,z0),hs=2.4;
  PH.forEach(p=>{support(root,p,0,hs);cyl(0.3,0.33,0.5,MAT.trafo,root,p,hs+0.25,0);
    insulator(root,2.0,0.13,0.28,11,MAT.porcelain,hs+0.5,p,0);
    const h=mesh(new THREE.CapsuleGeometry(0.36,0.5,8,20),MAT.alu,root,p,5.28,0);h.rotation.x=Math.PI/2;
    box(0.1,0.1,0.18,MAT.alu,root,p,5.28,0.7);box(0.1,0.1,0.18,MAT.alu,root,p,5.28,-0.7);
    box(0.14,0.2,0.14,MAT.cabinet,root,p,hs+0.3,0.36);});
  plate(id,root,PH[0],1.8,0.14,0,0.36);
  regView(id,root,null);
  return {A:PH.map(p=>V3(bx+p,5.28,z0-0.78)),B:PH.map(p=>V3(bx+p,5.28,z0+0.78))};
}

// --- overspanningsafleider
function buildSA(id,bx,z0){
  const root=grp(bx,z0),hs=3.0;
  PH.forEach(p=>{support(root,p,0,hs);cyl(0.12,0.14,0.15,MAT.black,root,p,hs+0.075,0);
    insulator(root,1.9,0.075,0.15,16,MAT.silicone,hs+0.15,p,0);
    const t=mesh(new THREE.TorusGeometry(0.3,0.025,8,32),MAT.alu,root,p,hs+1.9,0);t.rotation.x=Math.PI/2;
    for(let k=0;k<3;k++){const a=k*Math.PI*2/3;rod(V3(p,hs+2.0,0),V3(p+Math.cos(a)*0.3,hs+1.9,Math.sin(a)*0.3),0.012,MAT.alu,root,5);}
    cyl(0.09,0.09,0.1,MAT.alu,root,p,hs+2.1,0);
    box(0.16,0.2,0.1,MAT.cabinet,root,p,1.6,0.17);rod(V3(p,hs+0.1,0.1),V3(p,1.7,0.2),0.01,MAT.copper,root,4);});
  plate(id,root,PH[0],2.2,0.14,0,0.36);
  regView(id,root,null);
  return {top:PH.map(p=>V3(bx+p,hs+2.15,z0))};
}

// --- vermogenstransformator 110/10,5 kV
function buildTR(id,cx,cz,ratioText='110/10,5 kV'){
  const root=grp(cx,cz),fans=[];
  for(const s of[-1,1]){box(11,0.45,0.25,MAT.concrete,root,0,0.225,s*3.8);box(0.25,0.45,7.6,MAT.concrete,root,s*5.5,0.225,0);}
  groundQuad(cx-5.4,cz-3.7,cx+5.4,cz+3.7,0.05,MAT.gravelDark,3);
  box(6.4,0.45,3.6,MAT.concrete,root,0,0.225,0);
  for(const s of[-1,1])box(5.8,0.18,0.18,MAT.galvDark,root,0,0.54,s*1.1);
  box(5.8,0.2,3.2,MAT.trafoDark,root,0,0.73,0);
  box(5.6,3.4,3.0,MAT.trafo,root,0,2.33,0);
  box(5.8,0.14,3.2,MAT.trafo,root,0,4.1,0);
  for(let x=-2.4;x<=2.41;x+=0.8)for(const s of[-1,1])box(0.1,3.2,0.12,MAT.trafo,root,x,2.4,s*1.56);
  PH.forEach(p=>{cyl(0.3,0.3,0.45,MAT.trafo,root,p,4.395,-0.8);insulator(root,2.6,0.14,0.27,14,MAT.porcelain,4.62,p,-0.8);cyl(0.12,0.12,0.2,MAT.alu,root,p,7.32,-0.8);});
  cyl(0.15,0.15,0.3,MAT.trafo,root,2.45,4.3,0.3);insulator(root,0.7,0.07,0.13,4,MAT.porcelain,4.45,2.45,0.3);
  // 10 kV kabelkast + kabels
  box(3.2,1.3,0.75,MAT.trafo,root,0,3.0,1.875);
  for(let i=0;i<6;i++){const x=-1.25+i*0.5;rod(V3(x,2.36,2.0),V3(x,0.1,2.0),0.055,MAT.cable,root,8);}
  // conservator
  const cv=mesh(new THREE.CylinderGeometry(0.5,0.5,3.4,24),MAT.trafo,root,0.4,5.6,1.0);cv.rotation.z=Math.PI/2;
  for(const s of[-1,1]){const e=mesh(new THREE.SphereGeometry(0.5,20,10),MAT.trafo,root,0.4+s*1.7,5.6,1.0);e.scale.x=0.3;}
  for(const x of[-0.9,1.7])rod(V3(x,4.17,1.0),V3(x,5.15,1.0),0.06,MAT.trafoDark,root);
  rod(V3(-0.6,5.15,1.0),V3(-0.6,4.17,0.5),0.05,MAT.trafoDark,root);box(0.26,0.2,0.2,MAT.trafoDark,root,-0.6,4.66,0.75);
  cyl(0.1,0.1,0.45,MAT.glass,root,-2.4,2.6,1.62);
  // radiatoren + ventilatoren
  for(const s of[-1,1]){
    for(let k=0;k<10;k++)box(1.2,2.7,0.045,MAT.trafo,root,s*3.7,2.35,-1.08+k*0.24);
    for(const y of[3.75,0.95]){const h=mesh(new THREE.CylinderGeometry(0.08,0.08,2.4,12),MAT.trafo,root,s*3.7,y,0);h.rotation.x=Math.PI/2;rod(V3(s*2.8,y,0),V3(s*3.1,y,0),0.09,MAT.trafo,root,12);}
    for(const fz of[-0.6,0.6]){
      const ring=mesh(new THREE.CylinderGeometry(0.5,0.5,0.28,24,1,true),MAT.fanRing,root,s*4.45,2.0,fz);ring.rotation.z=Math.PI/2;
      const gr=mesh(new THREE.TorusGeometry(0.42,0.01,4,24),MAT.galv,root,s*4.6,2.0,fz);gr.rotation.y=Math.PI/2;
      rod(V3(s*4.6,1.55,fz),V3(s*4.6,2.45,fz),0.008,MAT.galv,root,4);rod(V3(s*4.6,2.0,fz-0.45),V3(s*4.6,2.0,fz+0.45),0.008,MAT.galv,root,4);
      const bl=new THREE.Group();bl.position.set(s*4.42,2.0,fz);bl.userData.dyn=true;root.add(bl);
      cyl(0.08,0.08,0.12,MAT.black,bl,0,0,0).rotation.z=Math.PI/2;
      for(let b=0;b<4;b++){const blade=box(0.02,0.4,0.15,MAT.black,bl,0,0,0);const a=b*Math.PI/2;blade.position.set(0,Math.cos(a)*0.24,Math.sin(a)*0.24);blade.rotation.x=-a;blade.rotation.y=0.35;}
      fans.push(bl);
    }
  }
  box(0.7,1.1,0.35,MAT.cabinet,root,-2.0,1.9,1.68);
  box(0.9,1.4,0.45,MAT.cabinet,root,2.0,1.9,1.73);
  plate(id,root,-0.6,1.6,1.515,0,0.7);
  plate(ratioText,root,0.45,1.6,1.515,0,0.7);if(id==='T4'){box(0.5,0.6,0.3,MAT.cabinet,root,-2.4,3.4,-1.62);plate('10 ⇄ 20 kV',root,-2.4,3.85,-1.78,Math.PI,0.4);}
  const hz=mesh(new THREE.PlaneGeometry(0.4,0.5),MAT.hazard,root,1.2,1.65,1.515);hz.castShadow=false;
  const st={fan:0};
  regView(id,root,(dt)=>{const t=D[id];const target=(t.fans&&EN.has(t.a))?16:0;st.fan+=(target-st.fan)*Math.min(1,dt*0.5);fans.forEach(f=>f.rotation.x+=st.fan*dt);},{arcPos:V3(cx,5,cz)});
  return {hv:PH.map(p=>V3(cx+p,7.45,cz-0.8))};
}

// --- 110 kV-rail
function buildBus(){
  const root=grp();
  [-38,-20,0,20,40,60,78].forEach(x=>{support(root,x,-3.7,6.3);support(root,x,3.7,6.3);box(0.3,0.35,8.0,MAT.galv,root,x,6.475,0);
    BUSZ.forEach(z=>{insulator(root,1.6,0.1,0.22,10,MAT.porcelain,6.65,x,z);box(0.22,0.14,0.22,MAT.alu,root,x,8.28,z);});});
  BUSZ.forEach(z=>{const m=mesh(new THREE.CylinderGeometry(0.06,0.06,117,16),MAT.alu,root,20,BUSY,z);m.rotation.z=Math.PI/2;
    for(const x of[-38.5,78.5])mesh(new THREE.SphereGeometry(0.09,12,8),MAT.alu,root,x,BUSY,z);});
  plate('RAIL 110 kV',root,-38,2.2,-3.55,0,0.6);
  regView('RAIL',root,null,{box:new THREE.Box3(V3(-38.6,7.6,-3),V3(78.6,8.7,3)),labelPos:V3(-41,9.2,0)});
}

// --- vakwerk: portaal en mast
let _gantryGeo=null,_towerGeo=null;
function gantryGeo(){if(_gantryGeo)return _gantryGeo;const L=[];const m=(a,b,t=0.07)=>L.push([a,b,t]);const w=0.45,H=16;
  for(const cx of[-6,6]){const c=(y,i)=>V3(cx+[1,-1,-1,1][i]*w,y,[1,1,-1,-1][i]*w);
    for(let y=0;y<H-0.01;y+=1.6){const y1=y+1.6;for(let i=0;i<4;i++){m(c(y,i),c(y1,i),0.13);m(c(y,i),c(y1,(i+1)%4),0.06);m(c(y1,i),c(y1,(i+1)%4),0.06);}}}
  const x0=-6+w,x1=6-w,n=10,ch=(x,y,z)=>V3(x,y,z);
  for(const y of[12,13])for(const z of[-w,w])m(ch(x0,y,z),ch(x1,y,z),0.1);
  for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n;for(const z of[-w,w])m(ch(x,12,z),ch(x,13,z),0.06);m(ch(x,12,-w),ch(x,12,w),0.05);m(ch(x,13,-w),ch(x,13,w),0.05);
    if(k<n){const xn=x0+(x1-x0)*(k+1)/n;for(const z of[-w,w])m(ch(x,k%2?12:13,z),ch(xn,k%2?13:12,z),0.05);}}
  _gantryGeo=membersGeo(L);return _gantryGeo;}
function towerGeo(){if(_towerGeo)return _towerGeo;const L=[];const m=(a,b,t=0.09)=>L.push([a,b,t]);
  const lv=[0,3.5,7,10.5,14,17,20,22.5,24.5];const hw=y=>y<=20?3.0-2.0*(y/20):1.0-0.15*(y-20)/4.5;
  const c=(y,i)=>{const w=hw(y);return V3([1,-1,-1,1][i]*w,y,[1,1,-1,-1][i]*w);};
  for(let k=0;k<lv.length-1;k++){const y0=lv[k],y1=lv[k+1];for(let i=0;i<4;i++){const j=(i+1)%4;m(c(y0,i),c(y1,i),0.2);m(c(y0,i),c(y1,j),0.07);m(c(y0,j),c(y1,i),0.07);m(c(y1,i),c(y1,j),0.08);}}
  const top=V3(0,27.5,0);for(let i=0;i<4;i++)m(c(24.5,i),top,0.12);
  const arm=(s,y,yt,tipx)=>{const w=hw(y),fr=V3(s*w,y,w),bk=V3(s*w,y,-w),tf=V3(s*tipx,y,0.25),tb=V3(s*tipx,y,-0.25),tt0=V3(s*hw(yt),yt,0),tt1=V3(s*tipx,y+0.2,0);
    m(fr,tf,0.1);m(bk,tb,0.1);m(tt0,tt1,0.09);
    for(let k=1;k<=4;k++){const t=k/5;const pf=fr.clone().lerp(tf,t),pb=bk.clone().lerp(tb,t),pt=tt0.clone().lerp(tt1,t);m(pf,pt,0.05);m(pb,pt,0.05);m(pf,pb,0.05);}};
  arm(-1,17,20,6.2);arm(1,17,20,6.2);arm(1,22.5,24.5,4.2);
  _towerGeo=membersGeo(L);return _towerGeo;}
const TOWER_ATT=[V3(-6,17,0),V3(4,22.5,0),V3(6,17,0)];
function tower(x,z){mesh(towerGeo(),MAT.lattice,staticRoot,x,0,z).castShadow=Math.abs(z)<200;
  for(const sx of[-1,1])for(const sz of[-1,1])box(1.2,0.5,1.2,MAT.concrete,staticRoot,x+sx*3,0.15,z+sz*3);
  TOWER_ATT.forEach(a=>insString(V3(x+a.x,a.y,z),V3(x+a.x,a.y-1.9,z),10));}
function buildGantry(L,bx,z){const root=grp(bx,z);mesh(gantryGeo(),MAT.lattice,root);
  for(const sx of[-6,6])box(1.5,0.6,1.5,MAT.concrete,root,sx,0.15,0);
  W_G.forEach(w=>insString(V3(bx+w,12.0,z-0.45),V3(bx+w,11.95,z-2.25),9));
  regView(L+'-LIJN',root,null,{labelPos:V3(bx,17.5,z)});}
