
// Beveiligingsrelais van de 10 kV-velden: verborgen afwijkingen en de werkopdracht relaistest met de testkoffer.
// Afwijkingen: aanspreekwaarde verlopen (drift), te traag (delay) of uitschakelcircuit defect (trip:false).
const RELAY_BAYS=FEEDERS.filter(f=>SEL_BAYS[f.id]);   // velden met railkeuzescheiders: veilig vrij te maken voor een test
const CT_PRIM=600;   // stroomtransformator 600/1 A
RELAY_BAYS.forEach(f=>{f.relay={};f.relayYear=2026-Math.floor(rnd(0,6));});
// alleen in diensten en vrij spelen (scenario's en tests blijven voorspelbaar)
function initRelays(){RELAY_BAYS.forEach(f=>{const r=Math.random();f.relay=r<0.08?{trip:false}:r<0.16?{drift:rnd(1.15,1.3)}:r<0.24?{delay:rnd(1.3,1.8)}:{};f.relayYear=2026-Math.floor(rnd(0,6));});}
const relayDefect=f=>!!f.relay&&(f.relay.trip===false||(f.relay.drift||1)>1.08||(f.relay.delay||1)>1.15);
// het relais geeft geen uitschakelcommando: de reservebeveiliging schakelt de rail af
// van = knooppunt waar de fout vandaan komt (alleen de kabelkant is de taak van dit relais)
function relayRefuses(d,van){const f=d.feeder;if(!f||f.relay?.trip!==false||(van&&van!==d.b))return false;relayFails(d);return true;}
function relayFails(d){GAME.stats.relayFail=(GAME.stats.relayFail||0)+1;d.feeder.relayKnown=true;
  setTimeout(()=>pushAlarm(`Beveiliging ${d.id} weigert: uitschakelcircuit van het relais defect – reserve-uitschakeling van de rail!`,'crit'),150);
  setTimeout(()=>pushAlarm(`Tip: laat het relais van ${d.bay} testen en vervangen (Onderhoud, O) – tot die tijd is dit veld niet goed beveiligd`,'info'),400);}
const canRelay=f=>D[f.cb].state===1&&!f.fault&&EN.has(f.node)&&(f.ring?canRing():!f.backfed);
const relayDue=()=>RELAY_BAYS.filter(canRelay).sort((a,b)=>a.relayYear-b.relayYear).find(f=>f.relayYear<=2023)?.id||null;
// ---- werkopdracht relaistest
function relayTask(F){const f=FD(F),cb=f.cb,rg=f.ring&&RINGS.find(r=>r.from===F||r.to===F),home=SEL_BAYS[F].home==='RA'?'QA':'QB';
  const head=rg?(rg.from===F?rg.stations[0].id+'-L':rg.stations[rg.stations.length-1].id+'-R'):null,bf=v=>{if(!f.ring)f.backfed=v;};
  const t={relayF:F,feeder:F,kit:{res:{},verdict:null},title:`Relaistest veld ${F} (${f.name})`,crew:()=>({box:VIEWS.MS.box,say:`Relaistest ${F}`,rel:[cb,F+'-QA',F+'-QB']}),
    desc:`Periodieke test van het overstroomrelais van ${F} (laatste test ${f.relayYear}). Maak het veld vrij, laat de monteur de testkoffer aansluiten en beoordeel zelf de meetresultaten.`,afterAbort:()=>bf(false),steps:[]};
  const st=t.steps;
  if(rg)st.push({t:`Sluit het normaal-open punt ${rg.nop}`,act:[rg.nop,1],why:'Eerst de ring sluiten, zodat de stations via de andere kant gevoed blijven.',ok:()=>D[rg.nop].state===1});
  else st.push({t:`Wacht: storingsdienst schakelt de klanten van ${F} om (terugvoeding)`,wait:6,done:()=>{bf(true);pushAlarm(`Storingsdienst: klanten van ${F} omgeschakeld – ${cb} mag UIT`,'info');}});
  st.push({t:`Schakel ${cb} UIT`,act:[cb,0],why:'Eerst het veld uitschakelen.',ok:()=>D[cb].state===0});
  if(head)st.push({t:`Open lastscheider ${head} (kabel vrij van de ring)`,act:[head,0],why:'De kabel ook aan de ringkant vrijmaken.',ok:()=>D[head].state===0});
  ['QA','QB'].forEach(q=>st.push({t:`Open railkeuzescheider ${F}-${q}`,act:[F+'-'+q,0],grp:'sel',why:'Het veld aan de railkant vrijmaken: dan mag de vermogenschakelaar voor de proef in.',ok:()=>D[F+'-'+q].state===0}));
  st.push({t:'Wacht: monteur opent het testblok en sluit de testkoffer aan',wait:5});
  st.push({t:`Schakel ${cb} IN voor de uitschakelproef (het veld is vrij)`,act:[cb,1],why:'Met het veld vrij mag de vermogenschakelaar dicht: de testkoffer laat hem straks afschakelen.',ok:()=>D[cb].state===1||!!t.kit.res.trip});
  st.push({t:'🧰 Test het relais met de testkoffer en geef je oordeel',kit:true,ok:()=>!!t.kit.verdict});
  st.push({t:'Relais vervangen (alleen na afkeuren)',wait:0,done:()=>{if(t.kit.verdict!=='reject')return;f.relay={};f.relayKnown=false;pushAlarm(`Monteur: relais ${F} vervangen en ingesteld`,'ok');}});
  st.push({t:'Wacht: monteur sluit het testblok',wait:3,done:()=>{f.relayYear=2026;}});
  st.push({t:`Schakel ${cb} UIT (als de proef hem nog niet afschakelde)`,act:[cb,0],why:'Voor het terugzetten op de rail moet de vermogenschakelaar uit.',ok:()=>D[cb].state===0});
  st.push({t:`Sluit railkeuzescheider ${F}-${home}`,act:[F+'-'+home,1],why:'Het veld weer op zijn normale rail zetten.',ok:()=>D[F+'-'+home].state===1});
  st.push({t:`Schakel ${cb} IN`,act:[cb,1],why:'Dan de vermogenschakelaar weer in.',ok:()=>D[cb].state===1&&EN.has(f.node)});
  if(head)st.push({t:`Sluit ${head}`,act:[head,1],why:'De kabel weer in de ring opnemen.',ok:()=>D[head].state===1},{t:`Open het normaal-open punt ${rg.nop} weer`,act:[rg.nop,0],why:'Als laatste de ring normaliseren.',ok:()=>D[rg.nop].state===0});
  else st.push({t:'Wacht: storingsdienst heft de terugvoeding op',wait:3,done:()=>{bf(false);pushAlarm(`Terugvoeding ${F} opgeheven – normale situatie`,'ok');}});
  return t;}
// ---- de testkoffer: secundaire injectie
const IEC=(m,tms)=>0.14*tms*0.1/(Math.pow(m,0.02)-1);   // IEC standaard-invers (s), tijdfactor ×1 = TMS 0,1
function kitTests(f){const ps=PROT.f[f.id],Ip=ps.pick*f.rate*kA(f.bus),Is=Ip/CT_PRIM;
  return [{id:'p95',name:'Aanspreekproef 0,95 × I>',inj:0.95*Is,expect:'spreekt niet aan'},{id:'p105',name:'Aanspreekproef 1,05 × I>',inj:1.05*Is,expect:'spreekt aan'},
    {id:'t2',name:'Tijdproef 2 × I>',inj:2*Is,expectT:IEC(2,ps.tms)},{id:'t5',name:'Tijdproef 5 × I>',inj:5*Is,expectT:IEC(5,ps.tms)},
    {id:'trip',name:'Uitschakelproef (vermogenschakelaar)',inj:5*Is,expect:`${f.cb} schakelt af`}];}
// meting: wat de testkoffer werkelijk ziet, met het (verborgen) gedrag van dit relais
function kitMeasure(f,test){const r=f.relay||{},drift=r.drift||1,delay=r.delay||1,ps=PROT.f[f.id],noise=1+rnd(-0.015,0.015);
  if(test.id==='p95')return {txt:0.95>=drift?'spreekt aan':'spreekt niet aan'};
  if(test.id==='p105')return {txt:1.05>=drift?'spreekt aan':'spreekt niet aan'};
  if(test.id==='trip'){if(r.trip===false)return {txt:`geen uitschakelcommando – ${f.cb} blijft IN`};if(D[f.cb].state!==1)return {txt:`${f.cb} staat al uit`};tripBreaker(f.cb);return {txt:`${f.cb} schakelt af na ${Math.round(48*noise)} ms`};}
  const m=test.id==='t2'?2:5;if(r.trip===false)return {txt:'geen uitschakelcommando',t:null};
  const tm=m>=drift?IEC(m/drift,ps.tms)*delay*noise:null;return {t:tm,txt:tm==null?'spreekt niet aan':`${tm.toFixed(2).replace('.',',')} s`};}
function kitVerdict(t,v){const f=FD(t.relayF),bad=relayDefect(f);t.kit.verdict=v;GAME.stats.relayTests=(GAME.stats.relayTests||0)+1;
  if(v==='reject'&&bad){award(60,'Defect relais gevonden');pushAlarm(`Testrapport ${f.id}: relais afgekeurd – de monteur vervangt het`,'ok');t.steps.find(s=>/Relais vervangen/.test(s.t)).wait=20;}
  else if(v==='reject'){award(-20,'Relais onnodig vervangen');pushAlarm(`Testrapport ${f.id}: relais afgekeurd – de monteur vervangt het (de metingen waren binnen tolerantie)`,'warn');t.steps.find(s=>/Relais vervangen/.test(s.t)).wait=20;}
  else if(!bad){award(40,'Relaistest goedgekeurd');pushAlarm(`Testrapport ${f.id}: relais goedgekeurd`,'ok');}
  else{pushAlarm(`Testrapport ${f.id}: relais goedgekeurd`,'ok');addTimer(25,()=>{if(!relayDefect(f))return;award(-50,'Defect relais goedgekeurd');GAME.stats.relayMissed=(GAME.stats.relayMissed||0)+1;
    pushAlarm(`${CHIEF}: in het testrapport van ${f.id} staat een meting buiten tolerantie die je hebt goedgekeurd! Plan een nieuwe relaistest (Onderhoud, O)`,'warn');});}
  renderTasks();}
