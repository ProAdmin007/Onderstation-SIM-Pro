
// Netcongestie en flexibel vermogen: afnemers die tegen vergoeding hun vermogen tijdelijk terugregelen,
// en overbelastingsbeveiliging van de distributietransformatoren in de MS-stations
const FLEX_DEF=[
  {id:'MS4-G3',name:'Laadplein Zuiderveld',how:'slim laden: laadstroom begrenzen',max:0.7,eur:180},
  {id:'MS5-G1',name:'Transportbedrijf',how:'e-trucks later laden',max:0.6,eur:150},
  {id:'MS5-G2',name:'Koelhuis',how:'koeling 2 uur uitstellen',max:0.5,eur:120},
  {id:'MS8-G1',name:'Metaalbewerking Smit',how:'ovens terugregelen',max:0.3,eur:260},
  {id:'MS9-G1',name:'Distributiecentrum',how:'batterij ontladen',max:0.4,eur:200},
  {id:'F6',name:'Glastuinbouw Oost',how:'belichting dimmen',max:0.8,eur:90},
  {id:'G1',name:'Zonnepark De Hoeve',how:'omvormers terugregelen',max:0.8,eur:70,gen:true}];
const FLEX=FLEX_DEF.map(f=>({...f,c:CONS.find(c=>c.id===f.id),req:0,at:0}));
const FLEX_DELAY=2;   // minuten reactietijd van de aggregator
// distributietransformatoren: kleinste standaardmaat met marge boven de winterpiek (zo geeft een normale dienst geen congestie)
const KVA_SIZES=[1000,1600,2000,2500,3150,4000];
RING.stations.forEach(s=>{let pk=0;for(let h=0;h<24;h+=0.25)pk=Math.max(pk,s.groups.reduce((a,g)=>a+g.base*profile(g.kind,h)*(SEASONS.winter.load[g.kind]??1),0));
  s.peakMW=pk;s.kva=KVA_SIZES.find(k=>k*0.95/1000>=pk*1.25)||4000;D[s.id].label=`MS-station ${s.name} · 10/0,4 kV ${s.kva} kVA`;D[s.id+'-TR'].label=`Distributietransformator 10/0,4 kV · ${s.kva} kVA`;});
const trMW=s=>s.kva*0.95/1000;   // vermogen (MW) bij cos φ 0,95
// verzoek om vermogen terug te regelen (fractie van het maximum: 0 … 1)
function setFlex(id,frac){const f=FLEX.find(x=>x.id===id);if(!f)return;frac=clamp(frac,0,1);if(f.req===frac)return;f.req=frac;f.at=SIM.t+FLEX_DELAY;
  pushAlarm(frac?`Flex-verzoek: ${f.name} ${Math.round(frac*f.max*100)}% terugregelen (${f.how}) – actief over ±${FLEX_DELAY} min`:`Flex: ${f.name} vrijgegeven – weer normaal vermogen`,'op');renderFlex?.();}
const flexSaved=f=>{const c=f.c,k=c.cut||0;return k&&EN.has(c.node)?Math.abs(c.demand)/(1-k)*k:0;};   // MW die nu niet afgenomen of opgewekt wordt
function flexTick(dm){
  FLEX.forEach(f=>{const want=f.req*f.max;if((f.c.cut||0)!==want&&SIM.t>=f.at){f.c.cut=want;if(want)pushAlarm(`Flex actief: ${f.name} regelt ${fx1(flexSaved(f))} MW terug`,'ok');}
    const mw=flexSaved(f);if(mw>0){const eur=mw*f.eur*dm/60;GAME.stats.flexEur=(GAME.stats.flexEur||0)+eur;GAME.score-=eur/100;}});
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
