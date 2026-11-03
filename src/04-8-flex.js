
// Netcongestie en flexibel vermogen: afnemers die tegen vergoeding hun vermogen tijdelijk terugregelen,
// en overbelastingsbeveiliging van de distributietransformatoren in de MS-stations
// contractvormen (zoals bij Nederlandse netbeheerders in 2026):
//  afroep     capaciteitssturingscontract (CSC) met afroep: vooraf afroepen voor een tijdvak
//  blok       CSC met tijdsblok: elke dag vast terugregelen in hetzelfde tijdvak
//  blokstroom tijdsblokgebonden transportrecht: het extra vermogen alleen 00:00–06:00 (geen vergoeding, wel korting op het tarief)
//  nonfirm    non-firm ATO: de netbeheerder regelt automatisch terug als het net vol zit (geen vergoeding)
// afroep- en blokklanten kunnen daarnaast intraday een bod doen (redispatch), voor het dubbele tarief
const FLEX_DEF=[
  {id:'MS4-G3',name:'Laadplein Zuiderveld',how:'slim laden: laadstroom begrenzen',max:0.7,eur:180,type:'afroep'},
  {id:'MS5-G1',name:'Transportbedrijf',how:'e-trucks laden in de nacht',max:0.5,eur:0,type:'blokstroom',night:0.6},
  {id:'MS5-G2',name:'Koelhuis',how:'koeling 2 uur uitstellen',max:0.5,eur:120,type:'afroep'},
  {id:'MS8-G1',name:'Metaalbewerking Smit',how:'ovens terugregelen',max:0.3,eur:260,type:'afroep'},
  {id:'MS9-G1',name:'Distributiecentrum',how:'batterij ontladen',max:0.4,eur:200,type:'blok',blk:[17,20]},
  {id:'F6',name:'Glastuinbouw Oost',how:'belichting dimmen',max:0.8,eur:90,type:'afroep'},
  {id:'G1',name:'Zonnepark De Hoeve',how:'omvormers terugregelen',max:0.8,eur:0,gen:true,type:'nonfirm'}];
const FLEX=FLEX_DEF.map(f=>({...f,c:CONS.find(c=>c.id===f.id),req:0,at:0,live:0,calls:[],nf:0,viol:0,violN:0}));
const FLEX_DELAY=2;   // minuten reactietijd van de aggregator
// distributietransformatoren: kleinste standaardmaat met marge boven de winterpiek (zo geeft een normale dienst geen congestie)
const KVA_SIZES=[1000,1600,2000,2500,3150,4000];
RING.stations.forEach(s=>{let pk=0;for(let h=0;h<24;h+=0.25)pk=Math.max(pk,s.groups.reduce((a,g)=>a+g.base*profile(g.kind,h)*(SEASONS.winter.load[g.kind]??1),0));
  s.peakMW=pk;s.kva=KVA_SIZES.find(k=>k*0.95/1000>=pk*1.25)||4000;D[s.id].label=`MS-station ${s.name} · 10/0,4 kV ${s.kva} kVA`;D[s.id+'-TR'].label=`Distributietransformator 10/0,4 kV · ${s.kva} kVA`;});
const trMW=s=>s.kva*0.95/1000;
// veldkabels (niet-ring) op dezelfde manier: rating = winterpiek + 20% marge
FEEDERS.filter(f=>!f.ring&&!f.gen&&!f.link).forEach(f=>{let pk=0;for(let h=0;h<24;h+=0.25)pk=Math.max(pk,f.base*profile(f.kind,h)*(SEASONS.winter.load[f.kind]??1));f.rate=pk*1.2;});   // vermogen (MW) bij cos φ 0,95
const FLEX_LEAD=180;   // minuten: een CSC-afroep moet zo lang vooraf (in het echt de dag ervoor, bij Enexis vóór 07:00)
const FLEX_TYPE={afroep:'CSC · afroep',blok:'CSC · tijdsblok',blokstroom:'Blokstroom 00–06 u',nonfirm:'Non-firm ATO'};
const flexIntra=f=>!f.type||f.type==='afroep'||f.type==='blok';   // kan een intraday-bod doen
const intraEur=f=>f.type?f.eur*2:f.eur;   // intraday (redispatch) kost het dubbele van een tijdige afroep
const inHours=(h,a,b)=>h>=a&&h<b;
const flexOf=id=>FLEX.find(x=>x.id===id);
// gewenste terugregeling op tijdstip t (minuten), plan=true voor de prognose (zonder toevallige overschrijdingen)
function flexWant(f,t,plan){const h=((t/60)%24+24)%24;let k=0,src='';
  const up=(v,s)=>{if(v>k){k=v;src=s;}};
  if(f.type==='blokstroom'){if(inHours(h,0,6))return {k:-f.night,src:'bs'};return (!plan&&f.viol)?{k:0,src:''}:{k:f.max,src:'bs'};}
  if(f.type==='blok'&&inHours(h,f.blk[0],f.blk[1]))up(f.max,'blok');
  for(const c of f.calls||[])if(t>=c.from&&t<c.to)up(c.frac*f.max,'afroep');
  up((plan?f.req:f.live||0)*f.max,'intra');
  if(f.type==='nonfirm'&&!plan)up(f.nf,'nf');
  return {k,src};}
// geplande terugregeling voor afnemer c op tijdstip t (voor de prognose)
function planCut(c,t){const f=FLEX.find(x=>x.c===c);return f?flexWant(f,t,true).k:0;}
// intraday-bod: fractie van het maximum (0 … 1)
function setFlex(id,frac){const f=flexOf(id);if(!f||!flexIntra(f))return;frac=clamp(frac,0,1);if(f.req===frac)return;f.req=frac;f.at=SIM.t+FLEX_DELAY;
  pushAlarm(frac?`Intraday-flex: ${f.name} ${Math.round(frac*f.max*100)}% terugregelen (${f.how}) – actief over ±${FLEX_DELAY} min, € ${intraEur(f)}/MWh`:`Flex: ${f.name} vrijgegeven – weer normaal vermogen`,'op');renderFlex?.();}
// CSC-afroep voor een tijdvak (minuten), uiterlijk FLEX_LEAD minuten vooraf
function flexCall(id,from,to,frac=1){const f=flexOf(id);if(!f||f.type!=='afroep')return false;
  if(from<SIM.t+FLEX_LEAD-0.01){pushAlarm(`Afroep ${f.name} te laat: een CSC-afroep moet minstens ${FLEX_LEAD/60} uur vooraf. Gebruik intraday-flex (duurder)`,'warn');return false;}
  if(f.calls.some(c=>from<c.to&&to>c.from)){pushAlarm(`${f.name}: er is al een afroep in dat tijdvak`,'warn');return false;}
  f.calls.push({from,to,frac});f.calls.sort((a,b)=>a.from-b.from);
  pushAlarm(`CSC-afroep: ${f.name} regelt ${fmtClock(from)}–${fmtClock(to)} ${Math.round(frac*f.max*100)}% terug (${f.how})`,'op');renderFlex?.();return true;}
// annuleren kan tot de afroeptermijn verstreken is
function flexCancel(id,i){const f=flexOf(id),c=f?.calls[i];if(!c||SIM.t>c.from-FLEX_LEAD)return false;f.calls.splice(i,1);pushAlarm(`Afroep ${f.name} ${fmtClock(c.from)} geannuleerd`,'op');renderFlex?.();return true;}
// blokstroomklant aanspreken op laden buiten het tijdsblok
function flexWarn(id){const f=flexOf(id);if(!f?.viol)return;f.viol=0;f.violEnd=0;f.violN++;
  pushAlarm(f.violN>=3?`${f.name} aangesproken (${f.violN}e keer). Bij herhaling vervalt het blokstroomrecht – de klant zegt toe zich aan 00:00–06:00 te houden`:`${f.name} aangesproken – de trucks laden weer alleen in het blok 00:00–06:00`,'ok');renderFlex?.();}
const FLEX_EUR={blok:f=>f.eur*0.6,afroep:f=>f.eur,intra:intraEur};
const flexSaved=f=>{const c=f.c,k=c.cut||0;return k>0&&EN.has(c.node)?Math.abs(c.demand)/(1-k)*k:0;};   // MW die nu niet afgenomen of opgewekt wordt
// koppelkabel naar Meppel: parallel met het net van Netbeheer Noord is niet toegestaan – hun beveiliging schakelt de koppeling af
function linkTick(){const k=D['MS5-K'];if(!k.state||!D['M-MP3'].state||!EN.has('MP3'))return;k.state=0;const par=energized().has('M5');k.state=1;
  if(par){tripBreaker('M-MP3');award(-40,'Parallel met ander net');pushAlarm('Netbeheer Noord: uw net staat parallel met het onze via de koppelkabel – M-MP3 afgeschakeld. Open eerst MS5-K voordat u de ring weer vanuit Zuidwolde voedt','warn');}}
function flexTick(dm){linkTick();
  const t=SIM.t,h=((t/60)%24+24)%24;
  FLEX.forEach(f=>{if(SIM.t>=f.at)f.live=f.req;
    f.calls=(f.calls||[]).filter(c=>c.to>t-60);
    if(f.type==='blokstroom'){
      // overschrijding: de klant laadt overdag toch op vol vermogen
      if(!f.viol&&!inHours(h,0,6)&&GAME.mode&&!GAME.lesson&&Math.random()<dm/900){f.viol=1;f.violEnd=t+60;
        pushAlarm(`${f.name} laadt buiten het blokstroomvenster (00:00–06:00): ±${fx1(Math.abs(f.c.demand)/(1-f.max)*f.max)} MW extra op ${f.c.st?.id||f.id}. Spreek de klant aan (C)`,'warn');renderFlex?.();}
      if(f.viol&&(t>=f.violEnd||inHours(h,0,6)))f.viol=0;}
    if(f.type==='nonfirm'&&!MODES[GAME.mode]?.firmPV){const cap=capNow().c20,back=-FLOW.load20;
      if(cap>0&&back>cap*0.95){if(!f.nf)pushAlarm(`Non-firm: ${f.name} wordt automatisch teruggeregeld – de 20 kV-teruglevering zit aan de grens`,'op');f.nf=Math.min(f.max,f.nf+0.1*dm);}
      else if(back<cap*0.85)f.nf=Math.max(0,f.nf-0.05*dm);}
    const w=flexWant(f,t),was=f.c.cut||0;
    if(Math.abs(was-w.k)>1e-6){f.c.cut=w.k;if(w.src==='afroep'&&!(was>0))pushAlarm(`CSC-afroep actief: ${f.name} regelt terug (${f.how})`,'ok');else if(w.src==='intra'&&w.k>was)pushAlarm(`Flex actief: ${f.name} regelt terug (${f.how})`,'ok');}
    f.src=w.src;const mw=flexSaved(f),pr=FLEX_EUR[w.src];if(mw>0&&pr){const eur=mw*pr(f)*dm/60;GAME.stats.flexEur=(GAME.stats.flexEur||0)+eur;GAME.score-=eur/100;}});
  // distributietransformator: zekeringen slaan door na langdurige overbelasting
  RING.stations.forEach(s=>{const k=s.P/trMW(s);s.trLoad=k;
    if(k>1.05&&!s.trWarn&&D[s.id+'-T'].state){s.trWarn=true;pushAlarm(`${s.id} ${s.name}: distributietrafo ${Math.round(k*100)}% belast – boven 120% slaan de zekeringen na enkele minuten door. Zet flexibel vermogen in (C)`,'warn');}
    if(k>1.2&&D[s.id+'-T'].state){s.trOt=(s.trOt||0)+dm*(k-1)*3;
      if(s.trOt>12){s.trOt=0;D[s.id+'-T'].state=0;s.fuse=true;GAME.stats.fuses=(GAME.stats.fuses||0)+1;award(-60,`Zekeringen ${s.id} doorgeslagen`);
        pushAlarm(`${s.id} ${s.name}: MS-zekeringen doorgeslagen door overbelasting – ${s.cust.toLocaleString('nl-NL')} klanten zonder stroom. Monteur onderweg met nieuwe zekeringen`,'crit');
        const v=VIEWS[s.id];if(v)crewDispatch({box:v.box,n:1,say:`Zekeringen ${s.id} vervangen`,from:V3(s.pos[0]+6,0,s.pos[1]-8),until:()=>!s.fuse});
        addTimer(rnd(15,22),()=>{s.fuse=false;readyNotice(`${s.id}: nieuwe zekeringen geplaatst – ${s.id}-T mag weer dicht (verlaag eerst de belasting!)`,s.id+'-T',()=>!D[s.id+'-T'].state);});}}
    else{s.trOt=Math.max(0,(s.trOt||0)-dm*0.5);if(k<0.95)s.trWarn=false;}});}
// zwaarst belaste netdelen voor het congestie-overzicht
function congestion(){const out=[];
  RING.secs.forEach(s=>{if(EN.has(s.node))out.push({t:`Kabel ${secName(s)}`,k:s.load});});
  RING.stations.forEach(s=>{if(EN.has(s.node))out.push({t:`Trafo ${s.id} ${s.name}`,k:s.trLoad||0});});
  TR.forEach(T=>{const t=D[T];if(EN.has(T+'h'))out.push({t:`Transformator ${T}`,k:t.S/(t.fans&&!t.fanFail?t.rAF:t.rON)});});
  return out.sort((a,b)=>b.k-a.k).slice(0,6);}
