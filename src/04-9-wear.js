
// Veroudering en preventief onderhoud: vermogenschakelaars slijten door schakelen en vooral door het afschakelen van foutstromen.
// Een versleten schakelaar kan weigeren (50BF: de reservebeveiliging schakelt de hele rail af) en blijft dan mechanisch vastzitten.
const CB_IDS=Object.values(D).filter(d=>d.type==='cb').map(d=>d.id);
const MAINT_CBS=FEEDERS.filter(f=>!is20(f.bus)).map(f=>f.cb);   // velden met railkeuzescheiders: te reviseren zonder rail vrij te maken
CB_IDS.forEach(id=>{const d=D[id];d.wear=rnd(0.05,0.5);});
MAINT_CBS.slice().sort(()=>Math.random()-0.5).slice(0,2).forEach(id=>{D[id].wear=rnd(0.66,0.8);});   // een paar oude schakelaars
CB_IDS.forEach(id=>{const d=D[id];d.year=2026-Math.round(d.wear*14);d.ops=Math.round(d.wear*2600+rnd(0,300));});
const cond=d=>Math.max(0,1-(d.wear||0));
function wearOp(d,fault){d.wear=Math.min(1,(d.wear||0)+(fault?0.025:0.003));d.ops++;
  if(d.wear>0.75&&!d.wearWarn){d.wearWarn=true;pushAlarm(`${d.id}: conditie ${Math.round(cond(d)*100)}% – schakelaar is aan revisie toe (overzicht Onderhoud, O)`,'warn');}}
// kans dat een schakelaar weigert bij een beveiligingstrip
// alleen in diensten en vrij spelen: scenario's verlopen zoals bedoeld, en in de testmodus alleen als een test het vraagt
const failP=d=>d.feeder&&!MODES[GAME.mode]?.scen&&(!LITE||SIM.failTest)?Math.max(0,d.wear-0.72)*1.6:0;
function breakerFails(d){if(d.stuck)return true;if(Math.random()>=failP(d))return false;
  d.stuck=true;GAME.stats.bf=(GAME.stats.bf||0)+1;
  const sel=SEL_BAYS[d.bay],rail=sel?BUSES[railOf(sel.node)||sel.home].nm:BUSES[d.a]?.nm||'?';
  setTimeout(()=>{pushAlarm(`50BF: ${d.id} weigert af te schakelen (versleten mechanisme) – reserve-uitschakeling van rail ${rail}!`,'crit');
    pushAlarm(`Tip: ${d.id} zit vast. Open zijn railkeuzescheider zolang de rail spanningsloos is, neem de rail daarna weer in bedrijf en laat ${d.id} reviseren.`,'info');},150);
  return true;}
// revisie van een vermogenschakelaar (10 kV-velden): veld vrijschakelen via railkeuzescheider en kabelaarding
const worstCb=()=>MAINT_CBS.map(id=>D[id]).filter(d=>(d.wear>0.62||d.stuck)&&!d.feeder.fault).sort((a,b)=>b.wear-a.wear)[0]?.id||null;
function cbMaintTask(id){const d=D[id],f=d.feeder,F=f.id,rg=f.ring&&RINGS.find(r=>r.from===F||r.to===F),sel=SEL_BAYS[F],home=sel.home==='RA'?'QA':'QB';
  const head=rg?(rg.from===F?rg.stations[0].id+'-L':rg.stations[rg.stations.length-1].id+'-R'):null,bf=v=>{if(!f.ring)f.backfed=v;};
  const st=[];
  if(rg)st.push({t:`Sluit het normaal-open punt ${rg.nop}`,act:[rg.nop,1],why:'Eerst de ring sluiten, zodat de stations via de andere kant gevoed blijven.',ok:()=>D[rg.nop].state===1});
  else st.push({t:`Wacht: storingsdienst schakelt de klanten van ${F} om (terugvoeding)`,wait:6,done:()=>{bf(true);pushAlarm(`Storingsdienst: klanten van ${F} omgeschakeld – ${id} mag UIT`,'info');}});
  st.push({t:`Schakel ${id} UIT${d.stuck?' (zit vast – overslaan als hij al geïsoleerd is)':''}`,act:[id,0],why:'Eerst de vermogenschakelaar uit.',ok:()=>D[id].state===0||D[id].stuck&&!EN.has(F+'s')});
  if(head)st.push({t:`Open lastscheider ${head} (kabel vrij van de ring)`,act:[head,0],why:'De kabel ook aan de ringkant vrijschakelen.',ok:()=>D[head].state===0});
  ['QA','QB'].forEach(q=>st.push({t:`Open railkeuzescheider ${F}-${q}`,act:[F+'-'+q,0],grp:'sel',why:'Het veld aan de railkant vrijmaken.',ok:()=>D[F+'-'+q].state===0}));
  st.push({t:`Sluit aardschakelaar ${F}-Q8`,act:[F+'-Q8',1],why:'Pas aarden als het veld aan alle kanten vrij en spanningsloos is.',ok:()=>D[F+'-Q8'].state===1,done:()=>pushAlarm(`Werkvergunning afgegeven – revisie ${id} gestart`,'info')});
  st.push({t:`Revisie ${id}: mechanisme, contacten en veer…`,wait:30,done:()=>{d.wear=0.04;d.stuck=false;d.state=0;d.wearWarn=false;d.year=2026;d.ops=0;pushAlarm(`${id} gereviseerd – conditie 96%`,'ok');}});
  st.push({t:`Werk gereed – open ${F}-Q8`,act:[F+'-Q8',0],why:'Eerst de aarding opheffen.',ok:()=>D[F+'-Q8'].state===0});
  st.push({t:`Sluit railkeuzescheider ${F}-${home}`,act:[F+'-'+home,1],why:'Het veld weer op zijn normale rail zetten.',ok:()=>D[F+'-'+home].state===1});
  st.push({t:`Schakel ${id} IN`,act:[id,1],why:'Dan de vermogenschakelaar weer in.',ok:()=>D[id].state===1});
  if(head)st.push({t:`Sluit ${head}`,act:[head,1],why:'De kabel weer in de ring opnemen.',ok:()=>D[head].state===1},{t:`Open het normaal-open punt ${rg.nop} weer`,act:[rg.nop,0],why:'Als laatste de ring normaliseren.',ok:()=>D[rg.nop].state===0});
  else st.push({t:'Wacht: storingsdienst heft de terugvoeding op',wait:3,done:()=>{bf(false);pushAlarm(`Terugvoeding ${F} opgeheven – normale situatie`,'ok');}});
  return{feeder:F,cbm:id,title:`Revisie vermogenschakelaar ${id}`,crew:()=>({box:VIEWS[id]?.box||VIEWS.MS.box,say:`Revisie ${id}`,rel:[id,F+'-QA',F+'-QB',F+'-Q8']}),
    desc:`${id} (${d.stuck?'zit vast na een weigering':'conditie '+Math.round(cond(d)*100)+'%'}, laatste revisie ${d.year}) krijgt een revisie. ${rg?'Het veld voedt een ring: sluit eerst het normaal-open punt en maak de kabel aan de ringkant vrij.':'De klanten worden eerst via het net omgeschakeld.'}`,
    afterAbort:()=>bf(false),steps:st};}
