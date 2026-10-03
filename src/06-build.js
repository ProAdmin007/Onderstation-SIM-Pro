
// ============================================================ station opbouwen
function buildLineBay(L){
  const bx=BAYS[L].x;
  const q1=buildDS(L+'-Q1',bx,-7.5);
  const q0=buildCB(L+'-Q0',bx,-13,1);
  const ct=buildCT(L+'-CT',bx,-18.5);
  const q9=buildDS(L+'-Q9',bx,-24.5,{earth:-1,earthId:L+'-Q8'});
  const sa=buildSA(L+'-SA',bx,-30.5);
  buildGantry(L,bx,-36);
  PH.forEach((p,i)=>{
    wire(V3(bx+p,BUSY-0.07,BUSZ[i]),q1.B[i],0.35);
    wire(q1.A[i],q0.low[i],0.12);
    wire(q0.top[i],ct.B[i],0.12);
    wire(ct.A[i],q9.B[i],0.15);
    wire(q9.A[i],sa.top[i],0.2);
    wire(sa.top[i],V3(bx+W_G[i],11.85,-38.2),0.45);
  });
  const tw=[-90,-360,-630,-900,-1170,-1440];
  tw.forEach(z=>tower(bx,z));
  PH.forEach((p,i)=>{let prev=V3(bx+W_G[i],11.9,-38.3);
    tw.forEach((z,k)=>{const a=TOWER_ATT[i];const pt=V3(bx+a.x,a.y-1.9,z);wire(prev,pt,k?7:1.4,0.032,MAT.lineCond,k?40:24);prev=pt;});});
  let pe=[V3(bx-6,16,-36),V3(bx+6,16,-36)];
  tw.forEach((z,k)=>{const pt=V3(bx,27.5,z);pe.forEach(a=>wire(a,pt,k?6:1.2,0.014,MAT.lineCond,k?40:24));pe=[pt];});
}
function buildTrafoBay(T){
  const bx=BAYS[T].x;
  const q1=buildDS(T+'-Q1',bx,7.5);
  const q0=buildCB(T+'-Q0',bx,13.5,-1);
  const ct=buildCT(T+'-CT',bx,18.5);
  const sa=buildSA(T+'-SA',bx,25.0);
  const tr=buildTR(T,bx,31);
  PH.forEach((p,i)=>{
    wire(V3(bx+p,BUSY-0.07,BUSZ[i]),q1.A[i],0.35);
    wire(q1.B[i],q0.low[i],0.12);
    wire(q0.top[i],ct.A[i],0.12);
    wire(ct.B[i],tr.hv[i],0.5);
    wire(sa.top[i],tr.hv[i],0.25);
  });
}
buildGround();
buildFence();
buildBuilding();
buildBus();
buildLineBay('L1');buildLineBay('L2');
buildTrafoBay('T1');buildTrafoBay('T2');
box(0.35,8,9,MAT.concreteDark,staticRoot,0,4,31);  // brandwand
buildLights();
buildTrees();
farm(-420,520,0.3);farm(610,-380,-0.2);farm(-760,-520,1.4);farm(380,820,0.1);
[[780,-150,0.6],[900,-480,0.6],[1020,-810,0.6],[-950,-760,0.4],[-1150,-430,0.4]].forEach(a=>turbine(...a));
van(25,30,0.05);
buildInterior();
bakeStatic();
