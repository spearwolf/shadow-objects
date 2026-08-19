# Remediation-Plan 2 — @spearwolf/shadow-objects-monorepo

Quelle: ./audit.html vom 2026-08-14 · Branch: main · erstellt: 2026-08-19
Baseline: `pnpm lint` ✓ (2 Infos, nicht blockierend; seit `ce24b9d` nur noch 1 — die Schema-Info ist mit `biome.json` weggefallen) · `pnpm typecheck` ✓ · `pnpm build` ✓ ·
`pnpm test:ci` ✓ 719 Tests (384 + 1 + 334) · `pnpm -F shadow-objects-e2e test` ✓ 402 Tests (Chromium + Firefox)
Scope: 31 von 42 vom Nutzer benannten Findings · 11 sind am aktuellen Code bereits erledigt oder gegenstandslos
Stand (2026-08-19): **Lauf abgeschlossen.** Alle zwölf Pakete committet (Paket 12 in zwei Commits), nichts blockiert, keine offene Folge. Voller Verify gegen die Baseline grün: `pnpm lint` 1 Info (die zweite ist mit `ce24b9d` weggefallen), `pnpm typecheck` ✓, `pnpm build` ✓, `pnpm test:ci` 908 (556 + 7 + 345), `pnpm -F shadow-objects-e2e test` 404 in Chromium und Firefox. `./audit.html` ist nachgeführt: 42 Findings geschlossen, 11 neu eingetragen, Score 39,0 → 81,0. Versionsfelder unangetastet — die Anhebung gehört zum Release und ist am 2026-08-19 abgelehnt worden; die Einstufung steht im Kopf beider Changelogs (`0.33.0` → `0.34.0` und `0.6.0` → `0.7.0`, je minor).
Baseline neu gemessen: `pnpm test:ci` 903 (551 + 7 + 345), e2e 404, `dist` 198 Dateien, `.npm-pkg` 20,
`pnpm lint:ci` 196 Dateien / 2 Infos · Arbeitsbaum sauber

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

Der Lauf vom 2026-08-14 liegt als `remediation-plan.md` im Repo und wird nicht
angefasst. Das Projekt führt nummerierte Pläne (`view-layer-remediation-plan{,-2,-3}.md`);
dieser Lauf schreibt deshalb in `remediation-plan-2.md` statt den Vorgänger zu überschreiben.

## Vorbedingung: das Audit ist fünf Tage alt

`audit.html` beschreibt den Stand vom 2026-08-14. Seither liefen ein Toolchain-Renewal
(pnpm 9.15 → 11, TypeScript 6 → 7, vite → 7, biome 2.4 → 2.5, Playwright 1.59 → 1.62,
turbo 2.9 → 2.10) und drei Remediation-Läufe über den View Layer. Vor der Planung wurde
jedes der 42 benannten Findings gegen den aktuellen Code gehalten. Ergebnis:

**Erledigt oder gegenstandslos — nicht Teil des Scopes (11):**

| ID | Befund am aktuellen Code |
| --- | --- |
| `TYPO-001` | `#reRequestParentAsRoot`, `unsubscribe` — beide Bezeichner korrekt geschrieben |
| `ELEM-OBS-002` | `onParentChanged()` legt den Observer neu an, mit Kommentar zur Begründung |
| `DOM-OBS` | `<shae-prop>` verfolgt seinen Host event-basiert (`#onReRequestHost`, `#listenForHostChanges`) statt über einen MutationObserver |
| `PROP-FALSY-001` | `value = value ?? undefined` — nur null und undefined bedeuten »kein Wert« |
| `RWE-DESTROY-002` | `destroy()` ruft `#workerFailure.abort(new WorkerDestroyedError())` |
| `WORKER-002` | Der localStorage-Zugriff sitzt gehärtet im `ConsoleLogger`, abgesichert durch `ConsoleLogger.storage.spec.ts` |
| `DEP-EVENTIZE-001` | Katalog führt `@spearwolf/eventize: ^6.0.0` |
| `DEP-UNUSED-001` | jsdom und `@types/react` sind aus Katalog und devDependencies entfernt |
| `SNAPSHOT-001` | Die Snapshot-Dateien existieren nicht mehr; `CLAUDE.md` verweist nicht mehr auf sie |
| `DEPS-001` | `pnpm outdated -r` meldet noch vier Einträge: vite und turbo sind dokumentierte Holdbacks, biome 2.5.8 → 2.5.9 geht in Paket 1, `@types/node` 24 → 26 bleibt bewusst liegen |
| `TEST-001` (halb) | `RemoteWorkerEnv.spec.ts` steht; `MessageRouter` und `WorkerRuntime` haben weiterhin keine Spec — dieser Rest ist Paket 2 |

`PROP-NAN` ist ebenfalls halb erledigt: der Konvertierungsblock läuft in try/catch und meldet
über den Logger. Was fehlt, ist die NaN-Prüfung der numerischen Pfade. Nur dieser Rest ist im Scope.

## Entscheidungen
- Für Paket 12 entschieden (2026-08-19), auf Vorschlag des Paket-Planers: Das Paket wird in **zwei
  Commits** geteilt, nach dem Kriterium »ändert es, was die Software tut?«. 12a nimmt Code, Werkzeuge und
  die zugehörigen Changelog-Zeilen — jeder Posten hat ein Kommando, das ihn bestätigt; 12b nimmt die
  Gliederung des Unreleased-Abschnitts, `Backlog.md`, die Doku-Absätze und die README-Korrektur, wo der
  einzige Prüfer das Lesen ist. Zwei Arten von Sorgfalt gehören nicht in denselben Commit. Der
  Abschnitt im Plan bleibt einer, mit zwei Schrittblöcken und zwei Betreffzeilen; die Statusmarke geht
  erst auf `[x]`, wenn beide Commits stehen. Die Änderung an `LocalShadowObjectEnv` zählt im gezählten
  Kopf des Changelogs mit (30 → 31), und der Versatz von 2 zwischen Kopfzahl und Semikolon-Gliedern wird
  dabei geschlossen: die dreigliedrige Teardown-Gruppe wird mit Gedankenstrichen zu einem Glied
  verbunden, statt die Kopfzahl auf 33 zu heben — danach ist die Zahl mit einem Kommando prüfbar. Die
  beiden Ausdrücke in `ShaeEntElement.ts` werden zusammengezogen, weil die Trennung zwischen gepuffertem
  und frischem Wert dadurch einen Namen bekommt. Punkt 15 des Backlogs bleibt unangetastet (drei
  API-Entwürfe, kein Finding, keine Folge), und `sinon`/`@types/sinon` in der Wurzel bleiben stehen —
  beides geht ins nächste Audit.
- Für Paket 11 entschieden (2026-08-19), auf Vorschlag des Paket-Planers: Die vier Timeouts der
  Worker-Brücke kommen aus einer Konstruktor-Option (`new RemoteWorkerEnv(options?)`) und aus vier
  Attributen an `<shae-worker>` — **keine statische Voreinstellung**, weil eine prozessweit umschreibbare
  dritte Quelle eine eigene Vorrangregel bräuchte, Testläufe reihenfolgeabhängig macht und genau der
  Gattungsfehler ist, den `GLOBAL-SINGLETON` an drei anderen Stellen beschreibt. Vier getrennte Schlüssel
  statt einer Sammelzahl: zwischen Load-Handshake und Trail-Bestätigung liegt Faktor zwölf, eine gemeinsame
  Zahl wäre entweder so hoch, dass ein hängender Worker nie auffällt, oder so niedrig, dass sie die langsamen
  Geräte trifft, um derentwillen das Finding geschrieben ist. Die Namen halten den Dreiklang
  `WorkerLoadTimeout` ↔ `loadTimeout` ↔ `load-timeout`. Gültig ist eine endliche Zahl größer null; alles
  andere — `0` und `Infinity` eingeschlossen, für alle vier Schlüssel gleich — wird über `logger.error`
  gemeldet und fällt auf die Konstante zurück, statt zu werfen: ein Wurf aus einer Custom-Elements-Reaktion
  erreicht den Aufrufer von `setAttribute` nicht. Die Attribute werden nicht beobachtet, sondern einmal beim
  Bau der Umgebung gelesen, wie `no-autostart`; unter `local` sind sie wirkungslos und stumm, spiegelbildlich
  zu `no-structured-clone` im Worker-Modus. Das Element bekommt keinen Getter — den Weg von der Attributzeile
  bis zum Konstruktor beweist ein e2e-Fall an einem echten Worker, dort wo er endet.
- Für Paket 10 entschieden (2026-08-19), auf Vorschlag des Paket-Planers: Ein numerischer Konverter für
  `<shae-prop>` liefert eine Zahl oder wirft — `NaN` erreicht die Entity nicht mehr, in keinem der
  numerischen Zweige, auch nicht in `float32array`/`float64array`, deren Puffer ihn zwar trüge; ein
  Attributwert, der keine Zahl ergibt, ist überall derselbe Fehler. Gemeldet wird auf `error`, nicht auf
  `warn`: `warn` hängt an `ConsoleLogger.sharedConfig.enable` und schweigt außerhalb von localhost, und
  ein still verschwindender Wert ist genau der Fall, den das Finding beschreibt. Ein schlechter Abschnitt
  kippt die ganze Liste, wie bei `bigint64array` schon heute — schlechte Abschnitte zu überspringen wäre
  eine dritte Semantik neben »ganz« und »gar nicht«. `findShadowRootHost()` bekommt kein Glied im
  gezählten Kopf des Changelogs: `docs/api-reference.md:1652` sagt `undefined` außerhalb einer Shadow Root
  seit jeher zu, der Fix macht die Zusage wahr.

- **Prozess** — Umsetzung über Subagenten wie im Skill: je Paket ein Planer, ein Implementierer,
  ein Reviewer. Der Orchestrator koordiniert, verifiziert und committet, schreibt aber keinen
  Projektcode. Die Session-Vorgabe »keine Agents ohne Anforderung« ist dafür ausdrücklich
  aufgehoben worden. (2026-08-19)
- **CHANGELOG-001** — Die Version wird nicht angehoben. Der Unreleased-Abschnitt wird sortiert und
  lesbar gemacht, die Semver-Bewertung steht am Ende dieses Plans. Ein Release ist ein eigener Akt
  des Nutzers, und eine Anhebung würde über die CI unmittelbar auf npm publizieren. (2026-08-19)
- **TIMEOUT-CFG** — kommt in den Lauf: die vier Worker-Timeouts wandern in ein Optionsobjekt von
  `RemoteWorkerEnv` und werden über `<shae-worker>`-Attribute zugänglich. Die Konstanten bleiben
  die Defaults. (2026-08-19)
- **API-FRAMELOOP-001** — kommt in den Lauf: `FrameLoop` wird aus `index.ts` exportiert und
  `shae-offscreen-canvas` von seiner Zweitimplementierung darauf umgestellt. (2026-08-19)
- **PERF-CLONE** — Der strukturelle Klon bleibt Default. Er sichert semantische Gleichheit zwischen
  lokaler und entfernter Umgebung; wer lokal entwickelt, trifft remote auf dasselbe Verhalten.
  Begründung und der Hinweis auf `no-structured-clone` gehen in den Performance-Abschnitt der
  Dokumentation. Kein Code-Eingriff. (2026-08-19)
- **ENV-ASYMM** — Weg A: `LocalShadowObjectEnv.applyChangeTrail()` respektiert `waitForConfirmation`,
  indem es die Auflösung bei gesetztem Flag auf einen Microtask schiebt. Gewählt gegen »die
  Asymmetrie dokumentieren«, weil die Signatur den Parameter bereits führt — sie wahr zu machen ist
  billiger als eine Fußnote, die jeder Aufrufer kennen müsste. Nicht vom Nutzer entschieden;
  bei der Grobplan-Freigabe widersprechbar. (2026-08-19)
- **KERN-GET-001** — Weg B: `getEntity()` wirft weiterhin, und es kommt additiv ein `findEntity()`
  dazu, das `undefined` liefert. `dispatchEventsToEntity()` wechselt darauf, womit sein Optional
  Chaining zum ersten Mal etwas bedeutet. Rein additiv, also keine Breaking Change. Nicht vom
  Nutzer entschieden; bei der Grobplan-Freigabe widersprechbar. (2026-08-19)
- **`@types/node` 24 → 26** — bleibt liegen. Ein Major der Node-Typen ohne auslösenden Anlass ist
  Risiko ohne Gegenwert; das Finding `DEPS-001` ist ohne ihn abgedeckt. (2026-08-19)
- **Eigener Changelog für `shae-offscreen-canvas`** — Das Paket bekommt mit Paket 3 eine eigene
  `CHANGELOG.md`, und die vier Stellen im Changelog-Abschnitt von `CLAUDE.md` werden nachgezogen.
  Grund: Das Paket wird eigenständig veröffentlicht (eigene Version, eigenes `publishConfig`, eigenes
  `publishNpmPkg`), und `CLAUDE.md` sieht für genau diesen Fall einen eigenen Changelog vor; der Kopf
  der Wurzel-`CHANGELOG.md` schließt Laufzeitänderungen einzelner Pakete aus. Vom Lauf entschieden,
  nicht vom Nutzer — jederzeit widersprechbar. (2026-08-19)
- **Vorzustand in `Backlog.md`** — Dieselbe Ausnahme wie für die beiden `CHANGELOG.md`. `Backlog.md` ist
  ein lebendes Arbeitsdokument, das den Fortschritt am Projekt erzählt; seine Einträge sind durchgängig
  so geschrieben, und ein Eintrag, der nicht sagen darf, was vorher galt, kann nicht abhaken, was
  erledigt ist. Für Code, Kommentare, `docs/` und `README.md` bleibt die Regel scharf. Vom Lauf
  entschieden, nachdem der Reviewer von Paket 5 die Gattungsfrage aufgeworfen hat. (2026-08-19)
- **Vorzustand im CHANGELOG** — Die Konventionen dieses Plans verbieten den Rückblick auf den
  Vorzustand; für `packages/shadow-objects/CHANGELOG.md` und `packages/shae-offscreen-canvas/CHANGELOG.md`
  gilt das nicht. Ein Changelog ist der Ort, an dem die Historie festgehalten wird, sämtliche
  Nachbareinträge halten es so, und wo ein Projekt den Ton vorgibt, gewinnt die Umgebung. Die Regel
  bleibt für Code, Kommentare, `docs/` und `README.md` in voller Schärfe. Vom Lauf entschieden, nachdem
  der Reviewer von Paket 4 den Widerspruch aufgezeigt hat. (2026-08-19)
- **Plan-Verbleib** — `./remediation-plan-2.md` wandert am Ende per Abschluss-Commit ins Repo.
  Während des Laufs bleibt die Datei ungetrackt, weil sie die Hashes der Commits trägt, in denen
  sie deshalb nicht liegen kann. (2026-08-19)

## Konventionen

Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise:

- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs — **auch nicht in Commit-Messages.** Sie gehören diesem einen Audit und
  sind danach tot. Sie leben ausschließlich in diesem Plan. Das weicht vom Skill-Text ab, der
  Commit-Messages zulässt; die globale Nutzervorgabe nennt Commit-Messages ausdrücklich als
  Ausschluss und schlägt den Skill. Ausgenommen wären nur IDs eines dauerhaften Trackers
  (Jira, GitHub Issues) — Audit-Kürzel sind das nicht. Was festgehalten werden soll, wird
  ausgeschrieben: die Regel als Satz, die Begründung daneben.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

Projektspezifisch, aus `AGENTS.md` und `CLAUDE.md`:

- Alle Dokumentation und alle Code-Kommentare in **English**.
- Verbotene Analogien: »shadow theater«, »puppet«, »puppeteer«, »light world«, »screen«.
  ECS-Begriffe verwenden: Entity, Component, Kernel, View, Token.
- Bindende Begriffe: `RemoteWorkerEnv` (nicht `RemoteShadowObjectEnv`), Entity (nicht Shadow Entity),
  Entity Tree (nicht Shadow Entity Graph), `ComponentContext` ausgeschrieben für die View-seitige
  Namespace-Registry, »Entity Context« für die Dependency Injection entlang des Entity-Baums.
- Öffentliche API-Änderungen aktualisieren `packages/shadow-objects/docs/`, die `README.md` des
  Pakets **und** `packages/shadow-objects/CHANGELOG.md` im selben Zug.
- Versionen stehen ausschließlich im `catalog:`-Block von `pnpm-workspace.yaml`, referenziert als
  `"<dep>": "catalog:"`.
- Änderungen an TODO-Kommentaren ziehen `pnpm make:todo` nach sich.
- Lint und Format sind Biome, Konfiguration ausschließlich in `biome.json` an der Wurzel.

## Vorbestehende Fehler

Keine. Die Baseline ist auf allen fünf Kommandos grün.

## Pakete

### [x] 1. Sichtbarkeit: Typecheck-Umfang, Manifest, Katalog
- Findings: TYPE-E2E-001 (low), SIDE-EFFECTS-001 (low), DEP-CATALOG-001 (low), TYPE-BOXED-001 (low), DEPS-001-Rest (low)
- Ziel: Die Werkzeuge sehen, was sie sehen sollen — bevor irgendein Fix darauf baut.
- Bereich: `packages/shadow-objects-e2e/tsconfig.json`, `playwright.config.ts`, `packages/shadow-objects/package.json`, `pnpm-workspace.yaml`, `biome.json`, `packages/shadow-objects/src/in-the-dark/Kernel.ts:190`
- Hängt ab von: —
- Modell: mittlere Stufe
- Hash: 7e147e4
- Dateien: `packages/shadow-objects-e2e/tsconfig.json`, `packages/shadow-objects-e2e/playwright.config.ts`, `packages/shadow-objects/package.json`, `packages/shadow-objects-testing/package.json`, `packages/shae-offscreen-canvas/package.json`, `pnpm-workspace.yaml`, `biome.json`, `packages/shadow-objects/src/in-the-dark/Kernel.ts`, `CHANGELOG.md` (Wurzel)
- Vorgehen:
  1. **Typecheck-Umfang des E2E-Pakets.** In `packages/shadow-objects-e2e/tsconfig.json` das
     `include` von `["src", "tests"]` auf `["src", "tests", "playwright.config.ts"]` erweitern.
     Danach meldet `tsc` in `playwright.config.ts` vier TS4111-Fehler (Zugriff auf eine
     Index-Signatur mit Punktschreibweise) an den Zeilen 17, 19, 21 und 79. Alle vier auf
     Klammerschreibweise umstellen: `process.env.CI` → `process.env['CI']`. Keine weitere
     Änderung an der Datei.
  2. **Totes im Quellmanifest.** In `packages/shadow-objects/package.json` die acht
     `sideEffects`-Einträge streichen, die mit `build/src/` beginnen. Die zehn Einträge unter
     `dist/` und `dist/bundle.js` bleiben unverändert stehen. Das ausgelieferte
     `dist/package.json` entsteht aus `package.override.json` und ist von der Änderung nicht
     betroffen — nach dem Build muss `packages/shadow-objects/dist/package.json` dieselbe
     `sideEffects`-Liste tragen wie vorher. Das ist Teil des Verify.
  3. **Kommentar in `build.mjs`.** Der Kommentar, der bisher nur den transpilierten
     Bundle-Einstieg erklärt, bekommt einen Satz dazu: dass die `sideEffects`-Liste an zwei
     Stellen existiert — im Quellmanifest für Consumer des Repos, in `package.override.json`
     für das ausgelieferte Paket — und warum die zweite die erste beim Build vollständig
     ersetzt.
  4. **Katalog als einzige Quelle.** Drei Einträge umgehen ihn:
     - `@esm-bundle/chai` steht als `"4.3.4-fix.0"` in `packages/shadow-objects-testing/package.json:23`
       und `packages/shae-offscreen-canvas/package.json:50`.
     - `lil-gui` steht als `"^0.21.0"` in `packages/shae-offscreen-canvas/package.json:53`.
     Beide in den `catalog:`-Block von `pnpm-workspace.yaml` aufnehmen — `@esm-bundle/chai`
     versionsexakt als `4.3.4-fix.0`, weil der Pin bewusst ist, mit einer Kommentarzeile
     darüber, die das sagt — und die drei Stellen in den Paketen auf `"catalog:"` umstellen.
     Danach `pnpm install` laufen lassen; die Lockfile-Änderung gehört in den Commit.
  5. **Wrapper-Typ im Kernel.** In `packages/shadow-objects/src/in-the-dark/Kernel.ts:190` steht
     `new Map<String, Set<ShadowObjectConstructor>>()`. Auf das primitive `string` ändern.
  6. **Regel dagegen scharfstellen.** In `biome.json` unter `linter.rules.complexity` die Regel
     `noBannedTypes` auf `"error"` setzen (in Biome 2.5 sitzt sie in der Gruppe `complexity`;
     wenn `recommended: true` sie bereits aktiv führt, ist der explizite Eintrag trotzdem zu
     setzen, damit sie nicht mit einem Recommended-Wechsel verschwindet). Anschließend
     `pnpm lint:ci` — meldet die Regel weitere Wrapper-Typen im Repo, gehören sie zu diesem
     Paket und werden mit umgestellt.
  7. **Biome-Patch.** Im `catalog:`-Block `'@biomejs/biome'` von `^2.5.8` auf `^2.5.9` heben,
     `pnpm install`, danach `pnpm lint:ci`. Meldet die neue Fassung Befunde, die vorher nicht
     kamen, werden sie behoben, wenn es einzelne Stellen sind — oder als Folge gemeldet, wenn
     es eine Regeländerung über viele Dateien ist. **Nicht** angefasst werden `vite` und `turbo`:
     beide sind dokumentierte Holdbacks mit Begründung im Kommentar darüber. `@types/node`
     bleibt auf 24 (Entscheidung vom 2026-08-19).
  8. **Changelog.** Das ist ein Monorepo-Vorgang: die Änderungen an Typecheck-Umfang, Katalog,
     Biome-Konfiguration und Quellmanifest gehen in die **Wurzel-`CHANGELOG.md`** als neuer
     datierter Abschnitt für den 2026-08-19. Der Wrapper-Typ in `Kernel.ts` verändert kein
     Laufzeitverhalten und keine emittierte Signatur — er braucht keinen Eintrag in
     `packages/shadow-objects/CHANGELOG.md`. Falls sich beim Build doch eine Abweichung in den
     emittierten `.d.ts` zeigt, dann eben doch, mit einem Satz, was sich ändert.
- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci` — dazu der Nachweis, dass
  `packages/shadow-objects/dist/package.json` nach dem Build unverändert dieselbe `sideEffects`-Liste
  trägt, und dass `pnpm -F shadow-objects-e2e typecheck` die vier TS4111-Stellen jetzt sieht und grün ist.
- Commit: `chore(tooling): put the typecheck scope, the source manifest and the catalog back in line`
- Ergebnis: 2 Nachbesserungsrunden · alle fünf Findings behoben, alle acht Qualitätsbefunde geschlossen · Verify gegen die Baseline: lint 0/0 (2 Infos), typecheck + build alle Pakete, 719 Unit/Integration, 402 E2E
- Folgen: `turbo.json:13-21` — `tasks.test.inputs` kennt `playwright.config.ts` nicht, während `build` (`:8`) und `typecheck` (`:26`) sie seit diesem Paket führen. Die Asymmetrie stammt aus diesem Lauf, nicht aus dem Vorzustand; `shadow-objects-e2e#test` ist der einzige Task, der die Konfiguration ausführt. → Paket 12
- Nebenbefunde: `turbo.json` — `vite.config.mjs` hängt in keiner Task-Input-Liste, obwohl `build` ein `vite build` ist (vorbestehend, wird in Paket 12 mit derselben Bewegung erledigt) · `biome.json:2` — die `$schema`-URL zeigt auf 2.4.14, installiert ist 2.5.9 (Folge des Patch-Sprungs in diesem Paket, betrifft nur die Editor-Vervollständigung) → Paket 12
- Schnittstellen: `ShadowObjectConstructor` in `src/types.ts` gibt `object` zurück statt `{}` — eine Konstruktorsignatur mit primitivem Rückgabetyp lässt sich nicht mehr zuweisen, eine mit `{}` weiterhin schon; zur Laufzeit ändert sich nichts · `FrameLoop.start()` und `.stop()` nehmen `ListenerFuncType` aus `@spearwolf/eventize` statt `Function` · Katalog führt jetzt `@esm-bundle/chai` (versionsexakt `4.3.4-fix.0`) und `lil-gui` · `biome.json` hat `complexity/noBannedTypes: "error"`

**TYPE-E2E-001 · low · packages/shadow-objects-e2e/tsconfig.json, playwright.config.ts**
Die tsconfig des E2E-Pakets führt include: ["src", "tests"]; die Konfigurationsdatei selbst liegt daneben. Ein Lauf über die Wurzelkonfiguration meldet dort vier TS4111-Fehler — Zugriff auf env.CI über eine Index-Signatur. Kein Kommando des Projekts sieht sie, weder der typecheck-Task des Pakets noch sein Build.
Empfehlung: playwright.config.ts in include aufnehmen und die vier Zugriffe auf die Klammerschreibweise umstellen. Alternativ das Muster ausdrücklich dokumentieren — aber dann sichtbar, nicht dadurch, dass die Datei ungeprüft bleibt.

**SIDE-EFFECTS-001 · low · packages/shadow-objects/package.json:41-58**
Acht der achtzehn Einträge zeigen auf build/src/… — ein Verzeichnis, das die aktuelle Pipeline nicht mehr erzeugt. Das ausgelieferte dist/package.json ist davon nicht betroffen: package.override.json ersetzt die Liste vollständig durch korrekte src/-Pfade, verifiziert gegen den gebauten Stand. Der Schaden ist damit auf das Quellmanifest begrenzt — dort steht allerdings eine Liste, die niemand mehr lesen kann, ohne sie mit der Override-Datei abzugleichen.
Empfehlung: Die acht build/src/-Einträge streichen. Dass die Liste dreifach existiert (Quelle, Override, Snapshot), sollte im Build-Kommentar von build.mjs stehen — der erklärt aktuell nur, warum der Bundle-Einstieg der transpilierte ist.

**DEP-CATALOG-001 · low · packages/shadow-objects-testing/package.json:23, packages/shae-offscreen-canvas/package.json:50, 53**
AGENTS.md und CLAUDE.md führen den Katalog als verbindliche einzige Quelle für Versionen: 'never write a plain version range in a per-package package.json'. Zwei Einträge tun genau das — @esm-bundle/chai mit '4.3.4-fix.0' in zwei Paketen und lil-gui mit '^0.21.0'. Bei @esm-bundle/chai steht die Version dadurch an zwei Stellen und kann auseinanderlaufen.
Empfehlung: Beide in den Katalog aufnehmen und in den Paketen auf 'catalog:' umstellen. Wenn die exakte Version von @esm-bundle/chai bewusst gepinnt bleiben soll, gehört auch dieser Pin in den Katalog — dort kann er stehen, ohne die Regel zu brechen.

**TYPE-BOXED-001 · low · packages/shadow-objects/src/in-the-dark/Kernel.ts:190**
'new Map<String, Set<ShadowObjectConstructor>>()' verwendet den Wrapper-Typ String statt des primitiven string. Der Code funktioniert, weil die Map zur Laufzeit ohnehin primitive Schlüssel bekommt — aber der deklarierte Typ ist falsch, und jede Zuweisung an eine korrekt typisierte Map<string, …> würde einen Fehler erzeugen. Biome und tsc melden es in dieser Konfiguration nicht.
Empfehlung: Auf 'string' ändern. Eine biome-Regel für Wrapper-Typen (noBannedTypes o. ä.) aktivieren, damit der Fall nicht wiederkehrt.

**DEPS-001 (Rest) · low · pnpm-workspace.yaml (catalog:)**
Von den sechzehn Einträgen des Audits sind nach dem Toolchain-Renewal vier übrig: vite (7.3.6 → 8.2.1) und turbo (2.10.9 → 2.10.10) sind dokumentierte Holdbacks und bleiben, @types/node (24 → 26) bleibt nach Entscheidung vom 2026-08-19 liegen. Offen ist der Patch-Sprung biome 2.5.8 → 2.5.9.
Empfehlung: Den Patch-Sprung mitnehmen, die Holdbacks unangetastet lassen.

### [x] 2. Specs für die Worker-Brücke
- Findings: TEST-001 (medium, Rest)
- Ziel: `MessageRouter` und `WorkerRuntime` bekommen Specs, die ihr Routing, ihre Fehlerpfade und ihren Teardown festhalten.
- Bereich: `packages/shadow-objects/src/worker/MessageRouter.spec.ts`, `WorkerRuntime.spec.ts` (neu)
- Hängt ab von: —
- Modell: stärkste Stufe — angehoben in Zug 0. Paket 4 steht auf diesen Specs; eine Zusicherung, die das heutige Verhalten falsch festhält, segnet einen Defekt ab, statt ihn rot zu zeigen. Dazu kommen die Randbedingungen des Aufbaus: `self` ist in happy-dom über die ganze Datei geteilt, `noUnusedLocals` und `verbatimModuleSyntax` gelten auch für Specs, und drei Fälle hängen an dynamischen Imports.
- Hash: 1f0f44d
- Dateien: `packages/shadow-objects/src/worker/MessageRouter.spec.ts` (neu), `packages/shadow-objects/src/worker/WorkerRuntime.spec.ts` (neu). Sonst nichts. Kein Produktionscode, kein Changelog-Eintrag: Specs sind kein Teil der ausgelieferten API, `tsconfig.lib.json:4` schließt sie von der Deklarations-Emission aus und `build.mjs:48` von der Transpilation, `dist/` bleibt Datei für Datei identisch.
- Vorgehen:
  1. **Vorlage.** `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts` ist der Stil, der hier gilt, und
     zwar verbindlich: benannte Importe aus `vitest`, `describe`-Gruppen nach Verhaltensbereichen,
     `it`-Namen als englische Aussagesätze in der dritten Person Singular (»posts one confirmation …«,
     nicht »should post …«), Assertions mit zweitem Argument als Botschaft, wo der Fall nicht für sich
     spricht, und Kommentare, die das *Warum* eines Falls erklären statt seinen Ablauf. Keine
     Finding-Kürzel, in keiner Form — auch nicht in einem Testnamen oder Kommentar. Beide Dateien
     laufen unter happy-dom (`vitest.config.ts`) und brauchen keinen echten Worker.
  2. **Gemeinsamer Aufbau in `MessageRouter.spec.ts`.** Kopf der Datei, exakt so:

     ```ts
     import {beforeEach, describe, expect, it, vi} from 'vitest';
     import {
       AppliedChangeTrail,
       ChangeTrail,
       ComponentChangeType,
       Configure,
       Destroy,
       Destroyed,
       ImportedModule,
       MessageToView,
     } from '../constants.js';
     import {Kernel} from '../in-the-dark/Kernel.js';
     import {Registry} from '../in-the-dark/Registry.js';
     import type {IComponentChangeType} from '../types.js';
     import {MessageRouter} from './MessageRouter.js';

     interface PostedMessage {
       message: any;
       options?: StructuredSerializeOptions;
     }

     /**
      * Every case gets its own registry. `new Kernel()` without one falls back to the module-wide
      * default registry, and a token defined there would outlive the case that defined it.
      */
     const setup = () => {
       const posted: PostedMessage[] = [];
       const kernel = new Kernel(new Registry());
       const postMessage = ((message: any, options?: StructuredSerializeOptions) => {
         posted.push({message, options});
       }) as unknown as typeof self.postMessage;
       const router = new MessageRouter({kernel, postMessage});
       return {kernel, posted, router};
     };

     const message = (data: unknown) => ({data}) as MessageEvent;

     const createEntity = (uuid: string, token = 'test-token'): IComponentChangeType => ({
       type: ComponentChangeType.CreateEntities,
       uuid,
       token,
     });

     const setParent = (uuid: string, parentUuid: string): IComponentChangeType => ({
       type: ComponentChangeType.SetParent,
       uuid,
       parentUuid,
     });

     const changeTrailMessage = (serial: number | undefined, ...changeTrail: IComponentChangeType[]) =>
       message({type: ChangeTrail, serial, changeTrail});

     /** Lets the microtask behind `dispatchMessageToView()` run. */
     const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

     /**
      * A dynamic import needs more than one turn of the loop, and how many is not ours to know.
      * Waiting for the message instead of for a fixed delay is what keeps the case from flaking.
      */
     const waitForPosted = async (posted: PostedMessage[], count: number, timeout = 2000) => {
       const deadline = Date.now() + timeout;
       while (posted.length < count) {
         if (Date.now() > deadline) {
           throw new Error(`expected ${count} posted messages, got ${posted.length}`);
         }
         await new Promise((resolve) => setTimeout(resolve, 5));
       }
     };
     ```

     Dazu ein `beforeEach(() => { vi.restoreAllMocks(); })` am Anfang des äußeren `describe`.
     Der Router schreibt über `console.warn`, `console.error` und `console.debug`; jeder Fall, der
     einen dieser Pfade auslöst, legt seinen Spion selbst an
     (`vi.spyOn(console, 'error').mockImplementation(() => undefined)`) und prüft ihn.
     `noExplicitAny` ist in `biome.json` aus, `any` ist hier also erlaubt und erwünscht — der
     Router nimmt `event.data` ebenfalls ungetypt entgegen.
     Eine Grenze des Typcheck-Umfangs: `packages/shadow-objects` führt `@types/node` nicht, `tsc`
     kennt in dieser Datei also weder `process` noch ein `node:`-Modul. Beide Specs kommen ohne aus;
     alles, was sie brauchen, steht in `lib: ["ES2022", "DOM", "DOM.Iterable"]`, darunter auch
     `StructuredSerializeOptions`.
  3. **`describe('routing')` — vier Fälle.**
     1. `applies a change trail and confirms it once` — `router.route(changeTrailMessage(42, createEntity('a')))`.
        Erwartet: `kernel.hasEntity('a')` ist `true` und `posted.map((entry) => entry.message)` ist
        `[{type: AppliedChangeTrail, serial: 42}]`.
     2. `applies a change trail that carries no serial without confirming it` —
        `router.route(changeTrailMessage(undefined, createEntity('a')))`. Erwartet:
        `kernel.hasEntity('a')` ist `true`, `posted` ist leer. Kommentar dazu: die Bestätigung hängt
        am Wahrheitswert von `serial`, ein fehlender Schlüssel und ein `undefined` sind darin dasselbe.
     3. `treats a serial of 0 like no serial at all` — `router.route(changeTrailMessage(0, createEntity('a')))`.
        Erwartet: `kernel.hasEntity('a')` ist `true`, `posted` ist leer. Der Fall hält die Grenze der
        Wahrheitswert-Prüfung fest; die View-Seite zählt mit `++` ab 1 hoch
        (`view/RemoteWorkerEnv.ts:225`), erreicht die Null also nie.
     4. `warns about a message type it does not know` — `router.route(message({type: 'nonsense'}))`.
        Erwartet: `console.warn` einmal mit `'[MessageRouter] unknown message'` und `'nonsense'`,
        `posted` leer. Ein zweiter Fall `names the whole payload when the message carries no type` mit
        `router.route(message({}))`: das zweite Argument der Warnung ist dann das Datenobjekt selbst,
        Assertion `expect(warn.mock.calls[0][1]).toEqual({})`.
  4. **`describe('messages from the kernel to the view')` — drei Fälle.**
     1. `forwards a kernel message to the view` — `kernel.dispatchMessageToView({uuid: 'a', type: 'hello', data: {n: 1}})`,
        dann `await flushMicrotasks()`. Erwartet: `posted[0].message` ist
        `{type: MessageToView, data: {uuid: 'a', type: 'hello', data: {n: 1}}}`.
     2. `hands the transferables to postMessage instead of into the payload` — dieselbe Nachricht mit
        `transferables: [buffer]`, `buffer` ein `new ArrayBuffer(8)`. Erwartet: `posted[0].options` ist
        `{transfer: [buffer]}` (Identität prüfen: `posted[0].options?.transfer?.[0]` ist `buffer`), und
        `'transferables' in posted[0].message.data` ist `false`.
     3. `stops forwarding kernel messages after a destroy` — `router.route(message({type: Destroy}))`
        (mit `console.debug`-Spion), danach `kernel.dispatchMessageToView({uuid: 'a', type: 'hello'})`
        und `await flushMicrotasks()`. Erwartet: keine Nachricht mit `type === MessageToView` in
        `posted`. Der Fall hält fest, dass die Abmeldung vom Kernel wirkt.
  5. **`describe('module import')` — sechs Fälle, jeder mit `await waitForPosted(...)`.** Die
     Modul-URLs sind `data:`-URLs; `toUrlString()` reicht sie unverändert durch (`new URL(dataUrl, base)`
     liefert die Data-URL selbst) und der Loader importiert sie. Jeder Fall wartet seinen eigenen
     Import ab, bevor er den nächsten anstößt — `#configure` ist asynchron und der Router hält keine
     Reihenfolge; zwei ohne Wartepunkt hintereinander gestartete Importe kommen in der Reihenfolge
     ihrer Auflösung zurück, nicht in der ihres Starts.
     1. `imports a module and confirms its url` — URL
        `'data:text/javascript,export const shadowObjects = {define: {}}'`. Erwartet: genau eine
        Nachricht, `toEqual({type: ImportedModule, url})`, ohne `error`-Schlüssel.
     2. `upgrades the entities that already exist when the module arrives` — zuerst
        `router.route(changeTrailMessage(1, createEntity('a', 'test-token')))`, dann Konfiguration mit

        ```ts
        const CALL_COUNTER = 'shadowObjectsSpecCalls';

        const url =
          'data:text/javascript,export const shadowObjects = {define: {"test-token": ' +
          'function ShadowObjectDouble() { globalThis.shadowObjectsSpecCalls = ' +
          '(globalThis.shadowObjectsSpecCalls ?? 0) + 1; }}}';
        ```

        Der Modultext ist eine Zeichenkette und wird weder typgeprüft noch formatiert — der Zähler
        steht darin in Punktschreibweise, der Schlüssel in doppelten Anführungszeichen, damit die
        einfachen der Spec frei bleiben. Die Spec selbst greift über die Konstante zu; das erzwingt
        `noPropertyAccessFromIndexSignature`, und eine Konstante statt eines Literals hält Biomes
        `useLiteralKeys` still. Erwartet: nach dem Import ist
        `(globalThis as unknown as Record<string, unknown>)[CALL_COUNTER]` gleich `1`. Aufräumen im
        `finally`: `delete (globalThis as unknown as Record<string, unknown>)[CALL_COUNTER]`.
     3. `reports a module without the shadow-objects export` — URL
        `'data:text/javascript,export const nothing = 1'`. Erwartet: eine Nachricht
        `{type: ImportedModule, url, error: 'module has no "shadowObjects" export'}` — Zeichenkette
        exakt, sie stammt aus `MessageRouter.ts:77` und nicht aus der Laufzeit. `console.error` wird
        auf diesem Zweig **nicht** gerufen; das ist mitzuprüfen (`expect(errorSpy).not.toHaveBeenCalled()`).
     4. `reports a configure message that carries no url` — `router.route(message({type: Configure}))`.
        Erwartet: `posted[0].message.type` ist `ImportedModule`, `posted[0].message.error` ist exakt
        `'Error: missing "importModule" url'`, und `console.error` einmal mit
        `'[MessageRouter] failed to import module'` als erstem Argument. Kein `toEqual` auf die ganze
        Nachricht — sie trägt `url: undefined`, und ein `toEqual` würde diesen Schlüssel stillschweigend
        durchwinken, statt ihn zu prüfen.
     5. `reports a module that cannot be parsed` — URL
        `'data:text/javascript,this is not javascript ###'`. Erwartet: `type` ist `ImportedModule`,
        `url` wird unverändert zurückgegeben, `error` erfüllt `toMatch(/^SyntaxError/)` — nur das
        Präfix, denn den Rest formuliert die Engine. `console.error` einmal.
     6. `confirms a module it has already imported without registering it twice` — dieselbe URL aus
        Fall 1 zweimal nacheinander, jeweils abgewartet. Erwartet: zwei Nachrichten, beide ohne
        `error`, und `console.warn` einmal mit einem ersten Argument, das
        `'importModule: skipping already imported module'` enthält. Der Fall hält fest, dass die
        Modul-Menge des Routers an der Modul-Identität hängt, nicht an der URL.
  6. **`describe('a change trail that fails')` — zwei Fälle. Beide gehören Paket 4.**
     1. `confirms a failed change trail twice -- once with the error and once without`:

        ```ts
        const {kernel, posted, router} = setup();
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        router.route(changeTrailMessage(1, createEntity('a')));
        router.route(changeTrailMessage(2, setParent('a', 'ghost')));

        expect(posted.map((entry) => entry.message)).toEqual([
          {type: AppliedChangeTrail, serial: 1},
          {type: AppliedChangeTrail, serial: 2, error: 'Error: entity with uuid "ghost" not found!'},
          {type: AppliedChangeTrail, serial: 2},
        ]);
        expect(error).toHaveBeenCalledTimes(1);
        expect(error.mock.calls[0][0]).toBe('[MessageRouter] failed to apply change trail');
        expect(kernel.hasEntity('a')).toBe(true);
        ```

        Der Kommentar über dem Fall nennt die Tatsache, nicht das Urteil: ein Change Trail, zwei
        Bestätigungen — die Fehlermeldung und danach die Erfolgsmeldung zur selben Seriennummer; welche
        von beiden der wartende Aufrufer zuerst sieht, entscheidet über Ablehnung oder Auflösung.
     2. `stops at the entry that throws and leaves the rest of the trail unapplied` — ein Trail mit
        drei Einträgen in einer Nachricht: `createEntity('a')`, `setParent('a', 'ghost')`,
        `createEntity('b')`. Erwartet: `kernel.hasEntity('a')` ist `true`, `kernel.hasEntity('b')` ist
        `false`, und für die eine Seriennummer stehen wieder beide Bestätigungen in `posted`. Dieser
        Fall bleibt auch nach Paket 4 in seiner Aussage über den Abbruch gültig; nur seine Erwartung an
        die zweite Bestätigung dreht sich.
  7. **`describe('teardown')` — vier Fälle, alle mit `console.debug`-Spion. Drei gehören Paket 4.**
     1. `confirms the destroy` — `router.route(message({type: Destroy}))`. Erwartet: `posted` enthält
        genau `[{type: Destroyed}]`.
     2. `leaves the entities of the kernel in place` — Entity anlegen, dann `Destroy`. Erwartet:
        `kernel.hasEntity('a')` ist `true`.
     3. `keeps routing change trails after the destroy` — `Destroy`, danach
        `changeTrailMessage(2, createEntity('b'))`. Erwartet: `kernel.hasEntity('b')` ist `true` und die
        Bestätigung zu Seriennummer 2 steht in `posted`. Der Fall hält fest, dass `Destroy` keine
        Sperre setzt.
     4. `confirms every destroy it is sent` — zwei `Destroy`-Nachrichten. Erwartet: zwei
        `{type: Destroyed}` in `posted`.
  8. **Ein Fall ohne Gruppe, direkt unter dem äußeren `describe`:**
     `builds its own kernel when none is handed in` — `new MessageRouter({postMessage})` mit dem
     Doppel aus `setup()`, Erwartung `toBeInstanceOf(Kernel)`. Der Fall darf nichts in die Registry
     schreiben, weil dieser Router die geteilte Standard-Registry benutzt.
  9. **`describe('a message the router cannot read')` — zwei Fälle. Der erste gehört Paket 4.**
     1. `it.each([null, undefined])('throws when the message data is %s', …)` — Erwartung
        `expect(() => router.route(message(value))).toThrow(TypeError)`. Es ist der Zugriff auf `.type`
        in `MessageRouter.ts:42`, der wirft.
     2. `it.each(['changeTrail', 42, true])('warns about message data of %s instead of throwing', …)` —
        Erwartung: kein Wurf, `console.warn` einmal, `posted` leer. Ein Primitiv hat kein `type`, der
        Zugriff liefert `undefined` und die Nachricht landet im Default-Zweig. Der Fall grenzt ab,
        welche Eingaben heute schon verworfen werden und welche nicht.
  10. **`WorkerRuntime.spec.ts` — Aufbau.** Kopf der Datei:

      ```ts
      import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
      import {AppliedChangeTrail, ChangeTrail, ComponentChangeType, Loaded} from '../constants.js';
      import {CONSOLE_LOGGER, CONSOLE_LOGGER_STORAGE} from '../utils/ConsoleLogger.js';
      import {WorkerRuntime} from './WorkerRuntime.js';

      const message = (data: unknown) => ({data}) as MessageEvent;

      const globals = globalThis as unknown as Record<string, unknown>;
      ```

      `beforeEach` legt `vi.spyOn(self, 'postMessage').mockImplementation(() => undefined)` an und merkt
      sich `globals[CONSOLE_LOGGER_STORAGE]`. `afterEach` stellt diesen Wert wieder her (war er
      `undefined`, dann `delete`), ruft `vi.restoreAllMocks()` und meldet einen etwaigen Hörer wieder ab.
      Zwei Punkte, an denen diese Spec sonst andere Dateien beschädigt, beide zwingend:
      - **`self.postMessage` muss stumm sein.** In happy-dom ist `self` das Fenster, `postMessage`
        wirft nicht, sondern stellt die Nachricht an dieselben `message`-Hörer zu. Ein `start()` mit
        echtem `postMessage` schickt sein eigenes `{type: Loaded}` in den gerade registrierten Hörer,
        der Runtime baut daraufhin einen Router und der warnt über eine unbekannte Nachricht.
      - **Nur ein einziger Fall ruft `start()`.** Alle anderen rufen `runtime.onmessage(...)` direkt
        auf. `self` ist über die ganze Datei dasselbe Objekt; ein liegengebliebener Hörer bekommt die
        Ereignisse der folgenden Fälle mit. Der `start()`-Fall meldet seinen Hörer am Ende selbst ab
        (`self.removeEventListener('message', runtime.onmessage)`), zusätzlich zum `afterEach`.
  11. **`WorkerRuntime.spec.ts` — sechs Fälle. Der fünfte gehört Paket 4.**
      1. `announces itself as loaded when it starts` — mit `const addEventListener = vi.spyOn(self, 'addEventListener')`
         vor `runtime.start()`. Erwartet: `addEventListener` wurde mit `'message'` und `runtime.onmessage`
         gerufen, `self.postMessage` einmal mit `{type: Loaded}`.
      2. `routes the messages that reach the global scope` — nach `start()` ein
         `self.dispatchEvent(new MessageEvent('message', {data: {type: ChangeTrail, serial: 5, changeTrail: [{type: ComponentChangeType.CreateEntities, uuid: 'a', token: 'test-token'}]}}))`.
         Erwartet: `runtime.router` ist gesetzt, `runtime.router!.kernel.hasEntity('a')` ist `true`, und
         der Spion auf `self.postMessage` hat `{type: AppliedChangeTrail, serial: 5}` gesehen. Der
         Router bindet in `MessageRouter.ts:36` `self.postMessage` erst bei seiner Erzeugung, und die
         findet nach der Installation des Spions statt — deshalb landet die Bestätigung im Spion.
      3. `stores the console-logger config without building a router` —
         `runtime.onmessage(message({type: CONSOLE_LOGGER, config: {debug: true}}))`. Erwartet:
         `globals[CONSOLE_LOGGER_STORAGE]` ist `{debug: true}`, `runtime.router` ist `undefined`,
         `self.postMessage` wurde nicht gerufen.
      4. `builds its router once and keeps it` — zwei Change Trails hintereinander über `onmessage`.
         Erwartet: der Router nach der ersten Nachricht ist identisch (`toBe`) mit dem nach der zweiten,
         und beide Entities liegen in demselben Kernel.
      5. `throws when the message data is null` und `throws when the message data is undefined` —
         als `it.each([null, undefined])`. Erwartet: `TypeError`, und danach ist `runtime.router`
         weiterhin `undefined`. Der Zugriff auf `event.data.type` in `WorkerRuntime.ts:9` steht vor der
         Erzeugung des Routers, der Ausfall passiert also, bevor überhaupt ein Kernel entsteht.
      6. `hands message data that is not an object to the router` — `runtime.onmessage(message('nonsense'))`
         mit `console.warn`-Spion. Erwartet: kein Wurf, `runtime.router` ist gesetzt, und die Warnung
         `'[MessageRouter] unknown message'` ist gefallen. Der Fall zeigt, dass die Runtime heute keine
         eigene Prüfung führt und alles Nicht-Nullige an den Router weiterreicht.
  12. **Was Paket 4 umdreht.** In den Detailplan von Paket 4 gehört diese Liste, und die betreffenden
      Fälle sind beim Schreiben so zu formulieren, dass ihre Umkehrung eine Änderung an Erwartung und
      Namen ist, nicht am Aufbau:
      - `a change trail that fails` › `confirms a failed change trail twice -- once with the error and
        once without` → wird zu einer Bestätigung; die dritte Zeile des `toEqual`-Arrays fällt weg.
      - `a change trail that fails` › `stops at the entry that throws …` → behält seine Aussage über
        den Abbruch, verliert die zweite Bestätigung aus der Erwartung.
      - `teardown` › `leaves the entities of the kernel in place` → wird zu
        `clears the entities of the kernel`, Erwartung `false`.
      - `teardown` › `keeps routing change trails after the destroy` und `confirms every destroy it is
        sent` → hier entscheidet Paket 4 bewusst, ob es dabei bleibt. Der geordnete Teardown räumt den
        Kernel ab; ob `Destroy` darüber hinaus zur Sperre wird, ist eine Entscheidung, keine Folge, und
        beide Fälle sind der Ort, an dem sie sichtbar wird.
      - `a message the router cannot read` › `throws when the message data is %s` → wird zu
        `discards a message it cannot read`: kein Wurf, `posted` leer, eine Debug-Meldung.
      - `WorkerRuntime` › `throws when the message data is %s` → dieselbe Umkehrung, plus die
        Entscheidung, ob die Prüfung in der Runtime, im Router oder in beiden sitzt.
      - `teardown` › `clears the set of imported modules so the same module registers again` → hängt an
        derselben Sperr-Entscheidung wie die beiden Fälle darüber. Wird `Destroy` zur Sperre, wird der
        zweite `Configure` verworfen, `waitForPosted` läuft in seinen Timeout, und der Fall **entfällt**,
        statt umgedreht zu werden: `#importedModules.clear()` wäre dann von außen nicht mehr beobachtbar.
        Bleibt es bei »abräumen, nicht sperren«, bleibt der Fall unverändert stehen — er hält heute
        richtiges Verhalten fest und trägt deshalb keinen Umkehr-Marker.
      - `a message the router cannot read` › `warns about message data of %s instead of throwing` →
        wird rot, sobald die Eingangsprüfung als `typeof event.data !== 'object'` statt als `== null`
        geschrieben wird: `'changeTrail'`, `42` und `true` wandern dann in den Verwurf-Zweig, statt den
        Default-Zweig zu erreichen. Der Fall ist die Grenze, an der diese Entscheidung sichtbar wird.
      - `routing` › `treats a serial of 0 like no serial at all` → nur falls Paket 4 die
        Wahrheitswert-Prüfung auf `data.serial != null` umstellt; die drei Bestätigungs-Fälle hängen
        sonst nicht daran.
  13. **Formatieren.** Zum Schluss `pnpm lint:fix` und `pnpm format` — Biome erzwingt Zeilenbreite 130,
      einfache Anführungszeichen, `{transfer}` ohne Leerzeichen in den Klammern und durchgehende
      Trailing Commas.
- Verify: `cd packages/shadow-objects && pnpm exec vitest src/worker/MessageRouter.spec.ts src/worker/WorkerRuntime.spec.ts --run` grün, dann von der Wurzel `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`. Die Testzahl von `pnpm test:ci` steigt von 719 um die Zahl der neuen Fälle; keine bestehende Datei verliert einen Test. `pnpm typecheck` prüft die Specs mit (`packages/shadow-objects/tsconfig.json` schließt `src` ein), `noUnusedLocals` und `verbatimModuleSyntax` gelten also auch hier. Nachweis, dass die Auslieferung unberührt bleibt: `find packages/shadow-objects/dist -type f | sort` vor und nach dem Build ergibt dieselbe Liste. Zusätzlich `pnpm -F @spearwolf/shadow-objects test` zweimal hintereinander laufen lassen — bleibt ein `message`-Hörer auf `self` liegen, zeigt sich das an einer Warnung aus einem fremden Fall.
- Commit: `test(worker): pin the routing, the module import and the teardown of the worker bridge`
- Ergebnis: 2 Nachbesserungsrunden · `TEST-001` (Rest) erfüllt · 34 neue Fälle in zwei Specs, Gesamtzahl 719 → 753 · kein Produktionscode berührt · Auslieferung nachweislich unverändert (`dist` byteidentisch)
- Nebenbefunde: `worker/WorkerRuntime.ts:18-21` — `start()` hat kein Gegenstück, nichts meldet den `message`-Hörer je von `self` ab; ein `Destroy` erreicht nur den Router · `worker/WorkerRuntime.ts:20` — ein zweiter `start()` schickt ein zweites `{type: Loaded}`, der Hörer wird von `addEventListener` entdoppelt, die Meldung nicht · `utils/toUrlString.ts:3` — `new URL(url, globalThis.location.href)` greift ungeprüft auf `location` zu. Triage in Zug 0 von Paket 3 (2026-08-19): alle drei **vorbestehend** — `1f0f44d` hat nur zwei Spec-Dateien angelegt (`git show --stat 1f0f44d`), und beide Quelldateien sind byteidentisch mit `git show d6e91f5:…`. Die ersten beiden gehen nach Paket 4, der dritte ins nächste Audit. Die Zuordnung »hängt an der Sperr-Entscheidung« trägt so nicht: siehe den Nachtrag unter Paket 4.
- Schnittstellen: keine — das Paket fügt ausschließlich Specs hinzu. Für Paket 4 gilt: die sieben umzudrehenden Fälle tragen alle den Kommentar-Anfang »recorded as it behaves today, not as it ought to behave« und sind darüber greppbar, unabhängig von Testnamen.

**TEST-001 (Rest) · medium · packages/shadow-objects/src/{worker/MessageRouter.ts, worker/WorkerRuntime.ts, view/RemoteWorkerEnv.ts}**
Keine der drei Dateien hat eine Spec. Ihre einzige Absicherung ist die E2E-Suite — die laut CI-001 nicht in CI läuft. Dabei sind sie gut testbar: MessageRouter nimmt postMessage als Konstruktor-Option entgegen, RemoteWorkerEnv braucht lediglich ein Worker-Double mit addEventListener und postMessage. Dass es geht, zeigt dieser Audit selbst: ROUTER-001 und ROUTER-002 wurden in wenigen Zeilen Testcode nachgewiesen.
Empfehlung: Specs für MessageRouter (Routing aller vier Nachrichtentypen, Fehlerpfad, Destroy) und für RemoteWorkerEnv gegen ein Worker-Double (Start-Timeout, Bestätigungs-Matching per serial, Verhalten nach destroy). Beides läuft unter happy-dom ohne echten Worker.
*Der RemoteWorkerEnv-Teil der Empfehlung steht bereits als `view/RemoteWorkerEnv.spec.ts`; im Scope ist nur der Worker-seitige Rest.*

### [x] 3. HTML-Injection über das ns-Attribut
- Findings: SEC-NS-001 (medium)
- Ziel: Der Shadow-Root wird aufgebaut statt zusammengestringt; ein Anführungszeichen im `ns`-Attribut bricht nicht mehr aus.
- Bereich: `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
- Hängt ab von: —
- Modell: stärkste Stufe (Sicherheitsfix mit Angriffsmodell). Bleibt auf der stärksten Stufe, obwohl der
  Fix vier Zeilen groß ist: die Testinfrastruktur des Pakets hat eine Falle, die einen Durchgang kostet,
  wenn man sie nicht kennt (Schritt 2), und die Reihenfolge im Konstruktor entscheidet über einen
  Nebeneffekt, den kein Test des Pakets sichtbar macht (Schritt 3).
- Hash: ab626ae
- Dateien:
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js` (neu)
  - `packages/shae-offscreen-canvas/CHANGELOG.md` (neu)
  - `CLAUDE.md` (Abschnitt »Changelogs and Backlog«, vier Stellen)

  Nicht berührt: `packages/shae-offscreen-canvas/README.md` und `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`
  beschreiben das `ns`-Attribut an keiner Stelle (nachgesehen, kein Treffer), und die Änderung stellt
  zugesichertes Verhalten her, statt eine API zu ändern. Nicht berührt auch `packages/shae-offscreen-canvas/build.mjs`:
  die Auslieferung hat noch nie einen Changelog getragen — `packages/shadow-objects/dist/` enthält weder
  `README.md` noch `CHANGELOG.md`.
- Vorgehen:
  1. **Angriffsmodell, zwei Sätze.** Das `ns`-Attribut setzt, wer das Markup des
     `<shae-offscreen-canvas>`-Elements schreibt — und sobald ein Framework-Template den Wert aus
     Anwendungsdaten bindet (React `ns={…}`, Vue `:ns`, Angular `[attr.ns]`), setzt es, wer diese Daten
     liefert; heute erreicht er damit, dass ein `"` im Wert das Attribut beendet und der Rest als Markup in
     den Shadow-Root geschrieben wird, also `"><img src=x onerror=…>` im Origin der Seite ausführt und
     nebenbei das nachfolgende `token="ShaeOffscreenCanvas"` verschluckt, womit die Entity ihr Token
     verliert. Danach wandert derselbe Wert durch `setAttribute()` in das Entity-Element: er kann kein
     Attribut mehr beenden und kein Tag mehr öffnen, der Shadow-Root behält genau die sechs Elemente
     seiner Vorlage, und ein Namespace mit Anführungszeichen ist wieder das, was er sein soll — ein
     Bezeichner.

     Das ist keine Härtung auf Verdacht: `packages/shae-offscreen-canvas/index.html:125` benutzt
     `<shae-offscreen-canvas … ns="foo">` produktiv, der Pfad ist also live.
  2. **Der Regressionstest, und zwar zuerst.** Neue Datei
     `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js`. Sie läuft im Runner,
     den das Paket hat: `vitest --run` unter happy-dom, `include: ['src/**/*.{spec,specs,test}.{js,ts}']`
     (`packages/shae-offscreen-canvas/vitest.config.ts`). Kein Browser-Runner — weder
     `shadow-objects-testing` noch `shadow-objects-e2e` hängt an diesem Paket, und eine Abhängigkeit dorthin
     aufzumachen wäre für einen Fix dieser Größe der falsche Preis.

     **Die Falle.** happy-dom 20.11.2 übergibt einem Custom-Element-Konstruktor niemals seine Attribute:
     es konstruiert zuerst und schreibt die Attribute des Markups danach, und ein Upgrade ersetzt den
     Knoten, statt ihn zu beleben. Nachgemessen an allen drei Wegen — `document.body.innerHTML` mit
     bereits definiertem Element, `innerHTML` vor `customElements.define`, und `createElement` +
     `setAttribute` vor `define` — sah der Konstruktor jedes Mal `getAttribute('ns') === null`. Der ganze
     `ns`-Pfad dieses Elements liegt im Konstruktor. **Über Markup ist er in diesem Runner nicht
     erreichbar**; wer es über `document.body.innerHTML = '<shae-offscreen-canvas ns="…">'` versucht,
     bekommt einen Test, der vor *und* nach dem Fix grün ist und nichts zusichert.

     Der Weg, der trägt: eine Unterklasse beantwortet die beiden Attribut-Aufrufe selbst. `#readNsAttr()`
     ruft `this.hasAttribute(ATTR_NS)` und `this.getAttribute(ATTR_NS)` — beides Prototyp-Methoden, die
     schon während `super()` dynamisch aufgelöst werden. Kopf der Datei, exakt so:

     ```js
     import '@spearwolf/shadow-objects/shae-ent.js';
     import {describe, expect, it} from 'vitest';
     import {ShaeOffscreenCanvasElement} from './ShaeOffscreenCanvasElement.js';

     /**
      * happy-dom constructs a custom element before it copies the attributes of the markup onto it, and
      * an upgrade replaces the node rather than reviving it. The namespace is read in the constructor,
      * so no markup in this runner reaches that read. The subclass answers the two attribute calls of
      * the constructor itself — both are prototype methods and resolve dynamically inside `super()` —
      * which puts the value under test exactly where the element looks for it.
      */
     let nsAttributeValue = '';

     class NsProbeElement extends ShaeOffscreenCanvasElement {
       hasAttribute(name) {
         return name === 'ns' ? nsAttributeValue !== '' : super.hasAttribute(name);
       }

       getAttribute(name) {
         return name === 'ns' ? nsAttributeValue : super.getAttribute(name);
       }
     }

     customElements.define('ns-probe-element', NsProbeElement);

     const createWithNamespace = (ns) => {
       nsAttributeValue = ns;
       return document.createElement('ns-probe-element');
     };

     /**
      * A namespace that ends the attribute it is written into. The `onerror` handler makes it a realistic
      * payload; what the assertions look at is the element it smuggles in, because script execution out
      * of injected markup is not observable in this runner.
      */
     const NS_THAT_ENDS_ITS_ATTRIBUTE = '"><img id="ns-escape" src="x" onerror="globalThis.nsEscaped = true">';
     ```

     Der Import von `@spearwolf/shadow-objects/shae-ent.js` ist nicht schmückend: der Konstruktor liest in
     seinem `createEffect` `this.shadowEntity.viewComponent$`, und ohne definiertes `<shae-ent>` wirft
     genau diese Zeile. Das Element wird mit `createElement` erzeugt und **nicht** in das Dokument gehängt —
     `connectedCallback()` startet den `FrameLoop`, und ein laufender rAF-Zyklus hat in dieser Spec nichts
     zu suchen.

     Fünf Fälle unter `describe('ShaeOffscreenCanvasElement', …)`, Testnamen als englische Aussagesätze in
     der dritten Person Singular, wie in `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`:

     1. `puts the namespace of the element on the entity of its shadow root` —
        `createWithNamespace('my-namespace')`. Erwartet: `el.shadowEntity.getAttribute('ns')` ist
        `'my-namespace'` und `el.ns` ist `'my-namespace'`. Grün vor und nach dem Fix; der Fall hält fest,
        wofür das Attribut da ist, und wird rot, wenn der Fix es verliert.
     2. `leaves the entity without a namespace attribute when the element carries none` —
        `createWithNamespace('')`. Erwartet: `el.shadowEntity.hasAttribute('ns')` ist `false` und
        `el.shadowEntity.ns` ist ein Symbol (`GlobalNS`). Grün vor und nach dem Fix.
     3. `keeps a namespace that ends its attribute inside the attribute` —
        `createWithNamespace(NS_THAT_ENDS_ITS_ATTRIBUTE)`. Erwartet:
        `el.shadowEntity.getAttribute('ns')` ist `NS_THAT_ENDS_ITS_ATTRIBUTE`. **Rot vor dem Fix**: der
        Wert ist heute die leere Zeichenkette, weil das `"` das Attribut beendet hat.
     4. `builds no element its template does not name, whatever the namespace contains` —
        `createWithNamespace(NS_THAT_ENDS_ITS_ATTRIBUTE)`. Erwartet:
        `el.shadow.getElementById('ns-escape')` ist `null` und `el.shadow.querySelectorAll('*').length`
        ist `6` (style, div.frame, canvas, div.content, shae-ent, slot). **Rot vor dem Fix**: das `<img>`
        steht im Shadow-Root und die Zahl ist 7.
     5. `keeps the token of the entity when the namespace ends its attribute` —
        `createWithNamespace(NS_THAT_ENDS_ITS_ATTRIBUTE)`. Erwartet:
        `el.shadowEntity.getAttribute('token')` ist `'ShaeOffscreenCanvas'`. **Rot vor dem Fix**: das
        `token`-Attribut steht hinter der Einbruchstelle und wird vom Parser zu Text, `getAttribute`
        liefert `null`. Der Fall zeigt die zweite Hälfte des Schadens — der Einbruch nimmt der Entity
        ihr Token, sie bekommt also nicht nur fremdes Markup, sie verliert ihre eigene Funktion.

     Diese Datei wird geschrieben und ausgeführt, **bevor** Schritt 3 die Quelle anfasst. Die drei roten
     Fälle sind der Beleg; ohne sie ist der Fix eine Behauptung.

     Zum Stil: die einzige vorhandene Spec des Pakets (`src/shared/utils.specs.js`) benutzt noch
     `@esm-bundle/chai` und einen `eslint-env`-Kommentar. Das ist Altbestand, kein Vorbild — die neue Datei
     benutzt benannte Importe aus `vitest`, wie jede Spec in `packages/shadow-objects/src`. `globals: true`
     steht in der Konfiguration des Pakets; die Importe stehen trotzdem da, weil sie die Datei ohne
     Kenntnis der Konfiguration lesbar machen.
  3. **Der Fix.** In `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`:

     a) In `InitialHTML` (Zeile 43) den Platzhalter samt seinem Leerzeichen entfernen — die Zeile lautet
        danach `<shae-ent id="${ENTITY_ID}" token="ShaeOffscreenCanvas">`. `%NS%` kommt im ganzen Repo
        nur an dieser einen Stelle und in Zeile 71 vor (nachgesehen).

     b) Die Zeilen 68–74 des Konstruktors werden zu:

        ```js
        this.shadow = this.attachShadow({mode: 'open'});

        // The template is parsed while its content is still detached from the document: a namespace
        // handed to setAttribute() cannot end the attribute or open a tag the way a value spliced into
        // markup can, and the entity element enters the shadow root with its namespace already set,
        // so it never connects to the global environment on its way to the one it belongs in.
        const template = document.createElement('template');
        template.innerHTML = initialHTML;

        const ns = this.#readNsAttr();
        if (ns) {
          template.content.getElementById(ENTITY_ID).setAttribute(ATTR_NS, ns);
        }

        this.shadow.appendChild(template.content);

        this.canvas = this.shadow.getElementById(DISPLAY_ID);
        this.shadowEntity = this.shadow.getElementById(ENTITY_ID);
        ```

        `const ns = this.#readNsAttr() || '';` aus Zeile 70 wird zu `const ns = this.#readNsAttr();` und
        rutscht hinter das Parsen — `#readNsAttr()` liefert bereits `''`, wenn nichts da ist, das `|| ''`
        war doppelt gemoppelt.

     c) Warum die Vorlage über ein `<template>` und nicht über `this.shadow.innerHTML = initialHTML`
        gefolgt von `setAttribute`: auf dem Upgrade-Weg — dem einzigen, auf dem das `ns`-Attribut im
        Konstruktor überhaupt ankommt — hängt der Host bereits im Dokument. Ein Schreiben auf
        `shadow.innerHTML` verbindet das `<shae-ent>` sofort, sein `connectedCallback()` läuft mit
        `GlobalNS`, und der Namespace-Wechsel danach zieht eine Entity durch die globale Umgebung, die dort
        nie hingehörte. `template.content` ist ein loser Fragment-Knoten: das Attribut sitzt, bevor
        irgendetwas verbunden wird. `DocumentFragment.getElementById()` ist Teil von `NonElementParentNode`
        und in happy-dom wie in den Browsern vorhanden.

     d) Kein Validieren der Namespace-Form. `toNamespace()` in
        `packages/shadow-objects/src/utils/toNamespace.ts` nimmt jede nichtleere Zeichenkette, und
        `<shae-ent ns="…">` tut dasselbe. Eine Prüfung nur in diesem einen Element würde zwei Elemente mit
        demselben Attributnamen auseinanderlaufen lassen, ohne etwas zu gewinnen, das `setAttribute()`
        nicht schon leistet. Die zweite Hälfte der Empfehlung (»escapen und validieren«) gilt dem Weg, den
        wir nicht gehen.

     e) Keine Schutzabfrage um `getElementById(ENTITY_ID)`. Eine Vorlage ohne dieses Element bringt den
        Konstruktor drei Zeilen später ohnehin zu Fall (`this.shadowEntity.viewComponent$` im Effekt); ein
        `?.` an dieser Stelle würde den Ausfall nur verschieben und verschleiern. Der `initialHTML`-Parameter
        hat schon immer beide IDs vorausgesetzt.
  4. **Changelog.** `@spearwolf/shae-offscreen-canvas` wird eigenständig veröffentlicht — eigene Version
     (`0.6.0`), eigenes `publishConfig`, eigenes `publishNpmPkg`-Skript — und bekommt deshalb den
     Changelog, den `CLAUDE.md` für genau diesen Fall vorsieht. Neue Datei
     `packages/shae-offscreen-canvas/CHANGELOG.md`, aufgebaut wie `packages/shadow-objects/CHANGELOG.md`:
     Titelzeile, der Hinweis auf Keep-a-Changelog und Semver, der Verweis auf die Wurzel-`CHANGELOG.md` für
     Monorepo-Vorgänge, dann `## [Unreleased]` mit zwei Einträgen:

     - `<shae-offscreen-canvas>` baut seinen Shadow-Root aus einer losen Vorlage und übergibt das
       `ns`-Attribut mit `setAttribute()` an das Entity-Element. Ein Namespace, der `"`, `<` oder `>`
       enthält, kommt als die Zeichenkette an, die er ist, statt das Attribut zu beenden und den Rest
       seines Werts als Markup in den Shadow-Root zu schreiben. Wer `ns` aus Anwendungsdaten bindet, war
       damit über einen XSS-Vektor erreichbar.
     - Das `initialHTML`-Argument des Konstruktors kennt keinen `%NS%`-Platzhalter mehr. Eine von einer
       Unterklasse übergebene Vorlage, die `%NS%` enthält, behält ihn als Text.

     Die beiden Einträge nennen den Vorzustand, weil ein Changelog genau dafür da ist — ein Konsument muss
     ihm entnehmen können, ob er betroffen war. Das ist die Stimme, in der auch
     `packages/shadow-objects/CHANGELOG.md` geschrieben ist, und der einzige Ort in diesem Lauf, an dem die
     Regel »kein Rückblick auf den Vorzustand« nicht greift.

     Kein Eintrag in der Wurzel-`CHANGELOG.md`: an Build, Orchestrator, Lint oder Dev-Workflow ändert sich
     nichts. Kein Eintrag in `packages/shadow-objects/CHANGELOG.md`: das Kernpaket wird nicht angefasst.
  5. **`CLAUDE.md` nachziehen**, im Abschnitt »Changelogs and Backlog — keep them in sync«, vier Stellen:
     - Zeile 86: »Two changelogs live in this repo« → »Three changelogs«.
     - Nach dem Aufzählungspunkt zu `packages/shadow-objects/CHANGELOG.md` ein dritter Punkt für
       `packages/shae-offscreen-canvas/CHANGELOG.md` mit demselben Zuschnitt: Laufzeit-API,
       Laufzeitabhängigkeiten, Verhaltensänderungen von `@spearwolf/shae-offscreen-canvas`.
     - In der Tabelle eine Zeile: »`packages/shae-offscreen-canvas/src/`, Verhalten, das Konsumenten von
       `@spearwolf/shae-offscreen-canvas` sehen« → »`packages/shae-offscreen-canvas/CHANGELOG.md`
       (Unreleased)«.
     - Zeile 99 ersetzen: die übrigen Pakete des Workspace (`shadow-objects-testing`, `shadow-objects-e2e`)
       sind `private` und führen keinen Changelog; ein Paket, das anfängt, veröffentlicht zu werden, bekommt
       einen und folgt derselben Aufteilung.
  6. **Formatieren.** `pnpm lint:fix` und `pnpm format` — Zeilenbreite 130, einfache Anführungszeichen,
     durchgehende Trailing Commas, `bracketSpacing: false`. Der Payload in der Spec ist eine Zeichenkette
     mit doppelten Anführungszeichen darin und steht deshalb korrekt in einfachen; Biome dreht das nicht um.
     `CHANGELOG.md` ist in `biome.json` von `files.includes` ausgenommen (`!**/CHANGELOG.md`) — das neue
     bleibt unformatiert und muss von Hand sauber sein.
- Verify:
  1. Rot zuerst: `pnpm -F @spearwolf/shae-offscreen-canvas test` **vor** Schritt 3. Erwartet: die Fälle 3, 4
     und 5 fallen, die Fälle 1 und 2 stehen. Die Ausgabe gehört in den Bericht des Implementierers.
  2. Grün danach: dasselbe Kommando nach Schritt 3, alle fünf Fälle grün.
  3. Von der Wurzel `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`. Die Gesamtzahl steigt
     von 753 um 5 auf 758; das Paket `shae-offscreen-canvas` geht dabei von 1 auf 6 Tests.
  4. Auslieferung: `pnpm build` schreibt `packages/shae-offscreen-canvas/.npm-pkg` neu.
     `find packages/shae-offscreen-canvas/.npm-pkg -type f | sort` vor und nach dem Paket vergleichen — die
     einzige zulässige Abweichung ist die neue `src/elements/ShaeOffscreenCanvasElement.spec.js`. Dass
     `build.mjs` das gesamte `src/` kopiert und Specs damit im veröffentlichten Paket landen, ist
     vorbestehend (`.npm-pkg/src/shared/utils.specs.js` liegt heute dort) und geht als eigene Zeile nach
     Paket 12.
  5. Von Hand: `pnpm -F @spearwolf/shae-offscreen-canvas dev` und `packages/shae-offscreen-canvas/index.html`
     im Browser öffnen. Zeile 125 der Seite benutzt `<shae-offscreen-canvas … ns="foo">`; die zugehörige
     Ebene muss rendern wie vorher. Das ist der einzige Nachweis über einen echten Upgrade-Pfad, den dieser
     Lauf ohne neue Abhängigkeit bekommt.
- Commit: `fix(shae-offscreen-canvas): build the shadow root instead of splicing the namespace into its markup`
- Ergebnis: 1 Nachbesserungsrunde · `SEC-NS-001` behoben (`ShaeOffscreenCanvasElement.js:74-82`, der
  Attributwert erreicht keine Markup-Senke mehr) · 6 neue Fälle, Gesamtzahl 753 → 759 · das Paket
  `shae-offscreen-canvas` hat jetzt einen eigenen Changelog · Auslieferung unverändert (22 Dateien in
  `.npm-pkg`, Liste identisch) · klein und offen gelassen: der sechste Testfall erzeugt sein Element per
  `new NsProbeElement(...)` statt über den Helfer `createWithNamespace()`, zwei Erzeugungsidiome in einer
  Datei, und er zerschneidet die Gruppe der Payload-Fälle
- Offen: Verify-Schritt 5 (manueller Browser-Durchgang über `packages/shae-offscreen-canvas/index.html:125`
  mit `ns="foo"`) wurde nicht ausgeführt — der einzige Nachweis über einen echten Upgrade-Pfad, den kein
  Test dieses Pakets ersetzt. Beide Automat-Nachweise laufen über eine Subklassen-Sonde, weil happy-dom
  einem Custom-Element-Konstruktor niemals seine Attribute übergibt.
- Nebenbefunde: `packages/shae-offscreen-canvas/package.json:49` — `@esm-bundle/chai` und `sinon` stehen als
  devDependencies, `sinon` kommt in keiner Quelldatei des Pakets vor, Chai nur in `src/shared/utils.specs.js`
  · `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:110` — der Setter
  `frameLoopIsRunning` greift über `this.viewComponent` auf `this.shadowEntity.viewComponent` durch und
  wirft bei fehlendem Entity-Element sofort (bewusst so)
- Folgen: keine — `%NS%` kommt im Repo nicht mehr vor, der `initialHTML`-Parameter hat außerhalb der Klasse
  keinen Aufrufer, und weder `README.md` noch `docs/` des Pakets erwähnen das `ns`-Attribut
- Schnittstellen: `ShaeOffscreenCanvasElement` nimmt weiterhin ein `initialHTML`-Argument, aber ohne
  Platzhalter-Vertrag: der Namespace landet per `setAttribute()` auf dem Element mit der Id `entity`, eine
  Vorlage braucht keinen `%NS%` mehr (und ein verbliebener wird vom Parser zu einem leeren Attribut
  dieses Namens) · `packages/shae-offscreen-canvas/CHANGELOG.md` ist neu und führt `Next release: minor`,
  `0.6.0` → `0.7.0` · `AGENTS.md` und `CLAUDE.md` verlangen die Doku-Trias jetzt je Paket statt pauschal
  für das Kernpaket

**SEC-NS-001 · HTML-Injection über das ns-Attribut in ShaeOffscreenCanvasElement · medium · packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:71**
Der Shadow-Root wird aus einem Template zusammengesetzt: shadow.innerHTML = initialHTML.replaceAll('%NS%', ns ? `ns="${ns}"` : ''). ns stammt ungeprüft aus getAttribute('ns'). Ein Anführungszeichen im Attributwert bricht aus dem Attribut aus und schreibt beliebiges Markup in den Shadow-Root. Direkt ausgenutzt wird das nur von jemandem, der das Markup ohnehin kontrolliert — kritisch wird es, sobald das Attribut aus Anwendungsdaten gebunden wird, wie es jedes Framework-Template tut (React attr-Binding, Vue :ns, Angular [attr.ns]). Dann ist es ein regulärer XSS-Vektor.
Empfehlung: Das Element aufbauen statt zusammenstringen: Template einmal ohne Platzhalter parsen und das ns-Attribut danach per setAttribute setzen. Wo Template-Ersetzung bleiben soll, den Wert vorher escapen und gegen die erlaubte Namespace-Form validieren.

### [x] 4. MessageRouter: eine Bestätigung, geordneter Teardown, geprüfter Eingang
- Findings: ROUTER-001 (medium), ROUTER-002 (medium), ROUTER-003 (medium)
- Ziel: Ein Change Trail erzeugt genau eine Bestätigung, `destroy` räumt den Kernel ab, und eine unbrauchbare Nachricht wird verworfen statt den Worker aufzureißen.
- Bereich: `packages/shadow-objects/src/worker/MessageRouter.ts`, `WorkerRuntime.ts`
- Hängt ab von: Paket 2 (die Specs müssen stehen, damit die drei Defekte rot gesehen werden). Welche Fälle umzudrehen sind, steht in Schritt 12 des Detailplans von Paket 2 — mit Gruppe, Testname und der Erwartung, die sich ändert. Zwei Punkte darin sind Entscheidungen dieses Pakets, keine Folgen: ob `Destroy` über das Abräumen des Kernels hinaus zur Sperre für weitere Nachrichten wird, und ob die Eingangsprüfung in `WorkerRuntime`, in `MessageRouter` oder in beiden sitzt.
- Modell: stärkste Stufe
- Hash: b045915
- Nachtrag aus der Triage in Zug 0 von Paket 3 (2026-08-19), zwei vorbestehende Nebenbefunde aus Paket 2,
  beide in `worker/WorkerRuntime.ts`, beide ohne Finding. Nachgewiesen vorbestehend: `1f0f44d` hat nur
  `MessageRouter.spec.ts` und `WorkerRuntime.spec.ts` angelegt, und `git show d6e91f5:packages/shadow-objects/src/worker/WorkerRuntime.ts`
  ist byteidentisch mit dem heutigen Stand.
  - `WorkerRuntime.ts:18-21` — `start()` hat kein Gegenstück; nichts nimmt den `message`-Hörer je wieder
    von `self`. **Die Zuordnung »hängt an der Sperr-Entscheidung« trägt nur halb**: ob `Destroy` weitere
    Nachrichten sperrt, sagt nichts darüber, ob der Hörer abgemeldet wird — das sind zwei Achsen. Der
    Befund gehört trotzdem hierher, und zwar als eigener Schritt: dieses Paket legt fest, was `Destroy`
    auf der Worker-Seite bedeutet, und solange der Hörer auf `self` liegen bleibt, hält `self` den Router
    und über ihn den Kernel fest. Entscheidet das Paket »abräumen, nicht sperren«, ist ein `stop()`, das
    `removeEventListener` ruft, das einzige Mittel, mit dem ein `Destroy` die Runtime tatsächlich beenden
    kann. Im ausgelieferten Worker ist der Schaden begrenzt: `src/shadow-objects.worker.js:6` ruft
    `start()` einmal, und `terminate()` wirft ohnehin den ganzen Thread weg.
  - `WorkerRuntime.ts:20` — ein zweiter `start()` schickt ein zweites `{type: Loaded}`; `addEventListener`
    entdoppelt den Hörer, die Meldung nicht. **Hängt nicht an der Sperr-Entscheidung**, sondern ist eine
    fehlende Idempotenz von `start()`. Auslösbar ist das heute nur von außen — `start()` wird im Repo an
    genau einer Stelle gerufen (`src/shadow-objects.worker.js:6`), von einem Modul-Top-Level. Der Befund
    kommt hierher, weil dieses Paket dieselbe Datei und denselben Lebenszyklus anfasst und die Wache im
    selben Zug fällt wie das Gegenstück aus dem Punkt darüber, nicht weil er dringend wäre.
- Dateien:
  - `packages/shadow-objects/src/worker/MessageRouter.ts`
  - `packages/shadow-objects/src/worker/WorkerRuntime.ts`
  - `packages/shadow-objects/src/worker/MessageRouter.spec.ts`
  - `packages/shadow-objects/src/worker/WorkerRuntime.spec.ts`
  - `packages/shadow-objects/CHANGELOG.md` (Unreleased)
  - `packages/shadow-objects/docs/api-reference.md` (Zeile 1315 und der Absatz darunter)
  - `packages/shadow-objects/docs/cheat-sheet.md` (der `env.destroy()`-Block ab Zeile 399)
  - `Backlog.md` — der Defekt steht dort als offener Punkt (§7.1 Muss-Punkt 3, dazu die Abdeckungstabelle
    und die Schluss-Empfehlung). `CLAUDE.md` verlangt den Abgleich nach jeder Changelog-Änderung; in Zug 4
    nachgetragen, nachdem der Implementierer die Datei von sich aus mitgezogen hatte.

  Keine neue Datei. Das ist Absicht: der Lib-Transpile bildet `src/**` eins zu eins nach
  `dist/src/**` ab, ein neues Modul im `worker/`-Verzeichnis würde also die Dateiliste der
  Auslieferung ändern — laut `CLAUDE.md` ein eigener bewusster Akt. Das gemeinsame Prädikat der
  Eingangsprüfung wohnt deshalb in `MessageRouter.ts` und wird von dort importiert.

  Nicht berührt: `packages/shadow-objects/README.md` (`grep -n "destroy\|Destroy"` ohne Treffer),
  `packages/shadow-objects/src/index.ts` (weder `MessageRouter` noch `WorkerRuntime` sind von dort
  oder über die `exports`-Map erreichbar — beide sind intern, nur `./shadow-objects.worker.js` ist
  öffentlich und ruft `start()`), die Wurzel-`CHANGELOG.md` (kein Monorepo-Vorgang) und
  `docs/api-reference.md:383` (die zwei Wege, auf denen ein Shadow Object endet, bleiben zwei — ein
  Environment-Teardown zerstört die Entities und fällt damit unter den ersten).
- Vorgehen:
  1. **Entscheidung A: `Destroy` wird zur Sperre, nicht nur zum Abräumen.** Nach dem Teardown
     verwirft der Router jede weitere Nachricht; die einzige Ausnahme ist ein wiederholtes
     `Destroy`, das erneut mit `Destroyed` beantwortet wird.

     Begründung, dreiteilig. Erstens ist der Zustand nach dem Abräumen ohne Sperre in sich
     widersprüchlich: `#onDestroy()` meldet den Router per `off(this.kernel, this)` vom Kernel ab,
     ein danach angewendeter Change Trail baut also Entities auf, deren Nachrichten an die View
     nirgendwo mehr ankommen. Der Router nähme Arbeit an, über die er nicht mehr berichten kann.
     Zweitens ist die Sperre die Entsprechung zur View-Seite: `RemoteWorkerEnv.destroy()`
     (`view/RemoteWorkerEnv.ts:269-290`) setzt `#isDestroyed`, gibt die Worker-Referenz frei und
     weist jeden späteren Aufruf mit `WorkerDestroyedError` ab — `view/` und `worker/` sind
     Spiegelbilder, und ein Teardown, der sich stillschweigend rückgängig machen lässt, ist auf der
     einen Seite endgültig und auf der anderen nicht. Drittens kostet sie nichts: im ausgelieferten
     Pfad schickt die View nach ihrem `Destroy` nichts mehr, die Sperre trifft also ausschließlich
     Nachrichten aus fremder Hand — genau die Sorte, die `ROUTER-003` schon behandelt.

     Die Ausnahme für das zweite `Destroy` ist keine Inkonsequenz, sondern das Protokoll: die
     Bestätigung ist die Antwort, auf die `waitForMessageOfType(worker, Destroyed, WorkerDestroyTimeout)`
     wartet, und der Absender kann nicht wissen, ob die erste angekommen ist. Die Teardown-Arbeit
     selbst läuft trotzdem genau einmal.

     Folge für Schritt 12 des Detailplans von Paket 2: der Fall
     `clears the set of imported modules so the same module registers again` **entfällt** (siehe
     Testliste unten, Punkt 6). `#importedModules.clear()` bleibt im Code — es gibt die
     Modulobjekte frei, die der Router sonst bis zum `terminate()` festhält —, ist von außen aber
     nicht mehr beobachtbar.

     Nicht Teil dieser Entscheidung: `data.serial` bleibt eine Wahrheitswert-Prüfung. Die Null als
     Seriennummer erzeugt kein Produzent (`view/RemoteWorkerEnv.ts:225` zählt mit `++` ab 1), und
     eine Umstellung auf `!= null` würde das Protokoll um einen Fall erweitern, den niemand sendet.
     Der Fall `routing › treats a serial of 0 like no serial at all` bleibt deshalb unverändert
     stehen.
  2. **Entscheidung B: die Eingangsprüfung sitzt in beiden, mit einem gemeinsamen Prädikat.**
     `WorkerRuntime.onmessage` liest `event.data.type` (`WorkerRuntime.ts:9`), bevor überhaupt ein
     Router existiert — eine Prüfung nur im Router ließe genau den Einstiegspunkt ungeschützt, an
     dem der Ausfall heute passiert. Umgekehrt ist `MessageRouter.route()` der Vertragsträger: er
     ist für sich konstruierbar, wird in den Specs direkt gefahren und darf sich nicht darauf
     verlassen, dass ein Aufrufer vor ihm geprüft hat. Doppelte Logik entsteht dadurch nicht: das
     Prädikat steht einmal, jede Seite meldet ihren eigenen Verwurf.

     In `MessageRouter.ts`, oberhalb der Klasse, neben `ConfigurePayloadData`:

     ```ts
     /**
      * A payload this side can read is an object: every branch below takes a `type` off it and
      * then reads further fields. `null`, `undefined`, a number or a string come from someone who
      * does not speak this protocol, and reading through them takes the whole worker down over one
      * message. Deliberately a plain boolean rather than a type predicate: `event.data` is `any` on
      * both call sites, and narrowing it would only cost the branches below the payload types they
      * already have.
      */
     export const isReadableMessageData = (data: unknown): boolean => typeof data === 'object' && data !== null;
     ```

     Die Form `typeof … === 'object' && … !== null` ist die Grenze, die Paket 2 vorgezeichnet hat:
     `'changeTrail'`, `42` und `true` wandern damit in den Verwurf, ein `{}` dagegen nicht — das ist
     lesbar, hat nur kein `type` und gehört weiter in den Default-Zweig (`routing › names the whole
     payload when the message carries no type` bleibt grün). Kein `'type' in data`, keine
     Array-Abfrage: ein Array hat kein `type` und landet ohnehin im Default-Zweig.
  3. **Die Spec des Routers umdrehen — rot zuerst.** `packages/shadow-objects/src/worker/MessageRouter.spec.ts`.
     Alle Zeilennummern gelten für den Stand `ab626ae`. Reihenfolge: erst dieser Schritt komplett,
     dann laufen lassen, dann Schritt 4.

     1. `a change trail that fails` › `confirms a failed change trail twice -- once with the error and once without`
        (Kommentar ab :288, `it(` :291) → **umdrehen**.
        Neuer Name: `confirms a failed change trail once, with the error`.
        Alt: `expect(messages).toHaveLength(3)` und drei `toEqual`-Zeilen, die letzte
        `expect(messages[2]).toEqual({type: AppliedChangeTrail, serial: 2})`.
        Neu: `expect(messages).toHaveLength(2)`, die Zeile für `messages[2]` und der Kommentar
        darüber (»And then the second confirmation …«) fallen weg. `messages[0]` und `messages[1]`
        bleiben Wort für Wort stehen, ebenso die beiden `error`-Assertions und `hasEntity('a')`.
        Neuer Kommentar über dem Fall: eine Seriennummer, eine Bestätigung — die Fehlermeldung
        beendet den Trail, und die Auflösung des wartenden Aufrufers hängt nicht mehr davon ab,
        welche von zwei Nachrichten er zuerst sieht.
     2. `a change trail that fails` › `stops at the entry that throws and leaves the rest of the trail unapplied`
        (:315) → **Name bleibt**, Erwartung schrumpft.
        Alt: `toHaveLength(2)`, `messages[0]` mit `error`, `messages[1]` ohne.
        Neu: `toHaveLength(1)`, nur die Fehlerbestätigung; die Zeile für `messages[1]` fällt weg.
        `hasEntity('a') === true`, `hasEntity('b') === false` und `error` einmal bleiben.
        Der zweite Absatz des Kommentars (»That the same serial is confirmed twice afterwards …«)
        fällt weg; der erste, über den Abbruch, bleibt.
     3. **Neuer Fall** in derselben Gruppe, hinter Fall 2:
        `does not confirm a failing change trail that carries no serial` —
        `router.route(changeTrailMessage(undefined, setParent('a', 'ghost')))` mit `console.error`-Spion;
        aus `setup()` nur `{posted, router}` destrukturieren — `noUnusedLocals` gilt auch für Specs.
        Erwartet: `posted` ist leer, `error` genau einmal mit
        `'[MessageRouter] failed to apply change trail'`. Kommentar: bestätigt wird, wonach gefragt
        wurde — ohne Seriennummer wartet niemand, und eine unbestellte Bestätigung mit
        `serial: undefined` träfe auf der View-Seite auf einen Guard, der jede Fehlermeldung gegen
        die gerade laufende Anfrage wirft.
     4. `teardown` › `leaves the entities of the kernel in place` (Kommentar :342, `it(` :344) →
        **umdrehen**. Neuer Name: `clears the entities of the kernel`. Aufbau bleibt, Erwartung
        `expect(kernel.hasEntity('a')).toBe(false)`. Neuer Kommentar: der Teardown fährt den Kernel
        herunter, also laufen die `onDestroy`-Callbacks der Shadow Objects, bevor der Thread
        weggeworfen wird.
     5. `teardown` › `keeps routing change trails after the destroy` (Kommentar :354, `it(` :356) →
        **umdrehen**. Neuer Name: `discards the messages that arrive after the destroy`.
        Neuer Rumpf: `console.debug`-Spion merken
        (`const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)`), dann
        `router.route(message({type: Destroy}))`, dann
        `router.route(changeTrailMessage(2, createEntity('b')))` und
        `router.route(message({type: Configure, importModule: 'data:text/javascript,export const shadowObjects = {define: {}}'}))`.
        Erwartet: `kernel.hasEntity('b')` ist `false`, `posted.map((entry) => entry.message)` ist
        genau `[{type: Destroyed}]`, `router.isDestroyed` ist `true`, und `debug` hat zweimal
        `'[MessageRouter] discarding a message that arrived after the teardown'` als erstes Argument
        gesehen (`debug.mock.calls.filter(…)` oder zwei `toHaveBeenCalledWith`). Der `Configure`
        gehört in denselben Fall, weil die Sperre vor dem `switch` greift und der Import damit gar
        nicht erst startet — die Assertion braucht deshalb keinen Wartepunkt.
     6. `teardown` › `clears the set of imported modules so the same module registers again` (:384,
        samt Kommentar ab :379) → **löschen**, nicht umdrehen. Mit der Sperre wird der zweite
        `Configure` verworfen, `waitForPosted(posted, 3)` liefe in seinen Timeout, und
        `#importedModules.clear()` ist von außen nicht mehr beobachtbar. Die Aussage, die der Fall
        gehalten hat, ist damit gegenstandslos. Kein Import wird dadurch unbenutzt — `Configure`,
        `Destroy`, `Destroyed` und `ImportedModule` kommen in anderen Fällen weiter vor.
     7. `teardown` › `confirms every destroy it is sent` (Kommentar :367, `it(` :369) → **Name und
        Erwartung bleiben**, der Kommentar wird ersetzt und eine Assertion kommt dazu.
        Neu vor dem ersten `route`: `const kernelDestroy = vi.spyOn(kernel, 'destroy');` (dafür
        `kernel` aus `setup()` mit destrukturieren), am Ende
        `expect(kernelDestroy).toHaveBeenCalledTimes(1)`.
        Neuer Kommentar: die Bestätigung ist die Antwort, auf die die View wartet, und sie kann
        nicht wissen, ob die erste angekommen ist — also wird jedes `Destroy` beantwortet; die
        Teardown-Arbeit dahinter läuft einmal.
     8. **Neuer Fall** in `teardown`: `confirms the destroy even when the kernel teardown throws` —
        `vi.spyOn(kernel, 'destroy').mockImplementation(() => { throw new Error('teardown failed'); })`,
        Spione auf `console.debug` und `console.error`, dann `router.route(message({type: Destroy}))`.
        Erwartet: `posted.map((entry) => entry.message)` ist `[{type: Destroyed}]`, `error` einmal
        mit `'[MessageRouter] failed to tear the kernel down'`, `router.isDestroyed` ist `true`.
        Kommentar: ohne die Bestätigung sitzt die View ihren `WorkerDestroyTimeout` ab und erfährt
        nichts, womit sie etwas anfangen könnte.
     9. **Neuer Fall** in `teardown`: `discards a module import that resolves after the destroy` —
        ```ts
        const {posted, router} = setup();
        vi.spyOn(console, 'debug').mockImplementation(() => undefined);
        const url = 'data:text/javascript,export const shadowObjects = {define: {"test-token": function ShadowObjectDouble() {}}}';

        router.route(changeTrailMessage(1, createEntity('a')));
        router.route(message({type: Configure, importModule: url}));
        router.route(message({type: Destroy}));

        // the same url resolves from the same module job: once our own import is through, the
        // one the router started before it is through as well, and its continuation ran first
        await import(/* @vite-ignore */ url);
        await flushMicrotasks();

        expect(posted.map((entry) => entry.message.type)).toEqual([AppliedChangeTrail, Destroyed]);
        ```
        Der Fall hält das eine Zeitfenster fest, das die Sperre am `switch` nicht abdeckt: der
        Import ist unterwegs, wenn das `Destroy` eintrifft.
    10. `a message the router cannot read` › `it.each([null, undefined])('throws when the message data is %s')`
        (Kommentar :414, `it.each(` :416) → **umdrehen**. Neuer Name:
        `discards a message it cannot read: %s`. Neuer Rumpf: `console.debug`-Spion,
        `expect(() => router.route(message(value))).not.toThrow()`, `posted` leer, `debug` einmal
        mit `'[MessageRouter] discarding a message it cannot read'` als erstem und `value` als
        zweitem Argument. Neuer Kommentar: eine unlesbare Nachricht kostet die Nachricht, nicht den
        Worker.
    11. `a message the router cannot read` › `it.each(['changeTrail', 42, true])('warns about message data of %s instead of throwing')`
        (:424) → **umdrehen**. Dieser Fall steht nicht auf der Marker-Liste, kippt aber mit
        Entscheidung B, und zwar genau so, wie Schritt 12 von Paket 2 es vorhergesagt hat.
        Neuer Name: `discards message data of %s`. Neu: `console.debug`-Spion statt
        `console.warn`-Spion, `debug` einmal mit `'[MessageRouter] discarding a message it cannot read'`
        und `value`, zusätzlich `expect(warn).not.toHaveBeenCalled()` mit einem eigenen
        `console.warn`-Spion, `posted` leer. Der neue Kommentar zieht die Grenze dorthin, wo sie
        jetzt liegt: ein Primitiv ist keine Nachricht, ein Objekt ohne `type` schon — für das
        zweite steht `routing › names the whole payload when the message carries no type`.
  4. **`MessageRouter.ts`.** Vier Eingriffe, sonst nichts. Der auskommentierte `console.debug` in
     `#onChangeTrail` bleibt unangetastet.

     a) Feld und Lesezugriff, neben `#importedModules`:

     ```ts
     #isDestroyed = false;

     /** Whether this router has been torn down. It answers a repeated destroy and discards the rest. */
     get isDestroyed(): boolean {
       return this.#isDestroyed;
     }
     ```

     b) `route()` (:41-58) bekommt die beiden Wachen vor dem `switch`; der `switch` liest danach
     `data` statt `event.data`:

     ```ts
     route(event: MessageEvent) {
       const data = event.data;

       if (!isReadableMessageData(data)) {
         console.debug('[MessageRouter] discarding a message it cannot read', data);
         return;
       }

       // After the teardown the kernel is empty and nothing of it reaches the view any more, so a
       // change trail applied here would build entities nobody ever hears about. A repeated destroy
       // is the exception: its confirmation is the reply the view waits for, and the view cannot
       // know whether the first one arrived.
       if (this.#isDestroyed && data.type !== Destroy) {
         console.debug('[MessageRouter] discarding a message that arrived after the teardown', data.type);
         return;
       }

       switch (data.type) {
     ```

     c) `#onChangeTrail()` (:86-99): der `catch`-Zweig bestätigt und kehrt zurück, und er bestätigt
     nur, wo eine Seriennummer danach gefragt hat.

     ```ts
     #onChangeTrail(data: SyncEvent) {
       // console.debug('[MessageRouter] parseChangeTrail', {data, kernel: this.kernel});

       // One change trail, one confirmation -- and only where a serial asked for one. A caller
       // waiting on that serial decides between rejection and resolution on the first message it
       // sees, so a second one behind it would make the outcome a matter of order.
       try {
         this.kernel.run(data);
       } catch (error) {
         console.error('[MessageRouter] failed to apply change trail', error);
         if (data.serial) {
           this.postMessage({type: AppliedChangeTrail, serial: data.serial, error: `${error}`} as AppliedChangeTrailEvent);
         }
         return;
       }

       if (data.serial) {
         this.postMessage({type: AppliedChangeTrail, serial: data.serial} as AppliedChangeTrailEvent);
       }
     }
     ```

     d) `#onDestroy()` (:101-106):

     ```ts
     #onDestroy(data: any) {
       console.debug('[MessageRouter] on destroy', data);

       if (!this.#isDestroyed) {
         this.#isDestroyed = true;

         // taken off before the kernel goes down: a message a teardown callback dispatches reaches
         // the view a microtask later, behind the confirmation this call is about to send
         off(this.kernel, this);

         try {
           this.kernel.destroy();
         } catch (error) {
           // the confirmation is owed either way -- without it the view sits out its destroy
           // timeout before terminating the worker, and learns nothing it could act on
           console.error('[MessageRouter] failed to tear the kernel down', error);
         }

         // releases the module objects this router imported; nothing can import into it again
         this.#importedModules.clear();
       }

       this.postMessage({type: Destroyed});
     }
     ```

     e) `#configure()` bekommt nach dem `await import(…)` (:69) die Wache für das eine Zeitfenster,
     das der `switch` nicht sieht:

     ```ts
     const module = await import(/* @vite-ignore */ toUrlString(url));

     // the import outlived a teardown that happened while it was in flight: registering it now
     // would fill a kernel that is already down
     if (this.#isDestroyed) {
       console.debug('[MessageRouter] discarding a module that arrived after the teardown', url);
       return;
     }
     ```
  5. **Die Spec der Runtime umdrehen — wieder rot zuerst.** `packages/shadow-objects/src/worker/WorkerRuntime.spec.ts`.

     1. `it.each([null, undefined])('throws when the message data is %s')` (Kommentar :105,
        `it.each(` :108) → **umdrehen**. Neuer Name: `discards a message it cannot read: %s`.
        Neuer Rumpf: `console.debug`-Spion, `expect(() => runtime.onmessage(message(value))).not.toThrow()`,
        `expect(runtime.router).toBeUndefined()`, `debug` einmal mit
        `'[WorkerRuntime] discarding a message it cannot read'` und `value`. Neuer Kommentar: die
        Runtime liest den `type`, bevor ein Router existiert — deshalb prüft sie selbst, statt sich
        auf den zu verlassen, den es noch nicht gibt.
     2. `it('hands message data that is not an object to the router')` (:117) → **umdrehen**. Auch
        dieser Fall steht nicht auf der Marker-Liste; er kippt mit Entscheidung B, weil die Runtime
        jetzt selbst prüft. Neuer Name:
        `discards message data that is not an object without building a router`. Neu:
        `console.debug`- statt `console.warn`-Spion, `expect(runtime.router).toBeUndefined()`,
        `debug` einmal mit `'[WorkerRuntime] discarding a message it cannot read'` und `'nonsense'`,
        dazu `expect(warn).not.toHaveBeenCalled()` mit eigenem `console.warn`-Spion. Neuer
        Kommentar: was die Runtime nicht lesen kann, kostet keinen Kernel.
     3. **Neuer Fall**: `announces itself as loaded only once, however often it is started` —
        `const addEventListener = vi.spyOn(self, 'addEventListener'); const runtime = startRuntime(); runtime.start();`
        Erwartet: `postMessage` genau einmal mit `{type: Loaded}`, `addEventListener` genau einmal,
        `runtime.isStarted` ist `true`. Kommentar: `addEventListener` entdoppelt den Hörer von
        selbst, die Meldung an die View entdoppelt niemand — eine zweite `{type: Loaded}` ließe die
        View einen Handshake feiern, den sie längst hinter sich hat.
     4. **Neuer Fall**: `takes its message listener off self and releases its router when a destroy comes through` —
        ```ts
        const removeEventListener = vi.spyOn(self, 'removeEventListener');
        vi.spyOn(console, 'debug').mockImplementation(() => undefined);
        const runtime = startRuntime();

        self.dispatchEvent(new MessageEvent('message', {data: {type: Destroy}}));

        expect(postMessage).toHaveBeenCalledWith({type: Destroyed});
        expect(removeEventListener).toHaveBeenCalledWith('message', runtime.onmessage);
        expect(runtime.isStarted).toBe(false);
        expect(runtime.router).toBeUndefined();

        self.dispatchEvent(new MessageEvent('message', {data: changeTrail(9, createEntity('b'))}));

        expect(runtime.router).toBeUndefined();
        ```
        `Destroy` und `Destroyed` kommen dafür in den Import aus `../constants.js`. Der zweite
        Dispatch ist der eigentliche Nachweis: der Hörer liegt nicht mehr auf `self`.
  6. **`WorkerRuntime.ts`.** Vollständige neue Fassung der Klasse:

     ```ts
     import {Destroy, Loaded} from '../constants.js';
     import {CONSOLE_LOGGER, CONSOLE_LOGGER_STORAGE} from '../utils/ConsoleLogger.js';
     import {isReadableMessageData, MessageRouter} from './MessageRouter.js';

     export class WorkerRuntime {
       router?: MessageRouter;

       #isStarted = false;

       /** Whether this runtime is listening on the global scope. */
       get isStarted(): boolean {
         return this.#isStarted;
       }

       onmessage = (event: MessageEvent): void => {
         const data = event.data;

         // read before a router exists, so the check belongs here as well: a payload this side
         // cannot read would end the worker before anything of it is even built
         if (!isReadableMessageData(data)) {
           console.debug('[WorkerRuntime] discarding a message it cannot read', data);
           return;
         }

         if (data.type === CONSOLE_LOGGER) {
           // @ts-ignore
           globalThis[CONSOLE_LOGGER_STORAGE] = data.config;
           return;
         }

         this.router ??= new MessageRouter();
         this.router.route(event);

         if (data.type === Destroy) {
           // whoever put the listener on takes it off again: the router has confirmed the teardown
           // by now, and both it and its kernel would stay reachable from `self` for the rest of
           // the thread's life
           this.stop();
           this.router = undefined;
         }
       };

       start(): void {
         // `addEventListener` de-dupes the listener, the announcement is not de-duped: a second
         // start would tell the view of a handshake it has already completed
         if (this.#isStarted) return;
         this.#isStarted = true;

         self.addEventListener('message', this.onmessage);
         self.postMessage({type: Loaded}); // inform the main thread that we are ready
       }

       /** Stops listening on the global scope. A later `start()` picks the work up again. */
       stop(): void {
         if (!this.#isStarted) return;
         this.#isStarted = false;

         self.removeEventListener('message', this.onmessage);
       }
     }
     ```

     Damit sind beide Nebenbefunde aus Paket 2 erledigt: `start()` hat ein Gegenstück, das ein
     `Destroy` auch tatsächlich auslöst, und es ist idempotent. Der zweite Punkt gehört hierher und
     nicht ins nächste Audit, weil er dieselbe Datei, dasselbe Feld (`#isStarted`) und denselben
     Lebenszyklus betrifft wie das Gegenstück — getrennt behandelt wäre es zweimal derselbe Diff.
  7. **Changelog.** `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]`, im Stil der
     dortigen Aufzählung (`- **Bugfix (worker):** …`), drei Einträge:
     - **Bugfix (worker):** Ein Change Trail wird genau einmal bestätigt. Schlug er fehl, folgte
       der Fehlermeldung bisher eine zweite Bestätigung ohne Fehler zur selben Seriennummer, und
       welche von beiden der wartende Aufrufer zuerst sah, entschied darüber, ob `syncWait()`
       ablehnte oder auflöste. Ein Trail ohne Seriennummer wird gar nicht mehr bestätigt, auch im
       Fehlerfall nicht.
     - **Bugfix (worker):** Ein `Destroy` fährt den Kernel im Worker herunter. Alle Entities werden
       zerstört und jedes `onDestroy` der Shadow Objects läuft, bevor der Worker beendet wird —
       Timer, Subscriptions, `OffscreenCanvas`- und WebGL-Ressourcen werden also freigegeben, statt
       bis zum `terminate()` belegt zu bleiben. Beide Umgebungen enden damit gleich; der lokale Pfad
       tat das schon.
     - **Bugfix (worker):** Eine Nachricht, die der Worker nicht lesen kann — `null`, `undefined`,
       eine Zahl, eine Zeichenkette — wird mit einer Debug-Meldung verworfen. Bisher riss der
       Zugriff auf `data.type` den Worker mit einem `TypeError` auf, was auf der View-Seite als
       `WorkerFailedError` die gesamte Umgebung beendete. Nach dem Teardown verwirft der Worker
       jede weitere Nachricht; ein wiederholtes `Destroy` wird weiterhin bestätigt.

     Dazu der Kopf des Abschnitts: die Zeile »Twenty-two of them reach existing consumers« wird zu
     »Twenty-three«, und in die Aufzählung dahinter kommt eine Klausel — dass das `onDestroy` eines
     Shadow Objects beim Teardown einer Worker-Umgebung jetzt läuft, wo es nie lief, so dass Code,
     der dort etwas schließt oder meldet, an einer Stelle ausgeführt wird, an der er es bisher nicht
     wurde. Die beiden anderen Einträge bekommen keine Klausel: eine Bestätigung statt zweier und
     ein Verwurf statt eines Absturzes können keinen Aufrufer brechen, der heute funktioniert.

     Kein Eintrag in der Wurzel-`CHANGELOG.md`: an Build, Orchestrator, Lint oder Dev-Workflow
     ändert sich nichts.
  8. **Doku.** Zwei Stellen, beide in `packages/shadow-objects/docs/`:
     - `api-reference.md:1315`, die `destroy()`-Zeile der `RemoteWorkerEnv`-Methodentabelle, wird
       um einen Satz ergänzt: der Worker fährt auf diese Nachricht hin seinen Kernel herunter —
       jede Entity wird zerstört und jedes `onDestroy` läuft — bestätigt danach mit `Destroyed` und
       verwirft, was danach noch eintrifft.
     - Ebenda, direkt hinter dem Absatz »**`destroy()` counts once, and it counts always.**«, ein
       eigener kurzer Absatz »**What the worker does with it.**«: Reihenfolge (Kernel herunter,
       Bestätigung, Sperre), warum die Sperre existiert (nach dem Teardown erreicht keine Nachricht
       aus dem Kernel mehr die View), und dass ein wiederholtes `Destroy` weiterhin beantwortet
       wird. Kein Rückblick auf den Vorzustand — der steht im Changelog.
     - `cheat-sheet.md`, im `env.destroy()`-Block ab Zeile 399, eine Kommentarzeile hinter
       `env.destroy();`: dass der Worker seinen Kernel herunterfährt, bevor er beendet wird, und
       jedes `onDestroy` dabei läuft.
  9. **Formatieren.** `pnpm lint:fix` und `pnpm format` von der Wurzel — Zeilenbreite 130, einfache
     Anführungszeichen, `bracketSpacing: false`, durchgehende Trailing Commas. `CHANGELOG.md` ist in
     `biome.json` von `files.includes` ausgenommen und muss von Hand sauber sein.
- Verify:
  1. **Rot zuerst, Runde 1.** Nach Schritt 3, vor Schritt 4:
     `cd packages/shadow-objects && pnpm exec vitest src/worker/MessageRouter.spec.ts --run`.
     Erwartet fallen genau diese Fälle, und keine anderen:
     `a change trail that fails › confirms a failed change trail once, with the error` (drei
     Nachrichten statt zwei) · `… › stops at the entry that throws …` (zwei statt einer) ·
     `… › does not confirm a failing change trail that carries no serial` (eine statt keiner) ·
     `teardown › clears the entities of the kernel` (`hasEntity` ist `true`) ·
     `teardown › discards the messages that arrive after the destroy` (Entity entsteht,
     Bestätigung wird gepostet) · `teardown › confirms every destroy it is sent`
     (`kernel.destroy` nie gerufen) · `teardown › confirms the destroy even when the kernel teardown throws`
     (der Wurf des Spions erreicht niemanden, `console.error` bleibt aus) ·
     `teardown › discards a module import that resolves after the destroy` (drei Nachrichten) ·
     `a message the router cannot read › discards a message it cannot read: null|undefined` (wirft) ·
     `a message the router cannot read › discards message data of %s` (drei Fälle, `warn` statt `debug`).
     Der erste dieser Fälle ist der, auf den es ankommt — er ist `ROUTER-001` in einer Zeile. Die
     Ausgabe gehört in den Bericht.
  2. **Grün, Runde 1.** Dasselbe Kommando nach Schritt 4.
  3. **Rot zuerst, Runde 2.** Nach Schritt 5, vor Schritt 6:
     `pnpm exec vitest src/worker/WorkerRuntime.spec.ts --run`. Erwartet fallen:
     `discards a message it cannot read: null|undefined` (wirft) ·
     `discards message data that is not an object without building a router` (Router entsteht,
     `warn` fällt) · `announces itself as loaded only once, however often it is started`
     (`postMessage` zweimal) · `takes its message listener off self and releases its router when a destroy comes through`
     (`runtime.isStarted` existiert nicht, `removeEventListener` wurde nicht gerufen).
  4. **Grün, Runde 2.** Dasselbe Kommando nach Schritt 6.
  5. **Beide zusammen, zweimal hintereinander**: `pnpm exec vitest src/worker/MessageRouter.spec.ts src/worker/WorkerRuntime.spec.ts --run`,
     danach `pnpm -F @spearwolf/shadow-objects test` zweimal. `self` ist über die ganze Datei
     dasselbe Objekt; ein liegengebliebener `message`-Hörer zeigt sich als Warnung aus einem fremden
     Fall.
  6. **Von der Wurzel**: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`. Die
     Gesamtzahl geht von 759 auf **763**: ein gelöschter Fall, drei neue in `MessageRouter.spec.ts`,
     zwei neue in `WorkerRuntime.spec.ts` (die beiden `it.each`-Gruppen ändern ihre Zahl nicht).
  7. **Auslieferung**: `find packages/shadow-objects/dist -type f | sort` vor und nach dem Build
     ergibt dieselbe Liste — das Paket legt keine neue Quelldatei an. `packages/shadow-objects/dist/package.json`
     bleibt unverändert.
  8. **E2E**: `pnpm -F shadow-objects-e2e test`. Die Suite fährt echte Worker über
     `<shae-worker>` hoch und wieder herunter und ist der einzige Nachweis, dass der geordnete
     Teardown in einem echten Worker durchläuft, statt in einer happy-dom-Nachbildung.
- Commit: `fix(worker): one confirmation per change trail, a real teardown on destroy`

  Body (drei Zeilen, ohne Kürzel):
  `A failed change trail no longer posts a success behind its error, and a trail without a serial is not confirmed at all.`
  `A destroy tears the kernel down, so every onDestroy runs before the worker is terminated, and the router discards what arrives afterwards -- a repeated destroy is still confirmed.`
  `Both entry points drop a payload they cannot read instead of taking the worker down with it; WorkerRuntime.start() is idempotent and stop() takes its listener back off self.`
- Ergebnis: 1 Nachbesserungsrunde plus ein Nachtrag · alle drei Findings behoben · Entscheidung A hat sich in
  der Runde gedreht: `Destroy` sperrt **ausnahmslos**, ein wiederholtes wird nicht mehr bestätigt, weil die
  View konstruktionsbedingt kein zweites schicken kann (`RemoteWorkerEnv.ts:276-285` gibt die Worker-Referenz
  frei und steigt beim zweiten Aufruf aus) und der einzige Wartelauf nach seinem Timeout ohnehin terminiert ·
  6 neue Fälle, Gesamtzahl 759 → 765 · Auslieferung unverändert (198 Dateien in `dist`, Liste identisch,
  `dist/package.json` gleich) · E2E 402 in beiden Browsern, der einzige Nachweis, dass der Teardown in einem
  echten Worker durchläuft
- Abweichung vom Detailplan: der Fall `confirms every destroy it is sent` aus Schritt 3.7 heißt jetzt
  `confirms the first destroy and discards the second` — ein Fall kann die alte und die neue Zusage nicht
  gleichzeitig halten. Der Plan ist an der Stelle überholt, nicht verletzt.
- Nebenbefunde: `view/RemoteWorkerEnv.ts:286-288` — `waitForMessageOfType(...).finally(...)` hat kein
  `catch`; bleibt die Bestätigung aus, lehnt das Promise nach dem Timeout ab und niemand fängt es, also eine
  unbehandelte Rejection auf der View-Seite (vorbestehend) → Paket 5 · `in-the-dark/Kernel.ts:889-897` —
  `destroy()` läuft die Entities ohne Absicherung je Entity ab; ein werfendes `onDestroy` beendet den
  Durchlauf, die restlichen Entities bleiben stehen, und `#rootContexts` ist zu dem Zeitpunkt schon entsorgt
  (vorbestehend) → Paket 8, das den Kernel ohnehin anfasst · `packages/shadow-objects/CHANGELOG.md:131-156` —
  die Einträge älterer Releases tragen rund fünfzehn Audit-Kürzel im Fließtext (vorbestehend) → nächstes Audit
  · `packages/shadow-objects/src/worker/*.ts` enden ohne abschließenden Zeilenumbruch, Biome erzwingt hier
  nichts (kosmetisch)
- Folgen: keine
- Schnittstellen: **Verhaltensänderung am Worker-Protokoll.** Ein Change Trail erzeugt genau eine
  Bestätigung; ein Trail ohne Seriennummer erzeugt keine, auch im Fehlerfall nicht. Ein `Destroy` fährt den
  Kernel herunter und sperrt Router *und* Runtime endgültig — ein zweites `Destroy` bekommt keine Antwort,
  und weder eine spätere Nachricht noch ein `start()` holt die Runtime zurück. `WorkerRuntime` hat neu
  `stop()`, `isStarted` und `isDestroyed`; `start()` ist idempotent. Beide Einstiegspunkte verwerfen
  unlesbare `event.data` über ein gemeinsames Prädikat in `MessageRouter.ts` statt zu werfen. Ein
  `dispatchMessageToView()` aus einem `onDestroy` kommt in der entfernten Umgebung nicht mehr an, in der
  lokalen weiterhin — die einzige verbliebene Asymmetrie, in `docs/api-reference.md` benannt.

**ROUTER-001 · MessageRouter meldet einen fehlgeschlagenen Change Trail zusätzlich als Erfolg · medium · packages/shadow-objects/src/worker/MessageRouter.ts:84-97**
Im catch-Zweig wird ein AppliedChangeTrail mit error gepostet — anschließend läuft die Funktion weiter und postet bei gesetzter serial ein zweites AppliedChangeTrail ohne error. Nachgewiesen: ein Trail mit unbekannter parentUuid erzeugt exakt zwei Bestätigungen, [{serial:42, error:...}, {serial:42}]. Welche davon der Guard in waitForMessageOfType zuerst sieht, entscheidet, ob syncWait() ablehnt oder fälschlich auflöst.
Empfehlung: Nach dem Posten der Fehlerbestätigung aus der Methode zurückkehren (return im catch), damit pro Change Trail genau eine Bestätigung entsteht.

**ROUTER-002 · Destroy im MessageRouter räumt den Kernel nicht ab · medium · packages/shadow-objects/src/worker/MessageRouter.ts:99-104**
#onDestroy() meldet den Router vom Kernel ab, leert die Modul-Liste und bestätigt mit Destroyed — kernel.destroy() bleibt aus. Alle Entities, alle Shadow Objects und deren Signale und Effekte überleben. Damit läuft kein einziger onDestroy-Callback der Shadow Objects: Ressourcen, die dort freigegeben würden (OffscreenCanvas, WebGL-Kontexte, Timer, Subscriptions), bleiben bis zum terminate() des Workers belegt. Nachgewiesen: nach einer Destroy-Nachricht meldet kernel.hasEntity() für eine zuvor angelegte Entity weiterhin true.
Empfehlung: In #onDestroy() this.kernel.destroy() aufrufen, bevor Destroyed gepostet wird — damit räumt der Worker geordnet auf, statt sich auf terminate() zu verlassen. Der lokale Pfad in LocalShadowObjectEnv.destroy() macht es bereits richtig und ist die Vorlage.

**ROUTER-003 · MessageRouter und WorkerRuntime dereferenzieren event.data ungeprüft · medium · packages/shadow-objects/src/worker/MessageRouter.ts:42, 56; packages/shadow-objects/src/worker/WorkerRuntime.ts:9, 13**
Beide Einstiegspunkte lesen event.data ohne Prüfung. Weil das Feld den Typ any trägt, sieht auch strictNullChecks das nicht. Ein postMessage(null) aus fremdem Code reißt den Worker mit einem ungefangenen TypeError auf — und seit RemoteWorkerEnv einen error-Hörer führt, eskaliert das zu einem WorkerFailedError und zerlegt die gesamte Umgebung, statt eine unbrauchbare Nachricht zu verwerfen. Der Blast Radius ist damit größer als vor der Härtung der Ausfallpfade.
Empfehlung: Am Anfang beider Handler prüfen, ob event.data ein Objekt mit bekanntem type ist, und andernfalls verwerfen — mit einer Debug-Meldung, nicht mit einem Wurf. Der Guard, den #configure für die importModule-URL bereits führt, ist das Muster im Haus.

### [x] 5. RemoteWorkerEnv: Listener, Trail, Seriennummer, Ausfall-Retain
- Findings: CTX-LEAK (medium), TRAIL-MUT (low), NS-NORM (low), WORKER-003 (low)
- Ziel: Der Message-Listener ist abmeldbar, der weitergereichte Change Trail bleibt vollständig, die Seriennummer hat keine Lücken, und ein werfender Hörer verhindert das Retain nicht mehr.
- Bereich: `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`
- Hängt ab von: —
- Modell: stärkste Stufe (Concurrency und Ereignis-Identität)
- Hash: 1390e26
- Nachtrag aus Zug 0 von Paket 4 (2026-08-19), was dieses Paket auf der anderen Seite des Protokolls
  vorfindet. **Keine Abhängigkeit**: die beiden Pakete teilen keine Datei, und die Spec dieses Pakets
  fährt ein Worker-Doppel, das von der Worker-Seite nichts weiß. Die Reihenfolge ist frei.
  - Was der Worker nach Paket 4 sendet: pro Change Trail genau **eine** `AppliedChangeTrail`-Nachricht,
    und nur dort, wo die Anfrage eine Seriennummer trug — im Fehlerfall die mit `error`, sonst die ohne.
    Eine Bestätigung ohne Seriennummer kommt nicht mehr vor. Nach einem `Destroy` beantwortet der
    Worker nur noch ein wiederholtes `Destroy` mit `Destroyed` und verwirft alles andere; eine
    Nachricht, die er nicht lesen kann, beendet ihn nicht mehr, löst also auch keinen
    `error`-Ausfall mehr auf dieser Seite aus.
  - Vorbestehender Nebenbefund, aufgefallen beim Abgleich, ohne Finding: `view/RemoteWorkerEnv.ts:238`
    (und gleichlautend `:262`) — der Guard wirft bei **jeder** `AppliedChangeTrail`-Nachricht mit
    `error`, bevor er `data.serial === serial` prüft. Eine Fehlermeldung, die zu Trail N gehört,
    lehnt damit die Anfrage ab, die gerade auf Trail M wartet. Nachgewiesen vorbestehend:
    `git diff d6e91f5 HEAD -- packages/shadow-objects/src/view/RemoteWorkerEnv.ts` ist leer. Gehört
    hierher, weil dieses Paket die Seriennummern-Führung derselben Datei anfasst: der Fehler-Wurf
    gehört hinter den Seriennummern-Vergleich, für beide Guards.
- Dateien:
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`
  - `packages/shadow-objects/CHANGELOG.md` (Unreleased)
  - `packages/shadow-objects/docs/api-reference.md` — die `RemoteWorkerEnv`-Sektion, Zeilen 1305–1345
  - `Backlog.md` — zwei offene Punkte fallen mit diesem Paket (`§3.2`, der Absatz »Ein Worker, der beim
    Abbau schweigt, hinterlässt eine unbehandelte Rejection«, `:193-196`, und `§3.3` Zeile `:208`,
    **VIEW-9**), dazu die Fallzahl in der Abdeckungstabelle (`:297`). `CLAUDE.md` verlangt den Abgleich
    nach jeder Changelog-Änderung.

  Keine neue Datei — der Lib-Transpile bildet `src/**` eins zu eins nach `dist/src/**` ab, ein neues
  Modul im `view/`-Verzeichnis würde also die Dateiliste der Auslieferung ändern.

  Nicht berührt, jeweils mit Grund:
  - `packages/shadow-objects/README.md` und die Wurzel-`README.md`: beide nennen `RemoteWorkerEnv` nur
    als eine der zwei Proxy-Implementierungen (`packages/shadow-objects/README.md:7`, `README.md:134`),
    keine Zeile über Listener, Trail, Seriennummer oder `WorkerFailed`.
  - `docs/cheat-sheet.md`: die zwei Treffer (`:376`, `:381`) sind der Klassenname in einer Aufzählung
    und in einer Zuweisung.
  - Wurzel-`CHANGELOG.md`: an Build, Orchestrator, Lint oder Dev-Workflow ändert sich nichts.
  - `view/LocalShadowObjectEnv.ts`: die lokale Umgebung reicht den Trail unverändert an
    `cloneChangeTrail()` weiter (`:52`) und hat nie Transferables entfernt. Die Asymmetrie, die
    `TRAIL-MUT` benennt, verschwindet, indem die entfernte Seite sich anpasst — nicht umgekehrt.
  - `utils/waitForMessageOfType.ts`: die beiden Guards, die dieses Paket umbaut, werden von dort
    aufgerufen, die Datei selbst bleibt unverändert. Ihr eigener Befund geht ins nächste Audit (siehe
    dort).
  - `view/IShadowObjectEnvProxy.ts`: keine Signatur ändert sich.
- Vorgehen:
  1. **Das Worker-Doppel lernt den Transfer-Parameter.** In `RemoteWorkerEnv.spec.ts`, Klasse
     `FakeWorker` (`:9-59`): neben `posted` ein zweites Feld, gleich lang indiziert.

     ```ts
     posted: any[] = [];
     transferred: (Transferable[] | undefined)[] = [];
     ```

     und

     ```ts
     postMessage(data: any, transfer?: Transferable[]) {
       this.posted.push(data);
       this.transferred.push(transfer);
     }
     ```

     `posted` behält Bedeutung und Reihenfolge, alle 34 bestehenden Fälle bleiben unberührt.
     Der Import-Kopf der Datei wächst auf
     `import {AppliedChangeTrail, ChangeTrail, ComponentChangeType, Destroy, Destroyed, ImportedModule, Loaded, MessageToView, WorkerDestroyTimeout} from '../constants.js';`
     und bekommt `import type {ChangeTrailType} from '../types.js';`.
  2. **Die acht neuen Fälle schreiben — rot zuerst.** Reihenfolge: erst dieser Schritt komplett, dann
     laufen lassen (Verify 1), dann Schritt 3. Kein bestehender Fall dreht sich; alle acht sind neu.

     a) **Neue Gruppe `describe('change trails')`**, hinter `describe('after destroy')` (`:436`).

     1. `keeps the transferables on the change trail it was handed` — `TRAIL-MUT`.
        ```ts
        const {env, worker} = await startEnv();

        const buffer = new ArrayBuffer(8);
        const carrier = {
          type: ComponentChangeType.SendEvents,
          uuid: 'a',
          events: [{type: 'blob', data: 'payload'}],
          transferables: [buffer],
        };
        const plain = {type: ComponentChangeType.UpdateOrder, uuid: 'b', order: 1};
        const trail: ChangeTrailType = [carrier, plain];

        await env.applyChangeTrail(trail, false);

        expect(carrier.transferables, 'the trail the caller keeps still carries them').toEqual([buffer]);
        expect(worker.posted.at(-1).changeTrail[0].transferables, 'the message does not').toBeUndefined();
        expect(worker.transferred.at(-1), 'they travel as the transfer list instead').toEqual([buffer]);
        expect(worker.posted.at(-1).changeTrail[1], 'an entry without them is passed through as it is').toBe(plain);
        ```
        Kommentar über dem Fall: der Trail ist eine Momentaufnahme, die nach diesem Aufruf noch als
        `ShadowEnv.AfterSync` an die Konsumenten geht — `docs/api-reference.md:1000` sagt das zu, und
        die Zusage gilt für beide Umgebungen oder für keine.
        **Heute rot** an der ersten Erwartung: `carrier.transferables` ist `undefined`.

     2. `numbers only the change trails it asks a confirmation for` — `NS-NORM`.
        ```ts
        const {env, worker} = await startEnv();

        await env.applyChangeTrail([], false);
        expect(worker.posted.at(-1).serial, 'a trail nobody waits for travels without a serial').toBeUndefined();

        const first = env.applyChangeTrail([], true);
        expect(worker.posted.at(-1).serial).toBe(1);
        worker.reply({type: AppliedChangeTrail, serial: 1});
        await first;

        await env.applyChangeTrail([], false);

        const second = env.applyChangeTrail([], true);
        expect(worker.posted.at(-1).serial, 'the sequence on the wire has no gaps').toBe(2);
        worker.reply({type: AppliedChangeTrail, serial: 2});
        await second;
        ```
        Kommentar: die Zahl ist die einzige Zuordnung zwischen Anfrage und Bestätigung; eine, die
        springt, ist für jede spätere Diagnose wertlos.
        **Heute rot** an `toBe(1)`: der Zähler steht dort schon auf 2.

     3. `settles only the request the confirmation belongs to` — der Nebenbefund an `:238`.
        ```ts
        const {env, worker} = await startEnv();

        const first = env.applyChangeTrail([], true);
        const second = env.applyChangeTrail([], true);

        let secondSettled = false;
        second.then(
          () => {
            secondSettled = true;
          },
          () => {
            secondSettled = true;
          },
        );

        worker.reply({type: AppliedChangeTrail, serial: 1, error: 'the first trail failed'});

        await expect(first).rejects.toBe('the first trail failed');
        await flushMicrotasks();
        expect(secondSettled, 'a failure of another trail decides nothing here').toBe(false);

        worker.reply({type: AppliedChangeTrail, serial: 2});
        await second;
        ```
        Kommentar: die Seriennummer entscheidet, wen eine Bestätigung angeht — auch dann, wenn sie
        einen Fehler trägt.
        **Heute rot**: der Guard wirft, bevor er die Nummer liest, also lehnt `second` mit derselben
        Zeichenkette ab und `secondSettled` ist `true`.

     b) **Neue Gruppe `describe('module imports')`**, hinter `describe('change trails')`.

     4. `settles only the import the confirmation belongs to` — der Nebenbefund an `:262`.
        ```ts
        const {env, worker} = await startEnv();

        const first = env.importScript('./first.js');
        const second = env.importScript('./second.js');

        // the urls the environment resolved -- `importScript` matches on the absolute form it sent
        const firstUrl = worker.posted.at(-2).importModule;
        const secondUrl = worker.posted.at(-1).importModule;

        let secondSettled = false;
        second.then(
          () => {
            secondSettled = true;
          },
          () => {
            secondSettled = true;
          },
        );

        worker.reply({type: ImportedModule, url: firstUrl, error: 'module has no "shadowObjects" export'});

        await expect(first).rejects.toBe('module has no "shadowObjects" export');
        await flushMicrotasks();
        expect(secondSettled, 'a module that failed to import says nothing about another one').toBe(false);

        worker.reply({type: ImportedModule, url: secondUrl});
        await second;
        ```
        Kommentar: zwei Importe können gleichzeitig unterwegs sein, und der Worker beantwortet jeden
        mit seiner eigenen URL (`worker/MessageRouter.ts:112-123`).
        **Heute rot** aus demselben Grund wie Fall 3.

     c) **Neue Gruppe `describe('the listeners on the worker')`**, hinter `describe('module imports')`.

     5. `takes its listeners off the worker when the environment is torn down` — `CTX-LEAK`.
        ```ts
        const {env, worker} = await startEnv();

        const messages = vi.fn();
        (env as IShadowObjectEnvProxy).onMessageToView = messages;

        env.destroy();
        worker.reply({type: MessageToView, data: {uuid: 'a', type: 'ping'}});
        expect(messages, 'a message after the teardown reaches nobody').not.toHaveBeenCalled();

        worker.reply({type: Destroyed});
        await flushMicrotasks();

        // the environment holds the worker, and through the listeners the worker holds it back --
        // for the whole window between the teardown and the terminate that ends it
        expect(worker.listeners.get('message')?.size ?? 0, 'message').toBe(0);
        expect(worker.listeners.get('error')?.size ?? 0, 'error').toBe(0);
        expect(worker.listeners.get('messageerror')?.size ?? 0, 'messageerror').toBe(0);
        ```
        **Heute rot** an der ersten Erwartung (`messages` wird gerufen) und an allen drei
        Listener-Zählungen (je 1).
     6. `takes its listeners off the worker when it fails` — dieselbe Ursache, der zweite Ausgang.
        ```ts
        const {env, worker} = await startEnv();

        worker.fail();

        expect(env.isDestroyed).toBe(true);
        expect(worker.listeners.get('message')?.size ?? 0, 'message').toBe(0);
        expect(worker.listeners.get('error')?.size ?? 0, 'error').toBe(0);
        expect(worker.listeners.get('messageerror')?.size ?? 0, 'messageerror').toBe(0);
        ```
        Kommentar: der Ausfallpfad terminiert sofort, die Abmeldung kostet ihn nichts und macht die
        Regel zu einer, die keinen zweiten Fall kennt.
        **Heute rot** an allen drei Zählungen.

     d) **In die bestehende Gruppe `describe('worker failure')`**, hinter
        `announces the failure even when the proxy-failed callback throws` (`:207-223`):

     7. `replays workerFailed to a later listener even when the first one throws` — `WORKER-003`.
        ```ts
        const {env, worker} = await startEnv();

        on(env, 'workerFailed', () => {
          throw new Error('a consumer that cannot cope');
        });

        expect(() => worker.fail('kaboom')).not.toThrow();

        const late = vi.fn();
        on(env, 'workerFailed', late);

        expect(late, 'the retained failure is still there for whoever comes after').toHaveBeenCalledTimes(1);
        expect(late.mock.calls[0][0].reason.name).toBe('WorkerFailedError');
        ```
        Kommentar: eventize legt den Wert erst nach dem Durchlauf im Keeper ab — ein Hörer, der wirft,
        nähme die Wiederholung für alle späteren mit, und `WorkerFailed` ist als retained zugesagt
        (`docs/api-reference.md:1322`).
        **Heute rot** an beiden Stellen: `worker.fail()` wirft, und `late` wird nie gerufen.

     e) **In die bestehende Gruppe `describe('after destroy')`**, hinter
        `tears down once, however often destroy() is called` (`:423-435`):

     8. `terminates the worker and reports it when the teardown is never acknowledged` — der
        Nebenbefund an `:287-289`.
        ```ts
        vi.useFakeTimers();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        try {
          const {env, worker} = await startEnv();

          env.destroy();
          expect(worker.terminateCount, 'the worker gets its own teardown window').toBe(0);

          await vi.advanceTimersByTimeAsync(WorkerDestroyTimeout);

          expect(worker.terminateCount, 'and does not outlive it').toBe(1);
          expect(warn, 'the silence is reported instead of ending as an unhandled rejection').toHaveBeenCalledTimes(1);
        } finally {
          warn.mockRestore();
          vi.useRealTimers();
        }
        ```
        Kommentar: `.finally()` reicht die Ablehnung weiter — ohne einen Abschluss der Kette endet ein
        schweigender Worker fünf Sekunden später in einer unbehandelten Rejection, die niemandem
        gehört. Zu den Fake-Timern: `startEnv()` kommt allein über Microtasks durch, der
        Load-Handshake braucht keinen echten Timer.
        **Heute rot** an der `warn`-Erwartung (nichts wird gemeldet); `terminateCount` ist schon grün.
        `ConsoleLogger.#print` (`utils/ConsoleLogger.ts:270-272`) schreibt ungefiltert auf die Konsole
        — die Pegel-Getter sind Sache des Aufrufers —, der Spion sieht den Aufruf also verlässlich.
  3. **`RemoteWorkerEnv.ts` — sechs Eingriffe, sonst nichts.**

     a) **Transferables abtrennen statt herausschneiden.** `removeTransferables` (`:23-40`) wird
        vollständig ersetzt; der Name geht mit, weil die Funktion nichts mehr entfernt.

        ```ts
        /**
         * Splits the transferables out of a change trail without writing to it. The trail handed in
         * is a snapshot that travels on to the `ShadowEnv.AfterSync` consumers after this call, so an
         * entry carrying transferables is replaced by a shallow copy without them and every other
         * entry is passed through as it is. A trail that carries none is handed back object for
         * object.
         */
        const splitTransferables = (
          changeTrail: ChangeTrailType,
        ): {changeTrail: ChangeTrailType; transferables?: TransferablesType} => {
          if (!Array.isArray(changeTrail)) return {changeTrail};

          let outbound: ChangeTrailType | undefined;
          let transferables: TransferablesType | undefined;

          for (let i = 0; i < changeTrail.length; i++) {
            const changeItem = changeTrail[i];
            if (changeItem.transferables) {
              transferables = transferables
                ? [...transferables, ...changeItem.transferables]
                : [...changeItem.transferables];

              outbound ??= [...changeTrail];
              const withoutTransferables = {...changeItem};
              delete withoutTransferables.transferables;
              outbound[i] = withoutTransferables;
            }
          }

          return {changeTrail: outbound ?? changeTrail, transferables};
        };
        ```

        Die `changeTrail != null &&`-Hälfte der alten Bedingung fällt weg: `Array.isArray(null)` ist
        `false`. Die Transfer-Liste wird auch beim ersten Treffer kopiert statt geliehen — der Aufrufer
        behält sein Array jetzt, und zwei Wege auf dasselbe Array wären eine zweite Verbindung zwischen
        der Nachricht und dem Trail, den die Konsumenten sehen. Der Rückgabetyp ist ein Objekt, weil es
        zwei Ergebnisse gibt; ein Tupel liest sich an der Aufrufstelle schlechter.
        Typgeprüft: `{...changeItem}` über der Union `IComponentChangeType` und das `delete` auf dem
        optionalen Feld gehen durch `tsc -p tsconfig.json --noEmit` ohne Cast.

     b) **`applyChangeTrail()` (`:215-246`)** — Seriennummer und Guard in einem Zug:

        ```ts
        applyChangeTrail(changeTrail: ChangeTrailType, waitForConfirmation: boolean): Promise<void> {
          const {signal} = this.#workerFailure;
          if (signal.aborted) return Promise.reject(signal.reason);

          const worker = this.#worker;
          if (worker == null) return Promise.reject(new WorkerDestroyedError());

          const {changeTrail: outbound, transferables} = splitTransferables(changeTrail);
          const message = {type: ChangeTrail, changeTrail: outbound} as any;

          if (!waitForConfirmation) {
            worker.postMessage(message, transferables ?? []);
            return Promise.resolve();
          }

          // the counter moves only where a number actually goes on the wire: it is the sole link
          // between a request and its confirmation, and a sequence with invisible jumps in it tells
          // a later diagnosis nothing
          const serial = ++this.#changeTrailSerial;
          message.serial = serial;

          worker.postMessage(message, transferables ?? []);

          return waitForMessageOfType(
            worker,
            AppliedChangeTrail,
            WorkerChangeTrailTimeout,
            (data: AppliedChangeTrailEvent) => {
              // the serial decides who a confirmation concerns -- an error belonging to another
              // trail would otherwise reject the request that happens to be waiting here
              if (data.serial !== serial) return false;
              if (data.error) throw data.error;
              return true;
            },
            signal,
          );
        }
        ```

     c) **`importScript()` (`:248-267`)** — derselbe Umbau am zweiten Guard, sonst unverändert:

        ```ts
        (data: ImportedModuleEvent) => {
          if (data.url !== url) return false;
          if (data.error) throw data.error;
          return true;
        },
        ```

     d) **Drei Hörer, die abmeldbar sind.** `onWorkerError` (`:292-294`), `onWorkerMessageError`
        (`:296-298`) und `onMessageFromWorker` (`:338-344`) werden von `private`-Methoden zu
        `readonly`-Feldern mit Pfeilfunktion — eine Referenz je Instanz, dieselbe beim Anmelden und
        beim Abmelden. Rümpfe unverändert übernehmen, `handleWorkerFailure` bleibt eine private
        Methode.

        ```ts
        private readonly onWorkerError = (event: ErrorEvent): void => {
          this.handleWorkerFailure('error', event, event.message || 'the worker reported an error');
        };

        private readonly onWorkerMessageError = (event: MessageEvent): void => {
          this.handleWorkerFailure('messageerror', event, 'the worker sent a message that could not be deserialized');
        };

        private readonly onMessageFromWorker = (event: MessageEvent): void => {
          if (event.data?.type === MessageToView) {
            (this as IShadowObjectEnvProxy).onMessageToView?.(event.data.data);
          } else if (this.logger.isDebug) {
            this.logger.debug('message from worker', event);
          }
        };
        ```

        `private readonly` statt `#name`: die emittierte `.d.ts` behält damit ihre drei Zeilen und
        ändert nur deren Form (`private onWorkerError;` → `private readonly onWorkerError;`), was für
        einen Konsumenten weder vorher noch nachher aufrufbar ist. Felder werden in
        Deklarationsreihenfolge initialisiert; benutzt werden sie erst in `start()`, lange nach dem
        Konstruktor. Die drei Deklarationen wandern an die Stelle, an der die Methoden heute stehen.

        Dazu, direkt darunter, das Gegenstück zu den drei `addEventListener`-Aufrufen:

        ```ts
        /**
         * Takes every listener of this environment off a worker. Whoever registered them takes them
         * off again -- between the teardown and the `terminate()` that ends it the worker stays
         * alive, and through its listeners it keeps this environment and everything it references
         * reachable for exactly that long.
         */
        private stopListeningTo(worker: Worker): void {
          worker.removeEventListener('error', this.onWorkerError);
          worker.removeEventListener('messageerror', this.onWorkerMessageError);
          worker.removeEventListener('message', this.onMessageFromWorker);
        }
        ```

        Die drei Anmeldungen verlieren ihr `.bind(this)`: `:174` wird
        `worker.addEventListener('error', this.onWorkerError);`, `:175` entsprechend, `:189`
        `worker.addEventListener('message', this.onMessageFromWorker);`.

        Drei Aufrufstellen für `stopListeningTo`:
        - in `start()`, im `catch`-Zweig (`:194-212`), als erste Zeile vor `this.#worker = undefined;`
          — der Start, der scheitert, nimmt mit, was er angemeldet hat, auch wenn er den Worker einer
          laufenden `destroy()` überlässt;
        - in `destroy()`, direkt hinter `if (worker == null) return;` und vor dem
          `postMessage({type: Destroy})`;
        - in `handleWorkerFailure()`, zwischen `this.#worker = undefined;` (`:313`) und
          `this.#workerFailure.abort(reason)` (`:316`), als `if (worker != null) this.stopListeningTo(worker);`.
        Doppeltes Abmelden ist ein No-op, die Reihenfolge der drei Pfade untereinander also ohne Folge.

     e) **`destroy()` (`:287-289`) schließt seine Kette.**

        ```ts
        waitForMessageOfType(worker, Destroyed, WorkerDestroyTimeout)
          .catch((error) => {
            // `.finally()` passes a rejection on, so without this the silence of a worker ends as an
            // unhandled rejection five seconds after the teardown. It is terminated either way, and
            // by then there is nobody left to hand the error to
            this.logger.warn('the worker did not acknowledge the teardown', error);
          })
          .finally(() => {
            worker.terminate();
          });
        ```

        Ungefiltert gemeldet, wie der Storage-Fehler in `readWorkerConfig` (`:382`): ein Worker, der
        sein Bestätigungsfenster verstreichen lässt, ist eine Zeile wert.

     f) **Der Ausfall bleibt nachreichbar.** Der `emit`-Aufruf am Ende von `handleWorkerFailure`
        (`:329-335`) wandert in eine eigene private Methode; `handleWorkerFailure` endet mit
        `this.announceFailure({env: this, type, message, reason, event});`.

        ```ts
        /**
         * Announces the failure to the consumers -- and makes sure it stays announceable. eventize
         * stores a retained value only after the dispatch has run through, so a listener that throws
         * would take the replay for every later subscriber with it, and `WorkerFailed` is documented
         * as retained. It is emitted exactly once per environment, so dropping the subscriptions of
         * that name on the second pass costs nothing: no further one is ever sent. `off()` drops the
         * retain policy along with the listeners, hence the `retain()` in between.
         */
        private announceFailure(payload: WorkerFailedEvent): void {
          try {
            emit(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerFailed, payload);
            return;
          } catch (error) {
            this.logger.error('a workerFailed listener threw; the ones behind it did not hear about the failure', error);
          }

          try {
            off(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerFailed);
            retain(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerFailed);
            emit(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerFailed, payload);
          } catch (error) {
            // a wildcard listener survives the `off()` above and can throw a second time
            this.logger.error('the failure could not be retained for later listeners', error);
          }
        }
        ```

        Der Import-Kopf (`:1`) wächst auf `import {emit, off, once, retain} from '@spearwolf/eventize';`.

        Nachgemessen gegen `@spearwolf/eventize@6.0.0`: ein werfender Hörer lässt
        `getRetainedCount()` auf `0` stehen und die Hörer hinter ihm ungerufen (`lib/index.js:1449-1462`,
        `store.forEach(...)` vor `keeper.retain(...)`, ohne `catch` dazwischen); die Folge
        `off` → `retain` → `emit` stellt den Wert wieder her, ein danach angemeldeter Hörer bekommt ihn.
        Was verloren bleibt, sind die Hörer, die beim ersten Durchlauf hinter dem werfenden standen —
        dafür gibt es ohne Eingriff in eventize kein Mittel, und die Fehlermeldung sagt es.
        Entscheidung dieses Laufs, nicht des Nutzers: die Empfehlung des Audits endet beim Abfangen,
        was den Wurf einfängt, die zugesagte Wiederholung aber nicht rettet. Widersprechbar.
  4. **Changelog.** `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]`, im Stil der
     dortigen Aufzählung (`- **Bugfix (…):** …`), fünf Einträge:
     - **Bugfix (worker environments):** Ein Change Trail, den `RemoteWorkerEnv.applyChangeTrail()`
       bekommt, bleibt vollständig. Die Transferables werden für die Nachricht abgetrennt, indem die
       betroffenen Einträge flach kopiert werden; der Trail, den der Aufrufer weiterreicht — und den
       `ShadowEnv.AfterSync` und `syncWait()` an die Konsumenten geben — trägt sie unverändert.
       Beide Umgebungen geben damit dieselbe Momentaufnahme heraus.
     - **Bugfix (worker environments):** Eine Bestätigung wird der Anfrage zugeordnet, bevor ihr Fehler
       gilt. Ein fehlgeschlagener Change Trail lehnt nur noch die Anfrage mit seiner eigenen
       Seriennummer ab, ein fehlgeschlagener `importScript()` nur den Import seiner eigenen URL.
       Gleichzeitig laufende Anfragen stören sich nicht mehr gegenseitig.
     - **Bugfix (worker environments):** `RemoteWorkerEnv` meldet seine `message`-, `error`- und
       `messageerror`-Hörer wieder vom Worker ab — beim Abbau, beim Ausfall und bei einem `start()`,
       der scheitert. Zwischen `destroy()` und dem `terminate()`, das ihm folgt, hält der Worker die
       Umgebung damit nicht mehr fest. Eine Nachricht, die den Worker nach dem `destroy()` noch
       verlässt, erreicht `onMessageToView` nicht mehr.
     - **Bugfix (worker environments):** Bleibt die `Destroyed`-Bestätigung aus, meldet `destroy()`
       das über den Logger, statt fünf Sekunden nach dem Abbau in einer unbehandelten Rejection zu
       enden. Der Worker wird unverändert nach `WorkerDestroyTimeout` terminiert.
     - **Bugfix (worker environments):** `RemoteWorkerEnv.WorkerFailed` bleibt nachreichbar, auch wenn
       ein Hörer wirft. Der Wurf verlässt den Ausfallpfad nicht mehr, und ein Consumer, der sich später
       anmeldet, bekommt den Ausfall weiterhin — wie für ein retained Ereignis zugesagt. Die Hörer, die
       beim ersten Durchlauf hinter dem werfenden standen, sehen ihn nicht; das wird gemeldet.

     Die Seriennummern-Lücke braucht keinen eigenen Eintrag: `#changeTrailSerial` ist privat, und was
     auf der Leitung ankommt, deckt der zweite Eintrag ab. Der Kopf des Abschnitts (»Twenty-three of
     them reach existing consumers«) wächst um die vier Einträge, die einen Konsumenten erreichen
     können — die Zahl auf **Twenty-seven** setzen —, und in die Aufzählung dahinter kommt eine
     Klausel: dass eine `MessageToView`-Nachricht, die den Worker nach dem `destroy()` noch verlässt,
     nicht mehr an `onMessageToView` geht. Der Retain-Eintrag bekommt keine Klausel: wer heute
     funktioniert, wirft in seinem Hörer nicht.
  5. **Doku.** `packages/shadow-objects/docs/api-reference.md`, drei Stellen, alle in der
     `RemoteWorkerEnv`-Sektion:
     - Die `destroy()`-Zeile der Methodentabelle (`:1315`) bekommt einen Halbsatz: dass die Umgebung
       mit dem Abbau aufhört, dem Worker zuzuhören — was er danach noch sendet, erreicht sie nicht
       mehr.
     - Die `RemoteWorkerEnv.WorkerFailed`-Zeile der Ereignistabelle (`:1322`) wird um einen Satz
       ergänzt: ein Hörer, der wirft, beendet den Durchlauf an seiner Stelle — die Hörer hinter ihm
       erfahren nichts —, der zurückgehaltene Wert überlebt das aber, wer sich später anmeldet,
       bekommt ihn.
     - Der Absatz »A teardown settles what is still waiting.« (`:1345`) bekommt einen Satz über die
       Zuordnung: eine Bestätigung gehört zu genau einer Anfrage, also lehnt ein fehlgeschlagener
       Change Trail nur seinen eigenen Aufrufer ab und ein fehlgeschlagener Import nur seinen eigenen.

     Die Zusage in `:1000` — der Change Trail ist eine Momentaufnahme, und das gilt auch für die
     Nutzlast von `ShadowEnv.AfterSync` — bleibt Wort für Wort stehen; dieses Paket macht sie wahr.
     Kein Rückblick auf den Vorzustand: der steht im Changelog.
  6. **Backlog.** `Backlog.md`, drei Stellen im Stil der Datei (`~~…~~` **✅ Behoben** plus ein bis
     zwei Sätze, was jetzt gilt):
     - Der Absatz »Ein Worker, der beim Abbau schweigt, hinterlässt eine unbehandelte Rejection«
       (`:193-196`) wird durchgestrichen und aufgelöst.
     - **VIEW-9** in der Tabelle von §3.3 (`:208`) wird durchgestrichen und aufgelöst.
     - Die Abdeckungstabelle (`:297`) nennt »34 Fälle« — die Zahl auf 42 ziehen und die vier neuen
       Bereiche in die Aufzählung aufnehmen (Transferables, Zuordnung über Seriennummer und URL,
       Abmelden der Hörer, das ausbleibende Bestätigungsfenster).
  7. **Formatieren.** `pnpm lint:fix` und `pnpm format` von der Wurzel — Zeilenbreite 130, einfache
     Anführungszeichen, `bracketSpacing: false`, durchgehende Trailing Commas. `CHANGELOG.md` und
     `Backlog.md` sind in `biome.json` von `files.includes` ausgenommen und müssen von Hand sauber sein.
- Verify:
  1. **Rot zuerst.** Nach Schritt 2, vor Schritt 3:
     `cd packages/shadow-objects && pnpm exec vitest src/view/RemoteWorkerEnv.spec.ts --run`.
     Erwartet fallen genau die acht neuen Fälle, und kein bestehender. Die Ausgabe gehört in den
     Bericht; `keeps the transferables on the change trail it was handed` und
     `takes its listeners off the worker when the environment is torn down` sind die beiden, auf die
     es ankommt.
  2. **Grün.** Dasselbe Kommando nach Schritt 3: 42 Fälle.
  3. **Zweimal hintereinander**: `pnpm -F @spearwolf/shadow-objects test` doppelt laufen lassen. Der
     Fall mit den Fake-Timern gibt sie im `finally` zurück; bleibt ein Timer liegen, zeigt sich das in
     einem fremden Fall.
  4. **Von der Wurzel**: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`. Die
     Gesamtzahl geht von 765 auf **773** — acht neue Fälle, kein gelöschter.
  5. **Auslieferung**: `find packages/shadow-objects/dist -type f | sort` vor und nach dem Build ergibt
     dieselbe Liste, `packages/shadow-objects/dist/package.json` bleibt unverändert. In der emittierten
     `dist/src/view/RemoteWorkerEnv.d.ts` ändern sich die drei `private`-Zeilen zu
     `private readonly`, und `stopListeningTo` sowie `announceFailure` kommen als `private` dazu —
     nichts davon ist für einen Konsumenten aufrufbar. Der Diff gehört in den Bericht.
  6. **E2E**: `pnpm -F shadow-objects-e2e test`. `worker-failure` und `remote-worker-env` fahren echte
     Worker über `postMessage` hoch und wieder herunter und sind der einzige Nachweis, dass Abmeldung
     und Transfer-Liste an einem echten `Worker` durchlaufen statt an einem Doppel.
- Commit: `fix(view): a change trail that survives the send, and listeners that come off again`

  Body (vier Zeilen, ohne Kürzel):
  `applyChangeTrail() splits the transferables off into a copy instead of deleting them from the caller's change trail, so the snapshot AfterSync hands out stays complete.`
  `A confirmation is matched to its request before its error counts: a failed change trail rejects only its own serial, a failed import only its own url, and the serial counter moves only where a number goes on the wire.`
  `The message, error and messageerror listeners are fields now and are taken back off the worker on teardown, on failure and on a start that fails -- the worker no longer keeps the environment reachable through the window before terminate().`
  `A missing Destroyed acknowledgement is reported instead of ending as an unhandled rejection, and a throwing workerFailed listener no longer costs the retained failure everyone subscribing later relies on.`
- Ergebnis: 1 Nachbesserungsrunde plus ein Nachtrag · alle vier Findings behoben · dazu der wichtigste
  Reviewer-Fund des Pakets: `WorkerLoaded` ging über denselben ungeschützten `emit` wie das
  Ausfall-Ereignis und ist mitrepariert · 11 neue Fälle, Gesamtzahl 765 → 776 · Auslieferung unverändert
  (198 Dateien in `dist`, `dist/package.json` gleich; die `.d.ts` bekommt nur `private`-Zeilen dazu) ·
  E2E 402 in beiden Browsern
- Abweichung von der Audit-Empfehlung, im Detailplan begründet und vom Reviewer an
  `@spearwolf/eventize@6.0.0` nachgemessen: bei einem werfenden Hörer genügt kein `try/catch`, weil der
  Keeper den Wert erst nach dem Durchlauf ablegt. Der Weg ist `off` → `retain` → `emit` im `catch`.
  Preis, an beiden Stellen dokumentiert: die Hörer hinter dem werfenden bleiben im ersten Durchlauf
  ungerufen, ein Wildcard-Hörer mit höherer Priorität als der werfende bekommt das Ereignis zweimal,
  und ein `workerLoaded`-Promise, das hinter dem werfenden wartete, verliert seine `once`-Anmeldung an
  das `off()` — es löste allerdings auch vorher nie auf.
- Nebenbefunde: `packages/shadow-objects/src/view/RemoteWorkerEnv.ts:232` — `applyChangeTrail()` benutzt
  `as any` für das Nachrichtenobjekt, obwohl `SyncEvent` in `types.ts:76-79` es bereits beschreibt; es
  fehlt nur das `type`-Feld (vorbestehend) → Paket 12 · `packages/shadow-objects/src/utils/`
  `waitForMessageOfType.ts:46` liest `event.data.type` ungeprüft, die View-Seite desselben Defekts, den
  Paket 4 auf der Worker-Seite geschlossen hat; nur handgeschriebener Worker-Code löst ihn aus
  (vorbestehend) → nächstes Audit · derselbe Helfer hängt je Anfrage einen eigenen `message`-Hörer an
  den Worker (`:60`), der über das Abort-Signal wieder abgeht — kein Defekt, aber eine zweite,
  unabhängige Anmeldequelle neben den drei, die `stopListeningTo()` kennt
- Korrektur am Plan: der Detailplan behauptete, `Backlog.md` stehe in `biome.json` unter `files.includes`
  auf der Ausschlussliste. Dort steht nur `!**/CHANGELOG.md` (`biome.json:26`). Folgenlos, weil Biome 2.5
  Markdown ohnehin nicht formatiert.
- Folgen: keine
- Schnittstellen: `RemoteWorkerEnv` meldet seine drei Worker-Hörer auf jedem Weg wieder ab, der die
  Umgebung beendet. Der übergebene Change Trail wird nicht mehr verändert — ein `AfterSync`-Konsument
  findet die `transferables` wieder vor, die Buffer dahinter sind nach dem `postMessage` detacht. Die
  Seriennummer wächst nur, wenn eine Bestätigung verlangt wird, und eine Bestätigung entscheidet nur
  über die Anfrage mit ihrer Seriennummer. `WorkerLoaded` und `WorkerFailed` bleiben für spätere
  Abonnenten abrufbar, auch wenn ein Hörer wirft.
- Triage in Zug 0 (2026-08-19), die zum Abschluss von Paket 4 offenen Nebenbefunde:
  - `packages/shadow-objects/src/worker/*.ts` enden ohne abschließenden Zeilenumbruch — **gegenstandslos**,
    kein Befund. `biome.json:40` führt `"trailingNewline": false`, und alle 65 `.ts`-Dateien unter
    `packages/shadow-objects/src` enden so. Das ist die Hausform, nicht ihre Verletzung. Kein Zielpaket.
  - `packages/shadow-objects/CHANGELOG.md:131-156` trägt »rund fünfzehn Audit-Kürzel im Fließtext« —
    **gegenstandslos**, kein Befund und nichts fürs nächste Audit. Die Kürzel dort sind `VIEW-20` bis
    `VIEW-26`, `KERN-8` und `LOW-4`: die dauerhafte Zählung von `Backlog.md`, deren Auflösung dort
    steht (`:123`, `:164-188`, `:226`) und die die Entscheidung vom 2026-08-19 ausdrücklich unangetastet
    lässt. Ein Kürzel in der Form dieses Audits kommt in der Datei nicht vor
    (`grep -cE '\b[A-Z][A-Z0-9]+-[0-9]{3}\b' packages/shadow-objects/CHANGELOG.md` → 0). Kein Zielpaket.

**CTX-LEAK · Worker-Message-Listener wird mit nicht wieder abmeldbarem bind() registriert · medium · packages/shadow-objects/src/view/RemoteWorkerEnv.ts:87**
addEventListener('message', this.onMessageFromWorker.bind(this)) erzeugt bei jedem Aufruf eine neue Funktionsreferenz. Es gibt keinen Weg, diesen Listener je wieder zu entfernen; destroy() versucht es auch nicht und verlässt sich darauf, dass terminate() alles mitnimmt. Solange der Worker zwischen Destroy-Nachricht und Terminierung noch sendet, hält der Listener die RemoteWorkerEnv-Instanz samt ihrer Referenzkette am Leben.
Empfehlung: Die gebundene Funktion einmal als Feld anlegen (#onMessage = (event) => …) und in destroy() per removeEventListener wieder abmelden, bevor terminate() gerufen wird.

**TRAIL-MUT · removeTransferables() mutiert den Change Trail des Aufrufers · low · packages/shadow-objects/src/view/RemoteWorkerEnv.ts:23-40**
Die Funktion löscht mit 'delete changeItem.transferables' direkt auf den übergebenen Objekten. Der Trail stammt aus ComponentContext.buildChangeTrails() und wird nach applyChangeTrail() noch als AfterSync-Ereignis an die Consumer weitergereicht — die sehen dann einen Trail ohne die Transferables, die tatsächlich Teil der Nachricht waren. Für den lokalen Pfad gilt das nicht, dort bleibt der Trail unangetastet: schon wieder eine Asymmetrie zwischen den beiden Umgebungen.
Empfehlung: Die Transferables einsammeln, ohne die Einträge zu verändern — flache Kopien der betroffenen Change-Items erzeugen und diese versenden. Der Trail, den der Aufrufer weiterreicht, bleibt damit vollständig.

**NS-NORM · changeTrailSerial wird auch ohne Bestätigungswunsch hochgezählt · low · packages/shadow-objects/src/view/RemoteWorkerEnv.ts:103**
Der Zähler wird bei jedem applyChangeTrail() inkrementiert, die serial aber nur bei waitForConfirmation in die Nachricht geschrieben. Die Seriennummern, die tatsächlich über die Leitung gehen, haben dadurch Lücken. Da der Worker nur auf Gleichheit prüft, ist das heute folgenlos — für jede spätere Diagnose (Lücken erkennen, Nachrichten zuordnen) ist eine Sequenz mit unsichtbaren Sprüngen aber wertlos.
Empfehlung: Nur inkrementieren, wenn die serial auch gesendet wird — oder den Zähler bewusst als reinen Instanz-Zähler dokumentieren und die gesendete serial davon trennen.

**WORKER-003 · Ein werfender WorkerFailed-Hörer verhindert das Retain des Ereignisses · low · packages/shadow-objects/src/view/RemoteWorkerEnv.ts:318-324**
handleWorkerFailure emittiert WorkerFailed als letzten Schritt. eventize dispatcht erst und legt den Wert danach im Keeper ab — wirft ein Hörer, bricht der Dispatch ab und das Retain unterbleibt. Die Zustandsübergänge sind zu diesem Zeitpunkt alle abgeschlossen, aber ein Consumer, der sich später anmeldet, bekommt den Ausfall nicht mehr nachgereicht, obwohl das Ereignis als retained dokumentiert ist.
Empfehlung: Den Dispatch gegen werfende Hörer absichern, wie es der onProxyFailed-Aufruf eine Zeile darüber bereits tut, oder das Retain unabhängig vom Dispatch setzen. Ohne Eingriff in eventize ist nur der erste Weg gangbar.

### [x] 6. ShadowEnv: Reassign-Race und Namespace-Eigentum
- Findings: ENV-RACE (medium), ENV-NS-001 (low)
- Ziel: Ein veralteter Proxy-Start meldet nichts mehr über die aktuelle Umgebung, und ein Namespace-Eintrag wird nur von seinem Eigentümer gelöscht.
- Bereich: `packages/shadow-objects/src/view/ShadowEnv.ts`
- Hängt ab von: —
- Modell: stärkste Stufe (Race Condition)
- Hash: ff55553
- Modell-Begründung (Zug 0): Die stärkste Stufe bleibt. Der Fix selbst ist klein, aber drei Dinge daran
  entscheiden über richtig oder falsch: die Reihenfolge im `envProxy`-Setter (das Abhängen der Callbacks
  muss *nach* `prevProxy.destroy()` stehen, sonst fällt eine in `docs/api-reference.md` zugesicherte
  Eigenschaft der lokalen Umgebung weg), die Form der Promise-Kette (`.then().catch()` bleibt, siehe
  Schritt 2c), und ein Test, der die Verschränkung erzwingt statt sie zu treffen.
- Dateien:
  - `packages/shadow-objects/src/view/ShadowEnv.ts`
  - `packages/shadow-objects/src/view/ShadowEnv.spec.ts`
  - `packages/shadow-objects/CHANGELOG.md`
  - `packages/shadow-objects/docs/api-reference.md`
  - `Backlog.md`

  Nicht berührt und nachgesehen: `packages/shadow-objects/README.md` nennt `ShadowEnv` an keiner Stelle
  (`grep -n "ShadowEnv" packages/shadow-objects/README.md` ohne Treffer), `AGENTS.md` weder `envProxy`
  noch `proxyReady` noch `ShadowEnv.get` (ebenfalls ohne Treffer) — beide bleiben, wie sie sind. Die
  Wurzel-`CHANGELOG.md` ebenfalls nicht: das hier ist Laufzeitverhalten eines Pakets, kein Monorepo-Vorgang.
  Kein neuer Export, keine neue Signatur, also auch keine Änderung an `dist/` — die Dateiliste bleibt bei
  198 Einträgen, die `.d.ts` bekommt höchstens eine `private`-Zeile für das neue Feld dazu.
- Abgleich in Zug 0 (2026-08-19): `ShadowEnv.ts` und `ShadowEnv.spec.ts` sind zeichengleich mit dem Stand
  vor dem ersten Paket-Commit (`git diff d6e91f5..HEAD -- packages/shadow-objects/src/view/ShadowEnv.ts
  packages/shadow-objects/src/view/ShadowEnv.spec.ts` ist leer). Beide Befunde stehen unverändert, nur
  verschoben: der `envProxy`-Setter liegt heute auf `:116-142` (Audit: `:113-138`), der `view`-Setter auf
  `:82-110` (Audit: `:83-107`). Keiner der 28 bestehenden Fälle dreht sich; alle zehn neuen Fälle unten
  sind neu. Was die Pakete 4 und 5 an der Race verändert haben, steht in Schritt 1.
- Vorgehen:
  1. **Was die Race heute wirklich anrichtet — und was `1390e26` daran geändert hat.** Der Setter
     (`ShadowEnv.ts:132-140`) startet den Proxy und schreibt das Ergebnis in `proxyReady`, wann immer es
     eintrifft. Zwei Richtungen, beide real:

     - *Der veraltete Erfolg.* Ein ersetzter Proxy löst nach dem Wechsel auf, `proxyReady` wird `true`,
       der Effekt in `:65-79` feuert `ContextCreated`, `ready()` löst auf und `isReady` meldet eine
       Umgebung als bereit, deren aktueller Proxy nie gestartet wurde. Der erste Change Trail geht an
       einen Proxy, der noch in seinem Handshake steckt.
     - *Der veraltete Fehlschlag.* Der teurere Fall, und der, den Paket 5 wahrscheinlicher gemacht hat:
       Vor `1390e26` saß ein ersetzter `RemoteWorkerEnv` sein `WorkerLoadTimeout` ab, bevor sein `start()`
       ablehnte — Sekunden nach dem Wechsel. Seit `1390e26` bricht `destroy()` den `#workerFailure`-
       Controller ab (`RemoteWorkerEnv.ts:297`), und `prevProxy.destroy()` steht im Setter *vor* dem
       `start()` des neuen Proxys (`:126-133`). Die Ablehnung des alten Starts läuft damit über wenige
       Microtasks — `waitForMessageOfType` lehnt ab, der `catch`-Zweig in `RemoteWorkerEnv.start()`
       räumt auf und wirft weiter —, während `LocalShadowObjectEnv.start()` (`async start() {}`) in
       einem einzigen Microtask auflöst. Der veraltete `catch` landet also **hinter** dem Erfolg des
       neuen Proxys und setzt `proxyReady` zurück auf `false`. Ergebnis: eine Umgebung, die nie wieder
       bereit wird, ein `ready()`, das nie auflöst, ein `sync()`, das sich für immer neu scharfstellt —
       und im Log ein `failed to start envProxy` über einen Proxy, den niemand mehr hält. Genau der
       Wechsel Remote → Local ist der Fall, den `Backlog.md:322` als ungetestet führt.

     Was `1390e26` **nicht** verändert hat: die Ursache. Der Setter prüft nicht, wem das Ergebnis gehört.
     Das Fenster ist kürzer geworden und die Verschränkung dadurch wahrscheinlicher, nicht seltener.
  2. **Der Fix in `ShadowEnv.ts`, drei Eingriffe im `envProxy`-Setter.**

     a) Ein privates Feld direkt über dem Setter, mit dem Kommentar, der die Regel als Satz festhält:

     ```ts
     // Each assignment to `envProxy` opens a generation. A start that finishes outside the generation
     // it belongs to speaks for a proxy this environment has already let go, and is discarded.
     #proxyGeneration = 0;
     ```

     b) Der Rumpf des Setters, vollständig, in genau dieser Reihenfolge:

     ```ts
     set envProxy(proxy: IShadowObjectEnvProxy | null | undefined) {
       if (proxy !== this.#shaObjEnvProxy) {
         const prevProxy = this.#shaObjEnvProxy;
         this.#shaObjEnvProxy = proxy ?? undefined;

         const generation = ++this.#proxyGeneration;

         if (this.#shaObjEnvProxy) {
           this.#shaObjEnvProxy.onMessageToView = this.#onMessageToView.bind(this);
           this.#shaObjEnvProxy.onProxyFailed = this.#onProxyFailed.bind(this);
         }

         if (prevProxy) {
           prevProxy.destroy();

           // after the teardown, not before it: a local environment delivers what an `onDestroy`
           // sends towards the view while `destroy()` runs, and that message is still addressed
           // to this environment. Everything the released proxy says afterwards is not
           prevProxy.onMessageToView = undefined;
           prevProxy.onProxyFailed = undefined;
         }

         this.proxyReady = false;

         proxy
           ?.start()
           .then(() => {
             if (generation !== this.#proxyGeneration) return;
             this.proxyReady = true;
           })
           .catch((error) => {
             if (generation !== this.#proxyGeneration) return;
             this.logger.error('failed to start envProxy', error);
             this.proxyReady = false;
           });
       }
     }
     ```

     c) **Die Kette bleibt `.then().catch()`, sie wird nicht zu `.then(onOk, onErr)`.** Das sieht nach
     einer Vereinfachung aus und ist eine Verhaltensänderung: `this.proxyReady = true` treibt den Effekt
     und damit `emit(ContextCreated)`. Wirft dort ein Hörer, fängt das heutige `.catch()` den Wurf; mit
     zwei Argumenten würde er als unbehandelte Rejection aus dem Microtask fallen. Diese Frage gehört
     nicht in dieses Paket. Ein Kommentar über der Kette hält es fest, damit es beim nächsten Aufräumen
     nicht doch passiert:

     ```ts
     // the catch stays behind the then: a listener of ContextCreated that throws is reported here,
     // and turning this into `then(onFulfilled, onRejected)` would let it escape as an unhandled rejection
     ```

     `exactOptionalPropertyTypes` steht in keiner tsconfig des Repos (`tsconfig.json` an der Wurzel),
     `prevProxy.onMessageToView = undefined` ist also zuweisbar; beide Felder sind in
     `IShadowObjectEnvProxy.ts:13,20` optional deklariert.
  3. **Der Fix für das Namespace-Eigentum, zwei Eingriffe.**

     a) Im `view`-Setter (`:86-110`) tritt an die Stelle des unbedingten Löschens (`:88-90`) der Aufruf
     eines neuen privaten Helfers, sonst bleibt der Setter, wie er ist:

     ```ts
     set view(ctx: ComponentContext | null | undefined) {
       if (ctx !== this.#comCtx) {
         this.#releaseNamespace(this.#comCtx?.ns);
         // … unverändert weiter ab `this.#comCtx = ctx ?? undefined;`
     ```

     Der Helfer steht unter dem Setter:

     ```ts
     /**
      * Releases the namespace registration, but only while this environment holds it. A namespace
      * carries one environment at a time, and an assignment that displaces another one leaves that
      * other environment registered under nothing -- taking its entry along on the way out would
      * make `ShadowEnv.get()` answer `undefined` for an environment that is very much alive.
      */
     #releaseNamespace(ns: NamespaceType | undefined): void {
       if (ns == null) return;
       const shadowEnvs = globalThis.__shadowEnvs;
       if (shadowEnvs?.get(ns) === this) {
         shadowEnvs.delete(ns);
       }
     }
     ```

     `NamespaceType` ist in `:5` bereits als Typ importiert.

     b) In `destroy()` fallen die Zeilen `:237` (`const ns = this.#comCtx?.ns;`) und `:243-246` (der
     Block mit `shadowEnvs.delete(ns)`) ersatzlos weg. `this.view = undefined` (`:241`) läuft durch den
     Setter und gibt den Namespace über denselben Helfer frei, mit derselben Eigentumsprüfung; die
     lokale Variable `ns` hätte danach keinen Leser mehr und `noUnusedLocals` würde sie melden. An die
     Stelle des Blocks tritt eine Kommentarzeile über `this.view = undefined;`:

     ```ts
     // the `view` setter releases the namespace registration on the way out, ownership-checked
     ```
  4. **Die Spec — wie die Verschränkung erzwungen wird.** Keine Fake-Timer, kein `vi.useFakeTimers()`:
     die Reihenfolge, um die es geht, ist eine Microtask-Reihenfolge, und die schiebt kein Timer-Mock
     zurecht. Das Mittel ist ein Proxy-Doppel, das seinen `start()` aufhält, bis der Fall ihn von Hand
     auflöst oder ablehnt. Damit ist jede Verschränkung ein Aufruf, kein Zufall. Neue Gruppe
     `describe('a proxy that is replaced while it is starting', …)` hinter der bestehenden Gruppe
     `'a proxy that fails'` (`ShadowEnv.spec.ts:415-574`), deren `FailingProxy` als Vorlage dient:

     ```ts
     /**
      * A proxy whose `start()` is held open until the case settles it. The race this pins is a race
      * of microtasks -- which of two starts writes `proxyReady` last -- so the order is made by the
      * case, not waited for.
      */
     class DeferredProxy implements IShadowObjectEnvProxy {
       onMessageToView?: (event: any) => any;
       onProxyFailed?: (reason: unknown) => any;

       startCount = 0;
       destroyCount = 0;

       readonly #started: Promise<void>;
       #resolve!: () => void;
       #reject!: (reason: unknown) => void;

       constructor() {
         this.#started = new Promise<void>((resolve, reject) => {
           this.#resolve = resolve;
           this.#reject = reject;
         });
         // a case may reject a start the environment has already let go of, and by then nobody is listening
         this.#started.catch(() => {});
       }

       start(): Promise<void> {
         this.startCount++;
         return this.#started;
       }

       async importScript(): Promise<void> {}

       async applyChangeTrail(): Promise<void> {}

       destroy(): void {
         this.destroyCount++;
       }

       resolveStart(): void {
         this.#resolve();
       }

       failStart(reason: unknown): void {
         this.#reject(reason);
       }

       fail(reason: unknown): void {
         this.onProxyFailed?.(reason);
       }
     }

     /** Lets every microtask behind a settled start run before the case looks at the environment. */
     const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

     const makeEnv = () => {
       const env = new ShadowEnv();
       env.view = ComponentContext.get();
       return env;
     };
     ```

     Der Name `flush` ist frei — `flushMicrotasks` heißt derselbe Helfer in
     `src/worker/MessageRouter.spec.ts:288`; wer dort abschreibt, nimmt den Namen mit. `startCount`
     und `destroyCount` sind keine Zierde: sie trennen »der Fix verwirft das Ergebnis« von »der Fix
     startet gar nicht mehr«.

     Sechs Fälle. Fünf fallen ohne den Fix, der sechste ist die Gegenprobe:

     1. `ignores the resolved start of a proxy that has been replaced`

        ```ts
        const env = makeEnv();
        const first = new DeferredProxy();
        const second = new DeferredProxy();
        const contextCreated = vi.fn();
        on(env, ShadowEnv.ContextCreated, contextCreated);

        env.envProxy = first;
        env.envProxy = second;

        first.resolveStart();
        await flush();

        expect(env.proxyReady, 'the start of the replaced proxy must not report the current one ready').toBe(false);
        expect(env.isReady).toBe(false);
        expect(contextCreated).not.toHaveBeenCalled();
        expect(second.startCount).toBe(1);

        env.destroy();
        ```

        Ohne den Fix ist `proxyReady` `true`, `isReady` `true` und `contextCreated` einmal gerufen —
        für eine Umgebung, deren Proxy noch in seinem Start steht.
     2. `ignores the rejected start of a proxy that has been replaced` — der Fall aus Schritt 1, zweite
        Richtung: `env.envProxy = first; env.envProxy = second;`, dann `second.resolveStart(); await flush();`
        (Zwischenbehauptung `expect(env.isReady).toBe(true)`), danach
        `first.failStart(new Error('the worker never came up')); await flush();`. Erwartet: `env.proxyReady`
        ist weiterhin `true`, `env.isReady` ist `true`, ein `on(env, ShadowEnv.ContextLost, …)`-Spion wurde
        nicht gerufen, und ein `vi.spyOn(console, 'error').mockImplementation(() => undefined)` wurde nicht
        gerufen. Ohne den Fix fallen alle vier: `ConsoleLogger.error()` ist ungated (`ConsoleLogger.ts:266`,
        `#print` schreibt ohne `isEnabled`-Prüfung), die Meldung `failed to start envProxy` erscheint also
        verlässlich.
     3. `ignores a failure a replaced proxy reports after the swap` — `env.envProxy = first;
        env.envProxy = second; second.resolveStart(); await flush();`, dann `first.fail(new Error('too late'))`.
        Erwartet: `env.proxyReady` bleibt `true`, kein `ContextLost`, `console.error` nicht gerufen.
        Ohne das Abhängen der Callbacks aus Schritt 2b reißt der freigelassene Proxy die laufende
        Umgebung herunter. Kommentar über dem Fall: von den beiden ausgelieferten Proxys kann das heute
        keiner mehr — `RemoteWorkerEnv` nimmt seine Worker-Hörer seit `1390e26` auf jedem Weg wieder ab,
        `LocalShadowObjectEnv` fällt nicht aus —, ein von Hand geschriebener `IShadowObjectEnvProxy` sehr wohl.
     4. `ignores the resolved start of a proxy that has been cleared` — `env.envProxy = first;
        env.envProxy = undefined; first.resolveStart(); await flush();`. Erwartet: `contextCreated`-Spion
        nicht gerufen, `env.proxyReady` ist `false`, `first.destroyCount` ist `1`. Ohne den Fix meldet eine
        Umgebung ohne jeden Proxy `ContextCreated`, und `view.reCreateChanges()` (`:67`) läuft dazu.
     5. `ignores the rejected start of a proxy the destroy has released` — `env.envProxy = first;`, dann
        `env.destroy();`, dann `first.failStart(new Error('never mind')); await flush();`. Erwartet:
        `console.error` nicht gerufen. Ohne den Fix schreibt die zerstörte Umgebung ihr
        `failed to start envProxy` und greift danach mit `this.proxyReady = false` auf eine Instanz zu,
        deren Signale `destroy()` bereits entsorgt und die es eingefroren hat (`:252-255`). Nach dem Fix
        kommt der Zweig gar nicht mehr zum Zug: `destroy()` weist `envProxy = undefined` zu (`:240`) und
        zählt die Generation damit hoch. Kein `env.proxyReady` in der Erwartung — nach `destroy()` ist
        das ein Lesen auf zerstörten Signalen, und darüber sagt dieser Fall nichts aus.
     6. `reports the current proxy ready when its start resolves` — die Gegenprobe: ein einziger Proxy,
        `env.envProxy = proxy; proxy.resolveStart(); await flush();`. Erwartet: `env.proxyReady` ist `true`,
        `env.isReady` ist `true`, `contextCreated` einmal gerufen, `proxy.startCount` ist `1`. Ohne diesen
        Fall geht eine Generationsprüfung durch, die immer verwirft.
  5. **Die Spec — Namespace-Eigentum.** Neue Gruppe `describe('the namespace registration', …)` hinter der
     Gruppe aus Schritt 4. Zwei benannte Namespaces, weil der äußere `afterEach` (`:14-17`) nur den
     globalen Kontext abräumt:

     ```ts
     const NS_A = 'shadow-env-ns-a';
     const NS_B = 'shadow-env-ns-b';

     afterEach(() => {
       // a named context outlives the outer afterEach, which only reaches the global namespace
       ComponentContext.get(NS_A).dispose();
       ComponentContext.get(NS_B).dispose();
       globalThis.__shadowEnvs?.delete(NS_A);
       globalThis.__shadowEnvs?.delete(NS_B);
     });
     ```

     Vier Fälle, der erste fällt ohne den Fix, die drei anderen sind heute grün und bleiben es — sie
     halten fest, dass die Eigentumsprüfung nicht zur Blockade wird:

     1. `leaves a namespace registration alone that another environment has taken over` — ein
        `ComponentContext.get(NS_A)`, zwei `ShadowEnv`. `first.view = ctx; second.view = ctx;` (das ist
        genau die Überschreibung, vor der `:96-104` warnt), Zwischenbehauptung
        `expect(ShadowEnv.get(NS_A)).toBe(second)`. Dann `first.view = undefined;` und die Behauptung, um
        die es geht: `expect(ShadowEnv.get(NS_A), 'the environment that let go was not the registered one').toBe(second)`.
        Ohne den Fix ist die Antwort `undefined`, und `ShaeElement.ts:23` (`ShadowEnv.get(ns)?.sync()`)
        findet für diesen Namespace nichts mehr — jedes `<shae-ent>` darunter hört still auf zu
        synchronisieren. Am Ende `first.destroy(); second.destroy();`. Ein
        `vi.spyOn(console, 'warn').mockImplementation(() => undefined)` hält die Ausgabe der erwarteten
        Warnung ruhig; **keine Behauptung darauf** — `logger.warn` hängt an `isWarn` und damit an Host und
        gespeicherter Konfiguration, das ist Sache von `ConsoleLogger`, nicht dieses Falls.
     2. `releases its own namespace registration when its context goes` — eine Umgebung,
        `env.view = ComponentContext.get(NS_A)`, `expect(ShadowEnv.get(NS_A)).toBe(env)`, dann
        `env.view = undefined` und `expect(ShadowEnv.get(NS_A)).toBeUndefined()`.
     3. `releases its namespace registration on destroy` — `env.view = ComponentContext.get(NS_A)`,
        `env.destroy()`, `expect(ShadowEnv.get(NS_A)).toBeUndefined()`. Dieser Fall ist die Absicherung
        dafür, dass der gestrichene Block in `destroy()` (Schritt 3b) tatsächlich entbehrlich war.
     4. `takes its registration along when it moves to another namespace` — `env.view = ComponentContext.get(NS_A)`,
        dann `env.view = ComponentContext.get(NS_B)`. Erwartet: `ShadowEnv.get(NS_A)` ist `undefined`,
        `ShadowEnv.get(NS_B)` ist `env`.
  6. **Was die Spec nicht anfasst.** Die beiden `await new Promise((resolve) => setTimeout(resolve, 50))`
     in `ShadowEnv.spec.ts:351` und `:405` bleiben stehen. Sie gehören zu den beiden
     `MessageToView`-Fällen, haben mit keinem der beiden Befunde zu tun, und `Backlog.md:310,332,416`
     führt sie bereits als eigenen Posten. Wer sie hier mitnimmt, vermischt zwei Vorgänge in einem Commit.
  7. **Changelog.** Zwei Aufzählungspunkte in `packages/shadow-objects/CHANGELOG.md` unter
     `## [Unreleased]`, oben in der Liste (die Einträge der Pakete 4 und 5 stehen dort ab `:83`), in der
     Form der Nachbarn:

     ```markdown
     - **Bugfix (view):** the start of a proxy that is no longer the current one has no say over the environment. `ShadowEnv.envProxy` starts every proxy it is handed without waiting, and the result used to land wherever it arrived: a proxy replaced while it was still starting reported the *new* environment ready although nothing had started it — and in the other direction, the one that actually bites, its rejection arrived after the successor had come up and left `proxyReady` at `false`, with an environment that never became ready again, a `ready()` that never resolved and a `failed to start envProxy` in the log about a proxy nobody holds any more. Each assignment now opens a generation, and a start that finishes outside its own is discarded, error message included. Swapping a `RemoteWorkerEnv` that is still in its load handshake for another environment is the case this covers. The environment also stops listening to a proxy it has let go: `onMessageToView` and `onProxyFailed` are taken off it once its `destroy()` returns — a message an `onDestroy` sends towards the view during that teardown still arrives, a failure the released proxy reports afterwards no longer reaches the environment that let it go.
     - **Bugfix (view):** an environment releases a namespace registration only while it holds it. A namespace carries one environment at a time, and assigning a `view` displaces whatever was registered under `view.ns` — the environment says so through the `ConsoleLogger`. The displaced environment used to take the entry along when it let go of its `view`, so `ShadowEnv.get(ns)` answered `undefined` for an environment that was very much alive, and every `<shae-ent>` under that namespace stopped syncing: `ShaeElement` reaches its environment through exactly that lookup. The release is ownership-checked now, in the `view` setter as it has always been in `destroy()`.
     ```

     **Der gezählte Kopf des Abschnitts (`:12-82`, »Twenty-five changes reach existing consumers«) bleibt
     unangetastet — Zahl und Aufzählung stehen weiter im Gleichschritt, weil beide Einträge nichts
     hinzufügen, was einen Konsumenten zum Nachziehen zwingt.** Begründung, und sie ist nachprüfbar:
     `docs/api-reference.md:1108` sagt über `proxyReady` bereits »Set to `true` once `envProxy.start()`
     has resolved«, und `:1116-1122` über `ShadowEnv.get(ns)` »Retrieves an existing `ShadowEnv` instance
     by namespace«. Beide Eingriffe stellen her, was dort steht; wer sich an die Dokumentation gehalten
     hat, merkt nichts. Wer sich auf das Gegenteil verlassen hat, hat sich auf einen Defekt verlassen.
  8. **Doku, zwei Stellen in `packages/shadow-objects/docs/api-reference.md`.**

     a) `:1108`, die `proxyReady`-Zeile der Eigenschaftstabelle. Statt »Set to `true` once
     `envProxy.start()` has resolved, and back to `false` when the proxy fails.«:

     > Set to `true` once the start of the currently assigned proxy has resolved, and back to `false`
     > when that proxy fails. A start that finishes after its proxy has been replaced, cleared or
     > destroyed writes nothing here.

     b) Unter `#### ShadowEnv.get(namespace)` (`:1116-1122`), hinter dem Code-Beispiel, ein Absatz:

     > A namespace carries one environment at a time. Assigning a `view` registers the environment under
     > `view.ns` and displaces whatever was registered there, with a warning through the `ConsoleLogger`.
     > The registration is released by the environment that holds it — when its `view` moves to another
     > context or is cleared, and when it is destroyed. An environment that has been displaced releases
     > nothing, so this lookup keeps answering the environment that is actually registered.

     Kein Rückblick auf den Vorzustand in beiden Texten — sie beschreiben, was gilt.
  9. **`Backlog.md`, drei Stellen.** Die dauerhafte `VIEW-n`-Zählung dieser Datei ist von der
     Kürzel-Regel ausdrücklich ausgenommen (Entscheidung vom 2026-08-19), der Rückblick auf den
     Vorzustand hier ebenso.
     - `:206` — der Tabelleneintrag `VIEW-7` wird abgehakt, in der Form der Nachbarzeilen `VIEW-8`/`VIEW-9`:
       Kürzel und Beschreibung durchgestrichen, dahinter **✅ Behoben** und ein Satz — jede Zuweisung an
       `envProxy` eröffnet eine Generation, ein Start, der außerhalb seiner eigenen fertig wird, wird
       verworfen; dazu wird ein freigelassener Proxy stumm geschaltet, sobald sein `destroy()` zurückkehrt.
       Ortsangabe auf `ShadowEnv.ts` kürzen, die Zeilennummern `:117–125` stimmen nicht mehr.
     - `:413` — Punkt 8 der Maßnahmenliste (»`ShadowEnv.envProxy`-Swap-Sicherheit: Closure-Identitätscheck
       vor `proxyReady`-Toggle«) verlässt die Liste. Sie führt offene Maßnahmen, keine erledigten; die
       Nummerierung der Punkte darunter zieht nach.
     - `:226` — in `LOW-4` tritt an die Stelle von »`ShadowEnv.destroy()` räumt `__shadowEnvs` bereits ab«
       eine genauere Aussage: der `view`-Setter gibt den Eintrag in `__shadowEnvs` wieder frei, und zwar
       nur den eigenen — ein Namespace, den inzwischen eine andere Umgebung hält, bleibt bei ihr;
       `destroy()` läuft über denselben Weg. `FrameLoop.gUniqInstance` bleibt offen wie gehabt.
     - Dazu `:295`, die Abdeckungszeile zu `ShadowEnv` Setup/Teardown: die beiden neuen Fallgruppen
       nennen — ein Proxy-Wechsel während eines laufenden `start()` und die Eigentumsprüfung der
       Namespace-Registrierung.
  10. **Formatieren.** Zum Schluss `pnpm lint:fix` und `pnpm format`: Zeilenbreite 130, einfache
      Anführungszeichen, durchgehende Trailing Commas. `noExplicitAny` ist in `biome.json` aus, das `any`
      in den beiden Callback-Feldern des Doppels ist erlaubt und steht so auch im `FailingProxy`.
- Verify: `cd packages/shadow-objects && pnpm exec vitest src/view/ShadowEnv.spec.ts --run` — 28 → 38 Fälle,
  grün. Davor der Nachweis, dass die fünf roten Fälle rot sind: dieselbe Datei einmal gegen den unveränderten
  `ShadowEnv.ts` laufen lassen (`git stash push packages/shadow-objects/src/view/ShadowEnv.ts`, Lauf,
  `git stash pop`) — erwartet werden genau die fünf Ausfälle aus Schritt 4.1-4.5 und 5.1, die anderen
  Fälle bleiben grün. Danach von der Wurzel `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`;
  die Gesamtzahl steigt von 776 auf 786, keine bestehende Datei verliert einen Fall. `pnpm -F shadow-objects-e2e test`
  (402 Fälle, Chromium + Firefox) ist hier nicht verhandelbar: die Seiten `multi-env` und `worker-failure`
  fahren echte Proxy-Wechsel, und nur dort läuft der veränderte Setter gegen einen echten Worker.
  Auslieferung: `find packages/shadow-objects/dist -type f | sort` vor und nach dem Build ergibt dieselben
  198 Dateien, `dist/package.json` bleibt gleich.
- Commit: `fix(view): a proxy start that arrives too late, and a namespace that only its owner releases`
- Ergebnis: 1 Nachbesserungsrunde plus ein Nachtrag · beide Findings behoben · 13 neue Fälle,
  Gesamtzahl 776 → 789 · Auslieferung unverändert (198 Dateien in `dist`, `dist/package.json`
  byte-gleich) · E2E 402 in beiden Browsern, `multi-env` und `worker-failure` eingeschlossen
- Der Fund der Runde: das Abhängen der Proxy-Callbacks verwarf die Nachricht, die ein `onDestroy`
  während des Teardowns Richtung View schickt — genau die Eigenschaft, die Paket 4 als einzige
  verbliebene Asymmetrie zwischen lokaler und entfernter Umgebung dokumentiert hatte. Sie bleibt
  erhalten: `onProxyFailed` kommt synchron ab, `onMessageToView` einen Microtask später. Die
  Reihenfolge ist strukturell, nicht statistisch — `Kernel.destroy()` läuft synchron, das Emit wird
  während `destroy()` eingereiht, das Abhängen danach, die Queue arbeitet FIFO ab.
- Bekannte Grenze, dokumentiert: eine Nachricht, die zwei Ebenen tief eingereiht wird (ein `onDestroy`,
  das seinerseits erst einen Microtask später zustellt), fällt hinter das Abhängen. Von der Zusage in
  `docs/api-reference.md:1350` nicht gedeckt, die von »during this teardown« spricht.
- Nebenbefunde: `in-the-dark/Kernel.ts:354-356` — `onParentChanged` wird per `queueMicrotask`
  zugestellt; ein Handler, der von dort Richtung View schickt, fällt in dieselbe zweistufige Lücke.
  Nirgends zugesagt, aber nicht hypothetisch (vorbestehend) → nächstes Audit · `view/ShadowEnv.ts:113`
  — `#releaseNamespace` prüft `ns == null`, die Registrierung im `view`-Setter auf Wahrheitswert; für
  einen leeren String wäre die Freigabe weiter gefasst als die Registrierung. Folgenlos, weil ein leerer
  String nie registriert wird und `GlobalNS` ein Symbol ist (vorbestehend) → nächstes Audit ·
  `view/ShadowEnv.spec.ts:351` und `:405` — zwei `setTimeout(…, 50)`-Wartezeiten, in `Backlog.md`
  weiterhin als eigener Posten geführt (vorbestehend)
- Folgen: keine
- Schnittstellen: Jeder Umgebungs-Proxy trägt eine Generation. Ein `start()`, das nach dem Austausch,
  dem Leeren oder dem `destroy()` seines Proxys auflöst oder ablehnt, berührt `proxyReady` nicht mehr
  und meldet nichts mehr über die Umgebung. `#onProxyFailed` zählt ebenfalls hoch, ein Start nach einem
  gemeldeten Ausfall ist damit ebenso verworfen. Ein Namespace-Eintrag wird nur vom Eigentümer
  freigegeben. `ShadowEnv` nimmt `onMessageToView` und `onProxyFailed` von einem freigelassenen Proxy
  wieder ab — der Kontrakt steht jetzt in der JSDoc von `IShadowObjectEnvProxy` und in
  `docs/api-reference.md:1254`; wer die Callback-Referenz wegspeichert statt das Feld an sich selbst zu
  lesen, ist der einzige, den das trifft.
- Triage in Zug 0 (2026-08-19), die zum Abschluss von Paket 5 offenen Nebenbefunde:
  - `packages/shadow-objects/src/utils/waitForMessageOfType.ts:60` — »eine zweite, unabhängige
    Anmeldequelle neben den drei, die `stopListeningTo()` kennt«. **Gegenstandslos**, kein Befund und
    nichts fürs nächste Audit. Jeder Ausgang der Funktion läuft über dasselbe `cleanup()`
    (`waitForMessageOfType.ts:25-29`), das `removeEventListener('message', listener)` ruft — Auflösung,
    Timeout, Abbruch und ein werfender Guard. Und seit `1390e26` bricht jeder Ausgang der Umgebung —
    `destroy()` wie `handleWorkerFailure()` — den `#workerFailure`-Controller ab, womit das Abort-Signal
    feuert, das drei der vier Aufrufe mitgeben. Der vierte, die Wartung auf `Destroyed` in `destroy()`
    (`RemoteWorkerEnv.ts:303`), fährt bewusst ohne Signal und räumt spätestens mit seinem
    `WorkerDestroyTimeout` ab — danach wird der Worker ohnehin terminiert. Die Quelle ist unabhängig,
    aber nicht ungeräumt. Kein Zielpaket.
  - Aus dem Ergebnis von Paket 3, dort als »klein und offen gelassen« notiert:
    `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js` — der sechste Fall
    erzeugt sein Element per `new NsProbeElement(...)` statt über `createWithNamespace()` und zerschneidet
    damit die Gruppe der Payload-Fälle. **Echte Folge** dieses Laufs: die Datei entsteht mit `ab626ae`
    (`git show d6e91f5:packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js`
    → `path does not exist`). Eine Folge verlässt den Lauf nicht. → Paket 9, das als einziges offenes
    Paket dieselbe Datei anfasst; siehe den Nachtrag dort.

**ENV-RACE · envProxy-Setter startet fire-and-forget — Reassign-Race · medium · packages/shadow-objects/src/view/ShadowEnv.ts:113-138**
Der Setter ruft proxy.start() und setzt im then() proxyReady = true, ohne zu prüfen, ob der Proxy zu diesem Zeitpunkt noch der aktuelle ist. Wird envProxy während des laufenden start() erneut zugewiesen, meldet der alte Proxy die neue Umgebung als bereit — oder der catch-Zweig des alten Proxys setzt proxyReady = false, nachdem der neue bereits erfolgreich gestartet ist. Beide Richtungen führen zu einem ShadowEnv, dessen isReady lügt.
Empfehlung: Die Zuweisung mit einem Generations-Zähler versehen und in then()/catch() prüfen, ob der abgeschlossene Start noch zur aktuellen Generation gehört. Ergebnisse veralteter Starts verwerfen.
*Fundstelle heute: `ShadowEnv.ts:116-142`, der Start samt Kette in `:132-140`.*

**ENV-NS-001 · Der view-Setter löscht die Namespace-Registrierung ohne Eigentumsprüfung · low · packages/shadow-objects/src/view/ShadowEnv.ts:83-107**
Beim Wechsel des ComponentContext wird globalThis.__shadowEnvs.delete(ns) unbedingt ausgeführt — auch dann, wenn unter diesem Namespace inzwischen eine andere ShadowEnv registriert ist. Dass dieser Fall vorkommt, weiß der Code selbst: wenige Zeilen tiefer warnt er beim Überschreiben eines belegten Namespace. Räumt die zuerst registrierte Umgebung danach auf, nimmt sie die Registrierung der zweiten mit, und ShadowEnv.get(ns) liefert undefined. Der spiegelbildliche Block in destroy() prüft korrekt auf Identität und ist dadurch bereits unerreichbar.
Empfehlung: Vor dem delete prüfen, ob der Eintrag auf diese Instanz zeigt — dieselbe Bedingung, die destroy() bereits verwendet. Damit wird der Block in destroy() zugleich wieder sinnvoll.
*Fundstelle heute: `ShadowEnv.ts:82-110`, das unbedingte Löschen in `:88-90`, der spiegelbildliche Block in `:243-246`. Zum letzten Satz der Empfehlung: der Block in `destroy()` wird auch mit der Prüfung nicht wieder erreichbar, weil `this.view = undefined` (`:241`) die Registrierung bereits über dieselbe Bedingung freigibt. Deshalb Schritt 3b — eine Regel, eine Stelle.*

### [x] 7. Entity: Context-Vererbung, Prop-Cache, Sortierung
- Findings: ENT-CTX-001 (medium), ENT-PROP-001 (medium), ENT-SORT (low)
- Ziel: Das erste Kind erbt den Eltern-Context wie jedes weitere, `setProperty()` invalidiert den truthyProps-Cache, und der Aufbau eines Teilbaums sortiert einmal statt n-mal.
- Bereich: `packages/shadow-objects/src/in-the-dark/Entity.ts`
- Hängt ab von: —
- Modell: stärkste Stufe
- Hash: 8ad81f2
- Modell-Begründung (Zug 0): Die stärkste Stufe bleibt. Nicht wegen des Umfangs — der Eingriff sind rund
  fünfzehn Zeilen —, sondern wegen dreier Stellen, an denen ein Fehler still bleibt: die Kontextbindung läuft
  über `queueMicrotask` und einen `SignalsPath`, ein Test ohne den richtigen Drain ist grün aus dem falschen
  Grund; `addChild()` greift über `child.#context` auf ein privates Feld einer Fremdinstanz zu, und die
  Einfügung an der richtigen Stelle muss die Reihenfolge der stabilen Sortierung *beweisbar* treffen, nicht
  ungefähr. Dazu kommt, dass drei Fälle rot sein müssen und elf grün bleiben — wer die grünen nicht vorher
  gegen den unveränderten Stand laufen lässt, merkt eine verschobene Zusicherung nicht.
- Abgleich (Zug 0, 2026-08-19): `packages/shadow-objects/src/in-the-dark/Entity.ts` ist byteidentisch mit
  `git show d6e91f5:…` — die sechs Commits dieses Laufs haben die Datei nicht angefasst. Alle drei Befunde
  stehen unverändert; nur die Zeilennummern des Audits sind um zwei verrutscht (das Audit ist fünf Tage alt).
  Beide Korrektheitsfehler sind in Zug 0 mit einer Wegwerf-Spec reproduziert worden: das erste Kind liest
  `undefined`, das zweite `'from-parent'`; `truthyProps()` meldet nach `setProperties([['a',1]])` und
  `setProperty('b',1)` weiterhin nur `['a']`.
- Dateien:
  - `packages/shadow-objects/src/in-the-dark/Entity.ts`
  - `packages/shadow-objects/src/in-the-dark/Entity.spec.ts` (neu — die Datei gibt es noch nicht; alles, was
    heute von `Entity` geprüft wird, läuft über `Kernel.spec.ts`)
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`
  - `Backlog.md`
- Vorgehen:
  1. **Die Spec zuerst, und sie muss rot werden.** Neu: `packages/shadow-objects/src/in-the-dark/Entity.spec.ts`.
     Stil ist bindend `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts` (dieselbe Vorgabe wie in Paket 2):
     benannte Importe aus `vitest`, `describe`-Gruppen nach Verhaltensbereichen, `it`-Namen als englische
     Aussagesätze in der dritten Person Singular (»binds …«, nicht »should bind …«), Assertion-Botschaft als
     zweites Argument, wo der Fall nicht für sich spricht, Kommentare erklären das *Warum*. Keine Finding-Kürzel,
     in keiner Form — nicht im Dateikopf, nicht in einem `describe`, nicht in einem Kommentar.

     Aufbau: jeder Fall baut sich `const kernel = new Kernel(new Registry())` und schließt mit `kernel.destroy()`.
     Die eigene Registry ist Pflicht — `new Kernel()` ohne Argument fällt auf die modulweite Default-Registry
     zurück. Entities entstehen über `kernel.createEntity(uuid, token, parentUuid?, order?)` und werden über
     `kernel.getEntity(uuid)` geholt; `generateUUID()` aus `../utils/generateUUID.js` liefert die uuids.
     Kontextwerte laufen über einen Microtask (`deferContextValueUpdate`), die Datei bekommt dafür einen Helfer:

     ```ts
     const nextMicrotask = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));
     ```

     Ein Drain genügt; die Sammelstelle schreibt alle aufgelaufenen Kontextsignale in genau einem Microtask.

  2. **Gruppe `describe('Entity Context along the entity tree', …)` — fünf Fälle.** »Entity Context« ist hier die
     Dependency Injection entlang des Entity-Baums (`provideContext`/`useContext`); `ComponentContext`, das
     View-seitige Register eines Namespace, kommt in dieser Datei nicht vor und darf in keinem Testnamen und in
     keinem Kommentar auftauchen.
     - 2.1 **rot** — `binds a context the child already holds to the parent it is attached to`.
       Zwei Entities ohne Verwandtschaft anlegen. `parent.provideContext('ctx').set('from-parent')`. Dann
       `const consumer = child.useContext('ctx')` — damit existiert der Kontext des Kindes *vor* dem Anhängen und
       hängt an der Wurzel. Anhängen mit `child.parent = parent` (die Entity-API; **nicht** `kernel.setParent()`,
       das den Defekt mit seinem `reSubscribeToParentContexts()` verdeckt). Nach `await nextMicrotask()` ist die
       Erwartung `expect(value(consumer)).toBe('from-parent')`. Heute liefert der Lesekopf `undefined`, weil das
       Kind als erstes Kind über den frühen Rückgabepfad von `addChild()` läuft.
     - 2.2 grün — `binds a context the child already holds to the parent when a sibling is there already`.
       Identischer Aufbau, nur bekommt der Elternteil vorher ein Geschwisterkind
       (`kernel.createEntity(siblingUuid, 'sibling', parentUuid)`). Der Kontrollversuch: derselbe Ablauf über den
       zweiten Zweig von `addChild()` liefert `'from-parent'` — heute wie nachher. Dieser Fall ist der Beleg
       dafür, dass 2.1 an der Verzweigung hängt und nicht am Aufbau.
     - 2.3 grün — `keeps a context bound to the root while the entity has no parent`. Eine dritte, elternlose
       Entity ruft `provideGlobalContext('ctx').set('from-root')`; eine vierte, ebenfalls elternlose, liest
       `useContext('ctx')` und bekommt `'from-root'`. Hält den `else`-Zweig von `#subscribeToParent()` fest.
     - 2.4 grün — `re-binds a context to the root when the entity loses its parent`. Aufbau wie 2.3 plus ein
       Elternteil mit `provideContext('ctx').set('from-parent')` und ein daran hängendes Kind. Erst
       `'from-parent'`, dann `kernel.setParent(childUuid)` ohne zweites Argument, dann `'from-root'`. Dieser Fall
       ist die Sicherung dafür, dass Schritt 4 den `reSubscribeToParentContexts()`-Aufruf in `Kernel.setParent()`
       **nicht** entfernt: der Ablösepfad läuft durch kein `addChild()` und wird von der neuen Bindung in
       `addChild()` nicht abgedeckt.
     - 2.5 grün — `binds a context created after the attachment to the parent`. Kind zuerst anhängen, danach
       `useContext('ctx')` rufen. `#findOrCreateContext()` bindet selbst an den Elternteil; der Fall trennt die
       beiden Wege, über die eine Bindung entsteht.

  3. **Gruppe `describe('truthy property cache', …)` — vier Fälle.**
     - 3.1 **rot** — `reports a property that setProperty() made truthy`. `e.setProperties([['a', 1]])`, einmal
       `e.truthyProps()` lesen (das füllt den Cache), dann `e.setProperty('b', 1)`, dann
       `expect(Array.from(e.truthyProps()!)).toEqual(['a', 'b'])`. Heute steht dort `['a']`.
     - 3.2 grün — `reports a property that setProperties() made truthy`. Derselbe Ablauf mit
       `e.setProperties([['b', 1]])` als zweitem Schreibweg. Der Zwilling zu 3.1: beide Einstiegspunkte gegen
       dieselbe Erwartung, damit die Symmetrie nicht wieder auseinanderläuft.
     - 3.3 **rot** — `drops a property that setProperty() made falsy`. `e.setProperties([['a', 1], ['b', 1]])`,
       `truthyProps()` lesen, dann `e.setProperty('a', false)`, Erwartung `['b']`. Heute `['a', 'b']`.
       Falsch im Sinne von `truthyProps()` sind `null`, `undefined`, `false` und `''` — jeder andere Wert zählt,
       `0` eingeschlossen.
     - 3.4 grün — `answers undefined while no property is truthy`. Eine frische Entity ohne Properties und eine,
       deren einzige Property auf `''` steht, liefern beide `undefined` statt einer leeren Menge. Hält den
       Rückgabevertrag fest, den `Registry.findConstructors()` als `truthyProps?: Set<string>` erwartet.

  4. **Gruppe `describe('children order', …)` — vier Fälle.** Alle vier sind heute grün und bleiben es; sie sind
     der Beleg dafür, dass Schritt 7 die Reihenfolge nicht antastet. Kinder entstehen über
     `kernel.createEntity(uuid, token, parentUuid, order)`, gelesen wird `parent.children.map((c) => c.uuid)`.
     - 4.1 `sorts siblings by ascending order` — Kinder in der Reihenfolge der `order`-Werte `[2, 0, 1]` anhängen,
       Erwartung ist die aufsteigende Folge.
     - 4.2 `keeps the attachment order among siblings that share an order` — fünf Kinder mit den `order`-Werten
       `[1, 0, 1, 0, 1]`; erwartet werden erst die beiden Nullen in Anhängereihenfolge, dann die drei Einsen in
       Anhängereihenfolge. Das ist die Zusicherung, an der Schritt 7 hängt.
     - 4.3 `places a later child with a lower order in front of the ones already there` — negative `order`-Werte
       einschließen (`[0, 0, -1]`), das Kind mit `-1` steht vorn.
     - 4.4 `re-sorts the siblings when the order of one of them changes` — nach dem Aufbau
       `kernel.updateOrder(uuid, n)` auf ein bereits hängendes Kind. Hält fest, dass der `order`-Setter weiterhin
       über `parent.resortChildren()` geht; Schritt 7 lässt diesen Weg unangetastet.

  5. **Gruppe `describe('addChild', …)` — ein Fall.** `rejects a child that is already among the children`:
     `parent.addChild(child)` zweimal auf demselben Kind wirft mit der Botschaft, die die Uuid des Kindes und die
     des Elternteils nennt (`expect(() => …).toThrow(/already exists/)`). Heute läuft der erste Aufruf über den
     frühen Rückgabepfad und der zweite in die Duplikatprüfung; nach Schritt 6 sehen beide dieselbe Prüfung. Der
     Fall hält fest, dass sich daran nichts ändert.

     Insgesamt vierzehn Fälle, davon drei rot: 2.1, 3.1, 3.3.

  6. **`addChild()` auflösen** (`in-the-dark/Entity.ts:178-202`). Der frühe Rückgabepfad für die leere Kinderliste
     entfällt ersatzlos; übrig bleibt ein Weg:

     ```ts
     addChild(child: Entity) {
       if (this.#childrenUuids.has(child.uuid)) {
         throw new Error(`child with uuid: ${child.uuid} already exists! parentUuid: ${this.uuid}`);
       }

       this.#childrenUuids.add(child.uuid);
       this.#insertChildInOrder(child);

       // the child may have created its contexts while it was still unattached: they hang on the root
       // of the entity context tree until something binds them to the parent they now have
       for (const [, ctx] of child.#context) {
         child.#subscribeToParent(ctx);
       }

       // this.emit(onAddChild, this, child);
       // child.emit(onAddToParent, child, this);
     }
     ```

     Die beiden auskommentierten `emit`-Zeilen standen bisher zweimal in der Methode, einmal je Zweig; es bleibt
     ein Paar, am Ende. Die Duplikatprüfung auf einer leeren Kinderliste ist ein No-op, die Sortierung bei genau
     einem Kind ebenfalls — die Sonderbehandlung sparte nichts und kostete die Kontextbindung.

  7. **Einmal einsortieren statt n-mal sortieren.** Neu, privat, direkt unter `addChild()`:

     ```ts
     /**
      * Keeps the children sorted as they arrive, so building a subtree costs one insertion per child
      * instead of one full sort per child. The scan runs from the end because children usually arrive
      * with an equal or rising `order`, which makes the common case a plain append. A child lands
      * behind every sibling that shares its `order` -- the same place a stable sort would give it.
      */
     #insertChildInOrder(child: Entity) {
       let i = this.#children.length;
       while (i > 0 && child.order < this.#children[i - 1].order) i--;
       this.#children.splice(i, 0, child);
     }
     ```

     `resortChildren()` bleibt **unverändert** öffentlich stehen und behält seinen einen Aufrufer, den
     `order`-Setter (`:84-91`): eine `order`, die sich ändert, während das Kind schon hängt, ist der eine Fall, den
     eine Einfügung nicht abdeckt.

     Die Voraussetzung, unter der die Einfügung dasselbe Ergebnis liefert wie der bisherige Sortierlauf, ist die
     Sortiertheit der Liste vor jeder Einfügung. Sie wird von jedem Weg gehalten, der `#children` anfasst:
     `#insertChildInOrder()` erhält sie, `removeChild()` schneidet mit `splice` heraus, `[onDestroy]` leert die
     Liste, und der `order`-Setter sortiert nach. Ein Satz im Kommentar oben sagt das; eine Behauptung ohne ihre
     Begründung ist in zwei Jahren nur noch eine Behauptung.

     Der zweite Weg aus der Audit-Empfehlung — die Liste als »dirty« markieren und einmal am Ende des Batches
     sortieren — ist **abgelehnt**, und zwar nicht aus Geschmack: `entity.children` ist über `EntityApi` öffentlich
     lesbar. Ein Leser mitten im Batch bekäme eine unsortierte Liste zu sehen, und eine `order`, die sich zwischen
     zwei Einfügungen ändert, ergäbe am Ende eine andere Reihenfolge als heute (heute: sortieren, `order` ändern,
     sortieren, `order` zurücksetzen, sortieren — die stabile Sortierung hält dabei die zuletzt erreichte
     Nachbarschaft fest; ein einziger Lauf am Ende sieht diese Zwischenschritte nie). Eine Änderung, die die
     Reihenfolge sichtbar verschiebt, ist kein Performance-Fix mehr.

  8. **Die Invalidierung an eine Stelle.** In `setProperty()` (`:310-312`) kommt `this.clearTruthyPropsCache()`
     vor den Schreibzugriff; in `setProperties()` (`:300-308`) entfällt der Aufruf, der dort heute steht. Danach
     gibt es genau einen Ort, der den Cache verwirft, und beide Einstiegspunkte laufen durch ihn:

     ```ts
     setProperties(properties: ComponentPropertiesType) {
       batch(() => {
         // an entry that names only the key sets the property to `undefined` — the key is there, the value is not
         for (const [key, val] of properties) {
           this.setProperty(key, val);
         }
       });
     }

     setProperty(key: string, value: unknown) {
       // the cache answers `updateShadowObjects()`, which picks the shadow objects of this entity by the
       // property routes of the registry -- a write it does not see routes to a state that no longer exists
       this.clearTruthyPropsCache();
       this.getPropertyWriter(key)(value);
     }
     ```

     Das `batch()` bleibt: es fasst die Signalschreibvorgänge zusammen, nicht die Cache-Verwerfung. Der Cache ist
     kein Signal, `truthyProps()` liest die Werte über `sig.value` am Graphen vorbei — eine Verwerfung innerhalb
     des Batches ist deshalb sofort wirksam und nicht aufgeschoben.

     Ausdrücklich **nicht** Gegenstand dieses Pakets: `getPropertyWriter()` (`:296-298`) gibt den Schreibkopf
     heraus, und wer ihn wegspeichert, schreibt an `setProperty()` und damit an der Verwerfung vorbei. Das dicht
     zu bekommen hieße, die Verwerfung an das Signal selbst zu hängen statt an den Aufrufer — ein anderer Entwurf,
     mit eigenen Kosten, und von keinem Befund dieses Laufs verlangt. Der Rest steht als Posten in »Für das
     nächste Audit«.

  9. **Dokumentation.** `packages/shadow-objects/docs/api-reference.md`, zwei Stellen, beide beschreiben den Stand
     nach dem Fix ohne Rückblick auf den Vorzustand:
     - Unter `#### useContext(name, options?)` (`:106-114`) ein Satz dazu: die Bindung folgt dem Entity-Baum zu
       jedem Zeitpunkt — eine Entity, die ihren Kontext schon hält und danach an einen Elternteil gehängt wird,
       liest von diesem Elternteil weiter, und eine, die ihren Elternteil verliert, fällt auf den Root-Context
       zurück. Der Absatz spricht von »Entity Context«; `ComponentContext` kommt darin nicht vor.
     - In `### 7. The entity Instance`, unter der Eigenschaftstabelle (`:398-412`) neben dem Absatz zu `propKeys`
       und `propEntries`: ein Satz zur Reihenfolge von `entity.children` — aufsteigend nach `order`, und Kinder
       mit gleicher `order` in der Reihenfolge, in der sie angehängt wurden. Das ist dieselbe Regel, die
       `:679-686` für die View-Seite ausschreibt; auf der Entity-Seite steht sie bisher nirgends, und Schritt 7
       hängt an ihr.
     `docs/cheat-sheet.md` bleibt unangetastet: sein Eintrag `entity.order` (`:313`) ist eine Metadatenzeile, und
     die Geschwisterregel steht dort (`:365`) für die View-Seite, wo sie hingehört. `README.md` des Pakets nennt
     weder Kontext noch Kinderliste — keine Änderung.

  10. **Changelog.** `packages/shadow-objects/CHANGELOG.md`, Abschnitt `## [Unreleased]`. Zwei der drei Änderungen
      erreichen Konsumenten: der Kopf zählt heute »Twenty-five changes reach existing consumers« und wird zu
      »Twenty-seven«, und die Aufzählung dahinter bekommt genau zwei Glieder dazu — eine Entity, die ihren Entity
      Context schon hält und als erstes Kind angehängt wird, liest ab jetzt vom Elternteil statt vom Root-Context;
      und ein `entity.setProperty()` verändert die Menge, nach der die Registry beim nächsten
      `updateShadowObjects()` die Shadow Objects auswählt, sodass eine Anwendung mit Property-Routen
      (`token@prop`) andere Shadow Objects entstehen und vergehen sieht. Zahl und Aufzählung wachsen im
      Gleichschritt — wer die eine anfasst, fasst die andere an.

      Dazu drei Aufzählungspunkte im Stil der Nachbarn (`- **Bugfix (kernel):** …`, das Label gibt es in der
      Datei bereits): einer je Korrektheitsfehler, und einer als `- **Internal (kernel):** …` für die Einfügung an
      der richtigen Stelle, der ausdrücklich sagt, dass die Reihenfolge der Geschwister dieselbe bleibt. Der
      dritte zählt im Kopf **nicht** mit: er zwingt keinen Konsumenten zu irgendetwas. Der Rückblick auf den
      Vorzustand ist hier erlaubt (Entscheidung vom 2026-08-19) und in dieser Datei auch üblich.

      Die Wurzel-`CHANGELOG.md` bekommt nichts: das ist Laufzeitverhalten eines Pakets, kein Monorepo-Vorgang.

  11. **`Backlog.md` nachziehen.** Drei Eingriffe:
      - §3.5 Performance, die Zeile `| **Entity.addChild** sortiert bei jedem Insert (O(n²) bei Batch-Inserts). |`
        (`:236`) fällt raus. Erledigte Posten verlassen das Dokument, sie werden nicht durchgestrichen liegen
        gelassen — der Backlog ist ein Arbeitsdokument, kein Protokoll.
      - §3.3 (`MEDIUM — bemerkenswerte Auswahl`, die Tabelle ab `:200`) bekommt zwei neue Zeilen in der
        durchlaufenden Zählung des Dokuments, also `**KERN-9**` und `**KERN-10**` — die höchste vergebene Nummer
        ist heute `KERN-8` (`:123`). Format wie die Nachbarn `KERN-5` bis `KERN-7` (`:211-213`): Befund
        durchgestrichen, `**✅ Behoben**`, ein Satz zur Lösung, Datei in der dritten Spalte. `KERN-9` ist die
        Kontextvererbung des ersten Kindes, `KERN-10` die Cache-Verwerfung von `setProperty()`. Diese Zählung ist
        die dauerhafte des Projekts und die einzige, die außerhalb dieses Plans stehen darf.
      - Sonst nichts. Die Datei führt keinen Posten zur Kontextvererbung und keinen zum truthyProps-Cache, der
        jetzt stillzulegen wäre.

  12. **Formatieren.** Zum Schluss `pnpm lint:fix` und `pnpm format`: Zeilenbreite 130, einfache
      Anführungszeichen, durchgehende Trailing Commas, kein abschließender Zeilenumbruch (`biome.json:40` führt
      `"trailingNewline": false`, alle `.ts` unter `src/` enden so).
- Verify: `cd packages/shadow-objects && pnpm exec vitest src/in-the-dark/Entity.spec.ts --run` — vierzehn Fälle,
  grün. Davor der Nachweis, dass genau drei rot sind: dieselbe Datei einmal gegen den unveränderten `Entity.ts`
  laufen lassen (`git stash push packages/shadow-objects/src/in-the-dark/Entity.ts`, Lauf, `git stash pop`).
  Erwartet werden genau die Ausfälle aus 2.1, 3.1 und 3.3 — elf grüne Fälle sind Teil des Nachweises, nicht
  Beiwerk: eine grüne Zusicherung, die im Vorzustand rot ist, beschreibt eine Verhaltensänderung, die dieses Paket
  nicht vorhat. Danach von der Wurzel `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`; die
  Gesamtzahl steigt von 789 auf 803, keine bestehende Datei verliert einen Fall — insbesondere bleibt
  `in-the-dark/Kernel.spec.ts` vollständig grün, dort hängen die Kontext- und Reparenting-Gruppen
  (`:380-520`, `:1443-1476`) an genau den Pfaden, die dieses Paket umbaut. `pnpm -F shadow-objects-e2e test`
  (402 Fälle, Chromium + Firefox) gehört dazu: jeder `CreateEntities`-Eintrag eines echten Change Trails läuft
  durch `addChild()`, und nur dort wird ein Entity-Baum aus einem einzigen Trail in einem echten Worker aufgebaut.
  Auslieferung: `find packages/shadow-objects/dist -type f | sort` vor und nach dem Build ergibt dieselben
  198 Dateien, `dist/package.json` bleibt gleich; die `.d.ts` von `Entity` bekommt eine `private`-Zeile für
  `#insertChildInOrder` dazu, sonst nichts.
- Commit: `fix(entity): a first child that inherits like every other, and a prop cache that no write outruns`
- Ergebnis: 4 Nachbesserungsrunden — das teuerste Paket des Laufs · alle drei Findings behoben · 20 neue
  Fälle in der ersten eigenen Spec für `Entity`, Gesamtzahl 789 → 809 · Auslieferung unverändert (198
  Dateien, `dist/package.json` byte-gleich); `Entity.d.ts` führt neu
  `removeFromParent(rebindContexts?: boolean): void` — additiv, defaultbelegt, `Entity` steht nicht in
  `index.ts` · E2E 402 in beiden Browsern
- Warum vier Runden: Der kritische Befund war, dass das Paket die Anhänge-Seite der Context-Vererbung
  schloss, die Ablöse-Seite offen ließ und die Zusage trotzdem in die veröffentlichte Doku schrieb.
  Die Reparatur erzeugte einen Zwischenwert beim Umhängen (`useParentContext()` sah kurz den
  Root-Wert), deren Reparatur brach die Sortierung auf dem Weg »gleicher Elternteil, neue `order`«
  (300 Abweichungen in 22.137 Operationen, differenziell gemessen), und erst der dritte Schnitt saß:
  `removeFromParent(rebindContexts)` mit `Kernel.setParent()` als einzigem Aufrufer, der `false`
  übergibt. Jede Runde schloss einen benannten Defekt mit Fundstelle — keine lief im Kreis.
- Werkzeug, das den Lauf getragen hat: ein Nachbau des alten Sortier-Algorithmus, gegen den jeder Stand
  differenziell gefahren wurde. Er meldete dreimal null Abweichungen, beim gebrochenen Stand 300, und
  am Ende wieder null bei 22.265 Operationen. Ohne ihn wäre der Bruch committet worden.
- Nebenbefunde: `in-the-dark/Kernel.ts:353` — `reSubscribeToParentContexts()` bindet pro Umhängung ein
  drittes Mal um, wo einmal genügt; gemessen an einem `useParentContext()`-Leser als `["root","B","B"]`
  bzw. jetzt `["from-a","from-b","from-b"]`. Der Aufruf bleibt nötig, solange eine öffentliche Methode
  sonst ohne internen Aufrufer dasteht → **Paket 8** · `in-the-dark/Entity.ts:229` — `removeFromParent()`
  prüft `if (this.#parent)` statt über den `parent`-Getter aufzulösen; dieselbe Halbkanten-Klasse wie die
  Sortiertheits-Bedingung, über heutige Pfade unerreichbar (vorbestehend) → nächstes Audit ·
  `in-the-dark/Entity.ts:304-306` — `getPropertyWriter()` gibt den Schreibkopf heraus und umgeht damit die
  Cache-Verwerfung; nicht auf `EntityApi`, erreichbar nur über `entity.kernel.getEntity()` (vorbestehend)
  → nächstes Audit · `in-the-dark/Entity.ts:142-147` — `traverse()` rekursiert ohne Besuchsmenge
  (vorbestehend) → **Paket 8**
- Folgen: keine offenen — die drei, die dieses Paket erzeugt hat, sind in seinen Runden geschlossen
- Schnittstellen: `Entity.removeFromParent(rebindContexts = true)` — der Parameter unterdrückt die
  Rückbindung an den Root-Context und ist für den einen Fall gedacht, in dem unmittelbar ein neues
  Anhängen folgt; einziger Aufrufer mit `false` ist `Kernel.setParent()`. Ein Kind erbt den Entity
  Context seines Elternteils unabhängig davon, ob es das erste ist. Ein zur Wurzel befördertes Kind liest
  den Root-Wert und folgt späteren Änderungen. `setProperty()` verwirft den `truthyProps()`-Cache. Die
  Geschwisterfolge ist unverändert, solange die Kinderliste beim Einfügen sortiert ist — der
  `order`-Setter hält das nur für ein Kind, das seinen Elternteil kennt.
- Nebenbefunde (Zug 0, 2026-08-19): `in-the-dark/Entity.ts:142-147` — `traverse()` rekursiert über die Kinder ohne
  Besuchsmenge, die dritte Stelle desselben Musters, das `TRAVERSE-CYCLE-001` für die BFS des Kernels und für
  `ComponentContext` beschreibt; das Finding nennt sie nicht. Nachgewiesen **vorbestehend** (`Entity.ts` ist
  byteidentisch mit `git show d6e91f5:…`). → Paket 8, siehe den Nachtrag dort ·
  `in-the-dark/Entity.ts:296-298` — `getPropertyWriter()` gibt den Schreibkopf einer Property heraus; ein Aufrufer,
  der ihn wegspeichert, schreibt an `setProperty()` und damit an der Cache-Verwerfung vorbei. Vorbestehend, gleiche
  Ursache wie der Prop-Cache-Befund, aber von seiner Empfehlung nicht gedeckt → nächstes Audit
- Triage in Zug 0 (2026-08-19), die zum Abschluss von Paket 6 offenen Nebenbefunde:
  - `view/ShadowEnv.ts:113` — `#releaseNamespace()` prüft `ns == null`, die Registrierung im `view`-Setter auf
    Wahrheitswert. Unter Paket 6 als »vorbestehend« notiert; das trägt nicht. `#releaseNamespace()` entsteht erst
    mit `ff55553`: `git show d6e91f5:packages/shadow-objects/src/view/ShadowEnv.ts` kennt die Methode nicht, dort
    löschen Freigabe (`:88`) und Registrierung (`:94`) beide über denselben Wahrheitstest `this.#comCtx?.ns`. Die
    Asymmetrie ist also **echte Folge** dieses Laufs, und eine Folge verlässt ihn nicht. Folgenlos bleibt sie
    trotzdem — ein leerer String wird nie registriert und `GlobalNS` ist ein Symbol —, aber sie gehört
    geschlossen, wo sie entstanden ist. → Paket 12, das `view/ShadowEnv.ts` ohnehin in seinem Bereich führt.
  - `in-the-dark/Kernel.ts:354-356` — `onParentChanged` wird per `queueMicrotask` zugestellt, ein Handler, der von
    dort Richtung View schickt, fällt hinter das Abhängen der Proxy-Callbacks. Nachgewiesen **vorbestehend**: der
    Block ist zeichengleich mit `git show d6e91f5:…` (`:355-360`), und der einzige Unterschied an der ganzen Datei
    über diesen Lauf ist der Wrapper-Typ in `:190` aus Paket 1. Bleibt beim **nächsten Audit**, obwohl Paket 8
    dieselbe Datei anfasst: dessen drei Befunde sind der Lookup-Vertrag, das Aliasing des BFS-Caches und der
    Zyklusschutz — die Zustellzeit eines Lebenszyklus-Ereignisses ist keiner davon, und sie zu ändern wäre eine
    Verhaltensänderung an einem öffentlichen Ereignis, die eine eigene Entscheidung braucht. Der Eintrag in der
    Schluss-Sektion sagt das, damit es niemand ein zweites Mal aufrollt.
  - `view/ShadowEnv.spec.ts:351` und `:405` — zwei `setTimeout(…, 50)`-Wartezeiten. Nachgewiesen
    **vorbestehend**: beide stehen zeilengleich in `git show d6e91f5:packages/shadow-objects/src/view/ShadowEnv.spec.ts`.
    **Gegenstandslos** für die Triage dieses Laufs, und nichts für die Schluss-Sektion: `Backlog.md` führt sie
    zweimal als eigenen Posten (`:310` unter Test-Qualität, `:415` als Punkt 10 der mittelfristigen Liste). Ein
    dauerhafter Tracker hält sie bereits; sie ein zweites Mal aufzuschreiben gäbe demselben Posten zwei Wohnungen.
    Kein Zielpaket.

**ENT-CTX-001 · Das erste Kind einer Entity erbt den Eltern-Context nicht · medium · packages/shadow-objects/src/in-the-dark/Entity.ts:176-200**
addChild() hat zwei Zweige. Ist die Kinderliste leer, kehrt die Methode früh zurück — und überspringt dabei die Schleife, die die bereits existierenden Contexts des Kindes neu an den Elternteil bindet. Ein Kind, das seinen Context erzeugt hat, bevor es angehängt wurde, hängt danach als erstes Kind weiterhin am Root-Context statt am Eltern-Context. Nachgewiesen mit Kontrollversuch: als erstes Kind liest der Consumer undefined, als zweites Kind (identischer Aufbau, ein Geschwisterkind vorher) korrekt 'from-parent'. Über Kernel.setParent() ist der Defekt verdeckt, weil dort anschließend reSubscribeToParentContexts() läuft; über die Entity-API direkt schlägt er durch.
Empfehlung: Den frühen Rückgabepfad auflösen: Duplikat-Prüfung, Einfügen, resortChildren() und die Context-Neubindung für alle Fälle durchlaufen lassen. Bei genau einem Kind ist das Sortieren ohnehin ein No-op — die Sonderbehandlung spart nichts und kostet eine Verhaltensabweichung.
*Fundstelle heute: `Entity.ts:178-202`, der frühe Rückgabepfad in `:179-185`, die Neubindungsschleife in `:196-198`. Der Einstieg, über den der Defekt durchschlägt, ist der `parent`/`parentUuid`-Setter (`:97-124`); ein blankes `parent.addChild(child)` setzt die Elternbeziehung des Kindes gar nicht und führt deshalb an dem Fall vorbei.*

**ENT-PROP-001 · Entity.setProperty() invalidiert den truthyProps-Cache nicht · medium · packages/shadow-objects/src/in-the-dark/Entity.ts:307-309, 323-344**
setProperties() ruft clearTruthyPropsCache(), setProperty() nicht. Der Cache steuert über Kernel.updateShadowObjects() das Prop-basierte Token-Routing (die 'token@prop'-Routen der Registry). Nach einem direkten setProperty() liefert truthyProps() weiterhin den alten Satz, und die Registry wählt die Shadow Objects nach einem Zustand aus, den es nicht mehr gibt. Nachgewiesen: nach setProperties([['a',1]]) und anschließendem setProperty('b',1) meldet truthyProps() weiterhin nur ['a'].
Empfehlung: clearTruthyPropsCache() in setProperty() aufrufen und setProperties() über setProperty() laufen lassen, statt die Invalidierung an zwei Stellen zu pflegen. Ein Regressionstest, der beide Einstiegspunkte gegen dieselbe Erwartung prüft, hält die Symmetrie.
*Fundstelle heute: `Entity.ts:310-312` (`setProperty`), `:300-308` (`setProperties`), `:326-347` (Cache und `truthyProps()`). Die Leser sind `Kernel.ts:403` (`updateShadowObjects`) und `:840` (`createShadowObjects`); ein blankes `setProperty()` löst selbst keinen Update-Lauf aus — der veraltete Satz wird beim nächsten Token-, Routen- oder Property-Wechsel wirksam.*

**ENT-SORT · Entity.addChild sortiert die Kinderliste bei jedem Einfügen neu · low · packages/shadow-objects/src/in-the-dark/Entity.ts:192, 202-204**
Jedes addChild() ruft resortChildren(), also einen vollständigen Array.sort. Beim Aufbau eines Teilbaums mit n Kindern ergibt das n Sortierläufe statt eines — O(n² log n) statt O(n log n). Bei den üblichen Kinderzahlen unauffällig, beim Aufbau großer Bäume aus einem einzelnen Change Trail messbar.
Empfehlung: Die Liste als dirty markieren und einmal am Ende des Batches sortieren (Kernel.run läuft ohnehin in einem batch()), oder direkt an der richtigen Position einfügen, wie es ComponentContext.#appendToOrdered auf der View-Seite bereits tut.
*Fundstelle heute: `Entity.ts:194` (der Aufruf), `:204-206` (`resortChildren`), Vorlage `view/ComponentContext.ts:661-677`. Gewählt wird der zweite Weg der Empfehlung; der erste ist in Schritt 7 mit Begründung abgelehnt. Die Reihenfolge bleibt identisch: `Array.prototype.sort` ist seit ES2019 stabil, ein angehängtes Element landet damit hinter allen Geschwistern gleicher `order`, und genau dort setzt die Einfügung es auch. In Zug 0 über 500 Zufallsformen (1 bis 12 Kinder, `order` aus −1 bis 2) gegeneinander gemessen: die Einfügung von hinten, die Einfügung von vorn nach dem Muster von `#appendToOrdered` und der heutige Sortierlauf je Einfügung liefern in allen 500 Fällen dieselbe Folge. Fall 4.2 der Spec hält das fest.*

### [x] 8. Kernel: Lookup-Vertrag, BFS-Aliasing, Zyklusschutz
- Findings: KERN-GET-001 (low), KERN-BFS-001 (low), TRAVERSE-CYCLE-001 (low)
- Ziel: Ein Ereignis an eine entfernte Entity ist ein No-op statt einer Exception, die BFS-Traversierung gibt eine eigene Liste heraus statt ihres Caches, ein Elternteil, der den Entity-Baum zu einem Ring schließen würde, wird abgewiesen, und die drei Traversierungen über die Kinderlisten überleben eine Kinderliste, die zurückzeigt — auch die dritte, die das Finding nicht nennt (Nachtrag aus Zug 0 von Paket 7). Dazu der Teardown des Kernels: der Durchlauf endet nicht mehr am ersten werfenden Callback, und die Root-Contexts stehen, solange er läuft.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.ts`, `packages/shadow-objects/src/view/ComponentContext.ts`,
  `packages/shadow-objects/src/in-the-dark/Entity.ts` (nur die Traversierung, siehe den Nachtrag unten)
- Hängt ab von: Paket 7 (fasst `in-the-dark/Entity.ts` an und legt `in-the-dark/Entity.spec.ts` an)
- Modell: stärkste Stufe
- Hash: d3c71da
- Nachtrag aus Zug 0 von Paket 7 (2026-08-19), ein vorbestehender Nebenbefund ohne Finding, gleiche Ursache wie
  `TRAVERSE-CYCLE-001`: `packages/shadow-objects/src/in-the-dark/Entity.ts:142-147` — `Entity.traverse()`
  rekursiert über `this.#children` ohne Besuchsmenge, genau wie die beiden Traversierungen, die das Finding
  nennt. Es ist die dritte Stelle desselben Musters und die einzige, die auf der Entity-Seite liegt; ein Zyklus
  in der Kinderliste beendet sie mit einem Stack Overflow. Nachgewiesen **vorbestehend**: `Entity.ts` ist
  byteidentisch mit `git show d6e91f5:packages/shadow-objects/src/in-the-dark/Entity.ts`. `traverse()` ist über
  `EntityApi` öffentlich (`types.ts:98`) und in `docs/api-reference.md:421-435` dokumentiert — wer die beiden
  anderen Traversierungen absichert und diese stehen lässt, hat den Zyklusschutz auf zwei von drei Wegen.
- Nachtrag aus Zug 0 von Paket 7 (2026-08-19), was dieses Paket in `Entity.ts` vorfindet: `addChild()` hat nach
  Paket 7 nur noch einen Weg statt zweier. Sollte dieses Paket den zweiten Weg der Empfehlung von
  `TRAVERSE-CYCLE-001` gehen — die Zyklusfreiheit an einer Stelle je Seite erzwingen, »aber dann auch für den
  Entity-Pfad im Kernel« —, ist das die Stelle, und sie ist nur noch einmal da. Eine Vorfahrenprüfung in
  `addChild()` wirft, wo heute nichts wirft; das ist eine Verhaltensänderung mit Changelog-Pflicht und eine
  Entscheidung dieses Pakets, nicht von Paket 7, das sie deshalb ausdrücklich nicht vorwegnimmt. Fällt sie für
  die Prüfung aus, ist `packages/shadow-objects/src/in-the-dark/Entity.spec.ts` ab Paket 7 vorhanden und der
  Ort für den Fall; für die Kernel-Seite ist es `Kernel.spec.ts`.
- Nachtrag aus der Triage in Zug 0 von Paket 5 (2026-08-19), ein vorbestehender Nebenbefund aus Paket 4, ohne
  Finding: `packages/shadow-objects/src/in-the-dark/Kernel.ts:889-897` — `destroy()` läuft die Entities ohne
  Absicherung je Entity ab; ein werfendes `onDestroy` beendet den Durchlauf, die restlichen Entities bleiben
  stehen, und `#rootContexts` ist zu dem Zeitpunkt bereits entsorgt. In Zug 0 von Paket 7 nachgeprüft: der Befund
  steht unverändert, und er trifft dieselbe Zeile wie `KERN-BFS-001` — `destroy()` ist der Aufrufer, der
  `traverseLevelOrderBFS().reverse()` schreibt und damit den Cache in place dreht. Beides in einem Zug:
  `traverseLevelOrderBFS(true)` statt `.reverse()`, und ein `try`/`catch` je Entity. Die Grenze, die
  `docs/api-reference.md:1352` heute für den Worker-Teardown ausschreibt (»a callback that throws ends the sweep
  where it stands«), zieht dieses Paket damit ein — der Satz gehört dann nachgezogen.
- Modell-Begründung (Zug 0): Die stärkste Stufe bleibt. Der Eingriff ist an keiner Stelle groß, aber er verteilt
  sich über drei Dateien und sechs unabhängige Bewegungen, von denen zwei die Reihenfolge von Mutationen treffen:
  der Zyklus-Guard muss zuschlagen, *bevor* `Kernel.setParent()` die Entity von ihrem Elternteil löst, und der
  Teardown muss die Root-Contexts *nach* dem Entity-Durchlauf entsorgen. Beides bleibt still, wenn man es falsch
  herum baut — die Tests wären grün, der Schaden käme erst beim Aufrufer an. Dazu kommen 19 rote Fälle, die alle
  aus dem richtigen Grund rot sein müssen: ein Stack Overflow und eine Exception aus einem Guard sehen im
  Testbericht gleich aus.
- Abgleich (Zug 0, 2026-08-19): Alle drei Befunde stehen unverändert; `packages/shadow-objects/src/in-the-dark/Kernel.ts`
  hat über die sieben Commits dieses Laufs genau zwei Änderungen erfahren (`git diff d6e91f5 HEAD -- …/Kernel.ts`):
  den Wrapper-Typ `String` → `string` in `:190` aus Paket 1 und den `removeFromParent(parentUuid == null)`-Aufruf
  samt Kommentar in `:341-345` aus Paket 7 (`8ad81f2`). Keine der beiden berührt einen der drei Befunde.
  `packages/shadow-objects/src/view/ComponentContext.ts` ist über den ganzen Lauf unangetastet. Die Zeilennummern
  des Audits sind verrutscht (das Audit ist fünf Tage alt), die Sachverhalte nicht:
  - `KERN-GET-001` — **unverändert**. `getEntity()` wirft (`Kernel.ts:109-111` über `#requireEntry()`, `:113-125`),
    `dispatchEventsToEntity()` schreibt weiterhin `this.getEntity(uuid)?.dispatchViewEvents(events)` (`:371-373`),
    `changeProperties()` ruft ungeprüft (`:375-378`), `changeToken()` prüft mit einem eigenen `#entities.get()`
    (`:380-388`). Gemessen in Zug 0 an einem Change Trail aus zwei Einträgen — ein `SendEvents` auf eine
    unbekannte uuid, dahinter ein `CreateEntities`: `run()` wirft `entity with uuid "gone" not found!`, und die
    Entity dahinter entsteht nicht (`kernel.hasEntity('late') === false`). Der Befund ist damit größer, als das
    Audit ihn beschreibt: ein einzelnes verirrtes Ereignis verwirft den Rest des Change Trails.
  - `KERN-BFS-001` — **unverändert**. `traverseLevelOrderBFS()` gibt in `:166` `#allEntities` bzw.
    `#allEntitiesReversed` direkt heraus, `destroy()` dreht das Ergebnis in `:899` mit `.reverse()`. Gemessen in
    Zug 0: `kernel.traverseLevelOrderBFS() === kernel.traverseLevelOrderBFS()` ist `true`, und nach einem
    `reverse()` beim Aufrufer meldet der nächste Aufruf `["b","a","r"]` statt `["r","a","b"]`.
    `docs/api-reference.md:2042` schreibt die Falle heute als Zusage aus (»The array is the Kernel's own cache,
    not a copy«), `Backlog.md:225` führt sie als `LOW-1`.
  - `TRAVERSE-CYCLE-001` — **unverändert**, und in einem Punkt schärfer als das Audit. Beide genannten
    Traversierungen rekursieren ohne Besuchsmenge (`Kernel.ts:138-152`, `ComponentContext.ts:686-700`), die dritte
    aus dem Nachtrag von Paket 7 ebenfalls (`Entity.ts:144-149`). Gemessen in Zug 0, siehe die
    Zyklus-Entscheidung unten.
- Zyklus-Entscheidung (Zug 0, 2026-08-19): **beides — verhindern und überleben, aber jedes aus einem eigenen Grund.**
  Das Audit lässt beide Wege offen; hier steht, was gemessen wurde und was daraus folgt.

  **Ein Zyklus kann entstehen, auf zwei verschiedenen Wegen, und die beiden schaden verschieden.**
  1. Über den vorgesehenen Weg: `kernel.setParent()` und der `parentUuid`-Setter von `Entity` prüfen die
     Vorfahren nicht. `k.createEntity('a'); k.createEntity('b', parent 'a'); k.setParent('a', 'b')` legt den Ring.
     Gemessen: `traverseLevelOrderBFS()` läuft **nicht** über — sie liefert `[]`. Denn jede Entity im Ring hat
     einen Elternteil, `#rootEntities` verliert damit beide, und die Traversierung startet ausschließlich an den
     Wurzeln. Der Ring fällt aus jedem Durchlauf des Kernels heraus: `upgradeEntities()` sieht ihn nicht,
     `destroy()` räumt ihn nicht ab, kein `onDestroy` eines Shadow Objects darin läuft je. Nur `entity.traverse()`
     merkt etwas — mit `RangeError: Maximum call stack size exceeded`. Eine Besuchsmenge repariert davon nichts:
     sie macht aus einem verlorenen Teilbaum keinen gefundenen. Diesen Weg **verhindern** wir.
  2. Über die tiefer liegenden Primitive: `Entity.addChild()` und `ComponentContext.addToChildren()` schreiben
     eine Kinderliste, ohne die Elternbeziehung anzufassen — `addChild()` setzt `#parentUuid` nicht, und
     `addToChildren()` nimmt das Kind nicht aus der Kinderliste seines bisherigen Elternteils (gemessen:
     nach `ctx.addToChildren(b, a)` meldet `ctx.isChildOf(a, r)` weiterhin `true`). Damit hängt dasselbe Kind an
     zwei Stellen, und der Ring ist von einer Wurzel aus erreichbar. Gemessen: beide BFS-Traversierungen sterben
     dann mit `RangeError`. Ein Vorfahren-Walk kann das prinzipiell nicht sehen, weil er den Elternzeigern folgt
     und diese beiden Primitive genau die nicht schreiben. Diesen Weg **überleben** wir.

  **Verhindert wird an der einen Stelle je Seite, die die Elternbeziehung besitzt.** Auf der View-Seite ist das
  seit Langem `ViewComponent.addChild()` (`:222-243`, wirft einen `ViewComponentError`); auf der Kernel-Seite
  fehlt das Gegenstück, und genau das meint die Alternative in der Empfehlung von `TRAVERSE-CYCLE-001`
  (»aber dann auch für den Entity-Pfad im Kernel«). Der Guard wirft, wo heute nichts wirft — eine
  Verhaltensänderung mit Changelog-Pflicht, siehe Schritt 17.

  **Überlebt wird in allen drei Traversierungen**, und die Kosten sind der Grund, warum das nicht doppelt gemoppelt
  ist: beide BFS-Traversierungen sind gecacht (`#allEntitiesNeedUpdate` bzw. `#viewInstances`), die Besuchsmenge
  entsteht also einmal je Strukturänderung, nicht je Aufruf. `Entity.traverse()` ist die einzige ungecachte —
  sie bekommt die Menge trotzdem, weil sie als einzige auf `EntityApi` steht (`types.ts:98`), in
  `docs/api-reference.md:427-441` als Broadcast-Werkzeug dokumentiert ist und damit von einem Shadow Object über
  eine Struktur gefahren wird, die es nicht selbst gebaut hat.

  Keine der drei Traversierungen meldet den übersprungenen Knoten. Die laute Stelle ist der Guard; eine
  Traversierung, die im Vorbeigehen warnt, würde bei jeder Strukturänderung erneut warnen und den einen Ort
  verwässern, an dem der Fehler seinen Namen bekommt.
- Triage der vier zugeschlagenen Nebenbefunde (Zug 0, 2026-08-19) — jeder mit Symptom, Herkunft und Verbleib:
  - `in-the-dark/Kernel.ts:893-901` (`destroy()`, aus Paket 4) — **vorbestehend**. Der Block steht zeichengleich
    in `git show d6e91f5:packages/shadow-objects/src/in-the-dark/Kernel.ts` (`:889-897`), der Diff der ganzen
    Datei über den Lauf berührt ihn nicht. Symptom, in Zug 0 an drei Wurzel-Entities gemessen, deren mittlere
    in der Abbaufolge wirft: der Durchlauf endet dort, die Entity dahinter behält ihr `onDestroy`, die Exception
    verlässt `destroy()`, und `findOrCreateRootContext()` liefert einem Callback, der noch läuft, einen frisch
    angelegten leeren Pfad statt des Pfades, den der Kernel hielt (`=== ctxBefore` ist `false`). Bleibt hier;
    er trifft mit `:899` dieselbe Zeile wie `KERN-BFS-001`. → Schritt 14
  - `in-the-dark/Kernel.ts:357` (`reSubscribeToParentContexts()`, aus Paket 7) — **vorbestehend**, der Aufruf
    steht zeichengleich in `d6e91f5` (`:353`). Symptom in Zug 0 nachgemessen: ein `useParentContext()`-Leser mit
    `createEffect(fn, [ctx])` sieht beim Umhängen von `a` nach `b` die Folge `["from-a","from-b","from-b"]` und
    beim Heraufziehen zur Wurzel zwei `undefined` statt einem. Die Entscheidung, die der Nachtrag verlangt, steht
    in Schritt 15: der Aufruf geht, die Methode bleibt. → Schritt 15
  - `in-the-dark/Entity.ts:144-149` (`traverse()`, aus Paket 7) — **vorbestehend**, die Methode ist zeichengleich
    mit `d6e91f5` (`:142-147`) und kommt im Diff der Datei über den Lauf nicht vor. → Schritt 12
  - `view/ComponentContext.ts` als Bereich (aus dem Grobplan) — geprüft: **dieselbe Ursache, andere Exposition.**
    Die Traversierung (`:686-700`) rekursiert wie die des Kernels ohne Besuchsmenge, obwohl `#removeSubTree()`
    (`:274-284`) drei Bildschirmzeilen darüber genau die Menge führt, die hier fehlt. Verhindert wird auf dieser
    Seite bereits (`ViewComponent.addChild()`), offen ist nur das Überleben. → Schritt 13
- Neue Nebenbefunde aus Zug 0 (2026-08-19):
  - `view/ComponentContext.ts:252-261` — `addToChildren()` hängt das Kind an den neuen Elternteil, nimmt es aber
    nicht aus der Kinderliste des bisherigen; gemessen meldet `isChildOf(a, r)` danach weiterhin `true`, und die
    Traversierung sieht dasselbe Kind zweimal. **Vorbestehend** (`git show d6e91f5:…/ComponentContext.ts` trägt
    die Methode zeichengleich; die Datei ist über den ganzen Lauf unverändert). Kein Defekt, sondern die Grenze
    eines tiefer liegenden Primitivs — `docs/api-reference.md:965` beschreibt die Methode, sagt diese Grenze aber
    nicht. Bleibt hier, weil die Besuchsmenge aus Schritt 13 die Folge dieser Grenze auffängt und die Doku-Zeile
    im selben Zug entsteht. → Schritt 13 und Schritt 16
  - `in-the-dark/Kernel.ts:360-374` (`destroyEntity()`) — die Kaskade über die Kinder mit
    `autoDestructionOnParentRemoval` rekursiert ebenfalls ohne Besuchsmenge. Geprüft und **ohne Maßnahme**: die
    Kaskade hängt an der `once(parent, onDestroy)`-Subscription aus `Entity.#updateAutoDestructionSubscription()`,
    also an der Elternbeziehung. Über den Weg, der die Elternbeziehung schreibt, verhindert Schritt 11 den Ring;
    über die Kinderlisten-Primitive entsteht keine solche Subscription. Steht hier, damit es niemand ein zweites
    Mal aufrollt.
- Dateien:
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts`
  - `packages/shadow-objects/src/in-the-dark/Entity.ts`
  - `packages/shadow-objects/src/view/ComponentContext.ts`
  - `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`
  - `packages/shadow-objects/src/in-the-dark/Entity.spec.ts`
  - `packages/shadow-objects/src/view/ComponentContext.spec.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/docs/cheat-sheet.md`
  - `packages/shadow-objects/CHANGELOG.md`
  - `Backlog.md`
- Vorgehen:
  1. **Die Fälle zuerst, und die roten müssen rot sein.** 21 neue Fälle in drei bestehenden Spec-Dateien, 19 davon
     rot. Stil ist in allen dreien der der Datei, in die sie gehen; für die beiden `in-the-dark/`-Dateien heißt das
     die Vorgabe aus Paket 7: benannte Importe aus `vitest`, `describe`-Gruppen nach Verhaltensbereichen, `it`-Namen
     als englische Aussagesätze in der dritten Person Singular (»refuses …«, nicht »should refuse …«), Kommentare
     erklären das *Warum*. Keine Finding-Kürzel, in keiner Form. `Kernel.spec.ts` benennt seine älteren Gruppen mit
     `KERN-n` — das ist die dauerhafte Zählung von `Backlog.md`, keine Audit-Nummer; die neuen Gruppen übernehmen
     sie nicht, weil sie ohne Backlog-Eintrag keinen Sinn ergäbe.

     `Entity.spec.ts` bringt `makeKernel()` und `nextMicrotask()` bereits mit, `Kernel.spec.ts` legt seine Kernel
     je Fall selbst an (`new Kernel(new Registry())`) und räumt mit `kernel.destroy()` ab.

  2. **`Kernel.spec.ts`, neue Gruppe `describe('entity lookup and the change trail', …)` — fünf Fälle.**
     - 2.1 **rot** — `findEntity() answers with the entity behind a uuid it holds`. Eine Entity anlegen,
       `expect(kernel.findEntity(uuid)).toBe(kernel.getEntity(uuid))`. Rot, weil es die Methode nicht gibt
       (`TypeError: kernel.findEntity is not a function`, im Typecheck ein Fehler).
     - 2.2 **rot** — `findEntity() answers undefined for a uuid it does not hold`.
       `expect(kernel.findEntity(generateUUID())).toBeUndefined()`.
     - 2.3 grün — `getEntity() and changeProperties() throw for a uuid the kernel does not hold`. Beide
       Erwartungen in einem Fall, weil sie denselben Vertrag festhalten: `expect(() => kernel.getEntity(uuid))
       .toThrow(/not found/)` und dasselbe für `kernel.changeProperties(uuid, [['a', 1]])`. Dieser Fall ist die
       Sicherung dafür, dass Schritt 9 den Vertrag *ergänzt* und nicht aufweicht.
     - 2.4 **rot** — `dispatchEventsToEntity() ignores events for an entity the kernel does not hold`.
       `expect(() => kernel.dispatchEventsToEntity(generateUUID(), [{type: 'ping', data: 1}])).not.toThrow()`.
     - 2.5 **rot** — `run() applies the entries behind a send-events entry for an entity that is gone`. Ein
       `changeTrail` aus zwei Einträgen: `{type: ComponentChangeType.SendEvents, uuid: <unbekannt>, events: […]}`,
       dahinter `{type: ComponentChangeType.CreateEntities, uuid: lateUuid, token: 'late'}`. Erwartung:
       `expect(() => kernel.run({changeTrail})).not.toThrow()` und `expect(kernel.hasEntity(lateUuid)).toBe(true)`.
       Heute wirft der erste Eintrag, und die Entity dahinter entsteht nicht — der Fall hält den eigentlichen
       Schaden fest, nicht nur die Exception.

  3. **`Kernel.spec.ts`, neue Gruppe `describe('traverseLevelOrderBFS', …)` — vier Fälle.** Aufbau in allen vieren:
     eine Wurzel `r`, darunter `a`, darunter `b`, angelegt über `kernel.createEntity(uuid, token, parentUuid)`.
     - 3.1 **rot** — `hands out a fresh array on every call`.
       `expect(kernel.traverseLevelOrderBFS()).not.toBe(kernel.traverseLevelOrderBFS())`.
     - 3.2 **rot** — `keeps its own order when a caller reverses the array it got`. Erst die Folge merken, dann
       `kernel.traverseLevelOrderBFS().reverse()`, dann erneut lesen. Erwartung: dieselbe Folge wie zuerst. Heute
       `["b","a","r"]` statt `["r","a","b"]`.
     - 3.3 **rot** — `upgrades the entities from the root down after a caller reversed an earlier result`. Der
       Schaden, den 3.2 nur andeutet: ein Shadow Object mit `[onCreate]` registrieren, das seine uuid in ein
       Array schreibt; `kernel.traverseLevelOrderBFS().reverse()`; `registry` um einen zweiten Konstruktor für
       denselben Token erweitern und `kernel.upgradeEntities()` rufen. Erwartung: die aufgezeichnete Folge beginnt
       mit `r`. Heute läuft der Erzeugungslauf über das gedrehte Cache-Array und beginnt bei `b` — ein Shadow
       Object entsteht auf dem Kind, bevor es auf dem Elternteil entstanden ist. Zwischen `reverse()` und
       `upgradeEntities()` darf keine Strukturänderung liegen, sonst wird der Cache neu gebaut und der Fall grün
       aus dem falschen Grund; ein Kommentar sagt das.
     - 3.4 **rot** — `terminates when a children list points back at an ancestor`. Den Ring über das tiefer
       liegende Primitiv legen: `kernel.getEntity(bUuid).addChild(kernel.getEntity(aUuid))` — das schreibt die
       Kinderliste, ohne die Elternbeziehung anzufassen, und ist damit der Weg, den der Guard aus Schritt 11
       prinzipiell nicht sehen kann. Erwartung: `expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid))
       .toEqual([rUuid, aUuid, bUuid])`. Heute `RangeError: Maximum call stack size exceeded`. Der Kommentar
       nennt den Grund: keine Prüfung kann eine Kinderliste absichern, die niemand über die Elternbeziehung
       geschrieben hat.

  4. **`Kernel.spec.ts`, neue Gruppe `describe('kernel teardown', …)` — drei Fälle.** Aufbau: drei Wurzel-Entities
     `a`, `b`, `c` in dieser Reihenfolge; die Abbaufolge ist die umgekehrte, `c` also zuerst. Auf `b` hängt ein
     `on(entity, onDestroy, …)`, der wirft.
     - 4.1 **rot** — `runs the destroy callbacks behind one that throws`. Jeder der drei Callbacks schreibt seine
       uuid in ein Array. Erwartung: alle drei stehen darin, und `expect(() => kernel.destroy()).not.toThrow()`.
       Heute fehlt `a` in der Aufzeichnung — der Durchlauf endet bei `b` —, und die Exception verlässt `destroy()`.
     - 4.2 **rot** — `holds no entity any more when a destroy callback throws`. Nach `kernel.destroy()` meldet
       `hasEntity()` für alle drei uuids `false`. Heute bleibt die werfende Entity im Kernel stehen, weil
       `destroyEntity()` an der `emit`-Zeile abbricht, bevor sie ihre Einträge löscht.
     - 4.3 **rot** — `hands a destroy callback the root contexts it still holds`. Eigener Aufbau, ohne werfenden
       Callback: eine einzelne Entity, vor dem Abbau `const rootCtx = kernel.findOrCreateRootContext('ctx')`
       merken, und ihr `onDestroy` vergleicht `kernel.findOrCreateRootContext('ctx')` mit dieser Referenz und
       schreibt das Ergebnis in eine Variable. Erwartung `true`. Heute `false` — die Pfade sind entsorgt und die
       Registry geleert, bevor der erste Callback läuft, ein Aufruf legt also einen neuen leeren Pfad an. Der
       Fall steht bewusst ohne den werfenden Callback aus 4.1: sonst hinge seine Aussage daran, ob der Callback
       überhaupt noch an die Reihe kommt.

  5. **`Kernel.spec.ts`, neue Gruppe `describe('cycles in the entity tree', …)` — zwei Fälle.** Die Kernel-Seite
     des Guards; die Entity-Seite steht in Schritt 7.
     - 5.1 **rot** — `refuses a setParent() that would put an entity below its own descendant`. Kette `a → b → c`,
       dann `expect(() => kernel.setParent(aUuid, cUuid)).toThrow()`.
     - 5.2 **rot** — `leaves the entity where it was when it refuses the new parent`. Derselbe Aufbau, `c` bekommt
       vorher `order = 3`. Nach dem gefangenen Wurf: `a` ist weiterhin Wurzel (`parentUuid === undefined`), `b`
       hängt an `a`, `c` an `b`, `c.order` ist 3, und `traverseLevelOrderBFS()` liefert `[a, b, c]`. Dieser Fall ist
       die Sicherung für die Reihenfolge in Schritt 11: `Kernel.setParent()` löst die Entity von ihrem Elternteil,
       *bevor* es die neue Beziehung setzt — ein Guard, der erst danach zuschlägt, ließe eine verwaiste Entity
       zurück. Genau derselbe Grund, aus dem `setParent()` die unbekannte uuid schon vor dem Ablösen prüft.

  6. **`Kernel.spec.ts`, ein Fall in der bestehenden Gruppe `describe('useParentContext', …)` (`:484`).**
     - 6.1 **rot** — `notifies its reader once when the kernel moves the entity to another parent`. Drei Entities:
       `a` und `b` mit je einem Shadow Object, das `provideContext('ctx', 'from-a')` bzw. `'from-b'` setzt, und `c`
       mit einem Leser, der `useParentContext('ctx')` hält. Der Leser zeichnet über die Effekt-Funktion der
       Creation API mit **expliziter Abhängigkeit** auf: `createEffect(() => { seen.push(value(ctx)); }, [ctx])`.
       Die explizite Abhängigkeit ist Pflicht — in Zug 0 gemessen: ein Effekt ohne sie läuft genau einmal und
       sieht keine der Änderungen, der Fall wäre grün aus dem falschen Grund. `c` entsteht unter `a`; nach einem
       Microtask steht `['from-a']` in `seen`. Dann `kernel.setParent(cUuid, bUuid)`, wieder ein Microtask.
       Erwartung `expect(seen).toEqual(['from-a', 'from-b'])`. Heute steht dort `['from-a', 'from-b', 'from-b']`.

  7. **`Entity.spec.ts`, neue Gruppe `describe('cycles in the entity tree', …)` — drei Fälle**, und eine neue Gruppe
     `describe('traverse()', …)` — zwei Fälle.
     - 7.1 **rot** — `refuses the entity itself as its own parent`. `expect(() => { e.parent = e; }).toThrow()`.
       Heute trägt die Entity sich danach in die eigene Kinderliste ein.
     - 7.2 **rot** — `refuses a parent that already sits below the entity`. Kette `a → b`, dann
       `expect(() => { a.parent = b; }).toThrow()`.
     - 7.3 **rot** — `leaves the entity attached where it was when it refuses the new parent`. Nach dem gefangenen
       Wurf aus 7.2 hängt `b` weiterhin an `a`, `a` hat weiterhin genau ein Kind, und `a.parentUuid` ist
       `undefined`.
     - 7.4 grün — `visits the entity and its descendants once each`. Baum `r → a → b` plus ein zweites Kind `c`
       an `r`; `traverse()` sammelt die uuids. Erwartung ist die heutige Tiefensuche mit dem Elternteil zuerst.
       Der Fall hält die Reihenfolge fest, die Schritt 12 nicht verändern darf.
     - 7.5 **rot** — `terminates when a children list points back at an ancestor`. Ring wie in 3.4 über
       `addChild()`; `r.traverse(…)` sammelt die uuids, Erwartung `[r, a, b]` und kein `RangeError`.

  8. **`ComponentContext.spec.ts`, ein Fall in der bestehenden Gruppe `describe('tree invariants', …)` (`:603`).**
     - 8.1 **rot** — `terminates the breadth-first walk when a children list points back at an ancestor`. Mit
       `makeContext()` einen Kontext holen, `r`, `a` unter `r`, `b` unter `a` als `ViewComponent` anlegen, dann
       `ctx.addToChildren(b, a)` — das tiefer liegende Primitiv, das die Elternbeziehung nicht anfasst und `a`
       deshalb in zwei Kinderlisten stehen lässt. Erwartung:
       `expect(ctx.traverseLevelOrderBFS().map((c) => c.uuid)).toEqual(['r', 'a', 'b'])`. Heute `RangeError`. Das
       `afterEach` der Datei (`ctx.clear()`) übersteht die Schleife — in Zug 0 geprüft, weil `#removeSubTree()`
       seine eigene Besuchsmenge führt.
  9. **Der Lookup-Vertrag.** In `Kernel.ts` direkt unter `getEntity()` (`:109-111`) die additive Zweitmethode:

     ```ts
     /**
      * The entity behind a uuid, or `undefined` when the kernel does not hold one.
      *
      * The counterpart to `getEntity()`, which throws. Which of the two a caller wants follows from what an
      * absent entity means to it: a change that describes the entity tree -- a new parent, a new order, new
      * properties -- names an entity the view believes to be there, and a uuid the kernel does not know is a
      * disagreement the caller has to hear about. An event is the other case: it carries no structure, and the
      * entity it was meant for may have been torn down between the two sides.
      */
     findEntity(uuid: string): Entity | undefined {
       return this.#entities.get(uuid)?.entity;
     }
     ```

     Danach `dispatchEventsToEntity()` (`:371-373`) auf `this.findEntity(uuid)?.dispatchViewEvents(events)`
     umstellen — womit das Optional Chaining, das dort seit jeher steht, zum ersten Mal etwas bedeutet.
     `changeProperties()`, `updateOrder()` und `setParent()` bleiben, wie sie sind: sie werfen weiter.
     `changeToken()` und `destroyEntity()` behalten ihren stillen Ausstieg. Keine dieser vier Zeilen wird
     angefasst; der Vertrag wird ausgeschrieben, nicht umgebaut.

  10. **Die BFS gibt eine eigene Liste heraus und überlebt eine Schleife.** In `traverseLevelOrderBFS()`
      (`Kernel.ts:135-167`) zwei Eingriffe:

      ```ts
      const lvl = new Map<number, Entity[]>();
      const visited = new Set<string>();

      const traverse = (uuid: string, depth: number) => {
        if (visited.has(uuid)) return;
        visited.add(uuid);

        const e = this.getEntity(uuid);
        …
      ```

      und in der Rückgabe (`:166`):

      ```ts
      return reverse ? this.#allEntitiesReversed.slice() : this.#allEntities.slice();
      ```

      Die Kopie entsteht **an der Quelle**, nicht beim Aufrufer: die Falle steht für jeden, der die Methode ruft,
      und die drei Aufrufer im Haus sind nicht die, um die es geht. Kosten: eine Array-Kopie je Aufruf, gegen
      einen Baumdurchlauf je Strukturänderung — die Methode wird von `upgradeEntities()` (zweimal) und vom
      Teardown gerufen, nicht pro Frame. Der Rückgabetyp bleibt `Entity[]`: eine Kopie *darf* der Aufrufer
      umsortieren, `readonly` wäre die falsche Zusage und dazu eine Typänderung, die jeden Konsumenten
      nachziehen ließe. Ein Kommentar über der Methode sagt beides in zwei Sätzen — dass die Liste dem Aufrufer
      gehört, und dass die Besuchsmenge eine Kinderliste abfängt, die kein Elternzeiger deckt.

  11. **Der Zyklus-Guard.** In `Entity.ts` eine Methode, gesetzt über `addChild()` (`:180`):

      ```ts
      /**
       * Refuses a parent that would close the entity tree into a ring: the entity itself, or an entity that
       * already sits below it. The walk follows the parent chain upwards, which is a chain exactly because this
       * guard keeps it one.
       *
       * `Kernel.setParent()` calls it before it detaches, and the `parentUuid` setter before it resolves the
       * link, so a refused attachment leaves the entity where it was instead of orphaned halfway through.
       * `ViewComponent.addChild()` guards the same thing on the view side.
       */
      assertAttachableTo(nextParent: Entity) {
        for (let e: Entity | undefined = nextParent; e != null; e = e.parent) {
          if (e === this) {
            throw new Error(
              `entity "${nextParent.uuid}" cannot become the parent of "${this.uuid}": it is the entity itself or one of its descendants`,
            );
          }
        }
      }
      ```

      Zwei Aufrufstellen, beide **vor** der ersten Mutation:
      - `Entity`, `parentUuid`-Setter (`:97-113`), unmittelbar hinter der Auflösung von `nextParent` und vor
        `this.#detachFromParent(…)`: `if (nextParent != null) { this.assertAttachableTo(nextParent); }`.
      - `Kernel.setParent()` (`:329-364`), hinter der bestehenden Prüfung auf die unbekannte uuid (`:336-339`)
        und vor `e.removeFromParent(…)` (`:345`):
        `if (parentUuid) { e.assertAttachableTo(this.getEntity(parentUuid)); }`.

      Der Walk benutzt den `parent`-Getter, nicht das private Feld: der Getter löst eine noch nicht aufgelöste
      Elternbeziehung über den Kernel auf, das Feld kann leer sein, während `#parentUuid` steht. In Zug 0 an einer
      Kette `a → b → c` gemessen: `setParent(a, c)` und `a.parent = a` werfen, der Baum steht danach unverändert
      (Elternzeiger, `order`, Kinderlisten, BFS-Folge), und ein zulässiges Umhängen läuft weiter durch.

  12. **`Entity.traverse()` überlebt eine Schleife.** Die öffentliche Signatur bleibt, die Rekursion wandert in
      eine private Methode (`Entity.ts:144-149`):

      ```ts
      traverse(callback: (entity: Entity) => void) {
        this.#traverse(callback, new Set());
      }

      // The visited set guards the one traversal an outside shadow object drives, over a tree it did not build.
      // `addChild()` writes a children list without touching the parent link, so no ancestor check can cover it.
      #traverse(callback: (entity: Entity) => void, visited: Set<Entity>) {
        if (visited.has(this)) return;
        visited.add(this);
        callback(this);
        for (const child of this.#children) {
          child.#traverse(callback, visited);
        }
      }
      ```

      Kein zweiter Parameter an der öffentlichen Methode: `EntityApi.traverse()` (`types.ts:98`) führt genau einen,
      und eine optionale Besuchsmenge in der Signatur wäre ein Implementierungsdetail in der `.d.ts`. Die
      Deklaration bekommt dadurch eine `private`-Zeile mehr, so wie bei `#insertChildInOrder` in Paket 7.

  13. **`ComponentContext` überlebt eine Schleife.** In `#traverseLevelOrderBFS()` (`view/ComponentContext.ts:681-710`)
      dieselbe Bewegung, im Stil des Nachbarn `#removeSubTree()` (`:274-284`), der die Menge über `Set<string>`
      führt:

      ```ts
      const visited = new Set<string>();

      const traverse = (uuid: string, depth: number) => {
        if (visited.has(uuid)) return;
        visited.add(uuid);

        const viewInstance = this.#components.get(uuid);
        if (viewInstance == null) return;
        …
      ```

      Der Kommentar nennt die Ursache, die `#removeSubTree()` schon kennt, und die Stelle, an der sie entsteht:
      `addToChildren()` schreibt eine Kinderliste, ohne das Kind aus der bisherigen zu nehmen. Kein Guard in
      `addToChildren()` — dort steht dieselbe Grenze wie bei `Entity.addChild()`, und `ViewComponent.addChild()`
      hält die Seite, auf der die Elternbeziehung entsteht, bereits zyklusfrei. Was fehlt, ist ein Satz in der
      Doku, siehe Schritt 16.

  14. **Der Teardown des Kernels.** `Kernel.destroy()` (`:893-901`) in dieser Form:

      ```ts
      destroy(): void {
        // Leaves first, and to the end: a callback that throws costs its own entity, not the ones behind it in
        // the sweep. The reversed order is already cached, so the walk does not turn its own result around.
        for (const entity of this.traverseLevelOrderBFS(true)) {
          try {
            this.destroyEntity(entity.uuid);
          } catch (error) {
            this.logger.error('entity teardown failed:', entity.uuid, error);
          }
        }

        // Whatever a failing callback left half torn down, the kernel holds none of it afterwards.
        this.#entities.clear();
        this.#rootEntities.clear();
        this.#allEntitiesNeedUpdate = true;

        // After the entities, not before: a shadow-object callback that reads a global context during its
        // teardown reaches the path the kernel held, not a fresh empty one.
        for (const ctx of this.#rootContexts.values()) {
          ctx.dispose();
        }
        this.#rootContexts.clear();
      }
      ```

      Drei Bewegungen in einer: `traverseLevelOrderBFS(true)` statt `.reverse()` (die umgekehrte Folge liegt
      vor, und nach Schritt 10 würde das `.reverse()` nur noch eine frische Kopie drehen: richtig, aber eine
      Umkehrung, die der Kernel längst gecacht hat), das `try`/`catch` je Entity, und das
      Aufräumen der Buchführung hinter dem Durchlauf. Das abschließende `clear()` gehört dazu, weil
      `destroyEntity()` an der `emit`-Zeile abbricht, bevor sie ihre Einträge löscht: ohne es meldet
      `hasEntity()` nach dem Abbau eine Entity, die niemand mehr erreichen kann. Der Grenzfall bleibt, dass die
      Signale und Kontexte genau dieser einen Entity nicht abgeräumt sind — das ist der Preis eines Callbacks,
      der wirft, und er steht im Log mit uuid.

  15. **Die dritte Bindung.** In `Kernel.setParent()` die Zeile `e.reSubscribeToParentContexts();` (`:357`)
      streichen. Sie ist nach Paket 7 auf beiden Wegen doppelt: hängt die Entity an einen Elternteil, bindet
      `addChild()` jeden Kontext (`Entity.ts:189-192`); zieht sie zur Wurzel, bindet `#detachFromParent(true)`
      (`:250-256`). In Zug 0 an einem gepatchten Build gemessen: ohne die Zeile meldet ein
      `useParentContext()`-Leser `["from-a","from-b"]` statt `["from-a","from-b","from-b"]` und ein einzelnes
      `undefined` statt zweier, bei unverändert richtigen Endwerten.

      **Die Methode `Entity.reSubscribeToParentContexts()` bleibt stehen** — das ist die Entscheidung, die der
      Nachtrag verlangt. Sie ist kein toter Code, sondern die dokumentierte Notluke für einen Aufrufer, der die
      Position auf anderem Weg verändert hat; ihr eigener Kommentar (`Entity.ts:294-299`) sagt genau das. Sie zu
      entfernen wäre eine Streichung an einer Klasse, die über `kernel.getEntity()` erreichbar ist, ohne
      Gegenwert außer Aufgeräumtheit. Der Kommentar bekommt einen Satz dazu: dass das Umhängen über den Kernel
      sie nicht braucht, weil beide Richtungen ihre Bindung selbst mitbringen.

  16. **Doku.** `packages/shadow-objects/docs/api-reference.md`:
      - `#### getEntity(uuid)` (`:2017-2025`) — der Absatz bleibt, bekommt aber den Vertrag als Satz: eine
        Änderung, die den Entity-Baum beschreibt, wirft bei unbekannter uuid; ein Ereignis läuft ins Leere.
      - Neu `#### findEntity(uuid)` unmittelbar darunter, vor `#### hasEntity(uuid)`: Signatur
        `findEntity(uuid: string): Entity | undefined`, ein Beispiel, ein Satz zur Abgrenzung von `hasEntity()`
        (ein Lookup statt zweier).
      - `#### traverseLevelOrderBFS(reverse?)` (`:2040-2049`) — der Satz »The array is the Kernel's own cache,
        not a copy…« fällt und wird durch die neue Zusage ersetzt: eine frische Liste je Aufruf, die dem Aufrufer
        gehört. Die Formulierung »A fresh array each call« steht bei `getChildren()` (`:961`) bereits so.
      - `#### entity.traverse(callback)` (`:427-441`) — ein Satz: jede Entity wird genau einmal besucht.
      - Die Methodentabelle von `ComponentContext` (`:965`) — die Zeile zu `addToChildren(parent, child)` bekommt
        die Grenze dazu: sie hängt das Kind an, nimmt es aber nicht aus der Kinderliste eines Elternteils, den es
        schon hat; das ist Sache von `ViewComponent.addChild()`, das dafür auch gegen Ringe prüft.
      - Der Absatz zum Worker-Teardown (`:1352`) — der Satz »A callback that throws ends the sweep where it
        stands, so the entities behind it in the order are not torn down« beschreibt danach das Gegenteil: der
        Durchlauf geht weiter, der Fehler steht im Log, die Bestätigung geht wie bisher hinaus.
      - Der Entity-Baum bekommt die neue Grenze, an beiden Stellen, an denen er beschrieben wird: bei
        `entity.parent` (`:1343`) und bei `setParent` in der Kernel-Tabelle (`:2093`) — ein Elternteil, der die
        Entity selbst oder einer ihrer Nachfahren ist, wird abgewiesen; die Entity bleibt dabei, wo sie war.

      `packages/shadow-objects/docs/cheat-sheet.md`: die Zeile zu `entity.traverse(cb)` (`:320`) bleibt, die
      Tabelle darüber bekommt keine neue Zeile. Ein Eintrag zum abgewiesenen Ring gehört dorthin, wo die
      View-Seite ihren schon hat (`:345`) — eine Zeile im Entity-Abschnitt, im selben Ton.

      `packages/shadow-objects/README.md`: geprüft, keine Stelle betroffen — die Datei nennt weder `getEntity()`
      noch eine der Traversierungen.

  17. **CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, Abschnitt `## [Unreleased]`:
      - Der gezählte Kopf geht von **26 auf 28**, Zahl und Aufzählung im Gleichschritt. Die Zahl steht dort als
        Wort: aus »Twenty-six changes reach existing consumers« wird »Twenty-eight«. Zwei neue Glieder, beide
        in der Sprache des Kopfes (was ein Konsument sieht, ohne Rückblick auf den Vorzustand als Erklärung):
        ein Elternteil, der die Entity selbst oder einen ihrer Nachfahren benennt, wird mit einem Fehler
        abgewiesen, wo ein solcher Aufruf den Baum bisher zu einem Ring schloss; und `traverseLevelOrderBFS()`
        gibt eine frische Liste heraus, ein Sortieren oder Drehen des Ergebnisses ändert nichts mehr an dem,
        was der nächste Aufruf liefert.
      - Der Halbsatz »and a callback that throws ends the sweep« im bestehenden Glied zum `onDestroy` der Shadow
        Objects wird nachgezogen: der Durchlauf endet nicht mehr dort. Das Glied ist bereits gezählt, die Zahl
        rührt sich davon nicht.
      - In der Aufzählung darunter, ohne Kopf-Zählung: `findEntity()` als additive Methode; ein Ereignis an eine
        Entity, die der Kernel nicht hält, verwirft nicht mehr den Rest des Change Trails; der Abbau des Kernels
        läuft über alle Entities und hält die Root-Contexts, solange er läuft; die drei Traversierungen über die
        Kinderlisten laufen auch dann zu Ende, wenn eine Kinderliste zurückzeigt; ein Umhängen benachrichtigt die
        `useParentContext()`-Leser der Entity einmal.
      - Wurzel-`CHANGELOG.md`: nichts. Das Paket berührt weder Build noch Werkzeug.

  18. **Backlog.** `Backlog.md`:
      - `LOW-1` (`:225`) beschreibt `KERN-BFS-001` und wird durchgestrichen und abgehakt, im Stil der
        `KERN-n`-Einträge.
      - Drei neue Einträge in der Tabelle 3.3, in der Zählung, die die Datei führt — `KERN-11` für den
        Lookup-Vertrag, `KERN-12` für den abgewiesenen Ring samt der drei Traversierungen, `KERN-13` für den
        Teardown, der bis zum Ende läuft. Alle drei gleich als erledigt eingetragen, so wie Paket 7 es mit
        `KERN-9` und `KERN-10` gehalten hat.
      - Der Rückblick auf den Vorzustand ist hier und im CHANGELOG erlaubt (siehe »Entscheidungen«), in Code,
        Kommentaren, `docs/` und `README.md` nicht.
- Verify:
  1. **Rot zuerst.** Nach den Schritten 1-8, vor Schritt 9:
     `cd packages/shadow-objects && pnpm exec vitest src/in-the-dark/Kernel.spec.ts src/in-the-dark/Entity.spec.ts src/view/ComponentContext.spec.ts --run`.
     Erwartet fallen genau die 19 als **rot** ausgewiesenen Fälle, und kein bestehender. Die beiden grünen neuen
     (2.3 und 7.4) sind Teil des Nachweises, nicht Beiwerk: sie halten den Vertrag von `getEntity()` und die
     Besuchsreihenfolge von `traverse()` fest, die diese Änderung nicht anfassen darf. Die Ausgabe gehört in den
     Bericht des Implementierers. Drei Fälle täuschen leicht: 3.4, 7.5 und 8.1 sind heute ein
     `RangeError: Maximum call stack size exceeded` — wer nur auf »rot« schaut, verwechselt das mit einer
     fehlgeschlagenen Erwartung; der Bericht nennt die Fehlerart je Fall.
  2. **Grün danach.** Dasselbe Kommando nach Schritt 15: alle drei Dateien grün.
  3. Von der Wurzel `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`. Die Gesamtzahl steigt von
     809 auf 830.
  4. `pnpm -F shadow-objects-e2e test` — 402 Fälle in Chromium und Firefox. Der Change-Trail-Pfad und der
     Worker-Teardown laufen dort gegen einen echten Worker; Schritt 9 und Schritt 14 sitzen genau darin.
  5. Auslieferung: `find packages/shadow-objects/dist -type f | sort` vor und nach dem Build ergibt dieselben
     198 Dateien, `dist/package.json` bleibt gleich. Erwartete Änderungen in den `.d.ts`: `Kernel.d.ts` bekommt
     `findEntity(uuid: string): Entity | undefined`, `Entity.d.ts` bekommt `assertAttachableTo(nextParent: Entity): void`
     und eine `private`-Zeile für `#traverse`.
- Commit: `fix(kernel): a lookup that may come up empty, a traversal that hands out its own list, and an entity tree that stays a tree`
- Ergebnis: 1 Nachbesserungsrunde · alle drei Findings behoben, dazu vier geerbte Nebenbefunde aus den
  Paketen 4, 6 und 7 · 22 neue Fälle, Gesamtzahl 809 → 831 · Auslieferung unverändert (198 Dateien,
  `dist/package.json` gleich); die `.d.ts` bekommen `Kernel.findEntity()` und `Entity.assertAttachableTo()`
  · E2E 402 in beiden Browsern
- Die Entscheidung, die das Paket trägt: Zyklusschutz **verhindern und überleben**, aus zwei verschiedenen
  Gründen. Ein Ring über die Elternbeziehung lässt die Breitensuche nicht überlaufen — sie setzt nur an
  `#rootEntities` an, beide Ring-Mitglieder verlieren dort ihren Platz, das Ergebnis ist `[]`, und die
  Entities fallen still aus jedem Kernel-Durchlauf (kein `upgradeEntities`, kein `destroy`, kein
  `onDestroy`). Keine Besuchsmenge macht aus einem nicht gesäten Teilbaum einen besuchten, also wird dort
  verhindert. Ein Ring über die tieferen Primitive (`Entity.addChild()`, `ComponentContext.addToChildren()`)
  schreibt Kinderlisten ohne Elternzeiger, ist für keinen Vorfahren-Walk sichtbar und tötet die
  Traversierungen mit `RangeError`, also wird dort überlebt. Beide Aussagen an gepatchten Builds gemessen.
- Der Fund der Runde: es gibt **vier** Traversierungen über die Kinderlisten, nicht drei.
  `Kernel.getEntityGraphNode()` war weder im Audit noch im Detailplan gezählt und starb weiterhin mit
  `RangeError` — ausgerechnet das Debug-Werkzeug, das man beim Zerlegen eines kaputten Baums aufruft.
  Gemessen am selben Ring, den die neue Spec aufbaut.
- Nebenbefunde: `in-the-dark/Kernel.ts:195-217` — `getEntityGraph()` terminiert jetzt, verschweigt aber die
  Rückkante: ein Ring liefert `b.children === []`, ein Diamant einen kinderlosen Zweig, beides von einem
  gesunden Baum nicht zu unterscheiden. Die Grenze ist in `docs/api-reference.md:2065` und im Changelog
  ausgeschrieben; ein Knoten, der die verschluckte Kante meldet, wäre eine Erweiterung von
  `EntityGraphNode` und damit eine eigene Entscheidung → nächstes Audit · `in-the-dark/Kernel.ts:359` und
  `Kernel.spec.ts:1434,1510,1544,1593,1615,1657,1691`, `Registry.spec.ts:59` — `(KERN-n)`-Marken im
  Quelltext. `Backlog.md` ist ein lebendes Dokument, aus dem erledigte Einträge verschwinden; die Nummer
  ist damit kein dauerhafter Tracker, und der Kommentar wird unlesbar, sobald der Eintrag geht
  (vorbestehend) → nächstes Audit · `in-the-dark/Kernel.ts:176` — `#rootEntities` wird nur von
  `createEntity()`, `destroyEntity()` und `setParent()` gepflegt; eine über den `entity.parent`-Setter
  angehängte Entity bleibt darin stehen und stand vor diesem Paket zweimal in der BFS-Liste, jetzt einmal
  (vorbestehend) → nächstes Audit · `in-the-dark/Kernel.ts:918-940` — ein Ring über die tieferen Primitive
  ist von keiner Wurzel erreichbar; das abschließende Leeren der Buchführung entsorgt solche Entities ohne
  ihr `onDestroy`. Kein Rückschritt (vorher blieben sie unendlich stehen), aber eine Grenze des Guards
- Folgen: keine
- Schnittstellen: `Kernel.findEntity(uuid): Entity | undefined` ist neu und additiv; `getEntity()` wirft
  unverändert. `dispatchEventsToEntity()` verwirft Ereignisse an eine entfernte Entity, statt den Change
  Trail abzubrechen, in dem sie ankamen. `traverseLevelOrderBFS()` gibt eine Kopie heraus — wer sortiert
  oder dreht, lässt die Ordnung des Kernels intakt. `Entity.assertAttachableTo(nextParent)` ist neu und
  wirft, wenn der künftige Elternteil die Entity selbst oder einer ihrer Nachfahren ist; beide Schreibwege
  rufen sie vor der ersten Mutation. `Entity.reSubscribeToParentContexts()` hat keinen Aufrufer mehr im
  Repo und bleibt als dokumentierte Notluke stehen. Ein werfendes `onDestroy` beendet den Teardown nicht
  mehr; die Callbacks dahinter laufen, sehen die Root-Contexts, und der Kernel hält danach keine Entity.

**KERN-GET-001 · getEntity() wirft, wird aber wie eine nullable Lookup-Funktion benutzt · low · packages/shadow-objects/src/in-the-dark/Kernel.ts:93-99, 330**
getEntity() wirft bei unbekannter uuid. dispatchEventsToEntity() schreibt trotzdem 'this.getEntity(uuid)?.dispatchViewEvents(events)' — das Optional Chaining kann nie greifen, und ein Event an eine bereits entfernte Entity wird zur Exception statt zum No-op. changeProperties() daneben ruft getEntity() ohne Absicherung, changeToken() prüft dagegen vorab mit has(). Drei Aufrufer, drei Auffassungen davon, was der Vertrag ist.
Empfehlung: Den Vertrag festlegen und durchziehen: entweder getEntity() wirft und alle Aufrufer prüfen vorher mit hasEntity(), oder es kommt eine zweite Methode findEntity() dazu, die undefined liefert und für Ereignispfade verwendet wird.
*Fundstelle heute: `Kernel.ts:109-111` (`getEntity()`), `:113-125` (`#requireEntry()`), `:371-373` (`dispatchEventsToEntity()`), `:375-378` (`changeProperties()`), `:380-388` (`changeToken()`). Gewählt ist Weg B aus der Empfehlung, festgelegt im Abschnitt »Entscheidungen«. Der Schaden ist größer, als das Finding ihn beschreibt: `run()` (`:208-217`) parst den Change Trail in einer Schleife ohne Absicherung je Eintrag, ein geworfener Lookup verwirft also auch die Einträge dahinter. In Zug 0 an einem Trail aus `SendEvents` (unbekannte uuid) plus `CreateEntities` gemessen: die zweite Entity entsteht nicht.*

**KERN-BFS-001 · traverseLevelOrderBFS() gibt sein internes Cache-Array heraus · low · packages/shadow-objects/src/in-the-dark/Kernel.ts:108-139, 836**
Die Methode liefert direkt #allEntities bzw. #allEntitiesReversed zurück. Jede Mutation durch einen Aufrufer trifft den Cache. Kernel.destroy() tut genau das: traverseLevelOrderBFS().reverse() dreht das gecachte Array in place. Nachgewiesen: nach einem reverse() beim Aufrufer liefert der nächste Aufruf die umgekehrte Reihenfolge. Aktuell folgenlos, weil destroy() terminal ist und die Invalidierung ohnehin greift — als öffentliche Methode ist die Aliasing-Falle trotzdem gestellt.
Empfehlung: Eine Kopie zurückgeben (slice()) oder den Rückgabetyp auf readonly Entity[] setzen. In destroy() ohnehin besser traverseLevelOrderBFS(true) verwenden, statt das Ergebnis zu drehen — die umgekehrte Reihenfolge liegt bereits vor.
*Fundstelle heute: `Kernel.ts:166` (die Rückgabe), `:899` (das `.reverse()` in `destroy()`). `docs/api-reference.md:2042` schreibt das Aliasing heute als Zusage aus, `Backlog.md:225` führt es als `LOW-1`. Wer heute darauf schreiben kann: jeder Aufrufer der öffentlichen Methode, und `destroy()` tut es selbst. Der Schaden, der nicht nur theoretisch ist: `upgradeEntities()` (`:190-206`) fährt den Abbaulauf über `traverseLevelOrderBFS(true)` und den Erzeugungslauf über `traverseLevelOrderBFS(false)`; ein Aufrufer, der zwischendurch die Liste dreht, ohne die Struktur zu ändern, lässt den Erzeugungslauf bei den Blättern beginnen — ein Shadow Object entsteht auf dem Kind, bevor es auf dem Elternteil entstanden ist. Die Kopie entsteht an der Quelle, siehe Schritt 10.*

**TRAVERSE-CYCLE-001 · Beide BFS-Traversierungen laufen ohne Zyklusschutz · low · packages/shadow-objects/src/in-the-dark/Kernel.ts:112-124, packages/shadow-objects/src/view/ComponentContext.ts:517-530**
Beide Traversierungen rekursieren über die Kinderlisten ohne Besuchsmenge. Dass Zyklen als denkbar gelten, zeigt der Code an anderer Stelle selbst: ComponentContext.#removeSubTree() führt seit VIEW-15 ein visited-Set, und ViewComponent.addChild() prüft explizit gegen Vorfahren. Die Schutzmaßnahmen sind also punktuell, nicht durchgängig — ein Zyklus, der auf einem anderen Weg entsteht (etwa über die Entity-API im Kernel, die keine addChild-Prüfung kennt), führt hier zum Stack Overflow.
Empfehlung: Beide Traversierungen mit derselben visited-Menge absichern wie #removeSubTree. Alternativ die Zyklusfreiheit an genau einer Stelle je Seite erzwingen und in den Traversierungen darauf verweisen — aber dann auch für den Entity-Pfad im Kernel.

*Fundstelle heute: `Kernel.ts:138-152`, `view/ComponentContext.ts:686-700`, dazu die dritte Stelle `Entity.ts:144-149`, die das Finding nicht nennt. Gewählt werden beide Wege der Empfehlung, jeder für den Zyklus, den nur er erreicht — die Begründung steht in der Zyklus-Entscheidung oben. Die Vorlage für die Besuchsmenge ist `ComponentContext.#removeSubTree()` (`:274-284`), die Vorlage für den Guard `ViewComponent.addChild()` (`:222-243`).*
### [x] 9. FrameLoop: Leerlauf beenden und exportieren
- Findings: FRAME-LOOP-001 (medium), API-FRAMELOOP-001 (low)
- Ziel: Die Schleife hält an, wenn der letzte Abonnent gegangen ist, und es gibt nur noch eine `FrameLoop` im Monorepo.
- Bereich: `packages/shadow-objects/src/utils/FrameLoop.ts`, `src/index.ts`, `packages/shae-offscreen-canvas/src/shared/FrameLoop.js` und seine Aufrufer
- Hängt ab von: Paket 3 — erfüllt mit `ab626ae`. Die Datei `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js` steht danach anders: die Zeilen, an denen die Schleife hängt, sind heute `:14`, `:55`, `:120`, `:136`, `:146`.
- Modell: stärkste Stufe (öffentliche API plus Umstellung eines zweiten Pakets)
- Hash: `dc29a1b`
- Nachtrag aus Zug 0 von Paket 3 (2026-08-19): Die Umstellung von `shae-offscreen-canvas` auf die
  `FrameLoop` des Kernpakets ist eine Verhaltens- und Abhängigkeitsänderung an einem eigenständig
  veröffentlichten Paket und braucht einen Eintrag in `packages/shae-offscreen-canvas/CHANGELOG.md` —
  die Datei legt Paket 3 an.
- Nachtrag aus der Triage in Zug 0 von Paket 4 (2026-08-19), ein vorbestehender Nebenbefund aus
  Paket 3, ohne Finding: `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:117-122`
  — der Setter `frameLoopIsRunning` greift über `this.viewComponent` (`:114-116`) auf
  `this.shadowEntity.viewComponent` durch und wirft, wenn das Entity-Element fehlt. Nachgewiesen
  **vorbestehend**: `git show d6e91f5:packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
  trägt Getter und Setter zeichengleich. Kein Defekt, sondern bewusst so (siehe die Begründung unter
  Paket 3, Punkt e). Er steht hier, weil dieses Paket genau diesen Lebenszyklus umbaut: die beiden
  Aufrufer des Setters sind `connectedCallback()` (`:109-111`) und `disconnectedCallback()`
  (`:124-127`), also die Zeilen, an denen die `FrameLoop` des Kernpakets angeschlossen wird. Die
  Auflage lautet: das Verhalten überlebt die Umstellung unverändert — kein `?.`, das den Ausfall nur
  verschiebt, und keine neue Stelle, die den Setter ohne Entity-Element erreicht.
- Nachtrag aus der Triage in Zug 0 von Paket 6 (2026-08-19), eine echte Folge dieses Laufs aus Paket 3:
  `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js` — der sechste Fall
  erzeugt sein Element per `new NsProbeElement(...)`, während die fünf anderen über den Helfer
  `createWithNamespace()` gehen, und er steht zwischen den Payload-Fällen statt hinter ihnen. Die Datei
  entsteht mit `ab626ae`, ist also ohne diesen Lauf nicht vorhanden — eine Folge verlässt ihn nicht.
  Sie gehört hierher, weil dieses Paket als einziges offenes dieselbe Spec anfassen wird: die Umstellung
  auf die `FrameLoop` des Kernpakets berührt `connectedCallback()`/`disconnectedCallback()` und damit den
  Lebenszyklus, den diese Datei prüft. Zu tun ist zweierlei und nicht mehr: den sechsten Fall auf
  `createWithNamespace()` umstellen und ihn hinter die Payload-Fälle setzen, sodass die Gruppe
  zusammenhängt. Wenn der Fall bewusst am Konstruktor-Argument hängt, bekommt der Helfer einen zweiten
  Parameter, statt ein zweites Idiom in die Datei zu tragen.

- Abgleich (Zug 0, 2026-08-19): Beide Befunde stehen. `packages/shadow-objects/src/utils/FrameLoop.ts` hat über
  die acht Commits dieses Laufs genau eine Änderung erfahren (`git diff d6e91f5 HEAD -- …/FrameLoop.ts`:
  drei Zeilen), den Wechsel von `Function` auf `ListenerFuncType` aus Paket 1.
  `packages/shae-offscreen-canvas/src/shared/FrameLoop.js` und `src/shadow-objects/ShaeOffscreenCanvas.js`
  sind über den ganzen Lauf unangetastet. Paket 3 hat `ShaeOffscreenCanvasElement.js` angefasst, aber nur den
  Konstruktor (`:65-113`); die vier Zeilen, an denen die Schleife hängt — `:55` (`new FrameLoop()`), `:120`
  (`start`), `:136` (`stop`), `:146` (`[FrameLoop.OnFrame]`) — sind zeichengleich mit `d6e91f5`.
  - `FRAME-LOOP-001` — **unverändert**. `#onFrame` (`FrameLoop.ts:38-41`) emittiert und ruft danach
    bedingungslos `#requestAnimationFrame()`. `stop()` (`:30-36`) storniert nur, wenn die Abonnentenzahl auf
    null steht, und trifft im Frame eine bereits gefeuerte ID; die Zeile hinter dem `emit` armiert neu. Da
    `<shae-worker>` mit `auto-sync="frame"` (dem Default) genau hier hängt, läuft die Schleife nach dem
    letzten Abgang für die Lebensdauer der Seite mit null Abonnenten weiter.
  - `API-FRAMELOOP-001` — **unverändert**. `src/index.ts` führt 17 Export-Zeilen, keine davon
    `./utils/FrameLoop.js`; die Klasse ist von außen nur als Wert der dokumentierten Eigenschaft
    `<shae-worker>.frameLoop` (`docs/api-reference.md:1480`) erreichbar, nicht als Import.
    `packages/shae-offscreen-canvas/src/shared/FrameLoop.js` steht mit 157 Zeilen (das Audit zählt 156).
- Was der Abgleich zusätzlich ergibt, und was den Zuschnitt dieses Pakets bestimmt (Zug 0, 2026-08-19):
  **Die beiden Klassen sind nicht austauschbar.** Ein Export allein macht aus der Zweitimplementierung keinen
  Aufrufer. Sie unterscheiden sich in vier Punkten, drei davon tragend:
  1. Der Kern ist ein Singleton — der Konstruktor gibt `gUniqInstance` zurück (`:10-14`), `new FrameLoop(90)`
     bekäme also die ungedrosselte Schleife eines anderen. Die Zweitimplementierung ist pro Instanz, und beide
     Instanzarten leben gleichzeitig in einem Realm: `<shae-worker local>` fährt die Shadow Objects im Fenster,
     `packages/shae-offscreen-canvas/index.html:113` benutzt das.
  2. Der Kern emittiert `now` als rohe Millisekunden-Zahl, die Zweitimplementierung ein Objekt
     `{now, lastNow, frameNo, deltaTime, measuredFps}` in Sekunden. `ShaeOffscreenCanvas.js:142` liest
     `{now, deltaTime}` daraus und reicht beides in sein eigenes `OnFrame` weiter, an dem die Beispiel-Shadow-Objects
     hängen (`sample/CubeScene.js:26-34` rechnet `0.3 * deltaTime` pro Frame).
  3. Der Kern kennt keine Obergrenze für die Bildrate. `ShaeOffscreenCanvas.js:65-67` setzt sie aus der
     Property `Fps`, die das Element aus seinem `fps`-Attribut speist (`index.html:119,125` fahren 90 und 60).
  4. Die Ereignis-Identität: `Symbol('onFrame')` gegen `Symbol.for('onFrame')`. Folgenlos, sobald es nur noch
     eine Klasse gibt.

  Dazu drei Defekte in dem Code, der hier verschwindet, gemessen am Quelltext: die `RAF`-Pumpe startet im
  Konstruktor (`:30-33`) und wird nie gestoppt — `off(RAF.get(), OnRAF, this)` (`:128`) nimmt nur den Hörer ab,
  `RAF.stop()` hat im ganzen Repo keinen Aufrufer, die Pumpe läuft also ab dem ersten Abonnenten bis zum Ende
  der Seite; das `lastNow` der Nutzlast (`:144`) wird nach der Zuweisung in `:139` gelesen und ist deshalb
  immer gleich `now`; und `deltaTime` ist auf dem ersten Frame `NaN`, weil die Bedingung in `:138` bei noch
  leerem `#lastNow` in den Subtraktionszweig fällt. Der `NaN` erreicht heute selten einen Renderer, weil
  `canRender` (`ShaeOffscreenCanvas.js:143`) die ersten Frames abweist — eine Deckung aus Zufall, keine Zusage.
- Entwurf (Zug 0, 2026-08-19), die Auslegung der Entscheidung vom 2026-08-19: **Die Zweitimplementierung wird
  gelöscht, nicht re-exportiert, und der Kern bekommt, was die Referenzanwendung braucht.** Was der Kern
  bekommt, ist die Drosselung und die Frame-Nutzlast — nicht die FPS-*Messung*. Das weicht in einem Punkt von
  der Empfehlung des Findings ab, und zwar begründet: die gemessene Bildrate hat im ganzen Monorepo einen
  einzigen Leser, eine Logzeile (`ShaeOffscreenCanvas.js:167-168`), die daneben bereits eine selbst gezählte
  Bildrate ausgibt. Eine Messapparatur von 40 Zeilen in eine öffentliche API zu heben, um eine doppelte
  Debug-Ausgabe zu erhalten, ist der falsche Handel. Die Logzeile behält ihren eigenen Zähler.

  **Die exportierte Fläche**, vollständig:

  | Symbol | Signatur | Bedeutung |
  | --- | --- | --- |
  | `FrameLoop.OnFrame` | `symbol` | Der Ereignisname. Ein `Symbol()`, kein `Symbol.for()` — wer über den globalen Symbolvorrat zu abonnieren versucht, hört nichts. |
  | `FrameLoop.get()` | `(): FrameLoop` | Die geteilte, ungedrosselte Schleife. Beim ersten Lesen angelegt, danach dieselbe. |
  | `new FrameLoop(maxFps?)` | `(maxFps?: number) => FrameLoop` | Eine eigene Schleife. `0`, negative und nicht endliche Werte heißen »keine Obergrenze«. |
  | `maxFps` | `number`, get/set | Die Obergrenze, im Lauf änderbar. |
  | `subscriptionCount` | `number`, get | Wie viele Ziele hören. Null heißt: die Schleife fordert keine Frames an. |
  | `start(target)` | `(target: object \| ListenerFuncType) => (() => void) \| undefined` | Meldet an und armiert. `null`/`undefined` sind ein No-op ohne Rückgabe. |
  | `stop(target)` | `(target: object \| ListenerFuncType) => void` | Meldet ab und storniert, sobald niemand mehr hört. |
  | `FrameData` | `{now: number; lastNow: number; frameNo: number; deltaTime: number}` | Die Nutzlast von `OnFrame`, Zeiten in Sekunden. |

  **Zwei Importwege, und beide werden gebraucht.** `index.ts` ist die View-Seite und zieht die Custom Elements
  mit; ein Shadow Object im Worker, das von dort importiert, stirbt an `HTMLElement`. `ShaeOffscreenCanvas.js`
  läuft im Worker (`index.html:112` ohne `local`). Deshalb kommt neben der Export-Zeile in `index.ts` ein
  Unterpfad `"./FrameLoop.js"` in `packages/shadow-objects/package.json` — dieselbe Bauart wie
  `"./ConsoleLogger.js"`, das dieselbe Datei bereits importiert.
- Auslieferung (Zug 0, 2026-08-19), ausdrücklich, weil die Dateiliste Teil des öffentlichen Vertrags ist:
  **`packages/shadow-objects/dist` bleibt bei 198 Dateien.** Der Lib-Transpile-Schritt kopiert `src/**`
  vollständig, `dist/src/utils/FrameLoop.{js,d.ts,js.map,d.ts.map}` liegen also längst dort; dieses Paket legt
  keine Quelldatei an und löscht keine. Was sich ändert, ist `dist/package.json`: ein Schlüssel mehr im
  `exports`-Objekt (`"./FrameLoop.js"`). Das ist eine bewusste Erweiterung des Vertrags, rein additiv, und sie
  bekommt ihren Changelog-Eintrag. `packages/shae-offscreen-canvas/.npm-pkg` geht von 22 auf 20 Dateien —
  `src/shared/FrameLoop.js` und `src/shared/utils.specs.js` verschwinden; auch das gehört in den Changelog des
  Pakets, weil es dessen Auslieferung ist.
- Einstufung von `packages/shae-offscreen-canvas` (Zug 0, 2026-08-19): **unverändert `minor`, `0.6.0` → `0.7.0`.**
  Die gelöschte Datei ist kein Unterpfad des `exports`-Objekts (`package.json:23-33` führt nur `.`,
  `./shae-offscreen-canvas.js`, `./shadow-objects.js`) und damit für keinen Konsumenten importierbar gewesen.
  Die Semver-Blockquote bleibt Wort für Wort stehen; sie benennt die eine Breaking Change des Pakets, und
  dieses Paket fügt keine hinzu.
- Triage der zugeschlagenen und der noch offenen Nebenbefunde (Zug 0, 2026-08-19) — jeder mit Symptom, Herkunft
  und Verbleib:
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:115-133` (der Durchgriff im
    Setter `frameLoopIsRunning`, aus Paket 6) — **vorbestehend**, in Paket 6 bereits gegen `d6e91f5`
    nachgewiesen und hier erneut geprüft: der Diff der Datei über den Lauf berührt nur `:65-113`. Symptom in
    Zug 0 nachgesehen und dabei **entschärft**: das Wurfszenario ist über den Konstruktor gar nicht
    erreichbar. Eine Vorlage ohne Element mit der Id `entity` lässt `this.shadowEntity` auf `null`, und der
    `createEffect` im Konstruktor (`:87-88`) liest `this.shadowEntity.viewComponent$` — das wirft bereits
    beim Bauen, lange vor dem Setter. Deshalb pinnt kein Testfall das Wurfverhalten; die Auflage wird
    dadurch erfüllt, dass Getter und Setter unangetastet bleiben (Schritt 6). → Schritt 6
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js` (zwei Erzeugungsidiome,
    aus Paket 6) — **echte Folge** dieses Laufs, die Datei entsteht mit `ab626ae`. Präzisiert: der Fall heißt
    `sets the namespace on a template that carries no placeholder for it` und steht an `:67-72`, also an
    fünfter Stelle; die Payload-Gruppe sind `:54-58`, `:60-65` und `:74-78`, und der Fall schneidet sie
    zwischen der zweiten und der dritten auf. Er hängt tatsächlich am Konstruktor-Argument, der Helfer
    bekommt also den zweiten Parameter, den der Nachtrag dafür vorsieht. → Schritt 9
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts:918-940` (das abschließende Leeren der Buchführung in
    `destroy()`, aus Paket 8, dort ohne Ziel geblieben) — **echte Folge**. `git show
    d6e91f5:packages/shadow-objects/src/in-the-dark/Kernel.ts` zeigt ein `destroy()` aus zwei Schleifen ohne
    jedes Leeren der Buchführung; der Block entsteht mit `d3c71da`. Symptom: Entities, die nur über einen mit
    `Entity.addChild()` oder `ComponentContext.addToChildren()` geschlossenen Ring erreichbar sind, hängen an
    keiner Wurzel, werden vom Durchlauf nicht gefunden und mit der Buchführung entsorgt — ihr `onDestroy`
    läuft nie, ihre Shadow Objects werden nicht abgebaut. Kein Rückschritt (vorher blieben dieselben Entities
    unbegrenzt stehen, ebenfalls ohne `onDestroy`), aber eine Grenze des Zyklusschutzes, die noch nirgends
    steht. Kein Code-Eingriff: ein Satz dort, wo Paket 8 die andere Grenze des Guards bereits ausgeschrieben
    hat. → Paket 12
  - `packages/shadow-objects/src/worker/*.ts` ohne abschließenden Zeilenumbruch (aus Paket 4) — **halb
    vorbestehend**: `MessageRouter.ts` und `WorkerRuntime.ts` enden schon in `d6e91f5` ohne Umbruch, die
    beiden Spec-Dateien aus Paket 2 tun es ihnen nach. **Kein Zielpaket**, und das ist die Entscheidung, nicht
    das Vergessen: Biome formatiert diese Dateien mit, `pnpm lint:ci` ist grün, kein Werkzeug und kein
    Konsument sieht einen Unterschied. Ein Zeichen anzufassen, das kein Prüfer verlangt, kostet einen Diff
    ohne Gegenwert.
  - `packages/shadow-objects/src/utils/waitForMessageOfType.ts:60` (der eigene `message`-Hörer je Anfrage, aus
    Paket 5) — **vorbestehend** und kein Defekt: der Hörer geht über das Abort-Signal desselben Helfers wieder
    ab, `stopListeningTo()` muss ihn nicht kennen. **Kein Zielpaket**; steht hier, damit ihn niemand ein
    zweites Mal aufrollt. Der andere Befund an derselben Datei (`:46`, `event.data.type` ungeprüft) liegt
    unverändert unter »Für das nächste Audit«.
  - `packages/shadow-objects/src/view/ShadowEnv.spec.ts:351,405` (die beiden `setTimeout(…, 50)`, aus Paket 6)
    — **vorbestehend**, beide Zeilen sind in `git show d6e91f5:…` zeichengleich an derselben Stelle. **Kein
    Zielpaket**: `Backlog.md:314` und `:419` führen den Posten bereits, und der Backlog überlebt diesen Lauf.
- Modell-Begründung (Zug 0): Die stärkste Stufe bleibt, und der Grund hat sich gegenüber dem Grobplan
  verschoben. Nicht der Export ist teuer, sondern die Reihenfolge: die roten Fälle müssen gegen die *alte*
  Klasse rot sein, die neue Klasse muss beide Aufrufer eines fremden Pakets tragen, und das fremde Paket
  löst seinen Import erst nach einem Build des Kernpakets auf. Wer die Schritte 2 bis 8 in der falschen
  Folge geht, sieht ein grünes Kernpaket und ein Beispielpaket, das gegen ein `dist` von gestern importiert.
  Dazu die Falle, die die Klasse selbst stellt: eine geteilte Instanz und ein Modulzustand, der innerhalb
  einer Spec-Datei über alle Fälle hinweg stehen bleibt.
- Dateien:
  - `packages/shadow-objects/src/utils/FrameLoop.ts`
  - `packages/shadow-objects/src/utils/FrameLoop.spec.ts` (neu)
  - `packages/shadow-objects/src/index.ts`
  - `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`
  - `packages/shadow-objects/package.json`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/docs/cheat-sheet.md`
  - `packages/shadow-objects/README.md`
  - `packages/shadow-objects/CHANGELOG.md`
  - `packages/shae-offscreen-canvas/src/shared/FrameLoop.js` (gelöscht)
  - `packages/shae-offscreen-canvas/src/shared/utils.specs.js` (gelöscht)
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js`
  - `packages/shae-offscreen-canvas/src/shadow-objects/ShaeOffscreenCanvas.js`
  - `packages/shae-offscreen-canvas/CHANGELOG.md`
  - `Backlog.md`
- Vorgehen:
  1. **Die Fälle zuerst.** Neu: `packages/shadow-objects/src/utils/FrameLoop.spec.ts`, 17 Fälle in vier
     Gruppen, 11 davon rot. Stil wie in den Specs aus den Paketen 7 und 8: benannte Importe aus `vitest`,
     `describe`-Gruppen nach Verhaltensbereichen, `it`-Namen als englische Aussagesätze in der dritten Person
     Singular, Kommentare erklären das *Warum*. Keine Finding-Kürzel, in keiner Form.

     Das Werkzeug für eine Schleife, die sich selbst nachlädt, ist ein von Hand gefahrenes
     `requestAnimationFrame`. happy-dom bringt eines mit, aber es hängt an echten Timern und sagt nicht, wie
     oft es angefordert wurde — beides braucht dieser Test. Also im `beforeEach` per `vi.stubGlobal` ersetzen:
     ein Zähler für die Anforderungen, eine `Map` von ID auf Callback für das Ausstehende, `cancelAnimationFrame`
     nimmt aus der Map, und ein Helfer `runFrame(now)` leert die Map und ruft, was darin lag. `afterEach`
     räumt mit `vi.unstubAllGlobals()` ab. Die Klasse greift unqualifiziert auf die globalen Funktionen zu,
     der Austausch erreicht sie also zur Aufrufzeit.

     **Die Falle der Datei:** `FrameLoop.get()` ist Modulzustand und lebt über alle Fälle einer Datei hinweg
     (vitest isoliert je Datei, nicht je Fall). Jeder Fall, der die geteilte Schleife anfasst, meldet sein
     Ziel im selben Fall wieder ab; alle anderen Fälle bauen sich ihre eigene mit `new FrameLoop()`.

     - Gruppe `describe('arming and idling', …)`:
       1. grün — `arms a frame as soon as the first target subscribes`.
       2. grün — `arms one frame for two targets`.
       3. grün — `keeps arming as long as a target listens` — nach `runFrame()` steht wieder genau eine
          Anforderung aus.
       4. grün — `stops arming when the last target leaves between two frames` — `stop()` außerhalb eines
          Frames storniert, nichts steht mehr aus.
       5. **rot** — `stops arming when the last target leaves inside the frame`. Das Ziel meldet sich im
          eigenen Handler ab; nach `runFrame()` steht nichts mehr aus und der Zähler ist nicht gestiegen.
          Heute steigt er, weil `#onFrame` hinter dem `emit` bedingungslos neu armiert. Das ist der
          Korrektheitsfehler dieses Pakets.
       6. **rot** — `arms exactly one frame when a target arrives while the last one leaves inside the frame`.
          Der Handler meldet sich ab und ein zweites Ziel an; danach steht **eine** Anforderung aus. Heute
          sind es zwei, und nur die zweite ist stornierbar — die erste läuft als verwaiste Schleife weiter.
       7. grün — `picks up again after it has gone idle`.
       8. grün — `hands back an unsubscribe function that takes the target off`.
     - Gruppe `describe('frame data', …)`:
       9. **rot** — `reports the timestamp in seconds and counts its frames from one`.
       10. **rot** — `reports no delta on the first frame and the elapsed seconds afterwards` — Frames bei
           1000 und 1016: erst `deltaTime === 0` und `lastNow === now`, dann `0.016` und `lastNow === 1`.
       11. **rot** — `starts over with no delta after it has been idle` — abmelden, wieder anmelden, ein Frame
           eine Sekunde später: `deltaTime === 0`. Ohne das Zurücksetzen meldete die Schleife die ganze Pause
           als einen Frame.
     - Gruppe `describe('the frames-per-second cap', …)`:
       12. **rot** — `lets every frame through without a cap`.
       13. **rot** — `skips the frames that arrive before the cap allows the next one` — `maxFps = 30`,
           Frames bei 0, 10 und 40: zwei Emissionen.
       14. **rot** — `keeps arming while it skips a frame` — ein übersprungener Frame armiert trotzdem neu,
           sonst hält die Drosselung die Schleife an.
       15. **rot** — `takes a new cap while it runs`.
     - Gruppe `describe('the shared loop', …)`:
       16. **rot** — `FrameLoop.get() answers the same loop every time` (die Methode gibt es nicht, im
           Typecheck ein Fehler).
       17. **rot** — `a loop built with new is not the shared one` — heute ist es dieselbe, der Konstruktor
           gibt die geteilte Instanz zurück.

  2. **Der Kern: `packages/shadow-objects/src/utils/FrameLoop.ts`.** Die Datei wird neu geschrieben, die
     Importzeile bleibt (`emit`, `eventize`, `getSubscriptionCount`, `ListenerFuncType`, `off`, `on`).

     - `export interface FrameData {now: number; lastNow: number; frameNo: number; deltaTime: number}` — alle
       Zeiten in Sekunden, jedes Feld mit einem Satz Doc-Kommentar.
     - Der Modulzustand heißt weiterhin so, wie er ist, wird aber nur noch von `static get()` erreicht:
       `get()` legt beim ersten Aufruf an und gibt danach dieselbe Instanz. Der Konstruktor gibt nichts mehr
       zurück; `new FrameLoop(maxFps = 0)` baut eine eigene Schleife. Das ist die Voraussetzung dafür, dass
       eine gedrosselte und eine ungedrosselte Schleife nebeneinander im selben Realm laufen — der Fall, den
       `<shae-worker local>` erzeugt.
     - `set maxFps(fps)`: `Number.isFinite(fps) && fps > 0 ? fps : 0`. Null heißt keine Obergrenze.
     - `get subscriptionCount()`: `getSubscriptionCount(this)`. Ein Kommentar sagt, warum das trägt: `OnFrame`
       ist das einzige Ereignis, das dieses Objekt kennt, die Gesamtzahl ist also die Zahl der Frame-Hörer.
     - `start(target)`: `if (target == null) return;` bleibt, danach `on(…)` und `#requestAnimationFrame()`,
       Rückgabe wie bisher die Abmeldefunktion. `stop(target)`: `if (target == null) return;`, `off(…)`, und
       storniert, sobald `subscriptionCount === 0` — dort auch `#lastNow` zurücksetzen, damit die erste
       Runde nach einer Pause wieder ohne Delta beginnt (Fall 11).
     - `#onFrame`: **zuerst** `#rafID = 0` — der Frame, für den armiert war, ist gefeuert, es steht nichts
       mehr aus. Dann die Drosselung: bei gesetzter Obergrenze und zu kurzem Abstand wird nicht emittiert.
       Der Abstand misst vom zuletzt *emittierten* Frame, die Schwelle ist `0.98 * (1000 / maxFps)` — die
       98 % fangen den Jitter der rAF-Zeitstempel auf, und genau dieser Faktor bekommt einen Kommentar,
       weil er sonst wie eine Marotte aussieht. Danach `frameNo` hochzählen, `lastNow` fortschreiben,
       `emit(this, FrameLoop.OnFrame, frameData)`. Auf dem ersten Frame ist `lastNow === now` und
       `deltaTime === 0` — kein `NaN`, egal wer zuhört. Zum Schluss neu armieren, wenn
       `subscriptionCount > 0` ist; ein übersprungener Frame armiert genauso neu wie ein emittierter.
     - `#requestAnimationFrame()` wird idempotent: `if (this.#rafID !== 0) return;`. Damit kann niemand zwei
       Schleifen parallel armieren, auch nicht ein Ziel, das sich mitten im Frame anmeldet (Fall 6).
       `#cancelAnimationFrame()` storniert nur, wenn etwas aussteht.

  3. **Der Export.** In `packages/shadow-objects/src/index.ts` die Zeile `export * from './utils/FrameLoop.js';`
     vor `export * from './utils/toNamespace.js';` — die Liste ist nach Pfad sortiert, das bleibt so.

  4. **Der Unterpfad.** In `packages/shadow-objects/package.json` hinter `"./ConsoleLogger.js"` den Eintrag
     `"./FrameLoop.js": {"import": "./dist/src/utils/FrameLoop.js", "types": "./dist/src/utils/FrameLoop.d.ts"}`.
     `package.override.json` bleibt unangetastet, es ersetzt nur `sideEffects`; `scripts/makePackageJson.mjs`
     streift den `dist/`-Präfix ab, im ausgelieferten Manifest steht danach `"./src/utils/FrameLoop.js"`.
     `sideEffects` bekommt keinen neuen Eintrag — die Datei hat keine.

  5. **`packages/shadow-objects/src/elements/ShaeWorkerElement.ts`.** Das Feld `#frameLoop` (`:44`) entfällt,
     der Getter (`:141-144`) gibt `FrameLoop.get()` zurück. Damit bleibt wahr, was `docs/api-reference.md:1480`
     zusagt: eine Schleife je Prozess, jedes Element liest dieselbe. `[FrameLoop.OnFrame]()` (`:149-151`)
     nimmt weiterhin keine Argumente und bleibt, wie es ist.

  6. **`packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`.** Der Import in `:14`
     entfällt, `FrameLoop` kommt aus `@spearwolf/shadow-objects` — dieselbe Zeile, aus der schon `ContextLost`
     kommt (`:2`). `:55` wird `#frameLoop = FrameLoop.get();`, weil diese Schleife ungedrosselt läuft und
     alle Elemente der Seite sich eine teilen können. `connectedCallback()` (`:119-122`),
     `disconnectedCallback()` (`:135-138`) und `[FrameLoop.OnFrame]()` (`:146`) bleiben Zeile für Zeile, wie
     sie sind — der Handler liest keine Nutzlast.

     **Auflage, ohne Ausnahme:** der Getter `viewComponent` (`:115-117`) und der Setter `frameLoopIsRunning`
     (`:128-133`) werden nicht angefasst. Kein `?.`, kein Guard, keine neue Aufrufstelle. Der Nachweis ist
     ein leerer Diff über diese Zeilen.

  7. **`packages/shae-offscreen-canvas/src/shadow-objects/ShaeOffscreenCanvas.js`.** Der Import in `:16` wird
     `import {FrameLoop} from '@spearwolf/shadow-objects/FrameLoop.js';` — nicht aus dem Wurzeleinstieg, der
     zieht die Custom Elements mit und läuft im Worker nicht. `:26` bleibt `new FrameLoop(90)`. `:66` wird
     `this.#frameLoop.maxFps = getFps() ?? 60;`. `:142` bleibt unverändert, `{now, deltaTime}` liegt in der
     Nutzlast wie bisher. In `:160-172` fallen die beiden Argumente `'measuredFps='` und
     `this.#frameLoop.measuredFps` aus der Logzeile; der selbst gezählte Wert daneben bleibt.

  8. **Löschen:** `packages/shae-offscreen-canvas/src/shared/FrameLoop.js` und
     `packages/shae-offscreen-canvas/src/shared/utils.specs.js`. Die Spec hat genau einen Fall, und dessen
     Gegenstand ist die gelöschte Klasse; sie auf die Klasse des Kernpakets umzubiegen hieße, in einem Paket
     die API eines anderen zu prüfen. `src/shared/README` bleibt richtig — `constants.js` ist weiterhin
     isomorpher Code.

  9. **`packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js`**, drei Eingriffe:
     - Der Helfer bekommt den zweiten Parameter: eine Modulvariable für die Vorlage, die `NsProbeElement` in
       einem eigenen parameterlosen Konstruktor an `super()` weiterreicht. Steht sie auf `undefined`, greift
       der Default-Parameter des Elements. `createWithNamespace(ns, initialHTML)` setzt beide Variablen und
       gibt `document.createElement('ns-probe-element')` zurück. Der Kommentar über der Sonde (`:6-12`)
       erklärt danach beide Umwege, nicht nur den mit den Attributen.
     - Der Fall `sets the namespace on a template that carries no placeholder for it` (`:67-72`) benutzt den
       Helfer und wandert hinter `keeps the token of the entity when the namespace ends its attribute`. Danach
       stehen die drei Payload-Fälle zusammen, und in der Datei gibt es ein Erzeugungsidiom.
     - Neue Gruppe `describe('the frame loop', …)` am Ende, ein Fall:
       `subscribes to the shared frame loop while it is in the document`. Vor dem Anhängen
       `FrameLoop.get().subscriptionCount` merken, anhängen, um eins gestiegen, `el.remove()`, wieder auf dem
       Ausgangswert. Rot vor Schritt 6 (das Element hängt dann an seiner eigenen Schleife), grün danach. Der
       Import kommt aus `@spearwolf/shadow-objects`. Sollte das Anhängen an `document.body` unter happy-dom
       mehr View-Schicht in den Fall ziehen, als er beruhigen kann, ist der Rückfallweg der direkte Aufruf von
       `el.connectedCallback()` und `el.disconnectedCallback()` — das sind genau die beiden Nahtstellen, die
       dieses Paket umbaut.

  10. **Dokumentation.** `packages/shadow-objects/docs/api-reference.md` bekommt einen Abschnitt `## FrameLoop`
      zwischen `## Environment Proxies` (endet vor `:1393`) und `## Web Components` (`:1393`), dazu die
      Navigationszeile im Kopf zwischen »Environment Proxies« und »Web Components«. Inhalt: wozu die Schleife
      da ist, die Tabelle der Fläche aus dem Entwurf oben, die Zusage »null Abonnenten heißt null
      Frame-Anforderungen«, die Frame-Nutzlast samt Einheit und dem ersten Frame ohne Delta, die Obergrenze
      samt der 98-%-Schwelle, und ein Satz zum Symbol: es kommt nicht aus dem globalen Symbolvorrat,
      `Symbol.for('onFrame')` erreicht die Schleife nicht. Dazu die beiden Importwege und wann welcher gilt
      (der Unterpfad überall, der Wurzeleinstieg nur dort, wo die View-Schicht ohnehin geladen ist). Die Zeile
      `frameLoop` in der Eigenschaftstabelle von `<shae-worker>` (`:1480`) verweist auf den neuen Abschnitt,
      der Satz »There is one per process« bleibt.
      `docs/cheat-sheet.md` bekommt am Ende, hinter `## ShadowEnv Quick Setup`, einen kompakten Block
      `## FrameLoop`: der Import, `FrameLoop.get().start(this)`, die Abmeldefunktion, die Nutzlast in einer
      Zeile. `packages/shadow-objects/README.md` bekommt einen Satz in den Absatz über die Unterpfade (`:57`,
      dort, wo `@spearwolf/shadow-objects/shadow-objects.js` erklärt wird): `@spearwolf/shadow-objects/FrameLoop.js`
      führt dieselbe Klasse ohne die View-Schicht, für Code, der im Worker läuft.

  11. **Changelogs.** `packages/shadow-objects/CHANGELOG.md`, Abschnitt `[Unreleased]`:
      - Ein Eintrag für den Export: `FrameLoop` ist öffentlich, über den Wurzeleinstieg und über
        `@spearwolf/shadow-objects/FrameLoop.js`; die Fläche in einem Satz, dazu `FrameData` und der neue
        Schlüssel im `exports`-Objekt des ausgelieferten Manifests.
      - Ein Eintrag für die Schleife im Leerlauf: sie fordert keine Frames mehr an, sobald der letzte
        Abonnent gegangen ist, auch wenn er innerhalb eines Frames geht. Ein Halbsatz dazu, dass ein Ziel,
        das sich im Frame anmeldet, während das letzte geht, genau einen Frame armiert.
      - Ein Eintrag für die geteilte Instanz: `FrameLoop.get()` liefert sie, `new FrameLoop(maxFps)` baut eine
        eigene; `<shae-worker>` liest weiterhin dieselbe.
      - Der gezählte Kopf steht bei **28** und geht auf **29**. Das neue Glied ist die Nutzlast von
        `OnFrame`: wer heute über `<shae-worker>.frameLoop` mitschreibt, bekommt eine Millisekunden-Zahl und
        künftig ein `FrameData`-Objekt mit Sekunden. Zahl im Kopfsatz und Zahl der Glieder müssen danach
        wieder übereinstimmen. Alles andere an diesem Paket ist additiv und zählt nicht mit.

      `packages/shae-offscreen-canvas/CHANGELOG.md`, Abschnitt `[Unreleased]`: ein Eintrag, dass Element und
      Shadow Object die `FrameLoop` von `@spearwolf/shadow-objects` fahren und die Schleife anhält, sobald
      keine Ebene mehr hört; ein Eintrag für die Auslieferung, die zwei Dateien weniger führt. Die
      Semver-Blockquote bleibt unverändert. Die Datei ist in `biome.json` von `files.includes` ausgenommen
      (`!**/CHANGELOG.md`) und muss von Hand sauber sein.

      Die Wurzel-`CHANGELOG.md` bleibt außen vor: hier ändert sich kein Build-Schritt, kein Werkzeug und
      keine devDependency.

  12. **`Backlog.md`**, drei Stellen:
      - `:231` (`LOW-4`) — der Halbsatz »`FrameLoop.gUniqInstance` ist unverändert offen« wird durch den
        Stand ersetzt: die geteilte Schleife ist ein bewusster Griff (`FrameLoop.get()`), `new FrameLoop()`
        baut eine eigene, und eine Spec kann sich damit isolieren. Nur dieser Halbsatz; den Absatz über die
        Gattungsfrage aller drei Singletons schreibt Paket 12, das dafür bereits eine Auflage trägt.
      - `:306` — `FrameLoop` fällt aus der Liste der Utils ohne eigene Tests, `FrameLoop.spec.ts` kommt zu den
        vorhandenen Specs.
      - `:337` — in der Empfehlung »Nicht-triviale Utils spezifizieren« bleibt `cloneChangeTrail` stehen,
        `FrameLoop` geht.
- Verify:
  1. **Rot zuerst**, und in zwei Läufen, weil zwei Pakete betroffen sind:
     `pnpm -F @spearwolf/shadow-objects exec vitest src/utils/FrameLoop.spec.ts --run` **vor** Schritt 2 —
     erwartet: 11 rote Fälle (5, 6, 9 bis 17), 6 grüne. Die Ausgabe gehört in den Bericht des Implementierers,
     samt Fehlerart je Fall: die Fälle 16 und 17 fallen an einer fehlenden Methode bzw. an einer Identität,
     die Fälle 9 bis 15 an der Nutzlast — wer nur auf »rot« schaut, verwechselt beides.
     `pnpm -F @spearwolf/shae-offscreen-canvas test` **vor** Schritt 6 — erwartet: der neue Frame-Loop-Fall
     fällt, die sechs Namespace-Fälle stehen.
  2. **Grün danach.** Dieselben zwei Kommandos nach Schritt 9.
  3. Von der Wurzel `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`. Die Gesamtzahl geht von
     **831** auf **848**: 17 neue Fälle im Kernpaket (490 → 507), im Beispielpaket einer dazu und einer weg
     (7 → 7, aber die Datei `utils.specs.js` verschwindet und `ShaeOffscreenCanvasElement.spec.js` steht bei
     sieben Fällen). `shadow-objects-testing` bleibt bei 334.
  4. `pnpm -F shadow-objects-e2e test` — 402 Fälle in Chromium und Firefox. Das ist der einzige automatische
     Nachweis der geänderten Schleife gegen ein echtes `requestAnimationFrame`: `pages/bundle.html`,
     `pages/shae-worker.html` und `pages/worker-failure.html` fahren `<shae-worker>` ohne `auto-sync` und
     damit über den Frame-Pfad, `bundle.html` mit zwei Elementen an derselben geteilten Schleife.
  5. **Auslieferung, Kernpaket.** `find packages/shadow-objects/dist -type f | sort` vor und nach dem Build:
     dieselben **198** Dateien. `dist/package.json` unterscheidet sich in genau einem Schlüssel,
     `"./FrameLoop.js"` im `exports`-Objekt; `sideEffects`, `main`, `module`, `types` bleiben gleich.
     Erwartete Änderungen in den `.d.ts`: `utils/FrameLoop.d.ts` führt `FrameData`, `static get()`, den
     `maxFps`-Accessor und `subscriptionCount`; `index.d.ts` bekommt die Re-Export-Zeile;
     `elements/ShaeWorkerElement.d.ts` bleibt gleich, der Getter behält seinen Typ.
  6. **Auslieferung, Beispielpaket.** `find packages/shae-offscreen-canvas/.npm-pkg -type f | sort` vor und
     nach dem Paket: 22 → **20**, und die beiden fehlenden sind `src/shared/FrameLoop.js` und
     `src/shared/utils.specs.js`. Keine andere Abweichung.
  7. **Von Hand, und dieses Mal nicht optional.** `pnpm -F @spearwolf/shae-offscreen-canvas dev`,
     `packages/shae-offscreen-canvas/index.html` im Browser öffnen. Alle drei Ebenen müssen rendern *und*
     animieren, der Würfel muss sich drehen — er dreht über `deltaTime`, und ein `NaN` oder eine stehende
     Schleife friert ihn ein, ohne dass ein Test etwas meldet. Die beiden `fps`-Attribute (90 und 60) müssen
     weiterhin unterschiedlich schnell laufen, und die Ebene mit `ns="foo"` läuft über
     `<shae-worker local>`, also über den Realm, in dem eine gedrosselte und eine ungedrosselte Schleife
     nebeneinander stehen. Paket 3 hat seinen Handdurchgang liegen lassen; dieses Paket kann sich das nicht
     leisten, weil es die Render-Schleife der Anwendung austauscht.
- Commit: `feat(frame-loop)!: a loop that idles when nobody listens, and one implementation for the whole monorepo`
- Ergebnis (2026-08-19, `dc29a1b`, 16 Dateien): `FrameLoop` hält an, sobald der letzte Abonnent gegangen
  ist — auch wenn er aus dem eigenen Handler heraus geht —, und es gibt im Monorepo nur noch eine
  Implementierung. Die Klasse ist über zwei Wege öffentlich, der Wurzeleinstieg und der Unterpfad
  `@spearwolf/shadow-objects/FrameLoop.js` für Code ohne Dokument. `FrameLoop.get()` gibt die geteilte
  Schleife, der Konstruktor baut eine eigene; die Nutzlast von `OnFrame` ist ein `FrameData` in Sekunden.
  20 neue Spec-Fälle, Gesamtzahl 831 → 851.
- Nebenbefunde (2026-08-19), gemeldet und nicht angefasst:
  - `packages/shae-offscreen-canvas/src/shadow-objects/ShaeOffscreenCanvas.js` — nach dem Teardown bleiben
    `this.canvas` (die vom View übergebene `OffscreenCanvas`) und `this.dispatchMessageToView` gesetzt. Ein
    Aufruf nach dem Abbau liefe in den abgebauten Router, das Canvas hängt bis zur GC an der Instanz. Beides
    vorbestehend und ohne Bezug zur Schleife. → nächstes Audit.
  - `audit.html:668` und `:1370` behaupten, `packages/shae-offscreen-canvas/src/shared/utils.specs.js` sei
    nicht eingecheckt. Vor diesem Lauf war die Datei getrackt. Veraltete Aussage im Audit-Artefakt, kein
    Code-Befund — beim Nachführen der Seite in Schritt 7 mit erledigen.
  - `FrameLoop.get()` hängt am Modulzustand, nicht am globalen Objekt. Im Handdurchgang gemessen: ein Import
    über einen zweiten Modulpfad liefert eine zweite »geteilte« Schleife mit eigener Abonnentenzahl. Die
    Namespace-Registry sitzt bewusst an `globalThis` und übersteht eine doppelte Installation, diese Schleife
    nicht. Kein Defekt dieses Pakets — Material für den Absatz über die drei Singletons. → Paket 12.
  - `start()` dedupliziert Funktionsziele nicht: zweimal dieselbe Funktion ergibt zwei Aufrufe pro Frame,
    ein `stop()` nimmt beide ab. Objektziele dedupliziert eventize selbst. Kein Aufrufer im Repo passiert eine
    Funktion; die gelöschte Zweitimplementierung führte dafür ein `Set`. Bewusst nicht übernommen.
  - `#rafID === 0` als »nichts steht aus«: die HTML-Spec garantiert ein positives Handle. In einem Host, dessen
    `requestAnimationFrame` 0 liefert, würde doppelt armiert und nie storniert. Bewusst nicht abgesichert;
    die Attrappe der Spec zählt deshalb ab 1, mit Kommentar an Ort und Stelle.
  - Die Drosselung quantisiert: eine Kappe, die kein ganzer Teiler der Bildwiederholrate ist, landet auf der
    nächsterreichbaren Rate — bei 144 Hz liefert eine Kappe von 90 rund 72 Bilder. Die Doku sagt zwei Schranken
    zu und keine Exaktheit dazwischen, behauptet also nichts Falsches. Ein Satz, der die Quantisierung benennt,
    wäre trotzdem ehrlicher. → Paket 12, zusammen mit dem übrigen Doku-Teil.
- Folgen (2026-08-19): zwei, beide aus dem Löschen von `utils.specs.js`, beide unter Paket 12 eingetragen —
  das tote `specs` im `include`-Muster von `packages/shae-offscreen-canvas/vitest.config.ts:7` und die
  devDependency `@esm-bundle/chai`, die ihren letzten Importeur in diesem Paket verloren hat.
- Schnittstellen (2026-08-19): Paket 10 fasst von den Custom Elements `ShaePropElement.ts` und
  `ShaeEntElement.ts` an, dieses Paket hat allein `ShaeWorkerElement.ts` berührt (`#frameLoop` entfällt,
  der Getter gibt `FrameLoop.get()`); geprüfte Überschneidung: keine. Paket 11 hängt an `RemoteWorkerEnv.ts`
  und ist von hier unberührt. Paket 12 erbt die vier oben benannten Posten und die Kopfzahl des
  Changelogs, die jetzt bei **29** steht.
- Verlauf:
  - Zug 0 (2026-08-19): Detailplan steht. Abweichung von der Empfehlung von `API-FRAMELOOP-001` — die FPS-Messung wandert nicht in den Kern — vom Orchestrator angenommen; die Begründung steht im Entwurf oben.
  - Zug 1 (2026-08-19): Umgesetzt, alle zwölf Schritte. Rot vorher: 11 von 17 im Kernpaket (5, 6, 9–17)
    mit der geplanten Fehlerart-Verteilung — 5/6 an der Neuarmierung, 9–12 an der Nutzlast, 13–15 an der
    Drosselung, 16 an der fehlenden Methode, 17 an der Identität; im Beispielpaket fällt der neue
    Frame-Loop-Fall, die sechs Namespace-Fälle stehen. Grün danach: 507 + 7 + 334 = 848, e2e 402.
    `dist` bleibt bei 198 Dateien, `dist/package.json` bekommt genau einen Schlüssel, `.npm-pkg` geht
    22 → 20. Vier gemeldete Abweichungen: (a) die Spec räumt über `startTracked()` + `afterEach` auf,
    weil ein roter Fall unter der alten Klasse an seiner Assertion endet, bevor er abmeldet — sonst
    reißt Fall 6 den Fall 7 mit und der Lauf steht bei 12 rot; (b) Fall 17 prüft die Identität zuerst,
    sonst fiele er an derselben fehlenden Methode wie Fall 16; (c) die Logzeile in `ShaeOffscreenCanvas.js`
    steht einzeilig, so formatiert Biome; (d) der Handdurchgang lief über einen kopflosen Chromium.
  - Zug 3 (2026-08-19): Review, stärkste Stufe. Der Code der Klasse trägt: dreizehn Zustände gegen die
    transpilierte Klasse gemessen — Abmelden im Emit, Zugang während des Abgangs, doppeltes `start()`,
    `stop()` auf ein nie angemeldetes Ziel, `maxFps` im laufenden Handler, zwei Schleifen im selben Realm,
    Leerlauf und Wiederanlauf —, kein erreichbarer Zustand ohne Hörer und keine zwei parallelen
    Anforderungen. Die Division durch 1000 sitzt ausschließlich im Aufbau der Nutzlast. Differenziell gegen
    die gelöschte Zweitimplementierung über acht Frames bei den Kappen 0/90/60/30: identische Emissionszahl
    und identische `now`/`deltaTime` bis zur letzten Stelle, Abweichungen nur dort, wo sie gewollt sind.
    Kopfzahl des Changelogs geprüft: 29 behauptet, 31 Semikolon-Glieder — der Versatz von 2 hält an jedem
    Commit, der eine Zahl trägt, die `ComponentContext`-Teardown-Gruppe zählt einmal über drei Glieder.
    Urteil: **nicht commit-fähig**, wegen zweier Zusagen, die die Messung nicht deckt (siehe Zug 4).
  - Zug 5 (2026-08-19): Verify vom Orchestrator selbst gefahren. `pnpm lint:ci` 2 bekannte Infos bei
    195 geprüften Dateien, `pnpm typecheck --force` und `pnpm build --force` je 3/3 ohne Cache,
    `pnpm test:ci --force` **851** (510 + 7 + 334), `pnpm -F shadow-objects-e2e test` **402** in
    Chromium und Firefox. `dist` vor und nach dem Build zeichengleich bei **198** Dateien;
    `dist/package.json` trägt genau einen Schlüssel mehr (`"./FrameLoop.js"` → `./src/utils/FrameLoop.js`),
    `sideEffects`, `main`, `module`, `types` unverändert; `.npm-pkg` bei **20** Dateien.
    Handdurchgang selbst gefahren statt übernommen (Chromium, Vite auf 5176): 117 rAF/s bei intakter
    Seite, 60 nach dem Entfernen der drei `<shae-offscreen-canvas>`, **0** nach dem Entfernen der
    beiden `<shae-worker>`, und 0 auch anderthalb Sekunden später — die Gegenprobe des Implementierers
    ohne den Fix steht bei dauerhaft 60. Die geteilte Schleife über ein eigenes Abo gemessen:
    118 Frames in 2 s, erster Frame `frameNo === 1`, `lastNow === now`, `deltaTime === 0`, kein `NaN`,
    Abstände 16,6 bis 17,6 ms, `subscriptionCount` nach dem Abmelden zurück auf 0. Alle drei Ebenen
    rendern, keine Konsolenfehler außer einem fehlenden Favicon.
  - Zug 4 (2026-08-19), drei benannte Korrekturen, zurück an denselben Implementierer:
    1. `packages/shae-offscreen-canvas/src/shadow-objects/ShaeOffscreenCanvas.js:50-52` — `onDestroy`
       meldet das Shadow Object nie von seiner Schleife ab. Gemessen in echtem Chromium: nach dem
       Entfernen aller Elemente fällt die Seite mit echtem Worker auf 0 rAF/s, die Seite mit
       `<shae-worker local>` bleibt dauerhaft bei 60. In der Sache vorbestehend — die gelöschte
       `RAF`-Pumpe lief ebenso —, aber dieses Paket bindet die Armierung an die Abonnentenzahl und
       schreibt den Satz in den Changelog des Pakets. Der Satz wird wahr gemacht, nicht abgeschwächt.
    2. Die 98-%-Schwelle. Gemessen über 90 echte rAF-Frames bei `maxFps = 60`: Chromium 90 von 90,
       Firefox 53 von 90 (rund 35 fps), weil dessen Zeitstempel gröber runden und jeder zweite Abstand
       unter der Schwelle liegt. `index.html:125` fährt `fps="60"`, und `docs/api-reference.md:1448`
       schließt genau diesen Fall aus. Die Schwelle wird geweitet, mit den beiden Schranken als
       Begründung statt einer geratenen Zahl: `f ≤ 1 − j/D` (eine Kappe auf oder über der
       Bildwiederholrate verliert keinen Frame) und `f > 0.5 + j/(2D)` (eine Kappe bei der Hälfte
       verwirft jeden zweiten). Zwei Spec-Fälle pinnen die Schranken.
    3. `frameNo` zählt über den Leerlauf hinweg weiter, während die Doku »counted from one« zusagt.
       `stop()` setzt `#lastNow` zurück; der Zähler geht mit. Ein Spec-Fall dazu.
    Ausdrücklich nicht angefasst und damit entschieden: `start()` dedupliziert Funktionsziele nicht (kein
    Aufrufer im Repo passiert eine Funktion); `#rafID === 0` als Sentinel bleibt, die HTML-Spec garantiert
    ein positives Handle; die `maxFps`-Normalisierung bleibt ungeprüft, das Beispielpaket parst vorher zu
    einer Zahl. Zielzahl danach: 510 + 7 + 334 = 851.

**FRAME-LOOP-001 · FrameLoop fordert weiter Frames an, nachdem der letzte Abonnent gegangen ist · medium · packages/shadow-objects/src/utils/FrameLoop.ts:38-41**
#onFrame emittiert erst und ruft danach bedingungslos #requestAnimationFrame(). Meldet sich der letzte Abonnent innerhalb des Frames ab — was jedes syncShadowObjects() auslösen kann, das ein <shae-worker> aus dem DOM nimmt —, läuft stop() vor der Neuanforderung: cancelAnimationFrame trifft die bereits gefeuerte ID, und die Zeile danach armiert die Schleife neu. Nachgewiesen mit gepatchtem rAF: nach der Abmeldung im Frame steigt die Zahl der rAF-Anforderungen weiter. Da FrameLoop ein prozessweiter Singleton ist, läuft die Schleife dann für die Lebensdauer der Seite mit null Abonnenten.
Empfehlung: Die Neuanforderung an die Abonnentenzahl binden: in #onFrame nur dann #requestAnimationFrame() aufrufen, wenn getSubscriptionCount(this) > 0 ist. Damit verschwindet auch die Abhängigkeit von der Reihenfolge zwischen cancel und request.
*Fundstelle heute unverändert: `FrameLoop.ts:38-41` (`#onFrame`), `:30-36` (`stop()`), `:43-45` (`#requestAnimationFrame()`). Die Empfehlung wird umgesetzt und um eine Zeile erweitert: `#requestAnimationFrame()` wird idempotent und `#onFrame` setzt die ausstehende ID zurück, bevor es emittiert. Der Grund steht in Fall 6 des Detailplans — die Abonnentenzahl allein deckt den Fall nicht ab, in dem ein Ziel im selben Frame geht und ein anderes kommt: dann armieren `start()` und `#onFrame` zweimal, und nur die zweite Anforderung ist stornierbar.*

**API-FRAMELOOP-001 · FrameLoop wird gebraucht, aber nicht exportiert — und deshalb nachgebaut · low · packages/shadow-objects/src/index.ts, packages/shae-offscreen-canvas/src/shared/FrameLoop.js**
utils/FrameLoop.ts trägt die Frame-Synchronisation von <shae-worker>, taucht aber in keinem Export von index.ts auf. shae-offscreen-canvas — die eigene Referenzanwendung — hat daraufhin eine zweite FrameLoop-Klasse geschrieben: 156 Zeilen, eigene FPS-Messung, und mit Symbol.for('onFrame') statt Symbol('onFrame') eine abweichende Ereignis-Identität. Zwei Implementierungen desselben Konzepts unter demselben Namen, die nicht zusammenarbeiten können.
Empfehlung: FrameLoop aus index.ts exportieren und shae-offscreen-canvas darauf umstellen; die FPS-Messung als optionale Erweiterung in die Kern-Implementierung ziehen. Wenn FrameLoop bewusst intern bleiben soll, gehört das in die Dokumentation — dann ist die Zweitimplementierung im Beispielpaket allerdings die falsche Antwort darauf.
*Fundstelle heute: `index.ts:1-17` (17 Exportzeilen, keine für `utils/FrameLoop.js`), `packages/shae-offscreen-canvas/src/shared/FrameLoop.js:1-157`. Gewählt ist der erste Weg der Empfehlung, festgelegt im Abschnitt »Entscheidungen«, mit einer begründeten Abweichung: die FPS-Messung wandert nicht mit, sie hat im ganzen Monorepo einen einzigen Leser (eine Logzeile, die daneben schon selbst zählt). Was mitwandert, ist die Obergrenze für die Bildrate und die Frame-Nutzlast — ohne sie bleibt die Zweitimplementierung stehen, gleich wie viel exportiert wird. Der Export geht über zwei Wege, weil der Wurzeleinstieg die Custom Elements mitzieht und der zweite Aufrufer im Worker läuft.*

### [x] 10. Custom Elements: NaN-Werte und ein veralteter Shadow-Host
- Findings: PROP-NAN (medium, Rest), ELEM-HOST-001 (low)
- Ziel: Ein Wert, dessen Umrechnung keine Zahl ergibt, wird gemeldet und räumt die Property ab, statt `NaN` in die Entity zu tragen; und `findShadowRootHost()` antwortet mit dem Stand, den der Baum in diesem Moment hergibt.
- Bereich: `packages/shadow-objects/src/elements/propValueConverters.ts`, `ShaePropElement.ts`, `ShaeEntElement.ts`
- Hängt ab von: —
- Modell: stärkste Stufe (dokumentierte Verhaltensänderung an einem öffentlichen Custom Element; Begründung unten)
- Hash: `05cb1af`
- Nachtrag aus Zug 0 von Paket 9 (2026-08-19), geprüfte Überschneidung: keine. Paket 9 fasst von den Custom
  Elements allein `elements/ShaeWorkerElement.ts` an (der Getter `frameLoop`, drei Zeilen), dieses Paket
  `ShaePropElement.ts` und `ShaeEntElement.ts`. Auch in der Dokumentation treffen sie sich nicht: Paket 9
  schreibt einen eigenen Abschnitt vor `## Web Components` und ändert in der Tabelle von `<shae-worker>`
  eine Zeile. Keine Reihenfolge nötig, in keiner Richtung.

- Abgleich (Zug 0, 2026-08-19): Beide Befunde stehen, unangetastet. `git diff --stat d6e91f5 HEAD --
  packages/shadow-objects/src/elements/` meldet über die neun Commits dieses Laufs genau eine geänderte Datei,
  `ShaeWorkerElement.ts` mit vier Zeilen; `ShaePropElement.ts`, `ShaeEntElement.ts` und
  `propValueConverters.ts` sind zeichengleich mit `d6e91f5`. Die Zeilennummern des Audits stimmen trotzdem
  nicht mehr — zwischen dem 2026-08-14 und `d6e91f5` liegen drei View-Layer-Läufe, die beide Dateien
  verschoben haben. Heute gilt:
  - `PROP-NAN` (Rest) — **unverändert**. Der Konvertierungs-Effekt steht in
    `packages/shadow-objects/src/elements/ShaePropElement.ts:205-243` (Audit: `:170-310`), der `try`/`catch`
    darin in `:222-234`. Er fängt, was wirft — `JSON.parse`, `BigInt()` und die beiden BigInt-Array-Varianten —,
    meldet über `this.logger.error` und setzt den Wert auf `undefined`; damit ist die erste Hälfte der
    Empfehlung erfüllt. Die zweite fehlt vollständig: kein `Number.isNaN` im ganzen Modul. `NaN` erreicht
    die Entity aus 12 der 29 Konverter (`propValueConverters.ts:38`, `:40`, `:41-44`, `:47-52`) und wird
    aus weiteren 7 stillschweigend zu `0` (`:54-60`, die ganzzahligen Typed Arrays coercen `NaN` im
    Konstruktor), während `float32array`/`float64array` (`:61-62`) das `NaN` in den Puffer schreiben.
    Gemessen: `new Int8Array([NaN])[0] === 0`.
  - `ELEM-HOST-001` — **unverändert**. `findShadowRootHost()` steht in
    `packages/shadow-objects/src/elements/ShaeEntElement.ts:403-420` (Audit: `:188-205`). Der Aufstieg über
    `parentElement` bricht ohne Zuweisung ab, sobald der oberste Knoten der Kette gar keinen `parentNode`
    mehr hat — genau der Fall eines abgehängten Elements —, und `#shadowRootHost` behält seinen alten Wert,
    obwohl `#shadowRootHostNeedsUpdate` in `disconnectedCallback()` (`:537`) gesetzt wurde. Für ein Element
    im Dokument trägt die heutige Schleife zufällig: der oberste Knoten ist `<html>`, dessen `parentNode` ist
    `document`, und `document.host` ist `undefined`. Rot ist deshalb nur der abgehängte Fall — und zwar in
    zwei Ausprägungen, dem Element selbst entfernt und einem Vorfahren entfernt.
- Was der Abgleich zusätzlich ergibt, und was den Zuschnitt bestimmt (Zug 0, 2026-08-19): **Die heutige
  Lässigkeit ist an 15 Stellen festgeschrieben.** `packages/shadow-objects-testing/test/prop-element-types.test.js`
  führt einen Block `malformed input that does not throw` mit 15 Zeilen, 14 davon pinnen ein `NaN` oder die
  Null aus `new Int8Array([NaN])`; eine 16. Zeile im Trennmuster-Block (`['hex[]', '-ff 0a', [NaN, 255, 10]]`)
  benutzt ein `NaN` als Beweis dafür, dass `\W+` am Minuszeichen trennt. Dazu zwei Fälle in
  `packages/shadow-objects/src/elements/propValueConverters.spec.ts` (`number` mit `'12abc'`, `number[]` mit
  `'1.5abc 2'`). Und `docs/api-reference.md:1955-1956` sagt die Lässigkeit ausdrücklich zu: »Every other type
  is lenient by construction and reports nothing: the numeric ones yield `NaN`, the typed arrays yield a
  filled array.« Dieses Paket ändert eine zugesagte, geprüfte Eigenschaft — nicht eine, die niemand
  aufgeschrieben hat.
- Entwurf (Zug 0, 2026-08-19): **Der Guard sitzt im Konverter, nicht im Element.** Drei Gründe, in der
  Reihenfolge ihres Gewichts:
  1. Nur der Konverter sieht die Zahlen, bevor der Typed-Array-Konstruktor sie schluckt. `new Int8Array([NaN])`
     ist `[0]` — ein Element, das erst das Ergebnis prüft, kann sieben der 21 numerischen Zweige gar nicht
     erreichen. Die Empfehlung des Findings nennt `Number.isNaN`; sie deckt diese sieben nur, wenn die Prüfung
     vor der Konstruktion läuft.
  2. Das Element hat den Meldeweg bereits: der `try`/`catch` in `:222-234` meldet über `logger.error` und
     setzt `undefined`. Ein Konverter, der wirft, benutzt einen vorhandenen Pfad, statt einen zweiten daneben
     zu legen. Der Kommentar über dem Block sagt heute schon, was gelten soll: ungültige Eingabe ist ein
     Betriebsfall, kein Ausnahmezustand.
  3. `propValueConverters` ist intern. `src/index.ts` re-exportiert das Modul nicht, das `exports`-Objekt von
     `packages/shadow-objects/package.json` führt keinen Unterpfad dorthin und kein Platzhalter-Muster; der
     einzige Aufrufer der Funktionen ist der Effekt, `#readTypeAttribute` (`:401-403`) benutzt nur `has()`.
     Ein werfender Konverter erreicht damit niemanden außerhalb dieses Pakets.

  **Die Regel, in einem Satz:** Ein numerischer Zweig liefert eine Zahl oder er liefert nichts. `Number.isNaN`
  ist der Test, nicht »sieht aus wie eine Ziffernfolge« — `type="int" value="12abc"` bleibt `12`, weil
  `parseInt` eine Zahl liefert, und `type="number" value="NaN"` wird abgewiesen, weil das Ergebnis keine ist.
  `Infinity` ist eine Zahl und geht durch. Leere Abschnitte, die ein Trennmuster hinterlässt, bleiben `0`,
  wo `Number('')` sie erzeugt (`number[]`, `float[]`, `float32array`, `float64array`, `int16array` &c.), und
  werden abgewiesen, wo `parseInt('', base)` sie zu `NaN` macht (`int[]`, `hex[]`, `oct[]`, `bin[]`) — die
  beiden Trennmuster ziehen hier eine Grenze, und die gehört in die Doku, nicht in eine Sonderbehandlung.

  **Meldeweg: `error`, nicht `warn`.** Das Finding sagt »Warnung«, umgangssprachlich. Der vorhandene Pfad
  meldet auf `error`, und die Begründung steht als Kommentar an Ort und Stelle: `warn` hängt an
  `ConsoleLogger.sharedConfig.enable` und schweigt außerhalb von localhost, eine verworfene Property muss
  auch in Produktion sichtbar sein. Zwei Meldestufen für denselben Vorgang wären der schlechtere Handel.

  **Die Grenze, ausdrücklich:** `el.value = Number.NaN` über die JavaScript-Property geht weiterhin
  unverändert durch. Die Umrechnung greift nur für Strings — `docs/api-reference.md:1943` sagt das zu —, und
  ein Aufrufer, der eine Zahl übergibt, übergibt seinen eigenen Wert, keine Umrechnung. Dieses Paket macht
  daraus keinen Fall.

  **`findShadowRootHost()`** geht denselben Weg wie `getParentNodeForObserver()` (`:422-427`):
  `(this.getRootNode() as ShadowRoot)?.host` — ein Ausdruck statt einer Schleife, und er antwortet für jeden
  Baumzustand, weil `getRootNode()` immer einen Knoten liefert und `host` außerhalb einer Shadow Root
  `undefined` ist. Das Ergebnis wird bedingungslos zugewiesen; damit ist ein veralteter Wert nicht mehr
  erreichbar. Die einzige Aufrufstelle im Repo ist `#onSlotChange` (`:767`), und die läuft nur an einem
  verbundenen Element — die Änderung kann dort nichts verschieben.
- Triage der zugeschlagenen Nebenbefunde (Zug 0, 2026-08-19): **keine.** Der einzige Nachtrag, den frühere
  Pakete diesem hinterlassen haben, ist die Überschneidungsprüfung aus Zug 0 von Paket 9; sie ist kein
  Nebenbefund und oben gegen `git diff d6e91f5 HEAD -- …/elements/` erneut bestätigt. Ein Durchgang durch
  alle abgeschlossenen Pakete nach »→ Paket 10« bleibt ohne Treffer.
- Modell-Begründung (Zug 0): **stärkste Stufe statt der mittleren aus dem Grobplan.** Der Grund ist nicht der
  Umfang — der Guard sind zwölf Zeilen —, sondern was hier zusammenfällt: eine Verhaltensänderung an einem
  öffentlichen, dokumentierten Custom Element, die den gezählten Kopf des Changelogs bewegt, und 16
  vorhandene Testfälle, die den alten Zustand pinnen und in derselben Bewegung umgeschrieben werden. Genau
  dort liegt die Falle: Wer den Guard zuerst baut und danach die roten Fälle »nachzieht«, hat die
  Absicherung gegen sein eigenes Ergebnis geeicht statt gegen die Regel. Dazu die Feinheiten, an denen ein
  schneller Durchgang scheitert — die zwei Trennmuster mit ihren zwei Antworten auf einen leeren Abschnitt,
  die Funktionsidentität, an der der Alias-Test hängt, und die sieben Typed-Array-Zweige, die ohne Prüfung
  vor dem Konstruktor unsichtbar bleiben.
- Dateien:
  - `packages/shadow-objects/src/elements/propValueConverters.ts`
  - `packages/shadow-objects/src/elements/propValueConverters.spec.ts`
  - `packages/shadow-objects/src/elements/ShaePropElement.ts`
  - `packages/shadow-objects/src/elements/ShaeEntElement.ts`
  - `packages/shadow-objects-testing/test/prop-element-types.test.js`
  - `packages/shadow-objects-testing/test/ent-element-shadow-root-host.test.js` (neu)
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/docs/cheat-sheet.md`
  - `packages/shadow-objects/CHANGELOG.md`
  - `Backlog.md`

  Nicht dabei, und das ist geprüft: `packages/shadow-objects/README.md` beschreibt die Umrechnung nicht — sein
  einziges `<shae-prop>` (`:28`) trägt `type="int" value="1"`. Die Wurzel-`CHANGELOG.md` bleibt außen vor, hier
  ändert sich kein Build-Schritt und keine devDependency. `packages/shae-offscreen-canvas` wird nicht berührt.
- Vorgehen:
  1. **Die roten Fälle zuerst**, drei Dateien, und keine Zeile am Produktivcode, bevor sie rot gelaufen sind.

     a) `packages/shadow-objects/src/elements/propValueConverters.spec.ts`. Neue Gruppe
        `describe('numeric branches refuse a result that is not a number', …)`, tabellengetrieben wie der
        Rest der Datei: 21 Zeilen `[typeName, value]`, eine je bewachtem Konverter, jede als
        `expect(() => propValueConverters.get(type)!(value)).toThrow(TypeError)`. Die 21 Namen, in der
        Reihenfolge der Tabelle: `number`, `float`, `int`, `hex`, `oct`, `bin`, `number[]`, `float[]`,
        `int[]`, `hex[]`, `oct[]`, `bin[]`, `int8array`, `uint8array`, `uint8clampedarray`, `int16array`,
        `uint16array`, `int32array`, `uint32array`, `float32array`, `float64array`. Als Wert reicht
        `'abc'`, außer bei `oct` (`'9'`) und `bin` (`'2'`), wo die Ziffer außerhalb der Basis der schärfere
        Fall ist. Dazu zwei grüne Randfälle, die die Regel abgrenzen:
        `lets Infinity through, because it is a number` (`number` mit `'Infinity'`) und
        `counts an empty segment as zero where the split leaves one` (`number[]` mit `' 1 2 '` → `[0, 1, 2, 0]`).
        Zwei vorhandene Fälle werden umgeschrieben, weil sie sonst die alte Lässigkeit pinnen: `it('number')`
        prüft künftig `'42.5'` → `42.5` statt `'12abc'` → `NaN`, `it('number[]')` prüft `'1 2'` → `[1, 2]`
        statt `'1.5abc 2'` → `[NaN, 2]`. Beide sind vorher wie nachher grün; ihre bisherige Aussage lebt in
        der neuen Gruppe weiter. `it('int, integer')` bleibt Wort für Wort stehen — `'12abc'` → `12` ist die
        Lässigkeit, die *bleibt*, und der Kommentar daneben wird um den Satz ergänzt, warum sie bleibt.
        Unangetastet: `answers to 42 type names, in this order`, `has one converter per branch, 29 in all`
        und der Alias-Test.
        Datei danach: 33 → **56** Fälle, davon **21 rot**.

     b) `packages/shadow-objects-testing/test/prop-element-types.test.js`. Der Block
        `malformed input that does not throw` verliert seinen Namen und seine Aussage: er heißt künftig
        `numeric input without a number is reported and cleared` und prüft je Zeile
        `expect(prop.value).to.be.undefined` — 14 Zeilen (`number`/`'abc'`, `float`/`'abc'`, `int`/`'abc'`,
        `hex`/`'zz'`, `oct`/`'9'`, `bin`/`'2'`, `number[]`/`'a b'`, `float[]`/`'a b'`, `int[]`/`'a b'`,
        `hex[]`/`'zz'`, `oct[]`/`'9'`, `bin[]`/`'2'`, `int8array`/`'a b'`, `float32array`/`'a b'`). Die
        15. Zeile, `bool`/`'nonsense'` → `false`, wandert in einen eigenen kleinen Block
        `lenient branches that convert anything` — sie hat mit Zahlen nichts zu tun und ist weiterhin grün.
        Im Trennmuster-Block wird `['hex[]', '-ff 0a', [NaN, 255, 10]]` zu `['hex[]', '0-ff 0a', [0, 255, 10]]`:
        derselbe Beweis (drei Elemente, kein Vorzeichen), ohne ein `NaN` als Kronzeugen.
        Vier neue Fälle:
        - `type="number" value="NaN" is reported and cleared` — die Regel prüft das Ergebnis, nicht die
          Schreibweise der Eingabe.
        - `type="number" value="Infinity" reaches the entity` — die Gegenprobe dazu.
        - `type="int" value="12abc" stays lenient` — `parseInt` liefert eine Zahl, also bleibt es bei `12`.
        - `the numeric failure is reported through the ConsoleLogger` — gebaut wie der vorhandene
          json-Fall (`ConsoleLogger.sharedConfig.enable = false`, `sinon.stub(console, 'error')`, gezählt
          werden die Aufrufe, deren Argumente den Typnamen `"number"` enthalten): genau ein Bericht.
        Datei danach: 111 → **115** Fälle, davon **16 rot** (die 14 umgestellten Zeilen, der `NaN`-Fall und
        der Logger-Fall). Die drei anderen neuen Zeilen sind schon heute grün und bleiben es.

     c) Neu: `packages/shadow-objects-testing/test/ent-element-shadow-root-host.test.js`, vier Fälle in einer
        Gruppe `describe('shae-ent and the host of its shadow root', …)`. Aufbau wie die übrigen
        `ent-element-*`-Dateien: `import {expect} from '@esm-bundle/chai'`, `'@spearwolf/shadow-objects/shae-ent.js'`,
        `mount`/`unmountAll` aus `../src/mount.js`, `afterEach(() => unmountAll())`. Ein Kopfkommentar sagt,
        warum die Datei in echtem Chromium läuft und nicht als Unit-Spec: `attachShadow` samt der Frage, was
        `getRootNode()` an einem abgehängten Knoten antwortet, ist genau die Mechanik, die happy-dom nicht
        verlässlich nachbildet.
        1. grün — `answers the host of the shadow root it sits in`.
        2. **rot** — `answers nothing after the element has left the tree`: Element aus der Shadow Root
           entfernen, danach `findShadowRootHost()` — heute steht der alte Host da, weil die Schleife ohne
           Zuweisung abbricht.
        3. **rot** — `answers nothing after an ancestor has left the tree`: das `<shae-ent>` sitzt in einem
           `<div>` innerhalb der Shadow Root, entfernt wird das `<div>`. Dieselbe Ursache, anderer Weg
           dorthin — hier hat das Element noch einen `parentElement`, und die Schleife bricht eine Ebene
           höher ab.
        4. grün — `answers nothing for an element that sits in the document`. Die Zusicherung, die heute
           zufällig trägt (`document.host` ist `undefined`) und nach der Umstellung aus der Sache folgt.

  2. **Der Guard: `packages/shadow-objects/src/elements/propValueConverters.ts`.** Ein Helfer und drei
     angepasste Fabriken, die Tabelle behält ihre Form:
     - `const assertNumber = (value: number, token: string): number => { if (Number.isNaN(value)) throw new
       TypeError(\`not a number: "${token}"\`); return value; };` — der Token, nicht der ganze Attributwert,
       damit die Meldung bei einer Liste sagt, *welcher* Abschnitt nicht trägt.
     - `toNumber(parse)` für die skalaren Zweige, `toNumberList(parse, split)` für die Listen,
       `toNumericArray(Ctor, split)` prüft künftig vor dem Konstruktor. `toRadix(base)` und `toRadixList(base)`
       bleiben als Namen erhalten und bauen auf den beiden neuen auf.
     - Die Zeilen der Tabelle: `:38` `number` wird `toNumber(Number)`, `:40` `float` wird `toNumber(parseFloat)`,
       `:41-44` gehen über das umgebaute `toRadix`, `:47-49` über `toNumberList`, `:50-52` über `toRadixList`,
       `:54-62` über das umgebaute `toNumericArray`. `bigint`, die beiden BigInt-Arrays, `bool`, die
       String-Listen und `json` bleiben unangetastet — die werfen schon oder können kein `NaN` erzeugen.
     - **Auflage:** jede Zeile baut ihren Konverter mit *einem* Aufruf. Zwei Alias-Namen zeigen weiterhin auf
       dasselbe Funktionsobjekt, sonst fallen `has one converter per branch, 29 in all` und der Alias-Test.
     - Ein Kommentar über dem Helfer sagt, warum die Prüfung hier steht und nicht beim Aufrufer: der
       Typed-Array-Konstruktor macht aus `NaN` eine `0`, danach ist der Fehler nicht mehr sichtbar.

  3. **`packages/shadow-objects/src/elements/ShaePropElement.ts`** — keine Logikänderung, ein Kommentar. Der
     Block über dem `try` (`:220-221`) bekommt einen zweiten Satz: ein numerischer Zweig wirft, wenn seine
     Umrechnung keine Zahl ergibt, und läuft damit denselben Weg wie ein malformiertes JSON. Die
     Meldezeile (`:228-232`) bleibt, wie sie ist — ihr Text trägt beide Fälle.

  4. **`packages/shadow-objects/src/elements/ShaeEntElement.ts:403-420`.** `findShadowRootHost()` wird zu einer
     Zuweisung ohne Schleife:
     `this.#shadowRootHost = (this.getRootNode() as ShadowRoot)?.host as HTMLElement | undefined;` innerhalb
     des `#shadowRootHostNeedsUpdate`-Zweigs, danach `return this.#shadowRootHost;`. Ein Kommentar in der
     Machart des Nachbarn in `:423-425`: `getRootNode()` antwortet für jeden Zustand, und außerhalb einer
     Shadow Root gibt es keinen Host — die Zuweisung läuft deshalb auch dann, wenn nichts gefunden wurde.
     `#shadowRootHostNeedsUpdate` bleibt, wo es ist (`:429-430`, `:529`, `:537`); der Zwischenspeicher ist
     die Kostenbremse für `#onSlotChange` und wird nicht angefasst.

  5. **Dokumentation.**
     - `docs/api-reference.md`, Abschnitt `#### Invalid Values` (`:1948-1963`): Der Satz »Every other type is
       lenient by construction and reports nothing: the numeric ones yield `NaN`, the typed arrays yield a
       filled array.« wird ersetzt. Was stattdessen dasteht: Ein numerischer Typ liefert eine Zahl oder
       nichts — ergibt die Umrechnung `NaN`, ist der Fall derselbe wie ein malformiertes JSON, Meldung auf
       `error` und Property auf `undefined`. Dazu die drei Sätze, die den Rand beschreiben: `parseInt` bleibt
       lässig, solange eine Zahl herauskommt (`type="int" value="12abc"` ist `12`); `Infinity` ist eine Zahl;
       ein leerer Abschnitt aus dem Trennmuster ist `0`, wo `Number()` ihn liest, und kein gültiger Wert, wo
       `parseInt()` ihn liest, weshalb `type="hex[]" value="-ff 0a"` nichts setzt. Der Absatz über den
       unbekannten *Typnamen* bleibt unberührt.
     - `docs/api-reference.md`, Zeile `:1652` (`findShadowRootHost()` in der JavaScript-API-Tabelle von
       `<shae-ent>`): Der Text sagt bereits das Richtige (»or `undefined` outside one«) und bekommt einen
       Halbsatz, der ihn scharf macht — die Antwort wird neu bestimmt, sobald das Element den Baum betritt
       oder verlässt, ein Element außerhalb des Baums steht in keiner Shadow Root.
     - `docs/cheat-sheet.md:298-301` (»Two failures, two channels«): derselbe Eingriff in kurz — ein
       numerischer Typ, dessen Ergebnis keine Zahl ist, gehört in den ersten der beiden Kanäle. Ein Satz, nicht
       mehr; das Blatt ist ein Spickzettel.

  6. **`packages/shadow-objects/CHANGELOG.md`**, Abschnitt `[Unreleased]`:
     - Ein Eintrag **Breaking (custom elements)** für die numerische Umrechnung: was gilt, welche Typen es
       betrifft, wo die Lässigkeit bleibt, und dass die Meldung auf `error` läuft.
     - Ein Eintrag **Bugfix (custom elements)** für `findShadowRootHost()`: ein Element außerhalb des Baums
       nennt keinen Host mehr.
     - Der gezählte Kopf steht bei **29** und geht auf **30** — im Fließtext ausgeschrieben, »Twenty-nine«
       wird »Thirty«. Das neue Glied ist die numerische Umrechnung: wer heute `type="number"` mit einer
       unlesbaren Eingabe fährt, bekommt `NaN` in der Entity und künftig keine Property. Der Versatz zwischen
       Kopfzahl und Semikolon-Gliedern (29 zu 31, festgestellt in Zug 3 von Paket 9) bleibt, wie er ist — es
       kommt genau ein Glied dazu und die Zahl steigt um genau eins.
     - `findShadowRootHost()` bekommt **kein** Glied im Kopf: `docs/api-reference.md:1652` sagt seit jeher
       `undefined` außerhalb einer Shadow Root zu, der Eingriff macht die Zusage wahr, statt eine neue zu
       geben.

  7. **`Backlog.md`**, zwei Stellen:
     - `:219` (`VIEW-12`) wird durchgestrichen und bekommt seinen Erledigt-Satz: die numerischen Konverter
       liefern eine Zahl oder werfen, das Element meldet und räumt die Property ab; benannt werden die
       Grenze zu `parseInt` und die beiden Antworten auf einen leeren Abschnitt.
     - `:304` (Testabdeckung `<shae-prop>`) — der Halbsatz »die fehlertoleranten und die vier fehlschlagenden
       Eingaben« stimmt danach nicht mehr; er wird auf den neuen Stand gezogen (die vier werfenden Eingaben
       und die numerischen, die keine Zahl ergeben) und die neue Datei `ent-element-shadow-root-host.test.js`
       kommt in `:305` zur Aufzählung der `<shae-ent>`-Dateien.
- Verify:
  1. **Rot zuerst**, drei Läufe, jeder vor dem Schritt, der ihn grün macht:
     - `pnpm -F @spearwolf/shadow-objects exec vitest src/elements/propValueConverters.spec.ts --run` vor
       Schritt 2 — erwartet **21 rot / 35 grün von 56**. Fehlerart durchgängig dieselbe:
       `AssertionError: expected function to throw an error, but it didn't`. Wer hier eine andere Meldung
       sieht, hat einen Testfall gebaut, der aus einem anderen Grund fällt.
     - `pnpm -F shadow-objects-testing exec vitest test/prop-element-types.test.js --run` vor Schritt 2 —
       erwartet **16 rot / 99 grün von 115**. Fehlerarten getrennt zu berichten: 12 Zeilen fallen mit
       `expected NaN to be undefined`, `int8array`/`'a b'` mit `expected Int8Array[0,0] to be undefined`,
       `float32array`/`'a b'` ebenso mit einem `Float32Array`, `number`/`'NaN'` mit `expected NaN to be
       undefined`, und der Logger-Fall mit `reports naming the type: expected [] to have a length of 1 but
       got 0`.
     - `pnpm -F shadow-objects-testing exec vitest test/ent-element-shadow-root-host.test.js --run` vor
       Schritt 4 — erwartet **2 rot / 2 grün von 4**, beide roten mit `expected <div ...> to be undefined`.
  2. **Grün danach.** Dieselben drei Kommandos nach Schritt 4: 56, 115, 4.
  3. Von der Wurzel `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`. `lint:ci` bleibt bei den
     2 bekannten Infos. Die Gesamtzahl geht von **851** auf **882**: Kernpaket 510 → **533** (23 neue Fälle in
     `propValueConverters.spec.ts`), `shadow-objects-testing` 334 → **342** (4 neue in
     `prop-element-types.test.js`, 4 in der neuen Datei; die Zahl der Testdateien 23 → 24),
     `shae-offscreen-canvas` unverändert **7**.
  4. `pnpm -F shadow-objects-e2e test` — **402** Fälle in Chromium und Firefox, unverändert. Geprüft, warum:
     die zehn `<shae-prop type=…>` der e2e-Seiten tragen ausschließlich lesbare Zahlen
     (`bundle-tests.js:70` `value="5"`, `bundle.html:26` `value="1 2 3"`, `async-events.html:18,24,26,38` und
     `multi-env.html:27,32,37` je eine ganze Zahl); der einzige andere Typ ist `boolean` mit `value="no"`.
     Keine Seite fährt eine Eingabe, die der Guard abweist.
  5. **Auslieferung.** `find packages/shadow-objects/dist -type f | sort` vor und nach dem Build: dieselben
     **198** Dateien, keine neue Quelldatei und keine gelöschte. `dist/package.json` bleibt zeichengleich —
     dieses Paket legt keinen Unterpfad an. `packages/shae-offscreen-canvas/.npm-pkg` bleibt bei **20**, das
     Paket wird nicht berührt. In den `.d.ts` ändert sich nichts: `PropValueConverter` behält seine Signatur,
     `findShadowRootHost()` seinen Rückgabetyp.
  6. **Von Hand, kurz.** In einer Seite mit `<shae-prop name="n" type="number" value="abc">` muss die Konsole
     genau eine Fehlermeldung führen und die Entity keine Property `n` bekommen; mit `value="12abc"` und
     `type="int"` muss `12` ankommen. Das ist der Nachweis, dass Meldeweg und Grenze in einem echten Browser
     dasselbe sagen wie die Specs — die vitest-Browser-Fälle laufen in Chromium, aber gegen den
     Quellbaum, nicht gegen das Bundle.
- Commit: `fix(elements)!: a numeric value that is not a number is reported and cleared, and a detached element names no shadow host`
- Ergebnis (2026-08-19, `05cb1af`, 10 Dateien): Jeder numerische Zweig von `<shae-prop>` liefert eine Zahl
  oder meldet und räumt ab — 21 bewachte Konverter, die Prüfung vor dem Typed-Array-Konstruktor, der Meldeweg
  über den vorhandenen `try`/`catch`. `findShadowRootHost()` antwortet aus `getRootNode()` statt aus einer
  Schleife und lässt keinen veralteten Zwischenspeicher zurück. Gesamtzahl 851 → **885** (534 + 7 + 344).
- Nebenbefunde (2026-08-19), gemeldet und nicht angefasst:
  - `packages/shadow-objects-testing/test/prop-element-types.test.js:207-211` — `reportCases` prüft den
    JS-Property-Pfad nur für `bigint`, `json` und die beiden BigInt-Arrays, für keinen numerischen Typ.
    Derselbe Effekt trägt beide Pfade, das Risiko ist entsprechend klein. → nächstes Audit.
  - `packages/shadow-objects/src/elements/ShaeEntElement.ts` — ein nie verbundenes Element bekommt keinen
    Lifecycle-Callback, `#shadowRootHostNeedsUpdate` wird nur in `connectedCallback`/`disconnectedCallback`
    gesetzt. Aus dem Repo heraus nicht erreichbar: der einzige Aufrufer `#onSlotChange` hängt an einem
    Listener, den `connectedCallback` bindet. → nächstes Audit.
  - `shadow-objects-testing` löst `@spearwolf/shadow-objects` über dessen `dist` auf. Ein gezielter
    vitest-Aufruf ohne vorherigen Build misst gegen den letzten Build statt gegen den Quellbaum; über
    `turbo` ist es gedeckt, weil `test` an `build` hängt. Vorbestehend, Eigenschaft des Setups.
- Folgen (2026-08-19): keine. Was dieses Paket ändert, bleibt in `elements/` und in der Doku dazu.
- Schnittstellen (2026-08-19): Paket 11 hängt an `RemoteWorkerEnv.ts` und `WorkerRuntime.ts`, im Code keine
  Überschneidung; seine Anker in `docs/api-reference.md` (`:1370`, `:1476`) liegen vor den Stellen, die dieses
  Paket verlängert hat, die Zeilennummern verschieben sich also nicht. Paket 12 erbt die Kopfzahl des
  Changelogs, die jetzt bei **30** steht, und einen Konsistenz-Kandidaten: `ShaeEntElement.ts` trägt
  `(this.getRootNode() as ShadowRoot)?.host` nun zweimal, in `findShadowRootHost()` und in
  `getParentNodeForObserver()`.
- Verlauf:
  - Zug 0 (2026-08-19): Detailplan steht. Zwei Abweichungen vom Grobplan, beide begründet: die Modellstufe
    geht von der mittleren auf die stärkste, und `propValueConverters.ts` kommt in den Bereich — ohne die
    Prüfung vor dem Typed-Array-Konstruktor bleiben sieben der 21 numerischen Zweige unerreichbar. Die fünf
    Rückfragen sind vom Orchestrator entschieden und stehen datiert unter »Entscheidungen«; `findShadowRootHost()`
    bekommt kein Glied im gezählten Kopf.
  - Zug 1 (2026-08-19): Umgesetzt. Rot vorher wie geplant: 21/56 im Konverter-Spec (durchgängig
    »expected function to throw«), 16/115 in `prop-element-types.test.js` (7 × `expected NaN to be
    undefined`, 4 × `[NaN, NaN]`, 3 × `[NaN]`, 1 × `[0, 0]` aus dem Typed Array, 1 × die fehlende
    Logger-Meldung), 2/4 in der neuen Datei zum Shadow-Host. Grün danach 56, 115, 4; Wurzel-Lauf
    **882** (533 + 7 + 342, 24 Testdateien in der Integration), e2e 402, `dist` unverändert bei 198
    Dateien und `dist/package.json` byte-gleich. Handdurchgang gegen `dist/bundle.js` in echtem
    Chromium: genau eine Fehlermeldung, der Change Trail der Entity mit `type="number" value="abc"`
    führt kein `properties`-Feld, die Nachbar-Entity mit `type="int" value="12abc"` bekommt `12`.
    Eine Abweichung, und sie korrigiert einen Fehler im Plan: Schritt 1a gab `'abc'` als Eingabewert
    vor, was für `hex`/`hex[]` nicht aufgeht — `parseInt('abc', 16)` ist 2748, eine Zahl, die beiden
    Zeilen wären nach dem Guard rot geblieben. Genommen wurde `'zz'`, der Wert, den Schritt 1b für
    dieselben zwei Typen selbst vorsieht; Rot-Zahl und Fehlerart bleiben.
    Nebenbefund, vorbestehend und im Setup begründet: `shadow-objects-testing` löst das Kernpaket über
    dessen `dist` auf, ein gezielter vitest-Aufruf ohne vorherigen Build misst gegen den letzten Build
    statt gegen den Quellbaum. Über `turbo` ist das gedeckt, im Verify-Schritt 2 des Plans stehen aber
    nur die drei vitest-Kommandos — wer sie einzeln fährt, baut dazwischen.
  - Zug 3 (2026-08-19): Review, stärkste Stufe. Der Guard trägt: alle 29 Konverter über 38 Eingaben
    tabellarisch vor und nach dem Diff gemessen — **null** `NaN`-Escapes, 154 veränderte Zellen und in
    jeder stand vorher ein `NaN` oder die `0`, die der Ganzzahl-Konstruktor daraus machte; `Infinity`,
    `-0`, `1e400`, `'  7  '`, `'0x1f'`, `'12abc'` gehen unverändert durch. Alle 21 numerischen Zweige
    sind vor dem Typed-Array-Konstruktor geprüft, die 8 übrigen können kein `NaN` erzeugen. Die 29
    Funktionsobjekte der Tabelle bleiben 29, der Alias-Test vergleicht mit `toBe`. Der Meldeweg liefert
    genau einen Bericht mit Typname im Text und Rohwert im Objekt; eine Wiederholung desselben schlechten
    Werts meldet nicht erneut, weil `valueIn$` sich nicht ändert. `findShadowRootHost()` in echtem
    Chromium gegen den alten Ausdruck gehalten: übereinstimmend für offene, geschlossene und
    verschachtelte Shadow Roots, Dokument und abgehängtes Fragment, abweichend allein in den beiden
    Entfernungsfällen — dort lieferte der alte Weg den Zwischenspeicher, der neue `undefined`.
    Changelog-Kopf 29 → 30, Versatz zu den Semikolon-Gliedern unverändert.
    Urteil: **nicht commit-fähig**, wegen der Doku (siehe Zug 4).
  - Zug 4 (2026-08-19), vier benannte Korrekturen, zurück an denselben Implementierer:
    1. `docs/api-reference.md:1965-1966` führt `float[]` in der `Number()`-Gruppe, deren leerer Abschnitt
       `0` ergibt. `float[]` läuft über `parseFloat`, und `parseFloat('')` ist `NaN` — der Konverter weist
       ab. Gemessen: `float[]` mit `" 1 2 "` wirft, `number[]` liefert `[0,1,2,0]`; über
       `<shae-prop type="float[]" no-trim value=" 1.5 2.5 ">` erreichbar. Der Fehler stammt aus diesem
       Detailplan und ist unbesehen in die Doku gewandert. Der Code bleibt, die Doku zieht nach, und die
       ganze Aufzählung wird Zweig für Zweig gegen den Code geprüft statt nur ein Name verschoben.
    2. `type="hex[]" value="-ff 0a"` ist in `docs/api-reference.md:1967` der Kronzeuge für die Grenze —
       und hat seit dem Umschreiben der Trennmuster-Zeile keinen Test mehr. Im ganzen Repo führt keine
       Zeile einen leeren Abschnitt durch einen `parseInt`-Zweig. Der Fall wird nachgetragen, und der
       Querverweis im Kommentar von `propValueConverters.spec.ts:283-285`, der auf drei Zeilen mit
       nicht-leeren Token zeigt, auf das nachgezogen, was danach dasteht.
    3. Die skalare Entsprechung derselben Grenze steht nirgends: `type="int" value="   "` wird nach dem
       Trim zu `''` und fällt, während die Attributtabelle (`:1904`) für `type="number" value="   "` eine
       `0` zusagt. Ein Satz und ein Testfall.
    4. Zwei umgeschriebene Spec-Fälle haben ihre Unterscheidungskraft verloren, in einem Block, der »one
       distinguishing value per branch« verspricht: `it('number')` prüft `'42.5'`, was `Number` nicht von
       `parseFloat` trennt, `it('number[]')` mit `'1 2'` trennt gar nichts. `'0x1f'` → `31` ist der Wert,
       der grün bleibt und trotzdem trennt.
    Ausdrücklich nicht angefasst und damit entschieden: `reportCases` deckt den JS-Property-Pfad weiterhin
    nur für die werfenden Typen ab (derselbe Effekt); ein veralteter `#shadowRootHost` an einem nie
    verbundenen Element ist aus dem Repo heraus nicht erreichbar, weil der einzige Aufrufer an einem
    Listener aus `connectedCallback` hängt; die e2e-Seiten bleiben unberührt.

**PROP-NAN · Typkonvertierung in <shae-prop> wirft und prüft nicht auf NaN · medium · packages/shadow-objects/src/elements/ShaePropElement.ts:170-310**
Der Konvertierungsblock läuft ungeschützt: 'json' ruft JSON.parse auf einen Attributwert, 'bigint' und die BigInt-Array-Varianten rufen BigInt() — beide werfen bei ungültiger Eingabe, und zwar innerhalb eines signalize-Effekts, wo der Fehler die Reaktivitätskette trifft statt den Aufrufer. Die numerischen Typen werfen zwar nicht, liefern aber stillschweigend NaN an die Entity, wo es als gültiger Wert weiterläuft.
Empfehlung: Den Konvertierungsblock in try/catch legen, im Fehlerfall über den Logger warnen und undefined liefern. Für die numerischen Pfade zusätzlich auf Number.isNaN prüfen — ein Attribut, das keine Zahl ist, sollte eine Warnung erzeugen und nicht NaN durchreichen.
*Fundstelle heute: der Effekt steht in `ShaePropElement.ts:205-243`, der try/catch darin in `:222-234` — die erste Hälfte der Empfehlung ist erfüllt, im Scope steht nur der Rest. Die zweite Hälfte wird umgesetzt und um eine Stelle erweitert: die Prüfung sitzt in `propValueConverters.ts` und läuft vor dem Typed-Array-Konstruktor, weil `new Int8Array([NaN])` gleich `[0]` ist und sieben der 21 numerischen Zweige einem Test am Ergebnis sonst gar nicht sichtbar sind. Gemeldet wird auf `error` statt `warn`, dem vorhandenen Pfad folgend: `warn` hängt an `ConsoleLogger.sharedConfig.enable` und schweigt außerhalb von localhost.*

**ELEM-HOST-001 · findShadowRootHost() lässt einen veralteten Host stehen · low · packages/shadow-objects/src/elements/ShaeEntElement.ts:188-205**
Die Methode trägt dasselbe Cast-Muster wie die benachbarte Elternknoten-Suche (current.parentNode as ShadowRoot, root.host as HTMLElement), wirft aber nicht und fiel deshalb aus der Nullreferenz-Prüfung heraus. An einem abgehängten Element läuft die Neuberechnung ins Leere, und #shadowRootHost behält seinen alten Wert, obwohl #shadowRootHostNeedsUpdate gesetzt war.
Empfehlung: Die Suche denselben Weg gehen lassen wie getParentNodeForObserver(): über getRootNode(), mit undefined als möglichem Ergebnis — und #shadowRootHost auch dann überschreiben, wenn nichts gefunden wurde.
*Fundstelle heute: `ShaeEntElement.ts:403-420`, `getParentNodeForObserver()` in `:422-427`. Die Empfehlung wird Wort für Wort umgesetzt. Rot ist allein der abgehängte Fall, in zwei Ausprägungen: das Element selbst entfernt und ein Vorfahre entfernt. Für ein Element im Dokument trägt die heutige Schleife zufällig — der oberste Knoten ist `<html>`, dessen `parentNode` ist `document`, und `document.host` ist `undefined`; nach der Umstellung folgt dieselbe Antwort aus der Sache statt aus dem Zufall.*

### [x] 11. Worker-Timeouts konfigurierbar
- Findings: TIMEOUT-CFG (low)
- Ziel: Die vier Timeouts kommen aus einem Optionsobjekt am Konstruktor von `RemoteWorkerEnv` und aus vier Attributen an `<shae-worker>`; die Konstanten bleiben die Vorgabe, und ein Wert, der keine Millisekundenzahl größer null ist, wird gemeldet und verworfen.
- Bereich: `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`, `elements/ShaeWorkerElement.ts`, `elements/constants.ts`, `utils/attr-utils.ts`, `docs/`, `CHANGELOG.md`, `Backlog.md`, dazu je ein Fall in `shadow-objects-testing` und in der e2e-Seite `shae-worker`
- Hängt ab von: Paket 5 (erledigt, `1390e26`)
- Modell: stärkste Stufe (öffentliche API; Begründung unten)
- Hash: `9039469`
- Nachtrag aus Zug 0 von Paket 5 (2026-08-19): Die Abhängigkeit steht weiterhin, und der Schnitt von
  Paket 5 macht sie eher leichter. Die vier Nahtstellen sind die vier `waitForMessageOfType`-Aufrufe in
  `view/RemoteWorkerEnv.ts` (`start()`, `applyChangeTrail()`, `importScript()`, `destroy()`); an dreien
  bleibt es nach Paket 5 bei einem ausgetauschten Argument. Der vierte, `destroy()`, hängt danach ein
  `.catch()` vor sein `.finally()` — auch dort ist es ein Argument, nur eine Zeile weiter oben. Zusätzlich
  wandert der Timeout in `applyChangeTrail()` in den `waitForConfirmation`-Zweig, steht also nur noch an
  einer Stelle statt in einem Ausdruck, der beide Fälle bedient.
- Auflage aus Zug 0 von Paket 5 (2026-08-19), eine Grenze, die dieses Paket beim Öffnen der Werte
  einziehen muss: `utils/waitForMessageOfType.ts:38` legt für `timeout === 0` und `timeout === Infinity`
  gar keinen Timer an. Ein so gesetzter Destroy-Timeout ließe `destroy()` auf eine Bestätigung warten,
  die nie kommt, und der Worker liefe bis zum Ende der Seite weiter — der `terminate()`-Aufruf hängt an
  eben dieser Kette. Entweder werden die beiden Werte für den Destroy-Timeout abgewiesen, oder `destroy()`
  bekommt einen von der Konfiguration unabhängigen Weg zum `terminate()`. Das ist eine Entscheidung dieses
  Pakets, keine Folge.
- Nachtrag aus Zug 0 von Paket 10 (2026-08-19), geprüfte Überschneidung: im Code keine. Paket 10 fasst von
  den Custom Elements `ShaePropElement.ts`, `ShaeEntElement.ts` und die Konvertertabelle daneben an, dieses
  Paket `ShaeWorkerElement.ts`. In der Dokumentation teilen sich beide zwei Dateien, aber keinen Abschnitt:
  dieses Paket schreibt in `docs/api-reference.md` unter `### Worker Timeout Constants` (`:1370`) und in der
  Attributtabelle von `<shae-worker>` (`:1476`), Paket 10 unter `<shae-ent>` (`:1652`) und `<shae-prop>`
  (`:1948-1963`). Beide Anker dieses Pakets liegen *vor* den Stellen, die Paket 10 verlängert — die
  Zeilennummern, die hier stehen, verschieben sich also nicht. Im Changelog schreiben beide in denselben
  `[Unreleased]`-Abschnitt: der gezählte Kopf steht nach Paket 10 bei **30**, und ein Optionsobjekt mit den
  Konstanten als Defaults ist additiv und zählt nicht mit.

- Abgleich (Zug 0, 2026-08-19): Das Finding steht **unverändert**, an derselben Stelle, die das Audit
  nennt. `git diff --stat d6e91f5 HEAD -- packages/shadow-objects/src/constants.ts
  packages/shadow-objects/src/utils/waitForMessageOfType.ts` ist über die zehn Commits dieses Laufs leer:
  beide Dateien sind zeichengleich mit dem Stand vor dem Lauf. Die vier Konstanten stehen weiterhin in
  `constants.ts:43-46` — `WorkerLoadTimeout = 60000`, `WorkerConfigureTimeout = 60000`,
  `WorkerChangeTrailTimeout = 5000`, `WorkerDestroyTimeout = 5000` —, und kein Weg im Repository setzt
  einen von ihnen von außen.
  - Was Paket 5 an den Timeouts bewegt hat, Zeile für Zeile gegen
    `git show d6e91f5:packages/shadow-objects/src/view/RemoteWorkerEnv.ts` gehalten: **die Zeilennummern und
    genau eine Struktur.** Der Load-Handshake stand bei `:180`, steht heute bei `:189` — Argument
    unverändert. Der Configure-Wartelauf stand bei `:260`, steht bei `:275`. Der Destroy-Wartelauf stand bei
    `:287` als `waitForMessageOfType(...).finally(...)`, steht bei `:305` und hat ein `.catch()` zwischen
    Wartelauf und `.finally()` — das Argument sitzt unverändert im Aufruf. Die einzige echte Verschiebung
    ist der Change-Trail-Timeout: er stand bei `:236` in einem `if (waitForConfirmation)`-Zweig, der einem
    gemeinsamen `postMessage` nachgestellt war, und steht heute bei `:251`, nachdem die
    Nicht-Bestätigungs-Variante bei `:235-238` vorher aussteigt. Für dieses Paket heißt das: vier
    Argumente, vier Zeilen, kein Umbau. Was Paket 5 zusätzlich einzieht und dieses Paket erbt, ist der
    `#workerFailure`-Controller, dessen Signal drei der vier Aufrufe mitbekommen (`:189`, `:259`, `:281`) —
    die Timeouts sind seither der letzte Ausweg und nicht der einzige, und das steht so schon in
    `Backlog.md:128`. Der vierte, `destroy()`, fährt bewusst ohne Signal; genau deshalb hat die Auflage oben
    Zähne.
  - Was durch die Pakete 1 bis 10 **nicht** erledigt ist: nichts an diesem Finding. Kein Paket hat einen
    Konfigurationsweg gebaut, keines hat einen der vier Werte angefasst.
  - Eine Korrektur an der Schnittstellenzeile von Paket 10 (`:4205`): dort steht, dieses Paket hänge an
    `RemoteWorkerEnv.ts` **und `WorkerRuntime.ts`**. Die Worker-Seite kennt keinen Timeout —
    `grep -rn -i timeout packages/shadow-objects/src/worker/` trifft eine einzige Kommentarzeile
    (`MessageRouter.ts:165`, über den Destroy-Timeout der View-Seite). `worker/` wird von diesem Paket nicht
    berührt.
  - `utils/waitForMessageOfType.ts` bleibt unverändert. Sein Vorgabewert `timeout = 1000` (`:11`) erreicht
    keinen der vier Aufrufe — alle vier übergeben ihr Argument.

- Triage der zugeschlagenen Nebenbefunde (Zug 0, 2026-08-19): **einer**, und er ist keine Nachlässigkeit,
  sondern die Auflage aus Paket 5.
  | Posten | Symptom heute | Herkunft | Verbleib |
  | --- | --- | --- | --- |
  | `0`/`Infinity` legen keinen Timer an (`waitForMessageOfType.ts:38`) | Heute folgenlos: kein Aufrufer setzt einen der beiden Werte, alle vier Argumente sind Konstanten größer null. Das Öffnen der Werte macht ihn erreichbar — ein `destroyTimeout` von `0` oder `Infinity` ließe `destroy()` auf eine Bestätigung warten, die ein toter Worker nie schickt, und der `terminate()` am Ende der Kette (`RemoteWorkerEnv.ts:313`) käme nie. | **Vorbestehend.** `git show d6e91f5:packages/shadow-objects/src/utils/waitForMessageOfType.ts` trägt die Bedingung zeichengleich; `git diff d6e91f5 HEAD -- …/waitForMessageOfType.ts` ist leer. Keine Folge dieses Laufs. | **Bleibt hier** und wird von diesem Paket geschlossen — nicht in `waitForMessageOfType`, sondern am Eingang: siehe Schritt 2. Die Funktion behält ihr Verhalten, weil sie es für ihre eigenen Aufrufer außerhalb dieses Pakets nicht ändern soll. |

  Der zweite Nachtrag (Paket 10, geprüfte Überschneidung) meldet keinen Befund, sondern ihre Abwesenheit —
  in Zug 0 nachgeprüft und bestätigt: die drei genannten Anker (`:1370`, `:1476`) liegen unverändert dort,
  wo sie stehen sollen, und `ShaeWorkerElement.ts` ist von Paket 10 nicht berührt worden.

- Die API-Frage, ausdrücklich beantwortet (Zug 0, 2026-08-19). Sie ist der Kern dieses Pakets, also steht
  die Antwort vor dem Vorgehen und nicht darin.

  **Welche Timeouts es gibt, und was sie heute wert sind.** Vier, und nur vier:

  | Zusicherung | heute | Konstante, Fundstelle | Aufrufstelle |
  | --- | --- | --- | --- |
  | Der Load-Handshake — der Worker meldet `Loaded` | 60000 ms | `WorkerLoadTimeout`, `constants.ts:43` | `RemoteWorkerEnv.ts:189` (`start()`) |
  | Der Modul-Import — der Worker meldet `ImportedModule` zu dieser URL | 60000 ms | `WorkerConfigureTimeout`, `constants.ts:44` | `:275` (`importScript()`) |
  | Die Bestätigung eines Change Trails — `AppliedChangeTrail` zu dieser Seriennummer | 5000 ms | `WorkerChangeTrailTimeout`, `constants.ts:45` | `:251` (`applyChangeTrail()`, nur im `waitForConfirmation`-Zweig) |
  | Die Bestätigung des Abbaus — `Destroyed` | 5000 ms | `WorkerDestroyTimeout`, `constants.ts:46` | `:305` (`destroy()`) |

  **Gemeinsamer Ursprung oder getrennt: getrennt, in einem Objekt.** Vier Schlüssel, jeder mit eigener
  Vorgabe, keine Sammelzahl darüber. Der Grund ist keine Vorliebe, sondern der Faktor zwölf zwischen den
  Werten: Load und Configure decken Netz, Parsen und Kompilieren eines Moduls ab, Trail und Destroy einen
  Umlauf zu einem Worker, der bereits läuft. Ein einziger Wert wäre entweder ein Trail-Timeout von 60
  Sekunden — dann meldet niemand mehr einen hängenden Worker, was der einzige Zweck dieses Timeouts ist —
  oder ein Load-Timeout von 5 Sekunden, das auf dem langsamen Gerät genau die Anwendung erschlägt, um
  derentwillen das Finding überhaupt geschrieben wurde. Ein Objekt, vier Schlüssel, jeder einzeln setzbar.

  **Woher der Wert kommt: Konstruktor-Option und Element-Attribut, keine statische Eigenschaft.**

  1. `new RemoteWorkerEnv(options?)` mit `options: RemoteWorkerEnvOptions = Partial<WorkerTimeouts>`. Das
     ist der Weg, den die Empfehlung des Audits nennt, und der einzige, den ein Konsument ohne DOM hat.
  2. `<shae-worker load-timeout="…" configure-timeout="…" change-trail-timeout="…" destroy-timeout="…">`.
     Das Element liest die vier Attribute in dem Moment, in dem es den Proxy baut (`ShaeWorkerElement.ts:223`),
     und gibt sie als eben dieses Optionsobjekt weiter. Attributname und Optionsname sind dieselbe Zeile in
     zwei Schreibweisen — `load-timeout` ↔ `loadTimeout` ↔ `WorkerLoadTimeout` —, damit niemand eine Tabelle
     braucht, um von einem zum anderen zu kommen.
  3. **Keine statische Eigenschaft.** Ein `RemoteWorkerEnv.defaultTimeouts`, das man prozessweit umschreibt,
     wäre eine dritte Quelle mit eigener Vorrangregel, wäre in Tests reihenfolgeabhängig, und wäre genau der
     Gattungsfehler, den `GLOBAL-SINGLETON` in Paket 12 für drei andere Stellen beschreibt. Wer alle
     Umgebungen gleich einstellen will, schreibt sich ein Objekt hin und reicht es an jeden Konstruktor
     weiter; das kostet eine Zeile und lügt nicht über den Geltungsbereich.

  **Was gilt, wenn nichts gesetzt ist.** Die Konstante. `new RemoteWorkerEnv()`, `new RemoteWorkerEnv({})`
  und `new RemoteWorkerEnv({loadTimeout: undefined})` sind derselbe Fall, und jeder ausgelassene Schlüssel
  ist für sich ausgelassen: wer nur `changeTrailTimeout` setzt, behält die drei anderen Konstanten. Damit
  ist die Änderung rein additiv — kein bestehender Aufruf verhält sich anders, und der gezählte Kopf des
  Changelogs bewegt sich nicht.

  **Was ein gültiger Wert ist, und was mit dem Rest geschieht.** Eine endliche Zahl größer null. Alles
  andere — `0`, `Infinity`, `NaN`, eine negative Zahl, ein Attributwert, der keine Zahl ergibt, ein Wert,
  der gar keine Zahl ist — wird abgewiesen: der Schlüssel fällt auf seine Konstante zurück, und die
  Umgebung meldet es über `this.logger.error`. Drei Begründungen, weil das drei Entscheidungen sind:
  - *Warum abgewiesen und nicht durchgereicht:* das ist die Auflage aus Paket 5. `0` und `Infinity` legen in
    `waitForMessageOfType` keinen Timer an; als `destroyTimeout` gesetzt hinge der `terminate()` an einer
    Bestätigung, die ein toter Worker nie schickt, und der Thread liefe bis zum Ende der Seite weiter.
  - *Warum dieselbe Regel für alle vier und keine Ausnahme für den Destroy-Timeout:* eine Regel, die für
    drei Schlüssel anders gilt als für den vierten, muss in jeder Tabelle und jedem Absatz mitgeschleppt
    werden, und ihr Grund — eine Verzweigung tief in einer internen Hilfsfunktion — ist für den Konsumenten
    nicht sichtbar. »Eine Millisekundenzahl größer null« ist eine Regel, die man sich merkt. Der Preis ist
    das Wegfallen eines »warte für immer«, das im Repository niemand nutzt und das für einen Debug-Lauf mit
    einer sehr großen Zahl genauso zu haben ist.
  - *Warum gemeldet und zurückgefallen, statt geworfen:* der Konstruktor und das Attribut müssen sich gleich
    verhalten, und ein Wurf aus einer Custom-Elements-Reaktion erreicht den Aufrufer von `setAttribute` nicht
    (`docs/api-reference.md:1496-1498` schreibt das für `local` bereits aus). Gemeldet wird auf `error`, nicht
    auf `warn` — dieselbe Begründung wie in Paket 10: `warn` hängt an `ConsoleLogger.sharedConfig.enable` und
    schweigt außerhalb von localhost, und ein still verschwindender Konfigurationswert ist genau der Fall,
    den man nicht sucht. `ConsoleLogger.error` (`utils/ConsoleLogger.ts:266`) druckt ungated.

  **Was zusätzlich sichtbar wird.** Genau eine Eigenschaft: `env.timeouts`, schreibgeschützt und eingefroren,
  mit den vier aufgelösten Zahlen. Sie ist die einzige Möglichkeit, ohne Stoppuhr zu prüfen, was eine
  Umgebung tatsächlich einzuhalten gedenkt — die roten Fälle unten leben davon, und für die Diagnose einer
  Anwendung, die ihre Attribute aus einem Template bekommt, ebenso.

  **Was ausdrücklich nicht dazukommt.** Kein Getter am Element, keine statische Auflöse-Funktion. Das Element
  liest die Attribute in einer privaten Methode und reicht sie weiter; bewiesen wird dieser Weg dort, wo er
  tatsächlich endet — an einem echten Worker in der e2e-Seite `shae-worker`. Ein öffentlicher Getter am
  Element wäre ein zweiter Ort, an dem dieselbe Frage beantwortet wird, und beide Antworten könnten
  auseinanderlaufen, sobald jemand `shadowEnv.envProxy` selbst setzt (dann baut das Element gar keinen Proxy,
  `ShaeWorkerElement.ts:222`).

  **Für jede Zusage ein Fall.** Die Tabelle ist die Abnahmeliste; die Nummern verweisen auf `Vorgehen`.
  | Zusage in der öffentlichen API | Fall | wo |
  | --- | --- | --- |
  | Ohne Optionen gelten die vier Konstanten | Fall 1 | `RemoteWorkerEnv.spec.ts` |
  | Jeder der vier Schlüssel wird übernommen und lässt die drei anderen auf ihrer Konstante | Fälle 2a–2d | dito |
  | Der gesetzte Wert ist der, nach dem die Umgebung tatsächlich abbricht — je Aufrufstelle | Fälle 3a–3d | dito, Fake-Timer |
  | Ein Wert, der keine Millisekundenzahl größer null ist, wird verworfen, gemeldet, und die Konstante gilt | Fälle 4a–4e (`0`, `Infinity`, `-1`, `NaN`, `'nope'`) | dito |
  | Ein abgewiesener `destroyTimeout` lässt den Abbau unverändert nach `WorkerDestroyTimeout` terminieren | Fall 5 | dito, Fake-Timer |
  | Die vier Attribute erreichen die Worker-Umgebung | Fall 6 | e2e-Seite `shae-worker`, echter Worker |
  | Unter `local` sind die vier Attribute wirkungslos und melden nichts | Fall 7 | `worker-element-attributes.test.js` |
  | Die vier Attribute werden nicht beobachtet | der bestehende Fall `observes exactly ns, local, src, no-structured-clone and auto-sync` (`worker-element-attributes.test.js:287`) — er bleibt unverändert und wird dadurch zur Zusage | dito |

- Wie die roten Fälle die Zeit kontrollieren (Zug 0, 2026-08-19). Timeouts sind Nebenläufigkeit, und diese
  Suite hat für sie bereits ein Idiom; dieses Paket erfindet keins.
  - **Fake-Timer, nie echte Wartezeit.** `vi.useFakeTimers()` im `try`, `vi.useRealTimers()` im `finally` —
    wörtlich das Muster, das seit Paket 5 in `RemoteWorkerEnv.spec.ts:512-528` und `:672-697` steht. Das
    `finally` ist keine Kosmetik: `flushMicrotasks()` dieser Datei (`:111`) ist ein `setTimeout(…, 0)`, und
    stehengelassene Fake-Timer hängen jeden folgenden Fall der Datei auf.
  - **Kein Fall wartet auf eine echte Uhr.** Ein Test, der 1234 ms real verstreichen ließe, um einen
    Timeout zu beweisen, wäre der langsamste und flakigste Fall des Repositories. Gemessen zum Vergleich:
    `RemoteWorkerEnv.spec.ts` fährt heute 45 Fälle in **285 ms**, die beiden bestehenden Fake-Timer-Fälle
    eingeschlossen; die gesamte Kern-Suite 534 Fälle in **681 ms**. Fake-Timer kosten Mikrotask-Durchläufe,
    keine Wanduhr — die Laufzeit der Suite bleibt in derselben Größenordnung.
  - **Kein Fall darf hängen können, wenn er fällt.** Das ist die eigentliche Falle: ein roter Fall, der auf
    ein Promise wartet, das nie auflöst, blockiert statt zu fallen. Die vier Fälle 3a–3d halten deshalb einen
    Zustandsmerker statt zu awaiten:
    ```ts
    let settled: unknown = 'pending';
    const started = env.start().then(() => 'resolved', (error: Error) => error);
    void started.then((value) => { settled = value; });

    await vi.advanceTimersByTimeAsync(1233);
    expect(settled, 'not before its time').toBe('pending');

    await vi.advanceTimersByTimeAsync(1);
    expect((settled as Error)?.message, 'and then, by its own clock').toContain('Timeout waiting for message of type');
    ```
    `advanceTimersByTimeAsync` spült die Mikrotasks mit, `settled` ist danach geschrieben. Fällt der Fall,
    fällt er in einer Assertion.
  - **Die zwei Grenzen statt einer.** Jeder der Fälle 3a–3d prüft *beides*: nach `n-1` ms noch offen, nach
    einer weiteren Millisekunde abgebrochen. Nur die erste Hälfte ginge auch grün, wenn der Wert gar nicht
    ankäme und die Konstante (5000 oder 60000) gälte — die zweite ist der eigentliche Beweis.
  - **Die Fälle 1, 2a–2d und 4a–4e brauchen überhaupt keinen Timer.** Sie lesen `env.timeouts` und den
    Meldeweg. Von 15 neuen Fällen fahren fünf eine Uhr, und keine davon eine echte.
  - **Im Browser gar keine.** Fall 7 (`shadow-objects-testing`) und Fall 6 (e2e) stellen keine Uhr und
    warten auf keine: der eine prüft Wirkungslosigkeit unter `local`, der andere liest `envProxy.timeouts`
    aus einer laufenden Worker-Umgebung.

- Modell-Begründung (Zug 0): **stärkste Stufe**, wie im Grobplan, und der Grund ist nicht der Umfang — vier
  Argumente sind vier Zeilen. Es sind drei Dinge, die man nicht zurücknehmen kann oder die still fehlschlagen:
  eine Konstruktor-Signatur, zwei exportierte Typen und vier Attributnamen gehen in die `.d.ts` und in die
  Dokumentation und bleiben dort; die Prüfregel ist das einzige, was den `terminate()` des Abbaus davor
  bewahrt, an einer nie eintreffenden Bestätigung zu hängen; und Fake-Timer-Fälle sind die eine Sorte Test,
  die bei falschem Idiom nicht rot wird, sondern die Datei aufhängt.

- Dateien:
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`
  - `packages/shadow-objects/src/elements/constants.ts`
  - `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`
  - `packages/shadow-objects/src/utils/attr-utils.ts`
  - `packages/shadow-objects-testing/test/worker-element-attributes.test.js`
  - `packages/shadow-objects-e2e/pages/shae-worker.html`
  - `packages/shadow-objects-e2e/src/shae-worker.js`
  - `packages/shadow-objects-e2e/tests/shae-worker.spec.ts`
  - `packages/shadow-objects-e2e/TEST-PLAN.md` (`:6`, `:23`, `:32` — die Fallzahlen der Suite und der Seite)
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/docs/cheat-sheet.md`
  - `packages/shadow-objects/docs/guides.md`
  - `packages/shadow-objects/CHANGELOG.md` (Unreleased)
  - `Backlog.md`

  Keine neue Datei — der Lib-Transpile bildet `src/**` eins zu eins nach `dist/src/**` ab; die beiden neuen
  Typen wohnen bei der Klasse, die sie beschreiben, der Zahlenleser bei den beiden Attributlesern, die es
  schon gibt.

  Nicht berührt, jeweils mit Grund:
  - `packages/shadow-objects/src/index.ts`: `export * from './view/RemoteWorkerEnv.js'` (`:16`) und
    `export * from './elements/constants.js'` (`:2`) reichen die neuen Typen und die vier `ATTR_`-Konstanten
    von selbst weiter. Die 17 Exportzeilen bleiben, wie sie sind.
  - `packages/shadow-objects/src/utils/waitForMessageOfType.ts`: siehe Triage — die Grenze wird am Eingang
    gezogen, nicht in der Funktion. Ihr eigener Befund liegt bereits unter »Für das nächste Audit«.
  - `packages/shadow-objects/src/worker/`: die Worker-Seite kennt keinen Timeout.
  - `packages/shadow-objects/README.md`: das Dokument zeigt ein `<shae-worker src="…">` (`:25`) und keine
    Attributtabelle; die Wurzel-`README.md` nennt `<shae-worker auto-sync>` (`:136`) in einem Fließsatz über
    den Transport. Es gibt keine Stelle, an der ein Timeout eine Aussage veränderte.
  - `packages/shadow-objects/docs/best-practices.md`: die eine Timeout-Zeile (`:279`) ist eine
    Aufräum-Empfehlung für `setInterval` in Shadow Objects.
  - Wurzel-`CHANGELOG.md`: kein Build-Schritt, kein Werkzeug, keine devDependency.
  - `packages/shae-offscreen-canvas`: das Paket baut seine Umgebung über `<shae-worker>` in der Anwendung,
    nicht in seinem Quelltext.
  - `LocalShadowObjectEnv`: eine lokale Umgebung wartet auf nichts und hat keinen der vier Timeouts.

- Vorgehen:
  1. **Die beiden Typen und die Vorgabe.** In `view/RemoteWorkerEnv.ts`, unter `WorkerDestroyedError` und
     über `WorkerFailedEvent`:

     ```ts
     /**
      * How long a {@link RemoteWorkerEnv} waits for each of the four replies a worker owes it,
      * in milliseconds.
      */
     export interface WorkerTimeouts {
       /** the `Loaded` handshake at the start */
       loadTimeout: number;
       /** the `ImportedModule` reply to an `importScript()` */
       configureTimeout: number;
       /** the `AppliedChangeTrail` confirmation of a change trail sent with `waitForConfirmation` */
       changeTrailTimeout: number;
       /** the `Destroyed` acknowledgement of a teardown */
       destroyTimeout: number;
     }

     /**
      * What {@link RemoteWorkerEnv} takes. Every value left out keeps its default -- the four
      * `Worker*Timeout` constants. A value that is not a finite number of milliseconds greater
      * than zero is reported through the logger and the default applies.
      */
     export type RemoteWorkerEnvOptions = Partial<WorkerTimeouts>;

     const DefaultWorkerTimeouts: WorkerTimeouts = {
       loadTimeout: WorkerLoadTimeout,
       configureTimeout: WorkerConfigureTimeout,
       changeTrailTimeout: WorkerChangeTrailTimeout,
       destroyTimeout: WorkerDestroyTimeout,
     };
     ```

     Die vier Importe aus `../constants.js` (`:11-14`) bleiben stehen; sie tragen jetzt die Vorgabe statt der
     Aufrufstellen.
  2. **Die Prüfung, mit ihrer Begründung daneben.** Modul-privat, unter `DefaultWorkerTimeouts`:

     ```ts
     const isTimeout = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

     /**
      * Resolves the options against the defaults. A timeout is a finite number of milliseconds
      * greater than zero; anything else is refused and reported, and the default stays.
      *
      * Zero and Infinity are refused along with the rest, and that is the point of the rule rather
      * than an oversight: `waitForMessageOfType()` arms no timer for either of them, so a teardown
      * given one of the two would wait for an acknowledgement a dead worker never sends -- and the
      * `terminate()` that ends the teardown hangs on that very chain. One rule for all four values
      * is easier to hold on to than three that allow it and one that does not, and "wait
      * practically forever" is still one very large number away.
      */
     const resolveTimeouts = (options: RemoteWorkerEnvOptions | undefined, logger: ConsoleLogger): WorkerTimeouts => {
       const resolved: WorkerTimeouts = {...DefaultWorkerTimeouts};
       if (options == null) return resolved;

       for (const key of Object.keys(DefaultWorkerTimeouts) as (keyof WorkerTimeouts)[]) {
         const value = options[key];
         if (value === undefined) continue;
         if (isTimeout(value)) {
           resolved[key] = value;
         } else {
           logger.error(`ignoring the ${key} option: expected a finite number of milliseconds greater than 0, got`, value);
         }
       }

       return resolved;
     };
     ```
  3. **Konstruktor und Eigenschaft.** In der Klasse, neben `logger` (`:107`):

     ```ts
     /** The four timeouts this environment holds itself to, resolved once when it is built. */
     readonly timeouts: Readonly<WorkerTimeouts>;
     ```

     und im Konstruktor (`:154-158`), als erste Anweisung vor den beiden `retain()`:

     ```ts
     constructor(options?: RemoteWorkerEnvOptions) {
       // the logger is a field initializer and therefore already there
       this.timeouts = Object.freeze(resolveTimeouts(options, this.logger));
       …
     }
     ```
  4. **Die vier Aufrufstellen.** Je ein Argument, sonst nichts:
     - `:189` `WorkerLoadTimeout` → `this.timeouts.loadTimeout`
     - `:251` `WorkerChangeTrailTimeout` → `this.timeouts.changeTrailTimeout`
     - `:275` `WorkerConfigureTimeout` → `this.timeouts.configureTimeout`
     - `:305` `WorkerDestroyTimeout` → `this.timeouts.destroyTimeout`

     Die vier Kommentare, die die Konstanten namentlich nennen (`:182`, `:216`, `:296`, `:307-309`), bleiben
     inhaltlich richtig und werden nicht angefasst — sie beschreiben den Vorgang, nicht die Zahl.
  5. **Roter Lauf, Teil 1.** Jetzt noch nicht — erst nach Schritt 8, siehe `Verify` Punkt 1. Die Reihenfolge
     hier ist die des Schreibens, nicht die des Ausführens; die Spec entsteht in Schritt 8, und sie muss vor
     den Schritten 1 bis 4 rot laufen. Wer nach Vorschrift arbeitet, schreibt Schritt 8 zuerst, lässt rot
     laufen und kommt dann hierher zurück.
  6. **Die vier Attributnamen.** `elements/constants.ts`, im `<shae-worker>`-Block unter `ATTR_SRC` (`:21`):

     ```ts
     export const ATTR_LOAD_TIMEOUT = 'load-timeout';
     export const ATTR_CONFIGURE_TIMEOUT = 'configure-timeout';
     export const ATTR_CHANGE_TRAIL_TIMEOUT = 'change-trail-timeout';
     export const ATTR_DESTROY_TIMEOUT = 'destroy-timeout';
     ```
  7. **Der Zahlenleser.** `utils/attr-utils.ts`, neben `readBooleanAttribute`:

     ```ts
     /**
      * The attribute read as a number, or `undefined` where the element does not carry it.
      * A value that is not a number reads as `NaN` -- whoever asks decides what that means.
      */
     export const readNumberAttribute = (el: HTMLElement, name: string): number | undefined =>
       el.hasAttribute(name) ? Number(el.getAttribute(name)) : undefined;
     ```

     `Number()` trimmt von sich aus, `Number('')` ist `0` und `Number('abc')` ist `NaN` — beide laufen in die
     Prüfung aus Schritt 2 und werden dort gemeldet.
  8. **Das Element reicht sie weiter.** In `ShaeWorkerElement.ts`, modul-privat über der Klasse:

     ```ts
     const WorkerTimeoutAttributes: [keyof RemoteWorkerEnvOptions, string][] = [
       ['loadTimeout', ATTR_LOAD_TIMEOUT],
       ['configureTimeout', ATTR_CONFIGURE_TIMEOUT],
       ['changeTrailTimeout', ATTR_CHANGE_TRAIL_TIMEOUT],
       ['destroyTimeout', ATTR_DESTROY_TIMEOUT],
     ];
     ```

     und in der Klasse:

     ```ts
     /**
      * The timeout attributes, read at the one moment they are needed: when the worker environment
      * is built. An attribute that is not there is left out, so the environment keeps its default,
      * and a value the environment does not accept is reported there. They are not observed --
      * setting one afterwards changes nothing about an environment that already exists, and a
      * `local` element builds no worker environment at all, so they do nothing there.
      */
     #readWorkerTimeouts(): RemoteWorkerEnvOptions {
       const options: RemoteWorkerEnvOptions = {};
       for (const [key, attr] of WorkerTimeoutAttributes) {
         const value = readNumberAttribute(this, attr);
         if (value !== undefined) options[key] = value;
       }
       return options;
     }
     ```

     `start()` (`:223`) wird zu

     ```ts
     const envProxy = readBooleanAttribute(this, ATTR_LOCAL) ? new LocalShadowObjectEnv() : new RemoteWorkerEnv(this.#readWorkerTimeouts());
     ```

     `observedAttributes` (`:14-20`) bleibt unverändert.
  9. **Die Spec.** In `RemoteWorkerEnv.spec.ts`: `startEnv()` (`:113-120`) bekommt einen optionalen Parameter,
     eine Zeile, die die 45 bestehenden Fälle nicht anfasst:

     ```ts
     const startEnv = async (options?: RemoteWorkerEnvOptions) => {
       const env = new RemoteWorkerEnv(options);
       …
     ```

     Dann ein neues `describe('the timeouts', …)` am Ende der Datei, 15 Fälle:
     - **Fall 1** — `it('default to the four constants')`: `expect(new RemoteWorkerEnv().timeouts).toEqual({loadTimeout: WorkerLoadTimeout, configureTimeout: WorkerConfigureTimeout, changeTrailTimeout: WorkerChangeTrailTimeout, destroyTimeout: WorkerDestroyTimeout})`. Der Import der beiden noch fehlenden Konstanten kommt oben dazu.
     - **Fälle 2a–2d** — tabellengetrieben über die vier Schlüssel: der gesetzte Wert (`1234`) steht in
       `env.timeouts[key]`, die drei anderen auf ihrer Konstante.
     - **Fälle 3a–3d** — der Wert erreicht die Leitung, je Aufrufstelle einer, Fake-Timer nach dem Muster
       oben, jeweils mit beiden Grenzen (`1233` / `+1`):
       - `start()` mit `{loadTimeout: 1234}` — abgebrochen mit `Timeout waiting for message of type`.
       - `applyChangeTrail(trail, true)` mit `{changeTrailTimeout: 1234}` nach `startEnv(options)`.
       - `importScript('/mod.js')` mit `{configureTimeout: 1234}` nach `startEnv(options)`.
       - `destroy()` mit `{destroyTimeout: 1234}`: `worker.terminateCount` ist nach 1233 ms noch `0` und nach
         der nächsten Millisekunde `1`. `console.warn` wird gespäht und stummgeschaltet wie im bestehenden
         Fall (`:515`), sonst schreibt die Meldung des ausbleibenden `Destroyed` in die Testausgabe.
     - **Fälle 4a–4e** — tabellengetrieben über `[0, Infinity, -1, NaN, 'nope']`, angewandt auf
       `destroyTimeout`, weil dort die Abweisung Zähne hat: `env.timeouts.destroyTimeout` steht auf
       `WorkerDestroyTimeout`, und `console.error` wurde genau einmal gerufen, mit dem Optionsnamen im Text.
     - **Fall 5** — `it('terminates the worker after the default when the destroy timeout was refused')`:
       `new RemoteWorkerEnv({destroyTimeout: Infinity})`, Fake-Timer, `destroy()`, nach
       `WorkerDestroyTimeout` ist `terminateCount` gleich `1`. Dieser Fall ist **vor** der Umsetzung bereits
       grün — die Option wird ja noch gar nicht gelesen —; er ist der Wächter, der rot wird, wenn jemand die
       Prüfung später aufweicht.
  10. **Der Integrationsfall.** In `packages/shadow-objects-testing/test/worker-element-attributes.test.js`,
      im Block `shae-worker lifecycle` neben `a started local element exposes a LocalShadowObjectEnv proxy`
      (`:301`): ein `local`-Element mit allen vier Timeout-Attributen, davon zwei unlesbar
      (`load-timeout="abc"`, `destroy-timeout="0"`), startet ohne Meldung, und `envProxy` ist ein
      `LocalShadowObjectEnv`. Geprüft wird zusätzlich, dass `console.error` nicht gerufen wurde. Auch dieser
      Fall ist vor der Umsetzung grün; er hält fest, dass die vier Attribute unter `local` inert bleiben, und
      wird rot, sobald jemand sie dort mitliest. Der bestehende Fall zu `observedAttributes` (`:287`) bleibt
      wörtlich stehen und wird damit zur Zusage, dass die vier nicht beobachtet werden.
  11. **Der e2e-Fall.** `pages/shae-worker.html:10`: `worker0` bekommt die vier Attribute, jedes mit einem
      Wert, der von seiner Konstante abweicht und **größer** als sie ist, damit die Seite an keiner Stelle
      enger getaktet läuft als heute:

      ```html
      <shae-worker id="worker0" src="/mod-hello.js"
        load-timeout="61000" configure-timeout="62000" change-trail-timeout="6000" destroy-timeout="6500"></shae-worker>
      ```

      In `src/shae-worker.js`, direkt hinter `worker0-is-remote-env` (`:72`):

      ```js
      testBooleanAction('worker0-timeouts-from-attributes', () => {
        const timeouts = shadowEnv0.envProxy?.timeouts;
        return (
          timeouts?.loadTimeout === 61000 &&
          timeouts?.configureTimeout === 62000 &&
          timeouts?.changeTrailTimeout === 6000 &&
          timeouts?.destroyTimeout === 6500
        );
      });
      ```

      Die Optional-Chains sind Absicht: vor der Umsetzung muss der Fall **falsch** melden und nicht werfen,
      sonst fällt zusätzlich der Wächter `no uncaught or logged errors` derselben Seite und die rote Zahl
      stimmt nicht mehr. Die Kennung kommt in `tests/shae-worker.spec.ts` hinter `worker0-is-remote-env`.
  12. **Dokumentation.** Vier Stellen in `api-reference.md`, eine in `cheat-sheet.md`, eine in `guides.md`:
      - `### RemoteWorkerEnv` (`:1300`): das Konstruktor-Beispiel (`:1307-1311`) bekommt eine zweite Variante
        mit Optionsobjekt, und darunter der Absatz, der die Regel ausschreibt — vier Schlüssel, jeder
        einzeln, ausgelassen heißt Konstante, eine endliche Millisekundenzahl größer null, alles andere wird
        gemeldet und verworfen, samt dem Grund für `0` und `Infinity`. In die Eigenschaftstabelle (`:1315-1319`)
        eine Zeile `timeouts`.
      - `### Worker Timeout Constants` (`:1370`): die Tabelle bleibt, der Satz darunter (»They are the last
        line of defence, not the first«) bekommt einen zweiten: die Konstanten sind die Vorgabe, und wer sie
        verschieben will, setzt die Option oder das Attribut — mit Verweis auf beide Stellen.
      - Attributtabelle von `<shae-worker>` (`:1478-1485`): vier Zeilen, dazu unter dem Absatz zu den
        Truthy-Attributen ein eigener kurzer Absatz: Millisekundenzahl größer null, sonst gemeldet und
        Vorgabe; nicht beobachtet, gelesen genau einmal, wenn die Umgebung gebaut wird; unter `local`
        wirkungslos, weil eine lokale Umgebung auf nichts wartet.
      - `#### JavaScript API` von `<shae-worker>` (`:1527`): die Zeile zu `ShaeWorkerElement.observedAttributes`
        (`:1557`) nennt bisher `no-autostart` als das eine, das bewusst fehlt — sie nennt jetzt auch die vier
        Timeout-Attribute.
      - `cheat-sheet.md`, `<shae-worker>`-Tabelle (`:220-228`): eine Zeile für alle vier zusammen, mit der
        Regel in einem Halbsatz.
      - `guides.md`, `<shae-worker>`-Tabelle (`:308-315`): eine Zeile für alle vier, mit dem Verweis auf die
        Referenz, den die Tabelle darunter (`:317`) ohnehin schon führt.
  13. **Changelog.** `packages/shadow-objects/CHANGELOG.md`, unter `[Unreleased]` zu den additiven Einträgen:
      ein Glied `**New (public API):**` — `RemoteWorkerEnv` nimmt die vier Timeouts als Konstruktor-Optionen
      entgegen, `<shae-worker>` als vier Attribute, die Konstanten bleiben die Vorgabe, ein Wert, der keine
      Millisekundenzahl größer null ist, wird gemeldet und verworfen, und `env.timeouts` sagt, was gilt. Der
      gezählte Kopf (»Thirty changes reach existing consumers«) bleibt bei **30**: nichts davon erreicht
      einen Konsumenten, der nichts setzt.
  14. **Backlog.** `Backlog.md`:
      - `:268` — der Smell »Worker-Timeouts sind feste Konstanten (5 s / 60 s), nicht überschreibbar«
        durchstreichen und in einem Halbsatz sagen, was jetzt gilt.
      - `:427` (Punkt 15) — den Halbsatz »Worker-Timeouts konfigurierbar machen« aus der Aufzählung nehmen;
        der Rest des Punktes bleibt und gehört Paket 12.
      - `:297` — die Fallzahl von `RemoteWorkerEnv` in der Abdeckungstabelle: 45 → **60**, mit einem Halbsatz
        zu dem, was dazugekommen ist (Auflösung, Abweisung, die vier Aufrufstellen gegen die Uhr).
      - `:305` — die Utils-Zeile führt `attr-utils` unter »haben keine eigenen Tests«; das bleibt richtig,
        `readNumberAttribute` wird über `worker-element-attributes.test.js` und die e2e-Seite mitgeprüft, was
        dort in einem Halbsatz stehen sollte, wo `array-utils` und `waitForMessageOfType` schon so behandelt
        werden.
      - `:283` und `:319` — die e2e-Zahlen: 402 → **404**, 201 → **202** je Projekt.
  15. **Kein `pnpm make:todo`** — dieses Paket legt keinen TODO-Kommentar an und nimmt keinen weg.

- Verify:
  1. **Rot zuerst**, zwei Läufe, jeder vor den Schritten, die ihn grün machen:
     - `pnpm -F @spearwolf/shadow-objects exec vitest src/view/RemoteWorkerEnv.spec.ts --run` nach Schritt 9,
       vor den Schritten 1 bis 4 — erwartet **14 rot / 46 grün von 60**. Fehlerarten getrennt zu berichten:
       Fall 1 fällt mit `AssertionError: expected undefined to deeply equal { loadTimeout: 60000, … }`; die
       Fälle 2a–2d und 4a–4e mit `TypeError: Cannot read properties of undefined (reading '…')`, weil
       `env.timeouts` noch nicht existiert; die Fälle 3a–3c mit
       `AssertionError: expected 'pending' to be … // not before its time` an der *zweiten* Grenze (die
       Konstante von 5000 bzw. 60000 gilt noch, nach 1234 ms ist nichts abgebrochen); Fall 3d mit
       `AssertionError: expected +0 to be 1`. Fall 5 ist grün, das ist beabsichtigt und oben begründet.
       Wer hier eine andere Verteilung sieht, hat einen Fall gebaut, der aus einem anderen Grund fällt —
       insbesondere darf **kein** Lauf hängen: ein hängender Lauf heißt, dass ein Fall awaitet statt einen
       Merker zu prüfen.
       *Anmerkung zur Reihenfolge:* dieser Lauf geht durch, obwohl `new RemoteWorkerEnv({…})` zu diesem
       Zeitpunkt noch keine Signatur mit Argument hat — vitest transpiliert über esbuild ohne Typprüfung.
       `pnpm typecheck` ist erst nach Schritt 3 grün und darf vorher nicht als Beleg genommen werden.
     - `pnpm -F shadow-objects-e2e test -- --grep "worker0-timeouts-from-attributes"` nach Schritt 11, vor
       den Schritten 1 bis 4 — erwartet **2 rot** (Chromium und Firefox), beide mit dem `data-testoutput`
       der Seite als Meldung. Der Wächter `no uncaught or logged errors` derselben Seite muss dabei grün
       bleiben; wird er rot, wirft die Assertion, statt `false` zu melden, und die Optional-Chains aus
       Schritt 11 fehlen.
  2. **Grün danach.** Dieselben zwei Kommandos nach Schritt 11: **60** und **2**.
  3. Von der Wurzel `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`. `lint:ci` bleibt bei den
     2 bekannten Infos. Die Gesamtzahl geht von **885** auf **901**: Kernpaket 534 → **549** (15 neue Fälle
     in `RemoteWorkerEnv.spec.ts`, 45 → 60; die Zahl der Testdateien bleibt **19**),
     `shadow-objects-testing` 344 → **345** (ein neuer Fall in `worker-element-attributes.test.js`; 24
     Dateien), `shae-offscreen-canvas` unverändert **7**.
  4. `pnpm -F shadow-objects-e2e test` — **404** statt 402, **202** je Projekt statt 201. Die eine neue
     Kennung ist `worker0-timeouts-from-attributes`; die 29 bestehenden Kennungen der Seite bleiben
     unverändert grün. Geprüft, warum keine andere Seite sich rührt: `grep -rn "timeout"
     packages/shadow-objects-e2e/pages packages/shadow-objects-e2e/src` findet außerhalb der
     Test-Helfer-Budgets keine Stelle, und keine andere Seite setzt eines der vier neuen Attribute.
  5. **Auslieferung.** `find packages/shadow-objects/dist -type f | sort` vor und nach dem Build: dieselben
     **198** Dateien, keine neue und keine gelöschte. `dist/package.json` bleibt zeichengleich — dieses Paket
     legt keinen Unterpfad an. `packages/shae-offscreen-canvas/.npm-pkg` bleibt bei **20**. In den `.d.ts`
     ändert sich etwas, und zwar genau vier Dinge, die zu prüfen sind: `RemoteWorkerEnv.d.ts` führt
     `WorkerTimeouts`, `RemoteWorkerEnvOptions`, den Konstruktor mit optionalem Parameter und
     `readonly timeouts`; `elements/constants.d.ts` führt vier neue Konstanten; `utils/attr-utils.d.ts`
     führt `readNumberAttribute`; `index.d.ts` reicht die ersten beiden Gruppen über seine Sternexporte
     weiter. Nichts davon nimmt eine bestehende Deklaration zurück.
  6. **Von Hand, kurz.** Eine Seite mit `<shae-worker src="…" change-trail-timeout="abc">`: die Konsole muss
     genau eine Fehlermeldung führen, die `changeTrailTimeout` nennt, und
     `document.querySelector('shae-worker').shadowEnv.envProxy.timeouts.changeTrailTimeout` muss `5000`
     sein. Dieselbe Seite mit `local` daneben: keine Meldung, `envProxy` ist eine lokale Umgebung. Das ist
     der Nachweis, dass Meldeweg und Grenze im echten Browser dasselbe sagen wie die Specs.
- Commit: `feat(view): the four worker timeouts come from constructor options and <shae-worker> attributes`
- Ergebnis (2026-08-19, `9039469`, 15 Dateien): Die vier Timeouts kommen aus einer Konstruktor-Option und
  aus vier Attributen an `<shae-worker>`, je Schlüssel einzeln, mit den bisherigen Konstanten als Vorgabe.
  Gültig ist eine Zahl von 1 bis 2147483647 — der größten Verzögerung, die ein Timer hält —, alles andere
  wird gemeldet und fällt zurück. Gesamtzahl 885 → **903** (551 + 7 + 345), e2e 402 → **404**.
  Der Betreff des Commits weicht vom Plan ab: `feat(view):` ohne Ausrufezeichen und mit anderem Wortlaut,
  weil das Paket rein additiv ist.
- Nebenbefunde (2026-08-19), gemeldet und nicht angefasst:
  - `Backlog.md:278` (»17 Dateien, 435 Fälle«) und `:280` (»23 Dateien, 334 Fälle«) stehen gegen gemessene
    19/551 und 24/345. Vorbestehende Drift, in `d6e91f5` zeichengleich, von den Paketen 2, 7, 8, 9, 10 und 11
    weiter auseinandergezogen. → Paket 12.
  - `env.timeouts` ist eingefroren, der Eigenschafts-Slot aber beschreibbar: `env.timeouts = {…}` gelingt
    einem JS-Konsumenten und setzt die Prüfung an allen vier Stellen außer Kraft. Dieselbe Machart wie beim
    benachbarten `readonly logger`, also im Haus konsistent; die Doku sagt es jetzt, wie es ist. → nächstes Audit.
  - `readNumberAttribute` akzeptiert `'1e3'`, `'0x10'` und `'0b101'`, weil `Number()` sie liest. Harmlos —
    kein Timer bleibt dadurch aus —, aber es ist eine andere Lesart als die von `<shae-prop type="int">`.
    → nächstes Audit.
  - `packages/shadow-objects/src/utils/attr-utils.ts` endet weiterhin ohne Schlusszeilenumbruch. Vorbestehend,
    Biome verlangt nichts. Kein Zielpaket, dieselbe Begründung wie bei den Worker-Dateien aus Paket 4.
- Folgen (2026-08-19): keine. `waitForMessageOfType.ts` bleibt unangetastet — die Grenze wird am Eingang
  gezogen, damit die Funktion ihr Verhalten für Aufrufer außerhalb dieses Pakets behält; ein Wächterfall in
  der Spec wird rot, sobald jemand die Prüfung aufweicht.
- Schnittstellen (2026-08-19): Paket 12 erbt die Kopfzahl des Changelogs, die weiterhin bei **30** steht
  (dieses Paket ist additiv), die veralteten Testinventare in `Backlog.md`, und `attr-utils.ts` als Datei mit
  einem dritten Leser. Die Doku-Anker der beiden Pakete überschneiden sich in keiner Zeile, aber alles, was
  Paket 12 unterhalb von `api-reference.md:1326` zitiert, hat sich verschoben.
- Verlauf:
  - Zug 1 (2026-08-19): Umgesetzt. Rot vorher **14 von 60** im Kernpaket, dazu 2 rote e2e-Fälle in beiden
    Browsern; die Spec-Datei lief dabei 276 ms ohne Hänger. Grün danach 60 und 2; Wurzel-Lauf **901**
    (549 + 7 + 345), e2e **404**. Spec-Laufzeit 260 ms → 286 ms für 15 zusätzliche Fälle, davon fünf mit
    Uhr — alle auf Fake-Timern, keine Wanduhr. `dist` unverändert bei 198 Dateien, `dist/package.json`
    zeichengleich. Neu in den `.d.ts` genau die angekündigten Dinge: `WorkerTimeouts`,
    `RemoteWorkerEnvOptions`, `readonly timeouts`, `constructor(options?)`, vier `ATTR_*_TIMEOUT`,
    `readNumberAttribute`; keine bestehende Deklaration zurückgenommen. Handdurchgang im Browser:
    `change-trail-timeout="abc"` erzeugt genau eine Meldung, die den Schlüssel nennt, und der Wert fällt
    auf 5000 zurück; das `local`-Geschwister mit zwei unlesbaren Werten meldet nichts und sein Proxy
    trägt kein `timeouts`. Sechs Abweichungen, alle Feinheiten: der Integrationsfall folgt dem Anker
    statt dem im Plan genannten Blocknamen (der Anker steht im `local`-Block, dorthin gehört er auch);
    die Fälle 2a–2d fallen als `AssertionError` statt als `TypeError`, weil sie alle vier Schlüssel in
    einer Assertion prüfen; 3a–3c melden anderen Wortlaut bei gleicher Ursache; die e2e-Attribute stehen
    mehrzeilig, weil Biome so formatiert; der Doku-Anker heißt `#shae-worker`, weil die Datei drei
    `#### Attributes`-Überschriften führt; die Attributtabelle endet drei Zeilen später als angenommen.
  - Zug 3 (2026-08-19): Review, stärkste Stufe. Urteil **commit-fähig**. Die Kernfrage — ob
    `destroyTimeout` auf irgendeinem Weg unendlich, `NaN`, `0`, negativ oder undefiniert wird — mit 24
    Gegenbeispielen gegen den gebauten Stand gemessen: `null` als Options-Objekt, `Object.create(null)`
    leer und gefüllt, ein Getter, ein alternierender Getter (nur ein Lesezugriff je Schlüssel, kein
    TOCTOU), `new Number(5000)`, ein Array, Zusatzschlüssel, `1e999`, Prototype-Verschmutzung. Kein Weg
    führt durch; jeder ungültige Wert fällt auf die Konstante zurück und meldet genau einmal mit dem
    Schlüsselnamen. Über das Attribut ebenso. Die vier Aufrufstellen lesen vier verschiedene Schlüssel,
    die verbliebenen Vorkommen der Konstanten sind Importe, Defaults und ein Kommentar. Die fünf
    Fake-Timer-Fälle einzeln gelesen: `useFakeTimers()` im `try`, `useRealTimers()` im `finally`, der
    Zustandsmerker awaitet nichts, alle vier Zeitfälle prüfen beide Grenzen. Spec zweimal hintereinander
    60/60 in 296 und 290 ms — kein liegengebliebener Timer, keine Reihenfolgeabhängigkeit.
  - Zug 4 (2026-08-19), zwei Runden: erstens die Obergrenze, die `setTimeout` wirklich hat. Die Doku lud
    dazu ein, »praktisch für immer« sei eine sehr große Zahl entfernt, während die Prüfung jede endliche
    Zahl über null nahm; die Verzögerung wird aber in ein vorzeichenbehaftetes 32-Bit-Feld zugeschnitten.
    Gemessen in drei Laufzeitumgebungen: `2147483647` bleibt liegen, `2147483648` feuert überall sofort,
    `1e10` wird in den Browsern zu rund 16 Tagen statt der erwarteten 115 und in Node auf 1 ms gekappt.
    Die Grenze steht jetzt als `MaxWorkerTimeout` in der Prüfung, mit dem Grund daneben, und zwei Fälle
    pinnen sie. Zweitens zwei Doc-Blöcke, die die Regel ohne ihre Obergrenze wiedergaben — darunter der
    über dem exportierten Optionstyp, der über die `.d.ts` bei jedem Konsumenten landet.
  - Zug 5 (2026-08-19): Verify vom Orchestrator selbst gefahren. `pnpm lint:ci` 2 bekannte Infos,
    `typecheck`/`build` je 3/3 ohne Cache, `test:ci` **903** (551 + 7 + 345), e2e **404** in Chromium und
    Firefox, `dist` bei 198 Dateien, `.npm-pkg` bei 20. Die Grenze unabhängig nachgemessen: `2147483647`
    kommt an, `2147483648`, `1e10`, `2**53`, `Infinity`, `0`, `-1`, `NaN` und der String `'5000'` fallen
    durch, `Object.hasOwn` steht im gebauten Stand. Der berichtigte Satz liegt in
    `dist/src/view/RemoteWorkerEnv.d.ts`. Der Commit-Betreff wurde nach dem Commit von `feat(worker)!:`
    auf `feat(view):` korrigiert — das Paket ist rein additiv, das Ausrufezeichen war falsch.
  - Zug 0 (2026-08-19): Detailplan steht. Keine Abweichung von Zielsetzung oder Zuschnitt des Grobplans;
    was dazukommt, ist die Beantwortung der API-Frage und der e2e-Fall, den `AGENTS.md` §4 für öffentliche
    API-Änderungen »if possible« verlangt und der hier möglich ist. Sechs Rückfragen sind mit Vorschlag an
    den Orchestrator gegangen: die Namensgleichung Konstante/Option/Attribut, die Abweisung von `0` und
    `Infinity` für alle vier statt nur für den Abbau, Melden-und-Zurückfallen statt Werfen, der Verzicht auf
    einen Getter am Element zugunsten des e2e-Falls, die stille Wirkungslosigkeit unter `local`, und dass
    die vier Attribute nicht beobachtet werden.

**TIMEOUT-CFG · Worker-Timeouts sind fest verdrahtet · low · packages/shadow-objects/src/constants.ts:43-46**
WorkerLoadTimeout (60 s), WorkerConfigureTimeout (60 s), WorkerChangeTrailTimeout (5 s) und WorkerDestroyTimeout (5 s) sind Konstanten ohne Konfigurationsweg. Auf langsamen Geräten oder bei großen Modulen ist besonders der 5-Sekunden-Trail-Timeout knapp; ein Consumer kann ihn nicht anheben, ohne das Paket zu forken.
Empfehlung: Die Werte als Default in ein Optionsobjekt heben, das RemoteWorkerEnv im Konstruktor entgegennimmt, und über <shae-worker> als Attribute zugänglich machen. Die Konstanten bleiben die Defaults.
*Fundstelle heute unverändert: `constants.ts:43-46`, die vier Aufrufstellen in `view/RemoteWorkerEnv.ts:189`, `:251`, `:275`, `:305`. Die Empfehlung wird Wort für Wort umgesetzt und um drei Festlegungen erweitert, die sie offenlässt: die vier Werte bleiben vier Werte statt einer Sammelzahl, ein Wert außerhalb von »endliche Millisekundenzahl größer null« wird gemeldet und verworfen statt durchgereicht — sonst hinge der `terminate()` des Abbaus an einer Bestätigung, die nie kommt (`utils/waitForMessageOfType.ts:38`) —, und es gibt keine statische Vorgabe am Klassenobjekt, weil eine prozessweit umschreibbare Voreinstellung derselbe Gattungsfehler wäre, den `GLOBAL-SINGLETON` an drei anderen Stellen beschreibt.*

### [x] 12. Konsistenz, Doku, Changelog
> Dieses Paket ergibt **zwei Commits**: 12a (Code, Werkzeuge, die zugehörigen Changelog-Zeilen) und
> danach 12b (Gliederung des Unreleased-Abschnitts, Backlog, Doku, README). Entscheidung vom 2026-08-19,
> siehe Kopf. Die Statusmarke geht erst auf `[x]`, wenn beide Hashes eingetragen sind.
- Findings: ENV-ASYMM (medium), PERF-CLONE (medium), GLOBAL-SINGLETON (info), CHANGES-FE (low), KERN-DOC-001 (info), CHANGELOG-001 (low)
- Ziel: Die lokale Umgebung hält ihre eigene Signatur ein, und was bewusst so ist, steht auch geschrieben.
- Bereich: `packages/shadow-objects/src/view/{LocalShadowObjectEnv,ShadowEnv,RemoteWorkerEnv,ComponentChanges,ComponentContext}.ts`,
  `src/elements/ShaeEntElement.ts`, `src/in-the-dark/Kernel.ts`, `packages/shadow-objects/docs/`,
  beide `CHANGELOG.md` der Pakete, die Wurzel-`CHANGELOG.md`, `Backlog.md`, `turbo.json`, `biome.json`,
  `packages/shae-offscreen-canvas/{vitest.config.ts,package.json,build.mjs,README.md}`
- Hängt ab von: Paket 6 (`ShadowEnv.ts`), Paket 8 (`Kernel.ts`, `ComponentContext.ts`), Paket 9 (`FrameLoop`-Doku),
  Paket 10 (`ShaeEntElement.ts`), Paket 11 (Zeilennummern unterhalb `api-reference.md:1326`)
- Modell: 12a mittlere Stufe, 12b stärkste Stufe — Begründung unter »Modell« weiter unten
- Hash: `ce24b9d` (12a), `86623a5` (12b)

Dieser Abschnitt ersetzt die datierten Nachträge der Pakete 2, 3, 4, 6, 7, 8, 9, 10 und 11. Ihr Inhalt
steckt vollständig in der Sammelliste; jeder Posten nennt seine Herkunft, seine Fundstelle nach Paket 11
und sein Urteil.

#### Abgleich der sechs Findings gegen den heutigen Code (Zug 0, 2026-08-19)

| Finding | Fundstelle im Audit | Fundstelle heute | Befund | Urteil |
| --- | --- | --- | --- | --- |
| ENV-ASYMM | `view/LocalShadowObjectEnv.ts:40-50` | `:51-61`, der Parameter in `:51` | Steht unverändert. Die Datei taucht im `git diff --stat d6e91f5 -- …` dieses Laufs nicht auf, ist also byteidentisch mit dem Auditstand. `_waitForConfirmation` wird nirgends gelesen. | Umsetzen, Weg A (Entscheidung vom 2026-08-19). |
| PERF-CLONE | `view/LocalShadowObjectEnv.ts:22, 41` | `:23` (`disableStructuredClone = false`), `:52` (der Klon) | Steht unverändert, selbe Begründung wie oben. | Umsetzen als Doku, kein Code-Eingriff (Entscheidung vom 2026-08-19). |
| GLOBAL-SINGLETON | `view/ComponentContext.ts:16-19, 53-58`; `view/ShadowEnv.ts:10-13` | `ComponentContext.ts:16-19` (die `declare global`-Zeilen), `:63-78` (`getContextsMap()`/`get()`), `:93-101` (der Konstruktor mit seinem `return`); `ShadowEnv.ts:10-13` | Zur Hälfte durch Paket 6 erledigt: `docs/api-reference.md:908` schreibt das Rückgabeverhalten des Konstruktors aus, `:1121` die Eigentumsregel für `__shadowEnvs`. Offen bleibt beides, was die Empfehlung nennt: der Architektur-Absatz mit SSR und Multi-Tenancy, und der TSDoc der Klasse selbst. | Rest umsetzen. |
| CHANGES-FE | `view/ComponentChanges.ts` | `:17` (`export class ComponentChanges`), die vier Zustandspaare in `:49-56`, `clear()` in `:73` | Steht unverändert; auch diese Datei fehlt im Diff-Stat gegen `d6e91f5`. Über der Klasse steht kein Kommentar, die Reihenfolge `buildChangeTrail → clear` nur implizit. | Umsetzen. |
| KERN-DOC-001 | `in-the-dark/Kernel.ts:784-786` | `:863-864` | Steht zeichengleich: `git show d6e91f5:packages/shadow-objects/src/in-the-dark/Kernel.ts` führt denselben Zweizeiler in `:824-825`. Der Block liegt außerhalb von allem, was Paket 8 an der Datei angefasst hat. | Umsetzen. |
| CHANGELOG-001 | `packages/shadow-objects/CHANGELOG.md:10-30` | Kopf `:12-97`, Glieder `:98-241` | Der Befund ist in seiner Zahl überholt: es sind nicht »rund zwanzig« Einträge, sondern **136** Glieder in einer flachen Liste ohne jede Gliederung, dazu ein Kopfsatz, der 30 sagt und 32 Semikolon-Glieder trägt. Die Empfehlung des Audits — eine Version schneiden — ist am 2026-08-19 abgelehnt worden. | Teilweise umsetzen: sortieren und gliedern, die Kopfzahl in Ordnung bringen. Keine Versionsanhebung. |

Keines der sechs Findings ist durch die Pakete 1 bis 11 gegenstandslos geworden. Gestrichen wird
ausschließlich der Teil von CHANGELOG-001, der eine Version schneiden will, und das nach der
datierten Entscheidung, nicht nach einer Messung.

#### Sammelliste: was die Pakete 1 bis 11 hierher gelegt haben

Jeder Posten mit Herkunft, Fundstelle nach Paket 11 und Urteil. Eine **echte Folge** dieses Laufs
fällt hier; ein vorbestehender Nebenbefund darf gehen, wenn er nicht dieselbe Ursache hat wie
etwas, das ohnehin angefasst wird.

1. **`turbo.json:13-21`** — `tasks.test.inputs` führt `playwright.config.ts` nicht, während `build`
   (`:8`) und `typecheck` (`:26`) sie seit `7e147e4` führen. `shadow-objects-e2e#test` ist der
   einzige Task, der die Datei ausführt, und der einzige, der sie nicht hasht.
   *Herkunft: Paket 1, `- Folgen:`.* **Echte Folge** — die Asymmetrie entsteht mit diesem Lauf.
   → **12a.**
2. **`turbo.json:8`** — `tasks.build.inputs` führt kein `vite.config.*`, obwohl
   `packages/shadow-objects-e2e` mit `tsc && vite build` baut und seine
   `vite.config.mjs` die Einstiegsliste des Builds erzeugt. Das Muster deckt auch
   `packages/shae-offscreen-canvas/vite.config.js` ab, dessen `build` ohne vite auskommt.
   *Herkunft: Paket 1, `- Nebenbefunde:`.* Vorbestehend (`git show d6e91f5:turbo.json` führt dieselbe
   Liste), aber dieselbe Ursache wie Posten 1. → **12a.**
3. **`biome.json:2`** — die `$schema`-URL zeigt auf **2.4.14**, installiert ist **2.5.9**
   (`node -p "require('./node_modules/@biomejs/biome/package.json').version"`). Betrifft nur die
   Editor-Vervollständigung, aber eine Schema-Zeile, die auf eine andere Version zeigt als die, die
   prüft, ist genau die Art Halbwahrheit, die dieses Paket einsammelt.
   *Herkunft: Paket 1, `- Nebenbefunde:`, dort als »Folge des Patch-Sprungs« geführt.*
   **Korrektur:** vorbestehend — `git show d6e91f5:biome.json` trägt bereits `2.4.14`. Paket 1 hat
   den Abstand geweitet, nicht eröffnet. Ändert nichts am Ziel. → **12a.**
4. **`packages/shae-offscreen-canvas/package.json:50` und `:55`** — `@esm-bundle/chai` und `sinon`
   stehen in den devDependencies und kommen in keiner Datei des Pakets vor
   (`grep -rn "esm-bundle/chai\|sinon" packages/shae-offscreen-canvas --include=*.js --include=*.ts`
   ohne Treffer; die einzige verbliebene Spec, `src/elements/ShaeOffscreenCanvasElement.spec.js:3`,
   importiert `expect` aus `vitest`).
   *Herkunft: Paket 3 `- Nebenbefunde:`, Paket 4 Triage, Paket 9 `- Folgen:`.* `sinon` vorbestehend,
   `@esm-bundle/chai` **echte Folge** — mit dem Löschen von `src/shared/utils.specs.js` in Paket 9
   ist der letzte Importeur gegangen. → **12a.**
   **Korrektur an der Triage von Paket 4:** der Katalog-Eintrag `@types/sinon`
   (`pnpm-workspace.yaml:48`) hat sehr wohl einen Referenzierer — `package.json:35` an der Wurzel,
   und zwar bereits in `d6e91f5`. Er bleibt stehen, ebenso `sinon` selbst
   (`pnpm-workspace.yaml:47`, referenziert von `package.json:40` und
   `packages/shadow-objects-testing/package.json:29`). Gestrichen werden ausschließlich die beiden
   Zeilen im Manifest des einen Pakets. Ob die Wurzel `sinon`/`@types/sinon` noch braucht, ist eine
   eigene, vorbestehende Frage an ein anderes Manifest → **nächstes Audit.**
5. **`packages/shae-offscreen-canvas/vitest.config.ts:7`** — das `include`-Muster führt
   `src/**/*.{spec,specs,test}.{js,ts}`. Auf `specs` passt im ganzen Monorepo keine Datei mehr,
   und kein anderes Paket führt die Alternative.
   *Herkunft: Paket 9, Zug 3.* Die Zeile ist vorbestehend (`git show d6e91f5:…` zeigt sie gleich),
   ihr Ins-Leere-Zeigen ist **echte Folge**. → **12a.**
6. **`packages/shae-offscreen-canvas/build.mjs:12`** — `cp(src, .npm-pkg/src, {recursive: true})`
   kopiert das gesamte Quellverzeichnis, Specs eingeschlossen. Heute liegt deshalb
   `.npm-pkg/src/elements/ShaeOffscreenCanvasElement.spec.js` im veröffentlichten Paket (nachgezählt:
   **20** Dateien unter `.npm-pkg`, eine davon eine Spec).
   *Herkunft: Paket 3, Verify-Schritt 4.* Vorbestehend, aber Paket 3 hat die Datei erzeugt, die heute
   dort liegt — Paket 9 hat die zweite wieder entfernt. → **12a**, ändert die Dateiliste des
   veröffentlichten Pakets und braucht deshalb beide Changelogs.
7. **`packages/shae-offscreen-canvas/README.md:16` und `:23`** — das einzige Anwendungsbeispiel zeigt
   `<shae-offscreen-canvas-ctx src="…">`. Ein Element dieses Namens gibt es nirgends im Repo; gemeint
   ist `<shae-worker src="…">`, so wie `packages/shae-offscreen-canvas/index.html:112` es benutzt.
   *Herkunft: Paket 3, Nachtrag.* Vorbestehend, aber es ist die `README.md` desselben Pakets, dessen
   Auslieferung Posten 6 ändert, und sie wird mitkopiert (`build.mjs:11`). → **12b.**
8. **`packages/shadow-objects/src/view/ShadowEnv.ts:117`** — `#releaseNamespace()` steigt bei
   `ns == null` aus, während der `view`-Setter (`:90`) auf den Wahrheitswert prüft, bevor er
   registriert. Die Freigabe ist eine Spur weiter gefasst als die Registrierung.
   *Herkunft: Paket 6 `- Nebenbefunde:` (dort »vorbestehend«), in Zug 0 von Paket 7 als **echte
   Folge** nachgewiesen.* Nachgeprüft: `git show d6e91f5:packages/shadow-objects/src/view/ShadowEnv.ts
   | grep -c releaseNamespace` → **0**; die Methode entsteht mit `ff55553`. Folgenlos bleibt sie so
   oder so — ein leerer String wird nie registriert, `GlobalNS` ist ein Symbol —, aber eine Folge
   verlässt den Lauf nicht. → **12a**, eine Zeile.
9. **`packages/shadow-objects/src/view/RemoteWorkerEnv.ts:312`** — `const message = {type: ChangeTrail,
   changeTrail: outbound} as any`, obwohl `SyncEvent` (`types.ts:77-80`) das Objekt beschreibt; es
   fehlt nur das `type`-Feld.
   *Herkunft: Paket 5, `- Nebenbefunde:`.* Vorbestehend, aber `RemoteWorkerEnv.ts` ist eine Datei
   dieses Laufs und das `as any` steht mitten in dem Block, den Paket 5 umgebaut hat. → **12a.**
10. **`packages/shadow-objects/src/elements/ShaeEntElement.ts:410` und `:419`** — derselbe Ausdruck
    `(this.getRootNode() as ShadowRoot)?.host` steht zweimal, in `findShadowRootHost()` und als
    zweiter Term von `getParentNodeForObserver()`.
    *Herkunft: Paket 10, Zug 0, ausdrücklich als Kandidat für diesen Konsistenzteil übergeben.*
    **Echte Folge** — `:410` entsteht mit `05cb1af`. → **12a**, mit Entscheidung: zusammenziehen
    (Schritt 4 unten).
11. **`packages/shadow-objects/src/in-the-dark/Kernel.ts:918-940`** — das abschließende Leeren der
    Buchführung in `destroy()`: Entities, die nur über einen mit `Entity.addChild()` oder
    `ComponentContext.addToChildren()` geschlossenen Ring erreichbar sind, hängen an keiner Wurzel,
    werden vom Durchlauf nicht gefunden und verschwinden mit der Buchführung — ihr `onDestroy` läuft
    nie. Kein Rückschritt (dieselben Entities blieben vorher unbegrenzt stehen, ebenfalls ohne
    `onDestroy`), aber eine Grenze des Zyklusschutzes, die nirgends steht.
    *Herkunft: Paket 8 `- Nebenbefunde:`, in Zug 0 von Paket 9 als **echte Folge** nachgewiesen
    (`d3c71da`).* Kein Code-Eingriff: ein Satz an `docs/api-reference.md:2247`, wo Paket 8 die andere
    Grenze des Guards bereits ausgeschrieben hat, und ein Halbsatz am Changelog-Glied
    `packages/shadow-objects/CHANGELOG.md:112`. → **12b.**
12. **Die Kopfzahl des Unreleased-Abschnitts.** Steht nach Paket 11 bei **30**.
    *Herkunft: Nachträge der Pakete 8 (28), 9 (29), 10 (30) und 11 (30).* Nachgerechnet in Zug 0:
    der Kopf (`packages/shadow-objects/CHANGELOG.md:12-97`) sagt »Thirty changes reach existing
    consumers« und trägt **32** semikolongetrennte Glieder. Der Versatz von 2 ist keine Schlamperei,
    sondern die dreigliedrige `ComponentContext`-Teardown-Gruppe (Glieder 20, 21, 22), die einmal
    zählt. → **12a**, samt der Behandlung, die den Versatz für immer schließt (Schritt 10).
13. **`Backlog.md:278` und `:281`** — die Testinventare sagen »17 Dateien, 435 Fälle« und
    »23 Dateien, 334 Fälle«. Gemessen in Zug 0: **19 Dateien, 551 Fälle** (`pnpm exec vitest --run`
    in `packages/shadow-objects`) und **24 Dateien, 345 Fälle**.
    *Herkunft: Paket 11, `- Nebenbefunde:`.* Vorbestehende Drift, von den Paketen 2, 7, 8, 9, 10 und
    11 weiter auseinandergezogen — die Zahlen sind heute falsch, *weil* dieser Lauf lief. → **12b.**
14. **`Backlog.md:231` (`LOW-4`)** — der Absatz über die Gattungsfrage aller drei Singletons.
    Paket 6 hat die `__shadowEnvs`-Hälfte, Paket 9 die `FrameLoop`-Hälfte nachgezogen; was fehlt, ist
    der eine Absatz, der `__shadowEntsContexts`, `__shadowEnvs` und `FrameLoop.get()` gemeinsam
    beschreibt, statt drei Einzelsätze nebeneinanderzustellen.
    *Herkunft: Paket 6 Nachtrag, Paket 9 Zug 0.* → **12b**, zusammen mit dem Architektur-Absatz aus
    GLOBAL-SINGLETON.
15. **`FrameLoop.get()` hängt am Modulzustand, nicht am globalen Objekt.** Im Handdurchgang von
    Paket 9 gemessen: ein Import über einen zweiten Modulpfad liefert eine zweite »geteilte« Schleife
    mit eigener Abonnentenzahl. `docs/api-reference.md:1426` sagt »Created on first read, the same
    instance afterwards«, `:1591` sagt »There is one per process« — beide Sätze sind eine Modulkopie
    weit von der Wahrheit entfernt.
    *Herkunft: Paket 9, `- Nebenbefunde:`, ausdrücklich als Material für den Singleton-Absatz.*
    → **12b.**
16. **Die Quantisierung der Bildratengrenze.** Eine Kappe, die kein ganzer Teiler der
    Bildwiederholrate ist, landet auf der nächsterreichbaren Rate — bei 144 Hz liefert eine Kappe
    von 90 rund 72 Bilder. `docs/api-reference.md:1473` sagt zwei Schranken zu und keine Exaktheit
    dazwischen, behauptet also nichts Falsches; ein Satz, der die Quantisierung benennt, wäre
    trotzdem ehrlicher.
    *Herkunft: Paket 9, `- Nebenbefunde:`, mit dem ausdrücklichen Verweis »zusammen mit dem übrigen
    Doku-Teil«.* → **12b.**
17. **`Backlog.md:427` (Punkt 15 der Mittelfrist-Liste)** — was nach Paket 11 stehen bleibt:
    `appendRoute` aufteilen, die Dreifachbedeutung von `onDestroy`, die `isDestroyed`/`error`-Fläche
    von `IShadowObjectEnvProxy`.
    *Herkunft: Paket 11, Nachtrag.* **Urteil: kein Eingriff, und das ist die Entscheidung, nicht das
    Vergessen.** Alle drei sind API-Entwürfe mit eigenen Kosten, keiner ist Finding dieses Audits und
    keiner ist Folge dieses Laufs. Der Punkt bleibt als offener Mittelfrist-Posten im Backlog stehen,
    wo ihn ein dauerhafter Tracker bereits hält. → **nächstes Audit.**
18. **`audit.html:668` und `:1370`** behaupten, `packages/shae-offscreen-canvas/src/shared/utils.specs.js`
    sei nicht eingecheckt. Vor diesem Lauf war die Datei getrackt, seit Paket 9 gibt es sie nicht mehr.
    *Herkunft: Paket 9, `- Nebenbefunde:`.* Veraltete Aussage im Audit-Artefakt, kein Code-Befund.
    → **Schritt 7**, nicht dieses Paket (siehe »Abgrenzung« unten).
19. **Kein e2e-Fall für den `FrameLoop`-Export.** *Herkunft: Paket 9, Zug 4, als Entscheidung
    eingetragen, damit sie niemand neu aufwirft.* Kein Posten, kein Eingriff — hier nur, damit die
    Liste vollständig ist.
20. **`Backlog.md:305`, `:283`, `:297`, `:319`, `:306`, `:337`, `:268`, `:219`, `:304`** — die
    Zeilen, die die Pakete 9, 10 und 11 laut ihrer Nachträge selbst nachgezogen haben. In Zug 0
    stichprobenweise nachgeprüft: `:283` steht bei 202/404, `:301` bei 60 Fällen für
    `RemoteWorkerEnv`, `:306` führt `attr-utils` mit dem angekündigten Halbsatz, `:268` ist
    durchgestrichen und beantwortet. **Nichts offen.**

Drei Posten kommen in Zug 0 dazu, alle mit derselben Ursache wie etwas, das ohnehin angefasst wird:

21. **`turbo.json:11-23`** — `tasks.test.inputs` von `shadow-objects-e2e` führt weder `pages/**` noch
    `index.html` noch `public/**`, und `tasks.build.inputs` (`:8`) führt sie ebenso wenig. Die
    Assertions der 404 e2e-Fälle stehen in genau diesen Seiten (`Backlog.md:283`: »Assertions liegen
    in den Test-Pages«), die Suite läuft über `preview` gegen den *gebauten* Stand
    (`playwright.config.ts:33` `baseURL: http://localhost:4174`, `vite.config.mjs:18` `preview.port`),
    und `vite.config.mjs:10-14` liest das Verzeichnis, um daraus die Einstiegsliste zu bauen. Eine
    geänderte Assertion wird damit von zwei Cache-Treffern in Folge beantwortet. Vorbestehend
    (`git show d6e91f5:turbo.json` gleich), dieselbe Ursache wie Posten 1 und 2 und die größere
    Lücke von beiden. → **12a.**
22. **`packages/shadow-objects/src/view/ComponentContext.ts:21-37`** — der Klassen-Kommentar von
    `ComponentContext` steht unmittelbar über dem Kommentar von `ComponentContextDisposedError`
    (`:38-41`). Von zwei gestapelten JSDoc-Blöcken bindet TypeScript den unteren; der obere hängt an
    nichts und erreicht weder Editor noch `.d.ts`. Vorbestehend — `git show
    d6e91f5:packages/shadow-objects/src/view/ComponentContext.ts` zeigt dieselbe Stapelung. Dieselbe
    Ursache wie die Empfehlung von GLOBAL-SINGLETON, die genau in diesen TSDoc schreiben will: ohne
    den Umzug landet der neue Satz wieder an der Fehlerklasse. → **12a.**
23. **`Backlog.md:239` und `:428`** — die Performance-Tabelle sagt zu `cloneChangeTrail` »Default
    sollte für Local-Mode wohl umgekehrt sein (`disableStructuredClone: true`)«, und Punkt 16 der
    Mittelfrist-Liste führt »**Performance-Knopf:** `disableStructuredClone` als Default für
    `LocalShadowObjectEnv`«. Beides steht gegen die Entscheidung **PERF-CLONE** vom 2026-08-19, nach
    der der Klon Default bleibt. Ein Backlog, der eine getroffene Entscheidung weiter als offene
    Empfehlung führt, schickt den Nächsten auf denselben Weg. → **12b**, derselbe Zug wie der
    Doku-Absatz zu PERF-CLONE.

#### Zuschnitt: eine Rückfrage, mit Vorschlag

Das Paket ist zu breit für einen lesbaren Commit. Es ändert das Verhalten einer öffentlichen Methode,
die Eingabelisten des Monorepo-Orchestrators, die Dateiliste eines veröffentlichten Pakets, vier
Dokumentationsabschnitte, 136 Changelog-Glieder und ein Dutzend Zeilen im `Backlog.md`. Ein Diff, in
dem eine umsortierte Aufzählung und eine geänderte Auflösungsordnung nebeneinanderliegen, wird nicht
gelesen, sondern durchgewinkt.

**Vorschlag: zwei Commits, geschnitten an der Frage »ändert es, was die Software tut?«**

- **12a — Quelltext, Werkzeuge, und die Changelog-Zeilen dazu.** Alles, was ein Prüfer bemerkt:
  Tests, `tsc`, `pnpm build`, die Dateiliste unter `dist` und `.npm-pkg`, `pnpm lint:ci`, der
  turbo-Cache. Jede Änderung bringt ihre Doku- und Changelog-Zeile im selben Commit mit, wie
  `AGENTS.md` §4 es verlangt.
- **12b — die Prosa ohne Code.** Das Sortieren des Unreleased-Abschnitts, `Backlog.md`, die vier
  Doku-Absätze ohne Code-Bezug, die `README.md` des Beispielpakets. Kein Quelltext, keine
  Verhaltensänderung; geprüft wird durch Lesen und durch `pnpm lint:ci`.

Der Schnitt ist auch der Schnitt der Prüfung: 12a hat für jeden Posten ein Kommando, das ihn bestätigt
oder widerlegt. 12b hat für keinen einzigen eines. Zwei Arten von Arbeit, zwei Arten von Review.

**Wenn der Orchestrator einen Commit will:** die Schritte unten sind so geordnet, dass 12b hinter 12a
läuft; sie lassen sich ohne Umstellung zu einem Commit zusammenziehen. Die Betreffzeile wäre dann die
von 12a, und die Prosa-Posten verschwinden im Rauschen — genau der Grund für den Vorschlag.

- Dateien:
  - **12a:** `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts`,
    `src/view/LocalShadowObjectEnv.spec.ts`, `src/view/ShadowEnv.ts`, `src/view/RemoteWorkerEnv.ts`,
    `src/view/ComponentChanges.ts`, `src/view/ComponentContext.ts`,
    `src/elements/ShaeEntElement.ts`, `src/in-the-dark/Kernel.ts`,
    `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`,
    `turbo.json`, `biome.json`, `packages/shae-offscreen-canvas/vitest.config.ts`,
    `packages/shae-offscreen-canvas/package.json`, `packages/shae-offscreen-canvas/build.mjs`,
    `packages/shae-offscreen-canvas/CHANGELOG.md`, `CHANGELOG.md` (Wurzel), `pnpm-lock.yaml`
  - **12b:** `packages/shadow-objects/CHANGELOG.md`, `packages/shadow-objects/docs/concepts.md`,
    `packages/shadow-objects/docs/best-practices.md`, `packages/shadow-objects/docs/api-reference.md`,
    `packages/shae-offscreen-canvas/README.md`, `Backlog.md`

- Vorgehen:

  **12a — Quelltext und Werkzeuge**

  1. **Die lokale Umgebung hält ihre Signatur ein** (ENV-ASYMM, Weg A). In
     `view/LocalShadowObjectEnv.ts:51-61` wird `_waitForConfirmation` zu `waitForConfirmation` und
     gelesen. Der Lauf des Kernels bleibt, wo er ist — synchron, im selben Tick, vor der Rückkehr der
     Methode. Verschoben wird allein die **Auflösung**: bei gesetztem Flag geht sowohl das
     `Promise.resolve()` als auch das `Promise.reject(error)` einen Microtask später heraus. Die
     einfachste Form, die beides trägt, ist ein `await Promise.resolve()` in einer `async`-Hülle um
     die Auflösung, nicht um den Lauf; ein `queueMicrotask` täte es auch, kostet aber einen zweiten
     Promise-Bau. Ein Kommentar an Ort und Stelle sagt, *warum*: die entfernte Umgebung wartet an
     dieser Stelle auf eine Bestätigung, und ein Aufrufer, der lokal entwickelt und entfernt
     betreibt, soll nicht auf eine andere Auflösungsreihenfolge treffen, als die Signatur ihm zusagt.
     Ohne das Flag bleibt alles, wie es ist.
  2. **Fünf Spec-Fälle** in `view/LocalShadowObjectEnv.spec.ts` (heute 8 Fälle, ein
     `describe('LocalShadowObjectEnv')` in `:9` und ein `describe('destroy')` in `:56`; die Fälle
     kommen in ein neues `describe('applyChangeTrail')` dazwischen). **Rot zuerst**, gegen den Stand
     vor Schritt 1:
     1. *Der Lauf bleibt synchron, ohne Flag.* Nach `applyChangeTrail(trail, false)` — ohne jedes
        `await` — meldet `env.kernel.hasEntity(uuid)` bereits `true`. Grün vorher und nachher; der
        Fall ist der Wächter, der verhindert, dass jemand den Lauf statt der Auflösung verschiebt.
     2. *Der Lauf bleibt synchron, mit Flag.* Dasselbe mit `true`. Grün vorher und nachher.
     3. *Ohne Flag löst die Zusage vor einer unmittelbar danach angemeldeten Kontroll-Zusage auf.*
        `const order = []; env.applyChangeTrail(t, false).then(() => order.push('trail'));
        Promise.resolve().then(() => order.push('control'));` und nach dem Ausdrainen
        `['trail', 'control']`. Grün vorher und nachher.
     4. *Mit Flag löst sie danach auf* — dieselbe Anordnung mit `true`, erwartet
        `['control', 'trail']`. **Rot vorher.**
     5. *Mit Flag geht auch die Ablehnung einen Microtask später.* Ein Kernel, dessen `run()` wirft
        (die Attrappe der Datei benutzen oder `kernel.run` überschreiben), dazu dieselbe
        Kontroll-Zusage; erwartet `['control', 'trail']` und eine Ablehnung mit demselben Fehler.
        **Rot vorher.**
     Zielzahl der Datei danach: **13**.
  3. **`view/ShadowEnv.ts:117`** — `if (ns == null) return;` wird `if (!ns) return;`. Freigabe und
     Registrierung (`:90`) prüfen damit dieselbe Bedingung. Kein Spec-Fall: der Pfad ist über keinen
     Aufruf erreichbar, weil der Setter einen leeren String gar nicht erst registriert — genau der
     Grund, aus dem die Zeile hier und nicht in einem eigenen Paket steht. Ein halber Satz im
     Kommentar darüber sagt, dass beide Seiten denselben Test führen.
  4. **`elements/ShaeEntElement.ts:410` und `:419`** — den doppelten Ausdruck zusammenziehen. Neu ist
     eine private Methode ohne Zwischenspeicher, etwa `#readShadowRootHost(): HTMLElement | undefined`,
     die den Kommentar aus `:407-409` trägt: `getRootNode()` antwortet für jeden Zustand des Baums,
     und nur eine Shadow Root hat einen `host`. `findShadowRootHost()` bleibt der Zwischenspeicher
     darüber und behält den Halbsatz zu `#shadowRootHostNeedsUpdate`; `getParentNodeForObserver()`
     behält seinen eigenen Kommentar zum ersten Term. Der Gewinn ist nicht die gesparte Zeile,
     sondern dass die Trennung zwischen »gepuffert« und »frisch gelesen« dadurch einen Namen bekommt
     — heute unterscheiden sich die beiden Stellen nur durch das, was um sie herum steht. Keine
     Verhaltensänderung, kein Spec-Fall, kein Changelog-Glied.
  5. **`view/RemoteWorkerEnv.ts:312`** — das `as any` fällt. In derselben Datei, **nicht** in
     `types.ts`, entsteht ein nicht exportiertes `interface ChangeTrailMessage extends SyncEvent
     { type: typeof ChangeTrail; }`, und die Zeile wird
     `const message: ChangeTrailMessage = {type: ChangeTrail, changeTrail: outbound};`. `serial`
     bleibt optional und wird in `:323` wie bisher nachgesetzt. Bewusst nicht der andere Weg:
     `SyncEvent` um ein `type`-Feld zu erweitern hieße entweder ein Pflichtfeld einzuführen, das
     `LocalShadowObjectEnv.ts:52` nicht setzt und auch nicht setzen sollte — dort geht keine Nachricht
     über eine Grenze —, oder ein optionales Feld in einen öffentlichen Typ zu schreiben, dessen
     beide Nachbarn (`ImportedModuleEvent`, `AppliedChangeTrailEvent`) es zwingend führen. Ein
     lokales Interface sagt genau, was auf der Leitung liegt, und rührt die veröffentlichte
     Typfläche nicht an. Nachweis: `pnpm typecheck` und `git diff` über die erzeugten `.d.ts` nach
     `pnpm build`.
  6. **`in-the-dark/Kernel.ts:863-864`** (KERN-DOC-001) — der abgebrochene Kommentar. Der Satz wird
     zu Ende geschrieben, nicht gekürzt: was fehlt, ist das Verfahren, und das steht drei Zeilen
     tiefer im Code. Er soll sagen, dass `entry.usedConstructors` je Konstruktor die Menge der von
     ihm erzeugten Shadow Objects führt, wozu die Buchführung dient (das Aufräumen beim Wechsel des
     Konstruktorsatzes, `updateShadowObjects()`), und dass der Eintrag mit dem Abbau des Shadow
     Objects wieder verschwindet. Der Kommentarblock über `#shadowObjectTearDowns` (`:89-100`) ist
     die Vorlage für Ton und Länge.
  7. **`view/ComponentChanges.ts`** (CHANGES-FE) — ein Klassen-Kommentar über `:17`. Er benennt das
     Modell der vier Zustandspaare (geschrieben ↔ ausstehend: `#token`/`#nextToken`,
     `#parentUuid`/`#nextParentUuid`, `#order`/`#nextOrder`, `#properties`/`#nextProperties`) und die
     Reihenfolge, ohne die die Klasse falsch antwortet: die `make*`-Methoden schreiben den
     ausstehenden Wert in den bestätigten fort, und `clear()` muss danach laufen — `buildChangeTrails()`
     im `ComponentContext` ist der einzige Aufrufer, der beides in dieser Folge tut. Dazu je ein
     halber Satz an den `make*`-Methoden, der ihren Seiteneffekt kenntlich macht. Keine Finding-ID,
     nirgends: die Regel steht als Satz da, mit ihrer Begründung daneben.
  8. **`view/ComponentContext.ts:21-41`** — den verwaisten Klassen-Kommentar (Posten 22) an die
     Klasse zurückholen: der Block `:21-37` wandert unter die Fehlerklasse, direkt über
     `export class ComponentContext` (`:63`), und `ComponentContextDisposedError` behält seinen
     eigenen. In denselben Block kommt der Code-Teil von GLOBAL-SINGLETON: dass eine Instanz je
     Namespace existiert, dass der Konstruktor deshalb bei belegtem Namespace die **vorhandene**
     Instanz zurückgibt statt einer zweiten, und dass `ComponentContext.get()` der Weg ist, den
     Konsumenten nehmen sollen. `docs/api-reference.md:908` sagt beides bereits — der TSDoc holt es
     dorthin, wo ein Editor es zeigt. Der Architektur-Absatz zu SSR und Multi-Tenancy gehört nicht
     hierher, sondern nach 12b, Schritt 2.
  9. **Die vier Werkzeug-Zeilen** (Posten 1, 2, 3, 21):
     - `turbo.json:8` — `inputs` von `tasks.build` bekommen `"vite.config.*"`, `"pages/**"`,
       `"public/**"` und `"index.html"`.
     - `turbo.json:13-21` — `inputs` von `tasks.test` bekommen `"playwright.config.ts"`,
       `"pages/**"`, `"public/**"` und `"index.html"`.
     - `biome.json:2` — `$schema` auf `https://biomejs.dev/schemas/2.5.9/schema.json`.
     Die Muster gelten je Paket und laufen dort, wo es die Verzeichnisse nicht gibt, ins Leere — das
     ist bei den bestehenden Einträgen `test/**` und `tests/**` schon so.
  10. **Der Kopf des Changelogs** (Posten 12). Zwei Eingriffe, in dieser Reihenfolge:
      - Die Glieder 20, 21 und 22 des Kopfsatzes — die drei Klauseln zum `ComponentContext`-Teardown,
        beginnend bei »and `ComponentContext.clear()`, `.destroyComponent()` and `.removeSubTree()`
        destroy the `ViewComponent`s« — werden mit Gedankenstrichen statt mit Semikola verbunden. Sie
        beschreiben **eine** Änderung in drei Klauseln, und genau das ist der Versatz von 2, den vier
        Pakete hintereinander nachgerechnet haben. Danach gilt wieder: ein Semikolon-Glied ist eine
        gezählte Änderung, und die Zahl im Kopfsatz lässt sich in einem Kommando prüfen.
      - Ein neues Glied für Schritt 1: `applyChangeTrail(trail, true)` löst in der lokalen Umgebung
        einen Microtask später auf, so wie die Signatur es zusagt und die entfernte Umgebung es tut.
        Das erreicht einen Konsumenten, der die Auflösung gegen andere Zusagen verschränkt, und zählt
        deshalb mit.
      Ergebnis: **31** Semikolon-Glieder, Kopfzahl **»Thirty-one«**, Versatz **0**.
  11. **Die Changelog-Glieder von 12a.** In `packages/shadow-objects/CHANGELOG.md` unter
      `## [Unreleased]`: ein `**Behavior (environments):**`-Glied für Schritt 1, das auch sagt, dass
      der Kernel-Lauf synchron bleibt und allein die Auflösung wandert. Kein Glied für die Schritte 3
      bis 8 — kein Konsument sieht dort einen Unterschied; die Historie steht in der Commit-Message.
      In `CHANGELOG.md` an der Wurzel ein neuer datierter Abschnitt für die Monorepo-Vorgänge: die
      drei Input-Listen mit dem Satz, warum eine fehlende Eingabe ein stiller Cache-Treffer ist, die
      `$schema`-Zeile, das `specs` aus dem vitest-Muster, die beiden gestrichenen devDependencies,
      und der `filter` in `build.mjs`. In `packages/shae-offscreen-canvas/CHANGELOG.md` unter
      `## [Unreleased]` das Glied zur Auslieferung: das veröffentlichte Paket führt keine Spec-Dateien
      mehr.
  12. **`packages/shae-offscreen-canvas/vitest.config.ts:7`** — `specs` aus der Alternative streichen,
      Muster wird `src/**/*.{spec,test}.{js,ts}`.
  13. **`packages/shae-offscreen-canvas/package.json`** — `@esm-bundle/chai` und `sinon` aus den
      devDependencies nehmen. Katalog und Wurzelmanifest bleiben unberührt (siehe die Korrektur unter
      Posten 4). Danach `pnpm install`, damit `pnpm-lock.yaml` mitkommt.
  14. **`packages/shae-offscreen-canvas/build.mjs:12`** — der `cp`-Aufruf bekommt einen `filter`, der
      Dateien mit `.spec.js`, `.specs.js` und `.test.js` am Namensende auslässt. Der `filter` von
      `node:fs/promises` `cp` bekommt Quell- und Zielpfad und muss für Verzeichnisse `true` liefern,
      sonst wird der ganze Teilbaum übersprungen — das gehört in einen Kommentar, weil es die einzige
      Falle der Stelle ist. Ein Satz darüber sagt, warum gefiltert wird: das veröffentlichte Paket ist
      eine Quelldistribution, und eine Spec ist kein Teil davon.
  15. **`pnpm make:todo`** nur, falls einer der Kommentare aus den Schritten 1 bis 8 mit `TODO`
      beginnt — er soll es nicht. Zur Sicherheit `git diff --stat TODO.md` prüfen.

  **12b — Doku, Changelog-Gliederung, Backlog**

  1. **Der Unreleased-Abschnitt wird gegliedert** (CHANGELOG-001, der Teil, der bleibt).
     `packages/shadow-objects/CHANGELOG.md:98-241` trägt **136** Glieder in einer flachen Liste. Sie
     bekommen Zwischenüberschriften auf `###`-Ebene, in der Reihenfolge, in der ein Leser sie braucht:
     `### ⚠️ Breaking Changes`, `### New`, `### Behavior`, `### Bugfixes`, `### Types`,
     `### Dependencies`, `### Internal`. Die Namen sind nicht erfunden: `## [0.28.0]` (`:313`) und
     `## [0.27.0]` (`:330`) führen `### ⚠️ Breaking Changes` bereits. Innerhalb jeder Gruppe wird nach
     dem Bereich in Klammern sortiert (`elements`, `kernel`, `public API`, `types`, `view`,
     `view components`, `worker`, `worker environments`), innerhalb eines Bereichs bleibt die
     bestehende Folge. **Der Wortlaut keines Gliedes wird angefasst** — die Einträge sind sorgfältig
     geschrieben, und wer beim Sortieren umformuliert, verliert die Kontrolle über das, was er tut.
     Der Kopf (`:12-97`) bleibt, wie 12a ihn hinterlassen hat.
     Zählprobe vor und nach dem Schritt: `awk 'NR>=98 && NR<=241' … | grep -c '^- \*\*'` → **136**
     beide Male (die Zeilennummern nach dem Einfügen der Überschriften neu nehmen).
  2. **Der Architektur-Absatz zu den drei Registries** (GLOBAL-SINGLETON, Posten 14, 15). In
     `docs/concepts.md`, §2 »Architecture«, hinter `### Multi-Environment Setup` (`:95-108`) ein
     neuer Abschnitt. Er beschreibt in einem Zug, was heute an drei Stellen halb steht:
     `globalThis.__shadowEntsContexts` und `globalThis.__shadowEnvs` hängen bewusst am globalen
     Objekt, damit Custom Elements aus verschiedenen Modul-Instanzen denselben Namespace finden; die
     geteilte `FrameLoop` hängt dagegen am Modulzustand und übersteht eine doppelte Installation
     **nicht** — zwei Modulpfade liefern zwei »geteilte« Schleifen mit je eigener Abonnentenzahl.
     Dazu die Folgen, die nirgends stehen: bei SSR wandert Zustand zwischen Requests, in
     Multi-Tenant-Umgebungen teilen sich Mandanten Namespaces, und wer Tests isolieren will, greift
     zu `ComponentContext.dispose()`, zum ownership-geprüften `view`-Setter und zu `new FrameLoop()`.
     Verweise auf `api-reference.md:908` (Rückgabeverhalten des Konstruktors), `:1121`
     (`ShadowEnv.get`) und `#frameloop`, statt sie zu wiederholen.
  3. **`docs/api-reference.md:1426` und `:1591`** — die beiden Sätze, die die geteilte Schleife
     stärker zusagen, als sie ist: »Created on first read, the same instance afterwards« und »There
     is one per process — every element that reads it gets the same instance«. Beide bekommen die
     Einschränkung, die der Handdurchgang von Paket 9 gemessen hat: pro Modul-Instanz, nicht pro
     Prozess. Ein Verweis auf den Absatz aus Schritt 2 reicht für die Begründung.
  4. **`docs/api-reference.md:1473`** (`### Capping the frame rate`, Posten 16) — ein Satz zur
     Quantisierung: eine Kappe, die kein ganzer Teiler der Bildwiederholrate ist, landet auf der
     nächsterreichbaren Rate; bei 144 Hz liefert `maxFps = 90` rund 72 Bilder. Die beiden Schranken,
     die der Absatz bereits zusagt, bleiben unangetastet — dazwischen wird nichts zugesagt, und jetzt
     steht auch, warum.
  5. **Der Performance-Absatz zu PERF-CLONE.** Einen »Performance-Abschnitt« gibt es in der Doku
     nicht; die nächstgelegene Stelle ist `docs/best-practices.md` §6, »When to Use Local vs. Remote
     Environments« (`:158-197`), die `no-structured-clone` in `:168` schon erwähnt. Dort ein
     Unterabschnitt, der die Entscheidung ausschreibt: die lokale Umgebung klont, obwohl keine
     Thread-Grenze dazu zwingt, weil sie damit dieselbe Semantik hat wie die entfernte — wer lokal
     entwickelt, trifft entfernt auf dasselbe Verhalten, und ein Objekt, das lokal per Referenz
     durchginge, wäre entfernt eine Kopie. Wer den Preis nicht zahlen will und die Datenhoheit hat,
     schaltet ab: `no-structured-clone` am `<shae-worker local>` oder
     `localEnv.disableStructuredClone = true`. Dazu ein halber Satz an
     `docs/api-reference.md:1287` (die `disableStructuredClone`-Zeile), der auf den Abschnitt zeigt.
     Kein Code-Eingriff, kein Changelog-Glied — es ändert sich nichts, es steht nur endlich da.
  6. **`docs/api-reference.md:2247`** (Posten 11) — hinter den Absatz, der die vier Traversierungen
     als Träger des Ringfalls benennt, ein Satz zur Grenze des Schutzes: ein Ring, der über
     `Entity.addChild()` oder `ComponentContext.addToChildren()` geschlossen wurde und von keiner
     Wurzel erreichbar ist, wird von `Kernel.destroy()` nicht durchlaufen; seine Entities gehen mit
     der Buchführung, ohne dass ihr `onDestroy` läuft. Die Traversierungen terminieren, der Teardown
     findet den Ring nicht. Dazu ein Halbsatz am Changelog-Glied
     `packages/shadow-objects/CHANGELOG.md:112`, das den Guard beschreibt — die Fundstelle nach dem
     Sortieren aus Schritt 1 neu nehmen.
  7. **`packages/shae-offscreen-canvas/README.md:16` und `:23`** (Posten 7) —
     `<shae-offscreen-canvas-ctx>` wird `<shae-worker>`, öffnendes und schließendes Tag. Der Satz
     darunter (`:26`) spricht vom `src`-Attribut und bleibt richtig. Gegenprobe:
     `packages/shae-offscreen-canvas/index.html:112`.
  8. **`Backlog.md`**, sechs Stellen (Zeilennummern vor dem Schritt; wer von oben nach unten
     arbeitet, nimmt sie unterwegs neu):
     - `:278` — »17 Dateien, 435 Fälle« → **19 Dateien, 551 Fälle**.
     - `:281` — »23 Dateien, 334 Fälle« → **24 Dateien, 345 Fälle**.
     - `:231` (`LOW-4`) — die drei Einzelsätze durch den Absatz ersetzen, der alle drei Singletons in
       einem Zug beschreibt, mit dem Unterschied zwischen »am globalen Objekt« und »am Modulzustand«
       als Kern. Er streicht keinen der drei Befunde und verweist auf den neuen Abschnitt in
       `concepts.md`.
     - `:232` (`LOW-5`) — »Konstruktor von `ComponentContext` gibt eine vorhandene Instanz via
       `return` zurück — funktioniert, ist aber überraschend«: der Halbsatz »ist aber überraschend«
       wird durch den Stand ersetzt. Überraschend ist es nur noch für den, der weder den TSDoc der
       Klasse noch `api-reference.md:908` gelesen hat; der Befund selbst bleibt offen, weil das
       Verhalten bleibt.
     - `:239` (Performance-Tabelle, Zeile `cloneChangeTrail`) — die Empfehlung »Default sollte für
       Local-Mode wohl umgekehrt sein« wird durch die getroffene Entscheidung ersetzt: der Klon bleibt
       Default, weil er die semantische Gleichheit zur entfernten Umgebung sichert; abschaltbar über
       `no-structured-clone` und `disableStructuredClone`, Begründung in `best-practices.md`.
     - `:428` (Punkt 16 der Mittelfrist-Liste) — der Halbsatz »`disableStructuredClone` als Default
       für `LocalShadowObjectEnv`« geht aus der Aufzählung; das optionale RAF-Coalescing bleibt als
       Punkt stehen.
     Ausdrücklich **nicht** angefasst: Punkt 15 (`:427`) — siehe Posten 17 der Sammelliste.

- Verify:

  **12a**
  1. **Rot zuerst.** `pnpm -F @spearwolf/shadow-objects exec vitest src/view/LocalShadowObjectEnv.spec.ts --run`
     nach Schritt 2 und **vor** Schritt 1 — erwartet **2 rote von 13** (die Fälle 4 und 5 des
     Schritts 2), und zwar an der Reihenfolge, nicht an einer Ausnahme: die Ausgabe muss
     `['trail', 'control']` gegen erwartete `['control', 'trail']` zeigen. Wer hier eine andere
     Fehlerart sieht, hat den Lauf statt der Auflösung verschoben. Die Ausgabe gehört in den Bericht.
  2. `pnpm -F @spearwolf/shadow-objects exec vitest src/view/LocalShadowObjectEnv.spec.ts --run`
     nach Schritt 1 — **13 grün**.
  3. `pnpm -F @spearwolf/shadow-objects test` → **551 → 556** in **19** Dateien.
  4. `pnpm -F @spearwolf/shae-offscreen-canvas test` → **7** in **1** Datei, unverändert. Das ist
     zugleich der Nachweis, dass Schritt 12 die verbliebene Spec noch findet, und Schritt 13 ihr
     nichts weggenommen hat.
  5. `pnpm typecheck --force` → 3/3 ohne Cache. Deckt Schritt 5 ab.
  6. `pnpm test:ci --force` → **903 → 908** (556 + 7 + 345).
  7. `pnpm -F shadow-objects-e2e test` → **404** in Chromium und Firefox, unverändert.
  8. `pnpm lint:ci` → **196** geprüfte Dateien, **2** bekannte Infos. Die gestrichenen
     devDependencies ändern die Zahl der geprüften Dateien nicht.
  9. `pnpm build --force`, danach `find packages/shadow-objects/dist -type f | sort` gegen den Stand
     davor: **198** Dateien, unverändert. `packages/shadow-objects/dist/package.json` zeichengleich —
     Schritt 5 rührt keine exportierte Deklaration an, Schritt 13 kein Manifest dieses Pakets.
  10. `find packages/shae-offscreen-canvas/.npm-pkg -type f | sort` → **20 → 19**. Die einzige
      zulässige Abweichung ist der Wegfall von
      `.npm-pkg/src/elements/ShaeOffscreenCanvasElement.spec.js`. Die Liste vor und nach dem Bau
      gehört in den Bericht.
  11. **Der Cache-Nachweis für Schritt 9**, weil eine Input-Liste sonst nichts beweist: einmal
      `pnpm -F shadow-objects-e2e build` bis zum Cache-Treffer, dann
      `touch packages/shadow-objects-e2e/pages/bundle.html` und derselbe Aufruf. Mit den neuen
      Mustern läuft der Task, ohne sie meldet turbo `cache hit`. Beide Ausgaben in den Bericht.
      Dasselbe für `playwright.config.ts` gegen `shadow-objects-e2e#test`.
  12. Die Kopfzahl gegen die Glieder:
      `python3 -c "..."` in der Form, mit der Zug 0 gemessen hat — den Kopf-Blockquote einlesen, ab
      `consumers:` an `;` teilen, zählen. Erwartet **31**, und das Zahlwort im Kopfsatz
      **»Thirty-one«**. Versatz **0**.

  **12b**
  1. `pnpm lint:ci` → **196** Dateien, **2** Infos. Biome formatiert Markdown nicht, der Lauf ist
     der Nachweis, dass nichts anderes mitgegangen ist.
  2. `git diff --stat` — die Liste der berührten Dateien muss genau die sechs unter »Dateien: 12b«
     sein. Kein `src/`, kein `package.json`, kein `turbo.json`.
  3. Die Gliederzahl des Unreleased-Abschnitts vor und nach Schritt 1: **136** beide Male.
     `grep -c '^- \*\*' ` über den Bereich zwischen `## [Unreleased]` und `## [0.33.0]`.
  4. Die Kopfzahl bleibt **31** und die Zahl der Semikolon-Glieder ebenfalls — 12b fasst den Kopf
     nicht an, und der Prüfbefehl aus 12a-12 muss dasselbe Ergebnis liefern wie dort.
  5. `pnpm test:ci` → **908**, unverändert gegenüber 12a. Ein Prosa-Commit, der eine Testzahl
     bewegt, hat Code angefasst.
  6. Von Hand: die vier Doku-Absätze gegen die datierten Entscheidungen im Kopf dieses Plans halten —
     PERF-CLONE (2026-08-19), GLOBAL-SINGLETON (kein Umbau, nur Beschreibung), die
     `FrameLoop`-Entscheidungen aus Zug 4 von Paket 9. Kein Absatz darf eine Empfehlung aussprechen,
     die eine dieser Entscheidungen bereits abgelehnt hat.
  7. Von Hand: kein Rückblick auf den Vorzustand in `docs/` und in der `README.md` — die Konvention
     dieses Plans, von der nur `Backlog.md` und die beiden `CHANGELOG.md` ausgenommen sind.

- Commit:
  - **12a:** `fix(view): the local environment honours waitForConfirmation, and the tooling sees what it hashes` — committet als `ce24b9d`
  - **12b:** `docs: write down the singletons, the clone default and the frame-rate cap, and sort the unreleased section` — committet als `86623a5`
  - **Bei einem einzigen Commit:** `fix(view): the local environment honours waitForConfirmation, and what is deliberate is written down`

- Ergebnis (2026-08-19, zwei Commits): 12a (`ce24b9d`, 17 Dateien) — die lokale Umgebung liest
  `waitForConfirmation`, turbo hasht die e2e-Seiten, `tests/**` und die Playwright-Konfiguration, und neun
  kleinere Eingriffe von der Namespace-Freigabe bis zum ausgelieferten Beispielpaket. 12b (`86623a5`,
  6 Dateien) — die drei bewussten Entwurfsentscheidungen stehen geschrieben, und der Unreleased-Abschnitt
  ist gegliedert. Gesamtzahl 903 → **908** (556 + 7 + 345), e2e **404**, `dist` **198**, `.npm-pkg` **19**.
  `pnpm lint:ci` meldet seit 12a nur noch **1 Info**; die zweite hat sich mit der Schema-Zeile in
  `biome.json` erledigt.
- Nebenbefunde (2026-08-19), gemeldet und nicht angefasst:
  - Zwölf Glieder des Unreleased-Abschnitts tragen Audit-Kürzel im Etikett (`VIEW-14` bis `VIEW-26`,
    `KERN-8`, `LOW-4`), und `Backlog.md` gliedert nach `LOW-*`/`KERN-*`. Alles vorbestehend, aus früheren
    Läufen. Sie umzubenennen ist ein eigener Vorgang mit eigenem Beschluss, kein Nebensatz dieses Pakets.
    → nächstes Audit.
  - `Dependencies (breaking)` steht in der Gruppe `### Dependencies`, nicht bei den Breaking Changes,
    obwohl es der folgenreichste Posten des Abschnitts ist. Folgt der Sortierregel nach Etikett; der
    Blockquote nennt die Abhängigkeiten als erstes seiner 31 Glieder, damit ist es entschärft.
  - 24 `Docs (…)`-Glieder liegen unter `### Internal`, weil der Plan keine Doku-Gruppe vorsieht und
    `Internal` der einzige nicht-konsumentenseitige Behälter ist. Beim nächsten Schnitt der Gliederung
    wäre eine eigene Gruppe die bessere Antwort.
- Abgrenzung zu Schritt 7 des Skills: Dieses Paket erledigt **nichts** von der Semver-Bewertung, dem
  Nachführen von `./audit.html` und dem Abschluss-Commit. Konkret:
  - **Bleibt bei Schritt 7:** die Semver-Bewertung des Laufs; das Nachführen von `./audit.html`
    (darunter Posten 18 der Sammelliste — die beiden Stellen `:668` und `:1370` zu
    `utils.specs.js` — und der Status der 31 bearbeiteten Findings); der Abschluss-Commit, der
    `remediation-plan-2.md` ins Repo nimmt (Entscheidung »Plan-Verbleib« vom 2026-08-19).
  - **Erledigt Paket 12:** die Kopfzahl des Changelogs samt ihrem Versatz, weil sie ein Artefakt des
    Changelogs ist und nicht der Bewertung — Schritt 7 liest sie, er schreibt sie nicht. Und die
    Gliederung des Unreleased-Abschnitts, die CHANGELOG-001 verlangt; die Versionsanhebung, die
    derselbe Befund empfiehlt, bleibt draußen und ist am 2026-08-19 abgelehnt worden. Schritt 7 darf
    den Kopf also zitieren, aber muss ihn nicht anfassen.

- Modell:
  - **12a: mittlere Stufe.** Neun Eingriffe, jeder klein, und für jeden gibt es einen Prüfer: fünf
    Spec-Fälle für die Auflösungsordnung, `tsc` für das lokale Interface, `pnpm build` samt
    Dateiliste für den `filter`, zwei turbo-Läufe für die Eingabelisten, `pnpm lint:ci` für den Rest.
    Der einzige Ort mit einem Zustandsraum ist Schritt 1, und der ist durch zwei Wächterfälle
    eingezäunt, die vorher wie nachher grün sind.
  - **12b: stärkste Stufe.** 136 Glieder umzugruppieren, ohne eines zu verlieren, zu verdoppeln oder
    unterwegs umzuformulieren, ist genau die Arbeit, in der eine schwächere Stufe abkürzt und
    zusammenfasst. Dazu vier Doku-Absätze, die gegen fünf datierte Entscheidungen dieses Plans
    gehalten werden müssen, und ein `Backlog.md`, das seit Paket 1 von jedem Paket fortgeschrieben
    wurde. Es gibt kein Kommando, das einen Fehler hier meldet — der einzige Prüfer ist das Lesen.
  - Läuft der Zuschnitt als **ein** Paket, gilt die stärkste Stufe für das Ganze: die Gliederung des
    Changelogs bestimmt dann die Stufe, nicht die neun kleinen Eingriffe.

- Rückfragen an den Orchestrator (Zug 0, 2026-08-19), jede mit Vorschlag:
  1. **Ein Paket oder zwei?** Vorschlag: **zwei**, geschnitten wie oben — 12a ändert, was die
     Software tut, 12b, was das Projekt darüber sagt. Der Schnitt ist zugleich der Schnitt der
     Prüfung. Bei »ein Paket« laufen die Schritte unverändert in der gegebenen Reihenfolge.
  2. **Zählt ENV-ASYMM im gezählten Kopf mit?** Vorschlag: **ja.** Ein Aufrufer, der
     `applyChangeTrail(trail, true)` gegen andere Zusagen verschränkt, sieht eine andere Reihenfolge —
     das ist der Maßstab, den der Kopfsatz selbst anlegt. Er wird damit 30 → 31.
  3. **Die Gedankenstrich-Behandlung der Teardown-Gruppe.** Vorschlag: **ja**, und zwar statt einer
     Anhebung der Kopfzahl auf 33. Die drei Klauseln beschreiben eine Änderung; sie zu drei Gliedern
     zu erklären, machte die Zahl prüfbar, aber die Aussage falsch. Mit dem Zusammenziehen stimmen
     Zahl und Aussage, und der Versatz, den vier Pakete nachgerechnet haben, ist weg.
  4. **`ShaeEntElement.ts:410/419` zusammenziehen oder stehen lassen?** Vorschlag: **zusammenziehen.**
     Nicht wegen der gesparten Zeile, sondern weil die Trennung zwischen dem gepufferten und dem
     frisch gelesenen Zugriff dadurch einen Namen bekommt; heute unterscheiden sich die beiden
     Stellen nur durch ihre Umgebung, und die nächste Änderung an einer von ihnen ist eine Wette.
  5. **Punkt 15 des Backlogs** (`appendRoute`, `onDestroy`, `IShadowObjectEnvProxy`). Vorschlag:
     **kein Eingriff**, der Punkt bleibt offen stehen. Drei API-Entwürfe, keiner ein Finding dieses
     Audits, keiner eine Folge dieses Laufs — und dieses Paket ist das Sammelbecken für Konsistenz,
     nicht für Entwürfe.
  6. **Die devDependencies der Wurzel** (`sinon`, `@types/sinon` in `package.json:35,40`). Vorschlag:
     **stehen lassen und ins nächste Audit.** Die Triage von Paket 4 hat sie übersehen und den
     Katalog-Eintrag `@types/sinon` für referenzlos erklärt; er ist es nicht. Ob die Wurzel die
     beiden noch braucht, ist eine Frage an ein anderes Manifest als das, um das es hier geht.

## Für das nächste Audit

Vorbestehende Befunde, die in diesem Lauf auffielen und in keinem offenen Paket dieselbe Ursache
antreffen. Sie verlassen den Lauf; hier stehen sie, damit sie nicht mit ihm verschwinden.

- `packages/shadow-objects/src/utils/toUrlString.ts:3` — `new URL(url, globalThis.location.href)` greift
  ungeprüft auf `location` zu. Aufgefallen in Zug 0 von Paket 2, nachgewiesen vorbestehend gegen
  `git show d6e91f5:packages/shadow-objects/src/utils/toUrlString.ts` (byteidentisch). Die drei Aufrufer
  (`worker/MessageRouter.ts:69`, `view/LocalShadowObjectEnv.ts:64`, `view/RemoteWorkerEnv.ts:255`) laufen
  alle in einem Fenster oder in einem Worker, wo `location` existiert; ein blanker Node-Kontext ohne DOM
  bekommt einen `TypeError`. Kein offenes Paket dieses Laufs fasst die URL-Auflösung an, und ein Guard
  allein wäre eine Änderung ohne einen Fall, der sie fordert.
- `packages/shadow-objects/src/utils/waitForMessageOfType.ts:46` — der Hörer liest `event.data.type`
  ungeprüft. Aufgefallen in Zug 0 von Paket 5, nachgewiesen vorbestehend gegen
  `git show d6e91f5:packages/shadow-objects/src/utils/waitForMessageOfType.ts` (byteidentisch). Es ist die
  View-Seite desselben Musters, das `ROUTER-003` auf der Worker-Seite beschreibt: ein `self.postMessage(null)`
  aus einem Shadow-Objects-Modul im Worker wirft hier einen `TypeError`, solange eine Anfrage unterwegs ist —
  `RemoteWorkerEnv.onMessageFromWorker` ist mit seinem `event.data?.type` dagegen gefeit, dieser Hörer nicht.
  Kein offenes Paket fasst die Datei an: Paket 5 baut die Guards um, die von hier aus gerufen werden, nicht
  den Hörer, und Paket 11 tauscht nur Timeout-Argumente an den Aufrufstellen. Auslösen kann es allein
  handgeschriebener Worker-Code; im Repo gibt es keinen Aufrufer dafür.
- `packages/shadow-objects/src/in-the-dark/Kernel.ts:354-356` — `setParent()` stellt `onParentChanged` per
  `queueMicrotask` zu. Ein Handler, der von dort aus `dispatchMessageToView()` ruft, reiht seine Nachricht einen
  zweiten Microtask später ein und fällt damit hinter das Abhängen der Proxy-Callbacks, das Paket 6 auf genau
  eine Ebene ausgelegt hat. Aufgefallen in Zug 0 von Paket 6, nachgewiesen vorbestehend in Zug 0 von Paket 7:
  der Block ist zeichengleich mit `git show d6e91f5:…` (`:355-360`), und der einzige Unterschied an der ganzen
  Datei über diesen Lauf ist der Wrapper-Typ in `:190` aus Paket 1. Paket 8 fasst dieselbe Datei an, aber nicht
  dieselbe Ursache: seine drei Befunde sind der Lookup-Vertrag, das Aliasing des BFS-Caches und der
  Zyklusschutz. Die Zustellzeit eines öffentlichen Lebenszyklus-Ereignisses zu ändern, ist eine eigene
  Entscheidung mit eigener Changelog-Pflicht — nirgends zugesagt, aber auch nicht hypothetisch, und
  `docs/api-reference.md:1352` beschreibt die Grenze bisher nur für den Worker-Teardown.
- `packages/shadow-objects/src/in-the-dark/Entity.ts:296-298` — `getPropertyWriter()` gibt den Schreibkopf einer
  Property heraus. Wer ihn wegspeichert und später ruft, schreibt an `setProperty()` vorbei und damit an der
  Verwerfung des truthyProps-Caches, die Paket 7 dort einzieht; `truthyProps()` meldet danach wieder einen Satz,
  den es nicht mehr gibt. Aufgefallen in Zug 0 von Paket 7, vorbestehend (`Entity.ts` byteidentisch mit
  `git show d6e91f5:…`). Gleiche Ursache wie `ENT-PROP-001`, von dessen Empfehlung aber nicht gedeckt: dicht
  wäre der Weg erst, wenn die Verwerfung am Signal hinge statt am Aufrufer — ein anderer Entwurf mit eigenen
  Kosten. Im Repo gibt es keinen Aufrufer außer `setProperty()` selbst; auslösen kann es nur ein Worker-Modul
  eines Konsumenten, das sich den Schreibkopf über `kernel.getEntity()` holt.
- `package.json:35,40` an der Wurzel — `sinon` und `@types/sinon` stehen in den devDependencies des
  Wurzelmanifests, ohne dass eine Datei der Wurzel sie benutzt; `packages/shadow-objects-testing`
  führt `sinon` selbst (`package.json:29`) und benutzt es in drei Specs. Aufgefallen in Zug 0 von
  Paket 12 beim Nachprüfen der Triage von Paket 4, die den Katalog-Eintrag `@types/sinon` für
  referenzlos erklärt hatte — er ist es nicht, `package.json:35` führt ihn, und zwar bereits in
  `d6e91f5`. Vorbestehend und nachweislich unangetastet von diesem Lauf. Paket 12 streicht die
  beiden Zeilen im Manifest von `packages/shae-offscreen-canvas`, weil sie dieselbe Ursache haben
  wie die Werkzeug-Zeilen daneben; das Wurzelmanifest ist ein anderes Manifest mit einer anderen
  Frage — ob eine Testbibliothek an der Wurzel stehen soll, damit ein Editor die JS-Specs eines
  Unterpakets typisieren kann, ist eine Entscheidung und keine Aufräumarbeit.
- `Backlog.md:427` (Punkt 15 der Mittelfrist-Liste) — `appendRoute` aufteilen, die Dreifachbedeutung
  von `onDestroy` auflösen oder beschreiben, `IShadowObjectEnvProxy` um `isDestroyed` und eine
  `error`-Fläche ergänzen. Von Paket 11 an Paket 12 weitergereicht, dort in Zug 0 abgelehnt: drei
  API-Entwürfe mit eigenen Kosten, keiner ein Finding dieses Audits, keiner eine Folge dieses Laufs.
  Der Punkt bleibt als offener Mittelfrist-Posten im `Backlog.md` stehen — ein dauerhafter Tracker
  hält ihn bereits, und ihn hier ein zweites Mal aufzuschreiben gäbe demselben Posten zwei Wohnungen.
  Steht trotzdem hier, damit die Weitergabe nicht als Erledigung durchgeht.
