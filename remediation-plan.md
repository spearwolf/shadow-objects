# Remediation-Plan — @spearwolf/shadow-objects (Monorepo)

Quelle: ./audit.html vom 2026-08-28 · Branch: main · erstellt: 2026-08-28
Baseline: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test` ✓ (654 E2E + 3 vitest-Suiten, Coverage 93.11 % Statements)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/c98d644c-ffbb-4cdc-8ac8-2df06af05b1e/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 19 von 45 Findings (0 critical, 0 high, 0 medium, 8 low, 11 info) plus die offene Frage und alle vier Punkte aus »Optimierungspotenzial« · ausgenommen: SEC-002 (acknowledged) und die 26 vom Nutzer nicht gepickten Findings
Scope-Regel: alles ab low aufwärts, jede Kategorie — gilt auch für Befunde, die erst im Lauf auffallen. Reine info-Nebenbefunde gehen als neues Finding ins Audit.
Stand (2026-08-28): Lauf abgeschlossen · 14 Pakete, davon 13 committet und 1 als gegenstandslos entfallen · kein Paket blockiert · »Offene Befunde« abgearbeitet: 3 in Paketen behoben, 14 als neue Findings ins Audit · voller Verify-Lauf grün (lint, typecheck, build, test — 62 vitest-Dateien und 654 E2E-Tests, 0 Cache-Treffer), Coverage 93,56 % Statements gegen 93,11 % Baseline · Arbeitsbaum sauber

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

**Die `./audit.html` ist älter als ihr Datum.** Gelesen wurde sie gegen
`292714c` (2026-08-27 17:10); die Fassung vom 2026-08-28 (`f4d5dc5`) ist
derselbe Report mit nachgetragenem Ergebnis des vorigen Laufs, kein zweiter
Lesevorgang. Dazwischen liegen dreizehn Commits, und ihre Wirkung steht in
keinem Feld: ein Finding trägt wenigstens `carried-over` und eine Fundstelle,
die sich prüfen lässt (mehrere zeigen ins Leere — `TYPE-003` nennt `:391`, wo
heute `:492` steht), ein Punkt aus dem Optimierungspotenzial trägt gar nichts.
Paket 2 ist genau daran entfallen. Jeder Abgleich in Zug 0 liest deshalb die
Fundstelle, bevor er dem Report glaubt.

## Entscheidungen

- Der `ComponentContext` führt seine Mitglieder durchgehend über die Instanz, nicht über die uuid. Damit ist die offene Frage des Reports beantwortet; der Zustand »an manchen Stellen so, an anderen anders« entfällt (2026-08-28)
- Ein Change Trail wird nur dort bestätigt, wo der Aufrufer eine Bestätigung anfordert. Jeden Trail bestätigen zu lassen ist ausgeschlossen — bei `auto-sync="frame"` kostete das eine Rundreise je Bild (2026-08-28)
- Die zweite Aufrufform des `ViewComponent`-Konstruktors wird als Overload deklariert und dokumentiert, nicht fallen gelassen (2026-08-28)
- `ShadowEntsEventMap` wird umbenannt, ersatzlos und ohne Alias unter dem alten Namen. Das Paket steht unter 1.0; der Bruch kommt als solcher ins CHANGELOG (2026-08-28)
- `ShadowEnv.ns$` wird verdrahtet, nicht entfernt. Der Slot bekommt den Wert, den sein Name zusagt (2026-08-28)
- `generateUUID` bekommt `crypto.getRandomValues()` als Fallback und verliert die 290-zeilige Nachschlagetabelle aus three.js. Der verbleibende `Math.random`-Zweig meldet sich einmalig auf der Console (2026-08-28)
- Der Riegel am Creation Scope nach `tearDown()` wirft, statt still `undefined` zu liefern — dieselbe Zusage, die `bindTo()` an dieser Klasse bereits fährt (2026-08-28)
- Diese Zeile ist überholt und wird durch die folgende ersetzt: Der Riegel am Creation Scope bleibt in der Form, in der er steht — träger, aber echter Rückgabewert plus eine Meldung je Mitglied auf `error`, kein Wurf. Er kam mit `78b128a` aus dem vorigen Lauf, zwei Stunden nach dem Code-Stand, gegen den die `audit.html` gelesen wurde, und deckt alle fünfzehn Mitglieder der Creation API. Wer spät anruft, ist ein Timer, eine Fortsetzung hinter einem `await` oder ein fremder Callback, und keiner davon hat einen Ort für einen Wurf; der Kernel selbst ruft nach dem Teardown nie an, ein Wurf träfe also allein die Autoren von Shadow Objects (2026-08-28)
- Die Ein-Element-Form von `ComponentPropertiesType` wird als Eingangs-Toleranz dokumentiert. Sie zu streichen wäre eine Verhaltensänderung an einer exportierten Struktur und braucht einen eigenen Auftrag (2026-08-28)
- Der Commit `d38ce80` bleibt stehen, obwohl sein Runner ihn ohne Implementierer- und Reviewer-Beleg abgelegt hat und die Schleife deshalb mit Exit 20 angehalten ist. Die Änderung ist rein mechanisch — sieben Deklarationen und fünfzehn Aufrufstellen tauschen ein Schlüsselwort gegen ein Doppelkreuz —, und sie ist von außen nachprüfbar: `Kernel.ts` trägt keine `private`-Methode mehr, der Regressionstest zählt die sieben Namen auf `Kernel.prototype` und wäre vor dem Wechsel zwangsläufig rot gewesen, Verify-Log exit 0 mit 93,32 % Statements gegen 93,11 % Baseline, Lint und Typecheck vom Orchestrator erneut gefahren und grün. Ein zweiter Durchgang lieferte dieselben Zeichen. Der Verfahrensbruch ist damit gebucht, nicht geheilt; die Beweiskette dieses einen Pakets trägt die Prüfung des Orchestrators statt der zwei Rollen (2026-08-28)

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

- **Doku ist Teil des API-Vertrags.** Eine Änderung an der öffentlichen API von
  `@spearwolf/shadow-objects` fasst im selben Zug `packages/shadow-objects/docs/`,
  `packages/shadow-objects/README.md` und `packages/shadow-objects/CHANGELOG.md`
  an. Für `@spearwolf/shae-offscreen-canvas` gilt dasselbe in dessen eigenem
  `docs/`, `README.md` und `CHANGELOG.md`.
- **Drei Changelogs.** Paketweite Laufzeit-/API-Änderungen in das CHANGELOG des
  jeweiligen Pakets unter `## [Unreleased]`; Build, Testrunner, Lint, turbo/pnpm
  und devDeps in das CHANGELOG im Repo-Root, als datierter Abschnitt.
- **Sprache.** Doku und Code-Kommentare durchgehend Englisch, Doku in Markdown.
  Commit-Messages Englisch, im Stil der vorhandenen Historie
  (`fix(kernel): …`, `chore: …`).
- **Terminologie ist bindend.** ECS-Begriffe, nie »shadow theater«, »puppet«,
  »puppeteer«, »light world«, »screen« als Analogie. `RemoteWorkerEnv` (nicht
  `RemoteShadowObjectEnv`), Entity (nicht Shadow Entity), Entity Tree (nicht
  Graph), Token (nicht Component Tag). `ComponentContext` ist die View-seitige
  Registry einer Namespace; »Entity Context« ist die Dependency Injection entlang
  des Entity Trees. Die beiden werden nie vermischt.
- **Der `dist/`-Zuschnitt ist Vertrag.** Ändert sich die Dateiliste oder die
  Form von `dist/package.json`, ziehen `src/distContract.files.txt` und
  `src/distContract.package.json` mit, plus CHANGELOG-Eintrag. Für
  `shae-offscreen-canvas` gilt dasselbe gegen `.npm-pkg/`.
- **Dependency-Versionen** stehen ausschließlich im `catalog:`-Block von
  `pnpm-workspace.yaml`, referenziert als `"<dep>": "catalog:"`. Kein Range in
  einer `package.json` eines Pakets.
- **TODOs.** Wer ein `TODO` anlegt, ändert oder entfernt, fährt `pnpm make:todo`.
- **`AGENTS.md`** wird nach einer Änderung an Quellen oder Doku erneut gelesen
  und in Deckung gebracht, nicht später nachgezogen.

## Vorbestehende Fehler

Keine. Lint, Typecheck, Build und die vollständige Testsuite waren zu
Lauf-Beginn grün.

## Offene Befunde

Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

- [x] `packages/shadow-objects/src/view/ComponentContext.ts:304` (erledigt mit `8ffa1d7` als Paket 13) — `getChildren()` dereferenzierte jede Kind-uuid mit `!`, während `#appendToOrdered` (`:937`) und `#traverseLevelOrderBFS` (`:971`) denselben Fall abfangen und im Doc-Kommentar ausdrücklich als möglich beschreiben (»a partially torn down list can never turn a reordering into an exception«); eine Kinderliste mit einer uuid ohne Eintrag lässt `getChildren()` mit einem `TypeError` enden, wo die beiden Nachbarn überspringen. Aus Paket 1, vorbestehend (`git show 8e0911b:…:283`). Geschätzt low → Scope
- [x] `packages/shadow-objects/src/view/ComponentContext.ts:356` — der Wortlaut der Fehlermeldung von `addToChildren` ist grammatisch falsch: »because the component do not exist!«. Eine Meldung, die ein Konsument zu sehen bekommt. Aus Paket 1, vorbestehend (`:339`). Geschätzt info → Audit
- [x] `packages/shadow-objects/src/view/ComponentContext.ts:328` — `childEntry.changes?.setParent(undefined)`: `changes` ist im `ViewInstance`-Interface nicht optional, der Optional-Chain ist tot und behauptet eine Lücke, die es nicht gibt. Aus Paket 1, vorbestehend (`:313`). Geschätzt info → Audit
- [x] `packages/shadow-objects/src/elements/ShaeElement.ts:14-29` (erledigt mit `44e989b`) — der Mikrotask-Sammler leert `SyncNamespaces` erst hinter der Schleife, und `nextSyncIsScheduled` steht zu dem Zeitpunkt bereits wieder auf `false`: wirft ein `ShadowEnv.sync()`, behält das Set seine Einträge, und der nächste Durchgang synchronisiert alte Namespaces mit. Heute unerreichbar — `ShadowEnv.sync()` setzt Flags und stellt eine Mikrotask ein, es gibt keinen werfenden Zweig —, deshalb latent und nicht aktiv. Aus Paket 3, vorbestehend (Datei seit `8e0911b` an dieser Stelle unverändert). Geschätzt info → Paket 11 (Zug 0 am 2026-08-28 übernommen: gleiche Ursache; der gemeinsame Sammler leert vor der Auslieferung und kapselt sie, womit beide Hälften des Eintrags fallen)
- [x] `packages/shadow-objects/src/utils/waitForMessageOfType.ts:39` — die Frist greift nur für `timeout !== 0 && timeout !== Infinity`; ein negativer Wert oder `NaN` kommt durch, `NaN` feuert `setTimeout` sofort und lehnt mit `timeout: NaN` ab. Kein Aufrufer im Repo reicht so etwas durch, die vier Fristen sind Konstanten oder Optionswerte. Aus Paket 3, vorbestehend. Geschätzt info → Audit
- [x] `packages/shadow-objects/docs/api-reference.md:1567` — die Zeile `timeouts` beschreibt eine Lücke, statt sie zu schließen: das Objekt ist eingefroren, der Eigenschaftsslot aber nur typseitig `readonly`, ein `env.timeouts = …` geht zur Laufzeit durch und umgeht die Zusage darüber. Dasselbe gilt laut derselben Zeile für `logger`. Die Doku ist korrekt, die Oberfläche ist es nicht. Aus Paket 3, vorbestehend. Geschätzt info → Audit
- [x] `packages/shadow-objects/CHANGELOG.md:389` — die `### Types`-Zeile sagt Konsumenten eine Verengung an `generateUUID()` zu, die sie nicht erreichen kann: das Symbol steht weder in `index.ts` noch in einem Pfad der `exports`-Map, und `ViewComponent.uuid` bleibt `get uuid(): string`. Die Zusage ist am emittierten `.d.ts` wahr und trifft trotzdem niemanden. Aus Paket 4, vorbestehend (die Zeile kam mit `8f9475c` aus einem früheren Lauf, nicht aus diesem Paket). Geschätzt info → Audit
- [x] `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:769` — `onDestroy(cb)`, gerufen aus einem Cleanup, den `tearDown()` in seiner zweiten Schleife (`:319`) fährt — der Cleanup eines `createEffect` oder das `cleanup` eines `createResource` —, bucht `cb` in `#unsubscribePrimary`, das die erste Schleife (`:315`) bereits abgegangen ist; `:347` leert die Menge, und `cb` läuft nie und wird nirgends gemeldet. Leser, Links und Provider aus derselben Stelle werden weiter mitgenommen, was der Kommentar auf `:122-126` und der Doku-Absatz »The creation API past the teardown« zusagen. Geschätzt info, weil ein Cleanup, der während des Abbaus einen weiteren Cleanup registriert, von keiner Zusage gedeckt ist und kein Weg, den Konsumentencode plausibel nimmt. Aus Paket 2, vorbestehend (Datei seit `8e0911b` unverändert). → Audit
- [x] `packages/shadow-objects/src/utils/props-utils.ts:26` (erledigt mit `fcb2610` als Paket 14) — `applyPropsChanges` verliert die Ein-Element-Form, sobald `curProps` existiert: die Schleife destrukturiert `[key]` zu `value === undefined` und schiebt `[key, undefined]` nach, was das abschließende `filterUndefinedProps` (`:31`) wieder wegwirft. Im Zweig `curProps === undefined` (`:19-20`) überlebt derselbe Eintrag als `[key]`. Dieselbe Eingabe bedeutet auf den beiden Wegen also »gesetzt, ohne Wert« und »gar nicht gesetzt«, gegen die Zusage von `ComponentPropertiesType`. Aus Paket 7, vorbestehend (Datei seit `8e0911b` an dieser Stelle unverändert). Geschätzt low → Scope
- [x] `packages/shadow-objects/src/view/ViewComponent.spec.ts:430` und `:438` — die Testnamen `ignores a token change` und `ignores an order change` behaupten das Gegenteil ihrer eigenen Zusicherung: beide prüfen, dass der Wert lokal ankommt (`expect(c.token).toBe('other')`, `expect(c.order).toBe(5)`). Ignoriert wird allein die Meldung an den `ComponentContext`. Aus Paket 7, vorbestehend. Geschätzt info → Audit
- [x] `packages/shadow-objects/docs/cheat-sheet.md:497` — `## FrameLoop` steht ohne den `---`-Trenner, den jeder andere Abschnitt der Datei vor sich führt. Aus Paket 7, vorbestehend. Geschätzt info → Audit
- [x] `packages/shadow-objects/src/in-the-dark/Registry.spec.ts:31` — `new Set('x')` übergibt einen String statt eines Arrays. Das ergibt hier zufällig `Set {'x'}`, weil der Property-Name ein Zeichen lang ist; bei `new Set('debug')` stünden fünf Einzelbuchstaben in der Menge. Der Test prüft, was er meint, aber nur solange niemand den Namen verlängert — die vier Nachbarn schreiben `new Set([...])`. Aus Paket 10, vorbestehend (`git show 8e0911b:…` zeigt die Zeile wortgleich). Geschätzt info → Audit
- [x] `packages/shadow-objects/src/in-the-dark/Registry.ts:41` und `:59` — der Wert in `#truthyPropRoutes` führt neben `routes` ein Feld `token`, das `appendRoute` schreibt (`:59`) und niemand liest: die drei Lesestellen (`:57`, `:102`, `:113`) greifen ausschließlich auf `.routes` zu, das Feld ist privat und von außen nicht erreichbar. Der Token steckt bereits im Schlüssel der Map (`token@prop`), aus dem `toPropRoute` ihn auch gewonnen hat. Aus Paket 10 (Zug 0), vorbestehend (`git show 8e0911b:…` zeigt beide Zeilen wortgleich). Geschätzt info → Audit
- [x] `packages/shadow-objects/docs/cheat-sheet.md:234-237` — der Absatz »Truthy value ≠ presence« steht unter `<shae-worker>` und zählt `no-trim` mit auf, das ein Attribut von `<shae-prop>` ist (dort korrekt auf `:284`). Wer die Tabelle darüber liest, sucht `no-trim` bei `<shae-worker>` vergeblich. Aus Paket 7, vorbestehend. Geschätzt info → Audit
- [x] `packages/shadow-objects/src/view/ComponentContext.ts:517` — der Doc-Kommentar von `dispatchReRequestParentRoots()` sagt »Nothing inside the library calls it«, während `dispatchReRequestParentSiblings()` (`:573`) sie aufruft und die Auslieferung der gesammelten Runden (`:659`) ebenfalls. Der Nachbarsatz an `dispatchReRequestParentSiblings()` (`:568`) stimmt dagegen — diese Methode hat wirklich keinen Aufrufer in der Bibliothek. Aus Paket 11, vorbestehend (`git show 8e0911b~1:…` zeigt beide Sätze wortgleich auf `:498-499`). Geschätzt info → Audit
- [x] `packages/shadow-objects/src/utils/props-utils.ts:36` — `propsEqual()` hat repoweit keinen Aufrufer außer der eigenen Spec: `git grep propsEqual` findet die Funktion allein in `props-utils.ts` und in `props-utils.spec.ts`, wo zehn Fälle (`:99-167`) sie decken. Erreichbar ist sie auch von außen nicht — das Modul steht weder in `index.ts` noch in einem Pfad der `exports`-Map. Aus Paket 14 (Zug 0), vorbestehend (`git grep propsEqual 8e0911b` zeigt zur Lauf-Basis ebenfalls keinen Aufrufer). Geschätzt info → Audit
- [x] `packages/shadow-objects/src/utils/props-utils.ts:4` — `filterUndefinedProps()` meldet »nichts« in zwei Formen: `undefined` für eine fehlende oder leere Liste, ein leeres Array für eine Liste, aus der der Filter alles herausnimmt (`[['x', undefined]]`). Beide stehen im Rückgabetyp, und `applyPropsChanges` reicht die zweite an `ComponentState.properties` durch. Folgenlos, solange niemand die zwei Formen auseinanderhält: `if (cMem.properties)` in `ComponentContext.reCreateChanges()` (`:820`) hält ein leeres Array für gesetzt und läuft null Runden, und die eine Stelle, an der sie auseinanderfielen — `propsEqual` (`:41`, `[]` gegen `undefined` ergibt `false`) —, ruft niemand. Aus Paket 14 (Zug 0), vorbestehend (Zeile seit `8e0911b` wortgleich). Geschätzt info → Audit

## Pakete

### [x] 1. Der ComponentContext führt seine Mitglieder über die Instanz

- Findings: CONS-003 (info), CONS-004 (info), CONS-005 (info), CONS-012 (low) — dazu die offene Frage des Reports und der Punkt »Der ComponentContext entscheidet sich für die Instanz« aus dem Optimierungspotenzial
- Ziel: Jede Identitätsfrage im Innenraum des Contexts wird an `#componentInstances` gestellt, sodass eine ausgeschiedene Instanz nirgends mehr als Mitglied durchgeht.
- Bereich: `packages/shadow-objects/src/view/ComponentContext.ts`, `packages/shadow-objects/src/view/ViewComponent.ts`
- Hängt ab von: —
- Hash: 667f81d
- Modell: stärkste Stufe (opus)
- Effort: high
- Dateien: `packages/shadow-objects/src/view/ComponentContext.ts`, `packages/shadow-objects/src/view/ViewComponent.ts`, `packages/shadow-objects/src/view/ComponentContext.spec.ts`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`

**Zwei Fragen, nicht eine.** Der Abgleich am Code hat gezeigt, dass »die Identität über die Instanz führen« zwei verschiedene Fragen meint, und sie zu verwechseln bricht den Aufbauweg:

1. **Mitgliedschaft** — »ist diese Instanz gerade Mitglied dieses Contexts?« Antwort: `#componentInstances`. Genau eine Methode stellt diese Frage: `hasComponent()`.
2. **Eintragsbesitz** — »gehört der Eintrag unter `component.uuid` dieser Instanz?« Antwort: `entry.component === component`. Das ist die Frage jeder Methode, die einen Eintrag anfasst.

Der Unterschied ist nicht akademisch. `addComponent()` schreibt `#componentInstances.add(component)` als **letzte** Zeile, ruft davor aber `addToChildren()` — eine Prüfung auf Mitgliedschaft dort lehnt jeden Neuzugang ab. Und `transferPropertiesTo()` wird vom `context`-Setter auf dem **verlassenen** Context aufgerufen, wo die Instanz per Definition kein Mitglied mehr ist; über Mitgliedschaft geprüft, ginge keine Property mehr von einem Context in den nächsten. Beide Wege brauchen den Eintragsbesitz, und beide sind durch die vorhandene Testsuite gedeckt.

- Vorgehen:
  1. In `ComponentContext.ts` einen privaten Helfer neben `#components`/`#componentInstances` anlegen:
     `#entryOf(component: ViewComponent): ViewInstance | undefined` — liest `this.#components.get(component.uuid)` und gibt ihn nur zurück, wenn `entry.component === component`, sonst `undefined`. Kommentar auf Englisch, der das *Warum* trägt: ein Eintrag überlebt den Austritt seiner Komponente bis zum nächsten Change Trail, eine Suche über die uuid kann also den Eintrag eines Namensvetters zurückgeben; jede Methode, die eine Instanz bekommt, fragt hierdurch.
  2. `hasComponent(component)` auf `return this.#componentInstances.has(component);` umstellen. Doc-Kommentar dazu: das ist die eine Frage nach Mitgliedschaft; eine Komponente, die den Context verlassen hat, bekommt `false`, auch solange ihr Eintrag noch steht — Einträge zählt `hasComponents()`.
  3. Die folgenden Methoden in `ComponentContext.ts` über `#entryOf` führen. Verhalten für eine Instanz, die ihren Eintrag nicht (mehr) besitzt: die Methode tut nichts und meldet das leere Ergebnis ihres Rückgabetyps.
     - `isRootComponent(component)` → `this.#entryOf(component) !== undefined && this.#rootComponents.includes(component.uuid)`
     - `getChildren(component)` → `this.#entryOf(component)?.children.map(…) ?? []`
     - `removeFromParent(component, parent)` → das `if (this.hasComponent(parent))` samt der `!`-Assertion auf `#components.get(parent.uuid)` fällt weg; stattdessen `const parentEntry = this.#entryOf(parent); if (parentEntry === undefined) return;` und darunter unverändert `const childEntry = this.#entryOf(component); if (childEntry === undefined) return;`. Die Beförderung zur Wurzel bleibt, wo sie steht — auch im Fall `childIdx === -1`.
     - `moveToRoot(component)` → `const childEntry = this.#entryOf(component);`, Rumpf unverändert. `this.#viewInstances = undefined;` bleibt, wo es steht.
     - `changeToken(component, token)` → `this.#entryOf(component)?.changes.changeToken(token)`
     - `isChildOf(child, parent)` → `const parentEntry = this.#entryOf(parent); return parentEntry !== undefined && this.#entryOf(child) !== undefined && parentEntry.children.includes(child.uuid);`
     - `addToChildren(parent, child)` → der Elternteil über `#entryOf(parent)`, der `throw` samt Wortlaut bleibt unverändert. Die Arbeit an der Kindseite — `#appendToOrdered`, `changes.setParent`, `removeFrom(this.#rootComponents, child.uuid)` — läuft nur, wenn `this.#entryOf(child) !== undefined`; sonst kehrt die Methode zurück, ohne etwas zu tun. Ohne diesen Riegel schreibt der Aufruf eine uuid in eine Kinderliste, für die es keinen Eintrag gibt, und der nächste `clear()` läuft in seine Panic.
     - `setProperty(component, …)` → `const vi = this.#entryOf(component)`
     - `removeProperty(component, …)` → `this.#entryOf(component)?.changes.removeProperty(propKey)`
     - `dispatchShadowObjectsEvent(component, …)` → `this.#entryOf(component)?.changes.createEvent(…)`
     - `transferPropertiesTo(component, target)` → `const vi = this.#entryOf(component)`
     - `#registerPropIsEqual(component, …)` → `const vi = this.#entryOf(component)`
     - `changeOrder(component)` → `const entry = this.#entryOf(component); if (entry === undefined) return;` und die Elternsuche darunter `component.parent ? this.#entryOf(component.parent) : undefined`
     - `destroyComponent(component)` → `const entry = this.#entryOf(component);` und die Bedingung darunter auf `if (entry !== undefined && !entry.changes.isDestroyed)` verkürzen. Gleiches Verhalten, eine Form.
  4. Unverändert bleiben, und der Kommentar sagt jeweils warum:
     - `addComponent()` sucht absichtlich über die uuid — sie muss einen fremden Eintrag finden, um ihn zu übernehmen, und ist die eine Stelle, die über eine Übernahme entscheidet (`#componentInstances.has(viewInstance.component)`).
     - `dispatchMessage(uuid, …)`, `removeSubTree(uuid)`, `#removeSubTree(uuid, …)`, `#deleteComponent(uuid, …)` bekommen laut Vertrag eine uuid und keine Instanz.
     - `hasComponents()` zählt Einträge und zählt weiter Einträge.
     - `#flushPeerReRequests()` fragt bereits `#componentInstances` — die Mitgliedschaftsfrage, richtig gestellt.
  5. `ViewComponent.ts`, `assertUsableAsParent(parent, childContext)`: hinter die beiden vorhandenen Prüfungen eine dritte setzen —
     `if (!childContext.hasComponent(parent)) { throw new ViewComponentError('cannot add a child to a view component its context does not hold'); }`.
     Die beiden vorhandenen Meldungen und ihre Reihenfolge bleiben unangetastet; nach ihnen ist `childContext` nicht mehr `undefined`, der Zugriff also sicher. **Diese Prüfung hat heute keinen erreichbaren Auslöser** — eine Instanz, die ihren Eintrag an einen Namensvetter verliert, hat ihren Context vorher verlassen und scheitert bereits an der ersten Prüfung. Sie steht als Invariante da, damit »die Instanz nennt einen Context« und »der Context führt die Instanz« nicht auseinanderlaufen können. Für sie gibt es deshalb keinen roten Test; wer einen sucht, verliert eine Runde.
  6. Regressionstests in `ComponentContext.spec.ts`, jeder **vor** dem Fix rot gesehen, die rote Ausgabe gehört in den Report:
     - `describe('hasComponent')`: (a) »answers no for a component that has left, while its entry still stands« — Komponente anlegen, `buildChangeTrails()`, `destroy()`, dann `hasComponent(vc)` `false` und `hasComponents()` `true`. (b) »answers no for a component whose uuid a successor has taken over« — `holder` mit uuid `'twin'`, `buildChangeTrails()`, `holder.destroy()`, `successor` mit derselben uuid; `hasComponent(holder)` `false`, `hasComponent(successor)` `true`.
     - `describe('changeOrder')`: »leaves the entry of a successor where it is« — `parent`; `holder` mit uuid `'twin'` und `order: 7`; `buildChangeTrails()`; `holder.destroy()`; `successor` mit uuid `'twin'`, `parent` und `order: 0`; `buildChangeTrails()`; dann `ctx.changeOrder(holder)`. Erwartet: `ctx.isRootComponent(successor)` `false`, `ctx.getChildren(parent).map((c) => c.token)` gleich `['successor']`, `ctx.buildChangeTrails()` leer. Ohne den Fix landet `'twin'` in `#rootComponents` und der Eintrag des Nachfolgers trägt `order: 7`.
     - Ein Test, der die übrigen Wege mit derselben ausgeschiedenen Instanz abklopft: `getChildren(holder)` leer, `isRootComponent(holder)` `false`, `isChildOf(kid, holder)` `false`, `ctx.setProperty(holder, 'x', 1)` `false`, und `ctx.changeToken(holder, 'nope')` lässt das Token des Nachfolgers im nächsten Trail unangetastet.
  7. Zwei vorhandene Tests in `ComponentContext.spec.ts` benutzen `hasComponent` als Ersatzfrage für »der Eintrag steht noch« und werden von Schritt 2 rot: `'keeps the entry of a component whose destruction nobody applied'` und `'still sends the destruction of a component that was destroyed while the trail travelled'`. In beiden wird `expect(ctx.hasComponent(a), …).toBe(true)` zu `expect(ctx.hasComponents(), …).toBe(true)` — `a` ist in beiden Tests die einzige Komponente, die Zahl sagt also genau, was die Zeile meint. Der Meldungstext bleibt. Danach die ganze Datei fahren: jede weitere Zeile, die bricht, bekommt dieselbe Behandlung — fragt sie nach dem Eintrag, wird sie `hasComponents()` oder die Zusicherung über den Change Trail darunter; fragt sie nach Mitgliedschaft, bleibt sie stehen.
  8. `packages/shadow-objects/docs/api-reference.md`:
     - Ein kurzer Absatz direkt unter der Tabelle »Components and hierarchy«, der die Regel einmal ausspricht: eine Methode, die einen `ViewComponent` bekommt, wirkt ausschließlich auf den Eintrag, der dieser Instanz gehört; `hasComponent()` beantwortet die Mitgliedschaft, `hasComponents()` zählt Einträge.
     - Zeilen der Tabelle: `hasComponent(component)` (»Whether this instance is a member of this context« statt »holds a component with that uuid«), `isRootComponent`, `isChildOf`, `getChildren` (leeres Array für eine Instanz ohne eigenen Eintrag), `addToChildren` (die Kindseite wird nicht angefasst, wenn der Context den Child-Eintrag nicht für diese Instanz führt), `changeOrder`. Dazu in den Tabellen darunter `setProperty`, `removeProperty`, `changeToken`, `dispatchShadowObjectsEvent`.
     - Bei `#### addChild(child)` die Aufzählung der `ViewComponentError`-Gründe um einen dritten Punkt ergänzen: der Context des Elternteils führt es nicht.
     - Im Abschnitt »The destroyed state« den Satz über `destroyComponent()` weiterziehen: die freigegebene Instanz ist danach kein Mitglied mehr, und `hasComponent()` sagt das.
  9. `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]` → `### Behavior`: ein Eintrag im Haus-Stil, `**Behavior (view):** …` — `ComponentContext` beantwortet jede Frage nach der Instanz, die er bekommt, und nicht nach ihrer uuid; genannt wird, was ein Konsument merkt (`hasComponent()` antwortet `false` für eine Komponente, die den Context verlassen hat, auch solange ihr Eintrag noch steht — `hasComponents()` ist die Frage nach dem Eintrag), und dass `getChildren`, `isRootComponent`, `isChildOf`, `changeOrder`, `changeToken`, `setProperty`, `removeProperty` und `dispatchShadowObjectsEvent` den Eintrag eines Namensvetters nicht mehr anfassen. Im einleitenden Absatz unter `## [Unreleased]` steht eine gezählte Behauptung (»Fifty-three changes reach existing consumers«) — sie wird auf vierundfünfzig gehoben und bekommt ihren Halbsatz.
  10. Nicht nötig, damit niemand danach sucht: `pnpm make:todo` (kein TODO berührt); `AGENTS.md` (nennt keine Methode des `ComponentContext`); `src/distContract.files.txt` und `src/distContract.package.json` (keine Datei kommt, geht oder wird umbenannt, `dist/package.json` behält seine Form); `README.md` und die übrigen Dateien unter `docs/` (keine von ihnen nennt eine der geänderten Methoden).
- Verify: `pnpm lint:ci && pnpm typecheck && pnpm test:ci`
  Die E2E-Suite bleibt draußen: ein volles `pnpm test` fährt 654 Playwright-Tests über drei Browser und riskiert die Zehn-Minuten-Grenze des Bash-Werkzeugs, die den Verify-Lauf mitten im Paket erschlägt. Der einzige E2E-Leser einer hier angefassten Methode ist `packages/shadow-objects-e2e/src/multi-env.js:269` mit `getChildren()` auf einer lebenden Komponente, und der ist von der Änderung nicht betroffen. `test:ci` fährt die drei vitest-Suiten samt der Browser-Integrationssuite, und dort liegen die Leser, auf die es ankommt.
- Commit: `fix(view): a component context answers for the instance it was given, not for the uuid`
- Ergebnis: 1 Runde · CONS-003, CONS-004, CONS-005 und CONS-012 behoben, die offene Frage des Reports beantwortet und der Punkt aus dem Optimierungspotenzial erledigt · privater Helfer `#entryOf()` führt alle vierzehn Methoden aus Punkt 3, `hasComponent()` steht auf `#componentInstances`, die vier Stellen aus Punkt 4 unangetastet · Regressionstests `answers no for a component that has left, while its entry still stands`, `answers no for a component whose uuid a successor has taken over`, `leaves the entry of a successor where it is` und `is turned away by every way in that takes a component` — alle vier vor dem Fix rot gesehen · zwei vorhandene Tests, die `hasComponent` als Eintragsfrage benutzten, stehen jetzt auf `hasComponents()` · Verify `pnpm lint:ci && pnpm typecheck && pnpm test:ci` exit 0 mit `TURBO_FORCE=true`, 0 von 8 Tasks aus dem Cache, Coverage 93.09 % Statements (Baseline 93.11 %) · Reviewer: kein kritischer, kein wichtiger Befund
- Klein, bewusst nicht behoben: `docs/api-reference.md:1023` nennt bei `removeFromParent` weiter nur die Kindseite, der neue Absatz auf `:1029` fängt es generisch auf · `docs/api-reference.md:779` »the parent's context does not hold it« — »it« ist in seiner Liste zweideutig · die beiden neuen Riegel (`ComponentContext.ts:349`, `ViewComponent.ts:28`) tragen keinen Hinweis »not currently reachable«, für den `clear()` auf `:846` die Hausform hätte · der stille `return` in `addToChildren()` lässt im Konfliktfall `child.#parent` auf den Elternteil zeigen, während die Kinderliste nichts davon weiß — unerreichbar, und der Detailplan verlangt genau diese Form
- Entschieden: der CHANGELOG-Eintrag darf den Vorzustand erzählen (»where they used to act on …«). Das Konventionsverbot des Rückblicks zielt auf Code, Kommentare und Doku, in denen der Vorzustand nichts erklärt; der Migrationsabsatz und jeder Eintrag unter `⚠️ Breaking Changes` in `packages/shadow-objects/CHANGELOG.md` haben den Vorzustand als Gegenstand und sind seit jeher in diesem Register geschrieben. Ein Breaking-Change-Eintrag, der nicht sagt, was bricht, erfüllt seinen Zweck nicht.
- Nebenbefunde: 4 → »Offene Befunde« (1 → Scope · 3 → Audit)
- Folgen: keine — was der Umbau umgeworfen hat, liegt in den fünf committeten Dateien; die drei Leser von `hasComponent()` in `packages/shadow-objects-testing` (`worker-element-attributes.test.js:564,611`, `local-env-entities.test.js:87`) fragen nach lebenden Komponenten und bleiben richtig
- Schnittstellen: keine Signatur, kein Export und keine Konstante hat sich bewegt. Zwei Zusagen für spätere Pakete an denselben Dateien (7 und 11): `ComponentContext` führt jede Methode, die eine `ViewComponent`-Instanz bekommt, über den privaten Helfer `#entryOf(component)` — eine neue Methode dieser Art tut dasselbe, statt `#components.get(component.uuid)` zu lesen; und `ViewComponent.addChild()` sowie `parent = …` werfen einen dritten `ViewComponentError`, wenn der Context des Elternteils diesen nicht führt.

**CONS-003 · info · packages/shadow-objects/src/view/ComponentContext.ts:232-234** (jetzt `:242-244`) — hasComponent() antwortet über die uuid, nicht über die Instanz

hasComponent(component) schlägt component.uuid in #components nach und meldet deshalb true für eine Instanz, deren Eintrag längst ein Namensvetter hält. Über die uuid ist die Antwort richtig, über die Instanz falsch. Mit #componentInstances führt der Context seit dem Umbau der flächigen Abbauwege eine Quelle, die die Frage wahrheitsgemäß beantworten könnte.

Empfehlung: Die Prüfung auf #componentInstances umstellen. Das ist eine Verhaltensänderung im Kollisionsfall und trifft addChild und removeChild mit, die über hasComponent(parent) gehen — eigener Zug, eigene Gegenprobe.

**CONS-004 · info · packages/shadow-objects/src/view/ViewComponent.ts:17-24** — assertUsableAsParent lässt eine verdrängte Instanz als Elternteil durchgehen

Die Prüfung fragt parent.context, und eine Instanz, die ein Namensvetter aus #components verdrängt hat, behält ihren context. Eine neue Komponente lässt sich damit unter einen Elternteil hängen, den der Context nicht mehr führt — sie landet in der Kinderliste des Namensvetters. Aus dem Code gelesen, nicht gemessen.

Empfehlung: Die Prüfung müsste den Context fragen, ob er diese Instanz führt, statt die Instanz zu fragen, ob sie einen Context nennt. Dieselbe Umstellung, die CONS-003 braucht — beide gehören in einen Zug.

**CONS-005 · info · packages/shadow-objects/src/view/ComponentContext.ts:286-306 (removeFromParent), :308-317 (moveToRoot)** (jetzt `:286-305` und `:307-316`) — Der Wächter gegen fremde Einträge prüft die Komponente, nicht das parent-Argument

Beide Wege lassen einen Eintrag stehen, dessen component eine andere Instanz ist — der Wächter prüft dafür aber nur die Identität der ausscheidenden Komponente, nicht die des parent-Arguments. Heute nicht erreichbar: beansprucht ein Namensvetter die uuid eines Elternteils, hebt addComponent() dessen Kinder sofort auf Wurzelebene. Eine Asymmetrie ohne Wirkung, die beim nächsten Umbau an dieser Stelle zur Falle wird.

Empfehlung: Den Wächter symmetrisch führen, sobald einer der beiden Zweige ohnehin angefasst wird. Ein eigener Zug lohnt sich nicht, solange der Fall unerreichbar ist.

**CONS-012 · low · packages/shadow-objects/src/view/ComponentContext.ts:441-450** — changeOrder prüft die Existenz des Eintrags, nicht seinen Halter

Der Wächter fragt nur, ob ein Eintrag existiert. Ein direkter Aufruf mit einer ausgeschiedenen Instanz, deren uuid inzwischen ein Nachfolger hält, schreibt `changeOrder` auf den Eintrag des Nachfolgers und sortiert ihn nach dessen Elternteil um. `destroyComponent()` daneben vergleicht dafür `entry.component === component`. Dieselbe Asymmetrie, die für `removeFromParent` und `moveToRoot` bereits geführt wird.

Empfehlung: Denselben Identitätsvergleich wie in `destroyComponent()` vorschalten.

**Offene Frage des Reports** — Führt der ComponentContext seine Mitglieder über die Instanz oder über die uuid?

Beantwortet durch die Entscheidung vom 2026-08-28 im Kopf dieses Plans: über die Instanz, durchgehend. Der Zustand »an manchen Stellen so, an anderen anders« entfällt mit diesem Paket.

**Optimierungspotenzial »Der ComponentContext entscheidet sich für die Instanz«**

Fünf Befunde dieses Reports — hasComponent(), assertUsableAsParent(), changeOrder() und die beiden Wächter in removeFromParent() und moveToRoot() — beschreiben dieselbe Stelle aus fünf Richtungen: der Context führt mit #componentInstances eine Menge, die wahrheitsgemäß antworten könnte, und fragt an diesen fünf Stellen trotzdem die uuid. Der Fall ist von außen nicht mehr erreichbar, und deshalb steht die Frage seit drei Läufen offen. Ein Durchgang, der sie beantwortet, nimmt fünf Zeilen aus dem Backlog und die offene Frage dazu — welche der beiden Antworten es wird, ist dabei fast egal, solange sie überall dieselbe ist.

### [x] 2. Ein Riegel am Creation Scope, sobald er abgebaut ist

- Findings: Punkt »Ein Riegel am Creation Scope, sobald er abgebaut ist« aus dem Optimierungspotenzial
- Ziel: Die Einstiegspunkte der Creation API weisen einen Aufruf nach `tearDown()` mit einer Meldung ab, die sagt was schiefgelaufen ist, statt die geleerten Sammlungen still wieder zu füllen.
- Bereich: `packages/shadow-objects/src/in-the-dark/` (Creation Scope und seine Spec)
- Hängt ab von: —
- Hash: — (kein Commit)
- Ergebnis: entfallen · Der Riegel steht seit `78b128a` (2026-08-27 19:54), einem Commit des vorigen Laufs. `ShadowObjectCreationScope.ts` führt das Feld `#isCreationApiClosed` (`:127`, am Ende von `tearDown()` gesetzt, `:374`) und den Wächter `#refuseAfterTearDown()` (`:479`); alle fünfzehn Mitglieder der Creation API fragen ihn als erste Zeile, `useProperties` über `useProperty`, und `entity` bleibt als einziges unangetastet und dokumentiert. Sieben Fälle in `ShadowObjectCreationScope.spec.ts` unter `describe('the creation API past the teardown')` (`:573`) decken das ab, darunter der Fall, den das Audit nennt: ein `onDestroy`-Callback darf die API noch benutzen, und was es dort anlegt, nimmt der Abbau um es herum mit. Doku: `docs/api-reference.md`, Abschnitt »The creation API past the teardown«; CHANGELOG: `packages/shadow-objects/CHANGELOG.md:323` unter `## [Unreleased]`.
- Warum das Audit es trotzdem führt: Der Optimierungspunkt wurde gegen `292714c` gelesen (2026-08-27 17:10, Datei damals 663 Zeilen, weder `#isCreationApiClosed` noch ein Wächter), `78b128a` kam zweieinhalb Stunden später. Die `audit.html` vom 2026-08-28 ist derselbe Report mit nachgetragenem Lauf-Ergebnis (`f4d5dc5`), kein frischer Lesevorgang — und ein Optimierungspunkt trägt, anders als ein Finding, kein Status-Feld, in dem der Abschluss ihn hätte abhaken können.
- Entschieden (2026-08-28, siehe »Entscheidungen«): Der vorhandene Riegel bleibt, wie er ist. Das Audit bot zwei Formen an — Wurf oder träger Leser mit Meldung —, und die vorhandene ist die zweite. Sie umzubauen hieße, eine gestern getroffene und in Code, Spec, Doku und CHANGELOG ausgeschriebene Wahl umzukehren, gegen die Begründung, die dort steht: wer die API spät erreicht, hat keinen Ort für einen Wurf.
- Nebenbefunde: 1 → »Offene Befunde« (1 → Audit)
- Folgen: keine — es wurde keine Zeile geändert
- Schnittstellen: keine

### [x] 3. Ablehnung und Zeitüberschreitung sind für den Aufrufer unterscheidbar

- Findings: ASYNC-005 (low), CONS-007 (low)
- Ziel: Eine abgelaufene Antwortfrist des Workers lehnt mit einer eigenen, exportierten Fehlerklasse ab, und die Doku sagt an jeder Stelle, an der ein Konsument nachsieht, was der unbestätigte Weg über eine Ablehnung erfährt und was nicht.
- Bereich: `packages/shadow-objects/src/` (neue Fehlerklasse, `utils/waitForMessageOfType.ts`, `view/ShadowEnv.ts`, `elements/ShaeElement.ts`), `packages/shadow-objects/docs/`
- Hängt ab von: —
- Hash: 4c9e888
- Modell: stärkste Stufe (opus)
- Effort: medium
- Dateien: `packages/shadow-objects/src/WorkerTimeoutError.ts` (neu), `packages/shadow-objects/src/index.ts`, `packages/shadow-objects/src/utils/waitForMessageOfType.ts`, `packages/shadow-objects/src/utils/waitForMessageOfType.spec.ts`, `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`, `packages/shadow-objects/src/view/ShadowEnv.ts`, `packages/shadow-objects/src/elements/ShaeElement.ts`, `packages/shadow-objects/src/distContract.files.txt`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/docs/guides.md`, `packages/shadow-objects/docs/cheat-sheet.md`, `packages/shadow-objects/docs/concepts.md`, `packages/shadow-objects/CHANGELOG.md`

**Zwei Hälften, eine Zusage.** Das Paket beantwortet zwei Findings, die dieselbe Frage aus zwei Richtungen stellen — was erfährt ein Aufrufer über das Schicksal seines Change Trails? Die Hälften sind verschieden gebaut, und sie zu verwechseln macht das Paket doppelt so groß, wie es ist:

1. **CONS-007 ist Code.** Der Timeout-Pfad lehnt mit einem nackten `Error` ab und ist im `catch` nur per String-Vergleich von einer Ablehnung des Kernels zu trennen. Dagegen hilft eine Fehlerklasse, und das Paket baut sie.
2. **ASYNC-005 ist Text.** Der unbestätigte Weg erfährt über einen Worker nichts von einer Ablehnung — das bleibt so. Die Entscheidung vom 2026-08-28 im Kopf dieses Plans schließt aus, jeden Trail bestätigen zu lassen, und die Empfehlung des Reports nennt die Sache selbst einen Zeitvertrag und keinen Fix. Was das Paket ändert, ist, dass der Vertrag es sagt, an jeder Stelle, an der jemand nachsieht. **Keine Zeile Laufzeitverhalten ändert sich für ASYNC-005, und es gibt dafür keinen roten Test.** Wer einen sucht, verliert eine Runde.

**Was der unbestätigte Weg wirklich tut**, nachgelesen und nicht vermutet — dieser Absatz ist die Quelle für jeden Doku-Satz unten, und er stimmt an keiner Stelle mit »die View erfährt nichts« überein:

- `ShadowEnv.sync()` setzt `#syncWaitForConfirmation` nicht; `#syncNow()` (`ShadowEnv.ts:423`) reicht `false` an `applyChangeTrail()` weiter. `syncWait()` (`:322`) setzt es.
- `RemoteWorkerEnv.applyChangeTrail()` (`:351-354`) schickt ohne Bestätigung keine Seriennummer und gibt sofort ein erfülltes Promise zurück. `MessageRouter.#onChangeTrail()` (`worker/MessageRouter.ts:183-200`) antwortet nur auf eine Seriennummer. Über einen Worker kommt eine Ablehnung auf diesem Weg also nirgends an: `SyncFailed` bleibt still, `#commitSyncCycle()` bucht den ganzen Trail als angewandt, und die beiden Seiten laufen genau an dem Eintrag auseinander, an dem der Kernel stehengeblieben ist.
- **Sie ist trotzdem nicht unsichtbar.** `MessageRouter.#onChangeTrail()` schreibt `failed to apply change trail` über seinen `ConsoleLogger`, bevor es die Seriennummer prüft — also auch für einen Trail, den niemand bestätigen ließ. Die Ablehnung steht damit in der Konsole des Workers, ob der Logger eingeschaltet ist oder nicht — `ConsoleLogger.error()` (`utils/ConsoleLogger.ts:311-316`) reicht ohne Prüfung an `#print` durch, die Getter `isEnabled` und Geschwister gelten den Aufrufern. Sie reist nur nicht zurück. (Dieser Satz stand hier zunächst mit einer Bedingung, die der Code nicht kennt; Runde 1 der Fehlerkette hat ihn und die drei Doku-Stellen, die ihm gefolgt waren, berichtigt.)
- **Lokal ist es anders.** `LocalShadowObjectEnv.applyChangeTrail()` (`view/LocalShadowObjectEnv.ts:52-68`) fährt den Kernel im Tick des Aufrufers und lehnt mit dem ab, was er geworfen hat — `waitForConfirmation` entscheidet dort nur, ob das Promise eine Mikrotask später fällt. Eine Ablehnung erreicht `ShadowEnv.SyncFailed` also auch auf dem unbestätigten Weg, samt `appliedCount`. Der Unterschied gehört den Proxys, nicht `sync()`, und die Doku sagt ihn so.

- Vorgehen:
  1. Neue Datei `packages/shadow-objects/src/WorkerTimeoutError.ts`. Sie liegt im Wurzelverzeichnis von `src/` und nicht neben `waitForMessageOfType.ts`. Zwei Gründe, und keiner davon muss in den Doc-Kommentar der Klasse: `ChangeTrailRefusedError.ts` und `EntityUuidInUseError.ts` sind die beiden vorhandenen öffentlichen Fehlerklassen dieses Pakets und liegen beide dort, je eine Datei; und die drei Nachbarn desselben Wegs (`WorkerFailedError`, `WorkerDestroyedError`, `WorkerReportedError`) stehen in `view/RemoteWorkerEnv.ts`, das `waitForMessageOfType.ts` importiert — ein Import in die Gegenrichtung wäre ein Zyklus. Inhalt genau so, Form und Ton nach `ChangeTrailRefusedError.ts` (Backticks für Nachbarklassen, kein `{@link}` über Dateigrenzen, ein `readonly` Feld je Zeile mit einzeiligem Kommentar):

     ```ts
     export class WorkerTimeoutError extends Error {
       /** the type of the message that did not arrive */
       readonly messageType: string;

       /** how many milliseconds were waited for it */
       readonly timeout: number;

       constructor(messageType: string, timeout: number) {
         super(`no ${messageType} message arrived from the worker within ${timeout}ms`);
         this.name = 'WorkerTimeoutError';
         this.messageType = messageType;
         this.timeout = timeout;
       }
     }
     ```

     Der Doc-Kommentar darüber trägt drei Aussagen: dass vier Antworten eine Frist haben und `messageType` sagt, welche ausgeblieben ist — die `Loaded`-Begrüßung, die `ImportedModule`-Antwort auf ein `importScript()`, die `AppliedChangeTrail`-Bestätigung eines mit `waitForConfirmation` gesendeten Change Trails und die `Destroyed`-Quittung eines Abbaus; dass `timeout` die gewartete Zahl trägt, damit eine Diagnose ohne Rückgriff auf `RemoteWorkerEnv.timeouts` weiß, welcher der vier Werte galt; und dass der Fehler nichts darüber sagt, was der Worker mit der Anfrage getan hat — eine abgelaufene Bestätigungsfrist lässt eine Shadow Environment zurück, die den ganzen Trail sehr wohl angewandt haben kann, weshalb `ShadowEnv` ihn als angewandt bucht, und `ChangeTrailRefusedError` die einzige Ablehnung ist, die eine Zahl nennt.
  2. `src/index.ts`: `export * from './WorkerTimeoutError.js';` aufnehmen, an der Stelle, die die vorhandene Sortierung der Datei verlangt. **Nicht** in `src/shadow-objects.ts` — das ist der Worker-Einstieg, und diese Klasse entsteht ausschließlich auf der View-Seite.
  3. `src/utils/waitForMessageOfType.ts`: `import {WorkerTimeoutError} from '../WorkerTimeoutError.js';` und in Zeile 42 `reject(new Error(...))` durch `reject(new WorkerTimeoutError(type, timeout))` ersetzen. Der Zweig läuft nur für `timeout !== 0 && timeout !== Infinity` (`:39`), `timeout` ist dort also eine endliche Zahl. Der Doc-Kommentar der Funktion (`:3-9`) bekommt einen Satz: die Frist lehnt mit einem `WorkerTimeoutError` ab.
  4. `src/distContract.files.txt`: vier Zeilen aufnehmen, unmittelbar hinter `src/EntityUuidInUseError.js.map` und vor `src/bundle.d.ts` — die Liste sortiert nach Byte, Großbuchstaben also vor Kleinbuchstaben:

     ```
     src/WorkerTimeoutError.d.ts
     src/WorkerTimeoutError.d.ts.map
     src/WorkerTimeoutError.js
     src/WorkerTimeoutError.js.map
     ```

     `src/distContract.package.json` bleibt unangetastet und wird nicht geöffnet: die neue Datei wird über den vorhandenen `.`-Export erreicht, sie ist kein Einstiegspunkt, sie hat keinen Seiteneffekt, und keiner der Werte in `topLevelKeys`, `entryPoints`, `exports`, `sideEffects` oder `dependencyNames` bewegt sich.
  5. **Regressionstest, vor dem Fix rot gesehen, die rote Ausgabe gehört in den Report.** In `src/utils/waitForMessageOfType.spec.ts`, hinter den vorhandenen drei Fällen. `vi` und `WorkerTimeoutError` kommen zu den Importen der Datei dazu; `vi.useFakeTimers()` steht in einem `try`, dessen `finally` `vi.useRealTimers()` fährt — die Hausform aus `RemoteWorkerEnv.spec.ts:769-795`. Der Fall heißt `rejects a wait that runs out of time with a WorkerTimeoutError` und prüft drei Dinge an der Ablehnung: `toBeInstanceOf(WorkerTimeoutError)`, `messageType` gleich dem gewarteten Typ, `timeout` gleich der übergebenen Frist. Er wird über den `FakeWorker` der Datei gefahren, mit einer eigenen Frist als drittem Argument (nicht dem Vorgabewert), und die Ablehnung wird über ein `promise.then(() => undefined, (reason: unknown) => reason)` eingefangen, statt sie zu `await`en — die Datei fährt keine `expect().rejects`-Form, und ein Promise, das nie fällt, hinge sonst den ganzen Lauf auf. Vor dem Fix scheitert die erste der drei Zusicherungen an einem nackten `Error`.
  6. `src/view/RemoteWorkerEnv.spec.ts`, zwei Stellen, die den Fehler heute über seinen Wortlaut erkennen und nach Schritt 3 rot werden — beide bekommen die Zusicherung, die es jetzt gibt:
     - `:987-989`, der Helfer `expectTimedOut`: er prüft `settled.value` auf `toBeInstanceOf(WorkerTimeoutError)` und bekommt einen zweiten Parameter `messageType`, gegen den er `(settled.value as WorkerTimeoutError).messageType` hält. Die drei Aufrufstellen `:1004`, `:1022` und `:1039` reichen `Loaded`, `AppliedChangeTrail` und `ImportedModule` durch — alle drei Konstanten sind in der Datei bereits importiert. Die vorhandenen Meldungstexte der Zusicherungen bleiben.
     - `:781-783`, `takes its listeners off a start() that runs out of time`: aus dem `toContain` auf der `message` wird ein `toBeInstanceOf(WorkerTimeoutError)` auf der Ablehnung selbst. Der Meldungstext `'the handshake reports its own timeout'` bleibt.
     - `WorkerTimeoutError` kommt zu den Importen der Datei dazu.
  7. `src/view/ShadowEnv.ts`, Doc-Kommentar über `sync()` (`:279`, heute ohne einen). Er trägt genau das, was der Abgleich oben festgehalten hat, und keine Wiederholung dessen, was `syncWait()` darunter schon erzählt: `sync()` schickt den Trail, ohne die Shadow Environment um eine Bestätigung zu bitten — `syncWait()` bittet darum. Was danach aus einer Ablehnung wird, entscheidet der Proxy, und die beiden mitgelieferten unterscheiden sich: `LocalShadowObjectEnv` fährt den Kernel im Tick des Aufrufers und lehnt mit dem ab, was er geworfen hat, eine Ablehnung erreicht also auch hier `SyncFailed` samt ihrer Zahl; `RemoteWorkerEnv` schickt ohne Bestätigung keine Seriennummer und bekommt keine Antwort, eine Ablehnung bleibt also im Worker — sie steht dort in der Konsole, `SyncFailed` bleibt still, und der ganze Trail wird als angewandt gebucht. Ein Verweis auf `syncWait()` als den Weg, auf dem beide Proxys antworten.
  8. `src/elements/ShaeElement.ts`, Doc-Kommentar über der Methode `syncShadowObjects()` (`:284`, heute ohne einen). Zwei Sätze: sie reicht die Environment ihres Namespace an den nächsten `sync()` weiter, also an den unbestätigten Weg — über einen Worker erfährt sie von einer abgelehnten Bestätigung nichts, und es folgt kein `syncfailed`-Ereignis. Wer es wissen muss, schaltet `auto-sync` ab und fährt `syncWait()` aus der eigenen Schleife. **Über die Mikrotask-Sammlung dieser Methode schreibt der Kommentar nichts** — sie steht in `docs/api-reference.md` und wird in Paket 11 umgebaut.
  9. `packages/shadow-objects/docs/api-reference.md`, neun Stellen, und die Liste ist vollständig:
     - Ein neuer Abschnitt mit der Überschrift `WorkerTimeoutError` auf `####`-Ebene, am Ende von `### RemoteWorkerEnv`, zwischen dem `WorkerFailed`-Codeblock (`:1604-1610`) und `### Worker Timeout Constants` (`:1612`). Er beschreibt die Klasse in der Ausführlichkeit des `ChangeTrailRefusedError`-Abschnitts (`:1348`): eine Feldtabelle mit `messageType` und `timeout`, die vier Antworten mit einer Frist, und der Satz, dass er nichts darüber sagt, wie weit der Kernel gekommen ist. Eine `####`-Überschrift und nicht Fließtext wie die drei `Worker*Error` darüber, weil die anderen Abschnitte auf ihn zeigen wollen; das Inhaltsverzeichnis der Datei führt nur `##` und `###` und wird nicht angefasst.
     - Der Abschnitt `sync()` (`:1279`): der heutige Einzeiler bekommt den Absatz aus Schritt 7 in derselben Sache, für einen Konsumenten geschrieben statt für einen Leser des Quelltexts, mit einem Link auf [`syncWait()`](#syncwait).
     - Im Abschnitt `syncWait()` der Absatz »It rejects with the reason the proxy gave …« (`:1299`): »a worker that does not confirm within `changeTrailTimeout`« wird zu einer Nennung der Klasse und verlinkt sie.
     - Der Absatz »A reason that says nothing about how far the Kernel got …« (`:1265-1270`): »a confirmation window that ran out« wird zur Klasse, verlinkt.
     - Die Tabellenzeile `ShadowEnv.SyncFailed` (`:1230`): dieselbe Wendung, dieselbe Behandlung.
     - Die vier Zeilen der `RemoteWorkerEnv`-Methodentabelle, die heute eine Frist nennen oder eine verschweigen: `workerLoaded` (`:1557`), `importScript(url)` (`:1565`), `applyChangeTrail(changeTrail, waitForConfirmation)` (`:1566`) und `start()` (`:1567`) nennen den `WorkerTimeoutError` als das, womit die jeweilige Frist ablehnt. `applyChangeTrail` hat die Frist heute gar nicht in seiner Zeile stehen und bekommt sie: eine Bestätigung, die nicht innerhalb von `changeTrailTimeout` eintrifft, lehnt mit einem `WorkerTimeoutError` ab. **Die Zeile `destroy()` (`:1568`) bleibt unangetastet** — dort wird die Frist in eine Warnung geschluckt (`RemoteWorkerEnv.ts:430-436`), kein Aufrufer bekommt sie, und sie dort zu nennen wäre falsch.
     - `### Worker Timeout Constants` (`:1612`): ein Satz unter der Tabelle — läuft eine der vier Fristen ab, lehnt die wartende Anfrage mit einem `WorkerTimeoutError` ab, der die ausgebliebene Antwort und die gewartete Zahl trägt.
     - Die Tabellenzeile `syncShadowObjects()` (`:1797`): der Satz aus Schritt 8, ohne die Mikrotask-Sammlung anzufassen, die dort bereits steht.
     - Der Abschnitt zu den `auto-sync`-Werten (`:1765-1790`): ein Absatz hinter der Wertetabelle. Jeder dieser Werte fährt `sync()` und keinen `syncWait()`, über einen Worker also den unbestätigten Weg; ein Trail, den der Kernel ablehnt, kommt dort weder als Zahl noch als Ereignis zurück, und die View bucht ihn als angewandt. Wer die Antwort braucht, setzt `auto-sync="off"` und fährt `syncWait()` selbst. Dazu der Grund, warum es nicht anders eingerichtet ist: bei `auto-sync="frame"` kostete eine Bestätigung eine Rundreise je Bild.
  10. `packages/shadow-objects/docs/guides.md`, Abschnitt »When a Single Sync Cycle Fails«, zwei Stellen: der einleitende Absatz (`:552`) nennt bei »does not confirm the trail within `changeTrailTimeout`« die Klasse; der Absatz »Two limits belong to this.« (`:593`) trägt heute die halbe Aussage und bekommt die andere Hälfte — dass der lokale Proxy den Kernel im Tick des Aufrufers fährt und eine Ablehnung deshalb auch ohne Bestätigung als `SyncFailed` ankommt, dass der Worker sie über seinen eigenen `ConsoleLogger` meldet und sie dort also sichtbar ist, und dass `auto-sync` derselbe unbestätigte Weg ist.
  11. `packages/shadow-objects/docs/cheat-sheet.md`, der `else`-Zweig des `syncWait()`-Beispiels (`:441-452`): eine Kommentarzeile, die `WorkerTimeoutError` als den Fall beim Namen nennt, in dem die Frist abgelaufen ist, und ihn zu den Importen der Zeile `:436` nimmt.
  12. `packages/shadow-objects/docs/concepts.md:197`: der Satz »When you do need a guarantee, use `syncWait()` …« bekommt seinen Halbsatz — es ist zugleich der einzige Weg, auf dem ein Worker eine abgelehnte Trail-Übergabe zurückmeldet.
  13. `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`:
      - Unter `### New` ein Eintrag im Hausstil der Liste, eröffnet mit dem fetten `New (public API):` und dem Klassennamen: was er ist, seine beiden Felder, die vier Antworten mit einer Frist, dass `waitForMessageOfType()` ihn wirft und `RemoteWorkerEnv` mit ihm ablehnt, dass er aus `@spearwolf/shadow-objects` exportiert wird und nicht aus `@spearwolf/shadow-objects/shadow-objects.js`, dass das `dist/src/WorkerTimeoutError.js` samt Deklaration in die veröffentlichte Dateiliste aufnimmt, und wo er dokumentiert ist. Der Eintrag zu `ChangeTrailRefusedError` in derselben Liste ist die Vorlage für Zuschnitt und Wortwahl.
      - Im einleitenden Absatz unter `## [Unreleased]` steht eine gezählte Behauptung (`Fifty-four changes reach existing consumers`). Sie wird auf `Fifty-five` gehoben und bekommt ihren Halbsatz: eine Antwort des Workers, die ausbleibt, lehnt jetzt mit einem `WorkerTimeoutError` statt mit einem nackten `Error` ab, und der Wortlaut der Meldung ist ein anderer — ein `catch`, das ihn verglichen oder gedruckt hat, hält jetzt ein Objekt mit `messageType` und `timeout`. Der Eintrag zu `WorkerDestroyedError` / `WorkerFailedError` im selben Absatz ist die Vorlage.
      - **Entschieden, und die Begründung gehört in keinen Kommentar, sondern hierher:** der Wortlaut wechselt mit der Klasse. Er könnte stehenbleiben, aber `name` wird ohnehin `'WorkerTimeoutError'`, und damit ändert sich, was `String(error)` druckt — den Wortlaut zu konservieren kauft also keine Stabilität und lässt zugleich die Hausform der Fehlermeldungen dieses Pakets (kleingeschriebene Prosa: »the kernel applied 2 of 5 …«, »the worker environment has been destroyed«) an der einen Stelle gebrochen, an der die Zeile offen ist. Beide In-Repo-Zusicherungen auf den String sind genau das Muster, das die neue Klasse ersetzt, und werden in Schritt 6 abgeräumt.
  14. Nicht nötig, damit niemand danach sucht: `packages/shadow-objects/README.md` und `AGENTS.md` (nachgesehen — keine der beiden Dateien nennt `sync`, `syncWait` oder eine Fehlerklasse); `src/distContract.package.json` (siehe Schritt 4); `pnpm make:todo` (kein `TODO` berührt); das Root-`CHANGELOG.md` (keine Änderung an Build, Testrunner, Lint oder devDeps); `packages/shae-offscreen-canvas/` (unberührt); `src/shadow-objects.ts` (siehe Schritt 2).
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `TURBO_FORCE` steht am Testlauf, weil dieses Paket die veröffentlichte Dateiliste ändert: `src/distContract.spec.ts` prüft gegen ein gebautes `dist/`, und ein Cache-Treffer auf dem Build ließe es den Stand von gestern prüfen. Die E2E-Suite bleibt draußen, aus demselben Grund wie in Paket 1 — 654 Playwright-Tests über drei Browser riskieren die Zehn-Minuten-Grenze des Bash-Werkzeugs. Kein E2E-Test liest den Wortlaut dieser Fehlermeldung; repoweit tun das genau die beiden Stellen aus Schritt 6.
- Commit: `fix(view): a reply that never arrives is told apart from one that says no`
- Ergebnis: 1 Runde · ASYNC-005 und CONS-007 behoben · Regressionstest `rejects a wait that runs out of time with a WorkerTimeoutError` in `src/utils/waitForMessageOfType.spec.ts` (vor dem Fix rot: `expected Error: Timeout waiting for message of typ… to be an instance of WorkerTimeoutError`) · Runde 1 hat fünf Doku-Aussagen berichtigt, die am Code nicht hielten, darunter eine, die der Detailplan selbst vorgegeben hatte: `ConsoleLogger.error()` druckt ungefiltert, die Ablehnung eines Change Trails steht also immer in der Konsole des Workers und nicht nur bei eingeschaltetem Logger · klein und stehengelassen: eine Zeile mit 118 Spalten in `docs/api-reference.md:1822`, wo der Rest der Datei auf ~100 umbricht; »tick« zweimal in zwei Bedeutungen im `sync()`-Absatz, dessen Ordnungsaussage daneben präzise ist; `WorkerTimeoutError.messageType` als `string` statt als Union der vier Konstanten — der Detailplan gibt `string` vor, und der Wert kommt aus dem `type: string`-Parameter von `waitForMessageOfType()`, eine Union müsste diese Signatur mit umbauen · entschieden gegen den Reviewer: der CHANGELOG-Eintrag nennt `waitForMessageOfType()` als das, was den Fehler wirft, obwohl die Funktion kein Exportpfad erreicht — die Aussage ist wahr und für eine Diagnose brauchbar, und der Detailplan gibt sie so vor
- Nebenbefunde: 3 → »Offene Befunde« (3 → Audit)
- Folgen: keine
- Schnittstellen: `WorkerTimeoutError` neu exportiert aus `@spearwolf/shadow-objects` (nicht aus `@spearwolf/shadow-objects/shadow-objects.js`, es ist eine View-seitige Klasse) · `waitForMessageOfType()` lehnt mit ihr ab statt mit einem nackten `Error`, und der Wortlaut der Meldung lautet jetzt `no <type> message arrived from the worker within <n>ms` — wer ihn verglichen hat, hält jetzt ein Objekt mit `messageType` und `timeout` · die veröffentlichte Dateiliste in `src/distContract.files.txt` trägt vier Zeilen mehr (`src/WorkerTimeoutError.{d.ts,d.ts.map,js,js.map}`)

**ASYNC-005 · low · packages/shadow-objects/src/elements/ShaeElement.ts:18-30; view/RemoteWorkerEnv.ts:341-343** — Der DOM-getriebene Sync erfährt nichts von einer Ablehnung

Der Abgleich zwischen View und Kernel nach einem abgelehnten Change Trail greift nur, wenn der Trail mit Bestätigung gesendet wurde: `applyChangeTrail()` schickt nur dann eine Seriennummer, und der `MessageRouter` antwortet nur darauf. Der Weg, den die Elemente nehmen, ruft `ShadowEnv.sync()` ohne Bestätigung — dort erfährt die View von einer Ablehnung gar nichts und führt weiterhin als angewandt, was der Kernel zurückgenommen hat.

Empfehlung: Die Frage ist ein Zeitvertrag, kein Fix: jeden Trail bestätigen zu lassen kostet bei `auto-sync="frame"` eine Rundreise je Frame, das Serialisieren der Zyklen ändert die Zusage von `sync()`. Beides gehört entschieden, bevor Code entsteht.

**CONS-007 · low · packages/shadow-objects/src/utils/waitForMessageOfType.ts:190-193** (die Datei hat 67 Zeilen; der Wurf steht auf `:42`) — Ein abgelaufenes Zeitfenster lehnt mit einem nackten Error ab

Der Timeout-Pfad lehnt mit `new Error('Timeout waiting for message of type: …')` ab. Seit `syncWait()` den Grund eines abgelehnten Change Trails durchreicht, landet dieser Wert im `catch` des Konsumenten — und ist dort von einem Kernel-Fehler nur per String-Vergleich zu unterscheiden. Eigene Fehlerklassen führt dasselbe Paket bereits, in `RemoteWorkerEnv.ts:68` und `:83`.

Empfehlung: Eine eigene Fehlerklasse neben den vorhandenen, damit ein Aufrufer per `instanceof` zwischen »zu spät« und »abgelehnt« trennt. Der Wechsel ändert, was Konsumenten im `catch` sehen, und gehört in den Changelog.

### [x] 4. generateUUID ohne Nachschlagetabelle, mit lautem Fallback

- Findings: SEC-001 (info)
- Ziel: `crypto.getRandomValues()` trägt den Fall ohne Secure Context, die 290-zeilige Hex-Tabelle verschwindet aus jedem Bundle, und der verbleibende `Math.random`-Zweig meldet sich einmalig auf der Console statt still zu greifen.
- Bereich: `packages/shadow-objects/src/utils/generateUUID.ts`
- Hängt ab von: —
- Hash: 562bea5
- Modell: mittlere Stufe (sonnet)
- Effort: medium
- Dateien: `packages/shadow-objects/src/utils/generateUUID.ts`, `packages/shadow-objects/src/utils/generateUUID.spec.ts` (neu), `packages/shadow-objects/CHANGELOG.md`

**Drei Quellen, eine Reihenfolge.** Der Abgleich am Code hat den Befund unverändert vorgefunden (298 Zeilen, davon 258 Tabelle; `_generateUUID` auf `:266`, der Export auf `:298`) und die Sachlage bestätigt, auf der das Vorgehen steht:

1. `crypto.randomUUID()` ist an einen Secure Context gebunden und fällt über `http://` von einer LAN-Adresse weg.
2. `crypto.getRandomValues()` ist es **nicht** — die Web-Crypto-Spezifikation setzt `[SecureContext]` an `Crypto.subtle` und an `Crypto.randomUUID()`, nicht an `Crypto.getRandomValues()`. Es ist derselbe kryptographische Generator und steht in jedem Kontext, in dem es ein `crypto`-Objekt gibt.
3. `Math.random()` bleibt als letzte Quelle für eine Realm ganz ohne Web Crypto API. Sie verschwindet nicht: der Generator darf nicht werfen, sonst scheitert das Anlegen jeder Entity. Sie wird laut.

**Warum die Meldung über `ConsoleLogger` geht und nicht über `console.warn`:** in `packages/shadow-objects/src` gibt es außerhalb der Specs und außerhalb von `ConsoleLogger.ts` keinen einzigen direkten `console.*`-Aufruf (nachgezählt, nur zwei auskommentierte Zeilen in `ShaePropElement.ts:184,189`). `ConsoleLogger` kostet hier nichts: er steht bereits in jedem Einstiegspunkt, der `generateUUID` überhaupt erreicht — `ShaePropElement.ts:90`, `ShaeEntElement.ts:143`, `ShaeWorkerElement.ts:46`, `ComponentContext.ts:125` —, und `dist/src/utils/ConsoleLogger.js` steht in der `sideEffects`-Liste, nimmt das Tree-Shaking sie also ohnehin nicht heraus. `#print` prüft keinen Schalter (`ConsoleLogger.ts:315-316`), die Meldung erscheint also unabhängig davon, ob der Logger eingeschaltet ist — dieselbe Eigenschaft, die Paket 3 für `error()` festgehalten hat.

- Vorgehen:
  1. `packages/shadow-objects/src/utils/generateUUID.ts` **vollständig ersetzen**. Der Attributions-Kommentar auf `:1`, die `prettier-ignore`-Tabelle, der `hex`-Helfer, der Stackoverflow-Verweis auf `:267` und der `.toLowerCase()`-Kommentar auf `:294` gehen mit ihrem Code weg: von three.js bleibt keine Zeile übrig, und `toString(16)` liefert bereits Kleinbuchstaben, ein nachgeschaltetes `.toLowerCase()` wäre wirkungslos. Der neue Inhalt, wörtlich:

     ```ts
     import {ConsoleLogger} from './ConsoleLogger.js';

     // A uuid here names one Entity and nothing else: it is not a credential, it is not a
     // capability, and it never leaves the process that made it. That is what makes the last of
     // the three sources below tolerable at all, and why it is loud rather than forbidden.

     const UUID_BYTE_COUNT = 16;

     /**
      * Stamps the version and variant bits into 16 random bytes and writes them out in the
      * canonical 8-4-4-4-12 form. The bytes are written to in place, so the caller hands over an
      * array it does not keep.
      *
      * RFC 4122 §4.4: version 4 goes into the high nibble of byte 6, the variant `10xx` into the
      * two high bits of byte 8.
      */
     const toUuidV4 = (bytes: Uint8Array): string => {
       bytes[6] = (bytes[6]! & 0x0f) | 0x40;
       bytes[8] = (bytes[8]! & 0x3f) | 0x80;

       const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

       return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
     };

     let mathRandomAnnounced = false;

     const mathRandomBytes = (): Uint8Array => {
       if (!mathRandomAnnounced) {
         mathRandomAnnounced = true;
         // Once per realm, not once per uuid: an application that makes thousands of them would
         // bury its console, and what is reported is a property of the realm, not of the call.
         new ConsoleLogger('generateUUID').warn(
           'no Web Crypto API in this realm: entity uuids come from Math.random() and are not unguessable',
         );
       }

       const bytes = new Uint8Array(UUID_BYTE_COUNT);
       for (let i = 0; i < bytes.length; i++) {
         bytes[i] = (Math.random() * 256) | 0;
       }
       return bytes;
     };

     /**
      * A version-4 uuid in the canonical 8-4-4-4-12 form, from the best source this realm offers.
      *
      * Three of them, in order. `crypto.randomUUID()` is bound to a secure context and is out of
      * reach whenever the page is served over plain http -- a LAN address during development is
      * the usual way to meet that. `crypto.getRandomValues()` carries no such restriction and is
      * the same cryptographic generator, so the step down to it costs four lines of formatting and
      * nothing else. Only a realm with no Web Crypto API at all reaches `Math.random()`, and that
      * one says so on the console, once: the uuids stay unique enough to name an entity, and they
      * stop being unguessable.
      */
     export const generateUUID = (): string => {
       const webCrypto = (globalThis as {crypto?: Crypto}).crypto;

       if (typeof webCrypto?.randomUUID === 'function') {
         return webCrypto.randomUUID();
       }

       if (typeof webCrypto?.getRandomValues === 'function') {
         return toUuidV4(webCrypto.getRandomValues(new Uint8Array(UUID_BYTE_COUNT)));
       }

       return toUuidV4(mathRandomBytes());
     };
     ```

     Vier Dinge daran sind nicht verhandelbar, weil sie an einer Einstellung dieses Repos hängen:
     `bytes[6]!` und `bytes[8]!` brauchen ihr `!`, weil `noUncheckedIndexedAccess` in `tsconfig.json:21`
     ansteht und `noNonNullAssertion` in `biome.json` auf `off` — die alte Datei hat dasselbe
     getan. Die Form `(globalThis as {crypto?: Crypto}).crypto` sagt die Wahrheit, die `lib.dom`
     verschweigt (dort ist `crypto` nicht optional), und hat ihr Vorbild in
     `ConsoleLogger.ts:15`. Der Gedankenstrich in einem Code-Kommentar ist `--` und nicht `—`;
     das ist die Hausform, siehe `ConsoleLogger.ts:7-12`. Und `lineWidth` ist 130 — die längste
     Zeile oben ist die `return`-Zeile mit rund 107 Spalten.
  2. **Regressionstests, neu in `packages/shadow-objects/src/utils/generateUUID.spec.ts`.** Zwei der drei Fälle sind vor dem Umbau rot, und die rote Ausgabe gehört in den Report. Der dritte ist es nicht, und wer für ihn einen roten Lauf sucht, verliert eine Runde:

     - `asks crypto.randomUUID first` — **heute grün**, ein Wächter gegen die Umkehrung der Reihenfolge, kein roter Test.
     - `takes its bytes from crypto.getRandomValues when there is no randomUUID` — **heute rot**: mit einem `crypto`, das nur `getRandomValues` trägt, greift heute `_generateUUID()`, der Spion wird nie gerufen und die uuid ist eine andere.
     - `says once that a realm without Web Crypto falls to Math.random` — **heute rot**: es wird nichts gemeldet, `toHaveBeenCalledTimes(1)` scheitert an 0.

     Der Inhalt, wörtlich:

     ```ts
     import {afterEach, describe, expect, it, vi} from 'vitest';

     // Which of the three sources answers is a property of the realm, so each case installs the
     // `crypto` it wants and loads a fresh copy of the module: the announcement of the last source
     // is made once per module instance, and a test that shares an instance cannot see the once.

     const importFresh = async (): Promise<typeof import('./generateUUID.js')> => {
       vi.resetModules();
       return import('./generateUUID.js');
     };

     const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

     describe('generateUUID', () => {
       afterEach(() => {
         vi.unstubAllGlobals();
         vi.restoreAllMocks();
         vi.resetModules();
       });

       it('asks crypto.randomUUID first', async () => {
         const randomUUID = vi.fn(() => '00000000-0000-4000-8000-000000000000');
         vi.stubGlobal('crypto', {randomUUID, getRandomValues: vi.fn()});

         const {generateUUID} = await importFresh();

         expect(generateUUID()).toBe('00000000-0000-4000-8000-000000000000');
         expect(randomUUID, 'the secure-context source is asked before any other').toHaveBeenCalledTimes(1);
       });

       it('takes its bytes from crypto.getRandomValues when there is no randomUUID', async () => {
         const getRandomValues = vi.fn((bytes: Uint8Array) => {
           for (let i = 0; i < bytes.length; i++) {
             bytes[i] = i;
           }
           return bytes;
         });
         vi.stubGlobal('crypto', {getRandomValues});

         const {generateUUID} = await importFresh();

         // the bytes 0x00..0x0f, with the version nibble stamped into byte 6 and the variant into byte 8
         expect(generateUUID()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
         expect(getRandomValues, 'the second source is the one that answered').toHaveBeenCalledTimes(1);
       });

       it('says once that a realm without Web Crypto falls to Math.random', async () => {
         const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
         vi.stubGlobal('crypto', undefined);

         const {generateUUID} = await importFresh();
         const uuids = [generateUUID(), generateUUID(), generateUUID()];

         for (const uuid of uuids) {
           expect(uuid, 'the last source answers in the canonical form too').toMatch(UUID_V4);
         }
         expect(new Set(uuids).size, 'three calls, three uuids').toBe(3);
         expect(warn, 'the realm is announced once, not once per uuid').toHaveBeenCalledTimes(1);
         expect(warn.mock.calls[0]!.join(' ')).toContain('Math.random()');
       });
     });
     ```

     `vi.stubGlobal` ist der vorgesehene Weg; `globalThis.crypto` ist in Node wie in happy-dom
     `configurable`, das `defineProperty` darunter greift also. Trägt es wider Erwarten nicht,
     ist der Ausweg nicht Nachdenken, sondern die Hausform aus
     `ConsoleLogger.storage.spec.ts:14-20`: Deskriptor merken, `Object.defineProperty`, im
     `afterEach` zurücksetzen. Der `console.warn`-Spion sieht drei Argumente, weil
     `ConsoleLogger.#print` mit `'%c…'` und der Stilzeile vorangeht — deshalb das `join(' ')`
     statt eines Vergleichs auf das erste Argument.
  3. `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]` → `### Behavior` (`:260`), ein Eintrag im Hausstil der Liste, eröffnet mit dem fetten `**Behavior (view components):**`. Er nennt: dass eine Entity-uuid aus `crypto.getRandomValues()` kommt, wo `crypto.randomUUID()` nicht erreichbar ist; dass `randomUUID()` an einen Secure Context gebunden ist und eine über `http://` ausgelieferte Seite — die LAN-Adresse in der Entwicklung ist der übliche Fall — ihre Entities bisher stillschweigend aus `Math.random()` benannt hat; dass `getRandomValues()` diese Bindung nicht hat und derselbe kryptographische Generator ist; dass die Form der uuid unverändert die kanonische Version-4-Form ist; dass `Math.random()` als letzte Quelle für eine Realm ganz ohne Web Crypto API bleibt und sich dort einmalig auf der Console meldet, unter dem Namensraum `generateUUID`; und dass die 256-Einträge-Hex-Tabelle aus three.js mit dem Umbau aus der Datei und damit aus jedem Bundle verschwindet. Der Rückblick auf den Vorzustand ist hier richtig und kein Konventionsbruch: jeder vorhandene Eintrag unter `### Behavior` erzählt ihn (»where the second creation used to take the entry over«, »where the trail used to be dropped once«), und das Verbot im Kopf dieses Plans zielt auf Code, Kommentare und Doku. **Keine Zahl im Eintrag** — weder Zeilen noch Kilobyte: eine Größenangabe, die niemand gemessen hat, ist eine Behauptung, und eine Messung ist den Eintrag nicht wert.
  4. **Die gezählte Behauptung im einleitenden Absatz unter `## [Unreleased]` bleibt bei `Fifty-five`.** Entschieden, damit die Frage nicht in der Fehlerkette wieder aufgemacht wird: die Liste dort führt auf, was einen Konsumenten zum Handeln zwingt — ein `catch`, das einen String verglich, ein Build mit `strictNullChecks`, eine Anwendung, die eine Hierarchie las. Hier ändert sich für einen Konsumenten nichts, was er anfassen müsste: die uuid behält ihre Form, die Quelle wird besser, und die neue Console-Zeile erscheint nur in einer Realm ohne jede Web Crypto API. Der Eintrag steht unter `### Behavior` und nirgends sonst.
  5. Nicht nötig, damit niemand danach sucht — jede Zeile nachgesehen, nicht vermutet:
     - `packages/shadow-objects/docs/` und beide `README.md`: `generateUUID`, `randomUUID`, `Math.random` und `getRandomValues` kommen dort nirgends vor. `generateUUID` steht weder in `src/index.ts` noch in `src/shadow-objects.ts` noch in einem Pfad der `exports`-Map — es ist kein öffentliches API, und die Doku-Klausel der Konventionen greift nicht.
     - `src/distContract.files.txt`: die vier Zeilen `src/utils/generateUUID.{d.ts,d.ts.map,js,js.map}` (`:155-158`) stehen bereits und bleiben. Es kommt keine Datei hinzu, geht keine weg und wird keine umbenannt — die neue Spec fällt aus dem Lib-Transpile heraus (`build.mjs:48`) und aus `tsconfig.lib.json` (`exclude: src/**/*.spec.ts`).
     - `src/distContract.package.json`: kein Wert in `topLevelKeys`, `entryPoints`, `exports`, `sideEffects` oder `dependencyNames` bewegt sich. `generateUUID.js` bekommt einen Import auf `ConsoleLogger.js`, hat aber weiterhin keinen eigenen Seiteneffekt und gehört deshalb nicht in die `sideEffects`-Liste; `ConsoleLogger.js` steht dort schon.
     - `AGENTS.md`, das Root-`CHANGELOG.md` (keine Änderung an Build, Testrunner, Lint oder devDeps), `pnpm make:todo` (kein `TODO` in der Datei), `packages/shae-offscreen-canvas/` (hat keinen eigenen uuid-Generator und importiert diesen nicht).
     - `src/shadow-objects.ts` und alles unter `worker/` und `in-the-dark/`: `generateUUID` wird dort außerhalb von Specs nirgends importiert. Der einzige Nicht-Spec-Aufrufer im ganzen Repo ist `view/ViewComponent.ts:204`, und der bekommt weiterhin einen String in kanonischer Form.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `TURBO_FORCE` steht am Testlauf, weil `generateUUID` von fast jeder Spec des Repos benutzt wird und ein Cache-Treffer genau die Läufe überspringen würde, auf die es hier ankommt. Die E2E-Suite bleibt draußen, aus demselben Grund wie in Paket 1 und 3 — 654 Playwright-Tests über drei Browser riskieren die Zehn-Minuten-Grenze des Bash-Werkzeugs. Kein Test im Repo behauptet etwas über die Form einer uuid (nachgesehen), und die Form ändert sich ohnehin nicht.
- Commit: `fix(view): an entity uuid comes from the strongest source the realm offers`
- Ergebnis: 1 Runde · SEC-001 behoben — `crypto.getRandomValues()` trägt den Fall ohne Secure Context, die Hex-Tabelle aus three.js ist aus `generateUUID.ts` und aus jedem Bundle verschwunden, der `Math.random()`-Zweig meldet sich einmal je Realm über `ConsoleLogger` · Regressionstests `takes its bytes from crypto.getRandomValues when there is no randomUUID` und `says once that a realm without Web Crypto falls to Math.random` (beide vor dem Fix rot: falsche uuid bzw. `warn` 0-mal statt 1-mal), dazu `asks crypto.randomUUID first` als Wächter über die Reihenfolge · Review-Runde 1 hat zwei wichtige Befunde geschlossen: die `### Types`-Zusage über den Template-Literal-Rückgabetyp wurde eingelöst statt zurückgenommen, und der `### Behavior`-Eintrag nennt jetzt auch den Wegfall der Tabelle · Verify grün (`paket-4.verify.log`, exit=0), Coverage 93,31 % gegen 93,11 % Baseline · klein, offen: die eingelöste Typzusage hängt allein an der Inferenz — es gibt weder Typ-Assertion noch Contract-Check, der `dist/src/utils/generateUUID.d.ts` auf der Template-Literal-Form festhält, und eine spätere Annotation oder ein dritter Zweig ließe sie still auf `string` zurückfallen, während der Build grün bleibt (`generateUUID.ts:64`, Kommentar warnt, ist aber kein Riegel)
- Nebenbefunde: → Queue
- Folgen: keine
- Schnittstellen: `generateUUID()` ist kein öffentliches API (kein Export aus `index.ts`, kein Pfad der `exports`-Map) und bleibt es; die emittierte Deklaration lautet `() => \`${string}-${string}-${string}-${string}-${string}\`` und nicht `() => string`. `generateUUID.ts` importiert jetzt `ConsoleLogger.js`.

**SEC-001 · info · packages/shadow-objects/src/utils/generateUUID.ts:266-298** — generateUUID fällt auf Math.random zurück

crypto.randomUUID() steht nur in einem Secure Context zur Verfügung. Wird die Bibliothek über http von einer LAN-Adresse ausgeliefert — ein üblicher Fall beim Testen auf einem zweiten Gerät —, greift der Math.random-Zweig aus three.js. Für die Identität einer Entity ist das ausreichend: die uuids sind keine Geheimnisse und verlassen den Prozess nicht. Es steht hier, weil der Zweig ohne Hinweis wirksam wird und niemand ihn bemerkt, der ihn nicht sucht.

Empfehlung: Ein Satz im JSDoc, der die Bedingung nennt und sagt, warum sie tragbar ist, macht aus einem stillen Fallback eine dokumentierte Entscheidung. Daneben lohnt der zweite Blick auf den Umfang: die Datei besteht zu 290 ihrer 295 Zeilen aus einer Nachschlagetabelle von 256 Hex-Paaren, die aus three.js stammt und in jedem Bundle mitfährt. crypto.getRandomValues() ist anders als randomUUID() nicht an einen Secure Context gebunden und liefert dieselbe uuid in vier Zeilen.

### [x] 5. Normalisierung an der Schreibstelle, keine leere Property-Liste auf der Leitung

- Findings: CONS-016 (low), CONS-013 (info)
- Ziel: Der Attributwert von `auto-sync` wird an jeder Schreibstelle über dieselbe Funktion normalisiert, und ein `CreateEntities` ohne Properties lässt das Feld weg, statt ein leeres Array zu tragen.
- Bereich: `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`, `packages/shadow-objects/src/view/ComponentChanges.ts`
- Hängt ab von: —
- Hash: a0b7c3d
- Modell: mittlere Stufe (sonnet)
- Effort: medium
- Dateien: `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`, `packages/shadow-objects/src/view/ComponentChanges.ts`, `packages/shadow-objects/src/view/ComponentChanges.spec.ts`, `packages/shadow-objects-testing/test/worker-element-attributes.test.js`, `packages/shadow-objects/CHANGELOG.md`

**Beide Fundstellen stehen unverändert, beide Zeilenangaben treffen auf die Zeile.** `ShaeWorkerElement.ts:265-267` schreibt den rohen Attributwert ins Signal, `ComponentChanges.ts:352-355` setzt `entry.properties` auch auf ein leeres Array. Das Paket bündelt trotzdem zwei ungleiche Dinge, und der Unterschied entscheidet, was für jedes davon nachgewiesen werden kann.

**CONS-016 ist heute folgenlos, und das ist kein Grund, es liegen zu lassen.** Nachgezählt gibt es drei Schreibwege in `autoSync$`: der Setter (`:209-214`, normalisiert), die Feldinitialisierung (`:51`, kanonisch per Konstante) und der rohe Griff in `connectedCallback` (`:265-267`). Der rohe Griff kann heute keinen nicht-kanonischen Wert setzen, weil `restore()` wenige Zeilen davor über `#reflectAutoSync` die kanonische Schreibweise auf das Attribut geschrieben hat — der Kommentar auf `:141-144` sagt genau das und ist die Zusage, an der die Korrektheit hängt. Die Reihenfolge ist geprüft: `attributeChangedCallback` läuft beim Upgrade vor `connectedCallback` und geht über den Setter; `ShaeElement.connectedCallback` ruft `restore()`, setzt danach `#wasConnected` und lässt erst dann die geparkten Reflexionen laufen (`ShaeElement.ts:206-232`); der Rückweg über `setAttribute` landet wieder im Setter. Es gibt deshalb **keinen roten Testlauf für CONS-016**, und es ist keiner zu suchen: gewonnen wird, dass die Korrektheit einer Schreibstelle nicht mehr davon abhängt, welche Methode vorher lief.

Der Hausstil steht daneben und ist das Vorbild: `ShaeElement` normalisiert `ns` im Setter über `toNamespace()` (`:68-74`) und liest das Attribut nirgends roh ins Signal zurück. `ShaeWorkerElement.connectedCallback` ist im ganzen `elements/`-Ordner die einzige Stelle, die das tut.

**CONS-013 ist erreichbar, und der Weg dorthin ist der Regressionstest.** `entry.properties = []` verlangt `isNew === true` bei nicht leerem `#nextProperties`, dessen Werte nach dem Filter alle wegfallen. Ein einzelnes `changeProperty(key, undefined)` schafft das nicht — `nothingToSend` (`:210`) räumt den Schlüssel wieder ab. Es geht über `#travellingProperties`: ein gebauter, aber nicht bestätigter Create-Eintrag lässt `isTravelling` greifen, und dann nimmt der `else`-Zweig auf `:215` den Wert `undefined` in die Warteschlange auf. Der zweite Build läuft weiter unter `isNew` und liefert die leere Liste. Das ist genau die Lage nach einem abgelehnten oder unbestätigten Change Trail — der Normalfall auf dem unbestätigten Weg, den die Entscheidung im Kopf dieses Plans festhält.

**Der Fallstrick beim Fix von CONS-013 heißt `#noteTravellingProperties`.** Die naheliegende Umsetzung schiebt beide Zeilen in ein `if (properties.length > 0)` und ändert damit still die Buchführung: `#travellingProperties` behielte den alten Inhalt, statt auf leer zu gehen. Der Vermerk beschreibt, was *dieser* Eintrag trägt, und ein Eintrag ohne Property trägt keine — er wird deshalb unverändert bei jedem Durchlauf gesetzt, und nur die Zuweisung an `entry` wird bedingt. `makeChangePropertyChange` (`:405-416`) macht es bereits in dieser Form: lokale Variable, Vermerk, dann Verwendung.

- Vorgehen:
  1. `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`: direkt über `export class ShaeWorkerElement` eine modul-lokale Funktion anlegen. **Nicht exportieren** — `src/index.ts:10` reicht diese Datei mit `export *` weiter, jeder Export daraus wäre öffentliches API und zöge Doku, README, CHANGELOG und `distContract` nach sich. Wortlaut:

     ```ts
     /**
      * The one place the `auto-sync` spelling rule lives: a string is trimmed and lower-cased,
      * and anything else is read as a flag — a truthy value asks for the frame default, a falsy
      * one for no syncing at all. Every write into `autoSync$` this element makes goes through
      * here, so the canonical spelling does not depend on which write ran first.
      */
     function normaliseAutoSync(value: unknown): string {
       if (typeof value !== 'string') {
         return value ? ShaeWorkerElement.DefaultAutoSync : 'no';
       }
       return value.trim().toLowerCase();
     }
     ```

     Britische Schreibung, weil `elements/` sie führt (`ShaeElement.ts:109-110,151`: »normalised«, »normalisation«).
  2. Dieselbe Datei, Setter `:209-214` auf die Funktion umstellen — der Rumpf schrumpft auf eine Zeile, die Semantik bleibt Zeichen für Zeichen dieselbe:

     ```ts
     set autoSync(val: any) {
       this.autoSync$.set(normaliseAutoSync(val));
     }
     ```
  3. Dieselbe Datei, `connectedCallback` `:265-267`: statt roh ins Signal über den Setter schreiben, wie es die Empfehlung an erster Stelle nennt. `getAttribute` liefert hier immer einen String, der `!= null`-Riegel bleibt stehen:

     ```ts
     const autoSync = this.getAttribute(ATTR_AUTO_SYNC);
     if (autoSync != null) {
       this.autoSync = autoSync;
     }
     ```

     Der Aufruf steht weiter im `batch(…)`; der Setter schreibt nur dieses eine Signal, an der Bündelung ändert sich nichts.
  4. Dieselbe Datei, der Kommentar auf `:141-144`. Er begründet den Nachhol-Schreibvorgang mit einer Reihenfolge, die es nach Schritt 3 nicht mehr braucht, und würde damit zu einer falschen Auskunft. **Der Aufruf `this.#reflectAutoSync(this.autoSync$.value)` bleibt stehen** — er hat seine eigene Aufgabe, die `ShaeElement.restore()` auf `:145-152` beschreibt: den Signalwert auf das Attribut tragen. Ersetzt wird nur der Kommentar, ohne Rückblick auf den Vorzustand:

     ```ts
     // the catch-up half of `restore()`: the signal carries the canonical spelling, and this is
     // what puts it on the attribute — `auto-sync="YES"` is what an author writes, `auto-sync="yes"`
     // is what the element syncs on, and a reader of the DOM sees the second
     ```
  5. Dieselbe Datei, `#createAutoSyncEffect`. Auf `:377` die dritte Abschrift der Regel durch die Funktion ersetzen, auf `:388` das zweite `.toLowerCase()` streichen — es läuft auf einem bereits kleingeschriebenen Wert:

     ```ts
     const autoSync = normaliseAutoSync(this.autoSync$.get() || ShaeWorkerElement.DefaultAutoSync);
     …
     } else if (autoSync.endsWith('fps')) {
     ```

     Der `|| DefaultAutoSync`-Zweig bleibt, wo er ist, und wandert **nicht** in die Funktion. Er beantwortet eine andere Frage — was ein leerer Wert bedeutet — als die Normalisierung, die nach der Schreibweise fragt. Zöge man ihn hinein, bekäme `<shae-worker auto-sync>` das Signal `frame`, und `#reflectAutoSync` schriebe daraufhin `auto-sync="frame"` in das Dokument: eine sichtbare DOM-Änderung, die niemand bestellt hat. `docs/api-reference.md:1813` hält die heutige Bedeutung fest und bleibt gültig.
     Nebenwirkung, gewollt: ein nicht-String, den ein Konsument direkt in das öffentliche `autoSync$` schreibt, wird im Effekt jetzt als Flag gelesen statt in einen `TypeError` auf `.trim()` zu laufen. Das ist dieselbe Regel, die `docs/api-reference.md:1889` für den Setter zusagt.
  6. `packages/shadow-objects/src/view/ComponentChanges.ts`, `:352-355` ersetzen:

     ```ts
     if (this.#nextProperties.size > 0) {
       // a create carries only the keys that have a value; where the filter leaves nothing, the
       // field stays off the entry — an absent `properties` and an empty one say the same thing,
       // and the shorter one is what travels. The note is taken either way: it records what this
       // entry carries, and an entry with no property is travelling with none
       const properties = Array.from(this.#nextProperties.entries()).filter(([, value]) => value !== undefined);
       this.#noteTravellingProperties(properties);
       if (properties.length > 0) {
         entry.properties = properties;
       }
     }
     ```

     `ComponentPropertiesType` ist `([string] | [string, unknown])[]` (`types.ts:27`); die abgeleitete lokale Form `[string, unknown][]` passt in beide Verwendungen. Meckert `tsc`, bekommt die lokale Variable die Annotation `ComponentPropertiesType`, kein Cast.
  7. `packages/shadow-objects/src/view/ComponentChanges.spec.ts`, im `describe('create')` (`:90`) hinter den Fall `drops undefined properties from the create entry` (`:157-166`) den Regressionstest setzen. Er nutzt den vorhandenen Helfer `buildTrail` (`:8-15`), der bewusst **nicht** bestätigt — genau der Zustand, den der Fall braucht:

     ```ts
     it('leaves the properties field off a create whose pending values have all come back to undefined', () => {
       const changes = new ComponentChanges(UUID);
       changes.create('a');
       changes.changeProperty('foo', 'bar');

       // a first trail nobody settles: the entry travels, the component keeps its pending half
       // and stays new, and the value coming back to `undefined` therefore has to be queued
       buildTrail(changes);
       changes.changeProperty('foo', undefined);

       expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.CreateEntities, uuid: UUID, token: 'a'}]);
     });
     ```

     **Vor dem Fix rot** mit `properties: []` im erhaltenen Eintrag; `toEqual` unterscheidet ein leeres Array von einem fehlenden Feld. Der rote Lauf gehört in den Report.
  8. `packages/shadow-objects-testing/test/worker-element-attributes.test.js`, die Fälle-Tabelle `:51-63` um zwei Zeilen ergänzen, die die Normalisierung über den Attributweg festnageln:

     ```js
     ['  FRAME  ', 'frame', 'frame'],
     ['  30FPS ', '30fps', '30fps'],
     ```

     Beide fallen in den `else`-Zweig der Konsolen-Prüfung im Testrumpf (null Fehler, null Warnungen) und sind **heute schon grün** — sie sind der Wächter, kein Nachweis. Nachgewiesen wird an dieser Stelle nichts, siehe oben. Die sechs Setter-Fälle auf `:160-209` bleiben unverändert und sind das Netz unter Schritt 1 und 2: `false`→`no`, `true`→`frame`, `0`→`no`, `30`→`frame`, `'  30FPS '`→`30fps`, `'off'`→`off`. Weicht die Funktion in einem dieser Fälle ab, ist die Funktion falsch, nicht der Test.
  9. `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]` → `### Behavior` (`:260`), **ein** Eintrag im Hausstil der Liste, eröffnet mit fettem `**Behavior (view):**`. Er nennt: dass ein `CreateEntities` das Feld `properties` weglässt, wo nach dem Filter kein Wert übrig bleibt, statt ein leeres Array über die Leitung zu tragen; dass ein Fehlen und eine leere Liste dasselbe sagen und die empfangende Seite beide gleich liest; und wann der Fall überhaupt auftritt — eine Property, die auf `undefined` zurückkommt, während der Create-Eintrag noch unbestätigt unterwegs ist. Der Rückblick auf den Vorzustand ist hier richtig und kein Konventionsbruch, jeder Nachbareintrag führt ihn.
  10. **Kein CHANGELOG-Eintrag für CONS-016**, und die gezählte Behauptung im einleitenden Absatz unter `## [Unreleased]` bleibt bei `Fifty-five`. Beides entschieden, damit es die Fehlerkette nicht wieder aufmacht: Für einen Konsumenten ändert sich an `auto-sync` nichts — `docs/api-reference.md:1808` sagt bereits »the value is trimmed and lower-cased before it is read«, und die Regel bleibt Wort für Wort dieselbe, sie steht nur noch an einer Stelle im Quelltext. Und `properties` ist in `ICreateEntitiesChange` seit jeher optional (`types.ts:34`), ein Leser musste das Fehlen also immer schon behandeln; nichts zwingt jemanden zum Handeln.
  11. Nicht nötig, damit niemand danach sucht — jede Zeile nachgesehen, nicht vermutet:
      - `packages/shadow-objects/docs/` und beide `README.md`: Die vier Stellen zu `auto-sync` (`api-reference.md:1808,1813,1889,1893`, `cheat-sheet.md:227`, `guides.md:314`) beschreiben die Regel, die gilt und gültig bleibt. Zum Wire-Format des Change Trails gibt es keinen Absatz, der `properties` als immer vorhanden zusagt; das Beispiel auf `api-reference.md:2630` zeigt bereits einen `CreateEntities`-Eintrag ohne das Feld.
      - `src/distContract.files.txt` und `src/distContract.package.json`: Es kommt keine Datei hinzu, geht keine weg, wird keine umbenannt — die Funktion aus Schritt 1 ist modul-lokal. Kein Export, keine `sideEffects`-Zeile, kein Eintrag in der `exports`-Map bewegt sich.
      - `AGENTS.md`, das Root-`CHANGELOG.md` (keine Änderung an Build, Testrunner, Lint oder devDeps), `pnpm make:todo` (kein `TODO` in beiden Dateien), `packages/shae-offscreen-canvas/` (nutzt weder `ShaeWorkerElement` noch `ComponentChanges` direkt).
      - `makeChangePropertyChange` (`:405-416`) bleibt unangetastet: dort ist `properties` im Typ `IPropertiesChange` pflichtig (`types.ts:60`), die Methode läuft nur bei nicht leerer `#propsChangeOrder` (`:309-310`), und ein `undefined`-Wert bedeutet dort eine Entfernung und wird bewusst mitgetragen.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `TURBO_FORCE` steht am Testlauf, weil beide geänderten Dateien quer durch das Repo benutzt werden und ein Cache-Treffer genau die Suiten überspringen würde, auf die es ankommt — die Fälle zu `auto-sync` liegen in `shadow-objects-testing` und laufen in echtem Chromium. Die E2E-Suite bleibt draußen, aus demselben Grund wie in Paket 1, 3 und 4: 654 Playwright-Tests über drei Browser riskieren die Zehn-Minuten-Grenze des Bash-Werkzeugs.
- Commit: `fix(view): normalisation belongs to the write site, and no empty property list travels`
- Ergebnis: 1 Runde · CONS-016 und CONS-013 behoben · Regressionstest `leaves the properties field off a create whose pending values have all come back to undefined` in `ComponentChanges.spec.ts` (vor dem Fix rot mit `properties: []` im erhaltenen Eintrag) · zwei Wächterzeilen in `worker-element-attributes.test.js` für den Attributweg (schon vorher grün, kein Nachweis) · Review ohne Befund in jeder Stufe · Verify `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci` exit 0, Coverage 93,31 % Statements
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — keine Signatur, kein Export und keine Konstante hat sich bewegt. `normaliseAutoSync()` ist modul-lokal in `ShaeWorkerElement.ts` und bleibt es; `src/index.ts` reicht die Datei mit `export *` weiter, ein Export daraus wäre öffentliches API. Ein `CreateEntities`-Eintrag lässt `properties` weg, wo der Filter nichts übrig lässt — das Feld war in `ICreateEntitiesChange` (`types.ts:34`) schon immer optional, für einen Leser ändert sich nichts

**CONS-016 · low · packages/shadow-objects/src/elements/ShaeWorkerElement.ts:265-267** — connectedCallback schreibt den rohen Attributwert an seinem normalisierenden Setter vorbei

connectedCallback schreibt den Attributwert von autoSync direkt ins Signal, statt über den Setter zu gehen, der trimmt und kleinschreibt. Das Ergebnis hängt damit an der Reihenfolge zweier Methoden statt an einer Normalisierung an der Schreibstelle: ein Wert mit Leerzeichen oder Großbuchstaben kommt roh an, solange kein späterer Schreibvorgang über den Setter läuft. Vorbestehend seit dem Stand vor diesem Remediation-Lauf.

Empfehlung: Den Setter benutzen. Wo das Signal direkt geschrieben werden muss, wird vorher normalisiert — und zwar über dieselbe Funktion, die der Setter ruft, damit es nur eine Stelle gibt, an der die Regel steht.

**CONS-013 · info · packages/shadow-objects/src/view/ComponentChanges.ts:353** — Ein CreateEntities trägt eine leere Property-Liste auf die Leitung

`makeCreateEntityChange()` setzt `entry.properties` auch dann, wenn der Filter ein leeres Array übrig lässt. Ein `CreateEntities` ohne Properties trägt damit ein leeres Feld über die Leitung, wo das Weglassen dasselbe sagt.

Empfehlung: Das Feld nur setzen, wenn nach dem Filter etwas übrig ist. Zwei Testfälle stehen heute auf der leeren Liste und ziehen mit.

**Zur letzten Zeile der Empfehlung:** nachgesehen, sie stimmt nicht. Ein `properties: []` steht in keinem Spec und in keinem Test des Repos (`grep` über `packages/**` ohne `node_modules` und `dist`), und kein vorhandener Fall erzeugt die leere Liste — deshalb der neu geschriebene Regressionstest in Schritt 7 statt einer Anpassung bestehender Fälle. Zieht wider Erwarten doch ein Fall mit, ist das der Fund und keine Überraschung.

### [x] 6. Die öffentliche Typoberfläche trägt einen aktuellen Namen und einen echten Wert

- Findings: CONS-017 (info), API-003 (low)
- Ziel: Der exportierte Event-Map-Typ heißt nach dem Paket, unter dem er erscheint, und `ShadowEnv.ns$` führt den Namespace, den sein Name zusagt.
- Bereich: `packages/shadow-objects/src/elements/events.ts`, `packages/shadow-objects/src/view/ShadowEnv.ts`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: 3 (fasst `ShadowEnv.ts` an) — erledigt als `4c9e888`
- Hash: e9d5f9a
- Modell: mittlere Stufe (sonnet)
- Effort: medium
- Dateien: `packages/shadow-objects/src/elements/events.ts`, `packages/shadow-objects/src/view/ShadowEnv.ts`, `packages/shadow-objects/src/view/ShadowEnv.spec.ts`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`

**Beide Sachverhalte stehen, eine Zeilenangabe ist gewandert.** `events.ts:22,31` trifft auf die Zeile. `ShadowEnv.ts:55` heißt heute `:66`; der Slot steht unverändert da (`readonly ns$ = createSignal<NamespaceType | undefined>()`), und keine Zeile im Repo schreibt darauf — `grep` über alle `*.ts`/`*.js` außerhalb von `node_modules`, `dist`, `coverage` und `.turbo` findet sonst nur `ShaeElement.ns$`, ein anderes Signal einer anderen Klasse.

**Die beiden Hälften sind ungleich gebaut, und der Unterschied entscheidet, wohin der CHANGELOG-Eintrag gehört.** Wer sie gleich behandelt, schreibt eine Unwahrheit in ein veröffentlichtes Dokument.

1. **CONS-017 bricht keinen veröffentlichten Konsumenten.** Nachgesehen am Stand von `0.33.0` (`4e73c41`), nicht vermutet: `src/index.ts` führte dort keine Zeile `export type * from './elements/events.js'` — die kam erst in diesem unveröffentlichten Zyklus dazu, `CHANGELOG.md:256` führt sie unter `### New` als Neuzugang. Die `exports`-Map hat weder damals noch heute einen Subpfad auf `elements/events.js` und kein Wildcard, und keiner der vorhandenen Einstiegspunkte (`elements.js`, `shae-ent.js`, `shae-prop.js`, `shae-worker.js`) reicht das Modul weiter — alle drei `shae-*.ts` importieren ausschließlich `constants.js` und ihre Elementklasse. Ein `import type {ShadowEntsEventMap} from '@spearwolf/shadow-objects'` war in `0.33.0` also auf keinem Weg schreibbar. Was einen Konsumenten erreicht hat, ist allein die *Wirkung* der globalen Deklaration — `HTMLElementEventMap` trägt die Ereignisnamen —, und die kommt ohne den Namen aus. **Daraus folgt: kein Eintrag unter `### ⚠️ Breaking Changes`, keine Anhebung der gezählten Behauptung für diese Hälfte.** Der Name wird in den beiden unveröffentlichten Einträgen berichtigt, die ihn nennen, und damit ist er im Repo verschwunden.

   **Das weicht von der dritten Teilaussage der Entscheidung vom 2026-08-28 ab** (»der Bruch kommt als solcher ins CHANGELOG«), und die Begründung steht hier statt dort, weil kein Nutzer sie getroffen hat. Umbenennung und Verzicht auf einen Alias — die beiden tragenden Hälften jener Entscheidung — laufen unverändert. Was fällt, ist die Prämisse darunter: die Empfehlung des Reports sagt »index.ts re-exportiert ihn«, und das stimmt für den Arbeitsbaum, aber nicht für die letzte Veröffentlichung. Ein Breaking-Change-Eintrag über einen Import, den niemand je schreiben konnte, schickte jeden Leser auf eine Migration, die es nicht gibt — und die Konventionen dieses Laufs messen jeden Satz daran, ob er für jemanden ohne Kenntnis des Vorzustands stimmt. Will der Nutzer den Eintrag trotzdem, ist er ein Absatz und in fünf Minuten nachgetragen; eine falsche Zeile wieder einzufangen, sobald `0.34.0` draußen ist, geht nicht.

2. **API-003 erreicht veröffentlichte Konsumenten.** `readonly ns$` steht bereits in `0.33.0` auf der aus `index.ts` exportierten Klasse (`git show 4e73c41:…/ShadowEnv.ts:34`). Ein Konsument konnte `env.ns$.value` lesen und bekam für die gesamte Lebensdauer `undefined`; ab jetzt bekommt er einen Wert. Das ist eine Verhaltensänderung, sie gehört unter `### Behavior`, und **die gezählte Behauptung im einleitenden Absatz steigt allein ihretwegen von `Fifty-five` auf `Fifty-six`.**

**Wo der Wert herkommt und warum genau dort geschrieben wird.** `ComponentContext.ns` wird im Konstruktor genau einmal gesetzt (`ComponentContext.ts:174`) und danach nie wieder — `dispose()` lässt es stehen. Der Namespace einer `ShadowEnv` ändert sich deshalb ausschließlich mit ihrem `view`, und der Setter ist die vollständige Menge der Schreibanlässe: Zuweisung, Wechsel, Abwurf, und über `this.view = undefined` in `destroy()` auch der Abbau. Ein zweiter Schreibort ist nicht nötig und wäre eine zweite Wahrheit.

**Drei Eigenschaften, nachgesehen statt vermutet, damit die Fehlerkette sie nicht aufmacht:**

- `toNamespace()` (`utils/toNamespace.ts`) macht aus einem leeren oder nur aus Leerzeichen bestehenden String `GlobalNS`, ein Symbol. Ein `ComponentContext` hat damit nie ein `ns`, das definiert und zugleich falsy wäre. Der Truthiness-Riegel `if (this.#comCtx?.ns)`, den die Registrierung darüber führt, hat für den Signalwert also keinen erreichbaren Unterschied — `this.ns$.set(this.#comCtx?.ns)` veröffentlicht in jedem erreichbaren Fall genau das, was auch registriert wurde. Kein zweiter Riegel.
- `destroyObjectSignals(this)` in `destroy()` fasst `ns$` nicht an: das Feld ist ein freistehendes `createSignal()` und kein Objekt-Signal wie die beiden `@signal accessor`. Gemessen gegen das installierte `@spearwolf/signalize`: nach `destroyObjectSignals(o)` liest `o.sig.value` weiter, `set()` wirkt weiter, `onChange` feuert weiter. Der Slot bleibt nach `destroy()` also lesbar und steht auf `undefined`, weil der `view`-Setter ihn geräumt hat. **`destroy()` bekommt kein `ns$.destroy()`** — das ist die Hausform, `ShaeElement` hält seine Signale beim Abbau genauso am Leben, und ein zerstörtes Signal nähme dem letzten Leser die Antwort weg.
- `ns$.onChange()` liefert beim Abonnieren nicht den aktuellen Wert nach, sondern erst die nächste Änderung (ebenfalls gemessen). Die Tests unten stehen darauf.

- Vorgehen:
  1. `packages/shadow-objects/src/elements/events.ts`: `ShadowEntsEventMap` → `ShadowObjectsEventMap`, beide Vorkommen (`:22` Deklaration, `:31` `extends`). Sonst ändert sich in der Datei nichts — der Kommentar über der globalen Deklaration bleibt Wort für Wort stehen, und die drei Ereignistypen behalten ihre Namen, sie tragen den alten Projektnamen nicht. Der neue Name folgt der Familie, die der vorige Lauf angelegt hat (`globalThis.__shadowObjectsContexts`, `SHADOW_OBJECTS_BUNDLE_LOADED`, `Symbol.for('ShadowObjectsGlobalNS')`); `ShadowObjectsEventMap` ist repoweit frei.
     **`src/index.ts` wird nicht angefasst**: Zeile 5 lautet `export type * from './elements/events.js';` und nennt keinen Namen.
  2. `packages/shadow-objects/src/view/ShadowEnv.ts`, Doc-Kommentar über `readonly ns$` (`:66`, heute ohne einen). Wörtlich:

     ```ts
     /**
      * The namespace of the {@link ComponentContext} this environment observes, and `undefined`
      * while it observes none. The `view` setter writes it, so it carries the name
      * {@link ShadowEnv.get} finds this environment under; a `destroy()` leaves it on `undefined`.
      */
     ```
  3. Dieselbe Datei, `view`-Setter: eine Zeile zwischen dem Ende des Registrierungsblocks (`}` nach `globalThis.__shadowEnvs.set(this.#comCtx.ns, this);`) und `this.viewReady = Boolean(ctx);` (`:166`). Wörtlich:

     ```ts
     // the namespace this environment observes, published where the name promises it. `view` is
     // the only way one reaches this object -- `ComponentContext.ns` is assigned in its
     // constructor and never again -- and the write stands behind the registration above, so
     // whoever reacts to it finds `ShadowEnv.get()` already answering this environment. It needs
     // no truthiness guard of its own: `toNamespace()` turns an empty or whitespace-only string
     // into `GlobalNS`, so a context that exists has a namespace that registers.
     this.ns$.set(this.#comCtx?.ns);
     ```

     Die Stellung ist Absicht und keine Geschmacksfrage: vor `viewReady`, damit ein Abonnent von `ns$` einen Zustand vorfindet, in dem `view`, die Registrierung und der Slot bereits übereinstimmen, und die Bereitschaftsmeldung dahinter kommt. Ein Signal-*Schreibvorgang* ist keine Abhängigkeit, der Aufruf verändert also nichts für einen Aufrufer, der den Setter aus einem `createEffect()` heraus bedient — es ist derselbe Vorgang, den die Zeile darunter mit `viewReady` bereits macht.
  4. Dieselbe Datei, `destroy()`: der vorhandene Kommentar `// the \`view\` setter releases the namespace registration on the way out, ownership-checked` bekommt seinen Halbsatz — `, and clears \`ns$\` with it`. Der Rumpf von `destroy()` bleibt unangetastet; insbesondere kommt **kein** `ns$.destroy()` dazu, siehe oben.
  5. **Regressionstests in `packages/shadow-objects/src/view/ShadowEnv.spec.ts`**, in das vorhandene `describe('the namespace registration')` (`:1203`), hinter den letzten Fall `'takes its registration along when it moves to another namespace'` (`:1260-1270`). Die Konstanten `NS_A`/`NS_B` und das `afterEach` dieses Blocks gelten für sie mit. `NamespaceType` kommt zum vorhandenen Typ-Import aus `../types.js` dazu. **Alle drei sind vor dem Fix rot**, und die rote Ausgabe gehört in den Report:

     ```ts
     it('carries the namespace of the context it observes', () => {
       const env = new ShadowEnv();

       expect(env.ns$.value, 'an environment without a view names no namespace').toBeUndefined();

       env.view = ComponentContext.get(NS_A);

       expect(env.ns$.value).toBe(NS_A);

       env.destroy();
     });

     it('moves the namespace along with the view', () => {
       const env = new ShadowEnv();
       const seen: (NamespaceType | undefined)[] = [];
       const unsubscribe = env.ns$.onChange((ns) => seen.push(ns));

       env.view = ComponentContext.get(NS_A);
       env.view = ComponentContext.get(NS_B);
       env.view = undefined;

       expect(seen).toEqual([NS_A, NS_B, undefined]);

       unsubscribe();
       env.destroy();
     });

     it('lets the namespace go when the environment is destroyed', () => {
       const env = new ShadowEnv();
       env.view = ComponentContext.get(NS_A);

       const seen: (NamespaceType | undefined)[] = [];
       const unsubscribe = env.ns$.onChange((ns) => seen.push(ns));

       env.destroy();

       expect(seen, 'the slot is cleared, not merely left behind').toEqual([undefined]);

       unsubscribe();
     });
     ```

     Vor dem Fix: der erste Fall scheitert an `undefined` statt `NS_A`, die beiden anderen an einem leeren `seen`. Der dritte darf nach dem `destroy()` noch abbestellen — `Object.freeze(this)` betrifft die Umgebung, nicht das Signal.
  6. `packages/shadow-objects/docs/api-reference.md`, vier Stellen, und die Liste ist vollständig:
     - Die Tabellenzeile `ns$` (`:1193`) wird ersetzt. Sie beschreibt heute eine Lücke und beschreibt danach einen Wert:

       ```markdown
       | `ns$` | `Signal<NamespaceType \| undefined>` (read-only) | The namespace of the `ComponentContext` this environment observes, and `undefined` while it observes none. The `view` setter writes it, so it carries the name `ShadowEnv.get()` finds this environment under; `destroy()` leaves it on `undefined`. |
       ```
     - Der Absatz unter `#### ShadowEnv.get(namespace)` (`:1215-1219`) bekommt einen Satz am Ende: `env.ns$` trägt denselben Namen, ein Effekt kann einer Umgebung also von einem Namespace in den nächsten folgen, ohne `view` selbst zu beobachten.
     - Der Codeblock auf `:2274` und `:2276`: `ShadowEntsEventMap` → `ShadowObjectsEventMap`, beide Vorkommen. Der Fließtext darüber (`:2267-2269`) nennt keinen Namen und bleibt.
  7. `packages/shadow-objects/CHANGELOG.md`, vier Stellen:
     - `:256`, der `**New (public API):**`-Eintrag über die Ereignistypen: `ShadowEntsEventMap` → `ShadowObjectsEventMap`. Sonst ändert sich an dem Eintrag nichts — er beschreibt den Neuzugang, und der ist unverändert wahr.
     - `:440`, der `**Docs (reference):**`-Eintrag unter `### Internal`: dieselbe eine Ersetzung.
     - `### Behavior`: **ein** neuer Eintrag, angehängt hinter den letzten der Liste (`:284`, der `CreateEntities`-Eintrag aus Paket 5) — dort haben Paket 4 und 5 ihre abgelegt. Hausstil, eröffnet mit fettem `**Behavior (view):**`. Er nennt: dass `ShadowEnv.ns$` den Namespace des beobachteten `ComponentContext` trägt; dass der `view`-Setter ihn schreibt und es derselbe Name ist, unter dem `ShadowEnv.get()` die Umgebung findet; dass ein `view`, der wandert, geräumt wird oder mit einem `destroy()` geht, das Signal mitnimmt; und was ein Konsument merkt — der Slot las über die ganze Lebensdauer einer Umgebung `undefined`, ein Effekt darauf lief also nie und ein Lesen antwortete nie. Ein Verweis auf `docs/api-reference.md` am Ende, wie ihn die Nachbarn führen.
     - Der einleitende Absatz unter `## [Unreleased]`: `Fifty-five` (`:13`) wird `Fifty-six`, und der Absatz bekommt seinen Halbsatz als **letzte** Klausel — aus dem Schlusspunkt von `:202` (»…used to act on that later component's entry.«) wird ein Semikolon, dahinter die neue Klausel mit Punkt, davor bleibt `:203` (»Everything else in this section is additive or a bugfix.«) stehen. Inhalt: `ShadowEnv.ns$` trägt jetzt den Namespace des beobachteten Kontexts, wo er über die ganze Lebensdauer einer Umgebung `undefined` las — ein Effekt oder ein Lesen auf diesem Slot bekommt jetzt einen Wert, und einen neuen, sobald der `view` wandert.
     - **Der Rückblick auf den Vorzustand ist in diesen beiden CHANGELOG-Stellen richtig und kein Konventionsbruch.** Das hat Paket 1 entschieden und unter seiner Zeile »Entschieden:« festgehalten: das Verbot zielt auf Code, Kommentare und Doku, in denen der Vorzustand nichts erklärt; ein Eintrag, der sagt, was ein Konsument merkt, hat ihn als Gegenstand. Jeder Nachbareintrag in beiden Listen führt ihn.
  8. Nicht nötig, damit niemand danach sucht — jede Zeile nachgesehen, nicht vermutet:
     - `packages/shadow-objects/README.md`: nennt weder `ns$` noch die Event-Map (`grep`; der einzige `ShadowEnv`-Treffer auf `:70` handelt von `<shae-worker>`). Der `Bereich:` des Grobplans nannte die Datei und ist oben entsprechend enger gefasst.
     - `docs/guides.md`, `docs/cheat-sheet.md`, `docs/concepts.md`, `docs/getting-started.md`, `docs/best-practices.md`, `docs/README.md`: kein Vorkommen von `ns$` auf einer `ShadowEnv` und keines der Event-Map. Beide Namen leben ausschließlich in `api-reference.md`.
     - `src/index.ts` (siehe Schritt 1), `src/distContract.files.txt` und `src/distContract.package.json`: es kommt keine Datei hinzu, geht keine weg, wird keine umbenannt; der Typ wird über den vorhandenen `.`-Export erreicht, ist kein Einstiegspunkt und hat keinen Seiteneffekt. Weder `topLevelKeys` noch `entryPoints`, `exports`, `sideEffects` oder `dependencyNames` bewegen sich.
     - `CHANGELOG.md:390` (`### Types`) nennt `ShadowEnv.ns$` als eine der Deklarationen, die `| undefined` tragen. Der Signaltyp bleibt `Signal<NamespaceType | undefined>`, die Zeile bleibt wahr und wird nicht angefasst.
     - `AGENTS.md`: seine Tabelle »Binding Terms« regelt Analogien und erfundene Namen, nicht Symbolnamen; nach diesem Commit existiert der alte Name im Repo nicht mehr, eine Regel gegen ihn ginge ins Leere. Auch sonst nennt die Datei keine der beiden Stellen.
     - Root-`CHANGELOG.md` (keine Änderung an Build, Testrunner, Lint oder devDeps), `pnpm make:todo` (kein `TODO` berührt), `packages/shae-offscreen-canvas/` und `packages/shadow-objects-e2e/` (kein Vorkommen beider Namen), `packages/shadow-objects-testing/` (der einzige `ns$`-Treffer dort ist ein Kommentar über `ShaeWorkerElement`).
     - Repoweit ist die Event-Map die letzte Stelle, an der der alte Projektname noch steht: `grep -i` über `shadowents|shadow-ents|shadow_ents` findet außerhalb des CHANGELOG, wo er als Vorzustand festgehalten ist, nur `events.ts:22,31` und die beiden Doku-Zeilen. Nach diesem Paket ist er weg.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `pnpm typecheck` ist für die Umbenennung der eigentliche Nachweis — der Typ hat zur Laufzeit kein Symbol, und **es gibt für CONS-017 keinen roten Test**; wer einen sucht, verliert eine Runde. `TURBO_FORCE` steht am Testlauf, weil die Wirkung dieses Pakets zur einen Hälfte typseitig ist und zur anderen erst über das gebaute `dist/` sichtbar wird, gegen das die Browser-Suite in `shadow-objects-testing` läuft; ein erzwungener Lauf kostet Minuten, ein Cache-Treffer auf der falschen Suite eine Runde. Die E2E-Suite bleibt draußen, aus demselben Grund wie in Paket 1, 3, 4 und 5: 654 Playwright-Tests über drei Browser riskieren die Zehn-Minuten-Grenze des Bash-Werkzeugs. Kein E2E-Test liest `ShadowEnv.ns$` oder die Event-Map.
- Commit: `fix(view): the namespace slot carries a namespace, and the event map carries the package name`
- Ergebnis: 2 Runden · CONS-017 und API-003 behoben · `ShadowEntsEventMap` heißt `ShadowObjectsEventMap` und der alte Projektname steht in `packages/**` nur noch dort, wo das CHANGELOG ihn als Vorzustand festhält · `ShadowEnv.ns$` wird im `view`-Setter geschrieben, hinter der Registrierung und vor `viewReady`, einziger Schreibort · Regressionstests `carries the namespace of the context it observes`, `moves the namespace along with the view` und `lets the namespace go when the environment is destroyed` — alle drei vor dem Fix rot gesehen · für die Umbenennung gibt es planmäßig keinen roten Test, `pnpm typecheck` ist ihr Nachweis · Verify `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci` exit 0, 0 von 5 Tasks aus dem Cache, Coverage 93,32 % Statements (Baseline 93,11 %) · Reviewer: kein kritischer Befund; der eine wichtige (die Zusage »ns$ trägt den Namen, unter dem `ShadowEnv.get()` diese Umgebung findet« ist im Verdrängungsfall falsch) in Runde 1 an drei Stellen und in Runde 2 auch im CHANGELOG mit dem Halbsatz »unless another environment has since taken that namespace over« berichtigt
- Klein, bewusst nicht behoben: der Scope der Commit-Message (`fix(view)`) deckt die zweite Hälfte des Pakets nicht, die in `src/elements/events.ts` sitzt — genauer wäre `fix(view,elements)` gewesen; die Message steht so im Detailplan und wird nicht gegen ihn geändert
- Entschieden: CONS-017 bekommt keinen Eintrag unter `### ⚠️ Breaking Changes`. Die Begründung steht ausgeschrieben unter Punkt 1 des Detailplans oben — in `0.33.0` war `import type {ShadowEntsEventMap} from '@spearwolf/shadow-objects'` auf keinem Weg schreibbar, ein Breaking-Change-Eintrag schickte jeden Leser auf eine Migration, die es nicht gibt. Das weicht von der dritten Teilaussage der Entscheidung vom 2026-08-28 ab; Umbenennung und Verzicht auf einen Alias, ihre beiden tragenden Hälften, laufen unverändert
- Nebenbefunde: keine — beide Implementierer melden über die im Plan bereits erfassten hinaus nichts
- Folgen: keine — was der Umbau umgeworfen hat, liegt in den fünf committeten Dateien; der alte Typname existiert in `packages/**` nicht mehr, und `ns$` hatte repoweit keinen Leser, dem der neue Wert etwas umwirft
- Schnittstellen: `ShadowEntsEventMap` heißt `ShadowObjectsEventMap` — der Typ wird über den vorhandenen `.`-Export erreicht, kein Alias unter dem alten Namen · `ShadowEnv.ns$` führt jetzt den Namespace des beobachteten `ComponentContext` statt dauerhaft `undefined`; wer den Slot liest oder einen Effekt daran hängt, bekommt einen Wert und einen neuen, sobald der `view` wandert. Für eine verdrängte Umgebung ist das nicht derselbe Name, unter dem `ShadowEnv.get()` sie findet — `#releaseNamespace()` ist besitzgeprüft, `ns$` ist es nicht. Weder Signatur noch Export noch Konstante hat sich sonst bewegt

**CONS-017 · info · packages/shadow-objects/src/elements/events.ts:22,31** — Ein exportierter Typname trägt noch den alten Projektnamen

Das exportierte Interface ShadowEntsEventMap trägt den Projektnamen »shadow-ents«, unter dem dieses Paket nicht mehr erscheint. Es ist keine der realmweit sichtbaren Laufzeit-Stellen, die der Remediation-Lauf vom 2026-08-26 umbenannt hat, sondern ein Typname der öffentlichen API: index.ts re-exportiert ihn, events.ts:31 hängt HTMLElementEventMap daran, und docs/api-reference.md:2178,2180 führen ihn im Beispiel vor. Eine Umbenennung bricht deshalb jeden import type {ShadowEntsEventMap} eines Konsumenten — anderer Schaden und anderer Blast Radius als bei einem globalThis-Schlüssel, den nie jemand dokumentiert hat.

Empfehlung: Umbenennen und im CHANGELOG als Breaking Change führen, zusammen mit dem nächsten Anlass, der die öffentliche Typoberfläche ohnehin anfasst. Ein Alias unter dem alten Namen ist bei einem Paket unter 1.0 nicht nötig.

**Zum letzten Satz der Beschreibung:** nachgesehen, er stimmt für den Arbeitsbaum und nicht für die letzte Veröffentlichung — der Re-Export aus `index.ts` ist selbst unveröffentlicht, siehe Punkt 1 oben. Die Doku-Zeilen stehen heute auf `:2274` und `:2276`.

**API-003 · low · packages/shadow-objects/src/view/ShadowEnv.ts:55** (jetzt `:66`) — Ein öffentliches Signal, das die Klasse nie beschreibt

readonly ns$ ist öffentliche API. Kein Produktionscode im Repository schreibt darauf, und der Slot liest für die gesamte Lebensdauer einer Umgebung undefined. Die Dokumentation schreibt das ehrlich hin und verweist auf env.view.ns; der Code bleibt schuldig. Wer dem Namen folgt und ns$ liest oder daran einen Effekt hängt, bekommt einen Wert, der sich nie ändert, und keinen Hinweis darauf, warum.

Empfehlung: Verdrahten oder entfernen — beides ist eine API-Entscheidung und gehört als solche getroffen. Bleibt der Slot, gehört an seine Deklaration ein Satz, der sagt, dass er nicht gefüllt wird und wo der Wert stattdessen steht.

**Triage der offenen Befunde (Zug 0).** Kein Eintrag aus »Offene Befunde« kommt in dieses Paket. Die drei Kandidaten, die thematisch in die Nähe kommen, teilen die Ursache nicht: `api-reference.md:1567` (`timeouts`/`logger` nur typseitig `readonly`) sitzt auf `RemoteWorkerEnv`, einem anderen Objekt mit einem anderen Mechanismus, und trägt das Urteil `→ Audit`; `CHANGELOG.md:389` steht zwar in derselben Datei wie zwei Schritte dieses Pakets, aber eine geteilte Datei ist keine geteilte Ursache, und auch dort steht `→ Audit`; `ViewComponent.ts:206` gehört der Sache nach zu Paket 7 und steht ebenfalls auf `→ Audit`. Ein `→ Audit`-Urteil an der Scope-Regel zurückzunehmen, ist nicht Sache eines Pakets, das die Ursache nicht teilt. Folgen gab es keine zu verteilen: Paket 1 bis 5 melden je »Folgen: keine«.

### [x] 7. Zugesagte Aufrufformen stehen im Vertrag

- Findings: CONS-002 (info), CONS-006 (info), API-006 (low) — dazu der Nebenbefund `packages/shadow-objects/src/view/ViewComponent.ts:206` aus Paket 1 (`token ?? VoidToken`), der hier aus »Offene Befunde« hereingezogen wird: gleiche Ursache, derselbe Konstruktor, vier Zeilen unter CONS-002
- Ziel: Der Konstruktor von `ViewComponent` deklariert beide Aufrufformen, die er annimmt, und `displayName` wie die Ein-Element-Form von `ComponentPropertiesType` stehen dort, wo ein Konsument nachsieht — keine Zusage mehr, die nur im Quelltext steht, und keine, die der Typ zurückweist.
- Bereich: `packages/shadow-objects/src/view/ViewComponent.ts`, `packages/shadow-objects/src/types.ts`, `packages/shadow-objects/src/utils/props-utils.ts`, `packages/shadow-objects/docs/`, `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: 1 (erledigt, `667f81d`)
- Hash: 8849a26
- Modell: stärkste Stufe (opus)
- Effort: medium
- Dateien: `packages/shadow-objects/src/view/ViewComponent.ts`, `packages/shadow-objects/src/view/ViewComponent.spec.ts`, `packages/shadow-objects/src/types.ts`, `packages/shadow-objects/src/utils/props-utils.ts`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/docs/cheat-sheet.md`, `packages/shadow-objects/CHANGELOG.md`

**Was der Abgleich ergeben hat.** Vier Punkte, jeder an der Fundstelle nachgelesen, zwei davon gemessen:

1. **CONS-002 steht nur zur Hälfte, und die andere Hälfte ist schlimmer als der Report sagt.** Die Doku nennt beide Formen seit `4dc57ae` (2026-08-17): `docs/api-reference.md:683` beschreibt den `ViewComponent` an Stelle des Options-Objekts samt Beispiel, `:673` den Rückfall des Tokens auf `VoidToken`. »Weder in der Signatur noch in `docs/`« war am Lesetag des Audits also schon zur Hälfte überholt. Offen ist die Deklaration — und die weist die Form nicht zurück, sondern nimmt sie unter falscher Bedeutung an: gemessen mit `tsc --strict` gegen `src/view/ViewComponent.ts` compiliert `new ViewComponent('child', parent)` heute ohne Fehler, weil `ViewComponent` für jedes optionale Glied des Inline-Options-Typs ein passendes Glied trägt (`parent`, `order`, `context`, `uuid`, `autoDestructionOnParentRemoval`). Der Compiler liest das Argument damit als Options-Objekt — `uuid: parent.uuid`, `context: parent.context`, `order: parent.order` —, der Rumpf liest es als `{parent: options}`. Wer im Editor über den Aufruf fährt, bekommt die falsche Auskunft, und kein Fehler sagt es ihm.
2. **Die Gegenrichtung wird zurückgewiesen.** Gemessen im selben Lauf: `new ViewComponent()` scheitert mit `TS2554: Expected 1-2 arguments, but got 0`, obwohl `:206` auf `VoidToken` zurückfällt und `docs/api-reference.md:673` genau das zusagt. Die eigene Spec des Projekts bezahlt dafür in `ViewComponent.spec.ts:385` mit `new ViewComponent(undefined as unknown as string)` — ein doppelter Cast in einem Test, der nichts prüft als die zugesagte Form. Der `token`-Setter (`:66`) deklariert `string | undefined` und braucht keinen. Das ist der Nebenbefund aus Paket 1: derselbe Konstruktor, dieselbe Ursache, und er wird hier mit erledigt statt ins Audit geschoben. Sein Urteil `→ Audit` steht dem nicht entgegen — die Scope-Regel beantwortet, ob ein Befund in diesen Lauf gehört, nicht, ob er in ein bestimmtes Paket gehört; über Letzteres entscheidet die gemeinsame Ursache, und der Zug 0 von Paket 6 hat die Stelle bereits ausdrücklich Paket 7 zugesprochen und nur deshalb liegen gelassen, weil sein eigenes Paket die Ursache nicht teilte. Derselbe Weg, den dieser Plan für `ShaeElement.ts:14-29` und Paket 11 schon vorgezeichnet hat.
3. **CONS-006 steht, mit einer Korrektur an der Zahl.** Die Ein-Element-Form hat zwei Leser in `props-utils.ts`, nicht einen: `filterUndefinedProps` (`:5`) und `applyPropsChanges` (`:21`). `Entity.setProperties` (`:515-521`) ist der dritte und trägt den erklärenden Kommentar bereits. Erzeuger gibt es weiterhin keinen — `ComponentChanges` schreibt an jeder Stelle Zweier-Tupel (`:357`, `:415`), `ComponentMemory` und die Elemente schreiben gar keine; die einzigen Ein-Element-Tupel im Repo stehen in `props-utils.spec.ts:35` und `:93`. `ComponentPropertiesType` ist über `export type * from './types.js'` öffentlich, die Form also von außen erreichbar: `Kernel.createEntity()` und `Kernel.changeProperties()` sind die beiden Eingänge, die sie lesen.
4. **API-006 steht unverändert.** `displayName` kommt in keiner Datei unter `docs/` und nicht in `README.md` vor; `types.ts:200-208` ist seit `292714c` unberührt, und beide Felder tragen nicht einmal einen JSDoc-Satz.

**Warum deklarieren und nicht fallen lassen.** Die Entscheidung vom 2026-08-28 im Kopf dieses Plans gibt das für CONS-002 vor, und der Code stützt sie mit einer Zahl: die Elternform hat 25 Aufrufstellen im Repo — 22 in `packages/shadow-objects/src/view/ViewComponent.spec.ts` und drei in `packages/shadow-objects-testing/test/ComponentContext.test.js` (`:19`, `:40`, `:88`), beide Suiten im Verify dieses Pakets. Die Form ist nicht bloß erreichbar, sie ist der übliche Weg, ein Kind anzulegen.

- Vorgehen:
  1. `src/view/ViewComponent.ts`, über der Klasse ein modul-lokales, **nicht exportiertes** Interface:

     ```ts
     interface ViewComponentOptions {
       parent?: ViewComponent | undefined;
       order?: number | undefined;
       context?: ComponentContext | undefined;
       uuid?: string | undefined;
       autoDestructionOnParentRemoval?: boolean | undefined;
     }
     ```

     Nicht exportiert, weil es kein öffentliches Symbol hinzufügen soll; ein nicht exportiertes Interface in einer öffentlichen Signatur wird trotzdem in die `.d.ts` emittiert — `Kernel.getEntityGraph(): EntityGraphNode[]` macht das heute genau so (`dist/src/in-the-dark/Kernel.d.ts:13` und `:60`). Kein `export`, kein Eintrag in `index.ts`.
  2. Der Konstruktor (`:188-217`) bekommt drei Signaturen; der Rumpf bleibt bis auf Punkt 3 unangetastet:

     ```ts
     constructor(token?: string, parent?: ViewComponent);
     constructor(token?: string, options?: ViewComponentOptions);
     constructor(token?: string, options?: ViewComponent | ViewComponentOptions) {
     ```

     Die Reihenfolge ist die Sache: die Elternform steht zuerst, damit `new ViewComponent('child', parent)` an ihr aufgelöst wird statt strukturell am Options-Typ. Ein englischer Kommentar darüber trägt das *Warum* — `ViewComponent` erfüllt jedes optionale Glied des Options-Typs, ohne die erste Überladung liest der Compiler ein Elternteil als Options-Objekt und gibt ihm eine Bedeutung, die der Rumpf nicht hat. Ein Objekt-Literal wie `{parent: p}` ist keinem `ViewComponent` zuweisbar (private `#`-Felder), fällt also zuverlässig auf die zweite Überladung.
     `if (options instanceof ViewComponent)` auf `:200` bleibt, wie es steht: es ist das, was die erste Überladung wahr macht.
  3. `token?: string` in allen drei Signaturen. `this.#token = token ?? VoidToken;` auf `:206` bleibt unverändert — nur die Deklaration holt auf, und zwar auf das, was der Setter (`:66`, `token: string | undefined`) und `docs/api-reference.md:673` längst zusagen. Kein Cast bleibt nötig, keine Zeile Verhalten ändert sich.
  4. Ein JSDoc-Block über der **ersten** Überladung (dort zeigt ihn der Editor): beide Aufrufformen in je einem Satz, dazu dass ein an Stelle des Options-Objekts übergebener `ViewComponent` ausschließlich als Elternteil gelesen wird und nichts sonst von ihm übernommen wird, und dass ein fehlendes `token` auf `VoidToken` (`'#void'`) fällt. Englisch, kein Rückblick.
  5. `src/elements/ShaeEntElement.ts:460` — `new ViewComponent(token ?? VoidToken, {context})` bleibt, wie es ist. Nichts daran wird durch die Änderung falsch, und ein ausgeschriebenes Token an der Aufrufstelle liest sich besser als ein Rückfall auf den Vorgabewert. Nicht »aufräumen«.
  6. `src/view/ViewComponent.spec.ts:385` — `new ViewComponent(undefined as unknown as string)` wird zu `new ViewComponent()`, der doppelte Cast fällt weg, der Testname bleibt. Direkt darunter, im selben `describe('the token')`, ein zweiter Fall »falls back to the void token when the constructor is given an explicit undefined« mit `new ViewComponent(undefined)`. Beide Zeilen sind zugleich der Typ-Wächter: die Spec-Bäume liegen in `tsconfig.json` und laufen durch `pnpm typecheck`, eine später wieder verengte Signatur wird an ihnen rot.
  7. `src/view/ViewComponent.spec.ts`, hinter `'should use parent param as alternative to options'` (`:43-47`) ein neuer Fall »reads a ViewComponent argument as the parent and takes nothing else from it«: `const parent = new ViewComponent('parent', {uuid: 'the-parent', order: 7});`, `const child = new ViewComponent('test', parent);`, dann `child.parent` ist `parent`, `child.uuid` ist nicht `'the-parent'` und `child.order` ist `0`. Er schreibt als Test hin, was die Überladung als Typ hinschreibt: das Argument ist ein Elternteil und kein Options-Objekt. Der vorhandene Fall auf `:43` bleibt unangetastet.
  8. `src/types.ts`, JSDoc über `ComponentPropertiesType` (`:22-26`): die beiden vorhandenen Sätze bleiben, ein dritter kommt dazu — in diesem Paket erzeugt nichts die Ein-Element-Form; sie ist eine Toleranz für einen Change Trail, den ein Aufrufer selbst baut, und `Kernel.createEntity()` sowie `Kernel.changeProperties()` sind die beiden Eingänge, die sie lesen. Damit ist die Form als Eingangs-Toleranz ausgeschrieben, wie es die Entscheidung vom 2026-08-28 vorgibt. Die Deklaration `([string] | [string, unknown])[]` bleibt, wie sie ist.
  9. `src/types.ts:200-208`, je ein JSDoc-Satz über `displayName` in `ShadowObjectConstructor` und in `ShadowObjectConstructorFunc`: der Name, unter dem der Kernel über ein aus diesem Konstruktor gebautes Shadow Object berichtet; ohne ihn nimmt er den `name` des Konstruktors. Ein Satz je Feld reicht, die Langfassung steht in der Doku.
  10. `src/utils/props-utils.ts`, ein englischer Kommentar über dem `return` in `filterUndefinedProps` (`:5`): ein Eintrag, der nur den Schlüssel nennt, überlebt den Filter, weil er »gesetzt, ohne Wert« bedeutet, während `[key, undefined]` heißt, dass der Wert fort ist; für die ganze Regel auf `ComponentPropertiesType` zeigen. Der zweite Leser auf `:21` bekommt keinen eigenen Kommentar — ein Verweis auf denselben Typ genügt zweimal nicht besser als einmal.
  11. `docs/api-reference.md`:
      - `:663-671`, der Signaturblock zeigt beide deklarierten Formen:

        ```typescript
        new ViewComponent(token?: string, parent?: ViewComponent)

        new ViewComponent(token?: string, options?: {
            parent?: ViewComponent | undefined;
            order?: number | undefined;
            context?: ComponentContext | undefined;
            uuid?: string | undefined;
            autoDestructionOnParentRemoval?: boolean | undefined;
        })
        ```
      - `:673` behält seinen Satz; er und der Block darüber sagen jetzt dasselbe.
      - `:683`, der Absatz über die Elternform bleibt und bekommt einen Halbsatz: das ist eine deklarierte Überladung, und sie nimmt aus der übergebenen Komponente nichts als den Elternteil — `uuid`, `order` und `context` kommen aus dem Vorgabeweg, nicht aus ihr.
      - `:2751`, die Zeile `changeProperties` der Tabelle »Applying a Change Trail by Hand« bekommt den Halbsatz, den die Zeile `createEntity` bereits trägt: ein Eintrag, der nur den Namen nennt, setzt die Property auf `undefined`.
      - Ein neuer `###`-Abschnitt »Naming a Shadow Object in reports« hinter dem Trenner `---` auf `:2952` und vor `### The Registry Class` (`:2954`), mit einem eigenen `---` dahinter, wie es die Nachbarabschnitte führen. Inhalt: `static displayName` auf dem Konstruktor — beide Formen, `ShadowObjectConstructor` und `ShadowObjectConstructorFunc`, tragen das Feld — ist das, was der Kernel zuerst liest; ohne es nimmt er den `name` des Konstruktors. Aufzählen, wohin der Wert reicht: die `create shadow-object`- und `destroy shadow-object`-Zeilen des Creation Scope, der Bericht über einen als gewöhnliche Methode geschriebenen Lifecycle-Hook, beide Berichte über einen scheiternden `onDestroy`, jeder Teardown-Schritt eines Creation Scope, die Meldung über eine nach dem Teardown benutzte Creation API und der Bericht über einen zurückgerollten Token-Wechsel, der ein Shadow Object nicht wiederherstellen konnte. Dazu der Satz, wann es sich lohnt: wo `name` nicht überlebt — ein minifizierter Build, oder ein als anonyme Klasse beziehungsweise anonyme Funktion registrierter Konstruktor. Ein kurzes Beispiel im Stil der Nachbarabschnitte:

        ```typescript
        export class PlayerController {
          static displayName = 'PlayerController';
          constructor({useProperty}: ShadowObjectCreationAPI) { /* … */ }
        }
        ```
      - Der Dekorator-Absatz auf `:2950` — der bereits erklärt, dass die Unterklasse den Namen der dekorierten Klasse trägt — bekommt einen Halbsatz, der auf den neuen Abschnitt zeigt: ein `static displayName` auf der dekorierten Klasse erbt die Unterklasse mit, und der Kernel liest ihn vor dem Namen.
      - Das Inhaltsverzeichnis: unter `- [Advanced](#advanced)` eine Zeile zwischen `- [The @ShadowObject Decorator](#the-shadowobject-decorator)` (`:36`) und `- [Registry Class](#the-registry-class)` (`:37`), mit demselben Einzug.
  12. `docs/cheat-sheet.md`, `## Defining a Shadow Object` (`:27-58`): unter dem Registrier-Block auf `:54-58`, vor dem Trenner auf `:60`, eine Zeile — `static displayName = 'MyLogic'` benennt das Shadow Object in den Meldungen des Kernels; ohne sie steht dort der Name des Konstruktors.
  13. `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]` → `### Types`, **ein** Eintrag im Haus-Stil `**Types (public API):** …`: der Konstruktor von `ViewComponent` deklariert beide Aufrufformen, die er annimmt — `new ViewComponent(token?, parent?)` und `new ViewComponent(token?, options?)` —, und `token` ist in beiden optional, so wie der `token`-Setter schon `string | undefined` nahm. Nennen, was ein Konsument davon hat: ein an Stelle des Options-Objekts übergebenes Elternteil wird nicht mehr als Options-Objekt gelesen, das zufällig strukturell passt, und ein weggelassenes Token braucht keinen Cast mehr — `VoidToken` (`'#void'`) ist der Wert, auf dem es landet. Kein Laufzeitverhalten ändert sich.
      Die gezählte Behauptung im einleitenden Absatz (»Fifty-six changes reach existing consumers«) bleibt bei sechsundfünfzig: nichts hier zwingt einen Konsumenten zu einer Reaktion, die Deklaration wird nur weiter.
      **Kein Eintrag für `displayName` und keiner für `ComponentPropertiesType`.** Bei beiden hat sich nichts bewegt — das Feld war immer da und wurde immer in die `.d.ts` emittiert, die Ein-Element-Form ist unverändert deklariert. Das CHANGELOG hält fest, was sich ändert, und das ist hier allein die Deklaration des Konstruktors. Wer das anders sieht, hat einen Befund, keine Regelverletzung vor sich.
  14. Nicht nötig, damit niemand danach sucht: `pnpm make:todo` (in keiner der berührten Dateien steht ein `TODO`); `README.md` (nennt weder den Konstruktor noch `displayName` noch die Property-Tupel); `AGENTS.md` (nennt keinen der drei Gegenstände); `src/distContract.files.txt` und `src/distContract.package.json` (keine Datei kommt, geht oder wird umbenannt, `dist/package.json` behält seine Form — nur der Inhalt von `ViewComponent.d.ts` wird länger, und den hält der Vertrag nicht); `docs/guides.md`, `docs/concepts.md`, `docs/best-practices.md`, `docs/getting-started.md` (ihre Aufrufe auf `guides.md:408` und `:624` benutzen die Options-Form und bleiben richtig); `packages/shae-offscreen-canvas` (setzt `static displayName` auf fünf Shadow Objects und definiert nichts daran).

**Kein roter Test in diesem Paket, und das ist kein Versäumnis.** Zur Laufzeit ändert sich nichts: `options instanceof ViewComponent` und `token ?? VoidToken` funktionieren beide bereits, und Property-Tupel wie `displayName` sind Doku. Der Nachweis ist `pnpm typecheck` zusammen mit den drei Spec-Änderungen aus Punkt 6 und 7 — sie compilieren nicht mehr, sobald die Deklaration wieder verengt wird. Wer einen roten Lauf sucht, verliert eine Runde.

**Restplan: nichts umzusortieren, und warum.** Paket 8 baut die `private`-Glieder des `Kernel` auf `#` um; dieses Paket fasst `Kernel.ts` nicht an und nennt in der neuen Doku keine private Methode, sondern nur Meldungstexte und `static displayName` — die Reihenfolge 7 vor 8 kostet 8 nichts. Paket 9 schreibt in dieselbe Datei `docs/api-reference.md`, aber in andere Abschnitte (die beiden Fehlerzusagen der Auf- und Abbauwege); es kommt nach diesem Paket dran und liest den Stand, den es dann vorfindet. Paket 11 und 12 berühren `ShaeElement.ts`, `ShaePropElement.ts` und `ComponentContext.ts` und damit keine Zeile von hier. Zwei Zeilennummern wandern durch dieses Paket weiter unten in `docs/api-reference.md` — der neue Abschnitt im Registry-Kapitel und die Inhaltsverzeichnis-Zeile verschieben alles darunter; wer nach diesem Paket eine Fundstelle in dieser Datei sucht, sucht sie am Text und nicht an der Zahl.

- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  Die E2E-Suite bleibt draußen, aus demselben Grund wie in Paket 1: 654 Playwright-Tests über drei Browser riskieren die Zehn-Minuten-Grenze des Bash-Werkzeugs. Die Leser, auf die es hier ankommt, liegen ohnehin in `test:ci` — die 25 Aufrufstellen der Elternform verteilen sich auf `ViewComponent.spec.ts` und `ComponentContext.test.js`, und die drei E2E-Aufrufe (`auto-destruct.js:23`, `remote-worker-env.js:29` und `:36`) benutzen die Options-Form oder ein nacktes Token und bewegen sich nicht.
- Commit: `fix(types): a call form the code accepts is a call form the contract names`
- Ergebnis: 1 Runde · CONS-002, CONS-006 und API-006 behoben, dazu der aus »Offene Befunde« hereingezogene Nebenbefund `ViewComponent.ts:206` · der Konstruktor trägt drei Signaturen mit der Elternform zuerst (`ViewComponent.ts:211-213`) und ein modul-lokales, nicht exportiertes `ViewComponentOptions`, `token` ist in allen dreien optional · `ComponentPropertiesType` und beide `displayName`-Felder tragen JSDoc, `docs/api-reference.md` einen neuen Abschnitt »Naming a Shadow Object in reports« samt TOC-Zeile, `docs/cheat-sheet.md` die `displayName`-Zeile · kein roter Test, und das ist keiner geschuldet: zur Laufzeit ändert sich nichts, den Wächter stellen drei Spec-Zeilen (`ViewComponent.spec.ts:49-56`, `:393`, `:398`), die `pnpm typecheck` gegen eine wieder verengte Deklaration rot laufen lässt · Verify `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci` exit 0, Coverage 93,32 % Statements (Baseline 93,11 %) · Reviewer: kein kritischer, kein wichtiger Befund
- Klein, bewusst nicht behoben: `docs/api-reference.md:2961` sagt »every report about that Shadow Object« und ist damit eine Spur weiter als seine eigene Aufzählung — die beiden Wurf-Stellen in `ShadowObjectCreationScope.ts:247` und `:250` führen den Namen ebenfalls im Text · `ViewComponent.ts:209` `{@link VoidToken}` zeigt in der emittierten `.d.ts` ins Leere, weil der Import beim Declaration-Emit wegfällt; der Wert `'#void'` steht daneben · `ViewComponent.ts:199-200` nennt das Objekt-Literal-Argument zweimal in einem Satz · `CHANGELOG.md:399-400` doppelte Leerzeile vor `### Dependencies`
- Nebenbefunde: 4 → »Offene Befunde« (1 → Scope · 3 → Audit)
- Folgen: keine — die 25 Aufrufstellen der Elternform, `ShaeEntElement.ts:460` und die drei E2E-Aufrufe compilieren und laufen unverändert, `dist/`-Dateiliste und `dist/package.json` sind unberührt
- Schnittstellen: der Konstruktor von `ViewComponent` deklariert zwei Aufrufformen statt einer — `new ViewComponent(token?: string, parent?: ViewComponent)` und `new ViewComponent(token?: string, options?: ViewComponentOptions)`, in dieser Reihenfolge, und `token` ist in beiden optional. `ViewComponentOptions` ist modul-lokal und nicht exportiert, wird aber in die `.d.ts` emittiert; es steht nicht in `index.ts` und ist kein Symbol, gegen das ein Konsument importieren kann. Kein Laufzeitverhalten und keine andere Signatur hat sich bewegt

**CONS-002 · info · packages/shadow-objects/src/view/ViewComponent.ts:194-196** (jetzt `:199-201`, Konstruktor `:188-217`) — Der ViewComponent-Konstruktor akzeptiert eine Aufrufform, die seine Signatur nicht nennt

Deklariert ist new ViewComponent(token, options?). Der Rumpf prüft zusätzlich options instanceof ViewComponent und deutet das Argument dann als {parent: options} um — die Form new ViewComponent(token, parent) läuft also, steht aber weder in der Signatur noch in docs/. Auffindbar ist sie allein im Quelltext. Wer sie benutzt, hängt an einem Zweig, den kein Vertrag deckt; wer sie streicht, kann nicht wissen, wen er trifft.

Empfehlung: Entweder als Overload deklarieren und in docs/api-reference.md nennen, oder fallen lassen. Beides ist eine Entscheidung über die öffentliche Oberfläche und gehört in einen eigenen Zug mit CHANGELOG-Eintrag.

**CONS-006 · info · packages/shadow-objects/src/utils/props-utils.ts:3-6 gegen types.ts:22-27** (unverändert; zweiter Leser auf `props-utils.ts:21`) — Der Property-Eintrag der Länge 1 hat im Repository keinen Erzeuger

ComponentPropertiesType ist als ([string] | [string, unknown])[] deklariert, und der JSDoc nennt die kurze Form ausdrücklich: ein Eintrag, der nur den Schlüssel nennt, gilt als gesetzt, ohne einen Wert zu tragen. filterUndefinedProps() ist die einzige Stelle, die sie liest. Erzeugt wird sie nirgends — weder ComponentChanges noch ComponentMemory noch die Elemente schreiben je ein Ein-Element-Tupel. Der Zweig ist damit nur für Eingaben von außerhalb erreichbar: eine zugesagte Form ohne inneren Weg dorthin, und ohne Erzeuger auch ohne Anlass, sie bei einem Umbau mitzudenken.

Empfehlung: Entweder einen Erzeuger benennen — dann gehört er in einen Test —, oder die Form als reine Eingangs-Toleranz dokumentieren. Streichen wäre eine Verhaltensänderung an einer exportierten Struktur und braucht einen eigenen Auftrag mit CHANGELOG-Eintrag.

**API-006 · low · packages/shadow-objects/src/types.ts:200-208 gegenüber packages/shadow-objects/docs/** (unverändert) — displayName ist öffentlicher Teil beider Konstruktor-Interfaces und in keiner Doku genannt

displayName steht in ShadowObjectConstructor und ShadowObjectConstructorFunc, wird in die .d.ts ausgeliefert und ist die einzige Möglichkeit, den Namen zu bestimmen, unter dem der Kernel ein Shadow Object meldet: getDisplayName() liest construct.displayName || construct.name, der Wert landet im Creation Scope und damit in jeder Diagnose über dieses Shadow Object. In packages/shadow-objects/docs/ und in README.md kommt das Wort kein einziges Mal vor — ein Konsument, der seine Meldungen lesbar machen will, findet den Weg dorthin nur im Quelltext.

Empfehlung: displayName in docs/api-reference.md bei den Konstruktor-Interfaces aufnehmen, mit dem einen Satz, wofür der Wert benutzt wird und was ohne ihn passiert. Die Cheat-Sheet-Zeile zum Registrieren eines Shadow Objects ist die zweite Stelle, an der er hingehört.

### [x] 8. Der Kernel führt eine Sichtbarkeitsform

- Findings: CONS-014 (low)
- Ziel: Alle privaten Glieder des Kernels sind mit `#` privat, sodass kein Weg in seine Buchführung zur Laufzeit auf dem Prototyp steht.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.ts` und die drei Stellen außerhalb, die eine der sieben Methoden beim Namen nennen
- Hängt ab von: —
- Hash: d38ce80
- Modell: mittlere Stufe (sonnet)
- Effort: low
- Dateien: `packages/shadow-objects/src/in-the-dark/Kernel.ts`, `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`, `packages/shadow-objects/src/in-the-dark/Entity.ts`, `packages/shadow-objects/CHANGELOG.md`, `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.spec.js`

**Abgleich.** Der Befund steht unverändert, nur die Zeilennummern sind gewandert. `Kernel.ts` ist seit `8e0911b` — der Basis dieses Laufs — unberührt; gegenüber `292714c`, dem Lesestand der `audit.html`, ist die Datei um 34 Zeilen gewachsen (`79ffa4f` aus dem vorigen Lauf). Heute stehen dort sieben Methoden mit dem Schlüsselwort `private` (`:231`, `:300`, `:665`, `:784`, `:848`, `:863`, `:922`), daneben vier mit `#` (`:134`, `:406`, `:744`, `:902`) und acht `#`-Felder (`:73-80`, `:94`, `:103`). Eine Ungenauigkeit im Report, damit niemand daran hängenbleibt: seine Beschreibung sagt »drei Methoden«, seine eigene Fundstellenangabe zählt vier auf. Vier ist richtig.

**Reichweite, nachgesehen statt vermutet.** Keine Unterklasse von `Kernel` und kein `new Proxy` im ganzen Monorepo. Jeder Aufruf der sieben steht in `Kernel.ts` selbst und lautet `this.<name>(…)`; keine wird als Wert entnommen oder als Callback weitergereicht, keine wird auf einer fremden Instanz gerufen. Keine Spec greift auf eine von ihnen zu — die drei Treffer außerhalb von `Kernel.ts` sind Kommentare. `tsconfig.json` steht auf `target: ES2022`, `build.mjs` auf `target: esnext`: private Methoden sind dort nativ, es wird nichts über WeakSets heruntergebrochen. Der Wechsel ist damit wirklich mechanisch, wie der Report sagt.

**Was ein Konsument merkt.** `Kernel` ist öffentliches API — `src/shadow-objects.ts` reicht es weiter, und `./shadow-objects.js` steht in der `exports`-Map. `private` verschwindet beim Transpilieren, die sieben stehen also heute zur Laufzeit auf dem Prototyp und sind aus JavaScript heraus aufrufbar; danach nicht mehr. Das ist derselbe Zuschnitt, unter dem `ComponentMemory` in diesem `## [Unreleased]` bereits als Breaking geführt wird: für TypeScript war der Weg nie offen, für JavaScript schon. Der Eintrag geht deshalb unter `### ⚠️ Breaking Changes` und nicht unter `### Internal`, und die gezählte Behauptung im Kopf des Abschnitts steigt mit.

- Vorgehen:
  1. In `packages/shadow-objects/src/in-the-dark/Kernel.ts` die sieben Deklarationen von `private <name>` auf `#<name>` umstellen. Signaturen, Parameter, Rückgabetypen und Rümpfe bleiben Zeichen für Zeichen, wie sie sind; es ändert sich je Zeile nur das Schlüsselwort gegen das Doppelkreuz. Betroffen sind, mit ihren heutigen Zeilen:
     - `:231` `private getEntityGraphNode(uuid: string, visited: Set<string>): EntityGraphNode | undefined` → `#getEntityGraphNode(…)`
     - `:300` `private parse(entry: IComponentChangeType): void` → `#parse(…)`
     - `:665` `private updateShadowObjects(` → `#updateShadowObjects(` (die vierzeilige Parameterliste und `): Set<ShadowObjectConstructor> {` bleiben)
     - `:784` `private constructShadowObject(construct: ShadowObjectConstructor, entry: EntityEntry): ShadowObjectType` → `#constructShadowObject(…)`
     - `:848` `private createShadowObjects(entry: EntityEntry): void` → `#createShadowObjects(…)`
     - `:863` `private attachShadowObject(shadowObject: object, entity: Entity): void` → `#attachShadowObject(…)`
     - `:922` `private destroyShadowObject(shadowObject: object, entity: Entity): void` → `#destroyShadowObject(…)`
  2. Dieselbe Datei, die vierzehn Aufrufstellen von `this.<name>(` auf `this.#<name>(` umstellen. Alle Zeilennummern dieses Plans bleiben über das ganze Paket gültig: jede Ersetzung fügt ein Zeichen ein, keine eine Zeile.
     - `getEntityGraphNode`: `:227`, `:244`
     - `parse`: `:291`
     - `updateShadowObjects`: `:256`, `:261`, `:630`, `:647`
     - `constructShadowObject`: `:706`, `:771`, `:850`
     - `createShadowObjects`: `:383`
     - `attachShadowObject`: `:831`
     - `destroyShadowObject`: `:694`, `:758`, `:841`
  3. Dieselbe Datei, die Kommentare, die eine der sieben beim Namen nennen, auf die `#`-Schreibweise bringen. Die Datei führt diese Form für private Glieder bereits (`:838` nennt `` `#shadowObjectScopes` ``), es ist also die Hausform und keine neue Konvention. Betroffen: `:51` und `:53` (`` `attachShadowObject()` ``), `:85` (`` `destroyShadowObject()` ``), `:131` (`` `updateShadowObjects()` ``), `:459` (`` `destroyShadowObject()` ``), `:639` und `:642` (`` `updateShadowObjects()` ``), `:819` (`` `updateShadowObjects()` ``), `:838` (`` `attachShadowObject()` ``), `:839` (`` `destroyShadowObject()` ``). Der übrige Wortlaut jedes Kommentars bleibt unangetastet.
  4. Dieselbe Datei, `:272`: `{@link Kernel.parse}` wird zu `` `#parse` `` in Backticks. Der Satz lautet danach: `* {@link ChangeTrailRefusedError} names its length. The counter sits behind` / `* `#parse` and therefore counts only entries that returned normally.` — der Rest des Doc-Kommentars auf `run()` bleibt Wort für Wort stehen. Grund: TypeScript streicht einen `#`-Namen aus der emittierten Deklaration, das Ziel des Links existiert für einen Leser der `.d.ts` also nicht mehr. Backticks sagen dasselbe, ohne einen Verweis zu behaupten, der ins Leere geht.
  5. Die drei Kommentare außerhalb von `Kernel.ts`, die eine der sieben nennen, ziehen mit — sie benennen ein Symbol, das nach Schritt 1 anders heißt:
     - `packages/shadow-objects/src/in-the-dark/Entity.ts:492`: `` `Kernel.updateShadowObjects()` `` → `` `Kernel.#updateShadowObjects()` ``. Der Doc-Kommentar sitzt auf `getPropertyWriter(key)` und wird emittiert; das Doppelkreuz sagt dem Leser zugleich, dass die Stelle nicht seine ist.
     - `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts:745`: `` `updateShadowObjects()` `` → `` `#updateShadowObjects()` ``.
     - `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.spec.js:126`: `` `constructShadowObject()` `` → `` `#constructShadowObject()` ``.
  6. Regressionstest in `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`, **vor** dem Fix rot gesehen; die rote Ausgabe gehört in den Report. Er kommt als letzter Block innerhalb von `describe('Kernel', …)`, direkt vor dessen schließendem `});` am Dateiende. Er braucht keine Kernel-Instanz und kein Aufräumen:

     ```ts
     // The bookkeeping of the kernel has one way in from the outside, and that is its public
     // surface. A member written with the TypeScript `private` keyword keeps standing on the
     // prototype after the transpile and answers a call from JavaScript, so the shape of the
     // class is asserted here rather than left to the reading of a declaration file.
     describe('the members that carry the bookkeeping of the kernel', () => {
       it('stand off the prototype', () => {
         const names = [
           'getEntityGraphNode',
           'parse',
           'updateShadowObjects',
           'constructShadowObject',
           'createShadowObjects',
           'attachShadowObject',
           'destroyShadowObject',
         ];

         const onPrototype = names.filter((name) => Object.getOwnPropertyNames(Kernel.prototype).includes(name));

         expect(onPrototype, 'reachable from JavaScript').toEqual([]);
       });
     });
     ```

     Vor Schritt 1 zählt `onPrototype` alle sieben und der Test scheitert mit ihnen im Vergleich; danach ist die Liste leer. `Kernel` ist in der Spec bereits importiert (`:22`), es kommt kein Import dazu.
  7. `packages/shadow-objects/CHANGELOG.md`, drei Eingriffe:
     - Unter `### ⚠️ Breaking Changes` direkt hinter den Eintrag `**Breaking (kernel):** `Kernel.traverseLevelOrderBFS()` hands out a fresh array…` (`:218`) ein neuer Eintrag im Hausstil, der genannt haben muss: dass die sieben Methoden `#`-privat sind und damit zur Laufzeit nicht mehr auf dem Prototyp stehen; ihre Namen; dass sie in die Buchführung des Kernels greifen (Entity-Einträge, Konstruktormengen je Entity, Creation Scope eines Shadow Objects); dass TypeScript den Weg nie erlaubt hat und JavaScript schon, ein solcher Aufruf jetzt also `undefined` findet; dass `dist/src/in-the-dark/Kernel.d.ts` seine sieben `private <name>;`-Zeilen verliert und seine `#private;`-Markierung behält; und dass die veröffentlichte Dateiliste und die Form von `dist/package.json` unverändert bleiben.
     - Im einleitenden Absatz unter `## [Unreleased]` (`:12`) wird `Fifty-six changes reach existing` zu `Fifty-seven changes reach existing`.
     - Derselbe Absatz endet auf `:201-202` mit `> `ComponentContext` it observes, where it used to read `undefined` for the whole lifetime of an` / `> environment.`. Das abschließende `environment.` wird zu `environment;` und bekommt einen Halbsatz nachgestellt, im Register der übrigen Klauseln: die sieben Methoden von `Kernel` stehen nicht mehr auf dem Prototyp, ein JavaScript-Aufruf, der am Typlayer vorbeigreift, findet `undefined`. Die Zeile `> Everything else in this section is additive or a bugfix.` bleibt, wo sie steht.
     - Die vier Erwähnungen im selben `## [Unreleased]`, die eine der sieben beim Namen nennen, bekommen ihr Doppelkreuz, sonst nichts: `:295` `` `updateShadowObjects()` `` → `` `#updateShadowObjects()` ``; `:325` `` `Kernel.updateShadowObjects()` `` → `` `Kernel.#updateShadowObjects()` ``; `:382` `` `attachShadowObject()` `` → `` `#attachShadowObject()` `` (Satzanfang des Eintrags); `:452` `` `Kernel.constructShadowObject()` `` → `` `Kernel.#constructShadowObject()` ``. Sie beschreiben dieselbe Auslieferung wie der neue Eintrag und müssen das Symbol so nennen, wie es ausgeliefert wird.
  8. Nicht anfassen, damit niemand danach sucht oder es für vergessen hält:
     - `packages/shadow-objects/CHANGELOG.md:471` nennt `` `Kernel.run()`/`parse()` ``, steht aber unter `## [0.33.0] - 2026-06-19`. Ein veröffentlichter Abschnitt beschreibt den Stand seiner Version und wird nicht nachgeführt.
     - `packages/shadow-objects/docs/**` und beide `README.md`: keine der sieben kommt dort vor. §Kernel der `api-reference.md` führt die siebzehn öffentlichen Methoden samt Konstruktor, keine der sieben ist darunter. Die Treffer auf `parse` in `docs/` sind alle `JSON.parse`.
     - `src/distContract.files.txt` und `src/distContract.package.json`: keine Datei kommt, geht oder wird umbenannt, und `dist/package.json` behält seine Form. `distContract.spec.ts` prüft Dateiliste und Paketform, nicht den Inhalt einer `.d.ts`.
     - `pnpm make:todo`: kein `TODO` wird angelegt, geändert oder entfernt.
     - `AGENTS.md`: nennt keine Methode des Kernels.
     - Das `CHANGELOG.md` im Repo-Root: keine Änderung an Build, Testrunner, Lint oder Toolchain.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `lint:ci` fährt Biome mit `--error-on-warnings`, und `noUnusedPrivateClassMembers` steht auf `warn`: eine der sieben ohne Aufrufer würde den Lauf rot machen. Alle sieben haben Aufrufer, geprüft in Schritt 2. Die E2E-Suite bleibt draußen wie in den Paketen davor — 654 Playwright-Tests über drei Browser reißen die Zehn-Minuten-Grenze des Bash-Werkzeugs, und kein E2E-Test erreicht eine der sieben Methoden. `TURBO_FORCE=true` verhindert, dass turbo einen grünen Cache-Treffer von vor der Änderung meldet.
- Commit: `refactor(kernel): the bookkeeping of the kernel stands off the prototype`
- Ergebnis: 1 Runde · CONS-014 behoben · die sieben Methoden des Kernels sind `#`-privat, fünfzehn Aufrufstellen, die Kommentare in `Kernel.ts` und die drei außerhalb ziehen mit, `{@link Kernel.parse}` steht als Backtick-Name · Regressionstest `stand off the prototype` in `Kernel.spec.ts` (vor dem Fix rot gesehen, alle sieben Namen im Vergleich) · Verify `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci` exit 0, 0 von 5 Tasks aus dem Cache, Coverage 93.32 % Statements (Baseline 93.11 %) · Reviewer: kein kritischer, kein wichtiger, kein kleiner Befund
- Klein, im Plantext statt in der Umsetzung: Schritt 2 des Detailplans spricht von vierzehn Aufrufstellen und zählt fünfzehn auf (`updateShadowObjects` hat vier). Umgestellt sind alle fünfzehn.
- Nebenbefunde: keine
- Folgen: keine — die sieben Namen leben ausschließlich in den fünf committeten Dateien, Typecheck und die drei vitest-Suiten decken das ab
- Beleg: Implementierer- und Reviewer-Report fehlen — der Runner hat den Code selbst geschrieben, die Nachprüfung der Schleife hat das erkannt und mit Exit 20 angehalten. Der Commit bleibt nach Prüfung durch den Orchestrator; siehe »Entscheidungen« (2026-08-28).
- Schnittstellen: `Kernel.getEntityGraphNode()`, `parse()`, `updateShadowObjects()`, `constructShadowObject()`, `createShadowObjects()`, `attachShadowObject()` und `destroyShadowObject()` heißen `#<name>` und stehen zur Laufzeit nicht mehr auf `Kernel.prototype`. Für TypeScript war der Weg nie offen; ein späteres Paket, das eine dieser Methoden von außen ruft oder in einer Spec anfasst, findet `undefined`. Innerhalb von `Kernel.ts` lautet jeder Aufruf `this.#<name>(…)`, und ein Kommentar, der eine von ihnen nennt, führt das Doppelkreuz mit.

**CONS-014 · low · packages/shadow-objects/src/in-the-dark/Kernel.ts:73-80,134,379,717,875 (#) gegenüber :204,273,638,757,821,836,895 (private)** — Der Kernel mischt zwei Sichtbarkeitsmechanismen in einer Klasse

Die Felder und drei Methoden sind mit # privat, sieben weitere Methoden mit dem TypeScript-Schlüsselwort private. Der Unterschied ist nicht kosmetisch: private verschwindet beim Transpilieren, die sieben stehen also zur Laufzeit auf dem Prototyp und sind aus JavaScript heraus aufrufbar. destroyShadowObject() und attachShadowObject() gehören dazu, beides Wege, die mitten in die Buchführung des Kernels greifen. In derselben Datei stehen #requireEntry() und #rollbackFailedCreation() als echte private Methoden daneben, sodass die Klasse beide Formen nebeneinander vorführt.

Empfehlung: Auf # vereinheitlichen. Die Klasse hat keine Unterklasse, und außerhalb der Datei greift nichts auf die sieben zu, ein Kommentar in Entity.ts ausgenommen. Der Wechsel ist mechanisch.

### [x] 9. Ein gemeinsamer Guard-Helfer und die zwei Fehlerzusagen im Text

- Findings: Punkt »Ein gemeinsamer Guard-Helfer und ein Absatz, der die zwei Zusagen benennt« aus dem Optimierungspotenzial
- Ziel: Jeder Abbauschritt meldet über einen Helfer statt über einen handgeschriebenen `try`/`catch`, und `docs/api-reference.md` benennt beide Fehlerzusagen und sagt, welche für welchen Weg gilt.
- Bereich: `packages/shadow-objects/src/in-the-dark/`, `packages/shadow-objects/src/utils/`, `packages/shadow-objects/docs/api-reference.md`
- Hängt ab von: 8 (dieselben Methoden im Kernel)
- Hash: 3dcc700
- Modell: stärkste Stufe (opus)
- Effort: medium
- Dateien: `packages/shadow-objects/src/utils/runGuarded.ts` (neu), `packages/shadow-objects/src/utils/runGuarded.spec.ts` (neu), `packages/shadow-objects/src/in-the-dark/Kernel.ts`, `packages/shadow-objects/src/in-the-dark/Entity.ts`, `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`, `packages/shadow-objects/src/distContract.files.txt`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`

**Abgleich, gezählt statt geglaubt.** Der Punkt steht, seine Zahlen stimmen, eine seiner Formulierungen nicht:

- Zwei Klassen führen ein `#runGuarded(step, run)`: `Entity.ts:306` und `ShadowObjectCreationScope.ts:382`. Sie sind **nicht** »Wort für Wort dasselbe«, wie der Report sagt, sondern Zeile für Zeile derselbe Bau mit drei anderen Werten — `this.#kernel.logger` gegen `this.#logger`, `` `entity teardown step failed (…)` `` gegen `` `shadow-object teardown failed (…)` ``, `this.#uuid` gegen `this.#displayName`. Der Befund trägt trotzdem: dupliziert ist der Rumpf, und der ist es vollständig.
- `Kernel.ts` schreibt den `try`/`catch` zwölfmal von Hand aus — `:409`, `:431`, `:442`, `:472`, `:489`, `:500`, `:580`, `:759`, `:772`, `:908`, `:917`, `:953`. Das »weitere Dutzend« des Reports ist auf den Kopf genau. Eine dreizehnte Stelle steht in `Entity.ts:109`, im Sammler `deferContextValueUpdate` außerhalb der Klasse; ihr Kommentar verweist bereits auf `#runGuarded()`.
- Von den vierzehn Treffern auf `logger.error` in `Kernel.ts` sind das zwölf. Der dreizehnte Aufruf (`:875`) meldet einen Lifecycle-Hook unter falschem Namen und ist kein Guard; der vierzehnte Treffer ist eine Erwähnung im Kommentar auf `:869`.
- Die Wurf-Wege sind davon unberührt und bleiben es: `run()` (`:290`, verpackt in `ChangeTrailRefusedError`), `createEntity()` (`:374`, Rollback und dann Wurf), `#updateShadowObjects()` (`:707`), `#constructShadowObject()` (`:791` und `:832`). Sie sind die eine Hälfte der Zusage, die der Text benennen soll, und keine Arbeit für den Helfer.
- `ShadowObjectCreationScope.ts` ist seit dem Lesestand der `audit.html` (`292714c`) durch `d434a3a` und `78b128a` gewachsen; `#runGuarded` und seine elf Aufrufstellen in `tearDown()` sind dabei unverändert geblieben und nur gewandert (`:250` → `:306`). `Kernel.ts` zählte damals dieselben vierzehn Treffer. Anders als der Riegel aus Paket 2 ist dieser Punkt also von keinem Vorgängerlauf mit erledigt worden.
- Die `Folgen:`-Zeile jedes erledigten Pakets lautet »keine«. Es liegt kein Stapel offener Folgen zum Verteilen bereit.
- Kein Eintrag aus »Offene Befunde« teilt die Ursache dieses Pakets. Der nächste Nachbar ist `ShadowObjectCreationScope.ts:769` — ein `onDestroy(cb)` aus einem Cleanup, den `tearDown()` selbst fährt, verschwindet in einer bereits abgegangenen Menge. Das ist die Reihenfolge der beiden Unsubscribe-Mengen, nicht die Form des Guards; der Eintrag bleibt, wo er steht.

**Wo die Grenze läuft.** Guards derselben Machart stehen auch in `elements/ShaeEntElement.ts:456`, `elements/ShaePropElement.ts:274` und `view/ShadowEnv.ts:518`. Sie bleiben draußen. Sie melden keine Identität, sondern ein Objekt mit Kontext, sie hängen an einem anderen Logger und an einer anderen Zusage, und der Report nennt ausdrücklich den Kernel und seine zwei Wege. Ein Paket, das drei Subsysteme über einen Kamm schert, hat keine gemeinsame Ursache mehr, sondern eine Ähnlichkeit.

**Die gemeinsame Form der Meldungen**, ausgeschrieben, weil »gemeinsame Form« sonst Geschmackssache bleibt: Ein Guard meldet `logger.error(<message>, <identität…>, error)`. Die `message` benennt den gescheiterten Schritt, im Ton `<subjekt> … failed:` oder `<subjekt> could not …:`, und endet auf einen Doppelpunkt. Die Identitätsargumente benennen, woran der Schritt gearbeitet hat, das Spezifischste zuerst — der Anzeigename eines Shadow Objects vor der uuid seiner Entity. Der Fehler steht immer am Ende, und der Helfer ist die Stelle, die ihn dorthin setzt. An dieser Regel gemessen weichen genau zwei der dreizehn Meldungen ab, beide in `Kernel.ts`, und nur diese beiden werden umformuliert (Schritt 4c). Die übrigen elf lesen sich bereits so; sie umzuschreiben wäre Bewegung ohne Gewinn, und eine von ihnen steht in einer Zusicherung (`Entity.spec.ts:1000`).

**Keine bestehende Spec ändert sich.** Nachgesehen: die einzige Zusicherung auf einen Meldungstext dieser Familie ist `Entity.spec.ts:1000` (`'entity onParentChanged notification failed:'`), und diese Meldung bleibt Zeichen für Zeichen stehen. Die beiden Wortlaute aus Schritt 4c haben repoweit keinen zweiten Leser. Die Umstellung selbst ist durch vorhandene Tests gedeckt — `Kernel.spec.ts` führt unter anderem `describe('a teardown callback that throws')` (`:3109`), `describe('kernel teardown')` (`:4162`), `describe('an entity teardown with a shadow-object hook that throws')` (`:4526`), `describe('an entity teardown with a listener on the entity that throws')` (`:4655`) und `describe('an entity teardown whose removeFromParent throws')` (`:4796`), dazu achtzehn Spione auf `console.error`. Keine dieser Zusicherungen wird abgeschwächt oder umgeschrieben.

- Vorgehen:
  1. Neues Modul `packages/shadow-objects/src/utils/runGuarded.ts`. Es enthält genau eine exportierte Funktion und keinen Zustand:

     ```ts
     import type {ConsoleLogger} from './ConsoleLogger.js';

     export function runGuarded(logger: ConsoleLogger, run: () => void, message: string, ...details: unknown[]): void {
       try {
         run();
       } catch (error) {
         logger.error(message, ...details, error);
       }
     }
     ```

     Darüber ein Doc-Kommentar auf Englisch, der das *Warum* trägt und mindestens sagt: dass dieses Paket eine Zusage auf zwei Wegen beantwortet — ein Weg, der baut, gibt seinen Fehler an den Aufrufer und nimmt vorher zurück, was er gebaut hat; ein Weg, der abbaut, fängt je Schritt, meldet und läuft weiter —, dass diese Funktion die zweite Zusage trägt und ein gescheiterter Schritt nur sich selbst kostet; dass die Meldung immer `message`, dann die Identitätsargumente, dann den Fehler führt und der Fehler zuletzt steht, weil hier und nirgends sonst darüber entschieden wird; dass `logger.error` an keinem Schalter hängt und die Meldung deshalb auch außerhalb von localhost sichtbar bleibt. Ein Verweis auf den Abschnitt »Two error contracts« in `docs/api-reference.md` gehört hinein, kein Verweis in die Gegenrichtung (die Doku beschreibt Verhalten, nicht Interna). `@param message` und `@param details` tragen die Formregel aus dem Abschnitt oben. Die Reihenfolge der Parameter ist bewusst so: `details` ist ein Rest-Parameter und muss zuletzt stehen, der Rückgabewert ist `void`, weil keine der dreizehn Stellen ein Ergebnis liest.

     `runGuarded` wird **nicht** aus `src/index.ts` re-exportiert und bekommt keinen Eintrag in der `exports`-Map der `package.json` — es ist intern. Es steht auch nicht in `sideEffects`: das Modul hat keine.
  2. `packages/shadow-objects/src/in-the-dark/Entity.ts`:
     - `import {runGuarded} from '../utils/runGuarded.js';` aufnehmen. Die Reihenfolge der Import-Blöcke entscheidet Biome (`pnpm lint:ci` ist der Schiedsrichter); die Zeile gehört hinter `../types.js` und vor `./events.js`.
     - `:104-114`, der Sammler `deferContextValueUpdate`: der `try`/`catch` wird zu einem Aufruf mit `kernel.logger`, dem Rumpf `() => contextSignal.set(entry.value)`, der unveränderten Meldung `` `an effect of a context value failed (${String(entry.name)}):` `` und `entry.uuid`. Der Kommentar auf `:105-108` verweist heute auf »the way `#runGuarded()` below … does it«; er nennt danach den Helfer selbst, weil diese Stelle jetzt derselbe Aufruf ist. Der Rest des Kommentars — dass `set()` die Effekte synchron fährt und wirft, und dass ein scheiternder Leser nur seinen eigenen Wert kostet — bleibt Wort für Wort stehen.
     - `:306-312`, `#runGuarded`: der Rumpf wird zu einer Zeile — `` runGuarded(this.#kernel.logger, run, `entity teardown step failed (${step}):`, this.#uuid); ``. Signatur, Name und die sechsundzwanzig Aufrufstellen der Methode bleiben unangetastet: was der Wrapper beiträgt, ist die Beschriftung und die Identität, und die gehören zu dieser Klasse. Der Doc-Kommentar auf `:302-305` bleibt in seinem Wortlaut und bekommt einen Satz nachgestellt, der sagt, dass die Meldung über den gemeinsamen `runGuarded()` geht und dieser Wrapper Beschriftung und uuid beisteuert.
  3. `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`, dieselbe Behandlung:
     - `import {runGuarded} from '../utils/runGuarded.js';`
     - `:382-388`, `#runGuarded`: Rumpf zu `` runGuarded(this.#logger, run, `shadow-object teardown failed (${step}):`, this.#displayName); ``. Die elf Aufrufstellen in `tearDown()` bleiben unangetastet.
     - Der Doc-Kommentar auf `:377-381` behält seinen Wortlaut samt des Halbsatzes über »ungated … outside localhost« und bekommt denselben nachgestellten Satz wie in Schritt 2, mit »display name« statt »uuid«.
     - Der Kommentar auf `:707` nennt `` `#runGuarded()` in `tearDown()` `` und bleibt richtig; er wird nicht angefasst.
  4. `packages/shadow-objects/src/in-the-dark/Kernel.ts`, `import {runGuarded} from '../utils/runGuarded.js';` aufnehmen (hinter `../utils/ConsoleLogger.js`), dann die zwölf Stellen umstellen. Rumpf, Meldung und Identitätsargumente bleiben, wo nicht ausdrücklich anders vermerkt, Zeichen für Zeichen dieselben; jeder umgebende Kommentar bleibt vollständig stehen, auch dort, wo er von »a guard of its own« spricht — das gilt weiter.
     a. Die zehn, die nichts als ihre Form ändern, mit ihrem heutigen `try` als Anker:
        - `:409` → Rumpf `() => this.destroyEntity(uuid)`, Identität `uuid`. Meldung siehe c.
        - `:431` → Rumpf ist der vorhandene `if`/`else` über `child.autoDestructionOnParentRemoval`, unverändert; Meldung `'child of a destroyed entity could not be handed on:'`, Identität `child.uuid`. Dies ist die einzige der zwölf Stellen mit mehr als einem Ausdruck im Rumpf.
        - `:442` → `() => entity.removeFromParent()`, `'entity could not be detached from its parent:'`, `entity.uuid`.
        - `:472` → `() => emit(entity, onDestroy, entity)`, `'entity onDestroy notification failed:'`, `entity.uuid`.
        - `:489` → `() => this.#shadowObjectScopes.get(shadowObject)?.tearDown()`, `'creation scope teardown of a destroyed entity failed:'`, `entity.uuid`.
        - `:500` → `() => entity[onDestroy]()`, `'entity release failed:'`, `entity.uuid`.
        - `:580` → `() => emit(e, onParentChanged, e)`, `'entity onParentChanged notification failed:'`, `uuid`. Diese Meldung steht in `Entity.spec.ts:1000` in einer Zusicherung und bleibt deshalb auch dann unangetastet, wenn sie jemandem zu lang vorkommt.
        - `:759` → `() => this.#destroyShadowObject(created[i]!, entry.entity)`, `'rollback of a failed shadow-object update could not remove a new shadow-object:'`, `entry.entity.uuid`.
        - `:772` → `() => this.#constructShadowObject(construct, entry)`, `'rollback of a failed shadow-object update could not restore a shadow-object:'`, dann `getDisplayName(construct)` und `entry.entity.uuid`. Die einzige der dreizehn Stellen mit zwei Identitätsargumenten, in dieser Reihenfolge — sie ist der Grund, warum `details` ein Rest-Parameter ist.
        - `:908` → `() => (shadowObject as OnDestroy)[onDestroy](entity)`, `'shadow-object onDestroy hook failed:'`, `displayName`. Das umgebende `if (typeof (shadowObject as any)[onDestroy] === 'function')` bleibt, wo es steht.
        - `:917` → `() => emit(shadowObject, onDestroy, entity)`, `'shadow-object onDestroy notification failed:'`, `displayName`.
     b. Der äußere `try`/`finally` in `destroyEntity()` (`:422` mit dem `finally` auf `:505`) bleibt unberührt: er fängt nichts, er stellt sicher, dass der Kernel die Entity in jedem Fall loslässt. Ebenso unberührt bleiben die vier Wurf-Wege aus dem Abgleich (`:290`, `:374`, `:707`, `:791`, `:832`) und der Lifecycle-Hook-Report auf `:875`.
     c. Zwei Meldungen werden im selben Zug in die gemeinsame Form gebracht, weil sie als einzige daneben liegen — beide haben repoweit keinen zweiten Leser:
        - `:412` `'rollback of a failed entity creation failed:'` stottert (»failed … failed«). Neu: `'rollback of a failed entity creation could not destroy the entity:'` — der Ton der beiden Geschwister auf `:763` und `:776`.
        - `:956` `'entity teardown failed:'` steht in `Kernel.destroy()` und ist von `` `entity teardown step failed (…)` `` aus `Entity.ts` in einem Log nicht zu unterscheiden. Neu: `'entity teardown during kernel destroy failed:'`.
     d. Die Stelle `:953` behält im Übrigen ihren Rumpf `() => this.destroyEntity(entity.uuid)` und ihre Identität `entity.uuid`.
     e. Nach der Umstellung enthält `Kernel.ts` genau einen `logger.error`-Aufruf, den Lifecycle-Hook-Report auf `:875`. Fällt bei der Arbeit auf, dass ein weiterer stehen geblieben ist, ist eine der zwölf Stellen nicht umgestellt worden.
  5. Neue Spec `packages/shadow-objects/src/utils/runGuarded.spec.ts`, **vor** dem Fix rot gesehen — vor Schritt 1 gibt es das Modul nicht, der Import scheitert und alle drei Fälle sind rot; die rote Ausgabe gehört in den Report. Sie fährt gegen einen echten `new ConsoleLogger(…)` und einen Spion auf `console.error`, wie die achtzehn vorhandenen Stellen in `Kernel.spec.ts` es tun. `ConsoleLogger` stellt seinem Aufrufer zwei Argumente voran (`%c<namespace>` und die Styles), die Nutzlast beginnt also bei Index 2:
     - »runs the step and reports nothing when it returns« — ein Rumpf, der eine Variable setzt; danach ist die Variable gesetzt und `console.error` nicht gerufen worden.
     - »reports a step that throws and does not hand the error on« — der Aufruf wirft nicht, `console.error` ist genau einmal gerufen worden, und `calls[0].slice(2)` ist `[message, detail, error]` mit demselben Fehlerobjekt, das der Rumpf geworfen hat.
     - »keeps the error behind however many details it was given« — zweimal derselbe werfende Rumpf, einmal ohne und einmal mit zwei Details; `slice(2)` ist `[message, error]` beziehungsweise `[message, detailA, detailB, error]`.
  6. `packages/shadow-objects/src/distContract.files.txt`: vier Zeilen kommen dazu, sortiert zwischen `src/utils/props-utils.js.map` (`:162`) und `src/utils/toMaybe.d.ts` (`:163`) — `src/utils/runGuarded.d.ts`, `src/utils/runGuarded.d.ts.map`, `src/utils/runGuarded.js`, `src/utils/runGuarded.js.map`. `src/distContract.package.json` bleibt unberührt: kein Eintrag in `exports`, kein neuer Dependency-Name, `sideEffects` unverändert. Die Spec (`src/distContract.spec.ts`) wird nicht angefasst. Dasselbe Muster hat Paket 3 für `WorkerTimeoutError` gefahren.
  7. `packages/shadow-objects/docs/api-reference.md`:
     - Neuer Abschnitt `### Two error contracts`, zwischen der schließenden Code-Zaun-Zeile `:2613` und `### Properties` (`:2615`), also als erster Unterabschnitt von `## Kernel (ECS System Runner)`. Er ist eine Synthese und keine Wiederholung: was die Absätze weiter unten ausbuchstabieren, wird verlinkt statt ein zweites Mal erzählt. Vier Teile, in dieser Reihenfolge:
       1. Ein Satz mit der Regel: ein Weg, der baut, gibt seinen Fehler an den Aufrufer und nimmt vorher zurück, was er gebaut hat; ein Weg, der abbaut, fängt je Schritt, meldet über den `logger` des Kernels und läuft weiter.
       2. Eine Tabelle mit zwei Zeilen (`Path` | `On a throw`). Bauwege, namentlich: `run()`, `createEntity()`, `setParent()`, `changeToken()`, `changeProperties()`, `upgradeEntities()` — der Fehler erreicht den Aufrufer, und `run()` verpackt ihn in einen `ChangeTrailRefusedError`, dessen `appliedCount` sagt, wie weit der Trail gekommen war. Abbauwege, namentlich: `destroyEntity()`, `Kernel.destroy()`, der `[onDestroy]`-Hook eines Shadow Objects und die `onDestroy`-Benachrichtigung, die andere Objekte hören, der Teardown des Creation Scope und die Freigabe der Entity — kein Fehler erreicht den Aufrufer, jeder Schritt kostet nur sich selbst.
       3. Drei Aufzählungspunkte für die Stellen, an denen die Grobregel allein nicht trägt: (a) `onParentChanged` ist eine Zustellung auf einem Bauweg und trotzdem geguardet — der Elternlink steht bereits, wenn sie hinausgeht, ein Hörer kann ihn nicht zurücknehmen, und ein Wurf von dort machte aus einem schlechten Hörer einen abgelehnten Change Trail; (b) der Rückweg eines Bauwegs folgt der Abbauzusage — was dort scheitert, wird gemeldet und nie neu geworfen, weil der Aufrufer auf den Fehler des Aufbaus wartet; (c) die Übergabe eines Entity-Context-Wertes ist je Leser geguardet — ein Leser, der scheitert, kostet seinen eigenen Wert und keinen zweiten.
       4. Ein Satz zur Form der Meldung: sie geht über den `ConsoleLogger` unter dem Namensraum `Kernel`, `logger.error` hängt an keinem Schalter und bleibt deshalb auch außerhalb von localhost sichtbar, und sie führt immer erst die Meldung, dann was den Gegenstand benennt, dann den Fehler.
       Verlinkt werden aus dem Abschnitt heraus: `#### run(event)`, `#### Applying a Change Trail by Hand`, die beiden Absätze »A failed creation takes its own Entity back« und »A failed token change is taken back«, `#### ChangeTrailRefusedError`, `#### onDestroy(callback)`, `#### The creation API past the teardown` und »A `useContext` consumer that throws costs its own context value and no other« (`:152`). Der Helfer aus Schritt 1 wird nicht genannt — er ist intern, und die Doku beschreibt Verhalten.
     - Drei Türen hinein, je ein Satz oder Halbsatz mit `[Two error contracts](#two-error-contracts)`: unter `#### run(event)` (`:2624`), am Ende der `destroyEntity`-Zeile in der Tabelle unter `#### Applying a Change Trail by Hand` (`:2751`) und am Ende des ersten Absatzes von `#### onDestroy(callback)` (`:396`).
     - Kein vorhandener Absatz wird gekürzt, verschoben oder umgeschrieben. Der neue Abschnitt sagt, welche Zusage gilt; die vorhandenen sagen weiter, wie weit sie reicht.
  8. `packages/shadow-objects/CHANGELOG.md`, zwei Einträge, beide an den Kopf von `### Internal` unter `## [Unreleased]`, vor `**Internal (elements):** the deferred teardown lives in its own module` — dort haben die jüngsten Einträge dieses Abschnitts ihren Platz:
     - `**Internal (kernel):** …` im Hausstil, mit: dass jeder Abbauschritt über einen Helfer meldet, `src/utils/runGuarded.ts`, und dass vier Dateien unter `dist/src/utils/` zur veröffentlichten Liste kommen (`runGuarded.js`, `runGuarded.d.ts` und die Source Map neben jeder); dass die zwölf handgeschriebenen Guards in `Kernel.ts`, der eine in `Entity.ts` und die beiden `#runGuarded`-Methoden von `Entity` und `ShadowObjectCreationScope` ihn teilen; dass die Form der Meldung damit an einer Stelle liegt — Meldung, Identität, Fehler zuletzt; dass das Modul aus `index.ts` nicht re-exportiert wird und in keinem Eintrag der `exports`-Map steht, die Dateiliste also alles ist, was ein Konsument davon sieht; dass sich kein Verhalten ändert, dieselben Schritte geguardet bleiben und dieselben Meldungen hinausgehen — mit Ausnahme zweier Wortlaute, die beide genannt werden, alt wie neu.
     - `**Docs (reference):** …` mit: dass §Kernel der `api-reference.md` den Abschnitt `Two error contracts` bekommt; dass er beide Zusagen benennt und sagt, welche Methode unter welcher steht; dass er die drei Stellen nennt, an denen die Grobregel nicht allein trägt; und dass `run(event)`, die `destroyEntity`-Zeile und `onDestroy(callback)` dorthin verweisen.
  9. Nicht anfassen, damit niemand danach sucht oder es für vergessen hält:
     - Der einleitende Absatz unter `## [Unreleased]` und seine gezählte Behauptung (»Fifty-seven changes reach existing consumers«). Dieses Paket ändert weder eine Signatur noch einen Typ noch ein Laufzeitverhalten; zwei Wortlaute auf der Konsole sind kein Vertrag, an dem ein `catch` oder ein Build hängt. Die Zahl bleibt, wo sie steht.
     - `packages/shadow-objects/docs/concepts.md` §5 »Invariants« und `docs/cheat-sheet.md` »The six invariants«. Beide Listen handeln vom Domänenmodell — was das Framework mit Entities tut und was nicht —, nicht von Fehlerwegen; ein siebter Eintrag verlangte die Überschrift umzubenennen und schickte den Leser für das Detail doch in die Referenz. Ein Zuhause, drei Türen.
     - `packages/shadow-objects/README.md` und die übrigen Dateien unter `docs/`: keine öffentliche Signatur, kein Export und keine Konstante bewegt sich, und keine von ihnen nennt eine der geänderten Stellen.
     - `src/index.ts`, `package.json` (`exports`, `sideEffects`) und `src/distContract.package.json`: der Helfer ist intern.
     - Das `CHANGELOG.md` im Repo-Root: keine Änderung an Build, Testrunner, Lint oder Toolchain.
     - `pnpm make:todo`: in den drei angefassten Quelldateien steht kein `TODO`, und es kommt keines dazu.
     - `AGENTS.md`: nennt weder eine Methode des Kernels noch eine Fehlerzusage.
     - `packages/shadow-objects-testing`, `packages/shadow-objects-e2e` und `packages/shae-offscreen-canvas`: keine von ihnen nennt eine der dreizehn Meldungen oder greift auf den Helfer zu.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `lint:ci` fährt Biome mit `--error-on-warnings`; die Import-Reihenfolge der drei angefassten Dateien und `noUnusedImports` hängen daran. Die neue Datei unter `dist/` macht `src/distContract.spec.ts` zum eigentlichen Prüfstein dieses Pakets — turbo baut vor dem Test (`tasks.test.dependsOn`), und `TURBO_FORCE=true` verhindert, dass ein grüner Cache-Treffer von vor der Änderung gemeldet wird. Die E2E-Suite bleibt draußen wie in den Paketen davor: 654 Playwright-Tests über drei Browser reißen die Zehn-Minuten-Grenze des Bash-Werkzeugs, und kein E2E-Test liest eine Log-Meldung des Kernels.
- Commit: `refactor(kernel): teardown steps share one guard, and the reference names both error contracts`
- Ergebnis: 1 Runde · der Optimierungspunkt »Ein gemeinsamer Guard-Helfer und ein Absatz, der die zwei Zusagen benennt« ist erledigt · `src/utils/runGuarded.ts` trägt die Abbauzusage an einer Stelle, die zwölf Handschriften in `Kernel.ts`, die eine in `Entity.ts` und die beiden `#runGuarded`-Methoden von `Entity` und `ShadowObjectCreationScope` gehen darüber; in `Kernel.ts` steht danach genau ein `logger.error`, der Lifecycle-Hook-Report · zwei Meldungswortlaute in die gemeinsame Form gebracht, die übrigen elf Zeichen für Zeichen unangetastet, keine bestehende Spec geändert · `docs/api-reference.md` hat den Abschnitt `Two error contracts` samt seiner drei Türen · Regressionstest `src/utils/runGuarded.spec.ts` mit drei Fällen, vor dem Fix rot gesehen (Modul fehlte, Import ungelöst) · Verify `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci` exit 0, 0 von 5 Test-Tasks aus dem Cache, Coverage 93,46 % Statements (Baseline 93,11 %) · Reviewer: kein kritischer, kein wichtiger Befund
- Klein, bewusst nicht behoben: `Kernel.ts:495` — der Kommentar sagt weiter »so this catch is a backstop«, wo jetzt der Guard-Aufruf steht; die Aussage bleibt richtig, das Wort zeigt auf kein Token mehr · `docs/api-reference.md:2622` — »No error reaches the caller« gilt für `destroyEntity()` absolut, während die ungeguardeten Schritte im `try`/`finally` (`off()`, `findShadowObjects()`) weiter durchschlagen · `docs/api-reference.md:2621` — »the other five throw what they caught« trifft nur `createEntity()`; `setParent()`, `changeToken()`, `changeProperties()` und `upgradeEntities()` fangen nichts, sie lassen durch · `CHANGELOG.md:417` — »The twelve hand-written guards in `Kernel.ts` … share it« steht im Präsens über einen Zustand, den die Änderung gerade aufgehoben hat
- Korrektur am Detailplan: Schritt 2 spricht von »sechsundzwanzig Aufrufstellen« der Methode `Entity.#runGuarded`; es sind zwölf. Die Zahl hat die Umsetzung nicht berührt — der Auftrag lautete, sie unangetastet zu lassen, und das ist geschehen.
- Nebenbefunde: keine — der Implementierer hat in den angefassten Nachbarschaften nichts gefunden, was nicht schon unter »Offene Befunde« steht
- Folgen: keine — was der Umbau umgeworfen hat, liegt in den acht committeten Dateien
- Schnittstellen: kein Export, keine Signatur und keine Konstante der öffentlichen Oberfläche hat sich bewegt. `runGuarded()` aus `packages/shadow-objects/src/utils/runGuarded.ts` ist intern: nicht aus `index.ts` re-exportiert, kein Eintrag in der `exports`-Map. Was ein Konsument davon sieht, sind vier Zeilen mehr in der veröffentlichten Dateiliste (`src/distContract.files.txt`, `src/utils/runGuarded.{d.ts,d.ts.map,js,js.map}`). Für ein späteres Paket an denselben Dateien: ein neuer Abbauschritt in `Kernel.ts`, `Entity.ts` oder `ShadowObjectCreationScope.ts` meldet über `runGuarded(logger, run, message, ...details)` statt über einen eigenen `try`/`catch`, und die Meldung führt erst den Text, dann die Identität, dann den Fehler. Die Zusage dahinter steht in `docs/api-reference.md` §»Two error contracts«.

### [x] 10. Die Registry merkt sich ihre Token-Auflösung

- Findings: PERF-001 (low)
- Ziel: `findTokensByRoute()` rechnet ein Ergebnis je Paar aus Route und Property-Menge einmal aus und verwirft den Vorrat, sobald sich der Inhalt der Registry ändert — belegt durch eine Messung vorher und nachher.
- Bereich: `packages/shadow-objects/src/in-the-dark/Registry.ts`
- Hängt ab von: —
- Hash: 60a8455
- Modell: stärkste Stufe (opus)
- Effort: medium
- Dateien: `packages/shadow-objects/src/in-the-dark/Registry.ts`, `packages/shadow-objects/src/in-the-dark/Registry.spec.ts`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`

**Der Abgleich.** PERF-001 nennt `Registry.ts:184-236`; die Datei hat heute 149 Zeilen, `findTokensByRoute()` steht auf `:80-121`, und die beschriebene Rechnung steht dort unverändert: ein `Set` und zwei Arrays je Aufruf, darunter die Fixpunktschleife mit ihrem `new Set(tokens)` je Durchgang (`:107-117`). Die Datei ist seit `8e0911b` unberührt, dieser Lauf hat sie nicht angefasst. Die Aufrufkette stimmt ebenfalls: `Kernel.changeProperties()` (`Kernel.ts:620`) → `#updateShadowObjects()` (`:664`) → `registry.findConstructors()` → `findTokensByRoute()`, dazu als zweiter Einstieg `#createShadowObjects()` (`Kernel.ts:835`). Der Befund existiert, in voller Länge.

**`Kernel.ts` fällt aus dem Bereich.** Der Grobplan führt die Datei mit, weil der Befund die Aufrufstelle nennt. Zu ändern ist dort nichts: der Kernel ruft, er rechnet nicht. `Entity.truthyProps()` hält seinen eigenen Vorrat (`Entity.ts:540-561`, verworfen von jedem Schreibkopf aus `getPropertyWriter()`), und das `new Set(...)` in `#updateShadowObjects()` ist eine Kopie über die fertige Konstruktorenliste, keine Suche. Was PERF-001 beschreibt, liegt vollständig in der Registry, und dort wird es behoben.

**Der Vorrat sitzt an der Token-Auflösung, nicht an den Konstruktoren.** Gemessen am gebauten Stand von `3dcc700`, Node v25.9.0, 200 000 Aufrufe je Messung, Median aus fünf Läufen:

| Aufruf | ohne Prop-Routen | mit Prop-Routen, 2 wahre Properties |
| --- | --- | --- |
| `findTokensByRoute()` | 247 ns | 2927 ns |
| `findConstructors()` | 383 ns | 3227 ns |

Die Suche trägt 64 % beziehungsweise 91 % der Kosten — der Fall, den der Befund beschreibt, ist der rechte. Der Zusammenbau der Konstruktorenliste bleibt deshalb je Aufruf stehen: `findConstructors()` gibt laut `docs/api-reference.md` ein Array heraus, das dem Aufrufer gehört, und ein zwischengespeichertes Array wäre eine zweite, ungefragte Änderung an einer zweiten öffentlichen Methode. Der Ziel-Korridor für das Paket sind die beiden Zeilen der oberen Reihe, nach unten gedrückt auf einen Map-Zugriff plus Schlüsselbau.

**Kein roter Testlauf vor dem Fix, und das ist kein Versäumnis.** PERF-001 ist kein Korrektheitsfehler; es gibt kein falsches Verhalten, das ein Test zuerst rot zeigen könnte. Die neuen Tests sichern die Invalidierung ab und sind vor der Änderung grün — ohne Vorrat kann nichts veralten. Der Nachweis dieses Pakets ist die Messung nachher, und sie gehört in den Report.

- Vorgehen:
  1. In `Registry.ts` neben `#routes` und `#truthyPropRoutes` zwei Felder anlegen:

     ```ts
     readonly #routingProps = new Set<string>();
     readonly #resolvedTokens = new Map<string, Map<string, Set<string>>>();
     ```

     `#routingProps` sammelt die Property-Namen, zu denen es überhaupt eine Routing-Regel gibt. Englischer Kommentar mit dem *Warum*: die Menge entscheidet allein darüber, wie fein der Schlüssel des Vorrats geschnitten wird, nie darüber, was eine Auflösung ergibt — deshalb darf sie zu groß sein, aber nie zu klein. Ein zu feiner Schlüssel spaltet Einträge, ein zu grober beantwortet zwei verschiedene Fragen mit einer Antwort.

     `#resolvedTokens` ist der Vorrat: außen die Route, innen der Schlüssel aus den Properties. Zwei Ebenen, damit der Routenname unverändert als Schlüssel taugt und nirgends maskiert werden muss.
  2. `appendRoute()` trägt im Prop-Routen-Zweig (`:54-60`) den Property-Namen nach: `this.#routingProps.add(propRoute.prop);` — in beiden Fällen, dem bereits bekannten wie dem neuen Eintrag. `clearRoute()` nimmt nichts wieder heraus; das ist die Über-Näherung aus Schritt 1 und gehört in den Kommentar dort, nicht in eine zweite Erklärung hier. `clear()` (`:142-146`) leert `#routingProps` mit.
  3. Einen privaten Helfer für das Verwerfen anlegen und aus allen vier Schreibwegen rufen — `define()`, `appendRoute()`, `clearRoute()`, `clear()`:

     ```ts
     #dropResolvedTokens() {
       this.#resolvedTokens.clear();
     }
     ```

     Englischer Kommentar: jeder Schreibvorgang verwirft den Vorrat, `define()` eingeschlossen, obwohl `define()` die Token-Auflösung selbst nicht bewegt. Kein Schreibweg muss dann wissen, welche Hälfte einer Auflösung er berührt, und geschrieben wird eine Registry beim Import eines Moduls, wo ein Neuaufbau nichts kostet.

     In `appendRoute()` steht der Aufruf am Ende der Methode und damit hinter beiden Zweigen — die Prop-Route und die gewöhnliche Route ändern beide, was eine Auflösung findet.

     Das Verwerfen ist re-entrancy-fest, und der Grund gehört in denselben Kommentar: `Map.clear()` lässt die Sets los, es leert sie nicht. Ein Shadow Object, das in seinem `[onCreate]` ein Modul importiert oder `shadowObjects.define()` ruft, verwirft damit den Vorrat, während `#createShadowObjects()` (`Kernel.ts:835`) noch über das Ergebnis derselben Auflösung läuft — und dieses Ergebnis bleibt gültig und vollständig.
  4. Den Schlüssel bauen:

     ```ts
     #resolutionKey(truthyProps: Set<string> | undefined): string {
       if (truthyProps === undefined || this.#routingProps.size === 0) return '';
       let key = '';
       for (const prop of truthyProps) {
         if (this.#routingProps.has(prop)) {
           key += `${prop.length}:${prop}`;
         }
       }
       return key;
     }
     ```

     Zwei Entscheidungen gehören als englischer Kommentar daneben, beide tragend:

     - **In der Reihenfolge des Aufrufers, nicht sortiert.** Die Reihenfolge der Properties bestimmt die Reihenfolge der Tokens im Ergebnis, und die wiederum die Reihenfolge, in der der Kernel die Shadow Objects baut. Nachgemessen am gebauten Stand von `3dcc700`, an einer Registry mit `foo → [bar]`, `@x → [xr]`, `@y → [yr]`, `bar@y → [by]`: `findTokensByRoute('foo', new Set(['x','y']))` gibt `foo bar xr yr by`, dieselbe Frage mit `new Set(['y','x'])` gibt `foo bar yr xr by`. Ein sortierter Schlüssel legte beide Fragen auf eine Antwort und änderte damit für eine von ihnen die Baureihenfolge. Ein Schlüssel in Aufruferreihenfolge kostet höchstens einen zweiten Eintrag und hält das Verhalten Zeichen für Zeichen.
     - **Jeder Name hinter seiner eigenen Länge.** Das macht den Schlüssel eindeutig: kein Property-Name kann die Grenze zwischen zwei anderen nachbilden. Ein Trennzeichen könnte das, sobald ein Name es selbst enthält.

     Der leere Schlüssel deckt beide Fälle, in denen keine Property mitspricht — kein `truthyProps` und keine Prop-Route in der Registry. Der zweite ist der Regelfall und kostet damit keinen Durchgang über die Properties.
  5. Die Auflösung selbst aus `findTokensByRoute()` in einen privaten Helfer ziehen und den Vorrat davorlegen:

     ```ts
     #resolveTokens(route: string, truthyProps?: Set<string>): Set<string> {
       const key = this.#resolutionKey(truthyProps);
       let byProps = this.#resolvedTokens.get(route);
       const known = byProps?.get(key);
       if (known !== undefined) return known;

       // ab hier der heutige Rumpf von findTokensByRoute(), `:81-118`, Zeile für Zeile
       // unverändert: von `const tokens = new Set<string>([route]);` bis zum
       // schließenden `}` des `if (truthyProps)`-Blocks. Das `return tokens;` auf `:120`
       // wandert nicht mit -- es steht unten, hinter dem Eintrag in den Vorrat.

       if (byProps === undefined) {
         byProps = new Map();
         this.#resolvedTokens.set(route, byProps);
       }
       byProps.set(key, tokens);
       return tokens;
     }
     ```

     Der Rumpf wird verschoben, nicht umgeschrieben: dieselbe Breitensuche, dieselbe Fixpunktschleife, dieselben Namen, dieselben Kommentare. Was dieses Paket schneller macht, ist, wie oft er läuft, nicht was er tut. Ein Diff, der innerhalb dieser Zeilen etwas ändert, ist ein Befund.
  6. Die beiden öffentlichen Türen darauf setzen:

     ```ts
     findTokensByRoute(route: string, truthyProps?: Set<string>): Set<string> {
       return new Set(this.#resolveTokens(route, truthyProps));
     }
     ```

     Englischer Kommentar dazu: der Vorrat hält genau ein Set je Frage, und was ein Aufrufer mit dem bekommt, was er bekommen hat, bleibt seine Sache — deshalb geht eine Kopie hinaus. `findConstructors()` liest über `#resolveTokens()` direkt und ohne Kopie; es iteriert nur (`:127-129`) und ist Teil derselben Klasse. Signaturen und Rückgabetypen beider Methoden bleiben unverändert.
  7. `Registry.spec.ts` erweitern. Die fünf vorhandenen Tests und der `clear()`-Block bleiben unangetastet — der `clear()`-Test (`:59-81`) fragt bereits zweimal dasselbe mit einem `clear()` dazwischen und ist damit von heute an auch der Test auf die Invalidierung. Neu, in einem `describe('token resolution is reused', …)`:
     - Nach einer Auflösung eine weitere Route an denselben Token hängen: die nächste Auflösung führt sie mit.
     - Nach einer Auflösung `clearRoute()` auf die genutzte Route: die nächste Auflösung kennt sie nicht mehr.
     - Nach einer Auflösung `define()` für einen der gefundenen Tokens: `findConstructors()` gibt den neuen Konstruktor heraus.
     - Dasselbe für eine Prop-Route: auflösen mit `new Set(['x'])`, dann `appendRoute('@x', […])`, erneut auflösen.
     - Das Ergebnis von `findTokensByRoute()` gehört dem Aufrufer: das zurückgegebene Set verändern (`add`/`delete`), erneut auflösen, das zweite Ergebnis ist unberührt.
     - Eine Property ohne Routing-Regel ändert nichts: `findTokensByRoute('foo', new Set(['x']))` und `findTokensByRoute('foo', new Set(['x', 'unrelated']))` liefern dasselbe. Er prüft die Zusage, nicht das Feld: `#routingProps` schneidet allein den Schlüssel, ein zu feiner Schnitt kostet Einträge und nie eine falsche Antwort, und damit ist das Feld von außen nicht beobachtbar.
     - Der Vorrat gibt dieselbe Antwort wie die Rechnung. Zwei Registries mit demselben Aufbau: die eine wird mit `new Set(['y','x'])` vorgewärmt und dann mit `new Set(['x','y'])` gefragt, die andere nur mit `new Set(['x','y'])`. `Array.from(…)` beider Antworten muss Element für Element gleich sein, Reihenfolge eingeschlossen. Kein Erwartungswert wird dabei hart hineingeschrieben — geprüft wird, dass der Vorrat keine Antwort auf eine andere Frage ausliefert. Der Aufbau muss dafür je Property eine eigene Route tragen (`@x` und `@y` auf verschiedene Tokens), sonst kann der Test nichts unterscheiden.
  8. `docs/api-reference.md`, Abschnitt `#### registry.findTokensByRoute(route, truthyProps?)` (`:3035`): einen Absatz hinter die vorhandene Beschreibung der Auflösungsregel. Er sagt drei Dinge und nicht mehr: die Auflösung wird je Route und je Menge der mitgegebenen wahren Properties einmal gerechnet und danach wiederverwendet; jeder Schreibvorgang an der Registry — `define()`, `appendRoute()`, `clearRoute()`, `clear()` — verwirft den Vorrat, eine Auflösung sieht also nie eine veraltete Registry; und das zurückgegebene `Set` gehört dem Aufrufer, der es behalten und verändern darf. Unter `#### registry.findConstructors(route, truthyProps?)` (`:3049`) ein Halbsatz, dass die Methode dieselbe Auflösung nutzt, ihre Konstruktorenliste aber je Aufruf zusammenstellt. Kein Wort über den Vorzustand, kein »bisher«.
  9. `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]` in den vorhandenen Abschnitt `### Internal` (`:415`): ein Eintrag in der Machart der Nachbarn, `**Internal (registry):**`. Er nennt den Vorrat, den Schlüssel aus Route und routenden Properties, die vier Schreibwege, die ihn verwerfen, und dass sich am Ergebnis und an seiner Reihenfolge nichts bewegt. Die Verhaltenszusage gehört dazu: das Ergebnis von `findTokensByRoute()` ist weiterhin ein frisches `Set` je Aufruf. Kein Eintrag im CHANGELOG des Repo-Roots — Build, Testrunner, Lint und Toolchain bleiben unberührt.
  10. Messung nachher. `pnpm -F @spearwolf/shadow-objects build`, danach das Skript aus dem Arbeitsverzeichnis erneut fahren, dieselben drei Zeilen wie in der Baseline. Beide Zahlenreihen gehören in den Report.
- Messung: `node /tmp/claude-1000/-home-spw-spaceland-shadow-objects/c98d644c-ffbb-4cdc-8ac8-2df06af05b1e/scratchpad/paket-10.bench.mjs` — läuft gegen `dist/src/in-the-dark/Registry.js`, braucht also einen Build und keine TS-Werkzeugkette. Das Szenario, falls die Datei nicht mehr liegt: eine Registry mit `game-object → [physics, renderer]`, `physics → [collider]`, `renderer → [material, geometry]` und einem Konstruktor je Token; für den zweiten Teil zusätzlich `@debug → [debug-overlay]`, `@shadow → [shadow-caster]`, `renderer@debug → [wireframe]`, `wireframe@shadow → [wire-shadow]`, `material@debug → [material-probe]`. Gemessen wird `findConstructors('game-object', truthyProps)` — der Weg, den der Kernel geht —, 200 000 Aufrufe, Median aus fünf Läufen nach 5000 Aufrufen Warmlauf. **Baseline an `3dcc700`, Node v25.9.0:** ohne Prop-Routen 442 ns je Aufruf · mit Prop-Routen und 2 wahren Properties 3304 ns · mit 6 wahren Properties 6465 ns.
- Nicht angefasst, geprüft:
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts`: siehe oben, der Kernel ruft nur.
  - `src/distContract.files.txt` und `src/distContract.package.json`: es entsteht keine neue Datei, alles bleibt in `Registry.ts`.
  - `packages/shadow-objects/README.md` und die übrigen Dateien unter `docs/`: sie nennen die Registry als Begriff, keine ihrer Methoden.
  - `src/index.ts`, `package.json` (`exports`, `sideEffects`): kein Export bewegt sich.
  - `AGENTS.md`: nennt die Registry als Konzept, keine Methode und keine Zusage über ihre Kosten.
  - `pnpm make:todo`: in `Registry.ts` steht kein `TODO`, und es kommt keines dazu.
  - `packages/shadow-objects-testing`, `packages/shadow-objects-e2e`, `packages/shae-offscreen-canvas`: keine von ihnen ruft `findTokensByRoute()`, `findConstructors()` oder `appendRoute()`; die Routen kommen über `importModule()` aus den Modul-Manifesten.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `lint:ci` fährt Biome mit `--error-on-warnings`; `noUnusedPrivateClassMembers` und die Formatierung der neuen Felder hängen daran. `TURBO_FORCE=true` wie in den Paketen davor, damit kein grüner Cache-Treffer von vor der Änderung als Ergebnis durchgeht. Die E2E-Suite bleibt draußen: 654 Playwright-Tests über drei Browser reißen die Zehn-Minuten-Grenze des Bash-Werkzeugs, und kein E2E-Test fragt die Registry direkt.
- Commit: `refactor(registry): the token resolution is computed once per route and property set`
- Ergebnis: 1 Runde · PERF-001 behoben · kein roter Testlauf vor dem Fix, weil das Paket keinen Korrektheitsfehler behebt; der Nachweis ist die Messung: `findConstructors('game-object', …)` fällt von 442/3304/6465 ns auf 169/411/418 ns (ohne Prop-Routen · 2 wahre Properties · 6 wahre Properties, Node v25.9.0, 200 000 Aufrufe, Median aus fünf Läufen) · acht neue Tests in `describe('token resolution is reused', …)` sichern die Invalidierung, `picks up a prop route appended after a resolution` per Gegenprobe rot gesehen · Verify exit 0, Coverage 93,5 % Statements gegen 93,11 % Baseline · zwei kleine Befunde bleiben stehen, beide reine Kommentar-Ungenauigkeiten am neuen Feld: `Registry.ts:117` sagt »Caller order costs at most a second entry«, was ab drei routenden Properties nicht mehr stimmt, und `Registry.ts:56` nennt den Schlüsselraum »routes times the permutations«, wo es geordnete Teilmengen sind (∑ C(n,k)·k!, für n=3 also 16 statt 6); die beiden widersprechen einander, das Verhalten berühren sie nicht
- Nebenbefunde: → Queue
- Folgen: keine — Signaturen und Rückgabetypen von `findTokensByRoute()` und `findConstructors()` stehen unverändert, kein Export bewegt sich, `dist/`-Dateiliste und `dist/package.json` bleiben gleich, `Kernel.ts` wurde nicht angefasst
- Schnittstellen: keine — kein Export, keine Signatur und keine Konstante hat sich bewegt. Für ein späteres Paket an `Registry.ts`: die Auflösung liegt jetzt im privaten `#resolveTokens(route, truthyProps?)`, das ein Set aus dem Vorrat `#resolvedTokens` liefert; `findTokensByRoute()` kopiert es, `findConstructors()` liest es direkt. Jeder Schreibweg — `define()`, `appendRoute()`, `clearRoute()`, `clear()` — ruft `#dropResolvedTokens()`; ein neuer Schreibweg tut dasselbe, sonst liefert die Registry eine Antwort von vorgestern. Der Schlüssel folgt der Aufruferreihenfolge der Properties, weil sie die Baureihenfolge der Shadow Objects bestimmt; wer ihn sortiert, legt zwei verschiedene Fragen auf eine Antwort.

**PERF-001 · low · packages/shadow-objects/src/in-the-dark/Registry.ts:184-236, gerufen aus Kernel.ts:601-604 über changeProperties()** — Die Token-Auflösung der Registry rechnet bei jeder Property-Änderung neu

findTokensByRoute() legt je Aufruf ein Set und mehrere Arrays an und läuft für die Prop-Routen eine Fixpunktschleife, die in jedem Durchgang ein new Set(tokens) über alle bisher gefundenen Tokens zieht; die Kosten wachsen mit Tokens mal wahren Properties. Kernel.changeProperties() ruft das über updateShadowObjects() bei jeder Property-Änderung jeder Entity, also im Takt der Change Trails und bei auto-sync="frame" im Takt der Bilder. Der Inhalt der Registry ändert sich dabei fast nie: define() und appendRoute() laufen beim Import eines Moduls, danach steht sie still. Gemessen wurde nichts, die Rechnung steht im Code.

Empfehlung: Das Ergebnis je Paar aus Route und Property-Menge in einer Map halten und die Map verwerfen, sobald define(), appendRoute(), clearRoute() oder clear() läuft; eine Zählvariable als Generationsstempel genügt. Vorher messen, damit der Cache eine Zahl hat, gegen die er sich rechtfertigt.

### [x] 11. Ein Sammler für die aufgeschobenen Mikrotasks

- Findings: Punkt »Die Mikrotask-Sammler über einen Kamm scheren« aus dem Optimierungspotenzial — dazu der Nebenbefund `ShaeElement.ts:14-29` aus »Offene Befunde«, den dieselbe Ursache erzeugt hat und den der gemeinsame Sammler mit dem Leeren-vor-der-Auslieferung erledigt
- Ziel: Die Frage, wann ein Sammler geleert wird und wer seine Auslieferung kapselt, wird einmal beantwortet und liegt in zwei Helfern unter `src/utils/`; die fünf handgebauten Muster gehen darüber, und die beiden Stellen, die heute anders antworten, kommen dabei in die Reihe.
- Bereich: `packages/shadow-objects/src/utils/`, `packages/shadow-objects/src/in-the-dark/Entity.ts`, `packages/shadow-objects/src/elements/ShaeElement.ts`, `packages/shadow-objects/src/elements/ShaeEntElement.ts`, `packages/shadow-objects/src/elements/ShaePropElement.ts`, `packages/shadow-objects/src/view/ComponentContext.ts`
- Hängt ab von: 1 (fasst `ComponentContext.ts` an), 9 (`runGuarded()` ist die Meldeform, die dieses Paket weiterträgt)
- Hash: 44e989b
- Modell: stärkste Stufe (opus)
- Effort: high
- Dateien: `packages/shadow-objects/src/utils/MicrotaskCollector.ts` (neu), `packages/shadow-objects/src/utils/MicrotaskCollector.spec.ts` (neu), `packages/shadow-objects/src/utils/MicrotaskGate.ts` (neu), `packages/shadow-objects/src/utils/MicrotaskGate.spec.ts` (neu), `packages/shadow-objects/src/in-the-dark/Entity.ts`, `packages/shadow-objects/src/elements/ShaeElement.ts`, `packages/shadow-objects/src/elements/ShaeEntElement.ts`, `packages/shadow-objects/src/elements/ShaePropElement.ts`, `packages/shadow-objects/src/view/ComponentContext.ts`, `packages/shadow-objects/src/distContract.files.txt`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`

**Der Abgleich: es sind fünf Stellen, nicht sechs, und sie zerfallen in zwei Formen.** Der Punkt nennt sechs; `DeferredTeardown` ist keine davon. Die Datei `elements/deferredTeardown.ts` steht seit `8e0911b` unverändert und stand schon zu `292714c` so da: sie *ist* die Extraktion ihrer Form, und `ShaeElement.ts:95` wie `ShaePropElement.ts:104` gehen bereits darüber. Was der Punkt als sechstes handgebautes Muster zählt, ist die Lösung des sechsten, nicht sein Problem. Bleiben fünf, und der Blick nebeneinander sortiert sie:

| Stelle | Heute | Zustand | Nutzlast | Geleert | Gekapselt |
| --- | --- | --- | --- | --- | --- |
| `Entity.ts:89-121` `deferContextValueUpdate` | Modul-Funktion über `WeakMap<Kernel, …>` | `collector.flushRequested` | `Map<Signal, {value,name,uuid}>` | **vor** der ersten Auslieferung (`:100-102`) | ja, `runGuarded` je Eintrag (`:110-115`) |
| `ShaeElement.ts:15-30` `syncShadowObjects` | Modulweit, ein Set für den ganzen Realm | `nextSyncIsScheduled` | `Set<NamespaceType>` | **hinter** der Schleife (`:27`) | nein |
| `ComponentContext.ts:613-681` `collectPeerReRequest` | Instanzfelder, Flush zusätzlich synchron aus `buildChangeTrails()` (`:697`) | `#peerReRequestFlushScheduled` | `Map<ViewComponent, unknown>` | **vor** der ersten Auslieferung (`:635-636`) | nein |
| `ShaeEntElement.ts:217-227` `#reSubscribeToViewComponent` | Instanzmethode, ein Aufrufer (`:300`) | `#reSubscribePending` (`:190`) | — | — | — |
| `ShaePropElement.ts:498-506` `#onReRequestHost` | Instanzfeld als Event-Listener | `#hostLookupPending` (`:436`) | — | — | — |

Die ersten drei tragen eine Nutzlast und liefern eine Menge aus. Die letzten beiden haben keine: ein Flag, ein `queueMicrotask`, eine Handlung. Beide Fragen des Punktes — vorher oder nachher leeren, Schleife kapseln oder nicht — stellen sich ausschließlich in der ersten Form. Deshalb zwei Helfer und nicht einer: ein Sammler, der beide Fragen beantwortet, und ein Tor, dem sie nicht gestellt werden. Ein einziger Helfer mit einem Options-Objekt beantwortete sie wieder je Aufrufstelle, nur eine Ebene tiefer.

**Zwei Stellen antworten heute abweichend, und beide kommen mit.** `ShaeElement.ts` leert hinter der Schleife und setzt sein Flag davor zurück: wirft `ShadowEnv.get(ns)?.sync()`, bricht die Schleife ab, `SyncNamespaces.clear()` (`:27`) läuft nie, `nextSyncIsScheduled` steht schon auf `false` (`:23`) — der nächste Durchgang synchronisiert die alten Namespaces mit. Genau das steht als Nebenbefund unter »Offene Befunde«; das Leeren-vor-der-Auslieferung im Helfer erledigt die eine Hälfte, der Guard die andere. `ComponentContext.ts` liefert ungekapselt aus, und dort schlägt es durch: `dispatchMessage()` (`:504`) geht über `ViewComponent.dispatchEvent()` auf eventize `emit()`, das synchron läuft und weiterwirft — ein Listener, der wirft, kostet die übrigen Runden derselben Auslieferung.

**Die Zusage, die dabei gilt, steht bereits in der Doku.** `docs/api-reference.md:154` schreibt sie für die Kontextwerte aus: »The hand-over then moves on: every other Entity waiting for a context value in the same round still gets it.« Das ist die Regel, die dieses Paket auf alle drei Sammler zieht — Einträge, die in derselben Task angekommen sind, sind voneinander unabhängig, und eine Auslieferung, die wirft, kostet sich selbst und nichts hinter sich. Gemeldet wird über `runGuarded()` aus Paket 9, damit die Meldungen im Projekt eine Form behalten; `runGuarded.ts` selbst und der Abschnitt §»Two error contracts« werden nicht angefasst.

**Was nicht mitkommt, und warum.** `deferredTeardown.ts` bleibt, wie es steht: es trägt ein `cancel()` und die Unterscheidung »gebucht« gegen »es fragt schon jemand«, die keiner der fünf braucht — ein `cancel()` an `#onReRequestHost` hieße, eine Host-Suche still fallen zu lassen. `ShadowEnv.sync()` (`ShadowEnv.ts:311-316`, `#syncIfScheduled` `:424-428`) ist dieselbe Form wie `DeferredTeardown` mit einem Flag statt zweien und hat mit `destroy()` (`:396`) ebenfalls einen Abbestellweg; sie steht im Punkt nicht, sie weicht von niemandem ab, und sie in `DeferredTeardown` zu ziehen verlangte eine Umbenennung dieser Klasse samt ihren zwei Nutzern. Die drei bleiben unberührt, und der Kommentar am Sammler verweist auf `DeferredTeardown` als die Form für eine Buchung, die sich abbestellen lässt — damit niemand eine vierte baut. Die reinen Aufschübe ohne Flag — `Kernel.ts:643`, `RemoteWorkerEnv.ts:316`, `ShadowEnv.ts:234`, `ShaeEntElement.ts:852`, `ShaePropElement.ts:526` — sind kein Sammler und keine Dublette.

**Kein Verhalten bewegt sich außer an den zwei genannten Stellen.** Das ist der Prüfstein für das Review: fünf Umbauten, und nur `ShaeElement` (Leeren und Guard) und `ComponentContext` (Guard) dürfen sich anders verhalten als vorher. Überall sonst ist ein Unterschied ein Befund.

- Vorgehen:
  1. `packages/shadow-objects/src/utils/MicrotaskCollector.ts` anlegen:

     ```ts
     /**
      * Collects what is written in one task and hands it over a microtask later, in one batch.
      *
      * A second value for the same key replaces the one waiting, so a key written twice in a task
      * reaches the delivery once, with the value that stood at the end of it.
      *
      * Two rules live here so that no site has to decide them again:
      *
      * The batch is taken out and emptied **before** the first delivery. A delivery can write to
      * this collector -- a reader of a context value writes a context of its own, an entity that
      * arrives while a round goes out asks for a round -- and that write belongs to the round
      * behind this one rather than to the batch being walked. Emptying afterwards would also lose
      * the batch to a delivery that throws: the flag is already down by then, so the next write
      * queues a fresh microtask and hands the stale entries over a second time.
      *
      * Every delivery a site makes runs under `runGuarded()`. Entries that arrived in the same
      * task are independent of one another, and one that fails costs itself and nothing behind it
      * -- the promise `docs/api-reference.md` already spells out for context values. What counts
      * as one delivery is the site's to say: `Entity` delivers per entry, `ComponentContext`
      * groups its senders into rounds first and delivers per round.
      *
      * For a booking that has to be callable off again, see {@link DeferredTeardown}; for a single
      * deferred action without a batch, {@link MicrotaskGate}.
      */
     export class MicrotaskCollector<K, V = undefined> {
       #entries = new Map<K, V | undefined>();
       #scheduled = false;
       readonly #deliver: (entries: Map<K, V | undefined>) => void;

       constructor(deliver: (entries: Map<K, V | undefined>) => void) {
         this.#deliver = deliver;
       }

       /** Put an entry into the batch and make sure someone comes to fetch it. */
       add(key: K, value?: V): void {
         this.#entries.set(key, value);

         if (this.#scheduled) return;
         this.#scheduled = true;

         queueMicrotask(() => this.flush());
       }

       /**
        * Hand the batch over now.
        *
        * For a caller that needs the batch delivered at a point of its own choosing rather than
        * whenever the microtask comes round. A queued microtask that finds nothing left returns
        * without a delivery, so an early flush costs nothing but the ordering it was asked for.
        */
       flush(): void {
         this.#scheduled = false;

         if (this.#entries.size === 0) return;

         const entries = this.#entries;
         this.#entries = new Map();

         this.#deliver(entries);
       }
     }
     ```

     Die Kommentare oben sind der Inhalt dieses Pakets und gehören so hinein — sie sind die »festgelegte Antwort«, von der der Punkt spricht. Der Wortlaut darf verbessert werden, die drei Aussagen nicht: leeren vor der Auslieferung, Guard je Auslieferungseinheit, Einheit gehört der Aufrufstelle.
  2. `packages/shadow-objects/src/utils/MicrotaskGate.ts` anlegen:

     ```ts
     /**
      * Runs one action a microtask after it was asked for, however often it is asked for.
      *
      * The flag falls before the action rather than behind it: an action that asks again books a
      * fresh round instead of writing into a flag the line behind it would clear.
      *
      * No batch and no guard: there is one action, so there are no neighbours a failure could cost
      * -- what it throws goes where an uncaught microtask goes. A gate that carries entries is
      * {@link MicrotaskCollector}, a booking that can be called off again is
      * {@link DeferredTeardown}.
      */
     export class MicrotaskGate {
       #scheduled = false;
       readonly #run: () => void;

       constructor(run: () => void) {
         this.#run = run;
       }

       /** Ask for the action. */
       schedule(): void {
         if (this.#scheduled) return;
         this.#scheduled = true;

         queueMicrotask(() => {
           this.#scheduled = false;
           this.#run();
         });
       }
     }
     ```
  3. **Zuerst rot:** `MicrotaskCollector.spec.ts` und `MicrotaskGate.spec.ts` anlegen und laufen lassen, **bevor** die beiden Module aus Schritt 1 und 2 stehen — der rote Lauf ist dann der ungelöste Import, wie bei `runGuarded.spec.ts` in Paket 9. Die Ausgabe des roten Laufs gehört in den Report. Fälle am Sammler:
     - Zwei `add()` in derselben Task ergeben eine Auslieferung mit zwei Einträgen.
     - Derselbe Schlüssel zweimal: ein Eintrag, der zweite Wert.
     - Der Stapel ist beim Betreten der Auslieferung leer: ein `add()` aus der Auslieferung heraus landet in der nächsten Runde und nicht in der laufenden.
     - Eine Auslieferung, die wirft, lässt keinen Eintrag stehen: danach ein weiteres `add()`, und die zweite Auslieferung sieht ausschließlich den neuen Eintrag. Das ist der Fall, an dem `ShaeElement` heute scheitert.
     - `flush()` von Hand liefert sofort aus; die eingestellte Mikrotask liefert danach nicht ein zweites Mal aus.
     - `flush()` auf einem leeren Sammler ruft die Auslieferung nicht.

     Am Tor: mehrere `schedule()` in einer Task ergeben einen Lauf; ein `schedule()` aus der Handlung heraus ergibt einen zweiten Lauf in der nächsten Runde.
  4. `Entity.ts` auf den Sammler ziehen. `IContextValueCollector` (`:58-61`) entfällt, `contextValueCollectors` wird zu `WeakMap<Kernel, MicrotaskCollector<Signal<unknown>, IDeferredContextValue>>`. Der Doc-Kommentar auf `:63-72` (»one collector per kernel«) bleibt Wort für Wort stehen — er begründet den Schlüssel der WeakMap, nicht die Mechanik. `collectorOf()` baut den Sammler mit der Auslieferung:

     ```ts
     collector = new MicrotaskCollector<Signal<unknown>, IDeferredContextValue>((contextValues) => {
       for (const [contextSignal, entry] of contextValues) {
         runGuarded(
           kernel.logger,
           () => contextSignal.set(entry!.value),
           `an effect of a context value failed (${String(entry!.name)}):`,
           entry!.uuid,
         );
       }
     });
     ```

     `deferContextValueUpdate()` schrumpft auf `collectorOf(kernel).add(signal, {value: val, name, uuid})`. Der Doc-Kommentar auf `:84-88` bleibt. Die beiden Kommentare, die jetzt der Helfer trägt — `:100-101` (»Taken out and emptied before the first write«) und `:107-110` (der Grund für den Guard) —, wandern nicht mit: der erste steht im Helfer, vom zweiten bleibt am Aufruf höchstens ein Halbsatz, dass die Einheit hier der einzelne Kontextwert ist. Kein Rückblick auf den Vorzustand.

     Zum `!`: `MicrotaskCollector<K, V>` gibt `Map<K, V | undefined>` heraus, weil `add()` den Wert optional nimmt. Wo eine Aufrufstelle immer einen Wert mitgibt, ist der Nicht-Null-Zugriff korrekt und braucht keinen Kommentar. Findet der Implementierer eine Typformulierung, die das ohne `!` trägt und die Aufrufe von `ShaeElement` ohne Wert weiter zulässt, ist sie die bessere — das ist ausdrücklich freigestellt.
  5. `ShaeElement.ts` auf den Sammler ziehen. `SyncNamespaces` und `nextSyncIsScheduled` (`:15-16`) entfallen, dafür auf Modulebene:

     ```ts
     const logger = new ConsoleLogger('ShaeElement');

     const syncCollector = new MicrotaskCollector<NamespaceType>((namespaces) => {
       for (const ns of namespaces.keys()) {
         runGuarded(logger, () => ShadowEnv.get(ns)?.sync(), 'a namespace could not be synced:', ns);
       }
     });

     const syncShadowObjects = (ns: NamespaceType) => {
       syncCollector.add(ns);
     };
     ```

     Der Sammler bleibt modulweit und wird nicht je Element oder je Namespace angelegt: der Schlüssel *ist* der Namespace, `ShadowEnv.get(ns)` löst ihn realmweit auf, und zwei Umgebungen im selben Realm können sich hier — anders als bei den Kontextwerten — nichts wegnehmen. Der Import von `ConsoleLogger` kommt aus `../utils/ConsoleLogger.js`, der Name `'ShaeElement'` folgt den drei Nachbarn (`ShaePropElement.ts:90`, `ShaeEntElement.ts:143`, `ShaeWorkerElement.ts:59`).
  6. `ComponentContext.ts` auf den Sammler ziehen. `#pendingPeerReRequests` (`:587`) und `#peerReRequestFlushScheduled` (`:589`) entfallen, dafür ein Feld `#peerReRequests = new MicrotaskCollector<ViewComponent, unknown>((pending) => this.#deliverPeerReRequests(pending))`. Der Doc-Kommentar über den Feldern bleibt.

     `collectPeerReRequest()` (`:613-621`) schrumpft auf `this.#peerReRequests.add(sender, data)`; sein langer Doc-Kommentar mit der Messreihe bleibt Zeichen für Zeichen stehen. `#flushPeerReRequests()` (`:624`) wird zu `#deliverPeerReRequests(pending: Map<ViewComponent, unknown>)`: die ersten Zeilen — Flag zurücksetzen, Größe prüfen, Map herausnehmen und ersetzen (`:626-637`) — entfallen, weil der Helfer sie trägt; der Kommentar auf `:632-634` geht mit ihnen. Alles ab `const rounds = …` bleibt unverändert, Kommentare eingeschlossen.

     Der einzige Zusatz ist der Guard um die Auslieferungsschleife (`:667-680`):

     ```ts
     for (const [parent, round] of rounds) {
       runGuarded(
         this.#logger,
         () => { /* der heutige Rumpf der Schleife, unverändert */ },
         'a peer re-request round could not be delivered:',
         parent?.uuid ?? 'roots',
       );
     }
     ```

     Englischer Kommentar mit dem *Warum* und mit der Grenze: die Einheit ist die Runde und nicht die einzelne Nachricht, weil eine Runde über die Wurzeln in `dispatchReRequestParentRoots()` (`:520-525`) als ein Aufruf hinausgeht und diese Methode zwei weitere Aufrufer hat, die zu diesem Paket nicht gehören. Eine Runde, die wirft, kostet den Rest dieser Runde und keine andere.

     Der synchrone Aufruf aus `buildChangeTrails()` (`:697`) wird `this.#peerReRequests.flush();`. Der Kommentar darüber bleibt.
  7. `ShaeEntElement.ts` auf das Tor ziehen. `#reSubscribePending` (`:190`) entfällt, an seiner Stelle steht das Tor mit dem Doc-Kommentar, der heute über der Methode steht (`:211-216`) — er erklärt, warum gewartet wird, und ist der Teil, der nirgendwo sonst steht:

     ```ts
     readonly #reSubscribe = new MicrotaskGate(() => {
       this.#reSubscribe$.set(this.#reSubscribe$.value + 1);
     });
     ```

     Die Methode `#reSubscribeToViewComponent()` (`:217-227`) entfällt ganz; ihr einziger Aufrufer (`:300`) wird `on(vc, ViewComponent.Destroyed, () => this.#reSubscribe.schedule())`.
  8. `ShaePropElement.ts` auf das Tor ziehen. `#hostLookupPending` (`:436`) wird ersetzt durch das Tor, und zwar **an genau dieser Zeile**, im Feldblock `:434-436` und nicht oben bei den übrigen Feldern:

     ```ts
     readonly #hostLookup = new MicrotaskGate(() => {
       if (this.isConnected) {
         this.#findEntNode();
       }
     });
     ```

     `#onReRequestHost` (`:498-506`) schrumpft auf `#onReRequestHost = () => { this.#hostLookup.schedule(); };` und bleibt ein Instanzfeld — die Funktionsidentität trägt `addEventListener`/`removeEventListener` (`:516`, `:521`). Der lange Kommentarblock über `#onReRequestHost` (`:478-497`) bleibt vollständig stehen; nur der letzte Absatz nennt danach den neuen Namen statt `#hostLookupPending`.

     **Die Zeile bleibt, wo sie ist, mit Absicht.** Paket 12 räumt die drei verirrten Felder dieser Klasse an einem Stück nach oben; ein Paket, das eines davon vorwegnimmt, lässt zwei stehen und macht aus einer Aufräumarbeit zwei halbe.
  9. `src/distContract.files.txt`: acht Zeilen, sortiert zwischen `src/utils/FrameLoop.js.map` und `src/utils/array-utils.d.ts` (ASCII-Sortierung, Großbuchstaben vor Kleinbuchstaben):

     ```
     src/utils/MicrotaskCollector.d.ts
     src/utils/MicrotaskCollector.d.ts.map
     src/utils/MicrotaskCollector.js
     src/utils/MicrotaskCollector.js.map
     src/utils/MicrotaskGate.d.ts
     src/utils/MicrotaskGate.d.ts.map
     src/utils/MicrotaskGate.js
     src/utils/MicrotaskGate.js.map
     ```

     `src/distContract.package.json` bleibt unberührt: kein Export bewegt sich, `sideEffects` und die `exports`-Map ändern sich nicht. Nach dem Build gegenprüfen mit `find packages/shadow-objects/dist -type f | sort`.
  10. `docs/api-reference.md`, Zeile 1852, Tabellenzeile `syncShadowObjects()`: hinter »The call is collected per namespace and carried out one microtask later, so calling it more than once in a task costs one sync.« ein Halbsatz, dass ein Namespace, dessen Sync fehlschlägt, nur sich selbst kostet und über den `ConsoleLogger` gemeldet wird — die übrigen der Runde werden trotzdem synchronisiert. Sonst nichts. Zeile 1999 (`<shae-ent>`) verweist auf `ShaeElement` und bleibt. Zeile 154 (Kontextwerte) steht bereits richtig und wird nicht angefasst. Zum `ComponentContext` kein Wort: `collectPeerReRequest` ist `@internal`, die Zusage nach außen ist »eine Runde je Task«, und die bewegt sich nicht.
  11. `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]` in den vorhandenen Abschnitt `### Internal`, in der Machart der Nachbarn: `**Internal (utils):**`. Er nennt die beiden Helfer, die fünf Stellen, die darüber gehen, die beiden Regeln (leeren vor der Auslieferung, Guard je Auslieferungseinheit) und die zwei Stellen, an denen sich damit ein Verhalten bewegt — `syncShadowObjects()` verliert einen fehlgeschlagenen Namespace nicht mehr an die übrigen, und eine Peer-Runde, deren Listener wirft, kostet die übrigen Runden nicht mehr. Kein Eintrag im CHANGELOG des Repo-Roots — Build, Testrunner, Lint und Toolchain bleiben unberührt.
  12. `pnpm make:todo` wird nicht gebraucht: in keiner der neun Dateien steht ein `TODO`, und es kommt keines dazu. Kommt doch eines hinein, dann mit dem Lauf.
  13. Beim Fortschreiben des Plans in Zug 5: der Eintrag `packages/shadow-objects/src/elements/ShaeElement.ts:14-29` unter »Offene Befunde« geht mit diesem Commit von `[ ]` auf `[x]` und bekommt den Kurzhash dahinter. Er ist mit dem Paket erledigt, und ein Eintrag, der stehen bleibt, hält den Abschluss auf.
- Nachweis: der rote Lauf aus Schritt 3 (die beiden neuen Spec-Dateien gegen fehlende Module). Dazu, wenn die Naht es hergibt, ein Fall in `packages/shadow-objects-testing`, der die Verhaltensänderung an `ShaeElement` von außen zeigt: zwei Namespaces, der `sync()` des einen wirft, der andere wird trotzdem synchronisiert, und eine dritte Runde synchronisiert die beiden ersten nicht noch einmal. Eine lebende `ShadowEnv` ist nicht eingefroren — `Object.freeze(this)` steht in `destroy()` (`ShadowEnv.ts:425`) —, ein `env.sync` lässt sich also für den Test ersetzen. Trägt die Naht das nicht, gehört das als Abweichung mit Grund in den Report und nicht ins Schweigen.
- Nicht angefasst, geprüft:
  - `packages/shadow-objects/src/elements/deferredTeardown.ts`: siehe oben — bereits die Extraktion seiner Form, mit `cancel()` und zwei Flags, die keiner der fünf braucht.
  - `packages/shadow-objects/src/view/ShadowEnv.ts`: `#syncScheduled` ist die Form von `DeferredTeardown` mit einem Flag; sie weicht von niemandem ab, und ein Umbau verlangte eine Umbenennung von `DeferredTeardown` samt seinen zwei Nutzern.
  - `packages/shadow-objects/src/utils/runGuarded.ts` und `docs/api-reference.md` §»Two error contracts«: die Meldeform wird benutzt, nicht geändert.
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts:643`, `view/RemoteWorkerEnv.ts:316`, `view/ShadowEnv.ts:234`, `elements/ShaeEntElement.ts:852`, `elements/ShaePropElement.ts:526`: reine Aufschübe ohne Flag und ohne Sammlung.
  - `src/index.ts`, `package.json` (`exports`, `sideEffects`), `src/distContract.package.json`: beide Helfer sind intern, kein Export bewegt sich.
  - `packages/shadow-objects/README.md` und die übrigen Dateien unter `docs/`: `README.md:73`, `cheat-sheet.md:239-304` und `api-reference.md:877`, `:1872` beschreiben Abbau- und Re-Request-Zeiten, die sich nicht bewegen.
  - `AGENTS.md`: nennt weder die Sammler noch die Elementzeiten.
  - `packages/shae-offscreen-canvas`, `packages/shadow-objects-e2e`: keine Aufrufstelle der fünf Muster; die E2E-Suite fährt sie über die Elemente mit, und dort ändert sich nichts.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `lint:ci` fährt Biome mit `--error-on-warnings`; an `noUnusedPrivateClassMembers` hängt, ob wirklich jedes alte Flag verschwunden ist. `TURBO_FORCE=true` wie in den Paketen davor, damit kein grüner Cache-Treffer von vor der Änderung durchgeht. Das eigentliche Netz dieses Pakets ist `packages/shadow-objects-testing`: `ent-element-peer-round.test.js` fährt die Runden aus `ComponentContext`, `ent-element-teardown.test.js`, `ent-element-namespace.test.js`, `ent-element-events.test.js`, `prop-element-host.test.js` und `prop-element-lifecycle.test.js` fahren die Elementzeiten in echtem Chromium. Die E2E-Suite bleibt draußen: 654 Playwright-Tests über drei Browser reißen die Zehn-Minuten-Grenze des Bash-Werkzeugs.
- Commit: `refactor(utils): deferred collectors empty before they deliver, and every delivery stands behind a guard`
- Ergebnis: 1 Runde · der Punkt »Die Mikrotask-Sammler über einen Kamm scheren« ist erledigt — `MicrotaskCollector` und `MicrotaskGate` liegen unter `src/utils/`, alle fünf Stellen gehen darüber (`Entity.ts:74`, `ShaeElement.ts:26`, `ComponentContext.ts:589`, `ShaeEntElement.ts:198`, `ShaePropElement.ts:437`) · der Nebenbefund `ShaeElement.ts:14-29` ist mit erledigt · Regressionstests: die beiden Unit-Specs `MicrotaskCollector.spec.ts` und `MicrotaskGate.spec.ts` (vor der Umsetzung rot am ungelösten Import) und `ent-element-sync-round.test.js` »a namespace whose sync throws costs itself and no other namespace of the round« (gegen das gebaute `dist/` des Vorzustands rot: nur `sync-round-a` synchronisiert, zwei unbehandelte Fehler) · aus der Fehlerkette dazu `ent-element-peer-round.test.js` »a round whose receiver throws costs the rest of that round and no other round«, vom Reviewer gegen einen Stand mit einem einzigen Guard um die ganze Schleife gegengeprüft und dort rot · Verify `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci` exit 0, 0 von 5 Test-Tasks aus dem Cache, Coverage 93,52 % Statements (Baseline 93,11 %) · klein und offen geblieben: `CHANGELOG.md:417` nennt `MicrotaskCollector` »for a batch with a payload«, während der Sammler in `ShaeElement` ein `MicrotaskCollector<NamespaceType>` ohne Wert ist und trotzdem zu den drei Batch-Stellen zählt
- Nebenbefunde: → Queue (`ComponentContext.ts:517`)
- Folgen: keine — die zwei Doku-Stellen, die der Umbau überholt hat (`shadow-objects-e2e/TEST-PLAN.md:169` und der Kommentar `ShaeEntElement.ts:270`, beide nannten `SyncNamespaces` und `nextSyncIsScheduled`), sind im Commit mitgezogen
- Schnittstellen: kein Export, keine Signatur und keine Konstante der öffentlichen Oberfläche hat sich bewegt; beide Helfer sind intern (nicht in `index.ts`, kein Pfad der `exports`-Map). Was ein Konsument sieht, sind acht Zeilen mehr in `src/distContract.files.txt` (`src/utils/MicrotaskCollector.{d.ts,d.ts.map,js,js.map}` und dieselben vier für `MicrotaskGate`). Für ein späteres Paket an diesen Dateien: ein aufgeschobener Sammelvorgang wird über `new MicrotaskCollector<K, V>(deliver)` mit `add(key, value)` und `flush()` gebaut, eine aufgeschobene Einzelhandlung über `new MicrotaskGate(run)` mit `schedule()`; wer eine Buchung braucht, die sich abbestellen lässt, nimmt `DeferredTeardown`. Der Sammler typisiert `add()` über `type AddArgs<K, V> = undefined extends V ? [key: K, value?: V] : [key: K, value: V]`, die Auslieferung bekommt also `Map<K, V>` ohne `undefined`. Zwei Verhaltenszusagen hängen jetzt daran: `syncShadowObjects()` verliert die übrigen Namespaces einer Runde nicht mehr an einen, dessen Sync wirft, und behält keinen für die Runde dahinter; eine Peer-Runde, deren Listener wirft, kostet den Rest dieser Runde und keine andere. In `ShaeEntElement` heißt das Tor `#reSubscribe` (die Methode `#reSubscribeToViewComponent()` gibt es nicht mehr), in `ShaePropElement` `#hostLookup` an der Zeile des alten Flags

**Optimierungspotenzial · »Die Mikrotask-Sammler über einen Kamm scheren«** (`./audit.html`, ohne ID und ohne Status-Feld, gelesen gegen `292714c`)

Sechs Stellen bauen dasselbe Muster von Hand: ein Flag, ein queueMicrotask, eine Flush-Schleife. Entity.deferContextValueUpdate, ShaeElement.syncShadowObjects, ComponentContext.collectPeerReRequest, ShaeEntElement.#reSubscribeToViewComponent, ShaePropElement.#onReRequestHost und DeferredTeardown. Sie unterscheiden sich in Kleinigkeiten, die man erst beim Nebeneinanderlegen sieht — wer leert vor dem ersten Schreibvorgang, wer danach, wer kapselt die Schleife —, und genau diese Kleinigkeiten sind es, die einen davon zu einem Befund dieses Reports machen. Ein gemeinsamer Helfer mit einer festgelegten Antwort auf beide Fragen macht aus sechs Einzelentscheidungen eine, die einmal geprüft wird.

### [x] 12. Kosmetik: ein toter Wert, ein ungedeckter Block, drei verirrte Felder

- Findings: CLEAN-004 (info), CLEAN-005 (info), CLEAN-011 (info)
- Ziel: Die Bildrate kommt aus einer Quelle, der bereitgestellte Kontext wird an einer Stelle geräumt und dort auch geprüft, und der Zustand von `ShaePropElement` steht in einem Block.
- Bereich: `packages/shae-offscreen-canvas/src/shadow-objects/`, `packages/shadow-objects/src/elements/ShaePropElement.ts`
- Hängt ab von: 11 (erledigt, `44e989b`)
- Hash: 752dfb5
- Modell: mittlere Stufe
- Effort: medium — die Schritte sind auf Zeile und Wert genau, aber die zwei Streichungen hängen an einer Kette durch `ShadowObjectCreationScope.#provideContextSignal` (`:565-570`), und der Reviewer ist der, der sie abgehen muss. Er erbt diesen Wert.
- Aus Paket 11 (Zug 0): CLEAN-011 zählt `#hostLookupPending` als drittes der drei verirrten Felder. Paket 11 ersetzt es an derselben Zeile durch `readonly #hostLookup = new MicrotaskGate(…)` und lässt es dort ausdrücklich stehen, damit dieses Paket alle drei an einem Stück nach oben zieht — der Feldblock behält Stelle und Länge, nur der dritte Name lautet anders.
- Abgleich (2026-08-28, jede Fundstelle gelesen):
  - **CLEAN-004** unverändert an der genannten Stelle: `CanvasRenderingContext.js:29-31`. Nachgesehen, worauf sich die Empfehlung stützt: `clearOnDestroy` steht in `ShadowObjectCreationScope.#provideContextSignal` auf `opts?.clearOnDestroy ?? true` (`:565`) und bucht `ctxProvider.set(undefined)` in `#unsubscribeSecondary` (`:566-569`). `provideContext(contextName)` (`:12`) übergibt keine Optionen, der Kernel räumt also ohnehin. Der explizite Block läuft aus `#unsubscribePrimary` eine Schleife früher und schreibt denselben Wert auf dasselbe Signal. Die Spec des Pakets (`CanvasRenderingContext.spec.js`, 257 Zeilen, 8 Fälle) hat keinen Abbaufall — das ist die zweite Hälfte des Befunds und wird hier mit erledigt.
  - **CLEAN-005** unverändert: `ShaeOffscreenCanvas.js:26` trägt `new FrameLoop(90)`, der Effekt auf `:76-78` schreibt `getFps() ?? 60` und läuft noch während der Konstruktion. Der Kontrastwert 90 steht im Kommentar der Spec auf `:322-325`.
  - **CLEAN-011** verschoben: der Feldblock liegt heute auf `:435-441` statt `:434-436`, weil Paket 11 das Flag durch das Tor ersetzt hat. Die drei Namen sind `#reportedMissingHost`, `#reRequestHostTarget`, `#hostLookup`.
- Triage (2026-08-28):
  - Offene `Folgen:` gibt es keine — alle elf erledigten Pakete melden »keine«.
  - Aus »Offene Befunde« übernimmt dieses Paket nichts. Vierzehn Einträge stehen offen; keiner teilt eine Ursache mit diesem Paket. Die beiden nächstliegenden sind ausdrücklich geprüft und bleiben liegen: `Registry.ts:41`/`:59` (ein geschriebenes und nie gelesenes Feld) ist wie CLEAN-005 ein toter Wert, aber ein zweiter, unabhängiger — dieselbe Sorte Nachlässigkeit ist keine gemeinsame Ursache, und das Paket fasst `Registry.ts` nicht an; `ShadowObjectCreationScope.ts:769` betrifft `onDestroy`, aber einen Cleanup, der während des Abbaus einen weiteren bucht, und nicht eine Räumung, die der Kernel schon fährt. Beide bleiben für die Drain-Runde des Abschlusses.
  - **Neu und in dieses Paket aufgenommen:** `ShaeOffscreenCanvas.js:51` — `offscreenCanvas$.set(undefined)` im `onDestroy`-Block dubliert dieselbe `clearOnDestroy`-Zusage wie CLEAN-004, im selben Paket und in der Datei, die dieses Paket für CLEAN-005 ohnehin öffnet. Vorbestehend (`git show 8e0911b:…` zeigt die Zeile wortgleich), geschätzt info. Es ist nicht die Scope-Regel, die ihn hereinholt, sondern die Ursache: `provideContext(CanvasContext)` zwei Zeilen darüber (`:47`) verlässt sich bereits auf den Kernel, `provideContext(OffscreenCanvasContext, this)` (`:48`) nicht, und CLEAN-004 zu beheben, während dieselbe Dublette drei Dateien weiter stehen bleibt, macht aus einer Regel eine Laune. Drei Fundstellen einer Ursache sind ein Paket.
- Dateien:
  - `packages/shae-offscreen-canvas/src/shadow-objects/CanvasRenderingContext.js`
  - `packages/shae-offscreen-canvas/src/shadow-objects/CanvasRenderingContext.spec.js`
  - `packages/shae-offscreen-canvas/src/shadow-objects/ShaeOffscreenCanvas.js`
  - `packages/shae-offscreen-canvas/src/shadow-objects/ShaeOffscreenCanvas.spec.js`
  - `packages/shadow-objects/src/elements/ShaePropElement.ts`
- Vorgehen:
  1. **Erst das Netz, dann die Streichung.** In `CanvasRenderingContext.spec.js`, im Block `describe('shared behaviour')`, direkt hinter `it('clears its context once the canvas disappears', …)` (endet auf `:211`) einen Fall einziehen:

     ```js
     it('gives its context back when the shadow object leaves the entity', async () => {
       const {host, child} = await setup();

       const ctx = {mark: 'ctx'};
       host.canvas$.set({getContext: () => ctx});
       await settle();
       expect(child.useContext(CanvasRenderingContext2D)()).toBe(ctx);

       // A token change is the teardown path on which the entity lives on, so its context signal
       // is still there to be read afterwards. Destroying the entity would tear down the reader
       // along with the provider and leave nothing to assert against.
       env.kernel.changeToken(child.uuid, 'plainChild');
       await settle();

       expect(child.useContext(CanvasRenderingContext2D)()).toBeUndefined();
     });
     ```

     `plainChild` ist bewusst kein registriertes Token — der Kernel baut daraus eine Entity ohne Shadow Objects; dieselbe Machart nutzt `ShaeOffscreenCanvas.spec.js:533`. `setup()` (`:126-140`) liefert `child` bereits als Entity, `child.uuid` steht also zur Verfügung. `changeToken` ist der Weg, den `Kernel.spec.ts:603` für genau diese Zusage fährt.

     **Der Fall ist grün, bevor Schritt 2 läuft, und bleibt es danach.** Das ist kein Regressionstest und wird auch nicht als einer ausgegeben: dieses Paket behebt keinen Korrektheitsfehler, es schließt eine Deckungslücke, die der Report benennt. Ein roter Lauf ist hier nicht zu haben und wird nicht inszeniert.
  2. `CanvasRenderingContext.js`: die Zeilen `29-31` samt der Leerzeile davor streichen. `onDestroy` verliert damit seinen einzigen Aufrufer in dieser Datei und fällt aus der Destrukturierung in der Konstruktorsignatur (`:6`) heraus — `{useContext, provideContext, createEffect}` bleibt übrig. Kein Kommentar an die Leerstelle: es steht dort nichts mehr, was ein Warum bräuchte, und ein Satz über eine gestrichene Zeile ist der Rückblick, den die Konventionen ausschließen.
  3. `ShaeOffscreenCanvas.js`: Zeile `51` (`offscreenCanvas$.set(undefined);`) samt der folgenden Leerzeile streichen. Der Rest des `onDestroy`-Blocks (`:53-62`) bleibt Zeichen für Zeichen stehen — Frame-Loop und View-Kanal sind echte Aufräumarbeit und werden von keinem Kernel-Standard gedeckt. Gedeckt ist die Streichung durch `ShaeOffscreenCanvas.spec.js:526` »stops the loop and clears the contexts a child reads«, das nach `destroyEntity` sowohl `CanvasContext` als auch `OffscreenCanvasContext` auf `undefined` prüft; der Fall läuft vor und nach der Streichung grün, und dass er es tut, ist der Beleg. Beobachtet der Implementierer etwas anderes, ist das ein Befund und gehört in den Report, nicht in eine Anpassung des Tests.
  4. `ShaeOffscreenCanvas.js:26`: `#frameLoop = new FrameLoop(90);` wird `#frameLoop = new FrameLoop();`. Der Parameter fällt weg statt auf 60 zu wandern, und der Grund steht im Wächter: `FrameLoop`s eigener Standard ist `maxFps = 0` (`FrameLoop.ts:52,56`), also ungedeckelt, und `#isDue` (`:134-137`) lässt bei 0 jedes Bild durch. Damit bleibt der Kontrastwert der Spec erhalten und wird schärfer — ein zurückgehaltenes Bild bei 10 ms beweist gegen »ungedeckelt« mehr als gegen 90. Auf 60 zu setzen nähme dem Fall genau diese Aussage und verlangte einen neu erfundenen Kontrastwert. Die Bildrate hat danach eine Quelle: den Effekt auf `:76-78`.
  5. `ShaeOffscreenCanvas.spec.js:322-325`: der Kommentar nennt heute »`#frameLoop`'s own constructor default is 90fps (threshold ≈ 8.3ms), which 10ms would have cleared«. Er wird auf den ungedeckelten Ausgangszustand umgeschrieben, in eigenen Worten und ohne Rückblick auf die 90 — etwa: der Frame-Loop startet ungedeckelt (`maxFps = 0`, jedes Bild fällig), und dass dieses Bild trotzdem zurückgehalten wird, ist der Beleg, dass der Effekt gelaufen ist und die 60 gesetzt hat. Die beiden Nachbarkommentare (`:328-330`, `:337-338`, `:343-344`) bleiben unangetastet, die Assertions ebenfalls: an keiner Erwartung dieses Falls ändert sich etwas.
  6. `ShaePropElement.ts`: die drei Felder von `:435-441` in den oberen Feldblock ziehen, hinter `#convertValue` (`:117`) und vor den Doc-Kommentar des Getters `get isDestroyed()` (`:119-120`). Reihenfolge bleibt `#reportedMissingHost`, `#reRequestHostTarget`, `#hostLookup` — sie lesen sich als ein Zustand: die Host-Suche. An der alten Stelle bleibt keine Lücke, keine Leerzeile zu viel und kein Hinweis darauf, dass dort einmal etwas stand; `teardown()` endet auf `}`, danach folgt der Kommentarblock über `#findEntNode`.

     Die zwei Felder ohne Doc-Kommentar bekommen je einen einzeiligen, in der Machart der neuen Nachbarn (`/** … */`, ein Satz), weil der Umzug sie von den Methoden trennt, die sie heute erklären: `#reportedMissingHost` hält fest, dass die Meldung über den fehlenden Host für dieses Element schon hinausgegangen ist; `#reRequestHostTarget` nennt den Knoten, auf dem das Element gerade lauscht, damit der Listener von demselben wieder heruntergeht. Kurz und sachlich, das lange Warum bleibt an den Methoden (der Meldungs-Kommentar in `#findEntNode` ab `:458`, der Kommentar in `#listenForHostChanges` ab `:507`).

     `#hostLookup` bekommt **keinen** Doc-Kommentar. Der letzte Absatz über `#onReRequestHost` (`:500-501`) erklärt das Tor bereits und nennt es beim Namen; ein zweiter Satz an anderer Stelle ist die Sorte Dublette, die auseinanderläuft.
  7. Nicht mitwandern: die neun Pfeilfunktions-Felder ab `:452` (`#findEntNode` `:452`, `#onReRequestHost` `:502`, `#listenForHostChanges` `:506`, `#stopListeningForHostChanges` `:517`, `#disconnectFromEntNode` `:522`, `#readNameAttribute` `:530` und die drei weiteren dahinter). Das sind Methoden in Feldkleidung, ihre Stellung ist die Konvention dieser Klasse, und der Befund nennt drei Felder, nicht zwölf.
  8. Zur Initialisierungsreihenfolge, damit sie geprüft und nicht geraten ist: `new MicrotaskGate(cb)` legt den Callback nur ab. Der Closure liest `this.#findEntNode` erst zur Mikrotask-Zeit, also lange nachdem das Feld auf `:452` initialisiert ist. Dieselbe Vorwärtsreferenz fährt `readonly #teardown = new DeferredTeardown(() => this.destroy())` auf `:102` seit jeher. Der Umzug ist damit unbedenklich, und `#hostLookup` steht danach vor `#findEntNode` wie schon heute.
  9. Kein CHANGELOG-Eintrag, in keinem der drei. Nachgesehen und begründet: an der öffentlichen Oberfläche bewegt sich nichts, und keine der fünf Änderungen ist von außen beobachtbar. Der zweite Schreibvorgang auf ein Signal, das den Wert schon trägt, ist bei der Standard-Vergleichsfunktion ein Nichts; der Bildratenwert wird noch während der Konstruktion überschrieben, bevor der Loop überhaupt startet (`:111-121`); ein Feldblock hat keine Laufzeitgestalt. Das `## [Unreleased]` von `shae-offscreen-canvas` ist eine flache Liste konsumentensichtbarer Aussagen — ein Eintrag dort hieße »nichts hat sich geändert«. Der Abschnitt `### Internal` in `packages/shadow-objects/CHANGELOG.md` sammelt Modulumzüge und Verhaltensverschiebungen; eine Feldverschiebung liegt darunter. Kommt der Reviewer zu einem anderen Schluss, ist das ein Befund und keine stille Ergänzung.
  10. `pnpm make:todo` entfällt: keine der fünf Dateien enthält ein `TODO`, und es kommt keines dazu.
- Nachweis: kein roter Lauf, und das ist die Aussage, nicht ihre Auslassung — drei info-Befunde ohne Verhaltensänderung geben keinen her. Was das Paket belegt, belegt es über Deckung: der neue Fall aus Schritt 1 hält die Räumung des `CanvasRenderingContext` fest, die vorher in keinem Test stand, und `ShaeOffscreenCanvas.spec.js:526` und `:300` halten die beiden anderen Streichungen. Alle drei laufen vor und nach der Änderung grün. Der Report nennt das so und schreibt keinen roten Lauf herbei.
- Nicht angefasst, geprüft:
  - `packages/shae-offscreen-canvas/src/distContract.files.txt` und `src/distContract.package.json`, dazu die beiden Gegenstücke in `packages/shadow-objects`: keine Datei kommt hinzu, geht weg oder wird umbenannt, kein Export bewegt sich. Spec-Dateien werden aus dem Canvas-Paket ohnehin nicht mehr veröffentlicht.
  - `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md` und `README.md`: nachgesehen, weder der Konstruktorwert des Frame-Loops noch der Abbau-Block noch die Feldstellung stehen dort. `README.md:42` beschreibt das `fps`-Attribut und seine Vorgabe 60 — die bleibt, wo sie ist.
  - `packages/shadow-objects/docs/`, `README.md`: `ShaePropElement`s Feldstellung ist nirgends dokumentiert.
  - `AGENTS.md`: nennt weder die drei Felder noch die beiden Shadow Objects des Canvas-Pakets.
  - `ThreeRenderView.js:34`: dort schreibt ein Effekt `renderView.set(undefined)` auf ein `createSignal()`, keinen bereitgestellten Kontext. Andere Sache, bleibt.
  - `packages/shadow-objects-e2e`: fährt `<shae-prop>` über die Elemente mit, und dort ändert sich nichts.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `lint:ci` fährt Biome mit `--error-on-warnings`; an `noUnusedPrivateClassMembers` und `noUnusedVariables` hängt, ob die Destrukturierung in `CanvasRenderingContext.js:6` wirklich mitgezogen wurde. `TURBO_FORCE=true` wie in den Paketen davor, damit kein grüner Cache-Treffer von vor der Änderung durchgeht. Das Netz dieses Pakets sind die beiden Canvas-Specs und, für `ShaePropElement`, `packages/shadow-objects-testing/test/prop-element-host.test.js` und `prop-element-lifecycle.test.js` in echtem Chromium. Die E2E-Suite bleibt draußen: 654 Playwright-Tests über drei Browser reißen die Zehn-Minuten-Grenze des Bash-Werkzeugs.
- Commit: `refactor(canvas): the frame-rate cap and the context clear each stand in one place`, Body-Zeile `The state of the prop element moves into one field block as well.` — ein Scope, weil die dreißig Commits davor ausnahmslos einen führen
- Ergebnis: 2 Runden (erster Anlauf plus eine Runde Fehlerkette) · CLEAN-004, CLEAN-005 und CLEAN-011 behoben, dazu der neu aufgenommene `ShaeOffscreenCanvas.js:51` · kein Regressionstest und keiner behauptet: drei info-Befunde ohne Verhaltensänderung geben keinen roten Lauf her. Belegt wird über Deckung, und beide neuen Fälle sind auf Unterscheidungskraft geprüft — `gives its context back when the shadow object leaves the entity` (`CanvasRenderingContext.spec.js:213`) und `gives its offscreen-canvas context back when the shadow object leaves the entity` (`ShaeOffscreenCanvas.spec.js:549`) werden beide rot, sobald man `clearOnDestroy: false` an das jeweilige `provideContext` schreibt; Reviewer und Implementierer haben diese Mutationsprobe unabhängig voneinander gefahren. Der ursprüngliche Deckungsnachweis des Detailplans für die zweite Streichung (`ShaeOffscreenCanvas.spec.js:526` über `destroyEntity`) trug nicht und ist in der Fehlerkette ersetzt worden: dieser Fall bleibt auch ohne Kernel-Räumung grün, weil `destroyEntity` den Kontext-Feed ohnehin kappt. Verify exit 0, Coverage 93,51 % Statements gegen 93,11 % Baseline · klein, nicht behoben: der Kommentar an `ShaeOffscreenCanvas.spec.js:566-568` begründet den Token-Wechsel damit, dass `destroyEntity` den Leser mitrisse — der Nachbarfall auf `:526` widerlegt das, dort überlebt der Leser als eigene Entity; der tragende Grund ist der andere (`destroyEntity` prüft die `clearOnDestroy`-Zusage nicht) · klein, nicht behoben: `ShaeOffscreenCanvas.spec.js:562-563` wartet zweimal `settle()` hintereinander ohne Kommentar, mit einem einzigen bleiben alle 25 Fälle grün
- Nebenbefunde: keine — beide Implementierer-Züge haben die fünf Dateien ganz gelesen und nichts gefunden, was auch ohne dieses Paket falsch gewesen wäre. Die Notiz des Implementierers zur Kontext-Vererbung (`link()` befüllt beim ersten `useContext()`-Zugriff nur `inherited`, `context` zieht eine Mikrotask später nach) ist kein Defekt, sondern eine Eigenheit beim Prüfen einer geerbten Kontextkette von außen, und steht als solche im neuen Testfall bereits berücksichtigt
- Folgen: keine
- Schnittstellen: keine — kein Export, keine Signatur und keine Konstante hat sich bewegt, weder öffentlich noch modul-lokal. Für ein späteres Paket an diesen Dateien: `CanvasRenderingContext` destrukturiert `{useContext, provideContext, createEffect}` und räumt seinen bereitgestellten Kontext nicht mehr selbst, `ShaeOffscreenCanvas` ebenso wenig für `OffscreenCanvasContext` — beide verlassen sich auf `clearOnDestroy`, den Standard von `ShadowObjectCreationScope.#provideContextSignal`. Wer dort ein `clearOnDestroy: false` einzieht, macht beide Shadow Objects undicht, und genau das schlägt in den zwei genannten Testfällen zurück. `#frameLoop = new FrameLoop()` startet ungedeckelt (`maxFps = 0`), die Bildrate kommt allein aus dem Effekt, der `getFps() ?? 60` schreibt. In `ShaePropElement` stehen `#reportedMissingHost`, `#reRequestHostTarget` und `#hostLookup` im oberen Feldblock hinter `#convertValue`.

**CLEAN-004 · info · packages/shae-offscreen-canvas/src/shadow-objects/CanvasRenderingContext.js:29-31** — Der explizite onDestroy-Block im CanvasRenderingContext ist von der Kernel-Räumung nicht zu trennen

Der Block räumt beim Abbau den bereitgestellten Kontext — dasselbe, was der Kernel unter clearOnDestroy ohnehin tut. Kein Wächter kann die beiden auseinanderhalten: löscht man den Block, bleibt jeder Fall grün. In der Spec des Pakets steht deshalb bewusst kein Fall »räumt seinen Kontext beim Abbau«, und die drei Zeilen stehen ohne Netz da.

Empfehlung: Entweder streichen, weil clearOnDestroy der Standard ist, oder mit einem Satz begründen, warum die Räumung hier nicht dem Kernel überlassen wird.

**CLEAN-005 · info · packages/shae-offscreen-canvas/src/shadow-objects/ShaeOffscreenCanvas.js:26** — new FrameLoop(90) ist ein toter Wert

Die Bildrate 90 wird nie wirksam: der Effekt überschreibt maxFps schon während der Konstruktion mit 60. Sichtbar ist die Zahl nur noch als Kontrastwert in dem Wächter, der genau daran zeigt, dass der Effekt greift.

Empfehlung: Den Konstruktorwert auf das setzen, was der Effekt ohnehin schreibt, oder den Parameter weglassen. Der Wächter braucht dann einen anderen Kontrastwert.

**CLEAN-011 · info · packages/shadow-objects/src/elements/ShaePropElement.ts:434-436** — Drei Felder stehen mitten in der Klasse statt bei den übrigen

Die Felder #reportedMissingHost, #reRequestHostTarget und #hostLookupPending stehen hinter disconnectedCallback mitten im Methodenteil, während alle übrigen Felder oben stehen. Wer den Zustand der Klasse überblicken will, findet ihn an zwei Stellen.

Empfehlung: Zu den übrigen Feldern nach oben ziehen.

### [x] 13. getChildren überspringt, was seine Nachbarn schon überspringen

- Nebenbefund: `packages/shadow-objects/src/view/ComponentContext.ts:304` (low, aus Paket 1, vorbestehend) — aus der Drain-Runde, vom Nutzer am 2026-08-28 freigegeben
- Ziel: Eine Kinderliste, die eine uuid ohne Eintrag führt, lässt `getChildren()` überspringen statt mit einem `TypeError` enden — dieselbe Zusage, die `#appendToOrdered` und `#traverseLevelOrderBFS` in ihrem Doc-Kommentar bereits geben.
- Bereich: `packages/shadow-objects/src/view/ComponentContext.ts`
- Hängt ab von: —
- Hash: 8ffa1d7
- Modell: mittlere Stufe
- Effort: medium — ein gewöhnlicher Bugfix mit Regressionstest. Der rote Lauf ist zu erzeugen und zu lesen, und der Reviewer hält die Zusage des Fixes gegen die zwei Nachbarn, die sie schon führen. Er erbt diesen Wert.
- Abgleich (2026-08-28, Fundstelle gelesen und der Fall gefahren):
  - Der Befund steht unverändert, eine Zeile tiefer als notiert: `getChildren()` liegt auf `:305-307`, die Dereferenzierung auf `:306` — `this.#entryOf(component)?.children.map((uuid) => this.#components.get(uuid)!.component) ?? []`. Das `!` ist die einzige ungeprüfte Auflösung von `#components.get(…)` in der Datei; die übrigen elf Lesestellen (`:121`, `:208`, `:224`, `:291`, `:376`, `:507`, `:795`, `:892`, `:900`, `:935`, `:961`) fahren `?.`, einen `undefined`-Zweig oder `#entryOf()` davor.
  - Die zwei Nachbarn, auf die sich das Ziel beruft, stehen: `#appendToOrdered` (`:927`) mit dem Doc-Satz »Uuids without a matching view instance are skipped instead of dereferenced, so a partially torn down list can never turn a reordering into an exception« (`:924-925`), und `#traverseLevelOrderBFS` (`:947`) mit `if (viewInstance == null) return;` (`:962`).
  - **Der Zustand ist über die öffentliche Oberfläche erreichbar, und der Fall ist gefahren worden.** `ComponentContext.addToChildren(parent, child)` (`:344`) schreibt die uuid in die Kinderliste, ohne den Elternzeiger der Komponente mitzuziehen — `docs/api-reference.md:1024` sagt das ausdrücklich zu, und `ComponentContext.spec.ts:963-964` nutzt es bereits als »the primitive below `ViewComponent.addChild()`«. `#deleteComponent()` (`:891`) räumt die uuid anschließend nur aus der Liste des Elternteils, den `entry.component.parent?.uuid` nennt (`:897-903`); ohne Elternzeiger findet es keine, und die uuid bleibt in der Kinderliste stehen, während ihr Eintrag verschwindet. Gemessen am 2026-08-28 gegen `752dfb5` mit einer temporären Spec (angelegt, gefahren, gelöscht — der Arbeitsbaum ist unverändert): `TypeError: Cannot read properties of undefined (reading 'component')` an `ComponentContext.ts:306:86`.
  - Im selben Zustand gemessen und grün: `ctx.traverseLevelOrderBFS().map((c) => c.token)` liefert `['p']`, und `ctx.clear()` wirft nicht. Die zwei Nachbarn halten also bereits, was `getChildren()` fehlt — das ist der Grund, warum der Fix lokal bleibt (siehe Vorgehen, Schritt 2).
  - Die drei internen Leser von `getChildren()` (`:542`, `:578`, `:666`, alle drei `dispatchReRequest…`) und der vierte in `ViewComponent.ts:292` (`dispatchEvent` mit `traverseChildren`) erben den Fix, ohne selbst angefasst zu werden. Repoweit gibt es sieben weitere Aufrufstellen, alle in Tests und alle auf lebenden Komponenten: `packages/shadow-objects-e2e/src/multi-env.js:269`, `packages/shadow-objects-testing/test/ent-element-peer-round.test.js:215`, `ent-element-namespace.test.js:112,134,211`, `ent-element-upgrade.test.js:145,153`, `ent-element-slot-move.test.js:160`. Keine davon ändert ihr Ergebnis.
- Triage (2026-08-28):
  - Offene `Folgen:` gibt es keine — alle zwölf erledigten Pakete melden »keine«.
  - Aus »Offene Befunde« übernimmt dieses Paket nichts. Die drei Einträge, die in derselben Datei sitzen, sind einzeln geprüft und teilen die Ursache nicht: `:356` ist der Wortlaut einer Fehlermeldung in `addToChildren`, `:328` ein toter Optional-Chain auf `changes` in `moveToRoot` — ein Wächter zu viel, nicht einer zu wenig, und er zielt auf ein Feld des `ViewInstance`, nicht auf eine uuid-Auflösung —, `:517` ein Doc-Kommentar über die Aufruferlage von `dispatchReRequestParentRoots()`. Alle drei tragen `→ Audit`, und ein `→ Audit`-Urteil zurückzunehmen ist nicht Sache eines Pakets, das die Ursache nicht teilt. Die übrigen elf Einträge liegen in anderen Dateien.
  - Neue Nebenbefunde aus diesem Zug 0: keine. Geprüft wurden `getChildren`, `removeFromParent`, `moveToRoot`, `addToChildren`, `changeOrder`, `removeSubTree`, `#deleteComponent`, `#appendToOrdered` und `#traverseLevelOrderBFS`. Dass `moveToRoot()` (`:327`) die uuid in der Kinderliste des vorigen Elternteils stehen lässt, ist kein Defekt, sondern die zugesagte Form: `docs/api-reference.md:1026` schreibt »Make a component a root without naming its previous parent«, und `ViewComponent.removeFromParent()` (`ViewComponent.ts:240-246`) ruft sie nur für eine Komponente ohne Elternzeiger.
  - Restplan: Paket 14 bleibt, wo es steht. Es teilt weder Datei noch Ursache mit diesem Paket, hat kein `Hängt ab von` und wird von keinem Schritt hier berührt. Zwei Pakete, zwei Commits, zwei Reviews — zusammengelegt stünden zwei zusammenhanglose Diffs unter einer Commit-Message.
- Dateien:
  - `packages/shadow-objects/src/view/ComponentContext.ts`
  - `packages/shadow-objects/src/view/ComponentContext.spec.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. **Erst der rote Lauf.** In `ComponentContext.spec.ts`, im `describe('tree invariants')`, direkt hinter `it('terminates the breadth-first walk when a children list points back at an ancestor', …)` (endet auf `:968`) und vor `it('every component is either a root or a child of a known parent', …)` (`:970`) diesen Fall einziehen:

     ```ts
     it('skips a child uuid whose entry is gone instead of dereferencing it', () => {
       ctx = makeContext();
       const parent = new ViewComponent('p', {context: ctx});
       const orphan = new ViewComponent('o', {context: ctx});

       // the same primitive as above: the children list is written without the parent link
       // following along, so the delete has no list to take the uuid out of
       ctx.addToChildren(parent, orphan);
       ctx.buildChangeTrails();

       orphan.destroy();
       ctx.buildChangeTrails();

       expect(ctx.getChildren(parent)).toEqual([]);
       expect(ctx.traverseLevelOrderBFS().map((c) => c.token)).toEqual(['p']);
       expect(() => ctx.clear()).not.toThrow();
     });
     ```

     Der Fall ist gegen `752dfb5` gefahren: die erste Erwartung wirft heute `TypeError: Cannot read properties of undefined (reading 'component')` an `ComponentContext.ts:306:86`, die zweite und die dritte sind schon jetzt grün — sie halten die Zusage der beiden Nachbarn fest, damit der Fix sie nicht versehentlich mitnimmt. Der rote Lauf gehört in den Report, mit dem Kommando `pnpm -F @spearwolf/shadow-objects exec vitest src/view/ComponentContext.spec.ts --run` und der Ausgabe.
  2. `ComponentContext.ts:305-307`: `getChildren()` bekommt den Wächter und einen Doc-Kommentar. Der Rumpf wird zur Schleife, weil `map` über eine gefilterte Liste zwei Durchgänge und eine Zwischenliste kostet und der Nachbar `#appendToOrdered` denselben Weg geht:

     ```ts
     /**
      * The children of `component`, in sort order — a fresh array each call, and an empty one for
      * an instance that does not own its entry.
      *
      * Uuids without a matching view instance are skipped instead of dereferenced: `addToChildren()`
      * writes a uuid into a children list without the parent link of the child following along, so
      * `#deleteComponent()` has no list to take that uuid out of and the entry behind it goes while
      * the list keeps naming it. `#appendToOrdered()` and `#traverseLevelOrderBFS()` read a children
      * list the same way.
      */
     getChildren(component: ViewComponent): ViewComponent[] {
       const children = this.#entryOf(component)?.children;
       if (children === undefined) return [];

       const result: ViewComponent[] = [];
       for (const uuid of children) {
         const entry = this.#components.get(uuid);
         if (entry !== undefined) {
           result.push(entry.component);
         }
       }
       return result;
     }
     ```

     Die privaten Namen stehen in Backticks und nicht in einem `{@link …}` — die Datei hält es an `:952` und `:1005` ebenso, und ein `@link` auf ein `#`-Mitglied ist von außen nicht auflösbar.
  3. **Nicht gehärtet wird `#deleteComponent()`.** Der naheliegende Gegenvorschlag — beim Löschen jede Kinderliste nach der uuid absuchen — wird nicht genommen, und der Grund gehört in den Report, falls der Reviewer ihn aufmacht: die beiden Nachbarn erklären eine teilweise abgebaute Kinderliste in ihrem Doc-Kommentar ausdrücklich zum zulässigen Zustand, `docs/api-reference.md:1024` sagt für `addToChildren()` dasselbe zu, und eine Suche über alle Listen kostet bei jedem Löschen einen vollen Durchgang durch `#components`. Der Fix liegt dort, wo die Zusage schon steht: an der Lesestelle.
  4. `docs/api-reference.md:1022`: die Zelle zu `getChildren(component)` bekommt einen Satz angehängt. Aus »The children of a component, in sort order. A fresh array each call, and an empty one for an instance that does not own its entry.« wird derselbe Text plus »A uuid in the children list that no entry stands behind is skipped rather than dereferenced.« Die Nachbarzeilen der Tabelle bleiben unangetastet; insbesondere `addToChildren` (`:1024`) sagt seinen Teil bereits.
  5. `CHANGELOG.md`, `## [Unreleased]` → `### Bugfixes`: ein Eintrag im Haus-Stil, direkt hinter der Zeile `:357` (`**Bugfix (view components):** ComponentContext.removeFromParent() dereferenced the child entry outside the guard …`), weil das derselbe Defekt an der Nachbarmethode ist. Inhalt in eigenen Worten: `ComponentContext.getChildren()` löste jede uuid der Kinderliste ohne Wächter auf, während die geordnete Einfügung und der Breitendurchlauf eine uuid ohne Eintrag überspringen; `addToChildren()` schreibt eine Kinderliste, ohne den Elternzeiger des Kindes mitzuziehen, und der Eintrag hinter einer so eingetragenen uuid wird gelöscht, ohne dass die Liste davon erfährt — jedes spätere `getChildren()` auf diesen Elternteil warf einen `TypeError`, und mit ihm `dispatchEvent(…, true)` und die drei `dispatchReRequest…`-Wege. Genannt wird, dass die Methode jetzt überspringt und dass `docs/api-reference.md` es sagt.
  6. **Die gezählte Behauptung im einleitenden Absatz unter `## [Unreleased]` (`:13`, »Fifty-seven changes reach existing consumers«) bleibt bei siebenundfünfzig.** Entschieden, damit es die Fehlerkette nicht wieder aufmacht: die Liste dort führt auf, was einen Konsumenten zum Handeln zwingt. Hier verschwindet ein Wurf, es entsteht keiner; wer den `TypeError` gefangen hat, fängt jetzt nichts mehr und muss dafür nichts anfassen. Der Schlusssatz des Absatzes (`:205`, »Everything else in this section is additive or a bugfix.«) deckt den Eintrag, wie er die drei benachbarten Wächter-Bugfixes deckt.
  7. `pnpm make:todo` entfällt: keine der vier Dateien enthält ein `TODO`, und es kommt keines dazu.
- Nachweis: der rote Lauf aus Schritt 1. Er ist vorab gefahren und wirft an der genannten Zeile; der Implementierer erzeugt ihn erneut und legt die Ausgabe in den Report, bevor Schritt 2 läuft.
- Nicht angefasst, geprüft:
  - `packages/shadow-objects/src/distContract.files.txt` und `src/distContract.package.json`: keine Datei kommt hinzu, geht weg oder wird umbenannt, kein Export bewegt sich, die Form von `dist/package.json` bleibt gleich.
  - `packages/shadow-objects/README.md` und die übrigen sechs Dateien unter `docs/`: repoweit gegrept, `getChildren` steht allein in `docs/api-reference.md:1022` und im CHANGELOG.
  - `AGENTS.md`: nennt `ComponentContext` nur in der Terminologietabelle (`:86`) und im Kontext-Absatz (`:89`). Kein Name, keine Zusage und keine Methode bewegt sich, es gibt nichts nachzuziehen.
  - Das Root-`CHANGELOG.md`: Build, Testrunner, Lint und Werkzeuge bleiben unberührt.
  - Die drei Einträge aus »Offene Befunde«, die in derselben Datei sitzen (`:328`, `:356`, `:517`): sie tragen `→ Audit` und bleiben Zeichen für Zeichen stehen. Wer sie im Vorbeigehen mitnimmt, hebt ein Urteil auf, das ihm nicht gehört.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `TURBO_FORCE=true` wie in den Paketen davor, damit kein grüner Cache-Treffer von vor der Änderung durchgeht. Das Netz dieses Pakets sind `ComponentContext.spec.ts` und `ViewComponent.spec.ts` in der Kern-Suite sowie die vier `ent-element-*`-Specs in `packages/shadow-objects-testing` in echtem Chromium, wo `getChildren()` über die Elemente läuft. Die E2E-Suite bleibt draußen: 654 Playwright-Tests über drei Browser reißen die Zehn-Minuten-Grenze des Bash-Werkzeugs, und ihr einziger Leser (`multi-env.js:269`) fragt eine lebende Komponente.
- Commit: `fix(view): a child uuid without an entry is skipped, not dereferenced`
- Ergebnis: 1 Runde · der Nebenbefund an `ComponentContext.ts:306` ist behoben — `getChildren()` steht auf `:315-326` mit Wächter und Doc-Kommentar · Regressionstest `skips a child uuid whose entry is gone instead of dereferencing it` (`ComponentContext.spec.ts:970-987`, vor dem Fix rot mit `TypeError: Cannot read properties of undefined (reading 'component')` an `ComponentContext.ts:306:86`) · Review ohne kritischen, wichtigen oder kleinen Befund · Verify exit 0, Coverage 93,55 % Statements gegen 93,11 % Baseline
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — kein Export, keine Signatur und keine Konstante hat sich bewegt. Für ein späteres Paket an dieser Datei: `getChildren()` wirft nicht mehr, wenn eine Kinderliste eine uuid ohne Eintrag führt, sondern überspringt sie — damit lesen alle drei Stellen, die eine Kinderliste durchgehen (`getChildren()`, `#appendToOrdered()`, `#traverseLevelOrderBFS()`), sie gleich, und eine vierte tut dasselbe. Die Zusage steht in `docs/api-reference.md` in der Tabellenzeile zu `getChildren(component)`. `#deleteComponent()` bleibt bewusst ungehärtet: die teilweise abgebaute Kinderliste ist ein zulässiger Zustand, und der Wächter gehört an die Lesestelle

### [x] 14. Die Ein-Element-Form überlebt beide Zweige von applyPropsChanges

- Nebenbefund: `packages/shadow-objects/src/utils/props-utils.ts:26` (low, aus Paket 7, vorbestehend) — aus der Drain-Runde, vom Nutzer am 2026-08-28 freigegeben
- Ziel: Ein Eintrag, der nur den Schlüssel nennt, bedeutet auf beiden Zweigen dasselbe — »gesetzt, ohne Wert« —, wie `ComponentPropertiesType` es zusagt und Paket 7 es dokumentiert hat.
- Bereich: `packages/shadow-objects/src/utils/props-utils.ts`
- Hängt ab von: —
- Hash: fcb2610
- Modell: mittlere Stufe
- Effort: medium — ein gewöhnlicher Bugfix mit Regressionstest in einer 49-Zeilen-Datei. Die Werte stehen unten auf Zeile und Zeichen genau, die Arbeit des Reviewers ist die Gegenprobe an der Zusage der Datei und an dem Kommentar, den der Umbau überholt. Er erbt diesen Wert.
- Abgleich (2026-08-28, Fundstelle gelesen und der Fall gefahren):
  - Der Befund steht unverändert an der notierten Stelle. `applyPropsChanges` (`:14-34`) hat zwei Wege in die Property-Liste, und nur einer liest die Arität: der Zweig `curProps === undefined` (`:22-23`) baut über `entry.length === 1 ? [entry[0]] : [entry[0], entry[1]]` frische Tupel und erhält die Ein-Element-Form; die Schleife darunter (`:25`) destrukturiert `[key, value]` und verliert sie.
  - **Zwei Hälften, nicht eine**, und der Nebenbefund nennt nur die erste. (a) Kennt `curProps` den Schlüssel nicht, schiebt `:28` ein `[key, undefined]` nach, das `filterUndefinedProps` (`:33`) wieder wegwirft — der Eintrag kommt gar nicht an. (b) Steht der Schlüssel bereits, schreibt `:30` `entry[1] = undefined` in das vorhandene Tupel, und derselbe Filter nimmt es heraus — ein `[key]` in `changes` **löscht** dann einen stehenden Wert, statt ihn auf »gesetzt, ohne Wert« zu ziehen. Die zweite Hälfte ist die schwerere und muss im Fix mit.
  - **Gemessen, nicht gelesen** (2026-08-28 gegen `8ffa1d7`, mit einer temporären Spec unter `src/utils/`: angelegt, gefahren, gelöscht — der Arbeitsbaum ist unverändert). Die drei Fälle aus Schritt 1 unten sind heute rot, der vierte grün:
    - `applyPropsChanges([['abc', 1]], [['foo'], ['bar', 2]])` → `[['abc',1],['bar',2]]` statt `[['abc',1],['foo'],['bar',2]]`
    - `applyPropsChanges([['foo', 'bar']], [['foo']])` → `[]` statt `[['foo']]`
    - `applyPropsChanges([], changes)` ungleich `applyPropsChanges(undefined, changes)` für `changes = [['foo'], ['bar', 2]]` → `[['bar',2]]` gegen `[['foo'],['bar',2]]`
  - **Die Zusage, gegen die das läuft, steht dreifach im Repo** und ist die Quelle für jede Formulierung unten: `types.ts:22-31` (»an entry that names only the key counts as set, without carrying a value«), der Kommentar an `filterUndefinedProps` (`props-utils.ts:5-6`, »an entry that names only the key survives the filter … while `[key, undefined]` means the value is gone«) und die zwei Kernel-Zeilen in `docs/api-reference.md:2767` und `:2771`. Der Fix bringt den Code zu diesem Text, der Text bleibt.
  - **Der Fall ist heute nicht erreichbar, und das ist der Grund für den Zuschnitt unten.** Einziger Aufrufer von `applyPropsChanges` ist `ComponentMemory` (`view/ComponentMemory.ts:83` und `:113`), und die Memory wird ausschließlich aus `ComponentContext.commitChangeTrail()` (`:788`) und `reCreateChanges()` (`:811`) beschrieben, also aus Trails, die `ComponentChanges` gebaut hat. Beide Bauwege liefern nur Zweier-Tupel: `makeChangePropertyChange()` (`ComponentChanges.ts:415`) mappt über `[key, this.#nextProperties.get(key)]`, `makeCreateEntityChange()` (`:357`) über `Array.from(this.#nextProperties.entries())`. Die Ein-Element-Form ist laut `types.ts` ausdrücklich eine Eingangs-Toleranz für einen selbst gebauten Trail an `Kernel.createEntity()` / `Kernel.changeProperties()` — und diese beiden Wege laufen an der Memory vorbei.
  - **Also erreicht kein Konsument die Änderung.** `props-utils.js` steht weder in `index.ts` noch in einem Pfad der `exports`-Map, `ComponentMemory` ist mit `export type *` (`index.ts:15`) nur als Typ exportiert. Daraus folgt der Verzicht auf CHANGELOG und Doku, siehe »Nicht angefasst, geprüft«.
- Triage (2026-08-28):
  - Offene `Folgen:` gibt es keine — alle dreizehn erledigten Pakete melden »keine«.
  - Aus »Offene Befunde« übernimmt dieses Paket nichts. Die zwölf verbliebenen Einträge tragen sämtlich `→ Audit`, keiner liegt in `props-utils.ts`, und keiner teilt die Ursache »die Arität eines Eintrags geht beim Lesen verloren«. Ein `→ Audit`-Urteil zurückzunehmen ist nicht Sache eines Pakets, das die Ursache nicht teilt.
  - Neue Nebenbefunde aus diesem Zug 0: zwei, beide in `props-utils.ts`, beide vorbestehend, beide bereits unter »Offene Befunde« gebucht (`:36` — `propsEqual()` ohne Aufrufer; `:4` — `filterUndefinedProps()` meldet »nichts« in zwei Formen). **Der Implementierer wird sie melden**, weil sein Auftrag ihn die Datei ganz lesen lässt; sie sind dann keine neuen Befunde, sondern diese zwei.
  - Geprüft und kein Befund: `ComponentContext.reCreateChanges()` (`:821`) destrukturiert `[key, value]` aus `cMem.properties` und flacht eine Ein-Element-Form ebenfalls ab. Der Sinn überlebt trotzdem — `changeProperty(key, undefined)` ist genau das, was `types.ts` der Ein-Element-Form zuschreibt, und `makeCreateEntityChange()` filtert Einträge mit `undefined` ohnehin heraus, sodass ein »gesetzt, ohne Wert« auf einer Neuanlage nie reist. Dieselbe Stelle ist zudem erst nach diesem Fix überhaupt erreichbar und auch dann nur über einen Weg, den es nicht gibt.
  - Restplan: nichts zu ändern. Paket 14 ist das letzte; danach ist kein Paket mehr offen, und der Abschluss räumt die vierzehn `→ Audit`-Einträge ins Audit.
- Dateien:
  - `packages/shadow-objects/src/utils/props-utils.ts`
  - `packages/shadow-objects/src/utils/props-utils.spec.ts`
- Vorgehen:
  1. **Erst der rote Lauf.** In `props-utils.spec.ts`, im `describe('applyPropsChanges')`, direkt hinter `it('copies a bare key as a bare key', …)` (endet auf `:96`) und vor dem schließenden `});` auf `:97` diese vier Fälle einziehen:

     ```ts
     it('keeps a bare key that lands on a standing list', () => {
       const curProps: ComponentPropertiesType = [['abc', 1]];
       const changes: ComponentPropertiesType = [['foo'], ['bar', 2]];
       expect(applyPropsChanges(curProps, changes)).toEqual([['abc', 1], ['foo'], ['bar', 2]]);
     });

     it('takes the value off an entry a bare key names', () => {
       const curProps: ComponentPropertiesType = [['foo', 'bar']];
       expect(applyPropsChanges(curProps, [['foo']])).toEqual([['foo']]);
     });

     it('reads a bare key the same way with and without curProps', () => {
       const changes: ComponentPropertiesType = [['foo'], ['bar', 2]];
       expect(applyPropsChanges([], changes)).toEqual(applyPropsChanges(undefined, changes));
     });

     it('drops an entry a change names with an explicit undefined', () => {
       const curProps: ComponentPropertiesType = [['foo'], ['bar', 2]];
       expect(applyPropsChanges(curProps, [['foo', undefined]])).toEqual([['bar', 2]]);
     });
     ```

     Die ersten drei sind gegen `8ffa1d7` gefahren und rot, mit diesen Meldungen:
     `expected [ [ 'abc', 1 ], [ 'bar', 2 ] ] to deeply equal [ [ 'abc', 1 ], [ 'foo' ], …(1) ]`,
     `expected [] to deeply equal [ [ 'foo' ] ]`,
     `expected [ [ 'bar', 2 ] ] to deeply equal [ [ 'foo' ], [ 'bar', 2 ] ]`.
     **Der vierte ist schon heute grün und soll es sein** — er hält die Gegenrichtung fest (`[key, undefined]` heißt »der Wert ist weg«), damit Schritt 2 sie nicht mitnimmt. Wer für ihn einen roten Lauf sucht, verliert eine Runde. Kommando für den Report: `pnpm -F @spearwolf/shadow-objects exec vitest src/utils/props-utils.spec.ts --run`, samt Ausgabe.
  2. `props-utils.ts:20-32`: Der Kommentar über dem Kopier-Zweig und die Schleife darunter werden ersetzt. Die Schleife liest die Arität und baut je Eintrag ein frisches Tupel, statt in ein vorhandenes durchzuschreiben — ein Zweier-Tupel kann seinen zweiten Platz nicht verlieren, und `[key]` ist genau das, was hier stehen bleiben muss:

     ```ts
     // the tuples belong to `changes` — a change trail that has been handed out is a value, and
     // every entry that stays here is one this function built itself
     if (curProps === undefined)
       return filterUndefinedProps(changes)?.map((entry) => (entry.length === 1 ? [entry[0]] : [entry[0], entry[1]]));

     for (const change of changes) {
       const key = change[0];
       // the arity carries the meaning, so it is read rather than destructured away: an entry of
       // one element says "set, without a value" and has to stay one element on the way in
       const next: [string] | [string, unknown] = change.length === 1 ? [key] : [key, change[1]];
       const idx = curProps.findIndex(([k]) => k === key);
       if (idx === -1) {
         curProps.push(next);
       } else {
         curProps[idx] = next;
       }
     }
     return filterUndefinedProps(curProps);
     ```

     Der Kommentar auf `:20-21` muss mit: sein zweiter Halbsatz nennt heute das Durchschreiben (»the loop below writes through `entry[1] = value` on every later call«), das es danach nicht mehr gibt. Der Ersatz oben sagt dasselbe *Warum* ohne den überholten Beleg und ohne Rückblick auf den Vorzustand, wie es die Konventionen im Kopf dieses Plans verlangen.
  3. **Der JSDoc auf `:10-13` bleibt Zeichen für Zeichen stehen.** Er ist nachgeprüft und weiterhin wahr: `curProps` wird verändert und zurückgegeben (die Elemente des Arrays werden ersetzt), `changes` wird nicht angefasst, und das Ergebnis teilt kein Tupel mit `changes` — Schritt 2 baut jedes Tupel neu, statt eines aus `changes` zu übernehmen. Der vorhandene Fall `'leaves the tuples of changes to their owner'` (`:82-90`) prüft genau das und bleibt grün.
  4. **`propsEqual` und `filterUndefinedProps` werden nicht angefasst.** Beide sind in diesem Zug 0 gelesen und tragen je einen eigenen Eintrag unter »Offene Befunde« mit dem Urteil `→ Audit`. Sie teilen die Ursache dieses Pakets nicht, und wer sie im Vorbeigehen mitnimmt, hebt ein Urteil auf, das ihm nicht gehört. Insbesondere ist `propsEqual([['foo']], [['foo']])` heute richtig `true` und `propsEqual([['foo']], [['foo', 'bar']])` richtig `false` (`props-utils.spec.ts:164-167`) — die Ein-Element-Form ist dort bereits sauber geführt.
  5. `pnpm make:todo` entfällt: keine der beiden Dateien enthält ein `TODO`, und es kommt keines dazu.
- Nachweis: der rote Lauf aus Schritt 1. Er ist vorab gefahren und scheitert an den drei genannten Zeilen; der Implementierer erzeugt ihn erneut und legt die Ausgabe in den Report, bevor Schritt 2 läuft.
- Nicht angefasst, geprüft:
  - **`packages/shadow-objects/CHANGELOG.md`: kein Eintrag.** Entschieden, damit es die Fehlerkette nicht aufmacht. Das CHANGELOG dieses Pakets ist konsumentenseitig, und dieser Fix erreicht keinen Konsumenten: `applyPropsChanges` ist aus dem Paket nicht importierbar (weder `index.ts` noch `exports`-Map), sein einziger Aufrufer `ComponentMemory` ist mit `export type *` nur als Typ exportiert, und die Ein-Element-Form kann die Memory über keinen der beiden Schreibwege erreichen (siehe Abgleich). Ein Eintrag müsste einen Namen nennen, den niemand aufrufen kann. Der Präzedenzfall steht im selben Lauf: Paket 12 (`752dfb5`) hat aus demselben Grund keine CHANGELOG-Zeile bekommen. Die gezählte Behauptung im einleitenden Absatz unter `## [Unreleased]` (»Fifty-seven changes reach existing consumers«) bleibt daher bei siebenundfünfzig.
  - **`packages/shadow-objects/docs/`: keine Zeile.** Repoweit gegrept: `applyPropsChanges`, `filterUndefinedProps` und `propsEqual` kommen in `docs/` nicht vor, `ComponentMemory` nur als Erzählname in den Recovery-Absätzen (`api-reference.md:738`, `:855`, `:1063-1065`, `:1257`, `:1280`, `:1335`, `guides.md:541`, `:568`, `:595`), von denen keiner die Form eines Property-Eintrags nennt. Die zwei Stellen, die sie nennen — `api-reference.md:2767` und `:2771` zu `Kernel.createEntity` und `Kernel.changeProperties` — beschreiben die Eingangsseite des Kernels, die dieses Paket nicht berührt, und sagen bereits genau das, wozu der Fix den Code bringt.
  - `packages/shadow-objects/README.md`: nennt keine der drei Funktionen.
  - `packages/shadow-objects/src/distContract.files.txt` und `src/distContract.package.json`: keine Datei kommt hinzu, geht weg oder wird umbenannt, kein Export bewegt sich, die Form von `dist/package.json` bleibt gleich.
  - `AGENTS.md`: nennt weder `props-utils` noch `ComponentMemory`. Kein Name, keine Zusage und keine Methode bewegt sich.
  - Das Root-`CHANGELOG.md`: Build, Testrunner, Lint und Werkzeuge bleiben unberührt.
  - `packages/shadow-objects/src/types.ts`: die Zusage an `ComponentPropertiesType` (`:22-31`) ist der Maßstab dieses Pakets und bleibt wortgleich stehen.
- Verify: `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci`
  `TURBO_FORCE=true` wie in den Paketen davor, damit kein grüner Cache-Treffer von vor der Änderung durchgeht. Das Netz dieses Pakets sind `props-utils.spec.ts` und `ComponentMemory.spec.ts` in der Kern-Suite sowie jede Spec, die einen Change Trail zweimal baut — `ComponentContext.spec.ts`, `ComponentChanges.spec.ts` und die `ent-element-*`-Specs in `packages/shadow-objects-testing` in echtem Chromium. Vorab gefahren mit dem Kandidaten aus Schritt 2 und grün: `src/utils/` (79 Fälle), `src/view/` (375 Fälle), `tsc --noEmit` exit 0, `biome check` ohne Befund. Die E2E-Suite bleibt draußen: 654 Playwright-Tests über drei Browser reißen die Zehn-Minuten-Grenze des Bash-Werkzeugs, und die Property-Wege laufen über die drei vitest-Suiten.
- Commit: `fix(utils): a property entry that names only its key keeps its shape on both paths`
- Ergebnis: 1 Runde · der Nebenbefund `props-utils.ts:26` ist in beiden Hälften behoben — ein Eintrag, der nur den Schlüssel nennt, überlebt jetzt auch den Zweig mit vorhandenem `curProps` und löscht dort keinen stehenden Wert mehr · Regressionstests `keeps a bare key that lands on a standing list`, `takes the value off an entry a bare key names` und `reads a bare key the same way with and without curProps` (alle drei vor dem Fix rot, mit den im Detailplan notierten Meldungen), dazu der Wächter `drops an entry a change names with an explicit undefined` für die Gegenrichtung · Reviewer: 0 kritisch, 0 wichtig, 2 klein — (a) der Kommentar auf `props-utils.ts:27-28` streift die Grenze zum Rückblick auf den Vorzustand, (b) der Testname `reads a bare key the same way with and without curProps` prüft `[]` gegen `undefined` und ist damit enger, als er klingt; beide wortgleich aus dem Detailplan übernommen und nicht nachgezogen · Verify `pnpm lint:ci && pnpm typecheck && TURBO_FORCE=true pnpm test:ci` exit 0, 93.56 % Statements gegen 93.11 % Baseline, `props-utils.spec.ts` 25 Fälle grün
- Nebenbefunde: keine neuen — die zwei aus Zug 0 (`props-utils.ts:36`, `:4`) stehen bereits unter »Offene Befunde«, beide `→ Audit`
- Folgen: keine
- Schnittstellen: keine — kein Export, keine Signatur und keine Konstante hat sich bewegt; `props-utils.ts` steht weder in `index.ts` noch in einem Pfad der `exports`-Map, die Dateiliste in `src/distContract.files.txt` bleibt gleich. Für ein späteres Paket an dieser Datei: `applyPropsChanges` schreibt nicht mehr in ein vorhandenes Tupel durch, sondern ersetzt es durch ein selbst gebautes — wer dort eine Schleife anfasst, liest die Arität von `change` (`change.length === 1`), statt `[key, value]` zu destrukturieren, sonst fällt die Ein-Element-Form wieder weg. Das Ergebnis teilt weiterhin kein Tupel mit `changes`; der Fall `'leaves the tuples of changes to their owner'` in der Spec hält das.
