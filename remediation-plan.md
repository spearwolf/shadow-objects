# Remediation-Plan — shadow-objects

Quelle: ./audit.html vom 2026-08-21 (nachgeführter Stand) · Branch: main ·
erstellt: 2026-08-22
Baseline (2026-08-22, auf `e4d2a19` selbst gefahren): `pnpm lint` ✓ (1 info:
Biome-Config-Migrationshinweis, vorbestehend) · `pnpm typecheck` ✓ ·
`pnpm build` ✓ · `pnpm test:ci --force` ✓ 1190 Fälle (738 shadow-objects, 102
shae-offscreen-canvas, 350 shadow-objects-testing) ·
`pnpm -F shadow-objects-e2e test` ✓ 428 Fälle (Chromium und Firefox)
Scope: 12 von 63 Findings — alle mit `BUG-`, `MEM-` oder `PERF-`-Kennung plus
`ASYNC-001` (1 medium, 9 low, 2 info) · ausgenommen: die übrigen 51 Findings ·
`acknowledged` ist leer
Stand (2026-08-22): **Lauf abgeschlossen.** Neun Pakete, neun Commits auf
`main`: 1 (`c89fb1d`), 2 (`75650bd`), 3 (`083bee7`), 4 (`d03ec5f`), 5
(`557369e`), 6 (`a5d6fa1`), 7 (`50133f5`), 8 (`e7fbdd1`), 9 (`cdd6905`), dazu
der Abschluss-Commit. Nichts blockiert, nichts gestasht, keine offene Folge.
Alle zwölf Findings des Scopes sind geschlossen.

Verify auf `HEAD`, vom Orchestrator selbst gefahren: `pnpm lint` ✓ (der eine
bekannte Biome-Hinweis aus der Baseline) · `pnpm typecheck` ✓ · `pnpm build` ✓ ·
`pnpm test:ci --force` ✓ 1243 Fälle (760 shadow-objects, 118
shae-offscreen-canvas, 365 shadow-objects-testing) · `pnpm -F shadow-objects-e2e
test` ✓ 428 Fälle in Chromium und Firefox. Gegen die Baseline: 53 Fälle mehr,
keiner verschwunden, E2E unverändert.

Semver: keine Versionsanhebung. Beide Pakete führen ihre Änderungen unter
`## [Unreleased]` und heben die Nummer erst beim Release. Der Vorspann des
Kern-CHANGELOG bewertet den nächsten Release als minor (`0.33.0` → `0.34.0`)
und zählt sechsundvierzig Klauseln, die bestehende Konsumenten erreichen — die
Zählung ist gegen die Regel der Datei nachgerechnet. Für
`@spearwolf/shae-offscreen-canvas` steht die Bewertung ebenfalls (`0.6.0` →
`0.7.0`); die drei Verhaltensänderungen dieses Laufs am Canvas-Element
(Content-Box statt Border-Box, ein Frame Verzögerung, beobachtete Attribute)
ändern die Stelle nicht, die unter `1.0.0` ohnehin die Minor-Position ist.

`./audit.html` ist nachgeführt: Score 76 → 79, Code-Bereich 85 → 88,
Projekt-Harness unverändert 91. Zwölf Findings geschlossen, elf neu eingetragen,
51 übernommen. Die Datei ist nicht neu geprüft worden, sondern neu gerechnet —
das steht so in ihrer Methodik-Sektion. Kein Finding blieb mangels Beleg offen:
jedes der zwölf trägt Reviewer-Urteil mit Fundstelle und Paket-Hash.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

Der vorige Lauf (2026-08-21, vierzehn `BUG-`-Findings, zehn Pakete) ist
abgeschlossen; sein Stand steht in der Historie dieser Datei. Die Baseline oben
ist neu gemessen und deckt sich Zahl für Zahl mit seinem Abschluss-Verify.

## Scope-Abgrenzung

Beauftragt sind alle Findings der Kennungen `BUG-`, `MEM-` und `PERF-` sowie
`ASYNC-001`. Das sind zwölf Befunde:

| Kennung | Severity | Ort |
| --- | --- | --- |
| BUG-017 | low | `Kernel.ts` — Ablösen vom Elternteil ungesichert im Abbau |
| BUG-018 | low | `Entity.ts` — Aufräumlauf ohne Absicherung je Schritt |
| BUG-019 | low | `Entity.ts` — Hörer auf der niedrigsten Priorität |
| BUG-020 | low | `ShaeEntElement.ts` — `ComponentContext` aus einem Effekt gesetzt |
| BUG-021 | low | `Kernel.ts` — `createEntity` überschreibt bekannte uuid |
| ASYNC-001 | low | `Kernel.ts` — `onParentChanged` fällt hinter den Teardown |
| MEM-001 | info | `ShaeOffscreenCanvas.js` — View-Kanal überlebt den Teardown |
| MEM-002 | low | `ShadowObjectCreationScope.ts` — Aufräum-Callbacks häufen sich |
| MEM-003 | low | `ShaeOffscreenCanvasElement.js` — Effekt ohne Gegenstück |
| MEM-004 | info | `ShadowObjectCreationScope.ts` — abgebauter Scope hält Griffe |
| PERF-001 | medium | `ShaeOffscreenCanvasElement.js` — Layout in jedem Frame |
| PERF-002 | low | `ComponentContext.ts` — jede Entity löst jede Wurzel aus |

Die beiden `info`-Befunde (MEM-001, MEM-004) sind ausdrücklich mitbeauftragt —
der übliche Vorschlag, `info` auszunehmen, entfällt hier.

Draußen bleiben die 51 Befunde der übrigen Kennungen (CONS, DEP, TEST, BUILD,
CLEAN, DX, TYPE, API, SEC) — nicht erledigt, sondern nicht beauftragt. Ebenso
die offene Frage des Reports (»Darf eine uuid in einem `ComponentContext`
zweimal vergeben werden?«): sie ist für den View-Pfad im vorigen Lauf mit
`addComponent()` beantwortet, ihre übrigen Anhängsel (CONS-003, CONS-005,
API-001) liegen außerhalb des Scopes.

Was dieser Lauf an Folgen erzeugt, gehört dazu: zieht ein Fix anderswo etwas
nach sich, wird es hier mit behoben, notfalls in zusätzlichen Paketen. Die
Paketzahl unten ist damit eine Untergrenze.

## Entscheidungen

- **PERF-002 wird umgebaut, aber als letztes Paket** (2026-08-22): Beide
  Re-Request-Kanäle bekommen eine Sammelrunde je Task statt einer Runde je
  Entity, wie es der Kommentar über `dispatchReRequestParentRoots()` skizziert.
  Der Umbau steht am Ende, damit die elf kleineren Befunde gesichert sind, bevor
  das größte Paket beginnt — bricht es ab, ist der Rest des Laufs trotzdem
  committet.
- **BUG-019 — `Priority.Min` gehört dem Aufrufer** (2026-08-22): Die interne
  Anmeldung der Entity an ihrem eigenen `onDestroy` wandert auf eine Stufe
  unterhalb des öffentlich Zugänglichen. `Priority.Min` verhält sich damit, wie
  der Name verspricht: ein Hörer auf dieser Stufe wird zugestellt, bevor die
  Entity `off(this)` ruft. Verhaltensänderung mit Changelog-Eintrag.
- **BUG-020 — ein abgelehnter Beitritt bleibt still, aber nicht unbemerkt**
  (2026-08-22): Beide Aufrufstellen von `#applyComponentContext()` bekommen
  einen Wächter, der Fehler geht an den Logger, das Element bleibt ohne
  `ComponentContext` stehen. Kein Wurf entkommt mehr in den Signal-Effekt. Kein
  Error-Event — das wäre neue öffentliche API für einen Fall, den heute nur
  Anwendungscode mit selbstgebauter uuid erreicht.
- **ASYNC-001 — `onParentChanged` wird synchron zugestellt** (2026-08-22): Die
  Zusage wird »immer« statt »später, und manchmal gar nicht«. Die Reihenfolge
  gegen die Kontext-Neubindung wird gemessen und mit Tests festgehalten, bevor
  der `queueMicrotask()` fällt. Verschiebt sich dabei eine beobachtbare
  Zustellreihenfolge, gehört das in den Changelog.
- **BUG-017 und BUG-018 folgen dem Vorbild des vorigen Laufs** (2026-08-22):
  Der Abbau einer Entity sichert jeden Schritt einzeln ab, Fehler an den Logger,
  Ablauf weiter — dieselbe Zusage, die der vorige Lauf für den `[onDestroy]`-Hook
  und die Benachrichtigung je Shadow Object eingelöst hat. `Entity[onDestroy]()`
  wirft damit nicht mehr an seinen Aufrufer; das ist die Zusage, die hier
  bewusst gegeben wird, und sie deckt sich mit `tearDown()` der Creation Scopes.
- **Der Rückweg nach einem abgelaufenen Bestätigungsfenster führt über einen
  frischen Proxy** (2026-08-22): Der uuid-Wächter in `createEntity()` macht
  `env.view.reCreateChanges(); env.sync()` gegen dieselbe weiterlebende
  Umgebung unbrauchbar — dieses Rezept trug bisher genau auf dem Überschreiben,
  das der Wächter beendet. Die drei Doku-Stellen (`docs/guides.md:543-553`,
  `docs/cheat-sheet.md:402-415`, `docs/api-reference.md:1240-1258`) werden auf
  den Weg umgeschrieben, den `ShadowEnv` beim nächsten `ContextCreated` ohnehin
  selbst fährt und den `worker-failure.js` im e2e-Paket vorführt: die
  Wiederherstellung läuft in einen frischen Kernel, den der Wächter nicht
  bricht. Verworfen wurden ein `DestroyEntities` vor jedem `CreateEntities` im
  Trail (Eingriff in `ComponentContext`/`ComponentChanges`) und das Beibehalten
  des Überschreibens mit nachgezogenem Abbau (ließe View- und Kernel-Seite
  verschieden handeln).
- **BUG-021 — eine bekannte uuid wird abgelehnt** (2026-08-22): `createEntity()`
  lehnt eine uuid ab, die der Kernel bereits hält, statt die Vorgängerin ohne
  Abbau zu ersetzen. Spiegelbild des uuid-Wächters, den der vorige Lauf in
  `addComponent()` auf der View-Seite gesetzt hat. Die Ablehnung läuft über den
  vorhandenen Weg des Change Trails, der seit dem vorigen Lauf mitträgt, was der
  Kernel tatsächlich angewandt hat.

## Konventionen

Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise:

- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs. Sie gehören diesem einen Audit und sind danach tot. Sie
  leben ausschließlich in dieser Datei — nicht im Quelltext, nicht in einem
  Kommentar, nicht in Tests oder Testnamen, nicht in Doku, Spec **und auch
  nicht in Commit-Messages**. Was festgehalten werden soll, wird ausgeschrieben:
  die Regel als Satz, die Begründung daneben.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

Projektspezifisch, aus `AGENTS.md` und `CLAUDE.md`:

- Alle Kommentare, Doku und Changelog-Einträge auf **Englisch**. Commit-Messages
  auf Englisch, wie `git log` es zeigt.
- Verbotene Analogien: »shadow theater«, »puppet«, »puppeteer«, »light world«,
  »screen«. ECS-Begriffe verwenden. Die Begriffstabelle in `AGENTS.md` §4 ist
  bindend (`RemoteWorkerEnv`, Entity, Entity Tree, `ComponentContext`, Token).
- Eine Änderung an der öffentlichen API zieht `docs/`, `README.md` **und**
  `CHANGELOG.md` des betroffenen Pakets nach — im selben Paket, nicht später.
  Verhaltensänderungen gehen unter `## [Unreleased]`.
- Dependency-Versionen stehen ausschließlich im `catalog:`-Block von
  `pnpm-workspace.yaml`.
- Wer ein `TODO` anfasst, fährt `pnpm make:todo`.

## Vorbestehende Fehler

Keine. Die Baseline ist auf ganzer Breite grün; der eine Biome-Hinweis ist ein
Konfigurations-Migrationshinweis ohne Bezug zum Quelltext und blockiert nichts.

## Pakete

Phase 3 (Korrektheit) trägt die Pakete 1 bis 7, Phase 4 (Struktur und
Performance) die Pakete 8 und 9. Innerhalb von Phase 3 stehen die Kernel- und
Entity-Pakete vorn, weil die Pakete danach auf ihrem Abbauweg aufsetzen.

Restplan geprüft (2026-08-22, Zug 0 von Paket 4): Schnitt und Reihenfolge der
Pakete 5 bis 9 bleiben, wie sie stehen. Paket 4 fasst von `Kernel.ts` nur die
sechs Zeilen am Ende von `setParent()` an und teilt mit keinem offenen Paket
eine Datei — 5 und 6 sitzen in `ShadowObjectCreationScope.ts` und
`ShaeEntElement.ts`, 7 und 8 im Canvas-Paket, 9 in `ComponentContext.ts`. Ein
Paket 10 entsteht nicht: die offene Folge aus Paket 3 ist vorbestehend (Nachweis
dort). Geändert hat sich allein die Modellstufe von Paket 4 — von der stärksten
auf die mittlere, weil die Messung, für die sie gesetzt war, in Zug 0 gelaufen
ist.

Restplan geprüft (2026-08-22, Zug 0 von Paket 5): Schnitt und Reihenfolge der
Pakete 6 bis 9 bleiben unverändert. Paket 5 fasst genau eine Quelldatei samt
ihrer Spec an und teilt mit keinem offenen Paket eine Datei — 6 sitzt in
`ShaeEntElement.ts`, 7 und 8 im Canvas-Paket, 9 in `ComponentContext.ts`. Auch
die Modellstufe von Paket 5 bleibt: die Entscheidungen sind im Detailplan
gefallen, offen ist nur noch Handarbeit. Ein Paket 10 entsteht nicht — die
beiden neuen Nebenbefunde in `ShadowObjectCreationScope.ts` sind nicht
beauftragt und blockieren nichts (Nachweis im Paket).

Restplan geprüft (2026-08-22, Zug 0 von Paket 6): Schnitt und Reihenfolge der
Pakete 7 bis 9 bleiben unverändert. Paket 6 fasst von `ShaeEntElement.ts` genau
`#applyComponentContext()` (`:377-390`) und ein neues Logger-Feld an; 7 und 8
sitzen im Canvas-Paket, 9 in `ComponentContext.ts`. Die eine Berührung liegt
zwischen 6 und 9: der »zweite Re-Request-Kanal« aus Paket 9 hat sein
View-Gegenstück in `ShaeEntElement.ts` (die Anmeldung auf `:287-306`, die
Anfrageseite auf `:583-634`), also in
anderen Zeilen als denen, die Paket 6 anfasst — 6 läuft zuerst, 9 setzt darauf
auf, kein Umbau nötig. Die Modellstufe von Paket 6 bleibt die mittlere: die
Messungen, für die eine höhere Stufe gut gewesen wäre, sind in Zug 0 gefahren,
offen sind Handarbeit und die Doku-Prosa. Ein Paket 10 entsteht nicht — die
zweite Fehlerklasse, die der Abgleich zusätzlich als erreichbar nachgewiesen
hat, fällt in dieselbe Anweisungsgruppe und damit unter denselben Wächter.

Triage der offenen Punkte aus den Paketen 1, 3 und 5 (2026-08-22, Zug 0 von
Paket 6) — Kriterium: gleiche Ursache oder blockiert Paket 6. Keiner tut das,
alle bleiben liegen:

- `CHANGELOG.md:280` (Paket 1) — redaktionelle Lesbarkeit eines Kernel-Eintrags,
  keine Ursachengleichheit mit einem View-Wächter, blockiert nichts.
- `Entity.spec.ts:980` (Paket 1) — Härtung einer Zusicherung in der Entity-Spec,
  anderes Paket, andere Datei, blockiert nichts.
- `Entity.ts:242` (Paket 1) — Reihenfolge einer nachweislich folgenlosen
  `clear()`-Zeile im Entity-Abbau, kein Bezug zum Beitritt einer View-Komponente.
- `ShadowEnv.ts:66-75` (Paket 3) — genau angesehen, und die thematische Nähe
  trägt nicht: dort lehnt der **Kernel** eine wiederholte Anlage über den Change
  Trail ab (`EntityUuidInUseError` → `ChangeTrailRefusedError`), hier lehnt der
  **`ComponentContext`** einen Beitritt im `vc.context`-Setter ab
  (`ComponentUuidInUseError`). Andere Datei, andere Fehlerklasse, anderer
  Zustellweg, und der Wächter aus Paket 6 sieht diesen Wurf nie — der Trail läuft
  über `ShadowEnv.sync()`, nicht über `#applyComponentContext()`. Bleibt liegen,
  als vorbestehend triagiert.
- `ShadowObjectCreationScope.ts:539-556`/`:558-575` und `:305-331` (Paket 5) —
  Worker-Seite, nicht beauftragt, kein gemeinsamer Aufrufweg mit dem Element.

Restplan geprüft (2026-08-22, Zug 0 von Paket 7): Schnitt und Reihenfolge der
Pakete 8 und 9 bleiben. Paket 7 und Paket 8 sitzen in derselben Datei, fassen
aber verschiedene Glieder an: 7 den Lebenszyklus (`connectedCallback`,
`disconnectedCallback`, ein neues Effekt-Feld), 8 den Frame-Callback
(`[FrameLoop.OnFrame]()`, `:145-187`) und die Beobachter, die ihn ablösen. 7
liefert dabei genau die Symmetrie, auf der 8 aufsetzt: einen
`disconnectedCallback`, in dem bereits eine Freigabe steht und in den die des
`ResizeObserver` daneben passt, und einen `connectedCallback`, der den Aufbau
schon in dieser Reihenfolge fährt. Zusammenlegen wäre der falsche Schnitt — 7
ist eine Freigabe mit zwei roten Testfällen, 8 ein Umbau mit Messung, und ein
gemeinsames Paket würde beides in einen Commit werfen, dessen Rückbau keine
Naht mehr hat. Paket 9 sitzt in `ComponentContext.ts` und teilt mit beiden keine
Datei. Geändert hat sich allein die Modellstufe von Paket 7 — von der günstigsten
auf die mittlere, Begründung im Paket. Ein Paket 10 entsteht nicht: der neue
Nebenbefund im Kernpaket (`<shae-ent>` zerstört seine Konstruktor-Effekte nie)
ist nicht beauftragt, von keinem Finding des Audits gedeckt und blockiert nichts.

Triage der offenen Punkte aus den Paketen 1, 3 und 5 (2026-08-22, Zug 0 von
Paket 7) — Kriterium: gleiche Ursache oder blockiert Paket 7. Keiner tut das,
alle bleiben liegen. Paket 7 arbeitet als erstes Paket dieses Laufs im
Canvas-Paket, alle sechs Punkte liegen im Kernpaket:

- `CHANGELOG.md:280` (Paket 1) — redaktionelle Lesbarkeit im Kern-CHANGELOG;
  Paket 7 schreibt in `packages/shae-offscreen-canvas/CHANGELOG.md`, andere Datei.
- `Entity.spec.ts:980` (Paket 1) — Zusicherung in einer Kernel-Spec, kein
  gemeinsamer Aufrufweg mit dem Canvas-Paket.
- `Entity.ts:242` (Paket 1) — Reihenfolge einer nachweislich folgenlosen
  `clear()`-Zeile im Entity-Abbau. Paket 7 fasst den `onDestroy`-Block eines
  Shadow Objects an, also die Zustellung, nicht den Abbau der Entity darunter.
- `ShadowEnv.ts:66-75` (Paket 3) — ein `ComponentContext`, der von einer lebenden
  Umgebung abgehängt und wieder angehängt wird. Thematisch nah am Umhängen, das
  Paket 7 prüft, und trotzdem ein anderer Fall: dort wechselt der `view` einer
  `ShadowEnv`, hier verlässt ein Element das Dokument und kehrt zurück. Das
  Canvas-Element besitzt keine `ShadowEnv`; gemessen erzeugt sein Ausbau
  `DestroyEntities` und sein Wiedereinhängen `CreateEntities`, es läuft also gar
  nicht in die Ablehnung, die dort beschrieben ist. Bleibt liegen, als
  vorbestehend triagiert (Nachweis in Paket 3).
- `ShadowObjectCreationScope.ts` (Paket 5), beide Punkte — Worker-Seite des
  Kernpakets. Der zweite (`:305-331`, Creation API nach dem Abbau weiter
  aufrufbar) stellt dieselbe Frage wie der Wächter, den Paket 7 in
  `requestOffscreenCanvas()` setzt, aber eine Etage tiefer und in einem Paket,
  das nicht beauftragt ist; die Antwort hier hängt an keiner Zeile dort.

Restplan geprüft (2026-08-22, Zug 0 von Paket 8): Paket 9 bleibt, wie es steht —
Schnitt, Reihenfolge, Modellstufe. Es sitzt in `packages/shadow-objects/src/view/
ComponentContext.ts` und im zweiten Re-Request-Kanal, teilt mit dem Canvas-Paket
keine Datei und keinen Aufrufweg, und der Abgleich von Paket 8 hat an seinem
Gegenstand nichts bewegt. Ein Paket 10 entsteht nicht: Paket 8 zieht keine Folge
nach, die außerhalb seiner einen Datei liegt, und der einzige neue Nebenbefund
(der schiefe Pixelverhältnis-Vergleich, Tatsache 14 im Paket) ist von keinem
Finding gedeckt und blockiert nichts. Geändert hat sich am Paket 8 selbst nur
der Bereich: `ShaeOffscreenCanvasElement.spec.js` und die `README.md` des Pakets
kommen dazu — die Spec, weil fünf ihrer Fälle ihren `getBoundingClientRect`-
Ersatz vor das Einhängen ziehen müssen, die README, weil `observedAttributes`
die Attributmenge zur Zusage macht und sie sonst nirgends steht. Die Modellstufe
von Paket 8 bleibt die mittlere; die Begründung steht am Paket.

Triage der offenen Punkte aus den Paketen 1, 3, 5 und 7 (2026-08-22, Zug 0 von
Paket 8) — Kriterium: gleiche Ursache oder blockiert Paket 8. Keiner tut das,
alle bleiben liegen:

- `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:96-99`
  (Paket 7) — **derselbe `connectedCallback`, dieselbe Datei, und trotzdem nicht
  dieselbe Ursache.** Dort hängt sich `createEffect()` an den Effekt, der beim
  Aufruf gerade auf dem Stapel liegt, und stirbt mit dessen nächstem Lauf; die
  Ursache ist die Effektverwaltung von signalize. Die beiden Beobachter, die
  Paket 8 einbaut, kennen signalize nicht: `new ResizeObserver(...)` und
  `window.matchMedia(...)` haben keinen Elternteil, an den sie sich hängen
  könnten, und ihre Lebensdauer hängt allein am `disconnectedCallback`. Blockiert
  wird auch nichts: zerstört ein fremder Elterneffekt den Effekt des Elements
  vorzeitig, verstummt die Antwort auf Canvas-Anfrage und `ContextLost` — die
  Größenmeldung an die Entity läuft weiter, weil sie an keinem Effekt hängt.
  Der Punkt bleibt liegen, wo Paket 7 ihn hingelegt hat: im Kommentar, als
  Gattungsgleicher ohne Regression.
- `ShaeEntElement.ts`/`ShaeElement.ts` (Paket 7) — sieben nie zerstörte
  Konstruktor-Effekte im Kernpaket, von keinem Finding gedeckt, andere Datei,
  anderes Paket.
- `CHANGELOG.md:280` (Paket 1) — redaktionelle Lesbarkeit im Kern-CHANGELOG;
  Paket 8 schreibt in den des Canvas-Pakets.
- `Entity.spec.ts:980` (Paket 1) — Zusicherung in einer Kernel-Spec, kein
  gemeinsamer Aufrufweg mit einem Custom Element.
- `Entity.ts:242` (Paket 1) — Reihenfolge einer nachweislich folgenlosen
  `clear()`-Zeile im Entity-Abbau, weder Ursache noch Blockade eines
  Frame-Callbacks.
- `ShadowEnv.ts:66-75` (Paket 3) — vorbestehend triagiert, Kernpaket, und der
  Weg dorthin führt über `env.view`, das dieses Element nicht besitzt.
- `ShadowObjectCreationScope.ts:539-556`/`:558-575` und `:305-331` (Paket 5) —
  Worker-Seite des Kernpakets, nicht beauftragt, kein gemeinsamer Aufrufweg.

Restplan geprüft (2026-08-22, Zug 0 von Paket 9): Paket 9 ist das letzte, und es
bleibt eines. Ein Schnitt in 9a und 9b wäre der falsche: beide Kanäle hängen an
einem einzigen Auslöser (`ShaeEntElement.#askPeersToReRequestParent()`), sie
teilen sich denselben Sammelpunkt und müssen sich über denselben
Ausführungszeitpunkt einig sein. Ein Paket, das nur einen von beiden sammelt,
ließe die Aufrufstelle in zwei Taktungen zerfallen — die Nachbar-Runde eines
Elements mit Elternteil synchron, die eines Elements ohne Elternteil eine
Microtask später — und die Doku müsste zweimal umgeschrieben werden, das zweite
Mal gegen das, was das erste Mal geschrieben wurde. Die Empfehlung des Findings
sagt dasselbe: beide in einem Zug. Der Bereich hat sich gegenüber dem Kopfeintrag
präzisiert, nicht verschoben: `ShaeEntElement.ts` kommt als zweite Quelldatei
dazu (dort sitzt der Auslöser), `Backlog.md` als dritte Textdatei neben Doku und
CHANGELOG des Kernpakets, und die Tests liegen in
`packages/shadow-objects-testing/`, weil nur echtes Chromium die
Custom-Elements-Semantik richtig zeigt. Die Modellstufe bleibt die stärkste —
anders als bei den Paketen 4 bis 8 nicht wegen einer offenen Messung, die ist
gefahren, sondern wegen der Prosa und der Wiedereintritts-Regeln; Begründung am
Paket. Ein Paket 10 entsteht nicht: der eine neue Nebenbefund (`style` im
Konstruktor, Nachweis am Paket) ist von keinem Finding gedeckt und blockiert
nichts.

Triage der offenen Punkte aus den Paketen 1, 3, 5, 7 und 8 (2026-08-22, Zug 0 von
Paket 9) — Kriterium: gleiche Ursache oder blockiert Paket 9. Es sind neun, wenn
man die beiden Stellen in `ShadowObjectCreationScope.ts` einzeln zählt. Keiner
tut es, alle bleiben liegen und gehen am Ende des Laufs gesammelt an das nächste
Audit:

- `packages/shadow-objects/src/elements/ShaeEntElement.ts` und `ShaeElement.ts`
  (Paket 7) — **dieselbe Datei, und trotzdem nicht dieselbe Ursache, und keine
  Blockade.** Die sieben nie zerstörten Konstruktor-Effekte sind ein Problem der
  Effektverwaltung; einer davon hält die drei Re-Request-Subscriptions
  (`ShaeEntElement.ts:290-309`), was die Nähe erklärt. Paket 9 fasst diesen
  Effekt nicht an: es ändert, *was* `#askPeersToReRequestParent()` aufruft
  (`:634-650`), und *wann* der `ComponentContext` zustellt — nicht, wer zuhört.
  Blockieren kann der Befund auch nichts: ein Element außerhalb des Dokuments
  behält zwar seine Hörer, aber `#reRequestParent()` und
  `#reRequestParentAsRoot()` kehren bei `!this.isConnected` sofort um, die
  überzähligen Hörer tun also nichts. Bleibt liegen, wo Paket 7 ihn hingelegt
  hat.
- `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:96-99`
  (Paket 7) — Canvas-Paket, ein Effekt, der sich an einen fremden Elterneffekt
  hängt. Andere Datei, anderes Paket, kein gemeinsamer Aufrufweg mit der
  Elternauflösung.
- `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:246-247`
  (Paket 8) — die überlebenden Größenfelder eines ausgehängten Canvas-Elements,
  vom Reviewer als vorbestehend eingestuft. Canvas-Paket, keine Berührung.
- `CHANGELOG.md:280` (Paket 1) — redaktionelle Lesbarkeit eines Kernel-Eintrags.
  Paket 9 schreibt in denselben CHANGELOG, aber in `## [Unreleased]` und in
  dessen Vorspann; die Zeile 280 liegt in einem anderen Eintrag und wird nicht
  angefasst. Kein Anlass, sie im Vorbeigehen umzuschreiben — das wäre eine
  Änderung ohne Paket.
- `Entity.spec.ts:980` (Paket 1) — eine Zusicherung in einer Kernel-Spec. Paket 9
  arbeitet auf der View-Seite und schreibt keine Kernel-Spec.
- `Entity.ts:242` (Paket 1) — die Reihenfolge einer nachweislich folgenlosen
  `clear()`-Zeile im Entity-Abbau. Kernel-Abbau gegen View-Elternauflösung: kein
  gemeinsamer Aufrufweg.
- `ShadowEnv.ts:66-75` (Paket 3) — der `ComponentContext`, der von einer lebenden
  Umgebung abgehängt und wieder angehängt wird. Thematisch der nächste Nachbar
  von allen, weil auch Paket 9 in `ComponentContext` schreibt, und trotzdem ein
  anderer Fall: dort geht es um die Wiederanlage von Entities über den Change
  Trail, hier um die Zustellung von Nachrichten an bestehende Komponenten. Der
  Sammelpunkt aus Paket 9 überlebt einen `clear()` nicht als Problem — die
  Karte hält `ViewComponent`-Instanzen, und der Durchlauf lässt jede fallen, die
  der Kontext nicht mehr hält (Regel 2 in Zug 2). Bleibt liegen, als
  vorbestehend triagiert (Nachweis in Paket 3).
- `ShadowObjectCreationScope.ts:539-556`/`:558-575` und `:305-331` (Paket 5) —
  Worker-Seite des Kernpakets, nicht beauftragt, kein gemeinsamer Aufrufweg mit
  der View-Seite der Elternauflösung.

### [x] 1. Der Abbau einer Entity sichert jeden Schritt einzeln ab
- Findings: BUG-017 (low), BUG-018 (low)
- Ziel: Ein Wurf in einem Schritt des Entity-Abbaus kostet die folgenden Schritte
  nicht mehr ihren Lauf.
- Hash: c89fb1d
- Ergebnis: 1 Runde · BUG-017 und BUG-018 behoben · Jeder werfende Schritt des
  Entity-Abbaus steht hinter `Entity.#runGuarded()` nach dem Vorbild von
  `ShadowObjectCreationScope`, `entity.removeFromParent()` in
  `Kernel.destroyEntity()` hinter einem eigenen `try`/`catch`. Drei neue
  Testfälle, alle drei rot gesehen. · klein, offen gelassen:
  `CHANGELOG.md:280` — der Einstiegssatz des Eintrags ist ohne die
  Nachbareinträge schwer zu lesen · `Entity.spec.ts:980` — die
  `toHaveBeenCalledTimes(4)` hängt daran, dass `SignalsPath.dispose()` an seinem
  eigenen `value$.destroy()` abbricht; eine Prüfung auf die vier Schritt-Labels
  wäre haltbarer · `Entity.ts:242` — `#rootContexts.clear()` steht hinter der
  Kontext-Schleife statt zwischen beiden, nachweislich folgenlos (die einzigen
  Leser sitzen an `Entity.ts:615-622`)
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `Entity[onDestroy]()` trägt keinen Fehler mehr zu seinem
  Aufrufer — jeder werfende Schritt wird gefangen und über `Kernel.logger`
  gemeldet. Der Wächter um den Aufruf in `Kernel.destroyEntity()` bleibt als
  Backstop stehen. Meldungsformat der Entity: `entity teardown step failed
  (<step>):`, davon abgegrenzt der Kernel-Backstop `entity release failed:`.

### [x] 2. Priority.Min steht dem Aufrufer offen
- Findings: BUG-019 (low)
- Ziel: Ein Hörer, der sich auf der niedrigsten öffentlichen Prioritätsstufe an
  `onDestroy` einer Entity anmeldet, wird zugestellt.
- Hash: 75650bd
- Ergebnis: 2 Runden · BUG-019 behoben · `Priority.Min` ist
  `Number.NEGATIVE_INFINITY`, unterhalb liegt kein Zahlenwert — der Weg war
  deshalb nicht eine tiefere Stufe, sondern die Selbstanmeldung der Entity ganz
  zu streichen. Ihre Freigabe läuft über den unbedingten Aufruf, den Paket 1
  hinter die Zustellung gesetzt hat. Zwei Regressionsfälle, beide rot gesehen.
  Nachgemessen: `entity[onDestroy]()` hat repoweit genau einen Produktiv-
  Aufrufer, alle Abbauwege münden in `destroyEntity()`, die Freigabe läuft
  weiterhin genau einmal.
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: Eine Entity hört nicht mehr auf ihrer eigenen
  `onDestroy`-Benachrichtigung. Ein direkt angemeldeter Hörer auf
  `Priority.Min` wird zugestellt und liest Properties und Kontexte noch
  vollständig. Unverändert bleibt die Grenze der Creation API: eine über
  `on()`/`once()` eines Creation Scopes unterhalb von `Priority.Low`
  angemeldete Subscription erreicht die Zustellung nicht, weil der Scope auf
  `Priority.Low` abbaut und freigibt, was er ausgegeben hat. Beides steht in
  `docs/api-reference.md` §`onDestroy(callback)`.

### [x] 3. createEntity lehnt eine bekannte uuid ab
- Findings: BUG-021 (low)
- Ziel: Eine zweite Anlage derselben uuid ersetzt die Vorgängerin nicht mehr
  ohne Abbau, sondern wird abgelehnt.
- Hash: 083bee7
- Ergebnis: 2 Runden · BUG-021 behoben · Der Wächter steht als erste Anweisung
  von `createEntity()`, vor jedem Schreibzugriff; die stehende Entity bleibt
  mit Shadow Objects, Signalen, Kontexten und Elternbindung unversehrt, die
  abgelehnte Anlage hinterlässt nichts. Sechs neue Testfälle, alle rot gesehen:
  vier kernel-lokal, zwei für die Aussage, auf der die Doku-Rezepte ruhen.
  Der Umschrieb der drei Rezepte auf den frischen Proxy hat zwei Runden
  gebraucht — die erste Fassung riss einen gesunden Worker ab und ließ
  `importScript()` samt `syncWait()` aus. · klein, offen gelassen: keine
- Nebenbefunde: keine
- Folgen: `packages/shadow-objects/src/view/ShadowEnv.ts:66-75` — ein
  `ComponentContext`, der von einer lebenden Umgebung abgehängt und wieder
  angehängt wird (`env.view = undefined; env.view = ctx`), läuft mit gefülltem
  Memory in die Ablehnung. Im Kommentar festgehalten, nicht umgebaut: ein Umbau
  (Wiederanlage nur für einen frischen Proxy, oder `DestroyEntities` vor
  `CreateEntities`) ist eine Architekturänderung und gehört in ein eigenes
  Paket. **Triagiert in Zug 0 von Paket 4 (2026-08-22): vorbestehend.** Kein
  Paket, kein Nachtrag — Nebenbefund für das nächste Audit. Nachweis:
  `git show e4d2a19:packages/shadow-objects/src/in-the-dark/Kernel.ts`,
  `createEntity()` setzte `this.#entities.set(uuid, entry)` unbedingt, also
  ersetzte genau dieser Übergang die stehende Entity ohne Abbau — der Defekt,
  den BUG-021 beschreibt. Der Wächter hat ihn nicht erzeugt, sondern sichtbar
  gemacht: das stille Überschreiben ließ die alten Entities samt ihrer Shadow
  Objects unabgebaut zurück und die Anwendung scheinbar weiterlaufen, die
  Ablehnung sagt es. Einen Weg, der vorher korrekt lief und jetzt bricht, gibt
  es nicht. Erreichbar ist der Übergang in echtem Anwendungscode allerdings:
  `shadowEnv.view` wird in der Bibliothek nur an einer Stelle geschrieben,
  `ShaeWorkerElement.ts:67-69` aus `ns$.onChange`, und `ShaeWorkerElement.start()`
  legt den Proxy genau einmal an (`#started`, `:262-275`). Ein
  `<shae-worker>`, dessen `ns` von `a` auf `b` und zurück auf `a` geht, hängt
  denselben `ComponentContext` (`ComponentContext.get()` gibt den zwischenge-
  speicherten zurück, `ComponentContext.ts:90-96`) mit gefülltem Memory an
  denselben lebenden Proxy. Ein Custom Element, das aus dem DOM genommen und
  wieder eingehängt wird, gehört nicht dazu — dieses Fenster fängt
  `#deferDestroy()` ab, und danach ist die Umgebung endgültig zerstört.
  Was das nächste Audit zu entscheiden hat: ob `ShaeWorkerElement` bei einem
  `ns`-Wechsel den Proxy mit abbaut, oder ob der `view`-Setter von `ShadowEnv`
  das übernimmt.
- Schnittstellen: Neue öffentliche Fehlerklasse `EntityUuidInUseError` (Feld
  `uuid`), exportiert aus `src/index.ts` und `src/shadow-objects.ts`, in `dist/`
  als vier Dateien. `Kernel.createEntity()` wirft sie bei bekannter uuid. In
  einem Change Trail ist sie lokal die `cause` des `ChangeTrailRefusedError`,
  über die Worker-Grenze nur noch als Wortlaut — der Diskriminator ist das
  äußere `ChangeTrailRefusedError`, das `RemoteWorkerEnv` aus dem mitgesendeten
  `appliedCount` baut. Der dokumentierte Rückweg nach einer Ablehnung ohne
  Fortschrittsaussage lautet: neuer `RemoteWorkerEnv` → `await env.ready()` →
  `importScript()` → `syncWait()`.

### [x] 4. onParentChanged wird synchron zugestellt
- Findings: ASYNC-001 (low)
- Ziel: Ein Elternwechsel wird immer gemeldet, auch wenn im selben Task der
  Abbau folgt.
- Hash: d03ec5f
- Ergebnis: 2 Runden · ASYNC-001 behoben · `setParent()` stellt
  `onParentChanged` als letzte Anweisung synchron zu, hinter einem `try`/`catch`
  an den Logger — ohne den würde ein werfender Hörer über `Kernel.parse()` den
  ganzen Change Trail ablehnen. Sechs neue Testfälle, fünf davon rot gesehen.
  Der `queueMicrotask()` stammte aus `a69e68e` (2025-03-19) und war ein
  Platzhalter für eine Kontext-Neubindung, die `setParent()` inzwischen selbst
  erledigt; kein Fall stand dahinter. Zwei Runden gingen dafür drauf, dass die
  Messung aus Zug 0 falsch war (siehe Korrektur unten) und Runde 1 beim
  Nachschärfen einen Rückblick auf den Vorzustand in Code und `docs/` einführte.
  · klein, offen gelassen: keine
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `onParentChanged` wird synchron zugestellt, bevor
  `setParent()` zurückkehrt. Am Zustellpunkt liest ein Hörer `entity.parent` und
  `useParentContext()` bereits neu (Letzteres `undefined`, solange der neue
  Elternteil seinen eigenen Wert im selben Task gesetzt hat und dessen
  Sammelrunde noch aussteht); `useContext()` hinkt außerhalb eines Change Trails
  eine Microtask hinterher, innerhalb eines Trails nicht. Im Trail läuft die
  Zustellung innerhalb von `batch()` und vor dem nächsten Eintrag desselben
  Trails. Ein werfender Hörer erreicht weder `setParent()` noch den Trail.

### [x] 5. Ein Creation Scope räumt vollständig ab
- Findings: MEM-002 (low), MEM-004 (info)
- Ziel: Wiederholtes `provideContext` häuft keine Aufräum-Callbacks mehr an, und
  ein abgebauter Scope hält seine Griffe nicht weiter.
- Hash: 557369e
- Ergebnis: 2 Runden · MEM-002 und MEM-004 behoben · Die Räumung wird je
  Provider-**Signal** registriert, nicht je Name — `provideContext` und
  `provideGlobalContext` schreiben in getrennte Karten, ein Namens-Set
  verschluckte die Räumung des zweiten Providers. `tearDown()` gibt am Ende
  vier Felder und drei `compare`-Karten frei; `bindTo()` brauchte dafür keinen
  Code, nur einen richtiggestellten Kommentar. Drei neue Testfälle. · Zwei
  Runden gingen dafür drauf, dass der erste Entwurf die Erreichbarkeit über
  `gc()` maß: ein Wahrscheinlichkeitstest, der lokal 20× grün lief und auf einem
  fremden Runner niemandem mehr etwas gesagt hätte. Ersetzt durch einen
  `/** @internal */`-Getter, den `stripInternal: true` aus den veröffentlichten
  Deklarationen hält (nachgemessen). Mit dem GC-Test fiel auch sein Grund weg,
  also wurde die dafür eingeführte `@types/node`-devDependency samt
  `tsconfig`-Eingriff wieder zurückgebaut. · klein, offen gelassen: keine
- Nebenbefunde: `ShadowObjectCreationScope.ts:539-556` und `:558-575` —
  `on()`/`once()` nehmen ihren Callback nur im Zweig mit fremdem Ziel wieder aus
  `#unsubscribeSecondary`; die übliche Form auf die eigene Entity lässt die
  Menge weiter wachsen, also genau die Stelle, die das Audit als gelöst zitiert.
  · `ShadowObjectCreationScope.ts:305-331` — die Creation API bleibt nach dem
  Abbau aufrufbar und füllt die geleerten Karten wieder.
- Folgen: keine
- Schnittstellen: Die Zusage von `clearOnDestroy` bleibt additiv und nicht
  umkehrbar; die Räumung läuft je Provider genau einmal statt einmal je Aufruf.
  Nach `tearDown()` sind `#shadowObject`, `#releaseScope`,
  `#forgetShadowObject` und `#unsubscribeFromEntityDestroy` los; `#entity`
  bleibt gesetzt, und Entity und Kernel bleiben darüber erreichbar, solange
  etwas den Scope hält. Neu, aber nicht öffentlich: der `/** @internal */`-Getter
  `debugHandles` — er steht in der transpilierten `.js` und in `dist/bundle.js`,
  nicht in den `.d.ts`, und die Klasse selbst ist aus keinem Einstiegspunkt
  exportiert. `packages/shadow-objects/tsconfig.lib.json` trägt dauerhaft
  `"types": []` als Wächter gegen Node-Globals in den Deklarationen.

### [x] 6. Ein abgelehnter ComponentContext erreicht keinen Signal-Effekt
- Findings: BUG-020 (low)
- Ziel: Beide Aufrufstellen fangen den abgelehnten Beitritt, der Fehler geht an
  den Logger, das Element bleibt ohne `ComponentContext` stehen.
- Hash: a5d6fa1
- Ergebnis: 2 Runden · BUG-020 behoben · Der Wächter sitzt in
  `#applyComponentContext()` um beide Zweige des Beitritts statt zweimal an den
  Aufrufstellen; damit ist auch `new ViewComponent(…)` gedeckt und
  `syncShadowObjects()` läuft weiter. Fünf neue Fälle in
  `packages/shadow-objects-testing`, vier davon rot gesehen. · **Der Befund
  reicht weiter, als das Audit ihn beschrieb**: `ComponentContextDisposedError`
  ist ohne jede selbstgebaute uuid erreichbar — Element aushängen, `ns`
  wechseln, wieder einhängen —, und der Wurf entkam auf zwei Wegen: synchron an
  `el.ns = …` und als `Uncaught …` im globalen `error`-Event. Beide sind zu.
  · klein, offen gelassen: keine
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `ShaeEntElement` führt `protected readonly logger`
  (`ConsoleLogger`, Namensraum `ShaeEntElement`), wie `ShaePropElement` es
  vorführt; der Member steht in `dist/src/elements/ShaeEntElement.d.ts`. Ein
  abgelehnter Beitritt wirft nicht mehr, sondern meldet über diesen Logger auf
  `error`-Ebene (ungeschaltet). Nach der Ablehnung bleibt die `ViewComponent`
  samt Subscriptions am Element stehen; das Element tritt beim nächsten
  **Wechsel** von `componentContext$` wieder bei, das erneute Schreiben
  desselben Namensraums löst nichts aus. Beschrieben in
  `docs/api-reference.md` §`<shae-ent>` unter »A context the entity cannot join«
  und in `docs/cheat-sheet.md`.

### [x] 7. Der Teardown im Canvas-Paket wird vollständig
- Findings: MEM-001 (info), MEM-003 (low)
- Ziel: Das Shadow Object gibt seinen View-Kanal frei, und der Effekt des
  Elements wird im `disconnectedCallback` zerstört.
- Hash: 50133f5
- Ergebnis: 1 Runde · MEM-001 und MEM-003 behoben · Der Effekt wandert aus dem
  Konstruktor in `#setupViewComponentEffect()` (`connectedCallback`) und
  `#destroyViewComponentEffect()` (`disconnectedCallback`), Bauform Zeichen für
  Zeichen die von `ShaeEntElement`. Fünf Testfälle, drei rot gesehen, zwei
  Wächter. · **Der Befund war real, nicht theoretisch**: der Effekt hing als
  `listenerObject` im Modul-Singleton `globalEffectQueue` von signalize
  (eventize 6 kennt kein `WeakRef`), und ein längst aus dem DOM entferntes
  Element beantwortete gemessen weiterhin Canvas-Anfragen und tauschte bei
  `contextLost` seinen Anzeige-Knoten. · Die zwei Felder allein freizugeben
  hätte aus einem stillen Nichts einen `TypeError` gemacht — `canvasRequested`
  trug den Schutz; deshalb die dritte Wächterzeile in
  `requestOffscreenCanvas()`. · Umhängen unabhängig nachgemessen: Hörerzahl
  1 → 0 → 1 über connect/`remove()`/`append()`, mehrfaches `connectedCallback`
  verdoppelt nichts, `disconnectedCallback` ohne vorheriges Verbinden wirft
  nicht. · klein, offen gelassen: keine
- Nebenbefunde: `packages/shadow-objects/src/elements/ShaeEntElement.ts` und
  `ShaeElement.ts` — ein nacktes `<shae-ent>` legt in seinen Konstruktoren
  sieben Effekte an, die nie zerstört werden (gemessen über
  `getEffectsCount()`); derselbe Mechanismus wie MEM-003, eine Etage tiefer im
  Kernpaket, von keinem Finding des Audits gedeckt.
  · `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:96-99`
  — wird das Element aus einem fremden Signal-Effekt heraus eingehängt, hängt
  sich sein Effekt als Kindeffekt an und der nächste Lauf des Elterneffekts
  zerstört ihn; das Element wird stumm, bis es umgehängt wird. Gattungsgleich
  zum Vorzustand, keine Regression, im Kommentar festgehalten statt behoben.
- Folgen: keine
- Schnittstellen: Ein `<shae-offscreen-canvas>` außerhalb des Dokuments
  beantwortet weder Canvas-Anfragen noch `contextLost`; es antwortet wieder,
  sobald es erneut eingehängt wird. `ShaeOffscreenCanvas` gibt
  `dispatchMessageToView` und `canvasRequested` im `onDestroy` frei; ein
  `requestOffscreenCanvas()` danach bleibt still statt zu werfen. Keine
  `destroy()`-Methode — `disconnectedCallback` trägt allein. Paket 8 legt seine
  `ResizeObserver`-Freigabe in dieselbe symmetrische Form.

### [x] 8. Der Frame-Callback des Canvas-Elements liest kein Layout mehr
- Findings: PERF-001 (medium)
- Ziel: Größe, Pixelverhältnis und Attribute kommen aus Beobachtern statt aus
  einem `getBoundingClientRect()` in jedem Frame.
- Hash: e7fbdd1
- Ergebnis: 1 Runde · PERF-001 behoben · Der Frame-Callback liest fünf Felder
  und vergleicht sie; ein Grep über alle Layout-erzwingenden Zugriffe (nicht nur
  `getBoundingClientRect`, auch `offsetWidth`, `clientWidth`,
  `getComputedStyle` und Verwandte) findet im Produktivcode genau einen Treffer,
  und der sitzt in `#observeDisplaySize()`, erreichbar nur aus
  `connectedCallback`. Zwölf neue Testfälle, elf rot gesehen. Kein `kritisch`,
  kein `wichtig` im Review. · **Zwei Fallen, die das Audit nicht nennt und die
  Zug 0 in echtem Chromium und Firefox gemessen hat**: Frame 1 läuft vor der
  ersten Zustellung des `ResizeObserver` (`deliveries: 0`), ein reiner
  Beobachterwert trüge dort 0×0 und `canRender` verlangt `canvas.width > 0` —
  daher der einmalige Seed im `connectedCallback` außerhalb von rAF. Und
  `#reCreateCanvas()` tauscht den beobachteten Knoten weg; ohne `unobserve()`
  käme für den alten Knoten eine 0×0-Zustellung im selben Bündel **vor** der des
  neuen, und der Worker hätte nach jedem `ContextLost` aufgehört zu rendern.
  · klein, offen gelassen: keine
- Nebenbefunde:
  `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js:246-247`
  — `#lastCanvasWidth`/`#lastCanvasHeight` überleben ein Aushängen; ein bei
  unveränderter Größe wieder eingehängtes Element sendet seine Größen-Properties
  nie an die frisch erzeugte `ViewComponent`. Vom Reviewer als vorbestehend
  eingestuft, vor wie nach dieser Änderung identisch.
- Folgen: keine
- Schnittstellen: `observedAttributes` des Elements trägt jetzt `fps` und
  `pixel-zoom` — die Attributmenge ist damit eine Zusage, und eine Unterklasse,
  die ihre eigene Liste ohne Spread deklariert, verliert sie (im Kommentar an
  der Liste festgehalten, nach dem Vorbild in `ShaePropElement.ts:56-59`). Zwei
  Verhaltensänderungen stehen im CHANGELOG des Canvas-Pakets: die Größe kommt
  aus der Content-Box statt der Border-Box (nachgemessen abweichend unter
  `transform: scale()` sowie bei Rahmen oder Innenabstand am Canvas selbst —
  300×200 gegen 240×140 bei 10px Rahmen und 20px Padding), und eine
  Größenänderung erreicht die Entity einen Frame später als zuvor.

### [x] 9. Die Re-Request-Kanäle sammeln je Task statt je Entity
- Findings: PERF-002 (low)
- Ziel: n Wurzeln in einem Namensraum kosten eine Runde je Task statt n²/2
  Nachrichten.
- Hash: cdd6905
- Ergebnis: 2 Runden · PERF-002 behoben · Beide Kanäle sammeln über
  `collectPeerReRequest()` und laufen einmal je Microtask; der dritte,
  lineare Kanal (`dispatchReRequestParentChildren`) bleibt synchron und
  unangetastet. Gemessen in Chromium bei 600 Wurzeln: **180.300 Nachrichten und
  298,6 ms werden 600 Nachrichten und 44,0 ms** gegen 41,8 ms Boden — aus +615 %
  Überhang wird +5 %, und der Verlauf ist linear statt quadratisch. Neun neue
  Testfälle. · **Runde 1 hat einen echten Fehler freigelegt**: der erste Wächter
  gegen den Nachzügler-Fall konnte nie feuern, weil `#components` eine
  uuid-Karte ist, deren Eintrag den Austritt seiner Komponente überdauert.
  Richtig ist `#componentInstances`, die Menge der Instanzen. Die Runde, die
  dadurch entfällt, war nicht bloß entbehrlich, sondern schädlich: sie hätte
  ein korrekt gebundenes Kind auf ein Element ohne Entity Tree gezeigt. Beide
  Wächter sind jetzt einzeln mutationsgeprüft — Zeile löschen, genau ein Fall
  wird rot. · klein, offen gelassen: keine
- Nebenbefunde: `packages/shadow-objects-testing/src/mount.js:5-12` — der
  Kommentar behauptet, `document.createElement('shae-ent')` breche das Upgrade
  ab und hinterlasse ein `HTMLUnknownElement`; gemessen kommt das Element
  brauchbar zurück, und nur ein unbehandelter `NotSupportedError` geht an
  `window`. Verweist außerdem auf `packages/shadow-objects-e2e/KNOWN-DEFECTS.md`,
  eine dauerhafte Datei, die Laufnummern eines Reviews führt.
  · `this.style.display = 'contents'` im Konstruktor aller drei Elemente ist der
  Grund für diesen `NotSupportedError` — von keinem Finding des Audits gedeckt.
- Folgen: keine
- Schnittstellen: Die gesammelte Runde wird **eine Microtask später** zugestellt,
  wo der Kanal zuvor ein synchrones Ereignis war — dieselbe Taktung, die
  `<shae-prop>` schon hat. `buildChangeTrails()` fährt eine anstehende Runde am
  Kopf aus und kann damit Entities umhängen. Eine Absenderin, die den
  Namensraum vor der Runde verlässt, löst keine mehr aus. Stehen mehrere
  Absenderinnen unter einem Schlüssel, entfällt `newAncestor` und jedes Kind
  steigt auf. `dispatchReRequestParentRoots()` und
  `dispatchReRequestParentSiblings()` bleiben als öffentliche API stehen,
  werden aber von der Bibliothek nicht mehr gerufen. Öffentliche Signaturen,
  Ereignisnamen, `data`-Nutzlast und das View-↔-Worker-Protokoll sind
  unberührt.
