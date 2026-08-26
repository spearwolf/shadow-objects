# Remediation-Plan — shadow-objects

Quelle: ./audit.html vom 2026-08-24 · Branch: main · erstellt: 2026-08-24
Baseline (2026-08-24, auf `92d3c14` selbst gefahren): `pnpm lint` ✓ (1 info:
Biome-Config-Migrationshinweis, vorbestehend) · `pnpm lint:ci` ✓ ·
`pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test:ci --force` ✓ 1295 Fälle
(793 shadow-objects, 123 shae-offscreen-canvas, 379 shadow-objects-testing) ·
`pnpm -F shadow-objects-e2e test` ✓ 430 Fälle (Chromium und Firefox)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/9917ee15-7f97-4f24-903f-e2d5ef1ec647/scratchpad
(Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 8 von 80 Findings (0 critical, 0 high, 0 medium, 5 low, 3 info) · vom
Nutzer benannt: CONS-001, CONS-017, CONS-018, CONS-019, BUG-027, DX-017 · vom
Orchestrator vorgeschlagen und freigegeben: CONS-008, DX-002 · `acknowledged`
ist leer
Scope-Regel: alles, was den ConsoleLogger, seine Konfiguration oder rohe
`console.*`-Aufrufe betrifft — gilt auch für Befunde, die erst im Lauf
auffallen. Alles andere geht als neues Finding ins Audit.
Stand (2026-08-26, abgeschlossen): Der Lauf ist durch. Alle fünf Pakete sind
committet — Paket 1 (`bdabe1f`), Paket 2 (`f5bcc23`), Paket 3 (`9c3abb7`),
Paket 4 (`b96ff80`), Paket 5 (`4d145b4`) —, kein Paket blieb blockiert, und
»Offene Befunde« ist leer: alle vier Einträge sind als neue Findings in
`./audit.html` eingetragen. Der Abschluss-Verify lief auf dem Stand, der
übergeben wird: `pnpm lint` ✓ (1 vorbestehender Info-Hinweis), `pnpm lint:ci` ✓,
`pnpm typecheck` ✓, `pnpm build` ✓, `pnpm test:ci --force` ✓ 1303 Fälle,
`pnpm -F shadow-objects-e2e test` ✓ 430 Fälle in zwei Browsern — gegen die
Baseline gehalten, nichts ist rot geworden, was grün war. Keine
Versionsanhebung: dieses Projekt hebt Versionen in eigenen Release-Commits,
die Paket-CHANGELOGs führen den Stand unter `## [Unreleased]` und weisen die
nächste Freigabe bereits als minor aus. `./audit.html` steht nach dem Lauf auf
81,5 (vorher 79,5), 76 offene Findings, acht geschlossen, vier neu.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

**Diese Datei ist in diesem Repository getrackt** — die drei Vorläufe haben sie
je mit ihrem Abschluss-Commit fortgeschrieben, statt sie aus dem Arbeitsbaum zu
räumen. Sie ist damit die einzige Änderung, die beim Start des Laufs neben
`HEAD` steht. Sie gehört in **keinen** Paket-Commit: jedes Paket committet
ausschließlich die Dateien, die es selbst angefasst hat. Ins Repo kommt sie
erst mit dem Abschluss-Commit.

Der Vorlauf desselben Skills (Scope: ab medium) ist mit `7340233` abgeschlossen;
sein Plan steht in der Historie dieser Datei.

## Entscheidungen
- CONS-008 und DX-002 werden mitgenommen, obwohl der Nutzer sie nicht benannt
  hat: CONS-008 ist dieselbe Zeichenketten-Asymmetrie wie CONS-018 an der
  Nachbarstrecke, und CONS-018s Empfehlung verweist auf sie als Vorbild, das es
  ohne diesen Fix gar nicht gäbe; DX-002 ist die sichtbarste Stelle, an der ein
  publiziertes Paket am ConsoleLogger vorbei druckt (2026-08-24)
- Für neu auffallende Befunde gilt die Scope-Regel oben: Logging-Themen werden
  in diesem Lauf mit behoben, alles andere geht ins Audit (2026-08-24)
- CONS-019, Stufenwahl nach Adressat: Deprecation-Warnung und abgelehnter
  zweiter `compare` gehen über `logger.error`, weil beide einen Fehler im Code
  des Consumers melden und ihn auch außerhalb von localhost erreichen müssen —
  `ConsoleLogger.sharedConfig.enable` ist dort aus. Die übersprungene
  Doppel-Einfuhr eines Moduls geht über gegatetes `logger.warn`: sie zählt nur
  in der Entwicklung. Die Wahl steht als Kommentar neben jeder der drei Zeilen
  (2026-08-24)
- CONS-001: die Merkliste der Deprecation-Warnungen wandert an den Kernel. Die
  Warnung fällt damit einmal je Kernel statt einmal je Realm; die
  Reihenfolgeabhängigkeit von `ShadowObjectCreationScope.spec.ts` wird im selben
  Paket aufgelöst (2026-08-24)
- BUG-027, Weg 1 der beiden Empfehlungen: `setConsoleLoggerStorage()` schreibt
  die vorhandene `sharedConfig` mit, statt `loadConfig()` bei jedem Zugriff den
  Slot lesen zu lassen. Kostet nichts je Logzeile. Der Umbau bleibt auf den
  Zweig ohne `localStorage` beschränkt — im Hauptthread gewinnt weiterhin die
  echte Storage, und das Verhalten dort ändert sich nicht (2026-08-24)
- CONS-018 und CONS-008, Wire-Format: `error` bleibt eine Zeichenkette und
  trägt künftig die Nachricht ohne den Klassennamen davor, ein neues optionales
  `errorName` trägt den Namen. Kein verschachteltes Objekt: eine Gegenstelle
  alter Bauart bleibt auf beiden Seiten lesbar, und die öffentlichen Wire-Typen
  bekommen keine Union (2026-08-24)
- CONS-018 und CONS-008, Fehlerklasse: die View baut einen neuen, exportierten
  `WorkerReportedError`, dessen `name` der im Worker gemeldete Name ist. Damit
  prüft ein Aufrufer `err.name` wie bei einem lokalen Fehler und `instanceof
  WorkerReportedError`, wenn er wissen will, ob der Grund über die Worker-Grenze
  kam. Ein eigenes Feld für den Namen wäre genau die Asymmetrie, gegen die dieses
  Paket antritt (2026-08-24)
- CONS-008, Grenze der Symmetrie: übertragen werden nur Name und Nachricht. Die
  View rekonstruiert keine bibliothekseigenen Fehlerklassen — `instanceof
  EntityUuidInUseError` bleibt drüben falsch und `uuid` bleibt weg. Der Gegenweg
  bräuchte je Fehlerklasse ein eigenes Wire-Feld und behandelte einen Fehler aus
  Consumer-Code schlechter als einen der Bibliothek; die Grenze steht dafür in
  der API-Referenz (2026-08-24)
- Der JSDoc über `missingShadowObjectsExportMessage`
  (`src/in-the-dark/importModule.ts`) wird mitgezogen, obwohl beide Halbsätze
  buchstäblich wahr bleiben: der Kontrast, den er zwischen der Worker-Strecke
  und `LocalShadowObjectEnv` aufmacht, ist genau die Asymmetrie, die Paket 2
  beseitigt, und ein Leser nimmt ihn sonst weiterhin für einen Unterschied
  (2026-08-25, vom Nutzer bestätigt)
- Die Restlücke von Weg 1 wird dokumentiert, nicht geschlossen: das
  instanzeigene `enable` liest ein Logger einmal beim Bau, eine später
  eintreffende Config legt es nicht mehr um. Betroffen ist allein ein Logger,
  den ein fremder Host über eine unlesbare Nachricht vor der
  Konfigurationsnachricht bauen lässt — die geteilten Schalter erreicht die
  späte Config sehr wohl. Die API-Referenz sagt das in Paket 1 ausdrücklich;
  kein eigener Befund, kein weiteres Paket (2026-08-24)
- CONS-018 und CONS-008, Form von `WorkerReportedError`: ein Konstrukt statt
  zweier. Die Klasse nimmt `(name, message)` — die Reihenfolge, die
  `WorkerFailedError` in derselben Datei vorgibt —, und der Vorgabewert `Error`
  für einen fehlenden Namen steht in ihrem Konstruktor. Die im Vorentwurf
  daneben vorgesehene Hilfsfunktion `workerReportedError(message, name)`
  entfällt: zwei Konstrukte mit gespiegelten Parametern in einer Datei sind eine
  Falle, und die Klasse wird exportiert, ihre Reihenfolge steht also dauerhaft
  im Vertrag (2026-08-25, vom Nutzer bestätigt)
- CONS-018 und CONS-008, Lautstärke der Wire-Format-Änderung: dass `error`
  künftig den Wortlaut ohne den Klassennamen davor trägt, wird ausschließlich im
  `### New`-Eintrag zum Nachrichtenprotokoll angesagt, nicht zusätzlich unter
  `### ⚠️ Breaking Changes`. Der Vorspann von `## [Unreleased]` bekommt dafür
  keine eigene Zählposition und steht nach diesem Paket auf »Fifty-two«. Was
  einen gewöhnlichen Consumer trifft, steht im Breaking-Eintrag über
  `WorkerReportedError`; die Leitung zwischen `MessageRouter` und
  `RemoteWorkerEnv` ist Transport und keine Anwendungs-API. Kein Implementierer
  hängt hier einen weiteren Breaking-Eintrag an (2026-08-25)

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

Dazu, aus `AGENTS.md` und `CLAUDE.md` dieses Projekts:
- Code, Kommentare und Doku ausschließlich auf Englisch, Doku in Markdown.
- Verbotene Analogien: »shadow theater«, »puppet«, »puppeteer«, »light world«,
  »screen«. Es gilt die ECS-Terminologie (Entity, Component, Kernel, View,
  Token) und die Tabelle der bindenden Begriffe in `AGENTS.md` §4.
- Jede Änderung der öffentlichen API zieht `docs/`, `README.md` und
  `CHANGELOG.md` **desselben** Pakets nach, im selben Commit. Monorepo-Themen
  gehen ins `CHANGELOG.md` der Wurzel, Paket-Themen in das des Pakets. Neue
  Arbeit steht unter `## [Unreleased]`.
- Dependency-Versionen stehen ausschließlich im `catalog:` von
  `pnpm-workspace.yaml`, referenziert als `"<dep>": "catalog:"`.
- Ändert ein Paket eine `TODO`-Kommentarzeile, läuft `pnpm make:todo`.
- Ändert ein Paket die Form von `dist/` oder `.npm-pkg/`, werden die
  Erwartungsdateien der `distContract`-Specs im selben Commit nachgezogen.
- Nach Änderungen an Quelltext oder Doku wird `AGENTS.md` auf Veralterung
  geprüft.
- Lint und Format sind Biome. Vor jedem Commit läuft `pnpm lint:ci` mit, nicht
  nur `pnpm lint` — nur ersteres bricht bei Warnungen ab.

## Vorbestehende Fehler
- `pnpm lint` meldet 1 info (Hinweis, dass `biome migrate` für die
  Konfiguration ansteht). Vor Lauf-Beginn vorhanden, kein Teil des Scopes,
  blockiert keinen Commit — `pnpm lint:ci` läuft trotzdem grün durch.

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

- [x] `packages/shadow-objects/src/worker/MessageRouter.ts`, die `catch`-Blöcke
  von `#configure()` und `#onChangeTrail()` — beide machen aus dem gefangenen
  Wert eine Zeichenkette, und sie tun es innerhalb des `catch`. Wirft die
  `toString()` des geworfenen Werts ihrerseits — ein Shadow Object, das ein
  Objekt mit werfendem `toString` wirft —, verlässt die Ausnahme den `catch`, der
  Router meldet gar nichts, und die View wartet ihr `configureTimeout` bzw.
  `changeTrailTimeout` aus, statt den Grund zu erfahren. Vorbestehend, in
  `92d3c14` unverändert vorhanden. Aus Paket 2. Severity low. → Audit
  · Fundstelle nach Paket 2 (`f5bcc23`): die Umwandlung ist in die
  Hilfsfunktion `describeError()` derselben Datei gezogen, Zeile 39–42, die aus
  beiden `catch`-Blöcken heraus aufgerufen wird. Die Tür ist schmaler — ein
  `Error` liefert seine `message`, ohne `toString()` anzufassen —, sie bleibt
  aber offen: für einen geworfenen Wert, der kein `Error` ist, ruft
  `String(error)` in Zeile 42 weiterhin dessen `toString()` innerhalb des
  `catch`. Wer den Befund ins Audit überträgt, nennt diese Zeile
  · **erledigt 2026-08-26:** als BUG-028 (low) in `./audit.html` eingetragen,
  mit Fundstelle und dem Vermerk, dass der Befund in diesem Lauf auffiel
- [x] `packages/shadow-objects/docs/api-reference.md:1228-1229` — die Aufzählung
  der Gründe, die nichts darüber sagen, wie weit der Kernel kam, nennt das
  abgelaufene Bestätigungsfenster, den `WorkerDestroyedError` und den fremden
  Proxy, aber nicht die Bestätigung, die einen Grund ohne `appliedCount` trägt.
  Auch dieser Fall lässt den ganzen Trail als angewandt gelten. Vorbestehend, in
  `92d3c14` mit derselben Lücke nachgeprüft. Aus Paket 2. Severity info. → Audit
  · die Methodentabelle in Zeile 1523 nennt den Fall seit Paket 2 ausdrücklich,
  der Absatz darüber nicht
  · **erledigt 2026-08-26:** als DX-020 (info) in `./audit.html` eingetragen,
  mit Fundstelle und dem Vermerk, dass der Befund in diesem Lauf auffiel
- [x] `Backlog.md:314` — die Zeile beziffert `MessageRouter.spec.ts` mit 31
  Fällen; die Datei führt auf `f5bcc23` bereits 33 und nach Paket 3 deren 34.
  Vorbestehend (die Lücke von zwei Fällen stand schon vor dem ersten Commit
  dieses Laufs), Paket 3 vergrößert sie um den einen neuen Fall. Aus Paket 3.
  Severity info. → Audit
  · **erledigt 2026-08-26:** als DX-021 (info) in `./audit.html` eingetragen,
  mit Fundstelle und dem Vermerk, dass der Befund in diesem Lauf auffiel
- [x] `Backlog.md:213` — die Dateispalte des Eintrags KERN-7 nennt allein
  `Kernel.ts`, obwohl `useContext`, `useParentContext` und `useProperty` samt
  der Meldung über den abgelehnten zweiten `compare` in
  `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts` sitzen.
  Der Logger des Kernels trägt die Ausgabe tatsächlich, die Fundstelle stimmt
  nicht. Vorbestehend, in `92d3c14` mit derselben Spalte. Aus Paket 3.
  Severity info. → Audit
  · **erledigt 2026-08-26:** als DX-022 (info) in `./audit.html` eingetragen,
  mit Fundstelle und dem Vermerk, dass der Befund in diesem Lauf auffiel

## Pakete

### [x] 1. Die Logger-Konfiguration erreicht auch den späten Aufrufer
- Findings: BUG-027 (low), DX-017 (info)
- Ziel: `setConsoleLoggerStorage()` wirkt unabhängig davon, ob im Thread schon
  ein Logger gebaut wurde, und die API-Referenz beschreibt genau die Kontrolle,
  die der Namensraum-Schalter tatsächlich hat.
- Bereich: `packages/shadow-objects/src/utils/ConsoleLogger.ts` samt Spec,
  `packages/shadow-objects/docs/api-reference.md`, `CHANGELOG.md` des Pakets
- Hängt ab von: —
- Hash: bdabe1f
- Modell: mittlere Stufe
- Effort: medium
- Dateien:
  - `packages/shadow-objects/src/utils/ConsoleLogger.storage.spec.ts`
  - `packages/shadow-objects/src/utils/ConsoleLogger.ts`
  - `packages/shadow-objects/src/worker/WorkerRuntime.ts` (nur der JSDoc-Block
    über `get logger()`)
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:

  1. **Regressionstest zuerst, und rot sehen.** Er gehört in
     `src/utils/ConsoleLogger.storage.spec.ts` und nirgendwo sonst: die
     Vitest-Umgebung stellt über `vitest.setup.ts` eine funktionierende Storage
     bereit, `HAS_LOCAL_STORAGE` ist dort also `true` und der Fallback-Zweig
     wird gar nicht betreten. Nur das vorhandene
     `importWithLocalStorage({value: {}})` samt `vi.resetModules()` liefert eine
     frische Modulinstanz ohne nutzbare Storage — den Zustand eines Workers.

     Die statische Importzeile 2 der Spec um den Typ erweitern:

     ```ts
     import {CONSOLE_LOGGER, CONSOLE_LOGGER_STORAGE, type ConsoleLoggerConfig} from './ConsoleLogger.js';
     ```

     Zwei Fälle ans Ende des `describe`-Blocks. Der erste ist der
     Regressionstest, der zweite hält die Reihenfolge fest, die ein Worker
     tatsächlich fährt (Config zuerst, Logger danach) und ist schon heute grün:

     ```ts
     it('reaches the loggers of a thread that already built one', async () => {
       const {ConsoleLogger, setConsoleLoggerStorage} = await importWithLocalStorage({value: {}});

       new ConsoleLogger('early-namespace');

       const forwarded: ConsoleLoggerConfig = {
         enable: true,
         debug: true,
         info: true,
         warn: true,
         'styles.debug': ConsoleLogger.sharedStyles.debug,
         'styles.info': ConsoleLogger.sharedStyles.info,
         'styles.warn': ConsoleLogger.sharedStyles.warn,
         'styles.error': ConsoleLogger.sharedStyles.error,
         'late-namespace.enable': false,
       };

       setConsoleLoggerStorage(forwarded);

       expect(ConsoleLogger.sharedConfig.debug, 'the shared config takes the installed value').toBe(true);
       expect(ConsoleLogger.isDebug, 'and the loggers of the thread read it').toBe(true);
       expect(new ConsoleLogger('late-namespace').enable, 'a per-namespace key stays readable').toBe(false);
     });

     it('takes a config installed before the first logger of the thread', async () => {
       const {ConsoleLogger, setConsoleLoggerStorage} = await importWithLocalStorage({value: {}});

       const forwarded: ConsoleLoggerConfig = {
         enable: true,
         debug: true,
         info: true,
         warn: true,
         'styles.debug': ConsoleLogger.sharedStyles.debug,
         'styles.info': ConsoleLogger.sharedStyles.info,
         'styles.warn': ConsoleLogger.sharedStyles.warn,
         'styles.error': ConsoleLogger.sharedStyles.error,
         'early-namespace.enable': false,
       };

       setConsoleLoggerStorage(forwarded);

       expect(new ConsoleLogger('early-namespace').enable, 'the per-namespace key is read on construction').toBe(false);
       expect(ConsoleLogger.sharedConfig.debug, 'the installed value survives the merge').toBe(true);
     });
     ```

     Das Objekt trägt bewusst keinen Symbol-Schlüssel: was über
     `postMessage` kommt, hat den Structured Clone hinter sich, und der lässt
     Symbole fallen.

     Roten Lauf so erzeugen und die Ausgabe in den Report übernehmen — die
     ersten beiden Erwartungen des ersten Falls müssen fehlschlagen
     (`debug` ist `false`), die dritte und der zweite Fall sind grün:

     ```
     pnpm -F @spearwolf/shadow-objects exec vitest --run src/utils/ConsoleLogger.storage.spec.ts
     ```

  2. **`setConsoleLoggerStorage()` in `src/utils/ConsoleLogger.ts`** — der
     ganze Block Zeile 130–137 (JSDoc und Funktion) wird durch diesen ersetzt:

     ```ts
     /**
      * Installs a config object as the fallback store, bypassing the storage probe. `WorkerRuntime`
      * calls this with the config a `RemoteWorkerEnv` forwards from the main thread, where there is no
      * `localStorage` to probe in the first place.
      *
      * Once a logger exists in such a thread, `ConsoleLogger.sharedConfig` *is* that store, and the
      * values are written into it rather than a fresh object taking its place in the slot: the shared
      * switches reach every logger of the thread, the ones already built included. One flag stays
      * behind -- a logger reads its own `<namespace>.enable` key when it is built, and a config that
      * arrives afterwards no longer moves it.
      */
     export function setConsoleLoggerStorage(config: ConsoleLoggerConfig): void {
       const store = gGlobalSlots.ConsoleLoggerStorage;
       if (store != null && store === ConsoleLogger.sharedConfig) {
         // the marker travels with the merge: it says this object is the live config, and a config
         // that crossed a worker boundary carries no symbol key to say so for itself
         Object.assign(store, config, {[ConsoleLogger$]: true});
         return;
       }
       gGlobalSlots.ConsoleLoggerStorage = config;
     }
     ```

     Die Identitätsprüfung ist die Bedingung, auf die es ankommt, und sie hält
     die Änderung auf den Zweig ohne `localStorage` fest: nur dort setzt
     `loadConfig()` `sharedConfig` auf den Slot. Im Hauptthread mit echter
     Storage ist sie nie wahr, dort bleibt es beim Zuweisen. Der Vorgriff auf
     `ConsoleLogger` aus einer Funktion, die über der Klasse steht, ist geprüft
     und compiliert unter `tsc --strict`.

  3. **`src/worker/WorkerRuntime.ts`** — der JSDoc-Block über `get logger()`
     (Zeile 10–22) behauptet eine Folge, die es nach Schritt 2 nicht mehr gibt.
     Der lazy Bau bleibt, seine Begründung schrumpft auf das, was trägt:

     ```ts
     /**
      * Built on first use rather than in a field initializer: a `ConsoleLogger` reads its own
      * `<namespace>.enable` key once, when it is built, and in a worker the config that key lives in
      * arrives as a message. A logger built ahead of that message keeps the default for its own switch
      * for the rest of the thread; the shared switches reach it either way.
      *
      * The window is narrow: the two guard branches of `onmessage` that discard a message it cannot
      * read or a message that arrived after the teardown reach for this logger ahead of the
      * `CONSOLE_LOGGER` branch below them. A `RemoteWorkerEnv` cannot trigger either guard before its
      * configuration arrives -- it sends that message first -- but a foreign host driving this entry
      * point on its own could send something unreadable ahead of it.
      */
     ```

  4. **`docs/api-reference.md`, Abschnitt »Console Logger«.** Vier Stellen,
     alle im Block Zeile 3015–3023:

     a. Direkt unter den Absatz »**The getters are the caller's job.** …«
        (Zeile 3015) diese Tabelle setzen — sie ist die Stelle, auf die sich
        alles Weitere beruft:

        ```markdown
        | Call | Ask first | What that getter combines |
        | :--- | :--- | :--- |
        | `logger.debug(...)` | `isDebug` | instance `enable` · `sharedConfig.enable` · `sharedConfig.debug` |
        | `logger.info(...)` | `isInfo` | instance `enable` · `sharedConfig.enable` · `sharedConfig.info` |
        | `logger.warn(...)` | `isWarn` | instance `enable` · `sharedConfig.enable` · `sharedConfig.warn` |
        | `logger.error(...)` | — | nothing: there is no getter for an error report, and this library gates none |
        ```

     b. Zeile 3019, der Satz über `setConsoleLoggerStorage()`: hinter »…where
        there is no `localStorage` to probe in the first place« ergänzen, dass
        die installierten Werte auch die Logger erreichen, die in diesem Thread
        schon gebaut sind.

     c. Zeile 3021, erster Satz. »`ConsoleLogger.<namespace>.enable` turns a
        single logger off on its own, independent of the four shared switches
        above« gilt so nicht: die Klasse druckt jede Stufe ungefragt, gegated
        wird beim Aufrufer über die Getter. Der Satz sagt künftig, dass der
        Schlüssel das Instanz-Flag der Tabelle ist — er nimmt `isDebug`,
        `isInfo` und `isWarn` eines einzelnen Loggers auf `false`, was die
        geteilten Schalter auch sagen, und erreicht nichts, was ohne Frage
        druckt, die Fehlermeldungen dieser Bibliothek eingeschlossen. Der Rest
        des Absatzes (einmal gelesen, nie geschrieben, kein Handle dafür,
        Worker-Thread ohne eigene Storage) bleibt wie er ist.

     d. Zeile 3023, zwei Stellen im selben Absatz:
        - »the key is named once through `remoteEnv.logger.warn`, which is not
          gated behind `ConsoleLogger.sharedConfig.enable`« fasst zu eng:
          `logger.warn()` fragt gar keinen Getter, hängt also an keinem
          Schalter, auch nicht am Namensraum-Schalter. Entsprechend
          umformulieren.
        - »The worker builds neither logger before this configuration message
          has been processed -- a logger built ahead of it would read the
          defaults on construction and pin them for the whole thread, the
          loggers built after it included.« Nach Schritt 2 friert nichts mehr
          ein. Der Satz sagt künftig: die geteilten Schalter eines Threads
          nehmen eine später eintreffende Config an, das eigene
          `<namespace>.enable` eines Loggers wird einmal beim Bau gelesen — wer
          vor der Nachricht gebaut wird, behält dort den Vorgabewert. Das ist
          die dokumentierte Restlücke aus »Entscheidungen«, und dies ist die
          einzige Stelle, an der sie steht.

     Sonst nichts an dieser Datei. Die Aussagen in Zeile 1712, 2245, 2372 und
     2403 beschreiben einzelne Aufrufstellen und stimmen weiterhin; ebenso
     `docs/cheat-sheet.md:334`. `README.md` des Pakets nennt den Logger nicht.

  5. **`packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`.** Zwei
     Einträge, jeder als letzter Punkt seines Abschnitts:

     - unter `### Bugfixes` (endet vor `### Types`): dass
       `setConsoleLoggerStorage()` die Logger eines Threads erreicht, in dem
       schon einer gebaut wurde. Nennen: dass `ConsoleLogger.sharedConfig` dort,
       wo keine nutzbare Storage gefunden wurde, dasselbe Objekt ist wie
       `globalThis.ConsoleLoggerStorage`, und dass ein Worker, dessen
       `WorkerRuntime`-Logger von einer der beiden Guard-Verzweigungen vor der
       Konfigurationsnachricht gebaut wurde, für den Rest des Threads auf den
       Vorgabewerten stand. Dazu der Satz, dass das instanzeigene
       `<namespace>.enable` weiterhin einmal beim Bau gelesen wird.
     - unter `### Internal` im Genre der dortigen `**Docs (correctness):**`
       -Einträge: die Tabelle Stufe gegen Schalter und die beiden Sätze, die
       jetzt sagen, was gilt.

     Die Zählung im Vorspann von `## [Unreleased]` (»Fifty-one changes reach
     existing consumers«) bleibt unberührt: der Fix repariert einen Pfad, der
     nicht trug, und bricht für niemanden etwas.

  6. **`AGENTS.md`** auf Veralterung prüfen: der ConsoleLogger kommt dort nicht
     vor, es ist also nichts nachzuziehen. Kein `TODO` berührt, keine Datei
     unter `dist/` kommt hinzu oder fällt weg — die `distContract`-Erwartungen
     bleiben, wie sie sind.

- Verify: `pnpm run ci` (baut, typprüft, fährt alle Tests außer den
  Playwright-E2E und schließt mit `pnpm lint:ci`). Erwartung gegen die Baseline:
  1297 statt 1295 Fälle, `pnpm lint` weiterhin mit dem einen vorbestehenden
  Info-Hinweis. Die E2E-Suite bleibt außen vor: das Paket ändert an keiner
  Stelle etwas, das ein Browser-Test beobachtet — die Fallback-Config trägt nur
  Diagnose-Schalter.
- Commit: `fix(logging): a late console-logger config reaches the loggers already built`
- Ergebnis: 1 Runde · BUG-027 behoben (`ConsoleLogger.ts:141-150`, die
  Identitätsprüfung greift nur im Zweig ohne nutzbare Storage) · DX-017 behoben
  (`docs/api-reference.md`, Tabelle Stufe gegen Schalter plus drei
  eingeschränkte Sätze) · Regressionstest
  `reaches the loggers of a thread that already built one` (vor dem Fix rot,
  `expected false to be true` auf `sharedConfig.debug`) · Verify `pnpm run ci`
  exit 0, 1297 Fälle (795 + 123 + 379), ein vorbestehender Info-Hinweis · kein
  Befund des Reviewers in keiner Kategorie
- Nebenbefunde: —
- Folgen: —
- Schnittstellen: `setConsoleLoggerStorage(config)` unverändert in Signatur und
  Verhalten im Zweig mit `localStorage`; im Zweig ohne schreibt es die
  vorhandene `ConsoleLogger.sharedConfig` mit, statt den Slot neu zu belegen ·
  neu in `docs/api-reference.md` §Console Logger: die Tabelle Stufe gegen
  Schalter (`logger.debug`/`isDebug`, `logger.info`/`isInfo`,
  `logger.warn`/`isWarn`, `logger.error` ungegatet), auf die Paket 2 und 3
  verweisen, statt die Regeln neu auszuformulieren

**BUG-027 · low · packages/shadow-objects/src/utils/ConsoleLogger.ts:135 und :241-252** — Die Logger-Konfiguration eines Threads friert beim ersten Logger ein

setConsoleLoggerStorage(config) setzt nur den Slot globalThis.ConsoleLoggerStorage.
ConsoleLogger.loadConfig() läuft aber genau einmal je Thread, beim Bau der ersten
Instanz, und friert sharedConfig dabei auf ein eigenes Objekt ein. Ein Aufruf danach
erreicht keinen Logger mehr. Damit läuft der dokumentierte Weg, einen Worker über
ConsoleLogger.RemoteWorkerEnv.workerConfig gesprächig zu machen, ins Leere, sobald im
Worker vor der Konfigurationsnachricht irgendein Logger entstanden ist. Latent: die
heutige Reihenfolge hält das ein und ist von einem Fall festgehalten, und im Hauptthread
wird der Fallback-Store bei vorhandenem localStorage gar nicht gelesen.

Empfehlung: Entweder setConsoleLoggerStorage() die vorhandene sharedConfig mitschreiben
lassen, oder loadConfig() den Slot bei jedem Zugriff lesen. Der zweite Weg kostet einen
Property-Zugriff je Logzeile und macht die Reihenfolge gleichgültig.

**DX-017 · info · packages/shadow-objects/docs/api-reference.md:2992 und :2994** — Zwei Sätze der Logger-Dokumentation versprechen mehr Kontrolle, als der Code hält

»ConsoleLogger.<namespace>.enable turns a single logger off on its own« gilt für Kernel,
ShadowEnv und die Elemente nur für deren gegatete Zeilen: logger.error() druckt
bedingungslos (src/utils/ConsoleLogger.ts:298-304). Und die Begründung, der Schlüssel
werde einmal über remoteEnv.logger.warn genannt, das nicht hinter
ConsoleLogger.sharedConfig.enable liege, trifft zu, fasst die Sache aber enger, als sie
ist — logger.warn() hängt an gar keinem Schalter, auch nicht am Namensraum-Schalter.

Empfehlung: Beide Sätze auf das einschränken, was gilt: welche Stufen der
Namensraum-Schalter erreicht und welche bedingungslos drucken. Eine kleine Tabelle Stufe
gegen Schalter ist hier kürzer als jede Prosa.

### [x] 2. Ein Fehlergrund kommt als Error über die Worker-Grenze
- Findings: CONS-018 (low), CONS-008 (low)
- Ziel: Beide Strecken — der fehlgeschlagene `importScript()` und der
  abgelehnte Change Trail — liefern dem Aufrufer in seinem `catch` einen
  `Error`, so wie es die lokale Umgebung tut, und der Name, unter dem der Fehler
  im Worker geworfen wurde, kommt mit.
- Bereich: `packages/shadow-objects/src/worker/MessageRouter.ts`,
  `src/view/RemoteWorkerEnv.ts`, `src/types.ts`, die JSDoc-Blöcke von
  `src/ChangeTrailRefusedError.ts` und `src/in-the-dark/importModule.ts`, die
  zugehörigen Specs, `docs/` und `CHANGELOG.md` des Pakets, dazu die E2E-Seite
  `sync-failure`
- Hängt ab von: —
- Hash: f5bcc23
- Modell: stärkste Stufe
- Effort: high
- Dateien:
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`
  - `packages/shadow-objects/src/types.ts`
  - `packages/shadow-objects/src/worker/MessageRouter.ts`
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`
  - `packages/shadow-objects/src/worker/MessageRouter.spec.ts`
  - `packages/shadow-objects/src/ChangeTrailRefusedError.ts` (nur der
    JSDoc-Block über der Klasse)
  - `packages/shadow-objects/src/in-the-dark/importModule.ts` (nur der
    JSDoc-Block über `missingShadowObjectsExportMessage`)
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`
  - `packages/shadow-objects-e2e/src/sync-failure.js`
  - `packages/shadow-objects-e2e/TEST-PLAN.md`
- Vorgehen:

  1. **Regressionstest zuerst, und rot sehen.** Drei neue Fälle, alle in
     `src/view/RemoteWorkerEnv.spec.ts`. Die Importzeile 21 um die neue Klasse
     erweitern:

     ```ts
     import {RemoteWorkerEnv, type RemoteWorkerEnvOptions, WorkerReportedError} from './RemoteWorkerEnv.js';
     ```

     Die ersten beiden ans Ende des `describe('module imports', …)`-Blocks (er
     endet heute nach dem Fall `settles only the import the confirmation belongs
     to`):

     ```ts
     // What a caller sees in its `catch` is the same shape in both environments: a
     // `LocalShadowObjectEnv` throws the `Error` the import produced, and this one rebuilds one
     // from the two fields that survive structured cloning.
     it('rejects a failed import with an error, not with the wording of one', async () => {
       const {env, worker} = await startEnv();

       const pending = env.importScript('./broken.js');
       const url = worker.posted.at(-1).importModule;
       worker.reply({type: ImportedModule, url, error: 'unexpected token', errorName: 'SyntaxError'});

       const reason = await expectRejection(pending, 'SyntaxError');

       expect(reason, 'a caller may check for an Error').toBeInstanceOf(Error);
       expect(reason, 'and for the boundary it came across').toBeInstanceOf(WorkerReportedError);
       expect(reason.message).toBe('unexpected token');
     });

     // A confirmation that names no class is not a broken one -- an implementation on the other
     // side that only sends a reason keeps working, and its reason arrives as a plain `Error`.
     it('names a reported failure without a class an error', async () => {
       const {env, worker} = await startEnv();

       const pending = env.importScript('./nothing.js');
       const url = worker.posted.at(-1).importModule;
       worker.reply({type: ImportedModule, url, error: 'module has no "shadowObjects" export'});

       const reason = await expectRejection(pending, 'Error');

       expect(reason).toBeInstanceOf(WorkerReportedError);
       expect(reason.message).toBe('module has no "shadowObjects" export');
     });
     ```

     Den dritten ans Ende des `describe`-Blocks, in dem
     `rejects with the bare reason when the confirmation names no count` steht:

     ```ts
     // The refusal wraps the reason, so the shape of the reason is what a `cause` hands on: the
     // error object itself in a local environment, and here the one rebuilt from the wire.
     it('carries the reported failure into the cause of the refusal', async () => {
       const {env, worker} = await startEnv();
       const trail: ChangeTrailType = [
         {type: ComponentChangeType.UpdateOrder, uuid: 'a', order: 1},
         {type: ComponentChangeType.UpdateOrder, uuid: 'b', order: 2},
       ];

       const pending = env.applyChangeTrail(trail, true);
       worker.reply({
         type: AppliedChangeTrail,
         serial: 1,
         error: 'the kernel cannot create an entity because the uuid b is already held by another entity',
         errorName: 'EntityUuidInUseError',
         appliedCount: 1,
       });

       const reason = (await expectRejection(pending, 'ChangeTrailRefusedError')) as ChangeTrailRefusedError;
       const cause = reason.cause as WorkerReportedError;

       expect(cause, 'a caller may check for an Error').toBeInstanceOf(Error);
       expect(cause).toBeInstanceOf(WorkerReportedError);
       expect(cause.name, 'the name is read the same way it is read locally').toBe('EntityUuidInUseError');
       expect(cause.message).toContain('already held by another entity');
     });
     ```

     Roten Lauf so erzeugen und die Ausgabe in den Report übernehmen — alle drei
     Fälle müssen scheitern, weil heute die nackte Zeichenkette geworfen wird
     (`expectRejection` liest `reason.name` und findet an einer Zeichenkette
     `undefined`):

     ```
     pnpm -F @spearwolf/shadow-objects exec vitest --run src/view/RemoteWorkerEnv.spec.ts
     ```

  2. **`src/types.ts`.** Beide Nachrichtentypen bekommen ein Feld daneben; das
     vorhandene `error` behält seinen Typ und trägt künftig die Nachricht ohne
     den Klassennamen davor. Der Block Zeile 82–98 lautet danach:

     ```ts
     export interface ImportedModuleEvent {
       type: typeof ImportedModule;
       url?: string;
       error?: string;
       /**
        * The name the error called itself in the worker. Structured cloning does not carry an
        * error class, so this and `error` are what the view side rebuilds one from. Absent means
        * the sender named no class, and the view reads it as `Error`.
        */
       errorName?: string;
     }

     export interface AppliedChangeTrailEvent {
       type: typeof AppliedChangeTrail;
       serial?: number;
       error?: string;
       /** The name the error called itself in the worker; see {@link ImportedModuleEvent.errorName}. */
       errorName?: string;
       /**
        * How many entries of the change trail the Kernel applied before it stopped. Stands only
        * next to an `error`, and only where the Kernel itself could say so; an absent field means
        * nothing is known about how far the trail got.
        */
       appliedCount?: number;
     }
     ```

  3. **`src/worker/MessageRouter.ts`.** Eine Hilfsfunktion auf Modulebene,
     direkt unter `isReadableMessageData` (also hinter Zeile 31), und zwei
     Aufrufstellen.

     ```ts
     /**
      * Reduces a throw to the two fields that survive the wire. `RemoteWorkerEnv` builds an error
      * from them, and it decides between a confirmation and a refusal by whether `error` is there
      * at all -- so the wording must never come out empty, not even for an `Error` carrying no
      * message of its own.
      */
     const describeError = (error: unknown): {error: string; errorName?: string} =>
       error instanceof Error
         ? {error: error.message || String(error), errorName: error.name}
         : {error: String(error) || 'unknown error'};
     ```

     a. Der `catch` von `#configure()` (heute Zeile 141–147): die letzte Zeile
        wird zu

        ```ts
        this.postMessage({type: ImportedModule, url, ...describeError(error)} as ImportedModuleEvent);
        ```

        Der Kommentar über `this.logger.error(…)` bleibt unverändert stehen.

     b. Der Zweig ohne `shadowObjects`-Export (heute Zeile 134–140) bleibt, wie
        er ist. Er schickt kein `errorName`, und das ist die richtige Antwort:
        `LocalShadowObjectEnv.importScript()` wirft dort ein blankes
        `new Error(missingShadowObjectsExportMessage)`, dessen `name` `Error`
        ist — genau der Vorgabewert, den die View für ein fehlendes
        `errorName` einsetzt.

     c. Der `catch` von `#onChangeTrail()` (heute Zeile 156–169): der
        `postMessage`-Aufruf wird zu

        ```ts
        const refusal = error instanceof ChangeTrailRefusedError ? error : undefined;
        this.postMessage({
          type: AppliedChangeTrail,
          serial: data.serial,
          // what the entry threw, not the refusal wrapped around it: the number travels in a
          // field of its own, so the reason stays the reason
          ...describeError(refusal?.cause ?? error),
          ...(refusal ? {appliedCount: refusal.appliedCount} : {}),
        } as AppliedChangeTrailEvent);
        ```

  4. **`src/view/RemoteWorkerEnv.ts`.** Die neue Klasse hinter
     `WorkerDestroyedError` (also hinter Zeile 90), damit die drei Fehlerklassen
     dieser Datei beieinander stehen. Die Reihenfolge der Parameter ist die von
     `WorkerFailedError` weiter oben in derselben Datei: was den Fehler benennt, steht vor
     der Nachricht. Eine Hilfsfunktion daneben gibt es nicht — der Vorgabewert
     für einen fehlenden Namen steht im Konstruktor, und beide Aufrufstellen
     bauen die Klasse direkt.

     `src/index.ts` wird dabei **nicht** angefasst: die Zeile
     `export * from './view/RemoteWorkerEnv.js';` steht dort schon und nimmt die
     neue Klasse von selbst mit. `src/shadow-objects.ts`, der Einstiegspunkt der
     Worker-Seite, führt `RemoteWorkerEnv` nicht und bekommt sie auch nicht —
     diese Klasse gehört der View.

     ```ts
     /**
      * The reason a request is rejected with when the worker reported a failure of its own -- a
      * module that would not import, a change trail its Kernel refused. An error does not survive
      * structured cloning as the object it is, so the two fields that do are rebuilt here, and
      * `name` is the name the error called itself inside the worker: a caller reads it the same
      * way it reads the name of an error a `LocalShadowObjectEnv` hands it. A name that is missing
      * or empty names no class, and `Error` is what such a reason is called -- the same name a
      * plain `new Error(message)` carries on the local side.
      *
      * What does not come across is the class and everything it added. `instanceof EntityUuidInUseError`
      * is `false` here and there is no `uuid` field, whatever `name` says; `instanceof WorkerReportedError`
      * is what tells such a reason apart from one raised on this side.
      */
     export class WorkerReportedError extends Error {
       constructor(name: string | undefined, message: string) {
         super(message);
         this.name = name || 'Error';
       }
     }
     ```

     a. Der Guard in `applyChangeTrail()` (heute Zeile 346–360): der
        `if (data.error)`-Block wird zu

        ```ts
        if (data.error) {
          const reason = new WorkerReportedError(data.errorName, data.error);
          // Only a confirmation that names the count can move the line the view draws between
          // applied and pending; one that does not carries no more than the reason itself, and
          // is handed on as that reason.
          if (typeof data.appliedCount === 'number') {
            throw new ChangeTrailRefusedError(data.appliedCount, changeTrail.length, {cause: reason});
          }
          throw reason;
        }
        ```

     b. Der Guard in `importScript()` (heute Zeile 378–382): Zeile 380 wird zu

        ```ts
        if (data.error) throw new WorkerReportedError(data.errorName, data.error);
        ```

  5. **`src/worker/MessageRouter.spec.ts`.** Vier Stellen, alle im Bestand:

     a. Fall `reports a configure message that carries no url` (Zeile 258): die
        Nachricht trägt jetzt Message und Name getrennt. Die eine Zeile wird zu
        zweien:

        ```ts
        expect(posted[0].message.error).toBe('missing "importModule" url');
        expect(posted[0].message.errorName).toBe('Error');
        ```

     b. Fall `reports a module that cannot be parsed` (Zeile 276): die Message
        ist jetzt die des `SyntaxError`, ohne den Namen davor. Der Kommentar
        darüber (»Only the prefix: the rest of the message is the engine's
        wording, not ours.«) beschreibt danach nichts mehr und wird durch einen
        ersetzt, der sagt, warum hier nur der Name geprüft wird: der Wortlaut
        gehört der Engine. Die Zeile wird zu

        ```ts
        expect(posted[0].message.errorName).toBe('SyntaxError');
        expect(posted[0].message.error, 'the wording belongs to the engine, that there is one belongs to us').toMatch(/.+/);
        ```

        Der Wortlaut der Meldung kommt bewusst ohne Apostroph aus: Biome ist auf
        `quoteStyle: "single"` gestellt und stellt eine Zeichenkette, die ein
        `'` enthält, auf doppelte Anführungszeichen um — `pnpm lint:ci` bricht
        an so einer Zeile ab, weil `biome check` Formatabweichungen meldet.

     c. Die beiden `toEqual` über die ganze Nachricht (Zeile 318–323 und
        343–348) führen `errorName` jetzt mit und würden sonst brechen. In
        beiden kommt hinter die `error`-Zeile:

        ```ts
        errorName: 'Error',
        ```

        Das ist kein beliebiger Wert: der Kernel wirft an
        `src/in-the-dark/Kernel.ts:494` ein blankes
        `new Error('entity with uuid "…" not found!')`.

     d. Ein neuer Fall ans Ende des `describe('a change trail that fails', …)`,
        der zeigt, dass ein Klassenname den Router unbeschädigt passiert. Er
        braucht eine Entität, die schon steht, und eine zweite Erzeugung unter
        derselben uuid — die Helfer `changeTrailMessage` und `createEntity`
        stehen im Kopf der Datei:

        ```ts
        // The name is what a caller on the view side reads to tell one refusal from another, so
        // it travels next to the wording rather than inside it.
        it('names the class the kernel refused with', () => {
          const {posted, router} = setup();
          vi.spyOn(console, 'error').mockImplementation(() => undefined);

          router.route(changeTrailMessage(1, createEntity('a')));
          router.route(changeTrailMessage(2, createEntity('a')));

          const message = posted.at(-1).message;

          expect(message.errorName).toBe('EntityUuidInUseError');
          expect(message.error).toContain('already held by another entity');
          expect(message.appliedCount).toBe(0);
        });
        ```

  6. **`src/view/RemoteWorkerEnv.spec.ts`, der Bestand.** Vier Erwartungen
     behaupten die alte Form und werden umgeschrieben; die neuen Fälle aus
     Schritt 1 stehen daneben:

     a. Zeile 603, im Fall `settles only the request the confirmation belongs to`:
        `await expect(first).rejects.toBe('the first trail failed');` wird zu

        ```ts
        await expect(first).rejects.toThrow('the first trail failed');
        ```

     b. Zeile 629, im Fall `rejects with a refusal that carries the count the worker named`:
        `expect(reason.cause).toBe('entity with uuid "c" not found!');` wird zu

        ```ts
        expect((reason.cause as Error).message).toBe('entity with uuid "c" not found!');
        ```

        Der Fall bleibt sonst wie er ist — er prüft die Zahl, nicht die Form
        des Grundes; die prüft der neue Fall aus Schritt 1.

     c. Zeile 641, im Fall `rejects with the bare reason when the confirmation names no count`:
        `await expect(withTimeout(pending)).rejects.toBe('something went wrong');`
        wird zu

        ```ts
        await expect(withTimeout(pending)).rejects.toThrow('something went wrong');
        ```

     d. Zeile 670, im Fall `settles only the import the confirmation belongs to`:
        `await expect(first).rejects.toBe('module has no "shadowObjects" export');`
        wird zu

        ```ts
        await expect(first).rejects.toThrow('module has no "shadowObjects" export');
        ```

  7. **Die E2E-Seite.** In
     `packages/shadow-objects-e2e/src/sync-failure.js`, Fall
     `sync-failure-reason-names-the-refusal`: der Kommentar (Zeile 139–142)
     behauptet die alte Form, die Prüfung dahinter (Zeile 143–145) auch.
     Beides wird ersetzt durch:

     ```js
     // Across a worker boundary the error object itself does not survive: the worker puts its
     // wording and its name on the wire (`MessageRouter.#onChangeTrail`) and the view builds a
     // `WorkerReportedError` from the two (`RemoteWorkerEnv.applyChangeTrail`). `mod-refuse.js`
     // throws a plain `Error`, so that is the name that arrives.
     if (!(refusedReason.cause instanceof WorkerReportedError)) {
       throw new Error(`expected the cause to be a WorkerReportedError, got: ${JSON.stringify(refusedReason.cause)}`);
     }
     if (refusedReason.cause.name !== 'Error' || !refusedReason.cause.message.includes(RefusalMessage)) {
       throw new Error(`expected the cause to name the refusal, got: ${refusedReason.cause.name}: ${refusedReason.cause.message}`);
     }
     ```

     Dazu `WorkerReportedError` in die Importzeile 2 aufnehmen:

     ```js
     import {ChangeTrailRefusedError, ComponentChangeType, ShadowEnv, WorkerReportedError} from '@spearwolf/shadow-objects';
     ```

     Der Import geht über den Einstiegspunkt des gebauten Pakets und ist damit
     zugleich die Probe, dass die Klasse dort ankommt. Keine Zeile
     `testBooleanAction`/`testAsyncAction` kommt hinzu und keine fällt weg: die
     E2E-Suite bleibt bei 430 Fällen.

     In `packages/shadow-objects-e2e/TEST-PLAN.md`, Zeile 291 (`| SYNC-1 |`):
     der Halbsatz »across a worker the wording of the throw travels under
     `cause` as a string, not as an `Error` instance« sagt künftig, dass unter
     `cause` ein `WorkerReportedError` steht, der Wortlaut und Name des Wurfs
     trägt, und dass die Klasse selbst die Grenze nicht überquert.

  8. **`docs/api-reference.md`.** Sieben Stellen, alle im Bestand:

     a. Zeile 1258, Absatz unter `#### syncWait()`: »`cause` carries what the
        entry actually threw -- the error object itself locally, the wording the
        worker put on the wire across a worker boundary« sagt künftig, dass es
        lokal das Fehlerobjekt selbst ist und über die Worker-Grenze ein
        `WorkerReportedError`, der Wortlaut und Name trägt.

     b. Zeile 1315, `cause`-Zeile der Mitgliedertabelle von
        `ChangeTrailRefusedError`: dieselbe Korrektur in Tabellenlänge, und mit
        dem Zusatz, dass Klasse und Zusatzfelder des ursprünglichen Fehlers
        nicht mitkommen.

     c. Zeile 1522, `importScript(url)`-Zeile der Methodentabelle von
        `RemoteWorkerEnv`: »A module with no `shadowObjects` export rejects with
        the string … rather than the `Error` a `LocalShadowObjectEnv` rejects
        the same case with« gilt nicht mehr. Die Zeile sagt künftig, dass eine
        Ablehnung aus dem Worker als `WorkerReportedError` ankommt, dessen
        `message` der Wortlaut aus dem Worker ist und dessen `name` der Name
        ist, unter dem dort geworfen wurde — für das fehlende
        `shadowObjects`-Export also `Error` mit demselben Wortlaut, den eine
        lokale Umgebung wirft.

     d. Zeile 1523, `applyChangeTrail(...)`-Zeile derselben Tabelle: ergänzen,
        dass eine Bestätigung ohne `appliedCount` mit dem gemeldeten Grund
        selbst ablehnt — einem `WorkerReportedError` — statt mit einem
        `ChangeTrailRefusedError`.

     e. Zeile 1548, der Absatz »The two ends are told apart by the error they
        hand out …«: einen zweiten Absatz direkt dahinter, der die dritte Klasse
        einführt. Er sagt: `WorkerReportedError` ist kein Ende dieser Umgebung,
        sondern eine einzelne Anfrage, die der Worker abgelehnt hat; `message`
        ist der Wortlaut aus dem Worker, `name` der Name, unter dem dort
        geworfen wurde, und ein `instanceof` auf die ursprüngliche Klasse
        schlägt hier fehl, weil Structured Clone keine Fehlerklasse überträgt.
        Ebenfalls aus `@spearwolf/shadow-objects` exportiert.

     f. Zeile 2656, Absatz »**A uuid names one Entity at a time.**«: der
        Schlusshalbsatz »as the wording the Kernel put on the wire across a
        worker boundary, where an `instanceof` check therefore finds a string«
        sagt künftig, dass dort ein `WorkerReportedError` mit
        `name === 'EntityUuidInUseError'` steht, ein `instanceof
        EntityUuidInUseError` aber fehlschlägt und `uuid` fehlt.

     g. Zeile 2674–2676, der Absatz am Ende von `#### EntityUuidInUseError`
        (»Only a local environment hands the object itself to the view side. A
        Worker puts the wording of the refusal on the wire, so the `cause` … is
        a string and carries no `uuid` field«): künftig steht dort, dass ein
        Worker Wortlaut und Namen überträgt, `cause` also ein
        `WorkerReportedError` mit `name === 'EntityUuidInUseError'` ist — und
        dass `uuid` weiterhin fehlt, weil nur diese beiden Felder die Grenze
        überqueren.

     Sonst nichts an dieser Datei. Zeile 1229 spricht von Gründen, die *keine*
     Ablehnung des Kernels sind, und bleibt richtig; Zeile 1472
     (`LocalShadowObjectEnv.importScript`) sagt »the same wording
     `RemoteWorkerEnv` reports for the same case« und stimmt weiterhin. In
     `docs/guides.md`, `docs/cheat-sheet.md`, `docs/best-practices.md`,
     `docs/concepts.md` und `README.md` des Pakets steht keine Aussage über die
     Form dieses Grundes — nachgesehen, nichts zu tun. Auch für `errorName` ist
     in `docs/` nichts nachzuziehen: `ImportedModuleEvent` und
     `AppliedChangeTrailEvent` kommen in keiner Doku-Datei vor, das
     Nachrichtenprotokoll wird ausschließlich im `CHANGELOG.md` beschrieben
     (Schritt 10c). Der Hinweis aus dem
     Grobplan auf die Tabelle Stufe gegen Schalter aus Paket 1 greift nicht:
     dieses Paket schreibt an keiner Stelle über Gating.

  9. **Zwei JSDoc-Blöcke im Quelltext, die dieser Umbau umwirft.** Beide
     stehen in Dateien, die das Paket sonst nicht anfasst, und beide werden
     als Deklaration mit ausgeliefert.

     a. `src/ChangeTrailRefusedError.ts`, Zeile 10–11 des Klassen-JSDoc: »`cause`
        carries what the entry actually threw. Across a worker boundary that is
        the wording the Kernel put on the wire rather than the error object
        itself.« Der zweite Satz sagt künftig, dass über die Worker-Grenze ein
        `WorkerReportedError` dort steht, der Wortlaut und Namen des Wurfs
        trägt, und dass Klasse und Zusatzfelder des ursprünglichen Fehlers die
        Grenze nicht überqueren. Der erste Satz bleibt, wie er ist.

     b. `src/in-the-dark/importModule.ts`, Zeile 5–9, der JSDoc über
        `missingShadowObjectsExportMessage`. Beide Halbsätze bleiben wahr, aber
        der Kontrast, den sie aufmachen, ist die Asymmetrie, die dieses Paket
        beseitigt. Der Halbsatz über den `MessageRouter` bekommt den Zusatz,
        dass `RemoteWorkerEnv` aus dem Feld einen `Error` baut; der Halbsatz
        über `LocalShadowObjectEnv` sagt, dass es dort direkt geschieht. Der
        Grund für die Aufnahme steht in »Entscheidungen« (2026-08-25).

 10. **`packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`.** Fünf
     Eingriffe, und die Aufteilung ist der Punkt, an dem dieses Paket leise
     falsch werden kann: `ChangeTrailRefusedError` und `EntityUuidInUseError`
     sind selbst noch unveröffentlicht, ihre `cause`-Form ist also **kein**
     Bruch gegen `0.33.0`, sondern eine Korrektur ihrer eigenen, noch nicht
     erschienenen Einträge. Ein Bruch gegen `0.33.0` sind allein die beiden
     Strecken, die dort schon eine Zeichenkette warfen.

     a. `### ⚠️ Breaking Changes`, als letzter Punkt des Abschnitts (hinter dem
        Punkt `**Breaking (environments):** LocalShadowObjectEnv.importScript()
        …`): dass `RemoteWorkerEnv` eine vom Worker gemeldete Ablehnung als
        `WorkerReportedError` ablehnt statt als nackte Zeichenkette. Beide
        Strecken nennen: ein `importScript()` auf ein Modul, das der Worker
        nicht laden konnte, und ein `applyChangeTrail(trail, true)`, dessen
        Bestätigung einen Grund ohne `appliedCount` trägt. Was einen Consumer
        trifft: ein `catch`, das den Grund mit einer Zeichenkette verglichen
        oder ihn direkt ausgegeben hat, sieht jetzt ein Objekt — `error.message`
        trägt den Wortlaut, `error.name` den Namen aus dem Worker.

     b. `### New`, bei den übrigen `**New (public API):**`-Einträgen:
        `WorkerReportedError`. Nennen: wofür er steht, dass `name` der Name aus
        dem Worker ist, dass Klasse und Zusatzfelder des ursprünglichen Fehlers
        die Grenze nicht überqueren, und dass er aus
        `@spearwolf/shadow-objects` exportiert wird. Kein Zuwachs an der
        publizierten Dateiliste: die Klasse steht in
        `dist/src/view/RemoteWorkerEnv.js`.

     c. `### New`, im Genre des dortigen `**New (protocol):**`-Eintrags über
        `AppliedChangeTrailEvent.appliedCount`: das Feld `errorName` auf
        `ImportedModuleEvent` und `AppliedChangeTrailEvent`. Nennen, dass es
        neben `error` steht, dass `error` künftig den Wortlaut ohne den
        Klassennamen davor trägt, und dass eine Gegenstelle, die es nicht
        schickt, weiterhin funktioniert — ein fehlendes `errorName` liest die
        View als `Error`.

        Der Wegfall des Präfixes ist hier vollständig angesagt und bekommt
        **keinen** zweiten Eintrag unter `### ⚠️ Breaking Changes`. Die
        Begründung steht in »Entscheidungen« (2026-08-25); wer der Meinung ist,
        das gehöre lauter, meldet es, statt den Eintrag anzulegen.

     d. Drei vorhandene Einträge sagen die alte Form und werden auf die neue
        gezogen: ein `WorkerReportedError`, der Wortlaut und Namen trägt, ohne
        Klasse und ohne `uuid`.

        - `### New`, Zeile 215, `ChangeTrailRefusedError`: »the wording the
          worker put on the wire across a worker boundary«.
        - `### New`, Zeile 216, `EntityUuidInUseError`: »as the wording on the
          wire across a worker boundary«.
        - `### Behavior`, Zeile 242, der Eintrag
          `**Behavior (kernel):** a uuid names one entity at a time.`: »`cause`
          carries the `EntityUuidInUseError` — the object itself locally, its
          wording across a worker boundary«. Derselbe Satz in derselben Sache,
          eine Ebene tiefer im Dokument.

     e. Der Vorspann von `## [Unreleased]`. Er zählt genau 51 mit Semikolons
        getrennte Änderungen und beginnt mit »Fifty-one changes reach existing
        consumers«. Der Bruch aus (a) ist die zweiundfünfzigste: eine Teilaussage
        in derselben Machart in die Aufzählung einhängen — sinnvoll direkt hinter
        der bereits vorhandenen über `WorkerDestroyedError` /
        `WorkerFailedError` statt der Zeichenkette `'worker was destroyed'`, weil
        sie dieselbe Sache an einer zweiten Strecke ist — und die Zahl im ersten
        Satz auf »Fifty-two« setzen. Mehr Positionen kommen nicht hinzu: das
        Wire-Format aus (c) bekommt keine, siehe »Entscheidungen« (2026-08-25).

        Zwei weitere Stellen im selben Vorspann beschreiben die `cause`-Form und
        werden wie (d) gezogen, ohne je eine eigene Aufzählungsposition zu
        werden:

        - Zeile 136–138, »so a `catch` that compared the bare string a worker
          used to send, or that read the thrown error directly in a local
          environment, now finds both of those under `cause`«. Was der Worker
          schickt, steht danach nicht mehr als Zeichenkette unter `cause`,
          sondern als `WorkerReportedError`, der den Wortlaut trägt. Der
          Halbsatz über die lokale Umgebung bleibt, wie er ist.
        - Zeile 142–143, »which across a worker boundary is the wording of it
          rather than the object« (über den `cause` des
          `EntityUuidInUseError`). Der Satzbau läuft über den Zeilenumbruch —
          wer nur eine Zeile durchsucht, findet ihn nicht.

 11. **Nachlauf.** `AGENTS.md` auf Veralterung prüfen: es nennt weder die
     Fehlerklassen noch das Nachrichtenprotokoll, es ist also nichts
     nachzuziehen — die Prüfung gehört in den Report, nicht in die Datei. Kein
     `TODO`-Kommentar wird berührt, `pnpm make:todo` entfällt. Unter `dist/`
     kommt keine Datei hinzu und fällt keine weg, `dist/package.json` behält
     seine Form: `src/distContract.files.txt` und
     `src/distContract.package.json` bleiben unverändert.

- Verify: `pnpm run ci && pnpm -F shadow-objects-e2e test`. Die E2E-Suite gehört
  diesmal dazu — anders als in Paket 1 — weil `sync-failure.js` eine Zeile
  dieses Pakets ist und `pnpm run ci` die Playwright-Läufe ausschließt. Erwartung
  gegen die Baseline: exit 0, `pnpm lint` weiterhin mit dem einen vorbestehenden
  Info-Hinweis, 430 E2E-Fälle unverändert, und die Fallzahl der Vitest-Suiten
  steigt gegenüber 1297 um genau die vier Fälle aus Schritt 1 und 5d auf 1301.
- Commit: `fix(view)!: a failure the worker reports arrives as an Error`
- Ergebnis: 1 Runde · CONS-018 behoben (`RemoteWorkerEnv.ts:401` wirft einen
  `WorkerReportedError` statt der nackten Zeichenkette) · CONS-008 behoben
  (`MessageRouter.ts:176` überträgt Wortlaut und Namen getrennt,
  `RemoteWorkerEnv.ts:371-378` baut daraus den `cause` der Ablehnung bzw. den
  Grund selbst) · Regressionstest `rejects a failed import with an error, not
  with the wording of one` samt zwei Geschwistern in `RemoteWorkerEnv.spec.ts`
  (vor dem Fix rot: `expected undefined to be 'SyntaxError'`) · Verify
  `pnpm run ci && pnpm -F shadow-objects-e2e test` exit 0, 1301 Vitest-Fälle
  (799 + 123 + 379) und 430 E2E-Fälle, ein vorbestehender Info-Hinweis · kein
  kritischer und kein wichtiger Befund des Reviewers · klein: der JSDoc über
  `describeError()` (`MessageRouter.ts:36-42`) verspricht einen Wortlaut, der
  nie leer wird, doch der `Error`-Zweig hat keinen Auffangwert — ein `Error`
  mit leerem `name` und leerer `message` käme als Bestätigung an statt als
  Ablehnung; das Verhalten ist das der Vorgängerzeile, neu ist allein das
  Versprechen
- Nebenbefunde: → Queue
- Folgen: —
- Schnittstellen: `WorkerReportedError` neu exportiert aus
  `@spearwolf/shadow-objects` (steht in `src/view/RemoteWorkerEnv.ts`,
  ausgeliefert als `dist/src/view/RemoteWorkerEnv.js`), Konstruktor
  `(name: string | undefined, message: string)` in der Parameterfolge von
  `WorkerFailedError`, `name` fällt ohne Angabe auf `Error` zurück ·
  `ImportedModuleEvent` und `AppliedChangeTrailEvent` tragen je ein optionales
  `errorName`, und ihr `error` trägt den Wortlaut ohne den Klassennamen davor ·
  `RemoteWorkerEnv.importScript()` lehnt mit einem `WorkerReportedError` ab
  statt mit einer Zeichenkette, ebenso `applyChangeTrail()` bei einer
  Bestätigung ohne `appliedCount`; nennt die Bestätigung eine Zahl, steht der
  `WorkerReportedError` unter dem `cause` des `ChangeTrailRefusedError` ·
  `describeError(error)` auf Modulebene von `MessageRouter.ts` reduziert einen
  Wurf auf die zwei Felder, die die Leitung überqueren

**CONS-018 · low · packages/shadow-objects/src/worker/MessageRouter.ts:119 gegen packages/shadow-objects/src/view/RemoteWorkerEnv.ts:380** — Ein Fehlergrund reist als Zeichenkette über die Worker-Grenze und wird dort geworfen

Schlägt ein importScript() im Worker fehl, legt der MessageRouter den Grund als nackte
Zeichenkette auf die Leitung, und RemoteWorkerEnv wirft sie unverändert. Ein Aufrufer bekommt
dort eine Zeichenkette in seinem catch, wo die lokale Umgebung einen Error liefert — dieselbe
Asymmetrie, die CONS-008 für den Change Trail beschreibt, an der zweiten Strecke. Ein catch, das
.message liest oder auf instanceof Error prüft, verhält sich je nach Umgebung anders.

Empfehlung: Auf der View-Seite einen Error aus dem übertragenen Grund bauen, bevor er geworfen
wird, so wie es für den Change Trail bereits vorgesehen ist. Die Botschaft bleibt, die Form wird
die, die ein Aufrufer erwartet.

**CONS-008 · low · packages/shadow-objects/src/worker/MessageRouter.ts:138** — Der Grund eines abgelehnten Change Trails geht als String über die Leitung

Fängt der Router einen Kernel-Fehler, schickt er ihn als interpolierten String zurück. Auf der
View-Seite kommt damit eine Zeichenkette an, wo ProxyFailed eine WorkerFailedError-Instanz trägt.
Wer im catch eines syncWait() steht, hat für den einen Ausgang einen Typ und für den anderen eine
Zeichenkette — und muss sich seine Fallunterscheidung aus Textvergleichen bauen.

Empfehlung: Name und Nachricht strukturiert übertragen und auf der View-Seite in eine Fehlerklasse
zurückverwandeln, wie es die Strecke für den Ausfall des Workers bereits tut. Was ein Konsument im
catch sieht, ändert sich dabei — Changelog-Eintrag.

### [x] 3. Der geteilte Kernel-Zweig schreibt über den Logger
- Findings: CONS-019 (low), CONS-001 (info)
- Ziel: Die drei rohen `console.warn` laufen über den vorhandenen
  `ConsoleLogger` mit der in »Entscheidungen« festgelegten Stufe, und die
  Merkliste der Deprecation-Warnung hängt am Kernel statt am Modul.
- Bereich: `packages/shadow-objects/src/in-the-dark/importModule.ts`,
  `ShadowObjectCreationScope.ts`, `Kernel.ts` samt der beiden betroffenen Specs,
  `docs/api-reference.md` und `CHANGELOG.md` des Pakets
- Hängt ab von: —
- Hash: 9c3abb7
- Modell: mittlere Stufe
- Effort: medium
- Dateien:
  - `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`
  - `packages/shadow-objects/src/worker/MessageRouter.spec.ts`
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts`
  - `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`
  - `packages/shadow-objects/src/in-the-dark/importModule.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:

  Vorbemerkung zur Formatierung: Biome steht auf `lineWidth: 130`,
  `quoteStyle: single`, `bracketSpacing: false`. Wo eine der Zeilen unten an
  diese Grenze stößt, gilt die Ausgabe des Formatters und nicht die Umbruch-
  entscheidung dieses Plans — `pnpm lint:ci` läuft im Verify mit und bricht bei
  jeder Formatabweichung ab. Vor dem Verify-Lauf einmal `pnpm lint:fix` über die
  angefassten Dateien.

  Vorbemerkung zur Testumgebung, in diesem Zug nachgemessen und nicht
  angenommen: unter happy-dom steht `location.host` auf `localhost:3000`, also
  ist `ConsoleLogger.sharedConfig.enable` `true`, ebenso `warn` — ein frischer
  `ConsoleLogger` meldet `isEnabled === true` und `isWarn === true`. Das trägt
  an zwei Stellen weiter unten. Die gegatete Zeile in `importModule.ts` druckt
  in der Suite weiterhin, der vorhandene Fall in `MessageRouter.spec.ts` behält
  deshalb seine Erwartung `toHaveBeenCalledTimes(1)` (Schritt 6), und der neue
  Fall muss den Logger eigens abschalten, um Schweigen zu prüfen (Schritt 1b).
  `MessageRouter.spec.ts` sichert `ConsoleLogger.sharedConfig` ohnehin je Fall
  (`beforeEach`/`afterEach`, Zeile 78–87) und stellt sie danach wieder her; der
  Instanzschalter des neuen Falls braucht diese Sicherung nicht, weil jeder Fall
  über `setup()` seinen eigenen Kernel und damit seinen eigenen Logger baut.

  1. **Regressionstest zuerst, und rot sehen.** Zwei neue Fälle, einer je
     Finding. Beide prüfen den Zustand nach dem Umbau und sind heute rot; die
     fünf vorhandenen Deprecation-Fälle bleiben in diesem Lauf noch grün, weil
     sie auf `console.warn` horchen. Der rote Lauf hat also genau zwei
     Fehlschläge.

     a. **Die Merkliste hängt am Kernel.** In
        `src/in-the-dark/ShadowObjectCreationScope.spec.ts` als **erster** `it`
        innerhalb von `describe('the deprecated isEqual argument', …)`:

        ```ts
        // The list of names already reported belongs to the kernel: an application running two shadow
        // environments has two kernels, and the second of them has to hear about the deprecated call
        // form just as the first did. A list living as long as the module reports to whichever kernel
        // got there first and to no other.
        it('useProperty: reports the deprecated call form to every kernel that meets it', () => {
          const registry = new Registry();
          const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

          const compare = vi.fn((a: unknown, b: unknown) => a === b);

          @ShadowObject({registry, token: 'deprecatedUsePropertyPerKernel'})
          class DeprecatedUsePropertyPerKernel {
            constructor({useProperty}: ShadowObjectCreationAPI) {
              useProperty('bareComparePerKernel', compare);
            }
          }
          expect(DeprecatedUsePropertyPerKernel).toBeDefined();

          const first = new Kernel(registry);
          const second = new Kernel(registry);

          first.createEntity(generateUUID(), 'deprecatedUsePropertyPerKernel', undefined, 0, [
            ['bareComparePerKernel', 'first'],
          ]);
          second.createEntity(generateUUID(), 'deprecatedUsePropertyPerKernel', undefined, 0, [
            ['bareComparePerKernel', 'first'],
          ]);

          expect(errorSpy).toHaveBeenCalledTimes(2);

          first.destroy();
          second.destroy();
        });
        ```

        Der Token ist eigens für diesen Fall neu; er darf sich mit keinem der
        fünf vorhandenen überschneiden. Dass der Fall `useProperty` benutzt und
        der vorhandene `useProperty`-Fall weiter unten ebenfalls, ist nach dem
        Umbau folgenlos: jeder Fall baut seinen eigenen Kernel und damit seine
        eigene Merkliste.

     b. **Die übersprungene Doppel-Einfuhr hängt am Schalter.** In
        `src/worker/MessageRouter.spec.ts` direkt hinter den vorhandenen Fall
        `confirms a module it has already imported without registering it twice`:

        ```ts
        // The skip line is the one report of this branch that asks a getter first, so a logger that is
        // switched off silences it. The instance flag is enough for that -- `isWarn` combines it with
        // the two shared switches -- and it stays inside this test, where a write to the shared config
        // would reach every logger of the thread.
        it('keeps the skip of an already imported module behind the logger switch', async () => {
          const {kernel, posted, router} = setup();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
          const url = 'data:text/javascript,export const shadowObjects = {define: {}}';

          kernel.logger.enable = false;

          router.route(message({type: Configure, importModule: url}));
          await waitForPosted(posted, 1);

          router.route(message({type: Configure, importModule: url}));
          await waitForPosted(posted, 2);

          expect(posted).toHaveLength(2);
          expect(posted.map((entry) => entry.message.error)).toEqual([undefined, undefined]);
          expect(warn).not.toHaveBeenCalled();
        });
        ```

     Roten Lauf so erzeugen und die Ausgabe in den Report übernehmen:

     ```
     pnpm -F @spearwolf/shadow-objects exec vitest --run src/in-the-dark/ShadowObjectCreationScope.spec.ts src/worker/MessageRouter.spec.ts
     ```

     Erwartete Fehlschläge: (a) `expected "error" to be called 2 times, but got
     0 times` — heute geht die Meldung über `console.warn`, und sie fällt
     ohnehin nur einmal je Modul; (b) `expected "warn" not to be called` — heute
     druckt die Zeile ungefragt.

  2. **`src/in-the-dark/Kernel.ts`** — die Merkliste bekommt ihren Besitzer.
     Direkt hinter `readonly #shadowObjectScopes = …` (Zeile 94) und vor dem
     Konstruktor:

     ```ts
     // The member names whose deprecation report this kernel has already made, one entry each. Handed
     // to every creation scope this kernel builds, which is what gives the report the lifetime of the
     // kernel rather than that of this module: an application running two shadow environments would
     // otherwise report the deprecated call form to whichever of them got there first and to no other.
     // One entry per name rather than a single flag, because a flag would swallow the reports of the
     // four members that come after the first. `destroy()` leaves the set alone -- a kernel that has
     // said it once has said it.
     readonly #shownDeprecations = new Set<string>();
     ```

     Und die Konstruktion des Scopes in `constructShadowObject()` (Zeile 749)
     reicht sie weiter:

     ```ts
     const scope = new ShadowObjectCreationScope(entry.entity, this.logger, getDisplayName(construct), this.#shownDeprecations);
     ```

     Das Feld bleibt privat, und der Kernel bekommt **keine** neue öffentliche
     Methode: die Liste erreicht ihren einzigen Leser über den Konstruktor, den
     `ShadowObjectCreationScope` schon für den Logger benutzt, und
     `ShadowObjectCreationScope` wird weder aus `src/index.ts` noch aus
     `src/shadow-objects.ts` exportiert. Eine öffentliche
     Kernel-Methode für eine bibliotheksinterne Buchführung stünde dauerhaft im
     Vertrag und zöge Doku und einen `### New`-Eintrag nach sich; eine
     `WeakMap<Kernel, Set<string>>` auf Modulebene käme ohne Signaturänderung
     aus, verstiege aber die Zugehörigkeit in eine Schlüsselwahl, die ein Leser
     erst rekonstruieren muss. Der Konstruktorweg macht den Besitz sichtbar und
     kostet nichts an der Oberfläche.

  3. **`src/in-the-dark/ShadowObjectCreationScope.ts`** — fünf Eingriffe.

     a. Der Block Zeile 19–35 (Kommentar, `isEqualDeprecationShown` und
        `warnDeprecatedIsEqualOption`) fällt ersatzlos weg. Die Modulebene
        dieser Datei trägt danach keinen Zustand mehr.

     b. Hinter `readonly #displayName: string;` (Zeile 58) das neue Feld:

        ```ts
        // The kernel's list of member names whose deprecation report has already been made. Shared by
        // every scope of one kernel, which is what makes the report fall once per kernel and name.
        readonly #shownDeprecations: Set<string>;
        ```

     c. Der Konstruktor (Zeile 145–149) nimmt sie entgegen. Der Parameter ist
        pflichtig und bekommt keinen Vorgabewert: ein Aufrufer, der ihn
        vergisst, bekäme sonst still eine Liste je Shadow Object, also eine
        Meldung je Shadow Object — schlechter als der Zustand, den dieses Paket
        behebt.

        ```ts
        constructor(entity: Entity, logger: ConsoleLogger, displayName: string, shownDeprecations: Set<string>) {
          this.#entity = entity;
          this.#logger = logger;
          this.#displayName = displayName;
          this.#shownDeprecations = shownDeprecations;
        }
        ```

     d. Die Meldung selbst wird eine private Methode der Klasse, und zwar an
        genau einer Stelle: hinter dem Ende von `#cachedReader` (Zeile 378)
        und vor `useProperty()` (Zeile 380) — beide Angaben meinen dieselbe
        Lücke, dazwischen liegt heute nur die Leerzeile 379. Der Kommentar in
        (e) verweist mit »below« auf genau diese Reihenfolge:

        ```ts
        /**
         * Reports the deprecated call form in which a bare compare function stands where the options
         * object belongs, at most once per kernel and member name.
         *
         * Through `error` rather than `warn`: this names a mistake in the calling code, and its author
         * has to see it wherever the application runs. `logger.warn` is asked `isWarn` first, and the
         * shared `enable` behind that getter is off anywhere but `localhost` -- a deprecation notice
         * that goes silent everywhere the code actually ships is no notice at all. See the table of
         * call against getter under "Console Logger" in `docs/api-reference.md`.
         *
         * One line per kernel and member name: a shadow-object calling a deprecated member inside a
         * loop would otherwise fill the console.
         */
        #reportDeprecatedIsEqualOption(options: unknown, apiName: string): void {
          if (typeof options !== 'function' || this.#shownDeprecations.has(apiName)) return;
          this.#logger.error(
            `[shadow-objects] Deprecation Warning: The "isEqual" option of "${apiName}()" is now passed as {compare} argument. Please update your code accordingly.`,
          );
          this.#shownDeprecations.add(apiName);
        }
        ```

        Der Wortlaut der Meldung bleibt Zeichen für Zeichen der bisherige. Der
        Logger stellt seinen Namensraum als eigenes Argument davor; das Präfix
        `[shadow-objects]` bleibt trotzdem stehen, weil der Namensraum `Kernel`
        heißt und nicht das Paket nennt.

        Die fünf Aufrufstellen (heute Zeile 381, 468, 486, 500, 516) werden von
        `warnDeprecatedIsEqualOption(options, '<name>')` zu
        `this.#reportDeprecatedIsEqualOption(options, '<name>')`. Die Namen der
        fünf Member bleiben unverändert: `useProperty`, `provideContext`,
        `provideGlobalContext`, `useContext`, `useParentContext`.

     e. Der `else if`-Zweig in `#cachedReader()` (Zeile 371–375):

        ```ts
        } else if (opts?.compare != null && compares.get(name) !== opts.compare) {
          // Through `error` for the same reason as the deprecation report below: the options of this
          // call are being dropped, and the caller has to hear that outside `localhost` too, where the
          // shared `enable` behind `isWarn` is off.
          this.#logger.error(
            `[shadow-objects] ${apiName}("${String(name)}"): the cached signal already exists with a different (or no) {compare} function — the new options are ignored. Pass options only on the first call per ${subject}.`,
          );
        }
        ```


  4. **`src/in-the-dark/importModule.ts`** — der Block Zeile 19–24:

     ```ts
     if (importedModules.has(module)) {
       // Gated behind `isWarn`, unlike the reports of the creation API: a module two `extends` chains
       // have in common is a shape of the module graph and not a mistake, so this line only tells
       // during development. See the table of call against getter under "Console Logger" in
       // `docs/api-reference.md`.
       if (kernel.logger.isWarn) {
         kernel.logger.warn('importModule: skipping already imported module', module);
       }
       return;
     } else {
       importedModules.add(module);
     }
     ```

     Die Signatur der Funktion bleibt, wie sie ist: `kernel` steht schon als
     erster Parameter da, und beide Aufrufer — `MessageRouter.ts:143` und
     `LocalShadowObjectEnv.ts:80` — reichen ihren eigenen Kernel hinein. Der
     Import von `Kernel` bleibt ein `import type`; gelesen wird nur eine
     Eigenschaft des übergebenen Werts.

  5. **`src/in-the-dark/ShadowObjectCreationScope.spec.ts`, der Bestand.**

     a. Der Kommentarblock Zeile 11–22 beschreibt die Reihenfolgeabhängigkeit,
        die dieses Paket auflöst, und wird durch diesen ersetzt:

        ```ts
        // The deprecation report falls once per kernel and member name, and every case below builds a
        // kernel of its own -- so a case's report is its own, whatever the cases before it did. Two
        // cases sharing one kernel would share that list, and the second of them would see nothing.
        ```

     b. Der Helfer `makeUnboundScope` (Zeile 26–32, sein `return` steht in
        Zeile 31) reicht die Liste mit. Der Scope wird dort von Hand gebaut,
        also bekommt er eine eigene:

        ```ts
        return {
          kernel,
          uuid,
          scope: new ShadowObjectCreationScope(kernel.getEntity(uuid), kernel.logger, 'TestScope', new Set<string>()),
        };
        ```

     c. Der Kommentar im `afterEach` (Zeile 36–39) nennt `console.warn`; er
        nennt künftig `console.error`. Der Rest des Satzes gilt unverändert.

     d. Die fünf vorhandenen Fälle des Blocks
        `describe('the deprecated isEqual argument', …)` horchen künftig auf
        `console.error`. Je Fall vier Änderungen, sonst nichts:

        - `const warnSpy = vi.spyOn(console, 'warn')…` wird zu
          `const errorSpy = vi.spyOn(console, 'error')…`, und jede weitere
          Nennung von `warnSpy` (die Erwartungen und `warnSpy.mockRestore()`)
          zu `errorSpy`.
        - `expect(warnSpy).toHaveBeenCalledTimes(1)` wird zu
          `expect(errorSpy).toHaveBeenCalledTimes(1)`.
        - `expect(warnSpy.mock.calls[0][0]).toBe(…)` wird zu
          `expect(errorSpy.mock.calls[0][2]).toBe(…)` — der Index wandert von
          0 auf 2, weil Badge und Styles davor stehen. Der erwartete Wortlaut
          bleibt Zeichen für Zeichen der bisherige.
        - Der Titel sagt statt »warns once per realm with the full deprecation
          text« künftig »reports once per kernel with the full deprecation
          text«. Der Rest des Titels bleibt.

        Im **ersten** der fünf Fälle (`useProperty`) steht über der Erwartung
        dieser Kommentar, und eine Zeile prüft den Namensraum-Badge — sie ist
        der Beleg, dass die Meldung durch den Logger geht und nicht roh über
        `console.error`:

        ```ts
        // `ConsoleLogger` prints its namespace as a styled badge, so the wording of a report starts at
        // the third argument: `console.error('%c<namespace>', styles, ...args)`. The badge is what
        // tells a report through the logger apart from a raw call on the console.
        expect(errorSpy.mock.calls[0][0]).toBe('%cKernel');
        expect(errorSpy.mock.calls[0][2]).toBe(
          '[shadow-objects] Deprecation Warning: The "isEqual" option of "useProperty()" is now passed as {compare} argument. Please update your code accordingly.',
        );
        ```

        In den übrigen vier Fällen genügt der Index; der Kommentar wird nicht
        wiederholt.

  6. **`src/worker/MessageRouter.spec.ts`, der Bestand.** Eine Stelle: der Fall
     `confirms a module it has already imported without registering it twice`,
     Zeile 299. Die Meldung steht jetzt hinter Badge und Styles:

     ```ts
     // `ConsoleLogger` prints its namespace as a styled badge: `console.warn('%c<namespace>', styles,
     // ...args)`. The wording of the call starts at the third argument.
     expect(warn.mock.calls[0][2]).toContain('importModule: skipping already imported module');
     ```

     `expect(warn).toHaveBeenCalledTimes(1)` darüber bleibt unverändert stehen.

  7. **`docs/api-reference.md`.** Vier Stellen, alle im Bestand.

     a. Zeile 69, letzter Halbsatz des Options-Punktes von `useProperty`. »A
        bare comparison function in place of the options object still works and
        logs a deprecation warning.« wird zu:

        ```markdown
        A bare comparison function in place of the options object still works; it is reported once per Kernel and member name through the Kernel's `ConsoleLogger` at **error** level, which no switch gates — see the table of call against getter under [Console Logger](#console-logger).
        ```

     b. Zeile 71, zweiter Halbsatz. »…and the `compare` of that second call is
        ignored with a message on the console.« wird zu »…and the `compare` of
        that second call is ignored and reported through the Kernel's
        `ConsoleLogger` at **error** level.« Der Schlusssatz »Pass options on
        the first call for a given name.« bleibt.

     c. Zeile 117, Schlusshalbsatz. »…is ignored with a message on the
        console.« wird zu »…is ignored and reported at **error** level, as it is
        for `useProperty`.«

     d. Zeile 582, erster Halbsatz. »the second attempt is skipped and reported
        on the console« wird zu:

        ```markdown
        A module that two `extends` chains have in common is imported once; the second attempt is skipped and reported through the Kernel's `ConsoleLogger` at **warn** level, so the line shows where that logger's switches are on — see [Console Logger](#console-logger) — and stays off the console of an application in production.
        ```

     Sonst nichts an dieser Datei. Zeile 141 spricht davon, dass ein zweiter
     `provideContext()` seine Optionen ohne jede Meldung verwirft — das ist der
     Cache des Kontext-Signals, nicht der der Reader, und bleibt richtig. Der
     Abschnitt »Console Logger« (Zeile 2993 ff.) beschreibt den Mechanismus und
     nicht die einzelnen Aufrufstellen; die Tabelle aus Paket 1 (Zeile 3021–3026)
     wird von den vier Stellen oben referenziert statt neu ausformuliert, und der
     Satz in Zeile 3032 (»it changes nothing that prints unconditionally, this
     library's own error reports included«) deckt die beiden neuen
     Fehlermeldungen bereits ab. `docs/cheat-sheet.md`, `docs/guides.md`,
     `docs/concepts.md`, `docs/best-practices.md` und `README.md` des Pakets
     nennen weder die Deprecation noch die Doppel-Einfuhr — nachgesehen, nichts
     zu tun.

  8. **`packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`.** Zwei
     Einträge, beide als letzte Punkte von `### Bugfixes` (der Abschnitt endet
     vor `### Types`), in der Reihenfolge unten:

     ```markdown
     - **Bugfix (kernel):** the three console lines of the branch both environments share report through a `ConsoleLogger` instead of writing to `console` directly. The deprecated call form of `useProperty()`, `provideContext()`, `provideGlobalContext()`, `useContext()` and `useParentContext()` — a bare compare function where the options object belongs — and a `{compare}` passed to an already cached reader go out through `kernel.logger.error()`: both name a mistake in the calling code, and `error` is the one level this library leaves ungated, so the report arrives wherever the application runs rather than on `localhost` alone. The skipped second import of a module two `extends` chains have in common goes out through `kernel.logger.warn()` behind `isWarn`, because it describes the shape of a module graph and not a mistake. The affected entries in `docs/api-reference.md` name the level and point at the table of call against getter under Console Logger.
     - **Bugfix (kernel):** the deprecation report of the bare-compare call form falls once per Kernel and member name. The list of names already reported belongs to the Kernel, which hands it to every creation scope it builds; it used to live as long as the module, so an application running two Shadow Environments heard about the deprecated form from whichever of them got there first and from no other.
     ```

     Die Zählung im Vorspann von `## [Unreleased]` (»Fifty-two changes reach
     existing consumers«) bleibt unberührt, und unter
     `### ⚠️ Breaking Changes` entsteht kein Eintrag. Der Vorlauf hat dieselbe
     Sache an der Worker-Strecke (`2b121ac`) genauso behandelt: eine Zeile, die
     roh auf die Konsole ging und künftig über den Logger geht, ändert kein
     Programmverhalten, keinen Typ und keine Signatur. Wer das anders sieht,
     meldet es, statt den Eintrag anzulegen.

  9. **Nachlauf.** Nachgesehen und ohne Arbeit: außerhalb der beiden Specs
     dieses Pakets beobachtet keine Suite die drei Meldungen — weder
     `shadow-objects-testing` noch `shadow-objects-e2e` nennt eine von ihnen.
     `AGENTS.md` auf Veralterung prüfen: es nennt weder den
     `ConsoleLogger` noch die Deprecation der `isEqual`-Option, es ist also
     nichts nachzuziehen — die Prüfung gehört in den Report, nicht in die Datei.
     Kein `TODO`-Kommentar wird berührt (nachgesehen in allen sieben Dateien),
     `pnpm make:todo` entfällt. Unter `dist/` kommt keine Datei hinzu und fällt
     keine weg, `dist/package.json` behält seine Form:
     `src/distContract.files.txt` und `src/distContract.package.json` bleiben
     unverändert.

- Nachwirkung im Audit (für den Abschluss, kein offener Punkt dieses Pakets):
  TEST-007 und TEST-008 stehen beide auf `info`, liegen außerhalb der
  Scope-Regel und bleiben offene Findings — ihre Begründung überlebt dieses
  Paket aber nicht. Beide berufen sich auf die Modulflagge, die Schritt 3a
  entfernt: TEST-007 sagt, das Aufteilen der fünf Fälle sei versperrt, »solange
  die Deprecation-Warnung pro Realm und Methodenname nur einmal fällt«, und
  TEST-008 nennt die vorzeitig kippende Modulflagge als Grund der beiden
  Hilfskonstruktionen. Nach diesem Paket baut jeder Fall seinen eigenen Kernel
  und damit seine eigene Merkliste; die Sperre, auf die sich beide berufen, gibt
  es nicht mehr. Wer die Findings später anfasst, prüft sie gegen den neuen
  Stand, statt ihre Beschreibung zu glauben.
- Verify: `pnpm run ci` (baut, typprüft, fährt alle Tests außer den
  Playwright-E2E und schließt mit `pnpm lint:ci`). Erwartung gegen die Baseline:
  exit 0, `pnpm lint` weiterhin mit dem einen vorbestehenden Info-Hinweis, und
  die Fallzahl der Vitest-Suiten steigt gegenüber 1301 um genau die zwei Fälle
  aus Schritt 1 auf 1303 (801 + 123 + 379). Die E2E-Suite bleibt außen vor:
  dieses Paket fasst keine ihrer Dateien an, und keiner ihrer Fälle beobachtet
  Konsolenausgabe — `pnpm run ci` typprüft sie trotzdem mit.
- Commit: `fix(kernel): the creation API and the module import report through the console logger`
- Ergebnis: 2 Runden · CONS-019 behoben (alle drei rohen `console.warn` sind
  weg: `ShadowObjectCreationScope.ts:385` und `:362` über `this.#logger.error`,
  `importModule.ts:24-25` über `kernel.logger.warn` hinter `isWarn`; die
  Stufenwahl steht als Kommentar daneben) · CONS-001 behoben (die Merkliste
  hängt an `Kernel.ts:103` und wird über `Kernel.ts:758` in jeden Scope
  gereicht, `ShadowObjectCreationScope.ts` trägt keinen Modulzustand mehr) ·
  Regressionstests `useProperty: reports the deprecated call form to every
  kernel that meets it` und `keeps the skip of an already imported module
  behind the logger switch`, beide vor dem Fix rot (der rote Lauf zeigte drei
  statt zwei Fehlschläge: der neue Fall verbrauchte die Modul-Merkliste vor dem
  vorhandenen `useProperty`-Fall — genau die Reihenfolgeabhängigkeit, die dieses
  Paket auflöst) · `Kernel.spec.ts` kam als Nachzug der eigenen Änderung dazu,
  fünf Fälle des Blocks `cache-hit on creation-API helpers` horchten auf
  `console.warn` · Runde 2 richtete den einen `wichtig`
  (`Backlog.md:213` behauptete für die Cache-Hit-Meldung weiter `console.warn`) ·
  Verify `pnpm run ci` exit 0, 1303 Fälle (801 + 123 + 379), ein vorbestehender
  Info-Hinweis · drei `klein` bleiben stehen, alle drei plan-verbatim und
  deshalb nicht in die Fehlerkette gegeben: `CHANGELOG.md:361` erzählt im
  Nebensatz den Vorzustand (die Nachbareinträge der Datei tun es genauso),
  `Kernel.ts:99` sagt »rather than that of this module«, wobei »this module« in
  dieser Datei keinen Bezug hat, und der `afterEach`-Kommentar in
  `ShadowObjectCreationScope.spec.ts:31` spricht von »warning count«, während
  der Spy auf `console.error` sitzt
- Nebenbefunde: → Queue (2, beide an `Backlog.md`)
- Folgen: —
- Schnittstellen: `ShadowObjectCreationScope` nimmt einen vierten, pflichtigen
  Konstruktorparameter `shownDeprecations: Set<string>` — die Klasse wird weder
  aus `src/index.ts` noch aus `src/shadow-objects.ts` exportiert, der Vertrag
  nach außen bewegt sich also nicht; die beiden Aufrufstellen sind
  `Kernel.ts:758` und der Spec-Helfer `makeUnboundScope` · die Deprecation-
  Meldung der Creation-API und der abgelehnte zweite `compare` gehen über
  `kernel.logger.error()` und damit ungegatet, die übersprungene Doppel-Einfuhr
  über `kernel.logger.warn()` hinter `isWarn` — wer eine dieser drei Zeilen in
  einem Test beobachtet, horcht auf den Kanal des Loggers und liest den Wortlaut
  ab Argument 2, weil Badge und Styles davorstehen

**CONS-019 · low · packages/shadow-objects/src/in-the-dark/importModule.ts:19; src/in-the-dark/ShadowObjectCreationScope.ts:31 und :372** — Drei unabschaltbare console.warn im geteilten Kernel-Zweig

Die übersprungene Doppel-Einfuhr eines Moduls, die Deprecation-Warnung zur isEqual-Option und der
abgelehnte zweite compare an einem gecachten Signal schreiben roh auf console.warn. Der Zweig läuft in
beiden Umgebungen, und ShadowObjectCreationScope hält selbst einen ConsoleLogger (:57). Eine Anwendung,
die den Logger für die Produktion abschaltet, bekommt diese drei Zeilen trotzdem. Der Umbau trägt eine
Entscheidung in sich: ConsoleLogger.sharedConfig.enable ist außerhalb von localhost ausgeschaltet, und
eine Deprecation-Warnung, die genau dort schweigt, wo ein Consumer sie sehen müsste, ist keine Warnung
mehr.

Empfehlung: Die drei Zeilen über den vorhandenen ConsoleLogger führen und dabei die Stufe bewusst
wählen: logger.error für das, was ein Consumer sehen muss, weil es ungegatet druckt, logger.warn für
das, was nur in der Entwicklung zählt. Die Wahl gehört als Kommentar daneben.

**CONS-001 · info · packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:19-34** — Die Merkliste der Deprecation-Warnungen lebt am Modul, nicht am Kernel

Beim Re-Check dieses Laufs trug die im Vorgänger genannte Stelle (Kernel.ts:62-66) den Befund nicht:
dort stehen die Buchführungsfelder der Entities. Die Sache selbst steht in
ShadowObjectCreationScope.ts, und sie ist kleiner als beschrieben: eine einzige Modul-Menge
isEqualDeprecationShown merkt sich je Methodenname, ob die Warnung schon fiel. Sie lebt so lange wie
das Modul, nicht wie der Kernel, also sieht in einer Testsuite oder in einer Anwendung mit mehreren
Umgebungen nur der erste Aufrufer die Warnung. Der Kommentar darüber begründet die Feinheit der
Entdopplung, nicht die Lebensdauer, und die Spec-Datei hängt bereits an ihr: TEST-007 und TEST-008
beschreiben, wie ihre Fälle um die Modulflagge herumgebaut sind.

Empfehlung: Den Zustand an den Kernel oder die Registry hängen, dann verschwindet die
Reihenfolgeabhängigkeit der Fälle mit. Ist die realmweite Einmaligkeit gewollt, gehört genau dieser
Satz neben die Menge, damit der nächste Leser nicht wieder bei den Fällen anfängt.

### [x] 4. Das Canvas-Paket grüßt seine Consumer nicht mehr
- Findings: DX-002 (low)
- Ziel: Der publizierte Einstiegspunkt schreibt beim Import nichts mehr
  ungefiltert in die Konsole einer fremden Anwendung.
- Bereich: `packages/shae-offscreen-canvas/src/bundle.js` und `CHANGELOG.md`
  desselben Pakets, dazu die Zeilen in `Backlog.md`, die dieser Fix falsch
  macht; die `.npm-pkg`-Erwartung wird geprüft
- Hängt ab von: —
- Hash: b96ff80
- Modell: mittlere Stufe
- Effort: low
- Hinweis (aus Zug 0 von Paket 3): die Tabelle Stufe gegen Schalter aus Paket 1
  steht in `packages/shadow-objects/docs/api-reference.md`, also im anderen
  Paket — die Doku dieses Pakets (`docs/01-shadow-objects-api.md`) kann sie
  nicht als lokalen Anker verlinken. Die betroffene Zeile ist ein
  `console.debug`; einen `ConsoleLogger` führt das Paket anderswo bereits
  (`src/shadow-objects/ShaeOffscreenCanvas.js:33`).
- Hinweis (aus Zug 0 von Paket 3, nachgesehen): `.npm-pkg` publiziert neben
  `src/bundle.js` auch `src/worker-sample.js` und die drei Beispiel-Shadow-
  Objects unter `src/shadow-objects/sample/`, und die schreiben ebenfalls roh
  auf `console.debug`. Sie gehören trotzdem nicht in dieses Paket und sind kein
  Befund: `bundle.js:6` druckt beim bloßen Import des Einstiegspunkts, also
  ungefragt, während die vier anderen Zeilen erst laufen, wenn ein Consumer die
  Beispielmodule selbst importiert und benutzt — `bundle.js` zieht keines von
  ihnen herein. Beispielcode, der beim Ausführen redet, tut, was Beispielcode
  tut.
- Dateien:
  - `packages/shae-offscreen-canvas/src/bundle.js`
  - `packages/shae-offscreen-canvas/CHANGELOG.md`
  - `Backlog.md`
- Vorgehen:

  Vorbemerkung zur Wegwahl, damit sie nicht noch einmal aufgemacht wird. Die
  Empfehlung nennt zwei Ausgänge — streichen oder durch den `ConsoleLogger`
  führen —, und es gilt der erste. Ein gegateter Gruß bräuchte in einem Modul,
  das aus drei Seiteneffekt-Importen besteht, eine eigene Logger-Instanz und
  eine `isDebug`-Abfrage davor; sichtbar wäre er nur, wo
  `ConsoleLogger.sharedConfig.enable` und `.debug` beide anstehen, also auf
  localhost bei der Entwicklung dieses Pakets. Der Gegenwert ist eine Zeile
  ohne Auskunft. Dazu der Hausstand nebenan:
  `packages/shadow-objects/src/bundle.ts`, der Einstiegspunkt des Kernpakets,
  druckt nichts. Er setzt stattdessen `globalThis.SHADOW_ENTS_BUNDLE_LOADED`;
  eine solche Marke bekommt dieses Paket **nicht** — sie steht in keinem
  Befund, in keiner Doku und in keinem Vertrag.

  Vorbemerkung zum Regressionstest: es gibt keinen. Der Befund ist kein
  Korrektheitsfehler, sondern eine Zeile, die es nicht geben soll. Ein Test auf
  Schweigen beim Import müsste das Modul selbst importieren, damit das Custom
  Element im Testrealm registrieren, und er zöge `bundle.js` in die Coverage —
  gegen die Messung, die Schritt 5 braucht. Rot würde er außerdem, sobald
  irgendein Modul unterhalb der drei Importe aus eigenem Anlass einmal etwas
  druckt. Dass die Zeile weg ist, belegt der Diff.

  Vorbemerkung zur Sprache: `Backlog.md` ist durchgehend deutsch und bleibt es,
  `CHANGELOG.md` ist englisch und bleibt es. Die Konvention »Doku auf Englisch«
  meint die Projektdokumentation unter `docs/`, nicht dieses eine deutsche
  Arbeitsdokument; Paket 3 hat in `9c3abb7` dort ebenfalls deutsch geschrieben.

  1. **`packages/shae-offscreen-canvas/src/bundle.js`**: Zeile 6 und die leere
     Zeile 5 davor entfernen. Danach steht in der Datei genau das:

     ```js
     import '@spearwolf/shadow-objects/shae-ent.js';
     import '@spearwolf/shadow-objects/shae-worker.js';

     import './shae-offscreen-canvas.js';
     ```

     Die Datei endet **ohne** abschließenden Zeilenumbruch — `biome.json` führt
     `"trailingNewline": false` (`:40`), und heute endet sie bereits so. Wer
     einen anhängt, macht `pnpm lint:ci` rot.

  2. **`packages/shae-offscreen-canvas/CHANGELOG.md`**: einen Aufzählungspunkt
     ans Ende der Liste unter `## [Unreleased]` hängen, also hinter den Eintrag
     zu `three` als Peer-Dependency, der heute die letzte Zeile der Datei ist:

     ```markdown
     - Importing `@spearwolf/shae-offscreen-canvas` writes nothing to the console. `src/bundle.js` — the module `main`, `module` and the default condition of the `exports` map all point at — carries its three side-effect imports and nothing else.
     ```

     Der Vorspann von `## [Unreleased]` bleibt unangetastet: an der Einstufung
     »Next release: minor« ändert dieser Eintrag nichts, und ein
     Breaking-Change ist er nicht. Kein eigener `###`-Abschnitt — die Liste
     dieses Pakets ist flach.

  3. **`Backlog.md:407`**, der Aufzählungspunkt unter »Ergonomie-Feedback an die
     Kern-Lib« in §6. Er wird durchgestrichen und bekommt seine Auflösung, in
     der Form der beiden Nachbarzeilen:

     ```markdown
     - ~~`console.debug('hello … 🦄')` in `src/bundle.js` ist eine Log-Rauschen-Falle für Konsumenten.~~ ✅ Der Einstiegspunkt trägt nur noch seine drei Seiteneffekt-Importe; wer das Paket importiert, bekommt keine Zeile in seiner Konsole.
     ```

  4. **`Backlog.md:450`**, Punkt 26 in §7.4 — der Eintrag derselben Sache in der
     Prioritätenliste. Ebenso durchstreichen, und die Auflösung sagt zugleich,
     was mit Absicht bleibt, damit die Frage nicht wiederkommt:

     ```markdown
     26. ~~**Demo-`console.debug`-Statement** entfernen.~~ ✅ Erledigt — der Einstiegspunkt `src/bundle.js` druckt beim Import nichts mehr. Die vier `console.debug`-Zeilen in `src/worker-sample.js` und unter `src/shadow-objects/sample/` bleiben: sie laufen erst, wenn ein Konsument die Beispielmodule selbst importiert und benutzt.
     ```

  5. **`Backlog.md:320`**, die Zeile der Coverage-Tabelle in §4.2 zum Canvas-
     Paket. Sie nennt heute `bundle.js` unter den Modulen »bei 0 %«, und das
     ist eine gemessene Zahl, die dieser Fix bewegt: die Datei hatte genau eine
     Anweisung, nämlich die gestrichene (gemessen `0 % · 0/1`), und hat danach
     keine mehr. Also **nachmessen statt raten**:

     ```bash
     pnpm exec turbo run test --filter=@spearwolf/shae-offscreen-canvas
     ```

     In der v8-Zusammenfassung die Zeile zu `bundle.js` ablesen (dieselben
     Zahlen stehen danach in
     `packages/shae-offscreen-canvas/coverage/src/index.html`). Steht dort
     nicht mehr `0 %`, wird der Satzteil »`bundle.js`,
     `shae-offscreen-canvas.js` und `worker-sample.js` bei 0 %« so
     umgeschrieben, dass er die neue Zahl sagt und dabei stehen lässt, was
     weiter stimmt: keine Spec fasst `bundle.js` an. Steht dort weiterhin
     `0 %`, bleibt die Zeile unberührt.

     Für alle drei Backlog-Schritte gilt dabei dieselbe Auflage: **ersetzen,
     nicht einfügen** — eine Zeile bleibt eine Zeile, so wie jeder
     Aufzählungspunkt dieser Datei. »Offene Befunde« im Kopf dieses Plans
     verweist auf `Backlog.md:213` und `Backlog.md:314`, und beide Nummern
     halten nur, solange keine Zeile dazukommt oder wegfällt.

  6. **Was nicht angefasst wird**, jeweils nachgesehen und nicht vermutet:

     - Die vier rohen `console.debug` in `src/worker-sample.js:22` und unter
       `src/shadow-objects/sample/` — Beispielcode, der erst läuft, wenn ein
       Konsument ihn selbst importiert. Der Hinweis oben hat das entschieden.
     - `Backlog.md:213` und `Backlog.md:314`. Beide stehen in »Offene Befunde«
       mit dem Urteil `→ Audit` und gehören dem Abschluss, nicht diesem Paket.
       Sie liegen in derselben Datei, in der Schritt 3 bis 5 arbeiten — das ist
       der Grund, warum sie hier ausdrücklich stehen.
     - `src/distContract.files.txt` und `src/distContract.package.json`.
       `src/distContract.spec.js` vergleicht die Dateiliste unter `.npm-pkg`,
       die Form der `package.json` und die Auflösbarkeit der Einstiegspunkte —
       keine Dateiinhalte und keine Größen. Weder Liste noch Form bewegen sich.
     - `README.md` des Pakets und `docs/01-shadow-objects-api.md`. Keine der
       beiden Dateien erwähnt die Konsolenausgabe des Einstiegspunkts; `grep`
       auf `console` und `bundle` liefert in der Doku null Treffer.
     - `packages/shadow-objects/src/bundle.ts`. Die tote ESLint-Direktive
       darin gehört Paket 5.

  7. Vor dem Verify einmal den Formatter über die angefassten Dateien laufen
     lassen — `CHANGELOG.md` ist in `biome.json` von `files.includes`
     ausgenommen und bleibt außen vor:

     ```bash
     pnpm exec biome check --write packages/shae-offscreen-canvas/src/bundle.js Backlog.md
     ```

  8. Keine Finding-ID in irgendeiner geschriebenen Zeile — nicht im CHANGELOG,
     nicht im Backlog, nicht in der Commit-Message. Es gilt der Abschnitt
     »Konventionen« im Kopf dieses Plans.
- Verify: `pnpm run ci` (baut, typprüft, fährt alle Tests außer den
  Playwright-E2E und schließt mit `pnpm lint:ci` ab). Die E2E-Suite bleibt
  draußen: das Paket ändert eine Konsolenzeile und zwei Markdown-Dateien, kein
  Verhalten, gegen das ein Browser-Test läuft.
- Commit: `fix(canvas): the published entry point prints nothing when it is imported`
- Ergebnis: 1 Runde · DX-002 behoben — `packages/shae-offscreen-canvas/src/bundle.js`
  trägt nur noch seine drei Seiteneffekt-Importe, der Gruß beim Import ist weg ·
  kein Regressionstest, und das mit Absicht: der Befund ist kein
  Korrektheitsfehler, sondern eine Zeile, die es nicht geben soll (Begründung im
  Vorgehen oben) · `Backlog.md:320` nachgemessen statt geraten — `bundle.js`
  steht in der v8-Zusammenfassung weiterhin bei 0 %, die Zeile blieb unberührt ·
  `Backlog.md:407` und `:450` durchgestrichen samt Auflösung, je eine Zeile
  ersetzt · Verify `pnpm run ci` exit 0, 1303 Fälle (801 + 123 + 379), ein
  vorbestehender Info-Hinweis von Biome · kein Befund des Reviewers in keiner
  Kategorie
- Nebenbefunde: —
- Folgen: —

**DX-002 · low · packages/shae-offscreen-canvas/src/bundle.js:6** — Der publizierte Einstiegspunkt von
shae-offscreen-canvas schreibt beim Import in die Konsole

Ein console.debug mit einem Gruß steht ungefiltert in der Datei, auf die main, module und der
Default-Export der exports-Map zeigen. Jeder Consumer, der das Paket importiert, bekommt die Zeile in
seiner Konsole — auch in Produktion, auch ohne jede Logger-Konfiguration. Das Paket bringt mit
ConsoleLogger einen Mechanismus mit, der genau diese Frage beantwortet, und benutzt ihn an seiner
sichtbarsten Stelle nicht.

Empfehlung: Streichen, oder durch einen ConsoleLogger führen, der die geltende Gate-Logik anwendet. Ein
Gruß gehört nicht in die Konsole einer fremden Anwendung.

### [x] 5. Vier tote ESLint-Direktiven und vier tote ESLint-Konfigurationen verschwinden
- Findings: CONS-017 (info)
- Ziel: In einem Repository, das ausschließlich mit Biome lintet, steht weder
  eine Direktive noch eine Konfigurationsdatei für einen Linter, den es nicht
  gibt.
- Bereich: die vier `eslint-disable-next-line`-Zeilen unter
  `packages/shadow-objects/src/`, die vier verwaisten `.eslintrc.json` der
  Workspace-Pakete, das `CHANGELOG.md` der Wurzel und das des Kernpakets
- Hängt ab von: —
- Hash: 4d145b4
- Modell: mittlere Stufe
- Effort: low
- Dateien:
  - `packages/shadow-objects/src/bundle.ts`
  - `packages/shadow-objects/src/view/ShadowEnv.ts`
  - `packages/shadow-objects/src/view/ComponentContext.ts`
  - `packages/shadow-objects/src/utils/waitForMessageOfType.ts`
  - `packages/shadow-objects/.eslintrc.json` (wird gelöscht)
  - `packages/shadow-objects-testing/.eslintrc.json` (wird gelöscht)
  - `packages/shadow-objects-e2e/.eslintrc.json` (wird gelöscht)
  - `packages/shae-offscreen-canvas/.eslintrc.json` (wird gelöscht)
  - `CHANGELOG.md` (Wurzel)
  - `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:

  1. **Kein Regressionstest, und das ist Absicht.** Dieses Paket behebt keinen
     Korrektheitsfehler: es entfernt Kommentarzeilen, die kein Werkzeug liest,
     und Konfigurationsdateien, die kein Werkzeug lädt. Es gibt kein Verhalten,
     das vorher anders war, also auch keinen roten Lauf zu zeigen. Der Beleg
     dieses Pakets ist der Verify-Lauf am Ende.

  2. **Die vier Direktiven entfernen.** Genau die Kommentarzeile, sonst nichts
     an diesen Dateien:

     | Datei | Zeile | Wortlaut |
     | :--- | :--- | :--- |
     | `packages/shadow-objects/src/bundle.ts` | 6 | `  // eslint-disable-next-line no-var` |
     | `packages/shadow-objects/src/view/ComponentContext.ts` | 18 | `  // eslint-disable-next-line no-var` |
     | `packages/shadow-objects/src/view/ShadowEnv.ts` | 19 | `  // eslint-disable-next-line no-var` |
     | `packages/shadow-objects/src/utils/waitForMessageOfType.ts` | 24 | `    // eslint-disable-next-line prefer-const` |

     **Die Deklaration darunter bleibt in jedem der vier Fälle unverändert.**
     Die drei `var` stehen in einem `declare global`-Block, und `var` ist die
     einzige Schreibweise, mit der TypeScript eine ambiente globale Variable
     deklariert — `let` oder `const` erzeugen dort keine Eigenschaft an
     `globalThis`. Das `let listener` in `waitForMessageOfType.ts` wird ohne
     Initialisierung deklariert, von `cleanup()` in Zeile 27–31 geschlossen und
     erst in Zeile 47 zugewiesen; `const` ist dort nicht möglich.

     **Es tritt keine `biome-ignore`-Direktive an ihre Stelle.** Die Empfehlung
     des Audits stellt das unter den Vorbehalt »wo Biome dieselbe Regel führt«,
     und das ist an keiner der vier Stellen der Fall: am 2026-08-26 gegen
     `biome 2.5.9` gemessen, mit
     `pnpm exec biome lint --error-on-warnings` auf genau diese vier Dateien —
     `Checked 4 files. No fixes applied.`, keine Diagnose. `style/useConst`
     steht in `biome.json` auf `warn` und meldet das `let listener` nicht,
     `style/noVar` meldet die drei ambienten Deklarationen nicht. Wer hier
     vorsorglich eine Unterdrückung einsetzt, tauscht eine tote Direktive gegen
     die nächste.

  3. **Die vier verwaisten `.eslintrc.json` löschen**, mit `git rm`, damit die
     Löschung im Index steht:

     ```
     git rm packages/shadow-objects/.eslintrc.json \
            packages/shadow-objects-testing/.eslintrc.json \
            packages/shadow-objects-e2e/.eslintrc.json \
            packages/shae-offscreen-canvas/.eslintrc.json
     ```

     Warum sie zu diesem Paket gehören, obwohl sie im Audit nicht stehen: sie
     haben dieselbe Ursache wie die vier Direktiven. Die Umstellung auf Biome
     hat die Wurzel-Konfiguration entfernt (nachzulesen im `CHANGELOG.md` der
     Wurzel, Zeile 404) und die vier Paket-Konfigurationen stehengelassen; jede
     von ihnen besteht im Kern aus `"extends": ["../../.eslintrc.json"]` und
     zeigt damit auf eine Datei, die es nicht mehr gibt. Ein `eslint`-Lauf in
     einem dieser Pakete bräche am fehlenden `extends`-Ziel ab, statt irgendetwas
     zu prüfen. Das Audit hat sie nicht gesehen und schreibt in der Beschreibung
     von CONS-017 sogar das Gegenteil — »Eine ESLint-Konfiguration gibt es im
     Repository nirgends«. Ein Paket, das die Kommentare entfernt und die
     Konfigurationen stehenlässt, behebt dieselbe Ursache halb und liefert dem
     nächsten Audit vier Fundstellen, die dann wie ein vorbestehender Defekt
     ohne Vorgeschichte aussehen.

     Am Repository hängt an ihnen nichts. Am 2026-08-26 nachgesehen: kein
     `eslint` in irgendeiner `package.json` oder in `pnpm-workspace.yaml`, keine
     Nennung in `.github/`, keine in `.vscode/` oder `.editorconfig`, kein
     `files`-Feld, das sie in ein Paket-Tarball zöge, und keine Zeile in den
     vier `distContract`-Erwartungsdateien. Die einzigen verbleibenden
     Nennungen des Wortes sind historische und bleiben unangetastet: `CHANGELOG.md`
     der Wurzel Zeile 404 und 414, `docs/superpowers/specs/2026-05-09-build-system-renewal-design.md`
     Zeile 7, 23 und 57, dazu die Werkzeugtabellen in `AGENTS.md` Zeile 109 und
     `CLAUDE.md` Zeile 17 (»biome 2.5 (replaces eslint + prettier)«), die
     danach eher mehr stimmen als vorher.

  4. **`CHANGELOG.md` der Wurzel.** Ein neuer datierter Abschnitt, eingefügt
     zwischen Zeile 5 (»The format is loosely based on …«) und dem heutigen
     obersten Abschnitt `## 2026-08-24 — the two unpublished packages …`. Er
     trägt ausschließlich die vier Konfigurationsdateien — die vier Direktiven
     stehen im `CHANGELOG.md` des Kernpakets und werden hier nicht wiederholt:

     ```markdown
     ## 2026-08-26 — the repository carries no configuration for a linter it does not run
     ```

     Darunter ein Punkt, der die vier Pfade nennt und sagt: alle vier bestanden
     im Wesentlichen aus `extends` auf eine Wurzel-`.eslintrc.json`, die es im
     Repository nicht gibt, weshalb ein `eslint`-Aufruf in einem dieser Pakete
     am fehlenden Ziel gescheitert wäre statt zu prüfen; Lint und Format laufen
     über Biome, das einmal an `biome.json` konfiguriert ist und keine der vier
     Dateien liest; keine `package.json` und keine Workflow-Datei nennt `eslint`.

  5. **`packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`.** Ein Punkt
     unter `### Internal`, eingefügt direkt hinter dem vorhandenen Eintrag
     `- **Internal (kernel):** the Shadow Object Creation API is built by a unit
     of its own …` und vor `- **Packaging:**` — dort steht der alphabetisch
     sortierte Lauf des Abschnitts, und `Internal (lint)` gehört zwischen
     `Internal (kernel)` und `Packaging`. Der Eintrag beginnt mit
     `- **Internal (lint):**` und sagt: die vier
     `eslint-disable-next-line`-Kommentare in `src/bundle.ts`, `src/view/ShadowEnv.ts`,
     `src/view/ComponentContext.ts` und `src/utils/waitForMessageOfType.ts`
     sind entfernt; sie benannten Regeln (`no-var` dreimal, `prefer-const`
     einmal) eines Linters, den das Repository nicht führt; die Deklarationen
     darunter sind unverändert, weil ein `declare global`-Block `var` verlangt
     und `listener` erst nach der Closure zugewiesen wird; und es tritt keine
     `biome-ignore`-Direktive an ihre Stelle, weil Biome an keiner der vier
     Stellen etwas meldet. Kein Consumer sieht davon etwas.

     Der Vorspann von `## [Unreleased]` bleibt unangetastet, die Zählung dort
     steht weiter auf »Fifty-two«: dieses Paket erreicht keinen Consumer.

  6. **Was ausdrücklich nicht angefasst wird.**
     - `Backlog.md`. §5.3 »Lint / TS« nennt in Zeile 381 »209 geprüfte Dateien«,
       und Biome prüft nach diesem Paket 218 statt heute 222. Die Zeile ist
       trotzdem richtig: sie trägt »Gemessen 2026-08-21« und ist damit eine
       datierte Messung, keine laufende Behauptung — sie wird von einer späteren
       Änderung nicht falsch. Zeile 379 begründet abgeschaltete Biome-Regeln mit
       einem Verweis auf die alte ESLint-Konfiguration und bleibt als
       historische Begründung ebenfalls stehen. Kein Eintrag in `Backlog.md`
       wird von diesem Paket erledigt.
     - `AGENTS.md`. Auf Veralterung geprüft: die Werkzeugtabelle in Zeile 109
       nennt Biome als Ersatz für eslint und prettier und stimmt weiter. Nichts
       nachzuziehen.
     - `pnpm make:todo`. Keine der entfernten Zeilen ist ein `TODO`.
     - Die `distContract`-Erwartungsdateien. Unter `dist/` und `.npm-pkg/` kommt
       keine Datei hinzu und fällt keine weg; die vier gelöschten Dateien liegen
       in den Paketwurzeln, nicht in einem Build-Ausgabeverzeichnis.
     - `docs/` und `README.md` beider Pakete. Es ändert sich nichts an der
       öffentlichen API; der Logger, die Elemente und die Wire-Typen bleiben,
       wie sie sind.

- Verify: `pnpm run ci` (baut, typprüft, fährt alle Tests außer den
  Playwright-E2E und schließt mit `pnpm lint:ci`). Erwartung gegen den Stand
  nach Paket 4: exit 0, unverändert 1303 Fälle (801 shadow-objects, 123
  shae-offscreen-canvas, 379 shadow-objects-testing) — das Paket legt keinen
  Test an und nimmt keinen weg —, und weiterhin genau der eine vorbestehende
  Info-Hinweis von Biome zur anstehenden Konfigurationsmigration. Biome prüft
  dabei 218 statt 222 Dateien. Die E2E-Suite bleibt außen vor: entfernt werden
  Kommentare, die kein Werkzeug liest, und Konfigurationsdateien, die kein
  Werkzeug lädt; ein Browser-Test kann davon nichts beobachten.
- Commit: `chore(lint): nothing in the repository configures or silences a linter it does not run`
- Ergebnis: 1 Runde · CONS-017 behoben — die vier `eslint-disable-next-line`
  sind fort (`bundle.ts:6`, `ComponentContext.ts:18`, `ShadowEnv.ts:19`,
  `waitForMessageOfType.ts:24`), die Deklarationen darunter unverändert, keine
  `biome-ignore` an ihrer Stelle · dazu die vier verwaisten `.eslintrc.json`
  derselben Ursache gelöscht · kein Regressionstest, weil kein Verhalten
  betroffen ist (Schritt 1 des Vorgehens) · Verify `pnpm run ci` exit 0, 1303
  Fälle (801 + 123 + 379), Biome prüft 218 statt 222 Dateien, ein
  vorbestehender Info-Hinweis · kein Befund des Reviewers in keiner Kategorie;
  er hat die Vollständigkeit nachgemessen und findet außerhalb gitignorter
  Coverage-Artefakte keine Nennung von `eslint` mehr
- Nebenbefunde: —
- Folgen: —

**CONS-017 · info · packages/shadow-objects/src/view/ShadowEnv.ts:19; src/bundle.ts:6; src/view/ComponentContext.ts:18; src/utils/waitForMessageOfType.ts:24** — Vier tote ESLint-Direktiven in einem Repository, das nur mit Biome lintet

An vier Stellen steht ein eslint-disable-next-line, dreimal für no-var, einmal für prefer-const.
Eine ESLint-Konfiguration gibt es im Repository nirgends; Lint und Format sind ausschließlich Biome.
Die Zeilen unterdrücken nichts und lesen sich für den nächsten Leser wie eine bewusste Ausnahme von
einer Regel, die niemand stellt.

Empfehlung: Die vier Zeilen entfernen. Wo Biome dieselbe Regel führt und die Ausnahme gewollt ist,
tritt eine biome-ignore-Direktive mit Begründung an ihre Stelle.
