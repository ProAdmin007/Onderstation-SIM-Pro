# Onderstation Simulator: OS Zuidwolde 110/10/20 kV

Een 3D-onderstationsimulator die in de browser draait (Three.js, geen installatie nodig).

![Overzicht van OS Zuidwolde bij avondzon, met het SCADA-eénlijnschema](docs/overzicht.jpg)

**Spelen:** dubbelklik op `index.html` (internet nodig voor Three.js en lettertypen via CDN).

| Transformatorvelden T1–T3 | 20 kV-schakelinstallatie binnen | 's Nachts met terreinverlichting |
|---|---|---|
| ![Transformatorvelden](docs/transformatoren.jpg) | ![20 kV-binnenruimte](docs/binnen-20kv.jpg) | ![Nachtbeeld](docs/nacht.jpg) |

## Bediening
- Klik op een schakelaar in 3D of in het SCADA-schema en kies vervolgens IN/UIT of SLUITEN/OPENEN.
- Linker muisknop draaien, rechter muisknop schuiven, scrollen om te zoomen.
- `1`–`7` camerastandpunten (6 = binnen 10 kV, 7 = binnen 20 kV) · `spatie` pauze · `L` labels · `M` geluid · `Esc` deselecteren

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
- **SCADA** heeft tabbladen voor 10 kV en 20 kV.

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

## Ontwikkelen
De broncode staat in `src/` (HTML/CSS plus JS-modules in volgorde). Bouw `index.html` opnieuw met:

```powershell
./build.ps1
```

URL-parameters om te testen: `?autostart`, `?t=18.5` (starttijd), `?view=0..6`, `?night`, `?play=zkh|storm|piek|blackout|day|eve|free&diff=rustig|normaal|zwaar`.
