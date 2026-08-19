# Remediation-Plan — @spearwolf/shadow-objects, View Layer (dritter Lauf)

Quelle: `./view-layer-audit.html`, Buchhaltungsstand 2026-08-18 · Branch: `main` · erstellt: 2026-08-18
Basis-Commit vor dem ersten Paket: `f392f40` — alles danach stammt aus diesem Lauf.

Dateiname: Der Skill legt `./remediation-plan.md` an. Dort liegt der abgeschlossene Lauf über das
Gesamt-Audit, `view-layer-remediation-plan.md` und `-2.md` sind die beiden Vorläufer über denselben
View-Layer-Ausschnitt. Überschreiben hieße, eine Buchhaltung zu löschen, auf die die `audit.html`
verweist — daher die durchgezählte Fortsetzung.

Baseline (2026-08-18, sauberer Baum, gemessen vor Paket 1):
`pnpm lint` rc=0 (2 Infos zum `biome.json`-Schema, vorbestehend) ·
`pnpm build` ✓ · `pnpm typecheck` ✓ ·
`pnpm test:ci --force` **688** grün (`@spearwolf/shadow-objects` 364 in 15 Dateien,
`shadow-objects-testing` 323 in 22 Dateien, `shae-offscreen-canvas` 1) ·
`pnpm -F shadow-objects-e2e test` **402** grün (Chromium + Firefox).

Scope: 7 von 7 Findings (0 critical, 0 high, 0 medium, 3 low, 4 info) · nichts acknowledged,
nichts ausgenommen — der Nutzer hat ausdrücklich alle verlangt, also auch die `info`-Stufe.
`acknowledged` und `openQuestions` der Audit-Insel sind leer.

Stand (2026-08-19): **Lauf abgeschlossen.** Alle sieben Pakete committet (`1b3dd3f`, `58e1a46`, `c17f6bb`, `375edce`, `c253f05`, `9d07a86`, `9d35e13`), nichts blockiert, nichts offen. Schritt 7 gefahren: voller Verify grün (lint rc=0 · typecheck 3/3 · `test:ci --force` 719 · build 3/3 · e2e 402), Semver bewertet, `view-layer-audit.html` nachgeführt (alle 7 Findings geschlossen, 9 neue eingetragen, Score 98,5 unverändert), `Backlog.md` synchronisiert. Der Abschluss-Commit nimmt diese Plandatei mit ins Repo. Was danach kommt, ist ein neuer Lauf, kein Rest dieses hier.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

## Entscheidungen

Vom Nutzer am 2026-08-18 in einer Runde entschieden, je gegen den Vorschlag des Laufs:

- **VIEW-018** — Der slotchange-Listener wandert mit dem Slot: die hostende Entity hängt ihn direkt
  an den `<slot>`, den sie in `entHostOfSlot` registriert, statt nur auf das gebubbelte Ereignis zu
  warten. Damit merkt die abgebende Seite den Verlust selbst, auch wo am Zielort keine Entity
  zuhört. Kein MutationObserver je Entity — der Weg aus dem Audit ist damit bewusst verworfen,
  weil er teurer ist und dasselbe abdeckt.
- **VIEW-019** — Die Bindung wird nur gelöst, wenn niemand antwortet. `requestEntAncestor` läuft
  synchron, nach dem Dispatch steht das Ergebnis fest. Der Weg aus dem Audit (erst lösen, dann
  suchen) ist verworfen: er nähme korrekt gebundene Geschwister aus den `children` ihres Elternteils
  und hinge sie hinten wieder an — genau davor warnt der Kommentar an `#reRequestParent`.
- **VIEW-020** — Ein zweites Register auf Instanzen neben `#components`, über das `clear()` und
  `dispose()` laufen. Doppelte uuids werden *nicht* verboten; im kollisionsfreien Normalfall ändert
  sich nichts.
- **VIEW-021** — `destroy()` nimmt die Listener ab. Verhaltensänderung an der öffentlichen API,
  Doku und CHANGELOG ziehen im selben Paket nach.
- **VIEW-021, Folgeentscheidung** — Ablösen und Beenden sind zwei Dinge. `destroy()` beendet die
  Komponente samt Listenern; ein Kontextwechsel oder `context = null` gibt sie nur zurück, ohne sie
  stillzulegen (`#leaveContext()` im Setter). Die dokumentierte Gleichsetzung beider Wege fällt und
  wird in Doku und CHANGELOG nachgezogen. Der Gegenweg — `ShaeEntElement` beim Reconnect neu
  abonnieren zu lassen — ist verworfen: er zieht Paket 3 nach `src/elements/`, hängt an der
  Ausführungsreihenfolge der Signal-Effekte und macht die beiden vorhandenen Patch-Fälle zu
  Wackelkandidaten. (2026-08-18, auf Vorschlag des Paket-Planers)
- **VIEW-020, Scope-Zusatz** — `destroyComponent()` bekommt zusätzlich die Prüfung
  `entry.component === component`. Eine verdrängte Instanz nimmt beim Hinausgehen sonst den Eintrag
  ihres Namensvetters mit; der nächste Change Trail meldet dessen Entity als zerstört, während der
  Namensvetter `isDestroyed === false` meldet. Das ist die zweite Hälfte desselben Lochs — ohne sie
  tut `destroyComponent` nicht, was das Audit ihm bereits zuschreibt. Öffentliche
  Verhaltensänderung, aber nur im Kollisionsfall. (2026-08-18)
- **Die Wurzel der Taubheit wird in diesem Lauf repariert** — als **Paket 7**, nicht als Punkt fürs
  nächste Audit. `ShaeEntElement.viewComponent$` wird genau einmal geschrieben und nie
  zurückgesetzt, die Signale des Elements werden nie zerstört; daran hängen die drei
  Re-Request-Abonnements und der `dispatchEvent`-Patch. Der Lauf nimmt damit `src/elements/` doch
  noch einmal auf — die frühere Ablehnung galt dem Disconnect-Weg in Paket 3, nicht dieser Wurzel.
  (2026-08-18)
- **VIEW-022, Nebenfrage** — Der `length === 1`-Zweig hat im ganzen Repo **keinen Erzeuger**;
  `props-utils.ts:5` ist die einzige Stelle, die ihn liest, seit `9e56c21` rein defensiv. Er wird
  trotzdem **modelliert und nicht gestrichen**: das Audit nennt einen eindeutigen Weg, und ein
  Löschen wäre eine Verhaltensänderung an einer öffentlich exportierten Struktur ohne Auftrag.
  Der Befund geht als Nebenbefund in die nächste Erhebung. (2026-08-18, auf Vorschlag des Planers)
- **VIEW-022, TEST-012, TEST-013** — nicht gefragt: das Audit nennt je einen eindeutigen Weg, der gilt.
- Der Plan geht am Ende mit einem Abschluss-Commit ins Repo, sofern der Nutzer nicht widerspricht.

## Konventionen

Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise:

- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs. Sie gehören diesem einen Audit und sind danach tot. Sie
  leben in diesem Plan und in Commit-Messages, sonst nirgends.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

Projektspezifisch, aus `AGENTS.md` und `CLAUDE.md`:

- Alle Doku und Code-Kommentare **auf Englisch**, Doku als Markdown.
- Verbotene Analogien: »shadow theater«, »puppet«, »puppeteer«, »light world«, »screen«.
  Bindende Begriffe: `RemoteWorkerEnv`, Entity, Entity Tree, `ComponentContext` (View-Seite)
  gegen »Entity Context« (DI entlang des Baums), Token.
- Jede Änderung an der öffentlichen API zieht `packages/shadow-objects/docs/`,
  `packages/shadow-objects/README.md` und `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`) nach.
- Änderungen an Build, Testrunner, Lint, turbo/pnpm gehen ins Wurzel-`CHANGELOG.md` (datierter Abschnitt).
- Dependency-Versionen nur über `catalog:` in `pnpm-workspace.yaml`, nie als Range je Paket.
- Nach Änderung an TODO-Kommentaren `pnpm make:todo`.
- Danach `Backlog.md` synchronisieren: erledigte Punkte verlassen die Datei, sie werden nicht abgehakt.

## Vorbestehende Fehler

Keine. Die Baseline ist auf allen vier Achsen grün; die zwei `info`-Diagnosen von `pnpm lint`
betreffen das `biome.json`-Schema und sind vorbestehend.

## Verify je Paket

Mindestens `pnpm lint` · `pnpm typecheck` · `pnpm test:ci --force`.
Pakete, die `src/elements/` oder `src/view/` anfassen, zusätzlich `pnpm build` und
`pnpm -F shadow-objects-e2e test`.

## Restplan-Prüfung

Was nach einem abgeschlossenen Paket am Rest des Plans noch stimmt: Reihenfolge, Modellstufen,
Zuschnitt. Datierte Zeilen, jüngste zuerst.

- **2026-08-18, nach Paket 7 (Zug 0 zu den Paketen 5 und 6).**
  **Reihenfolge: erst 5, dann 6.** Beide sind unabhängig — keine gemeinsame Datei, keine
  gemeinsame Zeile, keine Abhängigkeit —, also entscheidet allein die Phase, und dieselbe Regel
  hat der Plan schon für Paket 7 angewandt (»Phase 3 geht vor Phase 4 und 5«): Paket 5 ist
  Phase 4, Paket 6 ist Phase 5. Der praktische Zusatz zeigt in dieselbe Richtung: beide bewegen
  die vitest-Fallzahl in `Backlog.md:275`, Paket 5 nach oben, Paket 6 nach unten. Wer 6 zuletzt
  fährt, schreibt dort die Endzahl des Laufs hin, statt eine Zwischenzahl stehen zu lassen.
  **Modellstufen bestätigt**, beide unverändert: Paket 5 mittlere Stufe — der Umbau ist klein und
  vollständig vermessen (zwei `TS2345`, sonst nichts), aber er fasst einen öffentlichen Typ an und
  entscheidet über eine CHANGELOG-Zusage, was mehr ist als Handarbeit. Paket 6 günstigste Stufe —
  ein `it` fällt, der Nachweis steht als Mutation im Detailplan, es bleibt nichts zu erfinden.
  **Was nach 5 und 6 offen bleibt:** aus dem Audit nichts. Alle sieben Findings sind dann
  abgearbeitet (TEST-013 in 1, VIEW-018/019 in 2, VIEW-021 in 3, VIEW-020 in 4, VIEW-022 in 5,
  TEST-012 in 6; Paket 7 trägt kein Finding, es räumt eine Folge dieses Laufs ab). `acknowledged`
  und `openQuestions` der Audit-Insel sind leer, es gibt also auch nichts Zurückgestelltes.
  Offen bleiben ausschließlich die Nebenbefunde, die die Pakete 2, 3, 4 und 7 ausdrücklich **fürs
  nächste Audit** zurückgestellt haben — die undeklarierte Aufrufform
  `new ViewComponent(token, parent)`, die stale Referenz aus `addComponent()`, `hasComponent()` auf
  der uuid, `assertUsableAsParent` gegen eine verdrängte Instanz, der `ViewComponentError` aus dem
  `#setParent`-Effekt nach einem Sweep, das unbeobachtbare Pending-Gate, die Kompaktierung von
  `#hostedSlots`, `trailingNewline: false` als undokumentierte Biome-Regel und der falsche
  Zeilenverweis in `Backlog.md:216`. Keiner davon ist ein Paket dieses Laufs; sie stehen in ihren
  Blöcken und gehören in die nächste Erhebung. Danach bleibt genau ein Schritt: der
  Abschluss-Commit, der diesen Plan ins Repo nimmt.
- **Hinweis zur Datei.** Paket 3 verweist für die Heraufsetzung seiner Modellstufe auf diesen
  Abschnitt; die Zeile hat es nie gegeben — der Abschnitt wird hier angelegt. Die Heraufsetzung
  selbst ist mit `c17f6bb` erledigt und wird nicht rekonstruiert.

## Pakete

### [x] 1. Screenshot-Räumung an die Testkonfiguration hängen
- Findings: TEST-013 (info)
- Ziel: Jeder vitest-Lauf des Integrationspakets räumt `test/__screenshots__`, auch der gezielte Aufruf auf eine einzelne Datei.
- Hash: `1b3dd3f`
- Ergebnis: 0 Runden · TEST-013 behoben, vom Reviewer an
  `packages/shadow-objects-testing/vitest.globalSetup.ts:6-13` und
  `vitest.config.ts:73` bestätigt, Gegenprobe des Implementierers empirisch ·
  klein: `CHANGELOG.md:17-22` formuliert implizit rückblickend, bleibt unter der
  Meldeschwelle und entspricht dem Stil der vorhandenen Wurzel-Einträge
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine öffentliche Oberfläche berührt. Für spätere Pakete relevant:
  `packages/shadow-objects-testing/vitest.config.ts` führt jetzt
  `globalSetup: ['./vitest.globalSetup.ts']`; die Skripte `test` und `watch` des Pakets
  lauten `vitest --run` bzw. `vitest`, ohne Vorlauf.

### [x] 2. Der Slot-Umzug meldet sich an der abgebenden Seite, die Elternbindung fällt ohne Antwort
- Findings: VIEW-018 (low), VIEW-019 (low)
- Ziel: Ein umziehender `<slot>` löst die Re-Request-Runde auch dort aus, wo am Zielort keine Entity zuhört, und ein projiziertes `<shae-ent>` ohne antwortenden Vorfahren verliert seine alte Bindung statt sie zu behalten.
- Bereich: `packages/shadow-objects/src/elements/ShaeEntElement.ts`, Specs und Integrationstests dazu
- Hängt ab von: —
- Modell: stärkste Stufe
- Phase: 3 (Korrektheit)
- Hash: `58e1a46`
- Ergebnis: 2 Nachbesserungsrunden · VIEW-018 und VIEW-019 behoben, vom Reviewer an
  `ShaeEntElement.ts:669-716` (Listener am Slot), `:518` (Abnahme im `disconnectedCallback`),
  `:726-738` (Register und Gate) und `:601-609` (Antwort einsammeln, einmal setzen) belegt ·
  fünf neue Fälle im Integrationspaket, `test:ci` 693 statt 688 · zwei Gegenproben von Hand je
  Finding rot geworden, Mutationen zurückgenommen · eine Grenze **gemessen und dokumentiert**:
  ein Shadow-Host, der das Dokument verlässt und zurückkommt, gibt seinen Watch ab, und ein
  Slot-Umzug aus jeder Entity heraus bleibt danach unbemerkt, bis der Slot eine Zuweisung meldet,
  während wieder eine Entity über ihm steht (Doku, CHANGELOG, `Backlog.md:218-220`, Testfall)
- Nebenbefunde:
  - `packages/shadow-objects/src/view/ViewComponent.ts:153-186` — der Konstruktor akzeptiert über
    `if (options instanceof ViewComponent)` noch die Aufrufform `new ViewComponent(token, parent)`.
    Die Signatur deklariert sie nicht, `docs/` nennt sie nicht; auffindbar nur im Quelltext.
    **Kandidat fürs nächste Audit**, nicht für diesen Lauf.
  - `#hostedSlots` wird nur in `#watchHostedSlot`/`#releaseHostedSlot` kompaktiert. Eine tote
    `WeakRef` bleibt bis dahin im Set liegen; sie hält nichts fest, das Set wächst aber über die
    Lebenszeit einer Entity mit der Zahl der je gehosteten Slots. So aus dem Detailplan übernommen.
  - `shadow-objects-testing` löst `@spearwolf/shadow-objects` über `dist/` auf: ein direkter
    `pnpm -F shadow-objects-testing test` ohne vorheriges Build misst den alten Stand. Kostete in
    Zug 1 einen Fehllauf.
  - `Backlog.md:216` verweist für VIEW-13 auf `ShaeEntElement.ts:527–536`; die Stelle sitzt bei
    `:634-638`. War vor diesem Paket schon falsch, ist jetzt weiter verschoben.
- Folgen: keine offenen. `src/view/ComponentContext.ts` ist mitgeändert (nur der JSDoc-Block an
  `dispatchReRequestParentSiblings`, aus Auflage 3 des Reviews) — die Datei ist für Paket 4 nicht
  mehr unberührt, aber an anderer Stelle.
- Schnittstellen: `ComponentContext.ts:445-449` beschreibt jetzt, dass der Unterschied der beiden
  Re-Request-Signale die **Reihenfolge** ist — `ReRequestParentRoots` löst vor der Frage und
  sortiert dieselbe Antwort über `#appendToOrdered` hinten in `children` ein, `ReRequestParent`
  fragt zuerst und lässt jede gebundene Komponente samt Position stehen. Für **Paket 4** relevant:
  `children` ist eine geordnete Liste, ein zweites Instanzregister muss diese Ordnung mitführen
  oder bewusst umgehen. Für **Paket 3** relevant: `ent-element-slot-move.test.js` baut in Fall 1d
  einen `ViewComponent` von Hand (ohne Element) und ruft am Ende `plain.destroy()` — wer den
  Abbauweg verschärft, fasst diese Zeile mit an. `Backlog.md` trägt einen neuen Grenzen-Block
  direkt über dem, den Paket 4 abräumt.
- Dateien:
  - `packages/shadow-objects/src/elements/ShaeEntElement.ts` (Implementierung beider Findings)
  - `packages/shadow-objects-testing/test/ent-element-slot-move.test.js` (Entity-Kanal, rot zuerst)
  - `packages/shadow-objects-testing/test/prop-element-host.test.js` (Property-Kanal, rot zuerst)
  - `packages/shadow-objects/docs/api-reference.md` (zwei Absätze, s. Schritt 6)
  - `packages/shadow-objects/docs/cheat-sheet.md` (ein Absatz, s. Schritt 6)
  - `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`, drei Stellen, s. Schritt 6)
  - `Backlog.md` (Block »Grenzen des Slot-Umzugs«, s. Schritt 7)
- Vorgehen:

  **Schritt 1 — Tests zuerst, rot gesehen.** Kein Zeichen Produktionscode, bevor die neuen Fälle
  laufen und fehlschlagen. Sie gehören ins Integrationspaket, nicht in eine `*.spec.ts`: der
  gesamte Mechanismus — Slot-Zuweisung über eine Shadow-Grenze, der flattened tree, der Moment, in
  dem `slotchange` meldet — ist in happy-dom nicht belastbar. Nachgeprüft, nicht behauptet: der
  Dateikopf von `ent-element-slot-move.test.js:11-14` sagt genau das, `prop-element-host.test.js:60-63`
  ebenso, und unter `packages/shadow-objects/src/**/*.spec.ts` steht kein einziger Slot-Fall — die
  Spec-Ordner kennen nur `view/` und `propValueConverters`. `packages/shadow-objects-e2e/` bleibt
  außen vor: kein Export, keine Signatur, keine Seite ändert sich; die Suite läuft nur als Verify.

  Vier neue Fälle, dazu eine Verschärfung an einem vorhandenen. Alle vorhandenen Helfer der beiden
  Dateien weiterverwenden (`mount`, `unmountAll`, `nextTask`, `countRequestsOf`, chai-`expect`),
  keine neuen anlegen. Assertions über `entParentNode?.id` bzw. `entNode?.id`, wie im Umfeld.

  1a. `ent-element-slot-move.test.js`, im `describe('shae-ent and a slot that moves')`:
  **`it('follows the slot into a part of the shadow root with no entity above it')`** — Aufbau wie
  im ersten Fall der Datei (`sm-outer` > `#sm-div` > `sm-child`; Shadow Root an `#sm-div` mit
  `<shae-ent id="sm-from"><slot id="sm-slot"></slot></shae-ent>`), zusätzlich ein
  `<div id="sm-plain"></div>` im Shadow Root. Vorbedingung `sm-child.entParentNode?.id === 'sm-from'`.
  Dann `shadowRoot.getElementById('sm-plain').appendChild(shadowRoot.getElementById('sm-slot'))`,
  `await nextTask()`. Erwartung: `sm-child.entParentNode?.id === 'sm-outer'` — der Aufstieg des
  Requests geht vom Kind über den Slot in den Shadow Root, über den Host `#sm-div` hinaus und
  landet bei der äußeren Entity. Zusätzlich `sm-child.viewComponent.parent === outer.viewComponent`.

  1b. Dieselbe Datei: **`it('lets go when the slot leaves the shadow root altogether')`** — gleicher
  Aufbau, statt des Umzugs `shadowRoot.getElementById('sm-slot').remove()`. Erwartung dieselbe:
  `entParentNode?.id === 'sm-outer'`, denn das nicht mehr zugewiesene Kind hängt im Light-DOM unter
  `#sm-div`. Das ist das Fenster zwischen `slot.remove()` und dem Wiedereinhängen aus dem Finding.

  1c. `prop-element-host.test.js`, im `describe('shae-prop follows its host entity')` direkt hinter
  `follows the slot it is projected into when the slot moves to another entity`:
  **`it('follows the slot into a place with no entity above it')`** — gleicher Aufbau wie dort
  (`sm-prop`, `sm-deep`), Shadow Root zusätzlich mit `<div id="sm-plain"></div>`, Slot dorthin
  umgehängt. Erwartung: `prop.entNode?.id === 'sm-outer'` und `deep.entNode?.id === 'sm-outer'`.
  Ids der neuen Fälle so wählen, dass sie mit den bestehenden nicht kollidieren (Präfix `sn-`).

  1d. `ent-element-slot-move.test.js`: **`it('drops the parent binding when nothing in its namespace answers at the new place')`** —
  der VIEW-019-Fall. Markup:
  `<shae-ent id="v19-outer" token="outer"><div id="v19-div"><shae-ent id="v19-child" ns="x" token="child"></shae-ent></div></shae-ent><shae-ent id="v19-keep" ns="x" token="keep"><shae-ent id="v19-kid" ns="x" token="kid"></shae-ent></shae-ent>`,
  Shadow Root an `#v19-div`:
  `<shae-ent id="v19-from" ns="x" token="from"><slot id="v19-slot"></slot></shae-ent><shae-ent id="v19-to" token="to"></shae-ent>`.
  Vorbedingung: `v19-child.entParentNode?.id === 'v19-from'` (gleicher Namespace `x`),
  `v19-kid.entParentNode?.id === 'v19-keep'`. Dann den Slot nach `#v19-to` hängen (Default-Namespace),
  `await nextTask()`. Erwartung: `v19-child.entParentNode === undefined` **und**
  `v19-child.viewComponent.parent === undefined` — im Namespace `x` antwortet über dem Slot niemand
  mehr. Gegenprobe im selben Fall: `v19-kid.entParentNode?.id === 'v19-keep'` bleibt stehen, die
  Runde nimmt korrekt gebundene Geschwister nicht auseinander.

  1e. Verschärfung, **kein roter Fall, sondern die Wache gegen die Doppelrunde**: im vorhandenen
  `it('sets off a re-request round when the entity above the slot changes, and only then')` die
  letzte Assertion von `to.be.at.least(1)` auf `to.equal(1)` ziehen. Sie ist heute grün und muss es
  nach Schritt 3 bleiben — genau hier schlägt eine zweimal laufende Runde auf (abgebende Seite und
  aufnehmende Seite sehen denselben Event). Landet die Zahl stabil auf etwas anderem als 1, erst
  die Quelle der zweiten Anfrage benennen und in den Verlauf schreiben, dann die Assertion
  anpassen — nicht umgekehrt.

  Lauf: `pnpm -F shadow-objects-testing test`. Erwartet rot: 1a, 1b, 1c (alle drei melden die alte
  Entity, `sm-from`), 1d (meldet `v19-from` statt `undefined`). Die Rotmeldungen wörtlich in den
  Verlauf.

  **Schritt 2 — VIEW-018, der Listener wandert mit dem Slot.** Alles in `ShaeEntElement.ts`.

  2a. Registertyp erweitern (`ShaeEntElement.ts:79`):
  `const entHostOfSlot = new WeakMap<Element, WeakRef<ShaeEntElement> | null>();`. Der vorhandene
  Kommentarblock darüber bekommt einen Satz für `null`: ein Eintrag, der niemanden nennt, sagt »die
  Entity, die für diesen Slot geantwortet hat, hat ihn losgelassen« — er ist da (und damit nicht
  `undefined`, nicht die erste Meldung eines Slots) und benennt keine Entity.

  2b. `#askEveryoneToReRequest()` (Zeilen 631-643) wird zur Modulfunktion mit Event-Gate, direkt
  unter `entHostOfSlot`:

  ```ts
  /** The `slotchange` events whose re-request round has already run. */
  const reRequestedForSlotChange = new WeakSet<Event>();

  const askEveryoneToReRequest = (event: Event): void => {
    if (reRequestedForSlotChange.has(event)) return;
    reRequestedForSlotChange.add(event);
    for (const context of ComponentContext.getContextsMap().values()) {
      context.broadcastEvent(ComponentContext.ReRequestParent);
      context.broadcastEvent(ComponentContext.ReRequestEntHost);
    }
  };
  ```

  Der vorhandene Erklärblock der Methode (»Everything the slot projects hangs on the entity above
  the slot…«) zieht mit um und bekommt den Grund für das Gate: beide Seiten eines Umzugs sehen
  denselben Event — die abgebende als Listener am Slot selbst, die aufnehmende beim Bubbeln — und
  die Runde, die jede von ihnen starten würde, ist dieselbe Runde über das ganze Dokument. Wer
  zuerst da ist, fährt sie. Die private Methode entfällt, ihre einzige alte Aufrufstelle ist 2d.

  2c. Neue Instanzteile, unmittelbar vor `#onSlotChange` einsortieren:

  ```ts
  readonly #hostedSlots = new Set<WeakRef<Element>>();

  #watchHostedSlot(slot: Element) {
    for (const ref of this.#hostedSlots) {
      const el = ref.deref();
      if (el === undefined) this.#hostedSlots.delete(ref);
      else if (el === slot) return;
    }
    this.#hostedSlots.add(new WeakRef(slot));
    slot.addEventListener('slotchange', this.#onHostedSlotChange, {capture: false, passive: false});
  }

  #releaseHostedSlot(slot: Element) {
    slot.removeEventListener('slotchange', this.#onHostedSlotChange, {capture: false});
    for (const ref of this.#hostedSlots) {
      const el = ref.deref();
      if (el === undefined || el === slot) this.#hostedSlots.delete(ref);
    }
  }

  #releaseHostedSlots() {
    for (const ref of this.#hostedSlots) {
      ref.deref()?.removeEventListener('slotchange', this.#onHostedSlotChange, {capture: false});
    }
    this.#hostedSlots.clear();
  }

  #onHostedSlotChange = (event: Event) => {
    const slot = event.currentTarget as Element;
    if (this.#isClosestEntAbove(slot)) return;

    this.#releaseHostedSlot(slot);
    if (entHostOfSlot.get(slot)?.deref() === this) {
      entHostOfSlot.set(slot, null);
    }
    askEveryoneToReRequest(event);
  };
  ```

  Kommentare, die dazugehören (englisch, erklären *warum*):
  - an `#hostedSlots`: der Listener am Slot ist das Einzige, was der abgebenden Seite den Verlust
    meldet — `slotchange` feuert am Slot, wo immer er gelandet ist, und der Aufstieg von dort ist
    die einzige Lesart von »gehört er noch mir«, die den Umzug überlebt. `WeakRef` aus demselben
    Grund wie im Register: ein Slot, der weg ist, wird hier von niemandem gehalten.
  - an `#onHostedSlotChange`: `currentTarget` statt `target`, weil ein `<slot>` im Fallback-Inhalt
    eines anderen Slots stehen kann; gemeldet wird dann der innere, zuständig ist der, an dem der
    Listener hängt. Der frühe `return` bei »noch meiner«: dann tut der bubbelnde Listener die ganze
    Arbeit, Register und Runde eingeschlossen — hier bliebe nur eine Doppelmeldung. Und der
    `null`-Eintrag: ein Slot, der zu dieser Entity zurückkommt, hat zweimal den Besitzer gewechselt,
    und die Runde muss auch für den zweiten laufen.

  2d. `#onSlotChange` (Zeilen 645-676): im Zweig `if (this.#isClosestEntAbove(slot))` der Aufruf
  `this.#watchHostedSlot(slot);` direkt hinter das `entHostOfSlot.set(...)`, und das Gate wird
  `null`-fest:

  ```ts
  const previous = entHostOfSlot.get(slot);
  entHostOfSlot.set(slot, new WeakRef(this));
  this.#watchHostedSlot(slot);
  if (previous !== undefined && previous?.deref() !== this) {
    askEveryoneToReRequest(event);
  }
  ```

  Der vorhandene Gate-Kommentar bleibt und bekommt den dritten Fall: ein Eintrag, der niemanden
  nennt, ist ein Slot, der zwischendurch unter keiner Entity stand — auch das ist ein Wechsel.
  `#askPropertiesToReRequestHost()` bleibt unverändert an erster Stelle der Methode.

  2e. `disconnectedCallback` (Zeilen 483-515): `this.#releaseHostedSlots();` unmittelbar hinter
  `this.#destroyParentObserver();`. Eine Entity außerhalb des Baums antwortet für keinen Slot mehr,
  und ihre Listener dürfen nichts überleben, was sie selbst nicht überlebt. Die drei Abnahmewege
  sind damit vollständig: Hostwechsel und Verschwinden des Slots über `#onHostedSlotChange` →
  `#releaseHostedSlot`, Verlassen des Baums über `#releaseHostedSlots`, und ein Slot, der ohne
  weiteres `slotchange` eingesammelt wird, hält niemanden fest, weil das Set nur `WeakRef`s führt.

  **Schritt 3 — VIEW-019, gelöst wird nur ohne Antwort.** `#dispatchRequestParent()` (Zeilen 568-571)
  sammelt die Antwort ein und setzt sie einmal:

  ```ts
  #dispatchRequestParent() {
    let entParent: ShaeEntElement | undefined;
    // an entity takes only an ancestor from its own namespace as a parent
    requestEntAncestor(this, {ns: this.ns, answer: (entNode) => (entParent = entNode)});
    this.#setParent(entParent);
  }
  ```

  `requestEntAncestor` verschickt einen synchronen `dispatchEvent`; nach der Rückkehr steht fest, ob
  `answer()` lief. Genau dieses Muster fährt `ShaePropElement.#findEntNode` (`ShaePropElement.ts:303-307`)
  schon für den Property-Kanal — die beiden Kanäle laufen damit an dieser Stelle wieder zusammen.
  `#setParent` bleibt unangetastet: gleiche Antwort wie bisher heißt `this.entParentNode === parent`
  und der frühe `return`, keine Antwort heißt `#setParent(undefined)` mit dem Weg, den
  `#reRequestParentAsRoot` und `onParentChanged` ohnehin schon gehen. Kein zusätzliches Flag, kein
  Rückgabewert, ein Aufrufort.

  Der Kommentarblock über `#reRequestParent` (Zeilen 524-526) beschreibt danach den Ist-Zustand:
  eine Entity, die bei ihrem nächsten Vorfahren gebunden ist, bekommt dieselbe Antwort zurück und
  `#setParent` kehrt um, ohne etwas anzufassen — die Runde lässt jedes korrekt gebundene
  Geschwister in den `children` seines Elternteils stehen. Nur wer keine Antwort bekommt, verliert
  die Bindung, und der sitzt ohnehin unter nichts mehr. Kein Rückblick auf den Vorzustand.

  Die sieben Aufrufstellen von `#dispatchRequestParent` sind geprüft: `ns$.onChange` (Zeile 178),
  `connectedCallback` (410), `onParentChanged` (462) und `#reRequestParentAsRoot` (520) räumen die
  Bindung vorher selbst ab, dort ist das Lösen ein No-op; `#setParent`s Microtask (601) bekommt
  dieselbe Antwort wie zuvor und rührt nichts an; `#onReRequestParent` (688) und `#reRequestParent`
  (537) sind die beiden, die der Fix betrifft — beide zu Recht, sie laufen nach einer Änderung über
  dem Element.

  **Schritt 4 — grün.** `pnpm -F shadow-objects-testing test`, dann `pnpm -F @spearwolf/shadow-objects test`.
  Alle vier neuen Fälle grün, die 323 vorhandenen des Integrationspakets und die 364 des Kernpakets
  ebenso. Fällt dabei ein vorhandener Fall um, ist das ein Befund und keine Testanpassung: erst in
  den Verlauf, dann entscheiden.

  **Schritt 5 — Gegenprobe von Hand.** Je Finding eine Mutation, die den Fix zurücknimmt, und der
  zugehörige Test muss rot werden: (a) den `askEveryoneToReRequest(event)`-Aufruf in
  `#onHostedSlotChange` auskommentieren → 1a/1b/1c rot; (b) in `#dispatchRequestParent` das
  `this.#setParent(entParent)` auf `if (entParent) this.#setParent(entParent)` einengen → 1d rot.
  Beide Mutationen danach zurücknehmen, das Ergebnis in den Verlauf.

  **Schritt 6 — Doku und CHANGELOG, gleicher Zug.** Öffentlich zugesagtes Verhalten ändert sich,
  also ziehen alle drei nach:
  - `docs/api-reference.md`, Absatz »The slot move has two edges…« (Zeilen 1619-1629): beide Kanten
    fallen weg. Neu: der Umzug wird verfolgt, wohin der Slot auch geht — in eine andere Entity, in
    einen entitylosen Teil derselben Shadow Root, und `slot.remove()` ebenso; die Entity, die den
    Slot abgibt, meldet den Verlust selbst. Und: ein projiziertes `<shae-ent>`, für das im eigenen
    Namespace niemand mehr antwortet, steht danach ohne Elternteil da — `entParentNode` und
    `viewComponent.parent` sind leer, es ist eine Wurzel seines Kontexts.
  - `docs/api-reference.md`, Absatz »That is where the announcement ends…« (Zeilen 1739-1745) unter
    `#### Finding the Host Entity`: die Grenze fällt, ein `<shae-prop>` folgt dem Slot auch dorthin,
    wo keine Entity über ihm steht, und steht dann ohne Host da (der Satz weiter oben über »no host«
    trägt das schon).
  - `docs/cheat-sheet.md`, Absatz »The one move that is not followed…« (Zeilen 266-270): ersatzlos
    ersetzen durch die knappe positive Fassung — jeder Slot-Umzug wird verfolgt; findet ein
    projiziertes `<shae-ent>` im eigenen Namespace niemanden, hat es kein Elternteil.
  - `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`, **drei Stellen im Bestand ändern,
    keinen vierten Punkt anhängen**: der Abschnitt ist nicht veröffentlicht, zwei Einträge, die
    einander widersprechen, wären schlechter als eine korrigierte Zusage. (i) Im Kasten »Next
    release« der Halbsatz »— a slot that moves out of every entity, and a projected entity that
    finds no answering ancestor in the namespace it arrives in, are unchanged« (Zeilen 47-50): die
    Ausnahmen fallen, und die für Konsumenten sichtbare Folge kommt hinein — ein projiziertes
    `<shae-ent>` ohne antwortenden Vorfahren liest `entParentNode` als `undefined`, wo es die alte
    Entity nannte. (ii) Im Punkt »**Bugfix (elements):** a `<slot>` that is moved out of one entity
    **and into another**…« der Schlusssatz »Two moves stay outside this: …« ersetzen durch die
    Beschreibung der abgebenden Seite: die Entity über dem Slot hängt ihren Listener an den Slot
    selbst und merkt den Verlust auch dort, wo am Zielort niemand zuhört; die Runde läuft je
    `slotchange` höchstens einmal. (iii) Im Punkt »**Bugfix (elements):** a `<shae-prop>` follows
    the closest entity above it…« den Einschub »though not one moving out of every entity«
    streichen.

  **Schritt 7 — `Backlog.md` synchronisieren.** Der Block »Grenzen des Slot-Umzugs, in Chromium
  gemessen (2026-08-18, Reviewer 6):« (Zeilen 218-221) verschwindet vollständig — beide Punkte sind
  seine einzigen Inhalte, und erledigte Punkte verlassen die Datei, sie werden nicht abgehakt. Die
  Verweise auf `view-layer-remediation-plan-2.md`, Paket 6 gehen mit. Der darunterliegende Block
  »Grenze der Component-Ablösung« bleibt unangetastet, er gehört zu Paket 4. Keine
  TODO-Kommentare berührt, also kein `pnpm make:todo`.

  **Schritt 8 — Verify** in der Reihenfolge unten, jede Ausgabe in den Verlauf.

- Verify: `pnpm lint` · `pnpm typecheck` · `pnpm test:ci --force` · `pnpm build` · `pnpm -F shadow-objects-e2e test`
  (die letzten beiden, weil `src/elements/` angefasst wird). Erwartet: `test:ci` 692 statt 688
  (vier neue Fälle im Integrationspaket), e2e unverändert 402.
- Commit: `fix(shae-ent): report a slot move from the side that loses the slot, and drop a parent binding nobody answers for (VIEW-018, VIEW-019)`
- Verlauf:
  - 2026-08-18 Zug 5 (Nachbesserung Runde 2): Blocker — der Erholungsweg in `docs/api-reference.md:1625-1635` steht jetzt richtig: eine Zuweisungsmeldung holt den Slot nur zurück, während er wieder unter einer Entity steht (`#onSlotChange` bubbelnd, `#watchHostedSlot`, Gate über die alte `WeakRef`); ohne Entity darüber bleibt der Zustand, wie oft die Zuweisung auch wechselt · Kleinigkeit 3 im selben Absatz: beide Abgabewege benannt (Ende der Nähe und Verlassen des Baums) · Kleinigkeit 1 — die Gegenprobe des Grenzfalls läuft nicht mehr über `shadowRoot.innerHTML +=` (das die Shadow Root neu baut), sondern über `insertAdjacentHTML('afterend', …)` an `#th-plain`; der Fall bleibt grün **und** trägt seine Aussage jetzt selbst: mit auf `previous === null` verengtem Gate (`ShaeEntElement.ts:737`) wird er rot — `AssertionError: while a move into another entity carries as always: expected 'th-from' to equal 'th-to'`, Mutation zurückgenommen · Kleinigkeit 2 — `plain.destroy()` am Ende von 1d, der handgebaute `ViewComponent` verlässt `ComponentContext.get('x')` mit dem Fall · Migrationskasten unverändert · Verify: `pnpm lint` rc=0 (2 `biome.json`-Infos), `pnpm typecheck` ✓, `pnpm test:ci --force` **693** grün (364 + 328 + 1), `pnpm build` ✓, e2e **402** grün.
  - 2026-08-18 Zug 4 (Nachbesserung Runde 1): Blocker 1-3 — Semantik von `ComponentContext.ReRequestParent` an `docs/api-reference.md:788`, `:929` und `view/ComponentContext.ts:445-449` (JSDoc `dispatchReRequestParentSiblings`) auf den Ist-Zustand gezogen · Auflagen 4-7 — CHANGELOG-Bullet und Kasten in sich stimmig gemacht, Fehlschluss »not `composed` … so what stands at the destination decides nothing« umgedreht, Aufzählung `:1614` auf »moving the `<slot>` element itself« gekürzt · Auflage 8 empirisch bestätigt, Wegwerf-Fall in echtem Chromium: `AssertionError: AFTER MOVE — expected th-outer: expected 'th-from' to equal 'th-outer'`; Ursache exakt belegt — mit in `disconnectedCallback` abgeschaltetem `#releaseHostedSlots()` läuft derselbe Fall grün (328 passed). Nicht aufgehoben: ein Wiedereinsammeln beim Connect bräuchte `querySelectorAll('slot')` je Entity, also neue Mechanik. Grenze eingegrenzt (ebenfalls gemessen): nach dem Rundlauf trägt die aufnehmende Seite weiter, nur der Umzug an eine Stelle ohne Entity darüber geht verloren. Doku-Vorbehalt in `api-reference.md`, `cheat-sheet.md` und CHANGELOG, neuer Block in `Backlog.md`, Fall `misses a slot moving out of every entity after its shadow host left the document and came back` hält sie fest · Auflage 9: die Ordnungs-Assertion greift mit zwei elementgestützten Kindern **nicht** — `broadcastEvent` läuft über `traverseLevelOrderBFS()`, ein vollständiger Sweep in Array-Reihenfolge stellt die Reihenfolge wieder her (unter der Audit-Mutation gemessen: 1d blieb grün). Erst ein drittes Kind ohne Element — ein von Hand gebauter `ViewComponent` — macht den Sweep partiell; damit ist 1d unter der Audit-Mutation rot (`AssertionError: and leaves it standing where it stood: expected [ Array(3) ] to deeply equal [ Array(3) ]`) und gegen den echten Code grün. Nebenbei gemessen: die Audit-Mutation lässt die Integrationssuite in einer Microtask-Schleife hängen · Verify: `pnpm lint` rc=0 (2 `biome.json`-Infos), `pnpm typecheck` ✓, `pnpm test:ci --force` **693** grün (364 + 328 + 1; 692 plus der Fall zu Auflage 8), `pnpm build` ✓, e2e 402 grün.
  - 2026-08-18 Zug 2 (Review-Nachbesserung, keine Blocker): Punkt 1 — Wert der Konstante auf `'view-component-destroyed'` gezogen (kebab-case wie die drei Geschwister an `ComponentContext.ts:51-63`); **kein Test führte den alten Wert wörtlich**, die einzigen Fundstellen waren `ViewComponent.ts:37` und dieser Plan · Punkt 2 — Literalwert in `docs/api-reference.md:794` ergänzt, dazu die Abgrenzung gegen das top-level `Destroyed` (`'destroyed'`, Worker-Kanal); derselbe Zweizeiler zusätzlich im JSDoc der Konstante, weil die Verwechslung schon in der IDE greift · Punkt 3 — Fenstersatz in `api-reference.md:815` und `CHANGELOG.md:70` deckt jetzt beide Hälften: die Runde erreicht das Element nicht, und ein `vc.dispatchEvent()` im selben Task hinterlässt kein DOM-`CustomEvent` · Punkt 4 — neuer Fall `sets up once when two teardowns fall into the same task` neben 1g; **gemessen: er bezeugt das Pending-Gate nicht** — mit auf `void this.#reSubscribePending;` entschärftem Gate bleiben alle 334 grün, weil jeder Effekt-Neulauf vor dem Abonnieren aufräumt und zwei Microtasks dasselbe Ergebnis liefern wie einer; das Gate ist eine Sparmaßnahme, keine Korrektheitswache. Der Fall ist trotzdem kein Leerlauf: unter Mutation (a) wird er rot (`AssertionError: the element answers once, not once per teardown: expected [] to have a length of 1 but got 0`), er hält also die Zusage »eine Heilung beantwortet beide Abbauten« · Punkt 5 — `ShaeEntElement.ts:556-559`: »Leaving the context destroys the ViewComponent« auf den Ist-Zustand gezogen (löst ab, behält alles auf der Instanz) · nicht angefasst wie aufgetragen: Tabellenzeile `dispatchEvent` im zerstörten Zustand, der `ViewComponentError`-Fall in `#setParent`, die stale Referenz aus Paket 4 · Verify: `pnpm lint` rc=0 (2 `biome.json`-Infos, 192 Dateien, `lint:fix` ohne Änderung), `pnpm typecheck` 3/3, `pnpm build` 3/3, `pnpm test:ci --force` **717** grün (382 + 334 + 1), e2e **402** grün.
  - 2026-08-18 Zug 1: Schritte 1-8 umgesetzt · rot zuerst (`pnpm -F shadow-objects-testing test`, 4 failed | 323 passed): 1a `AssertionError: no entity stands above the slot any more: expected 'sm-from' to equal 'sm-outer'`, 1b `AssertionError: unassigned, the child hangs where its own ancestors are: expected 'sm-from' to equal 'sm-outer'`, 1c `AssertionError: no entity stands above the slot any more: expected 'sn-from' to equal 'sn-outer'`, 1d `AssertionError: nothing in its namespace answers, so it has no parent: expected <shae-ent id="v19-from" ns="x" token="from" style="display: contents;"></shae-ent> to be undefined` · 1e (`to.equal(1)`) war rot wie grün stabil auf 1 · Gegenprobe: (a) `askEveryoneToReRequest(event)` in `#onHostedSlotChange` auskommentiert → 3 failed (1a, 1b, 1c), 1d bleibt grün; (b) `if (entParent) this.#setParent(entParent)` → 1 failed (1d), 1a-1c bleiben grün; beide Mutationen zurückgenommen, Datei danach byte-identisch zum Stand davor · Verify: `pnpm lint` rc=0 (2 `biome.json`-Infos), `pnpm typecheck` ✓, `pnpm test:ci --force` 692 grün (364 + 327 + 1), `pnpm build` ✓, e2e 402 grün · Hinweis für den nächsten Zug: `shadow-objects-testing` löst `@spearwolf/shadow-objects` über `dist/` auf, ein Lauf ohne vorheriges `pnpm -F @spearwolf/shadow-objects build` misst den alten Stand.
  - 2026-08-18 Zug 0: Detailplan steht · VIEW-018 unverändert, `ShaeEntElement.ts:645-676` (`#onSlotChange`) steht Zeile für Zeile wie im Audit, `entHostOfSlot` bei `:79` · VIEW-019 unverändert, `ShaeEntElement.ts:638-643` (`#askEveryoneToReRequest`) und `view/ComponentContext.ts:372-376` (`broadcastEvent`) ebenso · Paket 1 hat nur `packages/shadow-objects-testing/` und das Wurzel-CHANGELOG angefasst, kein Berührungspunkt.

**VIEW-018 · low · packages/shadow-objects/src/elements/ShaeEntElement.ts:645-676 (#onSlotChange)** — Ein slot, der in einen entitylosen Bereich derselben Shadow Root zieht, erreicht keinen Zuhörer

slotchange ist nicht composed und endet an der Shadow Root, in der der `<slot>` nach dem Umzug steht. Landet er dort unter keiner Entity, läuft #onSlotChange nirgends: weder das Register noch die Re-Request-Runde kommen an, und beide Kanäle bleiben stehen — eine projizierte Property hängt weiter an ihrer alten Host-Entity, entParentNode eines projizierten `<shae-ent>` ebenso. Dasselbe gilt für das Fenster zwischen slot.remove() und dem Wiedereinhängen, weil auch dort keine Entity über dem Slot steht.

Empfehlung: Nur an der abgebenden Seite zu schließen: die Entity müsste ihre eigenen `<slot>`-Nachkommen beobachten, statt auf ein Ereignis zu warten, das sie nicht erreicht. Das kostet einen MutationObserver je Entity mit subtree: true, weil ein MutationObserver nicht nach Tag filtern kann, und ist eine eigene Entscheidung.

Evidenz (Audit): In echtem Chromium gemessen (Reviewer 2026-08-18): von sechs einzeln gefahrenen Umzugsvarianten tragen drei nicht, darunter dieser Fall. Die Grenze steht in docs/ und in Backlog.md unter »Grenzen des Slot-Umzugs«.

*Der freigegebene Weg weicht ab: der Listener wandert mit dem Slot, kein MutationObserver — siehe »Entscheidungen« und Schritt 2.*

**VIEW-019 · low · packages/shadow-objects/src/elements/ShaeEntElement.ts:638-643, view/ComponentContext.ts:372-376** — Ein projiziertes shae-ent ohne antwortenden Vorfahren im Ziel-Namespace behält seine alte Bindung

#askEveryoneToReRequest schickt die Aufforderung über broadcastEvent(ReRequestParent) in jeden Namespace, aber die Aufforderung löst keine vorhandene Bindung. Findet das projizierte `<shae-ent>` am Zielort keinen antwortenden Vorfahren, bleiben entParentNode und viewComponent.parent auf dem alten Stand stehen. Der Property-Kanal zieht im selben Zug korrekt nach — an dieser Stelle laufen die beiden Kanäle auseinander.

Empfehlung: Die Aufforderung müsste die Bindung lösen, bevor sie neu sucht, so wie #reRequestParentAsRoot es am Wurzelkanal tut. Das ändert jede Re-Request-Runde und gehört in den Umbau der Elternsuche, nicht daneben.

Evidenz (Audit): In echtem Chromium gemessen (Reviewer 2026-08-18), aus derselben Reihe von sechs Umzugsvarianten; in docs/ und Backlog.md als Grenze benannt.

*Der freigegebene Weg weicht ab: gelöst wird erst, wenn der synchrone Dispatch ohne Antwort zurückkommt — siehe »Entscheidungen« und Schritt 3.*

### [x] 3. Eine zerstörte ViewComponent ist still
- Findings: VIEW-021 (info)
- Ziel: `destroy()` nimmt die Listener der Komponente ab und lässt keinen `dispatchEvent`-Patch auf
  der Instanz stehen. Der Kontextwechsel einer weiterlebenden Komponente bleibt davon unberührt —
  siehe »Der Schnitt« unten, das ist die einzige Stelle, an der dieser Plan das Ziel des
  Paketkopfs enger fasst als die ursprüngliche Formulierung (»kein Abbauweg«).
- Bereich: `packages/shadow-objects/src/view/ViewComponent.ts`, `src/view/ViewComponent.spec.ts`,
  `packages/shadow-objects-testing/test/ent-element-events.test.js`, `docs/api-reference.md`,
  `docs/cheat-sheet.md`, `packages/shadow-objects/CHANGELOG.md`, `Backlog.md`
- Hängt ab von: —
- Modell: stärkste Stufe (heraufgesetzt, Begründung in der Restplan-Prüfung)
- Phase: 3 (Korrektheit) · öffentliche Verhaltensänderung
- Hash: `c17f6bb`
- Ergebnis: 2 Nachbesserungsrunden · VIEW-021 behoben, vom Reviewer an
  `ViewComponent.ts:274-284` belegt — `off(this)` erreicht laut eventize-Deklaration auch `once`,
  jeder Abbauweg des Contexts mündet in `destroy()` (`ComponentContext.ts:186`, `:264`, `:558`,
  `:589`) · der Schnitt zwischen `#leaveContext()` (`:256-264`, Setter) und `destroy()` ist
  vollständig, kein Pfad geht über den falschen · neun neue Fälle, `test:ci` 703 statt 693 ·
  drei Mutationen von Hand, davon eine gegen den Schnitt — die machte fünf statt der geplanten
  drei Fälle rot, alle an derselben Kante (`ShaeEntElement.disconnectedCallback` → Setter):
  eine Ursache, mehr Zeugen
- **Folge, gemessen und an Paket 4 übergeben:** Ein flächiger Abbau (`clear()`, `dispose()`,
  `destroyComponent()`, `removeSubTree()`) macht jedes darüberstehende `<shae-ent>` **dauerhaft
  taub** für Re-Request-Runden. Das Element abonniert die drei Events genau einmal
  (`ShaeEntElement.ts:257-263`, gespeist aus `viewComponent$`, das einmal geschrieben und nie
  zurückgesetzt wird); `destroy()` nimmt sie jetzt mit. In Chromium gemessen: gegen `58e1a46`
  `baseline=1 after=2`, gegen diesen Stand `baseline=1 after=1`. Weder `vc.context = ctx` noch ein
  Aus- und Wiedereinhängen des Elements holt sie zurück (`afterReAppend=1`, Kontrolllauf ohne
  `clear()` `afterReAppend=2`) — **nur ein neues `<shae-ent>` an dieser Stelle antwortet wieder**
  (`afterFresh=3`). Festgehalten in `docs/api-reference.md:814`, `CHANGELOG.md:67`,
  `Backlog.md:225` und dem Wächter `ent-element-context-clear.test.js`.
  **Paket 4 entscheidet**, ob der flächige Abbau über `destroy()` läuft (still, Stand jetzt) oder
  über eine Ablösung, die die Abonnements stehen lässt. Räumt Paket 4 die Taubheit ab, verlässt
  `Backlog.md:225` die Datei mit.
- Nebenbefunde:
  - `biome.json` führt `trailingNewline: false` — Dateien in diesem Repo enden **ohne**
    abschließenden Zeilenumbruch. Nirgends dokumentiert, kostet jeden neuen Beitrag einen
    Lint-Fehlschlag. Kandidat für eine Zeile in `AGENTS.md`.
  - `ShaeEntElement.ts:265-274` ist die einzige Stelle, an der das Element seine Komponente
    beendet (`vc.destroy()` in der Effekt-Aufräumung), und sie kann nie laufen: `viewComponent$`
    wird einmal geschrieben, die Signale des Elements werden nie zerstört — anders als bei
    `ShaeWorkerElement.ts:244`. Ein `<shae-ent>` löst seine Komponente ab, es beendet sie nie.
    Vorbestehend, und der Grund, warum der Schnitt trägt.
  - `ViewComponent.ts:153-186` akzeptiert weiter die undeklarierte Aufrufform
    `new ViewComponent(token, parent)` (aus Paket 2, unverändert offen).
  - `api-reference.md:818` verspricht für den Ablöse-Weg »every row holds for it«; gepinnt ist
    davon nur die Abnahme (`ViewComponent.spec.ts:485-497`), nicht jede Zeile der Tabelle.
- Schnittstellen: `#leaveContext()` und `destroy()` unterscheiden sich **ausschließlich** in der
  Abnahme — wer einen weiteren Abbauweg baut, entscheidet damit explizit zwischen Ablösen und
  Beenden. `#leaveContext()` ist **privat**; der einzige öffentliche Ablöseweg ist
  `component.context = undefined`, ein Setter, den ein Context während `clear()` über seine eigene
  Iteration laufen ließe (für **Paket 4** eine Strukturentscheidung an `ComponentContext.ts:169-187`,
  kein Einzeiler). `destroyComponent()` (`:186`) ist der Trichter, in dem alle vier Abbauwege
  zusammenlaufen — ein zweites Register gehört dort hinein, nicht daneben. `ComponentContext.ts`
  ist von diesem Paket erstmals angefasst (nur der Kommentar `:183-185`).
  Mit Paket 4 fallen voraussichtlich: `Backlog.md:224`, `api-reference.md:818`
  (»one component per uuid«) und die Schlussklausel von `CHANGELOG.md:66`.
- Dateien:
  - `packages/shadow-objects/src/view/ViewComponent.ts` (Implementierung, s. Schritt 2)
  - `packages/shadow-objects/src/view/ViewComponent.spec.ts` (fünf neue Fälle, einer umgeschrieben, s. Schritt 1)
  - `packages/shadow-objects-testing/test/ent-element-events.test.js` (ein Wächter, s. Schritt 1g)
  - `packages/shadow-objects/docs/api-reference.md` (fünf Stellen, s. Schritt 5)
  - `packages/shadow-objects/docs/cheat-sheet.md` (zwei Stellen, s. Schritt 5)
  - `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`, zwei Stellen, s. Schritt 6)
  - `Backlog.md` (eine Zeile, s. Schritt 7)
  - `packages/shadow-objects/README.md` **nicht betroffen** — nachgeschlagen: die Datei enthält
    weder `destroy` noch `eventize`.

- **Der Schnitt (vor dem ersten Zeichen Code lesen).** `destroy()` einfach um ein `off(this)` zu
  erweitern ist falsch, und zwar nachweisbar. Die Kette: `ShaeEntElement.disconnectedCallback`
  setzt `this.componentContext$.set(undefined)` (`ShaeEntElement.ts:542`), das läuft über
  `#applyComponentContext` (`:345-351`) in `vc.context = undefined`, und der Setter ruft heute
  `this.destroy()` (`ViewComponent.ts:86-88`). Ein `<shae-ent>`, das den Baum verlässt, hält also
  eine zerstörte Komponente — genau so steht es auch im CHANGELOG (`CHANGELOG.md:78`, »left it
  holding a destroyed `ViewComponent` after it came back«). Dasselbe gilt für jeden
  `ns`-Wechsel. Ein `off(this)` in `destroy()` nähme damit beim ersten Disconnect die drei
  Abonnements ab, die das Element in `createEffect` (`ShaeEntElement.ts:254-277`) auf
  `ReRequestParentRoots`, `ReRequestParent` und `ReRequestEntHost` hält — und der Effekt läuft
  nicht neu, weil `viewComponent$` sich nicht ändert. Nach einem Aus- und Wiedereinhängen
  antwortete das Element auf keine Re-Request-Runde mehr; genau die Mechanik, die Paket 2 gebaut
  hat, wäre still. Der `dispatchEvent`-Patch (`:279-330`) fiele mit, und die beiden vorhandenen
  Fälle `ent-element-events.test.js:388` und `:432` würden rot.

  Deshalb trennt dieses Paket zwei Dinge, die heute denselben Namen tragen: **den Kontext
  verlassen** (bleibt, wie es ist, und heißt künftig `#leaveContext()`) und **die Komponente
  beenden** (`destroy()`, neu mit Abnahme). Der Setter nimmt den ersten Weg, `destroy()` und
  jeder Abbauweg des Contexts (`clear()`, `destroyComponent()`, `removeSubTree()`, `dispose()`
  gehen alle über `component.destroy()`, `ComponentContext.ts:169-186`, `:551-570`) den zweiten.
  Die Nutzerentscheidung — »`destroy()` nimmt die Listener ab« — bleibt damit unangetastet.
  Die Folge daraus, dass `vc.context = null` nicht mehr wortgleich mit `destroy()` ist, hat der
  Nutzer am 2026-08-18 bestätigt (siehe »Entscheidungen«): Ablösen und Beenden werden getrennt.

- Vorgehen:

  **Schritt 1 — Tests zuerst, rot gesehen.** Kein Zeichen Produktionscode, bevor die neuen Fälle
  laufen und fehlschlagen.

  *Ebenenwahl, nachgeprüft statt behauptet.* Der Kern gehört in `packages/shadow-objects/src/view/ViewComponent.spec.ts`:
  Die Sache besteht aus `ViewComponent`, `ComponentContext` und den freien eventize-Funktionen,
  kein DOM-Knoten ist beteiligt; die Datei importiert `on` bereits in `:1`, und der Block
  `describe('the destroyed state')` (`:362-475`) hält den zerstörten Zustand heute schon Fall für
  Fall fest — samt der einen Zusage, die sich umdreht (`:425-434`). `vitest.config.ts:5` stellt
  happy-dom, gebraucht wird davon nichts. Ins Integrationspaket gehört nur der Wächter über die
  Elementkette: `ent-element-events.test.js:7-12` begründet im Dateikopf, warum die
  Patch-Fälle echtes Chromium brauchen (Upgrade-Reihenfolge der Custom Elements, echtes
  `CustomEvent`-Bubbling), und `:388-407` sowie `:432-444` sind die beiden vorhandenen Fälle, die
  den Patch über ein Remove/Re-Append und über einen `ns`-Wechsel hinweg festnageln. In happy-dom
  ist beides nicht belastbar. `packages/shadow-objects-e2e/` bleibt außen vor: kein Export, keine
  Signatur, keine Seite ändert sich; die Suite läuft nur als Verify.

  Alle vorhandenen Helfer weiterverwenden — `makeDestroyed()` (`ViewComponent.spec.ts:363-368`),
  `vi.fn()`, `on` aus eventize, im Integrationspaket `mount`/`unmountAll` und chai-`expect`.
  Keine neuen Helfer.

  1a. **Rot.** `ViewComponent.spec.ts`, in `describe('the destroyed state')`, direkt hinter dem
  Fall aus 1b: **`it('takes the listeners a consumer left on it off')`** —
  `const c = new ViewComponent('test'); const spy = vi.fn(); const unsubscribe = on(c, 'testEvent', spy);`
  dann `ctx.buildChangeTrails(); c.destroy(); c.dispatchEvent('testEvent', 42, false);`
  Erwartung: `expect(spy).not.toHaveBeenCalled()` und `expect(() => unsubscribe()).not.toThrow()`.
  Erwartete Rotmeldung: `AssertionError: expected "spy" to not be called at all, but actually been called 1 times`.

  1b. **Umschreiben, bleibt grün.** Derselbe Block, `:425-434`: der Fall
  `it('still notifies its own listeners on dispatchEvent, without traversing children')` heißt
  künftig **`it('notifies a listener registered after the teardown, without traversing children')`**.
  Der Körper bleibt, wie er ist — die Registrierung steht dort ohnehin *nach* `makeDestroyed()`.
  Ein Kommentar darüber benennt die Grenze: die Abnahme holt weg, was im Moment des Abbaus auf der
  Komponente liegt; sie versiegelt sie nicht. Er ist die Gegenkante zu 1a und muss vor und nach
  dem Fix grün sein.

  1c. **Rot.** Derselbe Block: **`it('drops a dispatchEvent installed on the instance')`** —
  `const c = new ViewComponent('test');`, dann den Patch nachbauen, wie das Element ihn setzt
  (`ShaeEntElement.ts:317-321`):
  `Object.defineProperty(c, 'dispatchEvent', {value: vi.fn(), writable: true, configurable: true});`
  `expect(Object.hasOwn(c, 'dispatchEvent')).toBe(true); c.destroy();`
  Erwartung: `expect(Object.hasOwn(c, 'dispatchEvent')).toBe(false)` und
  `expect(c.dispatchEvent).toBe(ViewComponent.prototype.dispatchEvent)`.
  Erwartete Rotmeldung: `AssertionError: expected true to be false // Object.is equality`.

  1d. **Rot.** Derselbe Block, hinter `it('is destroyed by a clear() of its context and can re-join it')`
  (`:460-474`): **`it('takes the listeners off when its context is cleared')`** — eigener Context
  wie dort (`ComponentContext.get('ViewComponent.spec-cleared-listeners')`), `on(c, 'testEvent', spy)`,
  `ownCtx.buildChangeTrails(); ownCtx.clear(); c.dispatchEvent('testEvent', 1, false);`
  Erwartung: `expect(spy).not.toHaveBeenCalled()`, am Ende `ownCtx.dispose()` wie im Nachbarfall.
  Erwartete Rotmeldung: `AssertionError: expected "spy" to not be called at all, but actually been called 1 times`.

  1e. **Wächter, grün vor und nach dem Fix.** `ViewComponent.spec.ts`, im äußeren `describe`
  direkt hinter `it('should disconnect from context')` (`:168-188`):
  **`it('keeps its listeners when it moves to another context')`** — `on(c, 'testEvent', spy)`,
  `c.context = ComponentContext.get('ViewComponent.spec-move')`, `c.dispatchEvent('testEvent', 1, false)`,
  Erwartung `expect(spy).toHaveBeenCalledTimes(1)`; Context am Ende `dispose()`.

  1f. **Wächter, grün vor und nach dem Fix.** Daneben:
  **`it('keeps its listeners when it leaves its context without joining another')`** — `on(c, 'testEvent', spy)`,
  `c.context = undefined`, `expect(c.isDestroyed).toBe(true)`, `c.dispatchEvent('testEvent', 1, false)`,
  Erwartung `expect(spy).toHaveBeenCalledTimes(1)`. Kommentar darüber: das ist der Weg, den ein
  `<shae-ent>` beim Verlassen des Dokuments nimmt (`ShaeEntElement.ts:542`) — die Komponente wird
  zurückgegeben, nicht beendet. 1e und 1f sind die beiden Fälle, an denen die naive Fassung des
  Fixes auffliegt.

  1g. **Wächter im Integrationspaket, grün vor und nach dem Fix.** `ent-element-events.test.js`,
  in `describe('shae-ent the dispatchEvent patch')` direkt hinter
  `it('keeps the same ViewComponent and the patch across a remove and a re-append')` (`:388-407`):
  **`it('keeps an eventize listener on its ViewComponent across a remove and a re-append')`** —
  Aufbau über `mountPK()`, `const container = p.parentElement;` und `const vc = p.viewComponent;`
  wie im Nachbarfall, dann `const calls = []; on(vc, 'foo', (data) => calls.push(data));`
  und `p.remove(); container.append(p);`, `expect(p.viewComponent).to.equal(vc);`,
  `p.viewComponent.dispatchEvent('foo', {val: 1}, false);`, Erwartung
  `expect(calls).to.have.lengthOf(1)`. `on` ist in `:2` schon importiert.

  Läufe: `pnpm -F @spearwolf/shadow-objects test` → erwartet **3 failed** (1a, 1c, 1d), alles
  andere grün. Danach `pnpm -F @spearwolf/shadow-objects build` und
  `pnpm -F shadow-objects-testing test` → 1g grün (das Integrationspaket löst die Bibliothek über
  `dist/` auf, ein Lauf ohne Build misst den alten Stand — Nebenbefund aus Paket 2). Die
  Rotmeldungen wörtlich in den Verlauf; weichen sie vom Wortlaut oben ab, gilt die gemessene
  Fassung.

  **Schritt 2 — Umsetzung, alles in `packages/shadow-objects/src/view/ViewComponent.ts`.**

  2a. Import (`:1`): `off` dazu — `import {emit, eventize, off} from '@spearwolf/eventize';`.
  Dieselbe Machart wie `ShadowEnv.ts:253` und `in-the-dark/Entity.ts:151`, die beim Abbau schon
  `off(this)` rufen; die Worker-Seite des Spiegelbilds macht es also längst so.

  2b. Den heutigen Rumpf von `destroy()` (`:247-255`) als private Methode `#leaveContext()`
  herausziehen, unmittelbar vor `destroy()`. Der vorhandene Kommentar über der
  Context-Zeigerreihenfolge wandert unverändert mit, nur der Halbsatz »would call straight back in
  here« nennt jetzt den richtigen Rückweg (`destroyComponent()` ruft `destroy()`):

  ```ts
  /**
   * Leave the context without ending the component. What a consumer put on the instance — event
   * subscriptions, an own `dispatchEvent` — belongs to the component and not to its membership in
   * a context, so a component that is taken back in keeps answering with all of it.
   */
  #leaveContext() {
    this.removeFromParent();

    // the context pointer goes first: destroyComponent() detaches every component that still
    // names the context, and would call destroy() on it otherwise
    const context = this.#context;
    this.#context = undefined;
    context?.destroyComponent(this);
  }
  ```

  2c. `destroy()` neu, mit JSDoc (die Methode hat heute keinen):

  ```ts
  /**
   * End the component: it leaves its {@link ComponentContext} and goes silent. Every subscription
   * made on it is removed, and a `dispatchEvent` an integration installed on the instance is
   * dropped with them.
   *
   * Calling it more than once is safe. Each call takes off what is on the component at that
   * moment — a subscription made afterwards is heard again.
   */
  destroy() {
    this.#leaveContext();

    // an integration may shadow `dispatchEvent` on the instance; dropping the own property
    // uncovers the method on the prototype again, it does not remove it
    if (Object.hasOwn(this, 'dispatchEvent')) {
      delete (this as {dispatchEvent?: ViewComponent['dispatchEvent']}).dispatchEvent;
    }

    off(this);
  }
  ```

  Der Cast ist derselbe, den `ShaeEntElement.ts:327` beim Zurücknehmen des Patches benutzt.

  2d. Context-Setter (`:86-88`): `this.destroy()` → `this.#leaveContext()`, mit dem Grund
  darüber (englisch, erklärt *warum*): leaving, not ending — ein Element, das den Baum verlässt,
  gibt den Context zurück und nimmt dieselbe Komponente beim Wiedereinhängen erneut auf; die
  Abonnements, die daran hängen, müssen das überleben.

  2e. JSDoc an `isDestroyed` (`:110-123`): der Satz »Every mutation that only concerns the
  component itself (`token`, `order`, properties, events, `removeFromParent`, `destroy`) is
  silently ignored« nennt `events` in einer Aufzählung von Ignoriertem — das trifft nicht mehr zu
  und traf es schon vorher nur halb. Neu: `events` fällt aus der Klammer, und ein angehängter
  Halbsatz sagt, was `dispatchEvent` tut — es erreicht die seit dem Abbau registrierten Listener,
  ohne Kinder zu traversieren. Kein Rückblick auf den Vorzustand.

  **Schritt 3 — grün.** `pnpm -F @spearwolf/shadow-objects test` (erwartet 369 statt 364),
  dann `pnpm -F @spearwolf/shadow-objects build` und `pnpm -F shadow-objects-testing test`
  (erwartet 329 statt 328). Fällt ein vorhandener Fall um, ist das ein Befund und keine
  Testanpassung: erst in den Verlauf, dann entscheiden. Besonders zu beobachten sind
  `ent-element-events.test.js:388` und `:432` — wenn die rot werden, ist 2d nicht angekommen.

  **Schritt 4 — Gegenprobe von Hand.** Drei Mutationen, jede einzeln, jede danach zurücknehmen,
  das Ergebnis in den Verlauf:
  - (a) `off(this)` in `destroy()` auskommentieren → 1a und 1d rot, 1b/1e/1f/1g grün.
  - (b) den `Object.hasOwn`-Block in `destroy()` auskommentieren → 1c rot, der Rest grün.
  - (c) im Context-Setter `this.#leaveContext()` wieder auf `this.destroy()` ziehen (die naive
    Fassung des Fixes) → 1e und 1f rot, und im Integrationspaket 1g plus die beiden vorhandenen
    Fälle `:388` und `:432`. Das ist die Gegenprobe auf den Schnitt, nicht auf das Finding —
    sie muss laufen, weil sonst niemand belegen kann, dass die Trennung trägt.

  **Schritt 5 — Doku, gleicher Zug.** Öffentlich zugesagtes Verhalten ändert sich:
  - `docs/api-reference.md:649` (»Assigning `null` or `undefined` to `context` **destroys** the
    component … It is the same teardown `destroy()` performs.«): der letzte Satz fällt. Neu: das
    Zuweisen von `null`/`undefined` löst die Komponente vom Context — sie steht in keinem
    Change Trail mehr, `isDestroyed` meldet `true`, die Entity ist weg —, sie behält dabei aber
    ihre Abonnements und alles, was eine Integration auf die Instanz gelegt hat, weil sie wieder
    aufgenommen werden kann; `destroy()` geht einen Schritt weiter und nimmt beides ab.
  - `docs/api-reference.md`, `#### Receiving Events` (`:770-786`), ein neuer Absatz hinter dem
    `unsubscribe()`-Beispiel: `destroy()` nimmt jedes Abonnement ab; ein vorher registrierter
    Listener hört danach nichts mehr, und die zurückgegebene Unsubscribe-Funktion hat nichts mehr
    zu tun. Was danach registriert wird, wird wieder gehört — der Aufruf nimmt weg, was in diesem
    Moment auf der Komponente liegt, er versiegelt sie nicht; eine über `context` wiederbelebte
    Komponente braucht ihre Abonnements neu. Das Verlassen eines Contexts ist in diesem Sinn kein
    Abbau: `vc.context = otherCtx` und `vc.context = null` behalten beides.
  - `docs/api-reference.md:808-810` (`#### destroy()`): der Satz nennt zusätzlich die Abnahme der
    Listener und das Fallenlassen eines auf der Instanz installierten `dispatchEvent`; »Calling it
    more than once is safe« bleibt und bekommt den Zusatz, dass jeder Aufruf abnimmt, was in
    diesem Moment daliegt.
  - `docs/api-reference.md:821` (Tabellenzeile): »Still notifies the component's own listeners,
    children are not traversed« → »Notifies the listeners registered since the teardown, children
    are not traversed«.
  - `docs/api-reference.md:829-838` (Wiederbelebungs-Beispiel): ein Satz dahinter, dass die
    wiederbelebte Komponente kein Abonnement von vor dem Abbau trägt.
  - `docs/cheat-sheet.md:348` (im Codeblock, Zeile `vc.destroy();`): Zeilenkommentar
    `// also takes every on(vc, …) off`.
  - `docs/cheat-sheet.md:358` (Tabellenzeile »| `dispatchEvent` | Own listeners still fire,
    children are not traversed |«): → »Only listeners registered after the teardown fire, children
    are not traversed«.

  **Schritt 6 — CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`, zwei
  Stellen. Paket 2 hat dort bereits geschrieben; **kein neuer Kasten-Punkt und keine neue Zahl**:
  - (i) Kasten »Next release«, die letzte Klausel der Aufzählung (`:51-59`, von »und
    `ComponentContext.clear()`« bis »takes the component back in rather than doing nothing.«): daran
    anschließen, dass derselbe Abbau die Listener der Komponente abnimmt — ein vor einem
    `destroy()`, `destroyComponent()`, `clear()`, `removeSubTree()` oder `dispose()` gesetztes
    `on(vc, …)` hört danach nichts mehr, und ein auf der Instanz installiertes `dispatchEvent`
    ist mit weg; eine Komponente, die nur ihren Context verlässt (`vc.context = null`), behält
    beides. Bewusst als Erweiterung dieser Klausel und nicht als eigener Aufzählungspunkt: die
    einleitende Zahl (`:13`, »Twenty of them reach existing consumers«) beschreibt dieselbe
    Abbau-Familie und bleibt damit richtig. Wer stattdessen einen eigenen Punkt setzt, zieht die
    Zahl auf »Twenty-one« — dann aber nachzählen, nicht schätzen.
  - (ii) Ein neuer Punkt **direkt hinter** dem vorhandenen `- **Breaking (view components):**
    `ComponentContext.clear()` …` (`:62`), gleiche Machart: `ViewComponent.destroy()` hinterlässt
    eine stille Komponente — jedes `on(vc, …)`/`once(vc, …)` ist abgenommen, ein auf der Instanz
    installiertes `dispatchEvent` fällt weg und die Methode des Prototyps gilt wieder. Was einen
    Konsumenten erreicht: ein vor dem Abbau registrierter Listener hört ein späteres
    `dispatchEvent()` nicht mehr, die Unsubscribe-Funktion hat nichts mehr zu tun; ein danach
    registrierter Listener wird gehört wie zuvor. Die Abbauwege des Contexts ziehen mit, weil sie
    über `destroy()` laufen. Das Verlassen eines Contexts gehört nicht dazu: `vc.context = otherCtx`
    verschiebt die Komponente, `vc.context = null` löst sie ab, und ein `<shae-ent>`, das das
    Dokument verlässt und zurückkommt, ist genau dieser zweite Fall — es gibt den Context zurück
    und nimmt dieselbe Komponente beim Wiedereinhängen erneut auf.

  **Schritt 7 — `Backlog.md` synchronisieren.** Zeile 167 (Block **[VIEW-20]**, dort schon als
  behoben markiert) sagt »`dispatchEvent` benachrichtigt weiterhin die eigenen Listener ohne
  Kinder-Traversierung« — das widerspricht danach dem Code. Nur diesen Halbsatz auf »benachrichtigt
  die seit dem Abbau registrierten Listener ohne Kinder-Traversierung« ziehen; der Rest des Blocks
  bleibt. Der Block »Grenze der Component-Ablösung« (`:224`) bleibt unangetastet, er gehört zu
  Paket 4. Keine TODO-Kommentare berührt, also kein `pnpm make:todo`.

  **Schritt 8 — Verify** in der Reihenfolge unten, jede Ausgabe in den Verlauf.

- Verify: `pnpm lint` · `pnpm typecheck` · `pnpm test:ci --force` · `pnpm build` ·
  `pnpm -F shadow-objects-e2e test`. Die letzten beiden sind **nötig**: `src/view/` wird angefasst,
  womit die Regel im Plankopf greift; `pnpm build` zusätzlich aus einem harten Grund — das
  Integrationspaket löst `@spearwolf/shadow-objects` über `dist/` auf, ein Lauf ohne Build misst
  den alten Stand (Nebenbefund Paket 2). Die e2e-Suite ist der einzige Ort, an dem ein vollständiger
  Seitenabbau mit `<shae-ent>` gegen einen echten `RemoteWorkerEnv` läuft, also gegen genau die
  Disconnect-Kette, die Schritt 2d anfasst. Erwartet: `test:ci` **699** statt 693
  (364 → 369 im Kernpaket, 328 → 329 im Integrationspaket, 1 unverändert), e2e unverändert 402.
- Commit: `feat(view)!: destroy() takes the listeners off the ViewComponent it ends (VIEW-021)`
- Verlauf:
  - 2026-08-18 Zug 3 (Nachbesserung Runde 2): Blocker — die Erholungszusage war falsch, in echtem Chromium gegen den gebauten Stand nachgemessen: `baseline=1 afterRevive=1 sameVc=true afterReAppend=1 freshHasVc=true afterInsert=2 afterFresh=3`, Kontrolllauf ohne `clear()` `baseline=1 afterReAppend=2`. Zwei Aussagen daraus: ein Aus- und Wiedereinhängen desselben Elements hilft **nicht** (`sameVc=true`, der Zähler bleibt auf 1), und ein neues `<shae-ent>` an dieser Stelle hilft **doch** — `afterInsert=2` ist die Anfrage, die das frische Element beim Connect selbst schickt, `afterFresh=3` die eine Antwort auf die anschließende Runde; das taube alte Element antwortet weiter nicht. Die drei Stellen tragen jetzt beides: `docs/api-reference.md:814`, `CHANGELOG.md:67` (nur die Erholungszusage angefasst, »heard as before« steht unberührt), `Backlog.md:225` · der Docblock des Wächters verliert »while the element stays in the document« und benennt stattdessen den einen Ausweg (`ent-element-context-clear.test.js:6-12`) · Wächter erweitert: der erste Fall nimmt den Re-Append mit (samt `expect(el.viewComponent).to.equal(vc)`), ein zweiter Fall `answers again through a new element in that place` hält die Erholung fest — die Zusage, die falsch dastand, ist damit gepinnt · Kleinigkeit: Gegenkante zu `api-reference.md:818` als `takes the listeners off a component that only left its context` (`ViewComponent.spec.ts:485-497`) — nach `context = null` greift die Abnahme durch `destroy()` genauso · Verify: `pnpm lint` rc=0 (2 `biome.json`-Infos), `pnpm typecheck` 3/3, `pnpm test:ci --force` **703** grün (371 + 331 + 1: +1 Kernpaket aus der Kleinigkeit, +1 Integrationspaket aus dem zweiten Wächter-Fall), `pnpm build` 3/3, e2e **402** grün.
  - 2026-08-18 Zug 2 (Nachbesserung Runde 1): Auflage **zuerst gemessen**, Wegwerf-Fall in echtem Chromium — eine `ReRequestEntHost`-Runde vor und eine nach `ctx.clear()` + `vc.context = ctx`, gezählt an dem `ReRequestEntHostEventName`, den das Element beantwortet: gegen den Stand dieses Pakets `baseline=1 after=1`, gegen `HEAD` (`ViewComponent.ts` von `58e1a46` eingespielt, gebaut, derselbe Fall) `baseline=1 after=2` — die Taubheit ist bestätigt und eine Folge dieses Laufs. Der Fall bleibt als Wächter, weil er die Grenze in fünfzehn Zeilen festhält und gegen den Vorzustand rot wäre: `packages/shadow-objects-testing/test/ent-element-context-clear.test.js`, eigene Datei mit eigenem Dateikopf statt Einbau in `ent-element-teardown.test.js` (dessen Kopf ausschließlich das Verlassen des Entity-Baums beschreibt) · Grenze festgehalten in `docs/api-reference.md:814`, `Backlog.md` unter »Grenze der Component-Ablösung« (ausdrücklich **an Paket 4 übergeben**) und im CHANGELOG-Punkt zu `destroy()` · Blocker 1: `destroy` verlässt die Ignoriert-Aufzählung in `api-reference.md:826-827`, `cheat-sheet.md:357-358` und `ViewComponent.ts:116-117`, jeweils mit eigener Zeile · Blocker 2: der Abschnitt »The destroyed state« benennt jetzt beide Wege (`api-reference.md:818` Einleitung, `:825` Tabellenzeile, `:844` Wiederbelebung, `cheat-sheet.md:359` und `:362`) · Blocker 3: `api-reference.md:668` sagt »detached from the context« · Kleinigkeit 4: `on()`/`once()` statt »every subscription« in `ViewComponent.ts:267` und `api-reference.md:784`, `onceAsync()` ausdrücklich ausgenommen · Kleinigkeit 5: »is heard as before« → »is heard as usual« · Kleinigkeit 6: `ComponentContext.ts:183-185` nennt das Verlassen des Contexts statt `destroy()` · Kleinigkeit 7: neuer Fall `takes off on a second destroy() what has been put on the component since the first` · Kleinigkeit 8: die Klausel hängt mit », and« statt »; and« an der `clear()`-Klausel und zählt damit nicht als eigene — die Zahl »Twenty« bei `:13` bleibt stehen · Verify: `pnpm lint` rc=0 (2 `biome.json`-Infos; einmal rot wegen `trailingNewline: false` in `biome.json`, die neue Testdatei nachgezogen), `pnpm typecheck` 3/3, `pnpm test:ci --force` **701** grün (370 + 330 + 1: +1 Kernpaket aus Kleinigkeit 7, +1 Integrationspaket aus dem Wächter), `pnpm build` 3/3, e2e **402** grün.
  - 2026-08-18 Zug 1: Schritte 1-8 umgesetzt · rot zuerst (`pnpm -F @spearwolf/shadow-objects test`, 3 failed | 366 passed): 1a `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times`, 1c `AssertionError: expected true to be false // Object.is equality`, 1d `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times` — die gemessene Fassung nennt `"vi.fn()"`, wo der Plan `"spy"` erwartet hatte (vitest benennt die Mock nach ihrer Fabrik, nicht nach der Variablen) · 1b/1e/1f grün vor dem Fix, 1g ebenso (`pnpm -F @spearwolf/shadow-objects build` + `pnpm -F shadow-objects-testing test`, 329 passed) · nach Schritt 2 grün: Kernpaket 369, Integrationspaket 329 · Gegenprobe: (a) `off(this)` auskommentiert → 2 failed (1a, 1d), Rest grün; (b) der `Object.hasOwn`-Block auskommentiert → 1 failed (1c), Rest grün; (c) Setter zurück auf `this.destroy()` → im Kernpaket 2 failed (1e, 1f), im Integrationspaket **5 failed** statt der drei erwarteten: 1g, `keeps the same ViewComponent and the patch across a remove and a re-append`, `keeps the same ViewComponent and the patch across a namespace change` **und zusätzlich** `a re-append leaves the signal, the attribute and the patch saying the same thing` sowie `misses a slot moving out of every entity after its shadow host left the document and came back` (der Fall aus Paket 2, der über einen Rundlauf des Shadow-Hosts geht) — der Schnitt trägt breiter, als der Plan angenommen hatte; alle drei Mutationen zurückgenommen, `ViewComponent.ts` danach byte-identisch zum Stand davor · Verify: `pnpm lint` rc=0 (2 `biome.json`-Infos), `pnpm typecheck` 3/3, `pnpm test:ci --force` **699** grün (369 + 329 + 1), `pnpm build` 3/3, e2e **402** grün.
  - 2026-08-18 Zug 0: Detailplan steht · VIEW-021 unverändert, `ViewComponent.ts:247-255`
    (`destroy()`) steht Zeile für Zeile wie im Audit: `removeFromParent()`, Context-Zeiger weg,
    `destroyComponent()`, kein `off()` · der genannte Patch sitzt bei `ShaeEntElement.ts:317-321`
    und wird nur von der Effekt-Aufräumung `:324-328` zurückgenommen · Paket 1 (nur
    `shadow-objects-testing/` und Wurzel-CHANGELOG) und Paket 2 (nur `src/elements/ShaeEntElement.ts`
    plus JSDoc an `ComponentContext.ts:445-449`) haben `ViewComponent.ts` nicht angefasst ·
    der von Paket 2 hinterlassene Punkt ist geprüft: `ent-element-slot-move.test.js` baut in Fall 1d
    einen `ViewComponent` von Hand und ruft am Ende `plain.destroy()` — die Zeile trägt weiter,
    weil der handgebaute Component keine Listener und keinen Instanz-`dispatchEvent` hat; die
    Abnahme läuft dort ins Leere. **Keine Änderung nötig**, der Fall ist aber in Schritt 3 mit zu
    beobachten.

**VIEW-021 · info · packages/shadow-objects/src/view/ViewComponent.ts:247-255** — ViewComponent.destroy() nimmt keine Listener ab

destroy() löst die Komponente aus der Hierarchie und vom ComponentContext, ruft aber kein off(). Jedes on(vc, …) eines Konsumenten bleibt bestehen, und der dispatchEvent-Patch, den ShaeEntElement.ts für forward-custom-events installiert, überlebt jeden Abbauweg. Eine zerstörte Komponente benachrichtigt weiterhin ihre eigenen Listener. Vorbestehend und in docs/api-reference.md so dokumentiert, also keine Überraschung — aber eine Quelle für Referenzen, die länger leben als die Komponente, die sie hält.

Empfehlung: Entweder nimmt destroy() die Listener ab, dann ist eine zerstörte Komponente wirklich still — eine Verhaltensänderung an der öffentlichen API mit eigener Entscheidung. Oder es bleibt so, und die Doku behält den Vorrang, den sie hat.

Evidenz (Audit): Nebenbefund aus dem Abbau-Paket, an der Fundstelle nachgelesen; docs/api-reference.md führt das Verhalten in der Tabelle des zerstörten Zustands.

*Der freigegebene Weg ist die erste Variante — siehe »Entscheidungen«. Der Zusatz dieses Plans: der Kontextwechsel einer weiterlebenden Komponente läuft nicht mehr über `destroy()`, siehe »Der Schnitt«.*

### [x] 4. Die flächigen Abbauwege erreichen jede Instanz
- Findings: VIEW-020 (low)
- Ziel: `clear()` und `dispose()` lösen jeden ViewComponent des Contexts ab, auch den, den eine
  uuid-Kollision aus `#components` verdrängt hat; `destroyComponent()` lässt dabei den Eintrag
  stehen, den ein Namensvetter hält.
- Bereich: `packages/shadow-objects/src/view/ComponentContext.ts`,
  `src/view/ComponentContext.spec.ts`, `src/view/ViewComponent.spec.ts`,
  `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`,
  `Backlog.md`
- Hängt ab von: Paket 3 (dieselbe Abbaukette; `clear()` ruft `component.destroy()`) — erledigt mit `c17f6bb`
- Modell: mittlere Stufe
- Phase: 4 (Struktur) · öffentliche Verhaltensänderung
- Hash: `375edce`
- Ergebnis: 1 Nachbesserungsrunde · VIEW-020 behoben, vom Reviewer belegt — Register
  `#componentInstances` (`ComponentContext.ts:87-90`), gefüllt in `addComponent()` (`:159`),
  unbedingt geleert im Trichter `destroyComponent()` (`:175-179`), `clear()` läuft darüber
  (`:569-573`), `dispose()` erbt es. Türen nachgezählt: `addComponent()` hat genau einen Aufrufer,
  `destroyComponent()` genau zwei interne — kein Weg hinein ohne Eintrag, keiner hinaus ohne
  Austrag · **Scope-Zusatz** `entry.component === component` (`:188`) wie freigegeben, mit einem
  Zusatznutzen, den niemand geplant hatte: `ctxA.destroyComponent(vcAusCtxB)` nimmt bei gleicher
  uuid nicht mehr den fremden Eintrag mit · sieben neue Fälle, `test:ci` 710 statt 703
- **Nachbesserung, vom Nutzer freigegeben:** Die neue Zusage »Eintrag und Entity bleiben unberührt«
  hielt nicht, wenn der Namensvetter ein **Kind** ist. `#leaveContext()` → `removeFromParent()` →
  `moveToRoot(uuid)` schrieb `setParent(undefined)` auf den fremden Eintrag, **vor** dem Trichter.
  Gemessen: Trail `[{type: 3, uuid: 'twin', parentUuid: undefined}]`, `isRootComponent(namesake)`
  `true`, während `getChildren(parent)` denselben Namen weiter führte. Der Effekt war vorbestehend;
  neu war nur die Zusage. Behoben mit dem Wächter aus `changeOrder()` (`:336-340`) an **beiden**
  Stellen — beide Zweige sind aus `#leaveContext()` erreichbar, je nachdem ob die verdrängte
  Instanz Wurzel oder Kind war, und jeder hat seine eigene Gegenprobe.
- Nebenbefunde (alle **fürs nächste Audit**, keiner in diesem Lauf gefixt):
  - **Stale Referenz mit messbarem Preis.** Beansprucht ein Namensvetter eine uuid unter einem
    anderen Elternteil, behält der alte Elternteil sie in seiner Kinderliste — **schon vor jedem
    Abbau**. `traverseLevelOrderBFS()` liefert die uuid dann zweimal, und weil
    `#buildPathOfChanges` darüber läuft, erzeugt ein einzelnes `setProperty()` **zwei identische
    Einträge** im Change Trail. Ursprung ist `addComponent()` (`:120-135`), das den Eintrag ersetzt
    und dessen `children` leert, die uuid aber nicht aus der Kinderliste des alten Elternteils
    räumt. Die frühere Fassung räumte die stale Zeile beim Abbau nebenbei mit weg — auf Kosten des
    falschen `SetParent`. Der Tausch ist richtig herum: ein falscher Trail-Eintrag auf einer
    lebenden Entity wiegt schwerer als eine doppelte Listung, die es ohne Abbau ohnehin gibt.
  - Der Wächter prüft nur die Identität von `component`, nicht die des `parent`-Arguments. Heute
    nicht erreichbar: beansprucht ein Namensvetter die uuid eines Elternteils, hebt `addComponent()`
    (`:127-131`) dessen Kinder sofort auf Wurzelebene. Kosmetische Asymmetrie.
  - `assertUsableAsParent` (`ViewComponent.ts:17-24`) prüft `parent.context`, und eine verdrängte
    Instanz behält ihren `context` — eine neue Komponente lässt sich also unter einen Elternteil
    hängen, der keinen Eintrag mehr hält, und landet in der Kinderliste des Namensvetters. Aus dem
    Code gelesen, nicht gemessen.
  - `hasComponent(component)` (`:168-170`) schlüsselt auf die uuid und meldet `true` für eine
    verdrängte Instanz, deren Eintrag ein anderer hält. Mit `#componentInstances` gibt es jetzt
    erstmals eine Quelle, die das wahrheitsgemäß beantworten könnte.
- Folgen: keine offenen. Die Taubheits-Grenze aus Paket 3 bleibt unverändert und ist **Paket 7**
  zugeordnet; `docs/api-reference.md:814`, der CHANGELOG-Satz dazu und der Backlog-Punkt sind
  nicht angefasst.
- Schnittstellen: **Breaking Change** — `ComponentContext.removeFromParent()` und `moveToRoot()`
  nehmen eine `ViewComponent` statt einer uuid (`src/index.ts:11` exportiert die Datei, beide
  stehen in der Methodentabelle `docs/api-reference.md:961-962`). Einziger Aufrufer über `src/`,
  alle Specs und das Integrationspaket hinweg: `ViewComponent.ts:200` und `:203`. Für **Paket 7**:
  Baut das Element zur Heilung eine *neue* `ViewComponent` mit derselben uuid, ist die verdrängte
  Vorgängerin genau der jetzt geregelte Fall — sie geht im Sweep mit herunter, ohne den Eintrag
  ihrer Nachfolgerin anzufassen. Dann wird allerdings die stale Referenz oben **erstmals aus den
  Elementen erreichbar**: jede Property-Änderung ginge doppelt über die Leitung. Wer diesen Weg
  wählt, räumt vorher `addComponent()` auf.
- Dateien:
  - `packages/shadow-objects/src/view/ComponentContext.ts` (Implementierung, s. Schritt 2)
  - `packages/shadow-objects/src/view/ComponentContext.spec.ts` (drei neue Fälle, s. Schritt 1)
  - `packages/shadow-objects/src/view/ViewComponent.spec.ts` (ein neuer Fall, s. Schritt 1c)
  - `packages/shadow-objects/docs/api-reference.md` (drei Stellen, s. Schritt 5)
  - `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`, zwei Stellen, s. Schritt 6)
  - `Backlog.md` (ein Punkt fällt, einer wird umgeschrieben, s. Schritt 6)
  - `packages/shadow-objects/docs/cheat-sheet.md` und `packages/shadow-objects/README.md`
    **nicht betroffen** — nachgeschlagen: das Cheat Sheet nennt die uuid nur bei der
    Wiederbelebung (`:351`) und kennt den Kollisionsfall nicht, das README weder `clear` noch
    `dispose` noch `uuid`.

- **Die Einordnung (vor dem ersten Zeichen Code lesen).** Paket 3 hat eine Folge gemessen und
  hierher übergeben: seit `c17f6bb` nimmt `destroy()` die Listener ab, und weil jeder flächige
  Abbau über `destroy()` läuft, ist jedes `<shae-ent>` über einer so abgeräumten Komponente
  dauerhaft taub für Re-Request-Runden (`docs/api-reference.md:814`, `CHANGELOG.md:67`,
  `Backlog.md:225`, Wächter `ent-element-context-clear.test.js`). Dieses Paket entscheidet, und es
  entscheidet: **der Sweep läuft weiter über `destroy()`.** Vier Gründe, in dieser Reihenfolge:

  1. **Die Taubheit ist nicht der Kollisionsfall.** Sie trifft heute jede Komponente, die ein
     `clear()` erwischt, ganz ohne doppelte uuid. Das zweite Register vergrößert die Menge um genau
     die Instanzen, die ein Namensvetter aus `#components` verdrängt hat — und eine solche Instanz
     kann kein Element halten: `ShaeEntElement.ts:353` ist der einzige `new ViewComponent(...)` in
     `src/`, und er übergibt keine `uuid`. Jede Kollision ist von Hand gebaut. Was dieses Paket an
     Stille hinzufügt, erreicht über die Elemente niemanden.
  2. **Der Gegenweg nimmt eine Zusage zurück, die zwei Läufe alt ist.** Liefe der Sweep über eine
     Ablösung, hörte `clear()` auf, die Komponenten stillzulegen — genau das, was Paket 3
     (`c17f6bb`) im CHANGELOG zugesagt hat, und die Fortsetzung dessen, was `606d77d` (VIEW-014)
     zugesagt hatte: die flächigen Wege lassen ihre Komponenten im selben Zustand zurück wie
     `destroy()`. Zwei Läufe Vereinheitlichung gegen eine Grenze zu tauschen, die an anderer Stelle
     verursacht wird, ist ein schlechtes Geschäft.
  3. **Die Handhabe fehlt, und sie wäre die falsche.** `#leaveContext()` ist privat; der einzige
     öffentliche Ablöseweg ist der Setter `component.context = undefined`, den `clear()` über seine
     eigene Iteration laufen ließe. Das ist eine Strukturentscheidung an `ComponentContext.ts:169-188`
     und kein Einzeiler — und sie würde die Trennung, die Paket 3 gerade gezogen hat (Ablösen ist
     nicht Beenden), an der einen Stelle wieder einreißen, an der sie am meisten wert ist.
  4. **Die Wurzel sitzt in `src/elements/`.** `ShaeEntElement.viewComponent$` wird genau einmal
     geschrieben (`:354`), die Signale des Elements werden nie zerstört, und deshalb kann die
     einzige Stelle, die die Komponente des Elements beenden würde (`:265-274`), nie laufen
     (Nebenbefund aus Paket 3). Ein Element, das beim Wechsel seiner Komponente neu abonniert, macht
     die Frage »still oder abgelöst« gegenstandslos. Diesen Weg hat der Nutzer für Paket 3 ausdrücklich
     verworfen; seine Gründe — die Ausführungsreihenfolge der Signal-Effekte, die beiden vorhandenen
     Patch-Fälle als Wackelkandidaten — gelten hier unverändert, und der Aufwand ist derselbe.

  Folge: **kein Paket 4b.** Die Taubheit bleibt eine gemessene, dokumentierte und von einem Wächter
  gehaltene Grenze. `Backlog.md:225` bleibt in der Datei, verliert seine Übergabezeile an Paket 4
  und benennt stattdessen die Wurzel (Schritt 6); `Backlog.md:224` — der Kollisionsfall — verlässt
  sie. Eine Reparatur in `src/elements/` ist ein eigenes Vorhaben und ein Kandidat fürs nächste Audit.

- Vorgehen:

  **Schritt 1 — Tests zuerst, rot gesehen.** Kein Zeichen Produktionscode, bevor die neuen Fälle
  laufen und fehlschlagen.

  *Ebenenwahl, nachgeprüft statt behauptet.* Alle vier Fälle gehören in
  `packages/shadow-objects/src/**/*.spec.ts`, keiner ins Integrationspaket. Eine uuid-Kollision
  entsteht ausschließlich über die Konstruktor-Option `uuid`, und die übergibt kein Element:
  `ShaeEntElement.ts:353` ist der einzige `new ViewComponent(...)` in `src/` und reicht nur
  `{context}` durch. Der Fall hat damit keine Ausdrucksform in echtem DOM — das Integrationspaket
  müsste ihn mit handgebauten `ViewComponent`s nachstellen und misst dann dasselbe wie die Spec,
  nur langsamer und über `dist/`. Die beiden vorhandenen Kollisionsfälle stehen ebenfalls in
  `ComponentContext.spec.ts` (`:165-181`, `:556-569`); happy-dom (`vitest.config.ts:5`) wird von
  keinem der vier gebraucht. `packages/shadow-objects-e2e/` bleibt außen vor: kein Export, keine
  Signatur, keine Seite ändert sich; die Suite läuft nur als Verify.

  Vorhandene Helfer weiterverwenden — `makeContext()` (`ComponentContext.spec.ts:12-14`), `vi.fn()`
  und `on` aus eventize (`ViewComponent.spec.ts:1-2`). Keine neuen Helfer.

  1a. **Rot.** `ComponentContext.spec.ts`, in `describe('clear')` hinter
  `it('detaches every component it held')` (`:257-271`):
  **`it('detaches a component whose uuid a namesake has taken away')`**

  ```ts
  ctx = makeContext();
  const displaced = new ViewComponent('displaced', {context: ctx, uuid: 'twin'});
  const namesake = new ViewComponent('namesake', {context: ctx, uuid: 'twin'});
  ctx.buildChangeTrails();

  ctx.clear();

  for (const vc of [displaced, namesake]) {
    expect(vc.isDestroyed, `${vc.token}.isDestroyed`).toBe(true);
    expect(vc.context, `${vc.token}.context`).toBeUndefined();
  }
  ```

  Erwartete Rotmeldung:
  `AssertionError: displaced.isDestroyed: expected false to be true // Object.is equality`.

  1b. **Rot.** Dieselbe Datei, in `describe('dispose')` hinter
  `it('destroys every view component it holds')` (`:375-386`):
  **`it('destroys a component whose uuid a namesake has taken away')`** — gleicher Aufbau,
  `ctx.dispose()` statt `ctx.clear()`, dieselben beiden Erwartungen. Kein Duplikat von 1a: `dispose()`
  erreicht den Sweep nur über seinen `clear()`-Aufruf (`:589`), und diese Kette hält der Fall fest —
  sie ist die eine Zeile, die zwischen dem Ziel dieses Pakets und dem Code steht.
  Erwartete Rotmeldung: dieselbe wie 1a.

  1c. **Rot, die Listener-Dimension.** `ViewComponent.spec.ts`, in `describe('the destroyed state')`
  hinter `it('takes the listeners off when its context is cleared')` (`:570-584`) — die Vorlage steht
  damit unmittelbar darüber:
  **`it('takes the listeners off a component whose uuid a namesake has taken away')`**

  ```ts
  const ownCtx = ComponentContext.get('ViewComponent.spec-cleared-namesake');
  const displaced = new ViewComponent('displaced', {context: ownCtx, uuid: 'twin'});
  new ViewComponent('namesake', {context: ownCtx, uuid: 'twin'});
  const spy = vi.fn();
  on(displaced, 'testEvent', spy);
  ownCtx.buildChangeTrails();

  ownCtx.clear();

  displaced.dispatchEvent('testEvent', 1, false);

  expect(spy).not.toHaveBeenCalled();

  ownCtx.dispose();
  ```

  Bewusst **ohne** `isDestroyed`-Erwartung: die steht in 1a, und hier soll die Listener-Zeile die rote
  sein. Erwartete Rotmeldung:
  `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times`
  (vitest benennt die Mock nach ihrer Fabrik, nicht nach der Variablen — in Paket 3, Zug 1 gemessen).

  1d. **Rot, die zweite Hälfte des Lochs.** `ComponentContext.spec.ts`, in
  `describe('destroyComponent')` hinter `it('takes a component back in that re-joins before the next trail')`
  (`:307-318`):
  **`it('releases a component whose uuid a namesake has taken away without taking the namesake down')`**

  ```ts
  ctx = makeContext();
  const displaced = new ViewComponent('displaced', {context: ctx, uuid: 'twin'});
  const namesake = new ViewComponent('namesake', {context: ctx, uuid: 'twin'});
  ctx.buildChangeTrails();

  ctx.destroyComponent(displaced);

  expect(displaced.isDestroyed).toBe(true);
  expect(ctx.buildChangeTrails()).toEqual([]);
  expect(namesake.isDestroyed).toBe(false);
  expect(ctx.hasComponent(namesake)).toBe(true);
  ```

  Die erste Erwartung ist heute schon grün — `destroyComponent` löst die genannte Instanz auch jetzt
  ab. Rot ist der Kollateralschaden: die verdrängte Instanz nimmt auf ihrem Weg hinaus den Eintrag
  mit, den der Namensvetter hält, der nächste Change Trail meldet dessen Entity als zerstört, und
  `#deleteComponent` räumt den Eintrag ab, während der Namensvetter sich weiter für lebendig hält.
  Erwartete Rotmeldung: `AssertionError: expected [ { type: 2, uuid: 'twin' } ] to deeply equal []`
  (`ComponentChangeType.DestroyEntities` ist `2`).

  **Wächter, die grün bleiben müssen** — kein neuer Fall, aber beim Lauf zu beobachten:
  `ComponentContext.spec.ts:165-181` (`ignores a component whose entry a namesake has taken away`) und
  `:556-569` (`keeps the children reachable when a uuid is registered by a new component`). Beide enden
  auf `expect(() => ctx.clear()).not.toThrow()` und fahren nach dem Umbau zusätzlich den neuen Sweep
  über eine verdrängte Instanz. Fällt dabei eine der beiden Panic-Prüfungen von `clear()`
  (`#rootComponents is not empty!`, `#components is not empty!`), ist das ein Befund und keine
  Testanpassung. Dazu `ViewComponent.spec.ts:536-553` (`is destroyed by a clear() of its context and
  can re-join it`) — der kollisionsfreie Normalfall, an dem sich nichts ändern darf.

  Lauf: `pnpm -F @spearwolf/shadow-objects test` → erwartet **4 failed** (1a, 1b, 1c, 1d), die 371
  vorhandenen grün. Die Rotmeldungen wörtlich in den Verlauf; weichen sie vom Wortlaut oben ab, gilt
  die gemessene Fassung.

  **Schritt 2 — Umsetzung, alles in `packages/shadow-objects/src/view/ComponentContext.ts`.**

  2a. Das zweite Register, unmittelbar unter `#components` / `#rootComponents` (`:83-84`):

  ```ts
  // which instances name this context. #components holds one entry per uuid, and a component
  // whose uuid a later one claims keeps pointing back here without appearing in it — the
  // entry-keyed map cannot reach it, this one can
  readonly #componentInstances = new Set<ViewComponent>();
  ```

  Die Ordnung bleibt, wo sie ist: `children` und `#rootComponents` sind die sortierten Listen
  (`#appendToOrdered`), das Register führt Beitrittsreihenfolge und wird ausschließlich zum Abräumen
  gelesen. Das ist die bewusste Antwort auf die Frage, die Paket 2 hinterlassen hat — die Ordnung
  mitzuführen hieße, eine zweite Wahrheit über dieselbe Sortierung zu halten. Im kollisionsfreien
  Fall ist die Reihenfolge des Registers ohnehin dieselbe wie die von `#components.values()`.

  2b. Füllen: am Ende von `addComponent()` (`:110-155`), unmittelbar vor `this.#viewInstances = undefined;`,
  ein `this.#componentInstances.add(component);`. Kein früherer Platz — der
  `ComponentContextDisposedError` am Kopf der Methode (`:111-115`) muss vorher greifen, sonst hielte
  ein disposed Context Instanzen, die er abgewiesen hat.

  2c. Leeren, und der Trichter: `destroyComponent()` (`:169-188`). Hier laufen alle Wege aus dem
  Context zusammen — `destroy()`, der Context-Setter, `clear()`, `removeSubTree()`, `dispose()` —,
  also gehört der Austrag hierher und nicht daneben.

  ```ts
  destroyComponent(component: ViewComponent) {
    // every way out of this context comes through here, so this is where an instance stops
    // naming us — unconditional, because a caller from outside runs through twice:
    // destroyComponent(vc) → vc.destroy() → destroyComponent(vc)
    this.#componentInstances.delete(component);

    const entry = this.#components.get(component.uuid);

    // destroying an entry twice would put the destroy count ahead of the create count: a
    // component that joins again afterwards would be destroyed by the very next change trail.
    // And the entry belongs to whoever claimed the uuid last — a namesake it displaced leaves
    // without taking the entity of the one holding it down
    if (entry !== undefined && entry.component === component && !entry.changes.isDestroyed) {
      …
    }
    …
  }
  ```

  Der Rest der Methode bleibt unverändert, der `component.context === this`-Zweig eingeschlossen:
  er löst die genannte Instanz ab, beanspruchte uuid oder nicht, und das war schon richtig.

  Der Zusatz `entry.component === component` ist die zweite Hälfte desselben Lochs und für sich
  abtrennbar: ohne ihn erreichen `clear()` und `dispose()` nach 2d zwar jede Instanz, eine verdrängte
  nimmt auf ihrem Weg hinaus aber den Eintrag ihres Namensvetters mit — 1d hält genau das fest, und
  innerhalb von `clear()` bliebe es unsichtbar, weil dort ohnehin alles heruntergeht.

  2d. `clear()` (`:551-572`): die erste Schleife (`:557-559`) auf das Register ziehen und das Register
  danach leeren.

  ```ts
  // destroy first, while the context is still live: a component whose context is gone
  // would otherwise keep reporting itself as alive.
  // Every instance that named this context, not one per uuid — #components holds the entry of
  // the component that claimed a uuid last, and the one it displaced is just as much ours
  for (const component of Array.from(this.#componentInstances)) {
    component.destroy();
  }

  // nothing may name this context past the sweep: an instance that never came through
  // destroyComponent() would otherwise be swept again by the next clear()
  this.#componentInstances.clear();
  ```

  Der vorhandene Kommentarblock über der Schleife bleibt und bekommt den zweiten Absatz. Die Kopie
  über `Array.from` bleibt nötig, denn jedes `destroy()` trägt sich selbst aus dem Register aus. Der
  Rest der Methode bleibt unangetastet: die Wurzelschleife über `removeSubTree` und die beiden
  Panic-Prüfungen räumen weiter die Einträge ab, und sie sind es, die `#components` leeren.

  Was dabei zu erwarten ist und keinen Alarm auslöst: eine verdrängte Instanz ohne Elternteil läuft
  in `#leaveContext()` über `removeFromParent()` → `moveToRoot(uuid)`, und das trifft den Eintrag des
  Namensvetters. Sichtbar wird davon nichts — `#appendToOrdered` kehrt bei einer uuid, die schon in
  der Liste steht, sofort um, und die anschließende Wurzelschleife räumt beides ab.

  2e. `dispose()` (`:586-597`) und `removeSubTree()` (`:251-267`) bleiben, wie sie sind. `dispose()`
  erbt den Sweep über seinen `clear()`-Aufruf (`:589`) — das ist die ganze Änderung an ihm.
  `removeSubTree(uuid)` bekommt eine uuid genannt und räumt den Eintrag samt Nachkommen ab; eine aus
  dieser uuid verdrängte Instanz steht in keinem Teilbaum und ist nicht gemeint. Diese Grenze wird in
  Schritt 5 geschrieben, nicht wegprogrammiert.

  **Schritt 3 — grün.** `pnpm -F @spearwolf/shadow-objects test`, erwartet 375 statt 371. Fällt ein
  vorhandener Fall um, ist das ein Befund und keine Testanpassung: erst in den Verlauf, dann
  entscheiden. Besonders zu beobachten sind die drei Wächter aus Schritt 1.

  **Schritt 4 — Gegenprobe von Hand.** Zwei Mutationen, jede einzeln, jede danach zurücknehmen, das
  Ergebnis in den Verlauf:
  - (a) in `clear()` die Schleife wieder über `this.#components.values()` laufen lassen (2d)
    → 1a, 1b und 1c rot, 1d grün.
  - (b) `entry.component === component` aus der Bedingung in `destroyComponent()` nehmen (2c)
    → 1d rot, der Rest grün.

  **Schritt 5 — Doku, gleicher Zug.** Öffentlich zugesagtes Verhalten ändert sich; drei Stellen in
  `packages/shadow-objects/docs/api-reference.md`:
  - `:818` (»The destroyed state«), die beiden Sätze von »The three that sweep the whole context« bis
    »claimed uuid or not.«: neu gefasst. `clear()` und `dispose()` erreichen jede Komponente, die dem
    Context beigetreten ist — auch die, deren uuid eine später beigetretene beansprucht hat.
    `removeSubTree(uuid)` ist an einen Eintrag adressiert und nimmt die Instanz herunter, die ihn hält,
    samt ihrer Nachkommen; eine aus dieser uuid verdrängte Instanz steht in keinem Teilbaum und bleibt
    stehen. `destroyComponent(component)` löst die genannte Instanz ab und lässt den Eintrag stehen,
    wenn ein Namensvetter ihn hält.
  - `:967` (der Absatz hinter der Methodentabelle des `ComponentContext`), ein Satz angehängt:
    `destroyComponent()` löst genau die genannte Instanz ab; hat eine später beigetretene Komponente
    dieselbe uuid beansprucht, bleiben deren Eintrag und deren Entity davon unberührt.
  - `:1007` (`#### clear()`), der letzte Satz (»"Still holds" is one component per uuid …«): fällt und
    wird zur positiven Fassung — der Abbau geht über die Komponenten, die beigetreten sind, nicht über
    die Einträge; teilen sich zwei eine uuid, gehen beide herunter. `:1026` (`#### dispose()`) sagt
    bereits »Every `ViewComponent` the context holds is destroyed« und wird davon wörtlich richtig,
    braucht also keine Zeile.
  - `:814` bleibt unangetastet: der Absatz beschreibt die Taubheit der Elemente, und die ändert sich
    nicht (siehe »Die Einordnung«).

  **Schritt 6 — CHANGELOG und `Backlog.md`.**
  - `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`, Kasten »Next release«: die
    `clear()`-Klausel (`:51-63`) endet auf »… while a component that only leaves its context
    (`vc.context = null`) keeps both.« Daran mit », and« anschließen, dass derselbe Abbau jede
    Komponente erreicht, die dem Context beigetreten ist, und nicht eine je uuid — eine Komponente,
    deren uuid eine später beigetretene beansprucht hat, meldet danach `isDestroyed === true`, wo sie
    sich für lebendig hielt. **Kein eigener Aufzählungspunkt**, aus demselben Grund wie in Paket 3 und
    so in der Restplan-Prüfung vorgesehen: die einleitende Zahl (`:13`, »Twenty of them reach existing
    consumers«) beschreibt dieselbe Abbau-Familie und bleibt damit richtig. Wer stattdessen einen
    eigenen Punkt setzt, zieht die Zahl auf »Twenty-one« — dann aber nachzählen, nicht schätzen.
  - Derselbe Abschnitt, der Punkt `- **Breaking (view components):** ComponentContext.clear()…`
    (`:66`), Schlussklausel »One component stays outside the sweeping paths: … releases that instance
    either way.«: ersetzen statt danebenschreiben — zwei Einträge, die einander widersprechen, wären
    schlechter als eine korrigierte Zusage, und der Abschnitt ist nicht veröffentlicht. Neu:
    `clear()` und `dispose()` gehen über die Komponenten, die beigetreten sind, also auch über die,
    deren uuid eine später beigetretene beansprucht hat; `removeSubTree(uuid)` ist an einen Eintrag
    adressiert und meint sie nicht; `destroyComponent(component)` löst die genannte Instanz ab und
    lässt Eintrag und Entity eines Namensvetters stehen, wo beides vorher mit heruntergingen.
  - `Backlog.md:224` (erster Punkt unter »Grenze der Component-Ablösung«) verlässt die Datei: das ist
    der Befund, den dieses Paket abräumt, und erledigte Punkte werden nicht abgehakt. Der Blockkopf
    `:222` bleibt stehen, weil `:225` darunter bleibt.
  - `Backlog.md:225`, die Schlusszeile »**An Paket 4 übergeben** … oder über eine Ablösung, die die
    Abonnements stehen lässt.«: ersetzen durch Entscheidung und Wurzel — der flächige Abbau läuft über
    `destroy()`, die Grenze bleibt; ihre Ursache sitzt in `ShaeEntElement`, wo `viewComponent$` einmal
    geschrieben wird (`:354`), die Signale des Elements nie zerstört werden und deshalb die einzige
    Stelle, die die Komponente beenden würde (`:265-274`), nie läuft. Ein Element, das beim Wechsel
    seiner Komponente neu abonniert, hebt die Grenze auf; das ist eine eigene Änderung in
    `src/elements/` und ein Kandidat fürs nächste Audit.
  - Keine TODO-Kommentare berührt, also kein `pnpm make:todo`.

  **Schritt 7 — Verify** in der Reihenfolge unten, jede Ausgabe in den Verlauf.

- Verify: `pnpm lint` · `pnpm typecheck` · `pnpm test:ci --force` · `pnpm build` ·
  `pnpm -F shadow-objects-e2e test`. Die letzten beiden sind **nötig**: `src/view/` wird angefasst,
  womit die Regel im Plankopf greift; `pnpm build` zusätzlich aus dem harten Grund aus Paket 2 — das
  Integrationspaket löst `@spearwolf/shadow-objects` über `dist/` auf, ein Lauf ohne Build misst den
  alten Stand. Die e2e-Suite ist nicht wegen des Kollisionsfalls dabei (den baut keine Seite), sondern
  weil 2b und 2c auf dem heißesten Pfad der View-Seite sitzen: jeder Beitritt und jedes Verlassen
  eines Contexts läuft durch sie, und die Suite ist der einzige Ort, an dem das über einen
  vollständigen Seitenauf- und -abbau gegen einen echten `RemoteWorkerEnv` läuft. Erwartet:
  `test:ci` **707** statt 703 (371 → 375 im Kernpaket, 331 und 1 unverändert), e2e unverändert 402.
- Commit: `feat(view)!: clear() and dispose() reach every component instance, not one per uuid (VIEW-020)`
- Verlauf:
  - 2026-08-18 Zug 2 (Nachbesserung Runde 1, Review): angenommen mit Auflagen · **Blocker** —
    gemessen (Reviewer, drei gleichwertige Aufrufformen `ctx.destroyComponent(displaced)`,
    `displaced.destroy()`, `displaced.context = null`; Aufbau: `parent` Wurzel, `displaced` uuid
    `twin` ohne Elternteil, `namesake` uuid `twin` als Kind von `parent`): Change Trail danach
    `[{type: 3, uuid: 'twin', parentUuid: undefined}]`, dazu `ctx.isRootComponent(namesake)`
    `true` bei gleichzeitig `ctx.getChildren(parent)` weiter `['namesake']` — dieselbe uuid in
    beiden geordneten Listen. Ursache lag vor dem Trichter: `ViewComponent.#leaveContext()` →
    `removeFromParent()` → `moveToRoot(this.uuid)`, und `moveToRoot` schrieb auf den fremden
    Eintrag, bevor `#appendToOrdered` ins Spiel kam — die Fallen-Begründung aus Zug 1 deckte nur
    den Fall ab, in dem der Namensvetter selbst Wurzel ist. Auf Nutzerentscheidung: die
    Instanzprüfung zieht nach, die Zusage bleibt. **Umsetzung:** `ComponentContext.moveToRoot`
    und `.removeFromParent` nehmen jetzt die `ViewComponent`-Instanz statt einer bloßen uuid
    entgegen (einziger Aufrufer beider Methoden: `ViewComponent.removeFromParent()`, `:198-205`)
    und brechen ab, wenn der Eintrag der uuid nicht mehr auf die übergebene Instanz zeigt — beide
    Stellen brauchen den Guard, geprüft am Code: `removeFromParent` ist demselben Muster
    ausgesetzt, sobald die verdrängte Instanz selbst ein Kind war (eigener Fall gebaut, roter
    Beleg unten), nicht nur wenn sie Wurzel war. Rotmeldung wörtlich (identisch für beide neuen
    Fälle, vor dem Fix): `AssertionError: expected [ { type: 3, uuid: 'twin', …(1) } ] to deeply
    equal []` (voll ausgeschrieben: `{parentUuid: undefined, type: 3, uuid: 'twin'}`). Gegenprobe
    je Methode einzeln: (a) `moveToRoot`-Guard auf `childEntry !== undefined` zurückgezogen → nur
    der Wurzel-Fall (»…was a root and the namesake is not«) rot, der Kind-Fall bleibt grün — der
    nimmt den `removeFromParent`-Zweig; (b) `removeFromParent`-Guard ebenso zurückgezogen → nur
    der Kind-Fall (»…was itself a child«) rot; beide Mutationen zurückgenommen, Datei danach
    byte-identisch. Über den geforderten Fall hinaus einen zweiten ergänzt, der gezielt den
    `removeFromParent`-Zweig deckt (`displaced` mit eigenem Elternteil, `namesake` mit anderem) —
    sonst bliebe der zweite Guard ungepinnt. **Kleinigkeiten:** (5) `#componentInstances.clear()`
    bleibt, Kommentar benennt sie jetzt als Sicherheitsnetz nach demselben Muster wie die beiden
    Panics darunter; (6) Blockkopf `Backlog.md:222` heißt jetzt »Grenze der Re-Request-Abonnements
    nach flächigem Abbau«, der Inhalt handelt nicht mehr von der Ablösung; (7) neuer Fall
    `stays silent on a second call` im `clear`-Block, bereits vorher still, jetzt gepinnt.
    **Doku-Gegenprobe (Auflage 4):** die drei positiv gefassten Stellen (`api-reference.md:818`,
    `:967`, `CHANGELOG.md:69`) wörtlich nachgeprüft statt angenommen — sie stimmen erst seit
    diesem Fix wirklich, vorher waren sie nur für den Wurzel-Fall zufällig richtig (No-op durch
    `#appendToOrdered`s Bereits-drin-Check). Zusätzlich `api-reference.md:961-962`
    (Methodentabelle) und `CHANGELOG.md:69` um die Signaturänderung von `moveToRoot`/
    `removeFromParent` ergänzt, kein neuer Aufzählungspunkt. `docs/api-reference.md:814`, der
    CHANGELOG-Satz zur Taubheit und der zugehörige Backlog-Punkt unangetastet, gehören Paket 7. ·
    Verify: `pnpm build` vor dem Integrationslauf · `pnpm lint` rc=0 (2 `biome.json`-Infos),
    `pnpm typecheck` 3/3, `pnpm test:ci --force` **710** grün (378 + 331 + 1: drei neue Fälle im
    Kernpaket gegenüber Zug 1), `pnpm build` 3/3, e2e **402** grün.
  - 2026-08-18 Zug 1: Schritte 1-7 umgesetzt · rot zuerst (`pnpm -F @spearwolf/shadow-objects test`,
    4 failed | 371 passed): 1a `AssertionError: displaced.isDestroyed: expected false to be true //
    Object.is equality`, 1b dieselbe Meldung an der `dispose`-Stelle, 1c
    `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times`,
    1d `AssertionError: expected [ { type: 2, uuid: 'twin' } ] to deeply equal []` — alle wörtlich wie
    geplant · nach Schritt 2 grün: 375 (371 + 4) · die drei benannten Wächter (`ComponentContext.spec.ts:165-181`,
    `:556-569`, `ViewComponent.spec.ts:536-553`) blieben grün, keine der beiden Panics ausgelöst ·
    Gegenprobe: (a) `clear()`-Schleife zurück auf `this.#components.values()` → 3 failed (1a, 1b, 1c),
    1d bleibt grün; (b) `entry.component === component` aus der Bedingung in `destroyComponent()`
    genommen → 1 failed (1d), Rest grün; beide Mutationen zurückgenommen, `ComponentContext.ts`
    danach byte-identisch zum Stand davor · die drei durchgerechneten Fallen bestätigt: der doppelte
    Durchlauf durch `destroyComponent()` (Kontext-Setter → `#leaveContext()` → `destroyComponent()`,
    dann `destroy()`s eigener Aufruf) trifft `#componentInstances.delete()` zweimal, das ist harmlos,
    weil `Set.delete()` auf einem fehlenden Eintrag ein No-op ist; der `moveToRoot`-Treffer auf den
    fremden Eintrag beim Abräumen einer verdrängten Instanz in `clear()` bleibt unsichtbar, wie im
    Detailplan vorhergesagt — `#appendToOrdered` kehrt sofort um, die Wurzelschleife räumt beides ab;
    beide Panics in `clear()` (`#rootComponents is not empty!`, `#components is not empty!`) blieben
    in jedem Lauf und in beiden Gegenproben aus · Verify: `pnpm lint` rc=0 (2 `biome.json`-Infos),
    `pnpm typecheck` 3/3, `pnpm test:ci --force` **707** grün (375 + 331 + 1), `pnpm build` 3/3,
    e2e **402** grün.
  - 2026-08-18 Zug 0: Detailplan steht · VIEW-020 unverändert — die drei Fundstellen stehen Zeile für
    Zeile wie im Audit, nur um zwei Zeilen verschoben: die `clear()`-Schleife bei `:557-559` (Audit
    `:555-557`), `removeSubTree`/`#removeSubTree` bei `:251-267` (Audit `:251-266`, oberhalb der
    Verschiebung und damit unbewegt), `dispose()` bei `:586-597` (Audit `:584-595`); `#components`
    bei `:83`, der Trichter `destroyComponent()` bei `:169-188`. Die Verschiebung stammt aus Paket 2
    (`git diff f392f40 HEAD -- src/view/ComponentContext.ts`: zwei Kommentarblöcke, +2 Zeilen, keine
    Codezeile), Paket 3 hat an derselben Datei nur den Kommentar `:182-184` umformuliert, Paket 1 sie
    nicht angefasst · gemessen für die Ebenenwahl und die Einordnung: `ShaeEntElement.ts:353` ist der
    einzige `new ViewComponent(...)` in `src/` und übergibt keine `uuid` — eine Kollision entsteht nur
    von Hand · die Folge aus Paket 3 ist eingeordnet und **bleibt**, der Sweep läuft weiter über
    `destroy()` (siehe »Die Einordnung«); kein Paket 4b.

**VIEW-020 · low · packages/shadow-objects/src/view/ComponentContext.ts:555-557, :251-266, :584-595** — Der von einer uuid-Kollision verdrängte ViewComponent überlebt die flächigen Abbauwege

clear(), removeSubTree() und dispose() gehen über #components, und dort liegt je uuid genau ein Eintrag — der des zuletzt beigetretenen. Teilen sich zwei ViewComponents eine uuid, behält die verdrängte ihren context und meldet weiter isDestroyed === false, während der Rest des Contexts abgeräumt ist. destroyComponent(component) ist davon nicht betroffen: es bekommt eine Instanz genannt und löst genau diese ab, beanspruchte uuid oder nicht. Die Folge fängt der changeOrder-Wächter ab, die Ablösung selbst ist bewusst nicht auf diesen Weg erweitert.

Empfehlung: Wer die Ablösung auf den Kollisionsfall ausweiten will, braucht neben #components ein zweites Register, das auf Instanzen schlüsselt. Davor steht die Frage, ob doppelte uuids überhaupt vorkommen dürfen — sie entscheidet, ob sich der Umbau lohnt.

Evidenz (Audit): Gemessen am 2026-08-18 gegen den gebauten Stand; wörtlich festgehalten in docs/api-reference.md und Backlog.md:225.

*Der freigegebene Weg nimmt die Empfehlung zur Hälfte: das zweite Register kommt, das Verbot doppelter uuids nicht — siehe »Entscheidungen« und Schritt 2. Der Zusatz dieses Plans: `destroyComponent()` löst die genannte Instanz ab, ohne den Eintrag eines Namensvetters mitzunehmen, siehe Schritt 2c.*

### [x] 5. Der Property-Typ kennt den Eintrag der Länge 1
- Findings: VIEW-022 (info)
- Ziel: `ComponentPropertiesType` nennt beide Formen, `filterUndefinedProps` trägt seine Absicht im Typ, der Cast in `applyPropsChanges` entfällt.
- Bereich: `packages/shadow-objects/src/types.ts`, `src/utils/props-utils.ts`, `src/utils/props-utils.spec.ts`,
  `src/in-the-dark/Kernel.ts`, `src/in-the-dark/Entity.ts`,
  `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`, `Backlog.md`
- Hängt ab von: —
- Modell: mittlere Stufe
- Phase: 4 (Typsicherheit) · öffentlicher Typ, Bruch auf der Typebene
- Hash: `9d07a86`
- Dateien:
  - `packages/shadow-objects/src/types.ts` (eine Zeile plus JSDoc, s. Schritt 2)
  - `packages/shadow-objects/src/utils/props-utils.ts` (zwei Casts fallen, s. Schritt 3)
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts` (zwei Signaturen plus Typimport, s. Schritt 4)
  - `packages/shadow-objects/src/in-the-dark/Entity.ts` (eine Signatur plus Typimport und ein Kommentar, s. Schritt 4)
  - `packages/shadow-objects/src/utils/props-utils.spec.ts` (drei neue Fälle, s. Schritt 1)
  - `packages/shadow-objects/docs/api-reference.md` (zwei Tabellenzeilen, s. Schritt 7)
  - `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`, zwei Stellen, s. Schritt 7)
  - `Backlog.md` (eine Zahl, s. Schritt 7)
  - `packages/shadow-objects/docs/cheat-sheet.md` und `packages/shadow-objects/README.md`
    **nicht betroffen** — nachgeschlagen: `ComponentPropertiesType` kommt in `docs/` und im README
    **nirgends** vor; die einzige Tupel-Signatur im Cheat Sheet ist `entity.propEntries()`
    (`cheat-sheet.md:319`, ebenso `api-reference.md:408`), und die gehört dem Entity-eigenen
    Accessor, nicht dem Change Trail — sie bleibt `[string, unknown][]`.
  - `src/view/ComponentMemory.ts`, `src/view/ComponentContext.ts`, `src/view/ComponentChanges.ts`
    **nicht betroffen** — gemessen, s. »Die Reichweite«.

- **Die Reichweite (gemessen, vor dem ersten Zeichen Code).** Am 2026-08-18 gegen `c253f05`
  gemessen, nicht abgeschätzt: nur die Typzeile in `src/types.ts` auf
  `([string] | [string, unknown])[]` gezogen, `pnpm exec tsc -p tsconfig.json --noEmit` gefahren,
  Änderung zurückgenommen. Ergebnis: **genau zwei Fehler**, beide `TS2345`, beide im Worker-Kanal —
  `src/in-the-dark/Kernel.ts(226,11)` (`entry.properties` in den `createEntity`-Aufruf) und
  `src/in-the-dark/Kernel.ts(248,43)` (`entry.properties` in `changeProperties`), beide mit dem
  Satz »Type `[string]` is not assignable to type `[string, unknown]`. Source has 1 element(s) but
  target requires 2.« Das ist das Finding selbst, in einer Fehlermeldung: die Worker-Seite verspricht
  weniger, als der Change Trail zu tragen erklärt.

  Was **nicht** bricht, ebenso gemessen und einzeln nachgesehen — TypeScript liest einen Indexzugriff
  und eine Destrukturierung auf einer Tupel-Union ohne Beschwerde:
  - `props-utils.ts:5` — `entry[1]` auf der Union ist kein Fehler; die Klammer `(entry as Array<any>)`
    wird damit überflüssig und fällt (beide Schreibweisen kompilieren, gegengeprüft).
  - `props-utils.ts:23` und `:28` — `for (const [key, value] of changes)` und der Schreibzugriff
    `entry[1] = value` bleiben, wie sie sind.
  - `props-utils.ts:41`, `:44` — die Schleife in `propsEqual` und `bEntry[1]` ebenso.
  - `view/ComponentContext.ts:544` — `for (const [key, value] of cMem.properties)` ebenso.
  - `view/ComponentMemory.ts:18`, `:83`, `:113` — die drei Stellen reichen den Typ nur durch.
  - `view/ComponentChanges.ts:279` und `:340-355` bauen die Einträge und tun das weiterhin in der
    Form der Länge 2; ein `[string, unknown]` ist der weiteren Union zuweisbar.

  Der Cast in `props-utils.ts:21` fällt **nicht** durch die Typänderung — ein Cast kompiliert immer.
  Er hängt an `entry.slice()`, das aus einem Tupel ein `unknown[]` macht. Er fällt durch die
  Umschreibung in Schritt 3, und auch das ist gemessen: die Fassung
  `.map((entry) => (entry.length === 1 ? [entry[0]] : [entry[0], entry[1]]))` braucht keinen Cast,
  der deklarierte Rückgabetyp der Funktion trägt die Kontexttypisierung durch das `?.map(...)`.
  Gegenprobe des Zielzustands als Ganzes: Typänderung, beide Casts weg, drei Signaturen im
  Worker-Kanal gezogen → `tsc -p tsconfig.json --noEmit` **fehlerfrei**, `props-utils.spec.ts` 18/18
  grün. Danach `git checkout -- src` (der Baum war anschließend sauber).

  **Erzeuger der kurzen Form gibt es im Repo keinen.** Über `packages/*/src` und `packages/*/test`
  gesucht: `props-utils.ts:5` ist die einzige Stelle, die `length === 1` überhaupt liest, und kein
  Test, kein Element und kein `ComponentChanges`-Pfad baut je ein Tupel der Länge 1. Der Zweig ist
  seit `9e56c21` defensiv. Das ändert am freigegebenen Weg nichts — modelliert wird, was die
  Funktion durchlässt —, gehört aber als Befund in die Nebenbefunde und nicht in eine stille Löschung.

- Vorgehen:

  **Schritt 1 — Tests zuerst, und wo hier das Rot sitzt.** Der Kern dieses Pakets ist eine
  Typänderung, also ist `pnpm -F @spearwolf/shadow-objects typecheck` der rote Test — aber nicht
  allein, und er wird an **zwei** verschiedenen Stellen rot. Drei neue Fälle in
  `src/utils/props-utils.spec.ts`, alle mit `ComponentPropertiesType` annotiert, denn genau die
  Annotation macht die Absicht prüfbar:

  1a. Im `describe('filterUndefinedProps')`, vor `it('should work as expected')`:
  **`it('keeps a bare key')`** —
  `const props: ComponentPropertiesType = [['foo'], ['bar', undefined], ['baz', 1]];`,
  Erwartung `toEqual([['foo'], ['baz', 1]])`. Das ist die Zusage der Funktion im Klartext.

  1b. Im `describe('applyPropsChanges')`, hinter `it('leaves the tuples of changes to their owner')`:
  **`it('copies a bare key as a bare key')`** — `changes: ComponentPropertiesType = [['foo'], ['bar', 2]]`,
  `applyPropsChanges(undefined, changes)` liefert `toEqual([['foo'], ['bar', 2]])`, und
  `result[0]` ist nicht `changes[0]`. Dieser Fall bewacht die Zeile, die Schritt 3 umschreibt.
  Gemessen, weil es die Aussagekraft entscheidet: vitests `toEqual` unterscheidet `[['foo']]` von
  `[['foo', undefined]]` (`1 failed`, wörtlich gegengeprüft) — die Assertion trägt allein, ein
  zusätzliches `toHaveLength(1)` ist Geschmackssache.

  1c. Im `describe('propsEqual')`, am Ende: **`it('compares a bare key')`** —
  `propsEqual([['foo']], [['foo']])` ist wahr, `propsEqual([['foo']], [['foo', 'bar']])` falsch.
  Pinnt die Schleife, die `entry[1]` liest.

  Lauf: `pnpm -F @spearwolf/shadow-objects typecheck`. **Erwartet rot, je Literal der Länge 1 eine
  Meldung**, gemessen für 1a: `src/utils/props-utils.spec.ts(20,47): error TS2322: Type '[string]'
  is not assignable to type '[string, unknown]'. Source has 1 element(s) but target requires 2.`
  Der Test, der die Absicht ausspricht, lässt sich gegen den heutigen Typ nicht einmal schreiben —
  das ist das Finding.

  Ebenso gemessen und deshalb ausdrücklich gesagt, damit niemand das falsche Grün für einen
  Fehlschlag hält: `pnpm exec vitest src/utils/props-utils.spec.ts --run` ist mit denselben Fällen
  **grün** (19 passed), weil esbuild die Typen wegwirft. Die drei Fälle sind zur Laufzeit Wächter,
  keine roten Tests — ihre Beweislast trägt die Gegenprobe in Schritt 6, nicht der erste Lauf. Die
  Rotmeldungen von `typecheck` wörtlich in den Verlauf.

  **Schritt 2 — der Typ.** `src/types.ts:22`:

  ```ts
  export type ComponentPropertiesType = ([string] | [string, unknown])[];
  ```

  Darüber ein JSDoc-Block, englisch, der beide Formen benennt: ein Eintrag trägt einen Schlüssel mit
  seinem Wert; ein Eintrag, der nur den Schlüssel nennt, zählt als gesetzt, ohne einen Wert zu
  tragen — deshalb behält `filterUndefinedProps` ihn und wirft `[key, undefined]` weg, und die
  Entity dahinter liest die Property als `undefined`. Kein Rückblick auf den Vorzustand.

  **Kein benannter Eintragstyp.** Die naheliegende Alternative — ein exportiertes
  `ComponentPropertyEntryType = [string] | [string, unknown]` und der Array-Typ darüber — ist
  geprüft und verworfen: `src/index.ts:9` reicht `types.js` vollständig hinaus, ein zweiter Name
  wäre neue öffentliche Oberfläche, und gebraucht wird er nirgends (im gemessenen Zielzustand kam
  keine Stelle ohne ihn aus). Das Audit nennt die Inline-Form, sie gilt.

  **Schritt 3 — `props-utils.ts`, beide Casts fallen.**
  - `:5` — `return props.filter((entry) => entry.length === 1 || entry[1] !== undefined);`
    Der `as Array<any>` war die Umgehung des Typs, der die kurze Form nicht kannte; mit ihr im Typ
    liest sich die Zeile als das, was sie prüft.
  - `:21` — `return filterUndefinedProps(changes)?.map((entry) => (entry.length === 1 ? [entry[0]] : [entry[0], entry[1]]));`
    Der abschließende `as ComponentPropertiesType | undefined` entfällt. Der Kommentar `:18-19`
    (»the tuples belong to `changes`…«) bleibt unverändert stehen, er begründet weiterhin die Kopie.
    **Bewusst in Kauf genommen und zu benennen:** wo `entry.slice()` einen Eintrag beliebiger Länge
    unverändert kopierte, schneidet die neue Fassung nach dem zweiten Element ab. Ein Eintrag der
    Länge 3 war nie Teil des Typs und entsteht im Repo nirgends; ein von Hand gebauter Change Trail
    aus JS könnte einen tragen. Das ist eine Verengung auf das, was der Typ zusagt — sie gehört in
    die Commit-Message, nicht ins CHANGELOG.

  **Schritt 4 — der Worker-Kanal nimmt, was der Trail trägt.** Die beiden gemessenen `TS2345` sind
  hier zu schließen, und zwar durch Weiten, nicht durch einen Cast an der Aufrufstelle — ein Cast
  dort verschöbe das Finding nur von `props-utils.ts` nach `Kernel.ts`.
  - `Kernel.ts:266` — `properties?: ComponentPropertiesType,` (Parameter von `createEntity`).
  - `Kernel.ts:370` — `changeProperties(uuid: string, properties: ComponentPropertiesType): void`.
  - `Kernel.ts:15-24` — `ComponentPropertiesType` in den `import type`-Block aus `../types.js`
    aufnehmen (alphabetisch vor `IComponentChangeType`).
  - `Entity.ts:300` — `setProperties(properties: ComponentPropertiesType)`; `Entity.ts:12` importiert
    heute nur `IComponentEvent` aus `../types.js` und nimmt den Typ dazu. Der Rumpf `:302-305` bleibt
    unverändert — `for (const [key, val] of properties)` kompiliert auf der Union (gemessen), und ein
    Eintrag der Länge 1 liefert `val === undefined`. Genau **ein** Kommentar dazu, denn das ist die
    einzige Stelle, an der die kurze Form zu einem Wert wird: ein Eintrag, der nur den Schlüssel
    nennt, schreibt die Property als `undefined` — der Schlüssel ist da, der Wert ist es nicht.

  Der Rest der Worker-Seite ist geprüft und bleibt unberührt: `Entity.ts:321` (`propEntries()`)
  gibt die Properties der Entity zurück, nicht Trail-Einträge, und bleibt `[string, unknown][]`.
  `src/worker/` fasst Properties nirgends einzeln an — `MessageRouter` und `WorkerRuntime` reichen
  Change Trails als Ganzes weiter.

  **Schritt 5 — grün.** `pnpm -F @spearwolf/shadow-objects typecheck` fehlerfrei,
  `pnpm -F @spearwolf/shadow-objects test`. Erwartet: die 18 vorhandenen Fälle von
  `props-utils.spec.ts` plus die drei neuen, das Kernpaket 385 statt 382. Fällt ein vorhandener Fall
  um, ist das ein Befund und keine Testanpassung.

  **Schritt 6 — Gegenprobe von Hand.** Zwei Mutationen, je eine für die beiden Hälften des Findings:
  (a) in `props-utils.ts:21` den bedingten Aufbau durch `[entry[0], entry[1]]` ohne Bedingung
  ersetzen → Fall 1b wird rot, die kurze Form käme als `['foo', undefined]` zurück; das belegt, dass
  der neue Fall die umgeschriebene Zeile wirklich bewacht. (b) `Kernel.ts:370` zurück auf
  `properties: [string, unknown][]` → `typecheck` wird rot mit dem gemessenen
  `Kernel.ts(248,43): error TS2345`; das belegt, dass die Weitung im Worker-Kanal trägt und nicht
  Kosmetik ist. Beide Mutationen zurücknehmen, das Ergebnis in den Verlauf.

  **Schritt 7 — Doku, CHANGELOG, Backlog, gleicher Zug.** Ein öffentlicher Typ ändert sich, also
  greift die Konvention — die Stellen sind einzeln nachgeschlagen, nicht angenommen:
  - `docs/api-reference.md:2073` — Zeile `createEntity` in der Tabelle »Applying a Change Trail by
    Hand«: der Satz »`properties` is a list of `[name, value]` pairs.« bekommt die kurze Form dazu —
    ein Eintrag, der nur den Namen nennt, setzt die Property auf `undefined`.
  - `docs/api-reference.md:2077` — Zeile `changeProperties`: die wörtliche Signatur
    `(uuid: string, properties: [string, unknown][])` zieht auf
    `(uuid: string, properties: ComponentPropertiesType)` nach. Das ist die einzige Stelle in
    `docs/`, die den Tupeltyp eines Trail-Eintrags wörtlich führt.
  - `packages/shadow-objects/CHANGELOG.md`, `## [Unreleased]`, **zwei Stellen, beide im Bestand**:
    (i) ein neuer Punkt `- **Breaking (types):**` hinter den beiden `Breaking (view components)`-Punkten
    (heute `:69` und `:70`), vor dem `New (public API)`-Punkt zu `ViewComponent.Destroyed`:
    `ComponentPropertiesType` nennt beide Einträge, und was einen Change Trail *liest*, sieht das —
    ein `const props: [string, unknown][] = change.properties` kompiliert nicht mehr, ein
    `entry[1]` schon. Zur Laufzeit ändert sich nichts. `Kernel.createEntity`,
    `Kernel.changeProperties` und `Entity.setProperties` nehmen den weiteren Typ, was für Aufrufer
    additiv ist. (ii) Der Kasten `:12-67`: der Halbsatz gehört in die Aufzählung der Brüche, die
    Konsumenten erreichen, und die einleitende Zahl `:13` (»Twenty of them reach existing
    consumers«) zieht um eins nach. **Erweitern, nicht danebenschreiben** — der Abschnitt ist die
    gemeinsame Fläche aller Pakete dieses Laufs.
  - `Backlog.md:275` — »**vitest** (…, 15 Dateien, 364 Fälle)«: die Zahl ist seit Paket 2 stehen
    geblieben und trägt nach diesem Paket die gemessene neue (Erwartung 385, **nachzählen statt
    rechnen**). Die Dateizahl bleibt 15, es kommt keine Spec-Datei dazu. Kein TODO-Kommentar
    berührt, also kein `pnpm make:todo`.

  **Schritt 8 — Verify** in der Reihenfolge unten, jede Ausgabe in den Verlauf.

- Verify: `pnpm lint` · `pnpm typecheck` · `pnpm test:ci --force` · `pnpm build`.
  **`pnpm build` ist nötig, obwohl weder `src/view/` noch `src/elements/` angefasst wird**: die
  Deklarationen entstehen in einem *anderen* Compilerlauf als `typecheck` — `build.mjs` fährt
  `tsc -p tsconfig.lib.json` mit `emitDeclarationOnly` und ohne die Specs, während `typecheck`
  `tsconfig.json` mit `--noEmit` und *mit* Specs fährt. Ein Emit kann scheitern, wo eine Prüfung
  durchgeht, und dieses Paket ändert genau das, was emittiert wird. Nachsehen, dass
  `packages/shadow-objects/dist/src/types.d.ts` die Union trägt und die Dateiliste unter `dist/`
  unverändert bleibt. (Turbo baut ohnehin: `turbo.json` gibt `test` ein `dependsOn: ["^build", "build"]`.)
  **Die e2e-Suite ist nicht nötig**: keine Zeile View- oder Element-Code, keine Seite, kein
  Laufzeitverhalten — die Union ist eine Aussage des Compilers, und die einzige Laufzeitzeile
  (Schritt 3, `:21`) hat ihren eigenen Wächter aus Schritt 1b. Erwartet: `test:ci` 720 statt 717.
- Commit: `refactor(types)!: ComponentPropertiesType names the entry that carries a key without a value (VIEW-022)`
- Verlauf:
  - 2026-08-18 Zug 0: Detailplan steht · VIEW-022 unverändert — `ComponentPropertiesType` steht Zeile
    für Zeile wie im Audit bei `src/types.ts:22`, `filterUndefinedProps` bei
    `src/utils/props-utils.ts:5`, der Cast bei `:21`; keiner der fünf Commits dieses Laufs
    (`1b3dd3f`, `58e1a46`, `c17f6bb`, `375edce`, `c253f05`) hat eine der drei Dateien angefasst
    (`git log --oneline f392f40..HEAD -- src/types.ts src/utils/props-utils.ts src/in-the-dark/`
    ist leer) · Reichweite gemessen statt geschätzt: genau zwei `TS2345` im Worker-Kanal, alles
    andere trägt die Union ohne Änderung (s. »Die Reichweite«) · gemessen für Schritt 1: der
    Spec-Fall mit `ComponentPropertiesType` ist gegen den heutigen Typ `TS2322`, unter vitest
    dagegen grün · gemessen für Schritt 1b: vitests `toEqual` unterscheidet `[['foo']]` von
    `[['foo', undefined]]` · nachgeschlagen: `ComponentPropertiesType` kommt in `docs/` und im
    README nicht vor, die einzigen Doku-Stellen sind `api-reference.md:2073` und `:2077`.
  - 2026-08-18 Zug 1: Schritte 1-8 umgesetzt · rot zuerst (`pnpm -F @spearwolf/shadow-objects typecheck`),
    vier `TS2322` (`props-utils.spec.ts(35,47)`, `(93,49)`, `(165,26)`, `(166,26)` — die beiden
    letzten aus einer Zeile mit zwei Aufrufen), jede wörtlich »Type '[string]' is not assignable to
    type '[string, unknown]'. Source has 1 element(s) but target requires 2.«; unter
    `pnpm exec vitest src/utils/props-utils.spec.ts --run` dieselben Fälle grün (21 passed) — das
    falsche Grün wie vorausgesagt, nicht als Nachweis gezählt · Typzeile auf
    `([string] | [string, unknown])[]` gezogen, JSDoc ergänzt (`src/types.ts:22-26`) · beide Casts in
    `props-utils.ts` gefallen (`:5` der `as Array<any>`, `:21` der `as ComponentPropertiesType |
    undefined`, dort zugleich die bedingte Kopie `entry.length === 1 ? [entry[0]] : [entry[0],
    entry[1]]`) · Worker-Kanal geweitet: `Kernel.ts:266` (`createEntity`-Parameter), `Kernel.ts:370`
    (`changeProperties`), Typimport in `Kernel.ts:16`; `Entity.ts:300` (`setProperties`), Typimport
    in `Entity.ts:12`, ein Kommentar zur kurzen Form ergänzt · grün:
    `pnpm -F @spearwolf/shadow-objects typecheck` fehlerfrei, `pnpm -F @spearwolf/shadow-objects test`
    **385** grün (382 + 3 neue Fälle) · Gegenprobe (a) `props-utils.ts:21` auf
    `[entry[0], entry[1]]` ohne Bedingung verengt → `copies a bare key as a bare key` rot
    (`AssertionError: expected [ [ 'foo', undefined ], [ 'bar', 2 ] ] to deeply equal [ [ 'foo' ], [
    'bar', 2 ] ]`), Mutation zurückgenommen; (b) `Kernel.ts:370` auf `properties: [string,
    unknown][]` zurückverengt → `typecheck` rot mit `Kernel.ts(249,43): error TS2345` (eine Zeile
    tiefer als die im Vorfeld gemessene `:248` — der neue Typimport in Zeile 16 verschiebt den Rest
    der Datei um eins), wörtlich »Type '[string] | [string, unknown]' is not assignable to type
    '[string, unknown]'. Type '[string]' is not assignable to type '[string, unknown]'. Source has 1
    element(s) but target requires 2.«, Mutation zurückgenommen, `typecheck` danach wieder fehlerfrei
    · Doku und CHANGELOG gezogen: `docs/api-reference.md:2073` (bare-key-Satz ergänzt), `:2077`
    (Signatur auf `ComponentPropertiesType`); `CHANGELOG.md` neuer Punkt »Breaking (types)« vor dem
    `ViewComponent.Destroyed`-Punkt, Kasten-Zahl »Twenty« auf »Twenty-one« gezogen und der
    Aufzählung ein Halbsatz zu `ComponentPropertiesType` angehängt · `Backlog.md:275` von 364 auf
    385 gezogen · Verify: `pnpm lint` rc=0 (2 `biome.json`-Infos, 192 Dateien), `pnpm typecheck` 3/3,
    `pnpm test:ci --force` **720** grün (385 + 334 + 1), `pnpm build` 3/3, `dist/src/types.d.ts`
    trägt die Union · Arbeitsbaum nach dem Zug: acht geänderte Dateien, kein Commit (Auftrag verbietet
    ihn) · Nebenbefund bestätigt, nicht gefixt: kein Erzeuger des `length === 1`-Zweigs im Repo,
    geht als Nebenbefund in die nächste Erhebung (s. »Entscheidungen«).
  - 2026-08-19 Zug 3-5: Review **angenommen**, keine Blocker · der Reviewer hat jede Zusage selbst
    nachgerechnet statt sie zu übernehmen: nur die Typzeile zurückgesetzt reproduziert **exakt zwei**
    `TS2345` in `Kernel.ts` (deckt sich mit der Planmessung); `props-utils.ts:5` ist per eigener
    Repo-Suche die einzige Leseposition und kein Erzeuger, die Funktion nicht exportiert, die
    Verengung der Kopierzeile damit richtig eingeordnet (Mutation: `copies a bare key as a bare key`
    wird rot); die CHANGELOG-Kastenzahl »Twenty« → »Twenty-one« nachgezählt — 20 top-level Klauseln
    bei `HEAD`, der Diff fügt genau eine hinzu; der `dist/`-Kontrakt über einen echten
    Vorher/Nachher-Build geprüft (`git stash` → Build → Liste → `stash pop` → Build → Diff):
    Dateiliste identisch, `dist/package.json` byte-identisch · `README.md` und `docs/cheat-sheet.md`
    unberührt bestätigt.
- Ergebnis (2026-08-19, `9d07a86`): Verify selbst gefahren — `pnpm build --force` 3/3,
  `pnpm lint` rc=0 (192 Dateien, 2 vorbestehende `biome.json`-Infos), `pnpm typecheck --force` 3/3,
  `pnpm test:ci --force` **720** grün (385 + 334 + 1), wie im Detailplan erwartet (717 → 720).
  `dist/src/types.d.ts:22` trägt die Union. e2e planmäßig ausgenommen (keine Zeile View- oder
  Element-Code, kein Laufzeitverhalten).
- Nebenbefunde: kein Erzeuger des `length === 1`-Zweigs im Repo — der Zweig in `filterUndefinedProps`
  ist heute nur für Eingaben von außerhalb erreichbar. Geht in die nächste Erhebung, nicht in diesen Lauf.
- Schnittstellen: `ComponentPropertiesType` ist ein öffentlicher Typ; der Bruch liegt allein auf der
  Typebene, kein Laufzeitverhalten ändert sich. Paket 6 überschneidet sich mit keiner dieser Dateien.

**VIEW-022 · info · packages/shadow-objects/src/utils/props-utils.ts:5, :21 (Typ in src/types.ts:22)** — ComponentPropertiesType modelliert den Eintrag der Länge 1 nicht

ComponentPropertiesType ist [string, unknown][] und kennt damit keinen Eintrag der Länge 1; filterUndefinedProps lässt genau diesen bewusst durch, weil entry.length === 1 als gesetzt zählt. Typ und Funktion sagen Verschiedenes, und die Kopierstelle in applyPropsChanges braucht deshalb einen Cast auf ComponentPropertiesType, der mehr behauptet, als gilt. Kein Laufzeitdefekt — eine Lücke im Typmodell, die jede spätere Änderung an dieser Stelle wieder einen Cast kostet.

Empfehlung: Den Typ beide Formen nennen lassen, ([string] | [string, unknown])[], dann trägt filterUndefinedProps seine Absicht im Typ und der Cast entfällt. Der Wechsel schlägt auf jede Stelle durch, die auf entry[1] zugreift, und gehört deshalb in einen eigenen Zug.

Evidenz (Audit): Vom Reviewer durch drei tsc-Läufe eingegrenzt; vorbestehend, von diesem Lauf nicht angefasst.

*Der freigegebene Weg ist der des Audits. Präzisiert durch Messung: »jede Stelle, die auf entry[1] zugreift« sind zwei — beide in `Kernel.ts`, beide beim Weiterreichen, keine beim Lesen. Ein Indexzugriff auf die Union kostet nichts.*

### [x] 6. Den redundanten Spec-Fall streichen
- Findings: TEST-012 (info)
- Ziel: Die Nicht-Spreizung eines String-Configs wird an genau einer Stelle geprüft, in der Tabelle mit der stärkeren Assertion.
- Bereich: `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`, `Backlog.md`
- Hängt ab von: —
- Modell: günstigste Stufe
- Phase: 5 (Konsistenz)
- Hash: `9d35e13`
- Dateien:
  - `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts` (ein `it` fällt, s. Schritt 2)
  - `Backlog.md` (vier Zahlen, s. Schritt 4)
  - `packages/shadow-objects/CHANGELOG.md`, das Wurzel-`CHANGELOG.md`, `docs/` und `README.md`
    **nicht betroffen** — begründet, nicht vergessen: es ändert sich keine Zeile ausgelieferter
    Code, `build.mjs:39` schließt `*.spec.ts` vom Lib-Transpile aus, die Datei erreicht `dist/`
    nie; und das Wurzel-CHANGELOG führt Build, Testrunner, Lint, turbo/pnpm — ein einzelner
    Spec-Fall ist keines davon. Paket 1 stand dort, weil es `vitest.config.ts` änderte.

- Vorgehen:

  **Schritt 1 — belegen, dass die Tabelle den Fall trägt, bevor er fällt.** Für ein Paket, das einen
  Test *streicht*, ist »rot zuerst« der falsche Nachweis; der richtige ist: die verbleibende Prüfung
  unter Mutation rot sehen. Zwei Belege, der zweite ist der, der zählt.

  1a. Strukturell, am Code nachgezählt. Der Einzelfall `it('starts when the stored worker config is
  not a JSON object')` steht bei `RemoteWorkerEnv.spec.ts:487-506`. Er setzt den Storage-Schlüssel
  auf `'"debug"'` (`:489`) und prüft zweierlei: `worker.posted[0].config` hat keine Eigenschaft
  `'0'` (`:494`), und die Warnung nennt den Storage-Schlüssel (`:495-498`). Die `it.each`-Tabelle
  darunter (`:508-541`) führt in Zeile vier **denselben** Wert `'"debug"'` (`:512`), erhebt vorher
  eine Nulllinie aus einem Env-Start ganz ohne gesetzten Schlüssel (`:519-522`) und prüft dann
  `worker.posted[0].config` **ganz** gegen diese Nulllinie (`:529`) — plus dieselbe Warnung
  (`:530-533`). `toEqual(baseline)` schließt »keine Eigenschaft `'0'`« ein, solange die Nulllinie
  selbst keine trägt; sie entsteht in `RemoteWorkerEnv.ts:356-361` aus `ConsoleLogger.sharedConfig`,
  `enable` und dem leeren Spread, und ein aus einem String gespreiztes `'0'` könnte dort nur
  auftauchen, wenn `sharedConfig` es hätte. Beides zusammen: die Tabellenzeile prüft alles, was der
  Einzelfall prüft, und darüber hinaus jeden weiteren Schlüssel der Konfiguration.

  1b. Empirisch, und das ist der Nachweis, den der Implementierer führen muss. Nach dem Streichen
  (Schritt 2) eine Mutation in `src/view/RemoteWorkerEnv.ts:385`: die Bedingung
  `if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))` auf
  `if (parsed === null)` verengen. Damit passiert ein String den Wächter, wird in
  `configureConsoleLogger` (`:360`) in die Konfiguration gespreizt und trägt `{0: 'd', 1: 'e', …}`
  hinein. Erwartet: `pnpm exec vitest src/view/RemoteWorkerEnv.spec.ts --run` meldet die
  Tabellenzeile `treats a stored config of "debug" (a string) like a missing one` rot, an der
  Assertion `contributes nothing beyond the shared config`. Genau das war die Aussage des
  gestrichenen Falls — sie steht danach in der Tabelle, an einem Fall, den niemand mehr entfernen
  kann, ohne es zu merken. Die Fehlermeldung wörtlich in den Verlauf, die Mutation zurücknehmen.
  (Nebenbei fällt unter derselben Mutation die Zeile `[1,2]` mit; die Zeile `0` bleibt grün, weil
  `{...0}` leer ist. Das gehört in den Verlauf, ändert aber nichts.)

  **Schritt 2 — streichen.** `RemoteWorkerEnv.spec.ts:487-506` samt der Leerzeile `:486` entfernen.
  Sonst nichts: die Assertion wird **nicht** in die Tabelle gehoben. Der »falls«-Zweig der
  Empfehlung ist damit beantwortet — `toEqual(baseline)` (`:529`) sagt bereits mehr als
  `not.toHaveProperty('0')`, ein zusätzliches `not.toHaveProperty('0')` daneben wäre die Redundanz
  in kleiner. Der Titel des gestrichenen Falls kommt im Repo an keiner weiteren Stelle vor
  (nachgeschlagen: eine einzige Fundstelle, die Definition selbst), es hängt also keine Doku, keine
  Filterung und kein Testplan daran.

  **Schritt 3 — grün.** `pnpm -F @spearwolf/shadow-objects test`. Erwartet:
  `RemoteWorkerEnv.spec.ts` 34 statt 35 Fälle, das Kernpaket einen Fall weniger als nach Paket 5.
  Kein anderer Fall darf sich rühren — die drei übrigen Fälle des Blocks
  `console-logger config for the worker` teilen sich den Schlüssel, aber jeder räumt ihn in seinem
  eigenen `finally` ab (`:460-462`, `:481-484`, `:537-540`), das Streichen kann also keine
  Reihenfolgeabhängigkeit lösen oder erzeugen.

  **Schritt 4 — `Backlog.md` synchronisieren.** Vier Zahlen, alle nachgeschlagen:
  - `:298` — »`RemoteWorkerEnv.spec.ts` (35 Fälle über einen Worker-Doppelgänger)« wird 34. Die
    Aufzählung dahinter (»unparsbar, Array, `null`, Zahl- und String-Skalar«) bleibt richtig, den
    String-Skalar trägt jetzt die Tabelle.
  - `:374` — »ohne die Ersetzung fallen 9 Tests in 3 Dateien … `RemoteWorkerEnv.spec.ts` (7 Fälle im
    Block `console-logger config for the worker`)«: es sind danach **8 Tests** und **6 Fälle**. Die
    sieben waren die drei Einzelfälle mit `localStorage.setItem` plus die vier Tabellenzeilen; einer
    der drei fällt. Nachzählen, nicht abschreiben.
  - `:275` — die vitest-Fallzahl zieht auf den nach diesem Paket gemessenen Stand nach (Erwartung:
    einer weniger als nach Paket 5).
  - `:278` — »22 Dateien, 323 Fälle« für `shadow-objects-testing` ist seit Paket 2 stehen geblieben;
    gemessen sind es **23 Dateien** (neu: `ent-element-context-clear`, aus Paket 3) und 334 Fälle.
    Dieses Paket ist das letzte des Laufs, das die Inventarzahlen anfasst, also holt es sie hier
    nach — der Block soll den Zustand beschreiben, den es gibt. Kein TODO-Kommentar berührt, also
    kein `pnpm make:todo`.

  **Schritt 5 — Verify** in der Reihenfolge unten, jede Ausgabe in den Verlauf.

- Verify: `pnpm lint` · `pnpm typecheck` · `pnpm test:ci --force`.
  Zur Regel im Plankopf: dieses Paket fasst eine Datei unter `src/view/` an, dem Buchstaben nach
  wären also `pnpm build` und die e2e-Suite fällig. Der Grund hinter der Regel greift nicht — die
  Datei ist eine Spec, `build.mjs:39` nimmt `*.spec.ts` vom Lib-Transpile aus, und es ändert sich
  keine ausgelieferte Zeile, kein Export, keine Seite. `pnpm build` läuft ohnehin mit: `turbo.json`
  gibt `test` ein `dependsOn: ["^build", "build"]`. Die e2e-Suite bleibt aus, und wenn ein Zweifel
  bleibt, ist der letzte Lauf vor dem Abschluss-Commit der Ort dafür, nicht dieses Paket.
  Erwartet: `test:ci` einen Fall weniger als nach Paket 5 (719, wenn Paket 5 bei 720 landet).
- Commit: `test(view): drop the worker-config case the table below it already covers (TEST-012)`
- Verlauf:
  - 2026-08-18 Zug 0: Detailplan steht · TEST-012 unverändert — der Einzelfall steht Zeile für Zeile
    wie im Audit bei `RemoteWorkerEnv.spec.ts:487-506`, die `it.each`-Tabelle bei `:508-541`, der
    gemeinsame Wert `'"debug"'` bei `:489` und `:512`; `git log --oneline f392f40..HEAD -- src/view/RemoteWorkerEnv.spec.ts`
    ist leer, keiner der fünf Commits dieses Laufs hat die Datei angefasst · gemessen:
    `pnpm exec vitest src/view/RemoteWorkerEnv.spec.ts --run` → 35 Fälle grün · nachgeschlagen: der
    Titel des Falls kommt genau einmal im Repo vor, `Backlog.md` nennt die Datei an vier Stellen
    (`:195`, `:276`, `:298`, `:374`), zwei davon führen Zahlen, die dieses Paket bewegt.
  - 2026-08-19 Zug 1: Schritte 1a-4 umgesetzt · Schritt 2: `RemoteWorkerEnv.spec.ts:486-506` gefallen,
    die Assertion **nicht** in die Tabelle gehoben · Schritt 1b bezeugt: unter der Verengung von
    `RemoteWorkerEnv.ts:385` auf `if (parsed === null)` meldet die Tabellenzeile
    `treats a stored config of "debug" (a string) like a missing one` wörtlich
    `AssertionError: contributes nothing beyond the shared config: expected { '0': 'd', '1': 'e', '2': 'b', …(10) } to deeply equal { enable: true, debug: false, …(6) }`;
    Mutation zurückgenommen · Schritt 3: `RemoteWorkerEnv.spec.ts` 34 statt 35, Kernpaket 384 statt 385 ·
    Schritt 4: vier Zahlen in `Backlog.md` nachgezogen, bei `:278` auch die Dateiliste um
    `ent-element-context-clear` ergänzt.
  - 2026-08-19 Zug 3: Review **angenommen**, keine Blocker. Die zwei Zweifel aus Zug 2 sind geklärt,
    beide durch eigene Messung des Reviewers:
    (a) die `:374`-Zahlen sind jetzt gemessen statt gerechnet — `vitest.setup.ts:8` versuchsweise
    abgeschaltet, dann `pnpm exec vitest run src/utils/ConsoleLogger.spec.ts src/utils/ConsoleLogger.storage.spec.ts src/view/RemoteWorkerEnv.spec.ts`
    → `Tests 8 failed | 32 passed (40)`, davon **6** im Block `console-logger config for the worker`,
    je einer in den beiden `ConsoleLogger`-Specs. Die Backlog-Aussage »8 Tests in 3 Dateien«, »6 Fälle
    im Block« ist damit belegt, nicht behauptet. Mutation zurückgenommen.
    (b) der isolierte Lauf `pnpm exec vitest src/view/RemoteWorkerEnv.spec.ts --run` läuft grün
    (4× wiederholt, 34/34) — der vom Implementierer gemeldete `localStorage`-Setup-Fehler war nicht
    reproduzierbar. Die zitierte 1b-Fehlermeldung ist davon unberührt echt: der Reviewer hat die
    Mutation über genau diesen Befehl selbst gefahren und die Meldung wörtlich reproduziert.
  - **Korrektur am Plantext dieses Pakets** (Nebenbefund des Reviewers, keine Codefolge): die
    Klammerbemerkung in Schritt 1b, die Tabellenzeile `0` bleibe unter der Mutation grün, stimmt
    nicht. Sie fällt ebenfalls — nicht an der Config-Assertion (`{...0}` ist tatsächlich leer),
    sondern an `the warning names the storage key`, weil die verengte Bedingung für `0` keine
    Warnung mehr auslöst. Unter der Mutation fallen drei Zeilen, nicht zwei.
- Ergebnis (2026-08-19, `9d35e13`): Verify selbst gefahren — `pnpm lint` rc=0 (192 Dateien, 2
  vorbestehende `biome.json`-Infos), `pnpm typecheck --force` 3/3, `pnpm test:ci --force` **719** grün
  (384 + 334 + 1), genau ein Fall weniger als nach Paket 5. `pnpm build` lief über
  `dependsOn` mit, e2e planmäßig ausgenommen (keine ausgelieferte Zeile berührt).
- Nebenbefunde: keine neuen aus dem Code. Der einzige Fund ist die oben korrigierte Ungenauigkeit im
  Plantext selbst.
- Schnittstellen: keine. Kein ausgelieferter Code, kein Export, keine Doku — `build.mjs:39` nimmt
  `*.spec.ts` vom Lib-Transpile aus. Dies war das letzte Paket des Laufs.

**TEST-012 · info · packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts:487-506, :508-541** — Ein Spec-Fall in RemoteWorkerEnv.spec.ts ist zum it.each daneben redundant

Der Einzelfall legt den Wert "debug" unter den Storage-Schlüssel — denselben Schlüssel und denselben Wert, den das it.each direkt darunter als vierte Zeile führt. Die Assertion der Tabelle ist die stärkere: sie vergleicht die Worker-Konfiguration gegen eine eigens erhobene Nulllinie, während der Einzelfall nur prüft, dass sich der String nicht in die Konfiguration spreizt. Doppelte Abdeckung ist kein Defekt, aber der Fall kostet einen Env-Start je Lauf und lässt beim Lesen offen, was er zusätzlich belegen soll.

Empfehlung: Den Einzelfall streichen und, falls die Nicht-Spreizung eigens festgehalten werden soll, seine Assertion in die Tabelle heben.

Evidenz (Audit): Vom Reviewer an der Fundstelle festgestellt und bewusst offen gelassen: eine weitere Review-Runde dafür wäre teurer als der Nutzen.

*Der freigegebene Weg ist der des Audits. Der »falls«-Zweig entfällt begründet: die Tabelle prüft die Konfiguration ganz gegen eine Nulllinie und trägt die Nicht-Spreizung damit schon — siehe Schritt 1a und die Gegenprobe 1b.*

### [x] 7. Die Abonnements eines `<shae-ent>` überleben den Abbau seiner Komponente
- Findings: keines — **Folge dieses Laufs**, entstanden mit `c17f6bb` (VIEW-021), in Chromium
  gemessen und im Paket-3-Block dokumentiert.
- Ziel: Ein `<shae-ent>`, dessen `ViewComponent` ein flächiger Abbauweg beendet hat, antwortet nach
  der Wiederbelebung wieder auf Re-Request-Runden und leitet wieder Custom Events weiter — ohne
  dass ein neues Element nötig ist. Beides hängt an derselben Mechanik, beides wird geheilt.
- Bereich: `packages/shadow-objects/src/view/ViewComponent.ts`,
  `packages/shadow-objects/src/elements/ShaeEntElement.ts`,
  `packages/shadow-objects/src/view/ViewComponent.spec.ts`,
  `packages/shadow-objects-testing/test/ent-element-context-clear.test.js`,
  `packages/shadow-objects-testing/test/ent-element-events.test.js`,
  `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/docs/cheat-sheet.md`,
  `packages/shadow-objects/CHANGELOG.md`, `Backlog.md`
- Hängt ab von: Paket 3 (erzeugt die Folge) und Paket 4 (verbreitert sie auf verdrängte Instanzen —
  die Reparatur soll beide Mengen erreichen)
- Modell: stärkste Stufe
- Phase: 3 (Korrektheit) · Reihenfolge: **direkt nach Paket 4**, vor 5 und 6 — Phase 3 geht vor
  Phase 4 und 5, und die Abbaukette ist aus den Paketen 3 und 4 frisch belegt, die Wächter stehen.
- Hash: `c253f05`
- Ergebnis: 1 Review-Runde, angenommen ohne Blocker · Weg **A** von fünf geprüften: `destroy()`
  meldet `ViewComponent.Destroyed` unmittelbar vor `off(this)` (`ViewComponent.ts:307`), das Element
  erneuert **beide** Effekte einen Microtask später (`ShaeEntElement.ts:284` und `:305`, beide über
  `#reSubscribe$`) · sieben neue Fälle, `test:ci` 717 statt 710 · vom Reviewer gegengemessen:
  genau **ein** `off()` auf einer `ViewComponent` im ganzen `src/`, kein Abbauweg an `destroy()`
  vorbei
- **Zwei Funde, die das Paket größer machten, als es aussah:**
  - Der `dispatchEvent`-Patch hing an derselben Mechanik. `destroy()` löscht die Instanz-Eigenschaft
    (`ViewComponent.ts:279-282`), die der zweite Effekt gesetzt hatte — ein `<shae-ent>` mit
    `forward-custom-events` hörte nach flächigem Abbau also auch auf **weiterzuleiten**. Stand in
    keiner Doku, keinem CHANGELOG, keinem Test. Gegenprobe (b) belegt die Trennung: nimmt man nur
    den `get()` aus dem zweiten Effekt, fällt genau der Patch-Fall.
  - Die schlafende Effekt-Aufräumung (`ShaeEntElement.ts:265-275`) war nicht toter, sondern
    **falscher** Code: sie rief `vc.destroy()`, was mit einem Auslöser aus `destroy()` eine
    Microtask-Schleife ergeben hätte. Ersatzlos gefallen, samt dem `ShadowEnv`-Import — dass
    `typecheck` ihn fängt, ist gemessen (`TS6133`). Ihr Sync-Zweig war doppelt gemoppelt,
    `ns$.onChange` (`:220-222`) erledigt das.
- Warum der Microtask Bedingung ist, nicht Schönheitsfehler: `off(this)` läuft synchron hinter dem
  `emit` und nähme ein frisches Abonnement mit; und `clear()` iteriert über `Array.from(...)` — die
  Heilung gehört hinter den Sweep, nicht mitten hinein. Fall 1g hält das Fenster fest.
- Nebenbefunde (alle **fürs nächste Audit**):
  - `ShaeEntElement.ts:658-670` — der `#setParent`-Effekt setzt `vc.parent = parentVC`, wenn
    `parentVC.context === vc.context`. Nach einem `clear()` ohne Wiederbelebung sind **beide
    `undefined`**, die Bedingung greift, und `addChild` wirft `ViewComponentError` aus einem
    Signal-Effekt heraus. Erreichbar über eine DOM-Bewegung nach einem Sweep, kein Test hält es.
  - Das Pending-Gate (`ShaeEntElement.ts:191-205`) ist von außen unbeobachtbar: mit entschärftem
    Gate bleiben alle Tests grün. Es spart einen Effekt-Neulauf je zusätzlichem Abbau im selben
    Task und ändert kein Ergebnis — eine Sparmaßnahme, keine Korrektheitswache. Wer es entfernt,
    merkt es an keinem Test.
  - Die Tabellenzeile `dispatchEvent` im zerstörten Zustand (`api-reference.md:826`,
    `cheat-sheet.md:360`) spricht nur von eventize-Listenern; für den Patch des Elements gilt sie
    nur einen Microtask lang.
  - `ViewComponent.ts:186-188` akzeptiert weiter die undeklarierte Aufrufform
    `new ViewComponent(token, parent)` (offen seit Paket 2).
  - `Backlog.md:216` verweist für VIEW-13 auf `ShaeEntElement.ts:527–536`; die Stelle sitzt
    inzwischen bei `:660-664`. Vorbestehend falsch, durch diesen Lauf weiter verschoben.
- Folgen: keine offenen. Die stale Referenz aus Paket 4 wurde **nicht** angestoßen — Weg A baut
  keine zweite Komponente. `Backlog.md` trägt keinen Punkt mehr aus der Folge von Paket 3.
- Schnittstellen: `ViewComponent.Destroyed = 'view-component-destroyed'` ist **neue öffentliche
  Oberfläche**, additiv, ab jetzt Vertrag — jeder künftige Abbauweg, der `off()` auf einer
  Komponente ruft, ohne durch `destroy()` zu laufen, bricht die Zusage. Der erste Effekt in
  `ShaeEntElement` ist jetzt **wiederholbar**: wer dort eine Aufräumung einbaut, muss mit
  Mehrfachläufen rechnen, und ein `vc.destroy()` an dieser Stelle wäre eine Endlosschleife. Für
  **5 und 6**: keine Berührung, einzige gemeinsame Fläche bleibt `## [Unreleased]`.

## Abschluss (2026-08-19)

- **Voller Verify auf dem übergebenen Baum**: `pnpm lint` rc=0 (192 Dateien, 2 vorbestehende
  `biome.json`-Infos) · `pnpm typecheck --force` 3/3 · `pnpm test:ci --force` **719** grün
  (384 + 334 + 1, Baseline 688) · `pnpm build --force` 3/3 · `pnpm -F shadow-objects-e2e test`
  **402** grün (Baseline 402). Nichts, was vor dem Lauf grün war, ist rot.
- **Semver**: Der Lauf enthält drei Brüche (`c17f6bb`, `375edce`, `9d07a86`). Unter `1.0.0` hebt das
  die Minor-Stelle, `0.33.0` → `0.34.0` — genau das, was der `[Unreleased]`-Block des
  Paket-CHANGELOGs bereits ausweist und was Paket 5 dort auf Stand gehalten hat. Die Version in
  `package.json` bleibt auf `0.33.0`: das Projekt hebt sie in eigenen Release-Commits
  (`chore: release v0.32.0`), und ein Release ist keine Entscheidung dieses Laufs.
- **CHANGELOG**: Jedes Paket hat seinen Eintrag im Zug seiner Umsetzung geschrieben und der jeweilige
  Reviewer ihn geprüft. Paket 1 ging ins Wurzel-CHANGELOG (Testkonfiguration), Paket 6 begründet in
  keines (keine ausgelieferte Zeile, `build.mjs:39` nimmt `*.spec.ts` vom Lib-Transpile aus).
- **`view-layer-audit.html` nachgeführt**: alle sieben Findings geschlossen (je Reviewer-Urteil mit
  Fundstelle plus Commit-Hash), `resolvedCount` 27 → 34, neun neue Findings mit Fundstelle eingetragen
  (`VIEW-023` … `VIEW-030`, `TEST-014`), keine geschlossene Nummer neu vergeben. Score **98,5 → 98,5**:
  drei `low` gingen, drei `low` kamen — gleicher Abzug nach der Formel der Methodik-Sektion, anderer
  Inhalt. `scoreHistory` trägt den Eintrag mit `source: "remediation"`. Die JSON-Insel wurde nach der
  Änderung geparst, die Seite in echtem Chromium geladen (keine `pageerror`, 9 Tabellenzeilen).
  Gestaltung unangetastet.
- **`Backlog.md` synchronisiert**: der Zeilenverweis für VIEW-13 zeigte auf `ShaeEntElement.ts:527–536`
  und damit ins Leere; er steht jetzt auf `:665–667` (der Microtask in `#setParent`) mit der Methode bei
  `:627–635`. Dazu der `trailingNewline`-Befund unter 5.4, der bis dahin nirgends stand: `biome.json:40`
  führt `"trailingNewline": false`, dokumentiert war es nicht, und `*audit*.html` ist davon ausgenommen
  (`:30`).
- **Nicht in die `audit.html` gewandert** (begründet, damit der Folgeaudit sie nicht für vergessen hält):
  zwei Nebenbefunde ohne Datei+Zeile (Kompaktierung von `#hostedSlots`, die `dist/`-Auflösung des
  Integrationspakets) und vier Befunde außerhalb des Prüfumfangs dieser Datei — der
  `trailingNewline`-Punkt und der `Backlog.md`-Zeilenverweis, beide oben erledigt, sowie zwei
  Doku-Befunde zum zerstörten Zustand (`api-reference.md:818`, `:826` / `cheat-sheet.md:360`). Die
  Methodik-Sektion der `audit.html` nennt sie namentlich.
- **Gegenstandslos**: der Nebenbefund aus Paket 3 zur schlafenden Effekt-Aufräumung
  (`ShaeEntElement.ts:265-274`) — Paket 7 hat den Code ersatzlos gestrichen.