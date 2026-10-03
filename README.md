# Onderstation Simulator: OS Zuidwolde 110/10/20 kV

Een 3D-onderstationsimulator die in de browser draait (Three.js, geen installatie nodig).

![Overzicht van OS Zuidwolde bij avondzon, met het SCADA-eénlijnschema](docs/overzicht.jpg)

**Spelen:** dubbelklik op `index.html` (internet nodig voor Three.js en lettertypen via CDN).

| Transformatorvelden T1–T3 | 20 kV-schakelinstallatie binnen | 's Nachts met terreinverlichting |
|---|---|---|
| ![Transformatorvelden](docs/transformatoren.jpg) | ![20 kV-binnenruimte](docs/binnen-20kv.jpg) | ![Nachtbeeld](docs/nacht.jpg) |

| Wijk met de 10 kV-ring | Monteurs bij een inspectie |
|---|---|
| ![Wijk en MS-ring](docs/wijk.jpg) | ![Monteurs bij T2](docs/monteurs.jpg) |

## Bediening
- Klik op een schakelaar in 3D of in het SCADA-schema en kies vervolgens IN/UIT of SLUITEN/OPENEN.
- Linker muisknop draaien, rechter muisknop schuiven, scrollen om te zoomen.
- `1`–`9` camerastandpunten (6 = binnen 10 kV, 7 = binnen 20 kV, 8 = woonwijk, 9 = centrum en De Vaart)
- **Rondlopen (first person):** druk op `V` of op de knop *Rondlopen*.
  - Je loopt met `WASD`, rent met `Shift` en kijkt rond met de muis.
  - Richt het kruis op een schakelaar: `F` schakelt direct. `E` maakt de cursor vrij (en opent het paneel als je naar een schakelaar kijkt), zodat je ook in het SCADA-schema kunt schakelen. Met nog een keer `E` loop je verder.
  - Je loopt niet door apparatuur, muren, huizen of het hek. De gebouwen kun je via de deuren in, en via de open poort loop je de wijk in naar de MS-stations.
  - Met `V` stop je met rondlopen; met nog een keer `V` ga je verder waar je was.
  - Lopen gaat met 2,2 m/s, rennen met `Shift` met 8 m/s en sprinten met `Q` met 16 m/s. Met `spatie` spring je; pauzeren gaat tijdens het rondlopen met `P`.
- **Pauzemenu (`Esc`):** hervatten, de dienst beëindigen met rapport, of de score opslaan en terug naar het hoofdmenu.
- **Klaar om te schakelen:** als de storingsdienst of TenneT klaar is, of een transformator weer gereset mag worden, hoor je een oplopend klokgeluid en verschijnt een groene banner. Het betreffende veld knippert groen in SCADA en in 3D tot je het schakelt. · `spatie` pauze · `L` labels · `M` geluid · `Esc` deselecteren

## Installatie
- **110 kV:** twee lijnvelden (L1 Hoogeveen, L2 Meppel), een railsysteem en drie transformatorvelden.
- **T1** (110/10,5 kV, 31,5/40 MVA) voedt de 10 kV-installatie: rail A en B, normaal gekoppeld via V-K, met de velden F1–F6.
- **T2** (110/21 kV, 20/25 MVA) voedt de 20 kV-installatie in het tweede gebouw: rail C met G1 Zonnepark (productie en teruglevering), G2 Industrieterrein Noord, G3 Buitengebied Oost en G4 Waterzuivering.
- **T3** is de omschakelbare reservetransformator (110/10,5-21 kV, 20/25 MVA).
  - Hij staat als warme reserve op 10 kV.
  - Via **V-T3** voedt hij 10 kV-rail B, via **W-T3** 20 kV-rail C.
  - Omschakelen kan alleen spanningsloos (T3-Q0, V-T3 en W-T3 UIT).
  - Inschakelen op de verkeerde spanning blokkeert de vergrendeling. Met de vergrendelingen uit leidt het tot een incident en wikkelingsschade.
  - Let op: T3 is kleiner dan T1. Neemt hij tijdens de avondpiek de hele 10 kV over, dan raakt hij overbelast.
- **Twee 10 kV-ringen achter het station:**
  - **Ring Woonwijk:** V-F3 (rail A) → MS1–MS5 → V-F4 (rail B), normaal-open punt **MS3-R**.
  - **Ring Centrum – De Vaart:** V-F1 → MS6 Marktplein → MS7 Stationsstraat ‖ MS8 De Vaart Noord → MS9 De Vaart Zuid → V-F2, normaal-open punt **MS7-R**. Het centrum heeft appartementen met winkels, een plein en een station; bedrijventerrein De Vaart heeft hallen, een bouwmarkt en een tankstation.
  - Elk station heeft lastscheiders naar links en rechts, een transformatorschakelaar, een 10/0,4 kV-trafo en laagspanningsvelden naar woonwijken, een school, een supermarkt, een huisartsenpost, een laadplein en bedrijven.
  - Bij een kabelfout spreken **kortsluitverklikkers** aan bij de stations tussen het voedingspunt en de fout. Isoleer de kabel achter het laatste station met een verklikker, sluit het normaal-open punt en schakel het veld weer in.
- **Stroom en spanning in de ringkabels:** per kabelsectie wordt de belastingstroom berekend (rating 330 A, kopkabels 400 A), plus de spanning per station inclusief het spanningsverlies over de kabels.
  - In SCADA zie je de stroom per veld, MW en kV per station, en kabels die oranje of rood knipperen bij hoge belasting.
  - Bij overbelasting krijg je een alarm. Blijft een kabel lang boven 130 %, dan brandt hij door.
- **Straatverlichting:** elk MS-station heeft een LS-veld *Openbare verlichting* met een schemerschakeling. Alle lantaarns hangen aan het dichtstbijzijnde station en gaan uit als dat station of het OVL-veld spanningsloos is, met een lichtvlek op straat als ze branden.
- **Inloop-MS-stations:** elk ringstation kun je in, via de open deur of met de knop *Naar binnen* in het stationspaneel. Binnen staan:
  - een compacte RMU met de velden L, T en R, met standmelders, spanningslampjes en een kortsluitverklikker (KSV);
  - een laagspanningsrek met een hoofdschakelaar en NH-lastscheiders per LS-veld (de klep gaat echt open of dicht);
  - de distributietransformator achter een gaashek.
  Schakelen gaat met het richtkruis: `F` voor direct schakelen, `E` voor het paneel.
- **Portofoon:** monteurs hebben een naam en melden zich bij aankomst en als het werk klaar is. Wil je schakelen aan of vlakbij hun werk, dan opent eerst het portofoonvenster:
  - **melden**: de monteur bevestigt en daarna wordt er geschakeld (+10);
  - **zonder melden schakelen**: −50 en een boze monteur;
  - **annuleren**.
- **Monteurs:** collega's in een veiligheidsvest lopen het station of de wijk in bij inspecties, werkopdrachten en kabelfouten, en vertrekken weer als het werk klaar is.
- **SCADA** heeft tabbladen voor 10 kV, 20 kV en de ring. Zoomen kan met de knoppen **−/+**, met `Ctrl` + scrollwiel of met de toetsen `+` en `−` (75–250 %). Het paneel wordt dan mee breder.

## Geluid
Alle geluid wordt in de browser gemaakt (Web Audio) en hangt af van waar je bent:
- **In de MS-gebouwen:** zoemen van de installatie en ventilatie.
- **In een MS-station:** trafobrom die meegroeit met de belasting.
- **Op het 110 kV-terrein:** transformatorbrom en corona-geknetter (sterker bij regen en mist).
- **In de wijk:** verkeersgeruis, passerende auto's, vogels overdag en krekels op zomer- en lenteavonden.
- **Overal:** wind, regen en onweer.

## Seizoenen en weer
- **Seizoenen** (lente, zomer, herfst, winter) kies je in het menu. Ze bepalen:
  - zonsopkomst, zonsondergang en zonnehoogte;
  - de buitentemperatuur;
  - de belasting (winter: verwarming, zomer: airco);
  - de opbrengst van het zonnepark;
  - de schakeltijden van kassen en straatverlichting.
- **Weer:** helder, bewolkt, regen, onweer, mist, sneeuw (met sneeuwdek) en hittegolf, wisselend tijdens een dienst. Het weer beïnvloedt:
  - lucht en zicht;
  - neerslag;
  - transformatortemperaturen;
  - zonne-opbrengst;
  - de kans op blikseminslag.
- De weerindicator met de buitentemperatuur staat in de bovenbalk. Voor testen kun je `?season=winter&weer=sneeuw` gebruiken.

## Spelmodi en score
- **Vrije dienst:** eindeloos spelen.
- **Dagdienst** (07–15 u) en **Avonddienst** (15–23 u): een dienst van 8 uur met een dienstrapport, een cijfer (A+ t/m E), sterren, badges en een highscore.
- **Scenario's:**
  - *Kabelstoring ziekenhuis*: T1 valt uit en het ziekenhuis draait op noodstroom.
  - *Storm boven Drenthe*: regen, onweer, blikseminslagen en een defect AR-relais.
  - *Avondpiek op één poot*: T1 staat in onderhoud en reservetransformator T3 draagt de 10 kV; schakel de kassen af om T3 heel te houden.
  - *Black-out*: bouw het station weer op.
- **Moeilijkheid:** Rustig, Normaal of Zwaar. Dit bepaalt hoe vaak storingen optreden en hoe vaak een fout blijvend is.
- **Score:** je begint met 1.000 punten.
  - Erbij: snel herstel van een onverwachte onderbreking (+20 of +40), een behaald doel (+100), een voltooide werkopdracht (+150) en een dienst zonder incidenten (+200).
  - Eraf: klantminuten, het ziekenhuis zonder net, veiligheidsincidenten (−150), een gemist doel (−150), thermische trips (−100), inschakelen op een fout (−40), overbelasting (−30), spanningsafwijkingen en circulatiestroom (−20).
- Tijdens een pauze kun je niet schakelen.

## 10 kV-gebouw
Binnen staat een rij van 13 metaalomsloten schakelvelden (V-T1, F1–F3, meetveld, koppeling V-K, F4–F6, V-T2). Elk veld heeft een live display, mimic-schema met standmelder en spanningslampjes. Klik op een veld om het te bedienen. Verder: beveiligingskasten, bedieningsbureau met live SCADA- en meldingenscherm, accubatterij en eigenbedrijfstransformator.

## Spelregels (bewust simpel)
- Een scheider (Q1/Q9) schakel je alleen als de vermogenschakelaar (Q0) van hetzelfde veld UIT staat. Doe je dat met de vergrendelingen uit, dan ontstaat er een vlamboog.
- Sluit een aardschakelaar (Q8) alleen op een spanningsloze lijn.
- Willekeurige storingen: blikseminslag op een lijn, kabelfouten in 10 kV-velden en transformatortrips.
- Werkopdrachten: velden of transformatoren vrijschakelen voor onderhoud en daarna weer in bedrijf nemen.
- Een transformator is 20 MVA (ONAN) of 25 MVA met ventilatoren (ONAF). Draait één transformator alles tijdens de avondpiek, dan wordt hij te warm en schakelt hij af bij een olietemperatuur van 100 °C.

## Realistische bedrijfsvoering
- **Spanningsregeling:** de 110 kV-netspanning varieert over de dag. De trappenschakelaar (17 standen, 1,25 % per trap) houdt de 10 kV-rail op 10,50 kV ±1,2 %. AUTO of HAND kies je in het transformatorpaneel. Bij gekoppelde rails regelen de transformatoren als master-follower. Ongelijke trappen geven circulatiestroom en extra belasting.
- **Synchrocheck:** V-K schakelt alleen in bij minder dan 0,25 kV spanningsverschil tussen rail A en rail B.
- **Automatische herinschakeling (AR)** op de 110 kV-lijnen: een tijdelijke fout wordt na 1 s dode tijd hersteld, een blijvende fout leidt tot lockout. AR zet je per lijn aan of uit.
- **Inschakelveer:** na het inschakelen laadt de veer ongeveer 7 s; zolang dat duurt kan de schakelaar niet opnieuw inschakelen.
- **Blokkeerrelais 86:** na een transformatortrip handmatig resetten, en pas na de inspectie of na afkoelen tot onder 75 °C.
- **Kabelstoringen:** eerst zoekt de storingsdienst de fout (inschakelen geeft dan direct weer een trip), daarna wordt de fout geïsoleerd en kun je het veld inschakelen. Een deel van de klanten wacht nog op de reparatie.
- **Koude-lastopname:** na een lange onderbreking ligt de belasting tijdelijk tot 60 % hoger. Een vertraagde overstroombeveiliging (I>) kan dan afschakelen.
- **Aardschakelaars kabelzijde** (F1-Q8 … F6-Q8) met een opdracht voor kabelwerk, waarbij de klanten eerst via het net worden omgeschakeld.

## Tests
Automatische tests sturen de simulator aan in headless Chrome: vergrendelingen, vlamboog, reservetransformator, ringfout met terugvoeding, spanningsregelaar, het ziekenhuisscenario en het pauzemenu.

```powershell
npm install
npm test            # of: npm test -- ring   (alleen tests met 'ring' in de naam)
```

Gebruik `CHROME_PATH` als Chrome niet op een standaardplek staat.

## Ontwikkelen
De broncode staat in `src/` (HTML/CSS plus JS-modules in volgorde). Bouw `index.html` opnieuw met:

```powershell
./build.ps1
```

URL-parameters om te testen: `?autostart`, `?t=18.5` (starttijd), `?view=0..6`, `?night`, `?play=zkh|storm|piek|blackout|day|eve|free&diff=rustig|normaal|zwaar`.
