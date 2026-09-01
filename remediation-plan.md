# Remediation-Plan — @spearwolf/shadow-objects (Monorepo)

Quelle: ./audit.html vom 2026-09-01 · Branch: main · erstellt: 2026-09-01
Baseline: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test:ci` ✓ (Coverage 94,19 % Statements) · `pnpm -F shadow-objects-e2e test` ✓ (654 Tests, chromium/firefox/webkit)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/07f7f035-17e8-4121-b454-61b182baa3fd/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 3 von 36 Findings (0 critical, 0 high, 1 medium, 2 low) · ausgenommen: alles Übrige, info, acknowledged
Scope-Regel: nur PERF-001, BUG-001 und IMPL-001 samt allem, was ihre Behebung nach sich zieht; ein Befund, der erst im Lauf auffällt, gehört in diesen Lauf, wenn er ein echter Korrektheitsfehler ist — unabhängig von seiner Severity. Alles andere geht als neues Finding ins Audit.
Stand (2026-09-01): Lauf abgeschlossen · 4 Pakete committet (367b72e, 717b884, 69c3762, dc75fad) · kein Paket blockiert · Befund-Queue geleert, alle sieben Einträge als neue Findings in ./audit.html (TEST-023, TEST-024, TEST-025, TEST-026, DX-042, CLEAN-020, API-002) · voller Verify-Lauf grün (Lint, Typecheck, Build, `pnpm test:ci`, E2E 681 Fälle) · Score 78,5 → 78,0

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen
- IMPL-001 wird als Attribut umgesetzt, nicht wegdokumentiert: `<shae-ent>` bekommt ein boolesches Attribut `auto-destruct`, das `ShaeEntElement` als `autoDestructionOnParentRemoval` an den `ViewComponent`-Konstruktor durchreicht. Kurzer Name, deckt sich mit der bestehenden E2E-Fixture `auto-destruct.js`. Dazu die Zeile in `docs/`, `README.md` und `CHANGELOG.md`, die AGENTS.md §4 verlangt, und der DOM-Fall, den `KNOWN-DEFECTS.md` heute als unmöglich vermerkt. (2026-09-01)
- Nebenbefunde: nur echte Korrektheitsfehler werden in diesem Lauf mitbehoben, der Rest wandert als neues Finding ins Audit. (2026-09-01)
- `./remediation-plan.md` wird am Ende committet und danach aus dem Arbeitsbaum geräumt. (2026-09-01)

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
- Code, Kommentare und Doku ausschließlich auf Englisch, Doku in Markdown.
- ECS-Terminologie. Verboten als Analogie: "shadow theater", "puppet",
  "puppeteer", "light world", "screen". Bindende Namen: `RemoteWorkerEnv`,
  Entity, Entity Tree, Namespace/`ComponentContext`, Token.
- `ComponentContext` (View-seitige Registry) und "Entity Context"
  (`provideContext`/`useContext`) werden nie vermischt.
- Eine Änderung an der öffentlichen API von `@spearwolf/shadow-objects` fasst im
  selben Zug `packages/shadow-objects/docs/`, `packages/shadow-objects/README.md`
  und `packages/shadow-objects/CHANGELOG.md` an (Abschnitt `## [Unreleased]`).
  Monorepo-Belange gehen in die Wurzel-`CHANGELOG.md` mit Datumsabschnitt.
- Nach einer Änderung an Quellen oder Doku `AGENTS.md` gegenlesen und
  nachziehen, was nicht mehr stimmt.
- Ändert sich ein TODO-Kommentar, läuft `pnpm make:todo`.
- Lint und Format sind Biome, Konfiguration nur in der Wurzel.
- Versionen stehen ausschließlich im `catalog:` von `pnpm-workspace.yaml`.

## Vorbestehende Fehler
Keine. Lint, Typecheck, Build, `test:ci` und die E2E-Suite waren vor
Lauf-Beginn vollständig grün.

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.
- [x] `packages/shadow-objects-e2e/TEST-PLAN.md:306` (H-FIX-5) — die Zeile sagt
  »`allowConsoleErrors` for the three pages that provoke one«; es sind zwei,
  `tests/worker-failure.spec.ts:23` und `tests/sync-failure.spec.ts:22`, und §1 derselben
  Datei nennt korrekt genau diese beiden. Aus Paket 3, vorbestehend (`git show 717b884`
  zeigt denselben Wortlaut). Severity low. → Audit — eine Zahl in einer privaten,
  unveröffentlichten Planungsdatei, kein Korrektheitsfehler im Code, und die Scope-Regel
  nimmt nur den auf.
- [x] `packages/shadow-objects-e2e/TEST-PLAN.md:64` — die Aufzählung der Seiten mit gleicher
  Schnappschuss-Machart führt `multi-env`, dessen Fixture `public/mod-multi-env.js:32-33`
  aber `requestReport`/`probeReport` auf einem einzelnen Probe-Objekt fährt statt des
  `requestSnapshot`/`snapshot`-Paars der übrigen. Aus Paket 3, vorbestehend (`git show
  717b884` führt `multi-env` in derselben Liste). Severity low. → Audit — dieselbe
  Begründung wie oben.
- [x] `packages/shadow-objects/docs/api-reference.md:1848` — der Absatz zur Wahrheitsregel
  von `local` und `no-autostart` schließt mit »every other value counts as unset«, während
  `readBooleanAttribute` einen Wert aus lauter Leerraum über sein `|| '1'` als gesetzt
  zählt. Aus Paket 3, vorbestehend; die neue Zeile auf `:2027-2031` trägt dieselbe Machart
  und gehört mit derselben Änderung korrigiert, sonst wird die Datei uneinheitlich.
  Severity low. → Audit — eine Ungenauigkeit am Rand einer veröffentlichten Doku, kein
  Korrektheitsfehler im Code. Wer sie aufnimmt, nimmt beide Stellen.
- [x] `packages/shadow-objects-testing/test/ent-element-namespace.test.js:318` — der Fall
  »the parent observer follows the element to its new parent« ruft `customElements.define` innerhalb
  des `it`; ein zweiter Durchlauf desselben Falls (Vitest-Retry) liefe in
  `NotSupportedError: the name has already been used`. Retries sind in dieser Suite nicht
  konfiguriert, also latent. Die beiden Klassen in `ent-element-context-clear.test.js` stehen auf
  Modulebene, wo das Problem nicht auftritt. Aus Paket 4, vorbestehend (`git show 9b0b00a` zeigt
  denselben Aufruf auf derselben Zeile). Der neue Fall aus Paket 4 folgt derselben Machart, weil die
  Datei sie vorgibt — es sind jetzt drei Stellen. Severity low. → Audit — Testhygiene in einer
  privaten Suite, unter der heutigen Konfiguration nie erreichbar, kein Korrektheitsfehler im Code.
- [x] `packages/shadow-objects-testing/test/ent-element-namespace.test.js:66` — `describe('shae-ent
  and a namespace change')` und der Eröffnungsabsatz rahmen die Datei als Namespace-Wechsel; die
  `moveBefore`-Fälle darin haben keinen. Aus Paket 4, vorbestehend (`git show 9b0b00a` zeigt denselben
  Rahmen und den Fall ohne Namespace-Wechsel darunter); Paket 4 hat zwei weitere dazugestellt.
  Severity low. → Audit — die Gliederung einer privaten Testdatei, kein Korrektheitsfehler im Code.
- [x] `packages/shadow-objects/src/elements/ShaeEntElement.ts:570` — im Kommentarblock von
  `disconnectedCallback` bricht eine Zeile mitten im Absatz auf 44 Zeichen um (»above. An entity that
  leaves the tree«), während der Block sonst auf 97 bis 99 läuft. Aus Paket 4, vorbestehend (`git show
  9b0b00a` zeigt denselben Umbruch auf Zeile 541). Biome formatiert Kommentare nicht, das bleibt also
  stehen, bis es jemand von Hand macht. Severity low. → Audit — reines Schriftbild.
- [x] `packages/shadow-objects/src/elements/ShaeEntElement.ts:488-490` — verschiebt ein fremder
  Watcher das Element während der Anmeldung weg und im selben Callback wieder unter denselben Knoten
  zurück, bekommt der Erweiterungspunkt ein `onParentChanged(newParent, oldParent)` mit
  `newParent === oldParent`. Einmal, nicht doppelt, und der Endzustand stimmt. Aus Paket 4,
  vorbestehend: `git show 9b0b00a:…/ShaeEntElement.ts:481` zeigt in der Callback-Funktion des
  eigenen `MutationObserver` denselben Aufruf `this.onParentChanged(this.getParentNodeForObserver(),
  parent)`, der Zug ist also älter als der geteilte Observer. Severity low. → Audit — das Element hat
  den Knoten tatsächlich verlassen, die Meldung liegt damit innerhalb dessen, was
  `docs/api-reference.md:2077` zusichert (»Called when the element leaves its parent node«); ein
  Konsument kann von der Gleichheit der beiden Argumente trotzdem überrascht werden. Kein
  Korrektheitsfehler, und die Scope-Regel nimmt nur den auf.

Alle sieben am 2026-09-01 nach der Scope-Regel ins Audit zurückgegeben und dort als offene
Findings eingetragen — in der Reihenfolge dieser Liste: TEST-023, TEST-024, DX-042, TEST-025,
TEST-026, CLEAN-020, API-002.

## Pakete

### [x] 1. Change-Trail-Bestätigung: die Seriennummer null ist eine Seriennummer
- Findings: BUG-001 (low)
- Ziel: Der Router bestätigt jeden Change Trail, der eine Bestätigung angefordert hat, auch den mit der Seriennummer 0.
- Bereich: `packages/shadow-objects/src/worker/MessageRouter.ts` (Erfolgs- und Fehlerzweig), Gegenprobe an `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`
- Hängt ab von: —
- Hash: 367b72e
- Modell: mittlere Stufe
- Effort: medium
- Dateien: `packages/shadow-objects/src/worker/MessageRouter.spec.ts`, `packages/shadow-objects/src/worker/MessageRouter.ts`, `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. **Zuerst der Regressionstest, rot.** In `packages/shadow-objects/src/worker/MessageRouter.spec.ts`,
     im `describe('routing')`-Block: den vorhandenen Fall
     `it('treats a serial of 0 like no serial at all', …)` samt seinen beiden Kommentarzeilen
     darüber (»The boundary of that truthiness check. …«) **ersetzen** durch:

     ```ts
     // Zero is a serial like any other. This library's view side counts up from 1
     // (`view/RemoteWorkerEnv.ts`), but the wire is open to any implementation of the proxy
     // contract, and one that starts at zero would otherwise sit out its confirmation window
     // for a trail the Kernel applied cleanly.
     it('confirms a change trail whose serial is 0', () => {
       const {kernel, posted, router} = setup();

       router.route(changeTrailMessage(0, createEntity('a')));

       expect(kernel.hasEntity('a')).toBe(true);
       expect(posted.map((entry) => entry.message)).toEqual([{type: AppliedChangeTrail, serial: 0}]);
     });
     ```

  2. Im selben Spec, im `describe('a change trail that fails')`-Block, direkt hinter
     `it('does not confirm a failing change trail that carries no serial', …)` einfügen:

     ```ts
     // The failing route answers the same question: a caller holding serial 0 is waiting for
     // its rejection like any other.
     it('confirms a failing change trail whose serial is 0', () => {
       const {posted, router} = setup();
       vi.spyOn(console, 'error').mockImplementation(() => undefined);

       router.route(changeTrailMessage(0, setParent('a', 'ghost')));

       expect(posted).toHaveLength(1);
       expect(posted[0]!.message.type).toBe(AppliedChangeTrail);
       expect(posted[0]!.message.serial).toBe(0);
       expect(posted[0]!.message.error).toEqual(expect.stringMatching(/.+/));
     });
     ```

  3. Im selben Spec die beiden Kommentarzeilen über
     `it('applies a change trail that carries no serial without confirming it', …)` — heute
     »The confirmation hangs on the truthiness of `serial`. A missing key and an explicit
     `undefined` are the same thing to that check.« — ersetzen durch:

     ```ts
     // A confirmation goes out where a serial asked for one. A missing key and an explicit
     // `undefined` are the same thing to that question.
     ```

  4. Den roten Lauf nachweisen und seine Ausgabe in den Report nehmen:
     `pnpm -F @spearwolf/shadow-objects exec vitest src/worker/MessageRouter.spec.ts --run`.
     Erwartet: die beiden neuen Fälle scheitern, die übrigen laufen grün.
  5. **Dann der Fix.** In `packages/shadow-objects/src/worker/MessageRouter.ts`, Methode
     `#onChangeTrail`: beide Vorkommen von `if (data.serial) {` — heute Zeile 191 im
     Fehlerzweig und Zeile 205 im Erfolgszweig — auf `if (data.serial != null) {` ändern.
     Nur der Operator ändert sich; die Rümpfe bleiben, wie sie sind.
  6. Den Kommentarblock über `try {` in `#onChangeTrail` (heute Zeile 184–186, beginnend mit
     »One change trail, one confirmation …«) um genau einen Satz am Ende ergänzen:

     ```ts
     // A serial is either on the message or it is not; zero is a number like any other, and
     // the sender that chose it is waiting for its answer.
     ```

  7. Denselben Spec-Lauf aus Schritt 4 grün sehen.
  8. `packages/shadow-objects/CHANGELOG.md`, Abschnitt `## [Unreleased]` → `### Bugfixes`,
     als letzten Aufzählungspunkt dieses Abschnitts (direkt vor `### Types`) anhängen:

     ~~~markdown
     - **Bugfix (worker):** a change trail whose serial is `0` is confirmed like any other. The worker answers wherever a serial travelled with the trail, on the applied route and on the refusal route alike, so a proxy implementation that counts from zero gets its answer instead of sitting out `changeTrailTimeout` and reporting a `WorkerTimeoutError` for a trail the Kernel applied cleanly. `RemoteWorkerEnv` counts up from 1 and is unaffected.
     ~~~

     Eine Zeile, wie jeder andere Eintrag dieses Abschnitts — nicht umbrechen.
  9. **Nichts sonst.** `packages/shadow-objects/docs/`, `README.md`, `AGENTS.md` und die
     Wurzel-`CHANGELOG.md` bleiben unberührt: `MessageRouter` steht nicht in `src/index.ts`,
     die Zusicherung, die die Doku gibt, ist »ohne Seriennummer keine Antwort«
     (`docs/api-reference.md:1636`, `docs/guides.md:593`, `src/view/ShadowEnv.ts:301`), und
     die bleibt wörtlich richtig — dieser Fix ändert allein, was als *ohne* zählt. Auch
     `src/view/RemoteWorkerEnv.ts` wird nicht angefasst: `++this.#changeTrailSerial` in Zeile
     359 zählt ab 1 und ist genau richtig so. `dist/`-Dateiliste und `dist/package.json`
     bewegen sich nicht, also auch `src/distContract.*` nicht.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci`
- Commit: `fix(worker): a change trail is confirmed wherever a serial travelled with it`
- Ergebnis: 1 Runde · BUG-001 behoben, beide Zweige von `#onChangeTrail` prüfen jetzt auf
  `data.serial != null` · Regressionstests `confirms a change trail whose serial is 0` und
  `confirms a failing change trail whose serial is 0` (beide vor dem Fix rot, Ausgabe im
  Implementierer-Report) · Review ohne Befund in jeder Stufe · Verify grün mit
  abgeschaltetem turbo-Cache (0 von 8 Tasks aus dem Cache), Coverage 94,19 % wie in der
  Baseline
- Nebenbefunde: keine
- Folgen: keine

**BUG-001 · low · packages/shadow-objects/src/worker/MessageRouter.ts:180, :193; packages/shadow-objects/src/view/RemoteWorkerEnv.ts:355** — Die Bestätigung eines Change Trails hängt an der Wahrheit einer Zahl

Der Router antwortet auf einen Change Trail nur dann, wenn `if (data.serial)` trifft — beide Male,
im Erfolgs- wie im Fehlerzweig. Die Seriennummer ist eine Zahl, und die Null ist falsch: ein Trail
mit `serial 0` bekommt keine Bestätigung, obwohl er eine angefordert hat. Heute tritt der Fall nicht
ein, weil `RemoteWorkerEnv` mit `++this.#changeTrailSerial` zählt und damit bei 1 beginnt. Diese
Zusicherung steht aber in einer anderen Datei, auf der anderen Seite einer Nachrichtengrenze, und
die Grenze ist ausdrücklich offen: `IShadowObjectEnvProxy` ist ein Vertrag, den ein Konsument selbst
erfüllen darf. Wer dort bei null anfängt, bekommt keinen Fehler, sondern Stille — die Ansicht sitzt
ihren `changeTrailTimeout` ab und meldet einen `WorkerTimeoutError` für einen Trail, den der Kernel
sauber angewandt hat.

Empfehlung: Beide Stellen auf `data.serial != null` umstellen. Das ist die Frage, die tatsächlich
gemeint ist, kostet nichts und macht die Zusicherung an dem Ort überflüssig, an dem sie ohnehin
nicht steht. Ein Fall in `MessageRouter.spec.ts`, der einen Trail mit `serial 0` schickt und die
Bestätigung erwartet, hält es fest.

### [x] 2. `<shae-ent>`: ein Observer je Elternknoten
- Findings: PERF-001 (medium)
- Ziel: Ein Elternknoten trägt einen einzigen `MutationObserver` für alle Knoten, die auf ihm beobachtet werden, statt einen je `<shae-ent>`.
- Bereich: `packages/shadow-objects/src/elements/`
- Hängt ab von: —
- Hash: 717b884
- Modell: mittlere Stufe
- Effort: medium
- Dateien: `packages/shadow-objects/src/elements/parentRemoval.ts` (neu),
  `packages/shadow-objects/src/elements/parentRemoval.spec.ts` (neu),
  `packages/shadow-objects/src/elements/ShaeEntElement.ts`,
  `packages/shadow-objects/src/distContract.files.txt`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. **Neues Modul** `packages/shadow-objects/src/elements/parentRemoval.ts`. Es wird von
     `index.ts` nicht re-exportiert und steht in keinem Eintrag der `exports`-Map — es ist
     paketintern, genau wie `hostedSlots.ts` und `forwardCustomEvents.ts`. Inhalt vollständig:

     ```ts
     interface ParentWatch {
       observer: MutationObserver;
       /** What to run for each watched child of this parent, keyed by that child. */
       watchers: Map<Node, () => void>;
     }

     /**
      * One `MutationObserver` per watched parent node, however many nodes are watched on it.
      *
      * A `childList` observation belongs to the observer and not to the child it was taken out
      * for: n observers on one node see every mutation of that node n times, and each of them
      * walks the whole `removedNodes` list. Emptying a list of n siblings costs n² callback runs
      * that way. One observer per node costs one run per mutation, and the lookup behind it is
      * keyed by the removed node — a set that is small against the number of siblings.
      *
      * The map is keyed by the parent node, so an entry cannot outlive the node it belongs to.
      * What it holds are children of that node, which the node already holds itself.
      */
     const parentWatches = new WeakMap<Node, ParentWatch>();

     const createParentWatch = (parent: Node): ParentWatch => {
       const watchers = new Map<Node, () => void>();

       const observer = new MutationObserver((mutations, activeObserver) => {
         const removed: Array<() => void> = [];

         for (const {removedNodes} of mutations) {
           for (const node of removedNodes) {
             const onRemoved = watchers.get(node);
             if (onRemoved == null) continue;
             // taken off before it runs, and that order is the whole point: the callback decides
             // where its node is watched next, and an entry deleted afterwards would take that
             // answer with it. It is also what makes a node that appears twice in one batch —
             // taken out, put back, taken out again — run its callback once
             watchers.delete(node);
             removed.push(onRemoved);
           }
         }

         for (const onRemoved of removed) onRemoved();

         // behind the callbacks, never in front of them: one that puts its node back under this
         // same parent keeps the observation standing instead of paying for a fresh one
         if (watchers.size === 0) {
           activeObserver.disconnect();
           parentWatches.delete(parent);
         }
       });

       observer.observe(parent, {childList: true, subtree: false, attributes: false});

       return {observer, watchers};
     };

     /**
      * Run `onRemoved` once `node` is taken out of `parent`'s child list.
      *
      * A second call for the same pair replaces the callback. The watch ends the moment it fires
      * — whoever wants to go on watching says so from inside the callback.
      */
     export const watchForRemovalFrom = (parent: Node, node: Node, onRemoved: () => void): void => {
       let watch = parentWatches.get(parent);
       if (watch == null) {
         watch = createParentWatch(parent);
         parentWatches.set(parent, watch);
       }
       watch.watchers.set(node, onRemoved);
     };

     /** Stop watching `node` under `parent`. A pair nobody watches is left alone. */
     export const stopWatchingForRemovalFrom = (parent: Node, node: Node): void => {
       const watch = parentWatches.get(parent);
       if (watch == null) return;
       if (!watch.watchers.delete(node)) return;
       if (watch.watchers.size === 0) {
         watch.observer.disconnect();
         parentWatches.delete(parent);
       }
     };
     ```

     Der Observer bekommt sich selbst als zweites Callback-Argument — das ist der Weg ohne
     Vorwärtsreferenz auf die eigene `const`-Bindung, und `activeObserver` heißt er, weil `self`
     im Browser und im Worker ein Global ist. `subtree: false` heißt, dass jeder
     Record dieses Observers `parent` als `target` hat; die Prüfung `target === parent` aus dem
     alten Callback entfällt ersatzlos.
  2. **`ShaeEntElement.ts` umbauen.** Import ergänzen (alphabetisch zwischen
     `./hostedSlots.js` und `./requestEntAncestor.js`):

     ```ts
     import {stopWatchingForRemovalFrom, watchForRemovalFrom} from './parentRemoval.js';
     ```

     Das Feld `#parentObserver?: MutationObserver | undefined;` (heute Zeile 118) ersetzen durch:

     ```ts
     /** The node this element is watched on, for as long as it hangs in one. */
     #observedParentNode?: Node | undefined;
     ```

     `#createParentObserver()` und `#destroyParentObserver()` (heute Zeile 473–506) ersetzen durch:

     ```ts
     #observeParentNode() {
       this.#unobserveParentNode();
       const parent = this.getParentNodeForObserver();
       if (parent) {
         this.#observedParentNode = parent;
         watchForRemovalFrom(parent, this, () => {
           // the watch ended when it fired, and the field says so before anything else runs
           this.#observedParentNode = undefined;
           this.onParentChanged(this.getParentNodeForObserver(), parent);
         });
       }
     }

     #unobserveParentNode() {
       if (this.#observedParentNode == null) return;
       stopWatchingForRemovalFrom(this.#observedParentNode, this);
       this.#observedParentNode = undefined;
     }
     ```

     `onParentChanged` bleibt zwischen den beiden stehen, wo es heute steht. Alle vier Aufrufstellen
     umbenennen — `#createParentObserver()` in `connectedCallback` (heute Zeile 466) und in
     `onParentChanged` (heute Zeile 500) werden `#observeParentNode()`, `#destroyParentObserver()`
     in `disconnectedCallback` (heute Zeile 520) und in `teardown()` (heute Zeile 595) werden
     `#unobserveParentNode()`. Beide Aufrufe in `disconnectedCallback` und `teardown()` bleiben
     stehen: sie sind es, die den Eintrag aus der Registry nehmen, bevor das Element eingesammelt
     werden darf, und `elementReachability.spec.ts` misst genau das.
     Die letzten beiden Zeilen des Kommentars in `onParentChanged` (heute Zeile 499, »The call is
     idempotent — #createParentObserver starts with #destroyParentObserver«) ersetzen durch:

     ```ts
     // The call is idempotent — #observeParentNode starts with #unobserveParentNode
     ```
  3. **Spec** `packages/shadow-objects/src/elements/parentRemoval.spec.ts`, happy-dom wie die
     übrigen Element-Specs. Sie entsteht in zwei Anläufen, und die Reihenfolge ist der ganze
     Beweis: **zuerst**, noch vor Schritt 1 und 2, nur die Regressionsprobe am Element — eine
     Datei, die `../shae-ent.js` importiert und sonst nichts, insbesondere nicht das Modul, das es
     zu diesem Zeitpunkt gar nicht gibt. Dieser Lauf ist rot, und er ist rot am Befund und nicht an
     einem fehlenden Import. **Danach** Schritt 1 und 2, und erst dann kommen die übrigen Fälle
     samt dem Import von `./parentRemoval.js` in dieselbe Datei.
     happy-dom stellt den Callback über `queueMicrotask` zu und reicht
     `(records, observer)` durch; trotzdem in jedem Fall einen Makrotask abwarten
     (`await new Promise((resolve) => setTimeout(resolve, 0))`), nicht bloß ein `Promise.resolve()`.
     Der Zähler für die Observer entsteht mit `vi.spyOn(globalThis, 'MutationObserver')` in einem
     `beforeEach`, zurückgenommen in `afterEach`; `document.body.replaceChildren()` räumt auf, wie
     in `elementReachability.spec.ts`. Diese Fälle, jeder mit einem Namen, der die Zusicherung
     ausspricht:
     - der Callback läuft, wenn der Knoten aus dem Elternknoten genommen wird, und nur für diesen
       Knoten — ein zweiter, gleichzeitig beobachteter Geschwisterknoten bleibt still;
     - ein Paar, das `stopWatchingForRemovalFrom` abgemeldet hat, läuft nicht mehr;
     - **ein Observer je Elternknoten**: drei Knoten unter einem Elternknoten anmelden, danach
       hat der Spy genau einen Aufruf;
     - der Observer wird getrennt, sobald der letzte Beobachter geht: nach dem Abmelden aller drei
       einen vierten Knoten unter demselben Elternknoten anmelden — der Spy steht dann bei zwei
       Aufrufen, die Registry hat den Eintrag also fallen lassen;
     - ein Callback, der seinen Knoten im selben Lauf wieder unter denselben Elternknoten meldet,
       hält die Beobachtung: der Spy bleibt bei einem Aufruf, und ein zweites Entfernen feuert
       erneut. Das ist der `moveBefore`-Fall innerhalb desselben Elternknotens, in der Einheit
       nachgestellt;
     - **die Regressionsprobe am Element** — der Fall aus dem ersten Anlauf: `import '../shae-ent.js'`,
       drei `<shae-ent>` unter einem gemeinsamen Elternknoten in `document.body` hängen, danach
       steht der Spy bei genau einem Aufruf. Gegen den heutigen Stand sind es drei. Der rote Lauf
       (`pnpm -F @spearwolf/shadow-objects exec vitest src/elements/parentRemoval.spec.ts --run`)
       gehört in den Report. Die übrigen Fälle prüfen ein Modul, das es vorher nicht gab; für sie
       gibt es kein Rot, und das ist kein Versäumnis.
  4. **`packages/shadow-objects/src/distContract.files.txt`**: vier Zeilen einfügen, sortiert
     hinter `src/elements/hostedSlots.js.map` und vor `src/elements/propValueConverters.d.ts`:

     ```
     src/elements/parentRemoval.d.ts
     src/elements/parentRemoval.d.ts.map
     src/elements/parentRemoval.js
     src/elements/parentRemoval.js.map
     ```

     `src/distContract.package.json` bleibt unberührt: es kommt kein Einstiegspunkt und kein
     `exports`-Eintrag dazu.
  5. **`packages/shadow-objects/CHANGELOG.md`**, Abschnitt `## [Unreleased]` → `### Internal`,
     direkt hinter dem letzten vorhandenen `**Performance (view):**`-Punkt (dem über die beiden
     geordneten Uuid-Listen), als neuer Aufzählungspunkt in einer Zeile:

     ~~~markdown
     - **Performance (elements):** a parent node carries one `MutationObserver` for every `<shae-ent>` watched on it, instead of one per element. The observation belongs to the observer and not to the child it was taken out for, so n elements under one parent used to see every child-list mutation of that node n times, each run walking the whole `removedNodes` list; taking a list of n siblings apart cost n² callback runs. It is one run per mutation now, and the lookup behind it is keyed by the removed node. A new module `src/elements/parentRemoval.ts` holds the register — `watchForRemovalFrom(parent, node, onRemoved)` and `stopWatchingForRemovalFrom(parent, node)` — and adds four files under `dist/src/elements/` to the published list: `parentRemoval.js`, the declaration and a source map beside each. It is not re-exported from `index.ts` and no entry of the `exports` map points at it, so the file list is all a consumer sees of it. Nothing on the surface moves: `getParentNodeForObserver()` and `onParentChanged(newParent, oldParent)` keep their signatures and their meaning, and an element still hears about its own removal and about nobody else's.
     ~~~

     Keine erfundenen Messzahlen. Die vorhandenen `**Performance (view):**`-Einträge tragen
     gemessene Werte, weil sie gemessen wurden; hier steht der Mechanismus, und die Spec hält die
     Zusicherung fest.
  6. **Nichts sonst.** `packages/shadow-objects/docs/`, `README.md`, `AGENTS.md` und die
     Wurzel-`CHANGELOG.md` bleiben unberührt. Der `<shae-ent>`-Abschnitt der `api-reference.md`
     beschreibt `getParentNodeForObserver()` und `onParentChanged(newParent, oldParent)`, und
     beide sagen nach dem Umbau dasselbe wie davor; das Modul dahinter hat die Doku nie erwähnt.
     `dist/package.json` bewegt sich nicht. `pnpm make:todo` entfällt — es entsteht kein
     TODO-Kommentar.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci`
- Commit: `perf(elements): one observation per parent node carries every element that hangs on it`
- Ergebnis: 3 Runden · PERF-001 behoben — `src/elements/parentRemoval.ts` hält eine
  `WeakMap<Node, ParentWatch>` mit einem `MutationObserver` je Elternknoten, `ShaeEntElement`
  meldet sich über `#observeParentNode()`/`#unobserveParentNode()` dort an und ab ·
  Regressionsprobe `watches three <shae-ent> under one parent with a single observer` (vor dem
  Fix rot: Spy sah 3 Konstruktionen statt 1, Ausgabe im Implementierer-Report) · die
  Fehlerkette hat drei Eigenschaften nachgezogen, die der geteilte Observer sonst verloren
  hätte: anstehende Records werden vor einer Neuanmeldung über `takeRecords()` abgeräumt, jeder
  Callback läuft in `try`/`catch` mit `console.error`, und Registry-Einträge werden nur bei
  Identität gelöscht — je mit eigenem Testfall, je vor dem Fix rot gesehen · Verify grün mit
  abgeschaltetem turbo-Cache (0 von 5 Tasks aus dem Cache), 968 + 384 + 139 Tests, Coverage
  94,20 % gegen 94,19 % der Baseline · klein, dokumentiert und nicht behoben:
  `src/elements/ShaeEntElement.ts:489` — hängt ein fremder Callback das Element im
  Registrierungsfenster von `#observeParentNode()` synchron unter einen anderen Elternknoten,
  überschreibt die Zuweisung an `#observedParentNode` den neuen Knoten mit dem alten. Der
  Reviewer hat nachgemessen, dass der Zustand nach einem Microtask konsistent ist und kein
  Registry-Eintrag verwaist; es bleibt ein doppeltes `onParentChanged` mit dem alten
  Elternknoten, und die Erreichbarkeit verlangt `moveBefore` plus eine Subklasse, die aus
  `onParentChanged` heraus fremde Elemente verschiebt
- Nebenbefunde: keine
- Folgen: eine, nachgetragen vom Zug 0 des Pakets 3 — das Anmeldefenster in
  `#observeParentNode()`, das die Ergebniszeile oben als »klein, dokumentiert und nicht behoben«
  führt. Es ist keine Ablage, sondern offene Arbeit dieses Laufs, und liegt seit dem 2026-09-01
  als Paket 4 vor. Die Einordnung als echte Folge steht dort mit ihrem Beleg.
- Schnittstellen: `src/elements/parentRemoval.ts` neu, paketintern —
  `watchForRemovalFrom(parent, node, onRemoved)` und `stopWatchingForRemovalFrom(parent, node)`.
  Nicht aus `index.ts` re-exportiert, kein `exports`-Eintrag; sichtbar allein als vier Zeilen in
  `src/distContract.files.txt`. `ShaeEntElement` hat `#parentObserver`,
  `#createParentObserver()` und `#destroyParentObserver()` nicht mehr; an ihrer Stelle stehen
  `#observedParentNode`, `#observeParentNode()` und `#unobserveParentNode()`, alle privat.
  `getParentNodeForObserver()` und `onParentChanged(newParent, oldParent)` behalten Signatur und
  Bedeutung; neu ist allein, dass ein Wurf aus einer `onParentChanged`-Überschreibung nur das
  eigene Element kostet und über `console.error` herauskommt.

**PERF-001 · medium · packages/shadow-objects/src/elements/ShaeEntElement.ts:118, :475-490** — Jedes Entity-Element beobachtet seinen Elternknoten mit einem eigenen MutationObserver

connectedCallback() legt für jedes <shae-ent> einen eigenen MutationObserver auf dessen Elternknoten,
um das Entfernen genau dieses Elements zu bemerken. Stehen n Entity-Elemente unter demselben
Elternknoten — der Regelfall für eine Liste —, hängen n Observer an einem Knoten, und jede
childList-Mutation dieses Knotens ruft alle n Callbacks auf, von denen jeder die removedNodes
durchgeht. Das Leeren einer Liste aus n Geschwistern kostet damit quadratisch viele
Callback-Aufrufe. Der Maßstab ist nicht erfunden: das Projekt hat den Nachbarpfad — die Runden der
Eltern-Neuanfrage — genau für diese Größenordnung vermessen und auf eine Runde je Task
zusammengefasst; die Zahlenreihe bis 600 Entities in einer Namespace steht in guides.md. Dieser Pfad
ist daneben stehen geblieben.

Empfehlung: Einen Observer je beobachtetem Elternknoten statt je Element: eine WeakMap von Knoten auf
einen Observer und die Menge der <shae-ent>, die an ihm hängen. Der Callback läuft dann einmal je
Mutation und verteilt aus den removedNodes an die betroffenen Elemente, was zugleich der schnellere
Weg ist — die Menge der entfernten Knoten ist typischerweise klein gegen die Zahl der Geschwister.
Die Rückgabe an den bisherigen Zustand ist ein Zähler je Knoten: fällt er auf null, wird der Observer
getrennt.

### [x] 3. `<shae-ent auto-destruct>`: die Auto-Zerstörung aus dem Markup
- Findings: IMPL-001 (low)
- Zuschnitt: aus dem ursprünglichen Paket 2 herausgelöst, das PERF-001 und IMPL-001 zusammen trug.
  Die beiden teilen keine Ursache und außer `ShaeEntElement.ts` und dem CHANGELOG keine Datei, und
  sie berühren in dieser Datei verschiedene Stellen — die Beobachtung des Elternknotens hier, der
  Aufbau des `ViewComponent` dort. Getrennt ergeben sie zwei Commits, die je eine Sache sagen, und
  zwei Reviews mit je einem Gegenstand. Vor allem aber verlangen sie verschiedene Verify-Läufe:
  PERF-001 kommt mit `test:ci` aus, IMPL-001 braucht zusätzlich die Playwright-Suite über drei
  Browser — und die liefe bei jeder Review-Runde des Observer-Umbaus umsonst mit. Die Nummer 2
  bleibt, wo sie war; dieses Paket bekommt die nächste freie Nummer statt der Schreibweise `2a`/`2b`,
  weil die Schleife die Marke des laufenden Pakets über die Nummer aus ihrem Auftrag sucht und ein
  umbenanntes Paket 2 in diesem Zug nicht mehr fände.
- Abgleich am Stand von 717b884 (Zug 0, 2026-09-01): IMPL-001 besteht unverändert. Nachgesehen
  statt vermutet — `constants.ts` führt im Block `// <shae-ent> attributes` nur `ATTR_TOKEN` und
  `ATTR_FORWARD_CUSTOM_EVENTS`; `grep -r autoDestruct` über `src/` trifft das Element an keiner
  Stelle; `ShaeEntElement.ts:346` baut den `ViewComponent` als `new ViewComponent(token ??
  VoidToken, {context})`, ohne die Option. Die Leitung dahinter steht dagegen vollständig und ist
  Zeile für Zeile nachgegangen: `ViewComponent.ts:229` nimmt die Option entgegen,
  `ComponentContext.ts:295-300` gibt sie an `changes.create(…)`, `ComponentMemory.ts:114` trägt
  sie in den Change Trail, `Kernel.ts:329-339` liest sie dort wieder heraus, `Kernel.ts:406`
  setzt sie auf der Entity, und `Kernel.ts:451-469` ist die Kaskade, die sie auswertet. Es fehlt
  genau ein Glied, und es ist das im Element.
- Achtung nach Paket 2: die Zeilennummern in `ShaeEntElement.ts` haben sich verschoben — Paket 2
  hat die Datei umgebaut (`#observedParentNode`, `#observeParentNode()`, `#unobserveParentNode()`
  an Stelle des alten Observer-Paars). Die Stelle, um die es hier geht, ist
  `#applyComponentContext` (ab Zeile 323) und dort unverändert; der Konstruktoraufruf steht heute
  auf Zeile 346, innerhalb des `try`/`catch` der Zeilen 344–352.
- Ziel: Ein boolesches Attribut `auto-destruct` auf `<shae-ent>` reicht `autoDestructionOnParentRemoval` an den `ViewComponent`-Konstruktor durch, und Doku, CHANGELOG und E2E-Suite sagen, wann die Flagge greift und wann nicht.
- Bereich: `packages/shadow-objects/src/elements/`, `packages/shadow-objects/docs/`, `packages/shadow-objects/CHANGELOG.md`, `packages/shadow-objects-e2e/`
- Hängt ab von: —
- Hash: 69c3762
- Modell: stärkste Stufe
- Effort: high
- Dateien: `packages/shadow-objects/src/elements/constants.ts`,
  `packages/shadow-objects/src/elements/ShaeEntElement.ts`,
  `packages/shadow-objects/src/elements/ShaeEntElement.spec.ts` (neu),
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/docs/cheat-sheet.md`,
  `packages/shadow-objects/docs/guides.md`,
  `packages/shadow-objects/CHANGELOG.md`,
  `packages/shadow-objects-e2e/pages/auto-destruct-dom.html` (neu),
  `packages/shadow-objects-e2e/src/auto-destruct-dom.js` (neu),
  `packages/shadow-objects-e2e/public/mod-auto-destruct-dom.js` (neu),
  `packages/shadow-objects-e2e/tests/auto-destruct-dom.spec.ts` (neu),
  `packages/shadow-objects-e2e/TEST-PLAN.md`,
  `packages/shadow-objects-e2e/KNOWN-DEFECTS.md`,
  `packages/shadow-objects-e2e/README.md`
- Vorgehen:
  1. **Das Attribut.** In `packages/shadow-objects/src/elements/constants.ts`, im Block
     `// <shae-ent> attributes`, hinter `ATTR_FORWARD_CUSTOM_EVENTS`:

     ```ts
     export const ATTR_AUTO_DESTRUCT = 'auto-destruct';
     ```
  2. **`ShaeEntElement.ts`.** Import von `readBooleanAttribute` ergänzen:

     ```ts
     import {readBooleanAttribute} from '../utils/attr-utils.js';
     ```

     Die Zeile steht zwischen `import {VoidToken} from '../constants.js';` (heute Zeile 3) und
     `import {ConsoleLogger} from '../utils/ConsoleLogger.js';` (heute Zeile 4) — das ist die
     Stelle, an die Biome sie sortiert, und `ShaePropElement.ts:2` zeigt dieselbe Reihenfolge
     (`attr-utils` vor `ConsoleLogger` vor `MicrotaskGate`).

     `ATTR_AUTO_DESTRUCT` in den vorhandenen Import aus `./constants.js` aufnehmen, alphabetisch
     vor `ATTR_FORWARD_CUSTOM_EVENTS`. In `#applyComponentContext` (ab Zeile 323) den
     Konstruktoraufruf auf Zeile 346 ersetzen — er steht im `else if (context)`-Zweig innerhalb
     des `try`/`catch`, und beides bleibt, wie es ist: der `catch` fängt Würfe aus genau diesem
     Konstruktor mit, und der lange Kommentar darüber sagt, warum er so weit gefasst ist. Geändert
     wird das Optionsobjekt und sonst nichts an dieser Methode:

     ```ts
     vc = new ViewComponent(token ?? VoidToken, {
       context,
       // read here and only here: the flag is immutable on a ViewComponent, so the moment the
       // component is built is the only moment the attribute can still decide anything. That is
       // also why it is not observed — a later write has nowhere to go
       autoDestructionOnParentRemoval: readBooleanAttribute(this, ATTR_AUTO_DESTRUCT),
     });
     ```

     `static override observedAttributes` bleibt unverändert — `auto-destruct` kommt **nicht**
     dazu. Das ist die Machart, die `<shae-worker>` für `no-autostart` schon trägt: einmal gelesen,
     an der Stelle, an der der Wert etwas entscheidet. Es entsteht kein Signal, keine Reflexion und
     kein Getter auf dem Element; wer den Wert zurücklesen will, liest
     `el.viewComponent.autoDestructionOnParentRemoval`, den es bereits gibt. Eine zweite Zusicherung
     auf dem Element wäre eine zweite Wahrheit über denselben Wert, und vor dem ersten
     `connectedCallback` gäbe es dafür gar keine Antwort.
  3. **Spec** `packages/shadow-objects/src/elements/ShaeEntElement.spec.ts`, neu, happy-dom,
     `import '../shae-ent.js'`, Aufräumen wie in `elementReachability.spec.ts`
     (`afterEach` mit `document.body.replaceChildren()`, dazu `ComponentContext.get().clear()`).
     Ein `describe('auto-destruct')` mit vier Fällen, jeder über ein an `document.body` gehängtes
     `<shae-ent>` und dessen `viewComponent.autoDestructionOnParentRemoval`:
     - das nackte Attribut setzt die Flagge (`true`);
     - ohne Attribut ist sie `false`;
     - `auto-destruct="false"` und `auto-destruct="0"` sind `false`, `auto-destruct="true"` und
       `auto-destruct=""` sind `true` — die Wahrheitsregel aus `readBooleanAttribute`, dieselbe,
       die `no-trim` und `local` tragen;
     - ein `removeAttribute('auto-destruct')` **nach** dem Verbinden ändert nichts mehr: die
       Flagge steht weiter auf `true`, dem Wert, den der Konstruktor bekommen hat. Der Fall ist
       die Zusicherung, die die Doku gibt, und ohne ihn steht sie nur in Prosa. Er beginnt mit
       einem gesetzten Attribut, damit er heute an der ersten Behauptung scheitert und nicht aus
       dem falschen Grund grün ist.
     Drei der vier sind gegen den heutigen Stand rot; der zweite — ohne Attribut `false` — ist es
     nicht und soll es nicht sein: er ist die Gegenprobe, die den Vorgabewert festhält. Der rote Lauf steht
     **hinter Schritt 1 und vor Schritt 2**: die Spec liest `ATTR_AUTO_DESTRUCT` aus
     `./constants.js`, so wie `elementReachability.spec.ts` seine Attributnamen liest, und diese
     eine Zeile Konstante ändert kein Verhalten. Kommando
     `pnpm -F @spearwolf/shadow-objects exec vitest src/elements/ShaeEntElement.spec.ts --run`,
     Ausgabe in den Report.
  4. **`docs/api-reference.md`, §`<shae-ent>` → `#### Attributes`.** Eine Zeile hinter
     `forward-custom-events` in die Tabelle:

     ~~~markdown
     | `auto-destruct` | Whether this Entity goes down with its parent Entity instead of being promoted to a root. Read as a truthy value, not as a presence — see below. Reaches the Entity as the [`autoDestructionOnParentRemoval`](#viewcomponent) option of the `ViewComponent` this element builds. Default: absent, and the Entity is promoted. |
     ~~~

     Darunter, hinter dem Absatz »Both `ns` and `token` are also readable and writable from
     JavaScript …« und vor »**Forwarding events example:**«, zwei Absätze in der Machart der
     `<shae-worker>`-Stelle, die dieselbe Regel erklärt — sie steht heute auf den Zeilen
     1848–1855 der Datei, »**Truthy attributes are not presence attributes.**« gefolgt vom
     Absatz zu `no-autostart`:

     - **Truthy attributes are not presence attributes.** `auto-destruct` counts as set for `on`,
       `true`, `yes`, `local` or `1` (case-insensitive, surrounding whitespace ignored) or for the
       bare attribute, `auto-destruct` and `auto-destruct=""` alike; every other value counts as
       unset, so `auto-destruct="false"` and `auto-destruct="0"` promote the Entity. It is not
       observed and is read exactly once, when the element builds its `ViewComponent` — the flag
       is immutable on a component, so setting or removing the attribute afterwards changes
       nothing.
     - **When the flag decides anything.** It is the Kernel that reads it, on an Entity whose
       parent Entity the Kernel destroys: a Shadow Object calling `kernel.destroyEntity()`, or the
       rollback of a creation that threw. Taking a `<shae-ent>` subtree out of the DOM is not such
       an occasion, whatever the flag says: `ComponentContext.destroyComponent()` detaches every
       child of a component before it destroys it, so the change trail promotes the children and
       then destroys the parent — and each child element that left the document along with it
       destroys its own Entity anyway. Set `auto-destruct` where the Entity tree is taken apart
       from inside the Shadow Environment, not to make a DOM removal cascade.

     Die Zeile `| ShaeEntElement.observedAttributes | Static: ns, token, forward-custom-events. |`
     bleibt wörtlich stehen — sie ist weiterhin richtig, und das ist gerade der Punkt.

     Dazu die Gegenrichtung, damit der Verweis in beide Richtungen trägt: in §`ViewComponent` →
     `### Constructor` bekommt die Optionszeile `autoDestructionOnParentRemoval` einen Satz
     angehängt, der auf das Attribut zeigt — `Set from markup with the` [`auto-destruct`](#shae-ent)
     `attribute of` `<shae-ent>`, in der Zeichensetzung der Tabelle. Der Rest der Zeile bleibt
     wörtlich, »Immutable after creation« eingeschlossen.
  5. **`docs/cheat-sheet.md`, §`<shae-ent>`.** Eine Tabellenzeile hinter `forward-custom-events`:

     ~~~markdown
     | `auto-destruct` | truthy value | The Entity goes down with its parent Entity instead of being promoted to a root. Not observed: read once, when the element builds its `ViewComponent`. Read by the Kernel, not by the DOM — removing a subtree from the document does not cascade, see `docs/api-reference.md`, "`<shae-ent>`" |
     ~~~

     Direkt unter der Tabelle die Wahrheitsnotiz, wortgleich zur Machart der beiden anderen
     Elemente in derselben Datei:

     ~~~markdown
     **Truthy value ≠ presence.** `auto-destruct` counts as set for `on`, `true`, `yes`, `local`, `1`
     (case-insensitive) or for the bare attribute — and as unset for everything else, `="false"` and
     `="0"` included.
     ~~~
  6. **`docs/guides.md`**, die `<shae-ent>`-Attributtabelle (heute Zeile 330–334): eine Zeile
     hinter `forward-custom-events`:

     ~~~markdown
     | `auto-destruct` | The Entity goes down with its parent Entity instead of being promoted to a root (truthy value, read once at build time) |
     ~~~
  7. **`packages/shadow-objects/CHANGELOG.md`**, Abschnitt `## [Unreleased]` → `### New`, als
     letzter Aufzählungspunkt dieses Abschnitts, in einer Zeile:

     ~~~markdown
     - **New (public API):** `<shae-ent auto-destruct>` — the boolean attribute that hands `autoDestructionOnParentRemoval` to the `ViewComponent` the element builds, so an Entity written in markup can say that it goes down with its parent instead of being promoted to a root. Read as a truthy value the way `local`, `no-autostart` and `no-trim` are: `on`, `true`, `yes`, `local`, `1` or the bare attribute set it, everything else leaves it unset. It is not among `observedAttributes` and is read exactly once, where the component is built — the flag is immutable on a `ViewComponent`, so a later write has nowhere to go. The flag is read by the Kernel, on an Entity whose parent the Kernel destroys; taking a `<shae-ent>` subtree out of the document is not such an occasion, because the View Layer detaches a component's children before it destroys the component. Documented in `docs/api-reference.md`, `docs/cheat-sheet.md` and `docs/guides.md`.
     ~~~
  8. **E2E: eine neue Seite `auto-destruct-dom`.** Die vorhandene Seite `auto-destruct` bleibt
     unangetastet — sie treibt den Kernel programmatisch und ist grün. Die neue Seite folgt der
     Machart von `dynamic-dom`: ein `<shae-worker>`, eine Beobachter-Entity, die Schnappschüsse
     beantwortet, und Markup als Quelle der Entities. Weder Vite noch Playwright wollen dafür eine
     Registrierung: `vite.config.mjs` liest `pages/*.html` mit `readdirSync` ein, und
     `playwright.config.ts` nimmt `testDir: './tests'` als Ganzes. `index.html` führt keine
     Seitenliste.
     - `public/mod-auto-destruct-dom.js`: ein Shadow Object `tracked`, das sich unter seiner
       `label`-Property in einer modulweiten Map registriert (uuid, label, `destroyed`-Flagge aus
       `onDestroy`), und ein `observer`, der zwei View-Events beantwortet: `requestSnapshot`
       liefert je Eintrag `label`, `alive` (`kernel.hasEntity`), und — nur wo `alive` gilt —
       `parentUuid` und `autoDestruct`
       (`kernel.getEntity(uuid).autoDestructionOnParentRemoval`); eine Entity, die der Kernel nicht
       mehr hält, wird nicht dereferenziert, genauso wie in `mod-dynamic-dom.js`.
       `destroyEntity` bekommt ein `label`, schlägt die uuid in derselben Map nach und ruft
       `kernel.destroyEntity(uuid)`.
     - `pages/auto-destruct-dom.html`: der Rahmen der übrigen Seiten — `<section id="tests"></section>`
       und `<script type="module" src="/src/auto-destruct-dom.js">` —, dazu
       `<shae-worker id="env" no-autostart auto-sync="no">`, eine
       `<shae-ent id="observer" token="observer">`, und zwei Teilbäume nebeneinander, jeder mit
       einer geflaggten und einer ungeflaggten Kind-Entity:

       ```html
       <shae-ent id="kernel-doomed" token="tracked">
         <shae-prop name="label" value="kernel-doomed"></shae-prop>
         <shae-ent auto-destruct token="tracked"><shae-prop name="label" value="kernel-flagged"></shae-prop></shae-ent>
         <shae-ent token="tracked"><shae-prop name="label" value="kernel-unflagged"></shae-prop></shae-ent>
       </shae-ent>

       <shae-ent id="dom-doomed" token="tracked">
         <shae-prop name="label" value="dom-doomed"></shae-prop>
         <shae-ent auto-destruct token="tracked"><shae-prop name="label" value="dom-flagged"></shae-prop></shae-ent>
         <shae-ent token="tracked"><shae-prop name="label" value="dom-unflagged"></shae-prop></shae-ent>
       </shae-ent>
       ```

     - `src/auto-destruct-dom.js`: Aufbau und Schnappschuss-Schleife wie in `src/dynamic-dom.js`
       (`runTestSuite`, `testAsyncAction`, `testBooleanAction`, `waitUntil`, auf die drei
       `customElements.whenDefined`, dann `env.start()`, `env.shadowEnv.ready()` und
       `env.importScript('/mod-auto-destruct-dom.js')`, und die `snapshot()`-Funktion mit ihren
       zwei `syncWait()` als Barriere — den Kommentar, warum zwei, aus `dynamic-dom.js` sinngemäß
       mitnehmen statt ihn zu kopieren). Diese Fälle:
       - `auto-destruct-dom-env-ready`, `auto-destruct-dom-import-module`,
         `auto-destruct-dom-initial-snapshot` — der Rahmen;
       - `auto-destruct-dom-flag-arrived-from-markup`: im ersten Schnappschuss tragen
         `kernel-flagged` und `dom-flagged` `autoDestruct === true`, die beiden ungeflaggten und
         die beiden Elternknoten `false`. Das ist der Kern des Pakets;
       - `auto-destruct-dom-removal-takes-both-children`: `#dom-doomed` aus dem Dokument nehmen,
         Schnappschuss — alle drei sind fort, die geflaggte wie die ungeflaggte. Der Fall hält
         fest, dass die Flagge über einen DOM-Ausbau nicht entscheidet, und ist der Prüfstein für
         den zweiten Absatz aus Schritt 4;
       - `auto-destruct-dom-kernel-destroy-cascades-the-flagged-child` und
         `auto-destruct-dom-kernel-destroy-promotes-the-unflagged-child`: das View-Event
         `destroyEntity` mit `label: 'kernel-doomed'` an den Beobachter schicken, Schnappschuss —
         `kernel-flagged` ist fort und hat sein `onDestroy` gesehen, `kernel-unflagged` lebt und
         trägt keinen `parentUuid` mehr.
     - `tests/auto-destruct-dom.spec.ts`: `runPageTests('/pages/auto-destruct-dom.html', [...])`
       mit genau diesen ids, ohne `allowConsoleErrors` — die Seite provoziert keinen Fehler.
     - Nach dem Kernel-Destroy wird nichts mehr am DOM der betroffenen Entities geändert: die View
       hält dann `ViewComponent`s ohne Entity, und ein weiterer Trail auf sie würde im Worker
       Fehler melden, die `no uncaught or logged errors` zu Recht rot färben.
  9. **`packages/shadow-objects-e2e/TEST-PLAN.md`.** Vier Stellen. Die Datei führt DOM-5 an zwei
     Orten und zählt an einem dritten mit, und wer nur die Zeile in §3.2 umschreibt, lässt zwei
     Sätze stehen, die dann nicht mehr stimmen:
     - **§2, Spec-Tabelle**: eine Zeile für `auto-destruct-dom.spec.ts` /
       `pages/auto-destruct-dom.html` mit der Fallzahl und einem Satz. Die Fallzahl dieser Spalte
       ist die *registrierte*, nicht die Zahl der ids: `runPageTests` legt zu den ids noch
       `test suite setup` und — ohne `allowConsoleErrors` — `no uncaught or logged errors` an. Die
       sieben ids aus Schritt 8 ergeben also neun. Dieselbe Rechnung steht hinter der `8` in der
       Zeile zu `auto-destruct.spec.ts`, die sechs ids registriert.
     - **§1, erster Satz**: »Eleven spec files, 218 registered test cases per project — 654 across
       Chromium, Firefox and WebKit.« Alle drei Zahlen wandern. Nicht nachrechnen, sondern ablesen:
       `pnpm -F shadow-objects-e2e exec playwright test --list` nennt sie, und die Ausgabe gehört
       in den Report.
     - **Der Kasten über §1**, Zeilen 11–15: dort steht `DOM-5` in der Liste der offenen Punkte,
       samt dem Satz »DOM-5 is not implementable from the DOM — see the note at the end of
       `KNOWN-DEFECTS.md`«. Beides fällt weg — die Notiz, auf die er verweist, entfernt Schritt 10.
       Ein Verweis, der ins Leere zeigt, ist schlimmer als gar keiner.
     - **§3.2, Zeile DOM-5**: auf **Implemented** setzen, mit den ids und der neuen Seite — und
       ihren Text korrigieren: was dort steht (»Removing a subtree root … flagged children
       cascade«) beschreibt ein Verhalten, das die View-Schicht nicht erzeugt, weil
       `ComponentContext.destroyComponent()` die Kinder abhängt, bevor sie den Elternteil
       zerstört (nachgesehen: `view/ComponentContext.ts:332-350`, die Schleife über
       `entry.children.uuids` mit `removeFromParent()` vor `entry.changes.destroy()`). Der Satz
       sagt stattdessen, was die Seite prüft: die Flagge kommt aus dem Markup in die Entity, ein
       DOM-Ausbau nimmt beide Kinder mit, und über die Kaskade entscheidet ein
       `kernel.destroyEntity()` im Worker.
  10. **`packages/shadow-objects-e2e/KNOWN-DEFECTS.md`.** Den Abschnitt »Related gap (not a defect,
     but untestable from the DOM)« samt seiner `---`-Trennlinie entfernen. Die Lücke ist zu: das
     Attribut gibt es, und `auto-destruct-dom` fährt den DOM-Fall. Was oben steht — die Ansage
     »Currently there is none« und der Mechanismus für den nächsten Defekt — bleibt wörtlich.
  11. **`packages/shadow-objects-e2e/README.md`.** In der Seitentabelle eine Zeile hinter
     `auto-destruct`: `| auto-destruct-dom | the same flag, set from markup: what reaches the entity, what a DOM removal does, and what the kernel's cascade does |`.
  12. **Nichts sonst.** `packages/shadow-objects/README.md` bleibt unberührt: die Datei führt
     keine Attributtabelle, und der einzige Satz, der Attribute aufzählt, handelt von den
     Signalen, die ein freigegebenes Element über eine Trennung trägt — `auto-destruct` ist kein
     Signal und gehört dort nicht hinein. Die Regel aus `AGENTS.md` §4 verlangt, dass eine
     Änderung der öffentlichen API sich in `docs/`, `README.md` und `CHANGELOG.md` **niederschlägt**;
     wo die Datei die betroffene Oberfläche gar nicht beschreibt, gibt es nichts niederzuschlagen,
     und eine Zeile, die nur der Regel wegen dort steht, macht die Datei schlechter.
     `docs/concepts.md`, `docs/getting-started.md`, `docs/best-practices.md` und `docs/README.md`
     bleiben ebenfalls unberührt. `AGENTS.md` nach der Arbeit gegenlesen — erwartet wird, dass
     nichts nachzuziehen ist. Kein neues Modul unter `src/`, also auch keine Bewegung in
     `src/distContract.files.txt` oder `src/distContract.package.json`: ein Spec wird nicht
     transpiliert, und `constants.ts` gibt es schon. Die Wurzel-`CHANGELOG.md` bleibt außen vor —
     das E2E-Paket ist `private` und Teil desselben Pakets-Belangs, nicht des Monorepo-Aufbaus.
     `pnpm make:todo` entfällt.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci && pnpm -F shadow-objects-e2e test`
- Commit: `feat(elements): an entity element declares from markup that it goes down with its parent`
- Ergebnis: 1 Runde · IMPL-001 behoben — `ATTR_AUTO_DESTRUCT` in
  `elements/constants.ts`, gelesen mit `readBooleanAttribute` genau dort, wo
  `#applyComponentContext` den `ViewComponent` baut; `observedAttributes` bleibt bei drei
  Namen · Regressionstests `ShaeEntElement > auto-destruct` mit vier Fällen, drei davon vor
  Schritt 2 rot (`expected false to be true`, Ausgabe im Implementierer-Report), der vierte
  hält als Gegenprobe den Vorgabewert fest · der Reviewer hat den roten Lauf selbst
  reproduziert, indem er den Konstruktoraufruf zurücksetzte · die Runde hat zwei Absätze
  Prosa nachgezogen, die der Umbau nicht eingeholt hatte (`TEST-PLAN.md` unter der
  Spec-Tabelle, Docblock in `shadow-objects-testing/test/ent-element-attributes.test.js`) ·
  Verify grün mit abgeschaltetem turbo-Cache (0 von 3 und 0 von 5 Tasks aus dem Cache),
  972 + 384 + 139 Tests, E2E 681 Fälle über Chromium, Firefox und WebKit, Coverage 94,2 %
  gegen 94,19 % der Baseline · klein, dokumentiert und nicht behoben:
  `docs/api-reference.md:2027-2031` sagt »every other value counts as unset«, während
  `auto-destruct="   "` über das `|| '1'` in `readBooleanAttribute` als gesetzt zählt. Die
  Zeile trägt wörtlich die Machart, die dieselbe Datei auf `:1848` für `local` und
  `no-autostart` schon führt; einseitig korrigiert würde die Datei uneinheitlich, und die
  vorbestehende Stelle steht als Nebenbefund in »Offene Befunde«
- Nebenbefunde: → Queue (3, alle vorbestehend und je gegen den Stand vor dem Paket
  nachgesehen)
- Folgen: keine. `observedAttributes` bewegt sich nicht, es entsteht kein Modul unter `src/`,
  also auch keine Bewegung in `src/distContract.files.txt` oder `src/distContract.package.json`
- Schnittstellen: `<shae-ent auto-destruct>` ist neu an der öffentlichen Oberfläche — ein
  boolesches Attribut nach der Wahrheitsregel von `readBooleanAttribute` (`on`, `true`, `yes`,
  `local`, `1` oder die nackte Form), nicht beobachtet und genau einmal gelesen, wenn das
  Element seinen `ViewComponent` baut. Zurückgelesen wird es über
  `el.viewComponent.autoDestructionOnParentRemoval`; einen Getter auf dem Element gibt es
  nicht. `ATTR_AUTO_DESTRUCT` ist neu in `src/elements/constants.ts` (paketintern, wie die
  übrigen Attributkonstanten dort). Für Paket 4, das dieselbe Datei anfasst: die Zeilen in
  `ShaeEntElement.ts` haben sich erneut verschoben — der Import von `readBooleanAttribute`
  kam oben dazu, das Optionsobjekt in `#applyComponentContext` ist auf sechs Zeilen
  gewachsen. `#observeParentNode()` und `#unobserveParentNode()` sind unberührt geblieben

**IMPL-001 · low · packages/shadow-objects/src/elements/ShaeEntElement.ts (Aufbau des ViewComponent); packages/shadow-objects/docs/api-reference.md (Attributtabelle zu <shae-ent>); packages/shadow-objects-e2e/KNOWN-DEFECTS.md:13-18** — Die deklarative Schicht kann die Auto-Zerstörung nicht ausdrücken, und die Doku sagt es nicht

autoDestructionOnParentRemoval entscheidet, ob eine Entity mit ihrem Elternteil untergeht oder zur
Wurzel befördert wird. Über die programmatische API ist die Option da — ViewComponent nimmt sie im
Konstruktor, der Kernel führt sie im Change Trail, die api-reference beschreibt sie an vier Stellen.
<shae-ent> kennt kein Attribut dafür und baut seinen ViewComponent ohne die Option, die Flagge ist
aus Markup also nicht erreichbar. Die Attributtabelle des Elements führt token, ns und
forward-custom-events und schweigt dazu; wer sie liest, sieht keine Lücke, sondern eine vollständige
Liste. Festgehalten ist die Sache allein in KNOWN-DEFECTS.md des E2E-Pakets — einer privaten, nicht
veröffentlichten Datei, die kein Konsument je zu Gesicht bekommt.

Empfehlung: Entweder ein boolesches Attribut auf <shae-ent> — auto-destruct oder gleichnamig zur
Option —, das der Konstruktor des ViewComponent durchreicht, plus der Zeile in docs, README und
CHANGELOG, die AGENTS.md §4 verlangt, und dem E2E-Fall, den KNOWN-DEFECTS.md heute als unmöglich
vermerkt. Oder, wenn die Lücke Absicht ist, ein Satz in der Attributtabelle der api-reference, der
sagt, dass diese Option der programmatischen API vorbehalten bleibt und warum.

### [x] 4. Das Anmeldefenster der Elternbeobachtung hält fremdem Code nicht stand
- Findings: — (kein Audit-Finding; Folge aus Paket 2)
- Folge von: Paket 2
- Ziel: `#observeParentNode()` hinterlässt denselben Zustand, ob während der Anmeldung fremder
  Code läuft oder nicht: Registrierung und `#observedParentNode` nennen danach denselben
  Elternknoten, und zwar den, unter dem das Element am Ende hängt.
- Bereich: `packages/shadow-objects/src/elements/ShaeEntElement.ts`. `parentRemoval.ts` bleibt
  unberührt — die Messung unten zeigt, dass die Anmeldereihenfolge dort richtig ist und allein
  ihr Aufrufer aus dem Tritt gerät.
- Hängt ab von: — (Paket 3 fasst dieselbe Datei an, aber eine andere Methode:
  `#applyComponentContext` dort, `#observeParentNode()` hier. Die Reihenfolge ist frei; nach dem
  Commit von Paket 3 arbeitet dieses Paket auf dem neueren Stand der Datei.)
- Hash: dc75fad
- Modell: stärkste Stufe
- Effort: high — der Umbau selbst ist klein und steht unten im Wortlaut, aber er sitzt im
  Wiedereintritts-Fenster eines dokumentierten Erweiterungspunktes, und der Reviewer erbt diesen
  Wert: er hat nachzuweisen, dass die Gegenrichtung, die der Kommentar an Ort und Stelle benennt,
  zubleibt.
- Dateien: `packages/shadow-objects/src/elements/parentRemoval.spec.ts`,
  `packages/shadow-objects/src/elements/ShaeEntElement.ts`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. **Zuerst die Regressionstests, rot.** In
     `packages/shadow-objects/src/elements/parentRemoval.spec.ts` den Typ-Import hinter den
     bestehenden Import aus `./parentRemoval.js` setzen:

     ```ts
     import type {ShaeEntElement} from './ShaeEntElement.js';
     ```

     Dann als letzten Block **innerhalb** von `describe('parentRemoval', …)`, hinter
     `it('watches three <shae-ent> under one parent with a single observer', …)`, einfügen:

     ```ts
       // The registration of a `<shae-ent>` runs foreign code on its way through: `watchForRemovalFrom`
       // dispatches the records this parent has come due for before it adds the new watcher, and a
       // watcher is free to move elements around. These cases hold the element's own observation to the
       // node it hangs on once that code has had its turn.
       describe('a <shae-ent> whose registration runs a foreign watcher', () => {
         /** Whether nothing is watched on `parent` any more — a fresh registration has to build an observer. */
         const nothingWatchedOn = (parent: Node): boolean => {
           const probe = document.createElement('span');
           parent.appendChild(probe);
           const observersBefore = observerSpy.mock.calls.length;
           watchForRemovalFrom(parent, probe, () => {});
           const built = observerSpy.mock.calls.length > observersBefore;
           stopWatchingForRemovalFrom(parent, probe);
           probe.remove();
           return built;
         };

         /**
          * Leave `parent` with a record waiting for delivery and a watcher that runs `onDispatch` when
          * it comes due — the next registration on this parent dispatches it before it gets to its own.
          */
         const armWatcherOn = (parent: Node, onDispatch: () => void): void => {
           const trigger = document.createElement('span');
           parent.appendChild(trigger);
           watchForRemovalFrom(parent, trigger, onDispatch);
           trigger.remove();
         };

         let from: HTMLElement;
         let to: HTMLElement;
         let ent: ShaeEntElement;
         let parentChanges: Array<[Node | undefined, Node]>;

         beforeEach(() => {
           from = document.createElement('div');
           to = document.createElement('div');
           document.body.append(from, to);

           ent = document.createElement('shae-ent') as ShaeEntElement;
           parentChanges = [];
           // the inherited method keeps running: it is what re-resolves the entity ancestor
           const inherited = ent.onParentChanged.bind(ent);
           ent.onParentChanged = (newParent, oldParent) => {
             parentChanges.push([newParent, oldParent]);
             inherited(newParent, oldParent);
           };
         });

         it('hears no parent change for a move that carried its own reconnect', async () => {
           armWatcherOn(from, () => to.appendChild(ent));

           from.appendChild(ent);
           expect(ent.parentNode).toBe(to);

           await waitForObserverCallback();

           expect(parentChanges).toEqual([]);
         });

         it('leaves nothing watched on the parent the foreign watcher moved it off', () => {
           armWatcherOn(from, () => to.appendChild(ent));

           from.appendChild(ent);

           expect(nothingWatchedOn(from)).toBe(true);
           expect(nothingWatchedOn(to)).toBe(false);
         });

         it('leaves nothing watched when the foreign watcher takes it out of the tree', () => {
           armWatcherOn(from, () => ent.remove());

           from.appendChild(ent);
           expect(ent.parentNode).toBe(null);

           expect(nothingWatchedOn(from)).toBe(true);
         });
       });
     ```

     Diese drei Fälle sind vor Schritt 2 rot, und zwar so:

     ```
     × hears no parent change for a move that carried its own reconnect
       AssertionError: expected [ [ <div>…(1)</div>, <div></div> ] ] to deeply equal []
     × leaves nothing watched on the parent the foreign watcher moved it off
       AssertionError: expected false to be true
     × leaves nothing watched when the foreign watcher takes it out of the tree
       AssertionError: expected false to be true
     ```

     Der eigene rote Lauf gehört in den Report. Im Arbeitsverzeichnis liegt zwar ein vorab
     durchgeprüfter Diff (`paket-4.kandidat.diff`), aber er ersetzt den roten Lauf nicht: wer ihn
     anwendet und den Test danach schreibt, hat nichts belegt.
  2. **Der Fix, und nur er.** In `packages/shadow-objects/src/elements/ShaeEntElement.ts`, in
     `#observeParentNode()`, direkt hinter dem `watchForRemovalFrom(parent, this, …)`-Aufruf,
     diese sechs Zeilen

     ```ts
           // set only once the registration has gone through: `watchForRemovalFrom` can run other
           // watchers of this same parent synchronously before it gets here, and one of them is
           // `onParentChanged` on some other element — a documented extension point, free to
           // disconnect this element in turn. That disconnect would find this field already carrying
           // `parent` were it set above, and unwatch a `this` the registration below has not added yet
           this.#observedParentNode = parent;
     ```

     ersetzen durch:

     ```ts
           // asked a second time rather than remembered from above: `watchForRemovalFrom` runs the
           // watchers this parent has come due for before it adds its own, and one of them is
           // `onParentChanged` on some other element — a documented extension point, free to move or
           // disconnect this element in turn. Such a move carries this element's own observation with
           // it through `connectedCallback`, so the registration above belongs to a node the element
           // has left: it comes off again, and the field keeps what that inner call put there. Setting
           // the field ahead of the registration would close this half and open the other one — a
           // callback that disconnects the element would then unwatch a `this` nothing has added yet
           if (this.getParentNodeForObserver() === parent) {
             this.#observedParentNode = parent;
           } else {
             stopWatchingForRemovalFrom(parent, this);
           }
     ```

     `stopWatchingForRemovalFrom` ist in der Datei bereits importiert (Zeile 19), es kommt kein
     Import hinzu. Die Zuweisung bleibt **hinter** der Registrierung — sie nach vorn zu ziehen
     schließt diese Hälfte und öffnet die andere, siehe den Absatz »eine Falle« unten.
  3. **CHANGELOG.** In `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]`, an den
     vorhandenen Punkt anhängen, der mit »**Performance (elements):** a parent node carries one
     `MutationObserver` for every `<shae-ent>` watched on it« beginnt — als letzter Satz dieses
     Punktes, kein eigener Eintrag:

     > A registration ends up on the node the element hangs on: `watchForRemovalFrom()` runs the
     > watchers that have come due for a parent before it takes its own, one of them can be an
     > `onParentChanged` override that moves the element, and the observation follows the element
     > instead of staying on the node it left.

     Kein eigener Punkt und kein Rückblick: der geteilte Observer ist selbst noch unveröffentlicht,
     und ein zweiter Eintrag würde einem Leser einen Vorzustand erzählen, den er nie hatte.
  4. **Nichts sonst.** `packages/shadow-objects/docs/`, `README.md`, `AGENTS.md` und die
     Wurzel-`CHANGELOG.md` bleiben unberührt: `parentRemoval` ist paketintern und kommt in der
     Doku nicht vor, und die einzige Zusicherung, die die öffentliche Oberfläche zu dieser Sache
     gibt — »`onParentChanged(newParent, oldParent)` … Called when the element leaves its parent
     node« in `docs/api-reference.md:2077` — bleibt wörtlich richtig. Es entsteht keine Datei unter
     `src/`, also bewegen sich `src/distContract.files.txt` und `src/distContract.package.json`
     nicht. Kein TODO-Kommentar wird angefasst, `pnpm make:todo` entfällt. `parentRemoval.ts`
     selbst wird nicht angefasst.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci` — die Playwright-Suite bleibt draußen: die
  Sache lebt in `elements/` und ist über happy-dom und `parentRemoval.spec.ts` erreichbar.
- Commit: `fix(elements): an element moved while registering ends up watched, and hears about the move` — abweichend von der Zeile, die Zug 0 vorgesehen hatte (»a parent observation ends up on the node the element actually hangs on«). Das Paket ist über die Fehlerkette gewachsen: was `entParentNode` geraderückt, ist nicht die Registrierung, sondern die Meldung, die der Zweig seither selbst schickt. Die alte Zeile nannte die kleinere Hälfte.
- Ergebnis: 3 Runden · das Ziel auf allen vier Wegen erfüllt und je gemessen — mit Connect-Reaktion,
  ohne Connect-Reaktion (`moveBefore` auf einer Unterklasse mit `connectedMoveCallback`), abgehängt,
  und werfendes Override. `#observeParentNode()` fragt `getParentNodeForObserver()` nach der
  Registrierung ein zweites Mal; stimmt die Antwort, gilt die Zuweisung, sonst nimmt der Aufruf seine
  eigene Registrierung zurück und schickt die Meldung, die der zurückgenommene Watcher geschuldet
  hätte — geschützt, mit dem Reporting-Wortlaut aus `parentRemoval.ts:49`. Vier Regressionstests, alle
  vor ihrem Fix rot gesehen: drei in `parentRemoval.spec.ts` zum Anmeldefenster
  (`hears no parent change for a move that carried its own reconnect` und die beiden
  `leaves nothing watched …`), zwei in `packages/shadow-objects-testing/test/ent-element-namespace.test.js`
  in echtem Chromium (`the parent observer follows an element moved while its own registration was
  running` und `a throwing override in the registration window costs the notification and nothing
  behind it`), weil happy-dom `Element.moveBefore` nicht kennt. Zwei Runden gingen auf denselben
  Bruch: der `else`-Zweig hatte zwei Dinge gekappt — die Beobachtung und die Meldung —, und jede
  Runde hat eines davon gesehen. Coverage 94,21 % gegen 94,19 % der Baseline. klein und offen
  geblieben: kein Test hält fest, dass nach einem gefangenen Wurf Feld und Registrierung beide leer
  bleiben und ein späterer Zug folgenlos ist — wer den `catch`-Zweig um eine Wiederanmeldung
  »verbessert«, bekommt von keinem Fall Widerspruch
  (`packages/shadow-objects-testing/test/ent-element-namespace.test.js:496`)
- Nebenbefunde: → Queue (4, alle vorbestehend und je gegen `git show 9b0b00a:<pfad>` nachgesehen,
  alle `→ Audit`)
- Folgen: keine. Die öffentliche Oberfläche bewegt sich nicht, es entsteht kein Modul unter `src/`,
  also auch keine Bewegung in `src/distContract.files.txt` oder `src/distContract.package.json`.
  Eine Verschiebung innerhalb des Pakets, die nichts nach sich zieht: auf dem `moveBefore`-Weg kommt
  `onParentChanged` jetzt synchron aus `#observeParentNode()` statt einen Microtask später aus der
  Zustellung des Records. `docs/api-reference.md` macht zum Zeitpunkt keine Aussage, und der Weg
  hat keine veröffentlichte Grundlinie — das Anmeldefenster entstand mit dem geteilten Observer,
  der selbst noch unter `## [Unreleased]` steht
- Schnittstellen: keine. `#observeParentNode()` ist privat, `getParentNodeForObserver()` und
  `onParentChanged(newParent, oldParent)` behalten Signatur und Bedeutung. Was eine Unterklasse
  wissen muss und vorher nicht galt: ein `onParentChanged`, das im Anmeldefenster wirft, wird
  gefangen und über `console.error('a removal watcher failed:', error)` gemeldet — dieselbe
  Zusicherung, die `docs/api-reference.md` für den Erweiterungspunkt schon gibt, jetzt auch auf
  diesem Weg eingelöst

**Woher das kommt, und was davon nachgesehen ist.** Paket 2 hat die Beobachtung des Elternknotens
auf einen geteilten `MutationObserver` je Knoten umgestellt. `watchForRemovalFrom()` räumt seither
anstehende Records ab, bevor es den neuen Beobachter einträgt — `parentRemoval.ts:94-99`:
`dispatchRemovals(watch, watch.observer.takeRecords())` läuft vor `watch.watchers.set(node,
onRemoved)`. Was dabei läuft, ist fremder Code: die Callbacks anderer Elemente, und darin
`onParentChanged`, ein in `docs/api-reference.md` dokumentierter Erweiterungspunkt, den eine
Unterklasse überschreiben darf.

Zwischen diesem Aufruf und der Zuweisung `this.#observedParentNode = parent`
(`ShaeEntElement.ts:487-497`) steht also ein Fenster, in dem das Element unter einen anderen
Elternknoten wandern kann. Tut es das über einen gewöhnlichen Zug — `disconnectedCallback` und
`connectedCallback` laufen synchron mit —, meldet sich das Element im inneren Durchlauf beim neuen
Knoten an und setzt `#observedParentNode` auf ihn; der äußere Durchlauf läuft danach weiter und
überschreibt das Feld mit dem alten Knoten, unter dem er seine Registrierung gerade noch nachträgt.

Dass das neu ist, ist nachgesehen und nicht vermutet:
`git show 9b0b00a:packages/shadow-objects/src/elements/ShaeEntElement.ts` zeigt in Zeile 473–492
den Vorzustand — `new MutationObserver(…)` und `observe(parent, …)`, zwei Aufrufe, zwischen denen
kein fremder Code läuft. Das Fenster entsteht mit dem geteilten Observer und mit nichts sonst.

**Was die Messung ergeben hat.** Der Zug 0 dieses Pakets hat beide Wege in happy-dom nachgefahren,
mit einem Watcher auf dem alten Elternknoten, dessen Callback das `<shae-ent>` verschiebt — genau
der fremde Code, den `dispatchRemovals` ausführt. Ergebnis, gegen den Lauf ohne Fenster gehalten:

- **`appendChild`.** Nach dem synchronen Zug hängt das Element unter dem neuen Knoten, ist aber
  bei **beiden** registriert, und `#observedParentNode` nennt den alten. Zwei Folgen, beide
  gemessen. Verlässt das Element im selben Task den Baum, meldet `#unobserveParentNode()` es beim
  falschen Knoten ab und lässt den Eintrag beim richtigen stehen — das Feld führt die Abmeldung,
  und es zeigt auf den verlassenen Knoten. Und einen Microtask später kommt ein
  `onParentChanged(neu, alt)` nach, das derselbe Zug ohne Fenster nie auslöst (gemessen: 0
  Aufrufe): ein Phantom auf einem dokumentierten Erweiterungspunkt, das die geerbte Implementierung
  mit `#setParent(undefined)` und einer neuen Elternanfrage quittiert — die Entity verliert ihren
  Elternteil und holt ihn sich wieder, ohne dass sich im Baum etwas bewegt hätte.
- **Wie weit der Schaden reicht, ist ebenfalls gemessen, und er reicht nicht weit.** Beide Varianten
  laufen sich nach einem Microtask wieder gerade: der anstehende Entfernungs-Record des verlassenen
  Knotens wird zugestellt, räumt den toten Eintrag ab, trennt dessen Observer — und ist zugleich
  das, was das falsche Feld repariert. Kein verwaister Eintrag, keine dauerhaft gehaltene Referenz.
  Übrig bleibt das Phantom und ein Task lang ein Feld, das auf den falschen Knoten zeigt. Das ist
  wenig, und es ist trotzdem ein Korrektheitsfehler: der Erweiterungspunkt bekommt ein Ereignis
  gemeldet, das aus seiner Sicht nicht stattgefunden hat, und die Reparatur ist eine Nebenwirkung
  des Fehlers und keine Zusicherung, auf die sich irgendetwas beruft.
- **`moveBefore`.** Nicht messbar und nicht betroffen. happy-dom kennt `Element.moveBefore` nicht
  (`typeof` ist `undefined`), und der Weg braucht den Fix auch nicht: ohne Lebenszyklus-Callbacks
  meldet sich das Element nicht selbst neu an, Feld und Registrierung nennen weiterhin denselben
  Knoten, und das nachgereichte `onParentChanged` ist dort genau das, wofür der Mechanismus gebaut
  ist.

Die Antwort auf die Frage, wie groß dieses Paket ist, lautet damit: klein. Ein Aufrufer, drei
Testfälle, ein Satz im CHANGELOG. Der Vermerk »folgenlos« kommt trotzdem nicht in Frage — die
Scope-Regel im Kopf nimmt einen echten Korrektheitsfehler unabhängig von der Severity auf, und der
Fix kostet sechs Zeilen an einer Stelle, deren Kontext gerade offen ist.

**Und eine Falle, die im Weg steht:** die Zuweisung einfach vor die Registrierung zu ziehen, löst
nichts. Der Kommentar an Ort und Stelle nennt den Fall, den die heutige Reihenfolge abfängt — ein
fremder Callback, der das Element während der Anmeldung *abhängt* und dann ein `this` abmelden
würde, das noch gar nicht eingetragen ist. Die beiden Gefahren zeigen in entgegengesetzte
Richtungen; wer eine durch Verschieben der Zeile schließt, öffnet die andere. Die gewählte Form
trägt beide und ist kleiner als die beiden Vorschläge, die hier zuerst standen (Generationszähler,
Handle): sie fragt `getParentNodeForObserver()` nach der Registrierung ein zweites Mal. Stimmt die
Antwort mit dem Knoten überein, für den gerade registriert wurde, gilt die Zuweisung; stimmt sie
nicht, nimmt der Aufruf seine eigene Registrierung wieder zurück und lässt dem inneren Durchlauf
das Feld. Der Fall »abgehängt« fällt in denselben Zweig und wird damit sauberer als heute: es
bleibt nichts stehen.

- Scope: die Scope-Regel im Kopf nimmt einen im Lauf aufgefallenen echten Korrektheitsfehler
  unabhängig von der Severity auf. Hier kommt hinzu, dass es kein Nebenbefund ist, sondern eine
  Folge dieses Laufs: selbstverschuldet, und damit ohne die Frage, ob sie behoben wird. Ein
  eigenes Paket und kein Anhängsel von Paket 3, weil beide keine Ursache und keine Prüfung teilen —
  Paket 3 fährt zusätzlich die Playwright-Suite über drei Browser, die hier nichts zu sagen hat.
