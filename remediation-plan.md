# Remediation-Plan — shadow-objects

Quelle: ./audit.html vom 2026-08-23 · Branch: main · erstellt: 2026-08-23
Baseline (2026-08-23, auf `31baaf0` selbst gefahren): `pnpm lint` ✓ (1 info:
Biome-Config-Migrationshinweis, vorbestehend) · `pnpm typecheck` ✓ ·
`pnpm build` ✓ · `pnpm test:ci --force` ✓ 1271 Fälle (775 shadow-objects, 119
shae-offscreen-canvas, 377 shadow-objects-testing) ·
`pnpm -F shadow-objects-e2e test` ✓ 430 Fälle (Chromium und Firefox)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/e0d75273-2509-45a0-a823-486e10016d15/scratchpad
(Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 11 von 78 Findings (0 critical, 0 high, 11 medium) · ausgenommen: 31 low,
36 info · `acknowledged` ist leer
Scope-Regel: alles ab medium aufwärts, jede Kategorie — gilt auch für Befunde,
die erst im Lauf auffallen
Stand (2026-08-24): **Lauf abgeschlossen.** Zwölf Pakete, elf Commits auf `main`:
1 (`dbadb91`), 3a (`16b1609`), 3b (`bb3d412`), 4 (`8424d2c`), 5 (`b78103f`), 6 (`4622161`),
7 (`780b75b`), 8 (`b32999b`), 9 (`d41d610`), 10 (`2b121ac`), 11 (`4e677d7`), dazu der
Abschluss-Commit. Paket 2 ist ohne Commit entfallen, weil sein Finding gegenstandslos wurde.
Nichts blockiert, nichts gestasht, keine offene Folge. Alle elf Findings des Scopes sind
geschlossen: API-002, BUILD-005, BUILD-006, BUG-026, CONS-010, CONS-011, DEP-002, MEM-009,
MEM-010, SEC-003 und TEST-009.

Verify auf `HEAD`, vom Orchestrator selbst gefahren: `pnpm lint` ✓ · `pnpm lint:ci` ✓ ·
`pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test:ci --force` ✓ 1295 Fälle (793
shadow-objects, 123 shae-offscreen-canvas, 379 shadow-objects-testing) ·
`pnpm -F shadow-objects-e2e test` ✓ 430 Fälle in Chromium und Firefox. Gegen die Baseline:
24 Unit-Fälle mehr, keiner verschwunden, E2E unverändert.

Semver: keine Versionsanhebung. Beide Pakete führen ihre Änderungen unter `## [Unreleased]`
und ziehen die Nummer erst beim Release. Der Vorspann des Kern-CHANGELOG bewertet den nächsten
Release als minor (`0.33.0` → `0.34.0`), der des Canvas-Pakets ebenso (`0.6.0` → `0.7.0`) —
unter `1.0.0` hebt ein Breaking Change die Minor-Stelle, und beide Pakete tragen welche aus
diesem Lauf.

`./audit.html` ist nachgeführt: Score 62,5 → 79,5, Code-Bereich 77 → 89, Projekt-Harness
85,5 → 90,5. Elf Findings geschlossen, dreizehn neu eingetragen, 67 übernommen; das Backlog
trägt weder critical noch high noch medium. Die Datei ist nicht neu geprüft worden, sondern
neu gerechnet — das steht so in ihrer Methodik-Sektion. Kein Finding blieb mangels Beleg
offen: jedes der elf trägt Reviewer-Urteil mit Fundstelle und Paket-Hash.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

Der Vorlauf desselben Skills (Scope: ab high) ist mit `31baaf0` abgeschlossen;
sein Plan steht in der Historie dieser Datei. Seine Nebenbefunde sind vollständig
ins Audit überführt und tauchen hier als reguläre Findings wieder auf.

## Entscheidungen

- **`three` wird ein Peer, aber kein optionaler** (2026-08-23). Die Abhängigkeit
  wandert in `peerDependencies` mit weitem Bereich und zusätzlich in
  `devDependencies`, damit Build und Tests sie weiter auflösen. Der statische
  Import in `src/shadow-objects.js` bleibt stehen: `three` bleibt damit für jeden
  Consumer Pflicht. Gelöst ist die doppelte Instanz im Abhängigkeitsbaum, nicht
  das Mitinstallieren. Der Gegenweg — optionaler Peer samt dynamischem Nachladen
  der beiden Three-Shadow-Objects — hätte die Registry an einer Stelle asynchron
  gemacht und steht in keinem Verhältnis zum Gewinn.
- **Der Coverage-Report des Kernpakets schließt `src/elements/**` aus**
  (2026-08-23) und benennt im Report-Kopf, wo diese Dateien stattdessen geprüft
  werden. Der Gegenweg — beide Roh-Reports mit einem Merge-Schritt vereinen —
  liefert eine Zahl über alles und einen zusätzlichen Schritt in der
  Test-Pipeline, den ab dann jemand pflegen muss.
- **Der Coverage-Zuschnitt bleibt, wie er ist** (2026-08-24). Die Entscheidung
  vom Vortag, `src/elements/**` aus dem Report des Kernpakets zu nehmen, ist
  gegenstandslos: auf `dbadb91` gemessen stehen dort 70,36 % Statements und
  47,53 % Branches, keine der vier Element-Dateien auf null. Zwei Specs des
  Vorlaufs liegen in `src/elements/` und laufen in der happy-dom-Suite mit. Ein
  Ausschluss würde heute 874 real gemessene Statements aus dem Report löschen
  und die Kopfzahl künstlich anheben — dieselbe Unwahrheit mit umgekehrtem
  Vorzeichen. Der Report beschreibt den Zuschnitt in `AGENTS.md` und `CLAUDE.md`
  korrekt; nichts nachzuziehen.
- **Die Vertrauensgrenze der Worker-Modul-URL wird dokumentiert, nicht
  bewacht** (2026-08-23). Ein Sicherheitsabschnitt in `docs/api-reference.md`
  und beiden READMEs. Keine Prüffunktion an `RemoteWorkerEnv` — das wäre neue
  öffentliche API, die dokumentiert, getestet und getragen werden müsste, für
  eine Absicherung, die im Betrieb ohnehin die Content Security Policy leistet.

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

Projektspezifisch, aus `AGENTS.md` und `CLAUDE.md`:

- Code, Kommentare und Doku in **Englisch**. Antworten und dieser Plan bleiben
  deutsch, `git log` dieses Projekts ist englisch — Commit-Messages also
  englisch.
- **Doku ist Teil des API-Vertrags.** Eine Änderung an der öffentlichen API von
  `@spearwolf/shadow-objects` führt `packages/shadow-objects/docs/`,
  `README.md` und `CHANGELOG.md` im selben Zug nach; für
  `@spearwolf/shae-offscreen-canvas` gilt dasselbe in dessen eigenem Paket.
  Änderungen am Harness — Build, Testrunner, Lint, turbo/pnpm, devDeps — gehören
  in das `CHANGELOG.md` der Repo-Wurzel. Neue Arbeit steht unter
  `## [Unreleased]`.
- **Verbotene Analogien**: »shadow theater«, »puppet«, »puppeteer«, »light
  world«, »screen«. ECS-Begriffe verwenden. Die Bindungstabelle aus `AGENTS.md`
  §4 gilt: `RemoteWorkerEnv`, Entity, Entity Tree, `ComponentContext` bzw.
  Namespace, Token. `ComponentContext` (View-seitige Registry eines Namespace)
  und Entity Context (Dependency Injection entlang des Entity Tree) werden nie
  vermischt.
- Dependency-Versionen stehen ausschließlich im `catalog:`-Block von
  `pnpm-workspace.yaml` und werden aus den Paketen als `"<dep>": "catalog:"`
  referenziert.
- Lint und Format sind Biome, Konfiguration liegt an der Repo-Wurzel. Keine
  Overrides je Paket.
- Wird ein TODO-Kommentar angefasst, läuft `pnpm make:todo`.
- Nach Änderungen an Quelltext oder Doku wird `AGENTS.md` auf Veralterung
  geprüft.

## Modellstufe der Runner

Der Skill sieht für jeden Paket-Runner die stärkste Modellstufe vor, weil er über
Paketschnitt, Reihenfolge und die Einordnung von Folgen entscheidet. Ab Paket 3a
laufen die Runner dieses Laufs auf mittlerer Stufe: sechs Anläufe auf der
stärksten sind an Serverfehlern (529) gestorben, ohne etwas tun zu können, und
die Kapazität kam über eine abgewartete Überlastwelle hinweg nicht zurück.

Die Abweichung trägt der Orchestrator, und sie kommt mit einer Auflage, die jeder
Dispatch ab hier wörtlich enthält: Was Paketschnitt, Zielsetzung eines Pakets
oder eine Architekturentscheidung berührt, entscheidet der Runner nicht selbst —
Teilung, Abweichung von der Empfehlung eines Findings, ein Nebenbefund über den
Paketumfang hinaus, jede Umplanung des Restplans. Diese Fälle kommen mit Status
`rückfrage` zurück und werden zwischen Orchestrator und Nutzer entschieden. Damit
landen genau die Urteile, für die die stärkste Stufe gedacht ist, außerhalb der
abgesenkten Stufe.

## Vorbestehende Fehler

Keine. Die Baseline ist auf ganzer Breite grün; der eine Biome-Hinweis ist ein
Konfigurations-Migrationsvermerk ohne Bezug zu diesem Lauf. Kein Spec des
Repositories schreibt kaputtes Verhalten als erwarteten Fehlschlag fest.

Zu beachten für Paket 1: sobald `lint:ci` bei Warnungen abbricht, ist der eine
Biome-Info-Hinweis zu prüfen — Info ist keine Warnung, der Lauf bleibt grün.
Wer das anders vorfindet, hat einen Nebenbefund.

## Offene Befunde

Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

- [x] `biome.json:20` — `files.includes` schließt `packages/shadow-objects/tests`
  aus, ein Verzeichnis, das es im Arbeitsbaum nicht gibt und das auch in der
  Historie dieses Repositories nie gab; dieselbe Attrappe steht in
  `turbo.json#tasks.test.inputs` als `tests/**`. Aufgefallen in Paket 3a.
  Geschätzte Severity: low → Audit
- [x] `packages/shadow-objects/src/elements/ShaeWorkerElement.ts:294-314` —
  `#refuseLocalChange()` schreibt bei `isLocalEnv === false` über den
  `removeAttribute`-Zweig zurück, aber keine Suite prüft diesen Zweig gegen eine
  echte `RemoteWorkerEnv`: die drei Fälle in `worker-element-attributes.test.js`
  laufen alle gegen eine lokale Umgebung, und schon der abgelöste Fall vor diesem
  Lauf (`git show 31baaf0:packages/shadow-objects-testing/test/worker-element-attributes.test.js`,
  Zeile 336–347) prüfte nur diese eine Richtung. Ein Fall gehört nach
  `shadow-objects-e2e`, wo ein echter Worker läuft. Aufgefallen in Paket 4.
  Geschätzte Severity: low → Audit
- [x] `packages/shadow-objects/src/view/ShadowEnv.ts:19` — ein
  `// eslint-disable-next-line no-var` in einem Repository, das ausschließlich
  mit Biome lintet; eine ESLint-Konfiguration gibt es nirgends. Dieselbe tote
  Direktive steht in `packages/shadow-objects/src/bundle.ts:6`,
  `packages/shadow-objects/src/view/ComponentContext.ts:18` und als
  `prefer-const` in `packages/shadow-objects/src/utils/waitForMessageOfType.ts:24`.
  An allen vier Stellen vorbestehend (nachgesehen auf `31baaf0`). Aufgefallen in
  Paket 5. Geschätzte Severity: info → Audit
- [x] `packages/shadow-objects/src/worker/MessageRouter.ts:119` gegen
  `packages/shadow-objects/src/view/RemoteWorkerEnv.ts:380` — der Grund eines
  fehlgeschlagenen `importScript()` reist als nackte Zeichenkette über die
  Worker-Grenze und wird auf der View-Seite unverändert geworfen; ein Aufrufer
  bekommt dort eine Zeichenkette, wo die lokale Umgebung seit Paket 7 einen
  `Error` liefert. Dieselbe Asymmetrie, die CONS-008 für den Change Trail
  beschreibt, an der zweiten Strecke. Vorbestehend (nachgesehen auf `31baaf0`),
  im Audit nicht enthalten. Aufgefallen in Paket 7. Geschätzte Severity:
  low → Audit
- [x] `packages/shadow-objects/src/worker/MessageRouter.ts:157` —
  `#onDestroy(data: any)` nimmt einen untypisierten Payload, während die beiden
  Nachbarn `#configure(data: ConfigurePayloadData)` und `#onChangeTrail(data:
  SyncEvent)` typisiert sind. Vorbestehend (nachgesehen auf `31baaf0`).
  Aufgefallen in Paket 7. Geschätzte Severity: info → Audit
- [x] `AGENTS.md:120-127` — der Abschnitt »General Context Information for the AI
  assistant« weist jedem Agenten, der die Datei liest, eine fremde Rolle zu
  (»You are a professional developer advocate from Google«) samt Tonvorgaben,
  die mit dem Projekt nichts zu tun haben und den übrigen Vorgaben derselben
  Datei widersprechen. `AGENTS.md` ist laut `CLAUDE.md` der maßgebliche
  Agentenleitfaden, die Stelle wirkt also auf jede Sitzung. Vorbestehend
  (nachgesehen auf `31baaf0:AGENTS.md:121`), im Audit nicht enthalten.
  Aufgefallen in Paket 9. Geschätzte Severity: low → Audit
- [x] `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md` — die Datei
  ist die einzige API-Referenz des Pakets und beschreibt vier der fünf
  ausgelieferten Shadow Objects; `ThreeRenderView` fehlt vollständig, obwohl
  `src/shadow-objects.js` es exportiert und in seiner `routes`-Tabelle führt.
  Vorbestehend (auf `31baaf0` kommt der Name in der Datei kein einziges Mal
  vor), im Audit nicht enthalten. Aufgefallen in Paket 9. Geschätzte Severity:
  low → Audit
- [x] `packages/shadow-objects/docs/api-reference.md:2992` und `:2994` — zwei
  Sätze, die mehr versprechen, als der Code hält. »`ConsoleLogger.<namespace>.enable`
  turns a single logger off on its own« gilt für `Kernel`, `ShadowEnv` und die
  Elemente nur für deren gegatete Zeilen: `logger.error()` druckt bedingungslos
  (`src/utils/ConsoleLogger.ts:298-304`). Und »the key is named once through
  `remoteEnv.logger.warn`, which is not gated behind
  `ConsoleLogger.sharedConfig.enable`« ist wahr, begründet die Sache aber enger,
  als sie ist — `logger.warn()` hängt an gar keinem Schalter, auch nicht am
  Namensraum-Schalter. Vorbestehend (beide Sätze standen so auf `31baaf0`), im
  Audit nicht enthalten. Aufgefallen in Paket 10. Geschätzte Severity:
  info → Audit
- [x] `packages/shadow-objects/src/in-the-dark/importModule.ts:19`,
  `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:31` und
  `:372` — drei `console.warn` im geteilten Kernel-Zweig, den beide Umgebungen
  durchlaufen: die übersprungene Doppel-Einfuhr eines Moduls, die
  Deprecation-Warnung zur `isEqual`-Option und der abgelehnte zweite
  `{compare}` an einem gecachten Signal. Alle drei sind nicht abschaltbar,
  obwohl `ShadowObjectCreationScope` selbst einen `ConsoleLogger` hält
  (`:57`). Dagegen spricht ein Argument, das mitentschieden werden muss:
  `ConsoleLogger.sharedConfig.enable` ist außerhalb von `localhost`
  ausgeschaltet, und eine Deprecation-Warnung, die genau dort schweigt, wo ein
  Consumer sie sehen müsste, ist keine Warnung mehr — der Weg wäre dann
  `logger.error`, das die Bibliothek für ihre Fehlerberichte ebenfalls ungegatet
  lässt. Vorbestehend an allen drei Stellen (nachgesehen auf `31baaf0`), im
  Audit nicht enthalten. Aufgefallen in Paket 10. Geschätzte Severity:
  low → Audit
- [x] `packages/shadow-objects/src/utils/ConsoleLogger.ts:135` —
  `setConsoleLoggerStorage(config)` setzt nur den Slot
  `globalThis.ConsoleLoggerStorage`. `ConsoleLogger.loadConfig()` läuft aber genau
  einmal je Thread, beim Bau der ersten Instanz, und friert `sharedConfig` dabei
  auf ein eigenes Objekt ein (Zeile 241–252); ein Aufruf danach erreicht keinen
  Logger mehr. Damit no-opt der dokumentierte Weg, einen Worker über
  `ConsoleLogger.RemoteWorkerEnv.workerConfig` gesprächig zu machen, sobald im
  Worker vor der Konfigurationsnachricht irgendein Logger entstanden ist. Latent:
  Paket 10 hält die Reihenfolge ein und pinnt sie mit einem Spec, und im
  Hauptthread wird der Fallback-Store bei vorhandenem `localStorage` gar nicht
  gelesen. Vorbestehend (nachgesehen auf `31baaf0:packages/shadow-objects/src/utils/ConsoleLogger.ts`),
  im Audit nicht enthalten. Aufgefallen in Paket 10. Geschätzte Severity:
  low → Audit
- [x] `README.md:95` — der Abschnitt »What's in the Box?« nennt das
  Canvas-Paket `packages/shadow-offscreen-canvas/`; das Verzeichnis heißt
  `packages/shae-offscreen-canvas/`, wie dieselbe Datei in `:265` und die
  `package.json` des Pakets richtig schreiben. Vorbestehend (nachgesehen auf
  `31baaf0:README.md`, dort dieselbe Zeile). Aufgefallen in Paket 11.
  Geschätzte Severity: low → Audit
- [x] `README.md:289` — »**Prerequisites:** Node.js >=20.12.2, pnpm >=9.1.2«
  gegen `package.json`, das `engines.node: ">=24.13.0"`, `engines.pnpm:
  ">=11.0.0"` und `packageManager: "pnpm@11.21.0"` führt. Wer der README folgt,
  installiert eine Toolchain, die der Workspace ablehnt. Vorbestehend
  (`31baaf0:README.md:277` trägt denselben Satz). Aufgefallen in Paket 11.
  Geschätzte Severity: low → Audit
- [x] `packages/shadow-objects/src/view/ShadowEnv.ts:56` — `readonly ns$` ist
  öffentliche API, die die Klasse nie beschreibt: kein Produktionscode im
  Repository greift darauf zu, und der Slot liest für die gesamte Lebensdauer
  einer Umgebung `undefined`. `docs/api-reference.md:1155` schreibt das ehrlich
  hin und verweist auf `env.view.ns`, der Code bleibt schuldig; verdrahten oder
  entfernen ist eine API-Entscheidung. Vorbestehend (`31baaf0:…/ShadowEnv.ts:49`),
  im Audit nicht enthalten, in `Backlog.md:277` bereits beschrieben. Aufgefallen
  in Paket 5. Geschätzte Severity: low → Audit

Alle dreizehn Einträge sind am 2026-08-24 in `./audit.html` überführt worden — je als
neues Finding mit Fundstelle, Severity und dem Vermerk, dass sie in diesem Lauf auffielen.
Keiner fiel unter die Scope-Regel: der schwerste wiegt low, die Regel greift ab medium. Dem
Nutzer wurden sie am 2026-08-24 gebündelt vorgelegt, ohne Widerspruch. Die vergebenen IDs
stehen im Report, nicht hier — sie gehören ihm.

## Pakete

Die Phase »Tests für die Umbaubereiche« trägt kein eigenes Paket. Jede Datei,
die dieser Lauf anfasst, hat ihre Suite bereits: `ShadowEnv`,
`LocalShadowObjectEnv`, `Kernel`, `MessageRouter`, `WorkerRuntime` und
`ShaeOffscreenCanvasElement` je ein Spec neben der Quelle, `ShaeWorkerElement`
über `worker-element-attributes.test.js` und `worker-element-teardown.test.js`
in der Browser-Suite — für Custom-Element-Reaktionen der einzig richtige Ort,
weil happy-dom die Reaktions-Queue des Browsers nicht originalgetreu fährt. Den
fehlschlagenden Fall schreibt deshalb jedes Korrektheits-Paket selbst, als
ersten Zug und rot gesehen, statt ihn in ein vorgezogenes Paket auszulagern, das
dieselbe Datei ein zweites Mal anfassen müsste.


### [x] 1. Der Lint-Lauf der CI bricht bei Warnungen ab

- Findings: BUILD-005 (medium)
- Ziel: Eine tote Variable, ein vergessener Import oder ein `parseInt` ohne
  Basis kommen nicht mehr grün an der CI vorbei.
- Bereich: `package.json` (`lint:ci`), `biome.json`, `.github/workflows/ci.yml`
- Hängt ab von: —
- Hash: dbadb91
- Ergebnis: 1 Runde · BUILD-005 behoben · `lint:ci` trägt `--error-on-warnings`,
  `biome.json` und `.github/workflows/ci.yml` blieben unangetastet · Nachweis
  der Sperre statt eines eingecheckten Falls: eine Sondendatei mit genau einer
  Warnung ergab vor der Änderung Rückgabewert 0, danach 1; sie liegt nicht im
  Repo, weil ein dauerhaft lint-schmutziges Fixture den Lauf selbst rot färben
  würde. Vom Runner nachgestellt (`paket-1.verify.log`). Reviewer ohne Befund ·
  bewusst hingenommen: der CHANGELOG-Absatz nennt den Vorzustand, wie es die
  Nachbareinträge derselben Datei tun — für Einträge in `CHANGELOG.md` gilt die
  Konvention »kein Rückblick« damit als erfüllt, wenn der Satz auch ohne den
  Vorzustand trägt
- Nebenbefunde: keine
- Folgen: keine
- Verify nachgeholt (Orchestrator, 2026-08-23): Die Verify-Zeile der
  Runner-Rückgabe zeigte auf `paket-1.verify.log`, und diese Datei trägt die
  Nachstellung der Sperre — einen Lint-Lauf über eine Sondendatei, der
  bestimmungsgemäß mit Rückgabewert 1 endet —, nicht den Verify-Lauf des
  Pakets. Ein Log über Lint, Typecheck, Build und Tests lag damit nicht vor.
  Auf Ansage des Nutzers vom Orchestrator selbst auf `dbadb91` nachgefahren:
  `pnpm lint` ✓ · `pnpm lint:ci` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ ·
  `pnpm test:ci --force` ✓ 1271 Fälle · `pnpm -F shadow-objects-e2e test` ✓
  430 Fälle. Gegen die Baseline kein Fall verschwunden, keiner neu. Log:
  `paket-1.orchestrator-verify.log`. Der Commit steht damit auf geprüftem Grund;
  die neue Sperre färbt den heutigen Baum nicht rot.
- Schnittstellen: `pnpm lint:ci` endet mit Rückgabewert 1, sobald Biome eine
  Warnung meldet — die fünf Regeln auf `warn` in `biome.json`
  (`noUnusedVariables`, `noUnusedImports`, `noUnusedPrivateClassMembers`,
  `noVoidTypeReturn`, `useParseIntRadix`) sind ab hier für jedes Paket
  bindend. Info-Diagnosen färben den Lauf weiterhin nicht rot.

### [x] 2. Der Coverage-Report misst, was er ausweist — entfallen

- Findings: TEST-009 (medium)
- Ziel: Die Prozentzahl des Kernpakets beschreibt genau die Dateien, die sie
  misst, und der Report sagt, wo die vier Element-Dateien geprüft werden.
- Bereich: `packages/shadow-objects/vitest.config.*`, Report-Kopf, `CLAUDE.md`
  und `AGENTS.md` (beide begründen den heutigen Zuschnitt)
- Hängt ab von: —
- Hash: —
- Verlauf:
  - 2026-08-23 Zug 0: Abgleich rot · TEST-009 gegenstandslos wie beschrieben ·
    selbst gemessen auf `dbadb91` (`pnpm -F @spearwolf/shadow-objects test`, 775
    Fälle grün, Log `paket-2.probe-coverage.log`): `src/elements` 70,36 %
    Statements / 47,53 % Branches statt der 5,73 % / 0,55 % aus dem Finding,
    Gesamt 86,43 % statt 69,88 %, und keine der vier Element-Dateien steht auf
    null (`ShaeElement.ts` 95,45 · `ShaePropElement.ts` 86,44 ·
    `ShaeEntElement.ts` 57,75 · `ShaeWorkerElement.ts` 54,42) · Ursache:
    `elementReachability.spec.ts` (`ccf7ad8`) und `propValueConverters.spec.ts`
    (`282603b`) liegen in `src/elements/` und laufen in der happy-dom-Suite des
    Kernpakets mit · kein Detailplan geschrieben: der freigegebene Weg (Ausschluss
    von `src/elements/**`) löscht heute 874 real gemessene Statements aus dem
    Report und hebt die Kopfzahl künstlich an, er wäre eine Verschlechterung ·
    `AGENTS.md:96` und der Coverage-Absatz in `CLAUDE.md` beschreiben den
    Ist-Zustand weiterhin korrekt, also auch dort nichts nachzuziehen · zurück an
    den Nutzer, weil das Streichen die Entscheidung vom 2026-08-23 gegenstandslos
    macht
- Ergebnis: **entfallen** (Nutzer-Ansage 2026-08-24, siehe »Entscheidungen«).
  Kein Commit, keine Änderung im Arbeitsbaum. Was vom Finding bleibt — die 377
  Fälle der Browser-Suite zahlen auf keine Zahl ein — ist der Merge-Schritt, den
  die Entscheidung vom 2026-08-23 verworfen hat; er kommt in diesem Lauf nicht
  wieder auf.
- Nebenbefunde: keine
- Folgen: keine

### [x] 3a. Die dist-Form des Kernpakets wird gegen eine Erwartung gehalten

- Findings: BUILD-006 (medium), Teil »Kernpaket«
- Ziel: Ein Fall im vorhandenen `test`-Task hält die sortierte Dateiliste unter
  `dist` und die Auflösungsschlüssel von `dist/package.json` gegen eine
  eingecheckte Erwartung; eine Änderung daran wird eine Entscheidung, die jemand
  treffen muss.
- Bereich: `packages/shadow-objects/src/` (neuer Fall plus zwei
  Erwartungsdateien), `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md` der Wurzel,
  `Backlog.md`
- Hängt ab von: —
- Hash: 16b1609
- Ergebnis: 2 Runden · BUILD-006 (Teil »Kernpaket«) behoben — neuer Fall in
  `src/distContract.spec.ts` mit den Erwartungsdateien `distContract.files.txt`
  und `distContract.package.json`, greift nachweislich (`paket-3a.red1.log`,
  `paket-3a.red2.log` vor dem Fix rot) · Runde 1 behob die zwei `wichtig`:
  `types: ["node"]` aus `packages/shadow-objects/tsconfig.json` wieder heraus,
  stattdessen `/// <reference types="node" />` als erste Zeile im Spec nach der
  `@vitest-environment`-Direktive, mit Kommentar, der die programmweite Wirkung
  korrekt benennt statt Dateiisolation zu behaupten; Kommentar vor der
  `dependencyNames`-Prüfung (Zeilen 93–95) ergänzt, warum Versionsbereiche und
  `pkg.version` nicht Teil der Erwartung sind · vom Runner am Diff bestätigt,
  keine weitere Review-Runde nötig · Abweichung von der Empfehlung: die
  Erwartung an `dist/package.json` hält Schlüssel und Auflösungspfade, aber
  nicht `version` und nicht die Versionsbereiche der Abhängigkeiten · eigener
  Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`,
  exit 0, 778 Fälle Kernpaket, 119 Canvas-Paket, 377 Browser-Suite, `dist`
  weiterhin 218 Dateien (Log `paket-3a.orchestrator-verify.log`)
- Nebenbefunde: → Queue (toter Biome-Ausschluss auf
  `packages/shadow-objects/tests`, bereits unter »Offene Befunde« eingetragen)
- Folgen: keine

### [x] 3b. Die .npm-pkg-Form des Canvas-Pakets wird gegen eine Erwartung gehalten

- Findings: BUILD-006 (medium), Teil »Canvas-Paket«
- Ziel: Dieselbe Prüfung wie in 3a für `@spearwolf/shae-offscreen-canvas`: die
  sortierte Dateiliste unter `.npm-pkg` und die Auflösungsschlüssel von
  `.npm-pkg/package.json` stehen gegen eine eingecheckte Erwartung, geprüft im
  vorhandenen `test`-Task des Pakets.
- Bereich: `packages/shae-offscreen-canvas/build.mjs` (Kopierlauf),
  `packages/shae-offscreen-canvas/src/`, `CLAUDE.md`, `AGENTS.md`,
  `CHANGELOG.md` der Wurzel, `Backlog.md`
- Hängt ab von: 3a — Machart, Dateinamen und Format der Erwartungsdateien werden
  von dort übernommen, statt eine zweite Bauart zu erfinden
- Hash: —
- Modell: mittlere Stufe
- Dateien: `packages/shae-offscreen-canvas/build.mjs`,
  `packages/shae-offscreen-canvas/src/distContract.spec.js` (neu),
  `packages/shae-offscreen-canvas/src/distContract.files.txt` (neu),
  `packages/shae-offscreen-canvas/src/distContract.package.json` (neu),
  `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`, `Backlog.md`
- Vorgehen:
  1. Selbst nachgesehen (Zug 0, auf sauberem Baum nach `16b1609`): ein
     Build (`pnpm -F @spearwolf/shae-offscreen-canvas build`) erzeugt unter
     `.npm-pkg` 19 Dateien (`find .npm-pkg -type f`) und ein `package.json` mit
     den Top-Level-Schlüsseln `author, dependencies, description, exports,
     homepage, license, main, module, name, publishConfig, repository,
     sideEffects, type, version` — kein `types`-Schlüssel (das Paket liefert
     keine Deklarationen), kein `scripts`, kein `devDependencies` (beide über
     `package.override.json` auf `null` gesetzt). `main`/`module` zeigen beide
     auf `src/bundle.js`. `exports` hat drei Einträge (`.`, `./shae-offscreen-
     canvas.js`, `./shadow-objects.js`), je mit einem einzelnen `default`-Pfad.
     `sideEffects` zählt `src/bundle.js` und `src/shae-offscreen-canvas.js`.
     `dependencies` sortiert: `@spearwolf/eventize`, `@spearwolf/shadow-objects`,
     `@spearwolf/signalize`, `three`.
  2. Anders als beim Kernpaket entsteht `.npm-pkg` durch einen rekursiven
     Kopierlauf (`cp` mit `recursive: true`) über den ganzen `src/`-Baum, nicht
     durch ein Glob auf `.ts`/`.js`. Der vorhandene `filter` in `build.mjs`
     schließt nur `*.spec.{js,ts}` und `*.test.{js,ts}` aus. Die zwei neuen
     Erwartungsdateien (`distContract.files.txt`, `distContract.package.json`)
     liegen absichtlich neben dem Spec unter `src/` — dieselbe Bauart wie 3a —,
     würden vom bestehenden Filter aber mitkopiert und damit Teil des
     veröffentlichten Pakets, das die eigene Prüfung dann gegen sich selbst
     führt. Der `filter` in `packages/shae-offscreen-canvas/build.mjs` bekommt
     deshalb eine zweite Bedingung, die die beiden Dateien exakt beim
     Basisnamen ausschließt (`distContract.files.txt`,
     `distContract.package.json`), mit einem kurzen Kommentar, warum: sie sind
     reine Testfixtures für die Form von `.npm-pkg` und dürfen nicht selbst
     darin landen.
  3. `packages/shae-offscreen-canvas/src/distContract.spec.js` neu anlegen,
     als Übertragung von `packages/shadow-objects/src/distContract.spec.ts`
     (siehe dort für die genaue Logik der drei Fälle) mit diesen Abweichungen:
     - Kein `/// <reference types="node" />` und kein `@types/node` als neue
       Abhängigkeit — dieses Paket hat kein `tsconfig.json`, keinen
       `typecheck`-Script und ist nicht Teil von `pnpm typecheck`.
     - Die Kopfzeile `// @vitest-environment node` bleibt (die Datei braucht
       kein DOM, wie das Schwester-Spec).
     - `distDir` löst auf `../.npm-pkg` auf, nicht `../dist`.
     - `beforeAll` wirft, wenn `.npm-pkg` oder `.npm-pkg/package.json` fehlt,
       mit der Meldung `.npm-pkg is missing or incomplete at ${distDir} — run
       "pnpm -F @spearwolf/shae-offscreen-canvas build" first.`
     - Fall 1: sortierte Dateiliste unter `.npm-pkg` gegen
       `distContract.files.txt`.
     - Fall 2: `{topLevelKeys, entryPoints: {main, module, types}, exports,
       sideEffects, dependencyNames}` gegen `distContract.package.json` —
       `version` und Versionsbereiche der Abhängigkeiten bleiben wie beim
       Kernpaket außen vor, mit demselben Kommentar (bewegen sich bei jedem
       Release).
     - Fall 3: jeder über `main`/`module`/`types`/`exports` erreichbare Pfad
       existiert unter `.npm-pkg`.
     - Der Kopfkommentar nennt statt `tsc`/TypeScript den Kopierlauf als
       Ursache möglichen Driftens, und statt eines Hinweises auf
       `tsconfig.lib.json` (den gibt es hier nicht) nur den Verweis auf
       `turbo.json#tasks.test.dependsOn`, das auch für dieses Paket vor `test`
       baut.
  4. `pnpm -F @spearwolf/shae-offscreen-canvas build` laufen lassen, danach die
     zwei Erwartungsdateien **aus dem tatsächlichen Output erzeugen** (Skript
     oder `find`/`node -e`, nicht von Hand abtippen) — die Werte aus Schritt 1
     sind die Kontrolle, nicht die Vorlage zum Abschreiben. Anschließend das
     neue Spec laufen lassen und grün sehen. Kein Regressionstest im Sinn
     »vorher rot« — dieser Fund ist eine fehlende Prüfung, kein Bug, das
     Kriterium ist: Spec schlägt fehl, wenn `.npm-pkg` von der Erwartung
     abweicht (z. B. testweise eine Zeile aus `distContract.files.txt`
     entfernen und den roten Lauf im Report festhalten, danach zurücksetzen).
  5. `CLAUDE.md`, Zeile zu `packages/shae-offscreen-canvas` im Abschnitt
     »Per-package commands«: Satz ergänzen, parallel zum Kernpaket-Eintrag —
     `src/distContract.spec.js` braucht ein gebautes `.npm-pkg`; `turbo`
     liefert es über `tasks.test.dependsOn`, ein direkt gestartetes `pnpm
     watch` braucht vorher einen manuellen Build. Der Abschnitt »Build
     pipeline notes« bleibt unangetastet — er ist explizit auf
     `packages/shadow-objects/build.mjs` und dessen vier nummerierte Stufen
     gemünzt, die dieses Paket nicht hat.
  6. `AGENTS.md`, die Zeile, die aktuell nur `packages/shadow-objects`'s
     `test`-Task nennt (»`packages/shadow-objects`'s own `test` task holds its
     built `dist/` output …«): so erweitern, dass sie beide Pakete nennt —
     das Kernpaket gegen `dist/`, das Canvas-Paket gegen `.npm-pkg/` über
     `src/distContract.spec.js`.
  7. Root-`CHANGELOG.md`: neuer datierter Abschnitt (heutiges Commit-Datum),
     analog zum bestehenden Eintrag für das Kernpaket — nennt das neue Spec
     und seine zwei Erwartungsdateien.
  8. `Backlog.md:392` — die Zeile zur `.npm-pkg`-Form (»entsteht aus einem
     Kopierlauf … ohne jede Gegenprobe«) ersatzlos streichen, sie ist behoben.
  9. `packages/shae-offscreen-canvas/build.mjs` ist klein — ganz lesen, bevor
     die Datei verlassen wird, und alles melden, was sonst darin auffällt und
     nicht zu diesem Paket gehört.
- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`
- Commit: `test(build): the canvas package's .npm-pkg layout is held against a recorded expectation`
- Hash: bb3d412
- Ergebnis: 1 Runde · BUILD-006 (Teil Canvas-Paket) behoben — neues Spec
  `packages/shae-offscreen-canvas/src/distContract.spec.js` gegen die zwei
  Erwartungsdateien `distContract.files.txt` und `distContract.package.json`,
  aus dem echten Build-Output erzeugt; Kopierfilter in `build.mjs` hält die
  zwei Fixtures aus `.npm-pkg` heraus. Nachweis der greifenden Prüfung: eine
  Zeile aus `distContract.files.txt` entfernt ergab einen roten Lauf, danach
  wieder grün (vom Runner und unabhängig vom Reviewer je einmal nachgestellt,
  Reviewer zusätzlich mit einer entfernten `sideEffects`-Zeile). Reviewer ohne
  `kritisch`/`wichtig`; zwei `klein`: die erweiterte Filterzeile in
  `build.mjs:24` liegt stilistisch am Rand der Lesbarkeit (keine Änderung
  nötig, Biome sieht darin nichts), und eine bloß bestätigende Prüfung ohne
  eigenen Fund zur Backlog-Streichung — beide ohne Folgewirkung, keine Runde
  ausgelöst. Eigener Verify:
  `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`,
  exit 0, 778 Fälle Kernpaket (unverändert), 122 Fälle Canvas-Paket (119 + 3
  neue), 377 Fälle Browser-Suite (unverändert), `.npm-pkg` weiterhin ohne die
  zwei Fixtures (Log `paket-3b.verify.log`)
- Nebenbefunde: keine
- Folgen: keine

### [x] 4. Ein abgelehnter `local`-Wechsel erreicht den Aufrufer

- Findings: BUG-026 (medium)
- Ziel: Der Wechsel wird über den Rückweg abgelehnt, den das Element ohnehin
  führt — Attribut zurückschreiben, Meldung über den `ConsoleLogger` — statt über
  einen Throw, der nur am `window` landet.
- Bereich: `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`, Doku des
  Attributs
- Hängt ab von: —
- Hash: 8424d2c
- Ergebnis: 2 Runden · BUG-026 behoben — `#refuseLocalChange()` schreibt das
  Attribut über `reflectAttribute` auf die kanonische Schreibweise zurück und
  meldet über `logger.error`, statt zu werfen · Regressionstest: die drei Fälle
  `removing "local" after start() is refused, reported through the console and
  written back`, `setting "local" to "false" after start() is refused the same
  way` und `setting "local" to "yes" after start() moves nothing` in
  `worker-element-attributes.test.js` ersetzen den alten Throw-Fall (vor dem Fix
  rot, `pnpm -F shadow-objects-testing test`) · Runde 1 behob 1 `wichtig`
  (`errors[0].join(' ')` jetzt gegen den festen und den differenzierenden
  Textteil geprüft, Wirksamkeit durch testweise verändertes Substring belegt)
  und 4 `klein` (Kommentar-Herleitung `error` vs. `warn` in
  `ShaeWorkerElement.ts` korrigiert, Vorzustandssatz gestrichen, Vorbehalt zum
  geparkten Rückschreiben in `docs/api-reference.md` ergänzt,
  `docs/best-practices.md:177` umformuliert und in die CHANGELOG-»Named
  in«-Liste aufgenommen) · Runde 2 behob 1 weiteren `wichtig`: zwei JSDoc-Blöcke
  in `ShaeElement.ts` (`reflectAttribute` ~163, `teardown` ~266) behaupteten,
  geparkte Reflektionen kämen nur aus dem ersten `connectedCallback` — durch
  `#refuseLocalChange` nicht mehr zutreffend, beide Blöcke korrigiert · nicht
  vergeben: `klein` zum ungetesteten Worker-Zweig gegen eine echte
  `RemoteWorkerEnv`, siehe »Offene Befunde« · eigener Verify:
  `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`, exit
  0, 778 Fälle Kernpaket, 122 Fälle Canvas-Paket, 379 Fälle Browser-Suite (Log
  `paket-4.verify.log`)
- Nebenbefunde: → Queue (ungetesteter Worker-Zweig von `#refuseLocalChange`
  gegen eine echte `RemoteWorkerEnv`)
- Folgen: keine

### [x] 5. Eine nie verbundene `ShadowEnv` wird eingesammelt

- Findings: MEM-009 (medium)
- Ziel: Der Effekt im Konstruktor hält die Umgebung nicht mehr über die
  modulweite Signal-Queue am Leben; ein `<shae-worker>`, das nie in ein Dokument
  kommt, nimmt seine Umgebung mit.
- Bereich: `packages/shadow-objects/src/view/ShadowEnv.ts`, Fall mit `WeakRef`
- Hängt ab von: —
- Hash: b78103f
- Ergebnis: 3 Runden · MEM-009 behoben — der Effekt hinter `ContextCreated` und
  `ContextLost` entsteht in `#ensureContextEffect()` beim ersten `view` oder
  `envProxy`, das etwas trägt, und wird in `destroy()` wieder freigegeben; der
  Bauschritt läuft in `hibernate()`, damit er nicht Kind eines fremden Effekts
  wird (`<shae-worker>` weist `view` aus einem `ns$.onChange()`-Callback zu) ·
  Regressionstest: 7 neue Fälle, davon vor dem Fix rot `builds no effect before
  it is used`, `collects a ShadowEnv that never received a view or a proxy`
  (beide `ShadowEnv.spec.ts`) und `collects the shadow environment of a
  <shae-worker> that is created and never connected`
  (`elements/elementReachability.spec.ts`); der rote Lauf wurde vom Reviewer
  unabhängig nachgestellt · Runde 1 behob 2 `wichtig` (die Begründung am
  `#contextEffect?.destroy()` berief sich auf ein Verhalten von
  `destroyObjectSignals()`, das signalize 1.0.0-beta.0 nicht zeigt; die
  beobachtbare `batch()`-Folge des `hibernate()` fehlte in `docs/api-reference.md`
  und `CHANGELOG.md`) und 1 `klein` (falscher Halbsatz im
  `hibernate`-Kommentar) · Runde 2 behob 2 `klein`, beide an Sätzen dieses
  Pakets: die Begründung in `destroy()` galt nur ungebatcht, und »Every later
  assignment« war in Doku und CHANGELOG als Absolutum falsch — eine leere
  Zuweisung baut nichts, der Flush hängt an der ersten tragenden · nicht in die
  Queue gegeben, weil ein Nebenbefund ist, was auch ohne dieses Paket falsch
  gewesen wäre · Wirksamkeit zweifach mutationsgeprüft: ohne `hibernate()` wird
  genau der Batch-Fall rot, ohne den `if (ctx)`-Guard genau der Flush-Fall ·
  eigener Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci
  --force`, exit 0, 785 Fälle Kernpaket (778 + 7), 122 Canvas-Paket, 379
  Browser-Suite (Log `paket-5.verify.log`); zusätzlich
  `pnpm -F shadow-objects-e2e test` exit 0, 430 Fälle unverändert (Log
  `paket-5.e2e.log`)
- Nebenbefunde: → Queue (toter ESLint-Direktiven-Kommentar an vier Stellen ·
  `ShadowEnv.ns$` als nie beschriebener öffentlicher Signal-Slot)
- Folgen: keine
- Schnittstellen: `ShadowEnv` baut den Effekt hinter `ContextCreated` und
  `ContextLost` erst bei der ersten Zuweisung an `view` oder `envProxy`, die
  etwas trägt — `null`/`undefined` baut nichts, `destroy()` gibt ihn frei. Zwei
  Folgen für Aufrufer: diese eine Zuweisung schiebt einen offenen `batch()` des
  Aufrufers durch (die Schreibvorgänge des Setters bleiben im Batch), und ein
  Schreiben auf `viewReady`/`proxyReady` von Hand treibt die Ereignisse nur auf
  einer Umgebung, die eine ihrer beiden Hälften bekommen hat.

### [x] 6. Der Effekt des Canvas-Elements gehört ihm selbst

- Findings: MEM-010 (medium)
- Ziel: Ein `append()` aus einem fremden `createEffect()` heraus kann dem
  Element seine Bindung an die View-Komponente nicht mehr abräumen — dieselbe
  Abschirmung, die die drei Kern-Elemente bereits fahren.
- Bereich: `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
- Hängt ab von: —
- Modell: mittlere Stufe
- Dateien: `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`,
  `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`, `Backlog.md`
- Vorgehen:
  1. Abgleich vom Runner (Zug 0, auf sauberem Baum nach `b78103f`): der Befund
     steht unverändert. `#setupViewComponentEffect()`
     (`ShaeOffscreenCanvasElement.js:122-151`) ruft `createEffect()` ungeschützt,
     `connectedCallback()` (Zeile 208-214) ruft es als erste Anweisung, und der
     Kommentar darüber (Zeile 114-121) beschreibt die Anfälligkeit als
     fortbestehenden Vorbehalt.
  2. Die Vorlage steht im Repository und wird übernommen, nicht neu erfunden:
     `ShaeElement.connectedCallback` (`packages/shadow-objects/src/elements/ShaeElement.ts:193-201`)
     legt den **ganzen Rumpf** des `connectedCallback` in `hibernate()` aus
     `@spearwolf/signalize`; `ShaeEntElement` (Zeile 511), `ShaePropElement`
     (Zeile 320) und `ShaeWorkerElement` (Zeile 249) machen es genauso, und die
     Rahmen schachteln sich ohne Weiteres. Für dieses Element heißt das: der
     ganze Rumpf von `connectedCallback()` wandert in `hibernate(() => { … })`,
     nicht nur der Aufruf von `#setupViewComponentEffect()` — auch
     `this.frameLoopIsRunning = true` schreibt über
     `viewComponent.setProperty()` in Signale, und was dabei gelesen wird, darf
     kein fremder Effekt in seine Abhängigkeiten aufnehmen. `hibernate` wird der
     bestehenden Import-Zeile aus `@spearwolf/signalize` (Zeile 4) hinzugefügt;
     das Paket hat die Abhängigkeit bereits, es kommt keine neue dazu.
  3. Der Kommentar über `#setupViewComponentEffect()` (Zeile 114-121) trägt ab
     Satz 3 (»That holds as long as connectedCallback() runs outside of another
     signal effect's callback: …«) eine Einschränkung, die nach der Änderung
     nicht mehr gilt. Er wird umgeschrieben: die ersten zwei Sätze (Effekt lebt
     nur, solange das Element im Dokument steht) bleiben der Sache nach stehen,
     der Vorbehalt weicht der Begründung, die am `hibernate()`-Aufruf selbst
     steht. Am `hibernate()` in `connectedCallback()` steht ein Kommentar in der
     Machart von `ShaeElement.connectedCallback`: warum der Rumpf außerhalb des
     reaktiven Kontexts des Aufrufers läuft — `createEffect()` hängt einen neuen
     Effekt an den gerade laufenden, dessen nächster Lauf ihn wieder abräumt, und
     das Element würde verstummen, ohne dass jemand etwas zerstört hätte.
     Konvention beachten: kein Rückblick auf den Vorzustand, keine Finding-ID,
     Englisch.
  4. Regressionstest zuerst, rot gesehen, **bevor** Schritt 2 und 3 laufen. Ort:
     `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js`,
     im `describe('what the element answers while it is in the document')`
     (ab Zeile 219). Machart nach dem Vorbild
     `packages/shadow-objects/src/elements/elementReachability.spec.ts:176-199`
     (»keeps a <shae-ent> that was appended from inside a foreign effect working
     when that effect runs again«): ein `createSignal()` als Auslöser, ein
     `createEffect()`, das dieses Signal liest und das Element anhängt, solange
     es nicht verbunden ist; danach das Signal setzen, damit der fremde Effekt
     ein zweites Mal läuft; danach `emit(el.viewComponent,
     RequestOffscreenCanvas)` und erwarten, dass der Spy auf
     `el.canvas.transferControlToOffscreen` gerufen wurde (dieselbe Prüfung wie
     im Fall »an element put back into the document answers again«, Zeile
     241-251). Am Ende `foreign.destroy()`. Das Element entsteht über
     `createWithNamespace()` mit einem eigenen, laufend nummerierten Namespace
     wie in `connect()` (Zeile 106-116), bekommt `el.logger.enable = false` und
     wird in `connectedElements` abgelegt, damit das `afterEach` (Zeile 188-199)
     es abräumt. `createEffect` und `createSignal` kommen aus
     `@spearwolf/signalize`, das im Spec noch nicht importiert ist. Der rote Lauf
     (`pnpm -F @spearwolf/shae-offscreen-canvas exec vitest src/elements/ShaeOffscreenCanvasElement.spec.js --run`)
     gehört mit seiner Ausgabe in den Report.
  5. `packages/shae-offscreen-canvas/CHANGELOG.md`, unter `## [Unreleased]`: ein
     Eintrag, der sagt, dass die Anmeldungen des Elements dem Element gehören,
     wer immer es anhängt — `connectedCallback` läuft außerhalb des reaktiven
     Kontexts des Aufrufers. Der gleichlautende Eintrag des Kernpakets
     (`packages/shadow-objects/CHANGELOG.md`, Eintrag »the subscriptions of an
     element belong to the element, whoever put it into the document«) nennt als
     beobachtbare Folge, dass ein offener `batch()` des Aufrufers vor dem Connect
     durchgeschoben wird. Diese Folge gilt hier genauso, **wenn** sie sich am
     installierten signalize (1.0.0-beta.0) tatsächlich zeigt: erst nachsehen
     (die Doku der Bibliothek liegt unter
     `node_modules/@spearwolf/signalize/docs/`, dazu gibt es den Skill
     `using-signalize`), dann schreiben, was hält. Zeigt sie sich nicht, bleibt
     der Satz weg und der Report sagt warum. Der Eintrag steht in der Reihung der
     vorhandenen Stichpunkte, nicht in einem neuen Abschnitt, und beschreibt den
     Zustand, nicht die Umstellung.
  6. `Backlog.md:289` — die Zeile des vitest-Inventars für
     `packages/shae-offscreen-canvas` nennt 5 Dateien und 118 Fälle; beides
     stimmt nicht mehr (`distContract.spec.js` ist dazugekommen, die Fallzahl ist
     gewachsen). Ebenso Zeile 287 für das Kernpaket (23 Dateien, 775 Fälle) und
     Zeile 291 für die Browser-Suite (377 Fälle). Alle drei Zeilen auf die Zahlen
     bringen, die **der eigene Verify-Lauf** ausweist — Dateilisten eingeschlossen
     (`distContract.spec.ts` beim Kernpaket, `distContract.spec.js` beim
     Canvas-Paket). Abschnitt 4.2 bleibt unangetastet: seine Prozentzahlen tragen
     ein Messdatum und sind damit keine falsche Aussage.
  7. `ShaeOffscreenCanvasElement.js` ist überschaubar — ganz lesen, bevor die
     Datei verlassen wird, und alles melden, was darin sonst auffällt und nicht
     zu diesem Paket gehört. Für `AGENTS.md` wurde vom Runner nachgesehen: keine
     Zeile dort beschreibt dieses Verhalten, es ist nichts nachzuziehen. Auch
     `README.md` und `docs/01-shadow-objects-api.md` des Canvas-Pakets sagen
     nichts über Anmeldungen oder den Lebenszyklus des Elements.
- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`
- Commit: `fix(canvas): the canvas element's subscriptions belong to the element, whoever appends it`
- Hash: 4622161
- Ergebnis: 1 Runde · MEM-010 behoben — der ganze Rumpf von `connectedCallback()`
  läuft in `hibernate()` aus `@spearwolf/signalize`, wie bei den drei
  Kern-Elementen; der Effekt aus `#setupViewComponentEffect()` gehört damit dem
  Element, wer immer es anhängt · Regressionstest `keeps an element that was
  appended from inside a foreign effect working when that effect runs again`
  (`ShaeOffscreenCanvasElement.spec.js`), vor dem Fix rot mit
  `expected "transferControlToOffscreen" to be called at least once`, vom
  Reviewer unabhängig auf dem Vorzustand nachgestellt · Kommentar über
  `#setupViewComponentEffect()` von der Vorbehalts- auf die Begründungsform
  gebracht · `Backlog.md` §4.1: die drei undatierten Inventarzeilen (Kernpaket,
  Canvas-Paket, Browser-Suite) auf die Zahlen des Verify-Laufs gebracht, die
  §4.2-Prozentzahlen bleiben stehen, weil sie ein Messdatum tragen · Reviewer
  ohne `kritisch`/`wichtig`; ein `klein`: der CHANGELOG-Eintrag erzählt mit
  »used to« den Vorzustand — bewusst hingenommen nach demselben Maß wie in
  Paket 1, weil der Satz auch ohne den Vorzustand trägt und die Nachbareinträge
  derselben Datei durchgängig so geschrieben sind · die `batch()`-Aussage des
  Eintrags gegen `hibernate.d.ts` von signalize 1.0.0-beta.0 belegt, von
  Implementierer und Reviewer je einzeln · eigener Verify:
  `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`, exit 0,
  785 Fälle Kernpaket (unverändert), 123 Fälle Canvas-Paket (122 + 1), 379 Fälle
  Browser-Suite (unverändert), Log `paket-6.verify.log`
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `<shae-offscreen-canvas>` führt seinen `connectedCallback` außerhalb
  des reaktiven Kontexts des Aufrufers. Beobachtbar ist die Folge für einen
  offenen `batch()`: er wird vor dem Connect durchgeschoben, seine Effekte laufen
  also vor dem `append()` statt beim Schließen des Batches.

**MEM-010 · medium · packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:113-120** — Der Effekt des Canvas-Elements kann einem fremden Effekt-Kontext zufallen

connectedCallback legt seinen Effekt ohne Schutz vor einem umgebenden
Effekt-Kontext an. Ein append() aus einem createEffect() des Anwenders heraus
übereignet den Effekt diesem fremden Effekt, dessen nächster Lauf ihn abräumt —
das Element verliert seine Bindung an die View-Komponente, ohne dass jemand etwas
zerstört hätte. Der Kommentar über dem Feld beschreibt die Anfälligkeit wörtlich.
Vorbestehend: der createEffect steht an derselben Stelle schon vor diesem
Remediation-Lauf. Dieselbe Anfälligkeit ist für shae-ent, shae-prop und
shae-worker inzwischen geschlossen; das Canvas-Element trägt sie weiter.

Empfehlung: Den Effekt in denselben Rahmen setzen, den die drei Kern-Elemente
jetzt benutzen: die Anmeldung läuft dort in einer Abschirmung, die keinen
umgebenden Effekt-Kontext erben lässt. Ein Fall, der das Element aus einem
createEffect() heraus anhängt und danach den Effekt des Anwenders laufen lässt,
belegt die Wirkung.

### [x] 7. Ein Modul ohne `shadowObjects`-Export scheitert in beiden Umgebungen gleich

- Findings: CONS-010 (medium)
- Ziel: `LocalShadowObjectEnv` lehnt den fehlenden Export mit derselben Botschaft
  ab, die der `MessageRouter` auf die Leitung legt. Die Zusage »derselbe Code,
  nur ein anderer Proxy« trägt auch hier.
- Bereich: `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts` gegen
  `worker/MessageRouter.ts`
- Hängt ab von: —
- Hash: 780b75b
- Modell: mittlere Stufe
- Dateien: `packages/shadow-objects/src/in-the-dark/importModule.ts`,
  `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts`,
  `packages/shadow-objects/src/worker/MessageRouter.ts`,
  `packages/shadow-objects/src/view/LocalShadowObjectEnv.spec.ts`,
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. Abgleich vom Runner (Zug 0, auf sauberem Baum nach `4622161`): der Befund
     steht unverändert, die Zeilen sind gewandert.
     `LocalShadowObjectEnv.importScript()` steht auf Zeile 69-74 und prüft
     `module[ShadowObjectsExport]` mit einem `if` ohne `else`; fehlt der Export,
     wird nichts registriert, nichts gemeldet, und die Promise erfüllt sich.
     `MessageRouter.#configure()` (Zeile 112-121) hat für denselben Fall einen
     `else`-Zweig und legt `{type: ImportedModule, url, error: 'module has no
     "shadowObjects" export'}` auf die Leitung; `RemoteWorkerEnv.importScript()`
     (Zeile 374-384) wirft dieses `error`-Feld aus seinem Guard heraus, die
     Promise lehnt also ab.
  2. Der Wortlaut bekommt eine einzige Quelle, damit die beiden Seiten nicht
     erneut auseinanderlaufen — genau das ist die Krankheit dieses Befunds. In
     `packages/shadow-objects/src/in-the-dark/importModule.ts` (beide Seiten
     importieren aus dieser Datei bereits `importModule`, sie liegt in keinem
     `export *` von `src/index.ts` und ist damit keine öffentliche Oberfläche)
     kommt neben die Funktion:

     ```ts
     export const missingShadowObjectsExportMessage = `module has no "${ShadowObjectsExport}" export`;
     ```

     Dazu ein JSDoc-Block, der sagt, wofür der Wert da ist: die Worker-Seite legt
     ihn als `error`-Feld ihrer `ImportedModule`-Antwort auf die Leitung, die
     lokale Seite lehnt `importScript()` mit einem `Error` ab, der ihn trägt —
     ein Wortlaut an einer Stelle. Der Import von `ShadowObjectsExport` aus
     `../constants.js` kommt in `importModule.ts` neu dazu; ein Zyklus entsteht
     nicht, `constants.ts` importiert nur aus `types.ts`.
  3. `MessageRouter.ts:119` benutzt die neue Konstante statt des eigenen
     Template-Strings. Der ausgehende Text ändert sich dabei nicht — der Fall
     `reports a module without the shadow-objects export` in
     `MessageRouter.spec.ts:230` hält den Wortlaut wörtlich fest und bleibt grün.
     Dieser Fall ist ab hier auch der Anker für den lokalen Zweig: eine Änderung
     am Wortlaut färbt ihn rot.
  4. `LocalShadowObjectEnv.importScript()` bekommt den Gegenzweig:

     ```ts
     async importScript(url: URL | string): Promise<void> {
       const module = await import(/* @vite-ignore */ toUrlString(url));
       if (!module[ShadowObjectsExport]) {
         throw new Error(missingShadowObjectsExportMessage);
       }
       await this.importModule(module[ShadowObjectsExport]);
     }
     ```

     Ein kurzer Kommentar daneben begründet, warum abgelehnt und nicht bloß
     geschwiegen wird: ein Modul, dem der Export fehlt, ist in beiden Umgebungen
     falsch, und wer lokal entwickelt, soll es dort erfahren und nicht erst beim
     Umschalten auf einen Worker. Konvention beachten: Englisch, kein Rückblick
     auf den Vorzustand, keine Finding-ID.
  5. Der Träger des Wortlauts ist bewusst **nicht** derselbe wie auf der
     Worker-Strecke, und das gehört benannt statt verschwiegen: der Router kann
     nur eine Zeichenkette auf die Leitung legen, `RemoteWorkerEnv` reicht sie
     unverändert durch (`RemoteWorkerEnv.spec.ts:670` hält fest, dass dort eine
     nackte Zeichenkette ankommt), lokal wird ein `Error` mit demselben Text
     abgelehnt. Gleich ist damit, **dass** und **womit begründet** abgelehnt
     wird; unterschiedlich bleibt der Typ des Ablehnungsgrundes. Die Strecke
     Worker → View auf eine Fehlerklasse umzustellen, wäre eine Änderung an der
     öffentlichen Oberfläche der Remote-Umgebung und steht nicht in diesem Paket
     — sie ist als Nebenbefund notiert, siehe »Offene Befunde«. Nicht selbst
     mitnehmen.
  6. Regressionstest zuerst, rot gesehen, **bevor** Schritt 2 bis 4 laufen. Ort:
     `packages/shadow-objects/src/view/LocalShadowObjectEnv.spec.ts`, ein neues
     `describe('importScript', …)` am Ende, vor dem schließenden
     `describe('LocalShadowObjectEnv')`. Machart nach dem Vorbild von
     `MessageRouter.spec.ts` (`describe('module import')`, Zeile 186-232): die
     Modul-URLs sind `data:`-URLs, `toUrlString()` reicht sie unverändert durch,
     und der Loader importiert sie — das läuft in derselben happy-dom-Umgebung,
     `MessageRouter.spec.ts` trägt keine eigene `@vitest-environment`-Direktive.
     Zwei Fälle:
     - `refuses a module without the shadow-objects export`: eine Umgebung mit
       eigener Registry (`new LocalShadowObjectEnv(new Registry())`), dann
       `await expect(env.importScript('data:text/javascript,export const nothing = 1'))
       .rejects.toThrow('module has no "shadowObjects" export')`. Am Ende
       `env.destroy()`. Dieser Fall ist der rote: heute erfüllt sich die Promise.
     - `imports a module that has the export`: dieselbe Machart mit
       `'data:text/javascript,export const shadowObjects = {define: {"env-import-token": class {}}}'`,
       danach `expect(env.registry.hasToken('env-import-token')).toBe(true)`, am
       Ende `env.destroy()`. Er hält fest, dass der neue Zweig nur den fehlenden
       Export ablehnt und nicht den gesunden Fall mit. Der rote Lauf des ersten
       Falls (`pnpm -F @spearwolf/shadow-objects exec vitest src/view/LocalShadowObjectEnv.spec.ts --run`)
       gehört mit seiner Ausgabe in den Report.
  7. `packages/shadow-objects/docs/api-reference.md`, Abschnitt
     `### LocalShadowObjectEnv`, Methodentabelle, Zeile `importScript(url)`
     (steht heute bei Zeile 1467 und sagt nur »Import a shadow objects module
     from a URL.«): ergänzen, dass ein Modul ohne den `shadowObjects`-Export
     abgelehnt wird, mit dem Wortlaut, den auch die Worker-Seite meldet. Die
     Zeile `importScript(url)` in der Methodentabelle von `### RemoteWorkerEnv`
     (Zeile 1517) bekommt denselben Zusatz und dazu den Unterschied im Träger:
     dort kommt der Wortlaut als die Zeichenkette an, die über die Leitung kam,
     lokal als `Error`. Vorbild für die Machart einer benannten Restdifferenz ist
     der Satz in derselben Datei bei Zeile 1549 (»A `LocalShadowObjectEnv`
     delivers such a message, so this is the one point at which the two
     environments do not end alike«). `README.md` des Pakets (Zeile 7) und
     `docs/best-practices.md:177` sagen zu, dass nur der Proxy wechselt; beide
     werden durch diese Änderung richtiger und bleiben unangetastet.
  8. `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]` in den
     Abschnitt `### Behavior`, als letzter Stichpunkt der Reihung (es gibt dort
     bereits einen Eintrag `**Behavior (environments):**`, an dessen Machart sich
     der neue hält): `LocalShadowObjectEnv.importScript()` lehnt ein Modul ohne
     `shadowObjects`-Export ab, mit demselben Wortlaut, den die Worker-Seite
     meldet. Zwei Folgen gehören dazu: eine Anwendung, die diese Promise
     beobachtet, bekommt jetzt eine Ablehnung; und ein
     `<shae-worker local src="…">` auf ein solches Modul meldet über
     `logger.error` (`ShaeWorkerElement.#onUnobservedRejection`, dieselbe Zeile,
     die die Worker-Variante schon schreibt), wo der deklarative Weg vorher still
     blieb. Der Einleitungsabsatz über der Liste (»Fifty changes reach existing
     consumers«) wird nicht angefasst — die Pakete davor haben ihn ebenfalls
     stehen lassen.
  9. Die vier angefassten Quelldateien sind überschaubar — jede ganz lesen, bevor
     sie verlassen wird, und alles melden, was darin auffällt und nicht zu diesem
     Paket gehört. Für `AGENTS.md` wurde vom Runner nachgesehen: keine Zeile dort
     beschreibt das Verhalten der beiden Umgebungen beim Modulimport, es ist
     nichts nachzuziehen. `docs/cheat-sheet.md` und `docs/guides.md` nennen
     `importScript()` nur als Aufruf im Wiederaufbau-Rezept, ohne Aussage über
     sein Scheitern.
- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`
- Commit: `fix(view): the local environment refuses a module without the shadow-objects export`
- Ergebnis: 1 Runde · CONS-010 behoben — `LocalShadowObjectEnv.importScript()`
  lehnt ein Modul ohne den `shadowObjects`-Export mit einem `Error` ab, dessen
  Wortlaut aus derselben Quelle stammt, die der `MessageRouter` auf die Leitung
  legt (`missingShadowObjectsExportMessage` in `src/in-the-dark/importModule.ts`)
  · Regressionstest `refuses a module without the shadow-objects export`
  (`LocalShadowObjectEnv.spec.ts`), vor dem Fix rot mit `AssertionError: promise
  resolved "undefined" instead of rejecting`, vom Reviewer unabhängig auf dem
  Vorzustand nachgestellt; der zweite neue Fall `imports a module that has the
  export` hält fest, dass der gesunde Weg unberührt bleibt · bewusst
  unterschiedlich geblieben und in `docs/api-reference.md` in beiden
  Methodentabellen benannt: der Träger des Ablehnungsgrundes — über die
  Worker-Grenze die Zeichenkette, die die Leitung trägt, lokal ein `Error` mit
  demselben Text · Reviewer ohne `kritisch`/`wichtig`; ein `klein`: der
  CHANGELOG-Eintrag erzählt mit »before« den Vorzustand — bewusst hingenommen
  nach demselben Maß wie in Paket 1 und 6, weil der Satz auch ohne den
  Vorzustand trägt und die Nachbareinträge derselben Datei durchgängig so
  geschrieben sind · eigener Verify:
  `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`, exit 0,
  787 Fälle Kernpaket (785 + 2), 123 Canvas-Paket (unverändert), 379
  Browser-Suite (unverändert), Log `paket-7.verify.log`
- Nebenbefunde: → Queue (der Ablehnungsgrund eines fehlgeschlagenen Imports
  reist als nackte Zeichenkette über die Worker-Grenze · `#onDestroy(data: any)`
  im `MessageRouter`)
- Folgen: keine
- Schnittstellen: `LocalShadowObjectEnv.importScript()` lehnt ab, wenn das
  geladene Modul keinen `shadowObjects`-Export trägt — `Error` mit dem Text
  `module has no "shadowObjects" export`; bis dahin erfüllte sich die Promise.
  Der Wortlaut hat ab hier genau eine Quelle:
  `missingShadowObjectsExportMessage`, exportiert aus
  `packages/shadow-objects/src/in-the-dark/importModule.ts` und von beiden
  Seiten benutzt (die Datei steht in keinem `export *` von `src/index.ts`, ist
  also keine öffentliche Oberfläche). Wer `MessageRouter.#configure()` anfasst,
  arbeitet ab jetzt gegen diese Konstante statt gegen ein Inline-Template.

**CONS-010 · medium · packages/shadow-objects/src/view/LocalShadowObjectEnv.ts:69-74 gegenüber worker/MessageRouter.ts:111-120** — Ein Modul ohne shadowObjects-Export scheitert im Worker und bleibt lokal stumm

Beide Umgebungen importieren ein Modul und suchen darin den benannten Export
shadowObjects. Findet der MessageRouter ihn nicht, antwortet er der View mit
ImportedModule samt error-Feld — importScript() lehnt ab, und das ist auf der
View-Seite sichtbar. LocalShadowObjectEnv prüft dieselbe Bedingung mit einem if
ohne else: kein Export, keine Registrierung, keine Meldung, und die
zurückgegebene Promise erfüllt sich. Ein Tippfehler im Export-Namen oder ein
Default-Export statt des benannten fällt lokal nicht auf und schlägt beim
Umschalten auf <shae-worker> zu — in genau der Richtung, in der README und Doku
Gleichheit zusagen: derselbe Shadow-Object-Code, nur ein anderer Proxy. Der
Unterschied kostet keinen Test, er kostet die Zusage.

Empfehlung: Den fehlenden Export lokal genauso behandeln: ablehnen mit derselben
Botschaft, die der Router auf die Leitung legt. Wo das bewusst nachsichtig
bleiben soll, gehört mindestens eine Logger-Warnung hin und ein Satz in die Doku,
der die beiden Umgebungen an dieser Stelle auseinanderhält.

### [x] 8. Ein Lebenszyklus-Hook unter falschem Namen meldet sich

- Findings: API-002 (medium)
- Ziel: Wer einen der vier Hooks als Zeichenkette schreibt, bekommt eine Zeile
  über den `ConsoleLogger` statt eines stillen Fehlschlags; die verbliebenen
  ausgelieferten Fundstellen zeigen das richtige Muster, das `sample`-Verzeichnis
  zuerst.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.ts`,
  `packages/shae-offscreen-canvas/src/shadow-objects/sample/`
- Hängt ab von: —
- Hash: b32999b
- Modell: mittlere Stufe (Implementierer), mittlere Stufe (Reviewer)
- Dateien: `packages/shadow-objects/src/in-the-dark/Kernel.ts`,
  `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`,
  `packages/shadow-objects/docs/cheat-sheet.md`,
  `packages/shadow-objects/CHANGELOG.md`,
  `packages/shae-offscreen-canvas/src/shadow-objects/sample/CubeScene.js`,
  `packages/shae-offscreen-canvas/src/shadow-objects/sample/TestImage2OnCanvas2D.js`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`
- Vorgehen:
  1. Zuerst der Regressionstest, rot gesehen, in
     `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`. Ein neues
     `describe('a lifecycle hook written under its string name')` mit drei
     Fällen, alle nach dem Muster, das die Datei schon fährt
     (`const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});`,
     am Ende `consoleError.mockRestore()`):
     - Ein Shadow Object, das `onDestroy() {}` als gewöhnliche Methode trägt und
       das Symbol `onDestroy` nicht, wird über `Registry`/`ShadowObject` an einer
       Entity angelegt; `console.error` ist danach genau einmal gerufen worden,
       und die Argumente enthalten den Namen `onDestroy` und den `displayName`
       des Konstruktors.
     - Ein Shadow Object, das `[onDestroy](entity) {}` unter dem Symbol trägt,
       erzeugt keinen Aufruf von `console.error`.
     - Ein Shadow Object, das beides trägt — `[onDestroy]` als Symbol **und**
       eine gewöhnliche Methode `onDestroy` —, erzeugt ebenfalls keinen Aufruf:
       gemeldet wird nur die Zeichenkette ohne das zugehörige Symbol.
     Der rote Lauf ist
     `pnpm -F @spearwolf/shadow-objects exec vitest src/in-the-dark/Kernel.spec.ts --run`
     und gehört mit seiner Ausgabe in den Report.
  2. `Kernel.ts`: den Import in Zeile 16 um `onViewEvent` erweitern, sodass alle
     vier Symbole zur Verfügung stehen (`onCreate`, `onDestroy`,
     `onParentChanged`, `onViewEvent`).
  3. `Kernel.ts`: auf Modulebene, neben `getDisplayName` (Zeile 48), eine
     Konstantentabelle der vier Paare anlegen, z. B.
     `const LIFECYCLE_HOOKS: [string, symbol][] = [['onCreate', onCreate], ['onDestroy', onDestroy], ['onParentChanged', onParentChanged], ['onViewEvent', onViewEvent]];`
  4. `Kernel.ts`, `attachShadowObject(shadowObject, entity)` (Zeile 816): vor
     `on(entity, shadowObject)` über die Tabelle laufen. Trägt die Instanz unter
     dem Zeichenketten-Namen eine Funktion (`typeof (shadowObject as any)[name] === 'function'`)
     und unter dem Symbol keine (`typeof (shadowObject as any)[symbol] !== 'function'`),
     wird je Treffer eine Zeile ausgegeben. Der Anzeigename kommt aus derselben
     Quelle wie in `#notifyShadowObjectDestroy()`:
     `this.#shadowObjectScopes.get(shadowObject)?.displayName` — `attachShadowObject()`
     läuft nach `#shadowObjectScopes.set(...)` in `constructShadowObject()`, der
     Eintrag steht also.
     Die Ausgabe geht über `this.logger.error(...)`, nicht `warn`: `logger.warn`
     hängt an `ConsoleLogger.sharedConfig.enable`, das außerhalb von `localhost`
     aus ist, und ein Hook, der genau deshalb still bleibt, ist der Fehler, um
     den es hier geht. Dieselbe Begründung steht bereits ausgeschrieben an
     `ShaeWorkerElement.ts:439-442`; ein Kommentar an der neuen Stelle nennt sie
     in eigenen Worten, ohne die andere Datei nachzuerzählen.
     Der Wortlaut nennt drei Dinge — den Hook-Namen, den Anzeigenamen des Shadow
     Objects und den Weg heraus, etwa:
     `` this.logger.error(`the "${name}" lifecycle hook is a plain method and is never called; use the [${name}] symbol from "@spearwolf/shadow-objects/shadow-objects.js":`, displayName); ``
     Ein Inline-Kommentar erklärt, *warum* es die Prüfung gibt: die vier Hooks
     sind Symbole, ein gleichnamiger Zeichenketten-Schlüssel wird von keinem
     Emitter des Repositories bedient, und ohne diese Meldung sieht ein solcher
     Hook richtig aus und läuft nie.
  5. `packages/shae-offscreen-canvas/src/shadow-objects/sample/CubeScene.js`:
     `import {onDestroy} from '@spearwolf/shadow-objects/shadow-objects.js';`
     ergänzen und die Methode `onDestroy() {…}` (Zeile 37) zu `[onDestroy]() {…}`
     machen. Rumpf unverändert.
  6. `packages/shae-offscreen-canvas/src/shadow-objects/sample/TestImage2OnCanvas2D.js`:
     dieselbe Umstellung an Zeile 30. Rumpf unverändert.
  7. `packages/shadow-objects/docs/cheat-sheet.md`, Abschnitt »Lifecycle Hooks«
     (Zeilen 120-128): unter die Tabelle einen Satz, dass die vier Hooks Symbole
     sind, eine gleichnamige gewöhnliche Methode kein Hook ist und nie gerufen
     wird, und dass der Kernel einen solchen Fall beim Anhängen des Shadow
     Objects über den `ConsoleLogger` meldet. Kein Rückblick auf den Vorzustand.
  8. `packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`: ein Bullet,
     dass der Kernel beim Anhängen eines Shadow Objects meldet, wenn eine der
     vier Lebenszyklus-Methoden unter ihrem Zeichenketten-Namen statt unter ihrem
     Symbol steht.
  9. `packages/shae-offscreen-canvas/CHANGELOG.md` unter `## [Unreleased]`: ein
     Bullet, dass die beiden Beispiel-Shadow-Objects `CubeScene` und
     `TestImage2OnCanvas2D` ihren Aufräumschritt unter dem `onDestroy`-Symbol
     führen und er damit läuft.
  10. `AGENTS.md` auf Veralterung prüfen; nur anfassen, wenn dort etwas steht,
      das durch diese Änderung falsch wird.
- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`
- Commit: `fix(kernel): report a lifecycle hook that carries a string name instead of its symbol`
- Ergebnis: 1 Runde · API-002 behoben — `attachShadowObject()` in
  `Kernel.ts:827-842` hält die vier Lebenszyklus-Symbole gegen ihre
  Zeichenketten-Namen und meldet jeden Treffer über `this.logger.error()` mit
  Hook-Name, Anzeigename des Shadow Objects und dem Weg heraus; `logger.error`
  und nicht `logger.warn`, weil `warn` außerhalb von `localhost` stumm bleibt und
  genau das der Fehler ist, um den es geht (dieselbe Begründung trägt
  `ShaeWorkerElement.ts:439-442`) · Regressionstest `reports a plain method that
  shadows the onDestroy symbol` (`Kernel.spec.ts`, `describe('a lifecycle hook
  written under its string name')`), vor dem Fix rot mit `expected "error" to be
  called 1 times, but got 0 times`, vom Reviewer auf dem Vorzustand unabhängig
  nachgestellt; zwei Begleitfälle halten fest, dass das Symbol allein und Symbol
  plus gleichnamige Methode stumm bleiben · von den drei ausgelieferten
  Fundstellen des Findings sind zwei umgestellt (`sample/CubeScene.js:38`,
  `sample/TestImage2OnCanvas2D.js:31` tragen jetzt `[onDestroy]` mit Import aus
  `@spearwolf/shadow-objects/shadow-objects.js`), die dritte
  (`ThreeMultiViewRenderer.js:82`) war mit `7e9c807` aus dem Vorlauf bereits
  entfallen · Reviewer ohne Befund auf allen drei Stufen · eigener Verify:
  `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`, exit 0,
  790 Fälle Kernpaket (787 + 3), 123 Canvas-Paket (unverändert), 379
  Browser-Suite (unverändert), Log `paket-8.verify.log`
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: Der `Kernel` gibt beim Anhängen eines Shadow Objects eine
  `logger.error`-Zeile aus, wenn die Instanz eine der vier Lebenszyklus-Methoden
  (`onCreate`, `onDestroy`, `onParentChanged`, `onViewEvent`) unter ihrem
  Zeichenketten-Namen trägt und nicht unter dem zugehörigen Symbol. Wer ein Spec
  schreibt, das `console.error` zählt und dabei ein Shadow Object mit einer
  gleichnamigen gewöhnlichen Methode anlegt, sieht diese Zeile mit. Kein Export
  und keine Signatur ändern sich; die Paartabelle `LIFECYCLE_HOOKS` ist
  modullokal in `Kernel.ts`.
**API-002 · medium · packages/shadow-objects/src/in-the-dark/Kernel.ts:816-826 und in-the-dark/events.ts:5,21,41; Fundstellen in packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js:82, sample/CubeScene.js:37, sample/TestImage2OnCanvas2D.js:30** — Ein Lebenszyklus-Hook mit Zeichenketten-Namen läuft nie, und nichts sagt es

onCreate, onDestroy, onViewEvent und onParentChanged sind Symbole. Ein Shadow
Object, das die Hooks unter ihrem gewöhnlichen Namen schreibt, sieht richtig aus
und wird nie gerufen, weil weder der Kernel noch eventize eine Zeichenkette
finden, wo ein Symbol steht. Es gibt keine Warnung, keine Lint-Regel und keinen
Fall, der das aufdeckt. Drei der ausgelieferten Shadow Objects sitzen in der
Falle, zwei davon im mitpublizierten sample-Verzeichnis, das damit das falsche
Muster vorführt. Die Dokumentation macht es richtig, cheat-sheet.md:32 importiert
das Symbol ausdrücklich, was den Abstand zwischen Vorlage und Beispielcode nur
größer macht.

Empfehlung: Beim Anhängen eines Shadow Objects prüfen, ob die Instanz eine
Funktion unter einem der vier Zeichenketten-Namen trägt, ohne das zugehörige
Symbol zu tragen, und das über den ConsoleLogger melden. Ein Dutzend Zeilen in
attachShadowObject(), und aus dem stillen Fehlschlag wird eine Zeile in der
Konsole. Danach die drei Fundstellen umstellen, das sample-Verzeichnis zuerst.

### [x] 9. `three` ist ein Peer des Canvas-Pakets

- Findings: DEP-002 (medium)
- Ziel: Ein Consumer, der selbst `three` benutzt, bekommt keine zweite Instanz
  mehr in den Baum. Siehe Entscheidung vom 2026-08-23: Peer plus devDep, nicht
  optional.
- Bereich: `packages/shae-offscreen-canvas/package.json`, `pnpm-workspace.yaml`,
  Doku und CHANGELOG des Canvas-Pakets
- Hängt ab von: —
- Hash: d41d610
- Modell: mittlere Stufe (Implementierer), mittlere Stufe (Reviewer)
- Dateien: `pnpm-workspace.yaml`, `scripts/makePackageJson.mjs`,
  `packages/shae-offscreen-canvas/package.json`, `pnpm-lock.yaml`,
  `packages/shae-offscreen-canvas/src/distContract.spec.js`,
  `packages/shae-offscreen-canvas/src/distContract.package.json`,
  `packages/shae-offscreen-canvas/README.md`,
  `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`, `CHANGELOG.md` (Wurzel),
  `AGENTS.md`, `CLAUDE.md`, `Backlog.md`
- Vorgehen:
  1. Abgleich vom Runner (Zug 0, auf sauberem Baum nach `b32999b`): der Befund
     steht unverändert. `packages/shae-offscreen-canvas/package.json` führt
     `three` unter `dependencies` (letzter der vier Einträge, `"three":
     "catalog:"`), `peerDependencies` gibt es in der Datei nicht.
     `src/shadow-objects.js` importiert `ThreeMultiViewRenderer` statisch und
     nennt ihn im `define`-Objekt; `src/shadow-objects/ThreeMultiViewRenderer.js:1`
     und `src/shadow-objects/sample/CubeScene.js:2` sind die beiden einzigen
     Stellen im Repository, die aus `'three'` importieren (`ThreeRenderView.js`
     kommt ohne aus und arbeitet nur über Kontexte). Kein anderes
     Workspace-Paket hängt an `@spearwolf/shae-offscreen-canvas`.
  2. Der Peer-Bereich steht nicht im `package.json`. Zwei Vorgaben treffen hier
     aufeinander: Dependency-Versionen leben ausschließlich in
     `pnpm-workspace.yaml`, und ein Peer-Bereich muss weiter sein als der
     Katalog-Pin — `^0.185.1` heißt bei einer 0.x-Version `>=0.185.1 <0.186.0`
     und wäre als Peer eine Zwangsjacke. Beides zusammen geht über einen
     **benannten Katalog**, den pnpm 11 kennt (`catalog:<name>`). In
     `pnpm-workspace.yaml`, direkt **unter** dem bestehenden `catalog:`-Block
     (die Reihenfolge ist für den Parser in Schritt 3 wichtig), kommt hinzu:

     ```yaml
     # Named catalogs for ranges that are not install pins. A peer range names
     # the floor a consumer is held to, and it has to stay wider than the pin
     # the workspace itself installs — the consumer resolves `three` on its own,
     # and only one copy of it may stand in a dependency tree.
     catalogs:
       peer:
         three: '>=0.180.0'
     ```

     Der Wert `>=0.180.0` ist der Boden aus der Empfehlung des Findings. Der
     Eintrag `three: ^0.185.1` im Haupt-`catalog:` bleibt unverändert stehen —
     er ist weiterhin das, was dieser Workspace installiert.
  3. `scripts/makePackageJson.mjs` löst heute nur `catalog:` gegen den einen
     Haupt-Katalog auf; `catalog:peer` liefe in denselben Zweig und schriebe den
     Pin `^0.185.1` als Peer-Bereich ins veröffentlichte `package.json` — ein
     stiller Fehler, der genau das kaputt macht, worum es in diesem Paket geht.
     Die Datei muss benannte Kataloge lernen:
     - `loadPnpmCatalog()` liest zusätzlich einen `catalogs:`-Block auf oberster
       Ebene und gibt beides zurück, z. B. `{default: {…}, named: {peer: {…}}}`.
       Der vorhandene, zeilenweise Parser bleibt die Machart (keine YAML-Bibliothek
       dazunehmen); der `catalogs:`-Block hat genau eine Verschachtelungsebene
       mehr: Name des Katalogs, darunter die Paare. Kommentarzeilen und
       Leerzeilen werden wie bisher übersprungen, ein Top-Level-Schlüssel beendet
       den Block.
     - `resolveDependencies()` trennt `catalog:` (Haupt-Katalog) von
       `catalog:<name>` (benannter Katalog) und warnt mit derselben Machart wie
       heute (`console.warn('Catalog entry not found for', …)`), wenn der Name
       oder der Eintrag fehlt.
     - Ein kurzer Kommentar an der Stelle sagt, *warum* es zwei Sorten gibt: der
       Haupt-Katalog ist der Pin, den der Workspace installiert, ein benannter
       Katalog trägt Bereiche, die etwas anderes bedeuten — ein Peer-Bereich ist
       kein Installationswunsch, sondern eine Verträglichkeitszusage.
     - `resolveDependencies(outPackageJson.peerDependencies)` wird bereits
       gerufen (Zeile 34); daran ist nichts zu ändern.
  4. `packages/shae-offscreen-canvas/package.json`:
     - `"three": "catalog:"` aus `dependencies` entfernen. Die drei übrigen
       Einträge bleiben unverändert.
     - `"three": "catalog:"` in `devDependencies` aufnehmen, alphabetisch
       einsortiert (nach `lit-html`, vor `vite`) — Build, Demo und Specs lösen
       `three` weiterhin gegen den Katalog-Pin auf.
     - Ein neuer Block `"peerDependencies": {"three": "catalog:peer"}`. Er steht
       zwischen `devDependencies` und `dependencies` — die Schlüsselreihenfolge
       der Quelldatei bestimmt die Reihenfolge in `.npm-pkg/package.json`
       (`makePackageJson.mjs` spreizt das Eingabe-Objekt), und die Erwartung in
       Schritt 6 vergleicht sortierte Schlüssel, ist gegen die Position also
       unempfindlich.
     - `package.override.json` bleibt unangetastet: es setzt `scripts` und
       `devDependencies` auf `null`, `peerDependencies` überlebt damit in das
       veröffentlichte `package.json`.
  5. `pnpm install` laufen lassen, damit `pnpm-lock.yaml` die neue Aufteilung
     trägt. Der Lockfile-Diff gehört in den Commit. Danach nachsehen und im
     Report festhalten: (a) `pnpm-lock.yaml` führt `three` für dieses Paket unter
     `devDependencies` statt `dependencies` und die aufgelöste Version ist
     weiterhin eine 0.185.x, (b) `pnpm install --frozen-lockfile` läuft durch,
     (c) `pnpm -F @spearwolf/shae-offscreen-canvas build` schreibt in
     `.npm-pkg/package.json` ein `"peerDependencies": {"three": ">=0.180.0"}` —
     nicht `^0.185.1`. Punkt (c) ist der Beweis, dass Schritt 3 greift; steht
     dort der Pin, ist der Parser falsch.
  6. Regressionsnachweis, **zuerst rot**, bevor Schritt 4 läuft. Dieses Paket
     behebt keinen Rechenfehler, sondern die Form des veröffentlichten Pakets;
     der Anker dafür steht seit `bb3d412` bereit. Reihenfolge:
     - Zuerst `packages/shae-offscreen-canvas/src/distContract.package.json` auf
       die Zielform bringen: `"peerDependencies"` in die (alphabetisch sortierte)
       Liste `topLevelKeys` aufnehmen — zwischen `"name"` und `"publishConfig"`
       —, `"three"` aus `dependencyNames` streichen, und ein neues Feld
       `"peerDependencyNames": ["three"]` neben `dependencyNames` ergänzen.
     - Dann `packages/shae-offscreen-canvas/src/distContract.spec.js`, im Fall
       `the shape of .npm-pkg/package.json matches the recorded expectation`,
       zwei Zusicherungen hinter der vorhandenen `dependencyNames`-Zeile:
       ```js
       expect(Object.keys(pkg.peerDependencies ?? {}).sort()).toEqual(expectedPackageJsonShape.peerDependencyNames);
       expect(pkg.peerDependencies?.three).toMatch(/^>=/);
       ```
       Die zweite Zeile hält die *Form* des Bereichs, nicht seine Zahl: ein Peer
       nennt einen Boden, keinen Pin, und ein `^`- oder `~`-Bereich an dieser
       Stelle wäre genau der Rückfall, den dieses Paket beseitigt. Ein Kommentar
       darüber sagt das in einem Satz und grenzt es gegen den vorhandenen
       Kommentar ab, der erklärt, warum Versionszahlen nicht geprüft werden.
     - Jetzt `pnpm -F @spearwolf/shae-offscreen-canvas build` und
       `pnpm -F @spearwolf/shae-offscreen-canvas exec vitest src/distContract.spec.js --run`
       laufen lassen: der Fall muss **rot** sein (die gebaute `package.json` hat
       noch kein `peerDependencies` und `three` noch unter `dependencies`). Die
       Ausgabe dieses roten Laufs gehört in den Report.
     - Erst danach Schritt 4 und 5, dann derselbe Lauf grün.
  7. `packages/shae-offscreen-canvas/README.md`, Abschnitt `## Installation`
     (Zeile 8-12): die Codezeile wird `npm install @spearwolf/shae-offscreen-canvas three`,
     darunter zwei bis drei Sätze: `three` ist eine Peer-Abhängigkeit dieses
     Pakets und wird von der Anwendung installiert, damit im Abhängigkeitsbaum
     genau eine Fassung davon steht — zwei Instanzen führen zwei Registries für
     WebGL-Ressourcen und lassen `instanceof` über die Grenze hinweg falsch
     antworten. Der Peer ist nicht optional: der Einstiegspunkt
     `./shadow-objects.js` nennt `ThreeMultiViewRenderer` in seinem
     `define`-Objekt und lädt ihn statisch, `three` gehört also auch dann in den
     Baum, wenn eine Anwendung nur `Canvas2D` oder `CanvasBitmapRenderer`
     benutzt. Der geforderte Bereich (`>=0.180.0`) wird genannt. Konvention
     beachten: Englisch, kein Rückblick auf den Vorzustand, keine Finding-ID.
  8. `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`, Abschnitt
     `### ThreeMultiViewRenderer` (ab Zeile 66): ein Satz direkt unter der
     Überschrift, dass dieses Shadow Object gegen die `three`-Fassung der
     Anwendung arbeitet, die das Paket als Peer verlangt. Ein zweiter Satz im
     Abschnitt `### ThreeRenderView`, dass es selbst nicht aus `three`
     importiert, aber über den `ThreeMultiViewRendererContext` an dessen
     Renderer hängt und damit dieselbe Fassung sieht. Mehr nicht — die Datei ist
     eine API-Referenz der Shadow Objects, die Installationsfrage steht im
     README.
  9. `packages/shae-offscreen-canvas/CHANGELOG.md` unter `## [Unreleased]`:
     - Ein neuer Stichpunkt in der Reihung (nicht in einem neuen Abschnitt):
       `three` ist eine Peer-Abhängigkeit des Pakets mit dem Bereich
       `>=0.180.0`, die die Anwendung selbst installiert; damit steht genau eine
       Fassung im Abhängigkeitsbaum. Dazu die beobachtbare Folge: ein
       `npm install @spearwolf/shae-offscreen-canvas` ohne `three` daneben
       endet mit einer unerfüllten Peer-Abhängigkeit, und der Einstiegspunkt
       `./shadow-objects.js` lädt `ThreeMultiViewRenderer` statisch, `three`
       wird also auch von einer reinen Canvas2D-Anwendung gebraucht.
     - Der Merksatz über der Liste (»**Next release: minor.** … It reaches only
       consumers that hand their own template to the constructor of
       `ShaeOffscreenCanvasElement` …«) wird durch diesen Eintrag falsch: der
       Peer-Wechsel erreicht jeden Consumer. Der Satz bekommt die zweite
       breaking-Stelle dazu, die Einstufung »minor« bleibt (das Paket steht
       unter `1.0.0`). Diese Korrektur ist Teil dieses Pakets, kein Nebenbefund
       — sie wird erst durch die Änderung hier unwahr.
  10. `CHANGELOG.md` der Wurzel: ein neuer datierter Abschnitt (heutiges
      Commit-Datum, `2026-08-24`) über den vorhandenen, in der Machart der
      beiden Abschnitte darüber. Er nennt zwei Dinge: den `catalogs:`-Block in
      `pnpm-workspace.yaml` mit dem benannten Katalog `peer` und wofür er da ist,
      und dass `scripts/makePackageJson.mjs` `catalog:<name>` auflöst. Die
      Verlagerung von `three` selbst gehört **nicht** hierher, sondern in das
      CHANGELOG des Canvas-Pakets (Schritt 9) — hier steht nur das Harness.
  11. `AGENTS.md:112` und `CLAUDE.md:20` (dazu die Kurzfassung in
      `CLAUDE.md:116`) sagen, Versionen stünden im `catalog:`-Block und würden
      als `"<dep>": "catalog:"` referenziert. Das bleibt der Normalfall und wird
      nicht umgeschrieben; jede der drei Stellen bekommt einen Satz dazu: Ein
      Bereich, der kein Installations-Pin ist — heute nur der `three`-Peer des
      Canvas-Pakets — steht in einem benannten Katalog unter `catalogs:` und
      wird als `"<dep>": "catalog:<name>"` referenziert. `CLAUDE.md:83`
      beschreibt, was `makePackageJson.mjs` auflöst (`workspace:*` und
      `catalog:`); dort kommt `catalog:<name>` dazu.
  12. `Backlog.md:408` — »`three@^0.179.1` als harte Demo-Dep zieht beim `pnpm
      install` viel Volumen.« Die Version stimmt nicht mehr und die Einordnung
      »harte Dep« auch nicht. Die Zeile auf den heutigen Stand bringen: `three`
      ist Peer (`>=0.180.0`) plus devDependency des Canvas-Pakets, der Workspace
      installiert den Katalog-Pin; das Volumen beim `pnpm install` des
      Repositories bleibt davon unberührt, weil die devDependency es weiterhin
      zieht. Zeile 289 (vitest-Inventar) und Abschnitt 4.2 bleiben unangetastet
      — dieses Paket ändert keine Fallzahl.
  13. Die angefassten Dateien sind überschaubar: `package.json`,
      `pnpm-workspace.yaml`, `scripts/makePackageJson.mjs` und
      `distContract.spec.js` jeweils ganz lesen, bevor sie verlassen werden, und
      alles melden, was darin auffällt und nicht zu diesem Paket gehört.
      `pnpm-lock.yaml` ist davon ausgenommen (generiert). Für `turbo.json` ist
      nichts nachzuziehen: `globalDependencies` (Zeile 4) führt
      `pnpm-workspace.yaml` und `scripts/**` bereits, die Cache-Invalidierung
      für beide Dateien steht.
- Verify: `pnpm install --frozen-lockfile && pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`
- Commit: `build(canvas): three is a peer dependency of the canvas package`
- Ergebnis: 1 Runde · DEP-002 behoben — `three` steht im Canvas-Paket unter
  `peerDependencies` (`catalog:peer` → `>=0.180.0`) und zusätzlich unter
  `devDependencies` (`catalog:` → `^0.185.1`), nicht mehr unter `dependencies`;
  der statische Import in `src/shadow-objects.js` bleibt, der Peer ist damit
  Pflicht und kein optionaler, wie entschieden · der Bereich lebt in einem
  benannten Katalog (`catalogs.peer` in `pnpm-workspace.yaml`), weil ein
  Peer-Bereich weiter sein muss als der Installations-Pin und Versionen nur dort
  stehen dürfen; `scripts/makePackageJson.mjs` löst dafür jetzt `catalog:<name>`
  neben `catalog:` auf, `loadPnpmCatalog()` liefert `{default, named}` ·
  Regressionsnachweis am vorhandenen Anker: der Fall `the shape of
  .npm-pkg/package.json matches the recorded expectation`
  (`packages/shae-offscreen-canvas/src/distContract.spec.js`) wurde zuerst auf
  die Zielform gebracht und war rot (`expected [ 'author', 'dependencies',
  …(12) ] to deeply equal …(13)`, fehlendes `peerDependencies`), danach grün;
  zwei neue Zusicherungen halten `peerDependencyNames` und die Form des
  Bereichs (`/^>=/`, ein Peer nennt einen Boden, keinen Pin), beide vom
  Reviewer unabhängig scharf gemacht und wieder zurückgesetzt · vom Reviewer
  unabhängig nachgebaut: `.npm-pkg/package.json` trägt nach dem Build
  `"peerDependencies": {"three": ">=0.180.0"}` und nicht den Pin · Abweichung
  vom Detailplan, tragfähig und vom Reviewer bestätigt: Schritt 8 verlangte
  einen Satz im Abschnitt `### ThreeRenderView` von
  `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md` — den Abschnitt
  gibt es nicht, die Lücke ist vorbestehend und steht jetzt unter »Offene
  Befunde«; erfunden wurde nichts · Reviewer ohne `kritisch`/`wichtig`; ein
  `klein`: der Zeilenparser in `loadPnpmCatalog()` erkennt im neuen
  `catalogs:`-Zweig eine Kommentarzeile mit Doppelpunkt (`# note: foo`) als
  Eintrag — gegen die reale `pnpm-workspace.yaml` wirkungslos, und dieselbe
  Schwäche trug der Haupt-Katalog-Zweig schon vorher; keine Runde ausgelöst ·
  eigener Verify: `pnpm install --frozen-lockfile && pnpm lint:ci && pnpm
  typecheck && pnpm build && pnpm test:ci --force`, exit 0, 790 Fälle Kernpaket,
  123 Canvas-Paket, 379 Browser-Suite (alle drei unverändert), Lint 1 Info wie
  in der Baseline (Log `paket-9.verify.log`)
- Nebenbefunde: → Queue (fremde Rollenanweisung in `AGENTS.md` ·
  `ThreeRenderView` fehlt in der API-Referenz des Canvas-Pakets)
- Folgen: keine
- Schnittstellen: `@spearwolf/shae-offscreen-canvas` führt `three` nicht mehr
  unter `dependencies`, sondern als Peer mit `>=0.180.0`; ein Consumer
  installiert `three` selbst, und ein Workspace-Paket, das den Canvas-Renderer
  benutzt, braucht eine eigene Deklaration. `pnpm-workspace.yaml` hat neben
  `catalog:` einen Block `catalogs:` mit dem benannten Katalog `peer`;
  Bereiche, die kein Installations-Pin sind, werden als `"<dep>":
  "catalog:<name>"` referenziert. `scripts/makePackageJson.mjs` löst
  `catalog:<name>` auf — `loadPnpmCatalog()` gibt `{default, named}` zurück
  statt einer flachen Tabelle, wer die Funktion anfasst, arbeitet gegen diese
  Form. Die Erwartungsdatei
  `packages/shae-offscreen-canvas/src/distContract.package.json` trägt ein
  Feld `peerDependencyNames` neben `dependencyNames`.

**DEP-002 · medium · packages/shae-offscreen-canvas/package.json:57-62** — three steht als harte Runtime-Abhängigkeit im Canvas-Paket

@spearwolf/shae-offscreen-canvas führt three unter dependencies. Benutzt wird es
von zwei der fünf ausgelieferten Shadow Objects (ThreeMultiViewRenderer,
ThreeRenderView) und einem Beispiel; wer nur Canvas2D oder CanvasBitmapRenderer
einsetzt, installiert es trotzdem mit. Schwerer wiegt der zweite Teil: three ist
eine Bibliothek, von der in einem Abhängigkeitsbaum nur eine Fassung stehen darf.
Ein Consumer, der selbst three benutzt und eine andere Nebenversion auflöst,
bekommt zwei Instanzen — mit zwei Registries für WebGL-Ressourcen und
instanceof-Prüfungen, die über die Grenze hinweg falsch antworten. Der Katalog
pinnt ^0.185.1, und three erhöht bei jedem Minor die Breaking Changes; die
Wahrscheinlichkeit, dass ein Consumer auf einer anderen Nebenversion steht, ist
damit hoch. Nachgetragen in diesem Lauf: src/shadow-objects.js importiert
ThreeMultiViewRenderer statisch und nennt alle fünf Konstruktoren in einem
define-Objekt. Kein Bundler kann three deshalb herausschütteln, auch nicht bei
einem Consumer, der ausschließlich Canvas2D benutzt.

Empfehlung: three in peerDependencies verschieben (Bereich weit genug, z. B.
>=0.180) und zusätzlich unter devDependencies führen, damit Build und Tests es
weiterhin auflösen. Falls die Three-Renderer auch ohne three benutzbar bleiben
sollen, gehört der Peer als optional markiert und die Doku um den Satz ergänzt,
welche Shadow Objects ihn brauchen.

### [x] 10. Der Worker-Zweig schreibt über den `ConsoleLogger`

- Findings: CONS-011 (medium)
- Ziel: Eine Anwendung, die den Logger abschaltet, bekommt aus dem Worker keine
  Zeilen mehr; die Konfiguration, die die View hinüberschickt, wirkt für ihre
  Empfänger.
- Bereich: `packages/shadow-objects/src/worker/MessageRouter.ts`,
  `worker/WorkerRuntime.ts`, `src/shadow-objects.worker.js`
- Hängt ab von: —
- Hash: 2b121ac
- Ergebnis: 2 Runden · CONS-011 behoben, alle elf Rohkonsolen-Stellen erfasst —
  sieben Debug-Zeilen hinter `isDebug`, die Unbekannt-Nachricht hinter `isWarn`,
  die drei Fehlerberichte bewusst ungegatet wie bei `RemoteWorkerEnv`; die
  unbedingte Begrüßung des Worker-Einstiegspunkts ist entfallen und durch eine
  gegatete Quittung ersetzt, die `WorkerRuntime` beim Installieren der
  Konfiguration schreibt · Regressionstest `writes nothing to the console when
  debug logging is off`, je einmal in `MessageRouter.spec.ts` und
  `WorkerRuntime.spec.ts`, vor dem Fix rot gesehen · Runde 1 räumte einen
  Doku-Satz aus, der einen worker-seitigen Namensraum-Schalter über den Storage
  des Hosts versprach, den es dort nicht gibt; Runde 2 zog die dabei entstandenen
  Ungenauigkeiten in denselben zwei Absätzen nach · klein und stehen geblieben:
  `docs/api-reference.md:2994` schreibt beiden Klassen zu, was nur der
  `MessageRouter` vollständig tut (`WorkerRuntime` hat weder eine `warn`- noch
  eine `error`-Zeile); derselbe Absatz setzt »builds neither logger before this
  configuration message has been processed« absolut, während der Kommentar in
  `WorkerRuntime.ts:16-21` die Ausnahme sauber abgrenzt (die beiden
  Wächter-Zweige greifen davor auf `this.logger` zu); die Sicherung von
  `ConsoleLogger.sharedConfig` in beiden Spec-Dateien entfernt neu
  hinzugekommene Schlüssel nicht und schriebe ins falsche Objekt, wenn
  `loadConfig()` das Objekt ersetzte — in dieser Testumgebung unerreichbar, aber
  eine Notiz für den nächsten, der dort Fälle ergänzt
- Nebenbefunde: → Queue (3 Einträge: `ConsoleLogger.ts:135`, die drei
  `console.warn` in `in-the-dark/`, zwei überzeichnete Sätze in
  `docs/api-reference.md`)
- Folgen: keine
- Schnittstellen: Zwei neue `ConsoleLogger`-Namensräume, `WorkerRuntime` und
  `MessageRouter`. Ihr Namensraum-Schalter erreicht den Worker ausschließlich als
  Schlüssel innerhalb des JSON-Objekts unter
  `ConsoleLogger.RemoteWorkerEnv.workerConfig` und steht dort präfixlos
  (`MessageRouter.enable`), nicht über den Storage des Hosts — dasselbe gilt für
  `Kernel.enable` im Worker-Thread. `MessageRouter.logger` ist ein
  `readonly`-Feld, `WorkerRuntime.logger` ein Getter, der seinen Logger beim
  ersten Zugriff baut; beide Klassen sind nicht aus `src/index.ts` exportiert.
  **Bauregel für jedes spätere Paket:** im Worker entsteht kein `ConsoleLogger`,
  bevor die `ConsoleLogger`-Nachricht der View verarbeitet ist — wer dort einen
  Logger als Feld-Initialisierer anlegt, legt `ConsoleLogger.sharedConfig` auf
  die Voreinstellungen fest, und zwar für jeden Logger des Threads, auch die
  danach gebauten. `src/shadow-objects.worker.js` schreibt beim Laden nichts mehr
  auf die Konsole.

### [x] 11. Die Modul-URL des Workers ist als Vertrauensgrenze benannt

- Findings: SEC-003 (medium)
- Ziel: Die Doku sagt, dass der `src`-Wert ausführbarer Code ist, nicht aus
  ungeprüfter Eingabe stammen darf und im Betrieb über eine CSP-Direktive
  abgesichert wird. Siehe Entscheidung vom 2026-08-23: kein Prüfhaken im Code.
- Bereich: `packages/shadow-objects/docs/api-reference.md`, beide `README.md`
- Hängt ab von: —
- Hash: 4e677d7
- Modell: mittlere Stufe (Runde 2 auf der stärksten)
- Dateien: `packages/shadow-objects/docs/api-reference.md`, `README.md`
  (Repo-Wurzel), `packages/shadow-objects/README.md`,
  `packages/shadow-objects/CHANGELOG.md`
- Welche zwei READMEs: Repo-Wurzel und Paket-README von
  `@spearwolf/shadow-objects`. Beide zeigen `<shae-worker src="./my-logic.js">`
  in ihrem Einstiegsbeispiel (`README.md:45` und
  `packages/shadow-objects/README.md:25`) und sind die beiden Eingangstüren des
  Frameworks, dem der Mechanismus gehört. `packages/shae-offscreen-canvas/README.md`
  bleibt außen vor: eigenes Paket, eigener Doku-Vertrag.
  `packages/shae-offscreen-canvas/.npm-pkg/README.md` ist ein Build-Artefakt und
  wird nicht angefasst.
- Sachstand, gegen den geschrieben wird (am 2026-08-24 nachgesehen):
  `ShaeWorkerElement.importScript(src)` (`src/elements/ShaeWorkerElement.ts:227`)
  reicht den Wert an `envProxy.importScript(src)` weiter. Lokal landet er in
  `LocalShadowObjectEnv.importScript()` (`src/view/LocalShadowObjectEnv.ts:69-70`)
  als `await import(toUrlString(url))` im Realm des Dokuments; über die
  Worker-Grenze reist er als Configure-Nachricht und landet in
  `MessageRouter.#configure()` (`src/worker/MessageRouter.ts:117-119`) als
  dasselbe dynamische `import()` im Worker-Thread. `toUrlString()` löst gegen die
  Basis-URL des Realms auf und lässt jede Herkunft zu. Weder Element noch Proxy
  filtern; das bleibt so.
- Vorgehen:
  1. `packages/shadow-objects/docs/api-reference.md`: einen neuen Abschnitt der
     obersten Ebene `## Security` einziehen, zwischen dem Ende von
     `## Kernel (ECS System Runner)` und `## Advanced` (der `---`-Trenner vor
     `## Advanced` steht heute auf Zeile 2719). Die Trennerführung des Dokuments
     beibehalten: `---` vor und nach dem neuen Abschnitt. Darunter genau eine
     Unterüberschrift `### The Module URL is a Trust Boundary`. Sie sagt:
     - Der `src`-Wert eines `<shae-worker>` — und ebenso das Argument von
       `importScript()` auf dem Element und auf jedem Environment Proxy — ist
       eine Modul-URL, die die Shadow Environment mit einem dynamischen
       `import()` lädt und ausführt. Sie wird gegen die Basis-URL des Realms
       aufgelöst, und jede Herkunft löst auf, auch eine fremde.
     - Das geladene Modul läuft mit den vollen Rechten des Origins der
       Anwendung: gleicher Origin-Zugriff, gleiche Cookies, gleicher Storage.
       Bei `RemoteWorkerEnv` läuft es im Worker-Thread, bei
       `LocalShadowObjectEnv` im Realm des Dokuments — die Rechte sind in beiden
       Fällen die der Anwendung.
     - Das ist der Zweck des Mechanismus und kein Mangel der Umsetzung: das
       Framework lädt Anwendungslogik über eine URL, und welche URL das ist,
       entscheidet die Anwendung.
     - Daraus folgt die Regel für den Aufrufer: der Wert gehört nicht aus
       ungeprüfter Eingabe gesetzt — nicht aus einem Query-Parameter, nicht aus
       einem Feld, das ein Nutzer oder ein Fremdsystem füllt, nicht aus einer
       Antwort, der die Anwendung nicht traut. Wer das Attribut aus
       Anwendungsdaten schreibt, was bei einer Framework-Anbindung naheliegt,
       wählt damit den Code, der läuft.
     - Die Absicherung im Betrieb ist eine Content Security Policy, nicht ein
       Haken in dieser Bibliothek: `script-src` begrenzt, woher das Modul
       stammen darf — es gilt für den `import()` im Dokument ebenso wie für den
       im Worker —, und `worker-src` begrenzt, woraus der Worker selbst gebaut
       werden darf. Ein Beispiel als Codeblock, mit einem Satz dazu, warum
       `blob:` darin steht: `Content-Security-Policy: script-src 'self';
       worker-src 'self' blob:` — die gebündelte Auslieferung des Pakets baut
       ihren Worker aus einem eingebetteten `blob:`-URL, die unbündelte aus
       `./shadow-objects.worker.js` neben dem Modul.
     - Ein Satz, der die API-Lage benennt: Element und Proxy prüfen die URL
       nicht und bieten keinen Haken, an dem eine Anwendung zulässige Herkünfte
       eintragen könnte; die Begrenzung gehört in die CSP und in den Code, der
       den Wert setzt.
  2. Dieselbe Datei, Sprungmarken: in der Liste »Quick navigation« am Kopf
     `- [Security](#security)` zwischen `- [Kernel (ECS System Runner)](#kernel-ecs-system-runner)`
     und `- [Advanced](#advanced)` einfügen, mit der eingerückten Unterzeile
     `- [The Module URL is a Trust Boundary](#the-module-url-is-a-trust-boundary)`
     in der Machart der übrigen Untereinträge.
  3. Dieselbe Datei, drei Querverweise, je ein angehängter Satz, je in einer
     Zeile (es sind Tabellenzellen):
     - die `src`-Zeile der Attributtabelle von `<shae-worker>` (heute Zeile 1676),
     - die `importScript(src)`-Zeile der JavaScript-API-Tabelle von
       `<shae-worker>` (heute Zeile 1746),
     - der `importScript(url)`-Eintrag in `## Environment Proxies` (Stelle im
       Abschnitt ab Zeile 1397 suchen; er steht dort für
       `IShadowObjectEnvProxy`, `LocalShadowObjectEnv` und `RemoteWorkerEnv` —
       ein Verweis genügt, an der Stelle, die die Methode beschreibt).
     Der Satz nennt die URL als ausführbaren Code und verweist mit
     `[Security](#security)`. Nicht in allen dreien derselbe Wortlaut.
  4. `README.md` (Repo-Wurzel): ein Abschnitt `## Security` zwischen
     `## Invariants` und `## Documentation`, mit den `---`-Trennern der Datei.
     Vier bis sechs Sätze mit derselben Substanz wie Schritt 1, plus den
     CSP-Codeblock, plus einen Verweis auf
     `packages/shadow-objects/docs/api-reference.md#security` in der Verlinkungsart
     der Datei (relative Pfade, wie in der Dokumentationstabelle darunter).
  5. `packages/shadow-objects/README.md`: ein Abschnitt `## Security` zwischen
     `## The Five Domains` und `## Documentation`. Kürzer als der Wurzel-README —
     drei bis vier Sätze, der CSP-Codeblock, und der Verweis auf
     `./docs/api-reference.md#security` für die ausführliche Fassung.
  6. `packages/shadow-objects/CHANGELOG.md`: genau ein Aufzählungspunkt unter
     `## [Unreleased]` → `### Internal`, in der Reihe der `**Docs (…)**`-Punkte,
     alphabetisch zwischen `**Docs (reference):**` und `**Docs (terminology):**`.
     Form: `- **Docs (security):** …`. Er nennt den neuen Abschnitt der
     API-Referenz, die beiden READMEs und die Regel in einem Satz. Kein Rückblick
     auf den Vorzustand, keine Finding-Nummer.
  7. Nichts im `CHANGELOG.md` der Repo-Wurzel: das ist für Build, Testrunner,
     Lint, turbo/pnpm und devDeps reserviert, und hier ändert sich davon nichts.
     Kein TODO-Kommentar angefasst, also kein `pnpm make:todo`. `AGENTS.md` auf
     Veralterung prüfen und das Ergebnis melden — nur ändern, wenn eine Zeile
     dort durch diese Änderung tatsächlich falsch wird.
  8. Konventionen, die hier scharf sind: alles in Englisch; kein Rückblick auf
     den Vorzustand (kein »previously«, »now«, »used to«, »as of this release«);
     keine der verbotenen Analogien (»shadow theater«, »puppet«, »puppeteer«,
     »light world«, »screen«) — ECS-Begriffe verwenden: Entity, Shadow Object,
     Shadow Environment, Kernel, View, Token, `ComponentContext`; und keine
     Vermischung von `ComponentContext` mit dem Entity Context. Kein Prüfhaken,
     keine neue öffentliche API, keine Behauptung, das Framework validiere
     irgendetwas — es tut es nicht und soll es nicht.
- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci --force`
- Commit: `docs: name the worker module url as a trust boundary` — `git log`
  dieses Projekts vergibt Doku-Scopes nach Subsystem oder Dokument (`docs(api)`,
  `docs(api-reference)`, `docs(view)`, `docs(elements)`, `docs(changelog)`), nie
  nach Paketnamen; die Änderung fasst drei Dokumente an, also bleibt der Scope
  weg
- Ergebnis: 2 Runden · SEC-003 behoben — neuer Abschnitt `## Security` /
  `### The Module URL is a Trust Boundary` in
  `packages/shadow-objects/docs/api-reference.md`, Kurzfassungen in `README.md`
  und `packages/shadow-objects/README.md`, drei Querverweise und ein
  Inhaltsverzeichnis-Eintrag in derselben Referenz, ein `**Docs (security):**`-Punkt
  im CHANGELOG des Kernpakets · kein Regressionstest, weil kein Verhalten im Code
  geändert wurde: die Entscheidung vom 2026-08-23 verlangt Doku ohne Prüfhaken,
  und der Diff fasst ausschließlich Markdown an · Runde 1 räumte eine CSP-Aussage
  aus, die dem Leser Schutz versprach, den die gezeigte Konfiguration nur für den
  eingebetteten `blob:`-Worker liefert; Runde 2 ersetzte die dabei eingeführten
  Wörter »bundled/unbundled distribution«, die nirgends sonst in der Doku
  vorkommen und den Leser in die schwächere Konfiguration gelenkt hätten, durch
  die Einstiegspunkte des `exports`-Feldes · klein und stehen geblieben: »every
  other entry point« (`api-reference.md:2738`, `README.md:239`,
  `packages/shadow-objects/README.md:110`) fasst zehn `exports`-Einträge, von
  denen nur vier überhaupt einen Worker bauen — »every entry point that creates a
  worker« räumte es aus; »nothing the document declares reaches it«
  (`api-reference.md:2738`) lässt sich statt auf das `import()` auch auf den
  Worker lesen, dessen Ladbarkeit das `worker-src` des Dokuments sehr wohl
  entscheidet; und derselbe Absatz beantwortet »welche Response trägt den Header«
  allein über den Einstiegspunkt, obwohl im `local`-Modus gar kein Worker
  entsteht und allein `script-src` des Dokuments trägt — unvollständig, nicht
  falsch, und die Modus-Unterscheidung steht zwei Absätze darüber
- Nebenbefunde: → Queue (2 Einträge, beide in `README.md`: falscher Paketpfad
  `packages/shadow-offscreen-canvas/` in `:95`, veraltete Node/pnpm-Angabe in
  `:289`)
- Folgen: keine
- Schnittstellen: Keine Code-Oberfläche berührt. Für die Doku gilt: die
  Überschriften `## Security` und `### The Module URL is a Trust Boundary` in
  `packages/shadow-objects/docs/api-reference.md` tragen die Anker `#security`
  und `#the-module-url-is-a-trust-boundary`; darauf zeigen der
  Inhaltsverzeichnis-Eintrag derselben Datei, drei Querverweise in ihr sowie je
  ein Link aus `README.md` und `packages/shadow-objects/README.md`. Wer eine der
  beiden Überschriften umbenennt, zieht sechs Verweise mit.

**SEC-003 · medium · packages/shadow-objects/src/worker/MessageRouter.ts:103, view/LocalShadowObjectEnv.ts:70, elements/ShaeWorkerElement.ts:235-237** — Die Modul-URL des Workers ist unbeschränkt und nirgends als Vertrauensgrenze benannt

Der Wert des src-Attributs eines shae-worker wandert unverändert als
Configure-Nachricht in den Worker und landet dort in einem dynamischen import().
toUrlString() löst gegen die Basis-URL des Realms auf und lässt jede Herkunft zu,
auch eine fremde. Wer das Attribut aus Anwendungsdaten schreibt, was bei jeder
Framework-Anbindung naheliegt, führt fremden Code im Origin der Anwendung aus.
Das ist der Zweck des Mechanismus und kein Fehler in der Implementierung. Es
fehlt aber jede Stelle, die es sagt: die Dokumentation kennt keinen
Sicherheitsabschnitt, api-reference.md erwähnt Vertrauen nur für den
Logger-Konfigurationsschlüssel, und weder Element noch Proxy bieten einen Haken,
an dem eine Anwendung die zulässigen Herkünfte einschränken könnte.

Empfehlung: Ein kurzer Abschnitt in docs/api-reference.md und in beiden READMEs:
der src-Wert ist ausführbarer Code, er gehört nicht aus ungeprüfter Eingabe
gesetzt, und die Absicherung im Betrieb ist eine script-src- beziehungsweise
worker-src-Direktive der Content Security Policy. Wer mehr will, bekommt eine
optionale Prüffunktion an RemoteWorkerEnv, die eine URL vor dem Absenden
ablehnen darf. — Der zweite Satz ist durch die Entscheidung vom 2026-08-23
erledigt: kein Prüfhaken, nur Doku.
