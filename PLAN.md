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
- **Tema:** mørkt som standard, med valg for lyst og «følg systemet» (`prefers-color-scheme`).
- **Faser, progresjon, core-rutine, justeringsregler og guider** er ikke redigerbare i appen. De lagres
  i `meta`-tabellen og byttes ut ved «Oppdater plan».
- **Sletting:** seed-elementer kan bare deaktiveres (ellers ville «Oppdater plan» lagt dem til igjen).
  Egne elementer kan slettes hvis de ikke brukes i logger eller av andre elementer.

## TODO

- (fylles inn underveis)
