
// ============================================================ MS-gebouwen: interieur (10 kV en 20 kV)
const ROOMS=BUILDINGS.map((b,i)=>({idx:i+1,x0:b.x0+0.3,x1:b.x1-0.3,z0:b.z0+0.3,z1:b.z1-0.3,y0:0.45,y1:5.18,doors:b.doors}));
const IN=ROOMS[0];
const camInside=()=>{const p=camera.position;const r=ROOMS.find(r=>p.x>r.x0&&p.x<r.x1&&p.z>r.z0&&p.z<r.z1&&p.y<r.y1);return r?r.idx:0;};
const IM={
  panel:mat({color:0xd5d7d1,metalness:0.3,roughness:0.42}),
  door:mat({color:0xcbcec8,metalness:0.3,roughness:0.36}),
  plaster:mat({color:0xe4e2da,roughness:0.92}),
  ceiling:mat({color:0xdcdad3,roughness:0.95}),
  floor:mat({color:0x7d8983,roughness:0.3,metalness:0.05}),
  rubber:mat({color:0x1c1e20,roughness:0.95}),
  led:mat({color:0xffffff,emissive:0xf2f5ff,emissiveIntensity:3}),
  battery:mat({color:0x2a2c2f,roughness:0.55}),
  redPaint:mat({color:0xb3181c,roughness:0.35,metalness:0.2}),
  greenBtn:mat({color:0x1e9a46,roughness:0.4}),
  redBtn:mat({color:0xc22a2a,roughness:0.4}),
  wood:mat({color:0x9a8366,roughness:0.6}),
};
function iplane(w,h,m,x,y,z,ry=0,rx=0){const o=mesh(new THREE.PlaneGeometry(w,h),m,staticRoot,x,y,z);o.rotation.set(rx,ry,0);o.castShadow=false;return o;}
function liveTex(w,h){const c=cnv(w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return {c,g:c.getContext('2d'),t,w,h};}
function mimicTex(kind){const c=cnv(256,96),g=c.getContext('2d');g.fillStyle='#e9ebe6';g.fillRect(0,0,256,96);
  g.strokeStyle='#1d3b8f';g.lineWidth=8;g.beginPath();g.moveTo(0,12);g.lineTo(256,12);g.stroke();g.lineWidth=5;g.beginPath();
  if(kind==='feed'||kind==='inc'){g.moveTo(128,12);g.lineTo(128,30);g.moveTo(128,66);g.lineTo(128,92);g.stroke();g.strokeRect(110,30,36,36);
    g.fillStyle='#1d3b8f';g.beginPath();if(kind==='feed'){g.moveTo(118,80);g.lineTo(138,80);g.lineTo(128,94);}else{g.moveTo(118,92);g.lineTo(138,92);g.lineTo(128,78);}g.fill();}
  else if(kind==='coup'){g.moveTo(50,12);g.lineTo(50,48);g.lineTo(110,48);g.moveTo(146,48);g.lineTo(206,48);g.lineTo(206,12);g.stroke();g.strokeRect(110,30,36,36);}
  else if(kind==='meas'){g.moveTo(128,12);g.lineTo(128,40);g.stroke();g.beginPath();g.arc(128,54,13,0,7);g.stroke();g.beginPath();g.arc(128,72,13,0,7);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
function relayTex(){const c=cnv(256,512),g=c.getContext('2d');g.fillStyle='#c9ccc6';g.fillRect(0,0,256,512);
  for(let r=0;r<4;r++)for(let k=0;k<2;k++){const x=14+k*120,y=20+r*120;g.fillStyle='#e4e6e1';g.fillRect(x,y,108,104);g.strokeStyle='#8b8f8a';g.lineWidth=2;g.strokeRect(x,y,108,104);
    g.fillStyle='#0f1d16';g.fillRect(x+10,y+12,88,36);g.fillStyle='#6dffa0';g.font='12px monospace';g.fillText(['I> 1,2 kA','Z1 OK','87T OK','U 10,5 kV','50/51','REC IN','TRIP: 0','DIFF 0,02'][r*2+k],x+14,y+34);
    for(let l=0;l<5;l++){g.fillStyle=['#3fd46f','#3fd46f','#f2b33a','#555','#555'][l];g.beginPath();g.arc(x+16+l*16,y+64,4,0,7);g.fill();}
    g.fillStyle='#555';for(let b=0;b<4;b++)g.fillRect(x+12+b*22,y+80,16,10);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function posterTex(){const c=cnv(512,700),g=c.getContext('2d');g.fillStyle='#fbfbf7';g.fillRect(0,0,512,700);g.fillStyle='#1d2b45';g.fillRect(0,0,512,90);
  g.fillStyle='#fff';g.font='bold 34px Arial';g.fillText('VIJF VEILIGHEIDSREGELS',28,58);g.fillStyle='#1a1a1a';g.font='bold 27px Arial';
  ['1. Vrijschakelen','2. Beveiligen tegen','    herinschakelen','3. Spanningsloosheid','    vaststellen','4. Aarden en','    kortsluiten','5. Afschermen van','    naastgelegen delen'].forEach((s,i)=>g.fillText(s,32,150+i*52));
  g.fillStyle='#f5c400';g.fillRect(0,640,512,60);g.fillStyle='#111';g.font='bold 24px Arial';g.fillText('NEN 3140  ·  VIAG',32,680);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}

const PANELS=[{title:'Reserve'},{id:'V-T1',kind:'inc',node:'T1l'},{id:'V-F1',kind:'feed',node:'F1'},{id:'V-F2',kind:'feed',node:'F2'},{id:'V-F3',kind:'feed',node:'F3'},
  {title:'Meetveld A',kind:'meas'},{id:'V-K',kind:'coup',node:'RB'},{title:'Meetveld B',kind:'meas'},
  {id:'V-F4',kind:'feed',node:'F4'},{id:'V-F5',kind:'feed',node:'F5'},{id:'V-F6',kind:'feed',node:'F6'},{title:'Reserve'},{id:'V-T3',kind:'inc',node:'T3l'}];
const PANELS20=[{title:'Reserve'},{id:'W-T2',kind:'inc',node:'T2l'},{id:'W-G1',kind:'feed',node:'G1'},{id:'W-G2',kind:'feed',node:'G2'},{title:'Meetveld C',kind:'meas'},
  {id:'W-G3',kind:'feed',node:'G3'},{id:'W-G4',kind:'feed',node:'G4'},{id:'W-T3',kind:'inc',node:'T3l'}];
const SCREENS=[];
function buildPanel(i,p,row){
  const x=row.cx+(row.n-1)/2*0.8-i*0.8,Y=row.room.y0,F=-0.66,root=grp(x,54.85,Y);
  box(0.8,0.1,1.3,MAT.black,root,0,0.05,0);
  box(0.79,2.2,1.3,IM.panel,root,0,1.2,0);
  box(0.7,0.62,0.02,IM.door,root,0,1.95,F);
  box(0.7,0.27,0.015,IM.door,root,0,1.5,F);
  const mp=iplane(0.7,0.2625,mat({map:mimicTex(p.kind||'none'),roughness:0.5}),0,0,0,Math.PI);root.add(mp);mp.position.set(0,1.5,F-0.012);
  box(0.7,0.8,0.02,IM.door,root,0,0.98,F);
  box(0.24,0.3,0.01,MAT.glassDark,root,0,1.02,F-0.012);
  box(0.03,0.2,0.04,MAT.black,root,0.29,0.95,F-0.03);
  box(0.7,0.45,0.02,IM.door,root,0,0.34,F);
  for(const s of[-1,1])box(0.05,0.05,0.03,MAT.black,root,s*0.26,0.48,F-0.02);
  const label=p.id||p.title;
  plate(label,root,-0.12,2.17,F-0.012,Math.PI,0.3);
  plate(label,root,0,0.42,F-0.012,Math.PI,0.24);
  if(!p.id)return;
  const sc=liveTex(256,128);const sm=iplane(0.3,0.15,new THREE.MeshBasicMaterial({map:sc.t}),0,0,0,Math.PI);root.add(sm);sm.position.set(-0.1,1.98,F-0.012);
  const esId=p.kind==='feed'?p.id.slice(2)+'-Q8':null;SCREENS.push({...sc,id:p.id,node:p.node,es:esId});
  const b1=cyl(0.028,0.028,0.03,IM.redBtn,root,0.2,1.98,F-0.02,14);b1.rotation.x=Math.PI/2;
  const b0=cyl(0.028,0.028,0.03,IM.greenBtn,root,0.28,1.98,F-0.02,14);b0.rotation.x=Math.PI/2;
  const ks=cyl(0.03,0.03,0.02,MAT.black,root,0.24,1.86,F-0.02,14);ks.rotation.x=Math.PI/2;
  const ind=mat({color:0x111111,emissive:0xff2020,emissiveIntensity:2.2});const im=box(0.07,0.07,0.02,ind,root,0,1.5,F-0.02);im.userData.dyn=true;
  const lamp=mat({color:0x3a3320,emissive:0xffd23a,emissiveIntensity:0});
  for(let k=0;k<3;k++){const l=cyl(0.013,0.013,0.02,lamp,root,0.15+k*0.06,1.76,F-0.015,10);l.rotation.x=Math.PI/2;l.userData.dyn=true;}
  const eMat=mat({color:0x222222,emissive:0xffc400,emissiveIntensity:0});if(esId){const em=box(0.09,0.05,0.02,eMat,root,-0.2,0.62,F-0.02);em.userData.dyn=true;}
  regView(p.id,root,()=>{const d=D[p.id];ind.emissive.setHex(d.state?0xff2020:0x20ff50);lamp.emissiveIntensity=EN.has(p.node)?3:0;if(esId)eMat.emissiveIntensity=D[esId].state?2.5:0;},
    {inside:row.room.idx,labelPos:V3(x,Y+2.75,54.2),arcPos:V3(x,Y+1.0,54.1),flyPos:V3(x-0.7,Y+1.7,51.6),flyTarget:V3(x,Y+1.35,54.2)});
}
function buildRoomShell(r){
  const Y=r.y0,W=r.x1-r.x0,H=r.y1-Y,cx=(r.x0+r.x1)/2,cy=(Y+r.y1)/2,cz=(r.z0+r.z1)/2,D2=r.z1-r.z0;
  groundQuad(r.x0,r.z0,r.x1,r.z1,Y+0.004,IM.floor,4);
  iplane(W,H,IM.plaster,cx,cy,r.z0+0.01,0);iplane(W,H,IM.plaster,cx,cy,r.z1-0.01,Math.PI);
  iplane(D2,H,IM.plaster,r.x0+0.01,cy,cz,Math.PI/2);iplane(D2,H,IM.plaster,r.x1-0.01,cy,cz,-Math.PI/2);
  iplane(W,D2,IM.ceiling,cx,r.y1-0.01,cz,0,Math.PI/2);
  r.doors.forEach(x=>{box(2.1,2.65,0.05,MAT.door,staticRoot,x,Y+1.32,r.z0+0.03);box(0.04,0.04,0.12,MAT.trim,staticRoot,x+0.15,Y+1.2,r.z0+0.1);});
  box(W-0.6,0.04,0.012,MAT.copper,staticRoot,cx,Y+0.4,r.z0+0.02);
  for(let x=r.x0+4;x<r.x1-2;x+=6)for(const z of[49,53]){box(1.4,0.06,0.22,IM.led,staticRoot,x,r.y1-0.35,z);for(const s of[-0.6,0.6])rod(V3(x+s,r.y1-0.32,z),V3(x+s,r.y1,z),0.006,MAT.galv,staticRoot,4);}
  for(let x=r.x0+W/6;x<r.x1;x+=W/3){const l=new THREE.PointLight(0xf4f2ea,70,9,2);l.position.set(x,r.y1-0.5,51);scene.add(l);}
  r.doors.forEach(x=>{cyl(0.08,0.08,0.55,IM.redPaint,staticRoot,x+1.6,Y+0.3,r.z0+0.15,14);cyl(0.03,0.03,0.08,MAT.black,staticRoot,x+1.6,Y+0.61,r.z0+0.15,8);});
}
function buildPanelRow(panels,cx,room){
  const n=panels.length,Y=room.y0,half=n*0.4;
  panels.forEach((p,i)=>buildPanel(i,p,{cx,n,room}));
  groundQuad(cx-half-0.6,52.7,cx+half+0.6,54.15,Y+0.008,IM.rubber,2);
  box(n*0.8+0.2,0.3,0.7,IM.panel,staticRoot,cx,Y+2.45,54.9);
  for(let x=cx-half;x<cx+half;x+=0.6)rod(V3(x,Y+2.6,54.9),V3(x,room.y1,54.9),0.012,MAT.galv,staticRoot,4);
  for(const s of[-1,1])iplane(0.4,0.5,MAT.hazard,cx+s*(half+0.01),Y+1.6,54.5,s*Math.PI/2);
}
let deskScreens=null;
function buildInterior(){
  ROOMS.forEach(buildRoomShell);
  buildPanelRow(PANELS,0,ROOMS[0]);
  buildPanelRow(PANELS20,61,ROOMS[1]);
  const Y=IN.y0;
  // beveiligingskasten (10 kV-ruimte en 20 kV-ruimte)
  const rt=mat({map:relayTex(),roughness:0.4}),glass=new THREE.MeshPhysicalMaterial({color:0x223038,transparent:true,opacity:0.25,roughness:0.05});
  const cab=(x,i)=>{box(0.8,2.2,0.8,MAT.cabinet,staticRoot,x,Y+1.1,55.25);iplane(0.66,1.6,rt,x,Y+1.25,54.84,Math.PI);box(0.7,1.75,0.015,glass,staticRoot,x,Y+1.25,54.835);plate('+R'+i,staticRoot,x,Y+2.1,54.83,Math.PI,0.26);};
  for(let k=0;k<6;k++)cab(-18.9+k*0.82,k+1);
  for(let k=0;k<4;k++)cab(48.4+k*0.82,k+11);
  iplane(1.3,1.78,mat({map:posterTex(),roughness:0.7}),-11.2,Y+1.7,IN.z1-0.02,Math.PI);
  iplane(1.3,1.78,mat({map:posterTex(),roughness:0.7}),70.5,Y+1.7,ROOMS[1].z1-0.02,Math.PI);
  // bedieningsbureau met SCADA-schermen
  box(3.0,0.05,0.9,IM.wood,staticRoot,-15.5,Y+0.75,47.2);
  for(const sx of[-1.4,1.4])box(0.05,0.73,0.8,MAT.galvDark,staticRoot,-15.5+sx,Y+0.37,47.2);
  const s1=liveTex(512,320),s2=liveTex(512,320);deskScreens=[s1,s2];
  [[-16.25,s1],[-14.75,s2]].forEach(([x,s])=>{box(0.7,0.43,0.04,MAT.black,staticRoot,x,Y+1.18,46.95);rod(V3(x,Y+0.78,46.98),V3(x,Y+0.98,46.98),0.03,MAT.black,staticRoot,8);
    iplane(0.64,0.4,new THREE.MeshBasicMaterial({map:s.t}),x,Y+1.18,46.972,0);});
  box(0.45,0.02,0.15,MAT.black,staticRoot,-15.5,Y+0.785,47.45);
  box(0.5,0.08,0.5,MAT.black,staticRoot,-15.5,Y+0.48,48.2);box(0.5,0.6,0.07,MAT.black,staticRoot,-15.5,Y+0.85,48.47);rod(V3(-15.5,Y+0.08,48.2),V3(-15.5,Y+0.45,48.2),0.03,MAT.galv,staticRoot,6);
  for(let k=0;k<5;k++){const a=k*Math.PI*2/5;rod(V3(-15.5,Y+0.07,48.2),V3(-15.5+Math.cos(a)*0.3,Y+0.04,48.2+Math.sin(a)*0.3),0.015,MAT.black,staticRoot,4);}
  // accubatterij 110 V DC
  for(const tier of[0.35,1.05]){box(4.4,0.04,0.55,MAT.galvDark,staticRoot,15.6,Y+tier,55.2);
    for(let k=0;k<18;k++){const x=13.6+k*0.235;box(0.2,0.26,0.17,IM.battery,staticRoot,x,Y+tier+0.15,55.2);
      cyl(0.015,0.015,0.03,IM.redBtn,staticRoot,x-0.05,Y+tier+0.295,55.2,6);cyl(0.015,0.015,0.03,MAT.black,staticRoot,x+0.05,Y+tier+0.295,55.2,6);}}
  for(const x of[13.4,17.8])for(const z of[54.95,55.45])rod(V3(x,Y,z),V3(x,Y+1.5,z),0.02,MAT.galvDark,staticRoot,6);
  plate('ACCU 110 V DC',staticRoot,15.6,Y+1.75,54.9,Math.PI,0.6);
  // eigenbedrijfstransformator
  box(1.3,1.7,1.0,MAT.trafo,staticRoot,17.6,Y+0.85,47.6);iplane(0.9,0.7,MAT.louvre,17.6,Y+1.0,48.11,0);plate('EB 10/0,4 kV',staticRoot,17.6,Y+1.55,48.11,0,0.5);
}
function drawPanelScreens(){
  SCREENS.forEach(s=>{const d=D[s.id],g=s.g;g.fillStyle='#08160f';g.fillRect(0,0,256,128);g.fillStyle='#7dffa8';g.font='bold 26px monospace';g.fillText(s.id,14,32);
    const fault=d.feeder&&d.feeder.fault;const st=d.state?'IN':fault?'TRIP':'UIT';
    g.font='22px monospace';g.fillText(`I ${String(Math.round(d.I)).padStart(4)} A`,14,66);g.fillText(`U ${EN.has(s.node)?nodeU(s.node).toFixed(2).replace('.',','):' 0,00'} kV`,14,96);
    g.fillStyle=st==='IN'?'#ff7a7a':st==='TRIP'?'#ffcc33':'#7dffa8';g.font='bold 22px monospace';g.fillText(st,190,32);if(!springOk(d)){g.fillStyle='#ffcc33';g.font='16px monospace';g.fillText('VEER',190,96);}if(s.es&&D[s.es].state){g.fillStyle='#ffd23a';g.font='bold 16px monospace';g.fillText('GEAARD',176,66);}s.t.needsUpdate=true;});
  if(!deskScreens)return;
  const [a,b]=deskScreens;let g=a.g;g.fillStyle='#0d1117';g.fillRect(0,0,512,320);g.fillStyle='#e7ecf1';g.font='bold 22px Arial';g.fillText('OS ZUIDWOLDE · MS',18,34);
  g.font='16px monospace';g.fillStyle='#9fd0ff';g.font='14px monospace';g.fillText(`A ${FLOW.U.RA.toFixed(2)}  B ${FLOW.U.RB.toFixed(2)}  C ${FLOW.U.RC.toFixed(2)} kV`,18,60);
  FEEDERS.forEach((f,i)=>{const on=EN.has(f.node),y=88+i*23;g.fillStyle=on?(f.bus==='RC'?'#c07cff':'#4aa3ff'):'#56616b';g.fillRect(18,y-12,10,15);g.fillStyle='#e7ecf1';g.fillText(`${f.id} ${f.short.padEnd(10)} ${on?f.P.toFixed(1).padStart(5)+' MW':'   UIT  '}`,40,y);
    g.fillStyle=D[f.cb].state?'#e5484d':'#3fcf72';g.fillRect(470,y-12,15,15);});
  a.t.needsUpdate=true;
  g=b.g;g.fillStyle='#0d1117';g.fillRect(0,0,512,320);g.fillStyle='#e7ecf1';g.font='bold 22px Arial';g.fillText('MELDINGEN',18,34);g.font='14px monospace';
  [...document.querySelectorAll('#alarmList .al')].slice(0,9).forEach((el,i)=>{const lv=el.className.match(/crit|warn|ok|info|op/)?.[0];g.fillStyle={crit:'#ff8f92',warn:'#f0a43a',ok:'#6fe39a',info:'#9fd0ff',op:'#8d99a6'}[lv]||'#ccc';
    const t=el.textContent;g.fillText(t.length>56?t.slice(0,55)+'…':t,18,64+i*28);});
  b.t.needsUpdate=true;
}
