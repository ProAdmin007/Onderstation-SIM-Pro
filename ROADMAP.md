# 🗺️ Roadmap: architectuur en onderhoudbaarheid

De simulator groeit snel: 60+ bronbestanden, ruim 5.000 regels code en meer dan 100 tests. Nieuwe functies passen er goed in, dankzij de centrale registers (net, afnemers, scenario's, incidenten, lessen), de herbruikbare bouwstenen (wegrouting, voertuigen, monteurs, figuren, plaatsingscontrole) en het vangnet van modelcontrole, lint, tests en de spelende bot.

Een paar dingen maken uitbreiden wel lastiger dan nodig. Dit zijn de verbeteringen, op volgorde van nut.

| # | Onderwerp | Wat het oplost | Status |
|---|---|---|---|
| 1 | Opslaanbare timers | Dubbele levensloop van storingen en reparaties | ⏳ gepland |
| 2 | Inschrijven op de lussen | Hoofdlus en simulatiestap steeds met de hand aanpassen | ⏳ gepland |
| 3 | Leesbare code | Lange regels, commentaar dat code uitschakelt, onbekende vorm van de gegevens | 🔄 doorlopend |
| 4 | Exportlijst automatiseren | Handmatig bijgehouden lijst van ruim 200 namen voor de tests | ⏳ gepland |

---

## 1. Opslaanbare timers

**Probleem.** Geplande gebeurtenissen (storing gevonden, reparatie klaar, meetwagen, monteur ter plaatse) zijn nu losse `addTimer(minuten, functie)`-aanroepen. Een functie kun je niet opslaan. Daarom staat de levensloop van een storing twee keer in de code: één keer waar de storing ontstaat, en nog eens in `resumeTimers()` voor het hervatten van een opgeslagen spel. Die twee lopen makkelijk uit elkaar; de reparatietijden na hervatten weken bijvoorbeeld al af.

**Oplossing.** Een timersysteem met **benoemde, opslaanbare taken**:

- een taak is gegevens, geen functie: `{ soort: 'ringReparatie', sectie: 'K23', om: 812 }`;
- per soort één handler: `TIMERS.ringReparatie = ({ sectie }) => …`;
- opslaan is dan gewoon de lijst met taken bewaren, hervatten is de lijst terugzetten.

**Resultaat.** Eén plek per gebeurtenis, geen aparte hervatlogica meer, en opgeslagen spellen die precies verder gaan waar ze waren.

**Aanpak.** Begin met de kabelstoringen (ring en veld), daarna lijnen, trafo's en de LS-opdrachten. `resumeTimers()` krimpt per stap, tot hij weg kan.

## 2. Inschrijven op de lussen

**Probleem.** Elk nieuw onderdeel (stadsleven, storingsbusjes, kabeltablet, brand …) moet met de hand worden toegevoegd aan de hoofdlus (`08-main.js`), de simulatiestap (`04-7-simloop.js`) of `updateLife()`. Vergeet je dat, dan doet het onderdeel niets, en de volgorde staat verspreid over meerdere plekken.

**Oplossing.** Twee eenvoudige registers:

- `onFrame(naam, fn)` voor beeld en animatie (echte tijd);
- `onSim(naam, fn)` voor de simulatie (speltijd, ook tijdens doorspoelen).

De lussen roepen alles aan wat zich heeft ingeschreven, in een vaste en zichtbare volgorde.

**Resultaat.** Een nieuw onderdeel is één nieuw bestand dat zichzelf aanmeldt. De hoofdlus hoeft niet meer te worden aangepast.

## 3. Leesbare code

**Probleem.** De code is erg compact: honderden regels zijn langer dan 250 tekens. Dat is lastig lezen en reviewen, en een `//`-commentaar aan het eind van zo'n regel schakelt makkelijk de rest van de code uit (de lint vangt dat nu op). Ook is nergens beschreven welke velden een apparaat, afnemer, kabel of voertuig heeft.

**Aanpak (doorlopend, geen grote verbouwing):**

- **nieuwe code** met gewone regellengtes en één opdracht per regel;
- **bestaande code** alleen opknappen als je hem toch aanpast;
- **korte beschrijvingen** (JSDoc) van de belangrijkste gegevens: apparaat (`D`), afnemer (`FEEDERS`, `LVG`), kabel (`CABLES`), voertuig en figuur.

## 4. Exportlijst automatiseren

**Probleem.** De tests sturen het spel aan via `window.OS`, een met de hand bijgehouden lijst van ruim 200 namen. Een vergeten naam geeft pas een fout als een test hem nodig heeft.

**Oplossing.** De lijst automatisch laten opbouwen tijdens het bouwen: `build.ps1` verzamelt alle functies en registers op het hoogste niveau en zet die in `window.OS`. Optioneel alleen in een testbuild.

**Resultaat.** Geen vergeten exports meer, en de hoofdlus wordt korter.

---

*Zie ook de [README](README.md) voor wat de simulator nu kan en hoe je hem bouwt en test.*
