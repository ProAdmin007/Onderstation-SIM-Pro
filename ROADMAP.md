# 🗺️ Roadmap

De simulator richt zich nu vooral op **Onderhoud en Storingen Elektra (OSE)**: schakelen, storingen oplossen, monteurs aansturen en het onderhoud aan de installatie. Een netbeheerder (DSO) doet meer dan dat. **Asset Management (AM)** beslist over aansluitingen, uitbreiding van het net, vervangingen en het budget, en legt verantwoording af over de kwaliteit van het net.

Deze roadmap heeft zes sporen:

| Spoor | Waar het over gaat | Tijdschaal |
|---|---|---|
| **A. OSE** | de dienst: schakelen, storingen, monteurs, veiligheid, klanten | minuten tot uren |
| **B. AM** | het net op lange termijn: aanvragen, investeringen, budget, kwaliteit | maanden tot jaren |
| **C. Carrièremodus** | groeien van monteur via bedrijfsvoerder naar asset manager | meerdere jaren spelen |
| **D. Techniek** | de code makkelijk uitbreidbaar houden | doorlopend |
| **E. Opleiding en bereik** | trainen in groepen, eigen scenario's, meer spelers bereiken | per onderdeel |
| **F. Realisme voor monteurs en operators** | veilig werken in het veld en een meldkamer zoals in het echt | per onderdeel |

Spoor C bouwt op A en B; spoor F verdiept A; spoor D maakt A, B, C, E en F eenvoudiger. Binnen elk spoor staan de onderdelen op volgorde van nut.

## Overzicht

| # | Onderwerp | Spoor | Omvang | Status |
|---|---|---|---|---|
| A1 | Slimme meters: storingen en spanning per adres | OSE | klein | ⏳ gepland |
| A2 | Distributieautomatisering (FLISR) | OSE | middel | ⏳ gepland |
| A3 | Nieuwe storingen: nulbreuk, koperdiefstal, brandende trafo | OSE | klein | 🔄 deels klaar: koperdiefstal en trafobrand ✅, nulbreuk gepland |
| A4 | Werkvergunningen en rollen (BEI BHS en BEI LS) | OSE | middel | ⏳ gepland |
| A5 | Storingskaart en communicatie | OSE | klein | ⏳ gepland |
| B1 | Aansluitaanvragen en netuitbreiding | AM | groot | ⏳ gepland |
| B2 | Asset management met budget en risico | AM | groot | ⏳ gepland |
| B3 | Kwaliteitsregulering: SAIDI/SAIFI en compensatieregeling | AM | middel | ⏳ gepland |
| B4 | Energietransitie 2030 | AM | middel | ⏳ gepland |
| B5 | Spanningskwaliteit (EN 50160) | AM | middel | ⏳ gepland |
| C1 | Carrièremodus | beide | groot | ⏳ gepland |
| D1 | Opslaanbare timers | techniek | middel | ⏳ gepland |
| D2 | Inschrijven op de lussen | techniek | klein | ⏳ gepland |
| D3 | Leesbare code | techniek | doorlopend | 🔄 doorlopend |
| D4 | Exportlijst automatiseren | techniek | klein | ⏳ gepland |
| E1 | Opgeslagen spellen exporteren en importeren | opleiding | klein | ⏳ gepland |
| E2 | Instructeursmodus | opleiding | middel | ⏳ gepland |
| E3 | Scenario-editor | opleiding | middel | ⏳ gepland |
| E4 | Beoordeling met de begeleiding | opleiding | klein | ⏳ gepland |
| E5 | Tablet en telefoon | bereik | middel | ⏳ gepland |
| E6 | Engelse taal | bereik | middel | ⏳ gepland |
| F1 | De vijf veiligheidsregels zelf uitvoeren (spanningzoeker, draagbare aarde, LOTO) | monteur | middel | ⏳ gepland |
| F2 | Persoonlijke beschermingsmiddelen | monteur | klein | ⏳ gepland |
| F3 | Ter plaatse kijken en meten | monteur | middel | ⏳ gepland |
| F4 | Zekeringen vervangen met het juiste gereedschap | monteur | klein | ⏳ gepland |
| F5 | Sleutelvergrendelingen in MS-stations | monteur | klein | ⏳ gepland |
| F6 | Read-back in de communicatie | operator | klein | ⏳ gepland |
| F7 | Vier-ogenprincipe en bedrijfsvoeringslogboek | operator | middel | ⏳ gepland |
| F8 | Alarmbeheer: kwitteren, prioriteiten, alarmlawine | operator | middel | ⏳ gepland |
| F9 | Markeringen in SCADA en onbetrouwbare standen | operator | klein | ⏳ gepland |
| F10 | Wat-als-berekening en N-1-controle | operator | middel | ⏳ gepland |
| F11 | Beperkte ploegen en piketdienst | beide | middel | ⏳ gepland |
| F12 | Externe communicatie volgens protocol | operator | middel | ⏳ gepland |

---

## A. Onderhoud en Storingen Elektra (OSE)

Bouwt voort op wat er al is: SCADA, de 10 kV-ringen, laagspanning, monteurs met busjes, de kabeltablet en het graafwerk.

### A1. Slimme meters

LS-storingen komen nu alleen via de telefoon binnen. Met slimme meters krijg je een **"last gasp"-melding** zodra een straat zonder stroom valt, zichtbaar op de kabeltablet en in *Lopende storingen*. Ook de **spanning per adres** is af te lezen, wat helpt bij overspanning door zonnepanelen. De telefoon blijft voor wat de meters niet zien, zoals een enkele woning met een kapotte hoofdzekering.

### A2. Distributieautomatisering (FLISR)

Een deel van de MS-stations krijgt op afstand bedienbare schakelaars en kortsluitmelders in SCADA. Bij een kabelfout wordt de fout dan automatisch gevonden, geïsoleerd en teruggevoed (*Fault Location, Isolation and Service Restoration*), binnen een minuut in plaats van een half uur. Zonder automatisering blijft het handwerk zoals nu. Welke stations geautomatiseerd worden, is een AM-keuze (zie B2).

### A3. Nieuwe storingen

*Koperdiefstal en de brandende distributietrafo zijn klaar (zie de README); de nulbreuk volgt nog.*

- **Nulbreuk** in een LS-kabel: gevaarlijke over- en onderspanning bij klanten, kapotte apparaten en een melding met spoed. Snel afschakelen en de kabel repareren.
- **Koperdiefstal of vandalisme** in een MS-station: aarding weg, het station niet veilig te betreden tot de monteur het heeft hersteld.
- **Brandende distributietrafo**: brandweer, afschakelen, een noodaggregaat en een vervangende trafo.

### A4. Werkvergunningen en rollen

Volgens de BEI BHS en BEI LS (de bedrijfsvoeringsvoorschriften van de netbeheerders, op basis van NEN 3840 en NEN 3140) hoort bij elk werk een **werkverantwoordelijke** (de monteur ter plaatse) en een **installatieverantwoordelijke** (de bedrijfsvoerder). De schakelbrief wordt een echte werkvergunning:

- **vrijgave** met de genomen maatregelen;
- **aanwijzing** aan de werkploeg;
- **overdracht** bij een dienstwissel;
- **afmelding** van het werk.

Fouten in de volgorde zijn veiligheidsincidenten. Dit kan ook een les worden.

### A5. Storingskaart en communicatie

Een publieke storingskaart, zoals op de website van een netbeheerder, met het getroffen gebied en de verwachte hersteltijd. Die werk je zelf bij. Bij een grote storing komen er berichten van en voor de **gemeente** en de **pers**. Dit bouwt voort op de bestaande telefoon, het storingsbandje en de verwachte hersteltijd.

---

## B. Asset Management (AM)

Een nieuwe kant van het spel: niet de dienst van vandaag, maar het net van over vijf jaar. Hier ligt de basis voor de carrièremodus.

### B1. Aansluitaanvragen en netuitbreiding

Klanten vragen een (zwaardere) aansluiting aan: een laadplein, een wijk met warmtepompen, een zonneveld of een batterij. Per aanvraag:

- **capaciteitscheck** op kabel, distributietrafo, MS-ring en de 110/10 kV-trafo's (de bestaande belastingberekening);
- **keuze**:
  - **verzwaren** (een kabel of trafo vervangen, een extra MS-station of een nieuwe ring), met kosten en doorlooptijd;
  - **wachtrij**: de klant wacht tot er capaciteit is;
  - **non-firm contract**: aansluiten met een capaciteitsbeperking op piekmomenten, ingezet via de flexmarkt;
- **gevolgen**: een nieuwe aansluiting verschijnt echt in de wereld en in het net (afnemer, kabeltracé in de GIS-kaart), en verandert de belasting in de diensten daarna.

Dit is het meest actuele onderwerp voor netbeheerders, omdat netcongestie juist hier ontstaat.

### B2. Asset management met budget en risico

- **Jaarbudget** voor vervanging en onderhoud.
- **Risicoscore** per component: conditie × gevolg van uitval. Dat geldt voor kabels (papier-lood, moffen), schakelaars, transformatoren en relais, en sluit aan op de bestaande slijtage, moffen en relaistesten.
- **Keuzes**:
  - oude GPLK-kabels vervangen;
  - moffen preventief vervangen;
  - schakelaars reviseren;
  - stations automatiseren (A2).
- **Gevolg**: te weinig investeren geeft meer storingen in de diensten daarna; te veel geeft budgettekort.

### B3. Kwaliteitsregulering: SAIDI/SAIFI en compensatieregeling

- **Dashboard** met de echte kwaliteitscijfers, per dienst en per jaar: **SAIDI** (gemiddelde uitvalduur per klant), **SAIFI** (uitvalfrequentie) en **CAIDI** (gemiddelde hersteltijd).
- **Compensatieregeling**: na 4 uur uitval krijgen klanten een wettelijke vergoeding, die van het budget afgaat.
- **Gevolg**: de score wordt zo herkenbaar voor netbeheerders, en de kwaliteit van het net telt mee in de carrière.

### B4. Energietransitie 2030

Een instelling of scenario met veel **warmtepompen** (een hogere winterpiek), **thuisbatterijen** en **laadpalen** met dynamische tarieven, waardoor ze allemaal tegelijk laden op goedkope momenten. Dit test of het net uit B1 en B2 de toekomst aankan.

### B5. Spanningskwaliteit (EN 50160)

Klachten over flikkerende lampen, harmonischen (bijvoorbeeld door de assimilatiebelichting van de kassen) of spanningsdips. Je zet een **meetcampagne** op met meters in het net, beoordeelt de metingen tegen de norm en kiest een oplossing: een filter bij de klant, een andere netconfiguratie of verzwaren.

---

## C. Carrièremodus

Een spelmodus over meerdere jaren, waarin je groeit van monteur naar asset manager. Elke rol speelt een ander deel van de simulator.

| Rol | Wat je doet | Spoor |
|---|---|---|
| **Monteur** | ter plaatse: rondlopen, lokaal schakelen, relaistesten, graafwerk aanwijzen | OSE |
| **Bedrijfsvoerder** | diensten draaien: SCADA, storingen, monteurs aansturen | OSE |
| **Asset manager** | per kwartaal: aanvragen, investeringen, budget, kwaliteitscijfers | AM |

- **Opbouw:**
  - je begint met de lessen;
  - na goede diensten en de juiste certificaten (bijvoorbeeld de aanwijzingen **VOP**, **VP** en **AVP** volgens de BEI) word je bedrijfsvoerder;
  - later word je asset manager.
- **Een levend net:**
  - beslissingen als asset manager bepalen het net waarin je als bedrijfsvoerder de diensten speelt;
  - storingen in die diensten komen weer terug in de risicoscores.
- **Tijd:** een kalender met seizoenen. Diensten zijn de dagen, AM-beslissingen de kwartalen of jaren. De wijk groeit met nieuwe aansluitingen (B1).
- **Profiel:**
  - een loopbaan met certificaten, beoordelingen en badges, die apart van de gewone opslagplekken bewaard wordt;
  - het dienstrapport (PDF) wordt een **opleidingsdossier**.
- **Nodig:** B1, B2 en B3 als basis; D1 (opslaanbare timers) om een loopbaan van jaren betrouwbaar te bewaren.

---

## D. Techniek

Nieuwe functies passen er al goed in, dankzij de centrale registers (net, afnemers, scenario's, incidenten, lessen), de herbruikbare bouwstenen (wegrouting, voertuigen, monteurs, figuren, plaatsingscontrole) en het vangnet van modelcontrole, lint, tests en de spelende bot. Een paar dingen maken uitbreiden wel lastiger dan nodig.

### D1. Opslaanbare timers

**Probleem.** Geplande gebeurtenissen (storing gevonden, reparatie klaar, meetwagen, monteur ter plaatse) zijn nu losse `addTimer(minuten, functie)`-aanroepen. Een functie kun je niet opslaan. Daarom staat de levensloop van een storing twee keer in de code: één keer waar de storing ontstaat, en nog eens in `resumeTimers()` voor het hervatten van een opgeslagen spel. Die twee lopen makkelijk uit elkaar; de reparatietijden na hervatten weken bijvoorbeeld al af.

**Oplossing.** Een timersysteem met **benoemde, opslaanbare taken**:

- een taak is gegevens, geen functie: `{ soort: 'ringReparatie', sectie: 'K23', om: 812 }`;
- per soort één handler: `TIMERS.ringReparatie = ({ sectie }) => …`;
- opslaan is dan gewoon de lijst met taken bewaren, hervatten is de lijst terugzetten.

**Resultaat.** Eén plek per gebeurtenis, geen aparte hervatlogica meer, en opgeslagen spellen die precies verder gaan waar ze waren. Nodig voor de carrièremodus.

**Aanpak.** Begin met de kabelstoringen (ring en veld), daarna lijnen, trafo's en de LS-opdrachten. `resumeTimers()` krimpt per stap, tot hij weg kan.

**Risico's (middel).** Dit raakt het hart van de storingsafhandeling.

- *Ander gedrag*: reparatietijden of de volgorde van meldingen kunnen ongemerkt veranderen. Vangnet: de tests met vaste seeds, de scenariobot en de balansrun (`BALANCE=1`) vóór en na vergelijken.
- *Oude opgeslagen spellen*: die hebben nog geen takenlijst. Nodig: `SAVE_V` naar 3 met een omzetting in `SAVE_MIGRATE` die de taken afleidt uit de opgeslagen toestand (zoals `resumeTimers()` nu doet), plus een test die een versie-2-spel hervat.
- *Twee systemen tegelijk*: tijdens de overgang bestaan losse `addTimer`-aanroepen en benoemde taken naast elkaar. Daarom per storingssoort in één keer omzetten, en alleen beeld- en geluidseffecten als losse timer laten.
- *Herhaling (replay)*: die zet de toestand terug uit momentopnamen; geplande taken moeten daar buiten blijven.

### D2. Inschrijven op de lussen

**Probleem.** Elk nieuw onderdeel (stadsleven, storingsbusjes, kabeltablet, brand …) moet met de hand worden toegevoegd aan de hoofdlus (`08-main.js`), de simulatiestap (`04-7-simloop.js`) of `updateLife()`. Vergeet je dat, dan doet het onderdeel niets, en de volgorde staat verspreid over meerdere plekken.

**Oplossing.** Twee eenvoudige registers:

- `onFrame(naam, fn)` voor beeld en animatie (echte tijd);
- `onSim(naam, fn)` voor de simulatie (speltijd, ook tijdens doorspoelen).

De lussen roepen alles aan wat zich heeft ingeschreven, in een vaste en zichtbare volgorde.

**Resultaat.** Een nieuw onderdeel is één nieuw bestand dat zichzelf aanmeldt. De hoofdlus hoeft niet meer te worden aangepast.

**Risico's (laag).**

- *Volgorde*: sommige onderdelen hangen van elkaar af, bijvoorbeeld eerst `computeFlows()` en dan pas de beveiliging, of eerst de toestand en dan het beeld. Een expliciete volgorde per inschrijving (`onSim('beveiliging', fn, {na: 'stroom'})` of een nummer) voorkomt verrassingen.
- *Fout in één onderdeel*: die mag de rest niet stilzetten. De lus vangt per onderdeel fouten af en meldt welk onderdeel faalde (zoals de hoofdlus nu al doet).
- *Doorspoelen en testmodus*: onderdelen moeten aangeven of ze in de simulatietijd draaien (ook tijdens doorspoelen) of alleen in echte tijd (beeld).

### D3. Leesbare code

**Probleem.** De code is erg compact: honderden regels zijn langer dan 250 tekens. Dat is lastig lezen en reviewen, en een `//`-commentaar aan het eind van zo'n regel schakelt makkelijk de rest van de code uit (de lint vangt dat nu op). Ook is nergens beschreven welke velden een apparaat, afnemer, kabel of voertuig heeft.

**Aanpak (doorlopend, geen grote verbouwing):**

- **nieuwe code** met gewone regellengtes en één opdracht per regel;
- **bestaande code** alleen opknappen als je hem toch aanpast;
- **korte beschrijvingen** (JSDoc) van de belangrijkste gegevens: apparaat (`D`), afnemer (`FEEDERS`, `LVG`), kabel (`CABLES`), voertuig en figuur.

### D4. Exportlijst automatiseren

**Probleem.** De tests sturen het spel aan via `window.OS`, een met de hand bijgehouden lijst van ruim 200 namen. Een vergeten naam geeft pas een fout als een test hem nodig heeft.

**Oplossing.** De lijst automatisch laten opbouwen tijdens het bouwen: `build.ps1` verzamelt alle functies en registers op het hoogste niveau en zet die in `window.OS`. Optioneel alleen in een testbuild.

**Resultaat.** Geen vergeten exports meer, en de hoofdlus wordt korter.

---

## E. Opleiding en bereik

### E1. Opgeslagen spellen exporteren en importeren

Opgeslagen spellen, highscores en instellingen staan nu alleen in de browser (localStorage). *Browsergegevens wissen* maakt alles weg, en een andere browser of computer ziet ze niet. Met **exporteren** sla je alles op als één bestand; met **importeren** zet je het terug, ook op een andere computer. Handig als back-up en om een spel aan een instructeur te geven.

### E2. Instructeursmodus

Voor groepstrainingen. De trainer heeft een eigen paneel om tijdens een dienst **storingen klaar te zetten of direct te starten** (een railfout op B, een kabelfout tussen MS2 en MS3, een trafotrip), het weer te veranderen en te pauzeren. Achteraf bespreek je samen de tijdlijn en de herhaling. Bouwt voort op de bestaande storingsfuncties en de begeleiding.

### E3. Scenario-editor

Zelf scenario's maken zonder code: een begintoestand (seizoen, tijd, weer, afwijkingen), storingen op vaste tijdstippen en doelen ("ziekenhuis binnen 15 minuten terug"). Opslaan als bestand en delen met collega's.

### E4. Beoordeling met de begeleiding

Het dienstrapport laat per storing zien welke stappen van de begeleiding je deed, in welke volgorde en hoe snel, en waar je afweek. Een goede aanvulling op de leermomenten die er nu al zijn.

### E5. Tablet en telefoon

Aanraakbediening (slepen, knijpen om te zoomen, tikken om te schakelen) en een indeling voor kleine schermen, met inklapbare panelen en SCADA op volledig scherm.

### E6. Engelse taal

De interface, meldingen, lessen en begeleiding vertalen, met een taalkeuze in de instellingen. Vraagt eerst dat alle teksten op één plek komen te staan.

---

## F. Realisme voor monteurs en operators

Nu schakel je met één klik en gaan veiligheid en communicatie grotendeels vanzelf. In het echt zitten daar juist de leermomenten. Dit spoor maakt het werk van de monteur (in het veld, met rondlopen) en de operator (in de meldkamer, met SCADA) realistischer. Het sluit aan op de werkvergunningen en rollen (A4).

**Aanraders om mee te beginnen:** F1 en F6 (de kern van veilig werken volgens de BEI BHS en BEI LS), F8 (herkenbaar voor bedrijfsvoerders) en F11 (prioriteren bij drukte).

### Monteurs

#### F1. De vijf veiligheidsregels zelf uitvoeren

Nu sluit je alleen een aardschakelaar. Bij het vrijschakelen voert de monteur de regels echt uit, in het station (rondlopen) of via de portofoon:

1. **vrijschakelen**;
2. **beveiligen tegen herinschakelen**: eigen hangslot op de bediening en een bord *Niet schakelen – er wordt gewerkt* (LOTO);
3. **spanningsloosheid vaststellen** met een spanningzoeker, eerst testen op een bekend spanningvoerend deel;
4. **aarden en kortsluiten**: aardschakelaar of draagbare aarde (aardgarnituur);
5. **afschermen** van naastgelegen delen die onder spanning blijven.

Een overgeslagen of verkeerd uitgevoerde stap is een veiligheidsincident. Ook het opheffen gaat in omgekeerde volgorde: slot eraf mag pas als iedereen zich heeft afgemeld.

#### F2. Persoonlijke beschermingsmiddelen

Voor het schakelen in een MS-ruimte: boogvlambestendige kleding, gelaatsscherm en handschoenen. In het eerste-persoonsbeeld zie je het vizier. Zonder PBM schakelen bij een vlamboog is een ernstig incident.

#### F3. Ter plaatse kijken en meten

- kortsluitverklikkers zelf aflezen en terugzetten in het MS-station;
- in een kabelkast of aansluitkast met een meetinstrument zoeken naar een doorgebrande LS-zekering;
- de fasevolgorde (draaiveld) controleren voordat je een kabelkast sluit tussen twee stations.

#### F4. Zekeringen vervangen met het juiste gereedschap

MS-zekeringen in de RMU wisselen met een isolerende zekeringtang (alleen spanningsloos); NH-zekeringen in het LS-rek met een NH-greep met manchet. Verkeerde waarde (te groot) kiezen geeft later een probleem.

#### F5. Sleutelvergrendelingen in MS-stations

Zoals in het echt: de sleutel van de aardschakelaar komt pas vrij als de lastscheider open staat, en de deur van het trafovak pas als de trafo geaard is. De monteur moet de volgorde volgen.

### Operators (bedrijfsvoerders)

#### F6. Read-back in de communicatie

Elke schakelopdracht via de portofoon of telefoon wordt door de monteur herhaald ("Ik herhaal: MS3-R open") en door de operator bevestigd. Af en toe herhaalt de monteur iets verkeerd (ander station, open in plaats van dicht): dat moet je opmerken en corrigeren, anders gebeurt de verkeerde handeling.

#### F7. Vier-ogenprincipe en bedrijfsvoeringslogboek

Een schakelprogramma wordt door een tweede bedrijfsvoerder gecontroleerd voordat het wordt uitgevoerd. Elke uitgevoerde stap krijgt een tijdstempel en de naam van wie hem deed in een **bedrijfsvoeringslogboek**, dat ook bij de dienstoverdracht hoort.

#### F8. Alarmbeheer: kwitteren, prioriteiten, alarmlawine

- meldingen met **prioriteit 1–3** en **kwitteren** (bevestigen dat je ze gezien hebt);
- bij een grote storing een **alarmlawine** van tientallen gevolgmeldingen, waartussen je de oorzaak moet vinden;
- **klapperende meldingen** (die steeds aan en uit gaan) tijdelijk onderdrukken;
- een overzicht van niet-gekwitteerde meldingen bij de overdracht.

#### F9. Markeringen in SCADA en onbetrouwbare standen

Velden markeren als *in werkzaamheden*, *geaard* of *niet schakelen*, met een vergrendeling in SCADA zelf. Valt de communicatie met een station weg, dan toont SCADA een vraagteken in plaats van een stand en mag je niet op die waarde vertrouwen.

#### F10. Wat-als-berekening en N-1-controle

Voordat je schakelt, rekent SCADA de nieuwe belasting voor ("als je MS7-R sluit, wordt K67 110% belast"). Daarnaast een continue **N-1-controle**: wat gebeurt er als nu het zwakste onderdeel uitvalt?

#### F11. Beperkte ploegen en piketdienst

Er zijn maar 2–3 storingsploegen. Overdag zijn ze snel ter plaatse; 's nachts moet de piketdienst eerst van huis komen. Bij meerdere storingen tegelijk moet je kiezen wie waarheen gaat, en sommige klanten wachten langer.

#### F12. Externe communicatie volgens protocol

Gesprekken met **TenneT** (110 kV), **Netbeheer Noord** (OS Meppel), de **gemeente** en de **brandweer** volgens vaste afspraken: wie belt wie, wat moet je melden, welke toestemming heb je nodig. Afspraken niet nakomen heeft gevolgen.

---

*Zie ook de [README](README.md) voor wat de simulator nu kan en hoe je hem bouwt en test.*
