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
1. ~~**Worker-Fehlerpfade unter-implementiert** — keine `error`/`messageerror`-Handler, keine Reconnect-Logik, ausstehende Promises hängen nach Worker-Tod ewig (oder bis 5–60 s Timeout).~~ **Weitgehend behoben (VIEW-1, VIEW-2)** — `error` und `messageerror` werden vor dem Load-Handshake abonniert, ein Ausfall terminiert den Worker und lehnt alles Ausstehende mit `WorkerFailedError` ab; `ShadowEnv.ProxyFailed` meldet ihn nach außen, ein neuer `envProxy` ist der Weg zurück. Der gewollte Abbau zieht gleich: `destroy()` bricht den Controller ebenfalls ab und lehnt jede laufende Anfrage sofort mit `WorkerDestroyedError` ab (VIEW-1).
2. ~~**Neues Feature „auto destruction on parent removal" (Commit 89c59c2) ist im Datenpfad nicht erreichbar** und behandelt Re-Parenting nicht.~~ **Behoben (KERN-1, KERN-2)** — Flag fließt jetzt durch `ICreateEntitiesChange` → `ComponentChanges.create()` → `parse()`; Subscription wird bei Re-Parent neu verdrahtet.
3. ~~**`destroyEntity` rekursiert nicht über Kinder** — bei Eltern-Destruktion bleiben Nicht-Auto-Kinder als verwaiste Einträge im Kernel.~~ **Behoben (KERN-3)** — Variante C: Flagged-Kinder kaskadieren, ungeflaggte werden zu Roots befördert.
4. **DOM-In-Place-Re-Parenting wird nur teilweise beobachtet** — bei `<shae-ent>` folgt die Beobachtung dem Element an seine neue Position, sieht aber einen zwischengeschobenen Container nicht (`subtree: false`, VIEW-6).
5. ~~**CI lässt das gesamte E2E-Paket aus** — der Worker-Roundtrip wird damit faktisch nicht von CI verifiziert.~~ **Behoben** — eigener Job `e2e` in `.github/workflows/ci.yml`, Chromium und Firefox bei jedem Push; der Deployment-Workflow hängt über `workflow_run` daran.
6. ~~**`MessageRouter` schluckt Fehler** durch doppeltes `AppliedChangeTrail` im Catch-Pfad — Konsumenten sehen Erfolg trotz interner Exception.~~ **Behoben (VIEW-3)** — ein Change Trail erzeugt genau eine Bestätigung, und nur dort, wo eine Seriennummer danach gefragt hat.

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
7. Auf `destroyEntity`: `[onDestroy]`-Symbol-Methode + `onDestroy`-Event mit verschiedenen Prioritäten räumen Properties, Kontexte, Signals, Effects auf. Derselbe Teardown läuft, wenn ein Shadow-Object durch Token- oder Route-Wechsel die Konstruktorenmenge einer weiterlebenden Entity verlässt (`destroyShadowObject`) — je Shadow-Object genau einmal.

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

**[VIEW-1]** ~~`RemoteWorkerEnv.applyChangeTrail` hängt unbegrenzt, wenn der Worker stirbt.~~ **✅ Behoben**
Ein `AbortController` trägt beide Enden dieser Umgebung: `waitForMessageOfType` nimmt ihn als Abbruch-Kanal entgegen, und sowohl der Ausfall (`handleWorkerFailure`, `WorkerFailedError`) als auch der gewollte Abbau (`destroy()`, `WorkerDestroyedError`) brechen ihn ab. Jedes ausstehende Promise wird in diesem Moment abgelehnt, jeder spätere Aufruf sofort; die Timeouts sind der letzte Ausweg statt des einzigen. Der `Destroyed`-Wartelauf von `destroy()` selbst hängt nicht am Controller und behält seinen eigenen Timeout.

**[VIEW-2]** ~~Keine `error`/`messageerror`-Handler auf dem Worker.~~ **✅ Behoben** — beide werden abonniert, bevor der Load-Handshake beginnt. Ein Ausfall terminiert den Worker, setzt `isDestroyed` und meldet sich als `RemoteWorkerEnv.WorkerFailed` und `ShadowEnv.ProxyFailed` (samt `proxyfailed`-DOM-Event auf `<shae-worker>`). Der Weg zurück ist ein neuer `envProxy`: sobald er bereit ist, baut die View ihre Änderungen aus der Component Memory neu auf, und der nächste Sync stellt die Entities in der neuen Umgebung her.

**[VIEW-3]** ~~`MessageRouter` schluckt Fehler durch doppeltes `AppliedChangeTrail`.~~ **✅ Behoben**
Der Catch-Zweig von `#onChangeTrail()` postet die Fehlerbestätigung und kehrt zurück; pro Change Trail entsteht damit genau eine Nachricht, und der wartende Aufrufer in `RemoteWorkerEnv` entscheidet auf der ersten, die er sieht. Ein Trail ohne Seriennummer wird gar nicht bestätigt — auch im Fehlerfall nicht, weil niemand darauf wartet.
Im selben Zug: Ein `Destroy` fährt den Kernel im Worker herunter und sperrt den Router für alles Weitere — ein zweites `Destroy` eingeschlossen, denn eine Bestätigung gehört zu der einen, auf die `RemoteWorkerEnv.destroy()` wartet, und ein zweites schickt die View nicht. `WorkerRuntime` nimmt ihren `message`-Hörer von `self` und bleibt unten: weder eine spätere Nachricht noch ein `start()` holt sie zurück. Beide Einstiegspunkte verwerfen eine Nachricht, die sie nicht lesen können, statt den Worker mit einem `TypeError` aufzureißen.

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
Je nachdem, ob eine Aufrufstelle `?.` benutzte, warf dieselbe Situation einen `TypeError`, war ein stiller No-op oder meldete einen falschen fremden Kontext. Jetzt gilt: Mutationen, die nur die Komponente selbst betreffen, werden ignoriert; `dispatchEvent` benachrichtigt die seit dem Abbau registrierten Listener ohne Kinder-Traversierung; `addChild` und der `parent`-Setter werfen einen `ViewComponentError`, der die Zerstörung benennt. Neu: `ViewComponent.isDestroyed`.

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

~~**Ein Worker, der beim Abbau schweigt, hinterlässt eine unbehandelte Rejection.**~~ **✅ Behoben**
*Ort:* `RemoteWorkerEnv.ts` (`destroy()`).
Der Abschluss-Wartelauf schließt seine Kette jetzt mit einem `catch()`: bleibt der `Destroyed`-Reply aus, meldet der Logger das Schweigen, und der `terminate()` nach `WorkerDestroyTimeout` läuft unverändert. `RemoteWorkerEnv.spec.ts` fährt den Fall über Fake-Timer, statt ihm mit einem zugestellten Reply auszuweichen.

**[ELEM-1]** ~~`<shae-worker>` erzeugt eine unbehandelte Promise-Rejection beim Teardown im selben Task.~~ **✅ Behoben**
*Ort:* `ShaeWorkerElement.ts`.
`connectedCallback()` startet per `start()` automatisch, der `src`-Effekt ruft `importScript()`; beide warten auf `ShadowEnv.ready()`, das seit VIEW-8 mit einem `ShadowEnvDestroyedError` ablehnt — und niemand beobachtete diese Promises. Connect und Disconnect im selben Task (was `#deferDestroy` ausdrücklich vorsieht) ergab damit pro Element eine unbehandelte Rejection. Beide Aufrufstellen fangen jetzt ab: ein Teardown ist still, alles andere wird geloggt. Für Aufrufer, die tatsächlich warten, lehnen `start()` und `importScript()` unverändert ab.

### 3.3 MEDIUM — bemerkenswerte Auswahl

| ID | Beschreibung | Ort |
|---|---|---|
| **VIEW-6** | `MutationObserver` in `ShaeEntElement` setzt `subtree: false` — In-Tree-Reparenting via Zwischen-Container wird nicht gesehen. Die Beobachtung folgt dem Element inzwischen an seine neue Position, der Zwischen-Container bleibt offen. | `ShaeEntElement.ts` |
| **VIEW-6b** | `Element.moveBefore` ist für ein `<shae-ent>` kein atomarer Umzug: ohne `connectedMoveCallback` fällt der Browser auf `disconnectedCallback` + `connectedCallback` zurück, die Entity wird zerstört und unter derselben uuid neu erzeugt — im Change Trail ein Abriss statt einer Bewegung. | `ShaeEntElement.ts` |
| ~~**VIEW-7**~~ | ~~`ShadowEnv.envProxy`-Setter feuert `start()` fire-and-forget; ein nachfolgender Reassign kann durch das *alte* `start().then()` das `proxyReady`-Flag des neuen Proxys verfälschen.~~ **✅ Behoben** — jede Zuweisung an `envProxy` eröffnet eine Generation, und ein Start, der außerhalb seiner eigenen fertig wird, wird verworfen; dazu wird ein freigelassener Proxy stumm geschaltet, sobald sein `destroy()` zurückkehrt. | `ShadowEnv.ts` |
| ~~**VIEW-8**~~ | ~~`ShadowEnv.destroy()` löscht alle Listener — `syncWait()`-Aufrufer hängen für immer.~~ **✅ Behoben** — jedes ausstehende `ready()` und `syncWait()` wird mit einem neuen `ShadowEnvDestroyedError` abgelehnt statt hängen gelassen; Aufrufe nach `destroy()` lehnen sofort ab, `sync()` wird zum No-op, ein bereits eingeplanter Sync läuft nicht mehr. `destroy()` ist idempotent und zerstört den `envProxy` nur noch einmal. | `ShadowEnv.ts` |
| ~~**VIEW-9**~~ | ~~`removeTransferables` mutiert die Caller-Trail-Einträge per `delete`.~~ **✅ Behoben** — die Transferables werden für die Nachricht abgetrennt, indem die betroffenen Einträge flach kopiert werden; der Trail, den der Aufrufer weiterreicht, bleibt vollständig, und beide Umgebungen geben dieselbe Momentaufnahme heraus. | `RemoteWorkerEnv.ts` |
| **VIEW-10** | `LocalShadowObjectEnv` ignoriert `waitForConfirmation`; `MessageToView` läuft via `queueMicrotask`, sodass der `AfterSync`-Event vor den Worker-Nachrichten feuert. **Verhaltensasymmetrie zu `RemoteWorkerEnv`.** | `LocalShadowObjectEnv.ts:40`, `Kernel.ts:316–319` |
| ~~**VIEW-11**~~ | ~~`ShaePropElement.isShaeEntElement = true` ist offenbar Copy-Paste — nutzt aber `findEntNode` zur Eltern-Suche, was potenziell falsche Treffer ergibt.~~ **✅ Behoben** — das Flag heißt jetzt `isShaePropElement`; ein in einem `<shae-prop>` verschachteltes `<shae-prop>` läuft beim Ancestor-Walk korrekt durch bis zur echten Host-Entity. Abgedeckt von `prop-element-host.test.js`. | `ShaePropElement.ts` |
| ~~**KERN-5**~~ | ~~`Entity.parentUuid`-Setter ruft `removeFromParent()` *vor* dem Resolven des neuen Vaters; wirft `getEntity` einen Fehler, ist die Entity verwaist.~~ **✅ Behoben** — `getEntity` wird *vor* dem Detach aufgerufen; `Kernel.setParent` validiert die neue UUID vorab. | `Entity.ts`, `Kernel.ts` |
| ~~**KERN-6**~~ | ~~`Registry.clear()` löscht `#truthyPropRoutes` nicht — Test-Pollution + Akkumulation in langlebigen Registries.~~ **✅ Behoben** — `clear()` räumt auch die Prop-basierten Routen ab. | `Registry.ts` |
| ~~**KERN-7**~~ | ~~`useContext`/`useParentContext`/`useProperty` ignorieren `options` bei Cache-Hit (z. B. `compare`). Der erste Aufrufer „gewinnt", was leise zu falschen Equality-Vergleichen führen kann.~~ **✅ Behoben** — bei Cache-Hit mit abweichender `compare`-Funktion wird ein `console.warn` emittiert; das alte Reader-Objekt bleibt aus Kompatibilitätsgründen erhalten. | `Kernel.ts` |
| ~~**KERN-9**~~ | ~~Der Entity Context folgt dem Entity-Baum nur halb: das erste Kind erbt beim Anhängen nicht, und beim Ablösen wird die Bindung gekappt statt an den Root-Context zurückgeführt.~~ **✅ Behoben** — `Entity.addChild()` hat nur noch einen Weg, dessen Neubindung für jedes Kind läuft, und `removeFromParent()` bindet jeden Kontext an den Root zurück, statt ihn nur abzuhängen. Damit sehen auch `entity.parent = undefined` und das von `destroyEntity()` zur Wurzel beförderte Kind spätere Änderungen des Root-Contexts. Über `Kernel.setParent()` war beides von dessen `reSubscribeToParentContexts()` verdeckt; dessen eigene Ablösung entfällt, weil der `parentUuid`-Setter sie mitbringt und als Einziger weiß, ob ein Elternteil unmittelbar folgt. | `Entity.ts`, `Kernel.ts` |
| ~~**KERN-10**~~ | ~~`Entity.setProperty()` verwirft den truthyProps-Cache nicht; die Registry wählt die Shadow Objects danach nach einem Zustand aus, den es nicht mehr gibt.~~ **✅ Behoben** — die Verwerfung sitzt jetzt in `setProperty()`, und `setProperties()` läuft über diesen einen Einstiegspunkt. Offen bleibt der Schreibkopf aus `getPropertyWriter()`, der an beiden vorbeischreibt. | `Entity.ts` |
| ~~**KERN-11**~~ | ~~`getEntity()` wirft, wird aber wie ein nullable Lookup benutzt: `dispatchEventsToEntity()` schreibt Optional Chaining hinter einen Aufruf, der nie `undefined` liefert, und `run()` verwirft am geworfenen Lookup den Rest des Change Trails.~~ **✅ Behoben** — `findEntity()` kommt additiv dazu und liefert `undefined`; der Ereignispfad benutzt es, die Pfade, die den Entity-Baum beschreiben, werfen weiter. Ein verirrtes `SendEvents` kostet nicht mehr die Einträge dahinter. | `Kernel.ts` |
| ~~**KERN-12**~~ | ~~Der Entity-Baum kann zu einem Ring geschlossen werden, und die vier Traversierungen über die Kinderlisten laufen ohne Besuchsmenge in den Stack Overflow.~~ **✅ Behoben** — beides, und jedes für den Ring, den nur es erreicht: `Entity.assertAttachableTo()` weist einen Elternteil ab, der die Entity selbst oder einer ihrer Nachfahren ist (gerufen aus dem `parentUuid`-Setter und aus `Kernel.setParent()`, jeweils vor der ersten Mutation), und alle vier Traversierungen über die Kinderlisten führen eine Besuchsmenge — `Kernel.traverseLevelOrderBFS()`, `Kernel.getEntityGraph()`, `Entity.traverse()` und `ComponentContext.#traverseLevelOrderBFS()` — die tiefer liegenden Primitive `addChild()` und `addToChildren()` schreiben eine Kinderliste, ohne die Elternbeziehung anzufassen, und sind damit für keinen Vorfahren-Walk sichtbar. `traverseLevelOrderBFS()` gibt außerdem eine frische Liste heraus statt ihres Caches. | `Entity.ts`, `Kernel.ts`, `ComponentContext.ts` |
| ~~**KERN-13**~~ | ~~`Kernel.destroy()` endet am ersten werfenden `onDestroy`, lässt die Entities dahinter stehen, und die Root-Contexts sind entsorgt, bevor der erste Callback läuft.~~ **✅ Behoben** — der Durchlauf sichert jede Entity einzeln ab und meldet einen Fehlschlag mit uuid über den Logger, die Buchführung wird hinterher geleert, und die Root-Contexts fallen erst nach dem Entity-Durchlauf. Ein `onDestroy`, das einen globalen Kontext liest, erreicht damit den Pfad, den der Kernel hielt. Nebenbefund erledigt: die dritte Bindung der Kontexte in `Kernel.setParent()` entfällt, ein Umhängen benachrichtigt die `useParentContext()`-Leser einmal. | `Kernel.ts` |
| ~~**VIEW-12**~~ | ~~`ShaePropElement` parst numerische Attribute ohne Warnung — `Number("foo")` → `NaN` propagiert. Der `try`/`catch` um die Konvertierung meldet nur, was wirft; ein Konverter, der `NaN` zurückgibt, gilt als Erfolg.~~ **✅ Behoben** — die numerischen Konverter liefern eine Zahl oder werfen einen `TypeError`, und die Prüfung läuft vor dem Typed-Array-Konstruktor, der aus `NaN` sonst eine `0` macht. Das Element meldet den Fall über denselben Weg wie ein malformiertes JSON — `logger.error`, nicht `warn`, weil `warn` an `ConsoleLogger.sharedConfig.enable` hängt — und räumt die Property ab. Die Grenze liegt am Ergebnis, nicht an der Form der Eingabe: `type="int" value="12abc"` bleibt `12`, weil `parseInt` eine Zahl liefert; ein leerer Abschnitt aus dem Trennmuster ist `0`, wo `Number()` ihn liest, und kein gültiger Wert, wo `parseInt()` ihn liest. | `ShaePropElement.ts`, `propValueConverters.ts` |
| **VIEW-13** | `ShaeEntElement.#dispatchRequestParent`-Microtask prüft `isConnected` nicht; nach Disconnect bubbelt ein Streu-Event. | `ShaeEntElement.ts:665–667` (der Microtask in `#setParent`), Methode bei `:627–635` |

Grenze des Slot-Umzugs nach einem Rundlauf des Shadow-Hosts, in Chromium gemessen (2026-08-18):

- **Ein `<slot>`, dessen Shadow-Host einmal aus dem Dokument genommen und wieder eingehängt wurde, wird nicht mehr aus jeder Entity heraus verfolgt.** Die Entity über dem Slot nimmt ihn auf, wenn der Slot eine Zuweisung meldet, und gibt ihn beim Verlassen des Baums wieder ab; ein Host, der aus- und wieder eingehängt wird, meldet aber keine Zuweisung, weil sich innerhalb seiner Shadow Root nichts geändert hat. Danach trägt nur noch die Meldung der aufnehmenden Seite: ein Umzug in eine andere Entity wird weiter verfolgt, ein Umzug an eine Stelle ohne Entity darüber nicht. Festgehalten von `ent-element-slot-move.test.js`, Fall »misses a slot moving out of every entity after its shadow host left the document and came back«. Aufheben hieße, die Slots beim Connect einzusammeln (`querySelectorAll('slot')` je Entity plus Nähetest) — eigene Mechanik, eigene Entscheidung.

### 3.4 LOW (Auswahl)

- ~~**LOW-1**~~ ~~`Kernel.destroy()` ruft `traverseLevelOrderBFS().reverse()` — mutiert ggf. den internen Cache an Ort und Stelle.~~ **✅ Behoben** — die Methode gibt eine frische Kopie heraus, und `destroy()` liest die umgekehrte Folge über `traverseLevelOrderBFS(true)`, statt das Ergebnis zu drehen. Siehe KERN-12.
- **LOW-3** `SignalsPath.dispose()` emittiert beim Teardown noch ein finales `'value' = undefined`, was Listener verwirren kann.
- **LOW-4** Globale Singletons (`__shadowEntsContexts`, `__shadowEnvs`, die geteilte `FrameLoop`) erschweren Test-Isolation und Multi-Instance-Szenarien. **Teilweise entschärft; der Rest ist beschrieben statt beseitigt.** Die drei hängen nicht am selben Nagel: `__shadowEntsContexts` und `__shadowEnvs` liegen am globalen Objekt und sind damit über Modul-Instanzen hinweg dieselben — das ist ihr Zweck, denn Custom Elements aus zwei Kopien des Pakets müssen denselben Namespace finden. `FrameLoop.get()` cached dagegen im Modulzustand: eine zweite Modul-Instanz baut eine zweite »geteilte« Schleife mit eigener Abonnentenzahl, und keine der beiden weiß von der anderen. Freigabe- und Ausweichwege gibt es für alle drei — `ComponentContext.dispose()` nimmt den Namespace wieder aus der Map (vorher blieb jeder je erzeugte Kontext für die Lebensdauer der Seite stehen), der `view`-Setter von `ShadowEnv` gibt nur den eigenen Eintrag frei, ein Namespace in fremder Hand bleibt dort, und `destroy()` läuft über denselben Weg; `new FrameLoop(maxFps)` baut eine Schleife, die einer Spec allein gehört. Offen bleibt die Gattung selbst: unter SSR wandert Zustand zwischen Requests, und Mandanten mit demselben Namespace-String teilen sich Kontext und Umgebung. Ausgeschrieben in `packages/shadow-objects/docs/concepts.md`, §2, »Shared Registries«.
- **LOW-5** Konstruktor von `ComponentContext` gibt eine vorhandene Instanz via `return` zurück. Der Befund bleibt offen, weil das Verhalten bleibt; überrascht wird davon nur noch, wer weder den TSDoc der Klasse noch den Constructor-Abschnitt in `packages/shadow-objects/docs/api-reference.md` gelesen hat — beide sagen es ausdrücklich zu.

### 3.5 Performance

| Befund | Auswirkung |
|---|---|
| **`postMessage`-Schwall**: jede Property-Änderung triggert einen Microtask, dann eine `postMessage`. Animationen mit n Updates/Frame erzeugen n Nachrichten. | Hohe Worker-Roundtrip-Last bei 60 Hz. Empfehlung: optionales RAF-Coalescing. |
| **`cloneChangeTrail`** (`structuredClone` pro Eintrag) ist im `LocalShadowObjectEnv` standardmäßig **aktiv** — reine CPU-Last in einem In-Process-Env. | **Entschieden: der Klon bleibt Default.** Er sichert die semantische Gleichheit zur entfernten Umgebung — wer lokal entwickelt, trifft entfernt auf dasselbe Verhalten. Abschaltbar über `no-structured-clone` am `<shae-worker local>` oder `disableStructuredClone = true`; Begründung in `packages/shadow-objects/docs/best-practices.md` §6. |
| **`buildChangeTrails`** macht drei volle BFS-Durchläufe (Strukturell/Content/Removal); Cache wird bei den meisten Mutationen invalidiert. | Bei tausenden Komponenten teuer. |
| **`SignalsPath.#updateGetValueFromSignalsEffect`** zerstört und erzeugt den Effect neu bei jedem Add/Remove — bei dynamischen Kontexten heiß. | Inkrementelles Subscribe wäre günstiger. |
| **`Transferables` nur bei `SendEvents`** — große `ArrayBuffer` in `ChangeProperties` werden strukturell kopiert, nicht transferiert. | Property-API für Transferables fehlt. |
| **`ContextLost`-Replay** (`reCreateChanges`): bei N Entities × M Props ein voller Re-Build inkl. allen `postMessage`. | Akzeptabel für Recovery, aber teuer; sollte bewusst getriggert werden. |
| **`Registry.findTokensByRoute`** ist O(tokens × props × tokens) pro Pass. | Bei tiefen Routen-Graphen messbar; akzeptabel für typische Größenordnungen. |
| **Der Vorfahren-Aufstieg `isBelow`** (`ShaeEntElement.ts:42-47`) mildert die Kosten der Re-Request-Runde, verursacht sie aber nicht: die Runde selbst läuft pro verbindender Entity über alle Kandidaten (n²/2) und bleibt quadratisch, auch ohne den Filter. Gemessen (2026-08-18, Chromium via Playwright 1.62.1, Reihe 6/50/150/300/600): Seitenaufbau von 600 kinderlosen Geschwistern kostet mit Filter 72 ms, mit Runde ganz aus (Boden) 29,2 ms, ohne Filter (Runde an, Test raus) 322,6 ms (Faktor 4,5 gegen den Boden); Verdopplungsquotient 150→300→600 bei 3,1/4,1 — quadratisch. | Überhang bei n=600: 72 − 29,2 = 42,8 ms. Skaliert mit n² (Verdopplungsfaktor ~4, siehe 3,1/4,1 oben) bleibt er unter einem Bild (16,7 ms) bis rund **375** Geschwistern unter einem Elternteil. Die größte Geschwisterschar im Repository hat **6** (`packages/shadow-objects-e2e/pages/multi-env.html:24-68`) — Faktor ≈62,5 darunter. Ein Umbau lohnt heute nicht. |
| **`ComponentContext.dispatchReRequestParentRoots()`** (`ComponentContext.ts:402-408`) kennt keinen Absender und kann deshalb gar nicht filtern — quadratisch schon ohne jede Milderung, und die teurere der beiden Runden: bei 600 Wurzeln in einem Namespace 273,8 ms gegen 23,3 ms im Kanal-aus-Vergleich (Boden), Verdopplungsquotient 150→300→600 bei 3,5/3,7. Das Audit führt diesen Kanal nur als »N+1 Nachrichten« und unterschätzt ihn damit. | Überhang bei n=600: 273,8 − 23,3 = 250,5 ms. Skaliert mit n² vom Anker n=600 bleibt er unter einem Bild bis rund **155** Wurzeln in einem Namespace — eine konservative Extrapolation: die Messpunkte, die die reale Schwelle einrahmen (n=150: 13,8 ms, darunter; n=300: 56,5 ms, darüber), deuten eher auf ~163-165. Niedriger als beim Geschwisterkanal, weil hier gar kein Filter mildert. Die reale Obergrenze im Repository bleibt **6** (`packages/shadow-objects-e2e/pages/multi-env.html:24-68`), Faktor ≈25,8 darunter — das ist die eigentliche Aussage der Messung. Ein Umbau müsste beide Kanäle in einem Zug fassen: ein Absender am Wurzelkanal (`#reRequestParentAsRoot`, `ShaeEntElement.ts:513-518`) bringt nichts ohne einen aufstiegsfreien Unterhalb-Test, der an geschlossenen Shadow-Grenzen ohnehin ausfällt (`isInClosedShadowTree`, `ShaeEntElement.ts:550`). Gemessen 2026-08-18, Chromium via Playwright 1.62.1. |

Reproduktion der beiden Zeilen oben: n `<shae-ent>` per `innerHTML` in einen bereits im DOM
hängenden Container einhängen (nicht über `mount()` aus `shadow-objects-testing/src/mount.js` —
das parst in einen abgetrennten `<div>` und unterdrückt `#wasUpgradedInPlace`, wodurch die
Peer-Runde gar nicht läuft). Drei Auslöser getrennt messen: Geschwisterkanal mit n kinderlosen
`<shae-ent>` unter einem `<shae-ent>`-Elternteil (`isBelow`/`dispatchReRequestParentSiblings`,
je einmal wie es ist / Runde aus / Filter aus), Wurzelkanal mit n `<shae-ent>` ohne
Entity-Elternteil im selben Namespace (`dispatchReRequestParentRoots`, wie es ist / Kanal aus),
Slot-Auslöser als Preis einer einzelnen `broadcastEvent(ReRequestParent)` beziehungsweise
`broadcastEvent(ReRequestEntHost)`-Runde über einem bereits stehenden Baum. Lief als Wegwerf-Spec
in `packages/shadow-objects-testing/test/`, nach der Messung wieder entfernt; der Absatz oben ist
das ganze Rezept, aus dem sie sich wieder aufbauen lässt.

### 3.6 API-/Design-Smells

- `onDestroy` ist gleichzeitig Symbol-Methode, Event-Name und API-Callback — drei Bedeutungen, durch Eventize teilweise verwoben. Dokumentation oder Trennung würde helfen.
- `IShadowObjectEnvProxy` definiert kein `isDestroyed`, keine `error`-Events und keinen `ready`-Promise.
- `EntityEntry.usedConstructors: Map<Constructor, Set<ShadowObjectType>>` — die innere `Set` hat in der aktuellen Logik immer Größe 1. Tote Komplexität.
- `appendRoute(route: string)` mischt Token-Alias und Prop-bedingte Routen in einer Methode (`@`-Präfix-Sniffing).
- `Kernel.parse()` (privat) und die public Kernel-Methoden divergieren leise (z. B. der nicht-durchgereichte Auto-Destroy-Parameter).
- `ShaeElement.syncShadowObjects` (Methode) vs. modul-private Funktion gleichen Namens — verwirrend.
- ~~Worker-Timeouts sind feste Konstanten (5 s / 60 s), nicht überschreibbar — Tests warten potenziell eine Minute auf einen kaputten Worker.~~ ✅ Erledigt — die vier Werte kommen aus `new RemoteWorkerEnv(options?)` und aus den vier `<shae-worker>`-Attributen `load-timeout`, `configure-timeout`, `change-trail-timeout` und `destroy-timeout`; die Konstanten bleiben die Vorgabe, und ein Wert, der keine endliche Millisekundenzahl größer null ist, wird gemeldet und verworfen.
- `ShadowEnv.ns$` (`ShadowEnv.ts:46`) ist die einzige Fundstelle im Code — sonst steht der Name nur noch in der Zeichnung `view/ClassGraphOverview.drawio:334`: das Signal wird nie geschrieben und liest auch nach `ready()` `undefined`. Ein öffentlicher Slot mit einer Zusage ohne Inhalt — verdrahten oder entfernen, beides eine API-Entscheidung. `api-reference.md:1056` benennt den Zustand inzwischen ehrlich, der Code bleibt schuldig.
- `ViewComponentError` ist nicht exportiert (`ViewComponent.ts:6`, kein `export`; `index.ts:17` reicht nur die Modul-Exporte weiter), wird aber als Fangobjekt dokumentiert. Ein `instanceof` ist für Konsumenten unmöglich; als Ausweg bleibt `error.name`. Die Klasse zu exportieren ist eine API-Änderung.

---

## 4. Test-Abdeckung

### 4.1 Inventar

**vitest** (`packages/shadow-objects/src/**/*.spec.ts`, 20 Dateien, 624 Fälle):
`Kernel.spec.ts` (4008 LoC), `Entity.spec.ts`, `Registry.spec.ts`, `ShadowObject.spec.ts`, `ShadowObjectCreationScope.spec.ts`, `SignalsPath.spec.ts`, `ShadowEnv.spec.ts`, `LocalShadowObjectEnv.spec.ts`, `RemoteWorkerEnv.spec.ts`, `MessageRouter.spec.ts`, `WorkerRuntime.spec.ts`, `ViewComponent.spec.ts`, `ComponentContext.spec.ts`, `ComponentChanges.spec.ts`, `ComponentMemory.spec.ts`, `props-utils.spec.ts`, `FrameLoop.spec.ts`, `ConsoleLogger.spec.ts`, `ConsoleLogger.storage.spec.ts`, `elements/propValueConverters.spec.ts`.

**`shadow-objects-testing/`** (vitest browser-mode + Playwright-Provider, echtes Chromium): 24 Dateien, 345 Fälle — `build-change-trail`, `change-props`, `change-tokens`, `ComponentContext`, `ent-element-attributes`, `ent-element-context-clear`, `ent-element-events`, `ent-element-namespace`, `ent-element-shadow-root-host`, `ent-element-slot-move`, `ent-element-teardown`, `ent-element-upgrade`, `forward-custom-events`, `local-env-entities`, `prop-element-host`, `prop-element-lifecycle`, `prop-element-registration-order`, `prop-element-types`, `remove-and-append-e`, `send-events`, `view-component-context-switch`, `worker-element-attributes`, `worker-element-teardown`, `emit-helper/emit-helper`.

**`shadow-objects-e2e/`** (Playwright, Chromium + Firefox): 11 Dateien, 213 Fälle je Projekt und damit 426 insgesamt — `async-events`, `auto-destruct`, `bundle`, `create-element`, `dynamic-dom`, `multi-env`, `remote-worker-env`, `shae-worker`, `sync-failure`, `upgrade-timing`, `worker-failure`. Assertions liegen in den Test-Pages, der gemeinsame `runPageTests`-Helper macht daraus je einen Playwright-Test pro `data-testresult`.

### 4.2 Testabdeckung

`vitest --coverage` misst die beiden Node-Suiten (v8-Provider, kein Schwellenwert): 69,21 % Statements im Kernpaket (`packages/shadow-objects/coverage/index.html`), 16,26 % in `shae-offscreen-canvas` (`packages/shae-offscreen-canvas/coverage/index.html`). `shadow-objects-testing` (Browser-Modus, eigenes vitest-Projekt) und `shadow-objects-e2e` (Playwright) laufen außerhalb dieser Zahl — die Kernpaket-Zahl untertreibt entsprechend, was der Workspace tatsächlich prüft. Die folgende Tabelle bleibt der gebietsweise Blick, den eine reine Prozentzahl nicht liefert — welche Pfade geprüft sind, nicht wie viele Zeilen.

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
| `ShadowEnv` Setup/Teardown | ✅ **gründlich** — `syncWait()`/`AfterSync`, der abgelehnte Change Trail (`SyncFailed` statt `AfterSync`, ablehnendes `syncWait()`, weiterbenutzbare Umgebung danach; über echtes `postMessage` in der E2E-Seite `sync-failure`), der `destroy()`-Kontrakt, `ProxyFailed` und der `envProxy`-Swap zur Laufzeit samt Wiederherstellung der Entities aus der Component Memory. Gefahren werden Doppelgänger → Doppelgänger und Doppelgänger → `LocalShadowObjectEnv` (`ShadowEnv.spec.ts:521`, `:536`) sowie Remote → Remote in der E2E-Seite `worker-failure`; Local → Remote fährt kein Fall. Dazu ein Proxy-Wechsel während eines laufenden `start()` — der veraltete Erfolg wie die veraltete Ablehnung, und ein freigelassener Proxy, der danach noch einen Ausfall meldet — sowie die Eigentumsprüfung der Namespace-Registrierung |
| `LocalShadowObjectEnv` | 🟡 **partiell** — Smoke + 1 Sync; `destroy()`-Registry-Kontrakt (geteilte Default-Registry vs. eigene Registry) jetzt gründlich getestet |
| `RemoteWorkerEnv` | ✅ **gründlich** — `RemoteWorkerEnv.spec.ts` (60 Fälle über einen Worker-Doppelgänger) deckt Ausfall, Termination, Ablehnung des Ausstehenden und des Nachgereichten, den `destroy()`-Kontrakt samt Abbau während `start()`, das Abtrennen der Transferables ohne Eingriff in den Trail des Aufrufers, die Zuordnung einer Bestätigung über Seriennummer und URL, das Abmelden der Hörer auf allen drei Wegen (Abbau, Ausfall, ein `start()`, dem die Zeit ausgeht), das ausbleibende Bestätigungsfenster, den zurückgehaltenen Ausfall und die zurückgehaltene Load-Meldung gegen einen werfenden Hörer und die Logger-Konfiguration ohne benutzbare Storage sowie mit unbrauchbarem Storage-Wert (unparsbar, Array, `null`, Zahl- und String-Skalar); dazu die Auflösung der vier Timeouts gegen ihre Vorgaben, die Abweisung samt Meldung für `0`, `Infinity`, negative Zahlen, `NaN` und Nicht-Zahlen und alle vier Aufrufstellen gegen die Uhr — je eine Millisekunde vor und nach ihrer Frist, mit Fake-Timern; E2E-Seite `worker-failure` fährt denselben Weg über echtes `postMessage` inklusive Erholung, `sync-failure` den abgewiesenen Change Trail samt Seriennummer, Fehlermeldung des Kernels und weiterlebendem Proxy. |
| `MessageRouter` | ✅ **gründlich** — `MessageRouter.spec.ts` (30 Fälle) deckt Routing und Bestätigungen, Kernel-Nachrichten an die View, den Modul-Import samt Fehlerfällen, den fehlschlagenden Change Trail, den Teardown (Kernel-Abbau, `onDestroy`, Sperre, Import im Flug) und die unlesbare Nachricht |
| `WorkerRuntime` | ✅ **gründlich** — `WorkerRuntime.spec.ts` (10 Fälle) deckt Handshake und Idempotenz, das Routing über den globalen Scope, die Logger-Konfiguration, den Teardown samt Abmelden des Hörers und die unlesbare Nachricht |
| Custom Elements — `<shae-prop>` | ✅ **gründlich** — Host-Suche und Nachjustierung (`prop-element-host.test.js`), das Ende einer Bindung (`prop-element-lifecycle.test.js`), die unabhängige Registrierung (`prop-element-registration-order.test.js`), Markup-Upgrade-Pfad (E2E) und das Typ-Parsing tabellengetrieben über alle 42 Typnamen, beide Trennmuster, die vier werfenden Eingaben und die numerischen, deren Umrechnung keine Zahl ergibt, `no-trim`, die Falsy-Werte über beide Pfade und den Change Trail (`prop-element-types.test.js`, dazu `propValueConverters.spec.ts` für die Tabelle ohne DOM) |
| Custom Elements — `<shae-ent>`, `ShaeElement`, `<shae-worker>` | ✅ **gründlich** — Attribut-, Ereignis-, Namespace- und Upgrade-Pfade in `ent-element-attributes`, `ent-element-events`, `ent-element-namespace`, `ent-element-upgrade`, `ent-element-teardown`, `ent-element-shadow-root-host`, `worker-element-attributes` und `worker-element-teardown`; die Entsprechungen über echte Worker in den e2e-Seiten `upgrade-timing`, `multi-env` und `dynamic-dom` |
| Utils | 🟡 `props-utils.spec.ts`, `ConsoleLogger.spec.ts`, `ConsoleLogger.storage.spec.ts` (die fünf Formen, in denen ein Host `localStorage` anbietet) und `FrameLoop.spec.ts` (20 Fälle über Armierung und Leerlauf, Frame-Nutzlast, Bildratengrenze und geteilte Schleife) — `waitForMessageOfType`, `cloneChangeTrail`, `attr-utils`, `array-utils`, `generateUUID`, `toNamespace`, `toUrlString`, `importModule` haben keine eigenen Tests. `array-utils` wird indirekt über `ComponentContext.spec.ts` und `ComponentChanges.spec.ts` mitgeprüft, `waitForMessageOfType` über `RemoteWorkerEnv.spec.ts`, `attr-utils` über `worker-element-attributes.test.js` und die e2e-Seite `shae-worker` |
| Worker-Init-Failure / Terminate / Message-Race | 🟡 **partiell** — ein Ausfall während des Load-Handshakes, `terminate()` beim Ausfall, verspätete Nachrichten nach `destroy()` und der doppelte Ausfall sind abgedeckt; ein `Worker`-Konstruktor, der an einer kaputten URL selbst wirft, ist es nicht |

### 4.3 Qualität

- Generell sehr lesbar, deklarative Assertions mit Kontext-Labels.
- `Registry.get().clear()` / `ComponentContext.get().clear()` beziehungsweise `unmountAll()` in `afterEach`.
- Keine `.only` oder skipped Tests; Playwright-Konfig setzt `forbidOnly: true` für CI.
- **Flake-Risiko:** `ShadowEnv.spec.ts` enthält an zwei Stellen `await new Promise(r => setTimeout(r, 50))` — magische 50 ms statt deterministischer Microtask-Drains. Die neuen `syncWait`-Fälle warten stattdessen auf `AfterSync` und benutzen ein Timeout nur als Fehlerabbruch.
- E2E-Pattern (Page schreibt `data-testresult`) ist konzise, erschwert aber Debugging — Assertions liegen außerhalb des Spec-Files.

### 4.4 Konkrete Test-Lücken (ticket-fertig)

> **E2E im Detail:** [`packages/shadow-objects-e2e/TEST-PLAN.md`](packages/shadow-objects-e2e/TEST-PLAN.md) analysiert die Playwright-Suite einzeln, listet je Spec-Datei was sie prüft und führt die benannten Testfälle mit Seiten, Fixtures und Priorität — samt der Kennungen, die noch offen sind. Stand: 426 Tests, 213 je Projekt. Ein Framework-Defekt steht offen, siehe unten und [`KNOWN-DEFECTS.md`](packages/shadow-objects-e2e/KNOWN-DEFECTS.md). Die folgende Liste bleibt der ebenen-übergreifende Überblick.

**[ELEM-1] `document.createElement()` erzeugt keine funktionsfähigen shae-Elemente.** Alle drei Custom Elements setzen im Konstruktor Attribute (`style.display = 'contents'`, `setAttribute('ns')`, `removeAttribute('token')`), was die Custom-Elements-Spec verbietet. Chromium und Firefox brechen das Upgrade ab und liefern ein `HTMLUnknownElement` — ohne `viewComponent`, ohne `uuid`, ohne Verbindung zum Environment. Über `innerHTML` funktioniert es, weshalb der Defekt bisher unsichtbar blieb: alle Testseiten benutzten parser-erzeugtes Markup. **Tragweite:** jede React-/Vue-/Svelte-Integration und jeder eigene Wrapper erzeugt Elemente programmatisch. **Fix:** Attribut- und Style-Zuweisungen aus den Konstruktoren in `connectedCallback` verschieben; `display: contents` als Stylesheet-Regel statt Inline-Style.

**[ELEM-3] `autoDestructionOnParentRemoval` ist über `<shae-ent>` nicht erreichbar.** Kein Attribut, und `ShaeEntElement` erzeugt seine `ViewComponent` ohne die Option — das Feature ist nur über die programmatische API nutzbar. Ein DOM-seitiger Test der Kaskade ist deshalb derzeit nicht möglich.

- Worker-Init-Failure (`Worker`-Konstruktor mit kaputter URL).
- `ShadowEnv.envProxy`-Swap zur Laufzeit von `LocalShadowObjectEnv` auf `RemoteWorkerEnv` (die Gegenrichtung und Remote → Remote sind abgedeckt).
- `<shae-ent>`-`attributeChangedCallback` für die drei Attribute, die es beobachtet (`ns`, `token`, `forward-custom-events`, `ShaeEntElement.ts:56`), jeweils beim Re-Set auf leer: im Integrationspaket abgedeckt (`ent-element-attributes.test.js`), über einen echten Worker nicht.
- `<shae-worker>`-`src`-Wechsel nach `start()` (Re-Import-Pfad).
- `Transferables` über echten Worker (nicht nur In-Process).
- `provideContext` → Provider-Entity stirbt vor Consumer — `useContext`-Effect-Cleanup.
- `Registry.removeRoute` / `clear()` während aktive Entities existieren — Re-Upgrade-Verhalten.
- Mehrfaches `shadowObjects.define` mit gleichem Token.

### 4.5 Empfehlungen (priorisiert)

1. **Magische Timeouts in `ShadowEnv.spec.ts` durch deterministische Drains ersetzen** — eliminiert das einzige offensichtliche Flake-Risiko.
2. **Nicht-triviale Utils specifizieren** — vor allem `cloneChangeTrail` (Worker-Boundary).
3. **`<shae-worker>` re-import-Test und der `envProxy`-Swap Local → Remote** — beide rühren an den aktuell ungetesteten `MessageRouter`/`WorkerRuntime`.

---

## 5. Build & Tooling

> **2026-05-09 — Build-System wurde grundlegend erneuert.** Details: [`CHANGELOG.md`](CHANGELOG.md) (Top-Level), Design-Doku: [`docs/superpowers/specs/2026-05-09-build-system-renewal-design.md`](docs/superpowers/specs/2026-05-09-build-system-renewal-design.md). Die folgenden Abschnitte spiegeln den neuen Stand und nur noch die offenen Punkte.

### 5.1 Pipeline (`packages/shadow-objects`)

Ein Skript: `node build.mjs`. Drei Stages — esbuild-Transpile (`src/**` → `dist/src/**`, preserved layout) + tsc emit-only Declarations (`tsconfig.lib.json`) + esbuild Inline-Worker-Bundle (`dist/src/bundle.js` → `dist/bundle.js`). Anschließend `scripts/makePackageJson.mjs` für `dist/package.json` (resolvt `workspace:*` + `catalog:`, wendet `package.override.json` an).

Veröffentlicht wird `dist/` mit ESM-only, mehreren Subpath-Exports (`./elements.js`, `./shae-ent.js`, `./shae-prop.js`, `./shae-worker.js`, `./shadow-objects.js`, `./shadow-objects.worker.js`, `./bundle.js`).

**Verbleibende Auffälligkeiten:**
- `exports`-Konditionen: Reihenfolge `import` vor `types`. Unter strikter Node-ESM-Resolution (`moduleResolution: node16/nodenext`) sollte `types` zuerst stehen. Aktuell unter `bundler` toleriert, aber latentes Risiko für Konsumenten.

### 5.2 Dependency-Hygiene

- Versionen leben jetzt zentral in `pnpm-workspace.yaml#catalog:` — keine Drift mehr möglich. ✅
- Tooling auf modernen Major-Versionen: vitest 4, `@vitest/coverage-v8` (version-exakt zu vitest gepinnt), biome 2.5, turbo 2.10, esbuild 0.28, Playwright 1.62, TypeScript 7, happy-dom 20, pnpm 11. ✅
- Zwei bewusste Holdbacks, jeweils mit Begründung im Kommentar in `pnpm-workspace.yaml`: `vite` (Override auf 7.x, weil Oxc keine nativen Decorators absenkt), `turbo` (2.10.9 wegen `minimumReleaseAge`).
- signalize 1.0.0-beta.0 + eventize 6.0.0 sind drin; der alte 5.x-Holdback ist erledigt, weil signalize jetzt auf `^6.0.0` peert. Beide Pakete werden nur gemeinsam gehoben, und `pnpm why -r @spearwolf/eventize` muss danach genau eine Version melden. ✅
- **Offen:** signalize von `1.0.0-beta.0` auf das finale `1.0.0` ziehen, sobald es da ist — dann auch den `minimumReleaseAgeExclude`-Eintrag mitziehen oder streichen.
- **Offen:** Sobald Oxc native Decorators absenkt, den `vite`-Override entfernen und auf 8.x gehen.
- Kern-Lib hat **keine `peerDependencies`** — `@spearwolf/eventize`/`signalize` sind harte Deps; bei Mehrfach-Resolutionen drohen Duplikate.

### 5.3 Lint / TS

- `strict: true` **mit `strictNullChecks: true`** in der Wurzel-`tsconfig.json`. ✅
- Biome-Root deaktiviert (analog zur alten ESLint-Config) `noExplicitAny`, `noTsIgnore`, `noNonNullAssertion`, `noImplicitAnyLet`. Bewusste Lockerung; `noNonNullAssertion` wiegt am schwersten, weil ein `!` die eingeschaltete Null-Prüfung wieder aushebelt.
- `any`-Hotspots (heuristisch): `ConsoleLogger.ts` (~6), `Kernel.ts` (~11), `ShadowObject.ts` (~4).
- Biome meldet aktuell ~30 Warnings im Source (z. B. `useIterableCallbackReturn`, `noShadowRestrictedNames`, `useNodejsImportProtocol`). Schrittweise abarbeiten oder bewusst weiter unterdrücken.
- `pnpm lint` endet mit rc=0 und zwei Infos zu `biome.json` selbst: `biome.json:2` hält `$schema` auf 2.4.14, installiert ist Biome 2.5.9, und `biome.json:57` benutzt das deprecated `linter.rules.recommended` (Nachfolger: `preset`). Beides hebt ein `biome migrate` — das dabei aber den wirksamen Regelsatz anfassen kann und deshalb einen eigenen, geprüften Lauf braucht, keinen Beifang.

### 5.4 Sonstige Stolperfallen auf frischer Maschine

- `pnpm install` installiert keine Playwright-Browser — manuelles `pnpm exec playwright install chromium firefox` nötig (wird in CLAUDE.md erwähnt).
- `engines.node: ">=24.13.0"` blockiert Mitwirkende auf Node 22.x. Hinweis: Node 24+ stellt eine inerte `localStorage`-Stub auf `globalThis`. Der `ConsoleLogger` verträgt sie seit der Fähigkeitsprüfung in `ConsoleLogger.ts` selbst. `packages/shadow-objects/vitest.setup.ts` ersetzt sie trotzdem weiter: Specs, die `localStorage` direkt benutzen, brauchen eine funktionierende Storage — ohne die Ersetzung fallen 8 Tests in 3 Dateien: `ConsoleLogger.spec.ts` (Fall `reads a style from storage as-is`), `ConsoleLogger.storage.spec.ts` (Fall `keeps using a localStorage that works without writing to it`) und `RemoteWorkerEnv.spec.ts` (6 Fälle im Block `console-logger config for the worker`).
- **`biome.json` führt `"trailingNewline": false`** (`:40`) — Dateien enden ohne abschließenden Zeilenumbruch, sonst ist `pnpm lint` rot. Steht weder in `CLAUDE.md` noch in `AGENTS.md`; wer eine Datei mit einem üblichen Editor-Default schreibt, läuft hinein. `*audit*.html` ist von `files.includes` ausgenommen (`:30`) und behält seinen Zeilenumbruch.
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
3. ~~**`MessageRouter`-Doppel-Confirm im Catch-Pfad fixen.** *(VIEW-3)*~~ ✅ Erledigt — eine Bestätigung je Change Trail, und nur dort, wo eine Seriennummer danach gefragt hat. Im selben Zug: geordneter Teardown auf `Destroy` und geprüfter Nachrichteneingang an beiden Einstiegspunkten.
4. ~~**Worker-Fehlerpfade härten:** `error`/`messageerror`-Handler, ausstehende Promises bei `destroy()` rejecten, expliziter `terminated`-Status.~~ *(VIEW-1, VIEW-2)* — ✅ Handler, `WorkerFailedError`/`WorkerDestroyedError`, `isDestroyed`, `RemoteWorkerEnv.WorkerFailed` und `ShadowEnv.ProxyFailed` stehen, und `destroy()` bricht das Ausstehende ab.
5. ~~**CI lässt E2E nicht aus** — Playwright-Browser im CI-Image installieren, `test:ci` umstellen oder zweiten Job ergänzen.~~ ✅ Erledigt — eigener Job `e2e`, Chromium und Firefox, vor dem npm-Publish.
6. ~~**Cache-Invalidierung von `traverseLevelOrderBFS` bei programmatischer Destruktion.** *(KERN-4)*~~ ✅ Erledigt.

### 7.2 Sollte zeitnah

7. **DOM-In-Place-Re-Parenting beobachten** — `MutationObserver(subtree:true)` auf einer höheren Ebene, damit ein zwischengeschobener Container gesehen wird. *(VIEW-6)*
8. **`LocalShadowObjectEnv.applyChangeTrail`** muss `MessageToView`-Reihenfolge zur Remote-Variante symmetrisch halten. *(VIEW-10)*
9. **Test-Lücken schließen** — Reihenfolge in §4.5.
10. **Magische `setTimeout(50)`-Waits** in `ShadowEnv.spec.ts` durch deterministische Drains ersetzen.

### 7.3 Mittelfristig

11. ~~**`strictNullChecks: true`** schrittweise einschalten — größter Hebel für Typensicherheit.~~ ✅ Erledigt — in drei Etappen (utils/worker/registry, view/elements, `Kernel`), das Flag steht in der Wurzel-`tsconfig.json`.
12. **`exports`-Konditionen umsortieren** (`types` vor `import`) für strikte Node-ESM-Konsumenten.
13. **`peerDependencies` für `@spearwolf/eventize`/`signalize`** dokumentiert beschließen.
14. **API-Aufräumen:** `appendRoute` aufteilen, `onDestroy`-Tripel-Bedeutung dokumentieren oder trennen, `IShadowObjectEnvProxy.isDestroyed`/`error`-Surface ergänzen.
15. **Performance-Knopf:** optionales RAF-Coalescing bei hoher Update-Frequenz.
16. ~~**`sideEffects`-Listen konsolidieren.**~~ ✅ Erledigt — `package.json` verliert seine acht toten `build/src/...`-Einträge, `package.override.json` trug nie welche.
17. **Biome-Warnings abarbeiten** (~30 Stück): `useIterableCallbackReturn`, `noShadowRestrictedNames` etc. — entweder fixen oder Regel bewusst abschalten.
18. **`Entity` ist aus keinem Entry exportiert**, obwohl die vier Lebenszyklus-Interfaces ihn in ihrer Signatur verlangen (`in-the-dark/events.d.ts`). Weder `index.d.ts` noch `shadow-objects.d.ts` führen `in-the-dark/Entity.js`, ein Konsument kann den geforderten Typ also nicht benennen. Der Ausweg ist heute `EntityApi` plus Methoden-Bivarianz — entweder wird er zum dokumentierten Weg, oder `Entity` wird exportiert.
19. **`EntityGraphNode` ist nicht exportiert**, obwohl `kernel.getEntityGraph()` ihn zurückgibt: in `Kernel.d.ts` steht das `interface` ohne `export`, die Datei endet auf `export {}`. Wer den Rückgabewert typisieren will, kann den Typ nicht benennen.
20. **`Registry.hasRoute()` sieht Property-Routen nicht.** `Registry.ts:138-140` liest nur `#routes`, während `clearRoute` (`:71-78`) beide Karten bedient. Gemessen: nach `appendRoute('@debug', ['debug-overlay'])` zieht die Route `debug-overlay` in die Auflösung, `hasRoute('@debug')` gibt trotzdem `false`. Entweder liest `hasRoute` beide Karten, oder es gibt eine zweite Abfrage für Property-Routen.
21. **`ShadowObjectConstructor` weiten oder `ShadowObjectConstructorFunc` überall zulassen.** `shadowObjects.define()` und `registry.define()` nehmen nur den Konstruktortyp; zur Laufzeit läuft eine Funktion, weil der Kernel jeden Konstruktor mit `new` ruft. Die Modulform `define: {...}` lässt beide Formen zu — der Typ ist also enger als das Verhalten, und enger als die Nachbarform.
22. **`emit`-Ziel weiten oder `EntityApi` als `EventizedObject` führen.** `types.d.ts:113` typt `emit(target: EventizedObject, ...)`, `EntityApi` trägt die eventize-Marker nicht; ein `emit(child, ...)` mit einem Kind-Entity scheitert deshalb typseitig, obwohl es zur Laufzeit ankommt.
23. **Der `queueMicrotask` um `onParentChanged` steht unbegründet da.** `Kernel.ts:354` stellt das Ereignis eine Microtask später zu, während `onCreate`, `onDestroy` und `onViewEvent` synchron laufen; die Stelle trägt weder Kommentar noch JSDoc. Der Unterschied ist für einen Anwender beobachtbar und inzwischen dokumentiert — die Begründung gehört an den Code. `dispatchMessageToView` (`:387`) macht dasselbe, ebenfalls unkommentiert.
24. **`define()` nennt seinen zweiten Parameter `constructa`.** Der Tippfehler steht in der emittierten Oberfläche, und zwar zweimal: `Registry.d.ts:7` und `ShadowObject.d.ts:16`. Ein Konsument sieht ihn in jeder Signatur, die seine IDE einblendet; die Referenz schreibt `constructor`. Entweder folgt der Code, oder der Name bleibt und niemand wundert sich mehr.

### 7.4 Beispiel-App / Dokumentation

25. **Transferable-API** (`dispatchShadowObjectsEvent(type, payload, [transferable])`) in `guides.md` an einem echten Beispiel zeigen — `OffscreenCanvas` aus der Demo. Der Sync-Takt-Teil dieses Punktes ist erledigt (2026-08-02).
26. **Demo-`console.debug`-Statement** entfernen.
27. **Die fünfzehn Element-Konstanten stehen in keiner Referenz.** `SHAE_ENT`, `SHAE_PROP`, `SHAE_WORKER` und die zwölf `ATTR_*` aus `elements/constants.ts` sind über `index.ts:2` öffentlich; `grep` über `docs/api-reference.md` und `docs/cheat-sheet.md` liefert für alle fünfzehn null Treffer. Die drei Ereignisnamen aus derselben Datei sind dokumentiert (`api-reference.md:1650-1652`) — entweder folgen die Tag- und Attributnamen dorthin, oder sie verlassen `index.ts`.
28. **Neun Wertexporte aus `constants.ts` ohne jede Doku-Zeile:** `ChangeTrailPhase`, `Configure`, `ChangeTrail`, `Destroy`, `Loaded`, `AppliedChangeTrail`, `ImportedModule`, `Destroyed`, `ShadowObjectsExport` (`src/constants.ts:3`, `:29-36`, `:48`, über `index.ts:1` öffentlich). Es sind Worker-Protokoll-Symbole; die Frage ist nicht, wie sie dokumentiert werden, sondern ob sie öffentlich sein sollen.
29. **Der Gloss »(Component Tag)« steht an neun Stellen**, während die Begriffstabelle in `AGENTS.md:83` »Token« bindet und »Component Tag« nur noch als Doku-Gloss vermerkt: `docs/getting-started.md:50`, `docs/cheat-sheet.md:238`, `docs/guides.md:143`, `:331`, `docs/concepts.md:43`, `docs/api-reference.md:442`, `:470`, `:1485` — und `AGENTS.md:18` selbst, fünfundsechzig Zeilen über der Tabelle. Entweder fällt der Gloss an allen neun Stellen, oder die Tabelle sagt, dass er bleiben darf; die Hälfte ist schlimmer als keine.
30. **`useProperties`: der Parameter heißt an zwei Stellen anders als im Code.** `cheat-sheet.md:67` und `concepts.md:249` nennen ihn `map`, `types.d.ts:85` und `docs/api-reference.md` nennen ihn `props`. Einer der beiden Namen gewinnt.
31. **»Shadow Entity« steht gegen die bindende Begriffstabelle.** `docs/api-reference.md:603` (»…maps to a Shadow Entity«) und `:842` (»…map a game engine object to a Shadow Entity manually«); `AGENTS.md` bindet »Entity«.

---

## 8. Zusammenfassung

`shadow-objects` ist konzeptionell ausgereift und kompakt: das ECS-Modell, die View/Worker-Spiegelung über ein 4-Methoden-Proxy und das `ShadowObjectCreationAPI` bilden ein in sich konsistentes, gut testbares Framework. Der Code ist überwiegend klar geschrieben, das Reaktivitätsmodell stützt sich konsequent auf zwei eigene, aktiv gepflegte Bibliotheken.

Die größten Risiken lagen weniger in der Architektur als in den **Fehler- und Lebenszyklus-Pfaden**; diese Seite ist inzwischen abgetragen: der `MessageRouter` bestätigt genau einmal, fährt seinen Kernel auf `Destroy` herunter und verwirft, was er nicht lesen kann, und beide Worker-Klassen haben eigene Specs. Die Lebenszyklus-Punkte sind abgearbeitet, Worker-Ausfall und gewollter Abbau ebenso, die E2E-Suite läuft in CI.

Die §7.1-Liste ist damit abgearbeitet. Die empfohlene Reihenfolge ist: erst die **Test-Lücken aus §4.5/§7.2** schließen, dann die **Tooling-Modernisierung aus §7.3** in Angriff nehmen.

In der jetzigen Version (0.30.2) ist das Framework für Demos, Spielwiesen und kleine Anwendungen einsetzbar; vor einem produktiven 1.0-Stempel sollte zumindest die §7.1-Liste abgearbeitet sein.
