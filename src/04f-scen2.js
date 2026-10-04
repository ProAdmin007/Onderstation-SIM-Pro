
// ============================================================ extra scenario's: aanrijding, cyberaanval, overstroming, zonnepiek
const stn=id=>RING.stations.find(s=>s.id===id);
// beschadigd of onder water gelopen MS-station: niet bedienbaar, onder spanning brengen geeft direct een trip
function stationDamage(s,why){s.damaged=why;const v=VIEWS[s.id];if(v)spawnArc(v.arcPos,1.2);tripFrom(s.node);refreshAll();}
function stationProtection(){RING.stations.forEach(s=>{if(s.damaged&&EN.has(s.node)){tripFrom(s.node);GAME.stats.recloseFault++;award(-40,'Ingeschakeld op beschadigd station');
  pushAlarm(`${s.id} ${s.name} (${s.damaged}) onder spanning gebracht – beveiliging schakelt direct af`,'warn');}});}
const SCADA_DOWN=()=>!!GAME.flags.scadaDown;
// lokaal bedienen: in first person dichtbij het veld staan
const localOk=id=>SIM.localTest||(FP.on&&!!VIEWS[id]&&camera.position.distanceTo(VIEWS[id].center)<7);
let WATER=null;
Object.assign(MODES,{
  aanrijding:{scen:true,name:'Aanrijding MS-station',tag:'Scenario · gemiddeld',start:14,dur:75,season:'herfst',weather:'bewolkt',
    desc:'Een vrachtwagen rijdt op het bedrijventerrein tegen MS-station MS5. De schakelinstallatie is kapot en niet meer te bedienen.',
    setup(){pushAlarm('Rustige middag – op het bedrijventerrein wordt druk gelost','info');
      at(2,()=>{const s=stn('MS5');stationDamage(s,'aanrijding, RMU beschadigd');GAME.flags.tripAt=SIM.t;
        pushAlarm('112-melding: vrachtwagen tegen MS-station MS5 Bedrijvenpark Zuid! V-F4 is afgeschakeld','crit');
        pushAlarm('Tip: de schakelaars van MS5 zijn niet meer te bedienen. Isoleer MS5 vanaf het buurstation (MS4-R), houd V-F4 uit en voed MS4 terug via het normaal-open punt.','info');
        crewDispatch({box:VIEWS.MS5.box,say:'Schade opnemen MS5',from:V3(s.pos[0]+8,0,s.pos[1]-10),until:()=>GAME.ended});
        at(26,()=>{s.groups.forEach(g=>g.backfed=true);s.genset=true;readyNotice('Noodaggregaat bij MS5 draait – de klanten van het bedrijventerrein hebben weer stroom',null);});});},
    obj:()=>[{t:'MS4 binnen 8 min weer gevoed',check:()=>GAME.flags.tripAt==null?null:EN.has('M4')?'done':SIM.t>GAME.flags.tripAt+8?'fail':null},
      {t:'Niet inschakelen op het beschadigde station',check:()=>GAME.stats.recloseFault?'fail':null,final:()=>true},
      {t:'Minder dan 20.000 klantminuten',check:()=>SIM.cml>20000?'fail':null,final:()=>SIM.cml<=20000},noIncidents]},
  cyber:{scen:true,name:'Cyberaanval op SCADA',tag:'Scenario · moeilijk',start:10,dur:70,season:'herfst',weather:'bewolkt',
    desc:'Het SCADA-systeem wordt aangevallen en de verbinding met het station valt weg. Bedien de installatie ter plaatse – lopend (V).',
    setup(){Object.assign(SIM.lines.L1,{ar:false});pushAlarm('AR van L1 staat uit voor onderhoud aan de beveiliging','info');
      at(3,()=>{GAME.flags.scadaDown=true;$('#scada').classList.add('down');pushAlarm('CERT: cyberaanval op het bedrijfsvoeringssysteem – SCADA-verbinding met OS Zuidwolde verbroken!','crit');
        pushAlarm('Bedienen op afstand is niet meer mogelijk. Loop het station in (V) en schakel lokaal aan het veld (richt op de schakelaar, F).','info');});
      at(9,()=>feederFault('F6',10));at(28,()=>{lineFault('L1',false);GAME.flags.lineAt=SIM.t;});
      at(58,()=>{GAME.flags.scadaDown=false;$('#scada').classList.remove('down');readyNotice('SCADA-verbinding hersteld – bediening op afstand weer mogelijk',null);});},
    obj:()=>[{t:'L1 binnen 12 min na de trip weer in bedrijf',check:()=>GAME.flags.lineAt==null?null:D['L1-Q0'].state&&SIM.lines.L1.avail?'done':SIM.t>GAME.flags.lineAt+12?'fail':null},
      {t:'Kassen (F6) weer gevoed voordat SCADA terug is',check:()=>GAME.t0&&SIM.t>GAME.t0+12&&EN.has('F6')&&GAME.flags.scadaDown?'done':SIM.t>GAME.t0+58?'fail':null},noIncidents]},
  overstroming:{scen:true,name:'Overstroming De Vaart',tag:'Scenario · gemiddeld',start:15,dur:90,season:'herfst',weather:'regen',
    desc:'Na dagen regen loopt het water bij De Vaart Zuid op. MS-station MS9 komt onder water te staan: maak het op tijd spanningsloos zonder MS8 te verliezen.',
    setup(){const s=stn('MS9');GAME.flags.floodAt=SIM.t+20;s.evac=true;GAME.countdown={label:'Water bereikt MS9',until:SIM.t+20};
      pushAlarm('Waterschap: het water bij De Vaart Zuid stijgt snel – over ±20 min staat MS-station MS9 onder water','crit');
      pushAlarm('Tip: sluit eerst het normaal-open punt MS7-R zodat MS8 via MS7 gevoed blijft, haal dan MS9 uit de ring: MS8-R open en V-F2 UIT (de kopkabel voedt MS9 rechtstreeks).','info');
      if(!WATER){WATER=new THREE.Mesh(new THREE.CircleGeometry(26,40),new THREE.MeshStandardMaterial({color:0x4a6470,transparent:true,opacity:0.78,roughness:0.08,metalness:0.2}));WATER.rotation.x=-Math.PI/2;WATER.userData.noBake=true;scene.add(WATER);}
      WATER.position.set(s.pos[0],-0.2,s.pos[1]);
      at(20,()=>{if(EN.has(s.node)){stationDamage(s,'onder water gelopen');pushAlarm('MS9 stond nog onder spanning toen het water binnenkwam – kortsluiting!','crit');GAME.flags.floodFail=true;}
        else pushAlarm('MS9 staat onder water, maar is spanningsloos – geen schade','ok');});
      at(62,()=>{s.evac=false;if(!s.damaged)readyNotice('Water gezakt, MS9 is geïnspecteerd en droog – het station mag weer in bedrijf',null);});},
    tick(dm){if(!EN.has('M8'))GAME.flags.m8off=(GAME.flags.m8off||0)+dm;const t=SIM.t-GAME.t0,h=t<20?t/20*0.7:t<62?0.7:Math.max(0,0.7-(t-62)/12*0.7);if(WATER)WATER.position.y=h-0.2;},
    obj:()=>[{t:'MS9 spanningsloos voordat het water er is',check:()=>SIM.t<GAME.flags.floodAt?null:GAME.flags.floodFail?'fail':'done'},
      {t:'MS8 blijft gevoed',check:()=>GAME.flags.m8off>3?'fail':null,final:()=>true},
      {t:'MS9 weer in bedrijf vóór het einde',check:()=>!stn('MS9').evac&&EN.has('M9')?'done':null,final:()=>EN.has('M9')},noIncidents]},
  zonnepiek:{scen:true,name:'Zonnepiek',tag:'Scenario · gemiddeld',start:11,dur:120,season:'lente',weather:'helder',
    desc:'Een strakblauwe lentedag. Het uitgebreide zonnepark (G1) levert zoveel terug dat T2 het niet alleen aankan. Houd T2 heel en het zonnepark zo veel mogelijk in bedrijf.',
    setup(){const g=FEEDERS.find(f=>f.id==='G1');g.base=64;g.name='Zonnepark De Hoeve (uitgebreid, 66 MWp)';D.T2.oil=60;initTaps();
      pushAlarm('Zonnepark De Hoeve is uitgebreid tot 66 MWp – vandaag een recordopbrengst verwacht','info');
      pushAlarm('Tip: kijk op het tabblad Prognose naar de teruglevering op 20 kV. T3 kan op 20 kV parallel met T2 (W-T3).','info');},
    tick(dm){if(D['W-G1'].state&&EN.has('G1'))GAME.flags.pvOn=(GAME.flags.pvOn||0)+dm;},
    obj:()=>[{t:'T2 wordt niet thermisch afgeschakeld',check:()=>GAME.stats.thermal?'fail':null,final:()=>true},
      {t:'Geen spanningsafwijkingen op de rails',check:()=>GAME.stats.volt?'fail':null,final:()=>true},
      {t:'Zonnepark minstens 80% van de tijd in bedrijf',final:()=>(GAME.flags.pvOn||0)>=0.8*(SIM.t-GAME.t0)},noIncidents]},
});
