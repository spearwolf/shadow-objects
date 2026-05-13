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
- Sauber getrennte Test-Runner (vitest, web-test-runner, Playwright).
- Sehr gute Abdeckung des wichtigsten Anwender-Kontrakts (`ShadowObjectCreationAPI`, Kontext-Vererbung, Lifecycle).

**Hauptrisiken:**
1. **Worker-Fehlerpfade unter-implementiert** — keine `error`/`messageerror`-Handler, keine Reconnect-Logik, ausstehende Promises hängen nach Worker-Tod ewig (oder bis 5–60 s Timeout).
2. ~~**Neues Feature „auto destruction on parent removal" (Commit 89c59c2) ist im Datenpfad nicht erreichbar** und behandelt Re-Parenting nicht.~~ **Behoben (KERN-1, KERN-2)** — Flag fließt jetzt durch `ICreateEntitiesChange` → `ComponentChanges.create()` → `parse()`; Subscription wird bei Re-Parent neu verdrahtet.
3. ~~**`destroyEntity` rekursiert nicht über Kinder** — bei Eltern-Destruktion bleiben Nicht-Auto-Kinder als verwaiste Einträge im Kernel.~~ **Behoben (KERN-3)** — Variante C: Flagged-Kinder kaskadieren, ungeflaggte werden zu Roots befördert.
4. **DOM-In-Place-Re-Parenting wird nicht beobachtet** (`<shae-prop>` und `<shae-ent>` resolvieren ihren Eltern-Knoten nur in `connectedCallback`).
5. **CI lässt das gesamte E2E-Paket aus** — der Worker-Roundtrip wird damit faktisch nicht von CI verifiziert.
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

- **TypeScript 6** (strict, aber **`strictNullChecks: false`** — Achtung: das ist eine bewusste Lockerung, die Typen-Sicherheit signifikant einschränkt).
- **`@spearwolf/signalize` 0.29.0** — Signals/Effects.
- **`@spearwolf/eventize` 5.0.0** — Event-Emitter.
- **esbuild 0.28** — Bundling, mit `esbuild-plugin-inline-worker` für den Worker-Inline.
- **vitest 4** für Unit-Tests (happy-dom) und Integrationstests (browser-mode + Playwright-Provider). **Playwright** für E2E.
- **turborepo 2.9** als Monorepo-Orchestrator, **biome 2.4** für Lint/Format, **pnpm 9.15** mit `catalog:`-SSOT, Node ≥ 24.13.0.

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

### 3.2 HIGH — View / Worker

**[VIEW-1]** `RemoteWorkerEnv.applyChangeTrail` hängt unbegrenzt, wenn der Worker stirbt.
*Ort:* `RemoteWorkerEnv.ts:100–140`, `constants.ts:45` (`WorkerChangeTrailTimeout = 5000`, `WorkerLoadTimeout = 60000`).
Fällt der Worker zwischen `postMessage` und `AppliedChangeTrail` aus, läuft erst der 5-Sekunden-Timeout ab. Bei `destroy()` werden `worker.terminate()` aufgerufen, die noch hängenden `waitForMessageOfType`-Listener werden aber nicht abgewickelt. Pending-Promises werden nicht zurückgewiesen.

**[VIEW-2]** Keine `error`/`messageerror`-Handler auf dem Worker.
*Ort:* `RemoteWorkerEnv.ts` (kein `addEventListener('error', …)`).
Worker-Modul-Init-Fehler bleiben stumm, bis der 60-Sekunden-Loaded-Timeout zuschlägt. Keine Reconnect-/Recover-Logik.

**[VIEW-3]** `MessageRouter` schluckt Fehler durch doppeltes `AppliedChangeTrail`.
*Ort:* `MessageRouter.ts:84–97`.
Im Catch-Block wird zuerst `{type: AppliedChangeTrail, serial, error}` gepostet, dann fällt der Code in den Block bei Zeile 94 und postet erneut `{type: AppliedChangeTrail, serial}` **ohne** error-Feld. Die zweite Nachricht erfüllt das `serial`-Match in `RemoteWorkerEnv.ts:114` und der Konsument bekommt einen False-Positive.
*Fix:* `return` nach dem Catch-Post oder Flag setzen.

**[VIEW-4]** Listener-Leak bei verwaisten Eltern-Knoten im DOM.
*Ort:* `ShaeEntElement.ts:213–214, 285–288, 327`.
Wenn ein `<shae-ent>`-Vater aus dem DOM entfernt wird, das Kind aber selbst noch verbunden bleibt (z. B. weil ein Zwischen-Container reparented wurde), bleibt der `entParentNode`-Listener am orphan-Vater hängen → Memory-Pressure.

### 3.3 MEDIUM — bemerkenswerte Auswahl

| ID | Beschreibung | Ort |
|---|---|---|
| **VIEW-5** | `<shae-prop>` löst seinen Eltern-`<shae-ent>` nur in `connectedCallback` auf — DOM-Verschiebungen ohne Disconnect lassen den Prop am alten Ent kleben. | `ShaePropElement.ts:9–18, 323` |
| **VIEW-6** | `MutationObserver` in `ShaeEntElement` setzt `subtree: false` — In-Tree-Reparenting via Zwischen-Container wird nicht gesehen. | `ShaeEntElement.ts:257` |
| **VIEW-7** | `ShadowEnv.envProxy`-Setter feuert `start()` fire-and-forget; ein nachfolgender Reassign kann durch das *alte* `start().then()` das `proxyReady`-Flag des neuen Proxys verfälschen. | `ShadowEnv.ts:117–125` |
| **VIEW-8** | `ShadowEnv.destroy()` löscht alle Listener — `syncWait()`-Aufrufer hängen für immer. | `ShadowEnv.ts:174` |
| **VIEW-9** | `removeTransferables` mutiert die Caller-Trail-Einträge per `delete`. | `RemoteWorkerEnv.ts:23–40` |
| **VIEW-10** | `LocalShadowObjectEnv` ignoriert `waitForConfirmation`; `MessageToView` läuft via `queueMicrotask`, sodass der `AfterSync`-Event vor den Worker-Nachrichten feuert. **Verhaltensasymmetrie zu `RemoteWorkerEnv`.** | `LocalShadowObjectEnv.ts:40`, `Kernel.ts:316–319` |
| **VIEW-11** | `ShaePropElement.isShaeEntElement = true` ist offenbar Copy-Paste — nutzt aber `findEntNode` zur Eltern-Suche, was potenziell falsche Treffer ergibt. | `ShaePropElement.ts:68` |
| ~~**KERN-5**~~ | ~~`Entity.parentUuid`-Setter ruft `removeFromParent()` *vor* dem Resolven des neuen Vaters; wirft `getEntity` einen Fehler, ist die Entity verwaist.~~ **✅ Behoben** — `getEntity` wird *vor* dem Detach aufgerufen; `Kernel.setParent` validiert die neue UUID vorab. | `Entity.ts`, `Kernel.ts` |
| ~~**KERN-6**~~ | ~~`Registry.clear()` löscht `#truthyPropRoutes` nicht — Test-Pollution + Akkumulation in langlebigen Registries.~~ **✅ Behoben** — `clear()` räumt auch die Prop-basierten Routen ab. | `Registry.ts` |
| ~~**KERN-7**~~ | ~~`useContext`/`useParentContext`/`useProperty` ignorieren `options` bei Cache-Hit (z. B. `compare`). Der erste Aufrufer „gewinnt", was leise zu falschen Equality-Vergleichen führen kann.~~ **✅ Behoben** — bei Cache-Hit mit abweichender `compare`-Funktion wird ein `console.warn` emittiert; das alte Reader-Objekt bleibt aus Kompatibilitätsgründen erhalten. | `Kernel.ts` |
| **VIEW-12** | `ShaePropElement` parst numerische Attribute ohne Warnung — `Number("foo")` → `NaN` propagiert. | `ShaePropElement.ts:177–205` |
| **VIEW-13** | `ShaeEntElement.#dispatchRequestParent`-Microtask prüft `isConnected` nicht; nach Disconnect bubbelt ein Streu-Event. | `ShaeEntElement.ts:343–346` |

### 3.4 LOW (Auswahl)

- **LOW-1** `Kernel.destroy()` ruft `traverseLevelOrderBFS().reverse()` — mutiert ggf. den internen Cache an Ort und Stelle (`Kernel.ts:781`).
- **LOW-2** `provideContext({clearOnDestroy: true})` registriert bei wiederholten Aufrufen jedes Mal eine neue Cleanup-Closure (`Kernel.ts:435–439, 476–480`).
- **LOW-3** `SignalsPath.dispose()` emittiert beim Teardown noch ein finales `'value' = undefined`, was Listener verwirren kann.
- **LOW-4** Globale Singletons (`__shadowEntsContexts`, `__shadowEnvs`, `FrameLoop.gUniqInstance`) erschweren Test-Isolation und Multi-Instance-Szenarien.
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

**vitest** (`packages/shadow-objects/src/**/*.spec.ts`, 8 Dateien):
`Kernel.spec.ts` (1080 LoC), `Registry.spec.ts`, `ShadowObject.spec.ts`, `SignalsPath.spec.ts`, `ShadowEnv.spec.ts`, `LocalShadowObjectEnv.spec.ts`, `ViewComponent.spec.ts`, `props-utils.spec.ts`.

**`shadow-objects-testing/`** (web-test-runner, browser-DOM): 9 Dateien — `build-change-trail`, `change-props`, `change-tokens`, `ComponentContext`, `forward-custom-events`, `local-env-entities`, `remove-and-append-e`, `send-events`, `emit-helper/emit-helper`.

**`shadow-objects-e2e/`** (Playwright, Chromium + Firefox): 3 Dateien — `bundle.spec.ts`, `remote-worker-env.spec.ts`, `shae-worker.spec.ts`. Assertions liegen meist in den Test-Pages, der Spec-Code prüft nur `data-testresult`.

### 4.2 Coverage-Heuristik

| Bereich | Status |
|---|---|
| Kernel-Lifecycle, Token-Routing, Registry, ShadowObject-API | ✅ **gründlich** |
| `ShadowObjectCreationAPI` (Properties, Context, Resource, Effect, Signal, Memo, on/once, onDestroy, emit) | ✅ **gründlich** |
| `OnCreate`/`OnDestroy` inkl. Token-Wechsel | ✅ **gründlich** |
| `SignalsPath`-Vorrang | ✅ Happy Path; ❌ keine Cleanup-/Error-Tests |
| `ChangeTrail`-Korrektheit (drei Phasen) | ✅ **gründlich** über drei Ebenen (Modell, DOM, E2E) |
| `ViewComponent` ↔ Entity | ✅ gründlich |
| `ShadowEnv` Setup/Teardown | 🟡 **partiell** — `envProxy`-Swap zur Laufzeit nicht getestet |
| `LocalShadowObjectEnv` | 🟡 nur Smoke + 1 Sync |
| `RemoteWorkerEnv` | 🟡 nur Happy-Path-E2E. **Keine vitest-Spec.** Init-Failure, Termination, Race-Recovery: ❌ |
| `MessageRouter` | ❌ keine direkten Tests |
| `WorkerRuntime` | ❌ keine direkten Tests |
| Custom Elements (`<shae-prop>`!) | 🟡 `ShaePropElement` hat **keine direkten Tests** |
| Utils | ❌ nur `props-utils.spec.ts` — `FrameLoop`, `waitForMessageOfType`, `cloneChangeTrail`, `attr-utils`, `array-utils`, `generateUUID`, `ConsoleLogger`, `toNamespace`, `toUrlString`, `importModule` haben keine Tests |
| Worker-Init-Failure / Terminate / Message-Race | ❌ |

### 4.3 Qualität

- Generell sehr lesbar, deklarative Assertions mit Kontext-Labels.
- Konsequentes `Registry.get().clear()` / `ComponentContext.get().clear()` in `afterEach`.
- Keine `.only` oder skipped Tests; Playwright-Konfig setzt `forbidOnly: true` für CI.
- **Flake-Risiko:** `ShadowEnv.spec.ts:136` und `:190` enthalten `await new Promise(r => setTimeout(r, 50))` — magische 50 ms statt deterministischer Microtask-Drains.
- E2E-Pattern (Page schreibt `data-testresult`) ist konzise, erschwert aber Debugging — Assertions liegen außerhalb des Spec-Files.

### 4.4 Konkrete Test-Lücken (ticket-fertig)

- Worker-Init-Failure (`Worker`-Konstruktor mit kaputter URL).
- `worker.terminate()` mitten im Sync; ausstehende `applyChangeTrail`-Promises müssen rejecten.
- `<shae-prop>` Tests (Property-Bindung, DOM-Verschiebung).
- `<shae-ent>`-`attributeChangedCallback` für `token` / `parent-id` / `forward-custom-events` (Re-Set auf leer).
- `<shae-worker>`-`src`-Wechsel nach `start()` (Re-Import-Pfad).
- `Transferables` über echten Worker (nicht nur In-Process).
- `ShadowEnv.envProxy`-Swap zur Laufzeit (Local → Remote und zurück).
- `provideContext` → Provider-Entity stirbt vor Consumer — `useContext`-Effect-Cleanup.
- `Registry.removeRoute` / `clear()` während aktive Entities existieren — Re-Upgrade-Verhalten.
- Mehrfaches `shadowObjects.define` mit gleichem Token.

### 4.5 Empfehlungen (priorisiert)

1. **`RemoteWorkerEnv`-Failure-Modes specifizieren** — größte produktionskritische Lücke (~170 LoC Transport-Code, nur Happy-Path-E2E).
2. **Magische Timeouts in `ShadowEnv.spec.ts` durch deterministische Drains ersetzen** — eliminiert das einzige offensichtliche Flake-Risiko.
3. **`<shae-prop>` end-to-end testen** — öffentliches Element ohne direkte Tests.
4. **Nicht-triviale Utils specifizieren** — vor allem `FrameLoop`, `waitForMessageOfType`, `cloneChangeTrail` (Worker-Boundary).
5. **`ShadowEnv` env-proxy-Swap-Test + `<shae-worker>` re-import-Test** — beide rühren an den aktuell ungetesteten `MessageRouter`/`WorkerRuntime`.

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
- Tooling auf modernen Major-Versionen: vitest 4, biome 2.4, turbo 2.9, esbuild 0.28, Playwright 1.59, TypeScript 6, happy-dom 20. ✅
- Kern-Lib hat **keine `peerDependencies`** — `@spearwolf/eventize`/`signalize` sind harte Deps; bei Mehrfach-Resolutionen drohen Duplikate.

### 5.3 Lint / TS

- `strict: true` **mit `strictNullChecks: false`** — die größte Typensicherheits-Lücke.
- Biome-Root deaktiviert (analog zur alten ESLint-Config) `noExplicitAny`, `noTsIgnore`, `noNonNullAssertion`, `noImplicitAnyLet`. Bewusste Lockerung, aber in Kombination mit `strictNullChecks: false` riskant.
- `any`-Hotspots (heuristisch): `ConsoleLogger.ts` (~20), `Kernel.ts` (~11), `ShadowObject.ts` (~4).
- Biome meldet aktuell ~30 Warnings im Source (z. B. `useIterableCallbackReturn`, `noShadowRestrictedNames`, `useNodejsImportProtocol`). Schrittweise abarbeiten oder bewusst weiter unterdrücken.

### 5.4 CI-Gap

Die GitHub-Action ruft `pnpm run ci` = `turbo run build typecheck test --filter=!shadow-objects-e2e && pnpm lint`. **`test:ci` schließt `shadow-objects-e2e` weiterhin aus.** Damit wird der gesamte Worker-Roundtrip nicht von CI verifiziert. Da `RemoteWorkerEnv` ohnehin keine Unit-Tests hat, ist das ein doppelt-blinder Punkt.

### 5.5 Sonstige Stolperfallen auf frischer Maschine

- `pnpm install` installiert keine Playwright-Browser — manuelles `pnpm exec playwright install chromium firefox` nötig (wird in CLAUDE.md erwähnt).
- `engines.node: ">=24.13.0"` blockiert Mitwirkende auf Node 22.x. Hinweis: Node 24+ ships eine inerte `localStorage`-Stub auf `globalThis`; für Tests gefixt durch `packages/shadow-objects/vitest.setup.ts`.
- `make:todo` ist Honor-System (kein Pre-Commit-Hook, kein CI-Check).
- Manuelles `CHANGELOG.md`-Pflegen ohne Changesets/release-please.

---

## 6. Beispiel-Anwendung `shae-offscreen-canvas`

Ein reines JS-Paket (kein TS), `src/` wird ohne Bundle-Schritt veröffentlicht. Demonstriert idiomatische Nutzung:

- `<shae-ent>` mit verschachtelten Tokens und Namespaces (`ns="foo"`).
- `<shae-worker>` lokal vs. remote.
- `<shae-offscreen-canvas>` als eigenes Custom Element, das per `vc.dispatchShadowObjectsEvent(OffscreenCanvas, payload, [offscreen])` einen `OffscreenCanvas` als Transferable in den Worker reicht.
- Drei gestapelte Canvas-Instanzen mit unterschiedlichen `pixel-zoom`/`fps`/`ns`-Attributen.

**Ergonomie-Feedback an die Kern-Lib:**
- Das Beispiel zeigt, dass `vc.syncShadowObjects()` nach Property-Batches **explizit** aufgerufen werden muss. Im README/Getting-Started ist das nicht ausreichend hervorgehoben — ein Naiv-Konsument bekommt Latenz, ohne zu verstehen, warum.
- Der Transferable-Parameter (`[offscreen]`) bei `dispatchShadowObjectsEvent` ist ein **mächtiges, aber kaum dokumentiertes** Feature.
- `console.debug('hello … 🦄')` in `src/bundle.js` ist eine Log-Rauschen-Falle für Konsumenten.
- `three@^0.179.1` als harte Demo-Dep zieht beim `pnpm install` viel Volumen.

---

## 7. Empfehlungen — priorisiertes Backlog

### 7.1 Muss vor 1.0

1. ~~**Auto-Destroy-Feature komplett verdrahten** — Feld in `ICreateEntitiesChange`, durchreichen in `parse()`, Re-Parenting-Subscription pflegen, E2E-Test mit Worker. *(KERN-1, KERN-2)*~~ ✅ Erledigt (Kernel- und ViewComponent-Specs sowie Playwright-E2E `auto-destruct.spec.ts` mit echtem `RemoteWorkerEnv`).
2. ~~**`destroyEntity` rekursiv über Kinder** — Politik definieren (kaskadieren oder zu Root befördern). *(KERN-3)*~~ ✅ Erledigt (Variante C).
3. **`MessageRouter`-Doppel-Confirm im Catch-Pfad fixen.** *(VIEW-3)*
4. **Worker-Fehlerpfade härten:** `error`/`messageerror`-Handler, ausstehende Promises bei `destroy()` rejecten, expliziter `terminated`-Status. *(VIEW-1, VIEW-2)*
5. **CI lässt E2E nicht aus** — Playwright-Browser im CI-Image installieren, `test:ci` umstellen oder zweiten Job ergänzen. *(CI-Gap)*
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

14. **`strictNullChecks: true`** schrittweise einschalten — größter Hebel für Typensicherheit.
15. **`exports`-Konditionen umsortieren** (`types` vor `import`) für strikte Node-ESM-Konsumenten.
16. **`peerDependencies` für `@spearwolf/eventize`/`signalize`** dokumentiert beschließen.
17. **API-Aufräumen:** `appendRoute` aufteilen, `onDestroy`-Tripel-Bedeutung dokumentieren oder trennen, `IShadowObjectEnvProxy.isDestroyed`/`error`-Surface ergänzen, Worker-Timeouts konfigurierbar machen.
18. **Performance-Knopf:** `disableStructuredClone` als Default für `LocalShadowObjectEnv`; optionales RAF-Coalescing bei hoher Update-Frequenz.
19. **`sideEffects`-Listen konsolidieren:** `package.json` und `package.override.json` haben noch tote `build/src/...`-Einträge aus der alten Build-Pipeline — auf `dist/src/...` reduzieren.
20. **Biome-Warnings abarbeiten** (~30 Stück): `useIterableCallbackReturn`, `noShadowRestrictedNames` etc. — entweder fixen oder Regel bewusst abschalten.

### 7.4 Beispiel-App / Dokumentation

21. **`vc.syncShadowObjects()` und Transferable-API** im `getting-started.md` und `guides.md` deutlicher hervorheben.
22. **Demo-`console.debug`-Statement** entfernen.

---

## 8. Zusammenfassung

`shadow-objects` ist konzeptionell ausgereift und kompakt: das ECS-Modell, die View/Worker-Spiegelung über ein 4-Methoden-Proxy und das `ShadowObjectCreationAPI` bilden ein in sich konsistentes, gut testbares Framework. Der Code ist überwiegend klar geschrieben, das Reaktivitätsmodell stützt sich konsequent auf zwei eigene, aktiv gepflegte Bibliotheken.

Die größten Risiken liegen weniger in der Architektur als in den **Fehler- und Lebenszyklus-Pfaden**: das gerade frisch eingeführte Auto-Destruction-Feature ist im Datenpfad nicht erreichbar, `destroyEntity` lässt Kindern offene Enden, der Worker-Tod wird nicht aktiv erkannt, und der `MessageRouter` schluckt Exceptions. Hinzu kommt eine relevante CI-Lücke (kein E2E in CI) und das Fehlen jeglicher Unit-Tests für `RemoteWorkerEnv`/`MessageRouter`/`WorkerRuntime`.

Die empfohlene Reihenfolge ist: erst die sechs **Muss-Punkte aus §7.1** angehen (Lifecycle-Korrektheit + Worker-Fehlerpfade + CI-Verifikation), dann die **Test-Lücken aus §4.5/§7.2** schließen, dann die **Tooling-/Typensicherheits-Modernisierung aus §7.3** in Angriff nehmen.

In der jetzigen Version (0.30.2) ist das Framework für Demos, Spielwiesen und kleine Anwendungen einsetzbar; vor einem produktiven 1.0-Stempel sollte zumindest die §7.1-Liste abgearbeitet sein.
