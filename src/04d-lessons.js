
// ============================================================ leerscenario's: begeleide lessen met uitleg
// stap: t (titel), txt (uitleg), hl (schakelaars die knipperen), next (alleen lezen → knop Verder),
//       check (klaar als true), act/acts (de handeling, ook voor de tests), auto (handeling buiten het schakelen), enter (bij het begin van de stap)
const lsec=id=>RING.secs.find(s=>s.id===id);
const LESSONS={
  les1:{name:'Les 1 · Bediening en SCADA',tag:'Leren · basis',start:10,desc:'Leer het scherm kennen: schakelaars selecteren, een veld uit- en inschakelen en wat klantminuten zijn.',steps:[
    {t:'Welkom in de schakelruimte',next:true,txt:'Rechts zie je het <b>SCADA-schema</b> met de tabbladen 10 kV, 20 kV en Ring. Links staan je opdrachten, daaronder de <b>meldingen</b>. Bovenin zie je klokje, snelheid, klanten zonder stroom en je score.<br><br>In het schema is een <b>rood blokje</b> een gesloten vermogenschakelaar (IN) en een <b>groen omlijnd blokje</b> een open schakelaar. Grijze lijnen zijn spanningsloos.'},
    {t:'Selecteer veld V-F6',hl:['V-F6'],enter:()=>setTab('10'),auto:()=>selectDevice('V-F6'),check:()=>SEL==='V-F6',txt:'Klik in het tabblad <b>10 kV</b> op het knipperende blokje van <b>F6 Kassen</b> (rechtsonder). Je kunt ook in 3D op het veld klikken. Er opent een paneel met alle meetwaarden.'},
    {t:'Schakel V-F6 UIT',hl:['V-F6'],act:['V-F6',0],check:()=>D['V-F6'].state===0,txt:'Druk in het paneel op <b>UIT</b>. Kijk wat er gebeurt: de kabel naar de kassen wordt grijs, je hoort de schakelaar en er komt een melding binnen.'},
    {t:'Klantminuten',next:true,txt:'Bovenin lopen <b>klanten zonder stroom</b> en <b>klantminuten (CML)</b> op. Elke minuut dat een klant zonder stroom zit kost punten. Bij een storing is snel en veilig herstel dus belangrijk.'},
    {t:'Schakel V-F6 weer IN',hl:['V-F6'],act:['V-F6',1],check:()=>D['V-F6'].state===1&&EN.has('F6'),txt:'Druk op <b>IN</b>. Een vermogenschakelaar heeft een <b>inschakelveer</b> die na het inschakelen ±7 s laadt; pas daarna kan hij opnieuw inschakelen.'},
    {t:'Klaar!',next:true,txt:'Handig om te weten: toetsen <b>1–9</b> wisselen van camera, <b>V</b> laat je rondlopen, <b>B</b> opent de beveiligingsinstellingen en <b>Esc</b> het menu. Op naar les 2!'}]},
  les2:{name:'Les 2 · Vrijschakelen en aarden',tag:'Leren · veiligheid',start:10,desc:'De vijf veiligheidsregels in de praktijk: een kabel vrijschakelen, spanningsloos vaststellen en aarden.',steps:[
    {t:'De vijf veiligheidsregels',next:true,txt:'Voordat er aan een kabel gewerkt mag worden: <b>1</b> vrijschakelen, <b>2</b> beveiligen tegen herinschakelen, <b>3</b> spanningsloosheid vaststellen, <b>4</b> aarden en kortsluiten, <b>5</b> afschermen van naastgelegen delen. We oefenen dit op de kabel naar de kassen (F6).'},
    {t:'Vrijschakelen: V-F6 UIT',hl:['V-F6'],act:['V-F6',0],enter:()=>{setTab('10');selectDevice('V-F6');},check:()=>D['V-F6'].state===0,txt:'Schakel <b>V-F6 UIT</b>. Alleen een vermogenschakelaar kan belastingstroom veilig onderbreken.'},
    {t:'Spanningsloos vaststellen',hl:['F6-Q8'],auto:()=>selectDevice('F6-Q8'),check:()=>SEL==='F6-Q8',txt:'Klik op de knipperende <b>aardschakelaar F6-Q8</b> (onder het veld, of via de knop in het paneel). Kijk naar <b>Spanning kabelzijde</b>: 0 kV. De vergrendeling meldt <b>vrij</b>.'},
    {t:'Aarden: sluit F6-Q8',hl:['F6-Q8'],act:['F6-Q8',1],check:()=>D['F6-Q8'].state===1,txt:'Druk op <b>SLUITEN</b>. De kabel kleurt geel: hij is geaard en kortgesloten. Nu mag de kabelploeg aan het werk.'},
    {t:'De vergrendeling beschermt je',next:true,txt:'Probeer gerust <b>V-F6</b> nu IN te schakelen: de vergrendeling weigert dat (inschakelen op een geaard deel). Met de vergrendelingen uit zou dit een kortsluiting en een veiligheidsincident geven.'},
    {t:'Werk klaar: open F6-Q8',hl:['F6-Q8'],act:['F6-Q8',0],enter:()=>selectDevice('F6-Q8'),check:()=>D['F6-Q8'].state===0,txt:'Terug in omgekeerde volgorde: eerst de <b>aarding opheffen</b>. Open F6-Q8.'},
    {t:'Schakel V-F6 IN',hl:['V-F6'],act:['V-F6',1],check:()=>D['V-F6'].state===1&&EN.has('F6'),txt:'Als laatste het veld weer inschakelen. De kassen hebben weer stroom.'}]},
  les3:{name:'Les 3 · Kabelfout in de ring',tag:'Leren · storing',start:11,desc:'Lees de kortsluitverklikkers, isoleer de kapotte kabel en voed de rest terug via het normaal-open punt.',steps:[
    {t:'Kabelfout!',next:true,enter:()=>{ringFault(FEEDERS.find(f=>f.id==='F3'),lsec('K23'),999);setTab('R');},txt:'<b>V-F3</b> is afgeschakeld: kabelfout in de ring van de woonwijk. MS1, MS2 en MS3 zitten zonder stroom.<br><br>Op het tabblad <b>Ring</b> zie je bij MS1 en MS2 een <b>⚑ kortsluitverklikker</b>: daar liep de foutstroom doorheen. De fout zit dus <b>na het laatste station met een vlag</b>: in de kabel MS2 – MS3.'},
    {t:'Isoleer de kabel MS2 – MS3',hl:['MS2-R','MS3-L'],acts:[['MS2-R',0],['MS3-L',0]],check:()=>D['MS2-R'].state===0&&D['MS3-L'].state===0,txt:'Open de lastscheiders aan beide kanten van de kapotte kabel: <b>MS2-R</b> en <b>MS3-L</b>. Klik op een station in het ringschema voor al zijn schakelaars.'},
    {t:'Voed MS1 en MS2 weer',hl:['V-F3'],act:['V-F3',1],check:()=>D['V-F3'].state===1&&EN.has('M2'),txt:'De fout zit nu niet meer achter V-F3. Schakel <b>V-F3 IN</b>: MS1 en MS2 krijgen weer stroom.'},
    {t:'Voed MS3 terug',hl:['MS3-R'],act:['MS3-R',1],check:()=>EN.has('M3'),txt:'MS3 zit nog zonder stroom. Sluit het <b>normaal-open punt MS3-R</b>: MS3 wordt dan van de andere kant gevoed, via V-F4 en MS5 en MS4.'},
    {t:'Iedereen heeft weer stroom',next:true,txt:'Goed gedaan! In het echt graaft de storingsdienst nu de kabel op en repareert hem. Dat slaan we in deze les over.'},
    {t:'Normaliseer de ring',hl:['MS2-R','MS3-L'],acts:[['MS2-R',1],['MS3-L',1]],enter:()=>{const s=lsec('K23');s.fault=false;s.located=false;RING.stations.forEach(x=>x.flag=false);pushAlarm('Storingsdienst: kabel MS2 – MS3 gerepareerd','ok');},
      check:()=>D['MS2-R'].state===1&&D['MS3-L'].state===1,txt:'De kabel is gerepareerd. Neem hem weer in bedrijf: sluit <b>MS2-R</b> en <b>MS3-L</b>. De ring is nu even helemaal gesloten.'},
    {t:'Open het normaal-open punt',hl:['MS3-R'],act:['MS3-R',0],check:()=>D['MS3-R'].state===0,txt:'Open <b>MS3-R</b> weer. Een ring wordt open bedreven, zodat een kabelfout maar de helft van de ring raakt.'}]},
  les4:{name:'Les 4 · Reservetransformator T3',tag:'Leren · transformatoren',start:10,desc:'T2 valt uit. Schakel reservetrafo T3 om naar 20 kV en voed beide 20 kV-railhelften.',steps:[
    {t:'T2 valt uit',next:true,enter:()=>{trafoFault('T2');setTab('20');},txt:'De <b>beveiliging van T2</b> heeft aangesproken en blokkeerrelais <b>86</b> houdt hem uit. Rail <b>C1</b> en <b>C2</b> (20 kV) zijn spanningsloos.<br><br>Reservetrafo <b>T3</b> staat op 10 kV en moet om naar 20 kV. Dat kan alleen <b>spanningsloos</b>.'},
    {t:'Schakel T3-Q0 UIT',hl:['T3-Q0'],act:['T3-Q0',0],check:()=>D['T3-Q0'].state===0,txt:'Maak T3 spanningsloos: schakel <b>T3-Q0</b> (110 kV-kant) UIT.'},
    {t:'Omschakelen naar 20 kV',hl:['T3'],auto:()=>setRatio('20'),check:()=>D.T3.ratio==='20',txt:'Klik op <b>T3</b> en kies <b>Omschakelen → 20 kV</b>. De omschakelaar draait ongeveer 3 seconden.'},
    {t:'Zet T3 onder spanning',hl:['T3-Q0'],act:['T3-Q0',1],check:()=>D['T3-Q0'].state===1&&EN.has('T3h'),txt:'Schakel <b>T3-Q0</b> weer IN. Je hoort de inschakelstroom (inrush) van de transformator.'},
    {t:'Voed de 20 kV-rails',hl:['W-T3'],act:['W-T3',1],check:()=>EN.has('RC')&&EN.has('RD'),txt:'Schakel <b>W-T3 IN</b>: T3 voedt rail <b>C2</b>. Via de gesloten railkoppeling <b>W-K</b> krijgt ook rail C1 weer spanning.'},
    {t:'Klaar!',next:true,txt:'Let op de belasting van T3 (25 MVA). Na de inspectie kun je het blokkeerrelais van T2 resetten en T2 weer in bedrijf nemen. Stond T3 al op 10 kV in bedrijf voor rail B? Dan moet je kiezen: dat is het echte werk van een operator.'}]},
  les5:{name:'Les 5 · Spanningsregeling',tag:'Leren · spanning',start:10,desc:'Bedien de trappenschakelaar van T1 met de hand en laat daarna de automatische regelaar het overnemen.',steps:[
    {t:'De trappenschakelaar',next:true,enter:()=>{setTab('10');selectDevice('T1');},txt:'Een transformator heeft een <b>trappenschakelaar</b> met 17 standen. Elke stap verandert de spanning ±1,25%. De automatische regelaar (<b>AVR</b>) houdt rail A en B zo tussen 10 en 11 kV, ook als de belasting verandert.'},
    {t:'Zet de regelaar op HAND',hl:['T1'],auto:()=>setAVR('T1','hand'),check:()=>D.T1.avr==='hand',txt:'Klik op <b>T1</b> en druk op <b>AUTO → HAND</b>.'},
    {t:'Twee trappen hoger',hl:['T1'],enter:()=>{GAME.lesson.tap0=D.T1.tap;},auto:()=>{if(!D.T1.tapBusy)tapStep('T1',1);},check:()=>D.T1.tap>=GAME.lesson.tap0+2,txt:'Druk twee keer op <b>▲ trap</b>. Kijk naar de meting bij <b>rail A</b> in het schema: de spanning stijgt.'},
    {t:'Spanningsband',next:true,txt:'Kom je buiten de band van 10–11 kV, dan krijg je na 2 minuten een melding en strafpunten. Werken twee transformatoren parallel met verschillende trappen, dan gaat er een <b>circulatiestroom</b> lopen.'},
    {t:'Terug naar AUTO',hl:['T1'],auto:()=>setAVR('T1','auto'),check:()=>D.T1.avr==='auto',txt:'Druk op <b>HAND → AUTO</b>.'},
    {t:'De regelaar werkt',check:()=>Math.abs(D.T1.Ulv-10.5)<0.13&&!D.T1.tapBusy,txt:'Wacht even: de AVR zet de trappen vanzelf terug tot de spanning weer rond <b>10,5 kV</b> ligt.'}]},
};
Object.entries(LESSONS).forEach(([id,l])=>{MODES[id]={scen:true,les:true,name:l.name,tag:l.tag,start:l.start,season:'herfst',weather:'bewolkt',desc:l.desc,
  setup(){GAME.lesson={id,i:-1,steps:l.steps,done:false};pushAlarm(`${l.name} gestart – volg de stappen links`,'info');lessonGo();},
  obj:()=>[{t:'Les afgerond',check:()=>GAME.lesson&&GAME.lesson.done?'done':null}]};});
function lessonGo(){const L=GAME.lesson;L.i++;
  if(L.i>=L.steps.length){L.done=true;award(50,'Les afgerond');pushAlarm(`${LESSONS[L.id].name} afgerond!`,'ok');AudioSys.chime();addTimer(1,()=>endGame());renderTasks();return;}
  const s=L.steps[L.i];s.enter&&s.enter();(s.hl||[]).forEach(id=>READY.set(id,()=>GAME.lesson&&GAME.lesson.steps[GAME.lesson.i]===s));AudioSys.ready();refreshAll();renderTasks();}
function lessonTick(){const L=GAME.lesson;if(!L||L.done||L.i<0)return;const s=L.steps[L.i];if(!s.next&&s.check&&s.check()){award(10,'Lesstap');lessonGo();}}
function lessonPanel(){const L=GAME.lesson,s=L.steps[Math.min(L.i,L.steps.length-1)];
  return `<div class="les"><div class="les-n">${LESSONS[L.id].name} · stap ${Math.min(L.i+1,L.steps.length)} van ${L.steps.length}</div><div class="les-bar"><i style="width:${Math.round(L.i/L.steps.length*100)}%"></i></div>
    ${L.done?'<h3>Les afgerond ✓</h3>':`<h3>${s.t}</h3><div class="les-txt">${s.txt}</div>${s.next?'<button class="primary les-next" data-lnext>Verder →</button>':`<div class="les-wait">▶ Voer de handeling uit${s.hl?' – de schakelaar knippert groen':''}…</div>`}`}</div>`;}
