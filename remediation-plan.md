# Remediation-Plan — @spearwolf/shadow-objects (Monorepo)

Quelle: ./audit.html vom 2026-08-28 · Branch: main · erstellt: 2026-08-29
Baseline: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test:ci` ✓
(Coverage 93,56 % Statements / 88,97 % Branches)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/58660371-cf25-4d39-a67d-f6327f15b600/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 19 von 47 Findings — der komplette Bereich »Code & Laufzeit« (4 niedrig, 15 Info) · ausgenommen: Bereich »Projekt-Harness« (28 Findings), acknowledged
Scope-Regel: alles aus dem Bereich »Code & Laufzeit« — jede Severity, jede Kategorie. Gilt auch für Befunde, die erst im Lauf auffallen: liegt der Befund im Laufzeit- oder Bibliothekscode der Pakete (`packages/*/src/`, `packages/*/test/`, `packages/*/docs/`, die Paket-CHANGELOGs), ist er Arbeit dieses Laufs. Alles, was das Gerüst betrifft — Build, CI, Testrunner, Lint-Konfiguration, Monorepo-Skripte, Testabdeckung als solche —, geht als neues Finding ins Audit.
Stand (2026-08-30): abgeschlossen. Vierzehn Pakete, vierzehn Commits, jedes in einer Runde; kein Paket blockiert, »Offene Befunde« leer. Voller Verify-Lauf nach dem letzten Paket grün auf allen vier Kommandos (Coverage 93,63 % Statements / 89,18 % Branches, gegen 93,56 / 88,97 in der Baseline). Keine Versionsanhebung: beide Pakete heben die Version in eigenen Release-Commits, und der `[Unreleased]`-Abschnitt von `packages/shadow-objects/CHANGELOG.md` weist die nächste Veröffentlichung bereits als minor aus (`0.33.0` → `0.34.0`) — dort ist der Banner um die zwei Breaking-Einträge dieses Laufs ergänzt und die Zahl auf sechzig gezogen. `./audit.html` nachgeführt: Score 92 → 94, Bereich Code & Laufzeit 98 → 100, 19 Findings geschlossen, 2 neu (CONS-021, CLEAN-018).

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen

- `ShadowObjectCreationScope.tearDown()` zieht die Primary-Runde nach, solange
  die Menge wächst; ein `onDestroy()` aus einem Cleanup heraus läuft damit
  tatsächlich, wie Reader, Links und Provider aus derselben Stelle es schon tun
  (2026-08-29)
- Die Eigenschaftsslots `timeouts` und `logger` werden zur Laufzeit geschlossen
  (Getter ohne Setter), statt die Lücke in der Doku zu beschreiben. Eine
  Zuweisung wirft danach im Strict Mode (2026-08-29)
- `Kernel.getEntityGraph()` weist eine ausgelassene Rückkante additiv am
  Elternknoten aus; die Rückgabesignatur `EntityGraphNode[]` bleibt, kein
  Aufrufer muss angefasst werden (2026-08-29)
- `propsEqual()` wird samt seinen zehn Spec-Fällen gestrichen; kommt ein
  Aufrufer, kommt sie mit ihm zurück (2026-08-29)
- `filterUndefinedProps()` bekommt genau eine Form für »nichts«: `undefined`.
  Ein leeres Ergebnis kommt nicht mehr als leeres Array zurück (2026-08-29)
- Wandern `MaxWorkerTimeout` und `isTimeout` nach
  `src/utils/waitForMessageOfType.ts`, sagt der CHANGELOG-Eintrag über ihre
  Erreichbarkeit: »Neither symbol is re-exported from `index.ts` or reachable
  through the `exports` map.« Eine Aussage über die *Module* wäre falsch —
  `src/index.ts:18` re-exportiert `./view/RemoteWorkerEnv.js`; unerreichbar sind
  allein die beiden Symbole, die von dort nur importiert und nicht
  weitergereicht werden. Nachgeprüft am 2026-08-29 gegen `src/index.ts` und das
  `exports`-Feld der `package.json` (2026-08-29)
- Paket 2 wird nach dem Abbruch vollständig neu gefahren; der Stash
  `paket-2-abgebrochen` mit der Arbeit aus Runde 1 ist verworfen. Der
  Regressionstest wird also erneut rot gesehen (2026-08-29)
- Drain-Runde: die fünf verbliebenen `readonly logger`-Slots werden alle zur
  Laufzeit geschlossen — `Kernel`, `<shae-worker>`, `<shae-prop>`, `<shae-ent>`
  und `MessageRouter`. Eine Bauart im ganzen Paket statt zwei; das Risiko liegt
  bei fremden Subklassen der beiden Elemente, die `this.logger` beschreiben, und
  wird bewusst getragen (2026-08-30)
- Drain-Runde: der Verlust einer Eigenschaft, die nur ihren Schlüssel nennt
  (`reCreateChanges()` und die Eigenschaftsdarstellung in `ComponentChanges`),
  geht als neues Finding in die `./audit.html` und bekommt einen eigenen Lauf.
  Der Fix ist eine Repräsentationsentscheidung im Change Trail, an der Naht
  zwischen View und Worker, und damit kein Aufräumpaket (2026-08-30)
- Drain-Runde: auskommentierte Diagnose in Testdateien wird gestrichen wie im
  Quelltext, in beiden betroffenen Paketen. Damit zählt `packages/*/test/` zur
  Scope-Regel; die Zeile oben ist entsprechend ergänzt (2026-08-30)

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

Projektspezifisch, aus `CLAUDE.md` und `AGENTS.md`:

- Doku ist Teil des öffentlichen API-Vertrags. Eine Änderung an der
  öffentlichen Oberfläche führt `docs/`, `README.md` **und** `CHANGELOG.md` des
  betroffenen Pakets im selben Schritt nach — `packages/shadow-objects/` für
  die Kernbibliothek, `packages/shae-offscreen-canvas/` für das Canvas-Element.
  Neues geht unter `## [Unreleased]`.
- Reine Gerüst-Änderungen (Build, CI, Lint, Monorepo-Skripte) gehören ins
  Wurzel-`CHANGELOG.md` — in diesem Lauf ist das nicht zu erwarten.
- Verbotene Analogien: »shadow theater«, »puppet«, »puppeteer«, »light world«,
  »screen«. Es gilt die ECS-Terminologie: Entity, Component, Kernel, View,
  Token.
- Doku und Code-Kommentare in Englisch, Doku als Markdown.
- Lint und Format sind ausschließlich Biome, Konfiguration im Wurzelverzeichnis.
- Ändert sich ein `TODO`-Kommentar, wird `pnpm make:todo` mitgefahren.
- Ändert sich Dateiliste oder Form von `dist/`, werden
  `src/distContract.files.txt` und `src/distContract.package.json` im selben
  Schritt nachgeführt.

## Verify

Pro Paket, in dieser Reihenfolge: `pnpm lint` · `pnpm typecheck` ·
`pnpm build` · `pnpm test:ci`.
`pnpm test` (mit `shadow-objects-e2e`) läuft nicht mit: die Playwright-Browser
sind Voraussetzung und auf dieser Maschine braucht WebKit einen Zusatzschritt.
Das Paket steht damit außerhalb der Baseline; wer es anfasst, prüft es von Hand.

**Mit `TURBO_FORCE=true` fahren.** Der Implementierer eines Pakets fährt das Verify
selbst und füllt damit den turbo-Cache. Der Verify-Lauf danach trifft auf einen
Cache-Hit, meldet `FULL TURBO` und gibt in Sekunden genau den Lauf des
Implementierers wieder — also seine Behauptung, nicht deren Beleg. Die Variable
kostet bei diesem Projekt keine drei Minuten und ist der Unterschied zwischen
geprüft und abgeschrieben.

## Vorbestehende Fehler

Keine. Alle vier Verify-Kommandos waren vor Lauf-Beginn grün.

## Offene Befunde

Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

- [x] `packages/shadow-objects/src/in-the-dark/Kernel.ts:78` und
  `src/elements/ShaeWorkerElement.ts:59` — beide führen ein `readonly logger`, das nur zur
  Übersetzungszeit hält, während `docs/api-reference.md:2642` (»`ConsoleLogger` (readonly)«) und
  `:1897` (»read-only«) dem Leser eine Zusage geben, die zur Laufzeit niemand einlöst. Dieselbe
  Bauart tragen `src/elements/ShaePropElement.ts:91`, `src/elements/ShaeEntElement.ts:144` (beide
  `protected`, an `docs/api-reference.md:2040-2042` als für Subklassen erreichbar beschrieben) und
  `src/worker/MessageRouter.ts:74` (undokumentiert, nicht öffentlich). Aus Zug 0 von Paket 5, das
  dieselbe Lücke an `RemoteWorkerEnv` und `ShadowEnv` schließt; Severity info — anders als bei
  `timeouts` hängt an einem geschriebenen Logger keine Korrektheit, nur die Frage, wohin
  Diagnosezeilen gehen. → Scope (liegt in `packages/*/src/`). Ob und wie weit die fünf Slots
  geschlossen werden, entscheidet die Drain-Runde mit allen fünf vor Augen — ein einzelnes Paket
  sähe immer nur einen davon.
  **Verbleib (2026-08-30):** alle fünf Slots werden geschlossen → Paket 12.
- [x] `packages/shadow-objects/src/view/ComponentContext.ts:824-827` — `reCreateChanges()` verliert
  eine Eigenschaft, die nur ihren Schlüssel nennt. `ComponentMemory` hält die Einträgerform
  `['foo']` treu (`applyPropsChanges` baut sie so nach, gepflockt von `props-utils.spec.ts:92` und
  `:98`), und `ComponentPropertiesType` (`types.ts:23-31`) liest sie als »gesetzt, ohne Wert«,
  ausdrücklich verschieden von `['foo', undefined]` = »Wert ist weg«. Die Schleife destrukturiert
  aber `const [key, value] of cMem.properties`, sodass ein solcher Eintrag als
  `changes.changeProperty(key, undefined, …)` in den neuen Trail geht; `ComponentChanges` führt
  seine Eigenschaften als `Map<string, unknown>` und wirft beim Bauen des Create-Eintrags
  (`ComponentChanges.ts:357`) jeden `undefined`-Wert heraus — der Schlüssel fällt ganz weg. Aus Zug
  0 von Paket 6, dort beim Nachsehen der Aufrufer von `filterUndefinedProps()` aufgefallen;
  vorbestehend, unverändert seit `df9f9b9`. Severity info: kein Weg im Paket schreibt die
  Einträgerform (`types.ts:27` sagt das ausdrücklich), sie kommt nur aus einem Change Trail, den ein
  Aufrufer selbst zusammensetzt, und sie beißt erst, wenn ein Context verlorengeht und neu gebaut
  wird. → Scope (liegt in `packages/*/src/`). Für die Drain-Runde zur Größe: der Fix endet nicht an
  `:821` — `ComponentChanges` kann »gesetzt, ohne Wert« in seiner Map derzeit gar nicht darstellen.
  Paket 8 hat in derselben Datei gearbeitet, aber an drei anderen Ursachen, und dabei
  `reCreateChanges()` um vier Zeilen nach unten geschoben; die Adressen oben gelten für den Stand
  `da7143e` — `reCreateChanges()` beginnt an `:806`, die destrukturierende Schleife steht an
  `:824`. Die verlässliche Adresse bleibt das Symbol. Die Stellen in `ComponentMemory`,
  `props-utils.spec.ts`, `types.ts` und `ComponentChanges.ts` hat Paket 8 nicht berührt.
  **Verbleib (2026-08-30):** geht als neues Finding in die `./audit.html`, eigener Lauf.
- [x] `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts:141,143-146,159,163-166,180,181` —
  auskommentierte Diagnose in einem Testfall: zwei `console.log`-Blöcke über die gefundenen Shadow
  Objects, eine Zeile über `truthyProps` und `propKeys`, dazu zweimal die tote Typzusicherung
  `// as unknown as {name: string}[];` am Ende einer Zuweisung. Dieselbe Ursache wie CLEAN-009 und
  CLEAN-010 aus Paket 9, dieselbe Kategorie, eine andere Dateiklasse. Aus Zug 0 von Paket 9, beim
  Abgleich der Finding-Beschreibung gefunden; vorbestehend — an `df9f9b9`, dem Stand vor dem ersten
  Paket-Commit dieses Laufs, stehen dieselben Zeilen unter denselben Nummern. Severity info: die
  Datei wird nie ausgeliefert, der Schaden endet beim Leser. → Scope (liegt in
  `packages/*/src/`, und dieser Lauf hat Spec-Dateien dort schon bearbeitet — Paket 6 hat eine
  ganze Spec-Gruppe gestrichen, Paket 1 eine neue angelegt). Für die Drain-Runde: daran hängt eine
  Entscheidung, die alle Fundstellen zugleich betrifft. Ein auskommentierter `console.log` in einem
  Test ist ein Schalter, den der Eigentümer dieses Tests umlegt; ob dieses Projekt solche Schalter
  führen will, entscheidet man einmal und nicht je Fundstelle. Die beiden Typzusicherungen sind
  davon unabhängig tot.
  **Verbleib (2026-08-30):** wird gestrichen → Paket 13, zusammen mit dem Eintrag darunter.
  Zug 0 von Paket 13 hat in derselben Datei fünf weitere Stellen derselben Ursache gefunden und
  mit hineingenommen: die auskommentierten Felder `name` an `:99`, `:104` und `:109`, die zu den
  beiden `console.log`-Blöcken gehören, sowie an `:3440` eine tote `expect`-Zeile samt dem
  Kommentar darüber (`:3438`), der sie beschreibt und der laufenden Zeile widerspricht.
- [x] `packages/shadow-objects-testing/test/build-change-trail.test.js:36,44,131,191`,
  `test/change-props.test.js:35,64,91` und `test/send-events.test.js:38,71` — neun auskommentierte
  `console.log`-Zeilen, die Change Trails ausgeben. Dieselbe Ursache wie der Eintrag darüber und
  dieselbe Entscheidung. Aus Zug 0 von Paket 9; vorbestehend, an `df9f9b9` nachgesehen. Severity
  info. → Rückfrage: die Scope-Regel greift hier nicht eindeutig. Ihre Wegliste nennt `packages/*/src/`,
  `packages/*/docs/` und die Paket-CHANGELOGs — `packages/shadow-objects-testing/test/` steht in
  keiner davon. Ihre Gerüst-Liste nennt Build, CI, Testrunner, Lint-Konfiguration,
  Monorepo-Skripte und Testabdeckung als solche — diese Dateien sind keines davon, sondern
  Integrationstests der Bibliothek in einem Paket, das der Lauf sonst nie anfasst. Beide Hälften
  der Regel gehen daneben.
  **Verbleib (2026-08-30):** die Scope-Regel ist um `packages/*/test/` ergänzt, damit im Scope → Paket 13.
- [x] `packages/shadow-objects-e2e/src/bundle.ts:4-10` und
  `packages/shadow-objects-e2e/src/bundle.worker.ts` — eine nicht zu Ende geführte Umstellung, in
  zwei Hälften. In `bundle.ts` stehen ein Kommentar über den Vorzustand (»the worker is now
  integrated in bundle.js, so we no longer need it here«), zwei auskommentierte `import`-Zeilen und
  eine auskommentierte Zuweisung an `ShadowWorker.createWorker`. Die Datei, auf die sie zeigen,
  `src/bundle.worker.ts`, hat schon heute keinen Importeur: die einzige Nennung im ganzen Paket ist
  die auskommentierte Zeile `bundle.ts:8`, und `vite.config.js` nimmt als Einstiegspunkte nur die
  HTML-Seiten unter `pages/` und `index.html`. Drei Zeilen lang, darunter ein
  `console.log('hejsan!')`. Aus Zug 0 von Paket 9; vorbestehend, an `df9f9b9` nachgesehen:
  `bundle.ts` steht dort Zeichen für Zeichen so da. Severity niedrig — dieselbe, die CLEAN-009
  demselben Sachverhalt im Quelltext gibt. → Scope (liegt in `packages/*/src/`, und das
  Paket steht mit `playwright.config.ts` ohnehin in diesem Lauf). Für die Drain-Runde zur Größe:
  die beiden Hälften gehören in eine Entscheidung, und die zweite davon ist das Löschen einer
  Datei, nicht das Streichen einer Kommentarzeile — deshalb hat Paket 9 die erste Hälfte nicht
  nebenbei mitgenommen.
  **Verbleib (2026-08-30):** beide Hälften werden erledigt → Paket 14.

## Pakete

### [x] 1. ConsoleLogger: die Loopback-Erkennung exakt vergleichen
- Findings: SEC-003 (niedrig)
- Ziel: Der Schalter, der über jede Diagnosezeile des Frameworks entscheidet, greift genau auf die Loopback-Adressen und auf keinen fremden Namen, der zufällig so anfängt.
- Hash: 7c121ab
- Ergebnis: 1 Runde · SEC-003 behoben — `ConsoleLogger.ts:6-14` vergleicht `location.hostname`
  exakt gegen `{'localhost', '127.0.0.1', '::1', '[::1]'}` · Regressionstest
  `src/utils/ConsoleLogger.location.spec.ts`, sechs Fälle unter »loopback detection«, davon drei
  vor dem Fix rot (`localhost.example.com` lieferte `true`, `127.0.0.1` und `[::1]` lieferten
  `false`) · Doku `docs/api-reference.md` an den vier Stellen (2350, 2507, 2630, 3151) nachgezogen,
  Menge unter der Tabelle ausgeschrieben · CHANGELOG-Eintrag unter `## [Unreleased]` · Review-Runde
  1 zog zwei Kommentare in `src/elements/ShaePropElement.ts` (291, 470) mit, die denselben Satz
  trugen wie die korrigierten Doku-Stellen, und nahm die Vorher-Nachher-Erzählung aus dem
  CHANGELOG-Satz · Verify neu gerechnet statt aus dem turbo-Cache gespielt, exit 0, Coverage
  93,56 % Statements / 89,02 % Branches
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine. `LOOPBACK_HOSTNAMES` und `IS_LOOPBACK_HOST` bleiben modulprivat —
  `src/index.ts` re-exportiert `ConsoleLogger.ts` nicht, und der Unterpfad
  `@spearwolf/shadow-objects/ConsoleLogger.js` gibt beide nicht heraus. Die öffentliche
  Oberfläche des Pakets ist unverändert; verändert hat sich allein, für welche Hosts
  `ConsoleLogger.sharedConfig.enable` beim Laden des Moduls auf `true` steht.

### [x] 2. waitForMessageOfType: die Frist auf einen brauchbaren Wert prüfen
- Findings: ASYNC-006 (info)
- Ziel: Eine Frist, die weder positiv noch endlich ist, führt zu einer Ablehnung, die sagt was falsch war, statt zu einem Timer, der sofort mit `timeout: NaN` feuert.
- Hash: 08b7956
- Ergebnis: 1 Runde · ASYNC-006 behoben — `waitForMessageOfType.ts:38-45` weist als Erstes im
  Promise-Executor, vor der `signal?.aborted`-Prüfung, jede Frist mit einem `TypeError` ab, die
  weder `0` noch `Infinity` noch ein Wert von 1 bis `MaxWorkerTimeout` ist · Regressionstest
  `src/utils/waitForMessageOfType.spec.ts:98-141`, Block »a deadline no timer can keep«, zehn
  Fälle, davon vier vor dem Fix rot (`NaN`, `-1`, `2_147_483_648`, `'nope'` lieferten je einen
  `WorkerTimeoutError` statt eines `TypeError`); die beiden Pflock-Fälle `0` und `Infinity` waren
  vor und nach dem Umbau grün · `MaxWorkerTimeout` und `isTimeout` samt JSDoc wörtlich aus
  `RemoteWorkerEnv.ts` nach `src/utils/waitForMessageOfType.ts` verschoben und dort exportiert,
  `resolveTimeouts()` unverändert · CHANGELOG-Eintrag wörtlich wie vorgegeben, eine Zeile unter
  `## [Unreleased]` → `### Internal` zwischen `**Internal (worker):**` und `**Packaging:**` ·
  Review-Runde 1 ohne Befund, weder zur Erfüllung noch zur Qualität · Verify neu gerechnet
  (0 von 5 Aufgaben aus dem Cache), exit 0, Coverage 93,56 % Statements / 89,11 % Branches
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `MaxWorkerTimeout` und `isTimeout` stehen nicht mehr in
  `src/view/RemoteWorkerEnv.ts`, sondern werden aus `src/utils/waitForMessageOfType.ts`
  exportiert; wer sie braucht, importiert von dort. Modulprivat wie zuvor — `src/index.ts`
  reicht keines der beiden Symbole weiter, und `src/utils/waitForMessageOfType.js` steht in
  keinem Pfad der `exports`-Map. Die öffentliche Oberfläche des Pakets ist unverändert.

### [x] 3. Teardown: ein onDestroy aus dem Abbau heraus wird mitgenommen
- Findings: CONS-018 (info)
- Ziel: `tearDown()` zieht die Primary-Runde nach, solange sie wächst — ein Callback, den ein Cleanup dort noch bucht, läuft, statt still zu verfallen.
- Hash: 0b705fd
- Ergebnis: 1 Runde · CONS-018 behoben — `ShadowObjectCreationScope.ts:317-346` fährt die beiden
  Cleanup-Mengen `#unsubscribePrimary` und `#unsubscribeSecondary` in Runden, bis keine mehr etwas
  zu laufen hat; eine zweite Menge `alreadyRun` hält jeden Callback bei genau einem Lauf, die
  beiden Rundenergebnisse werden getrennt gehalten und erst danach verodert · Regressionstest
  `reaches an onDestroy callback a cleanup books while the teardown is under way`
  (`ShadowObjectCreationScope.spec.ts:724-757`), vor dem Fix rot mit »the callback a cleanup booked
  runs: expected "vi.fn()" to be called 1 times, but got 0 times«; der Reviewer hat den roten Lauf
  gegen `HEAD` selbst nachgestellt statt ihn abzuschreiben · `docs/api-reference.md:443-446`
  (Abschnitt »The creation API past the teardown«) und ein Bullet unter `## [Unreleased]` →
  `### Bugfixes` nachgeführt · Review-Runde 1 ohne Befund zur Erfüllung; ein Befund `klein`, nicht
  behoben: der Kommentar bei `ShadowObjectCreationScope.ts:326` endet auf »…does not terminate, and
  never did«, und dieser Halbsatz ist ein Rückblick auf den Vorzustand, den die »Konventionen«
  ausschließen — er stimmt zudem nur innerhalb einer Menge, über die Mengengrenze hinweg wird die
  Nichtterminierung erst mit den Runden erreichbar; ein Satzende nach `does not terminate` räumt
  beides ab · Verify neu gerechnet (0 von 5 Aufgaben aus dem Cache), exit 0, Coverage 93,58 %
  Statements / 89,14 % Branches
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine. `runCleanups` ist eine lokale Closure in `tearDown()`, keine Signatur hat
  sich bewegt, `debugCleanupCounts` und `debugHandles` liefern dieselben Werte. Verändert hat sich
  allein, dass ein Cleanup, der während des Teardowns noch `onDestroy()` bucht, gelaufen wird — und
  dass, was dieser Callback seinerseits nimmt, vor der Rückkehr freigegeben wird. Die Freigaben aus
  `#unsubscribeContextFeeds` fallen weiterhin hinter allen Cleanup-Callbacks.

### [x] 4. getEntityGraph: die ausgelassene Rückkante ausweisen
- Findings: API-001 (info)
- Ziel: Wer mit dem Werkzeug einen kaputten Baum untersucht, sieht am Knoten, welches Kind der Abstieg ausgelassen hat, statt einen intakten Baum.
- Hash: 5fe43f7
- Ergebnis: 1 Runde · API-001 behoben — `Kernel.ts:242-272` (`#getEntityGraphNode()`) sammelt jedes
  ausgelassene Kind in einem `omittedChildren`-Vermerk am Elternknoten, mit Grund
  `not-in-kernel` oder `already-in-graph`; die nicht exportierte Schnittstelle
  `OmittedGraphChild` steht unter `EntityGraphNode`, das Feld ist optional und wird
  hineingespreizt, statt als leeres Array dazustehen · Wächter-Reihenfolge umgedreht: der
  Kernel-Lookup steht jetzt vor der `visited`-Prüfung, damit eine freigegebene Entity an jedem
  Elternteil genannt wird, der sie listet, und `visited` nur für eine Entity wächst, die
  wirklich in den Graphen kommt · `getEntityGraph()` übergibt keinen Sammler, die oberste Ebene
  bleibt ohne Vermerk · Regressionstests in `Kernel.spec.ts`, `describe('getEntityGraph')`: der
  vorhandene Fall `terminates when a children list points back at an ancestor` erweitert, dazu
  `names a child the kernel no longer holds` und `names the same missing child at every parent
  that lists it` — diese drei vor dem Fix rot (je »expected undefined to deeply equal [ {…} ]«),
  der Pflock `leaves omittedChildren off a node over a healthy tree` vor und nach dem Umbau grün ·
  der Reviewer hat den roten Lauf gegen `HEAD` selbst nachgestellt statt ihn abzuschreiben ·
  `docs/api-reference.md` an beiden Stellen nachgeführt (`#### getEntityGraph()` und
  `#### Entity Graph Inspection`), ein Bullet unter `## [Unreleased]` → `### New` als
  `**New (kernel):**` mit der Erreichbarkeitsaussage über `Kernel` und `EntityGraphNode` ·
  Review-Runde 1 ohne Befund, weder zur Erfüllung noch zur Qualität · Verify neu gerechnet
  (0 von 5 Aufgaben aus dem Cache), exit 0, Coverage 93,61 % Statements / 89,21 % Branches
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine exportierte. `OmittedGraphChild` und `EntityGraphNode` stehen beide ohne
  `export` in `Kernel.ts` und werden genauso nach `dist/src/in-the-dark/Kernel.d.ts` emittiert;
  ein Konsument erreicht das neue Feld über den Rückgabewert von `Kernel.getEntityGraph()` und
  den strukturellen Typ, nicht über einen Import. Die Signatur `getEntityGraph(): EntityGraphNode[]`
  ist unverändert, kein Aufrufer muss angefasst werden. Modulprivat geändert hat sich die
  Signatur von `#getEntityGraphNode()`: dritter, optionaler Parameter für den Sammler.

### [x] 5. timeouts und logger: den Eigenschaftsslot zur Laufzeit schließen
- Findings: API-007 (info)
- Ziel: Die Zusage der Doku gilt auch außerhalb von TypeScript — eine Zuweisung an `env.timeouts` oder `env.logger` geht nicht mehr durch.
- Hash: f902948
- Ergebnis: 1 Runde · API-007 behoben — `RemoteWorkerEnv.ts:206-222` und `ShadowEnv.ts:64-69`
  führen `#logger` beziehungsweise `#timeouts` als privates Feld mit einem Getter ohne Setter
  darüber; `RemoteWorkerEnv` friert das Timeout-Objekt im Konstruktor weiterhin ein, sodass beide
  Hälften geschlossen sind · Regressionstests im Block `the property slots that hold no setter`
  (`RemoteWorkerEnv.spec.ts:1123-1182`, vier Fälle, und `ShadowEnv.spec.ts:1538-1560`, zwei Fälle),
  alle sechs vor dem Umbau rot — die Zuweisungsfälle mit »expected function to throw an error, but
  it didn't«, die Deskriptor-Fälle mit »expected 'undefined' to be 'function'«; die Pflöcke
  `hand out the same object on every read` vor und nach dem Umbau grün · der Reviewer hat den roten
  Lauf per Stash-Probe gegen den Vorzustand selbst nachgestellt statt ihn abzuschreiben ·
  `docs/api-reference.md` an beiden Zeilen (1200 und 1579) nachgeführt, CHANGELOG an den drei
  vorgesehenen Stellen unter `## [Unreleased]`, der neue Punkt unter `### ⚠️ Breaking Changes` ·
  eine folgenlose Abweichung vom Detailplan: der Konstruktor übergibt `this.logger` statt
  `this.#logger` an `resolveTimeouts()` — derselbe Wert über den Getter, der Feldinitialisierer
  steht davor · Review-Runde 1 ohne Befund, weder zur Erfüllung noch zur Qualität · Verify neu
  gerechnet (0 von 5 Aufgaben aus dem Cache), exit 0, Coverage 93,62 % Statements / 89,21 % Branches
- Nebenbefunde: keine neuen. Der Eintrag über die fünf weiteren `readonly logger` derselben Bauart
  stammt aus Zug 0 dieses Pakets und steht in »Offene Befunde«.
- Folgen: keine. Keine Unterklasse der beiden Klassen im Repository, keine Zuweisung an `.logger`
  oder `.timeouts` außerhalb der beiden Konstruktoren, `IShadowObjectEnvProxy` deklariert keinen der
  beiden Namen.
- Schnittstellen: `RemoteWorkerEnv.timeouts`, `RemoteWorkerEnv.logger` und `ShadowEnv.logger` sind
  Getter auf dem Prototyp statt eigener Felder der Instanz. Lesen und Typ sind unverändert —
  `timeouts` liefert weiter `Readonly<WorkerTimeouts>`, `logger` einen `ConsoleLogger`, und jeder
  Zugriff gibt dasselbe Objekt zurück. Zwei Dinge sind neu: eine Zuweisung wirft im Strict Mode
  einen `TypeError`, und die drei Namen fehlen in `Object.keys(env)`, in einem `{...env}`-Spread und
  in `JSON.stringify(env)`. Beide Klassen stehen in `src/index.ts:18-19`, ein Konsument trifft die
  Änderung also direkt. Der Konstruktor ist für `timeouts` der eine Weg hinein, und
  `resolveTimeouts()` prüft dort jeden der vier Werte.

### [x] 6. props-utils: eine Form für »nichts«, und weg mit dem Rest
- Findings: CONS-020 (info), CLEAN-015 (info), CLEAN-017 (info)
- Ziel: `filterUndefinedProps()` meldet »nichts« nur noch als `undefined`, `propsEqual()` verschwindet samt Spec, und der verbliebene Kommentar erklärt die geltende Regel statt den Vorzustand.
- Hash: 694520a
- Ergebnis: 1 Runde · alle drei Findings behoben — `props-utils.ts:3-9`
  (`filterUndefinedProps()`) gibt `undefined` zurück, wo der Filter keinen Eintrag stehen lässt,
  der Wächter auf die leere Eingabeliste geht in dieser Prüfung auf; `props-utils.ts:30-31` trägt
  statt des Kommentars zum Vorzustand die geltende Regel über die Stelligkeit eines Eintrags;
  `propsEqual()` samt seinem Spec-Block und dem Namen in der Import-Zeile gestrichen (87 Zeilen
  raus, 24 rein) · Regressionstests `reports nothing as undefined when the filter empties the
  list`, `reports nothing as undefined when a create leaves no property standing` und `reports
  nothing as undefined when the changes empty a standing list` in `props-utils.spec.ts`, alle drei
  vor dem Fix rot mit »expected [] to be undefined«; der Reviewer hat den roten Lauf gegen den
  Vorzustand selbst nachgestellt statt ihn abzuschreiben, die Pflöcke `props undefined`,
  `props are empty`, `should work as expected` und `keeps a bare key` standen vor und nach dem
  Umbau grün · JSDoc von `applyPropsChanges()` um den Satz zur einen Form ergänzt,
  CHANGELOG-Punkt wörtlich wie vorgegeben unter `## [Unreleased]` → `### Internal` zwischen dem
  `waitForMessageOfType()`-Punkt und `**Packaging:**` · `docs/`, `README.md` und die beiden
  distContract-Dateien bleiben unangetastet, jeweils nachgesehen: kein Pfad der `exports`-Map und
  keine Zeile in `src/index.ts` führt auf `src/utils/props-utils.js`, die Dateiliste unter `dist/`
  ist unverändert · Abweichung von der Empfehlung wie im Detailplan beschlossen: der Wert wird auf
  eine Form verengt, der Rückgabetyp nicht — ein nicht-leeres Tupel bräuchte an der Stelle, an der
  die Invariante entsteht, eine Zusicherung, die der Compiler nicht prüft, und
  `ComponentState.properties` löschte die Verengung eine Grenze weiter ohnehin wieder ·
  Review-Runde 1 ohne Befund, weder zur Erfüllung noch zur Qualität · Verify neu gerechnet
  (0 von 5 Aufgaben aus dem Cache), exit 0, Coverage 93,62 % Statements / 89,18 % Branches
- Nebenbefunde: keine neuen. Der Eintrag an `ComponentContext.ts:820-823` stammt aus Zug 0 dieses
  Pakets und steht in »Offene Befunde«.
- Folgen: keine. `ComponentContext.ts:820` (`if (cMem.properties)`) ist der einzige Leser von
  `ComponentState.properties` im Paket; ein geleertes Ergebnis kommt dort als `undefined` an, der
  Wächter greift statt durchzulassen, und beide Wege laufen null Runden. Kein Spec-Fall im
  Repository erwartet an dieser Stelle ein leeres Array.
- Schnittstellen: keine exportierte. `props-utils.ts` steht weder in `src/index.ts` noch in einem
  Pfad der `exports`-Map, die öffentliche Oberfläche des Pakets ist unverändert. Modulintern
  entfällt der Export `propsEqual()` — kein Aufrufer im Repository —, und `filterUndefinedProps()`
  sowie das durchreichende `applyPropsChanges()` antworten auf ein leeres Ergebnis mit `undefined`
  statt mit `[]`. Wer eine dieser beiden Funktionen künftig ruft, prüft auf `undefined` und nicht
  auf `.length`.


### [x] 7. Registry: das ungelesene Feld streichen, die Kommentare in Deckung bringen
- Findings: CLEAN-014 (info), CLEAN-016 (info)
- Ziel: Der Auflösungsvorrat führt kein Feld mehr mit, das niemand liest, und die beiden Kommentare über sein Wachstum sagen dasselbe und das Richtige.
- Bereich: `packages/shadow-objects/src/in-the-dark/Registry.ts`
- Hängt ab von: —
- Hash: af3b4cc
- Ergebnis: 1 Runde · CLEAN-014 und CLEAN-016 behoben — `Registry.ts` führt `RegistryEntry` nicht
  mehr; `#registry` ist `Map<string, ShadowObjectConstructor[]>`, `#truthyPropRoutes` ist
  `Map<string, Set<string>>`, der Token steht in beiden Fällen allein im Schlüssel, und
  `toPropRoute()` gibt ihn nicht mehr mit heraus · die beiden Kommentare an `#resolvedTokens`
  (`:51-62`) und `#resolutionKey()` (`:114-120`) rechnen denselben Schlüsselraum: die Routen mal
  den geordneten Teilmengen der routenden Property-Namen, ∑ C(n,k)·k!, also 2/5/16/65 für
  n = 1…4 · kein Regressionstest, beide Findings ohne Verhaltensanteil; Beleg ist die
  unangetastete `Registry.spec.ts`, 14 von 14 grün · CHANGELOG-Punkt wörtlich wie vorgegeben
  unter `## [Unreleased]` → `### Internal`, zwischen dem vorhandenen `**Internal (registry):**`-
  und dem `**Internal (kernel):**`-Punkt · `docs/`, `README.md` und die beiden
  distContract-Dateien unangetastet, wie im Detailplan begründet · Review-Runde 1 ohne Befund,
  weder zur Erfüllung noch zur Qualität · Verify neu gerechnet (0 von 5 Aufgaben aus dem Cache),
  exit 0, Coverage 93,62 % Statements / 89,18 % Branches
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine. `RegistryEntry` und `toPropRoute()` trugen kein `export`, beide Maps sind
  `#`-privat, und `dist/src/in-the-dark/Registry.d.ts` gibt die Klasse weiterhin mit `#private;`
  heraus — die Deklaration ist Byte für Byte dieselbe. Kein Aufrufer außerhalb der Datei ist
  betroffen, die öffentliche Oberfläche des Pakets ist unverändert.
- Modell: mittlere Stufe
- Effort: low
- Dateien: `packages/shadow-objects/src/in-the-dark/Registry.ts`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen: Jeder Schritt nennt den Text, der dasteht, und den Text, der danach dastehen soll.
  Die Zeilennummern gelten für `Registry.ts` vor dem ersten Schritt; wer von oben nach unten
  arbeitet, verschiebt sie. Nichts außerhalb der genannten Stellen wird angefasst.

  1. `Registry.ts:9` — `toPropRoute()` gibt den Token nicht mehr mit heraus. Aus

     ```ts
     const toPropRoute = (route: string): undefined | {key: string; prop: string; token?: string} => {
       const parts = route.split('@').map((part) => part.trim());
       if (parts.length === 2 && parts[1]) {
         return parts[0] ? {key: `${parts[0]}@${parts[1]}`, prop: parts[1], token: parts[0]} : {key: parts[1], prop: parts[1]};
       } else {
         return undefined;
       }
     };
     ```

     wird

     ```ts
     const toPropRoute = (route: string): undefined | {key: string; prop: string} => {
       const parts = route.split('@').map((part) => part.trim());
       if (parts.length === 2 && parts[1]) {
         return parts[0] ? {key: `${parts[0]}@${parts[1]}`, prop: parts[1]} : {key: parts[1], prop: parts[1]};
       } else {
         return undefined;
       }
     };
     ```

     Der ternäre Ausdruck bleibt: die beiden Zweige unterscheiden sich weiterhin im `key`.

  2. `Registry.ts:41` — der Wert der Map ist die Routenmenge selbst, wie bei `#routes` eine
     Zeile darüber. Aus

     ```ts
     readonly #truthyPropRoutes = new Map<string, {routes: Set<string>; token?: string | undefined}>();
     ```

     wird

     ```ts
     readonly #truthyPropRoutes = new Map<string, Set<string>>();
     ```

  3. `Registry.ts:75-80` — die Prop-Route-Hälfte von `appendRoute()` folgt der neuen Form. Aus

     ```ts
           const knownPropRoutes = this.#truthyPropRoutes.get(propRoute.key);
           if (knownPropRoutes) {
             addRoutes(knownPropRoutes.routes, routes);
           } else {
             this.#truthyPropRoutes.set(propRoute.key, {routes: new Set(routes), token: propRoute.token});
           }
     ```

     wird

     ```ts
           const knownPropRoutes = this.#truthyPropRoutes.get(propRoute.key);
           if (knownPropRoutes) {
             addRoutes(knownPropRoutes, routes);
           } else {
             this.#truthyPropRoutes.set(propRoute.key, new Set(routes));
           }
     ```

  4. `Registry.ts:161-164` und `:172-175` — die beiden Lesestellen in `#resolveTokens()`. Aus

     ```ts
             const propRoutes = this.#truthyPropRoutes.get(prop);
             if (propRoutes) {
               addRoutes(tokens, propRoutes.routes);
             }
     ```

     wird `addRoutes(tokens, propRoutes);`, und aus

     ```ts
               const keyedRoutes = this.#truthyPropRoutes.get(`${token}@${prop}`);
               if (keyedRoutes) {
                 addRoutes(tokens, keyedRoutes.routes);
               }
     ```

     wird `addRoutes(tokens, keyedRoutes);`. Beide Wächter bleiben stehen.

  5. `Registry.ts:4-7`, `:24-30`, `:39` und `:61-69` — dieselbe Doppelung trägt die zweite Map:
     `#registry` ist nach Token geschlüsselt und legt den Token im Wert noch einmal ab. Nach dem
     Streichen bliebe `RegistryEntry` eine Hülle um ein einziges Feld, also fällt sie mit.

     `interface RegistryEntry { … }` (`:4-7`) wird ersatzlos gestrichen. Aus

     ```ts
     const addConstructors = (entry: RegistryEntry | null | undefined, constructors: Set<ShadowObjectConstructor>) => {
       if (entry != null) {
         for (const c of entry.constructors) {
           constructors.add(c);
         }
       }
     };
     ```

     wird

     ```ts
     const addConstructors = (known: ShadowObjectConstructor[] | null | undefined, constructors: Set<ShadowObjectConstructor>) => {
       if (known != null) {
         for (const c of known) {
           constructors.add(c);
         }
       }
     };
     ```

     Aus `readonly #registry = new Map<string, RegistryEntry>();` (`:39`) wird
     `readonly #registry = new Map<string, ShadowObjectConstructor[]>();`. Aus

     ```ts
       define(token: string, constructa: ShadowObjectConstructor) {
         const entry = this.#registry.get(token);
         if (entry) {
           appendTo(entry.constructors, constructa);
         } else {
           this.#registry.set(token, {token, constructors: [constructa]});
         }
         this.#dropResolvedTokens();
       }
     ```

     wird

     ```ts
       define(token: string, constructa: ShadowObjectConstructor) {
         const constructors = this.#registry.get(token);
         if (constructors) {
           appendTo(constructors, constructa);
         } else {
           this.#registry.set(token, [constructa]);
         }
         this.#dropResolvedTokens();
       }
     ```

     `findConstructors()` (`:203`, `addConstructors(this.#registry.get(token), constructors)`),
     `hasToken()`, `hasRoute()` und `clear()` bleiben Zeichen für Zeichen, wie sie sind.

  6. `Registry.ts:51-58` — der Kommentar über `#resolvedTokens` rechnet den Schlüsselraum aus.
     Der ganze Block wird ersetzt durch:

     ```ts
       // The store of resolved tokens: outer key is the route, inner key is built from the properties.
       // Two levels so that the route name works as a key unchanged and needs no escaping anywhere.
       //
       // It has no upper bound and evicts nothing, and it lives exactly as long as the registry that owns
       // it -- for the default registry, that is the lifetime of the process. What holds it small is its
       // key space: the routes times the ordered subsets of the routing property names, because the key
       // names only the properties some rule routes on, and names them in the caller's order. For n such
       // names that is the sum over k of C(n, k) * k! keys per route -- 2 for one name, 5 for two, 16 for
       // three, 65 for four -- and #routingProps, which supplies n, never gives a name back. Both counts
       // are fixed by the module manifests a registry is built from, and a manifest declares a handful of
       // routes and one or two routing properties, so n stays small where the growth in it is steep.
     ```

  7. `Registry.ts:114-118` — der Kommentar über `#resolutionKey()` nennt denselben Preis und
     verweist für die Summe auf Schritt 6. Die ersten fünf Zeilen des Blocks werden ersetzt
     durch:

     ```ts
       // The key is built in the caller's property order, not sorted. The order of the properties decides
       // the order of the tokens in the result, and that in turn the order in which the kernel builds the
       // shadow objects. A sorted key would map two differently ordered questions onto one answer and so
       // change the build order for one of them. Caller order keeps the behaviour character for character
       // and pays in entries: a question over k routing properties can arrive in k! orders and fills one
       // entry per order, where a sorted key would fill one for all of them. What that comes to over the
       // whole store is at #resolvedTokens.
     ```

     Der Absatz darunter (`// Each name follows its own length, …`) bleibt unverändert stehen,
     samt der `//`-Leerzeile davor.

  8. `packages/shadow-objects/CHANGELOG.md` — ein Punkt, wörtlich. Er steht unter
     `## [Unreleased]` → `### Internal`, unmittelbar hinter dem vorhandenen Punkt, der mit
     **Internal (registry):** beginnt (derzeit Zeile 426), und unmittelbar vor dem Punkt, der mit
     **Internal (kernel):** beginnt. Der Abschnitt ist die verlässliche Adresse, nicht die Zahl:

     ```markdown
     - **Internal (registry):** the two maps inside the `Registry` hold what a lookup reads and nothing beside it. The routes for a truthy property are the route set itself, and the constructors defined under a token are the constructor array itself; the token stands in the key of both maps and is not carried a second time in the value. The two comments on the resolved-token store agree on what its key space costs: the routes times the ordered subsets of the routing property names, which for three such names is 16 keys per route, and the set of names any rule routes on only ever grows. Nothing on the surface moves — the same methods with the same results, byte-identical declarations, and an unchanged published file list.
     ```

  9. Nicht angefasst wird: `docs/`, `README.md`, `src/distContract.files.txt`,
     `src/distContract.package.json`, `Registry.spec.ts` und das Wurzel-`CHANGELOG.md`.
     Begründung im Einzelnen unter »Warum das reicht« weiter unten. Kein `TODO`-Kommentar
     liegt in der Datei, also läuft `pnpm make:todo` nicht mit.
- Kein Regressionstest: beide Findings sind `info` und ohne Verhaltensanteil — ein geschriebenes
  und nie gelesenes Feld zu streichen und zwei Kommentare zu berichtigen ändert keinen Rückgabewert
  und keine Reihenfolge. Der Beleg ist die vorhandene `Registry.spec.ts` (14 Fälle über beide Maps,
  Prop-Routen und `clear()`), die unverändert grün bleiben muss. Wer sie anfasst, hat den Umbau
  falsch gemacht.
- Verify: `TURBO_FORCE=true pnpm lint && TURBO_FORCE=true pnpm typecheck && TURBO_FORCE=true pnpm build && TURBO_FORCE=true pnpm test:ci`
- Commit: `refactor(registry): the token lives in the key alone, and the comments count the key space`
**Warum das reicht — die Entscheidungen dieses Zug 0**

- **`RegistryEntry.token` kommt mit ins Paket.** Der Audit-Befund nennt nur den Token in
  `#truthyPropRoutes`. Zwei Zeilen darüber trägt `#registry` dieselbe Bauart: nach Token
  geschlüsselt, den Token im Wert noch einmal abgelegt (`:5` deklariert, `:66` geschrieben,
  nirgends gelesen — beide Maps sind `#`-privat, Lesestellen kann es also nur in dieser Datei
  geben, und es gibt keine). Dieselbe Ursache, dieselbe Datei, ein Commit. Drei Stellen aus einer
  Ursache sind ein Paket; die zweite stehen zu lassen hieße, sie beim nächsten Audit erneut zu
  lesen.
- **Die Hüllen fallen mit.** Nach dem Streichen trägt der Wert beider Maps nur noch ein Feld —
  `{routes: Set<string>}` und `{constructors: ShadowObjectConstructor[]}`. Beide waren nur dazu
  da, den Token neben der Nutzlast unterzubringen. `#truthyPropRoutes` bekommt damit dieselbe Form
  wie `#routes` eine Zeile darüber, und `#registry` die Form, die `addConstructors()` ohnehin
  auspackt. Kein Feld, kein Typ und keine Methode der öffentlichen Oberfläche bewegt sich dabei.
- **Beide Kommentare rechnen zu klein, nicht nur einer.** Der Schlüssel ist die geordnete
  Teilmenge der routenden Property-Namen in der Reihenfolge des Aufrufers: pro Route also
  ∑ C(n,k)·k! Schlüssel, für n = 1…4 also 2, 5, 16, 65. `:56` sagt »permutations« und meint
  damit n! = 6 für n = 3; `:117` sagt »at most a second entry« und trifft nur, solange höchstens
  zwei Properties gleichzeitig routen — eine Teilmenge der Größe k kommt in k! Reihenfolgen an.
  Die Empfehlung des Audits (»eine der beiden zur richtigen machen«) geht davon aus, dass eine
  stimmt; keine stimmt. Also trägt der Kommentar an `#resolvedTokens` die Summe, und der an
  `#resolutionKey()` den Preis pro Frage und einen Verweis auf die Summe.
- **Keine Doku, kein README, kein Contract.** `Registry` ist über
  `@spearwolf/shadow-objects/shadow-objects.js` öffentlich, aber nichts an dieser Änderung erreicht
  die Oberfläche: `RegistryEntry` und `toPropRoute()` tragen kein `export`, beide Maps sind
  `#`-privat, und `dist/src/in-the-dark/Registry.d.ts` gibt die Klasse mit `#private;` heraus — die
  Deklaration bleibt Byte für Byte dieselbe. Keine Datei kommt unter `dist/` hinzu oder fällt weg,
  also bleiben `src/distContract.files.txt` und `src/distContract.package.json` unangetastet;
  `src/distContract.spec.ts` bestätigt das im Verify. `docs/` und `README.md` beschreiben die
  Registry nur über ihre Methoden und nennen weder Schlüsselraum noch Wachstum (nachgesehen mit
  `grep -rn "permutation\|key space\|second entry\|routing propert" docs/ README.md`: keine
  Fundstelle). Der CHANGELOG-Punkt steht trotzdem: der Rumpf von `dist/src/in-the-dark/Registry.js`
  ändert sich, und dieser Lauf führt interne Änderungen dort mit.
- **Restplan unverändert.** `Registry.ts` steht in keinem der Pakete 8 bis 11 und in keinem der
  beiden Einträge unter »Offene Befunde«. Keine Reihenfolge, kein Schnitt, kein `Hängt ab von`
  bewegt sich.

**CLEAN-014 · info · packages/shadow-objects/src/in-the-dark/Registry.ts:41,59** — Ein Feld der Registry wird geschrieben und von niemandem gelesen
Der Wert in #truthyPropRoutes führt neben routes ein Feld token, das appendRoute() schreibt (:59) und keine Lesestelle abfragt: die drei Leser (:57, :102, :113) greifen ausschließlich auf .routes zu, und das Feld ist privat, also von außen nicht erreichbar. Der Token steckt ohnehin im Schlüssel der Map (token@prop), aus dem toPropRoute ihn gewonnen hat.
Empfehlung: Das Feld streichen. Wer den Token braucht, hat ihn im Schlüssel.

**CLEAN-016 · info · packages/shadow-objects/src/in-the-dark/Registry.ts:56,117** — Zwei Kommentare am Auflösungsvorrat der Registry widersprechen einander
:117 sagt »Caller order costs at most a second entry«, was ab drei routenden Properties nicht mehr stimmt. :56 nennt den Schlüsselraum »routes times the permutations«, wo es geordnete Teilmengen sind — ∑ C(n,k)·k!, für n=3 also 16 statt 6. Die beiden widersprechen einander; das Verhalten berühren sie nicht.
Empfehlung: Eine der beiden Beschreibungen zur richtigen machen und die andere darauf ziehen. Ein Kommentar über Wachstum, der zu klein rechnet, lädt zum nächsten Cache ohne Obergrenze ein.

### [x] 8. ComponentContext: drei Stellen, die den Leser in die Irre führen
- Findings: CLEAN-012 (info), CLEAN-013 (info), CONS-019 (info)
- Ziel: Die Fehlermeldung an den Konsumenten steht im richtigen Numerus, der Optional-Chain behauptet keine Lücke mehr, die der Typ ausschließt, und der Doc-Kommentar nennt seine beiden Aufrufer.
- Bereich: `packages/shadow-objects/src/view/ComponentContext.ts`
- Hängt ab von: —
- Hash: da7143e
- Ergebnis: 1 Runde · CLEAN-012, CLEAN-013 und CONS-019 behoben — `ComponentContext.ts:378` wirft
  für einen Elternteil, den dieser Context nicht führt, jetzt »…because this context does not hold
  it« und trägt damit den Wortlaut, den `docs/api-reference.md:1030` seit jeher nennt, ohne
  Ausrufezeichen wie die beiden Nachbarwürfe an Konsumenten; `moveToRoot()` (`:350`) greift auf
  `childEntry.changes` unbedingt zu wie die anderen sechzehn Zugriffsstellen der Datei, der Wächter
  `if (childEntry !== undefined)` bleibt; die Doc-Kommentare von `dispatchReRequestParentRoots()`
  und `dispatchReRequestParentSiblings()` nennen die beiden Wege, die in der Bibliothek dort enden,
  und begründen die Öffentlichkeit der Methoden selbst statt per Verweis · kein Regressionstest,
  alle drei Findings ohne Verhaltensanteil; Beleg ist die unangetastete `ComponentContext.spec.ts`,
  75 von 75 grün · CHANGELOG-Punkt wörtlich wie vorgegeben unter `## [Unreleased]` → `### Internal`,
  zwischen dem `**Internal (registry):**`- und dem `**Internal (kernel):**`-Punkt · `docs/`,
  `README.md`, die beiden distContract-Dateien und die Zahl im Vorspann unangetastet, wie im
  Detailplan begründet, vom Reviewer nachgeprüft statt geglaubt · Review-Runde 1 ohne Befund, weder
  zur Erfüllung noch zur Qualität · Verify neu gerechnet (0 von 5 Aufgaben aus dem Cache), exit 0,
  Coverage 93,62 % Statements / 89,18 % Branches
- Nebenbefunde: keine neuen. Der Eintrag an `reCreateChanges()` in derselben Datei stammt aus Zug 0
  von Paket 6 und steht unverändert in »Offene Befunde«.
- Folgen: keine
- Schnittstellen: keine. Keine Signatur bewegt sich, `ComponentContext` gibt dieselben Methoden mit
  denselben Ergebnissen heraus. Für einen Konsumenten ändert sich zweierlei, beides ohne
  Typwirkung: der Wortlaut des `Error`, den `addToChildren()` für einen nicht geführten Elternteil
  wirft — wer auf den alten Text geprüft hat, prüft ins Leere —, und der Text der beiden
  Doc-Kommentare, die `tsc` wörtlich nach `dist/src/view/ComponentContext.d.ts` emittiert und die
  ein Editor daher anzeigt.
- Modell: mittlere Stufe
- Effort: low
- Dateien: `packages/shadow-objects/src/view/ComponentContext.ts`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen: Jeder Schritt nennt den Text, der dasteht, und den Text, der danach dastehen soll.
  Die Zeilennummern gelten für `ComponentContext.ts` auf dem Stand `af3b4cc`, vor dem ersten
  Schritt; Schritt 3 macht die Datei um zwei Zeilen länger und Schritt 4 um eine, wer von oben
  nach unten arbeitet, verschiebt also die Nummern darunter. Nichts außerhalb der genannten
  Stellen wird angefasst.

  Die Codeblöcke in Schritt 3 und 4 tragen die fünf Leerzeichen der Aufzählung zusätzlich zur
  eigenen Einrückung der Datei: dort beginnt jede Kommentarzeile mit drei Leerzeichen, einem
  Stern und einem Leerzeichen. »Aus« und »wird« sind gleich eingerückt, der Unterschied
  zwischen beiden ist also genau der Text.

  1. `ComponentContext.ts:350` — der Optional-Chain in `moveToRoot()` fällt weg. Aus

     ```ts
         childEntry.changes?.setParent(undefined);
     ```

     wird

     ```ts
         childEntry.changes.setParent(undefined);
     ```

     Der umgebende Wächter `if (childEntry !== undefined)` bleibt: er trägt den einen Fall, den
     es wirklich gibt.

  2. `ComponentContext.ts:378` — die Meldung von `addToChildren()`. Aus

     ```ts
           throw new Error(`the view component ${parent.uuid} cannot have a child added to it because the component do not exist!`);
     ```

     wird

     ```ts
           throw new Error(`the view component ${parent.uuid} cannot have a child added to it because this context does not hold it`);
     ```

     Die neue Zeile ist 129 Zeichen lang, `biome.json` steht auf `lineWidth: 130` — sie bleibt
     also einzeilig. Sollte Biome sie wider Erwarten umbrechen, gilt, was `pnpm lint` daraus
     macht.

  3. `ComponentContext.ts:537-540` — der letzte Absatz des Doc-Kommentars von
     `dispatchReRequestParentRoots()`. Aus

     ```ts
        * Delivery is immediate: the round is over by the time the call returns. Nothing inside the
        * library calls it — an entity that has just arrived hands its round to the collector
        * below — and it stays because running a round at a moment of one's own choosing is what this
        * method is for.
     ```

     wird

     ```ts
        * Delivery is immediate: the round is over by the time the call returns. Two paths inside the
        * library end here — {@link ComponentContext.dispatchReRequestParentSiblings} for a component
        * without a parent, whose candidate set is the roots, and the delivery of a collected round for
        * that same set. What does not come this way is an entity that has just arrived: it hands its
        * round to the collector below. The method is public because running a round at a moment of
        * one's own choosing is what it is for.
     ```

     Die drei Absätze darüber (`* Inform all root components …` bis `* it re-asks the element
     tree, and whoever answers first wins.`) bleiben unverändert stehen, samt der `*`-Leerzeile
     davor.

  4. `ComponentContext.ts:587-588` — der letzte Absatz des Doc-Kommentars von
     `dispatchReRequestParentSiblings()`. Er verweist auf den Satz, den Schritt 3 ersetzt, und
     trägt seinen Grund danach selbst. Aus

     ```ts
        * Delivery is immediate, and nothing inside the library calls it — it stays for the
        * same reason {@link ComponentContext.dispatchReRequestParentRoots} does.
     ```

     wird

     ```ts
        * Delivery is immediate, and nothing inside the library calls it: like
        * {@link ComponentContext.dispatchReRequestParentRoots} it is public so that a round can be run
        * at a moment of one's own choosing.
     ```

     Alles darüber im selben Kommentarblock bleibt unverändert.

  5. `packages/shadow-objects/CHANGELOG.md` — ein Punkt, wörtlich. Er steht unter
     `## [Unreleased]` → `### Internal`, unmittelbar hinter dem Punkt, der mit
     **Internal (registry):** beginnt und mit »the two maps inside the `Registry`« weitergeht
     (derzeit Zeile 427), und unmittelbar vor dem Punkt, der mit **Internal (kernel):** beginnt.
     Der Abschnitt und die beiden Nachbarpunkte sind die verlässliche Adresse, nicht die Zahl:

     ```markdown
     - **Internal (view):** three places in `ComponentContext` say what the code does. The `Error` that `addToChildren()` throws for a parent this context does not hold reads `the view component <uuid> cannot have a child added to it because this context does not hold it`, which is the condition the class reference already names for that method. `moveToRoot()` reaches its change trail the way every other method in the class does, without an optional chain over a slot every `ViewInstance` carries. The doc comment on `dispatchReRequestParentRoots()` names the two paths inside the library that end there — `dispatchReRequestParentSiblings()` for a component without a parent of its own, and the delivery of a collected round for that same candidate set — and that comment travels into `dist/src/view/ComponentContext.d.ts`, so it is what an editor shows a consumer. Nothing on the surface moves — the same methods with the same results, the same signatures, and an unchanged published file list.
     ```

  6. Nicht angefasst wird: der Vorspann von `## [Unreleased]` samt seiner ausgeschriebenen Zahl,
     `docs/`, `README.md`, `src/distContract.files.txt`, `src/distContract.package.json`,
     `ComponentContext.spec.ts` und das Wurzel-`CHANGELOG.md`. Begründung im Einzelnen unter
     »Warum das reicht« weiter unten. Kein `TODO`-Kommentar liegt in der Datei, also läuft
     `pnpm make:todo` nicht mit.
- Kein Regressionstest: alle drei Findings sind `info` und ohne Verhaltensanteil. Der
  Meldungstext wird von keiner Spec und keiner Doku-Zeile behauptet — repository-weit gibt es
  genau eine Fundstelle, die Quellzeile selbst. Der Optional-Chain ist ein toter Zweig:
  `ViewInstance.changes` ist im Interface (`:15`) nicht optional, die einzige Anlegestelle
  (`:234`) setzt eine frische `ComponentChanges`, und die einzige weitere Schreibstelle (`:829`,
  `reCreateChanges()`) setzt wieder eine — nullish wird der Slot auf keinem Weg. Ein Kommentar
  hat ohnehin keinen. Der Beleg ist die vorhandene `ComponentContext.spec.ts` mit 75 Fällen, die
  unverändert grün bleiben muss; am 2026-08-29 gegen `af3b4cc` einzeln gefahren: 75 passed. Wer
  sie anfasst, hat den Umbau falsch gemacht.
- Verify: `TURBO_FORCE=true pnpm lint && TURBO_FORCE=true pnpm typecheck && TURBO_FORCE=true pnpm build && TURBO_FORCE=true pnpm test:ci`
- Commit: `refactor(view): the error names its condition, the guard goes, the comment names its callers`

**Warum das reicht — die Entscheidungen dieses Zug 0**

- **Der Meldungstext nennt die Bedingung, statt die Existenz zu bestreiten.** Die Empfehlung des
  Audits lautet »den Satz auf *does not exist* bringen«, und der Numerus ist damit gerichtet. Der
  Satz bliebe aber zweideutig: »the component« steht neben einem `${parent.uuid}` und einem
  `child`, und ein Konsument, der beide Objekte in der Hand hält, liest »it does not exist« über
  eines von ihnen als schlicht falsch. Die Bedingung ist `#entryOf(parent) === undefined` — dieser
  Context führt den Elternteil nicht. Die Beschreibung des Findings sagt genau das (»ein Kind an
  einen Eintrag hängt, den der Context nicht führt«), und `docs/api-reference.md:1030` sagt es
  seit jeher wörtlich: »Throws a plain `Error` when the context does not hold `parent`.« Die
  Meldung zieht auf diesen Wortlaut. Damit fällt auch das Ausrufezeichen: die beiden anderen
  Meldungen an Konsumenten in derselben Datei — `ComponentContextDisposedError` (`:28`) und
  `ComponentUuidInUseError` (`:42`) — tragen keines und folgen beide der Form »the view component
  … cannot … because …«. Die zwei `component-context panic:`-Würfe (`:871`, `:875`) sind die
  Nachbarmeldungen, die ihr Ausrufezeichen behalten: sie prüfen eine Invariante über
  `#`-private Felder, richten sich an niemanden außerhalb der Datei und bilden eine eigene Form.
  Das ist der Blick auf die Nachbarmeldungen, den die Empfehlung anregt — die eine Meldung, die
  aus der Reihe fällt, kommt zurück in die Reihe, die andere Reihe bleibt, wie sie ist.
- **Der Optional-Chain fällt ersatzlos, das Interface wird nicht geöffnet.** Die Empfehlung stellt
  die Alternative auf: entweder der Chain geht, oder `changes` wird im Interface optional. Der Code
  entscheidet das: `moveToRoot()` ist die einzige der siebzehn Zugriffsstellen auf `.changes` in
  dieser Datei, die einen Chain setzt; die anderen sechzehn — darunter `removeFromParent()` neun
  Zeilen darüber, das dieselbe Zeile ohne Chain schreibt — greifen unbedingt zu. Ein optionales
  Feld wäre eine Änderung an sechzehn Stellen für einen Fall, den keine Anlegestelle erzeugt.
- **Der Doc-Kommentar nennt beide Aufrufer, und die Nachbarstelle wird mitgezogen.** Innerhalb der
  Bibliothek enden zwei Wege in `dispatchReRequestParentRoots()`:
  `dispatchReRequestParentSiblings()` an `:593`, wenn die Komponente keinen Elternteil hat, und
  `#deliverPeerReRequests()` an `:679` für die Runde, deren Schlüssel `null` ist — dieselbe
  Kandidatenmenge, die Wurzeln. Der wahre Teil des Absatzes bleibt: eine gerade angekommene Entity
  ruft nicht selbst, sie gibt ihre Runde an den Sammler, und öffentlich ist die Methode, weil eine
  Runde zu einem selbst gewählten Zeitpunkt genau ihr Zweck ist. Der Absatz an
  `dispatchReRequestParentSiblings()` (`:587-588`) borgt sich seinen Grund per Verweis von genau
  dem Satz, den Schritt 3 ersetzt — er stünde danach auf einer Begründung, die es nicht mehr gibt.
  Das ist keine Folge und kein Nebenbefund, sondern der Schatten dieses Umbaus, und er wird
  mitgezogen. Die eigene Aussage der Stelle — dass *sie* keinen Aufrufer in der Bibliothek hat —
  ist nachgesehen und wahr: `ShaeEntElement.ts:755` erwähnt sie nur in einem Kommentar.
- **Ein CHANGELOG-Punkt, keine Doku, kein Contract, keine Zahl im Vorspann.**
  `ComponentContext` ist über `src/index.ts:14` öffentlich, und beide Doc-Kommentare werden von
  `tsc` wörtlich nach `dist/src/view/ComponentContext.d.ts` emittiert (nachgesehen, Zeilen 159-171
  und 182-205 des aktuellen Builds) — die falsche Aussage steht also in den ausgelieferten
  Deklarationen und wird einem Konsumenten im Editor angezeigt. Das trägt den Punkt. `docs/` bleibt
  unangetastet, weil dort nichts steht, was danach falsch wäre: die Methodentabelle an
  `api-reference.md:1058-1060` sagt über Aufrufer nichts, der Absatz an `:1062` beschreibt den
  Rückfall von `dispatchReRequestParentSiblings()` auf `dispatchReRequestParentRoots()` bereits
  richtig, und `:1030` benennt die Wurfbedingung von `addToChildren()` schon in dem Wortlaut, auf
  den die Meldung jetzt zieht. `README.md` erwähnt keine der drei Stellen. Unter `dist/` kommt
  keine Datei hinzu und fällt keine weg, also bleiben `src/distContract.files.txt` und
  `src/distContract.package.json` unberührt; `src/distContract.spec.ts` bestätigt das im Verify.
  Nicht in den Vorspann von `## [Unreleased]` geht der geänderte Meldungstext: die dort
  ausgeschriebene Zahl zählt Verhaltensänderungen, die Konsumenten erreichen, und derselbe
  `[Unreleased]`-Block führt geänderte Meldungswortlaute bereits im `### Internal`-Abschnitt statt
  im Vorspann — der `**Internal (kernel):**`-Punkt nennt zwei umformulierte Report-Texte und
  taucht im Vorspann nicht auf. Der neue Wortlaut steht im Punkt wörtlich, damit ihn findet, wer
  auf den alten geprüft hat.
- **Aus »Offene Befunde« kommt nichts mit.** Der zweite Eintrag sitzt in derselben Datei
  (`reCreateChanges()`), hat aber eine andere Ursache: `ComponentChanges` kann »gesetzt, ohne
  Wert« in seiner `Map<string, unknown>` gar nicht darstellen, der Fix endet also nicht an einer
  Zeile. Dieselbe Datei ist keine gemeinsame Ursache, und für einen Nebenbefund schneidet Zug 0
  kein Paket — das tut die Drain-Runde mit allen Befunden vor Augen. Der erste Eintrag (die fünf
  weiteren `readonly logger`) berührt diese Datei nicht.
- **Restplan unverändert.** `ComponentContext.ts` steht in keinem der Pakete 9 bis 11. Paket 10
  fasst dieselbe `CHANGELOG.md` an, aber im Abschnitt `### Types` (`API-008`), der über
  `### Internal` liegt — ein Punkt, der hier hinter Zeile 427 eingefügt wird, verschiebt ihn
  nicht. Keine Reihenfolge, kein Schnitt, kein `Hängt ab von` bewegt sich. Fortgeschrieben wurde
  allein die Adresse im zweiten offenen Befund: seine Zeilennummern stammen vom Stand vor diesem
  Paket, und die Kommentarblöcke aus Schritt 3 und 4 schieben `reCreateChanges()` um drei Zeilen
  nach unten. Die verlässliche Adresse ist das Symbol.

**CLEAN-012 · info · packages/shadow-objects/src/view/ComponentContext.ts:356** — Eine Fehlermeldung an den Konsumenten steht im falschen Numerus
Der Wortlaut der Meldung von addToChildren() lautet »because the component do not exist!«. Sie ist keine interne Notiz, sondern das, was ein Konsument im Log oder im catch zu sehen bekommt, wenn er ein Kind an einen Eintrag hängt, den der Context nicht führt.
Empfehlung: Den Satz auf »does not exist« bringen. Bei der Gelegenheit lohnt der Blick auf die Nachbarmeldungen derselben Datei, damit sie eine Form führen.

**CLEAN-013 · info · packages/shadow-objects/src/view/ComponentContext.ts:328** — Ein Optional-Chain behauptet eine Lücke, die der Typ ausschließt
childEntry.changes?.setParent(undefined) fragt einen Slot ab, den das ViewInstance-Interface als nicht optional führt. Der Zweig ist damit tot, und er sagt jedem Leser das Gegenteil: dass changes fehlen kann und dass es hier jemand bedacht hat.
Empfehlung: Den Optional-Chain streichen. Kann changes tatsächlich fehlen, gehört das ins Interface und nicht in einen stillen Guard an einer einzelnen Aufrufstelle.

**CONS-019 · info · packages/shadow-objects/src/view/ComponentContext.ts:517** — Ein Doc-Kommentar sagt, niemand rufe die Methode, und zwei Stellen tun es
Der Doc-Kommentar von dispatchReRequestParentRoots() sagt »Nothing inside the library calls it«, während dispatchReRequestParentSiblings() (:573) sie aufruft und die Auslieferung der gesammelten Runden (:659) ebenfalls. Der Nachbarsatz an dispatchReRequestParentSiblings() (:568) stimmt dagegen — die hat wirklich keinen Aufrufer in der Bibliothek.
Empfehlung: Den Satz auf die beiden Aufrufer bringen. Ein Kommentar, der Erreichbarkeit behauptet, wird beim nächsten Umbau als Erlaubnis gelesen.

Die drei Fundstellen im Kopf der Findings sind die des Audits. Aktuell: `:378`, `:350`,
`:537-540`; die im Text von CONS-019 genannten Aufrufer stehen an `:593` und `:679`.

### [x] 9. Auskommentierten Code entfernen
- Findings: CLEAN-009 (niedrig), CLEAN-010 (niedrig)
- Ziel: Kein toter Code mehr in `Entity`, `ShaePropElement` und der Playwright-Konfiguration; und was ein Leser von `Entity.addChild()` über das Benachrichtigen wissen muss, steht als Satz da, nicht als auskommentierter Emit-Aufruf.
- Bereich: `packages/shadow-objects/src/in-the-dark/Entity.ts`,
  `packages/shadow-objects/src/elements/ShaePropElement.ts`,
  `packages/shadow-objects-e2e/playwright.config.ts`
- Hängt ab von: —
- Hash: ec7d469
- Ergebnis: 1 Runde · CLEAN-009 und CLEAN-010 behoben — `Entity.ts:313-319` trägt über `addChild()`
  einen Doc-Kommentar, der die Regel der drei Baummethoden nennt (keine Benachrichtigung an einen
  Listener der Entity; die eine über eine bewegte Entity ist `onParentChanged` aus
  `Kernel.setParent()`), und die fünf toten Zeilen in `addChild()`, `removeChild()` und
  `#detachFromParent()` sind weg — die vier Kennungen `onAddChild`, `onAddToParent`,
  `onRemoveChild`, `onRemoveFromParent` stehen danach im ganzen Repository nirgends mehr;
  `ShaePropElement.ts:195-207` ohne den zwölfzeiligen `console.log`-Block, die Leerzeile über ihm
  steht; `playwright.config.ts` ohne den dotenv-Kopf, ohne die vier auskommentierten Projektblöcke
  und ohne die tote `build:n:serve`-Alternative am `webServer`-Kommando · kein Regressionstest,
  beide Findings sind Lesbarkeitsbefunde ohne Verhaltensanteil; Beleg sind die unangetasteten Specs,
  9 Zeilen rein und 48 raus über vier Dateien · CHANGELOG-Punkt wörtlich wie vorgegeben unter
  `## [Unreleased]` → `### Internal`, zwischen dem `**Internal (view):**`- und dem
  `**Internal (kernel):**`-Punkt · `docs/`, `README.md`, die beiden distContract-Dateien, der
  `MessageRouter` und die Zahl im Vorspann unangetastet, wie im Detailplan begründet · Review-Runde 1
  ohne Befund, weder zur Erfüllung noch zur Qualität; der Reviewer hat Lint und Typecheck selbst
  gefahren statt sie abzuschreiben · Verify neu gerechnet (0 von 5 Aufgaben aus dem Cache), exit 0,
  Coverage 93,62 % Statements / 89,18 % Branches, dazu die Handprüfung des Playwright-Pakets:
  `Total: 654 tests in 1 file` über `[chromium]`, `[firefox]`, `[webkit]`
- Nebenbefunde: keine neuen. Die drei Einträge über auskommentierte Zeilen in `Kernel.spec.ts`, in
  `packages/shadow-objects-testing/test/` und im e2e-Bundle stammen aus Zug 0 dieses Pakets und
  stehen in »Offene Befunde«.
- Folgen: keine
- Schnittstellen: keine. Keine Signatur bewegt sich, `Entity` gibt dieselben Methoden mit denselben
  Ergebnissen heraus. Für einen Konsumenten ändert sich genau eine Sache, ohne Typwirkung: der neue
  Doc-Kommentar an `addChild()`, den `tsc` wörtlich nach `dist/src/in-the-dark/Entity.d.ts`
  emittiert und den ein Editor daher anzeigt, wer eine Entity über `Kernel.getEntity()` erreicht.
  Die gestrichenen Zeilen erreichen `dist/` nicht — esbuild verwirft Kommentare in Methodenrümpfen.
- Modell: mittlere Stufe
- Effort: low
- Dateien: `packages/shadow-objects/src/in-the-dark/Entity.ts`,
  `packages/shadow-objects/src/elements/ShaePropElement.ts`,
  `packages/shadow-objects-e2e/playwright.config.ts`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen: Jeder Schritt nennt den Text, der dasteht, und den Text, der danach dastehen soll. Die
  Zeilennummern gelten für den Stand `da7143e`, jede für ihre Datei und vor dem ersten Schritt an
  dieser Datei. Schritt 1 macht `Entity.ts` um sieben Zeilen länger, alle übrigen Schritte machen
  ihre Datei kürzer — wer von oben nach unten arbeitet, verschiebt also die Nummern darunter. Der
  zitierte Text ist die verlässliche Adresse, nicht die Zahl. Nichts außerhalb der genannten
  Stellen wird angefasst.

  1. `Entity.ts:313` — `addChild()` bekommt einen Doc-Kommentar. Unmittelbar über der Zeile

     ```ts
       addChild(child: Entity) {
     ```

     wird eingefügt:

     ```ts
       /**
        * Puts `child` into the children list, at its place among the siblings.
        *
        * Nothing here notifies. Neither this method nor {@link Entity.removeChild} nor a detachment
        * sends anything to a listener on the entity -- the one notification over a moved entity is
        * `onParentChanged`, and `Kernel.setParent()` is the call that sends it.
        */
     ```

     Der doppelte Bindestrich ist die Form, die diese Datei für den Gedankenstrich führt (`:32`,
     `:117`, `:178`, `:192`). Die längste eingefügte Zeile misst 95 Zeichen, `biome.json` steht auf
     `lineWidth: 130` — Biome bricht Kommentare ohnehin nicht um.

  2. `Entity.ts:325-329` — das Ende von `addChild()`. Aus

     ```ts
         }

         // this.emit(onAddChild, this, child);
         // child.emit(onAddToParent, child, this);
       }
     ```

     wird

     ```ts
         }
       }
     ```

  3. `Entity.ts:356-362` — `removeChild()`. Aus

     ```ts
       removeChild(child: Entity) {
         if (this.#childrenUuids.has(child.uuid)) {
           this.#childrenUuids.delete(child.uuid);
           this.#children.splice(this.#children.indexOf(child), 1);
           // this.emit(onRemoveChild, this, child);
         }
       }
     ```

     wird

     ```ts
       removeChild(child: Entity) {
         if (this.#childrenUuids.has(child.uuid)) {
           this.#childrenUuids.delete(child.uuid);
           this.#children.splice(this.#children.indexOf(child), 1);
         }
       }
     ```

  4. `Entity.ts:379-382` — der Kopf von `#detachFromParent()`. Aus

     ```ts
         if (this.#parent) {
           // const prevParent = this.#parent;

           this.#parent.removeChild(this);
     ```

     wird

     ```ts
         if (this.#parent) {
           this.#parent.removeChild(this);
     ```

  5. `Entity.ts:396-399` — das Ende desselben Blocks. Aus

     ```ts
           this.#kernel.noteEntityTreeChange(this.#uuid);

           // this.emit(onRemoveFromParent, this, prevParent);
         }
     ```

     wird

     ```ts
           this.#kernel.noteEntityTreeChange(this.#uuid);
         }
     ```

     Danach steht in `Entity.ts` keine der vier Kennungen `onAddChild`, `onAddToParent`,
     `onRemoveChild`, `onRemoveFromParent` mehr; im ganzen Repository stehen sie sonst nirgends.

  6. `ShaePropElement.ts:195-207` — der Block in `#subscribe()`. Ersatzlos gestrichen werden diese
     dreizehn Zeilen, also die zwölf des Blocks und die Leerzeile hinter ihm:

     ```ts
         // this.viewComponent$.onChange((vc) => {
         //   if (vc) {
         //     console.log(`[shae-prop:"${this.name}"] view-component changed to`, vc?.uuid, {
         //       viewComponent: vc,
         //       shaeProp: this,
         //     });
         //   } else {
         //     console.log(`[shae-prop:"${this.name}"] lost connection to view-component :/`, {
         //       shaeProp: this,
         //     });
         //   }
         // });

     ```

     Die Leerzeile über dem Block (`:194`) bleibt stehen: danach folgt auf das `});` des
     `#hostBinding`-Blocks eine Leerzeile und dann der Prosa-Kommentar, der mit »The binding this
     element holds is the pair (view component, name).« beginnt.

  7. `playwright.config.ts:3-8` — der Kopf der Datei. Aus

     ```ts
     import {defineConfig, devices} from '@playwright/test';

     /**
      * Read environment variables from file.
      * https://github.com/motdotla/dotenv
      */
     // require('dotenv').config();

     /**
      * See https://playwright.dev/docs/test-configuration.
      */
     ```

     wird

     ```ts
     import {defineConfig, devices} from '@playwright/test';

     /**
      * See https://playwright.dev/docs/test-configuration.
      */
     ```

     Der JSDoc-Block darüber erklärt allein die gestrichene Zeile und geht mit ihr.

  8. `playwright.config.ts:58-77` — die auskommentierten Projekte hinter dem `webkit`-Eintrag.
     Ersatzlos gestrichen werden diese zwanzig Zeilen, also die Leerzeile hinter dem `},` des
     `webkit`-Eintrags und alles von dort bis zum letzten `// },`:

     ```ts

         /* Test against mobile viewports. */
         // {
         //   name: 'Mobile Chrome',
         //   use: { ...devices['Pixel 5'] },
         // },
         // {
         //   name: 'Mobile Safari',
         //   use: { ...devices['iPhone 12'] },
         // },

         /* Test against branded browsers. */
         // {
         //   name: 'Microsoft Edge',
         //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
         // },
         // {
         //   name: 'Google Chrome',
         //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
         // },
     ```

     Das `},` des `webkit`-Eintrags steht danach unmittelbar vor dem `],`, das die Liste schließt.

  9. `playwright.config.ts:82` — die auskommentierte Alternative am `webServer`-Kommando. Aus

     ```ts
         command: 'pnpm run preview', //  'pnpm run build:n:serve',
     ```

     wird

     ```ts
         command: 'pnpm run preview',
     ```

     `build:n:serve` steht in keiner `package.json` des Workspace.

  10. `packages/shadow-objects/CHANGELOG.md` — ein Punkt, wörtlich. Er steht unter
      `## [Unreleased]` → `### Internal`, unmittelbar hinter dem Punkt, der mit
      **Internal (view):** beginnt und mit »three places in `ComponentContext`« weitergeht
      (derzeit Zeile 428), und unmittelbar vor dem Punkt, der mit **Internal (kernel):** beginnt.
      Der Abschnitt und die beiden Nachbarpunkte sind die verlässliche Adresse, nicht die Zahl:

      ```markdown
      - **Internal (kernel, elements):** `Entity.addChild()` carries a doc comment that names the rule the tree methods of the class follow: neither `addChild()` nor `removeChild()` nor a detachment sends anything to a listener on the entity — the one notification over a moved entity is `onParentChanged`, and `Kernel.setParent()` is the call that sends it. That comment travels into `dist/src/in-the-dark/Entity.d.ts`, so it is what an editor shows a consumer who reaches an entity through `Kernel.getEntity()`. In `Entity` and in the subscription of `<shae-prop>`, every line is a line that runs or a sentence about one. Nothing on the surface moves — the same methods with the same results, the same signatures, and an unchanged published file list.
      ```

  11. Nicht angefasst wird: `packages/shadow-objects/src/worker/MessageRouter.ts` (Begründung unter
      »Warum das reicht«), `docs/`, `README.md`, `src/distContract.files.txt`,
      `src/distContract.package.json`, `Entity.spec.ts`, das Wurzel-`CHANGELOG.md` und jede Datei
      unter `packages/shadow-objects-e2e/`, die oben nicht genannt ist. Keine der gestrichenen
      Zeilen ist ein `TODO`, `FIXME` oder `XXX`, also läuft `pnpm make:todo` nicht mit.
- Kein Regressionstest: beide Findings sind Lesbarkeitsbefunde ohne Verhaltensanteil — die
  gestrichenen Zeilen sind Kommentare, und der eingefügte ist einer. Keine der Zeilen erreicht die
  ausgelieferte JavaScript-Datei: esbuild behält beim Transpilieren die Kommentare vor
  Klassenmembern und verwirft die in Methodenrümpfen, und alle gestrichenen stehen in
  Methodenrümpfen (nachgesehen in `dist/src/in-the-dark/Entity.js` und
  `dist/src/elements/ShaePropElement.js` am 2026-08-29: keine der vier Kennungen, keine der beiden
  `console.log`-Zeilen). Der eingefügte Doc-Kommentar erreicht sie, wie jeder JSDoc dieser Datei.
  Ein Test gegen »hier steht kein auskommentierter Code« wäre eine Lint-Regel, und Lint ist in
  diesem Projekt ausschließlich Biome — eine Regel dort ist Gerüst und gehört nicht in diesen Lauf.
  Der Beleg ist die unangetastete `Entity.spec.ts`, die grün bleiben muss; am 2026-08-29 gegen
  `da7143e` einzeln gefahren: 49 passed. `<shae-prop>` hat im Kernpaket keine eigene Spec, es wird
  in `packages/shadow-objects-testing/test/` gefahren und läuft in `pnpm test:ci` mit.
- Verify: `TURBO_FORCE=true pnpm lint && TURBO_FORCE=true pnpm typecheck && TURBO_FORCE=true pnpm build && TURBO_FORCE=true pnpm test:ci && pnpm -F shadow-objects-e2e exec playwright test --list`
  Der letzte Teil ist die Handprüfung, die der Abschnitt »Verify« im Kopf für das
  Playwright-Paket verlangt: `--list` lädt die Konfiguration und zählt die Matrix auf, ohne einen
  Browser zu starten oder den Preview-Server zu brauchen. Im Log muss am Ende
  `Total: 654 tests in 1 file` stehen, über die drei Projekte `[chromium]`, `[firefox]`,
  `[webkit]`. Am 2026-08-29 gegen `da7143e` so gemessen. `pnpm lint`, `pnpm typecheck` und
  `pnpm build` decken `playwright.config.ts` ohnehin mit ab — Biome prüft die Datei, sie steht im
  `include` von `packages/shadow-objects-e2e/tsconfig.json`, und `shadow-objects-e2e#build` hängt
  im turbo-Graph von `pnpm build`.
- Commit: `refactor: the entity tree methods name what they never send, and the dead lines go`
**Warum das reicht — die Entscheidungen dieses Zug 0**

- **Der `MessageRouter` fällt aus dem Paket, nicht aus dem Plan.** Die Beschreibung von CLEAN-009
  nennt »ein auskommentiertes `console.debug` im MessageRouter«; in
  `src/worker/MessageRouter.ts` steht keines mehr. Es fiel am 2026-08-24 mit `2b121ac`
  (»fix(worker): the worker branch reports through the console logger«), also vier Tage vor dem
  Audit und drei Tage vor dessen Re-Check — nachgesehen mit
  `git log -S 'console.debug' -- packages/shadow-objects/src/worker/MessageRouter.ts`, und die
  Datei trägt heute nur noch Prosa-Kommentare. Das `location`-Feld des Findings nennt den
  `MessageRouter` nicht; der Re-Check hat offenbar nur die dort genannten Stellen besucht und den
  Satz in der Beschreibung stehen lassen. Damit ist ein Viertel des Findings gegenstandslos, der
  Rest steht unverändert.
- **Die vier Ereignisse kommen nicht in eine Datei, sondern in einen Satz an der Stelle, an der die
  Frage entsteht.** Die Empfehlung des Audits schlägt `Backlog.md` vor. Eine solche Datei gibt es
  im Repository nicht, und sie anzulegen hieße, ein Projektartefakt für eine Absicht zu erfinden,
  die nirgends belegt ist: `onAddChild`, `onAddToParent`, `onRemoveChild` und `onRemoveFromParent`
  stehen in keiner Konstante, keinem Typ, keiner Doku und keinem Test — repository-weit nur in
  diesen vier Kommentarzeilen. Ein Verweis auf sie wäre außerdem ein Rückblick auf den Vorzustand,
  den die »Konventionen« ausschließen. Was ein Leser an dieser Stelle wirklich braucht, ist die
  geltende Regel, und die ist wahr, prüfbar und nirgends im Code gesagt: die Baummethoden von
  `Entity` benachrichtigen niemanden. Sie steht künftig einmal, an `addChild()`, und nennt die
  beiden anderen Stellen mit — `removeChild()` und die Ablösung. Die Doku sagt dasselbe bereits
  (`docs/api-reference.md:2782`: »Exactly one thing they do not share -- `onParentChanged` belongs
  to `Kernel.setParent()`«), was den Satz belegt, statt ihn überflüssig zu machen: im Editor sieht
  ein Konsument die Deklaration, nicht die Referenz.
- **Der Satz sagt nichts über die Buchführung.** Nur die Ablösung ruft
  `kernel.noteEntityTreeChange()`; `addChild()` und `removeChild()` schreiben die Kinderliste ohne
  jede Meldung an den Kernel, und `docs/api-reference.md:2755`, `:2757` und `:2790` beschreiben
  das ausführlich. Der Kommentar hält sich deshalb an die eine Aussage, die für alle drei gilt —
  es geht keine Benachrichtigung an einen Listener der Entity —, und lässt die Buchführung dort,
  wo sie schon steht.
- **Die Playwright-Konfiguration wird ganz aufgeräumt, nicht nur an Zeile 7.** Das `location`-Feld
  nennt `:7`, dieselbe Datei trägt aber drei weitere Reste derselben Ursache: die beiden
  auskommentierten Projektblöcke aus dem `create-playwright`-Gerüst (`:59-77`) und die
  auskommentierte Alternative am `webServer`-Kommando (`:82`). Vier Stellen, eine Ursache, ein
  Commit — die drei ungenannten stehen zu lassen hieße, sie beim nächsten Audit erneut zu lesen.
  Alle vier sind nachweislich tot: `dotenv` steht in keiner `package.json` des
  Workspace und `require` gibt es in einem Paket mit `"type": "module"` gar nicht, `build:n:serve`
  ist kein Skript, und die vier Projektblöcke stehen den drei laufenden Projekten nur als Menü
  daneben. Der JSDoc-Block über `:7` erklärt ausschließlich die gestrichene Zeile und geht mit ihr
  — ein Kommentar über nichts wäre schlechter als der Zustand davor.
- **Aus »Offene Befunde« kommt nichts mit.** Der erste Eintrag (die fünf weiteren
  `readonly logger`) nennt `src/elements/ShaePropElement.ts:91` und trifft damit eine Datei dieses
  Pakets, hat aber eine andere Ursache: dort geht es um einen Eigenschaftsslot, der zur Laufzeit
  offen steht, hier um Kommentare. Dieselbe Datei ist keine gemeinsame Ursache. Der zweite Eintrag
  (`reCreateChanges()` in `ComponentContext.ts`) berührt keine Datei dieses Pakets. Beide bleiben
  liegen; über sie entscheidet die Drain-Runde.
- **Drei neue Nebenbefunde gehen in die Queue, nicht ins Paket.** Beim Abgleich der
  Finding-Beschreibung habe ich das Repository nach auskommentiertem Code abgesucht (`grep` nach
  auskommentierten `console.`-Aufrufen und nach Kommentarzeilen, die mit einem Statement
  beginnen). In `packages/shadow-objects/src/` steht außer den Stellen dieses Pakets nichts
  dergleichen; in den Spec- und Testdateien und im e2e-Paket schon. Aufgenommen habe ich davon
  nichts: Spec-Dateien sind eine eigene Entscheidung — ein auskommentierter `console.log` in einem
  Test ist ein Schalter, den der Eigentümer dieses Tests umlegt, und über dreizehn solcher Stellen
  entscheidet man einmal mit allen vor Augen, nicht dreizehnmal nebenbei. Und die beiden
  e2e-Reste hängen zusammen: die auskommentierten Zeilen in `src/bundle.ts` sind die eine Hälfte
  einer nicht zu Ende geführten Umstellung, die verwaiste Datei `src/bundle.worker.ts` die
  andere. Eine Datei zu löschen ist ein anderer Schnitt als eine Kommentarzeile zu streichen, und
  beide Hälften gehören in dieselbe Entscheidung. Für einen Nebenbefund schneidet Zug 0 kein
  Paket; das tut die Drain-Runde.
- **Ein CHANGELOG-Punkt, keine Doku, kein Contract.** Beobachtbar ist für einen Konsumenten genau
  eine Sache: der neue Doc-Kommentar, den `tsc` wörtlich nach `dist/src/in-the-dark/Entity.d.ts`
  emittiert. `Entity` steht weder in `src/index.ts` noch in `src/shadow-objects.ts`, ist aber über
  `Kernel.getEntity(uuid): Entity` erreichbar, und `dist/src/in-the-dark/Kernel.d.ts:3` importiert
  den Typ von dort — im Editor eines Konsumenten steht der Satz also. Die gestrichenen Zeilen
  erreichen `dist/` nicht (siehe »Kein Regressionstest«). `docs/` bleibt unangetastet: die drei
  Stellen, die über das Benachrichtigen sprechen (`api-reference.md:2755`, `:2782`, `:2790`),
  sagen bereits das Richtige, und keine Doku-Zeile nennt eine der vier Kennungen oder den
  `<shae-prop>`-Block (nachgesehen mit `grep -rn "onAddChild\|onAddToParent\|onRemoveChild\|onRemoveFromParent" docs/ README.md`:
  keine Fundstelle). Unter `dist/` kommt keine Datei hinzu und fällt keine weg, also bleiben
  `src/distContract.files.txt` und `src/distContract.package.json` unberührt;
  `src/distContract.spec.ts` bestätigt das im Verify. `packages/shadow-objects-e2e` ist `private`
  und führt kein CHANGELOG. Nicht in den Vorspann von `## [Unreleased]` geht der Doc-Kommentar:
  die dort ausgeschriebene Zahl zählt Verhaltensänderungen, die Konsumenten erreichen, und ein
  Kommentar ändert kein Verhalten.
- **Restplan unverändert.** Keine der vier Dateien steht in Paket 10 oder 11. Paket 10 fasst
  dieselbe `CHANGELOG.md` an, aber im Abschnitt `### Types` (Zeile 404, `API-008`), der über
  `### Internal` (Zeile 423) liegt — ein Punkt, der hier hinter Zeile 428 eingefügt wird,
  verschiebt ihn nicht. Keine Reihenfolge, kein Schnitt, kein `Hängt ab von` bewegt sich.

**CLEAN-009 · niedrig · packages/shadow-objects/src/in-the-dark/Entity.ts:297,330,350,368; packages/shadow-objects-e2e/playwright.config.ts:7** — Auskommentierter Code an drei Stellen
In Entity stehen vier Emit-Aufrufe für Ereignisse, die es nicht gibt: onAddChild, onAddToParent, onRemoveChild und onRemoveFromParent. Sie lesen sich wie eine geplante Erweiterung, tragen aber keinen Hinweis darauf, ob sie kommt oder verworfen wurde. Dazu ein auskommentiertes console.debug im MessageRouter und sechs Zeilen Diagnose-Ausgabe in ShaePropElement. Auskommentierter Code ist die eine Form von Kommentar, die ein Leser nicht prüfen kann: er sagt nichts über den geltenden Zustand und veraltet stumm.
Empfehlung: Streichen. Sollen die vier Entity-Ereignisse kommen, gehören sie als Satz in Backlog.md statt als toter Code in die Klasse; der git-Verlauf hält die Zeilen ohnehin.

**CLEAN-010 · niedrig · packages/shadow-objects/src/elements/ShaePropElement.ts:182-193** — Ein auskommentierter Debug-Block steht als toter Code in shae-prop
Ein auskommentierter Block mit zwei console.log steht mitten in der Anmeldung des Elements. Er trägt nichts bei, überlebt aber jeden Umbau der Methode, weil ihn niemand mitliest — und beim nächsten Leser stellt sich die Frage, ob er wieder eingeschaltet werden soll oder vergessen wurde.
Empfehlung: Streichen. Wer die Werte im Betrieb sehen will, hat den ConsoleLogger, der sich je Namensraum einschalten lässt.

Die Fundstellen im Kopf der beiden Findings sind die des Audits. Aktuell (Stand `da7143e`):
`Entity.ts:327,328,360,398` für die vier Emit-Aufrufe, dazu `:380` für die tote Zuweisung, die nur
den letzten von ihnen versorgt hätte; `ShaePropElement.ts:195-206` für den Debug-Block, den beide
Findings meinen — CLEAN-009 zählt ihn mit sechs Zeilen, er hat zwölf; `playwright.config.ts:7`
unverändert. Die »drei Stellen« im Titel von CLEAN-009 sind heute zwei, siehe oben zum
`MessageRouter`.

### [x] 10. Doku der Kernbibliothek: drei Aussagen, die nicht tragen
- Findings: API-009 (info), API-010 (info), API-008 (info)
- Ziel: Das Cheat-Sheet führt `no-trim` nur dort, wo es hingehört, der Absatz zu `sync()` benutzt »tick« in einer Bedeutung, und der CHANGELOG-Eintrag verspricht Konsumenten nichts, was sie nicht sehen können.
- Bereich: `packages/shadow-objects/docs/cheat-sheet.md`, `docs/api-reference.md`, `docs/guides.md`,
  `src/view/ShadowEnv.ts`, `CHANGELOG.md`
- Hängt ab von: —
- Hash: e25ed29
- Modell: mittlere Stufe
- Effort: low
- Dateien: `packages/shadow-objects/docs/cheat-sheet.md`,
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/docs/guides.md`,
  `packages/shadow-objects/src/view/ShadowEnv.ts`,
  `packages/shadow-objects/CHANGELOG.md`
- Notiz aus Zug 0 von Paket 5: API-008 sitzt in `CHANGELOG.md`, im Abschnitt `### Types`
  unter `## [Unreleased]`. Paket 5 fasst denselben `[Unreleased]`-Block an anderer Stelle an —
  Zeile 13 (die ausgeschriebene Zahl der für Konsumenten sichtbaren Änderungen), das Ende der
  Aufzählung im Vorspann und ein neuer Punkt unter `### ⚠️ Breaking Changes`. Die Zeilennummer
  verschiebt sich dadurch; der Abschnitt ist die verlässliche Adresse, nicht die Zahl.
  Inhaltlich berühren sich die beiden nicht.
- Notiz aus Zug 0 von Paket 6: API-008 beanstandet `generateUUID()`, aber derselbe Satz nennt ein
  zweites unerreichbares Symbol. Der Satz steht nach den Commits der Pakete 1-5 auf
  `CHANGELOG.md:404`, im Abschnitt `### Types`, und beginnt mit »the emitted declarations are as
  narrow as the values behind them«. Er zählt als für Konsumenten sichtbar auf: die drei Element-
  und `ShadowEnv`-Signale, `FrameLoop.start()`, `filterUndefinedProps()` und `generateUUID()`. Von
  diesen sind zwei unerreichbar, aus demselben Grund und mit derselben Folge: weder
  `src/utils/props-utils.js` noch das Modul hinter `generateUUID()` steht in `src/index.ts` oder in
  einem Pfad der `exports`-Map (nachgeprüft am 2026-08-29 gegen beide). `FrameLoop` und die Signale
  sind erreichbar und bleiben, wie sie dastehen. Wie der Satz repariert wird, entscheidet Paket 10 —
  beide Symbole gehören in dieselbe Entscheidung, sonst bleibt der halbe Befund stehen. Paket 6 hat
  den Satz nicht angefasst: seine Aussage über `filterUndefinedProps()` — die Deklaration trägt
  `| undefined` — ist nach dem Umbau unverändert wahr.
- Vorgehen: Sieben Schritte, jeder mit dem Text, der dasteht, und dem Text, der danach dastehen
  soll. Die Zeilennummern gelten für den Stand `ec7d469` und je für ihre Datei vor dem ersten
  Schritt an dieser Datei; der zitierte Text ist die verlässliche Adresse, nicht die Zahl. Nichts
  außerhalb der genannten Stellen wird angefasst. Kein Regressionstest: alle drei Findings sind
  Dokumentationsbefunde ohne Verhaltensanteil, geändert werden ausschließlich Prosa und ein
  Doc-Kommentar. Belegt wird das durch die unangetasteten Specs und einen grünen Verify-Lauf.

  1. `docs/cheat-sheet.md:234-237` — der Absatz unter der `<shae-worker>`-Tabelle nennt nur noch
     die beiden Attribute, die dieses Element führt. Aus

     ```markdown
     **Truthy value ≠ presence.** `local`, `no-autostart` and `no-trim` count as set for `on`, `true`,
     `yes`, `local`, `1` (case-insensitive) or for the bare attribute — and as unset for everything
     else, `="false"` and `="0"` included. Of the boolean-looking attributes, only
     `no-structured-clone` asks for presence alone.
     ```

     wird

     ```markdown
     **Truthy value ≠ presence.** `local` and `no-autostart` count as set for `on`, `true`, `yes`,
     `local`, `1` (case-insensitive) or for the bare attribute — and as unset for everything else,
     `="false"` and `="0"` included. Of the boolean-looking attributes, only `no-structured-clone`
     asks for presence alone.
     ```

     Der Schlusssatz bleibt wörtlich stehen und bleibt wahr: unter `<shae-worker>` stehen als
     boolean aussehende Attribute `local`, `no-autostart` und `no-structured-clone`, und nur das
     letzte fragt nach bloßer Anwesenheit. Die Zeile `| local | truthy value | … — see below |`
     der Tabelle darüber verweist weiterhin auf diesen Absatz und bleibt unangetastet.

  2. `docs/cheat-sheet.md:284-286` — die `<shae-prop>`-Tabelle bekommt denselben Absatz für ihr
     eigenes Attribut. Unmittelbar unter die Leerzeile, die auf die Zeile

     ```markdown
     | `no-trim` | truthy value | Preserve whitespace in string values; `no-trim="false"` still trims. Without it `value="   "` trims down to `''`, and with `type="number"` that is `0` |
     ```

     folgt, und unmittelbar über den Absatz, der mit »The host is the closest entity above the
     element« beginnt, wird eingefügt (samt einer Leerzeile darunter):

     ```markdown
     **Truthy value ≠ presence.** `no-trim` counts as set for `on`, `true`, `yes`, `local`, `1`
     (case-insensitive) or for the bare attribute — and as unset for everything else, `="false"` and
     `="0"` included.
     ```

     Damit steht die Regel dort, wo ein Leser sie sucht: neben der Tabelle des Elements, das das
     Attribut führt. `docs/api-reference.md:2386` dokumentiert `no-trim` bereits an genau dieser
     Stelle und mit derselben Werteliste — das Cheat-Sheet nimmt die Form des Referenzdokuments
     an, statt über einen Verweis auf einen fremden Elementabschnitt aufzulösen.

  3. `docs/api-reference.md:1301-1303` — der Absatz zu `sync()`. Aus

     ```markdown
     ones differ. A `LocalShadowObjectEnv` runs the Kernel in the tick of whoever calls the proxy, one
     microtask after `sync()` returned rather than in the tick that called it, and rejects with what it
     threw, so a refusal reaches `ShadowEnv.SyncFailed` here as well, carrying its number. A
     ```

     wird

     ```markdown
     ones differ. A `LocalShadowObjectEnv` runs the Kernel synchronously, inside the call the
     environment makes to the proxy -- one microtask after `sync()` returned, not inside the call to
     `sync()` itself -- and rejects with what it threw, so a refusal reaches `ShadowEnv.SyncFailed`
     here as well, carrying its number. A
     ```

     Die Ordnungsaussage ist unverändert und in beiden Hälften nachgeprüft: `ShadowEnv.sync()`
     stellt mit `queueMicrotask(this.#syncIfScheduled)` zu (`src/view/ShadowEnv.ts:320`), und
     `LocalShadowObjectEnv.applyChangeTrail()` ruft `this.kernel.run(syncData)` geradeheraus auf
     (`src/view/LocalShadowObjectEnv.ts:56`). Das Wort »tick« fällt weg; »call«, »synchronously«
     und »microtask« sind die Wörter, die dieses Dokument für die Sache ohnehin führt — `:1535`
     beschreibt dieselbe Methode als »Runs the change trail through the Kernel synchronously,
     before this method returns«.

  4. `docs/guides.md:593` — dieselbe Aussage in §»When a Single Sync Cycle Fails«. Die Datei
     führt einen Absatz je Zeile, ohne Umbruch; ersetzt wird ausschließlich der Teilsatz. Aus

     ```markdown
     And a local proxy is different again -- a `LocalShadowObjectEnv` runs the Kernel in the tick of whoever calls the proxy, one microtask after `sync()` returned rather than in the tick that called it, and rejects with what it threw, so there a refusal reaches `SyncFailed` on the unconfirmed route as well, count and all.
     ```

     wird

     ```markdown
     And a local proxy is different again -- a `LocalShadowObjectEnv` runs the Kernel synchronously, inside the call the environment makes to the proxy, one microtask after `sync()` returned and not inside the call to `sync()` itself, and rejects with what it threw, so there a refusal reaches `SyncFailed` on the unconfirmed route as well, count and all.
     ```

     Hier stehen Kommas statt der beiden `--`: der umgebende Satz führt sein eigenes `--` schon
     im Kopf, ein zweites Paar darin liest sich als Verschachtelung, die es nicht gibt.

  5. `src/view/ShadowEnv.ts:303-305` — der Doc-Kommentar über `sync()`. Aus

     ```ts
      * `LocalShadowObjectEnv` runs the Kernel in the tick of whoever calls the proxy, one microtask
      * after `sync()` returned rather than in the tick that called it, and rejects with what it
      * threw, so a refusal reaches {@link ShadowEnv.SyncFailed} here as well, carrying its number.
     ```

     wird

     ```ts
      * `LocalShadowObjectEnv` runs the Kernel synchronously, inside the call the environment makes to
      * the proxy -- one microtask after `sync()` returned, not inside the call to `sync()` itself --
      * and rejects with what it threw, so a refusal reaches {@link ShadowEnv.SyncFailed} here as well,
      * carrying its number.
     ```

     Der Block wird damit eine Zeile länger; die längste neue Zeile misst 101 Zeichen, `biome.json`
     steht auf `lineWidth: 130`, und Biome bricht Kommentare nicht um. Dieser Kommentar ist die
     einzige Stelle des Pakets, die `dist/` erreicht: `tsc` emittiert ihn wörtlich nach
     `dist/src/view/ShadowEnv.d.ts`, und `ShadowEnv` steht in `src/index.ts:19`. Die Dateiliste
     und die Form von `dist/package.json` bewegen sich nicht — `src/distContract.files.txt` und
     `src/distContract.package.json` bleiben unangefasst.

  6. `CHANGELOG.md:404` — der Punkt unter `### Types`, der mit »the emitted declarations are as
     narrow as the values behind them« beginnt. Aus

     ```markdown
     - **Types:** the emitted declarations are as narrow as the values behind them. They carry `| undefined` wherever a value can be missing — visible on `ShaeEntElement.componentContext$` / `viewComponent$` / `token$`, `ShaePropElement.entNode$` / `viewComponent$` / `name$` / `type$`, `ShadowEnv.ns$`, the return of `FrameLoop.start()` and of `filterUndefinedProps()` — and `generateUUID()` returns the template literal type of `crypto.randomUUID()` instead of a plain `string`. Consumers compiling with `strictNullChecks` will see new errors where they relied on a value that was never promised — the promise is the fix.
     ```

     wird

     ```markdown
     - **Types:** the emitted declarations are as narrow as the values behind them. They carry `| undefined` wherever a value can be missing — visible on `ShaeEntElement.componentContext$` / `viewComponent$` / `token$`, `ShaePropElement.entNode$` / `viewComponent$` / `name$` / `type$`, `ShadowEnv.ns$` and the return of `FrameLoop.start()`. Consumers compiling with `strictNullChecks` will see new errors where they relied on a value that was never promised — the promise is the fix. Two declarations narrow the same way without a consumer reaching them: the return of `filterUndefinedProps()` carries `| undefined`, and `generateUUID()` returns the template literal type of `crypto.randomUUID()` instead of a plain `string`. Neither `src/utils/props-utils.js` nor `src/utils/generateUUID.js` is re-exported from `index.ts` or reachable through the `exports` map, and `ViewComponent.uuid` — the one place a uuid does reach a consumer — is declared `string`.
     ```

     Der Punkt bleibt, wo er steht, unter `### Types`. Die Alternative der Audit-Empfehlung — ihn
     nach `### Internal` zu stellen — würde den Satz zerreißen, dessen Subjekt die Deklarations-
     emission als Ganzes ist, und den `strictNullChecks`-Hinweis von der Hälfte trennen, für die er
     gilt. Stattdessen bekommen die beiden unerreichbaren Symbole ihren eigenen Satz mit der
     Erreichbarkeitsaussage in genau der Form, die dieser Lauf schon zweimal geschrieben hat
     (die Entscheidung vom 2026-08-29 zu `MaxWorkerTimeout` und `isTimeout`, und der `MicrotaskCollector`-
     Punkt unter `### Internal`). Die Zahl im Vorspann (`CHANGELOG.md:13`, »Fifty-eight changes
     reach existing consumers«) bleibt unangetastet: der Punkt erreicht Konsumenten weiterhin
     über die Element- und `ShadowEnv`-Signale und über `FrameLoop.start()`, und der Vorspann
     nennt als seine Hälfte ausdrücklich nur die `| undefined`-Verengung.

  7. `CHANGELOG.md` — ein neuer Punkt für die Doku-Korrekturen aus den Schritten 1 bis 5,
     im Abschnitt `### Internal` unter `## [Unreleased]`, unmittelbar hinter dem Punkt, der mit
     »- **Internal (kernel, elements):** `Entity.addChild()` carries a doc comment« beginnt, und
     unmittelbar vor dem Punkt, der mit »- **Internal (kernel):** every teardown step reports
     through one helper« beginnt. Das ist die Stelle, an der die Pakete 7, 8 und 9 ihre Punkte
     angehängt haben. Wörtlich:

     ```markdown
     - **Docs (correctness):** the truthy-value rule in `cheat-sheet.md` stands under each element it applies to — `local` and `no-autostart` beside the `<shae-worker>` table, `no-trim` beside the `<shae-prop>` one, which is where `api-reference.md` documents it as well. And the `sync()` passage names each of the two runs it tells apart: a `LocalShadowObjectEnv` runs the Kernel synchronously, inside the call the environment makes to the proxy, one microtask after `sync()` returned and not inside the call to `sync()` itself. That passage stands in three places and reads the same in all of them — §`sync()` of `api-reference.md`, §When a Single Sync Cycle Fails of `guides.md`, and the doc comment on `ShadowEnv.sync()`, which travels into `dist/src/view/ShadowEnv.d.ts` and is what an editor shows a consumer. Nothing on the surface moves — the same methods with the same results, and an unchanged published file list.
     ```

     `CHANGELOG.md` steht in der Ausschlussliste von `biome.json`, wird also nicht formatiert; die
     Punkte dieses Abschnitts stehen je auf einer Zeile ohne Umbruch, und dieser auch.

  Was nicht angefasst wird, und warum:

  - `README.md` und die Paket-`README.md`. Keine von beiden führt die Truthy-Regel oder den
    `sync()`-Absatz; nachgesehen am 2026-08-30 mit `grep` über beide Dateien.
  - `pnpm make:todo`. Kein `TODO`-Kommentar bewegt sich.
  - Der Punkt »- **Docs (correctness):** the element reference in `api-reference.md` §Web
    Components and the element tables in `cheat-sheet.md`…« (`CHANGELOG.md:442`), der `local`,
    `no-autostart` und `no-trim` gemeinsam nennt. Seine Aussage gilt den Elementen und nicht dem
    Ort im Cheat-Sheet: alle drei lesen einen Truthy-Wert, und das bleibt nach Schritt 1 und 2
    wahr.
  - `src/view/LocalShadowObjectEnv.ts:62` (»in the same tick this method is called in«) und
    `docs/cheat-sheet.md:302` / `docs/api-reference.md:2534` (»within a single tick«, »within the
    same tick«). Drei weitere Vorkommen des Wortes, jedes in genau einer Bedeutung an seiner
    Stelle. Der Befund ist die doppelte Bedeutung in einem Absatz, nicht das Wort; ein
    Wortverbot über die ganze Codebasis steht in keiner Empfehlung und in keiner Konvention.
  - Der Eintrag aus »Offene Befunde« über die fünf weiteren `readonly logger` und die beiden
    Doku-Zeilen `docs/api-reference.md:2642` und `:1897`. Er trägt zwar ebenfalls eine
    Doku-Aussage, die zur Laufzeit niemand einlöst, aber seine Ursache ist der Eigenschaftsslot
    und nicht der Satz; die Doku-Hälfte allein zu ziehen hieße, den Befund zu halbieren. Er
    bleibt bei der Drain-Runde, die alle fünf Slots zugleich sieht.
- Verify: `TURBO_FORCE=true pnpm lint && TURBO_FORCE=true pnpm typecheck && TURBO_FORCE=true pnpm build && TURBO_FORCE=true pnpm test:ci`
- Commit: `docs: the truthy rule sits with its element, one word means one thing, one note names its reach`
- Ergebnis: 1 Runde · API-009, API-010 und API-008 behoben · alle sieben Schritte des
  Detailplans wörtlich umgesetzt, der Reviewer meldet keinen Befund · kein Regressionstest:
  drei Dokumentationsbefunde ohne Verhaltensanteil, belegt durch unangetastete Specs und
  einen grünen Verify-Lauf ohne turbo-Cache
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine. Keine Signatur, kein Symbol bewegt sich; die Dateiliste und die Form
  von `dist/` bleiben unverändert. Der Doc-Kommentar an `ShadowEnv.sync()` reist nach
  `dist/src/view/ShadowEnv.d.ts` und ist, was ein Editor einem Konsumenten zeigt.

**API-009 · info · packages/shadow-objects/docs/cheat-sheet.md:234-237** — Das Cheat-Sheet führt ein Attribut unter dem falschen Element
Der Absatz »Truthy value ≠ presence« steht unter `<shae-worker>` und zählt `no-trim` mit auf. `no-trim` ist ein Attribut von `<shae-prop>` und dort auf `:284` auch korrekt geführt. Wer die Tabelle darüber liest, sucht es bei `<shae-worker>` vergeblich.
Empfehlung: `no-trim` aus dem Absatz unter `<shae-worker>` herausnehmen. Die Stelle bei `<shae-prop>` trägt die Aussage bereits.

**API-010 · info · packages/shadow-objects/docs/api-reference.md, Abschnitt `sync()`** — »tick« steht im selben Absatz für zwei verschiedene Dinge
Der Absatz benutzt das Wort zweimal in zwei Bedeutungen — einmal für den Takt des Frame-Loops, einmal für den Durchlauf einer Sync-Runde. Die Ordnungsaussage daneben ist präzise; das Wort trägt sie nicht mit.
Empfehlung: Für eines der beiden ein anderes Wort nehmen, und zwar dasselbe, das der übrige Text dafür schon führt.

**API-008 · info · packages/shadow-objects/CHANGELOG.md, `### Types` unter `## [Unreleased]`** — Eine CHANGELOG-Zusage über ein Symbol, das kein Konsument erreicht
Die Types-Zeile sagt Konsumenten eine Verengung des Rückgabetyps von `generateUUID()` zu. Das Symbol steht weder in `index.ts` noch in einem Pfad der `exports`-Map, und `ViewComponent.uuid` bleibt `get uuid(): string`. Am emittierten `.d.ts` ist die Aussage wahr; sie erreicht trotzdem niemanden, der das Paket einbindet.
Empfehlung: Den Eintrag unter die internen Änderungen stellen oder den Halbsatz ergänzen, dass die Verengung an keiner exportierten Stelle sichtbar wird. Ein CHANGELOG, das Konsumenten etwas verspricht, das sie nicht sehen können, kostet beim nächsten Lesen Zeit.

### [x] 11. Doku des Canvas-Pakets: die Render-Automatik, die es nicht gibt
- Findings: API-005 (niedrig)
- Ziel: Die API-Doku nennt die tatsächliche Bedingung, unter der eine Ansicht gezeichnet wird, und sagt dem, der `createView()` direkt benutzt, dass er das Zeichnen selbst auslöst.
- Bereich: `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`, `CHANGELOG.md`
- Hängt ab von: —
- Hash: ea60f69
- Modell: mittlere Stufe
- Effort: low
- Dateien: `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`
- Abgleich aus Zug 0 (2026-08-30): API-005 steht unverändert. `docs/01-shadow-objects-api.md:83`
  trägt den beanstandeten Satz Zeichen für Zeichen so, wie das Audit ihn zitiert, und die Datei ist
  seit `df9f9b9` — dem Stand vor dem ersten Paket-Commit dieses Laufs — unberührt; dieser Lauf hat
  `packages/shae-offscreen-canvas/` bisher nicht angefasst (`git log df9f9b9..HEAD -- packages/shae-offscreen-canvas/`
  ist leer). Am Code nachgesehen: `ThreeMultiViewRenderer.createView()`
  (`src/shadow-objects/ThreeMultiViewRenderer.js:49-54`) legt die View in `#views` ab und gibt sie
  zurück, mehr nicht — kein Frame-Abonnement, kein Timer, kein Aufruf von `renderView()`. Gezeichnet
  wird ausschließlich in `renderView()` (`:64-75`), und der einzige Aufrufer außerhalb der Specs ist der
  Frame-Listener von `ThreeRenderView` (`src/shadow-objects/ThreeRenderView.js:77-101`). Die Zusage
  der Doku löst also niemand ein.
- Nebenbefund gleicher Ursache, in dieses Paket aufgenommen: `renderView()` hat in der »RenderView
  API« keinen eigenen Eintrag. Die drei `>`-Einträge des Abschnitts sind `createView()`,
  `destroyView()` und `updateSize()`; `renderView()` kommt nur in drei Prosa-Absätzen vor, die
  allesamt unter `updateSize()` stehen. Das ist dieselbe Ursache wie API-005 und nicht bloß
  dieselbe Datei: der Abschnitt beschreibt das Zeichnen als etwas, das von selbst geschieht, und
  darum hat die Methode, die es tatsächlich tut, nie einen Eintrag bekommen. Die Empfehlung des
  Audits verlangt, dem direkten `createView()`-Nutzer zu sagen, dass er das Zeichnen selbst auslöst —
  ein Satz, der auf eine Methode ohne Eintrag zeigt, bleibt auf halbem Weg stehen. Vorbestehend, an
  `df9f9b9` nachgesehen, dort steht derselbe Abschnitt mit denselben drei Einträgen.
- Vorgehen: Drei Schritte, jeder mit dem Text, der dasteht, und dem Text, der danach dastehen soll.
  Die Zeilennummern gelten für den Stand `e25ed29` und je für ihre Datei vor dem ersten Schritt an
  dieser Datei; der zitierte Text ist die verlässliche Adresse, nicht die Zahl. Nichts außerhalb der
  genannten Stellen wird angefasst. Kein Regressionstest: API-005 ist ein Dokumentationsbefund ohne
  Verhaltensanteil, kein Quelltext bewegt sich, geändert wird ausschließlich Prosa. Belegt wird das
  durch die unangetasteten Specs und einen grünen Verify-Lauf.

  1. `docs/01-shadow-objects-api.md:83` — der Absatz unter dem Eintrag
     `threeMultiViewRenderer.createView(width, height)`. Ersetzt wird
     ausschließlich der zweite Satz der Zeile; der Rest der Zeile bleibt Byte für Byte stehen. Aus

     ```markdown
     Once created, the _view_ is rendered automatically with one of the next frames.
     ```

     wird

     ```markdown
     Drawing it is a separate call: a view is drawn once for every `renderView()` call it gets, and this renderer issues none of those on its own. [ThreeRenderView](#threerenderview) makes them for the one view it holds, on the frames of its entity; whoever calls `createView()` directly makes them for their view themselves.
     ```

     Die Zeile lautet danach vollständig:

     ```markdown
     Creates a new _RenderView_ structure. Drawing it is a separate call: a view is drawn once for every `renderView()` call it gets, and this renderer issues none of those on its own. [ThreeRenderView](#threerenderview) makes them for the one view it holds, on the frames of its entity; whoever calls `createView()` directly makes them for their view themselves. however, the user has to set a scene and a camera for this. the view structure can be adjusted at any time (e.g. `width` and `height` or `scene` and `camera` can be changed at any time if you want).
     ```

     Die beiden folgenden Sätze behalten ihre kleingeschriebenen Anfänge. Der Befund ist eine falsche
     Aussage, nicht der Prosastil dieser Datei; eine Großschreibkorrektur nebenher änderte Text, den
     das Audit nicht beanstandet, und das steht in keiner Empfehlung. Das »however« trägt weiterhin:
     `#renderViewNow()` kehrt ohne zu zeichnen zurück, wenn `scene` oder `camera` fehlt
     (`ThreeMultiViewRenderer.js:81`). Nachgeprüft ist auch »on the frames of its entity« statt »once
     per frame«: der Listener von `ThreeRenderView` lässt einen Frame aus, solange der Render des
     vorigen noch offen ist (`ThreeRenderView.js:75-78`), ein Frame heißt also nicht zwingend ein
     Render.

  2. `docs/01-shadow-objects-api.md:100-104` — `renderView()` bekommt seinen eigenen Eintrag, und der
     Absatz, der ihn beschreibt, zieht darunter. Unmittelbar über die Zeile

     ```markdown
     > `threeMultiViewRenderer.updateSize()`
     ```

     wird eingefügt (mit einer Leerzeile zwischen jedem Block und einer Leerzeile zur
     `updateSize()`-Zeile hin):

     ```markdown
     > `threeMultiViewRenderer.renderView(view)` &rarr; `Promise<ImageBitmap | undefined>`

     Draws the view and answers with what it drew, read off the shared canvas as an `ImageBitmap`. Where there is nothing to draw, the answer carries no image: a view without a `scene` or without a `camera`, a view whose `width` or `height` is not above zero, and a view that was destroyed while it waited for its turn. Where there is something to draw and the view is not one this renderer made, the call is rejected with an error naming its `viewId`.

     Every view of one renderer draws with the same `WebGLRenderer` onto the same canvas, and reading a drawn frame back off that canvas is asynchronous. `renderView()` takes its turn accordingly: one view is drawn and read out at a time, in the order the calls arrived.
     ```

     Der zweite dieser beiden Absätze steht heute unter `updateSize()` und wird von dort **entfernt**
     — samt der Leerzeile, die ihn von seinem Nachbarn trennt. Er ist Wort für Wort derselbe und
     handelt ausschließlich von `renderView()`; er wandert unter die Methode, die er beschreibt.
     Der Abschnitt liest sich danach: `createView()` samt Strukturtabelle, `destroyView()`,
     `renderView()` samt Reihenfolge-Absatz, `updateSize()` samt Größen-Absatz, und als Schluss der
     unveränderte Absatz »When the entity ends, …«, der beide Methoden zugleich betrifft.

     Jede Aussage des neuen Absatzes ist am Code nachgesehen: die Rückgabe ohne Bild an
     `ThreeMultiViewRenderer.js:80` (Renderer freigegeben), `:81` (`scene` oder `camera` fehlt), `:82`
     (Breite oder Höhe nicht über null) und `:90` (View während der Wartezeit zerstört); die
     Ablehnung an `:84-86` mit `not my view: ${view.viewId}`, gemessen im Aufruferzug über `wasMine`
     (`:68`). Die Reihenfolge der Wächter ist der Grund für »Where there is something to draw«: eine
     fremde View ohne `scene` antwortet ohne Bild, statt abgelehnt zu werden. Der Fall »Renderer
     freigegeben« steht bewusst nicht in der Aufzählung — er hat seinen eigenen Absatz am Ende des
     Abschnitts, und zweimal dieselbe Aussage ist eine zu viel. Der Rückgabetyp steht in Backticks,
     nicht wie bei `createView()` in Unterstrichen: `Promise<ImageBitmap | undefined>` enthält
     spitze Klammern, die außerhalb von Code-Auszeichnung als HTML-Tag gelesen würden.

  3. `CHANGELOG.md` — ein neuer Punkt, als letzte Zeile der Aufzählung unter `## [Unreleased]`,
     unmittelbar hinter dem Punkt, der mit »- `ThreeMultiViewRenderer` reaches for nothing it has not
     built« beginnt. Der Abschnitt führt eine flache Liste ohne Unterüberschriften, jeder Punkt auf
     einer Zeile ohne Umbruch, und dieser auch. Wörtlich:

     ```markdown
     - The RenderView API reference (`docs/01-shadow-objects-api.md`) names what draws a view. A view is drawn once for every `renderView()` call it gets: `ThreeRenderView` makes those calls for the one view it holds, on the frames of its entity, and whoever calls `createView()` directly makes them for their view themselves. `renderView()` has an entry of its own there, with the answer it gives for a view that has nothing to draw and the error it gives for a view of another renderer.
     ```

     `CHANGELOG.md` steht in der Ausschlussliste von `biome.json` und wird nicht formatiert. Der
     Vorspann des Abschnitts bleibt unangetastet: er zählt keine Änderungen, sondern begründet den
     Minor-Sprung an zwei Breaking Changes, und dieser Punkt ist keiner.

  Was nicht angefasst wird, und warum:

  - Quelltext. Das Verhalten ist richtig; falsch war der Satz darüber. Keine Datei unter
    `packages/shae-offscreen-canvas/src/` bewegt sich, keine Spec, kein Testname.
  - `README.md` im Wurzelverzeichnis und `packages/shae-offscreen-canvas/README.md`. Keine von beiden
    nennt die RenderView API, `createView()` oder `renderView()`; nachgesehen am 2026-08-30 mit
    `grep` über alle `README.md` des Repositories.
  - `src/distContract.files.txt` und `src/distContract.package.json` des Canvas-Pakets. Weder
    `docs/` noch `CHANGELOG.md` werden ausgeliefert — `build.mjs:18` kopiert `README.md`, dazu
    `src/`, und die aufgezeichnete Dateiliste führt beide nicht. Dateiliste und Form von
    `.npm-pkg/package.json` bewegen sich nicht.
  - `pnpm make:todo`. Kein `TODO`-Kommentar bewegt sich; der eine im Paket steht in
    `ThreeMultiViewRenderer.js:42` und wird nicht berührt.
  - `docs/01-shadow-objects-api.md:114` (»[ThreeRenderView](#threerenderview) is what drives this API
    for a single entity…«) und `:138` (der Absatz »local entity events« unter `ThreeRenderView`).
    Beide sagen bereits, was der Code tut, und sagen es in denselben Worten wie Schritt 1. Sie
    bleiben stehen, weil sie an ihrer Stelle etwas anderes beantworten: `:83` sagt dem Leser der
    `createView()`-Beschreibung, was er selbst tun muss, `:114` und `:138` sagen dem Leser der
    Kontexttabellen, wer es sonst tut.
  - Der Absatz »When the entity ends, the renderer releases its WebGL context…«
    (`docs/01-shadow-objects-api.md:106`). Er betrifft `renderView()` und `updateSize()` zugleich und
    steht deshalb weiter am Ende des Abschnitts, nicht unter einem der beiden Einträge.
  - `packages/shadow-objects/CHANGELOG.md` und die Doku der Kernbibliothek. In diesem Paket bewegt
    sich nichts an `@spearwolf/shadow-objects`.
  - Die fünf Einträge aus »Offene Befunde« — drei im Kernpaket, einer im Testing-Paket, einer im
    e2e-Paket. Keiner teilt die Ursache dieses Pakets; sie bleiben bei der Drain-Runde des
    Abschlusses.
- Verify: `TURBO_FORCE=true pnpm lint && TURBO_FORCE=true pnpm typecheck && TURBO_FORCE=true pnpm build && TURBO_FORCE=true pnpm test:ci`
- Commit: `docs(canvas): nothing draws a render view but the call that draws it, and that call has its own entry`
- Ergebnis: 1 Runde · API-005 behoben — `docs/01-shadow-objects-api.md:83` nennt jetzt den
  `renderView()`-Aufruf als das, was eine Ansicht zeichnet, und sagt dem direkten
  `createView()`-Nutzer, dass er ihn selbst macht · der mitgenommene Nebenbefund gleicher Ursache
  ebenfalls behoben: `renderView()` hat einen eigenen Eintrag in der RenderView API, samt der
  Antwort ohne Bild, der Ablehnung einer fremden View und dem Reihenfolge-Absatz, der von
  `updateSize()` dorthin gewandert ist · kein Regressionstest, reines Doku-Paket ohne
  Verhaltensanteil, kein Quelltext bewegt sich · klein: das kleingeschriebene »however« im
  Folgesatz von `:83` — vom Detailplan ausdrücklich so belassen, es ist der Prosastil der Datei
  und nicht der beanstandete Sachverhalt
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine. Es bewegt sich ausschließlich Prosa; Dateiliste und Form von
  `.npm-pkg/` bleiben, weil weder `docs/` noch `CHANGELOG.md` ausgeliefert werden

**API-005 · niedrig · packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md:83** — Die API-Doku des Canvas-Pakets sagt eine Render-Automatik zu, die es nicht gibt
Der Satz »Once created, the view is rendered automatically with one of the next frames« beschreibt ein Verhalten, das der Code nicht hat: ThreeMultiViewRenderer hört auf keinen Frame-Takt. Gezeichnet wird eine Ansicht ausschließlich durch das ThreeRenderView, das sie besitzt und renderView() für sie ruft. Eine von Hand über createView() erzeugte Ansicht zeichnet damit niemand — sie bleibt leer, und die Doku sagt dem Leser, er müsse nur warten.
Empfehlung: Den Halbsatz durch die tatsächliche Bedingung ersetzen: eine Ansicht wird gezeichnet, solange ein ThreeRenderView sie hält und in seinem Frame renderView() für sie ruft. Wer createView() direkt benutzt, braucht den Hinweis, dass er das Zeichnen selbst auslöst.

### [x] 12. Die verbliebenen logger-Slots zur Laufzeit schließen
- Nebenbefund: fünf `readonly logger`, die nur zur Übersetzungszeit halten (aus Zug 0 von Paket 5)
- Ziel: Im ganzen Paket gilt eine Bauart — ein Logger-Slot lässt sich auch aus JavaScript nicht überschreiben, und die Doku sagt für keinen von ihnen mehr etwas zu, das die Laufzeit nicht einlöst.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.ts`, `src/elements/ShaeWorkerElement.ts`, `src/elements/ShaePropElement.ts`, `src/elements/ShaeEntElement.ts`, `src/worker/MessageRouter.ts`, `docs/api-reference.md`, `CHANGELOG.md`
- Hängt ab von: Paket 5 (dieselbe Bauart, dort an `ShadowEnv` und `RemoteWorkerEnv` vorgemacht)
- Hash: 6de493e
- Modell: mittlere Stufe
- Effort: low
- Dateien: `packages/shadow-objects/src/in-the-dark/Kernel.ts`,
  `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`,
  `packages/shadow-objects/src/elements/ShaePropElement.ts`,
  `packages/shadow-objects/src/elements/ShaeEntElement.ts`,
  `packages/shadow-objects/src/worker/MessageRouter.ts`,
  `packages/shadow-objects/src/elements/elementLoggerSlot.spec.ts` (neu),
  `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`,
  `packages/shadow-objects/src/worker/MessageRouter.spec.ts`,
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen: Fünf Klassen tragen denselben Slot in derselben Form: ein Instanzfeld `logger`, das
  jede Zuweisung annimmt. Die Zielform steht seit Paket 5 zweimal im Repository
  (`src/view/RemoteWorkerEnv.ts:206-210`, `src/view/ShadowEnv.ts:64-69`) und ein drittes Mal in
  `src/worker/WorkerRuntime.ts:22-24`, dort als fauler Getter. Jeder Schritt nennt den Text, der
  dasteht, und den Text, der danach dastehen soll. Die Zeilennummern gelten für den Stand `ea60f69`.
  Nichts außerhalb der genannten Stellen wird angefasst — insbesondere kein anderer Kommentar,
  keine andere Methode und keine der drei Element-Klassen über ihren Slot hinaus.

  **Zuerst die Regressionstests, und rot sehen.** Die Schritte 1 bis 3 laufen vor Schritt 4;
  der rote Lauf gehört in den Report. Die drei »hands out the same logger«-Fälle sind Pflöcke und
  vor wie nach dem Umbau grün.

  1. Neue Datei `packages/shadow-objects/src/elements/elementLoggerSlot.spec.ts`, ganzer Inhalt:

     ```ts
     import {describe, expect, it} from 'vitest';

     import '../shae-ent.js';
     import '../shae-prop.js';
     import '../shae-worker.js';
     import {SHAE_ENT, SHAE_PROP, SHAE_WORKER} from './constants.js';
     import {ShaeEntElement} from './ShaeEntElement.js';
     import {ShaePropElement} from './ShaePropElement.js';
     import {ShaeWorkerElement} from './ShaeWorkerElement.js';

     /**
      * The three elements answer alike, so the cases run over all three rather than once per class:
      * what is under test is the shape of the slot, and that shape is the same in each of them. On
      * two of the three the slot is `protected`, which only the type layer enforces -- the cast is
      * what lets a spec ask the question a plain JavaScript caller would ask.
      */
     const ELEMENTS = [
       {tag: SHAE_ENT, ctor: ShaeEntElement},
       {tag: SHAE_PROP, ctor: ShaePropElement},
       {tag: SHAE_WORKER, ctor: ShaeWorkerElement},
     ] as const;

     describe('the logger slot of the elements holds no setter', () => {
       it.each(ELEMENTS)('stands on the prototype as a getter without a setter: $tag', ({ctor}) => {
         const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, 'logger');

         expect(typeof descriptor?.get).toBe('function');
         expect(descriptor?.set).toBeUndefined();
       });

       it.each(ELEMENTS)('refuses an assignment and keeps the logger it reports through: $tag', ({tag}) => {
         const el = document.createElement(tag) as unknown as {logger: unknown};
         const logger = el.logger;

         expect(() => {
           el.logger = {};
         }).toThrow(TypeError);

         expect(el.logger).toBe(logger);
       });

       it.each(ELEMENTS)('hands out the same logger on every read: $tag', ({tag}) => {
         const el = document.createElement(tag) as unknown as {logger: unknown};

         expect(el.logger).toBe(el.logger);
       });
     });
     ```

     Die Datei steht neben `elementReachability.spec.ts` und ist wie diese nach ihrem Gegenstand
     benannt statt nach einer Klasse: sie prüft eine Eigenschaft, die alle drei Elemente teilen.
     Die Elemente werden mit `document.createElement()` gebaut und nie in das Dokument gehängt —
     ein direkter `new ShaeEntElement()` wirft »Illegal constructor«, und angehängt werden muss für
     diese Frage keines.

  2. `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts` — der Block wird als letzter
     `describe` unmittelbar vor der schließenden Zeile `});` der Datei (`:6012`) eingefügt,
     hinter `describe('the members that carry the bookkeeping of the kernel', …)`. **Ans Ende und
     nicht in die Mitte:** Paket 13 arbeitet in derselben Datei an den Zeilen 141 bis 181, und die
     bleiben so, wo sie sind.

     ```ts
       describe('the logger slot holds no setter', () => {
         it('stands on the prototype as a getter without a setter', () => {
           const descriptor = Object.getOwnPropertyDescriptor(Kernel.prototype, 'logger');

           expect(typeof descriptor?.get).toBe('function');
           expect(descriptor?.set).toBeUndefined();
         });

         it('refuses an assignment and keeps the logger it reports through', () => {
           const kernel = new Kernel();
           const logger = kernel.logger;

           expect(() => {
             (kernel as unknown as {logger: unknown}).logger = {};
           }).toThrow(TypeError);

           expect(kernel.logger).toBe(logger);
         });

         it('hands out the same logger on every read', () => {
           const kernel = new Kernel();

           expect(kernel.logger).toBe(kernel.logger);
         });
       });
     ```

  3. `packages/shadow-objects/src/worker/MessageRouter.spec.ts` — derselbe Block als letzter
     `describe` unmittelbar vor der schließenden Zeile `});` der Datei (`:670`). `setup()` steht
     an `:27` und gibt `{kernel, posted, postMessage, router}` zurück.

     ```ts
       describe('the logger slot holds no setter', () => {
         it('stands on the prototype as a getter without a setter', () => {
           const descriptor = Object.getOwnPropertyDescriptor(MessageRouter.prototype, 'logger');

           expect(typeof descriptor?.get).toBe('function');
           expect(descriptor?.set).toBeUndefined();
         });

         it('refuses an assignment and keeps the logger it reports through', () => {
           const {router} = setup();
           const logger = router.logger;

           expect(() => {
             (router as unknown as {logger: unknown}).logger = {};
           }).toThrow(TypeError);

           expect(router.logger).toBe(logger);
         });

         it('hands out the same logger on every read', () => {
           const {router} = setup();

           expect(router.logger).toBe(router.logger);
         });
       });
     ```

  4. `Kernel.ts:78` — aus

     ```ts
       readonly logger = new ConsoleLogger('Kernel');
     ```

     wird

     ```ts
       readonly #logger = new ConsoleLogger('Kernel');

       /** The logger this Kernel reports through. */
       get logger(): ConsoleLogger {
         return this.#logger;
       }
     ```

     `ConsoleLogger` ist in der Datei bereits als Wert importiert; keine Import-Zeile ändert sich.
     Die Stelle steht zwischen `registry` (`:76`) und `#entities` (`:80`) und bleibt dort.

  5. `ShaeWorkerElement.ts:59` — aus

     ```ts
       readonly logger = new ConsoleLogger('ShaeWorkerElement');
     ```

     wird

     ```ts
       readonly #logger = new ConsoleLogger('ShaeWorkerElement');

       /** The logger this element reports through. */
       get logger(): ConsoleLogger {
         return this.#logger;
       }
     ```

  6. `ShaePropElement.ts:91` — der Slot ist `protected` und bleibt es; der Getter trägt das
     Schlüsselwort, das Feld dahinter ist `#`-privat. Aus

     ```ts
       protected readonly logger = new ConsoleLogger('ShaePropElement');
     ```

     wird

     ```ts
       readonly #logger = new ConsoleLogger('ShaePropElement');

       /** The logger this element reports through: a subclass reads it and does not replace it. */
       protected get logger(): ConsoleLogger {
         return this.#logger;
       }
     ```

  7. `ShaeEntElement.ts:144` — dieselbe Form wie Schritt 6, mit dem Namensraum `ShaeEntElement`. Aus

     ```ts
       protected readonly logger = new ConsoleLogger('ShaeEntElement');
     ```

     wird

     ```ts
       readonly #logger = new ConsoleLogger('ShaeEntElement');

       /** The logger this element reports through: a subclass reads it and does not replace it. */
       protected get logger(): ConsoleLogger {
         return this.#logger;
       }
     ```

  8. `MessageRouter.ts:67-74` — hier hängt ein Kommentar am Slot, und sein erster Halbsatz
     beschreibt die Bauart, die sich gerade ändert. Der Grund darin bleibt gültig und wichtig: der
     Logger wird eifrig gebaut und nicht bei der ersten Lesung. Der ganze Block samt Feld wird
     ersetzt. Aus

     ```ts
       /**
        * A plain field rather than the lazy getter `WorkerRuntime.logger` needs to be: a `MessageRouter`
        * is only ever built from `WorkerRuntime.onmessage`, and only past the branch that answers the
        * `CONSOLE_LOGGER` configuration message and returns -- so by the time this field initializer
        * runs, that configuration has already been installed. The `Kernel` this router holds builds its
        * own logger the same way, in its own field initializer, on the same guarantee; which of the two
        * is built first is not something either one depends on.
        */
       readonly logger = new ConsoleLogger('MessageRouter');
     ```

     wird

     ```ts
       /**
        * Built in the field initializer rather than on first read, the way the lazy getter
        * `WorkerRuntime.logger` has to be: a `MessageRouter` is only ever built from
        * `WorkerRuntime.onmessage`, and only past the branch that answers the `CONSOLE_LOGGER`
        * configuration message and returns -- so by the time this initializer runs, that configuration
        * has already been installed. The `Kernel` this router holds builds its own logger the same way,
        * in its own field initializer, on the same guarantee; which of the two is built first is not
        * something either one depends on.
        */
       readonly #logger = new ConsoleLogger('MessageRouter');

       /** The logger this router reports through. */
       get logger(): ConsoleLogger {
         return this.#logger;
       }
     ```

  9. `docs/api-reference.md:1898` — die Eigenschaftstabelle von `<shae-worker>`. Aus

     ```markdown
     | `logger` | The `ConsoleLogger` this element reports through, read-only. |
     ```

     wird

     ```markdown
     | `logger` | The `ConsoleLogger` this element reports through, read-only. The slot is a getter without a setter, so `el.logger = …` throws a `TypeError` in strict mode and does nothing outside it. |
     ```

  10. `docs/api-reference.md:2040-2041` — die Prosa zu `<shae-ent>`. Zeile `:2042` beginnt mit
      `[Console Logger](#console-logger) for …` und bleibt unangetastet; der Satz davor endet
      deshalb auf »See«. Aus

      ```markdown
      `getParentNodeForObserver()` and the inherited `syncShadowObjectsOf()` are `protected` and meant
      for subclasses, and so is `logger`, a `ConsoleLogger` in the namespace `ShaeEntElement` — see
      ```

      wird

      ```markdown
      `getParentNodeForObserver()` and the inherited `syncShadowObjectsOf()` are `protected` and meant
      for subclasses, and so is `logger`, a `ConsoleLogger` in the namespace `ShaeEntElement` that a
      subclass reads and does not replace — the slot is a getter without a setter, so an assignment
      throws a `TypeError` in strict mode and does nothing outside it. See
      ```

  11. `docs/api-reference.md:2426-2428` — die Prosa zu `<shae-prop>`. Der Satz zählt `logger` mit
      den Signalen in einem Atemzug auf; die Signale bleiben beschreibbare Slots, `logger` wird
      keiner. Aus

      ```markdown
      Unlike the two other elements, `<shae-prop>` keeps its signals to itself: `entNode$`,
      `viewComponent$`, `name$`, `valueIn$`, `valueOut$`, `type$`, `shouldTrim$` and `logger` are
      `protected` and only reachable from a subclass. The Custom Elements callbacks —
      ```

      wird

      ```markdown
      Unlike the two other elements, `<shae-prop>` keeps its signals to itself: `entNode$`,
      `viewComponent$`, `name$`, `valueIn$`, `valueOut$`, `type$` and `shouldTrim$` are `protected`
      and only reachable from a subclass, and so is `logger` — that one a getter without a setter,
      which a subclass reads and does not replace: an assignment throws a `TypeError` in strict mode
      and does nothing outside it. The Custom Elements callbacks —
      ```

  12. `docs/api-reference.md:2643` — die Eigenschaftstabelle des `Kernel`. Die Zelle sagt
      »(readonly)«; dieselbe Spalte schreibt es an `:1200` und `:1898` als »read-only«, und da die
      Zelle ohnehin neu geschrieben wird, geht die Schreibweise mit. Aus

      ```markdown
      | `logger` | `ConsoleLogger` (readonly) | Logger for debugging, see [Console Logger](#console-logger). |
      ```

      wird

      ```markdown
      | `logger` | `ConsoleLogger` (read-only) | Logger for debugging, see [Console Logger](#console-logger). The slot is a getter without a setter, so `kernel.logger = …` throws a `TypeError` in strict mode and does nothing outside it. |
      ```

  13. `packages/shadow-objects/CHANGELOG.md` — drei Punkte, wörtlich. Die Abschnitte sind die
      verlässliche Adresse, nicht die Zahlen.

      Der erste steht unter `## [Unreleased]` → `### ⚠️ Breaking Changes`, unmittelbar hinter dem
      letzten vorhandenen Punkt, der mit **Breaking (elements):** beginnt (derzeit Zeile 221, der
      über `forward-custom-events`), und unmittelbar vor dem ersten, der mit **Breaking (kernel):**
      beginnt:

      ```markdown
      - **Breaking (elements):** the `logger` slot of `<shae-ent>`, `<shae-prop>` and `<shae-worker>` is a getter without a setter, so it is closed at runtime and not only to the type layer. An assignment — `el.logger = myLogger` — throws a `TypeError` in strict mode and does nothing outside it, and every read hands back the same `ConsoleLogger`. On `<shae-worker>` the slot is public; on the other two it is `protected` and meant to be read by a subclass, and a subclass that wants a logger of its own gives it another name, because a `logger` field declaration in a subclass either shadows the getter or throws, depending on how that subclass's class fields are compiled. All three classes are exported from `@spearwolf/shadow-objects`, so this is a change a consumer meets directly. One thing travels with it: `logger` is an accessor on the prototype rather than an own property of the instance, so it is absent from `Object.keys(el)`, from a `{...el}` spread and from `JSON.stringify(el)`.
      ```

      Der zweite steht im selben Abschnitt hinter dem letzten Punkt, der mit **Breaking (kernel):**
      beginnt (derzeit Zeile 224, der über die sieben `#`-privaten Methoden), und vor dem Punkt,
      der mit **Breaking (public API):** beginnt:

      ```markdown
      - **Breaking (kernel):** `Kernel.logger` is a getter without a setter. An assignment — `kernel.logger = myLogger` — throws a `TypeError` in strict mode and does nothing outside it, and every read hands back the same `ConsoleLogger`. The class is reachable through `@spearwolf/shadow-objects/shadow-objects.js`, so this is a change a consumer meets directly; `src/index.ts` does not re-export it. `logger` is an accessor on the prototype rather than an own property of the instance, so it is absent from `Object.keys(kernel)`, from a `{...kernel}` spread and from `JSON.stringify(kernel)`.
      ```

      Der dritte steht unter `## [Unreleased]` → `### Internal`, unmittelbar hinter dem vorhandenen
      Punkt, der mit **Internal (worker):** beginnt (derzeit Zeile 473, der über
      `WorkerRuntime.router`), und unmittelbar vor dem ersten Punkt, der mit **Internal (utils):**
      beginnt und `waitForMessageOfType()` nennt:

      ```markdown
      - **Internal (worker):** `MessageRouter.logger` is a getter without a setter, the shape every other logger of this package carries. Nothing on the published surface moves: no path of the `exports` map and no line of `src/index.ts` leads to `src/worker/MessageRouter.js`. The logger is still built in a field initializer rather than on first read, which is what keeps it downstream of the configuration message the worker answers before it builds a router.
      ```

  14. Nicht angefasst wird: `README.md`, `docs/cheat-sheet.md` und die übrigen `docs/`-Dateien,
      `src/distContract.files.txt`, `src/distContract.package.json`, das Wurzel-`CHANGELOG.md`,
      `packages/shae-offscreen-canvas/` und `packages/shadow-objects-testing/`. Begründung im
      Einzelnen unter »Warum das reicht«. Kein `TODO`-Kommentar liegt in einer der fünf Dateien,
      also läuft `pnpm make:todo` nicht mit.
- Verify: `TURBO_FORCE=true pnpm lint && TURBO_FORCE=true pnpm typecheck && TURBO_FORCE=true pnpm build && TURBO_FORCE=true pnpm test:ci`
- Commit: `fix: the logger slots of the kernel, the elements and the router refuse a write at runtime`
- Ergebnis: 1 Runde · alle fünf Logger-Slots (`Kernel`, `<shae-worker>`, `<shae-prop>`,
  `<shae-ent>`, `MessageRouter`) sind Getter ohne Setter · Regressionstests
  `the logger slot of the elements holds no setter` (neu in
  `src/elements/elementLoggerSlot.spec.ts`) und je ein Block `the logger slot holds no setter` in
  `Kernel.spec.ts` und `MessageRouter.spec.ts`, zusammen zehn Fälle, alle vor dem Fix rot · Review
  ohne Befund
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `Kernel.logger`, `ShaeWorkerElement.logger` (public) sowie
  `ShaePropElement.logger` und `ShaeEntElement.logger` (protected) sind Getter ohne Setter — eine
  Zuweisung wirft im Strict Mode einen `TypeError`; die Eigenschaft steht als Accessor auf dem
  Prototyp und fehlt damit in `Object.keys()`, im Spread und in `JSON.stringify()` ·
  `MessageRouter.logger` ebenso, aber ohne öffentlichen Pfad

**Warum das reicht — die Entscheidungen dieses Zug 0**

- **Alle fünf, und keiner mehr.** Der Abgleich hat jeden der fünf Slots an seiner Adresse
  angetroffen, unverändert seit Zug 0 von Paket 5. Ein sechster Logger im Paket ist
  `WorkerRuntime.logger` (`src/worker/WorkerRuntime.ts:22-24`) — er steht schon heute als Getter
  ohne Setter da, aus einem anderen Grund (er wird faul gebaut, weil der Runtime vor der
  Logger-Konfiguration existiert). Nach diesem Paket trägt das Paket eine Bauart, wie die
  Entscheidung vom 2026-08-30 sie verlangt, und es ist nichts übrig, was noch dazugehörte.
- **Die Risikoprüfung, gemessen statt vermutet.** Keine Klasse im Repository erbt von einer der
  fünf und deklariert ein eigenes `logger` — `ShaeEntElement` wird in siebzehn Testfällen
  abgeleitet, jeder davon mit leerem Rumpf oder einem leeren `connectedMoveCallback()`. Keine Zeile
  im Repository weist `.logger` zu außer den beiden Regressionsfällen aus Paket 5, die genau die
  Ablehnung prüfen. Der `logger` in
  `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:81` gehört einer
  Klasse, die von `HTMLElement` erbt und nicht von `ShaeEntElement`; der in
  `src/shadow-objects/ShaeOffscreenCanvas.js:33` einem Shadow Object. Beide bleiben, wie sie sind.
- **Der Preis für fremde Unterklassen, und warum er im CHANGELOG steht.** Die beiden `protected`
  Slots sind ausdrücklich für Unterklassen da (`docs/api-reference.md:2040-2042` und `:2426-2428`).
  Lesen bleibt; was fällt, ist das Überschreiben. Ob eine Unterklasse mit eigenem `logger`-Feld
  dabei still den Getter verdeckt oder mit einem `TypeError` stehenbleibt, entscheidet ihr eigener
  Compiler: dieses Repository steht auf `useDefineForClassFields: false` (`tsconfig.json:12`), also
  auf Zuweisungssemantik, ein Consumer kann auf der anderen Einstellung stehen. Beide Ausgänge sind
  unangenehm genug, um in einem Satz benannt zu werden, statt den Leser sie herausfinden zu lassen.
  Das Risiko selbst ist bewusst getragen — die Entscheidung vom 2026-08-30 sagt das.
- **Regressionstests, obwohl kein Rückgabewert sich ändert.** Was sich ändert, ist eine Zusage:
  eine Zuweisung geht nicht mehr durch. Das ist Verhalten und wird rot gesehen, bevor es grün wird,
  genau wie in Paket 5 — sonst steht am Ende ein grüner Test, von dem niemand mehr sagen kann, ob
  er die Zusage prüft oder nur die Gegenwart beschreibt. Für die drei Elemente gibt es im
  Kernpaket keine eigene Spec-Datei; die neue steht neben `elementReachability.spec.ts` und ist wie
  diese nach ihrem Gegenstand benannt. `Kernel` und `MessageRouter` bekommen ihren Block in ihrer
  vorhandenen Datei, ans Ende — dort, wo jemand ihn sucht, und dort, wo er Paket 13 nicht in die
  Zeilen fährt.
- **Doku ja, README und Contract nein.** Die öffentliche Oberfläche bewegt sich für vier der fünf
  Klassen: `ShaeEntElement`, `ShaePropElement` und `ShaeWorkerElement` stehen in
  `src/index.ts:8-10`, `Kernel` in `src/shadow-objects.ts`, das über
  `@spearwolf/shadow-objects/shadow-objects.js` in der `exports`-Map steht. `MessageRouter`
  erreicht kein Pfad — die einzige Nennung außerhalb des eigenen Ordners ist der Import in
  `WorkerRuntime.ts:3`. Also vier Doku-Stellen und drei CHANGELOG-Punkte, der letzte unter
  `### Internal` statt unter `### ⚠️ Breaking Changes`. `README.md` nennt keinen Logger
  (nachgesehen: keine Fundstelle für »logger« oder »Logger«), `docs/cheat-sheet.md` ebenso wenig,
  und die übrigen `docs/`-Dateien nennen Logger nur als Ausgabekanal, nie als Slot. Unter `dist/`
  kommt keine Datei hinzu und fällt keine weg — `src/distContract.files.txt` und
  `src/distContract.package.json` bleiben unangetastet, und `src/distContract.spec.ts` bestätigt
  das im Verify. Die `.d.ts` der fünf Klassen ändern ihren Inhalt (`readonly logger: ConsoleLogger;`
  wird `get logger(): ConsoleLogger;`), aber nicht ihre Zahl; alle fünf Klassen führen bereits
  `#`-private Member, es kommt also auch keine `#private;`-Zeile hinzu.
- **Restplan: eine Zeile.** Paket 12 hängt seinen Testblock ans Ende von `Kernel.spec.ts`, Paket 13
  streicht darin die auskommentierte Diagnose an `:141` bis `:181`. Anfügen statt Einfügen hält
  diese Nummern; die Zeile unter Paket 13 sagt es, damit dessen Zug 0 nicht daran rätselt. Sonst
  bewegt sich nichts: Paket 13 und 14 hängen von nichts ab, teilen mit Paket 12 keine Ursache und
  keine weitere Datei, und ihre Reihenfolge bleibt.

### [x] 13. Auskommentierte Diagnose aus den Testdateien entfernen
- Nebenbefund: dreizehn auskommentierte `console.log`-Aufrufe, zwei tote Typzusicherungen, drei auskommentierte Klassenfelder und eine tote `expect`-Zeile in Testdateien beider Pakete (aus Zug 0 von Paket 9, um die fünf Stellen ergänzt, die Zug 0 dieses Pakets bei derselben Ursache gefunden hat)
- Ziel: In Tests gilt dieselbe Regel wie im Quelltext — kein auskommentierter Code, der sagt, was einmal galt. Wer Werte im Betrieb sehen will, hat den ConsoleLogger.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`, `packages/shadow-objects-testing/test/build-change-trail.test.js`, `test/change-props.test.js`, `test/send-events.test.js`
- Hängt ab von: —
- Hash: 43d2805
- Modell: mittlere Stufe
- Effort: low
- Dateien: `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`,
  `packages/shadow-objects-testing/test/build-change-trail.test.js`,
  `packages/shadow-objects-testing/test/change-props.test.js`,
  `packages/shadow-objects-testing/test/send-events.test.js`
- Vorgehen: Jeder Schritt nennt den Text, der dasteht, und den Text, der danach dastehen soll. Die
  Zeilennummern gelten für den Stand `6de493e`, jede für ihre Datei und vor dem ersten Schritt an
  dieser Datei. Jeder Schritt macht seine Datei kürzer — wer von oben nach unten arbeitet,
  verschiebt also die Nummern darunter. Der zitierte Text ist die verlässliche Adresse, nicht die
  Zahl. Nichts außerhalb der genannten Stellen wird angefasst; insbesondere bleibt jeder Kommentar
  stehen, der in Prosa erklärt, warum ein Fall so gebaut ist, wie er gebaut ist — davon leben diese
  Dateien.

  Die Codeblöcke der Schritte tragen die fünf Leerzeichen der Aufzählung zusätzlich zur eigenen
  Einrückung der Datei. »Aus« und »wird« sind gleich eingerückt, der Unterschied zwischen beiden
  ist also genau der Text.

  Die Schritte 1 bis 4 räumen eine einzige liegengebliebene Diagnose in
  `it('change token', …)` (`Kernel.spec.ts:96-191`) ab: die drei Klassen führen ein
  auskommentiertes Feld `name`, die beiden Zuweisungen eine auskommentierte Zusicherung darauf, und
  die vier `console.log`-Aufrufe lesen es. Die vier Schritte fallen zusammen oder gar nicht.

  1. `Kernel.spec.ts:97-110` — die drei Klassenrümpfe werden leer, wie der vierte an `:112-113`
     ohnehin schon dasteht. Aus

     ```ts
         @ShadowObject({token: 'foo'})
         class Foo {
           // name = 'foo';
         }
     ```

     wird

     ```ts
         @ShadowObject({token: 'foo'})
         class Foo {}
     ```

     und ebenso für `class Bar {` mit `// name = 'bar';` (`:103-105`) und `class Plah {` mit
     `// name = 'plah';` (`:108-110`). Die Dekoratorzeile darüber und die Leerzeile zwischen den
     Klassen bleiben, wie sie sind.

  2. `Kernel.spec.ts:141-148` — die tote Zusicherung und der erste `console.log`-Block. Aus

     ```ts
         let shadowObjects = kernel.findShadowObjects(uuid); // as unknown as {name: string}[];

         // console.log(
         //   'shadowObjects before changeToken',
         //   shadowObjects.map((so) => so.name),
         // );

         expect(shadowObjects, 'testA shadow-constructors').toHaveLength(2);
     ```

     wird

     ```ts
         let shadowObjects = kernel.findShadowObjects(uuid);

         expect(shadowObjects, 'testA shadow-constructors').toHaveLength(2);
     ```

     Das `let` bleibt: die Variable wird an zwei weiteren Stellen neu gesetzt.

  3. `Kernel.spec.ts:159-168` — dieselbe Zusicherung ein zweites Mal und der zweite Block. Aus

     ```ts
         shadowObjects = kernel.findShadowObjects(uuid); // as unknown as {name: string}[];

         expect(shadowObjects, 'check 2').toHaveLength(2);

         // console.log(
         //   'shadowObjects after changeToken',
         //   shadowObjects.map((so) => so.name),
         // );

         expect(
     ```

     wird

     ```ts
         shadowObjects = kernel.findShadowObjects(uuid);

         expect(shadowObjects, 'check 2').toHaveLength(2);

         expect(
     ```

  4. `Kernel.spec.ts:180-183` — die beiden einzeiligen Aufrufe über `truthyProps` und `propKeys`.
     Aus

     ```ts
         kernel.changeProperties(uuid, [['plah', 'hello']]);

         // console.log('truthyProps', Array.from(kernel.getEntity(uuid).truthyProps()));
         // console.log('changeProperties', Array.from(kernel.getEntity(uuid).propKeys()));

         shadowObjects = kernel.findShadowObjects(uuid);
     ```

     wird

     ```ts
         kernel.changeProperties(uuid, [['plah', 'hello']]);

         shadowObjects = kernel.findShadowObjects(uuid);
     ```

  5. `Kernel.spec.ts:3438-3440`, im Fall `should call onDestroy when entity is destroyed` — eine
     tote `expect`-Zeile und der Kommentar darüber, der sie beschreibt und damit der Zeile
     widerspricht, die tatsächlich läuft. Aus

     ```ts
           expect(onDestroyFn).toHaveBeenCalledTimes(1);
           // When entity is destroyed, the kernel is passed (event emitted by destroyEntity)
           expect(onDestroyFn).toHaveBeenCalledWith(entity);
           // expect(onDestroyFn).toHaveBeenCalledWith(kernel);
     ```

     wird

     ```ts
           expect(onDestroyFn).toHaveBeenCalledTimes(1);
           // The hook is handed the entity the shadow-object was attached to, not the kernel that released it.
           expect(onDestroyFn).toHaveBeenCalledWith(entity);
     ```

     Der neue Satz ist nachgesehen und nicht geraten: `src/in-the-dark/events.ts:29` deklariert
     `[onDestroy](entity: Entity): void`, und `Kernel.ts:922` ruft
     `(shadowObject as OnDestroy)[onDestroy](entity)`. Die Zeile darunter prüft genau das.

  6. `packages/shadow-objects-testing/test/` — neun auskommentierte `console.log`-Aufrufe, alle in
     derselben Gestalt: eine Leerzeile davor, eine Leerzeile danach. Gestrichen wird die
     Kommentarzeile **und die Leerzeile unmittelbar darunter**; die Leerzeile darüber bleibt und
     trennt danach die Anweisung von dem `expect`, das folgt. Aus

     ```js
         let changeTrail = cc.buildChangeTrails();

         // console.log('append e to b (1st)', JSON.stringify(changeTrail, null, 2));

         e.token = 'bee';
     ```

     wird

     ```js
         let changeTrail = cc.buildChangeTrails();

         e.token = 'bee';
     ```

     Die neun Stellen, je Datei von oben nach unten:

     - `build-change-trail.test.js:36` — `// console.log('append e to b (1st)', JSON.stringify(changeTrail, null, 2));`
     - `build-change-trail.test.js:44` — `// console.log('append e to b (2nd)', JSON.stringify(changeTrail, null, 2));`
     - `build-change-trail.test.js:131` — `// console.log('reCreateChanges', JSON.stringify(changeTrail, null, 2));`
     - `build-change-trail.test.js:191` — `// console.log('reCreateChanges with change gap', JSON.stringify(changeTrail, null, 2));`
     - `change-props.test.js:35` — `// console.log('changeTrail:before', JSON.stringify(changeTrail, null, 2));`
     - `change-props.test.js:64` — `// console.log('changeTrail:after', JSON.stringify(changeTrail, null, 2));`
     - `change-props.test.js:91` — `// console.log('changeTrail:after:2', JSON.stringify(changeTrail, null, 2));`
     - `send-events.test.js:38` — `// console.log('changeTrail:before', JSON.stringify(changeTrail, null, 2));`
     - `send-events.test.js:71` — `// console.log('changeTrail:after', JSON.stringify(changeTrail, null, 2));`

  7. Nicht angefasst wird: `docs/`, `README.md`, `src/distContract.files.txt`,
     `src/distContract.package.json`, beide Paket-`CHANGELOG.md` und das Wurzel-`CHANGELOG.md`.
     Begründung im Einzelnen unter »Warum das reicht«. Kein `TODO`-Kommentar liegt in einer der
     vier Dateien, also läuft `pnpm make:todo` nicht mit. Ebenfalls stehen bleibt
     `packages/shadow-objects-testing/test/worker-element-attributes.test.js:69` — die Zeile nennt
     `console.error`/`console.warn` in einem Prosasatz über den Aufbau des Falles und ist kein
     auskommentierter Code.
- Kein Regressionstest: Alle Stellen sind Kommentare und eine nie ausgeführte `expect`-Zeile; kein
  Rückgabewert, keine Reihenfolge und kein Zeitpunkt ändert sich. Der Beleg ist, dass die
  bearbeiteten Suiten unverändert grün bleiben — `Kernel.spec.ts` und die drei Integrationsdateien
  laufen alle im Verify (`pnpm test:ci` schließt `shadow-objects-testing` ein, nur
  `shadow-objects-e2e` bleibt draußen). Wer dabei einen Fall rot sieht, hat Code gestrichen statt
  eines Kommentars.
- Verify: `TURBO_FORCE=true pnpm lint && TURBO_FORCE=true pnpm typecheck && TURBO_FORCE=true pnpm build && TURBO_FORCE=true pnpm test:ci`
- Commit: `test: the commented-out diagnostics and the dead assertions leave the test files`
- Ergebnis: 1 Runde · alle achtzehn Stellen entfernt — die fünf Teile der liegengebliebenen
  Diagnose in `it('change token', …)` (`Kernel.spec.ts`), die tote `expect`-Zeile samt
  widersprechendem Kommentar in `should call onDestroy when entity is destroyed`, und die neun
  auskommentierten `console.log`-Zeilen in den drei Integrationsdateien unter
  `packages/shadow-objects-testing/test/` · Review ohne Befund · kein Regressionstest, da nur
  Kommentare und eine nie ausgeführte Zeile fielen; Beleg ist der unverändert grüne Verify-Lauf
  · der Implementierer hat den Plan mit angefasst und dabei die Dublette der Pakete 9 bis 13 samt
  dem Anhang von Paket 8 wieder eingeschleppt; sie ist heraus, jedes Paket steht wieder genau
  einmal im Dokument, der Stand davor liegt als `paket-13.plan-vor-repair.md` im
  Arbeitsverzeichnis
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — alle vier Dateien sind Tests und erreichen `dist/` nicht
  (`build.mjs:48` überspringt `.spec.`/`.test.`-Dateien beim Transpilieren)

**Warum das reicht — die Entscheidungen dieses Zug 0**

- **Fünf Stellen kommen dazu, und sie sind dieselbe Ursache.** Drei davon (`Kernel.spec.ts:99`,
  `:104`, `:109`) sind auskommentierte Felder `name = '…'` an genau den drei Klassen, deren
  `so.name` die auskommentierten `console.log`-Blöcke an `:143` und `:163` lesen wollten, und die
  beiden toten Zusicherungen an `:141` und `:159` sind die Typseite desselben Versuchs. Das ist
  keine Sammlung ähnlicher Zeilen, sondern eine einzige liegengebliebene Diagnose in fünf Teilen;
  drei davon zu streichen und zwei stehen zu lassen, hieße den Rest beim nächsten Audit erneut zu
  lesen. Die vierte Klasse desselben Falles (`ObersteDirektive`, `:112-113`) steht schon heute mit
  leerem Rumpf da und ist die Zielform der anderen drei.
- **Die tote `expect`-Zeile nimmt ihren Kommentar mit.** `Kernel.spec.ts:3440` ist auskommentierter
  Code in einer der vier genannten Dateien und damit unmittelbar dieses Paket. Der Kommentar
  darüber (`:3438`) beschreibt sie — »the kernel is passed« — und widerspricht damit der Zeile, die
  tatsächlich läuft und `entity` erwartet. Fällt die tote Zeile allein, bleibt ein Kommentar
  stehen, der dem Code unter ihm ins Gesicht sagt, er prüfe etwas anderes; das ist schlechter als
  der Zustand davor. Was die eigene Änderung umwirft, gehört zu ihr, also wird der Satz auf das
  gezogen, was gilt.
- **Kein CHANGELOG, in keinem der drei.** Dieses Paket fasst ausschließlich Testdateien an, und
  keine davon erreicht einen Konsumenten. `build.mjs:48` überspringt beim Transpilieren jede Datei,
  die auf `.spec.` oder `.test.` endet, `src/distContract.files.txt` führt keine einzige
  Spec-Datei, und `packages/shadow-objects-testing` ist `private` und hat aus diesem Grund gar
  keinen CHANGELOG. Damit bewegt sich weder die öffentliche Oberfläche noch die Form von `dist/` —
  die beiden Bedingungen, an denen die »Konventionen« den Paket-CHANGELOG festmachen. Das
  Wurzel-`CHANGELOG.md` scheidet aus dem anderen Grund aus: Build, CI, Testrunner und
  Lint-Konfiguration bleiben unberührt, es ändert sich der Inhalt von Testfällen und nicht das
  Gerüst, das sie fährt. Damit ist dies das erste Paket dieses Laufs ohne CHANGELOG-Punkt, und das
  ist kein Versehen, sondern die Regel angewandt.
- **Der Plan trug die Pakete 8 bis 12 zweimal.** Beim Abgleich lag `./remediation-plan.md` mit
  3513 Zeilen vor, und der Block von Paket 7s »Warum das reicht« bis zum Verify-Kommando von
  Paket 12 stand Zeichen für Zeichen zweimal darin. Die erste Ausfertigung endete mit der
  `Ergebnis:`-Zeile von Paket 12, die zweite mit dessen `Verlauf:` — dem Stand vor dem Commit.
  Da `6de493e` steht, ist die `Ergebnis:`-Zeile die gültige Form und der Verlauf hat seinen Zweck
  erfüllt; die Dublette samt Verlauf ist heraus — 1420 Zeilen —, und Paket 12 steht
  jetzt wie die Pakete 7 bis 11: Ergebnis, Nebenbefunde, Folgen, Schnittstellen, dann »Warum das
  reicht«. Nachgeprüft und nicht geglaubt: ein Zeilenvergleich der beiden Fassungen weist als
  einzigen restlos verschwundenen Text die neunzehn Zeilen des Verlaufs aus. Der Stand davor liegt
  als `paket-13.plan-vor-dedup.md` im Arbeitsverzeichnis.
- **Restplan unverändert.** Paket 14 liegt in `packages/shadow-objects-e2e/`, teilt mit Paket 13
  keine Datei und hängt von nichts ab; die Reihenfolge bleibt. »Offene Befunde« wächst nicht: die
  fünf zusätzlichen Stellen gehen in dieses Paket statt in die Queue, und der repoweite Nachschlag
  über alle 75 `*.spec.*`- und `*.test.*`-Dateien beider Pakete hat keine weitere auskommentierte
  Codezeile gefunden. Nach diesem Paket und Paket 14 sind alle fünf Einträge der Queue erledigt,
  und offen bleibt allein, was der Abschluss zu tun hat: das Finding über `reCreateChanges()` in
  die `./audit.html` schreiben.

### [x] 14. shadow-objects-e2e: die halb geführte Umstellung zu Ende bringen
- Nebenbefund: auskommentierte Imports und eine auskommentierte Zuweisung in `bundle.ts`, dazu eine Datei ohne Importeur (aus Zug 0 von Paket 9)
- Ziel: Der Einstiegspunkt des E2E-Pakets sagt, was gilt, und die Datei, auf die nur noch Kommentare zeigen, ist weg.
- Bereich: `packages/shadow-objects-e2e/src/bundle.ts`, `src/bundle.worker.ts` (Löschung)
- Hängt ab von: —
- Hash: 6f7f812
- Modell: mittlere Stufe
- Effort: low
- Dateien: `packages/shadow-objects-e2e/src/bundle.ts` (geändert),
  `packages/shadow-objects-e2e/src/bundle.worker.ts` (gelöscht)
- Vorgehen: Zwei Schritte, beide wörtlich ausgeschrieben. Die Zeilennummern gelten für den Stand
  `43d2805`; der zitierte Text ist die verlässliche Adresse, nicht die Zahl. Die Codeblöcke tragen
  die fünf Leerzeichen der Aufzählung zusätzlich zur eigenen Einrückung der Datei — »Aus« und
  »wird« sind gleich eingerückt, der Unterschied zwischen beiden ist also genau der Text. Beide
  Schritte fallen zusammen oder gar nicht: sie sind die zwei Hälften einer einzigen Umstellung, und
  eine ohne die andere lässt entweder einen Kommentar zurück, der auf nichts mehr zeigt, oder eine
  Datei, auf die nichts mehr zeigt.

  1. `packages/shadow-objects-e2e/src/bundle.ts` — alles ab der Leerzeile `:4` fällt weg. Die
     Leerzeile gehört dazu: sie trennt die drei laufenden Importe vom Kommentarblock und hat ohne
     ihn nichts mehr zu trennen. Aus der ganzen Datei

     ```ts
     import '@spearwolf/shadow-objects/bundle.js';
     import './bundle-tests.js';
     import './style.css';

     // the worker is now integrated in bundle.js, so we no longer need it here:

     // import {ShadowWorker} from '@spearwolf/shadow-objects/bundle.js';
     // import BundleWorker from './bundle.worker.js?worker';

     // ShadowWorker.createWorker = () => new BundleWorker();
     ```

     wird die ganze Datei

     ```ts
     import '@spearwolf/shadow-objects/bundle.js';
     import './bundle-tests.js';
     import './style.css';
     ```

     Die drei verbleibenden Zeilen bleiben Zeichen für Zeichen, wie sie sind, und die Datei endet
     mit einem Zeilenumbruch nach `import './style.css';` — 358 Bytes vorher, 100 nachher.

  2. `packages/shadow-objects-e2e/src/bundle.worker.ts` wird gelöscht, mit `rm` und ausdrücklich
     **nicht** mit `git rm`. Der Grund ist der Reviewer: Zug 3 erzeugt den Diff mit `git add -N`
     und `git diff`, also Arbeitsbaum gegen Index. Eine mit `git rm` bereits vorgemerkte Löschung
     steht dann nur in `git diff --cached` und fehlt in dem Diff, den der Reviewer liest — die
     Hälfte des Pakets wäre unsichtbar. Vorgemerkt wird sie in Zug 5, wo `git add` mit beiden
     Pfaden die Löschung mit aufnimmt. Die Datei lautet vollständig:

     ```ts
     import '@spearwolf/shadow-objects/shadow-objects.worker.js';

     console.log('hejsan!');
     ```

  3. **Nicht angefasst wird** — und das ist hier mehr als eine Formalie, siehe »Warum das reicht«:
     `packages/shadow-objects/src/create-worker.bundle.ts` und `packages/shadow-objects/build.mjs`
     (beide nennen `bundle.worker.js`, meinen aber einen virtuellen Pfad im *Kernpaket*, nicht
     diese Datei), `packages/shadow-objects-e2e/vite.config.mjs`, `tsconfig.json`,
     `pages/bundle.html`, `tests/bundle.spec.ts`, `README.md`, `TEST-PLAN.md`,
     `src/vite-env.d.ts`, beide Paket-`CHANGELOG.md` und das Wurzel-`CHANGELOG.md`,
     `src/distContract.files.txt` und `src/distContract.package.json`. In keiner der beiden
     Dateien steht ein `TODO`-Kommentar, also läuft `pnpm make:todo` nicht mit.
- Kein Regressionstest: Es fallen drei Kommentarzeilen, eine Kommentarzeile in Prosa, zwei
  Leerzeilen und eine Datei, die kein Bundler und kein Typechecker je über einen Importpfad
  erreicht. Kein Rückgabewert, keine Reihenfolge und kein Zeitpunkt ändert sich. Der Beleg ist die
  unangetastete `tests/bundle.spec.ts`, die grün bleiben muss und im Verify läuft (siehe dort). Ein
  Test gegen »hier steht kein auskommentierter Code« wäre eine Lint-Regel, und Lint ist in diesem
  Projekt ausschließlich Biome — eine Regel dort ist Gerüst und gehört nicht in diesen Lauf.
- Verify: `TURBO_FORCE=true pnpm lint && TURBO_FORCE=true pnpm typecheck && TURBO_FORCE=true pnpm build && TURBO_FORCE=true pnpm test:ci && pnpm -F shadow-objects-e2e exec playwright test bundle.spec.ts --project=chromium --reporter=line`
  Der letzte Teil ist die Handprüfung, die der Abschnitt »Verify« im Kopf für das Playwright-Paket
  verlangt. Er startet über `webServer` selbst `pnpm run preview` (also `tsc && vite build` und
  danach `vite preview`), baut damit genau die Seite, deren Einstiegsmodul dieses Paket ändert, und
  fährt sie. Im Log muss am Ende `13 passed` stehen. Am 2026-08-30 gegen `43d2805` **vor** jeder
  Änderung so gemessen: 13 von 13 grün, 3,3 s Testzeit, Log `paket-14.e2e-baseline.log` im
  Arbeitsverzeichnis. Ein roter Lauf danach ist also diese Änderung und kein vorbestehender Defekt.
- Commit: `refactor(e2e): the bundle entry holds only its live imports, and the unimported worker module goes`
- Ergebnis: 1 Runde · beide Hälften umgesetzt wie ausgeschrieben · kein Regressionstest (der
  Detailplan begründet das) · Verify grün, `pnpm test:ci` und dazu die Handprüfung
  `bundle.spec.ts` chromium 13/13 in 3,2 s, gleichauf mit der Basislinie an `43d2805` ·
  klein: die im Detailplan genannte Zielgröße von `bundle.ts` ist 96 Bytes und nicht 100 — der
  Inhalt steht zeichengenau wie vorgeschrieben, die Zahl war die Schätzung · klein: der Reviewer
  meldete die Löschung als vorzeitig im Index vorgemerkt und hielt das für einen Verstoß gegen
  »mit `rm`, nicht mit `git rm`«. Der Implementierer hat `rm` benutzt; ins Staging kam die Löschung
  durch das `git add -N -- .` des Reviewzugs, das eine gelöschte getrackte Datei mit vormerkt. Für
  den Diff heißt das: `git diff` gegen den Index zeigt sie dann nicht mehr, `git diff HEAD` schon —
  so ist er hier erzeugt worden, und der Reviewer hat beide Hälften gesehen.
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — `shadow-objects-e2e` ist `private`, kein Symbol verlässt das Paket, und
  weder Dateiliste noch Form von `dist/` der Kernbibliothek bewegen sich

**Warum das reicht — die Entscheidungen dieses Zug 0**

- **Beide Hälften stehen unverändert da.** `git show df9f9b9:packages/shadow-objects-e2e/src/bundle.ts`
  und dasselbe für `bundle.worker.ts` geben Zeichen für Zeichen den heutigen Stand zurück; der
  Befund ist vorbestehend und dieser Lauf hat ihn nicht bewegt. Angefasst hat der Lauf in diesem
  Paket überhaupt nur `playwright.config.ts` (Paket 9, `ec7d469`), und die Datei teilt mit den
  beiden hier nichts. Die Adressen des Queue-Eintrags gelten damit weiter — einzige Korrektur:
  er nennt `bundle.ts:4-10`, der Kommentarblock beginnt an `:5`, und `:4` ist die Leerzeile davor,
  die mit ihm fällt.
- **`bundle.worker.ts` hat keinen Importeur — nachgesehen, nicht vermutet.** Ein repoweiter
  `grep` nach `bundle.worker` (ohne `node_modules`, `dist/`, `.turbo/`) findet außerhalb dieses
  Plans genau vier Stellen: die auskommentierte Zeile `bundle.ts:8`, und im **Kernpaket**
  `create-worker.bundle.ts:2`, `create-worker.bundle.ts:7` und `build.mjs:86`. Die drei letzten
  meinen etwas anderes, und ein Implementierer, der das übersieht, löscht am falschen Ende:
  `./bundle.worker.js` ist dort ein *virtueller* Pfad, den ein esbuild-Resolver in `build.mjs` auf
  `dist/src/shadow-objects.worker.js` umbiegt; eine Datei dieses Namens gibt es unter
  `packages/shadow-objects/src/` nicht. Zusätzlich nimmt `vite.config.mjs` als Einstiegspunkte
  ausschließlich die HTML-Seiten unter `pages/` und `index.html` — auch der Bundler zieht die Datei
  also über keinen Umweg herein. Sie fällt aus der Typprüfung, weil `tsconfig.json` das ganze
  Verzeichnis `src` per Glob einschließt und nicht einzelne Dateien nennt; nachzuführen ist dort
  nichts.
- **Kein weiterer Fundort im Paket.** Der Queue-Eintrag beschreibt zwei Hälften, und mehr sind es
  auch nicht: ein `grep` über `src/`, `tests/`, `scripts/` und `public/` des e2e-Pakets nach
  Kommentarzeilen, die mit einem Statement beginnen, liefert als einzige Treffer die drei Zeilen in
  `bundle.ts`. Alles andere, was er anzeigt, ist Prosa über den Aufbau eines Falles und bleibt
  stehen. Das Paket wächst also nicht, und »Offene Befunde« wächst auch nicht.
- **Kein CHANGELOG, in keinem der drei.** `shadow-objects-e2e` ist `private` und führt aus diesem
  Grund gar keinen; `CLAUDE.md` sagt das ausdrücklich. Der Paket-CHANGELOG der Kernbibliothek
  scheidet aus, weil sich weder ihre öffentliche Oberfläche noch die Form von `dist/` bewegt — die
  beiden Bedingungen, an denen die »Konventionen« ihn festmachen; aus demselben Grund bleiben
  `src/distContract.files.txt` und `src/distContract.package.json` unberührt, und
  `src/distContract.spec.ts` bestätigt das im Verify. Das Wurzel-`CHANGELOG.md` scheidet aus dem
  anderen Grund aus: Build, CI, Testrunner und Lint-Konfiguration bleiben unberührt, es ändert sich
  der Inhalt eines E2E-Fixtures und nicht das Gerüst, das es fährt. Dieselbe Rechnung wie bei
  Paket 13, mit demselben Ergebnis.
- **Keine Doku.** `README.md:23` und `TEST-PLAN.md:35` beschreiben die Seite `bundle` über das, was
  sie prüft — den Single-File-Build und den eingebetteten Worker —, und BUNDLE-3
  (`TEST-PLAN.md:276`) sagt genau die Aussage, die nach der Änderung erst recht stimmt: der
  eingebettete Worker startet ohne eigenen Netzwerkabruf für eine Worker-Datei. Keine Zeile in
  `README.md`, `TEST-PLAN.md` oder `KNOWN-DEFECTS.md` nennt `bundle.worker.ts` oder einen zweiten,
  separaten Worker. Die Doku beschreibt bereits den Zustand nach diesem Paket; sie beschrieb ihn
  schon vorher, und genau das machte die drei Kommentarzeilen zum Befund.
- **Die Handprüfung fährt den Fall, den sie prüft.** Der Kopf stellt das Playwright-Paket außerhalb
  der Baseline und verlangt von dem, der es anfasst, eine Prüfung von Hand. Paket 9 hat das mit
  `playwright test --list` getan, weil es die Konfiguration änderte und die Frage lautete, ob die
  Matrix noch lädt. Hier ist die geänderte Datei das Einstiegsmodul von `pages/bundle.html`, und
  die Frage lautet, ob die Seite noch lädt und ihren Round-Trip durch den eingebetteten Worker
  schafft — dafür taugt nur ein echter Lauf. Chromium allein, weil sich der Modulgraph ändert und
  kein Browserverhalten: Firefox und WebKit führen denselben Graphen ein zweites und drittes Mal
  aus, und WebKit braucht auf dieser Maschine zusätzlich den Schritt `setup:webkit`. Der Preis
  dieser Wahl ist eine Messung von 3,3 s, und dafür steht in der Verify-Kette der einzige Beleg,
  den `pnpm test:ci` nicht liefern kann: `pnpm test:ci` lässt `shadow-objects-e2e` aus.
- **Restplan unverändert — es gibt keinen mehr.** Paket 14 ist das letzte, es hängt von nichts ab
  und nichts hängt an ihm. Nach seinem Commit sind alle fünf Einträge unter »Offene Befunde«
  erledigt, und offen bleibt allein, was der Abschluss zu tun hat: das Finding über
  `reCreateChanges()` in die `./audit.html` schreiben.
