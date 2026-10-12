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
  «Klar til start» til Simen trykker «Start nå». Da blir startdatoen i dag, og ukene telles fra den dagen.
  Startdatoen kan endres under Innstillinger, og «Oppdater plan» flytter den aldri.
- **Tema:** mørkt som standard, med valg for lyst og «følg systemet» (`prefers-color-scheme`).
- **Faser, progresjon, core-rutine, justeringsregler og guider** er ikke redigerbare i appen. De lagres
  i `meta`-tabellen og byttes ut ved «Oppdater plan».
- **Sletting:** seed-elementer kan bare deaktiveres (ellers ville «Oppdater plan» lagt dem til igjen).
  Egne elementer kan slettes hvis de ikke brukes i logger eller av andre elementer.

- **Offline-test:** Playwrights `setOffline` blokkerer også svar fra service workeren i WebKit, så
  testen stopper serveren appen ble lastet fra i stedet. Da kan ingenting hentes fra nett.
- **Skritt-snarvei:** `#/logg?steps=…` er laget, men på iOS har Hjem-skjerm-appen egen lagring
  (atskilt fra Safari). Derfor finnes også «Lim inn skritt» fra utklippstavla.
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
  kalender med fasetidslinje, alle 12 uker fra mandag til søndag, fullførte og planlagte økter, og detaljer
  for hver dag.
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

## TODO

- **Krydder, hvitløk, chili, karri og buljongterning** står i oppskriftsstegene, men finnes ikke som
  ingredienser i `seed-data.json`. De er derfor ikke med i kcal, pris eller handleliste. Legg dem
  til i seed-fila (med næring og pris) hvis de skal telles.
- **Kreatin** (fra `guides.tilskudd`) er ikke en ingrediens og kommer ikke på handlelista.
