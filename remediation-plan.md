# Remediation-Plan — shadow-objects

Quelle: ./audit.html vom 2026-08-23 · Branch: main · erstellt: 2026-08-23
Baseline (2026-08-23, auf `372795b` selbst gefahren): `pnpm lint` ✓ (1 info:
Biome-Config-Migrationshinweis, vorbestehend) · `pnpm typecheck` ✓ ·
`pnpm build` ✓ · `pnpm test:ci --force` ✓ 1243 Fälle (760 shadow-objects, 118
shae-offscreen-canvas, 365 shadow-objects-testing) ·
`pnpm -F shadow-objects-e2e test` ✓ 428 Fälle (Chromium und Firefox)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/26d4b56a-6925-4848-b4f2-107d8b0ec84e/scratchpad
(Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 3 von 71 Findings (1 critical, 2 high) · ausgenommen: 8 medium, 28 low,
32 info · `acknowledged` ist leer
Scope-Regel: alles ab high aufwärts, jede Kategorie — gilt auch für Befunde,
die erst im Lauf auffallen
Stand (2026-08-23): **Lauf abgeschlossen.** Fünf Pakete, fünf Commits auf `main`:
1 (`7506b58`), 2 (`ccf7ad8`), 2b (`1356027`), 3 (`7e9c807`), 4 (`c1f0421`), dazu der
Abschluss-Commit. Nichts blockiert, nichts gestasht, keine offene Folge. Alle drei
Findings des Scopes sind geschlossen: BUG-025, MEM-007 und MEM-008.

Verify auf `HEAD`, vom Orchestrator selbst gefahren: `pnpm lint` ✓ (der eine bekannte
Biome-Hinweis aus der Baseline) · `pnpm typecheck` ✓ · `pnpm build` ✓ ·
`pnpm test:ci --force` ✓ 1271 Fälle (775 shadow-objects, 119 shae-offscreen-canvas,
377 shadow-objects-testing) · `pnpm -F shadow-objects-e2e test` ✓ 430 Fälle in Chromium
und Firefox. Gegen die Baseline: 28 Unit-Fälle und 2 E2E-Fälle mehr, keiner verschwunden.
Die Node-Warnung `--localstorage-file` erscheint im ganzen Lauf nicht mehr.

Semver: keine Versionsanhebung. Beide Pakete führen ihre Änderungen unter
`## [Unreleased]` und heben die Nummer erst beim Release. Der Vorspann des
Kern-CHANGELOG bewertet den nächsten Release als minor (`0.33.0` → `0.34.0`), der des
Canvas-Pakets ebenso (`0.6.0` → `0.7.0`) — unter `1.0.0` hebt ein Breaking Change die
Minor-Stelle, und beide Pakete tragen welche aus diesem Lauf.

`./audit.html` ist nachgeführt: Score 50 → 62,5, Code-Bereich 64 → 77, Projekt-Harness
86 → 85,5. Drei Findings geschlossen, zehn neu eingetragen, 68 übernommen; das Backlog
trägt weder critical noch high. Die Datei ist nicht neu geprüft worden, sondern neu
gerechnet — das steht so in ihrer Methodik-Sektion. Kein Finding blieb mangels Beleg
offen: jedes der drei trägt Reviewer-Urteil mit Fundstelle und Paket-Hash.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen

- **Abbau der Custom Elements: aufgeschobener Abbau in `ShaeElement`** (2026-08-23).
  Das Muster, das `ShaeWorkerElement` bereits fährt, wandert in die Basisklasse:
  `disconnectedCallback` setzt ein Flag, ein Microtask später entscheidet, ob
  das Ausklinken ein Umzug war oder ein Ende, und erst dann läuft der Abbau.
  Jede Unterklasse trägt ihren Anteil bei und ruft `super`. Kein Abbau-Aufruf,
  den der Anwender selbst führen muss — React, Vue und Svelte würden ihn nicht
  führen. Damit ist die offene Frage »Haben die Custom Elements einen Abbau,
  und was löst ihn aus?« aus dem Report beantwortet.
- **`display: contents` als Stylesheet-Regel statt als Inline-Style**
  (2026-08-23). Eine einmal ins Dokument eingefügte Regel für die drei Tags
  statt eines Inline-Styles je Element. Der Konstruktor bleibt damit frei von
  allem, was das Custom-Element-Upgrade abbricht, und der Anwender kann die
  Regel per CSS-Spezifität überschreiben, statt `!important` zu brauchen.
- **`ThreeMultiViewRenderer`: Freigabe über den `onDestroy`-Rückruf der
  Creation API** (2026-08-23), den der Konstruktor für den Kontext ohnehin
  schon benutzt — statt die gleichnamige Methode auf das Symbol umzustellen.
  Eine Klasse, ein Benachrichtigungsweg, und ein späteres Umbenennen des
  Symbols kann die Freigabe nicht wieder abhängen.

- **Der Abbau von `shae-ent` und `shae-prop` ist umkehrbar** (2026-08-23).
  `destroy()` gibt Effekte, `onChange`-Anmeldungen und Signale frei,
  `connectedCallback()` nimmt sie wieder auf; das Muster liegt in der Klasse
  bereits vor. Damit bleiben die drei Zusagen in `docs/api-reference.md`
  (`:1992`, `:2016`, `:2098`) und die drei Fälle, die sie prüfen, unangetastet,
  und die Erreichbarkeit ist trotzdem geschlossen. `shae-worker` behält seinen
  endgültigen Abbau — `destroy()` und `isDestroyed` bedeuten dort etwas anderes
  als bei den beiden übrigen Elementen, und das ist der bewusst gezahlte Preis.
  Der Gegenweg, den Abbau für alle drei endgültig zu machen, hätte genau die
  Fälle gebrochen, für die der aufgeschobene Abbau überhaupt gewählt wurde: ein
  Framework, das einen Teilbaum über eine Aufgabengrenze hinweg umhängt, führt
  keinen Abbau-Aufruf.

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

- Code, Kommentare und Doku in **Englisch**. Antworten und dieser Plan bleiben
  deutsch, `git log` dieses Projekts ist englisch — Commit-Messages also
  englisch.
- **Doku ist Teil des API-Vertrags.** Eine Änderung an der öffentlichen API von
  `@spearwolf/shadow-objects` führt `packages/shadow-objects/docs/`,
  `README.md` und `CHANGELOG.md` im selben Zug nach; für
  `@spearwolf/shae-offscreen-canvas` gilt dasselbe in dessen eigenem Paket.
  Neue Arbeit steht unter `## [Unreleased]`.
- **Verbotene Analogien**: »shadow theater«, »puppet«, »puppeteer«, »light
  world«, »screen«. ECS-Begriffe verwenden. Die Bindungstabelle aus `AGENTS.md`
  §4 gilt: `RemoteWorkerEnv`, Entity, Entity Tree, `ComponentContext` bzw.
  Namespace, Token. `ComponentContext` (View-seitige Registry eines Namespace)
  und Entity Context (Dependency Injection entlang des Entity Tree) werden nie
  vermischt.
- Lint und Format sind Biome, Konfiguration liegt an der Repo-Wurzel. Keine
  Overrides je Paket.
- Wird ein TODO-Kommentar angefasst, läuft `pnpm make:todo`.
- Nach Änderungen an Quelltext oder Doku wird `AGENTS.md` auf Veralterung
  geprüft.

## Vorbestehende Fehler

Keine. Die Baseline ist auf ganzer Breite grün; der eine Biome-Hinweis ist ein
Konfigurations-Migrationsvermerk ohne Bezug zu diesem Lauf.

Zu beachten: In der Baseline führte
`packages/shadow-objects-e2e/tests/create-element.spec.ts` vier Fälle als
*erwartete* Fehlschläge (`knownFailures`) — sie zählten als bestanden, weil sie
das kaputte Verhalten festschrieben. Paket 1 hat sie umgedreht; seither trägt
kein Spec mehr einen solchen Eintrag. Dasselbe Muster im Kleinen trug
`ThreeMultiViewRenderer.spec.js:304`; Paket 3 (`7e9c807`) hat den Fall
umgedreht. Kein Spec des Repos schreibt damit noch kaputtes Verhalten fest.

## Offene Befunde

Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

- [x] `packages/shadow-objects/src/elements/ShaePropElement.ts:173-184` — ein
  auskommentierter Debug-Block mit zwei `console.log` steht als toter Code in
  `#subscribe()`. Aus Paket 1. Severity low → Audit
- [x] `packages/shadow-objects/src/elements/ShaeWorkerElement.ts:234` —
  `attributeChangedCallback` wirft, wenn `local` nach Erzeugung der Umgebung
  geändert wird. Ein Throw aus einer Custom-Element-Reaktion erreicht den
  Aufrufer von `setAttribute` nicht, sondern landet unbehandelt am `window`; ein
  `try`/`catch` um die Zuweisung fängt nichts, und der Aufrufer erfährt vom
  abgelehnten Wechsel gar nichts. Aus Paket 1. Severity medium → Audit
- [x] `Backlog.md:286` — »22 Dateien, 738 Fälle« für `packages/shadow-objects`;
  gemessen sind es 760. Aus Paket 1. Severity low → Audit. Erledigt in Paket 2:
  die Zeile trägt jetzt 23 Dateien und 767 Fälle, weil derselbe Umbau sie
  ohnehin stale gemacht hat
- [x] `packages/shadow-objects/src/elements/ShaeElement.ts:3` —
  `import type {NamespaceType} from '../types.ts';` trägt als einziger Import der
  vier Element-Dateien die Endung `.ts` statt `.js`. Unter
  `moduleResolution: Bundler` löst das auf, unter `NodeNext` bräche es. Aus
  Paket 2. Severity info → Audit
- [x] `packages/shadow-objects/src/elements/ShaeWorkerElement.ts:162` —
  `set autoSync(val: any)`: ein `any` in einem öffentlichen Setter, während der
  Getter typisiert ist; `string | boolean | number` beschreibt, was die Doku
  ohnehin zusagt. Aus Paket 2. Severity low → Audit
- [x] `packages/shadow-objects-e2e/TEST-PLAN.md:85` — der Verweis auf
  `ShaeEntElement.#setParent` nennt `ShaeEntElement.ts:527-536`; die Methode
  liegt auf `:810-855`. Die Angabe war schon vor diesem Lauf falsch. Aus
  Paket 2. Severity info → Audit
- [x] `packages/shadow-objects/src/elements/ShaePropElement.ts:402-404` — die
  Felder `#reportedMissingHost`, `#reRequestHostTarget` und `#hostLookupPending`
  stehen hinter `disconnectedCallback` mitten in der Klasse, alle übrigen Felder
  oben. Kosmetisch. Aus Paket 2. Severity info → Audit
- [x] `packages/shadow-objects/src/view/ShadowEnv.ts:68` — der `createEffect`
  im Konstruktor liest die beiden Signale der eigenen Instanz und hält sie
  darüber an der modulweiten Signal-Queue fest, bis `destroy()` läuft. Ein
  `<shae-worker>`, das nie in ein Dokument kommt, ruft kein `destroy()` und
  lässt seine `ShadowEnv` stehen — das Element selbst wird von Paket 2b
  eingesammelt, die Umgebung nicht. Vorbestehend: Feld und Effekt stehen so
  schon in `372795b`. Aus Paket 2b, Zug 0. Severity medium → Audit
- [x] `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:113-120`
  — `connectedCallback` legt `#viewComponentEffect` ohne Schutz vor einem
  fremden Effekt-Kontext an; ein `append()` aus einem `createEffect()` des
  Anwenders heraus übereignet den Effekt diesem Effekt, dessen nächster Lauf ihn
  abräumt. Der Kommentar über dem Feld beschreibt die Anfälligkeit wörtlich.
  Vorbestehend: `createEffect` steht an derselben Stelle schon in `372795b:125`.
  Aus Paket 2b. Severity medium → Audit
- [x] `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md:5` —
  `[CanvasBitmapRenderer]()` ist ein leerer Markdown-Link; drei Zeilen tiefer
  steht mit `#canvasbitmaprenderer` das Ziel, das er tragen müsste.
  Vorbestehend: dieselbe Zeile steht in `372795b`. Aus Paket 3. Severity info
  → Audit
- [x] `packages/shadow-objects/src/elements/ShaeWorkerElement.ts:247` —
  `connectedCallback` schreibt den rohen Attributwert in `autoSync$`, statt über
  den Setter zu gehen, der trimmt und kleinschreibt. Das Ergebnis hängt damit an
  einer Reihenfolge zwischen zwei Methoden statt an einer Normalisierung an der
  Schreibstelle. Vorbestehend: dieselbe Zeile steht in `372795b:203`. Aus
  Paket 2b. Severity low → Audit

Alle Einträge sind am 2026-08-23 in `./audit.html` überführt worden — je als
neues Finding mit Fundstelle, Severity und dem Vermerk, dass sie in diesem Lauf
auffielen. Keiner fiel unter die Scope-Regel: der schwerste wiegt medium, die Regel
greift ab high. Die vergebenen IDs stehen im Report, nicht hier — sie gehören ihm.

## Pakete

### [x] 1. Die Konstruktoren der Custom Elements überleben `document.createElement()`

- Findings: BUG-025 (critical)
- Ziel: Alle drei Elemente lassen sich programmatisch erzeugen und kommen dabei
  mit `viewComponent`, `uuid` und Verbindung zur Shadow Environment an, statt
  als `HTMLUnknownElement` zu enden.
- Hash: 7506b58
- Ergebnis: 2 Runden · BUG-025 behoben — kein `style`- und kein
  Attribut-Schreibvorgang bleibt in einem Konstruktor, `display: contents` steht
  als Stylesheet-Regel im Root, in dem das Element tatsächlich hängt, und die
  Attribut-Spiegelung wartet auf das erste Verbinden · Regressionstests:
  `packages/shadow-objects-testing/test/create-element.test.js` (zwölf Fälle,
  vor dem Fix rot mit `NotSupportedError: The result must not have attributes`)
  und die vier E2E-Fälle in `create-element.spec.ts`, die vorher als erwartete
  Fehlschläge geführt wurden (vor dem Fix rot, 10 Fälle über beide Browser) ·
  Verify von mir gefahren: exit 0, 1255 Fälle (Baseline 1243) plus 430 E2E
  (Baseline 428) · Runde 1 hat vier Review-Befunde geschlossen, darunter zwei
  wichtige: die Regel greift jetzt auch für eine Unterklasse unter eigenem Tag,
  und die Wurzel-`CHANGELOG.md` trägt den Abschnitt, der ihr fehlte · klein und
  offen gelassen: dass `shae-ent` seine Regel behält, nachdem ein weiterer Tag
  den Selektor verbreitert hat, ist nicht eigens zugesichert
- Nebenbefunde: → Queue (3)
- Folgen: keine
- Schnittstellen:
  - `ShaeElement` hat jetzt ein `connectedCallback()`. **Jede Unterklasse, die
    es überschreibt, muss `super.connectedCallback()` aufrufen** — sonst bleibt
    das Element ohne `display: contents` und ohne die nachgeholte
    Attribut-Spiegelung. `ShaeEntElement` und `ShaeWorkerElement` tun das
    bereits; `ShaePropElement` erbt von `HTMLElement` und ruft die Regel selbst.
  - `ShaeElement` hat `protected reflectAttribute(name: string, write: () => void)`.
    Ein Signal-Handler, der ein Attribut zurückschreibt, läuft durch diese
    Methode; vor dem ersten Verbinden wird der Schreibvorgang je Attributnamen
    geparkt und beim Verbinden nachgeholt.
  - Neues internes Modul `packages/shadow-objects/src/elements/displayContentsRule.ts`
    mit `ensureDisplayContentsRule(root: Node, tagName: string)`. Steht in
    keinem `exports`-Eintrag und wird nicht über `src/index.ts` re-exportiert.
    `dist/` wächst dadurch um `dist/src/elements/displayContentsRule.js` und
    `.d.ts` samt Maps.
  - `display: contents` ist kein Inline-Style mehr: `el.style.display` liest
    leer, die Elemente tragen kein `style`-Attribut.

### [x] 2. Ein entferntes Element wird wieder eingesammelt

- Findings: MEM-007 (high)
- Ziel: Ein `shae-ent`, `shae-prop` oder `shae-worker`, das aus dem Dokument
  entfernt wird und draußen bleibt, ist nach der nächsten Sammlung nicht mehr
  erreichbar — ein Umzug innerhalb des Dokuments löst den Abbau nicht aus.
- Bereich: `packages/shadow-objects/src/elements/`
- Hängt ab von: Paket 1 (committet, `7506b58`)
- Hash: ccf7ad8
- Ergebnis: 3 Runden über drei Runner · MEM-007 behoben — der aufgeschobene
  Abbau liegt in `ShaeElement` und im neuen `deferredTeardown.ts`, alle
  Abonnements der drei Elemente werden gelöst, und ein zurückgekehrtes
  `shae-ent`/`shae-prop` nimmt sie mit derselben `ViewComponent` und derselben
  uuid wieder auf · Regressionstest
  `packages/shadow-objects/src/elements/elementReachability.spec.ts` (7 Fälle,
  vor dem Fix 6 davon rot, der Kontrollfall grün) · die drei Bestandsfälle in
  `shadow-objects-testing`, die den umkehrbaren Abbau zusichern, wurden nicht
  angefasst und sind grün · Verify von mir gefahren: exit 0, 769 + 118 + 377 =
  1264 Fälle plus 430 E2E, `…/scratchpad/paket-2.verify.log` · im Review
  nachgemessen und für Paket 2b festgehalten: `Effect#destroy()` führt die
  Aufräumfunktion aus, `Signal.onChange()` gibt ein destrukturierbares
  `effect.destroy` zurück — die `link()`-Verbindung in `ShaePropElement`
  braucht kein eigenes Feld · Abweichung vom Detailplan: der Erweiterungspunkt
  für die Unterklassen heißt `teardown()`, nicht `destroy()`; der Einmal-Schutz
  sitzt in `destroy()` und ruft `teardown()` genau einmal
- Nebenbefunde: → Queue (1)
- Folgen: sechs Stellen, die dieser Umbau erzeugt hat, alle in denselben vier
  Element-Dateien und im neuen Spec — `ShaePropElement.ts:373` (kein
  `teardown()`), `ShaeWorkerElement.ts:200` (Frühausstieg vor
  `ensureDisplayContentsRule`), `elementReachability.spec.ts:100ff` (die Fälle
  räumen nicht auf), `deferredTeardown.ts:36-41` (`#isBooked` bleibt gesetzt),
  `ShaeEntElement.ts:426` (`restore()` synchronisiert bedingungslos),
  `ShaeElement.ts:142` und `ShaePropElement.ts:295` (`restore()` legt Effekte im
  fremden Effekt-Kontext an). Alle sechs sind mit Paket 2b (`1356027`) erledigt
- Schnittstellen:
  - `ShaeElement` hat `get isDestroyed(): boolean`, `destroy(): void`,
    `protected teardown(): void`, `protected restore(): void` und ein
    `disconnectedCallback(): void`. **Der Einmal-Schutz sitzt in `destroy()`;
    eine Unterklasse überschreibt `teardown()` und `restore()`, nicht
    `destroy()`**, und ruft in beiden `super`. `ShaeEntElement` tut das
    (`:419`, `:677`), `ShaeWorkerElement` überschreibt nur `teardown()`
    (`:306`) — es kehrt nie zurück.
  - `ShaePropElement` erbt weiter von `HTMLElement` und führt dieselbe Mechanik
    in eigener Hand: `get isDestroyed()`, `destroy()`, `protected restore()`.
    Ein `teardown()` hat es nicht — siehe `Folgen:`.
  - `ShaeWorkerElement.#deferDestroy`, `#shouldDestroy`, `#destroyPending` und
    `#destroyed` sind entfallen. `connectedCallback()` steigt bei `isDestroyed`
    sofort aus: dieser Abbau nimmt die Shadow Environment mit und ist
    endgültig, anders als bei den beiden übrigen Elementen.
  - Neues internes Modul
    `packages/shadow-objects/src/elements/deferredTeardown.ts` mit
    `class DeferredTeardown { constructor(run: () => void); schedule(): void; cancel(): void }`.
    Steht in keinem `exports`-Eintrag und wird nicht über `src/index.ts`
    re-exportiert. `dist/` wächst um `dist/src/elements/deferredTeardown.js` und
    `.d.ts` samt Maps.
  - `packages/shadow-objects/vitest.config.ts` fährt `pool: 'forks'` mit
    `execArgv: ['--expose-gc']`, beide auf oberster Ebene unter `test` (vitest 4
    kennt `test.poolOptions` nicht mehr). `globalThis.gc` ist damit im
    Testprozess des Kernpakets vorhanden; ein Spec, der es braucht, schlägt fehl
    statt zu überspringen.

### [x] 2b. Ein nie angehängtes Element wird eingesammelt

- Findings: MEM-007 (high), verbleibender Teil
- Ziel: Ein `shae-ent`, `shae-prop` oder `shae-worker`, das per
  `document.createElement()` erzeugt und nie in ein Dokument gehängt wird, ist
  nach der nächsten Sammlung nicht mehr erreichbar.
- Bereich: `packages/shadow-objects/src/elements/`
- Hängt ab von: Paket 2 (committet, `ccf7ad8`)
- Hash: 1356027
- Modell: stärkste Stufe
- Dateien: `packages/shadow-objects/src/elements/ShaeElement.ts`,
  `ShaeEntElement.ts`, `ShaePropElement.ts`, `ShaeWorkerElement.ts`,
  `deferredTeardown.ts`, `elementReachability.spec.ts`,
  `packages/shadow-objects/CHANGELOG.md`,
  `packages/shadow-objects/docs/api-reference.md`
- Warum eigenes Paket: Paket 2 schließt den Weg »entfernt und bleibt draußen« —
  der Abbau hängt an `disconnectedCallback`, und den bekommt ein Element, das nie
  verbunden war, nie zu sehen. Seine Konstruktor-Anmeldungen stehen damit für die
  Lebensdauer der Seite an der modulweiten Signal-Queue. Der Weg, die Anmeldungen
  erst beim ersten Verbinden einzurichten, schreibt die Spiegelungs-Mechanik an,
  die Paket 1 festgelegt hat (`reflectAttribute`, `#pendingReflections`), und war
  deshalb nicht nebenbei in Paket 2 zu haben. Seit Paket 1 den
  `createElement`-Pfad gangbar gemacht hat, ist der Fall kein exotischer mehr.
- Abgleich (2026-08-23, gegen `ccf7ad8`): Der Sachverhalt steht unverändert, die
  Fundstellen des Audits sind gewandert. Die Anmeldungen liegen seit `ccf7ad8`
  gebündelt in je einer privaten `#subscribe()`, die der Konstruktor als letzte
  Zeile ruft: `ShaeElement.ts:106` (eine), `ShaeEntElement.ts:242` (sechs),
  `ShaePropElement.ts:161` (vier). `ShaeWorkerElement` hat keine `#subscribe()`;
  seine sieben Anmeldungen stehen direkt im Konstruktor (`:67-127`):
  `#envViewBinding`, vier `on(this.shadowEnv, …)`, ein `autoSync$.onChange`
  ohne Handle und die beiden Effekte aus `#createAutoSyncEffect()` und
  `#createImportScriptEffect()`. Gegenstück ist `teardown()` bzw. `destroy()`,
  Wiederaufbau ist `restore()`.
- Der Weg in einem Satz: `restore()` wird von »der Rückweg nach einem Abbau« zu
  »die Anmeldungen gehen hoch«, und der erste Verbindungsvorgang ruft es genauso
  wie eine Rückkehr; der Konstruktor liest nur noch Attribute in Signale.
- Vorgehen:
  1. **`ShaeElement.ts` — Anmeldungen ab dem ersten Verbinden.** Im Konstruktor
     entfällt der Aufruf `this.#subscribe()`; `updateNamespace(this, this.ns$)`
     bleibt stehen. Der Kommentar darüber behauptet heute, die Anmeldung stehe
     vor dem ersten Lesen und diese Reihenfolge sei beobachtbar — er wird
     ersetzt: der Lesevorgang füllt das Signal mit dem, was das Attribut
     buchstabiert, es hört niemand zu, und der normalisierte Wert erreicht das
     Attribut beim ersten Verbinden über `restore()`.
     Neues privates Feld `#subscribed = false` neben `#destroyed`.
     `connectedCallback()` bekommt direkt hinter `this.#teardown.cancel()`:
     ```ts
     this.#destroyed = false;
     if (!this.#subscribed) {
       this.#subscribed = true;
       this.restore();
     }
     ```
     Das steht vor `ensureDisplayContentsRule(…)` und vor `#wasConnected = true`,
     damit die Spiegelungen aus `restore()` in `#pendingReflections` landen und
     wenige Zeilen später mit allen anderen ausgeführt werden.
     `destroy()` setzt zusätzlich `#subscribed = false`.
     `isDestroyed` bleibt für ein frisch erzeugtes Element `false` — die beiden
     Zustände »abgebaut« und »nicht angemeldet« sind getrennte Felder und dürfen
     nicht zusammengelegt werden.
     Die Docstrings von `restore()`, `teardown()`, `destroy()` und der Klasse
     sagen heute, `restore()` sei der Rückweg einer Rückkehr; sie sagen künftig,
     dass es die Anmeldungen hochzieht — beim ersten Verbinden ebenso wie nach
     einem Abbau. `#subscribe()` bleibt als Methode bestehen, ihr Docstring
     nennt `restore()` als einzigen Aufrufer; die Begründung »läuft aus dem
     Konstruktor der Basisklasse« fällt weg.
  2. **Fremder Effekt-Kontext.** `EffectImpl.createEffect` hängt einen neuen
     Effekt unbesehen als Kind an den gerade laufenden Effekt, und
     `Signal.onChange()` läuft über denselben Weg. Ein
     `container.append(ent)` innerhalb eines `createEffect()` des Anwenders
     würde also sämtliche Anmeldungen dem fremden Effekt übereignen, dessen
     nächster Lauf sie wieder abräumt, ohne dass `isDestroyed` etwas davon
     merkt. Deshalb steht der **gesamte Rumpf** von `connectedCallback()` in
     `hibernate(() => { … })` — in `ShaeElement`, `ShaeEntElement`,
     `ShaePropElement` und `ShaeWorkerElement` je in der eigenen Klasse, samt
     dem `super.connectedCallback()`-Aufruf; verschachtelte `hibernate()`-Rahmen
     sind ausdrücklich zulässig. `hibernate` kommt aus `@spearwolf/signalize`.
     Der Grund wird einmal in `ShaeElement` als Kommentar ausgeschrieben, in den
     übrigen drei Klassen genügt ein Halbsatz.
     Es geht nicht nur um `restore()`: `ShaeEntElement.#setupViewComponentEffect()`
     (`:465`) meldet bei jedem Verbinden ein `onChange` an und trägt dieselbe
     Anfälligkeit.
     Ein aktiver äußerer `batch()` wird von `hibernate()` vor dem Rumpf
     geleert — das ist dokumentiertes Verhalten. Bricht dadurch ein Bestandsfall,
     wird der Rahmen auf die anmeldenden Aufrufe eingeengt (`restore()` und
     `#setupViewComponentEffect()`), und die Abweichung samt dem gebrochenen Fall
     steht im Report.
  3. **`ShaeEntElement.ts`.** Im Konstruktor entfällt `this.#subscribe()`; die
     beiden Lesevorgänge `#updateTokenValue()` und
     `#updateForwardCustomEventsValue()` bleiben, der Kommentar über ihnen wird
     an den neuen Ablauf angepasst. `restore()` (`:419`) bleibt in seiner Form —
     `super.restore()`, `#subscribe()`, die drei Nachzieh-Aufrufe — und sein
     Docstring nennt künftig auch den ersten Verbindungsvorgang.
     `#subscribe()` (`:242`): Docstring auf `restore()` als einzigen Aufrufer.
     Dazu die Stelle aus dem Review zu Paket 2: `#writeTokenToViewComponent()`
     (`:397`) ruft heute bedingungslos `syncShadowObjects()`. Es bekommt einen
     Vergleich gegen den Wert, der schon dasteht:
     ```ts
     const vc = this.viewComponent$.value;
     if (vc == null || vc.token === token) return;
     vc.token = token;
     this.syncShadowObjects();
     ```
     mit einem Kommentar, der sagt, warum: eine Rückkehr, zwischen der niemand
     den Token angefasst hat, kostet damit keinen Sync mehr.
  4. **`ShaePropElement.ts`.** Im Konstruktor entfällt `this.#subscribe()`, der
     `batch()`-Block der vier Attribut-Lesevorgänge bleibt. Neues Feld
     `#subscribed = false`; `connectedCallback()` (`:310`) bekommt dieselben
     vier Zeilen wie `ShaeElement` — hinter `this.#teardown.cancel()`, vor
     `ensureDisplayContentsRule(…)` und vor dem `batch()`-Block.
     Dazu die zweite Stelle aus dem Review zu Paket 2: die Klasse bekommt den
     abgesicherten Erweiterungspunkt, den die beiden übrigen Elemente haben.
     `destroy()` (`:380`) trägt nur noch den Einmal-Schutz und ruft
     `this.teardown()`; die Freigaben — `#stopListeningForHostChanges()`,
     `#hostBinding`, `#declareProperty`, `#writePropertyValue`, `#convertValue`
     — wandern in ein neues `protected teardown(): void`. `#subscribed = false`
     setzt `destroy()`, nicht `teardown()`. Die Begründung, die
     `ShaeElement.destroy()` (`:213-218`) für diese Aufteilung gibt, gilt hier
     wörtlich und wird in eigenen Worten wiederholt.
  5. **`ShaeWorkerElement.ts`.** Die sieben Anmeldungen des Konstruktors
     (`:67-127`) wandern in ein neues `protected override restore()`, das
     `super.restore()` als Erstes ruft: `#envViewBinding`, die vier
     `on(this.shadowEnv, …)`, das `autoSync$.onChange` und die beiden Aufrufe
     `#createAutoSyncEffect()` und `#createImportScriptEffect()`. Der
     Konstruktor behält nur `super()`. `restore()` läuft für dieses Element
     genau einmal — `connectedCallback()` weist ein abgebautes Element ab, und
     die Rückkehr, für die `restore()` bei den beiden anderen Elementen steht,
     gibt es hier nicht.
     Der Docstring an `teardown()` (`:300-306`) sagt heute, `restore()` sei
     deshalb nicht überschrieben; er wird auf den neuen Stand gebracht.
     Dazu die dritte Stelle aus dem Review zu Paket 2: der Frühausstieg in
     `connectedCallback()` (`:200`) steht vor `super.connectedCallback()` und
     damit vor `ensureDisplayContentsRule`. Er installiert die Regel künftig
     selbst, bevor er zurückkehrt:
     ```ts
     if (this.isDestroyed) {
       ensureDisplayContentsRule(this.getRootNode(), this.localName);
       return;
     }
     ```
     mit einem Kommentar: Wie das Element rendert, ist unabhängig davon, ob es
     noch etwas hört. Der Import von `ensureDisplayContentsRule` kommt dazu.
  6. **`deferredTeardown.ts`.** Der Microtask (`:36-41`) setzt `#isBooked` vor
     `run()` zurück, damit das Feld hält, was sein Kommentar zusagt:
     ```ts
     queueMicrotask(() => {
       this.#isAsking = false;
       if (!this.#isBooked) return;
       this.#isBooked = false;
       this.#run();
     });
     ```
     Vor `run()`, nicht danach: ein `schedule()` aus dem Abbau heraus bucht so
     eine neue Runde, statt in der laufenden unterzugehen.
  7. **Regressionstests in `elementReachability.spec.ts`, zuerst und rot.**
     Neuer Helfer neben `liveAndLeave`:
     ```ts
     const createAndDrop = async (tagName: string, prepare?: (el: HTMLElement) => void): Promise<WeakRef<HTMLElement>> => {
       const el = document.createElement(tagName);
       prepare?.(el);
       return new WeakRef(el);
     };
     ```
     mit demselben Kommentar-Grund wie bei `liveAndLeave`: das Element darf aus
     dem Spec-Rumpf heraus nicht erreichbar sein.
     Vier Sammlungsfälle nach dem Muster der bestehenden, in derselben
     Reihenfolge Kontrolle zuerst: `PLAIN_TAG`, `SHAE_ENT`, `SHAE_PROP` (mit
     `name`-Attribut), `SHAE_WORKER` (mit `ATTR_NO_AUTOSTART`) — jeweils
     »collects a … that is created and never connected«. Die drei Bibliotheks-
     fälle sind vor dem Fix rot; der rote Lauf gehört in den Report.
     Zwei Verhaltensfälle dazu, die den Umbau festnageln:
     - Ein `<shae-ent>`, das per `createElement` erzeugt wird, `ns="  local  "`
       gesetzt bekommt und danach angehängt wird, trägt nach dem Verbinden
       `ns="local"` — die Normalisierung, die bisher die Konstruktor-Anmeldung
       zurückgeschrieben hat, kommt jetzt aus `restore()`.
     - Ein `<shae-ent>`, das aus dem Rumpf eines `createEffect()` heraus
       angehängt wird: nach einem erneuten Lauf dieses fremden Effekts
       reagiert das Element weiter — etwa `ent.token = 'x'` schlägt sich im
       `token`-Attribut nieder. Ohne den `hibernate()`-Rahmen ist der Fall rot.
  8. **Aufräumen im Spec.** Die Fälle ab `:100` hinterlassen Elemente im
     Dokument (`:176`, `:216`) und im abgetrennten `host` (`:244-248`). Die vier
     `WeakRef`-Fälle bleiben nur deshalb aussagekräftig, weil sie oben stehen,
     und dieses Paket fügt genau solche Fälle hinzu. Ein `afterEach` leert
     `document.body` (`document.body.replaceChildren()`), jeder Fall gibt seine
     eigenen lokalen Bindungen auf, und ein Kommentar an der `describe`-Grenze
     sagt, warum kein Sammlungsfall auf seiner Stellung im Spec beruhen darf.
  9. **Doku und CHANGELOG im selben Zug.**
     - `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`: ein Eintrag,
       dass die Elemente ihre Anmeldungen beim ersten Verbinden hochziehen und
       ein nie angehängtes Element damit einsammelbar ist; ein zweiter, dass
       `<shae-prop>` `teardown()` als Erweiterungspunkt hat. Die Zeile `:177`
       (»a plain `destroy()` of the same shape«) beschreibt danach eine Form,
       die es nicht mehr gibt, und wird auf den neuen Stand gebracht.
     - `packages/shadow-objects/docs/api-reference.md`: der
       `<shae-prop>`-Abschnitt bekommt `teardown()` und die
       Überschreibungsregel in derselben Form, in der sie für `<shae-ent>` und
       `ShaeElement` dort steht. Wo die Doku den Abbau und die Rückkehr
       beschreibt, kommt der erste Verbindungsvorgang als der Moment dazu, in
       dem die Anmeldungen entstehen.
     - `AGENTS.md` auf Veralterung prüfen. Die Wurzel-`CHANGELOG.md` bleibt
       unberührt — an Build, Testrunner oder Werkzeugen ändert sich nichts.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci --force && pnpm -F shadow-objects-e2e test`
- Commit: `fix(elements)!: an element subscribes on its first connect and normalises its attributes`
- Ergebnis: 2 Runden · MEM-007 vollständig behoben — die Anmeldungen entstehen
  ausschließlich in `restore()`, gerufen aus `connectedCallback` hinter einem
  `#subscribed`-Gatter, und ein per `document.createElement()` erzeugtes,
  nie angehängtes Element wird eingesammelt · Regressionstests in
  `packages/shadow-objects/src/elements/elementReachability.spec.ts`: die drei
  Fälle »collects a <shae-ent|shae-prop|shae-worker> that is created and never
  connected« waren vor dem Fix rot (`AssertionError: expected <shae-ent /> to be
  undefined`), dazu ein Kontrollfall und zwei Verhaltensfälle, darunter »keeps a
  <shae-ent> that was appended from inside a foreign effect working when that
  effect runs again« (ohne den `hibernate()`-Rahmen rot) · alle sechs Stellen aus
  dem Review zu Paket 2 mit erledigt · Runde 1 hat zwei wichtige Befunde
  geschlossen: zwei Absätze in `docs/api-reference.md` behaupteten weiter, Markup
  behalte seine Schreibweise · Verify von mir gefahren: exit 0, 775 + 118 + 377 =
  1270 Fälle plus 430 E2E, `…/scratchpad/paket-2b.verify.log` · Abweichungen vom
  Detailplan: `ShaeWorkerElement.restore()` zieht `auto-sync` und den
  `src`-Import nach (ohne den Nachzug fiel `auto-sync="YES"`), `#envViewBinding`
  bekommt bewusst keinen — ein hier gebauter `ComponentContext` ist einer, in den
  Entities eintreten, und `start()` bleibt der Ort, der den Namensraum auflöst —,
  und der Konstruktor der Klasse entfällt ganz statt leer zu bleiben
- Nebenbefunde: → Queue (2)
- Folgen: keine offen. Aus dem Verify fiel die Node-Warnung zum Storage auf, die
  als Paket 4 geschnitten ist — der Abgleich dort hat sie als vorbestehend
  nachgewiesen, sie ist keine Folge dieses Laufs
- Schnittstellen:
  - **Anmeldungen entstehen nicht mehr im Konstruktor.** `ShaeElement` gattert
    über ein privates `#subscribed`; `connectedCallback` ruft `restore()` beim
    ersten Verbinden genauso wie nach einem Abbau. Eine Unterklasse, die etwas
    anmeldet, tut das in `restore()` und ruft `super.restore()` — ein Konstruktor
    ist dafür der falsche Ort. `isDestroyed` bleibt für ein frisch erzeugtes
    Element `false`: »abgebaut« und »nicht angemeldet« sind getrennte Felder.
  - **Jeder `connectedCallback` läuft in `hibernate()`** — in allen vier Klassen,
    samt dem `super`-Aufruf. Ohne den Rahmen übereignet ein `append()` aus einem
    fremden `createEffect()` heraus sämtliche Abonnements diesem Effekt. Wer eine
    Klasse dazunimmt, die beim Verbinden anmeldet, braucht denselben Rahmen. Die
    Kehrseite: ein laufender `batch()` des Anwenders wird geleert, bevor der Rumpf
    läuft.
  - `ShaePropElement` hat `protected teardown(): void`; `destroy()` trägt nur noch
    den Einmal-Schutz und ruft es. Damit haben alle drei Elemente denselben
    abgesicherten Erweiterungspunkt.
  - `ShaeWorkerElement` überschreibt `protected restore()` und hat keinen
    Konstruktor mehr. `restore()` läuft dort genau einmal — `connectedCallback`
    weist ein abgebautes Element ab.
  - **Verhalten, am veröffentlichten Vertrag sichtbar:** `token`,
    `forward-custom-events` und `ns` schreiben beim ersten Verbinden ihre
    kanonische Schreibweise aufs Attribut, so wie `auto-sync` es tat.
    `token="  x  "` wird zu `token="x"`, ein leerer oder nur aus Leerzeichen
    bestehender Wert verliert das Attribut, `forward-custom-events=" , , "`
    ebenso. Acht Fälle in `shadow-objects-testing` hielten den Gegenzustand fest
    und sind umgedreht; `CHANGELOG.md` führt es als Breaking.
  - `DeferredTeardown` setzt `#isBooked` vor dem Lauf zurück; ein `schedule()`
    aus dem Abbau heraus bucht damit eine neue Runde.

**MEM-007 · high · `packages/shadow-objects/src/elements/ShaeElement.ts:52`
(`ns$.onChange`), `ShaeEntElement.ts:281` (`createEffect` im Konstruktor),
`ShaePropElement.ts`, `ShaeWorkerElement.ts:280-290`** — Jedes erzeugte
`shae-ent`, `shae-prop` und `shae-worker` bleibt für die Lebensdauer der Seite
erreichbar

signalize meldet jeden Effekt und jeden `onChange`-Hörer unter der Signal-ID am
modulweiten `globalSignalQueue` an, und eventize hält seine Hörer hart, ohne ein
einziges `WeakRef` im ausgelieferten Code. Ein Effekt, der nie zerstört wird,
hängt damit an einem Modul-Global, und seine Closure hält das Element.
`ShaeElement` registriert im Konstruktor `ns$.onChange`, `ShaeEntElement`
zusätzlich einen `createEffect` und zwei weitere `onChange`-Hörer; zerstört wird
davon nichts. `ShaeWorkerElement.destroy()` räumt drei Signale ab, `ns$` gehört
nicht dazu. Gemessen mit happy-dom und `node --expose-gc`: von zwei erzeugten,
angehängten und wieder entfernten Kontroll-Elementen ohne Framework-Bezug
überlebt keines die Sammlung, von je zwei `shae-ent` und `shae-prop` überleben
alle vier. Für ein Framework, dessen erklärter Zweck langlebige Anwendungen mit
dynamischem DOM sind, wächst der Verbrauch damit monoton mit der Zahl der je
erzeugten Elemente. Das Canvas-Paket kennt den Mechanismus und schützt sich
davor: der Kommentar über `#viewComponentEffect` in
`ShaeOffscreenCanvasElement.js:66-69` beschreibt ihn wörtlich.

Empfehlung: Das Muster, das `ShaeWorkerElement` bereits fährt, in `ShaeElement`
hochziehen: ein aufgeschobener Abbau in `disconnectedCallback`, der über einen
Microtask prüft, ob das Element wirklich draußen bleibt, denn ein Ausklinken
kann ein Umzug sein, und danach Effekte, `onChange`-Abmeldungen und Signale
abräumt. Jede Unterklasse trägt ihren Anteil bei und ruft `super`. Ein Fall je
Element, der nach dem Entfernen und einer erzwungenen Sammlung eine `WeakRef`
prüft, hält das Ergebnis fest.

*Der aufgeschobene Abbau selbst ist mit Paket 2 (`ccf7ad8`) erledigt. Offen ist
allein der Weg, den kein `disconnectedCallback` erreicht: das Element, das nie
verbunden war.*

### [x] 3. Der Renderer des Canvas-Pakets gibt seinen WebGL-Kontext frei

- Findings: MEM-008 (high)
- Ziel: Ein abgebauter `ThreeMultiViewRenderer` gibt `renderer.dispose()` und
  das `OffscreenCanvas` frei, statt einen WebGL-Kontext liegen zu lassen.
- Bereich: `packages/shae-offscreen-canvas/src/shadow-objects/`
- Hängt ab von: — (anderes Paket, kein Bezug zu 1, 2 und 2b)
- Hash: 7e9c807
- Modell: mittlere Stufe
- Dateien:
  `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js`,
  `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.spec.js`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`,
  `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`,
  `TODO.md` (generiert, siehe Schritt 4)
- Abgleich (2026-08-23, gegen `1356027`): unverändert an der Fundstelle des
  Audits. `onDestroy()` steht als gewöhnliche Methode auf
  `ThreeMultiViewRenderer.js:82-85`; der Kernel ruft den Hook unter dem Symbol
  aus `in-the-dark/events.ts:21` (`Kernel.ts:842`), eine gleichnamige
  Zeichenkette erreicht er nie. Der Konstruktor (`:15-29`) hält bereits einen
  `onDestroy`-Rückruf der Creation API (`:18-20`), der `multiViewRenderer.set(null)`
  schreibt; `ShadowObjectCreationScope.onDestroy()` (`:645`) sammelt ihn, und
  der Abbau führt ihn gekapselt aus (`:273`). `ThreeMultiViewRenderer.spec.js:304`
  führt den Fall »does not dispose the renderer on destroy« unverändert.
- Vorgehen:
  1. **Die Freigabe wandert in den Rückruf der Creation API.** Die Methode
     `onDestroy()` (`:82-85`) entfällt ersatzlos. Der bestehende Rückruf im
     Konstruktor (`:18-20`) nimmt ihren Inhalt auf und wird zu:
     ```js
     onDestroy(() => {
       multiViewRenderer.set(null);
       this.#views.clear();
       this.renderer.dispose();
       this.renderer = null;
       this.canvas = null;
     });
     ```
     Ein Kommentar darüber sagt, warum die Freigabe hier hängt: der Rückruf der
     Creation API ist der eine Weg, auf dem der Kernel diese Klasse vom Ende
     ihrer Entity benachrichtigt, und ein Umbenennen des Lebenszyklus-Symbols
     kann ihn nicht abhängen. Dass der Rückruf im Konstruktor vor
     `this.canvas = …` und `this.renderer = …` steht, ist in Ordnung — sein
     Rumpf läuft erst beim Abbau.
     `#views` wird mit geleert: die Einträge halten `scene` und `camera` der
     Anwendung fest.
  2. **`renderView()` (`:37`) bekommt als erste Zeile einen Schutz:**
     ```js
     if (this.renderer == null) return;
     ```
     Mit Kommentar: ein Frame, der schon unterwegs war, als der Abbau lief,
     findet weder Renderer noch Canvas vor. `ThreeRenderView` wertet das
     ausbleibende Bild als »nichts zu übertragen« (`ThreeRenderView.js:77-82`)
     und ist damit bedient; ohne den Schutz läuft der Aufruf in einen
     `TypeError` im Rumpf einer `async`-Funktion, den niemand abfängt.
  3. **Regressionstests zuerst, und rot.** In
     `ThreeMultiViewRenderer.spec.js` wird der Fall `:304` umgedreht. Er heißt
     künftig »disposes the renderer and releases the canvas on destroy« und
     hält die Freigabe fest; der Renderer wird vor dem Abbau in eine lokale
     Bindung genommen, weil `mvr.renderer` danach `null` ist:
     ```js
     const {uuid, mvr} = create();
     const {renderer} = mvr;

     env.kernel.destroyEntity(uuid);

     expect(renderer.log).toContainEqual(['dispose']);
     expect(mvr.renderer).toBeNull();
     expect(mvr.canvas).toBeNull();
     ```
     Der Kommentarblock darüber (`:299-303`), der das Ausbleiben der Freigabe
     erklärt, entfällt ersatzlos.
     Ein zweiter Fall hält den Schutz aus Schritt 2 fest — »answers no image
     once its entity is gone«: einen View anlegen, `view.scene` und
     `view.camera` mit Attrappen belegen (`{}` genügt, der Renderer des Specs
     protokolliert nur), `env.kernel.destroyEntity(uuid)`, dann
     `await expect(mvr.renderView(view)).resolves.toBeUndefined()`.
     Beide Fälle sind vor der Änderung rot — der erste, weil nichts freigegeben
     wird, der zweite, weil `renderView()` ein Bild liefert. Der rote Lauf
     gehört in den Report.
  4. **`pnpm make:todo` laufen lassen.** Der TODO-Kommentar in
     `ThreeMultiViewRenderer.js:24` verschiebt sich um die Zeilen aus Schritt 1,
     und `TODO.md:19` nennt seine Zeilennummer. Die neu erzeugte `TODO.md`
     gehört in den Commit. Der Kommentar selbst wird nicht angefasst.
  5. **Doku und CHANGELOG im selben Zug.**
     - `packages/shae-offscreen-canvas/CHANGELOG.md`, unter `## [Unreleased]`
       in die bestehende Liste eingereiht: ein abgebauter
       `ThreeMultiViewRenderer` ruft `dispose()` auf seinem `WebGLRenderer`,
       gibt `renderer` und `canvas` auf und leert seine RenderView-Sammlung;
       `renderView()` antwortet danach mit `undefined`.
     - `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`: der
       Abschnitt `### ThreeMultiViewRenderer` (`:66`) bekommt hinter der
       RenderView-API zwei Sätze zum Abbau — mit dem Ende der Entity gibt der
       Renderer seinen WebGL-Kontext frei, und `renderView()` liefert danach
       `undefined`.
     - Wurzel-`CHANGELOG.md` und `packages/shadow-objects/CHANGELOG.md` bleiben
       unberührt: weder Build noch Kernpaket bewegen sich. `AGENTS.md` auf
       Veralterung prüfen.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci --force`
- Commit: `fix(canvas): the multi view renderer releases its webgl context when its entity ends`
- Ergebnis: 1 Runde · MEM-008 behoben — die Freigabe hängt am
  `onDestroy`-Rückruf der Creation API im Konstruktor
  (`ThreeMultiViewRenderer.js:18-27`), dem Weg, den der Kernel tatsächlich geht;
  sie ruft `dispose()`, leert `#views` und gibt `renderer` und `canvas` auf ·
  Regressionstests in `ThreeMultiViewRenderer.spec.js:299-317`: »disposes the
  renderer and releases the canvas on destroy« (der umgedrehte Fall, vor dem Fix
  rot mit `expected [...] to deep equally contain [ 'dispose' ]`) und »answers no
  image once its entity is gone« (vor dem Fix rot, `expected { mark:
  'imageBitmap' } to be undefined`) · Review ohne Befund · Verify von mir
  gefahren: exit 0, 775 + 119 + 377 = 1271 Fälle,
  `…/scratchpad/paket-3.verify.log`, dazu `pnpm -F shadow-objects-e2e test`
  exit 0, 430 Fälle über Chromium und Firefox, `…/scratchpad/paket-3.e2e.log` ·
  kein Spec trägt mehr einen Fall, der kaputtes Verhalten festschreibt — die Zeile dazu im Abschnitt »Vorbestehende
  Fehler« ist damit erledigt · keine Abweichung vom Detailplan
- Nebenbefunde: → Queue (1)
- Folgen: keine
- Schnittstellen:
  - `ThreeMultiViewRenderer` hat keine Methode `onDestroy()` mehr. Wer die Klasse
    erweitert, hängt eine Freigabe an den `onDestroy`-Rückruf der Creation API;
    eine gleichnamige Methode erreicht der Kernel nicht.
  - Nach dem Ende der Entity sind `renderer` und `canvas` der Instanz `null`,
    `#views` ist leer, und `renderView()` antwortet mit `undefined` statt mit
    einem `ImageBitmap`. Ein Aufrufer, der ein Bild erwartet, prüft es ab —
    `ThreeRenderView.js:77-82` tut das bereits.

**MEM-008 · high · `packages/shae-offscreen-canvas/src/shadow-objects/ThreeMultiViewRenderer.js:82-85`**
— `ThreeMultiViewRenderer` gibt seinen WebGL-Renderer nie frei

Die Klasse tragt eine gewöhnliche Methode namens `onDestroy`, die
`renderer.dispose()` ruft. Der Kernel benachrichtigt den Lebenszyklus-Hook aber
unter dem Symbol aus `in-the-dark/events.ts:21`, nicht unter der gleichnamigen
Zeichenkette. Die Methode wird deshalb nie erreicht, und mit ihr weder
`dispose()` noch die Freigabe des `OffscreenCanvas`. Jeder abgebaute Renderer
hinterlässt einen WebGL-Kontext; Browser deckeln deren Zahl bei etwa sechzehn
und reißen beim Überschreiten die ältesten ab, was in einer Anwendung mit
wechselnden Szenen genau die Ansicht trifft, die noch gebraucht wird. Der
Zustand ist im Paket festgeschrieben: `ThreeMultiViewRenderer.spec.js:304` prüft
unter dem Namen »does not dispose the renderer on destroy« das kaputte Verhalten
und nennt es im Kommentar darüber »measured, not endorsed«.

Empfehlung: Die Freigabe an den `onDestroy`-Rückruf der Creation API hängen, den
der Konstruktor für den Kontext ohnehin schon benutzt, oder die Methode auf das
importierte Symbol umstellen. Den Fall danach umdrehen, sodass er die Freigabe
belegt statt ihres Ausbleibens.

### [x] 4. Der Testlauf läuft ohne die Node-Warnung zum Storage

- Findings: — (aus dem Verify von Paket 2b aufgefallen)
- Ziel: Kein Testlauf des Workspace gibt noch die Node-Warnung
  »`--localstorage-file` was provided without a valid path« aus, und
  happy-doms Storage bleibt über `globalThis.localStorage` erreichbar.
- Bereich: `packages/shadow-objects/vitest.setup.ts`
- Hängt ab von: — (kein Bezug zu 3)
- Hash: c1f0421
- Modell: mittlere Stufe
- Dateien: `packages/shadow-objects/vitest.setup.ts`, `CHANGELOG.md` (Wurzel)
- Abgleich (2026-08-23, gegen `7e9c807`): Der Umriss des Grobplans trifft nicht
  zu, und die Herkunftszeile »Folge von: Paket 2« fällt damit weg — beides
  nachgemessen, beides ersetzt durch den Befund unten. `vitest.config.ts` wird
  nicht angefasst.
  1. **`execArgv` ersetzt nichts.** Der Fork-Pool von vitest 4 setzt seine
     Flags als `[...options.execArgv, ...conditions, ...project.config.execArgv]`
     zusammen (`vitest/dist/chunks/cli-api.*.js:3663-3666`); die eigene Angabe
     wird angehängt. In den Flags, die vitest selbst setzt (`resolveOptions`,
     ebenda `:3733`), kommt `--localstorage-file` überhaupt nicht vor.
  2. **Die Warnung stammt aus dem Setup.** Node emittiert sie beim ersten
     Lesen des Accessors `globalThis.localStorage`, wenn kein
     `--localstorage-file` gesetzt ist — nachgestellt mit
     `node -e 'typeof localStorage?.getItem'`, das die Zeile ausgibt, während
     ein Lauf ohne diesen Zugriff schweigt. Genau dieser Zugriff steht in
     `packages/shadow-objects/vitest.setup.ts:8` als dritter Operand der
     Bedingung: `typeof localStorage?.getItem !== 'function'`.
  3. **Vorbestehend, nicht von diesem Lauf verursacht.** Die Zeile steht
     wortgleich in `372795b:packages/shadow-objects/vitest.setup.ts:8`, also
     vor dem ersten Commit dieses Laufs, und `forks` ist in vitest 4 ohnehin
     der Vorgabe-Pool. Paket 2 hat die Warnung weder erzeugt noch verstärkt; es
     hat sie nur im Verify-Log sichtbar gemacht.
  4. **Betroffen sind drei Pakete, nicht eines.**
     `packages/shae-offscreen-canvas/vitest.config.ts` und
     `packages/shadow-objects-testing/vitest.config.ts` laden dieselbe
     Setup-Datei über `../shadow-objects/vitest.setup.ts`. Gemessen am
     2026-08-23: `pnpm -F @spearwolf/shae-offscreen-canvas exec vitest --run`
     bringt fünf Zeilen zum Muster `localstorage-file`, ohne dass dort ein
     `pool` oder `execArgv` konfiguriert wäre.
  5. **Das Unterscheidungsmerkmal ist der Descriptor.** Gemessen als erstes
     Setup-File unter `environment: 'happy-dom'`, vor dem Eingriff:
     `Object.getOwnPropertyDescriptor(globalThis, 'localStorage')` liefert
     `{get: function, set: function, value: undefined, configurable: true}` —
     Nodes Accessor, den happy-dom nicht verdrängt hat. Nach dem Eingriff ist
     es ein Datenfeld (`value: object`). Ein Accessor auf `globalThis` heißt
     also: Nodes inerter Storage steht davor. Ein Descriptor lässt sich lesen,
     ohne den Getter auszulösen.
- Vorgehen:
  1. **Nachweis vor der Änderung, und er muss rot sein.** Beide Kommandos
     laufen lassen und die Zahlen in den Report schreiben:
     ```
     cd packages/shadow-objects       && pnpm exec vitest --run 2>&1 | grep -c -- 'localstorage-file'
     cd packages/shae-offscreen-canvas && pnpm exec vitest --run 2>&1 | grep -c -- 'localstorage-file'
     ```
     Beide geben eine Zahl über null aus. Nach der Änderung geben beide `0`
     aus; auch diese beiden Zahlen gehören in den Report. Ein eigener Spec
     entsteht nicht: geprüft würde das stderr eines fremden Prozesses, und der
     Zustand, den die Setup-Datei herstellt, ist bereits durch
     `packages/shadow-objects/src/utils/ConsoleLogger.storage.spec.ts`
     abgedeckt — dieser Spec muss grün bleiben und ist der zweite Nachweis.
  2. **Die Bedingung in `packages/shadow-objects/vitest.setup.ts:8` entscheidet
     am Descriptor statt am Wert.** An die Stelle von
     `typeof localStorage?.getItem !== 'function'` tritt eine Prüfung, die den
     Getter nicht auslöst, in dieser Form:
     ```ts
     const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
     const storageIsAccessor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')?.get != null;

     if (isNode && storageIsAccessor) {
       // … unveränderter Rumpf
     }
     ```
     `storageIsAccessor` wird nur ausgewertet, wo `globalThis` erreichbar ist —
     der Ausdruck ist in jeder Umgebung harmlos, weil er keine Eigenschaft
     liest. Der Rumpf der Bedingung, der `happy-dom` importiert und die beiden
     Descriptor schreibt, bleibt Zeile für Zeile, wie er ist.
  3. **Der Kommentar über der Bedingung bekommt den Grund dazu**, in
     Englisch und ohne Rückblick auf den Vorzustand: dass die Globals, die Node
     vorschiebt, Accessoren sind, dass ihr Lesen die Warnung
     »`--localstorage-file` was provided without a valid path« auslöst — einmal
     je Testprozess, und der `forks`-Pool gibt jeder Spec-Datei einen eigenen —
     und dass ein Accessor auf `globalThis` deshalb das Erkennungsmerkmal ist,
     während ein Datenfeld für den Storage steht, den happy-dom oder ein
     Browser bereits installiert hat.
  4. **Wurzel-`CHANGELOG.md`.** Der Testrunner gehört dorthin, nicht in ein
     Paket-Changelog. Ein Eintrag unter der bestehenden Sektion
     `## 2026-08-23`, in derselben Form wie die Einträge darunter: die geteilte
     Setup-Datei erkennt Nodes vorgeschobenen Storage am Descriptor und liest
     ihn nicht mehr, womit die Warnung aus den Läufen der drei Pakete
     verschwindet, die die Datei teilen. Die Paket-Changelogs bleiben
     unberührt — an Laufzeit-API und Auslieferung ändert sich nichts.
  5. **`AGENTS.md` und `CLAUDE.md` auf Veralterung prüfen.** Beide beschreiben
     die Setup-Datei mit dem, was sie leistet (»replaces Node's inert
     `localStorage`/`sessionStorage` globals«); das bleibt richtig. Wird dort
     doch etwas berührt, kommt es in denselben Commit.
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci --force && pnpm -F shadow-objects-e2e test`
- Commit: `fix(test-setup): the storage shim reads the descriptor instead of the global`
- Ergebnis: 2 Runden · Ziel erreicht — die geteilte Setup-Datei entscheidet am
  Descriptor (`vitest.setup.ts:15-18`) statt am Wert und löst Nodes Getter nicht
  mehr aus; der Rumpf der Bedingung und `vitest.config.ts` sind unangetastet,
  `globalThis.gc` bleibt vorhanden (`elementReachability.spec.ts` 15/15) ·
  Nachweis statt Regressionsspec, wie im Detailplan begründet: die Zählung von
  `localstorage-file` fiel von 23 auf 0 im Kernpaket und von 5 auf 0 im
  Canvas-Paket, und `ConsoleLogger.storage.spec.ts` bleibt grün · Runde 1 hat
  einen wichtigen Befund geschlossen (ein Rückblick auf den Vorzustand in
  `CHANGELOG.md`) und dabei ein Rewrap-Artefakt hinterlassen, das dieselbe Runde
  nachgezogen hat · Verify von mir gefahren, gegen den endgültigen Stand: exit 0,
  775 + 119 + 377 = 1271 Fälle plus 430 E2E über Chromium und Firefox,
  `…/scratchpad/paket-4.verify.log`, im ganzen Log kein einziger Treffer auf
  `localstorage-file` · Abweichung vom Detailplan: der CHANGELOG-Eintrag steht in
  einem eigenen datierten Abschnitt statt in der bestehenden Sektion desselben
  Datums — beides deckt `CLAUDE.md` ab, und der eigene Abschnitt trennt die
  Testrunner-Änderung von der Sammlungs-Änderung, die inhaltlich nichts damit zu
  tun hat
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — die öffentliche Oberfläche beider Pakete bewegt sich
  nicht, und der Zustand, den die Setup-Datei herstellt, ist derselbe wie zuvor
