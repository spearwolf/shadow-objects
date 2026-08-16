# Shadow-Objects Framework — Quellcode-Analyse & Backlog

**Erstellt:** 2026-05-09
**Analysiertes Paket:** `@spearwolf/shadow-objects` v0.30.2 (`packages/shadow-objects/`)
**Mit-analysiert:** `packages/shadow-objects-testing/`, `packages/shadow-objects-e2e/`, `packages/shae-offscreen-canvas/` (Beispiel-Anwendung)
**Methodik:** Vier parallele Recherche-Agenten haben jeweils Architektur/Kern, View-/Worker-Brücke, Test-Abdeckung und Build/Tooling untersucht. Es wurden keine Quelldateien verändert.

---

## 0. Glossar (für Mitlesende ohne Framework-Kontext)

| Begriff | Bedeutung |
|---|---|
| **Entity** | Leichtgewichtiges Datenobjekt im Schattenraum, hält Properties + Kindliste. Kein eigenes Verhalten. |
| **Shadow Object** | Komponente, die einer Entity Verhalten anhängt. Wird über einen *Token* registriert. |
| **Token** | String-ID, die View-Knoten (DOM) mit Shadow-Object-Klassen verknüpft. |
| **Kernel** | Zentrale Verwaltung aller Entities und ihrer Lebenszyklen, läuft im Schattenraum. |
| **Registry** | Mapping Token → Shadow-Object-Konstruktoren, plus Routing-Regeln. |
| **Shadow Environment / ShadowEnv** | Laufzeitumgebung für die Schattenseite — entweder im Hauptthread (`LocalShadowObjectEnv`) oder im Web-Worker (`RemoteWorkerEnv`). |
| **View Layer** | Hauptthread-Seite: DOM, Canvas. Sichtbares UI. |
| **Change Trail** | Geordnete Liste von Mutationen (Create / SetParent / Props / Destroy …), die als ein Paket vom View → ShadowEnv geschickt wird. |
| **Signal / Effect** | Reaktive Primitive aus `@spearwolf/signalize`. |
| **Eventize** | Event-Emitter-Bibliothek aus `@spearwolf/eventize`, viele Klassen sind „eventized". |
| **SignalsPath** | n-Eingabe-Reduzierer mit Vorrang-Semantik („erstes nicht-null gewinnt") — Basis für hierarchische Kontextvererbung. |

---

## 1. Executive Summary

`shadow-objects` ist ein gut konzipiertes, kompaktes ECS-Framework (Entity-Component-System) für reaktive Web-UI-State-Verwaltung. Die zentrale Idee — Logik in einen separaten Schattenraum auszulagern, der wahlweise im Hauptthread oder Worker laufen kann — ist sauber durch ein schlankes Proxy-Interface (`IShadowObjectEnvProxy`) realisiert. Das Reaktivitätsmodell baut konsequent auf zwei eigenen Bibliotheken (`@spearwolf/signalize`, `@spearwolf/eventize`) auf.

**Stärken:**
- Klare Architektur, kleines öffentliches API, gut dokumentiert (`docs/`).
- Sauber getrennte Test-Runner (vitest happy-dom, vitest browser-mode, Playwright).
- Sehr gute Abdeckung des wichtigsten Anwender-Kontrakts (`ShadowObjectCreationAPI`, Kontext-Vererbung, Lifecycle).

**Hauptrisiken:**
1. ~~**Worker-Fehlerpfade unter-implementiert** — keine `error`/`messageerror`-Handler, keine Reconnect-Logik, ausstehende Promises hängen nach Worker-Tod ewig (oder bis 5–60 s Timeout).~~ **Weitgehend behoben (VIEW-1, VIEW-2)** — `error` und `messageerror` werden vor dem Load-Handshake abonniert, ein Ausfall terminiert den Worker und lehnt alles Ausstehende mit `WorkerFailedError` ab; `ShadowEnv.ProxyFailed` meldet ihn nach außen, ein neuer `envProxy` ist der Weg zurück. Offen bleibt der gewollte Abbau: ein `applyChangeTrail`, das beim `destroy()` schon unterwegs ist, läuft in seinen 5-Sekunden-Timeout (VIEW-1).
2. ~~**Neues Feature „auto destruction on parent removal" (Commit 89c59c2) ist im Datenpfad nicht erreichbar** und behandelt Re-Parenting nicht.~~ **Behoben (KERN-1, KERN-2)** — Flag fließt jetzt durch `ICreateEntitiesChange` → `ComponentChanges.create()` → `parse()`; Subscription wird bei Re-Parent neu verdrahtet.
3. ~~**`destroyEntity` rekursiert nicht über Kinder** — bei Eltern-Destruktion bleiben Nicht-Auto-Kinder als verwaiste Einträge im Kernel.~~ **Behoben (KERN-3)** — Variante C: Flagged-Kinder kaskadieren, ungeflaggte werden zu Roots befördert.
4. **DOM-In-Place-Re-Parenting wird nur teilweise beobachtet** — `<shae-prop>` resolviert seinen Eltern-Knoten weiterhin nur in `connectedCallback`; bei `<shae-ent>` folgt die Beobachtung dem Element an seine neue Position, sieht aber einen zwischengeschobenen Container nicht (`subtree: false`, VIEW-6).
5. ~~**CI lässt das gesamte E2E-Paket aus** — der Worker-Roundtrip wird damit faktisch nicht von CI verifiziert.~~ **Behoben** — eigener Job `e2e` in `.github/workflows/ci.yml`, Chromium und Firefox bei jedem Push; der Deployment-Workflow hängt über `workflow_run` daran.
6. **`MessageRouter` schluckt Fehler** durch doppeltes `AppliedChangeTrail` im Catch-Pfad — Konsumenten sehen Erfolg trotz interner Exception.

Keiner dieser Punkte ist katastrophal; jeder einzelne sollte aber vor einem 1.0-Release adressiert werden.

---

## 2. Architektur-Überblick

### 2.1 Kern-Datenfluss

```
View (DOM)                              ShadowEnv (lokal oder Worker)
─────────                                ──────────────────────────
<shae-ent>     ─┐
<shae-prop>     │ ComponentChanges               Kernel
<shae-worker>   │  ─ Create/SetParent/        ┌─ Entities (Map<uuid,Entity>)
                │    UpdateOrder              ├─ Registry (Token → ShadowObjects)
ViewComponent  ─┤  ─ ChangeProperties         └─ SignalsPath (Kontext-Vererbung)
                │  ─ SendEvents
ComponentContext│  ─ Destroy
                │
                ▼
        ChangeTrail (Array)  ──postMessage──►  MessageRouter ──► kernel.run(SyncEvent)
                                                   ▲
        MessageToView   ◄────postMessage──────  Kernel.dispatchMessageToView
        (z. B. Worker → Custom-Event in DOM)
```

- **Downstream (Props):** View → Kernel → Entity → Shadow-Object-Signal.
- **Upstream (Events):** Shadow-Object → Entity → Kernel → View.
- **Lateral (Context):** Eltern → Kind via `SignalsPath` (Provider/Consumer-Muster).

### 2.2 Code-Layout (`packages/shadow-objects/src/`)

| Verzeichnis | Inhalt |
|---|---|
| `in-the-dark/` | Schatten-Laufzeit: `Kernel`, `Entity`, `Registry`, `ShadowObject`, `SignalsPath`, `events`, `importModule`. ECS-Herz. |
| `view/` | Hauptthread-Seite: `ShadowEnv`, `LocalShadowObjectEnv`, `RemoteWorkerEnv`, `ComponentContext`, `ComponentMemory`, `ComponentChanges`, `ViewComponent`, `IShadowObjectEnvProxy`, `cloneChangeTrail`. |
| `worker/` | Worker-Seite: `WorkerRuntime`, `MessageRouter`. |
| `elements/` | Custom Elements: `ShaeElement` (Basis), `ShaeEntElement`, `ShaePropElement`, `ShaeWorkerElement`. |
| `utils/` | `FrameLoop`, `ConsoleLogger`, `waitForMessageOfType`, `props-utils`, `attr-utils`, UUID, Namespace etc. |
| `index.ts` | Einziger öffentlicher Einstieg — alles andere ist intern. |

`view/` und `worker/` sind Spiegelbilder, verbunden über das asynchrone `IShadowObjectEnvProxy`-Protokoll.

### 2.3 Verwendete Technologien

- **TypeScript 7** (`strict: true` mit **`strictNullChecks: true`** in der Wurzel-`tsconfig.json`).
- **`@spearwolf/signalize` 1.0.0-beta.0** — Signals/Effects. Version-exakt gepinnt, solange es ein Beta ist.
- **`@spearwolf/eventize` 6.0.0** — Event-Emitter. Peer von signalize; beide werden nur gemeinsam gehoben.
- **esbuild 0.28** — Bundling, mit `esbuild-plugin-inline-worker` für den Worker-Inline.
- **vitest 4** für Unit-Tests (happy-dom) und Integrationstests (browser-mode + Playwright-Provider). **Playwright 1.62** für E2E. **vite 7** per Override festgehalten (Oxc in Vite 8 senkt Decorators nicht ab).
- **turborepo 2.10** als Monorepo-Orchestrator, **biome 2.5** für Lint/Format, **pnpm 11** mit `catalog:`-SSOT, Node ≥ 24.13.0.

### 2.4 Lebenszyklus einer Entity (vereinfacht)

1. `<shae-ent>` betritt das DOM → `connectedCallback` fragt `ComponentContext` für seinen Namespace.
2. `ViewComponent` wird erzeugt, `ComponentChanges.create(token, parent, order)` puffert die Mutation.
3. Bubbling-Event `shaeRequestEntParent` bestimmt den nächsten ECS-Vorfahren.
4. Microtask: `ShadowEnv.sync()` baut den `ChangeTrail` (BFS, drei Phasen: Strukturell → Properties → Destroy) und schickt ihn via `applyChangeTrail` auf die Schattenseite.
5. `Kernel.run()` parst die Einträge im `batch()`, ruft `createEntity`, `setParent`, `updateProperties`, `createShadowObjects`.
6. Shadow-Objects werden mit dem `ShadowObjectCreationAPI`-Closure instanziiert (Signals/Effects, Cleanup-Sets).
7. Auf `destroyEntity`: `[onDestroy]`-Symbol-Methode + `onDestroy`-Event mit verschiedenen Prioritäten räumen Properties, Kontexte, Signals, Effects auf.

---

## 3. Befunde — Bugs, Memory Leaks, Performance

> Schweregrad: **HIGH** = funktional fehlerhaft oder produkt-relevanter Leak · **MEDIUM** = falsches Verhalten in seltenen Pfaden, Test-Verschmutzung · **LOW** = Code-Smell, Mikrooptimierung.

### 3.1 HIGH — Kern (in-the-dark)

**[KERN-1]** ~~`autoDestructionOnParentRemoval` ist im Change-Trail-Datenpfad nicht erreichbar.~~ **✅ Behoben** — Feld in `ICreateEntitiesChange` ergänzt, durch `ComponentChanges.create()` (4. Parameter) und `Kernel.parse()` an `createEntity()` weitergereicht. `ViewComponent` bekommt eine neue Konstruktoroption `autoDestructionOnParentRemoval`. Abgedeckt von vitest-Specs (Kernel + ViewComponent) sowie Playwright-E2E-Test `auto-destruct.spec.ts` mit echtem `RemoteWorkerEnv` (Chromium + Firefox).

**[KERN-2]** ~~Re-Parenting bricht die Auto-Destruktions-Subscription.~~ **✅ Behoben** — `Entity` trennt jetzt User-Intent (`#autoDestructionEnabled`) von der konkreten Subscription. `set parentUuid` und `removeFromParent()` rufen `#updateAutoDestructionSubscription()`, das die Subscription gegen den jeweils aktuellen Vater neu herstellt.

**[KERN-3]** ~~`destroyEntity` rekursiert nicht über Kinder.~~ **✅ Behoben (Variante C)** — `Kernel.destroyEntity()` snapshottet die Kinderliste; flagged Kinder werden rekursiv abgeräumt, ungeflaggte via `removeFromParent()` zu Root befördert (und in `#rootEntities` aufgenommen). Damit ist der Leak in `kernel.#entities` geschlossen.

**[KERN-4]** ~~Cache-Invalidierung in `traverseLevelOrderBFS` greift bei programmatischer Destruktion nicht.~~ **✅ Behoben** — `#allEntitiesNeedUpdate` wird jetzt direkt in `destroyEntity()` gesetzt, sodass auch Auto-Destroy-Listener-Pfade den BFS-Cache invalidieren.

**[KERN-8]** ~~`Kernel.setParent()` setzt die Order beim Reparenting still auf `0` zurück.~~ **✅ Behoben** — die Kernel-Seite von **VIEW-18**: ein `SetParent`-Change trägt die Order nur mit, wenn sie sich geändert hat, `setParent(uuid, parentUuid, order = 0)` las das fehlende Feld aber als Reset. View- und Kernel-Seite waren danach uneins, und ein `reCreateChanges()` regenerierte aus einem Memory, das dem laufenden Kernel widersprach. Eine fehlende Order behält jetzt die aktuelle; eine explizite gewinnt weiterhin.

### 3.2 HIGH — View / Worker

**[VIEW-1]** ~~`RemoteWorkerEnv.applyChangeTrail` hängt unbegrenzt, wenn der Worker stirbt.~~ **🟡 Behoben für den Ausfall, offen für den Teardown.**
*Ausfall — erledigt:* ein `AbortController` trägt den Ausfallzustand: `waitForMessageOfType` nimmt ihn als Abbruch-Kanal entgegen, jedes ausstehende Promise wird im Moment des Ausfalls mit `WorkerFailedError` abgelehnt, jeder spätere Aufruf sofort. Die Timeouts sind auf diesem Weg der letzte Ausweg statt des einzigen.
*Teardown — offen:* `#workerFailure.abort()` steht ausschließlich in `handleWorkerFailure` (`RemoteWorkerEnv.ts:305`); `destroy()` (`:266–279`) rührt den Controller bewusst nicht an, damit der eigene `Destroyed`-Wartelauf seinen Timeout behält und die beiden Ablehnungsgründe nicht durcheinandergeraten. Ein `applyChangeTrail`, das beim Abbau schon unterwegs ist, wird deshalb nicht abgewickelt: sein `message`-Hörer und sein Timer überleben den Teardown bis zum 5-Sekunden-`WorkerChangeTrailTimeout`. Konsumenten der `ShadowEnv` merken davon nichts — `destroy()` lehnt dort `ready()` und `syncWait()` mit `ShadowEnvDestroyedError` ab —, wer den Proxy direkt fährt, wartet die vollen fünf Sekunden.
*Ungetestet:* `RemoteWorkerEnv.spec.ts:126` deckt das Ausstehende beim **Ausfall** ab, `:286`/`:292` die Aufrufe **nach** `destroy()`; den Sync **während** des Teardowns trifft kein Fall.

**[VIEW-2]** ~~Keine `error`/`messageerror`-Handler auf dem Worker.~~ **✅ Behoben** — beide werden abonniert, bevor der Load-Handshake beginnt. Ein Ausfall terminiert den Worker, setzt `isDestroyed` und meldet sich als `RemoteWorkerEnv.WorkerFailed` und `ShadowEnv.ProxyFailed` (samt `proxyfailed`-DOM-Event auf `<shae-worker>`). Der Weg zurück ist ein neuer `envProxy`: sobald er bereit ist, baut die View ihre Änderungen aus der Component Memory neu auf, und der nächste Sync stellt die Entities in der neuen Umgebung her.

**[VIEW-3]** `MessageRouter` schluckt Fehler durch doppeltes `AppliedChangeTrail`.
*Ort:* `MessageRouter.ts:84–97`.
Im Catch-Block wird zuerst `{type: AppliedChangeTrail, serial, error}` gepostet, dann fällt der Code in den Block bei Zeile 94 und postet erneut `{type: AppliedChangeTrail, serial}` **ohne** error-Feld. Die zweite Nachricht erfüllt das `serial`-Match in `RemoteWorkerEnv.ts:114` und der Konsument bekommt einen False-Positive.
*Fix:* `return` nach dem Catch-Post oder Flag setzen.

**[VIEW-4]** Listener-Leak bei verwaisten Eltern-Knoten im DOM.
*Ort:* `ShaeEntElement.ts:213–214, 285–288, 327`.
Wenn ein `<shae-ent>`-Vater aus dem DOM entfernt wird, das Kind aber selbst noch verbunden bleibt (z. B. weil ein Zwischen-Container reparented wurde), bleibt der `entParentNode`-Listener am orphan-Vater hängen → Memory-Pressure.

**[VIEW-14]** ~~`ComponentContext.#appendToOrdered` verliert Komponenten stillschweigend.~~ **✅ Behoben**
*Ort:* `ComponentContext.ts`.
Die handoptimierte Einfügung hatte keinen Fallback, wenn ihre Rückwärtsschleife vorne herauslief. Bei drei oder mehr Geschwistern und `children[0].order <= order < children[1].order` wurde die Komponente aus `#rootComponents` entfernt, aber nie in die Kinderliste eingefügt: unerreichbar per BFS, nie im Change Trail, und der nächste `clear()` warf `component-context panic`. Ersetzt durch eine lineare Einfügung, die uuids ohne View-Instanz überspringt statt zu dereferenzieren. Abgedeckt von `ComponentContext.spec.ts` (Kinder, Wurzeln, `order`-Setter, gleiche und negative Order-Werte).

**[VIEW-15]** ~~`ViewComponent.addChild()` akzeptiert Zyklen.~~ **✅ Behoben**
*Ort:* `ViewComponent.ts`, `ComponentContext.ts`.
`a.addChild(b); b.addChild(a)` leerte `#rootComponents` und machte den gesamten Teilbaum für jeden Change Trail unsichtbar; `a.addChild(a)` schickte `removeSubTree()` in unbegrenzte Rekursion. `addChild()` weist jetzt die Komponente selbst und jeden ihrer Vorfahren mit einem `ViewComponentError` ab, der Baum bleibt dabei unverändert. `removeSubTree()` führt zusätzlich ein Visited-Set.

**[VIEW-16]** ~~`#deleteComponent()` lässt verwaiste uuids in der Kinderliste zurück.~~ **✅ Behoben**
*Ort:* `ComponentContext.ts`.
`removeSubTree()` auf einem Nicht-Wurzelknoten korrumpierte die Kinderliste des Vaters; jedes spätere `getChildren()` und jede Einfügung darauf warf einen `TypeError`. Die uuid wird jetzt auch vom Vater gelöst.

**[VIEW-17]** ~~UUID-Wiederverwendung verwaist die Kinder der Vorgänger-Instanz.~~ **✅ Behoben**
*Ort:* `ComponentContext.addComponent()`.
Die Kinderliste wurde zurückgesetzt, ohne die Kinder zu benachrichtigen: sie zeigten weiter auf die alte Instanz, waren keine Wurzeln mehr und fielen aus dem Baum. Sie werden jetzt zu Wurzelkomponenten befördert.

**[VIEW-18]** ~~`ComponentMemory.setParent()` vergisst die Order beim Reparenting.~~ **✅ Behoben**
*Ort:* `ComponentMemory.ts`.
`order` wurde auf `0` zurückgesetzt, wenn ein `SetParent`-Change keine Order trug — was `ComponentChanges` nur dann tut, wenn sie sich nicht geändert hat. Nach einem `ContextLost` kam die Entity mit der falschen Order zurück. Die Order wird jetzt nur noch überschrieben, wenn der Change sie mitführt.

**[VIEW-19]** ~~`ShadowEnv.syncWait()` löst bei leerem Change Trail nie auf.~~ **✅ Behoben**
*Ort:* `ShadowEnv.ts`.
`AfterSync` wurde nur innerhalb von `if (data.length > 0)` emittiert; da das Promise gecacht wird, gaben alle folgenden `syncWait()`-Aufrufe dasselbe tote Promise zurück. `AfterSync` feuert jetzt in jedem Sync-Zyklus mit dem (ggf. leeren) Trail — so, wie die Doku es ohnehin versprach. Der davon unabhängige `destroy()`-Pfad ist unter **VIEW-8** behoben.

**[VIEW-20]** ~~Der zerstörte Zustand von `ViewComponent` ist undefiniert.~~ **✅ Behoben**
*Ort:* `ViewComponent.ts`.
Je nachdem, ob eine Aufrufstelle `?.` benutzte, warf dieselbe Situation einen `TypeError`, war ein stiller No-op oder meldete einen falschen fremden Kontext. Jetzt gilt: Mutationen, die nur die Komponente selbst betreffen, werden ignoriert; `dispatchEvent` benachrichtigt weiterhin die eigenen Listener ohne Kinder-Traversierung; `addChild` und der `parent`-Setter werfen einen `ViewComponentError`, der die Zerstörung benennt. Neu: `ViewComponent.isDestroyed`.

**[VIEW-21]** ~~Token-Normalisierung fehlt in Konstruktor und `changeToken()`.~~ **✅ Behoben**
*Ort:* `ViewComponent.ts`, `ComponentChanges.ts`.
`new ViewComponent(undefined)` ließ `token` auf `undefined` stehen, während der Trail korrekt `#void` meldete; `changeToken(undefined)` markierte die Komponente als dirty, emittierte aber nichts. Beide normalisieren jetzt auf `VoidToken`.

**[VIEW-22]** ~~`setProperty(key, undefined)` und `removeProperty(key)` divergieren intern.~~ **✅ Behoben**
*Ort:* `ComponentChanges.makeChangePropertyChange()`.
Beide erzeugten denselben Wire-Eintrag, aber `setProperty` behielt den Key im committeten Property-Map — ein anschließendes `removeProperty()` sendete dieselbe Änderung ein zweites Mal. Ein explizites `undefined` gilt jetzt auch intern als Entfernung.

**[VIEW-23]** ~~`ComponentChanges.changeToken()` verwirft den Create-Token einer noch nicht geflushten Komponente.~~ **✅ Behoben**
*Ort:* `ComponentChanges.ts`.
`#token` startet auf `VoidToken` und führt nur den zuletzt *geschriebenen* Token. Ein Reset auf den Void-Token vor dem ersten Change Trail räumte deshalb `#nextToken` ab, und der `CreateEntities`-Eintrag ging ganz ohne `token`-Feld raus: der Kernel registrierte die Entity mit `token: undefined` und suchte nie ein Shadow Object dazu. Ein ausstehender Create behält seinen Token; `makeCreateEntityChange()` emittiert keinen Create mehr ohne.

**[VIEW-24]** ~~Ein fehlgeschlagener Context-Wechsel hinterlässt eine Komponente, die sich für lebendig hält.~~ **✅ Behoben**
*Ort:* `ViewComponent.ts`.
Der Setter wies `#context` zu, *bevor* `addComponent()` laufen durfte — und das wirft seit LOW-4 bei einem disposed Context. Ergebnis: `destroy()` war schon durch, `isDestroyed` meldete trotzdem `false`, und jedes `setProperty` / `removeProperty` / `dispatchShadowObjectsEvent` lief ins Leere. Ein disposed Context wird jetzt vor dem Teardown abgewiesen, die Komponente behält ihren bisherigen Context; scheitert das Beitreten aus einem anderen Grund, bleibt sie zerstört statt auf einen fremden Context zu zeigen.

**[VIEW-25]** ~~`ComponentContext.changeOrder()` guardet gegen `dispose()`, nicht gegen `clear()`.~~ **✅ Behoben**
*Ort:* `ComponentContext.ts`.
Eine Order-Änderung nach `clear()` schob die uuid zurück in `#rootComponents`, ohne View-Instanz — der nächste `clear()` warf `component-context panic: #rootComponents is not empty!`. Der Guard fragt jetzt, ob der Context die Komponente überhaupt (noch) hält.

**[VIEW-26]** ~~`ComponentContext.removeFromParent()` dereferenziert den Kind-Eintrag ungeguardet.~~ **✅ Behoben**
*Ort:* `ComponentContext.ts`.
`destroyComponent()` ist public und löst die Komponente nicht von ihrem Vater; nach `destroyComponent(c); buildChangeTrails(); c.destroy();` warf der Teardown einen `TypeError`. Ein Kind, das der Context nicht mehr hält, wird jetzt ignoriert — analog zu den Geschwister-Pfaden.

**[ELEM-1]** ~~`<shae-worker>` erzeugt eine unbehandelte Promise-Rejection beim Teardown im selben Task.~~ **✅ Behoben**
*Ort:* `ShaeWorkerElement.ts`.
`connectedCallback()` startet per `start()` automatisch, der `src`-Effekt ruft `importScript()`; beide warten auf `ShadowEnv.ready()`, das seit VIEW-8 mit einem `ShadowEnvDestroyedError` ablehnt — und niemand beobachtete diese Promises. Connect und Disconnect im selben Task (was `#deferDestroy` ausdrücklich vorsieht) ergab damit pro Element eine unbehandelte Rejection. Beide Aufrufstellen fangen jetzt ab: ein Teardown ist still, alles andere wird geloggt. Für Aufrufer, die tatsächlich warten, lehnen `start()` und `importScript()` unverändert ab.

### 3.3 MEDIUM — bemerkenswerte Auswahl

| ID | Beschreibung | Ort |
|---|---|---|
| **VIEW-5** | `<shae-prop>` löst seinen Eltern-`<shae-ent>` nur in `connectedCallback` auf — DOM-Verschiebungen ohne Disconnect lassen den Prop am alten Ent kleben. | `ShaePropElement.ts:9–18, 323` |
| **VIEW-6** | `MutationObserver` in `ShaeEntElement` setzt `subtree: false` — In-Tree-Reparenting via Zwischen-Container wird nicht gesehen. Die Beobachtung folgt dem Element inzwischen an seine neue Position, der Zwischen-Container bleibt offen. | `ShaeEntElement.ts` |
| **VIEW-6b** | `Element.moveBefore` ist für ein `<shae-ent>` kein atomarer Umzug: ohne `connectedMoveCallback` fällt der Browser auf `disconnectedCallback` + `connectedCallback` zurück, die Entity wird zerstört und unter derselben uuid neu erzeugt — im Change Trail ein Abriss statt einer Bewegung. | `ShaeEntElement.ts` |
| **VIEW-7** | `ShadowEnv.envProxy`-Setter feuert `start()` fire-and-forget; ein nachfolgender Reassign kann durch das *alte* `start().then()` das `proxyReady`-Flag des neuen Proxys verfälschen. | `ShadowEnv.ts:117–125` |
| ~~**VIEW-8**~~ | ~~`ShadowEnv.destroy()` löscht alle Listener — `syncWait()`-Aufrufer hängen für immer.~~ **✅ Behoben** — jedes ausstehende `ready()` und `syncWait()` wird mit einem neuen `ShadowEnvDestroyedError` abgelehnt statt hängen gelassen; Aufrufe nach `destroy()` lehnen sofort ab, `sync()` wird zum No-op, ein bereits eingeplanter Sync läuft nicht mehr. `destroy()` ist idempotent und zerstört den `envProxy` nur noch einmal. | `ShadowEnv.ts` |
| **VIEW-9** | `removeTransferables` mutiert die Caller-Trail-Einträge per `delete`. | `RemoteWorkerEnv.ts:23–40` |
| **VIEW-10** | `LocalShadowObjectEnv` ignoriert `waitForConfirmation`; `MessageToView` läuft via `queueMicrotask`, sodass der `AfterSync`-Event vor den Worker-Nachrichten feuert. **Verhaltensasymmetrie zu `RemoteWorkerEnv`.** | `LocalShadowObjectEnv.ts:40`, `Kernel.ts:316–319` |
| ~~**VIEW-11**~~ | ~~`ShaePropElement.isShaeEntElement = true` ist offenbar Copy-Paste — nutzt aber `findEntNode` zur Eltern-Suche, was potenziell falsche Treffer ergibt.~~ **✅ Behoben** — das Flag heißt jetzt `isShaePropElement`; ein in einem `<shae-prop>` verschachteltes `<shae-prop>` läuft beim Ancestor-Walk korrekt durch bis zur echten Host-Entity. Abgedeckt von `prop-element-host.test.js`. | `ShaePropElement.ts` |
| ~~**KERN-5**~~ | ~~`Entity.parentUuid`-Setter ruft `removeFromParent()` *vor* dem Resolven des neuen Vaters; wirft `getEntity` einen Fehler, ist die Entity verwaist.~~ **✅ Behoben** — `getEntity` wird *vor* dem Detach aufgerufen; `Kernel.setParent` validiert die neue UUID vorab. | `Entity.ts`, `Kernel.ts` |
| ~~**KERN-6**~~ | ~~`Registry.clear()` löscht `#truthyPropRoutes` nicht — Test-Pollution + Akkumulation in langlebigen Registries.~~ **✅ Behoben** — `clear()` räumt auch die Prop-basierten Routen ab. | `Registry.ts` |
| ~~**KERN-7**~~ | ~~`useContext`/`useParentContext`/`useProperty` ignorieren `options` bei Cache-Hit (z. B. `compare`). Der erste Aufrufer „gewinnt", was leise zu falschen Equality-Vergleichen führen kann.~~ **✅ Behoben** — bei Cache-Hit mit abweichender `compare`-Funktion wird ein `console.warn` emittiert; das alte Reader-Objekt bleibt aus Kompatibilitätsgründen erhalten. | `Kernel.ts` |
| **VIEW-12** | `ShaePropElement` parst numerische Attribute ohne Warnung — `Number("foo")` → `NaN` propagiert. | `ShaePropElement.ts:177–205` |
| **VIEW-13** | `ShaeEntElement.#dispatchRequestParent`-Microtask prüft `isConnected` nicht; nach Disconnect bubbelt ein Streu-Event. | `ShaeEntElement.ts:419–423` |

### 3.4 LOW (Auswahl)

- **LOW-1** `Kernel.destroy()` ruft `traverseLevelOrderBFS().reverse()` — mutiert ggf. den internen Cache an Ort und Stelle (`Kernel.ts:781`).
- **LOW-2** `provideContext({clearOnDestroy: true})` registriert bei wiederholten Aufrufen jedes Mal eine neue Cleanup-Closure (`Kernel.ts:435–439, 476–480`).
- **LOW-3** `SignalsPath.dispose()` emittiert beim Teardown noch ein finales `'value' = undefined`, was Listener verwirren kann.
- **LOW-4** Globale Singletons (`__shadowEntsContexts`, `__shadowEnvs`, `FrameLoop.gUniqInstance`) erschweren Test-Isolation und Multi-Instance-Szenarien. **Teilweise entschärft** — `ComponentContext.dispose()` gibt den Namespace wieder frei (vorher blieb jeder je erzeugte Kontext für die Lebensdauer der Seite in `__shadowEntsContexts` stehen); `ShadowEnv.destroy()` räumt `__shadowEnvs` bereits ab. `FrameLoop.gUniqInstance` ist unverändert offen.
- **LOW-5** Konstruktor von `ComponentContext` gibt eine vorhandene Instanz via `return` zurück — funktioniert, ist aber überraschend.

### 3.5 Performance

| Befund | Auswirkung |
|---|---|
| **`postMessage`-Schwall**: jede Property-Änderung triggert einen Microtask, dann eine `postMessage`. Animationen mit n Updates/Frame erzeugen n Nachrichten. | Hohe Worker-Roundtrip-Last bei 60 Hz. Empfehlung: optionales RAF-Coalescing. |
| **`cloneChangeTrail`** (`structuredClone` pro Eintrag) ist im `LocalShadowObjectEnv` standardmäßig **aktiv** — reine CPU-Last in einem In-Process-Env. | Default sollte für Local-Mode wohl umgekehrt sein (`disableStructuredClone: true`). |
| **`buildChangeTrails`** macht drei volle BFS-Durchläufe (Strukturell/Content/Removal); Cache wird bei den meisten Mutationen invalidiert. | Bei tausenden Komponenten teuer. |
| **`Entity.addChild`** sortiert bei jedem Insert (O(n²) bei Batch-Inserts). | Empfehlung: einmal nach Batch sortieren. |
| **`SignalsPath.#updateGetValueFromSignalsEffect`** zerstört und erzeugt den Effect neu bei jedem Add/Remove — bei dynamischen Kontexten heiß. | Inkrementelles Subscribe wäre günstiger. |
| **`Transferables` nur bei `SendEvents`** — große `ArrayBuffer` in `ChangeProperties` werden strukturell kopiert, nicht transferiert. | Property-API für Transferables fehlt. |
| **`ContextLost`-Replay** (`reCreateChanges`): bei N Entities × M Props ein voller Re-Build inkl. allen `postMessage`. | Akzeptabel für Recovery, aber teuer; sollte bewusst getriggert werden. |
| **`Registry.findTokensByRoute`** ist O(tokens × props × tokens) pro Pass. | Bei tiefen Routen-Graphen messbar; akzeptabel für typische Größenordnungen. |

### 3.6 API-/Design-Smells

- `onDestroy` ist gleichzeitig Symbol-Methode, Event-Name und API-Callback — drei Bedeutungen, durch Eventize teilweise verwoben. Dokumentation oder Trennung würde helfen.
- `IShadowObjectEnvProxy` definiert kein `isDestroyed`, keine `error`-Events und keinen `ready`-Promise.
- `EntityEntry.usedConstructors: Map<Constructor, Set<ShadowObjectType>>` — die innere `Set` hat in der aktuellen Logik immer Größe 1. Tote Komplexität.
- `appendRoute(route: string)` mischt Token-Alias und Prop-bedingte Routen in einer Methode (`@`-Präfix-Sniffing).
- `Kernel.parse()` (privat) und die public Kernel-Methoden divergieren leise (z. B. der nicht-durchgereichte Auto-Destroy-Parameter).
- `ShaeElement.syncShadowObjects` (Methode) vs. modul-private Funktion gleichen Namens — verwirrend.
- Worker-Timeouts sind feste Konstanten (5 s / 60 s), nicht überschreibbar — Tests warten potenziell eine Minute auf einen kaputten Worker.

---

## 4. Test-Abdeckung

### 4.1 Inventar

**vitest** (`packages/shadow-objects/src/**/*.spec.ts`, 13 Dateien):
`Kernel.spec.ts` (1549 LoC), `Registry.spec.ts`, `ShadowObject.spec.ts`, `SignalsPath.spec.ts`, `ShadowEnv.spec.ts`, `LocalShadowObjectEnv.spec.ts`, `RemoteWorkerEnv.spec.ts`, `ViewComponent.spec.ts`, `ComponentContext.spec.ts`, `ComponentChanges.spec.ts`, `ComponentMemory.spec.ts`, `props-utils.spec.ts`, `ConsoleLogger.spec.ts`.

**`shadow-objects-testing/`** (vitest browser-mode + Playwright-Provider, echtes Chromium): 12 Dateien — `build-change-trail`, `change-props`, `change-tokens`, `ComponentContext`, `ent-element-teardown`, `forward-custom-events`, `local-env-entities`, `prop-element-host`, `remove-and-append-e`, `send-events`, `worker-element-teardown`, `emit-helper/emit-helper`.

**`shadow-objects-e2e/`** (Playwright, Chromium + Firefox): 10 Dateien — `async-events`, `auto-destruct`, `bundle`, `create-element`, `dynamic-dom`, `multi-env`, `remote-worker-env`, `shae-worker`, `upgrade-timing`, `worker-failure`. Assertions liegen in den Test-Pages, der gemeinsame `runPageTests`-Helper macht daraus je einen Playwright-Test pro `data-testresult`.

### 4.2 Coverage-Heuristik

| Bereich | Status |
|---|---|
| Kernel-Lifecycle, Token-Routing, Registry, ShadowObject-API | ✅ **gründlich** |
| `ShadowObjectCreationAPI` (Properties, Context, Resource, Effect, Signal, Memo, on/once, onDestroy, emit) | ✅ **gründlich** |
| `OnCreate`/`OnDestroy` inkl. Token-Wechsel | ✅ **gründlich** |
| `SignalsPath`-Vorrang | ✅ Happy Path; ❌ keine Cleanup-/Error-Tests |
| `ChangeTrail`-Korrektheit (drei Phasen) | ✅ **gründlich** über drei Ebenen (Modell, DOM, E2E) |
| `ViewComponent` ↔ Entity | ✅ gründlich |
| `ViewComponent`-Zerstörungs-Kontrakt, Zyklen-Abweisung, Token-Normalisierung | ✅ **gründlich** |
| `ComponentContext`-Sortierordnung + Baum-Invarianten | ✅ **gründlich** |
| `ComponentContext.dispose()`-Kontrakt (Namespace-Freigabe, Inertheit, Abweisung) | ✅ **gründlich** |
| `ComponentChanges` / `ComponentMemory` (Unit) | ✅ **gründlich** — eigene Specs, vorher nur indirekt über Trail-Vergleiche |
| `ShadowEnv` Setup/Teardown | ✅ **gründlich** — `syncWait()`/`AfterSync`, der `destroy()`-Kontrakt, `ProxyFailed` und der `envProxy`-Swap zur Laufzeit samt Wiederherstellung der Entities aus der Component Memory. Gefahren werden Doppelgänger → Doppelgänger und Doppelgänger → `LocalShadowObjectEnv` (`ShadowEnv.spec.ts:521`, `:536`) sowie Remote → Remote in der E2E-Seite `worker-failure`; Local → Remote fährt kein Fall |
| `LocalShadowObjectEnv` | 🟡 **partiell** — Smoke + 1 Sync; `destroy()`-Registry-Kontrakt (geteilte Default-Registry vs. eigene Registry) jetzt gründlich getestet |
| `RemoteWorkerEnv` | ✅ **gründlich** — `RemoteWorkerEnv.spec.ts` (19 Fälle über einen Worker-Doppelgänger) deckt Ausfall, Termination, Ablehnung des Ausstehenden und des Nachgereichten, `destroy()`-Kontrakt; E2E-Seite `worker-failure` fährt denselben Weg über echtes `postMessage` inklusive Erholung. Nicht abgedeckt: ein `applyChangeTrail`, das beim `destroy()` schon unterwegs ist (VIEW-1) |
| `MessageRouter` | ❌ keine direkten Tests |
| `WorkerRuntime` | ❌ keine direkten Tests |
| Custom Elements (`<shae-prop>`!) | ✅ **gründlich** — Host-Suche (`prop-element-host.test.js`), Markup-Upgrade-Pfad (E2E) und das Typ-Parsing tabellengetrieben über alle 42 Typnamen, beide Trennmuster, die fehlertoleranten und die vier fehlschlagenden Eingaben, `no-trim`, die Falsy-Werte über beide Pfade und den Change Trail (`prop-element-types.test.js`) |
| Utils | 🟡 `props-utils.spec.ts` und `ConsoleLogger.spec.ts` — `FrameLoop`, `waitForMessageOfType`, `cloneChangeTrail`, `attr-utils`, `array-utils`, `generateUUID`, `toNamespace`, `toUrlString`, `importModule` haben keine eigenen Tests. `array-utils` wird indirekt über `ComponentContext.spec.ts` und `ComponentChanges.spec.ts` mitgeprüft, `waitForMessageOfType` über `RemoteWorkerEnv.spec.ts` |
| Worker-Init-Failure / Terminate / Message-Race | 🟡 **partiell** — ein Ausfall während des Load-Handshakes, `terminate()` beim Ausfall, verspätete Nachrichten nach `destroy()` und der doppelte Ausfall sind abgedeckt; ein `Worker`-Konstruktor, der an einer kaputten URL selbst wirft, ist es nicht |

### 4.3 Qualität

- Generell sehr lesbar, deklarative Assertions mit Kontext-Labels.
- Konsequentes `Registry.get().clear()` / `ComponentContext.get().clear()` in `afterEach`.
- Keine `.only` oder skipped Tests; Playwright-Konfig setzt `forbidOnly: true` für CI.
- **Flake-Risiko:** `ShadowEnv.spec.ts` enthält an zwei Stellen `await new Promise(r => setTimeout(r, 50))` — magische 50 ms statt deterministischer Microtask-Drains. Die neuen `syncWait`-Fälle warten stattdessen auf `AfterSync` und benutzen ein Timeout nur als Fehlerabbruch.
- E2E-Pattern (Page schreibt `data-testresult`) ist konzise, erschwert aber Debugging — Assertions liegen außerhalb des Spec-Files.

### 4.4 Konkrete Test-Lücken (ticket-fertig)

> **E2E im Detail:** [`packages/shadow-objects-e2e/TEST-PLAN.md`](packages/shadow-objects-e2e/TEST-PLAN.md) (2026-08-02) analysiert die Playwright-Suite einzeln und listet 50 benannte Testfälle mit Seiten, Fixtures und Priorität. **Umgesetzt am 2026-08-02:** Harness-Reparatur, `multi-env`, `dynamic-dom`, `upgrade-timing`, `async-events`, `create-element` und der Umbau von `bundle.html` — die Suite ging von 44 auf 298 Tests. Dabei sind zwei Framework-Defekte aufgefallen; einer davon steht noch offen, siehe unten und [`KNOWN-DEFECTS.md`](packages/shadow-objects-e2e/KNOWN-DEFECTS.md). Die folgende Liste bleibt der ebenen-übergreifende Überblick.

**[ELEM-1] `document.createElement()` erzeugt keine funktionsfähigen shae-Elemente.** Alle drei Custom Elements setzen im Konstruktor Attribute (`style.display = 'contents'`, `setAttribute('ns')`, `removeAttribute('token')`), was die Custom-Elements-Spec verbietet. Chromium und Firefox brechen das Upgrade ab und liefern ein `HTMLUnknownElement` — ohne `viewComponent`, ohne `uuid`, ohne Verbindung zum Environment. Über `innerHTML` funktioniert es, weshalb der Defekt bisher unsichtbar blieb: alle Testseiten benutzten parser-erzeugtes Markup. **Tragweite:** jede React-/Vue-/Svelte-Integration und jeder eigene Wrapper erzeugt Elemente programmatisch. **Fix:** Attribut- und Style-Zuweisungen aus den Konstruktoren in `connectedCallback` verschieben; `display: contents` als Stylesheet-Regel statt Inline-Style.

**[ELEM-3] `autoDestructionOnParentRemoval` ist über `<shae-ent>` nicht erreichbar.** Kein Attribut, und `ShaeEntElement` erzeugt seine `ViewComponent` ohne die Option — das Feature ist nur über die programmatische API nutzbar. Ein DOM-seitiger Test der Kaskade ist deshalb derzeit nicht möglich.

- Worker-Init-Failure (`Worker`-Konstruktor mit kaputter URL).
- `destroy()` mitten im Sync — ein ausstehendes `applyChangeTrail` läuft in den `WorkerChangeTrailTimeout`, statt abgewickelt zu werden. *(VIEW-1)*
- `ShadowEnv.envProxy`-Swap zur Laufzeit von `LocalShadowObjectEnv` auf `RemoteWorkerEnv` (die Gegenrichtung und Remote → Remote sind abgedeckt).
- `<shae-ent>`-`attributeChangedCallback` für `token` / `parent-id` / `forward-custom-events` (Re-Set auf leer).
- `<shae-worker>`-`src`-Wechsel nach `start()` (Re-Import-Pfad).
- `Transferables` über echten Worker (nicht nur In-Process).
- `provideContext` → Provider-Entity stirbt vor Consumer — `useContext`-Effect-Cleanup.
- `Registry.removeRoute` / `clear()` während aktive Entities existieren — Re-Upgrade-Verhalten.
- Mehrfaches `shadowObjects.define` mit gleichem Token.

### 4.5 Empfehlungen (priorisiert)

1. **Magische Timeouts in `ShadowEnv.spec.ts` durch deterministische Drains ersetzen** — eliminiert das einzige offensichtliche Flake-Risiko.
2. **`<shae-prop>` end-to-end testen** — öffentliches Element ohne direkte Tests.
3. **Nicht-triviale Utils specifizieren** — vor allem `FrameLoop`, `cloneChangeTrail` (Worker-Boundary).
4. **`<shae-worker>` re-import-Test und der `envProxy`-Swap Local → Remote** — beide rühren an den aktuell ungetesteten `MessageRouter`/`WorkerRuntime`.

---

## 5. Build & Tooling

> **2026-05-09 — Build-System wurde grundlegend erneuert.** Details: [`CHANGELOG.md`](CHANGELOG.md) (Top-Level), Design-Doku: [`docs/superpowers/specs/2026-05-09-build-system-renewal-design.md`](docs/superpowers/specs/2026-05-09-build-system-renewal-design.md). Die folgenden Abschnitte spiegeln den neuen Stand und nur noch die offenen Punkte.

### 5.1 Pipeline (`packages/shadow-objects`)

Ein Skript: `node build.mjs`. Drei Stages — esbuild-Transpile (`src/**` → `dist/src/**`, preserved layout) + tsc emit-only Declarations (`tsconfig.lib.json`) + esbuild Inline-Worker-Bundle (`dist/src/bundle.js` → `dist/bundle.js`). Anschließend `scripts/makePackageJson.mjs` für `dist/package.json` (resolvt `workspace:*` + `catalog:`, wendet `package.override.json` an).

Veröffentlicht wird `dist/` mit ESM-only, mehreren Subpath-Exports (`./elements.js`, `./shae-ent.js`, `./shae-prop.js`, `./shae-worker.js`, `./shadow-objects.js`, `./shadow-objects.worker.js`, `./bundle.js`).

**Verbleibende Auffälligkeiten:**
- `package.override.json` und `package.json#sideEffects` enthalten noch tote `build/src/...`-Pfade aus der alten Pipeline. Folgenlos (doppelte Wahrheit), sollte aber konsolidiert werden.
- `exports`-Konditionen: Reihenfolge `import` vor `types`. Unter strikter Node-ESM-Resolution (`moduleResolution: node16/nodenext`) sollte `types` zuerst stehen. Aktuell unter `bundler` toleriert, aber latentes Risiko für Konsumenten.

### 5.2 Dependency-Hygiene

- Versionen leben jetzt zentral in `pnpm-workspace.yaml#catalog:` — keine Drift mehr möglich. ✅
- Tooling auf modernen Major-Versionen: vitest 4, biome 2.5, turbo 2.10, esbuild 0.28, Playwright 1.62, TypeScript 7, happy-dom 20, pnpm 11. ✅
- Zwei bewusste Holdbacks, jeweils mit Begründung im Kommentar in `pnpm-workspace.yaml`: `vite` (Override auf 7.x, weil Oxc keine nativen Decorators absenkt), `turbo` (2.10.9 wegen `minimumReleaseAge`).
- signalize 1.0.0-beta.0 + eventize 6.0.0 sind drin; der alte 5.x-Holdback ist erledigt, weil signalize jetzt auf `^6.0.0` peert. Beide Pakete werden nur gemeinsam gehoben, und `pnpm why -r @spearwolf/eventize` muss danach genau eine Version melden. ✅
- **Offen:** signalize von `1.0.0-beta.0` auf das finale `1.0.0` ziehen, sobald es da ist — dann auch den `minimumReleaseAgeExclude`-Eintrag mitziehen oder streichen.
- **Offen:** Sobald Oxc native Decorators absenkt, den `vite`-Override entfernen und auf 8.x gehen.
- Kern-Lib hat **keine `peerDependencies`** — `@spearwolf/eventize`/`signalize` sind harte Deps; bei Mehrfach-Resolutionen drohen Duplikate.

### 5.3 Lint / TS

- `strict: true` **mit `strictNullChecks: true`** in der Wurzel-`tsconfig.json`. ✅
- Biome-Root deaktiviert (analog zur alten ESLint-Config) `noExplicitAny`, `noTsIgnore`, `noNonNullAssertion`, `noImplicitAnyLet`. Bewusste Lockerung; `noNonNullAssertion` wiegt am schwersten, weil ein `!` die eingeschaltete Null-Prüfung wieder aushebelt.
- `any`-Hotspots (heuristisch): `ConsoleLogger.ts` (~20), `Kernel.ts` (~11), `ShadowObject.ts` (~4).
- Biome meldet aktuell ~30 Warnings im Source (z. B. `useIterableCallbackReturn`, `noShadowRestrictedNames`, `useNodejsImportProtocol`). Schrittweise abarbeiten oder bewusst weiter unterdrücken.

### 5.4 Sonstige Stolperfallen auf frischer Maschine

- `pnpm install` installiert keine Playwright-Browser — manuelles `pnpm exec playwright install chromium firefox` nötig (wird in CLAUDE.md erwähnt).
- `engines.node: ">=24.13.0"` blockiert Mitwirkende auf Node 22.x. Hinweis: Node 24+ ships eine inerte `localStorage`-Stub auf `globalThis`; für Tests gefixt durch `packages/shadow-objects/vitest.setup.ts`.
- `make:todo` ist Honor-System (kein Pre-Commit-Hook, kein CI-Check).
- Manuelles `CHANGELOG.md`-Pflegen ohne Changesets/release-please.
- **npm-Publish läuft über OIDC Trusted Publishing**, nicht über ein `NPM_TOKEN`-Secret. Einmalig auf npmjs.com je Paket einzutragen (GitHub Actions, Repo `spearwolf/shadow-objects`, Workflow `deploy.yml`); ohne diesen Eintrag bricht `deploy.yml` beim OIDC-Austausch ab. `turbo` läuft im Strict-Env-Mode — wer dem Publish-Pfad eine neue Umgebungsvariable gibt, muss sie in `turbo.json#tasks.publishNpmPkg.passThroughEnv` eintragen, sonst kommt sie im Skript nie an.
- **`deploy.yml` darf nicht umbenannt und nicht in einen `workflow_call`-Reusable verschoben werden.** npm prüft den OIDC-Claim gegen den registrierten Dateinamen und validiert dabei den *aufrufenden* Workflow — aus `ci.yml` heraus aufgerufen käme der Publish als `ci.yml` an und der Trusted-Publisher-Eintrag würde nicht mehr greifen. Deshalb bleibt das Gating bei `workflow_run`; der Checkout ist seit 2026-08-15 auf `github.event.workflow_run.head_sha` gepinnt, sonst publiziert der Job den Default-Branch-HEAD statt des von der CI geprüften Commits.
- Die `dist/`-Form von `@spearwolf/shadow-objects` ist Teil des öffentlichen Kontrakts, wird aber von keinem Task geprüft. Die beiden Snapshots, die das früher belegen sollten, sind entfernt (siehe `CHANGELOG.md`, 2026-08-15); eine echte Prüfung im Build oder in einem Test steht aus.

---

## 6. Beispiel-Anwendung `shae-offscreen-canvas`

Ein reines JS-Paket (kein TS), `src/` wird ohne Bundle-Schritt veröffentlicht. Demonstriert idiomatische Nutzung:

- `<shae-ent>` mit verschachtelten Tokens und Namespaces (`ns="foo"`).
- `<shae-worker>` lokal vs. remote.
- `<shae-offscreen-canvas>` als eigenes Custom Element, das per `vc.dispatchShadowObjectsEvent(OffscreenCanvas, payload, [offscreen])` einen `OffscreenCanvas` als Transferable in den Worker reicht.
- Drei gestapelte Canvas-Instanzen mit unterschiedlichen `pixel-zoom`/`fps`/`ns`-Attributen.

**Ergonomie-Feedback an die Kern-Lib:**
- ~~Das Beispiel zeigt, dass `vc.syncShadowObjects()` nach Property-Batches **explizit** aufgerufen werden muss. Im README/Getting-Started ist das nicht ausreichend hervorgehoben — ein Naiv-Konsument bekommt Latenz, ohne zu verstehen, warum.~~ ✅ Der Sync-Takt ist jetzt in README, `getting-started.md`, `concepts.md`, `cheat-sheet.md` und `best-practices.md` als eigener Punkt inklusive Race-Condition-Warnung erklärt.
- Der Transferable-Parameter (`[offscreen]`) bei `dispatchShadowObjectsEvent` ist ein **mächtiges, aber kaum dokumentiertes** Feature.
- `console.debug('hello … 🦄')` in `src/bundle.js` ist eine Log-Rauschen-Falle für Konsumenten.
- `three@^0.179.1` als harte Demo-Dep zieht beim `pnpm install` viel Volumen.

---

## 7. Empfehlungen — priorisiertes Backlog

### 7.1 Muss vor 1.0

1. ~~**Auto-Destroy-Feature komplett verdrahten** — Feld in `ICreateEntitiesChange`, durchreichen in `parse()`, Re-Parenting-Subscription pflegen, E2E-Test mit Worker. *(KERN-1, KERN-2)*~~ ✅ Erledigt (Kernel- und ViewComponent-Specs sowie Playwright-E2E `auto-destruct.spec.ts` mit echtem `RemoteWorkerEnv`).
2. ~~**`destroyEntity` rekursiv über Kinder** — Politik definieren (kaskadieren oder zu Root befördern). *(KERN-3)*~~ ✅ Erledigt (Variante C).
3. **`MessageRouter`-Doppel-Confirm im Catch-Pfad fixen.** *(VIEW-3)*
4. **Worker-Fehlerpfade härten:** ~~`error`/`messageerror`-Handler~~, ausstehende Promises bei `destroy()` rejecten, ~~expliziter `terminated`-Status~~. *(VIEW-1, VIEW-2)* — 🟡 Handler, `WorkerFailedError`/`WorkerDestroyedError`, `isDestroyed`, `RemoteWorkerEnv.WorkerFailed` und `ShadowEnv.ProxyFailed` stehen; `destroy()` bricht das Ausstehende weiterhin nicht ab (VIEW-1).
5. ~~**CI lässt E2E nicht aus** — Playwright-Browser im CI-Image installieren, `test:ci` umstellen oder zweiten Job ergänzen.~~ ✅ Erledigt — eigener Job `e2e`, Chromium und Firefox, vor dem npm-Publish.
6. ~~**Cache-Invalidierung von `traverseLevelOrderBFS` bei programmatischer Destruktion.** *(KERN-4)*~~ ✅ Erledigt.

### 7.2 Sollte zeitnah

7. **DOM-In-Place-Re-Parenting beobachten** — `MutationObserver(subtree:true)` auf einer höheren Ebene oder Re-Lookup in `<shae-prop>` bei `slotchange`/Mutation. *(VIEW-5, VIEW-6)*
8. **`ShadowEnv.envProxy`-Swap-Sicherheit:** Closure-Identitätscheck vor `proxyReady`-Toggle. *(VIEW-7)*
9. **`syncWait()` muss nach `destroy()` rejecten.** *(VIEW-8)*
10. **`LocalShadowObjectEnv.applyChangeTrail`** muss `MessageToView`-Reihenfolge zur Remote-Variante symmetrisch halten. *(VIEW-10)*
11. **Test-Lücken schließen** — Reihenfolge in §4.5.
12. **`Registry.clear()`** muss `#truthyPropRoutes` mitlöschen. *(KERN-6)*
13. **Magische `setTimeout(50)`-Waits** in `ShadowEnv.spec.ts` durch deterministische Drains ersetzen.

### 7.3 Mittelfristig

14. ~~**`strictNullChecks: true`** schrittweise einschalten — größter Hebel für Typensicherheit.~~ ✅ Erledigt — in drei Etappen (utils/worker/registry, view/elements, `Kernel`), das Flag steht in der Wurzel-`tsconfig.json`.
15. **`exports`-Konditionen umsortieren** (`types` vor `import`) für strikte Node-ESM-Konsumenten.
16. **`peerDependencies` für `@spearwolf/eventize`/`signalize`** dokumentiert beschließen.
17. **API-Aufräumen:** `appendRoute` aufteilen, `onDestroy`-Tripel-Bedeutung dokumentieren oder trennen, `IShadowObjectEnvProxy.isDestroyed`/`error`-Surface ergänzen, Worker-Timeouts konfigurierbar machen.
18. **Performance-Knopf:** `disableStructuredClone` als Default für `LocalShadowObjectEnv`; optionales RAF-Coalescing bei hoher Update-Frequenz.
19. **`sideEffects`-Listen konsolidieren:** `package.json` und `package.override.json` haben noch tote `build/src/...`-Einträge aus der alten Build-Pipeline — auf `dist/src/...` reduzieren.
20. **Biome-Warnings abarbeiten** (~30 Stück): `useIterableCallbackReturn`, `noShadowRestrictedNames` etc. — entweder fixen oder Regel bewusst abschalten.

### 7.4 Beispiel-App / Dokumentation

21. **Transferable-API** (`dispatchShadowObjectsEvent(type, payload, [transferable])`) in `guides.md` an einem echten Beispiel zeigen — `OffscreenCanvas` aus der Demo. Der Sync-Takt-Teil dieses Punktes ist erledigt (2026-08-02).
22. **Demo-`console.debug`-Statement** entfernen.

---

## 8. Zusammenfassung

`shadow-objects` ist konzeptionell ausgereift und kompakt: das ECS-Modell, die View/Worker-Spiegelung über ein 4-Methoden-Proxy und das `ShadowObjectCreationAPI` bilden ein in sich konsistentes, gut testbares Framework. Der Code ist überwiegend klar geschrieben, das Reaktivitätsmodell stützt sich konsequent auf zwei eigene, aktiv gepflegte Bibliotheken.

Die größten Risiken liegen weniger in der Architektur als in den **Fehler- und Lebenszyklus-Pfaden**: der `MessageRouter` schluckt Exceptions, und `MessageRouter`/`WorkerRuntime` haben nach wie vor keine eigenen Tests. Die Lebenszyklus-Punkte sind abgearbeitet, der Worker-Ausfall ebenso, die E2E-Suite läuft in CI; offen bleibt der gewollte Abbau, der ausstehende Anfragen in ihren Timeout laufen lässt (VIEW-1).

Die empfohlene Reihenfolge ist: erst die verbliebenen **Muss-Punkte aus §7.1** angehen (`MessageRouter`-Doppel-Confirm und der Teardown-Rest von VIEW-1), dann die **Test-Lücken aus §4.5/§7.2** schließen, dann die **Tooling-Modernisierung aus §7.3** in Angriff nehmen.

In der jetzigen Version (0.30.2) ist das Framework für Demos, Spielwiesen und kleine Anwendungen einsetzbar; vor einem produktiven 1.0-Stempel sollte zumindest die §7.1-Liste abgearbeitet sein.
