
// ============================================================ aardfout (aardsluiting) in het 10 kV-net
// Het 10 kV-net is gecompenseerd (Petersenspoel in het sterpunt van T1 en T3): een enkele aardsluiting schakelt niet af,
// maar geeft nulpuntsspanning (U0) op de rails die galvanisch met de fout verbonden zijn. De bedrijfsvoerder zoekt de fout
// door te schakelen: rails splitsen, velden omzetten of uitschakelen, de ring opknippen. Verdwijnt U0, dan is de fout gevonden.
const EF={on:null};
const efAge=()=>EF.on?SIM.t-EF.on.at:0;
// rails die galvanisch met elkaar verbonden zijn: koppeling V-K of een veld dat op beide rails staat
const railsCoupled=()=>D['V-K'].state===1||Object.keys(SEL_BAYS).some(b=>D[b+'-QA']?.state===1&&D[b+'-QB']?.state===1&&D[SEL_BAYS[b].cb]?.state===1);
// welke 10 kV-rails zien de nulpuntsspanning?
function efRails(){const n=EF.on?.node;if(!n||!EN.has(n))return [];const bus=FLOW.TAG[n]?.bus;if(bus!=='RA'&&bus!=='RB')return [];
  return railsCoupled()&&EN.has('RA')&&EN.has('RB')?['RA','RB']:[bus];}
const efU0=()=>efRails().length?5.9+0.15*Math.sin(SIM.t*0.7):0;   // ±U_fase bij een volledige aardsluiting
// het veld dat de foutplaats voedt (via de voedingsboom)
const efFeeder=n=>{const cb=FLOW.TAG[n]?.cb;return FEEDERS.find(f=>f.cb===cb)||null;};

function earthFault(forceNode){if(EF.on)return null;computeFlows();
  const secs=RING.secs.filter(s=>!s.fault&&EN.has(s.node)&&['RA','RB'].includes(FLOW.TAG[s.node]?.bus)).map(s=>({node:s.node,sec:s}));
  const feeds=FEEDERS.filter(f=>!f.ring&&!f.fault&&EN.has(f.node)&&['RA','RB'].includes(railOf(f.sel))).map(f=>({node:f.node,f}));
  const c=[...secs,...feeds].filter(x=>!forceNode||x.node===forceNode);if(!c.length)return null;const x=pick(c),fd=efFeeder(x.node);
  // aanwijzingen: het richtingsgevoelige aardfoutrelais van het foutveld spreekt meestal aan, soms ook (onterecht) een ander veld;
  // aardfoutverklikkers in de MS-stations tussen voeding en fout geven niet altijd een melding
  const ind={};if(fd&&Math.random()<0.75)ind[fd.id]=true;
  const others=FEEDERS.filter(f=>f!==fd&&['RA','RB'].includes(f.bus));if(Math.random()<0.15&&others.length)ind[pick(others).id]=true;
  EF.on={node:x.node,secId:x.sec?.id||null,fId:x.f?.id||null,at:SIM.t,ind,warned:false};
  if(fd?.ring)ringPathStations(fd.node,x.node).forEach(id=>{const s=RING.stations.find(y=>y.id===id);if(Math.random()<0.7)s.efFlag=true;});
  GAME.stats.ef=(GAME.stats.ef||0)+1;
  pushAlarm(`Aardfoutmelding 10 kV: nulpuntsspanning U0 ±${efU0().toFixed(1).replace('.',',')} kV op rail ${efRails().map(b=>BUSES[b].nm).join(' en ')}. Het net blijft in bedrijf (Petersenspoel) – zoek en isoleer de aardfout`,'crit');
  pushAlarm(`Tip: kijk welk veld een aardfoutrichting meldt (⏚) en welke MS-stations een aardfoutverklikker hebben. Splits de rails (V-K open) of knip de ring op: verdwijnt U0 als je een deel spanningsloos maakt, dan zit de fout daar`,'info');
  refreshAll();return EF.on;}

// gevonden: de fout wordt een gewone kabelfout die de storingsdienst repareert
function efFound(){const e=EF.on,dt=SIM.t-e.at;EF.on=null;RING.stations.forEach(s=>{s.efFlag=false;});
  award(dt<=15?60:dt<=30?35:10,'Aardfout gevonden');GAME.stats.efFound=(GAME.stats.efFound||0)+1;
  if(e.secId){const s=RING.secs.find(x=>x.id===e.secId);s.fault=true;s.located=true;
    pushAlarm(`U0 verdwenen: de aardfout zit in kabel ${secName(s)}. Houd die kabel spanningsloos – de storingsdienst repareert hem`,'ok');
    addTimer(rnd(40,70),()=>{s.fault=false;s.located=false;pushAlarm(`Storingsdienst: kabel ${secName(s)} gerepareerd – normaliseer de ring`,'ok');refreshAll();});}
  else if(e.fId){const f=FD(e.fId);f.fault={stage:'search',frac:f.prio?0:rnd(0.15,0.35)};
    pushAlarm(`U0 verdwenen na het uitschakelen van ${f.cb}: de aardfout zit in de kabel van ${f.id} ${f.name}. Storingsdienst onderweg`,'ok');
    addTimer(rnd(10,18),()=>{if(!f.fault)return;f.fault.stage='isolated';f.outFrac=f.fault.frac;
      readyNotice(`Storingsdienst: aardfout in ${f.id} weggeschakeld – ${f.cb} mag weer IN${f.outFrac?` (${Math.round(f.cust*f.outFrac)} klanten wachten op reparatie)`:''}`,f.cb,()=>!D[f.cb].state);
      addTimer(rnd(40,70),()=>{f.fault=null;f.outFrac=0;pushAlarm(`Storingsdienst: kabel ${f.id} gerepareerd`,'ok');});});}
  refreshAll();}

function efTick(dm){const e=EF.on;if(!e)return;
  if(!efRails().length)return efFound();
  GAME.score-=dm*0.5;   // een aardfout die blijft staan: isolatie van de gezonde fasen staat op lijnspanning
  if(efAge()>40&&!e.warned){e.warned=true;pushAlarm('Aardfout staat al 40 minuten: de gezonde fasen staan op lijnspanning – de kans op een dubbele aardfout (kortsluiting) neemt toe','warn');}
  if(efAge()>50&&Math.random()<dm/20){   // dubbele aardfout: tweede aardsluiting elders, de beveiliging schakelt beide af
    EF.on=null;RING.stations.forEach(s=>{s.efFlag=false;});GAME.stats.efDouble=(GAME.stats.efDouble||0)+1;award(-60,'Dubbele aardfout');
    pushAlarm('Dubbele aardfout: een tweede aardsluiting elders in het net – dat is een kortsluiting, de beveiliging schakelt af','crit');
    if(e.secId){const s=RING.secs.find(x=>x.id===e.secId),f=efFeeder(s.node);if(f)ringFault(f,s);}else if(e.fId)feederFault(e.fId);
    feederFault();}}
