
// ============================================================ simulatorbegeleiding (toets U): wat gebeurt er, waarom, en wat moet je doen
// Leest de toestand van de installatie (net als Lopende storingen) en geeft per situatie uitleg met stappen die zichzelf afvinken.
// Alleen uitleg: het verandert niets aan het spel en kost geen punten.
const COACH={on:false,shown:new Set()};
// eerste keer opgestart (nog geen keuze bewaard): begeleiding aan; daarna geldt wat de speler kiest. Niet in de testmodus.
try{const v=localStorage.getItem('osz-coach');if(v===null&&!LITE){COACH.on=true;localStorage.setItem('osz-coach','1');}else COACH.on=v==='1';}catch(e){}
const coachOk=()=>!MODES[GAME.mode]?.les;   // lessen hebben hun eigen uitleg
const railNm=b=>BUSES[b]?.nm||b;
const dsOn=id=>D[id]?.state===1;
// alle situaties die nu spelen, belangrijkste eerst
function coachCards(){const C=[],add=c=>C.push(c);
  // ---- railfout
  for(const b in BUSF){const nm=railNm(b),is10=!is20(b),other=is10?(b==='RA'?'RB':'RA'):(b==='RC'?'RD':'RC'),onm=railNm(other),K=is10?'V-K':'W-K';
    const bays=is10?Object.keys(SEL_BAYS).filter(x=>!['T1','T3'].includes(x)):[],q=is10?'Q'+nm:'',qo=is10?'Q'+onm:'';
    const fs=FEEDERS.filter(f=>f.bus===b||(is10&&f.sel&&dsOn(f.id+'-'+q)));
    add({key:'bf'+b,sev:'crit',title:`Railfout op ${is10?10:20} kV-rail ${nm}`,go:{tab:is10?'10':'20',dev:K},
      what:`Er is een kortsluiting op rail ${nm} zelf (bijvoorbeeld een overslag op een steunisolator). De railbeveiliging heeft in één keer alle velden van rail ${nm} uitgeschakeld${fs.length?`: ${fs.map(f=>f.id+' '+f.short).join(', ')}`:''}.`,
      why:`Een fout op de rail kan geen enkel veld wegschakelen: de hele rail moet spanningsloos. In SCADA zie je rail ${nm} rood gestippeld. Schakel je iets in op deze rail, dan komt de kortsluiting terug en schakelt de beveiliging opnieuw af (−40). De monteur zoekt en repareert de fout; dat duurt 40–65 minuten.`,
      steps:is10?[
        {t:`Houd de railkoppeling ${K} open, zodat rail ${onm} gezond blijft`,done:()=>!dsOn(K)},
        {t:`Zorg dat rail ${onm} spanning heeft (${onm==='A'?'T1 via V-T1':'reservetrafo T3 via V-T3'})`,done:()=>EN.has(other)},
        {t:`Zet de velden van rail ${nm} over naar rail ${onm}. Per veld: vermogenschakelaar UIT, ${q} open, ${qo} dicht, vermogenschakelaar IN`,done:()=>bays.every(x=>!dsOn(x+'-'+q))},
        {t:`Schakel de overgezette velden in, zodat de klanten weer stroom hebben`,done:()=>fs.every(f=>EN.has(f.node))},
        {t:`Wacht op de monteur (melding "rail ${nm} mag weer onder spanning")`,done:()=>!BUSF[b]}]
      :[{t:`Houd ${K} open`,done:()=>!dsOn(K)},
        {t:`Zorg dat rail ${onm} spanning heeft (${onm==='C1'?'T2 via W-T2':'T3 op 20 kV via W-T3'})`,done:()=>EN.has(other)},
        {t:`De velden van rail ${nm} blijven uit tot de reparatie; informeer de klanten (LS-venster, N) en wacht op de monteur`,done:()=>!BUSF[b]}]});}
  // ---- rail spanningsloos zonder railfout
  BUS_IDS.forEach(b=>{if(b==='MP'||BUSF[b]||EN.has(b))return;const nm=railNm(b),is10=!is20(b);
    if(!LINES.some(L=>SIM.lines[L].avail)||(is10?D.T1.blocked:D.T2.blocked))return;   // oorzaak staat al in de kaart van de lijn of de trafo
    add({key:'bd'+b,sev:'crit',title:`Rail ${nm} heeft geen spanning`,go:{tab:is10?'10':'20'},
      what:`Op rail ${nm} staat geen spanning, dus alle velden op deze rail zijn zonder stroom.`,
      why:`De voeding van deze rail is weggevallen: een transformator is afgeschakeld, een 110 kV-lijn is uitgevallen, of de koppeling staat open terwijl alleen de andere railhelft gevoed wordt.`,
      steps:[{t:is10?`Voed rail ${nm} via de koppeling V-K (als de andere rail gezond is) of met T3 via V-T3`:`Voed rail ${nm} via W-K, of met T3 op 20 kV via W-T3`,done:()=>EN.has(b)}]});});
  // ---- 110 kV-lijnen
  LINES.forEach(L=>{const ln=SIM.lines[L];if(ln.avail||ln.maint)return;const other=LINES.find(x=>x!==L),both=!SIM.lines[other].avail;
    add({key:'ln'+L,sev:'crit',title:`110 kV-lijn ${L} ${ln.name} is uitgevallen`,go:{tab:'10',dev:L+'-Q0'},
      what:`De lijn naar ${ln.name} geeft geen spanning (${ln.reason||'storing in het hoogspanningsnet'}).${both?' Beide lijnen zijn weg: het hele station is spanningsloos.':''}`,
      why:both?'Zonder 110 kV-voeding valt het hele station uit. Pas als TenneT een lijn terug heeft, kun je het station stap voor stap weer opbouwen.':`Het station draait nu op lijn ${other} alleen. Dat kan, maar een volgende storing op ${other} legt alles plat.`,
      steps:both?[{t:'Wacht op TenneT. Bouw daarna op: lijnveld IN, transformatoren IN, dan de velden één voor één (koude-lastopname!)',done:()=>LINES.some(x=>SIM.lines[x].avail)}]
        :[{t:`Controleer in het tabblad 10 kV of lijn ${other} de belasting aankan`,done:()=>true},{t:`Wacht op TenneT; de melding zegt wanneer ${L} terug is. Schakel dan het lijnveld weer in`,done:()=>ln.avail}]});});
  // ---- transformatoren
  TR.forEach(T=>{const t=D[T];if(t.blocked){const is2=T==='T2';
      add({key:'tr'+T,sev:'crit',title:`Transformator ${T} afgeschakeld (relais 86)`,go:{tab:is2?'20':'10',dev:T},
        what:`De beveiliging van ${T} heeft hem uitgeschakeld en geblokkeerd: ${t.blockText||'beveiliging aangesproken'}.`,
        why:`Na een trafotrip mag je hem niet zomaar weer inschakelen: eerst moet een monteur inspecteren of de olie afkoelen. Daarom blokkeert relais 86 het inschakelen tot de reset is vrijgegeven.`,
        steps:[{t:T==='T3'?'T3 is de reserve: zorg dat T1 en T2 hun rails voeden':`Neem de reservetrafo T3 in bedrijf: T3-Q0 IN en ${is2?'W-T3 (20 kV, T3 eerst omschakelen naar 20 kV als dat nodig is)':'V-T3 (10 kV)'}`,done:()=>is2?EN.has('RC')||EN.has('RD'):EN.has('RA')&&EN.has('RB')},
          {t:`Wacht op de melding dat ${T} gereset mag worden, en reset relais 86 in het paneel`,done:()=>!t.blocked}]});}
    else if(t.oil>95&&EN.has(T+'h'))add({key:'to'+T,sev:'warn',title:`${T} wordt te warm (${Math.round(t.oil)} °C)`,go:{tab:T==='T2'?'20':'10',dev:T},
      what:`De olietemperatuur van ${T} loopt op. Boven de grens schakelt de thermische beveiliging hem af.`,why:'De transformator draagt meer dan hij langdurig aankan, bijvoorbeeld tijdens de avondpiek of als hij het werk van een uitgevallen trafo overneemt.',
      steps:[{t:'Verlaag de belasting: neem T3 erbij, of zet flexibel vermogen in (C)',done:()=>t.oil<90}]});});
  // ---- aardfout
  if(EF.on){const r=efRails();add({key:'ef',sev:'crit',title:`Aardfout in het 10 kV-net (U0 ${efU0().toFixed(1).replace('.',',')} kV)`,go:{tab:'10'},
    what:`Eén fase heeft ergens contact met aarde. Het net blijft in bedrijf, maar de twee gezonde fasen staan op een te hoge spanning.`,
    why:'Het 10 kV-net is gecompenseerd (Petersenspoel), dus de beveiliging schakelt een enkele aardfout niet af. Blijft hij lang staan, dan kan elders een tweede aardfout ontstaan: dat is een kortsluiting.',
    steps:[{t:'Open V-K: daarna staat U0 alleen nog op de rail met de fout',done:()=>!dsOn('V-K')||r.length===1},
      {t:'Kijk naar de aanwijzingen ⏚ (veld en MS-stations) en schakel verdachte velden of ringdelen één voor één vrij tot U0 verdwijnt',done:()=>!EF.on},
      {t:'Lukt het binnen 30 minuten, dan levert dat punten op',done:()=>!EF.on}]});}
  // ---- MS-velden met een kabelfout
  FEEDERS.forEach(f=>{if(f.ring||!f.fault)return;const F=f.fault,srch=F.stage==='search';
    add({key:'ff'+f.id,sev:'crit',title:`Kabelfout in veld ${f.id} ${f.name}`,go:{tab:tabOfFeeder(f),dev:f.cb},
      what:srch?`De kabel naar ${f.name} heeft een kortsluiting gekregen; ${f.cb} is afgeschakeld. De storingsdienst zoekt de fout.`:`De fout is gevonden en weggeschakeld. ${f.cb} mag weer in; een deel van de klanten wacht nog op de reparatie.`,
      why:srch?'Zolang niet bekend is waar de fout zit, geeft inschakelen direct een nieuwe kortsluiting (−40).':'Het defecte kabelstuk is afgekoppeld, de rest van de kabel is gezond.',
      steps:[{t:'Wacht tot de storingsdienst meldt dat de fout is weggeschakeld',done:()=>!srch},{t:`Schakel ${f.cb} weer in`,done:()=>!srch&&dsOn(f.cb)},
        {t:'Optioneel: laat de foutplaats bepalen (kabeltablet G) voor een snellere reparatie',done:()=>!!F.spot?.known}]});});
  // ---- kabelfout in een 10 kV-ring
  RING.secs.forEach(s=>{if(!s.fault)return;const rg=s.ring,iso=isoSwitches(s),flagged=RING.stations.filter(x=>x.ring===rg&&x.flag).map(x=>x.id),nop=rg.nop,cbs=[FD(rg.from).cb,FD(rg.to).cb];
    add({key:'rs'+s.id,sev:'crit',title:`Kabelfout in de ring ${rg.name}`,go:{tab:'R'},
      what:`Een ringkabel heeft een kortsluiting; het voedende veld is afgeschakeld en de MS-stations op dat deel van de ring zitten zonder stroom.${s.located?` De storingsdienst heeft de fout gevonden: kabel ${secName(s)}.`:''}`,
      why:`De kortsluitverklikkers ⚑ (tabblad Ring) gaan aan bij elk station waar de kortsluitstroom langs is gekomen${flagged.length?`: nu ${flagged.join(', ')}`:''}. De fout zit dus voorbij het laatste station met een verklikker. Isoleer die kabel en voed de rest van beide kanten terug via het normaal-open punt.`,
      steps:[{t:s.located?`Isoleer de kabel ${secName(s)}: open ${iso.join(' en ')}`:'Isoleer de kabel achter het laatste station met een verklikker (lastscheiders aan beide kanten open)',done:()=>iso.every(id=>!dsOn(id))},
        {t:`Sluit het normaal-open punt ${nop}`,done:()=>dsOn(nop)||iso.includes(nop)},
        {t:`Schakel het voedende veld weer in (${cbs.join(' of ')})`,done:()=>rg.stations.every(x=>stationLive(x)||x.damaged||x.burn)},
        {t:'Optioneel: laat de foutplaats bepalen (kabeltablet G); de reparatie gaat dan veel sneller',done:()=>!!s.spot?.known}]});});
  // ---- MS-stations
  RING.stations.forEach(st=>{const go={tab:'R',dev:st.id};
    if(st.burn&&st.burn.phase!=='vervangen'){const nb=stNeighborSwitches(st);add({key:'br'+st.id,sev:'crit',title:`Trafobrand in ${st.id} ${st.name}`,go,
      what:'De distributietrafo brandt. Politie zet de omgeving af, de brandweer blust pas als alles spanningsloos is.',why:`${st.id} zelf is niet meer bedienbaar. Het station is pas veilig als ook de kabels ernaartoe geen spanning hebben; daarom schakel je bij de buren.`,
      steps:[{t:`Open ${nb.join(' en ')}`,done:()=>stIsolated(st)},{t:`Sluit het normaal-open punt ${st.ring.nop} om de rest van de ring terug te voeden`,done:()=>st.ring.stations.every(x=>x===st||stationLive(x))},
        {t:'Spanning pas terugzetten als de brandweer meldt dat het geblust is',done:()=>st.burn?.phase==='vervangen'}]});}
    else if(st.burn)add({key:'brv'+st.id,sev:'warn',title:`${st.id}: trafo wordt vervangen`,go,what:'De brand is geblust; de distributietrafo wordt vervangen.',why:`${st.id}-T kan pas weer dicht als de nieuwe trafo er staat.`,
      steps:[{t:'Voed de straten met een noodaggregaat of via een kabelkast (LS-venster, N)',done:()=>!!st.gs||st.groups.some(g=>g.backfed)},{t:`Sluit ${st.id}-T zodra de nieuwe trafo er staat`,done:()=>!st.burn}]});
    if(st.theft?.phase==='onveilig')add({key:'th'+st.id,sev:'warn',title:`Koperdiefstal in ${st.id}`,go,what:'Het aardingskoper is gestolen; het station is niet veilig.',why:'Zonder aarding mag niemand in het station schakelen: bij een fout kan de behuizing onder spanning komen.',
      steps:[{t:'Schakel niet lokaal en stuur geen LS-monteur; bedienen via SCADA mag wel',done:()=>true},{t:'Wacht tot de aarding hersteld is',done:()=>!st.theft}]});
    if(st.damaged)add({key:'sd'+st.id,sev:'crit',title:`${st.id} ${st.name} beschadigd`,go,what:`${st.damaged}: de schakelinstallatie is niet bedienbaar.`,why:'Je kunt het station alleen van buitenaf isoleren: bij de buurstations.',
      steps:[{t:'Isoleer het station vanaf de buren en voed de rest terug via het normaal-open punt',done:()=>st.ring.stations.every(x=>x===st||stationLive(x))},{t:'Stuur een noodaggregaat voor de klanten (N)',done:()=>!!st.gs||!!st.genset}]});
    if(st.fuse)add({key:'sf'+st.id,sev:'warn',title:`${st.id}: MS-zekeringen doorgeslagen`,go,what:'De distributietrafo was te lang overbelast; de zekeringen zijn doorgeslagen.',why:'Een trafo mag kort boven 100% belast worden, maar niet lang.',
      steps:[{t:'Wacht op de monteur met nieuwe zekeringen',done:()=>!st.fuse},{t:`Sluit daarna ${st.id}-T en zet zo nodig flex in om overbelasting te voorkomen`,done:()=>stationLive(st)}]});
    if(st.gs?.state==='trip')add({key:'gs'+st.id,sev:'crit',title:`Noodaggregaat ${st.id} uitgevallen`,go:{tab:'L'},what:'Het aggregaat was overbelast en is gestopt.',why:'Een aggregaat kan alle huizen aan, maar bedrijven of het laadplein erbij kan te veel zijn.',
      steps:[{t:'Schakel in het LS-venster (N) zware groepen af',done:()=>gsLoad(st)/gsCap()<1},{t:'Herstart het aggregaat',done:()=>st.gs?.state==='aan'}]});
    const hi=st.groups.filter(g=>g.U>U_MAX).length,lo=st.groups.filter(g=>g.U>0&&g.U<U_MIN).length;
    if(hi)add({key:'lh'+st.id,sev:'warn',title:`${st.id}: te hoge spanning in ${hi} straat${hi>1?'en':''}`,go:{tab:'L'},what:'Zonnepanelen leveren meer terug dan de straat afneemt; de spanning komt boven 253 V en omvormers schakelen af.',why:'De vaste trap van de distributietrafo staat te hoog voor zonnige middagen.',
      steps:[{t:`Verlaag de vaste trap in het LS-venster (N). Dat mag alleen spanningsloos: open ${st.id}-T (eventueel klanten via een kabelkast) of laat de monteur het doen`,done:()=>!st.groups.some(g=>g.U>U_MAX)}]});
    if(lo)add({key:'ll'+st.id,sev:'warn',title:`${st.id}: te lage spanning in ${lo} straat${lo>1?'en':''}`,go:{tab:'L'},what:'De spanning in de straat zakt onder 207 V.',why:'Hoge belasting (winteravond) of een te laag gezette vaste trap.',
      steps:[{t:'Zet de vaste trap een stand hoger (LS-venster, N) of verlaag de belasting',done:()=>!st.groups.some(g=>g.U>0&&g.U<U_MIN)}]});});
  // ---- LS-storing (niet in SCADA te zien)
  LVG.forEach(g=>{if(!g.lvf||g.lvf.theft||SIM.t-g.lvf.at<2)return;add({key:'lv'+g.id,sev:'warn',title:`Klachten over stroomuitval: ${g.name}`,go:{tab:'L'},
    what:'Klanten bellen dat ze geen stroom hebben, terwijl SCADA alles normaal toont.',why:'Een doorgebrande zekering in een laagspanningsveld zie je niet in SCADA: alleen klantmeldingen verraden hem. Het MS-station zelf heeft gewoon spanning.',
    steps:[{t:`Zoek op aan welk station deze straat hangt (hier: ${g.st.id}) en stuur een monteur (telefoon of LS-venster)`,done:()=>!g.lvf}]});});
  // ---- kabels te warm
  FEEDERS.forEach(f=>{if((f.temp||0)>CABLE.max)add({key:'ft'+f.id,sev:'warn',title:`Kabel ${f.cb} te warm (${Math.round(f.temp)} °C)`,go:{tab:'K'},what:'De kabel is langere tijd overbelast.',why:'Boven 90 °C veroudert de isolatie snel; vanaf 105 °C brandt de kabel door.',steps:[{t:'Verlaag de belasting met flexibel vermogen (C) of schakel een deel om',done:()=>(f.temp||0)<CABLE.warn}]});});
  RING.secs.forEach(s=>{if((s.temp||0)>CABLE.max)add({key:'rt'+s.id,sev:'warn',title:`Ringkabel ${secName(s)} te warm`,go:{tab:'K'},what:`${Math.round(s.temp)} °C: de kabel is te lang overbelast.`,why:'Meestal staat het normaal-open punt verkeerd na een storing, waardoor één kant van de ring alles draagt.',steps:[{t:'Verleg het normaal-open punt of zet flex in (C)',done:()=>(s.temp||0)<CABLE.warn}]});});
  // ---- graafwerk
  KLIC.jobs.forEach(j=>{if(j.marked||j.hit)return;add({key:'kl'+j.id,sev:'warn',title:`Graafwerk bij ${j.where}`,go:{klic:j.id},what:`${j.firm} gaat graven bij ${j.c.nr} (${j.state==='plan'?'vanaf '+fmtClock(j.start):'nu'}).`,why:'Zonder aangewezen kabels raakt de graafmachine de kabel in de helft van de gevallen: kortsluiting en klanten zonder stroom.',
    steps:[{t:'Laat de kabels aanwijzen (klik op de melding of in de kabeltablet)',done:()=>j.marked||j.order}]});});
  // ---- OS Meppel en grote incidenten
  if(!SIM.meppel.avail)add({key:'mp',sev:'warn',title:'Storing bij OS Meppel (Netbeheer Noord)',go:{tab:'M'},what:'Het station van de buurnetbeheerder heeft een storing; jouw velden in Meppel hebben geen spanning.',why:'Dit is niet jouw installatie: Netbeheer Noord herstelt het.',steps:[{t:'Wacht op Netbeheer Noord; zorg dat de koppeling MS5-K open blijft',done:()=>SIM.meppel.avail}]});
  if(INC.active)add({key:'inc',sev:'info',title:`Groot incident: ${INC.active.def.name}`,what:INC.active.def.desc,why:'Grote incidenten komen af en toe in de vrije dienst. Ze ruimen zichzelf op; volg de meldingen.',steps:[]});
  return C.sort((a,b)=>({crit:0,warn:1,info:2}[a.sev]-{crit:0,warn:1,info:2}[b.sev]));}
// als er niets speelt: wat je kunt doen
function coachIdle(){const tips=[];if(TASK)tips.push('Er staat een werkopdracht klaar (links). Volg de stappen of stel zelf een schakelbrief op voor bonuspunten.');
  tips.push('Kijk in het tabblad <b>Prognose</b> of er een piek aankomt die de transformatoren te zwaar belast; neem T3 op tijd bij of zet flex in (C).');
  tips.push('Kijk in <b>Onderhoud</b> (O) naar schakelaars met een slechte conditie en relais die lang niet getest zijn.');
  tips.push('Kabels met oude moffen geven vaker storing; op een spanningsloze kabel kun je ze preventief laten vervangen (kabeltablet G).');
  return `<div class="cc idle"><b>✓ Alles in orde</b><p>Er zijn geen storingen. Zodra er iets gebeurt, legt de begeleiding hier uit wat er aan de hand is en wat je kunt doen.</p><ul>${tips.map(t=>`<li>${t}</li>`).join('')}</ul></div>`;}
function coachHtml(){const cs=coachCards();
  return `<div class="cc-head" title="Sleep om te verplaatsen · dubbelklik zet terug · hoek rechtsonder: groter of kleiner"><b>🧭 Begeleiding</b><span>${cs.length?`${cs.length} situatie${cs.length>1?'s':''}`:'rustig'}</span><button class="mini" data-cc="close" title="Sluiten (U)">✕</button></div>`+(cs.length?cs.map(c=>{const st=c.steps.map(s=>({t:s.t,ok:!!s.done()})),first=st.findIndex(s=>!s.ok);
    return `<div class="cc ${c.sev}"><div class="cc-t"><b>${c.title}</b>${c.go?`<button class="mini" data-ccgo="${c.key}">Toon</button>`:''}</div>
      <p><span class="cc-l">Wat gebeurt er?</span> ${c.what}</p><p><span class="cc-l">Waarom?</span> ${c.why}</p>
      ${st.length?`<span class="cc-l">Wat moet je doen?</span><ol>${st.map((s,i)=>`<li class="${s.ok?'ok':i===first?'now':''}">${s.ok?'✓ ':''}${s.t}</li>`).join('')}</ol>`:''}</div>`;}).join(''):coachIdle());}
function renderCoach(){const el=$('#coach');if(!el)return;$('#coachBtn')?.classList.toggle('on',COACH.on);
  const cs=COACH.on||!coachOk()?null:coachCards(),n=cs?cs.filter(c=>c.sev==='crit').length:0;$('#coachBtn')?.classList.toggle('coach-new',!COACH.on&&n>0);
  if(!COACH.on||!coachOk()){el.classList.add('hidden');return;}el.classList.remove('hidden');const h=coachHtml();if(el._h!==h){const sc=el.scrollTop;el._h=h;el.innerHTML=h;el.scrollTop=sc;}if(!COACH.placed){COACH.placed=true;coachRestore();}}
function setCoach(on){COACH.on=on??!COACH.on;try{localStorage.setItem('osz-coach',COACH.on?'1':'0');}catch(e){}renderCoach();}
const coachOpen=()=>COACH.on&&coachOk();
// ---- verslepen (aan de kop) en vergroten/verkleinen (hoek rechtsonder); positie en grootte worden onthouden
function coachSaveBox(){const el=$('#coach');if(el.classList.contains('hidden'))return;const r=el.getBoundingClientRect();try{localStorage.setItem('osz-coachbox',JSON.stringify({x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}));}catch(e){}}
function coachClamp(){const el=$('#coach'),r=el.getBoundingClientRect();if(!r.width)return;const x=clamp(r.left,0,innerWidth-Math.min(r.width,120)),y=clamp(r.top,0,innerHeight-40);el.style.left=x+'px';el.style.top=y+'px';}
function coachRestore(){const el=$('#coach');let b=null;try{b=JSON.parse(localStorage.getItem('osz-coachbox')||'null');}catch(e){}
  if(b){el.style.left=b.x+'px';el.style.top=b.y+'px';el.style.width=b.w+'px';el.style.height=b.h+'px';}coachClamp();}
function coachReset(){const el=$('#coach');['left','top','width','height'].forEach(k=>el.style[k]='');try{localStorage.removeItem('osz-coachbox');}catch(e){}}
(()=>{const el=$('#coach');let drag=null;
  el.addEventListener('pointerdown',e=>{const h=e.target.closest('.cc-head');if(!h||e.target.closest('button'))return;const r=el.getBoundingClientRect();drag={dx:e.clientX-r.left,dy:e.clientY-r.top};el.classList.add('dragging');h.setPointerCapture?.(e.pointerId);e.preventDefault();});
  addEventListener('pointermove',e=>{if(!drag)return;el.style.left=clamp(e.clientX-drag.dx,0,innerWidth-120)+'px';el.style.top=clamp(e.clientY-drag.dy,0,innerHeight-40)+'px';});
  addEventListener('pointerup',()=>{if(!drag)return;drag=null;el.classList.remove('dragging');coachSaveBox();});
  el.addEventListener('dblclick',e=>{if(e.target.closest('.cc-head')&&!e.target.closest('button')){coachReset();coachClamp();}});
  // na vergroten of verkleinen met de hoek: grootte bewaren
  let t=0;new ResizeObserver(()=>{clearTimeout(t);t=setTimeout(coachSaveBox,300);}).observe(el);
  addEventListener('resize',coachClamp);})();
$('#coach').addEventListener('click',e=>{if(e.target.closest('[data-cc="close"]'))return setCoach(false);const b=e.target.closest('[data-ccgo]');if(!b)return;const c=coachCards().find(x=>x.key===b.dataset.ccgo);if(!c?.go)return;
  if(c.go.klic)return klicFocus(KLIC.jobs.find(j=>j.id===c.go.klic));setTab(c.go.tab);$('#scada').classList.remove('min');if(c.go.dev&&D[c.go.dev])selectDevice(c.go.dev);});
$('#coachBtn').addEventListener('click',()=>setCoach());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.ctrlKey||e.metaKey)return;if((e.key==='u'||e.key==='U')&&$('#intro').classList.contains('hidden'))setCoach();});
