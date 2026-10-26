# Plan: «Cut» – PWA for 12-ukers cut

Installerbar PWA (Vite + React 18 + TypeScript strict) som erstatter cut-plan-dokumentet og
`Cut-tracker.xlsx`. All plan-data kommer fra `seed-data.json` → validert med zod → lagret i
IndexedDB (Dexie). Ingen server, ingen innlogging, alt fungerer offline.

## Milepæler

| #   | Innhold                                                                                    | Status |
| --- | ------------------------------------------------------------------------------------------ | ------ |
| M1  | Prosjektoppsett, PWA-skall, zod-validering av seed, Dexie, seeding, fanelinje              | ⬜     |
| M2  | `src/lib/` med alle beregninger og enhetstester                                            | ⬜     |
| M3  | Trening (økt, logging, timer, progresjon, historikk)                                       | ⬜     |
| M4  | Mat (dagsplan, bibliotek, meal prep, handleliste)                                          | ⬜     |
| M5  | I dag og Fremgang (grafer, ukessjekk, justeringer, bilder)                                 | ⬜     |
| M6  | Mer (core og rygg, guide, rediger data, innstillinger, backup og import, seed-oppdatering) | ⬜     |
| M7  | Bildeskript, offline-test, deploy-oppsett, README, sluttsjekk                              | ⬜     |

Etter hver milepæl: `npm run check` (typecheck → lint → test → build → e2e) grønn, deretter commit.

## Arkitektur

- `seed-data.json` importeres ved bygging. `src/data/schema.ts` validerer den (og backup-filer).
- `src/db.ts`: Dexie-database med tabellene fra PROMPT.md (`db.version(1)`).
- `src/data/seedSync.ts`: første seeding, «Oppdater plan» (bare ikke-`userModified`), «Tilbakestill til standard».
- `src/lib/`: rene funksjoner (uke, fase/forskrivning, næring, dag, skritt, vektsnitt, tap/uke,
  livvidde, justeringsregler, progresjon, handleliste, formatering). Testet med fast fixture.
- `src/screens/`: I dag · Trening · Mat · Fremgang · Mer.

## Tolkninger og avgjørelser

- **Meal prep-rotasjon:** «søndag»-prep for uke _n_ lages søndagen før uka og dekker man–ons.
  «onsdag»-prep dekker tor–søn. Dette gir standard lunsj/middag per dag.
- **Progresjonsforslag ved samme vekt:** +1 rep på hvert sett som er under toppen av rep-spennet
  (samme som eksemplet «60 × 8, 8, 7, 6 → prøv 60 × 8, 8, 8, 7»). Det svakeste settet får alltid +1.
- **«Stall»:** beste e1RM har falt tre økter på rad (fire økter med synkende e1RM).
- **Snitt tap per uke (prognose):** `(startvekt − ukesnitt siste uke med data) / ukenummer`.
- **Start av planen (endret etter ønske fra Simen):** Ingen «Starter om X dager». Planen venter med
  «Klar til start» til Simen trykker «Start nå» og bekrefter («Starte planen i dag?»). Da blir startdatoen
  i dag, og ukene telles fra den dagen. Startdatoen kan endres under Innstillinger, og «Oppdater plan»
  flytter den aldri.
- **Avslutt planen** (Kalender og Innstillinger, med bekreftelse): appen går tilbake til «Klar til start».
  Det som er logget, blir liggende. Vil man slette alt, er det Mer → Nullstill app.
- **Tema:** mørkt som standard, med valg for lyst og «følg systemet» (`prefers-color-scheme`).
- **Faser, progresjon, core-rutine, justeringsregler og guider** er ikke redigerbare i appen. De lagres
  i `meta`-tabellen og byttes ut ved «Oppdater plan».
- **Sletting:** seed-elementer kan bare deaktiveres (ellers ville «Oppdater plan» lagt dem til igjen).
  Egne elementer kan slettes hvis de ikke brukes i logger eller av andre elementer.

- **Offline-test:** Playwrights `setOffline` blokkerer også svar fra service workeren i WebKit, så
  testen stopper serveren appen ble lastet fra i stedet. Da kan ingenting hentes fra nett.
- **Skritt føres manuelt.** `#/logg?steps=…` finnes fortsatt, men på iOS har Hjem-skjerm-appen egen
  lagring (atskilt fra Safari). «Lim inn skritt» er fjernet etter ønske (12.10.2026).
- **Seriefarger i grafer:** aksent + blå (`--c-series-2`), validert for fargeblindhet. Grønn/gul/rød
  brukes bare som status.

## Kvalitet

- Lighthouse 11.7.1 mot `npm run preview`: PWA 1,0 (alle automatiske sjekker), tilgjengelighet 1,0,
  beste praksis 1,0.
- E2E kjørt både med `base` `/` og `/cut/` (som på GitHub Pages).

## Redesign (12.10.2026)

- **Uttrykk:** kjølig, nesten svart bakgrunn med svak lysglød og fint korn, én is-blå aksent, grønn/gul/rød
  bare som status. Lyst tema har egne, mørkere toner (alle tekstfarger ≥ 4,5:1 mot bakgrunnen).
- **Typografi:** systemfonten (SF Pro på iPhone) med store titler og tett sporing, og SF Pro Rounded for tall,
  slik Apple Fitness gjør. Ingen nedlastede fonter, så alt virker offline.
- **Flater:** kort uten harde kanter (hårfin innerkant og myk skygge), flytende fanelinje og pausetimer i glass,
  ark som glir opp fra bunnen. Trykkfeedback (skalering) og trinnvis inntoning når en side åpnes.
  Alt respekterer «Reduser bevegelse» og «Reduser gjennomsiktighet».
- **Kalender:** fremdriftskort på I dag og Fremgang (ring, dag X av 84, dager igjen, ukestripe), og en egen
  kalender. Forenklet etter ønske (12.10.2026): planen uke for uke, samlet per fase (med fasens notat),
  der uke 1 starter på startdagen. Én tegnforklaring brukt overalt: grønn = økt fullført, ring = planlagt
  økt, blå = i dag, uten ring = hviledag. Toppen viser dag X av 84, dager igjen, uke, fase og økter fullført.
- **Øvelsesanimasjon (Hevy-stil):** start- og sluttbildet fra Free Exercise DB veksler i en jevn løkke med myk
  overgang, med pause og «Vis slutt/start». Hevy bruker 3D-videoer; med bare to bilder per øvelse er dette den
  nærmeste ærlige varianten. Animasjonen spiller bare når den er på skjermen.
- **Trening i Hevy-stil:** miniatyrbilder, «Forrige»-kolonne per sett og fremdriftslinje for økta.
- **Grafer:** seriefarger validert for fargeblindhet (blå `#2A9CDB` + magenta `#D55181` i mørkt tema).

## Gjennomgang (12.10.2026)

- **Stopp økt:** «Stopp» i toppen av økta og nederst. Uten loggede sett slettes økta med ett trykk; med sett
  velger man «Fullfør med N sett», «Slett økta og settene» eller «Fortsett økta».
- **Oppsummering etter økt:** tid, sett, volum (uten core) og PR (ny beste e1RM mot tidligere økter).
  Fremdriftskortet i økta viser tid brukt i stedet for prosent.
- **Hold skjermen på** under aktiv økt (Screen Wake Lock), kan slås av under Innstillinger → Under økta.
- **Lagring ved lukking:** tall- og notatfelt lagres også når appen går i bakgrunnen mens feltet er i bruk.
- **Raskere oppstart:** Fremgang, Mer og øvelseshistorikk lastes ved behov (startbunten 1,09 MB → 596 KB).
- **Planlagt start:** startdato fram i tid (valgt i Innstillinger) vises som «Planen starter …».
- **Småpuss:** «Til i dag» i Mat, «42 %» med mellomrom, ingen «Lagre bilde»-meny ved langt trykk på
  øvelsesbilder, lagre-linja i Innstillinger ligger over menylinja.

## Android (13.10.2026)

- **Testet på Android:** hele e2e-pakken kjører nå både på iPhone (WebKit) og Android (Chromium,
  Pixel 7). Chrome rapporterer ingen installeringsfeil (`Page.getInstallabilityErrors` er tom).
- **Installering i appen:** `beforeinstallprompt` fanges i `main.tsx` før React starter, og vises som
  «Installer» i et banner på I dag (kan skjules) og på **Mer → Installer på Hjem-skjermen**.
  Siden har veiledning for Android (Chrome, Samsung Internet, Firefox) og iPhone, og «Kopier
  lenke»/«Del».
- **Innebygde nettlesere** (Messenger, Instagram, Snapchat, TikTok, Android WebView) kan ikke
  installere. De gjenkjennes på user agent, og på Android får man «Åpne i Chrome» (intent-lenke).
- **Samsung Internet → Chrome:** Samsung Internet lager sin egen WebAPK, som Google Play Protect
  blokkerer på nyere Android («En utrygg app er blokkert … laget for en eldre versjon av Android»).
  Fra Chrome går det fint (Googles WebAPK). Appen viser derfor «Åpne i Chrome» i stedet for
  «Installer» i Samsung Internet, og installeringssiden forklarer meldingen. «Åpne i Chrome» faller
  tilbake til Chrome i Play Butikk hvis Chrome mangler.
- **Manifest:** tre skjermbilder (`public/screenshots/`, 1080 × 2340) gir Androids store
  installeringsvindu. De ligger ikke i service workerens precache.

## Oppsett for nye brukere (13.10.2026)

- **Veiviser** (`/oppsett`, uten fanelinje) ved første oppstart: om deg → mål og tempo → hverdagen →
  trening → rygg og mat → oppsummering. Nye installasjoner får `onboarded: false`. Eksisterende
  databaser og backuper uten feltet regnes som ferdige, så Simens app endres ikke.
- **Kalorier:** Mifflin-St Jeor × aktivitetsfaktor (1,45 / 1,55 / 1,7 / 1,85) − tempo × 7 700 / 7, rundet
  til 50. Gulv: høyeste av 1 500 (mann) / 1 200 (kvinne), hvileforbrenningen og målet − 300. Protein
  2,0–2,3 g og fett 0,8–1,0 g per kg målvekt. Gir 1 853 kcal hvileforbrenning for Simen, som i planen.
- **Lengde 4–24 uker:** `phasesForWeeks` bruker fasene i seed-fila som mal: oppstart (2 uker, 1 under
  8 uker), bygg-blokker på maks fem uker med lett uke imellom, test sist. 12 uker gir planen uendret.
  Meal prep-rotasjonen går i ring etter uke 12.
- **Porsjoner:** `portionScale` (kalorimål / 2 400, 60–140 %) gjelder måltidene i hele appen.
  Redigering (Rediger data) viser og lagrer grammene slik de står i planen.
- **Justeringer:** grensene i reglene er skrevet for 0,4 kg/uke. For andre tempo skaleres vekttapet
  før reglene sjekkes, og tallene i regelteksten skaleres likt.
- **Ryggoppfølging** (`backCare`) kan slås av: da skjules core og smerte på I dag og i kalenderen.
- **Øvelser:** i oppsettet kan øvelser fjernes og legges til per økt (nye får 3 × 8–12, RIR 2, 2 min
  pause). Treningsfanen har «Endre øvelser» til Rediger data, og viser dagene fra ukeplanen.
- **Tester:** `startApp` i e2e trykker «Bruk standardplanen». `e2e/setup.spec.ts` går gjennom hele
  oppsettet (Kari, 16 uker, tre dager, egne øvelser).

## Egne øvelsesbilder (19.10.2026)

- **Bird dog og McGill curl-up** finnes ikke i Free Exercise DB (heller ikke i Everkinetic). wger og
  Wikimedia Commons har bare sluttstillingen, med ulike personer og lisenser som krever kreditering.
  De er derfor tegnet for appen (`scripts/draw-exercises.mjs`, `npm run images:draw`): samme figur
  i start- og sluttstilling, 850 × 567 JPG som de andre bildene, så animasjonen virker likt.
- Egne tegninger har ID som starter med `Cut_`. `npm run images` henter dem ikke, og appen prøver
  ikke Free Exercise DB for dem. `seedVersion` 2026-10-19 gir «Oppdater plan» med bildene i
  core-rutinen.
- Enhetstesten sjekker at alle øvelser og core-øvelser i seed-fila har bilde.

## Føre det som er spist (21.10.2026)

- **Kryss av måltider:** hvert måltid på Mat har en rund avkrysning («Frokost spist» osv.), og I dag har
  fire avkrysninger under matkortet. Lagres som `DayLog.eaten` (valgfritt felt, ingen ny
  `db.version`). Bytter man måltid på en avkrysset plass, forblir den avkrysset.
- **Ringene viser spist hittil** (avkryssede måltider + hele fleksipotten), ikke hele planen. Planlagt
  total står under ringene. Under målet på dagen i dag eller senere: «750 kcal igjen» i nøytral farge.
  Tidligere dager som endte under målet: «Under målet» i gult. Dagens pris er fortsatt planlagt pris.
- **Fleksipotten** har valgfrie felt for karbo og fett (tomt = 0). Fleksipotten regnes alltid som spist.
- **CSV-eksporten** har kolonner for både spist og planlagt kcal og protein.

## Rolig mørk (26.10.2026)

- **Uttrykk:** erstatter glød og korn fra redesignet 12.10. Nøytral, nesten svart bakgrunn (`#111113`),
  lysere grå kort, dempet blå aksent (`#6aa6d9`, mørkere `#2f6ea6` i lyst tema). Grønn, gul og rød
  bare som status. Lyst tema har samme flate stil.
- **Typografi:** ingen små overskrifter med store bokstaver. Overlinjer er vanlig, dempet tekst
  («Onsdag 14. oktober»). Ukeoversikten i Trening viser «Man», «Tir», «Ons» osv.
- **Fanelinje:** vanlig linje i full bredde nederst med tynn skillelinje. Aktiv fane vises bare med farge.
- **Kort og lister:** farget kant bare på varsel- og feilkort. Ukeoversikt og måltider er grupperte
  rader med tynne skillelinjer, som i iOS-innstillinger. Knappene er flate.
- **Bevegelse:** trinnvis inntoning ved fanebytte er fjernet. Trykkfeedback, ringer som tegnes og ark
  som glir opp er beholdt.

## TODO

- **Krydder, hvitløk, chili, karri og buljongterning** står i oppskriftsstegene, men finnes ikke som
  ingredienser i `seed-data.json`. De er derfor ikke med i kcal, pris eller handleliste. Legg dem
  til i seed-fila (med næring og pris) hvis de skal telles.
- **Kreatin** (fra `guides.tilskudd`) er ikke en ingrediens og kommer ikke på handlelista.
