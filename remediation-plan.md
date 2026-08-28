# Remediation-Plan — @spearwolf/shadow-objects (Monorepo)

Quelle: ./audit.html vom 2026-08-27 · Branch: main · erstellt: 2026-08-27
Baseline: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test:ci` ✓
(Coverage 92,89 % Statements) · `pnpm -F shadow-objects-e2e test` ✓ (645 passed)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/d3805971-7e40-4804-8e9a-a4651ef9a355/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 12 von 53 Findings (0 critical, 0 high, 4 medium, 8 low) · ausgenommen: info, acknowledged, alle übrigen low
Scope-Regel: alles ab medium aufwärts, jede Kategorie — dazu jedes Finding aus MEM, BUG und ASYNC unabhängig von seiner Severity. Ziel des Laufs ist Stabilität. Die Regel gilt auch für Befunde, die erst im Lauf auffallen.
Stand (2026-08-28): **abgeschlossen.** 12 Pakete, 12 Commits auf `main`, `HEAD` `6a1fd39`.
Elf Findings des Audits geschlossen, eines per Nutzerentscheid zurückgestellt (Bestätigung für
DOM-getriebene Change Trails). Sechs Nebenbefunde im Lauf mit behoben, drei als neue Findings
ins Audit zurückgegeben. Verify auf allen fünf Kommandos grün, Coverage 92,89 % → 93,11 %.
Nichts blieb blockiert liegen.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen
- ASYNC-005 (Bestätigung für DOM-getriebene Change Trails) bleibt außerhalb dieses Laufs
  und als offenes Finding im Audit stehen. Eine Bestätigung für jeden Trail kostet bei
  `auto-sync="frame"` eine Worker-Rundreise pro Frame und ändert die Zusage von `sync()`;
  das ist ein Produktentwurf, kein Stabilitätsfix (2026-08-27)
- Die Creation API eines abgebauten Scope kehrt nach dem Teardown still zurück und meldet
  über den Logger, statt zu werfen. Die typischen Aufrufer sind Timer und
  await-Fortsetzungen ohne Aufrufer; ein Wurf dort erzeugt genau die unbehandelten Fehler,
  die dieser Lauf loswerden soll. Das Verhalten wird in `docs/api-reference.md` zugesagt
  (2026-08-27)
- Die Build-System-Spec wird archiviert, nicht auf esbuild nachgezogen: Status »historisch«
  mit Datum, ein Satz zum Grund gegen tsdown, Verweis auf CLAUDE.md als gültige Quelle
  (2026-08-27)
- Ein Sync-Zyklus, dessen Umgebung während des Fluges zerstört wird, endet still. Das folgt
  dem Wächter, den `#onProxyFailed()` an der Nachbarstelle bereits hat; ein Error-Log für
  einen planmäßigen Abbau ist Rauschen (2026-08-27)

- Paket 6 bekommt eine weitere Runde allein für seinen Testnachweis. Das Rücksetzen von
  `#lastPixelRatio` bleibt Teil des Fixes und wird belegt, nicht gestrichen: Der Testfall ist
  eine Box, die vor **und** nach dem Wiedereinhängen 0×0 misst — dann ist die Ratio die einzige
  Größe, die den ODER-Zweig noch tragen kann. Der rote Lauf ist gegen eine Fassung von
  `#forgetWhatTheEntityWasTold()` **ohne** die `#lastPixelRatio`-Zeile nachzuweisen, nicht gegen
  einen leeren Rumpf; ein Fall, der gegen den leeren Rumpf rot wird, beweist wieder nur Fall 1.
  Die Rundenzählung beginnt für dieses Paket von vorn (2026-08-27)

- `ThreeMultiViewRenderer.updateSize()` bleibt öffentlich und bekommt den Wächter, den seine
  Nachbarin `renderView()` bereits hat: nach dem Abbau der Entity kehrt sie still zurück statt zu
  werfen. Das folgt der Entscheidung, die dieser Lauf für die Creation API schon getroffen hat —
  ein Aufruf nach dem Teardown wirft nirgends im Projekt. Die Methode wird in
  `docs/01-shadow-objects-api.md` als API nachgetragen (2026-08-28)

- Ein Paket, das ohne Beleg für Implementierer und Reviewer committet wurde, wird
  zurückgesetzt und neu gefahren, nicht nachträglich gebilligt. Der Verify-Lauf belegt, dass der
  Code läuft, nicht dass er richtig ist — in diesem Lauf hat das Review zweimal einen echten
  Fehler gefangen, den der grüne Verify nicht gesehen hätte (2026-08-28)

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
- Alle Kommentare, Doku und Commit-Messages in **Englisch**. Der Plan hier ist Deutsch,
  das Repository ist es nicht.
- **Changelog-Pflicht je Paket.** `packages/shadow-objects/src/`, Laufzeit-Verhalten oder
  `dist/`-Form → `packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`.
  `packages/shae-offscreen-canvas/src/` → dessen eigenes CHANGELOG. Build, Toolchain,
  Doku außerhalb der Pakete → Wurzel-`CHANGELOG.md` als datierter Abschnitt.
- **Öffentliche API ändert sich nie allein**: `docs/`, `README.md` und `CHANGELOG.md` des
  betroffenen Pakets im selben Commit.
- Verbotene Analogien: »shadow theater«, »puppet«, »puppeteer«, »light world«, »screen«.
  ECS-Begriffe verwenden. Die Bindeliste in `AGENTS.md` §4 gilt: `RemoteWorkerEnv`, Entity,
  Entity Tree, Token, und `ComponentContext` niemals mit »Entity Context« verwechseln.
- Lint und Format sind Biome, Konfiguration nur an der Wurzel. Kein per-Paket-Override.
- Wer eine `TODO`-Zeile anfasst, fährt `pnpm make:todo`.

## Vorbestehende Fehler
Keine. Die Baseline ist auf allen fünf Kommandos grün.

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

- [x] `packages/shadow-objects-e2e/TEST-PLAN.md:254` — der Fall ASYNC-2 (»View → shadow
  object: `dispatchShadowObjectsEvent` over a real worker reaches the shadow object«) hängt
  zwischen den Stühlen: Priorität P1, aber weder als **Implemented** markiert wie die
  UPG-Zeilen in §3.3, noch in der Offen-Liste im Kopf (Zeile 11–14), noch in der ID-Klammer
  der §2-Zeile. Abgedeckt ist der Fall tatsächlich, zweimal — `src/async-events.js:158` und
  `:177` schicken beide über `dispatchShadowObjectsEvent`, laufen dort aber unter ASYNC-4 und
  ASYNC-5. Es fehlt die Zuordnung, nicht der Test. (aus Paket 1 · geschätzt low · Doku eines
  privaten, nicht veröffentlichten Pakets, kein Laufzeitverhalten, keine der Kategorien MEM,
  BUG oder ASYNC des Audits) → Audit · erledigt 2026-08-28 → Audit
- [x] `packages/shadow-objects/src/in-the-dark/Kernel.ts:163` — `traverseLevelOrderBFS()` holt jedes
  Kind über `getEntity()` und wirft daher `entity with uuid "…" not found!`, sobald eine
  Children-Liste eine Entity nennt, die der Kernel nicht mehr hält. `getEntityGraphNode()` fängt
  genau diesen Fall an Zeile 208–209 ab (»A node the kernel no longer holds drops out of the
  graph«), die BFS nicht — und an ihr hängen `Kernel.destroy()` und `upgradeEntities()`, der Wurf
  verlässt also einen Abbau nach außen. Gemessen am 2026-08-27 gegen den gebauten `dist/`-Stand:
  `parent.addChild(loose)` — ein Weg, den der Kommentar an Zeile 148–151 und der CHANGELOG-Eintrag
  zur Baum-Buchführung ausdrücklich als zugesagt führen, weil er die Children-Liste ohne
  Parent-Link schreibt — gefolgt von `destroyEntity('loose')` lässt `traverseLevelOrderBFS()` und
  `kernel.destroy()` beide werfen. Dieselbe Lücke öffnet ein `removeFromParent()`, das in
  `destroyEntity()` an Zeile 414–417 wirft und dort nur geloggt wird. Vorbestehend: bei
  `git show 292714c:` steht die Zeile unverändert. (aus Paket 5 · geschätzt medium · Kategorie BUG,
  die Scope-Regel greift zweifach) → Scope · erledigt 2026-08-28 → Paket 10
- [x] `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:269 gegenüber :275`
  — `[FrameLoop.OnFrame]()` vergleicht `#lastPixelRatio` gegen das ungeteilte `pixelRatio`, legt in
  dasselbe Feld aber `pixelRatio / pixelZoom` ab. Bei `pixel-zoom="1"` fallen beide Größen zusammen
  und der Wächter hält; ab `2` trifft der Vergleich nie wieder zu, und jeder Frame meldet eine
  Ratio-Änderung, schreibt vier Properties und ruft `syncShadowObjects()` — sechzig
  Synchronisationen je Sekunde, von denen keine fällig ist. Die gesendeten Werte stimmen dabei;
  kaputt ist allein die Änderungserkennung. Festgehalten als gemessenes Verhalten von
  `ShaeOffscreenCanvasElement.spec.js:576-592` (»a second frame asks for a sync again while a pixel
  zoom is set«), dessen eigener Kommentar »Measured behavior, not endorsed behavior« sagt.
  Vorbestehend: bei `git show 292714c:` steht der Vergleich unverändert, und dieser Lauf hat das
  Paket bis dahin nicht berührt. (aus Paket 6 · geschätzt low · Kategorie BUG, die Scope-Regel
  greift unabhängig von der Severity · liegt in derselben Datei und derselben Methode wie Paket 6,
  aber hinter einer anderen Ursache — dort fehlt ein Rücksetzen, hier vergleicht ein Feld sich mit
  einer anderen Größe als der, die es hält) → Scope · erledigt 2026-08-28 → Paket 11
- [x] `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:285-287 gegenüber
  :306` — `[FrameLoop.OnFrame]()` schreibt die drei Gedächtnisfelder (`#lastCanvasWidth`,
  `#lastCanvasHeight`, `#lastPixelRatio`) im Rumpf des Änderungszweigs fort, zugestellt werden die
  Properties darin aber nur unter `if (this.viewComponent)`. Ein Frame, der ohne View-Komponente
  durch den Zweig läuft, verbraucht damit die Änderungsmeldung, ohne sie zu senden: die Felder
  stehen danach auf den aktuellen Werten, und der nächste Frame findet nichts mehr zu melden. Die
  Zusage, dass die frische Entity nach einem Wiedereinhängen ihre Größe bekommt, hängt still daran,
  dass die View-Komponente im ersten Frame danach bereits steht. Vorbestehend: die Reihenfolge von
  Fortschreiben und Zustellen ist seit `292714c` unverändert, Paket 6 hat allein
  `disconnectedCallback()` angefasst. (aus Paket 6 · geschätzt low · Kategorie BUG, die Scope-Regel
  greift unabhängig von der Severity) → Scope · erledigt 2026-08-28 → Paket 11
- [x] `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js:29-35` — der
  `onDestroy`-Callback wird im Konstruktor registriert, bevor `this.canvas` (Zeile 37) und
  `this.renderer` (Zeile 40) existieren, und greift ungeprüft mit `this.renderer.dispose()` zu.
  Wirft einer der beiden Konstruktoraufrufe — `new WebGLRenderer({canvas})` tut das in jeder
  Umgebung ohne WebGL, wie der Kommentar in `ThreeMultiViewRenderer.spec.js:7-12` festhält —,
  steht ein registrierter Abbau-Callback über einem `undefined`. Ob der Kernel ihn nach einem
  werfenden Konstruktor überhaupt noch ausführt, ist **nicht nachgemessen**; die ungeprüfte
  Reihenfolge in der Datei steht so. Vorbestehend: bei `git show 292714c:` steht der Block
  unverändert. (aus Paket 7 · geschätzt low · Kategorie BUG, die Scope-Regel greift unabhängig
  von der Severity) → Scope · erledigt 2026-08-28 → Paket 12
- [x] `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js:105-108` —
  `destroyView(view)` liest `view.viewId` ohne Wächter und wirft bei `undefined` oder `null` einen
  `TypeError`. Die Methode ist als öffentliche RenderView-API dokumentiert
  (`docs/01-shadow-objects-api.md:96`), während ihre Nachbarin `renderView()` denselben Zugriff
  mit `view?.viewId` absichert. Vorbestehend: bei `git show 292714c:` steht dieselbe Zeile ohne
  Wächter. (aus Paket 7 · geschätzt low · Kategorie BUG, die Scope-Regel greift unabhängig von
  der Severity) → Scope · erledigt 2026-08-28 → Paket 12
- [x] `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js:110-122` —
  `updateSize()` ruft `this.renderer.getSize()` ohne Renderer-Wächter. Nach dem Abbau der Entity
  ist `this.renderer` null, ein Aufruf von außen wirft dort. Die Methode ist öffentlich und wird
  von den Specs direkt gerufen, in `docs/01-shadow-objects-api.md` aber nicht als API geführt —
  ob sie einen Wächter bekommt oder als intern gekennzeichnet wird, ist Teil des Befunds.
  Vorbestehend: bei `git show 292714c:` steht sie unverändert. (aus Paket 7 · geschätzt low ·
  Kategorie BUG, die Scope-Regel greift unabhängig von der Severity) → Scope · erledigt 2026-08-28 → Paket 12
- [x] `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md:83` — »Once created, the
  _view_ is rendered automatically with one of the next frames« sagt eine Automatik zu, die es
  nicht gibt: `ThreeMultiViewRenderer` hört auf keinen Frame-Takt, gezeichnet wird eine Ansicht
  nur durch das `ThreeRenderView`, das sie besitzt. Eine von Hand über `createView()` erzeugte
  Ansicht zeichnet niemand. Paket 7 hat den Halbsatz an die neue Kadenz angepasst, die falsche
  Zusage darin ist älter. Vorbestehend: bei `git show 292714c:` steht derselbe Satz mit »with the
  next frame«. (aus Paket 7 · geschätzt low · Kategorie Doku eines veröffentlichten Pakets, keine
  der Kategorien MEM, BUG oder ASYNC, unter medium) → Audit · erledigt 2026-08-28 → Audit
- [x] `packages/shadow-objects/src/types.ts:200-208` gegenüber `packages/shadow-objects/docs/` —
  `displayName` ist ein öffentliches Feld beider Konstruktor-Interfaces (`ShadowObjectConstructor`,
  `ShadowObjectConstructorFunc`), wird in die `.d.ts` ausgeliefert und ist die einzige Möglichkeit,
  den Namen zu bestimmen, unter dem der Kernel ein Shadow Object meldet: `getDisplayName()` in
  `Kernel.ts:48` liest `construct.displayName || construct.name`, der Wert landet als
  `displayName` im Creation Scope und damit in jeder Meldung von `Kernel.ts:862-865`, `:893-908`
  und `ShadowObjectCreationScope.ts:247, :250, :258, :312, :386, :485`. In
  `packages/shadow-objects/docs/` und in `README.md` kommt das Wort kein einziges Mal vor —
  gemessen mit einem grep über beide, ohne Treffer. Vorbestehend: bei `git show 292714c:` steht das
  Feld unverändert in `types.ts`, und die Doku nannte es dort ebensowenig. (aus Paket 8 ·
  geschätzt low · Kategorie Doku eines veröffentlichten Pakets, keine der Kategorien MEM, BUG oder
  ASYNC, unter medium) → Audit · erledigt 2026-08-28 → Audit
## Pakete

### [x] 1. ShadowEnv: der Sync-Zyklus schließt mit dem Trail, den er gebaut hat
- Findings: ASYNC-003 (medium), ASYNC-004 (low)
- Ziel: Wer nach dem Bau des Change Trail eine Komponente ändert und `syncWait()` ruft,
  bekommt die Promise der nächsten Runde statt der laufenden — und ein Zyklus, dessen
  Umgebung während des Fluges zerstört wird, endet still.
- Bereich: `packages/shadow-objects/src/view/ShadowEnv.ts`
- Hängt ab von: —
- Hash: 9bad046
- Modell: stärkste Stufe
- Effort: high
- Dateien:
  - `packages/shadow-objects/src/view/ShadowEnv.ts`
  - `packages/shadow-objects/src/view/ShadowEnv.spec.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`
  - `packages/shadow-objects-e2e/src/async-events.js`
  - `packages/shadow-objects-e2e/tests/async-events.spec.ts`
  - `packages/shadow-objects-e2e/TEST-PLAN.md`

**Der Entwurf, in einem Absatz.** Ein Zyklus besitzt seine eigene Settlement-Promise ab dem
Moment, in dem sein Change Trail gebaut ist. Bis dahin liegt sie in einem Feld und jeder
`syncWait()`-Aufrufer bekommt dieselbe; ab dem Bau reist sie als lokale Variable in dem
`#syncNow()`-Rahmen weiter, der den Trail hat, und das Feld ist frei für den nächsten Zyklus.
Der Grund für die lokale Variable statt eines zweiten Feldes: **zwei Zyklen können gleichzeitig
fliegen** — `ComponentContext.buildChangeTrails()` sagt das an seiner Stelle ausdrücklich
(»Two sync cycles can be in flight at once«) und behandelt den Fall bereits, indem
`commitChangeTrail(count, trail)` einen Commit verwirft, dessen Trail nicht mehr der zuletzt
gebaute ist. Ein Feld für den fliegenden Zyklus würde vom zweiten Flug überschrieben, und der
erste settelte dann den falschen Aufrufer oder gar keinen. Damit weicht das Vorgehen bewusst
von der Empfehlung des Audits ab, die »ein zweites Feld« vorschlägt: zwei Felder reichen für
genau zwei Zyklen, und die Zahl gleichzeitiger Flüge ist nicht zwei, sondern unbegrenzt.

**Vorgehen:**

1. **Regressionstests zuerst, und rot sehen.** Drei Fälle in
   `packages/shadow-objects/src/view/ShadowEnv.spec.ts`, in einem neuen `describe`-Block
   `'a change made while a cycle is in flight'`, hinter dem Block
   `'a change trail the environment cannot apply'`. Der rote Lauf jedes einzelnen gehört in den
   Report. Im Block ein Proxy-Double nach dem Vorbild von `RejectingProxy` (dort ab Zeile 186),
   das die Bestätigung aufhält, statt sie sofort zu geben:

   ```ts
   /**
    * A proxy that keeps every change trail it is handed until the test lets it through. The
    * confirmation of a round trip is the window these cases are about, and holding it open by
    * hand makes that window a fixed point rather than a matter of timing.
    */
   class GatedProxy implements IShadowObjectEnvProxy {
     onMessageToView?: (event: any) => any;
     onProxyFailed?: (reason: unknown) => any;

     /** The trails it was handed, in the order they came in. */
     trails: ChangeTrailType[] = [];

     readonly #gates: Array<{resolve: () => void; reject: (reason: unknown) => void}> = [];

     async start(): Promise<void> {}

     async importScript(): Promise<void> {}

     applyChangeTrail(changeTrail: ChangeTrailType): Promise<void> {
       this.trails.push(changeTrail);
       return new Promise<void>((resolve, reject) => {
         this.#gates.push({resolve, reject});
       });
     }

     /** Confirms the oldest trail still held. */
     confirmNext(): void {
       this.#gates.shift()!.resolve();
     }

     /** Refuses the oldest trail still held. */
     refuseNext(reason: unknown): void {
       this.#gates.shift()!.reject(reason);
     }

     destroy(): void {}
   }

   const makeEnv = async () => {
     const env = new ShadowEnv();
     const proxy = new GatedProxy();
     env.view = ComponentContext.get();
     env.envProxy = proxy;
     await env.ready();
     return {env, proxy};
   };

   /** Waits until the proxy holds `count` trails, so no case has to guess a microtask depth. */
   const untilTrails = (proxy: GatedProxy, count: number) =>
     vi.waitFor(() => {
       if (proxy.trails.length < count) {
         throw new Error(`the proxy holds ${proxy.trails.length} of ${count} trails`);
       }
     });
   ```

   `withTimeout`, `vi`, `once`, `ComponentContext`, `ViewComponent`, `ChangeTrailType` und
   `IShadowObjectEnvProxy` sind in der Datei bereits da; `ShadowEnvDestroyedError` ebenfalls.

   1a. `it('opens a new cycle for a caller that arrives after the trail was built', …)`

   ```ts
   const {env, proxy} = await makeEnv();

   new ViewComponent('test', {context: env.view, uuid: 'early'});
   const inFlight = env.syncWait();
   await untilTrails(proxy, 1);

   // the trail has left; this change cannot be in it
   new ViewComponent('test', {context: env.view, uuid: 'late'});
   const next = env.syncWait();

   expect(next).not.toBe(inFlight);

   await untilTrails(proxy, 2);

   proxy.confirmNext();
   await expect(withTimeout(inFlight)).resolves.toBe(proxy.trails[0]);

   proxy.confirmNext();
   await expect(withTimeout(next)).resolves.toBe(proxy.trails[1]);

   expect(proxy.trails[0]!.map((entry) => entry.uuid)).toEqual(['early']);
   expect(proxy.trails[1]!.map((entry) => entry.uuid)).toEqual(['late']);

   env.destroy();
   ```

   Rot heute an `expect(next).not.toBe(inFlight)`: `#afterNextSync` steht noch, also bekommt der
   zweite Aufrufer die Promise des fliegenden Zyklus.

   1b. `it('hands a listener that calls syncWait() from AfterSync the cycle after the one it was told about', …)`

   ```ts
   const {env, proxy} = await makeEnv();

   new ViewComponent('test', {context: env.view, uuid: 'first'});

   let fromListener: Promise<ChangeTrailType> | undefined;
   once(env, ShadowEnv.AfterSync, () => {
     new ViewComponent('test', {context: env.view, uuid: 'second'});
     fromListener = env.syncWait();
   });

   const firstCycle = env.syncWait();
   await untilTrails(proxy, 1);
   proxy.confirmNext();
   await withTimeout(firstCycle);

   expect(fromListener).not.toBe(firstCycle);

   await untilTrails(proxy, 2);
   proxy.confirmNext();

   await expect(withTimeout(fromListener!)).resolves.toBe(proxy.trails[1]);
   expect(proxy.trails[1]!.map((entry) => entry.uuid)).toEqual(['second']);

   env.destroy();
   ```

   Rot heute an `expect(fromListener).not.toBe(firstCycle)`: `#endSyncCycle` räumt das
   Resolverpaar vor dem `emit`, die Promise selbst aber erst eine Mikrotask später.

   1c. `it('reports nothing when the environment is destroyed while its trail is in flight', …)`

   ```ts
   const {env, proxy} = await makeEnv();
   const errorSpy = vi.spyOn(env.logger, 'error').mockImplementation(() => {});

   new ViewComponent('test', {context: env.view});
   const pending = env.syncWait();
   await untilTrails(proxy, 1);

   env.destroy();
   proxy.refuseNext(new Error('the environment behind the proxy is gone'));

   await expect(withTimeout(pending)).rejects.toBeInstanceOf(ShadowEnvDestroyedError);

   // a macrotask, so the continuation behind the await in #syncNow() has certainly run
   await new Promise((resolve) => setTimeout(resolve, 0));

   expect(errorSpy).not.toHaveBeenCalled();
   ```

   Rot heute, weil der `catch`-Zweig in `#syncNow()` `logger.error('failed to apply change
   trail', …)` schreibt, obwohl der Abbau planmäßig war und `destroy()` den Wartenden schon
   abgelehnt hat.

2. **`ShadowEnv.ts` umbauen.** Fünf Stellen, keine davon ändert eine öffentliche Signatur.

   2a. Auf Modulebene, über der Klasse, ein nicht exportierter Typ:

   ```ts
   /**
    * The settlement of one synchronization cycle: the promise `syncWait()` hands out, and the pair
    * that settles it. A cycle takes its own settlement with it the moment its change trail is
    * built, which is what lets two cycles be in flight at once without settling each other's
    * callers.
    */
   type SyncCycle = {
     promise: Promise<ChangeTrailType>;
     resolve: (changeTrail: ChangeTrailType) => void;
     reject: (reason: unknown) => void;
   };
   ```

   2b. Die beiden Felder `#afterNextSync` und `#settleAfterNextSync` (Zeile 50/51) weichen einem:

   ```ts
   #nextSyncCycle?: SyncCycle | undefined;
   ```

   2c. `syncWait()` (Zeile 301 ff.): Rumpf hinter `this.sync()` wird zu

   ```ts
   // Every caller that arrives before the change trail is built waits on the same promise: they
   // all ride the same trail. From the build on the trail is fixed, `#syncNow()` has taken this
   // cycle with it, and the next caller opens the one behind it -- the cycle that will carry the
   // change they are about to make.
   this.#nextSyncCycle ??= this.#openSyncCycle();

   return this.#nextSyncCycle.promise;
   ```

   dazu eine neue private Methode, die den erklärenden Kommentar aus Zeile 310–315 (»The cycle
   settles this promise by hand rather than through `AfterSync` / `SyncFailed` …«) unverändert
   als Doc-Kommentar übernimmt — die Begründung gilt weiter und darf nicht mit dem alten Rumpf
   verschwinden:

   ```ts
   #openSyncCycle(): SyncCycle {
     let resolve!: (changeTrail: ChangeTrailType) => void;
     let reject!: (reason: unknown) => void;

     const outcome = new Promise<ChangeTrailType>((res, rej) => {
       resolve = res;
       reject = rej;
     });

     // the race is what settles a caller whose environment is destroyed before the cycle ends:
     // `destroy()` tears down the very listeners any other route would depend on
     return {promise: Promise.race([outcome, this.#destroyedSignal()]), resolve, reject};
   }
   ```

   Der `.then(…)`-Aufräumteil aus Zeile 320–331 entfällt ersatzlos. Er hat die beiden Felder
   geleert, sobald der Zyklus settelte — eine Mikrotask *nach* `#endSyncCycle`, und genau diese
   Verzögerung ist die zweite Hälfte des Befunds. Geleert wird jetzt früher und synchron: beim
   Trail-Bau (2d) und in `destroy()` (2e).

   2d. `#syncNow()` (Zeile 383 ff.), unmittelbar hinter `const data = this.view!.buildChangeTrails(false);`:

   ```ts
   // The trail is fixed from here on, and with it the set of callers this cycle answers: it
   // leaves holding `#nextSyncCycle`, and a `syncWait()` from now on opens the cycle behind it.
   // The settlement travels in this frame rather than in a field, because two cycles can be in
   // flight at once -- `ComponentContext.buildChangeTrails()` says as much at its own end of this.
   const cycle = this.#nextSyncCycle;
   this.#nextSyncCycle = undefined;
   ```

   Die beiden Wächter davor (`#isDestroyed`, `!this.isReady`) bleiben, wo sie sind, und stehen
   damit **vor** der Übergabe: der `!isReady`-Zweig armiert `#syncAfterContextCreated` neu und
   lässt `#nextSyncCycle` stehen, der Wartende fährt also mit dem neu armierten Zyklus mit. Das
   ist das bestehende Verhalten und wird nicht angefasst.

   Hinter dem `await` kommen zwei Wächter dazu, einer je Ausgang. Im `catch`, als erste Zeile,
   noch vor dem `logger.error`:

   ```ts
   // an environment that was torn down while its trail was in flight ends its cycle in silence:
   // destroy() has already rejected whoever waited on it and taken the listeners off, and a proxy
   // that refuses because it is being destroyed is not a failure anybody needs reported. The same
   // guard `#onProxyFailed()` carries at the neighbouring spot.
   if (this.#isDestroyed) return;
   ```

   und im Erfolgspfad, vor `this.#commitSyncCycle(data);`, dieselbe Zeile ohne den Kommentar.
   Dass ein solcher Zyklus schweigt statt zu melden, ist im Kopf des Plans unter
   »Entscheidungen« am 2026-08-27 beschlossen und steht hier nicht erneut zur Wahl.
   `#commitSyncCycle` bleibt inhaltlich unberührt — insbesondere bleibt dort `this.view?.` samt
   Kommentar stehen: `view` kann auch ohne `destroy()` verschwinden (`env.view = undefined`
   während des Fluges), der Wächter ersetzt das `?.` also nicht.

   Beide `#endSyncCycle(…)`-Aufrufe bekommen `cycle` als zweites Argument.

   2e. `#endSyncCycle` (Zeile 451 ff.) nimmt den Zyklus entgegen, statt ihn aus dem Feld zu
   holen; die ersten beiden Zeilen des Rumpfes (`const settle = …`, `this.#settleAfterNextSync =
   undefined;`) entfallen:

   ```ts
   #endSyncCycle(changeTrail: ChangeTrailType, cycle: SyncCycle | undefined, failure?: {reason: unknown}) {
     try {
       if (failure) {
         cycle?.reject(failure.reason);
         emit(this as ShadowEnv, ShadowEnv.SyncFailed, failure.reason, changeTrail, this as ShadowEnv);
       } else {
         cycle?.resolve(changeTrail);
         emit(this as ShadowEnv, ShadowEnv.AfterSync, changeTrail);
       }
     } catch (error) {
       this.logger.error('a sync cycle listener threw; the ones behind it did not hear about the cycle', error);
     }
   }
   ```

   Der Doc-Kommentar darüber bleibt, ergänzt um einen Satz: welcher Zyklus gemeint ist, steht
   jetzt im Argument und nicht mehr im Feld.

   2f. `destroy()` (Zeile 359/360): die beiden Zuweisungen weichen `this.#nextSyncCycle =
   undefined;`. Die Zeile davor — `this.#rejectWhenDestroyed?.(…)` — bleibt, wo sie ist, und
   bleibt der Weg, auf dem auch die fliegenden Zyklen ihre Wartenden ablehnen: deren Promise ist
   ein `Promise.race` gegen dieses Signal.

   2g. Der JSDoc über `syncWait()` (Zeile 279–300) bekommt einen Absatz dazu, der sagt, worauf
   ein Aufrufer wartet. Vorschlag:

   ```
    * Which cycle a caller gets is decided when the change trail is built. Everyone who arrives
    * before that point waits on the same promise -- they all ride the same trail. From the build
    * on the trail is fixed, and a call after it belongs to the next cycle, the one that carries
    * the changes made since. That holds inside a listener of {@link ShadowEnv.AfterSync} or
    * {@link ShadowEnv.SyncFailed} as well: the cycle it was told about is over, so the call opens
    * the one behind it.
   ```

   Der Kommentar in Zeile 307 (»one cycle, one promise: every caller that joins before it ends
   waits on the same one«) ist danach falsch und geht in dem aus 2c auf.

   **Eine Folge dieses Umbaus, die kein Fehler ist und im Review nicht als einer gelten darf:**
   ein `syncWait()`, das mitten im Flug gerufen wird, während die Umgebung gerade nicht mehr
   `isReady` ist, bleibt jetzt liegen, bis ein neuer Proxy da ist — vorher bekam es die
   sterbende Promise und settelte sofort. Genau das sagt der bestehende Vertrag in
   `docs/api-reference.md` zu: »It stays pending only while the environment is not ready; it
   settles once `ContextCreated` fires.«

3. **Bestehenden Test schärfen, nicht ersetzen.** In `ShadowEnv.spec.ts` steht bei
   `it('rejects every caller waiting on the same failed cycle', …)` der Kommentar »one cycle, one
   promise: the second caller joins the wait rather than opening a new one«. Der Fall bleibt
   grün und richtig — beide Aufrufe stehen in derselben Task, also vor dem Trail-Bau. Der
   Kommentar sagt künftig dazu, dass genau das der Grund ist.

4. **Doku.** `packages/shadow-objects/docs/api-reference.md`, Abschnitt `#### syncWait()`:
   hinter dem Absatz »The Promise resolves with the change trail of a cycle the Shadow
   Environment applied …« ein neuer Absatz mit demselben Inhalt wie der JSDoc aus 2g, in der
   Tonlage der Datei. Kein Rückblick auf den Vorzustand.
   `cheat-sheet.md`, `guides.md`, `concepts.md`, `getting-started.md`, `best-practices.md` und
   beide `README.md` sind **nicht** zu ändern: nachgesehen, keine von ihnen behauptet etwas über
   das Teilen der Promise oder über die Zyklusgrenze. Die Signaturen bleiben, also bleibt auch
   die `cheat-sheet`-Tabelle richtig.

5. **CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, Abschnitt `### Bugfixes` unter
   `## [Unreleased]`, neben die übrigen `**Bugfix (sync):**`-Einträge. Ein Eintrag für beide
   Findings: welcher Zyklus einen `syncWait()`-Aufrufer bedient und woran das hängt (der
   Trail-Bau), dass ein Hörer von `AfterSync`/`SyncFailed` den Zyklus danach bekommt und nicht
   den, der gerade endet, und dass ein Zyklus, dessen Umgebung während des Fluges zerstört wird,
   still endet statt einen Error-Log zu schreiben.
   Der Blockquote »**Next release: minor.**« am Kopf von `## [Unreleased]` wird **nicht**
   angefasst und die Zahl darin nicht fortgeschrieben: er wiegt die Breaking Changes des ganzen
   Release-Fensters, und diese Änderung bricht keinen korrekten Aufruf — sie ersetzt eine
   Promise, die sich mit einem Trail erfüllte, in dem die Änderung des Aufrufers nachweislich
   nicht stand. Die Semver-Einordnung des Laufs macht ohnehin der Abschluss.

6. **Ein e2e-Fall**, weil `AGENTS.md` §4 das für öffentliche API verlangt und der Befund über
   den Worker am schärfsten ist. Die Seite `pages/async-events.html` bringt alles mit: ein
   `<shae-worker no-autostart auto-sync="no">`, also keine fremden Zyklen dazwischen.
   In `packages/shadow-objects-e2e/src/async-events.js`, **hinter** dem Block
   `async-property-change-echoed` und **vor** dem Abschnitt `--- ASYNC-6 / ASYNC-7 ---`:

   ```js
   // --- ASYNC-13: a change made after the trail has left belongs to the next cycle -----
   //
   // one microtask turn after syncWait() the sync it scheduled has run: the trail is built and on
   // its way to the worker. A syncWait() from here on waits for the cycle that carries what is
   // changed now, not for the one already in flight.
   const counterProp = byId('counter').querySelector('shae-prop[name="n"]');

   counterProp.value = 5;
   const inFlightCycle = env.shadowEnv.syncWait();

   await Promise.resolve();

   counterProp.value = 6;
   const nextCycle = env.shadowEnv.syncWait();

   testBooleanAction('async-midflight-syncwait-opens-a-new-cycle', () => nextCycle !== inFlightCycle);

   await testAsyncAction('async-midflight-syncwait-carries-the-later-change', async () => {
     await inFlightCycle;
     await nextCycle;
     await waitUntil('the counter to echo 6', () => counted.counter.some((c) => c.value === 6));
   });

   // leave nothing in flight: the idle window further down counts on it
   await testAsyncAction('async-midflight-drained', () => env.shadowEnv.syncWait());
   ```

   Nach diesem Block darf **kein** Zyklus mehr offen und keine Änderung mehr pending sein —
   `async-no-autosync-stays-idle` weiter unten zählt sonst einen `AfterSync` mit und wird rot.
   Dazu die drei Namen an derselben Stelle in `packages/shadow-objects-e2e/tests/async-events.spec.ts`
   eintragen, und in `TEST-PLAN.md` zwei Stellen: die Zeile `async-events.spec.ts` in der Tabelle
   in §2 (Cases 23 → 26) und in §3.4 unter ASYNC-12 eine Zeile ASYNC-13, Prio P1, mit dem Text:
   »A syncWait() issued after the change trail of the running cycle has left waits for the
   cycle that carries the change made since, not for the one in flight.«
   Die IDs dieser Datei sind ihre eigene, dauerhafte Nummerierung und haben mit dem Audit nichts
   zu tun.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (`lint:ci` statt `lint`: heute nachgemessen grün, und es fällt im Gegensatz zu `lint` auch über
  eine neue Warnung. Der e2e-Lauf gehört dazu, weil dieses Paket die Zusagen von `syncWait()` über
  die Worker-Grenze verschiebt — genau die Strecke, die `sync-failure`, `worker-failure` und
  `async-events` abdecken.)
- Commit: `fix(view): a sync cycle settles the callers whose changes it carries`
- Ergebnis: 2 Runden · ASYNC-003 und ASYNC-004 behoben · drei Regressionstests im Block
  `a change made while a cycle is in flight` in `ShadowEnv.spec.ts`, alle drei vor dem Fix rot:
  `opens a new cycle for a caller that arrives after the trail was built` und
  `hands a listener that calls syncWait() from AfterSync the cycle after the one it was told about`
  scheiterten je an `expect(...).not.toBe(...)`, `reports nothing when the environment is
  destroyed while its trail is in flight` am ungewollten `logger.error('failed to apply change
  trail', …)` · dazu der e2e-Fall ASYNC-13 in `async-events.js` · Verify grün auf allen fünf
  Kommandos, e2e 654 passed (Baseline 645), Coverage 92,88 % Statements (Baseline 92,89 % —
  der Nenner ist um die neuen Spec-Fälle gewachsen, keine Zeile ist unbedeckt geworden)
- Nebenbefunde: → Queue (1 Eintrag, `TEST-PLAN.md:254`)
- Folgen: keine. `#afterNextSync` und `#settleAfterNextSync` waren private Felder ohne Leser
  außerhalb von `ShadowEnv.ts`; die öffentlichen Signaturen und die `dist/`-Form sind
  unverändert, was `distContract` im grünen Build bestätigt

**ASYNC-003 · medium · packages/shadow-objects/src/view/ShadowEnv.ts:301-334 gegenüber :383-416, :451-466** — syncWait() hängt sich an einen Zyklus, der den eigenen Änderungen längst davongefahren ist

Ein Zyklus hält seine Promise in #afterNextSync, und syncWait() gibt jedem weiteren Aufrufer genau diese zurück, solange sie steht. Das ist richtig, solange der Change Trail noch nicht gebaut ist — dann fährt der Aufrufer wirklich mit. Danach nicht mehr: #syncNow() liest den Trail in Zeile 395 aus der View, gibt an seinem await die Kontrolle ab, und wer jetzt eine Komponente ändert und syncWait() ruft, bekommt die Promise des laufenden Zyklus. Sie erfüllt sich mit einem Trail, in dem seine Änderung nicht steht. Die zweite Runde ist zwar bereits gebucht — sync() hat #syncScheduled gesetzt —, nur erfährt der Aufrufer davon nichts: sein await ist zurück, und er darf annehmen, seine Änderung sei drüben. Derselbe Mechanismus trifft einen Hörer von AfterSync oder SyncFailed, der aus dem Ereignis heraus syncWait() ruft: #endSyncCycle räumt #settleAfterNextSync vor dem emit, #afterNextSync aber erst eine Mikrotask später im .then des Rennens — der Hörer bekommt die Promise des Zyklus, der gerade endet, und sie erfüllt sich sofort. Am schärfsten wird das über den Worker, wo zwischen Trail-Bau und Bestätigung ein voller Umlauf liegt.

Empfehlung: Den Zyklus mit dem Trail-Bau schließen: sobald #syncNow() buildChangeTrails() gerufen hat, gehört #afterNextSync dem Trail, der unterwegs ist, und ein syncWait() danach eröffnet eine neue Promise für die nächste Runde. Ein zweites Feld — die Promise des laufenden Zyklus neben der des nächsten — reicht dafür; die Dokumentation von syncWait() sagt dann, worauf ein Aufrufer wartet, statt nur »ein Zyklus, eine Promise«.

Beleg aus dem Audit: Am 2026-08-27 an ShadowEnv.ts:301-334 und :383-416 gelesen. Die Spec deckt in ShadowEnv.spec.ts:359-368 den Fall zweier syncWait() in derselben Task ab — also vor dem Trail-Bau, wo das Teilen korrekt ist; für den Fall danach hat sie keinen Test.

**ASYNC-004 · low · packages/shadow-objects/src/view/ShadowEnv.ts:386-393 gegenüber :400-415, :426-436** — Ein Sync-Zyklus prüft nur vor dem await, ob seine Umgebung noch da ist

#syncNow() liest #isDestroyed einmal am Methodenkopf. Nach dem await auf applyChangeTrail() greift kein Wächter mehr: #endSyncCycle() emittiert dann in eine Umgebung, deren destroy() die Hörer mit off(this) bereits abgeräumt hat, und schreibt im Fehlerfall einen Log-Eintrag auf Error-Level dazu. Folgenlos, weil destroy() auch das Resolverpaar leert und ein doppeltes Settlen damit ausgeschlossen ist. #onProxyFailed() an der Nachbarstelle hat den Wächter, den #endSyncCycle() nicht hat.

Empfehlung: Eine Entscheidung für beide Stellen zusammen: Was tut ein Zyklus, dessen Umgebung während des Fluges verschwindet — schweigen oder melden? Danach den Wächter setzen oder seine Abwesenheit begründen.

Beleg aus dem Audit: An der Fundstelle nachgelesen (2026-08-20). Beim Re-Check am 2026-08-27 an der genannten Stelle erneut nachgelesen und bestätigt.

### [x] 2. Entity: ein werfender Kontext-Effekt bleibt bei seiner eigenen Entity
- Findings: BUG-029 (medium)
- Ziel: Die aufgeschobenen Kontextwerte werden einzeln geschrieben und einzeln
  abgesichert, und die Sammelstelle gehört dem Kernel statt dem Modul — eine Shadow
  Environment kann die Kontextwerte einer anderen weder verlieren noch verzögern.
- Bereich: `packages/shadow-objects/src/in-the-dark/Entity.ts`
- Hängt ab von: —
- Hash: 796162b
- Modell: mittlere Stufe
- Effort: medium
- Dateien:
  - `packages/shadow-objects/src/in-the-dark/Entity.ts`
  - `packages/shadow-objects/src/in-the-dark/Entity.spec.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`

**Abgleich (2026-08-27).** BUG-029 steht unverändert. Die Fundstelle ist heute
`Entity.ts:50–66` (das Audit nennt 49–65, eine Zeile Versatz): `updateContextValues` und
`requestedContextValueBatchUpdate` liegen auf Modulebene, `deferContextValueUpdate()` leert die Map
vor dem ersten Schreibvorgang und schreibt in einer nackten Schleife ohne Wächter. Einziger Aufrufer
ist `#findOrCreateContext()` an Zeile 640–642. Paket 1 hat die Datei nicht berührt.

Nachgemessen statt vermutet: `signalize` liefert die Effekte eines Schreibvorgangs synchron aus und
wirft das Gesammelte am Ende von `set()` wieder heraus (`writeSignal()` →
`beginIsolatedDelivery` / `endIsolatedDelivery` → `throwCollectedErrors`). Ein `set()` auf ein
bereits zerstörtes Signal ist dagegen ein stiller No-op — der Wächter unten macht aus einem
regulären Teardown also kein Log-Rauschen.

**Der Entwurf, in einem Absatz.** Die Sammelstelle wird pro Kernel geführt, der Wächter pro
Schreibvorgang. Beides hängt an demselben Faden: ein fehlgeschlagener Schreibvorgang muss irgendwohin
gemeldet werden, und den Logger gibt es pro Kernel — die Sammelstelle muss den Kernel also ohnehin
kennen. Sie wird deshalb mit ihm verschlüsselt, in einer `WeakMap<Kernel, …>` auf Modulebene von
`Entity.ts`, und **nicht** als Feld oder Methode am `Kernel`: dessen Oberfläche ist in
`docs/api-reference.md` vollständig dokumentiert, und ein `deferContextValueUpdate()` dort wäre eine
öffentliche Methode, die kein Konsument je aufrufen soll. Die `WeakMap` erspart zugleich jeden
Teardown — jede Runde leert ihre Map, die letzte leert der Kernel, indem er unerreichbar wird. Das
Vorbild dafür steht im `Kernel` selbst: `#shownDeprecations` liegt aus genau diesem Grund am Kernel
und nicht am Modul (»an application running two shadow environments would otherwise report the
deprecated call form to whichever of them got there first«).

**Zwei Wege, die bewusst nicht genommen werden.** Erstens `batch()` um die Schleife: das würde alle
Werte schreiben, bevor irgendein Effekt läuft, und `signalize` isoliert die Effekte einer
Batch-Freigabe einzeln — es wäre sogar der stärkere Schutz. Es verschiebt aber die Reihenfolge, in
der Effekte die Kontextwerte einer Runde sehen, und das ist eine Verhaltensänderung ohne Befund
dahinter. Zweitens ein Wächter um die ganze Schleife statt um jeden Eintrag: dann fällt der Rest der
Runde weiterhin aus. Der Einzelwächter ist das, was `#runGuarded()` zwölf Zeilen weiter unten
vormacht und was jede vergleichbare Schleife im Projekt hat.

**Vorgehen:**

1. **Regressionstests zuerst, und rot sehen.** Ein neuer `describe`-Block in
   `packages/shadow-objects/src/in-the-dark/Entity.spec.ts`, unmittelbar **vor**
   `describe('a release with a step that throws', …)` (heute Zeile 1062). Der rote Lauf beider Fälle
   gehört in den Report; fahre sie dafür einzeln
   (`pnpm exec vitest src/in-the-dark/Entity.spec.ts -t '<name>' --run`). Erwarte, dass der rote Lauf
   zweigestaltig ist: die Erwartungen scheitern, **und** der Wurf verlässt heute die Mikrotask als
   unbehandelter Fehler, den vitest zusätzlich anzeigt. Beides ist Rot; nimm die Ausgabe so in den
   Report, wie sie kommt.

   `createEffect`, `value`, `vi`, `generateUUID`, `makeKernel` und `nextMicrotask` stehen in der
   Datei bereits.

   ```ts
   describe('a context value whose reader throws', () => {
     // `Signal.set()` runs the effects of a signal synchronously and re-throws what one of them
     // threw, so a reader that fails does so inside the round that hands the context values over.
     // That is the shape both cases below are built on.
     const armedThrower = (read: () => unknown) => {
       let armed = false;

       // `createEffect()` runs its callback right away, and a throw from that first run would leave
       // through this line rather than through the hand-over the cases are about.
       createEffect(() => {
         read();
         if (armed) throw new Error('a context reader fails');
       });

       armed = true;
     };

     it('costs no other entity of the same kernel its value', async () => {
       const kernel = makeKernel();
       const [failingUuid, healthyUuid] = [generateUUID(), generateUUID()];

       kernel.createEntity(failingUuid, 'failing');
       kernel.createEntity(healthyUuid, 'healthy');

       const failing = kernel.getEntity(failingUuid);
       const healthy = kernel.getEntity(healthyUuid);

       // The failing entity takes its context first, so its value stands ahead of the other one in
       // the round: what this case is about is the entity waiting behind it.
       armedThrower(failing.useContext('ctx'));
       const healthyConsumer = healthy.useContext('ctx');

       const errors = vi.spyOn(kernel.logger, 'error').mockImplementation(() => {});

       failing.provideContext('ctx').set('for the failing reader');
       healthy.provideContext('ctx').set('for the healthy reader');

       await nextMicrotask();

       expect(value(healthyConsumer), 'the entity behind the failing one still gets its value').toBe(
         'for the healthy reader',
       );
       expect(errors, 'the failure names the context and the entity').toHaveBeenCalledWith(
         expect.stringContaining('ctx'),
         failingUuid,
         expect.any(Error),
       );
       expect(errors, 'and it is reported once').toHaveBeenCalledTimes(1);

       kernel.destroy();
       errors.mockRestore();
     });

     it('is reported to the kernel it happened in and leaves the other one alone', async () => {
       const failingKernel = makeKernel();
       const otherKernel = makeKernel();
       const [failingUuid, otherUuid] = [generateUUID(), generateUUID()];

       failingKernel.createEntity(failingUuid, 'failing');
       otherKernel.createEntity(otherUuid, 'other');

       const failing = failingKernel.getEntity(failingUuid);
       const other = otherKernel.getEntity(otherUuid);

       armedThrower(failing.useContext('ctx'));
       const otherConsumer = other.useContext('ctx');

       const failingErrors = vi.spyOn(failingKernel.logger, 'error').mockImplementation(() => {});
       const otherErrors = vi.spyOn(otherKernel.logger, 'error').mockImplementation(() => {});

       failing.provideContext('ctx').set('for the failing reader');
       other.provideContext('ctx').set('for the other kernel');

       await nextMicrotask();

       expect(value(otherConsumer), 'the other kernel hands its own values over').toBe('for the other kernel');
       expect(failingErrors, 'the kernel the reader lives in reports it').toHaveBeenCalledTimes(1);
       expect(otherErrors, 'the other kernel has nothing to report').not.toHaveBeenCalled();

       failingKernel.destroy();
       otherKernel.destroy();
       failingErrors.mockRestore();
       otherErrors.mockRestore();
     });
   });
   ```

   Warum die Spione erst nach `destroy()` zurückgenommen werden: der Abbau schreibt
   `ctx.context.set(undefined)`, der arme Effekt läuft dabei ein letztes Mal und wirft, und
   `#runGuarded('context value reset')` meldet das über denselben Logger. Ohne den stehenden Spion
   landet diese Zeile auf der echten Konsole des Testlaufs.

2. **`Entity.ts` umbauen.** Zwei Stellen, keine öffentliche Signatur ändert sich.

   2a. Zeile 50–66 (`updateContextValues`, `requestedContextValueBatchUpdate`,
   `deferContextValueUpdate`) weichen vollständig diesem Block:

   ```ts
   /** What one entity has waiting for its readers in the current round. */
   interface IDeferredContextValue {
     value: unknown;
     name: ContextNameType;
     uuid: string;
   }

   interface IContextValueCollector {
     values: Map<Signal<unknown>, IDeferredContextValue>;
     flushRequested: boolean;
   }

   /**
    * The context values waiting to reach their readers, one collector per kernel.
    *
    * Per kernel rather than per module for two reasons that are the same one: a write below can fail,
    * and what it is reported to is a logger, of which there is one per kernel; and an application
    * running two shadow environments in one realm would otherwise hand the values of one to a round
    * the other started. The kernel is the key, so a collector reaches no further than the kernel it
    * belongs to and needs no teardown of its own -- every round empties it, and the last one is
    * emptied by the kernel going out of reach.
    */
   const contextValueCollectors = new WeakMap<Kernel, IContextValueCollector>();

   const collectorOf = (kernel: Kernel): IContextValueCollector => {
     let collector = contextValueCollectors.get(kernel);
     if (collector == null) {
       collector = {values: new Map(), flushRequested: false};
       contextValueCollectors.set(kernel, collector);
     }
     return collector;
   };

   /**
    * Collects the context values written in one task and hands them to their readers a microtask
    * later, one at a time. A second value for the same signal replaces the one waiting, so a name
    * written twice in a task reaches its readers once, with the value that stood at the end of it.
    */
   const deferContextValueUpdate = (
     kernel: Kernel,
     signal: Signal<unknown>,
     val: unknown,
     name: ContextNameType,
     uuid: string,
   ) => {
     const collector = collectorOf(kernel);

     collector.values.set(signal, {value: val, name, uuid});

     if (collector.flushRequested) return;
     collector.flushRequested = true;

     queueMicrotask(() => {
       collector.flushRequested = false;

       // Taken out and emptied before the first write: a reader below can write a context of its own,
       // and that value belongs to the round behind this one rather than to the list it walks.
       const contextValues = Array.from(collector.values.entries());
       collector.values.clear();

       for (const [contextSignal, entry] of contextValues) {
         // `set()` runs the effects that read this context synchronously and throws what one of them
         // threw, so every hand-over stands behind a guard of its own -- the way `#runGuarded()`
         // below and every other loop over entity state in this project does it. A reader that fails
         // costs its own value and nothing else: the entities waiting behind it still get theirs.
         try {
           contextSignal.set(entry.value);
         } catch (error) {
           kernel.logger.error(`an effect of a context value failed (${String(entry.name)}):`, entry.uuid, error);
         }
       }
     });
   };
   ```

   `String(entry.name)` und nicht `${entry.name}`: `ContextNameType` schließt `symbol` ein, und
   `tsc` weist die direkte Interpolation zurück. Die Zeilenumbrüche der Parameterliste macht Biome
   (`lineWidth` 130) — lass `pnpm lint:fix` darüber laufen, statt von Hand zu formatieren.

   2b. Der Aufrufer in `#findOrCreateContext()` (heute Zeile 640–642) reicht Kernel, Name und uuid
   mit:

   ```ts
   const unsubscribePathValue = on(valuePath, SignalsPath.Value, (val) => {
     deferContextValueUpdate(this.#kernel, context, val, name, this.#uuid);
   });
   ```

3. **Doku.** `packages/shadow-objects/docs/api-reference.md`, Abschnitt
   `### 2. Entity Context (Dependency Injection)`, als letzter Absatz vor dem `---`, das
   `### 3. Reactivity Primitives` eröffnet. In der Tonlage der Datei, kein Rückblick auf den
   Vorzustand. Vorschlag:

   ```
   **A consumer that throws costs its own context value and no other.** Context values reach their
   readers a microtask after they are written, and they are handed over one at a time. Reading a
   context inside an effect means that effect runs during the hand-over, and a throw from it is
   reported through the Kernel's `ConsoleLogger` at **error** level, naming the context and the uuid
   of the Entity. The hand-over then moves on: every other Entity waiting for a context value in the
   same round still gets it, in this Shadow Environment as much as in any other one running beside
   it. The throw reaches neither the Shadow Object that wrote the value nor the change trail it may
   have arrived on -- both are long finished by the time the value goes out.
   ```

   `README.md`, `cheat-sheet.md`, `concepts.md`, `guides.md`, `best-practices.md` und
   `getting-started.md` sind **nicht** zu ändern: nachgesehen, keine von ihnen sagt etwas über die
   Zustellung von Kontextwerten oder über einen werfenden Leser. Signaturen bleiben unverändert.

4. **CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, `### Bugfixes` unter `## [Unreleased]`,
   als letzter Eintrag des alphabetisch sortierten `**Bugfix (kernel):**`-Laufs — hinter der Zeile
   »an entity whose creation fails at …« (heute Zeile 313) und vor dem ersten
   `**Bugfix (logging):**` (heute 314). Ein Eintrag, der beides nennt: dass die Kontextwerte einer
   Runde einzeln übergeben werden und ein werfender Leser nur seinen eigenen Wert kostet, gemeldet
   über den `ConsoleLogger` des Kernels samt Kontextname und uuid; und dass die Sammelstelle pro
   Kernel geführt wird, sodass zwei Shadow Environments in einem Realm einander weder Werte noch
   Meldungen abnehmen. Der Blockquote »**Next release: minor.**« am Kopf von `## [Unreleased]` wird
   **nicht** angefasst: diese Änderung bricht keinen korrekten Aufruf.

**Was ausdrücklich nicht angefasst wird.** `Kernel.destroy()` bekommt nichts dazu — die Sammelstelle
wird zu Beginn jeder Runde geleert und lebt damit höchstens eine Mikrotask, und die `WeakMap` hängt
am Kernel selbst; es gibt nichts, was ein Abbau abräumen müsste. `Kernel` bekommt keine neue
öffentliche Methode und kein neues Feld. Die Reihenfolge, in der die Effekte einer Runde laufen,
bleibt, wie sie ist.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (dieselben fünf Kommandos wie in Paket 1. Der e2e-Lauf gehört dazu, weil die Änderung auf dem Weg
  jedes Kontextwerts sitzt — im Worker-Kernel so gut wie im lokalen —, und e2e ist die einzige
  Strecke, auf der ein Worker-Kernel wirklich läuft; `multi-env.html` fährt drei Umgebungen
  nebeneinander.)
- Commit: `fix(kernel): a failing context reader costs no other entity its value`
- Ergebnis: 1 Runde · BUG-029 behoben · zwei Regressionstests im Block
  `a context value whose reader throws` in `Entity.spec.ts`, beide vor dem Fix rot:
  `costs no other entity of the same kernel its value` und `is reported to the kernel it
  happened in and leaves the other one alone` scheiterten je an `expected undefined to be
  '…'`, dazu der Wurf als unbehandelte Exception daneben · die Runde ging gegen die
  CHANGELOG-Zeile, die »unhandled rejection« statt einer unbehandelten Exception im
  globalen Error-Handler nannte und den Vorzustand erzählte; beides geschlossen und vom
  Reviewer über eine Mutationsprobe nachgemessen · Verify grün auf allen fünf Kommandos,
  e2e 654 passed, Coverage 92,9 % Statements (Baseline 92,89 %) · klein: die Erwartung in
  `Entity.spec.ts:1139` hängt an `queueMicrotask` als Planungsprimitiv und an »ein Termin je
  Kernel« — eine spätere Umarbeitung mit gemeinsamem Termin über getrennte Sammelstellen
  wäre rot, ohne dass etwas kaputt ist · klein: `Entity.spec.ts:1140` nimmt den Spion auf
  `globalThis.queueMicrotask` erst hinter der Erwartung zurück, und die Konfiguration setzt
  kein `restoreMocks` · klein: die Überschrift in `docs/api-reference.md:151` ist der
  einzige vollständige Aussagesatz als Überschrift der Datei, die übrigen sind Nominalphrasen
- Nebenbefunde: keine
- Folgen: keine. `deferContextValueUpdate()` ist modulintern und hat mit
  `#findOrCreateContext()` genau einen Aufrufer, der mitgezogen wurde; `Kernel` ist
  unberührt, die öffentlichen Signaturen und die `dist/`-Form sind unverändert, was
  `distContract` im grünen Build bestätigt

**BUG-029 · medium · packages/shadow-objects/src/in-the-dark/Entity.ts:49-65** — Ein werfender Effekt reißt die gesammelten Kontextwerte fremder Entities mit sich

deferContextValueUpdate() sammelt jeden Kontextwert, der in einer Task anfällt, in einer modulweiten Map und schreibt sie eine Mikrotask später in einer nackten Schleife weg. sig.set() ist dabei kein stiller Schreibvorgang: signalize führt die abhängigen Effekte synchron aus und wirft, was einer von ihnen geworfen hat, aus dem set() heraus — dieselbe Eigenschaft, auf die sich der Kommentar in ShaeEntElement.#applyComponentContext ausdrücklich beruft. Ein einziger Consumer-Effekt, der in einem useContext()-Leser wirft, beendet damit die Schleife. Die Map ist vor dem ersten Schreibvorgang geleert, also sind alle noch ausstehenden Werte weg: Entities in einem ganz anderen Teilbaum, in einem anderen Kernel, in einer anderen Shadow Environment desselben Realms behalten stillschweigend ihren alten Kontextwert. Der Wurf selbst hat keinen Aufrufer mehr und landet als unbehandelter Fehler im globalen error-Handler. Jede vergleichbare Schleife im Projekt steht hinter einem Wächter — #runGuarded in Entity und im Creation Scope, ein try/catch pro Kind in destroyEntity(), einer pro Scope-Teardown im Kernel. Diese ist die letzte ungeschützte.

Empfehlung: Die Schreibvorgänge einzeln kapseln, wie es #runGuarded() zwölf Zeilen weiter unten vormacht: try/catch pro Eintrag, Meldung über den Logger des Kernels, Schleife läuft weiter. Wer die Map ohnehin anfasst, kann sie gleich pro Kernel führen statt pro Modul — dann kann eine Shadow Environment die Kontextwerte einer anderen auch nicht mehr verzögern.

Beleg aus dem Audit: An Entity.ts:49-65 gelesen (2026-08-27). Dass ein Effekt-Wurf aus set() herauskommt, steht als Begründung im Kommentar an ShaeEntElement.ts:434-444; dieselbe Annahme trägt den try/catch um viewComponent$.set() dort.

### [x] 3. MessageRouter: der Fehlerpfad kommt unter allen Umständen bis zur Antwort
- Findings: BUG-028 (low)
- Ziel: Ein geworfener Wert mit werfendem `toString()` lässt den Router nicht mehr
  verstummen; die View bekommt eine Ersatzbeschreibung statt eines abgelaufenen Timeouts.
- Bereich: `packages/shadow-objects/src/worker/MessageRouter.ts`
- Hängt ab von: —
- Hash: 3de8089
- Modell: mittlere Stufe
- Effort: medium
- Dateien:
  - `packages/shadow-objects/src/worker/MessageRouter.ts`
  - `packages/shadow-objects/src/worker/MessageRouter.spec.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`

**Abgleich (2026-08-27).** BUG-028 steht unverändert. Die Fundstelle ist heute
`MessageRouter.ts:39–42` (das Audit nennt 39–43): `describeError()` ist ein Ausdruckskörper ohne
jeden Wächter. Beide Aufrufer stehen in einem `catch` — `#configure()` an Zeile 158,
`#onChangeTrail()` an Zeile 177. Kein Commit dieses Laufs hat die Datei berührt
(`git log 292714c..HEAD -- …/MessageRouter.ts` ist leer).

Nachgemessen statt vermutet, heute an dieser Maschine:

- `String(x)` wirft für ein Objekt mit werfendem `toString()` (dessen Wurf selbst) und für
  `Object.create(null)` (`TypeError: Cannot convert object to primitive value`). Der zweite Fall
  braucht keinen bösen Willen, nur ein Objekt ohne Prototyp.
- Der `instanceof Error`-Zweig ist dieselbe Tür, nur schmaler: ein `Error`, dessen `message` ein
  werfender Getter ist, bleibt `instanceof Error` und wirft beim Lesen. Deshalb steht der Wächter
  unten um den ganzen Rumpf und nicht nur um `String()`.
- `console.error('…', x)` überlebt beides — Node inspiziert den Wert, statt ihn in eine
  Zeichenkette zu zwingen. Der `logger.error`-Aufruf, der in beiden `catch`-Blöcken **vor**
  `describeError()` steht, ist also keine zweite Tür und bleibt, wo er ist.
- Der geworfene Wert erreicht `describeError()` unverpackt: ein Shadow-Object-Konstruktor, der ihn
  wirft, landet als `cause` des `ChangeTrailRefusedError`, den `Kernel.run()` daraus baut (gemessen:
  `cause === der geworfene Wert`, `appliedCount: 0`). Der Testweg unten braucht deshalb keinen Mock
  auf `kernel.run`.

**Restplan.** Unverändert. Die Pakete 4–9 liegen in `in-the-dark/`, in `shae-offscreen-canvas` und
in der Doku; keines teilt eine Datei oder eine Ursache mit diesem. Zu verteilen war nichts: Paket 1
und 2 melden beide »Folgen: keine«, und der einzige Eintrag in »Offene Befunde«
(`TEST-PLAN.md:254`) hat eine andere Ursache und trägt sein Urteil (`→ Audit`) bereits.

**Der Entwurf, in einem Absatz.** Eine Beschreibung zu holen heißt, den Code des geworfenen Werts
auszuführen — `String()` geht durch dessen `toString()`, `message` und `name` können Getter seiner
eigenen Machart sein. Der ganze Rumpf von `describeError()` kommt deshalb hinter ein `try`, und der
`catch`-Zweig gibt eine feste Ersatzbeschreibung zurück. Ein Wächter nur um `String()` ließe den
`Error`-Zweig offen, und zwei Wächter für zwei Zweige wären zwei Stellen, an denen dieselbe
Entscheidung steht. Die Ersatzbeschreibung ist nicht leer und trägt keinen Namen: dass `error`
überhaupt da ist, unterscheidet in `RemoteWorkerEnv` eine Ablehnung von einer Bestätigung, und
`WorkerReportedError(name, message)` setzt bei fehlendem Namen selbst `'Error'` ein.

**Was ausdrücklich nicht angefasst wird.**

- **Kein e2e-Fall.** Die öffentliche Oberfläche bleibt unverändert; was sich ändert, ist die Antwort
  des Routers auf einen Wert, der sich nicht lesen lässt, und die liegt vollständig in dieser einen
  Funktion — unten an beiden Aufrufstellen belegt. Die Strecke dahinter (`AppliedChangeTrail` mit
  `error` → `WorkerReportedError` in der View) fährt `sync-failure` bereits mit einem gewöhnlichen
  Error ab. Ein e2e-Fall bräuchte ein eigenes Shadow Object in einer geladenen Modul-Datei und
  brächte gegenüber der Spec nichts dazu. Der e2e-Lauf bleibt trotzdem im Verify.
- **Kein zusätzliches Logging in `describeError()`.** Beide Aufrufer schreiben den Wurf bereits
  vorher auf die Konsole, und die Funktion liegt auf Modulebene, hat also keinen Logger.
- **Keine exportierte Konstante für den Ersatztext.** Die Spec prüft ihn als Literal, so wie sie es
  bei `'module has no "shadowObjects" export'` auch tut.
- `isReadableMessageData()`, die drei `catch`-Blöcke selbst, `WorkerReportedError` und
  `RemoteWorkerEnv` bleiben unberührt.

**Vorgehen:**

1. **Regressionstests zuerst, und rot sehen.** Zwei Fälle in
   `packages/shadow-objects/src/worker/MessageRouter.spec.ts`, einer je Aufrufstelle. Der rote Lauf
   beider gehört in den Report; fahre sie dafür einzeln
   (`pnpm exec vitest src/worker/MessageRouter.spec.ts -t '<name>' --run`).

   1a. In `describe('a change trail that fails', …)` als letzter Fall, hinter
   `it('names the class the kernel refused with', …)` (heute Zeile 415–427):

   ```ts
   // A thrown value has to be read, and reading it runs its code. This one refuses: `String()`
   // goes through `toString()`, and this `toString()` throws. That the serial still gets its
   // answer is the whole case -- without one the caller in the view sits out its
   // `changeTrailTimeout` and learns nothing about why.
   it('confirms a change trail whose throw cannot describe itself', () => {
     const {kernel, posted, router} = setup();
     const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

     const indescribable = {
       toString() {
         throw new Error('this value refuses to describe itself');
       },
     };

     class ThrowsAnIndescribableValue {
       constructor() {
         throw indescribable;
       }
     }

     kernel.registry.define('indescribable-token', ThrowsAnIndescribableValue);

     router.route(changeTrailMessage(4, createEntity('a', 'indescribable-token')));

     expect(posted).toHaveLength(1);
     expect(posted[0]!.message).toEqual({
       type: AppliedChangeTrail,
       serial: 4,
       error: 'an error that cannot be described',
       appliedCount: 0,
     });
     expect(error).toHaveBeenCalledTimes(1);
   });
   ```

   Rot heute so: `router.route(…)` wirft `Error: this value refuses to describe itself` aus dem
   Testkörper heraus, der Fall scheitert also am Wurf und nicht an einer Erwartung. Es braucht
   keinen Spion auf `kernel.run` — `setup()` gibt jedem Fall seine eigene `Registry`, und
   `kernel.registry` ist ein öffentliches Feld.

   1b. In `describe('module import', …)` hinter `it('reports a module that cannot be parsed', …)`
   (heute Zeile 266–285) und vor `it('confirms a module it has already imported …', …)`:

   ```ts
   // The same door on the import path. The module text is a string: neither type-checked nor
   // formatted, and `encodeURIComponent` keeps its braces and quotes out of the url.
   it('reports a module whose throw cannot describe itself', async () => {
     const {posted, router} = setup();
     const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
     const url =
       'data:text/javascript,' +
       encodeURIComponent("throw {toString() { throw new Error('this value refuses to describe itself'); }};");

     router.route(message({type: Configure, importModule: url}));
     await waitForPosted(posted, 1);

     expect(posted).toHaveLength(1);
     expect(posted[0]!.message.type).toBe(ImportedModule);
     expect(posted[0]!.message.url).toBe(url);
     expect(posted[0]!.message.error).toBe('an error that cannot be described');
     expect(posted[0]!.message.errorName).toBeUndefined();
     expect(error).toHaveBeenCalledTimes(1);
   });
   ```

   Rot heute zweigestaltig, und beides gehört so in den Report, wie es kommt: `#configure()` ist
   `async` und wird ohne `await` gerufen, der Wurf aus dem `catch` wird also zu einer unbehandelten
   Ablehnung, die vitest daneben anzeigt — und weil keine Nachricht gepostet wird, scheitert der Fall
   nach zwei Sekunden an `waitForPosted` mit `expected 1 posted messages, got 0`. Der Standardwert
   des Timeouts bleibt stehen; ein kürzerer machte den Fall nach dem Fix nur wacklig.

   `setup`, `message`, `changeTrailMessage`, `createEntity`, `waitForPosted`, `AppliedChangeTrail`,
   `Configure`, `ImportedModule` und `vi` stehen in der Datei bereits.

2. **`MessageRouter.ts` umbauen.** Eine Stelle, Zeile 33–42, keine öffentliche Signatur ändert sich:

   ```ts
   /**
    * Reduces a throw to the two fields that survive the wire. `RemoteWorkerEnv` builds an error
    * from them, and it decides between a confirmation and a refusal by whether `error` is there
    * at all -- so the wording must never come out empty, not even for an `Error` carrying no
    * message of its own.
    *
    * Reading a throw means running its code: `String()` goes through its `toString()`, and
    * `message` and `name` can be getters of the thrown value's own making. A value that throws
    * from there -- an object whose `toString()` fails, one with no prototype at all -- must not
    * take the answer with it: the caller in the view is waiting on a reply, and without one it
    * sits out its `configureTimeout` or `changeTrailTimeout` and learns nothing about why.
    */
   const describeError = (error: unknown): {error: string; errorName?: string} => {
     try {
       return error instanceof Error
         ? {error: error.message || String(error), errorName: error.name}
         : {error: String(error) || 'unknown error'};
     } catch {
       // No name goes with it: whatever the value would have said about itself is exactly what
       // could not be read. The throw is already on the console -- both callers log it before
       // they ask for a description.
       return {error: 'an error that cannot be described'};
     }
   };
   ```

   `} catch {` ohne Bindung, wie in `utils/ConsoleLogger.ts:40`. Die Formatierung macht Biome
   (`lineWidth` 130) — lass `pnpm lint:fix` darüber laufen, statt von Hand umzubrechen.

3. **Doku.** `packages/shadow-objects/docs/api-reference.md`, im Absatz »A `WorkerReportedError` is
   no end of this environment …« (heute Zeile 1566): ein Satz hinter »… so the name is what tells
   one reported failure from another.« und **vor** »Exported from `@spearwolf/shadow-objects` as
   well.« In der Tonlage der Datei, kein Rückblick auf den Vorzustand. Vorschlag:

   ```
   A throw the worker cannot read out -- an object whose `toString()` throws, one with no prototype
   at all -- still arrives: the wording is then the fixed `an error that cannot be described` and no
   name travels with it, so `name` reads `Error` and the request ends in a rejection rather than in a
   timeout.
   ```

   `README.md`, `cheat-sheet.md`, `concepts.md`, `guides.md`, `best-practices.md` und
   `getting-started.md` sind **nicht** zu ändern: nachgesehen, keine von ihnen sagt etwas darüber,
   wie ein Wurf aus dem Worker in Worte kommt. Die beiden anderen Stellen in `api-reference.md`, die
   `WorkerReportedError` nennen (heute Zeile 1274, 1331, 1538), bleiben ebenfalls stehen — sie
   beschreiben, was der Fehler trägt, nicht wie er zu seinem Wortlaut kommt.

4. **CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, `### Bugfixes` unter `## [Unreleased]`,
   als letzter Eintrag des `**Bugfix (worker):**`-Laufs — hinter »a message the worker cannot read …«
   (heute Zeile 343) und vor dem ersten `**Bugfix (worker environments):**` (heute 344). Ein Eintrag,
   der beides nennt: dass der Worker eine fehlgeschlagene Anwendung eines Change Trail und einen
   fehlgeschlagenen Modul-Import auch dann beantwortet, wenn der geworfene Wert sich nicht in Worte
   bringen lässt — die Meldung ist dann `an error that cannot be described` und trägt keinen Namen —,
   und dass die View damit eine Ablehnung bekommt, statt ihr `configureTimeout` beziehungsweise
   `changeTrailTimeout` auszusitzen. Der Blockquote »**Next release: minor.**« am Kopf von
   `## [Unreleased]` wird **nicht** angefasst und die Zahl darin nicht fortgeschrieben: diese
   Änderung bricht keinen korrekten Aufruf, und die Semver-Einordnung des Laufs macht der Abschluss.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (dieselben fünf Kommandos wie in Paket 1 und 2. Der e2e-Lauf gehört dazu, weil die Änderung im
  Fehlerpfad der Worker-Grenze sitzt — genau die Strecke, die `sync-failure`, `worker-failure` und
  `async-events` abdecken.)
- Commit: `fix(worker): a throw that cannot describe itself still reaches the view`
- Ergebnis: 1 Runde · BUG-028 behoben · zwei Regressionstests in `MessageRouter.spec.ts`, beide
  vor dem Fix rot: `confirms a change trail whose throw cannot describe itself` scheiterte am Wurf
  selbst (`Error: this value refuses to describe itself` aus `Object.toString` über
  `describeError`), `reports a module whose throw cannot describe itself` zweigestaltig an
  `waitForPosted` (»expected 1 posted messages, got 0«) samt unbehandelter Ablehnung daneben ·
  der Reviewer hat den Wächter probeweise entfernt und beide Fälle erneut rot gesehen, kein Befund
  in keiner der drei Stufen · Verify grün auf allen fünf Kommandos, e2e 654 passed (Baseline 654),
  Coverage 92,9 % Statements (Baseline 92,89 %)
- Nebenbefunde: keine
- Folgen: keine. `describeError()` liegt auf Modulebene von `MessageRouter.ts` und hat mit
  `#configure()` und `#onChangeTrail()` genau zwei Aufrufer, beide in derselben Datei und beide
  mitgezogen; die öffentlichen Signaturen und die `dist/`-Form sind unverändert, was
  `distContract` im grünen Build bestätigt

**BUG-028 · low · packages/shadow-objects/src/worker/MessageRouter.ts:39-43** — Ein werfendes toString() im Fehlerpfad lässt den Router verstummen

describeError() wandelt den gefangenen Wert innerhalb des catch in eine Zeichenkette. Für einen geworfenen Wert, der kein Error ist, ruft String(error) in Zeile 42 dessen toString() auf, und zwar innerhalb des catch. Wirft diese Methode ihrerseits, verlässt die Ausnahme den catch: der Router meldet gar nichts, und die View wartet ihr configureTimeout beziehungsweise changeTrailTimeout aus, statt den Grund zu erfahren. Ein Shadow Object, das ein Objekt mit werfendem toString wirft, genügt dafür. Für einen Error ist die Tür schmaler — er liefert seine message, ohne toString() anzufassen.

Empfehlung: Die Umwandlung gegen ihre eigene Ausnahme absichern und im Fehlerfall auf eine feste Ersatzbeschreibung zurückfallen, damit der catch unter allen Umständen bis zur Antwort kommt.

Beleg aus dem Audit: Aus dem Remediation-Lauf vom 26. August 2026: Nebenbefund unter Paket 2 (Commit f5bcc23), an der Scope-Regel des Laufs gemessen und als vorbestehend ins Audit zurückgegeben. Vor dem Lauf lag dieselbe Umwandlung in den beiden catch-Blöcken selbst; das Paket hat sie in describeError() zusammengezogen und die Tür damit verschmälert, nicht geschlossen. Beim Re-Check am 2026-08-27 an der genannten Stelle erneut nachgelesen und bestätigt.

### [x] 4. Creation Scope: der Abbau ist ein Endzustand
- Findings: MEM-005 (low), MEM-006 (low)
- Ziel: `on()` und `once()` geben ihren Callback frei, sobald die Subscription endet, statt
  erst beim Abbau — und die Creation API füllt nach dem Teardown keine Karten mehr nach,
  sondern kehrt still zurück und meldet es.
- Bereich: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`,
  `packages/shadow-objects/docs/api-reference.md`
- Hängt ab von: —
- Hash: 78b128a
- Modell: mittlere Stufe
- Effort: medium
- Dateien:
  - `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`
  - `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`

**Abgleich (2026-08-27).** Beide Findings stehen unverändert, beide mit einem Zeilenversatz von
etwa eins gegenüber dem Audit. Kein Commit dieses Laufs hat die Datei berührt
(`git log 292714c..HEAD -- …/ShadowObjectCreationScope.ts` ist leer).

- MEM-005: heute `on()` an Zeile 600–617 und `once()` an 619–636 (Audit: 599–616, 618–635). Der
  erste Zweig — Anmeldung auf die eigene Entity — legt `unsub` in `#unsubscribeSecondary` und gibt
  `unsub` unverändert zurück. Der zweite Zweig gibt eine Hülle zurück, die den Eintrag vorher
  löscht. Der Unterschied steht wörtlich so da, in beiden Methoden.
- MEM-006: `#cachedReader` heute 339–368, `#provideContextSignal` 438–472 (Audit: 333–360,
  424–461). `tearDown()` (246–317) leert alle Karten und Mengen; kein Einstiegspunkt der Creation
  API prüft danach irgendetwas.

Nachgemessen statt vermutet, heute an dieser Maschine, gegen eventize 6.0.0 und
signalize 1.0.0-beta.0 aus dem Lockfile:

- `UnsubscribeFunc` ist `() => void` und trägt keine eigene aufzählbare Eigenschaft. Das
  `Object.assign(() => {…}, unsub)` im zweiten Zweig kopiert damit heute nichts. Es bleibt
  trotzdem stehen — siehe »Was ausdrücklich nicht angefasst wird«.
- Ein zweiter Aufruf desselben Unsubscribe ist folgenlos, und ein Unsubscribe nach einem bereits
  gefeuerten `once()` ebenfalls.
- `destroySignal(sig)` macht ein Signal **nicht** wertlos: Lesen liefert weiter den zuletzt
  gesetzten Wert, und ein `set()` schreibt ihn auch weiterhin. Was der Abbau nimmt, ist die
  Zustellung — kein Effekt und kein Link hängt danach noch daran. Ein frisch erzeugtes und sofort
  zerstörtes Signal liest deshalb `undefined` und schreibt ins Leere; genau das ist unten der
  Rückgabewert nach dem Teardown.
- `createEffect(cb, {autorun: false})` ruft `cb` nicht auf; ein anschließendes `destroy()` setzt
  `effect.destroyed` auf `true`, `run()` ist danach folgenlos und ein zweites `destroy()` auch.
  `getSignalsCount()` und `getEffectsCount()` stehen nach beidem wieder auf ihrem Ausgangswert.

**Restplan.** Unverändert. Die Pakete 5–9 teilen mit diesem weder Datei noch Ursache: Paket 5
liegt in `Kernel.ts` (und dieses Paket fasst `Kernel` ausdrücklich nicht an), 6 und 7 in
`shae-offscreen-canvas`, 8 in `ShadowObject.ts`, 9 in der Doku. Ein loser Faden zu Paket 8 ist
notiert und braucht keine Umsortierung: Paket 8 ändert, was `displayName` für eine dekorierte
Klasse liest, und die unten neue Meldung druckt diesen Namen — kein Testfall dieses Pakets hängt
am Namen einer dekorierten Klasse, sie bauen ihren Scope mit `'TestScope'` von Hand. Zu verteilen
war nichts: die Pakete 1–3 melden alle »Folgen: keine«, und der einzige Eintrag in »Offene
Befunde« (`TEST-PLAN.md:254`) hat eine andere Ursache und trägt sein Urteil (`→ Audit`) bereits.

**Der Entwurf, in zwei Absätzen.**

*MEM-005.* Beide Zweige laufen künftig durch dieselbe private Methode, die den Griff in die
Aufräummenge legt und eine Hülle zurückgibt, die ihn wieder herausnimmt. Der Unterschied zwischen
»eigene Entity« und »fremdes Ziel« verschwindet damit an der Stelle, an der er nie einer war: eine
Subscription endet auf beiden Wegen gleich.

*MEM-006.* Der Wächter hängt an einem **zweiten** Flag, und das ist die eine Entscheidung, auf die
es hier ankommt. `#isTornDown` steht am Kopf von `tearDown()` und ist der Einmal-Schalter; wäre der
Wächter daran gehängt, träfe er die `onDestroy`-Callbacks des Shadow Object selbst, denn die laufen
*innerhalb* des Teardown. Ein Callback, das sich mit `dispatchMessageToView('gone')` von der View
verabschiedet oder ein letztes Signal schreibt, ist legitim und heute möglich; und was es dabei
registriert, fängt der Teardown noch ein — die Schleifen über `#unsubscribeSecondary`,
`#unsubscribeContextFeeds` und die Karten stehen alle hinter der Schleife über
`#unsubscribePrimary`, und eine `Set`-Iteration in JavaScript besucht Einträge, die während des
Laufs dazukommen. Das Fenster bleibt also offen, wie es ist. Geschlossen wird es am **Ende** von
`tearDown()`, mit einem eigenen Flag, und ab da gibt die Creation API nichts mehr her.

Was sie stattdessen herausgibt, muss den Rückgabetyp erfüllen — ein `undefined` aus
`useProperty()` wäre am Aufrufort ein `TypeError` und damit schlimmer als der Wurf, gegen den im
Kopf des Plans entschieden ist. Also ein echtes, aber totes Objekt: ein Signal, das sofort nach
seiner Erzeugung zerstört wird (liest `undefined`, schreibt an niemanden), ein Effect, der nie
läuft und schon zerstört ist, und für `on()`/`once()` eine Funktion, hinter der keine Subscription
steht. Jeder solche Wert gehört dem, der ihn geholt hat, und geht mit ihm — der Scope hält keinen
davon fest. Das ist der Unterschied zu einem geteilten Exemplar pro Scope: zwei späte Aufrufer
würden sich sonst ein Signal teilen und einander die Werte lesen.

Gemeldet wird über `logger.error`, einmal je Membername und Scope. Die Form ist die von
`#reportDeprecatedIsEqualOption` zwölf Zeilen darüber: `error` statt `warn`, weil das einen Fehler
im aufrufenden Code benennt und dessen Autor ihn auch außerhalb von `localhost` sehen muss; und
gedeckelt, weil der typische späte Aufrufer ein Timer ist, der auf seinem nächsten Tick wiederkommt.
Die Menge der bereits gemeldeten Namen ist höchstens so groß wie die API (16 Einträge) und wird
erst angelegt, wenn der erste späte Aufruf kommt.

**Was ausdrücklich nicht angefasst wird.**

- **`Object.assign(() => {…}, unsub)` bleibt stehen**, obwohl heute nachgemessen nichts kopiert
  wird. Die Änderung hier gilt dem Zeitpunkt, zu dem der Eintrag die Menge verlässt, nicht der
  Gestalt des Griffs; und sollte eventize dem Handle je eine Eigenschaft mitgeben, trägt die Hülle
  sie weiter. Das ist im Review kein Befund.
- **Ein gefeuertes `once()` räumt seinen Eintrag nicht selbst weg.** Wer eine `once()`-Anmeldung
  nie kündigt und sie feuern lässt, lässt einen Eintrag in `#unsubscribeSecondary` stehen. Der hält
  aber nicht mehr, was MEM-005 benennt: eventize gibt beim Feuern alles frei, was das Handle hielt
  — `EventListener.detach()` nullt `listener` und `listenerObject`, `dischargeObligation()` leert
  `members` und `onSettled` (»a spent handle must hold nothing«, im Quelltext an Ort und Stelle).
  Zurück bleibt eine leergeräumte Closure, nicht der Callback und nicht sein Umfeld. Es zu
  schließen hieße, das Listener-Argument zu umhüllen — über rund fünfzehn Aufrufformen hinweg, in
  denen der Listener an wechselnder Position steht —, und das änderte seine Identität. Daran hängen
  eventizes Dedup zweier `once()` auf derselben Identität und jedes `off(ε, fn)` des Konsumenten.
  Der Preis ist höher als der Ertrag; die Stelle bleibt, wie sie ist.
- **`useProperties()` bekommt keinen eigenen Wächter.** Es ist eine Schleife über `useProperty()`,
  und jeder Durchgang läuft dort in den Wächter. Die Meldung nennt dann `useProperty` — was
  zutrifft, denn das ist der Aufruf, der zu spät kam — und fällt dank der Deckelung genau einmal,
  wie viele Namen die Schleife auch trägt.
- **`Kernel` bleibt unberührt**, ebenso `Entity`, `#runGuarded()`, die Reihenfolge der
  Teardown-Schritte und jede öffentliche Signatur. `ShadowObjectCreationScope` wird von `index.ts`
  nicht exportiert; der neue `@internal`-Getter unten ist damit keine öffentliche API und braucht
  keinen `README`-Eintrag.
- **Kein e2e-Fall.** Die öffentliche Oberfläche bleibt unverändert, und beide Findings liegen
  vollständig in dieser einen Klasse; die Spec fährt sie direkt an. Der e2e-Lauf bleibt trotzdem im
  Verify — die Creation API ist der Weg jedes Shadow Object, und im Worker läuft sie auf einer
  anderen Strecke als im lokalen Kernel.

**Vorgehen:**

1. **Das Messinstrument, vor den Tests.** In `ShadowObjectCreationScope.ts`, unmittelbar hinter dem
   `debugHandles`-Getter (heute Zeile 117–129), ein zweiter Getter derselben Machart. Er ist
   Werkzeug, nicht Fix — ohne ihn hat kein Testfall eine Möglichkeit, die Größe der Aufräummengen zu
   lesen, und genau das verlangt die Empfehlung des Audits zu MEM-005:

   ```ts
   /**
    * How many cleanup callbacks the scope is holding, one count per set, read without waiting on a
    * garbage collector: a test can subscribe and unsubscribe n times and see that the scope let go
    * of each handle as it went, rather than inferring it from what a collector happened to do.
    *
    * @internal
    */
   get debugCleanupCounts(): {primary: number; secondary: number; contextFeeds: number} {
     return {
       primary: this.#unsubscribePrimary.size,
       secondary: this.#unsubscribeSecondary.size,
       contextFeeds: this.#unsubscribeContextFeeds.size,
     };
   }
   ```

2. **Regressionstests, und rot sehen.** Zwei neue `describe`-Blöcke in
   `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`, hinter
   `describe('tearDown', …)` und vor der schließenden Klammer des äußeren `describe` (heute Zeile
   515/516). Fahre die Fälle einzeln
   (`pnpm exec vitest src/in-the-dark/ShadowObjectCreationScope.spec.ts -t '<name>' --run`) und nimm
   die Ausgabe so in den Report, wie sie kommt. **Der rote Lauf muss an den Erwartungen scheitern,
   nicht an einem `TypeError` auf `debugCleanupCounts`** — deshalb steht Schritt 1 davor.

   Die Importzeile aus `@spearwolf/eventize` wächst um `emit` und `on`; `eventize`, `value`, `vi`,
   `generateUUID`, `Kernel`, `Registry` und `ShadowObjectCreationScope` stehen bereits da. Dazu
   oben im äußeren `describe`, neben `makeUnboundScope`, zwei Helfer:

   ```ts
   const nextMicrotask = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));

   // A scope that has been through `bindTo()`, which is the state every case below starts from: the
   // creation API is open, and the teardown has a shadow-object to end.
   const boundScope = () => {
     const {kernel, uuid, scope} = makeUnboundScope();
     scope.bindTo(eventize({}), vi.fn(), vi.fn());
     return {kernel, entity: kernel.getEntity(uuid), scope};
   };
   ```

   2a. MEM-005:

   ```ts
   describe('a subscription that ends before the teardown', () => {
     // Every subscription the creation API hands out is booked into the scope's cleanup set, so the
     // teardown reaches the ones a shadow-object never ended itself. One that has already been
     // unsubscribed has nothing left for the teardown to do, and an entry left standing holds its
     // callback -- and everything the callback closes over -- for the rest of the object's life.
     const forms: Array<[string, (scope: ShadowObjectCreationScope, other: object, callback: () => void) => () => void]> = [
       ['on, on the entity', (scope, _other, callback) => scope.on('ping', callback)],
       ['on, on another object', (scope, other, callback) => scope.on(other, 'ping', callback)],
       ['once, on the entity', (scope, _other, callback) => scope.once('ping', callback)],
       ['once, on another object', (scope, other, callback) => scope.once(other, 'ping', callback)],
     ];

     it.each(forms)('%s: unsubscribing gives the handle back to the scope', (_label, subscribe) => {
       const {kernel, scope} = boundScope();
       const other = eventize({});

       expect(scope.debugCleanupCounts.secondary, 'the scope starts with nothing booked').toBe(0);

       for (let i = 0; i < 10; i++) {
         const unsubscribe = subscribe(scope, other, () => {});
         expect(scope.debugCleanupCounts.secondary, 'a live subscription is booked').toBe(1);
         unsubscribe();
         expect(scope.debugCleanupCounts.secondary, 'and one that has ended is not').toBe(0);
       }

       kernel.destroy();
     });

     it.each(forms)('%s: one nobody ends is still ended by the teardown', (_label, subscribe) => {
       const {kernel, entity, scope} = boundScope();
       const other = eventize({});
       const callback = vi.fn();

       subscribe(scope, other, callback);
       scope.tearDown();

       emit(entity, 'ping');
       emit(other, 'ping');

       expect(callback).not.toHaveBeenCalled();

       kernel.destroy();
     });
   });
   ```

   Rot heute in den beiden `on the entity`-Fällen des ersten Blocks, an
   `expect(…, 'and one that has ended is not').toBe(0)`: der Zweig gibt `unsub` unverändert zurück,
   der Eintrag bleibt liegen und die Menge wächst mit jedem Durchgang. Die beiden
   `on another object`-Fälle sind heute grün und bleiben es — sie halten fest, dass der Zweig, der
   es schon konnte, es weiter kann. Der zweite Block ist heute grün und ist der Wächter dagegen,
   dass die Hülle den Eintrag *ersetzt* statt ihn zu begleiten.

   2b. MEM-006:

   ```ts
   describe('the creation API past the teardown', () => {
     it('takes no subscription and hands back a handle with nothing behind it', () => {
       const {kernel, entity, scope} = boundScope();
       const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
       const callback = vi.fn();

       scope.tearDown();

       const unsubscribe = scope.on('ping', callback);
       scope.once('ping', callback);

       emit(entity, 'ping');

       expect(callback, 'nothing was subscribed').not.toHaveBeenCalled();
       expect(scope.debugCleanupCounts.secondary, 'and nothing was booked for a teardown that is over').toBe(0);
       expect(() => unsubscribe(), 'the handle is a real function').not.toThrow();
       expect(errors, 'one line per member').toHaveBeenCalledTimes(2);

       kernel.destroy();
     });

     it('creates no reader and no feed, and hands back one that reads undefined', () => {
       const {kernel, scope} = boundScope();
       vi.spyOn(console, 'error').mockImplementation(() => {});

       scope.tearDown();

       const property = scope.useProperty('size');
       const context = scope.useContext('theme');
       const parentContext = scope.useParentContext('theme');

       expect(scope.debugCleanupCounts.secondary, 'no feed was linked').toBe(0);
       expect(value(property)).toBeUndefined();
       expect(value(context)).toBeUndefined();
       expect(value(parentContext)).toBeUndefined();

       kernel.destroy();
     });

     it('attaches no provider to the entity', async () => {
       const {kernel, entity, scope} = boundScope();
       vi.spyOn(console, 'error').mockImplementation(() => {});

       const reader = entity.useContext('theme');

       scope.tearDown();

       scope.provideContext('theme', 'dark');
       scope.provideGlobalContext('theme', 'dark');

       // the entity hands a context value on a microtask after it is written
       await nextMicrotask();

       expect(scope.debugCleanupCounts.contextFeeds, 'no feed was attached').toBe(0);
       expect(value(reader), 'and the entity heard nothing').toBeUndefined();

       kernel.destroy();
     });

     it('creates no signal, no effect and no resource', () => {
       const {kernel, scope} = boundScope();
       vi.spyOn(console, 'error').mockImplementation(() => {});
       const body = vi.fn();
       const factory = vi.fn(() => 'a resource');

       scope.tearDown();

       const signal = scope.createSignal('never');
       const effect = scope.createEffect(body);
       const memo = scope.createMemo(() => 'never');
       const resource = scope.createResource(factory);

       expect(body, 'the effect body never runs').not.toHaveBeenCalled();
       expect(factory, 'the resource factory never runs').not.toHaveBeenCalled();
       expect(effect.destroyed, 'the effect is handed out already destroyed').toBe(true);
       expect(scope.debugCleanupCounts.secondary).toBe(0);
       expect(value(signal.get), 'the value it was called with goes nowhere').toBeUndefined();
       expect(value(memo)).toBeUndefined();
       expect(value(resource.get)).toBeUndefined();

       kernel.destroy();
     });

     it('registers no cleanup and sends nothing on', () => {
       const {kernel, entity, scope} = boundScope();
       vi.spyOn(console, 'error').mockImplementation(() => {});
       const toTheView = vi.spyOn(entity, 'dispatchMessageToView').mockImplementation(() => {});
       const heard = vi.fn();
       on(entity, 'ping', heard);

       scope.tearDown();

       scope.onDestroy(vi.fn());
       scope.onViewEvent(vi.fn());
       scope.emit('ping');
       scope.dispatchMessageToView('gone');

       expect(scope.debugCleanupCounts.primary).toBe(0);
       expect(scope.debugCleanupCounts.secondary).toBe(0);
       expect(heard, 'nothing is emitted on the entity').not.toHaveBeenCalled();
       expect(toTheView, 'nothing reaches the view').not.toHaveBeenCalled();

       kernel.destroy();
     });

     it('reports each member of the creation API once', () => {
       const {kernel, scope} = boundScope();
       const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

       scope.tearDown();

       scope.useProperty('a');
       scope.useProperty('b');
       scope.useProperty('c');

       expect(errors, 'one line for useProperty, however many late calls it takes').toHaveBeenCalledTimes(1);
       expect(errors.mock.calls[0]![0], 'and it names the member and the scope').toMatch(
         /useProperty\(\).*"TestScope".*has torn down/,
       );

       scope.useContext('a');

       expect(errors, 'a different member is a line of its own').toHaveBeenCalledTimes(2);

       kernel.destroy();
     });

     it('is still open to the cleanup callbacks the teardown itself runs', () => {
       const {kernel, entity, scope} = boundScope();
       const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
       const toTheView = vi.spyOn(entity, 'dispatchMessageToView').mockImplementation(() => {});

       // A cleanup callback runs while the teardown is under way, and the creation API is what it
       // has to say goodbye with. What it registers there is still swept up by the teardown around
       // it, which is why the API closes at the end of the teardown rather than at its start.
       scope.onDestroy(() => {
         scope.dispatchMessageToView('gone');
         scope.createSignal('a signal of the last moment');
       });

       scope.tearDown();

       expect(toTheView, 'the message reaches the view').toHaveBeenCalledWith('gone', undefined, undefined, false);
       expect(errors, 'and nothing is reported').not.toHaveBeenCalled();
       expect(scope.debugCleanupCounts.secondary, 'what it registered went with the rest').toBe(0);

       kernel.destroy();
     });
   });
   ```

   Rot heute: die ersten sechs Fälle, jeder an seiner ersten Erwartung — die Creation API tut nach
   dem Teardown genau das, was sie vorher tat. Der letzte Fall ist heute grün; er ist der Wächter
   dagegen, dass der Umbau das Fenster des Teardown mit zuschlägt, und er geht rot, wenn das neue
   Flag am Kopf von `tearDown()` gesetzt wird statt an seinem Ende.

3. **`ShadowObjectCreationScope.ts` umbauen.** Sechs Stellen, keine öffentliche Signatur ändert
   sich.

   3a. Auf Modulebene, über der Klasse und unter den Imports, drei Werte. Sie stehen dort und nicht
   in der Klasse, weil sie nichts vom Scope brauchen — und weil die Namensregel im Klassenkommentar
   (»A bare name inside a body is therefore always the import«) für Modulfunktionen ohnehin gilt:

   ```ts
   /**
    * What a creation-API call gets once the scope has closed: a real `Signal`, created and destroyed
    * on the spot. Reading it gives `undefined` and writing to it reaches nobody -- a destroyed signal
    * keeps its value but has neither effect nor link left on it. It belongs to whoever asked for it
    * and goes when they do, so a scope that is asked again and again after its end holds nothing.
    */
   const inertSignal = (): Signal<any> => {
     const sig = createSignal<any>(undefined);
     destroySignal(sig);
     return sig;
   };

   /** The same for `createEffect()`: a real `Effect`, never run, already destroyed. */
   const inertEffect = (): ReturnType<typeof createEffect> => {
     const effect = createEffect(() => {}, {autorun: false});
     effect.destroy();
     return effect;
   };

   /** The handle a late `on()` or `once()` gets: there is no subscription behind it. */
   const noSubscription = (): void => {};
   ```

   3b. Neben `#isTornDown` (heute Zeile 96) ein zweites Flag und die Liste der schon gemeldeten
   Namen:

   ```ts
   // Armed at the *end* of `tearDown()`, not at its start, and the difference is the whole point:
   // the teardown runs the shadow-object's own cleanup callbacks, and those are allowed the creation
   // API -- a goodbye to the view, a last write. What they register there is still swept up by the
   // steps behind them. What arrives after the teardown has returned is not, which is what this
   // closes.
   #isCreationApiClosed = false;

   // The member names whose late call has already been reported, at most as many as the API has
   // members. Lazy, because a scope that is used correctly never allocates it.
   #lateCallsReported: Set<string> | undefined;
   ```

   3c. In `tearDown()` als letzte Anweisung, hinter den vier Feld-Freigaben (heute Zeile 313–316):

   ```ts
   this.#isCreationApiClosed = true;
   ```

   Der Doc-Kommentar über `tearDown()` (216–245) bekommt am Ende einen Absatz dazu:

   ```
    * The creation API is closed as the very last step, after everything above has run. Until then it
    * is open, because the cleanup callbacks of the shadow-object run inside this method and are
    * entitled to it -- a last message to the view, a last write to a context. What such a callback
    * registers is still reached by the steps behind it. What arrives once this method has returned
    * is not, and is turned away by `#refuseAfterTearDown()`.
   ```

   3d. Neben `#reportDeprecatedIsEqualOption` (heute 383–389), als eigene private Methode:

   ```ts
   /**
    * Answers whether the creation API still has anything to give, and reports it where it has not.
    *
    * Past the teardown the scope has released what it held and cleared what it tracked. A call
    * arriving now would fill those maps again with entries no second teardown ever reaches -- the
    * teardown runs once, and it has run. Such a call is therefore turned away rather than served.
    *
    * Turned away quietly: the callers that arrive late are the ones with nobody to catch a throw --
    * a timer, a continuation behind an `await`, a callback of some other object that outlived this
    * one. It is reported instead, through `error` for the same reason the deprecation report above
    * uses it: this names a mistake in the calling code, and its author has to see it wherever the
    * application runs. Once per member name and scope, because a stale timer comes back on its next
    * tick and a line per tick would bury the first one.
    */
   #refuseAfterTearDown(apiName: string): boolean {
     if (!this.#isCreationApiClosed) return false;

     if (!this.#lateCallsReported?.has(apiName)) {
       (this.#lateCallsReported ??= new Set()).add(apiName);
       this.#logger.error(
         `[shadow-objects] ${apiName}(): the creation scope of "${this.#displayName}" has torn down — the call does nothing. Something is still holding the creation API past the end of its shadow-object.`,
       );
     }

     return true;
   }
   ```

   Der Gedankenstrich in der Meldung ist ein Halbgeviertstrich, wie in der Meldung von
   `#cachedReader` darüber. Den Zeilenumbruch macht Biome (`lineWidth` 130) — lass `pnpm lint:fix`
   darüber laufen, statt von Hand umzubrechen.

   3e. Neben `#runGuarded` eine zweite private Methode, die beide Anmeldewege trägt:

   ```ts
   /**
    * Books an `on()` or `once()` subscription into the cleanup set and hands back a handle that takes
    * it out again. Unsubscribing releases the callback there and then rather than at the teardown, so
    * a shadow-object that subscribes and unsubscribes over the whole life of its entity holds one
    * handle at a time instead of one per call. The target makes no difference to that: a subscription
    * on the entity ends the same way one on any other object does.
    */
   #trackSubscription(unsubscribe: () => void): () => void {
     this.#unsubscribeSecondary.add(unsubscribe);

     return Object.assign(() => {
       this.#unsubscribeSecondary.delete(unsubscribe);
       unsubscribe();
     }, unsubscribe);
   }
   ```

   3f. Die Wächter, je eine Zeile, als **erste** Anweisung der Methode — vor
   `#reportDeprecatedIsEqualOption`, denn eine Deprecation-Meldung an einen abgebauten Scope ist
   Rauschen. Fünfzehn Stellen; `useProperties()` bekommt keine (siehe oben):

   | Methode (heutige Zeile) | Wächter |
   | --- | --- |
   | `useProperty` (391) | `if (this.#refuseAfterTearDown('useProperty')) return inertSignal().get;` |
   | `provideContext` (474) | `if (this.#refuseAfterTearDown('provideContext')) return inertSignal();` |
   | `provideGlobalContext` (492) | `if (this.#refuseAfterTearDown('provideGlobalContext')) return inertSignal();` |
   | `useContext` (510) | `if (this.#refuseAfterTearDown('useContext')) return inertSignal().get;` |
   | `useParentContext` (526) | `if (this.#refuseAfterTearDown('useParentContext')) return inertSignal().get;` |
   | `createSignal` (542) | `if (this.#refuseAfterTearDown('createSignal')) return inertSignal();` |
   | `createEffect` (551) | `if (this.#refuseAfterTearDown('createEffect')) return inertEffect();` |
   | `createMemo` (558) | `if (this.#refuseAfterTearDown('createMemo')) return inertSignal().get;` |
   | `createResource` (566) | `if (this.#refuseAfterTearDown('createResource')) return inertSignal();` |
   | `on` (600) | `if (this.#refuseAfterTearDown('on')) return noSubscription;` |
   | `once` (619) | `if (this.#refuseAfterTearDown('once')) return noSubscription;` |
   | `emit` (638) | `if (this.#refuseAfterTearDown('emit')) return;` |
   | `onViewEvent` (649) | `if (this.#refuseAfterTearDown('onViewEvent')) return;` |
   | `onDestroy` (656) | `if (this.#refuseAfterTearDown('onDestroy')) return;` |
   | `dispatchMessageToView` (660) | `if (this.#refuseAfterTearDown('dispatchMessageToView')) return;` |

   Meldet `tsc` bei `createMemo<T>` einen Rückgabetyp-Fehler, weil `SignalReader<any>` dort auf
   `SignalReader<T>` trifft, dann `inertSignal().get as SignalReader<T>` — und nur dort. An den
   übrigen Stellen ist `any` beidseitig, das trägt heute schon.

   3g. `on()` und `once()` bekommen ihre Rümpfe hinter dem Wächter auf eine Form. Für `on()`:

   ```ts
   on(...args: any[]): ReturnType<typeof on> {
     if (this.#refuseAfterTearDown('on')) return noSubscription;

     const [firstArg] = args;
     const unsubscribe =
       typeof firstArg === 'string' || typeof firstArg === 'symbol' || Array.isArray(firstArg)
         ? // @ts-ignore
           on(this.#entity, ...args)
         : // @ts-ignore
           on(...args);

     return this.#trackSubscription(unsubscribe);
   }
   ```

   `once()` genauso, mit `once` statt `on`. Die beiden bisherigen Kommentare über den Hüllen
   (»Unsubscribing takes the callback out of the cleanup set as well …«) entfallen hier und gehen
   im Doc-Kommentar von `#trackSubscription` auf.

4. **Doku.** `packages/shadow-objects/docs/api-reference.md`, in `### 6. Lifecycle`, hinter dem
   Code-Beispiel von `#### onDestroy(callback)` (endet heute Zeile 416) und **vor** dem `---` in
   Zeile 418. Eine Überschrift als Nominalphrase — die Datei hat genau einen vollständigen
   Aussagesatz als Überschrift, und ein zweiter würde die Ausnahme zur Regel machen. In der Tonlage
   der Datei, kein Rückblick auf den Vorzustand. Vorschlag:

   ```
   #### The creation API past the teardown

   The creation API belongs to one Shadow Object and ends with it. Once the teardown is through, every
   member of it does nothing: no subscription is taken, no signal, effect, memo or resource is created,
   no context is provided or read, no message goes to the view, and a cleanup registered there never
   runs. The call returns rather than throwing — what reaches the API late is a timer, a continuation
   behind an `await`, a callback of some object that outlived this one, and none of them has anywhere
   to put a throw. It is reported through the `ConsoleLogger` at **error** level instead, naming the
   member and the Shadow Object, once per member.

   What comes back is inert but real, so a call site needs no special case: `on()` and `once()` give a
   handle with no subscription behind it, and everything signal-shaped gives a destroyed signal —
   reading it yields `undefined`, and a write to it reaches nobody. Each of those belongs to its
   caller alone.

   The teardown itself is not past it. An `onDestroy` callback runs while the teardown is under way,
   and the whole creation API is open to it: a last message to the view, a last write to a context, a
   signal it needs on the way out. Whatever it registers there is released with everything else before
   the teardown returns.
   ```

   `README.md`, `cheat-sheet.md`, `concepts.md`, `guides.md`, `best-practices.md` und
   `getting-started.md` sind **nicht** zu ändern: nachgesehen, keine von ihnen sagt etwas darüber,
   was die Creation API nach dem Ende ihres Shadow Object tut. Auch `#### on(source, eventName,
   callback)` (heute Zeile 267 ff.) bleibt, wie es ist — dort steht »Calling it early is the way to
   end a subscription before the Shadow Object is destroyed; ignoring it is fine, since the
   automatic cleanup still applies«, und beides gilt unverändert. MEM-005 ändert, wann der Scope den
   Griff loslässt, nicht was der Aufrufer davon hat.

5. **CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, `### Bugfixes` unter `## [Unreleased]`,
   als letzter Eintrag des sortierten `**Bugfix (kernel):**`-Laufs — hinter »the context values
   written in one task …« (heute Zeile 314) und vor dem ersten `**Bugfix (logging):**` (heute 315).
   Ein Eintrag, der beides nennt: dass ein `on()` oder `once()` der Creation API seinen Griff
   freigibt, sobald der Aufrufer die Subscription beendet, statt erst beim Abbau des Shadow Object;
   und dass die Creation API mit dem Teardown schließt — keine Subscription, kein Signal, kein
   Kontext, keine Nachricht an die View und kein Cleanup mehr, gemeldet über den `ConsoleLogger` auf
   Error-Level, einmal je Member, mit einem inerten Rückgabewert statt eines Wurfs; und dass die
   `onDestroy`-Callbacks, die *während* des Teardown laufen, die API weiterhin ganz zur Verfügung
   haben. Dazu der Satz »Documented in `docs/api-reference.md`. No signature changes.«, wie die
   Nachbareinträge ihn tragen. Der Blockquote »**Next release: minor.**« am Kopf von
   `## [Unreleased]` wird **nicht** angefasst und die Zahl darin nicht fortgeschrieben: diese
   Änderung bricht keinen korrekten Aufruf, und die Semver-Einordnung des Laufs macht der Abschluss.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (dieselben fünf Kommandos wie in den Paketen 1–3.)
- Commit: `fix(kernel): the creation API ends with its scope, a subscription with its handle`
- Ergebnis: 1 Runde · MEM-005 und MEM-006 behoben · Regressionstests
  `a subscription that ends before the teardown` (4 Anmeldeformen × 2 Fälle) und
  `the creation API past the teardown` (7 Fälle) in `ShadowObjectCreationScope.spec.ts`, acht
  davon vor dem Fix rot · klein: `docs/api-reference.md:420` sagt »every member of it does
  nothing« absolut und nimmt `entity` erst sieben Zeilen später aus — »every callable member«
  wäre der billigere Schnitt · klein: der Vorher-Nachher-Ton des CHANGELOG-Eintrags bleibt
  bewusst stehen, jeder Nachbareintrag der Datei ist so gebaut · klein: der neue Doku-Block
  bricht bei ~100 Spalten, die Absätze daneben stehen je auf einer Zeile
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — `ShadowObjectCreationScope` wird von `index.ts` nicht exportiert,
  `debugCleanupCounts` ist `@internal`, keine öffentliche Signatur bewegt sich

**MEM-005 · low · packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:599-616, :618-635** — on() und once() eines Creation Scope geben ihren Callback nur beim fremden Ziel wieder frei

Beide Methoden legen ihren Callback in #unsubscribeSecondary ab, damit der Abbau ihn erreicht. Herausgenommen wird er nur in dem Zweig, der auf ein fremdes Ziel hört. Die übliche Form — Anmeldung auf die eigene Entity — lässt die Menge mit jedem Aufruf weiterwachsen. Ein Shadow Object, das über die Lebensdauer seiner Entity wiederholt an- und abmeldet, sammelt damit genau die Griffe an, die der Scope loswerden soll; freigegeben wird alles erst beim Abbau, und bis dahin hält die Menge jeden Callback samt seinem Closure-Umfeld.

Empfehlung: Den Callback in beiden Zweigen aus #unsubscribeSecondary nehmen, sobald die Subscription endet — die Handle-Rückgabe von eventize trägt den Abmeldeweg bereits. Ein Testfall, der nach n An- und Abmeldungen die Größe der Menge prüft, hält die Zusage fest.

Beleg aus dem Audit: Beim Re-Check am 2026-08-27 an der genannten Stelle erneut nachgelesen und bestätigt.

**MEM-006 · low · packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:333-360, :424-461** — Die Creation API eines abgebauten Scope füllt die geleerten Karten wieder

tearDown() gibt die Felder frei und leert die Karten des Scope. Die Creation API bleibt danach aufrufbar. Wer den Scope noch hält — ein Callback, ein Timer, eine await-Fortsetzung, die den Abbau überdauert hat — legt mit dem nächsten provideContext oder useProperty neue Einträge in genau die Karten, die der Abbau geräumt hat. Für diese Einträge läuft kein zweiter tearDown() mehr; sie hängen, bis der Scope selbst fällt. Der Abbau ist damit kein Endzustand, sondern eine Momentaufnahme.

Empfehlung: Ein Abbau-Flag setzen und die Einstiegspunkte der Creation API dagegen prüfen: entweder still zurückkehren oder werfen, je nachdem, was die Doku zusagen soll. Entscheidend ist, dass die Entscheidung an einer Stelle steht und in docs/api-reference.md beschrieben ist — heute ist das Verhalten weder zugesagt noch verhindert.

Beleg aus dem Audit: Beim Re-Check am 2026-08-27 an der genannten Stelle erneut nachgelesen und bestätigt.

### [x] 5. Kernel.destroy(): der Traversal-Cache wird mit geleert
- Findings: MEM-007 (low)
- Ziel: `destroy()` lässt keine Arrays voller zerstörter Entities stehen — die Zusage des
  Kommentars daneben stimmt für alle vier Felder.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.ts`
- Hängt ab von: —
- Hash: 4d53d49
- Modell: mittlere Stufe
- Effort: low
- Dateien:
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts`
  - `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`

**Abgleich (2026-08-27).** MEM-007 steht unverändert, und diesmal ohne jeden Zeilenversatz:
`destroy()` liegt auf `Kernel.ts:918–941`, die vier Felder auf `:76–78` plus `:73–74`. Kein Commit
dieses Laufs hat die Datei berührt (`git log 292714c..HEAD -- …/Kernel.ts` ist leer). Nachgelesen:
`destroy()` räumt `#entities` und `#rootEntities` und setzt `#allEntitiesNeedUpdate` auf `true`
(Zeile 932–934), `#allEntities` und `#allEntitiesReversed` fasst es nicht an. Geschrieben werden
die beiden ausschließlich in `traverseLevelOrderBFS()` an `:181` und `:185`, und `destroy()` ruft
die Methode in Zeile 923 nur lesend — also stehen dort nach dem Abbau N zerstörte Entities, jede
mit einer Referenz auf den Kernel über `entity.kernel`.

Nachgemessen statt vermutet, heute an dieser Maschine gegen den gebauten `dist/`-Stand:

- `traverseLevelOrderBFS()` gibt an `:189` immer eine Kopie heraus (`.slice()`). Kein Aufrufer hält
  je eines der beiden Arrays selbst, `length = 0` darauf hat also keinen Nebenwirkungspfad.
- Die beiden Arrays werden nur hinter dem `if (this.#allEntitiesNeedUpdate)`-Zweig gelesen. Ein
  leeres Array plus gesetzte Flagge ist derselbe Zustand wie am Anfang, und der erste Aufruf nach
  dem Abbau baut aus dem leeren `#rootEntities` ein leeres Ergebnis.
- `length = 0` ist die Form des Projekts: `SignalsPath.ts:55`, `Entity.ts:299`,
  `ComponentChanges.ts:125`, `:128` und `:279` machen es alle so. Kein Neuzuweisen auf `[]`.
- `Kernel` ist öffentlich, aber über den Zweig-Export `@spearwolf/shadow-objects/shadow-objects.js`
  (`docs/api-reference.md:2544`), nicht über `index.ts`.

**Restplan.** Unverändert. Die Pakete 6 und 7 liegen in `shae-offscreen-canvas`, 8 in
`ShadowObject.ts`, 9 in einer Spec-Datei der Doku; keines teilt eine Datei oder eine Ursache mit
diesem. Zu verteilen war nichts: die Pakete 1–4 melden alle »Folgen: keine«. Der lose Faden, den
Paket 4 zu Paket 8 notiert hat, betrifft `displayName` und nicht den Kernel. Neu in »Offene
Befunde« steht ein Nebenbefund aus diesem Abgleich (`Kernel.ts:163`, `→ Scope`); er hat eine
andere Ursache als dieses Paket — hier fehlt eine Freigabe, dort ist eine Nachschlagform zu streng
— und geht deshalb nicht in dieses Paket, sondern in die Drain-Runde des Abschlusses.

**Der Entwurf, in einem Absatz.** Zwei Zeilen im selben Block, in dem die Maps geräumt werden, plus
das Messinstrument, ohne das kein Testfall den Unterschied sehen kann. Denn beobachtbar ist der
Befund von außen nicht: die Flagge sorgt schon heute dafür, dass der nächste Aufruf ein leeres
Ergebnis baut, ein Verhaltenstest wäre also vor wie nach dem Fix grün. Was sich ändert, ist allein,
was der Kernel festhält — und das liest ein `@internal`-Getter in der Machart von
`debugHandles` und `debugCleanupCounts` in `ShadowObjectCreationScope.ts:150–180`. Der Weg über
`WeakRef` und einen erzwungenen Garbage Collector ist die Alternative und wird nicht genommen: er
verlangt `--expose-gc` in der vitest-Konfiguration der ganzen Suite und liefert einen wackligen
Test für einen Zweizeiler.

**Was ausdrücklich nicht angefasst wird.**

- **`traverseLevelOrderBFS()` selbst.** Der Nebenbefund darin steht in »Offene Befunde« und gehört
  der Drain-Runde. Die Methode wird in diesem Paket nur gelesen.
- **`#rootContexts`** und der zweite Block von `destroy()` (Zeile 936–941). Der Getter zählt genau
  die vier Speicher, die der Befund benennt, und keinen fünften.
- **`destroyEntity()`, `Entity`, `Kernel.noteEntityTreeChange()`** und jede öffentliche Signatur.
- **`README.md`, `cheat-sheet.md`, `concepts.md`, `guides.md`, `best-practices.md`,
  `getting-started.md`.** Nachgesehen: keine von ihnen sagt etwas darüber, was `Kernel.destroy()`
  hinterlässt. Die Wurzel-`README.md` nennt in Zeile 146 und 150 die Bausteine des Kernels beim
  Namen; ein `@internal`-Getter gehört in keine dieser Aufzählungen, so wenig wie `debugHandles`
  und `debugCleanupCounts` in einer Doku stehen.
- **`src/distContract.files.txt` und `src/distContract.package.json`.** Es kommt keine Datei dazu
  und `dist/package.json` ändert seine Form nicht; der Getter steht nur im Inhalt einer `.d.ts`.
- **Kein e2e-Fall.** Die öffentliche Oberfläche bleibt unverändert, und beobachtbar ist die
  Änderung ausschließlich am Speicherverhalten eines Kernels, den der Aufrufer über seinen Abbau
  hinaus festhält — dafür hat e2e kein Instrument. Der e2e-Lauf bleibt trotzdem im Verify, weil
  `destroy()` auf dem Abbauweg jeder Worker-Umgebung sitzt.

**Vorgehen:**

1. **Das Messinstrument, vor den Tests.** In `Kernel.ts` zwischen `hasEntity()` (endet heute Zeile
   144) und dem Doc-Kommentar von `traverseLevelOrderBFS()` (beginnt 146) — der Getter steht neben
   dem Cache, den er misst. **Der rote Lauf muss an den Erwartungen scheitern, nicht an einem
   `TypeError` auf `debugEntityCounts`**, deshalb steht dieser Schritt vor den Tests:

   ```ts
   /**
    * How many entities the kernel is holding, one count per store, read without waiting on a garbage
    * collector: a test can destroy a kernel and see that it let go of every one of them, rather than
    * inferring it from what a collector happened to do. The two traversal counts are the cached
    * breadth-first order and its reverse.
    *
    * @internal
    */
   get debugEntityCounts(): {entities: number; rootEntities: number; traversal: number; traversalReversed: number} {
     return {
       entities: this.#entities.size,
       rootEntities: this.#rootEntities.size,
       traversal: this.#allEntities.length,
       traversalReversed: this.#allEntitiesReversed.length,
     };
   }
   ```

2. **Regressionstests, und rot sehen.** Beide Fälle liegen in
   `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts` im bestehenden Block
   `describe('kernel teardown', …)` (heute Zeile 4144–4213) und nutzen dessen Helfer `makeRoots`.
   Fahre sie einzeln (`pnpm exec vitest src/in-the-dark/Kernel.spec.ts -t '<name>' --run`) und nimm
   die Ausgabe so in den Report, wie sie kommt.

   2a. Der bestehende Fall `it('holds no entity any more when a destroy callback throws', …)`
   (heute Zeile 4177–4190) bekommt hinter seiner `for`-Schleife eine Erwartung dazu. Der Name des
   Falles trägt sie bereits: ein Array mit drei zerstörten Entities darin *ist* ein Kernel, der
   noch Entities hält.

   ```ts
   expect(kernel.debugEntityCounts, 'the cached traversal order goes too, half-failed teardown or not').toEqual({
     entities: 0,
     rootEntities: 0,
     traversal: 0,
     traversalReversed: 0,
   });
   ```

   Rot heute an `traversal: 3` und `traversalReversed: 3`.

   2b. Ein neuer Fall, unmittelbar hinter 2a und vor
   `it('hands a destroy callback the root contexts it still holds', …)`:

   ```ts
   it('lets go of the cached traversal order along with the entities', () => {
     const kernel = new Kernel(new Registry());
     makeRoots(kernel);

     expect(kernel.traverseLevelOrderBFS(), 'the walk fills the cache the teardown has to release').toHaveLength(3);
     expect(kernel.debugEntityCounts).toEqual({entities: 3, rootEntities: 3, traversal: 3, traversalReversed: 3});

     kernel.destroy();

     expect(kernel.debugEntityCounts, 'a destroyed kernel holds no entity in any of its four stores').toEqual({
       entities: 0,
       rootEntities: 0,
       traversal: 0,
       traversalReversed: 0,
     });

     expect(kernel.traverseLevelOrderBFS(), 'and the walk still answers, with nothing in it').toEqual([]);
   });
   ```

   Rot heute an der Erwartung hinter `kernel.destroy()`, mit `traversal: 3` und
   `traversalReversed: 3`. Die beiden Erwartungen davor und die letzte sind heute grün und bleiben
   es: die erste stellt sicher, dass der Fall überhaupt etwas misst, die letzte hält fest, dass die
   Freigabe den Wanderweg nicht beschädigt.

3. **`Kernel.ts` umbauen.** Eine Stelle, Zeile 931–934, keine öffentliche Signatur ändert sich. Der
   Block wird zu:

   ```ts
   // Whatever a failing callback left half torn down, the kernel holds none of it afterwards.
   this.#entities.clear();
   this.#rootEntities.clear();

   // The flag on its own would only mark the cached order stale -- the two arrays behind it would go
   // on holding every entity of this kernel until some later walk overwrote them, and a caller that
   // keeps the kernel past its teardown never makes that walk happen.
   this.#allEntities.length = 0;
   this.#allEntitiesReversed.length = 0;
   this.#allEntitiesNeedUpdate = true;
   ```

   Der vorhandene Kommentar bleibt Wort für Wort stehen; er sagt bereits die Zusage, die der Code
   jetzt einhält. Die Flaggenzeile bleibt die letzte des Blocks.

4. **Doku.** `packages/shadow-objects/docs/api-reference.md`, Abschnitt `#### \`destroy()\`` (heute
   Zeile 2751–2755): hinter »Destroys the Kernel and all its Entities.« und **vor** der
   `- **Signature:**`-Zeile ein Absatz. In der Tonlage der Datei, kein Rückblick auf den
   Vorzustand. Vorschlag:

   ```
   A destroyed Kernel holds no Entity: the Entity map, the set of root Entities and the cached
   traversal order are all released, whatever a teardown callback along the way threw. A caller
   keeping the Kernel past its `destroy()` — the `kernel` of a `LocalShadowObjectEnv`, for
   instance — keeps an empty one.
   ```

   Der Gedankenstrich ist ein Halbgeviertstrich, wie im Nachbarabsatz an Zeile 2708.

5. **CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, `### Bugfixes` unter `## [Unreleased]`,
   als letzter Eintrag des `**Bugfix (kernel):**`-Laufs — hinter »an `on()` or `once()` subscription
   taken through the creation API …« (heute Zeile 315) und vor dem ersten `**Bugfix (logging):**`
   (heute 316). Wortlaut:

   ```
   - **Bugfix (kernel):** a destroyed Kernel holds no entity at all. `Kernel.destroy()` clears the entity map and the set of root entities and marks the cached traversal order stale, and it releases the two arrays behind that order as well — they used to go on holding every entity of the kernel, each of which holds the kernel itself through `entity.kernel`, until some later `traverseLevelOrderBFS()` happened to overwrite them. A caller keeping the `kernel` of a `LocalShadowObjectEnv` past that environment's `destroy()` was therefore left with an array of N torn-down entities that answered nothing. What the walk hands out is unaffected either side of the teardown: a fresh array each call, and an empty one from a destroyed kernel. Documented in `docs/api-reference.md`. No signature changes.
   ```

   Der Blockquote »**Next release: minor.**« am Kopf von `## [Unreleased]` wird **nicht** angefasst
   und die Zahl darin nicht fortgeschrieben: diese Änderung bricht keinen korrekten Aufruf, und die
   Semver-Einordnung des Laufs macht der Abschluss.

**Zwei Dinge, die im Review kein Befund sind.**

- **Der Vorher-Nachher-Ton des CHANGELOG-Eintrags** (»used to go on holding«) steht bewusst dort.
  Die Konvention »kein Rückblick auf den Vorzustand« gilt dem Code und der Doku; im CHANGELOG
  gewinnt der Ton der Datei, und jeder Nachbareintrag ist so gebaut. Paket 4 hat denselben Punkt
  schon einmal als `klein` zurückbekommen — hier ist er vorab entschieden.
- **`debugEntityCounts` ist keine öffentliche API.** `@internal`, in der Machart der beiden
  vorhandenen Debug-Getter, und deshalb ohne Eintrag in `README.md` oder `docs/`. Dass `Kernel`
  im Gegensatz zu `ShadowObjectCreationScope` exportiert wird, ändert daran nichts: die Doku
  führt die Oberfläche des Kernels als benannte Liste, und ein Messinstrument gehört in keine davon.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (dieselben fünf Kommandos wie in den Paketen 1–4.)
- Commit: `fix(kernel): a destroyed kernel lets go of its cached traversal order`
- Ergebnis: 1 Runde · MEM-007 behoben, `Kernel.destroy()` gibt `#allEntities` und
  `#allEntitiesReversed` mit frei · Regressionstest `lets go of the cached traversal order
  along with the entities` und die neue Erwartung in `holds no entity any more when a destroy
  callback throws` (beide vor dem Fix rot an `traversal: 3` / `traversalReversed: 3`) · der
  Reviewer meldet keinen Qualitätsbefund
- Nebenbefunde: keine neuen aus der Umsetzung — der Befund `Kernel.ts:163` stammt aus dem
  Abgleich in Zug 0 und steht in »Offene Befunde«
- Folgen: keine
- Schnittstellen: keine — `debugEntityCounts` ist ein `@internal`-Getter, keine öffentliche
  Signatur bewegt sich, `dist/` behält seine Form

**MEM-007 · low · packages/shadow-objects/src/in-the-dark/Kernel.ts:918-941 gegenüber :76-78** — Kernel.destroy() hält jede zerstörte Entity in seinem Traversal-Cache fest

destroy() räumt #entities und #rootEntities und setzt #allEntitiesNeedUpdate auf true — die beiden Arrays dahinter, #allEntities und #allEntitiesReversed, bleiben gefüllt. Sie halten je eine Referenz auf jede zerstörte Entity, und jede davon hält über #kernel den Kernel. Der Kommentar daneben sagt »der Kernel hält nichts davon mehr«; das stimmt für zwei der vier Felder. Die Entities sind ausgeräumt, also geht es um Hüllen und nicht um Signale, Kontexte oder Shadow Objects — der Weg, auf dem es zählt, ist ein Konsument, der die öffentlich zugängliche kernel-Eigenschaft eines LocalShadowObjectEnv über dessen destroy() hinaus festhält. Dann bleibt ein Array von N Objekten stehen, das nichts mehr beantwortet.

Empfehlung: Die zwei Arrays im selben Block leeren, in dem die Maps geräumt werden: #allEntities.length = 0 und #allEntitiesReversed.length = 0. Zwei Zeilen, und die Zusage des Kommentars stimmt wieder.

Beleg aus dem Audit: An Kernel.ts:918-941 gelesen (2026-08-27); die Felder werden ausschließlich in traverseLevelOrderBFS() (:155-189) geschrieben, und destroy() ruft die Methode nur lesend.

### [x] 6. Canvas-Element: die gemerkte Größe überlebt das Aushängen nicht
- Findings: BUG-024 (low)
- Ziel: Ein Element, das aus- und bei unveränderter Größe wieder eingehängt wird, schickt der
  Entity, die es dabei bekommt, seine Größen-Properties.
- Bereich: `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
- Hängt ab von: —
- Hash: 1292f03
- Modell: mittlere Stufe (Implementierer) · Reviewer auf der stärksten Stufe, siehe unten
- Effort: low
- Dateien:
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js`
  - `packages/shae-offscreen-canvas/CHANGELOG.md`

**Abgleich (2026-08-27, zweiter Durchgang).** Der erste Abgleich gilt unverändert weiter und wird
hier nicht wiederholt; nachgesehen wurde erneut. BUG-024 steht an denselben Zeilen wie zuvor:
`disconnectedCallback()` auf `:234–240`, die fünf gemerkten Felder auf `:253–257`, der Vergleich,
den sie steuern, auf `:266–272`. `git diff --stat 292714c..HEAD -- packages/shae-offscreen-canvas/`
ist leer — der abgebrochene Anlauf hat nichts hinterlassen, der Arbeitsbaum ist sauber, `HEAD`
steht auf `4d53d49`.

Der Stash `paket-6-abgebrochen` (`stash@{0}`) liegt und lässt sich anwenden. Er enthält drei
Dateien und 34 hinzugefügte Zeilen: den Fix samt Kommentar, Testfall 1 und den CHANGELOG-Punkt —
genau das, was der Reviewer in Zug 3 als konventionssauber und als Behebung von BUG-024
durchgewinkt hat. Was fehlt, ist ausschließlich der zweite Testfall.

Zu verteilen war wieder nichts: die Pakete 1–5 melden alle »Folgen: keine«. Aus den drei Einträgen
in »Offene Befunde« teilt keiner die Ursache dieses Pakets. Der dritte liegt in derselben Datei und
derselben Methode (`:269` gegen `:275`), hat aber eine eigene Ursache — dort vergleicht ein Feld
sich mit einer anderen Größe als der, die es hält, hier fehlt ein Rücksetzen. Er bleibt bei der
Drain-Runde des Abschlusses, die alle Befunde des Laufs nebeneinander sieht.

**Was diese Runde zu tun hat.** Der Fix steht und ist reviewt. Offen ist allein sein Nachweis: ein
Testfall, der rot wird, wenn `#lastPixelRatio` **nicht** mit zurückgesetzt wird. Testfall 1
(320×200 → 320×200) leistet das nicht — sobald Breite und Höhe auf 0 zurückgehen, trägt schon
`0 !== 320` den ODER-Zweig, und die Ratio-Zeile bleibt unbelegt.

**Der Nachweis, heute an dieser Maschine gemessen.** Stash angewandt, der Testfall unten angehängt,
`pnpm exec vitest src/elements/ShaeOffscreenCanvasElement.spec.js --run` im Paket:

| Fassung von `#forgetWhatTheEntityWasTold()` | Ergebnis |
| --- | --- |
| ohne `this.#lastPixelRatio = 0;`, die beiden anderen Zeilen drin | 1 failed, 57 passed · der neue Fall scheitert an `AssertionError: expected undefined to be +0` · **Testfall 1 bleibt grün** |
| vollständig, alle drei Zeilen | 58 passed |

Die zweite Zeile der Tabelle ist der Fix, die erste ist der Beweis. Dass Testfall 1 in der ersten
Zeile grün bleibt, ist der eigentliche Punkt: die beiden Fälle decken verschiedene Zeilen, und erst
zusammen decken sie den ganzen Rumpf. `pnpm exec biome check --error-on-warnings` läuft über beide
geänderten Dateien in dieser Fassung ohne Beanstandung durch.

Warum die Konstruktion isoliert: eine Box, die vor und nach dem Wiedereinhängen 0×0 misst, lässt
beide Größenvergleiche 0 gegen 0 lesen. `#lastPixelZoom` und `#lastFps` stehen nach dem ersten
Frame auf ihren aktuellen Werten und werden nicht zurückgesetzt. Damit ist die Ratio die einzige
der fünf Größen, die den ODER-Zweig noch tragen kann.

**Restplan.** Unverändert, und aus diesem Durchgang kommt nichts hinzu. Paket 7 liegt in
`shadow-objects/ThreeRenderView.js` und hinter einer anderen Ursache, 8 in `ShadowObject.ts` des
Kerns, 9 in einer Spec-Datei der Doku. Keines teilt eine Datei oder eine Ursache mit diesem, keines
hat ein »Hängt ab von«. »Offene Befunde« wächst nicht: dieser Abgleich hat keinen neuen Befund
gefunden.

**Der Entwurf, in einem Absatz.** Was die Entity gesagt bekommen hat, ist Zustand der Verbindung
und nicht des Elements. Drei der fünf gemerkten Felder sind genau dieses Gedächtnis —
`#lastCanvasWidth`, `#lastCanvasHeight`, `#lastPixelRatio` —, und sie werden im
`disconnectedCallback()` zurückgesetzt, dort, wo die übrigen Freigaben schon stehen. Das dritte
Feld geht über die Empfehlung des Audits hinaus, und zwar mit Absicht: mit nur Breite und Höhe
bliebe das Element stumm, wenn es in eine Box zurückkehrt, die dieselben 0×0 misst wie der
Anfangswert — 0 gegen 0 bei beiden, und `#lastPixelRatio` hält bei `pixel-zoom="1"` exakt
`pixelRatio`, trifft also auch zu. `0` ist ein Wert, den `devicePixelRatio` nie annimmt; damit
meldet der erste Frame nach jedem Wiedereinhängen eine Änderung, gleich was die Box zu diesem
Zeitpunkt misst, und die frische Entity bekommt alle vier Properties. Eine Zeile, ein geschlossener
Fall.

Die beiden anderen Felder bleiben stehen, jedes aus eigenem Grund. `#lastFps` hält weiterhin die
wahre aktuelle Bildrate, und alle vier `setProperty()`-Aufrufe stehen bedingungslos im Rumpf des
Zweigs — die frische Entity bekommt `fps` also ohnehin aus ihm; ein Rücksetzen würde nur dafür
sorgen, dass das Element bei jedem Wiedereinhängen einmal »fps changed to 60« ins Log schreibt.
`#lastPixelZoom` merkt sich keine Property, sondern einen Schreibvorgang auf
`canvas.style.imageRendering`; der Canvas-Knoten überlebt das Aushängen samt seinem Inline-Style,
ein Rücksetzen würde einen bereits richtigen Wert erneut schreiben und dazu loggen.

**Was ausdrücklich nicht angefasst wird.**

- **Der Vergleich `#lastPixelRatio !== pixelRatio` gegen die Ablage `pixelRatio / pixelZoom`.**
  Eigener, vorbestehender Befund mit eigener Ursache; er steht in »Offene Befunde« und gehört der
  Drain-Runde. Der Fall `a second frame asks for a sync again while a pixel zoom is set`
  (`ShaeOffscreenCanvasElement.spec.js:576–592`) hält ihn als gemessenes Verhalten fest und bleibt
  grün: dieses Paket fasst allein `disconnectedCallback()` an und ändert am Vergleich keine Zeile.
- **`#displayWidth` und `#displayHeight`.** `#observeDisplaySize()` liest sie bei jedem Connect neu
  aus der Box (`:163–165`); sie sind Messwert, nicht Gedächtnis.
- **`connectedCallback()`, `#observeDisplaySize()`, `#watchPixelRatio()` und der Rumpf von
  `[FrameLoop.OnFrame]()`.** Der Fix sitzt auf dem Weg hinaus, nicht auf dem Weg hinein.
- **Testfall 1 und die 57 übrigen Fälle der Spec.** Sie bleiben Zeile für Zeile, wie sie sind.
- **`docs/01-shadow-objects-api.md` und `README.md` des Pakets.** Nachgesehen: keine der beiden
  sagt etwas über Aus- und Wiedereinhängen. Die öffentliche Oberfläche bewegt sich nicht — kein
  Attribut, keine Methode, keine Property kommt hinzu, keine ändert ihre Bedeutung.
- **`src/distContract.files.txt` und `src/distContract.package.json`.** Es kommt keine Datei hinzu
  und `.npm-pkg` ändert seine Form nicht.
- **Kein e2e-Fall.** `packages/shadow-objects-e2e` lädt `shae-offscreen-canvas` an keiner Stelle —
  die Suite fährt ausschließlich gegen den Kern. Der e2e-Lauf bleibt trotzdem im Verify, als
  Wächter dafür, dass sich im Kern nichts bewegt hat.

**Vorgehen:**

1. **Den vorhandenen Stand aufgreifen.** Im Wurzelverzeichnis des Repositories:

   ```bash
   git stash list          # stash@{0} muss "On main: paket-6-abgebrochen" heißen
   git stash apply stash@{0}
   ```

   `apply`, nicht `pop` — der Stash bleibt liegen, bis der Commit steht. Danach stehen drei
   geänderte Dateien im Arbeitsbaum: der Fix in `ShaeOffscreenCanvasElement.js`, Testfall 1 in
   `ShaeOffscreenCanvasElement.spec.js`, ein Punkt im CHANGELOG. Prüfe mit `git diff --stat`, dass
   es genau diese drei sind und 34 Zeilen hinzukommen.

   Trägt `stash@{0}` einen anderen Namen oder scheitert das Anwenden, baust du die drei Änderungen
   aus Schritt 1a nach; sie stehen dort vollständig. Suche dann nicht nach einem anderen Stash.

1a. **Der Stand, falls der Stash nicht trägt.** In `ShaeOffscreenCanvasElement.js` als letzte Zeile
   von `disconnectedCallback()`, hinter `this.#destroyViewComponentEffect()`:

   ```js
       this.#forgetWhatTheEntityWasTold();
   ```

   und direkt unter den fünf Feldern (`:253–257`), vor `[FrameLoop.OnFrame]()`:

   ```js
   // What the entity was told is state of the connection, not of the element: leaving the document
   // ends the entity behind this element, and the one that takes its place on the way back in
   // starts out knowing nothing. #lastPixelRatio goes back to a value devicePixelRatio never takes,
   // so the first frame after a reconnect reports a change whatever the display box measures by
   // then — the two fields above it would both read 0 for a box that measures nothing.
   #forgetWhatTheEntityWasTold() {
     this.#lastCanvasWidth = 0;
     this.#lastCanvasHeight = 0;
     this.#lastPixelRatio = 0;
   }
   ```

   `#lastFps` und `#lastPixelZoom` stehen bewusst nicht darin; die Gründe stehen oben im Entwurf
   und gehören nicht als Kommentar in den Code.

   In `ShaeOffscreenCanvasElement.spec.js`, angehängt an den Block
   `describe('what a frame carries to the entity', …)` (endet heute mit Zeile 592):

   ```js
   it('tells the entity it gets on the way back in the display size it still holds', () => {
     const el = connectWithSize('reconnect-unchanged', 320, 200);
     drain(el);
     frame(el);
     drain(el);

     el.remove();
     drain(el);

     document.body.appendChild(el);
     drain(el);

     frame(el);

     const props = propsOf(drain(el), el);
     expect(props.get(CanvasWidth)).toBe(320);
     expect(props.get(CanvasHeight)).toBe(200);
     expect(props.get(PixelRatio)).toBe(1);
     expect(props.get(Fps)).toBe(60);
   });
   ```

   In `packages/shae-offscreen-canvas/CHANGELOG.md`, angehängt an die Liste unter
   `## [Unreleased]`:

   ```markdown
   - `<shae-offscreen-canvas>` tells the entity it gets on its way back into the document what it holds. Leaving the document ends the entity behind the element, and the one that takes its place starts out knowing nothing; the element used to measure the display size, pixel ratio and frame rate against what it had told the previous entity and stay quiet when none of them had moved, so the fresh entity waited for the next real layout change before it learned its size — with the frame loop running for it the whole time.
   ```

   Der Blockquote »**Next release: minor.**« am Kopf von `## [Unreleased]` wird **nicht** angefasst:
   die Änderung bricht keinen korrekten Aufruf, und die Semver-Einordnung des Laufs macht der
   Abschluss.

2. **Der zweite Testfall, wörtlich.** Direkt hinter Testfall 1, im selben `describe`-Block. Die
   Helfer `connectWithSize`, `drain`, `frame` und `propsOf` stehen im umgebenden `describe` bereit
   und werden benutzt, nicht neu gebaut. Diese Fassung ist gemessen und läuft durch Biome; übernimm
   sie Zeichen für Zeichen, Kommentar eingeschlossen:

   ```js
   it('tells a fresh entity its pixel ratio when the display box measures nothing on either side of the reconnect', () => {
     // A box that measures nothing before and after leaves both size comparisons reading 0
     // against 0 on the frame after the reconnect. The pixel ratio is the only quantity left that
     // can carry the branch, and it carries it only because the element gives it up on the way
     // out.
     const el = connectWithSize('reconnect-empty-box', 0, 0);
     drain(el);
     frame(el);
     drain(el);

     el.remove();
     drain(el);

     document.body.appendChild(el);
     drain(el);

     frame(el);

     const props = propsOf(drain(el), el);
     expect(props.get(CanvasWidth)).toBe(0);
     expect(props.get(CanvasHeight)).toBe(0);
     expect(props.get(PixelRatio)).toBe(1);
     expect(props.get(Fps)).toBe(60);
   });
   ```

   Die Einrückung im Block oben ist die des Plans; in der Datei liegt der `it(`-Aufruf auf vier
   Leerzeichen, wie seine Nachbarn.

   **Dieser Fall wird nicht umgebaut, nicht umbenannt und nicht gestrichen.** Er ist gegen genau
   eine Zeile des Fixes konstruiert und gemessen. Hältst du ihn für falsch, meldest du das im
   Report, statt ihn zu ändern.

3. **Den roten Lauf nachweisen, und zwar gegen die richtige Fassung.** Nicht gegen einen leeren
   Rumpf — ein Fall, der gegen den leeren Rumpf rot wird, beweist wieder nur, was Testfall 1 schon
   beweist. Nachgewiesen wird gegen `#forgetWhatTheEntityWasTold()` **ohne** die
   `#lastPixelRatio`-Zeile, die beiden anderen Zeilen an ihrem Platz. Genau so gemessen, und so ist
   es auch zu wiederholen — die Sicherungskopie liegt außerhalb des Arbeitsbaums, damit nichts
   davon liegenbleibt:

   ```bash
   cd packages/shae-offscreen-canvas
   EL=src/elements/ShaeOffscreenCanvasElement.js
   SAVE=$(mktemp)
   cp "$EL" "$SAVE"
   grep -c 'this\.#lastPixelRatio = 0;' "$EL"      # muss 1 sein, sonst hier anhalten
   sed -i '/this\.#lastPixelRatio = 0;/d' "$EL"
   pnpm exec vitest src/elements/ShaeOffscreenCanvasElement.spec.js --run   # der rote Lauf
   cp "$SAVE" "$EL"
   pnpm exec vitest src/elements/ShaeOffscreenCanvasElement.spec.js --run   # der grüne Lauf
   git diff --stat "$EL"                            # 12 Zeilen mehr, nichts fehlt
   ```

   Erwartet und gemessen: `Tests  1 failed | 57 passed (58)`, der neue Fall scheitert an
   `AssertionError: expected undefined to be +0`, Testfall 1 bleibt grün. Diese Ausgabe gehört in
   den Report — sie ist der Grund, aus dem es diese Runde gibt.

   Der zweite Lauf, mit der Zeile zurück an ihrem Platz: `Tests  58 passed (58)`. Auch das gehört
   in den Report. Am Ende dieses Schritts steht der vollständige Fix im Arbeitsbaum.

4. **Nichts weiter.** CHANGELOG und Fix kommen aus Schritt 1 und sind fertig; es gibt keinen
   dritten Testfall, keine Doku-Änderung und keine zweite Datei. Fällt dir in den drei Dateien
   etwas auf, das nicht zu diesem Paket gehört, meldest du es als Nebenbefund.

**Drei Dinge, die im Review kein Befund sind.**

- **Der Vorher-Nachher-Ton des CHANGELOG-Eintrags** (»used to measure … and stay quiet«) steht
  bewusst dort. Die Konvention »kein Rückblick auf den Vorzustand« gilt dem Code und der Doku; im
  CHANGELOG gewinnt der Ton der Datei, und jeder Nachbareintrag ist so gebaut. Die Pakete 4 und 5
  haben denselben Punkt schon behandelt.
- **Drei Felder statt der zwei aus der Empfehlung.** Die Begründung steht im Entwurf, beide
  Testfälle halten sie fest. Von der Empfehlung des Audits abzuweichen ist hier kein Alleingang des
  Implementierers, sondern Vorgabe dieses Detailplans.
- **Der aufgegriffene Stash.** Fix, Testfall 1 und CHANGELOG stammen aus dem abgebrochenen Anlauf
  und sind bereits reviewt. Dass sie nicht in dieser Runde entstanden sind, ist kein Befund; ihr
  Inhalt darf es sein.

**Für den Reviewer: die stärkste Stufe.** Nicht wegen der Größe des Diffs — er bleibt bei rund 55
Zeilen —, sondern weil an genau dieser Stelle zwei Review-Runden je einen echten Befund gefunden
haben, den die schwächere Stufe davor durchgelassen hatte. Die Frage, auf die es ankommt, ist
subtil und nicht am Diff ablesbar: Deckt der zweite Testfall wirklich die Ratio-Zeile, und ist der
rote Lauf gegen die richtige Fassung gefahren? Ein Reviewer, der das nur glaubt, hat nichts geprüft.

**Für B: die Dateinamen im Arbeitsverzeichnis.** Der abgebrochene Anlauf hat dort
`paket-6.impl-1.json`, `paket-6.impl-2.json`, `paket-6.review-1.json`, `paket-6.review-2.json`,
`paket-6.diff`, `paket-6.diff-2` und `paket-6.verify.log` liegen lassen. Keine dieser Dateien wird
überschrieben — sie sind die einzige Spur dessen, was schon versucht wurde, und die Schleife zählt
sie. Die Nummern deiner Reportdateien zählen deshalb weiter, wo die alten aufhören: der
Implementierer dieser Runde schreibt nach `paket-6.impl-3.json`, sein Reviewer nach
`paket-6.review-3.json`, der Diff nach `paket-6.diff-3`, das Verify nach `paket-6.verify-2.log`.
Die Rundenzählung im Plan und in deiner Rückgabe beginnt davon unabhängig bei 1 — so hat der
Nutzer es entschieden. Zwei Zählungen, zwei Zwecke: die Dateinamen führen Buch über alle Prozesse,
die dieses Paket je hatte, die Rundenzahl über die Fehlerkette dieses Anlaufs. Bei
`MAX_ROUNDS=5` und zwei bereits liegenden Implementierer-Reports bleiben dir drei; die Regel
»eine Runde, die die Zahl der offenen Befunde nicht senkt, ist die letzte« bindet ohnehin früher.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (dieselben fünf Kommandos wie in den Paketen 1–5.) Log nach
  `<arbeitsdir>/paket-6.verify-2.log`, siehe oben.
- Commit: `fix(canvas): a reconnected element tells its fresh entity the size it holds`
- Nach dem Commit: `git stash drop stash@{0}` — aber nur, wenn `git stash list` diesen Eintrag
  weiterhin als »On main: paket-6-abgebrochen« führt und der Commit steht. Er hat sich damit
  erledigt; bleibt er liegen, überlebt er den Lauf als Rätsel.
- Ergebnis: 1 Runde · BUG-024 behoben — `disconnectedCallback()` gibt über
  `#forgetWhatTheEntityWasTold()` die drei Gedächtnisfelder frei, `#lastPixelRatio` auf einen Wert,
  den `devicePixelRatio` nie annimmt · zwei Regressionstests, beide vor dem Fix rot gesehen:
  `tells the entity it gets on the way back in the display size it still holds` (aus dem
  abgebrochenen ersten Anlauf) und
  `tells a fresh entity its pixel ratio when the display box measures nothing on either side of the reconnect`
  — letzterer gegen die Fassung ohne die `#lastPixelRatio`-Zeile gemessen (1 failed / 57 passed,
  `expected undefined to be +0`, der erste Fall dabei grün) und vom Reviewer eigenhändig
  nachgefahren · Verify exit=0, e2e 654/654 · klein: die beiden Größen-Zeilen in
  `#forgetWhatTheEntityWasTold()` (`ShaeOffscreenCanvasElement.js:266-267`) sind nach Bauart durch
  keinen Test zu decken — die Ratio-Zeile zündet den Zweig immer, und `:285-287` weist alle drei
  Felder darin bedingungslos neu zu; sie tragen den Fall der Box, die vor dem Aushängen eine Größe
  hatte, und bleiben stehen · Stash `paket-6-abgebrochen` nach dem Commit gedroppt
- Nebenbefunde: → Queue (ein Eintrag aus dem Review, `:285-287` gegen `:306`)
- Folgen: keine
- Schnittstellen: keine — `#forgetWhatTheEntityWasTold()` ist privat, kein Attribut, keine
  Methode, keine Property des Elements bewegt sich, `.npm-pkg` behält seine Form

**BUG-024 · low · packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:234-240 gegenüber :253-257** — Die gemerkten Größenfelder des Canvas-Elements überleben ein Aushängen

#lastCanvasWidth und #lastCanvasHeight halten die zuletzt gemeldete Größe fest, damit unveränderte Werte nicht erneut an die Entity gehen. Der disconnectedCallback setzt sie nicht zurück. Ein Element, das aus dem Dokument genommen und bei unveränderter Größe wieder eingehängt wird, bekommt eine frische ViewComponent — und schickt ihr seine Größen-Properties nie, weil der Vergleich gegen die überlebenden Felder gleich ausgeht. Das Shadow Object im Worker steht ohne Größe da, bis irgendetwas das Layout tatsächlich ändert.

Empfehlung: Beide Felder im disconnectedCallback auf ihren Anfangswert zurücksetzen, dort, wo die übrigen Freigaben bereits stehen. Der Testfall ist eine Zeile länger als der Fix: einhängen, aushängen, ohne Größenänderung wieder einhängen, prüfen, dass die Properties ankommen.

Beleg aus dem Audit: Beim Re-Check am 2026-08-27 an der genannten Stelle erneut nachgelesen und bestätigt.

### [x] 7. ThreeRenderView: ein Frame wartet auf den vorigen
- Findings: ASYNC-002 (low)
- Ziel: Zwei Frames laufen nicht mehr gleichzeitig durch denselben `WebGLRenderer` und
  dasselbe `OffscreenCanvas`; bei mehreren Ansichten entscheidet nicht mehr das Rennen,
  welche Kachel ankommt.
- Bereich: `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js` und
  `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js`
- Hängt ab von: —
- Hash: 85eafe6
- Modell: stärkste Stufe
- Effort: high
- Dateien:
  - `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js`
  - `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.spec.js`
  - `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js`
  - `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.spec.js`
  - `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`
  - `packages/shae-offscreen-canvas/CHANGELOG.md`

**Abgleich (2026-08-27).** ASYNC-002 steht unverändert. Die Fundstelle ist heute
`ThreeRenderView.js:70-85` (das Audit nennt 69-84, eine Zeile Versatz): der Listener ist
`async`, hält zwischen `on(entity, OnFrame, Priority.Low, …)` und dem `await` auf
`multiViewRenderer.renderView(view)` keinen Wächter, und `ThreeMultiViewRenderer` hält nach wie
vor genau ein `OffscreenCanvas` und einen `WebGLRenderer` für alle Ansichten
(`ThreeMultiViewRenderer.js:29-35`). Kein Paket dieses Laufs hat eine der beiden Dateien
angefasst — Paket 6 lag in `elements/ShaeOffscreenCanvasElement.js`.

Nachgemessen statt vermutet, und das schärft den Befund gegenüber der Audit-Fassung: die
Ansichten eines Renderers rennen nicht gelegentlich unter Last gegeneinander, sondern **in jedem
Frame**. `ShaeOffscreenCanvas.[FrameLoop.OnFrame]()` (`ShaeOffscreenCanvas.js:153-165`) ruft
`traverseEmit(OnFrame, …)`, und das ist `this.entity.traverse((entity) => emit(entity, event,
data))` (`ShadowObjectBase.js:11-13`) — ein synchroner Durchlauf durch den ganzen Teilbaum. In
`ThreeMultiViewRenderer.renderView()` liegt der einzige Suspendierungspunkt am Ende: `updateSize()`,
`setScissor()`, `setViewport()` und `render()` laufen synchron, erst das zurückgegebene
`createImageBitmap()` ist asynchron. Ansicht A zeichnet also, gibt am `await` ab, und noch in
derselben Task betritt der Traversal Ansicht B, deren `updateSize()` die Zeichenfläche notfalls
neu dimensioniert und deren `render()` sie überschreibt — während A noch aus ihr liest. Bei zwei
Ansichten unterschiedlicher Größe ist das kein Rennen mit seltenem Ausgang, sondern der Normalfall.

Der Zustand ist im Testbestand bereits festgehalten: `ThreeRenderView.spec.js:331-346`
(»Measured, not endorsed«) hält fest, dass zwei Frames denselben Listener betreten.

**Der Entwurf, in einem Absatz.** Zwei Sperren an zwei Stellen, jede für die Sache, die ihr
gehört. In `ThreeRenderView` eine Wiedereintrittssperre je Ansicht: ein Frame, dessen Vorgänger
noch fliegt, fällt aus, statt einen zweiten Render zu starten. In `ThreeMultiViewRenderer` eine
Kette, die die Renderaufträge aller Ansichten nacheinander durch den geteilten Renderer schiebt.
Beide zusammen, weil keine allein reicht: die Sperre je Ansicht kann nichts über die Grenze
zwischen zwei Ansichten zusagen — sie kennt die anderen nicht —, und die Kette allein hätte keine
Obergrenze, weil jeder Frame einen weiteren Auftrag anhängt. Zusammen ergänzen sie sich genau:
die Sperre hält höchstens einen offenen Auftrag je Ansicht, damit ist die Kette durch die Zahl der
Ansichten begrenzt, und die Kette stellt sicher, dass in der Zeichenfläche zu jedem Zeitpunkt
genau eine Ansicht arbeitet. Die Reihenfolge ist damit die der Aufrufe und nicht mehr die des
Zufalls.

**Warum der Bereich um `ThreeMultiViewRenderer.js` wächst.** Der Grobplan nannte als Bereich nur
`ThreeRenderView.js`; sein Ziel — »zwei Frames laufen nicht mehr gleichzeitig durch denselben
`WebGLRenderer` und dasselbe `OffscreenCanvas`« — ist dort aber nicht erreichbar. Der geteilte
Zustand liegt im Renderer, und nur er kann über seine Ansichten hinweg serialisieren. Das ist
keine Abweichung vom freigegebenen Weg, sondern seine Voraussetzung; die Bereichszeile war gegen
die Fundstelle geschrieben, nicht gegen die Ursache. Die Empfehlung des Audits nennt beide Wege
(»ein Flag je Ansicht« oder »eine Warteschlange je multiViewRenderer«) als Alternativen — hier
werden sie kombiniert, weil jeder für sich eine Lücke lässt.

**Zwei Wege, die bewusst nicht genommen werden.** Erstens die Warteschlange ohne die Sperre je
Ansicht: sie erfüllt das Ziel, wächst aber unbegrenzt, sobald der Renderer langsamer ist als die
Bildrate — jeder Frame hängt einen Auftrag an, Latenz und Speicherbedarf steigen ohne Deckel. Das
wäre ein schlimmerer Defekt als der behobene. Zweitens die Sperre je Ansicht ohne die
Warteschlange: sie ist der billigere Eingriff und deckt den Fall der einen Ansicht, lässt aber
genau den Fall offen, den das Ziel beim Namen nennt.

**Vorgehen:**

1. **Regressionstests zuerst, und rot sehen.** Den Befund tragen zwei rote Fälle, einer je Datei;
   ihr roter Lauf gehört in den Report. Drei weitere Fälle sichern die Ränder des Fixes und sind
   heute grün oder aus dem falschen Grund rot — jeder ist unten so ausgewiesen, und jeder gehört
   mit dieser Einordnung in den Report. Fahre die Fälle einzeln
   (`pnpm -F shae-offscreen-canvas exec vitest src/shadow-objects/ThreeRenderView.spec.js -t '<name>' --run`).

   1a. In `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.spec.js` **ersetzt**
   dieser Fall den bestehenden `it('enters the frame callback twice for the same view when
   renderView never resolves', …)` samt dem Kommentarblock darüber (heute Zeile 331-346). Der alte
   Fall hält genau das Verhalten fest, das dieses Paket abstellt; er bleibt nicht daneben stehen.

   ```js
   // The listener is `async`, and eventize hands it the next frame whether or not the previous one
   // has come back. A render is over once its image has been read off the shared canvas, and a
   // frame that arrives before that passes without rendering.
   it('skips a frame for a view whose previous frame has not come back', async () => {
     const {child, renderer, view} = await setupRendering();

     let letTheFirstFrameFinish;
     renderer.renderView.mockReturnValueOnce(
       new Promise((resolve) => {
         letTheFirstFrameFinish = () => resolve(undefined);
       }),
     );

     emit(child, OnFrame, {});
     emit(child, OnFrame, {});
     await settle();

     expect(renderer.renderView).toHaveBeenCalledTimes(1);
     expect(renderer.renderView).toHaveBeenCalledWith(view);

     letTheFirstFrameFinish();
     await settle();

     emit(child, OnFrame, {});
     await settle();

     expect(renderer.renderView, 'the view is free again once its frame came back').toHaveBeenCalledTimes(2);
   });
   ```

   Rot heute an `expect(renderer.renderView).toHaveBeenCalledTimes(1)`: ohne Sperre betreten beide
   Frames den Listener, der Mock zählt zwei Aufrufe.

   Dazu, im selben `describe('rendering a frame', …)`, ein Fall für den `finally`-Zweig:

   ```js
   it('takes the next frame after one whose render failed', async () => {
     const {child, renderer} = await setupRendering();

     renderer.renderView.mockRejectedValueOnce(new Error('the render failed'));

     // the rejection leaves the async listener unhandled; captured so it does not surface as a
     // file-level note with no failing assertion attached
     await captureUncaught(() => emit(child, OnFrame, {}));

     emit(child, OnFrame, {});
     await settle();

     expect(renderer.renderView).toHaveBeenCalledTimes(2);
   });
   ```

   Dieser Fall ist heute grün und bleibt es — er misst nicht gegen den Vorzustand, sondern gegen
   eine Fassung des Fixes **ohne** den `finally`-Block: dort bliebe die Sperre nach einem
   fehlgeschlagenen Render für immer gesetzt und die Ansicht stünde still. Weise ihn im Report so
   aus und nicht als roten Lauf.

   1b. In `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.spec.js`, im
   bestehenden `describe('renderView', …)`, hinter dem letzten Fall:

   ```js
   it('draws one view at a time, in the order the calls arrived', async () => {
     const {mvr} = create();

     const first = mvr.createView(100, 100);
     first.scene = {mark: 'firstScene'};
     first.camera = {mark: 'firstCamera'};

     const second = mvr.createView(200, 200);
     second.scene = {mark: 'secondScene'};
     second.camera = {mark: 'secondCamera'};

     // The read-back of the first frame is held open by hand: this is the window in which the
     // second view would draw over the pixels the first one is still being read from.
     let finishFirstReadBack;
     createImageBitmap.mockReturnValueOnce(
       new Promise((resolve) => {
         finishFirstReadBack = () => resolve({mark: 'firstImage'});
       }),
     );

     const firstRender = mvr.renderView(first);
     const secondRender = mvr.renderView(second);

     await settle();

     expect(mvr.renderer.log.filter((entry) => entry[0] === 'render')).toEqual([
       ['render', first.scene, first.camera],
     ]);

     finishFirstReadBack();
     await settle();

     expect(mvr.renderer.log.filter((entry) => entry[0] === 'render')).toEqual([
       ['render', first.scene, first.camera],
       ['render', second.scene, second.camera],
     ]);

     await expect(firstRender).resolves.toEqual({mark: 'firstImage'});
     await expect(secondRender).resolves.toEqual({mark: 'imageBitmap'});
   });
   ```

   Rot heute an der ersten `toEqual`-Erwartung: beide `render()`-Aufrufe stehen bereits im Log,
   weil der zweite Aufruf synchron durchläuft, während der erste noch am `createImageBitmap`
   hängt.

   Dazu, direkt dahinter, ein Fall für den Fehlerzweig der Kette:

   ```js
   it('carries on with the next view after a render that failed', async () => {
     const {mvr} = create();

     const foreign = {viewId: 99999, width: 100, height: 100, scene: {}, camera: {}, viewport: undefined};

     const mine = mvr.createView(100, 100);
     mine.scene = {mark: 'scene'};
     mine.camera = {mark: 'camera'};

     const failing = mvr.renderView(foreign);
     const following = mvr.renderView(mine);

     await expect(failing).rejects.toThrow('not my view: 99999');
     await expect(following).resolves.toEqual({mark: 'imageBitmap'});
   });
   ```

   Auch dieser ist heute grün und misst gegen eine Fassung des Fixes, die den Ausgang eines
   Renders in der Kette stehen lässt: dann bliebe die Kette abgelehnt und keine Ansicht dahinter
   käme je wieder dran. Ebenfalls so im Report ausweisen.

   Und ein dritter Fall in derselben Datei, für das Fenster, das die Kette selbst aufmacht — eine
   Ansicht, die zwischen Aufruf und Reihe zurückgegeben wird:

   ```js
   it('answers no image for a view destroyed while it waited for its turn', async () => {
     const {mvr} = create();

     const first = mvr.createView(100, 100);
     first.scene = {mark: 'firstScene'};
     first.camera = {mark: 'firstCamera'};

     const second = mvr.createView(100, 100);
     second.scene = {mark: 'secondScene'};
     second.camera = {mark: 'secondCamera'};

     let finishFirstReadBack;
     createImageBitmap.mockReturnValueOnce(
       new Promise((resolve) => {
         finishFirstReadBack = () => resolve({mark: 'firstImage'});
       }),
     );

     mvr.renderView(first);
     const secondRender = mvr.renderView(second);

     // handed back while it is still waiting behind the first view
     mvr.destroyView(second);

     finishFirstReadBack();

     await expect(secondRender).resolves.toBeUndefined();
     expect(mvr.renderer.log.filter((entry) => entry[0] === 'render')).toEqual([
       ['render', first.scene, first.camera],
     ]);
   });
   ```

   Dieser Fall ist heute rot, aber aus dem falschen Grund: ohne Kette gibt es kein Warten, die
   zweite Ansicht ist längst gezeichnet, bevor `destroyView()` überhaupt läuft. Er beweist
   deshalb nichts über den Vorzustand und gehört als solcher in den Report — was er hält, ist
   die Zusage des Wächters aus 2c.

2. **`ThreeMultiViewRenderer.js` umbauen.** Drei Stellen, keine öffentliche Signatur ändert sich.

   2a. Auf Modulebene, unter `const _size2 = new Vector2();`:

   ```js
   /**
    * Ends a link of the render chain: the chain carries the turn, not the outcome. A render that
    * failed must not leave the chain rejected and every view behind it unrendered, and the image of
    * one that succeeded has no business being held until the next call replaces it.
    */
   const forgetOutcome = () => {};
   ```

   2b. Ein weiteres privates Feld neben `#views` und `#lastViewId`:

   ```js
   #renderChain = Promise.resolve();
   ```

   2c. `renderView(view)` (Zeile 45-70) wird zweigeteilt: die Methode nimmt die Reihenfolge, der
   Rumpf zieht in eine private Methode um. Dort bleibt er Zeile für Zeile stehen, bis auf die eine
   Besitzprüfung, die sich teilt — der Absatz unter dem Codeblock sagt, warum:

   ```js
   /**
    * Draws the view and reads the result off the canvas as an `ImageBitmap`.
    *
    * Every view of this renderer draws with the same `WebGLRenderer` onto the same canvas, and the
    * read-back is asynchronous. Drawing the next view while the read of the previous one is still
    * open would draw over the pixels being read, so the calls take their turn: one view is drawn
    * and read out at a time, in the order the calls arrived.
    */
   renderView(view) {
     // Whether the view belongs to this renderer is answered in the caller's turn: a caller handing
     // over a view this renderer never made has made its mistake now, and a view of this renderer
     // that is destroyed while it waits for its turn is not that mistake.
     const wasMine = this.#views.has(view?.viewId);

     const rendered = this.#renderChain.then(() => this.#renderViewNow(view, wasMine));

     this.#renderChain = rendered.then(forgetOutcome, forgetOutcome);

     return rendered;
   }

   async #renderViewNow(view, wasMine) {
     // ... die drei bestehenden Wächter unverändert, samt dem Kommentar
     // "A frame already in flight when the entity's teardown ran ..." über dem ersten ...

     if (wasMine === false) {
       throw new Error(`not my view: ${view.viewId}`);
     }

     // The view was this renderer's when the call came in and is gone by the time its turn arrives:
     // nothing left to draw, and no size of its own left in `updateSize()` to crop against.
     if (this.#views.has(view.viewId) === false) return;

     // ... der übrige Rumpf ab `this.updateSize();`, Zeile für Zeile unverändert
   }
   ```

   **Warum die Besitzfrage sich teilt.** Der bisherige Wurf `not my view: …` beantwortet zwei
   verschiedene Fälle mit derselben Antwort, und das ging gut, solange die Prüfung im selben
   Zug wie der Aufruf lag. Mit der Kette liegt zwischen beiden ein Fenster: eine Ansicht, die der
   Aufrufer eben noch hielt, kann bis zu ihrer Reihe zerstört worden sein — der Renderer-Kontext
   verschwindet, die Entity wird abgebaut, das Token wechselt, und `ThreeRenderView` gibt die
   Ansicht über `destroyView()` zurück. Ohne die Teilung würde dieser ganz gewöhnliche Abbau in
   einem `async`-Listener als unbehandelte Rejection enden, und zwar in jedem Frame, in dem
   überhaupt etwas in der Kette wartete. Also: der Fremdling wirft wie bisher, die eigene
   verschwundene Ansicht kehrt still zurück — dieselbe Antwort, die der Abbau schon vom ersten
   Wächter bekommt. Die Reihenfolge der Wächter bleibt dabei, wie sie ist: `this.renderer == null`
   steht vor beiden, sonst würde `answers no image once its entity is gone` rot, denn `onDestroy`
   leert `#views` mit.

   `onDestroy` selbst bleibt unberührt: ein Auftrag, der nach dem Abbau an die Reihe kommt, findet
   `this.renderer == null` und kehrt mit `undefined` zurück — genau der Fall, den der Kommentar
   über dem ersten Wächter bereits beschreibt.

3. **`ThreeRenderView.js` umbauen.** Eine Stelle, und die bestehende Verschachtelung bleibt
   stehen. Über dem `on(entity, OnFrame, …)` (Zeile 70) die Sperre samt Begründung, im Listener
   eine Handvoll Zeilen dazu:

   ```js
   // The frame listener is async, and eventize hands it the next frame whether or not the previous
   // one has come back. A render is over once its image has been read off the canvas the renderer
   // shares between all its views, so a frame arriving before that is dropped rather than queued:
   // the next one is one tick of the frame loop away, and dropping keeps at most one render per
   // view outstanding, while a queue would grow for as long as the renderer stays behind.
   let frameInFlight = false;

   on(entity, OnFrame, Priority.Low, async () => {
     if (frameInFlight) return;

     const view = renderView.get();

     if (view) {
       const multiViewRenderer = getMultiViewRenderer();

       if (multiViewRenderer && getImageBitmapRenderer()) {
         frameInFlight = true;

         try {
           const image = await multiViewRenderer.renderView(view);

           if (image) {
             getImageBitmapRenderer()?.transferFromImageBitmap(image);
             image.close();
           }
         } finally {
           // a render that failed frees the view for the next frame just as one that succeeded
           frameInFlight = false;
         }
       }
     }
   });
   ```

   **Zwei Folgen dieses Umbaus, die keine Fehler sind und im Review nicht als solche gelten
   dürfen:** Erstens wartet ein Wechsel der Ansicht (`renderView.set(view)`, nachdem der
   Renderer-Kontext zurückkam) mit seinem ersten Frame, bis der Render der vorigen Ansicht
   zurück ist — höchstens ein Frame lang, und die Sperre gilt der Zeichenfläche und nicht der
   Identität der Ansicht. Zweitens verlässt eine Ablehnung aus `renderView()` den Listener
   weiterhin als unbehandelte Rejection — unverändertes Verhalten, und nach 2c bleibt dort ohnehin
   nur noch ein Fall übrig, den `ThreeRenderView` gar nicht auslösen kann: eine Ansicht, die
   dieser Renderer nie ausgegeben hat. Kein `catch` an dieser Stelle; das wäre ein eigenes
   Thema und steht nicht in diesem Paket.

4. **Doku.** `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`, zwei Stellen. Kein
   Rückblick auf den Vorzustand.

   4a. Im Abschnitt `#### RenderView API`, als eigener Absatz **vor** der Zeile »When the entity
   ends, the renderer releases its WebGL context …« (heute Zeile 100):

   ```
   Every view of one renderer draws with the same `WebGLRenderer` onto the same canvas, and reading a drawn frame back off that canvas is asynchronous. `renderView()` takes its turn accordingly: one view is drawn and read out at a time, in the order the calls arrived.
   ```

   4b. Im Abschnitt `### ThreeRenderView` → `#### local entity events`, an den Absatz ab »The
   shadow object listens to the `onFrame` event …« (heute Zeile 133) angehängt:

   ```
   One frame per view is in flight at a time: a frame that arrives while the render of the previous one is still open passes without rendering.
   ```

   Die übrigen Abschnitte der Datei, `README.md` des Pakets und die Doku von
   `@spearwolf/shadow-objects` sind **nicht** zu ändern: nachgesehen, keine von ihnen sagt etwas
   über Frame-Kadenz oder Renderreihenfolge zu. Signaturen bleiben, also bleiben die
   Kontext-Tabellen richtig.

5. **CHANGELOG.** `packages/shae-offscreen-canvas/CHANGELOG.md`, als neuer Aufzählungspunkt am
   Ende der Liste unter `## [Unreleased]` (heute hinter der Zeile über die API-Referenz, Zeile 36),
   in der Machart der Nachbareinträge — ein Absatz je Punkt, ganze Sätze. Inhalt: dass
   `ThreeMultiViewRenderer` eine Ansicht nach der anderen zeichnet, in der Reihenfolge der
   Aufrufe, weil alle Ansichten eines Renderers sich einen `WebGLRenderer` und eine
   Zeichenfläche teilen und das Zurücklesen eines gezeichneten Frames asynchron ist; und dass
   `ThreeRenderView` je Ansicht einen Frame gleichzeitig fliegen lässt, ein Frame darüber hinaus
   also ohne zu zeichnen durchgeht.
   Der Blockquote »**Next release: minor.**« am Kopf von `## [Unreleased]` wird **nicht**
   angefasst: er wiegt die Breaking Changes des Release-Fensters, und diese Änderung bricht keinen
   korrekten Aufruf — `renderView()` behält Signatur und Rückgabewert und antwortet nur später.
   Die Semver-Einordnung des Laufs macht der Abschluss.
   Das Wurzel-`CHANGELOG.md` und das von `@spearwolf/shadow-objects` bleiben unberührt: die
   Änderung liegt vollständig in `packages/shae-offscreen-canvas/src/`.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
- Commit: `fix(canvas): one frame at a time draws through the shared renderer`
- Ergebnis: 2 Runden · ASYNC-002 behoben — `ThreeMultiViewRenderer` schiebt die Renderaufträge
  aller Ansichten nacheinander durch `#renderChain` (`ThreeMultiViewRenderer.js:61-72`, Rumpf in
  `#renderViewNow()`), `ThreeRenderView` hält je Ansicht höchstens einen Frame in Flug
  (`ThreeRenderView.js:75-99`) · Regressionstests `skips a frame for a view whose previous frame
  has not come back` (`ThreeRenderView.spec.js`, vor dem Fix rot an `toHaveBeenCalledTimes(1)`,
  gemessen 2) und `draws one view at a time, in the order the calls arrived`
  (`ThreeMultiViewRenderer.spec.js`, vor dem Fix rot an der ersten `toEqual`-Erwartung) · drei
  Randfälle sichern `finally`, Kettenerholung und den Wächter für eine während des Wartens
  zerstörte Ansicht; der Reviewer hat alle drei durch Mutation als tragend belegt · der Fall
  `enters the frame callback twice for the same view when renderView never resolves` ist
  entfallen, er hielt das abgestellte Verhalten fest · klein: kein Test prüft beide Hälften des
  Fixes zusammen — die Sperre wird gegen einen Mock-Renderer gemessen, die Kette unter Umgehung
  von `ThreeRenderView`, und die zusammengesetzte Zusage (zwei Ansichten an einem Renderer
  überschneiden sich nicht) trägt damit kein Test; ein Fall mit zwei `ThreeRenderView`-Entities
  über einem echten `ThreeMultiViewRenderer` würde sie halten, scheitert aber vermutlich an
  `new WebGLRenderer` ohne WebGL (`ThreeMultiViewRenderer.spec.js:7-12`) · Verify grün auf allen
  fünf Kommandos, `paket-7.verify.log` exit=0 — Biome 219 Dateien, 825 + 379 + 129 passed,
  e2e 654 passed, Coverage 93,07 % Statements (Baseline 92,89 %)
- Nebenbefunde: → Queue (4 Einträge, alle gegen `git show 292714c:` als vorbestehend belegt)
- Folgen: keine. `renderView()` behält Signatur und Rückgabewert, sein einziger Aufrufer im Repo
  ist `ThreeRenderView.js:89` und liegt in diesem Paket; `updateSize()`, `setScissor()`,
  `setViewport()` und `render()` sind unverändert geblieben, und `.npm-pkg` behält seine Form,
  was `distContract` im grünen Build bestätigt
- Schnittstellen: keine Signatur bewegt sich, wohl aber die Zusage von
  `ThreeMultiViewRenderer.renderView(view)` — sie antwortet erst, wenn die Ansicht an der Reihe
  war, und eine Ansicht dieses Renderers, die zwischen Aufruf und Reihe über `destroyView()`
  zurückgegeben wird, antwortet mit `undefined`, statt zu werfen. Der Wurf `not my view: <id>`
  bleibt dem Fremdling vorbehalten, der Ansicht also, die dieser Renderer nie ausgegeben hat

**ASYNC-002 · low · packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js:69-84** — Der Frame-Listener von ThreeRenderView hat keine Wiedereintrittssperre

Der Listener ist als async registriert und wartet mitten drin auf multiViewRenderer.renderView(view), das seinerseits auf createImageBitmap() wartet. eventize kennt kein Zurückhalten des nächsten Ereignisses: der Frame danach betritt denselben Listener, während der erste noch in Flug ist. Beide teilen sich einen WebGLRenderer und ein OffscreenCanvas — updateSize(), setScissor() und setViewport() des späteren Frames laufen gegen die Zeichenfläche, aus der der frühere noch liest. Bei einer Ansicht wird das selten sichtbar, bei mehreren Ansichten unterschiedlicher Größe entscheidet die Reihenfolge, welche Kachel ankommt.

Empfehlung: Ein Flag je Ansicht, das den Frame überspringt, solange der vorige nicht zurück ist — bei einer Bildrate von 90 kostet ein übersprungener Frame nichts. Alternativ die Renderaufträge in eine Warteschlange je multiViewRenderer legen, dann ist die Reihenfolge zugesichert statt zufällig.

Beleg aus dem Audit: Am Code hergeleitet (2026-08-19): kein Guard zwischen on(entity, OnFrame, …) und dem await in renderView(); ThreeMultiViewRenderer hält genau ein Canvas und einen Renderer für alle Ansichten. Beim Re-Check am 2026-08-27 an der genannten Stelle erneut nachgelesen und bestätigt.

### [x] 8. @ShadowObject: eine dekorierte Klasse behält ihren Namen
- Findings: API-004 (medium)
- Ziel: Jede Diagnose des Kernels nennt die Klasse, um die es geht, statt `__ShadowObject`
  — und `.name` antwortet einem Konsumenten so, wie die Dokumentation den Dekorator
  beschreibt.
- Bereich: `packages/shadow-objects/src/in-the-dark/ShadowObject.ts`
- Hängt ab von: —
- Hash: 772a89d
- Modell: mittlere Stufe (Implementierer und Reviewer)
- Effort: low
- Dateien:
  - `packages/shadow-objects/src/in-the-dark/ShadowObject.ts`
  - `packages/shadow-objects/src/in-the-dark/ShadowObject.spec.ts`
  - `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`

**Abgleich (2026-08-27).** API-004 steht unverändert. `ShadowObject.ts` hat dieser Lauf nie
angefasst — `git log 292714c..HEAD -- …/ShadowObject.ts` ist leer, und `git show 292714c:` gibt
die Datei Zeile für Zeile so heraus, wie sie heute dasteht: die Klassenhülle auf `:14–20`, die
Registrierung auf `:22`, die Rückgabe auf `:24`. Der einzige Leser des Namens ist
`getDisplayName()` in `Kernel.ts:48` (`construct.displayName || construct.name`); ein grep über
`in-the-dark/` findet keinen zweiten. Von dort geht der Wert an die Rücknahme eines
gescheiterten Umbaus (`Kernel.ts:765`) und an `new ShadowObjectCreationScope(…)` (`:775`) — und
damit in die Meldungen an `Kernel.ts:862–865` und `:893–908` sowie in
`ShadowObjectCreationScope.ts:247, :250, :258, :312, :386, :485`. Der Blast Radius ist genau
diese eine Funktion.

Zwei Dinge heute an dieser Maschine nachgemessen statt vermutet, gegen esbuild mit
`target: es2022` und `experimentalDecorators: false` — also gegen genau die Dekorator-Absenkung,
die Build und vitest fahren:

- `Object.defineProperty(__ShadowObject, 'name', {value: target.name, configurable: true})`
  direkt hinter der Klassendefinition trägt durch die Absenkung hindurch: `MyShadowObject.name`
  liest danach `"MyShadowObject"`, ein geerbtes `static displayName` kommt unverändert durch,
  und `instanceof` bleibt wahr.
- Der Name erreicht auch den Stack-Frame: eine Ausnahme aus dem Konstruktor zeigt
  `at new MyShadowObject` statt `at new __ShadowObject`. Der Halbsatz der Doku über den
  Stack-Trace darf also stehen bleiben — er wird nur wahr.

Eine Kante bleibt, ebenfalls gemessen: eine Klasse **ohne** eigenen Namen legt danach den leeren
String in `name`. Erreichbar ist das allein über den Handaufruf `ShadowObject({token})(class {})`,
nie über die Dekorator-Syntax. Warum sie keinen Wächter bekommt, steht weiter unten.

**Restplan.** Unverändert. Es bleiben Paket 8 und Paket 9; 9 archiviert eine Spec unter
`docs/superpowers/specs/` und berührt weder Quelltext noch dieses Paket. Zu verteilen war nichts:
die Pakete 1–7 melden alle »Folgen: keine«. Aus den acht Einträgen in »Offene Befunde« teilt
keiner die Ursache dieses Pakets — sie liegen im Canvas-Element, im `ThreeMultiViewRenderer`, in
der Kernel-BFS und in zwei Doku-Stellen. Ein neunter kommt hinzu, siehe dort.

**Der Entwurf, in einem Absatz.** Eine Zeile hinter der Klassendefinition, die den Namen der
dekorierten Klasse an die Hülle weiterreicht. Der eigene `name` eines Klassenausdrucks ist eine
eigene Eigenschaft und verdeckt den geerbten; ein Klassenname ist `configurable`, `defineProperty`
greift also ohne Umweg. Damit fällt die Sonderstellung des Dekorators gegenüber
`shadowObjects.define()` weg: beide Wege melden dieselbe Klasse unter demselben Namen. Keine
Signatur bewegt sich, `instanceof` bleibt, und `displayName` bleibt der Vorrang des Kernels.

**Was ausdrücklich nicht angefasst wird.**

- `getDisplayName()` in `Kernel.ts:48`. Die Vorrangregel `displayName || name` ist richtig und
  bleibt. Kaputt war der Wert, den sie las, nicht die Regel.
- `packages/shadow-objects/README.md`. Der Dekorator kommt darin nicht vor — kein
  `@ShadowObject`, kein `ShadowObject(`, kein Wort über `.name`; nachgesehen über die ganze
  Datei. Die Konvention »öffentliche API ändert sich nie allein« verlangt die Orte, an denen die
  Zusage steht; hier sind es zwei. Ein neu erfundener README-Absatz wäre Rauschen.
- Der Blockquote »**Next release: minor.**« am Kopf von `## [Unreleased]` und die Zahl darin.
  Der Wrapper-Name war nie eine zugesagte Vergleichsgröße — die Doku führt ihn als »worth
  knowing«, nicht als Vertrag —, und die Semver-Einordnung des Laufs macht der Abschluss. Die
  Pakete 1–7 haben es genauso gehalten: je ein Eintrag, kein Griff an den Blockquote.
- `packages/shae-offscreen-canvas`. Seine Shadow Objects erben die bessere Diagnose, ohne dass
  sich dort eine Zeile ändert.

**Vorgehen:**

1. **Regressionstests, und rot sehen.** Alle drei in
   `packages/shadow-objects/src/in-the-dark/ShadowObject.spec.ts`, im vorhandenen
   `describe('@ShadowObject decorator')`. Die vitest-Importzeile (`:2`) braucht `vi` dazu.

   - `keeps the name of the decorated class` — `@ShadowObject({token: 'keepsItsName'})` auf
     `class KeepsItsName {}`, dann `expect(KeepsItsName.name).toBe('KeepsItsName')`. Vor dem Fix
     rot mit `'__ShadowObject'`.
   - `names the decorated class in a kernel diagnostic` — eigene `Registry`, eigener `Kernel`,
     `vi.spyOn(console, 'error').mockImplementation(() => {})`. Dekoriert wird
     `class PlainOnCreateHook { onCreate() {} }` mit `{registry, token: 'plainOnCreateHook'}` —
     eine **gewöhnliche** Methode statt des `[onCreate]`-Symbols, also genau der Fall, den
     `attachShadowObject()` an `Kernel.ts:860–867` meldet. Ausgelöst wird er mit
     `kernel.createEntity(generateUUID(), 'plainOnCreateHook')`. Erwartung: genau ein
     `console.error`, und `expect(consoleError.mock.calls[0]).toContain('PlainOnCreateHook')` —
     dieselbe Machart wie `Kernel.spec.ts:3262 ff.`. Vor dem Fix rot, weil dort
     `'__ShadowObject'` ankommt. Danach `mockRestore()` und `kernel.destroy()`.
   - `lets a static displayName through` — `@ShadowObject({token: 'carriesADisplayName'})` auf
     `class CarriesADisplayName { static displayName = 'a name of its own'; }`, dann
     `expect(CarriesADisplayName.displayName).toBe('a name of its own')`. Das Feld steht auf
     `ShadowObjectConstructor` (`types.ts:202`), es braucht also keinen Cast. **Dieser Fall ist
     vor dem Fix grün** und ist kein Rot-Nachweis, sondern der Wächter gegen die naheliegende
     Fehlreparatur, `displayName` in `name` zu schreiben oder es auf der Hülle zu überschreiben.
     Im Report als solchen benennen.

   Der rote Lauf der ersten beiden Fälle gehört mit seiner Ausgabe in den Report.

2. **`ShadowObject.ts` umbauen.** Eine Stelle, zwischen der schließenden `};` der Klassenhülle
   (`:20`) und der `Registry.get(…)`-Zeile (`:22`). Wortlaut:

   ```ts
   // The wrapper is a class expression, so it owns a `name` that shadows the inherited one.
   // `getDisplayName()` in the Kernel reads that name for every diagnostic about this
   // shadow-object, so the wrapper carries the name of the class it wraps.
   Object.defineProperty(__ShadowObject, 'name', {value: target.name, configurable: true});
   ```

   Nichts weiter in dieser Datei: kein Wächter um `target.name`, keine Änderung an der
   Registrierung, an der Rückgabe oder am `eventize(this)`.

3. **Den Kommentar in `Kernel.spec.ts` ersatzlos entfernen.** Zeilen 3269–3272, die vier
   Kommentarzeilen über `class ThrowsOnDestroyReported`:

   ```
   // Defined through `shadowObjects.define()` rather than `@ShadowObject`, so `construct.name`
   // stays the class's own name -- the decorator wraps its target in a subclass of its own,
   // `class __ShadowObject extends target { … }`, and the displayName below would read that
   // wrapper's name instead.
   ```

   Er begründet eine Ausweichroute, die es nach dem Fix nicht mehr braucht, und seine Aussage ist
   danach schlicht falsch. Umschreiben geht nicht: jede ehrliche Fassung erzählt den Vorzustand,
   und das verbietet der Abschnitt »Konventionen«. Der Testkörper bleibt unverändert — er prüft
   die Konsolen-Meldung, nicht den Registrierungsweg, und `shadowObjects.define()` taugt dafür
   so gut wie jeder andere.

4. **Doku.** `packages/shadow-objects/docs/api-reference.md`, Abschnitt
   ``### The `@ShadowObject` Decorator``, heute Zeile 2893 — der Absatz, der mit »What the
   decorator returns« beginnt. Ganz ersetzen durch:

   ```
   What the decorator returns is a subclass of the decorated class, and that subclass is what goes into the Registry. Instances still pass `instanceof` against your class, and the subclass carries your class's name: `constructor.name` reads it, a Kernel log line about that Shadow Object names it, and a stack frame through the constructor shows it.
   ```

   Eine Zeile, wie im Original. Kein Rückblick auf den Vorzustand, und die Doppelbindestriche der
   Umgebung bleiben der Umgebung — dieser Satz braucht keinen.

5. **CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, `### Bugfixes` unter
   `## [Unreleased]`. Ab dem `**Bugfix (change trail):**`-Eintrag ist die Liste alphabetisch nach
   dem Klammerwort sortiert; `decorator` steht zwischen `context recovery` (heute Zeile 284) und
   dem ersten `elements` (heute 285). Genau dort einfügen. Wortlaut:

   ```
   - **Bugfix (decorator):** a class registered through `@ShadowObject` keeps its own name. The decorator hands the Registry a subclass of the decorated class, and that subclass used to answer `.name` with `__ShadowObject` — the name of its own class expression, which shadows the inherited one — so every Kernel diagnostic that names a Shadow Object read `__ShadowObject` rather than the class it meant: the report about a lifecycle hook written as a plain method, the reports about a failing `[onDestroy]` hook and a rolled-back token change, and every teardown step of a creation scope. A stack frame through the constructor follows the same name. A `static displayName` on the decorated class is unaffected — statics are inherited, and the Kernel still prefers it over the name. Documented in `docs/api-reference.md`. No signature changes.
   ```

**Drei Dinge, die im Review kein Befund sind.**

- **Die namenlose Klasse bekommt keinen Wächter.** `ShadowObject({token})(class {})` legt nach
  dem Fix den leeren String in `name`, statt `__ShadowObject` stehenzulassen. Gemessen, und so
  gewollt: über die Dekorator-Syntax ist der Fall nicht erreichbar — eine Klassendeklaration und
  ein benannter Klassenausdruck tragen immer einen Namen —, und beide Ausgänge sagen dem Leser
  einer Logzeile gleich wenig. Ein `if (target.name)` kaufte eine Ausnahme in der Doku für
  nichts. Die Regel bleibt in einem Satz sagbar: die Hülle trägt den Namen der Klasse, die sie
  umschließt.
- **Der Vorher-Nachher-Ton des CHANGELOG-Eintrags** (»used to answer«) steht bewusst dort. Die
  Konvention »kein Rückblick auf den Vorzustand« gilt dem Code und der Doku; im CHANGELOG gewinnt
  der Ton der Datei, und jeder Nachbareintrag ist so gebaut. Paket 4 hat den Punkt schon einmal
  als `klein` zurückbekommen, Paket 5 hat ihn vorab entschieden — hier gilt dasselbe.
- **`displayName` bleibt undokumentiert.** Dass das Feld in `docs/` und `README.md` nirgends
  vorkommt, ist ein eigener, vorbestehender Befund und steht als solcher in »Offene Befunde«. Es
  ist nicht die Oberfläche des Dekorators, sondern die Namensgebung des Kernels; es hier
  mitzunehmen hieße, einen Nebenbefund in ein Paket zu ziehen, dessen Ursache er nicht teilt.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (dieselben fünf Kommandos wie in den Paketen 1–7.)
- Commit: `fix(kernel): a decorated shadow object keeps the name of its class`
- Ergebnis: 1 Runde · API-004 behoben (`ShadowObject.ts:22-25`, `Object.defineProperty(__ShadowObject,
  'name', …)`) · Regressionstests `keeps the name of the decorated class` und `names the decorated
  class in a kernel diagnostic` in `ShadowObject.spec.ts`, beide vor dem Fix rot (`expected
  '__ShadowObject' to be 'KeepsItsName'` bzw. die Kernel-Meldung ohne `'PlainOnCreateHook'`), dazu
  der vor dem Fix grüne Wächter `lets a static displayName through` · Review ohne Befund · Verify
  grün auf allen fünf Kommandos, e2e 654 passed
- Nebenbefunde: → Queue (1 Eintrag aus Zug 0, `types.ts:200–208`); der Implementierer meldet keinen
  weiteren
- Folgen: keine
- Schnittstellen: keine Signatur bewegt sich. Der Name einer über `@ShadowObject` registrierten
  Klasse ist ab hier ihr eigener statt `__ShadowObject`; wer in einem späteren Paket gegen eine
  Kernel-Meldung testet, findet dort den Klassennamen

**API-004 · medium · packages/shadow-objects/src/in-the-dark/ShadowObject.ts:10-24 gegen Kernel.ts:48** — Der @ShadowObject-Dekorator gibt jeder Klasse denselben Namen

Der Dekorator gibt nicht die dekorierte Klasse zurück, sondern eine Unterklasse davon, und die trägt als Klassenausdruck den Namen __ShadowObject. Ein eigener name ist eine eigene Eigenschaft der Klasse und verdeckt den geerbten, also antwortet jede dekorierte Klasse auf .name mit __ShadowObject. Der Kernel liest genau dort: getDisplayName() in Kernel.ts:48 nimmt construct.displayName || construct.name, und dieser Name geht in den Creation Scope. Damit heißt jede Meldung über ein Shadow Object, das über den Dekorator registriert wurde, __ShadowObject — die Warnung über einen Lebenszyklus-Hook, der als gewöhnliche Methode geschrieben wurde (Kernel.ts:836-852), die Berichte über einen gescheiterten onDestroy-Hook (:875-893), die Rücknahme eines gescheiterten Shadow-Object-Umbaus (:717-756) und jeder Teardown-Schritt des Creation Scope (ShadowObjectCreationScope.ts:320-330). Wer in einer Anwendung mit zwanzig Shadow Objects eine solche Zeile in der Konsole findet, erfährt nicht, welches gemeint ist. Nach außen ist es dieselbe Sache: MyShadowObject.name antwortet einem Konsumenten mit __ShadowObject, obwohl die Dokumentation den Dekorator als durchreichend beschreibt. Nur eine statische displayName-Eigenschaft an der ursprünglichen Klasse rettet den Namen, weil statische Member vererbt werden — und die ist nirgends verlangt.

Empfehlung: Den Namen der dekorierten Klasse an die Hülle weiterreichen: Object.defineProperty(__ShadowObject, 'name', {value: target.name, configurable: true}) direkt nach der Klassendefinition. Eine Zeile, und jede Diagnose des Kernels nennt wieder die Klasse, um die es geht. Ein Testfall, der name und displayName einer dekorierten Klasse prüft, hält es fest.

Beleg aus dem Audit: In node nachgestellt (2026-08-27): class Foo {}; const __ShadowObject = class extends Foo {}; __ShadowObject.name === '__ShadowObject'. Mit static displayName an der Basis kommt der geerbte Wert durch, mit name nicht. ShadowObject.spec.ts prüft die Registrierung, nicht den Namen.

### [x] 9. Die Build-System-Spec wird archiviert
- Findings: DX-025 (medium)
- Ziel: Kein Dokument im Repository gibt sich mehr als laufender Plan aus und beschreibt
  dabei einen Bauweg, den es nicht gibt.
- Bereich: `docs/superpowers/specs/2026-05-09-build-system-renewal-design.md`
- Hängt ab von: —
- Hash: 6b852b6
- Modell: mittlere Stufe
- Effort: low
- Dateien:
  - `docs/superpowers/specs/2026-05-09-build-system-renewal-design.md`
  - `CHANGELOG.md` (Wurzel)

**Abgleich (2026-08-27).** DX-025 steht unverändert; alle sechs Fundstellen heute am Code
nachgesehen. Zeile 3 trägt `> Status: Approved (in-flight). Date: 2026-05-09.`, Zeile 20 führt
**tsdown 0.22** als neuen Library-Build, die Zeilen 40 und 49 listen je eine `tsdown.config.ts` als
`NEW`, Zeile 75 macht den Umstieg auf tsdown zur Bedingung von Phase 3, Zeile 81 nennt das Inlinen
des Workers als erstes Risiko genau dieses Weges. Gebaut wird mit `packages/shadow-objects/build.mjs`
auf esbuild; ein `grep` über das Repository (ohne `node_modules`, `.git`, `audit.html` und diesen
Plan) findet »tsdown« ausschließlich in dieser einen Datei. Die drei Versionsangaben der Tabelle —
turborepo 2.9, Biome 2.4, Playwright 1.59 — stehen gegen die 2.10 / 2.5 / 1.62 aus
`pnpm-workspace.yaml`. Kein Paket dieses Laufs hat die Datei angefasst.

**Zwei Beobachtungen aus dem Abgleich**, die den Zuschnitt nicht ändern und unten als Nicht-Befunde
wiederkehren. Zeile 101 ruft in ihrem Verify-Block eine Datei
`docs/superpowers/specs/dist-snapshot.txt` auf, die `847b154` entfernt hat. Und die Spec ist im
Repository nur noch aus `CHANGELOG.md:576` und `:640` verlinkt — das dort ebenfalls genannte
`Backlog.md` existiert nicht mehr, und weder `AGENTS.md` noch `CLAUDE.md`, `README.md` oder die
`docs/` der beiden Pakete nennen sie. An ihrem Status hängt also kein Index und keine Anleitung.

**Der Entwurf, in einem Absatz.** Der Kopf des Dokuments wird ausgetauscht, der Rumpf nicht. Was
unter dem neuen Kopf steht — die Werkzeugtabelle mit tsdown, der Verzeichnisbaum, die Phasen, die
Verify-Kommandos — ist ab dann ausdrücklich der Plan vom 9. Mai und nicht die Beschreibung eines
Zustands. Genau das ist am 2026-08-27 unter »Entscheidungen« beschlossen: archivieren statt auf
esbuild nachziehen. Die Versionsnummern werden deshalb **nicht** korrigiert und die Tabelle **nicht**
umgeschrieben — eine archivierte Planung, deren Zahlen jemand nachzieht, behauptet wieder etwas über
das Projekt und verfiele beim nächsten Versionssprung erneut. Die Datei wird auch nicht verschoben
und nicht umbenannt: »archiviert« heißt hier der Vermerk, nicht ein neuer Ort; ein Umzug bräche die
beiden Verweise aus `CHANGELOG.md` und brächte nichts.

**Vorgehen:**

1. **Den Kopf austauschen.** In `docs/superpowers/specs/2026-05-09-build-system-renewal-design.md`
   weicht Zeile 3 diesem Block, wörtlich:

   ```markdown
   > **Status: Historical.** Written 2026-05-09, archived 2026-08-27. This document is the design as it was approved, kept as the record of what was planned. It is not a plan anyone is still working through, and nothing in it is maintained: the tool versions, the directory tree and the verification commands below describe that plan, not the repository. `CLAUDE.md` describes the toolchain as it stands and is the source to go by; where the two disagree, `CLAUDE.md` is right.
   >
   > One line of the plan went another way: the library build is `packages/shadow-objects/build.mjs` on esbuild rather than tsdown. The fallback this document proposes for its own first risk — keep an esbuild step for the inlined worker — became the whole build, and tsdown appears in no other file of the repository.
   ```

   Zwei Absätze in einem Blockquote, jeder eine einzige lange Zeile ohne Umbruch: das ist die
   Zeilenführung dieser Datei — der Zielabsatz in Zeile 7 und jedes Risiko ab Zeile 81 stehen
   ebenso. Biome fasst Markdown in diesem Repository nicht an (heute nachgemessen: `biome check`
   auf die Datei meldet »Checked 0 files« und nennt sie ignoriert), es gibt also keine
   Formatvorgabe außer der der Datei selbst.

   Sonst ändert sich in dieser Datei **keine** Zeile: nicht die Überschrift, nicht die
   Werkzeugtabelle, nicht der Verzeichnisbaum, nicht die Phasen, nicht die Risiken, nicht die
   Verify-Kommandos.

2. **CHANGELOG.** In der Wurzel-`CHANGELOG.md` ein neuer datierter Abschnitt, unter dem
   einleitenden Absatz und **über** `## 2026-08-26 — the holdback notes name the mechanism, not a
   version`:

   ```markdown
   ## 2026-08-27 — the build-system design spec is marked as history

   - **`docs/superpowers/specs/2026-05-09-build-system-renewal-design.md`:** carries the status "Historical" with the date it was archived, in place of "Approved (in-flight)". The document designs the library build on tsdown; the build that exists is `packages/shadow-objects/build.mjs` on esbuild, and tsdown appears in no other file of the repository. Its tooling table, its directory tree and its phasing stay as they were written — they are the plan of that day, and the header now says so, names `CLAUDE.md` as the source for the toolchain as it stands, and gives the one line that went another way. A document that announces itself as in-flight and designs a build nobody uses costs its reader more than no document would.
   ```

   Die Zeilenführung folgt den Nachbarabschnitten: ein Aufzählungspunkt, die Datei fett am Anfang,
   der Rest als eine lange Zeile.

3. **Nichts weiter.** `pnpm make:todo` ist nicht fällig — die Datei enthält keinen
   `TODO`-Kommentar; der einzige Treffer auf die Zeichenfolge steht in Zeile 55 als Dateiname
   `makeTODO.mjs` in einem Verzeichnisbaum und wird nicht angefasst. `AGENTS.md`, `CLAUDE.md`,
   `README.md` und die `docs/` beider Pakete bleiben unberührt (nachgesehen mit einem `grep` über
   »superpowers« und »build-system-renewal«: nur die beiden CHANGELOG-Zeilen und die Datei selbst).

**Kein Regressionstest, und das ist kein Versäumnis.** Dieses Paket behebt keinen
Korrektheitsfehler im Code, es ändert eine Statuszeile in einem Dokument. Es gibt kein
Laufzeitverhalten, das rot werden könnte, und das Repository hält an keiner Stelle Tests gegen
Doku-Zeichenketten — ein solcher Test wäre ein Wächter über einer Formulierung und ginge beim
nächsten Satzumbau kaputt, ohne je etwas gefunden zu haben. Die Regel »zuerst rot sehen« greift
hier nicht, und ihr Fehlen ist im Review kein Befund.

**Vier weitere Dinge, die im Review kein Befund sind.**

- **Die Werkzeugtabelle bleibt auf tsdown 0.22, turborepo 2.9, Biome 2.4 und Playwright 1.59.**
  Das ist der Kern der Entscheidung vom 2026-08-27 und keine übersehene Stelle.
- **Zeile 101 ruft weiterhin `dist-snapshot.txt` auf**, eine Datei, die es seit `847b154` nicht
  mehr gibt. Der Kopf sagt, dass die Kommandos unten zum Plan gehören und nicht gepflegt werden;
  damit ist der Aufruf Teil der Aufzeichnung und kein Verweis, dem jemand folgen soll. Ihn einzeln
  zu reparieren hieße, genau die Pflege wieder aufzunehmen, die dieses Paket beendet.
- **Der neue Kopf blickt zurück, und das ist hier erlaubt.** Die Konvention »kein Rückblick auf den
  Vorzustand« misst am Satz, der ohne den Vorzustand unverständlich wird. Der »Vorzustand« ist hier
  nicht der des Repositories, sondern der Inhalt des Dokuments selbst, der zwei Zeilen darunter
  steht: wer die Datei zum ersten Mal öffnet, liest den Kopf und dann den Plan, auf den er sich
  bezieht, und versteht beides ohne jede Vorgeschichte.
- **Der CHANGELOG-Eintrag nennt den Vorher-Wert** (»in place of "Approved (in-flight)"«). Im
  CHANGELOG gewinnt der Ton der Datei, und jeder Nachbareintrag ist so gebaut; in den Paketen 4, 5
  und 8 bereits so entschieden.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci`
  (ohne `pnpm -F shadow-objects-e2e test`, anders als in den Paketen 1–8: dieses Paket ändert zwei
  Markdown-Dateien, von denen keine in einen Build, ein Bundle oder eine Laufzeit eingeht. Die
  e2e-Strecke fährt drei Browser gegen den gebauten Stand und kann von einer Datei unter
  `docs/superpowers/specs/` nicht erreicht werden. Die vier verbleibenden Kommandos belegen, dass
  der Baum grün bleibt, und laufen zum größten Teil aus dem turbo-Cache.)
- Commit: `docs: the build-system design spec stands as a record, not as a plan`
- Ergebnis: 1 Runde · DX-025 behoben · kein Regressionstest, und keiner fällig: das Paket ändert
  eine Statuszeile in einem Dokument, es gibt kein Laufzeitverhalten, das rot werden könnte
  (im Detailplan begründet, vom Reviewer bestätigt) · Reviewer ohne Befund, weder kritisch noch
  wichtig noch klein · Verify grün auf allen vier Kommandos, Coverage 93,07 % Statements
- Nebenbefunde: keine
- Folgen: keine. Die Datei geht in keinen Build und in keine Laufzeit ein, sie bleibt an ihrem
  Ort, und die beiden Verweise aus `CHANGELOG.md:576` und `:640` zeigen unverändert auf sie

**DX-025 · medium · docs/superpowers/specs/2026-05-09-build-system-renewal-design.md:3, :20, :40, :49, :75, :81** — Die Design-Spec der Toolchain steht auf »in-flight« und beschreibt einen Bauweg, den es nicht gibt

Das Dokument trägt in Zeile 3 »Status: Approved (in-flight)« und ist die einzige Spec im Repository. In seiner Werkzeugtabelle steht tsdown 0.22 als neuer Library-Build, dazu turborepo 2.9, Biome 2.4 und Playwright 1.59; der Verzeichnisbaum ab Zeile 40 führt zwei tsdown.config.ts als NEW auf, der Umsetzungsplan macht in Schritt 3 den Umstieg auf tsdown zur Bedingung. Gebaut wird heute mit esbuild aus packages/shadow-objects/build.mjs, und tsdown kommt im gesamten Repository ausschließlich in diesem einen Dokument vor. Die drei Versionsangaben sind ebenfalls überholt (2.10, 2.5, 1.62). Eine Spec, die sich als laufend ausgibt und im entscheidenden Feld etwas anderes sagt als das Projekt, ist teurer als gar keine: wer sie liest, baut gegen einen Plan, der verworfen wurde, und AGENTS.md und CLAUDE.md widersprechen ihr, ohne sie zu erwähnen.

Empfehlung: Den Status auf abgeschlossen setzen und die Werkzeugtabelle auf das bringen, was gebaut wurde — esbuild statt tsdown, mit einem Satz dazu, warum tsdown nicht kam (das Dokument nennt den Grund in Zeile 81 selbst schon als Risiko). Wer die Spec nicht pflegen will, archiviert sie mit einem Datum und einem Verweis auf CLAUDE.md als gültige Quelle; ein Dokument mit dem Vermerk »historisch« richtet keinen Schaden an, eines mit »in-flight« schon.

Beleg aus dem Audit: grep nach tsdown über das Repository (2026-08-27): sechs Treffer, alle in dieser Datei. packages/shadow-objects/package.json ruft node build.mjs; pnpm-workspace.yaml führt turbo 2.10.11, biome 2.5.9, @playwright/test 1.62.

### [x] 10. Kernel-Traversal überlebt eine lose Children-Referenz
- Nebenbefund: `packages/shadow-objects/src/in-the-dark/Kernel.ts:163` (medium, aus Paket 5) — heute `:180`
- Ziel: Ein Abbau wirft nicht mehr nach außen, wenn eine Children-Liste eine Entity nennt, die der
  Kernel nicht mehr hält — `traverseLevelOrderBFS()` lässt einen solchen Knoten fallen, wie
  `getEntityGraphNode()` es an Zeile 224–225 bereits tut.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.ts`
- Hängt ab von: —
- Hash: 79ffa4f
- Modell: mittlere Stufe (Implementierer und Reviewer)
- Effort: low
- Dateien:
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts`
  - `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`

**Abgleich (2026-08-28).** Der Befund steht unverändert, nur um siebzehn Zeilen verschoben: Paket 5
hat den Getter `debugEntityCounts` zwischen `hasEntity()` und den Doc-Kommentar von
`traverseLevelOrderBFS()` gesetzt, aus `:163` wurde `:180`. `git log 292714c..HEAD -- …/Kernel.ts`
nennt genau diesen einen Commit, und `git show 292714c:` zeigt die Zeile im selben Wortlaut. Die
Gegenstelle, an der der Befund die BFS misst, liegt heute auf `:224–225` samt ihrem Kommentar auf
`:232` (»A node the kernel no longer holds drops out of the graph«).

Nachgemessen statt vermutet, heute an dieser Maschine gegen den gebauten `dist/`-Stand. Beide Wege,
die der Befund nennt, kommen dort an:

- `parent.addChild(loose)`, danach `destroyEntity('loose')`. `addChild()` schreibt die Children-Liste
  ohne den Parent-Link, also findet `removeFromParent()` in `destroyEntity()` nichts zu lösen,
  während der `finally`-Block die Entity aus `#entities` und `#rootEntities` nimmt. Danach werfen
  `traverseLevelOrderBFS()`, `upgradeEntities()` und `kernel.destroy()` alle drei mit
  `entity with uuid "loose" not found!`. `getEntityGraph()` antwortet im selben Zustand sauber mit
  dem Rest.
- Ein `removeFromParent()`, das in `destroyEntity()` wirft (Zeile 429–433, dort nur geloggt).
  Instanzmethode überschrieben, wie es der bestehende Fall `an entity teardown whose
  removeFromParent throws` (`Kernel.spec.ts:4774`) bereits tut: dieselben drei Würfe, und diesmal auf
  einem Weg, den kein Aufrufer von Hand einschlagen muss.

**Die eine Frage, die der Fix entscheidet.** Fällt mit dem Knoten auch weg, was unter ihm hängt?
`getEntityGraphNode()` sagt für denselben Baum ja, und die BFS folgt ihm. Der Grund ist gemessen und
nicht ästhetisch: `Entity[onDestroy]()` leert die eigene Children-Liste (`Entity.ts:298–299`), eine
abgebaute Entity hat also gar keine Kinder mehr, die fallen könnten. Der ungünstigste Fall wurde
trotzdem gebaut — eine Kette `a → b → c`, in der beide `removeFromParent()` werfen, danach
`destroyEntity('b')`. Ergebnis: `b.children` ist leer, `c` trägt weiter `hasParent === true` und
steht deshalb in keinem Wurzelsatz. `c` ist damit schon heute aus jeder Wanderung heraus,
`getEntityGraph()` antwortet `["a"]`, und die BFS erreicht `c` weder vor noch nach diesem Fix. Der
Fix nimmt an dieser Stelle nichts weg; er tauscht einen Wurf gegen ein Ergebnis.

**Restplan.** Unverändert. Die Pakete 11 und 12 liegen beide in `shae-offscreen-canvas` und teilen
mit diesem weder Datei noch Ursache. »Offene Befunde« ist leer — die Drain-Runde hat sie geleert —,
und alle neun erledigten Pakete melden »Folgen: keine«; zu verteilen war nichts.

**Was ausdrücklich nicht angefasst wird.**

- **`getEntity()` und `#requireEntry()`.** Sie werfen weiter, und das ist ihre Aufgabe: `findEntity()`
  steht als der nicht werfende Gegenpart daneben und trägt seine Begründung im Doc-Kommentar auf
  `:114–121`. Der Fix wählt an einer Stelle den anderen der beiden, er baut keinen dritten.
- **`Entity.addChild()`, `removeChild()`, `resortChildren()` und `destroyEntity()`.** Dass eine
  Children-Liste ohne Parent-Link geschrieben werden kann, ist zugesagtes Verhalten
  (`docs/api-reference.md:2706`); der Befund liegt bei der Wanderung, die daran zerbricht, nicht bei
  den Schreibern.
- **`ComponentContext.traverseLevelOrderBFS()` und `entity.traverse()`.** Beide laufen über
  Objektlisten und schlagen nichts im Kernel nach; ihnen fehlt der Wurf, den es hier zu entfernen
  gibt.
- **`upgradeEntities()`.** Beide Schleifen tragen bereits `if (!this.hasEntity(entity.uuid)) continue;`
  — sie rechnen mit Entities, die der Kernel zwischendurch losgelassen hat, und brauchen keine zweite
  Vorsichtsmaßnahme.
- **`src/distContract.files.txt` und `src/distContract.package.json`.** Keine Datei kommt dazu, keine
  öffentliche Signatur bewegt sich, `dist/package.json` behält seine Form.
- **`README.md` der Wurzel und die übrigen Dateien in `docs/`.** Nachgesehen mit einem grep über alle
  `*.md`: `traverseLevelOrderBFS` steht außerhalb von `api-reference.md` und den CHANGELOGs nur in
  `README.md:150`, dort als Name in einer Aufzählung der Kernel-Bausteine, ohne eine Zusage über sein
  Verhalten.
- **Kein e2e-Fall.** Die öffentliche Oberfläche bleibt, wie sie ist, und der Auslöser ist eine von
  Hand oder durch einen fehlgeschlagenen Abbau zerbrochene Baumstruktur — dafür hat e2e kein
  Instrument. Der e2e-Lauf bleibt trotzdem im Verify, weil `destroy()` auf dem Abbauweg jeder
  Worker-Umgebung sitzt.

**Vorgehen:**

1. **Regressionstests, und rot sehen.** Beide Fälle liegen in
   `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`. Fahre sie einzeln
   (`pnpm exec vitest src/in-the-dark/Kernel.spec.ts -t '<name>' --run`) und nimm die Ausgabe so in
   den Report, wie sie kommt.

   1a. In `describe('traverseLevelOrderBFS', …)`, hinter dem letzten Fall
   `terminates when a children list points back at an ancestor` (endet heute Zeile 4115) und vor der
   schließenden Klammer des Blocks (4116). Er nutzt den Helfer `makeEntityChain` und `generateUUID`,
   beide bereits im Modul:

   ```ts
   it('drops a child the kernel no longer holds', () => {
     const kernel = new Kernel(new Registry());
     const [rUuid, aUuid, bUuid] = makeEntityChain(kernel);

     const looseUuid = generateUUID();
     kernel.createEntity(looseUuid, 'node');

     // `addChild()` writes a children list without touching the parent link, so the detachment
     // inside `destroyEntity()` finds nothing to cut and the list keeps the name afterwards
     kernel.getEntity(aUuid).addChild(kernel.getEntity(looseUuid));
     kernel.destroyEntity(looseUuid);

     expect(
       kernel.getEntity(aUuid).children.map((e) => e.uuid),
       'the children list still names the entity the kernel let go',
     ).toEqual([bUuid, looseUuid]);

     expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([rUuid, aUuid, bUuid]);

     kernel.destroy();
   });
   ```

   Rot heute an der `traverseLevelOrderBFS()`-Zeile, mit `entity with uuid "<looseUuid>" not found!`.
   Die Erwartung davor ist heute wie nachher grün: sie hält fest, dass der Fall überhaupt etwas misst.

   1b. In `describe('an entity teardown whose removeFromParent throws', …)`, hinter dem bestehenden
   Fall (endet heute Zeile 4820) und vor der schließenden Klammer des Blocks (4821):

   ```ts
   it('leaves the walk over the entity tree, and the kernel teardown behind it, intact', () => {
     const kernel = new Kernel(new Registry());
     const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

     const parentUuid = generateUUID();
     const childUuid = generateUUID();
     kernel.createEntity(parentUuid, 'node');
     kernel.createEntity(childUuid, 'node', parentUuid);

     kernel.getEntity(childUuid).removeFromParent = () => {
       throw new Error('removeFromParent fails');
     };

     kernel.destroyEntity(childUuid);

     expect(kernel.hasEntity(childUuid), 'the kernel let the entity go all the same').toBe(false);
     expect(
       kernel.getEntity(parentUuid).children.map((e) => e.uuid),
       'and the detachment that failed left it in the children list of its parent',
     ).toEqual([childUuid]);

     expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([parentUuid]);
     expect(() => kernel.destroy()).not.toThrow();

     expect(kernel.debugEntityCounts, 'the teardown got all the way through').toEqual({
       entities: 0,
       rootEntities: 0,
       traversal: 0,
       traversalReversed: 0,
     });

     consoleError.mockRestore();
   });
   ```

   Rot heute an derselben Zeile, mit `entity with uuid "<childUuid>" not found!`. Die beiden
   Erwartungen davor sind heute grün und bleiben es; `consoleError` fängt die Meldung der
   fehlgeschlagenen Ablösung ab, die in diesem Fall zweimal kommt — einmal aus `destroyEntity()` und
   einmal aus dem Abbau des Elternteils.

2. **`Kernel.ts` umbauen.** Eine Stelle, Zeile 180. Der Rest des Rumpfes von `traverse` bleibt Wort
   für Wort stehen, keine Signatur bewegt sich:

   ```ts
   // A uuid the kernel no longer holds drops out of the walk, the same way it drops out of
   // `getEntityGraph()`. A children list keeps naming an entity the kernel has let go whenever the
   // detachment that would have cut it does not happen: `addChild()` writes such a list without the
   // parent link `removeFromParent()` follows, and a detachment that throws inside `destroyEntity()`
   // is logged rather than handed on. `destroy()` and `upgradeEntities()` both walk from here, so a
   // lookup that threw would cost every entity behind that one name its own teardown.
   const e = this.findEntity(uuid);
   if (e === undefined) return;
   ```

   Dazu ein Satz an den Doc-Kommentar der Methode (heute `:162–169`), hinter »…so no check along the
   parent chain can cover it.«:

   ```
   * A uuid the kernel no longer holds drops out, and what hangs below it with it -- `getEntityGraph()`
   * walks the same tree by the same rule.
   ```

3. **Doku.** `packages/shadow-objects/docs/api-reference.md`, zwei Stellen.

   3a. Abschnitt `traverseLevelOrderBFS(reverse?)`: ein Absatz hinter »The list is cached and
   rebuilt on the first call…« (heute Zeile 2624) und **vor** der `- **Signature:**`-Zeile (2626), mit
   Leerzeilen davor und danach. Der Halbgeviertstrich und das `--` folgen der Machart der Nachbarn:

   ```
   A uuid the Kernel no longer holds drops out of the walk, and whatever hangs below it drops out with it -- the rule `getEntityGraph()` follows over the same tree. A children list keeps naming an Entity the Kernel has let go whenever the detachment that would have cut it does not happen, and `destroy()` and `upgradeEntities()` both walk from here.
   ```

   3b. Absatz an Zeile 2708. Der erste Satz »Termination is all they carry, though.« wird zu
   »Reachability is another matter, though.« — nach 2 stimmt der alte Wortlaut für die beiden
   Kernel-Wanderungen nicht mehr. Ans Ende desselben Absatzes, hinter »…or take it down yourself
   before the Kernel goes.«, kommt ein Satz:

   ```
   An Entity hanging below a uuid the Kernel no longer holds is out of reach the same way: the two Kernel walks drop that uuid and everything under it.
   ```

   Der Abschnitt `getEntityGraph()` bleibt unverändert — die Zusage steht dort bereits.

4. **CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, `### Bugfixes` unter `## [Unreleased]`, als
   letzter Eintrag des `**Bugfix (kernel):**`-Laufs — hinter »a destroyed Kernel holds no entity at
   all …« (heute Zeile 317) und vor dem ersten `**Bugfix (logging):**` (heute 318). Wortlaut:

   ```
   - **Bugfix (kernel):** a walk over the entity tree drops an entity the Kernel no longer holds instead of ending in `entity with uuid "..." not found!`. A children list keeps naming an entity the Kernel has let go whenever the detachment that would have cut it does not happen: `Entity.addChild()` writes such a list without the parent link `removeFromParent()` follows, and a detachment that throws inside `destroyEntity()` is logged rather than handed on — either way the same call takes the entity out of the Kernel and leaves its name in the list. `Kernel.traverseLevelOrderBFS()` used to look that name up with `getEntity()` and throw, and since `Kernel.destroy()` and `Kernel.upgradeEntities()` both walk from there, one such name took a whole teardown with it: the throw left `destroy()` for its caller, and every entity behind that name in the sweep never heard its `onDestroy`. The walk now follows the rule `getEntityGraph()` already followed over the same tree — the name drops out, and whatever hangs below it drops out with it. Documented in `docs/api-reference.md`. No signature changes.
   ```

   Der Blockquote »**Next release: minor.**« am Kopf von `## [Unreleased]` wird **nicht** angefasst
   und die Zahl darin nicht fortgeschrieben: die Semver-Einordnung des Laufs macht der Abschluss.

**Zwei Dinge, die im Review kein Befund sind.**

- **Der Vorher-Nachher-Ton des CHANGELOG-Eintrags** (»used to look that name up«) steht bewusst dort.
  Die Konvention »kein Rückblick auf den Vorzustand« gilt dem Code und der Doku; im CHANGELOG gewinnt
  der Ton der Datei, und jeder Nachbareintrag ist so gebaut. In den Paketen 4 und 5 kam derselbe Punkt
  schon einmal als `klein` zurück — hier ist er vorab entschieden.
- **Der fallende Teilbaum ist kein Verlust.** Er steht oben unter »Die eine Frage« mit der Messung
  daneben: eine abgebaute Entity hat keine Kinder mehr, und was in dem einen konstruierten Fall unter
  ihr hängen bleibt, war schon vor dieser Änderung aus jeder Wanderung heraus. Ein Reviewer, der ihn
  als Regression meldet, meldet den Zustand von vorher.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (dieselben fünf Kommandos wie in den Paketen 1–8.)
- Commit: `fix(kernel): a walk over the entity tree drops a name the kernel no longer holds`
- Ergebnis: 1 Runde · der Nebenbefund aus Paket 5 behoben · Regressionstests
  `drops a child the kernel no longer holds` und `leaves the walk over the entity tree, and the
  kernel teardown behind it, intact` (beide vor dem Fix rot mit `entity with uuid "…" not found!`) ·
  Review ohne Befund
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine Signatur bewegt sich. `Kernel.traverseLevelOrderBFS()` wirft nicht mehr,
  wenn eine Children-Liste eine Entity nennt, die der Kernel nicht mehr hält — der Name fällt aus
  der Wanderung, und mit ihm, was unter ihm hängt. `Kernel.destroy()` und
  `Kernel.upgradeEntities()` wandern von dort und kommen deshalb auch über einen solchen Baum
  durch

### [x] 11. Die Änderungserkennung im Canvas-Frame stimmt wieder
- Nebenbefunde: `ShaeOffscreenCanvasElement.js:281 gegenüber :287` (low),
  `:285-287 gegenüber :306` (low) — beide aus Paket 6, in der Drain-Runde hierher geschnitten.
  Die Queue nennt den ersten nach der Zählung vor Paket 6 (`:269 gegenüber :275`); es ist
  dieselbe Stelle, um zwölf Zeilen verschoben.
- Ziel: Der Wächter vergleicht `#lastPixelRatio` gegen die Größe, die er auch ablegt, und ein
  Frame ohne View-Komponente verbraucht die Änderungsmeldung nicht, ohne sie zu senden.
- Bereich: `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
- Hängt ab von: —
- Hash: 9ec8d72
- Modell: mittlere Stufe (Implementierer) · Reviewer auf der stärksten Stufe, siehe unten
- Effort: low — der Auftrag unten ist Transkription: jede Zeile, die entsteht, steht wörtlich da.
  Mehr Nachdenken macht daraus keinen besseren Fix, sondern erhöht die Neigung, die Nachbarschaft
  gleich mit zu verbessern, und genau das verbietet Schritt 5.
- Effort (Reviewer): high. Bei diesem Paket ist das Review die eigentliche Arbeit: Der Reviewer
  soll nicht den Diff lesen und nicken, sondern die drei Stufen aus Schritt 1 bis 3 selbst
  nachfahren und urteilen, ob jeder der beiden Testfälle wirklich seinen eigenen Fix deckt. Das
  ist Deliberation und keine Transkription — und es ist genau der Zug, dessen Fehlen dieses Paket
  schon einmal gekostet hat.
- Dateien:
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js`
  - `packages/shae-offscreen-canvas/CHANGELOG.md`

**Abgleich (2026-08-28).** Beide Befunde stehen, und zwar in einem Rumpf, den dieser Lauf nie
angefasst hat: `git show 292714c:packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
liefert `[FrameLoop.OnFrame]()` Zeile für Zeile so, wie er heute dasteht. Paket 6 hat allein
`disconnectedCallback()` erweitert und `#forgetWhatTheEntityWasTold()` samt Kommentar eingefügt und
damit alles darunter um zwölf Zeilen verschoben. Heutige Fundstellen: der Vergleich
`this.#lastPixelRatio !== pixelRatio` auf `:281`, die Ablage `this.#lastPixelRatio = pixelRatio / pixelZoom`
auf `:287`, die drei Fortschreibungen auf `:285–287`, die Zustellung unter `if (this.viewComponent)`
auf `:306–312`.

Zu verteilen war nichts. Alle zehn erledigten Pakete melden »Folgen: keine«, und »Offene Befunde«
steht seit der Drain-Runde vollständig auf `[x]`. Paket 12 liegt in einer anderen Datei und hinter
einer anderen Ursache; kein »Hängt ab von« bindet die beiden aneinander.

Nachgesehen statt vermutet: Die Datei hat außerhalb ihres eigenen Pakets keine Leser — ein `grep`
über `shadow-objects-testing` und `shadow-objects-e2e` findet weder das Element noch das Paket.
`packages/shae-offscreen-canvas/README.md:43` beschreibt `pixel-zoom` bereits zutreffend
(»divides the pixel ratio the element reports«), und `docs/01-shadow-objects-api.md` spricht über
die Properties der Shadow Objects, nicht über die Änderungserkennung des Elements. Die Werte, die
bei der Entity ankommen, ändert dieses Paket nicht — nur, wie oft sie ankommen und ob sie überhaupt
ankommen. Die Spec des Elements fährt heute mit 58 grünen Fällen.

**Abgleich, zweiter Anlauf (2026-08-28).** Der Abgleich darüber ist heute erneut nachgemessen und
steht Zeile für Zeile: `HEAD` ist unverändert `79ffa4f`, der Arbeitsbaum sauber, der Vergleich
`this.#lastPixelRatio !== pixelRatio` liegt auf `:281`, die Ablage `pixelRatio / pixelZoom` auf
`:287`, die Zustellung unter `if (this.viewComponent)` auf `:306–312`. Das Rücksetzen hat den
Rumpf exakt dorthin zurückgebracht, wo der erste Zug 0 ihn gelesen hat. Nachgefahren statt
angenommen: `pnpm exec vitest src/elements/ShaeOffscreenCanvasElement.spec.js --run` antwortet im
Paketverzeichnis mit `Tests  58 passed (58)` — die drei Zwischenstände, die Schritt 1 bis 3
erwarten, rechnen von dieser Zahl aus. Zu verteilen ist weiterhin nichts: »Offene Befunde« steht
vollständig auf `[x]`, und alle zehn erledigten Pakete melden »Folgen: keine«. Am Detailplan
ändert sich nichts, am Restplan auch nicht: Paket 12 liegt in einer anderen Datei hinter einer
anderen Ursache, kein `Hängt ab von` bindet die beiden, und danach ist der Lauf beim Abschluss.

**Der verworfene Stand wird nicht aufgegriffen.**
`0001-fix-canvas-a-frame-reports-a-change-once-and-only-wh.patch` im Arbeitsverzeichnis ist eine
wortgetreue Ausführung der Schritte 1 bis 4 und enthält keine Zeile, die nicht unten stünde. Er
bleibt liegen; der Implementierer schreibt aus dem Detailplan und bekommt weder den Pfad noch den
Inhalt. Ihn anzuwenden hieße, denselben Code ein zweites Mal ohne fremde Feder zu setzen und dem
Reviewer seine eigene Quelle vorzulegen — genau dagegen steht der Nutzerentscheid vom 2026-08-28
im Kopf dieses Plans. Sein Wert liegt woanders und ist bereits eingelöst: Er belegt, dass die
Schritte mechanisch aufgehen und der volle Verify darüber grün lief.

**Drei Dateien im Arbeitsverzeichnis tragen jetzt das Suffix `.verworfen-ab74925`** —
`paket-11.verify.log`, `paket-11.diff` und `paket-11.B.json` des ersten Anlaufs. Der alte
Verify-Log endete auf `exit=0` und lag unter genau dem Pfad, den dieses Paket wieder benutzt; ein
Beleg, der dasteht, bevor ihn jemand erzeugt hat, ist keiner.

**Der Entwurf, in zwei Absätzen.** Fünf Felder merken sich, wogegen der nächste Frame vergleicht.
Vier davon halten genau die Größe, gegen die sie verglichen werden; `#lastPixelRatio` hält den
Quotienten und wird gegen den ungeteilten Wert verglichen. Also hält es künftig ebenfalls die
gemessene Größe, und die Teilung wandert dorthin, wo sie hingehört: an die Zustellung, die als
Einzige den Zoom-Faktor braucht. Der Kommentar über `#forgetWhatTheEntityWasTold()` (»goes back to
a value devicePixelRatio never takes«) beschreibt danach genau das Feld, das er meint. Der Gegenweg
— den Vergleich auf `pixelRatio / pixelZoom` ziehen und die Ablage lassen — käme rechnerisch aufs
Gleiche heraus, macht aber den Wächter über `#lastPixelZoom` daneben zur Doppelung und lässt ein
Feld zurück, das eine Größe hält, die das Element an keiner Stelle misst.

Der zweite Befund ist Buchführung: der Zweig schreibt die Änderung ab, die Zustellung steht unter
einem Wächter **darin**. Ein Frame ohne View-Komponente verbraucht die Meldung also, ohne sie zu
senden — und das trifft alle fünf Felder, nicht nur die drei aus dem Befund: `#lastFps` und
`#lastPixelZoom` werden im selben Zweig fortgeschrieben. Deshalb steht der Wächter künftig vor dem
ganzen Rumpf und nicht um die drei Zuweisungen: ein Frame, der nichts zustellen kann, schreibt gar
nichts auf, und die Meldung bleibt für den ersten Frame liegen, der eine View-Komponente hat. Der
Preis ist genannt und gewollt — das Info-Log für `fps` und `pixelZoom` und der Schreibvorgang auf
`canvas.style.imageRendering` warten dann ebenfalls auf diesen Frame. Das ist die kohärentere Lage:
solange keine Entity dasteht, zeichnet auch niemand in diesen Canvas. Die Alternative wäre ein
Zweig, der ohne View-Komponente in jedem Frame dieselbe Zeile loggt und denselben Stil neu schreibt.

**Was ausdrücklich nicht angefasst wird.**

- **`#forgetWhatTheEntityWasTold()` und `disconnectedCallback()`.** Paket 6, zwei Testfälle hängen
  daran. Sie bleiben grün: `#lastPixelRatio` geht weiter auf `0` zurück, und `0` ist auch als
  gemessene Ratio ein Wert, den `devicePixelRatio` nie annimmt.
- **Die vier übrigen Vergleiche und ihre Felder.** Sie stimmen bereits.
- **Die 58 vorhandenen Fälle der Spec**, mit genau einer Ausnahme: der Fall
  `a second frame asks for a sync again while a pixel zoom is set` hält den ersten Befund als
  gemessenes Verhalten fest und wird in Schritt 1 umgedreht. Alle anderen bleiben Zeile für Zeile,
  wie sie sind — namentlich die beiden Reconnect-Fälle aus Paket 6 und
  `a pixel zoom divides the pixel ratio and switches the display to pixelated`. Der Letzte hält
  fest, dass bei der Entity `0.25` ankommt, und ist damit der Beleg, dass die Teilung umgezogen und
  nicht verschwunden ist.
- **`docs/01-shadow-objects-api.md` und `README.md` des Pakets.** Nachgesehen, siehe Abgleich.
  Keine Signatur, kein Attribut, keine Property bewegt sich.
- **`src/distContract.files.txt` und `src/distContract.package.json`.** Es kommt keine Datei hinzu,
  `.npm-pkg` behält seine Form.
- **Der Blockquote »Next release: minor.«** am Kopf von `## [Unreleased]`. Die Änderung bricht
  keinen korrekten Aufruf; die Semver-Einordnung des Laufs macht der Abschluss.
- **Kein e2e-Fall.** `packages/shadow-objects-e2e` lädt `shae-offscreen-canvas` an keiner Stelle.
  Der e2e-Lauf bleibt trotzdem im Verify, als Wächter dafür, dass sich im Kern nichts bewegt hat.
- **Keine `TODO`-Zeile**, also kein `pnpm make:todo`.

**Vorgehen:**

1. **Beide Testfälle zuerst, und rot sehen.** Nur die Spec-Datei anfassen, die Quelle bleibt in
   diesem Schritt unberührt. Die Helfer `connectWithSize`, `drain`, `frame` und `propsOf` stehen
   bereit und werden benutzt, nicht neu gebaut — sie liegen im äußeren
   `describe('ShaeOffscreenCanvasElement', …)` auf den Zeilen 127, 202, 204 und 212, also eine
   Ebene über dem Block, in den die beiden Fälle kommen, und nicht in ihm.

   1a. Der Fall `a second frame asks for a sync again while a pixel zoom is set` (heute
   `:576–592`) wird zu — Name, Kommentar und Erwartung, der Rumpf davor bleibt:

   ```js
   it('a second frame with a pixel zoom set asks for no sync', () => {
     const el = connectWithSize('frame-carries', 320, 200);
     el.setAttribute('pixel-zoom', '4');
     drain(el);
     frame(el);

     const syncSpy = vi.spyOn(el.shadowEntity, 'syncShadowObjects');
     frame(el);

     // The pixel zoom belongs to the value the entity is told and to nothing else. The comparison
     // reads #lastPixelRatio against the ratio the element measured, which is what that field
     // holds, so a zoom above one makes no frame look like a change of its own.
     expect(syncSpy).not.toHaveBeenCalled();
   });
   ```

   1b. Ein neuer Fall, angehängt an denselben `describe`-Block, hinter
   `tells a fresh entity its pixel ratio when the display box measures nothing on either side of the reconnect`:

   ```js
   it('keeps a change a frame without a view component could not deliver', () => {
     const el = connectWithSize('frame-without-view-component', 320, 200);
     const viewComponent = el.viewComponent;
     drain(el);

     // The entity of a connected element can stand without a view component: applying a component
     // context is allowed to fail, and #applyComponentContext logs rather than throws. A frame in
     // that state has nowhere to hand anything to.
     el.shadowEntity.viewComponent$.set(undefined);
     frame(el);

     el.shadowEntity.viewComponent$.set(viewComponent);
     frame(el);

     const props = propsOf(drain(el), el);
     expect(props.get(CanvasWidth)).toBe(320);
     expect(props.get(CanvasHeight)).toBe(200);
     expect(props.get(PixelRatio)).toBe(1);
     expect(props.get(Fps)).toBe(60);
   });
   ```

   Die Einrückung oben ist die des Plans; in der Datei liegen beide `it(`-Aufrufe auf vier
   Leerzeichen, wie ihre Nachbarn.

   Dann, im Paketverzeichnis:

   ```bash
   cd packages/shae-offscreen-canvas
   pnpm exec vitest src/elements/ShaeOffscreenCanvasElement.spec.js --run
   ```

   Erwartet: `Tests  2 failed | 57 passed (59)`. 1a scheitert daran, dass `syncShadowObjects`
   einmal gerufen wurde, 1b an `props.get(CanvasWidth)` — `undefined` statt `320`. Diese Ausgabe
   gehört in den Report.

2. **Den ersten Befund beheben, allein.** Zwei Zeilen in `[FrameLoop.OnFrame]()`:

   ```js
   this.#lastPixelRatio = pixelRatio;                               // war: pixelRatio / pixelZoom
   ```

   ```js
   this.viewComponent.setProperty(PixelRatio, pixelRatio / pixelZoom);   // war: this.#lastPixelRatio
   ```

   Denselben Lauf noch einmal. Erwartet: `Tests  1 failed | 58 passed (59)` — 1a ist grün, 1b
   scheitert unverändert. **Diese Zwischenmessung ist der Punkt des Schritts** und gehört in den
   Report: sie zeigt, dass die beiden Fälle verschiedene Zeilen decken und keiner von beiden vom
   anderen Fix grün wird.

3. **Den zweiten Befund beheben.** Der Wächter zieht vor den Rumpf, und das Ziel der Zustellung
   steht danach in einer lokalen Variablen — der Vergleich liest ab hier ausschließlich gemessene
   Größen, die Zustellung schickt ausschließlich lokale. Die Methode lautet danach vollständig:

   ```js
   [FrameLoop.OnFrame]() {
     // A frame with no view component has nowhere to hand anything to. It leaves the fields below
     // untouched and the change pending for the first frame that has one -- writing them down here
     // would use up the report without sending it, and the entity that arrives afterwards would
     // never hear the size, the ratio or the frame rate this element already holds.
     const viewComponent = this.viewComponent;
     if (!viewComponent) return;

     const width = this.#displayWidth;
     const height = this.#displayHeight;
     const pixelRatio = this.#pixelRatio;
     const pixelZoom = this.#pixelZoom;
     const fps = this.#fps;

     if (
       this.#lastCanvasWidth !== width ||
       this.#lastCanvasHeight !== height ||
       this.#lastPixelRatio !== pixelRatio ||
       this.#lastPixelZoom !== pixelZoom ||
       this.#lastFps !== fps
     ) {
       this.#lastCanvasWidth = width;
       this.#lastCanvasHeight = height;
       this.#lastPixelRatio = pixelRatio;

       if (fps !== this.#lastFps) {
         if (this.logger.isInfo) {
           this.logger.info('fps changed to', fps);
         }
         this.#lastFps = fps;
       }

       if (pixelZoom !== this.#lastPixelZoom) {
         if (this.logger.isInfo) {
           this.logger.info('pixelZoom changed to', pixelZoom);
         }

         this.#lastPixelZoom = pixelZoom;

         this.canvas.style.imageRendering = `var(--display-image-rendering, ${pixelZoom > 1 ? 'pixelated' : 'auto'})`;
       }

       // Every field above holds the quantity the element measured, which is what the comparison
       // reads it against. The zoom belongs to the value the entity gets and to nothing else: it
       // divides the ratio, so one canvas pixel covers that many display pixels.
       viewComponent.setProperty(CanvasWidth, width);
       viewComponent.setProperty(CanvasHeight, height);
       viewComponent.setProperty(PixelRatio, pixelRatio / pixelZoom);
       viewComponent.setProperty(Fps, fps);
       this.shadowEntity.syncShadowObjects();
     }
   }
   ```

   Denselben Lauf ein drittes Mal. Erwartet: `Tests  59 passed (59)`. Auch das gehört in den
   Report.

4. **CHANGELOG.** `packages/shae-offscreen-canvas/CHANGELOG.md`, zwei Punkte, angehängt an die
   Liste unter `## [Unreleased]`:

   ```markdown
   - `<shae-offscreen-canvas>` reports a display change once. `[FrameLoop.OnFrame]()` compares the pixel ratio against the ratio it recorded and divides by `pixel-zoom` only where the value goes to the entity; at a `pixel-zoom` above `1` the recorded value used to sit below what the comparison expected, so every single frame reported a ratio change, wrote four properties and asked for a sync — sixty of them a second, none of them due. The values that reached the entity were right throughout.
   - A frame of `<shae-offscreen-canvas>` that has no view component to deliver to leaves the change pending instead of using it up. The element writes down the display size, pixel ratio, frame rate and pixel zoom of a frame only where it also hands them over, so an entity that arrives a frame later still learns what the element holds.
   ```

   Der Vorher-Nachher-Ton des ersten Punktes steht dort bewusst: Die Konvention »kein Rückblick auf
   den Vorzustand« gilt dem Code und der Doku, im CHANGELOG gewinnt der Ton der Datei, und jeder
   Nachbareintrag ist so gebaut. Die Pakete 4, 5 und 6 haben denselben Punkt bereits behandelt.

5. **Nichts weiter.** Es gibt keinen dritten Testfall, keine Doku-Änderung und keine vierte Datei.
   Fällt dir in den drei Dateien etwas auf, das nicht zu diesem Paket gehört, meldest du es als
   Nebenbefund, statt es zu beheben.

**Drei Dinge, die im Review kein Befund sind.**

- **Das umgedrehte Erwartungsbild in 1a.** Der Fall hielt bisher einen Defekt als »measured
  behavior, not endorsed behavior« fest; ihn stehen zu lassen hieße, den Befund dieses Pakets
  festzuschreiben. Das Umdrehen ist Vorgabe dieses Detailplans.
- **Die vier `setProperty()`-Aufrufe auf lokalen Größen statt auf den Feldern.** Nach dem Fix hält
  `#lastPixelRatio` nicht mehr, was gesendet wird. Drei Felder und einen gerechneten Ausdruck zu
  mischen wäre genau die Ungleichheit, die diesen Befund erzeugt hat.
- **Die drei Läufe der Spec-Datei.** Sie sind der Nachweis, nicht Zeremonie, und ihre Ausgaben
  gehören in den Report.

**Für den Reviewer: die stärkste Stufe.** Nicht wegen der Größe des Diffs — er bleibt bei rund 60
Zeilen —, sondern wegen der Frage, die zwei Fixes in einem Paket aufwerfen und die am Diff nicht
abzulesen ist: Deckt jeder der beiden Fälle wirklich seinen eigenen Fix, oder trägt einer den
anderen? Die Zwischenmessung aus Schritt 2 beantwortet sie. Ein Reviewer, der sie nur glaubt, hat
nichts geprüft; fahre die drei Stufen selbst nach. Dieselbe Datei und dieselbe Methode haben in
Paket 6 zwei Review-Runden gekostet, weil ein roter Lauf gegen die falsche Fassung gemessen war.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (dieselben fünf Kommandos wie in den Paketen 1–10.) Log nach
  `/tmp/claude-1000/-home-spw-spaceland-shadow-objects/d3805971-7e40-4804-8e9a-a4651ef9a355/scratchpad/paket-11.verify.log`.
  Die Datei ist neu zu schreiben, nicht anzuhängen — was unter diesem Namen aus dem ersten Anlauf
  lag, ist beiseitegelegt.
- Commit: `fix(canvas): a frame reports a change once, and only when it can deliver it`
- Ergebnis: 1 Runde · beide Nebenbefunde behoben — der Wächter vergleicht `#lastPixelRatio`
  gegen die gemessene Ratio (`ShaeOffscreenCanvasElement.js:288` gegen `:294`), die Teilung durch
  den Zoom steht allein an der Zustellung `:318`; der View-Komponenten-Wächter steht auf `:276-277`
  vor dem ganzen Rumpf · Regressionstests `a second frame with a pixel zoom set asks for no sync`
  (umgedreht) und `keeps a change a frame without a view component could not deliver` (neu), beide
  vor dem Fix rot: 2 failed | 57 passed (59) · Zwischenmessung nach dem ersten Fix 1 failed |
  58 passed (59), vom Reviewer selbst nachgefahren samt Gegenprobe (nur zweiter Fix → 1a rot):
  jeder Fall deckt seinen eigenen Fix, keiner trägt den anderen · Verify grün auf allen fünf
  Kommandos (e2e 654/654) · vier kleine Befunde des Reviewers, keiner löst eine Runde aus:
  Fall 1b belegt den breiten Wächter nur für drei der fünf Gedächtnisfelder (ein enger Wächter
  ließe die 59 Fälle ebenfalls grün) · `spec.js:642` schreibt »component context« klein statt
  `ComponentContext` · der CHANGELOG-Punkt nennt nicht, dass `canvas.style.imageRendering` und die
  beiden Info-Logs jetzt ebenfalls auf den ersten Frame mit View-Komponente warten · der neue
  Kommentar auf `:273` setzt `--` statt des `—`, das die Nachbarkommentare der Datei verwenden
  (wörtlich so im Detailplan vorgegeben)
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine Signatur bewegt sich. `[FrameLoop.OnFrame]()` ist eine private
  Symbol-Methode, `pixel-zoom` behält seine Bedeutung, und bei der Entity kommt weiterhin
  `pixelRatio / pixelZoom` an — geändert hat sich, wie oft und ob überhaupt.

**Nebenbefund 1 · geschätzt low · packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:281 gegenüber :287** — der Wächter vergleicht sich mit einer anderen Größe als der, die er ablegt

`[FrameLoop.OnFrame]()` vergleicht `#lastPixelRatio` gegen das ungeteilte `pixelRatio`, legt in
dasselbe Feld aber `pixelRatio / pixelZoom` ab. Bei `pixel-zoom="1"` fallen beide Größen zusammen
und der Wächter hält; ab `2` trifft der Vergleich nie wieder zu, und jeder Frame meldet eine
Ratio-Änderung, schreibt vier Properties und ruft `syncShadowObjects()` — sechzig Synchronisationen
je Sekunde, von denen keine fällig ist. Die gesendeten Werte stimmen dabei; kaputt ist allein die
Änderungserkennung. Festgehalten als gemessenes Verhalten von
`ShaeOffscreenCanvasElement.spec.js:576-592` (»a second frame asks for a sync again while a pixel
zoom is set«), dessen eigener Kommentar »Measured behavior, not endorsed behavior« sagt.
Vorbestehend: bei `git show 292714c:` steht der Vergleich unverändert. Aus Paket 6; die Scope-Regel
greift unabhängig von der Severity, Kategorie BUG.

**Nebenbefund 2 · geschätzt low · packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:285-287 gegenüber :306** — ein Frame ohne View-Komponente verbraucht die Änderungsmeldung, ohne sie zu senden

`[FrameLoop.OnFrame]()` schreibt die drei Gedächtnisfelder (`#lastCanvasWidth`, `#lastCanvasHeight`,
`#lastPixelRatio`) im Rumpf des Änderungszweigs fort, zugestellt werden die Properties darin aber
nur unter `if (this.viewComponent)`. Ein Frame, der ohne View-Komponente durch den Zweig läuft,
verbraucht damit die Änderungsmeldung, ohne sie zu senden: die Felder stehen danach auf den
aktuellen Werten, und der nächste Frame findet nichts mehr zu melden. Die Zusage, dass die frische
Entity nach einem Wiedereinhängen ihre Größe bekommt, hängt still daran, dass die View-Komponente
im ersten Frame danach bereits steht. Vorbestehend: die Reihenfolge von Fortschreiben und Zustellen
ist seit `292714c` unverändert, Paket 6 hat allein `disconnectedCallback()` angefasst. Aus Paket 6;
die Scope-Regel greift unabhängig von der Severity, Kategorie BUG.

### [x] 12. Der Multi-View-Renderer greift auf nichts Ungebautes zu
- Nebenbefunde: `ThreeMultiViewRenderer.js:29-35` (low), `:105-108` (low), `:110-122` (low) —
  alle aus Paket 7
- Ziel: Drei Zugriffe ohne Wächter auf ein Feld, das noch nicht oder nicht mehr existiert, bekommen
  einen — der Abbau-Callback, `destroyView()` und `updateSize()`. Die Entscheidung zu
  `updateSize()` steht oben unter »Entscheidungen«; `docs/01-shadow-objects-api.md` führt die
  Methode danach als API.
- Bereich: `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js`,
  `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`
- Hängt ab von: —
- Hash: 6a1fd39
- Modell: mittlere Stufe (Implementierer) · Reviewer auf der stärksten Stufe, siehe unten
- Effort: low — der Auftrag unten ist Transkription. Jede Zeile, die entsteht, steht wörtlich
  darin, samt der drei Testfälle. Mehr Nachdenken macht daraus keinen besseren Fix, sondern
  erhöht die Neigung, die Nachbarschaft gleich mit aufzuräumen — und in dieser Datei liegen
  zwei Dinge herum, die ausdrücklich nicht angefasst werden (Schritt 6).
- Effort (Reviewer): high. Der Diff ist klein, die Frage dahinter nicht: Fall 1b konstruiert die
  Klasse von Hand statt über den Kernel, und ob dieser Nachbau den Weg trifft, den der Kernel
  wirklich geht, ist am Diff nicht abzulesen. Dazu berührt das Paket die öffentliche API des
  Pakets an zwei Stellen. Das ist Deliberation.
- Dateien:
  - `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js`
  - `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.spec.js`
  - `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`
  - `packages/shae-offscreen-canvas/CHANGELOG.md`

**Abgleich (2026-08-28).** Alle drei Befunde stehen. Paket 7 hat die Datei angefasst und
`renderView()` in `renderView()` plus `#renderViewNow()` zerlegt, `#renderChain` und
`forgetOutcome` eingeführt; das hat alles nach unten verschoben, die drei Rümpfe selbst aber
nicht berührt. `git show 292714c:packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js`
liefert sie Zeile für Zeile so, wie sie heute dastehen — vorbestehend, wie die Queue es
behauptet hat:

| Befund | heute | bei `292714c` |
| --- | --- | --- |
| Abbau-Callback über `this.renderer.dispose()` | `:29-35` | `:21-27` |
| `destroyView()` ohne Wächter an `view.viewId` | `:105-108` | `:72-75` |
| `updateSize()` ohne Wächter an `this.renderer.getSize()` | `:110-123` | `:77-90` |

Die Zeilenspanne der dritten Zeile weicht um eine Zeile von der ab, die die Queue und die
`Nebenbefunde:`-Zeile oben nennen (`:110-122`); maßgeblich ist die Spalte »heute«, der Rumpf der
Methode endet auf `:123`.

Zu verteilen war nichts. Alle elf erledigten Pakete melden »Folgen: keine«, und »Offene Befunde«
steht seit der Drain-Runde vollständig auf `[x]`. Am Restplan ändert sich nichts, weil es keinen
gibt: Paket 12 ist das letzte, hinter ihm steht nur noch der Abschluss.

**Nachgemessen statt vermutet: der Abbau-Callback läuft wirklich.** Die Queue lässt Nebenbefund 1
mit einer offenen Frage stehen — »Ob der Kernel ihn nach einem werfenden Konstruktor überhaupt
noch ausführt, ist nicht nachgemessen«. Er tut es. Der Weg, am Code entlang:

1. `ThreeMultiViewRenderer.js:29` ruft `onDestroy(cb)`. `ShadowObjectCreationScope.onDestroy()`
   (`packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:769-772`) legt den
   Callback in `#unsubscribePrimary`; der Wächter `#refuseAfterTearDown()` davor greift während
   der Konstruktion nicht.
2. `ThreeMultiViewRenderer.js:40` — `new WebGLRenderer({canvas})` wirft in jeder Umgebung ohne
   WebGL. Der Kommentar der Spec-Datei `:7-12` hält genau das fest, und der Testlauf dieses
   Pakets ist so eine Umgebung.
3. `Kernel.constructShadowObject()` (`packages/shadow-objects/src/in-the-dark/Kernel.ts:790-797`)
   fängt den Wurf, ruft `scope.tearDown()` und wirft weiter. Sein Kommentar nennt den Fall beim
   Namen: »A constructor that does not return therefore ends its own scope here, or nobody does.«
4. `tearDown()` (`ShadowObjectCreationScope.ts:315-317`) geht `#unsubscribePrimary` durch und
   fährt jeden Callback über `#runGuarded('onDestroy callback', …)`. Der Doc-Kommentar der
   Methode führt diesen dritten Weg ausdrücklich: »the kernel calls this directly on a scope that
   `bindTo()` never saw, because the constructor threw«.
5. Im Callback laufen `multiViewRenderer.set(null)` und `this.#views.clear()` durch, dann wirft
   `this.renderer.dispose()` ein `TypeError: Cannot read properties of undefined (reading
   'dispose')`.
6. `#runGuarded` (`:382-388`) fängt und protokolliert:
   `shadow-object teardown failed (onDestroy callback): ThreeMultiViewRenderer <TypeError>`.

Der Befund ist damit nicht theoretisch. In jeder Umgebung ohne WebGL steht neben dem echten
Fehler ein zweiter, der auf eine Stelle zeigt, die mit der Ursache nichts zu tun hat, und der
Rumpf des Callbacks bricht auf halbem Weg ab. Dass die beiden Zuweisungen dahinter in genau
diesem Fall nichts mehr zu tun hätten, ist ein Zufall der Stelle und keine Zusage der Klasse.

**Warum es drei Wächter sind und nicht einer.** Die drei Stellen teilen ein Muster, aber keine
Ursache: der Callback greift auf etwas zu, das *noch nicht* gebaut ist, `updateSize()` auf etwas,
das *nicht mehr* da ist, und `destroyView()` auf etwas, das ihm der Aufrufer gar nicht gegeben
hat. Ein gemeinsamer Fix wäre eine Erfindung. Drei einzeilige Wächter sind die ganze Änderung am
Produktivcode.

**Vorgehen:**

1. **Erst die drei Testfälle, alle drei rot sehen.** In
   `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.spec.js`.

   1a. Der Mock braucht einen Schalter. Über den `vi.mock('three', …)`-Block, direkt unter die
   Importe:

   ```js
   // `vi.mock` is hoisted above every other statement of this file, so the switch its factory reads
   // has to be hoisted with it.
   const webgl = vi.hoisted(() => ({rendererThrows: false}));
   ```

   In `RecordingRenderer` als erste Anweisung des Konstruktors — dieselbe Stelle, an der der
   echte `WebGLRenderer` wirft, also nachdem `ThreeMultiViewRenderer` seinen Abbau-Callback
   registriert hat:

   ```js
       constructor({canvas, alpha}) {
         if (webgl.rendererThrows) {
           throw new Error('no WebGL context');
         }

         this.canvas = canvas;
   ```

   Im vorhandenen `afterEach` eine Zeile dazu, damit der Schalter nicht in den nächsten Fall
   leckt:

   ```js
       webgl.rendererThrows = false;
   ```

   1b. Ein neuer `describe`-Block, hinter `it('sets up pixel ratio, scissor test and a 320x240
   alpha canvas', …)` und vor `describe('createView', …)`:

   ```js
   describe('teardown after a renderer that never came to be', () => {
     // The kernel takes this path itself: `constructShadowObject()` catches a throwing constructor
     // and tears the creation scope down, and that runs every callback `onDestroy()` collected —
     // including the one this constructor registered before it threw. The creation API is stood in
     // for here because there is no instance to reach it through: the constructor does not return.
     it('disposes nothing when the renderer constructor threw', () => {
       webgl.rendererThrows = true;

       let releaseOnDestroy;
       const creationApi = {
         provideContext: () => ({set: () => {}}),
         onDestroy: (callback) => {
           releaseOnDestroy = callback;
         },
       };

       expect(() => new ThreeMultiViewRenderer(creationApi)).toThrow('no WebGL context');
       expect(releaseOnDestroy).toBeTypeOf('function');

       expect(() => releaseOnDestroy()).not.toThrow();
     });
   });
   ```

   1c. In `describe('destroyView', …)` als zweiter Fall, hinter »accepts a view object as well as
   a bare id«. Der Fortbestand der einen echten Ansicht wird über die Leinwandgröße gemessen,
   weil `#views` privat ist und von außen nicht gelesen werden kann:

   ```js
   it('destroys nothing when it is handed nothing', () => {
     const {mvr} = create();

     const view = mvr.createView(500, 500);

     expect(() => mvr.destroyView(undefined)).not.toThrow();
     expect(() => mvr.destroyView(null)).not.toThrow();

     // the view it did get is still there: it is the only thing that grows the canvas past 320x240
     mvr.updateSize();
     expect(mvr.renderer.canvas.width).toBe(500);
     expect(view.viewId).toBe(1);
   });
   ```

   1d. In `describe('updateSize', …)` als fünfter Fall, hinter »shrinks back once the largest view
   goes«:

   ```js
   it('sizes nothing once its entity is gone', () => {
     const {uuid, mvr} = create();
     mvr.createView(800, 600);

     env.kernel.destroyEntity(uuid);

     expect(() => mvr.updateSize()).not.toThrow();
   });
   ```

   Lauf:

   ```bash
   pnpm -F @spearwolf/shae-offscreen-canvas exec vitest src/shadow-objects/ThreeMultiViewRenderer.spec.js --run
   ```

   Erwartet: `3 failed | 21 passed (24)`. Die Datei hält heute 21 Fälle, gemessen am 2026-08-28.
   Die drei Fehlschläge müssen `TypeError` sein und je auf ihre eigene Zeile zeigen —
   `dispose` (1b), `viewId` (1c), `getSize` (1d). Ein Fall, der aus einem anderen Grund rot wird,
   misst nicht, was er messen soll. **Diese Ausgabe gehört wörtlich in den Report.**

2. **Der Abbau-Callback, `ThreeMultiViewRenderer.js:29-35`.** Der Rumpf bekommt eine Zeile mit
   `?.` und den Kommentar dazu:

   ```js
       onDestroy(() => {
         multiViewRenderer.set(null);
         this.#views.clear();
         // A renderer is disposed of only if one came to be. A `WebGLRenderer` constructor that
         // throws — as it does in any environment without WebGL — leaves this callback registered
         // all the same, and the kernel runs it when it tears the creation scope down.
         this.renderer?.dispose();
         this.renderer = null;
         this.canvas = null;
       });
   ```

3. **`destroyView()`, `:105-108`.** Eine Zeile, kein Kommentar — sie nimmt die Schreibweise auf,
   die `renderView()` zwei Methoden weiter oben bereits verwendet:

   ```js
     destroyView(view) {
       const viewId = typeof view === 'number' ? view : view?.viewId;
       this.#views.delete(viewId);
     }
   ```

4. **`updateSize()`, `:110`.** Der Wächter kommt an den Anfang, vor die Schleife — ohne Renderer
   gibt es auch nichts auszurechnen:

   ```js
     updateSize() {
       // Sizing needs a renderer to size, and after the entity's teardown there is none. The answer
       // is the silence `renderView()` gives in the same situation: this method is public API, and a
       // caller holding on to the renderer past the end of its entity is not worth a throw.
       if (this.renderer == null) return;

       let width = DEFAULT_WIDTH;
   ```

   Denselben Lauf wie in Schritt 1 ein zweites Mal. Erwartet: `Tests  24 passed (24)`. Auch das
   gehört in den Report.

5. **Doku und CHANGELOG.**

   5a. `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`. Im Block »RenderView API«
   wird der Absatz zu `destroyView(view)` (Zeile 96-98) ergänzt und `updateSize()` dahinter neu
   aufgenommen. Aus

   ```markdown
   > `threeMultiViewRenderer.destroyView(view)`

   Will destroy the _view_. Once destroyed, it will of course no longer be rendered.
   ```

   wird

   ```markdown
   > `threeMultiViewRenderer.destroyView(view)`

   Will destroy the _view_. Once destroyed, it will of course no longer be rendered. Takes the _view_ structure or its bare `viewId`; handed `undefined` or `null` it destroys nothing.

   > `threeMultiViewRenderer.updateSize()`

   Sizes the shared canvas so that it holds the largest view of this renderer, and never below 320x240. `renderView()` calls it before it draws, so a view whose `width` or `height` was changed is drawn at its new size with the next render either way.
   ```

   Die Zeile 102 nennt danach beide Methoden, die nach dem Ende der Entity still zurückkehren.
   Aus

   ```markdown
   When the entity ends, the renderer releases its WebGL context. `renderView()` answers `undefined` from that point on.
   ```

   wird

   ```markdown
   When the entity ends, the renderer releases its WebGL context. `renderView()` answers `undefined` from that point on, and `updateSize()` returns without sizing anything.
   ```

   5b. `packages/shae-offscreen-canvas/CHANGELOG.md`, ein Punkt, angehängt an die Liste unter
   `## [Unreleased]`:

   ```markdown
   - `ThreeMultiViewRenderer` reaches for nothing it has not built and nothing it has already released. Its teardown disposes a `WebGLRenderer` only if one came to be, so a renderer constructor that throws — as it does in any environment without WebGL — ends the entity's teardown with the one error that caused it. `destroyView()` takes `undefined` or `null` and destroys nothing. `updateSize()` returns without sizing anything once the entity has ended, and is documented as part of the RenderView API.
   ```

6. **Nichts weiter.** Kein fünftes File, kein weiterer Testfall, keine Aufräumarbeit. In dieser
   Datei und ihrer Nachbarschaft liegen drei Dinge, die dieses Paket ausdrücklich **nicht**
   anfasst:

   - Das `TODO(feat)` auf `ThreeMultiViewRenderer.js:39` bleibt stehen. Wer es anfasst, muss
     `pnpm make:todo` fahren, und dieses Paket hat damit nichts zu tun.
   - Der Satz »Once created, the _view_ is rendered automatically with one of the next frames« in
     `docs/01-shadow-objects-api.md:83` sagt eine Automatik zu, die es nicht gibt. Das ist ein
     bekannter Befund, in der Drain-Runde als `→ Audit` beschlossen und dort schon eingetragen.
     Er bleibt, wie er ist.
   - `README.md` des Pakets ändert sich nicht. Die Konvention »öffentliche API ändert sich nie
     allein« verlangt ihn mit; ein `grep` über `updateSize|destroyView|createView|RenderView`
     findet dort aber keinen einzigen Treffer — die Datei führt die RenderView-API überhaupt
     nicht. Es gibt nichts, was nachzuziehen wäre, und eine neu erfundene API-Sektion im README
     wäre Scope-Erweiterung.

   Fällt in den vier Dateien etwas auf, das nicht zu diesem Paket gehört, wird es als Nebenbefund
   gemeldet, nicht behoben.

   Ein Detail zum Schluss: Die Gedankenstriche in den Kommentaren der Schritte 1 bis 4 sind `—`
   und nicht `--`. Beide Dateien schreiben ihn so, und ein `--` darin ist im Review dieses Laufs
   schon einmal als Befund zurückgekommen.

**Drei Dinge, die im Review kein Befund sind.**

- **Der von Hand gebaute Creation-API-Stub in 1b.** Über den Kernel ist dieser Fall nicht zu
  erreichen: Der Konstruktor kehrt nicht zurück, es gibt keine Instanz, und der Callback liegt
  im Scope, den der Kernel niemandem herausgibt. Der Stub ist der einzige Weg zu dem Callback.
  Ob er den Weg des Kernels trifft, ist eine berechtigte Reviewfrage — der Abgleich oben zeichnet
  ihn Schritt für Schritt nach.
- **Drei Wächter statt eines.** Die Begründung steht oben; ein zusammengelegter Fix wäre eine
  Erfindung.
- **`this.renderer?.dispose()` statt eines `if`-Blocks.** Die Datei benutzt `view?.viewId` an
  derselben Art von Stelle bereits, das ist ihre Schreibweise.

**Für den Reviewer: die stärkste Stufe.** Drei Fragen, keine davon am Diff allein zu beantworten:

1. Wird jeder der drei Testfälle aus dem *richtigen* Grund rot? Der Report nennt die drei
   `TypeError` samt Zeile. Fahre den roten Lauf selbst, statt ihn zu glauben.
2. Trägt 1b wirklich seinen Fix, oder wird es auch ohne den Wächter grün? Die Gegenprobe ist
   billig: `?.` zurück auf `.` und den einen Fall laufen lassen.
3. Leckt `webgl.rendererThrows` in einen anderen Fall? Ein Schalter im Modul-Scope, der nicht
   zurückgesetzt wird, macht jeden Fall danach kaputt — und zwar erst dann, wenn die Reihenfolge
   sich einmal ändert.

- Verify: `pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test:ci && pnpm -F shadow-objects-e2e test`
  (dieselben fünf Kommandos wie in den Paketen 1–8 und 10–11.) Log nach
  `/tmp/claude-1000/-home-spw-spaceland-shadow-objects/d3805971-7e40-4804-8e9a-a4651ef9a355/scratchpad/paket-12.verify.log`.
- Commit: `fix(canvas): the multi-view renderer reaches for nothing it has not built`
- Ergebnis: 1 Runde · alle drei Nebenbefunde behoben — Abbau-Callback (`ThreeMultiViewRenderer.js:35`),
  `destroyView()` (`:109`), `updateSize()` (`:117`) · Regressionstests `disposes nothing when the
  renderer constructor threw`, `destroys nothing when it is handed nothing`, `sizes nothing once its
  entity is gone` (vor dem Fix alle drei rot, je ein `TypeError` auf `dispose`, `viewId`, `getSize`) ·
  das Review hat jeden Wächter einzeln zurückgedreht und je genau seinen Fall rot gesehen, den
  Callback-Fall zusätzlich über den echten Kernel · Verify grün auf allen fünf Kommandos
  (654 E2E-Fälle) · klein: die Hoisting-Begründung in `ThreeMultiViewRenderer.spec.js:13-15` klebt am
  Kommentar über `RecordingRenderer`, statt wie geplant unter den Importen zu stehen · klein:
  `CHANGELOG.md:40` sagt »ends the entity's teardown« für einen Abbau, der dem Creation Scope eines
  Shadow Objects gilt, während die Entity gerade entsteht — der Satz stammt wörtlich aus dem
  Detailplan und liest sich neben »once the entity has ended« zwei Sätze später wie derselbe Moment
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `ThreeMultiViewRenderer.destroyView(view)` nimmt zusätzlich `undefined` und `null`
  entgegen und zerstört dann nichts · `ThreeMultiViewRenderer.updateSize()` ist als öffentliche
  RenderView-API dokumentiert und kehrt nach dem Abbau der Entity still zurück

**Nebenbefund 1 · geschätzt low · packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js:29-35** — ein Abbau-Callback steht über einem Feld, das der Konstruktor erst später füllt

Der `onDestroy`-Callback wird im Konstruktor registriert, bevor `this.canvas` (Zeile 37) und
`this.renderer` (Zeile 40) existieren, und greift ungeprüft mit `this.renderer.dispose()` zu.
Wirft einer der beiden Konstruktoraufrufe — `new WebGLRenderer({canvas})` tut das in jeder
Umgebung ohne WebGL, wie der Kommentar in `ThreeMultiViewRenderer.spec.js:7-12` festhält —,
steht ein registrierter Abbau-Callback über einem `undefined`. Der Kernel führt ihn dann
aus: `constructShadowObject()` fängt den Wurf und ruft `scope.tearDown()`, das jeden
`onDestroy`-Callback über `#runGuarded` fährt. Der `TypeError` wird dort gefangen und als
zweiter, irreführender Fehler protokolliert, und der Rumpf des Callbacks bricht ab, bevor er
seine beiden letzten Zeilen erreicht. Aus Paket 7; die Scope-Regel greift unabhängig von der
Severity, Kategorie BUG.

**Nebenbefund 2 · geschätzt low · packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js:105-108** — `destroyView()` wirft, wenn ihm nichts gegeben wird

`destroyView(view)` liest `view.viewId` ohne Wächter und wirft bei `undefined` oder `null` einen
`TypeError`. Die Methode ist als öffentliche RenderView-API dokumentiert
(`docs/01-shadow-objects-api.md:96`), während ihre Nachbarin `renderView()` denselben Zugriff mit
`view?.viewId` absichert. Der einzige Aufrufer im Repo (`ThreeRenderView.js:63`) steht hinter
`if (view && multiViewRenderer)`, der Befund gilt also der API-Oberfläche. Vorbestehend: bei
`git show 292714c:` steht dieselbe Zeile ohne Wächter. Aus Paket 7; die Scope-Regel greift
unabhängig von der Severity, Kategorie BUG.

**Nebenbefund 3 · geschätzt low · packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js:110-123** — `updateSize()` wirft nach dem Abbau der Entity

`updateSize()` ruft `this.renderer.getSize()` ohne Renderer-Wächter. Nach dem Abbau der Entity
ist `this.renderer` null, ein Aufruf von außen wirft dort. Der einzige Aufrufer innerhalb der
Klasse ist `#renderViewNow()` auf Zeile 89 und steht bereits hinter `if (this.renderer == null)
return`. Die Methode ist öffentlich und wird von den Specs direkt gerufen. Die Entscheidung vom
2026-08-28 im Kopf dieses Plans hält fest, wie es weitergeht: Sie bleibt öffentlich, bekommt den
Wächter ihrer Nachbarin und wird in `docs/01-shadow-objects-api.md` als API nachgetragen.
Vorbestehend: bei `git show 292714c:` steht sie unverändert. Aus Paket 7; die Scope-Regel greift
unabhängig von der Severity, Kategorie BUG.

## Abschluss (2026-08-28)

**Verify gegen die Baseline.** Alle fünf Kommandos aus dem Kopf erneut gefahren:
`pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test:ci` ✓ ·
`pnpm -F shadow-objects-e2e test` ✓ (654 passed, zuvor 645). Coverage 93,11 % der Anweisungen
gegenüber 92,89 % zu Lauf-Beginn. Nichts ist rot, was vorher grün war.

**Semver: patch für beide veröffentlichten Pakete.** Die zwölf Commits sind Bugfixes ohne
Bruch an der öffentlichen Oberfläche — kein Export fällt weg, keine Signatur verengt sich,
keine Typdefinition verschärft sich. Die Wertänderung an `Class.name` einer dekorierten Klasse
trifft nur Code, der sich auf den Namen der internen Hülle verlassen hätte. Angehoben wird
nichts: beide Pakete führen einen `## [Unreleased]`-Abschnitt, die Version steigt beim Release
in einem eigenen Commit. Die dort bereits stehende Einstufung »Next release: minor« stammt aus
akkumulierten Breaking Changes früherer Läufe und bleibt unberührt.

**CHANGELOG.** Sieben Einträge in `packages/shadow-objects/CHANGELOG.md`, fünf in
`packages/shae-offscreen-canvas/CHANGELOG.md`, ein datierter Abschnitt in der Wurzel — je vom
Paket geschrieben, das die Änderung gemacht hat.

**Audit-Report nachgeführt.** Elf Findings geschlossen (jedes mit Reviewer-Urteil an der
Fundstelle und Commit-Hash), drei neue aufgenommen: `API-005`, `API-006`, `TEST-017`. Score
78 → 88, Code & Laufzeit 85,5 → 94, Projekt-Harness 92,5 → 94, gerechnet mit der Formel aus der
Methodik-Sektion der Datei. Kein Befund mittleren Grades steht mehr offen. Der Verlaufspunkt
trägt `source: "remediation"` — neu gerechnet, nicht neu gemessen; die Methodik-Sektion sagt
das auch im Klartext.

**Was der Lauf nicht getan hat.** Kein Push, kein Merge, kein Tag, kein Publish. Der Code wurde
für den Report nicht neu bewertet — das ist Sache des nächsten Audit-Laufs.
