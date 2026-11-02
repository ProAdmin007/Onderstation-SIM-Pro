
// ============================================================ beveiligingsrelais: numeriek relais in elk veld en de beveiligingskasten
// Elk MS-veld heeft in de laagspanningsnis een numeriek relais (zoals in echte installaties): LCD met fasestromen, een LED-kolom
// (RUN, START, TRIP, I>, I>>, Ie>, AR, ERROR), toetsen en een testcontactdoos. Bij een beveiligingsuitschakeling blijft TRIP branden
// en toont het display de foutmelding (functie, fasen, stroom, uitschakeltijd) tot iemand het relais reset.
// De beveiligingskasten (+R) hebben per object een eigen relais (afstand 21, differentiaal 87T, rail 87B, ...) met live LEDs.
const RLY={};
// uitschakeling door de beveiliging (aangeroepen vanuit tripBreaker en tripFrom); wat er aansprak volgt uit de storingsschrijver
function relayTrip(id){const R=RLY[id]??={};Object.assign(R,{trip:true,t:SIM.t,pending:true,fn:'…',ph:'',I:'',tt:''});}
function relayReset(id){const R=RLY[id];if(!R?.trip)return;R.trip=false;pushAlarm(`${id}: beveiligingsrelais gereset (LEDs en melding gewist)`,'op');refreshDevPanel?.();}
function relayFill(id){const R=RLY[id];if(!R?.pending)return;const rec=FREC.find(r=>(r.dev===id||r.inc===id)&&Math.abs(r.t-R.t)<2);
  if(rec){R.pending=false;const kA_=x=>(x/1000).toFixed(1).replace('.',',')+' kA',sec=x=>x!=null?x.toFixed(2).replace('.',','):'–';
    if(rec.kind==='kortsluiting'){R.fn=rec.inc===id?'I> RES':rec.tTrip<0.15?'I>>':'I>';R.ph=rec.phases===3?'L1-L2-L3':'L1-L2';R.I=kA_(rec.Ik);R.tt=sec(rec.inc===id?rec.tInc:rec.tTrip);}
    else{R.fn='I> OVERL';R.ph='L1-L2-L3';R.I=Math.round(rec.Ik||rec.Ipre||0)+' A';R.tt=sec(rec.tTrip);}return;}
  if(SIM.t-R.t>1){R.pending=false;R.fn=/^L\d-/.test(id)?'21 Z1':/^T\d-|^[VW]-T/.test(id)?'86 EXTERN':'EXTERN';R.ph='';R.I='';R.tt='';}}
// ---- relaisfront in het veld (canvas 256×320 op 0,26×0,325 m)
const RLY_LED=[['RUN','#3fe07a'],['START','#ffcf33'],['TRIP','#ff3b30'],['I>','#ff3b30'],['I>>','#ff3b30'],['Ie>','#ff3b30'],['AR','#3fe07a'],['ERROR','#ff3b30']];
function relayStart(d){const f=d.feeder;return !!(f&&d.state===1&&(f.oc>0.02||(f.fault&&f.fault.stage==='search')));}
function relayKey(s,d){const R=RLY[s.id]||{},I=Math.round(d.I||0);return [d.state,I,EN.has(s.node)?nodeU(s.node).toFixed(2):0,R.trip,R.fn,relayStart(d),s.es&&D[s.es]?.state].join();}
function drawRelay(s){const g=s.g,d=D[s.id],R=RLY[s.id]||{},meas=s.kind==='meas',on=EN.has(s.node);relayFill(s.id);
  g.fillStyle='#3a3e43';g.fillRect(0,0,256,320);g.fillStyle='#2a2d31';g.fillRect(6,6,244,308);
  g.fillStyle='#1d2b45';g.fillRect(6,6,244,26);g.fillStyle='#fff';g.font='bold 13px Arial';g.fillText((meas?'MEETVELD ':'VELDBEVEILIGING ')+s.id,12,24);
  g.fillStyle='#8a9aa8';g.font='10px Arial';g.textAlign='right';g.fillText(meas?'U · f':s.kind==='inc'?'51 · 51N · 86':s.kind==='coup'?'50/51':'50/51 · 50N/51N',244,24);g.textAlign='left';
  // LCD met achtergrondverlichting
  g.fillStyle='#1a1d20';g.fillRect(16,40,224,100);g.fillStyle=R.trip?'#e3b7a9':'#c4d8b4';g.fillRect(20,44,216,92);g.fillStyle='#17210f';g.font='bold 15px monospace';
  const U=on?nodeU(s.node):0,kv=U.toFixed(2).replace('.',','),st=d.type==='es'?(d.state?'GEAARD':'OPEN'):d.state?'IN':'UIT';
  if(R.trip){g.fillStyle='#4a0e06';g.fillText(`TRIP ${R.fn}`,26,64);g.fillText(R.ph||'',26,84);g.fillText(R.I?`${R.I}  t ${R.tt} s`:'',26,104);g.font='bold 13px monospace';g.fillText(`${fmtClock(R.t)}  RESET: C`,26,126);}
  else if(meas){const u=n=>(U*(1+n*0.004)).toFixed(2).replace('.',',');g.fillText(`U12 ${u(0)} kV`,26,64);g.fillText(`U23 ${u(1)} kV`,26,84);g.fillText(`U31 ${u(-1)} kV`,26,104);g.fillText(`f 50,00 Hz  ${s.es&&D[s.es]?.state?'AARD':''}`,26,126);}
  else{const I=d.I||0,p=k=>String(Math.round(I*(1+k*0.012))).padStart(4);g.fillText(`IL1${p(0)} A IL2${p(1)} A`,26,64);g.fillText(`IL3${p(-1)} A IE    0 A`,26,84);
    g.fillText(`U ${kv} kV  ${st}`,26,104);g.font='bold 13px monospace';g.fillText(`BEDRIJF  ${relayStart(d)?'START':'NORMAAL'}${s.es&&D[s.es]?.state?' AARD':''}`,26,126);}
  // LED-kolom met opschriften
  const lit=[true,relayStart(d),!!R.trip,R.trip&&/^I> /.test(R.fn+' ')&&R.fn!=='I>>',R.trip&&R.fn==='I>>',R.trip&&/Ie/.test(R.fn),false,false];
  RLY_LED.forEach(([t,c],i)=>{const y=158+i*19,l=!meas||i===0?lit[i]:false;g.beginPath();g.arc(30,y,5.5,0,7);if(l){g.shadowColor=c;g.shadowBlur=10;g.fillStyle=c;}else g.fillStyle='#4a4f55';g.fill();g.shadowBlur=0;
    g.fillStyle='#d8dde2';g.font='11px Arial';g.fillText(t,42,y+4);});
  // toetsen: pijlen met E, C (reset), ESC, functietoetsen, sleutelschakelaar lokaal/afstand
  const key=(x,y,w,h,t,c='#5a6068')=>{g.fillStyle=c;g.fillRect(x,y,w,h);g.fillStyle='#e9edf0';g.font='bold 10px Arial';g.textAlign='center';g.fillText(t,x+w/2,y+h/2+4);g.textAlign='left';};
  key(170,150,22,18,'▲');key(146,172,22,18,'◀');key(170,172,22,18,'E','#3b6e3b');key(194,172,22,18,'▶');key(170,194,22,18,'▼');
  key(146,150,22,18,'ESC');key(194,150,22,18,'C','#8a2a2a');for(let k=0;k<4;k++)key(140+k*24,222,20,16,'F'+(k+1));
  g.fillStyle='#1a1a1a';g.beginPath();g.arc(206,268,14,0,7);g.fill();g.strokeStyle='#bbb';g.lineWidth=3;g.beginPath();g.moveTo(206,268);g.lineTo(214,256);g.stroke();
  g.fillStyle='#d8dde2';g.font='bold 10px Arial';g.fillText('L',186,262);g.fillText('R',220,262);
  g.fillStyle='#a32020';g.fillRect(140,292,40,14);g.fillStyle='#fff';g.font='bold 9px Arial';g.fillText('TEST',148,303);g.fillStyle='#16181b';g.fillRect(188,292,14,10);
  s.t.needsUpdate=true;}
// statusregel in het veldpaneel
function relayRow(id){const R=RLY[id],d=D[id];relayFill(id);if(R?.trip)return `<b class="bad">TRIP ${R.fn}</b>${R.ph?' · '+R.ph:''}${R.I?' · '+R.I:''} · ${fmtClock(R.t)} <button class="mini" data-act="rreset">Reset</button>`;
  return relayStart(d)?'<span class="warnc">START (aangesproken)</span>':'normaal · RUN';}
// ---- beveiligingskasten: per kast tot vier relais voor één object, met testklemmen en automaten; LEDs live
const RCAB=[],RCAB_GLASS=new THREE.MeshPhysicalMaterial({color:0x223038,transparent:true,opacity:0.22,roughness:0.05});
function relayCabinet(x,z,Y,label,units){const t=liveTex(256,512),m=new THREE.MeshBasicMaterial({map:t.t});const C={x,z,t,units,label,key:null};RCAB.push(C);
  box(0.8,2.2,0.8,MAT.cabinet,staticRoot,x,Y+1.1,z+0.41);iplane(0.66,1.6,m,x,Y+1.25,z,Math.PI);
  box(0.7,1.75,0.015,RCAB_GLASS,staticRoot,x,Y+1.25,z-0.005);
  box(0.03,0.22,0.04,MAT.black,staticRoot,x-0.31,Y+1.25,z-0.03);plate(label,staticRoot,x,Y+2.1,z-0.01,Math.PI,0.26);return C;}
function drawCabinet(C){const g=C.t.g;g.fillStyle='#b9bcb7';g.fillRect(0,0,256,512);g.fillStyle='#8e938e';for(const x of[8,240])g.fillRect(x,0,8,512);
  C.units.forEach((u,k)=>{const y=12+k*102,R=u.cb?RLY[u.cb]||{}:{};if(u.cb)relayFill(u.cb);
    g.fillStyle='#2d3136';g.fillRect(20,y,216,94);g.fillStyle='#1d2b45';g.fillRect(20,y,216,16);g.fillStyle='#fff';g.font='bold 11px Arial';g.fillText(u.t,26,y+12);
    g.fillStyle='#1a1d20';g.fillRect(28,y+22,118,44);g.fillStyle=R.trip?'#e3b7a9':'#9fc7d8';g.fillRect(30,y+24,114,40);g.fillStyle='#10202a';g.font='bold 10px monospace';
    const ln=R.trip?[`TRIP ${R.fn}`,R.I||R.ph||'',fmtClock(R.t)]:u.lcd();ln.forEach((s,i)=>g.fillText(s,34,y+36+i*12));
    const leds=u.leds();leds.forEach(([t,c,on],i)=>{const lx=158+(i%2)*40,ly=y+30+Math.floor(i/2)*16;g.beginPath();g.arc(lx,ly,4.5,0,7);if(on){g.shadowColor=c;g.shadowBlur=8;g.fillStyle=c;}else g.fillStyle='#4a4f55';g.fill();g.shadowBlur=0;
      g.fillStyle='#cfd5da';g.font='9px Arial';g.fillText(t,lx+7,ly+3);});
    g.fillStyle='#5a6068';for(let b=0;b<5;b++)g.fillRect(30+b*22,y+72,16,12);});
  // testklemmen (rood), automaten (wit) en rijgklemmen onderin
  const yb=12+4*102;g.fillStyle='#d9dbd6';g.fillRect(20,yb,216,512-yb-8);
  for(let i=0;i<8;i++){g.fillStyle='#b8241f';g.fillRect(28+i*26,yb+6,18,22);g.fillStyle='#fff';g.fillRect(33+i*26,yb+10,8,6);}
  for(let i=0;i<10;i++){g.fillStyle='#f4f4f0';g.fillRect(28+i*20,yb+34,14,26);g.fillStyle='#222';g.fillRect(32+i*20,yb+42,6,8);}
  g.fillStyle='#8a9196';for(let i=0;i<40;i++)g.fillRect(26+i*5.2,yb+66,4,18);
  C.t.t.needsUpdate=true;}
function relayCabKey(C){return C.units.map(u=>{const R=u.cb?RLY[u.cb]||{}:{};return [R.trip,R.fn,u.leds().map(l=>l[2]?1:0).join('')].join(':');}).join('|');}
// inhoud van de kasten in de 10 kV- en 20 kV-ruimte
function relayUnits(){const line=L=>[{t:`21  AFSTAND  ${L}`,cb:L+'-Q0',lcd:()=>[`${L} Z1 Z2 Z3`,`I ${Math.round(D[L+'-Q0'].I||0)} A`,SIM.lines[L].avail?'LIJN OK':'LIJN UIT'],leds:()=>[['RUN','#3fe07a',true],['TRIP','#ff3b30',!!RLY[L+'-Q0']?.trip],['Z1','#ff3b30',!!RLY[L+'-Q0']?.trip],['AR','#3fe07a',!!SIM.lines[L].ar]]},
    {t:`79  HERINSCHAKELING ${L}`,lcd:()=>[`AR ${SIM.lines[L].ar?'IN':'UIT'}`,`DODE TIJD ${String(PROT.ln[L].dt).replace('.',',')} s`,SIM.lines[L].arBroken?'DEFECT':'GEREED'],leds:()=>[['RUN','#3fe07a',true],['AR','#3fe07a',!!SIM.lines[L].ar],['BLOK','#ffcf33',!SIM.lines[L].ar],['ERR','#ff3b30',!!SIM.lines[L].arBroken]]},
    {t:`67N  AARDFOUT ${L}`,lcd:()=>['3I0  0 A','RICHTING VOORUIT','GEREED'],leds:()=>[['RUN','#3fe07a',true],['START','#ffcf33',false]]},
    {t:'STORINGSSCHRIJVER',lcd:()=>[`OPNAMEN ${FREC.length}`,FREC[0]?`LAATST ${fmtClock(FREC[0].t)}`:'GEEN',''],leds:()=>[['RUN','#3fe07a',true],['REC','#ffcf33',FREC[0]&&SIM.t-FREC[0].t<5]]}];
  const trafo=T=>[{t:`87T  DIFFERENTIAAL ${T}`,cb:T+'-Q0',lcd:()=>[`${T} ID 0,02 IN`,`IHS ${Math.round(D[T+'-Q0']?.I||0)} A`,D[T].blocked?'86 VERGRENDELD':'GEREED'],leds:()=>[['RUN','#3fe07a',true],['TRIP','#ff3b30',!!RLY[T+'-Q0']?.trip],['86','#ff3b30',!!D[T].blocked],['BUCH','#ff3b30',D[T].blockKind==='buchholz']]},
    {t:`49  THERMISCH ${T}`,lcd:()=>[`OLIE ${Math.round(D[T].oil)} °C`,`KOELING ${D[T].fans?'AAN':'UIT'}`,`TRAP ${D[T].tap}`],leds:()=>[['RUN','#3fe07a',true],['ALARM','#ffcf33',D[T].oil>85],['TRIP','#ff3b30',D[T].oil>(PROT.tr[T]?.trip||100)]]},
    {t:`50/51  OVERSTROOM HS ${T}`,lcd:()=>['I> 1,2 IN','I>> 8 IN','GEREED'],leds:()=>[['RUN','#3fe07a',true],['START','#ffcf33',false]]},
    {t:`90  SPANNINGSREGELING ${T}`,lcd:()=>[`AVR ${D[T].avr==='auto'?'AUTO':'HAND'}`,`TRAP ${D[T].tap}/17`,''],leds:()=>[['RUN','#3fe07a',true],['AUTO','#3fe07a',D[T].avr==='auto']]}];
  const rail=(nm,cpl)=>[{t:`87B  RAILBEVEILIGING ${nm}`,lcd:()=>['ID 0,00','ZONES OK',''],leds:()=>[['RUN','#3fe07a',true],['TRIP','#ff3b30',false]]},
    {t:'50BF  FALEN SCHAKELAAR',lcd:()=>['T1 150 ms','GEREED',''],leds:()=>[['RUN','#3fe07a',true],['START','#ffcf33',false]]},
    {t:`50/51  KOPPELING ${cpl}`,cb:cpl,lcd:()=>[`${cpl} ${D[cpl]?.state?'IN':'UIT'}`,`I ${Math.round(D[cpl]?.I||0)} A`,''],leds:()=>[['RUN','#3fe07a',true],['TRIP','#ff3b30',!!RLY[cpl]?.trip]]},
    {t:'SYNCHROCHECK 25',lcd:()=>['DU < 0,25 kV','DF < 0,1 HZ',''],leds:()=>[['RUN','#3fe07a',true],['SYNC','#3fe07a',true]]}];
  const scada=[{t:'RTU  STATION',lcd:()=>[SCADA_DOWN()?'VERBINDING WEG':'IEC 104 OK','',''],leds:()=>[['RUN','#3fe07a',true],['COM','#3fe07a',!SCADA_DOWN()],['ERR','#ff3b30',!!SCADA_DOWN()]]},
    {t:'GPS-TIJDKLOK',lcd:()=>[fmtClock(SIM.t),'SYNC OK',''],leds:()=>[['RUN','#3fe07a',true],['SYNC','#3fe07a',true]]},
    {t:'NETWERK STATIONSBUS',lcd:()=>['IEC 61850','8 POORTEN',''],leds:()=>[['RUN','#3fe07a',true],['LINK','#3fe07a',true]]},
    {t:'ACCU-BEWAKING 110 V',lcd:()=>['U 112 V DC','LADEN OK',''],leds:()=>[['RUN','#3fe07a',true],['ALARM','#ffcf33',false]]}];
  return {line,trafo,rail,scada};}
// elke 0,25 s (met de schermen in de schakelruimte): alleen kasten in de buurt en alleen als er iets veranderd is
function drawRelayCabinets(){const cp=camera.position;for(const C of RCAB){if(Math.hypot(cp.x-C.x,cp.z-C.z)>30&&C.key)continue;const k=relayCabKey(C);if(k===C.key)continue;C.key=k;drawCabinet(C);}}
