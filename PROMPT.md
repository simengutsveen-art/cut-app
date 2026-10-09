# Bygg «Cut» – en mobilapp for Simens 12-ukers cut

Du er Claude Code og skal bygge en ferdig, fungerende mobilapp i denne mappen. Appen skal erstatte dokumentet *12-ukers cut-plan* og Excel-filen *Cut-tracker.xlsx* som Simen bruker i dag. Les **hele** denne filen og `seed-data.json` før du skriver kode.

All data om planen ligger i `seed-data.json`: mål, ingredienser med næringsverdier og priser, måltider, øvelser, økter, faser, progresjonsregler, core-rutine, justeringsregler og veiledningstekster. **Ingen måltider, øvelser eller tall fra planen skal hardkodes i komponentene.** Simen skal fortsatt endre på mat og øvelser, både i appen og i seed-fila.

---

## 1. Om brukeren og bruken

- Simen, 22 år, 185 cm, startvekt 80,2 kg og livvidde 92 cm. Moderat cut i 12 uker fra mandag 12.10.2026 (kan endres).
- Han bruker **iPhone** og har en **Windows-PC**. Han har ikke Mac og ikke Apple Developer-konto.
- Alt i appen skal være på **norsk bokmål**. Bruk norsk tallformat (komma som desimaltegn og mellomrom som tusenskille: `2 400 kcal`, `80,2 kg`) og datoformatet `dd.mm.yyyy`. Uka starter på mandag (ISO-uker).
- Appen brukes på treningssenteret med svett tommel og dårlig dekning. Det betyr store trykkflater, få trykk per handling, og at **alt må fungere offline**.
- Det er én bruker. Ingen innlogging og ingen server.

## 2. Teknisk valg (ikke avvik uten å spørre)

Bygg en **installerbar PWA**, som Simen legger til på Hjem-skjermen i Safari. Det er det eneste som fungerer på iPhone uten Mac, uten App Store og uten at en PC må stå på.

- **Vite + React 18 + TypeScript** (`strict: true`)
- **vite-plugin-pwa** (Workbox): manifest, ikoner (inkludert `apple-touch-icon` 180×180), `display: standalone`, offline-precache av app-skallet og alle øvelsesbildene
- **Dexie** (IndexedDB) til all lagring. Kall `navigator.storage.persist()` ved oppstart.
- **zod** til å validere `seed-data.json` og importerte backup-filer
- **React Router** (hash-router, så det fungerer på GitHub Pages)
- **Recharts** til grafer
- **Tailwind CSS** til styling
- **date-fns** med norsk locale
- **Vitest + Testing Library** til enhets- og komponenttester, og **Playwright** (WebKit, iPhone 14-viewport) til ende-til-ende-tester
- **ESLint + Prettier**

Bruk eksakte versjoner som er minst to uker gamle, og lås dem i `package-lock.json`.

## 3. Datamodell

Lag typer i `src/types.ts` som speiler `seed-data.json`, og zod-skjemaer i `src/data/schema.ts`. I Dexie (`src/db.ts`) skal disse tabellene finnes:

| Tabell | Innhold |
| --- | --- |
| `settings` | Én rad: alt under `settings` i seed-fila, pluss gjeldende kcal-mål og skrittmål etter justeringer |
| `ingredients` | Ingredienser (næring per 100 g, pakning, pris, butikk, prisskilde, enhet) |
| `meals` | Måltider (slot, ingredienser per porsjon, steg, meal prep ja/nei, aktiv ja/nei) |
| `exercises` | Øvelser (navn, bilde-ID, lasttype, muskler, tips, alternativ, ryggnotat) |
| `sessions` | Økter med forskrevne øvelser (sett, rep-spenn, RIR, pause, startvekt, aktiv fra/til uke) |
| `dayLogs` | Én rad per dato: vekt, skritt, valgte måltider per slot, ekstra matposter, core gjort, smerte 0–10, notat |
| `workoutLogs` | Én rad per gjennomført økt: dato, økt-ID, uke, og per øvelse en liste med sett `{kg, reps, rir?}` |
| `measurements` | Livvidde per dato, og valgfrie bilder (Blob, lagres lokalt) |
| `adjustments` | Logg over justeringer Simen har godtatt (dato, regel-ID, kcal-endring, skrittendring) |
| `meta` | `schemaVersion`, `seedVersion`, tidspunkt for siste backup |

Alle redigerbare entiteter (ingredienser, måltider, øvelser, økter) har feltene `source: 'seed' | 'user'` og `userModified: boolean`.

### Seed og senere endringer (viktig)

1. Første gang appen starter, valideres `seed-data.json` med zod og lastes inn i databasen.
2. Når `seedVersion` i fila er nyere enn i databasen, skal appen tilby «Oppdater plan». Da oppdateres bare elementer som **ikke** er `userModified`, nye elementer legges til, og ingenting slettes. Til slutt vises en oppsummering av hva som ble endret.
3. Hvert element Simen har endret, får en knapp: «Tilbakestill til standard».
4. Logger (vekt, økter, mat) slettes eller endres aldri av seed-oppdateringer.
5. Lag Dexie-migrasjoner fra første versjon (`db.version(1)`), slik at framtidige skjemaendringer ikke mister data.

## 4. Beregninger

Legg alle disse som rene funksjoner i `src/lib/`, uten React, og test dem.

- **Uke i planen:** `uke = floor((dato − startDate) / 7) + 1`, begrenset til 1–12. Før start vises «Starter om X dager», og etter uke 12 vises «Planen er ferdig».
- **Dagens økt:** `settings.weeklySchedule` (ISO-ukedag → økt-ID eller `hvile`).
- **Forskrivning for en uke:** finn fasen i `phases` for uka. `setsDelta` legges til antall sett, og `setsFactor` ganges med antall sett og rundes opp. Minimum er 1 sett. `rirOverride` erstatter RIR. Filtrer på `activeFromWeek` og `activeUntilWeek`.
  - *Uke 1:* benkpress = 3 sett, RIR 3.
  - *Uke 7:* benkpress = 2 sett, RIR 3–4.
  - *Uke 8:* knebøy dukker opp i Bein-økta.
  - *Uke 1–2:* dead bug i økt 5. Fra uke 3 erstattes den av hengende kneløft.
- **Måltid:** makroer = Σ `per100g × gram / 100`. Pris = Σ `pack.priceNok / pack.grams × gram`. For meal prep skal batch-mengder vises (× `batchPortions`) og rundes fornuftig av (f.eks. «680 g kyllingfilet», «2 løk» når enhet finnes).
- **Dag:** summen av valgte måltider og ekstra poster. Sammenlign med kcal-mål ± `kcalTolerance` og med proteinmålet.
- **Skrittmål:** fra `settings.steps` for uka, med eget mål for onsdag. Godtatte justeringer kommer i tillegg.
- **Ukesnitt for vekt:** gjennomsnitt av alle vektene i ISO-uka i planen.
- **Tap per uke:** `(snitt(uke n−2) − snitt(uke n)) / 2`, fra uke 3.
- **Endring i livvidde:** `livvidde(uke n−2) − livvidde(uke n)`. Mangler måling, brukes startmålet i uke 1. Bruk siste måling i hver uke.
- **Anbefaling:** følg `adjustmentRules` nøyaktig, i den rekkefølgen tersklene står (> 0,7 / 0,3–0,7 / 0,1–0,3 med og uten nedgang i livvidden / < 0,1 med og uten nedgang). Regelen `stopp` gir først «+2 000 skritt». Har en `stopp`-justering med skritt allerede blitt godtatt de siste 2 ukene, og regelen slår til igjen, foreslås «−150 kcal». Et forslag kan aldri ta kcal-målet under `kcalFloor`. Da vises en advarsel i stedet.
- **Målkurve:** `startWeightKg − plannedLossKgPerWeek × uke`.
- **Prognose uke 12:** `startvekt − snittTapPerUke × 12`.
- **Progresjonsforslag (dobbel progresjon):** se på forrige logg av samme øvelse. Har alle arbeidssett nådd `repMax` (og RIR ikke er under målet, hvis RIR er logget), foreslås ny vekt = forrige + `progression.incrementsKg[loadType]`. For manualer gir det nærmeste par over (+2 kg). Ellers foreslås samme vekt med mål om +1 rep på det svakeste settet. For `kroppsvekt` og `core` foreslås flere reps eller meter. Hvis beste e1RM (Epley: `kg × (1 + reps/30)`) har gått ned tre økter på rad, vises `progression.stallRule`.
- **Handleliste for en uke:** prep-måltidene fra `mealPrepRotation` for uka, ganger 4 porsjoner hver. Frokost og kveldsmat hentes fra Simens valgte standardmåltider for uka (standard er `standardDay`), ganger 7. Summer gram per ingrediens. For ingredienser med `isPantryStaple` vises bare forbruket. For resten er antall pakker `ceil(gram / pack.grams)`. Grupper per `category`, vis pris per linje og totalsum, og legg til en avkrysning for «har hjemme» som trekker linja fra summen.

## 5. Skjermer

Nederst skal det være en fast fanelinje med fem faner: **I dag · Trening · Mat · Fremgang · Mer**. Husk safe-area-innrykk på iPhone.

### I dag
- Øverst: «Uke 3 av 12 · Bygg 1» og dagens dato.
- Rask registrering av morgenvekt og skritt (tallfelt med desimalkomma og stort tastatur).
- Kort for dagens økt (eller «Hviledag: lang tur») med en knapp som starter økta.
- Ringer eller stolper for kcal og protein mot målet, og dagens pris.
- Avkrysning for core-rutinen, og smerte 0–10 med trafikklysfarge.
- Påminnelser: meal prep på søndag og onsdag, og måling og bilder på søndag.

### Trening
- Ukeoversikt som viser hvilke økter som er gjort.
- **Øktvisning:** alle øvelser med bilde (start → slutt), sett × reps, RIR, pause, tips og forslag fra forrige gang (for eksempel «Forrige: 60 × 8, 8, 7, 6 → prøv 60 × 8, 8, 8, 7»).
- Logging av sett: forhåndsutfylt med forslaget, ±-knapper for kg og reps, og RIR som valgfritt felt. Ett trykk merker et sett som ferdig.
- **Pausetimer** starter automatisk når et sett er merket ferdig. Den skal bruke tidsstempler, så den viser riktig tid etter at skjermen har vært låst. Den piper eller varsler med lyd når tida er ute, og knappene «+30 s» og «Hopp over» finnes.
- Bytte til alternativ øvelse midt i en økt (`alternative` eller hvilken som helst øvelse).
- Historikk per øvelse: graf over beste e1RM og tyngste sett, og PR-merke.
- Halvferdige økter skal lagres fortløpende, slik at ingenting forsvinner hvis appen lukkes.

### Mat
- **Dagens plan:** fire slots (frokost, lunsj, middag, kveldsmat). Trykk på en slot for å bytte måltid, og se kcal, protein og pris før du velger. Det skal være mulig å legge til ekstra poster («fleksipott»: navn, kcal, protein). Dagens sum vises mot målet.
- **Måltidsbibliotek:** filter per slot, kort med makroer og pris, detaljside med ingrediensliste (per porsjon og per batch med 4 porsjoner) og steg.
- **Meal prep:** ukas prep-plan fra rotasjonen, med batchoppskrifter og «Merk som laget».
- **Handleliste:** for valgt uke, se beregningen over. Den skal kunne deles som tekst via Web Share.
- Advarsel hvis et måltid inneholder noe fra `dislikedFoods` (sjekk ingrediensnavn).

### Fremgang
- Vektgraf: daglige punkter, ukesnitt, målkurve og stiplet prognose.
- Graf for livvidde, ukesnitt for skritt og treningsoppmøte (økter fullført av 5 per uke).
- Tall: ned totalt, snitt per uke, livvidde ned og prognose for uke 12.
- **Ukessjekk (søndag):** viser anbefalingen fra reglene med begrunnelse og tall, og knappene «Godta» og «Ikke nå». Når Simen godtar, oppdateres kcal- eller skrittmålet og det logges i `adjustments`.
- Progresjonsbilder: ta eller velg bilde med `<input type="file" accept="image/*" capture>`, lagre lokalt, og vis side om side (første mot siste).

### Mer
- **Core og rygg:** rutinen med bilder (bildefri plassholder med tekst for McGill curl-up og bird dog), dosering, progresjon, smerte-trafikklys, røde flagg og nødtekst. Logger Simen smerte ≥ 6, eller to dager på rad med gult, vises et kort med rådene og røde flagg.
- **Guide:** søvn, tilskudd, alkohol, skritt, ryggteknikk og måling (fra `guides`).
- **Rediger data:** CRUD for ingredienser, måltider, øvelser og økter.
  - Ingrediensskjema: navn, kcal, protein, karbo, fett per 100 g, pakning, pris, butikk, enhet og kategori.
  - Måltidsskjema: velg ingredienser og gram, slot, steg, meal prep ja/nei og aktiv ja/nei. Makroer og pris oppdateres live.
  - Øktskjema: legg til, fjern og sorter øvelser, og sett sett, rep-spenn, RIR, pause og aktiv fra/til uke.
  - Øvelsesskjema: navn, bilde-ID fra Free Exercise DB **eller** eget bilde, lasttype og tips.
  - Det skal ikke være mulig å slette noe som brukes i logger. Tilby «Deaktiver» i stedet.
- **Innstillinger:** startdato, mål, ukeplan (hvilken økt hvilken dag), toleranse og gulv for kcal.
- **Backup:** «Eksporter alt» til en JSON-fil (via Web Share på iOS, nedlastingslenke ellers) og «Importer» med zod-validering og forhåndsvisning før noe overskrives. Påminnelse hvis det er mer enn 7 dager siden siste backup.
- «Nullstill app» med to bekreftelser bygget inn i siden. Ikke bruk `confirm()`.

## 6. Øvelsesbilder

Alle øvelser har `imageSourceId` fra [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (Unlicense / public domain). Lag `scripts/fetch-images.mjs`, som laster ned `exercises/{id}/0.jpg` og `1.jpg` fra `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/` til `public/exercises/{id}/`. Skriptet skal:

- bare hente bildene som brukes i seed-fila,
- hoppe over bilder som allerede finnes,
- skrive en tydelig feilmelding hvis en ID ikke finnes.

Kjør skriptet og **commit bildene**, slik at appen fungerer offline og ikke er avhengig av GitHub. Egne bilder fra «Rediger data» lagres som Blob i IndexedDB. Vis en plassholder med øvelsesnavnet når et bilde mangler. Lag en kreditering i Mer → Om.

## 7. Design

- Mørkt tema som standard (treningssenter) og lyst tema som valg. Følg `prefers-color-scheme`.
- Én tydelig aksentfarge. Semantiske farger: grønn = i rute, gul = følg med, rød = advarsel.
- Store tall for vekt, kcal og sett. Trykkflater på minst 44 × 44 pt. Ingen horisontal scrolling på 375 px bredde.
- Respekter `prefers-reduced-motion`. Sørg for synlig fokus og `aria-label` på ikonknapper.

## 8. Arbeidsmåte

1. Les denne fila og `seed-data.json`. Skriv en kort plan i `PLAN.md` med milepælene under, og start med én gang. Spør Simen bare hvis noe er umulig eller i strid med denne fila.
2. Bygg i milepæler. Etter **hver** milepæl skal `npm run check` (se under) være grønn før du committer med en tydelig melding.
   - **M1** Prosjektoppsett, PWA-skall, zod-validering av seed, Dexie, seeding, fanelinje
   - **M2** `src/lib/` med alle beregninger og enhetstester
   - **M3** Trening (økt, logging, timer, progresjon, historikk)
   - **M4** Mat (dagsplan, bibliotek, meal prep, handleliste)
   - **M5** I dag og Fremgang (grafer, ukessjekk, justeringer, bilder)
   - **M6** Mer (core og rygg, guide, rediger data, innstillinger, backup og import, seed-oppdatering)
   - **M7** Bildeskript, offline-test, deploy-oppsett, README, sluttsjekk
3. Ikke finn på næringsverdier, priser eller øvelser. Bruk det som står i seed-fila. Mangler noe, legg til en `TODO` i `PLAN.md` og si fra.

## 9. Kvalitetskrav («sørg for at alt funker»)

Lag disse skriptene i `package.json`: `typecheck`, `lint`, `test`, `build`, `e2e`, og `check` som kjører alle i rekkefølge. Alt skal være grønt før du sier at du er ferdig.

### Enhetstester (Vitest)

Tester med eksakte tall skal bruke en **fast kopi** av seed-fila i `tests/fixtures/seed-2026-10-09.json`, slik at Simens senere endringer i `seed-data.json` ikke knekker testene. Lag i tillegg generiske tester mot den ekte seed-fila: at den validerer, at alle referanser finnes, at ingen ID-er er dupliserte, og at alle `imageSourceId` har bilder i `public/exercises/`.

Forventede verdier fra fixture (tillat ±1 på kcal og gram, og ±0,5 kr):

| Måltid | kcal | Protein | Karbo | Fett | Pris |
| --- | --- | --- | --- | --- | --- |
| F1 Proteingrøt | 664 | 46,2 | 80,0 | 15,5 | 22,22 |
| L1 Kylling-risbowl | 643 | 52,0 | 75,2 | 13,9 | 33,21 |
| L2 Kyllingwraps ×2 | 696 | 54,4 | 86,1 | 14,1 | 40,60 |
| D1 Kylling i karri | 658 | 50,4 | 78,7 | 14,6 | 35,16 |
| D2 Taco-kjøttdeig med ris | 675 | 40,9 | 79,7 | 20,1 | 29,07 |
| K1 Skyr-bowl + 1 skive | 382 | 37,8 | 44,6 | 5,2 | 26,80 |
| K3 Proteinshake + banan + skive | 427 | 38,9 | 55,9 | 4,8 | 21,08 |
| **Standarddag (F1 + L1 + D1 + K1)** | **2 347** | **186,3** | **278,4** | **49,1** | **117,4** |

- Alle 180 kombinasjoner av én frokost, én lunsj, én middag og én kveldsmat ligger mellom 2 193 og 2 465 kcal.
- Ukeberegning: med start 12.10.2026 er 12.10 = uke 1, 18.10 = uke 1, 19.10 = uke 2, 28.12.2026 = uke 12, 11.10 = «starter om 1 dag».
- Faser: se eksemplene i avsnitt 4 (uke 1, 7 og 8 og dead bug/kneløft).
- Justeringsregler: én test per regel, pluss en test for kcal-gulvet og en for «skritt først, så kcal».
- Progresjon: 60 kg × 8, 8, 8, 8 i benkpress (rep-spenn 5–8) → 62,5 kg. 60 × 8, 7, 6, 6 → 60 kg. Manualer 24 kg på toppen → 26 kg. Beinpress → +10 kg.
- Handleliste for uke 1 med standard frokost (F1) og kveldsmat (K1): kyllingfilet totalt 2 000 g → 2 pakker. Proteinpulver vises som basisvare (forbruk 210 g), ikke som pakke.
- Seed-oppdatering: et element som er endret av brukeren, overskrives ikke. Et nytt element legges til.
- Backup: eksport → import gir identisk database.

### Ende-til-ende (Playwright, WebKit, iPhone 14)

1. Første oppstart seeder, og «I dag» viser riktig uke.
2. Registrer vekt 80,2 og skritt 9 500 → verdiene vises igjen etter omlasting.
3. Start Push-økta → logg 3 sett i benkpress → lukk siden midt i → åpne igjen, og økta er der fortsatt → fullfør.
4. Bytt lunsj til L3 → dagens kcal oppdateres.
5. Rediger ingrediensen «Kyllingfilet» til 110 kcal → L1 viser ny kcal, og «Tilbakestill til standard» gir 643 igjen.
6. Lag en ny øvelse og legg den i økt 4.
7. Eksporter → nullstill → importer → dataene er tilbake.
8. **Offline:** last appen, gå offline i Playwright, last på nytt, og alle faner og bilder fungerer.

Kjør i tillegg en Lighthouse PWA-sjekk mot `npm run preview` og rett det som feiler.

## 10. Deploy og installasjon

- Sett opp **GitHub Pages** med en GitHub Actions-workflow (`.github/workflows/deploy.yml`) som kjører `npm ci && npm run check && npm run build` og publiserer `dist/`. Sett `base` i Vite riktig for repo-navnet.
- Skriv `README.md` på norsk med:
  1. Hvordan Simen kjører appen lokalt på Windows (`npm install`, `npm run dev`, og åpne på telefonen via samme Wi-Fi med `--host`. Merk at PWA-installasjon krever HTTPS, så det er bare til testing).
  2. Hvordan han lager et GitHub-repo, pusher og slår på Pages, steg for steg.
  3. Installasjon på iPhone: åpne lenka i **Safari** → Del-knappen → «Legg til på Hjem-skjerm».
  4. Hvordan han endrer mat og øvelser: enten i appen (Mer → Rediger data), eller i `seed-data.json` ved å bumpe `seedVersion` og deploye. Forklar forskjellen.
  5. Backup: hvorfor og hvordan.
  6. Begrensninger: en PWA kan ikke lese skritt fra Apple Helse automatisk, så skritt føres manuelt (eller via snarveien i avsnitt 11).

## 11. Valgfritt til slutt (bare når alt over er grønt)

- **Snarvei for skritt:** appen leser `#/logg?steps=1234&date=2026-10-12` fra URL-en og lagrer skrittene. Beskriv i README hvordan Simen lager en iOS-snarvei: Helse → «Finn helseeksempler: Skritt i dag» → regn sum → «Åpne URL» med app-adressen.
- Eksport av daglig logg til CSV, så han kan åpne den i Excel.

## 12. Ferdig betyr

- [ ] `npm run check` og `npm run e2e` er grønne
- [ ] Appen fungerer offline etter første lasting, inkludert øvelsesbildene
- [ ] Alt innhold kommer fra `seed-data.json` eller databasen, og ingenting er hardkodet
- [ ] Mat, øvelser og økter kan legges til, endres, deaktiveres og tilbakestilles i appen
- [ ] Logger overlever seed-oppdatering, omlasting og eksport/import
- [ ] README forklarer deploy, iPhone-installasjon og endring av plan
- [ ] Du har listet opp i sluttmeldingen hva som er gjort, hva som er testet, og eventuelle TODO-er

Næringsverdier og priser er omtrentlige (se `disclaimer` i seed-fila). Appen gir ikke medisinske råd. Vis disclaimeren i Mer → Om, og vis rygg-advarslene slik de står i `coreRoutine`.
