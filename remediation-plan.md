# Remediation-Plan — @spearwolf/shadow-objects (Monorepo)

Quelle: ./audit.html vom 2026-09-01 · Branch: main · erstellt: 2026-09-02
Baseline: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test` ✓
(94,23 % Anweisungen, 90,89 % Zweige über die drei vitest-Suiten)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 28 von 34 Findings (3 medium, 18 low, 7 info) · ausgenommen: 2 acknowledged, 2 info ohne Arbeit, 3 Canvas-Paketfragen, 1 im Lauf als gegenstandslos erwiesen
Scope-Regel: alles ab low aufwärts, jede Kategorie, dazu jeder info-Punkt, der eine reine Doku- oder Kosmetikkorrektur ist. Zwei Ausnahmen, die auch für Befunde gelten, die erst im Lauf auffallen: (a) was `packages/shae-offscreen-canvas` als *veröffentlichtes* Paket betrifft — Public-API-Reife, Export-Zuschnitt, Paketinhalt, Konsumentendoku — ist kein Gegenstand; das Paket ist ein Anwendungsfall, kein Produkt, und muss laufen, mehr nicht. Sein Anteil am Harness (Build, Typprüfung, Tests, Aufräumskripte) fällt sehr wohl unter die Regel. (b) Ein Punkt, dessen eigene Empfehlung sagt, dass nichts zu tun ist, wird nicht getan.
Stand (2026-09-02): abgeschlossen · 11 Pakete committet, kein Paket blockiert · Befund-Queue leer (Drain-Runde 1: sieben Nebenbefunde in den Paketen 9 bis 11 behoben, einer verworfen, einer ins Audit) · Abschlusslauf `pnpm lint` ✓ `pnpm typecheck` ✓ `pnpm build` ✓ `pnpm test` ✓ · Semver: patch, keine Versionsanhebung (die Oberfläche beider Pakete ist unverändert, und dieses Projekt hebt Versionen in eigenen Release-Commits an) · `./audit.html` nachgeführt: 83,5 → 98,5, 29 Findings geschlossen, 1 neu

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen
- Der Scope nimmt medium, low und die trivialen info-Punkte; CLEAN-019 (Kommentarquote) und TEST-022 (WeakRef-Zweige) bleiben draußen, weil beide Empfehlungen ausdrücklich keine Arbeit verlangen (2026-09-02)
- Die toten Doku-Links der veröffentlichten READMEs werden auf absolute GitHub-URLs umgestellt, nicht durch Mitliefern von `docs/` geheilt — das Paket bleibt schlank und der Vertragstest frei von Doku (2026-09-02)
- `shae-offscreen-canvas` bekommt Typprüfung, aber keine Typen: tsconfig mit `allowJs`/`checkJs` und ein `typecheck`-Skript, keine `.d.ts`, kein `types`-Feld, keine Zeile im distContract. Der Nutzer hat das Paket ausdrücklich als experimentellen Anwendungsfall ohne Zielsetzung benannt (2026-09-02)
- Advisories meldet ein eigener wöchentlicher Workflow mit `pnpm audit --audit-level=high`, kein Dependabot — der Katalog in `pnpm-workspace.yaml` trägt begründete Rückhaltungen und bleibt in menschlicher Hand (2026-09-02)
- Die Konvention »kein Rückblick auf den Vorzustand« gilt nicht für Aussagen eines CHANGELOGs über das Repository selbst — Historie, Klongröße, was ein Commit mitnimmt. Dort ist der Vorzustand der Gegenstand, nicht die Last des Lesers. Der Satz zur Klongröße des verkleinerten README-Bildes bleibt deshalb stehen, ebenso die Stelle, die den Ton der ersetzten Bildunterschrift benennt (2026-09-02)

## Konventionen
Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise, Commit-Messages:
- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs, auch nicht in der Commit-Message. Sie gehören diesem einen
  Audit, sind danach tot, und die Commit-Message überdauert den Lauf. Sie leben
  in diesem Plan und sonst nirgends; die Verbindung zwischen Finding und Commit
  trägt das Feld `Hash:` unter dem Paket — in genau der Richtung, in der jemand
  sie später sucht. Eine Commit-Message sagt in eigenen Worten, was sie ändert.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.
  Eine Ausnahme, benannt statt stillschweigend: ein CHANGELOG-Eintrag, dessen
  Gegenstand das Repository ist — was in der Historie bleibt, was ein `git clone`
  holt, was ein Commit mitnimmt —, darf den Vorzustand nennen. Er beschreibt dann
  nicht, wie es einmal war, sondern was Git mit dem Alten tut, und dieser Satz ist
  für jeden Leser wahr. Der Test von oben bleibt für alles andere in Kraft.

Dazu die Regeln des Zielprojekts, die über diesem Lauf stehen:
- `AGENTS.md` ist der maßgebliche Leitfaden; `CLAUDE.md` ergänzt ihn um
  Werkzeug- und Betriebswissen. Beide werden nachgeführt, sobald eine Änderung
  sie überholt — nicht nachträglich.
- Alle Dokumentation und alle Code-Kommentare in **Englisch**, Doku in Markdown.
- Verbotene Analogien: »shadow theater«, »puppet«, »puppeteer«, »light world«,
  »screen«. Die Tabelle bindender Begriffe in `AGENTS.md` §4 gilt wörtlich.
- Eine Änderung an der öffentlichen API von `@spearwolf/shadow-objects` zieht
  `docs/`, `README.md` und `CHANGELOG.md` desselben Pakets im selben Zug nach.
- Änderungen am Harness (Build, turbo, pnpm, Lint, CI, devDeps) gehören ins
  `CHANGELOG.md` der Wurzel, mit Datum und ohne Versionsnummer.
- Dependency-Versionen stehen ausschließlich im `catalog:`-Block von
  `pnpm-workspace.yaml` und werden als `"<dep>": "catalog:"` referenziert.
- Wer eine `TODO`-Zeile anfasst, fährt `pnpm make:todo`.
- Lint und Format sind Biome, Konfiguration nur in der Wurzel.

## Vorbestehende Fehler
Keine. Lint, Typecheck, Build und die vier Testsuiten waren zum Zeitpunkt der
Planung grün.

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

Drain-Runde 1 am 2026-09-02: alle neun Einträge beschlossen, Queue leer.
- [x] `scripts/publishNpmPkg.mjs:36` — `exec()` mit String-Interpolation statt Argument-Array
  (aus Paket 2, low) → Paket 9
- [x] `package.json:25`, `CLAUDE.md:58` — `pnpm ci` wird von pnpm 11s eingebautem `clean-install`
  verdeckt, nur `pnpm run ci` trifft das Skript (aus Paket 3, low) → Paket 9
- [x] `packages/shadow-objects-testing/test/ent-element-upgrade.test.js` und vier weitere Stellen —
  `customElements.define` im `it`, wo die späte Registrierung der Gegenstand des Falls ist
  (aus Paket 4, low) → Paket 10
- [x] `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts:759` — Non-Null-
  Zusicherung ohne das Gleichmaß ihrer sechs Geschwister (aus Paket 4, info) → Paket 10
- [x] `CLAUDE.md:84`, `CHANGELOG.md:113` — das Worker-Inlining wird als Base64-Kodierung
  beschrieben, der Build erzeugt ein String-Literal plus `new Blob` (aus Paket 8, low) → Paket 11
- [x] `README.md:279` — die Tabelle nennt zwei Coverage-Suiten, es sind drei
  (aus Paket 7, low) → Paket 11
- [x] `README.md:7` — Leerzeichen vor dem Zeilenumbruch (aus Paket 7, info) → Paket 11
- [x] `docs/what-is-shadow-objects.webp` — die Infografik nennt veraltete Zahlen zum Testbestand.
  **Verworfen auf Ansage des Nutzers (2026-09-02):** die Zahlen sind Illustration und kein
  Datenblatt; ein Betrachter liest die Grafik als Stimmungsbild, nicht als Bestandsangabe. Geht
  nicht ins Audit zurück.
- [x] `packages/shadow-objects/docs/architecture@2x.png` — zwei Beschriftungen laufen aus ihren
  Rahmen und werden von der Leinwandkante beschnitten; der Fehler steckt in der `.afdesign` und
  braucht Affinity Designer. **Entscheidung des Nutzers (2026-09-02):** die Einbindung in
  `concepts.md` wird zurückgenommen, bis das Bild sitzt; der Hinweis auf die editierbare Quelle
  bleibt in `docs/README.md` stehen, womit die Dateien referenziert bleiben. Umsetzung in
  Paket 11, Befund selbst zusätzlich ins Audit.

## Nicht im Scope
Diese Findings bleiben unbearbeitet und gehen unverändert ins Audit zurück:
- CLEAN-019 (info) — Kommentarquote; die Empfehlung sagt ausdrücklich »nichts kürzen«
- TEST-022 (info) — WeakRef-Zweige; die Empfehlung sagt »als Lücke führen, nicht als Arbeit«
- BUILD-003 (low) — vier Beispielmodule im Canvas-Paket; Frage des Export-Zuschnitts eines experimentellen Pakets
- DX-034 (low) — Versionshistorie im Canvas-CHANGELOG; Konsumentendoku desselben Pakets
- DX-032 (low) — die zweite Hälfte, die Doku-Struktur des Canvas-Pakets, aus derselben Begründung wie die Zeilen darüber; die erste Hälfte, das Inhaltsverzeichnis der API-Referenz, hat sich in Paket 7 als gegenstandslos erwiesen (es steht seit `a9ed24c` in der Datei). Damit ist der ganze Punkt erledigt, ohne dass jemand ihn bearbeitet hätte.
- SEC-002, DEP-001 — vom Nutzer zurückgestellt (`acknowledged`)

## Pakete

### [x] 1. Werkzeugkette: jedes Paket wird typgeprüft und aufgeräumt
- Findings: BUILD-002 (medium, ohne die Typen-Hälfte), DX-030 (low), DX-031 (low)
- Ziel: `turbo run typecheck` prüft alle vier Pakete, `pnpm clean` räumt alle vier auf, und die drei Stellen, die eine Node-Untergrenze nennen, nennen dieselbe.
- Bereich: `packages/shae-offscreen-canvas/`, `packages/shadow-objects-testing/`, `.nvmrc`, `mise.toml`, `.github/workflows/ci.yml`, `CLAUDE.md`, `CHANGELOG.md`
- Hängt ab von: —
- Hash: 524cdaf
- Modell: mittlere Stufe (`sonnet`)
- Effort: medium
- Dateien: `packages/shae-offscreen-canvas/tsconfig.json` (neu),
  `packages/shae-offscreen-canvas/package.json`,
  `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`,
  `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js`,
  `packages/shadow-objects-testing/tsconfig.json` (neu),
  `packages/shadow-objects-testing/package.json`,
  `packages/shadow-objects-testing/src/findElementsById.js`,
  `packages/shadow-objects-testing/src/mount.js`,
  `packages/shadow-objects-testing/src/render.js`,
  `packages/shadow-objects-testing/src/withSwallowedErrors.js`,
  `.nvmrc`, `mise.toml`, `.github/workflows/ci.yml`, `CLAUDE.md`, `CHANGELOG.md`
- Vorgehen:
  1. `packages/shae-offscreen-canvas/tsconfig.json` neu anlegen, wörtlich so:

     ```json
     {
       "extends": "../../tsconfig.json",
       "include": ["src"],
       "exclude": ["src/**/*.spec.js"],
       "compilerOptions": {
         "rootDir": ".",
         "noEmit": true,
         "checkJs": true,
         "types": [],
         "noImplicitAny": false,
         "strictNullChecks": false,
         "exactOptionalPropertyTypes": false,
         "noUncheckedIndexedAccess": false
       }
     }
     ```

     Keine Kommentare in die Datei — die Begründungen stehen in `CLAUDE.md` und im
     `CHANGELOG.md` (Schritt 8 und 9). Jede der vier Lockerungen ist gemessen und keine
     ist frei gewählt: mit der vollen Strenge der Wurzel bleiben in `src/` **80** Fehler
     stehen, 58 davon aus der `noImplicitAny`-Familie an den destrukturierten Parametern
     der Shadow-Object-Fabriken. Die zu annotieren wäre das Typisieren des Pakets, und
     genau das schließt die Entscheidung vom 2026-09-02 aus. `exactOptionalPropertyTypes`
     und `noUncheckedIndexedAccess` müssen mit `strictNullChecks` fallen, sonst bricht
     `tsc` mit `TS5052` ab. `types: []` steht dort, weil der Produktivcode keine
     Node-Typen braucht (gemessen) und weil `tsconfig.lib.json` des Kernpakets es
     genauso hält. Das `exclude` ersetzt das der Wurzel, statt es zu ergänzen — unter
     `src/` liegt weder `dist/` noch eine `.mjs`, die Zeile ist damit vollständig.
  2. Die sieben Fehler beseitigen, die diese Konfiguration übriglässt. Gemessen mit
     `tsc` 7.0.2, exakt diese und keine weiteren:

     ```
     src/elements/ShaeOffscreenCanvasElement.js(84,31):  TS2339 Property 'ns' does not exist on type 'HTMLElement'.
     src/elements/ShaeOffscreenCanvasElement.js(130,30): TS2339 Property 'viewComponent' does not exist on type 'HTMLElement'.
     src/elements/ShaeOffscreenCanvasElement.js(143,36): TS2339 Property 'viewComponent$' does not exist on type 'HTMLElement'.
     src/elements/ShaeOffscreenCanvasElement.js(333,25): TS2339 Property 'syncShadowObjects' does not exist on type 'HTMLElement'.
     src/elements/ShaeOffscreenCanvasElement.js(371,35): TS2339 Property 'transferControlToOffscreen' does not exist on type 'HTMLElement'.
     src/elements/ShaeOffscreenCanvasElement.js(384,5):  TS2740 Type 'Node' is missing … from type 'HTMLElement'.
     src/shadow-objects/ThreeRenderView.js(136,43):      TS2339 Property 'message' does not exist on type 'unknown'.
     ```

     Die ersten sechs haben eine gemeinsame Wurzel: im Konstruktor kommen `canvas` und
     `shadowEntity` aus `template.content.getElementById(…)`, also als `HTMLElement`, und
     die beiden Felder erben diesen Typ von der Zuweisung. Beide Zuweisungen am Ende des
     Konstruktors bekommen einen JSDoc-Cast:

     ```js
     this.canvas = /** @type {HTMLCanvasElement} */ (canvas);
     this.shadowEntity = /** @type {import('@spearwolf/shadow-objects').ShaeEntElement} */ (shadowEntity);
     ```

     `ShaeEntElement` wird aus `@spearwolf/shadow-objects` re-exportiert
     (`dist/src/elements/ShaeEntElement.d.ts`), der Import-Typ trifft also. Damit sind
     84, 130, 143, 333 und 371 erledigt. Zeile 384 ist `this.canvas.cloneNode()`, das
     `Node` liefert — derselbe Cast an der `const canvas = …`-Zeile darüber.

     **Keine Feld-Deklarationen im Klassenkörper.** Ein nacktes `canvas;` legt die
     Eigenschaft schon vor der Zuweisung im Konstruktor an; das Paket wird als
     Quelldistribution ausgeliefert, und die Laufzeitform seiner Elemente bleibt, wie
     sie ist. Casts sind reine Annotation.

     `ThreeRenderView.js:136` ist `String(error?.message ?? error)` mit `error: unknown`
     — die Wurzel-`tsconfig.json` setzt `useUnknownInCatchVariables` ausdrücklich, das
     überlebt die Lockerung. Das Verhalten bleibt: auch ein geworfenes Nicht-`Error` mit
     `message` soll weiterhin diese Meldung berichten, ein `instanceof Error` würde das
     abschneiden. Also am Zugriff annotieren, etwa
     `String(/** @type {{message?: unknown}} */ (error)?.message ?? error)`.
  3. `packages/shadow-objects-testing/tsconfig.json` neu anlegen, wörtlich so:

     ```json
     {
       "extends": "../../tsconfig.json",
       "include": ["src"],
       "compilerOptions": {
         "rootDir": ".",
         "noEmit": true,
         "checkJs": true,
         "types": []
       }
     }
     ```

     Hier keine Lockerung: die volle Strenge der Wurzel lässt in den vier Helfern unter
     `src/` genau **9** Fehler stehen, alle aus der `noImplicitAny`-Familie, und die sind
     mit neun JSDoc-Zeilen erledigt. Eine Lockerung, die man nicht braucht, muss man
     später erklären.
  4. Die neun Fehler beseitigen. Gemessen, exakt diese:
     - `src/findElementsById.js:1` — `TS7019`, Rest-Parameter `ids`. JSDoc-Block über der
       Konstante mit `@param {...string} ids`.
     - `src/mount.js:3` — `TS7034`, `const containers = []`. `/** @type {HTMLDivElement[]} */`
       darüber; das erledigt auch `TS7005` in Zeile 35.
     - `src/mount.js:13` — `TS7006`, Parameter `html`. `@param {string} html` in den
       **vorhandenen** JSDoc-Block über `mount()` einfügen, keinen zweiten anlegen.
     - `src/render.js:3` — `TS7006`, Parameter `html`. Neuer JSDoc-Block mit
       `@param {string} html`.
     - `src/withSwallowedErrors.js:8` — `TS7006`, Parameter `fn`. `@param {() => void} fn`
       in den vorhandenen JSDoc-Block.
     - `src/withSwallowedErrors.js:9` — `TS7034`, `const messages = []`.
       `/** @type {string[]} */`; das erledigt auch `TS7005` in Zeile 20.
     - `src/withSwallowedErrors.js:10` — `TS7006`, Parameter `event`.
       `@param {ErrorEvent} event`.

     Der Text der vorhandenen JSDoc-Blöcke in `mount.js` und `withSwallowedErrors.js`
     bleibt unangetastet, es kommen nur `@param`-Zeilen dazu.
  5. Skripte eintragen, beide wörtlich wie in den zwei Paketen, die es schon haben:
     - `packages/shae-offscreen-canvas/package.json`:
       `"typecheck": "tsc -p tsconfig.json --noEmit"`, einsortiert nach `build`.
     - `packages/shadow-objects-testing/package.json`:
       `"typecheck": "tsc -p tsconfig.json --noEmit"` und `"clean": "rimraf coverage"`,
       einsortiert nach `watch`. `rimraf` steht dort bereits in den `devDependencies`.

     `turbo.json` wird **nicht** angefasst. `turbo run typecheck --dry` zählt heute schon
     alle vier Pakete auf und meldet für diese beiden `<NONEXISTENT>`; das Skript ist die
     ganze fehlende Hälfte. `src/**` und `tsconfig*.json` stehen bereits in den `inputs`
     der Aufgabe. Kein `typescript` in die `devDependencies`: `pnpm exec tsc` löst aus
     beiden Paketen auf die Wurzel auf (nachgemessen), und `packages/shadow-objects` hält
     es genauso.
  6. Die Node-Untergrenze auf eine Zahl bringen: `.nvmrc` auf `24.13.0`, in `mise.toml`
     `node = "24.13.0"`. Maßgeblich bleibt `engines.node` in der Wurzel-`package.json`,
     die beiden anderen Dateien wiederholen sie nur.

     Die Zeile `pnpm = "11"` in `mise.toml` bleibt stehen: `engines.pnpm` verlangt
     `>=11.0.0`, das erfüllt jedes 11.x, und welches pnpm tatsächlich läuft, entscheidet
     ohnehin `packageManager` (`pnpm@11.21.0`). `README.md:289` zitiert `engines` bereits
     als Quelle der Wahrheit und bleibt unverändert.
  7. `.github/workflows/ci.yml`, Schritt »Upload coverage report«: in die `path:`-Liste
     `packages/shadow-objects-testing/coverage/` aufnehmen. Die beiden anderen
     vitest-Suiten stehen dort, die dritte fehlt. Das ist ein Nebenbefund aus Zug 0 und
     gehört in dieses Paket, weil es dieselbe Ursache hat wie DX-030: die
     Integrationssuite wurde in den Coverage-Merge aufgenommen, ohne dass der Harness um
     sie herum nachgezogen wurde — einmal beim Aufräumen, einmal beim Hochladen.
  8. `CLAUDE.md` nachführen. Vier Stellen, nach Zeilennummern des heutigen Standes:
     - Zeile 38, Zeile `pnpm build / pnpm test / pnpm typecheck`: die Aussage »over all
       packages« stimmt ab jetzt; sagen, dass `typecheck` alle vier Pakete erfasst.
     - Zeile 44, Zeile `pnpm clean`: jedes der vier Pakete räumt sein eigenes `coverage/`
       ab, die Wurzel den Rest.
     - Der Absatz zu `packages/shae-offscreen-canvas`: `pnpm typecheck` nennen, dazu was
       es prüft (`src/**` ohne die `.spec.js`) und unter welchen Lockerungen — mit dem
       Grund aus Schritt 1 in einem Satz. Der Zweck ist benannt: eine API, die das
       Kernpaket oder `three` wegnimmt, fällt ab jetzt beim Typprüfer auf, nicht erst zur
       Laufzeit.
     - Der Absatz zu `packages/shadow-objects-testing`: `pnpm typecheck` und `pnpm clean`
       nennen. Dass die Typprüfung `src/**` erfasst und `test/**` nicht, gehört dazu, samt
       Grund: die 30 Testdateien arbeiten mit Chai-Zusicherungen und vitest-Globals gegen
       DOM-Elemente aus `document.createElement`, und die zu typisieren ist ein eigenes
       Vorhaben (gemessen: 1103 Fehler), kein Nebensatz dieses Pakets.

     `AGENTS.md` prüfen und nur ändern, wenn eine Aussage darin unwahr wird. Die
     Werkzeug-Tabelle (`tsc` 7 — only emits `.d.ts`) bleibt richtig: an dem, was `tsc`
     *emittiert*, ändert dieses Paket nichts.
  9. Wurzel-`CHANGELOG.md`: ein neuer datierter Abschnitt `## 2026-09-02 — …` ganz oben
     unter der Einleitung, in der Machart der vorhandenen Abschnitte (ein Absatz, der die
     Sache benennt, darunter Aufzählungspunkte, die je eine Datei fett voranstellen).
     Kein Paket-CHANGELOG: an der öffentlichen API beider veröffentlichter Pakete bewegt
     sich nichts, die JSDoc-Casts im Canvas-Quelltext ändern kein Verhalten und keine
     Oberfläche.

     `pnpm make:todo` entfällt — keine `TODO`-Zeile wird angefasst.
 10. Was dieses Paket ausdrücklich **nicht** tut, damit niemand es für vergessen hält:
     keine `.d.ts` für `shae-offscreen-canvas`, kein `types`-Feld in dessen
     `package.json`, keine Zeile in `distContract.files.txt` — so hat es der Nutzer am
     2026-09-02 entschieden. Nachgesehen und bestätigt: `packages/shae-offscreen-canvas/build.mjs`
     kopiert nur `README.md` und `src/`, eine `tsconfig.json` im Paketwurzelverzeichnis
     landet also nicht in `.npm-pkg/`; und `package.override.json` setzt `scripts` und
     `devDependencies` auf `null`, ein neues `typecheck`-Skript erreicht das
     veröffentlichte Manifest also nicht. Beide Vertragsdateien des Canvas-Pakets bleiben
     unverändert — das ist auch die Antwort auf die Frage, die Paket 2 sonst selbst
     stellen müsste.
- Verify: `pnpm clean && test ! -d packages/shadow-objects-testing/coverage && pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`
  (`test ! -d …` ist der einzige mechanische Beleg für DX-030 und muss unmittelbar nach
  `pnpm clean` stehen, weil `pnpm test:ci` das Verzeichnis danach neu anlegt. `pnpm lint:ci`
  ist zur Planungszeit grün — 241 Dateien, exit 0 —, ein rotes `lint:ci` gehört also diesem
  Paket. Playwright bleibt draußen: dieses Paket fasst nichts an, was `shadow-objects-e2e`
  betrifft.)
- Commit: `chore(harness): every package is type-checked and cleaned, and the Node floor is one number`
- Ergebnis: 3 Runden · BUILD-002 (ohne die Typen-Hälfte), DX-030 und DX-031 behoben ·
  `turbo run typecheck` läuft über alle vier Pakete, `pnpm clean` räumt auch die
  Integrationssuite, `.nvmrc` und `mise.toml` nennen `24.13.0` wie `engines.node` · dazu
  der Coverage-Upload der Integrationssuite in `.github/workflows/ci.yml` · zwei
  Doku-Befunde aus der Fehlerkette behoben (Rückblick auf den Vorzustand im `CHANGELOG.md`,
  unwahre `pnpm clean`-Zeile in `CLAUDE.md`) · klein und offen geblieben: »in each of the
  three packages that writes one« in `CHANGELOG.md:9` — Numerus des Verbs strittig, nicht
  sinnentstellend · Verify `paket-1.verify.log` exit 0, Coverage 94,23 % / 90,89 % wie die
  Baseline
- Nebenbefunde: keiner neu — der aus Zug 0 (Coverage-Upload) ist in diesem Paket behoben
- Folgen: keine
- Schnittstellen: `packages/shae-offscreen-canvas` und `packages/shadow-objects-testing`
  haben je ein `typecheck`-Skript (`tsc -p tsconfig.json --noEmit`) und eine eigene
  `tsconfig.json`; `packages/shadow-objects-testing` zusätzlich `clean` (`rimraf coverage`).
  Wer künftig `src/**` eines der beiden Pakete anfasst, wird dort typgeprüft — das
  Canvas-Paket unter den vier Lockerungen aus dem Detailplan, die Integrationshelfer unter
  der vollen Strenge der Wurzel. `test/**` von `shadow-objects-testing` bleibt ungeprüft.

**BUILD-002 · medium · packages/shae-offscreen-canvas/package.json (exports, scripts); packages/shae-offscreen-canvas/src/distContract.files.txt; tsconfig.json (kein checkJs)** — Das zweite publizierte Paket liefert keine Typen und wird von keinem Typprüfer gelesen
@spearwolf/shae-offscreen-canvas wird als Quelldistribution aus reinem JavaScript publiziert. Weder package.json noch die exports-Bedingungen führen einen types-Eintrag, und es entsteht keine .d.ts: ein TypeScript-Konsument bekommt any für das gesamte Paket, einschließlich des Custom Elements und der fünf registrierten Shadow Objects. Die zweite Hälfte wiegt schwerer als beim Vorlauf gedacht: dem Paket fehlt — wie auch shadow-objects-testing — ein typecheck-Skript, und checkJs ist in keiner tsconfig des Workspace gesetzt. turbo run typecheck prüft damit zwei von vier Paketen, und rund tausend Zeilen ausgelieferter Quelltext, die three und das Kernpaket über eine Nachrichtengrenze hinweg benutzen, sehen nie einen Typprüfer — auch nicht bei einem Bump von three, dessen Peer-Range bis 0.180 hinunterreicht. Das Kernpaket macht beides vor: tsconfig.lib.json emittiert Deklarationen, tsconfig.json prüft den ganzen Baum.
Empfehlung: Eine eigene tsconfig für das Paket mit allowJs und checkJs, ein typecheck-Skript, das turbo aufnimmt, und emitDeclarationOnly für die Deklarationen aus den JSDoc-Kommentaren. Das ist ein Schritt und bringt beides: Typen für den Konsumenten und eine Prüfung im ci-Lauf. Der types-Eintrag im veröffentlichten package.json gehört in denselben Zug, dazu die Zeile in distContract.files.txt, damit der Vertragstest die Deklarationen ab dann festhält. Für shadow-objects-testing genügt das Skript ohne die Deklarationen.
Abweichung von der Empfehlung: Die Deklarations-Hälfte entfällt (`.d.ts`, `types`-Feld, Zeile im distContract) — Entscheidung des Nutzers vom 2026-09-02. `allowJs` steht bereits in der Wurzel-`tsconfig.json` und wird nicht wiederholt.

**DX-030 · low · package.json (Skript clean); packages/shadow-objects-testing/package.json (scripts)** — pnpm clean lässt das Coverage-Verzeichnis der Integrationssuite stehen
pnpm clean ist turbo run clean plus ein rimraf auf dist coverage node_modules/.cache .turbo in der Wurzel. shadow-objects-testing hat als einziges Paket kein clean-Skript, also überspringt turbo es, und das rimraf nennt nur die Wurzel. packages/shadow-objects-testing/coverage/ überlebt damit jeden Aufräumlauf, pnpm cbt eingeschlossen, das CLAUDE.md als »full local cycle« führt. Der nächste Coverage-Merge liest dann ein Verzeichnis, dessen Inhalt aus einem älteren Lauf stammen kann, und der zusammengeführte Bericht sagt nicht, aus welchem.
Empfehlung: Ein "clean": "rimraf coverage" in packages/shadow-objects-testing/package.json, wie es die drei anderen Pakete haben. Eine Zeile, und die Zusage von pnpm cbt stimmt wieder.

**DX-031 · low · .nvmrc (24); mise.toml ([tools] node = "24"); package.json (engines.node >=24.13.0)** — .nvmrc und engines.node nennen nicht dieselbe Untergrenze
Drei Dateien sagen, welches Node gilt, und zwei davon sagen 24, während engines >=24.13.0 verlangt. Wer nvm use oder mise install folgt und dabei auf einer 24.0 landet, erfüllt beide Versionsdateien und verletzt die Engine-Angabe; pnpm meldet das je nach engine-strict-Einstellung gar nicht. In CI fällt es nicht auf, weil actions/setup-node mit node-version-file: .nvmrc die neueste 24.x zieht, also gerade den Fall, den die Datei nicht ausschließt.
Empfehlung: .nvmrc auf 24.13.0 setzen und mise.toml mit. Die Engine-Angabe ist die Aussage, die zählt; die beiden anderen Dateien sollten sie wiederholen statt sie zu unterbieten.

### [x] 2. Veröffentlichungskette: kein unaufgelöstes catalog: verlässt den Build
- Findings: BUILD-004 (medium), DX-026 (low)
- Ziel: Eine nicht aufgelöste Versionsangabe bricht den Build ab, ein Vertragstest hält die Form beider veröffentlichter Manifeste fest, und keine Stelle spricht mehr über eine Datei, die es nicht gibt.
- Bereich: `scripts/makePackageJson.mjs`, `scripts/publishNpmPkg.mjs`, beide `distContract.spec`, `CLAUDE.md`, `CHANGELOG.md`
- Hängt ab von: —
- Hash: c5570a6
- Modell: mittlere Stufe (`sonnet`)
- Effort: medium
- Dateien: `packages/shadow-objects/src/distContract.spec.ts`,
  `packages/shae-offscreen-canvas/src/distContract.spec.js`,
  `scripts/makePackageJson.mjs`,
  `scripts/publishNpmPkg.mjs`,
  `CLAUDE.md`, `CHANGELOG.md`
- Vorgehen:
  1. Zuerst die Zusicherung in **beide** Vertragstests, vor der Änderung an
     `makePackageJson.mjs`. Sie ist der Regressionstest dieses Pakets, und sie muss rot zu
     sehen sein, bevor der Bau sie grün macht (Schritt 2). In
     `packages/shadow-objects/src/distContract.spec.ts` als neuer Fall **hinter** »the shape of
     dist/package.json matches the recorded expectation« und vor »every entry point …«:

     ```ts
     it('no shipped dependency range is an unresolved workspace reference', () => {
       const pkg = JSON.parse(readFileSync(distPackageJsonPath, 'utf8'));

       // The check above deliberately holds no version range, because a range moves on every
       // release. The *form* of a range does not: `catalog:` and `workspace:` are pnpm-internal
       // references that resolve inside this workspace and nowhere else. One of them surviving
       // into the published manifest makes the package uninstallable for every consumer, so this
       // is an expectation that stays true across releases.
       const unresolved: string[] = [];
       for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
         for (const [name, range] of Object.entries(pkg[section] ?? {})) {
           if (typeof range === 'string' && /^(catalog|workspace):/.test(range)) {
             unresolved.push(`${section}.${name}: ${range}`);
           }
         }
       }

       expect(unresolved).toEqual([]);
     });
     ```

     In `packages/shae-offscreen-canvas/src/distContract.spec.js` derselbe Fall wortgleich, an
     derselben Stelle, mit `.npm-pkg/package.json` statt `dist/package.json` in der Beschreibung
     und ohne die Typannotation (`const unresolved = [];`). Beide Pakete veröffentlichen, also
     gilt die Zusicherung zweimal; einen gemeinsamen Helfer über die Paketgrenze hinweg gibt es
     nicht und bekommt sie auch nicht.

     `optionalDependencies` steht in der Liste, obwohl heute keins der beiden Pakete eins hat:
     ein Konsument löst diesen Abschnitt genauso auf wie die anderen beiden, und der Resolver in
     `makePackageJson.mjs` fasst ihn nicht an. `devDependencies` steht bewusst nicht dort — beide
     Pakete streichen den Abschnitt in ihrer `package.override.json`, und ein Konsument
     installiert ihn ohnehin nie.
  2. Den roten Lauf beider Zusicherungen nachweisen, bevor der Bau sie erfüllt. Der Nachweis
     kommt in den Report; ohne ihn ist das Paket nicht fertig. Gemessen wird an einem echten
     Bau, dessen Manifest anschließend von Hand verletzt wird — beide Ausgabeverzeichnisse sind
     gitignoriert, im Arbeitsbaum landet nichts:

     ```bash
     pnpm -F @spearwolf/shadow-objects build
     node -e 'const fs=require("node:fs");const f=process.argv[1];const p=JSON.parse(fs.readFileSync(f,"utf8"));p.dependencies["@spearwolf/eventize"]="catalog:";fs.writeFileSync(f,JSON.stringify(p,null,2))' packages/shadow-objects/dist/package.json
     pnpm -F @spearwolf/shadow-objects exec vitest src/distContract.spec.ts --run
     ```

     Erwartet: der neue Fall scheitert mit `dependencies.@spearwolf/eventize: catalog:` in der
     Differenz, die drei übrigen Fälle bleiben grün. Dasselbe für das Canvas-Paket mit
     `packages/shae-offscreen-canvas/.npm-pkg/package.json` und `src/distContract.spec.js`.
     Zurückgesetzt wird durch einen erneuten `pnpm -F <paket> build` — nicht von Hand.
  3. `scripts/makePackageJson.mjs` bricht ab, statt zu warnen. Neue Funktion unterhalb des
     Trenners, direkt hinter `resolveDependencies`:

     ```js
     // Every `catalog:` and `workspace:` specifier is a pnpm-internal reference that resolves
     // inside this workspace and nowhere else. One that reaches a published manifest makes the
     // package uninstallable for everyone, and nothing downstream catches it: the publish step
     // reads an exit code, not a warning. So the write is the last gate, and it refuses.
     function assertEveryVersionResolved(pkgJson) {
       const unresolved = [];
       for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
         for (const [name, version] of Object.entries(pkgJson[section] ?? {})) {
           if (typeof version === 'string' && /^(catalog|workspace):/.test(version)) {
             unresolved.push(`  ${section}.${name}: ${version}`);
           }
         }
       }
       if (unresolved.length === 0) return;
       console.error('Unresolved version references in the generated package.json:');
       console.error(unresolved.join('\n'));
       console.error('A consumer cannot install these. Check the catalog blocks in pnpm-workspace.yaml.');
       process.exit(1);
     }
     ```

     Aufgerufen wird sie **nach** der `packageJsonOverride`-Schleife und **vor**
     `fs.writeFileSync` — eine einzelne Zeile `assertEveryVersionResolved(outPackageJson);` über
     `const releasePackageJsonPath = …`. Die Reihenfolge trägt zwei Dinge: die Override-Datei
     kann ganze Abschnitte ersetzen und damit selbst eine unaufgelöste Angabe einschleusen, und
     eine Datei, die gar nicht erst geschrieben wird, kann kein späterer Schritt veröffentlichen.

     Die drei vorhandenen `console.warn`-Zeilen (Zeilen 65, 67 und der Block in
     `resolvePackageVersion`) bleiben stehen. Sie nennen, *welcher* Eintrag in *welchem* Katalog
     fehlt; das kann die Zusicherung nicht rekonstruieren, sie sieht nur das Ergebnis. Der
     `workspace:`-Zweig hat dieselbe Lücke wie der `catalog:`-Zweig — findet
     `resolvePackageVersion` das Paket nicht, bleibt `workspace:*` stehen —, und dieselbe
     Funktion fängt ihn mit ab.

     **Der Zeilen-Regex in `loadPnpmCatalog()` bleibt, wie er ist.** Dass er kein YAML-Parser ist,
     ist die Ursache, gegen die dieses Paket absichert, nicht die, die es beseitigt: eine
     YAML-Bibliothek wäre eine neue Abhängigkeit des Builds, und der Nutzen — ein Fall weniger,
     in dem der Parser danebengreift — ist kleiner als der einer Bremse, die *jeden* solchen Fall
     laut macht, auch die noch unbekannten.
  4. Den roten Lauf der Bremse nachweisen, ebenfalls in den Report. Eine Abhängigkeit des
     Canvas-Pakets zeigt vorübergehend auf einen Katalog, den es nicht gibt:

     ```bash
     node -e 'const fs=require("node:fs");const f="packages/shae-offscreen-canvas/package.json";const p=JSON.parse(fs.readFileSync(f,"utf8"));p.dependencies["@spearwolf/eventize"]="catalog:doesnotexist";fs.writeFileSync(f,JSON.stringify(p,null,2)+"\n")'
     pnpm -F @spearwolf/shae-offscreen-canvas build; echo "exit=$?"
     git checkout -- packages/shae-offscreen-canvas/package.json
     pnpm -F @spearwolf/shae-offscreen-canvas build
     ```

     Erwartet: `exit=1`, die Warnung mit dem Katalognamen und darunter die drei Fehlerzeilen,
     und **kein** `.npm-pkg/package.json` danach. `packages/shae-offscreen-canvas/package.json`
     rührt dieses Paket sonst nicht an, das `git checkout --` setzt also genau diese eine Zeile
     zurück; der abschließende Bau stellt das Ausgabeverzeichnis wieder her. Vor dem Verify muss
     `git status --short` wieder nur `remediation-plan.md` und die Dateien dieses Pakets zeigen.
  5. `scripts/publishNpmPkg.mjs`: die `.npmrc`-Zeile in `preparePackageRoot()` (Zeile 80)
     entfernen, ersatzlos und ohne Kommentar an ihrer Stelle. Von den beiden Wegen, die die
     Empfehlung offenlässt — streichen oder mit einem Satz begründen —, ist das Streichen der
     richtige: die Datei existiert im Repository nicht, die Zugangsdaten zur Registry erreichen
     das Skript über die Umgebung (OIDC in der CI, `NODE_AUTH_TOKEN`/`NPM_TOKEN` lokal, beides
     oben in derselben Datei dokumentiert), und ein Kommentar, der einen Leerlauf rechtfertigt,
     hält genau die Vorstellung am Leben, die der Befund beanstandet — dass dieses Projekt eine
     `.npmrc`-Konvention hätte. Die Helferfunktion `copyFile` samt Existenzprüfung bleibt: die
     drei übrigen Aufrufe brauchen sie.
  6. `CLAUDE.md`, zwei Stellen:
     - Absatz **»pnpm 11 specifics«** (Zeile 29): der mittlere Satz sagt, was gilt. Etwa: »Every
       pnpm setting belongs in `pnpm-workspace.yaml`; the project carries no `.npmrc`, and
       registry credentials reach `scripts/publishNpmPkg.mjs` through the environment — OIDC on a
       CI runner, `NODE_AUTH_TOKEN` or `NPM_TOKEN` locally.« Der erste und der dritte Satz des
       Absatzes bleiben unangetastet.
     - **Punkt 4 der Build-Pipeline** (Zeile 84): einen Satz anhängen, der die Bremse benennt —
       eine `catalog:`- oder `workspace:`-Angabe, die nach dem Anwenden der Override-Datei
       stehengeblieben ist, beendet das Skript mit Exit 1, statt geschrieben zu werden; der
       Publish-Schritt liest einen Exit-Code und keine Warnung. Die Klammer davor
       (»resolves `workspace:*`, `catalog:` and `catalog:<name>` refs …«) bleibt stehen.

     `AGENTS.md` wird **nicht** angefasst: seine einzige Aussage zum Thema (§ »Dependency
     versions«, Zeile 126) beschreibt, wie ein `package.json` im Workspace eine Version
     referenziert, und das ändert sich nicht. Die Werkzeugtabelle ebenso wenig.
  7. Wurzel-`CHANGELOG.md`, zwei Eingriffe:
     - Ein **neuer datierter Abschnitt** `## 2026-09-02 — <eigene Überschrift>` ganz oben, über
       dem vorhandenen Abschnitt vom selben Tag. Zwei Abschnitte mit demselben Datum sind die
       Machart dieser Datei (siehe die beiden vom 2026-08-26); die vorhandene Überschrift gehört
       einer anderen Sache und nimmt diese nicht mit auf. Aufbau wie die Nachbarn: ein Absatz,
       der die Sache benennt, darunter Aufzählungspunkte mit je einer fett vorangestellten Datei.
       Inhalt: die Bremse in `scripts/makePackageJson.mjs`, die Zusicherung in beiden
       `distContract.spec`, der entfallene Kopierschritt in `scripts/publishNpmPkg.mjs`, die
       nachgeführte Stelle in `CLAUDE.md`.

       **Gegenwart, kein Vorher-Nachher.** Die Konventionen im Kopf dieses Plans gelten für den
       CHANGELOG genauso wie für Code — kein »früher«, kein »statt bisher«. Die Überschrift trägt
       die Änderung, die Punkte tragen den Zustand, der ab jetzt gilt. Der vorhandene Abschnitt
       vom 2026-09-02 ist die Vorlage dafür.
     - Der Satz im Abschnitt vom 2026-09-02 (heute Zeile 9, nach dem Einfügen weiter unten):
       »… `pnpm clean` removes the `coverage/` directory in each of the three packages that
       **writes** one« → `write`. Das Relativpronomen hängt an »the three packages«, nicht an
       »each«. Der Punkt stammt aus dem Review von Paket 1, ist dort als klein offen geblieben
       und wird hier erledigt, weil er in einer Datei steht, die dieses Paket ohnehin
       umschreibt, und weil er von diesem Lauf stammt — ein eigenes Paket dafür am Ende wäre
       teurer als diese Zeile.

     Kein Paket-CHANGELOG: an der öffentlichen API von `@spearwolf/shadow-objects` und
     `@spearwolf/shae-offscreen-canvas` bewegt sich nichts. `pnpm make:todo` entfällt — keine
     `TODO`-Zeile wird angefasst.
  8. Was dieses Paket ausdrücklich **nicht** tut, damit niemand es für vergessen hält:
     - Keine der vier Vertragsdateien wird angefasst.
       `packages/shadow-objects/src/distContract.package.json` und `distContract.files.txt`
       ebenso wenig wie die beiden des Canvas-Pakets: die neue Zusicherung liest keine
       aufgezeichnete Erwartung, und an der Form der beiden Manifeste ändert sich nichts. Auch
       die Dateiliste bleibt gleich — Specs werden aus dem Lib-Transpile des Kernpakets
       ausgeschlossen, und `packages/shae-offscreen-canvas/build.mjs` filtert `*.spec.js` samt
       den beiden Vertragsfixtures aus der Kopie nach `.npm-pkg` heraus (nachgesehen).
     - Kein YAML-Parser, keine neue Abhängigkeit (Schritt 3).
     - Der Eintrag vom 2026-08-15 im Wurzel-`CHANGELOG.md`, der die `.npmrc` erwähnt
       (»**`.npmrc` is auth/registry only** from pnpm 11 on …«), bleibt unverändert. Er ist die
       Aussage seines Tages und stimmte an ihm; Historie wird in dieser Datei nicht
       zurückgeschrieben.
- Verify: `pnpm clean && pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`
  (`pnpm clean` steht vorn, weil Schritt 2 und 4 die Ausgabeverzeichnisse von Hand berühren —
  ein Verify, das ein handverletztes `dist/` oder `.npm-pkg/` prüft, prüft nichts. `pnpm build`
  ist zugleich der positive Beleg für die Bremse: beide Manifeste lösen heute sauber auf
  (nachgesehen: `^6.2.0`, `1.0.0-beta.1`, `^0.33.0`, `>=0.180.0`), ein rotes `build` gehört also
  diesem Paket. Playwright bleibt draußen: nichts hier berührt `shadow-objects-e2e`.)
- Commit: `fix(harness): an unresolved version reference stops the build, and the publish step drops the .npmrc copy`
- Ergebnis: 1 Runde · BUILD-004 und DX-026 behoben · `assertEveryVersionResolved()` in
  `scripts/makePackageJson.mjs` beendet den Bau mit Exit 1, sobald nach der Override-Schleife
  noch eine `catalog:`- oder `workspace:`-Angabe in `dependencies`, `peerDependencies` oder
  `optionalDependencies` steht; beide Vertragstests halten dieselbe Form am veröffentlichten
  Manifest fest; der `.npmrc`-Kopierschritt in `scripts/publishNpmPkg.mjs` ist entfallen und
  `CLAUDE.md` sagt, wie die Zugangsdaten wirklich ankommen · Regressionstest
  `no shipped dependency range is an unresolved workspace reference` in beiden
  `distContract.spec`, vor dem Fix rot gesehen (`dependencies.@spearwolf/eventize: catalog:`
  in der Differenz, je 1 failed); die Bremse ebenso, an einem Manifest mit
  `catalog:doesnotexist` — exit 1, kein `.npm-pkg/package.json` geschrieben · dazu der Numerus
  in `CHANGELOG.md:9` aus dem Review von Paket 1 · ein wichtiger Befund aus Runde 1 behoben
  (Vorher-Nachher-Sätze im neuen `CHANGELOG.md`-Bullet zu `scripts/publishNpmPkg.mjs`) ·
  Verify `paket-2.verify.log` exit 0, Coverage 94,23 % / 90,89 % wie die Baseline
- Nebenbefunde: → Queue (1)
- Folgen: keine
- Schnittstellen: `scripts/makePackageJson.mjs` beendet den Prozess mit Exit 1, statt eine
  unaufgelöste Versionsangabe zu schreiben — wer künftig einen Katalog umbaut oder eine
  `package.override.json` erweitert, bekommt einen roten Bau statt einer Warnung. Beide
  `distContract.spec` tragen einen Fall mehr; wer einen davon umschreibt, muss ihn mitnehmen.
  `scripts/publishNpmPkg.mjs` kopiert keine `.npmrc` mehr; das Projekt führt keine.

**BUILD-004 · medium · scripts/makePackageJson.mjs:50-71 und :73-120; packages/shadow-objects/src/distContract.spec.ts:88-97** — Ein nicht aufgelöstes catalog: wird als wörtliche Versionsangabe veröffentlicht
makePackageJson.mjs liest pnpm-workspace.yaml mit einem Zeilen-Regex und übersetzt daraus jedes "<dep>": "catalog:" in die echte Version. Findet der Parser den Eintrag nicht, schreibt er ein console.warn und lässt die Angabe stehen. Im veröffentlichten package.json steht dann "@spearwolf/eventize": "catalog:", und das Paket ist für jeden Konsumenten uninstallierbar. Der Weg dorthin ist kurz, weil der Parser keine YAML-Bibliothek ist: ein mehrzeiliger Wert, ein Kommentar an einer neuen Stelle, ein Schlüssel mit Doppelpunkt im Namen. Aufgefangen wird es von nichts. distContract.spec.ts prüft ausdrücklich nur die Namen der Abhängigkeiten und nicht ihre Ranges, mit der guten Begründung, dass Ranges sich bei jedem Release bewegen; und der Publish-Schritt in der CI liest keine Warnung, er liest einen Exit-Code.
Empfehlung: Eine Zusicherung in distContract.spec.ts, die keinen konkreten Range festschreibt, sondern nur die Form: kein Wert unter dependencies und peerDependencies beginnt mit catalog: oder workspace:. Das ist genau der Fehler, um den es geht, und er ändert sich bei keinem Release. Beide Pakete haben eine solche Spec, also gilt die Zeile zweimal. Stärker und billiger noch: makePackageJson.mjs bricht mit Exit-Code 1 ab, statt zu warnen.
Ergänzung zur Empfehlung: Beide Hälften werden umgesetzt, die Zusicherung nimmt zusätzlich `optionalDependencies` auf (Schritt 1), und die Bremse steht hinter der Override-Schleife statt im Resolver, damit sie auch die Abschnitte erwischt, die der Resolver nicht anfasst (Schritt 3).

**DX-026 · low · scripts/publishNpmPkg.mjs:80; CLAUDE.md, Abschnitt »pnpm 11 specifics«** — Zwei Stellen sprechen über eine .npmrc, die es nicht mehr gibt
publishNpmPkg.mjs kopiert vor dem Veröffentlichen die .npmrc der Wurzel in das Paketverzeichnis, und CLAUDE.md hält als Regel fest, dass .npmrc ausschließlich Auth und Registry trägt, während jede pnpm-Einstellung in pnpm-workspace.yaml gehört. Die Datei ist seit Commit d8d83fe nicht mehr im Repository. Der Kopiervorgang läuft ins Leere — copyFile prüft auf Existenz und tut sonst nichts —, also fällt niemandem etwas auf; die Regel in CLAUDE.md dagegen beschreibt eine Aufteilung, deren eine Hälfte fehlt, und wer sie befolgt, legt die Datei womöglich neu an.
Empfehlung: Beides an die Lage anpassen: den Kopierschritt in preparePackageRoot() streichen oder mit einem Satz begründen, warum er für den Fall stehenbleibt, dass wieder eine .npmrc gebraucht wird. In CLAUDE.md den Halbsatz so umschreiben, dass er sagt, was gilt — jede pnpm-Einstellung steht in pnpm-workspace.yaml, eine .npmrc führt das Projekt nicht.
Wahl innerhalb der Empfehlung: gestrichen, nicht begründet (Schritt 5).

### [x] 3. Die CI meldet Advisories und hält die verbindliche Sprache
- Findings: DEP-002 (low), DX-041 (low)
- Ziel: Ein wöchentlicher Lauf liest den Sicherheitsstand des Abhängigkeitsbaums, und ein Prüfschritt fängt die verbotenen Begriffe aus `AGENTS.md` §4 ab, bevor sie in die Doku zurückkommen.
- Bereich: `.github/workflows/`, `scripts/`, `package.json`, `packages/shadow-objects/docs/api-reference.md`, `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`
- Hängt ab von: —
- Hash: 74fbd2d
- Modell: mittlere Stufe (`sonnet`)
- Effort: medium
- Dateien: `.github/workflows/dependency-advisories.yml` (neu),
  `scripts/checkTerminology.mjs` (neu),
  `package.json`,
  `packages/shadow-objects/docs/api-reference.md`,
  `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`
- Vorgehen:
  1. `.github/workflows/dependency-advisories.yml` neu anlegen, wörtlich so:

     ```yaml
     name: Dependency Advisories

     # Asks the registry once a week whether anything in the dependency tree carries a
     # published advisory. Deliberately its own workflow and not a step in Continuous
     # Integration: an advisory in one of the 250-odd dev dependencies has nothing to do
     # with the change under review, and a pull request that turns red for it teaches
     # everyone to ignore red.
     #
     # The failing run is the notification. GitHub mails the repository owner when a
     # scheduled workflow fails on the default branch, and nothing else here reports.
     on:
       schedule:
         # Monday morning, off the top of the hour — scheduled runs queue behind everyone
         # who asked for :00 and can be delayed a long way.
         - cron: '17 6 * * 1'
       # A weekly schedule cannot be tried out. This makes the workflow runnable on demand.
       workflow_dispatch:

     permissions:
       contents: read

     jobs:
       advisories:
         name: Report high-severity advisories
         runs-on: ubuntu-latest
         timeout-minutes: 10
         steps:
           - uses: actions/checkout@v6

           - uses: pnpm/action-setup@v6

           - uses: actions/setup-node@v6
             with:
               node-version-file: .nvmrc

           # No install step and no store cache: `pnpm audit` reads `pnpm-lock.yaml` and asks
           # the registry about it, so the lockfile is all the job needs on disk.
           #
           # `--audit-level=high` gates the exit code and not only the output: a moderate
           # advisory is printed and the run stays green. `--ignore-registry-errors` keeps a
           # registry outage from raising a false alarm — this report is worth something only
           # as long as a red run means an advisory.
           - name: Audit the dependency tree
             run: pnpm audit --audit-level=high --ignore-registry-errors
     ```

     Vier Eigenschaften dieses Kommandos sind gemessen (2026-09-02, pnpm 11.21.0), nicht
     angenommen — sie tragen den ganzen Workflow und werden nicht noch einmal erhoben:
     - `pnpm audit` braucht kein `node_modules`. In einem Verzeichnis, das nur die fünf
       `package.json`, `pnpm-workspace.yaml` und `pnpm-lock.yaml` enthielt, lief es durch.
       Deshalb entfallen `pnpm install --frozen-lockfile` und `cache: pnpm` — und mit dem
       Install auch die Fehlerquelle, die `CLAUDE.md` beschreibt: pnpm 11 lässt ein
       `--frozen-lockfile` an einem Eintrag scheitern, der jünger als `minimumReleaseAge` ist.
     - Dieses Repository ist heute sauber: `pnpm audit --audit-level=low` meldet null.
     - Ein Baum mit `lodash@4.17.15` und `minimist@1.2.5` (3 moderate, 3 high, 1 critical)
       liefert bei `--audit-level=high` Exit 1 samt Advisory-Tabellen.
     - Ein Baum mit `tough-cookie@4.1.2`, dessen einzige Meldung moderate ist, liefert bei
       `--audit-level=high` Exit 0 und bei `--audit-level=moderate` Exit 1. Die Schwelle
       steuert also den Exit-Code, und genau darauf beruht die Zusage »eine Meldung, die etwas
       heißt«.

     Die Reihenfolge `pnpm/action-setup` vor `actions/setup-node` ist ohne `cache:` beliebig und
     steht so, weil die beiden anderen Workflows es so halten. **Kein `if:`-Wächter, keine
     `concurrency`-Gruppe** — ein Wochenlauf hat nichts, womit er kollidieren könnte.
  2. `scripts/checkTerminology.mjs` neu anlegen, wörtlich so:

     ```js
     // AGENTS.md §4 binds the vocabulary of this project's documentation, and a rule is only as
     // strong as whatever checks it: "Shadow Entity" reached the API reference and stayed there,
     // because the only thing between it and a release was a reader who knew the table.
     //
     // The corpus is the documentation someone opens to learn the language — the docs directory
     // of the core package and every README. AGENTS.md and CLAUDE.md stay out of it: they carry
     // the rule and have to name what they forbid. The changelogs stay out too, because an entry
     // is the record of its day and is not rewritten.
     //
     // Prose only, never identifiers. `shadowEntity` is a field of the canvas element and
     // `getEntityGraph()` is a method AGENTS.md keeps by name, so every pattern below needs
     // whitespace or a capital that camelCase cannot supply.
     //
     // "screen" is on the AGENTS.md list and deliberately absent here. It is banned *as analogy*,
     // and no pattern tells that from its literal use: this workspace ships a package called
     // shae-offscreen-canvas, and concepts.md says the renderer draws what the player sees on
     // screen. A check that flags a correct sentence is a check people switch off.

     import {globSync, readFileSync} from 'node:fs';

     const CORPUS = ['README.md', 'packages/*/README.md', 'packages/shadow-objects/docs/**/*.md'];

     const BANNED = [
       {pattern: /shadow\s+theat(er|re)/i, use: 'name the mechanism: Kernel, Entity, Shadow Object'},
       {pattern: /puppet/i, use: 'name the mechanism: Kernel, Entity, Shadow Object'},
       {pattern: /light\s+world/i, use: 'write View Layer'},
       {pattern: /shadow\s+entit(y|ies)/i, use: 'write Entity'},
       {pattern: /RemoteShadowObjectEnv/i, use: 'write RemoteWorkerEnv'},
       {pattern: /shadow\s+context/i, use: 'write ComponentContext, or Entity Context for the injection along the entity tree'},
       {pattern: /component\s+tag/i, use: 'write Token'},
     ];

     const files = CORPUS.flatMap((glob) => globSync(glob)).sort();

     // A corpus that matches nothing passes every time and looks exactly like a corpus that is clean.
     if (files.length === 0) {
       console.error(`no documentation found for ${CORPUS.join(', ')} -- run this from the repository root`);
       process.exit(1);
     }

     const hits = [];
     for (const file of files) {
       const lines = readFileSync(file, 'utf8').split('\n');
       for (const [index, line] of lines.entries()) {
         for (const {pattern, use} of BANNED) {
           const match = line.match(pattern);
           if (match) {
             hits.push(`${file}:${index + 1}: "${match[0]}" -- ${use}`);
           }
         }
       }
     }

     if (hits.length > 0) {
       console.error('Banned terminology in the documentation (AGENTS.md §4):');
       console.error(hits.join('\n'));
       process.exit(1);
     }

     console.log(`${files.length} documentation files, no banned terms`);
     ```

     Gemessen an genau diesem Entwurf, ebenfalls 2026-09-02:
     - `fs.globSync` läuft unter Node 24.13.0 — der Version aus `.nvmrc` — ohne
       Experimental-Warnung. Eine Warnung bei jedem `pnpm run ci` wäre der Grund gewesen, den
       Korpus von Hand aufzuzählen.
     - Der Korpus umfasst 12 Dateien: `README.md`, die vier Paket-READMEs, `docs/README.md`
       und die sechs übrigen Dateien in `packages/shadow-objects/docs/`.
     - Über den heutigen Stand meldet er genau zwei Treffer, beide `Shadow Entity` in
       `api-reference.md` (674, 945) — dieselben zwei, die Schritt 4 beseitigt.
     - Kein Regex trifft eine legitime Stelle. Insbesondere bleibt
       `packages/shadow-objects/docs/api-reference.md:951` (`game.shadowContext`) unentdeckt,
       weil camelCase keinen Zwischenraum hat; deshalb wird sie in Schritt 4 von Hand
       erledigt und nicht dem Prüfer überlassen.
     - Biome ändert an dieser Formatierung nichts (`biome check --write` über
       `--stdin-file-path=scripts/checkTerminology.mjs` liefert den Text unverändert zurück)
       und meldet keine Lint-Diagnose.

     **Kein Einlesen der Tabelle aus `AGENTS.md`.** Das wäre die eine Quelle der Wahrheit, und
     der Preis ist zu hoch: der Prüfer müsste die Ausnahme für »screen« ohnehin selbst tragen,
     und eine Umformatierung der Tabelle würde die Liste stillschweigend leeren — ein Prüfer,
     der nichts mehr prüft, sieht von außen aus wie einer, der grün ist. Die zweite Kopie wird
     stattdessen in Schritt 5 in `AGENTS.md` benannt, damit sie beim Erweitern der Tabelle im
     Blick steht.
  3. Wurzel-`package.json`, zwei Eingriffe im `scripts`-Block:
     - `"lint:terms": "node scripts/checkTerminology.mjs"`, einsortiert direkt nach `lint:ci`.
     - `ci` bekommt den Prüfer als **erstes** Glied:
       `"ci": "pnpm lint:terms && turbo run build typecheck test --filter=!shadow-objects-e2e && pnpm coverage && turbo run typecheck --filter=shadow-objects-e2e && pnpm lint:ci"`.
       Vorn, weil er der billigste Schritt der Kette ist (ein Regex über 12 Dateien) und weil
       sein Ergebnis von nichts abhängt, was danach kommt. Eine `&&`-Kette meldet ohnehin immer
       nur ihren ersten Fehler; dann lieber den, der nach Millisekunden dasteht.

     **Überall `pnpm run ci` schreiben, nie `pnpm ci`.** `ci` ist in pnpm 11 ein eingebautes
     Kommando (Aliasse `clean-install`, `ic`, `install-clean`): es räumt auf und installiert mit
     `--frozen-lockfile`, und das Skript aus der `package.json` kommt dabei nie zum Zug. Nur
     `pnpm run ci` trifft es. `.github/workflows/ci.yml:48` hält es richtig, und jede Zeile, die
     in diesem Paket entsteht — Verify, `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md` — hält es
     genauso.

     `.github/workflows/ci.yml` wird **nicht** angefasst: der Schritt heißt dort »Build,
     typecheck, test and lint«, und ein Skript namens `lint:terms` fällt unter »lint«. Die
     Aussage bleibt wahr, der Diff bleibt klein.
  4. `packages/shadow-objects/docs/api-reference.md`, drei Stellen, Zeilennummern des heutigen
     Standes:
     - Zeile 674: »… in the view hierarchy that maps to a Shadow Entity.« → »… that maps to an
       Entity.« Der übrige Satz bleibt Wort für Wort stehen.
     - Zeile 945: »Here is how you map a game engine object to a Shadow Entity manually:« →
       »… to an Entity manually:«.
     - Zeile 951: `context: game.shadowContext,` → `context: game.componentContext,`. Das ist ein
       Nebenbefund aus Zug 0 und gehört in dieses Paket, weil er dieselbe Ursache hat wie
       DX-041: die API-Referenz erfindet einen Namen, den die Tabelle in `AGENTS.md` §4
       ausdrücklich verbietet (»Namespace / `ComponentContext`«, nicht »Shadow Context«). Die
       Eigenschaft gehört einem erfundenen `game`-Objekt des Beispiels, hält aber ausweislich
       des `context:`-Parameters einen `ComponentContext`; der Bezeichner steht nirgends sonst
       im Repository (nachgesehen), das Umbenennen zieht also nichts nach sich. 25 Zeilen
       tiefer besteht dieselbe Datei in einem hervorgehobenen Kasten darauf, `ComponentContext`
       auszuschreiben — das Beispiel widerspricht seinem eigenen Abschnitt.

     Sonst ändert sich in der Datei nichts. `class GameEntity` bleibt, wie es heißt: »Entity«
     ist der gewollte Begriff.
  5. `AGENTS.md`, eine Ergänzung: unter »Binding Terms«, als neuer Absatz **hinter** dem
     hervorgehobenen Absatz zum Wort »context« (er gehört zur vierten Tabellenzeile und wird
     nicht von ihr getrennt). Inhalt in eigenen Worten, sinngemäß:

     > `pnpm lint:terms` checks the documentation against this section — the `docs/` directory
     > of the core package and every `README.md`. Its list of terms lives in
     > `scripts/checkTerminology.mjs`, so a row added to the table above belongs there as well,
     > or nothing checks it. The list leaves out "screen" on purpose: the word is literal in a
     > workspace that ships `shae-offscreen-canvas`, and only its use as an analogy is banned.

     Sonst wird `AGENTS.md` nicht angefasst. Die Terminologie-Zeile darüber (»Never use: …«)
     bleibt wörtlich stehen; sie nennt weiterhin alle fünf Analogien, und dass der Prüfer eine
     davon nicht mechanisch fassen kann, steht jetzt daneben.
  6. `CLAUDE.md`, eine Zeile: in der Kommando-Tabelle unter »Commands« eine neue Zeile
     unmittelbar nach der zu `pnpm lint:ci`:

     ```
     | `pnpm lint:terms` | `node scripts/checkTerminology.mjs` — fails when the docs or a README use a term `AGENTS.md` §4 forbids; runs first in `pnpm run ci` |
     ```

     Der neue Workflow bekommt in `CLAUDE.md` keinen Eintrag: die Datei führt pnpm-Skripte, keine
     GitHub-Workflows, und sie nennt heute auch `ci.yml` und `deploy.yml` nicht.
  7. Wurzel-`CHANGELOG.md`: ein neuer datierter Abschnitt ganz oben, über den beiden vorhandenen
     desselben Tages. Die Überschrift ist der Commit-Betreff ohne seinen Präfix, wie es die beiden
     Nachbarn halten:
     `## 2026-09-02 — a weekly advisory report, and a check that holds the binding terms`. Aufbau wie die Nachbarn: ein Absatz,
     der die Sache benennt, darunter Aufzählungspunkte mit je einer fett vorangestellten Datei —
     `.github/workflows/dependency-advisories.yml`, `scripts/checkTerminology.mjs`, `package.json`,
     `packages/shadow-objects/docs/api-reference.md`, `AGENTS.md`, `CLAUDE.md`.

     **Gegenwart, kein Vorher-Nachher.** Die Konventionen im Kopf dieses Plans gelten hier so
     streng wie im Code: kein »früher«, kein »statt bisher«, kein »bislang fehlte«. Die
     Überschrift trägt die Änderung, die Punkte tragen den Zustand, der ab jetzt gilt. Diese
     Stelle hat in Paket 1 und in Paket 2 je einen Review-Befund gekostet — zweimal dieselbe
     Falle, in derselben Datei. Der Abschnitt vom 2026-09-02 zur Veröffentlichungskette ist die
     Vorlage, die es richtig macht.

     Kein Paket-CHANGELOG. An der öffentlichen API von `@spearwolf/shadow-objects` bewegt sich
     nichts; `docs/` wird nicht mitveröffentlicht (Entscheidung vom 2026-09-02), und zwei Wörter
     plus ein Bezeichner in einem Beispiel sind keine Verhaltensänderung für einen Konsumenten.
     `pnpm make:todo` entfällt — keine `TODO`-Zeile wird angefasst.
  8. Zwei Nachweise gehören in den Report; ohne sie ist das Paket nicht fertig. Beide sind
     Belege dafür, dass die neue Mechanik etwas tut, statt nur dazustehen — dieselbe Probe, die
     Paket 2 an seiner Bremse gefahren hat.
     - **Der Prüfer fängt einen frischen Verstoß.** Einen verbotenen Begriff in eine
       Korpusdatei schreiben, `pnpm lint:terms` fahren, Exit 1 mit Datei, Zeile und Begriff
       sehen, zurücksetzen, Exit 0 sehen. Der Arbeitsbaum muss danach wieder ausschließlich die
       Dateien dieses Pakets zeigen (`git status --short`):

       ```bash
       printf '\nThe kernel puppeteers the light world.\n' >> packages/shadow-objects/docs/cheat-sheet.md
       pnpm lint:terms; echo "exit=$?"
       git checkout -- packages/shadow-objects/docs/cheat-sheet.md
       pnpm lint:terms; echo "exit=$?"
       ```

       Erwartet: erst Exit 1 mit genau zwei Zeilen zu `cheat-sheet.md` (`puppet` und
       `light world`), dann Exit 0 mit »12 documentation files, no banned terms«. Die beiden
       Treffer aus `api-reference.md` sind zu diesem Zeitpunkt bereits weg — deshalb steht
       diese Probe hinter Schritt 4 und nicht davor.
     - **Der Advisory-Lauf ist grün.** `pnpm audit --audit-level=high --ignore-registry-errors`
       im Wurzelverzeichnis, Exit 0 und »No known vulnerabilities found«. Das ist genau das
       Kommando aus dem Workflow; die roten Pfade sind oben in Schritt 1 gemessen und werden
       nicht wiederholt.
  9. Was dieses Paket ausdrücklich **nicht** tut, damit niemand es für vergessen hält:
     - Kein Dependabot- und kein Renovate-Manifest. Der Katalog in `pnpm-workspace.yaml` trägt
       zwei begründete Rückhaltungen und ein Paar, das nur gemeinsam bewegt werden darf; ein
       Bot arbeitete genau dagegen. So entschieden am 2026-09-02.
     - Kein `pnpm audit` in der Continuous Integration. Die Trennung ist der Punkt des Befundes.
     - Kein YAML- oder Markdown-Parser für die Begriffstabelle (Schritt 2).
     - »screen« steht in keinem Muster (Schritt 2), und `packages/shadow-objects/docs/concepts.md:9`
       (»draws what the player sees on screen«) bleibt unverändert: das ist die wörtliche
       Bedeutung und kein Bild.
     - `packages/shadow-objects-e2e/src/shae-worker.js:224` bleibt unverändert. Der Kommentar
       spricht dort von »the shadow entity that owns the slot« und meint die Entity im
       Shadow-Tree des DOM, nicht den verbotenen Begriff; die Stelle liegt außerhalb des
       Korpus und ist Quelltext, nicht Doku.
- Verify: `pnpm clean && pnpm run ci && pnpm audit --audit-level=high --ignore-registry-errors`
  (`pnpm run ci` ist hier die ehrliche Probe, weil dieses Paket genau dieses Skript umbaut: es fährt
  den neuen Prüfer an der Stelle, an der ihn auch GitHub fährt, und danach Build, Typecheck,
  Tests, Coverage-Merge, den e2e-Typecheck und `lint:ci`. `pnpm clean` steht wie in Paket 1 und 2
  davor, damit kein Ausgabeverzeichnis aus einem früheren Lauf mitspielt. Der Advisory-Aufruf
  hängt hinten an, weil der Workflow selbst hier nicht laufen kann — er ist zur Planungszeit grün
  und geht bei einer Registry-Störung nicht rot. Playwright bleibt draußen: dieses Paket fasst
  nichts an, was `shadow-objects-e2e` betrifft.)
- Commit: `chore(harness): a weekly advisory report, and a check that holds the binding terms`
- Ergebnis: 2 Runden · DEP-002 und DX-041 behoben · `.github/workflows/dependency-advisories.yml`
  fragt montags 06:17 UTC `pnpm audit --audit-level=high --ignore-registry-errors` gegen den
  Lockfile, ohne Install und getrennt von der Continuous Integration; `scripts/checkTerminology.mjs`
  hält sieben verbotene Begriffe über 13 Doku-Dateien und hängt als `pnpm lint:terms` vorn im
  `ci`-Skript · dazu die drei Stellen in `api-reference.md` (`:674`, `:945` auf »Entity«, `:951`
  auf `game.componentContext`) · Nachweise statt Regressionstest: ein frisch eingeschleuster
  Verstoß liefert Exit 1 mit Datei, Zeile und Begriff — je einmal in
  `packages/shadow-objects/docs/cheat-sheet.md` und in
  `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`, letzteres als Beleg für den
  erweiterten Korpus —, danach Exit 0 mit »13 documentation files, no banned terms«;
  `pnpm audit --audit-level=high --ignore-registry-errors` Exit 0 · zwei wichtige Befunde aus
  Runde 1 behoben (Vorher-Nachher-Sätze im neuen `CHANGELOG.md`-Abschnitt, Korpuslücke
  `packages/shae-offscreen-canvas/docs/`) samt drei kleinen im Prüferskript · klein und offen
  geblieben: der Eröffnungssatz von `scripts/checkTerminology.mjs` sagt seine Aussage zweimal,
  und der Kommentar in Zeile 11 nennt Großschreibung statt der Trennzeichenklasse `[\s-]+` als
  das, was die camelCase-Bezeichner schützt · Verify `paket-3.verify.log` exit 0, Coverage
  94,23 % / 90,89 % wie die Baseline
- Abweichungen vom Detailplan: der Korpus in `scripts/checkTerminology.mjs` steht auf
  `packages/*/docs/**/*.md` statt auf der wörtlich vorgegebenen Zeile, damit die Doku des
  Canvas-Pakets nicht ungeprüft driftet — der Plan hatte sie nicht ausgeschlossen, sondern nicht
  gesehen, und ein Terminologie-Prüfer ist Harness und nicht Konsumentendoku; die Ausgabe nennt
  dadurch 13 statt der geplanten 12 Dateien. Der einleitende Kommentar desselben Skripts weicht
  vom Wortlaut des Plans ab, weil dieser den Vorzustand erzählte und damit gegen die
  Konventionen im Kopf verstieß.
- Nebenbefunde: keine neuen — der aus Zug 0 (`api-reference.md:951`) ist in diesem Paket behoben,
  der zweite (`pnpm ci` als pnpm-Builtin) steht unter »Offene Befunde«
- Folgen: keine
- Schnittstellen: `pnpm lint:terms` (`node scripts/checkTerminology.mjs`) prüft `README.md`,
  `packages/*/README.md` und `packages/*/docs/**/*.md` gegen sieben Muster aus der Tabelle in
  `AGENTS.md` §4 und beendet sich mit Exit 1 beim ersten Treffer; ein leerer Korpus ist ebenfalls
  Exit 1. Das Skript hängt als erstes Glied im Wurzelskript `ci`, das nur über `pnpm run ci`
  erreichbar ist. Wer Doku in diesem Korpus schreibt, wird ab jetzt an dieser Liste gemessen; wer
  die Tabelle in `AGENTS.md` erweitert, trägt den Begriff in `BANNED` nach, sonst prüft ihn
  nichts.

**DEP-002 · low · .github/workflows/ci.yml (Job ci); .github/ (kein Dependabot-, kein Renovate-Manifest)** — Keine Instanz prüft den Abhängigkeitsbaum regelmäßig auf gemeldete Schwachstellen
Der Baum ist heute sauber — pnpm audit meldet über 254 Pakete null Advisories, und die zwei Laufzeit-Abhängigkeiten sind aus demselben Haus. Nur stellt diese Frage niemand außer einem Menschen, der von sich aus danach sieht: die CI baut, prüft Typen, testet und lintet, und kein Schritt darin liest den Sicherheitsstand. Ein Dependabot- oder Renovate-Manifest gibt es nicht, .github enthält ausschließlich die beiden Workflows. Damit hängt die Erkennung einer neuen Meldung — auch einer in der Toolkette, über die veröffentlicht wird — daran, dass jemand zufällig nachschaut. Ein Bot, der Versionen anhebt, wäre hier tatsächlich die falsche Antwort: der Katalog in pnpm-workspace.yaml trägt zwei begründete Rückhaltungen und eine Vierergruppe, die nur gemeinsam bewegt werden darf, und ein Bot würde genau daran arbeiten. Die Meldung ist trotzdem etwas anderes als der Bump.
Empfehlung: Ein eigener Workflow auf schedule, wöchentlich, der pnpm audit --audit-level=high laufen lässt und nichts weiter tut. Getrennt von der CI, damit ein Advisory in einer der 252 Dev-Abhängigkeiten keinen Pull Request rot färbt, und mit einer Schwelle, damit die Meldung etwas heißt. Alternativ Dependabot allein für den security-updates-Kanal, ohne die Versionspflege — dann bleibt der Katalog in menschlicher Hand und die Meldung kommt trotzdem an.
Wahl innerhalb der Empfehlung: der eigene Workflow, nicht Dependabot (Entscheidung vom 2026-09-02). Ergänzung: `--ignore-registry-errors` steht mit im Kommando — ein Wochenbericht, der bei einer Registry-Störung falschen Alarm schlägt, wird nach dem zweiten Mal weggefiltert, und dann meldet er auch den echten Fall nicht mehr.

**DX-041 · low · packages/shadow-objects/docs/api-reference.md:674, :945; AGENTS.md §4 (Binding Terms)** — Die API-Referenz benutzt zweimal einen Begriff, den die eigene Terminologie-Tabelle verbietet
AGENTS.md §4 führt eine Tabelle bindender Begriffe und begründet jeden Eintrag; »Shadow Entity« steht darin ausdrücklich auf der rechten, verbotenen Seite, mit der Begründung, dass Entity der ECS-Begriff ist und »Shadow« bereits in »Shadow Environment« steckt. Die Regel ist nicht als Empfehlung formuliert — AGENTS.md nennt sie erzwungen, und CLAUDE.md wiederholt sie. Die api-reference verwendet den Begriff trotzdem an zwei Stellen, beide im Abschnitt zu ViewComponent: einmal in der Einleitung des Abschnitts, einmal über dem Integrationsbeispiel. Es ist die Datei, die ein Leser für die verbindliche Sprache aufschlägt, und sie ist damit die einzige im Repository, die gegen die Tabelle verstößt.
Empfehlung: Beide Stellen auf Entity ziehen. An Zeile 674 heißt das »… that maps to an Entity«, an Zeile 945 »… map a game engine object to an Entity manually«; der Satzbau bleibt in beiden Fällen. Wer verhindern will, dass es zurückkommt, hängt eine Zeile an die CI, die die verbotenen Begriffe über docs/ und die READMEs grept — die Tabelle ist maschinenlesbar genug dafür.
Ergänzung zur Empfehlung: Der Prüfer wird gebaut (Schritt 2 und 3), aber er liest die Tabelle nicht ein, sondern führt seine eigene Liste — die Begründung steht in Schritt 2. Dazu kommt eine dritte Stelle in derselben Datei, die die Empfehlung nicht nennt: `:951` (Schritt 4).

### [x] 4. Testbestand: Lücken schließen, Registrierung und Rahmen richten
- Findings: TEST-005 (low), TEST-016 (low), TEST-025 (low), TEST-026 (low), TEST-007 (info), DX-038 (info)
- Ziel: Die drei Cache-Schlüsselräume und der Transferables-Zweig sind von je einem Fall festgehalten, kein `customElements.define` steht mehr in einem `it`, und jeder Rahmen sagt, was unter ihm steht.
- Bereich: `packages/shadow-objects/src/in-the-dark/`, `packages/shadow-objects/src/view/`, `packages/shadow-objects-testing/test/`
- Hängt ab von: —
- Hash: 2a28e96
- Modell: mittlere Stufe (`sonnet`)
- Effort: medium
- Dateien:
  `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`,
  `packages/shadow-objects/src/view/LocalShadowObjectEnv.spec.ts`,
  `packages/shadow-objects-testing/test/ent-element-namespace.test.js`,
  `packages/shadow-objects-testing/test/worker-element-attributes.test.js`
- Vorgehen:
  1. **Ein Fall über alle drei Schlüsselräume**, in
     `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`. Der neue
     `describe`-Block steht zwischen dem Ende von `describe('the deprecated isEqual argument', …)`
     (heute Zeile 299) und dem Beginn von `describe('provideContext', …)` (heute Zeile 301).

     Der Sachverhalt, gegen den geschrieben wird, steht in `ShadowObjectCreationScope.ts`: die drei
     Aufrufstellen `useProperty` (Zeile 518-526), `useContext` (Zeile 643-651) und
     `useParentContext` (Zeile 661-669) reichen `#cachedReader` (Zeile 432-461) je ein eigenes
     Kartenpaar herein — `#propertyReaders`/`#propertyCompares`, `#contextReaders`/`#contextReaderCompares`,
     `#contextParentReaders`/`#contextParentReaderCompares` (Zeile 100-114). Der Typparameter
     `K extends string | symbol` sichert die Zuordnung nicht: Methodenparameter von `Map` sind
     bivariant.

     Die Werte, die das beobachtbar machen, liefert `Entity.#findOrCreateContext()`
     (`Entity.ts:680-701`): `useContext()` liest die `SignalsPath([provide, inherited])` der Entity —
     ein eigener Provider gewinnt gegen den ererbten Wert —, `useParentContext()` liest `inherited`,
     also den direkten Link auf das Kontextsignal des Elternteils. Eine Entity, die denselben Namen
     als Property trägt, selbst bereitstellt und vom Elternteil erbt, liest ihn dreimal verschieden.

     ```ts
     describe('one name across property, context and parent context', () => {
       // The three cached readers share one body and differ only in the pair of maps each call
       // hands it; nothing in the type system holds that pairing, because `Map`'s method parameters
       // are bivariant. A crossed pair is observable only where one name is read over more than one
       // of the three ways, which is what this case does.
       it('reads the same name as a property, as a context and as a parent context, and gets three values', async () => {
         const registry = new Registry();
         const kernel = new Kernel(registry);

         let readers:
           | {
               property: SignalReader<any>;
               context: SignalReader<any>;
               parentContext: SignalReader<any>;
             }
           | undefined;

         @ShadowObject({registry, token: 'oneNameProvider'})
         class OneNameProvider {
           constructor({provideContext}: ShadowObjectCreationAPI) {
             provideContext<string>('shared', 'from the parent');
           }
         }
         expect(OneNameProvider).toBeDefined();

         @ShadowObject({registry, token: 'oneNameReader'})
         class OneNameReader {
           constructor({provideContext, useProperty, useContext, useParentContext}: ShadowObjectCreationAPI) {
             provideContext<string>('shared', 'from this entity');
             readers = {
               property: useProperty<string>('shared'),
               context: useContext<string>('shared'),
               parentContext: useParentContext<string>('shared'),
             };
           }
         }
         expect(OneNameReader).toBeDefined();

         const parentUuid = generateUUID();
         const childUuid = generateUUID();
         kernel.createEntity(parentUuid, 'oneNameProvider');
         kernel.createEntity(childUuid, 'oneNameReader', parentUuid, 0, [['shared', 'from the property']]);

         // `useContext()` settles through a one-microtask collector, and the parent's own context
         // signal settles the same way before the inherited link can carry it down.
         await nextMicrotask();

         expect(value(readers!.property)).toBe('from the property');
         expect(value(readers!.context)).toBe('from this entity');
         expect(value(readers!.parentContext)).toBe('from the parent');

         kernel.destroy();
       });
     });
     ```

     `nextMicrotask` steht bereits in Zeile 26, `value` und `generateUUID` sind importiert;
     `SignalReader` kommt aus `@spearwolf/signalize` und muss dem Typ-Import in Zeile 2 zugefügt
     werden. Reicht ein Mikrotask nicht, wird ein zweiter angehängt und der Kommentar darüber
     sagt warum — nicht die Werte anpassen.

     **Der Nachweis gehört in den Report.** Der Fall beweist erst dann etwas, wenn er die Kreuzung
     rot sieht: in `ShadowObjectCreationScope.ts` vorübergehend im `useContext`-Aufruf
     `this.#contextReaders, this.#contextReaderCompares` durch
     `this.#contextParentReaders, this.#contextParentReaderCompares` ersetzen, den Fall allein fahren
     (`pnpm -F @spearwolf/shadow-objects exec vitest src/in-the-dark/ShadowObjectCreationScope.spec.ts --run`),
     die rote Ausgabe in den Report nehmen, die Änderung zurücknehmen. Am Ende des Pakets steht in
     `git status` keine Zeile Produktivcode.
  2. **Der Transferables-Zweig der lokalen Umgebung**, in
     `packages/shadow-objects/src/view/LocalShadowObjectEnv.spec.ts`. Zwei Fälle in einem neuen
     `describe('a trail that carries transferables', …)` innerhalb von `describe('applyChangeTrail', …)`,
     direkt vor dem verschachtelten `describe('a trail re-created from the Component Memory', …)`
     (heute Zeile 168).

     Gegenstand ist `cloneChangeTrail.ts:5-7`: ein Trail-Eintrag mit nichtleerer `transferables`-Liste
     wird über `structuredClone(data, {transfer: transferables})` geklont, wobei `data` den Schlüssel
     `transferables` nicht mehr trägt. Gemessen (Node 25.9.0): der Klon trägt den Inhalt, die Quelle
     steht danach auf `byteLength === 0` und `detached === true`, und der Klon hat keinen
     `transferables`-Schlüssel.

     Erster Fall — der Regelweg. Ein `ArrayBuffer` mit bekanntem Inhalt geht als Property-Wert in
     einen `CreateEntities`-Eintrag, dessen `transferables` denselben Puffer nennt:

     ```ts
     const env = new LocalShadowObjectEnv();
     const buffer = new ArrayBuffer(4);
     new Uint8Array(buffer).set([1, 2, 3, 4]);
     const uuid = 'transferred-trail';

     void env.applyChangeTrail(
       [
         {
           type: ComponentChangeType.CreateEntities,
           uuid,
           token: 'foo',
           properties: [['payload', buffer]],
           transferables: [buffer],
         },
       ],
       false,
     );

     const received = env.kernel.getEntity(uuid).getProperty('payload') as ArrayBuffer;
     expect(Array.from(new Uint8Array(received))).toEqual([1, 2, 3, 4]);
     expect(received).not.toBe(buffer);
     expect(buffer.byteLength, 'the view side is left holding a detached buffer').toBe(0);

     env.destroy();
     ```

     Zweiter Fall — die Gegenprobe mit `env.disableStructuredClone = true` vor dem Aufruf: derselbe
     Trail, und danach `expect(received).toBe(buffer)` sowie `expect(buffer.byteLength).toBe(4)`.
     Beide Fälle brauchen je einen eigenen Puffer und eine eigene uuid.

     Ein Kommentar über dem ersten Fall sagt, warum die Abtrennung hier festgehalten wird: es ist der
     Weg, auf dem ein `ArrayBuffer` oder ein `OffscreenCanvas` in einer `LocalShadowObjectEnv` zu den
     Shadow Objects geht, und was ein AfterSync-Hörer im Trail danach vorfindet, hängt daran.

     **Auch hier der Nachweis:** `cloneChangeTrail.ts` vorübergehend auf `structuredClone(data)` ohne
     `{transfer: …}` setzen, den ersten Fall rot sehen (`buffer.byteLength` bleibt 4), die Ausgabe in
     den Report, Änderung zurücknehmen.
  3. **Ein Fehlschlag nennt alle Gründe**, in
     `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`, `describe('the
     deprecated isEqual argument', …)`. Jeder der sechs Fälle prüft in einem `it` Meldung, Wortlaut
     und Wirkung; fällt die erste Zusicherung, nennt der Lauf die übrigen nicht. Ein zusätzlicher
     Fall löst das nicht — die Fälle sind je einem Kernel und einem Membernamen zugeordnet, und das
     hält der Kopfkommentar in Zeile 45-47 fest.

     Also `expect.soft(…)` für die Zusicherungen, die voneinander unabhängig sind. Genau diese, mit
     den heutigen Zeilennummern:

     - Fall `useProperty: … to every kernel that meets it` (53): eine einzige tragende Zusicherung
       (73), bleibt unverändert.
     - Fall `useProperty: … reports once per kernel` (79): 98, 103, 104, 109.
     - Fall `provideContext:` (115): 135, 136, 139, 148, 149.
     - Fall `provideGlobalContext:` (155): 175, 176, 179, 183, 184.
     - Fall `useContext:` (190): 224, 225, 233, 238, 239.
     - Fall `useParentContext:` (245): 279, 280, 288, 293, 294.

     Dazu die Indexzugriffe entschärfen, sonst wird aus einer weichen Zusicherung ein `TypeError`,
     der die übrigen Gründe wieder verschluckt: `errorSpy.mock.calls[0]![2]` wird zu
     `errorSpy.mock.calls[0]?.[2]`, und in Zeile 102 wird `const call = errorSpy.mock.calls[0]!;` zu
     `const call = errorSpy.mock.calls[0];` mit `call?.[0]` und `call?.[2]` darunter.

     Ein Kommentar beim ersten `expect.soft` der Datei sagt, warum es dort steht: die drei Hälften
     eines Falls sind unabhängig prüfbar, und ein Lauf, der nur die erste nennt, kostet eine Runde
     Nachfragen.

     Die `expect(<Klasse>).toBeDefined()`-Zeilen bleiben, wie sie sind. Sie halten die dekorierte
     Klasse am Leben und stehen so in 209 Zusicherungen des Testbestands; eine Datei, die es anders
     hält, ist keine Verbesserung, sondern eine Abweichung.
  4. **Kein `customElements.define` mehr in einem `it`**, in
     `packages/shadow-objects-testing/test/ent-element-namespace.test.js`. Sechs Registrierungen
     stehen heute in vier Fällen (Zeile 318, 361, 407, 413, 475, 490). Ein zweiter Durchlauf
     desselben Falls — ein Vitest-Retry — liefe in `NotSupportedError: the name has already been
     used`. Retries sind in dieser Suite nicht konfiguriert, der Fehler ist latent.

     Alle sechs auf Modulebene ziehen, wie es `ent-element-context-clear.test.js:25-30` vormacht:
     die Klassen mitsamt ihrer Registrierung stehen dann jeweils unmittelbar über dem `describe`,
     dessen Fälle sie benutzen. Die Tag-Namen bleiben wörtlich, wie sie sind (`move-ent-n9`,
     `move-ent-n9d`, `move-ent-n9b`, `hand-ent-n9b`, `move-ent-n9c`, `hand-ent-n9c`), und die beiden
     `hand-ent-*`-Klassen werden **nicht** zu einer zusammengelegt: zwei Fälle, die sich einen Tag
     teilen, teilen sich auch dessen Verhalten, und die Unabhängigkeit der Fälle ist das, was der
     Kopfkommentar dieser Datei zusagt.

     Die Kommentare wandern getrennt: was die Klasse erklärt — warum `connectedMoveCallback` leer
     ist, warum die Unterklasse ein `onParentChanged` überschreibt — geht mit der Klasse nach oben;
     was den Fall erklärt — welche Bewegung er auslöst und was daran hängt — bleibt im `it`. Die
     `await customElements.whenDefined(…)`-Zeilen in den Fällen bleiben stehen.

     Die Fallkörper werden dabei nicht angefasst.
  5. **Jeder Rahmen sagt, was unter ihm steht**, in derselben Datei. `describe('shae-ent and a
     namespace change')` (Zeile 66) und der Kopfkommentar (Zeile 9-25) rahmen die Datei als
     Namespace-Wechsel; sieben der sechzehn Fälle darunter haben keinen. Wer sie sucht, sucht sie
     nicht hier. Der Rahmen wird deshalb aufgeteilt, in drei `describe`-Blöcke statt einem — die
     zweite Hälfte der Empfehlung, den Rahmen zu erweitern, allein würde die Datei zu einer Sammlung
     ohne Gliederung machen:

     - `describe('shae-ent and a namespace change')` behält die neun Fälle, die einen haben:
       Zeile 67, 81, 99, 116, 137, 159, 182, 263, 292.
     - `describe('shae-ent and a move between parents')` bekommt die vier `moveBefore`-Fälle:
       Zeile 312, 356, 401, 469.
     - `describe('shae-ent and an ancestor that cannot become the parent')` bekommt die drei, in
       denen der Elternteil verschwindet oder nicht antworten kann: Zeile 231, 546, 568.
     - `describe('namespace change and properties')` (Zeile 591) bleibt unberührt.

     Das `afterEach(unmountAll)` steht auf Dateiebene (Zeile 62-64) und gilt für alle drei; innerhalb
     der `describe`-Blöcke steht kein weiterer Aufbau, der mitwandern müsste. Die Fälle sind laut
     Kopfkommentar reihenfolgeunabhängig — eigene ids, eigene Namespaces —, das Umsortieren ist
     deshalb ein reines Verschieben.

     Der Kopfkommentar wird auf das gezogen, was die Datei hält: die Bindung an den Elternteil,
     beobachtet unter einem Namespace-Wechsel, unter einer Bewegung im Baum und an einem Vorfahren,
     der nicht antworten kann. Kein Rückblick auf den früheren Zuschnitt.

     Auch hier: kein Fallkörper wird angefasst, keine `it`-Überschrift geändert.
  6. **Zwei Kommentare gleichen Maßes**, in
     `packages/shadow-objects-testing/test/worker-element-attributes.test.js:21-22`. Die zweite
     Zeile misst 102 Zeichen, während der Blockkommentar drei Zeilen darüber auf 96 bis 98 gebrochen
     ist. Der Wortlaut bleibt, der Umbruch fällt auf dasselbe Maß — wörtlich so:

     ```js
     /** Every case that starts an environment gets its own namespace: two live environments
      * sharing one namespace log an "overwrite a namespace already in use" warning instead of
      * staying isolated. */
     ```
  7. **Die Gegenprobe zum Umbau der Browser-Datei**, vor dem Verify. Die Menge der Fälle in
     `ent-element-namespace.test.js` muss dieselbe sein wie vorher — Schritt 4 und 5 verschieben,
     sie schreiben nicht um:

     ```bash
     A=/tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad
     git show HEAD:packages/shadow-objects-testing/test/ent-element-namespace.test.js \
       | grep -o "it('[^']*'" | sort > "$A/paket-4.cases-before.txt"
     grep -o "it('[^']*'" packages/shadow-objects-testing/test/ent-element-namespace.test.js \
       | sort > "$A/paket-4.cases-after.txt"
     diff "$A/paket-4.cases-before.txt" "$A/paket-4.cases-after.txt"
     ```

     Der `diff` muss leer sein; beide Dateien haben 18 Zeilen. Das Ergebnis gehört in den Report.

     Kein CHANGELOG-Eintrag: das Paket fasst ausschließlich Testdateien an. Der Wurzel-CHANGELOG
     führt Build, Orchestrierung, Lint und Dev-Workflow, die beiden Paket-CHANGELOGs führen, was
     ein Konsument sieht — Testfälle innerhalb einer Suite sind weder das eine noch das andere.
     Ändert sich am Ende doch etwas außerhalb von Testdateien, gilt das nicht mehr und der
     Wurzel-CHANGELOG bekommt einen datierten Abschnitt. Keine `TODO`-Zeile wird angefasst, also
     kein `pnpm make:todo`. Kommentare und Testüberschriften auf Englisch; der Plan hier ist die
     einzige deutsche Zeile am Vorgang.
- Verify: `pnpm run ci`
- Commit: `test: the reader caches and a transferred trail get a case, and every frame names what it holds`
- Ergebnis: 1 Runde · TEST-005, TEST-016, TEST-025, TEST-026, TEST-007 und DX-038 behoben ·
  neuer Fall `reads the same name as a property, as a context and as a parent context, and gets
  three values` in `ShadowObjectCreationScope.spec.ts` (vor dem Fix rot gesehen: `useContext` auf
  die Elternkontext-Karten umgebogen → `expected 'from this entity' to be 'from the parent'`) ·
  zwei Fälle unter `a trail that carries transferables` in `LocalShadowObjectEnv.spec.ts` (vor dem
  Fix rot gesehen: `cloneChangeTrail` ohne `{transfer: …}` → `expected 4 to be +0`) · die sechs
  `customElements.define` aus `ent-element-namespace.test.js` stehen nicht mehr in einem `it`, die
  Datei trägt vier `describe`-Rahmen (9/4/3/2 Fälle), die sechs Deprecation-Fälle nennen über
  `expect.soft` alle Gründe, der Kommentar in `worker-element-attributes.test.js` ist auf das Maß
  seiner Nachbarn gebrochen · Gegenprobe zum Umbau: 18 Fallüberschriften vorher wie nachher, `diff`
  leer · Review ohne Befund · klein und offen geblieben: die sechs Registrierungen sitzen im Rumpf
  von `describe('shae-ent and a move between parents')` statt unmittelbar darüber — für den
  latenten Retry-Fehler gleichwertig, beides läuft einmal zur Sammelzeit · Verify
  `paket-4.verify.log` exit 0, Coverage 94,28 % / 91,01 % (Baseline 94,23 % / 90,89 %)
- Nebenbefunde: → Queue (1)
- Folgen: keine
- Schnittstellen: keine — das Paket fasst ausschließlich Testdateien an.


**TEST-005 · low · packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:100-114, :430-450** — Die Trennung der drei Cache-Schlüsselräume hält weder ein Typ noch ein Fall
Der gemeinsame Reader-Helfer bekommt Reader-Map und Compare-Map als Argumente; drei Aufrufstellen verdrahten je einen der drei Schlüsselräume — Property, Kontext, Elternkontext. Der Typparameter, der sie zusammenhalten soll, sichert nichts: Methodenparameter von Map sind bivariant, der Typprüfer nimmt eine Verdrahtung des Elternkontexts auf die Property-Maps klaglos an. Der Testbestand nimmt sie ebenso an. Beobachtbar würde eine gekreuzte Verdrahtung erst, wenn ein Fall denselben Namen über zwei der drei Wege liest und die Werte gegeneinander hält; kein Fall im Repository tut das.
Empfehlung: Ein Fall, der denselben Namen über useContext und useParentContext liest und zwei verschiedene Werte erwartet. Er beantwortet zugleich die Frage, wodurch die Trennung gesichert ist — durch einen Typ oder durch einen Fall.
Ergänzung zur Empfehlung: Der Fall nimmt den dritten Schlüsselraum mit — dieselbe Entity trägt den Namen zusätzlich als Property. Drei Werte unter einem Namen kosten dieselbe Vorbereitung wie zwei und decken alle drei Kartenpaare statt zweier ab (Schritt 1).

**TEST-016 · low · packages/shadow-objects/src/view/cloneChangeTrail.ts:5-7** — Der Transferables-Zweig der lokalen Umgebung ist von keiner Suite berührt
cloneChangeTrail() steht bei 60 %; ungeprüft sind genau die zwei Zeilen, die einen Change-Trail-Eintrag mit Transferables behandeln — structuredClone mit transfer-Liste. Das ist der Weg, auf dem ein ArrayBuffer oder ein OffscreenCanvas in einer LocalShadowObjectEnv an die Shadow Objects geht, und er hat eine Eigenschaft, die keine andere Zeile des Moduls hat: nach dem Klon ist der Puffer auf der View-Seite abgetrennt. Was ein AfterSync-Hörer danach in dem Trail vorfindet, den er als Argument bekommt, ist von keinem Test festgehalten. Das zweite veröffentlichte Paket reicht sein Canvas über genau diesen Mechanismus weiter.
Empfehlung: Ein Fall in LocalShadowObjectEnv.spec.ts, der einen Trail mit einem ArrayBuffer durch applyChangeTrail() schickt: drüben kommt der Inhalt an, hüben ist byteLength null. Ein zweiter mit disableStructuredClone hält die Gegenprobe fest.

**TEST-025 · low · packages/shadow-objects-testing/test/ent-element-namespace.test.js:318** — customElements.define steht im it-Block und überlebt keinen zweiten Durchlauf
Der Fall »the parent observer follows the element to its new parent« registriert sein Element innerhalb des it. Ein zweiter Durchlauf desselben Falls — ein Vitest-Retry — liefe in NotSupportedError: the name has already been used. Retries sind in dieser Suite nicht konfiguriert, der Fehler ist also latent und schlägt erst zu, wenn jemand retry setzt. Drei Fälle der Datei stehen inzwischen so; die Nachbardatei ent-element-context-clear.test.js hält ihre Klassen auf Modulebene, wo das Problem nicht auftritt.
Empfehlung: Die Klassen und ihre Registrierung auf Modulebene ziehen, wie es die Nachbardatei vormacht, oder je Fall einen eindeutigen Tag-Namen erzeugen.
Ergänzung zum Abgleich: es sind vier Fälle und sechs Registrierungen, nicht drei (Zeile 318, 361, 407, 413, 475, 490). Gewählt ist die erste Hälfte der Empfehlung — Modulebene —, weil die Registrierung in dieser Datei nirgends Gegenstand des Falls ist, sondern nur eine Unterklasse mit `connectedMoveCallback` bereitstellt.

**TEST-026 · low · packages/shadow-objects-testing/test/ent-element-namespace.test.js:66** — Der Rahmen der Datei verspricht einen Namespace-Wechsel, den ein Teil ihrer Fälle nicht hat
describe('shae-ent and a namespace change') und der Eröffnungsabsatz rahmen die Datei als Namespace-Wechsel. Die moveBefore-Fälle darin haben keinen — sie prüfen, wem die Elternbeobachtung folgt, wenn ein Element den Knoten wechselt. Wer nach diesen Fällen sucht, sucht sie in dieser Datei nicht.
Empfehlung: Die moveBefore-Fälle in ein eigenes describe mit eigenem Namen fassen, oder den Rahmen der Datei auf das erweitern, was sie tatsächlich abdeckt.
Ergänzung zum Abgleich: außer den vier moveBefore-Fällen stehen drei weitere ohne Namespace-Wechsel unter demselben Rahmen (Zeile 231, 546, 568). Beide Hälften der Empfehlung werden genommen: drei `describe`-Blöcke statt eines, und der Kopfkommentar sagt, was die Datei hält (Schritt 5).

**TEST-007 · info · packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts:61-73** — Drei Behauptungen in einem it, von denen die erste die übrigen verdeckt
Jeder der fünf Fälle prüft Warnung, Einmaligkeit und Wirkung in einem einzigen it-Block; fällt die erste Behauptung, nennt der Lauf die beiden anderen nicht. Aufteilen ist versperrt, solange die Deprecation-Warnung pro Realm und Methodenname nur einmal fällt — der Kopfkommentar der Datei hält das fest. Kein Deckungsverlust: zu jeder der drei Hälften existiert eine Mutation, die sie allein rot macht. Was fehlt, ist die Fehlermeldung, die den Grund beim ersten Blick nennt.
Empfehlung: Die drei Hälften so prüfen, dass ein Fehlschlag alle drei Gründe nennt. Ein zusätzlicher Fall löst es nicht — die Modulflagge lässt nur einen zu.
Ergänzung zum Abgleich: es sind sechs Fälle, nicht fünf, und die Liste der gemeldeten Namen hängt heute am Kernel statt am Modul (`#shownDeprecations` kommt aus dem Kernel herein, Kopfkommentar Zeile 45-47). Am Urteil ändert das nichts — die Empfehlung wird über `expect.soft` umgesetzt, nicht über zusätzliche Fälle (Schritt 3).

**DX-038 · info · packages/shadow-objects-testing/test/worker-element-attributes.test.js:22** — Zwei Kommentare unterschiedlichen Zeilenmaßes stehen nebeneinander
Die Kommentarzeile misst 102 Zeichen und steht drei Zeilen über einer, die auf 97 gebrochen wurde; im Blickfeld eines Lesers liegen damit zwei Kommentare verschiedenen Maßes nebeneinander. Erzwungen ist nichts: biome.json steht auf lineWidth 130, pnpm lint ist grün, und diese Datei führt kein Maß von 100 — 28 ihrer Zeilen liegen darüber, fast alles Code.
Empfehlung: Entweder die eine Zeile mitbrechen oder die Datei in Ruhe lassen. Ein Maß, das nur für Kommentare und nur in einer Datei gilt, ist keine Regel, sondern eine Erinnerung an den letzten, der hier war.
Gewählt ist die erste Hälfte: gebrochen wird. Der Blockkommentar drei Zeilen darüber steht auf 96 bis 98, und ein Kommentar, der als einziger im Blickfeld darüber hinausragt, ist genau der Stolperstein, den die Meldung beschreibt. Die Kosten sind eine Zeile.

### [x] 5. E2E: erwartete Konsolenfehler werden benannt statt pauschal erlaubt
- Findings: TEST-006 (low), TEST-014 (low), TEST-017 (low), TEST-023 (low), TEST-024 (low)
- Ziel: Eine Seite darf genannte Konsolenfehler haben und keine anderen, der Ablehnungsweg gegen eine echte Worker-Umgebung ist geprüft, und der Testplan beschreibt, was tatsächlich dasteht.
- Bereich: `packages/shadow-objects-e2e/`
- Hängt ab von: —
- Hash: 7856c72
- Modell: mittlere Stufe (`sonnet`)
- Effort: medium
- Dateien: `packages/shadow-objects-e2e/tests/runPageTests.ts`,
  `packages/shadow-objects-e2e/tests/sync-failure.spec.ts`,
  `packages/shadow-objects-e2e/tests/worker-failure.spec.ts`,
  `packages/shadow-objects-e2e/tests/shae-worker.spec.ts`,
  `packages/shadow-objects-e2e/src/shae-worker.js`,
  `packages/shadow-objects-e2e/TEST-PLAN.md`,
  `packages/shadow-objects-e2e/README.md`,
  `CHANGELOG.md`
- Vorgehen:
  1. **`tests/runPageTests.ts` — die Option wechselt von einer Erlaubnis zu einer Liste.**
     `allowConsoleErrors?: boolean` fällt ersatzlos weg und wird zu
     `expectedErrors?: (string | RegExp)[]`. Der Doc-Kommentar darüber sagt vier Dinge:
     jeder aufgezeichnete Fehler muss von einem Eintrag gedeckt sein, sonst fällt der Fall;
     ein String trifft als Teilzeichenkette, ein regulärer Ausdruck über `test()`, und der
     darf kein `g`-Flag tragen, weil `lastIndex` die Treffer sonst von der Aufrufreihenfolge
     abhängig macht; gematcht wird gegen die aufgezeichnete Zeile **samt ihrer Herkunftsmarke**
     `console.error: ` bzw. `uncaught: `, ein Muster kann also sagen, welche der beiden Quellen
     es meint; und die Einträge sind Erlaubnisse, keine Pflichten — welche Fehler eine Seite
     tatsächlich meldet, unterscheidet sich zwischen den Engines (gemessen: Chromium meldet den
     unbehandelten Fehler eines Workers nur an die Umgebung, Firefox und WebKit heben ihn
     zusätzlich auf die Seite).
     Die Destrukturierung in Zeile 39 nimmt `expectedErrors = []` statt `allowConsoleErrors = false`.
  2. **Der Fehlerfall wird immer registriert**, nicht mehr hinter `if (!allowConsoleErrors)`.
     Sein Titel hängt an der Liste: ist sie leer, heißt er weiter `no uncaught or logged errors`
     — für zehn der zwölf Seiten bleibt der Report damit unverändert —, sonst
     `no unexpected console errors`. Beide Titel sind wahr, ein gemeinsamer wäre es für die eine
     oder die andere Hälfte nicht.
     Der Rumpf:

     ```ts
     const covers = (error: string, pattern: string | RegExp) =>
       typeof pattern === 'string' ? error.includes(pattern) : pattern.test(error);
     ```

     lädt die Seite wie bisher über `loadPage`, filtert
     `errors.filter((error) => !expectedErrors.some((pattern) => covers(error, pattern)))`
     und erwartet auf dem Ergebnis `toEqual([])`. Die Fehlermeldung nennt in eigenen Zeilen:
     die URL der Seite mit dem Satz, dass sie Fehler aufgezeichnet hat, die kein Eintrag deckt;
     darunter jeden ungedeckten Fehler; darunter, was erlaubt gewesen wäre
     (`expectedErrors.map(String).join(' | ')`) oder bei leerer Liste, dass diese Seite keinen
     erwartet. Ohne die letzte Zeile ist ein Fehlschlag nicht zu lesen, ohne die Muster daneben
     zu haben.
  3. **Eine tote Liste fällt auf.** Direkt danach, nur wenn `expectedErrors.length > 0`:
     `expect(errors.length, …).toBeGreaterThan(0)` mit der Begründung im Text, dass die Seite
     erwartete Fehler nennt und keinen gemeldet hat, die Liste also veraltet ist. Das ist
     absichtlich die grobe Hälfte der Prüfung: »jedes Muster muss einmal treffen« ist nicht
     haltbar, solange eine Engine einen Fehler meldet und die nächste nicht — siehe den
     gemessenen Unterschied in Schritt 1. Was hier hängen bleibt, ist der Fall, dass das
     Verhalten hinter der ganzen Liste verschwindet, und genau der macht eine Liste stumm.
  4. **`tests/sync-failure.spec.ts`** tauscht `{allowConsoleErrors: true}` gegen:

     ```ts
     {
       expectedErrors: [
         /^console\.error: .*MessageRouter.*failed to apply change trail/,
         /^console\.error: .*ShadowEnv.*failed to apply change trail/,
       ],
     }
     ```

     Der vorhandene Kommentar darüber bleibt in der Sache und bekommt einen zweiten Satz: der
     Wortlaut hinter dem Namen des Melders unterscheidet sich je Engine — Firefox reduziert ein
     `Error`-Argument auf seinen Klassennamen und lässt die `%c`-Auszeichnung weg, die Chromium
     und WebKit mitdrucken —, deshalb halten sich die Muster an den Teil, den alle drei drucken.
     Gemessen am 2026-09-02 auf allen drei Engines: die Seite meldet vier Fehler, zwei Melder
     über zwei Zyklen, und keinen anderen.
  5. **`tests/worker-failure.spec.ts`** ebenso:

     ```ts
     {
       expectedErrors: [
         /^console\.error: .*RemoteWorkerEnv.*the shadow object took the worker down/,
         /^console\.error: .*ShadowEnv.*the environment proxy failed/,
         /^uncaught: .*the shadow object took the worker down/,
       ],
     }
     ```

     Der Kommentar sagt dazu, dass der dritte Eintrag nur auf den Läufen trifft, die ihn haben:
     Firefox und WebKit heben den unbehandelten Fehler des Workers auf die Seite, Chromium
     behält ihn im Worker. Die Herkunftsmarke `uncaught:` im Muster ist es, die diesen Eintrag
     vom ersten unterscheidet — ohne sie wären beide dasselbe Muster.
  6. **`src/shae-worker.js` — der Ablehnungsweg gegen eine echte Worker-Umgebung.**
     Ganz ans Ende von `main()`, hinter `shae-worker-view-and-worker-agree`, ein neuer
     Abschnitt im Stil der übrigen (`// --- … ---`). `worker0` fährt die entfernte Umgebung,
     ein `local` darauf nimmt also den Zweig, der das Attribut wieder entfernt; der andere
     Zweig gehört einem lokalen Element und liegt in der Integrationssuite. Gemessen: der
     Rückschreibe-Vorgang läuft synchron durch, unmittelbar nach `setAttribute` ist das Attribut
     in allen drei Engines schon weg — es wird nichts abgewartet.

     ```js
     worker0.setAttribute('local', '');

     testBooleanAction('shae-worker-refused-local-change-drops-the-attribute', () => !worker0.hasAttribute('local'));

     testBooleanAction('shae-worker-refused-local-change-keeps-the-remote-env', () => {
       const envProxy = shadowEnv0.envProxy;
       return !envProxy.isLocalEnv && envProxy.kernel == null && shadowEnv0.isReady;
     });
     ```

     `kernel == null` ist in dieser Datei die eingeführte Art, »nicht lokal« zu sagen — Zeile 102
     prüft die Gegenrichtung genauso. Der Kommentar über dem Block nennt den Grund für beides:
     warum `worker0` und nicht `worker1`, und dass der Konsolenfehler in der Spec deklariert ist.
  7. **`tests/shae-worker.spec.ts`** nimmt die beiden neuen IDs ans Ende der Liste, mit einer
     Kommentarzeile darüber wie die übrigen Gruppen sie haben, und bekommt als erste Spec
     dieser Seite ein Options-Argument:

     ```ts
     {
       expectedErrors: [
         /^console\.error: .*ShaeWorkerElement.*the "local" attribute cannot change once the shadowEnv is built/,
       ],
     }
     ```

     Gemessen: genau dieser eine Fehler, wortgleich auf allen drei Engines, und vor der
     Attributschreibung meldet die Seite keinen.
  8. **`src/shae-worker.js:76`** — der Kommentar über `worker0-timeouts-from-attributes` nennt
     die Wache beim alten Namen (`"no uncaught or logged errors"`). Diese Seite trägt sie ab
     jetzt als `no unexpected console errors`; der Kommentar wird nachgezogen, seine Aussage
     bleibt.
  9. **`TEST-PLAN.md` — die Zahlen.** Die Suite wächst um vier Fälle je Projekt: die beiden
     Fehlerseiten bekommen ihren Fehlerfall zurück (+2), `shae-worker` die beiden neuen IDs (+2).
     Gemessen vorher: `playwright test --list --project=chromium` meldet 227, der volle Lauf 681.
     Nachher also **231 je Projekt und 693 insgesamt**. Zu ändern sind:
     Zeile 6 im Kasten (»681 tests … 227 per project«), Zeile 22-23 in §1 (»Twelve spec files, 227
     registered test cases per project — 681 across …«) und drei Zellen der Tabelle in §1:
     `shae-worker.spec.ts` 31 → 33, `worker-failure.spec.ts` 13 → 14, `sync-failure.spec.ts`
     12 → 13. Die übrigen neun Zeilen bleiben. Die Beschreibungsspalte von `shae-worker.spec.ts`
     bekommt am Ende einen Halbsatz: ein `local` auf die laufende entfernte Umgebung wird
     abgelehnt, das Attribut ist danach wieder fort und die Umgebung weiter entfernt.
  10. **`TEST-PLAN.md` Zeile 42-44 — was das Harness beisteuert.** Der Absatz behauptet, die
     beiden Fehlerseiten trügen nur den Setup-Fall. Er wird ersetzt durch: beide Fälle kommen
     vom Harness, `test suite setup` und einer über die Fehler, die die Seite aufgezeichnet hat;
     eine Seite, die keinen erwartet, trägt ihn als `no uncaught or logged errors`, eine Seite,
     die ihre eigenen in `expectedErrors` benennt, als `no unexpected console errors` — der
     durchgeht, wenn jeder aufgezeichnete Fehler von einem Eintrag gedeckt ist, und beim ersten
     ungedeckten fällt. Genannt werden die drei Spec-Dateien, die welche benennen:
     `tests/sync-failure.spec.ts`, `tests/worker-failure.spec.ts`, `tests/shae-worker.spec.ts`.
  11. **`TEST-PLAN.md` Zeile 49-50 — die Schnappschuss-Aufzählung.** `multi-env` fällt aus der
     Liste heraus, die Liste sagt dafür, was die Machart ist (`requestSnapshot` hinein,
     `snapshot` mit Rundennummer und allen Entities des Kernels heraus), und eine Zeile darunter
     steht `multi-env` mit seiner eigenen: `public/mod-multi-env.js` beantwortet `requestReport`
     mit `probeReport`, ein Probe-Objekt, das sich selbst beschreibt. Dazu der Grund, damit die
     Abweichung nicht beim nächsten Lesen wieder als Versehen erscheint: dort ist die Frage,
     in welchem Namespace ein Wert ankommt, nicht welche Form der Baum hat, und darauf antwortet
     der Bericht einer einzelnen Entity.
  12. **`TEST-PLAN.md` Zeile 256 — die ASYNC-2-Zeile in §3.4.** Sie bekommt die Auszeichnung, die
     §3.1 bis §3.3 benutzen, und in derselben Zelle die Stellen, die den Fall tatsächlich decken:
     `async-broadcast-syncs`, `async-broadcast-reached-children`,
     `async-forwarded-event-arrives-as-dom-event` und `async-forwarded-event-carries-detail` auf
     `pages/async-events.html` (gemessen: `src/async-events.js:160` und `:179` schicken beide über
     `dispatchShadowObjectsEvent` gegen einen echten Worker). Dazu der Satz, warum es keinen
     eigenen Fall gibt: die Richtung View → Shadow Object ist die erste Hälfte dieser vier, ein
     Fall, der nur die Zustellung prüfte, prüfte eine echte Teilmenge davon.
     **Nur diese Zeile.** Die übrigen Zeilen der Tabelle tragen die Auszeichnung ebenfalls nicht,
     aber ihre IDs stehen als Gruppenkommentar in `tests/async-events.spec.ts` und in §2.3, wer
     nach ihnen sucht, findet sie also. `ASYNC-2` ist die einzige ID der Tabelle, die weder im
     Spec noch in einer Zelle vorkommt und trotzdem abgedeckt ist — die anderen vier ohne
     Fundstelle (ASYNC-8, ASYNC-10 bis ASYNC-12) sind offen und im Kasten oben als offen geführt.
     Die Tabelle im Ganzen nachzuziehen wäre eine Umschrift, die dieses Paket nicht beauftragt hat.
  13. **`TEST-PLAN.md` Zeile 306 — die H-FIX-5-Zelle.** Sie zählt drei Seiten, wo zwei stehen.
     Die Zahl wird nicht korrigiert, sie verschwindet: die Zelle nennt die Spec-Dateien beim
     Namen (`tests/sync-failure.spec.ts`, `tests/worker-failure.spec.ts` und ab jetzt
     `tests/shae-worker.spec.ts`) und beschreibt den Mechanismus, den das Harness nach Schritt 1
     bis 3 fährt — nicht mehr `allowConsoleErrors`. Ein Satz dazu, dass Dateinamen statt einer
     Zahl die Stelle bei der nächsten Seite mitwandern lassen, statt sie erneut altern zu lassen.
     Das weicht vom Wortlaut der Empfehlung ab (»Die Zahl auf zwei setzen«): die Zwei wäre nach
     diesem Paket bereits wieder falsch, weil `shae-worker` als dritte Seite hinzukommt. Die
     zweite Hälfte der Empfehlung — die Dateien benennen — ist genau das, was die Stelle heilt.
  14. **`README.md` des Pakets.** Unter »Writing a new page« ein Satz: eine Seite, die absichtlich
     einen Konsolenfehler auslöst, benennt ihn in `expectedErrors` ihrer Spec, statt die Prüfung
     abzuschalten — jeder andere Fehler bleibt ein Fehlschlag. In der Tabelle bekommt die Zeile
     `shae-worker` am Ende den abgelehnten `local`-Wechsel.
     Achtung: diese Datei liegt im Suchraum von `pnpm lint:terms` (`packages/*/README.md`), das
     als erstes Glied in `pnpm run ci` steckt. Die verbotenen Analogien aus `AGENTS.md` §4 gelten
     hier wörtlich.
  15. **`CHANGELOG.md` (Wurzel)** bekommt einen neuen datierten Abschnitt zuoberst, `## 2026-09-02`
     mit eigener Überschrift im Ton der vorhandenen. Der Wurzel-Changelog ist der richtige Ort:
     `shadow-objects-e2e` ist privat und führt keinen eigenen, und der Abschnitt vom 2026-08-23
     (»the programmatic construction path is covered by tests«) hat e2e-Harness und Fallzahlen
     bereits dort verbucht. Ein Bullet je Datei, und die Fallzahl
     je Projekt 227 → 231 (681 → 693 über drei Browser) gehört hinein.
  16. **Zum Schluss** `AGENTS.md` und `CLAUDE.md` gegenlesen: der e2e-Abschnitt beider beschreibt
     Kommandos und den WebKit-Aufbau, nicht die Semantik des Harness — es wird keine Änderung
     erwartet. Findet sich doch eine, gehört sie in dieses Paket. Keine `TODO`-Zeile wird
     angefasst, also kein `pnpm make:todo`. Alle Kommentare, Testtitel und Doku auf Englisch.
- Fallen, die dieses Paket ausgelegt hat:
  - **Ein liegengebliebener Preview-Server serviert einen alten Build.** `playwright.config.ts`
    steht auf `reuseExistingServer: !CI`; hängt auf Port 4174 noch ein `vite preview` aus einem
    früheren Lauf, wird es wiederverwendet und liefert die Seite von vor der Änderung — die neuen
    IDs erscheinen dann nie, und der Fehlschlag sieht aus wie ein Fehler in `src/shae-worker.js`.
    Vor dem Verify prüfen: `ss -lptn 'sport = :4174'` muss leer sein.
  - **Die Kürzel zweier Systeme sehen gleich aus.** `ASYNC-2`, `H-FIX-5`, `MULTI-8` sind die
    eigenen, dauerhaften Fallnummern von `TEST-PLAN.md` und stehen dort weiterhin. Die Nummern
    dieses Plans stehen in keiner Datei, in keinem Kommentar und in keiner Commit-Message.
  - **Biome bricht auf 130 Zeichen und `pnpm run ci` endet mit `lint:ci --error-on-warnings`.**
    Die längste neue Zeile ist das `ShaeWorkerElement`-Muster in Schritt 7; vor dem Verify
    `pnpm format` über die geänderten Dateien.
- Verify: `pnpm run ci && pnpm -F shadow-objects-e2e test`
  (`pnpm run ci` nimmt `shadow-objects-e2e` vom `test` ausdrücklich aus und typprüft es nur —
  ohne den zweiten Teil liefe die geänderte Suite in diesem Paket nie. Gemessene Grundlinie
  vom 2026-09-02: 681 Fälle grün in 72 s auf 12 Workern; danach müssen es 693 sein.)
- Commit: `test(e2e): a page names the console errors it provokes, and a refused local change has a case`
- Ergebnis: 1 Runde · TEST-006, TEST-014, TEST-017, TEST-023 und TEST-024 behoben ·
  `expectedErrors?: (string | RegExp)[]` löst `allowConsoleErrors` in
  `tests/runPageTests.ts` ab: der Fehlerfall wird für jede Seite registriert, heißt bei
  leerer Liste weiter `no uncaught or logged errors` und sonst
  `no unexpected console errors`, und eine Liste ohne einen einzigen gemeldeten Fehler
  fällt als veraltet auf · `sync-failure`, `worker-failure` und `shae-worker` benennen ihre
  Muster · `src/shae-worker.js` fährt den abgelehnten `local`-Wechsel gegen die entfernte
  Umgebung an `worker0` (zwei neue IDs) · `TEST-PLAN.md` auf 231 je Projekt und 693 gesamt,
  ASYNC-2 als abgedeckt geführt, die H-FIX-5-Zelle nennt Dateien statt einer Zahl,
  `multi-env` steht mit seiner eigenen Berichtsmachart · Nachweis des roten Laufs: ein
  verstümmeltes Muster in `sync-failure.spec.ts` lässt den neuen Fehlerfall fallen, mit dem
  ungedeckten Fehler und der Liste des Erlaubten in der Meldung · zwei wichtige Befunde aus
  Runde 1 behoben (veraltete Fallzahl in der H-FIX-8-Zeile, Vorher-Nachher-Sätze in drei
  `CHANGELOG.md`-Bullets) · Verify `paket-5.verify.log` exit 0 — `pnpm run ci` grün,
  693 E2E-Fälle grün in 1,2 min, Coverage 94,28 % / 91,01 %
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `tests/runPageTests.ts` nimmt `expectedErrors?: (string | RegExp)[]`
  statt `allowConsoleErrors?: boolean`. Ein String trifft als Teilzeichenkette, ein
  regulärer Ausdruck über `test()` und ohne `g`-Flag; gematcht wird gegen die aufgezeichnete
  Zeile samt ihrer Herkunftsmarke `console.error: ` bzw. `uncaught: `. Wer künftig eine
  E2E-Seite anlegt, die absichtlich einen Konsolenfehler auslöst, benennt ihn dort — jeder
  ungedeckte Fehler bleibt ein Fehlschlag, und eine Liste, die nie trifft, fällt auf.

**TEST-006 · low · packages/shadow-objects-e2e/tests/sync-failure.spec.ts:22, tests/worker-failure.spec.ts:23** — allowConsoleErrors nimmt zwei E2E-Seiten die Prüfung auf unbehandelte Fehler
Das Flag streicht den Fall »no uncaught or logged errors« samt seiner pageerror-Prüfung. Gerade auf einer Seite, deren Gegenstand abgelehnte Promises sind, wird damit die unbehandelte Rejection unsichtbar — dieselbe Klasse Fehler, die die Seite belegen soll. Es betrifft ebenso die Seiten worker-failure und create-element.
Empfehlung: Das Harness so erweitern, dass erwartete Konsolenfehler benannt statt pauschal erlaubt werden; alles andere bleibt dann ein Fehlschlag. Der Zug berührt drei Seiten und die Semantik des Harness und will für sich geplant sein.
Ergänzung zum Abgleich: Die beiden genannten Zeilen stehen unverändert. Die dritte Seite stimmt nicht mehr — `tests/create-element.spec.ts` trägt das Flag nicht, und die Seite meldet gemessen null Konsolenfehler auf allen drei Engines; der Wurzel-Changelog hält im Abschnitt vom 2026-08-23 fest, wann das Flag dort wegfiel. Gemessen am 2026-09-02, je Seite und Engine: `sync-failure` vier Fehler (`MessageRouter` und `ShadowEnv`, je zweimal), `worker-failure` zwei auf Chromium und drei auf Firefox und WebKit (der unbehandelte Fehler des Workers erreicht die Seite nur dort). Diese Zahlen tragen Schritt 4 und 5.

**TEST-014 · low · packages/shadow-objects/src/elements/ShaeWorkerElement.ts:449-469; packages/shadow-objects-testing/test/worker-element-attributes.test.js:336** — Der Ablehnungsweg gegen eine echte Worker-Umgebung ist von keiner Suite geprüft
#refuseLocalChange() schreibt den abgelehnten Wert über zwei Zweige zurück: einen für die lokale Umgebung und einen, der das Attribut entfernt, wenn die Umgebung keine lokale ist. Die drei Fälle in worker-element-attributes.test.js laufen alle gegen eine lokale Umgebung und erreichen damit nur den ersten Zweig. Der zweite trägt die Richtung, die ein Anwender in der Produktion fährt, und niemand prüft ihn.
Empfehlung: Einen Fall nach shadow-objects-e2e legen, wo ein echter Worker läuft: local an einem laufenden <shae-worker> setzen und prüfen, dass das Attribut wieder verschwindet und die Umgebung ihren Modus behält.
Ergänzung zum Abgleich: Die Methode steht jetzt auf `:458-478` — der Doc-Kommentar darüber ist gewachsen, der Rumpf ist derselbe. Die drei Fälle liegen auf `:339`, `:370` und `:401`; die genannte `:336` ist der `describe`-Rahmen darüber. Gemessen an der laufenden Seite: das Rückschreiben ist synchron, danach ist `isLocalEnv` weiterhin falsy, `kernel` null und `isReady` true, und die Meldung lautet auf allen drei Engines gleich (Schritt 6).

**TEST-017 · low · packages/shadow-objects-e2e/TEST-PLAN.md:254** — Ein P1-Fall des E2E-Testplans ist abgedeckt und nirgends als erledigt geführt
Der Fall ASYNC-2 — dispatchShadowObjectsEvent von der View zum Shadow Object über einen echten Worker — trägt Priorität P1, ist aber weder als Implemented markiert wie die Zeilen in §3.3, noch in der Offen-Liste im Kopf des Dokuments, noch in der ID-Klammer seiner §2-Zeile. Abgedeckt ist er tatsächlich, und zwar zweimal: src/async-events.js:158 und :177 schicken beide über dispatchShadowObjectsEvent, laufen dort aber unter anderen Fallnummern. Es fehlt die Zuordnung, nicht der Test — und wer den Plan liest, hält eine P1-Lücke für offen, die keine ist.
Empfehlung: Den Fall als Implemented markieren und in seiner ID-Klammer die beiden Stellen nennen, die ihn tatsächlich abdecken. Wenn zwei Fälle denselben Weg prüfen, gehört das in den Plan, damit die nächste Lücken-Suche nicht dieselbe Runde dreht.
Ergänzung zum Abgleich: Die Zeile steht jetzt auf `:256`, die Belegstellen auf `:160` und `:179`. Das Audit widerspricht sich einmal — die Beschreibung nennt ASYNC-2, das Evidence-Feld ASYNC-3. Nachgesehen: ASYNC-3 trägt seine beiden Fall-IDs in der Zelle (Zeile 257), ASYNC-2 trägt nichts. Der Befund gilt ASYNC-2, und §2.3 nennt ihn in Zeile 125 sehr wohl — was fehlt, ist die Zelle in §3.4, nicht der Verweis in §2 (Schritt 12).

**TEST-023 · low · packages/shadow-objects-e2e/TEST-PLAN.md:306** — Der Testplan zählt drei Seiten, die Konsolenfehler zulassen dürfen, und es sind zwei
Die Zeile nennt »allowConsoleErrors for the three pages that provoke one«. Gesetzt ist die Option an zwei Stellen: tests/worker-failure.spec.ts:23 und tests/sync-failure.spec.ts:22. §1 derselben Datei führt genau diese beiden korrekt auf — die Zahl weiter unten widerspricht ihr also innerhalb eines Dokuments, und wer sie liest, sucht eine dritte Seite, die es nicht gibt.
Empfehlung: Die Zahl auf zwei setzen und die beiden Spec-Dateien beim Namen nennen, damit die Stelle beim nächsten Wechsel mitwandert statt erneut zu veralten.
Ergänzung zum Abgleich: Zeile und Wortlaut unverändert. Von der ersten Hälfte der Empfehlung wird abgewichen: nach diesem Paket sind es tatsächlich drei Seiten, die Zwei wäre also schon beim Commit wieder falsch. Umgesetzt wird die zweite Hälfte, und sie ersetzt die Zahl, statt sie zu begleiten (Schritt 13).

**TEST-024 · low · packages/shadow-objects-e2e/TEST-PLAN.md:64** — Eine Seite steht in der Liste gleicher Schnappschuss-Machart und fährt eine andere
Die Aufzählung führt multi-env unter den Seiten, die ihren Zustand über das Paar requestSnapshot/snapshot melden. Die Fixture public/mod-multi-env.js:32-33 fährt stattdessen requestReport/probeReport auf einem einzelnen Probe-Objekt. Wer den Plan als Vorlage für eine neue Seite nimmt, greift damit zur falschen Machart.
Empfehlung: multi-env aus der Aufzählung herausnehmen und seine abweichende Machart eine Zeile darunter benennen — oder die Fixture auf das Paar der übrigen umstellen, wenn die Abweichung keinen Grund hat.
Ergänzung zum Abgleich: Die Aufzählung steht jetzt auf `:49-50`, die Fixture unverändert auf `:32-33`. Gewählt ist die erste Hälfte der Empfehlung. Die Abweichung hat einen Grund: `snapshot` liefert `{round, entities}`, einen Gang durch den Entity-Baum, `probeReport` den Bericht einer einzelnen Entity über sich selbst samt Echo. Das sind zwei verschiedene Dinge; die Fixture umzubenennen machte sie nicht zu einem und ließe den Plan eine Gleichheit behaupten, die es weiterhin nicht gibt (Schritt 11).

### [x] 6. Die Kernel-Spec entlang ihrer describe-Grenzen aufteilen
- Findings: TEST-012 (low)
- Ziel: Aus einer Datei mit 6 202 Zeilen und 201 Fällen werden acht thematisch geschnittene
  Specs von rund 320 bis rund 1 400 Zeilen, jede Grenze auf einer vorhandenen `describe`-Grenze,
  ohne dass ein Fall verlorengeht, seinen Namen oder sein Verhalten ändert.
- Bereich: `packages/shadow-objects/src/in-the-dark/`
- Hängt ab von: —
- Hash: 14b0ad6
- Modell: mittlere Stufe (`sonnet`)
- Effort: medium
- Dateien: `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts` (bleibt, schrumpft auf ~560
  Zeilen), dazu sieben neue Dateien im selben Verzeichnis:
  `Kernel.creation-api.spec.ts`, `Kernel.entity-context.spec.ts`,
  `Kernel.creation-api-teardown.spec.ts`, `Kernel.entity-tree.spec.ts`,
  `Kernel.teardown.spec.ts`, `Kernel.change-trail.spec.ts`,
  `Kernel.shadow-object-failures.spec.ts`. Sonst nichts — kein Produktivcode, kein Harness,
  kein CHANGELOG (Begründung in Schritt 6).
- Vorgehen:
  1. **Erst eine unberührte Kopie anlegen, dann daraus schneiden.** Alle Zeilennummern unten
     sind an `7856c72` gemessen und wandern, sobald jemand die Datei bearbeitet. Also einmal
     zu Beginn:

     ```bash
     git show HEAD:packages/shadow-objects/src/in-the-dark/Kernel.spec.ts \
       > /tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad/paket-6.Kernel.spec.ts.orig
     ```

     Jeder Block wird aus **dieser** Kopie herausgeschnitten (`sed -n 'A,Bp'`), nicht aus der
     Arbeitsdatei und nicht aus dem Gedächtnis. **Kein Block wird abgetippt.** Ein
     nachgetippter Fall sieht richtig aus und trägt eine umformulierte Überschrift oder eine
     Behauptung weniger; die Gegenprobe in Schritt 5 fängt die Überschrift, die fehlende
     Behauptung fängt sie nicht.
  2. **Der Schnitt.** Maßgeblich ist die Blocküberschrift, die Zeilennummer ist nur die
     gemessene Hilfe. Ein Block beginnt bei den Kommentarzeilen, die unmittelbar über seinem
     `describe(` stehen — drei Blöcke haben solche, sie sind unten genannt —, und endet bei
     dem `});`, das ihn auf seiner eigenen Einrückungstiefe schließt. Zwischen zwei Blöcken
     bleibt eine Leerzeile. Die Reihenfolge der Blöcke innerhalb einer Datei ist die
     Reihenfolge der Vorlage, damit wer die alte Datei kennt, sich in der neuen zurechtfindet.

     **Keine Überschrift wird geändert, keine Einrückung angepasst, kein `describe` neu
     verschachtelt.** Der vollständige Name eines Falls — Pfad der `describe`-Rahmen plus
     Titel — ist nach dem Schnitt Zeichen für Zeichen derselbe wie davor. Genau darauf setzt
     die Gegenprobe auf.

     **Jede der acht Dateien** trägt oben den Importblock (Schritt 3), darunter

     ```ts
     describe('Kernel', () => {
       afterEach(() => {
         Registry.get().clear();
       });
       // … die Blöcke dieser Datei …
     });
     ```

     Die drei Dateien, deren Blöcke aus `describe('Shadow Object Creation API')` stammen
     (`Kernel.creation-api.spec.ts`, `Kernel.entity-context.spec.ts`,
     `Kernel.creation-api-teardown.spec.ts`), tragen diesen Rahmen zusätzlich innen —
     wörtlich `describe('Shadow Object Creation API', () => {` auf zwei Leerzeichen
     Einrückung —, damit der volle Name der Fälle stehenbleibt.

     | Datei | Blöcke, in dieser Reihenfolge | Zeilen der Vorlage | Fälle |
     | --- | --- | --- | --- |
     | `Kernel.spec.ts` (bleibt) | die drei Fälle direkt unter `describe('Kernel')` · `MessageToView with traverseChildren` · `a notification listener that throws` (Kommentar ab 3339) · `Shadow Object Lifecycle Events` · `a lifecycle hook written under its string name` · `the members that carry the bookkeeping of the kernel` (Kommentar ab 6155) · `the logger slot holds no setter` | 42–172 · 174–265 · 3339–3436 · 3438–3555 · 6086–6153 · 6155–6175 · 6177–6201 | 20 |
     | `Kernel.creation-api.spec.ts` | innen: `entity` · `useProperty` · `useProperties` · der Fall `it('should support typed property maps')` · `createResource` · `createEffect` · `createSignal` · `createMemo` · `on` · `once` · `emit` · `onViewEvent`; **danach**, außerhalb des inneren Rahmens: `cache-hit on creation-API helpers reports when options would be dropped` | 268–290 · 292–374 · 376–403 · 405–439 · 1789–1874 · 1876–1969 · 1971–2105 · 2107–2165 · 2167–2268 · 2270–2387 · 2389–2455 · 2457–2515; dann 3843–3968 | 35 |
     | `Kernel.entity-context.spec.ts` | innen: `provideContext and useContext` · `useParentContext` · `provideGlobalContext` | 441–1355 · 1357–1496 · 1498–1787 | 32 |
     | `Kernel.creation-api-teardown.spec.ts` | innen: `signal cleanup on teardown` (Kommentar ab 2517) · `onDestroy` · `a teardown callback that throws` | 2517–2774 · 2776–3088 · 3090–3336 | 20 |
     | `Kernel.entity-tree.spec.ts` | Modulebene: `makeEntityChain` samt Kommentar. Dann `re-parenting maintains autoDestructionOnParentRemoval subscription` · `BFS cache is invalidated on programmatic destruction` · `setParent with unknown UUID does not orphan the entity` · `setParent without an order keeps the current one` · `traverseLevelOrderBFS` · `getEntityGraph` · `cycles in the entity tree` · `the entity tree bookkeeping follows every route that changes it` | 25–35; dann 3662–3694 · 3745–3765 · 3767–3807 · 3809–3841 · 4142–4238 · 4240–4334 · 4497–4523 · 5753–5934 | 26 |
     | `Kernel.teardown.spec.ts` | `Entity destruction` · `destroyEntity does not leak children` · `kernel teardown` · `an entity teardown with a shadow-object hook that throws` · `an entity teardown with a listener on the entity that throws` · `an entity teardown whose removeFromParent throws` · `the destruction notification of an entity` | 3557–3584 · 3696–3743 · 4336–4495 · 4764–4891 · 4893–5032 · 5034–5115 · 5117–5276 | 27 |
     | `Kernel.change-trail.spec.ts` | `autoDestructionOnParentRemoval flows through change trail` · `entity lookup and the change trail` · `a change trail the kernel cannot apply in full` · `the parent-change notification inside a change trail` | 3586–3660 · 4058–4140 · 5936–6028 · 6030–6084 | 14 |
     | `Kernel.shadow-object-failures.spec.ts` | `upgradeEntities with an entity that is destroyed while the upgrade runs` · `a creation that fails halfway through` · `createEntity with a uuid the kernel already holds` · `a token change with a shadow-object hook that throws` · `a shadow-object whose onCreate throws` · `a shadow-object rebuild that fails halfway through` | 3970–4056 · 4524–4653 · 4655–4762 · 5278–5375 · 5377–5512 · 5514–5751 | 27 |

     20 + 35 + 32 + 20 + 26 + 27 + 14 + 27 = 201, und 201 ist die Zahl, die der Lauf heute
     meldet. Geht die Summe nicht auf, ist der Schnitt falsch, bevor irgendein Test läuft.

     `makeEntityChain` steht in genau drei Blöcken (`traverseLevelOrderBFS`, `getEntityGraph`,
     `cycles in the entity tree`), und die liegen alle in `Kernel.entity-tree.spec.ts`. Die
     Funktion wandert deshalb dorthin, in kein eigenes Modul.

     `cache-hit on creation-API helpers reports when options would be dropped` liegt in der
     Vorlage **nicht** in `describe('Shadow Object Creation API')`, sondern eine Ebene höher,
     direkt unter `describe('Kernel')`. Es steht inhaltlich bei der Creation API und geht
     deshalb in deren Datei, aber es behält seine Ebene: es steht dort hinter dem `});`, das
     `Shadow Object Creation API` schließt, mit unveränderter Einrückung von zwei Leerzeichen.
  3. **Die Importe kürzen.** Jede neue Datei bekommt zunächst den vollständigen Importblock
     der Vorlage (Zeilen 1–23) und wird dann auf das reduziert, was sie tatsächlich benutzt.
     Das ist keine Kopfarbeit, das sagen die Werkzeuge: die Wurzel-`tsconfig.json` steht auf
     `noUnusedLocals`, also nennt `pnpm -F @spearwolf/shadow-objects typecheck` jeden
     überzähligen Namen mit Datei und Zeile, und `biome` führt `noUnusedImports` als Warnung,
     die `pnpm lint:ci` über `--error-on-warnings` zum Fehler macht. Umgekehrt fällt ein
     vergessener Import im selben Lauf auf. Zwei Läufe, und der Block stimmt.

     `verbatimModuleSyntax` steht in der Paket-`tsconfig.json`: ein reiner Typ-Import bleibt
     `import type`, so wie er in der Vorlage steht. Beim Kürzen wird nichts umgeschrieben,
     nur gestrichen.
  4. **Was in `Kernel.spec.ts` liegen bleibt, wird gelöscht, nicht umgeschrieben.** Am Ende
     enthält die Datei den gekürzten Importblock, den `describe('Kernel')`-Rahmen samt
     `afterEach`, ihre sieben Blöcke aus der Tabelle und das schließende `});`. Kein Rest,
     kein auskommentierter Block, kein Hinweis darauf, dass hier einmal mehr stand — die
     Konventionen im Kopf dieses Plans verbieten den Rückblick auf den Vorzustand, und die
     Historie steht im Commit.
  5. **Die Gegenprobe ist der Beweis, nicht der Testlauf.** Ein grüner Lauf sagt nur, dass
     die Fälle, die noch da sind, bestehen; er sagt nichts über die, die fehlen. Im
     Arbeitsverzeichnis liegen deshalb zwei Dinge, angelegt am 2026-09-02 gegen `7856c72`,
     also gegen den Stand **vor** dieser Änderung:

     - `paket-6.cases-before.txt` — die 201 vollen Fallnamen (`describe`-Pfad plus Titel),
       sortiert, eine je Zeile.
     - `paket-6-cases.mjs` — das Skript, das aus einem vitest-JSON-Report genau diese Liste
       erzeugt.

     Beide entstehen nicht neu und werden nicht angefasst. Die Liste ist gegen einen Umzug
     zwischen Dateien unempfindlich und gegen jede Umbenennung, jeden Verlust und jede
     Dopplung empfindlich — genau die drei Fehler, die dieser Umbau machen kann. Sie läuft
     als letztes Glied der Verify-Kette und muss `diff` mit exit 0 überstehen.
  6. Was dieses Paket ausdrücklich **nicht** tut, damit niemand es für vergessen hält:
     - **Keine Hilfsdatei für den gemeinsamen Aufbau.** Der Grobplan sah eine vor; nachgezählt
       besteht der gemeinsame Aufbau aus drei Zeilen `afterEach`, denn `makeEntityChain` hat
       nur einen Abnehmer. Ein Modul, dessen einziger Zweck eine `afterEach`-Registrierung
       beim Import ist, liest sich schwerer als die drei Zeilen, die es spart. Dazu kommt eine
       gemessene Klemme: unter `src/` überspringen `build.mjs`
       (`/\.(spec|specs|test)\.(ts|js)$/`) und `tsconfig.lib.json` nur `*.spec.ts`,
       `*.specs.ts` und `*.test.ts`. Eine Datei mit einem anderen Namen landet als
       `dist/src/in-the-dark/…` im veröffentlichten Paket und bricht
       `distContract.files.txt`; eine, die `.spec.ts` heißt, sammelt vitest als Spec ein und
       scheitert an ihrer fehlenden Testsuite. Die drei Zeilen stehen also achtmal.
     - **Kein CHANGELOG.** Es bewegt sich ausschließlich `*.spec.ts` unter
       `packages/shadow-objects/src/`. Nichts davon wird ausgeliefert (die Specs sind aus
       Lib-Transpile und Deklarationen ausgeschlossen), an der öffentlichen API bewegt sich
       nichts, und Build, Lint, turbo und pnpm bleiben unberührt — also weder ein
       Paket-CHANGELOG noch ein datierter Abschnitt in der Wurzel. Ändert sich am Ende doch
       etwas außerhalb der Spec-Dateien, gilt das nicht mehr.
     - **`AGENTS.md` und `CLAUDE.md` bleiben stehen.** Beide sagen über den Testbestand nur,
       dass die Specs als `*.spec.ts` neben der Quelle liegen; das bleibt wahr. Keine der
       beiden Dateien nennt `Kernel.spec.ts`.
     - **`packages/shadow-objects/CHANGELOG.md:517` bleibt unverändert.** Der Eintrag nennt
       »the 107 cases of `Kernel.spec.ts`« — eine Aussage seines Release-Tages, die an ihm
       stimmte. Historie wird in dieser Datei nicht zurückgeschrieben; das hat Paket 2 für den
       `.npmrc`-Eintrag genauso entschieden.
     - **Kein `concurrent`.** Der Kommentar über `signal cleanup on teardown` sagt, warum:
       `getSignalsCount()` und `getLinksCount()` sind prozessweite Zähler, und die drei
       zählenden Fälle nehmen eine Grundlinie und vergleichen dagegen. Der Kommentar wandert
       mit dem Block; die Warnung gilt in der neuen Datei genauso.
     - **Kein `pnpm make:todo`** — die Datei enthält keine `TODO`-Zeile.
     - Keine Änderung an `vitest.config.ts`. Das `include`-Muster `src/**/*.spec.{js,ts}`
       greift für alle acht Dateien; `pool: 'forks'` gibt ab jetzt acht Prozessen je ein
       Achtel der Arbeit statt einem Prozess die ganze.
- Verify: `pnpm run ci && pnpm -F @spearwolf/shadow-objects exec vitest src/in-the-dark/ --run --reporter=json --outputFile=/tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad/paket-6.cases-after.json && node /tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad/paket-6-cases.mjs /tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad/paket-6.cases-after.json /tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad/paket-6.cases-after.txt && diff -u /tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad/paket-6.cases-before.txt /tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad/paket-6.cases-after.txt`
  (`pnpm run ci` deckt `lint:terms`, Build, Typecheck, alle Suiten außer Playwright, den
  Coverage-Merge und `lint:ci` ab — die beiden letzten Glieder sind hier die eigentliche
  Arbeit: `noUnusedLocals` und `noUnusedImports` prüfen den Importschnitt jeder der acht
  Dateien. Die Gegenprobe dahinter ist nicht redundant: sie ist das einzige Glied, das einen
  *verschwundenen* Fall meldet. Zur Planungszeit an `7856c72` gemessen: `pnpm run ci`
  exit 0 (`paket-6.zug0-baseline.log` im Arbeitsverzeichnis), zusammengeführte Deckung
  94,28 % Anweisungen / 91,01 % Zweige, die Gegenprobe gegen sich selbst mit leerem `diff`,
  `git status --short` nur `remediation-plan.md`. Die Deckung ist die zweite Zahl, an der ein
  verlorener Fall auffällt: sie darf nach dem Schnitt nicht sinken. Playwright bleibt draußen — dieses Paket fasst nichts an, was
  `shadow-objects-e2e` betrifft.)
- Commit: `test(kernel): the kernel spec is cut along its own describe boundaries into eight files`
- Ergebnis: 1 Runde · TEST-012 behoben · `Kernel.spec.ts` schrumpft von 6 202 auf 575 Zeilen,
  sieben neue Specs im selben Verzeichnis tragen den Rest (`Kernel.creation-api` 1 044,
  `Kernel.entity-context` 1 363, `Kernel.creation-api-teardown` 838, `Kernel.entity-tree` 563,
  `Kernel.teardown` 769, `Kernel.change-trail` 328, `Kernel.shadow-object-failures` 821) ·
  Gegenprobe statt Regressionstest: die 201 vollen Fallnamen vor und nach dem Schnitt sind
  identisch (`diff` leer, `paket-6.cases-before.txt` gegen `paket-6.cases-after.txt`), jeder
  Block vom Reviewer zusätzlich zeichenweise gegen `paket-6.Kernel.spec.ts.orig` gehalten ·
  Review ohne Befund, weder kritisch noch wichtig noch klein · Verify `paket-6.verify.log`
  exit 0, zusammengeführte Deckung 94,28 % Anweisungen / 91,01 % Zweige wie zur Planungszeit
- Nebenbefunde: keiner
- Folgen: keine
- Schnittstellen: keine — das Paket fasst ausschließlich Testdateien an. Wer künftig einen
  Kernel-Fall sucht oder anlegt: `packages/shadow-objects/src/in-the-dark/Kernel*.spec.ts` sind
  acht Dateien, jede mit eigenem `describe('Kernel')`-Rahmen und eigenem
  `afterEach(() => Registry.get().clear())`.

**TEST-012 · low · packages/shadow-objects/src/in-the-dark/Kernel.spec.ts (6 202 Zeilen, 201 Fälle; describe('Shadow Object Creation API') ab Zeile 267)** — Die Kernel-Spec fasst 181 Fälle in einer Datei, ein describe davon über dreitausend Zeilen
Die Datei ist mit Abstand die größte des Repositories und mehr als sechsmal so lang wie die Klasse, die sie prüft. Dreißig describe-Blöcke stehen nebeneinander, einer davon nimmt gut die Hälfte der Datei ein. Wer einen Fall sucht, scrollt; wer einen hinzufügt, muss raten, wohin er gehört; und ein Lauf, der einen einzelnen Bereich prüfen soll, lädt immer alles. Die übrigen Specs des Pakets liegen zwischen 168 und 1221 Zeilen und zeigen, dass es auch anders geht.
Empfehlung: Entlang der vorhandenen describe-Grenzen aufteilen, etwa in Kernel.creation-api.spec.ts, Kernel.entity-tree.spec.ts, Kernel.teardown.spec.ts und Kernel.change-trail.spec.ts. Die Blöcke sind bereits thematisch sortiert, der Schnitt ist mechanisch, und der gemeinsame Aufbau wandert in eine Hilfsdatei daneben.
Ergänzung zum Abgleich: Es sind 33 Blöcke der zweiten Ebene plus drei Fälle, die direkt unter `describe('Kernel')` hängen, und `describe('Shadow Object Creation API')` misst 3 071 der 6 202 Zeilen — die Hälfte der Datei in einem Block. Die Zahl 181 im Titel ist überholt, der Lauf meldet 201. Die Spannweite der übrigen Specs des Pakets liegt inzwischen bei 33 bis 1 628 Zeilen (`ShadowEnv.spec.ts`).
Abweichung von der Empfehlung: Es werden acht Dateien statt vier, und keine Hilfsdatei. Vier Dateien ließen `Shadow Object Creation API` mit 3 071 Zeilen als einen Block stehen und behöben damit nur die erste Hälfte des Befunds — die zweite steht im Titel. Der Block hat eigene `describe`-Grenzen, an denen zwei saubere Nähte liegen: das Entity-Context-System (`provideContext`/`useContext`, `useParentContext`, `provideGlobalContext`, zusammen 1 348 Zeilen) und der Abbau der Creation-Scope eines Shadow Objects (`signal cleanup on teardown`, `onDestroy`, `a teardown callback that throws`, zusammen 820 Zeilen). Die Namen der vier vorgeschlagenen Dateien werden übernommen, bis auf `Kernel.entity-context.spec.ts` — »Entity Context« ist der bindende Begriff aus `AGENTS.md` §4 für genau diese Sache. Zur Hilfsdatei siehe Schritt 6. Ergebnis: acht Dateien von rund 320 bis rund 1 400 Zeilen, also im Maß der übrigen 33 Specs des Pakets.

### [x] 7. Doku: tote Links, fehlende Struktur, zu strenge Sätze, schwere Bilder
- Findings: DX-040 (medium), DX-042 (low), DX-033 (low), DX-023 (info), DX-027 (info),
  DX-028 (info), DX-036 (info), DX-037 (info) · DX-032 erste Hälfte (low) ist gegenstandslos,
  Begründung im Verlauf
- Ziel: Jeder Link, der in einem veröffentlichten Artefakt steht, löst auch auf npm auf; die
  Doku beschreibt die Wahrheitsregel boolescher Attribute an allen fünf Stellen so, wie
  `readBooleanAttribute` sie fährt; das Bild über der Wurzel-README wiegt statt 2,4 MB rund
  145 KB; das Architekturdiagramm steht in `concepts.md` statt unreferenziert daneben.
- Bereich: `README.md`, `packages/shadow-objects/` (README, docs, CHANGELOG),
  `packages/shae-offscreen-canvas/` (README, CHANGELOG), `docs/`, Wurzel-`CHANGELOG.md`
- Hängt ab von: 3 (der Terminologie-Prüfer aus Paket 3 muss über die geänderte Doku grün bleiben:
  `pnpm lint:terms` liest `README.md`, `packages/*/README.md` und `packages/*/docs/**/*.md`,
  also genau den Bereich dieses Pakets, und steckt als erstes Glied in `pnpm run ci`)
- Hash: `07962b2`
- Modell: mittlere Stufe (`sonnet`)
- Effort: medium
- Dateien: `README.md`, `docs/what-is-shadow-objects.webp` (ersetzt),
  `packages/shadow-objects/README.md`, `packages/shadow-objects/CHANGELOG.md`,
  `packages/shadow-objects/docs/api-reference.md`, `docs/cheat-sheet.md`,
  `docs/getting-started.md`, `docs/concepts.md`, `docs/README.md` (alle vier unter
  `packages/shadow-objects/`), `packages/shadow-objects/docs/architecture.svg` (gelöscht),
  `packages/shae-offscreen-canvas/README.md`, `packages/shae-offscreen-canvas/CHANGELOG.md`,
  `CHANGELOG.md` (Wurzel). Kein Quelltext, kein Harness, keine Testdatei.
- Vorgehen:

  1. **Jeder Link in einem veröffentlichten Artefakt wird absolut.** Veröffentlicht sind je
     Paket genau `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json` und `src/` —
     `preparePackageRoot()` in `scripts/publishNpmPkg.mjs` kopiert die ersten drei, die
     aufgezeichneten Dateilisten (`src/distContract.files.txt`) führen den Rest. Kein
     `docs/`-Verzeichnis geht mit. Ein relativer Link auf `docs/` oder aus der Paketwurzel
     heraus ist auf npm deshalb tot.

     Basis für jede Ersetzung ist `https://github.com/spearwolf/shadow-objects/blob/main/`.
     Der Zweig `main` und nicht ein Tag: die Doku folgt dem Hauptzweig, und
     `packages/shae-offscreen-canvas/CHANGELOG.md:3` schreibt bereits
     `https://github.com/spearwolf/shadow-objects/tree/main/…` — die Schreibweise steht also
     schon im Haus. Der Linktext bleibt in allen Fällen unverändert, nur das Ziel wandert.

     `packages/shadow-objects/README.md` — zehn Links, alle nach demselben Muster
     (`:90`, `:102`, `:112`, `:116`–`:122`):

     ```
     ](./docs/   →   ](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/
     ```

     Die Anker bleiben dran: `:90` endet auf `#web-components`, `:112` auf `#security`.

     `packages/shae-offscreen-canvas/README.md` — zwei Links, zwei verschiedene Ziele:

     - `:99` `[Package API](./docs/01-shadow-objects-api.md)` →
       `[Package API](https://github.com/spearwolf/shadow-objects/blob/main/packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md)`
     - `:100` `[Shadow Objects Core Docs](../shadow-objects/docs/README.md)` →
       `[Shadow Objects Core Docs](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/README.md)`

     Die beiden CHANGELOGs gehen denselben Weg mit, sie werden mitveröffentlicht:

     - `packages/shadow-objects/CHANGELOG.md:8` und `:523`: `](../../CHANGELOG.md)` →
       `](https://github.com/spearwolf/shadow-objects/blob/main/CHANGELOG.md)`
     - `packages/shae-offscreen-canvas/CHANGELOG.md:8`: dieselbe Ersetzung
     - `packages/shae-offscreen-canvas/CHANGELOG.md:50` und `:51`:
       `](../shadow-objects/CHANGELOG.md)` →
       `](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/CHANGELOG.md)`

     **Drei relative Ziele bleiben stehen, weil sie im Paket auflösen:**
     `packages/shadow-objects/CHANGELOG.md:461` (`](./README.md#installation)`),
     `packages/shae-offscreen-canvas/CHANGELOG.md:51` (`](./README.md)`) — die README liegt
     in der Paketwurzel neben dem CHANGELOG. Und `packages/shadow-objects/CHANGELOG.md:611`
     ist kein Link, sondern `` `[onCreate](entity)` `` in einem Codebeispiel.

     **Die Wurzel-`README.md` wird nicht angefasst.** Sie geht in kein Paket; ihre relativen
     Links auf `packages/shadow-objects/docs/…` lösen auf GitHub auf und folgen dort dem
     Stand des Baums, was absolute URLs nicht täten. Dasselbe gilt für die Doku unter
     `packages/*/docs/` untereinander.

  2. **Die Wahrheitsregel boolescher Attribute, an allen fünf Stellen.**
     `readBooleanAttribute` (`packages/shadow-objects/src/utils/attr-utils.ts:7-13`) liest
     `el.getAttribute(name)?.trim()?.toLowerCase() || '1'`. Ein Wert aus lauter Leerraum
     trimmt zur leeren Zeichenkette, das `|| '1'` macht daraus `'1'`, und `'1'` steht in
     `TRUTHY_VALUES`. `<shae-ent auto-destruct="   ">` ist also gesetzt — »every other value
     counts as unset« stimmt dafür nicht. Betroffen sind zwei Absätze in `api-reference.md`
     und drei in `cheat-sheet.md`; einseitig korrigiert wird die Doku uneinheitlich, und
     genau dagegen richtet sich der Befund.

     In allen fünf Fassungen steht die Wendung **`nothing but whitespace` auf einer Zeile**
     — der Verify zählt sie, und ein Zeilenumbruch mitten in der Wendung lässt ihn scheitern.

     (a) `packages/shadow-objects/docs/api-reference.md`: die Zeilen `:1850`–`:1852`, die mit
     »surrounding whitespace ignored)« beginnen, werden zu diesen vier:

     ```markdown
     surrounding whitespace ignored) — or when it stands there bare, `local`, `local=""` and
     `local="   "` alike, because a value of nothing but whitespace reads as the bare attribute.
     Every other value counts as unset, so `local="false"` stays in Worker mode and `no-autostart="0"`
     autostarts.
     ```

     (b) `packages/shadow-objects/docs/api-reference.md:2027-2030` wird zu diesen fünf:

     ```markdown
     **Truthy attributes are not presence attributes.** `auto-destruct` counts as set for `on`, `true`,
     `yes`, `local` or `1` (case-insensitive, surrounding whitespace ignored) or for the bare attribute,
     `auto-destruct`, `auto-destruct=""` and `auto-destruct="   "` alike, because a value of
     nothing but whitespace reads as the bare attribute; every other value counts as unset, so
     `auto-destruct="false"` and `auto-destruct="0"` promote the Entity.
     ```

     (c) `packages/shadow-objects/docs/cheat-sheet.md:234-237` wird zu:

     ```markdown
     **Truthy value ≠ presence.** `local` and `no-autostart` count as set for `on`, `true`, `yes`,
     `local`, `1` (case-insensitive, surrounding whitespace ignored) or for the bare attribute — a value of
     nothing but whitespace reads as the bare attribute — and as unset for everything else,
     `="false"` and `="0"` included. Of the boolean-looking attributes, only `no-structured-clone`
     asks for presence alone.
     ```

     (d) `packages/shadow-objects/docs/cheat-sheet.md:253-255` wird zu:

     ```markdown
     **Truthy value ≠ presence.** `auto-destruct` counts as set for `on`, `true`, `yes`, `local`, `1`
     (case-insensitive, surrounding whitespace ignored) or for the bare attribute — a value of
     nothing but whitespace reads as the bare attribute — and as unset for everything else,
     `="false"` and `="0"` included.
     ```

     (e) `packages/shadow-objects/docs/cheat-sheet.md:291-293` wird zu:

     ```markdown
     **Truthy value ≠ presence.** `no-trim` counts as set for `on`, `true`, `yes`, `local`, `1`
     (case-insensitive, surrounding whitespace ignored) or for the bare attribute — a value of
     nothing but whitespace reads as the bare attribute — and as unset for everything else,
     `="false"` and `="0"` included.
     ```

     `packages/shadow-objects/docs/api-reference.md:2465` — die Tabellenzeile zu `no-trim` —
     bleibt, wie sie ist. Sie zählt Werte auf, ohne die falsche Allaussage zu treffen; ein
     Eingriff dort ändert nichts an der Richtigkeit und nur an der Länge.

  3. **Das Bild über der Wurzel-README wird neu kodiert.** `docs/what-is-shadow-objects.webp`
     misst 1536 × 2752 und 2 423 516 Bytes und ist damit das größte Objekt des Repositories.
     Gemessen wurden vier Breiten gegen drei Qualitätsstufen; 900 px bei Qualität 80 ergibt
     900 × 1613 und 147 686 Bytes, und der Text der Infografik bleibt dabei durchgehend
     lesbar. GitHub stellt die README-Spalte ohnehin nur rund 890 px breit dar.

     ```bash
     magick docs/what-is-shadow-objects.webp -resize 900x -quality 80 \
       /tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad/paket-7.what-is-shadow-objects.webp
     mv /tmp/claude-1000/-home-spw-spaceland-shadow-objects/41af97c1-ec27-40c3-bae0-a902bcfa30dd/scratchpad/paket-7.what-is-shadow-objects.webp docs/what-is-shadow-objects.webp
     ```

     Nicht in einem Zug in dieselbe Datei schreiben — `magick` liest und schreibt dann
     gleichzeitig. Die Zwischenstufe liegt im Arbeitsverzeichnis, nicht im Projekt. Der
     Dateiname bleibt, `README.md:31` bleibt unberührt.

     Eine Zeile Ehrlichkeit für den CHANGELOG-Eintrag in Schritt 7: ein `git clone` holt die
     alte Fassung weiterhin mit, sie steht in der Historie. Leichter wird der Arbeitsbaum,
     nicht das Klonen. Wer etwas anderes schreibt, schreibt etwas Falsches.

  4. **Das Architekturdiagramm kommt in die Doku, der SVG-Export geht.** Drei Dateien liegen
     in `packages/shadow-objects/docs/`, auf die kein Link zeigt:
     `architecture@2x.png` (1624 × 928, 182 163 B), `architecture.svg` (812 × 464, 55 381 B)
     und `architecture.afdesign` (69 649 B).

     - `packages/shadow-objects/docs/concepts.md`: unter `### The Big Picture` (Zeile 52)
       kommt das Bild zwischen den Einleitungssatz und den ASCII-Block darunter. Der Satz
       endet auf »They communicate by passing messages.«, danach eine Leerzeile, dann:

       ```markdown
       ![The View Layer and one Shadow Environment, side by side](./architecture@2x.png)
       ```

       Der ASCII-Block bleibt: er nennt die Verschachtelung Kernel / Registry / Entity Tree /
       Entity / Shadow Object, das Bild zeigt die Trennung der beiden Threads und die
       Zuordnung von View-Component zu Entity. Zwei Blickwinkel, kein Duplikat.
     - `packages/shadow-objects/docs/architecture.svg` wird gelöscht. Die Datei nennt
       32-mal `font-family: 'BlexMonoSmBldNF', …` und führt keine `@font-face` mit; auf jedem
       Rechner ohne diesen Font — also bei jedem Leser und bei GitHubs Renderer — setzt der
       Fallback die Beschriftungen mit anderen Metriken neu. Nachgemessen an einem Rendering
       mit Fallback-Font: die Rahmen brechen auf. Der PNG-Export trägt seinen Text als Pixel
       und sieht überall gleich aus.
     - `packages/shadow-objects/docs/README.md`: direkt unter die Tabelle »The Files« kommt

       ```markdown
       The diagram in [concepts.md](./concepts.md) is `architecture@2x.png`. Its editable source is
       `architecture.afdesign`, an Affinity Designer document — whoever changes the diagram edits that
       file and exports the PNG again.
       ```

       Damit steht die `.afdesign` nicht mehr grundlos da, sondern als das, was sie ist.

     Die Beschriftungen »your Components« und »your Entities« laufen im PNG unten aus ihren
     Rahmen und werden vom Rand beschnitten. Das steckt in der Vorlage, nicht im Export, und
     wäre nur in Affinity Designer zu richten — kein Werkzeug dieses Laufs. Der Befund steht
     als Nebenbefund im Plan; das Diagramm bleibt trotzdem in der Doku, weil es inhaltlich
     stimmt und die Begriffe von heute trägt.

  5. **Die Strukturlisten der Wurzel-README, ein Durchgang.** Betroffen ist der Block unter
     `## 📦 What's in the Box? (Project Structure)`. Drei Zeilen bewerten, statt zu benennen;
     die Information steht jeweils in der zweiten Satzhälfte. **Keine Zahlen einsetzen** — die
     Liste hat schon einmal eine Zeilenzahl getragen, die um den Faktor 2,5 danebenlag, und
     eine Zahl in einer README altert schneller als der Satz um sie herum.

     - `README.md:84`: »The framework is strictly modularized into functional domains.« →
       »The framework is split into functional domains.«
     - `README.md:95`: »**`packages/shae-offscreen-canvas/`:** A reference implementation
       demonstrating heavy lifting! Runs `three.js` in a Worker, proving the power of
       Transferables and Namespaces.« → »**`packages/shae-offscreen-canvas/`:** Runs
       `three.js` in a worker and renders onto an `OffscreenCanvas` — the worked example for
       Transferables and Namespaces.«
     - `README.md:96`: »**`packages/shadow-objects-testing/` & `e2e`:** Massive test suite
       spanning unit tests (vitest), real DOM integration in Chromium, and E2E specs via
       Playwright.« → »**`packages/shadow-objects-testing/` & `e2e`:** Three suites — vitest
       specs next to the source, DOM integration in real Chromium, and Playwright end-to-end
       specs.«

     Die Zeilen `:87` bis `:92` bleiben. »The ECS heart« ist ein Bild, aber es steht neben
     der Aufzählung dessen, was dort liegt, und behauptet nichts, was falsch werden kann.

  6. **Drei Kleinigkeiten.**

     - `packages/shadow-objects/docs/cheat-sheet.md`: `## FrameLoop` (Zeile 507) bekommt den
       Trenner, den die zwölf anderen Abschnitte tragen. Zeile 506 ist leer, Zeile 505
       schließt einen Codeblock. Eingefügt wird zwischen 506 und 507 eine Zeile `---` und
       darunter eine Leerzeile — dasselbe Muster wie vor `## ShadowEnv Quick Setup`.
     - `packages/shadow-objects/README.md:17`: der Absatz zur Ein-Kopie-Regel setzt dreimal
       `` `dependencies` `` mit wechselndem Bezug. Zwei Ersetzungen im laufenden Text, sonst
       bleibt der Absatz Wort für Wort stehen:
       - »needs eventize in its own `dependencies`, at the range declared in this package's
         `dependencies`« → »needs eventize in your own manifest, at the range this package
         declares«
       - »takes the version declared in its `dependencies`« → »takes the version this package
         declares«
     - `packages/shadow-objects/docs/getting-started.md:23`: der einzige Geviertstrich der
       Datei wird zu ` -- `, der Schreibweise der drei übrigen Einschübe. »needs no line of
       its own — and if you want it« → »needs no line of its own -- and if you want it«.

  7. **Die drei CHANGELOGs.** Jede Seite aus ihrer eigenen Perspektive, nichts doppelt.

     - `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]` ans Ende der
       Bullet-Liste: die Doku-Links der README zeigen auf GitHub und lösen damit auch auf der
       Paketseite auf; die API-Referenz und das Cheat-Sheet beschreiben die Wahrheitsregel
       für `local`, `no-autostart`, `auto-destruct` und `no-trim` samt dem Leerraum-Fall.
     - `packages/shae-offscreen-canvas/CHANGELOG.md`, unter `## [Unreleased]`: die beiden
       Doku-Links der README und die Verweise des CHANGELOG auf den Monorepo- und den
       Kernpaket-CHANGELOG zeigen auf GitHub.
     - `CHANGELOG.md` (Wurzel), neuer datierter Abschnitt `## 2026-09-02 — …` an den Anfang
       der Abschnittsliste, im Format der vorhandenen: ein Satz als Überschriftentext, darunter
       ein Bullet je Datei. Hinein gehören das Bild, das Architekturdiagramm samt gelöschtem
       SVG-Export, die Strukturlisten der Wurzel-README und der Trenner im Cheat-Sheet.

     Für alle drei gilt der Abschnitt »Konventionen« im Kopf dieses Plans, und eine Regel
     daraus mit Nachdruck: **kein Rückblick auf den Vorzustand.** Kein »früher«, kein »statt
     bisher«. Ein Eintrag sagt, was jetzt gilt. Paket 8 räumt genau solche Sätze unter
     `[Unreleased]` weg — was hier entsteht, soll dort nicht wieder auf dem Tisch liegen.

  8. **`AGENTS.md` und `CLAUDE.md` brauchen keine Änderung**, und das ist nachgesehen, nicht
     angenommen: die Sieben-Datei-Regel in `AGENTS.md` §3 zählt Markdown-Dateien, und deren
     Zahl bleibt sieben; die Bildbeilagen des Doku-Verzeichnisses stehen dort nicht. Fällt
     beim Arbeiten doch eine Stelle auf, die durch dieses Paket unwahr wird, wird sie
     mitgezogen und im Report benannt.

- Verify: `pnpm run ci && ! grep -REn '\]\((\.\./|\./docs/)' packages/shadow-objects/README.md packages/shae-offscreen-canvas/README.md packages/shadow-objects/CHANGELOG.md packages/shae-offscreen-canvas/CHANGELOG.md && test "$(grep -ro 'nothing but whitespace' packages/shadow-objects/docs/api-reference.md packages/shadow-objects/docs/cheat-sheet.md | wc -l)" -eq 5 && test "$(stat -c%s docs/what-is-shadow-objects.webp)" -lt 200000 && test ! -e packages/shadow-objects/docs/architecture.svg && grep -q 'architecture@2x.png' packages/shadow-objects/docs/concepts.md && test "$(grep -c '^---$' packages/shadow-objects/docs/cheat-sheet.md)" -eq 13`
- Commit: `docs: every published link resolves on npm, and the boolean-attribute rule is written as it runs`
- Nebenbefunde: → »Offene Befunde« (4) — zwei aus Zug 0 (Infografik-Zahlen, Überlauf im
  Architekturbild), zwei aus Zug 2 (`README.md:7`, `README.md:279`)
- Folgen: keine — jede Änderung blieb in den Dateien des Detailplans, und kein Satz außerhalb
  davon wurde durch sie unwahr
- Schnittstellen: keine — das Paket fasst ausschließlich Dokumentation an. Für spätere Arbeit
  gilt seither: ein Link in `README.md` oder `CHANGELOG.md` eines veröffentlichten Pakets ist
  absolut (`https://github.com/spearwolf/shadow-objects/blob/main/…`), weil ein relatives Ziel
  auf der npm-Paketseite nicht auflöst.
- Der `Verlauf:` bleibt hier ausnahmsweise stehen, statt einer `Ergebnis:`-Zeile zu weichen: er
  trägt die Vorgeschichte der Entscheidung vom 2026-09-02 im Kopf dieses Plans, und diese eine
  Kette ist ohne ihn nicht mehr nachvollziehbar.
- Verlauf:
  - 2026-09-02 Zug 0: Detailplan steht · DX-040 unverändert, Zählung korrigiert: zehn relative
    `./docs/`-Links im Kernpaket-README statt neun · DX-042 unverändert, Zeilen 1851 und 2029
    statt 1848 und 2027-2031, dazu drei gleichlautende Stellen in `cheat-sheet.md:234`, `:253`,
    `:291` als Nebenbefund derselben Ursache in Schritt 2 aufgenommen · DX-032 erste Hälfte
    gegenstandslos: `api-reference.md:5-41` trägt ein »Quick navigation« mit 34 Einträgen,
    0 kaputten Ankern und allen elf `##`-Abschnitten gedeckt, eingeführt in `a9ed24c` und damit
    lange vor dem Audit · DX-033 unverändert (2 423 516 B, 1536 × 2752) · DX-023 unverändert
    (`README.md:95-96`) · DX-027 unverändert (drei Dateien, 307 193 B, keine Referenz) ·
    DX-028 unverändert, verschoben nach `cheat-sheet.md:507` · DX-036 unverändert
    (`README.md:17`) · DX-037 unverändert (`getting-started.md:23`) · fünf tote relative Links
    in den beiden veröffentlichten CHANGELOGs als Nebenbefund derselben Ursache in Schritt 1
    aufgenommen · zwei Nebenbefunde in »Offene Befunde« abgelegt · keine offenen Folgen zu
    verteilen: alle sechs erledigten Pakete tragen `Folgen: keine` · Restplan unverändert,
    Paket 8 bekommt eine Zeile zur Überschneidung im Kernpaket-CHANGELOG
  - 2026-09-02 Zug 1: Implementierer beauftragt · `sonnet`, Effort medium · eigener Prozess,
    Report nach `paket-7.impl-1.json`
  - 2026-09-02 Zug 2: Report `FERTIG` · 12 Dateien geändert, `docs/architecture.svg` gelöscht ·
    Arbeitsbaum jetzt schmutzig · zwei Nebenbefunde (`README.md:7`, `README.md:279`), keine Folgen
  - 2026-09-02 Zug 3: Review (`sonnet`) · alle acht Findings behoben, ein `wichtig` offen
    (Rückblick auf den Vorzustand in `CHANGELOG.md:7,9`) · Diff `paket-7.diff`,
    Report `paket-7.review-1.json`
  - 2026-09-02 Zug 4, Runde 1: der offene `wichtig` ging an denselben Implementierer
    (`paket-7.impl-2.json`) · Überschrift und Einleitungssatz des neuen Wurzel-CHANGELOG-Abschnitts
    umformuliert · Nachreview (`paket-7.review-2.json`) urteilt »nicht behoben«: derselbe Rückblick
    stehe jetzt im ersten Bullet, in der Klon-Zeile · dazu ein `klein` auf `CHANGELOG.md:20` ·
    Zahl der offenen Befunde von 1 auf 1 — die Runde war damit die letzte
  - 2026-09-02 Zug 5: Verify `paket-7.verify.log` exit 0 (`pnpm run ci` über 75 Testdateien,
    Terminologie-Prüfer und Lint grün, alle sechs mechanischen Zusicherungen erfüllt) · kein
    Commit: die beanstandete Zeile ist die, die der Detailplan in Schritt 3 ausdrücklich verlangt
- Offene Frage an den Nutzer (Paket ist ansonsten fertig und grün):
  Der Reviewer und der Detailplan widersprechen sich in einem Satz, und diesen Widerspruch trägt
  der Plan selbst. Schritt 3 verlangt wörtlich »eine Zeile Ehrlichkeit für den CHANGELOG-Eintrag«:
  ein `git clone` holt die alte Fassung des Bildes weiterhin mit, leichter wird der Arbeitsbaum
  und nicht das Klonen, »wer etwas anderes schreibt, schreibt etwas Falsches«. Der Implementierer
  hat sie als »A `git clone` still fetches the earlier encoding along with the rest of the history;
  only the working tree gets lighter« geschrieben (`CHANGELOG.md:11`). Der Reviewer stuft genau
  diesen Satz als `wichtig` ein: »the earlier encoding« sei ein Rückblick auf den Vorzustand und
  ergebe für niemanden Sinn, der die vorige Dateigröße nie gesehen hat — der Test, den die
  Konventionen im Kopf dieses Plans selbst nennen. Beide Seiten haben recht in ihrem eigenen
  Rahmen: die Aussage ist wahr und vor Missverständnis schützend, und sie setzt den Vorzustand
  voraus. Drei Wege:
  (a) Der Satz bleibt, wie er ist. Die Konvention bekommt damit eine benannte Ausnahme für
      Aussagen über die Git-Historie — dort *ist* der Vorzustand der Gegenstand.
      Vorschlag des Runners: dieser. Die Zeile schützt vor einer falschen Erwartung, die der
      Eintrag sonst weckt, und die Konvention zielt auf Erzählungen über den Code, nicht auf
      Aussagen über das Repository.
  (b) Der Satz fällt ersatzlos. Dann steht im CHANGELOG eine Größenangabe, aus der ein Leser
      schließt, das Klonen sei leichter geworden — genau das, was Schritt 3 verhindern wollte.
  (c) Der Satz wird ohne Vorzustandsbezug umformuliert, etwa »the size of a `git clone` is
      unaffected: every encoding of this file that has ever been committed stays in the history«.
      Kostet eine weitere Runde und trifft denselben Punkt blasser.
  Dazu, unabhängig davon, ein `klein` aus dem Nachreview: `CHANGELOG.md:20` — »without evaluative
  language attached« setzt die Kenntnis voraus, dass dort vorher wertende Sprache stand. Fällt mit
  Weg (a) oder (b) in einer Zeile mit ab.
  Der Arbeitsbaum bleibt so liegen, wie er ist: 12 geänderte Doku-Dateien, `docs/architecture.svg`
  gelöscht, Verify grün. Nach der Antwort ist es ein Satz und ein Commit.

**DX-040 · medium · packages/shadow-objects/README.md (9 Links auf ./docs/); packages/shae-offscreen-canvas/README.md (2 Links); packages/shadow-objects/src/distContract.files.txt; scripts/publishNpmPkg.mjs:80-92** — Jeder Doku-Link in den veröffentlichten READMEs führt auf npm ins Leere
Die README des Kernpakets verweist neunmal relativ auf ./docs/ — getting-started, concepts, guides, api-reference samt zwei Ankern, cheat-sheet, best-practices und das docs/README.md. Ins Paket geht keine dieser Dateien: die aufgezeichnete Dateiliste kennt bundle.js, package.json und src/, und preparePackageRoot() kopiert README, CHANGELOG und LICENSE, sonst nichts. Auf der Paketseite von npm, wo die README für viele Leser der erste und einzige Kontakt ist, sind alle neun Links tot. Beim Canvas-Paket ist es schärfer: dessen zweiter Link zeigt mit ../shadow-objects/docs/README.md aus der Paketwurzel heraus und kann selbst dann nicht auflösen, wenn Doku mitginge. Die Doku ist laut AGENTS.md §4 Teil des API-Vertrags — im ausgelieferten Artefakt ist sie nicht auffindbar.
Empfehlung: Der billige Weg: die Links in beiden READMEs auf absolute GitHub-URLs umstellen, dann tragen sie in beiden Umgebungen. Der gründlichere: docs/ mit ins Paket nehmen — preparePackageRoot() erweitern und die beiden distContract-Dateilisten nachziehen, womit der Vertragstest die Doku ab dann mit absichert. Für den Verweis des Canvas-Pakets auf die Doku des Kernpakets bleibt die absolute URL ohnehin die einzige richtige Antwort.
Ergänzung zum Abgleich: Es sind zehn relative `./docs/`-Links im Kernpaket-README, nicht neun — `:102` verweist neben der absoluten GitHub-URL auf die Wurzel-README zusätzlich relativ auf `./docs/concepts.md`. Der Weg ist durch »Entscheidungen« festgelegt (absolute URLs, kein Mitliefern von `docs/`). Fünf weitere tote relative Links stehen in den beiden mitveröffentlichten CHANGELOGs und gehen denselben Weg mit; drei relative Ziele bleiben, weil sie im Paket auflösen. Alles in Schritt 1.

**DX-042 · low · packages/shadow-objects/docs/api-reference.md:1848, :2027-2031** — Die API-Referenz beschreibt die Wahrheitsregel boolescher Attribute strenger, als sie gilt
Beide Absätze — der zu local und no-autostart und der zu auto-destruct — schließen mit »every other value counts as unset«. readBooleanAttribute zählt einen Wert aus lauter Leerraum über sein || '1' als gesetzt, `<shae-ent auto-destruct="   ">` ist also gesetzt und eben nicht unset. Dieselbe Ungenauigkeit steht damit an zwei Stellen einer veröffentlichten Doku, die zweite hat die Machart der ersten übernommen.
Empfehlung: Beide Stellen in einem Zug nachziehen: ein Wert aus lauter Leerraum zählt wie das nackte Attribut, alles andere außerhalb der Liste zählt als nicht gesetzt. Einseitig korrigiert wird die Datei uneinheitlich.
Ergänzung zum Abgleich: Die beiden Stellen liegen heute auf `:1851` und `:2029`. Dieselbe Allaussage steht dreimal im Cheat-Sheet — `:234` (`local`, `no-autostart`), `:253` (`auto-destruct`), `:291` (`no-trim`), jeweils als »and as unset for everything else«. Das Argument der Empfehlung trägt über die Datei hinaus: zwei von fünf Stellen zu richten macht die Doku uneinheitlich, statt sie zu richten. Alle fünf in Schritt 2.

**DX-033 · low · docs/what-is-shadow-objects.webp (2 423 516 Bytes), referenziert in README.md:31** — Das README-Bild wiegt 2,4 MB und ist damit ein Fünftel jedes Clones
Die Datei ist das größte Objekt im Repository, größer als die Kernel-Spec und die API-Referenz zusammen, und macht rund ein Fünftel der 12 MB aus, die ein git clone heute holt. Sie ist ein einziges Erklärbild über der README. WebP ist bereits das richtige Format; die Größe kommt aus Auflösung und Qualitätsstufe, nicht aus dem Container. Anders als die drei Architekturbilder, die DX-027 nennt, wird dieses Bild tatsächlich referenziert, es ist nur zu schwer für seinen Zweck.
Empfehlung: Auf die Breite bringen, in der GitHub sie überhaupt darstellt (rund 900 px), und die Qualität auf 80 stellen. Das landet erfahrungsgemäß im niedrigen dreistelligen KB-Bereich. Die alte Fassung bleibt in der Historie, der Austausch kostet also nichts an Nachvollziehbarkeit und auch nichts an bereits geklonter Größe.
Ergänzung zum Abgleich: Gemessen statt geschätzt — 900 px bei Qualität 80 ergibt 147 686 Bytes, 1200 px bei 80 ergibt 208 606 Bytes, und selbst die volle Auflösung bei 80 ergibt nur 296 680 Bytes; der Löwenanteil der 2,4 MB steckt in der Qualitätsstufe, nicht in der Auflösung. Bei 900 px bleibt der Text der Infografik lesbar. Der Klon bleibt so groß, wie er ist: der alte Blob steht in der Historie, und nur eine Umschreibung derselben würde ihn herausnehmen.

**DX-023 · info · README.md:95-96** — Die Wurzel-README trägt Werbesprache in ihren Strukturlisten
Die Liste unter »Examples & Testing« bewertet, was sie beschreiben soll: »A reference implementation demonstrating heavy lifting!«, »proving the power of Transferables and Namespaces«, »Massive test suite spanning unit tests (vitest) …«. Die Information steht in beiden Fällen im jeweils zweiten Halbsatz — drei Suiten, drei Werkzeuge, benannt; der Rest ist Ton. Wertadjektive ohne Bezugsgröße können nicht falsch werden und werden deshalb nie korrigiert, anders als die Zeilenzahl in derselben Liste, die der Remediation-Lauf vom 2026-08-26 um den Faktor 2,5 danebenliegend vorfand.
Empfehlung: Einen Durchgang über die Strukturlisten der Datei, nicht Satz für Satz. Der Lauf vom 2026-08-26 hat drei Befunde dieser Sorte in derselben Datei gefunden, jeder beim Anfassen des vorigen; das ist ein Redigat und kein Einzelfix.
Ergänzung zum Abgleich: Der Durchgang nimmt eine dritte Zeile mit, `:84` (»strictly modularized«). Die Tabellen unter »Documentation« und »Project Structure (Monorepo)« sind bereits nüchtern und bleiben unangetastet.

**DX-027 · info · packages/shadow-objects/docs/architecture.svg, architecture@2x.png, architecture.afdesign** — Drei Architekturbilder im Doku-Verzeichnis, auf die nichts zeigt
Die drei Dateien belegen zusammen rund 308 KB im Doku-Verzeichnis des Kernpakets, und keine Markdown-Datei, kein Quelltext und keine README verweist auf sie. Eine davon ist eine .afdesign — das Binärformat von Affinity Designer, das ohne dieses Programm niemand öffnet. Ein Lauf im August hat bereits zwei unreferenzierte Illustrationen entfernt (Commit 1cff638); diese drei sind übriggeblieben, ohne dass irgendwo stünde, ob absichtlich.
Empfehlung: Entweder einbinden — das Diagramm gehört in docs/concepts.md, wo die Architektur beschrieben wird — oder entfernen. Bleibt die .afdesign als Quelle des SVG stehen, gehört ein Satz in docs/README.md, der sie als solche benennt; sonst ist sie beim nächsten Aufräumen wieder eine Datei ohne Grund.
Ergänzung zum Abgleich: Eingebunden wird der PNG-Export, nicht das SVG. Das SVG nennt 32-mal einen Font (`BlexMonoSmBldNF`), den es nicht mitführt; ohne ihn setzt der Fallback die Beschriftungen mit anderen Metriken, und die Rahmen brechen auf — nachgemessen an einem Rendering mit Fallback-Font. Das SVG wird deshalb gelöscht, die `.afdesign` bleibt und bekommt ihren Satz in `docs/README.md`. Der Inhalt des Diagramms trägt die Begriffe von heute (ComponentContext, Kernel, Entity, ShadowObject, browser window, web worker) und passt zu `concepts.md`; die überlaufenden Beschriftungen am unteren Rand stecken in der Vorlage und stehen als Nebenbefund im Plan.

**DX-028 · info · packages/shadow-objects/docs/cheat-sheet.md:501 (## FrameLoop)** — Ein Abschnitt des Cheat-Sheets steht ohne den Trenner der übrigen
## FrameLoop beginnt ohne die ---, die jeder andere Abschnitt der Datei vor sich führt. Beim Überfliegen verschwimmt die Grenze zum Abschnitt darüber.
Empfehlung: Den Trenner ergänzen.
Ergänzung zum Abgleich: Der Abschnitt steht heute auf Zeile 507. Vierzehn `##`-Abschnitte, zwölf Trenner; `## FrameLoop` ist der einzige ohne, der erste braucht keinen.

**DX-036 · info · packages/shadow-objects/README.md:17** — Ein README-Absatz sagt dreimal »dependencies« mit wechselndem Bezug
Der Absatz zur Ein-Kopie-Regel benutzt das Wort in zwei Sätzen dreimal und meint dabei abwechselnd die Manifest-Sektion dieses Pakets und die des Konsumenten. Jede einzelne Aussage stimmt; die Referenten muss der Leser selbst sortieren.
Empfehlung: Die beiden Bezüge sprachlich trennen — einmal »this package declares«, einmal »your own manifest« — statt beide Male dasselbe Wort zu setzen.

**DX-037 · info · packages/shadow-objects/docs/getting-started.md:23** — Ein Gedankenstrich weicht von der Schreibweise seiner eigenen Datei ab
Die Seite schreibt ihre Einschübe durchgehend mit ` -- `. An dieser einen Stelle steht ein »—«. Kein Formatter entscheidet das: Biome fasst Markdown nicht an, jede Datei folgt ihrem eigenen Nachbarn.
Empfehlung: Auf ` -- ` angleichen.

**DX-032 · low · packages/shadow-objects/docs/api-reference.md (3 299 Zeilen, 233 KB); packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md** — Die API-Referenz ist über ihre Struktur hinausgewachsen, die Doku des zweiten Pakets folgt keiner
AGENTS.md beschreibt für das Kernpaket eine flache Sieben-Datei-Struktur, und sechs der sieben halten sich daran. Die siebte trägt inzwischen 3 220 Zeilen, ein Fünftel mehr als beim Audit vom 2026-08-27 (3 062), und ist die Datei, in der niemand mehr etwas findet, ohne zu suchen; ein Inhaltsverzeichnis hat sie nicht. Das zweite veröffentlichte Paket hat daneben ein docs/-Verzeichnis mit genau einer Datei, die als einzige im Repository ein Nummernpräfix trägt und auf die kein README.md im selben Verzeichnis zeigt. Für ein Paket, das sich laut AGENTS.md §4 auf dieselbe Weise dokumentieren soll wie das Kernpaket, ist das der Anfang einer Struktur und noch keine.
Empfehlung: Für die API-Referenz reicht ein Inhaltsverzeichnis am Kopf mit Ankern auf die Hauptabschnitte; eine Aufteilung würde die Sieben-Datei-Regel brechen, die AGENTS.md ausdrücklich setzt. Für das Canvas-Paket entweder das Präfix streichen und ein docs/README.md daneben, das die Datei einordnet, oder die eine Datei nach README.md ziehen und das Verzeichnis auflösen, solange es bei einer bleibt.
Gegenstandslos, erste Hälfte: `api-reference.md` trägt ab Zeile 5 einen Abschnitt »Quick navigation« mit 34 Einträgen; alle elf `##`-Abschnitte sind gedeckt, und kein Anker geht ins Leere (nachgerechnet gegen die Überschriften-Slugs der Datei). Genau das verlangt die Empfehlung. Der Abschnitt kam mit `a9ed24c` (»Redesign docs: ECS framing, flat 7-file structure«) und stand damit schon zum Audit-Zeitpunkt in der Datei; `git show 31d9ecc:packages/shadow-objects/docs/api-reference.md` zeigt ihn. Die zweite Hälfte — Doku-Struktur des Canvas-Pakets — steht unter »Nicht im Scope«.

  - 2026-09-02 Auflösung der offenen Frage: der Nutzer entscheidet für (a) — der Satz zur
    Klongröße bleibt, die Konvention »kein Rückblick auf den Vorzustand« bekommt die im Kopf
    dieses Plans benannte Ausnahme für CHANGELOG-Aussagen über das Repository selbst. Damit
    fällt auch der `klein`-Befund auf `CHANGELOG.md:20` weg. Die Schleife war an dieser Stelle
    schon mit Exit 10 beendet und startet nicht auf einem schmutzigen Arbeitsbaum; die
    steuernde Session hat deshalb die volle Verify-Kette (`pnpm run ci`, exit 0, 979 Tests,
    94,28 % Anweisungen / 91,01 % Zweige) selbst gefahren, ihre Ausgabe gelesen und den
    liegenden Stand als `07962b2` committet. Das ist eine vom Nutzer ausdrücklich freigegebene
    Abweichung von der Regel, dass nur die Schleife Pakete zu Ende fährt.

### [x] 8. CHANGELOG des Kernpakets: zwei Einträge sagen etwas anderes als der Code
- Findings: DX-035 (low), DX-039 (info)
- Ziel: Der Eintrag zur Bundle-Größe beschreibt das Verfahren, das der Build tatsächlich fährt, und kein Bullet unter `[Unreleased]` erzählt einen Vorzustand, den sein Leser nie hatte.
- Zielschärfung aus dem Abgleich: Die zweite Hälfte trifft genau ein Bullet, nicht den Abschnitt.
  `[Unreleased]` trägt 275 Bullets, davon 131 mit »used to«, 76 mit »no longer«, zwei mit »before
  this change« — und genau eines mit »Until now«. Der Rückblick ist die Machart dieses Abschnitts,
  nicht sein Defekt; ihn flächendeckend auszutreiben hieße, 275 Bullets neu zu schreiben, was
  weder ein `info`-Finding mit Aufwand »S« verlangt noch dieser Lauf beschlossen hat. Das Paket
  ändert zwei Sätze und sonst nichts.
- Bereich: `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: 1–7 (steht zuletzt, damit es die Einträge der übrigen Pakete nicht überholt)
- Überschneidung mit Paket 7, aufgelöst: `07962b2` hat an dieser Datei drei Stellen angefasst —
  die Linkziele in `:8` und `:523` sind jetzt absolute GitHub-URLs, und unter `[Unreleased]` ›
  `### Internal` steht ein neues Bullet »**Docs:** …«. Keine der drei berührt die beiden
  Fundstellen dieses Pakets, und das neue Bullet steht selbst in der Gegenwart. Alle
  Zeilennummern unten sind gegen `07962b2` gemessen.
- Hash: da25985
- Modell: mittlere Stufe (`sonnet`)
- Effort: low
- Dateien: `packages/shadow-objects/CHANGELOG.md`, und sonst keine. Kein Quelltext, keine Doku,
  kein Harness, keine Testdatei, kein zweites CHANGELOG, kein `AGENTS.md` und kein `CLAUDE.md` —
  die Datei beschreibt sich selbst und zieht nichts nach.
- Vorgehen:

  Zwei Ersetzungen, beide innerhalb einer einzelnen Zeile, beide unten im Wortlaut. Die Datei hat
  davor und danach 662 Zeilen und 296 Bullets der Form `- **`.

  1. **Die Größenzeile nennt das Verfahren, das der Build fährt.** Fundstelle: das Bullet
     `- **Size:**` unter `[Unreleased]` › `### Dependencies`, heute Zeile 462.

     Gesucht wird genau diese Zeichenfolge, sie steht genau einmal in der Datei:

     ```
     once directly, once base64-inlined inside the worker
     ```

     Sie wird ersetzt durch:

     ```
     once directly, once inside the worker source, which sits in the bundle as a plain string literal and becomes a `Blob` and an object URL when the worker is created
     ```

     Der Rest des Bullets bleibt Zeichen für Zeichen stehen.

     Grundlage, nachgemessen am gebauten `dist/bundle.js` (Stand `07962b2`, 227 140 Bytes): die
     Datei enthält keine einzige Base64-Kodierung — weder `atob` noch die Zeichenfolge `base64`
     noch eine `data:`-URL kommen darin vor. Der Worker steht als einfach gequotetes
     JavaScript-String-Literal im Bundle, und daraus baut

     ```js
     function ki(s){let e=new Blob([s],{type:"text/javascript"}),t=URL.createObjectURL(e),r=new Worker(t);return URL.revokeObjectURL(t),r}
     ```

     zur Laufzeit den Worker. Die Rechnung des Satzes bleibt damit richtig: jede der beiden
     Abhängigkeiten liegt zweimal im Bundle, und gerade weil die zweite Kopie im Klartext liegt,
     wiegt sie voll — worauf die genannten 53 kB überhaupt erst beruhen. Falsch benannt war nur
     das Verfahren, nicht die Zahl.

  2. **Die Zahlen im selben Bullet bleiben unangetastet.** Das ist eine Anweisung, keine
     Auslassung. Gemessen sind es heute 227 140 Bytes minifiziert und 69 374 Bytes gzip gegen die
     225,7 kB und 68,9 kB, die der Eintrag nennt. Die Empfehlung des Audits sagt ausdrücklich, dass
     die Größenaussage bleibt, und sie hat recht: die Differenz stammt aus den Beta-Ständen der
     beiden Abhängigkeiten und wandert weiter, `225.7` zu ändern zöge `86 kB` und `53 kB` derselben
     Zeile hinter sich her, und alle drei werden zum Release ohnehin neu gemessen. Wer sie hier
     anfasst, macht aus einer Ersetzung eine Rechnung.

  3. **Der `dispose()`-Absatz sagt in der Gegenwart, was gilt.** Fundstelle: das Bullet
     `- **New (public API):**` zu `ComponentContext.dispose()` unter `[Unreleased]` › `### New`,
     heute Zeile 283.

     Gesucht wird der zweite Satz dieses Bullets, er steht genau einmal in der Datei:

     ```
     Until now a context could only be emptied with `clear()`, never released: it stayed in the global `__shadowObjectsContexts` map for the lifetime of the page, so namespaces accumulated and a namespace could not be handed back.
     ```

     Er wird ersetzt durch:

     ```
     `clear()` empties a context and keeps it: the context stays registered in the global `__shadowObjectsContexts` map under its namespace, so clearing alone never hands the namespace back.
     ```

     Alles andere in diesem Bullet bleibt stehen — der erste Satz, der dritte, der vierte, das
     »Idempotent.« und namentlich der Schlusssatz »`clear()` is unchanged and remains the reusable
     reset.«. Der sagt einem Leser von `0.33.0`, dass seine bestehenden `clear()`-Aufrufe sich
     nicht anders verhalten, und genau dafür ist ein CHANGELOG da.

     Nachgesehen am Quelltext statt am Eintrag: `ComponentContext.clear()`
     (`packages/shadow-objects/src/view/ComponentContext.ts:984`) leert den Kontext und lässt ihn
     unter seinem Namespace in der Map stehen — der JSDoc darüber sagt es selbst: »The context
     itself stays registered under its namespace and can be used again«. `dispose()` (`:1028`)
     ruft `clear()`, setzt `#isDisposed` und nimmt den Eintrag aus
     `ComponentContext.getContextsMap()` heraus. Der Ersatzsatz beschreibt genau das. Er
     widerspricht dem dritten Satz nicht, der `dispose()` erklärt: er sagt, was `clear()` allein
     nicht leistet, nicht was niemand kann.

  4. **Nicht getan wird:** kein Durchgang über die übrigen 294 Bullets, keine Zahl neu gemessen,
     kein Link angefasst, keine Überschrift verschoben, kein Eintrag hinzugefügt. Der
     `[Unreleased]`-Abschnitt bekommt insbesondere kein Bullet über diese Änderung selbst: er
     beschreibt, was das Paket kann, und daran ändert sich nichts. Fällt beim Arbeiten eine
     weitere Stelle in dieser Datei auf, wird sie im Report als Nebenbefund gemeldet und nicht
     behoben.

- Kein Regressionstest: das Paket fasst keinen Quelltext an und behebt keinen Korrektheitsfehler.
  Ein Test gäbe es nicht zu schreiben. Der Nachweis sind die neun mechanischen Zusicherungen des
  Verify-Kommandos, und die sind trocken durchgespielt: gegen den ungefixten Stand scheitern sie
  (die beiden Negativproben beißen), mit beiden Ersetzungen angewandt gehen alle neun auf `exit 0`
  durch, danach `git checkout` zurück. Ein roter Verify in Zug 5 ist damit ein Befund und keine
  kaputte Zusicherung.
- Verify: `pnpm run ci && test "$(git status --porcelain -- . ':(exclude)remediation-plan.md' | wc -l)" -eq 1 && test "$(wc -l < packages/shadow-objects/CHANGELOG.md)" -eq 662 && test "$(grep -c '^- \*\*' packages/shadow-objects/CHANGELOG.md)" -eq 296 && ! grep -q 'base64' packages/shadow-objects/CHANGELOG.md && ! grep -q 'Until now' packages/shadow-objects/CHANGELOG.md && grep -q '139.6 kB → 225.7 kB minified, 42.1 kB → 68.9 kB gzipped' packages/shadow-objects/CHANGELOG.md && grep -q 'is unchanged and remains the reusable reset' packages/shadow-objects/CHANGELOG.md && grep -q 'and an object URL when the worker is created' packages/shadow-objects/CHANGELOG.md && grep -q 'so clearing alone never hands the namespace back' packages/shadow-objects/CHANGELOG.md`
- Commit: `docs: the changelog names the worker inlining as the build performs it, and the context entry reads in the present tense`
- Ergebnis: 1 Runde · DX-035 und DX-039 behoben · kein Regressionstest (das Paket fasst
  keinen Quelltext an, der Nachweis sind die neun mechanischen Zusicherungen des
  Verify-Kommandos) · Review ohne kritische oder wichtige Befunde · zwei Ein-Zeilen-Ersetzungen
  in `packages/shadow-objects/CHANGELOG.md`, Zeilenzahl und Bullet-Zahl unverändert
- Nebenbefunde: → Queue
- Folgen: keine

### [x] 9. Werkzeugkette: ein Kommando ohne Shell, ein Skriptname, den pnpm verdeckt
- Nebenbefund: `scripts/publishNpmPkg.mjs:36` (low, aus Paket 2) · `package.json:26` und `CLAUDE.md:59` (low, aus Paket 3) · dazu aus dem Abgleich dieses Zuges: `CHANGELOG.md:224` und `CHANGELOG.md:645`, die dieselbe falsche Behauptung tragen (low), und das `update`-Skript in allen fünf `package.json` (info)
- Ziel: Das Publish-Skript übergibt `npm` seine Argumente als Array statt als Kommandozeile für eine Shell, und keine Stelle behauptet mehr, `pnpm ci` fahre das Wurzelskript.
- Bereich: `scripts/publishNpmPkg.mjs`, `CLAUDE.md`, `CHANGELOG.md` (Wurzel)
- Hängt ab von: —
- Hash: 2458d85
- Modell: mittlere Stufe (`sonnet`)
- Effort: low
- Dateien: `scripts/publishNpmPkg.mjs`, `CLAUDE.md`, `CHANGELOG.md`

**Abgleich am Stand `da25985` (2026-09-02).**
- `scripts/publishNpmPkg.mjs:36` — unverändert. Die Zeile lautet weiterhin ``exec(`npm show ${pkgJson.name} versions --json`, …)``. Vorbestehend: `git show 524cdaf^:scripts/publishNpmPkg.mjs` zeigt dieselbe Zeile an derselben Nummer.
- `package.json:25` → **`:26`**. Paket 3 hat `lint:terms` darübergesetzt; `git show 524cdaf^:package.json` hat das `ci`-Skript noch auf Zeile 25. Der Sachverhalt besteht, an der Zeile selbst ist trotzdem nichts zu tun — siehe Schritt 5.
- `CLAUDE.md:58` → **`:59`**. Der Coverage-Absatz sagt weiterhin »… `pnpm cbt` and `pnpm ci` run it automatically after the suites finish.«
- Nachgemessen statt geglaubt, in einer Wegwerf-`package.json` mit `echo`-Skripten unter pnpm 11.21.0: `pnpm ci` und `pnpm update` fahren pnpms eigenes Kommando und erreichen das gleichnamige Skript nie; `clean`, `start`, `test`, `build`, `dev`, `format`, `typecheck`, `coverage`, `watch`, `preview`, `cbt`, `lint` fahren sämtlich das Skript. Damit ist die Kollisionsliste dieses Workspaces vollständig: `ci` in der Wurzel und `update` in allen fünf Manifesten. `pnpm help -a` führt `ci` nicht auf — die Falle ist von außen nicht abzulesen, und genau deshalb gehört sie aufgeschrieben.
- Zwei weitere Fundstellen derselben Behauptung, im Abgleich gefunden: `CHANGELOG.md:224` und `CHANGELOG.md:645`. Beide nennen `pnpm ci` als Weg, das Wurzelskript zu fahren. `.github/workflows/ci.yml:48` hält es richtig, `AGENTS.md` nennt es gar nicht, `.claude/` ist nicht versioniert.

**Vorgehen.**
1. `scripts/publishNpmPkg.mjs`, Zeile 1 — der Import.
   Alt: `import {exec, execSync} from 'node:child_process';`
   Neu: `import {execFile, execFileSync} from 'node:child_process';`
2. `scripts/publishNpmPkg.mjs`, Zeile 36 — der Aufruf, mit einem Kommentar darüber, der den Grund trägt. Die eine alte Zeile wird zu drei:

   Alt:
   ```js
   exec(`npm show ${pkgJson.name} versions --json`, (error, stdout, stderr) => {
   ```
   Neu:
   ```js
   // npm receives its arguments as an array. No shell parses this call, so no character in the
   // package name can be read as syntax.
   execFile('npm', ['show', pkgJson.name, 'versions', '--json'], (error, stdout, stderr) => {
   ```
   Die Signatur des Callbacks bleibt gleich, `stdout` und `stderr` kommen weiterhin als Strings — der `e404`-Zweig und der `JSON.parse`-Zweig bleiben Wort für Wort stehen.
3. `scripts/publishNpmPkg.mjs`, der `else`-Zweig desselben Callbacks (heute Zeile 51–54). Nur die `console.error`-Zeile ändert sich.
   Alt: ``console.error(`exec() panic: ${stderr}`);``
   Neu: ``console.error(`npm show panic: ${stderr || error.message}`);``
   Grund: Ohne Shell meldet ein fehlendes `npm` als `error.message` (`spawn npm ENOENT`) und schreibt nichts nach stderr. Der bisherige Text stünde in genau dem Fall leer da, den er erklären soll. Das ist keine Zutat, sondern die Kehrseite von Schritt 2.
4. `scripts/publishNpmPkg.mjs`, Zeile 74 — der zweite Aufruf, aus demselben Grund.
   Alt:
   ```js
     execSync(`npm publish --access public${dryRun ? ' --dry-run' : ''}`, {cwd: packageRoot, stdio: 'inherit'});
   ```
   Neu:
   ```js
     execFileSync('npm', ['publish', '--access', 'public', ...(dryRun ? ['--dry-run'] : [])], {cwd: packageRoot, stdio: 'inherit'});
   ```
   Der Kommentar über der Zeile (»Provenance attestations come for free …«) bleibt unverändert stehen. Beide neuen Zeilen sind gegen `biome.json` geprüft (`biome format --stdin-file-path=scripts/publishNpmPkg.mjs`, `lineWidth` 130): Biome lässt sie einzeilig, sie dürfen nicht umbrochen werden.
5. **`package.json` bleibt unverändert.** Das `ci`-Skript wird nicht umbenannt. Paket 3 hat die Linie gezogen — überall `pnpm run ci` schreiben, nie `pnpm ci` —, und `.github/workflows/ci.yml:48` sowie die Tabellenzeile zu `lint:terms` in `CLAUDE.md` halten sie bereits. Eine Umbenennung kehrte diese Entscheidung um und zöge Workflow, fünf Prosastellen und die lokale Rechtedatei nach; der Gewinn wäre null, weil das Skript unter jedem Namen über `pnpm run` erreichbar bleibt. Die Falle wird stattdessen dort benannt, wo jemand sie liest — Schritt 6 und 7.
6. `CLAUDE.md`, Abschnitt »Commands«: eine neue Tabellenzeile **direkt unter der `pnpm cbt`-Zeile** (heute Zeile 37). Wortlaut exakt:
   ```
   | `pnpm run ci` | Terminology check, build, typecheck, tests without `shadow-objects-e2e`, merged coverage, the e2e typecheck, then `lint:ci` — the sequence the CI job runs. The `run` is not optional; `pnpm ci` is pnpm's own clean install and never reaches this script |
   ```
   Die Tabelle führt heute jedes Wurzelskript außer diesem einen. Dass ausgerechnet der Befehl fehlt, den man nur in einer Schreibweise treffen kann, ist die Hälfte des Befunds.
7. `CLAUDE.md`, Zeile 29, Absatz »pnpm 11 specifics«: zwei Sätze an das Ende anhängen, mit einem Leerzeichen hinter `… decides which pnpm actually runs.` Wortlaut exakt:
   ```
   Two script names collide with pnpm's own commands and are reachable only through `pnpm run`: `pnpm ci` performs a clean install with `--frozen-lockfile`, `pnpm update` updates the dependency tree, and neither of them runs the script of that name. Every other script name in this workspace — `clean`, `start` and `test` among them — wins over the pnpm command it shares a name with.
   ```
8. `CLAUDE.md`, Zeile 59, Coverage-Absatz. Nur diese Teilzeichenkette ändert sich:
   Alt: ``and `pnpm ci` run it automatically after the suites finish.``
   Neu: ``and `pnpm run ci` run it automatically after the suites finish.``
9. `CHANGELOG.md` (Wurzel), Zeile 224:
   Alt: ``  `pnpm cbt` and `pnpm ci` run it right after the suites finish.``
   Neu: ``  `pnpm cbt` and `pnpm run ci` run it right after the suites finish.``
10. `CHANGELOG.md` (Wurzel), Zeile 645. Nur die erste der beiden `ci`-Nennungen ändert sich — die zweite (`into the \`ci\` job`) ist der Name des Workflow-Jobs und bleibt:
    Alt: ``and `pnpm ci` runs the same check for the e2e package``
    Neu: ``and `pnpm run ci` runs the same check for the e2e package``
11. `CHANGELOG.md` (Wurzel): ein neuer datierter Abschnitt ganz oben, direkt **vor** `## 2026-09-02 — the README image fits the width GitHub renders it at, and the architecture diagram has a place`:

    ```markdown
    ## 2026-09-02 — the publish step calls npm with an argument array, and the ci script is named where it is reachable

    `scripts/publishNpmPkg.mjs` passes npm its arguments as an array instead of a command line assembled for a shell, and `CLAUDE.md` names `pnpm run ci` in the command table alongside the two script names pnpm claims for itself.

    - **`scripts/publishNpmPkg.mjs`:** `execFile` and `execFileSync` replace `exec` and `execSync`. The package name and the publish flags reach npm as separate arguments, so no character in them is read as shell syntax, and a failed lookup reports the spawn error when the child wrote nothing to stderr.
    - **`CLAUDE.md`:** the command table carries a row for `pnpm run ci`, and the pnpm section names `ci` and `update` as the two script names reachable only through `pnpm run`.
    ```

    Die beiden Korrekturen aus Schritt 9 und 10 bekommen **keinen** eigenen Bullet. Ein CHANGELOG-Eintrag über eine Schreibweise im CHANGELOG selbst trägt nichts; die Commit-Message nennt sie.

**Warum die beiden alten CHANGELOG-Zeilen überhaupt angefasst werden.** Sie sind datierte Einträge, und ihr Gegenstand — dass `mergeCoverage.mjs` nach den Suiten läuft, dass der e2e-Typecheck mitgeprüft wird — bleibt unberührt. Falsch ist nur der Befehlsname, mit dem sie den Leser losschicken, und er war es am Tag des Eintrags schon. Paket 8 hat für denselben Fall im Paket-CHANGELOG entschieden: ein Eintrag, der etwas anderes sagt als der Code, wird richtiggestellt.

**Warum das `update`-Skript hier mitläuft.** Es ist ein vorbestehender Nebenbefund und hat dieselbe Ursache wie der Hauptbefund — ein Skriptname, den pnpm 11 für sich beansprucht. Seine Behebung ist keine eigene Änderung, sondern dieselbe Zeile Prosa aus Schritt 7. Umbenannt wird es nicht: keine Stelle behauptet, `pnpm update` fahre es, und über `pnpm run update` ist es erreichbar. Kein eigenes Paket, keine Zeile in »Offene Befunde«.

**Kein Regressionstest.** Der Umbau ändert für die tatsächlich veröffentlichten Paketnamen kein beobachtbares Verhalten — `@spearwolf/shadow-objects` und `@spearwolf/shae-offscreen-canvas` enthalten kein Zeichen, das eine Shell anders läse. Ein Test dafür gäbe es nicht zu schreiben, und `scripts/` trägt in diesem Repo keine Testinfrastruktur; sie einzuführen hieße, das Skript um seiner Prüfbarkeit willen umzubauen, und das ist ein Vielfaches des Befunds. An ihrer Stelle stehen zwei Belege:
- Eine **Rauchprobe** des geänderten Aufrufs, die der Implementierer fährt und deren Ausgabe in den Report gehört. Sie ist lesend, schreibt nichts und veröffentlicht nichts:
  ```bash
  node -e "const {execFile}=require('node:child_process');execFile('npm',['show','@spearwolf/shadow-objects','versions','--json'],(e,o,s)=>{if(e){console.error('FAIL',s||e.message);process.exit(1)}const v=JSON.parse(o);console.log('isArray:',Array.isArray(v),'count:',v.length)})"
  ```
  In Zug 0 gefahren: `isArray: true count: 40`. Braucht Netz; scheitert sie am Netz und nicht am Aufruf, gehört das so in den Report.
- Die fünfzehn mechanischen Zusicherungen des Verify-Kommandos. Sie sind gegen den ungefixten Stand trocken geprüft — ohne eine Zeile zu ändern, indem jede Negativprobe auf den heute vorhandenen falschen String und jede Positivprobe auf den heute fehlenden richtigen gehalten wurde. Alle elf textlichen Proben beißen in der erwarteten Richtung, die beiden `grep -qF` auf die neuen JS-Zeilen matchen ihre Vorlage. Ein roter Verify ist damit ein Befund und keine kaputte Zusicherung.

- Verify: das Kommando steht wegen der Backticks darin im Block darunter — eine Zeile, unverändert zu übernehmen.

```bash
pnpm run ci && ! grep -qE '(^|[^[:alnum:]_])exec(Sync)?\(' scripts/publishNpmPkg.mjs && grep -qF "import {execFile, execFileSync} from 'node:child_process';" scripts/publishNpmPkg.mjs && grep -qF "execFile('npm', ['show', pkgJson.name, 'versions', '--json'], (error, stdout, stderr) => {" scripts/publishNpmPkg.mjs && grep -qF "execFileSync('npm', ['publish', '--access', 'public', ...(dryRun ? ['--dry-run'] : [])], {cwd: packageRoot, stdio: 'inherit'});" scripts/publishNpmPkg.mjs && git diff --quiet -- package.json && ! grep -qF '`pnpm cbt` and `pnpm ci` run it automatically' CLAUDE.md && grep -qF '`pnpm cbt` and `pnpm run ci` run it automatically after the suites finish.' CLAUDE.md && grep -qF '| `pnpm run ci` |' CLAUDE.md && grep -qF 'reachable only through `pnpm run`' CLAUDE.md && ! grep -qF '`pnpm cbt` and `pnpm ci` run it right after the suites finish.' CHANGELOG.md && grep -qF '`pnpm cbt` and `pnpm run ci` run it right after the suites finish.' CHANGELOG.md && ! grep -qF 'and `pnpm ci` runs the same check for the e2e package' CHANGELOG.md && grep -qF 'and `pnpm run ci` runs the same check for the e2e package' CHANGELOG.md && grep -qF '## 2026-09-02 — the publish step calls npm with an argument array' CHANGELOG.md && test "$(git status --porcelain -- . ':(exclude)remediation-plan.md' | wc -l)" -eq 3
```
- Commit: `chore(harness): the publish step calls npm with an argument array, and the ci script is named where it is reachable`
- Ergebnis: 1 Runde · das Publish-Skript übergibt `npm` seine Argumente als Array (`execFile`/`execFileSync`), und `CLAUDE.md` wie das Wurzel-`CHANGELOG.md` nennen `pnpm run ci`, wo das Wurzelskript gemeint ist · kein Regressionstest, an seiner Stelle die Rauchprobe des geänderten Aufrufs (`isArray: true count: 40`) und fünfzehn mechanische Zusicherungen im Verify · Reviewer ohne Befund
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — `scripts/publishNpmPkg.mjs` behält Aufrufweg und Verhalten, `package.json` ist unangetastet. Wer künftig eine Wurzelskript-Zeile in Prosa schreibt: `ci` und `update` sind nur über `pnpm run` erreichbar, die Begründung steht in `CLAUDE.md` unter »pnpm 11 specifics«

### [x] 10. Testbestand: eindeutige Tag-Namen, wo die späte Registrierung der Gegenstand ist
- Nebenbefund: vierzehn Registrierungen in drei Dateien unter `packages/shadow-objects-testing/test/` (low, aus Paket 4), `ShadowObjectCreationScope.spec.ts:759` (info, aus Paket 4)
- Ziel: Kein Fall bricht in einem zweiten Durchlauf an einem schon vergebenen Tag-Namen, und keiner verliert dabei seinen Gegenstand — der Zähler aus `create-element.test.js` ist die Vorlage.
- Bereich: `packages/shadow-objects-testing/`, `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`
- Hängt ab von: —
- Hash: 9ecb175
- Modell: mittlere Stufe (`sonnet`)
- Effort: medium
- Dateien:
  `packages/shadow-objects-testing/src/freshTag.js` (neu),
  `packages/shadow-objects-testing/test/ent-element-upgrade.test.js`,
  `packages/shadow-objects-testing/test/prop-element-host.test.js`,
  `packages/shadow-objects-testing/test/ent-element-peer-round.test.js`,
  `packages/shadow-objects-testing/test/create-element.test.js`,
  `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`

**Abgleich in Zug 0.** Beide Befunde stehen unverändert. Nachgezählt sind es vierzehn
Registrierungen im Rumpf eines `it`, nicht fünfzehn: neun in `ent-element-upgrade.test.js`, zwei in
`prop-element-host.test.js`, drei in `ent-element-peer-round.test.js`. Die sechs in
`ent-element-namespace.test.js` gehören nicht dazu — Paket 4 hat sie in den Rumpf des `describe`
gezogen, wo sie einmal zur Sammelzeit laufen. `create-element.test.js` hat den Zähler, der hier
Vorlage ist, und ist deshalb Gegenstand des vierten Schritts, nicht des Befunds.

Der Schaden ist gemessen und nicht geschlossen. Eine eigenständige Probe (Vitest 4, Browser-Modus,
Chromium, `--retry=1`, ein Fall der absichtlich fehlschlägt und dabei ein Tag registriert) belegt
beides: der Retry führt den Rumpf des `it` im selben Dokument erneut aus, und die zweite
Registrierung wirft

```
NotSupportedError: Failed to execute 'define' on 'CustomElementRegistry': the name "…" has already been used with this registry
```

Das ist der Punkt, an dem es weh tut: der Retry meldet diesen Fehler **statt** des eigentlichen
Fehlschlags. Wer `retry` setzt, um eine Flake zu überstehen, bekommt für diese vierzehn Fälle keine
Diagnose mehr, sondern eine Verdeckung. `retry` ist in der Suite heute nicht gesetzt (siehe
`packages/shadow-objects-testing/vitest.config.ts`), der Fehler ist also latent — geladen, nicht
gezündet.

- Vorgehen:
  1. **`packages/shadow-objects-testing/src/freshTag.js` neu anlegen**, wörtlich:

     ```js
     let counter = 0;

     /**
      * Answers a custom element tag name built from `stem` that no earlier call has answered.
      *
      * One registry serves the whole document and a definition cannot be taken back:
      * `customElements.define` throws `NotSupportedError` the second time it sees a name. A case
      * that registers a written name therefore works exactly once. Run its body again — a retry
      * after a flake, for instance — and it dies on the registration rather than on what it was
      * meant to show, and that is what the run reports instead of the real failure.
      *
      * @param {string} stem the readable half of the name; the hyphen a custom element name needs
      *   is the one this puts in front of the counter, so `stem` may do without
      * @returns {string}
      */
     export const freshTag = (stem) => `${stem}-${++counter}`;
     ```

     `tsconfig.json` dieses Pakets steht auf `checkJs: true` über `src/**` — die Annotationen
     werden geprüft, `pnpm run ci` fährt das mit.

     Der Helfer liegt in `src/` und nicht dreimal als lokaler Zähler, weil `src/` in diesem Paket
     genau das trägt, was mehr als eine Testdatei braucht (`mount.js`, `render.js`,
     `findElementsById.js`, `withSwallowedErrors.js`), und weil der Grund dann einmal dasteht statt
     viermal.

  2. **`ent-element-upgrade.test.js` — neun Fälle.** `freshTag` aus `../src/freshTag.js`
     importieren. In jedem Fall als erste Zeile des `it`-Rumpfs die Variable minten, das Markup zum
     Template-Literal machen und nur den Tag-Namen interpolieren — öffnendes wie schließendes Tag.
     **`id`, `token` und `ns` bleiben wörtlich, wie sie sind**; die Zusicherungen hängen an ihnen.

     | `it` ab Zeile | Variable | Stem | Klasse | Markup-Zeilen | `define` |
     | --- | --- | --- | --- | --- | --- |
     | 32 | `midTag` | `late-ent` | `ShaeEntElement` | 35, 37 | 48 |
     | 56 | `midTag` | `late-ent` | `ShaeEntElement` | 64 | 71 |
     | 77 | `inTag` | `late-ent` | `ShaeEntElement` | 93 | 100 |
     | 107 | `midTag` | `late-ent` | `ShaeEntElement` | 111 | 122 |
     | 128 | `midTag` | `late-ent` | `ShaeEntElement` | 136 | 149 |
     | 161 | `midTag` | `late-ent` | `ShaeEntElement` | 166, 170 | 182 |
     | 188 | `midTag` | `late-plain` | `HTMLElement` | 191, 193 | 202 |
     | 208 | `wrapTag` | `late-wrap` | `HTMLElement` (mit `connectedCallback`) | 213, 215 | 224–232, Name in 225 |
     | 241 | `midTag` | `late-ent` | `ShaeEntElement` | 246, 248 | 258 |

     Der Kopfkommentar der Datei, heute Zeile 13–15, beschreibt die feste Namensvergabe und wird
     ersetzt durch:

     ```
      * A custom element name is registered once per document and the registration stands for the
      * life of the page, so every case mints its tag name with `freshTag()` instead of writing
      * one. That also keeps the file independent of the order its cases run in.
     ```

  3. **`prop-element-host.test.js` — zwei Fälle** unter `describe('shae-prop follows its host
     entity')`. Dasselbe Muster; hier steht der Name zusätzlich in einem `whenDefined`, das
     mitwandert. Kein Kopfkommentar der Datei spricht über Tag-Namen — der Grund steht im Helfer,
     hier kommt keiner dazu.

     | `it` ab Zeile | Variable | Stem | Markup-Zeilen | `define` | `whenDefined` |
     | --- | --- | --- | --- | --- | --- |
     | 194 | `hostTag` | `late-ent` | 196, 198 | 204 | 205 |
     | 211 | `midTag` | `late-ent` | 214, 216 | 226 | 227 |

  4. **`ent-element-peer-round.test.js` — drei Fälle. Hier liegt die Falle des Pakets.** In dieser
     Datei ist der Tag-Name zugleich der `id` des Elements: `<pr3-mid id="pr3-mid" …>`. **Nur das
     Tag wird dynamisch, der `id` bleibt wörtlich** — daran hängen `querySelector('#pr3-mid')` und
     die Zusicherungen `to.equal('pr3-mid')`. Wer beide umstellt, macht die Fälle grün und
     gegenstandslos.

     | `it` ab Zeile | Variable | Stem | Markup-Zeilen (Tag) | `define` | bleibt wörtlich (`id`) |
     | --- | --- | --- | --- | --- | --- |
     | 125 | `midTag` | `pr-mid` | 130, 132 | 142 | 130, 137, 146 |
     | 153 | `midTag` | `pr-mid` | 158, 160 | 177 | 158, 166, 186 |
     | 307 | `midTag` | `pr-mid` | 312, 314 | 325 | 312, 322 |

     Im mittleren Fall steht das `define` in einem `on(…)`-Hörer innerhalb des `it` (Zeile 175–178);
     die Variable wird oben im `it`-Rumpf gemintet, der Hörer schließt über sie.

     Der Modulname `counters` ist in dieser Datei vergeben (Message-Zähler) — der Import heißt
     `freshTag` und kollidiert nicht.

     Der Kopfkommentar, heute Zeile 21–22, wird ersetzt durch:

     ```
      * A custom element name is registered once per document and the registration stands for the
      * life of the page, so the cases that register one mint their name with `freshTag()`.
     ```

  5. **`create-element.test.js` an den Helfer hängen.** `let tagCounter = 0;` (Zeile 33) entfällt,
     `freshTag` wird importiert, und die beiden Fabriken minten darüber:
     `const tagName = freshTag('probe-ent');` beziehungsweise `const tagName = freshTag('probe.ent');`
     (Zeile 42 und 51). Beide Funktionen und ihre übrigen JSDoc-Sätze bleiben; der Satz »A fresh
     name per call, because a definition cannot be taken back.« entfällt, weil er jetzt im Helfer
     steht. Das gehört zu diesem Schritt und ist keine Erweiterung: der Helfer wird aus dieser Datei
     gehoben, und die Vorlage als zweite Implementierung derselben Sache stehenzulassen wäre genau
     die Doppelung, gegen die er gehoben wird.

  6. **`ShadowObjectCreationScope.spec.ts:759`**: `errors.mock.calls[0]![2]` wird zu
     `errors.mock.calls[0]?.[2]`. Sechs Lesungen derselben Struktur in dieser Datei gehen über `?.`
     (Zeile 106 und 107 über die Zwischenvariable `call`, dazu 142, 184, 235, 292); diese eine geht
     über `!`. Verhalten ändert sich nicht: zwei Zeilen darüber steht ein hartes
     `toHaveBeenCalledTimes(1)`, ein leeres `calls` kommt hier also nie an. Was sich ändert, ist die
     Meldung, falls es doch einmal so weit kommt — `expected undefined to match /…/` statt eines
     `TypeError`. Sonst nichts in der Datei anfassen.

  7. **Kein CHANGELOG-Eintrag, keine Doku.** Reine Testdateien, keine öffentliche API, keine
     `dist/`-Form, kein Harness. Präzedenz in diesem Lauf: Paket 4 (`2a28e96`) und Paket 6
     (`14b0ad6`) haben beide ausschließlich Testdateien angefasst und keinen Changelog geschrieben.

- Roter Lauf: Das Paket behebt keinen Produktfehler, sondern einen der Suite selbst, und sein
  Nachweis ist genau der Retry, um den es geht. Vor dem Fix die letzte Zusicherung des ersten Falls
  in `ent-element-upgrade.test.js` (Zeile 52) brechen — `.to.equal(gp.viewComponent)` zu
  `.to.equal(child.viewComponent)` —, dann:

  ```bash
  pnpm -F shadow-objects-testing exec vitest --run test/ent-element-upgrade.test.js --retry=1
  ```

  Der zweite Versuch meldet dann `NotSupportedError … the name "late-ent-a" has already been used
  with this registry` statt der gebrochenen Zusicherung. Nach dem Fix meldet dasselbe Kommando in
  beiden Versuchen die gebrochene Zusicherung. Danach den Bruch zurücknehmen — er wird nicht
  committet. Beide Ausgaben gehören in den Report.

- Verify: das Kommando steht wegen der Anführungszeichen darin im Block darunter — eine Zeile,
  unverändert zu übernehmen. Die neun Zusicherungen sind in Zug 0 trocken gegen den ungefixten
  Stand geprüft, ohne eine Zeile zu ändern: die fünf, die die Änderung belegen, beißen heute
  (`A1`, `A2`, `A7`, `A8`, `A9`), die vier, die die Änderung überleben müssen, halten heute schon
  (die drei Registrierungszahlen 9/2/3 und die drei `id`s in `ent-element-peer-round.test.js`). Ein
  roter Verify ist damit ein Befund und keine kaputte Zusicherung.

```bash
pnpm run ci && ! grep -REq 'late-ent-[abcfghkmq]|late-plain-d|late-wrap-e' packages/shadow-objects-testing/test/ent-element-upgrade.test.js packages/shadow-objects-testing/test/prop-element-host.test.js && ! grep -REq "customElements\.define\('" packages/shadow-objects-testing/test/ent-element-upgrade.test.js packages/shadow-objects-testing/test/prop-element-host.test.js packages/shadow-objects-testing/test/ent-element-peer-round.test.js packages/shadow-objects-testing/test/create-element.test.js && test "$(grep -Ec '^[[:space:]]*customElements\.define\(' packages/shadow-objects-testing/test/ent-element-upgrade.test.js)" -eq 9 && test "$(grep -Ec '^[[:space:]]*customElements\.define\(' packages/shadow-objects-testing/test/prop-element-host.test.js)" -eq 2 && test "$(grep -Ec '^[[:space:]]*customElements\.define\(' packages/shadow-objects-testing/test/ent-element-peer-round.test.js)" -eq 3 && test "$(grep -c 'id="pr[347]-mid"' packages/shadow-objects-testing/test/ent-element-peer-round.test.js)" -eq 3 && test "$(grep -rl 'freshTag' packages/shadow-objects-testing/test/ | wc -l)" -eq 4 && ! grep -q 'mock\.calls\[0\]!' packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts && test "$(grep -c 'mock\.calls\[0\]?\.' packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts)" -eq 5
```
- Commit: `test: every late registration brings a name of its own, and a mock call is read like its neighbours`
- Ergebnis: 1 Runde · beide Nebenbefunde behoben · vierzehn späte Registrierungen in
  `ent-element-upgrade.test.js` (9), `prop-element-host.test.js` (2) und
  `ent-element-peer-round.test.js` (3) minten ihren Tag-Namen über den neuen Helfer
  `packages/shadow-objects-testing/src/freshTag.js`; `create-element.test.js` hängt am selben
  Helfer statt an einem eigenen Zähler; `ShadowObjectCreationScope.spec.ts:759` liest über `?.`
  wie seine sechs Geschwister · Nachweis des Schadens: derselbe Fall mit `--retry=1` und einer
  absichtlich gebrochenen Zusicherung meldete vor dem Fix den Folgefehler der überlebenden
  Registrierung statt des echten Fehlschlags, nach dem Fix bricht er in beiden Versuchen
  gleich — der Bruch wurde zurückgenommen und nicht committet · die drei `id`s in
  `ent-element-peer-round.test.js` sind wörtlich geblieben, die Fälle behalten ihren Gegenstand ·
  Review ohne kritischen oder wichtigen Befund
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `packages/shadow-objects-testing/src/freshTag.js` exportiert
  `freshTag(stem)` — liefert einen Tag-Namen, den keine frühere Lesung geliefert hat, und hängt
  den trennenden Bindestrich selbst an. Wer einen Fall schreibt, der ein Custom Element im Rumpf
  eines `it` registriert, nimmt ihn; ein geschriebener Name überlebt keinen zweiten Durchlauf.
### [x] 11. Doku: was der Build tut, was gezählt wird, und ein Bild, das noch nicht sitzt
- Nebenbefund: `CLAUDE.md:85` und `CHANGELOG.md:120` (low, aus Paket 8), `README.md:279` (low, aus Paket 7), `README.md:7` (info, aus Paket 7), dazu die Rücknahme aus der Drain-Runde · aus dem Abgleich dieses Zuges zusätzlich: `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md:25` (info) — dieselbe Ursache wie `README.md:7`, nämlich das einzige weitere nachlaufende Leerzeichen im gesamten versionierten Markdown; getrennt behandelt hieße, dieselbe Ursache zweimal halb zu beheben und die Zusicherung auf eine Datei zu verkürzen, statt sie über den Bestand zu ziehen. Die Ausnahme (a) der Scope-Regel greift dafür nicht: sie hält das Canvas-Paket als *Produkt* heraus — Public-API-Reife, Export-Zuschnitt, Paketinhalt, Konsumentendoku —, und ein verirrtes Leerzeichen ist keine dieser Fragen. Die Datei steht ohnehin im Korpus von `pnpm lint:terms` (`packages/*/docs/**/*.md`).
- Ziel: Die Beschreibung des Worker-Inlinings trifft das Verfahren an beiden Stellen, die es noch falsch nennen; die Skript-Tabelle der Wurzel-README zählt drei Coverage-Suiten und nennt den zusammengeführten Report; `concepts.md` bindet das Architekturdiagramm nicht ein, solange zwei Beschriftungen aus ihren Rahmen laufen, und `docs/README.md` sagt, was mit dem Bild los ist und wer es wie zurückholt; kein versioniertes Markdown trägt ein nachlaufendes Leerzeichen.
- Bereich: `CLAUDE.md`, `CHANGELOG.md` (Wurzel), `README.md` (Wurzel), `packages/shadow-objects/docs/concepts.md`, `packages/shadow-objects/docs/README.md`, `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`
- Hängt ab von: —
- Hash: b053fca
- Modell: mittlere Stufe (`sonnet`)
- Effort: low

- Abgleich (2026-09-02, gegen `9ecb175`) — jeder Eintrag an seiner Fundstelle nachgesehen:
  1. **Worker-Inlining, `CLAUDE.md`** — unverändert, aber verschoben: die Fundstelle ist heute
     Zeile 85 (Paket 9 hat oberhalb eingefügt), Schlusssatz von Schritt 3 unter »Build pipeline
     notes«. Wortlaut: »The `esbuild-plugin-inline-worker` then bundles + base64-inlines that
     worker.«
  2. **Worker-Inlining, Wurzel-`CHANGELOG.md`** — unverändert, heute Zeile 120, im Abschnitt vom
     2026-08-26: »… uses the plugin for the inline base64 worker in the bundle.«
     Beide Stellen sind repo-weit die einzigen beiden Treffer für »base64« in versioniertem
     Markdown, Quelltext, Skripten und `package.json` — gemessen, nicht geschätzt. Damit ist
     »kein Treffer mehr« eine tragfähige Zusicherung.
     Der Sachverhalt selbst am Werkzeug nachgesehen, nicht am Eintrag:
     `esbuild-plugin-inline-worker@0.1.1` (`index.js`) baut den Worker in einem eigenen
     esbuild-Lauf, legt das Ergebnis mit `JSON.stringify(workerCode)` als gewöhnliches
     JS-String-Literal in den Bundle und erzeugt daraus zur Laufzeit
     `new Blob([scriptText], {type: 'text/javascript'})` → `URL.createObjectURL` → `new Worker(url)`.
     Keine Base64-Kodierung, an keiner Stelle. Paket 8 hat für denselben Sachverhalt bereits die
     Formulierung im `CHANGELOG.md` des Kernpakets festgelegt (»sits in the bundle as a plain
     string literal and becomes a `Blob` and an object URL when the worker is created«); dieses
     Paket übernimmt dieselbe Sprache, damit die drei Stellen einander nicht widersprechen.
     Der Klammerzusatz »(the inlined-blob variant)« im selben Satz von `CLAUDE.md:85` ist richtig
     und bleibt stehen.
  3. **Coverage-Zählung, `README.md:279`** — unverändert. Der Satz nennt »The two Node suites
     (`shadow-objects`, `shae-offscreen-canvas`)«. Nachgemessen an den `package.json`: drei Pakete
     fahren `vitest --run --coverage` — `shadow-objects`, `shadow-objects-testing`,
     `shae-offscreen-canvas` —, und `pnpm test` ist `turbo run test && pnpm coverage`, führt die
     drei Rohreporte also zusätzlich nach `coverage/` in der Wurzel zusammen. Falsch ist damit
     zweierlei: die Zahl und das Wort »Node« (die Integrationssuite läuft im Browsermodus in
     echtem Chromium). Der zusammengeführte Report wird mitgenannt, weil der Satz beschreibt, was
     `pnpm test` tut, und `pnpm test` ihn schreibt — ein Leser, der ihn danach im Wurzelverzeichnis
     vorfindet, soll ihn nicht für Streugut halten. Repo-weit ist dies die einzige Stelle mit der
     falschen Zahl: `AGENTS.md:112`, `CLAUDE.md:41` und `CLAUDE.md:60` sagen bereits drei.
  4. **`README.md:7`** — unverändert, ein nachlaufendes Leerzeichen hinter »… offloaded to a Web
     Worker.«. Vorbestehend, nachgesehen mit `git show 524cdaf~1:README.md` (der Stand vor dem
     ersten Commit dieses Laufs trägt es bereits).
  5. **`packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md:25`** — hinter »… to the
     entity and its children.«, ebenfalls vorbestehend (`git show 524cdaf~1:…`). Zusammen mit
     Punkt 4 die einzigen beiden Vorkommen in `git ls-files '*.md'`.
  6. **Rücknahme des Architekturdiagramms** — die Einbindung steht unverändert in
     `packages/shadow-objects/docs/concepts.md:56`, eingefügt von `07962b2` als genau zwei Zeilen
     (Bildzeile plus Leerzeile). Der Hinweis in `docs/README.md:29-31` stammt aus demselben
     Commit. Beide Bilddateien liegen unverändert in `packages/shadow-objects/docs/`
     (`architecture@2x.png`, 182 163 B; `architecture.afdesign`, 69 649 B) und gehören nicht zum
     veröffentlichten Paket — `src/distContract.files.txt` führt keinen einzigen `docs/`-Pfad.

- Folge der eigenen Änderung, mitgezogen statt gemeldet: Der Abschnitt »2026-09-02 — the README
  image fits the width GitHub renders it at, and the architecture diagram has a place« im
  Wurzel-`CHANGELOG.md` behauptet an vier Stellen, das Diagramm sei in `concepts.md` eingebunden
  (Überschrift Z. 14, Einleitung Z. 16, Bullet Z. 19, Bullet Z. 21). Mit der Rücknahme wird jede
  dieser vier Aussagen unwahr. Sie werden **an Ort und Stelle** berichtigt und nicht durch einen
  neuen Abschnitt widerrufen: der Abschnitt trägt dasselbe Datum wie dieses Paket, ist nie
  veröffentlicht worden, und ein CHANGELOG, der binnen eines Tages ankündigt und zurücknimmt,
  kostet jeden späteren Leser den Umweg über beide Einträge. Der Widerruf wäre außerdem genau der
  Rückblick auf einen Vorzustand, den die Konventionen im Kopf dieses Plans ausschließen — die
  dort benannte CHANGELOG-Ausnahme greift nicht, denn Gegenstand wäre nicht, was Git mit dem Alten
  tut, sondern wie die Doku einmal aussah.
  Das `CHANGELOG.md` des Kernpakets ist nicht betroffen: es nennt weder »architecture« noch
  »diagram« im `[Unreleased]`-Abschnitt — nachgesehen, nicht angenommen.

- Dateien: `CLAUDE.md`, `CHANGELOG.md` (Wurzel), `README.md` (Wurzel),
  `packages/shadow-objects/docs/concepts.md`, `packages/shadow-objects/docs/README.md`,
  `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`. Genau diese sechs und keine
  siebte. Kein Quelltext, keine Testdatei, kein Harness-Skript, kein `AGENTS.md`, kein
  Paket-`CHANGELOG.md`, keine `audit.html`.

- Vorgehen:

  1. **`CLAUDE.md` — der Bundle-Schritt nennt das Verfahren.** Gesucht wird diese Zeichenfolge,
     sie steht genau einmal in der Datei (heute Zeile 85, am Zeilenende):

     ```
     The `esbuild-plugin-inline-worker` then bundles + base64-inlines that worker.
     ```

     Sie wird ersetzt durch:

     ```
     The `esbuild-plugin-inline-worker` then bundles that worker in an esbuild pass of its own and embeds the result as a plain string literal, which becomes a `Blob` and an object URL when the worker is created.
     ```

     Der Rest der Zeile bleibt Zeichen für Zeichen stehen, der Klammerzusatz
     »(the inlined-blob variant)« eingeschlossen.

  2. **Wurzel-`CHANGELOG.md` — dieselbe Korrektur im Eintrag vom 2026-08-26.** Gesucht wird
     diese Zeichenfolge, sie steht genau einmal in der Datei (heute Zeile 120):

     ```
     `packages/shadow-objects/build.mjs` uses the plugin for the inline base64 worker in the bundle.
     ```

     Sie wird ersetzt durch:

     ```
     `packages/shadow-objects/build.mjs` uses the plugin to inline the worker source into the bundle.
     ```

     Einrückung und Zeilenumbrüche des umgebenden Bullets bleiben, wie sie sind.

  3. **`README.md` (Wurzel) — die Zeile zu `pnpm test` zählt drei Suiten.** Gesucht wird die
     ganze Tabellenzeile, sie steht genau einmal in der Datei (heute Zeile 279):

     ```
     | `pnpm test` | Runs all tests (Unit, Integration, E2E) across all packages. The two Node suites (`shadow-objects`, `shae-offscreen-canvas`) also write a v8 coverage report to `coverage/` in each package — no thresholds, the number is a map, not a gate. |
     ```

     Sie wird ersetzt durch:

     ```
     | `pnpm test` | Runs all tests (Unit, Integration, E2E) across all packages. The three vitest suites (`shadow-objects`, `shadow-objects-testing`, `shae-offscreen-canvas`) each write a v8 coverage report to `coverage/` in their own package, and the run merges them into `coverage/` at the repository root — no thresholds, the number is a map, not a gate. |
     ```

     Der Tabelle wird **keine** Zeile für `pnpm coverage` hinzugefügt. Der Befund ist die falsche
     Zahl, nicht die Vollständigkeit der Tabelle, und das Zusammenführen steht jetzt dort, wo ein
     Leser es braucht — in der Zeile des Kommandos, das es auslöst.

  4. **`README.md:7` — das nachlaufende Leerzeichen fällt weg.** Zeile 7 endet auf
     »… fully offloaded to a Web Worker. « mit einem Leerzeichen vor dem Umbruch. Das Leerzeichen
     wird entfernt, der Text der Zeile bleibt sonst unangetastet.

  5. **`packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md:25` — dasselbe.** Die Zeile
     endet auf »… to the entity and its children. «. Das Leerzeichen wird entfernt, sonst nichts
     an der Datei. Insbesondere wird kein CHANGELOG-Eintrag dafür geschrieben: ein entferntes
     Leerzeichen ändert weder Verhalten noch Inhalt noch Oberfläche.

  6. **`packages/shadow-objects/docs/concepts.md` — die Einbindung wird zurückgenommen.**
     Ersatzlos gestrichen werden genau zwei aufeinanderfolgende Zeilen, heute 56 und 57:

     ```
     ![The View Layer and one Shadow Environment, side by side](./architecture@2x.png)
     ```

     und die unmittelbar darauf folgende Leerzeile. Danach steht der Absatz »Shadow Objects
     separates your application into two layers …« wieder direkt über dem Codeblock
     »View Layer (Main Thread)«, getrennt durch die eine Leerzeile, die schon vorher dort stand.
     Die Datei hat davor 447 Zeilen und danach 445. Sonst wird an `concepts.md` nichts geändert —
     keine Überschrift, kein Satz, kein Codeblock.

  7. **`packages/shadow-objects/docs/README.md` — der Hinweis sagt, was mit dem Bild ist.**
     Gesucht wird der dreizeilige Absatz zwischen der Tabelle »The Files« und der Überschrift
     »## Related Packages«, heute Zeilen 29–31:

     ```
     The diagram in [concepts.md](./concepts.md) is `architecture@2x.png`. Its editable source is
     `architecture.afdesign`, an Affinity Designer document -- whoever changes the diagram edits that
     file and exports the PNG again.
     ```

     Er wird ersetzt durch:

     ```
     `architecture@2x.png` is the architecture diagram, and no page embeds it: two of its labels run
     past the edge of the artboard and are cut off there. Its editable source is
     `architecture.afdesign`, an Affinity Designer document -- whoever fixes those labels edits that
     file, exports the PNG again, and puts the image under "The Big Picture" in
     [concepts.md](./concepts.md).
     ```

     Der Absatz behält seine Stellung und die Leerzeilen darüber und darunter. Die beiden
     Dateinamen und der Link auf `concepts.md` bleiben ausdrücklich stehen: daran hängt, dass die
     beiden Bilddateien im Repository referenziert bleiben und nicht als verwaist erscheinen.
     Der doppelte Bindestrich `--` ist die Schreibweise dieser Datei und wird beibehalten.

  8. **Wurzel-`CHANGELOG.md` — der Abschnitt vom 2026-09-02 beschreibt, was dasteht.** Vier
     Eingriffe in den Abschnitt, der heute bei Zeile 14 beginnt, in dieser Reihenfolge:

     a) Die Überschrift (heute Zeile 14)

     ```
     ## 2026-09-02 — the README image fits the width GitHub renders it at, and the architecture diagram has a place
     ```

     wird zu

     ```
     ## 2026-09-02 — the README image fits the width GitHub renders it at, and the docs name the architecture diagram beside its editable source
     ```

     b) Die Einleitung (heute Zeile 16)

     ```
     The infographic above the root README is sized and compressed for the width GitHub actually renders it at, and the core package's architecture diagram is embedded in its documentation, where a reader looking at "The Big Picture" sees it.
     ```

     wird zu

     ```
     The infographic above the root README is sized and compressed for the width GitHub actually renders it at, and the core package's documentation names the architecture diagram along with the Affinity Designer document it is exported from.
     ```

     c) Das Bullet zu `concepts.md` (heute Zeile 19) entfällt ersatzlos:

     ```
     - **`packages/shadow-objects/docs/concepts.md`:** `architecture@2x.png` is embedded under "The Big Picture", showing the View Layer and a Shadow Environment side by side.
     ```

     Es entfällt, weil die Datei nach diesem Paket wieder unverändert ist und ein CHANGELOG den
     Bestand beschreibt, nicht die Zwischenstände, die zu ihm geführt haben. Das Bullet darunter
     zu `architecture.svg` bleibt unangetastet — die Datei ist und bleibt gelöscht.

     d) Das Bullet zu `docs/README.md` (heute Zeile 21)

     ```
     - **`packages/shadow-objects/docs/README.md`:** a sentence under "The Files" names `architecture@2x.png` as the diagram embedded in `concepts.md`, and `architecture.afdesign` as its editable source.
     ```

     wird zu

     ```
     - **`packages/shadow-objects/docs/README.md`:** a sentence under "The Files" names `architecture@2x.png` as the architecture diagram and `architecture.afdesign` as its editable source, and says that two of the diagram's labels run past the edge of the artboard.
     ```

     Die übrigen Bullets des Abschnitts (`what-is-shadow-objects.webp`, `architecture.svg`,
     `README.md`, `cheat-sheet.md`) bleiben Zeichen für Zeichen stehen.

  9. **Wurzel-`CHANGELOG.md` — ein neuer Abschnitt für dieses Paket.** Er wird als oberster
     Abschnitt eingefügt, also unmittelbar nach der Zeile »The format is loosely based on …«
     (heute Zeile 5) und vor »## 2026-09-02 — the publish step calls npm with an argument array …«
     (heute Zeile 7), getrennt durch je eine Leerzeile. Wortlaut:

     ```
     ## 2026-09-02 — the build notes name how the worker is inlined, and the script table counts the coverage suites

     `CLAUDE.md` describes the bundle stage as the plugin performs it, and the root README's `pnpm test` row names the three vitest suites that write coverage and the merged report the run leaves at the repository root.

     - **`CLAUDE.md`:** the bundle stage says that `esbuild-plugin-inline-worker` bundles the worker in an esbuild pass of its own and embeds the result as a plain string literal, which becomes a `Blob` and an object URL when the worker is created.
     - **`README.md`:** the `pnpm test` row names all three vitest suites — `shadow-objects`, `shadow-objects-testing` and `shae-offscreen-canvas` — and the merged report under `coverage/` at the repository root.
     ```

     Kein Bullet über die Korrekturen am `CHANGELOG.md` selbst und keines über die beiden
     entfernten Leerzeichen: eine Datei, die sich selbst berichtigt, hat dem Leser nichts zu
     melden, und ein Leerzeichen ändert nichts, was ein CHANGELOG führt.

  10. **Nicht getan wird:** kein Durchgang durch die übrigen Abschnitte des
      Wurzel-`CHANGELOG.md`, keine Zeile in `AGENTS.md` (die Sieben-Datei-Regel in §3 zählt
      Markdown-Dateien, und an deren Zahl ändert dieses Paket nichts — nachgesehen), keine
      Zeile im `CHANGELOG.md` eines Pakets, keine Zeile in `README.md` außer den beiden
      genannten, kein Anfassen der beiden Bilddateien, keine Zeile in `./audit.html`. Der
      Rückgabeweg des Diagramm-Befunds ins Audit ist eine Sache des Abschlusses und steht dort,
      wo der Abschluss ihn findet: unter »Offene Befunde« im Kopf dieses Plans. Fällt beim
      Arbeiten eine weitere Stelle auf, wird sie im Report als Nebenbefund gemeldet und nicht
      behoben.

- Kein Regressionstest: das Paket fasst keinen Quelltext an und behebt keinen
  Korrektheitsfehler. Der Nachweis sind die mechanischen Zusicherungen des Verify-Kommandos, und
  die sechs Negativproben darin sind trocken gegen den ungefixten Stand durchgespielt — alle
  sechs beißen (Leerraum, `base64`, die Einbindung in `concepts.md`, »three vitest suites«,
  »is embedded under« im CHANGELOG, »The Big Picture« in `docs/README.md`). Ein roter Verify in
  Zug 5 ist damit ein Befund und keine kaputte Zusicherung.
- Verify: `pnpm run ci && test "$(git status --porcelain -- . ':(exclude)remediation-plan.md' | wc -l)" -eq 6 && test -z "$(git ls-files '*.md' | xargs grep -lP '[ \t]+$')" && ! grep -Fqi 'base64' CLAUDE.md CHANGELOG.md && grep -Fq 'and an object URL when the worker is created' CLAUDE.md && ! grep -q 'architecture@2x.png' packages/shadow-objects/docs/concepts.md && test "$(wc -l < packages/shadow-objects/docs/concepts.md)" -eq 445 && grep -q 'architecture@2x.png' packages/shadow-objects/docs/README.md && grep -q 'architecture.afdesign' packages/shadow-objects/docs/README.md && grep -q 'The Big Picture' packages/shadow-objects/docs/README.md && ! grep -q 'is embedded under' CHANGELOG.md && ! grep -q 'the diagram embedded in' CHANGELOG.md && grep -q 'three vitest suites' README.md && ! grep -q 'two Node suites' README.md`
- Commit: `docs: the worker inlining is named as the build performs it, three coverage suites are counted, and the architecture diagram waits for its labels`
- Ergebnis: 1 Runde · alle sechs Queue-Einträge erledigt · `CLAUDE.md` und das
  Wurzel-`CHANGELOG.md` beschreiben das Worker-Inlining als String-Literal plus `Blob` und
  Objekt-URL statt als Base64-Kodierung · die `pnpm test`-Zeile der Wurzel-`README.md` nennt
  drei vitest-Suiten und den zusammengeführten Report unter `coverage/` · die Einbindung des
  Architekturdiagramms in `concepts.md` ist zurückgenommen, `docs/README.md` benennt Bild,
  editierbare Quelle und den Grund, dazu die vier mitgezogenen Aussagen im
  `CHANGELOG.md`-Abschnitt vom 2026-09-02 · kein versioniertes Markdown trägt noch ein
  nachlaufendes Leerzeichen · kein Regressionstest (kein Quelltext, kein Korrektheitsfehler);
  die Zusicherungen des Verify-Kommandos sind der Nachweis · Review ohne kritischen und ohne
  wichtigen Befund · Verify `paket-11.verify.log` exit 0
- Nebenbefunde: keiner neu
- Folgen: keine
- Hinweis für den Abschluss: Die `Verify:`-Zeile des erledigten Pakets 7 enthält die Zusicherung
  `grep -q 'architecture@2x.png' packages/shadow-objects/docs/concepts.md`. Sie war zu ihrer Zeit
  richtig und wird von diesem Paket auf Ansage des Nutzers (Eintrag vom 2026-09-02 unter »Offene
  Befunde«) zurückgenommen. Die beiden Zeilen widersprechen einander nicht, sie stehen
  nacheinander.
