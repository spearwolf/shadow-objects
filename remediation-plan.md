# Remediation-Plan — @spearwolf/shadow-objects (Monorepo)

Quelle: ./audit.html vom 2026-09-01 · Branch: main · erstellt: 2026-09-02
Baseline: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test` ✓ (681 E2E + 3 vitest-Suiten, Coverage 94,21 % Statements)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/19274915-94f8-41c1-aeac-1b1f4701a0be/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 6 von 40 Findings (0 critical, 0 high, 2 medium, 3 low, 1 info) · ausgenommen: alles mit `domain: harness`, das acknowledged-Paar sowie CLEAN-019
Scope-Regel: alles, was am Code und seiner Laufzeit hängt — im Audit `domain: code` —, jede Severity und jede Kategorie. Harness-Themen (Build, CI, Testinfrastruktur, DX, Dependencies) bleiben draußen, auch wenn sie im Lauf auffallen. Gilt ebenso für Befunde, die das Audit nicht kennt.
Stand (2026-09-02): Lauf abgeschlossen · 3 Pakete committet (4103758, c784281, 8c89136) · kein Paket blockiert · Befund-Queue leer · voller Verify-Lauf nach dem letzten Paket grün (Lint, Typecheck, Build, Test) · Report nachgeführt: Score 78 → 83,5, Bereich »Code & Laufzeit« 94,5 → 100, sechs Findings geschlossen, keines neu eingetragen

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen

- `ShaeOffscreenCanvasElement` wird über einen eigenen Einstiegspunkt
  `./ShaeOffscreenCanvasElement.js` erreichbar gemacht, ohne den
  `customElements.define()`-Seiteneffekt — analog zu `ConsoleLogger.js` und
  `FrameLoop.js` im Kernpaket. Die Vererbung bleibt damit ein zugesagter Weg,
  und das `initialHTML`-Argument des Konstruktors bleibt (2026-09-02)
- Weil fremdes Markup damit ein zugesagter Eingang ist, wird der Konstruktor
  gehärtet statt entschärft: fehlende ids werden mit einem Satz gemeldet, der
  die Ursache nennt (2026-09-02)
- `onParentChanged` meldet nicht mehr, wenn alter und neuer Elternknoten
  identisch sind. Die Alternative — den Randfall nur zu dokumentieren — ist
  verworfen (2026-09-02)
- CLEAN-019 (Kommentarquote, `info`) bleibt draußen. Seine eigene Empfehlung
  lautet »nichts kürzen«, und die Arbeit, die sie benennt, hängt an einem
  Finding aus dem Harness-Bereich. Es bleibt offen im Audit stehen
  (2026-09-02)

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

- **Dokumentation ist Teil des API-Vertrags.** Eine Änderung an der
  öffentlichen API eines veröffentlichten Pakets zieht `docs/`, `README.md` und
  `CHANGELOG.md` desselben Pakets im selben Commit mit. Für das Kernpaket ist
  das `packages/shadow-objects/`, für das Canvas-Element
  `packages/shae-offscreen-canvas/`.
- Änderungen an Build, Testrunner, Lint-Konfiguration oder Monorepo-Skripten
  gehören ins `CHANGELOG.md` der Repo-Wurzel, nicht in ein Paket-Changelog.
- Alle Kommentare und alle Dokumentation in **Englisch**, Doku in Markdown.
- ECS-Terminologie ist bindend. Verboten als Analogie: »shadow theater«,
  »puppet«, »puppeteer«, »light world«, »screen«. Ebenso bindend die
  Begriffstabelle in `AGENTS.md` §4 — `RemoteWorkerEnv` statt
  `RemoteShadowObjectEnv`, Entity statt Shadow Entity, Entity Tree statt
  Shadow Entity Graph, Token statt Component Tag. `ComponentContext` (die
  View-seitige Namespace-Registry) und »Entity Context« (die Injektion entlang
  des Entity Tree) werden nie vermengt.
- Ändert sich die Dateiliste oder die Form von `dist/package.json`, ziehen
  `src/distContract.files.txt` und `src/distContract.package.json` im selben
  Commit mit — sonst schlägt `src/distContract.spec.ts` fehl. Für das
  Canvas-Paket gilt dasselbe über `src/distContract.spec.js` gegen `.npm-pkg/`.
- Wird ein `TODO`-Kommentar angefasst, läuft `pnpm make:todo`.

## Vorbestehende Fehler

Keine. Lint, Typecheck, Build und Test waren vor Lauf-Beginn vollständig grün.

## Offene Befunde

Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

- _(noch keine)_

## Pakete

### [x] 1. Canvas-Element: Erweiterungspunkt erreichbar machen und den Frame-Pfad dichtziehen

- Findings: MEM-001 (medium), API-001 (medium), BUG-002 (low)
- Ziel: Das Canvas-Paket hält, was sein Quelltext zusagt — die Element-Klasse
  ist importierbar, ihr Markup-Eingang meldet Formfehler mit ihrer Ursache, und
  der Frame-Handler gibt sein Bitmap auch dann frei, wenn die Übergabe an den
  Zeichenkontext wirft.
- Bereich: `packages/shae-offscreen-canvas/` — `src/elements/ShaeOffscreenCanvasElement.js`,
  `src/shadow-objects/ThreeRenderView.js`, `package.json` (exports), `README.md`,
  `CHANGELOG.md`, `src/distContract.*`
- Hängt ab von: —
- Hash: 4103758
- Modell: mittlere Stufe
- Effort: medium
- Dateien:
  - `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js`
  - `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.spec.js`
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js`
  - `packages/shae-offscreen-canvas/package.json`
  - `packages/shae-offscreen-canvas/src/distContract.package.json`
  - `packages/shae-offscreen-canvas/README.md`
  - `packages/shae-offscreen-canvas/CHANGELOG.md`
  - **Nicht anfassen:** `packages/shae-offscreen-canvas/src/distContract.files.txt`.
    `src/elements/ShaeOffscreenCanvasElement.js` steht dort bereits; das Paket
    bekommt keine neue Datei, nur einen Eintrag in der `exports`-Map.
- Vorgehen:

  1. **Regressionstest für das liegengebliebene Bitmap, rot sehen.** In
     `src/shadow-objects/ThreeRenderView.spec.js`, im Block
     `describe('rendering a frame', …)`, direkt hinter den Fall
     `'renders the view, transfers the image and closes it'`:

     ```js
     it('closes the image when the transfer to the drawing context throws', async () => {
       const {child, renderer, imageBitmapRenderer} = await setupRendering();
       const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

       const image = {close: vi.fn()};
       renderer.renderView.mockResolvedValueOnce(image);
       imageBitmapRenderer.transferFromImageBitmap.mockImplementationOnce(() => {
         throw new Error('the drawing context refused the image');
       });

       emit(child, OnFrame, {});
       await settle();

       expect(image.close, 'the image is freed whatever the transfer did').toHaveBeenCalledTimes(1);
       expect(consoleError, 'and the failure is reported').toHaveBeenCalledTimes(1);
     });
     ```

     Roter Lauf, und seine Ausgabe gehört in den Report:
     `pnpm exec vitest src/shadow-objects/ThreeRenderView.spec.js --run` aus
     `packages/shae-offscreen-canvas/`. Der Fall scheitert an der ersten
     Zusicherung — `close()` läuft nicht. Alles im Testaufbau ist vorhanden:
     `setupRendering()`, `makeMockImageBitmapRenderer()` mit
     `transferFromImageBitmap: vi.fn()`, `settle()`, und ein `afterEach` mit
     `vi.restoreAllMocks()` räumt den Konsolen-Spy ab.

  2. **Das Bitmap im `finally` freigeben.** In
     `src/shadow-objects/ThreeRenderView.js`, im `OnFrame`-Listener: `image`
     vor den `try`-Block heben, `image.close()` aus dem `try` entfernen und in
     das vorhandene `finally` setzen, vor das Zurücksetzen von
     `frameInFlight`. Der `catch`-Block bleibt unangetastet.

     ```js
     // The image holds GPU memory until it is closed, and frames arrive at the rate of the loop.
     // Freeing it in the `finally` covers both ends of a render: `close()` on a bitmap the transfer
     // already took is defined to do nothing, and a transfer that throws -- the drawing context
     // throws when its canvas has changed owner -- still gives the memory back.
     let image;

     try {
       image = await multiViewRenderer.renderView(view);

       if (image) {
         getImageBitmapRenderer()?.transferFromImageBitmap(image);
       }

       reportedFailure = undefined;
     } catch (error) {
       // unverändert
     } finally {
       image?.close();

       // a render that failed frees the view for the next frame just as one that succeeded
       frameInFlight = false;
     }
     ```

  3. **Regressionstests für den Markup-Eingang, rot sehen.** In
     `src/elements/ShaeOffscreenCanvasElement.spec.js`, im äußeren
     `describe('ShaeOffscreenCanvasElement', …)` hinter den Fall
     `'sets the namespace on a template that carries no placeholder for it'`:

     ```js
     it('rejects an initialHTML without the canvas element', () => {
       expect(() =>
         createWithNamespace('my-namespace', '<shae-ent id="entity" token="ShaeOffscreenCanvas"></shae-ent>'),
       ).toThrow(/missing: "display"/);
     });

     it('rejects an initialHTML without the entity element', () => {
       expect(() => createWithNamespace('my-namespace', '<canvas id="display"></canvas>')).toThrow(/missing: "entity"/);
     });
     ```

     Beide Fälle sind vor der Änderung rot: der Konstruktor wirft dort heute
     nicht, er liefert ein Element mit `canvas === null` beziehungsweise
     `shadowEntity === null`. Gemessen (2026-09-02, happy-dom 20.11.2): eine
     Ausnahme aus einem Custom-Element-Konstruktor kommt in diesem Runner bei
     `document.createElement()` beim Aufrufer an, `toThrow` greift also. Im
     Browser landet dieselbe Ausnahme am globalen `error`-Kanal — der Grund,
     warum sie ihre Ursache benennen muss. Kommando wie oben, mit
     `src/elements/ShaeOffscreenCanvasElement.spec.js`.

  4. **Den Konstruktor auf seinen Vertrag prüfen lassen.** In
     `src/elements/ShaeOffscreenCanvasElement.js`, im Konstruktor, direkt hinter
     `template.innerHTML = initialHTML;` und vor dem Schreiben des Namespace:

     ```js
     // The two ids are the contract of `initialHTML`: the constructor dereferences both, and a
     // reaction of a custom element is no place to find out that a node is missing -- the exception
     // never reaches the caller from there. Naming what is absent points at the markup instead of
     // at its consequence.
     const canvas = template.content.getElementById(DISPLAY_ID);
     const shadowEntity = template.content.getElementById(ENTITY_ID);

     const missing = [];
     if (canvas == null) missing.push(`"${DISPLAY_ID}"`);
     if (shadowEntity == null) missing.push(`"${ENTITY_ID}"`);

     if (missing.length > 0) {
       throw new Error(
         `ShaeOffscreenCanvasElement: initialHTML needs an element with id="${DISPLAY_ID}" and one with id="${ENTITY_ID}", missing: ${missing.join(', ')}`,
       );
     }
     ```

     Danach die beiden vorhandenen Zugriffe auf diese Referenzen umstellen:
     `shadowEntity.setAttribute(ATTR_NS, ns)` statt der erneuten Suche im
     Fragment, und hinter `this.shadow.appendChild(template.content);` die
     beiden Felder aus den Konstanten setzen statt aus zwei weiteren
     `getElementById()`-Aufrufen:

     ```js
     // `appendChild()` moves the nodes of the fragment into the shadow root, so both references
     // stand on the elements this element works with from here on.
     this.canvas = canvas;
     this.shadowEntity = shadowEntity;
     ```

     Geprüft werden genau diese beiden ids und nicht das `token` des
     Entity-Elements: die ids sind strukturell, der Konstruktor greift auf
     beide zu. Das Token ist eine Routing-Entscheidung, die eine Unterklasse
     mit gutem Grund anders treffen kann; es steht in der README statt im
     Konstruktor.

  5. **Den Einstiegspunkt in die `exports`-Map.** In
     `packages/shae-offscreen-canvas/package.json` als letzten Eintrag der
     `exports`-Map:

     ```json
     "./ShaeOffscreenCanvasElement.js": {
       "default": "./src/elements/ShaeOffscreenCanvasElement.js"
     }
     ```

     Denselben Eintrag an derselben Stelle in
     `src/distContract.package.json` unter `exports`. `sideEffects` bleibt
     unverändert: die Datei ruft kein `customElements.define()`, und genau das
     ist der Zweck des Eintrags. `topLevelKeys`, `entryPoints`,
     `dependencyNames` und `peerDependencyNames` bleiben ebenfalls, wie sie
     sind. `makePackageJson.mjs` reicht die `exports`-Map dieses Pakets
     unverändert durch (der Präfix-Stripper greift nur auf `.npm-pkg/`), der
     dritte Fall von `distContract.spec.js` prüft anschließend, dass der
     Eintrag unter `.npm-pkg/` auf eine existierende Datei zeigt.

  6. **README: der Erweiterungspunkt bekommt einen Abschnitt.** In
     `packages/shae-offscreen-canvas/README.md` ein neuer Abschnitt
     `## Extending the element` zwischen `## Attributes` und
     `## Documentation`. Inhalt, in eigenen Worten und auf Englisch:

     - Der Import:
       `import {ShaeOffscreenCanvasElement} from '@spearwolf/shae-offscreen-canvas/ShaeOffscreenCanvasElement.js';`
       — dieser Einstiegspunkt liefert die Klasse und sonst nichts; das
       `customElements.define('shae-offscreen-canvas', …)` steht in
       `@spearwolf/shae-offscreen-canvas/shae-offscreen-canvas.js`, das der
       Bundle-Einstiegspunkt importiert.
     - Ein kurzes Beispiel einer Unterklasse mit eigenem Template über
       `super(myTemplate)` und `customElements.define('my-canvas', MyCanvas)`.
     - Der Vertrag des `initialHTML`-Arguments: ein `<canvas id="display">` und
       ein `<shae-ent id="entity" token="ShaeOffscreenCanvas">`. Die beiden ids
       sind Pflicht, der Konstruktor wirft und nennt die fehlende. Das Token
       verbindet das Entity-Element mit dem Shadow Object, das dieses Paket
       unter `./shadow-objects.js` registriert; eine Unterklasse, die ein
       anderes Token setzt, wechselt damit die Gegenseite.
     - Der Namespace des Host-Elements erreicht das Entity-Element über
       `setAttribute()`, also auch in einem Template ohne Platzhalter.
     - Die Falle mit `static observedAttributes`: wer die eigene Liste
       deklariert, ohne die der Oberklasse hineinzuspreizen, verliert `fps` und
       `pixel-zoom`.

     `docs/01-shadow-objects-api.md` bleibt unverändert. Die Datei beschreibt
     ausschließlich die fünf Shadow Objects des Einstiegspunkts
     `./shadow-objects.js`; kein Satz darin wird durch dieses Paket falsch, und
     der Erweiterungspunkt des Elements gehört an die Stelle, an der die README
     bereits das Element und seine Attribute führt.

  7. **CHANGELOG.** In `packages/shae-offscreen-canvas/CHANGELOG.md` unter
     `## [Unreleased]`, oben in die Liste (die Einträge dort stehen mit dem
     jüngsten zuerst), drei Einträge auf Englisch: der eigene Einstiegspunkt
     für die Element-Klasse, die Formprüfung des `initialHTML`-Arguments samt
     der Ausnahme, die die fehlende id nennt, und die Freigabe des Bitmaps auf
     jedem Weg aus dem Render heraus. Der Blockzitat-Hinweis »Next release:
     minor« bleibt, wie er ist: ein zusätzlicher Einstiegspunkt ist additiv,
     und der Sprung `0.6.0` → `0.7.0` steht ohnehin schon fest.

     **Zu den Konventionen im Kopf dieses Plans:** »Kein Rückblick auf den
     Vorzustand« gilt in diesem Paket für Code, Kommentare und README. Im
     CHANGELOG dagegen darf ein Eintrag das vorherige Verhalten benennen —
     jeder vorhandene Eintrag im Abschnitt `[Unreleased]` tut das, und ein
     Changelog-Eintrag richtet sich an den Leser, der die Vorversion kennt. Ein
     Reviewer, der diese Zeilen als Konventionsverstoß meldet, meldet damit
     nichts.

  8. **Verify fahren**, siehe unten, und die Ausgabe in das Verify-Log des
     Pakets schreiben.

  Kein `pnpm make:todo` — an keinem `TODO`-Kommentar wird gerührt. Die
  Formatierung besorgt `pnpm lint:fix` beziehungsweise `pnpm format`, falls
  Biome an der langen Meldungszeile etwas auszusetzen hat (`lineWidth` 130,
  einfache Anführungszeichen, Einrückung mit Leerzeichen).

- Verify: `pnpm lint && pnpm exec turbo run build test --filter=@spearwolf/shae-offscreen-canvas`
  (aus der Repo-Wurzel; gemessen am sauberen Baum vor Beginn: `exit=0`,
  Log `paket-1.baseline.log` im Arbeitsverzeichnis. Der Filter zieht den Build
  des Kernpakets über `^build` mit und stellt `.npm-pkg` her, das
  `distContract.spec.js` braucht. Die Suiten der übrigen Pakete bleiben
  draußen: außer `@spearwolf/shae-offscreen-canvas` hängt kein Paket dieses
  Workspace von ihm ab, und keine Datei außerhalb wird angefasst.)
- Commit:

  ```
  feat(canvas): the element class is reachable on its own

  The exports map names ./ShaeOffscreenCanvasElement.js, which hands out the
  class without the customElements.define() side effect, so subclassing is a way
  a consumer can actually take. The constructor checks the two ids its template
  argument has to carry and names the one that is absent, instead of failing
  later at a node it did not find. The frame handler frees its image bitmap on
  every way out of a render, including the one where handing the image to the
  drawing context throws.
  ```

- Ergebnis: 1 Runde · MEM-001, API-001 und BUG-002 behoben · Regressionstests
  `closes the image when the transfer to the drawing context throws`,
  `rejects an initialHTML without the canvas element` und
  `rejects an initialHTML without the entity element` (alle drei vor dem Fix
  rot) · Review ohne Befund
- Nebenbefunde: —
- Folgen: —
- Schnittstellen: neuer Einstiegspunkt
  `@spearwolf/shae-offscreen-canvas/ShaeOffscreenCanvasElement.js` — liefert die
  Klasse `ShaeOffscreenCanvasElement` ohne `customElements.define()` ·
  `new ShaeOffscreenCanvasElement(initialHTML)` wirft jetzt, wenn im Markup ein
  Element mit `id="display"` oder eines mit `id="entity"` fehlt

**MEM-001 · medium · packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js:117-121** — Ein ImageBitmap bleibt liegen, sobald die Übergabe an den Zeichenkontext wirft

Der Frame-Handler liest das gerenderte Bild vom Offscreen-Canvas, übergibt es mit
transferFromImageBitmap() an den Bitmap-Renderer und ruft danach image.close().
Die beiden Zeilen stehen nacheinander im try-Block, nicht in einem finally. Wirft
die Übergabe — ein Zeichenkontext, dessen Canvas den Besitzer gewechselt hat,
wirft dort einen InvalidStateError —, wird close() übersprungen und das Bitmap
bleibt mitsamt seinem GPU-Speicher stehen. Der Handler läuft im Takt der
FrameLoop, und der Fehlerbericht darunter ist ausdrücklich auf eine Meldung je
Fehlerlage entprellt: die erste Zeile steht auf der Konsole, danach schweigt der
Pfad, während jeder weitere Frame ein Bitmap in Bildschirmgröße hinterlässt. Bei
60 fps und einer 1920×1080-Ansicht sind das rund 8 MB je Frame. Das finally
darunter setzt nur frameInFlight zurück; das Bild fasst es nicht an.

Empfehlung: image.close() in das vorhandene finally ziehen, neben das
Zurücksetzen von frameInFlight, und vor dem Aufruf prüfen, ob überhaupt ein Bild
da ist. close() auf einem bereits übergebenen — also detached — Bitmap ist per
Spezifikation folgenlos, die Reihenfolge kostet also nichts. Dazu ein Fall in
ThreeRenderView.spec.js, der transferFromImageBitmap werfen lässt und prüft, dass
close() trotzdem gelaufen ist; die Spec mockt den Renderer bereits, der Fall ist
eine Zeile mehr.

**API-001 · medium · packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:54-63; package.json (exports); src/bundle.js** — Die Element-Klasse des Canvas-Pakets nennt sich erweiterbar und ist über keinen Einstiegspunkt erreichbar

Der Klassenkommentar hält ausdrücklich fest, dass die Vererbung ein unterstützter
Weg ist, dieses Element zu erweitern — der Konstruktor nimmt dafür ein
initialHTML-Argument, und der Kommentar warnt sogar vor der Falle,
observedAttributes zu überschreiben statt zu spreizen. Erreichbar ist die Klasse
für einen Konsumenten nicht. Die exports-Map des Pakets nennt drei
Einstiegspunkte, und eine exports-Map ist abschließend: "." zeigt auf
src/bundle.js, das ausschließlich Seiteneffekt-Importe enthält und nichts
exportiert, "./shae-offscreen-canvas.js" ruft customElements.define() und
exportiert ebenfalls nichts, "./shadow-objects.js" liefert die
Registry-Beschreibung. Ein import {ShaeOffscreenCanvasElement} from
"@spearwolf/shae-offscreen-canvas" ergibt undefined, ein Tiefenimport auf die
Datei läuft gegen die exports-Map. Das Paket exportiert damit genau einen Wert,
und die Klasse, deren Quelltext von unterstützter Vererbung spricht, ist keiner
davon.

Empfehlung: Einen Einstiegspunkt "./ShaeOffscreenCanvasElement.js" in die
exports-Map aufnehmen, der die Klasse ohne den define()-Seiteneffekt liefert — so
wie das Kernpaket es für ConsoleLogger.js und FrameLoop.js macht. Dazu die Zeile
in README und CHANGELOG des Pakets, die AGENTS.md §4 für eine Änderung der
öffentlichen API verlangt. Ist die Vererbung dagegen nicht gemeint, gehört der
Kommentar geändert und das initialHTML-Argument aus dem Konstruktor.

**BUG-002 · low · packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:87-106** — Der Konstruktor des Canvas-Elements nimmt fremdes Markup ohne jede Formprüfung

Der Konstruktor nimmt ein initialHTML-Argument, schreibt es in ein <template> und
liest daraus anschließend drei Dinge, die er als vorhanden voraussetzt: das
Entity-Element per getElementById(ENTITY_ID) — auf dessen Rückgabe direkt
.setAttribute() läuft, sobald ein ns-Attribut gesetzt ist —, sowie Canvas und
Entity aus dem Shadow Root. Fehlt eine der beiden ids im übergebenen Markup,
wirft die erste Stelle einen TypeError, oder this.canvas bleibt null und
#observeDisplaySize() wirft beim ersten Connect an getBoundingClientRect().
Beides passiert im Konstruktor beziehungsweise in einer
Custom-Element-Reaktion, wo die Ausnahme nicht zum Aufrufer zurückkehrt, sondern
am globalen error-Kanal landet — der Fehler zeigt also nicht auf das Markup, das
ihn verursacht hat. Der Parameter ist kein Versehen: der Klassenkommentar führt
ihn als den Weg, dieses Element zu erweitern.

Empfehlung: Nach dem Parsen die beiden ids prüfen und mit einem Satz werfen, der
sagt, was gefehlt hat — »initialHTML muss ein Element mit id="display" und eines
mit id="entity" enthalten«. Eine Ausnahme dieser Art landet zwar am selben
globalen Kanal, nennt aber die Ursache statt der Folge. Die Regel gehört in
denselben Zug in den Klassenkommentar, der die Vererbung anbietet.

### [x] 2. Kernpaket-Elemente: Elternwechsel ohne Wechsel, und zwei Kommentare, die nicht tragen

- Findings: API-002 (low), CLEAN-020 (low), CLEAN-018 (info)
- Ziel: `onParentChanged` meldet nur echte Elternwechsel, und die beiden
  Kommentarstellen sagen, was gilt, im Zeilenmaß ihres Blocks.
- Bereich: `packages/shadow-objects/` — `src/elements/ShaeEntElement.ts`,
  `src/in-the-dark/ShadowObjectCreationScope.ts`, `docs/api-reference.md`,
  `CHANGELOG.md` · dazu `packages/shadow-objects-testing/test/` für den
  Regressionstest: der Fall braucht `moveBefore()` und den Opt-out über
  `connectedMoveCallback`, und happy-dom 20.11.2 kennt beides nicht (nachgesehen:
  kein Treffer für `moveBefore` im gesamten `lib/` des Pakets). Das Testpaket ist
  `private` und führt kein Changelog; es kommt nur der Testfall hinzu.
- Hängt ab von: —
- Hash: c784281
- Modell: mittlere Stufe
- Effort: high
- Dateien:
  - `packages/shadow-objects-testing/test/ent-element-namespace.test.js`
  - `packages/shadow-objects/src/elements/ShaeEntElement.ts`
  - `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/CHANGELOG.md`
  - **Nicht anfassen:** `src/distContract.files.txt` und
    `src/distContract.package.json` — es kommt keine Datei hinzu und die
    `exports`-Map bleibt, wie sie ist. Ebenso außen vor: das `CHANGELOG.md` der
    Repo-Wurzel (nichts an Build, CI oder Testrunner), das Changelog von
    `shae-offscreen-canvas` (dessen Oberfläche bewegt sich nicht), `AGENTS.md`
    (kein Konzept und kein Begriff ändert sich) und `pnpm make:todo` (kein
    `TODO`-Kommentar wird berührt). `README.md` des Kernpakets nennt
    `onParentChanged` an keiner Stelle — nachgesehen; die Zeile in der
    API-Referenz ist die einzige Zusicherung, die zu bewegen ist.

- **Wie der Fall überhaupt erreicht wird — das gilt vor dem ersten Schritt.**
  Das Audit beschreibt als Auslöser einen fremden Watcher, der das Element
  während der Anmeldung wegschiebt und im selben Callback zurückholt. Dieser Weg
  trägt nicht: ein echtes `remove()` löst `disconnectedCallback` aus, das über
  `#unobserveParentNode()` den Watcher abmeldet, und das `appendChild()` danach
  läuft in `connectedCallback` → `#observeParentNode()` → `watchForRemovalFrom()`,
  dessen `takeRecords()` den noch offenen Entfernungs-Record abräumt, bevor er
  je zugestellt wird. Genau das hält `parentRemoval.spec.ts` in
  `'does not run the callback of a node unwatched and re-registered under the
  same parent within the same task…'` bereits fest.

  Erreichbar ist der Sachverhalt über den einen Weg, der weder
  `disconnectedCallback` noch `connectedCallback` auslöst: ein atomarer
  `moveBefore()` auf einer Unterklasse mit leerem `connectedMoveCallback`, der
  das Element innerhalb desselben Elternknotens umsortiert. Der `MutationRecord`
  nennt das Element als entfernt, der Watcher steht noch, und
  `getParentNodeForObserver()` antwortet mit demselben Knoten, auf den die
  Beobachtung angemeldet wurde. Der bestehende Fall
  `'the parent observer follows the element to its new parent'` in
  `ent-element-namespace.test.js` fährt genau diese Bewegung schon, sieht aber
  die Argumente nicht an. Die Empfehlung des Audits bleibt unverändert gültig,
  nur ihr Reproduktionsweg ist ein anderer.

- Vorgehen:

  1. **Regressionstest für die Meldung ohne Wechsel, rot sehen.** In
     `packages/shadow-objects-testing/test/ent-element-namespace.test.js`,
     direkt hinter den Fall `'the parent observer follows the element to its new
     parent'` (er endet auf dem `expect` mit `'and back again'`):

     ```js
     it('says nothing about a move that puts the element back under the node it came from', async () => {
       // `moveBefore` is the only move that reaches the observer without a lifecycle callback of
       // its own, and a reorder among siblings is the one that ends where it started: the record
       // names the element as removed, and the node it hangs on once the record comes due is the
       // node it was registered on
       customElements.define(
         'move-ent-n9d',
         class extends ShaeEntElement {
           parentChanges = [];
           connectedMoveCallback() {}
           onParentChanged(newParent, oldParent) {
             this.parentChanges.push([newParent?.id, oldParent?.id]);
             super.onParentChanged(newParent, oldParent);
           }
         },
       );

       const container = mount(
         '<shae-ent id="a-n9d" token="a">' +
           '<span id="pin-n9d"></span>' +
           '<move-ent-n9d id="mover-n9d" token="mover"></move-ent-n9d>' +
           '</shae-ent>' +
           '<shae-ent id="c-n9d" token="c"></shae-ent>',
       );
       await customElements.whenDefined('move-ent-n9d');

       const a = container.querySelector('#a-n9d');
       const c = container.querySelector('#c-n9d');
       const mover = container.querySelector('#mover-n9d');

       a.moveBefore(mover, container.querySelector('#pin-n9d'));
       await nextTask();

       expect(mover.parentChanges, 'a reorder among siblings is no parent change').to.deep.equal([]);
       expect(mover.entParentNode?.id, 'and the element hangs where it hung').to.equal('a-n9d');

       // the observation is what the suppressed report would otherwise have renewed — without it
       // the next move goes unnoticed
       c.moveBefore(mover, null);
       await nextTask();

       expect(mover.parentChanges, 'a move to another node is reported once').to.deep.equal([['c-n9d', 'a-n9d']]);
       expect(mover.entParentNode?.id).to.equal('c-n9d');
     });
     ```

     Roter Lauf, und seine Ausgabe gehört in den Report: aus
     `packages/shadow-objects-testing/` das Kommando
     `pnpm exec vitest test/ent-element-namespace.test.js --run`. Der Fall
     scheitert an der ersten Zusicherung — statt `[]` steht dort
     `[['a-n9d', 'a-n9d']]`. Voraussetzung ist ein gebautes `dist/` des
     Kernpakets; dieses Paket liest die Nachbardateien aus dessen Build. Fehlt es,
     einmal `pnpm exec turbo run build --filter=@spearwolf/shadow-objects` aus der
     Repo-Wurzel. Läuft der Fall wider Erwarten grün, ist die Ursache nicht der
     Test, sondern die Frage, ob `moveBefore()` im Chromium dieses Playwright
     überhaupt greift — das ist ein `KONTEXT_FEHLT` und keine Gelegenheit, den
     Fall umzuschreiben, bis er rot wird.

     Alles, was der Test braucht, steht in der Datei: `mount` aus
     `../src/mount.js`, `nextTask()`, `ShaeEntElement` aus
     `@spearwolf/shadow-objects`, und ein `afterEach` mit `unmountAll()` räumt
     hinter jedem Fall auf. Der Namenszusatz `-n9d` setzt die Reihe `-n9`,
     `-n9b`, `-n9c` der Nachbarfälle fort: ein Custom-Element-Name lässt sich pro
     Dokument nur einmal vergeben, und eigene ids je Fall halten die Datei
     unabhängig von ihrer Laufreihenfolge.

  2. **Die Meldung an ihrer einzigen Quelle unterbinden.** In
     `packages/shadow-objects/src/elements/ShaeEntElement.ts`, im
     Watcher-Callback von `#observeParentNode()` (Zeilen 487–491). Der Block

     ```ts
           watchForRemovalFrom(parent, this, () => {
             // the watch ended when it fired, and the field says so before anything else runs
             this.#observedParentNode = undefined;
             this.onParentChanged(this.getParentNodeForObserver(), parent);
           });
     ```

     wird zu

     ```ts
           watchForRemovalFrom(parent, this, () => {
             // the watch ended when it fired, and the field says so before anything else runs
             this.#observedParentNode = undefined;

             const newParent = this.getParentNodeForObserver();

             // an atomic move reports the removal even where it puts the element back under the node it
             // came from — reordering among siblings is such a move, and nothing about the parent
             // changed. A subclass reading the two arguments against each other would be told
             // otherwise, so the report is left out. The watch fired and is gone all the same, and
             // taking it out again is what stands in its place
             if (newParent === parent) {
               this.#observeParentNode();
               return;
             }

             this.onParentChanged(newParent, parent);
           });
     ```

     Drei Dinge daran sind nicht verhandelbar. Der Rückweg über
     `#observeParentNode()` statt einer Anmeldung von Hand: die Methode beginnt
     mit `#unobserveParentNode()` und ist damit idempotent, und sie bringt das
     Anmeldefenster samt seiner Nachmeldung mit — läuft dabei ein fremder Watcher
     und schiebt das Element doch noch weg, meldet der `else`-Zweig weiter unten
     den Wechsel, und dessen beide Argumente sind dann verschieden. Ohne diesen
     Aufruf verliert das Element seine Beobachtung: der zweite Teil des
     Regressionstests hängt genau daran, und der bestehende Fall `'the parent
     observer follows the element to its new parent'` ebenso.

     Die zweite Aufrufstelle (`this.onParentChanged(parentAfterRegistration,
     parent)` im `else`-Zweig, Zeile 521) bleibt unangetastet — sie steht hinter
     `parentAfterRegistration !== parent` und kann gleiche Argumente gar nicht
     erzeugen.

     Und der Vergleich gehört vor den Aufruf, nicht in `onParentChanged` selbst:
     die Methode ist der Erweiterungspunkt, den eine Unterklasse überschreibt.
     Ein Wächter darin liefe erst, nachdem die Überschreibung den Aufruf schon
     gesehen hat, und behöbe damit nichts.

  3. **Die Zusicherung in der API-Referenz nachziehen.** In
     `packages/shadow-objects/docs/api-reference.md`, Zeile 2077, die Zelle zu
     `onParentChanged(newParent, oldParent)`. Aus »Called when the element leaves
     its parent node.« wird ein Satz, der die neue Grenze mitnennt, sinngemäß:
     das Element hört von einem Wechsel nur, wenn der Knoten, den es verlässt,
     und der, unter dem es landet, zwei verschiedene sind — ein atomarer
     `moveBefore()`, der es zwischen seinen Geschwistern umsortiert, wird nicht
     gemeldet. Der Rest der Zelle (Re-Resolve des Entity-Ancestors,
     Erweiterungspunkt mit `super`-Pflicht, der Wurf über `console.error`) bleibt
     Wort für Wort stehen. In eigenen Worten und auf Englisch; kein Rückblick
     darauf, wie es vorher war.

     Weitere Fundstellen gibt es nicht: `docs/cheat-sheet.md:132` und die
     Treffer in `api-reference.md` um Zeile 2712, 2870, 3191–3236 meinen das
     Symbol `onParentChanged` des Shadow-Object-Hooks, nicht die Methode des
     Elements. Beides trägt denselben Namen und ist zweierlei — nachgesehen, und
     nichts davon wird durch dieses Paket falsch.

  4. **CHANGELOG des Kernpakets.** Zwei Stellen in
     `packages/shadow-objects/CHANGELOG.md`:

     - Im Blockzitat unter `## [Unreleased]` trägt die Klausel über
       `connectedMoveCallback` (Zeilen 35–36) den Zusatz. Zeile 35 bleibt
       Byte für Byte, Zeile 36 wird zu zwei Zeilen:

       ```
       > with `connectedMoveCallback` keeps being watched after the first `moveBefore()` instead of only
       > until it, and hears nothing at all about a `moveBefore()` that puts it back under the node it
       > came from; an entity left behind when the element it hung on leaves the tree climbs to the next
       ```

     - Ein neuer Aufzählungspunkt am Ende des Abschnitts `### Behavior` (hinter
       der `**Behavior (logging):**`-Zeile, aktuell Zeile 319), eine einzelne
       lange Zeile im Stil des Abschnitts, beginnend mit
       `- **Behavior (elements):**`. Inhalt auf Englisch: `<shae-ent>` meldet
       einen Elternwechsel nur, wenn der verlassene und der neue Knoten zwei
       verschiedene sind; ein atomarer `moveBefore()`, der das Element innerhalb
       desselben Elternknotens umsortiert, erreicht eine
       `onParentChanged`-Überschreibung nicht mehr, und die Beobachtung des
       Elternknotens steht danach unverändert weiter. Ein Changelog-Eintrag darf
       das vorherige Verhalten benennen.

     **Die Zahl »Sixty-two changes« im Blockzitat bleibt stehen, und das ist
     entschieden.** Sie zählt Klauseln, und dieser Zusatz reitet auf der Klausel,
     die schon dasteht: was ein `connectedMoveCallback`-Abkömmling von
     `moveBefore()` zu hören bekommt, ist dieselbe Sache. Eine Reviewer-Meldung
     dazu meldet nichts. Ebenso entschieden: `README.md` bleibt unangetastet,
     weil sie `onParentChanged` nirgends führt.

  5. **Die Kommentarzeile im `disconnectedCallback` neu umbrechen.** In
     `packages/shadow-objects/src/elements/ShaeEntElement.ts` werden die Zeilen
     578 und 579

     ```ts
         // above. An entity that leaves the tree
         // along with this one is not affected: it turns the message down while disconnected
     ```

     zu

     ```ts
         // above. An entity that leaves the tree along with this one is not affected: it turns the
         // message down while disconnected
     ```

     Der Wortlaut ändert sich nicht, nur die Umbruchstelle. Die Zeilen 573–577
     bleiben unverändert: der Absatz läuft dort auf 97 bis 99 Zeichen, und die
     erste neue Zeile misst 94 — sie ist die letzte volle des Absatzes und liegt
     damit im Band. Biome formatiert Kommentare nicht, `pnpm lint` hat dazu also
     nichts zu sagen; die Prüfung ist der Augenschein.

  6. **Den Rückblick aus dem Teardown-Kommentar nehmen.** In
     `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`,
     Zeile 324, endet der Satz an seiner Regel:

     ```ts
         // hands in a new callback every time does not terminate.
     ```

     Der Halbsatz `, and never did` fällt weg, sonst ändert sich an dem Block
     nichts. Die Zeile wird dadurch kürzer als ihre Nachbarn — sie ist die letzte
     des Absatzes, das ist in Ordnung, und die Zeilen 316–323 werden nicht
     angefasst.

  7. **Verify fahren**, siehe unten, und die Ausgabe in das Verify-Log des
     Pakets schreiben.

- Verify: `pnpm lint && pnpm exec turbo run build typecheck test --filter=!shadow-objects-e2e`
  (aus der Repo-Wurzel. Der Filter ist weiter gefasst als in Paket 1, und das mit
  Grund: geändert wird das Laufzeitverhalten von `<shae-ent>` im Kernpaket, und
  jedes andere Paket dieses Workspace hängt daran. Alle drei vitest-Suiten laufen
  damit, dazu `build` und `typecheck`. Draußen bleibt allein
  `shadow-objects-e2e`: das ist Playwright über drei Browser, es kennt weder
  `moveBefore` noch `connectedMoveCallback` — nachgesehen, kein Treffer im ganzen
  Paket —, und die Repo-eigenen Skripte `test:ci` und `ci` schließen es aus
  demselben Grund von ihren Testläufen aus. Baseline laut Kopf dieses Plans:
  alles grün.)
- Commit:

  ```
  fix(elements): a move that ends where it started is not a parent change

  The removal watcher of <shae-ent> compares the node it registered on against
  the one the element hangs on once the record comes due. Where both name the
  same node, onParentChanged is left out and the observation is taken out again
  in its place: an atomic move that reorders the element among its siblings
  therefore reaches a subclass reading the two arguments against each other as
  what it is, which is no parent change at all. The reference says so, and a
  case in the browser suite holds it.

  Two comments say what holds rather than what used to: the teardown of a
  shadow object creation scope ends its sentence at the rule it states, and the
  paragraph in disconnectedCallback runs at the width of the block around it.
  ```

- Ergebnis: 1 Runde · API-002, CLEAN-020 und CLEAN-018 behoben ·
  Regressionstest `says nothing about a move that puts the element back under
  the node it came from` in `ent-element-namespace.test.js` (vor dem Fix rot:
  `expected [ [ 'a-n9d', 'a-n9d' ] ] to deeply equal []`) · Verify mit
  `--force` gefahren, kein Cache-Treffer, exit 0 · Browser-Suite 386 → 387
  Tests · klein: die Prosastelle in der API-Referenz und zwei fehlende Sätze im
  neuen Kommentar, beide unter »Folgen« · ein Satz der Commit-Message oben
  wurde beim Committen umgestellt: »therefore reaches a subclass … as what it
  is« las sich, als käme der Aufruf an, während er gerade ausbleibt. Im Repo
  steht »a subclass reading the two arguments against each other therefore sees
  … for what it is«. Gleiche Aussage, und `git log` trägt sie länger als dieser
  Plan
- Nebenbefunde: —
- Folgen: `packages/shadow-objects/docs/api-reference.md:2312-2315` — der
  Absatz »Everything else keeps the parent it resolved« beschreibt dieselbe
  Grenze und wurde nicht ergänzt; sein zweiter Satz (»A move that takes it out
  of its parent node is noticed«) deckt einen `moveBefore()`-Reorder
  mechanisch mit ab und steht damit neben der neuen Zeile 2077 ·
  `packages/shadow-objects/src/elements/ShaeEntElement.ts:493-497` — der
  Kommentar begründet, warum die Meldung wegfällt, aber nicht, warum
  `#setParent()` und `#dispatchRequestParent()` auf diesem Pfad entfallen
  dürfen, und die Terminierung des Selbstaufrufs bleibt unbegründet (der
  `else`-Zweig bei :526-528 hat seine Zeile dazu)
- Schnittstellen: `ShaeEntElement.onParentChanged(newParent, oldParent)` läuft
  nicht mehr, wenn beide Argumente denselben Knoten nennen — ein atomarer
  `moveBefore()` innerhalb desselben Elternknotens erreicht eine Überschreibung
  nicht mehr, und die Beobachtung des Elternknotens steht danach unverändert
  weiter

**API-002 · low · packages/shadow-objects/src/elements/ShaeEntElement.ts:488-490** — Ein Erweiterungspunkt meldet einen Elternwechsel, bei dem alter und neuer Knoten derselbe sind

Verschiebt ein fremder Watcher das Element während der Anmeldung der
Elternbeobachtung weg und im selben Callback wieder unter denselben Knoten
zurück, bekommt onParentChanged(newParent, oldParent) beide Argumente gleich.
Einmal, nicht doppelt, und der Endzustand stimmt. docs/api-reference.md:2077
sichert »Called when the element leaves its parent node« zu — das Element hat den
Knoten tatsächlich verlassen, die Meldung liegt also innerhalb der Zusicherung.
Wer aus der Ungleichheit der beiden Argumente eine Bedingung baut, wird davon
trotzdem überrascht.

Empfehlung: Entweder die Meldung unterdrücken, wenn beide Knoten identisch sind,
oder den Fall in der API-Referenz benennen, damit ein Erweiterer ihn einplant.

**CLEAN-020 · low · packages/shadow-objects/src/elements/ShaeEntElement.ts:570** — Eine Kommentarzeile bricht mitten im Absatz auf 44 Zeichen um

Im Kommentarblock von disconnectedCallback endet eine Zeile nach »above. An
entity that leaves the tree«, während der Block sonst auf 97 bis 99 Zeichen
läuft. Biome formatiert Kommentare nicht, der Umbruch bleibt also stehen, bis ihn
jemand von Hand zieht — und jede Änderung an dem Absatz erbt ihn.

Empfehlung: Den Absatz auf das Zeilenmaß des umgebenden Blocks neu umbrechen.

**CLEAN-018 · info · packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:326** — Ein Kommentar im Teardown erklärt sich aus dem Vorzustand

Der Kommentarblock über den Abbauschleifen endet auf »…does not terminate, and
never did«. Der Halbsatz hinter dem Komma sagt nichts über den geltenden Zustand,
sondern über den vorherigen — und er trägt auch sachlich nicht durch: er stimmt
innerhalb einer Menge, über die Mengengrenze hinweg wird die Nichtterminierung
erst mit den nachziehenden Runden erreichbar.

Empfehlung: Den Satz nach »does not terminate« enden lassen. Damit fällt der
Rückblick weg, und was stehen bleibt, stimmt auch über die Mengengrenze hinweg.

### [x] 3. Der Elternwechsel-Guard sagt noch nicht ganz, was er tut

- Findings: — (keine Audit-ID; beide Fundstellen sind Folgen aus Paket 2)
- Folge von: Paket 2
- Ziel: Die Grenze, die `<shae-ent>` seit c784281 zieht, steht dort vollständig,
  wo jemand sie sucht — in der Prosa der API-Referenz und in der Begründung des
  Guards selbst.
- Bereich: `packages/shadow-objects/` — `docs/api-reference.md`,
  `src/elements/ShaeEntElement.ts`
- Hängt ab von: Paket 2 (committet)
- Hash: 8c89136
- Modell: mittlere Stufe. Der Zieltext steht unten wörtlich, zu entwerfen ist
  nichts; schiefgehen kann die Platzierung. Beide Stellen sitzen mitten in einem
  dichten Block, und eine still mit umgebrochene Nachbarzeile ist ein
  Review-Befund wie jeder andere. Zwei Einfügepunkte in zwei Dateien, jeder mit
  unangetasteten Nachbarn — dafür ist die günstigste Stufe die knappere Wahl,
  und die Rundenzahl schlägt hier den Tokenpreis.
- Effort: low — der Auftrag ist Transkription an zwei benannten Stellen. Es gibt
  nichts abzuwägen, und mehr Nachdenken erhöht nur die Neigung, an Text zu
  feilen, der so dastehen soll, wie er hier steht.
- Dateien:
  - `packages/shadow-objects/docs/api-reference.md`
  - `packages/shadow-objects/src/elements/ShaeEntElement.ts`
  - **Nicht anfassen**, jeweils nachgesehen am 2026-09-02:
    - `packages/shadow-objects/CHANGELOG.md` — das Verhalten steht dort schon
      zweimal: in der Klausel des Blockzitats unter `## [Unreleased]`
      (Zeilen 35–37) und im Punkt `- **Behavior (elements):**` (Zeile 321).
      Dieses Paket bewegt kein Verhalten; ein Eintrag über einen präzisierten
      Satz nennt eine Änderung, die kein Konsument beobachten kann.
    - `packages/shadow-objects/README.md` — führt `onParentChanged` an keiner
      Stelle (kein Treffer).
    - `packages/shadow-objects/docs/cheat-sheet.md` — der Treffer in Zeile 132
      meint das Symbol `[onParentChanged]` des Shadow-Object-Hooks, nicht die
      Methode des Elements. Gleicher Name, zweierlei Sache.
    - `src/distContract.files.txt` und `src/distContract.package.json` — keine
      Datei kommt hinzu, die `exports`-Map bleibt, wie sie ist.
    - `CHANGELOG.md` der Repo-Wurzel — nichts an Build, CI, Lint oder
      Testrunner.
    - `AGENTS.md` — kein Konzept und kein Begriff ändert sich.
    - Der Kommentar am `else`-Zweig in `ShaeEntElement.ts` (Zeilen 505–538)
      bleibt Byte für Byte. Er trägt seine Terminierungszeile bereits; die
      fehlenden Sätze gehören an den Guard, nicht neben ihn.
    - `pnpm make:todo` — kein `TODO`-Kommentar wird berührt.
- **Kein Regressionstest, und das ist entschieden.** Es bewegt sich kein
  Laufzeitverhalten: ein Kommentar und ein Absatz Prosa. Die Grenze selbst hat
  ihren Test seit Paket 2 —
  `says nothing about a move that puts the element back under the node it came from`
  in `packages/shadow-objects-testing/test/ent-element-namespace.test.js`. Eine
  Reviewer-Meldung, die hier einen Test verlangt, verlangt einen Test auf einen
  Kommentar und meldet damit nichts.
- Fundstellen, beide aus dem Review von Paket 2, beide am 2026-09-02 an
  unveränderter Stelle nachgesehen:
  - `docs/api-reference.md:2312-2315` — der Absatz »Everything else keeps the
    parent it resolved« schließt den Abschnitt `#### Entity Hierarchy` ab und
    beschreibt dieselbe Grenze wie die Zelle bei Zeile 2077, zieht sie aber
    nicht mit. Sein Kern ist eine Doppeldeutigkeit: »parent node« meint hier den
    aufgelösten Entity-Elternknoten, während dieselbe Zeile 2077 seit c784281
    vom DOM-Knoten spricht, an dem das Element hängt. Wer bei 2077 anfängt und
    hier weiterliest, liest den zweiten Satz (»A move that takes it out of its
    parent node is noticed«) als Zusage, dass ein `moveBefore()`-Reorder gemeldet
    wird — er nimmt das Element mechanisch aus der Kindliste seines
    Elternknotens, und genau der Fall bleibt stumm.
  - `src/elements/ShaeEntElement.ts:493-497` — der Kommentar am Guard begründet,
    warum die Meldung wegfällt, nicht aber, warum der Rest von
    `onParentChanged` wegfallen darf: die Methode tut drei Dinge
    (`#setParent(undefined)`, `#dispatchRequestParent()`, `#observeParentNode()`,
    Zeilen 549–556), der Zweig ersetzt sie durch das dritte allein. Ebenso fehlt
    die Zeile zur Terminierung des Selbstaufrufs; der `else`-Zweig bei :526–528
    hat seine.

- **Die beiden Sachargumente, damit der Zieltext unten nachprüfbar ist** — beide
  am 2026-09-02 am Code nachgesehen, sie sind nicht nachzuschlagen, sondern der
  Grund, warum der Text so lautet:

  1. *Warum die ersten beiden Aufrufe wegfallen dürfen.* `#setParent(undefined)`
     und `#dispatchRequestParent()` verwerfen den aufgelösten Entity-Vorfahren
     und fragen ihn neu an. Die Anfrage ist ein bubbelndes, `composed`
     `CustomEvent` von diesem Element aus — sie steigt auf, Geschwister liegen
     nie auf ihrem Weg. `getParentNodeForObserver()` liefert
     `this.parentNode ?? this.#readShadowRootHost()` (Zeile 400–405); `newParent
     === parent` heißt also, dass das Element unter demselben Knoten hängt. Eine
     Umsortierung unter Geschwistern lässt jeden Knoten darüber stehen, und auch
     die Slot-Zuordnung bleibt: benannte Slots gehen über das `slot`-Attribut,
     der Default-Slot nimmt alle Knoten ohne eines, und beides liest keine
     Geschwisterreihenfolge. Die neue Antwort wäre die alte.
  2. *Warum der Selbstaufruf terminiert.* `#observeParentNode()` beginnt mit
     `#unobserveParentNode()` (früher Ausstieg, `#observedParentNode` steht seit
     Zeile 489 auf `undefined`) und ruft dann
     `watchForRemovalFrom(parent, this, …)`. Diese Funktion arbeitet die bereits
     fälligen Records ab, *bevor* sie diesen Knoten einträgt
     (`src/elements/parentRemoval.ts`), und dieses Element steht zu diesem
     Zeitpunkt nicht in `watchers`: `dispatchRemovals` hat seinen Eintrag
     gelöscht, ehe es den Callback laufen ließ. Der Callback kann sich also
     nicht selbst erneut auslösen. Verschiebt ein Watcher aus jenem Stapel das
     Element doch woandershin, greift der `else`-Zweig weiter unten, und dessen
     Kommentar sagt bereits, wie die Kette endet.

- Vorgehen:

  1. **Der Absatz in der API-Referenz.** In
     `packages/shadow-objects/docs/api-reference.md` werden die Zeilen 2312–2315
     — der letzte Absatz von `#### Entity Hierarchy`, unmittelbar vor
     `#### Driving the Lookup by Hand` — ersetzt. Alt:

     ```markdown
     Everything else keeps the parent it resolved. One case is worth knowing: a move that leaves an
     element attached to the same parent node — a container inserted between it and its parent — goes
     unseen. A move that takes it out of its parent node is noticed, whether the element runs through
     disconnect and reconnect on the way or is watched across the move.
     ```

     Neu, wörtlich so, samt Umbruchstellen (89 bis 97 Zeichen, das Band des
     Abschnitts liegt bei 98 bis 99):

     ```markdown
     Everything else keeps the parent it resolved. Two kinds of move leave it standing and are
     therefore not reported. One inserts a container between the element and the `<shae-ent>` it hangs
     on: the ascent still reaches the same entity, and nothing about the binding changes. The other is
     an atomic `moveBefore()` that reorders the element among its siblings: it ends under the node it
     began under, and that is the comparison behind `onParentChanged`, which therefore does not run. A
     move that ends under a different node is noticed, whether the element runs through disconnect and
     reconnect on the way or is watched across the move.
     ```

     Die Zeilen 2310, 2311, 2316 und 2317 bleiben unverändert. Kein weiterer
     Absatz des Abschnitts wird angefasst.

  2. **Der Kommentar am Guard.** In
     `packages/shadow-objects/src/elements/ShaeEntElement.ts` werden die Zeilen
     493–497 ersetzt. Alt:

     ```ts
             // an atomic move reports the removal even where it puts the element back under the node it
             // came from — reordering among siblings is such a move, and nothing about the parent
             // changed. A subclass reading the two arguments against each other would be told
             // otherwise, so the report is left out. The watch fired and is gone all the same, and
             // taking it out again is what stands in its place
     ```

     Neu, wörtlich so, mit acht Leerzeichen Einrückung und den Umbruchstellen wie
     hier (89 bis 98 Zeichen je Zeile; die Nachbarblöcke laufen auf 99):

     ```ts
             // an atomic move reports the removal even where it puts the element back under the node
             // it came from — reordering among siblings is such a move, and nothing about the parent
             // changed. A subclass reading the two arguments against each other would be told
             // otherwise, so the report is left out, and with it the two things `onParentChanged` does
             // before it watches again. Those drop the resolved entity ancestor and ask for it anew,
             // and the ascent that answers begins at this element and passes the node it hangs on —
             // this move leaves that node and everything above it where it stood, so the answer would
             // be the one already held.
             //
             // The watch fired and is gone all the same, and taking it out again is what stands in its
             // place. That call registers and returns: `watchForRemovalFrom` dispatches the records
             // already due before it adds this element, and this element is not among the watchers it
             // finds there — its entry came off when this callback fired. A watcher in that batch that
             // moves the element somewhere else lands in the `else` further down, which says where the
             // chain ends.
     ```

     Die Gedankenstriche sind Geviertstriche (`—`), so wie im Block davor. Am
     Code selbst — `const newParent`, dem `if (newParent === parent)`, dem
     `#observeParentNode()` darin und dem `return` — ändert sich nichts.

  3. **Verify fahren**, siehe unten, und die Ausgabe in das Verify-Log des
     Pakets schreiben.

- Verify: `pnpm lint && pnpm exec turbo run build typecheck test --filter=@spearwolf/shadow-objects --force`
  (aus der Repo-Wurzel. Gemessen am sauberen Baum am 2026-09-02: `exit=0`,
  3 Tasks, 0 aus dem Cache, 34 Testdateien grün, Biome über 241 Dateien; Log
  `paket-3.baseline.log` im Arbeitsverzeichnis. Der engere Filter trägt: bewegt
  werden ein Kommentar in einer `.ts`-Datei und ein Absatz Prosa — kein
  exportiertes Symbol, kein Laufzeitverhalten, keine Datei unter `dist/`, und
  kein Test dieses Workspace liest Kommentar- oder Dokumentationstext. `pnpm
  lint` läuft ohnehin über das ganze Repo und hängt an keinem Filter. `--force`,
  weil ein Verify-Log einen echten Lauf belegen soll und nicht einen
  Cache-Treffer; es kostet hier nichts, der ganze Lauf dauert Sekunden.)
- Commit:

  ```
  docs(elements): what counts as a parent change, said where it is read

  The Entity Hierarchy section names both moves that leave the resolved parent
  standing and points the second one at the comparison behind onParentChanged, so
  a reader arriving from that method's row finds the same boundary here. The
  guard in the removal watcher carries the rest of its reasoning: the two calls
  that fall away with the report do so because the ascent answering them passes
  nothing the move touched, and re-watching registers and returns rather than
  reaching itself.
  ```

- Ergebnis: 1 Runde · beide Fundstellen aus Paket 2 nachgezogen — der Absatz
  »Everything else keeps the parent it resolved« in `docs/api-reference.md`
  nennt jetzt beide stummen Bewegungen und verweist auf den Vergleich hinter
  `onParentChanged`, der Kommentar am Guard in `ShaeEntElement.ts` begründet
  den Wegfall der beiden Aufrufe und die Terminierung des Selbstaufrufs · kein
  Regressionstest, und das war so entschieden: es bewegt sich kein
  Laufzeitverhalten · Review ohne kritischen oder wichtigen Befund, Zieltext an
  beiden Stellen wörtlich übernommen, Nachbarzeilen unangetastet · Verify mit
  `--force`, 3 Tasks, 0 aus dem Cache, exit 0
- Nebenbefunde: —
- Folgen: —
