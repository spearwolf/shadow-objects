# Remediation-Plan — @spearwolf/shadow-objects, View Layer

Quelle: ./view-layer-audit.html vom 2026-08-15 · Branch: `main` · erstellt: 2026-08-16
Basis-Commit vor dem ersten Paket: `1efde70` — alles danach stammt aus diesem Lauf.
Baseline: build ✓ · typecheck ✓ · test:ci ✓ (294 Tests) · e2e ✓ (324 Tests, Chromium + Firefox) · lint 4 Fehler (vorbestehend, siehe unten)
Scope: 16 von 16 Findings (1 critical, 6 high, 6 medium, 2 low, 1 info) · dazu 3 Punkte aus »Optimierungspotenzial« und 2 offene Fragen · nichts acknowledged, nichts ausgenommen
Stand (2026-08-17): **Lauf abgeschlossen. Alle 24 Pakete erledigt, 24 Commits von `1efde70` bis `b2356be`, nichts blockiert.** Abschluss-Verify mit erzwungenem Rebuild (`--force`, Turbo-Cache umgangen) auf dem committeten Baum: lint rc=0 · build + typecheck ✓ · `test:ci` **659** · e2e **402** · `dist/` **198** Dateien. Gegen die Baseline ist nichts rot geworden, was grün war. Semver: **minor** (`0.33.0` → `0.34.0`) — der Lauf entfernt mit `ComponentMemory` einen Laufzeit-Export, das ist breaking, und unter `1.0.0` hebt breaking die Minor-Stelle. Die `package.json` bleibt unangetastet: dieses Projekt setzt die Version beim Release (`chore: release vX`), nicht beim Merge; die Bewertung steht im `## [Unreleased]`-Kopf von `packages/shadow-objects/CHANGELOG.md`. Kein Tag, kein Push, kein Publish — das entscheidet der Nutzer.
Nullprobe am 2026-08-17 vom Planer 12d nachgemessen: `test:ci` **637** (`@spearwolf/shadow-objects` 327 in 14 Dateien, `shadow-objects-testing` 309 in 21 Dateien, `shae-offscreen-canvas` 1) · e2e **402** (Chromium + Firefox) · `packages/shadow-objects/dist` **198** Dateien.
Messwerte (2026-08-16, sauberer Baum, nach Paket 10, vom Planer 11 nachgemessen): `test:ci` 598 — `@spearwolf/shadow-objects` 294 in 13 Dateien, `shae-offscreen-canvas` 1, `shadow-objects-testing` 303 in 20 Dateien (davon 111 in `prop-element-types.test.js`) · e2e 404 (Chromium + Firefox) · lint rc=0 (2 Infos zu `biome.json`) · `packages/shadow-objects/dist` 194 Dateien. Die Zeile davor nannte 596 und 301 — sie war vor Paket 10 gemessen, das zwei Wächter ergänzt hat.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

Nicht zu verwechseln mit `./remediation-plan.md` — das ist der abgeschlossene
Lauf zum Gesamt-Audit `./audit.html` vom 14. August 2026 und wird hier nicht
angefasst.

## Entscheidungen

- Die Vorfahrensuche wird vereinheitlicht: eine gemeinsame Utility »finde den nächsten Shae-Vorfahren im flattened Tree« und dieselbe Nachjustierung per Re-Request-Event für `shae-prop` wie für `shae-ent`. Von den Paketen 9a und 9b eingelöst. (2026-08-16)
- ~~`ShaePropElement` erbt von `ShaeElement`.~~ **Umgekehrt am 2026-08-16 (Nutzerentscheidung), nachdem Paket 10 es mit Zahlen geprüft hat:** Die Vererbung entfernt **null** Zeilen und fügt zwei hinzu; ihr einziger Gewinn wäre ein `isShaeElement`-Flag, das im ganzen Repo nur ein Testfall über ein anderes Element liest. Sie kostet dafür ein `ns`-Attribut an einem Element, für das der Namespace nichts entscheidet — gegen die Entscheidung eine Zeile weiter unten und gegen `docs/api-reference.md`. In Chromium gemessen: Mit Vererbung synchronisiert `syncShadowObjects()` den Namespace des `<shae-prop>` selbst statt den seines Hosts, der Sync im richtigen Environment fällt von 1 auf 0 Aufrufe. `ShaePropElement` bleibt an `HTMLElement`; die Begründung steht als Klassenkommentar im Code — genau das, was das Audit verlangt — und zwei Wächter halten sie.
- `value=""` im Attribut bleibt `undefined`; die Normalisierung Leerstring→`undefined` wandert nach `#readValueAttribute`. Der Konvertierungspfad nutzt `??` und erhält damit `0`, `false` und `''` über die JS-Property. (2026-08-16)
- Eine Property gehört zum nächstgelegenen Entity, unabhängig vom Namespace. Die Regel wird in `docs/api-reference.md` festgeschrieben und durch einen Test sichtbar gemacht — kein `ns`-Attribut für `shae-prop`, kein Filter im Code. (2026-08-16)
- Ein `shae-prop` ohne Host im Vorfahrenpfad warnt über den vorhandenen `ConsoleLogger`, wie es die Klasse für unbekannte Typnamen bereits tut. Das stille Nichtstun ist der eigentliche Mangel des Falls. (2026-08-16)
- Ein Wert, der sich nicht in den angeforderten Typ überführen lässt, meldet über den `ConsoleLogger` und räumt die Property — auf jedem Weg, Attribut wie JS-Property. Der Setter `prop.value = …` wirft danach nicht mehr. Der Schutz sitzt an einer Stelle, im Konvertierungs-`switch`. (2026-08-16, Paket 5)
- `valueIn$` hält den rohen Attributwert. `#readValueAttribute` normalisiert nur, was ohne Kontext entscheidbar ist: kein Attribut oder ein leeres Attribut heißt »kein Wert«. Whitespace bleibt stehen und ergibt nach dem Trim den Leerstring — mit `type="number"` also `0`. (2026-08-16, Paket 5)
- Der Plan liegt in `./view-layer-remediation-plan.md`, nicht in `./remediation-plan.md`. (2026-08-16)
- **Fund A** (`ns` vor dem ersten Einhängen macht das Element dauerhaft zur Nicht-Entity) wird in Paket 7 mitbehoben. Der Fix sitzt in denselben Zeilen, die das Paket ohnehin umbaut. Nicht aus dem Audit, high. (2026-08-16, Nutzerentscheidung)
- **Fund B** (ein Namespace-Wechsel verliert alle Properties) geht in Paket 8, das den Property-Lebenszyklus zum Thema hat. Paket 7 schneidet seine E2E-Fälle so, dass sie Hierarchie und Ankunft prüfen und den Inhalt nicht behaupten. Nicht aus dem Audit, medium. (2026-08-16, Nutzerentscheidung)
- Der Defekt am `onDestroy`-Callback der Creation-API wird in einem eigenen **Paket 18** behoben, mit rotem Test zuerst. Gemessen: Verlässt ein Shadow Object die Menge, fällt `findShadowObjects` von 2 auf 1, aber der per Creation-API registrierte `onDestroy`-Callback läuft nicht — `Kernel.ts:731-733` legt ihn in `unsubscribePrimary`, und der feuert nur am Abbau der **Entity** (`once(entry.entity, onDestroy, …)`). `destroyShadowObject` emittiert `onDestroy` nur auf dem Shadow Object selbst, was eine Klassenmethode `[onDestroy]` erreicht, nicht den Callback. Der Defekt ist still und trifft genau das Muster, für das die API gedacht ist. Liegt im Kernel, also außerhalb des Teilaudits, ist aber von diesem Lauf gemessen. (2026-08-17, Nutzerentscheidung)
- Der `count()`-`TypeError` im Wurzel-`README.md` (`:61`, `:64`) wird in Paket 12c mitbehoben, ohne eigene Vorlage. `count` kommt aus `createSignal(0)` und ist in signalize 1.0.0-beta.0 eine Klasseninstanz, nicht aufrufbar — die Front-Page des Projekts wirft beim ersten Klick. Der Fehler sitzt im **selben Codeblock derselben Datei**, dessen Korrektur der Nutzer am 2026-08-16 für die Registry-Beispiele freigegeben hat, und in einem der zwei Blöcke, die die Verify-Stufe ohnehin ausführt. Getrennt vorzulegen hieße, um Erlaubnis zu bitten, einen genehmigten Fix zu beenden. (2026-08-17, Orchestrator)
- Der Laufzeit-Re-Export von `ComponentMemory` aus `index.ts` **fällt**. Die Klasse trägt `@internal`, `stripInternal: true` entfernt sie aus der emittierten `.d.ts` — `import {ComponentMemory} from '@spearwolf/shadow-objects'` ist für einen TypeScript-Konsumenten ein Fehler und löst zur Laufzeit trotzdem auf. Der Export war ein Versehen, nicht eine Zusage; der Typ hat nie existiert. Als Breaking Change ins Paket-CHANGELOG, umgesetzt in Paket 16 — **am 2026-08-17 mit der Teilung von 16 nach Paket 19 gewandert**, die Entscheidung selbst ist unberührt. (2026-08-17, Nutzerentscheidung)
- Die fünf bislang ungeprüften Abschnitte von `api-reference.md` — Creation API, Registry, Namespacing and Contexts, Kernel, Advanced, rund 800 von 1937 Zeilen — werden in einem eigenen **Paket 16** gegen den Code gehalten, mit denselben vier Instrumenten wie 12b und 12d. Sie liegen außerhalb des Audit-Umfangs, aber zwei bereits belegte Fehler darin (ein Beispiel, das einen `TypeError` wirft; `on`/`once` als `void` dokumentiert) deuten die Quote an. (2026-08-17, Nutzerentscheidung) — **Am 2026-08-17 vom Planer 16 nachgemessen: es sind 913 von 2190 Zeilen und 51 Codeblöcke, nicht 800 von 1937.** Das Paket ist daran geteilt worden: 16 nimmt Creation API und Registry, **Paket 19** nimmt Namespacing and Contexts, Kernel und Advanced. Die Entscheidung, sie mit denselben vier Instrumenten zu stellen, gilt für beide unverändert.
- `ShadowObjectConstructor` wird **nicht** geweitet. Der Typ nimmt keine Funktion, zur Laufzeit funktioniert eine trotzdem, weil `Kernel.ts:463` sie mit `new` ruft — der Typ ist enger als das Verhalten. Gelöst wird das doku-seitig: Das Beispiel zieht auf eine Klasse, die Signaturweitung geht als Backlog-Zeile. Eine öffentliche Signatur als Nebeneffekt eines Doku-Pakets zu weiten, wäre der falsche Weg; wer sie will, bekommt ein eigenes Paket. (2026-08-17, Orchestrator)
- Die zwei Defekte in `RemoteWorkerEnv` werden in einem eigenen **Paket 15** hinter 14 behoben, mit je einem Wächter: `destroy()` setzt `#isDestroyed` nicht, wenn kein Worker existiert (der Early Return steht davor), und ein `destroy()` während eines laufenden `start()` bricht den Failure-Controller nicht ab, sodass `workerLoaded` für immer pending bleibt. Ein `destroy()`, das nicht greift, und eine Promise, die nie settelt, sind Korrektheitsfehler und keine Doku-Frage. Vorbestehend, nicht aus dem Audit. (2026-08-17, Nutzerentscheidung)
- Eine `forward-custom-events`-Liste **ohne Einträge fällt auf `false` zurück** — `forward-custom-events=","` leitet nichts weiter statt alles, ebenso `forwardCustomEvents$.set(new Set())`. Grund: »nichts weiterleiten« schreibt sich heute schon, indem das Attribut wegbleibt, und `false` ist der Vorgabewert; es entsteht kein neuer Zustand, es verschwindet ein Widerspruch. Der Gegenweg — eine eigene Marke für den leeren Filter — hätte dem Markup einen vierten Zustand gegeben, der sich von »Attribut fehlt« in nichts unterscheidet, was ein Anwender messen kann. (2026-08-16, Nutzerentscheidung)
- Die zehn `export default { define: … }` in der Dokumentation werden in Paket 12c richtiggestellt. Der Loader liest ausschließlich den benannten Export `shadowObjects` — im Worker-Pfad gibt es einen Fehler, im lokalen passiert stillschweigend nichts. Kein veröffentlichtes Registry-Beispiel läuft heute. Vorbestehend, nicht aus dem Audit, hohe Schwere. Verify führt zwei der Beispiele tatsächlich aus. (2026-08-16, Nutzerentscheidung)
- Die Kopplung `whenDefined('shae-ent')` in `shae-prop.ts:4` **fällt**. Gemessen trägt sie seit den Paketen 6 und 9b keine Korrektheit mehr, kostet aber ein still inertes Element für jeden, der den Subpfad `@spearwolf/shadow-objects/shae-prop.js` einzeln importiert. Zwei Wächter halten fest, dass der Einzelimport funktioniert und dass der Host auch bei umgekehrter Registrierungsreihenfolge gefunden wird. (2026-08-16, Nutzerentscheidung)
- `src/elements/events.ts` wird über `index.ts` als `export type *` veröffentlicht. Die drei Ereignisnamen stehen damit typisiert in der globalen Event-Map; rein additiv, keine neue Datei unter `dist/`. (2026-08-16, Nutzerentscheidung)
- Der `localStorage`-Fähigkeitstest im `ConsoleLogger` wird in diesem Lauf gehärtet, als eigenes Paket 14 am Ende. Er liegt außerhalb des Audit-Umfangs, trifft aber jeden Konsumenten, der die Bibliothek unter Node SSR-seitig importiert, sofort beim ersten Logger. (2026-08-16, Nutzerentscheidung)
- Eine Property gehört zur Bindung `(ViewComponent, name)`. Endet die Bindung, wird die Property abgeräumt — das Element verlässt den Baum, sein `name` ändert sich, oder es wechselt die Host-Entity sind derselbe Weg und werden von einem Codepfad bedient. Ein Entfernen und Wiedereinhängen innerhalb desselben Ticks ist kein Ende. (2026-08-16, Paket 8)
- Ein Namespace-Wechsel nimmt die Properties mit; ein Wechsel nach `undefined` — Ab- und Wiedereinhängen eines `<shae-ent>` — nimmt nichts mit, weil es keinen Empfänger gibt und die `<shae-prop>`-Kinder ihre Werte beim Wiedereinhängen ohnehin neu schreiben. Bereits abgeschickte Events wandern nie mit: sie werden im bisherigen Environment zugestellt, bevor die Zerstörung dort greift. (2026-08-16, Paket 8)
- **Offen, dem Nutzer am 2026-08-16 vom Planer 12 vorgelegt — drei Entscheidungen, alle gemessen:** (a) `shae-prop.ts:4` koppelt die Registrierung an `whenDefined('shae-ent')`; die Kopplung trägt seit Paket 9b keine Korrektheit mehr und kostet ein still totes Subpfad-Modul. Vorschlag: fällt. (b) `src/elements/events.ts` — löschen bricht den Typecheck an vier Stellen, die Datei bleibt also; die Frage ist, ob sie über `index.ts` erreichbar wird. Vorschlag: ja, `export type *`. (c) Zehn Registry-Beispiele in der Dokumentation nutzen `export default`, während der Loader ausschließlich den benannten Export `shadowObjects` liest — kein veröffentlichtes Beispiel läuft. Vorbestehend, nicht aus dem Audit, hohe Schwere. Vorschlag: in Paket 12c mitgeräumt. Bis zur Antwort fängt 12a nicht an.
- **Vier Vorlagen des Planers 19, alle vom Orchestrator entschieden (2026-08-17):**
  1. **Backlog §7.2 Punkt 11 (`Registry.clear()` muss `#truthyPropRoutes` mitlöschen) fällt mit.** Der Planer 19 hat ihn als erledigt gemessen — `Registry.ts:145` löscht die Karte, nach `clear()` gibt `findTokensByRoute('a', new Set(['flag']))` nur noch `["a"]`. `CLAUDE.md` führt den Backlog ausdrücklich als »living working document, not an audit log«, und `e778621` hat für diesen Vorgang die Form vorgegeben. Ein erledigter Punkt, der stehenbleibt, ist eine Falschaussage über den Code. §7 endet damit bei 23.
  2. **Der `hasRoute`-Befund (A-12) wird doku-seitig gelöst, die Asymmetrie geht in den Backlog.** `Registry.ts:138-140` liest nur `#routes`, während `clearRoute` (`:71-78`) beide Karten bedient — gemessen gibt `hasRoute('@debug')` `false`, obwohl die Route wirkt. Dasselbe Muster wie bei `ShadowObjectConstructor`: eine öffentliche Signatur als Nebeneffekt eines Doku-Pakets zu ändern, wäre der falsche Weg; wer sie will, bekommt ein eigenes Paket. Ein Halbsatz sagt, dass `hasRoute` nur Token-Routen beantwortet.
  3. **`onParentChanged` wird als Eigenschaft dokumentiert — mit einer Prüfung an der Fundstelle.** `Kernel.ts:353-359` stellt es über `queueMicrotask` zu, die anderen drei Lebenszyklus-Symbole laufen synchron; gemessen steht unmittelbar nach dem `SetParent`-Change nur `onCreate` im Protokoll. Das passt zu der Regel, die dieser Lauf an mehreren Stellen geschrieben hat — ein Kanal wartet, bis der Baum stillsteht. **Auflage:** Trägt die Stelle einen Kommentar oder JSDoc, der die Verzögerung begründet, wird sie dokumentiert; steht sie unbegründet da, kommt zusätzlich eine Backlog-Zeile dazu. Der Implementierer entscheidet das an der Fundstelle, nicht an dieser Vermutung.
  4. **Der `ComponentMemory`-Schnitt bekommt keinen Test.** Die Begründung des Planers trägt: es gibt kein Fehlverhalten zu reproduzieren (die Klasse funktioniert, sie ist nur an einer nie zugesagten Stelle erreichbar), das Repo hat keinen Präzedenzfall für einen Export-Oberflächen-Wächter, und das letzte Paket eines Laufs ist der falsche Ort, eine Testkonvention einzuführen. Der Beleg ist die Sieben-Proben-Tabelle vor und nach dem Build — sie zeigt beide Hälften (No-op für TypeScript, Breaking Change zur Laufzeit), was ein einzelner Test nicht könnte.
- Der Konvertierungsfehler von `shae-prop` wird über `logger.error` gemeldet, nicht über `logger.warn`. Grund: `sharedConfig.enable` des `ConsoleLogger` steht auf `IS_LOCALHOST`, eine Warnung wäre in Produktion also stumm — und vorher war derselbe Fall ein Uncaught Error und damit für jedes Fehler-Monitoring sichtbar. Diese Sichtbarkeit darf der Lauf nicht mitnehmen. Der vom Audit verlangte Kanal bleibt derselbe. (2026-08-16)

## Konventionen

Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise:

- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs. Sie gehören diesem einen Audit und sind danach tot. Sie
  leben in diesem Plan und in Commit-Messages, sonst nirgends.
  **Gilt für Zeilen, die in *diesem* Lauf entstehen — nicht rückwirkend.** Der
  Reviewer 16 hat am 2026-08-17 `VIEW-22` im Paket-CHANGELOG als Verstoß
  gemeldet; gegen `1efde70` gemessen ist es Altbestand aus dem vorigen Lauf
  (`./remediation-plan.md`, Gesamt-Audit vom 14. August): Paket-CHANGELOG
  vorher wie jetzt **27** Vorkommen, `Kernel.ts:336` 1, `Kernel.spec.ts` 7,
  `Registry.spec.ts` 1, `Backlog.md` von 61 auf 55 gefallen. Dieser Lauf hat
  **keine** ID hinzugefügt. Kein Handlungsbedarf — wer sie erneut meldet, hat
  gegen den falschen Stand gemessen.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

Projektspezifisch, aus `AGENTS.md` und `CLAUDE.md`:

- Alle Dokumentation und alle Code-Kommentare auf Englisch.
- Verbotene Analogien: "shadow theater", "puppet", "puppeteer", "light world",
  "screen". Es gilt ECS-Terminologie: Entity, Component, Kernel, View, Token.
- Bindende Begriffe: `RemoteWorkerEnv` (nicht `RemoteShadowObjectEnv`), Entity
  (nicht Shadow Entity), Entity Tree (nicht Shadow Entity Graph), Token (nicht
  Component Tag). `ComponentContext` immer ausgeschrieben; die Dependency
  Injection entlang des Entity Tree heißt "Entity Context".
- Jede Änderung an der öffentlichen API aktualisiert im selben Paket
  `packages/shadow-objects/docs/`, `packages/shadow-objects/README.md` und
  `packages/shadow-objects/CHANGELOG.md` (Abschnitt `## [Unreleased]`).
  Änderungen am Harness (Testrunner, Lint, CI, devDeps) gehen in die
  `CHANGELOG.md` im Repo-Wurzelverzeichnis, datiert.
- Dependency-Versionen ausschließlich über den `catalog:`-Block in
  `pnpm-workspace.yaml`. Nie eine Version in ein Paket-`package.json`.
- Wird ein `TODO`-Kommentar angefasst, läuft danach `pnpm make:todo`.

## Vorbestehende Fehler

- `packages/shadow-objects/CHANGELOG.md:66` (Eintrag zum Dependency-Bump, aus der Zeit **vor** diesem Lauf) schreibt die `Object.prototype`-Falle den falschen Methoden zu. End-to-end gemessen: `vc.dispatchShadowObjectsEvent('toString', …)` **kommt beim Shadow Object an** — `Entity.dispatchViewEvents` (`Entity.ts:278-282`) emittiert den Symbolnamen `onViewEvent` und trägt den konsumentengewählten String nur als Argument, er wird auf diesem Pfad nie zum eventize-Ereignisnamen. Betroffen ist die Gegenrichtung: `ComponentContext.dispatchMessage()`/`broadcastEvent()` → `ViewComponent.dispatchEvent()` → `emit(this, type, data)` (`ViewComponent.ts:238`). Gefunden vom Implementierer 12d. Triage vom 2026-08-17 (Planer 12c) — die Zeile hatte keine: Der Eintrag steht in `## [Unreleased]`, ist also noch nicht veröffentlicht, und ihn zu berichtigen greift in keine Release-Historie ein. **Paket 17, Schritt 4**, mit einer Wiederholung der Messung vor der Änderung.
- `ShadowEnv.ns$` (`ShadowEnv.ts:46`) ist die einzige Fundstelle im ganzen Repo — das Signal wird nie geschrieben und liest auch nach `ready()` `undefined`. Ein öffentlicher Slot mit einer Zusage ohne Inhalt: verdrahten oder entfernen. Gefunden vom Implementierer 12d, am 2026-08-17 vom Planer 12c über den ganzen Baum bestätigt (nur `ShadowEnv.ts:46` und die Zeichnung `view/ClassGraphOverview.drawio:334`). Triage vom 2026-08-17 (Planer 12c) — die Zeile hatte keine: Beide Auswege sind API-Änderungen, `api-reference.md:1055` benennt den Zustand nach 12d bereits ehrlich als »a signal slot the environment itself never writes«. **Backlog, über Paket 17, Schritt 2.**
- Neun Wertexporte von `index.ts` ohne jede Doku-Zeile: `ChangeTrailPhase`, `Configure`, `ChangeTrail`, `Destroy`, `Loaded`, `AppliedChangeTrail`, `ImportedModule`, `Destroyed`, `ShadowObjectsExport` — Worker-Protokoll-Konstanten, Territorium §Advanced.

- `forwardCustomEvents$.set(true)` normalisiert ein vorhandenes Filter-Attribut nicht. Bei `<shae-ent forward-custom-events="a,b">` steht das Signal danach auf `true` und leitet alles weiter, während das Attribut weiter `a,b` zeigt — `ShaeEntElement.ts:157-170` schreibt im `true`-Zweig nur `if (!this.hasAttribute(...))`. In Chromium gemessen, Geschwisterfall des Patch-nach-Wiedereinhängen-Befunds. Gefunden vom Implementierer 12b, gehört in den Backlog.

- Nach `forwardCustomEvents$.set(true)` und einem Ab- und Wiedereinhängen liest `connectedCallback` das Attribut unter `beQuiet` zurück, **ohne den Patch-Effect erneut laufen zu lassen**. Gemessen steht das Element danach auf `signal=false` (bei `forward-custom-events=","`) beziehungsweise `Set('a')` (bei `="a"`), während der unter `true` installierte Patch weiter **alles** weiterleitet. Der `="a"`-Gegenfall belegt, dass es nicht an Paket 13 liegt — dieses Paket macht den Zustand nur zusätzlich erreichbar. Gefunden vom Reviewer 13, gehört in den Backlog.

- Ein **verschobener `<slot>`** benachrichtigt die Entity nicht, die er verlässt. `slotchange` feuert erst nach dem Umzug und damit am neuen Ort; die alte Entity hört nichts. Betrifft beide Kanäle gleichermaßen — gemessen bleibt sowohl die Property an ihrer alten Entity hängen als auch `entParentNode` eines `<shae-ent>` stehen. Kein Rückschritt durch Paket 9b, aber die einzige verbliebene Lücke in der Regel »jeder Weg, antwortender Vorfahre zu werden oder aufzuhören es zu sein, nimmt die Aufforderung mit«. Gefunden vom Reviewer 9b, gehört in den Backlog.

- `utils/props-utils.ts:19-27` mit `ComponentMemory.createEntity`: `applyPropsChanges` übernimmt die Tupel-Objekte des Change Trails per Referenz und schreibt sie später mit `entry[1] = value` fort. Ein bereits ausgelieferter Change Trail ändert sich damit nachträglich — eine Falle für jeden, der Trails aufzeichnet. Vorbestehend, gefunden vom Reviewer Paket 8, gehört in den Backlog.

- ~~`pnpm lint` meldet 4 Fehler, 6 Warnungen und 4 Infos aus
  `view-layer-audit.html`, dem Report selbst.~~ Von Paket 1 erledigt.
- `pnpm lint` meldet weiterhin 2 Infos zu `biome.json` selbst (`biome.json:2` —
  `$schema` auf 2.4.14 bei installiertem Biome 2.5.8; `biome.json:56` — das Feld
  `linter.rules.recommended` ist deprecated, Nachfolger ist `preset`). Exit-Code
  0, kein Teil des Scopes, blockiert keinen Commit. Triage vom 2026-08-16: beides
  hebt ein `biome migrate`, das dabei aber den wirksamen Regelsatz anfassen kann —
  mitten im Lauf eine breite Diff-Front ohne Bezug zum Audit. Bleibt draußen, geht
  als Eintrag in den Backlog und ins nächste Audit.
- `packages/shadow-objects-e2e/src/test-helpers/waitUntil.js:8` und
  `test-helpers/testAsyncAction.js:3` haben beide 5000 ms als Vorgabe. Wird `waitUntil`
  in einer `testAsyncAction` benutzt — in `src/dynamic-dom.js` und seit Paket 2 auch in
  `src/shae-worker.js:127` —, läuft die äußere Frist zuerst ab und der Bericht sagt
  »did not settle within 5000ms« statt der Bedingung, an der es hing. Kein Testergebnis
  ändert sich dadurch, nur die Diagnose. Triage vom 2026-08-16: vorbestehendes
  Harness-Design, kein Finding dieses Audits, kein eigenes Paket wert. Geht in den
  Backlog; wer die Helfer das nächste Mal anfasst, gibt der inneren Frist einen
  kleineren Wert mit.
- `packages/shadow-objects-testing/test/__screenshots__/` sammelt Fehler-Screenshots des
  Vitest-Browser-Modus und wird von keinem Skript geleert. Gefunden am 2026-08-16 vom Planer 4b:
  drei Aufnahmen einer Wegwerf-Sonde und eine zu einem Fall aus `ent-element-attributes.test.js`,
  der im selben Arbeitsbaum grün läuft. Gitignored, also kein Teil des Diffs, aber dieselbe Falle,
  die Paket 1 für die Playwright-Ausgabe abgestellt hat: ein Screenshot mit frischem Zeitstempel
  sieht aus wie ein aktueller Fehler. Die vorhandenen Aufnahmen sind entfernt. Triage: gehört als
  `test`-Skript-Vorstufe im Paket `shadow-objects-testing` behandelt, analog zu
  `packages/shadow-objects-e2e/package.json`; kein Finding dieses Audits, kein eigenes Paket wert,
  geht in den Backlog.
- `packages/shadow-objects-e2e/TEST-PLAN.md` §1 (`:24`) spricht von »Four spec files, 43 registered
  test cases« und führt eine Tabelle mit vier Zeilen, während `tests/` zehn Spec-Dateien enthält;
  §2.2 (`:99`) erklärt das Upgrade-Timing für »not covered«, obwohl `pages/upgrade-timing.html`
  existiert und geprüft wird. Vorbestehende Dokumentationsdrift, gefunden am 2026-08-16 vom Planer 6.
  Triage: derselbe Kopf-Abschnitt wie die zwei bereits zugeteilten Stellen, geht mit **Paket 17**,
  Schritt 1, mit (bis 2026-08-17 war das Paket 12c, Schritt 6). Am 2026-08-16 vom Planer 12 nachgezählt: zehn Spec-Dateien, 202 Fälle je Browser.
  Paket 6 fasst in dieser Datei nur die Zeile `UPG-7` unter §3.3 an.
- `packages/shadow-objects-e2e/TEST-PLAN.md:53-58` (§1.2 »Two tests that never run«)
  und `:69` (H-4) beschreiben beide einen Zustand, den es nicht mehr gibt: die zwei
  `contextCreated`-IDs stehen in `tests/shae-worker.spec.ts:9,12`, und
  `testAsyncAction` lehnt längst mit einem `Error` ab statt mit einem nackten
  `reject`. Vorbestehend, Dokumentationsdrift. Triage vom 2026-08-16: wird in
  **Paket 17**, Schritt 1, mitgeräumt (bis 2026-08-17 war das Paket 12c, Schritt 6). Beides am 2026-08-16 vom Planer 12 an der Fundstelle
  bestätigt (`tests/shae-worker.spec.ts:9,13`; `src/test-helpers/testAsyncAction.js:5`).
- `ComponentContext.dispatchReRequestParentRoots()` (`ComponentContext.ts:365-371`) kennt keinen
  Absender und kann deshalb nicht filtern; für Seiten mit sehr vielen Wurzel-Entities bleibt der
  Zweig linear pro Verbindung, und ein `ns`-Wechsel kostet N+1 Nachrichten bei N Wurzeln im Ziel-
  Namespace. Vorbestehend, vom Reviewer Paket 7 an Paket 9 verwiesen. Triage vom 2026-08-16 (Planer
  Paket 9): **zurück in den Backlog.** Die Zuweisung stand unter der Annahme, Paket 9 fasse den
  Wurzel-Kanal an; die Nachjustierung der Property-Seite läuft über ein DOM-Ereignis und über
  keinen `ComponentContext`-Kanal, der Ent-Pfad bleibt unberührt. Ein Absender allein reicht dort
  auch nicht: `#reRequestParentAsRoot` (`ShaeEntElement.ts:420-425`) löst die Bindung
  bedingungslos, ein Filter bräuchte denselben `isBelow`-Aufstieg, den Paket 6 an geschlossenen
  Grenzen ausdrücklich fallen lässt. Beides gehört in einen Zug, und der ist kein Teil dieses Laufs.
- `packages/shadow-objects/docs/api-reference.md:1282` und `docs/cheat-sheet.md:255` bilden `number` und
  `float` gemeinsam auf `parseFloat` ab. `number` ist `Number(value)`; für `value="3.14abc"` liefert die
  Doku-Zusage `3.14` und der Code `NaN`. Vorbestehend, kein Finding dieses Audits, gefunden am 2026-08-16
  vom Planer 11. Triage: **echte Folge** — wer die Tabelle liest, wählt den falschen Typnamen. Ziel ist
  Paket 11, nicht der Backlog und nicht Paket 12: Dieses Paket baut die korrekte Tabelle ohnehin, und die
  falsche Zeile daneben stehen zu lassen wäre absurd. Dieselbe Tabelle lässt `bigint`, `hex`, `oct` und
  `bin` ganz aus; die vier Zeilen kommen im selben Zug dazu.
- **Kein veröffentlichtes Registry-Beispiel läuft.** Der Loader liest aus einem importierten Modul ausschließlich den benannten Export `shadowObjects` (`constants.ts:48`, gelesen in `LocalShadowObjectEnv.ts:65` und `worker/MessageRouter.ts:70-77`); fehlt er, meldet der Worker-Pfad `module has no "shadowObjects" export` und der lokale Pfad tut stillschweigend nichts. Die Dokumentation zeigt an zehn Stellen `export default { define: … }`: `README.md:69`, `packages/shadow-objects/README.md:49`, `docs/getting-started.md:114`, `docs/guides.md:143,158`, `docs/best-practices.md:207`, `docs/cheat-sheet.md:55`, `docs/api-reference.md:426,528,548` (am 2026-08-17 vom Planer 12c nachgezählt: Zahl bestätigt, `cheat-sheet.md` und `api-reference.md` verschoben; der erklärende Satz »The module default export is the registry« steht **zweimal** — `packages/shadow-objects/README.md:47` und `README.md:67`). Jedes echte Modul im Repo macht es richtig (`shadow-objects-e2e/public/mod-hello.js:14`, `mod-auto-destruct.js:58`, `shae-offscreen-canvas/src/shadow-objects.js:7`) — deshalb ist die Suite grün, während das »erste funktionierende Beispiel« nicht funktioniert. Vorbestehend, kein Finding dieses Audits, gefunden am 2026-08-16 vom Planer 12. Triage: hohe Schwere, dem Nutzer vorgelegt; Ziel bei Zustimmung **Paket 12c**, Schritt 1.

- **Das Quick-Example im Wurzel-`README.md` wirft, wo es zählen soll.** `README.md:61` und `:64` rufen `count()` auf, wo `count` aus `createSignal(0)` kommt. `createSignal` liefert ein `Signal`-**Objekt** (signalize 1.0.0-beta.0, `lib/Signal.d.ts`: `declare class Signal<ValueType>` mit `get get()`, `get set()`, `get value()`), und eine Klasseninstanz ist nicht aufrufbar — der erste Klick wirft `TypeError: count is not a function`. Dieselben zwei Zeilen im Paket-`README.md:38-39` benutzen `count.value` und sind korrekt. Die Historie erklärt es: `85af7db` hat `count()` in **beide** READMEs geschrieben, `e7e2e08` hat es nur im Paket-README korrigiert — während `packages/shadow-objects/CHANGELOG.md:119` den Fix als »across README + 4 docs« verbucht. Vorbestehend, aus dem abgeschlossenen Lauf zu `./audit.html`, kein Finding dieses Audits, gefunden am 2026-08-17 vom Planer 12c. Triage: **Paket 12c, Schritt 4d** — dieselbe Datei und derselbe Codeblock wie Schritt 1, und einer der zwei Blöcke, die die Verify-Stufe wirklich ausführt.

- **Der Gloss »(Component Tag)« steht an neun Doku-Stellen**, während die `Konventionen` dieses Laufs »Token (nicht Component Tag)« binden: `docs/getting-started.md:50`, `:111`, `docs/cheat-sheet.md:238`, `docs/guides.md:137`, `:320`, `docs/concepts.md:43`, `docs/api-reference.md:413`, `:441`, `:1453`. Die Pakete 11, 12b und 12d haben ihn an den Zeilen, die sie angefasst haben, stehengelassen. Vorbestehend, gefunden am 2026-08-17 vom Planer 12c. Triage: **Backlog, über Paket 17, Schritt 2.** Ihn nur in der Einstiegsdoku zu entfernen erzeugt genau den halben Zustand, den Paket 12c bei den Registry-Beispielen vermeidet; wer die Entscheidung trifft, stellt alle neun um.
- `ViewComponentError` wird in `docs/api-reference.md:629` und `:681` sowie `docs/cheat-sheet.md:342` (nach Paket 12b, vormals `:325`) als Fangobjekt genannt, ist aber nicht exportiert (`ViewComponent.ts:6`, kein `export`, und `index.ts` reicht nur die Modul-Exporte weiter). Ein `instanceof` ist für Konsumenten unmöglich. Vorbestehend, gefunden am 2026-08-16 vom Planer 12. Triage: Die Doku sagt in Paket **12d**, was geht (`error.name`); die Klasse zu exportieren ist eine API-Änderung und geht in den Backlog. Am 2026-08-17 vom Planer 12b bestätigt (`ViewComponent.ts:6`, `:9`, `index.ts:17`).

- **`ComponentMemory` ist ein Laufzeitexport ohne Typdeklaration.** `index.ts:12` reicht `./view/ComponentMemory.js` als Wert-Export weiter; die Klasse trägt `@internal` (`view/ComponentMemory.ts:22-27`) und das Wurzel-`tsconfig.json:33` setzt `stripInternal: true`, also enthält `dist/src/view/ComponentMemory.d.ts` **nur** `export interface ComponentState`. Ein TypeScript-Konsument, der `import {ComponentMemory} from '@spearwolf/shadow-objects'` schreibt, bekommt einen Fehler; zur Laufzeit ist die Klasse da. Am 2026-08-17 vom Planer 12d gefunden und an beiden Enden nachgeprüft. Triage: **dem Nutzer vorgelegt** — beide Auswege sind API-Änderungen (den Re-Export aus `index.ts` streichen, oder das `@internal` fallen lassen und die Klasse dokumentieren) und liegen damit außerhalb dessen, was ein Doku-Paket entscheiden darf. Vorschlag: Re-Export streichen und als Backlog-Zeile führen; die Klasse ist Interna des Change-Trail-Aufbaus, kein Konsumentenwerkzeug, und der Typ hat nie existiert. **Am 2026-08-17 vom Nutzer so entschieden** — die Zeile steht unter »Entscheidungen«, der Re-Export fällt in Paket 16, und die Backlog-Zeile wird in Paket 17 ohne Vorbehalt eingetragen, mit dem Vermerk, daß 16 sie einlöst. **Paket 12d ist davon nicht blockiert** — es schweigt über `ComponentMemory` in jedem Fall, weil die `.d.ts` der Beleg ist und dort nichts steht.

- **`ComponentContext.clear()` und `.destroyComponent()` lassen lebende `ViewComponent`s als Untote zurück.** Am 2026-08-17 vom Planer 12d in einer Sonde gemessen: nach `ctx.clear()` beziehungsweise `ctx.destroyComponent(vc)` meldet der Component `isDestroyed === false`, sein `context` zeigt weiter auf den Context, und jedes `setProperty` gibt `false` zurück und schreibt nichts. `dispose()` macht es richtig und zerstört die Components zuerst (`ComponentContext.ts:539-541`). Der Code kennt die Lage und arbeitet um sie herum (`:314-315`, `changeOrder`-Guard). Vorbestehend, kein Finding dieses Audits. Triage: Paket **12d** schreibt es als Verhalten hin, damit niemand `isDestroyed` glaubt; ob `clear()` seine Components ablösen soll, ist eine Verhaltensänderung an der öffentlichen API und geht als Zeile in den Backlog (**Paket 17, Schritt 2**; bis 2026-08-17 Paket 12c, Schritt 7).

- **Fünf Abschnitte von `docs/api-reference.md` hat kein Paket dieses Laufs gegen den Code gehalten:** §Shadow Object Creation API, §Registry, §Namespacing and Contexts, §Kernel und §Advanced. **Zeilen am 2026-08-17 vom Planer 12c nachgemessen, die Datei ist auf 2192 Zeilen gewachsen:** §Shadow Object Creation API (`:40`–`:410`), §Registry (`:411`–`:565`), §Kernel (`:1845`–`:1954`), §Advanced (`:1955`–`:2192`) — zusammen rund **1010** der 2192 Zeilen, also mehr als die Hälfte, nicht 800 von 1937. §Namespacing and Contexts ist kein `##`-Abschnitt mehr, sondern steht als `### Namespacing and Contexts` bei `:1807` **innerhalb** von `## Web Components` und damit im Bereich, den 12b gelesen hat; ob 12b ihn mitgenommen hat, prüft Paket 16 zuerst. Zug 0 des Planers 12 hat §Web Components und die View-API gelesen, nicht diese. Sie beschreiben die Shadow-Environment-Seite und liegen damit außerhalb des View-Layer-Audits; zwei Stellen darin sind trotzdem fällig, weil sie Gegenstellen zu Berichtigungen des Cheat Sheets sind (Paket 12d, Schritt 4a), und eine dritte gehört zum Importmuster von 12c (`:246`). Am 2026-08-17 vom Planer 12d festgestellt. Triage: Backlog, Eintrag über **Paket 17, Schritt 2** (bis 2026-08-17 Paket 12c, Schritt 7). Der Hinweis auf die »zwei bereits belegten Fehler« ist am 2026-08-17 hinfällig geworden — Paket 12d hat beide mitgenommen, siehe die Ergebniszeile von Paket 16.

- **Die vierzehn Konstanten aus `elements/constants.ts` stehen in keiner Referenz.** `SHAE_ENT`, `SHAE_PROP`, `SHAE_WORKER` und die zehn `ATTR_*` sind über `index.ts:2` öffentlich; `grep` über `docs/api-reference.md` und `docs/cheat-sheet.md` liefert am 2026-08-17 für alle vierzehn null Treffer. Elementseite und damit Territorium von Paket 12b, das geschlossen ist. Vorbestehend, gefunden vom Planer 12d. Triage: Backlog, Eintrag über **Paket 17, Schritt 2** (bis 2026-08-17 Paket 12c, Schritt 7) — dieselbe Instrumentenlücke, aus der 12b `#### Driving the Lookup by Hand` gebaut hat, nur eine Runde später bemerkt.
- `RemoteWorkerEnv.destroy()` steigt ohne vorhandenen Worker sofort aus, **ohne** `#isDestroyed` zu setzen (`RemoteWorkerEnv.ts:266-267`) — `new RemoteWorkerEnv(); destroy(); start();` startet also einen Worker, und `isDestroyed` bleibt `false`. Und ein `destroy()` während eines laufenden `start()` bricht den `#workerFailure`-Controller nicht ab und emittiert kein `WorkerLoaded`, `workerLoaded` bleibt für immer pending (`:266-279` gegen `:111-139`) — genau die Linie, die die Doku bei `ShadowEnv.destroy()` ausdrücklich zieht. Vorbestehend, gefunden am 2026-08-16 vom Planer 12, am 2026-08-17 vom Planer 12b an der Fundstelle bestätigt (`RemoteWorkerEnv.ts:266-267` gegen `:272`; Abort nur in `handleWorkerFailure`, `:305`). Triage: als bekannte Grenze in Paket **12d** dokumentiert, Korrektur in den Backlog.
- `Element.moveBefore` ist für ein `<shae-ent>` kein atomarer Umzug: die Klasse definiert kein
  `connectedMoveCallback`, also fällt der Browser auf `disconnectedCallback` + `connectedCallback`
  zurück und die Entity wird zerstört und unter derselben uuid neu erzeugt — im Change Trail ein
  Abriss statt einer Bewegung. Gemessen am 2026-08-16 vom Planer 7 in Chromium. Vorbestehend,
  kein Finding dieses Audits, eine Zusage, die niemand gegeben hat. Triage: geht in den Backlog.

## Verify-Kommandos

Nach jedem Paket, aus dem Repo-Wurzelverzeichnis:

```
pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test
```

`pnpm build` läuft als Vorstufe von `typecheck` ohnehin mit. Turbo cached
aggressiv — bei unerklärlich grünen Läufen `--force` nachschieben.

## Pakete

### [x] 1. Lint-Baseline und Playwright-Artefakte

- Findings: TEST-007 (info)
- Ziel: `pnpm lint` ist grün, und ein Testlauf hinterlässt keine Fehlerkontexte, die einen späteren Leser in die Irre führen.
- Hash: `b9a708e`
- Ergebnis: 1 Runde · TEST-007 behoben · Biome nimmt `*audit*.html` im Repo-Wurzelverzeichnis aus, Playwright läuft mit `preserveOutput: 'failures-only'`, `test` und `test:ui` räumen `test-results/` vorher weg · Verify grün: lint rc=0, typecheck ✓, test:ci 294, e2e 324
- Nebenbefunde: `biome.json:2` — `$schema` zeigt auf 2.4.14, installiert ist Biome 2.5; `biome.json:56` — eine als DEPRECATED gemeldete Regel. Beides erzeugt die zwei verbleibenden Lint-Infos und stammt nicht aus diesem Lauf. `packages/shadow-objects-e2e/package.json` — das `clean`-Skript benutzte `rimraf`, ohne es zu deklarieren; die neue devDependency hat das mit erledigt.
- Folgen: —
- Triage der Nebenbefunde (2026-08-16, Planer Paket 2): die zwei `biome.json`-Infos sind vorbestehend, Schweregrad Info, und stehen unter »Vorbestehende Fehler« — sie bleiben draußen und gehen in den Backlog. Der `rimraf`-Punkt ist mit Paket 1 erledigt, nichts offen.

<details>
<summary>Detailplan Paket 1</summary>

- Dateien: `biome.json`, `packages/shadow-objects-e2e/playwright.config.ts`, `packages/shadow-objects-e2e/package.json`, `CHANGELOG.md` (Repo-Wurzel)
- Vorgehen:
  1. In `biome.json` unter `files.includes` den Eintrag `"!audit.html"` durch ein Muster ersetzen, das jeden Audit-Report im Repo-Wurzelverzeichnis erfasst — sowohl `audit.html` als auch `view-layer-audit.html`. Diese Dateien sind generierte Reports und kein Projektcode. Danach muss `pnpm lint` ohne Fehler, Warnungen und Infos durchlaufen; solange noch Diagnosen aus einer der beiden HTML-Dateien kommen, greift das Muster nicht.
  2. In `packages/shadow-objects-e2e/playwright.config.ts` die Option `preserveOutput: 'failures-only'` ausdrücklich setzen (direkt neben `reporter`), damit Artefakte grüner Tests gar nicht erst liegen bleiben. Ein kurzer Kommentar darüber, warum das ausdrücklich dasteht: ein Fehlerkontext mit frischem Zeitstempel sieht aus wie ein aktueller Fehler, auch wenn er aus einem Lauf stammt, der nur eine Teilmenge der Specs ausgeführt hat.
  3. Im `scripts`-Block von `packages/shadow-objects-e2e/package.json` das `test`-Skript so erweitern, dass `test-results` vor jedem Lauf entfernt wird. Dafür dasselbe Werkzeug verwenden, das das vorhandene `clean`-Skript desselben Pakets benutzt (`rimraf`), und prüfen, ob es in diesem Paket auflösbar ist — falls nicht, gehört es als `catalog:`-Referenz in die `devDependencies` des Pakets, mit dem Versionseintrag im `catalog:`-Block von `pnpm-workspace.yaml`. Niemals eine Version direkt in die `package.json` schreiben. Dasselbe für `test:ui`.
  4. Die vorhandenen Altartefakte einmalig entfernen: den Inhalt von `packages/shadow-objects-e2e/test-results/` und `packages/shadow-objects-e2e/playwright-report/`. Beide Verzeichnisse sind gitignored, das ist also kein Teil des Diffs, sondern eine Aufräumaktion im Arbeitsbaum.
  5. In der `CHANGELOG.md` im Repo-Wurzelverzeichnis einen datierten Abschnitt für 2026-08-16 anlegen (oder an einen bereits vorhandenen mit diesem Datum anhängen) mit je einem Stichpunkt zur Biome-Ausnahme und zum Aufräumen der Playwright-Ausgabe. Die Paket-`CHANGELOG.md` wird hier nicht angefasst — es ändert sich nichts an `@spearwolf/shadow-objects` selbst.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test` — danach zusätzlich prüfen, dass `packages/shadow-objects-e2e/test-results/` nach dem grünen Lauf leer oder nicht vorhanden ist.
- Commit: `chore(e2e): exclude audit reports from biome and clear stale playwright artifacts (TEST-007)`

</details>

### [x] 2. Struktur-Assertions für die shae-worker-Seite

- Findings: TEST-001 (high)
- Ziel: Die anspruchsvollste Markup-Struktur des Repos prüft ihre eigenen Eltern-Kind-Beziehungen, Slot-Projektionen und Namespace-Grenzen, statt sie nur aufzubauen.
- Hash: `7b94830`
- Ergebnis: 2 Runden · TEST-001 behoben · 19 neue Test-IDs, E2E 362 statt 324 · alle 13 Entities der Beziehungstabelle sind abgedeckt, kein Scheingrün · Verify grün: lint rc=0, typecheck ✓, test:ci 294, e2e 362
- Hinweis für Paket 9: Die Beziehungstabelle unten ist die Messlatte des Umbaus. Der härteste Fall ist `ent0_3_1 → ent0` — zwei Shadow-Grenzen, zwei Slots, zwei fremde Namespaces. Das Auswahlkriterium der Vorfahrensuche ist Namespace-Ungleichheit (`requester.ns !== this.ns` in `ShaeEntElement.ts:395`), nicht die Frage, ob ein Namespace ein Environment hat.
- Nebenbefunde: `packages/shadow-objects-e2e/TEST-PLAN.md:53-58` — §1.2 »Two tests that never run« ist tot, beide Tests stehen in `tests/shae-worker.spec.ts:9-10`; vorbestehend. `packages/shadow-objects-e2e/src/shae-worker.js:127` — `waitUntil` und `testAsyncAction` teilen sich denselben 5000-ms-Default, im Timeout-Fall gewinnt der äußere Wächter und verschluckt die aussagekräftige Meldung; betrifft das ganze Testframework der Seite, nicht dieses Paket.
- Folgen: —
- Triage der Nebenbefunde (2026-08-16, Planer Paket 3): beide vorbestehend, beide unter »Vorbestehende Fehler« eingetragen. Die Dokumentationsdrift in `TEST-PLAN.md` (§1.2 und H-4) räumt Paket 12 mit; der geteilte 5000-ms-Default bleibt draußen und geht in den Backlog.

<details>
<summary>Detailplan Paket 2</summary>

**Abgleich (2026-08-16).** TEST-001 unverändert. `packages/shadow-objects-e2e/pages/shae-worker.html:13-27` baut die beschriebene Struktur unverändert auf, `tests/shae-worker.spec.ts:5-15` listet neun Test-IDs, alle zum Worker-Start und zu `contextcreated`. Keine Assertion berührt eine Beziehung.

**Gemessener Ist-Zustand.** Die Seite wurde in Chromium geladen und für jedes `<shae-ent>` `entParentNode`, `viewComponent.parent.uuid` und — für den lokalen Env über `worker1.shadowEnv.envProxy.kernel` — `parentUuid` im Kernel ausgelesen. View-Seite und Kernel stimmen überein. Das ist die Tabelle, die das Paket festnagelt:

| Element | Fundort | `ns` | Erwarteter Elternteil | Warum bemerkenswert |
|---|---|---|---|---|
| `ent0` | Light DOM | global | Wurzel | oberste Ebene |
| `ent0_1` | Light DOM | global | `ent0` | Normalfall |
| `ent1` | Light DOM | `local` | Wurzel | DOM-Elternteil `ent0` ist global — Namespace-Grenze |
| `ent0_2` | Light DOM | global | `ent0` | überspringt die lokale Ebene `ent1` |
| `foo` | Light DOM | global | `ent0` | dito |
| `ent1_1` | Light DOM | `local` | `ent1` | Normalfall |
| `ent-a` | Shadow Root des äußeren Hosts | `local` | `ent1` | über die Shadow-Grenze zum Light-DOM-Vorfahren des Hosts |
| `ant-b` | Shadow Root des äußeren Hosts | `local` | `ent1` | dito, dieses Entity enthält den `<slot>` |
| `ent1_2_1` | Light-Kind des äußeren Hosts | `local` | `ant-b` | Slot-Projektion: bindet an das Shadow-Entity mit dem Slot |
| `ent1_3_2` | Light-Kind des inneren Hosts | `local` | `ant-b` | zwei Slot-Sprünge, dazwischen eine fremde Namespace-Ebene |
| `ent0_3_1` | Light-Kind des inneren Hosts | global | `ent0` | zwei Shadow-Grenzen, zwei Slots, zwei fremde Namespace-Ebenen — der härteste Fall des Repos |
| `iso-a` | Shadow Root des inneren Hosts | `isolated` | Wurzel | Namespace ohne `<shae-worker>` |
| `iso-b` | Shadow Root des inneren Hosts | `isolated` | Wurzel | dito, enthält den inneren `<slot>` |

**Fund (Fixture, kein Produktdefekt).** Der innere `<element-with-shadow-dom>` trägt kein `ns`-Attribut, und das Template in `src/shae-worker.js:30-33` interpoliert `ns="${ns}"` ungeprüft. Aus `getAttribute('ns') === null` wird dadurch der Namespace-String `"null"` — ein dritter Namespace, den niemand gemeint hat und für den kein `<shae-worker>` existiert. Die vom Audit beschriebene Abfolge global/local/global gibt es also nicht; die inneren Shadow-Entities landen in einem Env-losen Namespace. Verhalten bleibt in diesem Paket, wie es ist — der Namespace wird nur ehrlich benannt (`isolated`) und der Stringify-Unfall im Template abgestellt. Kein roter Test.

- Dateien: `packages/shadow-objects-e2e/public/mod-structure.js` (neu), `packages/shadow-objects-e2e/pages/shae-worker.html`, `packages/shadow-objects-e2e/src/shae-worker.js`, `packages/shadow-objects-e2e/tests/shae-worker.spec.ts`, `packages/shadow-objects-e2e/TEST-PLAN.md`, `CHANGELOG.md` (Repo-Wurzel)
- Vorgehen:
  1. `packages/shadow-objects-e2e/public/mod-structure.js` anlegen. Ein einziges Shadow Object unter dem Token `structure-observer`, gebaut wie `observer` in `public/mod-dynamic-dom.js:38-58`: es nimmt `{entity, dispatchMessageToView, onViewEvent}`, hört auf `onViewEvent((type, data) => …)` und antwortet auf `type === 'requestSnapshot'` mit `dispatchMessageToView('snapshot', {round: data?.round, entities})`. `entities` entsteht aus `entity.kernel.getEntityGraph()`, rekursiv flachgeklopft zu `{token, uuid, parentUuid}` je Knoten — `getEntityGraph()` liefert Knoten der Form `{token, entity, props, children}`, und `entity` ist eine Kernel-Instanz, die den Structured Clone nicht überlebt. Also ausschließlich `node.entity.uuid` und `node.entity.parentUuid` übernehmen, nie den Knoten selbst. Das Modul hält keinen Modulzustand: es liest den Kernel bei jeder Anfrage frisch. Kommentar im Kopf, warum der Kernel gefragt wird und nicht die View-Seite — die View-Seite kennt ihre eigene Erwartung, der Kernel kennt das Ergebnis.
  2. In `pages/shae-worker.html` zwei Beobachter-Entities einhängen, unmittelbar vor `<section id="tests">` und damit auf Body-Ebene, wo beide Wurzeln bleiben: `<shae-ent id="observer0" token="structure-observer"></shae-ent>` (global) und `<shae-ent id="observer1" ns="local" token="structure-observer"></shae-ent>`. Sie verändern keine der Beziehungen aus der Tabelle; sie kommen als zusätzliche Wurzeln hinzu.
  3. In `pages/shae-worker.html` am inneren `<element-with-shadow-dom ent-inside="foo" ent-slot-container="bar">` (Zeile 21) drei Attribute setzen: `ns="isolated"`, `ent-inside="iso-a"`, `ent-slot-container="iso-b"`. Der Namespace ist damit derselbe Fall wie bisher — eine Kennung ohne `<shae-worker>` —, heißt aber, wie er gemeint ist. Die Umbenennung löst außerdem die doppelte `id="foo"` auf: das Token `foo` gehört dem globalen Light-DOM-Entity und dem Shadow Object aus `mod-hello.js`.
  4. In `src/shae-worker.js` das Template von `ElementWithShadowDom` (Zeilen 22-34) so absichern, dass das `ns`-Attribut nur geschrieben wird, wenn der Host eines hat — etwa über eine lokale Konstante, die bei `ns == null` den leeren String liefert und sonst das fertige Attribut samt führendem Leerzeichen, eingesetzt an beiden `<shae-ent>`-Stellen des Templates. Ein kurzer Kommentar dazu: ein fehlendes Attribut darf nicht als Namespace `"null"` im Shadow Tree landen.
  5. In `src/shae-worker.js` nach dem bestehenden `worker1-env-ready` den Strukturteil anhängen. Zuerst die Zugriffshelfer, exakt so, weil der innere Host ein Light-DOM-Kind des äußeren ist: `const outerHost = document.querySelector('element-with-shadow-dom');`, `const innerHost = outerHost.querySelector('element-with-shadow-dom');`, `const sd = (host, id) => host.shadowRoot.getElementById(id);`. Dann `const MODULE_URL = '/mod-structure.js';` (oben bei den Imports) und `await testAsyncAction('shae-worker-import-structure-module', () => Promise.all([worker0.importScript(MODULE_URL), worker1.importScript(MODULE_URL)]))`. Dass ein zweites Modul neben dem über `src="/mod-hello.js"` geladenen in denselben Worker importiert werden kann, ist nachgemessen und funktioniert.
  6. Je Env eine Snapshot-Funktion nach dem Muster aus `src/dynamic-dom.js:56-67`: `on(observerVC, 'snapshot', …)` aus `@spearwolf/eventize` sammelt die Antworten, dann `await shadowEnv.syncWait()`, `observerVC.dispatchShadowObjectsEvent('requestSnapshot', {round})`, nochmals `await shadowEnv.syncWait()`, dann `waitUntil` auf die Runde. Der Doppel-Sync ist kein Aberglaube: der erste schiebt die aufgelaufenen Änderungen raus, der zweite trägt die Anfrage nach. Beobachter sind `document.getElementById('observer0').viewComponent` für den globalen und `document.getElementById('observer1').viewComponent` für den lokalen Env. Die beiden Snapshots unter `shae-worker-global-snapshot` und `shae-worker-local-snapshot` mit `testAsyncAction` holen.
  7. Einen View-seitigen Helfer bauen, der eine Element-Referenz auf ihren Snapshot-Eintrag abbildet: `const entry = (snap, el) => snap.entities.find((e) => e.uuid === el.uuid);` — die Zuordnung läuft über `uuid`, nicht über `token`, weil die Frage genau die nach der Eltern-UUID ist.
  8. Die Vollständigkeit prüfen, mit `testBooleanAction`: `shae-worker-global-entities-reached-the-worker` — für `ent0`, `ent0_1`, `ent0_2`, `foo`, `ent0_3_1`, `observer0` liefert `entry(globalSnap, el)` je einen Eintrag; `shae-worker-local-entities-reached-the-worker` — dasselbe für `ent1`, `ent1_1`, `sd(outerHost, 'ent-a')`, `sd(outerHost, 'ant-b')`, `ent1_2_1`, `ent1_3_2`, `observer1`.
  9. Die Beziehungen einzeln prüfen, je ein `testBooleanAction` gegen `entry(snap, el).parentUuid`, mit den IDs in genau dieser Schreibweise und den Erwartungen aus der Tabelle: `shae-worker-ent0-is-root` (`parentUuid == null`), `shae-worker-ent0_1-parent-is-ent0`, `shae-worker-ent0_2-parent-is-ent0`, `shae-worker-foo-parent-is-ent0`, `shae-worker-ent0_3_1-parent-is-ent0`, `shae-worker-ent1-is-root`, `shae-worker-ent1_1-parent-is-ent1`, `shae-worker-ent-a-parent-is-ent1`, `shae-worker-ant-b-parent-is-ent1`, `shae-worker-ent1_2_1-parent-is-ant-b`, `shae-worker-ent1_3_2-parent-is-ant-b`. Über die vier Fälle mit Shadow-Grenze oder Slot je ein Kommentar, der den Auflösungsweg benennt — was hier steht, ist nicht ableitbar, sondern gemessen.
  10. Die Namespace-Grenze prüfen: `shae-worker-isolated-ns-entities-are-roots` — `sd(innerHost, 'iso-a')` und `sd(innerHost, 'iso-b')` haben `entParentNode == null` und `viewComponent.parent == null`; `shae-worker-isolated-ns-entities-reach-no-worker` — ihre `uuid` taucht weder im globalen noch im lokalen Snapshot auf.
  11. Den Abgleich zwischen beiden Seiten prüfen: `shae-worker-view-and-worker-agree` — für jedes der 13 Entities aus den beiden bedienten Namespaces gilt `el.viewComponent.parent?.uuid === entry(snap, el).parentUuid` (beide Seiten `undefined` bei Wurzeln). Das ist die Klammer, die die elf Einzelfälle davor gegen eine View-Seite absichert, die etwas anderes glaubt als der Kernel.
  12. In `tests/shae-worker.spec.ts` die 19 neuen IDs an das Array anhängen, in der Reihenfolge, in der die Seite sie schreibt: `shae-worker-import-structure-module`, `shae-worker-global-snapshot`, `shae-worker-local-snapshot`, `shae-worker-global-entities-reached-the-worker`, `shae-worker-local-entities-reached-the-worker`, `shae-worker-ent0-is-root`, `shae-worker-ent0_1-parent-is-ent0`, `shae-worker-ent0_2-parent-is-ent0`, `shae-worker-foo-parent-is-ent0`, `shae-worker-ent0_3_1-parent-is-ent0`, `shae-worker-ent1-is-root`, `shae-worker-ent1_1-parent-is-ent1`, `shae-worker-ent-a-parent-is-ent1`, `shae-worker-ant-b-parent-is-ent1`, `shae-worker-ent1_2_1-parent-is-ant-b`, `shae-worker-ent1_3_2-parent-is-ant-b`, `shae-worker-isolated-ns-entities-are-roots`, `shae-worker-isolated-ns-entities-reach-no-worker`, `shae-worker-view-and-worker-agree`.
  13. In `packages/shadow-objects-e2e/TEST-PLAN.md` die zwei Stellen richtigstellen, die dieses Paket falsch macht: die Zeile zu `shae-worker.spec.ts` in der Tabelle unter §1 (Fallzahl und Beschreibung) und den Stichpunkt zu `pages/shae-worker.html` unter §1.1 »Fixture code that is loaded but never asserted« — die Struktur ist danach geprüft und gehört dort nicht mehr hin. Der Rest des Dokuments wird nicht angefasst.
  14. In der `CHANGELOG.md` im Repo-Wurzelverzeichnis einen Stichpunkt im Abschnitt zum 2026-08-16 ergänzen: die shae-worker-Seite prüft ihre Entity-Struktur über zwei Worker-Snapshots. Die Paket-`CHANGELOG.md` bleibt unberührt — an `@spearwolf/shadow-objects` ändert sich nichts.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`. Erwartung: `test:ci` unverändert 294, e2e 362 statt 324 (19 neue IDs × 2 Browser). Weicht die Zahl ab, fehlt eine ID im Spec-Array. Zusätzlich: kein Test darf über `knownFailures` grüngeschrieben werden — schlägt eine Beziehung aus der Tabelle fehl, ist das ein Fund und gehört in diesen Plan, nicht in `KNOWN-DEFECTS.md`.
- Commit: `test(e2e): assert the entity structure of the shae-worker page (TEST-001)`
- Verlauf des Laufs: eingedampft in die Ergebniszeile oben; Zug 0 als einziger erhalten, weil die Messung dort entstand.
  - Zug 0 (2026-08-16, Planer): TEST-001 gegen die Fundstelle geprüft — unverändert. Struktur der Seite in Chromium ausgemessen (View-Seite und lokaler Kernel), Beziehungstabelle oben ist Messwert. Snapshot-Round-Trip über den entfernten Worker gegen ein zweites, nachgeladenes Modul verifiziert. Ein Fixture-Fund: der innere Host erzeugt den Namespace `"null"`.

**Finding TEST-001 (high) — Volltext**

*Titel:* Shadow-DOM- und Slot-Struktur in shae-worker.html tatsächlich prüfen

*Fundstelle:* `packages/shadow-objects-e2e/pages/shae-worker.html:14-27`, `tests/shae-worker.spec.ts:5-16`

*Beschreibung:* Die Seite baut die mit Abstand anspruchsvollste Struktur des gesamten Repos auf: zwei ineinander verschachtelte Elemente mit Shadow Root, in deren Shadow Trees jeweils zwei `<shae-ent>` liegen, davon eines mit `<slot>`, dazu Light-DOM-Entities, die in diese Slots projiziert werden, und über alledem zwei Namespaces im Wechsel — global, local, global. Die zugehörige Spec listet neun Testnamen, und alle neun betreffen den Start der beiden Worker und das `contextcreated`-Event. Keine einzige Assertion prüft eine Eltern-Kind-Beziehung, eine Slot-Projektion oder eine Namespace-Grenze. Die Struktur ist damit reine Dekoration: Sie belegt Rechenzeit in zwei Browsern und würde eine Regression in genau dem Mechanismus, für den sie gebaut wurde, geräuschlos passieren lassen. Eine Nachmessung zeigt, dass das Verhalten heute korrekt ist — ein geslottetes Light-DOM-Entity bindet sich an das Shadow-DOM-Entity mit dem Slot, dieses wiederum an den Light-DOM-Vorfahren des Hosts. Genau dieses nicht offensichtliche, richtige Verhalten ist ungeschützt.

*Empfehlung:* Die Seite um Assertions ergänzen, die ihre eigene Struktur abfragen: für jedes Entity die erwartete Eltern-UUID im Worker-Snapshot, für `ent1_2_1` und `ent0_3_1` die Auflösung über die Slot-Projektion, für die Elemente mit abweichendem `ns` die Erwartung, dass sie Wurzeln bleiben. Der Snapshot-Mechanismus aus `dynamic-dom.js` und `upgrade-timing.js` ist dafür bereits vorhanden und muss nur angewendet werden.

*Beleg des Audits:* Nachgemessen mit einem Host, dessen Shadow Root `<shae-ent><slot></shae-ent>` enthält: `PROBE-H {"slottedParent":"sd-inner","sdInnerParent":"light-outer","slottedVCParent":"sd-inner"}` — korrekt, und durch keinen Test abgesichert.

*Anmerkung des Planers:* Der Audit-Text vermutet für `ent0_3_1` die Auflösung über die Slot-Projektion auf das innere Shadow-Entity. Gemessen wird `ent0`: die inneren Shadow-Entities liegen in einem fremden Namespace, `ent0_3_1` läuft an ihnen vorbei. Verhalten korrekt, Erwartung des Audit-Textes an dieser einen Stelle zu kurz gegriffen.

</details>

### [x] 3. Typkonvertierung tabellengetrieben absichern

- Findings: TEST-006 (medium)
- Ziel: Jeder der 29 Konvertierungszweige und jedes der 42 Typwörter hat einen Testfall, bevor an ihnen gearbeitet wird.
- Bereich: `packages/shadow-objects-testing/test/`, Bezug `src/elements/ShaePropElement.ts:20-63`
- Hängt ab von: —
- Hash: `e3bad5a`
- Ergebnis: 3 Runden · TEST-006 behoben · `packages/shadow-objects-testing/test/prop-element-types.test.js`, 104 Tests über 42 Typnamen, 18 Trennmuster-Fälle, 15 fehlertolerante und 5 werfende Fehleingaben, 13 `no-trim`-Fälle · alle Zweigkörper haben mindestens einen unterscheidungsscharfen Fall (14/14 `\W+`, 6/6 `\s+`) · Verify grün: lint rc=0, typecheck ✓, test:ci 440 über drei Pakete (`shadow-objects-testing` 145), e2e 362, kein »Errors«-Block, auch unter `--sequence.shuffle`
- Hinweis: Sicherungsnetz für Paket 5 und Paket 11. Kein Verhalten geändert, `packages/shadow-objects/src/` unberührt.
- Nebenbefunde: Fünf Alias-Marken (`string[]`, `hexadecimal[]`, `octal[]`, `binary[]`, `boolean[]`, dazu `integer[]`) haben keinen eigenen unterscheidungsscharfen Fall, weil sie sich den Zweigkörper mit einer geprüften Kurzform teilen — für Paket 11 mit seinen 42 Map-Schlüsseln ein Restrisiko, kein Blocker. `packages/shadow-objects-testing/test/prop-element-types.test.js:25-33` — der lokale `mount`-Helfer dupliziert `packages/shadow-objects-testing/src/render.js` und überschreibt dabei seine Modulvariable; Paket 4 hat das als Aufräumpunkt notiert.
- Triage der Nebenbefunde (2026-08-16, Planer Paket 4): Die fünf Alias-Marken sind ein Symptom der Aliasbildung im `switch` und kein eigener Mangel — sie bleiben ungeprüft, bis Paket 11 sie als eigene Map-Schlüssel sichtbar macht; dort ist es ein Hinweis, kein Blocker. Der duplizierte `mount`-Helfer ist eine echte Folge aus Paket 3 und wird von Paket 4a behoben: `mount`/`unmountAll` ziehen nach `packages/shadow-objects-testing/src/mount.js`, `withSwallowedErrors` nach `src/withSwallowedErrors.js`, und `prop-element-types.test.js` benutzt beide. Der Hinweis auf `document.createElement` im Auftrag zu Paket 4 ist vorbestehend (DEFECT-1 in `packages/shadow-objects-e2e/KNOWN-DEFECTS.md`, gefunden am 2026-08-02) und bleibt draußen; er steht als Kommentar am geteilten `mount`, weil er die Begründung für den Markup-Pfad ist.
- Folgen: Paket 5 zieht diese Testfälle mit: `falsy values assigned through the JS property are lost` (wird durch `??` gegenstandslos), `a whitespace only value is undefined once trimmed` (Normalisierung wandert nach `#readValueAttribute`), die vier `${type} throws on the property path`-Fälle für `bigint`, `json`, `bigint64array`, `biguint64array` (kein Wurf mehr, Warnung und `undefined`), `a throw at upgrade time leaves the element dead` (entfällt) und `a throw after upgrade keeps the previous value and recovers` (wird zu »warnt und setzt `undefined`«). Paket 11 löst den `default:`-Zweig auf, den diese Spec bewusst nicht anspricht — er ist über den Attributpfad unerreichbar, weil `#readTypeAttribute` unbekannte Namen vorher wegfiltert.
- Triage der Folgen (2026-08-16, Planer Paket 5): echte Folge, vollständig, Ziel Paket 5 — die Liste ist gegen `packages/shadow-objects-testing/test/prop-element-types.test.js` nachgeprüft und trifft alle sechs genannten Fälle. Zwei Ergänzungen stehen im Detailplan zu Paket 5: `falsy values assigned through the JS property` mountet künftig ohne `type`, weil ein gesetzter Typ auf den Leerstring angewendet würde, und `a whitespace only value` endet bei `''` statt bei `undefined`. Der Kommentar an `value="" with type="number" is undefined` fällt mit, weil er die Normalisierung an der alten Stelle beschreibt.

<details>
<summary>Detailplan Paket 3</summary>

**Abgleich (2026-08-16).** TEST-006 unverändert. Die Typliste steht in
`packages/shadow-objects/src/elements/ShaePropElement.ts:20-63`, der `switch` in
`:171-307`, alles innerhalb eines `createEffect` ab `:159`. Abgedeckt sind heute
drei Typen, alle in `packages/shadow-objects-e2e/pages/bundle.html:21,25,26` und
geprüft in `src/bundle-tests.js:49-56`: ein `shae-prop` ohne `type` (Ergebnis
`'bar'`), `type="boolean"` und `type="number[]"`. `type="number"` kommt in
`pages/async-events.html` und `pages/multi-env.html` vor, wird dort aber nur als
Transportwert benutzt, nicht als Konvertierung geprüft.

**Zahlen korrigiert.** Der Audit-Text nennt 40 Typnamen, 25 Zweige und zwölf
TypedArray-Varianten. Ausgezählt sind es 42 Typnamen, 42 `case`-Marken, 29
Zweigkörper (plus `default:`) und elf TypedArray-Varianten. Der Plan arbeitet mit
den ausgezählten Werten.

**Wo die Spec liegt.** `packages/shadow-objects-testing/test/prop-element-types.test.js`,
also echtes Chromium: Die Konvertierung ist nirgends als Funktion exportiert und
nur über den Attributpfad des Custom Element erreichbar — Upgrade, `attributeChangedCallback`
und die Reaktionsschlange gehören damit zum Testpfad, und genau die bildet happy-dom
nicht verlässlich ab. Dieselbe Datei liegt neben `prop-element-host.test.js` und ist
das Paket, das Paket 4 ohnehin ausbaut.

**Gemessener Ist-Zustand.** Alle Tabellen unten sind nachgemessen, zweifach: einmal
über den aus der Quelle extrahierten `switch` isoliert in Node, einmal über das
gebaute `dist/bundle.js` in echtem Chromium. Beide Läufe stimmen Zeile für Zeile
überein. Die vollständige Spec wurde in einem Wegwerf-Vitest-Projekt gegen dieselbe
Browser-Konfiguration ausgeführt: 97 Tests, alle grün.

**Fund 1 — ein Wurf beim Upgrade tötet das Element dauerhaft.** VIEW-005
beschreibt, dass `valueOut$` den vorherigen Wert behält. Das gilt nur, wenn das
Element bereits fertig upgraded ist. Steht der fehlerhafte Wert schon im Markup, läuft
der Wurf aus dem `batch()` des Konstruktors (`:313-318`) heraus, der Effect wird nie
wieder ausgeführt, und das Element bleibt für immer bei `undefined` — auch nach
einem gültigen `setAttribute('value', …)`. Andere Elemente auf der Seite bleiben
unversehrt. Fundstelle: `ShaePropElement.ts:159-311` und `:313-318`. Gehört zu
Paket 5, dessen `try`/`catch` beide Varianten mit erledigt.

**Fund 2 — es sind drei werfende Zweige, nicht zwei.** VIEW-005 nennt `json` und
`bigint` und hält die übrigen für fehlertolerant. `bigint64array`
(`ShaePropElement.ts:289`) und `biguint64array` (`:293`) rufen `BigInt(v)` je
Element auf und werfen bei jedem nicht konvertierbaren Teilstring genauso.
Gemessen: `type="bigint64array" value="1 x 3"` wirft `SyntaxError`. Paket 5 muss
diese beiden Zweige mit absichern.

**Fund 3 — der `default:`-Zweig ist unerreichbar.** `type$` wird ausschließlich von
`#readTypeAttribute` (`:377-388`) geschrieben, und das prüft bereits gegen `TYPES`
und warnt. Der `default:`-Zweig in `:300-306` kann nie laufen; die Warnung dort ist
tot. Fundstelle: `ShaePropElement.ts:300-306`. Gehört zu Paket 11, das den `switch`
ohnehin auflöst.

**Was Paket 5 anfassen wird.** Diese Testfälle der Spec — und nur diese — kippen
mit Paket 5 und müssen dort mitgeändert werden:

| Testfall | Was Paket 5 daraus macht |
|---|---|
| `falsy values assigned through the JS property are lost` | `??` statt `\|\|` — `0`, `false` und `''` überleben, der Fall dreht sich um |
| `a whitespace only value is undefined once trimmed` | Wandert die Leerstring-Normalisierung nach `#readValueAttribute`, greift sie für `"   "` nicht mehr; das Ergebnis wäre `''` statt `undefined`. Paket 5 entscheidet und passt an |
| die drei `throws on the property path`-Fälle | kein Wurf mehr, sondern Warnung über den `ConsoleLogger` und `undefined` |
| `a throw at upgrade time leaves the element dead` | entfällt, Fund 1 ist dann behoben |
| `a throw after upgrade keeps the previous value and recovers` | wird zu »warnt und setzt `undefined`« |

Der Rest der Tabellen bleibt von Paket 5 unberührt. `value=""` bleibt laut
Entscheidung im Plan-Kopf `undefined`; der Testfall dazu bleibt stehen.

- Dateien: `packages/shadow-objects-testing/test/prop-element-types.test.js` (neu), `CHANGELOG.md` (Repo-Wurzel)
- Vorgehen:
  1. `packages/shadow-objects-testing/test/prop-element-types.test.js` anlegen, im Stil von `prop-element-host.test.js`: `expect` aus `@esm-bundle/chai`, `ComponentContext` aus `@spearwolf/shadow-objects`, dazu die Seiteneffekt-Importe `@spearwolf/shadow-objects/shae-ent.js` und `@spearwolf/shadow-objects/shae-prop.js`. `describe`/`it`/`afterEach` kommen aus den Vitest-Globals.
  2. Drei Helfer an den Kopf der Datei. Erstens `esc(value)`, das `&`, `"` und `<` in Entities wandelt — die `json`-Fälle enthalten Anführungszeichen und müssen unbeschädigt im Attribut landen. Zweitens `mount({type, value, noTrim})`, das ein `<div>` erzeugt, per `innerHTML` das Markup `<shae-ent token="probe"><shae-prop name="p" …></shae-prop></shae-ent>` hineinschreibt, den `<div>` an `document.body` hängt und das `<shae-prop>` zurückgibt. Der Container wird in einer Modulvariablen gehalten und in `afterEach` entfernt, danach `ComponentContext.get().clear()`. **Nicht `document.createElement('shae-prop')` benutzen** — die Konstruktoren der Shae-Elemente setzen ein Attribut (`this.style.display = 'contents'`, `ShaePropElement.ts:320`), was die Custom-Elements-Spezifikation verbietet; `createElement` bricht das Upgrade ab und liefert ein nicht aufgewertetes Element. Das ist bekannt und in `packages/shadow-objects-e2e/KNOWN-DEFECTS.md` als DEFECT-1 geführt, gehört nicht in diesen Lauf, ist hier aber die Ursache, warum ausschließlich der Markup-Pfad benutzt wird. Ein kurzer Kommentar an `mount` sagt das.
  3. Dritter Helfer `withSwallowedErrors(fn)`: registriert vor `fn()` einen `window`-Listener auf `error`, sammelt `event.message`, ruft `event.preventDefault()`, entfernt den Listener im `finally` und gibt die gesammelten Meldungen zurück. Ohne diesen Wächter meldet Vitest den Wurf aus der Custom-Element-Reaktion als »Unhandled Error« und der Lauf endet mit rc=1, obwohl alle Tests grün sind — nachgemessen. Kommentar dazu: der Wurf verlässt die Reaktionsschlange nicht als Exception des Aufrufers, sondern als globales `error`-Event.
  4. Vergleichshelfer `check(actual, expected)`. Drei Fälle: Ist `expected` ein `{ctor, items}`-Paar, wird `instanceOf ctor`, dann `length`, dann `Array.from(actual)` gegen `items` geprüft — die Konstruktor-Identität ist Teil der Zusicherung, `deep.equal` allein würde eine `Int8Array` gegen eine `Uint8Array` durchgehen lassen. Ist `expected` `NaN`, wird `Number.isNaN` geprüft. Sonst `deep.equal` für Objekte und Arrays, `equal` für Primitive. Ein `ta(ctor, items)`-Kürzel baut die Paare.
  5. Tabelle A »one case per type name« — je ein `it` pro Zeile, in einer Schleife über das Array, Testname `type="${type}" value="${value}"`. 42 Zeilen, exakt diese Werte:

     | `type` | `value` | erwartetes Ergebnis |
     |---|---|---|
     | `string` | `hello world` | `'hello world'` |
     | `text` | `hello world` | `'hello world'` |
     | `number` | `42.5` | `42.5` |
     | `bigint` | `9007199254740993` | `9007199254740993n` |
     | `float` | `3.14abc` | `3.14` |
     | `int` | `42.9` | `42` |
     | `integer` | `42.9` | `42` |
     | `hex` | `ff` | `255` |
     | `hexadecimal` | `ff` | `255` |
     | `oct` | `17` | `15` |
     | `octal` | `17` | `15` |
     | `bin` | `1011` | `11` |
     | `binary` | `1011` | `11` |
     | `bool` | `YES` | `true` |
     | `boolean` | `no` | `false` |
     | `[]` | `a, b, c` | `['a', 'b', 'c']` |
     | `text[]` | `a-b-c` | `['a', 'b', 'c']` |
     | `string[]` | `foo bar` | `['foo', 'bar']` |
     | `number[]` | `1 -2 3.5` | `[1, -2, 3.5]` |
     | `float[]` | `1.5 -2.5` | `[1.5, -2.5]` |
     | `int[]` | `1 -2` | `[1, -2]` |
     | `integer[]` | `10 20` | `[10, 20]` |
     | `hex[]` | `ff 0a` | `[255, 10]` |
     | `hexadecimal[]` | `ff 0a` | `[255, 10]` |
     | `oct[]` | `17 7` | `[15, 7]` |
     | `octal[]` | `17 7` | `[15, 7]` |
     | `bin[]` | `1011 110` | `[11, 6]` |
     | `binary[]` | `1011 110` | `[11, 6]` |
     | `bool[]` | `yes no on off` | `[true, false, true, false]` |
     | `boolean[]` | `true false 1 0` | `[true, false, true, false]` |
     | `int8array` | `1 2 3` | `Int8Array [1, 2, 3]` |
     | `uint8array` | `1 2 300` | `Uint8Array [1, 2, 44]` |
     | `uint8clampedarray` | `1 2 300` | `Uint8ClampedArray [1, 2, 255]` |
     | `int16array` | `1 2 3` | `Int16Array [1, 2, 3]` |
     | `uint16array` | `1 2 3` | `Uint16Array [1, 2, 3]` |
     | `int32array` | `1 2 3` | `Int32Array [1, 2, 3]` |
     | `uint32array` | `1,2,3` | `Uint32Array [1, 2, 3]` |
     | `float32array` | `1.5 2.5 -3.5` | `Float32Array [1.5, 2.5, -3.5]` |
     | `float64array` | `1.5 -2.5` | `Float64Array [1.5, -2.5]` |
     | `bigint64array` | `1 2 3` | `BigInt64Array [1n, 2n, 3n]` |
     | `biguint64array` | `1 2 3` | `BigUint64Array [1n, 2n, 3n]` |
     | `json` | `{"a":1,"b":[2,3]}` | `{a: 1, b: [2, 3]}` |

     Drei Werte sind bewusst so gewählt und dürfen nicht »geglättet« werden: `uint8array` mit `300` belegt das Überlaufen auf `44`, `uint8clampedarray` mit demselben Wert das Klemmen auf `255`, und `uint32array` mit `1,2,3` belegt, dass `\W+` das Komma genauso trennt wie Whitespace.
  6. Tabelle B »separator patterns« — dieselbe Schleifenform, eigener `describe`-Block. Das ist der Kern des Findings: elf der Zweige trennen an `\W+`, vier an `\s+`, und der Unterschied ist beim Lesen unsichtbar. Über den Block ein Kommentar, der beide Muster benennt. 12 Zeilen:

     | `type` | `value` | Ergebnis | warum |
     |---|---|---|---|
     | `int8array` | `1 -2 3` | `Int8Array [1, 2, 3]`, Länge 3 | `-` ist Trennzeichen, das Vorzeichen fällt weg |
     | `int16array` | `-1 2` | `Int16Array [0, 1, 2]`, Länge 3 | führendes `-` erzeugt einen leeren ersten Eintrag, `Number('')` ist `0` |
     | `int32array` | `1.5 -2.5` | `Int32Array [1, 5, 2, 5]`, Länge 4 | der Dezimalpunkt trennt ebenfalls |
     | `uint32array` | `1;2;3` | `Uint32Array [1, 2, 3]` | jedes Nicht-Wort-Zeichen trennt |
     | `bigint64array` | `1 -2` | `BigInt64Array [1n, 2n]` | Vorzeichen weg |
     | `biguint64array` | `-1 2` | `BigUint64Array [0n, 1n, 2n]`, Länge 3 | `BigInt('')` ist `0n` |
     | `hex[]` | `-ff 0a` | `[NaN, 255, 10]`, Länge 3 | `parseInt('', 16)` ist `NaN` |
     | `[]` | `.a b` | `['', 'a', 'b']` | führendes Nicht-Wort-Zeichen |
     | `[]` | `a, b.` | `['a', 'b', '']` | nachgestelltes Nicht-Wort-Zeichen |
     | `float32array` | `1.5 -2.5` | `Float32Array [1.5, -2.5]`, Länge 2 | Gegenprobe: `\s+`, Vorzeichen und Punkt bleiben |
     | `float64array` | `1.5 -2.5` | `Float64Array [1.5, -2.5]`, Länge 2 | Gegenprobe |
     | `number[]` | `1 -2 3.5` | `[1, -2, 3.5]` | Gegenprobe |
  7. Tabelle C »malformed input that does not throw«, eigener `describe`-Block, 15 Zeilen: `number`/`abc` → `NaN`; `float`/`abc` → `NaN`; `int`/`abc` → `NaN`; `hex`/`zz` → `NaN`; `oct`/`9` → `NaN`; `bin`/`2` → `NaN`; `number[]`/`a b` → `[NaN, NaN]`; `float[]`/`a b` → `[NaN, NaN]`; `int[]`/`a b` → `[NaN, NaN]`; `hex[]`/`zz` → `[NaN]`; `oct[]`/`9` → `[NaN]`; `bin[]`/`2` → `[NaN]`; `int8array`/`a b` → `Int8Array [0, 0]` (der Konstruktor macht aus `NaN` eine `0`); `float32array`/`a b` → `Float32Array [NaN, NaN]`; `bool`/`nonsense` → `false`. Der Unterschied zwischen den letzten beiden Zeilen ist der Grund, warum sie beide dastehen.
  8. Tabelle D »malformed input that throws«, eigener `describe`-Block. Für `bigint`/`abc`, `json`/`{oops` und `bigint64array`/`1 x 3` je ein `it`, das ein Element mit einem gültigen Wert montiert (`{}` für `json`, sonst `1`) und danach `expect(() => { prop.value = <bad>; }).to.throw(SyntaxError)` prüft. Der JS-Property-Pfad ist bewusst gewählt: dort läuft der Effect synchron im Setter und die Exception erreicht den Aufrufer, während sie über `setAttribute` in der Custom-Element-Reaktionsschlange verschwindet und nur als globales `error`-Event auftaucht. Dazu die beiden Markup-Fälle, beide über `withSwallowedErrors` und mit je genau einer gesammelten Meldung:
     - `a throw at upgrade time leaves the element dead`: `mount({type: 'json', value: '{oops'})`, danach `setAttribute('value', '{"a":1}')` — `prop.value` bleibt `undefined`. Kommentar: hält den Ist-Zustand fest, siehe Fund 1.
     - `a throw after upgrade keeps the previous value and recovers`: `mount({type: 'json', value: '{}'})`, dann `setAttribute('value', '{oops')` — `prop.value` bleibt `{}` —, dann `setAttribute('value', '{"z":9}')` — `prop.value` ist `{z: 9}`.
  9. Tabelle E »no-trim«, eigener `describe`-Block, 13 Fälle. `readBooleanAttribute` (`src/utils/attr-utils.ts`) macht aus einem vorhandenen Attribut mit leerem Wert eine `1`, prüft dann gegen `TRUTHY_VALUES`. Also: `no-trim=""`, `"1"`, `"true"`, `"on"`, `"yes"`, `"local"` behalten bei `value="  z  "` den Wert `'  z  '` (sechs Fälle); `no-trim="0"`, `"false"`, `"no"`, `"nonsense"` trimmen weiter zu `'z'` (vier Fälle). Dazu: ohne das Attribut wird getrimmt; `type="number[]"` mit `value=" 1 2 "` und `no-trim=""` ergibt `[0, 1, 2, 0]` — der Split an `\s+` erzeugt vorn und hinten je einen leeren Eintrag; und ein Fall, der `no-trim` zur Laufzeit setzt und wieder entfernt und dabei `'z'` → `'  z  '` → `'z'` durchläuft.
  10. Block »type attribute handling«, 5 Fälle: `type="  NUMBER[] "` ergibt `[1, 2]` (der Name wird getrimmt und kleingeschrieben, `:378`); ein unbekannter Typname lässt den String unangetastet (`type="nonsense"`, `value="1 2"` → `'1 2'`) — `#readTypeAttribute` warnt und setzt `type$` auf `undefined`; ohne `type` bleibt `'42'` ein String; ein Wechsel des `type`-Attributs zur Laufzeit rechnet neu (`string` → `number[]`); `removeAttribute('value')` setzt den Wert auf `undefined`.
  11. Block »falsy values«, 5 Fälle, der Übergabepunkt an Paket 5: `value=""` mit `type="number"` ist `undefined`; `value="0"` mit `type="number"` ist `0`, weil der String `"0"` truthy ist; `value="   "` ohne Typ ist `undefined`; über die JS-Property gehen `0`, `false` und `''` verloren, ein anschließendes `7` kommt wieder an; ein Nicht-String über die JS-Property (`[1, 2]`) geht trotz gesetztem `type` unverändert durch, weil der `switch` nur für Strings läuft (`:170`). Der erste, dritte und vierte Fall bekommen je einen Kommentar, dass sie den Ist-Zustand festhalten und Paket 5 sie anfasst.
  12. In der `CHANGELOG.md` im Repo-Wurzelverzeichnis einen Stichpunkt im Abschnitt zum 2026-08-16 ergänzen: eine tabellengetriebene Spec deckt die Typkonvertierung von `shae-prop` ab. Die Paket-`CHANGELOG.md` bleibt unberührt — an `@spearwolf/shadow-objects` ändert sich keine Zeile.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`. Erwartung: `pnpm -F shadow-objects-testing test` meldet 13 Dateien und 138 Tests statt 12 und 41, `test:ci` damit 391 statt 294, e2e unverändert 362. Weicht die Zahl nach unten ab, fehlt eine Tabellenzeile. Zusätzlich prüfen: der Lauf endet mit rc=0 **und** ohne einen »Errors«-Block in der Zusammenfassung — ein durchgerutschter Unhandled Error lässt alle Tests grün aussehen und trotzdem rc=1 zurückkommen. Kein Testfall darf rot sein: Wer beim Abtippen ein anderes Ergebnis misst als in den Tabellen steht, ändert nicht den Test, sondern trägt den Unterschied hier als Fund ein.
- Commit: `test(elements): cover the shae-prop type conversion with a table driven spec (TEST-006)`
- Verlauf:
  - Zug 0 (2026-08-16, Planer): TEST-006 gegen die Fundstelle geprüft — unverändert, drei Typen abgedeckt. Zahlen des Audits nachgezählt und korrigiert (42/29/11 statt 40/25/12). Alle Tabellen zweifach gemessen: extrahierter `switch` isoliert in Node, und `dist/bundle.js` in echtem Chromium — deckungsgleich. Die vollständige Spec probeweise gegen die Browser-Konfiguration des Testpakets gefahren: 97 Tests grün, rc=0. Drei Funde, alle ohne Verhaltensänderung in diesem Paket: der Wurf beim Upgrade tötet das Element dauerhaft, es gibt drei werfende Zweige statt zwei, der `default:`-Zweig ist unerreichbar.

**Finding TEST-006 (medium) — Volltext**

*Titel:* Typkonvertierung von shae-prop breiter abdecken

*Fundstelle:* `packages/shadow-objects/src/elements/ShaePropElement.ts:20-63`, `shadow-objects-e2e/src/bundle-tests.js`

*Beschreibung:* ShaePropElement akzeptiert 40 Typnamen und konvertiert sie in einem switch mit 25 Zweigen. Geprüft werden davon drei: string, number[] und boolean, alle in bundle-tests.js. Ungeprüft bleiben sämtliche TypedArray-Varianten (zwölf Zweige, jeder mit eigenem Trennmuster — teils \W+, teils \s+), bigint, json, die Zahlensysteme hex, oct und bin samt ihrer Array-Formen, sowie das no-trim-Attribut. Diese Zweige unterscheiden sich in Details, die man beim Lesen leicht übersieht: float32array trennt an Whitespace, uint8array an Nicht-Wort-Zeichen. Ein Tippfehler in einem dieser Muster fällt heute niemandem auf, und die Fehlerpfade (VIEW-005) sind ebenfalls unbelegt.

*Empfehlung:* Eine tabellengetriebene Spec anlegen: je Typname ein Eingabestring und das erwartete Ergebnis, in einer Schleife durchlaufen. Das kostet etwa so viele Zeilen wie die Typliste selbst und deckt danach jeden Zweig ab. Fehlerhafte Eingaben je Typ als zweite Tabelle daneben.

*Anmerkung des Planers:* Die drei Zahlen im Beschreibungstext sind zu niedrig bzw. zu hoch gegriffen. Ausgezählt: 42 Typnamen, 29 Zweigkörper, elf TypedArray-Varianten. Die Tabellen im Detailplan sind maßgeblich, nicht dieser Absatz.

</details>

### [x] 4a. shae-ent unter Spec stellen

- Hash: `8e0e6be`
- Ergebnis: 2 Runden · TEST-002 zur Hälfte behoben (die andere Hälfte ist 4b) · `test/ent-element-attributes.test.js` 22 Fälle, `test/ent-element-events.test.js` 30 Fälle, dazu die geteilten Helfer `src/mount.js` und `src/withSwallowedErrors.js`, auf die `prop-element-types.test.js` bei unveränderten 104 Tests umgestellt wurde · alle sechs Falltabellen vollständig, `#updateForwardCustomEventsValue` in allen elf Attributformen, der `dispatchEvent`-Patch in allen fünf Teilen · Verify grün: lint rc=0, typecheck ✓, test:ci 492, e2e 362, kein »Errors«-Block, mehrfach geshuffelt grün
- Nachweis: Der kritische Review-Befund (ein Test behauptete, ein nie gesetztes Attribut zu entfernen) wurde durch eine Mutationsprobe geschlossen — mit auskommentiertem `removeAttribute` in `ShaeElement.ts:58` wird genau dieser eine Test rot, die 21 übrigen bleiben grün.
- Nebenbefunde: `packages/shadow-objects-testing/test/ent-element-attributes.test.js:126` und `:172` legen einen `ComponentContext` für den Namespace `local` an, den niemand wegräumt — `unmountAll` fasst nur den globalen an, während die `other`- und `probe-ns`-Fälle im `finally` selbst aufräumen. Läuft heute grün, auch geshuffelt. Gehört zusammen mit der Aufräumregel in Paket 4b behandelt, weil dort dieselben Helfer benutzt werden.
- Triage des Nebenbefunds (2026-08-16, Planer Paket 4b): entschieden für den geteilten Helfer. `unmountAll()` räumt künftig jeden Namespace aus `ComponentContext.getContextsMap()` ab, nicht nur den globalen; die zwei `finally`-Blöcke in `ent-element-attributes.test.js` und `ent-element-events.test.js` werden dabei überflüssig und fallen weg. Paket 4b setzt beides um, Schritt 0 seines Detailplans. Grund: die Regel wurde zweimal in der Datei vergessen, die sie eingeführt hat — sie taugt nicht als Merkposten pro Testfall.
- Folgen: `src/mount.js` und `src/withSwallowedErrors.js` sind geteilte Helfer; Paket 4b benutzt sie, ohne die Extraktion zu wiederholen, und zieht `src/mount.js` einmalig nach.
- Triage der Folgen (2026-08-16, Planer Paket 6): echte Folge, von Paket 4b eingelöst und damit erledigt. `packages/shadow-objects-testing/src/mount.js:35-46` fegt beide Registries, die zwei `finally`-Blöcke aus 4a sind weg, und `prop-element-types.test.js` liegt auf denselben Helfern. Paket 6 baut seine neue Spec-Datei auf genau diesen zwei Helfern auf — nichts offen.

- Findings: TEST-002 (high), erster von zwei Teilen
- Ziel: `ShaeEntElement` und seine Basisklasse `ShaeElement` haben Specs in echtem Chromium für Attributlesung, Reflexion, Lebenszyklus und Event-Weiterleitung.
- Bereich: `packages/shadow-objects-testing/`, Bezug `packages/shadow-objects/src/elements/ShaeEntElement.ts` und `ShaeElement.ts`
- Hängt ab von: —
- Modell: mittlere Stufe

<details>
<summary>Detailplan Paket 4a</summary>

**Abgleich (2026-08-16).** TEST-002 besteht weiter, aber in kleinerem Umfang als beschrieben.
Der Finding-Text zählt vier Module mit zusammen 1195 Zeilen; heute sind es 1249
(`constants.ts` 25, `events.ts` 29, `ShaeElement.ts` 73, `ShaeEntElement.ts` 427,
`ShaePropElement.ts` 392, `ShaeWorkerElement.ts` 303 — der Audit-Text zählt `constants.ts`
und `events.ts` offenbar nicht mit). Die Aussage »keine einzige Spec« stimmt für
`packages/shadow-objects/src/elements/` unverändert: dort liegt bis heute keine `*.spec.ts`.
Das Integrationspaket ist von 12 auf 13 Dateien und von 41 auf 145 Tests gewachsen.

**Was TEST-002 bereits erschlagen ist.**

| Empfehlung des Findings | Zustand | Fundstelle |
|---|---|---|
| Typkonvertierung je Typ | erledigt, Paket 3 | `test/prop-element-types.test.js`, 104 Tests |
| Upgrade-Pfad | gehört Paket 6, das den Pfad umbaut und seinen eigenen roten Test zuerst braucht | `pages/upgrade-timing.html` |
| Elternsuche in ihren Varianten | gehört Paket 9, das sie vereinheitlicht | `test/prop-element-host.test.js`, Tabelle in Paket 2 |
| `#updateForwardCustomEventsValue` mit allen Attributformen | **offen** — drei der elf Formen sind abgedeckt | `test/forward-custom-events.test.js:13-15` |

**Was heute nachweislich unerreicht ist.** Nachgemessen in echtem Chromium über die
Browser-Konfiguration des Integrationspakets, alle Werte unten sind Messwerte:

- `#updateForwardCustomEventsValue` — abgedeckt sind `forward-custom-events` bare, `="foo"` und
  `="foo, bar"` (`test/forward-custom-events.test.js`) sowie bare und `="allowed"` in
  `packages/shadow-objects-e2e/src/async-events.js:148`. Nicht abgedeckt: der leere
  Attributwert, ein Wert aus reinem Whitespace, leere Listeneinträge, jede Änderung zur
  Laufzeit, das Entfernen des Attributs und die gesamte Gegenrichtung (`forwardCustomEvents$`
  schreibt das Attribut zurück, `ShaeEntElement.ts:66-79`).
- Der `dispatchEvent`-Patch (`ShaeEntElement.ts:98-142`) — abgedeckt ist nur, dass gefilterte
  Typen ankommen. Nicht abgedeckt: dass das Original erhalten bleibt, dass
  `ComponentContext.ReRequestParentRoots` nie weitergereicht wird (`:115`), was
  `traverseChildren` auslöst, dass ein Attributwechsel nicht zweimal übereinander patcht, und
  das Zurücknehmen des Patch (`:135-141`).
- `#updateTokenValue` (`:402-407`) — kein Test im ganzen Repo liest `token` nach einem
  `setAttribute` oder `removeAttribute`, und keiner prüft die Reflexion aus `token$.onChange`
  (`:56-62`).
- `ShaeElement` (73 Zeilen) — `readNamespaceAttribute`, die Attributreflexion aus
  `ns$.onChange` (`ShaeElement.ts:52-60`) und der `ns`-Setter mit seiner
  `toNamespace`-Normalisierung sind nirgends direkt geprüft; die E2E-Seiten setzen `ns` nur
  als Markup-Konstante.
- Der Lebenszyklus über `connectedCallback`/`disconnectedCallback` hinweg — `ent-element-teardown.test.js`
  prüft drei Randfälle des Abbaus, aber kein Test hängt ein Element um oder hängt es wieder an.

**Zuschnitt.** TEST-002 hat im Audit den Aufwand `L`. Das Paket wird geteilt: 4a nimmt
`<shae-ent>` und `ShaeElement`, 4b nimmt `<shae-worker>`. `<shae-prop>` kommt in keinem von
beiden vor — sein Konvertierungspfad ist mit Paket 3 erledigt, seine Elternsuche gehört Paket 9.

**Fund 1 — eine leere Filterliste leitet alles weiter.** `forward-custom-events=","` ergibt
eine leere `Set`. Die Reflexion in `ShaeEntElement.ts:73-78` schreibt daraus
`Array.from(val).join(',')`, also den leeren String, zurück ins Attribut; das löst
`attributeChangedCallback` aus, und `#updateForwardCustomEventsValue` liest den leeren Wert als
»alles weiterleiten« (`:412-413`). Gemessen: `forwardCustomEvents$.value === true`, Attribut
`""`, ein ungelistetes Event kommt am DOM-Element an. Dasselbe passiert bei
`forwardCustomEvents$.set(new Set())`. Eine ausdrücklich leere Erlaubnisliste bedeutet damit
das Gegenteil dessen, was dasteht. Nicht im Audit. Gehört zu Paket 13.

**Fund 2 — `removeAttribute('token')` behält den Token.** `#updateTokenValue` (`:402-407`)
liest nur, wenn das Attribut vorhanden ist. Gemessen: nach `setAttribute('token','c')` und
anschließendem `removeAttribute('token')` bleibt `el.token === 'c'` und
`viewComponent.token === 'c'`, während das Attribut weg ist. Über den Property-Setter
(`el.token = undefined`) läuft dagegen alles richtig: Attribut entfernt, `viewComponent.token`
zurück auf `#void`. DOM und Entity widersprechen sich also genau dann, wenn das Markup die
Quelle ist. Nicht im Audit. Gehört zu Paket 13.

**Gemessener Ist-Zustand, Nebenbeobachtungen.** Zwei Asymmetrien, die die Tabellen unten
festhalten und die beim Schreiben leicht für Tippfehler gehalten werden:

- `ns` normalisiert sein Attribut beim Upgrade, `token` nicht. Grund: `ShaeElement` registriert
  `ns$.onChange` (`:52`) **vor** dem ersten Lesen (`:62`), `ShaeEntElement` liest `token` (`:54`)
  **vor** dem Registrieren (`:56`). Aus `token="  x  "` wird deshalb `token === 'x'` bei
  unverändertem Attribut `"  x  "`, aus `ns="  local  "` dagegen `ns === 'local'` **und**
  Attribut `"local"`.
- `forward-custom-events` normalisiert trotzdem, obwohl es dem `token`-Muster folgt: das zweite
  Lesen in `connectedCallback` (`:226`) erzeugt eine neue `Set`-Instanz, und eine neue Instanz ist
  für das Signal immer eine Änderung. Aus `="foo, bar"` wird deshalb das Attribut `"foo,bar"`.

**Was spätere Pakete anfassen werden.**

| Paket | Fälle aus 4a, die es berührt |
|---|---|
| 6 (Upgrade-Reihenfolge) | die Lebenszyklus-Fälle »bindet an den Elternteil« und »Umhängen« — der Umbau darf sie nicht kippen |
| 7 (Bindungslebenszyklus) | keiner. `entParentNode` nach einem `ns`-Wechsel ist ausgespart, das ist VIEW-007 (gemessen: `entParentNode` zeigt weiter auf den Elternteil im fremden Namespace, während `viewComponent.parent` korrekt `undefined` ist) |
| 9 (Vorfahrensuche) | die Lebenszyklus-Fälle mit Eltern-Kind-Bindung; die Fälle bleiben im Light DOM, Shadow-Grenzen fasst 9 selbst an |
| 10 (`ShaePropElement extends ShaeElement`) | die `ns`-Fälle sind auf `<shae-ent>` geschrieben und bleiben gültig; 10 fügt `<shae-prop>` eigene hinzu |
| 13 (Attributpfade) | Fund 1 und Fund 2 — die zwei Fälle sind als Ist-Zustand markiert und drehen sich dort um |

- Dateien: `packages/shadow-objects-testing/src/mount.js` (neu), `packages/shadow-objects-testing/src/withSwallowedErrors.js` (neu), `packages/shadow-objects-testing/test/ent-element-attributes.test.js` (neu), `packages/shadow-objects-testing/test/ent-element-events.test.js` (neu), `packages/shadow-objects-testing/test/prop-element-types.test.js`, `CHANGELOG.md` (Repo-Wurzel)
- Vorgehen:
  1. `packages/shadow-objects-testing/src/mount.js` anlegen, mit zwei Exporten. `mount(html)`
     erzeugt ein `<div>`, schreibt `html` per `innerHTML` hinein, hängt es an `document.body`,
     legt es in einem modulweiten Array ab und gibt den `<div>` zurück. `unmountAll()` entfernt
     jeden so erzeugten Container, leert das Array und ruft `ComponentContext.get().clear()`.
     Das Array ist der Punkt: der lokale Helfer in `test/prop-element-types.test.js:25-33` hält
     genau einen Container in einer Modulvariablen und überschreibt ihn beim zweiten Aufruf, so
     dass der erste für den Rest des Laufs im Dokument liegen bleibt. Kommentar an `mount`, warum
     ausschließlich der Markup-Pfad benutzt wird: die Konstruktoren der Shae-Elemente setzen
     Attribute (`this.style.display = 'contents'`, `ShaeEntElement.ts:152`), was die
     Custom-Elements-Spezifikation während der Konstruktion verbietet — `document.createElement`
     bricht das Upgrade ab und liefert ein `HTMLUnknownElement` (geführt als DEFECT-1 in
     `packages/shadow-objects-e2e/KNOWN-DEFECTS.md`, nicht Teil dieses Pakets). Kommentar an
     `unmountAll`, dass nur der globale ComponentContext geleert wird: eine Spec mit eigenem
     Namespace räumt den zusätzlich selbst weg.
     `packages/shadow-objects-testing/src/render.js` bleibt unverändert — es baut ein
     `<main>`-Fixture für die sechs Specs, die genau eins brauchen, und wird von `mount` nicht
     ersetzt.
  2. `packages/shadow-objects-testing/src/withSwallowedErrors.js` anlegen: der Helfer aus
     `test/prop-element-types.test.js:42-55` unverändert übernommen, samt seinem Kommentar.
     `collectGlobalErrors` in `test/ent-element-teardown.test.js:17-25` wird **nicht**
     zusammengelegt — es sammelt `event.error`-Objekte statt Meldungstexte und hat damit einen
     anderen Vertrag.
  3. `test/prop-element-types.test.js` auf beide Helfer umstellen: der lokale `mount({type, value, noTrim})`
     baut weiterhin das Markup und gibt das `<shae-prop>` zurück, holt sich den Container aber
     über `mount` aus `../src/mount.js`; `afterEach` ruft `unmountAll()`. Die 104 Testfälle,
     ihre Namen und ihre Erwartungen bleiben Zeichen für Zeichen gleich — die Datei muss vor und
     nach dem Schritt dieselben 104 grünen Tests melden.
  4. `test/ent-element-attributes.test.js` anlegen. Kopf wie die vorhandenen Specs: `expect` aus
     `@esm-bundle/chai`, `ComponentContext`, `GlobalNS` und `VoidToken` aus
     `@spearwolf/shadow-objects`, der Seiteneffekt-Import `@spearwolf/shadow-objects/shae-ent.js`,
     dazu `mount`/`unmountAll`. `describe`/`it`/`afterEach` kommen aus den Vitest-Globals. Kein
     `customElements.whenDefined`-Warten nötig — der statische Seiteneffekt-Import definiert die
     Elemente vor dem ersten Test (nachgemessen). `afterEach` ist `unmountAll`.
  5. Block »token« in dieser Datei, 9 Fälle. Jeder Fall montiert
     `<shae-ent …></shae-ent>` und prüft drei Werte: `el.token`, den Attributwert (`hasAttribute`
     mitgeprüft) und `el.viewComponent.token`.

     | Fall | `el.token` | Attribut `token` | `viewComponent.token` |
     |---|---|---|---|
     | `token="  x  "` | `'x'` | unverändert `'  x  '` | `'x'` |
     | `token="   "` | `undefined` | unverändert `'   '` | `'#void'` |
     | `token=""` | `undefined` | unverändert `''` | `'#void'` |
     | kein `token` | `undefined` | fehlt | `'#void'` |
     | `token="a b"` | `'a b'` | `'a b'` | `'a b'` |
     | danach `el.token = 'b'` | `'b'` | `'b'` | `'b'` |
     | danach `el.token = undefined` | `undefined` | fehlt | `'#void'` |
     | danach `setAttribute('token', 'c')` | `'c'` | `'c'` | `'c'` |
     | danach `removeAttribute('token')` | `'c'` | fehlt | `'c'` |

     Die ersten fünf Zeilen sind je ein eigenes Element, die letzten vier laufen nacheinander auf
     demselben Element und dürfen deshalb nicht umsortiert werden. Über die ersten drei Zeilen ein
     Kommentar, dass das Attribut beim ersten Lesen bewusst nicht zurückgeschrieben wird
     (`ShaeEntElement.ts:54` liest vor `:56`, und `connectedCallback` liest unter `beQuiet`,
     `:223`). Die letzte Zeile bekommt einen Kommentar, dass sie den Ist-Zustand festhält —
     Fund 2, Paket 13 dreht sie um.
  6. Block »ns« in derselben Datei, 7 Fälle:
     - kein `ns` → `el.ns === GlobalNS`, kein `ns`-Attribut, `el.componentContext.ns === GlobalNS`
     - `ns="  local  "` → `el.ns === 'local'` **und** Attribut auf `'local'` normalisiert, mit
       Kommentar, warum hier normalisiert wird und beim `token` nicht
     - `ns=""` → `el.ns === GlobalNS`, Attribut bleibt `''` (der Signalwert ändert sich nie, also
       schreibt niemand zurück)
     - `ns="   "` → `el.ns === GlobalNS`, Attribut bleibt `'   '`
     - `el.ns = 'other'` → Attribut `'other'`, `el.componentContext` ist ein anderes Objekt als
       vorher, `el.viewComponent` ist dasselbe Objekt und `el.uuid` unverändert,
       `el.viewComponent.context.ns === 'other'`
     - `el.ns = ''` → `el.ns === GlobalNS`, Attribut entfernt
     - `ShaeEntElement.observedAttributes` ist genau `['ns', 'token', 'forward-custom-events']`

     Die Fälle mit eigenem Namespace räumen ihren ComponentContext selbst weg
     (`ComponentContext.get('other').clear()`).
  7. Block »lifecycle« in derselben Datei, 6 Fälle. Fixture, wo nichts anderes dabeisteht:
     `<shae-ent id="a" token="a"><shae-ent id="b" token="b"></shae-ent></shae-ent><shae-ent id="c" token="c"></shae-ent>`.
     Ein `nextTask`-Helfer (`new Promise((r) => setTimeout(r, 0))`) deckt die Microtask ab, in der
     `disconnectedCallback` und der Sync arbeiten.
     - nach dem Upgrade: `el.isShaeElement` und `el.isShaeEntElement` sind `true`, `el.uuid` ist ein
       String, `el.componentContext` ist gesetzt
     - `b` bindet an `a`: `b.entParentNode === a` und `b.viewComponent.parent.uuid === a.uuid`
     - `c.append(b)`, dann `nextTask`: `b.entParentNode === c`, `b.viewComponent.parent.uuid === c.uuid`,
       `b.uuid` unverändert
     - `b.remove()`, dann `nextTask`: `b.entParentNode` ist `undefined`, `b.componentContext` ist
       `undefined`, aber `b.viewComponent` und `b.uuid` bleiben erhalten. Kommentar: das Element
       gibt seinen Kontext ab und behält seine Identität, damit ein Wiederanhängen dieselbe Entity
       trifft
     - `a.append(b)`, dann `nextTask`: `b.viewComponent` ist dasselbe Objekt wie vorher, `b.uuid`
       unverändert, `b.entParentNode === a`, `b.viewComponent.parent.uuid === a.uuid`,
       `b.token === 'b'`
     - `a.remove()` mit `b` darin, dann `nextTask`: `a.componentContext` und `b.entParentNode` sind
       `undefined`, `b.viewComponent.parent` ist `undefined`
  8. `test/ent-element-events.test.js` anlegen, gleicher Kopf, zusätzlich `on` aus
     `@spearwolf/eventize`. Ein Helfer `fce(el)` liest `el.forwardCustomEvents$.value` und
     vergleicht: bei einer `Set` über `Array.from(...)` gegen ein Array, sonst gegen `true`/`false`.
     Ein Helfer `attrOf(el)` liefert den Attributwert oder `null`, wenn das Attribut fehlt.
  9. Tabelle A »attribute forms« in dieser Datei, 11 Fälle in einer Schleife, Testname
     `<shae-ent ${form}>`. Montiert wird `<shae-ent token="t" ${form}></shae-ent>`:

     | Attributform | `forwardCustomEvents$.value` | Attribut danach |
     |---|---|---|
     | `forward-custom-events` | `true` | `''` |
     | `forward-custom-events=""` | `true` | `''` |
     | `forward-custom-events="   "` | `true` | unverändert `'   '` |
     | `forward-custom-events="foo"` | `Set['foo']` | `'foo'` |
     | `forward-custom-events="foo, bar"` | `Set['foo','bar']` | `'foo,bar'` |
     | `forward-custom-events="foo,,bar"` | `Set['foo','bar']` | `'foo,bar'` |
     | `forward-custom-events=" foo , bar "` | `Set['foo','bar']` | `'foo,bar'` |
     | `forward-custom-events="foo,"` | `Set['foo']` | `'foo'` |
     | `forward-custom-events=","` | `true` | `''` |
     | `forward-custom-events="foo foo"` | `Set['foo foo']` | `'foo foo'` |
     | kein Attribut | `false` | fehlt |

     Die vorletzte Zeile trennt nur am Komma — Whitespace innerhalb eines Eintrags bleibt Teil des
     Typnamens und darf nicht »repariert« werden. Die Zeile mit `","` bekommt einen Kommentar, dass
     sie den Ist-Zustand festhält (Fund 1, Paket 13 dreht sie um), und die Zeile mit `"   "` einen,
     warum das Attribut hier stehen bleibt und bei `"foo, bar"` nicht.
  10. Tabelle B »runtime changes and reflection« in derselben Datei, 7 Fälle, alle nacheinander auf
      einem Element, das mit `forward-custom-events="foo"` startet — Reihenfolge ist Teil des Falls:
      `setAttribute('forward-custom-events','bar,baz')` → `Set['bar','baz']`/`'bar,baz'`;
      `setAttribute(…, '')` → `true`/`''`; `removeAttribute` → `false`/Attribut fehlt;
      `forwardCustomEvents$.set(true)` → Attribut `''`;
      `forwardCustomEvents$.set(new Set(['a','b']))` → Attribut `'a,b'`;
      `forwardCustomEvents$.set(new Set())` → `true`/Attribut `''` (Ist-Zustand, Fund 1);
      `forwardCustomEvents$.set(false)` → Attribut entfernt.
  11. Block »the dispatchEvent patch« in derselben Datei, 12 Fälle. Fixture, wo nichts anderes
      dabeisteht: `<shae-ent id="p" token="p" forward-custom-events><shae-ent id="k" token="k"></shae-ent></shae-ent>`.
      Ein Event erreicht den ViewComponent über `p.viewComponent.dispatchEvent(type, data, traverseChildren)`,
      genau wie ein Shadow Object es täte.
      - mit Attribut ist `Object.hasOwn(p.viewComponent, 'dispatchEvent')` `true`, ohne Attribut
        (`k`) `false` — der Patch entsteht nur, wenn es einen Filter gibt (`ShaeEntElement.ts:107-108`)
      - das weitergereichte `CustomEvent` hat `type` gleich dem Ereignistyp, `detail` identisch zu
        `data`, `bubbles === true` und `composed === true`
      - ein `on(p.viewComponent, 'foo', …)`-Hörer bekommt das Event weiterhin: der Patch ruft das
        Original (`:113`) und ersetzt es nicht
      - mit `forward-custom-events="foo"`: `'foo'` erreicht das DOM-Element, `'baz'` nicht, und der
        eventize-Hörer bekommt beide
      - `ComponentContext.ReRequestParentRoots` (der String `'re-request-parent-roots'`) erreicht das
        DOM-Element auch bei `forward-custom-events` bare nicht, der eventize-Hörer dagegen schon
      - `traverseChildren = true`, beide Elemente mit `forward-custom-events`: am Kind `k` kommt genau
        ein `CustomEvent` mit `target === k` an; am Elternteil `p` kommen zwei an, in dieser
        Reihenfolge — erst das des Kindes (per Bubbling, `target === k`), dann das eigene
        (`target === p`). Kommentar dazu: das Original traversiert die Kinder, bevor der Patch sein
        eigenes Event feuert
      - `traverseChildren = true`: dasselbe Event erreicht `document` (`composed` und `bubbles`), auch
        zweimal
      - `traverseChildren = false`: nur `p` feuert, `k` bekommt nichts
      - zwei Attributwechsel hintereinander (`'foo'` → `'foo,zap'`) und danach ein Dispatch: der
        eventize-Hörer wird genau einmal gerufen und genau ein `CustomEvent` kommt an — der Patch
        schachtelt sich nicht über sich selbst
      - `removeAttribute('forward-custom-events')`: `Object.hasOwn(p.viewComponent, 'dispatchEvent')`
        ist wieder `false`, ein Dispatch erreicht den eventize-Hörer und kein DOM-Element mehr
      - `p.remove()` und Wiederanhängen: derselbe ViewComponent, `Object.hasOwn(…)` bleibt über beides
        hinweg `true`, und nach dem Wiederanhängen kommt genau ein `CustomEvent` an
      - `p.ns = 'probe-ns'`: derselbe ViewComponent, Patch intakt, genau ein `CustomEvent`; der
        Namespace-Kontext wird am Ende des Falls geleert
  12. `test/forward-custom-events.test.js` bleibt unangetastet. Es ist der einzige Fall im Repo, der
      die Weiterleitung gegen einen laufenden `<shae-worker local>` fährt; die neue Datei arbeitet
      ohne Environment und deckt dafür die Mechanik ab.
  13. In der `CHANGELOG.md` im Repo-Wurzelverzeichnis einen Stichpunkt im Abschnitt zum 2026-08-16
      ergänzen: zwei Specs decken Attribute, Lebenszyklus und Event-Weiterleitung von `<shae-ent>` ab,
      dazu die geteilten Testhelfer `mount`/`unmountAll`. Die Paket-`CHANGELOG.md` bleibt unberührt —
      an `@spearwolf/shadow-objects` ändert sich keine Zeile.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`. Erwartung:
  `pnpm -F shadow-objects-testing test` meldet 15 Dateien und 197 Tests statt 13 und 145 (22 aus
  `ent-element-attributes.test.js`, 30 aus `ent-element-events.test.js`), `test:ci` damit 492 statt 440,
  e2e unverändert 362. `prop-element-types.test.js` muss weiterhin genau 104 Tests melden — jede
  Abweichung dort ist ein Fehler beim Umstellen der Helfer, kein neuer Fall. Zusätzlich: der Lauf endet
  mit rc=0 **und** ohne »Errors«-Block in der Zusammenfassung, und er bleibt grün unter
  `--sequence.shuffle` — mehrere Fälle laufen nacheinander auf demselben Element, aber keiner darf von
  einem anderen `it` abhängen. Kein Testfall darf rot sein: Wer ein anderes Ergebnis misst als in den
  Tabellen steht, ändert nicht den Test, sondern trägt den Unterschied hier als Fund ein.
- Commit: `test(elements): cover the shae-ent attributes, lifecycle and event forwarding (TEST-002)`
- Verlauf:
  - Zug 0 (2026-08-16, Planer): TEST-002 gegen die Fundstelle geprüft — besteht, aber kleiner als
    beschrieben; Zeilenzahlen nachgezählt (1249 statt 1195). Abgrenzung gegen Paket 3, 6 und 9
    gezogen, Paket in 4a/4b geteilt. Drei Messreihen in echtem Chromium über die Browser-Konfiguration
    des Integrationspakets; alle Tabellen oben sind Messwerte. Zwei Funde ohne Verhaltensänderung in
    diesem Paket: eine leere Filterliste leitet alles weiter, `removeAttribute('token')` behält den
    Token. Beide gehen als neues Paket 13 ans Ende.

**Finding TEST-002 (high) — Volltext**

*Titel:* Unit-Specs für die Element-Klassen anlegen

*Fundstelle:* `packages/shadow-objects/src/elements/`

*Beschreibung:* src/view/ hat sieben Spec-Dateien für acht Module. src/elements/ hat keine einzige für vier Module mit zusammen 1195 Zeilen — darunter ShaeEntElement mit 427 und ShaePropElement mit 392 Zeilen, also die beiden komplexesten Dateien des View Layers. Getestet wird ausschließlich die Schicht darunter (ComponentContext, ViewComponent, ComponentChanges) sowie das Zusammenspiel von oben durch Integration und E2E. Dazwischen liegt ungeprüft die gesamte Logik, die dieses Audit als fehleranfällig ausweist: Attribut-Parsing, Upgrade-Lifecycle, Elternsuche, Event-Weiterleitung und das Patchen von dispatchEvent. Vier der fünf Code-Defekte in diesem Backlog liegen in diesen beiden Dateien. Das Integrationspaket kompensiert das teilweise und in echtem Chromium, deckt aber nur 13 Szenarien ab und ist nicht darauf ausgelegt, Randfälle einzelner Methoden durchzugehen.

*Empfehlung:* Für ShaeEntElement und ShaePropElement je eine Spec im Integrationspaket anlegen — dort läuft echtes Chromium, was für Custom-Elements-Semantik nötig ist. Vorrang haben die Pfade ohne jede Abdeckung: #updateForwardCustomEventsValue mit allen Attributformen, die Typkonvertierung je Typ, der Upgrade-Pfad und die Elternsuche in ihren Varianten. Die Sonden dieses Audits sind als Ausgangspunkt verwendbar; ihre Ergebnisse stehen bei den jeweiligen Findings.

*Anmerkung des Planers:* Von den vier vorrangigen Pfaden ist die Typkonvertierung mit Paket 3
erledigt, der Upgrade-Pfad gehört Paket 6 und die Elternsuche Paket 9 — beide bauen Verhalten um und
bringen ihre Tests mit. `#updateForwardCustomEventsValue` bleibt hier. `ShaePropElement` kommt in 4a
und 4b nicht mehr vor; an seine Stelle tritt `ShaeWorkerElement`, das der Audit-Text übergeht, obwohl
es 303 ungeprüfte Zeilen Attributlogik mitbringt.

</details>

### [x] 4b. shae-worker unter Spec stellen

- Hash: `e26d597`
- Ergebnis: 3 Runden · der `ShaeWorkerElement`-Teil von TEST-002 behoben · `test/worker-element-attributes.test.js`, 37 Fälle über alle vier Falltabellen, dazu Konsolen- und Lebenszyklusfälle · die Namespace-Aufräumung sitzt jetzt in `src/mount.js` und fegt beide Registries (`ComponentContext` und `globalThis.__shadowEnvs`), die beiden `finally`-Blöcke in den Specs aus 4a sind entfallen · Verify grün: lint rc=0, typecheck ✓, test:ci 529, e2e 362, kein »Errors«-Block, mehrfach geshuffelt grün
- Nachweis: Zwei Mutationsproben des Reviewers und eine des Implementierers. Die Setter-Kette startet von `auto-sync="99"` statt `"no"`, damit ein Setter, der gar nichts tut, auffällt — unter der entsprechenden Mutation werden 5 von 37 Fällen rot statt 3.
- Nebenbefunde: `packages/shadow-objects-testing/test/__screenshots__/` sammelt Fehler-Screenshots und wird von keinem Skript geleert; vier Altaufnahmen wurden entfernt, darunter eine zu einem Fall, der im selben Arbeitsbaum grün läuft. Dieselbe Irreführungsfalle, die Paket 1 für Playwright abgestellt hat, nur für vitest — gehört in den Backlog. Fehlende Schlusszeilenumbrüche sind **kein** Befund: `biome.json` setzt `formatter.trailingNewline: false`, das ist Projektkonvention.
- Folgen: —
- Triage des Nebenbefunds (2026-08-16, Planer Paket 5): vorbestehend, kein Finding dieses Audits. Der Eintrag steht bereits unter »Vorbestehende Fehler« samt Begründung und geht von dort in den Backlog; hier ist nichts offen.

- Findings: TEST-002 (high), zweiter von zwei Teilen
- Ziel: `ShaeWorkerElement` hat eine Spec in echtem Chromium, die seine fünf Attribute, den `autoSync`-Setter und den Auf- und Abbau des Environments durchgeht.
- Bereich: `packages/shadow-objects-testing/`, Bezug `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`
- Hängt ab von: Paket 4a (geteilte Testhelfer)
- Modell: mittlere Stufe

<details>
<summary>Detailplan Paket 4b</summary>

**Abgleich (2026-08-16, Zug 0 dieses Pakets — nach 4a nachgeprüft).** Alle unten genannten
Zeilennummern sind gegen die unveränderte Quelle gehalten und stimmen: `auto-sync`-Effect
`:250-296`, `autoSync`-Setter `:129-134`, `shouldAutostart` `:121-123`, `local`-Wächter
`:188-192`, `no-structured-clone` `:194-196` und `:298-303`, `src` `:202-208`, `ns$.onChange`
`:46-48`, `start()` mit `??=` `:215`, die Vorgabewert-Bremse der Reflexion `:82-85`,
`attributeChangedCallback` für `auto-sync` `:198-200`, `#deferDestroy` `:237-248` — 303 Zeilen.
Paket 4a hat nichts davon abgedeckt: seine beiden Specs stehen auf `<shae-ent>`, und der
Basisklassenanteil, den sie mit erledigt haben, ist die `ns`-Attributlogik von `ShaeElement`
(Lesen, Normalisieren, Rückschreiben). Dieses Paket wiederholt sie nicht; es prüft von `ns` nur
die eine Folge, die `<shae-worker>` eigen ist (Fund 4). Alle Tabellen unten wurden in echtem
Chromium über die Browser-Konfiguration des Integrationspakets nachgemessen und stimmen Zeile für
Zeile; korrigiert ist, was daneben stand, jeweils mit Begründung an Ort und Stelle.

**Die Helfer aus 4a, wie sie wirklich aussehen.** `mount(html)` aus
`packages/shadow-objects-testing/src/mount.js` nimmt einen Markup-String, hängt ihn per
`innerHTML` in ein frisches `<div>` am `document.body` und gibt **den Container** zurück, nicht
das Element — jeder Fall holt sein `<shae-worker>` mit
`mount('…').querySelector('shae-worker')`. `unmountAll()` entfernt alle Container und räumt die
ComponentContexts auf (siehe die Aufräumregel unten). `withSwallowedErrors(fn)` aus
`src/withSwallowedErrors.js` ist **synchron**, ruft `fn()` und liefert die Liste der
`event.message`-Strings, die währenddessen am `window` als `error` gemeldet wurden. Genau das
braucht der `local`-Wächter dieses Pakets; der Helfer wird importiert, nicht nachgebaut.

**Entschieden: die Aufräumregel gehört in `unmountAll()`.** Der Nebenbefund aus 4a
(`test/ent-element-attributes.test.js:126` und `:172` lassen einen ComponentContext für den
Namespace `local` stehen) ist kein Ausrutscher, sondern die vorhersehbare Folge einer Regel, die
jeder Fall selbst befolgen muss — vergessen wurde sie zweimal in derselben Datei, die sie
eingeführt hat. `ComponentContext.getContextsMap()` ist eine öffentliche statische Methode und
liefert die Map aller Namespaces; `unmountAll()` läuft über ihre Werte und ruft auf jedem
`clear()`. Damit gilt die Regel für jede Spec des Testpakets, ohne dass eine einzige
`finally`-Zeile sie tragen muss. Folge für dieses Paket: es fasst `src/mount.js` an, streicht die
überflüssig gewordenen `finally`-Blöcke in `test/ent-element-attributes.test.js` (Fall
`el.ns = "other"`) und `test/ent-element-events.test.js` (Fall `p.ns = 'probe-ns'`) sowie den Satz
im Doc-Kommentar von `unmountAll`, der die Eigenverantwortung verlangt. Testzahlen ändern sich
dadurch nicht. `test/worker-element-teardown.test.js` benutzt `unmountAll` nicht und bleibt
unangetastet.

**Ausgangslage (2026-08-16, Planer Paket 4).** `ShaeWorkerElement.ts` hat 303 Zeilen und keine Spec in
`packages/shadow-objects/src/elements/`. Im Integrationspaket deckt
`test/worker-element-teardown.test.js` (83 Zeilen, 2 Tests) genau einen Fall ab: die verworfene
`ready()`-Zusage nach einem Abbau. Die E2E-Seiten benutzen die Attribute als Markup-Konstanten —
`local`, `no-autostart`, `auto-sync="no"`, `auto-sync="20fps"`, `src`, `ns`,
`no-structured-clone` — und prüfen dabei das Environment, nie das Attribut. Ungeprüft ist damit:
die gesamte Wertlogik des `auto-sync`-Effects (`ShaeWorkerElement.ts:250-296`), der `autoSync`-Setter
(`:129-134`), `shouldAutostart` (`:121-123`), der Wächter am `local`-Attribut (`:188-192`), das
Umschalten von `no-structured-clone` (`:194-196`, `:298-303`) und die Behandlung von `src`
(`:202-208`).

**Fund 3 — `autoSync` als Zahl bedeutet »frame«, nicht Millisekunden.** Der Setter (`:129-134`)
wandelt alles, was kein String ist, über `val ? DefaultAutoSync : 'no'` um. Gemessen:
`el.autoSync = 30` ergibt `'frame'`, nicht `'30'`. Über das Attribut (`auto-sync="30"`) ergibt
derselbe Wert dagegen einen 30-ms-Intervall. Property und Attribut widersprechen sich also für jede
Zahl außer `0`. Kein Defekt im engeren Sinn — der Setter tut, was dasteht —, aber eine Falle ohne
jeden Hinweis in der Dokumentation. Gehört zu Paket 12.

**Fund 4 — `shadowEnv.view` bleibt bis zum `start()` leer.** `ShaeWorkerElement` registriert seinen
`ns$.onChange` (`:46-48`) erst nach `super()`, und `ShaeElement` hat das Attribut da bereits gelesen.
Bei `<shae-worker ns="x">` ändert sich `ns$` danach nie wieder, der Handler läuft nie, und
`shadowEnv.view` bleibt `undefined`, bis `start()` es über `??=` nachholt (`:215`). Gemessen und
ohne Folge, weil jeder Weg ins Environment über `start()` führt — aber genau die Sorte
Reihenfolgeabhängigkeit, die ein Umbau still kaputtmacht. Die Spec hält beide Hälften fest.
Nachgeschärft am 2026-08-16: die Folge reicht eine Stufe weiter, als der Satz oben sagt. Für ein
`<shae-worker no-autostart ns="x">` entsteht überhaupt kein ComponentContext für `x` — nach dem
Upgrade steht der Namespace nicht in `ComponentContext.getContextsMap()`. Erst `start()` legt ihn
an. Gemessen, und für die Aufräumregel oben der Grund, warum ein Sweep über die Map billiger ist
als eine Liste der Namespaces, die eine Spec angefasst zu haben glaubt.

**Was der Logger dabei mitredet.** `ConsoleLogger.sharedConfig.enable` wird beim Laden aus
`location.host.startsWith('localhost')` bestimmt. Unter dem Vitest-Browser-Provider ist das wahr
(gemessen: `localhost:63315`), aber es ist eine stille Abhängigkeit von der Bind-Adresse des
Testservers. `logger.warn` hängt daran, `logger.error` nicht — `ConsoleLogger.error` druckt
ungefiltert, die Gates sitzen an den Aufrufstellen. Die Spec macht das explizit, statt sich darauf
zu verlassen: `ConsoleLogger` ist über den öffentlichen Untereinstieg
`@spearwolf/shadow-objects/ConsoleLogger.js` importierbar. Zweitens: `#print` ruft
`console[level]('%c<namespace>', styles, ...args)` — die Meldung steht im dritten Argument, nicht
im ersten. Wer `args[0]` prüft, prüft den Formatstring.

**Was spätere Pakete anfassen werden.** Keines. Die Pakete 5 bis 12 fassen `ShaeWorkerElement` nicht
an; Paket 12 trägt Fund 3 in die Dokumentation nach.

- Dateien: `packages/shadow-objects-testing/test/worker-element-attributes.test.js` (neu), `packages/shadow-objects-testing/src/mount.js`, `packages/shadow-objects-testing/test/ent-element-attributes.test.js`, `packages/shadow-objects-testing/test/ent-element-events.test.js`, `CHANGELOG.md` (Repo-Wurzel)
- Vorgehen:
  0. Die Aufräumregel in `src/mount.js` verankern: `unmountAll()` läuft nach dem Entfernen der
     Container über `ComponentContext.getContextsMap().values()` und ruft auf jedem Kontext
     `clear()`, statt nur den globalen zu treffen. Der Doc-Kommentar sagt danach, dass der Helfer
     jeden Namespace aufräumt, den eine Spec angelegt hat — der Satz, der die Eigenverantwortung
     verlangt, fällt weg. Anschließend die zwei nun toten `finally`-Blöcke streichen: in
     `test/ent-element-attributes.test.js` der Fall `el.ns = "other"`, in
     `test/ent-element-events.test.js` der Fall `p.ns = 'probe-ns'`. Beide Dateien müssen danach
     unverändert 22 bzw. 30 grüne Tests melden. Begründung steht oben unter »Entschieden«.
  1. `test/worker-element-attributes.test.js` anlegen. Kopf: `expect` aus `@esm-bundle/chai`,
     `ComponentContext`, `LocalShadowObjectEnv` und `ShaeWorkerElement` aus
     `@spearwolf/shadow-objects`, `ConsoleLogger` aus `@spearwolf/shadow-objects/ConsoleLogger.js`,
     der Seiteneffekt-Import `@spearwolf/shadow-objects/shae-worker.js`, dazu `mount`/`unmountAll`
     aus `../src/mount.js` und `withSwallowedErrors` aus `../src/withSwallowedErrors.js` (alle drei
     aus Paket 4a, Signaturen oben). Jeder Fall montiert sein eigenes Element und ruft am Ende
     `el.destroy()`; `afterEach` ist `unmountAll`, das auch die Namespaces mitnimmt. Grundform, wo
     nichts anderes dabeisteht: `<shae-worker local no-autostart auto-sync="no"></shae-worker>` —
     `local` hält den Worker im selben Thread, `no-autostart` verhindert, dass ein Environment
     entsteht, das der Fall nicht braucht. Jeder Fall, der `start()` ruft, bekommt einen eigenen
     Namespace und baut sein Element ab, bevor der nächste startet; zwei lebende Environments auf
     demselben Namespace erzeugen sonst ein `overwrite a namespace already in use` aus
     `ShadowEnv.ts:97-102`.
     Ein `before`/`after`-Paar am Kopf der Datei setzt `ConsoleLogger.sharedConfig.enable` und
     `.warn` auf `true` und stellt die vorherigen Werte danach wieder her. Ohne das hängt jede
     Warnungs-Erwartung dieser Datei an der Bind-Adresse des Testservers (siehe »Was der Logger
     dabei mitredet«). Ein Kommentar sagt das.
  2. Tabelle A »auto-sync attribute values«, 11 Fälle in einer Schleife über
     `<shae-worker local no-autostart auto-sync="${value}">`, geprüft werden `el.autoSync`, der
     Attributwert und — dritte Zusicherung, nachgetragen 2026-08-16 — die während des Montierens
     gesammelten `console.error`- und `console.warn`-Meldungen. Für neun der elf Zeilen ist diese
     Liste leer; genau das trägt die Aussage »ein abgeschalteter Sync meldet nichts«, die vorher
     nirgends geprüft war. Für `0fps` steht dort genau eine Warnung, für `nonsense` genau ein
     Fehler; ihr Wortlaut gehört Schritt 3:

     | Attributwert | `el.autoSync` | Attribut danach |
     |---|---|---|
     | `no` | `'no'` | `'no'` |
     | `off` | `'off'` | `'off'` |
     | `false` | `'false'` | `'false'` |
     | `0` | `'0'` | `'0'` |
     | `-5` | `'-5'` | `'-5'` |
     | `25` | `'25'` | `'25'` |
     | `0fps` | `'0fps'` | `'0fps'` |
     | `20fps` | `'20fps'` | `'20fps'` |
     | `nonsense` | `'nonsense'` | `'nonsense'` |
     | `auto-sync` | `'auto-sync'` | `'auto-sync'` |
     | `YES` | `'yes'` | `'yes'` |

     Nur die letzte Zeile normalisiert, weil `attributeChangedCallback` den Wert durch den Setter
     schickt (`:198-200`) und der trimmt und schreibt klein; alle anderen Werte sind bereits
     kleingeschrieben und ändern sich deshalb nicht. Ein Kommentar über der Tabelle nennt die vier
     Familien, die der Effect daraus macht: Frame-Loop (`true`, `yes`, `on`, `frame`, `auto-sync`),
     `fps`-Suffix, Millisekunden-Zahl, und alles Übrige als »aus«. Alle elf Zeilen sind nachgemessen
     und unverändert gültig.
  3. Block »invalid auto-sync values are reported, not thrown«, 2 Fälle. Beide ersetzen
     `console.error` bzw. `console.warn` lokal und stellen das Original im `finally` wieder her;
     der Vergleichstext entsteht aus den **String-Argumenten** des Aufrufs, nicht aus dem ersten —
     `ConsoleLogger` schiebt `'%c<namespace>'` und einen Style-String davor. Der ganze Fall läuft
     zusätzlich in `withSwallowedErrors`, dessen Rückgabe leer sein muss: aus dem Effect kommt
     nichts nach außen (gemessen).
     - `auto-sync="nonsense"` erzeugt genau eine `console.error`-Meldung, die
       `invalid auto-sync value: nonsense` enthält
     - `auto-sync="0fps"` erzeugt genau eine `console.warn`-Meldung, die
       `invalid auto-sync value: 0fps` enthält
     Kommentar dazu: `-5`, `0`, `false`, `off` und `no` sind gültige Arten, den Sync abzuschalten,
     und melden deshalb nichts — geprüft ist das durch die dritte Zusicherung in Tabelle A.
     Zweiter Kommentar: der Fehlerpfad druckt auch ohne eingeschalteten Logger, der Warnpfad nicht;
     deshalb steht das `before`/`after`-Paar aus Schritt 1 über der Datei.
  4. Block »the autoSync property setter«, 8 Fälle, geprüft werden `el.autoSync` und der
     Attributwert. Sechs davon beschreiben eine Folge von Zuweisungen auf einem Element, das mit
     `auto-sync="no"` startet: `= false` → `'no'`/`'no'`; `= true` → `'frame'`/`'frame'`;
     `= 0` → `'no'`/`'no'`; `= 30` → `'frame'`/`'frame'`; `= '  30FPS '` → `'30fps'`/`'30fps'`;
     `= 'off'` → `'off'`/`'off'`. Jede Zeile bekommt ihr eigenes `it`, das die Schritte bis zu
     seinem eigenen auf einem frischen Element nachspielt, statt dort weiterzumachen, wo das
     vorherige `it` aufgehört hat — das ist die Konvention, die 4a in
     `test/ent-element-attributes.test.js` eingeführt hat, und sie ist der Grund, warum die Datei
     unter `--sequence.shuffle` grün bleibt. Die Zeile mit `30` bekommt einen Kommentar, dass sie
     den Ist-Zustand festhält — Fund 3, alles Truthy, das kein String ist, wird zum Vorgabewert.
     Dazu zwei eigene Fälle: `removeAttribute('auto-sync')` ergibt `el.autoSync === 'frame'` und
     schreibt **kein** Attribut zurück (`:82-85`); und ein Element ganz ohne `auto-sync`-Attribut hat
     `el.autoSync === ShaeWorkerElement.DefaultAutoSync === 'frame'` und ebenfalls kein Attribut.
     Alle acht Zeilen sind nachgemessen und unverändert gültig.
  5. Block »no-autostart«, 6 Fälle. Fünf über `el.shouldAutostart`:
     `no-autostart` bare → `false`; `no-autostart="false"` → `true`; `no-autostart="0"` → `true`;
     ohne das Attribut → `true`; `el.autostart = false` bei fehlendem Attribut → `false`. Kommentar:
     `readBooleanAttribute` liest einen vorhandenen leeren Wert als `1` und prüft sonst gegen die
     Wahrheitswerte — ein `no-autostart="false"` schaltet den Autostart also wieder **ein**.
     Sechster Fall, nachgetragen 2026-08-16 als Gegenstück zu dem, was 4a für `<shae-ent>` festhält:
     `customElements.get('shae-worker').observedAttributes` ist genau
     `['ns', 'local', 'src', 'no-structured-clone', 'auto-sync']`. `no-autostart` steht nicht darin
     und wird bei jedem Zugriff frisch gelesen — ohne diesen Fall behauptet der Block etwas über den
     Lesezeitpunkt, was nichts prüft.
  6. Block »local, no-structured-clone, src«, 7 Fälle. Die ersten drei laufen auf einem gestarteten
     Element mit eigenem Namespace, die übrigen vier ausdrücklich **nicht**:
     - `<shae-worker local no-autostart ns="…">`, dann `await el.start()`: `el.shadowEnv.envProxy` ist
       eine `LocalShadowObjectEnv` und `envProxy.isLocalEnv` ist `true`
     - nach `start()` löst `el.removeAttribute('local')` genau eine globale Fehlermeldung aus. Gefangen
       wird sie mit `withSwallowedErrors`, weil der Wurf aus einer Custom-Elements-Reaktion nicht beim
       Aufrufer ankommt; die Meldung trägt den Präfix des Browsers, gemessen
       `Uncaught Error: Changing the "local" attribute after the shadowEnv has been created is not supported.` —
       geprüft wird deshalb mit `contain`, nicht mit `equal`
     - nach `start()`: `envProxy.disableStructuredClone` ist `false`, nach
       `setAttribute('no-structured-clone','')` `true`, nach `removeAttribute('no-structured-clone')`
       wieder `false`
     - auf einem **ungestarteten** Element: `setAttribute('src','  /nope.js  ')` ergibt
       `el.src$.value === '/nope.js'` bei unverändertem Attribut `'  /nope.js  '`
     - `removeAttribute('src')` ergibt `el.src$.value === ''`
     - `el.importScript('')` lehnt mit einem `Error` ab, dessen `message` `src is blank` ist
     - `<shae-worker local no-autostart ns="…">`: `el.shadowEnv.view` ist `undefined`, und erst nach
       `await el.start()` ist es der ComponentContext dieses Namespace. Kommentar: Fund 4, der
       `ns`-Handler läuft nur bei einer Änderung, `start()` holt es nach

     Der Hinweis auf das ungestartete Element ist keine Kosmetik: auf einem gestarteten Element löst
     `setAttribute('src', …)` den Import-Effect aus (`:205-207`), Chromium versucht `/nope.js`
     tatsächlich zu laden, und der Fehlschlag landet über `#onUnobservedRejection` als
     `shadowEnv failed` auf `console.error`. Gemessen. Wer die vier `src`-Fälle an das gestartete
     Element aus den ersten drei anhängt, holt sich genau diese Meldung in den Lauf.
  7. Block »lifecycle«, 3 Fälle:
     - `<shae-worker local auto-sync="no" ns="…">` ohne `no-autostart`: direkt nach dem Upgrade ist
       `el.shadowEnv.envProxy` gesetzt — `connectedCallback` startet von selbst
     - `el.remove()`: `el.isConnected$.value` ist sofort `false`, `el.shadowEnv.envProxy` aber noch
       gesetzt; nach einer Runde `setTimeout(…, 0)` ist es `undefined`. Kommentar: der Abbau wartet
       eine Microtask ab (`:237-248`), damit ein Umhängen im selben Task nicht sofort alles einreißt
     - `el.destroy()` ein zweites Mal wirft nicht
  8. In der `CHANGELOG.md` im Repo-Wurzelverzeichnis einen Stichpunkt im Abschnitt zum 2026-08-16
     ergänzen: eine Spec deckt Attribute, `autoSync`-Setter und Lebenszyklus von `<shae-worker>` ab.
     Die Paket-`CHANGELOG.md` bleibt unberührt.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`. Erwartung:
  `pnpm -F shadow-objects-testing test` meldet 16 Dateien und 234 Tests statt 15 und 197 (37 neue
  Fälle: 11 + 2 + 8 + 6 + 7 + 3), `test:ci` damit 529 statt 492, e2e unverändert 362. Die Basiszahlen
  15/197/492 sind der Stand nach 4a und nachgemessen; die Erwartung stieg von 36 auf 37 Fälle, weil
  Schritt 5 den `observedAttributes`-Fall dazubekommen hat. `prop-element-types.test.js` (104),
  `ent-element-attributes.test.js` (22) und `ent-element-events.test.js` (30) müssen ihre Zahlen
  halten — Schritt 0 fasst zwei davon an und darf keinen Fall kosten. Zusätzlich: rc=0 **und** kein
  »Errors«-Block — der `local`-Fall wirft aus einer Custom-Elements-Reaktion und muss vollständig
  gefangen werden. Grün auch unter `--sequence.shuffle`. Kein Testfall darf rot sein: Wer ein anderes
  Ergebnis misst als in den Tabellen steht, ändert nicht den Test, sondern trägt den Unterschied hier
  als Fund ein.
- Commit: `test(elements): cover the shae-worker attributes and lifecycle (TEST-002)`
- Verlauf:
  - Zug 0 (2026-08-16, Planer): zusammen mit 4a geplant. Alle Tabellen in echtem Chromium gemessen.
    Zwei Funde: `autoSync` als Zahl ergibt `frame` statt Millisekunden (Paket 12), `shadowEnv.view`
    bleibt bis zum `start()` leer (ohne Folge, nur festgehalten).
  - Zug 0 (2026-08-16, Planer 4b, nach `8e0e6be`): Detailplan gegen den veränderten Stand
    abgeglichen. Alle zwölf Zeilenangaben in `ShaeWorkerElement.ts` nachgeprüft — unverändert
    gültig; 4a deckt von diesem Paket nichts ab außer der `ns`-Attributmechanik der Basisklasse.
    Sechs Messreihen in echtem Chromium: Tabelle A, `autoSync`-Setter, `shouldAutostart`,
    `local`/`no-structured-clone`/`src`, Lebenszyklus und die Konsolenpfade. Alle vier Falltabellen
    bestätigt, Fund 3 und Fund 4 nachgeprüft und bestätigt. Korrigiert: die Signaturen der 4a-Helfer
    (`mount` liefert den Container, `withSwallowedErrors` ist synchron und liefert Meldungstexte),
    die Reihenfolge-Konvention im Setter-Block (4a spielt nach, statt fortzusetzen), die
    Konsolenprüfung (Meldung steht im dritten Argument, `logger.warn` hängt an
    `ConsoleLogger.sharedConfig.enable`), die unbelegte Aussage über die stillen `auto-sync`-Werte
    (Tabelle A bekommt eine dritte Zusicherung) und die Trennung der `src`-Fälle von einem
    gestarteten Element. Die Aufräumregel aus dem Nebenbefund zu 4a ist entschieden und wandert in
    `unmountAll()`. Ein Fall dazu (`observedAttributes`), Erwartung damit 37 statt 36.

**Finding TEST-002 (high) — Volltext**

*Titel:* Unit-Specs für die Element-Klassen anlegen

*Fundstelle:* `packages/shadow-objects/src/elements/`

*Beschreibung:* src/view/ hat sieben Spec-Dateien für acht Module. src/elements/ hat keine einzige für vier Module mit zusammen 1195 Zeilen — darunter ShaeEntElement mit 427 und ShaePropElement mit 392 Zeilen, also die beiden komplexesten Dateien des View Layers. Getestet wird ausschließlich die Schicht darunter (ComponentContext, ViewComponent, ComponentChanges) sowie das Zusammenspiel von oben durch Integration und E2E. Dazwischen liegt ungeprüft die gesamte Logik, die dieses Audit als fehleranfällig ausweist: Attribut-Parsing, Upgrade-Lifecycle, Elternsuche, Event-Weiterleitung und das Patchen von dispatchEvent. Vier der fünf Code-Defekte in diesem Backlog liegen in diesen beiden Dateien. Das Integrationspaket kompensiert das teilweise und in echtem Chromium, deckt aber nur 13 Szenarien ab und ist nicht darauf ausgelegt, Randfälle einzelner Methoden durchzugehen.

*Empfehlung:* Für ShaeEntElement und ShaePropElement je eine Spec im Integrationspaket anlegen — dort läuft echtes Chromium, was für Custom-Elements-Semantik nötig ist. Vorrang haben die Pfade ohne jede Abdeckung: #updateForwardCustomEventsValue mit allen Attributformen, die Typkonvertierung je Typ, der Upgrade-Pfad und die Elternsuche in ihren Varianten. Die Sonden dieses Audits sind als Ausgangspunkt verwendbar; ihre Ergebnisse stehen bei den jeweiligen Findings.

*Anmerkung des Planers:* Der Audit-Text nennt `ShaeWorkerElement` nicht, zählt seine Zeilen aber mit.
Von den vier Modulen in `src/elements/` ist es das letzte ohne jede Abdeckung seiner Attributlogik;
4a nimmt `ShaeEntElement` und `ShaeElement`, dieses Paket den Rest.

</details>

### [x] 5. Wertepfad von shae-prop

- Hash: `d15ffe9`
- Ergebnis: 2 Runden · VIEW-004 und VIEW-005 behoben · `value = value ?? undefined`, die Leerstring-Normalisierung sitzt in `#readValueAttribute`, ein `try`/`catch` um den gesamten `switch` fängt alle vier werfenden Zweige (`json`, `bigint`, `bigint64array`, `biguint64array`) und meldet über `logger.error` · der JS-Property-Setter wirft nicht mehr, das steht als sichtbare API-Änderung im Paket-CHANGELOG · Doku in `api-reference.md`, `cheat-sheet.md` und `guides.md` nachgezogen, `Backlog.md:279` aktualisiert · Verify grün: lint rc=0, typecheck ✓, test:ci 536, e2e 362, kein »Errors«-Block, mehrfach geshuffelt grün
- Nachweis: 11 Regressionstests vor dem Fix rot gesehen, je mit Meldung im Report; der später ergänzte Change-Trail-Fall einzeln rot gegen den zurückgestellten Quellcode (`expected undefined to deeply equal [ [ 'n', 0 ] ]`). Der Reviewer hat dreifach belegt, dass am Konvertierungs-`switch` außer der Einrückung nichts verändert wurde — `git diff -w`, Zeilenzahlvergleich und ein zeichengenauer Vergleich nach Entfernen der führenden Einrückung, der auch eine Manipulation innerhalb eines Regex-Literals ausgeschlossen hätte.
- Nebenbefunde: `packages/shadow-objects/src/utils/ConsoleLogger.ts` — `loadConfig()` wirft in reinem Node einen `TypeError: localStorage.getItem is not a function`, weil `HAS_LOCAL_STORAGE` nur `'localStorage' in globalThis` prüft und Node 24+ dort einen Stub ohne `getItem` liefert. Im Repo unsichtbar, weil `packages/shadow-objects/vitest.setup.ts` den Stub genau deswegen ersetzt; ein Konsument, der die Bibliothek unter Node SSR-seitig importiert, sieht es beim ersten Logger. Vorbestehend, außerhalb des Audit-Umfangs, dem Nutzer vorgelegt. · `packages/shadow-objects/docs/getting-started.md:54` zeigt `<shae-prop name="count" value="0">` ohne `type` — das Shadow Object bekommt den String `'0'`; korrekt, aber für ein Beispiel namens »count« irreführend. Ziel: Paket 12.
- Folgen: —
- Triage der Nebenbefunde (2026-08-16, Planer Paket 6): Der `ConsoleLogger`-Punkt liegt beim Nutzer und bleibt bis zu seiner Entscheidung draußen — nicht triagiert, nicht eingeplant. Der zweite Punkt ist an der Fundstelle nachgeprüft und **größer als notiert**: `docs/getting-started.md:54` setzt `<shae-prop name="count" value="0">` ohne `type`, `:95` liest ihn als `createSignal(countProp() || 0)`, und weil der String `'0'` truthy ist, steht im Signal der String. `:105` rechnet damit `count.set(count.value + data.value)` — aus `'0' + 1` wird `'01'`. Der Zähler des Einstiegsbeispiels zählt also nicht, er hängt Ziffern aneinander. Echte Folge, Dokumentationsdefekt, kein Codefehler; Ziel bleibt Paket 12, dort mit `type="number"` am `shae-prop` **und** `??` statt `||` in `:95` zu beheben. Beides ist Teil des Beispiels, nicht der Bibliothek.

- Findings: VIEW-004 (high), VIEW-005 (medium)
- Ziel: Falsy-Werte überleben die JS-Property, und ungültige Eingaben werden gemeldet statt geworfen.
- Bereich: `packages/shadow-objects/src/elements/ShaePropElement.ts`
- Hängt ab von: Paket 3
- Modell: stärkste Stufe (angehoben 2026-08-16 — der Fehlerpfad reicht weiter als VIEW-005 beschreibt, siehe die zwei Nachträge unten)
- Nachgetragen 2026-08-16, entschieden durch eine dritte Messung in Chromium über beide Ladepfade (`dist/src` und `dist/bundle.js`) und beide Reihenfolgen: Nach einem Wurf im Konstruktor ist **nur der Attributpfad** tot, nicht der Effect. Das Element steht im Custom-Elements-Zustand »failed«, deshalb feuert `attributeChangedCallback` nie wieder — `setAttribute('value', …)` und `setAttribute('type', …)` bleiben folgenlos. Der Konvertierungs-Effect selbst lebt: `prop.value = '{"b":2}'` über den JS-Property-Setter liefert `{b: 2}`, und `prop.value = '1 2'` wirft synchron einen `SyntaxError` aus `JSON.parse`. Der Grund liegt in `batch()` von signalize 1.0.0-beta.0, das `Batch.current` im `finally` zurücksetzt und Effect-Fehler einsammelt und weiterwirft, statt den Effect abzumelden. Die Folge für dieses Paket: Ein `try`/`catch` um den `batch()` im Konstruktor genügt, um das Element in allen drei Fällen benutzbar zu halten. Ein Schutz **innerhalb** des Effects ist dafür nicht nötig — er wäre nur nötig, wenn der `SyntaxError` aus dem Property-Setter nicht mehr beim Aufrufer ankommen soll. Genau das ist hier zu entscheiden und im Detailplan zu begründen, weil VIEW-005 die Meldung über den `ConsoleLogger` verlangt.
- Nachgetragen 2026-08-16 (Planer Paket 3, Zahl richtiggestellt vom Planer Paket 5): Es sind vier werfende Zweige, nicht zwei — `bigint64array` (`:289`) und `biguint64array` (`:293`) rufen `BigInt(v)` je Element auf und werfen genauso wie `bigint` und `json` (Fund 2 im Detailplan zu Paket 3). Zweitens: Steht der fehlerhafte Wert schon im Markup, läuft der Wurf aus dem `batch()` des Konstruktors und der Effect wird nie wieder ausgeführt — das Element bleibt dauerhaft bei `undefined`, auch nach einem gültigen Wert (Fund 1). VIEW-005 beschreibt nur die mildere Variante. Die Tabelle »Was Paket 5 anfassen wird« im Detailplan zu Paket 3 listet die Testfälle, die dieses Paket mitändert; sie ist die Checkliste am Ende.

<details>
<summary>Detailplan Paket 5</summary>

**Abgleich (2026-08-16, Zug 0 dieses Pakets).** Beide Findings bestehen unverändert.

| Finding | Zustand | Fundstelle heute |
|---|---|---|
| VIEW-004 | unverändert | `ShaePropElement.ts:168` — `value = value \|\| undefined`, wörtlich wie im Audit-Text |
| VIEW-005 | unverändert, Umfang größer | `:297` (`JSON.parse`), `:181` (`BigInt`), dazu `:289` (`BigInt64Array`) und `:293` (`BigUint64Array`) |

Die Zeilennummer `:185` aus dem Finding-Text zeigt heute auf `parseFloat` im
`float`-Zweig; der `BigInt`-Aufruf des `bigint`-Zweigs steht auf `:181`. Vier Zeilen
Versatz, dieselbe Stelle. Der Rest der Fundstellen stimmt zeichengenau. Die
Behauptung von VIEW-004 zur Entity-Seite ist ebenfalls nachgeprüft und trifft zu:
`ComponentChanges.ts:317-327` löscht die Property bei einem ausdrücklichen
`undefined`, und `:254` filtert `undefined` aus den Properties eines
`CreateEntities`-Eintrags heraus. Ein über die JS-Property gesetztes `0` erreicht den
Kernel heute also gar nicht.

**Wo der Fehlerschutz sitzt: im Effect, nicht um den `batch()`.** VIEW-005 verlangt
Meldung über den `ConsoleLogger` und `undefined` als Wert — das lässt sich nur dort
erfüllen, wo der Wurf entsteht, und deckt von dort aus alle vier Eingänge zugleich ab
(`batch()` im Konstruktor, `batch()` in `connectedCallback`, `attributeChangedCallback`
und den JS-Property-Setter). Ein `catch` um den `batch()` bliebe stumm, hielte den
alten Wert und ließe den Attributpfad nach dem Upgrade weiter ungeschützt werfen;
zusätzlich zum Schutz im Effect wäre es ein Blankoschein, der jeden künftigen Fehler
aus jedem Effect dieses Elements verschluckt. Also genau eine Stelle: der `switch`.

**Folge: der Property-Setter wirft nicht mehr.** `prop.value = '{oops'` meldet künftig
über den Logger und setzt `undefined`, statt synchron einen `SyntaxError` an den
Aufrufer zu geben. Das ist aus der Empfehlung von VIEW-005 ableitbar und keine
Ermessensfrage: Der Finding-Text erklärt ungültige Eingabe zum normalen Betriebsfall
dieses Elements und unterscheidet dabei keine Pfade. Ein Schutz, der nur den
Attributpfad erfasst, ließe dieselbe Eingabe auf dem einen Weg warnen und auf dem
anderen werfen — genau die Uneinheitlichkeit, die das Finding beschreibt. Sichtbare
API-Änderung, gehört als solche in `CHANGELOG.md` und in die `api-reference.md`.

**Leerstring und Whitespace.** Drei Codezeilen setzen die Entscheidung aus dem Plankopf um:

| Fall | Ergebnis | Codezeile |
|---|---|---|
| `value` fehlt | `undefined` | `#readValueAttribute` (`:373-375`) |
| `value=""` | `undefined` | `#readValueAttribute` (`:373-375`) |
| `prop.value = 0 \| false \| ''` | `0` / `false` / `''` | `value = value ?? undefined` (`:168`) |
| `value="   "` mit Trim | `''` | `:164-166` trimmt, `:168` lässt `''` stehen |

Der letzte Fall ist die Stelle, an der Paket 3 den Ist-Zustand ausdrücklich als
»expected to change« markiert hat, und er ist bewusst so entschieden: `valueIn$` muss
den **rohen** Attributwert halten, weil ein Umschalten von `no-trim` allein das
Ergebnis neu berechnen können muss (`prop-element-types.test.js:255-266`). Eine
Normalisierung, die den Trim-Zustand mitliest, wäre für `value="   "` mit `no-trim`
schlicht falsch — dort *ist* der Whitespace der Wert. `#readValueAttribute` normalisiert
deshalb ausschließlich das, was ohne jeden Kontext entscheidbar ist: kein Attribut oder
ein leeres Attribut heißt »kein Wert«. Alles andere geht roh weiter, und was nach dem
Trim übrig bleibt, ist das Ergebnis. Zweite Folge davon, die einen eigenen Testfall
bekommt: `type="number" value="   "` ergibt `0`, weil `Number('')` `0` ist.

**Regressionstests zuerst.** Dieses Paket ist ein Bugfix. Schritt 1 bis 3 schreiben die
Tests, Schritt 4 sieht sie rot, erst Schritt 5 fasst `ShaePropElement.ts` an. Die
Tabelle in Schritt 4 nennt jeden roten Fall mit der Meldung, die er im roten Zustand
erzeugt — weicht eine davon ab, stimmt die Annahme über den Ist-Zustand nicht und
das gehört in den Verlauf, bevor irgendetwas repariert wird.

- Dateien: `packages/shadow-objects/src/elements/ShaePropElement.ts`, `packages/shadow-objects-testing/test/prop-element-types.test.js`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/docs/cheat-sheet.md`, `packages/shadow-objects/docs/guides.md`, `packages/shadow-objects/README.md`, `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. In `prop-element-types.test.js` den vierten `describe`-Block umschreiben. Titel wird `shae-prop type conversion — malformed input that is reported instead of thrown`. Die vier Fälle aus `throwCases` (`bigint`/`'abc'`, `json`/`'{oops'`, `bigint64array`/`'1 x 3'`, `biguint64array`/`'1 x 3'`) behalten ihre Daten, heißen künftig `${type} reports invalid input on the property path` und tragen die Erwartung: `expect(() => {prop.value = badValue;}).to.not.throw()` und danach `expect(prop.value).to.be.undefined`. Der Kommentar über der Tabelle, der den Property-Pfad damit begründet, dass die Ausnahme dort den Aufrufer erreicht, wird durch die neue Begründung ersetzt: der Property-Pfad läuft synchron, also ist unmittelbar nach der Zuweisung ablesbar, was aus dem ungültigen Wert geworden ist.
  2. Im selben Block die zwei Einzelfälle umschreiben und einen dritten anlegen:
     - `a throw at upgrade time leaves the element dead` wird zu `invalid input at upgrade time leaves the element usable`: `withSwallowedErrors` um das `mount({type: 'json', value: '{oops'})` bleibt stehen, liefert aber jetzt `[]` — kein globales `error`-Event mehr. Danach `expect(prop.value).to.be.undefined`, dann `prop.setAttribute('value', '{"a":1}')` und `expect(prop.value).to.deep.equal({a: 1})`. Der Kommentar, der den »failed«-Zustand des Custom Element beschreibt, entfällt ersatzlos (Konvention: kein Rückblick auf den Vorzustand); an seine Stelle tritt ein Satz darüber, dass ein ungültiger Wert im Markup das Element nicht am Weiterarbeiten hindert.
     - `a throw after upgrade keeps the previous value and recovers` wird zu `invalid input after upgrade clears the value and recovers`: nach `prop.setAttribute('value', '{oops')` ist `prop.value` `undefined` — nicht mehr der vorherige Wert —, `withSwallowedErrors` liefert `[]`, und ein anschließendes `prop.setAttribute('value', '{"z":9}')` ergibt `{z: 9}`.
     - Neu: `the conversion failure is reported through the ConsoleLogger`. `ConsoleLogger` aus dem öffentlichen Subpfad `@spearwolf/shadow-objects/ConsoleLogger.js` importieren, `sinon` ist im Paket bereits in Benutzung (`build-change-trail.test.js:5`). Ablauf: `ConsoleLogger.sharedConfig.enable` und `.warn` merken und auf `true` setzen, `sinon.stub(console, 'warn')`, `mount({type: 'json', value: '{oops'})`, dann prüfen, dass der Stub genau einmal gerufen wurde und dass eines seiner Argumente den Typnamen `json` enthält. In einem `finally` den Stub zurücknehmen und beide Konfigurationswerte wiederherstellen. Kommentar dazu: die Voreinstellung des Loggers hängt am Hostnamen, deshalb wird sie für diesen Fall ausdrücklich gesetzt statt vorausgesetzt.
  3. Den siebten `describe`-Block (`falsy values`) umschreiben und einen achten anlegen:
     - `value="" with type="number" is undefined` bleibt inhaltlich stehen; nur der Kommentar wird ersetzt — die Normalisierung sitzt in `#readValueAttribute`, ein leeres Attribut ist dasselbe wie ein fehlendes.
     - `value="0" with type="number" is 0, because the string "0" is truthy` bleibt unverändert, verliert aber die Begründung im Titel: er heißt künftig `value="0" with type="number" is 0`.
     - `a whitespace only value is undefined once trimmed` wird zu `a whitespace only value is the empty string once trimmed`: `mount({value: '   '})`, `expect(prop.value).to.equal('')`.
     - Neu: `a whitespace only value with a type is converted like an empty string` — `mount({type: 'number', value: '   '})` ergibt `0`, weil `Number('')` `0` ist. Ein Kommentar sagt genau das.
     - `falsy values assigned through the JS property are lost` wird zu `falsy values assigned through the JS property survive` und mountet **ohne** `type` (`mount()`), weil ein gesetzter Typ auf den Leerstring angewendet würde: `prop.value = 0` → `0`, `prop.value = false` → `false`, `prop.value = ''` → `''`, `prop.value = 7` → `7`.
     - Neu: `an empty string assigned through the JS property is converted when a type is set` — `mount({type: 'number'})`, `prop.value = ''` ergibt `0`. Der Fall trennt die zwei Regeln voneinander: der Wert überlebt die Normalisierung, und danach greift die Konvertierung wie auf jeden anderen String.
     - Neu: `null and undefined assigned through the JS property clear the value` — `mount()`, `prop.value = 'x'`, dann `prop.value = null` → `undefined`, dann `prop.value = 'y'`, dann `prop.value = undefined` → `undefined`. Läuft heute schon grün und hält fest, dass `??` genau diese beiden und sonst nichts abräumt.
     - `a non-string value assigned through the JS property passes through unchanged` bleibt unverändert.
     - Achter Block, neu: `shae-prop value path — what reaches the entity`. Zwei Fälle über den Change Trail, gebaut wie `build-change-trail.test.js:9-33`, also `const cc = ComponentContext.get();` und `cc.buildChangeTrails()` ohne `<shae-worker>`: `a falsy value is a property value, not a removal` mountet `<shae-ent token="probe"><shae-prop name="n" value="0" type="number"></shae-prop></shae-ent>` und erwartet im `CreateEntities`-Eintrag `properties: [['n', 0]]`; `an empty value attribute leaves the property unset` mountet dasselbe mit `value=""` und erwartet einen Eintrag ohne Schlüssel `n`. Der erste Fall ist der eigentliche Beleg von VIEW-004 — er prüft nicht die Property des Elements, sondern was im Kernel ankommt. Kommentar dazu: `ComponentChanges` liest ein ausdrückliches `undefined` als Entfernen der Property, `0` ist deshalb nicht dasselbe wie »kein Wert«.
  4. `pnpm -F shadow-objects-testing test` laufen lassen und die roten Fälle einzeln gegen diese Tabelle halten, bevor eine Zeile Produktivcode entsteht:

     | Testfall | Meldung im roten Zustand |
     |---|---|
     | `bigint reports invalid input on the property path` | `expected [Function] to not throw an error but 'SyntaxError: Cannot convert abc to a BigInt' was thrown` |
     | `json reports invalid input on the property path` | `expected [Function] to not throw an error but 'SyntaxError: Expected property name or …' was thrown` |
     | `bigint64array reports invalid input on the property path` | wie `bigint`, mit `x` als nicht konvertierbarem Teilstring |
     | `biguint64array reports invalid input on the property path` | dito |
     | `invalid input at upgrade time leaves the element usable` | `expected [ 'Uncaught SyntaxError: …' ] to have a length of 0 but got 1` |
     | `invalid input after upgrade clears the value and recovers` | `expected [ 'Uncaught SyntaxError: …' ] to have a length of 0 but got 1` |
     | `the conversion failure is reported through the ConsoleLogger` | `expected warn to have been called exactly once, but it was called 0 times` |
     | `a whitespace only value is the empty string once trimmed` | `expected undefined to equal ''` |
     | `a whitespace only value with a type is converted like an empty string` | `expected undefined to equal 0` |
     | `falsy values assigned through the JS property survive` | `expected undefined to equal 0` |
     | `an empty string assigned through the JS property is converted when a type is set` | `expected undefined to equal 0` |
     | `a falsy value is a property value, not a removal` | `expected [] to deep equal [ [ 'n', 0 ] ]` |

     Grün bleiben müssen dabei: `value="" with type="number" is undefined`, `an empty value attribute leaves the property unset`, `null and undefined assigned through the JS property clear the value`, `a non-string value assigned through the JS property passes through unchanged`, der gesamte `no-trim`-Block und die drei Tabellenblöcke der Typkonvertierung. Wird einer davon rot, ist der Testumbau schuld, nicht der Ist-Zustand.
  5. In `ShaePropElement.ts:373-375` `#readValueAttribute` umstellen. Der Attributwert wird gelesen; ist er `null` (kein Attribut) oder der Leerstring, geht `undefined` in `valueIn$`, sonst der rohe String. Ausdrücklich vergleichen, nicht über `||` abkürzen — nach diesem Paket steht in dieser Datei keine Falsy-Prüfung mehr, die versehentlich mehr abräumt als gemeint. Kommentar darüber: ein leeres `value`-Attribut heißt »kein Wert«; Whitespace bleibt roh stehen, weil `valueIn$` die Quelle ist, aus der ein Umschalten von `no-trim` neu rechnet.
  6. In `ShaePropElement.ts:168` `value = value || undefined` durch `value = value ?? undefined` ersetzen. Kommentar in einem Satz: nur `null` und `undefined` bedeuten »kein Wert«, `0`, `false` und `''` sind Werte.
  7. In `ShaePropElement.ts:171-307` den gesamten `switch` in `try`/`catch` legen. Im `catch` über `this.logger.isWarn` gegatterter Aufruf von `this.logger.warn`, in der Bauform der beiden vorhandenen Warnungen (`:301-306`, `:380-384`): erstes Argument ein Template-String mit `[${this.name}]` und dem Hinweis, dass sich der Wert nicht in den Typ `"${type}"` überführen ließ, zweites Argument ein Objekt mit `value`, `error` und `shaeProp: this`. Danach `value = undefined`, damit das anschließende `this.valueOut$.set(value)` (`:310`) den Wert räumt. Kommentar über dem `try`: ungültige Eingabe ist für dieses Element ein Betriebsfall, kein Ausnahmezustand — sie wird gemeldet und räumt den Wert, statt aus einem Effect heraus zu werfen. Der `default:`-Zweig (`:300-306`) bleibt unangetastet, er gehört Paket 11. Die Bedingung `value != null && typeof value === 'string' && type` (`:170`) bleibt ebenfalls, wie sie ist; ihr erster Teil ist seit `??` redundant, aber das Aufräumen gehört in den Umbau von Paket 11 und nicht in einen Bugfix.
  8. `pnpm -F shadow-objects-testing test` erneut laufen lassen: alle 110 Fälle der Datei grün, 240 im Paket. Danach einmal mit `--sequence.shuffle`, weil der neue Logger-Fall globalen Zustand anfasst und ihn nur im `finally` zurückgibt.
  9. `packages/shadow-objects/docs/api-reference.md`, Abschnitt `### <shae-prop>` (`:1193-1230`): in der Attributtabelle die Zeile zu `value` um den Satz ergänzen, dass ein leeres Attribut wie ein fehlendes zählt und keine Property setzt. Darunter, zwischen Typtabelle und Codebeispiel, zwei neue Unterabschnitte in der Bauform der übrigen Elemente dieser Datei (`#### Attributes` / `#### Methods` / `#### DOM Events`): `#### JavaScript API` mit einer Tabelle für `name`, `value` (Lesen liefert den konvertierten Wert; Schreiben umgeht das Attribut; `0`, `false` und `''` sind Werte und werden gesetzt; `null` und `undefined` räumen die Property, siehe die Regel bei `ViewComponent.setProperty` in `:615`; ein Wert, der kein String ist, geht ohne Konvertierung durch) und `shouldTrim`. Dazu `#### Invalid Values`: ein Wert, der sich nicht in den angeforderten Typ überführen lässt — ungültiges JSON, ein nicht konvertierbarer `bigint`-String, dasselbe in `bigint64array` und `biguint64array` —, wird über den `ConsoleLogger` gemeldet und die Property auf `undefined` gesetzt; alle übrigen Typen liefern `NaN` oder ein gefülltes Typed Array und melden nichts.
  10. `packages/shadow-objects/docs/cheat-sheet.md`, Abschnitt `### <shae-prop>` (`:230-248`): die `value`-Zeile der Attributtabelle um den Leerstring-Fall ergänzen und unter die Typtabelle eine Zeile setzen, die auf die zwei Regeln zeigt — ungültige Eingabe meldet und räumt, Falsy-Werte über die JS-Property bleiben erhalten. Die Datei ist eine Kurzreferenz; zwei Zeilen, kein Absatz.
  11. `packages/shadow-objects/docs/guides.md`, Abschnitt »`<shae-prop>` -- Property Binder« (`:334-346`): einen Satz hinter die Aufzählung der Typwerte, dass ein Wert, der sich nicht überführen lässt, als Warnung in der Konsole landet und die Property leer bleibt.
  12. `packages/shadow-objects/README.md` prüfen: die einzige Erwähnung von `<shae-prop>` steht im Quick Example (`:28`) und trifft keine Aussage über Leerwerte, Falsy-Werte oder Fehlerfälle. Ist das beim Umsetzen noch so, bleibt die Datei unangetastet und die Prüfung wird in der Verlaufszeile festgehalten — die Konvention verlangt den Abgleich, nicht eine kosmetische Änderung.
  13. `packages/shadow-objects/CHANGELOG.md`, Abschnitt `## [Unreleased]`: zwei Stichpunkte. Erstens `**Fixed (elements):**` — `<shae-prop>` behält `0`, `false` und den Leerstring, egal ob sie über die JS-Property oder nach der Typkonvertierung entstehen; ein leeres `value`-Attribut zählt weiterhin als fehlender Wert. Zweitens `**Changed (elements):**` — ein Wert, der sich nicht in den angeforderten Typ überführen lässt, wird über den `ConsoleLogger` gemeldet und setzt die Property auf `undefined`, statt aus dem Element heraus zu werfen; das betrifft `json`, `bigint`, `bigint64array` und `biguint64array` und gilt für beide Wege, Attribut wie JS-Property. Beide Punkte erreichen bestehende Nutzer: der erste, weil ein Shadow Object jetzt `0` statt `undefined` sieht, der zweite, weil ein `try`/`catch` um eine Zuweisung an `prop.value` nicht mehr auslöst. Deshalb im Vorspann des Abschnitts die Aufzählung der Änderungen mit Konsumentenwirkung um beide erweitern und die Zahl im Satz »Three of them reach existing consumers« auf »Five« ziehen.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`. Erwartung: `test:ci` 535 statt 529, davon `shadow-objects-testing` 240 statt 234 (`prop-element-types.test.js` 110 statt 104); e2e unverändert 362; kein »Errors«-Block. Weicht die Zahl nach oben ab, ist ein Fall doppelt angelegt; nach unten, fehlt einer der sechs neuen. Zusätzlich: `packages/shadow-objects-e2e/src/async-events.js:115` und `src/multi-env.js:158,193-195` schreiben über den JS-Property-Setter — sie führen keine Falsy-Werte, müssen also unverändert grün bleiben; werden sie rot, ist die Normalisierung an die falsche Stelle geraten.
- Commit: `fix(elements): keep falsy shae-prop values and report invalid conversion input (VIEW-004, VIEW-005)`
- Verlauf:
  - Zug 0 (2026-08-16, Planer): Beide Findings gegen die Quelle geprüft — unverändert, nur `:185` aus dem VIEW-005-Text zeigt heute auf `parseFloat`, der `BigInt`-Aufruf steht auf `:181`. Die Aussage von VIEW-004 zur Entity-Seite gegen `ComponentChanges.ts:254` und `:317-327` gehalten: trifft zu. `batch()` von signalize 1.0.0-beta.0 im installierten Bundle nachgelesen (`dist/index.js:121-140`) — es sammelt Fehler und wirft sie am Ende, ohne den Effect abzumelden; das bestätigt den Nachtrag oben und macht den Schutz im Effect zur einzigen nötigen Stelle. Entschieden: Schutz nur im `switch`, kein `catch` um den `batch()`; der Property-Setter wirft nicht mehr; `value="   "` ergibt künftig `''` und mit `type="number"` folglich `0`. Testzahl des Integrationspakets zur Sicherheit nachgemessen: 234 vor diesem Paket.

**Finding VIEW-004 (high) — Volltext**

*Titel:* Falsy-Werte in der value-Property erhalten

*Fundstelle:* `packages/shadow-objects/src/elements/ShaePropElement.ts:168`

*Beschreibung:* Die Zeile `value = value || undefined` verwirft jeden falsy Wert. Über den Attributpfad fällt das kaum auf, weil dort immer ein String ankommt und die Typkonvertierung erst danach läuft — `value="0"` mit `type="int"` überlebt, weil der String `"0"` truthy ist. Über den JS-Property-Setter greift der Verlust unmittelbar: `el.value = 0`, `el.value = false` und `el.value = ''` setzen die Property allesamt auf `undefined`. Damit sind Null, `false` und der leere String über die programmatische API nicht darstellbar — ausgerechnet die Werte, die in einem Zähler, einem Flag oder einem Textfeld am häufigsten vorkommen. Für die Entity-Seite ist `undefined` zudem nicht dasselbe wie `0`: `ComponentChanges` behandelt ein explizites `undefined` als Entfernen der Property.

*Empfehlung:* `value ?? undefined` statt `value || undefined` verwenden. Die Normalisierung von Leerstring auf `undefined`, falls sie für den Attributpfad gewollt ist, gehört dorthin, wo Attribute gelesen werden (`#readValueAttribute`), nicht in den gemeinsamen Konvertierungs-Effect. Ein Testfall je Falsy-Wert über beide Pfade gehört dazu.

*Beleg des Audits:* Sonde, drei Zuweisungen über die JS-Property, danach ausgelesen: `PROBE-D {}` — `JSON.stringify` verwirft `undefined`, alle drei Werte (`0`, `false`, `''`) sind verloren.

**Finding VIEW-005 (medium) — Volltext**

*Titel:* Parser-Fehler in der Typkonvertierung abfangen

*Fundstelle:* `packages/shadow-objects/src/elements/ShaePropElement.ts:297, :185`

*Beschreibung:* `JSON.parse(value)` bei `type="json"` und `BigInt(value)` bei `type="bigint"` laufen ungeschützt innerhalb eines `createEffect`. Ein fehlerhaftes Attribut im Markup — leicht passiert, weil JSON in einem HTML-Attribut Anführungszeichen escapen muss — wirft damit aus einem reaktiven Effect heraus. Der Fehler landet als uncaught error im Fenster, der Effect bricht mitten in seiner Auswertung ab, und `valueOut$` behält den vorherigen Wert, während das Attribut bereits den neuen zeigt. Für ein Element, dessen Aufgabe das Übersetzen von Attributwerten ist, ist ungültige Eingabe ein normaler Betriebsfall, kein Ausnahmezustand. Alle übrigen 38 Typen sind fehlertolerant: `parseInt` liefert `NaN`, die TypedArray-Konstruktoren liefern gefüllte Arrays, und ein unbekannter Typ wird geloggt statt geworfen.

*Empfehlung:* Beide Aufrufe in `try`/`catch` legen, im Fehlerfall über den vorhandenen `ConsoleLogger` warnen — wie es `#readTypeAttribute` für unbekannte Typen bereits tut — und den Wert auf `undefined` setzen. Zwei Testfälle: fehlerhaftes JSON und ein nicht konvertierbarer BigInt-String.

*Beleg des Audits:* Sonde mit `<shae-prop type="json" value="{oops">`: `PROBE-E {"threw":null,"errors":["Uncaught SyntaxError: Expected property name or '}' ..."]}`

*Anmerkung des Planers:* Es sind vier werfende Zweige, nicht zwei — `bigint64array` (`:289`) und `biguint64array` (`:293`) rufen `BigInt(v)` je Element auf und werfen genauso (Fund 2 aus Paket 3). Damit sind es 38 fehlertolerante Typnamen bei 42 Typnamen insgesamt; die Zahl im Finding-Text stimmt zufällig, weil sie die vier auf zwei falsch verteilt. Zweitens: Der Schutz wandert nicht an die zwei genannten Aufrufe, sondern um den gesamten `switch` — dieselbe Wirkung für alle vier Zweige, eine Stelle statt vier, und Paket 11 findet sie beim Umbau zur Konvertertabelle als einzelnen Punkt vor. Drittens: `valueOut$` behält den vorherigen Wert nur nach dem Upgrade; steht die fehlerhafte Eingabe schon im Markup, ist der Attributpfad des Elements danach dauerhaft tot (Fund 1 aus Paket 3).

</details>

### [x] 6. Upgrade-Reihenfolge korrigiert den Entity Tree

- Hash: `6f8a5d2`
- Ergebnis: 4 Runden · VIEW-001 und TEST-003 behoben · ein in place upgradetes Element fordert die Kinder seines eigenen neuen Elternteils zum Re-Request auf (`ShaeEntElement.#askPeersToReRequestParent`, `ComponentContext.dispatchReRequestParentSiblings`) · Verify grün: lint rc=0, typecheck ✓, test:ci 546, e2e 380, kein »Errors«-Block, geshuffelt grün
- Zusätzlich behoben, gleiche Ursache, im Audit nicht enthalten: `ComponentContext.dispatchReRequestParentRoots` iterierte über das lebende `#rootComponents`-Array, während das Umhängen Einträge daraus entfernte — jede zweite Wurzel wurde übersprungen. Gemessen `["n1", null, "n1"]` bei drei Wurzelkandidaten.
- Nachweis: Jeder Fix zuerst rot gesehen (`expected 'gp-a' to equal 'mid-a'`, `expected 'gp-b' to equal 'mid-b'`, `expected [ 'mid-g', undefined, 'mid-g' ] to deeply equal [...]`, `expected 'gp-k' to equal 'in-k'`, `expected 'gp-q' to equal 'mid-q'`). Vier Fälle der neuen Spec sind Wächter und vor wie nach dem Fix grün — ihr Grün belegt, dass nichts kaputtgeht, nicht dass der Fix wirkt.
- Zwei Folgen dieses Laufs, im selben Paket geschlossen: Der erste Entwurf war quadratisch in der Geschwisterzahl (300 Geschwister ergaben 45.152 Anfragen und 103,7 ms); drei Guards drücken das auf 300 Anfragen. Zwei dieser Guards nahmen dann an, sie könnten in Shadow Roots hineinsehen — `assignedSlot` und `element.shadowRoot` sind bei `mode: 'closed'` beide `null` —, und verwarfen berechtigte Aufforderungen. Beide geschlossen: der Sender hängt den neuen Vorfahren nur noch ans Signal, wenn der Aufstieg ihn sehen kann, und die Kinderlos-Abkürzung ist gestrichen. Die Regel dahinter steht als Kommentar im Code: wo der Blick endet, endet auch die Berechtigung, etwas auszuschließen.
- Nebenbefunde: Der `isBelow`-Aufstieg bleibt n²/2 mit sehr kleiner Konstante — bei einigen tausend kinderlosen Geschwistern unter einem Elternteil wird das wieder sichtbar (gemessen 1200 Geschwister: 251 ms gegen 57 ms). Zwei Größenordnungen unter dem Ausgangszustand, kein Blocker, gehört in den Backlog. · `dispatchReRequestParentRoots` kennt keinen Absender und kann deshalb nicht filtern; für Seiten mit sehr vielen Wurzel-Entities bleibt der Zweig linear pro Verbindung. Vorbestehend, durch die Guards eher besser geworden. · Der Tippfehler `unsubcribe` in `ShaeEntElement.ts:84` und `:88` steht weiter — Ziel Paket 12. · Die Methoden von `ComponentContext` sind in `api-reference.md` durchgängig nicht dokumentiert (auch die bestehenden nicht) — Altlast, Ziel Paket 12.
- Folgen: `dispatchReRequestParentSiblings(component, data?)` hat einen zusätzlichen optionalen Parameter, rein additiv. Paket 9 findet den Auslöser als benannte Methode vor statt als Zeile im `connectedCallback`.

- Findings: VIEW-001 (critical), TEST-003 (high)
- Ziel: Ein spät registriertes Element zwischen zwei Entities zieht die Kinder unter sich, statt sie beim übernächsten Vorfahren hängen zu lassen.
- Bereich: `packages/shadow-objects/src/elements/ShaeEntElement.ts`, `src/view/ComponentContext.ts`, `packages/shadow-objects-testing/test/`, `packages/shadow-objects-e2e/pages/upgrade-timing.html` und `src/upgrade-timing.js`
- Hängt ab von: —
- Modell: stärkste Stufe
- Hinweis: Der Test aus TEST-003 kommt zuerst und muss rot gesehen werden. Zwei Varianten sind gefordert: ein Wrapper, der `HTMLElement` erweitert, und eine Subklasse von `ShaeEntElement`. Von den beiden ist nur die Subklasse rot — warum, steht im Detailplan.

<details>
<summary>Detailplan Paket 6</summary>

**Abgleich (2026-08-16, Zug 0 dieses Pakets).** Beide Findings bestehen unverändert, beide
Fundstellen stimmen zeichengenau.

| Finding | Zustand | Fundstelle heute |
|---|---|---|
| VIEW-001 | unverändert | `ShaeEntElement.ts:237` — `this.componentContext?.dispatchReRequestParentRoots();` · `ComponentContext.ts:319-323` — die Schleife über `#rootComponents` |
| TEST-003 | unverändert | `packages/shadow-objects-e2e/pages/upgrade-timing.html` (56 Zeilen, kein einziges spät definiertes Element) · `src/upgrade-timing.js:15-129` (16 Test-IDs, alle im homogenen Fall) |

**Reproduktion.** Sechs Sonden in echtem Chromium, gefahren im Testpaket
`shadow-objects-testing` gegen das gebaute `dist/`. Die erste ist der Beleg des Audits, Zeichen
für Zeichen:

| Sonde | Aufbau | gemessen |
|---|---|---|
| A | `<shae-ent id=gp><late-ent id=mid><shae-ent id=child>`, `late-ent` erbt von `ShaeEntElement` und wird nach dem Rendern definiert | `{"before":"gp","after":"gp","midParent":"gp"}` — **defekt**, erwartet `after == "mid"` |
| A2 | wie A, aber ein `<div>` zwischen `mid` und `child` | `{"before":"gp2","after":"gp2"}` — **defekt** |
| A3 | wie A, aber `mid` und `child` liegen im Shadow Root eines Hosts unterhalb von `gp` | `{"before":"gp3","after":"gp3"}` — **defekt** |
| B | `late-wrapper` erbt von `HTMLElement`, hängt beim Upgrade einen Shadow Root mit `<shae-ent id=inner><slot></slot></shae-ent>` an | `{"after":"inner","boundToInner":true,"innerParent":"gpB"}` — **korrekt** |
| C | Kontrolle: `late-plain` erbt von `HTMLElement` ohne Shadow Root und ohne Entity | `{"before":"gpC","after":"gpC"}` — korrekt, das Kind bleibt bei `gp` |
| D | vier Geschwister unter einem `<shae-ent>`, das letzte davon spät definiert | `{"before":["s1","s2","s3"],"after":["s1","s2","s3",<neu>]}` — die Kinderreihenfolge im `ComponentContext` bleibt |

Der Befund aus B ist für TEST-003 entscheidend: **Die vom Audit geforderte Wrapper-Variante ist
heute schon grün.** Ein Wrapper mit Shadow Root und `<slot>` erzeugt beim Anhängen ein
`slotchange`; das fängt `#onSlotChange` (`ShaeEntElement.ts:364-374`) und schickt ein
`ReRequestEntParent` nach oben, worauf das projizierte Kind neu fragt. Der Weg über die
Slot-Zuordnung ist also abgedeckt, der über eine spät registrierte Entity nicht. Der Test wird
trotzdem gebaut — als Wächter, nicht als roter Fall —, und der Detailplan sagt das ausdrücklich,
damit niemand später einen grünen Testfall für einen Beweis hält.

**Der gewählte Weg: das Re-Request-Signal erreicht die Geschwister, nicht der Baum die Kinder.**
Das ist die zweite der beiden Varianten des Findings, in ihrer schärfsten Form. Sie beruht auf
einer Invariante, die sich beweisen lässt und deshalb keine Traversierung braucht:

> Ein Entity `X`, das falsch gebunden ist, weil `N` beim Binden noch nicht zugehört hat, hängt
> zwangsläufig an genau dem Elternteil, an das sich `N` gerade selbst gebunden hat.

Begründung: `X` hängt am nächstgelegenen Vorfahren `P`, der zum Bindezeitpunkt zugehört hat. `N`
liegt zwischen `X` und `P`. Läge zwischen `N` und `P` noch ein zuhörendes Entity, läge es auch
zwischen `X` und `P`, und `X` hinge dort — Widerspruch. Also ist `P` auch für `N` der nächste
Vorfahre. Die Menge der Kandidaten ist damit exakt: die Kinder des neuen Elternteils von `N`.
Hat `N` keinen Elternteil, sind es die Wurzeln — und das ist genau der Aufruf, der heute schon
dasteht. Der Fix verallgemeinert Zeile 237, er ersetzt sie nicht.

Kosten: eine Schleife über die Geschwister, kein DOM-Knoten wird angefasst. Zum Vergleich die
Abwärts-Variante — jedes `connectedCallback` eines `<shae-ent>` liefe über seinen gesamten
Teilbaum, also über jedes `<div>` darin, und bei `n` verschachtelten Entities zahlt die Seite das
`n`-mal. Dazu drei Gründe, die den Ausschlag geben:

- **Geschlossene Shadow Roots.** Eine Abwärts-Traversierung muss in `element.shadowRoot`
  hineinsteigen; bei `mode: 'closed'` ist das `null`, die Entities darunter bleiben unerreichbar.
  Der hier gewählte Weg steigt nirgends hinein: Das benachrichtigte Element schickt sein eigenes
  `composed` Event nach oben, und das verlässt auch einen geschlossenen Shadow Root. Sonde A3
  belegt den Fall über eine Shadow-Grenze.
- **Tiefe.** Keine Rekursion, keine Tiefenabhängigkeit, keine Besuchsliste.
- **Paket 9.** Der Umbau dort tauscht die *Suche* nach dem Vorfahren aus. Dieses Paket tauscht
  aus, *wer aufgefordert wird, noch einmal zu suchen*. Die beiden Änderungen berühren sich an
  keiner Zeile, und Paket 9 findet den Auslöser als eine Methode mit einem Namen vor statt als
  eine Zeile mitten im `connectedCallback`.

**Wo die Grenze dieses Wegs liegt.** Ein `<shae-prop>` hat keine `ViewComponent` und steht in
keinem `ComponentContext` — es wird von diesem Mechanismus nicht erreicht und kann es nicht
werden. Die Nachjustierung der Property-Seite bleibt vollständig bei Paket 9; der Hinweis dort
ist ergänzt. Praktische Folge für dieses Paket: Die neue Markup-Insel auf der E2E-Seite trägt
bewusst **kein** `<shae-prop>`, weil eine Property unter einem noch nicht registrierten Element
ihren Host beim Upgrade auflöst und dann am falschen Entity landen würde. Das würde die Messung
verwischen, die diese Insel anstellt.

**Endlosschleifen.** Ausgeschlossen, und zwar durch die Struktur, nicht durch eine Bremse:

1. Aufgefordert wird ausschließlich aus `connectedCallback`. Kein anderer Pfad löst die
   Aufforderung aus.
2. Was ein aufgefordertes Element tut, ist abschließend aufzählbar:
   `#reRequestParent()` → `#dispatchRequestParent()` → `#onRequestParent` eines Vorfahren →
   `stopPropagation()` + `requester.#setParent(this)`. Keine dieser Stationen fordert weiter auf,
   und keine löst ein `connectedCallback` aus. Die Tiefe ist damit genau 1, die Breite ist die
   Zahl der Kinder eines Elternteils.
3. `#setParent` steigt bei unverändertem Elternteil sofort wieder aus (`:322`). Eine Antwort, die
   nichts ändert, kostet nichts.
4. Die einzige Stelle in `#setParent`, die Arbeit nachlegt, ist das `queueMicrotask` in `:347` —
   erreichbar nur, wenn Elternteil und Kind in verschiedenen `ComponentContext`s liegen. Dieser
   Pfad bleibt unangetastet; er ist die offene Frage von Paket 7.

**Warum das Re-Request nicht mehr vorher abräumt.** `#reReuestParentRoot` (`:301-306`) setzt den
Elternteil erst auf `undefined` und fragt dann neu. Für eine Wurzel ist das folgenlos. Für ein
Geschwister nicht: Abmelden und Wiederanmelden nimmt das Kind aus `children` seines Elternteils
und hängt es hinten wieder an — die Reihenfolge der Entities unter einem Elternteil würde sich
bei jedem Upgrade eines Nachbarn ändern. Deshalb bekommt das neue Signal einen eigenen Handler,
der den aktuellen Elternteil stehen lässt und nur neu fragt. Wer richtig hängt, bekommt dieselbe
Antwort, und `#setParent` tut nichts. Sonde D ist der Testfall dazu, und er ist bewusst so
gebaut, dass die destruktive Variante ihn rot macht.

**Das bestehende Netz.** Die 13 Beziehungen aus der Tabelle zu Paket 2 bleiben, wie sie sind —
nachgemessen, nicht abgeleitet: Der Prototyp dieses Fixes wurde gebaut und der komplette
Verify-Lauf dagegen gefahren. `pnpm test:ci` 536 grün, `pnpm -F shadow-objects-e2e test` 362 grün,
darin die 19 Struktur-Assertions der `shae-worker`-Seite. Keine der Beziehungen ändert sich, und
das ist auch die Erwartung: Auf dieser Seite ist zum Zeitpunkt jedes `connectedCallback` kein
Vorfahre unregistriert, also gibt es nichts zu korrigieren. Ändert sich beim Umsetzen doch eine
der 13, ist das kein Kollateralschaden, sondern ein Fund — er gehört in den Verlauf, bevor
irgendetwas angepasst wird.

**Reihenfolge.** Dieses Paket ist ein Bugfix. Schritt 1 bis 3 schreiben die Tests, Schritt 4 sieht
sie rot, erst Schritt 5 fasst Produktivcode an. Eine Ausnahme, die im Plan benannt ist statt
stillschweigend: Der Testfall zum neuen Signalnamen in `ent-element-events.test.js` kann nicht
zuerst rot sein, weil er eine Konstante braucht, die es vorher nicht gibt. Er entsteht in
Schritt 7, zusammen mit der Zeile, die er absichert.

- Dateien: `packages/shadow-objects/src/view/ComponentContext.ts`, `packages/shadow-objects/src/elements/ShaeEntElement.ts`, `packages/shadow-objects-testing/test/ent-element-upgrade.test.js` (neu), `packages/shadow-objects-testing/test/ent-element-events.test.js`, `packages/shadow-objects-e2e/pages/upgrade-timing.html`, `packages/shadow-objects-e2e/src/upgrade-timing.js`, `packages/shadow-objects-e2e/tests/upgrade-timing.spec.ts`, `packages/shadow-objects-e2e/TEST-PLAN.md`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`, `CHANGELOG.md` (Repo-Wurzel)
- Vorgehen:
  1. `packages/shadow-objects-testing/test/ent-element-upgrade.test.js` anlegen, im Stil von
     `ent-element-attributes.test.js`: `expect` aus `@esm-bundle/chai`, `ComponentContext` und
     `ShaeEntElement` aus `@spearwolf/shadow-objects`, der Seiteneffekt-Import
     `@spearwolf/shadow-objects/shae-ent.js`, dazu `mount`/`unmountAll` aus `../src/mount.js` und
     `unmountAll()` in `afterEach`. Zwei Helfer an den Kopf: `nextTask()` als
     `new Promise((resolve) => setTimeout(resolve, 0))` und ein Kommentar dazu, dass die
     Aufwertung selbst synchron in `customElements.define` passiert und die Wartezeit nur für die
     Slot-Zuordnung nötig ist, die über `slotchange` gemeldet wird. Ein zweiter Kommentar an den
     Dateikopf: Ein Custom-Element-Name lässt sich pro Dokument nur einmal definieren, deshalb
     trägt jeder Fall seinen eigenen Namen (`late-ent-a`, `late-ent-b`, …) statt eines geteilten.
     Assertions laufen über `entParentNode?.id`, nicht über die Element-Identität — die Meldung
     im roten Zustand nennt dann die beiden IDs statt zweier serialisierter Elemente. Sechs Fälle:
     - `a late registered entity element adopts the entity below it`: Markup
       `<shae-ent id="gp-a" token="gp"><late-ent-a id="mid-a" token="mid"><shae-ent id="child-a" token="child"></shae-ent></late-ent-a></shae-ent>`,
       `await customElements.whenDefined('shae-ent')`. Erst der Ausgangszustand:
       `expect(child.entParentNode?.id, 'before the definition the child binds to the outer entity').to.equal('gp-a')`.
       Dann `customElements.define('late-ent-a', class extends ShaeEntElement {})` und `await nextTask()`.
       Danach drei Erwartungen: `expect(child.entParentNode?.id).to.equal('mid-a')`,
       `expect(child.viewComponent.parent).to.equal(mid.viewComponent)` und — als Wächter gegen
       einen Fix, der einfach alles verschiebt — `expect(mid.viewComponent.parent, 'the new element keeps its own parent').to.equal(gp.viewComponent)`.
     - `a late registered entity element adopts an entity inside a shadow root`: `<shae-ent id="gp-b" token="gp"><div id="host-b"></div></shae-ent>`,
       danach `host.attachShadow({mode: 'open'}).innerHTML = '<late-ent-b id="mid-b" token="mid"><shae-ent id="child-b" token="child"></shae-ent></late-ent-b>'`,
       `await nextTask()`, Ausgangszustand `'gp-b'`, nach der Definition `'mid-b'`. Kommentar: Das
       Signal steigt nicht in den Shadow Root hinein, das Kind fragt von innen heraus.
     - `a late registered entity element does not reorder the children of its parent`: ein
       `<shae-ent id="gp-c">` mit drei `<shae-ent id="s1|s2|s3">` und einem abschließenden
       `<late-ent-c id="mid-c" token="mid">`. Vor und nach der Definition
       `ComponentContext.get().getChildren(gp.viewComponent).map((vc) => vc.uuid)` erheben; die
       ersten drei UUIDs müssen in beiden Erhebungen dieselben in derselben Reihenfolge sein, und
       die vierte muss die UUID von `mid-c` sein. Kommentar: Ein Re-Request, der den aktuellen
       Elternteil erst abräumt, hängt jedes Geschwister hinten wieder an — dieser Fall ist der
       Grund, warum das neue Signal das nicht tut.
     - `a wrapper without an entity leaves the hierarchy untouched`: `late-plain-d` erbt von
       `HTMLElement` und tut nichts; das Kind hängt vorher und nachher an `gp-d`.
     - `a wrapper with a shadow root adopts the entity projected into its slot`: `late-wrap-e`
       erbt von `HTMLElement` und hängt in `connectedCallback` — gegen `this.shadowRoot` geguardet —
       einen offenen Shadow Root mit `<shae-ent id="inner-e" token="inner"><slot></slot></shae-ent>`
       an. Vorher `gp-e`, nachher `inner-e`, und `inner-e` selbst hängt an `gp-e`. Kommentar: Der
       Fall ist ein Wächter, kein roter Fall — die Slot-Zuordnung meldet sich über `slotchange`
       und wird auf diesem Weg schon heute nachjustiert.
     - `a late registered entity element in another namespace leaves the entities alone`:
       `<late-ent-f id="mid-f" ns="other" token="mid">` zwischen `gp-f` (global) und `child-f`
       (global). Vorher und nachher `gp-f`; zusätzlich `expect(mid.viewComponent.parent).to.be.undefined`.
       Kommentar: Die Aufforderung läuft über den `ComponentContext` des neuen Elements, also über
       seinen Namespace, und erreicht einen fremden nicht.
  2. `packages/shadow-objects-e2e/pages/upgrade-timing.html` erweitern. In `<main>`, hinter
     `<div id="pre-injected">`, zwei neue Inseln, beide ohne `<shae-prop>`:

     ```html
     <shae-ent id="late-gp" token="tracked">
       <late-ent id="late-mid" token="tracked">
         <shae-ent id="late-child" token="tracked"></shae-ent>
       </late-ent>
     </shae-ent>

     <shae-ent id="wrap-gp" token="tracked">
       <late-wrapper id="late-wrap">
         <shae-ent id="wrap-child" token="tracked"></shae-ent>
       </late-wrapper>
     </shae-ent>
     ```

     Darüber ein HTML-Kommentar mit zwei Sätzen: `late-ent` und `late-wrapper` werden erst am Ende
     des Moduls definiert, nach dem ersten Sync; und die Insel trägt bewusst keine Property, weil
     eine Property ihren Host beim Upgrade auflöst und die Messung damit vermischen würde. Der
     bestehende Inline-Skriptblock und `__preUpgradeState` bleiben unangetastet.
  3. `packages/shadow-objects-e2e/src/upgrade-timing.js` erweitern. `ShaeEntElement` aus
     `@spearwolf/shadow-objects` importieren (dasselbe Muster wie `src/auto-destruct.js:2`). Am
     Ende von `main()`, hinter `upgrade-post-definition-element-matches-pre-existing`, den Abschnitt
     `// --- UPG-7: an element that becomes an entity after the first sync ---` anlegen. Ein zweiter
     Nachschlaghelfer neben `find(label)`, weil die neuen Entities keine Property tragen:
     `const entityOf = (el) => snap.entities.find((e) => e.uuid === el.uuid);`. Dazu
     `const wrapInner = () => byId('late-wrap').shadowRoot.getElementById('wrap-inner');`. Neun
     Test-IDs in genau dieser Reihenfolge:
     - `upgrade-late-elements-are-not-defined-yet` (`testBooleanAction`): `customElements.get('late-ent') == null`,
       `customElements.get('late-wrapper') == null` und `byId('late-mid').isShaeEntElement !== true`.
     - `upgrade-late-child-starts-at-the-outer-entity` (`testBooleanAction`):
       `byId('late-child').entParentNode === byId('late-gp')` und `byId('wrap-child').entParentNode === byId('wrap-gp')`.
       Kommentar: Das ist der Ausgangszustand, kein Mangel — der nähere Vorfahre existiert als
       Entity noch nicht.
     - `upgrade-late-definitions-arrive` (`testAsyncAction`): definiert
       `class LateEnt extends ShaeEntElement {}` als `late-ent` und `class LateWrapper extends HTMLElement`
       als `late-wrapper`, wobei der Wrapper in `connectedCallback` gegen `this.shadowRoot`
       geguardet einen offenen Shadow Root mit
       `<shae-ent id="wrap-inner" token="tracked"><slot></slot></shae-ent>` anhängt. Danach
       `await Promise.all([customElements.whenDefined('late-ent'), customElements.whenDefined('late-wrapper')])`
       und ein `await new Promise((resolve) => setTimeout(resolve, 0))` mit dem Kommentar, dass die
       Aufwertung synchron ist und die Wartezeit der Slot-Zuordnung gilt.
     - `upgrade-late-subclass-is-upgraded`: `byId('late-mid').isShaeEntElement === true` und
       `byId('late-mid').viewComponent != null`.
     - `upgrade-late-subclass-adopts-the-child`: `byId('late-child').entParentNode === byId('late-mid')`
       und `byId('late-child').viewComponent.parent === byId('late-mid').viewComponent`.
     - `upgrade-late-subclass-keeps-its-own-parent`: `byId('late-mid').viewComponent.parent === byId('late-gp').viewComponent`.
     - `upgrade-late-wrapper-adopts-the-slotted-child`: `byId('wrap-child').entParentNode === wrapInner()`
       und die gleiche Aussage über `viewComponent.parent`.
     - `upgrade-late-definition-sync` (`testAsyncAction`): `snap = await snapshot();` — dieselbe
       Helferfunktion, die die Seite schon benutzt, dritte Runde.
     - `upgrade-late-hierarchy-reached-the-worker`: `entityOf(byId('late-child')).parentUuid === byId('late-mid').uuid`,
       `entityOf(byId('late-mid')).parentUuid === byId('late-gp').uuid` und
       `entityOf(byId('wrap-child')).parentUuid === wrapInner().uuid`.

     Die neun IDs in derselben Reihenfolge an das Array in
     `packages/shadow-objects-e2e/tests/upgrade-timing.spec.ts` anhängen, mit einer
     Abschnittsmarke `// UPG-7: an element that becomes an entity after the first sync` davor.
     Kein Eintrag in `knownFailures` — ein roter Fall ist hier ein Fund und kein bekannter Defekt.
  4. `pnpm -F shadow-objects-testing test` und `pnpm -F shadow-objects-e2e test` laufen lassen und
     die roten Fälle gegen diese Tabelle halten, bevor eine Zeile Produktivcode entsteht:

     | Testfall | Meldung im roten Zustand |
     |---|---|
     | `a late registered entity element adopts the entity below it` | `expected 'gp-a' to equal 'mid-a'` |
     | `a late registered entity element adopts an entity inside a shadow root` | `expected 'gp-b' to equal 'mid-b'` |
     | `upgrade-late-subclass-adopts-the-child` | `is falsy` — im Playwright-Bericht als `expected "ok", received "fail"` |
     | `upgrade-late-hierarchy-reached-the-worker` | dito |

     Grün bleiben müssen dabei alle vier übrigen Fälle der neuen Spec-Datei, alle bestehenden 16
     IDs der `upgrade-timing`-Seite und die 19 Struktur-IDs der `shae-worker`-Seite. Wird einer
     davon rot, ist der Testaufbau schuld und nicht der Ist-Zustand. Weicht eine der vier Meldungen
     oben ab, stimmt die Annahme über den Ist-Zustand nicht — das gehört in den Verlauf, bevor
     repariert wird.
  5. `packages/shadow-objects/src/view/ComponentContext.ts`: neben
     `static readonly ReRequestParentRoots` eine zweite Konstante
     `static readonly ReRequestParent = 're-request-parent';` setzen, und hinter
     `dispatchReRequestParentRoots()` (`:319-323`) die neue Methode:

     ```ts
     dispatchReRequestParentSiblings(component: ViewComponent) {
       const parent = component.parent;
       if (parent == null) {
         this.dispatchReRequestParentRoots();
         return;
       }
       for (const child of this.getChildren(parent)) {
         if (child !== component) {
           this.dispatchMessage(child.uuid, ComponentContext.ReRequestParent);
         }
       }
     }
     ```

     Darüber ein Kommentar, der die Invariante trägt: Ein Component, das an einem zu weit
     entfernten Vorfahren hängt, kann nur eines sein, dessen Element unterhalb von `component`
     liegt und dessen Elternteil derselbe ist wie der von `component` — jedes Entity dazwischen
     hätte die Anfrage vorher beantwortet. Deshalb sind die Kinder des Elternteils die vollständige
     Kandidatenmenge, und die Wurzeln sind es, solange `component` selbst noch keinen Elternteil
     hat. Der Unterschied der beiden Signale gehört ebenfalls in den Kommentar: `ReRequestParentRoots`
     heißt »räum deinen Elternteil ab und frag neu«, `ReRequestParent` heißt »frag neu und behalte,
     was du hast, bis eine andere Antwort kommt«.
  6. `packages/shadow-objects/src/elements/ShaeEntElement.ts`, drei Stellen:
     - Im Effect ab `:81` neben `unsubcribe` ein zweites Abonnement auf das neue Signal:
       `const unsubscribeReRequestParent = on(vc, ComponentContext.ReRequestParent, () => this.#reRequestParent());`,
       abgemeldet im selben Aufräumer wie das erste. Der Aufräumer ist die einzige Stelle, an der
       die Abmeldung stehen darf — ein zweites Abonnement ohne Gegenstück leckt bei jedem
       Kontextwechsel.
     - `#reReuestParentRoot()` (`:301-306`) in `#reRequestParentAsRoot()` umbenennen — der Tippfehler
       im Namen ist heute harmlos, neben einer zweiten, fast gleich heißenden Methode wird er zur
       Falle. Die neue Methode direkt daneben:

       ```ts
       #reRequestParent() {
         if (this.isConnected) {
           this.#dispatchRequestParent();
         }
       }
       ```

       mit dem Kommentar, warum hier nichts abgeräumt wird: Wer bereits am nächstgelegenen
       Vorfahren hängt, bekommt dieselbe Antwort, und `#setParent` steigt dann aus. Ein
       vorheriges Abräumen würde jedes richtig gebundene Geschwister aus `children` seines
       Elternteils nehmen und hinten wieder anhängen.
     - In `connectedCallback` die Zeile `:237` durch den Aufruf einer neuen privaten Methode
       ersetzen, und diese Methode neben `#dispatchRequestParent` anlegen:

       ```ts
       #dispatchReRequestParentBelow() {
         const vc = this.viewComponent;
         if (vc == null) {
           this.componentContext?.dispatchReRequestParentRoots();
         } else {
           this.componentContext?.dispatchReRequestParentSiblings(vc);
         }
       }
       ```

       Kommentar darüber: Ein Element, das zu einer Entity wird, während der Baum um es herum
       schon steht, kann der neue nächstgelegene Vorfahre für Entities unter ihm sein; die wurden
       gebunden, als es noch nicht zuhörte, und werden deshalb aufgefordert, noch einmal zu fragen.
       Die Reihenfolge im `connectedCallback` bleibt, wie sie ist: erst `#dispatchRequestParent()`
       (`:234`), dann die Aufforderung — vorher steht der eigene Elternteil nicht fest, und die
       Kandidatenmenge wäre die falsche.
  7. Im Effect ab `:98` die Filterzeile `:115` um das neue Signal erweitern:
     `if (type === ComponentContext.ReRequestParentRoots || type === ComponentContext.ReRequestParent) return;`
     Kommentar in einem Satz: Die internen Signale der Elternauflösung verlassen die View-Seite
     nie als DOM-Event, auch nicht bei `forward-custom-events` ohne Filterliste. Dazu in
     `packages/shadow-objects-testing/test/ent-element-events.test.js` den Zwilling des
     vorhandenen Falls anlegen, unmittelbar hinter
     `never forwards ComponentContext.ReRequestParentRoots to the DOM, even with a bare filter`
     (`:196-209`) und Zeile für Zeile in derselben Bauform:
     `never forwards ComponentContext.ReRequestParent to the DOM, even with a bare filter`.
  8. Beide Testläufe wiederholen: `pnpm -F shadow-objects-testing test` — 248 Fälle in 17 Dateien —
     und `pnpm -F shadow-objects-e2e test` — 380. Danach einmal
     `pnpm -F shadow-objects-testing test -- --sequence.shuffle`, weil die neue Spec-Datei
     Custom-Element-Namen global belegt und die Reihenfolge der Fälle deshalb keine Rolle spielen
     darf.
  9. `packages/shadow-objects/docs/api-reference.md`, Abschnitt `### <shae-ent>`, Unterabschnitt
     `#### Entity Hierarchy` (`:1181-1190`): hinter das Codebeispiel einen Absatz, der die Garantie
     benennt. Inhalt in drei Sätzen: Die Hierarchie ergibt sich aus dem nächstgelegenen
     `<shae-ent>` im Vorfahrenpfad, über Shadow-Grenzen und Slot-Projektionen hinweg; wird ein
     Element, das selbst eine Entity ist, erst später über `customElements.define` registriert,
     wandern die Entities unter ihm zu ihm, ohne dass die Anwendung etwas anstoßen muss; für
     Properties gilt diese Nachjustierung nicht. Der dritte Satz ist heute die Wahrheit und wird
     von Paket 9 wieder angefasst — er steht hier trotzdem, weil eine Doku, die die Einschränkung
     verschweigt, schlechter ist als eine, die sie nennt.
  10. `packages/shadow-objects/CHANGELOG.md`, Abschnitt `## [Unreleased]`: ein Stichpunkt unter
      `**Fixed (elements):**` — ein `<shae-ent>`, das erst nach seinen Nachkommen registriert wird,
      zieht die Entities unterhalb von sich unter sich; sie blieben sonst dauerhaft am
      übernächsten Vorfahren. Betrifft jede Anwendung, die von `ShaeEntElement` erbt oder Entities
      in ein spät registriertes Element legt. Der Vorspann des Abschnitts zählt die Änderungen mit
      Konsumentenwirkung auf: Dieser Punkt gehört dazu, die Zahl im Satz »Five of them reach
      existing consumers« wandert auf »Six«. `README.md` und `docs/guides.md` prüfen — trifft
      keine der beiden eine Aussage über die Reihenfolge von Registrierung und Markup, bleiben sie
      unangetastet und die Prüfung wird in der Verlaufszeile festgehalten.
  11. `CHANGELOG.md` im Repo-Wurzelverzeichnis: ein Stichpunkt im Abschnitt zum 2026-08-16 über die
      neue Abdeckung — eine Spec für spät registrierte Elemente im Integrationspaket und ein
      Abschnitt auf der `upgrade-timing`-Seite. In `packages/shadow-objects-e2e/TEST-PLAN.md` genau
      eine Stelle anfassen: die Zeile `UPG-7` in der Tabelle unter §3.3 als umgesetzt markieren und
      auf die neuen `upgrade-late-*`-IDs verweisen. §1 und §2.2 sind darüber hinaus veraltet;
      dieses Paket rührt sie nicht an, der Befund steht unter »Vorbestehende Fehler« und gehört
      Paket 12. Danach `Backlog.md` durchsehen: Punkt 4 der Liste (`:41`) und `VIEW-6` (`:204`)
      beschreiben das Beobachten von In-Place-Reparenting und bleiben stehen — das ist Paket 7 und
      wird von dieser Änderung nicht wahr oder falsch. Kein Eintrag streichen, die Prüfung in der
      Verlaufszeile festhalten.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`.
  Erwartung: `test:ci` 543 statt 536, davon `shadow-objects-testing` 248 statt 241 in 17 statt 16
  Dateien; e2e 380 statt 362 (9 neue IDs × 2 Browser). Weicht die e2e-Zahl nach unten ab, fehlt
  eine ID im Spec-Array. Kein »Errors«-Block, und die Seite `upgrade-timing` muss ihren Test
  `no uncaught or logged errors` behalten — der neue Wrapper darf nichts in die Konsole schreiben.
- Commit: `fix(elements): let a late registered entity adopt the entities below it (VIEW-001, TEST-003)`
- Verlauf:
  - Zug 0 (2026-08-16, Planer): Beide Findings gegen die Quelle geprüft — unverändert, `ShaeEntElement.ts:237` und `ComponentContext.ts:319-323` stimmen zeichengenau. Sechs Sonden in echtem Chromium gefahren; der Beleg des Audits ist reproduziert (`{"before":"gp","after":"gp","midParent":"gp"}`), dazu zwei weitere defekte Varianten (ein `<div>` dazwischen, eine Shadow-Grenze dazwischen) und drei korrekte. Fund: Die vom Audit für TEST-003 geforderte Wrapper-Variante ist heute grün, weil `slotchange` sie abfängt — sie wird als Wächter gebaut, nicht als roter Fall. Weg entschieden und gegen einen gebauten Prototyp gemessen: das Re-Request-Signal geht an die Kinder des eigenen neuen Elternteils, in einer Variante, die den aktuellen Elternteil nicht vorher abräumt. Mit diesem Prototyp Verify komplett grün — `test:ci` 536, e2e 362, `typecheck` ✓ —, die 13 Beziehungen aus Paket 2 unverändert. Prototyp anschließend zurückgenommen, `dist/` neu gebaut, Arbeitsbaum sauber.

**Finding VIEW-001 (critical) — Volltext**

*Titel:* Entity-Baum nach spätem Custom-Element-Upgrade korrigieren

*Fundstelle:* `packages/shadow-objects/src/elements/ShaeEntElement.ts:237`, `view/ComponentContext.ts:319-323`

*Beschreibung:* Ein `<shae-ent>` findet seinen Vorfahren, indem es ein bubbelndes, composed CustomEvent nach oben schickt; der erste Vorfahre, der zuhört, stoppt die Propagation und bindet das Kind an sich. Zugehört wird aber erst ab `connectedCallback` — ein Element, das zu diesem Zeitpunkt noch nicht upgraded ist, hört nicht zu, und das Event läuft an ihm vorbei zum übernächsten Vorfahren. Wird das Element später definiert, meldet es sich per `dispatchReRequestParentRoots()`. Diese Methode iteriert ausschließlich über `#rootComponents`, also über Komponenten ohne Eltern. Das falsch gebundene Kind hat aber bereits einen Parent und ist kein Root — es erfährt nie davon und bleibt dauerhaft am falschen Knoten hängen. Betroffen ist jede Anwendung, die `ShaeEntElement` ableitet (die Klasse ist öffentlich exportiert) oder `shae-ent`s in ein Wrapper-Element legt, das lazy registriert wird. Der Fehler ist still: keine Warnung, keine Exception, nur ein Entity-Baum mit falscher Hierarchie und damit falsch aufgelöstem Entity-Context.

*Empfehlung:* Die Korrektur muss abwärts laufen, nicht nur an Wurzeln. Wenn ein `ShaeEntElement` verbindet, sollte es alle `shae-ent`-Nachkommen in seinem Subtree — inklusive der Shadow Roots darunter — auffordern, ihren Parent neu zu bestimmen; das Bubbling stoppt dann korrekt beim nächstgelegenen Vorfahren, also beim neuen Knoten. Alternativ `dispatchReRequestParentRoots` so erweitern, dass es alle Komponenten erreicht, deren aktueller Parent im DOM weiter entfernt ist als der neu verbundene Knoten. Beide Varianten brauchen den Test aus TEST-003 als Nachweis.

*Beleg des Audits:* Sonde in echtem Chromium, Markup `<shae-ent id=gp><late-ent id=mid><shae-ent id=child>`, `late-ent` erst nach dem Rendern definiert: `PROBE-A {"before":"gp","after":"gp","midParent":"gp"}` — erwartet nach dem Upgrade: `after == "mid"`.

*Anmerkung des Planers:* Gewählt ist die zweite Variante, in der schärferen Form »die Kinder des eigenen neuen Elternteils« statt »alle Komponenten«. Begründung im Detailplan oben; die erste Variante scheitert an geschlossenen Shadow Roots und kostet pro `connectedCallback` einen vollständigen Teilbaum-Durchlauf.

**Finding TEST-003 (high) — Volltext**

*Titel:* Upgrade-Suite um heterogene Definitionsreihenfolgen erweitern

*Fundstelle:* `packages/shadow-objects-e2e/pages/upgrade-timing.html`, `src/upgrade-timing.js`

*Beschreibung:* Die Suite prüft sorgfältig, dass Markup, das vor jeder Definition im Dokument steht, korrekt in place upgraded wird — inklusive Hierarchie, Properties und Ankunft im Worker. Sie prüft damit aber nur den homogenen Fall: alle drei Shae-Elemente sind zu Beginn undefiniert und werden gemeinsam durch denselben Modulimport definiert. In dieser Konstellation upgraden sie in Dokumentreihenfolge, Eltern vor Kindern, und alles fügt sich. Der reale Risikofall fehlt vollständig: ein Element zwischen zwei Entities, das erst später registriert wird — sei es eine Subklasse von `ShaeEntElement`, sei es ein Wrapper mit Shadow DOM aus einem lazy geladenen Modul. Genau dort liegt VIEW-001, und genau deshalb ist der Defekt bis heute unentdeckt geblieben, obwohl es eine eigens für Upgrade-Timing gebaute Testseite gibt.

*Empfehlung:* Eine zweite Seite oder einen zweiten Abschnitt ergänzen, der ein Custom Element erst nach dem ersten Sync per `customElements.define` registriert und danach die Hierarchie erneut prüft. Zwei Varianten decken das Feld ab: ein Wrapper, der `HTMLElement` erweitert, und eine Subklasse von `ShaeEntElement`. Erwartung in beiden Fällen: Nach dem Upgrade hängt das Kind am nächstgelegenen Entity, nicht am übernächsten.

*Anmerkung des Planers:* Von den zwei Varianten ist nur die Subklasse rot. Ein Wrapper mit Shadow Root und `<slot>` löst beim Anhängen ein `slotchange` aus, das `#onSlotChange` in ein `ReRequestEntParent` übersetzt — das projizierte Kind fragt daraufhin neu und findet die Entity im Shadow Root. Nachgemessen. Die Wrapper-Variante wird trotzdem gebaut, als Wächter für einen Pfad, den außer der `shae-worker`-Seite nichts absichert und den Paket 9 anfassen wird.

</details>

### [x] 7. Bindungslebenszyklus von shae-ent

- Hash: `1d6e3e0`
- Ergebnis: 2 Runden · VIEW-006, VIEW-007, TEST-005 und Fund A behoben · Verify grün: lint rc=0, typecheck ✓, test:ci 560 (`shadow-objects-testing` 265 in 18 Dateien), e2e 390, kein »Errors«-Block, geshuffelt grün
- Nachweis: Elf Fälle vor dem Fix rot gesehen, jeder mit Meldung. Der Reviewer hat den roten Lauf unabhängig reproduziert — eigener Worktree auf `6f8a5d2`, eigener Build, die neuen Specs hineinkopiert — und fünf Mutationen gegen echte Builds gefahren, darunter eine eigene dritte. Zwei Wächter bleiben vor wie nach dem Fix grün (Microtask-Frage).
- Die offene Frage des Audits »Kann `#setParent` in einer Microtask-Schleife hängenbleiben?« ist **strukturell ausgeschlossen**, nicht bloß nicht reproduziert: Der Microtask ruft ausschließlich `#dispatchRequestParent()`; bei unveränderter DOM-Struktur antwortet zweimal derselbe Vorfahre, und `#setParent` steigt in Zeile 1 aus. Ein neuer Microtask entsteht nur durch einen Lauf des Effects, der genau zwei Signale liest — die ändert ein Microtask nicht. Beide Bedingungen (Elternteil ohne `viewComponent`, gleicher `ns` in zwei `ComponentContext`-Objekten) wurden konstruiert und gefahren: je vier Anfragen, danach Stillstand. Zwei Wächter zählen die Ereignisse über einen Capture-Listener und prüfen auf Stillstand.
- Zusätzlich behoben, gleiche Ursache, im Audit nicht enthalten: `disconnectedCallback` befördert seine Kinder zu Wurzeln, ohne ihnen zu sagen, dass sie neu fragen sollen — ein in einen Slot projiziertes Entity blieb an einem losgelösten Element hängen, während sein `viewComponent.parent` bereits `null` war. Vom Reviewer gemessen, im selben Paket geschlossen.
- Die Regel, die dieses Paket herstellt: **jeder Weg, antwortender Vorfahre zu werden oder aufzuhören es zu sein, nimmt die Aufforderung an die Kandidaten mit.** Der Reviewer hat die Aufzählung nach dem Fix abgeschlossen: jeder attribut- und DOM-getriebene Weg trägt sie. Übrig bleiben nur Eingriffe von außen (`componentContext$.set`, `viewComponent$.set`, `ComponentContext.dispose/clear`) und die bekannte `subtree: false`-Lücke des Observers (Backlog `VIEW-6`), die nur über denselben Unterklassen-Hook wie VIEW-007 erreichbar ist und in `api-reference.md` jetzt ausdrücklich zugesagt wird.
- Nebenbefunde: Nach einem `ns`-Wechsel **ohne Kinder** bekommt das alte Environment keinen Sync, weil `this.ns` beim Aufruf von `syncShadowObjects()` schon den neuen Wert trägt. Vorbestehend; mit `auto-sync="frame"` harmlos, mit `auto-sync="no"` bleibt die Zerstörung im alten Worker liegen, bis dort etwas anderes einen Sync auslöst. · `ComponentContext.test.js` teilt einen einzigen Context über alle Fälle; jeder Fall, der ohne `buildChangeTrails()` endet, vergiftet den nächsten. · `Element.moveBefore` ist für ein `<shae-ent>` ohne `connectedMoveCallback` ein Abriss statt eines Umzugs — als `VIEW-6b` im Backlog.
- Folgen: `dispatchReRequestParentChildren()` ist neu und öffentlich, mit zwei Aufrufstellen. Der `#wasUpgradedInPlace`-Wächter sitzt jetzt an der Aufrufstelle im `connectedCallback`, nicht in der Methode — jeder künftige Aufrufer entscheidet selbst, ob er für ihn gilt. Der Zähler im `[Unreleased]`-Kopf der Paket-CHANGELOG steht auf »Ten of them reach existing consumers«.

- Nachgetragen 2026-08-16 (Reviewer Paket 6, in Chromium gemessen): Der `ns`-Pfad ist die zweite Lücke derselben Ursache wie VIEW-001. Nimmt man einem zwischengeschalteten `<shae-ent ns="other">` das `ns`-Attribut, wird es zum antwortenden Vorfahren, ohne irgendjemanden zu benachrichtigen — `ns$.onChange` (`ShaeEntElement.ts:47-52`) fragt nur den eigenen Elternteil neu an. Gemessen `{"z":"p6","n":"m6"}`, erwartet `z:"n6"`. Daraus folgt die Regel, die dieses Paket herstellen muss: **jeder Weg, antwortender Vorfahre zu werden, muss die Aufforderung an die Kandidaten mitnehmen.** Solange das nicht überall gilt, ist die Invariante aus Paket 6 keine Eigenschaft des Baums, sondern eine Induktion über den Mechanismus.
- Nachgetragen 2026-08-16 (Reviewer Paket 6): Die Zirkularitäts-Begründung aus dem Detailplan zu Paket 6 stimmt an einer Station nicht. Das `queueMicrotask` in `ShaeEntElement.ts:374-376` ist nicht nur bei verschiedenen `ComponentContext`s erreichbar, sondern auch, wenn `parent.viewComponent$` noch leer ist (`:371-372`). Für die Terminierung folgenlos — der Microtask dispatcht neu, der Vorfahre antwortet dasselbe, `#setParent` steigt aus —, aber die offene Frage des Audits zur Microtask-Schleife gehört genau hierhin und ist mit dieser zweiten Bedingung neu zu prüfen.

- Findings: VIEW-006 (medium), VIEW-007 (medium), TEST-005 (medium)
- Ziel: Ein Elternwechsel wird weiter beobachtet, und `entParentNode` sagt nach einem Namespace-Wechsel die Wahrheit.
- Bereich: `packages/shadow-objects/src/elements/ShaeEntElement.ts`, `src/view/ComponentContext.ts`, `packages/shadow-objects-testing/test/`, `packages/shadow-objects-e2e/pages/multi-env.html` und `src/multi-env.js`
- Hängt ab von: Paket 6
- Modell: stärkste Stufe
- Nachgetragen 2026-08-16 (Planer Paket 6): Paket 6 legt die Aufforderung an die Entities unterhalb eines neu verbundenen Knotens in die private Methode `#dispatchReRequestParentBelow()`. Der `ns$.onChange`-Pfad (`ShaeEntElement.ts:47-52`) fragt heute nur den eigenen Elternteil neu an — nach einem Namespace-Wechsel kann das Element aber auch für Entities unter ihm der neue nächstgelegene Vorfahre sein. Das ist eine zweite Aufrufstelle derselben Methode und gehört hierher, weil derselbe Pfad die Microtask-Frage trägt. Paket 6 fasst ihn bewusst nicht an.
- Hinweis: Nimmt die offene Frage »Kann `#setParent` in einer Microtask-Schleife hängenbleiben?« mit — sie sitzt in derselben Methode und hat dieselbe Wurzel, nämlich zwei Filter, die verschiedene Kriterien prüfen (`ns` gegen `ComponentContext`). Entweder reproduzieren und beheben oder mit Begründung und Test als unmöglich abhaken.
- Richtigstellung (2026-08-16, Planer Paket 7): Die Methode aus Paket 6 heißt `#askPeersToReRequestParent()` (`ShaeEntElement.ts:392-407`), nicht `#dispatchReRequestParentBelow()`. Die Zeilennummern der beiden Nachträge stammen aus dem Audit bzw. aus einem Zwischenstand; heute liegt `ns$.onChange` auf `:94-99`, das `queueMicrotask` auf `:448-450` und die Bedingung `parentVC && parentVC.context === vc.context` auf `:446`.
- Triage der offenen Nebenbefunde und Folgen aus den Paketen 1 bis 6 (2026-08-16, Planer Paket 7): Nichts Neues zu verteilen, alles ist bereits zugewiesen oder erledigt.
  - `isBelow`-Aufstieg bleibt n²/2 (Paket 6, `ShaeEntElement.ts:18-23`) — echte Folge, Ziel Backlog, wie zugewiesen. Dieses Paket erhöht die Konstante nicht: der `ns`-Pfad benutzt denselben Aufstieg mit demselben Kandidatensatz, aber nur einmal pro Attributschreibung.
  - `dispatchReRequestParentRoots` kennt keinen Absender (`ComponentContext.ts:320-326`) — vorbestehend, Ziel Backlog. Der neue Kinder-Kanal dieses Pakets braucht keinen Absender: seine Empfänger müssen ausnahmslos loslassen, es gibt nichts zu filtern.
  - Tippfehler `unsubcribe` (`ShaeEntElement.ts:131`, `:137`) — Symptom, Ziel Paket 12, wie zugewiesen. Dieses Paket fasst den Effect nicht an.
  - `ComponentContext`-Methoden fehlen in `docs/api-reference.md` — vorbestehend, Ziel Paket 12. Die hier neu entstehende Methode kommt dort mit dazu und wird deshalb in Schritt 10 in der `CHANGELOG.md` benannt, nicht in der Referenz.
  - Folge aus Paket 6, `dispatchReRequestParentSiblings(component, data?)` mit optionalem Parameter — echte Folge, hier eingelöst: dieses Paket ist der zweite Aufrufer und ändert an der Signatur nichts. Paket 9 findet den Auslöser weiterhin als benannte Methode vor.
- Nebenbefund (2026-08-16, Planer Paket 7, in Chromium gemessen): `Element.moveBefore` ist für ein `<shae-ent>` kein atomarer Umzug. Die Klasse definiert kein `connectedMoveCallback`, also fällt der Browser auf `disconnectedCallback` + `connectedCallback` zurück — die Entity wird zerstört und unter derselben uuid neu erzeugt, der Change Trail sieht einen Abriss. Vorbestehend, kein Finding dieses Audits, eine Verhaltenszusage, die niemand gegeben hat. Geht in den Backlog.
- Zwei Funde außerhalb des Audits (2026-08-16, Planer Paket 7, beide vom Nutzer entschieden — siehe »Entscheidungen«): siehe »Zwei Funde außerhalb des Audits« im Detailplan. Fund A (`ns` vor dem ersten Einhängen gesetzt → das Element wird nie eine Entity, Schweregrad high) ist Schritt 6 dieses Pakets. Fund B (ein Namespace-Wechsel verliert alle Properties, Schweregrad medium) geht nach Paket 8.

<details>
<summary>Detailplan Paket 7</summary>

**Abgleich (2026-08-16, Zug 0 dieses Pakets).** Alle drei Findings bestehen. Die Zeilennummern
des Audits sind durch Paket 5 und 6 verschoben, die Fundstellen selbst stimmen zeichengenau.

| Finding | Zustand | Fundstelle heute | gemessen |
|---|---|---|---|
| VIEW-006 | unverändert, Umfang größer | `ShaeEntElement.ts:94-99` (`ns$.onChange`), `:409-418` (`#dispatchRequestParent`), `:422-463` (`#setParent`) | `{"before":"nsroot","afterChange":{"entParentNode":"nsroot","vcParent":null},"afterRestore":{"entParentNode":"nsroot","vcParent":null}}` |
| VIEW-007 | unverändert | `ShaeEntElement.ts:299-318` (`#createParentObserver`), `:320-323` (`onParentChanged`) | `{"move1":"a20","move2":"a20","move3":"a20"}`, erwartet `move2:"c20"` |
| TEST-005 | unverändert | `ShaeElement.ts:41-47` (`ns`-Setter, unverschoben), `:65-69` (`attributeChangedCallback`), `ShaeEntElement.ts:94-99` | kein Testfall im Repo ändert ein `ns` zur Laufzeit — geprüft über alle 17 Spec-Dateien des Integrationspakets und alle 10 e2e-Seiten |

**Reproduktion.** Elf Sonden in echtem Chromium, gefahren über die Browser-Konfiguration des
Pakets `shadow-objects-testing` gegen das gebaute `dist/`. Die erste ist der Beleg des Audits,
die dritte der des Reviewers von Paket 6.

| Sonde | Aufbau | gemessen |
|---|---|---|
| 1 | `<shae-ent id=nsroot><shae-ent id=kid>`, `kid` bekommt `ns`, danach wieder keins | `before entParentNode=nsroot/vcParent=nsroot` · `afterChange entParentNode=nsroot/vcParent=null` · `afterRestore entParentNode=nsroot/vcParent=null` — **defekt in beide Richtungen** |
| 2 | dieselbe Sonde, aus Sicht des Elternteils | `rootChildren` 1 → 0 → **0**: der Rückweg stellt die Kindbeziehung nicht wieder her |
| 3 | `<shae-ent id=p6><shae-ent id=n6 ns=other><shae-ent id=z6>`, `n6` verliert `ns` | `{"before":{"z":"p6","n":null},"after":{"z":"p6","n":"p6"}}` — **defekt**, erwartet `z:"n6"` |
| 4 | `<shae-ent id=p3><shae-ent id=m3><shae-ent id=z3>`, `m3` bekommt `ns` | `{"before":"m3","after":{"z":"m3","zVcParent":null,"zIsRoot":true}}` — **defekt**, erwartet `z:"p3"` und `zVcParent:"p3"` |
| 5 | `MutationObserver` global instrumentiert, `<shae-ent>` per `append`, `moveBefore` und `remove` bewegt | `{"created":5,"observed":5,"disconnected":3,"fired":0}` — der Callback aus `#createParentObserver` feuert auf keinem dieser Wege ein einziges Mal |
| 6 | Unterklasse von `ShaeEntElement` mit `connectedMoveCallback`, zweimal `moveBefore` | `{"move1":"a20","move2":"a20","move3":"a20"}` — **defekt**, erwartet `move2:"c20"`, `move3:"a20"` |
| 7 | Slot-Umhängung: Entity wird in einen Slot projiziert und wieder heraus | `{"unslotted":"h1","slotted":"inA","unslottedAgain":"h1"}` — korrekt, dieser Weg trägt |
| 8 | Kandidatenzahlen für einen `ns`-Wechsel in der Mitte eines Baums | `{"childrenOfM":2,"childrenOfP":3,"roots":1}` |
| 9 | Elternteil ohne `viewComponent` (zweite Bedingung des Reviewers) | Anfragen `4`, danach unverändert `4` — **keine Schleife** |
| 10 | Elternteil und Kind im selben `ns`, aber in zwei verschiedenen `ComponentContext`-Objekten | Anfragen `4`, danach unverändert `4` — **keine Schleife** |
| 11 | Properties über einen `ns`-Wechsel hinweg, Change Trails beider Contexts | alt `{"type":1,"properties":[["x",7]]}` → neu `{"type":1,"token":"probe"}` ohne `properties` — **Fund B** |

Sonde 5 setzt die Erwartung an VIEW-007 zurecht. Der `MutationObserver` sieht das Entfernen
zwar, aber `disconnectedCallback` läuft als synchrone Custom-Element-Reaktion vor dem
Microtask-Checkpoint und ruft `#destroyParentObserver()`; `MutationObserver.disconnect()` leert
dabei die Warteschlange. Über `append`, `remove` und `moveBefore` ist der Callback deshalb
unerreichbar. Erreichbar ist er über genau einen Weg, und der benutzt nur öffentliche API: eine
Unterklasse von `ShaeEntElement` — laut Paket 6 ein zugesagter Anwendungsfall —, die
`connectedMoveCallback` definiert. Dann unterbleibt das Lifecycle-Paar, der Observer überlebt,
schlägt an, und ab da ist das Element unbeobachtet. Sonde 6 zeigt genau das. Der Fix des Audits
ist damit richtig und die einzige Bauform, in der er sich beweisen lässt.

**Die offene Frage: kann `#setParent` in einer Microtask-Schleife hängenbleiben?**

Ausgeschlossen. Beide Bedingungen, die zum `queueMicrotask` in `:448-450` führen, wurden
konstruiert und gefahren; in beiden bleibt die Zahl der `shaeRequestEntParent`-Ereignisse
stehen (Sonden 9 und 10, je 4 Anfragen, auch nach mehreren weiteren Task-Runden).

Der Grund steht in `#setParent` selbst und ist nicht von der Anzahl der Runden abhängig:

1. Der Microtask ruft nur `#dispatchRequestParent()`. Wer darauf antwortet, entscheidet die
   Ereignisausbreitung: der nächstgelegene lauschende Vorfahre mit gleichem `ns` stoppt sie. Das
   ist bei unveränderter DOM-Struktur zweimal derselbe.
2. Antwortet derselbe Vorfahre, läuft `requester.#setParent(this)` in die erste Zeile
   `if (this.entParentNode === parent) return;` (`:423`). Es entsteht kein zweiter Effect und
   damit kein zweiter Microtask.
3. Ein neuer Microtask entsteht nur, wenn der Effect aus `:442-454` erneut läuft, und der liest
   genau zwei Signale: `this.viewComponent$` und `parent.viewComponent$`. Ein Microtask ändert
   keines von beiden.

Die Schleife bräuchte also einen Beantworter, der zwischen zwei Runden wechselt, ohne dass sich
das DOM oder eines der beiden Signale ändert. Den gibt es nicht. Was bleibt, ist genau eine
zusätzliche Anfrage pro Effect-Lauf — Kosten, kein Aufhängen.

Abgesichert wird das durch zwei Fälle in `ent-element-namespace.test.js` (Schritt 7), die beide
Bedingungen herstellen und die Zahl der Anfragen zählen. Die Fälle sind Wächter: sie sind vor wie
nach diesem Paket grün. Nach Schritt 6 ist die erste Bedingung ohnehin nur noch über einen
verworfenen `ComponentContext` erreichbar — der zweite Fall bleibt deshalb der wichtigere.

**Die Wege, antwortender Vorfahre zu werden.** Ein Element `X` beantwortet die Elternanfrage
einer Entity `E`, wenn `X` verbunden ist, auf `RequestEntParentEventName` lauscht,
`X.ns === E.ns` gilt und `X` der erste solche Knoten auf dem Ereignispfad von `E` ist. Neu wahr
werden kann das auf diesen Wegen — vollständig aufgezählt gegen `ShaeEntElement.ts`, jeder
einzeln in Chromium nachgestellt:

| Weg | Auslöser im Code | trägt heute die Aufforderung mit? |
|---|---|---|
| `X` verbindet sich | `connectedCallback` `:292` → `#askPeersToReRequestParent()` | **ja**, seit Paket 6 |
| `X` bekommt den `ns` von `E` | `ns$.onChange` `:94-99` | **nein** — Sonde 3, Schritte 2 und 3 dieses Pakets |
| `X` verlässt den `ns` von `E`, `E` muss aufsteigen | `ns$.onChange` `:94-99` | **nein** — Sonde 4, Schritte 2 und 3 dieses Pakets |
| `E` selbst wechselt den `ns` | `ns$.onChange` `:94-99` → `#dispatchRequestParent()` | teilweise: `E` fragt neu, löst aber die alte Bindung nicht — Sonde 1, Schritt 3 |
| `E` bewegt sich im DOM | `disconnectedCallback`/`connectedCallback`, ersatzweise `#createParentObserver` `:299-318` | ja; der Observer-Zweig nur einmal — Sonde 6, Schritt 5 |
| `E` wird in einen anderen Slot projiziert | `#onSlotChange` `:465-475` → `ReRequestEntParentEventName` | ja — Sonde 7 |
| `X` entsteht in einem Shadow Root über `E` | dieselbe Kette über `slotchange` | ja — Paket 6, Fall `a wrapper with a shadow root adopts the entity projected into its slot` |
| `X` wird spät per `customElements.define` registriert | `connectedCallback` bzw. Upgrade in place | ja — Paket 6 |
| `X` bekommt einen anderen `ComponentContext` bei gleichem `ns` | nur über `componentContext$.set(…)` von außen | nein, und bleibt es: das Signal ist öffentlich, aber kein Attributpfad. Sonde 10 zeigt, dass der Zustand stabil bleibt statt zu schwingen |

Nach den Schritten 2 bis 5 trägt jeder Weg die Aufforderung mit, außer der letzten Zeile — und
die ist kein Weg des Elements, sondern ein Eingriff von außen. Damit ist die Invariante aus
Paket 6 eine Eigenschaft des Baums.

Eine Randbemerkung zur Tabelle, die Schritt 6 auflöst: Ob ein Element antwortet, hängt allein an
`connectedCallback` und `ns` — nicht daran, ob es eine `ViewComponent` hat. Ein Element im
Zustand aus Fund A ist deshalb heute ein antwortender Vorfahre ohne Entity: es fängt die Anfrage
ab, bindet den Fragenden an sich, und dessen `vc.parent` bleibt leer. Genau das ist die erste der
beiden Bedingungen der Microtask-Frage. Nach Schritt 6 entsteht dieser Zustand über den
`ns`-Pfad nicht mehr.

**Zwei Funde außerhalb des Audits.**

*Fund A (Schweregrad high, nicht im Audit — vom Nutzer am 2026-08-16 in dieses Paket geholt).* Wird `ns` gesetzt, bevor das Element zum
ersten Mal in den Baum kommt, wird es nie eine Entity. Gemessen mit beiden Schreibwegen —
`el.ns = 'x'` und `el.setAttribute('ns', 'x')` — an einem über `innerHTML` in einem losgelösten
`<div>` aufgebauten Markup: `{"pHasVc":false,"kParent":"p21","ctxSize":0}`. Der Namespace-Context
ist leer, das Element hat keine `ViewComponent`, keine Property kommt an, kein Sync passiert,
und es gibt keine Meldung. Ursache: `ns$.onChange` setzt `componentContext$`, solange noch kein
`#setupViewComponentEffect` registriert ist; `connectedCallback` `:282-284` legt die
`ViewComponent` aber nur an, wenn `componentContext == null` ist. Der Zustand »Context gesetzt,
Komponente fehlt« hat keinen Ausweg mehr. Dieselbe Ursache trifft ein Element, dessen `ns` sich
ändert, während es losgelöst ist: nach dem Wiedereinhängen hängt es an einer zerstörten
`ViewComponent` (`isDestroyed === true`) und erholt sich nicht. Der Fix sind drei Zeilen und
liegt exakt in den Zeilen, die dieses Paket ohnehin anfasst — Schritt 6.

*Fund B (Schweregrad medium, nicht im Audit — vom Nutzer am 2026-08-16 nach Paket 8 verwiesen).* Ein Namespace-Wechsel nimmt
die Properties nicht mit. Sonde 11: im alten Context steht `{"type":1,"properties":[["x",7]]}`,
im neuen `{"type":1,"token":"probe"}` — die Entity kommt im neuen Environment als nackter Token
an. Ursache: der Effect in `ShaePropElement.ts:136-157` liest `viewComponent$`, `name$` und
`valueOut$`; ein Wechsel des `ComponentContext` verändert keines davon, und die
`ComponentChanges` des neuen Contexts sind frisch. Der Testplan des Projekts hat das anders erwartet:
`packages/shadow-objects-e2e/TEST-PLAN.md:200` fordert unter `MULTI-8` ausdrücklich »properties
survive the move«. Das gehört trotzdem nicht hierher: dieses Paket repariert die Elternbindung,
nicht den Property-Lebenszyklus, und Paket 8 hat genau den zum Thema. Die e2e-Fälle in Schritt 9 sind deshalb bewusst so geschnitten, dass sie Hierarchie und
Ankunft prüfen und den Property-Inhalt nicht behaupten; der Fall dafür entsteht in Paket 8.

**Was das kostet.** Ein `ns`-Wechsel eines verbundenen Elements löst nach diesem Paket aus:

- eine Nachricht an jedes Kind der eigenen `ViewComponent` im alten Context — deren Zahl ist die
  Zahl der Entities, die tatsächlich an diesem Element hängen, nicht die des Teilbaums;
- eine Nachricht an jedes Geschwister im neuen Context, jede mit dem `isBelow`-Aufstieg aus
  Paket 6 als Filter — derselbe Kandidatensatz und derselbe Filter wie bei einem
  `connectedCallback`, also ohne neue Größenordnung;
- eine eigene Elternanfrage.

Gemessen an einem Baum aus fünf Entities: das Einhängen kostet 5 Anfragen, der `ns`-Wechsel 3,
der Rückweg 2. Nichts davon skaliert mit der Größe des Dokuments. Schritt 6 kommt in dieser
Rechnung nicht vor: sein `else`-Zweig läuft einmal pro `connectedCallback` und endet im
Normalfall in der ersten Zeile des `context`-Setters, weil der Wert derselbe ist. Er verschickt
keine Nachricht und löst keine Anfrage aus. Der Unterschied zu Paket 6 ist
die Häufigkeit: `connectedCallback` läuft für jedes Element einmal, ein `ns`-Wechsel nur, wenn
jemand ein Attribut schreibt. Der quadratische Effekt, den Paket 6 zweimal nachbessern musste,
entsteht durch die Zahl der Auslöser, nicht durch die Kosten eines einzelnen — und die Zahl der
Auslöser ist hier durch die Anwendung begrenzt, nicht durch die Dokumentgröße.

**Das Netz.** Der Weg ist gegen einen vollständigen Prototyp gemessen: `pnpm lint` rc=0,
`typecheck` ✓, `test:ci` 546 und e2e 380 — dieselben Zahlen wie ohne ihn, kein einziger
bestehender Fall ändert sein Ergebnis. Die 19 Struktur-Assertions aus Paket 2 auf
`shae-worker.html` und die 9 aus Paket 6 auf `upgrade-timing` bleiben grün und werden nicht
angefasst. Eine Beziehung wird bewusst *nicht* verändert: die neuen e2e-Fälle bekommen ihre
eigenen Entities und werden **nicht** in `ENT_IDS` (`src/multi-env.js:14`) aufgenommen. Sonst
wüchsen die Schleifen von `multi-env-same-token-stays-independent`,
`multi-env-other-namespaces-unaffected`, `multi-env-no-foreign-envName-leaked` und
`drainAllEntities` still um zwei Einträge, und ein Element, das mitten im Lauf den Namespace
wechselt, würde `created.length === 1` verletzen. Zwei getrennte Aufzeichnungen kosten zehn
Zeilen und lassen alle 26 vorhandenen Fälle unverändert.

- Dateien:
  - `packages/shadow-objects/src/elements/ShaeEntElement.ts` (Schritte 3 bis 6)
  - `packages/shadow-objects/src/view/ComponentContext.ts` (Schritt 2)
  - `packages/shadow-objects-testing/test/ent-element-namespace.test.js` (neu, Schritte 1 und 7)
  - `packages/shadow-objects-testing/test/ComponentContext.test.js` (Schritt 8)
  - `packages/shadow-objects-e2e/pages/multi-env.html`, `src/multi-env.js`, `tests/multi-env.spec.ts` (Schritt 9)
  - `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`, `CHANGELOG.md`, `packages/shadow-objects-e2e/TEST-PLAN.md` (Schritt 10)
- Vorgehen:
  1. **Zuerst die roten Tests** aus Schritt 7 anlegen und laufen lassen. Neun davon müssen
     fehlschlagen, einer ist ein Wächter und grün. Die erwarteten Meldungen stehen dort einzeln.
     Erst danach Code anfassen — auch für Schritt 6.
  2. In `packages/shadow-objects/src/view/ComponentContext.ts`, unmittelbar vor
     `dispatchReRequestParentSiblings` (`:346`), die Methode
     `dispatchReRequestParentChildren(component: ViewComponent)` anlegen: sie schickt jedem
     Eintrag aus `this.getChildren(component)` die Nachricht `ComponentContext.ReRequestParentRoots`
     über `dispatchMessage`. Doc-Kommentar in zwei Sätzen, in der Bauform der Nachbarmethode: Die
     Empfänger sind die Entities, die an `component` hängen; sie müssen ausnahmslos loslassen,
     deshalb trägt die Nachricht keinen Absender und braucht keinen Filter. Das vorhandene Signal
     `ReRequestParentRoots` wird wiederverwendet, weil es genau »lass deinen Elternteil los und
     frag neu« bedeutet — der Name nennt heute den ersten Empfängerkreis, nicht die Bedeutung;
     ein neuer Name wäre eine öffentliche Konstante mehr für dieselbe Sache. Ein Satz dazu als
     Kommentar. `getChildren()` gibt bereits ein frisches Array zurück, es wird nichts kopiert.
  3. In `ShaeEntElement.ts` den `ns$.onChange`-Handler (`:94-99`) auf diese Reihenfolge bringen —
     die Reihenfolge ist der Kern des Schritts und gehört als Kommentar an die Stelle:
     - solange das Element verbunden ist und eine `ViewComponent` in einem Context hat:
       `previousContext.dispatchReRequestParentChildren(previousVC)`. Das ist gefahrlos vor dem
       Context-Wechsel, weil `this.ns` beim Aufruf des Handlers bereits den neuen Wert trägt —
       `#onRequestParent` (`:496`) weist die Kinder also schon ab, wenn sie sofort neu fragen.
     - danach `this.#setParent(undefined)`: die eigene Bindung lösen. Der Vorbehalt aus Paket 6
       gegen vorheriges Abräumen greift hier nicht — es räumt nur das Element selbst ab, und das
       verlässt den Context ohnehin.
     - danach wie bisher `this.componentContext$.set(ComponentContext.get(ns))`.
     - danach, solange verbunden, `this.#dispatchRequestParent()` und neu
       `this.#askPeersToReRequestParent()`.
  4. Damit Schritt 3 die Methode benutzen kann, den Wächter `if (!this.#wasUpgradedInPlace) return;`
     aus `#askPeersToReRequestParent()` (`:393`) an seine Aufrufstelle im `connectedCallback`
     (`:292`) verschieben: dort steht künftig
     `if (this.#wasUpgradedInPlace) this.#askPeersToReRequestParent();`. Der Doc-Kommentar der
     Methode (`:379-391`) beschreibt danach nur noch, wen sie erreicht; die Begründung, warum ein
     frisch konstruiertes Element beim Verbinden niemanden fragen muss, wandert als ein Satz an
     die Aufrufstelle. Inhaltlich ändert sich nichts, der Wächter gilt weiter für den
     Connect-Pfad und darf für den `ns`-Pfad nicht gelten.
  5. In `onParentChanged()` (`:320-323`) nach `#dispatchRequestParent()` ein
     `this.#createParentObserver()` ergänzen — VIEW-007, wörtlich die Empfehlung. Ein Satz
     Kommentar, warum es idempotent ist (`#createParentObserver` beginnt mit
     `#destroyParentObserver`) und warum die Beobachtung dem Element folgen muss statt an der
     alten Stelle zu enden.
  6. **Fund A** (Nutzerentscheidung vom 2026-08-16, siehe »Entscheidungen«). Auch dieser Fix
     kommt nach seinen roten Tests: die zwei Fälle aus Schritt 7 stehen und schlagen fehl, bevor
     hier eine Zeile entsteht.

     *Fundstelle.* `ShaeEntElement.ts:213-226` (der `componentContext$.onChange`-Handler in
     `#setupViewComponentEffect()`) und `:282-284` (der `componentContext`-Block im
     `connectedCallback`). Der Handler wird erst beim Verbinden registriert, `ns$.onChange`
     (`:94-99`) setzt `componentContext$` aber schon vorher. Wer den Namespace setzt, bevor das
     Element zum ersten Mal in den Baum kommt, hinterlässt damit den Zustand »Context gesetzt,
     Komponente fehlt« — und `:282-284` legt die `ViewComponent` nur an, wenn
     `componentContext == null` ist. Aus diesem Zustand führt kein Pfad heraus.

     *Die Änderung, drei Stellen.* Erstens den Rumpf des `onChange`-Handlers (`:213-226`) in ein
     eigenes Feld `#applyComponentContext = (context: ComponentContext | undefined) => { … }`
     ziehen — unverändert, nur verschoben. Zweitens den Handler auf
     `this.componentContext$.onChange(this.#applyComponentContext)` verkürzen. Drittens den Block
     `:282-284` um einen `else`-Zweig ergänzen, der `this.#applyComponentContext(this.componentContext)`
     aufruft. Kommentar an diesem `else`: Der Namespace kann gesetzt oder geändert worden sein,
     während das Element draußen war; das Context-Signal steht dann schon auf seinem neuen Wert,
     es feuert nichts mehr, und das Element bliebe ohne Entity. Für den Normalfall ändert sich
     nichts — dort ist der Aufruf ein `vc.context = context` auf denselben Wert und damit ein
     `return` in der ersten Zeile des Setters (`ViewComponent.ts:75`).

     *Der zweite Fall, gemessen und mitzunehmen.* Dieselbe Ursache trifft ein Element, dessen
     `ns` sich ändert, während es losgelöst ist: `disconnectedCallback` setzt `componentContext$`
     auf `undefined` und zerstört dabei über den Handler die `ViewComponent` (`vc.context =
     undefined` → `ViewComponent.destroy()`), der `ns`-Wechsel setzt das Signal danach auf den
     neuen Context, und beim Wiedereinhängen greift derselbe `if`. Gemessen:
     `{"pHasVc":true,"pVcDestroyed":true}` — das Element hält eine zerstörte `ViewComponent` und
     erholt sich nicht. Der `else`-Zweig deckt beide Fälle in einem, weil
     `#applyComponentContext` eine vorhandene Komponente über `vc.context = context` wiederbelebt
     statt eine zweite anzulegen. Beide Fälle brauchen trotzdem je einen eigenen Testfall — sie
     kommen über verschiedene Wege in denselben Zustand, und nur einer davon ist der häufige.
  7. Neue Datei `packages/shadow-objects-testing/test/ent-element-namespace.test.js`, gebaut auf
     `mount`/`unmountAll` aus `../src/mount.js`, mit Kopfkommentar in der Bauform von
     `ent-element-upgrade.test.js`: warum echtes Chromium (Custom-Element-Reaktionen,
     Slot-Zuweisung, `moveBefore`), und dass jeder Fall eigene ids benutzt. Zehn Fälle, in dieser
     Reihenfolge; die neun roten mit ihrer gemessenen Meldung:

     | Fall | rot mit |
     |---|---|
     | `a namespace change releases the current parent` | `no ancestor answers in the new namespace: expected 'gp-n1' to be undefined` |
     | `the DOM view and the entity tree say the same thing after a namespace change` | `entParentNode must not claim a parent the entity tree does not have: expected 'gp-n2' to equal null` |
     | `the entity leaves the old context and joins the new one` | `and no parent in the new one: expected 'gp-n3' to be undefined` |
     | `the way back to the original namespace restores the entity tree` | `the entity is a child again: expected null to equal 'gp-n4'` |
     | `an element that loses its namespace adopts the entities below it` | `expected 'gp-n5' to equal 'mid-n5'` |
     | `an element that gains a namespace hands its entities to the next ancestor` | `expected 'mid-n6' to equal 'gp-n6'` |
     | `a namespace change does not reorder the siblings that stay behind` | — Wächter, vor wie nach dem Fix grün |
     | `an element that gets its namespace before it enters the tree becomes an entity` | `the element joined its namespace: expected undefined to exist` (Fund A, Schritt 6) |
     | `an element whose namespace changed while it was detached comes back alive` | `the entity is alive again: expected true to equal false` (Fund A, Schritt 6) |
     | `the parent observer follows the element to its new parent` | `expected 'a-n9' to equal 'c-n9'` |

     Regeln für die Fälle: Zusicherungen laufen über `entParentNode?.id` und über einen aus der
     `ViewComponent`-Sicht abgeleiteten String (`vc.parent === gp.viewComponent ? 'gp-n4' : null`),
     nie über Objektidentität — im roten Zustand nennt die Meldung sonst zwei serialisierte
     Elemente oder `{}`. Der Fall zum Observer definiert eine Unterklasse von `ShaeEntElement`
     mit leerem `connectedMoveCallback` und bewegt das Element zweimal per `moveBefore`; ein
     Kommentar sagt, warum das der einzige Weg ist, auf dem der Observer überhaupt anschlägt
     (Sonde 5). Dazu die zwei Wächter zur Microtask-Frage aus dem Abschnitt oben, die die Zahl
     der `shaeRequestEntParent`-Ereignisse über einen Dokument-Listener in der Capture-Phase
     zählen und auf Stillstand prüfen. Die zwei Fälle zu Fund A bauen ihr Markup über `innerHTML`
     in einem losgelösten `<div>` auf und hängen es erst danach ein; der zweite nimmt den Umweg
     über `remove()`, `ns`-Wechsel, `append()`. Beide prüfen zusätzlich, dass der neue
     Namespace-Context genau die erwartete Zahl von Komponenten führt — sonst geht ein Element
     durch, das zwar eine `ViewComponent` hat, aber in keinem Context steht.
  8. In `packages/shadow-objects-testing/test/ComponentContext.test.js` einen Fall für
     `dispatchReRequestParentChildren` ergänzen, in der Bauform der vorhandenen sechs: ein Elternteil
     mit drei Kindern, jedes Kind zählt die empfangene Nachricht, Erwartung genau eine pro Kind und
     keine an den Elternteil selbst.
  9. e2e: In `packages/shadow-objects-e2e/pages/multi-env.html` hinter dem `same-ns`-Block eine
     Insel `MULTI-8` ergänzen — `<shae-ent id="switch-outer" ns="alpha" token="probe">` mit einer
     `envName`-Property und darin `<shae-ent id="switch-me" ns="alpha" token="probe">` mit eigener
     `envName`-Property, dazu ein HTML-Kommentar, der den Fall benennt. In `src/multi-env.js` ganz
     am Ende, nach MULTI-5, den Abschnitt anfügen; die zwei neuen Entities bekommen ihre eigene
     Aufzeichnung und werden **nicht** in `ENT_IDS` aufgenommen (Begründung unter »Das Netz«).
     Fünf neue IDs, in dieser Reihenfolge:
     `multi-env-ns-switch-syncs` (Wechsel auf `beta`, danach `syncAll`),
     `multi-env-ns-switch-left-the-old-env` (im alten Context kein Kind mehr an `switch-outer`),
     `multi-env-ns-switch-joined-the-new-env` (ein zweites `probeCreated` ist eingetroffen, mit
     `hasParent === false`),
     `multi-env-ns-switch-view-matches-tree` (`entParentNode` ist leer und `viewComponent.parent`
     ist es auch),
     `multi-env-ns-switch-back-restores-the-tree` (zurück auf `alpha`: `entParentNode` ist
     `switch-outer`, `viewComponent.parent` ist dessen `ViewComponent`, und ein drittes
     `probeCreated` meldet `parentUuid === byId('switch-outer').uuid`).
     Dieselben fünf IDs in derselben Reihenfolge in `tests/multi-env.spec.ts` unter einer
     Kommentarzeile `// MULTI-8: a namespace change at runtime`.
     **Kein Fall behauptet den Property-Inhalt nach dem Wechsel.** Gemessen kommt die Entity im
     neuen Environment ohne ihre Properties an (Fund B), und der Fix dafür gehört Paket 8 — wer
     hier `records['switch-me'].created[1]?.envName === 'switch-me'` hinschreibt, schreibt eine
     Erwartung hin, die entweder sofort rot ist oder in Paket 8 wieder umgedreht wird. Geprüft
     wird, *dass* ein zweites `probeCreated` eintrifft und welche Elternbeziehung es meldet, nicht
     *was* darin steht. Ein Kommentar an dieser Stelle sagt das und verweist auf Paket 8.
  10. Dokumentation und Changelogs. In `packages/shadow-objects/docs/api-reference.md`,
      Abschnitt `### <shae-ent>`, Unterabschnitt `#### Entity Hierarchy`, hinter den Absatz aus
      Paket 6 zwei Sätze: Ein Wechsel des `ns` zur Laufzeit nimmt die Entity in das andere
      Environment mit; die Bindung an den Vorfahren wird dabei in beide Richtungen neu bestimmt,
      also auch für die Entities, die an diesem Element hingen. In der Attributtabelle desselben
      Abschnitts beim `ns`-Eintrag ergänzen, dass er zur Laufzeit änderbar ist. In
      `packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`, `**Fixed (elements):**`, zwei
      Stichpunkte: `entParentNode` nach einem Namespace-Wechsel, und die Beobachtung des
      Elternknotens, die dem Element an seine neue Position folgt. Den Satz »Six of them reach
      existing consumers« entsprechend hochzählen. Mit Schritt 6 kommt ein dritter Stichpunkt dazu
      (ein vor dem Einhängen gesetztes `ns` ergibt eine Entity) — dieser gehört unter
      `**Fixed (elements):**` und zählt mit. `README.md` und `docs/guides.md` prüfen: trifft keine
      der beiden eine Aussage über Namespace-Wechsel zur Laufzeit, bleiben sie unangetastet, und
      die Prüfung wird in der Verlaufszeile festgehalten. In der `CHANGELOG.md` im
      Repo-Wurzelverzeichnis ein Stichpunkt im Abschnitt zum 2026-08-16 über die neue Abdeckung
      (eine Spec für Namespace-Wechsel im Integrationspaket, ein Abschnitt auf der
      `multi-env`-Seite). In `packages/shadow-objects-e2e/TEST-PLAN.md` genau eine Stelle anfassen:
      die Zeile `MULTI-8` in der Tabelle unter §3.1 (`:200`) — sie beschreibt genau diesen Fall und
      wird als umgesetzt markiert, mit Verweis auf die neuen `multi-env-ns-switch-*`-IDs. Ihre
      Teilforderung »properties survive the move« bleibt dabei ausdrücklich offen und bekommt
      einen Verweis auf Paket 8 — sie ist heute nicht erfüllt (Fund B).
      §1 und §2.2 sind darüber hinaus veraltet und gehören Paket 12. Danach `Backlog.md`
      durchsehen: Punkt 4 (`:41`) und `VIEW-6` (`:204`) beschreiben das Beobachten von
      In-Place-Reparenting — nach Schritt 5 ist der zweite Teil davon eingelöst, der Eintrag wird
      entsprechend gekürzt statt gestrichen, weil der atomare Umzug (`moveBefore` ohne
      `connectedMoveCallback`) offen bleibt und als eigene Zeile dorthin gehört.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`.
  Erwartung: `test:ci` 557 statt 546, davon `shadow-objects-testing` 262 statt 251 in 18 statt 17
  Dateien — 10 Fälle in der neuen Spec-Datei und 1 in `ComponentContext.test.js`; e2e 390 statt
  380 (5 neue IDs × 2 Browser). Weicht die e2e-Zahl nach unten ab, fehlt eine ID im Spec-Array. Kein
  »Errors«-Block; die Seite `multi-env` muss ihren Test `no uncaught or logged errors` behalten.
  Danach einmal `pnpm -F shadow-objects-testing test -- --sequence.shuffle`, weil die neue
  Spec-Datei einen Custom-Element-Namen global belegt.
- Commit: `fix(elements): rebind the entity tree on a namespace change (VIEW-006, VIEW-007, TEST-005)`
- Verlauf:
  - Zug 0 (2026-08-16, Planer): Alle drei Findings gegen die Quelle geprüft — unverändert, Fundstellen
    zeichengenau, Zeilennummern um Paket 5 und 6 verschoben und in der Abgleichstabelle
    richtiggestellt. Elf Sonden in echtem Chromium gefahren; der Beleg des Audits ist reproduziert
    (`afterChange entParentNode=nsroot` statt `null`), ebenso die Messung des Reviewers von Paket 6
    (`z:"p6"` statt `"n6"`). Zwei Funde über den Audit-Text hinaus: der Rückweg eines
    Namespace-Wechsels stellt die Kindbeziehung nicht wieder her, und ein Element, das seinen `ns`
    verlässt, lässt seine Entities als Wurzeln zurück statt sie aufsteigen zu lassen. VIEW-007 ist
    über `append`, `remove` und `moveBefore` nicht auslösbar (`fired: 0`) und nur über eine
    Unterklasse mit `connectedMoveCallback` — der rote Fall ist entsprechend gebaut. Die offene
    Frage zur Microtask-Schleife ist mit beiden Bedingungen konstruiert und ausgeschlossen, die
    Anfragezahl steht still. Weg entschieden und als vollständiger Prototyp gemessen: die neun
    geplanten Testfälle grün, Verify komplett grün — lint rc=0, typecheck ✓, `test:ci` 546, e2e 380,
    also keine einzige bestehende Beziehung verändert. Prototyp zurückgenommen, `dist/` neu gebaut,
    Arbeitsbaum sauber. Zwei Funde außerhalb des Audits dem Nutzer vorgelegt (Fund A high, Fund B
    medium).
  - Zug 0, Nachtrag (2026-08-16, Planer): Beide Rückfragen vom Nutzer entschieden — Fund A wird
    hier als Schritt 6 mitbehoben, Fund B geht nach Paket 8. Für Fund A die zwei Regressionstests
    gebaut und gegen den unveränderten Code rot gesehen (`expected undefined to exist` und
    `the entity is alive again: expected true to equal false`), danach gegen den Prototyp grün.
    Der Detailplan führt Schritt 6 jetzt vollständig aus, die Testtabelle zehn Fälle statt neun,
    das Verify 557 statt 556. Die e2e-Fälle sind ausdrücklich ohne Erwartung an den
    Property-Inhalt geschnitten. Prototyp zurückgenommen, `dist/` neu gebaut, Arbeitsbaum sauber.

**Finding VIEW-006 (medium) — Volltext**

*Titel:* `entParentNode` beim Namespace-Wechsel zurücksetzen

*Fundstelle:* `packages/shadow-objects/src/elements/ShaeEntElement.ts:47-52, :321-362` (heute `:94-99`, `:409-463`)

*Beschreibung:* Ändert sich der Namespace eines verbundenen `<shae-ent>`, stellt es per `#dispatchRequestParent` eine neue Elternanfrage. Vorfahren aus einem anderen Namespace lehnen diese korrekt ab (`#onRequestParent` prüft `requester.ns !== this.ns`), sodass niemand antwortet — und weil niemand antwortet, wird `#setParent` nie aufgerufen. Die alte Bindung bleibt bestehen: `entParentNode` zeigt weiter auf den Vorfahren aus dem alten Namespace, und das Element bleibt als Listener für `ReRequestEntParentEventName` bei ihm registriert. Auf Modellebene ist das Verhalten richtig — der Effect in `#setParent` setzt `vc.parent` auf `undefined`, sobald die Contexts auseinanderfallen, und die E2E-Tests `multi-env-cross-ns-child-becomes-root` belegen das. Falsch ist nur die DOM-seitige Sicht, die damit als öffentlich lesbare Property (`this.entParentNode`) das Gegenteil dessen behauptet, was der Entity-Baum tut.

*Empfehlung:* In `#dispatchRequestParent` oder im `ns$`-Handler die bestehende Bindung vorher lösen (`#setParent(undefined)`), so wie es `#reReuestParentRoot` bereits tut. Dann ist `entParentNode` nach einem Namespace-Wechsel entweder korrekt neu gesetzt oder ehrlich leer.

*Beleg des Audits:* Sonde, `ns` auf einem verbundenen Kind gesetzt und wieder entfernt: `PROBE-L {"before":"nsroot","afterNsChange":"nsroot","afterRestore":"nsroot"}` — erwartet nach dem Wechsel: `null`.

*Anmerkung des Planers:* Der Satz »auf Modellebene ist das Verhalten richtig« hält der Messung nur für die Hinrichtung stand. Der Rückweg ist ebenfalls defekt: weil `#setParent` nie gelöst wurde, greift beim Zurückwechseln der Kurzschluss `if (this.entParentNode === parent) return;`, der Effect wird nicht neu aufgebaut, und `vc.parent` bleibt leer — gemessen `rootChildren` 1 → 0 → 0. Und ein Element, das seinen Namespace *verlässt*, lässt die Entities, die an ihm hingen, als Wurzeln zurück, statt sie zum nächsten passenden Vorfahren aufsteigen zu lassen (Sonde 4). Die Empfehlung des Audits behebt den ersten Teil; die anderen beiden brauchen die zwei zusätzlichen Kanäle aus den Schritten 2 und 3.

**Finding VIEW-007 (medium) — Volltext**

*Titel:* Parent-Observer nach einem Elternwechsel neu aufsetzen

*Fundstelle:* `packages/shadow-objects/src/elements/ShaeEntElement.ts:244-273` (heute `:299-323`)

*Beschreibung:* Der `MutationObserver`, der das Entfernen aus dem Elternknoten bemerkt, wird ausschließlich in `connectedCallback` erzeugt. Schlägt er an, ruft der Callback `#destroyParentObserver()` und danach `onParentChanged()` — die Methode löst die Elternbindung und stellt eine neue Anfrage, setzt aber keinen neuen Observer auf. Für den Normalfall trägt das, weil ein Entfernen aus dem Dokument ohnehin `disconnectedCallback` auslöst und ein späteres Einhängen wieder `connectedCallback`. Für Bewegungen innerhalb eines nicht verbundenen Teilbaums — genau der Fall, für den der Observer überhaupt existiert, denn dort feuert kein Lifecycle-Callback — bleibt das Element nach dem ersten Wechsel unbeobachtet und bemerkt jede weitere Umhängung nicht mehr.

*Empfehlung:* Am Ende von `onParentChanged()` `#createParentObserver()` aufrufen, damit die Überwachung dem Element an seine neue Position folgt. Der Aufruf ist idempotent, weil `#createParentObserver` mit `#destroyParentObserver` beginnt.

*Anmerkung des Planers:* Der beschriebene Anwendungsfall trifft nicht zu — in einem nicht verbundenen Teilbaum ist `connectedCallback` nie gelaufen, es gibt dort also gar keinen Observer. Gemessen feuert der Callback über `append`, `remove` und `moveBefore` kein einziges Mal (Sonde 5): `disconnectedCallback` läuft als synchrone Custom-Element-Reaktion vor dem Microtask-Checkpoint und `disconnect()` leert dabei die Warteschlange. Erreichbar ist der Zweig über eine Unterklasse von `ShaeEntElement` mit `connectedMoveCallback` — öffentliche API, dokumentierter Hook —, und dort ist der Defekt exakt wie beschrieben (Sonde 6). Die Empfehlung wird wörtlich umgesetzt; der rote Test ist entsprechend gebaut.

**Finding TEST-005 (medium) — Volltext**

*Titel:* Namespace-Wechsel zur Laufzeit testen

*Fundstelle:* `packages/shadow-objects/src/elements/ShaeElement.ts:41-47`, `elements/ShaeEntElement.ts:47-52`

*Beschreibung:* `ShaeElement` hat einen `ns`-Setter, `ns` ist ein beobachtetes Attribut, und `ShaeEntElement` reagiert auf jede Änderung mit einer neuen Elternanfrage und einem Wechsel des `ComponentContext`. Das ist erkennbar bewusst gebaute Funktionalität mit nicht trivialen Folgen — der Wechsel bedeutet, dass eine Komponente ein Environment verlässt und einem anderen beitritt, inklusive Aufräumen im alten. Die multi-env-Tests decken Namespaces ausgiebig ab, aber ausschließlich statisch: jedes Element bekommt sein `ns` im Markup und behält es. Kein Test ändert ein `ns` zur Laufzeit. VIEW-006 sitzt genau in dieser Lücke.

*Empfehlung:* Einen Fall in `multi-env.js` oder im Integrationspaket ergänzen, der das `ns`-Attribut eines verbundenen Entity ändert und danach prüft: Entity ist im alten Environment verschwunden, im neuen aufgetaucht, `entParentNode` ist konsistent zur `ViewComponent`-Sicht, und der Rückweg zum ursprünglichen Namespace stellt den Ausgangszustand wieder her.

*Anmerkung des Planers:* Beide Orte werden bedient, weil sie verschiedene Fragen beantworten: das Integrationspaket die Bindung im Detail und in beide Richtungen (neun Fälle, Schritt 7), die `multi-env`-Seite die Environment-Grenze mit echten Workern (fünf IDs, Schritt 9). Die vierte Forderung — der Rückweg stellt den Ausgangszustand wieder her — ist heute rot und wird es ohne die Schritte 2 und 3 auch bleiben. Ein Teil der Empfehlung kann dieses Paket nicht einlösen: die Entity kommt im neuen Environment ohne ihre Properties an (Fund B). Die e2e-Fälle behaupten deshalb Hierarchie und Ankunft, nicht den Inhalt.

</details>

### [x] 8. Property-Lebenszyklus beim Entfernen

- Hash: `3bced80`
- Ergebnis: 3 Runden · die offene Frage des Audits beantwortet, Fund B behoben, Schritt 10 erledigt · Verify grün: lint rc=0, typecheck ✓, test:ci 584 (`shadow-objects-testing` 289 in 20 Dateien), e2e 400, kein »Errors«-Block, geshuffelt grün
- **Die offene Frage »Was räumt eine entfernte shae-prop auf?« ist beantwortet: nichts.** Es gab keinen Mechanismus. Die Prämisse der Frage war falsch — `dynamic-dom-removed-prop-is-gone` war nicht grün, sondern stand in `knownFailures`, und Playwright zählt einen erwarteten Fehlschlag in der Zusammenfassung als »passed«. Gemessen: Entfernen erzeugte Trail `[]`, die Property blieb im echten Kernel stehen; Umbenennen ließ den alten Namen stehen; Verschieben ließ sie auf **beiden** Entities stehen. Jetzt besitzt ein Bindungs-Effect die Property, solange das Element sie deklariert, und erzeugt beim Ende die Form, die `removeProperty()` vorsieht: `{type:5, uuid, properties:[['x', undefined]]}` ohne begleitendes `{type:2}`.
- Zusätzlich behoben, Regression dieses Pakets, vom Reviewer gemessen: Zwei `<shae-prop>` mit demselben `name` verloren die Property, sobald eines ging — das verbliebene deklarierte sie weiter, das Entity hatte sie nicht mehr. Deklaranten werden jetzt pro Schlüssel gezählt. Ebenso: eine Vergleichsfunktion, die den Wert für gleich mit `undefined` hält, würgte den Transfer still ab.
- Nachweis: 16 Fälle vor ihrem Fix rot gesehen, jeder mit Meldung. Der Reviewer hat zwölf Mutationen gegen echte Builds gefahren und dabei aufgedeckt, dass **keiner** der ursprünglich fünf Wächter falsifizierbar war; vier wurden umgebaut oder umbenannt, zwei Stellen als nachweislich zustandsneutral im Code begründet statt als Testzusage.
- `DEFECT-2` ist aus `KNOWN-DEFECTS.md` verschwunden, `ELEM-2` aus `Backlog.md`, `MULTI-8`, `DOM-6` und `DOM-7` sind im `TEST-PLAN.md` als umgesetzt markiert. Der `knownFailures`-Mechanismus bleibt und hat mit `create-element.spec.ts` (DEFECT-1) noch genau einen Benutzer.
- Nebenbefunde: Der Kernel hält pro Schlüssel ein Signal und löscht es nie — nach dem Entfernen liefert `propKeys()` weiterhin `["x"]` und `propEntries()` `[["x", undefined]]`. Das ist gewollt (ein `useProperty()`-Reader muss überleben) und steht jetzt in Doku und Cheat-Sheet. · Geht einer von zwei Deklaranten, wird der Wert des verbliebenen nicht nachgefordert — »last writer wins«, dokumentiert. · `utils/props-utils.ts:19-27` schreibt ausgelieferte Change Trails nachträglich fort (siehe »Vorbestehende Fehler«).
- Folgen: `ComponentContext.transferPropertiesTo()` ist neu und öffentlich, `ShaeElement.syncShadowObjectsOf()` ist `protected` und damit für jede Subklasse sichtbar. Der Zähler im `[Unreleased]`-Kopf der Paket-CHANGELOG steht auf »Twelve of them reach existing consumers«.

- Findings: — (offene Frage des Audits: »Was räumt eine entfernte shae-prop auf?«)
- Ziel: Der Weg, auf dem eine entfernte Property aus dem Entity verschwindet, ist belegt, benannt und durch einen Test gehalten — oder als Lücke behoben.
- Bereich: `packages/shadow-objects/src/elements/ShaePropElement.ts`, `src/view/ViewComponent.ts`, `src/view/ComponentChanges.ts`, `src/view/ComponentContext.ts`, `src/elements/ShaeEntElement.ts`, `src/elements/ShaeElement.ts`, `packages/shadow-objects-testing/test/`, `packages/shadow-objects-e2e/`
- Hängt ab von: —
- Modell: stärkste Stufe
- Hinweis: `removeProperty()` wird von keinem Element aufgerufen, es entsteht kein Change Trail, und trotzdem ist `dynamic-dom-removed-prop-is-gone` grün. Erst klären, wodurch, dann entscheiden, ob das ein Mechanismus oder ein Zufall ist.
- Nachgetragen 2026-08-16 (Planer Paket 7, vom Nutzer hierher verwiesen — Fund B, siehe »Entscheidungen«): **Ein Namespace-Wechsel nimmt die Properties nicht mit.** Gemessen in Chromium an den Change Trails beider Contexts, `<shae-ent ns="a" token="probe"><shae-prop name="x" value="7" type="number">`, danach `ns="b"`:
  - alter Context vor dem Wechsel: `{"type":1,"properties":[["x",7]]}`
  - neuer Context nach dem Wechsel: `{"type":1,"token":"probe"}` — ohne `properties`
  - alter Context nach dem Wechsel: `{"type":2}`, also das Zerstören

  Die Entity kommt im neuen Environment als nackter Token an. Schweregrad medium, nicht im Audit — aber vom Projekt erwartet: `packages/shadow-objects-e2e/TEST-PLAN.md:200` führt unter `MULTI-8` ausdrücklich »properties survive the move«. Die e2e-Fälle aus Paket 7 sind deshalb so geschnitten, dass sie den Property-Inhalt nach dem Wechsel nicht behaupten; der Fall dafür entsteht hier.

  **Wo der Fix sitzt, nach Einschätzung des Planers Paket 7: nicht im Element, sondern eine Ebene tiefer.** Der Effect in `ShaePropElement.ts:136-157` liest `viewComponent$`, `name$` und `valueOut$` — ein Context-Wechsel verändert keines davon, also läuft er nicht noch einmal. Man *könnte* ihn dazu bringen, aber `<shae-prop>` ist nicht der einzige Schreiber: `ViewComponent.setProperty()` ist öffentliche API, und eine Reparatur im Element deckt nur den Markup-Pfad ab. Die Naht liegt an zwei Stellen, die zusammengehören: `ViewComponent`, das den Wechsel als einziges Objekt überlebt (`context`-Setter, `ViewComponent.ts:73-98` — er ruft `destroy()` und danach `addComponent()` am neuen Context), und `ComponentContext.addComponent:129-134`, wo `changes.create(token, parentUuid, order, autoDestructionOnParentRemoval)` den Neueintrag schreibt — Token, Elternteil und Order kommen mit, Properties nicht. Der Mechanismus zum Wiedereinspielen existiert bereits und ist in `ComponentContext.reCreateChanges():408-435` zu besichtigen; er speist sich nur aus der `ComponentMemory` *desselben* Contexts, und die kennt die uuid im neuen Context nicht. Wer hier anfängt, entscheidet also zuerst: reist der Property-Zustand am `ViewComponent` mit, oder holt ihn der neue Context beim alten ab. Beides ist ohne neue Messung entscheidbar.
- Nachgetragen 2026-08-16 (Planer Paket 5): Paket 5 nagelt die Kette fest, die hier untersucht wird — ein leeres oder fehlendes `value`-Attribut ergibt `undefined`, und `ComponentChanges.ts:254` und `:317-327` lesen ein ausdrückliches `undefined` als Entfernen der Property. Die zwei Change-Trail-Fälle im achten `describe`-Block von `prop-element-types.test.js` sind der Einstieg: Sie zeigen den Weg, auf dem eine Property verschwindet, und den, auf dem `0` erhalten bleibt.
- Triage der offenen Nebenbefunde und Folgen aus den Paketen 1 bis 7 (2026-08-16, Planer Paket 8): Ein Eintrag wird hierher geholt, alle anderen bleiben, wo sie zugewiesen sind.
  - **Nach einem `ns`-Wechsel ohne Kinder bekommt das alte Environment keinen Sync** (Paket 7, `ShaeEntElement.ts:94-120` gegen `ShaeElement.ts:71-73`) — echte Folge, vorbestehend, **Ziel: dieses Paket, Schritt 10**. Gemessen (Sonde 5): zwei lokale Environments, `<shae-ent ns="p5a">` ohne Kinder wechselt auf `p5b`, `sync()`-Aufrufe `["b"]` — der alte Kanal bleibt stumm, die Entity steht mit `auto-sync="off"` weiter im alten Kernel (`hasEntity` true in beiden). Begründung für die Aufnahme unter »Was dazugehört und was nicht«.
  - `isBelow`-Aufstieg bleibt n²/2 (`ShaeEntElement.ts:18-23`) — echte Folge, Ziel Backlog, wie zugewiesen. Dieses Paket fasst weder die Vorfahrensuche noch einen der Re-Request-Kanäle an.
  - `dispatchReRequestParentRoots` kennt keinen Absender (`ComponentContext.ts:320-326`) — vorbestehend, Ziel Paket 9, wie vom Reviewer Paket 7 nachgetragen. Unberührt.
  - Tippfehler `unsubcribe` (`ShaeEntElement.ts:152`, `:158`) — Symptom, Ziel Paket 12. Dieses Paket fasst den Effect nicht an.
  - `ComponentContext`-Methoden fehlen in `docs/api-reference.md` — vorbestehend, Ziel Paket 12. Die hier neu entstehende `transferPropertiesTo()` kommt dort mit dazu und wird in Schritt 11 nur in der `CHANGELOG.md` benannt.
  - `ComponentContext.test.js` teilt einen Context über alle Fälle (Paket 7) — echte Folge, Ziel Backlog. Dieses Paket legt seine Fälle in zwei neue Dateien und fasst `ComponentContext.test.js` nicht an.
  - `Element.moveBefore` ist für `<shae-ent>` ein Abriss (Paket 7, `VIEW-6b`) — vorbestehend, Ziel Backlog. Berührt den Property-Pfad nicht: bei einem Abriss wird die Entity neu erzeugt, und die `<shae-prop>`-Kinder schreiben ihre Werte über den regulären Effect neu.
  - `waitUntil`/`testAsyncAction` teilen sich 5000 ms (Paket 2) und `test/__screenshots__/` wird nicht geleert (Paket 4b) — Symptome, Ziel Backlog. Der neue e2e-Fall in Schritt 5 benutzt `waitUntil` innerhalb `testAsyncAction` und erbt die unscharfe Diagnose; das ist bekannt und kein Grund, hier ein Harness umzubauen.
  - `TEST-PLAN.md` §1, §1.2, §2.2, H-4 (Dokumentationsdrift) — Symptome, Ziel Paket 12. Dieses Paket fasst in dieser Datei genau zwei Zeilen an: `MULTI-8` (§3.1) und `DOM-6`/`DOM-7` (§3.2).

<details>
<summary>Detailplan Paket 8</summary>

**Abgleich (2026-08-16, Zug 0 dieses Pakets).** Beide Sachverhalte bestehen. Der Text der offenen
Frage stimmt in seinen Beobachtungen und in seiner Schlussfolgerung nicht.

| Sachverhalt | Zustand | Fundstelle heute | gemessen |
|---|---|---|---|
| offene Frage »Was räumt eine entfernte `shae-prop` auf?« | **nichts räumt auf** — der Test ist kein grüner Test | `ShaePropElement.ts:370-384` (`disconnectedCallback`, `#disconnectFromEntNode`), `ViewComponent.ts:219-221` (`removeProperty`, ohne Aufrufer) | Sonden 1, 2, 3, 6 |
| Fund B — ein `ns`-Wechsel verliert alle Properties | unverändert, Zahlen des Planers Paket 7 exakt reproduziert | `ViewComponent.ts:73-98` (`context`-Setter), `ComponentContext.ts:99-144` (`addComponent`) | Sonden 4, 6 |
| Nebenbefund Paket 7 — alter Namespace ohne Sync | unverändert | `ShaeEntElement.ts:94-120` (`ns$.onChange`), `ShaeElement.ts:16-28, :71-73` | Sonde 5 |

Drei Richtigstellungen zu den Zeilenangaben aus dem Nachtrag des Planers Paket 7: der Effect des
Property-Elements liegt unverändert auf `ShaePropElement.ts:136-157`, der `context`-Setter
unverändert auf `ViewComponent.ts:73-98`, der `create`-Aufruf in `addComponent` unverändert auf
`ComponentContext.ts:129-134` — `reCreateChanges()` steht aber auf `:425-452`, nicht auf `:408-435`.

**Reproduktion.** Acht Sonden in echtem Chromium, gefahren über die Browser-Konfiguration des
Pakets `shadow-objects-testing` gegen das gebaute `dist/`, dazu ein Lauf der e2e-Suite mit dem
JSON-Reporter.

| Sonde | Aufbau | gemessen |
|---|---|---|
| 1 | `<shae-ent ns="p1" token="probe1"><shae-prop name="x" value="7" type="number">`, danach `prop.remove()` | Erstes Trail `[{"type":1,"properties":[["x",7]]}]` · nach dem Entfernen `[]` — **kein Change Trail** · `reCreateChanges()` liefert wieder `properties:[["x",7]]`, die Property steht also unverändert im Zustand |
| 2 | dieselbe Sonde, `name` von `x` auf `y` geändert statt entfernt | `[{"type":5,"properties":[["y",7]]}]`, Zustand danach `[["x",7],["y",7]]` — **der alte Name bleibt stehen** |
| 3 | `<shae-prop>` von Entity `a3` nach `b3` verschoben | `[{"type":5,"uuid":"b3…","properties":[["x",7]]}]`, Zustand danach: **beide** Entities tragen `x:7` |
| 4 | Fund B, Change Trails beider Contexts | alt vorher `{"type":1,"properties":[["x",7]]}` · neu nachher `{"type":1,"token":"probe4"}` ohne `properties` · alt nachher `{"type":2}` — **exakt die Zahlen des Planers Paket 7** |
| 5 | zwei lokale Environments, `ns`-Wechsel eines Entity **ohne Kinder**, `sync()` instrumentiert | `["b"]` — der alte Kanal bekommt keinen Sync; Entity in beiden Kerneln vorhanden |
| 6 | zwei lokale Environments mit `auto-sync="frame"`, Entity mit Property wechselt den `ns`, gelesen wird der echte Kernel | vorher alt `{"props":[["x",7]]}` · nachher alt `null`, neu `{"props":[]}` — **die Property kommt im neuen Environment nicht an** |
| 7 | `ViewComponent.removeProperty()` direkt, gegen einen frischen Context | nach dem Flush `[{"type":5,"properties":[["x",undefined]]}]` · für eine nie geflushte Property `[]` — dieselbe Form, die ein geleertes `value`-Attribut erzeugt |
| 8 | `<shae-prop>` behält seinen Namen, `value`-Attribut entfernt | `[{"type":5,"properties":[["x",undefined]]}]` — der Vergleichsfall zu Sonde 1 |
| e2e | `pnpm exec playwright test dynamic-dom --project=chromium --reporter=json` | `dynamic-dom-removed-prop-is-gone` — `expectedStatus: "failed"`, `status: "failed"`, Meldung `expect(received).toBe(expected) — Expected: "ok" Received: "fail"` |

**Die offene Frage: Was räumt eine entfernte `shae-prop` auf? — Nichts. Der dritte Ausgang trifft
nicht zu, der zweite schon, und der Test ist nicht das Problem, sondern das Protokoll.**

Der Text der offenen Frage hat zwei Beobachtungen richtig und die dritte falsch. Richtig ist: Das
Entfernen erzeugt keinen Change Trail (Sonde 1), und `removeProperty()` wird von keinem Element
aufgerufen — das ist im Repo verifizierbar, die einzigen Aufrufer sind vier Testdateien. Falsch ist
»und trotzdem ist der E2E-Test `dynamic-dom-removed-prop-is-gone` grün«. Der Test ist rot. Er steht
in `tests/dynamic-dom.spec.ts:50` in `knownFailures`, `runPageTests` (`:85-87`) setzt für solche IDs
`test.fail()`, und Playwright zählt einen erwarteten Fehlschlag in der Zusammenfassung als
»passed«, weil der Lauf seine Erwartung erfüllt hat. Der JSON-Reporter nennt beide Zustände
getrennt: `expectedStatus: "failed"`, `status: "failed"`. Grün ist die Suite, nicht der Fall.

Damit ist die Frage beantwortet, ohne dass ein Mechanismus zu finden wäre — es gibt keinen. Die
Lücke dahinter ist ein Defekt, und das Projekt weiß das an drei Stellen: `KNOWN-DEFECTS.md`
führt ihn als `DEFECT-2` samt Fix-Richtung, `Backlog.md:298` als `ELEM-2`, und `TEST-PLAN.md:220`
verlangt unter `DOM-6` ausdrücklich »removing it removes the property«. Das Audit hat einen
dokumentierten Defekt als ungeklärtes Verhalten gelesen, weil die Suite grün ist.

Die Sonden 2 und 3 zeigen, dass die Lücke breiter ist als das Entfernen. Es gibt genau drei Wege,
auf denen eine Bindung `(ViewComponent, name)` endet, und keiner davon räumt heute auf:

| Weg | heute | nach diesem Paket |
|---|---|---|
| Das Element verlässt den Baum | Property bleibt (Sonde 1) | Entfernung im Trail |
| Das `name`-Attribut ändert sich | alter Name bleibt zusätzlich stehen (Sonde 2) | alter Name wird entfernt, neuer gesetzt |
| Das Element wechselt seine Host-Entity | alte Entity behält die Property (Sonde 3) | alte Entity verliert sie, neue bekommt sie |

Das ist keine Aufzählung nach Gefühl: alle drei enden im selben Signalpaar `viewComponent$` /
`name$`, und genau darauf setzt der Fix an. Ein vierter Weg — die Host-Entity wechselt ihren
Namespace — endet *nicht* in diesem Paar, weil dieselbe `ViewComponent` weiterlebt; das ist Fund B
und wird eine Ebene tiefer behoben.

**Der Test, der den Mechanismus festnagelt statt seines Ergebnisses.** `dynamic-dom-removed-prop-is-gone`
prüft `find(snap,'dyn-1')?.extra == null` — das Ergebnis. Derselbe Wert käme heraus, wenn die
Entity insgesamt verschwände oder wenn die Property nie angekommen wäre. Der Fall, der den
Mechanismus hält, ist `removing the element writes the removal into the change trail` in
`prop-element-lifecycle.test.js`: Er liest den Change Trail selbst und verlangt genau einen
Eintrag `{type: 5, uuid, properties: [['x', undefined]]}` — also die Form, die `removeProperty()`
erzeugt (Sonde 7), an derselben uuid, ohne begleitendes `{type: 2}`. Er ist damit falsifizierbar
durch jede Reparatur, die das Ergebnis auf einem anderen Weg herstellt. Sein Gegenstück ist der
Wächter `an entity that leaves the tree writes no property change` — er verlangt, dass beim
Entfernen der ganzen Entity **kein** `{type: 5}` vor dem `{type: 2}` steht: ein Fix, der
pauschal bei jedem `disconnectedCallback` aufräumt, macht diesen Fall rot.

**Wird `removeProperty()` künftig aufgerufen — und wie?** Ja, von genau einer Stelle: dem Cleanup
des neuen Bindungs-Effects in `ShaePropElement` (Schritt 9). Der Effect liest `viewComponent$` und
`name$` — und ausdrücklich **nicht** `valueOut$` —, und seine Aufräumfunktion ruft
`vc.removeProperty(name)` für genau die Bindung, die endet. Damit sind die drei Wege aus der
Tabelle ein einziger Codepfad, und die Frage »hat der Autor an das Umbenennen gedacht« stellt sich
nicht mehr. Der Aufruf ist ungefährlich, wo er ins Leere geht: ist die `ViewComponent` bereits
zerstört, ist `removeProperty` ein No-op (`ViewComponent.ts:219-221` mit `#context?.`), und war die
Property nie in einem Trail, schreibt `ComponentChanges.removeProperty` nichts (Sonde 7, zweite
Hälfte). Beides ist der Grund, warum der Wächter oben grün bleibt.

Zwei Eigenschaften der bestehenden Bauform bleiben erhalten und sind der Grund für die Wahl des
Effect-Cleanups statt eines Aufrufs im `disconnectedCallback`:

1. Die Microtask-Verzögerung in `#disconnectFromEntNode` (`:378-384`) bleibt unangetastet. Sie
   unterscheidet ein Verschieben innerhalb eines Ticks von einem echten Entfernen, indem sie
   `isConnected` erst im Microtask liest. Der Cleanup hängt an `entNode$`/`viewComponent$` und
   läuft deshalb erst, wenn diese Verzögerung entschieden hat.
2. Beim Verschieben innerhalb eines Ticks läuft `connectedCallback` synchron vor dem Microtask,
   setzt `entNode$` auf die neue Host-Entity, und der Cleanup räumt die Property auf der alten ab,
   bevor der Effect sie auf der neuen setzt. Genau das ist `DOM-7`.

**Fund B: wo der Fix sitzt.** Die Einschätzung des Planers Paket 7 trifft zu, in der Richtung und
in der Fundstelle. Zwei Dinge sind zu ergänzen, die die Wahl zwischen seinen beiden Varianten
entscheiden:

Der Property-Zustand liegt nirgends an der `ViewComponent`. Er liegt in der `ComponentChanges` des
Contexts, aufgeteilt in `#properties` (zuletzt in einen Trail geschrieben) und `#nextProperties`
(seither aufgelaufen) — `ComponentChanges.ts:124-126`. »Reist der Zustand am `ViewComponent` mit«
hieße also: eine dritte Kopie derselben Wahrheit anlegen und mit `setProperty` synchron halten.
Das ist die teurere Variante und die einzige, die neue Zustandsduplikate schafft.

Die andere Variante ist billig, weil der `context`-Setter **beide** Contexts kennt: den alten in
`#context`, den neuen im Parameter. Der alte Eintrag überlebt das `destroy()` — `destroyComponent`
markiert nur die `ComponentChanges` (`ComponentContext.ts:158-167`), gelöscht wird der Eintrag erst
beim nächsten `buildChangeTrails()`. Der Zustand ist also noch abfragbar, wenn der Beitritt zum
neuen Context bereits erfolgt ist. `reCreateChanges()` (`:425-452`) ist das Muster für das
Wiedereinspielen, aber nicht die Quelle: es liest die `ComponentMemory` desselben Contexts, und die
kennt nur den Stand des letzten Trails — alles, was seither über `setProperty` kam, fehlte. Die
Quelle muss `#properties` überlagert mit `#nextProperties` sein.

Daraus folgt der Weg: eine Lesefunktion auf `ComponentChanges`, eine Transferfunktion auf
`ComponentContext` in der Bauform der vorhandenen `ComponentChanges.transferEventsTo()`, und vier
Zeilen im `context`-Setter. Das Element bleibt unangetastet, `ViewComponent.setProperty()` als
öffentlicher zweiter Schreiber ist mitversorgt.

**Was dazugehört und was nicht.** Der Nebenbefund aus Paket 7 — nach einem `ns`-Wechsel ohne Kinder
bekommt das alte Environment keinen Sync — kommt hier mit hinein, aus drei Gründen. Erstens ist er
gemessen (Sonde 5) und liegt in denselben zwei Dutzend Zeilen, die den Wechsel ausführen. Zweitens
hängt der Nachweis dieses Pakets an ihm: der neue e2e-Fall und der neue Integrationsfall prüfen,
was im *neuen* Environment ankommt, und die Gegenprobe — im alten ist die Entity fort — ist ohne
den Sync nur mit `auto-sync="frame"` und Warten zu haben statt deterministisch. Drittens kostet er
zwei Zeilen und benutzt ein Muster, das sechzig Zeilen tiefer schon steht (`ShaeEntElement.ts:156-165`,
`ShadowEnv.get(oldNs)?.sync()` im Cleanup des `viewComponent$`-Effects — der bei einem reinen
`ns`-Wechsel gerade nicht läuft, weil die `ViewComponent` dieselbe bleibt).

Nicht dazu gehören drei Dinge, die in der Nähe liegen:

- **Ein Kontextwechsel nach `undefined` und zurück** (Ab- und Wiedereinhängen eines `<shae-ent>`)
  nimmt keine Properties mit, auch nach diesem Paket nicht. Der Transfer läuft nur, wenn alter und
  neuer Context beide vorhanden sind. Grund: beim Wiedereinhängen schreiben die `<shae-prop>`-Kinder
  ihre Werte über den regulären Effect ohnehin neu, und der Fall »eine Entity liegt ohne Context
  herum und hält Properties« wäre ein neuer Zustand mit eigener Lebensdauerfrage. Ein Wächter hält
  die Grenze fest.
- **Ausstehende Events** wandern beim `ns`-Wechsel nicht mit. `ComponentChanges.buildChangeTrail`
  gibt sie in der Phase `ContentUpdates` noch aus, bevor die Zerstörung in der Phase `Removal`
  folgt — sie erreichen also das Entity, an das sie adressiert waren, im Environment, in dem es
  noch lebt. Das ist verteidigbar und bleibt so; ein Satz in der `api-reference.md` sagt es.
- **`propIsEqual` beim Entfernen einer Property** bleibt im `ComponentContext` stehen
  (`ComponentContext.ts:250-266`). Das ist Absicht und keine Lücke: die Vergleichsfunktion ist eine
  Regel für den Schlüssel, nicht für den Wert. Der Transfer nimmt sie deshalb mit.

**Ist das eine Produktentscheidung?** Nein, und sie ist bereits getroffen. `TEST-PLAN.md:200`
fordert unter `MULTI-8` »properties survive the move«, und der Nutzer hat Fund B am 2026-08-16 als
Defekt in dieses Paket verwiesen (»Entscheidungen«). Der Wechsel ist kein Neuanfang: Token,
Elternteil, Order und `autoDestructionOnParentRemoval` reisen heute schon mit
(`ComponentContext.ts:129-134`) — die Properties sind der einzige Teil des Zustands, der
zurückbleibt. Es wird keine Frage vorgelegt.

**Das Netz.** Kein bestehender Testfall ändert sein Ergebnis, mit genau einer beabsichtigten
Ausnahme:

- Die 19 Struktur-Assertions auf `shae-worker.html` (Paket 2) und die 9 auf `upgrade-timing`
  (Paket 6) werden nicht angefasst. Keine der beiden Seiten entfernt, benennt oder verschiebt ein
  `<shae-prop>`, und keine wechselt einen Namespace.
- Die 5 Struktur-Assertions auf `multi-env` (Paket 7, `multi-env-ns-switch-*`) bleiben unverändert
  und bekommen einen sechsten Nachbarn. Die Beziehung, die Paket 7 bewusst hergestellt hat, bleibt
  bestehen: die beiden Entities `switch-outer` und `switch-me` führen ihre eigene Aufzeichnung und
  gehen **nicht** in `ENT_IDS` (`src/multi-env.js:14`). Der neue Fall liest dieselbe Aufzeichnung
  (`switchRecords['switch-me'].created[1].envName`) und legt keine neue an.
- **Die eine beabsichtigte Änderung einer Beziehung:** `dynamic-dom-removed-prop-is-gone` hört auf,
  ein erwarteter Fehlschlag zu sein. Damit fällt der letzte Eintrag von `knownFailures` auf dieser
  Seite weg, `DEFECT-2` verlässt `KNOWN-DEFECTS.md`, `ELEM-2` verlässt `Backlog.md`. Der
  `knownFailures`-Mechanismus selbst bleibt in `runPageTests.ts` und behält mit
  `create-element.spec.ts:18` (`DEFECT-1`) einen Benutzer — er wird nicht mit ausgebaut.
- `prop-element-types.test.js` (Paket 3/5, 8 `describe`-Blöcke) bleibt unangetastet. Sein achter
  Block prüft Change Trails bei *geändertem* Wert, nicht bei entferntem Element; die Wertesemantik
  aus Paket 5 wird von diesem Paket nicht berührt — `removeProperty()` und
  `setProperty(name, undefined)` erzeugen denselben Wire-Eintrag (Sonden 7 und 8).
- `ViewComponent.spec.ts:167-187` (`should disconnect from context`) fährt genau den Weg, den
  Schritt 8 ändert, prüft aber nur Eltern- und Kindbeziehungen und setzt keine Property. Bleibt
  grün, wird nicht angefasst.
- `dynamic-dom-flicker-*` (4 Fälle) hängt am Entfernen und Wiedereinhängen einer ganzen Entity
  innerhalb eines Microtasks. Beide neuen Mechanismen halten sich davon fern: der Cleanup läuft nur,
  wenn die Verzögerung in `#disconnectFromEntNode` sich für »wirklich weg« entschieden hat, und der
  Transfer läuft nur zwischen zwei vorhandenen Contexts.

**Was das kostet.** Der Transfer ist O(P) für die P Properties genau einer Komponente und läuft
einmal pro Kontextwechsel, also einmal pro Attributschreibung. Der Cleanup im Element ist O(1) und
läuft einmal pro endender Bindung. Keiner der beiden hat einen Kandidatensatz, über den er
iteriert, und keiner hängt an der Dokumentgröße — der quadratische Effekt, den Paket 6 zweimal
nachbessern musste, entstand aus der Zahl der Auslöser mal der Zahl der Kandidaten; hier ist beides
konstant. Der Umfang: rund 55 Zeilen Produktionscode über fünf Dateien, rund 260 Zeilen Test über
fünf Dateien, dazu Dokumentation. Ein Prototyp ist in Zug 0 nicht gebaut worden; der Weg ist an den
Sonden 1 bis 8 abgeleitet, nicht gemessen — das ist der Punkt, an dem dieses Paket weniger
Vorleistung mitbringt als Paket 7, und Zug 1 beginnt deshalb mit den roten Tests, nicht mit einer
Zeile Code.

- Dateien:
  - `packages/shadow-objects-testing/test/prop-element-lifecycle.test.js` (neu, Schritt 1)
  - `packages/shadow-objects-testing/test/view-component-context-switch.test.js` (neu, Schritt 2)
  - `packages/shadow-objects-testing/test/ent-element-namespace.test.js` (Schritt 3)
  - `packages/shadow-objects-e2e/src/dynamic-dom.js`, `tests/dynamic-dom.spec.ts` (Schritt 4)
  - `packages/shadow-objects-e2e/src/multi-env.js`, `tests/multi-env.spec.ts` (Schritt 5)
  - `packages/shadow-objects/src/view/ComponentChanges.ts` (Schritt 6)
  - `packages/shadow-objects/src/view/ComponentContext.ts` (Schritt 7)
  - `packages/shadow-objects/src/view/ViewComponent.ts` (Schritt 8)
  - `packages/shadow-objects/src/elements/ShaePropElement.ts` (Schritt 9)
  - `packages/shadow-objects/src/elements/ShaeElement.ts`, `src/elements/ShaeEntElement.ts` (Schritt 10)
  - `packages/shadow-objects/docs/api-reference.md`, `docs/cheat-sheet.md`, `packages/shadow-objects/CHANGELOG.md`, `CHANGELOG.md`, `packages/shadow-objects-e2e/KNOWN-DEFECTS.md`, `packages/shadow-objects-e2e/TEST-PLAN.md`, `Backlog.md` (Schritt 11)

- Vorgehen:
  1. **Zuerst die roten Tests.** Neue Datei
     `packages/shadow-objects-testing/test/prop-element-lifecycle.test.js`, im Zuschnitt von
     `ent-element-namespace.test.js`: `mount`/`unmountAll` aus `../src/mount.js`, eigene Namespaces
     und eigene IDs je Fall, `nextTask()`-Helfer für die Microtask-Verzögerung, ein Kopfkommentar,
     der sagt, warum die Datei echtes Chromium braucht (Custom-Element-Reaktionen in ihrer
     spezifizierten Reihenfolge, `disconnectedCallback` vor dem Microtask-Checkpoint). Acht Fälle:

     | # | Name | erwartete Meldung im roten Zustand |
     |---|---|---|
     | 1 | `removing the element writes the removal into the change trail` | `expected [] to have a length of 1 but got 0` |
     | 2 | `the property is gone from the state the change trail left behind` | `expected [ [ 'x', 7 ] ] to deeply equal undefined` (nach `reCreateChanges()`) |
     | 3 | `the shadow object loses the property` (lokales Environment, `kernel.getEntity(uuid).propEntries()`) | `expected [ [ 'x', 7 ] ] to deeply equal []` |
     | 4 | `renaming the element takes the old property with it` | `expected [ [ 'y', 7 ] ] to deeply equal [ [ 'x', undefined ], [ 'y', 7 ] ]` |
     | 5 | `moving the element to another entity clears the property on the entity it left` | `expected [ [ 'x', 7 ] ] to deeply equal undefined` (Trail des alten Entity) |
     | W1 | `a move within one tick keeps the property on the entity it arrives at` | Wächter, vor und nach dem Fix grün |
     | W2 | `an entity that leaves the tree writes no property change` | Wächter, grün — muss rot werden, wenn jemand pauschal im `disconnectedCallback` aufräumt |
     | W3 | `an element that never set a property removes nothing` (`<shae-prop>` ohne `name`) | Wächter, grün |

     Fall 3 ist der einzige, der ein `<shae-worker local auto-sync="off">` aufbaut; die anderen
     lesen `ComponentContext.get(ns).buildChangeTrails()` direkt. Der Grund gehört als Kommentar in
     die Datei: der Change Trail ist die Schnittstelle, an der sich der Mechanismus zeigt, der
     Kernel die Stelle, an der sich sein Ergebnis zeigt — beides wird gebraucht, aber nur einmal.
  2. Neue Datei `packages/shadow-objects-testing/test/view-component-context-switch.test.js`,
     ohne DOM, nur `ViewComponent` und `ComponentContext`. Jeder Fall baut seine beiden Contexts
     unter eigenen Namespacenamen und ruft am Ende `dispose()` auf beiden — die Datei darf nicht in
     dieselbe Falle laufen wie `ComponentContext.test.js`, das einen Context über alle Fälle teilt.
     Fünf Fälle:

     | # | Name | erwartete Meldung im roten Zustand |
     |---|---|---|
     | 6 | `a property survives the move into another context` | `expected undefined to deeply equal [ [ 'x', 7 ] ]` |
     | 7 | `a property that was never written to a trail survives too` (kein `buildChangeTrails()` vor dem Wechsel) | dieselbe Meldung |
     | 8 | `the equality function moves with the property` (`setProperty(key, wert, isEqual)`, danach im neuen Context derselbe Wert → Rückgabe `false`) | `expected true to be false` |
     | W4 | `the old context still reports the destroy` | Wächter, grün |
     | W5 | `a component that leaves its context without joining another carries nothing back` | Wächter, grün — hält die Grenze aus »Was dazugehört und was nicht« |
  3. In `packages/shadow-objects-testing/test/ent-element-namespace.test.js` einen neuen
     `describe`-Block `namespace change and properties` anhängen, ohne einen bestehenden Fall
     anzufassen. Zwei Fälle:

     | # | Name | erwartete Meldung im roten Zustand |
     |---|---|---|
     | 9 | `a shae-prop value arrives in the new namespace` | `expected undefined to deeply equal [ [ 'x', 7 ] ]` |
     | 10 | `the environment of the namespace it leaves is told to sync` | `expected [ 'b' ] to have the same members as [ 'a', 'b' ]` |

     Fall 10 instrumentiert `shadowEnv.sync` beider `<shae-worker local auto-sync="off">` und
     sammelt die Aufrufe; die Reihenfolge wird nicht behauptet, weil der Sammel-Microtask aus
     `ShaeElement.ts:16-28` beide Namespaces in einem Durchgang abarbeitet. Das Entity in diesem
     Fall hat **keine** Kinder — genau das ist die Bedingung des Nebenbefunds.
  4. e2e, `dynamic-dom`. In `packages/shadow-objects-e2e/src/dynamic-dom.js` hinter dem Block
     `DOM-6` einen Block `DOM-7` ergänzen: ein zweites `<shae-ent>` als Ziel besorgen (es gibt mit
     `host-b` bereits eines), ein `<shae-prop name="moved" value="here">` per
     `insertAdjacentHTML` an `dyn-1` hängen, syncen, dann in *einem* Tick per `append` an die
     zweite Entity verschieben. Drei neue IDs, in dieser Reihenfolge in
     `tests/dynamic-dom.spec.ts` eintragen:
     `dynamic-dom-moved-prop-syncs`, `dynamic-dom-moved-prop-left-the-old-entity`,
     `dynamic-dom-moved-prop-arrived-at-the-new-entity`. Die mittlere ist im roten Zustand rot
     (`expected "ok", received "fail"`), die beiden anderen grün. Der Block gehört **vor** den
     `DOM-4`-Block, weil `dyn-1` dort entfernt wird. Im selben Zug in `tests/dynamic-dom.spec.ts`
     die Option `knownFailures` samt ihres Kommentars (`:47-50`) ersatzlos streichen — danach ist
     `dynamic-dom-removed-prop-is-gone` ein gewöhnlicher Fall und im roten Zustand rot.
  5. e2e, `multi-env`. In `packages/shadow-objects-e2e/src/multi-env.js` nach
     `multi-env-ns-switch-joined-the-new-env` einen Fall
     `multi-env-ns-switch-kept-its-properties` ergänzen:
     `switchRecords['switch-me'].created[1].envName === 'switch-me'`. Die Aufzeichnung existiert
     bereits (`:86-94`), die Property steht bereits im Markup (`pages/multi-env.html:65`), das
     Fixture meldet `envName` in `probeCreated` — es kommt kein Setup dazu, nur eine Zeile
     Assertion und eine ID in `tests/multi-env.spec.ts` hinter `:41`. Der Kommentarblock über dem
     `MULTI-8`-Abschnitt (`src/multi-env.js:254-260`), der heute erklärt, warum der
     Property-Inhalt *nicht* behauptet wird, wird entsprechend umgeschrieben statt gelöscht.
     Im roten Zustand: `expected "ok", received "fail"` — `envName` ist `undefined`.
  6. In `packages/shadow-objects/src/view/ComponentChanges.ts`, unmittelbar nach `removeProperty`
     (`:147-158`), die Methode `getProperties(): Map<string, unknown>` anlegen: eine Kopie von
     `#properties`, überlagert mit `#nextProperties` entlang `#propsChangeOrder` — ein Schlüssel mit
     dem Wert `undefined` und ein Schlüssel, der in `#propsChangeOrder`, aber nicht in
     `#nextProperties` steht, sind beide Entfernungen und fallen aus dem Ergebnis. Doc-Kommentar in
     zwei Sätzen: was die Methode liefert (den Stand *jetzt*, nicht den des letzten Trails) und
     warum die Überlagerung nötig ist (`#properties` wird erst beim Bauen eines Trails
     fortgeschrieben, `ComponentChanges.ts:253-258` und `:314-330`).
  7. In `packages/shadow-objects/src/view/ComponentContext.ts`, unmittelbar nach `removeProperty`
     (`:264-266`), die Methode `transferPropertiesTo(component: ViewComponent, target: ComponentContext)`
     anlegen: den eigenen `ViewInstance` zu `component.uuid` holen, aus `vi.changes.getProperties()`
     jeden Eintrag über `target.setProperty(component, key, value, vi.propIsEqual?.get(key))`
     weiterreichen, bei fehlendem Eintrag nichts tun. Doc-Kommentar in der Bauform von
     `ComponentChanges.transferEventsTo()`, auf die er auch verweist: Er nennt den einen Aufrufer
     (den `context`-Setter), sagt, dass der Zustand bis zum nächsten `buildChangeTrails()` noch
     abfragbar ist, obwohl `destroy()` bereits gelaufen ist, und dass die Vergleichsfunktion
     mitreist, weil sie eine Regel für den Schlüssel ist und nicht für den Wert.
  8. In `packages/shadow-objects/src/view/ViewComponent.ts` den `context`-Setter (`:73-98`) um vier
     Zeilen ergänzen: `const previousContext = this.#context;` vor dem `if (this.#context)`-Block,
     und nach dem `try`/`catch` um `next?.addComponent(this)`
     `if (next != null && previousContext != null) previousContext.transferPropertiesTo(this, next);`.
     Die Reihenfolge ist der Kern und gehört als Kommentar an die Stelle: der Transfer läuft
     **nach** dem Beitritt, weil `addComponent` die neue `ComponentChanges` erst anlegt, und die
     Properties landen dadurch in derselben `CreateEntities`-Änderung wie Token und Elternteil
     statt in einer eigenen. Der zweite Satz des Kommentars nennt die Grenze: ein Wechsel nach
     `undefined` trägt nichts mit, weil es keinen Empfänger gibt. Der `catch`-Zweig bleibt, wie er
     ist — ein gescheiterter Beitritt kommt gar nicht bis zum Transfer.
  9. In `packages/shadow-objects/src/elements/ShaePropElement.ts` einen zweiten Effect ergänzen,
     **vor** dem vorhandenen Werte-Effect (`:136-157`). Er liest `viewComponent$` und `name$`, sonst
     nichts, merkt sich den `entNode` über den ungetrackten Zugriff `this.entNode$.value` und gibt
     eine Aufräumfunktion zurück, die `vc.removeProperty(name)` und danach
     `entNode?.syncShadowObjects()` aufruft. Drei Dinge gehören als Kommentar dazu:
     - Warum der Effect `valueOut$` **nicht** liest: sonst liefe bei jeder Wertänderung ein
       Entfernen gegen ein Setzen desselben Schlüssels.
     - Warum er vor dem Werte-Effect steht: Effects laufen in ihrer Erzeugungsreihenfolge, und beim
       Umbenennen muss das Entfernen des alten Namens vor dem Setzen des neuen in den Trail.
     - Warum der Sync ohne `isConnected`-Wächter läuft, anders als im Werte-Effect: die Entfernung
       ist genau der Fall, in dem das Element nicht mehr verbunden ist.
 10. Der alte Namespace bekommt seinen Sync. In
     `packages/shadow-objects/src/elements/ShaeElement.ts` die vorhandene modulweite Funktion
     `syncShadowObjects(ns)` (`:16-28`) über eine zweite Instanzmethode zugänglich machen:
     `protected syncShadowObjectsOf(ns: NamespaceType) { syncShadowObjects(ns); }`, direkt neben
     `syncShadowObjects()` (`:71-73`). Dann in
     `packages/shadow-objects/src/elements/ShaeEntElement.ts` im `ns$.onChange`-Handler (`:94-120`)
     den alten Namespace vor dem Contextwechsel festhalten (`const previousNs = previousContext?.ns;`
     — `previousContext` steht dort bereits, `:102`) und am Ende des Handlers
     `if (previousNs != null && previousNs !== ns) this.syncShadowObjectsOf(previousNs);`
     ergänzen. Ein Satz Kommentar: `syncShadowObjects()` ohne Argument liest `this.ns`, und das
     trägt in diesem Handler bereits den neuen Wert — das Zerstören im alten Environment bliebe
     sonst liegen, bis dort etwas anderes einen Sync auslöst. Der Aufruf ist billig, weil die
     modulweite Funktion die Namespaces in einem `Set` sammelt und in einem Microtask abarbeitet.
 11. Dokumentation und Buchführung, in dieser Reihenfolge:
     - `packages/shadow-objects/docs/api-reference.md`, §`<shae-prop>`: hinter `#### Invalid Values`
       einen Abschnitt `#### Lifecycle` mit den drei Wegen aus der Tabelle oben — das Element
       verlässt den Baum, das `name` ändert sich, die Host-Entity wechselt — und dem Satz, dass ein
       Entfernen und Wiedereinhängen innerhalb desselben Ticks kein Entfernen ist. Formuliert für
       jemanden, der den Vorzustand nie gesehen hat.
     - `api-reference.md`, §`<shae-ent>`, der Absatz »A change of `ns` at runtime takes the entity
       along into the other environment« (`:1201-1204`): ein Satz, dass die Properties mitwandern,
       und einer, dass bereits abgeschickte Events es nicht tun und im bisherigen Environment
       zugestellt werden.
     - `docs/cheat-sheet.md`, §`<shae-prop>` (`:230`): zwei Zeilen für den Lebenszyklus.
       `README.md` und `docs/guides.md` prüfen — beide zeigen `<shae-prop>` nur im Beispiel und
       treffen keine Aussage über sein Entfernen; bleiben sie unangetastet, wird die Prüfung in der
       Verlaufszeile festgehalten.
     - `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`: zwei Einträge unter
       `**Fixed (elements):**` bzw. `**Fixed (view components):**` — das Entfernen, Umbenennen und
       Verschieben eines `<shae-prop>` räumt die Property ab; ein Namespace-Wechsel nimmt die
       Properties mit. Dazu die neue Methode `ComponentContext.transferPropertiesTo()` und der Sync
       des verlassenen Namespace. Den Zähler im `[Unreleased]`-Kopf fortschreiben.
     - `CHANGELOG.md` im Repo-Wurzelverzeichnis, Abschnitt zum 2026-08-16: ein Stichpunkt über die
       neue Abdeckung (zwei Spec-Dateien im Integrationspaket, `DOM-7` und der Property-Fall von
       `MULTI-8` in der e2e-Suite) und einer darüber, dass `dynamic-dom.spec.ts` keine
       `knownFailures` mehr führt.
     - `packages/shadow-objects-e2e/KNOWN-DEFECTS.md`: den Abschnitt `DEFECT-2` samt seinem
       Trenner ersatzlos entfernen. Der Einleitungssatz der Datei spricht von »Both reproduce
       identically in Chromium and Firefox« — er wird auf den verbleibenden Defekt umgestellt.
     - `packages/shadow-objects-e2e/TEST-PLAN.md`: genau zwei Zeilen. `MULTI-8` (§3.1, `:200`)
       verliert seinen Nachsatz »**Still open:** properties do not survive the move« und bekommt
       die neue ID genannt. `DOM-6` und `DOM-7` (§3.2, `:220-221`) werden als umgesetzt markiert,
       mit ihren IDs. §1, §1.2, §2.2 und H-4 bleiben liegen — sie gehören Paket 12.
     - `Backlog.md`: `ELEM-2` (`:298`) streichen, weil behoben. `VIEW-5` (`:203`) bleibt stehen —
       es beschreibt die Host-Auflösung, nicht den Property-Lebenszyklus, und gehört Paket 9.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`.
  Erwartung: `test:ci` 575 statt 560, davon `shadow-objects-testing` 280 statt 265 in 20 statt 18
  Dateien — 8 Fälle in `prop-element-lifecycle.test.js`, 5 in `view-component-context-switch.test.js`,
  2 in `ent-element-namespace.test.js`. `@spearwolf/shadow-objects` bleibt bei 294 und
  `shae-offscreen-canvas` bei 1; verschiebt sich dort etwas, ist eine Änderung an
  `ComponentChanges` oder `ViewComponent` weiter gegangen als geplant. e2e 398 statt 390 (4 neue
  IDs × 2 Browser). Weicht die e2e-Zahl nach unten ab, fehlt eine ID im Spec-Array. Kein
  »Errors«-Block; `dynamic-dom` und `multi-env` behalten ihren Fall `no uncaught or logged errors`.
  Danach einmal `pnpm -F shadow-objects-testing test -- --sequence.shuffle`, weil zwei neue
  Spec-Dateien dazukommen, die Namespaces und Environments anlegen. Zur Gegenprobe des roten
  Zustands eignet sich `pnpm -F shadow-objects-e2e exec playwright test dynamic-dom --project=chromium --reporter=json`:
  vor dem Fix muss `dynamic-dom-removed-prop-is-gone` dort mit `status: "failed"` und
  `expectedStatus: "passed"` stehen.
- Commit: `fix(elements): end a property binding when its element does (DEFECT-2, ELEM-2, MULTI-8)`
- Verlauf:
  - Zug 0 (2026-08-16, Planer): Beide Sachverhalte in echtem Chromium reproduziert, acht Sonden
    plus ein e2e-Lauf mit dem JSON-Reporter. Die offene Frage des Audits ist beantwortet und ihre
    Prämisse widerlegt: `dynamic-dom-removed-prop-is-gone` ist **nicht** grün, sondern steht in
    `knownFailures` und läuft als erwarteter Fehlschlag — `expectedStatus: "failed"`,
    `status: "failed"`. Es gibt keinen Mechanismus; nichts räumt eine entfernte `shae-prop` auf,
    und die Lücke ist ein an drei Stellen dokumentierter Defekt (`DEFECT-2`, `ELEM-2`, `DOM-6`).
    Zwei Wege über den Defekttext hinaus gemessen: das Umbenennen lässt den alten Namen stehen, das
    Verschieben lässt die Property auf beiden Entities stehen — alle drei enden im selben
    Signalpaar und werden von einem Codepfad geschlossen. Fund B mit den Zahlen des Planers Paket 7
    exakt reproduziert und zusätzlich am echten Kernel (`props: []` im neuen Environment). Die
    Einschätzung des Planers Paket 7 zur Fundstelle trifft zu; von seinen beiden Varianten ist die
    zweite gewählt, weil der Property-Zustand nirgends an der `ViewComponent` liegt und die erste
    eine dritte Kopie derselben Wahrheit anlegen würde. Der Nebenbefund aus Paket 7 (alter
    Namespace ohne Sync) ist gemessen (`["b"]`) und in dieses Paket geholt, mit Begründung. Kein
    Prototyp gebaut — Zug 1 beginnt mit den dreizehn roten Fällen — zehn im Integrationspaket, drei in der e2e-Suite, dazu fünf Wächter. Baseline auf sauberem Baum
    bestätigt: lint rc=0, `test:ci` 560, e2e 390. Arbeitsbaum sauber.

</details>

### [x] 9a. Eine Vorfahrensuche für beide Elemente

- Hash: `cef67ac`
- Statusmarke und Messwerte nachgetragen 2026-08-16 vom Planer 9b beim Abgleich — das Paket ist committet, die Zeile stand noch auf offen. Nachgemessen auf sauberem Baum: lint rc=0, `test:ci` 589 (`shadow-objects-testing` 294 in 20 Dateien), e2e 400. `prop-element-host.test.js` trägt jetzt 7 Fälle; die Datei hat gegenüber dem Detailplan zwei Fälle mehr bekommen (`lets go of its host when it moves to a place with no entity above it` und der Namespace-Wächter). Ein Ergebnisblock in der Form der Pakete 1 bis 8 fehlt; der Planer 9b trägt ihn nicht nach, weil er den Verlauf der Umsetzung nicht kennt.

- Findings: VIEW-002 (high) · TEST-004 (medium, zwei der vier Fälle) · dazu »Eine Traversierung statt zwei«
- Ziel: Ein `<shae-prop>` findet dieselbe Entity, die ein `<shae-ent>` an seiner Stelle fände — über Shadow-Grenzen, Slot-Projektionen und geschlossene Grenzen hinweg —, weil beide Elemente dieselbe Anfrage stellen.
- Bereich: `packages/shadow-objects/src/elements/requestEntAncestor.ts` (neu), `ShaePropElement.ts`, `ShaeEntElement.ts`, `events.ts`, `constants.ts`, `packages/shadow-objects-testing/test/prop-element-host.test.js`, `test/ent-element-namespace.test.js`, `packages/shadow-objects/docs/`, `CHANGELOG.md`
- Hängt ab von: Paket 2, Paket 6
- Modell: stärkste Stufe
- Warum der Schnitt bei 9a/9b liegt (2026-08-16, Planer Paket 9): 9a tauscht die **Suche** aus und ist danach vollständig verifizierbar — die Zahl der e2e-Fälle bleibt gleich, jede bestehende Beziehung muss stehenbleiben. 9b legt den **Nachjustierungs-Kanal** darüber und ist rein additiv. Der hostlose Fall gehört zu 9b, nicht zu 9a: ohne den Kanal wäre jedes `<shae-prop>` unter einem spät registrierten Element vorübergehend hostlos und würde eine Meldung erzeugen, die 9b wieder einfangen müsste. Paketnummern werden nicht neu vergeben, 10 bis 14 bleiben, wie sie sind.

**Abgleich (2026-08-16, Zug 0 dieses Pakets).** Alle drei Findings bestehen. Die Zeilennummern des
Audits sind durch die Pakete 5 und 8 verschoben; die Fundstellen selbst stimmen zeichengenau.
VIEW-002 ist in seiner Wirkung **größer als beschrieben**: das Element findet nicht nur nichts, es
findet in zwei Aufbauten die **falsche** Entity.

| Finding | Zustand | Fundstelle heute | gemessen |
|---|---|---|---|
| VIEW-002 | unverändert, Wirkung größer | `ShaePropElement.ts:9-18` (`findEntNode`), `:447-449` (`#findEntNode`) — unverschoben | `PROBE-B {"entNode":null,"value":"42","vc":null}` · Gegenprobe `PROBE-C {"entParent":"outer-ent"}` · zusätzlich: bei Slot-Projektion bindet das Element an die **äußere** statt an die innere Entity (`SLOT-PRE {"entNodeToday":"spOuter"}`, richtig wäre `spInner`), an einer geschlossenen Grenze ebenso (`CLOSED-PROP {"entNodeToday":"cpOuter"}`, richtig wäre `cpInner`) |
| VIEW-003 | unverändert | `ShaePropElement.ts:413-421` (`connectedCallback`), `:447-449`, `shae-prop.ts:4` | `VIEW-003 {"before":null,"after":null,"hostIsEnt":true}` — eine `ShaeEntElement`-Subklasse wird definiert, das Element upgraded, das `<shae-prop>` darunter bleibt ohne Host |
| TEST-004 | unverändert | `packages/shadow-objects-testing/test/prop-element-host.test.js` — 2 Fälle, beide Light-DOM | keiner der vier geforderten Aufbauten kommt in den 20 Spec-Dateien des Integrationspakets vor |

**Reproduktion.** Vier Sondenläufe in echtem Chromium über die Browser-Konfiguration von
`shadow-objects-testing` gegen das gebaute `dist/`, danach entfernt; Arbeitsbaum sauber.

| Sonde | Aufbau | gemessen | Deutung |
|---|---|---|---|
| PROBE-B | `<shae-ent id=host-ent><div id=sd-host>` mit offenem Shadow Root, darin `<shae-prop name=inside value=42>` | `{"entNode":null,"value":"42","vc":null}` | der Beleg des Audits, zeichengenau |
| PROBE-C | dasselbe mit `<shae-ent>` an der Stelle des `<shae-prop>` | `{"entParent":"outer-ent"}` | die Asymmetrie ist echt |
| VIEW-003 | `<late-ent-9><shae-prop>`, `late-ent-9 extends ShaeEntElement`, nach dem Rendern definiert | `{"before":null,"after":null}` | die Suche läuft genau einmal |
| SLOT | `<div id=sh><shae-prop>`, danach offener Shadow Root mit `<shae-ent id=slot-ent><slot>` | `{"before":null,"after":null,"assignedSlot":true}` | Slot-Zuordnung allein löst nichts aus |
| NOHOST | `<shae-prop name=x value=1>` ohne jeden Vorfahren | `{"entNode":null,"errors":0,"warns":0}` | still, wie das Audit sagt |
| CLOSED-SLOT | `<div id=chost>` mit **geschlossenem** Shadow Root `<shae-ent id=cmid><slot>`, darin projiziert je ein `<shae-ent>` und ein `<shae-prop>` | `{"entBoundTo":"cmid","walkFromEnt":null,"walkHopsFromEnt":5,"assignedSlotOfEnt":null}` | **entscheidend**: das Event findet `cmid`, ein Aufstieg über den flattened Tree findet es nie — `assignedSlot` ist an einer geschlossenen Grenze `null` |
| SLOT-PRE | Shadow Root mit `<shae-ent id=spInner><slot>` steht **vor** dem Einfügen des `<shae-prop>` | `{"hitsAtOnce":["spInner","spOuter"],"assignedAtOnce":true,"entNodeToday":"spOuter"}` | die Slot-Zuordnung ist beim Einfügen synchron da; der Event-Pfad trifft zuerst `spInner`, der `parentElement`-Lauf bindet an `spOuter` — **falsche Entity, nicht bloß keine** |
| CLOSED-PROP | dasselbe mit geschlossenem Shadow Root | `{"innerSawTheRequest":true,"entNodeToday":"cpOuter"}` | dieselbe Fehlbindung, und sie ist über keinen Aufstieg reparierbar |
| STOP | ein `<div>` dazwischen ruft `stopPropagation()` auf `shaeRequestEntParent` | `{"boundBefore":"stopouter","boundWithShield":null,"walkWithShield":"stopouter2"}` | Event und Aufstieg sind **nicht** austauschbar |
| NS-EVENT | `<shae-ent id=nsA><shae-ent id=nsB ns=other><shae-ent id=nsC>` | `{"eventBinds":"nsA","walkAny":"nsB","walkSameNs":"nsA"}` | der `ns`-Filter überspringt, er blockiert nicht |
| ANSWER | ein `shaeRequestEntParent` mit fremdem `requester` | `{"reachedTop":true}` | heute antwortet kein `<shae-ent>` darauf — die Erweiterung ist additiv |
| SIGNAL | `signal.set(sameObject)` | `{"afterSame":0,"afterOther":1}` | eine gleichbleibende Antwort läuft ins Leere, ohne Effect |
| ORPHAN-DOC | composed, bubbelndes Event aus einem geschlossenen Shadow Root | `{"seen":1}` | ein Listener am `document` hört jede Anfrage, aus jedem Baum |
| TARGET-PHASE | Listener auf dem dispatchenden Element selbst | `{"onSelf":1,"onParent":2}` | die Zielphase feuert mit — ein Kind kann am Elternteil lauschen |
| DISCONNECTED-DISPATCH | bubbelndes Event von einem gerade entfernten Knoten | `{"onSelf":1,"onParent":0}` | nach dem Entfernen erreicht es genau die, die am Knoten selbst lauschen |

**Was daraus folgt.** Der Optimierungspunkt verlangt eine Traversierung statt zweier. Es gibt genau
eine, die alle Fälle sieht, und das ist **nicht** der Aufstieg über den flattened Tree, sondern der
Pfad eines `composed`-Events: `assignedSlot` ist an einer geschlossenen Grenze `null` (`CLOSED-SLOT`),
der Aufstieg steigt dort über den ganzen geschlossenen Baum hinweg, das Event läuft hindurch. Ein
`findEntNode` auf Basis des Aufstiegs wäre eine zweite, schwächere Semantik neben der von
`<shae-ent>` — genau das, was der Punkt abstellen will. Die gemeinsame Utility ist deshalb die
Anfrage, nicht der Lauf. `flattenedParentOf` / `isBelow` / `isInClosedShadowTree` bleiben, wo sie
sind (`ShaeEntElement.ts:14-39`): sie sind kein Suchlauf, sondern der Unterhalb-Test, mit dem Paket 6
den Kandidatensatz filtert, und sie bekommen keinen zweiten Aufrufer. Nach diesem Paket gibt es eine
Suche und einen Filter, keine dritte Sache daneben.

Umgekehrt gilt: **das Event lässt sich nicht durch den Aufstieg ersetzen**, ohne das Verhalten von
`ShaeEntElement` zu ändern. `STOP` zeigt eine Stelle, an der beide auseinanderlaufen — ein Listener
dazwischen kann die Anfrage abbrechen, ein Aufstieg ist nicht abbrechbar. Dazu kommt, dass die
antwortende Seite an `connectedCallback`/`disconnectedCallback` hängt und der ganze Re-Request-Apparat
der Pakete 6 und 7 darauf steht. Ein Umbau in diese Richtung berührte `#setParent`,
`#onRequestParent`, `#reRequestParent`, `#reRequestParentAsRoot`, `#onSlotChange`, `#onReRequestParent`
und die drei `ComponentContext.dispatchReRequestParent*`-Kanäle — mehr als ein weiteres Paket, und
damit außerhalb der Grenzen dieses Laufs. Er findet nicht statt.

**Triage der offenen Nebenbefunde und Folgen aus den Paketen 1 bis 8 (2026-08-16, Planer Paket 9).**
Ein Eintrag war diesem Paket zugewiesen und wird zurückgegeben; alle anderen bleiben, wo sie stehen.

- **`dispatchReRequestParentRoots` kennt keinen Absender** (`ComponentContext.ts:365-371`) — vorbestehend, vom Reviewer Paket 7 hierher verwiesen, **Ziel: Backlog statt dieses Paket**. Begründung: Die Zuweisung stand unter der Annahme, dieses Paket fasse den Wurzel-Kanal an. Es tut es nicht — die Nachjustierung der Property-Seite läuft über ein DOM-Event und über keinen `ComponentContext`-Kanal, und der Ent-Pfad bleibt unberührt. Ein Absender nützt dort auch wenig: `#reRequestParentAsRoot` (`ShaeEntElement.ts:420-425`) löst die Bindung bedingungslos, ein Filter bräuchte denselben `isBelow`-Aufstieg, den Paket 6 an geschlossenen Grenzen ausdrücklich fallen lässt. Wer den Kanal anfasst, löst beides zusammen.
- `isBelow`-Aufstieg bleibt n²/2 (`ShaeEntElement.ts:18-23`) — echte Folge, Ziel Backlog. Dieses Paket erhöht die Konstante nicht: es kommt kein zweiter Aufrufer dazu.
- `utils/props-utils.ts:19-27` schreibt ausgelieferte Change Trails fort — vorbestehend, Ziel Backlog. Unberührt.
- Tippfehler `unsubcribe` (`ShaeEntElement.ts:161`, `:167`) — Symptom, Ziel Paket 12. Dieses Paket fasst den Effect nicht an.
- `ComponentContext`-Methoden fehlen in `docs/api-reference.md` — vorbestehend, Ziel Paket 12. Dieses Paket legt keine neue an.
- `ComponentContext.test.js` teilt einen Context über alle Fälle (Paket 7) — echte Folge, Ziel Backlog. Unberührt.
- `Element.moveBefore` ist für `<shae-ent>` ein Abriss (`VIEW-6b`) — vorbestehend, Ziel Backlog. Ein `<shae-prop>` läuft bei einem Abriss durch `disconnectedCallback` + `connectedCallback` und fragt dabei ohnehin neu.
- `waitUntil`/`testAsyncAction` teilen sich 5000 ms (Paket 2) und `test/__screenshots__/` wird nicht geleert (Paket 4b) — Symptome, Ziel Backlog. Der neue e2e-Fall aus 9b benutzt `waitUntil` nicht.
- `TEST-PLAN.md` §1, §1.2, §2.2, H-4 — Symptome, Ziel Paket 12. 9b fasst in dieser Datei genau eine Zeile an (`VIEW-5`-Nachfolgefall unter §3.2).
- Die zwei `biome.json`-Infos — vorbestehend, Ziel Backlog. Unberührt.
- **Neu, gefunden beim Abgleich:** `Backlog.md` `VIEW-5` (`:203`, dazu `:41` und `:392`) beschreibt genau diesen Defekt und wird von 9b geschlossen; die Streichung gehört in 9b.
- **Neu, gefunden beim Abgleich:** `shae-prop.ts:4` koppelt die Registrierung an `whenDefined('shae-ent')`. Nach 9b trägt diese Kopplung die Korrektheit nicht mehr — ein `<shae-prop>`, das vor jedem `<shae-ent>` verbunden wird, findet seinen Host über den Nachjustierungs-Kanal. Ob die Zeile bleibt (als Optimierung) oder fällt (als überflüssige Zusage), ist eine Dokumentationsfrage und gehört zu »Die Upgrade-Garantie dokumentieren« in Paket 12. Der Testfall `upgrade-shae-prop-is-defined-after-shae-ent` bleibt bis dahin unverändert stehen.

- **Widerrufen 2026-08-16 (Implementierer Paket 8, gemessen):** Die Zusage, die Effect-Reihenfolge in `ShaePropElement` sei bedeutungstragend und beim Umbau zu halten, **trägt nicht**. Beide Reihenfolgen liefern denselben Trail (`[{"type":5,"properties":[["x",null],["y",7]]}]`), weil die Ordnung nicht aus der Erzeugungsreihenfolge der Effects entsteht, sondern in `ComponentChanges.#propsChangeOrder`: `removeProperty` benutzt `appendToEnd` und verschiebt einen bereits eingereihten Schlüssel ans Ende. Auch der Fall `renaming the element takes the old property with it` hält sie nicht — er hält, dass das Entfernen überhaupt geschieht. Wer hier die Effects anfasst, hat kein Netz und braucht auch keins.
- Messlatte (nachgetragen 2026-08-16 vom Planer Paket 2): Die gemeinsame Utility muss die Tabelle aus Paket 2 halten, insbesondere `ent0_3_1 → ent0` über zwei Shadow-Grenzen, zwei Slot-Projektionen und zwei Ebenen fremder Namespaces. Wer die Traversierung umbaut, prüft zuerst diesen Fall.
- Nachgetragen 2026-08-16 (Planer Paket 8): Die Reihenfolge der Effects in `ShaePropElement` ist nach Paket 8 bedeutungstragend — der Bindungs-Effect steht vor dem Werte-Effect, damit beim Umbenennen das Entfernen des alten Namens vor dem Setzen des neuen in den Trail kommt. Wer die Datei umbaut, hält die Reihenfolge; der Fall `renaming the element takes the old property with it` in `prop-element-lifecycle.test.js` hält sie fest.
- Nachgetragen 2026-08-16 (Reviewer Paket 7): Die Aufwandsrechnung im Detailplan zu Paket 7 stimmt nicht, und das betrifft auch diesen Umbau. Ein `ns`-Wechsel kostet nicht konstant, sondern **N+1 Nachrichten und N+2 Elternanfragen** bei N Wurzel-Entities im Ziel-Namespace (gemessen: 3 Wurzeln → 4/5, 12 Wurzeln → 13/14). Ursache: Das Element kommt im neuen Namespace typischerweise als Wurzel an, also läuft `#askPeersToReRequestParent()` über `dispatchReRequestParentSiblings` mit `parent == null` in `dispatchReRequestParentRoots()`, und **dieser Kanal kennt den `newAncestor`-Filter nicht**. Jede Wurzel löst ihre Bindung und schickt ein bubbelndes, composed DOM-Event durch die ganze Vorfahrenkette. Der Kandidatensatz ist derselbe wie bei einem `connectedCallback`, also keine neue Größenordnung — aber wer den Wurzel-Kanal anfasst, sollte den Absender durchreichen.

<details>
<summary>Detailplan Paket 9a</summary>

- Dateien: `packages/shadow-objects/src/elements/requestEntAncestor.ts` (neu),
  `packages/shadow-objects/src/elements/ShaeEntElement.ts`,
  `packages/shadow-objects/src/elements/ShaePropElement.ts`,
  `packages/shadow-objects/src/elements/events.ts`,
  `packages/shadow-objects/src/index.ts`,
  `packages/shadow-objects-testing/test/prop-element-host.test.js`,
  `packages/shadow-objects-testing/test/ent-element-namespace.test.js`,
  `packages/shadow-objects/docs/api-reference.md`, `docs/cheat-sheet.md`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. **Rot zuerst.** Drei Fälle in `packages/shadow-objects-testing/test/prop-element-host.test.js`,
     jeder mit eigenen ids, jeder über `entNode?.id` statt über Elementidentität, damit die rote
     Meldung zwei Namen nennt statt zweier serialisierter Elemente. Die Datei benutzt heute
     `render()`; die neuen Fälle brauchen `mount()`/`unmountAll()` aus `../src/mount.js`, weil sie
     Shadow Roots anhängen und der Aufräumweg von `render()` nur ein `<main>` kennt. Die zwei
     vorhandenen Fälle bleiben unangetastet.
     - `it('binds to the entity around its shadow host')` — `<shae-ent id="sr-host" token="host"><div id="sr-div"></div></shae-ent>`,
       danach `attachShadow({mode:'open'})` auf `#sr-div` und `innerHTML` mit
       `<shae-prop id="sr-prop" name="inside" value="42">`.
       Erwartet `expect(prop.entNode?.id).to.equal('sr-host')`.
       **Rote Meldung:** `expected undefined to equal 'sr-host'`.
     - `it('binds to the entity that holds the slot it is projected into')` —
       `<shae-ent id="sp-outer" token="outer"><div id="sp-div"></div></shae-ent>`, offener Shadow
       Root auf `#sp-div` mit `<shae-ent id="sp-inner" token="inner"><slot></slot></shae-ent>`,
       **danach** `#sp-div.insertAdjacentHTML('beforeend', '<shae-prop id="sp-prop" …>')`.
       Erwartet `expect(prop.entNode?.id).to.equal('sp-inner')`.
       **Rote Meldung:** `expected 'sp-outer' to equal 'sp-inner'` — das Element bindet heute an die
       falsche Entity, nicht an keine.
     - `it('binds across a closed shadow boundary')` — derselbe Aufbau mit `{mode:'closed'}`. Die
       Referenz auf den geschlossenen Root kommt aus dem Rückgabewert von `attachShadow`, weil
       `element.shadowRoot` dort `null` liefert; das gehört als Kommentar an die Stelle.
       Erwartet `expect(prop.entNode?.id).to.equal('cp-inner')`.
       **Rote Meldung:** `expected 'cp-outer' to equal 'cp-inner'`.
  2. **Wächter, im selben Zug, mit ihrer Mutation im Kommentar.** Ein Wächter, dessen Fall sich
     nicht falsifizieren lässt, ist wertlos — Paket 8. Für jeden hier gilt: die Mutation steht im
     Kommentar über dem Fall, damit der nächste Leser sie nicht rekonstruieren muss.
     - `it('the nearest entity answers, regardless of its namespace')` —
       `<shae-ent id="ns-outer"><shae-ent id="ns-inner" ns="ns-9a"><shae-prop id="ns-prop">`,
       erwartet `entNode?.id === 'ns-inner'`. Grün vor wie nach dem Fix; er hält die Entscheidung
       vom 2026-08-16 fest. **Mutation:** der Anfrage in `ShaePropElement` ein `ns: GlobalNS`
       mitgeben — dann antwortet `ns-inner` nicht mehr und der Fall wird rot.
     - `it('does not identify itself as an entity element')` (vorhanden) — **Mutation:**
       `isShaeEntElement = true` auf `ShaePropElement` setzen.
     - `it('walks past a nested shae-prop to the real host entity')` (vorhanden) — **Mutation:**
       `ShaePropElement` einen `#onRequestParent`-Listener geben, der `answer(this)` aufruft; dann
       bindet das innere `<shae-prop>` an das äußere und der Fall wird rot.
  3. Die neue Datei `packages/shadow-objects/src/elements/requestEntAncestor.ts` anlegen. Sie
     enthält den Anfragetyp und die Dispatch-Funktion, sonst nichts:
     ```ts
     export interface EntAncestorRequest {
       /** the element asking */
       requester: HTMLElement;
       /** the namespace the answer has to match — `undefined` lets any ancestor answer */
       ns?: NamespaceType;
       /** called by the first ancestor that matches; it stops the event right afterwards */
       answer(entNode: ShaeEntElement): void;
     }

     export const requestEntAncestor = (
       requester: HTMLElement,
       request: Omit<EntAncestorRequest, 'requester'>,
     ): void => { … };
     ```
     Der Rumpf dispatcht ein `CustomEvent(RequestEntParentEventName, {bubbles: true, composed: true,
     detail: {requester, ...request}})` auf `requester`. Der Doc-Kommentar der Datei trägt die
     Begründung, die den ganzen Umbau trägt und die niemand aus dem Code ablesen kann: Der Pfad
     eines `composed`-Events **ist** der Aufstieg durch den flattened Tree, und er ist der einzige,
     der ihn vollständig sieht — `assignedSlot` liefert an einer geschlossenen Grenze `null`, ein
     Aufstieg über Knotenzeiger steigt dort über den gesamten geschlossenen Baum hinweg, das Event
     läuft hindurch. Zweiter Satz: Deshalb stellen beide Elemente dieselbe Anfrage, und es gibt
     genau eine Antwortstelle. Die Datei importiert `ShaeEntElement` und `NamespaceType` nur als
     Typ, sonst entsteht ein Zyklus.
  4. In `ShaeEntElement.ts` die Antwortstelle auf den neuen Anfragetyp umstellen. `#onRequestParent`
     (`:544-554`) liest künftig `event.detail` als `EntAncestorRequest`:
     ```ts
     #onRequestParent = (event: CustomEvent<EntAncestorRequest>) => {
       const request = event.detail;
       if (request?.requester === this) return;
       if (typeof request?.answer !== 'function') return;
       if (request.ns !== undefined && request.ns !== this.ns) return;
       event.stopPropagation();
       request.answer(this);
     };
     ```
     Der `isShaeEntElement`-Wächter entfällt und wird durch den `answer`-Wächter ersetzt — er ist
     strenger, weil nur die Utility solche Anfragen baut. Ein Satz Kommentar über der
     `ns`-Bedingung: Ein Vorfahre mit anderem Namespace **überspringt** die Anfrage, er blockiert
     sie nicht; deshalb steht das `return` vor dem `stopPropagation()` und nicht dahinter. Ein
     zweiter Satz über `request.ns === undefined`: Eine Anfrage ohne Namespace nimmt den nächsten
     Vorfahren, wie ihn das DOM zeigt — so fragt eine Property.
  5. Im selben File `#dispatchRequestParent` (`:462-471`) auf die Utility umstellen:
     `requestEntAncestor(this, {ns: this.ns, answer: (entNode) => this.#setParent(entNode)})`.
     Der Kommentar mit dem Link auf den Shadow-DOM-Artikel bleibt stehen, er erklärt weiterhin,
     warum das Event `composed` sein muss. Nichts anderes in dieser Datei wird angefasst — weder
     `#reRequestParent`, noch `#askPeersToReRequestParent`, noch `isBelow` oder
     `isInClosedShadowTree`. Sie bleiben, wo sie stehen: Der Aufstieg ist kein Suchlauf, sondern
     der Unterhalb-Test aus Paket 6, und er bekommt keinen zweiten Aufrufer.
  6. In `ShaePropElement.ts` die modulweite Funktion `findEntNode` (`:9-18`) ersatzlos streichen und
     `#findEntNode` (`:447-449`) auf die Utility umstellen:
     ```ts
     #findEntNode = () => {
       // a property belongs to the closest entity above it, whatever namespace that entity is in
       requestEntAncestor(this, {answer: (entNode) => this.entNode$.set(entNode)});
     };
     ```
     Zwei Dinge gehören als Kommentar dazu: dass die Anfrage **ohne** `ns` läuft, weil eine
     Property zur nächstgelegenen Entity gehört, und dass `entNode$` unangetastet bleibt, wenn
     niemand antwortet — die Behandlung dieses Falls kommt in 9b. Die Effects in dieser Datei
     werden nicht angefasst; ihre Reihenfolge ist nach der Messung des Implementierers Paket 8
     nicht bedeutungstragend, und dieses Paket braucht sie auch nicht.
  7. `events.ts` nachziehen: `RequestEntParentEvent.detail` bekommt die Form von
     `EntAncestorRequest` (`requester: HTMLElement`, `ns?: NamespaceType`, `answer(entNode)`), am
     besten als `detail: EntAncestorRequest` mit Import aus der neuen Datei. In `index.ts` die neue
     Datei exportieren, damit `EntAncestorRequest` und `requestEntAncestor` mit den bereits
     öffentlichen Ereignisnamen zusammen benutzbar sind.
  8. `packages/shadow-objects-testing/test/ent-element-namespace.test.js`: Der Zählhelfer
     `countRequestsWhile` (`:38-55`) zählt jedes `shaeRequestEntParent` am `document`. Ab jetzt
     fahren auch Property-Anfragen über diesen Namen. Die beiden Fälle, die den Helfer benutzen
     (`:361`, `:381`), tragen kein `<shae-prop>` im Markup, ihre Zahlen ändern sich also nicht —
     nachgeprüft. Der Helfer bekommt trotzdem einen Filter auf
     `event.detail?.requester?.isShaeEntElement === true`, damit er weiter das misst, was sein Name
     sagt, und ein Satz Kommentar dazu. Ohne den Filter ist der nächste Fall mit einer Property
     eine stille Falle.
  9. Dokumentation und Buchführung:
     - `docs/api-reference.md`, §`<shae-prop>`: hinter der Einleitung ein Abschnitt
       `#### Finding the Host Entity`. Inhalt: Das Element bindet an die nächstgelegene Entity über
       ihm, gemessen am flattened Tree — durch Shadow Roots hindurch, entlang von
       Slot-Projektionen, auch über geschlossene Grenzen. Der Namespace spielt dabei keine Rolle:
       Es zählt die Nähe, nicht die Zugehörigkeit. Ein `<shae-prop>` in einem `<shae-prop>` läuft
       durch bis zur Entity. Formuliert für jemanden, der den Vorzustand nie gesehen hat.
     - `docs/api-reference.md`, §`<shae-ent>`, `:1213`: Der Stichpunkt »A `<shae-prop>` resolves its
       host entity once and keeps it …« ist mit diesem Paket falsch. Er fällt hier noch nicht ganz —
       9a ändert die Suche, nicht ihre Wiederholung. Er wird auf die verbleibende Aussage gekürzt
       (die Bindung wird bei einem Wechsel des Vorfahren nicht nachgeführt) und in 9b gestrichen.
     - `docs/cheat-sheet.md`, §`<shae-prop>` (`:230`): eine Zeile, dass die Host-Suche durch Shadow
       Roots und Slots hindurch geht und den nächsten Vorfahren nimmt, unabhängig vom Namespace.
     - `CHANGELOG.md` des Pakets, `## [Unreleased]`: ein Eintrag unter `**Bugfix (elements):**` über
       die Host-Suche eines `<shae-prop>` und einer unter `**Breaking (public API):**` über die
       Form von `RequestEntParentEvent.detail` — sie trägt jetzt `answer` und optional `ns`, und
       ein von Hand gebautes `shaeRequestEntParent` ohne `answer` wird nicht mehr beantwortet. Den
       Zähler im `[Unreleased]`-Kopf fortschreiben; die Fehlbindung an eine äußere Entity ist eine
       sichtbare Verhaltensänderung und gehört mitgezählt.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`.
  Erwartung: `test:ci` 588 statt 584, davon `shadow-objects-testing` 293 statt 289 in weiterhin 20
  Dateien (3 rote Fälle + 1 Wächter in `prop-element-host.test.js`).
  `@spearwolf/shadow-objects` bleibt bei 294, `shae-offscreen-canvas` bei 1 — verschiebt sich dort
  etwas, ist die Änderung weiter gegangen als geplant. **e2e bleibt bei exakt 400**: 9a ändert keine
  Beziehung, nur die Regel, nach der sie zustande kommt. Weicht die e2e-Zahl ab oder wird ein Fall
  rot, ist die Antwortstelle in `#onRequestParent` schärfer oder lockerer geworden als gedacht —
  besonders zu prüfen sind die 19 Struktur-Assertions auf `shae-worker.html` (`ent0_3_1 → ent0` über
  zwei Shadow-Grenzen, zwei Slot-Projektionen und zwei Ebenen fremder Namespaces), die 6 auf
  `multi-env` und die 24 IDs auf `upgrade-timing`. Danach einmal
  `pnpm -F shadow-objects-testing test -- --sequence.shuffle`.
- Commit: `fix(elements): let a shae-prop ask for its host the way an entity does (VIEW-002, TEST-004)`
- Verlauf:
  - Zug 0 (2026-08-16, Planer): Drei Findings in echtem Chromium reproduziert, 15 Sonden in vier
    Läufen, danach entfernt; Arbeitsbaum sauber. Der Beleg des Audits stimmt zeichengenau
    (`PROBE-B`, `PROBE-C`). Zwei Befunde gehen über das Audit hinaus: Bei Slot-Projektion und an
    einer geschlossenen Shadow-Grenze bindet das Element nicht an *keine*, sondern an die
    **falsche** Entity (`SLOT-PRE`, `CLOSED-PROP` — je die äußere statt der inneren). Der
    entscheidende Messwert für den Weg ist `CLOSED-SLOT`: Das Request-Event findet die Entity im
    geschlossenen Shadow Root, ein Aufstieg über den flattened Tree findet sie nie
    (`assignedSlot === null`). Damit ist die gemeinsame Utility die Anfrage und nicht der Lauf;
    ein walk-basiertes `findEntNode` wäre eine zweite, schwächere Semantik gewesen. `STOP` belegt
    die Gegenrichtung: Das Event ist nicht durch einen Aufstieg ersetzbar, ohne das Verhalten von
    `ShaeEntElement` zu ändern. Kein Prototyp gebaut. Baseline auf sauberem Baum bestätigt:
    lint rc=0, typecheck ✓, `test:ci` 584 (294 + 289 in 20 Dateien + 1), e2e 400.

</details>

### [x] 9b. Nachjustierung der Property-Seite

- ~~**Achtung, Kollision** (Implementierer 9a): Die Codeskizze in Schritt 6 schickt beide Auslöser durch dieselbe Methode und macht den Fall `lets go of its host when it moves to a place with no entity above it` aus 9a wieder rot.~~ **Aufgelöst 2026-08-16 (Planer 9b, gemessen am Prototyp).** Die Meldung stimmt, ihre Diagnose nicht ganz. Der Unterschied zwischen den zwei Auslösern liegt nicht darin, *was* eine ausbleibende Antwort bedeutet — das ist auf beiden Wegen dasselbe —, sondern darin, **wann** gefragt wird:
  - **Selbst-Umzug** (`connectedCallback` → `#findEntNode()`): sofort. Antwortet niemand, gibt es keinen Host, `entNode$` wird geleert. Unverändert aus 9a.
  - **Re-Request** (`#onReRequestHost`): um eine Mikrotask aufgeschoben, und fallengelassen, wenn das Element bis dahin den Baum verlassen hat. Danach ruft er **dieselbe** `#findEntNode()`.

  Der Aufschub ist nicht Kosmetik, er ist der Kern: Die Nachricht trifft ein, während der Baum noch in Bewegung ist. Wird ein `<shae-ent>` mitsamt seiner Property in ein anderes `<shae-ent>` verschoben, meldet das gehende Element seinen Abgang, während die Property bereits wieder verbunden ist — eine sofortige Antwort bindet sie an die **Ziel**-Entity und lässt die Property dort liegen. Gemessen am Prototyp: 12 rote e2e-Fälle (6 IDs × 2 Browser) auf `dynamic-dom`, im Worker-Snapshot trägt `host-b` danach dauerhaft das Label `dyn-1`. Mit Aufschub: 400 grün. Die `entNode$`-Zeile aus 9a bleibt damit unangetastet, `#findEntNode` behält Signatur und Bedeutung, und der 9a-Fall bleibt grün.

- **»Kein Zurücksetzen« beim Re-Request ist umgekehrt (2026-08-16, Planer 9b, gemessen).** Die Regel stammt aus einer Zeit, in der auch der Selbst-Umzug nicht zurücksetzte; seit 9a gilt für `entNode` die Zusage »die nächstgelegene Entity über diesem Element, sonst keine«, und ein Weg, der sie bricht, macht denselben physischen Zustand davon abhängig, welche Seite sich bewegt hat. Die Messung entscheidet es unabhängig davon: `<shae-prop>` im Light DOM, projiziert in eine Entity im Shadow Root, die Entity wird entfernt und **anderswo** wieder eingehängt. Mit »kein Zurücksetzen« zeigt `entNode` weiter auf sie (`sitsBelow: false`), und ein `prop.value = 42` schreibt in eine Entity, unter der das Element nicht steht — Trail `[{type:5, properties:[["x",42]]}]`. Mit Zurücksetzen: `entNode` und `viewComponent` leer, Trail leer. Der alte Grund (»ein Zurücksetzen räumt die Property ab, ohne dass ein neuer Ort existiert«) trägt nicht mehr: Das Abräumen ist genau das, was der 9a-Fall zusichert, und die verlassene Entity nimmt ihre Properties ohnehin mit ins Grab.

- Findings: VIEW-003 (high) · TEST-004 (medium, die anderen zwei Fälle)
- Ziel: Ein `<shae-prop>` sucht seinen Host erneut, sobald sich ändert, wer über ihm antwortet — und sagt es, wenn niemand antwortet.
- Bereich: `packages/shadow-objects/src/elements/ShaePropElement.ts`, `ShaeEntElement.ts`, `constants.ts`, `events.ts`, `packages/shadow-objects-testing/test/prop-element-host.test.js`, `packages/shadow-objects-e2e/pages/upgrade-timing.html`, `src/upgrade-timing.js`, `tests/upgrade-timing.spec.ts`, `TEST-PLAN.md`, `packages/shadow-objects/docs/`, `CHANGELOG.md`, `Backlog.md`
- Hängt ab von: Paket 9a
- Modell: stärkste Stufe
- Hinweis: Zwei der vier geforderten Testfälle liegen hier — Host upgraded später, `shae-prop` ganz ohne Host —, dazu der Slot-Fall in seiner zweiten Variante (Shadow Root wird **nach** dem Element angehängt). Der hostlose Fall meldet laut Entscheidung über den `ConsoleLogger`.
- Die Regel aus Paket 6, auf `<shae-prop>` erweitert (2026-08-16, Planer Paket 9): *Jeder Weg, antwortender Vorfahre zu werden oder aufzuhören es zu sein, nimmt die Aufforderung an die Kandidaten mit.* Für ein `<shae-prop>` ist der Kandidatensatz nicht der `ComponentContext`, sondern der DOM-Pfad, und der Namespace spielt keine Rolle — eine Property gehört zur nächstgelegenen Entity, unabhängig vom Namespace. Daraus folgt die Aufzählung: `connectedCallback` hinter `#wasUpgradedInPlace` (das Element fängt an zu antworten), `disconnectedCallback` (es hört auf), `#onSlotChange` (der Pfad darunter ändert sich) — und **nicht** `ns$.onChange`, weil ein Namespace-Wechsel nichts daran ändert, welche Entity die nächstgelegene ist. Diese Ausnahme gehört als Kommentar an die Stelle, sonst sieht sie wie ein Vergessen aus.
- Nachgetragen 2026-08-16 (Planer Paket 6): Zwei Dinge sind nach Paket 6 hier zu erwarten. Erstens die Abgrenzung: Paket 6 tauscht den **Auslöser** aus (wer wird aufgefordert, noch einmal zu suchen), dieses Paket die **Suche** selbst. Sie berühren sich an keiner Zeile, nichts wird doppelt gemacht. Zweitens die Lücke, die bleibt: Der Mechanismus aus Paket 6 läuft über `ViewComponent`s im `ComponentContext` und erreicht ein `<shae-prop>` deshalb prinzipiell nicht — die Nachjustierung der Property-Seite liegt vollständig hier und braucht einen eigenen Auslöser. Ablesbar an der neuen Markup-Insel auf `pages/upgrade-timing.html`: Sie trägt bewusst kein `<shae-prop>`, weil eine Property unter einem noch nicht registrierten Element beim Upgrade am falschen Entity landet. Wenn dieses Paket steht, gehört genau dort eine Property hinein und ein Testfall dazu.
- Nachgetragen 2026-08-16 (Planer Paket 7): `#askPeersToReRequestParent()` hat nach Paket 7 zwei Aufrufstellen — `connectedCallback`, hinter dem `#wasUpgradedInPlace`-Wächter, und `ns$.onChange` ohne ihn. Wer die Vorfahrensuche vereinheitlicht, hält beide; der Wächter gehört zur Aufrufstelle, nicht zur Methode.
- Nachgetragen 2026-08-16 (Planer Paket 8): Paket 8 legt den Auslöser für die Property-Seite bereits an, den dieses Paket hier erwartet hat. Der neue Bindungs-Effect in `ShaePropElement` hängt an `viewComponent$` und `name$`; wechselt die Host-Entity, räumt er die Property auf der alten ab und setzt sie auf der neuen. Wer hier die Vorfahrensuche nachjustiert, muss deshalb nur `entNode$` neu setzen — der Rest folgt. Was dieses Paket zusätzlich braucht, ist der Testfall dafür: das `<shae-prop>` auf der Markup-Insel von `pages/upgrade-timing.html`, das Paket 6 bewusst weggelassen hat. Paket 8 nimmt es nicht mit, weil die Property dort ohne diese Nachjustierung am falschen Entity landet — das ist keine Frage des Lebenszyklus, sondern der Suche.

**Abgleich (2026-08-16, Zug 0 dieses Pakets).** Beide Findings bestehen unverändert; 9a hat sie nicht
angefasst, nur die Zeilennummern verschoben. Alle fünf geplanten roten Fälle sind nach 9a weiterhin
rot — einer davon mit einer anderen Meldung als geplant.

| Finding | Zustand | Fundstelle heute | gemessen |
|---|---|---|---|
| VIEW-003 | unverändert | `ShaePropElement.ts:403-411` (`connectedCallback`), `:445-449` (`#findEntNode`), `shae-prop.ts:4` | `RED-1 {"before":null,"after":null}` — eine `ShaeEntElement`-Subklasse wird nach dem Rendern definiert, das `<shae-prop>` darunter bleibt hostlos. Die Suche läuft weiterhin genau einmal: `connectedCallback` ist ihr einziger Aufrufer |
| TEST-004 (Rest) | unverändert | `packages/shadow-objects-testing/test/prop-element-host.test.js` — 7 Fälle nach 9a | keiner deckt einen späteren Wechsel der Antwort ab; der hostlose Fall fehlt weiterhin ganz |

**Reproduktion.** Sieben Sondenläufe in echtem Chromium über die Browser-Konfiguration von
`shadow-objects-testing`, dazu ein Prototyp der ganzen Änderung samt e2e-Insel; alles danach
entfernt, Arbeitsbaum sauber, `dist/` neu gebaut. Die fünf geplanten Fälle im Ist-Zustand:

| geplanter Fall | heute | Meldung |
|---|---|---|
| `finds a host whose element is defined after it` | rot | `RED-1 {"before":null,"after":null}` → `expected undefined to equal 'lh-host'` |
| `moves to an entity that upgrades between it and its current host` | rot | `RED-2 {"before":"mv-gp","after":"mv-gp"}` → `expected 'mv-gp' to equal 'mv-mid'` |
| `binds to an entity in a shadow root attached after it` | rot | `RED-3 {"before":null,"after":null,"assignedSlot":true,"searchWouldFind":"la-inner"}` → `expected undefined to equal 'la-inner'`. Der Zusatz ist der Beleg, dass allein die Wiederholung der Anfrage genügt |
| `looks for the next entity up when its host leaves the tree` | rot, **anderer Ausgangspunkt** | `RED-4 {"atMount":"lv-outer","afterShadow":"lv-outer","searchAfterShadow":"lv-inner","afterRemove":"lv-outer"}` → die geplante Meldung `expected undefined to equal 'lv-inner'` stimmt nicht: Das Element bindet beim Einhängen an `lv-outer`, weil die äußere Entity zu diesem Zeitpunkt schon da ist. Rot ist die **mittlere** Zusicherung: `expected 'lv-outer' to equal 'lv-inner'`. Die letzte (`lv-outer` nach dem Entfernen) ist im kaputten Zustand aus Versehen grün — sie war nie weg |
| `reports a property with no entity in its ancestor path` | rot | `RED-5 {"entNode":null,"warnCalls":0,"aboutThisProp":0}` → `expected 0 to equal 1` |

**Was der Prototyp beantwortet hat.** Gebaut, gemessen, verworfen — die Ergebnisse stehen in den
Schritten, in die sie gehören. Drei tragen den Plan:

- **Der Aufschub ist Pflicht.** Ohne ihn: `dynamic-dom` 12 rot (6 IDs × 2 Browser), die Property
  landet dauerhaft auf der Entity, in die ihr Host verschoben wurde. Mit ihm: e2e 400 grün,
  Integrationspaket 294 grün. Eine Reproduktion auf `ComponentContext`-Ebene ist **nicht** gelungen
  (der Trail nach dem Umzug ist in beiden Varianten ein einzelner Parent-Wechsel) — das Netz für
  diesen Fall ist die vorhandene `dynamic-dom`-Insel, nicht ein neuer Integrationsfall.
- **Der Kanal trifft, was er treffen soll.** `CHANNEL {"onHost":1,"onDoc":1}` — ein gebundenes
  `<shae-prop>` hört an seiner Host-Entity mit, ein ungebundenes am `document`.
  `DISPATCH {"afterMount":[],"afterInnerHtml":["d-inner"],"afterRemove":["d-inner"]}` zeigt die zwei
  Grenzen des Kanals, beide harmlos, beide in Schritt 4 begründet.
- **Alle fünf Fälle werden grün**, und der geschlossene Shadow Root gleich mit:
  `FIX-1 {"after":"lh-host"}`, `FIX-2 {"after":"mv-mid"}`, `FIX-3 {"after":"la-inner"}`,
  `FIX-3c {"after":"lc-inner"}`, `FIX-4 {"afterShadow":"lv-inner","afterRemove":"lv-outer","trail":[[5,[["x",7]]],[2,null]]}`,
  `FIX-5 {"afterMount":1,"afterHostArrives":1,"entNode":"ll-host"}`. Die e2e-Insel aus Schritt 7 wurde
  mitgebaut: mit Fix 29 grün, ohne Fix genau die zwei neuen IDs rot, alle anderen grün.

**Der Restplan bleibt** (2026-08-16, Planer 9b): Schnitt und Reihenfolge der Pakete 10 bis 14 ändern
sich nicht. Zwei Einträge wachsen — Paket 10 erbt den Aufschub als Warnung, Paket 12 die Entscheidung
über `src/elements/events.ts` —, beide sind dort eingetragen. Paketnummern werden nicht neu vergeben.

**Triage der offenen Nebenbefunde und Folgen aus den Paketen 1 bis 9a (2026-08-16, Planer 9b).**
Ein Eintrag ist neu, einer wird von diesem Paket miterledigt, alle anderen bleiben, wo sie stehen.

- **Neu, `packages/shadow-objects/src/elements/events.ts`:** Die Datei wird von keinem Modul
  importiert und von `index.ts` nicht exportiert; ihre Typen sind über den Einstiegspunkt nicht
  erreichbar. Ihre `declare global`-Augmentierung hängt aber trotzdem am ganzen Programm — gemessen
  mit `tsc -p tsconfig.json --noEmit` und einer Wegwerf-Datei ohne jeden Import: sowohl
  `'shaeRequestEntParent'` als auch `'addEventListener'` und `'dispatchEvent'` sind Schlüssel von
  `keyof HTMLElementEventMap`. Die zwei Methodendeklarationen im `interface`-Rumpf sind ein
  Copy-Paste-Fehler: In eine Event-Map gehören Ereignisnamen, keine Methoden. **Vorbestehend**,
  unverändert seit `1efde70`, von 9a nur im `detail`-Typ berührt. Ziel: **dieses Paket** streicht die
  zwei Zeilen, weil es ohnehin in dieselbe Datei schreibt (Schritt 3a). Die Frage, ob die Datei
  exportiert oder gelöscht gehört, ist eine Entscheidung über den Einstiegspunkt und geht an
  **Paket 12**, zu den anderen nach 9a/9b öffentlich gewordenen Namen.
- **`Backlog.md` `VIEW-5` (`:203`, dazu `:41` und `:392`)** — beschreibt genau diesen Defekt, wird von
  diesem Paket geschlossen. Die Streichung steht in Schritt 8.
- `dispatchReRequestParentRoots` kennt keinen Absender (`ComponentContext.ts:365-371`) — vorbestehend, Ziel Backlog, wie in 9a zurückgegeben. Unberührt: Der Kanal dieses Pakets ist ein DOM-Ereignis und läuft über keinen `ComponentContext`-Kanal.
- `isBelow`-Aufstieg bleibt n²/2 (`ShaeEntElement.ts:19-23`) — echte Folge, Ziel Backlog. Dieses Paket fügt keinen Aufrufer hinzu; die Nachjustierung fragt, sie steigt nicht.
- `utils/props-utils.ts:19-27` schreibt ausgelieferte Change Trails fort — vorbestehend, Ziel Backlog. Unberührt.
- Tippfehler `unsubcribe` (`ShaeEntElement.ts:162`, `:168` — durch 9a um eine Zeile verschoben) — Symptom, Ziel Paket 12. Dieses Paket fasst den Effect nicht an.
- `ComponentContext`-Methoden fehlen in `docs/api-reference.md` — vorbestehend, Ziel Paket 12. Dieses Paket legt keine neue an.
- `ComponentContext.test.js` teilt einen Context über alle Fälle (Paket 7) — echte Folge, Ziel Backlog. Unberührt.
- `Element.moveBefore` ist für `<shae-ent>` ein Abriss (`VIEW-6b`) — vorbestehend, Ziel Backlog. Nach diesem Paket ist der Weg derselbe wie bei jedem Umzug: Das gehende Element meldet sich, die Property fragt eine Mikrotask später noch einmal und findet dieselbe Entity wieder.
- `waitUntil`/`testAsyncAction` teilen sich 5000 ms (Paket 2) — Symptom, Ziel Backlog. Der neue e2e-Fall benutzt `waitUntil` nicht.
- `packages/shadow-objects-testing/test/__screenshots__/` wird von keinem Skript geleert (Paket 4b) — Symptom, Ziel Backlog, **und weiterhin aktiv**: Die Sondenläufe dieses Zugs haben das Verzeichnis erneut gefüllt, es ist von Hand geleert worden. Wer hier rote Fälle laufen lässt, räumt es hinterher weg.
- `TEST-PLAN.md` §1, §1.2, §2.2, H-4 — Symptome, Ziel Paket 12. Dieses Paket fasst in dieser Datei genau eine Zeile an (§3.2).
- Die zwei `biome.json`-Infos — vorbestehend, Ziel Backlog. Unberührt, `pnpm lint` rc=0.
- `shae-prop.ts:4` koppelt die Registrierung an `whenDefined('shae-ent')` — nach diesem Paket trägt die Kopplung die Korrektheit nicht mehr. Bleibt-oder-fällt ist eine Dokumentationsfrage, Ziel Paket 12; der Testfall `upgrade-shae-prop-is-defined-after-shae-ent` bleibt bis dahin stehen.

<details>
<summary>Detailplan Paket 9b</summary>

- Dateien: `packages/shadow-objects/src/elements/constants.ts`,
  `packages/shadow-objects/src/elements/events.ts`,
  `packages/shadow-objects/src/elements/ShaeEntElement.ts`,
  `packages/shadow-objects/src/elements/ShaePropElement.ts`,
  `packages/shadow-objects-testing/test/prop-element-host.test.js`,
  `packages/shadow-objects-e2e/pages/upgrade-timing.html`, `src/upgrade-timing.js`,
  `tests/upgrade-timing.spec.ts`, `TEST-PLAN.md`,
  `packages/shadow-objects/docs/api-reference.md`, `docs/cheat-sheet.md`,
  `packages/shadow-objects/CHANGELOG.md`, `CHANGELOG.md` (Repo-Wurzel), `Backlog.md`
- Der Weg in einem Satz: Ein `<shae-ent>`, das anfängt oder aufhört zu antworten, schickt ein
  bubbelndes, `composed` Ereignis von sich aus nach oben; ein gebundenes `<shae-prop>` lauscht
  darauf an seiner Host-Entity, ein hostloses am `document`, und beide fragen eine Mikrotask später
  noch einmal dieselbe Anfrage wie beim Einhängen. Warum das genau die richtige Menge trifft, steht
  in Schritt 4; warum die Mikrotask nicht wegdarf, in Schritt 5.
- Vorgehen:
  1. **Rot zuerst.** Sechs Fälle in `packages/shadow-objects-testing/test/prop-element-host.test.js`,
     alle mit `mount()`/`unmountAll()`, eigenen ids und Assertions über `entNode?.id`. Jede
     Meldung unten ist am Ist-Zustand gemessen, nicht geschätzt.
     - `it('finds a host whose element is defined after it')` —
       `<late-host-9b id="lh-host" token="host"><shae-prop id="lh-prop" name="x" value="1"></late-host-9b>`,
       danach `class LateHost9b extends ShaeEntElement {}` und `customElements.define`.
       Erwartet `entNode?.id === 'lh-host'`.
       **Rote Meldung:** `expected undefined to equal 'lh-host'`.
     - `it('moves to an entity that upgrades between it and its current host')` —
       `<shae-ent id="mv-gp" token="gp"><late-mid-9b id="mv-mid" token="mid"><shae-prop id="mv-prop"></late-mid-9b></shae-ent>`.
       Vor dem Define `entNode?.id === 'mv-gp'` (Ausgangspunkt, kein Defekt), danach erwartet
       `'mv-mid'`. **Rote Meldung:** `expected 'mv-gp' to equal 'mv-mid'`.
     - `it('binds to an entity in a shadow root attached after it')` — `<div id="la-div">` mit
       `<shae-prop id="la-prop">` darin, danach offener Shadow Root mit
       `<shae-ent id="la-inner"><slot></slot></shae-ent>`.
       **Rote Meldung:** `expected undefined to equal 'la-inner'`.
     - `it('looks for the next entity up when its host leaves the tree')` — `<div id="lv-div">` mit
       `<shae-prop id="lv-prop">`, umgeben von `<shae-ent id="lv-outer">`; offener Shadow Root auf
       `#lv-div` mit `<shae-ent id="lv-inner"><slot></slot></shae-ent>`; danach `lv-inner.remove()`.
       Erwartet vorher `'lv-inner'`, nachher `'lv-outer'`.
       **Rote Meldung:** `expected 'lv-outer' to equal 'lv-inner'` — korrigiert gegenüber der
       ersten Fassung dieses Plans, gemessen als `RED-4`. Das Element bindet beim Einhängen an
       `lv-outer`, weil die äußere Entity da schon antwortet; rot ist die Zusicherung nach dem
       Anhängen des Shadow Roots. Die zweite Zusicherung ist im kaputten Zustand aus Versehen grün
       (die Bindung war nie woanders) und trägt erst nach dem Fix etwas — ihre Mutation steht in
       Schritt 4. Beide Zusicherungen bleiben, in dieser Reihenfolge, mit je einer eigenen Meldung.
     - `it('lets go of its host when the entity above it leaves the tree')` — dasselbe ohne die
       äußere Entity: `<div id="lg-div">` mit `<shae-prop id="lg-prop" name="x" value="7" type="number">`,
       offener Shadow Root auf `#lg-div` mit `<shae-ent id="lg-inner" ns="…"><slot></slot></shae-ent>`,
       danach `lg-inner.remove()`. Erwartet: `entNode` vorher `'lg-inner'`, danach `undefined`, und
       ein anschließendes `prop.value = 42` erreicht nichts (`buildChangeTrails()` leer).
       **Rote Meldung:** `expected undefined to equal 'lg-inner'` (die erste Zusicherung fällt
       zuerst). Dieser Fall ist das Gegenstück zu `lets go of its host when it moves to a place
       with no entity above it` aus 9a — dort bewegt sich das Element, hier der Host — und er ist
       der einzige, der die umgekehrte Entscheidung hält. **Mutation:** `this.entNode$.set(found)`
       in `#findEntNode` durch `if (found != null) this.entNode$.set(found)` ersetzen, also die
       ursprüngliche Codeskizze dieses Plans; gemessen wird die Property dann in eine Entity
       geschrieben, unter der das Element nicht steht (`KEEP-VARIANT … "sitsBelow":false,
       trail [[5,[["x",42]]]]`).
     - `it('reports a property with no entity in its ancestor path')` — `<shae-prop id="lonely">`
       ohne jeden Vorfahren. **Der Fall setzt `ConsoleLogger.sharedConfig.enable = true` in einem
       `try`/`finally`.** Begründung, gegenüber der ersten Fassung geschärft: Gemessen steht der
       Schalter unter dem Vitest-Browser-Runner ohnehin auf `true`
       (`ENV {"host":"localhost:63315","enable":true}`), aber er wird aus dem Host-Namen der Seite
       abgeleitet **und** aus `localStorage` nachgeladen — beides außerhalb der Kontrolle des
       Falls. Ohne das Setzen misst er irgendwann nichts mehr, ohne rot zu werden. Das ist der
       Gegenpol zu `the conversion failure is reported through the ConsoleLogger` in
       `prop-element-types.test.js`, der den Schalter absichtlich **aus**schaltet, weil er
       `logger.error` prüft. Beides gehört als Kommentar an die Stelle. Gezählt wird nach Inhalt
       (`sinon.stub(console, 'warn')`, dann die Aufrufe filtern, die den Property-Namen nennen),
       nicht nach Aufrufzahl. **Rote Meldung:** `expected 0 to equal 1`.
  2. **Wächter mit Mutation.** Genau einer, und er ist an seiner Mutation gemessen. Die anderen
     beiden aus der ersten Fassung entfallen — beide waren nicht falsifizierbar:
     - `it('reports the missing host once, not once per entity that arrives')` — hostloses
       `<shae-prop id="rg-prop" name="rg-x">` in einem `<div>`, danach kommt über
       `container.querySelector('#rg-box').insertAdjacentHTML('beforeend', '<shae-ent …>')` ein
       **Geschwister**-`<shae-ent>` dazu, das den Kanal auslöst, ohne Host zu werden. Erwartet:
       eine Meldung, vorher wie nachher. **Mutation:** `#reportedMissingHost` streichen — gemessen
       `REPEAT {"afterMount":1,"afterSibling":2}` gegen `REPEAT-GUARDED {"afterMount":1,"afterSibling":1}`.
       **Wichtig für den Aufbau:** Das auslösende `<shae-ent>` muss über `insertAdjacentHTML` in
       einen **bereits verbundenen** Knoten kommen. Ein `mount()` mit eigenem Container erzeugt das
       Element im abgehängten `<div>`, `#wasUpgradedInPlace` ist dann `false` und es meldet sich
       nicht — gemessen `DISPATCH {"afterMount":[]}`. Mit `mount()` wäre der Wächter leer grün und
       auch die Mutation ließe ihn grün.
     - ~~`a namespace change on an ancestor does not move a property`~~ — entfällt. Die einzige
       Mutation, die ihn rot macht, ist ein `ns` in der Host-Anfrage, und die fängt bereits
       `the nearest entity answers, regardless of its namespace` aus 9a. Ein zweiter Fall für
       dieselbe Mutation ist kein zweiter Wächter. Die Ausnahme, die er festhalten sollte —
       `ns$.onChange` bekommt **keinen** Aufruf des Kanals —, steht als Kommentar im Code
       (Schritt 4) und trägt sich dort selbst.
     - ~~`a re-request that finds the same host changes nothing`~~ — entfällt. Gemessen
       (`SAME-ANSWER {"trail":[]}`, dazu `SIGNAL {"afterSame":0}`): Eine gleichbleibende Antwort
       ist im Signal ein No-op, der Fall ist vor wie nach dem Fix grün, und seine vorgeschlagene
       Mutation (»erst `undefined`, dann den neuen Wert setzen«) ist kein Fehler, den jemand
       machen würde. Was er wirklich hätte halten sollen — kein Nachschreiben beim Umzug — hält
       die `dynamic-dom`-Insel, siehe Schritt 5.
  3. In `constants.ts` einen Ereignisnamen ergänzen, hinter `ReRequestEntParentEventName`:
     `export const ReRequestEntHostEventName = 'shaeReRequestEntHost';`
     Ein eigener Name statt einer zweiten Bedeutung für `ReRequestEntParentEventName`: Dieser
     bewegt die Elternbindung von Entities und wird von `#onReRequestParent` mit `ns`-Filter und
     `shadowRootHost`-Bedingung gelesen. Property-Bindungen kennen weder das eine noch das andere.
     In `events.ts` ein `ReRequestEntHostEvent` mit `detail: {requester: ShaeEntElement}` und der
     Eintrag in `ShadowEntsEventMap`.
     Und im selben Zug die zwei Methodendeklarationen im `declare global`-Block von `events.ts`
     streichen, sodass nur `interface HTMLElementEventMap extends ShadowEntsEventMap {}`
     stehenbleibt. `addEventListener` und `dispatchEvent` sind dort keine Überladungen, sondern
     Schlüssel der Event-Map — gemessen mit `tsc --noEmit`:
     `'addEventListener' extends keyof HTMLElementEventMap` ist `true`, und zwar für das ganze
     Programm, ohne dass irgendwer die Datei importiert. Dieses Paket schreibt in genau dieses
     `interface`; die zwei Zeilen dabei stehenzulassen hieße, den Fehler zu zementieren. Ein Satz
     Kommentar über den Block: Eine Event-Map bildet Ereignisnamen auf Ereignistypen ab, sonst
     nichts. Ob die Datei über `index.ts` erreichbar wird oder verschwindet, entscheidet Paket 12
     — dieses Paket ändert daran nichts.
  4. In `ShaeEntElement.ts` eine private Methode ergänzen, direkt neben
     `#askPeersToReRequestParent` (`:448-461`):
     ```ts
     // Properties below this element bind to the closest entity above them. This element becoming
     // one — or ceasing to be one — changes that answer, and no component context can carry the
     // message: a <shae-prop> has no view component to receive it. The event travels the same
     // ascent every request travels, so it passes exactly the entities a property could be bound
     // to right now, and nothing else.
     #askPropertiesToReRequestHost() {
       this.dispatchEvent(
         new CustomEvent(ReRequestEntHostEventName, {bubbles: true, composed: true, detail: {requester: this}}),
       );
     }
     ```
     Drei Aufrufstellen, und die Begründung jeder gehört an ihre Stelle:
     - `connectedCallback`, unmittelbar hinter `#askPeersToReRequestParent()` und **innerhalb**
       desselben `if (this.#wasUpgradedInPlace)`-Blocks (`:340-342`). Dieselbe Überlegung trägt:
       Ein Element, das vor seinem Eintritt in den Baum gebaut wurde, antwortet bereits, wenn
       darunter irgendetwas verbindet. Die Grenze ist gemessen und gehört in denselben Kommentar:
       Ein Element, das in einem abgehängten Teilbaum gebaut und erst danach eingehängt wird,
       meldet sich **nicht** (`DISPATCH {"afterMount":[]}`) — die Properties darunter verbinden
       nach ihm und finden es selbst, und eine bereits verbundene Property, die per Slot in diesen
       Teilbaum projiziert wird, erreicht der `#onSlotChange`-Aufruf weiter unten.
     - `disconnectedCallback`, **nach** dem `removeEventListener` für `RequestEntParentEventName`
       (`:399`) und **vor** `#setParent(undefined)`. Die Reihenfolge ist der Kern und gehört als
       Kommentar dazu: Eine Property, die daraufhin neu fragt, darf von diesem Element nicht mehr
       beantwortet werden. Das Element ist zu diesem Zeitpunkt schon aus dem Baum, das Ereignis
       erreicht deshalb nur noch, wer an ihm selbst lauscht — und das sind genau die Properties,
       die an ihm hängen. Gemessen: `DISCONNECTED-DISPATCH {"onSelf":1,"onParent":0}`, und
       `DISPATCH {"afterRemove":[…unverändert…]}` — am `document` kommt aus einem abgehängten
       Knoten nichts mehr an.
     - `#onSlotChange` (`:513-523`), als **erste** Zeile der Methode, vor dem
       `if (shadowRootHost == null) return;`. Das gehört kommentiert, weil es der eine Punkt ist,
       an dem die zwei Kanäle auseinanderlaufen: Der Ent-Kanal interessiert sich nur für eine
       Slot-Änderung innerhalb eines Shadow Roots, weil er die Elternbindung über die
       Shadow-Grenze nachzieht. Für eine Property zählt jede geänderte Slot-Zuordnung, denn sie
       verschiebt, was unterhalb dieses Elements liegt.
     Und die Stelle, die **keinen** Aufruf bekommt: `ns$.onChange` (`:95-130`). Ein Satz Kommentar
     dort, sonst liest sich das wie ein Vergessen: Eine Property gehört zur nächstgelegenen Entity,
     unabhängig vom Namespace — ein Namespace-Wechsel ändert an dieser Nähe nichts.
  5. In `ShaePropElement.ts` die Nachjustierungs-Seite ergänzen. Zwei private Felder und drei
     Methoden — das dritte Feld, `#reportedMissingHost`, kommt in Schritt 6 dazu —, und die ganze
     Unterscheidung zwischen den zwei Auslösern steckt in `#onReRequestHost`:
     ```ts
     #reRequestHostTarget?: EventTarget;
     #hostLookupPending = false;

     // Someone above started or stopped answering. Two things separate this from a lookup the
     // element makes on arrival, and both belong here, to the trigger — what an unanswered
     // request means is the same on either path.
     //
     // It waits a microtask: the message arrives while the tree is still moving. An entity that
     // announces its departure has left, but everything below it can be back in place before the
     // tick ends, and an ancestor answering *right now* can be one this element is about to
     // leave behind. Asking after the dust settles is asking once, about the tree that is
     // actually there.
     //
     // And it drops the question if this element has left in the meantime. Whether that is a
     // move or an end is `#disconnectFromEntNode`'s to answer, one microtask later, and it is
     // answered in one place.
     #onReRequestHost = () => {
       if (this.#hostLookupPending) return;
       this.#hostLookupPending = true;
       queueMicrotask(() => {
         this.#hostLookupPending = false;
         if (this.isConnected) {
           this.#findEntNode();
         }
       });
     };

     #listenForHostChanges = () => {
       // bound: the entity itself is on the ascent of every element that could take the property
       // away from it. Unbound: the document is the one node every such event reaches, out of any
       // tree, closed roots included
       const target: EventTarget = this.entNode$.value ?? this.ownerDocument;
       if (target === this.#reRequestHostTarget) return;
       this.#stopListeningForHostChanges();
       target.addEventListener(ReRequestEntHostEventName, this.#onReRequestHost);
       this.#reRequestHostTarget = target;
     };
     ```
     `#stopListeningForHostChanges` nimmt den Listener wieder ab und leert das Feld.
     Aufrufstellen: `#listenForHostChanges()` als letzte Zeile von `#findEntNode()` — das Ziel
     ändert sich mit der Antwort, also wird es nach ihr gesetzt —, `#stopListeningForHostChanges()`
     in `disconnectedCallback` **vor** `#disconnectFromEntNode()` (`:433-435`).
     `connectedCallback` bleibt, wie es ist: `#findEntNode()` steht dort schon.
     Der `queueMicrotask`-Aufschub in `#disconnectFromEntNode` (`:451-457`) bleibt unangetastet.

     Was `#hostLookupPending` leistet, gehört in denselben Kommentar: Eine Seite, die sich mit
     Entities füllt, schickt viele Meldungen durch dieselbe Vorfahrenkette; das Flag macht daraus
     eine Anfrage pro Mikrotask und pro Element.

     **Die Messung, die den Aufschub trägt, und der Grund, warum er nicht wegoptimiert werden
     darf:** Ohne ihn wird bei `host-b.append(dyn1)` die Property des mitziehenden
     `<shae-prop>` an `host-b` gebunden, weil das gehende `dyn1` seinen Listener bereits abgemeldet
     hat und der neue Elternteil antwortet — die Property bleibt danach an `host-b` hängen. Gemessen
     am Prototyp: `dynamic-dom` 12 rot (6 IDs × 2 Browser), im Snapshot des Workers trägt `host-b`
     das Label `dyn-1`. Mit Aufschub: e2e 400 grün. Und der `isConnected`-Test darin ist **nicht**
     falsifizierbar — bei einem echten Entfernen bleibt der Trail so oder so `[{type:2}]`, weil die
     gehende Entity ihre Properties mitnimmt (`SUBTREE` gegen `SUBTREE-GUARDED`, beide
     `[[2,null]]`). Er steht trotzdem da, aus demselben Grund wie `if (!this.isConnected) return;`
     in `#reRequestParent` (`ShaeEntElement.ts:432`): Ein Element, das den Baum verlassen hat,
     beantwortet keine Frage über seine Position mehr. Kein Wächter dafür, kein Perf-Argument dafür
     — die erste Messung, die eines zu zeigen schien, war ein Reihenfolgeeffekt und ist widerrufen.
  6. Den hostlosen Fall in `#findEntNode()` melden — und sonst nichts an der Methode ändern. Die
     Anfrage sagt es selbst: Wurde `answer` nicht gerufen, hat niemand geantwortet.
     ```ts
     #findEntNode = () => {
       let found: ShaeEntElement | undefined;
       requestEntAncestor(this, {answer: (entNode) => (found = entNode)});

       this.entNode$.set(found);

       if (found == null && this.isConnected && !this.#reportedMissingHost) {
         this.#reportedMissingHost = true;
         if (this.logger.isWarn) {
           this.logger.warn(`[${this.name}] no entity above this element, the property is set nowhere`, {shaeProp: this});
         }
       }

       this.#listenForHostChanges();
     };
     ```
     Die Zeile `this.entNode$.set(found)` bleibt, wie 9a sie hinterlassen hat: Was die Anfrage
     beantwortet, ist der Host; keine Antwort heißt kein Host, auf **beiden** Wegen. Genau hier lag
     die gemeldete Kollision, und sie löst sich nicht in dieser Methode auf, sondern in Schritt 5.
     Der Kommentar über der Methode (`:437-444`) braucht dafür einen Satz weniger Enge: Er
     begründet die geleerte Bindung heute damit, dass das Element »gerade dort angekommen« sei —
     nach diesem Paket ruft die Methode auch, wer stehen geblieben ist und über dem sich etwas
     geändert hat. Die Begründung bleibt dieselbe und wird nur auf beide Fälle gehoben: Eine
     Bindung, die keine Antwort mehr hat, gehört an einen Ort, den es nicht mehr gibt.
     Drei Dinge gehören als Kommentar dazu. Erstens: Die Meldung geht genau einmal pro Element
     hinaus (`#reportedMissingHost`), weil der Nachjustierungs-Kanal dieselbe Anfrage wiederholt
     und eine Property, die nie einen Host bekommt, sonst bei jedem fremden Upgrade erneut meldet.
     Zweitens der `isConnected`-Test in derselben Bedingung: Ein Element, das gerade den Baum
     verlässt, hat keinen fehlenden Host, es hat keine Position. Drittens die Grenze dieser Meldung,
     unmissverständlich benannt: `logger.warn` hängt an `ConsoleLogger.sharedConfig.enable`, und das
     steht auf »die Seite kommt von localhost« — außerhalb davon bleibt der Fall stumm. Das ist die
     Entscheidung vom 2026-08-16 (»warnt über den vorhandenen `ConsoleLogger`, wie es die Klasse für
     unbekannte Typnamen bereits tut«) und der Unterschied zum Konvertierungsfehler aus Paket 5, der
     über `logger.error` geht, weil er vorher ein Uncaught Error war. Hier war vorher nichts — und
     ein `error` wäre hier auch sachlich falsch: Im Upgrade-Pfad, den dieses Framework ausdrücklich
     unterstützt, ist »noch keine Entity über mir« ein **Durchgangszustand**. Ein `<shae-prop>` unter
     einem Element, dessen Tag später registriert wird, meldet einmal und findet danach seinen Host
     (gemessen `FIX-5b {"afterMount":1,"afterHostArrives":1,"entNode":"lw-host"}`). Über `error`
     bräche derselbe Fall den e2e-Fall `no uncaught or logged errors` jeder Seite, die so gebaut ist
     — der Fall zählt `console.error` und Uncaught Exceptions, `console.warn` ausdrücklich nicht
     (`tests/runPageTests.ts:56-58`).
  7. Die e2e-Insel schließen, die Paket 6 offengelassen hat. In
     `packages/shadow-objects-e2e/pages/upgrade-timing.html` bekommt `<late-ent id="late-mid">`
     ein `<shae-prop name="label" value="late-mid"></shae-prop>` als erstes Kind. Der Kommentar
     darüber (`:33-37`) wird auf den neuen Sachverhalt umgeschrieben: Die Insel trägt eine
     Property, weil eine Property dem Element folgt, das zwischen sie und ihre bisherige Entity
     tritt. Die `late-wrapper`-Insel bleibt ohne Property — sie misst die Slot-Zuordnung, und zwei
     Messungen in einer Insel machen den roten Fall unlesbar.
     In `src/upgrade-timing.js` zwei IDs hinter `upgrade-late-subclass-adopts-the-child`:
     - `upgrade-late-prop-found-its-host` — `byId('late-mid').querySelector(':scope > shae-prop').entNode === byId('late-mid')`
     - `upgrade-late-prop-reached-the-worker` — nach `upgrade-late-definition-sync`:
       **`find('late-mid')?.uuid === byId('late-mid').uuid`**, korrigiert gegenüber der ersten
       Fassung: `find(label)` sucht die Entity, deren `label` passt, ein `?.label === 'late-mid'`
       wäre also tautologisch grün. Die Frage ist, *welche* Entity das Label trägt — ohne den Fix
       ist es `late-gp`. Die Hilfsfunktion war für diese Insel bisher nicht benutzbar, der Kommentar
       bei `entityOf` (`:133-135`) wird entsprechend nachgezogen.
     Beide IDs in `tests/upgrade-timing.spec.ts` in derselben Reihenfolge eintragen — fehlt eine,
     schlägt der Lauf mit einer zu kleinen Gesamtzahl fehl, nicht mit einem roten Fall.
     Der ganze Schritt ist am Prototyp durchgespielt: mit Fix 29 grün (27 IDs + Setup +
     Fehlerprüfung), ohne Fix genau diese zwei rot und alle anderen grün. Die Insel erzeugt keine
     Warnung, weil `late-gp` über der Property steht — der Fall `no uncaught or logged errors`
     bleibt grün, gemessen.
  8. Dokumentation und Buchführung:
     - `docs/api-reference.md`, §`<shae-ent>`, `:1213`: Der Stichpunkt über das `<shae-prop>`, das
       seinen Host einmal auflöst, fällt hier ersatzlos. Der einleitende Satz »Everything else keeps
       the parent it resolved. Two cases are worth knowing:« verliert damit einen seiner zwei Fälle
       und wird auf den verbliebenen umgestellt.
     - `docs/api-reference.md`, §`<shae-prop>`, Abschnitt `#### Finding the Host Entity` aus 9a: ein
       Absatz, dass die Bindung nachgeführt wird — ein Element, dessen Tag erst später registriert
       wird, nimmt die Properties unter sich mit; verlässt die Host-Entity den Baum, sucht die
       Property den nächsten Vorfahren; eine geänderte Slot-Zuordnung wird nachgezogen. Dazu ein
       Satz über den Fall ohne Entity: Die Property wird nirgends gesetzt und meldet das **einmal**
       über den `ConsoleLogger`, mit dem ausdrücklichen Hinweis, dass diese Meldung an
       `ConsoleLogger.sharedConfig.enable` hängt. Und ein Satz über das Timing, weil man ihn dem
       Code nicht ansieht und ein Konsument darüber stolpert: Eine Nachführung wird eine Mikrotask
       nach der Änderung wirksam, nicht im selben Schritt — wer den Baum umbaut und sofort danach
       `entNode` liest, liest den Stand von vorher.
     - `docs/cheat-sheet.md`, §`<shae-prop>`: eine Zeile für die Nachführung.
     - `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`: ein Eintrag unter
       `**Bugfix (elements):**` — ein `<shae-prop>` folgt seiner nächstgelegenen Entity, auch wenn
       diese erst später entsteht oder verschwindet; ein Eintrag unter `**New:**` für
       `ReRequestEntHostEventName`; und ein dritter unter `**Bugfix (types):**` über die
       Event-Map-Augmentierung, die keine Methodennamen mehr als Ereignisnamen führt. Den Zähler im
       `[Unreleased]`-Kopf fortschreiben.
     - `CHANGELOG.md` im Repo-Wurzelverzeichnis, Abschnitt zum 2026-08-16: ein Stichpunkt über die
       neue Abdeckung (sechs Fälle und ein Wächter in `prop-element-host.test.js`, zwei IDs in der
       e2e-Suite).
     - `packages/shadow-objects-e2e/TEST-PLAN.md`, §3.2: genau eine Zeile für den neuen Fall der
       Upgrade-Insel, mit ihren zwei IDs. §1, §1.2, §2.2 und H-4 bleiben liegen — Paket 12.
     - `Backlog.md`: `VIEW-5` (`:203`) streichen, weil behoben; die zwei Verweise darauf (`:41`,
       `:392`) mitziehen. `VIEW-6` bleibt stehen — der `subtree: false`-Fall des
       `MutationObserver` betrifft `<shae-ent>` und ist von diesem Paket nicht berührt.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`.
  Erwartung: `test:ci` **596 statt 589**, davon `shadow-objects-testing` 301 statt 294 in weiterhin
  20 Dateien (6 rote Fälle + 1 Wächter in `prop-element-host.test.js`).
  `@spearwolf/shadow-objects` bleibt bei 294, `shae-offscreen-canvas` bei 1.
  e2e **404 statt 400** (2 neue IDs × 2 Browser). Kein »Errors«-Block; `upgrade-timing` behält
  seinen Fall `no uncaught or logged errors` — die neue Warnung läuft dort nicht auf, weil eine
  Entity über der Property steht (am Prototyp geprüft). Danach
  `pnpm -F shadow-objects-testing test -- --sequence.shuffle`.
  Gegenprobe des roten Zustands vor dem Fix:
  `pnpm -F shadow-objects-e2e exec playwright test upgrade-timing --project=chromium` — erwartet
  sind genau zwei rote IDs, `upgrade-late-prop-found-its-host` und
  `upgrade-late-prop-reached-the-worker`, alles andere grün (gemessen).
  **Der wichtigste Lauf des Pakets ist `pnpm -F shadow-objects-e2e test`**, und zwar vollständig:
  `dynamic-dom` ist das einzige Netz, das den fehlenden Aufschub aus Schritt 5 fängt. Wer nur
  `test:ci` laufen lässt, sieht diesen Fehler nicht.
  Nach den Sondenläufen `packages/shadow-objects-testing/test/__screenshots__/` leeren.
- Commit: `fix(elements): let a shae-prop follow the entity that moves in above it (VIEW-003, TEST-004)`
- Verlauf:
  - Zug 0, erste Fassung (2026-08-16, Planer 9a/9b): Zusammen mit 9a geplant und gemessen. Der Kanal
    steht auf vier Messungen, die alle einzeln geprüft sind: `TARGET-PHASE {"onSelf":1}` — ein Kind
    kann am Elternteil lauschen und hört dessen eigenen Dispatch;
    `DISCONNECTED-DISPATCH {"onSelf":1,"onParent":0}` — ein Dispatch aus `disconnectedCallback`
    erreicht genau die Properties, die am gehenden Element hängen; `ORPHAN-DOC {"seen":1}` — ein
    `document`-Listener hört jede Anfrage, auch aus einem geschlossenen Shadow Root;
    `SIGNAL {"afterSame":0}` — eine gleichbleibende Antwort löst keinen Effect aus. Der zweite Weg
    aus VIEW-003 (`MutationObserver` auf die Vorfahrenkette) ist verworfen, Begründung im Bericht.
    Kein Prototyp gebaut.
  - Zug 0, Abgleich nach 9a (2026-08-16, Planer 9b): VIEW-003 und der Rest von TEST-004 bestehen
    unverändert, alle fünf geplanten roten Fälle sind noch rot — einer mit anderer Meldung als
    geplant (`RED-4`). Sieben Sondenläufe in echtem Chromium, dazu **ein Prototyp der ganzen
    Änderung samt e2e-Insel**, danach alles entfernt; Arbeitsbaum sauber, `dist/` neu gebaut,
    Baseline bestätigt: lint rc=0, `test:ci` 589, e2e 400.
    Vier Ergebnisse haben den Plan geändert:
    (1) Die gemeldete Kollision löst sich am **Auslöser** auf, nicht in `#findEntNode`: Der
    Re-Request-Weg fragt eine Mikrotask später und lässt die Frage fallen, wenn das Element weg ist
    — die Entscheidung über eine ausbleibende Antwort ist auf beiden Wegen dieselbe.
    (2) »Kein Zurücksetzen« ist umgekehrt, gemessen an `KEEP-VARIANT` gegen `RELEASE-VARIANT`.
    (3) Ohne den Aufschub wandert die Property beim Umzug ihres Hosts in die Ziel-Entity und bleibt
    dort — `dynamic-dom` 12 rot, mit Aufschub e2e 400 grün. Auf `ComponentContext`-Ebene ist dieser
    Fehler **nicht** reproduzierbar; das Netz ist die e2e-Insel.
    (4) Von den drei geplanten Wächtern ist einer falsifizierbar (`REPEAT` gegen `REPEAT-GUARDED`),
    die zwei anderen entfallen mit Begründung; dafür kommt ein sechster roter Fall dazu, der die
    umgekehrte Entscheidung hält.
    Nebenbei gemessen und in Schritt 4 eingearbeitet: `DISPATCH {"afterMount":[]}` — ein
    `<shae-ent>`, das in einem abgehängten Teilbaum entsteht, meldet sich beim Einhängen nicht
    (`#wasUpgradedInPlace` ist dort `false`). Wer einen Testfall auf den Kanal baut, benutzt
    `insertAdjacentHTML` auf einem verbundenen Knoten, nicht `mount()`.

</details>

<details>
<summary>Findings im Volltext — VIEW-002, VIEW-003, TEST-004</summary>

**VIEW-002** · Architektur & Struktur · code · **high** · Aufwand M
*shae-prop über Shadow-DOM-Grenzen hinweg an seinen Host binden*
Fundstelle laut Audit: `packages/shadow-objects/src/elements/ShaePropElement.ts:9-18`

> `findEntNode()` hangelt sich ausschließlich an `parentElement` entlang. Diese Kette endet am
> obersten Element eines Shadow Roots, weil ein Shadow Root kein Element ist. Ein `<shae-prop>`
> innerhalb eines Shadow Roots findet seinen Host-Entity daher nie, auch wenn der Host des Shadow
> Roots selbst in einem `<shae-ent>` steckt. Die Property wird still verworfen: `entNode` bleibt
> `undefined`, `viewComponent` bleibt `undefined`, der Effect setzt nichts, und es gibt weder
> Warnung noch Fehler. Das ist eine echte Asymmetrie in der öffentlichen API, denn
> `ShaeEntElement` kann genau das: sein Request-Event ist `composed`, und
> `findShadowRootHost()`/`getParentNodeForObserver()` behandeln Shadow Roots ausdrücklich. Wer eine
> Komponente mit Shadow DOM baut — der dokumentierte Anwendungsfall des Frameworks — kann Entities
> darin verschachteln, aber ihnen keine Properties geben.
>
> **Empfehlung:** `findEntNode` an die Semantik von `ShaeEntElement` angleichen: beim Erreichen von
> `parentElement == null` über `(node.getRootNode() as ShadowRoot).host` weiterlaufen, statt
> abzubrechen. Sauberer wäre, `shae-prop` auf denselben Event-Mechanismus umzustellen, den
> `shae-ent` bereits nutzt — dann teilen sich beide Elemente eine Suchstrategie und lösen VIEW-003
> gleich mit.
>
> **Beleg:** Sonde: `<shae-ent id=host-ent><div id=sd-host>` mit `shadowRoot`, darin
> `<shae-prop name=inside value=42>`:
> `PROBE-B {"entNode":null,"value":"42"}`
> Gegenprobe mit `shae-ent` an derselben Stelle — funktioniert:
> `PROBE-C {"entParent":"outer-ent"}`

**VIEW-003** · Bugs & Korrektheitsrisiken · code · **high** · Aufwand M
*shae-prop muss seinen Host erneut suchen können*
Fundstelle laut Audit: `ShaePropElement.ts:323-331`, `:357-359`, `shae-prop.ts:4`

> `findEntNode` erkennt einen Host an der Instanz-Property `isShaeEntElement`, die erst nach dem
> Upgrade existiert. Die Suche läuft genau einmal, im `connectedCallback`. Es gibt keinen
> `MutationObserver`, kein Re-Request-Event und keinen anderen Pfad, über den ein `shae-prop`
> seinen Host später nachträglich findet — anders als `shae-ent`, das mit
> `ReRequestEntParentEventName` und einem Parent-Observer mindestens einen Teil dieser Fälle
> abfängt. Für die eingebauten Elemente ist das durch `shae-prop.ts:4` abgesichert, das die eigene
> Registrierung an `whenDefined('shae-ent')` koppelt. Diese Garantie greift aber nur für das Tag
> `shae-ent` selbst: Eine Anwendung, die `ShaeEntElement` ableitet und ihr Tag später registriert,
> bekommt `shae-prop`s, die ihren Host dauerhaft verfehlen. Der Kommentar in
> `shadow-objects-e2e/src/upgrade-timing.js:56-60` benennt die Abhängigkeit, zieht aber nur die
> Konsequenz für die eingebauten Tags.
>
> **Empfehlung:** `shae-prop` dieselbe Nachjustierung geben wie `shae-ent`: entweder ein bubbelndes
> Request-Event, das der Host beantwortet (dann meldet sich ein spät upgradeter Host von selbst),
> oder beim Fehlschlag der Suche einen `MutationObserver` auf die Vorfahrenkette setzen und bei
> jeder Änderung neu suchen. Gehört zusammen mit VIEW-001 und VIEW-002 gelöst — es ist dreimal
> dasselbe Problem.

**TEST-004** · Testabdeckung & Teststrategie · harness · **medium** · Aufwand S
*shae-prop im Shadow DOM und hinter Slots testen*
Fundstelle laut Audit: `packages/shadow-objects-testing/test/prop-element-host.test.js`

> Die Hostsuche von `shae-prop` hat genau einen Test, und der prüft einen einzigen Fall: dass ein
> verschachteltes `<shae-prop>` nicht fälschlich ein anderes `<shae-prop>` für seinen Host hält.
> Das ist ein sinnvoller Test für eine reale Verwechslungsgefahr, deckt aber nur die
> Light-DOM-Kette ab. Ungeprüft bleiben: `shae-prop` innerhalb eines Shadow Roots (VIEW-002,
> defekt), `shae-prop`, dessen Host erst später upgraded (VIEW-003, defekt), `shae-prop`, das per
> Slot in einen anderen Baum projiziert wird, und `shae-prop` ohne jeden Host im Vorfahrenpfad. Der
> letzte Fall ist besonders relevant, weil er stillschweigend nichts tut — ein Anwender bekommt
> keinerlei Rückmeldung, dass seine Property nirgends ankommt.
>
> **Empfehlung:** Die vorhandene Datei um diese vier Fälle erweitern; sie läuft bereits in echtem
> Chromium und hat das passende Setup. Für den hostlosen Fall zusätzlich entscheiden, ob eine
> Warnung über den `ConsoleLogger` angebracht ist — der Logger ist in der Klasse bereits vorhanden
> und wird für unbekannte Typen genutzt.

**Optimierungspotenzial · »Eine Traversierung statt zwei«**

> `ShaeEntElement` sucht Vorfahren per Event, `ShaePropElement` per `parentElement`-Schleife. Zwei
> Strategien für dieselbe Frage bedeuten zwei Verhaltensweisen an Shadow-Grenzen, zwei
> Upgrade-Semantiken und zwei Stellen zum Reparieren. Eine gemeinsame Utility für „finde den
> nächsten Shae-Vorfahren im flattened Tree" macht VIEW-002, VIEW-003 und VIEW-009 zu einem
> einzigen Fix.

</details>

### [x] 10. ShaePropElement auf gemeinsamer Basis — geprüft, Vererbung verworfen

- Hash: `793317f`
- Ergebnis: 2 Runden · VIEW-010 erfüllt, aber mit umgekehrtem Vorzeichen: Die vom Audit verlangte Prüfung ist geleistet und ihr Ergebnis lautet **nein**. Die Begründung steht als Klassenkommentar im Code — genau das, was das Audit verlangt hat: die Entscheidung soll im Code stehen und nicht implizit aus der Vererbungslinie folgen. · Verify grün: lint rc=0, typecheck ✓, test:ci 598, e2e 404 unverändert, kein »Errors«-Block, mehrfach geshuffelt grün
- Die Zahlen, auf denen die Umkehrung beruht: **0 entfallende Zeilen, +2 neue.** Einziger Gewinn wäre ein `isShaeElement`-Flag, das im ganzen Repo nur ein Testfall über ein anderes Element liest. Kosten: ein `ns`-Attribut an einem Element, für das der Namespace nichts entscheidet, dazu ein Eintrag in `observedAttributes`. Und der Ausschlag: Mit Vererbung liest `syncShadowObjects()` den Namespace des `<shae-prop>` selbst statt den seines Hosts — der Sync im richtigen Environment fällt von 1 auf 0 Aufrufe.
- **Der eigentliche Fund dieses Pakets ist eine Testlücke.** Ein Prototyp mit Vererbung ist nachweislich kaputt und ließ **alle 705 Fälle grün** — kein einziger prüfte, in welches Environment ein `<shae-prop>` synchronisiert. Die zwei neuen Wächter schließen das. Der Reviewer hat fünf Mutationen gefahren, darunter eine isolierte, die nur den Sync-Pfad verbiegt: Jeder Wächter fängt seinen Fall **allein**, ohne Kollateralwirkung, und Wächter 1 fängt die Vererbung in beiden Schreibweisen.
- Kein CHANGELOG-Eintrag, begründet: kein Verhalten, keine Signatur, keine Datei unter `dist/` ändert sich. Der Klassenkommentar wandert allerdings über die `.d.ts` in den Tooltip jedes Konsumenten — deshalb wurde jede seiner sechs Aussagen einzeln am Code nachgeprüft. Eine trug nicht (sie beschrieb die Hostsuche von vor Paket 9a) und wurde korrigiert, samt derselben überholten Beschreibung im Paket-CHANGELOG.
- Nebenbefunde: `packages/shadow-objects/CHANGELOG.md` und `TEST-PLAN.md:105` trugen beide noch die Beschreibung der abgeschafften `parentElement`-Suche; die CHANGELOG-Stelle ist hier nachgezogen, `TEST-PLAN.md:105` gehört zu Paket 12.
- Folgen: keine. Die Klassenhierarchie ist unverändert.

- Findings: VIEW-010 (low)
- ~~Ziel: `ShaePropElement` erbt von `ShaeElement` und teilt sich mit den anderen beiden Elementen das, was sie gemeinsam haben.~~ **Ziel (umgekehrt 2026-08-16, Nutzerentscheidung):** `ShaePropElement` bleibt an `HTMLElement`, und warum das so ist, steht als Klassenkommentar im Code statt als stilles Erbe in der Vererbungslinie. Zwei Wächter halten die Entscheidung.
- Bereich: `packages/shadow-objects/src/elements/ShaePropElement.ts`, `packages/shadow-objects-testing/test/prop-element-host.test.js`
- Hängt ab von: Paket 9a, Paket 9b
- Modell: mittlere Stufe
- Nachgetragen 2026-08-16 (Planer Paket 9): Die Pakete 9a und 9b nehmen von diesem hier **nichts** vorweg. `ShaePropElement` erbt danach weiterhin von `HTMLElement`, der gemerkte `entNode` im Aufräum-Cleanup steht weiterhin da, und der Umfang dieses Pakets ist unverändert. Zwei Dinge kommen hinzu:
  - Die `ns`-Frage ist nach 9a beantwortet und muss hier nur noch in Code gegossen werden: Die Host-Anfrage eines `<shae-prop>` läuft **ohne** Namespace, weil eine Property zur nächstgelegenen Entity gehört. Erbt das Element `ShaeElement`, erbt es damit auch ein `ns`-Attribut, das nichts tut — genau der »stille Erbe«-Fall, den der Hinweis oben meint. Der Testfall `the nearest entity answers, regardless of its namespace` aus 9a hält die Regel; dieses Paket darf ihn nicht rot machen.
  - `ShaePropElement` hält nach 9b einen DOM-Listener, dessen Ziel von `entNode` abhängt (`#reRequestHostTarget`), dazu den Aufschub in `#onReRequestHost` (`#hostLookupPending`). Das ist Property-Logik und gehört nicht nach `ShaeElement` hinauf, auch wenn `<shae-ent>` etwas Ähnliches tut — die beiden lauschen auf verschiedene Ereignisse mit verschiedenen Filtern, und nur die Property-Seite schiebt ihre Antwort auf. Der Aufschub ist in 9b gemessen und begründet; wer ihn beim Hochziehen verliert, macht `dynamic-dom` rot.
- Hinweis: Wenn `ns` für eine Property bedeutungslos ist, gehört das als begründete Entscheidung in den Code — nicht als stilles Erbe.
- ~~Nachgetragen 2026-08-16 (Planer Paket 8): Ein konkreter Gewinn dieses Erbes steht nach Paket 8 fest. Der Aufräum-Cleanup in `ShaePropElement` merkt sich heute den `entNode`, nur um über ihn `syncShadowObjects()` zu erreichen — die Methode sitzt auf `ShaeElement`, und `ShaePropElement` erbt sie nicht. Nach diesem Paket ruft das Element sie selbst auf, und der gemerkte `entNode` entfällt. Die Änderung ist zwei Zeilen und gehört hierher, nicht in Paket 8.~~ **Widerlegt 2026-08-16 (Planer 10, gemessen).** Das geerbte `syncShadowObjects()` liest `this.ns` — und das ist der Namespace des `<shae-prop>`, nicht der seines Hosts. Ein `<shae-prop>` unter einem `<shae-ent ns="p10ns">` synchronisiert danach das globale Environment statt `p10ns`. Sonde in echtem Chromium, sinon-Spy auf `ShadowEnv.get('p10ns').sync`, `prop.remove()`: Ist-Zustand `nsSyncCalls: 1`, mit dem Erbe `nsSyncCalls: 0`. Der gemerkte `entNode` ist kein Notbehelf für eine fehlende Vererbung, er ist der Träger der Host-Namespace-Information. Er bleibt stehen.

**Entschieden (2026-08-16, Nutzerentscheidung nach Zug 0 dieses Pakets).** Die Prüfung, die das
Audit verlangt, fällt gegen die Vererbung aus. `ShaePropElement` bleibt an `HTMLElement`, die
Begründung wandert als Klassenkommentar in den Code — genau das, was die Empfehlung des Findings
verlangt (»die Entscheidung sollte im Code stehen und nicht implizit aus der Vererbungslinie
folgen«) —, und zwei Wächter halten sie. Das **Ziel** dieses Pakets oben ist damit umgekehrt.

Die zwei anderen Wege sind geprüft und verworfen, mit diesen Zahlen:

- **Erben.** Entfernt null Zeilen, fügt zwei hinzu, und der einzige Gewinn ist
  `isShaeElement = true`. Kostet ein `ns` in `observedAttributes` an einem Element, für das der
  Namespace nichts entscheidet — gegen die Entscheidung `:24` und gegen
  `docs/api-reference.md:1249-1251`. Der gemerkte `entNode` müsste trotzdem stehenbleiben, sonst
  synchronisiert die Property das falsche Environment (`nsSyncCalls: 0` statt `1`).
- **Schmalere gemeinsame Basis.** Eine Klasse unter `ShaeElement`, die `isShaeElement` und
  `this.style.display = 'contents'` trägt: zwei Zeilen Inhalt, eine neue Datei, eine neue Ebene in
  drei Prototypenketten. `isShaeElement` hat im ganzen Repo genau einen Leser, und der ist eine
  Zusicherung über `<shae-ent>` (`ent-element-attributes.test.js:193`).

**Abgleich (2026-08-16, Zug 0 dieses Pakets).** VIEW-010 besteht **verändert**: Der Sachverhalt
stimmt, seine Wertung ist von den Paketen 5, 8, 9a und 9b überholt. Die Fundstelle
`ShaePropElement.ts:65` zeigt heute auf `:92` (Klassendeklaration).

| Abweichung laut Finding-Text | heute | Fundstelle |
|---|---|---|
| erweitert `HTMLElement` direkt | besteht | `ShaePropElement.ts:92` |
| kein `isShaeElement`-Flag | besteht, folgenlos | `ShaeElement.ts:33` gegen `ShaePropElement.ts:95`. Im ganzen Repo ein Leser: `ent-element-attributes.test.js:193`, eine Zusicherung über `<shae-ent>`. Kein Produktionscode liest ihn; die gelesenen Marken sind `isShaeEntElement`, `isShaePropElement`, `isShaeWorkerElement` |
| »muss den Sync an seinen Host delegieren« | besteht, ist aber **richtig so** | `ShaePropElement.ts:181-183`, `:194`, `:216`. Der Sync muss in den Namespace des Hosts, und den kennt nur der Host. Gemessen, siehe unten |
| »behandelt Attribute mit einem eigenen `switch`« | besteht, ist aber keine Abweichung | Alle drei Elemente haben eine eigene Verzweigung über ihre eigenen Attribute: `ShaeEntElement.ts:401-408` (`if`/`else if`), `ShaeWorkerElement.ts:185-209` (`if`-Kette), `ShaePropElement.ts:413-431` (`switch`). Geteilt ist genau ein Zweig — `if (name === ATTR_NS)` in `ShaeElement.ts:65-69` —, und der ist für eine Property bedeutungslos |
| »der Grund, warum VIEW-002, VIEW-003 und VIEW-009 nur `shae-prop` treffen« | **gegenstandslos** | Alle drei sind behoben (Pakete 9a, 9b), ohne dass eine Zeile an der Vererbungslinie bewegt wurde. Beide Elemente teilen sich seit 9a `requestEntAncestor.ts`, eine Funktion, keine Basisklasse |

**Bilanz der Vererbung (gemessen am Prototyp, 2026-08-16).** `ShaeElement` ist keine
»Element-Basis«, sondern eine **Namespace-Basis**: Von 55 Zeilen Klassenrumpf (`ShaeElement.ts:30-84`)
sind 1 Zeile die Marke `isShaeElement` (`:33`), rund 35 Zeilen Namespace-Maschinerie (`:31`, `:35-47`,
`:52-62`, `:65-69`, dazu `updateNamespace` `:9-11`) und 13 Zeilen `syncShadowObjects()` /
`syncShadowObjectsOf()` (`:71-83`), von denen die erste `this.ns` liest. Ein `<shae-ent>` und ein
`<shae-worker>` wählen über `ns` ihr Environment; ein `<shae-prop>` wählt gar nichts — es bindet an
die nächstgelegene Entity, in welchem Namespace die auch steckt (Entscheidung 9a).

Zeilen in `ShaePropElement.ts`, die durch die Vererbung **entfallen**: **null.**
Zeilen, die **hinzukommen**: `import {ShaeElement}` (+1) und `super.attributeChangedCallback(name)`
(+1); dazu geändert `extends ShaeElement`, `static override observedAttributes = [...ShaeElement.observedAttributes, …]`
und `override` vor `attributeChangedCallback`. Netto **+2 Zeilen**.

Was sie kostet, ist am Prototyp abgelesen, nicht geschätzt:

| Kosten | gemessen |
|---|---|
| `observedAttributes` von `<shae-prop>` | `name\|value\|type\|no-trim` → `ns\|name\|value\|type\|no-trim` |
| JS-Property `ns` mit Setter, plus Attribut-Rückschreibung (`ShaeElement.ts:52-60`) | `<shae-prop>` schreibt bei jedem `ns`-Setzen ein `ns`-Attribut ins DOM bzw. entfernt es — für einen Wert, der nichts entscheidet |
| Widerspruch zur Entscheidung `:24` (»kein `ns`-Attribut für `shae-prop`«) und zu `docs/api-reference.md:1249-1251` (»The namespace plays no part in it«) | steht |

**Reproduktion (echtes Chromium, Browser-Konfiguration von `shadow-objects-testing`).** Vier
Varianten gebaut, gemessen, wieder entfernt; Arbeitsbaum sauber, `dist/` neu gebaut. Sonde:
`<shae-worker local auto-sync="off" ns="p10ns">` + `<shae-ent ns="p10ns"><shae-prop name="x" value="1">`,
danach `prop.remove()`, sinon-Spy auf `ShadowEnv.get('p10ns').sync`.

| Variante | `ShaePropElement` | Sonde | Integration | e2e |
|---|---|---|---|---|
| Ist | `extends HTMLElement`, `entNode?.syncShadowObjects()` | `nsSyncCalls: 1` | 301 grün | 404 grün |
| A — der Nachtrag aus Paket 8 | `extends ShaeElement`, `this.syncShadowObjects()` | **`nsSyncCalls: 0`** | 301 grün | 404 grün |
| B — nur die Vererbung | `extends ShaeElement`, Sync unverändert am `entNode` | — | 301 grün | — |
| D — ohne Vererbung, `entNode` weg | `ns` aus `vc.context?.ns`, `ShadowEnv.get(ns)?.sync()` | `nsSyncCalls: 1` | 301 grün | — |

Zwei Dinge stehen damit fest. Erstens: **Variante A ist kaputt und das ganze Netz sieht es nicht** —
301 Integrationstests und 404 e2e-Fälle bleiben grün, während eine Property beim Abräumen das
falsche Environment synchronisiert. Zweitens: Der gemerkte `entNode` ließe sich auch **ohne**
Vererbung räumen (Variante D), nur lohnt es nicht — D tauscht drei kommentierte Zeilen gegen eine,
handelt sich dafür eine neue Modulabhängigkeit (`ShaePropElement` → `ShadowEnv`) ein und ersetzt den
gebündelten Mikrotask-Sync durch einen sofortigen. Der `entNode` bleibt, wo er ist.

**Der Aufschub aus 9b bleibt unangetastet** (Auflage aus Paket 9b): Weg 1 fasst weder
`#onReRequestHost` (`ShaePropElement.ts:502-511`) noch `#hostLookupPending` (`:440`) noch
`#reRequestHostTarget` (`:439`) an — es wird nichts hochgezogen. `dynamic-dom` bleibt grün, weil
sich an dem Pfad keine Zeile bewegt.

**Triage der offenen Nebenbefunde und Folgen aus den Paketen 1 bis 9b (2026-08-16, Planer 10).**
Zwei Einträge betreffen dieses Paket unmittelbar und sind oben abgearbeitet; der Rest steht
unverändert.

- **Der gemerkte `entNode` im Cleanup** (Nachtrag Paket 8) — **echte Folge, hier entschieden:** Er
  bleibt. Die Begründung steht als durchgestrichener Nachtrag oben und wird von Schritt 1 in einen
  Kommentar überführt, damit die nächste Lesart nicht wieder bei »das ist nur eine Krücke« landet.
- **Der Mikrotask-Aufschub** (Warnung Paket 9b) — **echte Folge, hier entschieden:** unberührt,
  siehe Absatz darüber. Ziel: erledigt mit diesem Paket.
- `src/elements/events.ts` exportieren oder löschen — vorbestehend, Ziel **Paket 12**. Unberührt:
  Dieses Paket schreibt nicht in die Datei. Die zwei Methodenzeilen in der Augmentierung hat 9b
  geräumt; der Rest der Datei steht unverändert (`events.ts:22-32`).
- `dispatchReRequestParentRoots` kennt keinen Absender (`ComponentContext.ts:365-371`) —
  vorbestehend, Ziel **Backlog**. Unberührt.
- `isBelow`-Aufstieg bleibt n²/2 (`ShaeEntElement.ts:25-30`) — echte Folge, Ziel **Backlog**.
  Unberührt; dieses Paket fügt keinen Aufrufer hinzu.
- `utils/props-utils.ts:19-27` schreibt ausgelieferte Change Trails fort — vorbestehend, Ziel
  **Backlog**. Unberührt.
- Tippfehler `unsubcribe` (`ShaeEntElement.ts:172`, `:178`) — Symptom, Ziel **Paket 12**. Dieses
  Paket fasst `ShaeEntElement.ts` nicht an.
- `ComponentContext`-Methoden fehlen in `docs/api-reference.md` — vorbestehend, Ziel **Paket 12**.
  Unberührt.
- `ComponentContext.test.js` teilt einen Context über alle Fälle — echte Folge, Ziel **Backlog**.
  Unberührt.
- Ein verschobener `<slot>` benachrichtigt die Entity nicht, die er verlässt — echte Folge, Ziel
  **Backlog**, steht in `docs/api-reference.md` als bekannte Grenze. Unberührt.
- `Element.moveBefore` ist für `<shae-ent>` ein Abriss — vorbestehend, Ziel **Backlog**. Unberührt.
- `waitUntil`/`testAsyncAction` teilen sich 5000 ms — Symptom, Ziel **Backlog**. Unberührt.
- `packages/shadow-objects-testing/test/__screenshots__/` wird von keinem Skript geleert — Symptom,
  Ziel **Backlog**, **weiterhin aktiv**: Die Sondenläufe dieses Zugs haben das Verzeichnis erneut
  gefüllt, es ist von Hand geleert worden.
- `TEST-PLAN.md` §1, §1.2, §2.2, H-4 — Symptome, Ziel **Paket 12**. Unberührt. Dazu neu:
  `TEST-PLAN.md:105` beschreibt die Hostsuche noch als `parentElement`-Lauf über
  `isShaeEntElement` — nach 9a/9b falsch, dieselbe Datei, dasselbe Ziel.
- Die zwei `biome.json`-Infos — vorbestehend, Ziel **Backlog**. Unberührt.
- `shae-prop.ts:4` koppelt die Registrierung an `whenDefined('shae-ent')` — Ziel **Paket 12**.
  Unberührt; Weg 1 ändert nichts an der Registrierung.
- **Neu (Planhygiene, 2026-08-16, Planer 10):** Paket 9b stand auf `[ ]`, obwohl es mit `4eda9b6`
  umgesetzt ist und der Kopf es als erledigt führt. Wer nach der Regel »beim obersten Paket ohne
  `[x]` einsteigen« wieder aufsetzt, wäre in 9b gelandet. Marke auf `[x]` gesetzt, kein
  Code-Bezug.

**Der Restplan bleibt** (2026-08-16, Planer 10): Schnitt und Reihenfolge der Pakete 11 bis 14
ändern sich nicht. Ein Eintrag wächst — Paket 12 bekommt `TEST-PLAN.md:105` zur Liste der
nachzuziehenden Stellen —, er ist dort eingetragen. Paketnummern werden nicht neu vergeben.

<details>
<summary>Detailplan Paket 10</summary>

- Dateien: `packages/shadow-objects/src/elements/ShaePropElement.ts`,
  `packages/shadow-objects-testing/test/prop-element-host.test.js`,
  `view-layer-remediation-plan.md` (Abschnitt »Entscheidungen«)
- Der Weg in einem Satz: `<shae-prop>` bleibt, wo es in der Klassenhierarchie steht, sagt im Code
  warum, und zwei Wächter machen es rot, wenn jemand es doch verschiebt.
- Vorgehen:
  1. **Klassenkommentar an `ShaePropElement`** (`ShaePropElement.ts`, direkt über der
     Klassendeklaration `:92`, an die Stelle, wo `TYPES` endet). Wörtlich so, wie er im Code stehen
     soll — kein Rückblick auf einen Vorzustand, keine Finding-ID, keine Paketnummer:

     ```ts
     /**
      * Sets a property on the entity above it.
      *
      * Unlike `<shae-ent>` and `<shae-worker>`, this element does not extend `ShaeElement` and has
      * no namespace of its own. `ShaeElement` exists for elements that pick an environment: their
      * `ns` attribute names the one they live in, and everything they do goes there. A property
      * picks nothing. It belongs to the closest entity above it in the flattened tree, whatever
      * namespace that entity happens to be in — proximity decides, not membership. An `ns` on a
      * `<shae-prop>` would therefore be an attribute that changes no answer, and inheriting one
      * would put it into `observedAttributes` for every reader to trip over.
      *
      * That is also why the sync runs through the host: the environment that has to hear about a
      * property is the one the host entity lives in, and this element is the wrong place to ask.
      * `entNode.syncShadowObjects()` reaches it; a sync of this element's own would reach the
      * global environment and leave a namespaced host waiting.
      *
      * The marker for this element is `isShaePropElement`, beside `isShaeEntElement` and
      * `isShaeWorkerElement`. Each names one tag, and the host lookup depends on that: an element
      * asking for the entity above it must not be answered by another property.
      */
     ```
  2. **Kommentar am `entNode` im Bindungs-Effect** (`:181-183`). Der vorhandene Satz bleibt, ein
     zweiter kommt dazu, damit die Zeile beim nächsten Aufräumen nicht wieder als Krücke gelesen
     wird. Wörtlich:

     ```ts
     // untracked on purpose: the host is where the sync has to go, not something this binding
     // depends on. And it is the host and not this element, because the host carries the
     // namespace — the environment holding this property is its, and nothing else knows which.
     const entNode = this.entNode$.value;
     ```
  3. **Wächter 1** in `prop-element-host.test.js`, in den Block `shae-prop host lookup`, direkt
     hinter `does not identify itself as an entity element`:
     `it('has no namespace of its own', …)` — `expect(prop.constructor.observedAttributes).to.not.include('ns')`
     mit der Meldung `a namespace decides nothing for a property`, dazu
     `expect(prop.ns).to.be.undefined` mit `and the element carries none`.
     Mutation, die ihn rot macht: `class ShaePropElement extends ShaeElement` mit
     `static override observedAttributes = [...ShaeElement.observedAttributes, …]`. Gemessen:
     `expected [ Array(5) ] to not include 'ns'`.
  4. **Wächter 2** in `prop-element-host.test.js`, ans Ende des Blocks
     `shae-prop follows its host entity` (der hat bereits `afterEach(unmountAll)`, und `unmountAll`
     räumt jeden `ShadowEnv` mit ab): `it('syncs the environment of its host entity when the binding ends', …)`.
     Aufbau: `<shae-worker local auto-sync="off" ns="…" id="…">` plus
     `<shae-ent ns="…" token="host"><shae-prop name="x" value="1">`, ein `await nextTask()`, dann
     `sinon.spy(ShadowEnv.get(…), 'sync')`, `prop.remove()`, `await nextTask()`, und
     `expect(sync.callCount).to.be.greaterThan(0)` mit der Meldung
     `the environment of the host entity is the one that has to hear about it`.
     `ShadowEnv` kommt aus `@spearwolf/shadow-objects`, `sinon` ist in der Datei schon importiert;
     `'@spearwolf/shadow-objects/shae-worker.js'` kommt als Import dazu.
     Mutation, die ihn rot macht: `this.syncShadowObjects()` statt `entNode?.syncShadowObjects()`
     in `:194`. Gemessen: `expected 0 to be above 0`.
     **Dieser Wächter schließt die einzige gemessene Lücke des Netzes** — ohne ihn bleiben alle
     705 Fälle grün, während die Property ins falsche Environment synchronisiert.
  5. ~~**`view-layer-remediation-plan.md`, Abschnitt »Entscheidungen«**~~ — **bereits erledigt**
     (2026-08-16, mit der Nutzerentscheidung). Der Vererbungsteil steht durchgestrichen samt
     Begründung und Messwerten; der übrige Teil der ursprünglichen Zeile (gemeinsame Utility,
     Re-Request-Kanal) steht als von 9a/9b eingelöst darüber. Der Implementierer fasst den
     Abschnitt nicht noch einmal an.
  6. **Keine Änderung an Dokumentation und Changelogs.** Begründung, damit sie niemand nachträgt:
     Es ändert sich kein Verhalten, keine öffentliche Signatur, kein Attribut und keine Datei unter
     `dist/`. `docs/api-reference.md:1249-1251` sagt die Regel bereits (»The namespace plays no part
     in it«), und die Attributtabelle (`:1270-1275`) führt vier Zeilen ohne `ns`. Ein
     CHANGELOG-Eintrag für einen Kommentar und zwei Tests wäre Rauschen. Wer beim Durchgang von
     Paket 12 dieselbe Frage stellt, findet hier die Antwort.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`.
  Erwartung: `test:ci` **598 statt 596**, davon `shadow-objects-testing` **303 statt 301** in
  weiterhin 20 Dateien (zwei Wächter in `prop-element-host.test.js`).
  `@spearwolf/shadow-objects` bleibt bei 294, `shae-offscreen-canvas` bei 1.
  e2e **unverändert 404** — dieses Paket fasst keine Seite und keinen Spec der e2e-Suite an; jede
  Abweichung dort ist ein Fund und gehört in diesen Plan.
  Kein »Errors«-Block in der Zusammenfassung.
  Gegenprobe beider Wächter, einzeln, sonst sind sie wertlos: `ShaePropElement` probeweise auf
  `extends ShaeElement` umstellen → Wächter 1 rot; `:194` probeweise auf `this.syncShadowObjects()`
  umstellen → Wächter 2 rot. Beide Male die Änderung zurücknehmen und `dist/` neu bauen.
  Nach den Sondenläufen `packages/shadow-objects-testing/test/__screenshots__/` leeren.
- Commit: `refactor(elements): state why a shae-prop has no namespace of its own (VIEW-010)`
- Verlauf:
  - Zug 0 (2026-08-16, Planer 10): VIEW-010 gegen die Quelle geprüft — der Sachverhalt besteht, seine
    Wertung ist überholt. Vier Varianten in echtem Chromium gebaut und gemessen (Ist, A, B, D), dazu
    zwei Sonden und zwei Wächter-Entwürfe, alles anschließend entfernt; `dist/` neu gebaut,
    Arbeitsbaum sauber. Baseline bestätigt: `test:ci` 596 (294 + 1 + 301), e2e 404, `pnpm lint`
    rc=0. Drei Ergebnisse tragen den Vorschlag: (1) Die Vererbung entfernt **null** Zeilen aus
    `ShaePropElement.ts` und fügt zwei hinzu. (2) Der einzige behauptete Gewinn — der gemerkte
    `entNode` — ist widerlegt: `this.syncShadowObjects()` synchronisiert den Namespace des
    `<shae-prop>`, nicht den seines Hosts (`nsSyncCalls: 0` gegen `1`). (3) Diese Kaputtheit ist von
    keinem der 705 vorhandenen Fälle zu sehen — die Lücke wird von Wächter 2 geschlossen. Ergebnis:
    Rückfrage an den Nutzer, weil eine Zeile aus »Entscheidungen« kippt.
  - Zug 0, Nachtrag (2026-08-16, Planer 10, nach der Nutzerentscheidung): Weg 1 freigegeben. Ziel
    des Pakets umgekehrt, die zwei verworfenen Wege stehen nur noch als geprüft und mit Zahlen da,
    nicht mehr als Wahl. Klassenkommentar und `entNode`-Kommentar wörtlich vorformuliert — sie sind
    das eigentliche Produkt dieses Pakets und tragen für jemanden, der weder Audit noch diesen Lauf
    kennt. Modell auf mittlere Stufe gesenkt: Der Umfang ist ein Kommentar und zwei bereits
    gemessene Testfälle; die Sorgfalt steckt in der Gegenprobe, und die steht Schritt für Schritt
    im Verify. Testzahlen gegen die nachgemessene Baseline geprüft: `test:ci` 596 → **598**
    (`shadow-objects-testing` 301 → **303**), e2e **404 unverändert**.

</details>

<details>
<summary>Finding im Volltext — VIEW-010</summary>

**VIEW-010** · Architektur & Struktur · code · **low** · Aufwand M
*ShaePropElement an die gemeinsame Elementbasis angleichen*
Fundstelle laut Audit: `packages/shadow-objects/src/elements/ShaePropElement.ts:65`

> `ShaePropElement` erweitert `HTMLElement` direkt, während `ShaeEntElement` und
> `ShaeWorkerElement` über `ShaeElement` laufen und darüber `ns$`, das `ns`-Attribut,
> `syncShadowObjects()` und die gemeinsame `attributeChangedCallback`-Behandlung erben. Die Folge
> sind lauter kleine Abweichungen: `shae-prop` hat kein `isShaeElement`-Flag, muss den Sync über
> `entNode.syncShadowObjects()` an seinen Host delegieren und behandelt Attribute mit einem eigenen
> `switch`. Für ein Element, das im selben Markup neben den beiden anderen steht, ist das eine
> unnötig andere Bauart und der Grund, warum VIEW-002, VIEW-003 und VIEW-009 nur `shae-prop`
> treffen.
>
> **Empfehlung:** Prüfen, ob `ShaePropElement` sinnvoll von `ShaeElement` erben kann. Falls der
> Namespace für ein Property tatsächlich bedeutungslos ist, wäre die Alternative eine schmalere
> gemeinsame Basisklasse für das, was beide teilen — die Entscheidung sollte im Code stehen und
> nicht implizit aus der Vererbungslinie folgen.

</details>

### [x] 11. Typkonvertierung als Tabelle

- Hash: `282603b`
- Ergebnis: 2 Runden · der Optimierungspunkt »Typkonvertierung als Tabelle« ist eingelöst · Verify grün: lint rc=0, typecheck ✓, test:ci 631 (`@spearwolf/shadow-objects` 327 in 14 Dateien, `shadow-objects-testing` unverändert 303 in 20), e2e 404 unverändert, `dist/` 194 → 198, kein »Errors«-Block, beide Pakete geshuffelt grün
- Der `switch` mit 42 Fallmarken im reaktiven Effect ist ersetzt durch 29 Gruppen aus Namensliste und Konverterfunktion in `packages/shadow-objects/src/elements/propValueConverters.ts`, modulintern (kein Re-Export über `index.ts`). Die 13 Alias-Marken teilen das Funktionsobjekt jetzt **strukturell** statt per Disziplin. Die zweite Namensliste `TYPES`, die mit den Fallmarken übereinstimmen musste ohne dass etwas es erzwang, ist ersatzlos weg — `#readTypeAttribute` fragt die Map.
- **Nachweis der Verhaltensgleichheit, zweifach und unabhängig:** Der Implementierer hat `TYPES`, `switch`-Rumpf und Fallmarken per Skript aus `git show HEAD:…` gezogen und eine Referenzfunktion gebaut — 29/29 Gruppen, 42/42 Schlüssel, 2268 Wertvergleiche ohne Abweichung; gegen eine eingebaute Mutation rc=1. Der Reviewer hat es unabhängig anders gemessen: beide Fassungen gebündelt, als zwei registrierte Custom Elements geladen und über drei Eingabepfade getrieben — **42 Typen × 81 Werte × 3 Pfade = 10206 Vergleiche, 0 Abweichungen**, verglichen wurden Wert, exakter Typ, TypedArray-Konstruktor, Fehlerklasse und Meldungstext. Drei eigene Mutationen erzeugten 111, 210 und 241 Abweichungen.
- Zwei Aufräumpunkte aus Paket 5 erledigt: `value != null` ist seit `??` toter Code und gestrichen; der `default:`-Zweig ist über den Attributpfad unerreichbar und aufgelöst. Genau eine messbare Differenz bleibt und ist im Code als Regel festgehalten: Eine Unterklasse, die `type$` direkt schreibt, bekommt für einen unbekannten Namen keine Warnung mehr — im Repo existiert kein solcher Schreiber.
- Ein neuer Fund, mitbehoben: Die Typtabelle der Dokumentation bildete `number` und `float` gemeinsam auf `parseFloat` ab (`value="3.14abc"` gibt aber `NaN`) und ließ `bigint`, `hex`, `oct`, `bin` ganz aus. Zusätzlich war die Trennverhalten-Zeile falsch — `number[]`, `float[]`, `int[]`, `integer[]` trennen **nur** an `\s+`, `type="int[]" value="1,2,3"` ergibt also `[1]` statt eines Fehlers. Beide Tabellen sind jetzt maschinell gegen den Code geprüft: `api-reference.md` nennt alle 42 Namen ausdrücklich und richtig einsortiert.
- Nebenbefunde: Zwei Mutationen überlebten anfangs die gesamte Suite inklusive der 111 Netzfälle (`int` auf `Math.trunc(Number(…))`, `string` auf `.trim()`); beide sind jetzt durch je eine Zeile geschlossen. · `packages/shadow-objects-testing/test/prop-element-types.test.js:11` beschreibt im Kopfkommentar weiterhin »a `switch` keyed by `type`« — Ziel Paket 12.
- Folgen: Vier neue Dateien unter `dist/` (194 → 198), als bewusste Entscheidung im Paket-CHANGELOG vermerkt; `dist/package.json` ist byte-identisch zu einem Build von HEAD, `exports` und `sideEffects` unverändert. Die öffentliche API ändert sich nicht.

- Findings: — (Optimierungspunkt »Typkonvertierung als Tabelle«)
- Ziel: Jeder Typname zeigt auf eine eigene Konverterfunktion; der Effect ruft nur noch auf, statt zu verzweigen.
- Bereich: `packages/shadow-objects/src/elements/ShaePropElement.ts`, neu `packages/shadow-objects/src/elements/propValueConverters.ts` und `propValueConverters.spec.ts`, dazu `packages/shadow-objects/docs/api-reference.md`, `docs/cheat-sheet.md`, `packages/shadow-objects/CHANGELOG.md`, `CHANGELOG.md`
- Hängt ab von: Paket 3, Paket 5
- Modell: mittlere Stufe
- Nachgetragen 2026-08-16 (Planer Paket 4): Die fünf Alias-Marken ohne eigenen Testfall (`string[]`, `hexadecimal[]`, `octal[]`, `binary[]`, `boolean[]`, dazu `integer[]`) sind hier der einzige unbewachte Punkt — beim Aufbau der Map bekommt jeder dieser Schlüssel denselben Konverter wie seine Kurzform, und das prüft niemand automatisch. Einmal von Hand gegen `ShaePropElement.ts:171-307` abgleichen.
- Nachgetragen 2026-08-16 (Planer Paket 5): Der `try`/`catch` aus Paket 5 liegt um den gesamten `switch`. Beim Umbau zur Tabelle wandert er um den Aufruf des Konverters, nicht in die einzelnen Konverterfunktionen — sonst steht dieselbe Fehlerbehandlung 29-mal da. Der Fall `the conversion failure is reported through the ConsoleLogger` in `prop-element-types.test.js` hält die Stelle.
- Nachgetragen 2026-08-16 (Planer Paket 3): Die Map hat 42 Schlüssel und 29 verschiedene Konverter — die Zahlen im Optimierungspunkt stimmen nicht. Der `default:`-Zweig (`:300-306`) ist unerreichbar, weil `#readTypeAttribute` unbekannte Namen bereits abfängt und `type$` auf `undefined` setzt; er entfällt ersatzlos, statt als Fallback in die Map zu wandern (Fund 3). Die Spec aus Paket 3 ist das Netz: Sie muss diesen Umbau unverändert überstehen.
- **Berichtigt 2026-08-16 (Planer Paket 11, gemessen).** Der Nachtrag des Planers 4 zu den fünf Alias-Marken benennt die falschen Namen. Nachgerechnet über alle 86 `(type, value)`-Paare, die `prop-element-types.test.js` festnagelt, jedes gegen alle 29 Zweigkörper gehalten: Die sechs genannten Alias-Marken (`string[]`, `hexadecimal[]`, `octal[]`, `binary[]`, `boolean[]`, `integer[]`) haben sehr wohl eine Zeile, die sie von jedem fremden Konverter trennt — `octal[]` mit `17 7` etwa liefert unter dem Hex-Konverter `[23, 7]` statt `[15, 7]`. Unbewacht sind vier **andere** Namen: `number` (jeder geprüfte Wert liefert unter `float` dasselbe), `float[]` und `int[]` und `integer[]` (alle drei ununterscheidbar von `number[]`). Der Detailplan unten schließt diese vier und ersetzt den Handabgleich durch einen maschinellen.

<details>
<summary>Detailplan Paket 11</summary>

**Abgleich (2026-08-16, Zug 0 dieses Pakets).** Der Optimierungspunkt besteht; alle Zahlen sind
neu ausgezählt, keine geschätzt.

| Größe | Wert | Fundstelle |
|---|---|---|
| Typnamen | **42** | `const TYPES` (`ShaePropElement.ts:47-90`) |
| `case`-Marken | **42** | `:269-395` |
| Zweigkörper | **29** | 17 mit einem Namen, 12 mit mehreren; 13 der 42 Namen sind Alias-Marken |
| TypedArray-Varianten | **11** | `:349-391` |
| Datei gesamt | **593 Zeilen** | davon **215** für die Konvertierung: 44 Zeilen `TYPES` plus 170 Zeilen Effect |

Die Bestätigung der Zahlen aus Paket 3 ist damit vollständig — 42 / 42 / 29 / 11, nicht die 40
und 25 des Audit-Texts.

Wo heute was liegt:

| Sache | Zeilen |
|---|---|
| Konvertierungs-Effect (der dritte `createEffect` im Konstruktor) | `:250-419` |
| `value != null` in der Bedingung | `:264` |
| `try` | `:267` |
| `switch (type)` | `:268-404` |
| `default:`-Zweig mit `logger.warn` | `:397-403` |
| `catch` mit `logger.error` und `value = undefined` | `:405-415` |
| `valueOut$.set(value)` | `:418` |
| Typprüfung `TYPES.has(type)` | `:579`, in `#readTypeAttribute` (`:577-588`) |
| `TRUTHY_VALUES`-Import, nur vom `switch` gebraucht | `:4`, benutzt auf `:307` und `:346` |

**Maschinell nachgeprüft, und das ist der eigentliche Befund des Abgleichs:** Die 42 Namen stehen
heute **zweimal** in der Datei — einmal in `TYPES`, einmal als `case`-Marken. Beide Listen sind
zeichengleich, in derselben Reihenfolge, ohne Dubletten und ohne Lücke. Nichts im Repo erzwingt
das. Fällt ein Name aus `TYPES`, wird er stumm abgelehnt; fällt eine `case`-Marke weg, wird er
stumm als String durchgereicht. Genau diese Doppelung löst der Umbau auf, und sie ist der
stärkere Grund für ihn als die Testbarkeit.

**Bilanz — was der Umbau bringt und was er kostet.** Paket 10 ist an dieser Rechnung gescheitert;
hier fällt sie anders aus.

| | Zahl |
|---|---|
| Zeilen heute für die Konvertierung | 215 (44 `TYPES` + 170 Effect + 1 Import) |
| Zeilen danach | 88 im neuen Modul + 36 im Effect = **124** |
| `ShaePropElement.ts` | 593 → **414 Zeilen** |
| Namenslisten, die übereinstimmen müssen | 2 → **1** |
| Konverter, die ohne DOM und ohne Chromium aufrufbar sind | 0 → **29** |
| Neue Dateien unter `dist/` | +4 (194 → 198) |
| Öffentliche API | unverändert |

Die 88 Zeilen des neuen Moduls sind kein Schätzwert: Der Planer hat es geschrieben, mit `esbuild`
übersetzt, mit `tsc` unter den `strict`-Schaltern des Repos geprüft (rc=0) und mit `biome check`
formatiert (unverändert durchgelaufen). Es ist gegen den heutigen `switch` differenziell gemessen —
2268 Vergleiche, 0 Abweichungen. Der Weg ist also nicht entworfen, sondern belegt.

**Der Weg: 29 Gruppen, nicht 42 Einträge.** Die Map wird nicht als Liste von 42 Paaren geschrieben,
sondern als Liste von 29 Gruppen — je Gruppe die Namen, die sie bedienen, und die **eine** Funktion,
die sie teilen. Das ist genau die Form des `switch`, den sie ersetzt: Fallmarken plus Rumpf. Zwei
Dinge folgen daraus, und beide sind der Grund für die Form:

- Alias-Marken teilen sich das Funktionsobjekt **strukturell**. Niemand muss daran denken; die
  Alternative (`['hex[]', toRadixList(16)], ['hexadecimal[]', toRadixList(16)]`) wäre verhaltensgleich,
  aber zwei verschiedene Objekte, und der Identitätstest unten hinge in der Luft.
- Der Abgleich gegen den `switch` wird zu **einem** Vergleich zweier gleich geformter Listen statt
  zu 42 Einzelblicken.

**Dateien:**

- `packages/shadow-objects/src/elements/propValueConverters.ts` — **neu**, modulintern.
  Wird **nicht** aus `index.ts` re-exportiert. Begründung: `index.ts` macht mit
  `export * from './elements/ShaePropElement.js'` alles öffentlich, was dort exportiert wird — die
  Map muss deshalb in eine eigene Datei, sonst friert sie 29 Funktionssignaturen im API-Vertrag ein.
  Der Optimierungspunkt verlangt Testbarkeit und Erweiterbarkeit **innerhalb** des Pakets, keine
  öffentliche Konverter-Registry. Sie später zu exportieren ist additiv und jederzeit möglich.
- `packages/shadow-objects/src/elements/propValueConverters.spec.ts` — **neu**, vitest/happy-dom im
  Kernpaket. Specs sind vom Lib-Transpile ausgenommen (`build.mjs:39`), diese Datei kostet in `dist/`
  nichts.
- `packages/shadow-objects/src/elements/ShaePropElement.ts` — `TYPES` und `switch` raus, Aufruf rein.
- `packages/shadow-objects/docs/api-reference.md`, `docs/cheat-sheet.md` — die Typtabelle richtigstellen.
- `packages/shadow-objects/CHANGELOG.md`, `CHANGELOG.md` (Wurzel).

**Bewusste Entscheidung zu `dist/`.** Der Umbau legt vier Dateien unter `dist/src/elements/` an —
`propValueConverters.js`, `.js.map`, `.d.ts`, `.d.ts.map` —, die Dateizahl geht von 194 auf 198.
Die `exports`-Map wird **nicht** erweitert, `dist/package.json` behält seine Form, `dist/bundle.js`
bleibt eine Datei, und `sideEffects` bleibt unangetastet (die Liste ist eine Positivliste; ein nicht
gelistetes Modul gilt als nebenwirkungsfrei, und das ist es). Für einen Konsumenten ist die neue
Datei über keinen Einstiegspunkt erreichbar. `CLAUDE.md` verlangt für jede Änderung an der
`dist/`-Dateiliste eine bewusste Entscheidung mit CHANGELOG-Eintrag; beides ist hiermit getroffen.

**Vorgehen:**

1. **Vor jeder Änderung: die Referenz einfrieren.** Aus `git show HEAD:packages/shadow-objects/src/elements/ShaePropElement.ts`
   ein Wegwerf-Skript im Scratchpad bauen (nicht ins Repo), das

   - die `TYPES`-Liste per Regex `^\s*'(.*?)',$` aus dem `new Set([…])`-Block zieht → 42 Namen in Reihenfolge,
   - den `switch`-Rumpf von `switch (type) {` bis `default:` ausschneidet und mit
     `new Function('type', 'input', 'TRUTHY_VALUES', "let value = input; switch (type) {" + body + "} return value;")`
     zu einer Referenzfunktion macht — **abgeschrieben wird nichts**, der committete Code ist die Wahrheit,
   - aus denselben Zeilen die 29 Fallmarken-Gruppen ableitet (Marken sammeln, bei `break;` abschließen).

   Erwartung, vom Planer gemessen: 42 Namen, 29 Gruppen, 42 Namen in Gruppen. Weicht das ab, ist das
   Skript falsch, nicht der Code.

2. **`propValueConverters.ts` anlegen.** Genau diese Form, `TRUTHY_VALUES` aus `../utils/constants.js`:

   ```ts
   export type PropValueConverter = (value: string) => unknown;

   const words = (value: string): string[] => value.split(/\W+/);
   const fields = (value: string): string[] => value.split(/\s+/);

   const toRadix = (base: number): PropValueConverter => (value) => parseInt(value, base);
   const toRadixList = (base: number): PropValueConverter => (value) => words(value).map((v) => parseInt(v, base));

   type NumericArrayCtor = new (values: number[]) => ArrayBufferView;
   type BigIntArrayCtor = new (values: bigint[]) => ArrayBufferView;

   const toNumericArray = (Ctor: NumericArrayCtor, split: (value: string) => string[]): PropValueConverter =>
     (value) => new Ctor(split(value).map((v) => Number(v)));
   const toBigIntArray = (Ctor: BigIntArrayCtor): PropValueConverter =>
     (value) => new Ctor(words(value).map((v) => BigInt(v)));

   const toBoolean: PropValueConverter = (value) => TRUTHY_VALUES.has(value.toLowerCase());

   const CONVERTER_GROUPS: ReadonlyArray<readonly [readonly string[], PropValueConverter]> = [ … ];

   export const propValueConverters: ReadonlyMap<string, PropValueConverter> = new Map(
     CONVERTER_GROUPS.flatMap(([names, convert]) => names.map((name) => [name, convert] as const)),
   );
   ```

   `biome` formatiert die gecurryten Pfeilfunktionen mehrzeilig um — das ist so richtig und vom
   Planer geprüft. **Eine `Map`, kein Objektliteral**: `'toString' in {}` ist `true`, und ein
   Typname ist das, was im Markup steht. Der Kommentar an der Map sagt das.

   Die 29 Gruppen, in der Reihenfolge des `switch`:

   | # | Namen | Konverter |
   |---|---|---|
   | 1 | `string`, `text` | `(value) => value` |
   | 2 | `number` | `(value) => Number(value)` |
   | 3 | `bigint` | `(value) => BigInt(value)` |
   | 4 | `float` | `(value) => parseFloat(value)` |
   | 5 | `int`, `integer` | `toRadix(10)` |
   | 6 | `hex`, `hexadecimal` | `toRadix(16)` |
   | 7 | `oct`, `octal` | `toRadix(8)` |
   | 8 | `bin`, `binary` | `toRadix(2)` |
   | 9 | `bool`, `boolean` | `toBoolean` |
   | 10 | `[]`, `text[]`, `string[]` | `words` |
   | 11 | `number[]` | `(value) => fields(value).map((v) => Number(v))` |
   | 12 | `float[]` | `(value) => fields(value).map((v) => parseFloat(v))` |
   | 13 | `int[]`, `integer[]` | `(value) => fields(value).map((v) => parseInt(v, 10))` |
   | 14 | `hex[]`, `hexadecimal[]` | `toRadixList(16)` |
   | 15 | `oct[]`, `octal[]` | `toRadixList(8)` |
   | 16 | `bin[]`, `binary[]` | `toRadixList(2)` |
   | 17 | `bool[]`, `boolean[]` | `(value) => words(value).map((v) => TRUTHY_VALUES.has(v.toLowerCase()))` |
   | 18 | `int8array` | `toNumericArray(Int8Array, words)` |
   | 19 | `uint8array` | `toNumericArray(Uint8Array, words)` |
   | 20 | `uint8clampedarray` | `toNumericArray(Uint8ClampedArray, words)` |
   | 21 | `int16array` | `toNumericArray(Int16Array, words)` |
   | 22 | `uint16array` | `toNumericArray(Uint16Array, words)` |
   | 23 | `int32array` | `toNumericArray(Int32Array, words)` |
   | 24 | `uint32array` | `toNumericArray(Uint32Array, words)` |
   | 25 | `float32array` | `toNumericArray(Float32Array, fields)` |
   | 26 | `float64array` | `toNumericArray(Float64Array, fields)` |
   | 27 | `bigint64array` | `toBigIntArray(BigInt64Array)` |
   | 28 | `biguint64array` | `toBigIntArray(BigUint64Array)` |
   | 29 | `json` | `(value) => JSON.parse(value)` |

   **Die Zeile, die man beim Abtippen falsch macht, ist Nummer 25 und 26**: `float32array` und
   `float64array` trennen an `\s+`, die neun anderen TypedArrays an `\W+`. Ebenso trennen die
   Gruppen 11 bis 13 an `\s+`, die Gruppen 10 und 14 bis 17 an `\W+`. Diese Asymmetrie ist im
   `switch` unsichtbar und in der Tabelle ablesbar — das ist der halbe Gewinn des Umbaus.

3. **Der maschinelle Abgleich, bevor irgendetwas anderes passiert.** Das Wegwerf-Skript aus Schritt 1
   um drei Prüfungen erweitern und gegen das neue Modul laufen lassen (das Modul mit
   `pnpm exec esbuild … --format=esm` in eine `.js` übersetzen und importieren):

   1. **Struktur.** Die Map von vorn nach hinten durchlaufen und benachbarte Schlüssel, die auf
      dasselbe Funktionsobjekt zeigen, zu Gruppen zusammenfassen. Diese Gruppenliste muss der aus
      dem `switch` extrahierten **zeichengleich und in derselben Reihenfolge** entsprechen. Ein
      vergessener, ein doppelter und ein vertauschter Schlüssel fallen hier auf, ohne dass jemand
      hinsieht.
   2. **Schlüssel.** `[...propValueConverters.keys()]` gegen die 42 Namen aus `TYPES`, als geordnete Liste.
   3. **Verhalten.** Jeden der 42 Schlüssel gegen einen Probenkorpus von rund 50 Strings laufen
      lassen und mit der Referenzfunktion vergleichen — Wert **und** Typ, bei TypedArrays auch der
      Konstruktor, bei einem Wurf der Name der Fehlerklasse. Der Korpus wird bewusst nicht minimiert:
      Der Planer hat gemessen, dass schon zwei Proben (`42.5` und der Leerstring) alle 406 Paare der
      29 Zweigkörper trennen — ein Korpus von 50 ist also um ein Vielfaches redundant, und genau das
      ist gewollt. Enthalten sein müssen mindestens: `''`, `' '`, `'  1  2  '`, `'hello world'`,
      `'42.5'`, `'3.14abc'`, `'12abc'`, `'1.9 2.9'`, `'1.5abc 2'`, `'ff 0a'`, `'17 7'`, `'1011 110'`,
      `'yes no on off'`, `'a, b, c'`, `'1 -2 3.5'`, `'1.5 -2.5'`, `'1 2 300'`, `'1,2,3'`, `'1;2;3'`,
      `'1-2'`, `'-1 2'`, `'9007199254740993'`, `'{"a":1,"b":[2,3]}'`, `'{oops'`, `'1 x 3'`, `'abc'`,
      `'zz'`, `'9'`, `'2'`, `'a b'`, `'0x10'`, `'.a b'`, `'1e3'`.

   **Erwartung, vom Planer bereits gefahren:** `structure: 29 · 29 · IDENTICAL`, `keys: 42 · 42 · IDENTICAL`,
   `2268 behaviour comparisons · 0 mismatches`, rc=0. Der Planer hat das Skript außerdem gegen eine
   Mutation gehalten — `octal[]` auf `toRadixList(16)` umgehängt —: 30 statt 29 Gruppen und 27
   Verhaltensabweichungen, rc=1. Das Skript beißt.

   Das Ergebnis dieses Laufs gehört wörtlich in den `Verlauf:` unten. Es ist der einzige Beleg dafür,
   dass keiner der 42 Schlüssel verrutscht ist.

4. **Den Effect in `ShaePropElement.ts` ersetzen.** `:250-419` wird zu:

   ```ts
   createEffect(() => {
     const type = this.type$.get();
     const shouldTrim = this.shouldTrim$.get();
     let value = this.valueIn$.get();

     if (shouldTrim && typeof value === 'string') {
       value = value.trim();
     }

     // only null and undefined mean "no value" — 0, false and the empty string are values
     value = value ?? undefined;

     if (typeof value === 'string' && type) {
       const convert = propValueConverters.get(type);
       if (convert != null) {
         // invalid input is an operating case for this element, not an exceptional state: it is
         // reported and clears the value instead of throwing out of a reactive effect
         try {
           value = convert(value);
         } catch (error) {
           // reported through `error`, not `warn`: `warn` is gated behind
           // `ConsoleLogger.sharedConfig.enable`, which defaults to "the page is served from
           // localhost". A dropped property value has to stay visible in production too.
           this.logger.error(`[${this.name}] could not convert the value into the type "${type}"`, {
             value,
             error,
             shaeProp: this,
           });
           value = undefined;
         }
       }
     }

     this.valueOut$.set(value);
   });
   ```

   Der `try`/`catch` sitzt damit um **den Aufruf**, nicht in den 29 Konvertern — wie der Nachtrag des
   Planers 5 es verlangt. Die Meldung ist wortgleich, damit
   `the conversion failure is reported through the ConsoleLogger` (`prop-element-types.test.js:224`)
   unverändert greift: Der Fall filtert die `console.error`-Aufrufe nach dem Vorkommen von `"json"`
   und erwartet genau einen.

5. **`value != null` fällt** (`:264`). Seit `value = value ?? undefined` eine Zeile darüber steht,
   ist die Hälfte von `typeof value === 'string'` mit abgedeckt; der Kommentar auf `:262-263`, der
   ihr Bleiben bis zu genau diesem Umbau begründet, fällt mit ihr. Keine Verhaltensänderung, kein Test
   ändert sich.

6. **Der `default:`-Zweig fällt ersatzlos** (`:397-403`), wie in Paket 3 entschieden. Über den
   Attributpfad ist er unerreichbar: `#readTypeAttribute` warnt bei einem unbekannten Namen selbst
   und setzt `type$` auf `undefined`, der Effect kommt gar nicht erst in den Zweig.
   `if (convert != null)` in Schritt 4 tritt an seine Stelle und lässt den String stehen — dieselbe
   Wirkung ohne die zweite Meldung. **Der eine Unterschied, und er gehört als Kommentar an die
   Zeile:** `type$` ist `protected`; eine Unterklasse, die `this.type$.set('bogus')` schreibt,
   bekam bisher eine Warnung und bekommt künftig keine. Ein Weg, den keine Unterklasse im Repo geht
   und für den es keine Zusage gibt. `an unknown type name warns and leaves the string untouched`
   (`:299`) prüft den Attributpfad und bleibt grün — die Warnung dort kommt aus
   `#readTypeAttribute`, nicht aus dem `switch`.

7. **`TYPES` fällt ganz** (`:47-90`). `#readTypeAttribute` fragt künftig `propValueConverters.has(type)`
   (`:579`). Damit steht die Namensliste nur noch an einer Stelle, und die Doppelung aus dem
   Abgleich oben ist aufgelöst. Der `TRUTHY_VALUES`-Import (`:4`) wandert in das neue Modul.

8. **`propValueConverters.spec.ts` schreiben**, 33 Fälle, `describe('propValueConverters')`:

   1. `answers to 42 type names, in this order` — `[...propValueConverters.keys()]` gegen ein
      Literal der 42 Namen in der Reihenfolge der Tabelle aus Schritt 2.
   2. `has one converter per branch, 29 in all` — `new Set(propValueConverters.values()).size` ist `29`.
   3. `gives every alias the same function as its short form` — für die 13 Alias-Schlüssel
      (`text`, `integer`, `hexadecimal`, `octal`, `binary`, `boolean`, `text[]`, `string[]`,
      `integer[]`, `hexadecimal[]`, `octal[]`, `binary[]`, `boolean[]`) gilt
      `expect(get(alias)).toBe(get(kurzform))` — **Referenzgleichheit**, nicht Verhaltensgleichheit.
   4. bis 32. — 29 Verhaltenszeilen, je eine pro Gruppe, tabellengetrieben. Jeder Wert ist vom Planer
      daraufhin geprüft, dass er die Gruppe von **allen 28 anderen** trennt:

      | Typnamen | `value` | Ergebnis |
      | :--- | :--- | :--- |
      | `string`, `text` | `hello world` | `'hello world'` |
      | `number` | `12abc` | `NaN` |
      | `bigint` | `9007199254740993` | `9007199254740993n` |
      | `float` | `3.14abc` | `3.14` |
      | `int`, `integer` | `42.9` | `42` |
      | `hex`, `hexadecimal` | `ff` | `255` |
      | `oct`, `octal` | `17` | `15` |
      | `bin`, `binary` | `1011` | `11` |
      | `bool`, `boolean` | `YES` | `true` |
      | `[]`, `text[]`, `string[]` | `a, b, c` | `['a', 'b', 'c']` |
      | `number[]` | `1.5abc 2` | `[NaN, 2]` |
      | `float[]` | `1.5abc 2` | `[1.5, 2]` |
      | `int[]`, `integer[]` | `1.9 2.9` | `[1, 2]` |
      | `hex[]`, `hexadecimal[]` | `ff 0a` | `[255, 10]` |
      | `oct[]`, `octal[]` | `17 7` | `[15, 7]` |
      | `bin[]`, `binary[]` | `1011 110` | `[11, 6]` |
      | `bool[]`, `boolean[]` | `yes no on off` | `[true, false, true, false]` |
      | `int8array` | `1 -2 3` | `Int8Array([1, 2, 3])` |
      | `uint8array` | `1 2 300` | `Uint8Array([1, 2, 44])` |
      | `uint8clampedarray` | `1 2 300` | `Uint8ClampedArray([1, 2, 255])` |
      | `int16array` | `1,2,3` | `Int16Array([1, 2, 3])` |
      | `uint16array` | `1-2` | `Uint16Array([1, 2])` |
      | `int32array` | `1.5 -2.5` | `Int32Array([1, 5, 2, 5])` |
      | `uint32array` | `1;2;3` | `Uint32Array([1, 2, 3])` |
      | `float32array` | `1.5 -2.5` | `Float32Array([1.5, -2.5])` |
      | `float64array` | `1.5 -2.5` | `Float64Array([1.5, -2.5])` |
      | `bigint64array` | `1 -2` | `BigInt64Array([1n, 2n])` |
      | `biguint64array` | `-1 2` | `BigUint64Array([0n, 1n, 2n])` |
      | `json` | `{"a":1,"b":[2,3]}` | `{a: 1, b: [2, 3]}` |

      Vier dieser Werte sind bewusst so und dürfen nicht »geglättet« werden — sie sind der Ersatz für
      die vier Namen, die `prop-element-types.test.js` heute nicht unterscheidet: `number`/`12abc`
      trennt `Number` von `parseFloat` (`NaN` gegen `12`), `number[]`/`1.5abc 2` und
      `float[]`/`1.5abc 2` trennen dieselben zwei in der Listenform, und `int[]`/`1.9 2.9` trennt
      `parseInt` von beiden. Der Vergleich muss `NaN`, `BigInt` und den TypedArray-Konstruktor
      unterscheiden können; `expect(…).to.deep.equal` allein reicht dafür nicht.
   33. `does not answer to an inherited object key` — `has('toString')`, `has('constructor')` und
       `has('__proto__')` sind alle `false`. Der Fall hält fest, warum das eine `Map` ist.

9. **Die Typtabelle in der Dokumentation richtigstellen.** `docs/api-reference.md:1282` und
   `docs/cheat-sheet.md:255` führen beide eine Tabellenzeile, die `number` und `float` zusammen auf
   `parseFloat` abbildet. Das ist falsch:
   `number` ist `Number(value)`, und der Unterschied ist der zwischen `NaN` und `3.14` für den
   Eingabestring `3.14abc`. Die Zeile wird zu zwei Zeilen — `` `number` `` → `Number()`,
   `` `float` `` → `parseFloat()` —, und vier Zeilen, die in beiden Tabellen ganz fehlen, kommen
   dazu: `` `bigint` ``, `` `hex`/`hexadecimal` ``, `` `oct`/`octal` ``, `` `bin`/`binary` ``. Der
   Rest beider Abschnitte bleibt unberührt. Das ist die einzige Doku-Änderung dieses Pakets; alles
   andere am `<shae-prop>` beschreibt Verhalten, das sich nicht ändert.

10. **`packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`**: ein Stichpunkt
    `- **Internal (elements):** …` — die Typkonvertierung von `<shae-prop>` läuft über eine
    Konvertertabelle; `dist/src/elements/propValueConverters.js` samt Deklarationen kommt hinzu,
    ohne Eintrag in der `exports`-Map, ohne Verhaltensänderung. Dazu ein zweiter Stichpunkt
    `- **Docs (correctness):** …` für die `number`/`parseFloat`-Zeile.
    **`CHANGELOG.md` im Wurzelverzeichnis**: ein Stichpunkt im Abschnitt zum 2026-08-16 über die
    neue Unit-Spec — dieselbe Aufteilung, die Paket 3 gewählt hat.

11. **`pnpm build` laufen lassen und die `dist/`-Dateiliste diffen**:
    `find packages/shadow-objects/dist -type f | sort` muss genau vier Zeilen mehr haben als vorher
    (194 → 198), alle vier `propValueConverters.*` unter `dist/src/elements/`.
    `packages/shadow-objects/dist/package.json` muss zeichengleich bleiben.

- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`.

  **Was sich ändern darf:** genau eine Zahl. `@spearwolf/shadow-objects` geht von **294 auf 327**
  (13 → 14 Spec-Dateien), `test:ci` damit von **598 auf 631**.

  **Was sich nicht ändern darf, und zwar keine davon:** `shadow-objects-testing` bleibt bei
  **303 Tests in 20 Dateien**, davon **111 in `prop-element-types.test.js`**; e2e bleibt bei **404**
  (Chromium + Firefox); `shae-offscreen-canvas` bleibt bei **1**. `pnpm lint` bleibt bei rc=0 mit den
  zwei bekannten `biome.json`-Infos. Rot oder eine andere Zahl in `shadow-objects-testing` heißt:
  Der Umbau hat Verhalten geändert, und der Fehler liegt im Umbau, nicht im Test.

  **`prop-element-types.test.js` wird nicht angefasst — keine Zeile, kein Zeichen.** Die Datei ist
  das Netz, und ein Netz, das man beim Springen nachspannt, ist keines. `git diff --stat` muss nach
  dem Paket genau diese Dateien zeigen: die zwei neuen unter `src/elements/`, `ShaePropElement.ts`,
  die zwei Doku-Dateien und die zwei Changelogs. Taucht eine Datei aus `packages/shadow-objects-testing/`
  oder `packages/shadow-objects-e2e/` im Diff auf, ist etwas schiefgegangen.

  Zusätzlich prüfen: rc=0 **und** kein »Errors«-Block in der Zusammenfassung, und der Lauf mehrfach
  geshuffelt grün.

  **Die 33 neuen Fälle sind vor dem Umbau alle nicht lauffähig** — das Modul, das sie prüfen, gibt es
  noch nicht. Ihre Schärfe wird deshalb nach dem Umbau durch Mutation belegt, je Fall eine:

  | Fall | Mutation, die ihn rot macht |
  |---|---|
  | 42 Namen in Reihenfolge | `'octal'` aus Gruppe 7 streichen |
  | 29 Konverter | `hexadecimal[]` aus Gruppe 14 lösen und ihr eigenes `toRadixList(16)` geben |
  | Alias-Identität | dieselbe Mutation |
  | `number` | Gruppe 2 auf `(value) => parseFloat(value)` setzen |
  | `float[]` | Gruppe 12 auf den Konverter von Gruppe 11 setzen |
  | `int[]` | Gruppe 13 auf den Konverter von Gruppe 11 setzen |
  | `float32array`, `float64array` | in Gruppe 25/26 `fields` durch `words` ersetzen |
  | `int8array` … `uint32array` | in Gruppe 18–24 `words` durch `fields` ersetzen |
  | `[]`, `hex[]`, `oct[]`, `bin[]`, `bool[]` | in `words` `\W+` durch `\s+` ersetzen |
  | die übrigen 17 Zeilen | den Konverter der Gruppe gegen den der Nachbargruppe tauschen |
  | vererbter Objektschlüssel | die `Map` durch ein Objektliteral und `has` durch `in` ersetzen |

- Commit: `refactor(elements): convert shae-prop values through a converter table`
- Verlauf:
  - Zug 0 (2026-08-16, Planer): Optimierungspunkt gegen die Quelle geprüft — besteht. Zahlen
    nachgezählt und die aus Paket 3 bestätigt: 42 Typnamen, 42 `case`-Marken, 29 Zweigkörper, 11
    TypedArray-Varianten, 215 von 593 Zeilen für die Konvertierung. Maschinell festgestellt, dass
    `TYPES` und die `case`-Marken heute zeichengleich und gleich geordnet sind — die Doppelung ist
    intakt, aber unbewacht, und sie ist der stärkere Grund für den Umbau als die Testbarkeit.
    Den Nachtrag des Planers 4 zu den Alias-Marken widerlegt: über alle 86 `(type, value)`-Paare der
    Spec gegen alle 29 Zweigkörper gerechnet, sind die sechs genannten Alias-Marken bewacht und vier
    andere Namen nicht (`number`, `float[]`, `int[]`, `integer[]`). Das neue Modul geschrieben,
    mit `esbuild` übersetzt, mit `tsc` unter den `strict`-Schaltern des Repos geprüft (rc=0) und mit
    `biome check --write` formatiert (kein Unterschied). Differenziell gegen den extrahierten
    `switch` gemessen: Struktur 29/29 identisch, Schlüssel 42/42 identisch, 2268 Verhaltensvergleiche,
    0 Abweichungen. Das Messskript gegen eine Mutation gehalten (`octal[]` auf den Hex-Konverter):
    30 Gruppen, 27 Abweichungen, rc=1 — es beißt. Je Gruppe einen Wert gesucht, der sie von allen
    28 anderen trennt; alle 29 gefunden. Ein Fund außerhalb des Codes: `api-reference.md:1282` und
    `cheat-sheet.md:255` schreiben `type="number"` den `parseFloat` zu, es ist `Number()`. Prototyp
    danach zurückgenommen, Arbeitsbaum sauber, `test:ci` 598 und `shadow-objects-testing` 303/111
    nachgemessen.

</details>

### [x] 12a. Die offenen Regeln im Code entscheiden und Altlasten räumen

- Hash: `58d1ad4`
- Ergebnis: 2 Runden · beide Nutzerentscheidungen umgesetzt, Altlasten geräumt · Verify grün: lint rc=0, typecheck ✓, test:ci 633 (`shadow-objects-testing` 305 in 21 Dateien), e2e 402, `dist/` unverändert 198 Dateien und `dist/package.json` byte-identisch, kein »Errors«-Block, mehrfach geshuffelt grün
- Die Kopplung `whenDefined('shae-ent')` in `shae-prop.ts` ist gefallen. Die drei Registrierungsmodule sind jetzt strukturgleich; wer `@spearwolf/shadow-objects/shae-prop.js` einzeln importiert, bekommt ein funktionierendes Element statt eines für immer inerten. `src/elements/events.ts` ist über `index.ts` als `export type *` veröffentlicht — der Reviewer hat mit einer Konsumenten-Sonde durch die echte `exports`-Map belegt, dass die `HTMLElementEventMap`-Augmentierung ankommt: mit der Zeile rc=0, ohne sie sechs Typfehler.
- Der Tippfehler `unsubcribe` ist beseitigt.
- **Der Solo-Wächter musste nachgeschärft werden.** Sein `await customElements.whenDefined('shae-prop')` schluckte jede Mutation, die die Registrierung nur *verzögert* statt sie zu verhindern — mit einem `setTimeout` gemessen blieb er grün, obwohl die Zusage »definiert beim Import« gebrochen war. Ohne die Zeile wird er gegen beide Mutationen rot, mit sauberer Assertion in unter 100 ms statt eines 15-Sekunden-Timeouts.
- Die E2E-Zahl sinkt um zwei: Der entfernte Fall prüfte, dass beide Tags definiert sind, während `elements.js` ohnehin alle drei Registrierungsmodule bedingungslos importiert — eine Tautologie, die nie eine Reihenfolge zeigen konnte. Die inhaltliche Aussage halten weiterhin `upgrade-definitions-arrive`, `upgrade-pre-existing-props-found-their-host` und der neue Integrationsfall.
- Nebenbefunde: Der Reviewer hat die Isolation des Solo-Wächters gemessen statt geglaubt — Mutation gegen die volle Suite mit `--sequence.shuffle`, zweimal, je genau ein Fehlschlag; elf der zwanzig anderen Dateien registrieren `shae-ent` ohne `shae-prop`, bei geteilter Registry wäre sie grün durchgelaufen.
- Folgen: Zwei öffentliche API-Änderungen, beide im Paket-CHANGELOG. Die Dokumentation dazu schuldet Paket 12b (die drei Ereignistypen und `ShadowEntsEventMap` als jetzt öffentlich) und Paket 12c (vier `TEST-PLAN.md`-Stellen, die jetzt das Gegenteil des Codes behaupten, plus die auf 201 gesunkene Fallzahl je Browser).

- Findings: — (dazu die Hälfte von »Die Upgrade-Garantie dokumentieren«, die im Code sitzt)
- Ziel: `shae-prop.ts:4` und `src/elements/events.ts` sind entschieden statt geerbt, und die zwei
  Kommentare, die einen abgeschafften Zustand beschreiben, beschreiben den heutigen.
- Bereich: `packages/shadow-objects/src/shae-prop.ts`, `src/index.ts`,
  `src/elements/ShaeEntElement.ts`,
  neu `packages/shadow-objects-testing/test/prop-element-registration-order.test.js`,
  `packages/shadow-objects-testing/test/prop-element-types.test.js`,
  `packages/shadow-objects-e2e/src/upgrade-timing.js`,
  `packages/shadow-objects-e2e/tests/upgrade-timing.spec.ts`, beide `CHANGELOG.md`
- Hängt ab von: Paket 9a, Paket 9b, Paket 10, Paket 11
- Modell: mittlere Stufe
- **Zwei Schritte hängen an einer Nutzerentscheidung** (Schritt 1 und Schritt 2). Beide sind
  gemessen, beide ändern die öffentliche Oberfläche über das Dokumentieren hinaus, beide sind dem
  Nutzer mit dem Zug-0-Bericht vorgelegt. Ohne Antwort fängt dieses Paket nicht an.
- **Der Restplan ändert sich an zwei Stellen** (2026-08-16, Planer 12): Paket 12 ist in **12a**
  (Code und die zwei offenen Entscheidungen), **12b** (Referenzdoku) und **12c** (Einstiegsdoku,
  Testplan, Backlog) geteilt — drei Teile statt zwei, weil die drei sich unterschiedlich prüfen
  lassen: 12a durch die Suite, 12b durch Gegenlesen am Code, 12c dadurch, dass man ein Beispiel
  wirklich ausführt. Und **Paket 13 rückt zwischen 12a und 12b**, weil 12b sonst zwei
  Attributzeilen schriebe, die 13 einen Zug später umdreht. Paket 14 bleibt am Ende, es berührt
  keine Datei, die 12b oder 12c anfassen. Paketnummern werden nicht neu vergeben.
- **Herkunft der Punkte** (2026-08-16, Planer 12): Paket 12 hieß »Regeln festschreiben« und trug
  acht Nachträge aus den Paketen 3 bis 11. Nichts davon ist verlorengegangen, alles ist verteilt:

  | Nachtrag, ursprünglich an Paket 12 | jetzt |
  |---|---|
  | `shae-prop.ts:4` — bleibt die Kopplung oder fällt sie (Planer 9) | **12a**, Schritt 1, gemessen |
  | `src/elements/events.ts` exportieren oder löschen (Planer 9b) | **12a**, Schritt 2, gemessen |
  | `ReRequestEntHostEventName`, `requestEntAncestor`, `EntAncestorRequest`, die Ereignisnamen (Planer 9) | **12b**, Schritt 6b — alle fünf Namen sind über `index.ts` erreichbar und stehen in null Doku-Zeilen (in Zug 0 per `grep` gemessen). Die Ereignis*typen* kommen mit **12a** Schritt 2 dazu |
  | Tippfehler `unsubcribe` (Planer 6, 7, 8, 9a, 9b, 10) | **12a**, Schritt 5 |
  | `prop-element-types.test.js:11` beschreibt einen `switch` (Planer 11) | **12a**, Schritt 6 |
  | `ComponentContext`-Methoden fehlen in `api-reference.md`, dazu `transferPropertiesTo`, `dispatchReRequestParentChildren`, `dispatchReRequestParentSiblings` (Planer 6, 7, 8) | **12b**, Schritt 7 |
  | `<shae-worker autoSync>` als Zahl ergibt `frame` (Planer 4) | **12b**, Schritt 5 |
  | `token`/`forward-custom-events` schreiben beim Upgrade nicht zurück, `ns` schon (Planer 4) | **12b**, Schritt 2 — an der Fundstelle nachgeschärft: alle vier schreiben beim **Setzen** zurück, der Unterschied liegt beim Normalisieren |
  | `getting-started.md` — der Zähler zählt nicht (Planer 6) | **12c**, Schritt 2 |
  | `TEST-PLAN.md` §1, §1.2, §2.2, H-4, `:105` (Planer 3, 6, 8, 10) | **17**, Schritt 1 (bis 2026-08-17: 12c, Schritt 6) |
  | Durchgangsprüfung der von 5, 7, 8, 9a, 9b, 10, 11 geschriebenen Doku-Abschnitte | **12b**, Schritte 1 und 6 — geleistet in Zug 0, Ergebnis: `<shae-prop>` §`#### Finding the Host Entity`, §`#### Lifecycle`, §`#### Invalid Values` und die Typtabelle tragen; die Attributtabellen und die `<shae-ent>`-Elternregel nicht |

  **Nachtrag 2026-08-17 (Planer 12b):** Paket 12b ist an der Überschrift `## Web Components` geteilt.
  Die Zeilen dieser Tabelle, die auf »12b, Schritt 7« zeigen (die `ComponentContext`-Methoden),
  liegen jetzt in **12d**; die Schritte 6b und 5 heißen dort 7 und 5 und bleiben in 12b. Die
  Reihenfolge ist 12b → 12d → 12c → 14, Nummern werden weiterhin nicht neu vergeben. (**Nachgetragen 2026-08-17, Planer 12c:** 12c ist geteilt, Testplan und Backlog laufen als Paket 17 dahinter — 12b → 12d → 12c → 17 → 14.)

<details>
<summary>Detailplan Paket 12a</summary>

**Messung 1 — trägt `whenDefined('shae-ent')` noch etwas?** (2026-08-16, Zug 0, echtes Chromium
über den Vitest-Browser-Provider, Wegwerf-Spec, danach entfernt, Arbeitsbaum sauber.)

Aufbau: eine Seite ohne jeden Import von `shae-ent.js`/`shae-prop.js` — die Registry ist leer.
Markup `<shae-ent id="p-host" token="probe"><shae-prop id="p-prop" name="x" value="7" type="int">`
steht im Dokument. Dann `customElements.define('shae-prop', ShaePropElement)` **vor**
`customElements.define('shae-ent', ShaeEntElement)`, also genau die Reihenfolge, die die Zeile
verhindert.

| Zeitpunkt | `entNode` | `viewComponent` | Wert |
|---|---|---|---|
| nach `define('shae-prop')` | `null` | `null` | — · dazu eine `warn`-Meldung »no entity above this element« |
| nach `define('shae-ent')` | `p-host` | dieselbe wie am Host | `7`, als Zahl |

**Die Kopplung trägt die Korrektheit nicht mehr.** Der Weg ist belegt und liegt offen im Code:
`ShaeEntElement` merkt sich in `#wasUpgradedInPlace` (`ShaeEntElement.ts:94`), ob es beim
Konstruieren schon im Dokument stand, und schickt in dem Fall aus `connectedCallback`
`#askPropertiesToReRequestHost()` los (`:356-359`) — ein bubbelndes, `composed` Ereignis. Ein
`<shae-prop>` ohne Host hört es am `ownerDocument` ab (`ShaePropElement.ts:366-374`) und sucht
eine Mikrotask später erneut.

**Messung 2 — was die Kopplung kostet.** Zweite Wegwerf-Spec, die nur
`import '@spearwolf/shadow-objects/shae-prop.js'` ausführt und 200 ms wartet:

```
{"shaeEntDefined":false,"shaePropDefined":false,"isShaePropElement":false}
```

`<shae-prop>` wird **nie** definiert. Der Subpfad steht in der `exports`-Map des Pakets, ein
Konsument darf ihn also einzeln importieren — und bekommt ein Element, das für immer inert
bleibt, ohne Meldung. Das ist keine Garantie, das ist eine Falle. `TEST-PLAN.md:107-109` benennt
sie seit 2026-08-02 als Nebensatz.

**Bilanz:** Nutzen 0, Kosten ein still totes Subpfad-Modul. Vorschlag an den Nutzer: die Zeile
fällt.

**Messung 3 — `src/elements/events.ts` löschen geht nicht.** Datei beiseitegelegt,
`tsc -p tsconfig.json --noEmit` gelaufen: `ShaeEntElement.ts` bricht an vier Stellen
(`:314`, `:416`, `:506`, `:512`) mit `TS2769` — die typisierten Handler passen ohne die
`HTMLElementEventMap`-Augmentierung auf keine `addEventListener`-Überladung. Die Datei ist also
nicht tot, sie ist unsichtbar: kein Modul importiert sie, aber ihre `declare global`-Wirkung hängt
am ganzen Programm. Für einen Konsumenten dagegen wirkt sie **nicht** — `dist/src/elements/events.d.ts`
wird zwar emittiert, aber von keiner `exports`-Kette erreicht, also nie geladen. Wer
`el.addEventListener('shaeReRequestEntHost', …)` schreibt, bekommt keinen Typ.
Vorschlag an den Nutzer: die Datei wird aus `index.ts` exportiert.

- Dateien: `packages/shadow-objects/src/shae-prop.ts`, `packages/shadow-objects/src/index.ts`,
  `packages/shadow-objects/src/elements/ShaeEntElement.ts`,
  `packages/shadow-objects-testing/test/prop-element-host.test.js`,
  `packages/shadow-objects-testing/test/prop-element-types.test.js`,
  `packages/shadow-objects-e2e/src/upgrade-timing.js`,
  `packages/shadow-objects/CHANGELOG.md`, `CHANGELOG.md`
- Vorgehen:

  1. **`src/shae-prop.ts` auf zwei Zeilen zurückbauen** (nur bei »die Zeile fällt«):
     ```ts
     import {SHAE_PROP} from './elements/constants.js';
     import {ShaePropElement} from './elements/ShaePropElement.js';

     customElements.define(SHAE_PROP, ShaePropElement);
     ```
     `SHAE_ENT` fällt aus dem Import. Die drei Registrierungsmodule sind damit unabhängig
     voneinander, so wie `shae-ent.ts` und `shae-worker.ts` es schon sind.

  2. **`src/index.ts`** bekommt eine Zeile, alphabetisch zwischen `./elements/constants.js` und
     `./elements/requestEntAncestor.js`:
     ```ts
     export type * from './elements/events.js';
     ```
     `export type *`, nicht `export *`: die Datei enthält ausschließlich Typen, und
     `verbatimModuleSyntax` ist an. Die `declare global`-Augmentierung wandert damit in jeden
     Konsumenten, der `@spearwolf/shadow-objects` importiert — drei Ereignisnamen mehr in
     `HTMLElementEventMap`, sonst nichts. Kein Eintrag in `exports`, keine neue Datei unter
     `dist/`: `events.js`/`events.d.ts` liegen dort bereits.

  3. **Der Wächter für Schritt 1** braucht eine Seite mit leerer Custom-Elements-Registry und geht
     deshalb in **eine eigene Spec-Datei** — `packages/shadow-objects-testing/test/prop-element-registration-order.test.js`.
     `prop-element-host.test.js` scheidet aus: sie importiert die Registrierungsmodule im Kopf, und
     eine Registrierung ist pro Seite einmalig. Vitest gibt jeder Testdatei ihre eigene Seite, das
     trägt (in Zug 0 so gemessen). Zwei Fälle:
     - `a shae-prop registered before shae-ent finds its host once shae-ent is defined`:
       `entNode` ist der Host, `viewComponent` ist die des Hosts, `value` ist `7` als Zahl.
     - `shae-prop.js alone defines the element`: nur `import '@spearwolf/shadow-objects/shae-prop.js'`,
       danach ist `customElements.get('shae-prop')` gesetzt. Genau der Fall, den die gefallene Zeile
       unmöglich machte.
     Beide Fälle sind gegen die heutige Quelle rot zu bekommen — Fall 2 durch Wiedereinsetzen der
     `whenDefined`-Zeile, Fall 1 durch Streichen von `#askPropertiesToReRequestHost()` in
     `ShaeEntElement.ts:358`.

  4. **`packages/shadow-objects-e2e/src/upgrade-timing.js:56-65`**: Der Kommentarblock über
     `upgrade-shae-prop-is-defined-after-shae-ent` beschreibt die abgeschaffte Hostsuche
     (»finds its host by looking for the `isShaeEntElement` flag«) und begründet damit eine Zeile,
     die es nach Schritt 1 nicht mehr gibt. Der Testfall selbst prüft nur, dass beide Tags definiert
     sind — nachdem die Seite beide Module importiert, ist das eine Tautologie. **Beides ersetzen**:
     die ID `upgrade-shae-prop-is-defined-after-shae-ent` weicht
     `upgrade-shae-prop-defines-without-shae-ent` nicht — die e2e-Seite importiert `elements.js` und
     kann den Fall nicht zeigen; er lebt in Schritt 3. Der Fall wird ersatzlos gestrichen, der
     Kommentar mit ihm, und `tests/upgrade-timing.spec.ts:15` verliert seine Zeile.
     **Folge für die Verify-Zahl: e2e 404 → 402** (eine ID × zwei Browser).

  5. **`packages/shadow-objects/src/elements/ShaeEntElement.ts:172` und `:178`**: `unsubcribe` →
     `unsubscribeReRequestParentRoots`, passend zum `unsubscribeReRequestParent` zwei Zeilen
     darunter. Rein lokale Konstante in einem Effect-Rumpf, kein Export, keine Signatur.

  6. **`packages/shadow-objects-testing/test/prop-element-types.test.js:10-15`**: Der Kopfkommentar
     sagt »converts its `value` attribute through a `switch` keyed by `type`« und »there is no
     conversion function exported to call in isolation«. Beides trägt seit Paket 11 nicht mehr:
     die Konvertierung läuft über `propValueConverters` und hat mit
     `src/elements/propValueConverters.spec.ts` eine eigene Unit-Spec. Neu formulieren, ohne
     Rückblick: was diese Spec prüft, ist der Weg **durch das Element** — echtes Attribut-Parsing im
     Upgrade-Pfad von Chromium, weil happy-dom die Custom-Elements-Zeitpunkte nicht verlässlich
     nachbildet. Die Konvertertabelle selbst prüft die Unit-Spec. Kein Testfall wird angefasst.

  7. **`packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`**, drei Stichpunkte:
     - `- **Breaking (elements):** …` — `@spearwolf/shadow-objects/shae-prop.js` definiert
       `<shae-prop>` sofort statt erst nach `<shae-ent>`. Wer den Subpfad einzeln importierte, bekam
       ein Element, das nie upgradete; wer beide importiert, sieht keinen Unterschied. Ein
       `<shae-prop>`, das vor jeder Entity verbunden wird, meldet einmal über den `ConsoleLogger`,
       dass es keinen Host hat, und findet ihn, sobald eine Entity über ihm antwortet.
     - `- **New (public API):** …` — die drei Ereignistypen aus `src/elements/events.ts`
       (`RequestEntParentEvent`, `ReRequestEntParentEvent`, `ReRequestEntHostEvent`) und
       `ShadowEntsEventMap` sind über den Einstiegspunkt erreichbar; `HTMLElementEventMap` kennt
       damit `shaeRequestEntParent`, `shaeReRequestEntParent` und `shaeReRequestEntHost`.
       **Der Satz im Stichpunkt zu `ReRequestEntHostEventName` weiter oben** (»the event type … and
       the `ShadowEntsEventMap` it sits in stay internal«) wird dabei berichtigt — er beschreibt
       eine Entscheidung, die dieses Paket umkehrt, und beide Stichpunkte stehen im selben
       unveröffentlichten Abschnitt.
     - Die Zahl im Kopfabsatz von `## [Unreleased]` (»Fourteen of them reach existing consumers«)
       wandert auf **»Fifteen«**, und der Satz zum `<shae-prop>`-Subpfad kommt in die Aufzählung.
     **`CHANGELOG.md` im Wurzelverzeichnis**: ein Stichpunkt im Abschnitt zum 2026-08-16 über die
     neue Spec-Datei und den entfallenen e2e-Fall.

- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`.

  **Was sich ändern darf:** `shadow-objects-testing` geht von **303 auf 305** in **21 statt 20**
  Dateien, `test:ci` damit von **631 auf 633**. e2e geht von **404 auf 402**.

  **Was sich nicht ändern darf:** `@spearwolf/shadow-objects` bleibt bei **327 in 14 Dateien**,
  `shae-offscreen-canvas` bei **1**. `pnpm lint` bleibt rc=0 mit den zwei bekannten
  `biome.json`-Infos. `pnpm build` danach: `find packages/shadow-objects/dist -type f | sort` muss
  **byte-gleich 198 Zeilen** bleiben, und `packages/shadow-objects/dist/package.json` zeichengleich —
  Schritt 2 fügt eine Re-Export-Zeile hinzu, keine Datei.

  Zusätzlich: rc=0 **und** kein »Errors«-Block, und der Lauf mehrfach `--sequence.shuffle` grün.
  Der `warn` aus Messung 1 darf in der neuen Spec auftauchen, aber nur dort und nur einmal je
  Element — `prop-element-host.test.js` hat dafür seit Paket 9b einen eigenen Wächter, der grün
  bleiben muss.

- Commit: `refactor(elements): decouple the shae-prop registration and export the event types`
- Verlauf:
  - Zug 0 (2026-08-16, Planer 12): Paket 12 in 12a/12b/12c geschnitten. Beide offenen
    Entscheidungen in echtem Chromium bzw. mit `tsc --noEmit` gemessen statt vermutet: die
    `whenDefined`-Kopplung trägt nichts mehr und kostet ein totes Subpfad-Modul; `events.ts` lässt
    sich nicht löschen, ohne vier Typfehler in `ShaeEntElement.ts` zu erzeugen. Beide Wegwerf-Specs
    danach entfernt, Arbeitsbaum sauber. Baseline nachgemessen: lint rc=0 (2 Infos), test:ci 631
    (327 / 303 / 1), e2e 404, `dist/` 198 Dateien.

</details>

### [x] 13. Attributpfade von shae-ent nachziehen

- Hash: `b686205`
- Ergebnis: 2 Runden · beide Funde des Planers Paket 4 behoben · Verify grün: lint rc=0, typecheck ✓, test:ci 637 (`shadow-objects-testing` 309 in 21 Dateien), e2e 402 unverändert, `dist/` unverändert 198, kein »Errors«-Block, mehrfach geshuffelt grün
- `removeAttribute('token')` nimmt den Token jetzt mit — die Entity fällt auf `#void` zurück, und ein Shadow Object, das über den entfernten Token ausgewählt war, wird zerstört. Eine `forward-custom-events`-Liste ohne Einträge fällt auf `false` zurück: `forward-custom-events=","` leitet nichts weiter statt alles.
- Nachweis: Sieben Fälle vor dem Fix rot, davon **drei umgedrehte**, die Paket 4a bewusst als Ist-Zustand festgeschrieben hatte. Der Fix greift an drei Codestellen; der Reviewer hat jede einzeln zurückgedreht und gemessen, dass zwei davon je eine eigene Zusage tragen und keine die andere überflüssig macht. Die dritte ist verhaltensneutral und kauft die Konsistenz »Signal falsy ⇔ kein Patch« — der `Object.hasOwn`-Wächter ist der einzige unter 309 Fällen, der sie isoliert fängt.
- Eine Vorhersage des Plans traf nicht zu, vom Implementierer selbst gemeldet: Bei einer der Mutationen bleibt ein Wächter grün, weil sich die Kaskade selbst heilt. Der Reviewer hat daraufhin geprüft, ob dahinter ein Fenster steckt, in dem das Element kurzzeitig alles weiterleitet — es gibt keins, jeder beobachtbare Zwischenzustand lautet `signal=false / Attribut absent / kein Patch`.
- Ein Nebenergebnis für die Dokumentation: `forward-custom-events="true"` leitet ein Ereignis **namens** `true` weiter, nicht alle. Die alte Zusage war in beiden Hälften falsch; wer daraufhin so etwas ins Markup geschrieben hat, hatte Code, der nie funktioniert hat. Steht als `Docs (correctness)` im Paket-CHANGELOG.
- Nebenbefunde: der vorbestehende Patch-nach-Wiedereinhängen-Fall (siehe »Vorbestehende Fehler«).
- Folgen: Zwei Breaking Changes an `<shae-ent>`, beide im Paket-CHANGELOG. Die vier Doku-Zeilen hat dieses Paket selbst geschrieben, Paket 12b fasst sie nicht mehr an.

- Findings: — (zwei Funde des Planers Paket 4, nicht im Audit)
- Ziel: Ein entferntes `token`-Attribut nimmt den Token mit, und eine leere Filterliste leitet nichts weiter statt alles.
- Bereich: `packages/shadow-objects/src/elements/ShaeEntElement.ts`, `packages/shadow-objects-testing/test/ent-element-attributes.test.js`, `test/ent-element-events.test.js`
- Hängt ab von: Paket 4a, Paket 4b
- Modell: mittlere Stufe
- Nachgetragen 2026-08-16 (Planer Paket 4b): die Abhängigkeit ist um 4b erweitert. Nicht inhaltlich — 4b fasst dieselben zwei Spec-Dateien an, um die Aufräumregel in den geteilten Helfer zu ziehen. Wer hier vorher anfängt, kollidiert.
- Fund 2 (`ShaeEntElement.ts:402-407`): `#updateTokenValue` liest nur bei vorhandenem Attribut. Nach `removeAttribute('token')` bleiben `el.token` und `viewComponent.token` auf dem alten Wert stehen, während `el.token = undefined` sauber auf `#void` zurückfällt. Der `else`-Zweig fehlt schlicht.
- Fund 1 (`ShaeEntElement.ts:73-78` gegen `:409-427`): Eine leere `Set` wird als leerer String ins Attribut zurückgeschrieben, und den liest `#updateForwardCustomEventsValue` als »alles weiterleiten«. `forward-custom-events=","` und `forwardCustomEvents$.set(new Set())` bedeuten damit das Gegenteil dessen, was dasteht. Zu entscheiden ist, ob eine leere Liste »nichts« heißt (dann braucht die Reflexion eine eigene Marke für den leeren Filter) oder ob eine leere Liste gar nicht erst entstehen darf (dann fällt sie auf `false` zurück).
- Hinweis: Beide Fälle sind in Paket 4a als Ist-Zustand festgeschrieben und dort mit einem Kommentar markiert. Dieses Paket dreht genau diese zwei Testfälle um und lässt den Rest der beiden Specs unangetastet. Die Änderung ist am `<shae-ent>` von außen sichtbar und braucht deshalb einen Eintrag in `packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]` sowie die Attributtabelle in `packages/shadow-objects/docs/api-reference.md`.
- **Vorgezogen 2026-08-16 (Planer 12):** Dieses Paket steht jetzt zwischen 12a und 12b, statt hinter 12c. Grund: 12b schreibt die Attributtabelle des `<shae-ent>` neu, und die Zeilen zu `token` und `forward-custom-events` sind genau die zwei, die dieses Paket umdreht — 12b würde sonst eine Aussage eintragen, die einen Zug später falsch ist. Inhaltlich ändert sich am Paket nichts, die Nummer bleibt.
- **Nachgetragen 2026-08-16 (Planer 12):** Zwei Aussagen der `api-reference.md`, die dieses Paket zwangsläufig mitzieht und die 12b deshalb liegen lässt: `:1154` nennt `token` »Required« — ohne Attribut entsteht die `ViewComponent` mit `VoidToken` (`ShaeEntElement.ts:259`); und `:1156` schreibt für `forward-custom-events` »Empty or `true` = all events«, während nur ein leerer Wert »alle« bedeutet (`ShaeEntElement.ts:603-617`). Beide Zeilen gehören in denselben Zug wie Fund 1 und Fund 2. Für die Ereignisse, die selbst im Alles-Fall nie weitergereicht werden (`ComponentContext.ReRequestParentRoots` und `.ReRequestParent`, `ShaeEntElement.ts:209`), bleibt 12b zuständig.
- **Eine Entscheidung liegt beim Nutzer** (Fund 1, Weg A gegen Weg B). Beide Wege sind unten gemessen, der
  Detailplan ist auf **Weg B** geschrieben und nennt die Abweichung für Weg A ausdrücklich. Ohne Antwort
  fängt dieses Paket nicht an. Fund 2 braucht keine Entscheidung — der Property-Pfad tut es heute schon so.

<details>
<summary>Detailplan Paket 13</summary>

**Abgleich (2026-08-16, Zug 0, alles in echtem Chromium über `packages/shadow-objects-testing`
gemessen, Wegwerf-Sonden danach entfernt, Arbeitsbaum sauber).** Beide Funde bestehen
**unverändert**; die Zeilennummern sind durch die Pakete 6 bis 12a gewandert.

| Fund | Fundstelle 2026-08-16 | Messung am unveränderten Code |
|---|---|---|
| 2 | `ShaeEntElement.ts:599-604` (`#updateTokenValue`), Reflexion `:144-151`, Aufrufer `:145`, `:321` (unter `beQuiet`), `:406-412` | `setAttribute('token','c')`, dann `removeAttribute('token')` → `el.token === 'c'`, `hasAttribute('token') === false`, `viewComponent.token === 'c'`. Über den Property-Pfad: `el.token = undefined` → `undefined` / kein Attribut / `'#void'` |
| 1 | `#updateForwardCustomEventsValue` `:606-624`, Reflexion `:154-167`, Patch-Effect `:190-201` | `forward-custom-events=","` → `forwardCustomEvents$.value === true`, Attribut `''`, und ein **ungelistetes** Event erreicht das DOM-Element. Dasselbe für `forwardCustomEvents$.set(new Set())` |

**Die drei Fälle aus Paket 4a, die dieses Paket umdreht** — nicht zwei, wie der Auftrag notiert;
Fund 1 ist an zwei Stellen festgeschrieben:

| Datei | Testfall | markiert als |
|---|---|---|
| `test/ent-element-attributes.test.js:100` | `removeAttribute("token") leaves the property and the entity holding the old token` | »pins the current behaviour« (`:101-103`) |
| `test/ent-element-events.test.js:44` (Tabelle A) | `<shae-ent forward-custom-events=",">` → `true` / `''` | »ends up meaning ‚forward everything' instead of ‚forward nothing'« (`:42-44`) |
| `test/ent-element-events.test.js:111` (Tabelle B) | `forwardCustomEvents$.set(new Set()) also ends up meaning "forward everything"` | »this is the current behaviour, not the intended one« (`:113-114`) |

**Nebenbeobachtung, gemessen:** `forward-custom-events="true"` reicht **nur** den Ereignistyp
weiter, der wörtlich `true` heißt — `forwardCustomEvents$.value` ist `Set('true')`. Die Zusage
»Empty or `true` = all events« in `api-reference.md:1156` ist damit nicht ungenau, sondern in
beiden Hälften falsch. Sie fällt mit der Zeile, die dieses Paket ohnehin neu schreibt.

**Zweite Nebenbeobachtung, vorbestehend und von diesem Paket unberührt:** `setAttribute('token','')`
zur Laufzeit **entfernt** das Attribut (`''` → `undefined` → Reflexion `removeAttribute`), während
`token=""` im Markup stehen bleibt (das erste Lesen läuft vor der Registrierung von
`token$.onChange`). Dieselbe Asymmetrie hält Paket 4a für `ns` und `forward-custom-events` fest.
Kein Fund, keine Änderung — nur ein Grund, beim Schreiben der Fälle nicht zu stutzen.

**Fund 1 — die Entscheidung, beide Wege gemessen.**

*Weg A: eine leere Liste heißt »nichts« und bekommt eine eigene Marke.* Die Reflexion müsste für
die leere `Set` etwas ins Attribut schreiben, das beim Zurücklesen wieder die leere `Set` ergibt.
Der einzige kollisionsfreie Kandidat ist ein Trennzeichen ohne Einträge, also `","` selbst: kein
Ereignistyp kann so heißen. Damit hätte das Markup drei Zustände — Attribut fehlt (aus), leer
(alles), `,` (ausdrücklich nichts). Kosten: der dritte Zustand unterscheidet sich vom ersten in
**nichts**, was ein Anwender messen kann. Gemessen ist der einzige Unterschied, ob
`Object.hasOwn(viewComponent, 'dispatchEvent')` gilt — eine Interna. Eine öffentliche
Attributgrammatik um einen Zustand zu erweitern, der sich von einem vorhandenen nur intern
unterscheidet, kauft nichts.

*Weg B: eine leere Liste kann nicht entstehen und fällt auf `false` zurück.* »Nichts weiterleiten«
sagt ein Anwender heute schon, indem er das Attribut wegläßt. Eine Liste ohne Einträge nennt keinen
Ereignistyp und ist damit dasselbe. `false` ist außerdem der Vorgabewert des Signals — es entsteht
kein neuer Zustand, es verschwindet ein widersprüchlicher.

**Empfehlung: Weg B.** Der Detailplan unten ist darauf geschrieben.

**Messung des Weges B am echten Code** (Fix probeweise eingesetzt, `pnpm -F @spearwolf/shadow-objects build`,
volle Suiten, danach zurückgesetzt):

| Eingabe | `forwardCustomEvents$.value` | Attribut danach | Weiterleitung | Patch installiert |
|---|---|---|---|---|
| `forward-custom-events=","` im Markup | `false` | unverändert `","` | keine | nein |
| `forward-custom-events=" , , "` im Markup | `false` | unverändert `" , , "` | keine | nein |
| `setAttribute('forward-custom-events', ',')` nach `="foo"` | `false` | **entfernt** | keine | nein |
| `forwardCustomEvents$.set(new Set())` nach `="foo"` | `false` | **entfernt** | keine | nein |
| `forwardCustomEvents$.set(new Set())` ohne Attribut | `Set()` | fehlt weiterhin | keine | nein |
| `forward-custom-events` bare | `true` | `''` | alle | ja |
| `removeAttribute('token')` nach `setAttribute('token','c')` | — | entfernt | — | `el.token === undefined`, `viewComponent.token === '#void'` |

Zwei Dinge daran sind Absicht und gehören in die Testkommentare. Erstens die Asymmetrie zwischen
Markup und Laufzeit: im Markup bleibt `","` stehen, weil das Signal seinen Vorgabewert `false` nie
verläßt und die Reflexion deshalb nie feuert; zur Laufzeit feuert sie und räumt das Attribut ab.
Genau dieselbe Asymmetrie hält Paket 4a für `forward-custom-events="   "` fest. Zweitens die
Zeile, in der `Set()` stehen bleibt: wer das Signal von `false` aus auf eine leere `Set` setzt,
löst keine Attributänderung aus, über die der Wert zurückgelesen und normalisiert würde. Verhalten
und Patch sind identisch mit `false`, nur der Rohwert im Signal steht anders da. Ein Normalisieren
im `onChange` wäre ein Schreiben während einer Änderungsbenachrichtigung — das ist der Preis nicht
wert.

**Gegenprobe mit dem eingesetzten Fix:** `shadow-objects-testing` meldet **3 rote von 305** — genau
die drei Fälle aus der Tabelle oben, kein vierter. `@spearwolf/shadow-objects` 327 grün,
`pnpm typecheck` grün, `pnpm -F shadow-objects-e2e test` **402 grün**. Der Fix reißt nichts mit.

**Triage der offenen Nebenbefunde und Folgen aus den Paketen 1 bis 12a (2026-08-16, Planer 13).**
Der letzte vollständige Durchgang steht bei Planer 10 (Pakete 1 bis 9b); die Pakete 11 und 12
haben ihre eigenen Einträge zugewiesen. Offen bleiben drei, alle an der Fundstelle nachgeprüft:

| Eintrag | Fundstelle | Befund | Ziel |
|---|---|---|---|
| Kopfkommentar von `prop-element-types.test.js` beschreibt einen `switch` (Nebenbefund Paket 11) | `packages/shadow-objects-testing/test/prop-element-types.test.js:10-16` | **gegenstandslos** — 12a, Schritt 6 hat ihn ersetzt, er nennt heute `propValueConverters` und die eigene Unit-Spec | erledigt, fällt aus der Liste |
| `TEST-PLAN.md` beschreibt die abgeschaffte `parentElement`-Suche (Nebenbefund Paket 10) | `packages/shadow-objects-e2e/TEST-PLAN.md:104-110` | **echte Folge** — der Absatz zitiert die in 12a gelöschte `whenDefined`-Zeile wörtlich und begründet mit ihr eine »guarantee« | **17**, Schritt 1 (bis 2026-08-17: 12c, Schritt 6); die vier Stellen des Reviewers 12a sind dort aufgenommen |
| Doku schuldet die drei jetzt öffentlichen Ereignistypen (Folge Paket 12a) | `packages/shadow-objects/src/elements/events.ts` über `index.ts` | **echte Folge** | **12b**, im Detailplan bereits als Schritt eingetragen |

Nichts davon berührt Paket 13. Neu zu verteilen ist nichts: die zwei Nebenbeobachtungen dieses
Zuges (`forward-custom-events="true"`, `setAttribute('token','')`) gehen in die Zeilen, die dieses
Paket ohnehin schreibt.

- Dateien: `packages/shadow-objects/src/elements/ShaeEntElement.ts`,
  `packages/shadow-objects-testing/test/ent-element-attributes.test.js`,
  `packages/shadow-objects-testing/test/ent-element-events.test.js`,
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/docs/cheat-sheet.md`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:

  0. **Zuerst die drei Wächter rot machen.** Die Schritte 4 bis 6 schreiben die drei Fälle aus
     Paket 4a um; sie laufen **vor** den Schritten 1 bis 3 und müssen dann mit genau diesen
     Meldungen fehlschlagen (gemessen, Richtung umgekehrt):
     - `ent-element-attributes.test.js > shae-ent token attribute > removeAttribute("token") clears the property and voids the entity token`
       → `AssertionError: expected 'c' to equal undefined`
     - `ent-element-events.test.js > shae-ent forward-custom-events attribute forms > <shae-ent forward-custom-events=",">`
       → `AssertionError: expected true to deeply equal false`
     - `ent-element-events.test.js > shae-ent forward-custom-events runtime changes and reflection > forwardCustomEvents$.set(new Set()) forwards nothing and drops the attribute`
       → `AssertionError: expected true to equal false`
     Kein anderer Fall darf dabei rot sein. Wer eine vierte rote Zeile sieht, hört auf und trägt sie
     hier ein.

  1. **`ShaeEntElement.ts` — Fund 2.** `#updateTokenValue` bekommt den fehlenden `else`-Zweig:
     ```ts
     #updateTokenValue() {
       if (this.hasAttribute(ATTR_TOKEN)) {
         const token = this.getAttribute(ATTR_TOKEN)?.trim() || undefined;
         this.token$.set(token);
       } else {
         // both ways of taking the token away end in the same place: the entity falls back to
         // VoidToken, and the reflection has nothing left to write
         this.token$.set(undefined);
       }
     }
     ```
     Der Aufruf im `connectedCallback` (`:321`) steht unter `beQuiet` und ist unbedenklich: die
     Reflexion `:147-153` schreibt jede Property-Zuweisung ins Attribut, ein gesetzter Token ohne
     Attribut kann also nicht entstehen. Gemessen: abhängen und wieder anhängen behält `token === 'a'`
     und `viewComponent.token === 'a'`.

  2. **`ShaeEntElement.ts` — Fund 1, Weg B, drei Stellen und ein gemeinsames Prädikat.**
     Direkt über `interface ReRequestParentData`:
     ```ts
     /** An allow-list without entries forwards nothing — the same thing `false` says. */
     const isEmptyFilter = (val: Set<string> | boolean): boolean => val instanceof Set && val.size === 0;
     ```
     - `#updateForwardCustomEventsValue`: die `Set` in eine Konstante, dann
       `this.forwardCustomEvents$.set(types.size > 0 ? types : false);` statt der direkten Zuweisung.
     - Reflexion `forwardCustomEvents$.onChange`: `if (!val)` wird zu `if (!val || isEmptyFilter(val))`.
     - Patch-Effect: `if (!filter) return;` wird zu `if (!filter || isEmptyFilter(filter)) return;`.
     Ein Kommentar an der Parse-Stelle, warum die leere Liste dort schon zu `false` wird: ein
     zurückgeschriebener Leerstring ist die Schreibweise für »alle«, und eine Liste ohne Einträge
     soll das Gegenteil bedeuten.
     **Weg A statt B:** Dann entfallen alle drei Änderungen aus diesem Schritt. Stattdessen bekommt
     die Reflexion für die leere `Set` einen eigenen Zweig, der `','` ins Attribut schreibt, und
     `#updateForwardCustomEventsValue` behält die leere `Set` als Wert. Die Schritte 5, 6, 7 und 9
     ändern ihre Erwartungen entsprechend (`false` → `Set()`, entferntes Attribut → `','`), Schritt 8
     entfällt ersatzlos.

  3. **Keine weitere Codestelle.** `ShaeElement.ts`, `ShaePropElement.ts` und `ShaeWorkerElement.ts`
     bleiben unberührt; `ATTR_TOKEN`, `ATTR_FORWARD_CUSTOM_EVENTS` und `observedAttributes` ändern
     sich nicht. Kein Export ändert sich, `dist/` bleibt bei 198 Dateien.

  4. **`ent-element-attributes.test.js`, Block »token«: den Fall bei `:100` umdrehen.** Neuer Name
     `removeAttribute("token") clears the property and voids the entity token`, Erwartungen
     `el.token` `undefined`, `hasAttribute('token')` `false`, `el.viewComponent.token` `'#void'`.
     Der Kommentar wird ohne Rückblick neu geschrieben: das Attribut und die JS-Property sind zwei
     Wege zu einem Wert, und beide Wege, ihn wegzunehmen, enden bei `VoidToken`. Die Kette davor
     (`el.token = 'b'` → `= undefined` → `setAttribute('token','c')`) bleibt Zeichen für Zeichen
     stehen — sie ist Teil des Falls.

  5. **`ent-element-attributes.test.js`, Block »token«: ein neuer Fall**, direkt danach, damit der
     `else`-Zweig auch ohne die Kette davor bewacht ist:
     `removeAttribute("token") on an element that only ever had the attribute` — mountet
     `<shae-ent token="a"></shae-ent>`, ruft `removeAttribute('token')` und erwartet dieselben drei
     Werte wie Schritt 4. **Block danach 10 statt 9 Fälle, Datei 23 statt 22.**

  6. **`ent-element-events.test.js`, Tabelle A: die Zeile `","` umdrehen und eine ergänzen.**
     ```js
     // a list without entries names no event type, so nothing is forwarded. The attribute stays as
     // written: the signal never leaves its default, so the reflection has no change to write back
     ['forward-custom-events=","', false, ','],
     ['forward-custom-events=" , , "', false, ' , , '],
     ```
     Die zweite Zeile geht direkt darunter, vor `"foo foo"`. **Tabelle A danach 12 statt 11 Fälle.**

  7. **`ent-element-events.test.js`, Tabelle B: den Fall `forwardCustomEvents$.set(new Set())`
     umdrehen.** Neuer Name `forwardCustomEvents$.set(new Set()) forwards nothing and drops the
     attribute`, Erwartungen `fce(el)` `false` und `attrOf(el)` `null`. Die Kette davor bleibt
     unverändert. Kommentar: die leere Liste räumt das Attribut ab, und weil das Abräumen eine
     Attributänderung ist, liest das Element den Wert einmal zurück und steht danach auf `false`.
     Der letzte Fall der Tabelle (`set(false)` entfernt das Attribut) hängt an dieser Kette und
     bleibt inhaltlich richtig — seine `expect`-Zeile ändert sich nicht.

  8. **`ent-element-events.test.js`, Tabelle B: ein neuer Fall** am Ende der Tabelle:
     `setAttribute("forward-custom-events", ",") drops the attribute and forwards nothing` — startet
     über `mountFCE()` von `="foo"`, setzt das Attribut auf `','`, erwartet `fce(el)` `false` und
     `attrOf(el)` `null`, und prüft mit einem `addEventListener('foo', …)` und
     `el.viewComponent.dispatchEvent('foo', {}, false)`, dass nichts am DOM ankommt. Kommentar zur
     Asymmetrie gegen Tabelle A: zur Laufzeit gibt es eine Änderung zurückzuschreiben, im Markup
     nicht. **Tabelle B danach 8 statt 7 Fälle.**

  9. **`ent-element-events.test.js`, Block »the dispatchEvent patch«: ein neuer Fall** am Ende:
     `an allow-list without entries installs no dispatchEvent patch` — mountet
     `<shae-ent token="t"></shae-ent>` (ohne Attribut), ruft `el.forwardCustomEvents$.set(new Set())`
     und erwartet `Object.hasOwn(el.viewComponent, 'dispatchEvent')` `false` sowie kein `CustomEvent`
     nach `el.viewComponent.dispatchEvent('x', {}, false)`. Das ist der einzige Weg, auf dem eine
     leere `Set` im Signal stehen bleibt; der Fall hält fest, dass sie sich trotzdem verhält wie
     `false`. **Patch-Block danach 14 statt 13 Fälle, Datei 34 statt 31.**

 10. **`test/forward-custom-events.test.js` bleibt unangetastet** — es fährt bare und `="allowed"`
     gegen einen laufenden `<shae-worker local>`, beide Formen ändern sich nicht. Ebenso
     `packages/shadow-objects-e2e/src/async-events.js:148` und `pages/async-events.html:32,35`:
     gemessen 402 E2E-Fälle grün mit dem eingesetzten Fix.

 11. **`docs/api-reference.md:1154` und `:1156`** — die zwei für dieses Paket reservierten Zeilen der
     Attributtabelle des `<shae-ent>`:
     ```
     | `token` | The Token (Component Tag) matching a registered Shadow Object constructor. Optional: an entity without one carries the void token `#void` and matches no Shadow Object. Removing the attribute takes the entity back to it. |
     | `forward-custom-events` | Re-dispatches events from the Shadow Object as DOM `CustomEvent`s on this element. Present with an empty value: every event. A comma-separated list: only the types it names — `forward-custom-events="true"` forwards the type named `true` and nothing else. Absent, or a list that names no type: nothing is forwarded. |
     ```
     Die Zeile zu `ns` bleibt stehen. Alles Weitere an dieser Tabelle — die zwei nie weitergereichten
     internen Ereignisse und die Reflexionsregeln je Attribut — gehört 12b.

 12. **`docs/cheat-sheet.md:226` und `:228`** — dieselben zwei Aussagen in der Kurzform, aus
     demselben Grund im selben Zug:
     ```
     | `token` | string | Token (Component Tag) matching a Registry entry. Optional; without it the entity carries `#void`. |
     | `forward-custom-events` | empty or comma-list | Re-dispatch Shadow Object events as DOM CustomEvents. Empty: every event. A list: only the types it names. No entries: nothing. |
     ```
     `docs/guides.md:322` (»empty = all, or comma-separated list«) bleibt richtig und wird nicht
     angefaßt.

 13. **`packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`**, zwei Stichpunkte. Diese Datei
     benennt den Vorzustand ausdrücklich — das ist ihre Aufgabe und die Praxis aller zwölf Pakete
     davor; die Konvention »kein Rückblick« gilt für Code, Kommentare und Dokumentation, nicht hier.
     - `- **Bugfix (elements):** …` — ein entferntes `token`-Attribut nimmt den Token mit. Das
       Element las das Attribut nur, solange es da war, sodass eine Entfernung Property und
       `ViewComponent` auf einem Wert stehen ließ, der aus dem Markup schon verschwunden war —
       während `el.token = undefined` beides immer geräumt hat. Eine Entity ohne Token trägt
       `VoidToken` (`#void`) und trifft kein Shadow Object; das Entfernen des Attributs zerstört
       also das Shadow Object, das der Token ausgewählt hatte.
     - `- **Bugfix (elements):** …` — eine `forward-custom-events`-Liste, die keinen Ereignistyp
       nennt, leitet nichts weiter. `forward-custom-events=","` und `forwardCustomEvents$.set(new Set())`
       landeten als leerer Attributwert, und das ist die Schreibweise für »jedes Ereignis«; sie
       bedeuten jetzt, was dasteht. »Nichts weiterleiten« schreibt sich weiterhin, indem das Attribut
       wegbleibt.
     - Die Zahl im Kopfabsatz von `## [Unreleased]` geht von **»Fifteen«** auf **»Seventeen«**, und
       die Aufzählung dort bekommt zwei Teilsätze: ein `removeAttribute('token')`, das die Entity
       jetzt auf `#void` zurücksetzt statt den Token zu behalten, und eine leere Filterliste, die
       jetzt nichts statt alles weiterleitet.
     **`CHANGELOG.md` im Wurzelverzeichnis: kein Eintrag.** Es entsteht keine neue Spec-Datei und
     nichts am Harness ändert sich; die vier neuen Fälle liegen in vorhandenen Dateien und gehören
     zur Verhaltensänderung, die im Paket-CHANGELOG steht.

- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`.

  **Was sich ändern darf:** `shadow-objects-testing` geht von **305 auf 309** bei unverändert **21**
  Dateien (`ent-element-attributes.test.js` 22 → 23, `ent-element-events.test.js` 31 → 34),
  `test:ci` damit von **633 auf 637**. Die heutigen Zahlen sind je Datei nachgemessen; der
  Patch-Block hat **13** Fälle, nicht die 12, die der Detailplan zu Paket 4a nennt.

  **Was sich nicht ändern darf:** `@spearwolf/shadow-objects` bleibt bei **327 in 14 Dateien**,
  `shae-offscreen-canvas` bei **1**, e2e bei **402** (Chromium + Firefox). `pnpm lint` bleibt rc=0
  mit den zwei bekannten `biome.json`-Infos. Nach `pnpm build` muss
  `find packages/shadow-objects/dist -type f | sort` **198 Zeilen** liefern und
  `packages/shadow-objects/dist/package.json` zeichengleich bleiben — dieses Paket ändert sechs
  Zeilen in einer vorhandenen Datei und keinen Export.

  Zusätzlich: rc=0 **und** kein »Errors«-Block, und der Lauf mehrfach `--sequence.shuffle` grün —
  beide Tabellen in `ent-element-events.test.js` fahren Ketten auf einem Element, aber kein `it`
  darf von einem anderen abhängen.

  **Mutationsproben, je Wächter eine, alle vor dem Commit zu fahren.** Vier der fünf sind in Zug 0
  bereits gemessen; das Ergebnis steht dahinter:

  | Wächter | Mutation | erwartet |
  |---|---|---|
  | `removeAttribute("token") clears the property and voids the entity token` | den `else`-Zweig aus `#updateTokenValue` wieder entfernen | rot, `expected 'c' to equal undefined` — **gemessen** |
  | `removeAttribute("token") on an element that only ever had the attribute` | dieselbe Mutation | rot, `expected 'a' to equal undefined` |
  | `<shae-ent forward-custom-events=",">` und `<shae-ent forward-custom-events=" , , ">` | `types.size > 0 ? types : false` auf die nackte `Set` zurückdrehen | beide rot, `expected true to deeply equal false` — **gemessen** (für `","`) |
  | `setAttribute("forward-custom-events", ",") drops the attribute and forwards nothing` | dieselbe Mutation | rot: Attribut `''` statt `null` |
  | `forwardCustomEvents$.set(new Set()) forwards nothing and drops the attribute` | `isEmptyFilter` aus der Reflexion (`onChange`) nehmen | rot, `expected true to equal false` — **gemessen** |
  | `an allow-list without entries installs no dispatchEvent patch` | `isEmptyFilter` aus dem Patch-Effect nehmen | rot, `Object.hasOwn(…)` wird `true` — **gemessen** |

  Der letzte Wächter ist der einzige, der die dritte Codeänderung überhaupt fangen kann: ohne sie
  ist der Patch installiert, filtert aber gegen eine leere Menge und leitet trotzdem nichts weiter.
  Genau deshalb prüft er `Object.hasOwn` und nicht nur die ausbleibende Weiterleitung — eine
  Behauptung über das Verhalten allein wäre hier nicht falsifizierbar.

- Commit: `fix(elements): let a removed token attribute and an empty event filter mean what they say`
- Verlauf:
  - Zug 0 (2026-08-16, Planer 13): Beide Funde in echtem Chromium nachgemessen statt geglaubt —
    beide bestehen unverändert, Fundstellen auf `ShaeEntElement.ts:599-604` und `:606-624`
    nachgezogen. Drei statt zwei Fälle aus Paket 4a sind betroffen; Fund 1 ist in Tabelle A **und**
    Tabelle B von `ent-element-events.test.js` festgeschrieben. Weg B probeweise eingesetzt und
    gegen die vollen Suiten gefahren: 3 rote von 305 in `shadow-objects-testing`, alle drei die
    festgeschriebenen, dazu 327 Unit-Tests, `typecheck` und **402 E2E-Fälle grün**. Zwei
    Nebenbeobachtungen: `forward-custom-events="true"` reicht nur den Ereignistyp `true` weiter, und
    `setAttribute('token','')` entfernt das Attribut, während `token=""` im Markup stehen bleibt.
    Die Entscheidung zu Fund 1 ist dem Nutzer mit dem Zug-0-Bericht vorgelegt, Empfehlung Weg B.
    Sonden entfernt, Arbeitsbaum sauber.

</details>

### [x] 12b. Die Elementreferenz gegen den Code stellen

- Hash: `7640f41`
- Ergebnis: 2 Runden · die Elementreferenz in `api-reference.md` und `cheat-sheet.md` steht gegen den Code · Nullprobe gehalten: test:ci 637, e2e 402, `dist/` 198 Dateien, `git diff --stat` genau drei Dateien, kein Code angefasst
- Vier Instrumente statt eines Testlaufs, alle angewendet: Signaturen gegen die emittierten `.d.ts` in **beide** Richtungen (kein Member ohne Zeile, keine Zeile ohne Member), 35 gemessene Verhaltensfälle in echtem Chromium, jeder angefasste Codeblock wörtlich ausgeführt (der TypeScript-Block gegen `tsc`, mit Gegenprobe), und ein Abgleich der Gegenstellen zwischen beiden Dateien.
- **Der Implementierer hat vier Behauptungen des Plans am Code widerlegt** statt sie zu übernehmen: `importScript('')` wirft nicht synchron, die Methode ist `async`; zwischen Upgrade und neuer Bindung liegt nur für Properties eine Mikrotask, Entities sind gebunden sobald `customElements.define()` zurückkehrt; `el.token = '  x  '` lässt ein vorhandenes Attribut nicht unverändert; und der Frame-Vorgabewert wird nur dann nicht reflektiert, wenn er der Vorgabewert ist.
- Der Reviewer hat 21 Aussagen unabhängig nachgemessen; 18 trugen sofort. Drei griffen zu weit — `DefaultAutoSync` (unlesbare Werte fallen **nicht** auf `frame` zurück, sie melden und schalten ab), der Absatz zum fremden `ComponentContext` (versprach eine Bindung, die nie kommt) und die `token`-Aussage — alle drei nachgebessert und Glied für Glied nachgemessen. Dazu eine Gegenstelle im Cheat-Sheet, die die neue Zeitaussage noch nicht kannte.
- Nebenbefunde: `forwardCustomEvents$.set(true)` normalisiert ein vorhandenes Filter-Attribut nicht (siehe »Vorbestehende Fehler«). · `guides.md:305` führt die `auto-sync`-Werte weiterhin unvollständig, `guides.md:336` sagt »on the parent entity« — Ziel 12c.
- Folgen: Der Rückverweis aus `guides.md` auf den neuen Abschnitt `#### Driving the Lookup by Hand` wurde bewusst weggelassen, weil das Ziel erst 12c schreibt — als Nachtrag dort eingetragen, damit die Schuld nicht nur als Absicht existiert.

- Findings: VIEW-009 (low) · dazu die **Referenzhälfte** des Optimierungspunkts »Die Upgrade-Garantie
  dokumentieren« (die erzählende Hälfte bleibt in `guides.md` und damit bei Paket 12c)
- Ziel: `api-reference.md` §Web Components und die Elementtabellen des `cheat-sheet.md` sagen über
  jedes der drei Elemente das, was der Code tut — Attribute, JavaScript-Oberfläche, Vorfahrensuche —,
  und die Namespace-Regel steht für beide Elemente da, nicht nur für eines.
- Bereich: `packages/shadow-objects/docs/api-reference.md` **nur** §Web Components (`:1072`–`:1387`),
  `packages/shadow-objects/docs/cheat-sheet.md` **nur** §Web Component Attributes (`:210`–`:272`),
  `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: Paket 12a, **Paket 13** (das vier Zeilen schreibt, die dieses Paket sonst zweimal
  schriebe)
- Modell: stärkste Stufe — rund 20 Berichtigungen und drei neue Abschnitte, und jede einzelne Aussage
  muss am Code belegt sein, bevor sie dasteht. Eine Referenz, die zum zweiten Mal danebengreift, ist
  schlimmer als eine, die schweigt.
- **Geteilt am 2026-08-17 (Planer 12b, Zug 0):** Der ursprüngliche Zuschnitt umfasste zusätzlich
  §ViewComponent, §ComponentContext, §ShadowEnv und §Environment Proxies. Gezählt sind das allein bei
  `ComponentContext` **29 undokumentierte Member von 33** — zusammen mit der Elementseite rund hundert
  einzeln zu belegende Aussagen in einem Zug. Die Klassenreferenz ist als **Paket 12d** herausgelöst;
  Nummern werden nicht neu vergeben, die Reihenfolge ist 12b → 12d → 12c → 17 → 14 (**Paket 17 am 2026-08-17 aus 12c herausgelöst**). Die Trennlinie ist die
  Überschrift `## Web Components` (`api-reference.md:1072`): davor gehört 12d, danach 12b.

<details>
<summary>Detailplan Paket 12b</summary>

**Stand von VIEW-009 (2026-08-17, Zug 0, an der Fundstelle nachgeprüft).** Die Entscheidung im
Plankopf — eine Property gehört zum nächstgelegenen Entity, unabhängig vom Namespace — steht in
`api-reference.md:1249-1251` (»The namespace plays no part in it: what counts is proximity, not
membership«), und `prop-element-host.test.js:162` hält sie mit einem Fall. Beides erfüllt.

**Was fehlt, ist die andere Hälfte derselben Regel.** `api-reference.md:1191-1192` beschreibt die
Elternauflösung von `<shae-ent>` als »the closest `<shae-ent>` on the ancestor path that answers at
that moment« — ohne den Filter, der dort entscheidet: `#dispatchRequestParent` schickt `{ns: this.ns}`
mit (`ShaeEntElement.ts:500-503`, mit dem Kommentar »an entity takes only an ancestor from its own
namespace as a parent«), und ein Vorfahre aus einem anderen Namespace **überspringt** die Anfrage,
statt sie zu blockieren — das `return` steht vor dem `stopPropagation()` (`:590-596`). Ein
`<shae-ent ns="hud">` zwischen Kind und Elternentität ist für die Entity-Hierarchie unsichtbar,
**genau umgekehrt** zu der Regel, die drei Bildschirmseiten weiter für `<shae-prop>` steht. Zwei
benachbarte Abschnitte, zwei entgegengesetzte Regeln, eine davon ungeschrieben: das ist die
Inkonsistenz, die VIEW-009 meint. Erst bei `:1204` taucht der Namespace überhaupt auf, und dort nur
als Sonderfall des Laufzeitwechsels.

**Was sich seit dem ersten Entwurf dieses Detailplans (Zug 0 des Planers 12) geändert hat**, jeweils
an der Fundstelle nachgeprüft:

| Punkt des alten Plans | Stand am 2026-08-17 |
|---|---|
| Schritt 2, `token`/`forward-custom-events`-Zeilen »schreibt Paket 13« | eingelöst, `api-reference.md:1154`/`:1156` und `cheat-sheet.md:226`/`:228` sind richtig — **Tabu**, siehe unten |
| Schritt 6, `<shae-prop>` »nach 5, 9a, 9b, 10, 11 inhaltlich in Ordnung« | hält; die drei genannten Nachträge stehen weiterhin aus, dazu vier neue (unten Schritt 6) |
| Schritt 9 Typtabelle (Paket 11) | eingelöst, `api-reference.md:1277-1294` gegen `propValueConverters.ts:36-66` geprüft — **Tabu** |
| Schritt 6b »sobald 12a die Ereignistypen exportiert« | 12a hat exportiert (`index.ts:4`, `export type *`); der Abschnitt ist damit fällig und wächst um `ShadowEntsEventMap` |
| Schritt 7, ComponentContext »31 öffentlich, 5 dokumentiert« | **nachgezählt: 33 Member plus Konstruktor, 5 dokumentiert.** Wandert vollständig nach Paket 12d |
| Schritte 8–10 (ViewComponent, ShadowEnv, Proxies, Cheat-Sheet-Klassenteil) | wandern nach Paket 12d |
| Schritt 5, `importScript('')` wirft »synchron« | **falsch.** Die Methode ist `async` (`ShaeWorkerElement.ts:148-151`), der `throw` erzeugt eine abgelehnte Promise. Ein `try`/`catch` um den Aufruf fängt nichts |
| Schritt 3, die `$`-Signale seien »protected/für Unterklassen« | **halb falsch.** Auf `ShaePropElement` sind sie `protected` (`:79-88`), auf `ShaeElement`, `ShaeEntElement` und `ShaeWorkerElement` sind sie **öffentlich** (`ShaeElement.ts:35`, `ShaeEntElement.ts:60-63`, `ShaeWorkerElement.ts:32-34`) und stehen als solche in den `.d.ts` — der `Types`-Eintrag im Paket-CHANGELOG nennt vier von ihnen namentlich |
| Schritt 4, `no-trim` unter §`<shae-worker>` | falsch einsortiert: `no-trim` ist ein Attribut von `<shae-prop>` (`elements/constants.ts:27`, gelesen in `ShaePropElement.ts:415`) |

- Dateien: `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/docs/cheat-sheet.md`, `packages/shadow-objects/CHANGELOG.md`

- **Der Beleg ist immer der Code.** Keine Aussage dieses Pakets wird aus diesem Plan, aus der anderen
  Doku-Datei oder aus dem CHANGELOG abgeschrieben. Jeder Schritt unten nennt die Stelle, an der sie zu
  prüfen ist; die Zeilennummern stammen vom 2026-08-17 und können verrutschen — es gilt der Text, nicht
  die Zahl. Dieser Lauf hat mehrfach erlebt, dass eine plausible Doku-Zeile schlicht falsch war,
  zuletzt eine, die dieselbe Änderung im selben Commit eingeführt hatte.

- Vorgehen:

  1. **§`<shae-ent>` → `#### Entity Hierarchy` (`:1179`ff): die Namespace-Regel.** Der Satz
     `:1191-1192` bekommt den Filter dazu: eine Entity nimmt nur einen Vorfahren aus **ihrem eigenen**
     Namespace als Elternteil; ein `<shae-ent>` eines anderen Namespace dazwischen ist für diese
     Bindung nicht da und hält die Anfrage auch nicht auf. Direkt daneben der Kontrast mit Querverweis
     auf `#### Finding the Host Entity`: für `<shae-prop>` gilt das Gegenteil, dort entscheidet Nähe
     und nicht Zugehörigkeit.
     Belege: `ShaeEntElement.ts:500-503` (Anfrage mit `ns`), `:590-596` (`return` vor
     `stopPropagation()`), `ShaePropElement.ts:303-307` (Anfrage **ohne** `ns`).
     Zweitens ergänzen: fällt die aufgelöste Elternentität in einen anderen `ComponentContext`, wird
     die Bindung gelöst und die Anfrage eine Mikrotask später wiederholt — `ShaeEntElement.ts:531`
     (`parentVC.context === vc.context ? parentVC : undefined`) und `:532-536` (`queueMicrotask`).
     Die Bindung steht dann nicht »when an element connects«.

  2. **§`<shae-ent>` → `#### Attributes` (`:1150`ff), zwei Ergänzungen.** Die Zeilen `:1154` (`token`)
     und `:1156` (`forward-custom-events`) sind **Tabu** — Paket 13 hat sie geschrieben, beide gegen
     `ShaeEntElement.ts:601-610` und `:612-632` nachgeprüft. Hier kommt dazu:
     - Die Ausnahme im Alles-Fall: `ComponentContext.ReRequestParentRoots` und `.ReRequestParent`
       werden nie weitergereicht, auch nicht ohne Filterliste. Beleg `ShaeEntElement.ts:213-214`
       (Kommentar an Ort und Stelle), Konstanten `view/ComponentContext.ts:51-52`.
     - Was das Schreiben über die JS-Seite ins DOM zurückschreibt. `ns` schreibt zurück und schreibt
       dabei den **getrimmten** Wert, ein leerer Wert entfernt das Attribut (`ShaeElement.ts:41-47`
       → `utils/toNamespace.ts:4` → Reflexion `ShaeElement.ts:52-60`). Der `token`-Setter schreibt
       zurück, der Getter faßt das Attribut nicht an (`ShaeEntElement.ts:81-83`, Reflexion `:147-153`)
       — `token="  x  "` bleibt so im Markup stehen, `ns="  x  "` wird zu `ns="x"`.
       **Achtung:** für `forward-custom-events` gibt es *keinen* JS-Accessor, nur das öffentliche
       Signal `forwardCustomEvents$` (`:63`) mit eigener Reflexion (`:157-170`). Die Aussage gehört
       deshalb in den JS-API-Abschnitt aus Schritt 3, nicht in die Attributtabelle.

  3. **§`<shae-ent>`: neuer Abschnitt `#### JavaScript API`**, nach den Attributen, in der Form der
     Tabelle, die `<shae-prop>` bei `:1296` schon hat. Der Abschnitt existiert heute nicht — §`<shae-ent>`
     hat ausschließlich `#### Attributes` und `#### Entity Hierarchy`. Vollständige öffentliche
     Oberfläche, gegen `dist/src/elements/ShaeEntElement.d.ts` und `ShaeElement.d.ts` zu ziehen:
     - Getter/Setter: `token` (get/set, `:77`/`:81`), `ns` (get/set, geerbt, `ShaeElement.ts:37`/`:41`)
     - Nur-Lesen: `uuid` (`:73`), `viewComponent` (`:69`), `componentContext` (`:65`)
     - Feld: `entParentNode` (`:85`) — das Element, an dem die Entity hängt, nicht der DOM-Elternknoten
     - Marken: `isShaeEntElement` (`:58`), `isShaeElement` (geerbt, `ShaeElement.ts:33`)
     - Methoden: `findShadowRootHost()` (`:289`), `onParentChanged(newParent, oldParent)` (`:392`,
       Erweiterungspunkt für Unterklassen), `syncShadowObjects()` (geerbt, `ShaeElement.ts:71`)
     - Statisch: `observedAttributes` (`:56`)
     - Die **öffentlichen** Signale `token$`, `viewComponent$`, `componentContext$`,
       `forwardCustomEvents$` (`:60-63`) und `ns$` (`ShaeElement.ts:35`) bekommen einen eigenen
       Absatz: sie sind Teil der Oberfläche, nicht `protected`, und `forwardCustomEvents$` ist der
       einzige Weg, den Filter aus JavaScript zu setzen. Ein Satz zur Reflexion (`:157-170`): eine
       leere `Set` und `false` entfernen das Attribut, `true` setzt es leer, eine `Set` schreibt die
       Komma-Liste.
     - **Nicht** listen: `getParentNodeForObserver()` (`protected`, `:308`), `syncShadowObjectsOf()`
       (`protected`, `ShaeElement.ts:81`), alles mit `#`.

  4. **§`<shae-worker>` (`:1078`–`:1143`), sechs Berichtigungen.**
     - `local` und `no-autostart` sind **keine** Anwesenheits-Attribute. Beide laufen über
       `readBooleanAttribute` (`utils/attr-utils.ts:7-13`) gegen
       `TRUTHY_VALUES = ['on','true','yes','local','1']` (`utils/constants.ts:1`): `local="false"`
       bleibt im Worker-Modus, `no-autostart="0"` startet trotzdem. Belege `ShaeWorkerElement.ts:218`
       und `:122`. Ausgerechnet `no-structured-clone` ist reines `hasAttribute` (`:301`) — die drei
       gehören in zwei Gruppen, nicht in eine. Dazu, dass `no-structured-clone` ohne `local`
       kommentarlos wirkungslos ist (`#disableStructuredClone`, `:298-302`, prüft `env?.isLocalEnv`).
     - `auto-sync`-Wertetabelle (`:1095-1100`), vier Lücken gegen `ShaeWorkerElement.ts:250-295`:
       `"true"` und `"auto-sync"` fehlen bei den Frame-Loop-Schlüsselwörtern (`:256`); `"false"` fehlt
       bei den Aus-Werten (`:275`); ein `Nfps` mit `fps <= 0` ergibt `logger.warn` und **kein**
       Intervall (`:264-270`); jeder sonst nicht parsebare Wert löst `logger.error` aus (`:276`) und
       schaltet ab; `auto-sync=""` fällt auf `frame` zurück (`:253`, `|| DefaultAutoSync`).
     - `no-autostart` steht **nicht** in `observedAttributes` (`:14-20`) und wird nur einmal beim
       Connect über `shouldAutostart` gelesen (`:121-123`, aufgerufen `:175`). Nachträgliches Setzen
       oder Entfernen wirkt nicht.
     - `src`: der Wert wird getrimmt, und eine Änderung zur Laufzeit löst bei bereits bereitem
       Environment ein erneutes `importScript` aus (`:202-208`). Eine Änderung von `local`, nachdem
       der `envProxy` existiert, wirft (`:188-192`).
     - `syncShadowObjects()` (`:1122`, »Pushes the pending changes«) stimmt nicht: die Methode sammelt
       Namespaces und ruft `ShadowEnv.get(ns)?.sync()` in einer Mikrotask (`ShaeElement.ts:13-28`,
       `:71-73`). Sie synchronisiert also verzögert und gebündelt, pro Namespace, nicht das Element —
       und sie sitzt auf `ShaeElement`, `<shae-ent>` hat sie damit auch. Ein Querverweis aus Schritt 3.
     - `#### DOM Events` (`:1126`): »mirrors the `ShadowEnv` events onto itself« ist zu weit gefaßt.
       Gespiegelt werden `ContextCreated`, `ContextLost`, `ProxyFailed` (`:50-76`), **nicht**
       `ShadowEnv.AfterSync` (`view/ShadowEnv.ts:27`, in der Referenz bei `:846` als ShadowEnv-Event
       geführt). Alle drei laufen mit `bubbles: false` und ohne `composed` (`:54`, `:63`, `:72`) —
       eine Delegation an einen Vorfahren oder über eine Shadow-Grenze gibt es nicht.

  5. **§`<shae-worker>`: neuer Abschnitt `#### JavaScript API`.** Existiert heute nicht; die
     Methodentabelle bei `:1116` führt drei Methoden, die Klasse hat deutlich mehr. Inhalt:
     - Die Falle, die Paket 4b gemessen hat: **`el.autoSync = 30` ergibt `'frame'`, `auto-sync="30"`
       ein 30-ms-Intervall.** Der Setter wandelt jeden Nicht-String über `val ? DefaultAutoSync : 'no'`
       um (`:129-134`); nur Strings kommen als Wert durch, und das Attribut wird bei dieser Zuweisung
       auch nicht geschrieben (`:78-89` schreibt nur, wenn das Attribut schon da ist).
     - Die übrige öffentliche Oberfläche: `shadowEnv` (`:26`), `logger` (`:28`), `autostart` (`:30`,
       schreibbares Feld, Vorgabe `true`), `shouldAutostart` (`:121`, nur lesend, verrechnet
       `autostart` mit dem Attribut), `autoSync` (get/set, `:125`/`:129`), `frameLoop` (`:136`, legt
       die `FrameLoop` bei Bedarf an), `isShaeWorkerElement` (`:24`), `destroy()` (`:229`), statisch
       `ShaeWorkerElement.DefaultAutoSync` (`:22`), sowie die öffentlichen Signale `isConnected$`,
       `autoSync$`, `src$` (`:32-34`). `shadowEnv` und `destroy()` fehlen heute ganz.
     - `importScript(src)` (`:1121`) bekommt dazu: bei leerem `src` **lehnt die Promise ab** mit
       `Error('src is blank')` — die Methode ist `async` (`:148-151`), ein `try`/`catch` um den
       Aufruf fängt nichts, es braucht ein `await` oder ein `.catch()`.

  6. **§`<shae-prop>` (`:1218`–`:1348`), sieben Nachträge.** Der Abschnitt ist nach den Paketen 5, 9a,
     9b, 10 und 11 inhaltlich in Ordnung; die Typtabelle (`:1277-1294`) ist **Tabu**.
     - Der Einleitungssatz `:1220` — »Declaratively sets properties on the parent `<shae-ent>`« —
       widerspricht dem eigenen Abschnitt `#### Finding the Host Entity` zwei Zeilen weiter: der Host
       ist die **nächstgelegene** Entity im flattened Tree, nicht der Elternknoten
       (`ShaePropElement.ts:303-307`, `elements/requestEntAncestor.ts:35-45`). Ein Wort.
     - `#### JavaScript API` (`:1296-1302`) fehlen `entNode` (Getter **und** Setter, `:106-112`, im
       Fließtext bei `:1241` bereits benutzt), `viewComponent` (`:114-116`) und `isShaePropElement`
       (`:77`). Die Signale sind hier tatsächlich `protected` (`:79-88`) und bleiben draußen.
     - `#### Invalid Values` (`:1304-1312`) behandelt ungültige *Werte*. Ein ungültiger *Typname* ist
       ein anderer Fall: `logger.warn` und der rohe String geht unverändert durch — `#readTypeAttribute`
       (`:401-412`, Filter `propValueConverters.has(type)` bei `:403`, Meldung `:404-408`, danach
       `type = undefined` bei `:409`), stiller zweiter Zweig bei `:236-239`. Ein Absatz dazu.
     - **Berichtigung in demselben Abschnitt:** `:1309-1311` behauptet, die Meldung sei nicht hinter
       `ConsoleLogger.sharedConfig.enable` gegated. Das gilt für den `error`-Pfad des ungültigen
       Wertes (`:222-234`) — für den neuen `warn`-Pfad des Typnamens gilt es nicht. Der Satz muß den
       Unterschied benennen, sonst wird er durch den Nachtrag falsch.
     - `boolean`/`bool` (`:1289`, außerhalb der Tabu-Tabellenzeilen der Typzuordnung: hier geht es um
       die *Bedeutung*, nicht um die Zuordnung): wahr sind nur `on`, `true`, `yes`, `local`, `1`,
       case-insensitiv (`propValueConverters.ts:31` gegen `utils/constants.ts:1`). `value="0"` ist
       also `false`, `value="2"` auch, `value="local"` ist `true`. Dasselbe für `bool[]`/`boolean[]`
       (`propValueConverters.ts:53`). Wenn das ohne Eingriff in die Tabu-Zeile nicht geht, kommt es
       als Fußnote unter die Tabelle.
     - `no-trim` (`:1275`) ist kein Anwesenheits-Attribut, sondern läuft über `readBooleanAttribute`
       (`ShaePropElement.ts:415`): `no-trim="false"` trimmt weiterhin.
     - Die Host-los-Warnung (`:1244-1247`) ist zusätzlich **einmal pro Element** gedeckelt
       (`#reportedMissingHost`, `:290`, `:322-329`) und wird nur bei `isConnected` gemeldet. Ein
       Halbsatz. Ebenso `:1240-1242`: die Mikrotask-Verzögerung gilt für den Re-Request-Kanal
       (`:354-363`); der erste Lookup beim Connect ist synchron (`:257`), das Lösen beim Verlassen
       läuft über eine eigene Mikrotask (`:381-387`).

  7. **§`<shae-ent>`: neuer Abschnitt `#### Driving the Lookup by Hand`**, hinter
     `#### Entity Hierarchy`, mit Querverweis aus §`<shae-prop>` → `#### Finding the Host Entity`.
     **Das ist die Referenzhälfte des Optimierungspunkts.** Nach 9a, 9b und 12a sind zehn Namen über
     `index.ts` erreichbar und stehen in **keiner** Referenz — in Zug 0 mit einem `grep` über `docs/`
     und beide `README.md` gemessen, für jeden einzelnen null Treffer:
     `requestEntAncestor`, `EntAncestorRequest`, `RequestEntParentEventName`,
     `ReRequestEntParentEventName`, `ReRequestEntHostEventName`, `RequestEntParentEvent`,
     `ReRequestEntParentEvent`, `ReRequestEntHostEvent`, `ShadowEntsEventMap` und der Ereignisname
     `'shaeRequestEntParent'` selbst.
     Inhalt, am Code zu belegen:
     - `requestEntAncestor(requester, request)` schickt ein bubbelndes, composed
       `shaeRequestEntParent`; der zweite Parameter ist `Omit<EntAncestorRequest, 'requester'>`, den
       Absender setzt die Funktion selbst und läßt ihn nicht überschreiben
       (`elements/requestEntAncestor.ts:35-45`).
     - `EntAncestorRequest`: `requester`, optionales `ns`, `answer(entNode)`
       (`requestEntAncestor.ts:11-21`).
     - Ein von Hand gebautes Ereignis wird **nur** beantwortet, wenn sein `detail` ein `answer` trägt
       — ohne das läuft es an jeder Entity vorbei (`ShaeEntElement.ts:586-588`). Ein `detail` ohne
       `ns` bekommt die nächste Entity, gleich in welchem Namespace; mit `ns` nur eine aus diesem
       (`:594`). Der erste passende Vorfahre antwortet und stoppt das Ereignis (`:596-598`).
     - Die drei Ereignisnamen mit ihren Werten (`elements/constants.ts:1-3`) und die drei
       Ereignistypen samt `ShadowEntsEventMap` (`elements/events.ts:5-31`), die die globale
       `HTMLElementEventMap` erweitert — ein `addEventListener('shaeRequestEntParent', …)` ist damit
       ohne Cast typisiert.
     - **Die Registrierungsreihenfolge.** Ein Element, das eine Entity wird, während es schon im
       Dokument steht, meldet sich bei allem an, was unter ihm hängt: `<shae-ent>`-Kinder suchen ihren
       Elternteil neu (`ShaeEntElement.ts:437-440` über
       `ComponentContext.dispatchReRequestParentChildren`), `<shae-prop>`-Kinder ihren Host
       (`#askPropertiesToReRequestHost`, `:492-494`). Es gibt daher **keine Reihenfolge-Anforderung**
       zwischen den drei Registrierungsmodulen; sie sind unabhängig voneinander und einzeln
       importierbar (`src/shae-ent.ts`, `src/shae-prop.ts`, `src/shae-worker.ts`, alle drei ohne
       `whenDefined`). Zwischen dem Upgrade und der neuen Bindung liegt eine Mikrotask. Das ist die
       Stelle, an der die Regel aus Schritt 1 in einem Satz steht statt in zwei Abschnitten.
     - Die erzählende Fassung für Anwender, die eigene Unterklassen registrieren, schreibt **Paket
       12c** in `guides.md`. Hier steht die Mechanik, dort das Vorgehen; ein Querverweis in beide
       Richtungen, kein zweiter Erzähltext.

  8. **`docs/cheat-sheet.md` §Web Component Attributes (`:210`–`:272`), sechs Berichtigungen.**
     `:226` und `:228` sind **Tabu** (Paket 13), die Typtabelle `:250-267` ist aktuell und bleibt.
     - `:216` — `src` am `<shae-worker>` ist **nicht** »Required«: `src$` startet leer
       (`ShaeWorkerElement.ts:34`), der Import-Effect feuert nur bei truthy `src` (`:98-106`),
       `start()` braucht es nicht (`:211-227`). `api-reference.md:1086` formuliert es richtig
       (»Required for the declarative approach«) — die zwei Dokumente widersprechen sich.
     - `:212-220` — `no-autostart` fehlt in der `<shae-worker>`-Tabelle ganz.
     - `:217` — `local` steht als »boolean (presence)« da und ist keins (siehe Schritt 4). Dasselbe
       für die neue `no-autostart`-Zeile. `:220` `no-structured-clone` ist tatsächlich Presence und
       bleibt.
     - `:219` — die `auto-sync`-Werte sind unvollständig, dieselben vier Lücken wie in Schritt 4.
     - `:237` — `no-trim` steht als »boolean (presence)« da und ist keins
       (`ShaePropElement.ts:415`). In derselben Zeile fehlt die Folge des Trims: `value="   "` wird
       zum Leerstring, und mit `type="number"` ist das `0` (`:210-212` und `:217-224`,
       `Number('') === 0`).
     - `:230-237` — `name` wird getrimmt (`ShaePropElement.ts:390`), und ein leerer oder
       whitespace-only `name` bindet nichts (`:161`, `:186`). Ein Halbsatz in der `name`-Zeile.
     - `:250-269` — der zweite Fehlerfall fehlt: unbekannter **Typname**, `warn`, roher String
       (`:401-412`). Ein Satz, mit dem Unterschied im Meldungskanal.
     - `:222-228` — der `ns`-Zeile fehlt der Laufzeitwechsel: ein `<shae-ent>`, das seinen Namespace
       ändert, nimmt die Entity **und ihre Properties** in die andere Umgebung mit
       (`ShaeEntElement.ts:104-143`, `#applyComponentContext` `:256-269`, Property-Transfer
       `ViewComponent.ts:105-107` → `ComponentContext.ts:291`). `api-reference.md:1201-1209`
       beschreibt es; der Cheat Sheet verschweigt es. Ein Verweis genügt, kein zweiter Erzähltext.

  9. **Die siebzehn Verhaltensänderungen dieses Laufs gegenlesen.** Der `[Unreleased]`-Kopf der
     `packages/shadow-objects/CHANGELOG.md` zählt sie auf. Sieben davon sind an einem der drei
     Elemente sichtbar; in Zug 0 gegen die Elementabschnitte gehalten:

     | Änderung | Elementreferenz | Cheat Sheet |
     |---|---|---|
     | `<shae-prop>` hält `0`/`false`/`''` über die JS-Property | steht (`:1301`) | steht (`:270`) |
     | Leeres `value`-Attribut heißt »kein Wert«, whitespace-only wird `''` | steht (`:1273`, `:1275`) | halb — die Folge `type="number"` → `0` fehlt (Schritt 8) |
     | Nicht konvertierbarer Wert wirft nicht mehr | steht (`:1304-1312`) | steht (`:269`) |
     | `<shae-prop>` räumt die Property beim Bindungsende | steht (`:1323`ff) | steht (`:247-248`) |
     | `<shae-prop>` bindet im flattened Tree neu | steht (`:1222-1251`) | steht (`:239-245`) |
     | `<shae-ent>`-`ns`-Wechsel nimmt Entity und Properties mit | steht (`:1201-1209`) | **fehlt** (Schritt 8) |
     | `shae-prop.js` allein importiert definiert sofort | **fehlt** (Schritt 7) | — |

     Die übrigen zehn betreffen die Klassenreferenz, die Typdeklarationen oder die Abhängigkeiten und
     gehören zu Paket 12d. Wer beim Durchgehen eine achte findet, trägt sie hier nach, statt sie
     stillschweigend mitzuschreiben.

  10. **`packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`**: **ein** Stichpunkt
      `- **Docs (correctness):** …`, der die Klasse der Berichtigungen nennt und nicht jede einzelne
      aufzählt — die Elementattribute (Anwesenheit gegen Wahrheitswert, die `auto-sync`-Werte), die
      JavaScript-Oberfläche der drei Elemente einschließlich der `autoSync`-Falle, und die
      Namespace-Regel der Elternauflösung. Ein zweiter Stichpunkt `- **Docs (reference):** …` für den
      neuen Abschnitt zur Vorfahrensuche: `requestEntAncestor`, `EntAncestorRequest`, die drei
      Ereignisnamen und -typen und `ShadowEntsEventMap` stehen zum ersten Mal in der Referenz. Ein
      dritter für die zwei Stellen, an denen `cheat-sheet.md` und `api-reference.md` sich
      widersprachen (`src` »Required«, die Presence-Attribute).

- **Tabu — diese Stellen faßt das Paket nicht an:**
  - `api-reference.md:1154` und `:1156` sowie `cheat-sheet.md:226` und `:228` — von Paket 13
    geschrieben, in Zug 0 gegen `ShaeEntElement.ts:601-610` und `:612-632` nachgeprüft, korrekt.
  - Die Typtabelle `api-reference.md:1277-1294` und die Typtabelle `cheat-sheet.md:250-267` — von
    Paket 11 geschrieben und maschinell geprüft, in Zug 0 gegen `propValueConverters.ts:36-66` erneut
    bestätigt. Schritt 6 ergänzt eine Fußnote **unter** der Tabelle, keine Tabellenzeile.
  - `cheat-sheet.md:51` und `api-reference.md:416`, `:518`, `:538` — die vier `export default`-Zeilen
    der Registry-Beispiele gehören zu Paket 12c, das dieses Muster im Ganzen räumt. Ein halb
    korrigiertes Muster ist schlimmer als ein durchgehend falsches.
  - `api-reference.md:318` und `:326` — die zwei Beispiele ohne `forward-custom-events`; dasselbe
    Muster wie `guides.md:101-107`, geht mit Paket 12c.
  - Alles vor `api-reference.md:1072` (§Web Components) und alles im `cheat-sheet.md` außerhalb von
    `:210`–`:272` — das ist Paket 12d.
  - Kein Code. Dieses Paket ändert `dist/` nicht und keine Signatur.

- Verify: Kein Test kann eine Doku-Zeile prüfen. Die Prüfung ist eine Lese- und Meßprüfung, und sie
  wird schriftlich festgehalten.

  1. **Signaturen gegen die emittierten Deklarationen.** `pnpm -F @spearwolf/shadow-objects build`,
     dann für jede der drei Klassen die Memberliste ziehen und mit dem Doku-Abschnitt abgleichen —
     in beide Richtungen, kein Member ohne Zeile und keine Zeile ohne Member:
     ```
     for f in ShaeElement ShaeEntElement ShaeWorkerElement ShaePropElement; do
       echo "== $f"
       grep -oE '^    (static |readonly |protected |get |set )*[A-Za-z][A-Za-z0-9_$]*' \
         packages/shadow-objects/dist/src/elements/$f.d.ts | sed 's/^ *//' | sort -u
     done
     ```
     Die `.d.ts` ist die Oberfläche, die ein Konsument sieht: `#`-Member sind darin nicht enthalten,
     `protected` ist markiert. Das Ergebnis gehört in die Verlaufszeile.
  2. **Verhalten messen, nicht behaupten.** Sechs Aussagen dieses Pakets sind nicht aus dem Quelltext
     abzulesen, sondern nur im Browser zu sehen. Dafür eine Wegwerf-Spec in
     `packages/shadow-objects-testing/test/` anlegen, `pnpm -F shadow-objects-testing test` fahren,
     das Ergebnis in die Verlaufszeile schreiben und die Datei **wieder entfernen** (Arbeitsbaum
     sauber, `git status --porcelain` leer bis auf die drei geänderten Dateien):
     - `local="false"` bleibt Worker-Modus; `no-structured-clone="false"` schaltet `structuredClone`
       trotzdem ab; `no-trim="false"` trimmt weiter.
     - `auto-sync=""` ergibt `frame`; `auto-sync="0fps"` gibt ein `warn` und kein Intervall;
       `auto-sync="später"` gibt ein `error`.
     - `el.autoSync = 30` ergibt `'frame'`, `el.setAttribute('auto-sync','30')` ein 30-ms-Intervall.
     - `el.ns = '  x  '` schreibt `ns="x"` ins DOM, `el.token = '  x  '` läßt ein vorhandenes
       `token`-Attribut unverändert.
     - `el.importScript('')` gibt eine abgelehnte Promise zurück und wirft **nicht** synchron —
       `let threw = false; try { const p = el.importScript(''); p.catch(() => {}); } catch { threw = true }`
       muß `threw === false` liefern.
     - `<shae-prop type="boolean" value="2">` ist `false`, `value="local"` ist `true`,
       `type="gibtsnicht"` gibt ein `warn` und läßt den Rohstring durch.
     - Ein `<shae-ent ns="hud">` zwischen zwei `<shae-ent>` des globalen Namespace ist für deren
       Elternbindung unsichtbar; ein von Hand gebautes `shaeRequestEntParent` ohne `answer` läuft an
       jeder Entity vorbei.
  3. **Beispiele ausführen.** Jeder Codeblock, den dieses Paket anfaßt oder neu schreibt, wird
     wörtlich in die Wegwerf-Spec kopiert und gefahren. Ein Beispiel, das nur gelesen wurde, gilt als
     ungeprüft.
  4. **Jede berichtigte Aussage einzeln gegen die im Detailplan genannte Codestelle halten und mit
     Datei:Zeile in der Verlaufszeile quittieren.** Wer eine Aussage nicht am Code belegen kann,
     trägt sie nicht ein, sondern hier als Fund nach.
  5. **Kein Widerspruch zwischen den beiden Dateien.** Für jede in diesem Paket geänderte Aussage die
     Gegenstelle in der jeweils anderen Datei suchen (`src` »Required«, die Presence-Attribute, die
     `auto-sync`-Werte, die `boolean`-Regel) und beide auf denselben Stand bringen oder den Verweis
     setzen. Das Paket entsteht genau aus solchen Paaren.
  6. **Die Suite darf sich nicht bewegen.** `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F
     shadow-objects-e2e test` muß die Zahlen aus Paket 13 unverändert zeigen: `test:ci` **637**
     (`@spearwolf/shadow-objects` 327 in 14 Dateien — am 2026-08-17 nachgemessen —,
     `shadow-objects-testing` 309 in 21 Dateien, `shae-offscreen-canvas` 1), e2e **402**, `lint` rc=0
     mit den zwei bekannten `biome.json`-Infos. Nach `pnpm build`:
     `find packages/shadow-objects/dist -type f | wc -l` bleibt **198**. Ändert sich eine Zahl, hat
     jemand Code angefaßt.
  7. `git diff --stat` zeigt **genau drei** Dateien: die zwei Doku-Dateien und die Paket-`CHANGELOG.md`.

- Commit: `docs(api): bring the element reference in line with the code`
- Verlauf:
  - Zug 0 (2026-08-16, Planer 12): Bestand von drei Kundschaftern parallel gegen den Code gehalten
    — `api-reference.md` §Web Components, §View-API, `cheat-sheet.md` vollständig. 40 Abweichungen,
    davon 12 irreführend; zwei davon sind an Paket 13 abgegeben, vier an 12c, weil sie zu einem
    Muster gehören, das dort im Ganzen geräumt wird. VIEW-009 an der Fundstelle nachgeprüft: Regel und
    Test stehen, die Gegenregel für `<shae-ent>` fehlt. Die Memberliste von `ComponentContext`
    ausgezählt: 31 öffentlich, 5 dokumentiert.
  - Zug 0 (2026-08-17, Planer 12b): Den Detailplan gegen den Stand nach 12a und 13 abgeglichen, jeden
    Punkt an der Fundstelle. Zwei Behauptungen des Vorgängerplans widerlegt: `importScript('')` wirft
    nicht synchron (`ShaeWorkerElement.ts:148-151`, `async`), und die `$`-Signale sind nur auf
    `ShaePropElement` `protected` — auf `ShaeElement`, `ShaeEntElement` und `ShaeWorkerElement` sind
    sie öffentlich und stehen in den `.d.ts`. `no-trim` war unter `<shae-worker>` einsortiert und ist
    ein `<shae-prop>`-Attribut. `ComponentContext` neu ausgezählt: **33 Member plus Konstruktor, 5
    dokumentiert** — die 31 waren zu niedrig. Die vier Zeilen von Paket 13 und die zwei Typtabellen
    von Paket 11 gegen den Code nachgeprüft und als Tabu eingetragen, alle korrekt. Sechs neue
    Abweichungen gefunden, die auf keiner Liste standen: der Einleitungssatz von §`<shae-prop>`
    (»parent«), `no-structured-clone` ohne `local` still wirkungslos, `"false"` fehlt bei den
    `auto-sync`-Aus-Werten, `fps <= 0` warnt statt zu takten, die Host-los-Warnung ist pro Element
    gedeckelt und an `isConnected` gebunden, und `:1309-1311` wird durch den geplanten Typnamen-Absatz
    falsch. Das Paket ist an der Überschrift `## Web Components` geteilt; die Klassenreferenz ist
    Paket 12d. `test:ci` für `@spearwolf/shadow-objects` nachgemessen: 327 in 14 Dateien, rc=0.

</details>

### [x] 12d. Die Klassenreferenz gegen den Code stellen

- Hash: `4dc57ae`
- Ergebnis: 3 Runden · die Klassenreferenz vor `## Web Components` und der Klassenteil des Cheat-Sheets stehen gegen den Code · Nullprobe gehalten: test:ci 637, e2e 402, `dist/` 198, `git diff --stat` genau drei Dateien, kein Code angefasst · Paket 12e wurde nicht gebraucht, der Cheat-Sheet-Teil lief mit derselben Strenge mit
- `ComponentContext` hatte 5 von 33 öffentlichen Membern dokumentiert und eine Einleitung, die der Klasse einen Kanal zuschrieb, den sie nicht besitzt. Ein veröffentlichtes Beispiel iterierte eine Funktion und warf einen `TypeError`. `on`/`once` waren als `void` angegeben, obwohl beide den Unsubscribe durchreichen. Eine Fehlerklasse war als Fangobjekt dokumentiert, ohne exportiert zu sein.
- **Der Implementierer hat zwei Planbehauptungen verweigert**, beide unabhängig bestätigt: `dispatchShadowObjectsEvent('toString', …)` erreicht das Shadow Object sehr wohl (`Entity.dispatchViewEvents` emittiert den Symbolnamen `onViewEvent` und trägt den String nur als Argument), und `ShadowEnv.ns$` wird im gesamten `src/` nie geschrieben. Seinen eigenen ersten Entwurf zu `ns$` hat er verworfen, weil er eine Bindung beschrieb, die nie kommt.
- Der Reviewer hat 36 Aussagen nachgemessen, 32 trugen. Vier wurden nachgebessert: die Behauptung, der Parent komme beim Context-Wechsel mit; der `start()`-Ausgang nach `destroy()` (der wahrscheinlichere Fall fehlte); die `clear()`-Empfehlung, die in genau die Falle führte, vor der sie warnte; und ein neuer TypeScript-Block, der nicht kompilierte.
- **Der lehrreichste Punkt betrifft das Prüfinstrument.** Der kaputte TS-Block rutschte durch zwei unabhängige Löcher: Der Implementierer hatte den Block von Hand transkribiert und dabei ein `: any` ergänzt, das den Fehler verdeckte — und sein Prüfprojekt mischte Signatur-Schnipsel mit echtem Code, sodass `tsc` an Syntaxfehlern abbrach und die semantische Phase nie erreichte; nach dem Aussortieren sprangen 114 semantische Meldungen auf. Sein `rc=0` war doppelt wertlos. Der Extraktor ist mechanisch neu gebaut, und der Reviewer hat mit zwei eigenen semantischen Brüchen belegt, dass er jetzt beißt. Die Regel dazu: **abgeschrieben zählt als ungeprüft.**
- Ein Nachtrag, der über das Paket hinausreichte: Die falsche Vierer-Liste stammte aus `CHANGELOG.md:53`, einer Zeile **dieses Laufs**. Auf zwei Ebenen nachgemessen — am rohen `ViewComponent.context`-Setter geht der Parent verloren, bei einem `ns`-Wechsel an einem verschachtelten `<shae-ent>`-Paar steht er wieder da, auf **derselben** `ViewComponent`-Instanz. Die Zeile hatte im Ergebnis recht, im Mechanismus nicht: der Parent wird nicht mitgetragen, sondern aus dem Elementbaum neu abgeleitet. Genau das erklärt den Kontrollfall, in dem ein Kind allein als Wurzel ankommt. Drei Fundstellen geprüft, zwei korrigiert, eine (`api-reference.md:1093`, Memory-Recovery) zu Recht unverändert.
- Nebenbefunde: neun Wertexporte von `index.ts` ohne jede Doku-Zeile, die falsche Zuschreibung in `CHANGELOG.md:66`, und `ShadowEnv.ns$` als toter öffentlicher Slot — alle drei unter »Vorbestehende Fehler«.
- Folgen: Für **Paket 17** bleiben die Backlog-Einträge (bis 2026-08-17 war das 12c, Schritt 7); für 16 der Rest der ungelesenen Abschnitte.

- Findings: — (herausgelöst aus Paket 12b am 2026-08-17, Planer 12b, Zug 0)
- Ziel: `api-reference.md` §ViewComponent, §ComponentContext, §ShadowEnv und §Environment Proxies
  beschreiben die Oberfläche, die ein Konsument tatsächlich vorfindet — und die zwei bekannten
  Grenzen von `RemoteWorkerEnv` stehen dort, wo jemand über sie stolpert. Der Klassenteil des
  `cheat-sheet.md` sagt dasselbe wie die Referenz, an jeder Stelle, wo beide etwas sagen.
- Bereich: `packages/shadow-objects/docs/api-reference.md` **nur** `:556`–`:1071` **plus zwei
  namentlich genannte Gegenstellen davor** (`:232`–`:266` die Rückgabetypen von `on`/`once`,
  `:358`–`:397` die `entity`-Instanz — Begründung unter Schritt 4a),
  `packages/shadow-objects/docs/cheat-sheet.md` **außerhalb** von `:210`–`:289`,
  `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: Paket 12b (beide Pakete fassen dieselben zwei Dateien an, also strikt nacheinander)
- Modell: stärkste Stufe — allein `ComponentContext` bringt 29 Einträge, die es heute nicht gibt.
- **Warum das Paket existiert:** `ComponentContext` hat **33 öffentliche Member plus einen
  Konstruktor**; dokumentiert sind **fünf** (`get()`, `ns`, `isDisposed`, `clear()`, `dispose()`).
  Eine Referenz, die sechs Siebtel ihrer Oberfläche verschweigt, ist das Problem — nicht die Länge
  der Sätze, die es beheben.
- **Wenn das Paket kippt, ist die Trennlinie schon gezogen.** Zeigt die erste Runde, daß der
  Cheat-Sheet-Teil nicht mit derselben Strenge mitläuft, wird er als **Paket 12e** herausgelöst —
  zusammen mit den zwei api-reference-Gegenstellen aus Schritt 4a, weil sie mit ihm ein Paar bilden
  und ein halb berichtigtes Paar schlimmer ist als ein durchgehend falsches. 12e läuft dann
  unmittelbar nach 12d und vor 12c. Nummern werden nie neu vergeben.

<details>
<summary>Detailplan Paket 12d</summary>

- Dateien: `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/docs/cheat-sheet.md`, `packages/shadow-objects/CHANGELOG.md`

- **Jede Aussage wird am Code belegt, nicht an diesem Plan.** Nicht am CHANGELOG, nicht an der
  jeweils anderen Doku-Datei, nicht an einem JSDoc-Kommentar — der beschreibt eine Absicht, die
  Signatur beschreibt die Oberfläche. Wo unten eine Formulierung vorgegeben ist, gilt sie als
  Vorschlag: der Implementierer prüft sie an der genannten Stelle und **hält an**, wenn der Code
  etwas anderes sagt, statt die Formulierung zu übernehmen. Paket 12b hat auf diesem Weg vier
  Behauptungen seines eigenen Detailplans widerlegt; drei weitere Aussagen griffen trotzdem zu weit
  und mußten in Runde zwei nachgebessert werden, darunter eine, die eine Bindung versprach, die nie
  kommt. Die Quote ist der Grund für die vier Instrumente unter »Verify«.

- **Stand der Zeilennummern (2026-08-17, Planer 12d, nach 12b nachgezogen).** In
  `api-reference.md` ist **nichts verrutscht**: 12b hat ausschließlich hinter `## Web Components`
  (`:1072`) geschrieben. §ViewComponent `:556`, §ComponentContext `:731`, §ShadowEnv `:803`,
  §Environment Proxies `:947` stehen unverändert. In `cheat-sheet.md` ist alles **hinter `:210` um
  +17 gewandert**, weil 12b §Web Component Attributes von `:210`–`:272` auf `:210`–`:289`
  verbreitert hat. Die neuen Stellen: Entity-API-Tabelle `:297`–`:304` (`propKeys` `:302`,
  `propEntries` `:303`, `traverse(cb)` `:304`), §ViewComponent API `:315`, Import `:318`,
  Destroyed-Tabelle `:339`–`:342`, §ShadowEnv Quick Setup `:348`. Vor `:210` ist nichts gewandert
  (`:6`, `:37`–`:45`, `:58`–`:73`, `:116`–`:124`). Trotzdem gilt: es gilt der Text, nicht die Zahl.

- Vorgehen:

  1. **§ComponentContext (`:731`–`:801`) — die größte Lücke des Bestands.** Der Einleitungssatz
     (`:733`) ist falsch: `ComponentContext` »handles the communication channel (Worker or Local) to
     the Kernel« — die Datei importiert weder Worker noch Kernel noch Proxy
     (`view/ComponentContext.ts:1-7`); den Kanal hält `ShadowEnv` über `envProxy`
     (`view/ShadowEnv.ts:112-140`). `ComponentContext` ist View-Zustand und Change-Trail-Erzeuger.
     Der Abschnitt wird nach demselben Muster gebaut wie §ViewComponent darüber: eine Tabelle für
     Properties und statische Member, dann Methoden in Gruppen, jede mit Signatur und einem Satz.
     Alle Zeilen aus `view/ComponentContext.ts`:

     | Gruppe | Member |
     |---|---|
     | Statisch | `get(namespace?)` ✓ (`:61`), `getContextsMap()` (`:54`), `ReRequestParentRoots` (`:51`), `ReRequestParent` (`:52`) |
     | Konstruktor | `new ComponentContext(ns?)` (`:78-86`) — gibt die **bestehende** Instanz zurück, wenn der Namespace schon belegt ist |
     | Bestand | `ns` ✓ (`:70`, in der `.d.ts` optional), `isDisposed` ✓ (`:95`), `hasComponent` (`:146`), `hasComponents` (`:150`), `isRootComponent` (`:154`), `isChildOf` (`:204`), `getChildren` (`:169`), `traverseLevelOrderBFS` (`:335`) |
     | Baum | `addComponent` (`:99`, wirft `ComponentContextDisposedError`), `destroyComponent` (`:158`), `addToChildren` (`:212`, wirft ein nacktes `Error` bei `:220`), `removeFromParent` (`:173`), `moveToRoot` (`:191`), `removeSubTree` (`:229`), `changeOrder` (`:313`), `changeToken` (`:200`) |
     | Properties | `setProperty` (`:250`, gibt `boolean` zurück), `removeProperty` (`:264`), **`transferPropertiesTo(component, target)`** (`:291-303`) |
     | Ereignisse | `dispatchShadowObjectsEvent` (`:342`), `broadcastEvent` (`:349`), `dispatchMessage` (`:358`), `dispatchReRequestParentRoots` (`:365`), **`dispatchReRequestParentChildren(component)`** (`:382`), **`dispatchReRequestParentSiblings(component, data?)`** (`:408`) |
     | Change Trail | `buildChangeTrails(clearChanges = true)` (`:429`), `reCreateChanges()` (`:470`) |
     | Lebensende | `clear()` ✓ (`:505`), `dispose()` ✓ (`:534`) |

     Die Gruppentabelle ist am 2026-08-17 gegen `dist/src/view/ComponentContext.d.ts` ausgezählt und
     summiert sich auf genau 33 (4 + 8 + 8 + 3 + 6 + 2 + 2); alle 34 Zeilenangaben sind an der
     Fundstelle bestätigt. Sie ist damit **vollständig** — wer kürzen muß, kürzt an der Beschreibung,
     nicht an der Liste.

     Die drei fettgedruckten sind in diesem Lauf entstanden und tragen sichtbares Verhalten:
     `transferPropertiesTo` ist der Grund, warum ein Context-Wechsel die Properties mitnimmt — der
     Wert wird zuerst geschrieben, die `isEqual`-Funktion erst danach registriert (`:291-303` gegen
     `#registerPropIsEqual` `:305-311`, Begründung im JSDoc `:268-290`) —, und der Abschnitt zum
     `context`-Setter von `ViewComponent` erwähnt das bisher mit keinem Wort.
     `dispatchReRequestParentSiblings` schickt `ReRequestParent` und fällt bei elternlosem Component
     auf `dispatchReRequestParentRoots()` zurück (`:408-413`).

     **Drei Nachträge an vorhandenen Zeilen** — die ersten zwei sind am 2026-08-17 gemessen:

     - **`clear()` (`:761-763`) läßt lebende Components als Untote zurück.** Gemessen: nach
       `ctx.clear()` meldet eine `ViewComponent`, die drin war, `isDestroyed === false`, ihr
       `context` zeigt weiter auf den Context, und jedes `setProperty` gibt `false` zurück und
       schreibt nichts. `dispose()` macht es umgekehrt und zerstört sie zuerst
       (`ComponentContext.ts:539-541`); der Code weiß es und sagt es im Kommentar bei `:314-315`
       (»`clear()` and `dispose()` both leave live components pointing back at us«). Die
       Doku sagt heute nur »can be used again afterwards«. Ein Satz in den `clear()`-Absatz: was der
       Aufrufer noch in der Hand hält, ist danach nicht zerstört, sondern taub — wer die Components
       weiterverwenden will, weist ihnen einen `context` zu.
       **Die Formulierung des Vorgängerplans an dieser Stelle fällt:** dort stand, `clear()` leere
       auch die `ComponentMemory` (`:507`) und widerspreche damit der Recovery-Zusage bei `:861`. Das
       Leeren stimmt, der Widerspruch nicht — nach einem `clear()` gibt es keine Components mehr, die
       eine Wiederherstellung betreffen könnte, und `reCreateChanges()` steigt bei leerer Memory
       sofort aus (`:471`). Gemessen: `clear()` → `reCreateChanges()` → `buildChangeTrails()` ergibt
       ein leeres Trail, und das ist richtig so. Nicht eintragen.
     - **`destroyComponent()` (`:158`) löst die Bindung nicht.** Gemessen:
       `ctx.destroyComponent(vc)` → `vc.isDestroyed === false`. Die Methode ist öffentlich und
       schreibt nur die Destroy-Änderung; das Ablösen macht `ViewComponent.destroy()`
       (`ViewComponent.ts:247-251`). Ein Leser, der den Namen für »zerstören« nimmt, hält danach
       einen Component, der lügt. Ein Halbsatz an der Tabellenzeile, mit Verweis auf
       `ViewComponent.destroy()` als dem Weg, den ein Anwender nimmt.
     - **`reCreateChanges()` broadcastet `ContextLost` an jede `ViewComponent`** (`:496` über
       `broadcastEvent` `:349-353`). Gemessen an einem Elternteil und einem Kind: beide bekommen es.

     **Erwarteter Umfang:** rund 29 neue Einträge plus diese drei Nachträge.

  2. **§ViewComponent (`:556`–`:730`), sieben Nachträge.** Alle aus `view/ViewComponent.ts`:
     - Konstruktor (`:570-577`): ohne `context` wird `ComponentContext.get()` genommen (`:176`). Und
       ein `options`, das eine `ViewComponent` ist, wird als `{parent: options}` gelesen (`:165-167`)
       — eine Altsignatur, die nirgends steht. **Am 2026-08-17 gemessen und dabei geschärft:** die
       Altform trägt keinen `context` mit, der Component landet also in
       `ComponentContext.get()`. Sie funktioniert damit **nur**, wenn der übergebene Elternteil
       ebenfalls im Default-Context lebt; sonst wirft der Konstruktor
       `ViewComponentError: cannot add a child from another context` (`:179` über
       `assertUsableAsParent` `:21-23`). Wer das nicht dazuschreibt, dokumentiert eine Abkürzung, die
       im Namespace-Fall in einen Fehler läuft.
     - Die Tabelle bei `:570` ist mit »Option« überschrieben, führt aber `token` als ersten Eintrag;
       `token` ist ein positionaler Parameter (`:153-162`).
     - Properties (`:579-589`): eine Zuweisung `component.context = null` **zerstört** die Komponente
       (`:73-90`, `isDestroyed` danach `true` über `:121-123`). Der Abschnitt beschreibt bisher nur
       die Gegenrichtung. Direkt daneben: eine Komponente, die in einen **anderen** Context wechselt,
       nimmt ihre Properties mit (`:105-107` → `ComponentContext.transferPropertiesTo`).
     - Methoden (`:602-668`): `isChildOf(parent)` (`:185-187`) und
       `dispatchEvent(type, data, traverseChildren)` (`:237-245`) fehlen; `dispatchEvent` taucht bei
       `:679` in der Destroyed-Tabelle auf, ohne je eingeführt worden zu sein.
     - Die Ereignisse, die eine `ViewComponent` aus dem Framework selbst empfängt, stehen nirgends:
       `ComponentContext.ReRequestParentRoots`, `ComponentContext.ReRequestParent` (mit `data`) und
       `ContextLost` (`constants.ts:27`, Broadcast `ComponentContext.ts:496`). Gehört zu
       `#### on(type, listener)` (`:654-665`), das heute nur ein erfundenes `'msg-from-shadow'` zeigt.
       **Dazu am 2026-08-17 gemessen:** die Überschrift `#### on(type, listener)` liest sich als
       Methode, und es gibt keine — weder in `ViewComponent.d.ts` noch zur Laufzeit
       (`vc.on === undefined`, obwohl der Konstruktor `eventize(this)` aufruft, `:163`). Nur die
       freistehende Funktion `on(component, …)` aus `@spearwolf/eventize` trägt, und genau die zeigt
       der Rumpf bei `:659-663` schon richtig. Die Überschrift wird zu etwas, das keine Methode
       verspricht, und ein Satz sagt, daß die eventize-Oberfläche über die freien Funktionen läuft.
       Derselbe Satz deckt `once`, `off` und `emit` mit ab.
       Gegenstelle: `cheat-sheet.md:193-208` macht es bereits richtig (`import { on } from
       '@spearwolf/eventize'`, `:201`) und bleibt.
     - `ContextLost` ist **derselbe String** wie `ShadowEnv.ContextLost` — beide `'contextLost'`
       (`constants.ts:27` gegen `ShadowEnv.ts:28`, gemessen). Zwei Ereignisnamen, ein Wert, zwei
       verschiedene Absender: der Broadcast an jede `ViewComponent` und das Ereignis der `ShadowEnv`.
       Ein Satz, damit niemand den einen Listener für den anderen hält.
     - `ViewComponentError` wird bei `:629` und `:681` als Fangobjekt genannt, ist aber **nicht
       exportiert** (`ViewComponent.ts:6`, kein `export`; `index.ts:17` reicht nur die Klasse durch).
       Der Satz sagt, daß nur `error.name === 'ViewComponentError'` geht (`:9`). Die Klasse zu
       exportieren ist eine API-Änderung und geht in den Backlog (**Paket 17, Schritt 2**).
       **Gegenstelle: `cheat-sheet.md:342`** (nicht mehr `:325`) sagt dasselbe und braucht denselben
       Halbsatz.
     - `dispatchShadowObjectsEvent` (`:646-652`): ein `type`, der nur einen geerbten
       `Object.prototype`-Member trifft (`toString`, `valueOf`, `constructor`, `hasOwnProperty` und
       Verwandte), stellt nichts zu. Steht als Verhaltensänderung im `[Unreleased]`-Kopf des
       Paket-CHANGELOG und in keiner Referenz. Ein Halbsatz, niedrige Priorität — fällt zuerst, wenn
       das Paket kippt.

  3. **§ShadowEnv und §Environment Proxies (`:803`–`:1071`), neun Nachträge.**
     - `ShadowEnv.ContextCreated` ist **retained** (`view/ShadowEnv.ts:59`) und wird beim
       `ContextLost` geleert (`:61-63`, `Priority.Critical`) — ein spät registrierter Listener bekommt
       es noch. Die Doku nennt Retention bei `RemoteWorkerEnv.WorkerLoaded` (`:1022`) und
       `WorkerFailed` (`:1023`) ausdrücklich, hier nicht. Am 2026-08-17 in beiden Richtungen gemessen:
       ein nach `ready()` registrierter Listener bekommt das Ereignis sofort, und nach einem
       `ContextLost` bekommt der nächste neue Listener nichts mehr.
     - Die Ereignistabelle (`:841-848`) nennt für `ContextCreated`/`ContextLost` keine Payload; beide
       emittieren die `ShadowEnv`-Instanz (`ShadowEnv.ts:68`, `:74`, gemessen). Bei `AfterSync` und
       `ProxyFailed` steht sie da.
     - **Die Properties-Tabelle (`:821-826`) läßt vier öffentliche Member aus**, alle in
       `ShadowEnv.d.ts`: `logger` (`ShadowEnv.ts:44`, `readonly ConsoleLogger`), `ns$` (`:46`,
       `readonly Signal<NamespaceType | undefined>`), `viewReady` (`:48`) und `proxyReady` (`:49`).
       Die letzten zwei sind `@signal() accessor` und damit **schreibbar**; sie sind die Eingänge des
       Effects, der `ContextCreated`/`ContextLost` auslöst (`:65-79`). Dazu, in derselben Zeile
       berichtigt: `:825` beschreibt `isReady` als »both view and proxy are ready«, gerechnet wird
       aber `#comCtx && #shaObjEnvProxy && proxyReady && !isDestroyed` (`:144-146`) — `viewReady`
       steht nicht darin. Gemessen: `env.viewReady = false` läßt `isReady` auf `true`. Der Satz muß
       sagen, worauf es ankommt (ein gesetzter `view`, ein gestarteter `envProxy`), nicht auf welche
       zwei Flags es *nicht* ankommt.
     - `RemoteWorkerEnv.start()` (`:1015`) »Rejects with a `WorkerDestroyedError` after `destroy()`«
       gilt nur, wenn vorher ein Worker existierte: `destroy()` steigt ohne Worker sofort aus,
       **ohne** `#isDestroyed` zu setzen (`view/RemoteWorkerEnv.ts:266-267` gegen `:272`).
       `new RemoteWorkerEnv(); destroy(); start();` startet also einen Worker (`:151-156`, `:170`),
       und `isDestroyed` (`:1006`) bleibt `false`. Betrifft dieselbe Zusage bei `:1013`
       (`importScript`) und `:1014` (`applyChangeTrail`). Als **bekannte Grenze** eintragen — die
       Korrektur ist Code und gehört in den Backlog (**Paket 17, Schritt 2**), eingelöst von Paket 15.
     - `workerLoaded` (`:1007`) hat einen dritten Ausgang: ein `destroy()` während eines laufenden
       `start()` bricht den `#workerFailure`-Controller nicht ab (Abort nur in `handleWorkerFailure`,
       `:305`) und emittiert kein `WorkerLoaded` (`start()` wirft vorher bei `:182-184`) — die Promise
       (`:111-139`) bleibt für immer pending. Ebenfalls als bekannte Grenze plus Backlog-Eintrag; die
       Doku zieht bei `ShadowEnv.destroy()` (`:889`ff) ausdrücklich die Gegenlinie.
     - `LocalShadowObjectEnv` (`:983-987`): `start()` (`LocalShadowObjectEnv.ts:47`) und
       `applyChangeTrail(data, waitForConfirmation)` (`:51`) fehlen in der Methodentabelle, obwohl
       `RemoteWorkerEnv` beide führt; `applyChangeTrail` ignoriert `waitForConfirmation` (der
       Parameter heißt im Code `_waitForConfirmation`, gelaufen wird synchron über `kernel.run()`
       bei `:55`). Der `constructor(registry?)` fehlt als Tabelleneintrag — **abgeschwächt:** er ist
       im Codeblock bei `:964-970` samt Warnung zum Default-Registry gezeigt, es fehlt nur die Zeile
       in der Übersicht. Ein Eintrag, kein Absatz.
     - **`RemoteWorkerEnv.logger`** (`readonly ConsoleLogger`, in der `.d.ts`) fehlt in der
       Properties-Tabelle `:1002-1007`. Damit sind dort alle vier öffentlichen Methoden geführt und
       eine von drei Properties fehlt; das ist die einzige Lücke auf dieser Seite.
     - §Environment Proxies (`:947-951`) verspricht »any implementation of `IShadowObjectEnvProxy`«,
       nennt aber nur die zwei optionalen Callbacks. Die vier Pflichtmember stehen in
       `view/IShadowObjectEnvProxy.ts:5`, `:7`, `:9`, `:11`, die zwei optionalen bei `:13` und `:20`;
       die Signatur von `onProxyFailed` (`(reason: unknown)`) fehlt auch. Gegen
       `dist/src/view/IShadowObjectEnvProxy.d.ts` gezogen, das die Optionalität mit `?` markiert und
       damit der Beleg ist.
     - **Vier Namen, die `index.ts` veröffentlicht und die in keiner Referenz stehen** — am
       2026-08-17 mit einem `grep` über `docs/` und beide `README.md` gemessen, je null Treffer:
       `GlobalNS` (`constants.ts:19`), `VoidToken` (`:21`), `ContextLost` (`:27`) und `toNamespace`
       (`utils/toNamespace.ts`). Dasselbe Instrument, aus dem 12b den Abschnitt
       `#### Driving the Lookup by Hand` gebaut hat; hier reichen vier Sätze an vorhandenen Stellen,
       kein neuer Abschnitt:
       `GlobalNS` und `toNamespace` in §ComponentContext → `### Namespacing` (`:792-799`) — das ist
       der Namespace, auf den `ComponentContext.get()` ohne Argument fällt (`:78`), und die
       Normalisierung, durch die jeder `ns` geht (`ComponentContext.ts:62`, `:79`);
       `VoidToken` zu §ViewComponent → Properties, wo `:572` und `:583` den Wert `#void` als Literal
       nennen, ohne die Konstante zu nennen, unter der er exportiert ist;
       `ContextLost` zum Ereignisabsatz aus Schritt 2.

  4. **`docs/cheat-sheet.md` außerhalb der Elementtabellen, sieben Berichtigungen.** Die
     Zeilennummern sind gegenüber dem Vorgängerplan um +17 gewandert, soweit sie hinter `:210`
     liegen — siehe »Stand der Zeilennummern« oben.
     - `:302-303` (vormals `:285-286`): `entity.propKeys` und `entity.propEntries` sind **Methoden**,
       nicht Properties (`in-the-dark/Entity.ts:317`, `:321`). In derselben Tabelle steht
       `entity.traverse(cb)` mit Klammern (`Entity.ts:142`) — die beiden bekommen ihre auch.
       `entity.kernel` (`types.ts:90`, Getter `Entity.ts:72-74`) fehlt ganz.
       **Gegenstelle: `api-reference.md:371-372`, siehe Schritt 4a — dieselbe Verwechslung, dort mit
       einem Beispiel, das sie ausführt.**
     - `:340` (vormals `:323`): In der Tabelle »After `destroy()`« stehen `token` und `order` unter
       »Ignored«. Die Setter laufen und ändern den lokalen Wert, nur die Meldung an den Context
       entfällt (`view/ViewComponent.ts:45-50`, `:134-140`, weil `#context` `undefined` ist,
       `:121-123`). `api-reference.md:676` sagt es richtig — der Cheat Sheet hat unrecht. 12b hat
       diese Tabelle **nicht** angefaßt, sie lag außerhalb seines Bereichs; der Widerspruch steht
       unverändert.
     - `:72-73`: `on` und `once` geben die Unsubscribe-Funktion zurück, nicht `void`
       (`types.ts:154-158`, Implementierung `in-the-dark/Kernel.ts:677-693` und `:695-711`, die den
       Unsubscribe über `Object.assign` durchreichen).
       **Gegenstelle: `api-reference.md:237-238` sagt ebenfalls `=> void`, siehe Schritt 4a.**
     - `:62`, `:64`, `:65`, `:66`, `:67`: `useProperty` (`types.ts:134`), `useContext` (`:124-127`),
       `useParentContext` (`:129-132`), `provideContext` (`:112-116`) und `provideGlobalContext`
       (`:118-122`) haben alle einen `options`-Parameter
       (`SignalValueOptions<T> | CompareFunc`, `:97-99`; `ProvideContextOptions` zusätzlich mit
       `clearOnDestroy`, `:101-103`). `useProperties` (`:63`) hat **keinen** (`:136-140`) und bleibt.
     - `:120-124` und `:6`: Der Lebenszyklus eines Shadow Object hängt **nicht** am Lebenszyklus der
       Entity. Er läuft erneut bei einer Token-Änderung (`Kernel.ts:360-369` → `:381-416`) und bei
       Property-Änderungen, die eine `'@prop'`-Route umschalten (`Kernel.ts:355-358`, truthy-Liste
       `Entity.ts:331-346`, Routenauflösung `in-the-dark/Registry.ts:98-118`); `[onDestroy]` läuft
       auch ohne Zerstörung der Entity, wenn ein Konstruktor wegfällt (`Kernel.ts:399` →
       `:833-838`). Der Code sagt es selbst in `in-the-dark/events.ts:8-16` und `:23-29`. Und eine
       Entity kann mehrere Shadow Objects tragen (`Registry.ts:43-50`, `:123-132`,
       `Kernel.ts:407-413`) — »die Setup-Funktion läuft einmal pro Entity« ist in zwei Richtungen
       falsch.
       **Gegenstellen in `concepts.md` und `guides.md` gehören zu Paket 12c** — dort ist die
       Schrittliste am 2026-08-17 um `concepts.md:201`, `:209` und `guides.md:9` erweitert worden,
       die dieselbe Behauptung tragen. Nach 12c müssen die drei Dateien dasselbe sagen.
     - `:37-45`: `onCreate`/`onDestroy` werden ohne Import benutzt und liegen nicht im Haupt-Entry,
       sondern in `@spearwolf/shadow-objects/shadow-objects.js` (`src/in-the-dark/events.ts:5`,
       `:21`, re-exportiert nur von `src/shadow-objects.ts:2`, Subpfad `package.json:38-41`;
       `index.ts` reicht sie **nicht** durch, am 2026-08-17 an beiden Entries nachgelesen). Zeile
       `:318` (vormals `:301`) zeigt daneben einen Import aus `'@spearwolf/shadow-objects'`, der
       korrekt ist — der Leser überträgt die falsche Quelle. Ein Import über dem Beispiel.
     - `:58-70`: die Rückgabetypen von `provideContext`/`provideGlobalContext` (`Signal<Maybe<T>>`)
       und `useProperty`/`useContext`/`useParentContext` (`SignalReader<Maybe<T>>`) gegen
       `types.ts:112-140` nachziehen, soweit sie noch nicht stimmen.

  4a. **Zwei Gegenstellen in `api-reference.md` vor `:556`** — nachgetragen am 2026-08-17 (Planer
     12d). Sie liegen außerhalb des sonstigen Bereichs dieses Pakets und werden **trotzdem hier**
     angefaßt, weil sie mit zwei Berichtigungen aus Schritt 4 ein Paar bilden: berichtigt man nur den
     Cheat Sheet, widersprechen sich die zwei Dateien anschließend an genau der Stelle, an der sie es
     vorher nicht taten. Das ist der Fehler, den Paket 12b zweimal gefunden hat. Nur diese zwei
     Stellen, nichts weiter aus den Abschnitten drumherum:
     - **`:358`–`:397` (§7 »The `entity` Instance«).** `entity.propKeys` und `entity.propEntries`
       stehen bei `:371-372` unter `#### Properties` als `(readonly)`, und der Codeblock `:374-379`
       läuft `for (const [key, value] of entity.propEntries)` — ein `for…of` über eine Funktion, das
       einen `TypeError: entity.propEntries is not iterable` wirft (am 2026-08-17 gemessen). Ein
       Beispiel, das ein Leser abtippt und das sofort bricht. Beide bekommen ihre Klammern, das
       Beispiel wird lauffähig, und `entity.kernel` (`types.ts:90`) kommt dazu. Dazu ist `:371` auch
       inhaltlich falsch: »All property keys currently set on this Entity« — `propKeys()` gibt
       `Array.from(this.#props.keys())` zurück, also **jeden** je gesetzten Key, gelöschte
       eingeschlossen; `cheat-sheet.md:302` sagt es bereits richtig.
     - **`:232`–`:266` (§4 »Events«).** Die Signaturen bei `:237-238` (`on`) und der Verweis darauf
       bei `:264-266` (`once`) sagen `=> void`; beide geben die Unsubscribe-Funktion zurück
       (`types.ts:154-158`, `Kernel.ts:677-693`, `:695-711`). Dieselbe Berichtigung wie
       `cheat-sheet.md:72-73`.
     **Nicht anfassen:** alles andere in §Shadow Object Creation API, §Registry, §Namespacing and
     Contexts, §Kernel und §Advanced. Diese fünf Abschnitte hat **kein Paket dieses Laufs** gegen den
     Code gehalten (12b hat §Web Components und die View-API gelesen); sie gehören zur
     Shadow-Environment-Seite und damit außerhalb des View-Layer-Audits. Ein Backlog-Eintrag dazu geht
     über **Paket 17, Schritt 2** (bis 2026-08-17 Paket 12c, Schritt 7). Und `api-reference.md:246`
     — inzwischen `:253`, der `onViewEvent`-Import aus dem
     Haupt-Entry — gehört zum Importmuster, das **Paket 12c** im Ganzen räumt, und bleibt hier liegen.

  5. **Die siebzehn Verhaltensänderungen dieses Laufs gegenlesen.** Der `[Unreleased]`-Kopf der
     `packages/shadow-objects/CHANGELOG.md` zählt sie auf; Paket 12b hat die sieben elementsichtbaren
     abgearbeitet und die übrigen hierher verwiesen. In Zug 0 gegen die Klassenabschnitte gehalten:

     | Änderung | Klassenreferenz | Cheat Sheet |
     |---|---|---|
     | `ComponentContext.transferPropertiesTo()` ist neu und öffentlich | **fehlt** (Schritt 1) | — |
     | `ComponentContext.dispatchReRequestParentChildren/Siblings()` sind neu | **fehlt** (Schritt 1) | — |
     | `setProperty()` gibt auf beiden Klassen `boolean` zurück | steht (`:604`, `:677`) | steht (`:323`) |
     | `ViewComponent.isDestroyed` | steht (`:588`, `:670-695`) | steht (`:333`) |
     | `dispose()`/`isDisposed` und `ComponentContextDisposedError` | steht (`:757`, `:765-790`) | steht (`:387-392`) |
     | Ein `ns`-Wechsel nimmt die Properties mit (`context`-Setter) | **fehlt** (Schritt 2) | — |
     | `dispatchShadowObjectsEvent` erreicht keinen `Object.prototype`-Namen mehr | **fehlt** (Schritt 2, niedrig) | — |
     | `RemoteWorkerEnv` lehnt mit `WorkerDestroyedError`/`WorkerFailedError` ab | steht (`:1013-1016`, `:1035-1037`) | — |
     | Die `.d.ts` tragen `\| undefined`, wo ein Wert fehlen kann | steht in den Signaturen | — |

     Wer beim Durchgehen eine weitere findet, trägt sie hier nach, statt sie stillschweigend
     mitzuschreiben.

  6. **`packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`**: ein Stichpunkt
     `- **Docs (reference):** …` dafür, daß `ComponentContext` zum ersten Mal vollständig in der
     Referenz steht — mit den vier bisher nirgends genannten Exporten `GlobalNS`, `VoidToken`,
     `ContextLost`, `toNamespace` —, und ein zweiter `- **Docs (correctness):** …` für die
     Berichtigungen an §ViewComponent, §ShadowEnv, §Environment Proxies und dem Cheat Sheet,
     einschließlich der zwei als bekannte Grenze eingetragenen `RemoteWorkerEnv`-Fälle und des
     Beispiels in §7, das einen `TypeError` warf.

- **Tabu — diese Stellen faßt das Paket nicht an:**
  - **Alles ab `api-reference.md` §Web Components (`## Web Components`, `:1072`)** — das hat Paket 12b
    geschrieben, in zwei Runden und mit 35 gemessenen Verhaltensfällen. Dazu gehören die drei neuen
    Abschnitte `#### JavaScript API` an `<shae-ent>` und `<shae-worker>` und
    `#### Driving the Lookup by Hand`. Kein Nachschärfen, kein Umformulieren, kein Querverweis, der
    dort eine Zeile ändert.
  - **`cheat-sheet.md:210`–`:289`** (§Web Component Attributes, nach 12b um 17 Zeilen gewachsen) —
    ebenfalls 12b. Das schließt die Typtabelle `:270`–`:279`, die `boolean`-Fußnote `:281-282` und den
    Absatz »Two failures, two channels« `:284-288` ausdrücklich ein.
  - **`api-reference.md:1154`, `:1156` und `cheat-sheet.md:226`, `:228`** — von **Paket 13**
    geschrieben und von 12b gegen `ShaeEntElement.ts:601-610` und `:612-632` nachgeprüft.
  - **Die zwei Typtabellen `api-reference.md:1277`ff und `cheat-sheet.md:270`ff** — von **Paket 11**
    geschrieben und maschinell geprüft.
  - **Paket 12c gehört:** die zehn `export default`-Registry-Beispiele, darunter
    `api-reference.md:416`, `:518`, `:538` und `cheat-sheet.md:51`; `api-reference.md:318` und `:326`
    (die Beispiele ohne `forward-custom-events`); `api-reference.md:246` (der `onViewEvent`-Import aus
    dem Haupt-Entry); und die Dateien `guides.md`, `getting-started.md`, `best-practices.md`,
    `concepts.md`, `docs/README.md`, `packages/shadow-objects/README.md`, `README.md`,
    `TEST-PLAN.md`, `Backlog.md`. Ein halb korrigiertes Muster ist schlimmer als ein durchgehend
    falsches.
  - **§Shadow Object Creation API, §Registry, §Namespacing and Contexts, §Kernel, §Advanced** in
    `api-reference.md` — außer den zwei namentlich genannten Gegenstellen aus Schritt 4a. Diese
    Abschnitte hat kein Paket dieses Laufs gelesen; das ist eine Backlog-Zeile, kein Freibrief.
  - **Kein Code.** `ViewComponentError` wird **nicht** exportiert, `RemoteWorkerEnv.destroy()` wird
    **nicht** repariert (das ist Paket 15), `ComponentMemory` wird **nicht** umexportiert. Alles drei
    steht als Grenze in der Doku beziehungsweise als Zeile im Backlog. Dieses Paket ändert `dist/`
    nicht und keine Signatur.

- Verify: Kein Test kann eine Doku-Zeile prüfen. Die Prüfung sind vier Instrumente, die sich in
  Paket 12b bewährt haben, hier auf die Klassenschicht angewendet — und sie wird schriftlich
  festgehalten.

  1. **Signaturen gegen die emittierten Deklarationen, in beide Richtungen.**
     `pnpm -F @spearwolf/shadow-objects build`, dann je Klasse:
     ```
     for f in view/ComponentContext view/ViewComponent view/ShadowEnv \
              view/LocalShadowObjectEnv view/RemoteWorkerEnv view/IShadowObjectEnvProxy; do
       echo "== $f"
       grep -oE '^    (static |readonly |protected |get |set |accessor )*[A-Za-z][A-Za-z0-9_$]*' \
         packages/shadow-objects/dist/src/$f.d.ts | sed 's/^ *//' | sort -u
     done
     ```
     `accessor` gehört in die Klammer, sonst fallen `viewReady` und `proxyReady` aus der Liste — genau
     die zwei Member, die heute fehlen. **Kein Member ohne Doku-Zeile, keine Doku-Zeile ohne Member.**
     Die zweite Richtung ist die, die `#### on(type, listener)` auffliegen läßt. Das Ergebnis für
     `ComponentContext` — erwartet **33 plus Konstruktor**, am 2026-08-17 nachgezählt — gehört in die
     Verlaufszeile. Dazu einmal auf Modulebene: jeder Wertexport von `index.ts`
     (`grep -oE '^export declare (class|const|function) [A-Za-z0-9_]+' dist/src/**/*.d.ts` entlang der
     `index.ts`-Zeilen) hat entweder eine Doku-Zeile oder eine Backlog-Zeile.
  2. **Verhalten messen, nicht behaupten — hier in `vitest`, nicht in Chromium.** Anders als bei den
     Elementen hängt keine Aussage dieses Pakets an Custom-Elements-Semantik; die Bühne ist eine
     Wegwerf-Spec in `packages/shadow-objects/src/view/` mit happy-dom und dem `FakeWorker`-Mock aus
     `RemoteWorkerEnv.spec.ts:7-70` (`vi.mock('../create-worker.js')`). Danach entfernen,
     `git status --porcelain` bis auf die geänderten Dateien leer. Der Planer hat diese Sonde am
     2026-08-17 gefahren, **14 Fälle, alle grün**; sie ist nachzubauen, nicht abzuschreiben:
     - `new ComponentContext(ns)` gibt bei belegtem Namespace die bestehende Instanz zurück.
     - `clear()`: `hasComponents() === false`, aber `vc.isDestroyed === false`, `vc.context` zeigt
       weiter hin, `vc.setProperty(…) === false`, `buildChangeTrails()` leer.
     - `destroyComponent(vc)`: `vc.isDestroyed === false`. `dispose()`: `true`.
     - `clear()` → `reCreateChanges()` → `buildChangeTrails()` ist leer (der Beleg dafür, daß die
       Recovery-Behauptung des Vorgängerplans **nicht** einzutragen ist).
     - `reCreateChanges()` schickt `contextLost` an Elternteil **und** Kind.
     - `addToChildren` mit einem Parent aus einem anderen Context wirft einen Fehler mit
       `name === 'Error'`, keine benannte Klasse.
     - `new ViewComponent('c', parentVC)` bindet den Parent — im Default-Context; mit einem Parent in
       einem benannten Context wirft es `ViewComponentError`.
     - Ein Wechsel `vc.context = other` trägt die Properties mit (im Trail von `other` steht der Key);
       `vc.context = null` setzt `isDestroyed` auf `true`.
     - `dispatchReRequestParentSiblings(a)` bei elternlosem `a` erreicht **alle** Wurzeln mit
       `ReRequestParentRoots`, nicht die Geschwister mit `ReRequestParent`.
     - `ContextCreated` ist retained (ein Listener nach `ready()` bekommt es, Payload ist die `env`),
       `ContextLost` hat dieselbe Payload, und nach einem `ContextLost` bekommt der nächste neue
       Listener nichts.
     - `env.viewReady = false` läßt `isReady` auf `true`.
     - `new RemoteWorkerEnv(); destroy();` → `isDestroyed === false`, und ein folgendes `start()`
       erzeugt einen Worker.
     - `start()`, dann `destroy()` → `workerLoaded` verliert ein `Promise.race` gegen einen 150-ms-Timer.
     - `vc.on` ist `undefined` (in einer zweiten Sonde gemessen); `ContextLost === ShadowEnv.ContextLost`.
  3. **Jeden angefaßten Codeblock wörtlich ausführen.** Ein Beispiel, das nur gelesen wurde, gilt als
     ungeprüft — 12b hat genau daran drei Aussagen verloren. Der Bereich `:556`–`:1071` enthält
     **27 Blöcke**, am 2026-08-17 abgezählt: `:560-562`, `:566-568`, `:595-600`, `:608-613`,
     `:621-623`, `:635-640`, `:650-652`, `:658-664`, `:687-693`, `:701-727` (§ViewComponent),
     `:737-739`, `:747-750`, `:771-781`, `:787-790` (§ComponentContext), `:809-811`, `:815-817`,
     `:834-836`, `:849-859`, `:875-878`, `:884-887`, `:895-905`, `:913-926`, `:930-943` (§ShadowEnv),
     `:960-970`, `:996-1000`, `:1039-1046`, `:1061-1068` (§Proxies). Dazu `:374-380` (§7, der Block,
     der heute einen `TypeError` wirft) und in `cheat-sheet.md` `:306-311`, `:317-336`, `:350-369`,
     `:378-383`, `:387-392`. Wer einen Block nicht anfaßt, muß ihn nicht fahren — aber er zählt ihn
     ab und schreibt hin, welche er gefahren hat. TypeScript-Blöcke zusätzlich gegen `tsc`, mit
     Gegenprobe, daß die Gegenprobe auch bricht.
  4. **Zu jeder geänderten Aussage die Gegenstelle in der anderen Datei prüfen.** Das Paket entsteht
     aus solchen Paaren, hier sind sie namentlich:

     | Aussage | `api-reference.md` | `cheat-sheet.md` |
     |---|---|---|
     | `token`/`order` nach `destroy()` | `:676` (richtig) | `:340` (falsch) |
     | `propKeys`/`propEntries` sind Methoden | `:371-372` + Beispiel `:374-379` (falsch) | `:302-303` (falsch) |
     | `on`/`once` geben den Unsubscribe zurück | `:237-238`, `:264-266` (falsch) | `:72-73` (falsch) |
     | `ViewComponentError` ist nicht exportiert | `:629`, `:681` | `:342` |
     | Der eventize-Zugang ist die freie Funktion | `:654-665` (Überschrift falsch) | `:193-206` (richtig) |
     | Der Shadow-Object-Lebenszyklus hängt nicht an der Entity | — | `:6`, `:120-124` · Rest bei 12c (`concepts.md`, `guides.md`) |
     | `clear()` gegen `dispose()` | `:761-767` | `:387-392` |

     Wer eine Aussage ändert und die Gegenstelle nicht findet, notiert das, statt es anzunehmen.
  5. **Die Suite darf sich nicht bewegen.**
     `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test` zeigt dieselben
     Zahlen wie nach 12b, am 2026-08-17 vom Planer 12d **selbst nachgemessen**: `test:ci` **637**
     (`@spearwolf/shadow-objects` 327 in 14 Dateien, `shadow-objects-testing` 309 in 21 Dateien,
     `shae-offscreen-canvas` 1), e2e **402**, `lint` rc=0 mit den zwei bekannten `biome.json`-Infos,
     `find packages/shadow-objects/dist -type f | wc -l` = **198**. Ändert sich eine Zahl, hat jemand
     Code angefaßt.
  6. `git diff --stat` zeigt **genau drei** Dateien: die zwei Doku-Dateien und die
     Paket-`CHANGELOG.md`.

- Commit: `docs(api): bring the class reference in line with the code`
- Verlauf:
  - Zug 0 (2026-08-17, Planer 12b): Aus Paket 12b herausgelöst. Der Bestand von einem Kundschafter
    gegen den Code gehalten: `ComponentContext` **33 öffentliche Member plus Konstruktor, 5
    dokumentiert** (die zuvor notierten 31 waren zu niedrig; die Zählung des Vorgängerplans über ein
    `grep` verfehlt `setProperty` wegen des Typparameters und zählt den Konstruktor der Fehlerklasse
    mit — die `.d.ts` ist der verläßliche Weg). Fünf Nachträge des alten Plans bestätigt, drei neue
    gefunden: die Payload-Lücke der `ShadowEnv`-Ereignistabelle, die »Option«-Überschrift über einem
    positionalen Parameter, und daß `clear()` auch die `ComponentMemory` leert und damit der
    Recovery-Zusage bei `:861` widerspricht. Alle exportierten Fehlertypen sind dokumentiert; die
    einzige genannte, aber nicht exportierte Klasse ist `ViewComponentError`.
  - Zug 0 (2026-08-17, Planer 12d): Den Detailplan Punkt für Punkt an der Fundstelle abgeglichen und
    das Verhalten gemessen, statt es zu lesen. **Die Zählung hält:** `ComponentContext` hat 33
    öffentliche Member plus Konstruktor, gegen `dist/src/view/ComponentContext.d.ts` ausgezählt, und
    die Gruppentabelle des Plans summiert sich genau darauf (4+8+8+3+6+2+2); alle 34 Zeilenangaben
    stimmen. **Die api-reference-Zeilennummern sind nicht verrutscht** — 12b hat nur hinter `:1072`
    geschrieben —, die des Cheat Sheets hinter `:210` um +17; alle im Plan genannten Stellen neu
    gezogen. **Eine Behauptung des Vorgängerplans widerlegt:** `clear()` leert die `ComponentMemory`,
    aber es widerspricht der Recovery-Zusage bei `:861` **nicht** — nach einem `clear()` gibt es keine
    Components mehr, die eine Wiederherstellung betreffen könnte, und `reCreateChanges()` steigt bei
    leerer Memory aus (`:471`, gemessen). An ihre Stelle tritt der scharfe Fund: `clear()` läßt lebende
    `ViewComponent`s mit `isDestroyed === false` zurück, taub für jede Mutation — der Code sagt es
    selbst bei `:314-315`. Eine zweite Aussage geschärft: die Altsignatur
    `new ViewComponent(token, parentVC)` funktioniert nur, wenn der Parent im Default-Context lebt,
    sonst wirft sie. **Sieben Abweichungen gefunden, die auf keiner Liste standen:** `destroyComponent()`
    löst die Bindung nicht; `ShadowEnv` verschweigt `logger`, `ns$`, `viewReady`, `proxyReady`, und
    `isReady` rechnet ohne `viewReady`; `RemoteWorkerEnv.logger` fehlt; `api-reference.md:371-372`
    trägt dieselbe `propKeys`-Verwechslung wie der Cheat Sheet, mit einem Beispiel bei `:374-379`, das
    einen `TypeError` wirft; `api-reference.md:237-238` sagt `on`/`once` gäben `void` zurück; die
    Überschrift `#### on(type, listener)` verspricht eine Methode, die es weder in der `.d.ts` noch zur
    Laufzeit gibt (`vc.on === undefined`, gemessen); und vier Exporte von `index.ts` (`GlobalNS`,
    `VoidToken`, `ContextLost`, `toNamespace`) stehen in keiner Zeile Dokumentation. Sonde: 14 Fälle in
    `src/view/`, alle grün, Datei entfernt, Arbeitsbaum sauber. Nullprobe selbst nachgemessen: `test:ci`
    **637** (327/309/1), e2e **402**, `dist/` **198**. Bereich um zwei Gegenstellen vor `:556` erweitert
    (Schritt 4a), Tabu ausgeschrieben, Trennlinie für ein mögliches **Paket 12e** vorab gezogen. Eine
    Rückfrage vorgelegt: `ComponentMemory` ist ein Laufzeitexport ohne Deklaration.

</details>

### [x] 12c. Die Einstiegsdokumentation lauffähig machen

- Hash: `c0691da`
- Ergebnis: 2 Runden · die Einstiegsdokumentation läuft · Nullprobe gehalten: test:ci 637, e2e 402, `dist/` 198, `git diff --stat` genau zehn Dateien, `grep "export default"` über die Doku null Treffer, kein Code angefasst
- **Kein veröffentlichtes Registry-Beispiel lief.** Der Loader liest ausschließlich den benannten Export `shadowObjects`; die Doku zeigte an zehn Stellen `export default`. Im Worker-Pfad gab es einen Fehler, im lokalen Pfad passierte stillschweigend nichts — und dieses Schweigen verdeckte einen zweiten Fehler darunter: Die »Quick Look« der Front-Page ruft `count()` auf einer Signal-Instanz auf. Erst nach dem Lösen des Exports wurde er sichtbar, und auch dann nur als geschluckte Meldung in `ShadowEnv.#syncNow`.
- **Zwei Beispiele werden nicht gelesen, sondern ausgeführt** — mechanisch aus dem Markdown extrahiert und in echtem Chromium gefahren, vom Implementierer und vom Reviewer unabhängig. Vorher: 0 Shadow Objects, Property als String `"0"`, nach einem `increment` das gemessene `'01'`. Nachher: ein Shadow Object auf der Entity, Property als Zahl, Effekt-Log `[0, 1]`.
- 52 Codeblöcke wurden einzeln geprüft — je eine Datei, je ein `tsc`-Aufruf, je ein Exit-Code —, 19 grün und 33 absichtlich unvollständig, jeder einzeln begründet. Dazu 103 Links mit einem eigenen Prüfer, kein neuer Bruch. Fünf Planbehauptungen am Code widerlegt, darunter die, ein Abschnitt existiere nicht, den es sehr wohl gibt.
- **Der lehrreichste Befund betrifft die Fortpflanzung eines Fehlers.** Die Ersatzformulierung für die »runs once«-Familie überkorrigierte: Sie versprach eine Wiederausführung, die `Kernel.updateShadowObjects` nicht leistet — die Schnittmenge der Konstruktoren wird nicht angefasst. Die Quelle war `cheat-sheet.md:6`, geschrieben von Paket 12d; dieses Paket hat den Fehler als **Vorlage** benutzt und an fünf weitere Stellen getragen, statt ihn dort zu melden. Die Gegenstellen-Prüfung konnte ihn nicht fangen, weil die Gegenstelle der Fehler war. Alle sechs Stellen sind jetzt am Kernel belegt, samt der Grenze: erneut läuft nur ein Shadow Object, dessen Konstruktor die Menge verlassen hatte und wieder betritt.
- Nebenbefunde: **Der über die Creation-API registrierte `onDestroy`-Callback feuert nicht, wenn ein Shadow Object die Menge verlässt** — Paket 18. · `best-practices.md:311-371` hat einen echten Typfehler, der sich in der Kategorie »absichtlich unvollständig« versteckte. · `api-reference.md:1964-1972` übergibt `shadowObjects.define` eine nicht zuweisbare Funktion. · `guides.md:547` ist falsch gefenced. · Der Name `shadowObjects` trägt jetzt zwei Bedeutungen. Alle vier: Paket 16.
- Folgen: Der Rückverweis von der Referenz nach `guides.md` bleibt offen und ist bei Paket 17 notiert — die Wahl fürs Tabu war richtig, aber die Schuld wechselte damit nur den Besitzer.

- **Geteilt am 2026-08-17 (Planer 12c).** Der Testplan und der Backlog sind aus diesem Paket
  herausgelöst und laufen als **Paket 17** unmittelbar danach. Grund: Der Abgleich hat die zwei
  Hälften auseinandergezogen. In `TEST-PLAN.md` sind es nicht vier Stellen, sondern **sechzehn**
  (unten belegt), und im Backlog kommen zu den sechzehn neuen Zeilen fünf Streichungen und drei
  falsche Zahlen. Vor allem prüfen sich die zwei Hälften nicht gleich: Dieses Paket belegt sich,
  indem es Codeblöcke **ausführt**; Paket 17 belegt sich, indem es die Suite **zählt** und jede
  Zeile auf ihre Plan-Fundstelle zurückführt. In einem Paket würde das schwächere Instrument das
  stärkere verdecken. Nummern werden nie neu vergeben; die Reihenfolge ist 12c → 17 → 14 → 15 → 16.
  Paket 17 steht **vor** 14, damit die Übertragung sofort passiert und nicht am Ende des Laufs
  hängt; 15 und 16 streichen dann ihre eigene Backlog-Zeile, wenn sie sie einlösen.

- **Nachtrag 2026-08-17 (Reviewer 12b):** Der Rückverweis aus `guides.md` auf den neuen Abschnitt `#### Driving the Lookup by Hand` in `api-reference.md` wurde von 12b bewusst **weggelassen**, weil das Ziel erst hier entsteht — ein Link auf einen noch nicht geschriebenen Abschnitt wäre eine kaputte Zusage gewesen. Die Schuld existiert damit nur als Absicht und gehört in die Schrittliste dieses Pakets. Dazu offen aus 12b: `guides.md:305` führt die `auto-sync`-Werte weiterhin unvollständig, und `guides.md:336` sagt »on the parent entity«, wo 12b die Referenz berichtigt hat.

- Findings: — (dazu die **erzählende** Hälfte von »Die Upgrade-Garantie dokumentieren«; die
  Referenzhälfte hat Paket 12b geschrieben, sie steht in `api-reference.md:1579-1650`)
- Ziel: Jedes Beispiel, das ein Leser abtippen kann, läuft. Die Registrierungsreihenfolge — genauer:
  ihre Bedeutungslosigkeit — steht in `guides.md`.
- Bereich: `packages/shadow-objects/docs/getting-started.md`, `docs/guides.md`,
  `docs/best-practices.md`, `docs/concepts.md`, `docs/README.md`,
  `packages/shadow-objects/README.md`, `README.md` (Repo-Wurzel),
  `packages/shadow-objects/CHANGELOG.md` · dazu **einzeln benannte Zeilen** in
  `docs/api-reference.md` (`:253`, `:325`, `:333`, `:426`, `:528`, `:548`) und `docs/cheat-sheet.md`
  (`:55`), die zu einem Muster gehören, das dieses Paket im Ganzen räumt — alles andere in diesen
  zwei Dateien gehört 12b, 12d und 16
- Hängt ab von: Paket 12a, Paket 12b, Paket 12d
- Modell: **stärkste Stufe.** Nach oben korrigiert am 2026-08-17: Der Abgleich hat in der
  Einstiegsdoku zwei Laufzeitfehler gefunden, die keiner Suchmaske auffallen, sondern nur dem, der
  die Typen des Reaktivitätslayers gegen den Beispielcode hält (`count()` auf einem `Signal`,
  `useContext` als Wert). Dasselbe Instrument braucht das Paket an weiteren vierzig Codeblöcken.
- **Ein Fund reißt die Schwelle** und ist dem Nutzer am 2026-08-16 vorgelegt und von ihm
  entschieden: Schritt 1.

<details>
<summary>Detailplan Paket 12c</summary>

**Der Fund, wegen dem dieses Paket existiert.** Der Loader liest aus einem Registry-Modul
ausschließlich den **benannten** Export `shadowObjects`: `constants.ts:48`
(`export const ShadowObjectsExport = 'shadowObjects'`), gelesen an genau zwei Stellen —
`LocalShadowObjectEnv.ts:65` und `worker/MessageRouter.ts:70-79`. Fehlt er, meldet der Worker-Pfad
`module has no "shadowObjects" export` (`MessageRouter.ts:77`), und der lokale Pfad tut
**stillschweigend gar nichts**: `importScript()` prüft `if (module[ShadowObjectsExport])` und hat
keinen `else`-Zweig.

Die Dokumentation zeigt an **zehn** Stellen `export default { define: … }`. Am 2026-08-17 mit
`grep -rn "export default" README.md packages/shadow-objects/README.md packages/shadow-objects/docs/`
nachgezählt — die Zahl stimmt, zwei Zeilennummern haben sich verschoben:

| Datei | Zeile | Stand 2026-08-17 |
|---|---|---|
| `README.md` (Repo-Wurzel) | `:69` | bestätigt · dazu der erklärende Satz `:67` |
| `packages/shadow-objects/README.md` | `:49` | bestätigt · dazu der erklärende Satz `:47` |
| `docs/getting-started.md` | `:114` | bestätigt |
| `docs/guides.md` | `:143`, `:158` | bestätigt |
| `docs/best-practices.md` | `:207` | bestätigt |
| `docs/cheat-sheet.md` | `:55` | **verschoben** (Plan sagte `:51`) |
| `docs/api-reference.md` | `:426`, `:528`, `:548` | **verschoben** (Plan sagte `:416`, `:518`, `:538`) |

**Neu gegenüber dem Plan:** Der erklärende Satz »The module default export is the registry
(component manifest)« steht **zweimal**, nicht einmal — `packages/shadow-objects/README.md:47`
*und* `README.md:67`. Beide werden mitgezogen.

Jedes echte Modul im Repo macht es richtig: `packages/shadow-objects-e2e/public/mod-hello.js:14`,
`mod-auto-destruct.js:58`, `packages/shae-offscreen-canvas/src/shadow-objects.js:7` — alle
`export const shadowObjects = {…}`. Die Testsuiten sind deshalb grün, während jedes veröffentlichte
Beispiel nicht läuft. Das »erste funktionierende Beispiel« aus `getting-started.md` funktioniert
nicht.

**Die vier Instrumente, auf diesen Bereich angewendet.** In 12b und 12d haben sie sich bewährt;
hier heißen sie:

1. **Jeder Codeblock wird mechanisch extrahiert und wörtlich ausgeführt.** Nicht gelesen, nicht
   nachvollzogen, nicht in eine Prüfdatei übertragen. **Abgeschrieben zählt als ungeprüft** — das
   ist die Regel, die 12d gelernt hat, und sie gilt hier härter als dort, weil dieses Paket fast
   nur aus Beispielcode besteht. Ein Skript zieht die Fences aus der Datei, schreibt jeden Block
   unverändert in eine eigene Wegwerfdatei und ruft sie auf. Wer einen Block per Hand in eine
   Sonde tippt, hat den Block seiner Sonde geprüft, nicht den der Doku.
   Bestand am 2026-08-17, maschinell gezählt: `getting-started.md` 4 Blöcke (1 bash, 1 html,
   2 javascript), `guides.md` 32 (7 html, 12 javascript, 13 typescript), `best-practices.md` 15
   (1 html, 2 javascript, 12 typescript), `concepts.md` 12 (2 javascript, 6 typescript,
   4 ohne Sprachmarke), `packages/shadow-objects/README.md` 3, `README.md` 4. Ohne die HTML- und
   Shell-Blöcke bleiben **rund 50** ausführbare oder typprüfbare Blöcke.
2. **`tsc` erreicht bei einem Syntaxfehler die semantische Phase nicht.** Ein `rc=0` über eine
   Datei, in die mehrere Schnipsel hintereinander geklebt wurden, bedeutet **nichts**: der erste
   Parse-Fehler beendet die Prüfung, und alles danach ist ungeprüft. Jeder Block bekommt seine
   eigene Datei, und jede Datei bekommt ihren eigenen `tsc`-Aufruf mit eigenem Exit-Code. Die
   Prüfdateien laufen mit `verbatimModuleSyntax: true` (Wurzel-`tsconfig.json:7`), sonst fällt
   genau die Fehlerklasse durch, um die es in Schritt 3 und 4c geht.
3. **Signaturen gegen die emittierten `.d.ts` in beide Richtungen.** Was ein Beispiel importiert,
   muß in der `exports`-Map stehen *und* im genannten Entry als Wert exportiert sein. Beide
   Richtungen, weil `export type *` (`index.ts:9`, `shadow-objects.ts:6`) einen Namen sichtbar
   macht, den ein Wert-Import nicht bekommt.
4. **Zu jeder geänderten Aussage die Gegenstelle prüfen.** Dieselbe Behauptung steht in diesem
   Bereich regelmäßig in drei Dateien — die »runs once«-Aussage in fünf. Nach diesem Paket sagen
   `concepts.md`, `guides.md`, `cheat-sheet.md` und beide `README.md` dasselbe, oder das Paket ist
   nicht fertig.

**Jede Aussage wird am Code belegt, nicht am Plan.** In 12b wurden vier Planbehauptungen widerlegt,
in 12d zwei, und in diesem Zug 0 schon **fünf** (unten einzeln benannt). Zeilennummern in diesem
Detailplan sind Stand 2026-08-17 und ein Suchhinweis, kein Beweis. **Anhaltepflicht:** Findet der
Implementierer eine Planaussage am Code nicht wieder, wird sie nicht »sinngemäß« umgesetzt. Er hält
an, notiert Fundstelle und Messung in der Verlaufszeile und entscheidet neu — oder legt vor, wenn
die Korrektur über Dokumentieren hinausgeht.

- Dateien: `packages/shadow-objects/docs/getting-started.md`,
  `packages/shadow-objects/docs/guides.md`, `packages/shadow-objects/docs/best-practices.md`,
  `packages/shadow-objects/docs/concepts.md`, `packages/shadow-objects/docs/README.md`,
  `packages/shadow-objects/docs/cheat-sheet.md` (**eine** Zeile),
  `packages/shadow-objects/docs/api-reference.md` (**sechs** Zeilen),
  `packages/shadow-objects/README.md`, `README.md`, `packages/shadow-objects/CHANGELOG.md`
  — **zehn Dateien**, keine weitere.
- Vorgehen:

  1. **Alle zehn `export default {` in Registry-Beispielen zu `export const shadowObjects = {`.**
     Die zwei erklärenden Sätze (`packages/shadow-objects/README.md:47`, `README.md:67`) werden
     mitgezogen — das Modul exportiert die Registry unter dem Namen `shadowObjects`, und der Loader
     sucht genau diesen Namen. `cheat-sheet.md:55` und `api-reference.md:426/528/548` gehören formal
     zu 12b beziehungsweise 16; sie werden **hier** angefasst, weil es ein Fund und ein Muster ist
     und ein halb korrigiertes Muster schlimmer ist als ein durchgehend falsches. 12b hat diese
     Zeilen ausdrücklich liegengelassen, Paket 16 tut es ebenfalls.

  2. **`docs/getting-started.md`**, fünf Berichtigungen (Zeilen am 2026-08-17 nachgemessen):
     - `:37` — `import "@spearwolf/shadow-objects/elements";`. Dieser Subpfad existiert nicht; die
       `exports`-Map führt `"./elements.js"` (`package.json:28`). Der Import bricht mit
       `ERR_PACKAGE_PATH_NOT_EXPORTED`. `guides.md:287` und beide `README.md` schreiben es richtig.
     - `:54` — `<shae-prop name="count" value="0">` bekommt `type="number"`. Ohne `type` steht der
       String `'0'` im Signal, `:95` liest ihn mit `countProp() || 0` — `'0'` ist truthy —, und
       `:105` rechnet `count.set(count.value + data.value)`, also `'0' + 1` = `'01'`. Der Zähler des
       Einstiegsbeispiels zählt nicht, er hängt Ziffern aneinander. Mit `type="number"` läuft der
       Wert durch `Number(value)` (`elements/propValueConverters.ts:38`) und ist `0`. Zusätzlich
       `:95` von `||` auf `??`: mit `type="number"` ist `0` ein gültiger Startwert, und `||` würfe
       ihn weg.
     - `:53` Kommentar »Initial property value« — ein `<shae-prop>` ist keine
       Einmal-Initialisierung. Es schreibt bei jeder Änderung nach und räumt die Property ab, wenn
       die Bindung endet. Ein Halbsatz genügt, mit Verweis auf `api-reference.md` §`<shae-prop>` →
       `#### Finding the Host Entity`. **Korrigiert gegenüber dem Plan:** der Zielanker heißt nicht
       `#### Lifecycle` — den Abschnitt gibt es in der Fassung nach 12b nicht. Der Implementierer
       liest die vorhandenen `####`-Überschriften unter `## Web Components` und wählt daraus.
     - `:99` — `count.get()` bleibt, wie es ist. `createSignal` der Creation API ist signalizes
       `createSignal` (`types.ts:149`, `createSignal: typeof createSignal`) und liefert ein
       `Signal`-Objekt mit `.value`, `.get()` und `.set()`. Beide Lesarten im Beispiel sind gültig;
       hier ist **nichts** zu ändern. Steht als Zeile hier, damit niemand »vereinheitlicht«.
     - `:150` — `await env.syncWait()` benutzt eine Variable `env`, die es im Beispiel nicht gibt;
       das Setup ist deklarativ. `document.querySelector('shae-worker').shadowEnv` ist der Weg
       (`ShaeWorkerElement.ts:26`, `readonly shadowEnv = new ShadowEnv()`), oder der Satz wird zum
       Verweis auf `guides.md`.

  3. **`docs/guides.md`**, sechs Berichtigungen und ein neuer Abschnitt:
     - `:232` — `import { onViewEvent } from '@spearwolf/shadow-objects';`. Das Symbol liegt in
       `@spearwolf/shadow-objects/shadow-objects.js` (`in-the-dark/events.ts`, re-exportiert nur von
       `shadow-objects.ts:2`), nicht im Haupt-Entry: `index.ts` reicht `in-the-dark/` nicht weiter.
       Aus dem Haupt-Entry importiert ist es `undefined`, und die Klasse bekommt einen Computed Key
       `[undefined]`. `guides.md:196` macht es zwei Abschnitte weiter oben richtig.
     - `:12` — `import { ShadowObjectCreationAPI } from "@spearwolf/shadow-objects/shadow-objects.js";`
       als Wert-Import. Reiner Typ, und `shadow-objects.ts:6` gibt ihn über `export type *` heraus;
       mit `verbatimModuleSyntax` ist der Wert-Import ein Compile-Fehler. `import type`.
     - `:101-106` — »On the view side, you listen on the `<shae-ent>` element« ohne die Bedingung:
       ohne `forward-custom-events` ist der Filter `false`, der Patch-Effect kehrt früh zurück
       (`ShaeEntElement.ts:204-205`) und es wird **nie** ein DOM-Ereignis abgeschickt. Das Beispiel
       bleibt stumm. Ein Satz und das Attribut ins Markup. Dieselbe Lücke steht in
       `api-reference.md:325` und `:333` — auch das ist ein Muster und wird hier mitgenommen.
       **Zeilen korrigiert:** der Plan sagte `:318`/`:326`.
     - `:300-306` — die `<shae-worker>`-Tabelle hat kein `no-autostart` (`ATTR_NO_AUTOSTART`,
       `elements/constants.ts:18`). Dazu `:305`: die `auto-sync`-Werte sind unvollständig. Der Code
       nimmt `true|yes|on|frame|auto-sync` für den Frame-Loop, `<n>fps`, `<n>` als Millisekunden und
       `false|no|off` für aus (`ShaeWorkerElement.ts:256`, `:264`, `:272`, `:275`); die
       Vorgabe ist `frame` (`:22`). Die Tabelle in `api-reference.md` ist nach 12b die Gegenstelle
       und wird gelesen, nicht überschrieben.
     - `:336` — »Declaratively set properties on the **parent** entity«: der Host ist das
       nächstgelegene `<shae-ent>` im flattened Tree, namespace-unabhängig, gefunden über ein
       bubbelndes `composed` Ereignis und wiederholt (`requestEntAncestor.ts:36-45`,
       `ShaeEntElement.ts:582`, `ShaePropElement.ts:303-315`, `:354-363`). Ein `<shae-prop>` darf
       beliebig tief stehen. **Zeile korrigiert:** der Plan sagte `:334-347`.
     - `:347` — »Supported `type` values: … and more.« Paket 11 hat die vollständige Tabelle in
       `api-reference.md` und `cheat-sheet.md` gebaut; hier fehlen `no-trim` und die Regel für
       `value=""`. Der Absatz verweist auf die Tabelle statt eine dritte, wieder unvollständige
       Aufzählung zu führen.
     - `:9` — »It runs exactly once per entity instance as a setup phase.« Gehört zur »runs
       once«-Familie, siehe Schritt 4b.
     - **Neu, §3, hinter »Using Web Components«: `### Registering Your Own Entity Elements`.** Das
       ist die erzählende Hälfte des Optimierungspunkts; die Mechanik steht seit Paket 12b in
       `api-reference.md:1579-1650` (§`<shae-ent>` → `#### Driving the Lookup by Hand`), und dieser
       Abschnitt **verweist darauf, statt sie zu wiederholen**. Der Querverweis in beide Richtungen
       ist die Schuld, die 12b bewusst offen gelassen hat.
       Inhalt, drei kurze Absätze:
       1. **Was die Registrierungsreihenfolge nicht entscheidet.** Ein Element, das eine Entity
          wird, während es schon im Dokument steht, meldet sich bei allem an, was unter ihm hängt:
          `<shae-ent>`-Kinder suchen ihren Elternteil neu (`ShaeEntElement.ts:362` →
          `#askPeersToReRequestParent`, `:476-491`), `<shae-prop>`-Kinder ihren Host (`:363` →
          `#askPropertiesToReRequestHost`, `:496-498`). Die Reihenfolge, in der eine Anwendung ihre
          eigenen Tags registriert, entscheidet also **nicht** über die Form des Entity Tree. Das
          gilt für eine Unterklasse von `ShaeEntElement` genauso wie für einen Wrapper mit Shadow
          Root, der gar keine Entity ist.
       2. **Was ein Anwender wissen muß.** Das Timing ist **zweigeteilt**, nicht einheitlich:
          Entities haben neu gebunden, wenn `customElements.define()` zurückkommt — der Kanal ist
          ein synchrones eventize-Ereignis; Properties folgen **eine Mikrotask später**, weil
          `ShaePropElement.#onReRequestHost` (`:354-363`) über `queueMicrotask` entprellt.
          **Diese Zeile korrigiert den Plan:** Zug 0 hatte »zwischen dem Upgrade und der neuen
          Bindung liegt eine Mikrotask« für beide Kanäle behauptet. Das ist für Entities falsch, und
          `api-reference.md:1645-1650` sagt es nach 12b bereits richtig. Die zwei Dateien müssen
          danach dasselbe sagen, also wird der Satz von dort übernommen und nicht neu erfunden.
       3. **Die Registrierungsmodule.** Nur als Verweis, ohne die Liste zu wiederholen: 12b hat den
          Block »**Registration order does not matter.**« samt den drei Einzelimporten schon
          geschrieben (`api-reference.md:1630-1640`). Hier steht der Grund, dort die Aufzählung.
          **Diese Zeile korrigiert den Plan:** »Der Satz über eine Registrierungsreihenfolge, die
          man einhalten müsse, entfällt ersatzlos« — einen solchen Satz gibt es in `guides.md`
          **nicht**. Am 2026-08-17 über `grep -n "whenDefined\|registration order\|customElements.define"`
          gegen alle sieben Einstiegsdateien geprüft: null Treffer. Es ist nichts zu streichen, nur
          etwas zu schreiben. Die Behauptung stand in `TEST-PLAN.md` (UPG-3, UPG-8, §2.2) und
          gehört damit zu Paket 17.

  4. **`docs/best-practices.md`**, drei Berichtigungen:
     - `:213` — `'player': [PhysicsBodyLogic, HealthLogic, RenderLogic]` in `define`. `define` nimmt
       einen Konstruktor, kein Array (`types.ts:200-203`, `Registry.ts:43`); `importModule` prüft
       nichts (`in-the-dark/importModule.ts:23-27`), das Array landet unverändert in der Registry
       und wirft beim Instanziieren `TypeError: construct is not a constructor` — **`Kernel.ts:463`**
       (`new construct({…})`). **Zeile korrigiert:** der Plan sagte `Kernel.ts:806-808`; dort steht
       `createShadowObjects`, nicht der `new`-Aufruf. Der Mehrfachfall läuft über `routes`, genau wie
       `guides.md:150-174` es zeigt. Das Beispiel wird auf `routes` umgeschrieben.
     - `:62` — der Typ `ContextReaders` existiert nirgends im Repo; am 2026-08-17 über den ganzen
       Baum bestätigt, einziger Treffer ist diese Zeile selbst. Ersetzen durch die
       `useContext`-Signatur aus `types.ts:124-127`.
     - `:53` und `:257-259` — `const world = useContext('physicsWorld')` mit dem Kommentar »world is
       the same instance«: `useContext` gibt einen `SignalReader` zurück (`types.ts:124-127`), man
       braucht `world()`. Die eigene »Do this instead«-Variante bei `:71` nennt die Variable
       folgerichtig `getScene` und liest sie bei `:87` mit `getScene()` — die zwei Stellen
       widersprechen sich innerhalb einer Datei. **Zeilen korrigiert:** der Plan sagte `:52` und
       `:257-260`.

  4b. **Die »runs once«-Familie — fünf Dateien, acht Stellen.** Der Plan kannte fünf Stellen in zwei
     Dateien; es sind acht in fünf Dateien. Der Sachverhalt: ein Token-Wechsel
     (`Kernel.ts:360-369`) und eine Property-Änderung, die eine `'@prop'`-Route umschaltet
     (`:355-358`, truthy-Liste `Entity.ts:331-346`, Auflösung `Registry.ts:98-123`), zerstören die
     betroffenen Shadow Objects einer Entity und legen sie neu an (`:378-416`, `[onDestroy]` über
     `:399` → `:833-838`). Der Code sagt es selbst in `in-the-dark/events.ts`. Paket 12d hat
     `cheat-sheet.md:6` schon berichtigt und liefert die Formulierung, an der sich alle anderen
     ausrichten: »The setup function runs once per shadow object, and an entity can carry several.
     It runs again whenever the set of shadow objects on that entity changes.«
     - `concepts.md:201` — »Each Shadow Object function runs once.«
     - `concepts.md:203` — »It does not re-run its main function.« Dazu `:205`, das den Abbau allein
       an das Abmelden der View-Komponente knüpft.
     - `concepts.md:209` — »The body of your Shadow Object function runs once during mount.«
     - `concepts.md:285` — »All Shadow Objects attached to the same Entity share the same properties
       and lifecycle«: die Properties teilen sie, den Lebenszyklus nicht. Fällt ein Konstruktor
       durch einen Routenwechsel weg, geht nur dieses eine Shadow Object (`Kernel.ts:394-403`).
     - `guides.md:9` — »It runs exactly once per entity instance as a setup phase.«
     - **Neu:** `packages/shadow-objects/README.md:34` — »its body runs once, then it just reacts.«
     - **Neu:** `README.md:54` — dieselbe Zeile im Wurzel-README.
     - **Neu:** `README.md:181` — »The body runs exactly once at `mount` and builds the reactive
       graph. After that nothing runs top to bottom any more, it only reacts.« Die stärkste der acht
       Behauptungen und die einzige in einem Erklärabschnitt statt in einem Kommentar.
     Die zwei Kommentarzeilen in den READMEs dürfen kurz bleiben; entscheidend ist, daß keine der
     acht Stellen mehr »once« ohne die Bedingung sagt.

  4c. **`docs/api-reference.md:253`** —
     `import { ShadowObjectCreationAPI, onViewEvent as viewEvent } from "@spearwolf/shadow-objects";`
     ist zweifach kaputt: `onViewEvent` liegt in `@spearwolf/shadow-objects/shadow-objects.js`
     (`in-the-dark/events.ts`, re-exportiert nur von `shadow-objects.ts:2`) und ist aus dem
     Haupt-Entry `undefined`; und `ShadowObjectCreationAPI` kommt über `export type *`
     (`index.ts:9`), ein Wert-Import darauf ist mit `verbatimModuleSyntax` ein Compile-Fehler. Genau
     das Muster aus Schritt 3, deshalb hier und nicht bei 12d oder 16. **Zeile korrigiert:** der
     Plan sagte `:246`. Paket 16 läßt die Zeile ausdrücklich liegen.

  4d. **Beide `README.md` — der Zähler wirft, wo er zählen soll.** Neu gefunden am 2026-08-17 vom
     Planer 12c, am Code belegt: `README.md:61` und `:64` rufen `count()` auf, wo `count` aus
     `createSignal(0)` kommt. `createSignal` liefert ein `Signal`-**Objekt** (signalize 1.0.0-beta.0,
     `lib/Signal.d.ts`: `declare class Signal<ValueType>` mit `get get()`, `get set()`,
     `get value()`), und eine Klasseninstanz ist nicht aufrufbar. Der erste Klick wirft
     `TypeError: count is not a function`. `packages/shadow-objects/README.md:38-39` zeigt dasselbe
     Beispiel mit `count.value` und ist korrekt.
     Der Beleg, daß das kein Übersehen des Audits ist, sondern ein halb ausgeführter Fix: Commit
     `85af7db` hat `count()` in **beide** READMEs geschrieben, `e7e2e08` hat es nur im Paket-README
     auf `count.value` korrigiert. Der Eintrag `packages/shadow-objects/CHANGELOG.md:119`
     (»**Docs (correctness):** `createSignal()` read/update examples across README + 4 docs«) sagt
     also mehr, als getan wurde. Vorbestehend, aus dem vorigen Lauf (`./remediation-plan.md`), kein
     Finding dieses Audits. Behebung hier, weil es dieselbe Datei und derselbe Codeblock ist wie
     Schritt 1.
     **Verify für diese Stelle:** Der Block wird ausgeführt, nicht gelesen — er ist einer der zwei
     Blöcke aus Verify 3.

  5. **`docs/README.md:5`** — der Anker `#what-it-is` im Root-`README.md` existiert nicht. Am
     2026-08-17 maschinell geprüft: Es ist der **einzige** kaputte Link oder Anker in allen sieben
     Einstiegsdateien; alle übrigen Datei- und Ankerziele lösen auf. Der Link zeigt auf eine
     vorhandene Überschrift — `## The Five Domains` (`#the-five-domains`) trägt inhaltlich, was der
     Linktext verspricht. Und `docs/README.md:24` — »Complete API reference for every class, method,
     and web component« — bleibt: sie stimmt nach 12b und 12d für den Elementteil und den
     Klassenteil, und Paket 16 holt den Rest. Die Zeile wird nicht abgeschwächt.

  6. **`packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`**, drei Stichpunkte:
     - `- **Docs (correctness):** …` für die Registry-Beispiele — jedes Modulbeispiel exportiert die
       Registry unter dem Namen, den der Loader liest.
     - `- **Docs (correctness):** …` für die übrigen Beispielfehler: der `elements`-Subpfad, die
       `onViewEvent`-Quelle, `define` mit einem Array, `useContext` als Wert, der Zähler ohne `type`,
       und der `count()`-Aufruf im Wurzel-README.
     - `- **Docs (guides):** …` für den neuen Abschnitt zur Registrierungsreihenfolge und für die
       Berichtigung der »runs once«-Aussage an acht Stellen.
     Der Eintrag `:119` wird **nicht** rückwirkend umgeschrieben — er beschreibt einen abgeschlossenen
     Lauf. Die Lücke, die er offen gelassen hat, steht jetzt als eigener Stichpunkt daneben, und das
     ist die ehrlichere Form.

**Ausdrücklich nicht angefasst.** Wer hier etwas ändert, macht das Paket rot:

- **Kein Code.** Keine Datei unter `packages/*/src/`, kein Test, kein `package.json`, kein
  `tsconfig`. Dieses Paket ändert `dist/` nicht — die Zahl **198** ist Teil der Verify-Stufe.
  Findet der Implementierer einen Code-Defekt, wird er notiert und vorgelegt, nicht behoben.
- **`docs/api-reference.md` außer den sechs Zeilen** `:253`, `:325`, `:333`, `:426`, `:528`, `:548`.
  Der Elementteil und der Klassenteil gehören 12b und 12d — beide geschlossen, beide gegen den Code
  geprüft. Die fünf ungelesenen Abschnitte gehören Paket 16. Insbesondere bleibt
  `#### Driving the Lookup by Hand` (`:1579-1650`) **unangetastet**: 12c verlinkt ihn und
  **übernimmt seine Formulierung**, es schreibt ihn nicht um.
- **`docs/cheat-sheet.md` außer `:55`.** Alles andere haben 12b und 12d gestellt, `:6` eingeschlossen
  — die Formulierung dort ist die Vorlage für Schritt 4b, kein Bearbeitungsziel.
- **`packages/shadow-objects-e2e/TEST-PLAN.md` und `Backlog.md`** gehören Paket 17. Kein Zeichen.
- **`CHANGELOG.md` im Wurzelverzeichnis** gehört Paket 17. Kein Zeichen.
- **Die Verhaltenszusagen von 11, 12b, 12d und 13.** Die `<shae-prop>`-Typtabelle (11), die
  Attributtabellen (12b, 13), die Klassenreferenz (12d): gelesen und zitiert, nicht neu formuliert.
  Widersprechen sie diesem Paket, gilt der Code, und der Widerspruch geht in die Verlaufszeile.
- **Der Gloss »(Component Tag)«** hinter »Token« an neun Stellen. Die `Konventionen` binden
  »Token (nicht Component Tag)«, aber 11, 12b und 12d haben den Gloss an den Zeilen, die sie
  angefasst haben, stehengelassen (`cheat-sheet.md:238`, `api-reference.md:1453`). Ihn nur in der
  Einstiegsdoku zu entfernen erzeugt genau den halben Zustand, den Schritt 1 vermeidet. Bleibt, geht
  als Zeile in den Backlog über Paket 17.
- **`packages/shadow-objects/CHANGELOG.md:66`** (die falsch zugeschriebene
  `Object.prototype`-Falle) gehört Paket 17. Kein Zeichen.

- Verify:
  1. `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test` — Nullprobe
     unverändert gegenüber Paket 13 und 12d: `test:ci` **637**, e2e **402**,
     `find packages/shadow-objects/dist -type f | wc -l` = **198**.
  2. `grep -rn "export default" README.md packages/shadow-objects/README.md packages/shadow-objects/docs/`
     liefert **null Treffer** in einem Registry-Beispiel.
  3. **Zwei Beispiele werden wirklich ausgeführt**, nicht gelesen. Beide werden **mechanisch
     extrahiert** — ein Skript zieht den Fence aus der Datei und schreibt ihn unverändert in eine
     Wegwerfdatei; wer abschreibt, prüft seine Abschrift. Es sind:
     - **(a) `README.md` (Repo-Wurzel), der `javascript`-Block der »Quick Look«** (`:52-77`). Der
       trägt beide Fehler auf einmal: den fehlenden benannten Export **und** den `count()`-Aufruf.
       Geladen über `LocalShadowObjectEnv.importScript()`, eine Entity mit dem Token
       `'my-component'` angelegt, ein `increment`-View-Event geschickt, danach geprüft: Das Shadow
       Object existiert (`kernel.findShadowObjects(uuid).length === 1`) und der
       `count-changed`-Rückweg trägt `1`.
     - **(b) `docs/getting-started.md`, der `javascript`-Block von `my-logic.js`** (`:84-119`).
       Dazu das Markup aus `:29-72` als Entity mit `count`-Property, `type="number"`, `value="0"`;
       nach einem `increment` mit `{value: 1}` muß die Property `1` sein, nicht `'01'`.
     **Beide Blöcke laufen gegen die heutige Fassung rot** — (a) mit
     `TypeError: count is not a function` oder gar keinem Shadow Object, (b) mit gar keinem Shadow
     Object. Das rote Vorher wird in der Verlaufszeile wörtlich zitiert; es ist der Beleg, daß der
     Fund echt ist. Die Sonde läuft in `packages/shadow-objects-testing` (echtes Chromium, wo
     `importScript()` mit einem echten Modul-Import arbeitet), wird danach entfernt, und
     `git status --porcelain` zeigt am Ende nur die zwei bekannten untracked Dateien. Wer rote
     Fälle laufen läßt, leert danach `packages/shadow-objects-testing/test/__screenshots__/` — es
     liegen dort am 2026-08-17 bereits neun Altaufnahmen.
  4. **Jeder übrige Codeblock** aus den sechs Dateien wird extrahiert und einzeln geprüft: `.ts`/
     `.js`-Blöcke je in eigener Datei, je ein `tsc --noEmit`-Aufruf mit `verbatimModuleSyntax`, je
     ein eigener Exit-Code. Ein Sammellauf zählt nicht (Instrument 2). Blöcke, die absichtlich
     unvollständig sind — ein Fragment ohne Import, ein »Avoid this«-Gegenbeispiel — werden als
     solche in der Verlaufszeile benannt, mit dem Grund. Ein unmarkierter durchgefallener Block ist
     ein roter Verify.
  5. Der Zähler aus `getting-started.md` wird zusätzlich von Hand nachgerechnet: mit `type="number"`
     und `??` ergibt der erste Klick `1`, nicht `'01'`.
  6. **Die vier Gegenstellen-Paare** werden nebeneinander gelesen und müssen dasselbe sagen:
     (a) die acht »runs once«-Stellen gegen `cheat-sheet.md:6`; (b) der neue `guides.md`-Abschnitt
     gegen `api-reference.md:1630-1650`, in beide Richtungen verlinkt; (c) die `auto-sync`-Werte in
     `guides.md:305` gegen die Tabelle in `api-reference.md`; (d) der `<shae-prop>`-Hostsatz in
     `guides.md:336` gegen `#### Finding the Host Entity`.
  7. `git diff --stat` zeigt **genau die zehn Dateien** aus der Liste und keine andere. Kein
     `TEST-PLAN.md`, kein `Backlog.md`, keine Wurzel-`CHANGELOG.md`, keine Datei unter `src/`.

- Commit: `docs: make every example in the entry documentation runnable`
- Verlauf:
  - Zug 0 (2026-08-16, Planer 12): Der Registry-Export-Fund maschinell erhoben — zehn
    `export default` in der Doku gegen `ShadowObjectsExport = 'shadowObjects'` (`constants.ts:48`),
    gelesen an genau zwei Stellen (`LocalShadowObjectEnv.ts:65`, `MessageRouter.ts:70`), und drei
    echte Module im Repo, die es richtig machen. Der Zähler aus `getting-started.md` an den drei
    Zeilen `:54`, `:95`, `:105` bestätigt. `TEST-PLAN.md` §1 gegen die Suite gezählt: zehn Dateien,
    202 Fälle je Browser gegen die behaupteten vier und 43. `Backlog.md` gegen die Triage dieses
    Laufs gehalten: von elf »Ziel Backlog«-Punkten steht einer drin.
  - Zug 0 (2026-08-17, Planer 12c): Der Detailplan gegen den Stand nach 11, 12a, 12b, 12d und 13
    abgeglichen. Die zehn `export default` bestätigt, zwei Zeilennummern verschoben
    (`cheat-sheet.md:51`→`:55`, `api-reference.md:416/518/538`→`:426/528/548`); der erklärende Satz
    steht zweimal, nicht einmal. **Fünf Planbehauptungen widerlegt:** (1) die Mikrotask liegt nur im
    Property-Kanal, Entities binden neu, bevor `customElements.define()` zurückkommt — 12b sagt es
    in `api-reference.md:1645-1650` bereits richtig; (2) der zu streichende Satz über eine
    einzuhaltende Registrierungsreihenfolge existiert in `guides.md` nicht, er stand in
    `TEST-PLAN.md`; (3) der `TypeError` aus dem Array-`define` fällt bei `Kernel.ts:463`, nicht
    `:806-808`; (4) der Zielanker `#### Lifecycle` in `api-reference.md` existiert nach 12b nicht;
    (5) `getting-started.md:99` `count.get()` ist korrekt und war als Fehler geführt.
    **Vier neue Befunde:** `README.md:61,64` rufen `count()` auf einem `Signal`-Objekt auf und
    werfen `TypeError` — Gegenstelle im Paket-README ist korrigiert, das Wurzel-README ist beim Fix
    `e7e2e08` liegengeblieben, und `CHANGELOG.md:119` behauptet den vollständigen Fix; die »runs
    once«-Familie hat acht Stellen in fünf Dateien, nicht fünf in zwei; der erklärende
    Registry-Satz steht doppelt; `TEST-PLAN.md` hat sechzehn veraltete Stellen, nicht vier.
    Links und Anker aller sieben Einstiegsdateien maschinell geprüft: genau einer kaputt
    (`docs/README.md:5`). Codeblöcke gezählt: rund 50 prüfbare. Nullprobe selbst nachgemessen:
    `dist/` **198**, Arbeitsbaum sauber. Paket geteilt — Testplan und Backlog laufen als **Paket
    17**; Modellstufe von mittel auf stärkste angehoben; Tabu ausgeschrieben. Keine Rückfrage.

</details>

### [x] 17. Testplan und Backlog auf den Stand dieses Laufs bringen

- Hash: `e778621`
- Ergebnis: 2 Runden · Testplan, Backlog und beide Changelogs stehen auf dem Stand des Laufs · Nullprobe gehalten: test:ci 637, e2e 402, `dist/` 198, kein Code angefasst
- **19 Befunde in den Backlog übertragen**, jeder mit Code-Fundstelle; 4 gestrichen, weil dieser Lauf sie eingelöst hat, und 7 berichtigt. Listenpunkte 201 → 220. Der Reviewer hat seine **eigene** Liste aufgestellt — 21 Positionen — und alle 21 wiedergefunden; dreißig Fundstellen stichprobenartig geprüft, alle tragen. Keine der vier Streichungen löscht Wissen.
- 22 Stellen im `TEST-PLAN.md` statt der geplanten 16. Jede Zahl frisch aus `playwright test --list` gezogen und vom Reviewer unabhängig nachgezählt: 402 gesamt, 201 je Projekt, zehn Specs, zehn Seiten, jede Zeile der Kopftabelle stimmt.
- Sieben Planabweichungen, fünf davon vom Reviewer nachgezählt und bestätigt. Die wichtigste: Der Katalog des Plans hatte **neunzehn** Punkte statt der behaupteten achtzehn, und ihm fehlte gerade der Befund, den fünf andere Planzeilen in den Backlog verwiesen — der geteilte `ComponentContext` in `ComponentContext.test.js`. Er ist übertragen.
- **Eine Sollbruchstelle, vom Reviewer aufgedeckt und behoben:** Mein Auftrag hatte `packages/shadow-objects/CHANGELOG.md` tabu gestellt, wodurch aus einer belegten Zweizeilen-Korrektur eine Backlog-Zeile geworden wäre — eine stille Umwidmung, die Arbeit verschiebt statt sie zu erledigen. Das Tabu wurde für die Zeile aufgehoben, die Zuschreibung der `Object.prototype`-Falle ist berichtigt, und der Backlog-Punkt ist wieder entfernt. Ein behobener Befund, der weiter als offen geführt wird, kostet den Nächsten eine Stunde.
- Eine echte Lücke in der Wurzel-`CHANGELOG.md` nachgetragen: `b686205` hatte fünf Integrationsfälle ergänzt, ohne dort einen Stichpunkt zu schreiben.
- Nebenbefunde: `AGENTS.md:18` führt den verbotenen Gloss »(Component Tag)« 65 Zeilen über der Tabelle, die ihn verbietet — die Entscheidung darüber ist also nicht nur eine Doku-Sammelaktion. · Der dokumentierte `#deferDestroy`-Reconnect hat auf keiner Ebene einen Test; `worker-element-attributes.test.js:402-404` sagt das selbst. · Beim Sondieren wurde der SSR-Crash aus Paket 14 zufällig unter reinem Node reproduziert.
- Folgen: Paket 15 streicht seine Backlog-Zeile in §3.2, Paket 16 streicht §7.3 Punkt 20 und §7.4 Punkt 23 und numeriert §7 danach durch.

- **Nachtrag 2026-08-17 (Reviewer 12c):** Der Rückverweis von `api-reference.md` nach `guides.md#registering-your-own-entity-elements` bleibt offen. Er hätte `#### Driving the Lookup by Hand` anfassen müssen, was 12c ausdrücklich unangetastet lassen sollte — die Wahl fürs Tabu war richtig, aber die Schuld hat damit nur den Besitzer gewechselt und wird hier notiert, nicht abgehakt. Dazu zwei Funde für Paket 16: `best-practices.md:311-371` hat einen echten Typfehler (`const destroyCallbacks = []` inferiert `never[]`, zweimal `TS2349`), der sich in der Kategorie »absichtlich unvollständig« versteckte; und `api-reference.md:1964-1972` übergibt `shadowObjects.define` eine Funktion, die nicht auf `ShadowObjectConstructor` passt (`TS2345`). Ferner: `guides.md:547` ist als `javascript` gefenced, enthält aber JSX (`TS17004`), und der Name `shadowObjects` trägt jetzt zwei Bedeutungen — den benannten Modulexport, den der Loader liest, und das Helferobjekt aus `in-the-dark/ShadowObject.ts`; §Advanced benutzt an sechs Stellen das Zweite ohne ein Wort dazu.

- Findings: — (Buchhaltung des Laufs; am 2026-08-17 vom Planer 12c aus Paket 12c herausgelöst)
- Ziel: `TEST-PLAN.md` beschreibt die Suite, die dasteht. `Backlog.md` kennt jeden Befund, den
  dieser Lauf gefunden und nicht behoben hat — mit Fundstelle, und ohne die Zeilen, die er erledigt
  hat.
- Bereich: `packages/shadow-objects-e2e/TEST-PLAN.md`, `Backlog.md`, `CHANGELOG.md`
  (Repo-Wurzel), `packages/shadow-objects/CHANGELOG.md` (**eine** Zeile: `:66`)
- Hängt ab von: Paket 12c
- Reihenfolge: unmittelbar nach 12c und **vor** 14. Grund: Die Übertragung ist der Punkt, an dem
  dieser Lauf sein Gedächtnis abgibt. Sie wartet nicht auf das Ende. Die drei Pakete danach lösen je
  eine der übertragenen Zeilen ein und **streichen sie selbst** — 15 die zwei
  `RemoteWorkerEnv`-Defekte, 16 den `ComponentMemory`-Re-Export und die fünf ungelesenen
  `api-reference.md`-Abschnitte. Das ist derselbe Weg, den 9b mit `VIEW-5` gegangen ist.
- Modell: mittlere Stufe
- **Warum das kein Nebenschritt ist.** Am 2026-08-16 hat der Planer 12 gezählt: von elf mit »Ziel
  Backlog« triagierten Punkten stand **einer** in `Backlog.md`. Am 2026-08-17 nachgezählt: es sind
  **sechzehn** Punkte, und es steht weiter genau einer drin (`VIEW-6b`, `:204`). Bleibt es dabei,
  endet der Lauf mit einer Liste, die Befunde kennt und vergißt, und das nächste Audit findet sie
  ohne Vorgeschichte wieder.

<details>
<summary>Detailplan Paket 17</summary>

**Die vier Instrumente, auf diesen Bereich angewendet.** Hier gibt es keine Codeblöcke, also tritt
an die Stelle der Ausführung das Zählen und das Zurückverfolgen:

1. **Jede Zahl wird frisch gezogen, nicht abgeschrieben.** **Abgeschrieben zählt als ungeprüft** —
   auch die Zahlen in diesem Detailplan. Fallzahlen kommen aus
   `pnpm -F shadow-objects-e2e exec playwright test --list`, Dateizahlen aus einem `ls` beziehungsweise
   `find`. Die Zahlen unten sind ein Suchhinweis und der Beleg, daß die Doku falsch liegt — sie sind
   nicht die Quelle für das, was hineingeschrieben wird.
2. **Jede Backlog-Zeile wird an ihrer Fundstelle geprüft, bevor sie geschrieben wird.** Manche
   Befunde dieses Laufs sind unterwegs behoben worden, manche haben sich verschoben. Was nicht mehr
   existiert, wird **nicht übertragen**, sondern mit Begründung gestrichen — in der Verlaufszeile,
   damit die Entscheidung nachvollziehbar bleibt.
3. **Jede Aussage wird am Code belegt, nicht am Plan.** Der Zug 0 dieses Pakets hat drei Zeilen der
   `Backlog.md` schon als erledigt oder gegenstandslos gemessen, obwohl kein Paket sie angefasst hat
   (unten benannt). Rechne mit mehr. **Anhaltepflicht** wie in 12c: Findet der Implementierer eine
   Planaussage nicht wieder, hält er an und entscheidet neu.
4. **Zu jeder Änderung die Gegenstelle prüfen.** `Backlog.md` widerspricht sich an zwei Stellen
   selbst (unten), und `TEST-PLAN.md` trägt dieselbe veraltete Behauptung in §2.2, UPG-3, UPG-8 und
   §4. Wer eine davon berichtigt und die anderen stehenläßt, macht es schlimmer.

- Dateien: `packages/shadow-objects-e2e/TEST-PLAN.md`, `Backlog.md`, `CHANGELOG.md`
  (Repo-Wurzel), `packages/shadow-objects/CHANGELOG.md` — **vier Dateien**, keine weitere.
- Vorgehen:

  1. **`packages/shadow-objects-e2e/TEST-PLAN.md` — sechzehn Stellen, nicht vier.** Am 2026-08-17
     mit einem echten `playwright test --list` gegen die Suite gehalten. Die vier Stellen aus dem
     alten 12c-Plan sind darunter; die übrigen zwölf standen auf keiner Liste.
     - **`:7`** — »the suite went from 44 to **298** tests across Chromium and Firefox«. Ist **402**
       (201 je Projekt).
     - **`:12`** — die Aufzählung noch offener P2/P3-Punkte nennt »UPG-6 … UPG-8«, während UPG-7
       (`:241`) und UPG-9 (`:243`) im selben Dokument als *Implemented* markiert sind. Die Aufzählung
       wird gegen die Tabelle gezogen.
     - **§1, `:24`** — »Four spec files, 43 registered test cases«. Sind **zehn** Spec-Dateien und
       **201** Fälle je Browser.
     - **Die Tabelle `:28-33`** hat vier Zeilen und in jeder eine falsche Fallzahl: `bundle` 4 statt
       **13**, `remote-worker-env` 5 statt **7**, `shae-worker` 28 statt **30**, `auto-destruct` 6
       statt **8**. Sie bekommt zehn Zeilen. Frisch gezogen am 2026-08-17: `dynamic-dom` 38,
       `multi-env` 34, `shae-worker` 30, `upgrade-timing` 28, `async-events` 23, `bundle` 13,
       `worker-failure` 13, `auto-destruct` 8, `create-element` 7, `remote-worker-env` 7 = **201**.
       `worker-failure` mit seinen 13 Fällen kommt in der heutigen Fassung überhaupt nicht vor.
     - **§1.2, `:53-58`** (»Two tests that never run«) — beide IDs stehen in
       `tests/shae-worker.spec.ts:9` und `:13`. Der Abschnitt entfällt. Dabei mitziehen: `lookupTests`
       existiert nicht mehr, die Specs rufen `runPageTests` (`tests/runPageTests.ts`,
       `shae-worker.spec.ts:5`).
     - **`:64`** — »Three copies drift« und **`:283`** — »the two orphaned«: beide beziehen sich auf
       `tests/lookupTests.ts`, das es nicht mehr gibt.
     - **§1.3, H-4 bei `:67`** — `testAsyncAction` lehnt mit einem echten `Error` ab, der Testnamen
       und Frist trägt (`src/test-helpers/testAsyncAction.js:5`), nicht mit einem nackten `reject`.
       Die Zeile entfällt. **Zeile korrigiert:** der alte Plan sagte `:69`; dort steht H-6.
     - **`:280`, H-FIX-4** — verlangt genau die Änderung, die schon dasteht. Entfällt mit `:67`.
     - Der **echte** offene Punkt an derselben Stelle bleibt und geht in den Backlog: `waitUntil`
       und `testAsyncAction` teilen sich 5000 ms, die äußere Frist läuft zuerst ab und verdeckt die
       Bedingung.
     - **§2.2, `:99`** — behauptet, das Upgrade-Timing sei »not covered«, während
       `pages/upgrade-timing.html` und `tests/upgrade-timing.spec.ts` mit **28** Fällen je Browser
       existieren. Auch die »Uncovered«-Liste bei **`:117-119`** ist überwiegend abgedeckt, `:119`
       (»`<shae-prop>` upgrading before its `<shae-ent>` host«) ganz.
     - **§2.2, `:105-107`** — beschreibt die Hostsuche von `<shae-prop>` als `parentElement`-Lauf
       über `isShaeEntElement`. In `ShaePropElement.ts` kommt `parentElement` **null** mal vor; die
       Suche ist ein bubbelndes Vorfahren-Ereignis (`:305`, `requestEntAncestor`), mit Nachjustierung
       über `shaeReRequestEntHost` (`:354`, `:372`). Die Klasse widerspricht dem Absatz in ihrem
       eigenen Kommentar (`ShaePropElement.ts:67-73`).
     - **§2.2, Codeblock `:109-111`** — zitiert die `whenDefined`-Zeile wörtlich, die Paket 12a in
       `58d1ad4` entfernt hat. Verschwindet mit der Zeile, die er beschreibt.
     - **§2.2, `:113-115`** — nennt die Kopplung »a real invariant of the public API« und den
       Einzelimport von `shae-prop.js` einen Fehlerfall. Beides ist heute umgekehrt: der Einzelimport
       funktioniert, und ein Wächter hält es fest
       (`packages/shadow-objects-testing/test/prop-element-registration-order.test.js`).
       Der Absatz wird auf den neuen `guides.md`-Abschnitt aus Paket 12c umgelenkt.
     - **UPG-3, `:237`** — »`shae-prop` is not defined until `shae-ent` is … This asserts the
       guarantee in `src/shae-prop.ts`«. Die Garantie gibt es nicht mehr; sie war eine
       Nutzerentscheidung vom 2026-08-16 und ist in `58d1ad4` gefallen.
     - **UPG-8, `:242`** — stellt die Frage, die 12a beantwortet hat: Der Einzelimport ist
       unterstützt.
     - **§4, `:294-295`** — »UPG-3 pins an invariant the code deliberately maintains but never
       checks«. Der Code hält sie nicht mehr aufrecht, und geprüft ist stattdessen das Gegenteil.
     Die vier Stellen des alten Plans sind `:24`, `:53-58`, `:67` und `:99-115`; alles übrige ist am
     2026-08-17 dazugekommen.

  2. **`Backlog.md` — sechzehn Zeilen eintragen.** Jede mit einem Satz und der Fundstelle, jede
     zuerst an dieser Fundstelle geprüft. Die Datei ist auf `v0.30.2` datiert (`:4`) und führt ihre
     Befunde mit IDs (`VIEW-*`, `KERN-*`, `ELEM-*`, `LOW-*`); neue Zeilen folgen dieser Machart und
     bekommen keine Finding-ID dieses Audits (`Konventionen`).
     - Ein verschobener `<slot>` benachrichtigt die Entity nicht, die er verläßt (Plan
       »Vorbestehende Fehler«, Reviewer 9b). §3.3.
     - `utils/props-utils.ts:19-27` schreibt bereits ausgelieferte Change Trails per Referenz fort
       (Plan »Vorbestehende Fehler«, Reviewer 8). §3.2 oder §3.3.
     - `forwardCustomEvents$.set(true)` normalisiert ein vorhandenes Filter-Attribut nicht
       (Plan »Vorbestehende Fehler«, Implementierer 12b). §3.3.
     - Nach `forwardCustomEvents$.set(true)` und einem Ab- und Wiedereinhängen bleibt der unter
       `true` installierte Patch aktiv, während das Signal auf `false` oder `Set('a')` steht
       (Plan »Vorbestehende Fehler«, Reviewer 13). §3.2 — das ist ein echter Zustandsfehler, kein
       Schönheitsfehler.
     - `ComponentContext.clear()` und `.destroyComponent()` lassen lebende `ViewComponent`s mit
       `isDestroyed === false` zurück, taub für jede Mutation (Plan »Vorbestehende Fehler«, Planer
       12d; `ComponentContext.ts:539-541` zeigt, wie `dispose()` es richtig macht). §3.2. Ob
       `clear()` seine Components ablösen soll, ist eine Verhaltensänderung an der öffentlichen API
       — deshalb Backlog und nicht dieser Lauf.
     - `ComponentContext.dispatchReRequestParentRoots()` kennt keinen Absender und kann nicht
       filtern; ein `ns`-Wechsel kostet N+1 Nachrichten bei N Wurzeln (Plan »Vorbestehende Fehler«,
       Reviewer 7 → Planer 9). §3.5. Mit dem Hinweis, daß ein Absender allein nicht reicht: der
       Filter bräuchte denselben `isBelow`-Aufstieg, den Paket 6 an geschlossenen Grenzen fallen
       läßt. Beides gehört in einen Zug.
     - Der `isBelow`-Aufstieg bleibt n²/2 mit sehr kleiner Konstante — gemessen 1200 kinderlose
       Geschwister: 251 ms gegen 57 ms (Plan, Nebenbefund Paket 6). §3.5.
     - `ShadowEnv.ns$` (`ShadowEnv.ts:46`) ist die einzige Fundstelle im ganzen Repo: nie
       geschrieben, nie gelesen, auch nach `ready()` `undefined`. Verdrahten oder entfernen — beides
       eine API-Entscheidung. §3.6. Am 2026-08-17 bestätigt; `api-reference.md:1055` nennt es nach
       12d schon als »a signal slot the environment itself never writes«, die Doku ist also ehrlich
       und der Code bleibt schuldig.
     - `ViewComponentError` ist nicht exportiert (`ViewComponent.ts:6`), wird aber als Fangobjekt
       dokumentiert; ein `instanceof` ist für Konsumenten unmöglich (Plan »Vorbestehende Fehler«,
       Planer 12). §3.6. 12d dokumentiert den Ausweg (`error.name`); die Klasse zu exportieren ist
       eine API-Änderung.
     - `RemoteWorkerEnv.destroy()` setzt `#isDestroyed` nicht, wenn kein Worker existiert, und ein
       `destroy()` während eines laufenden `start()` läßt `workerLoaded` für immer pending
       (Plan »Vorbestehende Fehler«, Planer 12 / 12b). §3.2. **Mit dem Vermerk, daß Paket 15 diese
       Zeile einlöst und selbst streicht** — sie wird eingetragen, damit sie nicht verlorengeht,
       falls der Lauf vor 15 endet.
     - `ComponentMemory` ist ein Wertexport von `index.ts:12` ohne Typdeklaration, weil die Klasse
       `@internal` trägt und `stripInternal` greift (Plan »Vorbestehende Fehler«, Planer 12d).
       §3.6. Der Nutzer hat am 2026-08-17 entschieden: der Re-Export fällt in Paket 16. Die Zeile
       wird deshalb **mit** dem Vermerk eingetragen, daß 16 sie einlöst und streicht — der Vorbehalt
       aus dem alten 12c-Plan ist aufgehoben, die Entscheidung steht unter »Entscheidungen«.
     - Fünf Abschnitte von `docs/api-reference.md` hat kein Paket dieses Laufs gegen den Code
       gehalten (Plan »Vorbestehende Fehler«, Planer 12d). §7.4. Ebenfalls mit dem Vermerk, daß
       Paket 16 sie einlöst.
     - Die vierzehn `SHAE_*`/`ATTR_*`-Konstanten aus `elements/constants.ts` sind über `index.ts:2`
       öffentlich und stehen in keiner Referenz (Plan »Vorbestehende Fehler«, Planer 12d). §7.4.
     - Neun Wertexporte von `index.ts` ohne jede Doku-Zeile: `ChangeTrailPhase`, `Configure`,
       `ChangeTrail`, `Destroy`, `Loaded`, `AppliedChangeTrail`, `ImportedModule`, `Destroyed`,
       `ShadowObjectsExport` (Plan »Vorbestehende Fehler«). §7.4. Territorium §Advanced, also
       formal Paket 16 — aber 16 ist ein Doku-Paket und entscheidet nicht, ob ein
       Worker-Protokoll-Symbol öffentlich sein soll. Die Zeile bleibt stehen.
     - `Element.moveBefore` ist für ein `<shae-ent>` kein atomarer Umzug — steht bereits als
       `VIEW-6b` (`:204`), **nichts zu tun**. Der eine von sechzehn, der drin ist.
     - Die zwei `biome.json`-Infos (`:2` `$schema` auf 2.4.14 bei Biome 2.5.8; `:56`
       `linter.rules.recommended` deprecated), mit dem Grund, warum `biome migrate` nicht mitten im
       Lauf lief: es kann den wirksamen Regelsatz anfassen. §5.3, neben Punkt `:347`.
     - `waitUntil` und `testAsyncAction` teilen sich 5000 ms als Vorgabe; wird `waitUntil` innerhalb
       einer `testAsyncAction` benutzt, läuft die äußere Frist zuerst ab und der Bericht nennt die
       Frist statt der Bedingung. §4.3, neben dem vorhandenen Punkt `:288` über magische Waits.
     - `packages/shadow-objects-testing/test/__screenshots__/` wird von keinem Skript geleert;
       `package.json` hat kein `pretest`. §5.4, analog zu dem, was Paket 1 für Playwright gestellt
       hat. Am 2026-08-17 liegen dort neun Altaufnahmen aus grün laufenden Fällen.
     - Der Gloss »Token (Component Tag)« steht an neun Doku-Stellen, während die
       `Konventionen` dieses Laufs »Token (nicht Component Tag)« binden. §7.4 (Doku). Von 11, 12b
       und 12d bewußt stehengelassen, damit nicht die Hälfte umgestellt wird; wer die Entscheidung
       trifft, stellt alle neun um. Neu vom Planer 12c am 2026-08-17.
     Damit sind es **achtzehn** Zeilen — sechzehn aus der Triage des Laufs, zwei neu
     (`ShadowEnv.ns$` hatte im Plan keine Triage, der Gloss ist neu). Eine davon steht schon drin.

  3. **`Backlog.md` — streichen oder berichtigen, was dieser Lauf erledigt hat.** Jede Streichung
     mit der Stelle, die sie einlöst.
     - **§7.2 Punkt 9 (`:393`)** »`syncWait()` muß nach `destroy()` rejecten (VIEW-8)«: erledigt.
       Beleg im Code (`ShadowEnv.ts:19`, `:197`, `:249`) und in drei Fällen
       (`ShadowEnv.spec.ts:206`, `:215`, `:249`). Die Datei widerspricht sich hier selbst: `:206`
       führt VIEW-8 bereits durchgestrichen. **Zeile korrigiert:** der alte Plan sagte `:392`.
     - **§4.5 Punkt 2 (`:312`)** »`<shae-prop>` end-to-end testen — öffentliches Element ohne
       direkte Tests«: erledigt durch `prop-element-host.test.js`, `prop-element-lifecycle.test.js`,
       `prop-element-types.test.js`, `prop-element-registration-order.test.js` und die e2e-Seiten
       `upgrade-timing` und `dynamic-dom`. Zweiter Selbstwiderspruch: `:279` führt `<shae-prop>`
       schon als abgedeckt.
     - **§4.4 (`:302`)** nennt ein Attribut `parent-id`, das es nicht gibt — `elements/constants.ts`
       kennt es nicht, `grep` über `src/` findet null Treffer. Die Zeile wird auf die Attribute
       berichtigt, die es gibt, oder fällt.
     - **§4.1 (`:256`)** nennt 12 Dateien in `shadow-objects-testing/test/`; es sind **21**
       (frisch zählen). Die Liste wird nachgezogen.
     - **§7.1 Punkt 4 (`:385`)** ist zur Hälfte eingelöst und trägt schon ein 🟡; die noch offene
       Hälfte (VIEW-1, `destroy()` bricht Ausstehendes nicht ab) bleibt als eigene Zeile stehen.
       **Zuordnung korrigiert:** der alte Plan verortete sie in §7.2, sie steht in §7.1.
     - **§1 (`:38`)** trägt VIEW-1 in derselben Halbheit; die zwei Stellen werden gegeneinander
       gelesen.
     Weitere Kandidaten, die der Implementierer prüft, bevor er sie stehenläßt: §3.3 `VIEW-13`
     (`:214`, `#dispatchRequestParent` prüft `isConnected` nicht) — Paket 9b hat an genau diesen
     Zeilen gearbeitet; §1 `:41` und §7.2 `:391` (VIEW-6, `subtree: false`) — Paket 6 und 9b haben
     den Bereich angefasst und `api-reference.md` nennt die Grenze inzwischen ausdrücklich.

  4. **`packages/shadow-objects/CHANGELOG.md:66` berichtigen.** Der Eintrag zum Dependency-Bump
     schreibt die `Object.prototype`-Falle den falschen Methoden zu: Er nennt
     `ViewComponent.dispatchShadowObjectsEvent()` und `Entity.dispatchViewEvent()`. End-to-end
     gemessen vom Implementierer 12d kommt `vc.dispatchShadowObjectsEvent('toString', …)` beim
     Shadow Object **an** — `Entity.dispatchViewEvents` emittiert den Symbolnamen `onViewEvent` und
     trägt den konsumentengewählten String nur als Argument, er wird auf diesem Pfad nie zum
     eventize-Ereignisnamen. Betroffen ist die Gegenrichtung:
     `ComponentContext.dispatchMessage()`/`broadcastEvent()` → `ViewComponent.dispatchEvent()` →
     `emit(this, type, data)` (`ViewComponent.ts:238`). Der Satz wird auf diesen Pfad umgeschrieben.
     Die Zeile steht in `## [Unreleased]`, ist also noch nicht veröffentlicht — sie zu berichtigen
     ist kein Eingriff in eine Release-Historie. Der Rest des Abschnitts bleibt unangetastet.
     Vor der Änderung wird die Messung wiederholt: eine Behauptung über ein Verhalten, das kein Zug
     dieses Pakets sonst anfaßt, wird nicht aus dem Plan übernommen (Instrument 3).

  5. **`CHANGELOG.md` im Wurzelverzeichnis**: ein Stichpunkt im Abschnitt zum 2026-08-16 — oder ein
     neuer datierter Abschnitt, wenn der Commit auf einen anderen Tag fällt — über `TEST-PLAN.md`:
     der Kopf beschreibt wieder die Suite, die dasteht. Dazu ein Stichpunkt über `Backlog.md`: die
     Befunde dieses Laufs, die offen bleiben, stehen darin. Beides gehört in die Wurzel-Changelog,
     nicht in die Paket-Changelog: `TEST-PLAN.md` und `Backlog.md` sind Harness- und
     Projektdokumente und werden nicht mit `dist/` veröffentlicht.

**Ausdrücklich nicht angefasst.**

- **Kein Code, kein Test, keine Seite, keine Spec.** Auch dann nicht, wenn eine `TEST-PLAN.md`-Zeile
  eine Lücke beschreibt, die man in zehn Minuten schließen könnte. Dieses Paket schreibt auf, was
  ist; es baut nichts.
- **`packages/shadow-objects-e2e/KNOWN-DEFECTS.md`.** Paket 3 hat die Datei gestellt, `DEFECT-1`
  ist ihr letzter Benutzer. Unberührt.
- **`packages/shadow-objects/docs/`** in jeder Datei. 12b, 12c, 12d haben sie gestellt, 16 holt den
  Rest. Kein Zeichen.
- **`packages/shadow-objects/CHANGELOG.md` außer `:66`.** Insbesondere nicht `:119` — der Eintrag
  ist unvollständig, aber er beschreibt einen abgeschlossenen Lauf, und Paket 12c stellt die Lücke
  mit einem eigenen Stichpunkt daneben.
- **Die IDs der `Backlog.md`.** `VIEW-*`, `KERN-*`, `ELEM-*`, `LOW-*` gehören der Analyse vom
  2026-05-09. Neue Zeilen bekommen keine erfundene ID in derselben Reihe und keine Finding-ID
  dieses Audits.
- **`Backlog.md` §2.3** (Technologie-Snapshot) und **§5.2** (Dependency-Hygiene) nur dort, wo eine
  übertragene Zeile es verlangt. Der Snapshot ist nicht Aufgabe dieses Pakets.

- Verify:
  1. `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test` — Nullprobe
     unverändert: `test:ci` **637**, e2e **402**, `dist/` **198**. Dieses Paket ändert keine Zahl;
     wenn eine sich bewegt, hat es Code angefasst.
  2. Jede Zahl in `TEST-PLAN.md` wird gegen die Ausgabe von
     `pnpm -F shadow-objects-e2e exec playwright test --list` gehalten, nicht gegen diesen Plan. Die
     Summe der zehn Zeilen muß die Gesamtzahl ergeben.
  3. **Jeder neue `Backlog.md`-Eintrag wird mit der Plan-Zeile belegt, aus der er stammt**, und mit
     der Code-Fundstelle, an der er heute noch existiert. Beides in der Verlaufszeile. Ein Eintrag
     ohne beides ist ein roter Verify.
  4. **Jeder gestrichene `Backlog.md`-Eintrag wird mit der Stelle begründet, die ihn erledigt hat**
     — Commit, Datei oder Testfall. Auch in der Verlaufszeile.
  5. Gegenzählung: `grep -c` über die Anzahl der Listenpunkte in `Backlog.md` vorher und nachher,
     und eine Abschlußzeile im Verlauf, die sagt: achtzehn triagierte Befunde, davon *n* eingetragen,
     *m* als behoben verworfen, einer war schon drin.
  6. `git diff --stat` zeigt **genau die vier Dateien** aus der Liste und keine andere.

- Commit: `docs: bring the test plan and the backlog up to the state of this run`
- Verlauf:
  - Zug 0 (2026-08-17, Planer 12c): Paket aus 12c herausgelöst und geplant. `TEST-PLAN.md` mit einem
    echten `playwright test --list` gegen die Suite gehalten: **sechzehn** veraltete Stellen statt
    der vier des alten Plans, darunter die nirgends erwähnte Spec `worker-failure` mit 13 Fällen und
    das verschwundene `tests/lookupTests.ts`. Fallzahl **402** gegen die dort genannten 298; zehn
    Spec-Dateien gegen vier; vier falsche Zeilenzahlen in der Kopftabelle. `Backlog.md` vollständig
    kartiert: von **achtzehn** zu übertragenden Befunden steht **einer** drin (`VIEW-6b`, `:204`).
    Drei Zeilen sind ohne Zutun eines Pakets gegenstandslos geworden (`:393` VIEW-8 erledigt und
    schon bei `:206` durchgestrichen; `:312` widerspricht `:279`; `:302` nennt ein nicht
    existierendes Attribut `parent-id`), eine ist zahlenmäßig veraltet (`:256`: 12 statt 21 Dateien).
    Zwei Zeilennummern des alten Plans korrigiert (`:392`→`:393`, §7.2→§7.1 bei `:385`), zwei
    Befunde ohne Triage eingesammelt (`ShadowEnv.ns$`, `CHANGELOG.md:66`), einer neu gefunden (der
    »Component Tag«-Gloss). Nullprobe nicht neu gemessen — dieses Paket ändert sie nicht.

</details>

### [x] 14. localStorage-Fähigkeitstest im ConsoleLogger härten

- Hash: `e0fd279`
- Ergebnis: 2 Runden · der Defekt ist behoben · Verify grün: lint rc=0, typecheck ✓, test:ci 642 (Kernpaket 332 in 15 Dateien), e2e 402, `dist/` 198, kein »Errors«-Block
- Die Fähigkeitsprüfung fragt nicht mehr nach dem Namen, sondern probiert: Property-Zugriff, drei Methodentypen, ein `setItem`/`removeItem` auf einen Probeschlüssel. Was besteht, wird als Referenz gehalten; was durchfällt, landet im vorhandenen Rückfallpfad `globalThis.ConsoleLoggerStorage`. Damit trägt der Fix für alle drei Bauarten: Name ohne Methoden (Node), werfender Getter (`SecurityError` bei gesperrten Cookies), werfendes `setItem`.
- Nachweis: In reinem Node reproduziert, vom Implementierer und vom Reviewer unabhängig, letzterer gegen den per `git archive` nachgebauten Vorzustand. Fünf Storage-Formen gemessen, darunter ausdrücklich die Gegenrichtung — eine **funktionierende** Storage darf nicht mit weggeworfen werden, sonst »behebt« die Prüfung den Defekt, indem sie das Feature abschaltet. Genau dafür hat der Implementierer einen vierten Wächter gebaut, den der Plan nicht vorsah.
- **Ein Wächter fehlte, vom Reviewer aufgedeckt:** Der dreifache `typeof`-Block war von keinem der vier Fälle gedeckt — man konnte ihn ersatzlos entfernen, und alles blieb grün. Er trägt für genau eine Form: Storage mit `setItem`/`removeItem`, aber ohne `getItem`. Der fünfte Wächter schließt das und fängt auch die Teilentfernung nur der `getItem`-Prüfung.
- Der Ursachensatz im CHANGELOG musste zweimal geschrieben werden. Die erste Fassung behauptete, der Logger werde beim Import konstruiert und jeder serverseitige Import sterbe daran — gemessen gibt es im ganzen `src/` keine Modul-Level-Konstruktion, alle fünf `new ConsoleLogger(...)` sind Klassenfelder, und der Fehler kommt erst beim ersten `new Kernel()`. Dazu die ehrliche Einschränkung: Der Wurzel-Export bleibt in Node ohnehin nicht importierbar (`ReferenceError: HTMLElement is not defined`), real profitiert die Kernel-Seite über `shadow-objects.js`.
- **`vitest.setup.ts` bleibt — gemessen, nicht vermutet.** Ohne die Zeile fallen 19 Tests: 17 an einer zweiten, ungeschützten Fundstelle (`RemoteWorkerEnv.ts:337`), zwei, weil sie echtes Storage-Verhalten prüfen. Die Zeile steht damit ehrlich da, nicht als Entschädigung für einen behobenen Defekt.
- Folgen: `RemoteWorkerEnv.ts:337` geht an Paket 15, das die Datei ohnehin anfasst — die gehärtete Prüfung samt Rückfallpfad steht bereits, dort sind es zwei Zeilen.

- Findings: — (Nebenbefund aus Paket 5, außerhalb des Audit-Umfangs, vom Nutzer am 2026-08-16 in den Lauf geholt)
- Ziel: Ein Import der Bibliothek in einer reinen Node-Umgebung legt nicht beim ersten Logger den Prozess lahm.
- Bereich: `packages/shadow-objects/src/utils/ConsoleLogger.ts`, dazu ein Regressionstest in einer Umgebung ohne happy-dom und ein Eintrag in `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: —
- Modell: mittlere Stufe
- Sachverhalt: `HAS_LOCAL_STORAGE` prüft nur `'localStorage' in globalThis`. Node 24+ liefert dort einen Stub ohne `getItem`, also wirft `loadConfig()` einen `TypeError: localStorage.getItem is not a function` aus dem Konstruktor des ersten Loggers. Im Repo unsichtbar, weil `packages/shadow-objects/vitest.setup.ts` den Stub ausdrücklich ersetzt — genau diese Zeile ist der Beleg, dass das Problem bekannt und bisher nur umgangen ist.
- Hinweis: Der Regressionstest muss ohne die vorhandene `vitest.setup.ts` laufen, sonst prüft er nichts. Der Planer entscheidet, wie das im vorhandenen Testaufbau am günstigsten geht, und schreibt es in den Detailplan. Verwandt mit einem bereits im CHANGELOG stehenden `loadConfig()`-Fehler, aber ein eigener Fall.

### [x] 15. RemoteWorkerEnv: destroy() greift, start() hängt nicht

- Hash: `7195023`
- Ergebnis: 2 Runden · alle drei Defekte behoben · Verify grün: lint rc=0, typecheck ✓, test:ci 652 (Kernpaket 342), e2e 402, `dist/` 198, kein »Errors«-Block
- `destroy()` setzt die Marke jetzt vor dem Early Return und bricht den Failure-Controller ab; das settelt `start()`, `workerLoaded` und ein laufendes `applyChangeTrail()`/`importScript()`. Ein Ausfall, der zuerst kam, behält das Signal — ein Abbau begräbt nie den Fehler, der ihn ausgelöst hat. Dazu die dritte, aus Paket 14 geerbte Fundstelle: `configureConsoleLogger()` las `localStorage` ungeschützt, und in einem Browser mit gesperrtem Storage starb `start()`.
- Nachweis: Alle drei Defekte vom Implementierer und vom Reviewer unabhängig gegen den nachgebauten Vorzustand reproduziert, sieben von zehn neuen Tests vor ihrem Fix rot.
- **Zwei bewusste Abweichungen, beide gemessen und beide bestätigt.** Der Implementierer hat einen `#isDestroyed`-Guard in `start()` **entfernt**, weil er nach dem Abort unerreichbar wurde, und den vom Plan geforderten Idempotenz-Wächter **nicht** gebaut, weil keine Mutation ihn rot macht. Der Reviewer hat den einzigen denkbaren Pfad zur entfernten Zeile gefahren (reentrantes `start()` aus einem `console.error`-Stub) und die Gegenprobe gemacht: Von drei `isDestroyed`-Prüfungen war exakt eine tot, und exakt die ist gefallen; die zwei verbliebenen sind je durch einen eigenen Test bewacht. Die Idempotenz trägt jetzt die Freigabe der Worker-Referenz, und die ist falsifizierbar.
- Ein Testname behauptete eine Zusage, die sein Rumpf nicht prüfte — »still reports a worker failure rather than the teardown that followed it« rief nie `destroy()`. Der Fall ist erweitert; seine Mutation dreht die Reihenfolge der Eingangsprüfungen um, also genau den Fehler, vor dem der Kommentar an der Stelle warnt.
- Nebenbei eine stille Abweichung von der Dokumentation beseitigt: Die Referenz sagt seit jeher, ein Worker-Ausfall lehne auch `start()` mit `WorkerFailedError` ab — im Fenster zwischen Handshake und Settle tat es das nicht.
- **VIEW-1 ist damit ganz erledigt.** Die offene Hälfte war, dass ein beim Abbau laufendes `applyChangeTrail` in seinen Timeout lief; der Abort räumt Hörer und Timer ab. Sieben Fundstellen im Backlog nachgezogen, die Begründung für den alten Zustand als eingelöste Bedingung erhalten statt gelöscht.
- Nebenbefunde: `RemoteWorkerEnv.ts:287` hängt ein `.finally()` ohne `catch` — schweigt der Worker, gibt es nach `WorkerDestroyTimeout` eine unbehandelte Rejection; als Backlog-Zeile eingetragen. · `configureConsoleLogger` ruft `JSON.parse` ungeschützt; ein von Hand gesetzter kaputter Wert tötet weiterhin `start()`. · Der verbesserte Ausfall-Nebeneffekt ist selbst unbewacht.
- `vitest.setup.ts` bleibt: ohne die Zeile fallen jetzt noch **3** Tests statt 19, und alle drei haben echtes Storage-Verhalten zum Gegenstand.

- **Nachtrag 2026-08-17 (Implementierer 14):** `RemoteWorkerEnv.ts:337` ist die **einzige weitere ungeschützte `localStorage`-Fundstelle** im gesamten `src/`-Baum — `configureConsoleLogger()` liest dort `localStorage.getItem(...)` ohne Absicherung. Sie läuft erst beim Anlegen eines Workers, ist unter reinem Node also kaum erreichbar; in einem Browser mit gesperrtem Storage aber sehr wohl, und dann stirbt `start()`. Gemessen: Ohne die Umgehung in `vitest.setup.ts` fallen 17 Tests in `RemoteWorkerEnv.spec.ts` genau daran. Paket 14 hat die gehärtete Fähigkeitsprüfung samt Rückfallpfad bereits gebaut — hier sind es zwei Zeilen. Dieses Paket fasst die Datei ohnehin an. · Beide 15er-Defekte am Code bestätigt und unverändert: `destroy()` kehrt bei `if (!this.#worker) return` (`:266`) zurück, bevor `#isDestroyed = true` (`:271`) läuft, und `#workerFailure.abort()` steht ausschließlich in `handleWorkerFailure` (`:305`).

- Findings: — (zwei Funde des Planers 12b, außerhalb des Audit-Umfangs, vom Nutzer am 2026-08-17 in den Lauf geholt)
- Ziel: Ein zerstörtes `RemoteWorkerEnv` bleibt zerstört, und kein `start()` hinterlässt eine Promise, die nie settelt.
- Bereich: `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`, dazu Wächter im Kernpaket oder im Integrationspaket und ein Eintrag in `packages/shadow-objects/CHANGELOG.md` · dazu **`Backlog.md`: die Zeile streichen, die Paket 17 für genau diese zwei Defekte eingetragen hat** — die Zuweisung steht dort mit Vermerk
- Hängt ab von: — (läuft aber hinter 17, sonst gibt es keine Zeile zu streichen)
- Modell: mittlere Stufe
- Sachverhalt, am Code bestätigt: (1) `destroy()` setzt `#isDestroyed` erst **nach** dem Early Return für den Fall »kein Worker vorhanden« — ein anschließendes `start()` startet dann einen Worker, obwohl die Umgebung als zerstört gilt. (2) Ein `destroy()` während eines laufenden `start()` bricht den `#workerFailure`-Controller nicht ab; der Abort steht nur in `handleWorkerFailure`, sodass `workerLoaded` für immer pending bleibt.
- Hinweis: Der Fix sind zwei Zeilen, die Wächter sind der Aufwand. Beide Defekte sind über die öffentliche API erreichbar; der Planer entscheidet, ob sie sich im Kernpaket mit happy-dom oder im Integrationspaket in echtem Chromium schärfer fassen lassen.

### [x] 16. Die restliche Referenz gegen den Code stellen

- **Nachtrag 2026-08-17 (Orchestrator):** Der Rückverweis von `api-reference.md` nach `guides.md#registering-your-own-entity-elements` gehört in dieses Paket — es ist das einzige verbleibende, das `api-reference.md` ohnehin anfasst. Paket 12b hatte ihn ausgelassen, weil sein Ziel noch nicht existierte; Paket 12c durfte die Datei nicht anfassen. Das Ziel existiert seit `c0691da`. Dazu vier Funde aus 12c für dieses Paket: `api-reference.md:1964-1972` übergibt `shadowObjects.define` eine Funktion, die nicht auf `ShadowObjectConstructor` passt (`TS2345`); der Name `shadowObjects` trägt seit 12c zwei Bedeutungen (der benannte Modulexport, den der Loader liest, und das Helferobjekt aus `in-the-dark/ShadowObject.ts`) und §Advanced benutzt an sechs Stellen das Zweite ohne ein Wort dazu; `best-practices.md:311-371` hat einen echten Typfehler (`const destroyCallbacks = []` inferiert `never[]`, zweimal `TS2349`), der sich in der Kategorie »absichtlich unvollständig« versteckte; und `guides.md:547` ist als `javascript` gefenced, enthält aber JSX (`TS17004`). Die letzten zwei liegen außerhalb von `api-reference.md` — nimm sie mit, wenn der Umfang es trägt, sonst als Backlog-Zeilen.

- Findings: — (Nutzerentscheidung vom 2026-08-17; außerhalb des Audit-Umfangs)
- Ziel: §Shadow Object Creation API und §Registry — die zwei Abschnitte von `api-reference.md`, in denen der Anwender seinen ersten eigenen Code schreibt — sagen, was der Code tut, und jedes Beispiel darin ist gefahren worden. **Am 2026-08-17 vom Planer 16 auf diese zwei Abschnitte zugeschnitten**; §Namespacing and Contexts, §Kernel, §Advanced und der `ComponentMemory`-Schnitt laufen als Paket 19.
- Bereich: `packages/shadow-objects/docs/api-reference.md` §Shadow Object Creation API (`:40`–`:411`) und §Registry (`:412`–`:566`) — **527 von 2190 Zeilen**, 27 Codeblöcke, am 2026-08-17 vom Planer 16 selbst vermessen · dazu `packages/shadow-objects/docs/best-practices.md` (**nur** `:311`–`:371`), `packages/shadow-objects/docs/guides.md` (**nur** die Fence-Marke `:547`) und `packages/shadow-objects/CHANGELOG.md`. Kein Code, kein `Backlog.md`.
- Hängt ab von: Paket 12d (dessen Schritt 4a zwei Stellen **innerhalb** dieses Bereichs bereits gestellt hat — `:232`–`:246` und `:366`–`:391`, beide Tabu), Paket 12c (dessen drei Registry-Beispielzeilen `:427`, `:529`, `:549` hier liegen und nicht erneut angefasst werden) und Paket 18 (aus dem der `onDestroy`-Nachtrag bei `:353`–`:361` stammt).
- Modell: stärkste Stufe
- ~~Zwei bereits belegte Fehler als Einstieg: `api-reference.md:374-380` zeigt ein `for…of` über `propKeys`; `:237-238`/`:264-266` geben `on`/`once` als `void` an.~~ **Am 2026-08-17 vom Planer 12c an der Fundstelle nachgelesen: beide stehen jetzt richtig.** `:378` gibt `entity.propKeys()` als `() => string[]` an, `:382` sagt ausdrücklich »are **methods**, not properties -- call them« und »they also do not shrink«, und das `for…of` bei `:386` läuft über `propEntries()`. `:237-238` geben `on` als `() => void` zurück. Zuletzt geändert in `4dc57ae` — **Paket 12d hat sie als Gegenstellen mitgenommen**, ohne sie in seiner Ergebniszeile zu nennen. Dieses Paket verliert damit seinen Einstieg und braucht einen eigenen: die vier ungelesenen Abschnitte werden von vorn gelesen, ohne Vorwissen darüber, wo die Fehler sitzen. Der Umstand, daß 12d beim Durchgehen der Gegenstellen zwei Fehler in *fremdem* Gebiet mitgenommen hat, sagt weiter etwas über die Quote — nur nicht mehr, wo genau.
- Der `ComponentMemory`-Export: `index.ts` reicht die Klasse als Wert weiter, `@internal` plus `stripInternal: true` halten sie aus der `.d.ts`. Der Re-Export fällt, das Interface `ComponentState` bleibt als Typexport. Breaking Change, gehört ins Paket-CHANGELOG. **Am 2026-08-17 vom Planer 16 nach Paket 19 verschoben** — siehe die Teilungszeile unten.
- Hinweis: Dieselben vier Instrumente wie 12b und 12d — Signaturen gegen die emittierten `.d.ts` in beide Richtungen, Verhalten messen, **jeden angefassten Codeblock wörtlich ausführen**, und zu jeder geänderten Aussage die Gegenstelle prüfen. Jede Aussage wird am Code belegt, nicht am Plan.

<details>
<summary>Detailplan Paket 16</summary>

**Die Bereiche selbst nachgemessen (2026-08-17, Planer 16, `api-reference.md` hat 2190 Zeilen).**
Die Zahlen aus dem Backlog und aus der Zeile oben sind um bis zu drei Zeilen versetzt; es gilt der
Text, nicht die Zahl. Gegen die `^## `/`^### `-Überschriften gezogen:

| Abschnitt | Zeilen | Umfang | Codeblöcke |
|---|---|---|---|
| §Shadow Object Creation API | `:40`–`:411` | 372 | 18 (alle `typescript`) |
| §Registry (Component Manifest) | `:412`–`:566` | 155 | 9 (8 `javascript`, 1 `html`) |
| `### Namespacing and Contexts` | `:1805`–`:1842` | 38 | 2 (1 `html`, 1 `typescript`) |
| §Kernel (ECS System Runner) | `:1843`–`:1952` | 110 | 9 (alle `typescript`) |
| §Advanced | `:1953`–`:2190` | 238 | 13 (alle `typescript`) |
| **zusammen** | | **913 von 2190** | **51, davon 49 ts/js** |

**Geteilt am 2026-08-17 (Planer 16).** Dieses Paket nimmt die ersten zwei Abschnitte
(`:40`–`:566`, 527 Zeilen, 27 Blöcke), **Paket 19** die letzten drei (`:1805`–`:2190`, 386 Zeilen,
24 Blöcke) samt dem `ComponentMemory`-Schnitt und dem Rückverweis nach `guides.md`. Drei Gründe,
in der Reihenfolge ihres Gewichts:

1. **Die zwei Hälften belegen sich nicht gleich.** §Creation API und §Registry sind Aussagen über
   *Reaktivitätssemantik und Routenauflösung* — sie fallen nur, wenn man signalize und den Kernel
   laufen lässt (die Sonde unten hat auf diesem Weg fünf Fehler gefunden, die kein Lesen zeigt).
   §Kernel und §Advanced sind Aussagen über *Oberflächenvollständigkeit und Importpfade* — sie
   fallen, wenn man die `.d.ts` auszählt und Subpfade auflöst. In einem Paket verdeckt das
   schwächere Instrument das stärkere; genau das war der Grund für die Teilung 12c → 17.
2. **Der Umfang.** 913 Zeilen und 49 einzeln zu fahrende Blöcke sind mehr als 12b, 12d und 12c je
   einzeln hatten (rund 500 Zeilen / 27 Blöcke bei 12d, 52 Blöcke bei 12c) — und dazu käme eine
   Codeänderung.
3. **Die Nullprobe bleibt scharf.** Paket 16 fasst **keinen** Code an, `dist/` bleibt bei 198 und
   `git diff --stat` zeigt vier Dateien. Der `ComponentMemory`-Schnitt ist die einzige Codeänderung
   des Restlaufs; er steht allein in 19 und wird dort einzeln belegt.

Nummern werden nie neu vergeben; die Reihenfolge ist 18 → 16 → 19.

**Jede Aussage wird am Code belegt, nicht an diesem Plan.** Nicht am CHANGELOG, nicht an einer
anderen Doku-Datei, nicht an einem JSDoc — der beschreibt eine Absicht, die Signatur beschreibt die
Oberfläche. **Anhaltepflicht:** Findet der Implementierer eine Planaussage am Code nicht wieder,
wird sie nicht »sinngemäß« umgesetzt. Er hält an, notiert Fundstelle und Messung in der
Verlaufszeile und entscheidet neu — oder legt vor, wenn die Korrektur über Dokumentieren
hinausgeht. In 12b wurden vier Planbehauptungen widerlegt, in 12d zwei, in 12c fünf, in 17 sieben;
zusammen über zwanzig. Der Planer dieses Pakets hat in Zug 0 bereits **eine eigene widerlegt** (die
Kreis-Struktur-Behauptung zu `JSON.stringify(getEntityGraph())`, Punkt K-8 in Paket 19) — die Regel
gilt für Planer wie Implementierer.

- Dateien: `packages/shadow-objects/docs/api-reference.md` (**nur** `:40`–`:566`),
  `packages/shadow-objects/docs/best-practices.md` (**nur** der Block `:311`–`:371`),
  `packages/shadow-objects/docs/guides.md` (**nur** die Fence-Marke `:547`),
  `packages/shadow-objects/CHANGELOG.md` — **vier Dateien, keine weitere.**

- Vorgehen:

  1. **§Shadow Object Creation API (`:40`–`:411`) gegen `dist/src/types.d.ts` stellen.** Der
     `ShadowObjectCreationAPI`-Interface-Block dort ist der Beleg, nicht `Kernel.ts` und nicht der
     Cheat Sheet. Am 2026-08-17 ausgezählt: **17 Member** (`entity`, `dispatchMessageToView`,
     `provideContext`, `provideGlobalContext`, `useContext`, `useParentContext`, `useProperty`,
     `useProperties`, `createResource`, `createEffect`, `createSignal`, `createMemo`, `on`, `once`,
     `onViewEvent`, `emit` ×2, `onDestroy`). Alle 17 kommen im Abschnitt vor — die Lücke ist keine
     fehlende Zeile, sondern **falsche Signaturen**. Diese sind gemessen:

     - **C-1 `:207` — das Beispiel wirft.** `const doubleCount = createMemo(() => count() * 2);`
       Das `count` dieses Abschnitts kommt aus `createSignal(0)` (`:147`) und ist eine
       `Signal`-Instanz. Gemessen: `TypeError: count is not a function`. Sechzig Zeilen darüber
       sagt `:144` selbst »It is *not* callable«. Dieselbe Fehlerfamilie wie `README.md:61/64`,
       die 12c behoben hat. → `count.get() * 2`, und `:194` im Block darüber macht es bereits
       richtig.
     - **C-2 `:214` — die `createResource`-Signatur stimmt in drei Punkten nicht.**
       Angegeben: `createResource((val) => Resource, (val, resource) => void)`. Real
       (`types.d.ts`, Implementierung `Kernel.ts:640-668`):
       `createResource<T>(factory: () => T | undefined, cleanup?: (resource: NonNullable<T>) => unknown): Signal<Maybe<T>>`.
       Gemessen: die Factory wird mit **0** Argumenten gerufen, das Cleanup mit **1**, und der
       Rückgabewert ist ein `Signal` (`.value` liest die aktuelle Ressource). Der Rückgabewert
       steht im Abschnitt mit keinem Wort — und er ist der einzige Weg, die Ressource außerhalb
       der Factory zu lesen. Das Beispiel `:216-224` passt zufällig, weil es die Factory-Argumente
       gar nicht benutzt.
     - **C-3 `:142` — die `createSignal`-Überladung ohne Anfangswert steht falsch.** Angegeben:
       `createSignal<T>(params?): Signal<T | undefined>`. Real (signalize 1.0.0-beta.0,
       `lib/create-signal.d.ts`): `createSignal<T>(initialValue?: undefined, params?)`. Wie
       dokumentiert stünde `params` in der **ersten** Position und würde als Wert gespeichert. Das
       Beispiel `:156-160` ist korrekt, die Signaturzeile darüber nicht.
     - **C-4 `:162` — halb richtig, und die falsche Hälfte ist die gefährliche.** »Without that flag
       a function argument is stored as the value«: signalize sagt in seinem eigenen Kommentar zu
       `create-signal.d.ts`, ein blankes `createSignal<T>(fn)` habe »no overload to land on and is
       rejected instead of silently storing the function as the value«. Nur die inferierte Form
       `createSignal(fn)` speichert die Funktion (dann als `Signal<() => R>`). Beide Formen messen,
       dann den Satz schärfen.
     - **C-5 `:204` — `createMemo<T>(fn: () => T): () => T`.** Real ist es signalizes `createMemo`
       durchgereicht: `createMemo<T>(...args: Parameters<typeof createMemo<T>>): SignalReader<T>`,
       also `(callback: () => T, options?: CreateMemoOptions)`. Der `options`-Parameter fehlt
       (`attach`, `name`, `lazy`, `priority`, `batchWrites`).
     - **C-6 — `options?` steht fünfmal ohne Typ:** `:63` (`useProperty`), `:106` (`useContext`),
       `:114` (`useParentContext`), `:120` (`provideContext`), `:128` (`provideGlobalContext`).
       Real (`types.d.ts`): `SignalValueOptions<T> | CompareFunc<T | undefined>`, bei den zwei
       `provide*` `ProvideContextOptions<T> | CompareFunc<T | undefined>` (das zusätzliche Feld
       heißt `clearOnDestroy` und steht per Vorgabe auf `true`, `Kernel.ts:556-560`).
       **Gegenstelle: `cheat-sheet.md:62-67` nennt die Typen seit 12d bereits** — die zwei Dateien
       widersprechen sich heute an fünf Zeilen. Der Cheat Sheet ist **Tabu**; die Referenz zieht
       nach.
     - **C-7 — die Rückgabetypen sind durchgehend `T | undefined` statt `Maybe<T>`.**
       `Maybe<T> = NonNullable<T> | undefined` (`types.d.ts`). Betrifft `:63`, `:79`, `:106`,
       `:114` (`SignalReader<Maybe<T>>`) und `:120`, `:128` (`Signal<Maybe<T>>`). Kleiner
       Unterschied, aber dieser Abschnitt ist eine Signaturreferenz, und der Cheat Sheet hat es
       nach 12d richtig.
     - **C-8 — ein unbeschriebenes Verhalten mit Fallhöhe: die Signale sind pro Name gecacht.**
       `useProperty`, `useContext` und `useParentContext` legen beim ersten Aufruf ein Signal an
       und geben bei jedem weiteren dasselbe zurück (`Kernel.ts:447-475`, `:564-590`, `:592-618`).
       Ein zweiter Aufruf mit einer **anderen** `compare`-Funktion wird ignoriert und meldet auf
       der Konsole. Dazu: eine Funktion als `options` funktioniert weiter, druckt aber eine
       Deprecation-Warnung. Beides messen und in einem Satz je Methode festhalten — es ist genau
       die Sorte Zusage, die ein Anwender erst im Debugger findet.
     - **C-9 `:248`–`:270` — `onViewEvent` hat als einziger der 17 Member keine Signaturzeile.**
       Es steht nur erzählend da. Real: `onViewEvent(callback: (type: string, data: unknown) => any): void`.
       Das ist die zweite Richtung von Instrument 1 (»keine Doku-Zeile ohne Member, kein Member
       ohne Doku-Zeile«), und genau sie hat in 12d `#### on(type, listener)` auffliegen lassen.
     - **C-10 `:234` — »Subscriptions created via `on()` are automatically removed«.** Trägt, aber
       nicht symmetrisch: die *Objektform* gibt einen Unsubscribe zurück, der sich zusätzlich aus
       der Teardown-Menge austrägt (`Kernel.ts:704-707`, `Object.assign`), die *Stringform* gibt
       den nackten eventize-Unsubscribe zurück (`:694-697`). Erst messen, dann entscheiden, ob das
       eine Doku-Zeile wert ist — nicht umgekehrt.
     - **C-11 `:190` und `:197` — Effekte mit Abhängigkeitsliste.** Gemessen und **richtig**:
       `createEffect(fn, [a])` läuft bei der Erzeugung **nicht**, ein im Rumpf gelesenes,
       nicht gelistetes Signal löst **keinen** Neulauf aus, ein gelistetes schon. Nicht anfassen.
       Offen ist nur `:197` `effect.run(); // opt in to an initial pass` — in der Sonde des
       Planers lief `run()` nach einem bereits erfolgten Lauf **nicht** erneut. Sauber
       nachmessen (frisch erzeugter Effekt, sofort `run()`), bevor ein Wort geändert wird.
     - **C-12 `:170` — »`set()` takes a value, never an updater«.** Gemessen und **richtig**:
       nach `count.set(c => c + 1)` ist `typeof count.value === 'function'`. Nicht anfassen. Steht
       hier, damit niemand »vereinheitlicht«.
     - **C-13 `:353`–`:361` `#### onDestroy(callback)` — der Nachtrag aus Paket 18.** Der Callback
       läuft auf **zwei** Wegen: die Entity wird zerstört, **und** das Shadow Object verlässt die
       Konstruktorenmenge einer weiterlebenden Entity (Token- oder Routenwechsel). Der Code sagt es
       nach 18 selbst im Kommentar über `tearDown` in `Kernel.ts`. Ein Satz, mehr nicht — und er
       wird an `Kernel.ts` belegt, nicht an der Ergebniszeile von 18.
     - **C-14 `:79` — der Parameter heißt im Code `props`, nicht `map`** (`types.d.ts`,
       `Kernel.ts:624`), auch in der Überschrift `#### useProperties(map)`.

  2. **§Registry (`:412`–`:566`) gegen `in-the-dark/Registry.ts` und `in-the-dark/importModule.ts`.**

     - **R-1 `:517` — die Auflösung ist zweifach falsch beschrieben.** Der Kommentar sagt
       `// 'page' resolves to: ['header', 'menu', 'logo', 'footer']`. Gemessen mit genau den
       Routen des Beispiels gibt `Registry.findTokensByRoute('page')`
       **`['page', 'header', 'footer', 'menu', 'logo']`** zurück. Zwei Fehler: das Ausgangstoken
       selbst ist Teil der Menge (`Registry.ts:81`), und aufgelöst wird über eine **Warteschlange**
       (`:83-96`) — die Geschwister kommen vor den Enkeln, nicht danach. Wer den Kommentar für die
       Reihenfolge der Instanziierung nimmt, liegt falsch; und `:2088-2089` in §Advanced macht
       dieselbe Reihenfolgenzusage über dasselbe Verfahren (dort ist es **Paket 19**, Punkt A-6 —
       die zwei Stellen müssen danach dasselbe sagen).
     - **R-2 `:501` — `<shae-ent token="user-profile" debug>` gibt es nicht.** Der Kommentar zeigt
       eine truthy Property als **Attribut am `<shae-ent>`**. Properties kommen aus `<shae-prop>`
       oder aus `setProperty` — ein unbekanntes Attribut am Element ist keine Property, und
       `ShaeEntElement.observedAttributes` führt nur `ns`, `token`, `forward-custom-events`
       (`api-reference.md:1503`, von 12b belegt). Das Gegenbeispiel eine Zeile darüber (`:487-494`)
       macht es mit `<shae-prop>` richtig. Der Kommentar wird auf dieselbe Form gezogen.
     - **R-3 — §Registry und §Advanced widersprechen sich im Schweigen.** `:2059` (Paket 19) sagt,
       ein zweimal definiertes Token sammelt beide Konstruktoren; `:440`–`:452` sagt es nicht.
       `Registry.ts:43-50` über `appendTo` (`utils/array-utils.ts:4-9`, das dabei **dedupliziert**).
       Ein Satz bei `### define`. Gegenstelle in Paket 19 mitlesen.
     - **R-4 `:522`–`:535` `### extends` — zwei unbeschriebene Regeln.** `importModule` überspringt
       ein bereits importiertes Modul und meldet es über `console.warn`
       (`importModule.ts:10-15`) — ein Modul, das zwei `extends`-Ketten gemeinsam haben, wird
       genau einmal importiert. Und die Untermodule laufen mit `upgradeEntities = false`, erst das
       äußere Modul stößt den Upgrade an (`:17-19`, `:41-43`). Beides messen, dann je einen
       Halbsatz.
     - **R-5 `:445` — »A Shadow Object definition (function or class)«.** Für die Modulform stimmt
       das (`ShadowObjectsModule.define` nimmt
       `ShadowObjectConstructor | ShadowObjectConstructorFunc`, `types.d.ts`). Für
       `shadowObjects.define()` und `registry.define()` stimmt es **nicht** — beide nehmen nur
       `ShadowObjectConstructor`. Das ist die Wurzel des `TS2345` bei `:1964-1972` und gehört
       fachlich zu **Paket 19**, Punkt A-2, samt der dort vorgelegten Rückfrage. Hier steht die
       Zeile nur, damit dieses Paket sie **nicht** einseitig umformuliert.
     - **R-6 `:414` und `:442` tragen den Gloss »(Component Tag)« — Tabu.** Backlog §7.4 Punkt 26
       besitzt ihn an allen neun Stellen; ihn hier zu entfernen erzeugt genau den halben Zustand,
       den 12c bei den Registry-Beispielen vermieden hat.
     - **R-7 — die fünf `javascript`-Blöcke `:447`, `:464`, `:479`, `:498`, `:512` sind bloße
       Objektliteral-Fragmente** (`define: { … }`, `routes: { … }`) und können für sich nicht
       geparst werden. Absichtlich unvollständig — aber nach der Regel aus 12c wird jeder solche
       Block **namentlich mit Grund** in der Verlaufszeile geführt, nicht stillschweigend
       übergangen. Ein unmarkierter durchgefallener Block ist ein roter Verify.

  3. **`docs/best-practices.md:311`–`:371` — der Typfehler, der sich versteckt hat.** Der Block ist
     als `typescript` gefenced und gibt sich als lauffähiger vitest-Test aus. `const destroyCallbacks = []`
     inferiert `never[]`, also ist `destroyCallbacks.push(fn)` ein `TS2345` und
     `destroyCallbacks.forEach(fn => fn())` ein `TS2349`. **Am 2026-08-17 nachgelesen: dieselbe
     Bauart trifft `const signals = {}` und `const effects = []`** — der Implementierer misst,
     welche Meldungen wirklich fallen, und annotiert die drei Locals, statt drei Fehler zu raten.
     Der Kommentar bei `:317-318` (»Mirror the real Signal: an object, not callable«) ist nach C-1
     die Gegenstelle und **stimmt** — er bleibt.

  4. **`docs/guides.md:547` — die Fence-Marke.** Der Block ist `javascript`, enthält aber JSX
     (`return <div>Score: {score}</div>;`) und fällt als `.ts` mit `TS17004`. **Nur die Marke wird
     geändert** (`jsx`), keine Zeile im Block. Der Rest von `guides.md` gehört 12c und ist Tabu.

  5. **`packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`**, ein Stichpunkt
     `- **Docs (reference):** …` für §Shadow Object Creation API und §Registry — die
     `createResource`-Signatur, die `createSignal`-Überladung, das `createMemo`-Beispiel, das einen
     `TypeError` warf, die fünf `options`-Typen, die Routenauflösung. Kein zweiter Stichpunkt für
     `best-practices.md`/`guides.md` — die zwei Fence- und Typkorrekturen hängen an demselben
     Instrument und passen in denselben Satz. Kein Rückblick auf den Vorzustand (»Konventionen«).

- **Tabu — diese Stellen fasst das Paket nicht an:**
  - **`api-reference.md` außerhalb von `:40`–`:566`.** Insbesondere: alles ab `## ViewComponent`
    (`:567`) bis `## Web Components` (`:1325`) gehört **12d**; `:1325`–`:1804` gehört **12b**;
    `:1805`–`:2190` gehört **Paket 19**. Kein Querverweis, der dort eine Zeile ändert.
  - **Innerhalb des eigenen Bereichs gehören 12d zwei Stellen**, die es in seinem Schritt 4a als
    Gegenstellen mitgenommen und am Code geprüft hat: **`:232`–`:246`** (die `on`-Signaturen und der
    Unsubscribe-Satz) und **`:366`–`:391`** (§7 »The `entity` Instance«, die Tabelle mit
    `propKeys()`/`propEntries()`/`kernel` und das `for…of`-Beispiel, das vorher einen `TypeError`
    warf). Beide werden **gelesen und als Blöcke gefahren**, aber nicht neu formuliert. Widerspricht
    etwas davon dem Code, gilt der Code und der Widerspruch geht in die Verlaufszeile — 12d hat 36
    Aussagen gemessen, 32 trugen.
  - **Die sechs Zeilen von 12c**, davon drei im eigenen Bereich: `:427`, `:529`, `:549`
    (`export const shadowObjects = {` in den Registry-Beispielen — Stand 2026-08-17, der Plan
    nannte `:426/:528/:548`), dazu `:254`, `:326`, `:334` außerhalb. Der Loader liest genau diesen
    Namen; ein halb korrigiertes Muster ist schlimmer als ein durchgehend falsches.
  - **Der Gloss »(Component Tag)«** bei `:414` und `:442` (siehe R-6) und **die »runs once«-Familie**
    — 12c hat sie an acht Stellen in fünf Dateien einheitlich gestellt, `cheat-sheet.md:6` ist die
    Vorlage. Wird zitiert, nicht neu erfunden.
  - **`docs/cheat-sheet.md`, `docs/concepts.md`, `docs/getting-started.md`, `docs/README.md`, beide
    `README.md`, `TEST-PLAN.md`, `Backlog.md`, die Wurzel-`CHANGELOG.md`** — kein Zeichen. Der
    Cheat Sheet ist nach 12d und 18 die **Gegenstelle**, an der sich C-6 und C-13 ausrichten, kein
    Bearbeitungsziel. Der Backlog gehört **Paket 19**.
  - **Kein Code.** Keine Datei unter `packages/*/src/`, kein Test, kein `package.json`, kein
    `tsconfig`. `dist/` bleibt bei **198**. Findet der Implementierer einen Code-Defekt, wird er
    notiert und vorgelegt, nicht behoben. Der `ComponentMemory`-Schnitt ist **Paket 19**.
  - **Alles aus Paket 18** — `Kernel.ts`, `Kernel.spec.ts`, `cheat-sheet.md`, `Backlog.md`, die
    Paket-`CHANGELOG.md`-Einträge von 18. `Kernel.ts` ist in diesem Paket **Beweismittel**, nie
    Ziel.

- Verify: Kein Test kann eine Doku-Zeile prüfen. Die Prüfung sind die vier Instrumente aus 12b,
  12d und 12c, hier auf die Creation-API- und die Registry-Schicht angewendet, und sie wird
  schriftlich festgehalten.

  1. **Signaturen gegen die emittierten Deklarationen, in beide Richtungen.**
     `pnpm -F @spearwolf/shadow-objects build`, dann gegen
     `packages/shadow-objects/dist/src/types.d.ts` (Interface `ShadowObjectCreationAPI`,
     **17 Member**, am 2026-08-17 ausgezählt), `dist/src/in-the-dark/Registry.d.ts`
     (**9 öffentliche Member**: `static get`, `define`, `appendRoute`, `clearRoute`,
     `findTokensByRoute`, `findConstructors`, `hasToken`, `hasRoute`, `clear`) und, für die
     signalize-Primitive, gegen
     `node_modules/.pnpm/@spearwolf+signalize@1.0.0-beta.0*/node_modules/@spearwolf/signalize/lib/{create-signal,create-memo,effects}.d.ts`.
     **Kein Member ohne Doku-Zeile, keine Doku-Zeile ohne Member.** Die zweite Richtung ist die,
     die C-9 sichtbar macht.
  2. **Verhalten messen, nicht behaupten — in `vitest`, im Kernpaket, mit happy-dom.** Eine
     Wegwerf-Spec unter `packages/shadow-objects/src/`, danach entfernen; `git status --porcelain`
     zeigt am Ende nur die zwei bekannten untracked Dateien. Der Planer hat diese Sonde am
     2026-08-17 gefahren; sie ist **nachzubauen, nicht abzuschreiben**. Die Fälle mit ihrem
     gemessenen Ergebnis:
     - `new Registry()` mit `appendRoute('page', ['header','footer'])` und
       `appendRoute('header', ['menu','logo'])` → `findTokensByRoute('page')` ist
       **`['page','header','footer','menu','logo']`** (R-1).
     - `createSignal(0)` als Funktion aufrufen → **`TypeError: count is not a function`** (C-1).
     - `count.set(c => c + 1)` → `typeof count.value === 'function'` (C-12, unverändert lassen).
     - `createEffect(fn, [a])` → nach der Erzeugung 0 Läufe; `b.set(…)` (im Rumpf gelesen, nicht
       gelistet) → weiterhin 0; `a.set(…)` → 1 (C-11, unverändert lassen). Dazu der offene Fall:
       frisch erzeugter Effekt mit Abhängigkeitsliste, sofort `effect.run()` — läuft er?
     - Ein Shadow Object über den Kernel anlegen und `createResource` mit einer Factory
       registrieren, die ihre `arguments.length` meldet → **0**; das Cleanup bekommt **1**; der
       Rückgabewert ist eine `Signal`-Instanz mit `.value` (C-2).
     - `useProperty('x', {compare: f1})` und danach `useProperty('x', {compare: f2})` → dasselbe
       Signal, Konsolenmeldung, `f2` wirkungslos (C-8). Dasselbe für `useContext`.
     - `importModule` mit einem Modul, das zweimal über `extends` erreichbar ist → eine Warnung,
       ein Import (R-4).
  3. **Jeden angefassten Codeblock mechanisch extrahieren und wörtlich ausführen.** Nicht gelesen,
     nicht nachvollzogen, nicht in eine Sonde übertragen: **abgeschrieben zählt als ungeprüft** —
     in 12d hat ein von Hand transkribierter Block ein `: any` bekommen, das den Fehler verdeckte.
     Ein Skript zieht die Fences aus der Datei, schreibt jeden Block unverändert in eine eigene
     Wegwerfdatei und ruft sie einzeln auf. **Je Block eine Datei, ein Aufruf, ein Exit-Code** —
     denn `tsc` erreicht bei einem Syntaxfehler die semantische Phase nicht, und ein `rc=0` über
     zusammengeklebte Schnipsel bedeutet nichts.
     Bestand für diesen Bereich, am 2026-08-17 maschinell gezählt: **27 Blöcke** in `:40`–`:566`
     (18 `typescript` in §Creation API, 8 `javascript` + 1 `html` in §Registry), dazu je einer in
     `best-practices.md` und `guides.md`. Drei Fallen, die der Planer beim Bau des Extraktors
     getreten hat und die im Detailplan stehen, damit es niemand zweimal tut:
     - **`tsc` 6.x braucht `--ignoreConfig`**, sobald Dateien auf der Kommandozeile stehen, sonst
       kommt nur `TS5112` zurück und **jeder** Block sieht rot aus. Der Planer hatte auf diesem Weg
       zuerst 49 von 49 »Fehlern«.
     - **Jede Blockdatei braucht ein `export {}`**, sonst ist sie ein Script und kollidiert mit den
       DOM-Globals: `const name = …` (`:157`) und `const stop = …` (`:244`) melden sonst `TS2451`,
       und dieses Rauschen verdeckt echte Funde.
     - Die Dateien müssen **innerhalb eines Pakets liegen, das `@spearwolf/shadow-objects` auflösen
       kann** (`packages/shadow-objects-testing/` hat es als Abhängigkeit) — sonst meldet jeder
       Import `TS2307` und der einzige echte `TS2307` des Laufs geht darin unter.
     Flags: `--target ES2022 --module ESNext --moduleResolution bundler --strict
     --verbatimModuleSyntax --skipLibCheck`. Jeder Block, der nicht grün wird, bekommt in der
     Verlaufszeile eine Zeile mit Grund: entweder berichtigt oder als **absichtlich unvollständig**
     benannt (Fragment ohne Import, Gegenbeispiel, Objektliteral-Ausschnitt). Ein unmarkierter
     durchgefallener Block ist ein roter Verify. Zur Größenordnung: In der Vorabmessung des Planers
     wurden über alle fünf Abschnitte 3 von 49 grün — der Rest ist ganz überwiegend fehlender
     Kontext, und genau das Aussortieren ist die Arbeit.
  4. **Zu jeder geänderten Aussage die Gegenstelle prüfen — und daran denken, dass die Gegenstelle
     selbst der Fehler sein kann.** 12c hat eine falsche Formulierung aus `cheat-sheet.md:6` als
     Vorlage genommen und an fünf weitere Stellen getragen; die Gegenstellen-Prüfung konnte das
     nicht fangen. Wer eine Gegenstelle als Vorlage benutzt, prüft **sie** zuerst am Code. Die
     Paare dieses Pakets, namentlich:

     | Aussage | `api-reference.md` | Gegenstelle |
     |---|---|---|
     | `options`-Typen der fünf Creation-API-Methoden | `:63`, `:106`, `:114`, `:120`, `:128` (unvollständig) | `cheat-sheet.md:62-67` (richtig, **Tabu**) |
     | Ein `Signal` ist nicht aufrufbar | `:144` (richtig) gegen `:207` (falsch) | `best-practices.md:317-318` (richtig), `README.md` (12c) |
     | `onDestroy` läuft auf zwei Wegen | `:353-361` | `cheat-sheet.md` nach 18, `Kernel.ts` |
     | Ein Token kann mehrere Konstruktoren tragen | `:440-452` (schweigt) | `:2059` — **Paket 19** |
     | Reihenfolge und Inhalt der Routenauflösung | `:517` (falsch) | `:2088-2089` — **Paket 19** |
     | `define` nimmt »function or class« | `:445` | `:1986` — **Paket 19**, Rückfrage |

     Vier der sechs Paare zeigen nach **Paket 19**. Sie werden hier **gemessen und notiert**, aber
     nur auf der eigenen Seite berichtigt; 19 zieht nach. Wer eine Aussage ändert und die
     Gegenstelle nicht findet, notiert das, statt es anzunehmen.
  5. **Die Suite darf sich nicht bewegen.**
     `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test` zeigt
     dieselben Zahlen wie nach Paket 18: `test:ci` **659**, e2e **402**,
     `find packages/shadow-objects/dist -type f | wc -l` = **198**, `lint` rc=0 mit den zwei
     bekannten `biome.json`-Infos. Ändert sich eine Zahl, hat jemand Code angefasst.
  6. `git diff --stat` zeigt **genau vier** Dateien: `api-reference.md`, `best-practices.md`,
     `guides.md`, die Paket-`CHANGELOG.md`. Kein `Backlog.md`, keine Datei unter `src/`.

- Commit: `docs(api): bring the creation api and registry reference in line with the code`
- Verlauf:
  - Zug 0 (2026-08-17, Planer 16): Die fünf Abschnitte selbst vermessen — **913 von 2190 Zeilen**,
    51 Codeblöcke (49 ts/js), nicht »rund 875 von 2193«; die Zeilenangaben aus Backlog §7.4 Punkt 23
    liegen um bis zu drei Zeilen daneben. **Erster Schritt beantwortet:** `### Namespacing and
    Contexts` (`:1805`–`:1842`) liegt zwar innerhalb von `## Web Components` und damit formal im
    Bereich von 12b, ist aber **nicht** gegen den Code gehalten worden — `:1835` importiert aus
    `@spearwolf/shadow-objects/view`, einem Subpfad, den die `exports`-Map nicht kennt; 12b hätte
    ihn beim Fahren des Blocks gesehen. Der Abschnitt geht an Paket 19.
    **Sieben Abweichungen in diesem Bereich gemessen, nicht gelesen:** die Routenauflösung liefert
    `['page','header','footer','menu','logo']` statt der dokumentierten Vierer-Liste; die
    `createResource`-Signatur stimmt in Factory-Arität, Cleanup-Arität und Rückgabetyp nicht;
    `createMemo(() => count() * 2)` wirft `TypeError: count is not a function` sechzig Zeilen unter
    der Zusage, ein `Signal` sei nicht aufrufbar; die `createSignal`-Überladung ohne Anfangswert
    setzt `params` in die erste Position; `options?` steht fünfmal ohne Typ, während der Cheat Sheet
    ihn seit 12d nennt; `onViewEvent` ist der einzige der 17 Interface-Member ohne Signaturzeile;
    das Attribut-Beispiel bei `:501` zeigt eine Property-Form, die es nicht gibt.
    **Zwei Planvermutungen selbst widerlegt:** `set()` mit einer Updater-Funktion und die
    Abhängigkeitsliste von `createEffect` stehen richtig da (beide gemessen) — sie stehen jetzt als
    »nicht anfassen« im Detailplan. **Paket geteilt**, die drei hinteren Abschnitte samt
    `ComponentMemory`-Schnitt laufen als **Paket 19**; Begründung oben. Tabu ausgeschrieben, drei
    Extraktor-Fallen dokumentiert. Eine Rückfrage vorgelegt (`ShadowObjectConstructor` gegen
    `ShadowObjectConstructorFunc`), sie hängt an Paket 19.

- **Zug 1–3 (2026-08-17): umgesetzt, reviewt, nachgebessert, committet als `eb97b31`.** Vier
  Dateien, kein Code, `dist/` bei 198. Verify vom Orchestrator selbst gefahren, zweimal (vor und
  nach der Nachbesserung), beide Male: lint rc=0 (zwei bekannte `biome.json`-Infos), typecheck ✓,
  `test:ci` **659** (349 + 309 + 1), e2e **402**. Die Nullprobe des Pakets hat gehalten.

**Blockbestand `api-reference.md` `:40`–`:600`: 27 Blöcke, 26 typprüfbar (1 `html`), unter der
protokollierten Prüfbedingung 20 grün / 6 rot.** Die Bedingung gehört zur Zahl: drei Blöcke
importieren Nachbarmodule, die es nur im Beispiel gibt (`./MyCounter.js`, `./Analytics.js` bei
`:449`, `./core-module.js` bei `:559`); sie werden gegen drei Stub-Module gefahren, die die
dokumentierte Form abbilden — eine Klasse und eine Funktion für `define`, ein
`ShadowObjectsModule` für `extends`. Ohne diese Stubs sind es 17 grün / 9 rot, mit `TS2307` an
genau diesen drei Stellen; das ist dieselbe Messung unter einer schwächeren Bedingung, kein
anderer Befund. Der Block bei `:198` ist unter beiden Bedingungen grün, sobald die Präambel `tick`
deklariert — er stand in einer Zwischenmessung nur deshalb rot, weil die `selfDeclared`-Heuristik
des Extraktors den Aufruf `setInterval(tick, 1000)` für eine eigene Bindung hielt; die Regex ist
korrigiert. **Die sechs roten Blöcke, jeder mit Grund:** `:477`, `:494`, `:509`, `:528`, `:542`
sind Objektliteral-Ausschnitte (`define: { … }`, `routes: { … }`), die für sich nicht geparst
werden können — absichtlich unvollständig, Punkt R-7; `:582` ist das `initialize`-Beispiel im
`javascript`-Fence, dessen Destrukturierung `{define, kernel, registry}` ohne Typannotation
`TS7031` gibt — gemessen: mit `export const shadowObjects: ShadowObjectsModule = {…}` annotiert
ist der Block grün, die dokumentierte Modulform stimmt also, die Meldung ist eine Eigenschaft des
JS-Fences unter `--strict`. Kein unmarkierter durchgefallener Block.

**Fünf Planbehauptungen widerlegt — der Plan irrte, der Implementierer nicht.** Vom Reviewer 16
jede einzeln nachgemessen, alle fünf zu seinen Gunsten entschieden:

1. **C-6 Gegenstelle gibt es nicht.** Der Plan behauptete, `cheat-sheet.md:62-67` nenne die
   `options`-Typen seit 12d und die zwei Dateien widersprächen sich an fünf Zeilen. Gemessen:
   `SignalValueOptions`, `ProvideContextOptions`, `CompareFunc`, `clearOnDestroy` und `compare`
   haben in **ganz `docs/`** null Treffer außerhalb der neuen Zeilen. Der Cheat Sheet schreibt
   `(name, options?)` ohne Typ. Es gab keinen Widerspruch, und es entsteht auch keiner: der Cheat
   Sheet ist weniger detailliert, nicht anders. Die Korrektur selbst trägt (`types.d.ts:80-84`),
   nur ihre Begründung nicht.
2. **`best-practices.md` fällt mit anderen Codes und braucht mehr Annotationen.** Erwartet waren
   `TS2345`/`TS2349` aus `never[]`; real fallen 2× `TS7034`, 2× `TS7005`, 5× `TS7006`, 4× `TS7053`
   — `const x = []` inferiert unter `noImplicitAny` kein `never[]`, `const signals = {}` kein
   `Record`. Acht Annotationen sind das Minimum, nicht drei. Der Reviewer hat die fünf
   Parameter-Annotationen einzeln gegen den Code gestellt: alle inhaltlich richtig.
3. **`guides.md:547` fällt nicht mit `TS17004`,** sondern mit `TS1005`/`TS1110`. Gleiche Ursache,
   `jsx` ist die richtige Marke — als `.tsx` parst der Block.
4. **C-11 geklärt, Doku-Zeile bleibt.** Ein frischer Effekt mit Abhängigkeitsliste läuft beim
   ersten `run()` (0 / 0 / **1** / 1 / 2 über die Messreihe); nur ein zweiter `run()` ohne
   Signaländerung tut nichts. Die Beobachtung des Planers betraf das Beispiel nie.
5. **C-10 gemessen, keine Doku-Zeile.** Beide Unsubscribe-Formen wirken; die Asymmetrie in
   `Kernel.ts:694-707` ist für einen Anwender nicht beobachtbar. Vom Reviewer mit einer
   Wiederanmeldung gegengeprüft.

**Zwei Reviewer-Auflagen, beide eingelöst.** (a) Der Signal-Cache war dreimal dokumentiert, bei
`provideContext`/`provideGlobalContext` aber nicht — ausgerechnet dort, wo ein zweiter Aufruf
Quelle und `compare` **ohne Konsolenmeldung** verwirft, während die drei Reader wenigstens loggen.
Nachgemessen und geschrieben. (b) Die Zahl der roten Blöcke war ohne ihre Bedingung protokolliert;
oben aufgelöst.

**Nebenbefunde**

- **Neuer Code-Befund, doku-seitig gelöst:** `types.d.ts:113` typt `emit(target: EventizedObject, …)`,
  während `EntityApi` (`Readonly<Pick<Entity, …>>`) die eventize-Marker `[NAMESPACE]` und
  `[__TEventsBrand]` nicht trägt. Das dokumentierte `emit(child, …)` warf `TS2769`; ein Cast
  bräuchte `as unknown as`. Zur Laufzeit funktioniert es — gemessen: `entity.children[0]` **ist**
  die echte Entity, ein späteres `emit` kommt an (im Konstruktor nicht, da hat das Kind noch keinen
  Listener). Gelöst wie bei `ShadowObjectConstructor` (Entscheidung vom 2026-08-17): Signatur
  berichtigt, Beispiel auf eventizes freies `emit` gezogen. Der Reviewer hat belegt, daß das kein
  Ausweichmanöver ist, sondern die Hausform derselben Doku — `concepts.md:403`,
  `cheat-sheet.md:207`, `guides.md:386/508/517` und `api-reference.md:769` machen es genauso, `:769`
  sagt es sogar als Regel. **Backlog:** `emit`-Ziel weiten oder `EntityApi` als `EventizedObject`
  führen. `cheat-sheet.md:182` zeigt dieselbe typseitig scheiternde Form — Tabu, gehört zur selben
  Zeile.
- **`clearOnDestroy` folgt dem Cache nicht.** Beim Nachmessen der Auflage (a) gefunden:
  `Kernel.ts:513`/`:554` werten `clearOnDestroy` **außerhalb** des `if (ctxProvider == null)`-Zweigs
  aus, also bei jedem Aufruf. Ein einziger Aufruf, der es auch nur per Vorgabe verlangt, hängt den
  Löscheintrag an — ein erster Aufruf mit `{clearOnDestroy: false}` schützt danach nichts mehr.
  Gegenprobiert: ohne den zweiten Aufruf bleibt der Wert stehen. In diesem Paket dokumentiert, nicht
  behoben (kein Code). **Backlog-Kandidat**, falls das Verhalten so nicht gewollt ist.
- **`createEffect` hat vier Überladungen, nicht zwei** (`EffectImpl.d.ts:106-109`). Die zwei
  fehlenden nehmen Namen statt Signalen und verlangen dafür `attach` mit einer `SignalGroup`. Vom
  Implementierer als dritter Aufzählungspunkt ergänzt, in der Hausform von `on` zwei Abschnitte
  weiter, statt die Überschrift zu entschärfen.
- `cheat-sheet.md:63` nennt den Parameter von `useProperties` `map`, `types.d.ts:85` und die
  Referenz nennen ihn `props`. **Backlog**, Cheat Sheet ist Tabu.
- `cheat-sheet.md:67` und `concepts.md:249` tragen denselben Namen. Beide Tabu.
- `api-reference.md:569` (12d-Gebiet) spricht von "Shadow Entity" — die Konventionen binden
  "Entity". **Backlog.**
- `ShadowObjectCreationAPI` wird im selben Abschnitt aus zwei Pfaden importiert (`:45` aus
  `@spearwolf/shadow-objects/shadow-objects.js`, `:302`/`:327` aus dem Hauptpfad). Beide lösen auf,
  beide Blöcke grün; `:302` ist 12c-Gebiet. Vorbestehend.
- `@spearwolf/eventize` ist eine gewöhnliche `dependency`, kein Peer — wer die Freifunktionen direkt
  importiert, braucht es unter pnpm im eigenen `package.json`. Gilt für alle sechs bestehenden
  Fundstellen gleichermaßen, keine Frage dieses Pakets.
- Die Deprecation-Warnungen bei `options`-als-Funktion sind modulweite Einmal-Flags
  (`Kernel.ts:61-65`): pro Prozess je genau einmal, unabhängig von der Zahl betroffener Shadow
  Objects.

**Folgen für Paket 19** — vier Gegenstellenpaare zeigen dorthin, hier nur gemessen: `:2088-2089`
muß dieselbe Routenauflösung sagen wie jetzt `:544` (Ausgangstoken enthalten, BFS-Reihenfolge, fünf
statt vier Token); `:2059` (ein Token trägt mehrere Konstruktoren) hat mit `:469` jetzt eine
Entsprechung; `:1986`/`:1964-1972` samt der `ShadowObjectConstructor`-Rückfrage bleibt offen —
§Registry sagt weiterhin "function or class", was für die **Modulform** stimmt (gemessen:
`define: {'counter': Klasse, 'analytics': Funktion}` typt gegen `ShadowObjectsModule`) und für
`shadowObjects.define()`/`registry.define()` nicht; und der `emit`-Typbefund oben. Der
`ComponentMemory`-Schnitt, der Rückverweis nach `guides.md` und alle Backlog-Zeilen liegen
unverändert bei 19. **Achtung Zeilennummern:** dieses Paket hat `api-reference.md` um **34**
Zeilen verlängert (2190 → 2224); alle `:1805`-und-später-Angaben im Plan für Paket 19 sind
entsprechend versetzt. Es gilt der Text, nicht die Zahl.
*(Korrektur vom 2026-08-17, Planer 19: hier stand »44 Zeilen (+72/-28)«. `+72/-28` ist die
Balkenbreite von `git diff --stat`, keine Zeilenzahl — `git show --stat eb97b31` weist für diese
Datei 53 insertions / 19 deletions aus. Zweifach gegengeprüft: der Gloss von `:1451` steht jetzt
bei `:1485`, die Ereignistabelle von `:1616` bei `:1650`. Fehler des Orchestrators.)*

- Hash: `eb97b31`

</details>

### [x] 18. onDestroy feuert, wenn ein Shadow Object die Menge verlässt

- Hash: `351ed86`
- Ergebnis: 2 Runden · Verify grün: lint rc=0, typecheck ✓, test:ci 659 (Kernpaket 349), e2e 402, `dist/` 198, kein »Errors«-Block
- **Der Defekt war eine Größenordnung breiter als gemeldet.** Nicht ein Callback hing am falschen Abbau, sondern alles, was die Creation API ausgegeben hat: 19 Registrierungs-Callsites plus 5 Signal-Maps, zusammen 24 Entsorgungskanäle — Links aus `useProperty`/`useContext`/`useParentContext`/`provideContext`, `createResource`-Cleanups, `createEffect`, `createSignal`, `createMemo`, `on`, `once`, `onViewEvent`. Gemessen: Eine `on()`-Subscription feuerte nach dem Abgang aus der Menge **weiter**. Der Fix repariert deshalb nicht den Callback, sondern macht den ganzen Teardown von `destroyShadowObject` aus erreichbar.
- Nachweis: Sechs von sieben Tests vor dem Fix rot. Der Reviewer hat den Defekt gegen den nachgebauten Vorzustand reproduziert und den Umfang mit einer eigenen 15-Fall-Sonde nachgemessen — vier verschiedene Registrierungsarten einzeln, je Vorzustand rot und Fix grün. Die Signal-Maps über vier Ein- und Austritte: **Wachstum 0/0**.
- **Ein Leck in der Gegenrichtung, vom Reviewer mit `--expose-gc` und `WeakRef` gefunden:** Der `WeakMap`-Eintrag wurde nie gelöscht und kettete die Entity an ein totes Shadow Object. Eine Zeile schließt das — und hat dabei das `isTornDown`-Flag arbeitslos gemacht, weil der reentrante Pfad den Eintrag nicht mehr findet. Das Flag ist entfernt, wie schon in Paket 15 ein unerreichbar gewordener Guard. Der Reviewer hat die Streichung angegriffen und belegt, warum sie trägt: Ein `off()` aus einem laufenden `emit` heraus streicht in eventize einen später einsortierten Listener **sofort**, es gibt keinen Snapshot der Listenerliste. Danach trägt jede verbliebene Zeile genau einen roten Test, keine deckt mehr eine andere.
- Für den GC-Nachweis gibt es keinen Wächter — er bräuchte `--expose-gc` samt `poolOptions.execArgv` und wäre flaky. Die Begründung steht im Kommentar. Beide Leck-Hälften haben aber einen nicht-flakigen Stellvertreter, weil sie sich auch korrektheitsseitig verraten.
- Nebenbefunde: `destroyShadowObject` emittiert `onDestroy` auf dem Shadow Object, `destroyEntity` nicht — wer per `on(shadowObject, onDestroy, …)` lauscht, hört den Abgang, nicht den Tod der Entity. · `destroyShadowObject` ist selbst nicht idempotent; nur der Teardown ist geschützt. · Drei Backlog-Zeilenangaben zeigen ins Leere (`LOW-1`, `LOW-2`), vorbestehend. · `onDestroy` trägt weiterhin drei Bedeutungen — Symbol-Methode, Ereignisname, API-Callback.
- Folgen: Für Paket 16 die Anregung, `#### onDestroy(callback)` um einen Satz zu den zwei Abbau-Pfaden zu ergänzen; der Abschnitt liegt in seinem Gebiet.

- Findings: — (Fund des Implementierers 12c, außerhalb des Audit-Umfangs, vom Nutzer am 2026-08-17 in den Lauf geholt)
- Ziel: Aufräumarbeit, die ein Anwender über die Creation-API registriert, läuft auch dann, wenn sein Shadow Object durch einen Token- oder Route-Wechsel abgebaut wird — nicht erst am Abbau der Entity.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.ts`, dazu Tests im Kernpaket und ein Eintrag in `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: —
- Modell: stärkste Stufe
- Sachverhalt, in Chromium gemessen: Registry `define: {a: A, b: B}`, `routes: {'@flag': ['b']}`. Eine truthy Property zieht B hinzu, eine falsy nimmt es wieder weg. `findShadowObjects` fällt von 2 auf 1, der `destroys`-Zähler von B bleibt bei **0**. Ursache: `Kernel.ts:731-733` hängt den Callback in `unsubscribePrimary`, das nur an `once(entry.entity, onDestroy, …)` (`:741`) läuft; `destroyShadowObject` (`:833-841`) emittiert `onDestroy` auf dem Shadow Object und erreicht damit eine Klassenmethode `[onDestroy]`, aber keinen per API registrierten Callback.
- Abgrenzung: Der Abbau der Entity bleibt, wie er ist — dort feuert der Callback bereits. Der Fix darf ihn nicht doppelt auslösen; ein Wächter dafür gehört dazu.
- Hinweis: Zuerst der rote Test. Und ein zweiter Fall für die Grenze, die Paket 12c gemessen hat: verlässt ein Konstruktor die Menge und betritt sie wieder, läuft das Shadow Object erneut — dann muss auch sein `onDestroy` genau einmal gelaufen sein.

### [x] 19. Kernel, Namespacing und Advanced gegen den Code stellen — und ComponentMemory schneiden

- **Herausgelöst am 2026-08-17 (Planer 16)** aus Paket 16. Begründung im Detailplan von 16: die zwei
  Hälften belegen sich nicht gleich (Reaktivitätssemantik gegen Oberflächenvollständigkeit), 913
  Zeilen und 49 Blöcke sind mehr als jedes Doku-Paket dieses Laufs einzeln hatte, und die einzige
  Codeänderung des Restlaufs steht so allein und wird einzeln belegt. Nummern werden nie neu
  vergeben; die Reihenfolge ist 18 → 16 → 19. Es ist das letzte Paket des Laufs.

- Findings: — (Nutzerentscheidung vom 2026-08-17; außerhalb des Audit-Umfangs)
- Ziel: `### Namespacing and Contexts`, §Kernel und §Advanced sagen, was der Code tut — und der
  Laufzeit-Re-Export von `ComponentMemory` aus `index.ts` fällt.
- Bereich: `packages/shadow-objects/docs/api-reference.md` `### Namespacing and Contexts`
  (`:1805`–`:1842`), §Kernel (`:1843`–`:1952`), §Advanced (`:1953`–`:2190`) — **386 von 2190
  Zeilen**, 24 Codeblöcke, am 2026-08-17 vom Planer 16 selbst vermessen · dazu **eine einzelne Zeile
  in `#### Driving the Lookup by Hand`** (der Rückverweis, siehe Schritt 5) ·
  `packages/shadow-objects/src/index.ts` (**eine** Zeile), `packages/shadow-objects/CHANGELOG.md`
  und `Backlog.md` (zwei Streichungen samt Neunumerierung von §7)
- Hängt ab von: Paket 16 (beide fassen `api-reference.md` an, also strikt nacheinander; vier
  Gegenstellen-Paare aus 16 zeigen hierher) und Paket 17 (das die zwei zu streichenden
  Backlog-Zeilen angelegt hat)
- Modell: **stärkste Stufe.** §Kernel führt 8 von 17 öffentlichen Methoden, und der `dist/`-Schnitt
  ist eine Breaking Change an der öffentlichen Oberfläche.

<details>
<summary>Detailplan Paket 19</summary>

**Zuerst: die Zeilennummern im Kopf dieses Abschnitts sind falsch.** Paket 16 hat
`api-reference.md` nicht um 44, sondern um **34** Zeilen verlängert (`git show --stat eb97b31`:
`53 insertions(+), 19 deletions(-)` in dieser Datei; 2190 → **2224**). Zweifach gegengeprüft:
der Gloss, der vorher bei `:1451` stand, steht jetzt bei `:1485`; die Ereignistabelle von `:1616`
bei `:1650`. Die »+72/-28« der Folgenzeile von 16 sind die Diff-Balkenbreite, keine Zeilenzahl.
**Es gilt der Text, nicht die Zahl** — jede Angabe unten ist am 2026-08-17 gegen `eb97b31`
frisch gemessen.

**Jede Aussage wird am Code belegt, nicht an diesem Plan.** Nicht am CHANGELOG, nicht an einer
anderen Doku-Datei, nicht an einem JSDoc — der beschreibt eine Absicht, die Signatur die
Oberfläche. Drei Regeln, die dieser Lauf teuer gelernt hat:

1. **Abgeschrieben zählt als ungeprüft.** In 12d hat ein von Hand transkribierter Block ein
   `: any` bekommen, das den Fehler maskierte. Nur maschinelle, wörtliche Extraktion zählt.
2. **Grün ohne Kontext ist wertlos.** Ein Block, der nur typprüft, weil alle Bezeichner implizit
   `any` sind, belegt nichts. Die Präambel führt echte Typen ein, und der Beleg dafür ist eine
   **Mutation**: die alte, falsche Form muss rot werden. Vier Mutationsproben stehen unter
   Verify 3.
3. **Anhaltepflicht.** Findet der Implementierer eine Planaussage am Code nicht wieder, setzt er
   sie **nicht** sinngemäß um. Er hält an, notiert Fundstelle und Messung und entscheidet neu.
   Bilanz: 12b vier widerlegte Planbehauptungen, 12d zwei, 12c fünf, 17 sieben, 16 fünf. Der
   Planer dieses Pakets hat in Zug 0 **vier** widerlegt, drei davon aus dem bisherigen Text
   dieses Abschnitts (K-4, A-6, und die Verify-Probe zu `ComponentState`).

---

**Die Bereiche selbst nachgemessen** (2026-08-17, Planer 19, `api-reference.md` hat **2224**
Zeilen). Gegen die `^## `/`^### `-Überschriften und die Fences gezogen, maschinell:

| Abschnitt | Zeilen | Umfang | Codeblöcke |
|---|---|---|---|
| `### Namespacing and Contexts` | `:1839`–`:1876` | 38 | 2 (1 `html`, 1 `typescript`) |
| `## Kernel (ECS System Runner)` | `:1877`–`:1986` | 110 | 9 (alle `typescript`) |
| `## Advanced` | `:1987`–`:2224` | 238 | 13 (alle `typescript`) |
| **zusammen** | `:1839`–`:2224` | **386 von 2224** | **24, davon 23 typprüfbar** |

Blockanfänge: `:1851 :1868 :1883 :1907 :1919 :1927 :1935 :1944 :1953 :1962 :1976 :1995 :2007
:2025 :2044 :2084 :2095 :2104 :2113 :2121 :2146 :2164 :2206 :2213`.

**Nicht geteilt, und das ist eine Entscheidung, keine Bequemlichkeit.** 386 Zeilen und 24 Blöcke
sind weniger als Paket 16 (527/27), 12d (~500/27) und 12c (52 Blöcke). Vor allem aber gilt das
Teilungsargument von 16 hier **umgekehrt**: dort belegten sich die zwei Hälften nicht gleich
(Reaktivitätssemantik gegen Oberflächenvollständigkeit), hier fallen **alle** Befunde über
dieselben zwei Instrumente — Instrument 1 (die `.d.ts` auszählen: K-1 zu `Kernel`, A-5 zu
`Registry`, A-1 zu `ConsoleLogger`) und Instrument 3 (den Block fahren: 9 von 23 sind rot, jeder
mit Namen). Eine Teilung risse zudem die `Registry`-Oberfläche ein drittes Mal auseinander —
§Registry liegt bei 16, die `Registry`-Klasse liegt hier. Der `ComponentMemory`-Schnitt hängt an
keinem der zwei Teile und würde in beiden gleich fremd stehen.

---

- **Dateien:** `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/src/index.ts` (**eine** Zeile),
  `packages/shadow-objects/CHANGELOG.md`, `Backlog.md` — **vier Dateien, keine weitere.**

---

- **Vorgehen:**

  1. **`### Namespacing and Contexts` (`:1839`–`:1876`) — ein harter Fehler, eine Dreifachung,
     eine bestätigte Zusage.** *(Instrument 1 + 3 für N-1, Instrument 2 für N-3,
     Instrument 4 für N-2.)*

     - **N-1 `:1869` — der Importpfad existiert nicht.**
       `import { ComponentContext } from '@spearwolf/shadow-objects/view';` Die `exports`-Map
       kennt genau neun Einträge — `.`, `./elements.js`, `./bundle.js`,
       `./shadow-objects.worker.js`, `./shadow-objects.js`, `./shae-ent.js`, `./shae-prop.js`,
       `./shae-worker.js`, `./ConsoleLogger.js` — **kein `./view`**. Zweifach gemessen: Node
       `ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './view' is not defined by "exports"`,
       `tsc` `TS2307`. **Der Ersatz ist gemessen, nicht geraten:**
       `'@spearwolf/shadow-objects'` — Block grün, `ComponentContext` ist dort ein `function`.
       Dieselbe Familie wie `getting-started.md:37`, die 12c behoben hat.
     - **N-2 — der Abschnitt erzählt zum dritten Mal dieselbe Sache.** `## ComponentContext` →
       `### Namespacing` (`:1036`–`:1062`, **12d, Tabu**) nennt seit 12d `GlobalNS` und
       `toNamespace` mit einer Tabelle und einem laufenden Beispiel; die `ns`-Zeile der
       `<shae-ent>`-Attributtabelle (`:1485`, **12b, Tabu**) sagt, wofür das Attribut da ist.
       Hier steht »Default Global Context« ohne Konstante, ohne Verweis, ohne Normalisierungsregel.
       Der Abschnitt hat trotzdem eine eigene Aufgabe: er ist die **deklarative** Sicht — zwei
       Umgebungen als Markup nebeneinander. **Vorschlag, am Text der zwei Gegenstellen zu prüfen,
       bevor eine Zeile fällt:** die zwei `####`-Unterabschnitte bleiben knapp, die
       Normalisierungsregeln werden **nicht** wiederholt, sondern verlinkt. **Keine** Zeile in
       `:1036`ff oder `:1485` wird angefasst.
     - **N-3 — die Zusage des Abschnitts trägt, gemessen.** In happy-dom:
       `ComponentContext.get('world-A') !== get('world-B') !== get()`, jeder Aufruf mit demselben
       Namen gibt dieselbe Instanz, `get().ns === GlobalNS`, die Kontextkarte steht danach auf 3.
       Der `html`-Block `:1851`–`:1864` bildet genau das ab. **Nicht anfassen** — steht hier,
       damit niemand »präzisiert«. Die Elementseite (`ns`-Attribut, Zeitpunkt der Bindung) gehört
       12b und ist Tabu.
     - **N-4 — Zuständigkeit, damit sie nicht zweimal geklärt wird.** Der Abschnitt liegt als
       `###` innerhalb von `## Web Components` und damit formal bei 12b. Der Beleg, dass 12b ihn
       nicht gegen den Code gehalten hat, ist N-1: beim Fahren des Blocks wäre er aufgefallen.
       Dieses Paket nimmt ihn; alles andere unter `## Web Components` bleibt Tabu.

  2. **`## Kernel` (`:1877`–`:1986`) — 8 von 17 Methoden, vier rote Blöcke, ein Beispiel, das
     unter Node stirbt.** *(Instrument 1 für K-1/K-3, Instrument 2 für K-2/K-4/K-5/K-6/K-8,
     Instrument 3 für K-7/K-9/K-10.)*

     - **K-1 — die Methodenliste ist unvollständig, und zwar um neun.**
       `dist/src/in-the-dark/Kernel.d.ts` führt öffentlich: `getEntity`, `hasEntity`,
       `traverseLevelOrderBFS`, `getEntityGraph`, `upgradeEntities`, `run`, `createEntity`,
       `destroyEntity`, `setParent`, `updateOrder`, `dispatchEventsToEntity`, `changeProperties`,
       `changeToken`, `dispatchMessageToView`, `findShadowObjects`, `findOrCreateRootContext`,
       `destroy` — **17 plus `constructor(registry?)`**. Gegenprobe zur Laufzeit:
       `Object.getOwnPropertyNames(Kernel.prototype)` ohne `constructor` ergibt **24** = 17
       öffentliche + 7 als `private` deklarierte (`getEntityGraphNode`, `parse`,
       `updateShadowObjects`, `constructShadowObject`, `createShadowObjects`,
       `attachShadowObject`, `destroyShadowObject`). Dokumentiert sind **acht**. Es fehlen
       **neun**: `createEntity`, `destroyEntity`, `setParent`, `updateOrder`,
       `dispatchEventsToEntity`, `changeProperties`, `changeToken`, `dispatchMessageToView`,
       `findOrCreateRootContext`. Acht davon sind die **Schreibseite des Change Trail** — sie
       gehören unter einen gemeinsamen Einleitungssatz mit je einer Signatur und einem Satz,
       nicht unter je einen Absatz. `findOrCreateRootContext` gehört nicht dazu und steht für
       sich. Vorlage ist §ComponentContext, das 12d aus derselben Lage gebaut hat (5 von 33).
       Die Signaturen werden aus der `.d.ts` übernommen, nicht aus `Kernel.ts` — `setParent`
       trägt dort einen JSDoc-Absatz, der in die Beschreibung gehört (ein fehlender `order` ist
       kein Reset auf `0`).
     - **K-2 `:1915`–`:1921` — `getEntity(uuid)` wirft.** Gemessen:
       `Error: entity with uuid "abc-123" not found!` (`Kernel.ts:108-125`, `#requireEntry`,
       dessen JSDoc die Entscheidung begründet). Die Doku sagt »Retrieves an Entity by UUID«,
       nennt keine Signatur, und das Beispiel weist das Ergebnis einer Variablen zu, als könne es
       `undefined` sein. Der Rückgabetyp ist `Entity`, nie `undefined`. Der Weg für den
       vorsichtigen Aufrufer heißt `hasEntity` und steht eine Überschrift weiter — das gehört in
       denselben Satz.
     - **K-3 `:1896`–`:1899` — die Properties-Tabelle nennt keine Modifikatoren.** `registry` ist
       **schreibbar** (`Kernel.ts:75`, in der `.d.ts` ohne `readonly`) — gemessen: die Zuweisung
       greift, und `upgradeEntities()` daneben ist der Griff, der sie wirksam macht. `logger` ist
       `readonly`. **Feinheit, gemessen:** `readonly` ist eine Typzusage, keine Laufzeitsperre —
       eine Zuweisung an `logger` wirft nicht. Das ist normales TypeScript und **keine** Doku-Zeile
       wert; es steht hier, damit niemand eine schreibt.
     - **K-4 `:1931`–`:1938` — der Rückgabewert ist der Cache des Kernels, keine Kopie.**
       `Kernel.ts:163` (`return reverse ? this.#allEntitiesReversed : this.#allEntities`).
       Gemessen: zwei Aufrufe geben dieselbe Instanz; nach `result.push(x)` gibt der nächste
       Aufruf **6** statt 5 Einträge. Wer das Ergebnis an Ort und Stelle sortiert oder splittet,
       ändert den Kernel. Ein Halbsatz.
       **Die Vermutung des bisherigen Plantexts zum Wald ist widerlegt.** Behauptet war,
       »leaves to root« gelte für einen Wald mit ungleich tiefen Zweigen nicht. Gemessen an zwei
       Bäumen (`a→a1→a11`, `b→b1`): vorwärts `a,b,a1,b1,a11`, rückwärts `a11,b1,a1,b,a`. Weil die
       Tiefe entlang jeder Eltern-Kind-Kante strikt wächst, steht in der Umkehrung **jede** Entity
       vor ihren Vorfahren — auch im Wald. Die vorhandene Formulierung stimmt. **Nicht anfassen.**
     - **K-5 `:1940`–`:1947` — `getEntityGraph()` ist nicht »the complete Entity tree«.** Er
       startet bei den Wurzel-Entities (`Kernel.ts:167-172`); ein Knoten, den der Kernel nicht
       mehr hält, fällt aus dem Graphen (Kommentar im Code bei `getEntityGraphNode`). Gemessen:
       ein Wurzelknoten, Schlüssel `token,entity,props,children`. Und der Typ `EntityGraphNode`
       ist **nicht exportiert** (`Kernel.d.ts`, `interface` ohne `export`, Datei endet auf
       `export {}`) — `:2221` nennt ihn trotzdem als Typ eines Feldes. **Backlog-Zeile**, siehe
       Schritt 6.
     - **K-6 `:1949`–`:1956` — `upgradeEntities()` fasst die Schnittmenge nicht an.** Der Ablauf
       ist zweiphasig: erst `DestroyOnly` über den umgekehrten Baum, dann `JustCreate` über den
       aufrechten (`Kernel.ts:186-203`). Gemessen mit einem Token, das erst `A`, dann `A`+`B`
       trägt: Protokoll `A:new | (define B, upgrade) | B:new`, **kein** `A:destroy`, **kein**
       zweites `A:new`, `findShadowObjects` danach 2. Ein Shadow Object, dessen Konstruktor
       vorher und nachher in der Menge steht, läuft **nicht** erneut. Genau diese Grenze hat 12c
       gemessen und in fünf Dateien nachgezogen; hier fehlt sie. Die Formulierung wird von dort
       übernommen, **nachdem** sie am Kernel geprüft ist — 12c hat sich an dieser Familie einmal
       eine falsche Vorlage eingefangen.
     - **K-7 `:1976`–`:1983` — die Ereignistabelle stimmt, der Import darunter nicht.**
       `Kernel.ts:388` ist das einzige `emit(this as Kernel, …)` der Datei; die zweite Richtung
       des Instruments wird trotzdem gefahren, statt das zu glauben. **Falsch ist `:1978`:**
       `import { MessageToView } from '@spearwolf/shadow-objects';` typprüft, stirbt aber in einer
       reinen Node-Umgebung mit **`ReferenceError: HTMLElement is not defined`** — der Wurzel-Entry
       zieht die Custom Elements mit, und ein Kernel-Beispiel steht auf der
       Shadow-Environment-Seite, also im Worker. **Der Ersatz ist gemessen:**
       `@spearwolf/shadow-objects/shadow-objects.js` lädt unter Node durch,
       `MessageToView === 'messageToView'`. Dieselbe Familie wie die Zeile, die 12c behoben hat.
     - **K-8 — eine Vermutung, am Code widerlegt, damit sie niemand zweimal aufstellt.**
       `JSON.stringify(kernel.getEntityGraph(), null, 2)` (`:1946` und `:2223`) wirft **nicht**;
       die Erwartung eines Zirkelverweises über `node.entity.parent` trägt nicht, weil `Entity`
       seinen Zustand in privaten Feldern hält. **Der ehrliche Befund ist ein anderer und ist
       gemessen:** das `entity`-Feld jedes Knotens landet als `{}` im Ausdruck —
       `{"token":"root-token","entity":{},"props":{"hp":42},"children":[…]}`. Das Beispiel bei
       `:2213`–`:2224` verspricht in seinem Kommentar `entity: Entity` und liefert im Ausdruck
       ein leeres Objekt. Ein Halbsatz an genau dieser Stelle, nicht zweimal.
     - **K-9 `:1907`–`:1913` und `:1927`–`:1929` — literale `...` im Code.** Gemessen: `TS1109`
       beziehungsweise `TS1128`. **Der Parserfehler verdeckt einen zweiten Mangel:** `:1910`
       benutzt `ComponentChangeType` ohne Import, aber `tsc` erreicht die semantische Phase nie
       und sagt es nicht. **Beide sind lauffähig zu machen, und der Weg ist gemessen** — beide
       Ersatzformen sind rc=0: `ComponentChangeType` (Wert) und `SyncEvent` (Typ) sind beide über
       `@spearwolf/shadow-objects/shadow-objects.js` erreichbar, ein vollständiger `SyncEvent` mit
       einem `CreateEntities`-Eintrag typprüft; und `if (kernel.hasEntity(…)) { … }` wird grün,
       sobald im Rumpf eine echte Anweisung steht.
     - **K-10 `:1883`–`:1892` — der Einführungsblock deklariert `const kernel` zweimal.**
       Gemessen: `TS2451`, zweimal. Als Codeblock abgetippt kompiliert er nicht. **Gemessene
       Korrektur:** die zweite Bindung bekommt einen eigenen Namen — Block rc=0.
     - **K-11 `:1963` — dritte Bedeutung von `shadowObjects`, neu gefunden.** Das
       `findShadowObjects`-Beispiel schreibt
       `const shadowObjects = kernel.findShadowObjects('abc-123');` und verschattet damit genau
       den Namen, den §Advanced sieben Zeilen später als Helferobjekt importiert und den der
       Loader als Modulexport liest. Drei Bedeutungen, ein Bezeichner, zwei davon in Sichtweite.
       Die lokale Variable bekommt einen anderen Namen; das kostet eine Zeile und nimmt A-4 die
       Hälfte seiner Arbeit ab.

  3. **`## Advanced` (`:1987`–`:2224`) — ein `TS2345`, fünf `TS7006`, zwei Zeilen, die ins Leere
     greifen, und eine fehlende Methode.** *(Instrument 1 für A-5/A-1, Instrument 2 für
     A-6/A-7/A-8/A-11/A-12, Instrument 3 für A-2/A-3/A-10, Instrument 4 für A-9.)*

     - **A-1 `:2206`–`:2209` §Console Logger — beide Zeilen greifen ins Leere, und die Korrektur
       ist mehr als zwei Namen.** Gemessen: `kernel.logger.enabled = true` gibt `TS2551`
       (»Property 'enabled' does not exist on type 'ConsoleLogger'. Did you mean 'enable'?«),
       `kernel.logger.logLevel = 'debug'` gibt `TS2339`; zur Laufzeit sind beide Felder
       `undefined`. **Der wirkliche Mechanismus, an der Klasse gelesen und gemessen:**
       es gibt keine Stufe als String, sondern vier unabhängige Schalter in
       `ConsoleLogger.sharedConfig` (`enable`, `debug`, `info`, `warn`, dazu vier `styles.*`),
       eine Instanz-Flagge `logger.enable` (Vorgabe `true`), und die vier Getter
       `isEnabled`/`isDebug`/`isInfo`/`isWarn`, die beide Seiten verunden. `sharedConfig.enable`
       steht per Vorgabe auf `IS_LOCALHOST`. **Und die Falle:** `#print` prüft **keinen** dieser
       Getter — `logger.debug(…)` druckt immer; die Prüfung liegt bei der Aufrufstelle
       (`Kernel.ts` schreibt `if (this.logger.isDebug) this.logger.debug(…)`). Wo eine benutzbare
       Storage vorhanden ist, hängt `loadConfig()` zusätzlich ein lebendes Konfigurationsobjekt
       unter `globalThis.ConsoleLogger` ein, dessen Setter nach `localStorage` durchschreiben —
       das ist der Weg, den ein Anwender in der Browserkonsole tatsächlich geht. Der
       Implementierer schreibt hin, was schaltet, statt zwei Namen zu korrigieren.
     - **A-2 `:1995`–`:2003` und `:2020` — der `TS2345`, und was die Kopfentscheidung konkret
       heißt.** Gemessen:
       `({useProperty, createEffect}: ShadowObjectCreationAPI) => void` ist nicht auf
       `ShadowObjectConstructor` zuweisbar (»provides no match for the signature
       `new (params: ShadowObjectCreationAPI): {}`«). Zur Laufzeit funktioniert eine Funktion
       trotzdem, weil `Kernel.ts:463` sie mit `new` ruft — der Typ ist enger als das Verhalten.
       **Die Entscheidung steht im Plankopf (2026-08-17, Orchestrator) und wird nicht neu
       verhandelt:** `ShadowObjectConstructor` wird **nicht** geweitet, gelöst wird doku-seitig,
       die Signaturweitung geht als Backlog-Zeile. Was das hier konkret heißt, an beiden Stellen
       gemessen:
       - `:473` in §Registry (»A Shadow Object definition (function or class)«) ist **richtig für
         seinen Zusammenhang** und **Tabu** — die Modulform `define: {…}` nimmt
         `ShadowObjectConstructor | ShadowObjectConstructorFunc` (Paket 16 hat das mit
         `define: {'counter': Klasse, 'analytics': Funktion}` typseitig belegt).
       - `:2020` (»A function or class«) ist **falsch** — `shadowObjects.define()` und
         `registry.define()` nehmen nur `ShadowObjectConstructor`. Die Tabellenzeile sagt, was der
         Typ verlangt, und ein Satz hält die zwei Formen auseinander.
       - Das Beispiel `:1998`–`:2002` zieht auf eine Klasse. **Gemessen: rc=0.**
     - **A-3 `:2044`–`:2067` und `:2164`–`:2198` — zwei vollständige Klassenbeispiele, die nicht
       kompilieren.** Gemessen: `TS7006` **zweimal** im ersten (`[onCreate]`, `[onDestroy]`) und
       **dreimal** im zweiten (`[onCreate]`, `[onDestroy]`, `[onParentChanged]`; `[onViewEvent]`
       ist bereits annotiert) — **fünf, nicht vier**. Beide Blöcke haben Importe und `implements`,
       sind also keine Fragmente. **Der Ausweg ist gemessen, nicht geraten:**
       `[onCreate](entity: EntityApi)` erfüllt `implements OnCreate` (Methodenparameter sind
       bivariant) und beide Blöcke werden rc=0, sobald `EntityApi` mit
       `import type { EntityApi } from '@spearwolf/shadow-objects/shadow-objects.js';` dazukommt.
       **Der Grund, warum das nötig ist, ist ein eigener Befund:** die vier Lebenszyklus-Interfaces
       sind über `Entity` typisiert (`in-the-dark/events.d.ts`), und **`Entity` ist aus keinem
       Entry exportiert** — `dist/src/index.d.ts` und `dist/src/shadow-objects.d.ts` führen
       `in-the-dark/Entity.js` nicht. Ein Konsument kann den Typ, den die Interfaces verlangen,
       nicht benennen. Das ist eine API-Frage und geht als **Backlog-Zeile**, nicht in dieses Paket.
     - **A-4 — der Name `shadowObjects` trägt drei Bedeutungen.** Der benannte Modulexport, den
       der Loader liest (von 12c in zehn Beispielen richtiggestellt); das Helferobjekt aus
       `in-the-dark/ShadowObject.ts:31-35` (gemessen: genau ein Schlüssel `define`, Arität 3); und
       die lokale Variable bei `:1963` (K-11). Fundstellen der zweiten Bedeutung, am 2026-08-17
       maschinell erhoben: `:1991`, `:1996`, `:2002`, `:2008`, `:2028`, `:2034`, `:2138` — sieben,
       dazu `:1954` in §Kernel. **Der Implementierer zählt neu, statt diese Liste zu übernehmen.**
       Ein Satz am Anfang von `#### shadowObjects.define()`, der die zwei auseinanderhält, und ein
       Verweis auf §Registry. Ohne ihn liest ein Anwender `shadowObjects.define('my-token',
       MyLogic)` als etwas, das er in sein Registry-Modul schreibt.
     - **A-5 — `registry.findTokensByRoute(route, truthyProps?)` fehlt ganz.** `Registry.d.ts`
       führt **neun** öffentliche Member: `static get`, `define`, `appendRoute`, `clearRoute`,
       `findTokensByRoute`, `findConstructors`, `hasToken`, `hasRoute`, `clear`. §Advanced führt
       sieben `####`-Überschriften plus `Registry.get()` im Block `:2084`–`:2089`, also acht.
       `findTokensByRoute` ist die Quelle der Auflösungsregel, die §Registry seit Paket 16 bei
       `:547`/`:550` beschreibt — wer sie dokumentiert, dokumentiert die Regel dort, wo sie
       entsteht. Rückgabetyp ist `Set<string>`, nicht `string[]`.
     - **A-6 `:2117`–`:2124` `registry.findConstructors` — zwei Punkte, und der dritte ist
       widerlegt.**
       - Der Parameter heißt im Code `route`, nicht `token` (`Registry.ts:123`, `.d.ts` ebenso).
       - Der Rückgabetyp ist `ShadowObjectConstructor[] | undefined`; gemessen gibt
         `findConstructors('nope')` **`undefined`** zurück (`Registry.ts:131`). Der Fall fehlt.
       - **Widerlegt:** der bisherige Plantext behauptete, der Kommentar
         `// Returns constructors for: game-object, physics, renderer, debug-overlay` mache
         dieselbe Reihenfolgenzusage, die §Registry bei `:517` gemessen falsch machte. Mit genau
         den Routen des Beispiels gemessen — `appendRoute('game-object', ['physics','renderer'])`,
         `appendRoute('@debug', ['debug-overlay'])`, `findConstructors('game-object',
         new Set(['debug']))` — kommt **`GameObject, Physics, Renderer, DebugOverlay`** heraus,
         Wort für Wort der dokumentierte Kommentar. Das Ausgangstoken ist enthalten, die
         Property-Route wird hinten angehängt. **Der Kommentar ist richtig und wird nicht
         angefasst** — er steht bereits im Einklang mit dem, was 16 bei `:550` geschrieben hat.
         Ohne `truthyProps` fällt `DebugOverlay` weg, nach `clearRoute('@debug')` ebenso; beides
         gemessen.
     - **A-7 `:2042`/`:2076` — der Dekorator gibt eine andere Klasse zurück, und die
       eventize-Zusage stimmt.** `ShadowObject.ts:12-25` erzeugt `class extends target`, ruft dort
       `eventize(this)` und registriert **die Unterklasse**. Gemessen: der Rückgabewert ist nicht
       dieselbe Klasse; `.name` geht von `Base` auf **`__ShadowObject`**; `displayName` ist
       `undefined`, obwohl der emittierte Typ ein optionales `displayName` verspricht;
       `instanceof Base` bleibt **true**; der in der Registry liegende Konstruktor ist die
       Unterklasse, nicht die dekorierte Klasse. Sichtbar wird das über `constructor.name` — in
       einem Log oder einer Fehlermeldung. Ein Halbsatz, mehr nicht.
       **Der Satz bei `:2076` ist gemessen richtig und bleibt:** die Instanz trägt nach der
       Konstruktion `Symbol(eventize)`, eine undekorierte Instanz derselben Basisklasse nicht.
       (Dass eventizes Freifunktionen auch auf einem beliebigen Objekt arbeiten, ändert daran
       nichts und ist keine Doku-Zeile dieses Abschnitts wert.)
     - **A-8 `:2155`–`:2160` — vier Symbole, zwei Mechanismen, und der Unterschied ist für einen
       Anwender sichtbar.** `onCreate` und `onDestroy` werden **direkt als Methode** auf dem
       Shadow Object gerufen (`Kernel.ts:860-861`, `:866-868`), beide synchron. `onViewEvent`
       kommt als eventize-Ereignis auf der **Entity** an und erreicht das Shadow Object, weil es
       als Listener-Objekt angemeldet ist (`on(entity, shadowObject)`, `Kernel.ts:856`) — ebenfalls
       synchron. **`onParentChanged` nicht:** `Kernel.ts:353-359` emittiert es in einem
       `queueMicrotask`. Gemessen: unmittelbar nach dem `SetParent`-Change steht im Protokoll nur
       `onCreate`; erst nach einer Microtask-Runde steht `onCreate | onParentChanged`. Ein Shadow
       Object darf sich also **nicht** darauf verlassen, dass `[onParentChanged]` gelaufen ist,
       wenn `kernel.run()` zurückkehrt. Das ist ein Satz wert, und zwar in der Tabellenzeile.
       **Auflage aus der Entscheidung vom 2026-08-17:** Trägt `Kernel.ts:353-359` einen Kommentar
       oder JSDoc, der die Verzögerung begründet, wird sie als Eigenschaft dokumentiert; steht sie
       unbegründet da, kommt zusätzlich eine Backlog-Zeile dazu. An der Fundstelle entscheiden.
     - **A-9 `:2158` — `onDestroy` heißt an drei Stellen dasselbe und meint dreierlei:** die
       Symbolmethode hier, der eventize-Ereignisname (`Kernel.ts:869`) und der
       Creation-API-Callback bei `:379`. Paket 16 hat bei `:383` bereits geschrieben, auf welchen
       zwei Wegen der Callback läuft. Hier genügt **ein Verweis**, damit die zwei Stellen
       nebeneinander lesbar sind. **Nicht** dieselbe Erklärung zweimal.
     - **A-10 `:2005`–`:2013` — der »Signature«-Block ist als `typescript` gefenced und ist
       keine.** Gemessen: `TS1005` ×2, `TS1109` ×2, `TS1005` — der Inhalt ist eine
       Signaturschreibweise, kein TypeScript. Der Rest der Datei schreibt Signaturen als
       `- **Signature:** \`…\``-Aufzählungspunkt, gemessen an **14** Fundstellen (`:63`, `:82`,
       `:110`, `:120`, `:127`, `:138`, `:220`, `:231`, `:271`, `:302`, `:324`, `:354`, `:385`,
       `:425`); `:2005` ist die einzige Ausnahme im ganzen Dokument. Angleichen. **Merke: damit
       fällt ein Block weg** — die Blockzahl geht von 24 auf 23, siehe Verify.
     - **A-11 `:2138` — »Calling this on the default registry removes everything … including for
       other environments«.** Am Code geprüft und gemessen **richtig**, und sogar stärker als
       geschrieben: `clear()` leert alle drei Karten einschließlich `#truthyPropRoutes`
       (`Registry.ts:142-146`), das modulweite `defaultRegistry` steht bei `:149`. Gemessen: nach
       `clear()` sind `hasToken`, `hasRoute` und die Property-Route weg. **Nicht anfassen;** steht
       hier, damit niemand »präzisiert«.
     - **A-12 `:2130`–`:2132` — neu gefunden: `hasRoute` sieht Property-Routen nicht.**
       Gemessen: nach `appendRoute('@debug', ['debug-overlay'])` — die Route wirkt, `@debug` zieht
       `debug-overlay` in die Auflösung — gibt `hasRoute('@debug')` **`false`** zurück.
       `Registry.ts:138-140` liest nur `#routes`, während `clearRoute` (`:71-78`) **beide** Karten
       bedient. »Checks if a route exists« ist für Property-Routen falsch. **Doku-seitig lösbar**
       (ein Halbsatz: `hasRoute` beantwortet nur Token-Routen), die Asymmetrie selbst ist eine
       Code-Frage und geht als **Backlog-Zeile** — so am 2026-08-17 vom Orchestrator entschieden,
       nach dem Muster der `ShadowObjectConstructor`-Entscheidung.
     - **Die neun Wertexporte bleiben draußen, und das ist begründet.** `ChangeTrailPhase`,
       `Configure`, `ChangeTrail`, `Destroy`, `Loaded`, `AppliedChangeTrail`, `ImportedModule`,
       `Destroyed`, `ShadowObjectsExport` sind Marken des **Worker-Transportprotokolls** zwischen
       `MessageRouter` und `WorkerRuntime` — kein Anwender schreibt sie von Hand, und §Advanced
       dokumentiert die Autorenseite des Shadow Environment, nicht die Leitung darunter. Der
       Backlog besitzt sie bereits als §7.4 Punkt 25 und stellt dort die richtige Frage: nicht
       *wie* sie dokumentiert werden, sondern **ob sie öffentlich sein sollen**. Das ist eine
       API-Entscheidung; sie in einem Doku-Paket zu beantworten, hieße sie festzuschreiben. Der
       Punkt bleibt stehen und wird bei der Neunumerierung in Schritt 6 mitgezogen.

  4. **Der `ComponentMemory`-Schnitt — eine Zeile, und sie wird belegt statt behauptet.**
     `packages/shadow-objects/src/index.ts:12` steht auf
     `export * from './view/ComponentMemory.js';`. **Die Änderung ist `export` → `export type`** —
     dieselbe Form, die `index.ts` bereits in den Zeilen 3, 9 und 13 benutzt.

     **Was der Schnitt bewirkt, ist ohne Experiment belegbar — die Pipeline hat drei
     Präzedenzfälle.** Gemessen am aktuellen Stand: `src/index.ts` hat **17** `export`-Zeilen,
     `dist/src/index.js` hat **14**, `dist/src/index.d.ts` hat **17**. Die drei fehlenden
     JS-Zeilen sind genau die drei vorhandenen `export type *`. Und `dist/src/elements/events.js`,
     `dist/src/types.js`, `dist/src/view/IShadowObjectEnvProxy.js` liegen trotzdem als `.js` unter
     `dist/` — der Transpile ist **dateimengen-**, nicht entry-graph-getrieben. Daraus folgt,
     nachprüfbar:
     - `dist/src/index.js` verliert die Zeile; `ComponentMemory` ist vom Wurzel-Entry aus zur
       Laufzeit nicht mehr erreichbar. **Das ist der Breaking Change, und es ist der einzige
       messbare Unterschied.**
     - `dist/src/index.d.ts` behält seine 17 Zeilen, die zwölfte als `export type *`;
       `ComponentState` bleibt über den Wurzel-Entry als Typ erreichbar.
     - **`dist/` bleibt bei 198 Dateien.** Wer eine andere Zahl misst, hat mehr geändert als eine
       Zeile.
     - `packages/shadow-objects/package.json` `sideEffects`: **gemessen, kein Eintrag zu
       `ComponentMemory`** in keiner der zwei Listen. Nichts zu tun. (Die toten
       `build/src/…`-Einträge sind Backlog §7.3 Punkt 18 und nicht Sache dieses Pakets.)
     - Konsumenten im Repo, gemessen: `ComponentContext.ts:6` (direkter Modulimport) und
       `ComponentMemory.spec.ts:4`. **Null** Treffer in `shadow-objects-testing`,
       `shae-offscreen-canvas`, `shadow-objects-e2e`. `test:ci` kann sich also nicht bewegen.

     **Der Zustand vor der Änderung ist gemessen und gehört ins Protokoll**, sonst ist die
     Nachher-Messung wertlos:

     | Probe | vorher | nachher (Erwartung) |
     |---|---|---|
     | `grep -c ComponentMemory dist/src/index.js` | **1** | **0** |
     | `grep -c ComponentMemory dist/src/index.d.ts` | **1** | **1** (Zeile wird `export type *`) |
     | `grep -c '^export type \*' dist/src/index.d.ts` | **3** | **4** |
     | `find packages/shadow-objects/dist -type f \| wc -l` | **198** | **198** |
     | `import type {ComponentState} from '@spearwolf/shadow-objects'` (tsc) | **rc=0** | **rc=0** |
     | `import {ComponentMemory} from '@spearwolf/shadow-objects'` (tsc) | **TS2305** | **TS2305** |
     | `(await import('@spearwolf/shadow-objects')).ComponentMemory` (happy-dom) | **`function`** | **`undefined`** |

     Die letzten drei Zeilen sind der eigentliche Beleg: der Schnitt ist **ein No-op für
     TypeScript-Konsumenten** (die Fehlermeldung `has no exported member 'ComponentMemory'` steht
     vorher wie nachher da — der Typ hat nie existiert) **und ein Breaking Change für
     Laufzeit-Konsumenten** (`function` → `undefined`). Beide Hälften gemessen, keine behauptet.
     Die Laufzeitprobe braucht happy-dom oder einen Browser — unter nacktem Node stirbt der
     Wurzel-Entry an `HTMLElement is not defined` (siehe K-7); eine Wegwerf-Spec im Kernpaket
     genügt und ist vom Planer so gefahren worden. **Vor der Änderung bauen, messen, ändern, neu
     bauen, erneut messen** — beide Zahlenreihen in die Verlaufszeile.

     **Kein Test, so am 2026-08-17 vom Orchestrator entschieden.** Das Prinzip des Laufs lautet:
     Bugfix heißt roter Test zuerst. Dies ist kein Bugfix — es gibt kein Fehlverhalten zu
     reproduzieren. Die Klasse funktioniert; sie ist lediglich an einer Stelle erreichbar, an der
     sie nie zugesagt war (`@internal` plus `stripInternal: true`). Ein »roter Test zuerst« wäre
     hier ein Wächter über die **neue** Oberfläche, kein Nachweis eines Defekts. Dagegen spricht
     zusätzlich: das Repo hat **keinen** Präzedenzfall für einen Export-Oberflächen-Wächter
     (gemessen: keine Spec im Kernpaket importiert das Paket unter seinem Namen), und das letzte
     Paket eines Laufs ist der falsche Ort, eine neue Testkonvention einzuführen. Der Beleg ist
     das Vorher/Nachher-Paar oben, gefahren und protokolliert.

     **Breaking Change, eigener Stichpunkt im Paket-CHANGELOG** unter `## [Unreleased]`, mit dem
     Was (der Wert-Export fällt), dem Warum (der Typ hat nie existiert) und dem, was bleibt
     (`ComponentState` als Typexport). Kein Rückblick auf den Vorzustand (»Konventionen«).

  5. **Der Rückverweis nach `guides.md` — eine Zeile in fremdem Gebiet.** `guides.md:372` verlinkt
     seit `c0691da` nach `api-reference.md#driving-the-lookup-by-hand`; die Gegenrichtung fehlt.
     Ziel ist `### Registering Your Own Entity Elements` (`guides.md:364`, Anker
     `#registering-your-own-entity-elements` — am 2026-08-17 an der Fundstelle bestätigt).
     Einfügeort, frisch gemessen: `#### Driving the Lookup by Hand` beginnt bei **`:1611`**, sein
     letzter Absatz endet bei **`:1673`** (»…because their channel waits for the tree to stop
     moving.«), das `---` steht bei **`:1675`**. Die Zeile geht dazwischen. **Genau eine Zeile,
     ein Satz, ein Link.** Alles andere in `:1611`–`:1675` ist 12b und bleibt unberührt — kein
     Nachschärfen, kein Umformulieren. Die Zeilennummern sind ein Suchhinweis; es gilt die
     Überschrift.

  6. **`Backlog.md` — Streichungen, Neunumerierung, nachgezogene Querverweise, neue Zeilen.**

     **Die Mechanik hat einen Präzedenzfall mit Hash:** `e778621` (Paket 17) hat zwei erledigte
     Punkte **ersatzlos entfernt** (§7.1 »`<shae-prop>` end-to-end testen«, §7.2 »`syncWait()`
     muss nach `destroy()` rejecten«) und §7 danach **fortlaufend neu numeriert**, während
     durchgestrichene, aber nicht entfernte Punkte (1, 2, 4, 5, 6, 13) ihre Nummern behalten.
     Genau dieser Vorgang wird kopiert — `git show e778621 -- Backlog.md` zeigt ihn Zeile für
     Zeile.

     - **§7.3 Punkt 20** (`Backlog.md:431`, `ComponentMemory`-Re-Export) — von Schritt 4
       eingelöst, fällt ersatzlos.
     - **§7.4 Punkt 23** (`Backlog.md:437`, die nie geprüften `api-reference.md`-Abschnitte) —
       fällt ersatzlos. **Gemessen: Paket 16 hat den Punkt *nicht* verkürzt**; er steht wörtlich
       so da, wie 17 ihn angelegt hat, samt der Zeilenangaben `:1846`–`:1955` und `:1956`–`:2193`,
       die heute beide falsch sind. Er nennt vier Abschnitte plus `### Namespacing and Contexts`,
       also genau die fünf — die Streichung ist erst nach diesem Paket vollständig gedeckt.
     - **§7.2 Punkt 11 fällt ebenfalls** — »`Registry.clear()` muss `#truthyPropRoutes`
       mitlöschen. *(KERN-6)*« (`Backlog.md:419`) ist **erledigt**: `Registry.ts:145` löscht die
       Karte, seit `e1768c1`. Gemessen: nach `clear()` gibt `findTokensByRoute('a',
       new Set(['flag']))` nur noch `["a"]`. Er ist zugleich die Gegenprobe zu A-11. **Am
       2026-08-17 vom Orchestrator entschieden: der dritte Strich geht mit** — `CLAUDE.md` führt
       den Backlog als »living working document, not an audit log«, und ein erledigter Punkt, der
       stehenbleibt, ist eine Falschaussage über den Code. Die Punkte danach laufen **1..23**.
     - **Querverweise nachziehen, alle drei gemessen falsch — und zwei waren es schon vor
       Paket 16:**
       - Punkt 24 nennt `api-reference.md:1617-1621` für die drei Ereignisnamen. Die Tabelle steht
         heute bei `:1649`–`:1652`; vor `eb97b31` stand sie bei `:1615`–`:1618`. Die Angabe war
         also nie richtig.
       - Punkt 26 nennt `api-reference.md:414`, `:442`, `:1454`. Gemessen heute: **`:442`,
         `:470`, `:1485`**; vor `eb97b31`: `:414`, `:442`, `:1451`. Auch hier war die dritte
         Angabe von Anfang an daneben.
       - Die **Zahl** in Punkt 26 stimmt weiterhin: der Gloss »(Component Tag)« steht an **neun**
         Stellen (`AGENTS.md:18`, `getting-started.md:50`, `cheat-sheet.md:238`, `guides.md:143`,
         `:331`, `concepts.md:43`, `api-reference.md:442`, `:470`, `:1485`) — maschinell erhoben.
       Paket 18 hat als Nebenbefund drei Backlog-Zeilenangaben gefunden, die ins Leere zeigen;
       dieses Paket legt keine vierte an und räumt die drei, die es misst.

     - **Neue Backlog-Zeilen aus diesem Paket**, alle am Code belegt:
       1. **`Entity` ist aus keinem Entry exportiert**, obwohl die vier Lebenszyklus-Interfaces
          ihn in ihrer Signatur verlangen (`events.d.ts`). Ein Konsument kann den geforderten Typ
          nicht benennen; der Ausweg ist `EntityApi` und Methoden-Bivarianz. (A-3)
       2. **`EntityGraphNode` ist nicht exportiert**, obwohl `getEntityGraph()` ihn zurückgibt
          (`Kernel.d.ts`, `interface` ohne `export`). (K-5)
       3. **`Registry.hasRoute()` sieht Property-Routen nicht** (`Registry.ts:138-140` gegen
          `clearRoute` bei `:71-78`); gemessen `hasRoute('@debug') === false` bei wirksamer Route.
          (A-12)
       4. **`ShadowObjectConstructor` weiten oder `ShadowObjectConstructorFunc` überall zulassen**
          — `shadowObjects.define()`/`registry.define()` nehmen nur den Konstruktortyp, zur
          Laufzeit läuft eine Funktion (`Kernel.ts:463` ruft mit `new`). Aus der Entscheidung vom
          2026-08-17. (A-2)

     - **Neue Backlog-Zeilen aus dem Ergebnisblock von Paket 16** — welche gehören hinein,
       entschieden und begründet:
       5. **`emit`-Ziel weiten oder `EntityApi` als `EventizedObject` führen.** `types.d.ts:113`
          typt `emit(target: EventizedObject, …)`, `EntityApi` trägt die eventize-Marker nicht;
          das dokumentierte `emit(child, …)` warf `TS2769`. Zur Laufzeit funktioniert es.
          `cheat-sheet.md:182` zeigt dieselbe typseitig scheiternde Form (**Tabu**, gehört zur
          selben Zeile) — an der Fundstelle bestätigt. **Gehört hinein:** API-Frage, gemessen,
          zwei Dateien betroffen, keine davon in diesem Paket bearbeitbar.
       6. **`clearOnDestroy` folgt dem Signal-Cache nicht.** `Kernel.ts:513`/`:554` werten das Feld
          **außerhalb** des `if (ctxProvider == null)`-Zweigs aus; ein erster Aufruf mit
          `{clearOnDestroy: false}` schützt nach einem zweiten, der es auch nur per Vorgabe
          verlangt, nichts mehr. **Gehört hinein:** eine Verhaltensfrage im Code, die kein
          Doku-Paket entscheiden darf, und 16 hat sie ausdrücklich als Kandidaten offengelassen.
       7. **`useProperties`: Cheat Sheet und `concepts.md` nennen den Parameter `map`, Code und
          Referenz nennen ihn `props`.** An beiden Fundstellen bestätigt: `cheat-sheet.md:67`,
          `concepts.md:249`. **Gehört hinein:** beide Dateien sind für 16 wie für 19 Tabu, also
          kann es niemand im Lauf noch beheben.
       8. **»Shadow Entity« gegen die bindende Begriffstabelle.** 16 nannte `:569`; nach dem
          +34-Versatz gemessen sind es **zwei** Stellen, nicht eine: **`:603`** (»…maps to a
          Shadow Entity«) und **`:842`** (»…map a game engine object to a Shadow Entity
          manually«), beide in 12d-Gebiet. **Gehört hinein**, mit beiden Zeilen.

       **Nicht** in den Backlog geht die Bemerkung aus 16 zu `@spearwolf/eventize` als
       gewöhnlicher Dependency — sie beschreibt eine Tatsache über alle sechs bestehenden
       Fundstellen und benennt keinen offenen Punkt; 16 hat sie selbst als »keine Frage dieses
       Pakets« geführt. Ebenso wenig der Doppelimport von `ShadowObjectCreationAPI` (beide Pfade
       lösen auf, beide Blöcke grün) und die Einmaligkeit der Deprecation-Warnungen — beides
       Beobachtungen ohne Handlungsbedarf.

  7. **`packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`**, drei Stichpunkte:
     - `- **Breaking:** …` für den `ComponentMemory`-Schnitt (Schritt 4).
     - `- **Docs (reference):** …` dafür, dass §Kernel zum ersten Mal seine ganze Oberfläche führt
       (17 Methoden statt 8) und `registry.findTokensByRoute` benannt ist.
     - `- **Docs (correctness):** …` für die Berichtigungen: der nicht existierende
       `./view`-Subpfad, der Wurzel-Entry-Import in einem Kernel-Beispiel, die zwei Logger-Felder,
       die es nicht gibt, die fünf implizit-`any`-Parameter in den zwei Klassenbeispielen, der
       zweimal deklarierte `const kernel`, und die zwei Bedeutungen von `shadowObjects`.
     Kein Rückblick auf den Vorzustand, keine Finding-IDs (»Konventionen«).

---

- **Tabu — diese Stellen fasst das Paket nicht an:**
  - **`api-reference.md:40`–`:600`** — Paket **16**, direkt davor, `eb97b31`. Vier
    Gegenstellen-Paare zeigen von dort hierher; sie werden **gelesen und zitiert**, nicht
    rückwirkend geändert. Namentlich und mit den **heutigen** Nummern: `:473` (»function or
    class«, richtig für die Modulform) gegen `:2020`; `:469` (ein Token trägt mehrere
    Konstruktoren) gegen `:2093`; `:547`/`:550` (Routenauflösung, seit 16 richtig) gegen `:2123`
    (gemessen **ebenfalls richtig**, siehe A-6); `:379`–`:383` (`onDestroy` auf zwei Wegen) gegen
    `:2158`. Widerspricht 16 dem Code, gilt der Code und der Widerspruch geht in die
    Verlaufszeile.
  - **`api-reference.md:601`–`:1358`** — die Klassenreferenz, Paket **12d**, drei Runden, 36
    gemessene Aussagen. Insbesondere `## ComponentContext` → `### Namespacing` (`:1036`–`:1062`),
    auf das N-2 verweist, und die zwei »Shadow Entity«-Stellen `:603`/`:842`, die als
    Backlog-Zeile gehen und **nicht** hier korrigiert werden.
  - **`api-reference.md:1359`–`:1838`** — §Web Components, Paket **12b** (35 gemessene
    Verhaltensfälle), Paket **13** und Paket **11** (Typtabellen). **Einzige Ausnahme: die eine
    Rückverweis-Zeile aus Schritt 5** zwischen `:1673` und dem `---` bei `:1675`. Sonst kein
    Zeichen — auch nicht in der Attributtabelle bei `:1485`, auch nicht in der Ereignistabelle bei
    `:1649`–`:1652`.
  - **`cheat-sheet.md`, `guides.md`, `best-practices.md`, `concepts.md`, `getting-started.md`,
    `docs/README.md`, beide `README.md`, `TEST-PLAN.md`, `AGENTS.md`, die Wurzel-`CHANGELOG.md`** —
    kein Zeichen. `guides.md:364` ist das **Ziel** des Rückverweises, kein Bearbeitungsziel;
    `cheat-sheet.md` ist nach 12d und 18 die Gegenstelle für A-9, kein Bearbeitungsziel.
  - **Alles aus Paket 18** — `Kernel.ts`, `Kernel.spec.ts`, `cheat-sheet.md`, `Backlog.md` außer
    den Streichungen und Ergänzungen aus Schritt 6, die `CHANGELOG.md`-Einträge von 18.
    `Kernel.ts`, `Registry.ts`, `ShadowObject.ts` und `ConsoleLogger.ts` sind in diesem Paket
    **Beweismittel, nie Ziel**.
  - **Kein Code außer der einen Zeile `src/index.ts:12`.** Kein Test, kein `package.json`, kein
    `tsconfig`, keine Signaturweitung, kein Export von `Entity` oder `EntityGraphNode`, keine
    Korrektur an `hasRoute` — alles Backlog. **Wer eine zweite Codezeile ändert, macht das Paket
    rot.**

---

- **Verify:** Kein Test kann eine Doku-Zeile prüfen. Die Prüfung sind die vier Instrumente,
  schriftlich festgehalten.

  1. **Signaturen gegen die emittierten Deklarationen, in beide Richtungen.**
     `pnpm -F @spearwolf/shadow-objects build`, dann gegen
     `dist/src/in-the-dark/Kernel.d.ts`, `dist/src/in-the-dark/Registry.d.ts`,
     `dist/src/in-the-dark/ShadowObject.d.ts`, `dist/src/in-the-dark/events.d.ts` und
     `dist/src/utils/ConsoleLogger.d.ts`. **Kein Member ohne Doku-Zeile, keine Doku-Zeile ohne
     Member.** Die drei Zahlen gehören in die Verlaufszeile:
     `Kernel` **17 öffentliche Methoden plus Konstruktor** (heute 8 dokumentiert),
     `Registry` **9** (heute 8), `ConsoleLogger` **ohne `enabled` und ohne `logLevel`**.
     Gegenprobe zur Laufzeit für die erste Zahl:
     `Object.getOwnPropertyNames(Kernel.prototype)` ohne `constructor` = **24** (17 + 7 private).
  2. **Verhalten messen, nicht behaupten — `vitest` im Kernpaket, happy-dom.** Eine Wegwerf-Spec
     unter `packages/shadow-objects/src/`, danach entfernen; `git status --porcelain` zeigt am
     Ende nur die zwei bekannten untracked Dateien. Der Planer hat diese Fälle am 2026-08-17
     gefahren; sie sind **nachzubauen, nicht abzuschreiben**. **Falle, die den Planer Zeit gekostet
     hat: vitest 4 verschluckt `console.log` aus grünen Tests** — der Vorgabe-Reporter zeigt nichts,
     `--silent=false` ändert daran nichts, und `--reporter=basic` gibt es nicht mehr. Die Sonde
     schreibt ihre Messwerte in eine Datei oder lässt einen `expect` absichtlich fallen. Die Fälle
     mit ihrem gemessenen Ergebnis:
     - `kernel.getEntity('abc-123')` auf leerem Kernel → `Error: entity with uuid "abc-123" not found!`
     - `traverseLevelOrderBFS()` zweimal → **dieselbe Instanz**; ein `push` darauf macht den
       nächsten Aufruf um eins länger. Wald aus `a→a1→a11` und `b→b1`: vorwärts `a,b,a1,b1,a11`,
       rückwärts `a11,b1,a1,b,a`.
     - `getEntityGraph()` → ein Wurzelknoten, Schlüssel `token,entity,props,children`;
       `JSON.stringify` wirft **nicht**, das `entity`-Feld wird `{}`.
     - `upgradeEntities()` nach einem zweiten `define` auf dasselbe Token → `A:new`, dann nur
       `B:new`; **kein** `A:destroy`, `findShadowObjects` = 2.
     - `new ConsoleLogger('x')`: `typeof l.enabled === 'undefined'`,
       `typeof l.enable === 'boolean'`, `typeof l.logLevel === 'undefined'`; `sharedConfig`-Keys
       `enable,debug,info,warn,styles.debug,styles.info,styles.warn,styles.error`.
     - Registry mit `appendRoute('game-object', ['physics','renderer'])` und
       `appendRoute('@debug', ['debug-overlay'])` →
       `findTokensByRoute('game-object', new Set(['debug']))` =
       **`["game-object","physics","renderer","debug-overlay"]`**;
       `findConstructors('nope')` = **`undefined`**; `hasRoute('@debug')` = **`false`**;
       nach `clear()` sind alle drei Karten leer.
     - Der Dekorator: Rückgabewert ≠ Eingabeklasse, `.name` = `__ShadowObject`, `displayName`
       `undefined`, `instanceof` erhalten, registrierter Konstruktor = Unterklasse; die Instanz
       trägt `Symbol(eventize)`, eine undekorierte nicht.
     - Lebenszyklus: unmittelbar nach dem `SetParent`-Change nur `onCreate`; nach einer
       Microtask-Runde `onCreate | onParentChanged`; `onViewEvent` synchron; `onDestroy` beim
       `destroyEntity`.
     - Zwei Umgebungen nebeneinander (N-3): `get('world-A') !== get('world-B') !== get()`,
       je Name stabil, `get().ns === GlobalNS`, Kontextkarte 3.
     - Der `ComponentMemory`-Schnitt: die sieben Proben aus der Tabelle in Schritt 4, **vor und
       nach** der Änderung, jedes Mal nach einem Build.
     Dazu **zwei Auflösungsproben ohne `vitest`**, aus `packages/shadow-objects-testing/`:
     `node -e "import('@spearwolf/shadow-objects/view')…"` → `ERR_PACKAGE_PATH_NOT_EXPORTED` (N-1),
     und `node -e "import('@spearwolf/shadow-objects')…"` → `ReferenceError: HTMLElement is not
     defined`, während `…/shadow-objects.js` durchläuft und `MessageToView === 'messageToView'`
     liefert (K-7).
  3. **Jeden Codeblock mechanisch extrahieren und wörtlich ausführen.** **Abgeschrieben zählt als
     ungeprüft**, und **`tsc` erreicht bei einem Syntaxfehler die semantische Phase nicht** — je
     Block eine Datei, ein Aufruf, ein Exit-Code. Flags:
     `--target ES2022 --module ESNext --moduleResolution bundler --strict --verbatimModuleSyntax
     --skipLibCheck`. Vier Fallen, alle vom Planer getreten:
     - **`tsc` 7.0.2 zieht ohne `--ignoreConfig` die Projektconfig**, sobald Dateien auf der
       Kommandozeile stehen — dann kommt nur `TS5112` zurück und *jeder* Block sieht rot aus.
     - **Jede Blockdatei braucht ein angehängtes `export {}`**, sonst ist sie ein Script und
       kollidiert mit den DOM-Globals.
     - **Die Dateien müssen in einem Paket liegen, das `@spearwolf/shadow-objects` auflöst**
       (`packages/shadow-objects-testing/` hat es als Abhängigkeit). Ohne das fällt N-1 nicht auf,
       weil dann **jeder** Import `TS2307` meldet.
     - **Die Präambel gehört zur Zahl.** Ohne sie sind es **1 grün / 22 rot** und die Reds sagen
       nur »`kernel` ist unbekannt«. Der Planer hat je Block eine Präambel gebaut, die **echte
       Typen** einführt (`declare const kernel: Kernel;` aus der `.d.ts`, nie `any`), und das mit
       **vier Mutationsproben** belegt — jede muss rot werden, sonst misst die Präambel nichts:
       `getEntity` → `getEntityX` gibt `TS2551`, `getEntityGraph()` → `getEntityGraph(123)` gibt
       `TS2554`, `clearRoute` → `clearRout` gibt `TS2551`, und der Importpfad `/shadow-objects.js`
       → Wurzel-Entry gibt `TS2305` für `Kernel` und `Registry`. Die Mutationsproben gehören
       nachgebaut, nicht geglaubt.

     **Bestand, am 2026-08-17 maschinell gezählt: 24 Blöcke, 23 typprüfbar (1 `html`). Unter der
     protokollierten Präambel-Bedingung 14 grün / 9 rot.** Die Bedingung gehört zur Zahl. **Jeder
     der neun Reds ist ein benannter Befund** — es gibt keinen unmarkierten durchgefallenen Block:

     | Block | Meldung | Befund |
     |---|---|---|
     | `:1868` | `TS2307` | N-1 |
     | `:1883` | `TS2451` ×2 | K-10 |
     | `:1907` | `TS1109` | K-9 |
     | `:1927` | `TS1128` | K-9 |
     | `:1995` | `TS2345` | A-2 |
     | `:2007` | `TS1005` ×3, `TS1109` ×2 | A-10 |
     | `:2044` | `TS7006` ×2 | A-3 |
     | `:2164` | `TS7006` ×3 | A-3 |
     | `:2206` | `TS2551`, `TS2339` | A-1 |

     **Für sechs der neun ist die grüne Ersatzform bereits gemessen** (N-1, K-9 ×2, K-10, A-2,
     A-3 ×2 — alle rc=0). Bei A-1 muss der Mechanismus erst geschrieben und dann gemessen werden;
     A-10 verlässt den Blockbestand, weil der Fence zu einem Aufzählungspunkt wird. **Erwartung
     danach: 23 Blöcke, 22 typprüfbar, alle grün** — jeder verbleibende rote Block braucht eine
     Zeile mit Grund, sonst ist der Verify rot.
  4. **Zu jeder geänderten Aussage die Gegenstelle prüfen — und daran denken, dass die Gegenstelle
     selbst der Fehler sein kann.** 12c hat eine falsche Formulierung als Vorlage genommen und an
     fünf Stellen getragen; die Prüfung fing sie nicht, weil die Vorlage der Fehler war. Wer eine
     Gegenstelle zitiert, prüft **sie** zuerst am Code. Die Paare, mit heutigen Nummern:

     | Aussage | hier | Gegenstelle | Stand |
     |---|---|---|---|
     | `define` nimmt »function or class« | `:2020` | `:473` (Paket 16) | Gegenstelle **richtig** für die Modulform, hier falsch |
     | Ein Token trägt mehrere Konstruktoren | `:2093` | `:469` (Paket 16) | beide sagen es, abgleichen |
     | Reihenfolge der Routenauflösung | `:2123` | `:547`/`:550` (Paket 16) | **beide richtig, gemessen — nicht anfassen** |
     | `onDestroy` läuft auf zwei Wegen | `:2158` | `:379`–`:383` (16), `cheat-sheet.md` (18) | nur verweisen |
     | Der Namespace-Grundbegriff | `:1839`–`:1876` | `:1036`ff (12d, **Tabu**), `:1485` (12b, **Tabu**) | dreifach erzählt |
     | `upgradeEntities` fasst die Schnittmenge nicht an | `:1949`–`:1956` | `cheat-sheet.md:6` (12d), fünf Stellen (12c) | Vorlage **erst am Kernel prüfen** |
     | Der Rückverweis auf `guides.md` | `:1673`/`:1675` | `guides.md:364`/`:372` | Anker bestätigt |

  5. **Die Suite darf sich nicht bewegen — und die eine Ausnahme ist benannt und beziffert.**
     `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`:
     `test:ci` **659**, e2e **402**, `lint` rc=0 mit den zwei bekannten `biome.json`-Infos,
     `find packages/shadow-objects/dist -type f | wc -l` = **198**. **Die `dist/`-Zahl bleibt
     trotz der Codeänderung gleich** — der Beleg dafür steht in Schritt 4 und braucht kein
     Experiment. Bewegt sich `test:ci`, hat jemand mehr angefasst als eine Zeile: gemessen gibt es
     **null** Konsumenten von `ComponentMemory` außerhalb von `ComponentContext.ts` und
     `ComponentMemory.spec.ts`, beide über direkte Modulimporte. Dazu die sieben Proben aus der
     Tabelle in Schritt 4, **vorher und nachher**.
  6. `git diff --stat` zeigt **genau vier** Dateien: `docs/api-reference.md`, `src/index.ts`, die
     Paket-`CHANGELOG.md`, `Backlog.md`. Keine weitere Datei unter `src/`, kein Test, keine zweite
     Doku-Datei. `src/index.ts` mit **1 insertion, 1 deletion**.

- **Commit:** `docs(api): bring the kernel and advanced reference in line with the code`

- **Modell: stärkste Stufe.** §Kernel bekommt neun Methodenbeschreibungen, die aus `.d.ts`,
  JSDoc und gemessenem Verhalten zusammengesetzt werden müssen; der Extraktor braucht je Block
  eine Präambel mit echten Typen samt Mutationsbeleg; und die einzige Codeänderung des Restlaufs
  ist eine Breaking Change an der öffentlichen Oberfläche, deren Beleg aus zwei Messreihen um
  einen Build herum besteht.

- **Verlauf:**
  - Zug 0 (2026-08-17, Planer 19): Bereich selbst vermessen — **`:1839`–`:2224`, 386 von 2224
    Zeilen, 24 Blöcke** (1 `html`, 23 `typescript`); der Versatz aus Paket 16 ist **+34**, nicht
    +44. Alle 23 typprüfbaren Blöcke einzeln gefahren: roh 1 grün / 22 rot, unter der Präambel
    **14 grün / 9 rot**, und **jeder der neun Reds ist ein benannter Befund**. Präambel mit vier
    Mutationsproben belegt. Sechs grüne Ersatzformen vorab gemessen. Verhaltenssonde mit
    14 Fällen gefahren und restlos entfernt. **Vier Planbehauptungen widerlegt:** der Versatz
    (+34 statt +44); K-4 (die Wald-Vermutung — die Umkehrung stellt auch im Wald jede Entity vor
    ihre Vorfahren, gemessen); A-6 (der `findConstructors`-Kommentar ist **richtig**, gemessen
    `["game-object","physics","renderer","debug-overlay"]`); und die Verify-Probe
    `grep -c ComponentState dist/src/index.d.ts` (heute **0**, bleibt 0 — `index.d.ts` reexportiert
    das Modul, es inlined das Interface nicht). **Drei neue Befunde:** K-11 (`shadowObjects` als
    lokale Variable bei `:1963`, dritte Bedeutung), A-12 (`hasRoute` sieht Property-Routen nicht),
    A-8 (`onParentChanged` läuft erst eine Microtask später — der Unterschied zwischen den zwei
    Zustellmechanismen ist beobachtbar). Dazu: fünf statt vier `TS7006`; »Shadow Entity« an zwei
    statt einer Stelle; Backlog §7.4 Punkt 23 von Paket 16 **nicht** verkürzt; Backlog §7.2 Punkt
    11 messbar erledigt; drei Backlog-Querverweise falsch, zwei davon schon vor `eb97b31`;
    Neunumerierungs-Präzedenz mit Hash gefunden (`e778621`). Der `ComponentMemory`-Schnitt ist
    ohne Experiment belegt (drei `export type *`-Präzedenzfälle in derselben Datei) und mit einer
    Sieben-Proben-Tabelle für vorher/nachher unterlegt. **Nicht geteilt**, Begründung oben. Vier
    Vorlagen an den Orchestrator, alle am 2026-08-17 entschieden und im Plankopf eingetragen.
    Arbeitsbaum am Ende sauber.
  - Zug 1–3 (2026-08-17): umgesetzt, reviewt, nachgebessert, committet als **`b2356be`**.

</details>

- **Ergebnis (2026-08-17):** Die letzten drei ungeprüften Abschnitte der Referenz stehen gegen den
  Code, und der `ComponentMemory`-Re-Export ist geschnitten. Vier Dateien, **eine** Codezeile.
  Verify vom Orchestrator selbst gefahren, zweimal (vor und nach der Nachbesserung), beide Male
  grün: lint rc=0 (zwei bekannte `biome.json`-Infos), typecheck ✓, `test:ci` **659**, e2e **402**,
  `dist/` **198**. Die zwei entscheidenden Proben des Schnitts unabhängig nachgemessen:
  `grep -c ComponentMemory dist/src/index.js` = **0** (vorher 1),
  `grep -c '^export type \*' dist/src/index.d.ts` = **4** (vorher 3).

**Codeblöcke: 14 grün / 9 rot vorher → 23 grün / 0 rot nachher** (24 Blöcke, 23 typprüfbar, 1
`html`). Prüfbedingung: `tsc 7.0.2 --ignoreConfig --noEmit --target ES2022 --module ESNext
--moduleResolution bundler --strict --verbatimModuleSyntax --skipLibCheck --experimentalDecorators`,
je Block eine Datei mit angehängtem `export {}`, abgelegt unter `packages/shadow-objects-testing/`,
Präambel mit echten Typen aus der `.d.ts` bei 17 der 23 Blöcke, **keine** Stub-Module nötig. Roh
ohne Präambel: 1 grün / 22 rot.

**Der Reviewer hat die Kernbehauptung unabhängig nachgebaut** — eigener Extraktor, eigene Präambel,
`green=23 red=0` — und mit **neun** eigenen Mutationen belegt, jede rot (`TS2307`, `TS2451`×2,
`TS2551`×3, `TS2554`, `TS7006`×2, `TS2339`, `TS2305`). Dazu die entscheidende Gegenprobe: dieselben
Dateien mit `declare const kernel: any` laufen grün durch, `getEntityX` eingeschlossen. Die
Präambel misst also, statt Fehler zuzudecken. Fünf Blöcke über einen zweiten, unabhängigen
Schnittweg byteweise verglichen: `cmp` bytegleich.

**Die Hauptbefunde**

- **K-1 — §Kernel führte 8 von 17 öffentlichen Methoden.** Die neun fehlenden sind die sieben
  Schreibmethoden, an die `run()` einen Change Trail verteilt, dazu `dispatchMessageToView` für den
  Rückweg und `findOrCreateRootContext`. Gegenprobe zur Laufzeit:
  `Object.getOwnPropertyNames(Kernel.prototype)` ohne `constructor` = 24 = 17 öffentliche + 7
  private.
- **A-5 — `registry.findTokensByRoute()` fehlte ganz**, obwohl dort die Auflösungsregel entsteht,
  die §Registry seit Paket 16 beschreibt. `Registry` hat neun Member, dokumentiert waren acht.
- **N-1 — `import … from '@spearwolf/shadow-objects/view'`**: die `exports`-Map kennt neun Einträge,
  `./view` ist keiner davon. Node `ERR_PACKAGE_PATH_NOT_EXPORTED`, `tsc` `TS2307`.
- **K-7 — ein Kernel-Beispiel importierte den Wurzel-Entry**, der die Custom Elements mitzieht und
  unter Node mit `ReferenceError: HTMLElement is not defined` stirbt — in genau der Umgebung, in
  der ein Kernel läuft.
- **A-1 — §Console Logger nannte `logger.enabled` und `logger.logLevel`**, beide nicht existent
  (`TS2551`/`TS2339`, zur Laufzeit `undefined`). Der wirkliche Mechanismus sind vier gemeinsame
  Schalter plus eine Instanzflagge, verundet über vier Getter — und `#print` fragt keinen davon,
  die Entscheidung liegt bei der Aufrufstelle.
- **A-8 — `onParentChanged` kommt eine Microtask später** als die drei anderen Lebenszyklus-Symbole
  (`Kernel.ts:354`, `queueMicrotask`). Ein Shadow Object darf sich nicht darauf verlassen, dass es
  gelaufen ist, wenn `kernel.run()` zurückkehrt.
- Dazu: `getEntity` wirft statt `undefined` zu liefern; `traverseLevelOrderBFS` gibt den Cache des
  Kernels heraus, keine Kopie; das `entity`-Feld von `getEntityGraph()` serialisiert als `{}`;
  `upgradeEntities` fasst die Schnittmenge nicht an; `hasRoute` beantwortet nur Token-Routen;
  `findConstructors` heißt sein Parameter `route` und gibt `undefined` statt eines leeren Arrays.

**Planabweichungen** — vier gemeldet, alle vom Reviewer bestätigt: `run()` bedient **sieben**
Methoden, nicht acht (`dispatchMessageToView` steht nicht im `switch`, sondern läuft bei
`Kernel.ts:386-390` in die Gegenrichtung); Blockzahl nachher 24/23 statt 23/22 (A-10 nimmt einen
Fence weg, A-5 bringt einen neuen); §7 des Backlogs endet bei 32 statt 23 (die Zahl galt nur für
die Streichungen); `Kernel.ts:353-359` ist real `:354`. Vier als »richtig, nicht anfassen«
markierte Planaussagen wurden nachgemessen und **bestätigt** (K-4 Wald-Umkehrung, A-6
`findConstructors`-Kommentar, A-11 `clear()`, N-3 drei Kontexte); der Reviewer hat zwei davon
stichprobenartig selbst gefahren.

**Eine Reviewer-Auflage, eingelöst.** Die neue `sharedConfig`-Vorgabentabelle behauptete, `info`
und `warn` seien aus — `ConsoleLogger.ts:101-107` setzt beide auf `true`. Zwei von drei Angaben in
einer Zelle falsch, in genau dem Abschnitt, den das Paket gerade richtiggestellt hatte, und vom
Plan nie behauptet. Beim Nachziehen fand der Implementierer **eine zweite ungemessene Stelle**: der
Getter-Satz schrieb allen vier Gettern eine Level-Bedingung zu, aber `isEnabled` hat keine — es
verundet nur die zwei `enable`-Flaggen (`:239-240`).

**Nebenbefunde**

- **`constructa`** — ein Tippfehler im Parameternamen, sichtbar in der emittierten Oberfläche:
  `Registry.d.ts:7` und `ShadowObject.d.ts:16`. Zweimal, nicht einmal. **Backlog 26.**
- **`ConsoleLogger.sharedConfig` sammelt pro Namensraum einen weiteren Schlüssel** — aber nur ohne
  benutzbare Storage: mit `localStorage` bleibt es bei acht Schlüsseln, ohne kommt `probe.enable`
  hinzu, weil `loadConfig()` dann auf das Fallback-Objekt unter `globalThis[CONSOLE_LOGGER_STORAGE]`
  ausweicht. Die Bedingung wäre in der Tabelle nicht unterzubringen. **Backlog 27.**

**`Backlog.md`** — drei Streichungen (der `ComponentMemory`-Re-Export, die ungeprüften
Referenzabschnitte, und `Registry.clear()`/`#truthyPropRoutes` als messbar erledigt), **elf**
Neuzugänge, durchgehend neu nummeriert **1..34**, drei falsche Querverweise nachgezogen (zwei davon
schon vor Paket 16 daneben). Alle Neuzugänge ohne Finding-IDs; der Altbestand bleibt unberührt.

- Hash: `b2356be`
