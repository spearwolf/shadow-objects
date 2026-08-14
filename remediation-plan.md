# Remediation-Plan — @spearwolf/shadow-objects-monorepo

Quelle: ./audit.html vom 2026-08-13 · Branch: main · erstellt: 2026-08-13
Baseline: lint ✓ · typecheck ✓ · build ✓ · test:ci ✓ (258 Tests) · e2e ✓ (298 Tests, Chromium + Firefox)
Scope: 6 von 55 Findings · vom Nutzer namentlich benannt: CI-001, ENV-REGISTRY-001, WORKER-001, STRICT-NULL (alle `high`) · nachträglich aufgenommen, weil der Compiler in Paket 5 auf sie zeigt: ELEM-OBS-001 (medium), ELEM-VC-001 (low)
Ausgenommen: alle übrigen 49 Findings — nicht angefragt, kein Urteil über sie gefällt. `acknowledged` ist leer.
Stand (2026-08-14): **Lauf abgeschlossen.** Alle sieben Pakete committet (`3cfd93d`, `5bbcdac`, `8ac1e34`, `81bb4f0`, `45a2048`, `8f9475c`, `aa74955`), kein Paket blockiert, keine offene Folge. Voller Verify-Lauf gegen die Baseline grün: lint · typecheck (2 Pakete) · build · test:ci 292+41+1 · e2e 324. `audit.html` ist nachgeführt und neu gestaltet, `./remediation-plan.md` geht mit dem Abschluss-Commit ins Repo.

## Semver

Bewertet wurde die öffentliche Oberfläche von `@spearwolf/shadow-objects` zwischen `c758d2e` und `aa74955`. Ergebnis: **breaking**, unter `1.0.0` also eine Anhebung der Minor-Stelle, `0.33.0` → `0.34.0`. Tragend sind zwei Punkte: die emittierten `.d.ts` führen jetzt `| undefined`, wo ein Wert fehlen kann — ein Konsumenten-Build mit `strictNullChecks` sieht dadurch neue Fehler —, und `RemoteWorkerEnv` lehnt mit `WorkerDestroyedError` bzw. `WorkerFailedError` ab statt mit dem Stringliteral `'worker was destroyed'`. Alles Übrige ist additiv oder Bugfix.

**Die Version wurde nicht angehoben.** Das Projekt behandelt ein Release als eigenen Akt (`chore: release vX.Y.Z`), sammelt bis dahin unter `## [Unreleased]` — und dort lagen schon vor diesem Lauf Einträge —, und `deploy.yml` publiziert nach grüner CI auf `main` nach npm. Eine Anhebung hier wäre eine Veröffentlichungsentscheidung, und die gehört dem Nutzer. Die Bewertung steht stattdessen als Hinweis am Kopf von `packages/shadow-objects/CHANGELOG.md`, wo ein Release sie liest.

`@spearwolf/shae-offscreen-canvas` (0.6.0) bleibt unberührt: es re-exportiert nichts aus `@spearwolf/shadow-objects`, seine Quellen sind `.js`, und keine der Änderungen erreicht seine Oberfläche.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

## Entscheidungen

- **CI-001** — Eigener Job `e2e` in `.github/workflows/ci.yml`, beide Browser (Chromium + Firefox) bei jedem Push. Der Deployment-Workflow hängt über `workflow_run` automatisch mit dran: er publiziert nur, wenn der gesamte CI-Workflow grün ist, also beide Jobs. Kein nächtlicher Sonderlauf. (2026-08-13)
- **ENV-REGISTRY-001** — Variante A: `destroy()` leert die Registry nur, wenn die Umgebung sie selbst angelegt hat. Die Alternative (eigene Registry je Env, aus der Default-Registry initialisiert) wurde verworfen, weil sie die Lookup-Semantik ändert: nachträglich per `@ShadowObject` oder `shadowObjects.define()` registrierte Token wären für eine bestehende Umgebung unsichtbar. (2026-08-13)
- **ENV-REGISTRY-001, Auslegung von Variante A** — »Selbst angelegt« heißt: eine andere Instanz als die Default-Registry. Die Bedingung ist der Instanz-Vergleich `this.kernel.registry !== Registry.get()`, nicht »ein Argument wurde übergeben«. Eine dem Konstruktor übergebene eigene Registry wird von `destroy()` weiterhin geleert; `new LocalShadowObjectEnv(Registry.get())` zählt als geteilt und bleibt unangetastet. (2026-08-13)
- **STRICT-NULL** — Vollständig durchziehen statt Ratchet. Kein dauerhaftes `tsconfig.strict.json`; am Ende steht `strictNullChecks: true` in der Root-`tsconfig.json`, und das Finding ist geschlossen. Aufgeteilt in drei Teilpakete, aufsteigend nach Aufwand, `Kernel.ts` zuletzt. (2026-08-13)
- **WORKER-001, Zombie-Thread bei gescheitertem `start()`** — Die eine Zeile `worker.terminate()` im `catch` von `start()` kommt mit ins Paket, obwohl der Sachverhalt vorbestehend ist und über WORKER-001 hinausgeht. Der Ausfallpfad kreuzt die Stelle ohnehin, und `isDestroyed === true` bei weiterlaufendem Worker wäre eine Lüge über den eigenen Zustand. Geht als eigenes Behavior-Bullet ins Paket-CHANGELOG. (2026-08-13)
- **Scope-Erweiterung um ELEM-OBS-001 und ELEM-VC-001** — Beide werden in Paket 5 mit behoben, Weg A des Planers. Der Compiler zeigt unter `strictNullChecks` direkt auf sie: `ShaeEntElement.ts:207` als TS2352 (dort ist der Wert immer `null`, also ein garantierter `TypeError`), `:353/:354` als TS18048. Der Scope umfasst damit 6 Findings statt 4. Weg B — typkorrekt machen und die Defekte stehen lassen — wurde verworfen, weil er an `:207` einen Doppel-Cast über `unknown` und an `:353` eine nachweislich falsche Behauptung im Code hinterlassen hätte. (2026-08-13)
- **STRICT-NULL, Signatur von `provideContext()` / `provideGlobalContext()`** — Weg A: der Parameter `sourceOrInitialValue` in `src/types.ts:113/:119` wird rein additiv um einen `SignalReader<T>`-Zweig erweitert. Grund: `SignalReader<T>` ist über `compare?: CompareFunc<T>` invariant, also ist `SignalReader<string>` kein `SignalReader<string | undefined>` — die Signatur lehnt damit genau den Anwendungsfall ab, den `docs/api-reference.md:122`, `guides.md:269`, `concepts.md:314` und `cheat-sheet.md:134` vorführen. Weg B (die zwei Spec-Fälle auf `createSignal<string | undefined>` umschreiben) wurde verworfen, weil er den Beleg an den Defekt anpasst und die falsche Signatur im ausgelieferten `.d.ts` stehen lässt. Kein bestehender Zweig fällt weg, CHANGELOG-pflichtig. (2026-08-14)
- **Restpunkte des Laufs** — Die drei Punkte, die Paket 6 als »verlässt den Lauf ungelöst« gemeldet hat, werden nicht ins nächste Audit geschoben, sondern in einem siebten Paket geschlossen: die zwei Testlücken aus Paket 3 und die Uneinheitlichkeit in `Registry.ts` aus Paket 4. Der Lauf endet damit nach Paket 7. (2026-08-14)
- **Plan-Verbleib** — `./remediation-plan.md` wandert am Ende per Abschluss-Commit ins Repo. Während des Laufs bleibt die Datei ungetrackt, weil sie die Hashes der Commits trägt, in denen sie deshalb nicht liegen kann. (2026-08-13)

## Konventionen

Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise:

- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs. Sie gehören diesem einen Audit und sind danach tot. Sie
  leben in diesem Plan und in Commit-Messages, sonst nirgends.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

Projektspezifisch, aus `AGENTS.md` und `CLAUDE.md`:

- **Sprache**: Code, Kommentare, Doku, Commit-Messages auf Englisch. Antworten an den Nutzer auf Deutsch.
- **Changelog-Pflicht, zweigeteilt**: Änderungen an `src/`, an der öffentlichen API oder am Verhalten für Konsumenten → `packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`. Änderungen an CI, Build-Pipeline, Tooling, devDeps → Wurzel-`CHANGELOG.md` als datierter Abschnitt. Betrifft ein Paket beides, kommen beide dran, jeweils aus ihrer eigenen Perspektive.
- **Doku ist Teil des API-Vertrags**: Jede Änderung an der öffentlichen API aktualisiert im selben Paket `packages/shadow-objects/docs/`, `packages/shadow-objects/README.md` und den Paket-CHANGELOG.
- **Terminologie ist bindend** (`AGENTS.md` §4): `RemoteWorkerEnv` (nie `RemoteShadowObjectEnv`), Entity, Entity Tree, Token, `ComponentContext` für die Namespace-Registrierung, »Entity Context« für die DI entlang des Entity-Baums. Verboten als Analogie: shadow theater, puppet, puppeteer, light world, screen.
- **Dependency-Versionen** stehen ausschließlich im `catalog:`-Block von `pnpm-workspace.yaml`, referenziert als `"<dep>": "catalog:"`. Keine Version in einer Paket-`package.json`.
- **TODO-Kommentare**: Wer einen anlegt, ändert oder entfernt, ruft `pnpm make:todo`.

## Vorbestehende Fehler

Keine. Die Baseline ist auf allen vier Kommandos grün, E2E eingeschlossen.

## Verify-Kommandos

- `pnpm lint` — biome, gesamtes Repo
- `pnpm typecheck` — turbo → `tsc --noEmit`
- `pnpm build` — turbo, alle Pakete
- `pnpm test:ci` — alle Tests außer E2E
- `pnpm -F shadow-objects-e2e test` — Playwright, Chromium + Firefox (Browser sind lokal installiert)

Zwischenstand für die STRICT-NULL-Pakete, solange das Flag global noch aus ist:
`cd packages/shadow-objects && npx tsc -p tsconfig.json --noEmit --strictNullChecks 2>&1 | grep -c "error TS"`
Ausgangswert 60. Jedes Teilpaket senkt die Zahl auf einen im Detailplan genannten Sollwert; Paket 6 schaltet das Flag scharf, danach fängt `pnpm typecheck` den Stand.

## Pakete

### [x] 1. E2E-Suite in die CI-Pipeline

- Findings: CI-001 (high, S)
- Ziel: Die Playwright-Suite läuft als eigener CI-Job bei jedem Push und blockiert das npm-Publish, wenn sie rot ist.
- Hash: `3cfd93d`
- Ergebnis: 1 Runde · CI-001 behoben · Reviewer ohne Befund · Job `e2e` in `.github/workflows/ci.yml`, Gate über `workflow_run` in `deploy.yml` bestätigt, kein `deploy.yml`-Diff nötig
- Nebenbefunde: —
- Folgen: —

<details><summary>Detailplan (erledigt)</summary>

- Bereich: `.github/workflows/ci.yml`, Wurzel-`CHANGELOG.md`
- Modell: mittlere Stufe
- Dateien: `.github/workflows/ci.yml`, `CHANGELOG.md`
- Vorgehen:
  1. In `.github/workflows/ci.yml` einen zweiten Job `e2e` neben dem bestehenden Job `ci` anlegen. Beide Jobs bleiben in derselben Workflow-Datei `Continuous Integration` und laufen parallel; es gibt kein `needs:` zwischen ihnen.
  2. Der Job `e2e` heißt im UI `name: Run the e2e test suite`, läuft auf `ubuntu-latest` und bekommt `timeout-minutes: 20`. Seine Schritte, in dieser Reihenfolge und mit denselben Action-Versionen wie der bestehende Job:
     - `actions/checkout@v6`
     - `actions/setup-node@v6` mit `node-version: 24`
     - `pnpm/action-setup@v6` mit `run_install: true`
     - Schritt `Install Playwright browsers` mit `run: pnpm exec playwright install --with-deps chromium firefox` — beide Browser, weil `packages/shadow-objects-e2e/playwright.config.ts` die Projekte `chromium` und `firefox` führt.
     - Schritt `Run e2e tests` mit `run: pnpm exec turbo run test --filter=shadow-objects-e2e`.
  3. Für den Testlauf ist `turbo run test --filter=shadow-objects-e2e` zu verwenden, **nicht** `pnpm -F shadow-objects-e2e test`. Der Turbo-Task `test` trägt `dependsOn: ["^build", "build"]` und baut damit `@spearwolf/shadow-objects` nach `dist/`, bevor Vite es auflöst. Der direkte pnpm-Aufruf überspringt das und findet in einem frischen CI-Checkout kein `dist/`. Das entspricht zugleich der Regel aus `AGENTS.md`, Tasks über turbo statt über das darunterliegende Werkzeug zu starten.
  4. Als letzten Schritt des Jobs den Playwright-Report bei Fehlschlag sichern: `actions/upload-artifact@v4`, `if: ${{ !cancelled() }}`, `name: playwright-report`, `path: packages/shadow-objects-e2e/playwright-report/`, `retention-days: 7`. Ohne diesen Schritt hinterlässt ein roter Lauf nichts Auswertbares — der Reporter der Suite ist `html`.
  5. Den bestehenden Job `ci` unverändert lassen. Er behält seinen Chromium-only-Install (den braucht die Vitest-Browser-Mode-Suite in `shadow-objects-testing`) und ruft weiter `pnpm run ci` auf, dessen `--filter=!shadow-objects-e2e` jetzt korrekt ist, weil die E2E-Suite den eigenen Job hat. `package.json` wird nicht angefasst.
  6. `.github/workflows/deploy.yml` wird ebenfalls **nicht** angefasst. Der Deploy-Workflow triggert auf `workflow_run` des Workflows `Continuous Integration` mit `conclusion == 'success'`; die Conclusion eines Workflow-Laufs ist nur dann `success`, wenn alle seine Jobs erfolgreich waren. Der neue Job hängt damit automatisch vor dem npm-Publish. Der Implementierer bestätigt diese Kette im Report, statt sie stillschweigend vorauszusetzen.
  7. In der Wurzel-`CHANGELOG.md` einen neuen datierten Abschnitt `## 2026-08-13 — E2E suite in CI` **oberhalb** des vorhandenen Abschnitts `## 2026-08-13 — Test-harness corrections` einfügen (die Datei ist absteigend nach Datum sortiert). Inhalt: der neue Job, beide Browser, die Gate-Wirkung auf den Deployment-Workflow, der Report-Artifact. Kurz halten, ein bis drei Bullets, im Ton der vorhandenen Abschnitte. Kein Eintrag in `packages/shadow-objects/CHANGELOG.md` — dieses Paket ändert weder Laufzeitcode noch API.
- Verify: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && pnpm lint && pnpm exec turbo run test --filter=shadow-objects-e2e --force`
- Commit: `ci: run the e2e suite as its own job (CI-001)`

**CI-001 · high · `.github/workflows/ci.yml:24-25`, `package.json:19-20`** — Die E2E-Suite läuft in keiner CI-Pipeline

Der ci-Task filtert shadow-objects-e2e explizit heraus (--filter=!shadow-objects-e2e), und der Workflow installiert nur Chromium, während playwright.config.ts Chromium und Firefox als Projekte führt. Neun E2E-Specs — die einzige Absicherung des vollständigen Worker-Roundtrips über echtes postMessage, inklusive Bundle-Variante mit inline-Worker — laufen damit ausschließlich lokal und nach Belieben. Der Deployment-Workflow veröffentlicht auf npm, sobald diese verkürzte CI grün ist. Die Ebene, die als einzige den ausgelieferten Bundle prüft, ist die Ebene, die vor der Veröffentlichung nicht läuft.

Empfehlung: Einen eigenen CI-Job für die E2E-Suite ergänzen (playwright install --with-deps chromium firefox, danach pnpm -F shadow-objects-e2e test) und den Deployment-Workflow von dessen Erfolg abhängig machen. Wenn die Laufzeit stört: auf Chromium beschränken und nächtlich vollständig fahren — aber nicht ganz weglassen.

</details>

### [x] 2. LocalShadowObjectEnv.destroy() räumt nur die eigene Registry

- Findings: ENV-REGISTRY-001 (high, S)
- Ziel: Eine zerstörte Umgebung nimmt keiner anderen Umgebung im selben Thread ihre Token-Definitionen weg.
- Hash: `5bbcdac`
- Ergebnis: 2 Runden · ENV-REGISTRY-001 behoben (`LocalShadowObjectEnv.ts`, Feld `#usesDefaultRegistry`, Guard in `destroy()`) · 4 Regressionsfälle in `LocalShadowObjectEnv.spec.ts`, roter Lauf belegt · Runde 1 schloss 3 wichtige und 5 kleine Reviewer-Befunde, Nachprüfung ohne neue
- Nebenbefunde: —
- Folgen: —
- Bekannte Restlücke, vom Nutzer entschieden und im Inline-Kommentar benannt: teilen sich **zwei** Umgebungen dieselbe eigene Registry, leert das erste `destroy()` sie für beide. Deckt der Beschluss »Auslegung von Variante A«; nicht getestet.

<details><summary>Detailplan (erledigt)</summary>

- Bereich: `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts` + Regressionstest, `docs/api-reference.md`, Paket-`CHANGELOG.md`
- Modell: mittlere Stufe

- Dateien:
  - `packages/shadow-objects/src/view/LocalShadowObjectEnv.spec.ts` (Regressionstest, zuerst)
  - `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts` (Fix)
  - `packages/shadow-objects/docs/api-reference.md` (Abschnitt `### LocalShadowObjectEnv`, Abschnitt `#### registry.clear()`)
  - `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`)
- Vorgehen:
  1. **Zuerst der rote Test.** Der Regressionstest gehört in die bestehende Spec `packages/shadow-objects/src/view/LocalShadowObjectEnv.spec.ts` (vitest, happy-dom, läuft über `pnpm -F @spearwolf/shadow-objects test`). Sie hat bisher nur `describe('LocalShadowObjectEnv')` mit den Fällen `should be defined`, `should create`, `should sync` und ein `afterEach`, das `ComponentContext.get().clear()` ruft. Zu ergänzen:
     - Imports: `import {Registry} from '../in-the-dark/Registry.js';` und `import {shadowObjects} from '../in-the-dark/ShadowObject.js';`
     - Das bestehende `afterEach` um `Registry.get().clear();` erweitern. Ohne das leckt die Default-Registry in andere Spec-Dateien; `ShadowEnv.spec.ts` und `ShadowObject.spec.ts` räumen sie aus demselben Grund auf.
     - Ein neuer verschachtelter Block `describe('destroy', () => { … })` mit vier Fällen. Als Testklassen genügen leere Klassenausdrücke (`class {}`); `shadowObjects.define()` reicht sie unverändert durch, `findConstructors` liefert also dieselbe Referenz zurück (anders als der `@ShadowObject`-Dekorator, der die Klasse einpackt).
       - `it('leaves the default registry to the other environments', …)`: `const Foo = class {};` und `shadowObjects.define('env-a-token', Foo);` — danach `const envA = new LocalShadowObjectEnv();` und `const envB = new LocalShadowObjectEnv();`, dann `envA.destroy();`. Erwartet: `expect(Registry.get().hasToken('env-a-token')).toBe(true)`, `expect(envB.registry.hasToken('env-a-token')).toBe(true)` und `expect(envB.registry.findConstructors('env-a-token')).toContain(Foo)`. Abschließend `envB.destroy();` und erneut `expect(Registry.get().hasToken('env-a-token')).toBe(true)`. Das ist der Fall aus dem Finding, wörtlich nachgestellt.
       - `it('leaves the routes of the default registry alone', …)`: `Registry.get().appendRoute('env-route-parent', ['env-route-child']);`, dann `new LocalShadowObjectEnv().destroy();`, erwartet `expect(Registry.get().hasRoute('env-route-parent')).toBe(true)`. Deckt die zweite Hälfte von `Registry.clear()` ab — Token und Routen werden getrennt gehalten und müssen beide überleben.
       - `it('does not clear the default registry when it is passed explicitly', …)`: `shadowObjects.define('env-explicit-default', class {});`, dann `new LocalShadowObjectEnv(Registry.get()).destroy();`, erwartet `expect(Registry.get().hasToken('env-explicit-default')).toBe(true)`. Dieser Fall ist der Grund, warum die Prüfung in Schritt 2 auf Instanz-Gleichheit geht und nicht darauf, ob ein Argument übergeben wurde.
       - `it('clears a registry that belongs to the environment alone', …)`: `const registry = new Registry(); const Bar = class {}; shadowObjects.define('env-own-token', Bar, registry); const env = new LocalShadowObjectEnv(registry); env.destroy();`, erwartet `expect(registry.hasToken('env-own-token')).toBe(false)`. Hält die Seite fest, die erhalten bleibt.
     - Diesen Stand einmal laufen lassen und rot sehen, bevor Schritt 2 beginnt: `cd packages/shadow-objects && pnpm exec vitest src/view/LocalShadowObjectEnv.spec.ts --run`. Erwartung: die ersten drei Fälle schlagen fehl, der vierte ist grün. Trifft das nicht zu, ist der Test falsch aufgebaut — nicht weiterarbeiten, sondern den Test korrigieren.
  2. **Fix in `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts`.** Vier Eingriffe:
     - Zeile 5: `import type {Registry} from '../in-the-dark/Registry.js';` wird zum Wert-Import `import {Registry} from '../in-the-dark/Registry.js';`. Die vorhandene Typverwendung in der Konstruktor-Signatur und im `registry`-Getter bleibt unverändert gültig.
     - Neues privates Feld direkt unter `#importedModules`: `readonly #ownsRegistry: boolean;`
     - Im Konstruktor unmittelbar nach `this.kernel = new Kernel(registry);`: `this.#ownsRegistry = this.kernel.registry !== Registry.get();`
     - In `destroy()` wird `this.registry.clear();` zu `if (this.#ownsRegistry) { this.registry.clear(); }`. Reihenfolge und die beiden anderen Zeilen (`this.kernel.destroy();`, `this.#importedModules.clear();`) bleiben, wie sie sind.
  3. **Warum der Instanz-Vergleich und nicht `registry != null`.** `Kernel` legt nie eine eigene Registry an, sondern ruft `Registry.get(registry)` (`Kernel.ts:88-90`), und `Registry.get()` liefert bei fehlendem Argument die modulweite `defaultRegistry` (`Registry.ts:35-37`). Ein Aufruf `new LocalShadowObjectEnv(Registry.get())` übergibt also ein Argument und meint trotzdem die geteilte Registry. Nur der Vergleich `this.kernel.registry !== Registry.get()` trennt beide Fälle sauber. Über `this.kernel.registry` und nicht über das Konstruktor-Argument gehen, damit die Auflösung an genau einer Stelle stattfindet — im Kernel.
  4. **Ein Inline-Kommentar, direkt über der Zuweisung im Konstruktor**, sinngemäß und auf Englisch: die Default-Registry wird von jeder anderen Umgebung in diesem Thread geteilt und trägt alles, was `@ShadowObject` und `shadowObjects.define()` ohne eigene Registry ablegen; geleert werden darf nur eine Registry, die allein zu dieser Umgebung gehört. Kein Rückblick auf den Vorzustand — der Satz muss für jemanden stimmen, der die Datei zum ersten Mal sieht.
  5. **Keine weitere Codeänderung nötig.** Insbesondere braucht es keine Kompensation dafür, dass die Registry einen `destroy()`/Neuaufbau-Zyklus überlebt: `Registry.define()` hängt Konstruktoren über `appendTo` an, das per `indexOf` dedupliziert (`utils/array-utils.ts`), und `appendRoute` sammelt in einem `Set`. Ein erneutes `importModule()` desselben Moduls schreibt damit dieselben Einträge zurück, ohne sie zu verdoppeln.
  6. **Doku.** In `packages/shadow-objects/docs/api-reference.md`:
     - Im Abschnitt `### LocalShadowObjectEnv` die Tabelle **Methods** (bisher `importScript(url)` und `importModule(module)`) um eine dritte Zeile ergänzen:

       ```markdown
       | `destroy()` | Tears the environment down: the Kernel is destroyed and the set of imported modules is forgotten. A `Registry` handed to the constructor is cleared as well — the default registry is shared with every other environment in the thread and stays untouched. |
       ```

     - Im selben Abschnitt unter den vorhandenen Codeblock (`const localEnv = new LocalShadowObjectEnv();`) zwei Zeilen anfügen, die den bislang undokumentierten Konstruktor-Parameter zeigen: einen Kommentar `// or with a registry of its own, isolated from the default one:` und `const scopedEnv = new LocalShadowObjectEnv(new Registry());`. Die Import-Zeile des Blocks bleibt wie sie ist; `Registry` kommt aus einem anderen Einstiegspunkt, also eine zweite Import-Zeile ergänzen: `import { Registry } from '@spearwolf/shadow-objects/shadow-objects.js';` — genau so wie im Kernel-Abschnitt derselben Datei.
     - Im Abschnitt `#### registry.clear()` den einen Satz »Removes all registrations and routes.« um einen zweiten ergänzen:

       ```markdown
       On the default registry that covers everything `@ShadowObject` and `shadowObjects.define()` registered anywhere in the thread.
       ```

     - `README.md`, `docs/guides.md`, `docs/best-practices.md` und `docs/cheat-sheet.md` werden **nicht** angefasst: sie nennen `LocalShadowObjectEnv` nur als Proxy-Variante, weder `destroy()` noch die Registry-Zuständigkeit.
  7. **CHANGELOG.** In `packages/shadow-objects/CHANGELOG.md` als **erstes** Bullet unter `## [Unreleased]` (die Liste steht neueste zuerst) ein Eintrag im Stil der Nachbarn, aber **ohne Finding-ID** — die Nachbareinträge tragen IDs aus einem früheren Audit, für diesen Lauf gilt die Konvention aus dem Plan-Kopf:

     ```markdown
     - **Bugfix (environments):** `LocalShadowObjectEnv.destroy()` emptied the registry it was working with. Unless a registry is handed to the constructor, that is the default one — shared with every other environment in the thread and with every class registered through `@ShadowObject` or `shadowObjects.define()` — so tearing down a single environment stripped the definitions from all of them. `destroy()` now only clears a registry that belongs to that environment alone; passing `Registry.get()` explicitly still counts as the shared one.
     ```

     Der Vorzustand darf hier stehen: das Changelog ist genau der Ort, an dem er hingehört. In Code-Kommentar und `docs/` nicht.
     Kein Eintrag in der Wurzel-`CHANGELOG.md` — weder Build, noch Tooling, noch CI sind betroffen.
  8. Zum Schluss die Verify-Kette aus der nächsten Zeile vollständig durchlaufen lassen. Ein Punkt verdient dabei besondere Aufmerksamkeit: `packages/shadow-objects-testing/test/emit-helper/emit-helper.test.js` definiert die Token `A` und `B` in der Default-Registry und räumt zwischen den Fällen nur den `ComponentContext` auf. Die Analyse sagt, dass beide Fälle grün bleiben (verschiedene Token, und die Shadow-Objects des ersten Falls schreiben in eine eigene Closure-Variable). Wenn nicht, ist das ein echter Folgebefund und gehört als Nebenbefund in dieses Paket, nicht in einen stillen Test-Fix.
- Verify: `cd /home/spw/spaceland/shadow-objects && pnpm lint && pnpm typecheck && pnpm test:ci`
- Commit: `fix: keep the shared default registry alive when a local env is destroyed (ENV-REGISTRY-001)`
**ENV-REGISTRY-001 · high · `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts:63-67`** — LocalShadowObjectEnv.destroy() leert die geteilte Default-Registry

destroy() ruft this.registry.clear(). Wurde dem Konstruktor keine Registry übergeben — der Normalfall —, ist das die globale Default-Registry, in der auch der @ShadowObject-Dekorator und shadowObjects.define() ihre Token ablegen. Eine einzige zerstörte Umgebung nimmt damit jeder anderen Umgebung im selben Thread und jeder dekorator-registrierten Klasse ihre Definitionen. Nachgewiesen: nach dem destroy() einer zweiten, unbeteiligten LocalShadowObjectEnv meldet Registry.get().hasToken() für ein zuvor definiertes Token false. Betrifft direkt den Multi-Env-Anwendungsfall, den das Projekt selbst in packages/shadow-objects-e2e/pages/multi-env.html vorführt.

Empfehlung: Die Registry nur leeren, wenn die Umgebung sie selbst besitzt: im Konstruktor merken, ob eine Registry übergeben wurde (bzw. ob Registry.get(registry) die Default-Instanz zurückgibt), und clear() in destroy() auf den eigenen Fall beschränken. Alternativ: jede LocalShadowObjectEnv bekommt per Default eine eigene Registry, die aus der Default-Registry initialisiert wird.

</details>

### [x] 3. RemoteWorkerEnv meldet Worker-Ausfälle

- Findings: WORKER-001 (high, M)
- Ziel: Stirbt der Worker oder scheitert eine Deserialisierung, erfährt die View-Seite es sofort statt nach 5 bzw. 60 Sekunden Timeout — pendende Promises werden abgelehnt, ein Ereignis geht nach außen.
- Hash: `8ac1e34`
- Ergebnis: 2 Runden · WORKER-001 in allen vier Teilen der Empfehlung behoben · neue öffentliche Oberfläche: `RemoteWorkerEnv.WorkerFailed`, `WorkerFailedError`, `WorkerFailedEvent`, `ShadowEnv.ProxyFailed`, `IShadowObjectEnvProxy.onProxyFailed`, DOM-Ereignis `proxyfailed` auf `<shae-worker>` · 12 Fälle in `RemoteWorkerEnv.spec.ts`, 6 in `ShadowEnv.spec.ts`, neue E2E-Seite `worker-failure` (Suite 298 → 322) · roter Lauf belegt (10/11), Runde-1-Fälle je einzeln rot gesehen
- Klein, offen geblieben: die Erholungs-Zusage »Entities kommen aus der Component Memory zurück« ist in keinem der neuen Fälle geprüft; kein Fall für den `try/catch` um `onProxyFailed` in `RemoteWorkerEnv`; die neue E2E-Seite ist der teuerste Eintrag der Suite (12 Ladevorgänge je Browser, je zwei Worker)
- Nebenbefunde: `RemoteWorkerEnv.ts:147/:165` und `utils/waitForMessageOfType.ts:53` werfen bzw. lehnen mit Stringliteralen statt `Error` ab · `RemoteWorkerEnv.ts:204/:229` laufen nach regulärem `destroy()` in einen `TypeError` auf `this.#worker.postMessage` · ein werfender `WorkerFailed`-Hörer verhindert das Retain, weil eventize erst dispatcht und dann retained (`lib/index.js:562-574`) · `document.createElement('shae-ent')` wirft, bereits als DEFECT-1 in `KNOWN-DEFECTS.md` geführt — alle vorbestehend
- Folgen: —

<details><summary>Detailplan (erledigt)</summary>

- Bereich: `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`, `ShadowEnv.ts`, `utils/waitForMessageOfType.ts`, Tests, `docs/`, Paket-`CHANGELOG.md`
- Modell: stärkste Stufe (Async/Concurrency, neue öffentliche Ereignis-Oberfläche)

- Dateien:
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts` (neu — Regressionstest, zuerst)
  - `packages/shadow-objects/src/utils/waitForMessageOfType.ts` (Abbruch-Kanal)
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.ts` (Fix, neue Ereignis-Oberfläche)
  - `packages/shadow-objects/src/view/IShadowObjectEnvProxy.ts` (Vertrag: ein optionaler Rückruf)
  - `packages/shadow-objects/src/view/ShadowEnv.ts` (Weiterreichen an die Consumer)
  - `packages/shadow-objects/docs/api-reference.md` (Abschnitte `### RemoteWorkerEnv`, `## ShadowEnv` → `### Events`, `## Environment Proxies`, `### Worker Timeout Constants`)
  - `packages/shadow-objects/docs/guides.md` (`## 4. Multi-Environment Setup`, neuer Unterabschnitt am Ende)
  - `packages/shadow-objects/docs/cheat-sheet.md` (Tabelle `| ShadowEnv Event | When |`)
  - `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`)

- Vorgehen:

  1. **Zuerst der rote Test.** Neue Datei `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts` (vitest, happy-dom, läuft über `pnpm -F @spearwolf/shadow-objects test`). Für `RemoteWorkerEnv` gibt es bisher keine Spec. happy-dom bringt **kein** `Worker`-Global mit — nachgemessen —, also muss die Fabrik ersetzt werden. Sie ist ein Default-Export ohne Argumente (`src/create-worker.ts`, eine Zeile: `export default () => new Worker(new URL('./shadow-objects.worker.js', import.meta.url), {type: 'module'})`), `RemoteWorkerEnv.ts:16` importiert sie als `import createWorker from '../create-worker.js';`. Der gangbare Weg ist `vi.mock` auf genau diesen Spezifizierer; `create-worker.bundle.ts` wird nur vom Bundle-Schritt eingeschleust und im Test nie erreicht.

     Kopf der Spec — der Doppelgänger-Worker wird über `vi.hoisted` bereitgestellt, weil die `vi.mock`-Fabrik vor allen Imports läuft:

     ```ts
     import {on} from '@spearwolf/eventize';
     import {beforeEach, describe, expect, it, vi} from 'vitest';
     import {Destroyed, Loaded} from '../constants.js';
     import {RemoteWorkerEnv} from './RemoteWorkerEnv.js';

     const {FakeWorker, workers} = vi.hoisted(() => {
       class FakeWorker {
         listeners = new Map<string, Set<(event: any) => void>>();
         posted: any[] = [];
         terminateCount = 0;

         addEventListener(type: string, listener: (event: any) => void) {
           let listeners = this.listeners.get(type);
           if (!listeners) {
             listeners = new Set();
             this.listeners.set(type, listeners);
           }
           listeners.add(listener);
         }

         removeEventListener(type: string, listener: (event: any) => void) {
           this.listeners.get(type)?.delete(listener);
         }

         postMessage(data: any) {
           this.posted.push(data);
         }

         terminate() {
           this.terminateCount++;
         }

         // --- test-side triggers ---

         dispatch(type: string, event: any) {
           for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
         }

         reply(data: any) {
           this.dispatch('message', {data});
         }

         fail(message = 'boom') {
           this.dispatch('error', {
             type: 'error',
             message,
             filename: 'shadow-objects.worker.js',
             lineno: 1,
             colno: 1,
             error: new Error(message),
           });
         }

         failToDeserialize() {
           this.dispatch('messageerror', {type: 'messageerror', data: undefined});
         }
       }

       const workers: FakeWorker[] = [];
       return {FakeWorker, workers};
     });

     vi.mock('../create-worker.js', () => ({
       default: () => {
         const worker = new FakeWorker();
         workers.push(worker);
         return worker as unknown as Worker;
       },
     }));
     ```

     Der Doppelgänger führt seine Hörer selbst, statt von `EventTarget` zu erben: die Ereignisse sind dann einfache Objekte, und der Test hängt nicht daran, welche Event-Klassen happy-dom mitbringt. `postMessage` nimmt nur das erste Argument — die Transferables interessieren hier nicht.

     Hilfsfunktionen, im Stil von `ShadowEnv.spec.ts` (`describe('destroy')` dort führt dieselbe Konstruktion):

     ```ts
     const withTimeout = <T>(promise: Promise<T>, ms = 250) =>
       Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))]);

     /**
      * Asserts that the promise rejects because the worker failed. A plain
      * `rejects.toThrow()` would swallow the timeout rejection as well, which is
      * exactly the hanging call this guards against.
      */
     const expectWorkerFailedRejection = async (promise: Promise<unknown>) => {
       const reason = await withTimeout(promise).then(
         () => {
           throw new Error('expected the promise to reject, but it resolved');
         },
         (error) => error,
       );
       expect((reason as Error).name).toBe('WorkerFailedError');
     };

     const startEnv = async () => {
       const env = new RemoteWorkerEnv();
       const started = env.start();
       const worker = workers.at(-1)!;
       worker.reply({type: Loaded});
       await started;
       return {env, worker};
     };
     ```

     `startEnv` funktioniert, weil `start()` den `message`-Hörer synchron registriert, bevor es zum ersten Mal wartet: `waitForMessageOfType` baut sein Promise im Konstruktor auf, und der läuft, bevor `await` die Kontrolle abgibt.

     `beforeEach(() => { workers.length = 0; });` — sonst greift `workers.at(-1)` in den vorigen Fall.

     Die Fälle, alle in `describe('worker failure')`:

     - `it('rejects a start() that is still waiting for the worker to load', …)`: `const env = new RemoteWorkerEnv(); const started = env.start();` — dann `workers.at(-1)!.fail('cannot import module');` und `await expectWorkerFailedRejection(started);`. Das ist der schwerste Fall des Findings: unbehoben wartet `start()` die vollen 60 s (`WorkerLoadTimeout`), der 250-ms-Wächter greift, der Fall ist rot.
     - `it('rejects a pending applyChangeTrail instead of waiting for the change trail timeout', …)`: `const {env, worker} = await startEnv(); const pending = env.applyChangeTrail([], true); worker.fail(); await expectWorkerFailedRejection(pending);`. Ein leeres Array ist ein gültiger `ChangeTrailType`, und der Bestätigungszweig hängt nicht an seiner Länge — es wird gepostet und auf `AppliedChangeTrail` gewartet. Unbehoben: 5 s.
     - `it('rejects a pending importScript instead of waiting for the configure timeout', …)`: dieselbe Form mit `env.importScript('./some-module.js')` und `worker.failToDeserialize()`. Unbehoben: 60 s. Deckt den zweiten Ereignistyp ab.
     - `it('rejects a workerLoaded that is still pending when the worker fails', …)`:

       ```ts
       const env = new RemoteWorkerEnv();
       const started = env.start();
       const worker = workers.at(-1)!;
       const pending = env.workerLoaded;

       worker.fail();

       await expectWorkerFailedRejection(pending);
       await expectWorkerFailedRejection(started);
       ```

       Der einzige Fall, der den Abbruch-Zweig des Getters durchläuft — der Fall weiter unten prüft nur den Kurzschluss auf einer bereits ausgefallenen Umgebung. Unbehoben hängt `workerLoaded` für immer, weil das `onceAsync` dieser eventize-Fassung nur auflösen kann. Das `started` wird mit abgewartet, damit seine Ablehnung nicht unbeobachtet bleibt.
     - `it('emits workerFailed with the reason', …)`: `on(env, 'workerFailed', failedSpy)` vor `worker.fail('kaboom')`, danach `expect(failedSpy).toHaveBeenCalledTimes(1)` und auf der Nutzlast `event.env === env`, `event.type === 'error'`, `event.message` enthält `'kaboom'`, `event.reason.name === 'WorkerFailedError'`.
     - `it('replays workerFailed to a listener that subscribes afterwards', …)`: erst `worker.fail()`, dann `on(env, 'workerFailed', spy)`, erwartet einen Aufruf. Sichert das `retain` ab. Kein `await` nötig: `on()` spielt den retained Wert synchron im eigenen Aufruf ab (`subscribeTo` → `EventKeeper.publish`, `lib/index.js:534-539`), und `emit` legt ihn nach dem Dispatch ab (`_emitOne`, `lib/index.js:562-574`) — beim Abonnieren nach `worker.fail()` liegt er also bereit.
     - `it('marks itself destroyed and terminates the worker', …)`: nach `worker.fail()` gilt `env.isDestroyed === true` und `worker.terminateCount === 1`.
     - `it('reports only the first failure', …)`: `worker.fail(); worker.failToDeserialize();` — der Spy hat genau einen Aufruf, `terminateCount` bleibt `1`.
     - `it('rejects calls issued after the failure right away', …)`: nach `worker.fail()` je ein `expectWorkerFailedRejection` auf `env.applyChangeTrail([], true)`, `env.importScript('./late.js')`, `env.start()` und `env.workerLoaded`.
     - `it('stays quiet when the worker reports an error after destroy()', …)`: `on(env, 'workerFailed', spy); env.destroy(); worker.reply({type: Destroyed}); worker.fail();` — der Spy wird nie gerufen. Der Fall ist auch unbehoben grün; er hält fest, dass ein gewollter Abbau kein Ausfall ist. Das `reply({type: Destroyed})` steht dort, damit der 5-Sekunden-Wartetimer aus `destroy()` nicht offen bleibt.
     - `it('pins the event name', …)`: `expect(RemoteWorkerEnv.WorkerFailed).toBe('workerFailed')`.

     **Die erste Fassung der Spec importiert `WorkerFailedError`, `WorkerFailedEvent` und `RemoteWorkerEnv.WorkerFailed` bewusst nicht** — sie prüft `(reason as Error).name` gegen die Zeichenkette `'WorkerFailedError'` und abonniert das Literal `'workerFailed'`. Sonst scheiterte der rote Lauf an einem fehlenden Import statt am Verhalten, und das wäre kein Beleg. Der Fall `pins the event name` ist die eine Ausnahme; er darf im roten Lauf mit `undefined` scheitern.

     Roten Lauf erzeugen und ansehen: `cd packages/shadow-objects && pnpm exec vitest src/view/RemoteWorkerEnv.spec.ts --run`. Erwartung: alle Fälle außer `stays quiet when the worker reports an error after destroy()` schlagen fehl. Trifft das nicht zu, ist der Test falsch aufgebaut — dann den Test korrigieren, nicht weiterarbeiten.

     Ein Sonderfall beim Prüfen: meldet der Lauf `Worker is not defined` oder `createWorker is not a function`, hat `vi.mock` nicht gegriffen und die echte Fabrik lief. Dann den Spezifizierer richten — er muss zeichengleich der sein, den `RemoteWorkerEnv.ts` verwendet (`'../create-worker.js'`) — und **nicht** die Quelle umbauen, um sie testbar zu machen.

  2. **Der Abbruch-Kanal in `packages/shadow-objects/src/utils/waitForMessageOfType.ts`.** Die Funktion ist ein einzelner Promise-Konstruktor mit `timeoutId`, einem `message`-Hörer und einem `cleanup`, das beide löst. Sie ist intern — `src/index.ts` reicht aus `utils/` nur `toNamespace.js` durch —, also ändert sich hier keine öffentliche Oberfläche. Ein fünfter, optionaler Parameter hängt die pendenden Promises an ein `AbortSignal`:

     ```ts
     export const waitForMessageOfType = (
       worker: Worker,
       type: string,
       timeout = 1000,
       guard?: (data: any) => boolean,
       signal?: AbortSignal,
     ) =>
     ```

     Im Rumpf, in dieser Reihenfolge:

     - Ganz oben, vor allem anderen: `if (signal?.aborted) { reject(signal.reason); return; }`. Damit lehnt ein Aufruf, der nach dem Ausfall gestellt wird, sofort ab, ohne Hörer und ohne Timer.
     - `cleanup` bekommt eine dritte Zeile: `signal?.removeEventListener('abort', onAbort);`
     - Direkt unter `cleanup` eine **Funktionsdeklaration** (nicht `const`), damit `cleanup` sie referenzieren darf, ohne dass Biome eine Verwendung vor der Deklaration sieht:

       ```ts
       function onAbort() {
         cleanup();
         reject(signal!.reason);
       }
       ```

       Das `!` ist zulässig: `onAbort` ist nur erreichbar, wenn ein Signal übergeben wurde, und `signal.reason` ist beim Abbruch laut Spezifikation immer besetzt. Paket 4 fasst diese Datei unter `--strictNullChecks` an und sieht diese Stelle wieder.
     - Vor `worker.addEventListener('message', listener);` die Registrierung: `signal?.addEventListener('abort', onAbort, {once: true});`

     Der bestehende Timeout-Zweig, der Hörer und das `guard`-Verhalten bleiben unverändert. Die Timeouts sind damit nicht mehr der einzige Ausweg, sondern der letzte.

     Den Doc-Kommentar über der Funktion um einen Satz ergänzen, sinngemäß: ein übergebenes `signal` lehnt das Promise im Moment des Abbruchs mit dem Abbruchgrund ab, damit ein Aufrufer nicht auf eine Antwort wartet, die nicht mehr kommen kann.

  3. **`packages/shadow-objects/src/view/RemoteWorkerEnv.ts` — der Fehlertyp und die Nutzlast.** Beide öffentlich, beide über `export * from './view/RemoteWorkerEnv.js'` in `src/index.ts` schon abgedeckt; an `index.ts` ändert sich nichts. Oberhalb der Klasse, nach `removeTransferables`:

     ```ts
     /**
      * The reason every pending and every later worker request is rejected with
      * once the worker has failed.
      */
     export class WorkerFailedError extends Error {
       /** `'error'` when the worker itself threw, `'messageerror'` when it sent something that could not be deserialized. */
       readonly type: 'error' | 'messageerror';

       constructor(type: 'error' | 'messageerror', message: string, options?: ErrorOptions) {
         super(message, options);
         this.name = 'WorkerFailedError';
         this.type = type;
       }
     }

     /** What {@link RemoteWorkerEnv.WorkerFailed} carries. */
     export interface WorkerFailedEvent {
       /** the environment whose worker failed */
       env: RemoteWorkerEnv;
       /** what the worker reported */
       type: 'error' | 'messageerror';
       /** a readable description of the failure */
       message: string;
       /** the error every pending and every later request is rejected with */
       reason: WorkerFailedError;
       /** the worker event the failure was read from */
       event: ErrorEvent | MessageEvent;
     }
     ```

     `ShadowEnvDestroyedError` in `ShadowEnv.ts` ist das Vorbild für Form und Doc-Kommentar. `ErrorOptions` und `AbortController` sind von `target: ES2022` und `lib: ["ES2022", "DOM", …]` gedeckt.

  4. **`RemoteWorkerEnv` — Ausfallzustand und Ereignis.** Die Eingriffe in der Klasse, von oben nach unten:

     - Zweite Konstante neben der bestehenden: `static WorkerFailed = 'workerFailed';`
     - Neues Feld unter `#changeTrailSerial`:

       ```ts
       /**
        * Aborted exactly once, with the {@link WorkerFailedError} that describes the failure.
        * It settles every request already waiting for a reply and turns away every later one.
        */
       readonly #workerFailure = new AbortController();
       ```

       Ein einziger `AbortController` trägt den gesamten Ausfallzustand: `signal.aborted` ist die Frage »ist diese Umgebung hin?«, `signal.reason` die Antwort »woran«. Kein zweites Feld daneben, das damit aus dem Tritt geraten könnte.
     - Im Konstruktor eine zweite Zeile: `retain(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerFailed);` — mit einem Inline-Kommentar, dass ein Consumer, der sich erst nach dem Ausfall anmeldet, ihn trotzdem erfährt.
     - **Die Import-Zeile aus `@spearwolf/eventize` wechselt von `onceAsync` auf `once`**: `import {emit, once, retain} from '@spearwolf/eventize';`. `onceAsync` verschwindet aus der Datei, und `noUnusedLocals: true` würde ein stehengelassenes Import sofort melden.
     - Der Getter `workerLoaded` wird ausgeschrieben. Er muss vier Dinge leisten: im Erfolgsfall wie bisher mit der Umgebung auflösen, bei einem Ausfall mit dem `WorkerFailedError` ablehnen, sofort ablehnen, wenn die Umgebung schon ausgefallen ist, und keinen Hörer hinterlassen, wenn der eine Zweig greift und der andere damit gegenstandslos wird.

       ```ts
       /**
        * Resolves once the worker is up.
        *
        * @throws {WorkerFailedError} if the worker fails before or after that happens
        */
       get workerLoaded(): Promise<RemoteWorkerEnv> {
         const {signal} = this.#workerFailure;
         if (signal.aborted) return Promise.reject(signal.reason);

         return new Promise<RemoteWorkerEnv>((resolve, reject) => {
           let unsubscribeLoaded: (() => void) | undefined;
           let settled = false;

           const onFailure = () => {
             if (settled) return;
             settled = true;
             unsubscribeLoaded?.();
             reject(signal.reason);
           };

           unsubscribeLoaded = once(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerLoaded, (env: RemoteWorkerEnv) => {
             if (settled) return;
             settled = true;
             signal.removeEventListener('abort', onFailure);
             resolve(env);
           });

           // a retained WorkerLoaded is replayed inside once(), before it returns —
           // then there is nothing left to wait for and no abort listener to attach
           if (settled) return;

           signal.addEventListener('abort', onFailure, {once: true});
         });
       }
       ```

       An der installierten Quelle nachgeprüft, nicht angenommen — `node_modules/.pnpm/@spearwolf+eventize@5.0.0/node_modules/@spearwolf/eventize/lib/`:

       - `onceAsync` hat in dieser Fassung genau zwei Parameter, kein Options-Objekt, und löst nur auf: `lib/index.js:641-645` (`new Promise((resolve) => { once(obj, eventNames, resolve); })`), `lib/index.d.ts:203-204`. Es kann weder abbrechen noch ablehnen und trägt diesen Getter deshalb nicht. Ein Sprung auf eine neuere eventize-Fassung wäre eine eigene Scope-Entscheidung und gehört nicht in dieses Paket.
       - `once()` gibt eine Unsubscribe-Funktion zurück (`lib/index.js:621-640`, Rückgabetyp `UnsubscribeFunc` in `lib/index.d.ts:185-202`). Sie ist mehrfach aufrufbar — ein `unsubscribeCalled`-Wächter in `lib/index.js:626-632` — und meldet über `makeUnsubscribe` → `off(host, listeners)` (`lib/index.js:555-561`) die Hörer-Objekte ab, nicht den Ereignisnamen. Der retained Zustand von `WorkerLoaded` bleibt davon unberührt; ein `off(env, RemoteWorkerEnv.WorkerLoaded)` hätte ihn mitgenommen und ist hier ausdrücklich nicht gemeint.
       - `once()` spielt ein retained Ereignis **synchron im eigenen Aufruf** ab: `subscribeToDeferred` sammelt, `publishRetained()` feuert am Ende von `once()`, vor dem `return` (`lib/index.js:624-639`). Genau daran zerbräche die naheliegende Fassung mit zwei `once`-Hörern, die einander abmelden — der erste Rückruf liefe, während die Unsubscribe-Funktion des zweiten noch in der temporalen Totzone liegt. Deshalb `settled` als Wächter, `unsubscribeLoaded` als `let` mit `?.`, und die Prüfung `if (settled) return;` **nach** dem `once()`-Aufruf.
       - Der Ausfallzweig hängt am `AbortSignal`, nicht an einem zweiten eventize-Hörer. Das ist derselbe Kanal, über den `waitForMessageOfType` bedient wird, und er beantwortet Punkt (c) von selbst: `signal.aborted` ist die Frage, `signal.reason` die Antwort.

       Beide Wege räumen auf: greift der Ausfall, meldet `onFailure` den `once`-Hörer ab; greift der Erfolg, nimmt der `once`-Hörer sich laut `callAfterApply` (`lib/index.js:206-233`) selbst aus dem Store, und der Abbruch-Hörer wird zusätzlich per `removeEventListener` gelöst — er ist ohnehin mit `{once: true}` registriert. In keinem Fall bleibt etwas an der Umgebung oder am Signal hängen.

       `packages/shadow-objects-e2e/src/shae-worker.js:66` wartet auf `shadowEnv0.envProxy.workerLoaded`. Der Erfolgsfall läuft unverändert über `once` auf `WorkerLoaded` und löst mit derselben Umgebung auf wie bisher — auch dann, wenn das Ereignis längst gefallen ist, denn `retain` im Konstruktor bleibt und der Replay geschieht im `once()`-Aufruf.
     - `start()`, drei Eingriffe:
       - Als erste Anweisung: `const {signal} = this.#workerFailure; if (signal.aborted) throw signal.reason;` — eine ausgefallene Umgebung startet keinen zweiten Worker.
       - Unmittelbar nach `const worker = (this.#worker = createWorker());`, **vor** `configureConsoleLogger` und vor dem ersten `await`:

         ```ts
         // registered before the load handshake begins: a worker that dies while it is
         // still coming up must not leave the caller waiting for the load timeout
         worker.addEventListener('error', this.onWorkerError.bind(this));
         worker.addEventListener('messageerror', this.onWorkerMessageError.bind(this));
         ```

         Das ist die eigentliche Fundstelle des Findings. Der `message`-Hörer wird weiterhin erst nach dem Handshake registriert; daran ändert sich nichts.
       - Der `await` bekommt das Signal: `await waitForMessageOfType(worker, Loaded, WorkerLoadTimeout, undefined, signal);`
       - Im `catch` eine Zeile nach `this.#worker = undefined;`: `worker.terminate();` — mit Inline-Kommentar: die Referenz ist weg, niemand kann diesen Worker noch erreichen; ihn weiterlaufen zu lassen hielte einen Thread für eine Umgebung offen, die nie gestartet ist. Kam der Fehler aus dem Ausfallpfad, ist der Worker dort schon beendet worden; ein zweites `terminate()` ist folgenlos. Deshalb prüft der Fall `rejects a start() that is still waiting for the worker to load` auch nur die Ablehnung und nicht `terminateCount`.
     - `applyChangeTrail`, zwei Eingriffe:
       - Als erste Anweisung: `const {signal} = this.#workerFailure; if (signal.aborted) return Promise.reject(signal.reason);`. Die Prüfung muss vor `this.#worker.postMessage` stehen: nach einem Ausfall ist `#worker` nicht mehr gesetzt, und ein `TypeError` aus einer Methode, die ein Promise verspricht, ist die falsche Antwort auf »der Worker ist tot«.
       - Der Aufruf im Bestätigungszweig bekommt das Signal als fünftes Argument, hinter dem vorhandenen `guard`.
     - `importScript`, dieselben zwei Eingriffe in derselben Reihenfolge.
     - Zwei schmale Hörer-Methoden und der eine Ausfallpfad, unten bei `onMessageFromWorker` (die Datei schreibt Methoden mit `private`, nicht mit `#` — dabei bleiben):

       ```ts
       private onWorkerError(event: ErrorEvent) {
         this.handleWorkerFailure('error', event, event.message || 'the worker reported an error');
       }

       private onWorkerMessageError(event: MessageEvent) {
         this.handleWorkerFailure('messageerror', event, 'the worker sent a message that could not be deserialized');
       }

       private handleWorkerFailure(type: 'error' | 'messageerror', event: ErrorEvent | MessageEvent, message: string): void {
         // a deliberate teardown, or a failure that was already reported: the first one wins
         if (this.#isDestroyed) return;

         this.#isDestroyed = true;

         const reason = new WorkerFailedError(type, message, {
           cause: type === 'error' ? ((event as ErrorEvent).error ?? event) : event,
         });

         this.logger.error(message, event);

         const worker = this.#worker;
         this.#worker = undefined;

         // settle everyone waiting for a reply before the worker goes away — it can no longer arrive
         this.#workerFailure.abort(reason);

         worker?.terminate();

         // the ShadowEnv is told first: a listener of the public event that throws
         // aborts the rest of that dispatch, and the framework hop must not depend on it
         (this as IShadowObjectEnvProxy).onProxyFailed?.(reason);

         emit(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerFailed, {
           env: this,
           type,
           message,
           reason,
           event,
         } as WorkerFailedEvent);
       }
       ```

       Die Reihenfolge im Rumpf ist Absicht und trägt: `#isDestroyed` zuerst, damit der Wächter gegen den zweiten Ausfall greift, bevor irgendein Hörer laufen kann; `abort` vor `emit`, damit ein `WorkerFailed`-Hörer, der sofort `applyChangeTrail` ruft, die saubere Ablehnung bekommt statt eines `TypeError`; `onProxyFailed` vor `emit`, weil ein werfender Hörer den Rest des Dispatches abbricht — `_emitOne` reicht `store.forEach` ohne `try`/`catch` durch (`lib/index.js:562-574`, `EventListener.apply` in `lib/index.js:206-233`), und die Meldung an die `ShadowEnv` darf nicht davon abhängen, wie sich fremder Consumer-Code verhält.

       Der Worker wird beendet, nicht bloß gemeldet. Ein unbehandelter Fehler beendet einen dedizierten Worker nicht von sich aus, aber die View-Seite kann nicht wissen, ob der Zustand im `WorkerRuntime` danach noch zusammenpasst; `isDestroyed === true` bei weiterlaufendem Worker wäre eine Lüge über den eigenen Zustand.

     - `destroy()` bleibt unverändert. Es bricht den Controller **nicht** ab: der eigene `Destroyed`-Wartelauf soll seinen Timeout behalten, und die Ablehnungsgründe der beiden Fälle sollen nicht durcheinandergehen. Pendende Aufrufe eines Consumers werden beim gewollten Abbau schon eine Ebene höher von `ShadowEnv` mit `ShadowEnvDestroyedError` abgeräumt.

  5. **Der Vertrag, `packages/shadow-objects/src/view/IShadowObjectEnvProxy.ts`.** Er muss mitgezogen werden, denn `ShadowEnv` hält einen `IShadowObjectEnvProxy` und keinen `RemoteWorkerEnv` — an eventize-Ereignisse einer bestimmten Implementierung darf es sich nicht hängen. Das Haus hat für genau diese Richtung bereits ein Muster: `onMessageToView`, ein optionaler Rückruf, den `ShadowEnv` im `envProxy`-Setter setzt. Der zweite kommt daneben:

     ```ts
     /**
      * Called when the proxy has irrecoverably lost the environment it stands for.
      * {@link ShadowEnv} installs it on every proxy it is given; an implementation
      * that cannot fail simply never calls it.
      */
     onProxyFailed?: (reason: unknown) => any;
     ```

     `reason: unknown` und nicht `WorkerFailedError`: der Vertrag kennt keine Worker. `LocalShadowObjectEnv` ruft ihn nie und braucht keine Zeile.

  6. **`packages/shadow-objects/src/view/ShadowEnv.ts` — Weiterreichen.** `ContextLost` allein genügt nicht: es sagt *dass*, nicht *warum*, und die Diagnose ist der ganze Punkt des Findings. Also ein eigenes Ereignis neben den drei vorhandenen:

     - `static ProxyFailed = 'proxyFailed';` unter `static ContextCreated`.
     - Im `envProxy`-Setter, im vorhandenen `if (this.#shaObjEnvProxy) { … }`-Block, direkt unter der `onMessageToView`-Zuweisung: `this.#shaObjEnvProxy.onProxyFailed = this.#onProxyFailed.bind(this);`
     - Eine neue private Methode neben `#onMessageToView`:

       ```ts
       #onProxyFailed(reason: unknown) {
         if (this.#isDestroyed) return;

         this.logger.error('the environment proxy failed', reason);

         // the reason before the consequence: ContextLost follows from dropping proxyReady
         emit(this as ShadowEnv, ShadowEnv.ProxyFailed, reason, this as ShadowEnv);

         this.proxyReady = false;
       }
       ```

       Der `#isDestroyed`-Wächter ist keine Zierde: `destroy()` friert die Instanz ein und zerstört ihre Signale, und ein Proxy kann seinen Ausfall danach noch melden.
     - Kein `retain` auf `ProxyFailed`. `ContextCreated` wird retained, weil ein spät hinzukommender Consumer wissen muss, dass die Umgebung schon läuft; für den Ausfall beantwortet `isReady` dieselbe Frage ohne stehendes Ereignis.
     - Sonst nichts. Insbesondere wird der Proxy **nicht** zerstört und die Referenz nicht gelöscht: `env.envProxy = new RemoteWorkerEnv()` ist der Erholungsweg, und der vorhandene Setter erledigt ihn schon vollständig — er zerstört den alten Proxy (auf einem ausgefallenen `RemoteWorkerEnv` ein No-op, weil `#worker` weg ist), startet den neuen, und der Effekt im Konstruktor ruft beim Bereitwerden `view.reCreateChanges()`, baut die Entities also aus dem `ComponentMemory` neu auf.

  7. **Doku.** Drei Dateien mit benannten Abschnitten, dazu die Liste dessen, was bewusst unangetastet bleibt:

     - `docs/api-reference.md`, Abschnitt `### RemoteWorkerEnv`:
       - In der Tabelle **Properties** die Zeile `workerLoaded` neu fassen: »Promise that resolves once the worker is ready and rejects with a `WorkerFailedError` when it fails.« Die Zeile `isDestroyed` um »Also `true` once the worker has failed.« ergänzen.
       - Unter der Tabelle **Methods** einen neuen Block **Events** einziehen, mit einer Tabelle für `RemoteWorkerEnv.WorkerLoaded` (retained, erhält die Umgebung) und `RemoteWorkerEnv.WorkerFailed` (retained, erhält ein `WorkerFailedEvent`), einer Feldtabelle für `WorkerFailedEvent` (`env`, `type`, `message`, `reason`, `event`) und einem Absatz, der die Folge benennt: ein Ausfall ist für diese Umgebung endgültig — der Worker wird beendet, `isDestroyed` wird `true`, und alles, was noch auf eine Antwort wartet, sowie jedes spätere `applyChangeTrail()`, `importScript()`, `start()` und `workerLoaded` wird sofort mit dem `WorkerFailedError` abgelehnt, statt in seinen Timeout zu laufen. Dazu ein kurzes `on(remoteEnv, RemoteWorkerEnv.WorkerFailed, …)`-Beispiel im Stil der übrigen Codeblöcke der Datei.
       - Abschnitt `## ShadowEnv` → `### Events`: eine vierte Tabellenzeile `ShadowEnv.ProxyFailed` — gefeuert, wenn der Proxy die Shadow-Umgebung verliert, für die er steht; erhält den Grund und die `ShadowEnv`; `ContextLost` folgt, weil die Umgebung aufhört, bereit zu sein. Unter dem vorhandenen Beispielblock ein zweiter Absatz mit dem Erholungsmuster (`env.envProxy = new RemoteWorkerEnv()`) und dem Hinweis, dass die View im neuen Proxy aus dem Component Memory neu aufgebaut wird.
       - Abschnitt `## Environment Proxies`, Einleitungsabsatz: ein Satz, dass `ShadowEnv` zwei Rückrufe auf dem übergebenen Proxy setzt — `onMessageToView` für Nachrichten aus der Shadow-Umgebung, `onProxyFailed` für den Verlust derselben — und eine eigene Implementierung nur die bedienen muss, die sie bedienen kann.
       - Abschnitt `### Worker Timeout Constants`, ein Satz unter der Tabelle: die Timeouts sind die letzte Verteidigungslinie, nicht die erste; ein Worker, der stirbt oder Unlesbares schickt, lehnt die wartenden Aufrufe sofort ab.
     - `docs/guides.md`, `## 4. Multi-Environment Setup`: ein neuer `###`-Unterabschnitt **When the Worker Dies**, direkt hinter `### Waiting for the Environment to be Ready` und vor `## 5. Framework Integration Note`. Inhalt: woran ein Worker stirbt (unbehandelter Fehler in einem Shadow-Objects-Modul, ein Modul, das sich nicht importieren lässt, eine Nachricht, die sich nicht deserialisieren lässt), ein `on(env, ShadowEnv.ProxyFailed, …)`-Beispiel mit dem Ersetzen des Proxys, und der Schlusssatz, dass der Ausfall auch ohne Hörer protokolliert wird und `env.isReady` auf `false` fällt — nur eben still.
     - `docs/cheat-sheet.md`, Tabelle `| ShadowEnv Event | When |` (unter `## ShadowEnv Quick Setup`): eine vierte Zeile `| ShadowEnv.ProxyFailed | The proxy lost its Shadow Environment; the reason comes with the event |`. Sonst nichts in dieser Datei.
     - **Ausdrücklich nicht angefasst**: `README.md` führt weder Ereignisse noch Fehlerklassen — die einzige Erwähnung von `RemoteWorkerEnv` ist der Einleitungssatz über die beiden Proxy-Varianten, und der bleibt richtig; ein Absatz über Worker-Ausfälle in einer Datei, die nicht einmal `ShadowEnv.ContextCreated` nennt, stünde schief. `docs/getting-started.md` und `docs/concepts.md` führen an den Einstieg heran und kennen die Proxy-Ebene nicht in dieser Tiefe. `docs/best-practices.md` §6 ist eine Auswahlhilfe zwischen lokal und remote, keine Fehlerbehandlung; das Muster steht in `guides.md`. `docs/README.md` ist ein Inhaltsverzeichnis ohne neue Datei zum Verzeichnen.

  8. **CHANGELOG.** In `packages/shadow-objects/CHANGELOG.md` als **erste** Einträge unter `## [Unreleased]` (die Liste steht neueste zuerst), ohne Finding-ID, im Ton der Nachbarn. Vier Bullets in dieser Reihenfolge:

     - **Bugfix (worker environments)**: `RemoteWorkerEnv` hörte nur auf `message`; ein Worker, der an einem unbehandelten Fehler starb oder etwas schickte, was der Structured-Clone-Algorithmus nicht zurücklesen konnte, blieb unbemerkt — `applyChangeTrail()` saß die vollen 5 s ab, `importScript()` und `start()` die vollen 60 s, und kein Consumer hatte einen Weg zu erfahren, dass die Umgebung weg war. `error` und `messageerror` werden jetzt abonniert, bevor der Load-Handshake beginnt; ein Ausfall beendet den Worker, setzt `isDestroyed` und lehnt alles Wartende und alles Spätere mit einem neuen `WorkerFailedError` ab.
     - **New (public API)**: `RemoteWorkerEnv.WorkerFailed` (retained, Nutzlast `WorkerFailedEvent` mit `env`, `type`, `message`, `reason`, `event`) und `WorkerFailedError`. `workerLoaded` lehnt bei einem Ausfall ab, statt für immer zu hängen.
     - **New (public API)**: `ShadowEnv.ProxyFailed` mit dem Grund als Nutzlast; `ContextLost` folgt; ein neuer `envProxy` ist der Erholungsweg und baut die View aus dem Component Memory neu auf. `IShadowObjectEnvProxy` hat den optionalen Rückruf `onProxyFailed`, den `ShadowEnv` genauso setzt wie `onMessageToView`.
     - **Behavior (worker environments)**: ein gescheitertes `start()` beendet den Worker, den es erzeugt hat, statt nur die Referenz fallenzulassen.

     Der Rückblick auf den Vorzustand gehört hier hin und **nur** hierhin — nicht in `docs/`, nicht in die Code-Kommentare.
     Kein Eintrag in der Wurzel-`CHANGELOG.md`: weder Build noch Tooling noch CI sind betroffen. `docs/superpowers/specs/dist-snapshot.txt` und `dist-package.json.snapshot` bleiben ebenfalls gültig — es entsteht kein neues Modul, alle neuen Symbole liegen in bestehenden Dateien.

  9. **Zum Schluss die Verify-Kette vollständig.** Die E2E-Suite gehört diesmal dazu: sie ist die einzige Ebene, die `RemoteWorkerEnv` über echtes `postMessage` und in der Bundle-Variante mit Inline-Worker prüft. Sie muss über turbo laufen, nicht über `pnpm -F` direkt — der turbo-Task `test` trägt `dependsOn: ["^build", "build"]` und baut `dist/` erst, das Vite dann auflöst (Befund aus Paket 1). Zwei Punkte verdienen dabei Aufmerksamkeit: erstens `packages/shadow-objects-e2e/src/shae-worker.js:66`, das `shadowEnv0.envProxy.workerLoaded` erwartet — der Getter gibt jetzt ein Promise mit Abbruch-Signal zurück, der Erfolgsfall muss unverändert auflösen; zweitens `packages/shadow-objects-testing`, dessen Browser-Suite `<shae-worker>` in echtem Chromium fährt. Wird dort etwas rot, ist das ein echter Folgebefund und gehört als Nebenbefund in dieses Paket, nicht in einen stillen Test-Fix.

- Verify: `cd /home/spw/spaceland/shadow-objects && pnpm lint && pnpm typecheck && pnpm test:ci && pnpm exec turbo run test --filter=shadow-objects-e2e --force`
- Commit: `fix: report worker failures instead of running into timeouts (WORKER-001)`
**WORKER-001 · high · `packages/shadow-objects/src/view/RemoteWorkerEnv.ts:87`** — RemoteWorkerEnv registriert keine error/messageerror-Handler

Nach dem Start wird ausschließlich ein 'message'-Listener registriert. Stirbt der Worker an einem Laufzeitfehler oder scheitert die Deserialisierung einer Nachricht (messageerror), erfährt die View-Seite nichts davon: applyChangeTrail läuft in den 5-Sekunden-Timeout, importScript in den 60-Sekunden-Timeout, und die Anwendung hängt ohne Diagnose. Es gibt keinen Pfad, über den ein Consumer einen Worker-Ausfall überhaupt bemerken könnte.

Empfehlung: 'error' und 'messageerror' abonnieren, den Fehler protokollieren, isDestroyed setzen und ein Ereignis nach außen geben (z. B. RemoteWorkerEnv.WorkerFailed), das ShadowEnv an seine Consumer weiterreicht. Pendende waitForMessageOfType-Promises sollten dabei sofort abgelehnt werden, statt in den Timeout zu laufen.

</details>

### [x] 4. strictNullChecks: utils, worker, Registry, SignalsPath

- Findings: STRICT-NULL (high, L) — Teil 1 von 3
- Ziel: Die 10 Nullreferenz-Typfehler in den kleinen Modulen sind behoben.
- Hash: `81bb4f0`
- Ergebnis: 1 Runde · Zählstand 60 → 50, Sollwert erreicht, Restverteilung unverschoben (Paket 5: 24, Paket 6: 26) · 9 reine Typkorrekturen, 1 echter Laufzeitdefekt (`ConsoleLogger.ts:29` — ein Style-Schlüssel im `localStorage` riss den Konstruktor des ersten Loggers mit; roter Lauf `TypeError: as is not a function` belegt, neue `ConsoleLogger.spec.ts`) · Reviewer: 5 Befunde, alle `klein`, keine Runde ausgelöst
- Klein, offen geblieben: der geänderte Ablehnungswert in `waitForMessageOfType.ts:54` (`reject(error)` statt `error.toString()`) hat heute keine Wirkung, weil die Wurfseite Strings liefert — **Paket 5 stellt genau diese Wurfseite auf `Error` um und muss den CHANGELOG-Eintrag tragen** · `Registry.ts` liest sich jetzt uneinheitlich, weil der `truthyPropRoutes`-Zweig weiter `has()` + `get()!` benutzt · `MessageRouter.ts:93` macht den bewusst liegengelassenen fehlenden `return` im `catch` eine Nuance schlechter erreichbar
- Nebenbefunde: `MessageRouter.route()` (`:42`, `:56`) und `WorkerRuntime.onmessage` (`:9`, `:13`) dereferenzieren `event.data` ungeprüft — weil der Typ `any` ist, sieht `strictNullChecks` das nie. Ein `postMessage(null)` reißt den Worker mit einem ungefangenen `TypeError` auf, und seit Paket 3 eskaliert das über den `error`-Hörer zum `WorkerFailedError` und zerlegt die ganze Umgebung. Vorbestehend, aber mit gewachsenem Blast Radius · `MessageRouter.ts:87-96` fehlendes `return` im `catch`, vorbestehend
- Folgen: —

<details><summary>Detailplan</summary>

- Messung, Zug 0, Stand `8ac1e34`: `cd packages/shadow-objects && npx tsc -p tsconfig.json --noEmit --strictNullChecks 2>&1 | grep -c "error TS"` liefert **60**. Der Ausgangswert aus dem Plan-Kopf gilt unverändert; Paket 3 hat keinen Fehler hinzugefügt und keinen weggenommen. Verteilung über alle 15 Dateien:

  | Datei | Fehler | Paket |
  |---|---|---|
  | `src/in-the-dark/Kernel.ts` | 24 | 6 |
  | `src/view/ComponentContext.ts` | 7 | 5 |
  | `src/view/RemoteWorkerEnv.ts` | 5 | 5 |
  | `src/elements/ShaeEntElement.ts` | 5 | 5 |
  | `src/view/ShadowEnv.ts` | 4 | 5 |
  | `src/in-the-dark/Registry.ts` | 3 | **4** |
  | `src/worker/MessageRouter.ts` | 2 | **4** |
  | `src/in-the-dark/Kernel.spec.ts` | 2 | 6 |
  | `src/elements/ShaeWorkerElement.ts` | 2 | 5 |
  | `src/view/LocalShadowObjectEnv.ts` | 1 | 5 |
  | `src/utils/waitForMessageOfType.ts` | 1 | **4** |
  | `src/utils/FrameLoop.ts` | 1 | **4** |
  | `src/utils/ConsoleLogger.ts` | 1 | **4** |
  | `src/utils/attr-utils.ts` | 1 | **4** |
  | `src/in-the-dark/SignalsPath.ts` | 1 | **4** |

  Auf dieses Teilpaket entfallen **10**, nicht 9. Die Verteilung hat sich nicht verschoben: die Grobplan-Summe 9 + 24 + 26 ergibt 59 und nicht 60, der Wert für Paket 4 war um eins zu niedrig. Belegt an der Quelle: `git show c758d2e:packages/shadow-objects/src/utils/waitForMessageOfType.ts` trägt das `reject(error.toString())` bereits in Zeile 31, also vor Beginn des Laufs. `RemoteWorkerEnv.spec.ts` aus Paket 3 steht im Typecheck-Baum und erzeugt null Fehler. **Sollwert nach diesem Paket: 50.**

- Sortenlehre, gilt für jede der zehn Stellen: (a) echter Defekt → Defekt beheben; (b) Typ zu weit, Invariante nachweisbar → verengen oder Guard; (c) Invariante hält, ist aber nicht ausdrückbar → `!` oder Cast **mit** Kommentar, der die Invariante benennt. Die Einordnung steht unten je Stelle dabei. Fall (c) kommt genau zweimal vor.

- Die Empfehlung des Findings ist zur Hälfte überholt: das `tsconfig.strict.json` als Ratsche ist durch den Beschluss »STRICT-NULL« im Plan-Kopf ersetzt. Die andere Hälfte, von den kleinen Modulen zu den großen und `Kernel.ts` zuletzt, ist genau der Schnitt der Pakete 4 bis 6.

- **`tsconfig.json` wird in diesem Paket nicht angefasst.** Das globale Flag ist Paket 6. Der Zwischenstand wird ausschließlich über das Zählkommando gemessen.

- Dateien:
  - `packages/shadow-objects/src/utils/ConsoleLogger.spec.ts` (neu — roter Test, zuerst)
  - `packages/shadow-objects/src/utils/ConsoleLogger.ts` (Fall a)
  - `packages/shadow-objects/src/utils/FrameLoop.ts` (Fall b)
  - `packages/shadow-objects/src/utils/attr-utils.ts` (Fall b)
  - `packages/shadow-objects/src/utils/waitForMessageOfType.ts` (Fall b + ein Kommentar zu einem bestehenden Fall c)
  - `packages/shadow-objects/src/in-the-dark/Registry.ts` (dreimal Fall b)
  - `packages/shadow-objects/src/in-the-dark/SignalsPath.ts` (Fall c)
  - `packages/shadow-objects/src/worker/MessageRouter.ts` (zweimal Fall b)
  - `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`, ein Bullet)

- Vorgehen:

  1. **Zuerst der rote Test, und zwar nur für die eine Stelle, die einen Defekt trägt.** Die übrigen neun sind reine Typkorrekturen und brauchen keinen. Neue Datei `packages/shadow-objects/src/utils/ConsoleLogger.spec.ts` (vitest, happy-dom, läuft über `pnpm -F @spearwolf/shadow-objects test`). Für `ConsoleLogger` gibt es bisher keine Spec.

     Der Defekt: `loadConfigValue<T>(key, as: (val: string) => T = undefined, defaultValue: T)` (`ConsoleLogger.ts:29`) ruft in Zeile 33 `as(value)`, sobald in der Konfiguration ein Wert steht. Der Aufruf in `loadConfig()` für die vier Styles übergibt `as` ausdrücklich als `undefined` (`ConsoleLogger.ts:114`) — dort ist der gespeicherte String selbst der Wert und keine Umwandlung nötig. Liegt für einen Style-Schlüssel etwas im `localStorage`, läuft `undefined(value)` in einen `TypeError` und reißt `loadConfig()` mit; das geschieht im Konstruktor des ersten Loggers, also beim ersten Zugriff auf die Bibliothek. Erreichbar ist das über genau den Weg, für den diese Klasse gebaut ist: einen Eintrag in den DevTools setzen.

     ```ts
     import {afterEach, describe, expect, it} from 'vitest';
     import {ConsoleLogger} from './ConsoleLogger.js';

     describe('ConsoleLogger', () => {
       afterEach(() => {
         localStorage.removeItem('ConsoleLogger.styles.debug');
       });

       it('reads a style from storage as-is', () => {
         const before = ConsoleLogger.sharedStyles.debug;
         localStorage.setItem('ConsoleLogger.styles.debug', 'color: hotpink');
         try {
           ConsoleLogger.loadConfig();
           expect(ConsoleLogger.sharedStyles.debug).toBe('color: hotpink');
         } finally {
           ConsoleLogger.sharedStyles.debug = before;
         }
       });
     });
     ```

     `loadConfig()` ist eine öffentliche statische Methode und mehrfach aufrufbar, der Test braucht also keinen Zugriff auf Modulinterna. Das `finally` und das `afterEach` sind Pflicht: `sharedConfig` ist statisch und leckt sonst in jede Spec-Datei, die danach einen Logger baut.

     Roten Lauf erzeugen und ansehen: `cd packages/shadow-objects && pnpm exec vitest src/utils/ConsoleLogger.spec.ts --run`. Erwartung: `TypeError: as is not a function`. **Ist der Fall stattdessen grün, nicht weiterarbeiten**: dann war `HAS_LOCAL_STORAGE` beim Laden des Moduls falsch, der Lauf hat den `globalThis[CONSOLE_LOGGER_STORAGE]`-Zweig genommen, und in dem wird `loadConfigValue` gar nicht gerufen. In dem Fall zuerst klären, warum `vitest.setup.ts` das happy-dom-`localStorage` nicht bereitgestellt hat, und den Test darauf aufbauen — nicht die Quelle testbar machen.

  2. **`src/utils/ConsoleLogger.ts:29:53` · TS2322** — »Type `undefined` is not assignable to type `(val: string) => T`«. **Fall (a).** Der Compiler zeigt hier keinen Nullreferenz-Zweifel an, sondern die Lücke selbst: ein Default-Wert, der den deklarierten Typ verletzt, weil der Parameter in Wahrheit weggelassen werden darf. Der Parameter wird als weglassbar typisiert und der Aufrufzweig ergänzt:

     ```ts
     function loadConfigValue<T>(key: string | string[], as: ((val: string) => T) | undefined, defaultValue: T): T {
       const _key = getKeyPath(key);
       // @ts-ignore
       const value = HAS_LOCAL_STORAGE ? localStorage.getItem(_key) : globalThis[CONSOLE_LOGGER_STORAGE]?.[_key];
       if (value == undefined) return defaultValue;
       // without a converter the stored value is the value: that is how the styles are read
       return as ? as(value) : (value as T);
     }
     ```

     Der Default entfällt ersatzlos; alle drei Aufrufstellen (`:109`, `:114`, `:190`) übergeben ohnehin alle drei Argumente und bleiben unverändert. `value == undefined` fängt `null` und `undefined` in einem Vergleich, genau wie das bisherige `value != undefined` in der Rückgabe. Die `// @ts-ignore`-Zeilen der Datei bleiben, wo sie sind; sie decken die Index-Zugriffe auf `globalThis` ab und haben mit dieser Stelle nichts zu tun.

  3. **`src/utils/FrameLoop.ts:3:5` · TS2322** — »Type `null` is not assignable to type `FrameLoop`«. **Fall (b).** Die Modulvariable hält vor dem ersten Konstruktoraufruf nichts, der Typ sagt das Gegenteil. Zeile 3 wird zu:

     ```ts
     let gUniqInstance: FrameLoop | null = null;
     ```

     Sonst nichts. Der Wächter `if (gUniqInstance) return gUniqInstance;` in Zeile 11 verengt bereits korrekt, und die Zuweisung in Zeile 13 bleibt gültig.

  4. **`src/utils/attr-utils.ts:5:72` · TS2345** — »Argument of type `string | null` is not assignable to parameter of type `NamespaceType | undefined`«. **Fall (b).** `getAttribute` meldet ein fehlendes Attribut mit `null`, `toNamespace` erwartet dafür `undefined`; beides meint dasselbe und `toNamespace` liefert in beiden Fällen `GlobalNS`. Übersetzt wird an der Aufrufstelle:

     ```ts
     export const readNamespaceAttribute = (el: HTMLElement) => toNamespace(el.getAttribute(ATTR_NS) ?? undefined);
     ```

     **Die Signatur von `toNamespace` wird nicht aufgeweicht.** Sie ist über `src/index.ts:8` öffentlich, und die Aufweitung auf `null` wäre eine API-Änderung mit Doku- und CHANGELOG-Pflicht für einen Gewinn von null: nachgemessen sind die drei übrigen Aufrufstellen (`elements/ShaeElement.ts:45`, `view/ComponentContext.ts:61` und `:78`) unter `--strictNullChecks` fehlerfrei, sie würden von einer Aufweitung also nicht profitieren.

  5. **`src/utils/waitForMessageOfType.ts:53:18` · TS18046** — »`error` is of type `unknown`«. **Fall (b), und zugleich der Nebenbefund aus Paket 3.** Der Fehler erscheint erst unter dem Flag, weil `useUnknownInCatchVariables` aus `strict: true` ohne `strictNullChecks` wirkungslos bleibt. Die Zeile 53 wird zu:

     ```ts
     reject(error);
     ```

     Damit trägt die Ablehnung, was gefangen wurde, statt einer Zeichenkette ohne Stack und ohne `instanceof`. Nachgemessen ist das im heutigen Baum keine Verhaltensänderung: die einzigen beiden `guard`-Funktionen, die hier hineinlaufen können, werfen mit `throw data.error` einen String (`view/RemoteWorkerEnv.ts:214` und `:235`), und `String.prototype.toString()` gibt denselben String zurück. Kein Test im Repo behauptet etwas über diesen Ablehnungsgrund. Die Änderung ist die Hälfte, die hier hingehört: wird die Wurfseite später auf `Error` umgestellt, kommt der `Error` ohne weiteres Zutun durch. Die Wurfseite selbst wird in diesem Paket **nicht** angefasst.

  6. **`src/utils/waitForMessageOfType.ts:34` · kein Fehler, aber die Prüfpflicht aus dem Hinweis oben.** Das `reject(signal!.reason)` in `onAbort` **bleibt bestehen**. Es ist tragfähig: `onAbort` wird ausschließlich in Zeile 58 registriert, und die steht hinter `signal?.`, wird also nur erreicht, wenn ein Signal übergeben wurde; der Abbruchgrund eines `AbortSignal` ist laut Spezifikation im Moment des Abbruchs immer besetzt. Ausdrücken lässt sich das nicht: TypeScript verengt einen Parameter nicht in den Rumpf einer verschachtelten Funktion hinein, und `onAbort` muss im äußeren Geltungsbereich stehen, weil `cleanup` sie abmelden können muss. Damit ist es der erste von zwei **Fällen (c)**, und er bekommt, was Fall (c) braucht — der vorhandene Kommentar in Zeile 31 erklärt nur die Funktionsdeklaration. Er wird um die zweite Invariante ergänzt, sinngemäß und auf Englisch: eine Funktionsdeklaration, damit `cleanup` sie oberhalb ihrer eigenen Definition nennen darf; sie läuft nur, wenn ein Signal übergeben wurde, denn nur dann wird sie registriert.

  7. **`src/in-the-dark/Registry.ts` — drei Stellen, alle **Fall (b)**, alle dasselbe Muster: ein `Map.has()` unmittelbar vor einem `Map.get()`, dessen Ergebnis der Compiler zu Recht als `| undefined` liest. Statt der Behauptung wird der Wert einmal geholt und geprüft; das spart nebenbei den zweiten Lookup.

     - **`:61:19` · TS2345** — »Argument of type `Set<string> | undefined` is not assignable to parameter of type `Set<string>`«. Der `else`-Zweig von `appendRoute` wird zu:

       ```ts
       } else {
         const knownRoutes = this.#routes.get(token);
         if (knownRoutes) {
           addRoutes(knownRoutes, routes);
         } else {
           this.#routes.set(token, new Set(routes));
         }
       }
       ```

       Verhaltensgleich: die Werte der Map sind `Set`-Instanzen, also niemals falsy, `has(token)` und `get(token) != null` entscheiden identisch. Der `if (propRoute)`-Zweig darüber bleibt unangetastet, sein `!` in Zeile 55 ebenso — siehe den letzten Punkt dieses Schritts.

     - **`:80:48` · TS2488** — »Type `Set<string> | undefined` must have a `[Symbol.iterator]()` method«. Zeile 80 wird zu:

       ```ts
       const next = Array.from(this.#routes.get(route) ?? []);
       ```

       **Achtung, hier hängt eine Kaskade dran.** Bisher ist `next` durch den Fehler auf `any[]` degradiert und `cur` damit `any`; sobald die Zeile sauber ist, wird `next` zu `string[]` und `next.shift()` liefert `string | undefined`. Die Zeilen 85, 89 und 91 würden dann neu aufschlagen. Die Schleifenform fängt das ab, ohne eine Behauptung zu brauchen:

       ```ts
       for (let cur = next.shift(); cur !== undefined; cur = next.shift()) {
       ```

       an Stelle von `while (next.length) {` und der Zeile `const cur = next.shift();`. Innerhalb des Rumpfs ist `cur` damit `string`, und die Zeilen 85 bis 92 brauchen keine weitere Änderung. Drei Punkte, die der Implementierer nicht übersehen darf: das `continue` in Zeile 86 bleibt korrekt, weil der Aktualisierungsausdruck einer `for`-Schleife auch bei `continue` läuft — bei einer umgebauten `while`-Schleife wäre es eine Endlosschleife geworden; die Abbruchbedingung prüft `!== undefined` und nicht die Wahrheit von `cur`, sonst fiele ein leerer String als Token stillschweigend heraus; die Reihenfolge bleibt `shift`/`push`, also Breitensuche, denn `findTokensByRoute` gibt ein `Set` zurück, dessen Einfügereihenfolge über `findConstructors` bis in die Konstruktorliste durchschlägt.

       Die naheliegende Alternative `while (next.length)` mit `const cur = next.shift()!` wird verworfen: die Invariante ist ausdrückbar, damit greift (b) vor (c).

     - **`:92:33` · TS2769** — »No overload matches this call« auf `Array.from(this.#routes.get(cur))`. Derselbe Griff wie bei `:61`:

       ```ts
       const nextRoutes = this.#routes.get(cur);
       if (nextRoutes) {
         next.push(...Array.from(nextRoutes).filter((route) => !tokens.has(route)));
       }
       ```

       an Stelle des `if (this.#routes.has(cur)) { … }`-Blocks. Der Name `route` im Filter-Callback verdeckt den gleichnamigen Parameter der Methode; das ist so vorhanden und wird hier nicht nebenbei umbenannt.

     - **Die vorhandenen `!` in `:45`, `:55`, `:99` und `:110` bleiben unverändert.** Sie erzeugen keinen Fehler und ihre Umformung wäre eine Änderung ohne Anlass. Wer sie trotzdem angleichen will, hebt das für ein eigenes Vorhaben auf.

  8. **`src/in-the-dark/SignalsPath.ts:28:5` · TS2322** — »Type `Signal<this["value"]> | undefined` is not assignable to type `Signal<any>`«. **Fall (c), der zweite und letzte.** `findObjectSignalByName` ist in `@spearwolf/signalize` als generischer Nachschlag typisiert (`object-signals.d.ts:2`: `<O extends object, K extends keyof O>(obj: O, name: K) => Signal<O[K]> | undefined`) und muss `undefined` melden, weil es für einen beliebigen Namen aufgerufen werden kann. Hier ist der Name aber der, den die Zeile 21 direkt darüber vergibt: `@signal({name: VALUE}) accessor value` legt das Signal während der Feldinitialisierung an, und die ist abgeschlossen, bevor der Konstruktorrumpf läuft. Der Nachschlag findet also immer etwas. Die Zeile wird zu:

     ```ts
     // the @signal accessor above creates this signal during field initialization,
     // so the lookup by that name always resolves once the constructor body runs
     this.value$ = findObjectSignalByName(this, VALUE)!;
     ```

     Ein Laufzeit-Wächter mit `throw` wäre Verteidigungscode gegen einen Zustand, den die Sprache ausschließt, und käme in kein Log. Es bleibt bei der Behauptung samt Begründung im Kommentar.

  9. **`src/worker/MessageRouter.ts:67:66` · TS2345** — »Argument of type `string | undefined` is not assignable to parameter of type `string | URL`«. **Fall (b).** `ConfigurePayloadData.importModule` ist optional, und das zu Recht: `route()` bekommt, was über `postMessage` hereinkommt, und darüber entscheidet nicht diese Datei. Heute läuft eine `Configure`-Nachricht ohne `importModule` in `toUrlString(undefined)` und damit in einen `TypeError`, den der vorhandene `try` fängt und als `ImportedModule`-Fehlermeldung zurückschickt — die Nachrichtenform stimmt also schon, nur der Text ist Kaffeesatz. Der Guard macht daraus dieselbe Meldung mit einem lesbaren Grund:

     ```ts
     async #configure(data: ConfigurePayloadData) {
       const url = data.importModule;
       try {
         if (!url) throw new Error('missing "importModule" url');
         const module = await import(/* @vite-ignore */ toUrlString(url));
         …
     ```

     Im Rest der Methode tritt `url` an die Stelle von `data.importModule` (Zeilen 70, 75, 80), damit es eine Quelle gibt. Im `catch` ist `url` weiterhin `string | undefined`, und das passt: `ImportedModuleEvent.url` ist optional (`types.ts:79`). Der Kommentar `/* @vite-ignore */` bleibt zwingend stehen.

  10. **`src/worker/MessageRouter.ts:91:79` · TS18046** — »`error` is of type `unknown`«. **Fall (b).** Das Feld `AppliedChangeTrailEvent.error` ist als `string` typisiert (`types.ts:86`), es geht hier also wirklich um eine Zeichenkette und nicht um den Fehler selbst. `error.toString()` wird zu:

      ```ts
      this.postMessage({type: AppliedChangeTrail, serial: data.serial, error: `${error}`} as AppliedChangeTrailEvent);
      ```

      Dieselbe Schreibweise verwendet die Datei zwei Methoden weiter oben bereits (`:80`), die Zeile fügt sich also ein. Nebeneffekt ohne Gegenwert-Risiko: ein geworfenes `null` ergibt jetzt `'null'` statt eines zweiten `TypeError` innerhalb des `catch`.

  11. **Nachmessen und den Sollwert belegen.** `cd packages/shadow-objects && npx tsc -p tsconfig.json --noEmit --strictNullChecks 2>&1 | grep -c "error TS"` muss **50** melden. Trifft das nicht zu, die Differenz auflösen, bevor irgendetwas committet wird. Die häufigste Ursache wäre die neue `ConsoleLogger.spec.ts`: sie steht über `include: ["src"]` im Typecheck-Baum und darf selbst keinen Nullreferenz-Fehler mitbringen. Für den Build ist sie unkritisch, `build.mjs:39` schließt `*.spec.ts` aus dem Transpilat aus; `docs/superpowers/specs/dist-snapshot.txt` und `dist-package.json.snapshot` bleiben damit gültig.

  12. **CHANGELOG.** Ein einziges Bullet, als **erstes** unter `## [Unreleased]` in `packages/shadow-objects/CHANGELOG.md`, ohne Finding-ID, im Ton der Nachbarn — und zwar nur für den Defekt:

      ```markdown
      - **Bugfix (logging):** `ConsoleLogger.loadConfig()` threw a `TypeError` when one of the four `ConsoleLogger.styles.*` keys was present in `localStorage`: the style values are read without a converter, and the missing converter was called anyway. Since `loadConfig()` runs from the constructor of the first logger, a single style entry set in the devtools took the whole library down at startup.
      ```

      **Die neun Typkorrekturen bekommen hier keinen Eintrag.** Begründung in einer Zeile: solange das Flag global aus ist, emittiert `tsc` unveränderte `.d.ts` — nachgeprüft, keine der zehn Stellen liegt in einer exportierten Signatur —, für Konsumenten ändert sich in diesem Paket also nichts; der gemeinsame Eintrag über die präziseren Deklarationen gehört in Paket 6, wo das Flag scharfgeschaltet wird und die Schärfung tatsächlich im Artefakt ankommt. Kein Eintrag in der Wurzel-`CHANGELOG.md`: weder Build noch Tooling noch CI sind betroffen. Keine Änderung in `docs/` und `README.md`: keine öffentliche Signatur bewegt sich.

  13. **Was in diesem Paket ausdrücklich liegen bleibt**, damit es niemand nebenbei mitnimmt: die String-Würfe in `view/RemoteWorkerEnv.ts:147` und `:165` sowie die `throw data.error` in `:214` und `:235` (Paket 5); die vier `!` in `Registry.ts`; der Doppelversand in `MessageRouter.#onChangeTrail`, siehe den nächsten Punkt.

  14. **Echter Defekt, gefunden und bewusst nicht behoben** — `src/worker/MessageRouter.ts:87-96`. Schlägt `kernel.run(data)` fehl, verschickt der `catch` eine `AppliedChangeTrail`-Nachricht mit `error`, und danach läuft die Methode weiter in `if (data.serial)` und verschickt für dieselbe Seriennummer eine zweite, fehlerfreie Bestätigung. Es fehlt ein `return` im `catch`. Folgenlos ist das heute nur durch eine Verkettung auf der Gegenseite: `waitForMessageOfType` meldet seinen `message`-Hörer im ersten Durchlauf ab, die zweite Nachricht findet also niemanden mehr. Der Compiler schickt mich in denselben `catch`-Block, aber nicht auf diese Zeile, und ein `return` wäre eine Verhaltensänderung mit rotem Test in einer Datei ohne Spec. Damit ist es kein Fall (a) dieses Pakets, sondern ein Nebenbefund fürs nächste Audit — zusammen mit dem Verwandten eine Ebene höher: der `guard` in `RemoteWorkerEnv.applyChangeTrail` (`:214`) wirft bei `data.error`, **bevor** er die Seriennummer vergleicht, und schreibt damit den Fehler eines fremden Änderungslaufs dem gerade wartenden Aufruf zu.

- Verify: `cd /home/spw/spaceland/shadow-objects && pnpm lint && pnpm typecheck && pnpm test:ci && pnpm exec turbo run test --filter=shadow-objects-e2e --force`, dazu das Zählkommando aus Schritt 11 mit dem Sollwert 50. Die E2E-Suite gehört diesmal dazu, weil `MessageRouter` der Einstiegspunkt des Workers ist und nur dort über echtes `postMessage` läuft; sie muss über turbo starten, nicht über `pnpm -F` direkt (Befund aus Paket 1).
- Commit: `fix: type the null cases in utils, worker, Registry and SignalsPath (STRICT-NULL, 1/3)`
**STRICT-NULL · high · `tsconfig.json:26-30`** — strict: true, aber strictNullChecks: false — 60 verdeckte Typfehler

Die Root-Konfiguration setzt strict: true und hebt strictNullChecks anschließend wieder auf. Gegenprobe mit aktiviertem Flag: 60 Fehler in 12 Dateien, Schwerpunkt Kernel.ts (24), ComponentContext.ts (7), RemoteWorkerEnv.ts (5), ShaeEntElement.ts (5). Das ist kein theoretisches Risiko — mindestens ELEM-OBS-001 (null.host) und ELEM-VC-001 (vc.parent auf undefined) in diesem Backlog sind Nullreferenz-Defekte, die der Compiler bei aktivem Flag angezeigt hätte. Solange es aus ist, ist jede Null-Aussage im gesamten Paket ungeprüft, und die vielen ?-Operatoren im Code sind Vermutung statt Zusage.

Empfehlung: Schrittweise aktivieren: strictNullChecks in tsconfig.lib.json für einzelne Verzeichnisse einschalten und von den kleinen Modulen (utils/, worker/) zu den großen arbeiten. Kernel.ts zuletzt. Solange nicht alles läuft, hält ein separates tsconfig.strict.json in CI den erreichten Stand fest, damit er nicht zurückfällt.

</details>

### [x] 5. strictNullChecks: view und elements

- Findings: STRICT-NULL (high, L) — Teil 2 von 3 · ELEM-OBS-001 (medium, S) · ELEM-VC-001 (low, S)
- Ziel: Die 24 Nullreferenz-Typfehler in `view/` und `elements/` sind behoben; wo der Compiler einen echten Defekt anzeigt, ist der Defekt behoben.
- Hash: `45a2048`
- Ergebnis: 2 Runden · Zählstand 50 → 26, Sollwert erreicht; der Rest liegt ausnahmslos in `Kernel.ts` (24) und `Kernel.spec.ts` (2) · Sortenlehre 7 × (a), 15 × (b), 2 × (c), vom Reviewer ziffernweise bestätigt · ELEM-OBS-001 und ELEM-VC-001 behoben (`ShaeEntElement.ts:207-211`, `:355-359`), neue Browser-Spec `packages/shadow-objects-testing/test/ent-element-teardown.test.js` · öffentliche Verhaltensänderung: `RemoteWorkerEnv` lehnt nach `destroy()` mit dem neuen, exportierten `WorkerDestroyedError` ab statt mit dem Stringliteral `'worker was destroyed'`, und `start()` weist eine zerstörte Umgebung ab, statt einen unerreichbaren Worker-Thread zu starten · 5 rote Läufe belegt
- Bemerkenswert: drei Schritte des Detailplans gingen am Code vorbei und wären grün-auf-kaputt gewesen (unerreichbarer `already started`-Zweig, toter Observer-Pfad, Ausnahmen aus Custom-Element-Reaktionen erreichen den Aufrufer nicht). Der Implementierer hat sie durch stärkere Fälle ersetzt, der Reviewer alle drei nachgeprüft und bestätigt.
- Klein, offen geblieben: die Methodentabelle von `RemoteWorkerEnv` in `docs/api-reference.md:993-996` führt `start()` nicht, obwohl es sich seit dieser Runde wie `importScript()` und `applyChangeTrail()` verhält — eine Zeile
- Nebenbefunde, alle vorbestehend: `ShaeEntElement.ts:207` — der `null`-Zweig ist im Lebenszyklus tot, weil `disconnectedCallback` den `MutationObserver` trennt, bevor dessen Records zugestellt werden; ELEM-OBS-001s Belegpfad reproduziert nicht, die Einstufung `medium` ist zu hoch · `ShaeEntElement.ts:245-259` — wird ein `<shae-ent>` innerhalb desselben Elternknotens umsortiert, zerstört sich der Observer selbst und wird nie neu angelegt; das Element bleibt für den Rest seines verbundenen Lebens unbeobachtet · `ShaeEntElement.findShadowRootHost()` (`:188-205`) trägt dasselbe Cast-Muster wie die reparierte Stelle, wirft aber nicht — an einem abgehängten Element behält `#shadowRootHost` seinen alten Wert · `ShadowEnv.ts:86-88` löscht den `__shadowEnvs`-Eintrag ohne die Eigentümerprüfung, die `destroy()` durchführt · `docs/superpowers/specs/dist-package.json.snapshot` steht auf Version `0.30.2` und `signalize ^0.29.0`, gebaut wird `0.33.0` bzw. `^0.30.0`; `dist-snapshot.txt:191` führt ein `tsconfig.lib.tsbuildinfo`, das der Build nicht mehr ablegt
- Folgen: —

<details><summary>Detailplan (erledigt)</summary>


- Messung, Zug 0, Stand `81bb4f0`: `cd packages/shadow-objects && npx tsc -p tsconfig.json --noEmit --strictNullChecks 2>&1 | grep -c "error TS"` liefert **50**. Der Sollwert aus Paket 4 ist erreicht, die Verteilung unverschoben. Auf dieses Teilpaket entfallen **24**:

  | Datei | Fehler |
  |---|---|
  | `src/view/ComponentContext.ts` | 7 |
  | `src/view/RemoteWorkerEnv.ts` | 5 |
  | `src/elements/ShaeEntElement.ts` | 5 |
  | `src/view/ShadowEnv.ts` | 4 |
  | `src/elements/ShaeWorkerElement.ts` | 2 |
  | `src/view/LocalShadowObjectEnv.ts` | 1 |

  Die verbleibenden 26 liegen in `Kernel.ts` (24) und `Kernel.spec.ts` (2) und gehören Paket 6. **Sollwert nach diesem Paket: 26.**

- Sortenlehre, unverändert aus Paket 4, gilt für jede der 24 Stellen: (a) echter Defekt → der Defekt wird behoben, mit rotem Test zuerst; (b) Typ zu weit, Invariante nachweisbar → verengen oder Guard, kein Test nötig; (c) Invariante hält, ist aber nicht ausdrückbar → Behauptung **mit** Kommentar, der die Invariante benennt. Die Einordnung steht unten je Stelle dabei. Verteilung: 18 × (b), 4 × (a), 2 × (c).

- **`tsconfig.json` wird in diesem Paket nicht angefasst.** Das globale Flag ist Paket 6. Der Zwischenstand wird ausschließlich über das Zählkommando gemessen.

- **Offene Rückfrage, vor Beginn zu klären** — Schritt 3 und Schritt 4 setzen die Findings ELEM-OBS-001 und ELEM-VC-001 instand, die nicht im Scope dieses Laufs stehen. Der Compiler zeigt an beiden Stellen exakt auf sie (`ShaeEntElement.ts:207` bzw. `:353/:354`), und das Finding STRICT-NULL führt beide selbst als Beleg. Der Plan ist auf **Weg A (mitbeheben)** geschrieben; **Weg B (typkorrekt, Defekt bleibt stehen)** steht in beiden Schritten ausformuliert daneben. Fällt die Entscheidung auf B, entfallen die Schritte 1.2 und 1.3 samt ihren roten Tests, und die Verify-Kette verliert die Browser-Suite als Pflichtteil. Solange die Entscheidung aussteht, wird an `ShaeEntElement.ts` nicht gearbeitet; die übrigen fünf Dateien sind davon unberührt und können vorlaufen.

- Dateien:
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts` (roter Test, zuerst — Datei existiert seit Paket 3)
  - `packages/shadow-objects-testing/test/ent-element-teardown.test.js` (neu — roter Test für die beiden Element-Defekte, nur auf Weg A)
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.ts` (2 × Fall a, 3 × Fall b, neue Fehlerklasse)
  - `packages/shadow-objects/src/elements/ShaeEntElement.ts` (2 × Fall a auf Weg A, 2 × Fall b, 1 × Fall c)
  - `packages/shadow-objects/src/view/ComponentContext.ts` (7 × Fall b)
  - `packages/shadow-objects/src/view/ShadowEnv.ts` (3 × Fall b, 1 × Fall c)
  - `packages/shadow-objects/src/elements/ShaeWorkerElement.ts` (2 × Fall b)
  - `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts` (1 × Fall b)
  - `packages/shadow-objects/docs/api-reference.md` (Abschnitte `### RemoteWorkerEnv` → Methods/Events, `### ShaeWorkerElement`)
  - `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`)

- Vorgehen:

  **1. Zuerst die roten Tests — und nur für die vier Stellen unter Fall (a).** Die anderen zwanzig sind reine Typkorrekturen und bekommen keinen Test.

  1.1 **`applyChangeTrail()` und `importScript()` nach `destroy()`** — in die bestehende `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`, die seit Paket 3 den `FakeWorker` samt `vi.mock('../create-worker.js')`, `startEnv()` und `withTimeout()` mitbringt. Ein neuer Block neben `describe('worker failure')`:

  ```ts
  describe('after destroy', () => {
    const destroyed = async () => {
      const {env, worker} = await startEnv();
      env.destroy();
      // settles the Destroyed handshake so its 5s timer does not stay open past the case
      worker.reply({type: Destroyed});
      return {env, worker};
    };

    it('rejects applyChangeTrail instead of throwing a TypeError', async () => {
      const {env} = await destroyed();
      const reason = await withTimeout(env.applyChangeTrail([], true)).then(
        () => {
          throw new Error('expected the promise to reject, but it resolved');
        },
        (error) => error,
      );
      expect(reason).toBeInstanceOf(Error);
      expect((reason as Error).name).toBe('WorkerDestroyedError');
    });

    it('rejects importScript instead of throwing a TypeError', async () => {
      // same shape with env.importScript('./late.js')
    });

    it('rejects a start() on a destroyed environment with an Error', async () => {
      const {env} = await destroyed();
      const reason = await withTimeout(env.start()).then(
        () => {
          throw new Error('expected the promise to reject, but it resolved');
        },
        (error) => error,
      );
      expect(reason).toBeInstanceOf(Error);
    });
  });
  ```

  Der dritte Fall deckt die Wurfseite `:147`/`:165` ab: `start()` auf einer bereits gestarteten und danach zerstörten Umgebung geht in den `already started`-Zweig und wirft heute den blanken String `'worker was destroyed'`, der kein `Error` ist. Er scheitert im roten Lauf an `toBeInstanceOf(Error)`.

  Roten Lauf erzeugen und ansehen: `cd packages/shadow-objects && pnpm exec vitest src/view/RemoteWorkerEnv.spec.ts --run`. Erwartung für die ersten beiden Fälle: `TypeError: Cannot read properties of undefined (reading 'postMessage')` — und zwar **synchron geworfen**, nicht als Ablehnung, denn beide Methoden sind nicht `async`; im Test kommt der Fehler also aus dem Aufruf selbst und nicht aus dem `await`. Genau das ist der Defekt: eine Methode, die ein Promise verspricht, wirft. Trifft das nicht zu, ist der Test falsch aufgebaut — dann den Test korrigieren, nicht weiterarbeiten. Der dritte Fall scheitert an der Instanzprüfung, nicht an einem Timeout.

  1.2 **ELEM-OBS-001, nur auf Weg A** — neue Datei `packages/shadow-objects-testing/test/ent-element-teardown.test.js`. Diese Suite läuft im Browser-Mode in echtem Chromium; das ist Pflicht, denn beide Defekte hängen an Custom-Elements-Lebenszyklus und `MutationObserver`, die happy-dom nicht verlässlich nachbildet. Aufbau nach dem Muster von `remove-and-append-e.test.js`: Markup über `render()`, danach `await Promise.all(['shae-worker', 'shae-ent'].map((name) => customElements.whenDefined(name)))`, im `afterEach` `ComponentContext.get().clear()` und `destroy()` auf der Umgebung. **Elemente niemals mit `document.createElement()` bauen** — DEFECT-1 in `packages/shadow-objects-e2e/KNOWN-DEFECTS.md`; die Suite geht ausschließlich über geparstes Markup.

  Der Fall: ein `<shae-ent>` aus dem Baum nehmen und den `MutationObserver` seine Runde drehen lassen.

  ```js
  it('survives losing its parent node', async () => {
    const [parent, child] = findElementsById('parent', 'child');
    const errors = [];
    const onError = (event) => errors.push(event.error ?? event.reason);
    window.addEventListener('error', onError);
    try {
      child.remove();
      // the observer callback is a microtask of its own; one turn of the loop is enough
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(errors, errors.map(String).join(' | ')).to.have.lengthOf(0);
      expect(child.entParentNode, 'entParentNode').to.be.undefined;
    } finally {
      window.removeEventListener('error', onError);
      parent.remove();
    }
  });
  ```

  Ein `MutationObserver`-Callback wirft nicht in den Aufrufer zurück — der `TypeError` landet als unbehandelter Fehler im globalen Ereignis, deshalb der `window`-Hörer statt eines `expect(...).to.not.throw`. Erwartung im roten Lauf: genau ein Eintrag, `TypeError: Cannot read properties of null (reading 'host')`. Bleibt die Liste leer, hat der Observer nicht gefeuert — dann zuerst klären, warum (Markup, `connectedCallback`, Timing), und **nicht** die Quelle testbar machen.

  1.3 **ELEM-VC-001, nur auf Weg A** — zweiter Fall in derselben Datei. Gebraucht wird ein `<shae-ent>`, das einen `entParentNode` hat, aber nie eine `ViewComponent` bekam. `viewComponent` entsteht in `#setupViewComponentEffect` nur, wenn `componentContext$` einen Kontext trägt; `connectedCallback` (`:225-227`) setzt ihn aus `ComponentContext.get(this.ns)`. Der Weg zu »Parent ja, ViewComponent nein« führt deshalb über `componentContext$.set(undefined)`, das der Effekt durchreicht, ohne die `ViewComponent` neu anzulegen:

  ```js
  it('detaches from its parent without a view component', () => {
    const [parent, child] = findElementsById('parent', 'child');
    expect(child.entParentNode, 'entParentNode').to.equal(parent);

    child.viewComponent$.set(undefined);
    child.componentContext$.set(undefined);

    expect(() => child.remove()).to.not.throw();
  });
  ```

  `viewComponent$` und `componentContext$` sind öffentliche Felder der Elementklasse, der Test greift also nicht in Interna. Erwartung im roten Lauf: `TypeError: Cannot read properties of undefined (reading 'parent')` aus `#setParent`, geworfen über `disconnectedCallback` und damit synchron im `remove()`. Der Fall zieht Schritt 4 nach sich, nicht Schritt 3 — feuert stattdessen erst der Observer-Pfad, sind die beiden Fälle vermischt; dann `child.remove()` durch einen direkten `child.disconnectedCallback()`-Äquivalenzaufbau ersetzen, statt beide Defekte in einen Fall zu werfen.

  Roter Lauf: `pnpm -F shadow-objects-testing test`.

  **2. `src/view/RemoteWorkerEnv.ts` — fünf Fehler, zwei davon echte Defekte.**

  2.1 Eine zweite Fehlerklasse, direkt unter `WorkerFailedError`:

  ```ts
  /**
   * The reason a request is rejected with once the environment has been torn down
   * with {@link RemoteWorkerEnv.destroy}. The worker is gone; no reply can arrive.
   */
  export class WorkerDestroyedError extends Error {
    constructor(message = 'the worker environment has been destroyed') {
      super(message);
      this.name = 'WorkerDestroyedError';
    }
  }
  ```

  Sie ist über `export * from './view/RemoteWorkerEnv.js'` in `src/index.ts` schon abgedeckt; an `index.ts` ändert sich nichts. `ShadowEnvDestroyedError` aus `ShadowEnv.ts` wird bewusst **nicht** wiederverwendet: der Abbau eines Proxys ist nicht der Abbau der `ShadowEnv`, die ihn hält, und ein Consumer, der beide Ebenen sieht, soll sie auseinanderhalten können.

  2.2 **`:206:5` · TS2532 »Object is possibly undefined«** und **`:210:9` · TS2345 »Argument of type `Worker | undefined`«**. **Fall (a).** `destroy()` setzt `#worker` auf `undefined` (`:246`) und `#isDestroyed` auf `true`, bricht den `#workerFailure`-Controller aber ausdrücklich nicht ab — das ist der Beschluss aus Paket 3, damit der eigene `Destroyed`-Wartelauf seinen Timeout behält. Der Frühausstieg in `:195-196` prüft nur `signal.aborted` und greift deshalb nicht. Ein `applyChangeTrail()` nach einem regulären `destroy()` läuft damit in `undefined.postMessage` und wirft synchron einen `TypeError` aus einer Methode, deren Signatur ein `Promise<void>` verspricht. Der Guard kommt hinter den Signal-Guard — ein Ausfall ist der genauere Grund und gewinnt gegen den Abbau —, und der Worker wird einmal in eine lokale Konstante geholt, damit die Verengung über beide Verwendungsstellen trägt:

  ```ts
  const worker = this.#worker;
  if (worker == null) return Promise.reject(new WorkerDestroyedError());
  ```

  Danach tritt `worker` an die Stelle von `this.#worker` in `:206` und `:210`.

  2.3 **`:206:39` · TS2769 »No overload matches this call«** auf dem zweiten Argument von `postMessage`: `removeTransferables()` liefert `TransferablesType | undefined` (`:23`), die Zwei-Argument-Überladung verlangt `Transferable[]`. **Fall (b).**

  ```ts
  worker.postMessage(message, transferables ?? []);
  ```

  Verhaltensgleich: der WebIDL-Parameter ist `sequence<object> transfer = []`, ein übergebenes `undefined` wird ohnehin zur leeren Sequenz.

  2.4 **`:229:5` · TS2532** und **`:231:7` · TS2345** in `importScript()`. **Fall (a),** dieselbe Ursache und derselbe Griff wie 2.2: lokale Konstante, Guard mit `WorkerDestroyedError`, danach `worker` statt `this.#worker` in beiden Zeilen.

  2.5 **`:147` und `:165` · kein Compiler-Fehler, aber die Wurfseite aus dem Nebenbefund von Paket 4.** `throw 'worker was destroyed'` wird an beiden Stellen zu `throw new WorkerDestroyedError()`. Damit trägt die Ablehnung einen Namen, einen Stack und ein `instanceof` statt einer nackten Zeichenkette. Zwei Konsequenzen, die der Implementierer kennen muss und die zusammen den CHANGELOG-Eintrag begründen:

  - `start()` ist `async`, der Wurf wird also zur Ablehnung des zurückgegebenen Promise. Konsumenten, die den Grund heute mit `=== 'worker was destroyed'` prüfen, sehen ab jetzt ein `Error`-Objekt. Im Repo tut das niemand — nachgemessen über `grep -rn "worker was destroyed" packages/`, einziger Treffer sind die beiden Wurfstellen selbst.
  - `:214` und `:235` (`if (data.error) throw data.error;` in den beiden `guard`-Funktionen) bleiben **unverändert**. Sie werfen weiter, was der Worker geschickt hat, und der Feldtyp ist dort `string` (`types.ts:79/:86`) — daraus einen `Error` zu bauen wäre eine Formatentscheidung über den Draht und gehört nicht in ein Typpaket. Paket 4 hat `waitForMessageOfType.ts:54` bereits auf `reject(error)` umgestellt: der geworfene String kommt seitdem unverändert als Ablehnungsgrund durch, statt durch `toString()` zu laufen. Das ist im heutigen Baum dasselbe Ergebnis; hier ändert sich nichts.

  **3. `src/elements/ShaeEntElement.ts:207` · TS2352 — ELEM-OBS-001.** Der Compiler sagt nicht »könnte undefined sein«, sondern verweigert die Konvertierung: nach `if (parent) return parent;` ist `parent` im Folgezweig definitiv `null`, und `null as ShadowRoot` überlappt mit nichts. Der Zweig ist ausschließlich im `null`-Fall erreichbar und wirft dort garantiert — genau das, was ELEM-OBS-001 nachgewiesen hat, und der Compiler benennt es frontal.

  **Weg A, hier vorgesehen — Fall (a).** Die Empfehlung des Findings, mit dem Rückgabetyp ausgeschrieben:

  ```ts
  protected getParentNodeForObserver(): Node | undefined {
    // a node that has just been removed has no parent left: its root is itself, and only a
    // node still sitting inside a shadow tree has a host to fall back to
    return this.parentNode ?? (this.getRootNode() as ShadowRoot)?.host ?? undefined;
  }
  ```

  Der Zugriff geht auf den Root-Knoten statt auf den bereits als `null` bekannten `parentNode`. Beide Aufrufstellen tragen das: `:243` prüft `if (parent)`, und `onParentChanged(_newParent: Node | undefined, …)` (`:261`) führt `undefined` bereits in seiner Signatur. Im entfernten Fall liefert `getRootNode()` den Knoten selbst, `.host` ist dort `undefined`, das Ergebnis ist `undefined` statt eines `TypeError` — der Observer-Callback läuft zu Ende, statt in `:250` abzubrechen, und `#setParent(undefined)` in `onParentChanged` kommt zum Zug. Der Rückgabetyp der `protected` Methode wandert damit in die emittierte `.d.ts`; für Subklassen außerhalb des Pakets ist das eine sichtbare Schärfung und gehört ins CHANGELOG.

  **Weg B, falls die Rückfrage anders entschieden wird.** Typkorrekt ohne Verhaltensänderung geht nur über einen Doppel-Cast: `return (parent as unknown as ShadowRoot).host ?? parent;`. Der Compiler ist dann zufrieden, der garantierte `TypeError` bleibt Zeile für Zeile stehen, und der Kommentar darüber müsste ihn ausdrücklich als bekannt und beabsichtigt liegengelassen ausweisen — mit Verweis darauf, dass der Zweig nur im `null`-Fall erreichbar ist und dort wirft. Verdeckt wird der Defekt dadurch nicht; er wird nur beschriftet. Auf diesem Weg entfällt Schritt 1.2, und `getParentNodeForObserver` bekommt keinen expliziten Rückgabetyp.

  **4. `src/elements/ShaeEntElement.ts:353:11` und `:354:9` · TS18048 »`vc` is possibly undefined« — ELEM-VC-001.** `this.viewComponent` ist als `ViewComponent | undefined` deklariert (`:23-25`), und der `else`-Zweig von `#setParent` greift ohne Prüfung darauf zu.

  **Weg A, hier vorgesehen — Fall (a).** Die Empfehlung des Findings:

  ```ts
  } else {
    const vc = this.viewComponent;
    if (vc?.parent) {
      vc.parent = undefined;
      this.syncShadowObjects();
    }
  }
  ```

  Das Optional Chaining in der Bedingung verengt `vc` im Block auf `ViewComponent`, beide Fehler fallen mit einem Zeichen. Verhaltensänderung: ein Element ohne `ViewComponent` überspringt den Zweig, statt zu werfen — und das ist die richtige Antwort, denn ohne `ViewComponent` gibt es nichts abzuhängen. Erreicht wird die Stelle über `disconnectedCallback` (`:288`), `onParentChanged` (`:262`) und `#reReuestParentRoot` (`:299`), also über drei Lebenszyklus-Pfade.

  **Weg B.** `if (vc!.parent)` — der Compiler ist zufrieden, der `TypeError` bleibt. Der Kommentar müsste dann sagen, was der Compiler hier akzeptiert: eine Behauptung, dass eine `ViewComponent` existiert, die in genau der Konstellation aus ELEM-VC-001 nicht existiert. Das ist eine wissentlich falsche Behauptung und die schlechtere Hälfte von Weg B; wird B gewählt, dann besser `const vc = this.viewComponent as ViewComponent;` mit demselben Kommentar, damit die Behauptung an einer Stelle steht statt an zweien.

  **5. `src/elements/ShaeEntElement.ts:136:18` · TS2790 »The operand of a `delete` operator must be optional«. Fall (c).** Die Zeile entfernt die per `Object.defineProperty` (`:128`) auf die Instanz gelegte `dispatchEvent`-Property und legt damit die Prototyp-Methode wieder frei — die Aufräumfunktion des Effekts, die genau das zurücknimmt, was der Effekt gesetzt hat. Der `delete` ist richtig; `ViewComponent.dispatchEvent` ist über eventize als nicht-optionale Methode am Prototyp geführt, und TypeScript kennt den Unterschied zwischen Instanz-Property und Prototyp-Methode nicht:

  ```ts
  // the property lives on the instance (defineProperty above), the method it shadows lives on
  // the prototype: deleting the own property restores the original, it does not remove the method
  delete (vc as {dispatchEvent?: ViewComponent['dispatchEvent']}).dispatchEvent;
  ```

  Der `if`-Kopf in `:135` (`Object.hasOwn(vc, 'dispatchEvent') && vc.dispatchEvent === newDispatch`) bleibt unverändert; er ist der Nachweis, dass hier wirklich eine eigene Property liegt.

  **6. `src/elements/ShaeEntElement.ts:165:32` · TS2345 »Argument of type `string | undefined`«. Fall (b).** `token$` ist `createSignal<string | undefined>()` (`:16`), der `ViewComponent`-Konstruktor deklariert `token: string` (`ViewComponent.ts:143-144`). Der Konstruktorrumpf ist auf `undefined` vorbereitet (`:161`: `this.#token = token ?? VoidToken;`), nur die Signatur sagt es nicht. Übersetzt wird an der Aufrufstelle:

  ```ts
  vc = new ViewComponent(token ?? VoidToken, {context});
  ```

  `VoidToken` kommt aus `../constants.js` und muss importiert werden. **Die Konstruktorsignatur wird nicht aufgeweicht** — dieselbe Entscheidung wie bei `toNamespace` in Paket 4: `ViewComponent` ist öffentlich, in `docs/api-reference.md:548`, `docs/cheat-sheet.md:283` und `docs/guides.md:382` als `new ViewComponent(token: string, …)` dokumentiert, und eine Aufweitung auf `string | undefined` wäre eine API-Änderung mit Doku- und CHANGELOG-Pflicht für einen Gewinn von null. Verhaltensgleich, weil der Rumpf ohnehin dasselbe Ersatzzeichen setzt.

  **7. `src/view/ComponentContext.ts` — sechs Fehler mit einer Umformung, ein siebter allein.**

  7.1 **`:110:11`, `:113:33`, `:118:7`, `:119:7`, `:130:5`, `:139:7` · alle TS18048 »`viewInstance` is possibly undefined«. Fall (b).** Die Ursache ist eine einzige: `viewInstance` ist als `ViewInstance | undefined` deklariert (`:105`), und der `has()`-Zweig füllt es aus `this.#components.get()`, dessen `| undefined` der Compiler zu Recht mitführt. Dasselbe Muster wie in `Registry.ts` in Paket 4 — der Wert wird einmal geholt und geprüft, statt zweimal nachgeschlagen:

  ```ts
  let viewInstance = this.#components.get(component.uuid);

  if (viewInstance) {
    if (viewInstance.component !== component) {
      …
    }
    viewInstance.component = component;
    viewInstance.children = [];
  } else {
    viewInstance = { … };
    this.#components.set(component.uuid, viewInstance);
  }
  ```

  Die Deklaration in `:105` (`let viewInstance: ViewInstance | undefined;`) entfällt und wird zur Zuweisung; die Typannotation ist dann überflüssig, weil `get()` sie liefert. Nach dem `if`/`else` verengt die Kontrollfluss-Analyse auf `ViewInstance` — damit sind `:130` und `:139` mit erledigt, ohne dass dort eine Zeile fällt. Verhaltensgleich: die Werte der Map sind Objekte und damit nie falsy, `has(uuid)` und `get(uuid) !== undefined` entscheiden identisch. Der Wurf gegen den disposed Kontext (`:99-103`) bleibt vor allem stehen, die Reihenfolge ändert sich nicht.

  7.2 **`:522:9` · TS2532 »Object is possibly undefined«** auf `lvl.get(depth).push(viewInstance)` in `#traverseLevelOrderBFS`. **Fall (b),** dasselbe Muster:

  ```ts
  const atDepth = lvl.get(depth);
  if (atDepth) {
    atDepth.push(viewInstance);
  } else {
    lvl.set(depth, [viewInstance]);
  }
  ```

  **8. `src/view/ShadowEnv.ts` — vier Fehler.**

  8.1 **`:77:8` · TS2769 »No overload matches this call«.** Das Abhängigkeits-Array `[findObjectSignalByName(this, 'viewReady'), findObjectSignalByName(this, 'proxyReady')]` hat den Elementtyp `Signal<…> | undefined`, damit passt keine der vier `createEffect`-Überladungen. **Fall (c),** und dieselbe Invariante wie in `SignalsPath.ts` in Paket 4: `@signal() accessor viewReady` und `@signal() accessor proxyReady` (`:48-49`) legen ihre Signale während der Feldinitialisierung an, die vor dem Konstruktorrumpf abgeschlossen ist. Der Nachschlag findet also immer etwas:

  ```ts
  // the two @signal accessors above create their signals during field initialization,
  // so both lookups resolve by the time the constructor body runs
  }, [findObjectSignalByName(this, 'viewReady')!, findObjectSignalByName(this, 'proxyReady')!]);
  ```

  Ein Laufzeit-Wächter wäre Verteidigungscode gegen einen Zustand, den die Sprache ausschließt. Es bleibt bei der Behauptung samt Begründung.

  8.2 **`:242:11`, `:243:13`, `:244:11` · alle TS18048 »`globalThis.__shadowEnvs` is possibly undefined«.** Die Deklaration führt das `| undefined` selbst (`:12`). **Fall (b),** drei Fehler mit einer Umformung; der `if (ns)`-Block in `destroy()` wird zu:

  ```ts
  const shadowEnvs = globalThis.__shadowEnvs;
  if (ns && shadowEnvs?.get(ns) === this) {
    shadowEnvs.delete(ns);
  }
  ```

  Verhaltensgleich: `has(ns)` vor `get(ns) === this` ist redundant, weil `this` nie `undefined` ist und ein fehlender Schlüssel `undefined` liefert. Die lokale Konstante ist nötig, damit die Verengung bis in die `delete`-Zeile trägt — auf `globalThis.__shadowEnvs` selbst hält TypeScript sie nicht. Die Konstante wird **nach** `this.view = undefined` (`:239`) geholt, nicht davor: der `view`-Setter kann die Map anlegen, und eine vorher gelesene Referenz wäre eine andere.

  **9. `src/elements/ShaeWorkerElement.ts` — zwei Fehler.**

  9.1 **`:156:11` · TS18048 »`shadowEnv.envProxy` is possibly undefined«** in `importScript()`. **Fall (b).** `await this.shadowEnv.ready()` garantiert `isReady`, und `isReady` prüft `#shaObjEnvProxy` (`ShadowEnv.ts:143`) — zum Zeitpunkt des Auflösens ist der Proxy also da. Die Invariante hält aber nicht bis zur nächsten Zeile: zwischen dem Auflösen und dem Zugriff liegt ein Microtask, in dem `destroy()` oder ein `envProxy = undefined` laufen kann. Ein `!` wäre hier falsch angewandtes (c) — behauptet würde etwas, das kippen kann. Also ein Guard mit dem Fehler, mit dem `ready()` selbst ablehnt:

  ```ts
  const envProxy = shadowEnv.envProxy;
  if (envProxy == null) {
    throw new ShadowEnvDestroyedError();
  }
  await envProxy.importScript(src);
  ```

  `ShadowEnvDestroyedError` wird aus `@spearwolf/shadow-objects` bzw. dem passenden relativen Pfad importiert; er ist in `ShadowEnv.ts:19` exportiert und über `src/index.ts:14` öffentlich. Das ändert das Fehlerverhalten einer öffentlichen Methode: statt `TypeError: Cannot read properties of undefined` kommt der benannte Fehler, den `ready()` und `syncWait()` an derselben Stelle schon liefern. Doku-Pflicht, siehe Schritt 11.

  9.2 **`:163:28` · TS2345 »Argument of type `string | null`«.** `hasAttribute()` verengt `getAttribute()` nicht. **Fall (b):**

  ```ts
  const autoSync = this.getAttribute(ATTR_AUTO_SYNC);
  if (autoSync != null) {
    this.autoSync$.set(autoSync);
  }
  ```

  an Stelle des `if (this.hasAttribute(ATTR_AUTO_SYNC))`-Blocks. Verhaltensgleich: `getAttribute` liefert genau dann `null`, wenn `hasAttribute` `false` meldet. Die Zeile `:191` (`this.autoSync = this.hasAttribute(…) ? this.getAttribute(…) : true;`) bleibt unangetastet — der Setter nimmt `any` und erzeugt keinen Fehler.

  **10. `src/view/LocalShadowObjectEnv.ts:39:9` · TS2722 »Cannot invoke an object which is possibly undefined«. Fall (b).** Die Prüfung in `:36` und der Aufruf in `:39` stehen auf zwei verschiedenen `as`-Ausdrücken; TypeScript verengt über einen Cast hinweg nicht. Einmal holen, prüfen, aufrufen:

  ```ts
  on(this.kernel, MessageToView, (message: MessageToViewEvent) => {
    const onMessageToView = (this as IShadowObjectEnvProxy).onMessageToView;
    if (onMessageToView == null) return;

    const {type, uuid, traverseChildren} = message;
    const data = structuredClone(message.data, {transfer: message.transferables});
    onMessageToView.call(this, {type, uuid, data, traverseChildren});
  });
  ```

  Zwei Punkte, die nicht verrutschen dürfen: das `.call(this, …)` erhält die `this`-Bindung des bisherigen Methodenaufrufs — `ShadowEnv` setzt den Rückruf zwar bereits gebunden, aber eine fremde `IShadowObjectEnvProxy`-Implementierung muss das nicht. Und der `structuredClone`-Aufruf bleibt hinter der Prüfung: er lief auch bisher nur im `if`-Zweig, und ein Klon für einen Rückruf, den es nicht gibt, wäre Arbeit ohne Abnehmer.

  **11. Doku.** Zwei Abschnitte in `packages/shadow-objects/docs/api-reference.md`, sonst nichts:

  - Abschnitt `### RemoteWorkerEnv`, Tabelle **Methods**: eine Zeile `applyChangeTrail(changeTrail, waitForConfirmation)` ergänzen, sofern sie fehlt, und beide Methodenzeilen um den Abbau-Fall erweitern — nach `destroy()` lehnen `applyChangeTrail()`, `importScript()` und `start()` mit einem `WorkerDestroyedError` ab. Unter dem vorhandenen Absatz zum Ausfall (`:1013`) ein zweiter Satz, der die beiden Enden auseinanderhält: ein Ausfall meldet sich mit `WorkerFailedError`, ein gewollter Abbau mit `WorkerDestroyedError`; beide sind endgültig für diese Umgebung. `WorkerDestroyedError` in die Aufzählung der exportierten Fehlerklassen aufnehmen, dort wo `WorkerFailedError` steht.
  - Abschnitt zu `<shae-worker>` / `ShaeWorkerElement`, Eintrag `importScript(src)`: ein Halbsatz, dass die Methode mit `ShadowEnvDestroyedError` ablehnt, wenn die Umgebung abgebaut wird, bevor der Import beginnt.
  - **Ausdrücklich nicht angefasst**: `README.md` führt weder Fehlerklassen noch Element-Interna. `docs/guides.md`, `docs/best-practices.md`, `docs/cheat-sheet.md` und `docs/concepts.md` beschreiben keinen der berührten Pfade auf dieser Ebene; der `ViewComponent`-Konstruktor bleibt in allen dreien so dokumentiert, wie er ist, weil seine Signatur sich nicht bewegt. `docs/getting-started.md` kennt die Proxy-Ebene nicht. `docs/superpowers/specs/dist-snapshot.txt` und `dist-package.json.snapshot` bleiben gültig: es entsteht kein neues Modul, alle neuen Symbole liegen in bestehenden Dateien — die neue Spec in `shadow-objects-testing` liegt außerhalb des Pakets, und `build.mjs:39` schließt `*.spec.ts` ohnehin aus.

  **12. CHANGELOG.** In `packages/shadow-objects/CHANGELOG.md` als **erste** Einträge unter `## [Unreleased]` (neueste zuerst), ohne Finding-ID, im Ton der Nachbarn. Auf Weg A vier Bullets, auf Weg B die ersten beiden:

  - **Bugfix (worker environments):** `RemoteWorkerEnv.applyChangeTrail()` und `importScript()` griffen nach einem regulären `destroy()` auf einen Worker zu, den es nicht mehr gab, und warfen einen `TypeError` aus einer Methode, die ein Promise verspricht. Beide lehnen jetzt mit einem neuen `WorkerDestroyedError` ab, und `start()` auf einer zerstörten Umgebung tut dasselbe, statt einen blanken String zu werfen.
  - **New (public API):** `WorkerDestroyedError` — der Grund, mit dem eine abgebaute `RemoteWorkerEnv` jede weitere Anfrage ablehnt. Getrennt von `WorkerFailedError`, der den Ausfall des Workers meldet.
  - **Bugfix (elements):** `<shae-ent>` warf einen `TypeError`, sobald es aus dem Baum genommen wurde: der Beobachter des Elternknotens las `host` auf einem `parentNode`, der in genau diesem Zweig immer `null` ist, und brach die Re-Parent-Behandlung ab. (Weg A)
  - **Bugfix (elements):** `<shae-ent>` warf beim Abhängen vom Elternelement, wenn es nie eine `ViewComponent` bekommen hatte. Ohne `ViewComponent` gibt es nichts abzuhängen; der Zweig wird jetzt übersprungen. (Weg A)

  Der Rückblick auf den Vorzustand gehört hier hin und **nur** hierhin — nicht in `docs/`, nicht in die Code-Kommentare. Kein Eintrag in der Wurzel-`CHANGELOG.md`: weder Build noch Tooling noch CI sind betroffen. **Die zwanzig reinen Typkorrekturen bekommen weiterhin keinen Eintrag** — solange das Flag global aus ist, emittiert `tsc` unveränderte `.d.ts`; der gemeinsame Eintrag über die präziseren Deklarationen gehört in Paket 6. Die eine Ausnahme auf Weg A ist der Rückgabetyp von `getParentNodeForObserver`, der `Node | undefined` wird und als `protected` Member in der `.d.ts` steht; er ist im dritten Bullet mitgedeckt und braucht keine eigene Zeile.

  **13. Nachmessen und den Sollwert belegen.** `cd packages/shadow-objects && npx tsc -p tsconfig.json --noEmit --strictNullChecks 2>&1 | grep -c "error TS"` muss **26** melden. Trifft das nicht zu, die Differenz auflösen, bevor irgendetwas committet wird. Die wahrscheinlichste Ursache wäre Schritt 7.1: fällt dort die Typannotation weg, ohne dass beide Zweige zuweisen, meldet der Compiler an `:130` weiter. Die neuen Fälle in `RemoteWorkerEnv.spec.ts` stehen über `include: ["src"]` im Typecheck-Baum und dürfen selbst keinen Nullreferenz-Fehler mitbringen; die Datei in `shadow-objects-testing` ist JavaScript und zählt nicht mit.

  **14. Was in diesem Paket ausdrücklich liegen bleibt**, damit es niemand nebenbei mitnimmt: die `throw data.error`-Würfe in `RemoteWorkerEnv.ts:214` und `:235` samt der Reihenfolgefrage aus Paket 4 (der `guard` in `:214` wirft, bevor er die Seriennummer vergleicht); das fehlende `return` im `catch` von `MessageRouter.ts:87-96`; die ungeprüften `event.data`-Zugriffe in `MessageRouter.route()` und `WorkerRuntime.onmessage`; DEFECT-1 aus `KNOWN-DEFECTS.md`. Neu dazu kommt eine Beobachtung aus Schritt 8.2: der `view`-Setter löscht in `:86-88` den Eintrag aus `globalThis.__shadowEnvs` ohne zu prüfen, ob er dieser `ShadowEnv` gehört, während `destroy()` in `:242-244` genau das prüft. Nach `this.view = undefined` in `destroy()` ist der Block darunter deshalb schon leer gelaufen. Folgenlos im heutigen Baum, aber die beiden Stellen widersprechen einander — Nebenbefund fürs nächste Audit, kein Fall dieses Pakets.

- Verify: `cd /home/spw/spaceland/shadow-objects && pnpm lint && pnpm typecheck && pnpm test:ci && pnpm exec turbo run test --filter=shadow-objects-e2e --force`, dazu das Zählkommando aus Schritt 13 mit dem Sollwert 26. `pnpm test:ci` schließt die Browser-Suite in `shadow-objects-testing` ein — auf Weg A ist sie der Beleg für die beiden Element-Defekte und darf nicht übersprungen werden. Die E2E-Suite gehört dazu, weil `RemoteWorkerEnv` und alle drei Custom Elements dort über echtes `postMessage` und echten Custom-Elements-Lebenszyklus laufen; sie muss über turbo starten, nicht über `pnpm -F` direkt (Befund aus Paket 1).
- Commit: `fix: type the null cases in view and elements (STRICT-NULL, 2/3)`
**STRICT-NULL · high · `tsconfig.json:26-30`** — strict: true, aber strictNullChecks: false — 60 verdeckte Typfehler

Die Root-Konfiguration setzt strict: true und hebt strictNullChecks anschließend wieder auf. Gegenprobe mit aktiviertem Flag: 60 Fehler in 12 Dateien, Schwerpunkt Kernel.ts (24), ComponentContext.ts (7), RemoteWorkerEnv.ts (5), ShaeEntElement.ts (5). Das ist kein theoretisches Risiko — mindestens ELEM-OBS-001 (null.host) und ELEM-VC-001 (vc.parent auf undefined) in diesem Backlog sind Nullreferenz-Defekte, die der Compiler bei aktivem Flag angezeigt hätte. Solange es aus ist, ist jede Null-Aussage im gesamten Paket ungeprüft, und die vielen ?-Operatoren im Code sind Vermutung statt Zusage.

Empfehlung: Schrittweise aktivieren: strictNullChecks in tsconfig.lib.json für einzelne Verzeichnisse einschalten und von den kleinen Modulen (utils/, worker/) zu den großen arbeiten. Kernel.ts zuletzt. Solange nicht alles läuft, hält ein separates tsconfig.strict.json in CI den erreichten Stand fest, damit er nicht zurückfällt.

Begleitend, weil der Compiler unter dem Flag genau auf sie zeigt und beide **nicht** im Scope dieses Laufs stehen:

**ELEM-OBS-001 · medium · `packages/shadow-objects/src/elements/ShaeEntElement.ts:204-208`** — getParentNodeForObserver() wirft, sobald das Element keinen parentNode mehr hat

Die Methode gibt parentNode zurück, wenn er wahr ist — und dereferenziert andernfalls (parent as ShadowRoot).host, also null.host. Der zweite Zweig ist damit ausschließlich im null-Fall erreichbar und wirft dort garantiert. Genau dieser Fall tritt in onParentChanged() ein, das direkt nach dem Entfernen des Knotens aus dem MutationObserver-Callback heraus aufgerufen wird. Nachgewiesen: TypeError: Cannot read properties of null (reading 'host'). Der Fehler landet im Observer-Callback und bricht die Re-Parent-Behandlung ab. strictNullChecks:false verhindert, dass tsc das anmerkt.

Empfehlung: Auf den Root-Knoten statt auf den bereits null-geprüften parentNode zugreifen: 'return this.parentNode ?? (this.getRootNode() as ShadowRoot)?.host ?? undefined;'. Der Rückgabetyp sollte den undefined-Fall führen, damit die Aufrufer ihn behandeln müssen.

**ELEM-VC-001 · low · `packages/shadow-objects/src/elements/ShaeEntElement.ts:351-357`** — #setParent(undefined) dereferenziert eine möglicherweise fehlende ViewComponent

Im else-Zweig steht 'const vc = this.viewComponent; if (vc.parent)' — ohne Optional Chaining. viewComponent ist undefined, solange kein ComponentContext gesetzt wurde. disconnectedCallback() ruft #setParent(undefined); trifft das ein Element, das einen entParentNode hat, aber nie eine ViewComponent bekommen hat, wirft der Zugriff. Von strictNullChecks:false gedeckt.

Empfehlung: vc?.parent verwenden und den ganzen Zweig überspringen, wenn keine ViewComponent existiert.

</details>

### [x] 6. strictNullChecks: Kernel und globales Flag

- Findings: STRICT-NULL (high, L) — Teil 3 von 3, schließt das Finding
- Ziel: Die 24 Typfehler in `Kernel.ts` und die 2 in `Kernel.spec.ts` sind behoben, `strictNullChecks: true` steht in der Root-`tsconfig.json`.
- Hash: `8f9475c`
- Ergebnis: 2 Runden · Zählstand 26 → 0, `tsconfig.json:25` trägt `"strictNullChecks": true` · 1 × (a), 23 × (b), kein (c) · öffentliche Signatur von `provideContext()` / `provideGlobalContext()` rein additiv um einen `SignalReader<T>`-Zweig erweitert — sie lehnte den Fall ab, den vier Doku-Dateien vorführen · `dist`-Dateiliste unverändert bei 188 Dateien, sieben `.d.ts` präziser, `Kernel.d.ts` byte-gleich · `pnpm run ci` grün von Ende zu Ende
- Runde 1 schloss zwei wichtige Befunde: der neue `throw` in `#requireEntry` riss `upgradeEntities()` mittendrin ab, sobald ein Lifecycle-Callback eine andere Entity zerstörte — der Reviewer hatte das außerhalb des Repos gegen beide Fassungen reproduziert, der Fix überspringt jetzt in beiden Schleifen, was der Kernel nicht mehr hält, mit rotem Regressionsfall. Und: die Typecheck-Ratsche griff nur für `packages/shadow-objects`, während `shadow-objects-e2e` das scharfe Flag erbte, ohne je geprüft zu werden — dort steht jetzt ein eigener `typecheck`-Task, den `turbo.json` und das `ci`-Skript mitziehen.
- Klein, an Paket 7 abgegeben: der Guard in Schleife 1 von `upgradeEntities()` hat keinen Test. Er ist die stillere Hälfte — vor der Runde schlug dieser Pfad als roher `TypeError` fehl, also ohne die sprechende Meldung, an der ein Regress auffiele.
- Nebenbefunde, alle vorbestehend: `Kernel.ts:345` — totes `?.` an `this.getEntity(uuid)?.dispatchViewEvents(...)`, `getEntity()` wirft oder liefert · `Kernel.ts:172` — `new Map<String, …>` mit dem Boxed-Typ · `Kernel.ts:851` — `destroy()` dreht mit `traverseLevelOrderBFS().reverse()` den Cache in place um · `Kernel.ts:784-786` — Kommentar bricht mitten im Satz ab · `packages/shadow-objects-e2e/playwright.config.ts` — 4 × TS4111 (`env.CI` über Index-Signatur), liegt außerhalb von `include: ["src", "tests"]` und wird deshalb von keinem Kommando gesehen
- Folgen: —

<details><summary>Detailplan (erledigt)</summary>


- Messung, Zug 0, Stand `45a2048`: `cd packages/shadow-objects && npx tsc -p tsconfig.json --noEmit --strictNullChecks 2>&1 | grep -c "error TS"` liefert **26**. Der Sollwert aus Paket 5 ist erreicht, die Verteilung ist die angekündigte:

  | Datei | Fehler |
  |---|---|
  | `src/in-the-dark/Kernel.ts` | 24 |
  | `src/in-the-dark/Kernel.spec.ts` | 2 |

  **Sollwert nach diesem Paket: 0.** Danach wird das Flag scharfgeschaltet und `pnpm typecheck` hält den Stand.

- Sortenlehre, unverändert aus den Paketen 4 und 5: (a) echter Defekt → der Defekt wird behoben, mit rotem Beleg zuerst; (b) Typ zu weit, Invariante nachweisbar → verengen oder Guard, kein Test nötig; (c) Invariante hält, ist aber nicht ausdrückbar → Behauptung **mit** Kommentar. Verteilung hier: **24 × (b), 2 × (a), 0 × (c)** — und damit anders als in den Paketen 4 und 5.

  Der Grund ist nachgeprüft und keine Bequemlichkeit: `Kernel.ts` führt seine Nullprüfungen bereits, nur in einer Form, die `tsc` nicht als Verengung liest. Zwanzig der 24 Stellen sind ein und dasselbe Muster — `if (!this.#entities.has(uuid)) return; const {…} = this.#entities.get(uuid);` — bei dem ein zweiter Zugriff auf dieselbe Map die Verengung des ersten wieder verliert. Die restlichen vier hängen an Feldern und Signaturen, die zu eng deklariert sind. Sämtliche Aufrufwege wurden einzeln zurückverfolgt (siehe Schritt 6); an keiner Stelle in `Kernel.ts` ist der `undefined`-Fall im heutigen Baum erreichbar. Was der Compiler hier aufdeckt, ist kein Nullreferenz-Defekt, sondern ein Defekt in der **öffentlichen Signatur** von `provideContext()` und `provideGlobalContext()` — die beiden Fehler in der Spec, Schritt 2. Die Nebenbefunde am Ende führen auf, welche echten Defekte im Kernel liegen, die dieser Compilerlauf **nicht** zeigt.

- **Das globale Flag ist der Schlusspunkt.** `tsconfig.json:25` trägt `"strictNullChecks": false`, eine Zeile unter `"strict": true`. Die Zeile wird auf `true` gesetzt, **nicht** ersatzlos entfernt. Begründung: die Datei listet mit `alwaysStrict`, `noImplicitAny`, `noImplicitThis` und `useUnknownInCatchVariables` bereits vier Sub-Flags der `strict`-Familie ausdrücklich auf, ein fünftes fügt sich ein statt aufzufallen; und ein Flag, das dasteht, ist ein Flag, das jemand bewusst gesetzt hat — beim Entfernen verschwindet `strictNullChecks` aus jeder Suche im Repo, und die nächste Abschaltung fände keinen Widerstand.

- **Flag außerhalb `packages/shadow-objects` — nachgemessen, nicht vermutet.** Das Scharfschalten löst dort **null** neue Fehler aus:

  | Paket | erbt | mit Flag |
  |---|---|---|
  | `shadow-objects-e2e` | eigene `tsconfig.json`, `extends: ../../tsconfig.json`, `include: ["src", "tests"]` | 0 (vorher 0). Der `build`-Task ruft `tsc` ohne `-p`, greift also genau diese Datei. |
  | `shae-offscreen-canvas` | keine eigene `tsconfig.json`, kein `tsc`-Aufruf, Quellen sind `.js` | 0 — die Wurzel-Konfiguration zieht die Dateien über `allowJs` mit ein, prüft sie ohne `checkJs` aber nicht |
  | `shadow-objects-testing` | dito, Specs sind `.js` | 0 |

  Zwei Randbeobachtungen zum Messweg, die im Report gehören und nicht in den Code: `pnpm typecheck` läuft über turbo und findet ein `typecheck`-Skript nur in `packages/shadow-objects` — die Ratsche greift also für genau ein Paket, für die anderen greift der `build`-Task oder gar nichts. Und die Wurzel-Konfiguration selbst (`npx tsc -p tsconfig.json --noEmit` im Repo-Root) meldet 4 Fehler in `packages/shadow-objects-e2e/playwright.config.ts` (4 × TS4111, `env.CI` über eine Index-Signatur) — flagunabhängig, vorbestehend, und von keinem laufenden Kommando gesehen, weil die Datei außerhalb des `include` der e2e-Konfiguration liegt. Beides bleibt liegen, siehe »Was liegen bleibt«.

- **Offene Rückfrage, vor Beginn zu klären** — Schritt 2 erweitert eine öffentliche Signatur in `src/types.ts`. Das steht so nicht im `Bereich:` dieses Pakets und ist mehr als eine Nullprüfung. Der Plan ist auf **Weg A (Signatur erweitern)** geschrieben, **Weg B (Spec anpassen)** steht in Schritt 2 daneben. Solange die Entscheidung aussteht, wird an `src/types.ts` nicht gearbeitet; die 24 Stellen in `Kernel.ts` sind davon unberührt und können vorlaufen.

- Dateien:
  - `packages/shadow-objects/src/types.ts` (1 × Fall a, nur auf Weg A)
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts` (24 × Fall b, dazu die Implementierungsseite von Fall a)
  - `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts` (nur auf Weg B)
  - `tsconfig.json` (Wurzel, Zeile 25)
  - `packages/shadow-objects/docs/api-reference.md` (Signaturen `provideContext` / `provideGlobalContext`, Methodentabelle `RemoteWorkerEnv`)
  - `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`)
  - `CHANGELOG.md` (Wurzel, neuer datierter Abschnitt)

- Vorgehen:

  **1. Der Beleg zuerst — und er ist bereits geschrieben.** Für die zwei Stellen unter Fall (a) braucht es keinen neuen Test: `Kernel.spec.ts:418-440` (`should accept a signal reader as context source`) und `:558-580` (`should accept a signal reader as global context source`) sind genau der Fall, den die Signatur zurückweist. Sie laufen grün — die Ablehnung ist rein statisch, zur Laufzeit funktioniert die Verkabelung. Der rote Beleg ist der Compilerlauf: `cd packages/shadow-objects && npx tsc -p tsconfig.json --noEmit --strictNullChecks 2>&1 | grep Kernel.spec` muss vor dem Eingriff die beiden TS2345 zeigen und danach schweigen. Die 24 Stellen in `Kernel.ts` sind reine Typkorrekturen und bekommen keinen Test.

  **2. `src/in-the-dark/Kernel.spec.ts:430:41` und `:569:49` · TS2345** — »Argument of type `SignalReader<string>` is not assignable to parameter of type `string | SignalReader<string | undefined> | undefined`«, mit der Kette bis hinunter zu `CompareFunc<string>` gegen `CompareFunc<string | undefined>`. **Fall (a).**

  Der Sachverhalt: `SignalReader<T>` ist über `[$signal]: ISignalImpl<T>` invariant — `value` ist kovariant, `compare?: CompareFunc<T>` kontravariant. Ein `SignalReader<string>`, wie ihn `createSignal('initial').get` liefert, ist deshalb **kein** `SignalReader<string | undefined>`. Der Parameter `sourceOrInitialValue?: T | SignalReader<T | undefined>` (`src/types.ts:113` und `:119`) akzeptiert damit ausgerechnet den Reader nicht, den `docs/api-reference.md:122` als Anwendungsfall nennt (»Pass a signal as the source to keep the context in sync with existing reactive state«) und den `docs/guides.md:269-271`, `docs/concepts.md:314-316` und `docs/cheat-sheet.md:134-136` vorführen. Solange das Flag aus ist, fallen `string` und `string | undefined` zusammen und niemand merkt es. Jeder Konsument mit `strictNullChecks` — also praktisch jeder — merkt es sofort.

  **Weg A.** In `src/types.ts` beide Vorkommen der Zeile

  ```ts
      sourceOrInitialValue?: T | SignalReader<T | undefined>,
  ```

  ersetzen durch

  ```ts
      sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>,
  ```

  und dieselbe Ersetzung an den beiden Implementierungsseiten in `Kernel.ts:447` und `:488` (dort mit der tieferen Einrückung des Objektliterals). Die Erweiterung ist rein additiv: der bisherige Zweig bleibt stehen, ein zweiter kommt daneben. `NonNullable` einzubauen (`SignalReader<Maybe<T>>`) wäre kürzer, verengt aber für ein `T`, das `null` enthält — nicht tun. Im Rumpf ändert sich nichts: `isSignal()` unterscheidet die Fälle zur Laufzeit, und die beiden `as SignalReader<T>`-Casts vor `link()` decken beide Zweige.

  Nachgemessen: mit dieser Ersetzung meldet der Lauf über `tsconfig.json` (Specs eingeschlossen) **0** Fehler.

  **Weg B**, falls die Signatur unangetastet bleiben soll: in beiden Spec-Fällen `createSignal('initial')` zu `createSignal<string | undefined>('initial')` ändern. Der Plan rät ab. Die Spec bildet den dokumentierten Anwendungsfall ab; sie umzuschreiben, damit eine zu enge Signatur stehenbleiben kann, heißt, den Beleg an den Defekt anzupassen. Der Defekt bliebe im ausgelieferten `.d.ts` und träfe jeden Konsumenten, der einem Kontext ein vorhandenes Signal unterschiebt.

  **3. `Kernel.ts:116:11` · TS2532** — »Object is possibly 'undefined'«. **Fall (b).** In `traverseLevelOrderBFS` steht `lvl.get(depth).push(e)` innerhalb von `if (lvl.has(depth))`; die zweite Abfrage kennt das Ergebnis der ersten nicht. Der Wert wird einmal geholt:

  ```ts
        const entities = lvl.get(depth);
        if (entities) {
          entities.push(e);
        } else {
          lvl.set(depth, [e]);
        }
  ```

  **4. `Kernel.ts:138:22` und `:138:50` · TS2322** — »Type `Entity[] | undefined` is not assignable to type `Entity[]`«. **Fall (b).** Die beiden Felder `#allEntities?: Entity[]` und `#allEntitiesReversed?: Entity[]` (`:82-83`) sind als weglassbar deklariert, obwohl `traverseLevelOrderBFS` sie zurückgibt und `Entity[]` verspricht. Beide werden auf ein leeres Array initialisiert:

  ```ts
    #allEntities: Entity[] = [];
    #allEntitiesReversed: Entity[] = [];
  ```

  Das `?` entfällt ersatzlos. `#allEntitiesNeedUpdate` startet auf `true`, der erste Aufruf befüllt also ohnehin, bevor irgendwer liest; die Initialisierung ist die ehrliche Fassung dessen, was der Rückgabetyp seit jeher behauptet.

  **5. `Kernel.ts:148:12`, `:148:19` · TS2339 und `:153:38` · TS7006** — »Property 'token'/'entity' does not exist on type `EntityEntry | undefined`« und »Parameter 'child' implicitly has an 'any' type«. **Fall (b).** Der dritte ist eine Folgemeldung des zweiten: weil die Destrukturierung scheitert, wird `entity` zum Fehlertyp, `entity.children` zu `any` und der Callback-Parameter damit implizit `any`. In `getEntityGraphNode`:

  ```ts
      const entry = this.#entities.get(uuid);
      if (entry === undefined) return undefined;

      const {token, entity} = entry;
  ```

  **Achtung, hier legt der Fix einen zweiten Fehler frei**, der bisher hinter TS7006 lag: `children: entity.children.map((child) => this.getEntityGraphNode(child.uuid))` liefert `(EntityGraphNode | undefined)[]` und wird an `children: EntityGraphNode[]` zugewiesen — TS2322. Wer das erwartet, wundert sich nicht. Behoben wird es durch einen Filter, nicht durch eine Behauptung:

  ```ts
        children: entity.children
          .map((child) => this.getEntityGraphNode(child.uuid))
          .filter((node) => node !== undefined),
  ```

  TypeScript liest das seit 5.5 als Typprädikat, ein `is`-Helfer ist nicht nötig (nachgemessen mit der `tsc`-Fassung dieses Repos). Im selben Zug fällt die Behauptung in `getEntityGraph()` (`:142`):

  ```ts
    getEntityGraph(): EntityGraphNode[] {
      return Array.from(this.#rootEntities)
        .map((uuid) => this.getEntityGraphNode(uuid))
        .filter((node) => node !== undefined);
    }
  ```

  Zur Erreichbarkeit: `destroyEntity()` löscht einen Eintrag aus `#entities` und nimmt ihn im selben Zug aus der Kinderliste seines Elternteils (`entity.removeFromParent()`) und aus `#rootEntities`; ein Kind, das der Kernel nicht mehr führt, kann im heutigen Baum also nicht in `entity.children` stehen. Der Filter ändert damit kein beobachtbares Verhalten — er macht die Zusage `EntityGraphNode[]` erstmals wahr, statt sie mit `!` zu behaupten. **Ein Kommentar an dieser Stelle ist erwünscht**, eine Zeile, die sagt, dass Knoten, die der Kernel nicht mehr führt, aus dem Graphen fallen statt als Loch darin zu stehen.

  **6. `Kernel.ts:261:12`, `:261:20`, `:343:9`, `:345:5` · TS2339 / TS18048 — und die sieben Stellen ohne jeden Guard.** **Fall (b), alle zehn.**

  6.1 `destroyEntity` (`:259-261`) und `changeToken` (`:339-345`) tragen dasselbe `has()`/`get()`-Muster wie Schritt 5 und werden genauso aufgelöst:

  ```ts
      const entry = this.#entities.get(uuid);
      if (entry === undefined) return;
  ```

  In `destroyEntity` folgt darunter unverändert `const {entity, usedConstructors} = entry;`, in `changeToken` bleibt `if (entry.token === token) return;` stehen. Beide Male fällt die vorangehende `has()`-Zeile weg — ein Map-Zugriff weniger, gleiche Semantik.

  6.2 `updateShadowObjects` (`:365-389`, sieben Fehler: `:366:65`, `:366:78`, `:374:48`, `:376:11`, `:378:43`, `:388:14` je TS18048, `:389:49` TS2345) holt seinen Eintrag **ohne** Guard. Die Invariante hält, ist aber nur über die Aufrufer sichtbar, und dieselbe Frage stellt sich gleich noch dreimal. Deshalb ein Helfer statt siebenmal `?.` oder `!` — direkt über `hasEntity()`:

  ```ts
    #requireEntry(uuid: string): EntityEntry {
      const entry = this.#entities.get(uuid);
      if (entry === undefined) {
        throw new Error(`entity with uuid "${uuid}" not found!`);
      }
      return entry;
    }
  ```

  In `updateShadowObjects` wird `const entry = this.#entities.get(uuid);` zu `const entry = this.#requireEntry(uuid);`, alle sieben Folgezeilen bleiben unverändert.

  Die Meldung ist zeichengleich die von `getEntity()` (`:96`) — und damit `Kernel.ts` sie nicht an zwei Stellen führt, wird `getEntity()` auf den Helfer gestellt:

  ```ts
    getEntity(uuid: string): Entity {
      return this.#requireEntry(uuid).entity;
    }
  ```

  Verhaltensgleich: `entry.entity` wird im Konstruktor von `createEntity` gesetzt und nie geleert, der bisherige `!entity`-Zweig war nur über einen fehlenden Eintrag erreichbar.

  Die vier Aufrufwege in `updateShadowObjects`, einzeln zurückverfolgt — der Wurf ist eine Absicherung, kein neuer Ausgang: `upgradeEntities()` (`:161`, `:165`) läuft über `traverseLevelOrderBFS()`, dessen Entities aus `#entities` stammen; `changeProperties()` (`:335`) ruft eine Zeile vorher `this.getEntity(uuid)`, das bei einer unbekannten uuid bereits wirft; `changeToken()` (`:347`) steht hinter dem Guard aus 6.1. Was sich ändert, ist die Fehlermeldung im unerreichbaren Fall: statt `TypeError: Cannot read properties of undefined (reading 'token')` steht dort dieselbe Meldung, die der Kernel für eine unbekannte uuid ohnehin führt.

  **7. `Kernel.ts:773:7` · TS2532** — »Object is possibly 'undefined'«, `entry.usedConstructors.get(construct).add(shadowObject)` hinter einem `has()`. **Fall (b).** Gleiche Auflösung wie Schritt 3:

  ```ts
      const shadowObjects = entry.usedConstructors.get(construct);
      if (shadowObjects) {
        shadowObjects.add(shadowObject);
      } else {
        entry.usedConstructors.set(construct, new Set([shadowObject]));
      }
  ```

  Der Bezeichner `shadowObjects` ist in dieser Methode noch frei; der gleichnamige lokale Wert weiter oben heißt `shadowObject`, ohne `s`. Wem das zu nah beieinander liegt, nennt ihn `createdBy` — nur nicht `objs`, das ist in `findShadowObjects` schon vergeben.

  **8. `Kernel.ts:786:36`, `:786:49` · TS18048 und `:787:45` · TS2345** — `createShadowObjects(uuid)` holt einen Eintrag, den der einzige Aufrufer zwei Zeilen vorher selbst in die Map gelegt hat. **Fall (b).** Statt den Eintrag zurückzuholen, wird er durchgereicht:

  ```ts
    private createShadowObjects(entry: EntityEntry): void {
      this.registry.findConstructors(entry.token, entry.entity.truthyProps())?.forEach((construct) => {
        this.constructShadowObject(construct, entry);
      });
    }
  ```

  und in `createEntity` (`:255`) wird `this.createShadowObjects(uuid);` zu `this.createShadowObjects(entry);`. Die Methode ist `private` und hat genau diesen einen Aufrufer; die `.d.ts` ändert sich dadurch nicht (private Member erscheinen dort nur als Name). Das `?.` hinter `findConstructors` bleibt: dessen Rückgabetyp ist `ShadowObjectConstructor[] | undefined` (`Registry.ts:120`), die Prüfung ist echt.

  **9. `Kernel.ts:794:12` · TS2339 und `:796:98` · TS2769** — `findShadowObjects`, wieder `has()`/`get()`, und die `No overload matches this call`-Meldung an `:796` ist die Folge davon (`usedConstructors` wird zum Fehlertyp, `Array.from` bekommt `unknown`). **Fall (b).** Ein Eingriff, zwei Fehler:

  ```ts
      const entry = this.#entities.get(uuid);
      if (entry === undefined) return [];

      const {usedConstructors} = entry;
  ```

  Zeile `:796` bleibt Zeichen für Zeichen, wie sie ist.

  **10. `Kernel.ts:585:9` · TS2322** — »Type `<T = any>(name: string, options?) => SignalReader<T>` is not assignable to type `<T = unknown>(name: string, options?) => SignalReader<Maybe<T>>`«. **Fall (b).** Das Objektliteral wird gegen `ShadowObjectCreationAPI` geprüft, und dort ist `useProperty` mit `SignalReader<Maybe<T>>` deklariert (`types.ts:134`). Die lokale Fabrik `getUseProperty` verspricht `SignalReader<T>` — und liefert in Wahrheit ein Signal, das mit `undefined` startet (`createSignal<any>(undefined, opts).get`, `:427`). Die zu enge Zusage steht in der Fabrik, nicht in der API. Der Rückgabetyp der Fabrik (`:414`) wird angeglichen:

  ```ts
      ): SignalReader<Maybe<T>> => {
  ```

  `Maybe` ist in `Kernel.ts:18` bereits importiert. `<T = any>` bleibt stehen — mit `unknown` als Default zerfiele `useProperties` (`:595`), das `getUseProperty` ohne Typargument ruft und das Ergebnis an `SignalReader<Maybe<T[K]>>` zuweist. Nachgemessen: mit `any` grün, die `.d.ts` von `Kernel` ändert sich nicht.

  **11. Zwischenmessung, vor dem Flag.** `cd packages/shadow-objects && npx tsc -p tsconfig.json --noEmit --strictNullChecks 2>&1 | grep -c "error TS"` muss **0** melden. Trifft das nicht zu, die Differenz auflösen, bevor `tsconfig.json` angefasst wird — sonst wandert die Restmenge in einen Zustand, in dem `pnpm typecheck` rot ist und nicht mehr unterscheidbar ist, was von wo kommt.

  **12. Das Flag.** In der Wurzel-`tsconfig.json`, Zeile 25:

  ```json
      "strictNullChecks": true,
  ```

  Danach `cd /home/spw/spaceland/shadow-objects && pnpm typecheck` — grün, ohne zusätzliche Schalter. Ab hier ist das Zählkommando aus dem Plan-Kopf gegenstandslos; es hat seinen Zweck erfüllt und wird in keinem weiteren Paket gebraucht.

  **13. Die Doku.** In `packages/shadow-objects/docs/api-reference.md`:

  - Zeile 120, Signatur von `provideContext` — der Parameter bekommt den zweiten Reader-Zweig:

    ```markdown
    - **Signature:** `provideContext<T>(name: string | symbol, sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>, options?): Signal<T | undefined>`
    ```

  - Zeile 128, Signatur von `provideGlobalContext` — dieselbe Ersetzung.
  - Die Methodentabelle von `RemoteWorkerEnv` (`:991-996`) bekommt eine Zeile für `start()`, zwischen `applyChangeTrail(...)` und `destroy()`. Das ist der offene Kleinbefund aus Paket 5, und er läuft hier mit, weil die drei Methoden sich seither gleich verhalten und die Tabelle zwei davon führt:

    ```markdown
    | `start()` | Spawn the worker and wait for the load handshake. Rejects with a `WorkerDestroyedError` after `destroy()`. |
    ```

  - **Ausdrücklich nicht angefasst**: `docs/concepts.md:314-316`, `docs/guides.md:269-271`, `docs/best-practices.md:252-254` und `docs/cheat-sheet.md:134-136` zeigen `provideContext(name, signal)` als Beispiel ohne Signatur — die Beispiele werden durch Schritt 2 erst typkorrekt und brauchen kein Wort. Der `Kernel`-Abschnitt (`api-reference.md:1296-1340`) bleibt ebenfalls, wie er ist: `getEntityGraph()`, `traverseLevelOrderBFS()` und `findShadowObjects()` behalten Zusage und Rückgabetyp. `README.md` nennt keine der geänderten Signaturen.

  **14. CHANGELOG, beide Seiten.** In `packages/shadow-objects/CHANGELOG.md` als erste Bullets unter `## [Unreleased]` — der Sammel-Eintrag für alle drei Teilpakete, der die vorhandenen Bullets aus den Paketen 3 bis 5 **ergänzt und nicht wiederholt**:

  ```markdown
  - **Types:** the emitted declarations now carry `| undefined` wherever a value can be missing. Visible on `ShaeEntElement.componentContext$` / `viewComponent$` / `token$`, `ShaePropElement.entNode$` / `viewComponent$` / `name$` / `type$`, `ShadowEnv.ns$`, the return of `FrameLoop.start()` and of `filterUndefinedProps()`. Consumers compiling with `strictNullChecks` will see new errors where they relied on a value that was never promised — the promise is the fix.
  - **Types (public API):** `provideContext()` and `provideGlobalContext()` accept a `SignalReader<T>` as their source, next to the `SignalReader<T | undefined>` they already took. Handing an existing signal to a context is the documented way to keep it in sync, and it is now typeable.
  ```

  Beide Bullets sind der Ertrag, den das Flag im Artefakt ankommen lässt. Was **nicht** hineingehört: die 24 Typkorrekturen in `Kernel.ts` selbst. Nachgemessen — `dist/src/in-the-dark/Kernel.d.ts` ist vor und nach diesem Paket byte-gleich, und kein Laufzeitverhalten ändert sich. Ein Bullet dafür wäre eine Meldung über eine Änderung, die kein Konsument sehen kann.

  In der Wurzel-`CHANGELOG.md` ein neuer datierter Abschnitt **oberhalb** des jüngsten (die Datei ist absteigend sortiert), ein bis zwei Bullets: `strictNullChecks` steht in der Wurzel-Konfiguration auf `true`, `pnpm typecheck` hält den Stand, die anderen Pakete brauchten dafür keinen Eingriff. Der Ton der vorhandenen Abschnitte, kurz.

  **15. Nachmessen und die `dist`-Dateiliste belegen.** `pnpm cbt` — oder einzeln `pnpm lint && pnpm typecheck && pnpm build && pnpm test:ci`. Der Build ist diesmal Pflicht und nicht Beiwerk: das Flag wirkt über `tsconfig.lib.json` in den `.d.ts`-Emit, und der Paket-CHANGELOG behauptet in Schritt 14 etwas über dessen Ergebnis. Vorab geprüft, mit dem vollständigen Fix gegen den unveränderten Stand:

  - Die Dateiliste unter `dist/src` ist **identisch** — keine Datei kommt hinzu, keine fällt weg. Das ist die Aussage, die `docs/superpowers/specs/dist-snapshot.txt` absichert, und sie hält.
  - Verschieden sind genau sieben `.d.ts`: `elements/ShaeEntElement`, `elements/ShaePropElement`, `types`, `utils/FrameLoop`, `utils/generateUUID`, `utils/props-utils`, `view/ShadowEnv`. Sechs davon führen ein `| undefined`, das vorher fehlte; `generateUUID` wird vom breiten `string` auf das Template-Literal von `crypto.randomUUID()` genau. Alle sieben sind abwärtskompatibel im Sinne der Zuweisbarkeit *an* die Bibliothek und strenger *aus* ihr heraus — genau das ist der Zweck.
  - `Kernel.d.ts` ist unverändert.

  Der Implementierer belegt das mit zwei Builds (`find dist/src -type f | sort` vor und nach) und nennt die Differenz im Report. Weicht sie von dieser Liste ab, ist etwas anderes passiert als geplant.

  **16. Die beiden Snapshots in `docs/superpowers/specs/` werden in diesem Paket nicht aktualisiert.** Begründung: `dist-snapshot.txt` ist eine Dateiliste, und die bleibt gleich (Schritt 15) — das Paket berührt sie inhaltlich nicht. `dist-package.json.snapshot` beschreibt Version und Abhängigkeiten und wird von diesem Paket überhaupt nicht angefasst. Dass beide gegenüber dem heutigen Build veraltet sind (Paket 5: Version `0.30.2` statt `0.33.0`, `signalize ^0.29.0` statt `^0.30.0`, eine `tsconfig.lib.tsbuildinfo`-Zeile, die der Build nicht mehr ablegt), ist ein vorbestehender Zustand, der nichts mit `strictNullChecks` zu tun hat. Ihn im Schlusspaket eines Laufs mitzunehmen hieße, einen fremden Befund in einen Commit zu schieben, den kein Kommando prüft — die Snapshots werden von keinem Task gelesen. Sie gehen als eigener Befund ins nächste Audit. **Wer sie zur Verifikation heranzieht, muss das wissen**: sie sind heute keine belastbare Referenz.

  **17. Was in diesem Paket ausdrücklich liegen bleibt.** Der Kernel trägt Defekte, die dieser Compilerlauf nicht zeigt — sie hier mitzunehmen wäre ein zweites Paket im ersten:

  - `Kernel.destroy()` (`:836`) ruft `this.traverseLevelOrderBFS().reverse()`. `traverseLevelOrderBFS()` gibt `#allEntities` **direkt** heraus, nicht als Kopie; `.reverse()` dreht damit den Cache des Kernels in place um. Folgenlos, weil `destroyEntity()` ohnehin `#allEntitiesNeedUpdate` setzt — aber `traverseLevelOrderBFS(true)` wäre der Weg, den die Methode selbst anbietet, und ein `readonly Entity[]` als Rückgabetyp würde den Griff verhindern. Nebenbefund fürs nächste Audit.
  - `upgradeEntities()` (`:158`) deklariert `new Map<String, …>` mit dem Boxed-Typ `String` statt `string`. Läuft, weil `string` zuweisbar ist; ein Tippfehler, den kein Flag anzeigt.
  - `traverseLevelOrderBFS` (`:113`) und `changeProperties` (`:334`) gehen über `getEntity()`, das wirft. Eine Change-Trail-Zeile für eine Entity, die der Kernel nicht führt, reißt damit den Worker-Lauf mit — vorbestehend und über dieses Finding hinaus.
  - Der offene Nebenbefund aus Paket 4 bleibt offen: `MessageRouter.route()` (`:42`, `:56`) und `WorkerRuntime.onmessage` (`:9`, `:13`) dereferenzieren `event.data` ungeprüft. Weil der Typ `any` ist, sieht `strictNullChecks` das auch nach diesem Paket nicht — das Flag ist hier keine Hilfe, es braucht eine Eingangsprüfung des Worker-Protokolls. Eigenes Paket, nächstes Audit.
  - `Registry.ts:45`, `:55`, `:99`, `:110` benutzen weiter `has()` + `get()!`, wo `Kernel.ts` nach diesem Paket den geholten Wert prüft. Die vier `!` stehen unmittelbar hinter ihrem Guard, sind korrekt und vom Compiler akzeptiert; sie umzubauen ist eine Stilangleichung ohne Fehlerdruck und verwässert den Commit, der das Flag scharfschaltet. Stilbefund fürs nächste Audit.
  - Die 4 × TS4111 in `packages/shadow-objects-e2e/playwright.config.ts` und der Umstand, dass die Datei in keiner Konfiguration mit `include` steht. Vorbestehend, flagunabhängig.
  - Aus Paket 3 unverändert offen: die Erholungszusage »Entities kommen aus der Component Memory zurück« ist in keinem Fall geprüft, und der `try/catch` um `onProxyFailed` in `RemoteWorkerEnv` hat keinen. Testlücken zu Zusagen, die dieser Lauf aufgestellt hat — sie gehören benannt, aber nicht in ein Paket über Nullbarkeit.
  - `throw data.error` in `RemoteWorkerEnv.ts:235` und `:259` samt der Reihenfolgefrage aus Paket 4, das fehlende `return` im `catch` von `MessageRouter.ts:87-96`, DEFECT-1 aus `KNOWN-DEFECTS.md`, `ShadowEnv.ts:86-88` ohne Eigentümerprüfung, `ShaeEntElement.ts:245-259` (Observer zerstört sich beim Umsortieren im selben Elternknoten) und `findShadowRootHost()` (`:188-205`) mit dem Cast-Muster der reparierten Stelle. Alle vorbestehend, alle bereits in den Paketen 4 und 5 als solche verzeichnet.

- Verify: `cd /home/spw/spaceland/shadow-objects && pnpm lint && pnpm typecheck && pnpm build && pnpm test:ci && pnpm exec turbo run test --filter=shadow-objects-e2e --force`, dazu das Zählkommando aus Schritt 11 mit dem Sollwert **0** und der Dateilistenvergleich aus Schritt 15. `pnpm typecheck` läuft diesmal **ohne** zusätzlichen Schalter — das ist der Punkt des Pakets. `pnpm build` gehört dazu, weil die `.d.ts` neu emittiert werden und der CHANGELOG eine Aussage über sie trifft. Die E2E-Suite gehört dazu, weil `Kernel` in ihr über den echten Worker-Roundtrip läuft und die Umbauten an `updateShadowObjects`, `createShadowObjects` und `destroyEntity` genau dort ankommen; sie muss über turbo starten, nicht über `pnpm -F` direkt (Befund aus Paket 1).
- Commit: `fix: type the null cases in the kernel and turn strictNullChecks on (STRICT-NULL, 3/3)`
**STRICT-NULL · high · `tsconfig.json:26-30`** — strict: true, aber strictNullChecks: false — 60 verdeckte Typfehler

Die Root-Konfiguration setzt strict: true und hebt strictNullChecks anschließend wieder auf. Gegenprobe mit aktiviertem Flag: 60 Fehler in 12 Dateien, Schwerpunkt Kernel.ts (24), ComponentContext.ts (7), RemoteWorkerEnv.ts (5), ShaeEntElement.ts (5). Das ist kein theoretisches Risiko — mindestens ELEM-OBS-001 (null.host) und ELEM-VC-001 (vc.parent auf undefined) in diesem Backlog sind Nullreferenz-Defekte, die der Compiler bei aktivem Flag angezeigt hätte. Solange es aus ist, ist jede Null-Aussage im gesamten Paket ungeprüft, und die vielen ?-Operatoren im Code sind Vermutung statt Zusage.

Empfehlung: Schrittweise aktivieren: strictNullChecks in tsconfig.lib.json für einzelne Verzeichnisse einschalten und von den kleinen Modulen (utils/, worker/) zu den großen arbeiten. Kernel.ts zuletzt. Solange nicht alles läuft, hält ein separates tsconfig.strict.json in CI den erreichten Stand fest, damit er nicht zurückfällt.

</details>

### [x] 7. Testlücken und Registry-Angleich aus diesem Lauf schließen

- Folge von: Paket 3 (zwei Testlücken), Paket 6 (eine Testlücke), Paket 4 (Stil-Rest des Teilumbaus)
- Ziel: Die Punkte, die dieser Lauf selbst hinterlassen hat, sind geschlossen, statt als vorgeschichtslose Befunde im nächsten Audit aufzuschlagen.
- Hash: `aa74955`
- Ergebnis: 3 Runden · alle vier Umfangspunkte geschlossen · drei neue Testfälle (Erholung aus der Component Memory in `ShadowEnv.spec.ts` und in der E2E-Seite, werfender `onProxyFailed` in `RemoteWorkerEnv.spec.ts`, Guard in Schleife 1 von `upgradeEntities()` in `Kernel.spec.ts`), `Registry.ts` auf ein Idiom gebracht — keine Nicht-Null-Behauptung mehr in der Datei · E2E 322 → 324 · Doku-Zusage zur Erholung an drei Fundstellen neu gefasst: sie benannte die falsche Seite (»the View Layer is rebuilt« — die View bleibt, die Entity-Seite entsteht neu) und unterschlug den nötigen Sync · `Backlog.md` auf den Stand nach diesem Lauf gebracht
- Bemerkenswert: Der Reviewer hat die Rücknahme-Belege des Implementierers nicht übernommen, sondern eigene Mutationen gefahren — allein für den Erholungsfall fünf (Memory-Schreibzugriff, `parentUuid`, `order`, Properties, Token), jede mit genau einem roten Fall an der zuständigen Zusicherung. Kein Fall dieses Pakets ist grün-auf-kaputt. In Runde 2 fiel auf, dass Runde 1 beim Backlog-Aufräumen VIEW-1 komplett als behoben gestrichen hatte, obwohl der Teardown-Teil offen ist; der frische Implementierer hat daraufhin alle 19 Streichungen einzeln gegen die Fundstelle geprüft — sechs trugen nicht.
- Klein, offen geblieben: `Backlog.md:129` begründet die bewusste Auslassung in `destroy()` unter anderem damit, der `Destroyed`-Wartelauf solle seinen Timeout behalten — der sieht den Controller aber nie, weil `destroy()` `waitForMessageOfType` ohne das fünfte Argument ruft · der §4.4-Swap-Bullet fasst die abgedeckte Gegenrichtung großzügiger als §4.2, wo sie präzise steht
- Nebenbefunde: `packages/shadow-objects-e2e/src/worker-failure.js:128` endet ohne Zeilenumbruch, vorbestehend · die Nummerierung in §7.1/§7.2/§7.3 des Backlogs läuft durchgehend 1…22 über drei Abschnitte
- Folgen: —
- **Bewusst offen gelassen, jetzt korrekt im Backlog verzeichnet**: `RemoteWorkerEnv.destroy()` (`:266-279`) bricht den `#workerFailure`-Controller nicht ab; ein `applyChangeTrail`, das beim Teardown schon unterwegs ist, läuft in den 5-Sekunden-`WorkerChangeTrailTimeout`, statt abgewickelt zu werden. Das ist die Auslegung aus Paket 3 und keine Folge dieses Laufs — ein `abort()` dort wäre eine Verhaltensänderung, die kein Paket beschlossen hat. Steht als VIEW-1 (Teardown-Teil), in §4.4 und in §7.1 Punkt 4 des Backlogs.

<details><summary>Detailplan (erledigt)</summary>


- **Abgleich, Zug 0, Stand `8f9475c`.** Jeder der vier Umfangspunkte an der Fundstelle nachgesehen:

  | # | Sachverhalt | Fundstelle heute | Urteil |
  |---|---|---|---|
  | 1 | Erholungszusage ungeprüft | `view/ShadowEnv.spec.ts:521-534` prüft `isReady` und `destroyCount`, sonst nichts; `packages/shadow-objects-e2e/src/worker-failure.js:87` räumt mit `host.innerHTML = ''` alles weg, bevor der neue Proxy kommt; Zusage in `CHANGELOG.md:23`, `docs/api-reference.md:842`, `docs/guides.md:498` | unverändert |
  | 2 | `try/catch` um `onProxyFailed` ohne Fall | `view/RemoteWorkerEnv.ts:312-316`, das `emit` dahinter in `:318-324`; `RemoteWorkerEnv.spec.ts` führt 11 Fälle unter `describe('worker failure')`, keiner davon | unverändert |
  | 3 | Guard in Schleife 1 von `upgradeEntities()` ohne Test | `in-the-dark/Kernel.ts:180` (`if (!this.hasEntity(entity.uuid)) continue;`), Schleife 2 mit demselben Guard in `:185`; der einzige Fall dazu ist `Kernel.spec.ts:1463-1502` und trifft ausschließlich Schleife 2 | unverändert, Zeilennummer bestätigt |
  | 4 | Zwei Idiome in `Registry.ts` | `has()` + `get()!` in `:44-45` (`define`), `:54-55` (`appendRoute`, `truthyPropRoutes`-Zweig), `:98-99` und `:109-110` (`findTokensByRoute`, `truthyProps`-Block); `get()` + Guard in `:60-65`, `:81`, `:90-93` | unverändert, vier Zeilen bestätigt |

  Eine Korrektur am Grobplan, ohne Folge für den Umfang: `:45` liegt in `define()`, nicht in `appendRoute()`. Die vier Zeilen sind die richtigen, nur die Zuordnung im Umfangstext ist es nicht.

- **Was der Code bei Punkt 1 tatsächlich leistet** — nachgelesen, bevor irgendein Fall geschrieben wird, denn davon hängt ab, was der Fall behaupten darf:

  `ShadowEnv` hält einen Effekt über `viewReady` und `proxyReady` (`ShadowEnv.ts:65-79`). Wird der zweite Proxy bereit, läuft der Rumpf erneut und ruft `this.view!.reCreateChanges()` (`:67`), danach `emit(ContextCreated)`. `ComponentContext.reCreateChanges()` (`ComponentContext.ts:372-399`) zieht mit `buildChangeTrails(false)` die noch offenen Änderungen ab, baut dann für jede Komponente, die die `ComponentMemory` führt, eine frische `ComponentChanges` mit `create(token, parentUuid, order, autoDestructionOnParentRemoval)` samt aller Properties, übernimmt die anstehenden Ereignisse und leert die Memory. Der Zustand steht damit als **anstehende Änderung** bereit — versendet wird er erst vom nächsten Sync (`ShadowEnv.#syncNow` → `buildChangeTrails()` → `envProxy.applyChangeTrail()`).

  Zwei Dinge folgen daraus, und beide gehören in den Wortlaut der Doku (Schritt 2):

  - Neu aufgebaut wird nicht »die View« — die war nie weg. Neu aufgebaut wird der **Entity-Baum in der neuen Umgebung**, aus der Component Memory der View.
  - Es braucht einen Sync. `ready()` allein schiebt nichts hinüber. Wer `<shae-worker auto-sync>` fährt oder ohnehin je Frame synct, merkt das nie; wer von Hand synct, schon.

  Der Mechanismus selbst trägt: `ComponentContext.spec.ts:367-417` belegt für `reCreateChanges()` bereits Token, Parent, Order und Properties auf Trail-Ebene. Ungeprüft ist die **Verkabelung** — dass der Proxywechsel ihn auslöst und dass am anderen Ende wirklich Entities stehen.

- **Wohin der Nachweis gehört.** Zwei Ebenen, mit Absicht:

  1. `ShadowEnv.spec.ts` mit einem Doppelgänger als erstem und einer `LocalShadowObjectEnv` als zweitem Proxy. Dort liegt der Mechanismus, dort ist er deterministisch und in Millisekunden prüfbar, und dort lässt sich der Beweis am schärfsten stellen: nicht »der Trail sieht richtig aus«, sondern `kernel.hasEntity(uuid)` in einer Umgebung, die es vorher nicht gab.
  2. Die E2E-Seite `worker-failure`, weil die Zusage von einem gestorbenen **Worker** handelt und die Doku `new RemoteWorkerEnv()` vorführt. Nur dort läuft der Weg über echtes `postMessage`, echte Custom Elements und einen zweiten Worker-Thread. Und es ist die Seite, die die Zusage heute ausdrücklich umgeht — sie zu belassen, wie sie ist, hieße den einen Ort auszusparen, an dem die Lücke sichtbar wurde.

  **Nicht** in `packages/shadow-objects-testing/`. Diese Ebene läge zwischen beiden und brächte nichts Eigenes: die Erholung sitzt in `ShadowEnv`/`ComponentContext`, die (1) direkt anfasst, und die Element-Verdrahtung kreuzt (2) ohnehin mit. Ein dritter Fall wäre Browserstart für eine Aussage, die zweimal schon dasteht.

- Dateien:
  - `packages/shadow-objects/src/view/ShadowEnv.spec.ts` (Fall 1a)
  - `packages/shadow-objects/docs/api-reference.md` (`:842`)
  - `packages/shadow-objects/docs/guides.md` (`:498`)
  - `packages/shadow-objects/CHANGELOG.md` (`:23`, zweiter Satz des vorhandenen Bullets)
  - `packages/shadow-objects-e2e/src/worker-failure.js` (Fall 1b)
  - `packages/shadow-objects-e2e/tests/worker-failure.spec.ts` (eine Test-Id)
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts` (Fall 2)
  - `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts` (Fall 3)
  - `packages/shadow-objects/src/in-the-dark/Registry.ts` (Angleich, vier Stellen)
  - `packages/shadow-objects/src/in-the-dark/Registry.spec.ts` (ein Fall, empfohlen)

- **Die Rot-Regel dieses Pakets.** Es gibt keinen Defekt zu beheben, also auch keinen roten Lauf im gewohnten Sinn. An seine Stelle tritt der **Rücknahme-Beleg**: Für jeden der drei Fälle ist unten genannt, welche eine Zeile der Implementierer versuchsweise auskommentiert und welche Ausgabe dann erscheinen muss. Der Fall wird geschrieben, grün gesehen, die Zeile zurückgenommen, rot gesehen, die Zeile wiederhergestellt, grün gesehen. Erscheint beim Zurücknehmen **nicht** die genannte Ausgabe, greift der Fall am Mechanismus vorbei und ist wertlos — dann den Fall korrigieren, nicht die Zeile.

- Vorgehen:

  **1. Fall 1a — die Erholung in `ShadowEnv.spec.ts`.** In den vorhandenen Block `describe('a proxy that fails')` (`:414`), als letzter Fall hinter `recovers with a new proxy`. Der vorhandene Fall bleibt unverändert stehen; er hält den Proxy-Wechsel selbst fest, der neue hält fest, was dabei mitkommt.

  ```ts
  it('re-creates the entities in the new environment from the component memory', async () => {
    const {env, proxy} = await makeEnv();

    @ShadowObject({token: 'recovery-child'})
    class Survivor {}

    expect(Survivor).toBeDefined();

    const parent = new ViewComponent('recovery-parent', {context: env.view});
    const child = new ViewComponent('recovery-child', {context: env.view, parent, order: 7});
    child.setProperty('foo', 'bar');

    // the memory is written by this cycle, not by the proxy: what comes back later
    // comes from the view side
    await env.syncWait();

    proxy.fail(new Error('the worker went away'));
    expect(env.isReady).toBe(false);

    const localEnv = new LocalShadowObjectEnv();
    env.envProxy = localEnv;
    await env.ready();

    // no component is touched between the failure and this sync: nothing is replayed
    await env.syncWait();

    expect(localEnv.kernel.hasEntity(parent.uuid)).toBe(true);
    expect(localEnv.kernel.hasEntity(child.uuid)).toBe(true);

    const childEntity = localEnv.kernel.getEntity(child.uuid);
    expect(childEntity.parentUuid).toBe(parent.uuid);
    expect(childEntity.order).toBe(7);
    expect(Object.fromEntries(childEntity.propEntries())).toEqual({foo: 'bar'});

    expect(localEnv.kernel.findShadowObjects(child.uuid)).toHaveLength(1);
    expect(localEnv.kernel.findShadowObjects(child.uuid)[0]).toBeInstanceOf(Survivor);

    env.destroy();
  });
  ```

  Sieben Zusicherungen, und jede einzelne hat einen Grund: `hasEntity` ist die Zusage selbst, `parentUuid` der Baum, `order` genau der Wert, den VIEW-18 und KERN-8 auf beiden Seiten schon einmal auseinanderlaufen ließen, `propEntries()` die Properties, `findShadowObjects` das, was ein Anwender am Ende sieht. Alle Imports stehen bereits im Kopf der Datei (`ShadowObject`, `ViewComponent`, `LocalShadowObjectEnv`); `Registry.get().clear()` und `ComponentContext.get().clear()` im `afterEach` (`:14-17`) räumen Token und Kontext wieder ab.

  Vier Punkte, an denen der Fall kippt, wenn man sie übersieht:

  - Der **erste** Proxy muss der `FailingProxy` aus dem Block sein, nicht die `LocalShadowObjectEnv`: nur er lässt sich zum Ausfall bringen. Dass er den Change Trail verschluckt, schadet nicht — die `ComponentMemory` wird von `buildChangeTrails()` auf der View-Seite geschrieben, unabhängig davon, was der Proxy damit anstellt.
  - Das `await env.syncWait()` **nach** `env.ready()` ist Pflicht. `reCreateChanges()` stellt die Änderungen nur bereit; ohne Sync erreicht nichts den Kernel. Es hängt auch nicht: `AfterSync` wird seit VIEW-19 auf jedem Zyklus emittiert, auch bei leerem Trail — der Rücknahme-Lauf endet also mit einer Zusicherung, nicht mit einem Timeout.
  - `new ViewComponent(...)` löst von sich aus keinen Sync aus; das tut nur `ShaeElement`. Beide `syncWait()` sind deshalb nötig und keiner ist doppelt.
  - `env.destroy()` nimmt die `LocalShadowObjectEnv` über den `envProxy`-Setter mit; sie braucht kein eigenes `destroy()`.

  **Rücknahme-Beleg:** `packages/shadow-objects/src/view/ShadowEnv.ts:67`, die Zeile `this.view!.reCreateChanges();`, auskommentieren. Erwartete Ausgabe von `pnpm exec vitest src/view/ShadowEnv.spec.ts --run`: `AssertionError: expected false to be true` an `expect(localEnv.kernel.hasEntity(parent.uuid)).toBe(true)` — und **nur** dieser eine Fall rot, `recovers with a new proxy` bleibt grün. Genau das ist die Aussage: der alte Fall merkt von der zurückgenommenen Zeile nichts, der neue schon.

  **2. Der Wortlaut der Zusage.** Der Code löst sie ein, aber nicht so, wie sie dasteht: er baut nicht die View neu auf, und er tut es nicht beim `ready()`, sondern beim nächsten Sync. Drei Stellen, wörtlich:

  - `packages/shadow-objects/docs/api-reference.md:842` — der ganze Absatz wird zu:

    ```markdown
    Recovery from a `ProxyFailed` is a new proxy: `env.envProxy = new RemoteWorkerEnv()`. The setter starts it, and once it is ready the view re-creates its pending changes from the Component Memory. The next `sync()` therefore restores every entity in the new environment -- token, parent, order and properties -- so the application does not have to rebuild its `ViewComponent`s or its markup.
    ```

  - `packages/shadow-objects/docs/guides.md:498` — der Kommentar im Beispiel wird zu:

    ```javascript
    // start over — the next sync restores the entities from the Component Memory
    ```

  - `packages/shadow-objects/CHANGELOG.md:23` — im vorhandenen Bullet der zweite Satz, aus »A new `envProxy` is the way back and rebuilds the View Layer from the Component Memory.« wird:

    ```markdown
    A new `envProxy` is the way back: once it is ready the view re-creates its changes from the Component Memory, so the next sync restores every entity in the new environment.
    ```

    Der Rest des Bullets bleibt Wort für Wort stehen.

  Der Eingriff ist eine Präzisierung, keine Rücknahme: die Entities kommen zurück, ohne dass die Anwendung sie neu abspielt. Nur die Formulierung »the View Layer is rebuilt« benennt die falsche Seite — die View bleibt, die Entity-Seite wird neu aufgebaut —, und »once it is ready« ließ den Sync verschwinden, den es dafür braucht.

  **3. Fall 1b — die E2E-Seite `worker-failure` bekommt einen Überlebenden.** Sie beweist die Zusage heute nicht, weil sie vor der Erholung alles wegräumt. Der Umbau lässt eine harmlose Entity stehen und fragt sie danach in der neuen Umgebung ab. In `packages/shadow-objects-e2e/src/worker-failure.js`:

  - Import ergänzen: `import {waitUntil} from './test-helpers/waitUntil.js';`
  - Die Zeile `host.innerHTML = '<shae-ent token="crasher"></shae-ent>';` (`:46`) wird zu:

    ```js
    host.innerHTML =
      '<shae-ent id="survivor" token="foo"></shae-ent><shae-ent id="crasher" token="crasher"></shae-ent>';

    const survivor = document.getElementById('survivor');
    survivor.viewComponent.setProperty('xyz', 23);

    // `mod-hello.js` reaches the second worker only, so every `helloFromFoo` that ever
    // arrives on this page was produced after the recovery
    const hellos = [];
    on(survivor.viewComponent, 'helloFromFoo', (data) => hellos.push(data));
    ```

    Token `foo` und die Nachricht `helloFromFoo` kommen aus `public/mod-hello.js`, das die Seite ohnehin schon für die Erholung importiert. `mod-hello.js` wird bewusst **nicht** in den ersten Worker importiert: der Überlebende ist dort eine Entity ohne Shadow Object, und genau deshalb ist jede später eintreffende Meldung ein Beweis und keine Nachwirkung.
  - Die Zeilen `:84-87` — Kommentar und `host.innerHTML = '';` — werden zu:

    ```js
    // the documented way back: a new proxy restores the entities from the component memory.
    // Only the crashing entity goes — otherwise the fresh worker meets the same shadow
    // object and dies the same death. The survivor stays where it is, untouched.
    document.getElementById('crasher').remove();
    ```

  - Hinter `testBooleanAction('worker-failure-env-is-ready-again', …)` (`:99`) der neue Fall:

    ```js
    await testAsyncAction(
      'worker-failure-survivor-is-recreated-in-the-new-worker',
      async () => {
        await shadowEnv.syncWait();
        await waitUntil('the survivor to report in from the new worker', () => hellos.length > 0, FailureTimeout);
        if (hellos[0]?.xyz !== 23) {
          throw new Error(`expected the property to survive as xyz=23, got: ${JSON.stringify(hellos[0])}`);
        }
      },
      10000,
    );
    ```

  - In `packages/shadow-objects-e2e/tests/worker-failure.spec.ts` die Id `'worker-failure-survivor-is-recreated-in-the-new-worker'` als letzten Eintrag der Liste ergänzen. `allowConsoleErrors: true` bleibt.

  Zwei Dinge, die der Implementierer wissen muss, bevor er sich über die Reihenfolge wundert: Erstens plant das Entfernen des `<shae-ent id="crasher">` über `ShaeElement.syncShadowObjects()` einen Sync ein, der bei nicht bereiter Umgebung als `#syncAfterContextCreated` liegen bleibt und im Effekt **unmittelbar nach** `reCreateChanges()` losläuft — der Change Trail erreicht den neuen Worker also möglicherweise vor `importScript('/mod-hello.js')`. Das ist unschädlich: `importModule()` ruft am Ende `kernel.upgradeEntities()` (`in-the-dark/importModule.ts:41-42`), die Entity bekommt ihr Shadow Object nachträglich, und `helloFromFoo` kommt trotzdem. Zweitens kostet jede Test-Id einen eigenen Seitenaufruf je Browser (`runPageTests.ts:83-111`) — deshalb **eine** Id mit beiden Zusicherungen im selben `testAsyncAction` und nicht zwei. Der Aufschlag ist damit 2 Seitenaufrufe, nicht 4.

  **Rücknahme-Beleg:** dieselbe Zeile wie bei Fall 1a, `ShadowEnv.ts:67`. Erwartete Ausgabe: der Test `worker-failure-survivor-is-recreated-in-the-new-worker` schlägt fehl mit `timed out after 3000ms waiting for: the survivor to report in from the new worker`; die zehn übrigen Ids der Seite bleiben grün. Weil ein E2E-Lauf dafür einen Build braucht, genügt der schmale Weg: einmal `pnpm build`, dann `cd packages/shadow-objects-e2e && pnpm exec playwright test --project=chromium -g "worker-failure-survivor"`.

  **4. Fall 2 — der `try/catch` um `onProxyFailed`.** In `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`, in `describe('worker failure')`, hinter `reports only the first failure`:

  ```ts
  it('announces the failure even when the proxy-failed callback throws', async () => {
    const {env, worker} = await startEnv();

    const failedSpy = vi.fn();
    on(env, 'workerFailed', failedSpy);

    (env as IShadowObjectEnvProxy).onProxyFailed = () => {
      throw new Error('a consumer that cannot cope');
    };

    expect(() => worker.fail('kaboom')).not.toThrow();

    expect(failedSpy).toHaveBeenCalledTimes(1);
    expect(failedSpy.mock.calls[0][0].reason.name).toBe('WorkerFailedError');
    expect(env.isDestroyed).toBe(true);
    expect(worker.terminateCount).toBe(1);
  });
  ```

  `onProxyFailed` ist nur im Interface deklariert, nicht in der Klasse (`RemoteWorkerEnv.ts:313` greift selbst über einen Cast darauf zu). Die Spec braucht deshalb eine zusätzliche Import-Zeile: `import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';`. Der Fall ist der Spiegel von `drops the context even when a ProxyFailed listener throws` in `ShadowEnv.spec.ts:487-501` — dort wirft ein Hörer und die Umgebung zieht ihre Folgerung trotzdem, hier wirft der Rückruf und das Ereignis geht trotzdem hinaus. Dass `handleWorkerFailure` den Wurf verschluckt statt ihn weiterzureichen, ist kein Widerspruch: der Rückruf ist ein interner Kanal zu genau einem Abnehmer, das Ereignis die öffentliche Bekanntmachung an beliebig viele.

  **Rücknahme-Beleg:** in `RemoteWorkerEnv.ts:312-316` den `try/catch` durch die nackte Zeile `(this as IShadowObjectEnvProxy).onProxyFailed?.(reason);` ersetzen. Erwartete Ausgabe: `expected function not to throw an error but it threw Error: a consumer that cannot cope`, und im selben Lauf `expected "spy" to be called 1 times, but got 0 times`. Die zehn anderen Fälle des Blocks bleiben grün — keiner von ihnen setzt `onProxyFailed`.

  **5. Fall 3 — der Guard in Schleife 1 von `upgradeEntities()`.** Der vorhandene Fall (`Kernel.spec.ts:1463-1502`) trifft Schleife 2, weil er über `[onCreate]` zerstört. Schleife 1 verlangt einen Ausfall über `[onDestroy]`, und dabei ist die Reihenfolge alles: Schleife 1 läuft über `traverseLevelOrderBFS(true)`, also **rückwärts**. Wer die Vorlage bloß auf `[onDestroy]` umschreibt, trifft den Guard nie und hat einen Fall, der auch ohne ihn grün bleibt.

  Als zweiter Fall in denselben `describe`-Block:

  ```ts
  it('skips an entity the destroy pass removed from the snapshot', () => {
    const registry = new Registry();
    const kernel = new Kernel(registry);

    const [aUuid, bUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

    @ShadowObject({registry, token: 'destroysTheFirstEntity'})
    class DestroysTheFirstEntity implements OnDestroy {
      [onDestroy]() {
        kernel.destroyEntity(aUuid);
      }
    }

    @ShadowObject({registry, token: 'marker'})
    class Marker {}

    expect(DestroysTheFirstEntity).toBeDefined();
    expect(Marker).toBeDefined();

    // the route has to exist before the entity, otherwise it never gets the shadow object
    // whose [onDestroy] the upgrade is about
    registry.appendRoute('entC', ['destroysTheFirstEntity']);

    kernel.createEntity(aUuid, 'entA');
    kernel.createEntity(bUuid, 'entB');
    kernel.createEntity(cUuid, 'entC');

    expect(kernel.findShadowObjects(cUuid)).toHaveLength(1);

    // dropping the route is what makes the destroy pass tear that shadow object down
    registry.clearRoute('entC');
    registry.appendRoute('entB', ['marker']);

    // The destroy pass walks the snapshot in reverse — C, B, A. C destroys A from its
    // [onDestroy], so A is gone by the time the pass reaches it.
    expect(() => kernel.upgradeEntities()).not.toThrow();

    expect(kernel.hasEntity(aUuid)).toBe(false);

    // B sits behind C in the reversed snapshot and must still have been upgraded.
    expect(kernel.findShadowObjects(bUuid)).toHaveLength(1);
    expect(kernel.findShadowObjects(bUuid)[0]).toBeInstanceOf(Marker);

    kernel.destroy();
  });
  ```

  Warum das genau Schleife 1 trifft und nicht Schleife 2: `#rootEntities` hält die Einfügereihenfolge, alle drei Entities stehen auf Tiefe 0, `#allEntities` ist also `[A, B, C]` und `#allEntitiesReversed` `[C, B, A]` (`Kernel.ts:118-150`). Schleife 1 nimmt C zuerst, `updateShadowObjects(C, DestroyOnly)` findet nach `clearRoute('entC')` keine Konstruktoren mehr, baut das Shadow Object ab, `destroyShadowObject` ruft `[onDestroy]` (`Kernel.ts:832-840`), und das zerstört A. Wenn die Schleife bei A ankommt, ist es weg — der Guard in `:180` greift. Das Array, über das iteriert wird, bleibt dabei unangetastet: `destroyEntity` setzt nur `#allEntitiesNeedUpdate = true` (`:305`), und der Neuaufbau legt neue Arrays an, statt die bestehenden zu ändern. Schleife 2 ruft `traverseLevelOrderBFS(false)` danach erneut auf, bekommt die frische Liste ohne A und läuft deshalb gar nicht erst in ihren eigenen Guard — der Fall bleibt sauber auf Schleife 1.

  Alles Nötige ist in der Spec bereits importiert (`OnDestroy`, `onDestroy`, `Registry`, `ShadowObject`, `generateUUID`).

  **Rücknahme-Beleg:** in `packages/shadow-objects/src/in-the-dark/Kernel.ts:180` die Zeile `if (!this.hasEntity(entity.uuid)) continue;` auskommentieren — **nur die in Schleife 1**, die in `:185` bleibt stehen. Erwartete Ausgabe: `expected [Function] not to throw an error but it threw Error: entity with uuid "…" not found!`, und der Fall aus Paket 6 (`skips the destroyed entity and upgrades the ones behind it`) bleibt dabei grün. Umgekehrt gilt dasselbe: nimmt man `:185` zurück, bleibt der neue Fall grün und der alte wird rot. Erst beide Fälle zusammen decken beide Guards, und die Kreuzprobe ist der Beleg dafür.

  **6. `Registry.ts` — Angleich, vier Stellen, keine Verhaltensänderung.** Jede Stelle einzeln, Zielform ausgeschrieben. Alle vier folgen dem Muster, das `:60-65` seit Paket 4 führt: einmal holen, prüfen, benutzen.

  - `:44-45`, in `define()`:

    ```ts
    const entry = this.#registry.get(token);
    if (entry) {
      appendTo(entry.constructors, constructa);
    } else {
      this.#registry.set(token, {token, constructors: [constructa]});
    }
    ```

  - `:54-55`, im `propRoute`-Zweig von `appendRoute()`:

    ```ts
    const knownPropRoutes = this.#truthyPropRoutes.get(propRoute.key);
    if (knownPropRoutes) {
      addRoutes(knownPropRoutes.routes, routes);
    } else {
      this.#truthyPropRoutes.set(propRoute.key, {routes: new Set(routes), token: propRoute.token});
    }
    ```

  - `:97-101`, die erste Schleife im `truthyProps`-Block von `findTokensByRoute()`:

    ```ts
    for (const prop of truthyProps) {
      const propRoutes = this.#truthyPropRoutes.get(prop);
      if (propRoutes) {
        addRoutes(tokens, propRoutes.routes);
      }
    }
    ```

  - `:106-113`, die verschachtelte Schleife darunter:

    ```ts
    for (const token of new Set(tokens)) {
      for (const prop of truthyProps) {
        const keyedRoutes = this.#truthyPropRoutes.get(`${token}@${prop}`);
        if (keyedRoutes) {
          addRoutes(tokens, keyedRoutes.routes);
        }
      }
    }
    ```

    Die lokale Konstante `key` entfällt dabei, weil sie nur noch einmal gebraucht wird. Die `do/while`-Schleife und ihre Abbruchbedingung über `tokens.size` bleiben unverändert.

  **Kein `!` bleibt übrig.** Beide Maps tragen Werte, die niemals falsy sein können — `RegistryEntry`- bzw. Objektliterale und `Set`-Instanzen —, `has(k)` und `get(k) != null` entscheiden also identisch. Damit ist keine der vier Stellen ein Fall (c), und die Datei führt danach genau ein Idiom. Nebenbei fällt je ein zweiter Map-Lookup weg; das ist Beiwerk, nicht der Grund.

  **7. Ein Fall für `Registry.spec.ts`, empfohlen und nicht Pflicht.** Nachgemessen ist von den vier Stellen genau eine von keinem Test durchlaufen: der `has()`-Zweig in `:54-55`, also das **Zusammenführen** zweier `appendRoute`-Aufrufe auf denselben Prop-Route-Schlüssel. (`:45` deckt `Kernel.spec.ts` mit `create shadow-objects by same token` ab, `:99` und `:110` decken `prop based routings - simple` und `- advanced`.) Solange dort kein Fall steht, ruht die Behauptung »verhaltensgleich« für diese eine Stelle allein auf dem Lesen. Vier Zeilen heben das auf:

  ```ts
  it('merges routes appended to the same prop route twice', () => {
    const registry = new Registry();

    registry.appendRoute('@x', ['abc']);
    registry.appendRoute('@x', ['xyz']);

    expect(Array.from(registry.findTokensByRoute('foo', new Set(['x']))).sort()).toEqual(['abc', 'foo', 'xyz']);
  });
  ```

  Der Fall ist gegen beide Fassungen grün — er ist kein Rücknahme-Beleg, sondern eine Abdeckungslücke, die beim Vorbeigehen zufällt. Wer ihn weglässt, sagt das im Report.

  **8. CHANGELOG — ein Eintrag, und es ist nicht der, den man erwartet.** Die drei Testfälle bekommen keinen: sie bestätigen Zusagen, die dieser Lauf bereits angekündigt hat, und ein Konsument kann aus »das Versprochene ist jetzt auch geprüft« nichts ableiten. Der `Registry.ts`-Angleich bekommt keinen: kein Verhalten, keine Signatur, keine `.d.ts` bewegt sich. Was bleibt, ist Schritt 2 — und der wird **im vorhandenen Bullet** `CHANGELOG.md:23` erledigt, nicht als neues daneben. Der Eintrag steht unter `## [Unreleased]`, kein Konsument hat ihn je gesehen; einen zweiten Punkt anzufügen, der einen Satz im ersten richtigstellt, wäre Buchhaltung über den eigenen Schreibvorgang. Kein Eintrag in der Wurzel-`CHANGELOG.md`: weder Build noch Tooling noch CI sind betroffen. Die neue E2E-Id ist eine Testerweiterung im selben Sinn und ändert an dieser Rechnung nichts.

  **9. Was in diesem Paket ausdrücklich liegen bleibt.** Der Lauf endet hier; alles Folgende ist vorbestehend, war nie im Scope und geht als Befund ins nächste Audit — nicht als Mangel dieses Laufs:

  - Die vollständige Liste steht in Paket 6, Schritt 17, und gilt unverändert bis auf den dortigen letzten Punkt zu `Registry.ts:45/55/99/110` (durch Schritt 6 erledigt) und den vorletzten zu den zwei Testlücken aus Paket 3 (durch die Schritte 1 bis 4 erledigt).
  - Neu dazu, in diesem Zug gesehen und nicht angefasst: `ComponentContext.reCreateChanges()` leert die `ComponentMemory` und füllt sie erst mit dem nächsten `buildChangeTrails()` wieder. Zwei Ausfälle hintereinander ohne Sync dazwischen sind trotzdem unkritisch — die beim ersten Mal erzeugten `create`-Änderungen bleiben unversendet stehen und werden vom zweiten `reCreateChanges()` nicht angerührt, weil es bei leerer Memory sofort zurückkehrt. Nachgelesen, kein Defekt, aber eine Kopplung, die kein Test festhält.
  - Die Verify-Kette dieses Pakets fasst den offenen Kleinbefund aus Paket 5 zur `dist`-Snapshot-Veraltung nicht an; er steht in Paket 6, Schritt 16 begründet.

- Verify: `cd /home/spw/spaceland/shadow-objects && pnpm lint && pnpm typecheck && pnpm test:ci && pnpm exec turbo run test --filter=shadow-objects-e2e --force`. Die E2E-Suite ist diesmal Pflicht und nicht Beiwerk: Schritt 3 ändert eine ihrer Seiten und fügt eine Test-Id hinzu. Sie muss über turbo starten, nicht über `pnpm -F` direkt (Befund aus Paket 1). Dazu die drei Rücknahme-Belege aus den Schritten 1, 4 und 5, jeder einzeln, jeder mit der genannten Ausgabe im Report — ohne sie ist das Paket nicht belegt, sondern nur grün.
- Commit: `test: cover the recovery, the failing proxy callback and the upgrade guard`
</details>
