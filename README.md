# Cut – 12-ukers cut

En installerbar PWA (web-app) for iPhone som erstatter _12-ukers cut-plan_ og `Cut-tracker.xlsx`.
Trening, mat, meal prep, handleliste, vekt, livvidde, ukessjekk og core/rygg. Alt på norsk, og alt
fungerer uten nett etter første lasting.

- **Ingen server og ingen innlogging.** Alle data lagres i nettleseren på telefonen (IndexedDB).
- **Planen** (mat, øvelser, økter, faser, regler og tekster) ligger i `seed-data.json`.

---

## 1. Kjøre appen lokalt på Windows

Du trenger [Node.js](https://nodejs.org/) 20 eller nyere (24 LTS anbefales).

```bash
npm install
```

```bash
npm run dev
```

Åpne <http://localhost:5173> i nettleseren.

**Teste på telefonen via samme Wi-Fi:**

```bash
npm run dev -- --host
```

Vite skriver ut en adresse som `http://192.168.1.23:5173`. Åpne den i Safari på iPhonen.
Merk: Installasjon som app (service worker og «Legg til på Hjem-skjerm» med offline-støtte)
krever HTTPS, så dette er bare til testing. Bruk GitHub Pages (under) til den ekte appen.

Nyttige kommandoer:

| Kommando                            | Hva den gjør                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run check`                     | typecheck → lint → enhetstester → bygg → ende-til-ende-tester (alt må være grønt)                  |
| `npm test`                          | enhetstester (Vitest)                                                                              |
| `npm run e2e`                       | ende-til-ende-tester (Playwright, WebKit, iPhone 14). Første gang: `npx playwright install webkit` |
| `npm run build` / `npm run preview` | produksjonsbygg og forhåndsvisning på <http://localhost:4173>                                      |
| `npm run images`                    | henter øvelsesbilder fra Free Exercise DB for nye `imageSourceId` i seed-fila                      |
| `npm run icons`                     | lager app-ikonene på nytt fra `public/icons/icon.svg`                                              |

## 2. Legge appen på GitHub Pages (gratis HTTPS)

1. Lag en konto på <https://github.com> hvis du ikke har det.
2. Trykk **New repository**. Gi det et navn, f.eks. `cut`. Velg _Private_ eller _Public_
   (GitHub Pages fra private repoer krever betalt konto, så velg _Public_ hvis du har gratiskonto).
   Ikke huk av for README eller .gitignore.
3. I mappa med appen (PowerShell eller Git Bash):

   ```bash
   git remote add origin https://github.com/DITT-BRUKERNAVN/cut.git
   ```

   ```bash
   git push -u origin main
   ```

4. På GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Gå til fanen **Actions**. Workflowen «Deploy til GitHub Pages» kjører `npm ci`,
   `npm run check` (inkludert alle testene) og `npm run build`, og publiserer `dist/`.
   Når den er grønn, ligger appen på `https://DITT-BRUKERNAVN.github.io/cut/`.

Workflowen setter `base` automatisk ut fra repo-navnet (`/cut/`), så du kan kalle repoet hva du
vil. Feiler en test, publiseres ingenting, og den gamle versjonen ligger fortsatt ute.

Hver gang du pusher til `main`, bygges og publiseres appen på nytt. Åpne appen på telefonen, så
får du et banner: «Ny versjon av appen er klar → Oppdater».

## 3. Installere på iPhone

1. Åpne lenka (`https://DITT-BRUKERNAVN.github.io/cut/`) i **Safari** (ikke Chrome).
2. Trykk **Del-knappen** (firkant med pil opp).
3. Velg **«Legg til på Hjem-skjerm»** og trykk **Legg til**.
4. Åpne **Cut** fra Hjem-skjermen. Første gang må du ha nett. Etter det fungerer appen offline,
   inkludert alle øvelsesbildene.

## 4. Endre mat og øvelser

Det finnes to måter, og de er ment for ulike ting.

### A. I appen: Mer → Rediger data

- Legg til, endre, deaktiver og tilbakestill ingredienser, måltider, øvelser og økter.
- Endringene lagres bare på telefonen (og blir med i backupen).
- Et element fra planen som du endrer, merkes **«Endret av deg»**. Det overskrives aldri av senere
  plan-oppdateringer. Knappen **«Tilbakestill til standard»** henter verdiene fra seed-fila igjen.
- Elementer fra planen kan ikke slettes, bare deaktiveres. Egne elementer kan slettes hvis de ikke
  er brukt i logger. Noe som er brukt i logger, kan bare deaktiveres.
- Ukeplanen (hvilken økt hvilken dag), mål, startdato og standardmåltider endres under
  **Mer → Innstillinger**.

### B. I `seed-data.json` (plan-endringer som skal gjelde «for alltid»)

1. Endre fila (f.eks. pris, ny øvelse eller nytt måltid). Bruk en unik `id`.
2. **Bump `seedVersion`** (f.eks. fra `2026-10-09` til `2026-11-01`). Versjonen sammenlignes som
   tekst, så bruk alltid datoformatet `ÅÅÅÅ-MM-DD`.
3. Har du lagt til en øvelse med ny `imageSourceId` fra
   [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), kjør `npm run images`.
4. Kjør `npm run check` (validerer seed-fila med zod, sjekker referanser og at alle bilder finnes).
5. Commit og push. Når appen åpnes, kommer **«Ny versjon av planen → Oppdater plan»** på «I dag»
   og under Mer.

«Oppdater plan» oppdaterer bare elementer du **ikke** har endret i appen, legger til nye elementer
og sletter ingenting. Loggene dine (vekt, økter, mat, bilder) røres aldri. Etterpå ser du en
oppsummering av hva som ble lagt til, oppdatert og beholdt.

**Forskjellen kort:** Endringer i appen er dine personlige justeringer og vinner over seed-fila.
Endringer i seed-fila er planen, og de når alle elementer du ikke har rørt.

Faser, progresjonsregler, core-rutine, justeringsregler og guidetekstene redigeres bare i
seed-fila.

## 5. Backup – hvorfor og hvordan

**Hvorfor:** Alt ligger bare på telefonen. Sletter du appen fra Hjem-skjermen, bytter telefon
eller tømmer nettstedsdata i Safari, forsvinner loggene. Appen ber om varig lagring
(`navigator.storage.persist()`), men iOS kan likevel rydde i lagringen. Det finnes ingen sky-kopi.

**Hvordan:**

- **Mer → Backup og eksport → Eksporter alt.** På iPhone kommer en knapp «Del / lagre fila».
  Velg **Arkiver i Filer** (f.eks. iCloud Drive). Fila heter `cut-backup-ÅÅÅÅ-MM-DD.json`.
- **Gjenopprette:** samme sted → **Velg backup-fil**. Du ser hva fila inneholder (antall
  dagslogger, økter, bilder og datoer) før noe overskrives. Fila valideres før import.
- Appen minner deg på det (på «I dag») når det er mer enn 7 dager siden siste backup.
- **Eksporter dagslogg (CSV)** gir en fil som kan åpnes i Excel (semikolon og desimalkomma).

## 6. Begrensninger

- **Skritt fra Apple Helse:** En PWA kan ikke lese Helse-data automatisk. Skritt føres manuelt
  på «I dag», eller via en snarvei (se under).
- **Varsler:** Pausetimeren piper når appen er åpen. Er telefonen låst når pausen er ferdig,
  vises riktig tid når du åpner den igjen (timeren bruker tidsstempler), men den piper ikke i
  bakgrunnen.
- **Én enhet:** Ingen synkronisering mellom enheter. Bruk backup for å flytte data.
- **Næringsverdier og priser er omtrentlige**, og appen gir ikke medisinske råd.
- **Krydder, hvitløk, karri og buljong** som står i oppskriftene, er ikke ingredienser i seed-fila.
  De er derfor ikke med i kcal, pris eller handleliste.

### Snarvei for skritt (valgfritt)

Appen leser `#/logg?steps=1234&date=2026-10-12` fra adressen og lagrer skrittene (`date` er
valgfri, standard er i dag; `weight=80,2` virker også).

Lag snarveien i **Snarveier**-appen:

1. **Ny snarvei → Legg til handling → «Finn helseeksempler»**: Type **Skritt**, filter
   **Startdato er i dag**.
2. **«Regn ut statistikk»**: **Sum** av helseeksemplene.
3. Velg én av disse:
   - **Sikrest: «Kopier til utklipp»** (resultatet fra steg 2). Åpne Cut og trykk
     **«Lim inn skritt»** under skrittfeltet.
   - **«Åpne URL»** med `https://DITT-BRUKERNAVN.github.io/cut/#/logg?steps=` og resultatet fra
     steg 2 lagt til på slutten.

Merk: På iPhone har appen på Hjem-skjermen vanligvis sin egen lagring, atskilt fra Safari.
«Åpne URL» åpner lenka i Safari, så skrittene havner i Safari-utgaven, ikke i Hjem-skjerm-appen.
Derfor er utklippstavla den sikre veien.

## Teknisk

- Vite + React 18 + TypeScript (`strict`), Tailwind CSS, React Router (hash-router), Recharts,
  date-fns (norsk), Dexie (IndexedDB), zod, vite-plugin-pwa (Workbox).
- Alle beregninger ligger som rene funksjoner i `src/lib/` med enhetstester. Tester med eksakte
  tall bruker en fast kopi av seed-fila i `tests/fixtures/seed-2026-10-09.json`.
- Databasen har migrasjoner fra `db.version(1)` i `src/db.ts`. Ved nye tabeller eller felt
  legges det til en ny `db.version(2)` med `upgrade()`, så eksisterende data beholdes.
- Ende-til-ende-testene kjører i WebKit med iPhone 14-viewport. Offline-testen stopper serveren
  appen ble lastet fra, fordi Playwrights `setOffline` også blokkerer service workeren i WebKit.
- Avhengighetene har eksakte versjoner, låst i `package-lock.json`.

## Kreditering

Øvelsesbildene er fra [Free Exercise DB](https://github.com/yuhonas/free-exercise-db)
(Unlicense / public domain) og ligger i `public/exercises/`.
