# Technische documentatie · Onderstation Simulator

Dit document legt uit hoe de simulator technisch in elkaar zit. Het begint hoog over (wat zijn de onderdelen en hoe werken ze samen) en gaat daarna per onderdeel de diepte in. Het is bedoeld voor wie aan de code wil werken. Voor wat de simulator kan en hoe je hem speelt: zie de [README](README.md). Plannen staan in de [ROADMAP](ROADMAP.md).

**Inhoud**

1. [Hoog over](#1-hoog-over)
2. [Repository, bouwen en de ene module](#2-repository-bouwen-en-de-ene-module)
3. [Opstarten en de hoofdlus](#3-opstarten-en-de-hoofdlus)
4. [De simulatie: het elektrische net](#4-de-simulatie-het-elektrische-net)
5. [Bedienen, vergrendelingen en beveiliging](#5-bedienen-vergrendelingen-en-beveiliging)
6. [Storingen](#6-storingen)
7. [De spellaag: modi, scenario's, incidenten, score](#7-de-spellaag-modi-scenarios-incidenten-score)
8. [3D-wereld en rendering](#8-3d-wereld-en-rendering)
9. [Beweging: rondlopen, monteurs, busjes en verkeer](#9-beweging-rondlopen-monteurs-busjes-en-verkeer)
10. [Gebruikersinterface](#10-gebruikersinterface)
11. [Opslaan, instellingen en updates](#11-opslaan-instellingen-en-updates)
12. [Testen](#12-testen)
13. [Conventies, valkuilen en recepten](#13-conventies-valkuilen-en-recepten)
14. [Woordenlijst](#14-woordenlijst)

---

## 1. Hoog over

### Eén HTML-bestand, geen server

Het spel is één bestand: `index.html`. Je opent het lokaal in de browser (ook via `file://`) en er is geen server of installatie nodig. Het enige externe is **three.js 0.169**, dat via een importmap van jsDelivr komt (en jsPDF, alleen als je een rapport als PDF maakt). Alle textures, geluiden en modellen worden **procedureel** gemaakt: textures op canvas, geluid met Web Audio, en de 3D-modellen uit dozen, cilinders en buizen.

`index.html` wordt niet met de hand bewerkt. Het wordt gebouwd uit ongeveer 66 bronbestanden in `src/`, die achter elkaar in één `<script type="module">` worden geplakt.

### De vier lagen

```
┌────────────────────────────────────────────────────────────────────────┐
│ UI (07-*.js)        SCADA-schema, panelen, vensters, menu, tablet,      │
│                     begeleiding, update-knop                            │
├────────────────────────────────────────────────────────────────────────┤
│ Spel (04b, 04d–04i) modi, scenario's, incidenten, lessen, taken, score  │
├────────────────────────────────────────────────────────────────────────┤
│ Simulatie (04-*.js) netmodel D, spanning EN, belasting computeFlows,    │
│                     beveiliging, storingen, trafo's, ring, LS, tijd     │
├────────────────────────────────────────────────────────────────────────┤
│ Wereld (01–03, 05,  three.js-scène, onderstation, wijk, interieurs,     │
│ 06, 07x*)           weer, geluid, monteurs, verkeer, rondlopen          │
└────────────────────────────────────────────────────────────────────────┘
                 08-main.js: opstarten + hoofdlus (frame)
```

- **Simulatie.** Een netmodel van schakelaars en knooppunten (`D`). Elke stap wordt berekend welke knooppunten spanning hebben (`EN`), hoe de belasting over rails, voeders en ringkabels verdeeld is (`computeFlows`), en wat beveiliging, temperatuur en storingen doen. De simulatie rekent in **spelminuten** (`SIM.t`).
- **Spel.** Bovenop de simulatie: wat er gebeurt (scenario's, willekeurige storingen, incidenten, werkopdrachten), wat je moet bereiken (doelen) en hoe het telt (score, klantminuten).
- **Wereld.** De 3D-scène met het onderstation, de woonwijk met MS-stations, de interieurs, het verkeer, de monteurs, het weer en het geluid. De wereld volgt de simulatie: een schakelaar draait om als `D[id].state` verandert, de straatverlichting gaat uit als het MS-station spanningsloos is.
- **UI.** Het SCADA-eenlijnschema (SVG), het apparaatpaneel, alarmen en de vensters. De UI leest uit de simulatie en roept `operate()` aan om te schakelen.

### Hoe een klik op een schakelaar doorwerkt

1. Je klikt in SCADA of in 3D. `pickAt()` (raycast) of het SVG-element geeft een apparaat-id, en `selectDevice(id)` opent het paneel.
2. De knop *UIT* roept `operate(id, 0)` aan (`04-2-bediening.js`). Die controleert de vergrendelingen en de SCADA-verbinding, en of er een monteur in de buurt staat.
3. Mag het, dan wordt `D[id].state` gewijzigd, eventueel met een vertraging (`busy`, veer van de vermogensschakelaar), en volgt `refreshAll()`.
4. De volgende `simStep` herberekent `EN` en de belasting. Klanten die geen spanning meer hebben, tellen klantminuten.
5. De 3D-update van het apparaat (`VIEWS[id].update`) laat de schakelaar bewegen, `updateSLD()` kleurt het schema, en er klinkt een geluid.

---

## 2. Repository, bouwen en de ene module

### Mappen

| Pad | Inhoud |
|---|---|
| `src/` | De broncode: `00-head.html` (CSS, DOM, importmap, opening `<script type="module">`), ongeveer 66 `.js`-bestanden en `99-end.html` (sluit de tags). |
| `index.html` | Het gebouwde spel. **Niet met de hand bewerken.** |
| `version.json` | Versie-ID, datum, eerdere versies en korte samenvattingen per versie (voor de update-knop). |
| `tests/` | `run.mjs` (testsuite), `scenarios.mjs` (bot die scenario's uitspeelt), `freeze.mjs` (stresstest), `lint.mjs`, `stamp.mjs`, `note.mjs`, screenshot-scripts. |
| `docs/` | Afbeeldingen voor de README. |
| `.github/workflows/test.yml` | CI: lint en testsuite bij elke push en pull request. |

### Bouwen: `build.ps1` (`npm run build`)

1. Sorteert de `.html`- en `.js`-bestanden in `src/` op naam met **ordinale** sortering (`[StringComparer]::Ordinal`). Daardoor komt `04-1-net.js … 04-9-wear.js` vóór `04b-game.js`, en `04g-scen3.js` vóór `04g0-fire.js` (`-` = 0x2D sorteert vóór `0` = 0x30).
2. Draait `node tests/lint.mjs --build`. Bij lintmeldingen stopt het bouwen.
3. Plakt alle bestanden aan elkaar (gescheiden door `\n`) en schrijft `index.html` (UTF-8 zonder BOM).
4. Draait `node tests/stamp.mjs`. Die vervangt de plaatshouder `__OS_BUILD__` (in `07za-update.js`: `const BUILD_ID='__OS_BUILD__'`) door de eerste 12 hextekens van een SHA-256 over de samengevoegde bron, met regeleinden genormaliseerd. Elke clone geeft dus dezelfde versie-ID. Als de versie veranderd is, schuift `version.json` de oude versie naar `previous` (maximaal 200) en zet `build` en `date`.

Daarna, vóór de commit: `node tests/note.mjs "korte samenvatting"`. Die zet `notes[<build>] = {date, text}` in `version.json`; de update-knop toont dit onder *Wat is er nieuw?*. Bouw je daarna opnieuw, dan verandert de ID en moet je de samenvatting opnieuw zetten.

### Lint: `tests/lint.mjs` (`npm run lint`)

1. **Commentaar dat code uitschakelt.** De bron staat op lange regels. Een `//` midden op een regel slikt de rest van die regel in, en dat parseert gewoon. Een eigen tokenizer vindt `//`-commentaar buiten strings, templates en regex-literals en test het tegen patronen die op code lijken (`; foo(`, `=>`, `);`, `const x =` …). Commentaar met `lint-ok` wordt overgeslagen. In de praktijk: geen `;` of `);` in commentaar zetten.
2. **Syntax per bestand** met `node --check`.
3. **Syntax van de samengevoegde module.** Dit vangt **dubbele top-level-namen** tussen bestanden, zoals twee keer `const IM`, wat de hele pagina breekt. De fout wordt teruggemapt naar bestand en regel.
4. **`index.html` loopt gelijk met `src/`** (niet bij `--build`).

### De ene module: wat dat betekent

Alle `.js`-bestanden delen **één module-scope**. Er zijn geen imports tussen de bestanden; alles is globaal binnen de module.

- **Volgorde telt voor `const`/`let`.** Die staan in de *temporal dead zone* tot hun bestand is uitgevoerd. Code die bij het laden draait, mag alleen `const`s uit eerdere bestanden gebruiken. Voorbeeld: `ROOMS = BUILDINGS.map(...)` in `05b` werkt omdat `BUILDINGS` in `03-world` staat. `function`-declaraties worden wel door de hele module gehoist.
- **Functies mogen latere `const`s gebruiken**, zolang ze pas worden aangeroepen als die bestaan. De opstartcode in `08-main.js` draait als laatste.
- **Namen zijn wereldwijd uniek.** Kies bij een nieuw bestand een eigen voorvoegsel, zoals `BZ` (bedrijventerrein), `SVM` (servermaterialen) of `GS*` (aggregaten).
- **`MODES` wordt later aangevuld:** door `04d-lessons.js` (lessen) en de scenariobestanden `04f`, `04g` en `04i` met `Object.assign(MODES, {...})`.
- **`checkModel()`** (`07i-check.js`) controleert bij het opstarten of het netmodel klopt: apparaatverwijzingen, of elke schakelaar ergens bedienbaar is, ringen, lessen, en of in de normale toestand alles spanning heeft. Een fout wordt een `console.error`, en dat laat de tests falen.

### De bronbestanden in volgorde

| Bestand | Verantwoordelijkheid |
|---|---|
| `00-head.html` | CSS, DOM-skelet (HUD, panelen, vensters, menu), importmap three.js, opening `<script type="module">` |
| `01-core.js` | Imports, URL-parameters `params`, `LITE`, grafische presets `GFX`, helpers (`$`, `clamp`, `V3`, `rnd`, `R` = vaste RNG voor het landschap), renderer, scène, camera, controls, procedurele textures `C`, materialen `MAT`, geometriehelpers, `bakeStatic()` |
| `02-equipment.js` | Geometrie van de buitenopstelling, `VIEWS`, `pickables`, `regView()` |
| `03-world.js` | Omgeving, `LAYOUT`-register, `FENCE`, `BUILDINGS`, gebouwen met deuren (`DOORS`, `STEPS`), lucht en zon (`updateSky`, `NIGHT`) |
| `03b-district.js` | Woonwijk, MS-stations (`kiosk`), straatverlichting, `DISTRICT_RECTS` |
| `03c-weather.js` | Seizoenen, weertypen, `WX`, `weatherTick` |
| `03d-streets.js` … `03g-industry.js` | Straatbeeld, grote afnemers (ziekenhuis, kassen, RWZI), kleine afnemers, bedrijventerrein |
| `03h-meppel.js` | OS Meppel (alleen beeld) aan de noordkant van de stad. `buildMeppel()` gebruikt dezelfde bouwers als Zuidwolde in lokale coördinaten, zet de apparaten in hun stand, haalt registraties en klikvakken weg en draait en verplaatst alles in één groep. Eigen samenvoegzone `meppel`; `meppelLod()` verbergt op meer dan 280 m de fijne delen. De inrit zoekt het grootste gat in de bomenrij. |
| `04-1-net.js` | `SIM`, rails, lijnen, voeders, apparaten `D`, ringen, LS-groepen, netgraaf, `EN`/`ER`, `computeFlows` |
| `04-2-bediening.js` | `operate()`, vergrendelingen, trips, 110 kV-lijnen |
| `04-3-trafo.js` | Trappenschakelaar en AVR, oliemodel, uitschakelrelais 86, omschakelbare T3 |
| `04-4-beveiliging.js` | Voederbeveiliging (I>), selectiviteit, koudestart, kabeltemperatuur |
| `04-5-storingen.js` | Storingsgeneratoren (lijn, voeder, rail, trafo, Meppel) |
| `04-6-taken.js` | Werkopdrachten (`TASK`) met stappen |
| `04-7-simloop.js` | `simStep()`: één simulatiestap |
| `04-8-flex.js` … `04-c-aardfout.js` | Congestie en flex, slijtage van schakelaars, relaisafwijkingen, laagspanning, aardfout in het gecompenseerde net |
| `04b-game.js` | `GAME`, `DIFFS`, `MODES` (vrij, dag, avond, eerste scenario's), `applyMode`, `gameTick`, score |
| `04c-ring.js` | 10 kV-ringen, kabelfouten, kortsluitverklikkers |
| `04d-lessons.js` | Lessen 1–11 |
| `04e-handover.js` | Dienstoverdracht |
| `04f-scen2.js`, `04g-scen3.js`, `04i-scen4.js` | Scenario's; `04f` definieert ook `SCADA_DOWN` en `scadaReach` |
| `04g0-fire.js` | Brand met vlammen, rook, brandbel en brandweer (10 kV-gebouw of datacenter) |
| `04h-incidents.js` | Grote incidenten in de vrije dienst |
| `05-fx-audio.js` | Effecten `FX`, `AudioSys` (Web Audio) |
| `05b-interior.js` | Interieurs, `ROOMS`, `camInside()` |
| `05c-servers.js` | Datacenter en RTU-kasten |
| `06-build.js` | Bouwt de scène en roept `bakeStatic()` aan |
| `07-ui.js` | SCADA-schema (SVG), apparaatpaneel, alarmen, camerastandpunten |
| `07b-fp.js` … `07zb-coach.js` | Rondlopen, monteurs, schakelbrief, vensters, telefoon, tijdlijn, instellingen, opslaan, verkeer, busjes, GIS, update, begeleiding (zie §9–§11) |
| `08-main.js` | HUD, toetsen, pauzemenu, opstarten, `window.OS`, de hoofdlus `frame()` |
| `99-end.html` | `</script></body></html>` |

---

## 3. Opstarten en de hoofdlus

### Opstarten

Bij het laden voert de module alle bestanden van boven naar beneden uit. `06-build.js` bouwt de scène:

1. `buildGround`, `buildFence` en `BUILDINGS.forEach(buildBuilding)`.
2. De rails, de lijnvelden en de transformatorvelden.
3. Lampen en bomen, `buildDistrict()` (wijk, MS-stations, sites) en `buildInterior()`.
4. Als laatste `bakeStatic()`.

Daarna start `08-main.js`:

1. `buildSLD()`, `checkModel()`, `buildLabels()`, `buildColliders()`, `initTaps()`, `updateSky()` en `updateSLD()`.
2. URL-parameters: `diff`, `season` en `weer`.
3. De keuze waarmee wordt gestart:
   - `?resume=<slot>`: `resumeGame`;
   - anders `?play=<modus>`: `startGame`;
   - anders `?autostart`: de vrije dienst;
   - anders het hoofdmenu (met draaiende camera).
4. Eventueel `?night` en `?view=<n>`.

### URL-parameters

| Parameter | Werking |
|---|---|
| `play=<id>` | Start een modus (`free`, `day`, `eve`, een scenario-id of `les1`…`les11`). |
| `autostart` | Direct de vrije dienst op snelheid 60. Slaat ook de update-controle over. |
| `t=<uur>` | Starttijd, bijvoorbeeld `18.5`. |
| `diff=rustig\|normaal\|zwaar` | Moeilijkheid. |
| `season=<seizoen>` en `weer=<type>` | Seizoen en weer. |
| `resume=auto\|1\|2\|3` | Opgeslagen spel hervatten. |
| `view=0..12` | Camerastandpunt bij de start. |
| `night` | Lucht vast op 22:00. |
| `lite` | Testmodus: niets tekenen, de lus op 15 Hz, geen labels of schermen. |

### `frame()`: één beeld

`renderer.setAnimationLoop` roept elk beeld `frame()` aan, binnen `try/catch`. Een fout stopt het spel niet. `loopError` telt hem in `LOOP_ERR` en meldt hem één keer in de alarmlijst, met de eerste regel uit de stack die naar het eigen HTML-bestand wijst.

1. **Beeldfrequentie.** `dt` wordt opgespaard tot de ingestelde limiet (`GFX.fps`, of 15 Hz in `LITE`) en daarna begrensd op 0,1 s.
2. **Simulatie.** `ffTick()` tijdens doorspoelen, anders `simStep(dt)`.
3. **Apparaten en effecten.** `VIEWS[*].update(dt)`, de effecten in `FX`, windturbines en knipperlichten.
4. **Camera.** Rondlopen (`updateFP`) of de overzichtscamera (vlucht, toetsen, `controls`, grenzen), daarna `nearPlane()`.
5. **Lucht.** Elke 0,25 s `updateSky(viewHour())`.
6. **Panelen, verdeeld over vier beelden** (`hudStep`, elke 0,25 s opnieuw):
   - beeld 0: HUD, SCADA-schema en apparaatpaneel;
   - beeld 1: schermen in de schakelruimte, taken, straatverlichting en ramen;
   - beeld 2: storingen, begeleiding en prognose;
   - beeld 3: de tabbladen Kabels en LS.

   Zo valt het werk niet allemaal in één beeld.
7. **Elk beeld:**
   - hover en labels, regen en sneeuw, monteurs (`updateNPCs`);
   - deuren (`doorTick`) en kiosklicht;
   - telefoon, herhaling, leven in de wijk, brand, GIS, servers, sites en kleine afnemers.
8. **Tekenen.** `shadowTick` (de schaduwkaart wordt alleen opnieuw getekend als er iets beweegt op het terrein) en `renderer.render`, niet in `LITE`.

### `simStep(dtReal)`: één simulatiestap (`04-7-simloop.js`)

1. `dm = dtReal · SIM.speed / 60` spelminuten, en `SIM.t += dm`. Op snelheid 60 is één echte seconde één spelminuut.
2. Verlopen timers uitvoeren: `SIM.timers`, gevuld met `addTimer(min, fn)` (relatief aan nu) of `at(min, fn)` (relatief aan de start van de modus, `GAME.t0`).
3. Ruis op de belasting, `weatherTick`, `computeFlows`, `thermal`, `regulate` (AVR), `feederTick` (beveiliging), `flexTick`, `lsTick`, `efTick` (aardfout), `gisSimTick` en `stationTick`.
4. Uitval- en herstelmeldingen. Klantminuten: `SIM.cml += Σ klanten zonder stroom · dm`; afschakelbare klanten tellen voor 0,1.
5. Willekeurige storingen (`randomEvent`, interval `rnd(35,75) · DIFFS.ev`) en werkopdrachten aanbieden.
6. `taskTick`, `gameTick` (score, doelen, incidenten, scenario-`tick`) en `recTick` (tijdlijn).

**Doorspoelen** (`FF`, `ffStart(min)`) draait herhaald `simStep` in stappen van 0,25 spelminuut, binnen een budget van ongeveer 9 ms per beeld, en stopt bij een nieuw kritiek alarm.

---

## 4. De simulatie: het elektrische net

### Het netmodel: `D` en knooppunten (`04-1-net.js`)

Het net is een **graaf van knooppunten** (strings zoals `RA`, `M4`, `F6`) met **apparaten** als verbindingen. `dev(id, o)` zet een apparaat in `D` met `{id, state, ops, I, busy, springAt, type, label, a, b, ...}`. Apparaten met `a` en `b` verbinden twee knooppunten; enkele apparaten hebben `node`.

| Type | Betekenis |
|---|---|
| `cb` | Vermogensschakelaar (heeft een veer, kan trippen) |
| `ds` | Scheider (niet onder belasting) |
| `es` | Aardschakelaar |
| `lbs` | Lastscheider (RMU in MS-stations) |
| `lvs` | LS-veld (NH-lastscheider), ook de koppelingen in kabelkasten |
| `tr` / `mstr` / `ext` | Vermogenstransformator / distributietransformator / de trafo van Netbeheer Noord |
| `ct`, `sa`, `line`, `bb`, `bld`, `kiosk` | Meet- en informatieobjecten: stroomtrafo, overspanningsafleider, lijn, 110 kV-rail, gebouw, MS-station |

**De topologie:**

- **Rails:** `RA` en `RB` (10 kV, koppeling `V-K`), `RC` en `RD` (20 kV, koppeling `W-K`), en `MP` (Meppel 10 kV, extern).
- **110 kV:** lijnen `L1` (Hoogeveen) en `L2` (Meppel), met per lijnveld `Lx-Q9`, `Q8`, `Q0` en `Q1`.
- **Transformatoren:** T1, T2 en T3. T3 is de reservetrafo, omschakelbaar naar 10 of 20 kV (`setRatio`, alleen spanningsloos). Railkeuzescheiders `-QA`/`-QB` staan in `SEL_BAYS`.
- **Voeders (`FEEDERS`):**
  - `F1`–`F4` zijn koppen van **ringen**;
  - `F5` ziekenhuis, `F6` kassen;
  - `G1` zonnepark (`gen`), `G2`–`G4`;
  - `MP1`–`MP3` vanuit Meppel, met `MP3` als koppelkabel naar MS5.
- **Ringen (`RINGS`, `RING`):**
  - `R1` Woonwijk: F3 → MS1…MS5 → F4, normaal-open punt `MS3-R`.
  - `R2`: F1 → MS6…MS9 → F2, normaal-open punt `MS7-R`.
  - Elk station heeft knooppunt `M<n>`, lastscheiders `-L`, `-R` en `-T`, een distributietrafo `-TR`, LS-groepen `-G<k>` (in `LVG`) en een groep openbare verlichting (`s.ovl`). De kabelvakken (`K12`, `K23`, …) staan in `RING.secs`.

### Spanning: `EN` en `ER`

- `conducts(d)`: trafo's geleiden altijd, schakelaars als `state === 1`.
- `energized()`: een breedte-eerst-zoektocht vanaf de beschikbare 110 kV-lijnen en vanaf Meppel. Het resultaat is de Set `EN` met knooppunten die spanning hebben. Omdat `EN` steeds opnieuw wordt toegewezen, exporteren de tests hem als `OS.EN()`.
- `earthed()`: een zoektocht vanaf gesloten aardschakelaars, niet door trafo's heen. Het resultaat is `ER`.
- `shortNode()`: een knooppunt dat in **beide** sets zit, dus kortsluiting via aarde.

### Belasting en spanning: `computeFlows()`

Dit is **geen iteratieve loadflow**, maar een snelle algebraïsche benadering die per stap draait:

1. `EN` en `ER` opnieuw bepalen.
2. Per verbruiker: `demand = base · profile(kind, uur) · seizoensfactor · (1 + ruis) · koudestart · (1 − flex-afschakeling)`, plus zon op daken. Zonder spanning is het vermogen 0.
3. Optellen per voeder en rail langs de voedingsboom (`supplyTags()` → `FLOW.TAG`). Stroom uit vermogen: ongeveer 57,9 A/MW op 10 kV en 28,9 A/MW op 20 kV.
4. **110 kV-spanning** volgt een dagritme met ruis en daalt bij hoge belasting. **Trafospanning:** `U0 = U110/110 · Un · (1 + (trap − 9) · 0,0125)`, met trappen 1–17 en 9 als neutraal.
5. Rails die via gesloten koppelingen een groep vormen, delen de last over hun trafo's. Een trapverschil tussen parallelle trafo's geeft een kringstroom.
6. `ringFlows()` berekent stromen per kabelvak en de spanningsval per knooppunt (`FLOW.UN`). `nodeU(n)` geeft de spanning van elk knooppunt.

### Belastingprofielen, seizoen en weer

- `profile(kind, h)` voor `res` (woningen), `city`, `ind`, `hosp`, `ev` (laden), `green` (kassen, belichting als het donker is), `ovl` (straatverlichting) en `pv` (negatief; hangt af van zon, bewolking en sneeuw).
- `SEASONS` geeft per seizoen zonsopkomst en -ondergang, buitentemperatuur, belastingfactoren en de kans op elk weertype.
- `seasonMul(kind)`: meer verwarmingslast onder 5 °C, meer koellast boven 24 °C.
- `WX` heeft een huidig type en `WX.cur = {cloud, rain, snow, thunder, fog, dT}`. Die waarden schuiven geleidelijk naar het doel (tijdconstante 20 min). Onweer verhoogt de kans op lijnfouten; sneeuw maakt reparaties langer.

### Transformatoren (`04-3-trafo.js`)

- **AVR (`regulate`):** de trappenschakelaar verzet na 1 min buiten ±1,2 % van de setpoint. Bij parallelbedrijf is één trafo master. Er zijn alarmen voor kringstroom en voor spanning buiten de band.
- **Oliemodel (`thermal`):** eerste orde, tijdconstante 32 min. Boven 65 °C gaan de ventilatoren aan (ONAF). Daarboven volgt een thermische trip, en boven 105 °C gasvorming met een Buchholz-trip.
- **Uitschakelrelais 86 (`tripTrafo`):** de trafo is geblokkeerd tot `resetLockout()`.

### Ring, laagspanning, flex en aardfout

- **Ring (`04c-ring.js`):** kabelvakken met belasting en temperatuur. Bij een kabelfout spreken de kortsluitverklikkers aan op het pad (`ringPathStations`), en na 10–18 min is de fout gelokaliseerd. Herstel gaat via isoleren aan beide kanten en voeden via het normaal-open punt.
- **Laagspanning (`04-b-ls.js`):**
  - LS-spanning per groep (`lvVolt`) met de band 207–253 V; omvormers vallen af bij overspanning.
  - Koppelingen via kabelkasten (`LS_LINKS`).
  - Drie aggregaten (`GENSET`).
  - Opdrachten aan monteurs (`lsOrder`): schakelen, aggregaat en trap. Daarnaast rotatie en afschakelen bij tekort.
- **Flex (`04-8-flex.js`):** zeven contracten (`FLEX_DEF`) die na 2 min ingaan en geld kosten. Distributietrafo's boven 120 % laten hun zekeringen doorslaan.
- **Aardfout (`04-c-aardfout.js`):** het 10 kV-net is gecompenseerd (Petersen-spoel). Een aardfout geeft een nulspanning U0 en geen trip. Na 50 min kan een dubbele aardfout ontstaan.

---

## 5. Bedienen, vergrendelingen en beveiliging

### `operate(id, to, opts)` (`04-2-bediening.js`)

De controles, in volgorde:

1. Het spel is gepauzeerd.
2. Het station is beschadigd, of geblokkeerd door koperdiefstal of brand (`stationBlock`).
3. LS-velden gaan via een monteur (`lsSwitchOrder`), tenzij je er zelf staat.
4. **SCADA bereikbaar:** `scadaReach(id) || localOk(id)`. `localOk` betekent: rondlopen en binnen 7 m van het veld. `scadaReach` is waar als SCADA gewoon werkt, of als `GAME.flags.scadaDown === 'os'` en het apparaat in een MS-station zit (de RTU's daar bereikt het nood-front-end via LTE).
5. Zekering nog niet vervangen; apparaat `busy`; versleten schakelaar weigert (`manualRefuses`); trafo geblokkeerd.
6. **Veer** (`springOk`): na een schakeling laadt de veer van de vermogensschakelaar 7 echte seconden op.
7. **Synchrocheck** (`syncCheck`) bij het sluiten van een railkoppeling: maximaal 0,25 kV (10 kV) of 0,5 kV (20 kV) verschil.
8. **Vergrendelingen** (`interlockCheck`, als `SIM.interlock` aan staat):
   - eerst de vermogensschakelaar, dan de scheiders;
   - aarden alleen spanningsloos, en niet inschakelen op aarde;
   - de regels voor Meppel en voor T3;
   - geen LS-parallelbedrijf (`lsInterlock`).
9. Staat er een monteur bij het veld (`crewNear`), dan verschijnt eerst de portofoondialoog.

Omzeil je de vergrendeling (die kun je uitzetten), dan heeft dat gevolgen. Bij een **veiligheidsincident** volgt `incident()`: −150 punten en `SIM.incidents++`.

- **Scheider onder belasting:** een vlamboog (`spawnArc`) en een trip.
- **Aarden op spanning, of inschakelen op aarde:** kortsluiting (`shortNode`) en een trip.

### Trips

`tripFrom(node)` zoekt vanaf de fout naar buiten en opent de eerste gesloten vermogensschakelaars. Weigert een relais of schakelaar, dan schuift de trip door naar de volgende (breaker failure, 50BF). Bereikt een fout de 110 kV, dan schakelt TenneT de lijn af (`lineRestore` na 10–18 min).

### Beveiliging (`04-4-beveiliging.js`)

- **I> per voeder** met een inverse karakteristiek (`IEC_SI`, `feederT`): een integrator `f.oc` loopt op met `(I/I_pick)² − 1`. Instellingen staan in `PROT` en zijn aan te passen in het beveiligingsvenster (`07e-prot.js`). `selectivity()` en `protSelect()` bepalen of een inkomend veld niet-selectief mee afschakelt.
- **Koudestart (`clp`):** na een lange uitval tot +60 % belasting, die met een tijdconstante van 18 min wegzakt.
- **Kabeltemperatuur:** `T = grondtemperatuur + 65 · belasting²`, met tijdconstante 30 min (voeder) of 40 min (ringvak). Bij 105 °C brandt de kabel door en ontstaat een storing.
- **Automatisch herinschakelen (AR)** van de 110 kV-lijnen, met kans op mislukken. Dit staat in `lineFault`.
- **Relaisafwijkingen (`04-a-relay.js`):** verborgen defecten (weigert, drift, vertraging) die je met de testkoffer vindt (`07p-kit.js`).
- **Slijtage (`04-9-wear.js`):** elke schakeling en elke trip verhoogt `d.wear`, en daarmee de kans dat de schakelaar weigert. Een revisie is mogelijk als werkopdracht.

Afstands- en differentiaalbeveiliging zijn **niet** als relais gemodelleerd. Ze komen alleen voor als tekst in meldingen.

---

## 6. Storingen

| Storing | Functie | Wat er gebeurt |
|---|---|---|
| Lijnfout | `lineFault` | Trip van de 110 kV-lijn. AR kan lukken of mislukken; een blijvende fout houdt de lijn een tijd uit bedrijf. |
| Voederfout | `feederFault` | Kiest een voeder, gewogen naar het risico van de kabel (leeftijd van de moffen). De fase `search` duurt tot de fout gevonden is, daarna `isolated` en reparatie. Een ringvoeder gaat naar `ringFault`. |
| Ringkabelfout | `ringFault` | De verklikkers spreken aan, de fout wordt gelokaliseerd, de meetwagen bepaalt de foutplaats en de graafploeg repareert. |
| Railfout | `busFault` | De rail is defect tot reparatie; opnieuw inschakelen geeft een trip. |
| Trafofout | `trafoFault` | Het uitschakelrelais 86 valt, met een melding over de reden. |
| Aardfout | `earthFault` | U0 op de rails; zoeken door te schakelen. |
| LS-storing | `lvFault` (`07g-phone.js`) | Klanten bellen; een monteur gaat erheen. |
| Koperdiefstal / brandende trafo | `copperTheft`, `trafoFire` (`07xc-stations.js`) | Politie, afzetting, brandweer met schuim; het station is pas veilig als het geïsoleerd is. |
| Brand in een gebouw | `fireStart` (`04g0-fire.js`) | Vlammen, rook, brandbel en brandweer (zie §7). |

`randomEvent()` kiest in de vrije dienst en de diensten een storing (6 % kans op koperdiefstal of trafobrand), met weersinvloed. **Foutplaats en meetwagen** staan in `07z-gisplay.js`: de meetwagen rukt uit zodra `measBlock(c)` niets meer blokkeert, en `measDone` zet de foutplaats en start het graafwerk.

---

## 7. De spellaag: modi, scenario's, incidenten, score

### `GAME` en `MODES` (`04b-game.js`)

`GAME` bevat `{mode, diff, season, score (start 1000), ended, t0, endT, obj[], flags{}, countdown, stats{}}`. `GAME.flags` is de vrije plek voor scenariotoestand. `GAME.flags.scadaDown` bijvoorbeeld is `false`, `true` (SCADA weg) of `'os'` (alleen de MS-stations bereikbaar).

Een modus in `MODES`:

```js
datacenter:{scen:true, name:'Brand in het datacenter', tag:'Scenario · zwaar',
  start:20.5, dur:160, season:'winter', weather:'bewolkt', desc:'…',
  setup(){ at(4,()=>{…}); at(5,()=>fireStart({bld:'SRV',off:0,ladder:false})); … },
  tick(dm){ … },                                    // elke simulatiestap
  obj:()=>[{t:'Doel', check:()=>'done'|'fail'|null, final:()=>true|false}, noIncidents]}
```

- `applyMode(id)` zet tijd, seizoen en weer, initialiseert trappen en relais, roept `setup()` aan en start (behalve in de vrije dienst en lessen) de dienstoverdracht.
- `gameTick` trekt punten af voor klanten zonder stroom (extra voor het ziekenhuis), roept `tick` aan en controleert de doelen. Een gehaald doel is +100, een gemist doel −150.
- Bij het einde (`finalizeGame`) krijg je +200 voor *Veilig gewerkt* als er geen incidenten waren, een cijfer (`grade`) en een rapport.

**Scenario's:**

| Bestand | Scenario's |
|---|---|
| `04b-game.js` | `zkh`, `storm`, `piek`, `blackout`, `dubbel`, `hitte`, `winter` |
| `04f-scen2.js` | `aanrijding`, `cyber`, `overstroming`, `zonnepiek` |
| `04g-scen3.js` | `kraan`, `brand`, `evenement`, `laadpiek`, `datacenter` |
| `04i-scen4.js` | `pinksteren`, `aardonweer` |

Lessen (`04d-lessons.js`) zijn modi met `les:true` en stappen `{t, txt, hl[], check(), auto, enter}`.

### Voorbeeld: het scenario *Brand in het datacenter*

Dit scenario laat zien hoe de lagen samenwerken.

1. **t+2:** voor-alarm van de rookaanzuiging (alleen een melding).
2. **t+4:** brandalarm. `GAME.flags.dcAlarm` laat in `serverTick` het flitslicht boven de deur knipperen. `dcDanger` maakt binnenlopen een veiligheidsincident (in `tick`: rondlopen en `camInside()` is het datacenter).
3. **t+5:** de blussing faalt. Er klinkt een sissend gasgeluid. `fireStart({bld:'SRV', off:0, ladder:false})` gebruikt dezelfde brand als het 10 kV-gebouw, maar op het datacenter, en zonder waterstraal van de ladderwagen. De brandweerploeg loopt met `crewDispatch({kind:'fire'})` door de deuren naar binnen.
4. **t+7:** SCADA valt uit. `GAME.flags.scadaDown = true`, de CSS-klasse `#scada.down` grijst het schema uit, en `dcBurnt()` zet roet op de racks en schakelt de LEDs uit. `operate()` weigert nu alles behalve lokaal bedienen.
5. **t+18 en t+48:** de brandweer blust (`fireDouse`), daarna `fireStop`.
6. **t+24 en t+70:** storingen die je ter plaatse moet oplossen (de kassen, ring oost).
7. **t+95:** `scadaDown = 'os'`. Het nood-front-end bereikt de MS-stations via LTE en `scadaReach()` laat hun schakelaars weer toe.
8. **t+145:** SCADA is volledig terug (SCADA-container).

### Incidenten in de vrije dienst (`04h-incidents.js`)

Een incident heeft `{id, name, desc, w (gewicht), dur, ok() (voorwaarde), start(), tick(dm)?, end()?}`. `incidentTick` start het eerste incident na 60–120 min en daarna elke 90–200 min een gewogen keuze. `startIncident(id)` maakt een instantie met `Object.create(def)`. `endIncident()` geeft +100 als iedereen weer stroom heeft.

Ids: `zkh`, `storm`, `dubbel`, `hitte`, `aanrijding`, `datacenter` (gewicht 1,6; na afloop ruimt `dcRestore()` het roet op), `cyber`, `water`, `zon`, `kraan`, `brand`, `concert`, `laden`, `blackout`. `clearIncident` (`07o-save.js`) ruimt vlaggen op bij hervatten.

### Werkopdrachten, overdracht en tijdlijn

- **Werkopdrachten (`04-6-taken.js`):** `TASK = {title, desc, steps[{t, act:[id,to], ok(), wait, why}], crew()}`. Er zijn generators voor lijn, voeder, reservetrafo, rail, ring, relais en revisie. Afronden geeft +150. Bij afbreken worden de herstelstappen in omgekeerde volgorde gebouwd.
- **Dienstoverdracht (`04e-handover.js`):** afwijkingen die in de installatie zelf zichtbaar zijn (`deviations()`). Herstellen geeft +25; een afspraak breken −20.
- **Tijdlijn en herhaling (`07h-replay.js`):** `recTick` legt elke spelminuut de schakeltoestand vast (`snapState`), en `recEvent` legt meldingen en punten vast. Met de herhaling kun je terugkijken; `analyse()` geeft tips.

---

## 8. 3D-wereld en rendering

### three.js-basis (`01-core.js`)

- **Renderer:**
  - `WebGLRenderer` met antialias (niet in `LITE`), `PCFSoftShadowMap`, ACES-tonemapping en exposure 0,6.
  - Pixelratio `min(dpr, 1,75) · GFX.scale`; dynamische resolutie (`07m-settings.js`) verlaagt die bij een lage fps.
- **Scène en camera:**
  - Scène met `FogExp2`.
  - Camera `PerspectiveCamera(42°)` met `OrbitControls`.
  - Een eigen kaartbesturing staat in `07w-camera.js` (slepen schuift, rechts draait).
- **Kwaliteit:** `GFX` met presets `laag`, `midden` en `hoog`: resolutie, schaduwen, fps-limiet, omgevingslicht, leven in de wijk en deeltjes. Opgeslagen in `osz-gfx`.
- **Willekeur:** `R` is een vaste RNG (mulberry32, seed 20261003) voor het landschap, zodat de wereld altijd hetzelfde is. `rnd` en `pick` gebruiken `Math.random` voor het spel; in de tests is die geseed.
- **Helpers:**
  - `mesh`, `box`, `cyl`, `rod(a, b, r)` (cilinder tussen twee punten), `grp` en `groundQuad` (vlak met UV's op wereldschaal);
  - `cnv` en `toTex` (canvas naar textuur), `textCanvas` (tekst die zichzelf kleiner maakt en zo nodig over twee regels zet) en `plate` (naambordje);
  - `mat()` maakt een `MeshStandardMaterial`; `MAT` is de gedeelde materialenbibliotheek.

### `bakeStatic()`: waarom de wereld snel is

De wereld bestaat uit tienduizenden kleine meshes. `bakeStatic()` voegt aan het eind van het bouwen alle **statische** meshes samen tot één mesh per materiaal per zone:

1. Alle vlakken (`PlaneGeometry`) krijgen `polygonOffset`. Gevels, ramen en bordjes zitten vlak voor een blok en zouden anders flikkeren.
2. Overslaan: meshes met `userData.noBake`, en alles onder een ouder met `userData.dyn = true`.
3. De geometrie wordt naar wereldcoördinaten omgezet, teruggebracht tot positie, normaal en UV, en per *bucket* samengevoegd. Een bucket is materiaal + schaduw + zone; de zones zijn `station`, `wijk`, `centrum`, `zkh`, `kassen`, `rwzi`, `meppel` of een rastercel van 400 m. De samengevoegde mesh onthoudt zijn zone in `userData.zone`, zodat je een zone als geheel kunt verbergen (detailniveau).

**De regel:** alles wat beweegt of van materiaal verandert, hangt onder een groep met `userData.dyn = true` (deurbladen, scheidersarmen, voertuigen, wieken). Een materiaal waarvan alleen de *eigenschappen* veranderen (kleur, emissive, opacity) mag wel samengevoegd worden. Zo schakelt de straatverlichting met één materiaal per MS-station. **Gedeelde materialen** houden het aantal tekenbeurten laag: gebruik er geen nieuwe per object.

### Schaduw en near-plane

- De schaduwkaart wordt niet elk beeld getekend (`shadowMap.autoUpdate = false`). `shadowTick` doet het alleen bij `SHADOW_DIRTY`, elke 0,5 s voor de zon, of als er iets beweegt op het terrein (monteurs, brandweer, schakelaars).
- `nearPlane()` schuift de near-plane mee met de kijkafstand. Dat voorkomt z-fighting (flikkerende gevels) op afstand; binnen en bij rondlopen staat hij op 0,3 m.

### Het `LAYOUT`-register

Elke plaatsing in de wereld meldt zich met `lay(kind, x0, z0, x1, z1)`: `road`, `stoep`, `kiosk`, `lamp`, `tree`, `car`, …. `layFree(rect, kinds, marge)` vraagt of een plek vrij is. Zo komen bomen niet op de weg en lantaarns niet op de rijbaan. `layoutCheck()` (`07i-check.js`) test met `LAYOUT_BAD` welke soorten elkaar niet mogen overlappen; de testsuite draait die controle.

### Onderstation, gebouwen en interieurs

- **`BUILDINGS`** (`03-world.js`): `MS` (10 kV), `MS20` (20 kV) en `SRV` (datacenter), elk met deurposities. `buildBuilding` doet het volgende:
  - bouwt de voorgevel in delen met **deuropeningen** (de baksteentextuur loopt door via aangepaste UV's);
  - plaatst een kozijn en drempel;
  - maakt een **dubbele deur** in `dyn`-groepen die in `DOORS` komt;
  - legt een **bordes met trede** aan, waarvan de hoogte in `STEPS` komt.
- **`doorTick`** (`07b-fp.js`): een deur gaat open als jij (rondlopen) of een monteur binnen bereik is, en valt daarna dicht. Het geluid hangt af van de afstand.
- **`ROOMS`** (`05b-interior.js`) wordt afgeleid uit `BUILDINGS` (vloer op 0,45 m), plus de MS-stations. `camInside()` geeft de index van de ruimte waar de camera is. Pickboxen hebben `userData.inside`, zodat je binnen alleen apparaten in dezelfde ruimte aanwijst.
- **Interieur:** schakelpanelen met live schermen (`drawPanelScreens`, alleen dichtbij en alleen als er iets veranderd is), de bedienplek, accu's, EB-trafo en het datacenter (`05c-servers.js`: racks, koude gang, koeling, UPS, gasblussing, RTU-kast).

### Wijk, MS-stations en straatverlichting (`03b-district.js`)

- `kiosk(s)` bouwt per ringstation een inloopstation: casco, deur (in `DOORS`), RMU, LS-rek, distributietrafo achter gaas en een RTU-kast. Het station krijgt een eigen ruimte in `ROOMS`.
- `DISTRICT_RECTS` zijn botsvlakken voor rondlopen en voor het padzoeken van monteurs.
- **Straatverlichting:**
  - `streetLight` zoekt de dichtstbijzijnde weg (`lampDir`) en hangt het LED-armatuur aan een uithouder erboven.
  - Per MS-station zijn er gedeelde materialen voor de lens, de lichtvlek, de lichtkegel en de gloed (een `Points`-wolk).
  - `updateStreetLights` schakelt op `NIGHT`, de spanning op het OVL-veld, het dimmen tussen 23 en 6 uur en het weer (kegels bij mist, regen of sneeuw; natte straat).

### Lucht, weer, effecten en geluid

- **Lucht (`updateSky`, `03-world.js`):** three.js-`Sky` met een omgevingskaart (alleen opnieuw berekend bij een duidelijke verandering van zon of bewolking). Zon, hemellicht en sterren. `NIGHT` (0–1) volgt uit de zonnehoogte en wordt overal gebruikt.
- **Weer (`03c-weather.js`):** `WX`, met regen- en sneeuwdeeltjes die met de camera meebewegen (`updateRain`).
- **Effecten (`FX`):** objecten met `update(dt)`; geeft `update` `false` terug, dan worden ze verwijderd. Voorbeelden: vlamboog (`spawnArc`), bliksem, rook, water en schuim.
- **Geluid (`AudioSys`, `05-fx-audio.js`):**
  - Volledig gesynthetiseerd met Web Audio: `tone()` en `burst()` (gefilterde ruis). `tone()` is een oscillator die met `f2` kan glijden (met `back` naar `f2` en weer terug), met `hold` de toon aanhoudt in plaats van te laten uitsterven, en met `lp` door een laagdoorlaatfilter gaat.
  - Bussen `omgeving`, `schakel`, `alarm` en `telefoon` met eigen volumes.
  - Loops voor trafobrom, ventilatoren, wind, regen en verkeer.
  - `distGain(p)` regelt het volume op afstand. `updatePlaceAudio` past het geluid aan de plek aan (binnen, kiosk, terrein, wijk).
  - Sirenes: `siren(v, 'brandweer'|'ambulance'|'politie')`.

---

## 9. Beweging: rondlopen, monteurs, busjes en verkeer

### Rondlopen (`07b-fp.js`)

- `FP` bevat positie, kijkrichting en toetsen. `enterFP`/`exitFP` wisselen de camera en pointer lock.
- **Botsingen:** `buildColliders()` vult `FP.rects` met:
  - apparaten (`VIEWS`);
  - portalen;
  - gebouwmuren met deuropeningen;
  - inrichting, hek en `DISTRICT_RECTS`.

  `blockedAt(x, z)` test met een straal van 0,3 m.
- **Hoogte:** `floorAt(x, z)` geeft de vloer van een ruimte, anders een `STEPS`-hoogte (bordes, trede), anders 0,02. De camerahoogte volgt die vloerhoogte vloeiend.
- **Aanwijzen en bedienen:** `pickCenter()` richt vanuit het midden van het beeld (bereik 6 m). `F` schakelt, `E` opent het paneel en `Z` zet de zaklamp aan of uit.

### Monteurs (`07c-npc.js`)

- **Raster:** `GRID` is een raster van 1 m dat lui wordt gevuld vanuit `blockedAt`. `findPath` is A* en houdt alleen de hoekpunten over.
- **Werkplek:** `standPoints(box, n)` kiest werkplekken rond het doel, bij voorkeur **in dezelfde ruimte** als het veld.
- **Aanmaken:** `crewSpawn({box, say, until, n, kind})` maakt monteurs (`makePerson`) en zet ze in `NPCS`.
- **Lopen:** `updateNPCs` laat ze lopen (`npcWalk`, met `floorAt` voor de hoogte), werken tot `until()` waar is, en weer weggaan.
- **Portofoon:** `crewNear(id)` laat de portofoondialoog verschijnen als je wilt schakelen terwijl er iemand bij het veld werkt.

### Busjes (`07xb-crewvan.js`)

`crewDispatch(o)` beslist hoe de ploeg komt:

- **Binnen het hek, of bij de brandweer:** te voet, via `crewSpawn`.
- **Daarbuiten:**
  - het storingsbusje rijdt vanaf `VAN_DEPOT` over het wegennet (`gisSnap`, `gisPath` en `cityRoute`);
  - het parkeert op de stoep **naast** het werk (`vanParkSpot`);
  - de monteurs stappen uit; daarna rijdt het busje terug.

Opties: `tow` (aggregaat op aanhanger, in het gras gezet met rook en geluid), `model` (bijvoorbeeld de meetwagen), `onPark` en `onLeave`.

### Wegennet en verkeer

- **`GIS_NET`** (`07y-gis.js`) wordt opgebouwd uit de `road`-rechthoeken in `LAYOUT`. `gisPath` is Dijkstra over de middellijnen van de wegen.
- **Verkeer (`07xa-city.js`):**
  - `cityRoute` maakt rechts rijdende routes. `driveVehicle` remt voor de spoorwegovergang (`XING`) en voor politieafzettingen (`CORDONS`); hulpdiensten rijden door een afzetting heen.
  - Voertuigen: bus, vuilniswagen, pakketbezorger, ambulance en trein.
  - Leven: markt en fietsers.
- **Voetgangers (`07x-walkers.js`):** 48 figuren als `InstancedMesh`. Ze kosten samen maar een paar tekenbeurten.

---

## 10. Gebruikersinterface

- **SCADA-schema (`07-ui.js`):**
  - `buildSLD()` maakt één SVG met tabbladen: `10`, `20`, `R` (Ring), `M` (Meppel), `K` (Kabels), `L` (LS) en `P` (Prognose).
  - `SLD.devs[id]` verwijst naar de SVG-elementen van elk apparaat. `updateSLD()` kleurt knooppunten (spanning, aarde, storing) en zet meetwaarden.
- **Apparaatpaneel:** `selectDevice(id)` en `renderDevPanel()` tonen de toestand, metingen en bedieningsknoppen. Het overzicht in 3D en het schema wijzen naar hetzelfde `SEL`.
- **Aanwijzen in 3D:**
  - `pickAt(x, y)` doet een raycast op `pickables`, alleen in de huidige ruimte, en kiest het kleinste object.
  - Alleen klikvakken die bij een echt apparaat in `D` horen tellen; gebouwen zonder apparaat, zoals het datacenter, worden overgeslagen.
- **Alarmen:**
  - `pushAlarm(text, level)` met de niveaus `info`, `ok`, `op`, `warn`, `crit` en `radio`. De lijst bewaart maximaal 80 meldingen. `crit` stopt het doorspoelen.
  - `readyNotice()` geeft een groene melding en kan een apparaat laten oplichten; `deny()` toont een weigering als toast.
- **Vensters:** beveiliging (`07e`), flex (`07j`), onderhoud (`07k`), testkoffer (`07p`), toetsen (`07q`), LS (`07r`), storingsschrijver (`07s`), opslaan (`07o`), instellingen (`07m`), weer en tijd (`07v`) en telefoon (`07g`). Vensters gebruiken `modalOpen`/`modalClose`, die het spel pauzeren en de vorige toestand terugzetten.
- **Kabeltablet (`07y-gis.js`, `G`):** GIS-kaart of luchtfoto met kabels, tracés, moffen, KLIC-meldingen en foutplaats. Röntgenblik in 3D met `X`.
- **Begeleiding (`07zb-coach.js`, `U`):** `coachCards()` leidt uit de toestand af wat er speelt en wat je kunt doen. Het venster is versleepbaar en schaalbaar.
- **Camerastandpunten:** `VIEWPOS[0..12]` (toetsen 1–9 en knoppen) en `flyTo()`.

---

## 11. Opslaan, instellingen en updates

- **Opslaan (`07o-save.js`):**
  - Alleen in de vrije dienst, de dagdienst en de avonddienst (`canSave`). Scenario's worden niet opgeslagen.
  - Slots: `auto` (`osz-save`), `1`, `2` en `3` (`osz-save-<n>`). Het spel slaat elke 120 s en bij het sluiten automatisch op; `Ctrl+S` slaat handmatig op.
  - `saveGame` schrijft een JSON-snapshot: SIM, GAME, apparaten, voeders, LS, ring, weer, flex, beveiliging, taak, incident, telefoon, aardfout, tijdlijn en GIS.
  - Closures kun je niet opslaan. `resumeTimers()` plant lopende gebeurtenissen daarom opnieuw vanuit de toestand. Bij een mislukte hervatting wordt een reservekopie `…-defect` bewaard.
- **localStorage** (alle sleutels met `osz-`):
  - instellingen: `osz-gfx`, `osz-audio`, `osz-mouse`, `osz-sldz`;
  - begeleiding: `osz-coach`, `osz-coachbox`;
  - `osz-automeet`;
  - topscores: `osz-best-<modus>-<moeilijkheid>`;
  - update: `osz-upd-expect`, `osz-upd-from`;
  - de opgeslagen spellen.
- **Updates (`07za-update.js`):**
  1. `checkUpdate()` haalt `version.json` van GitHub (raw, zonder cache). De uitkomst is een van deze toestanden:
     - `actueel`: de eigen `BUILD_ID` is de nieuwste;
     - `nieuw`: de eigen ID staat in `previous`;
     - `eigen`: de eigen ID staat er niet in (eigen werk dat nog niet gepusht is).
  2. `updNotes()` haalt de samenvattingen op die nieuwer zijn dan de eigen versie.
  3. `installUpdate()` haalt `index.html` op en controleert die. In Chrome en Edge schrijft `writeOverGame()` het nieuwe bestand direct over het spelbestand heen. Daarvoor bewaart het de bestandskoppeling (`FileSystemFileHandle`) in IndexedDB `osz-update`; daarna herlaadt het spel. In andere browsers wordt het bestand gedownload.

---

## 12. Testen

| Commando | Wat |
|---|---|
| `npm run lint` | Lint (zie §2). |
| `npm test` (`tests/run.mjs`) | Ongeveer 117 tests in headless Chrome (puppeteer-core, SwiftShader), in lite-modus en met meerdere werkers. Filter op naam: `npm test -- ring`. |
| `npm run test:scenarios` (`tests/scenarios.mjs`) | Een bot speelt alle scenario's en beide diensten uit als een goede bedrijfsvoerder. Filter op naam: `node tests/scenarios.mjs datacenter`. |
| `npm run test:stress` (`tests/freeze.mjs`) | Speelt minutenlang **met 3D-beeld** en vuurt storingen en acties af. Controleert fps, geheugen, `LOOP_ERR` en of de lus niet vastloopt. Met `NORENDER=1` worden alleen de JS-kosten gemeten. |

**Hoe een test werkt:**

- Een test is `{name, query, run(page)}`. **`query` is verplicht**; zonder `query` loopt de testopzet vast.
- De pagina opent met `?lite` erachter. In de pagina staat `window.OS` (de exports uit `08-main.js`) en `window.T`:
  - `T.step(min)`: simuleert synchroon;
  - `T.quiet()`: geen willekeurige storingen of taken;
  - `T.op(id, to)`: schakelen, inclusief het afwachten van de veer en de portofoon.
- `Math.random` is geseed per testnaam. Bij een fout zie je het commando om de test met dezelfde seed te herhalen.
- Een paginafout of een `console.error` laat de test falen.

**Nieuwe functie testen:** voeg wat je nodig hebt toe aan `window.OS` (in `08-main.js`) en schrijf een test die de toestand stap voor stap controleert. CI (`.github/workflows/test.yml`) draait lint en de testsuite bij elke push naar `main`.

---

## 13. Conventies, valkuilen en recepten

### Conventies

- **Taal:** de UI en het commentaar zijn Nederlands. Gebruik vaktermen zoals een netbeheerder ze gebruikt (zie §14).
- **Codestijl:** compact, vaak meerdere statements op één regel, zoals de bestaande code. Commentaar staat bij voorkeur op een eigen regel.
- **Eén plek per onderwerp:** een nieuw systeem krijgt een eigen bestand met een passende plek in de volgorde, en een eigen voorvoegsel voor de namen.
- **Prestaties:**
  - Gedeelde materialen; statische meshes worden samengevoegd.
  - Werk dat niet elk beeld hoeft, gaat in de `hudStep`-ronde of krijgt een eigen timer.
  - Canvas-textures alleen opnieuw tekenen als er iets veranderd is.
- **Na elke wijziging:** bouwen, `npm test`, samenvatting (`tests/note.mjs`), commit en push. `index.html` en `version.json` gaan altijd mee in de commit.

### Valkuilen

- **TDZ:** een `const` uit een later bestand gebruiken in code die bij het laden draait. Het symptoom is een `ReferenceError` bij het opstarten.
- **Dubbele namen** tussen bestanden; de lint vangt dit.
- **`//` op een lange regel** slikt de rest van de regel in; de lint vangt het meeste.
- **Iets dat beweegt maar niet `dyn` is**, wordt door `bakeStatic` samengevoegd en beweegt dan niet meer.
- **Een klikvak zonder apparaat in `D`:** `regView` maakt een pickbox. Hoort daar geen `D`-apparaat bij, zorg dan dat niets `D[id]` blind leest. De aanwijsfuncties slaan zulke klikvakken over.
- **Tests zonder `query`**, en exports die ontbreken in `window.OS`.
- **CRLF:** sommige bestanden (onder andere `tests/run.mjs`) hebben Windows-regeleinden. Zoek-en-vervang met `\n` in een patroon matcht daar niet.

### Recept: een scenario toevoegen

1. Kies een scenariobestand (of maak `04j-…js`) en voeg toe met `Object.assign(MODES, {mijnScenario: {scen:true, …}})`.
2. Zet in `setup()` gebeurtenissen met `at(min, fn)`. Gebruik bestaande bouwstenen:
   - storingen: `feederFault`, `ringFault`, `lineFault`;
   - schade: `stationDamage`;
   - brand: `fireStart`;
   - monteurs: `crewDispatch`;
   - SCADA weg: `GAME.flags.scadaDown`;
   - meldingen: `pushAlarm`/`readyNotice`;
   - aftellen: `GAME.countdown`.
3. Leg de toestand vast in `GAME.flags`, controleer doorlopend in `tick(dm)`, en geef doelen in `obj()` met `check()` en eventueel `final()`.
4. Het menu toont het scenario automatisch. Test het met `?play=mijnScenario`, voeg het toe aan `RUNS` in `tests/scenarios.mjs`, en schrijf een test in `tests/run.mjs`.

### Recept: een object in de wereld zetten

1. Controleer de plek met `layFree(rect, ['road', 'stoep', …])` en registreer hem met `lay(kind, …)`.
2. Bouw met `box`, `cyl` en `rod` op `staticRoot` (of een groep) en gebruik gedeelde materialen.
3. Moet je erlangs kunnen lopen, voeg dan een rechthoek toe aan `DISTRICT_RECTS`.
4. Moet het bewegen, hang het dan onder een groep met `userData.dyn = true`.
5. Moet het aanklikbaar zijn als apparaat, maak dan `dev(id, …)` in het netmodel en `regView(id, root, update)`.

---

## 14. Woordenlijst

| Term | Betekenis |
|---|---|
| OS | Onderstation (hier 110/10/20 kV) |
| MS-station | Middenspanningsstation in de wijk (10/0,4 kV), hier ook *kiosk* |
| RMU | Ring main unit: de schakelinstallatie in een MS-station met lastscheiders |
| NOP | Normaal-open punt in een ring |
| LS, OVL | Laagspanning (400/230 V), openbare verlichting |
| Vermogensschakelaar (`cb`) | Kan kortsluitstroom afschakelen |
| Scheider (`ds`) | Zichtbare scheiding, alleen zonder stroom bedienen |
| Lastscheider (`lbs`) | Kan belasting schakelen, geen kortsluiting |
| AR | Automatisch herinschakelen van een lijn |
| AVR | Automatische spanningsregeling met de trappenschakelaar |
| 86 | Uitschakel- en vergrendelrelais van een trafo |
| 50BF | Breaker failure: een weigerende schakelaar laat de volgende afschakelen |
| Klantminuten (CML) | Aantal klanten × minuten zonder stroom |
| RTU | Remote terminal unit: het SCADA-buitenstation in een MS-station |
| Front-end | De SCADA-server die met de RTU's praat |
| KLIC | Melding van graafwerk: vooraf kabels opvragen |
| BEI BHS / BEI LS | Bedrijfsvoeringsvoorschriften van de netbeheerders voor hoog- en laagspanning (op basis van NEN 3840 en NEN 3140): rollen, aanwijzingen en de vijf veiligheidsregels |
| VESDA / INERGEN | Rookaanzuiging / blusgas (stikstof, argon, CO₂) |
