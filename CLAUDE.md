# Cut – prosjektinstruksjoner

Svar alltid på norsk (bokmål). Kode, kommandoer, filstier og identifikatorer beholdes som de er.

## Hva dette er

Cut er en PWA for Simens 12-ukers cut: trening, mat, fremgang og kalender. All plan-data kommer fra
`seed-data.json`. Data lagres bare lokalt på telefonen (IndexedDB via Dexie), uten konto eller server.

- `PROMPT.md` – den opprinnelige bestillingen. `PLAN.md` – avgjørelser og endringslogg. `README.md` – bruk.
- Publiseres på https://simengutsveen-art.github.io/cut-app/ (GitHub Pages).

## Kommandoer

- `npm ci` og `npx playwright install webkit chromium` – første gang på en ny maskin.
- `npm run dev` – utviklingsserver. `npm run dev -- --host` for å åpne den på telefonen på samme nett.
- `npm run check` – typecheck, lint (ESLint + Prettier), enhetstester, build og e2e. Skal være grønn
  før commit. E2E kjører på to prosjekter: `iphone-webkit` (iPhone 14) og `android-chrome` (Pixel 7).
- `npm run format` – Prettier på alt.

## Publisering

Push til `main` → GitHub Actions kjører `npm run check` og publiserer til Pages. Feiler en test,
publiseres ingenting. Appen spør selv om oppdatering når en ny versjon er ute. Commit-meldinger på norsk.

## Struktur og konvensjoner

- `src/lib/` – rene funksjoner (datoer, beregninger, kalender, progresjon) med enhetstester i
  `tests/unit/`. `src/data/` – operasjoner mot databasen. `src/screens/` – sider. `e2e/` – Playwright.
- Komponentfiler eksporterer bare komponenter (react-refresh). Hjelpefunksjoner ligger i `src/lib/`
  eller `src/hooks/`.
- Tailwind v4 med fargetokens i `src/index.css` (mørkt standard, lyst tema har egne, mørkere toner).
- All tekst i appen på norsk bokmål: «sitattegn», desimalkomma, mellomrom som tusenskille og før %.
- Mobil først: trykkflater minst 44 × 44 px, ingen horisontal scrolling på 375 px (testes i
  `e2e/layout.spec.ts`).
- Endre plan-data i `seed-data.json` og øk `seedVersion`. Da får appen «Oppdater plan».
- Installering: Samsung Internet sendes til Chrome (Google Play Protect blokkerer appen Samsung
  Internet lager). Se `src/lib/install.ts`.
