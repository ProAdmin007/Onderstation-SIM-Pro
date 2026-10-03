# Onderstation Simulator: OS Zuidwolde 110/10 kV

Een 3D-onderstationsimulator die in de browser draait (Three.js, geen installatie nodig).

**Spelen:** dubbelklik op `index.html` (internet nodig voor Three.js en lettertypen via CDN).

## Bediening
- Klik op een schakelaar in 3D of in het SCADA-schema en kies vervolgens IN/UIT of SLUITEN/OPENEN.
- Linker muisknop draaien, rechter muisknop schuiven, scrollen om te zoomen.
- `1`–`6` camerastandpunten (6 = binnen in het 10 kV-gebouw) · `spatie` pauze · `L` labels · `M` geluid · `Esc` deselecteren

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

URL-parameters om te testen: `?autostart`, `?t=18.5` (starttijd), `?view=0..5`, `?night`.
