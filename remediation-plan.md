# Remediation-Plan — shadow-objects

Quelle: ./audit.html vom 2026-08-21 · Branch: main · erstellt: 2026-08-21
Baseline: `pnpm lint` ✓ (1 info: Biome-Config-Migrationshinweis, vorbestehend) ·
`pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test:ci --force` ✓ 1078 Fälle (632
shadow-objects, 101 shae-offscreen-canvas, 345 shadow-objects-testing) ·
`pnpm -F shadow-objects-e2e test` ✓ 426 Fälle
Scope: 14 von 65 Findings — alle mit `BUG-`-Kennung (1 high, 2 medium, 11 low) ·
ausgenommen: die übrigen 51 Findings aller anderen Kennungen · `acknowledged` ist leer
Stand (2026-08-21): **Lauf abgeschlossen.** Zehn Pakete, zehn Commits auf
`main`: 1 (`d5b0259`), 2 (`5f0a7d2`), 3 (`41f5698`), 4 (`502e6cc`), 5
(`a62c1ac`), 6 (`91bdb2f`), 7 (`496f23d`), 8 (`18461a8`), 9 (`8192f5a`), 10
(`56aa9da`), dazu der Ausgangs-Commit `016cc85` und der Abschluss-Commit.
Nichts blockiert, nichts gestasht. Alle vierzehn Findings des Scopes sind
geschlossen.

Verify auf `HEAD`, vom Orchestrator selbst gefahren: `pnpm lint` ✓ (der eine
bekannte Biome-Hinweis aus der Baseline) · `pnpm typecheck` ✓ · `pnpm build` ✓ ·
`pnpm test:ci --force` ✓ 1190 Fälle (738 shadow-objects, 102
shae-offscreen-canvas, 350 shadow-objects-testing) · `pnpm -F shadow-objects-e2e
test` ✓ 428 Fälle in Chromium und Firefox. Gegen die Baseline: 112 Fälle mehr
und 2 E2E-Fälle mehr, keiner verschwunden.

Semver: keine Versionsanhebung. Beide Pakete führen ihre Änderungen unter
`## [Unreleased]` und heben die Nummer erst beim Release. Der Vorspann des
Kern-CHANGELOG bewertet den nächsten Release als minor (`0.33.0` → `0.34.0`)
und zählt einundvierzig Klauseln, die bestehende Konsumenten erreichen — die
Zählung ist gegen die Regel der Datei nachgerechnet. Für
`@spearwolf/shae-offscreen-canvas` steht die Bewertung ebenfalls schon
(`0.6.0` → `0.7.0`, aus einem vorbestehenden Breaking Change); die Änderung
dieses Laufs an `ThreeRenderView` ändert daran nichts. Unter `1.0.0` hebt jede
Zahl brechender Änderungen dieselbe Stelle.

`./audit.html` ist nachgeführt: Score 65 → 76, Code-Bereich 74 → 85,
Projekt-Harness unverändert 91. Vierzehn Findings geschlossen, zwölf neu
eingetragen. Die Datei ist nicht neu geprüft worden, sondern neu gerechnet —
das steht so in ihrer Methodik-Sektion, zusammen mit dem einen Punkt, der
mangels Reviewer-Urteil offen bleibt (`CONS-004`).

`./remediation-plan.md` ist seit dem Abschluss des vorigen Laufs versioniert.
Er bleibt es und wird trotzdem aus jedem Paket-Commit herausgehalten — Adds
laufen über explizite Pfade, Diffs über `':(exclude)remediation-plan.md'`. Der
Abschluss-Commit nimmt seinen Stand mit.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

## Scope-Abgrenzung

Der Nutzer hat »alle Issues mit BUG-* id« beauftragt. Das sind genau die 14
Befunde der Kategorie »Bugs & Korrektheitsrisiken« mit `BUG-`-Kennung: BUG-002
bis BUG-009, BUG-011 bis BUG-016. Kein Severity-Filter — die elf `low` sind
ausdrücklich mitbeauftragt.

Draußen bleiben die 51 Befunde der übrigen Kennungen (CONS, DEP, PERF, TEST,
ASYNC, BUILD, CLEAN, DX, MEM, TYPE, API, SEC) — nicht erledigt, sondern nicht
beauftragt. Der Report erwartete, dass CONS-003 bis CONS-005 mit dem Wächter aus
Paket 5 nebenbei wegfallen. Zug 0 von Paket 5 hat das an den Fundstellen
nachgemessen: **einer** fällt (CONS-004), zwei bleiben (CONS-003, CONS-005), und
API-001 bleibt ebenfalls. Die Begründungen stehen je einzeln im Block zu Paket 5
unter »Nebenwirkung auf Findings außerhalb des Scopes«. Gebucht wird auch das
erst beim Abschluss.

Was dieser Lauf an Folgen erzeugt, gehört dazu: zieht ein Fix anderswo etwas
nach sich, wird es hier mit behoben, notfalls in zusätzlichen Paketen.

Paket 9 trägt keine Finding-Kennung und ist auch keine Folge dieses Laufs,
sondern der offene Rest der Entscheidung zu BUG-015: »Ein Wurf aus `onDestroy`
kostet die Geschwister derselben Entity ihren Teardown nicht.« Paket 1 hat das
für den `[onDestroy]`-Hook und die Benachrichtigung je Shadow Object eingelöst;
der `tearDown()` der Creation Scopes — Signale, Effekte, Kontext-Zuflüsse —
hängt weiterhin an einer gemeinsamen Zustellung. Damit steht es innerhalb des
Beauftragten, nicht daneben.

## Entscheidungen

- **BUG-002 — eine uuid gehört genau einer Komponente** (2026-08-21):
  `addComponent()` bekommt einen Wächter, der eine bereits vergebene uuid
  ablehnt. Die Zählerpaare in `ComponentChanges` bleiben uuid-basiert; der Fall
  eines Namensvetters entsteht gar nicht erst. Verhaltensänderung an der
  View-Seite mit Changelog-Eintrag: eine handgebaute Komponente mit belegter
  uuid wirft künftig, statt still eine zweite Entity zu erzeugen.
- **BUG-015 und BUG-013 — werfende Lebenszyklus-Hooks werden isoliert**
  (2026-08-21): Ein Wurf aus `onDestroy` kostet die Geschwister derselben Entity
  ihren Teardown nicht — die Zustellung geht je Shadow Object einzeln statt über
  ein gemeinsames `emit()`, der Fehler an den Logger, die Buchführung des
  Kernels läuft in einem `finally` zu Ende. Ein werfendes `onCreate` reißt das
  gerade erzeugte Shadow Object mit: der `try` in `constructShadowObject()`
  umfasst dann auch `attachShadowObject()`. Damit hat dieselbe Ursache einen
  Ausgang statt zweier — den, den `destroyShadowObject()` heute schon nimmt.
- **BUG-012 — ein gescheiterter Tokenwechsel wird zurückgerollt** (2026-08-21):
  `updateShadowObjects()` stellt den alten Token wieder her und erzeugt die
  abgebauten Shadow Objects des alten Tokens neu, bevor der Fehler nach oben
  geht. Analog zum Aufräumpfad, den die Erzeugung seit `1a092c0` hat. Eine
  Entity steht danach nie mit einem Token da, zu dem ihr die Shadow Objects
  fehlen.
- **Paket 9 — Nachlauf hinter dem `emit`, keine Umstellung der Zustellung**
  (2026-08-21): Die Lücke, die ein werfender fremder Hörer am `onDestroy` einer
  Entity reißt, wird hinter dem abgesicherten `emit` geschlossen: ein Nachlauf
  über den vorhandenen Schnappschuss ruft `tearDown()` je Creation Scope und
  danach den Aufräumlauf der Entity, jeder in eigener Absicherung. Die
  Anmeldungen an der Entity bleiben, die beobachtbare Zustellreihenfolge bleibt
  Zeichen für Zeichen dieselbe, und kein bestehender Fall fällt — beide Wege
  waren prototypisch gebaut und gemessen. Der strukturell sauberere Weg (Scopes
  und Entity ganz aus dem `emit` nehmen) kostet drei Quelldateien, einen sachlich
  fallenden Fall und eine verschobene Zusage an einer öffentlichen
  Lebenszyklus-API; er bleibt jederzeit später möglich, weil dieser Weg ihn nicht
  verstellt.
- **Die Ablehnung eines Change Trails sagt, was der Kernel hält** (2026-08-21):
  Nach einem abgelehnten Trail laufen View und Kernel auseinander — der Kernel
  hat zurückgenommen, die View führt das Geschriebene als angewandt und sendet
  es nie erneut. Die Klasse ist vorbestehend (eine gescheiterte `createEntity`
  seit `1a092c0` zeigt dasselbe Muster); die Rücknahme des Tokenwechsels aus
  Paket 2 fügt einen weiteren Fall hinzu. Gewählt ist die Protokollerweiterung:
  `AppliedChangeTrail` trägt in der Ablehnung mit, was der Kernel tatsächlich
  angewandt hat, und `ShadowEnv` gleicht seine Buchführung daran ab. Der einzige
  Weg ohne Rateanteil — die View allein weiß nicht, welche Einträge des Trails
  vor dem Wurf durchkamen. Wird Paket 10, öffentliche API und Doku ziehen mit.
- **BUG-004 — der Slot-Watch wird beim Connect eingesammelt** (2026-08-21): Die
  dokumentierte Grenze fällt. `connectedCallback()` sammelt die Slots unterhalb
  der Entity ein (`querySelectorAll('slot')` plus Nähetest), sodass ein Host,
  der aus- und wieder eingehängt wird, seinen Watch zurückbekommt. Der heutige
  Testfall, der die Grenze festhält, wird umgeschrieben — nicht gelöscht — und
  die Dokumentationsstelle, die sie beschreibt, zieht mit.

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

Keine. Die Baseline ist auf allen vier Kommandos grün; der eine `info` aus
`pnpm lint` ist der Biome-Migrationshinweis zur Konfiguration und blockiert
nichts.

## Ausgangs-Commit

Der Arbeitsbaum trug zu Beginn eine geänderte `audit.html` — den Report des
frischen Audit-Laufs vom 2026-08-21, der die Grundlage dieses Laufs ist. Er ist
vor Paket 1 als eigener Commit gebucht, damit die Paket-Commits ihn nicht
mitschleppen. Hash: `016cc85`

## Pakete

### [x] 1. Der Abbau einer Entity läuft zu Ende, was immer ein Hook wirft
- Findings: BUG-015 (high)
- Ziel: `destroyEntity()` räumt seine Buchführung und benachrichtigt jedes
  Shadow Object der Entity, auch wenn ein Teardown wirft.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.ts`
- Hängt ab von: —
- Modell: stärkste Stufe
- Hash: `d5b0259`
- Ergebnis: 1 Runde plus eine Doku-Korrektur · BUG-015 behoben, vom Reviewer
  durch Zurückdrehen des Fixes gegengeprüft · neun Regressionsfälle, je mit
  eigener Gegenprobe: vier für den Abbau der Entity, vier für den Tokenwechsel,
  einer für die Reihenfolge der drei Hörergruppen
- Nebenbefunde: `Kernel.ts:383` — das verbliebene
  `emit(entity, onDestroy, entity)` endet weiterhin beim ersten werfenden Hörer.
  Ein Rückruf, den ein Shadow Object über die Creation API mit
  `on(onDestroy, …)` anmeldet, hängt ohne eigene Priorität an der Entity und
  läuft damit vor `Priority.Low` und `Priority.Min`; wirft er, bekommen die
  Creation Scopes ihren `tearDown()` nicht und die Entity nicht ihren eigenen
  Aufräumlauf, sodass Signale und Effekte der Scopes stehen bleiben. Die
  Buchführung räumt in jedem Fall, der Wurf erreicht den Aufrufer nicht, und die
  Grenze steht in `CHANGELOG.md` und `docs/api-reference.md:399`. Vorbestehend
  und strikt besser als vorher, aber derselbe Mechanismus. Das Urteil des
  Reviewers: gehört auf die Liste von Paket 2, weil das Schließen
  `ShadowObjectCreationScope.ts` anfassen muss — dort arbeitet Paket 2 ohnehin.
  Zug 0 von Paket 2 entscheidet.
- Schnittstellen: keine. `destroyEntity()` und `destroyShadowObject()` behalten
  ihre Signatur. Verhaltensänderung ohne Signaturänderung: `destroyEntity()`
  gibt einen Fehler aus einem Lebenszyklus-Hook nicht mehr an seinen Aufrufer
  weiter, sondern an den Logger.

### [x] 2. Erzeugung und Tokenwechsel geben nichts Halbes ab
- Findings: BUG-013 (low), BUG-012 (medium), BUG-011 (low)
- Ziel: Ein Wurf im Konstruktionspfad hinterlässt weder ein halb angebundenes
  Shadow Object noch eine Entity mit neuem Token und fehlenden Shadow Objects,
  und ein Creation Scope bedient genau ein Shadow Object.
- Bereich: `Kernel.ts`, `ShadowObjectCreationScope.ts`
- Hängt ab von: Paket 1
- Modell: stärkste Stufe
- Hash: `5f0a7d2`
- Ergebnis: 1 Runde plus eine Doku-Korrektur · BUG-013, BUG-012 und BUG-011
  behoben, je mit eigener Gegenprobe vom Reviewer nachgefahren · 15
  Regressionsfälle, 12 davon vor dem Fix rot gesehen · fünf Abweichungen vom
  Detailplan, alle geprüft und tragend — die wichtigste: drei geplante Fälle
  wären auf dem Erzeugungsweg auch ohne Wächter grün gewesen, weil die
  Entity-Rücknahme aus Paket 1 dort ohnehin abräumt; sie liegen jetzt auf dem
  Tokenwechsel-Weg, wo sie unterscheiden
- Nebenbefunde: `ShadowObjectCreationScope.ts:99` gegenüber `:228` — `tearDown()`
  setzt `#isTornDown`, räumt aber `#shadowObject`, `#releaseScope` und
  `#forgetShadowObject` nicht ab. Ein abgebauter Scope hält seine Referenz auf
  das Shadow Object, solange ihn etwas erreicht. Heute folgenlos, weil der
  Kernel den Scope zu Beginn des Abbaus aus `#shadowObjectScopes` nimmt — und
  zugleich der Grund, warum die beiden Wächter in `bindTo()` nicht anders herum
  stehen können. Vorbestehend.
  - Triage (2026-08-21, Zug 0 von Paket 3): **bleibt liegen**, verlässt den Lauf.
    »Vorbestehend« nachgesehen statt vermutet:
    `016cc85:packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`
    trägt bei `:209-211` dasselbe `tearDown()`, das `#isTornDown` setzt und die
    drei Handles (`:99-101`) stehen lässt. Drei Gründe: kein `BUG-`-Finding
    deckt ihn, er fällt also nicht unter den Auftrag; Paket 2 hat ihn selbst als
    heute folgenlos ausgewiesen, weil der Kernel den Scope vor dem Abbau aus
    `#shadowObjectScopes` nimmt; und die Referenzen wegzuräumen nähme genau die
    Reihenfolgengarantie weg, auf der die beiden neuen Wächter in `bindTo()`
    stehen — ein Umbau, der Paket 2 nachträglich anfasst, für einen Zustand ohne
    beobachtbare Wirkung. Gehört beim Abschluss in den `Backlog.md`, nicht in
    ein Paket dieses Laufs.
- Folgen: View und Kernel laufen nach einem abgelehnten Change Trail
  auseinander — als Paket 10 geschnitten, Nutzerentscheidung vom 2026-08-21.
- Schnittstellen: keine Signaturänderung nach außen. `changeToken()` reicht
  intern `previousToken` an `updateShadowObjects()` durch; neu ist die private
  `#rollbackFailedShadowObjectUpdate()` in `Kernel.ts`.
  `ShadowObjectCreationScope.bindTo()` wirft jetzt bei einem zweiten Aufruf und
  bei einem Aufruf nach dem Teardown.

### [x] 3. Die Buchführung des Kernels kennt jeden Weg, der die Struktur ändert
- Findings: BUG-016 (medium), BUG-009 (low)
- Ziel: Der Cache der Baumdurchquerung und die Menge der Wurzel-Entities stimmen
  auch dann, wenn ein Shadow Object die öffentlichen Wege benutzt — die des
  Kernels wie die der Entity.
- Bereich: `Kernel.ts`, `Entity.ts`
- Hängt ab von: —
- Modell: stärkste Stufe
- Hash: `41f5698`
- Ergebnis: 1 Runde plus eine Wortkorrektur · BUG-016 und BUG-009 behoben, vom
  Reviewer durch Zurückdrehen der Quelle gegengeprüft (12 von 13 Fällen rot) ·
  13 neue Fälle, der dreizehnte ausdrücklich als Charakterisierung geführt ·
  Meldewege je einzeln neutralisiert und den fallenden Fällen zugeordnet · der
  Report beschrieb nur die eine Richtung; die Gegenrichtung — eine Entity, die
  ihren Elternteil verliert und in keiner Liste landet — ist mitbehoben
- Nebenbefunde: keine offenen. `Entity.removeChild()` und
  `Entity.resortChildren()` waren gemeldet, gehörten aber in diesen Umbau und
  sind eingelöst.
- Schnittstellen: **neu und öffentlich** — `Kernel.noteEntityTreeChange(uuid)`.
  Eine Entity meldet damit, dass sie ihren Platz im Entity Tree geändert hat;
  der Kernel verwirft den Cache der Durchquerung und pflegt die Wurzelmenge in
  beiden Richtungen. Nimmt eine uuid, liest den Zustand von der Entity ab und
  bleibt bei einer unbekannten uuid still — anders als `setParent()` und
  `updateOrder()`, die daran werfen; die Begründung steht im JSDoc.
  `Kernel.parse()` setzt das Cache-Flag nicht mehr selbst.

### [x] 4. Entity: eine Antwort je Frage
- Findings: BUG-007 (low), BUG-008 (low)
- Ziel: Der herausgereichte Schreibkopf verwirft den Cache wie `setProperty()`,
  und die Elternkante wird an einer Stelle gehalten statt an zweien.
- Bereich: `packages/shadow-objects/src/in-the-dark/Entity.ts`
- Hängt ab von: Paket 3
- Modell: mittlere Stufe
- Hash: `502e6cc`
- Ergebnis: 3 Runden · BUG-007 und BUG-008 behoben, vom Reviewer je durch
  Zurückdrehen gegengeprüft · drei rote Regressionsfälle plus fünf ausdrücklich
  als Verhaltensabdeckung geführte Fälle · zwei Korrekturen, die über den Plan
  hinausgingen und ihn verbesserten: der Vorbehalt des Implementierers zu den
  signalize-Helfern war falsch (sie erkannten den rohen Schreibkopf nie —
  gemessen gegen 1.0.0-beta.0), und nach der Umstellung von `hasParent` auf
  `#parent` war `#parentUuid` als Feld überflüssig. Es ist entfernt; die halbe
  Kante ist nicht mehr darstellbar statt nur per Kommentar verboten. Der
  Nachweis, dass es keinen dritten Leser gab, lief über das ganze Repo, die
  Verhaltensgleichheit ist differentiell gegen eine rekonstruierte Feld-Fassung
  gemessen.
- Nebenbefunde: `Kernel.ts:361` — `entity.removeFromParent()` steht in
  `destroyEntity()` in einem `try` ohne eigenen `catch`. Vorbestehend
  (nachgesehen in `016cc85`), von keinem `BUG-`-Finding gedeckt, und seit der
  gestrichenen Lazy-Auflösung kann der dort denkbare Wurf nicht mehr entstehen.
  Beim Abschluss in den Backlog.
- Schnittstellen: keine Signaturänderung. `Entity.getPropertyWriter(key)` gibt
  einen Schreibkopf heraus, der vor jedem Schreiben den `truthyProps`-Cache
  verwirft; der Rückgabetyp bleibt `SignalWriter<T>`, und die signalize-Helfer
  für Signal-Likes erkannten ihn nie — weder vorher noch jetzt. Das private Feld
  `#parentUuid` gibt es nicht mehr; `parentUuid` und `hasParent` leiten aus
  `#parent` ab. Öffentliches Verhalten unverändert.

### [x] 5. Eine uuid gehört genau einer Komponente
- Findings: BUG-002 (low)
- Ziel: Ein zweiter Anspruch auf eine vergebene uuid wird abgelehnt, statt eine
  Entity zu hinterlassen, die niemand mehr abbaut.
- Bereich: `packages/shadow-objects/src/view/`
- Hängt ab von: —
- Modell: stärkste Stufe
- Hash: `a62c1ac`
- Ergebnis: 2 Runden · BUG-002 behoben · sechs rote Regressionsfälle, dazu
  Fälle, die den zugesagten Wiederverwendungsfall und die Instanz-Menge halten ·
  acht bestehende Fälle umgeschrieben statt gelöscht · zwei Funde aus dem
  Review, die über den Wächter hinausgingen: die vom Implementierer behauptete
  Invariante hielt nicht (ein `Destroyed`-Hörer konnte während
  `#removeSubTree()` wieder beitreten und zwei lebende Instanzen auf einer uuid
  herstellen) — der Pfad ist geschlossen, indem der Eintrag jetzt vor dem
  Teardown fällt; und die neu formulierte Sweep-Zusage hatte keinen einzigen
  Test, jetzt hat sie zwei. Der Reviewer hat die Umstellung mit sieben Sonden
  differentiell gegen beide Reihenfolgen gemessen (Zyklus, quer eingehängtes
  Kind, Diamant, Teilbaum, vor dem ersten Trail, Wiedereintritt): einzige
  Abweichung ist der Bruchfall selbst.
- Nebenwirkung auf Findings außerhalb des Scopes, gemessen statt vermutet: der
  Report erwartete drei Mitläufer. **CONS-004 ist gegenstandslos.** CONS-003
  bleibt (`hasComponent()` lügt schon ohne Kollision, weil der Eintrag den
  Abbau bis zum nächsten Change Trail überlebt), CONS-005 bleibt (die
  Asymmetrie greift über den direkten `removeFromParent`-Aufruf), API-001
  bleibt (Ringe entstehen weiter über `addToChildren()`). Beim Abschluss zu
  buchen.
- Nebenbefunde: `ComponentContext.ts` `changeOrder()` — der Wächter prüft nur
  `entry === undefined`; ein direkter Aufruf mit einer ausgeschiedenen Instanz,
  deren uuid ein Nachfolger hält, schreibt auf dessen Eintrag. Dieselbe
  Asymmetrie, die CONS-005 für `removeFromParent`/`moveToRoot` ausweist —
  `changeOrder` fehlt dort. Vorbestehend. · Die Kinder-Schleife in
  `addComponent()` ist nach dem Wächter praktisch tot und steht als Netz.
- Schnittstellen: **neu und öffentlich** — `ComponentUuidInUseError` (`name`,
  `readonly uuid`), exportiert über `src/index.ts`. `ViewComponent`s
  `context`-Setter und `ComponentContext.addComponent()` werfen ihn, wenn der
  bisherige Halter den `ComponentContext` noch nennt; beide TSDocs führen ihn,
  und er steht in den emittierten Deklarationen. `ComponentContext.clear()` und
  `dispose()` erreichen jede beigetretene Komponente, die den
  `ComponentContext` nicht wieder verlassen hat — nicht eine je Eintrag.
  `removeSubTree()` löscht den Eintrag vor dem Teardown.

### [x] 6. Das Entity-Element übersteht Abbau und Wiedereinhängen
- Findings: BUG-003 (low), BUG-004 (low)
- Ziel: Der Eltern-Effekt wirft nicht mehr aus einem Signal-Effekt heraus, und
  ein Shadow-Host bekommt seinen Slot-Watch beim Wiedereinhängen zurück.
- Bereich: `packages/shadow-objects/src/elements/ShaeEntElement.ts`
- Hängt ab von: —
- Modell: stärkste Stufe
- Hash: `91bdb2f`
- Ergebnis: 3 Runden · BUG-003 und BUG-004 behoben, beide Gegenproben vom
  Reviewer selbst reproduziert (nur Effekt-Fix zurück → 1 rot; Einsammeln
  abgeklemmt → 3 rot) · vier unterscheidende Fälle, drei weitere ausdrücklich
  als Verhaltensabdeckung geführt, alle im Browser-Modus, weil happy-dom
  Slot-Zuweisung über eine Shadow-Grenze nicht abbildet · der Nähetest ist
  derselbe für beide Kanäle (`#isClosestEntAbove`), sodass Einsammeln und
  `slotchange` dieselbe Antwort geben — vom Reviewer mit eigenen Sonden geprüft,
  auch für eine später upgegradete innere Entity · Doppelaufnahme und
  Mehrfach-Connect gemessen folgenlos · die Entwurfsentscheidung, beim Connect
  keine dokumentweite Neuanfrage loszuschicken, ist durchgehalten und wird von
  einem Fall bewacht (injizierter Broadcast macht ihn rot) · Laufzeit gemessen:
  600 Geschwister, Median 86,4 ms mit gegen 89,3 ms ohne — kein Aufschlag
- Nebenbefunde: `ShaeEntElement.ts:376` — `#applyComponentContext` schreibt
  `vc.context = context` aus einem Signal-Effekt heraus; der Setter wirft seit
  Paket 5 neben `ComponentContextDisposedError` auch `ComponentUuidInUseError`,
  und beide Aufrufstellen fangen nichts. Dasselbe Muster wie der behobene
  Effekt, für eine Element-Komponente aber nur erreichbar, wenn Anwendungscode
  eine zweite `ViewComponent` mit genau dieser uuid baut — die uuid des Elements
  kommt aus `generateUUID()`. Vorbestehend im Muster, im Wurf neu seit `a62c1ac`.
  Beim Abschluss in den Backlog. · `Backlog.md:276` — das Inventar nennt für die
  Kern-Suite 632 Fälle, es sind 688. Vorbestehend stehengeblieben.
- Schnittstellen: keine öffentliche Signatur geändert. Verhaltensänderung: eine
  Entity nimmt die `<slot>`-Elemente unter sich beim Eintritt in den Baum auf,
  nicht erst wenn einer eine Zuweisung meldet. Die dokumentierte Grenze zum
  Rundlauf eines Shadow-Hosts entfällt in `docs/api-reference.md`,
  `docs/cheat-sheet.md` und `Backlog.md`.

### [x] 7. Zwei ungeprüfte Zugriffe in den Utilities
- Findings: BUG-005 (low), BUG-006 (low)
- Ziel: `toUrlString()` sagt, was es braucht, und `waitForMessageOfType()`
  prüft die Nachricht wie die beiden anderen Leser desselben Kanals.
- Bereich: `packages/shadow-objects/src/utils/`
- Hängt ab von: —
- Modell: mittlere Stufe
- Hash: `496f23d`
- Ergebnis: 1 Durchgang, Review ohne Befund · BUG-005 und BUG-006 behoben ·
  sieben Fälle in zwei Spec-Dateien, die es vorher nicht gab; genau einer
  unterscheidet und ist rot gesehen, die sechs anderen sind ausdrücklich als
  Charakterisierung geführt · für BUG-005 ist der zweitgenannte Weg der
  Empfehlung gewählt: kein ausgelieferter Einstiegspunkt erreicht einen Realm
  ohne `location` — die `exports`-Map hat keine Wildcard, alle drei Aufrufer
  laufen im Dokument oder im Worker, und beide haben `location`. Ein `?.` hätte
  absoluten und `data:`-URLs in Node stillschweigend eine Zusage gegeben, die
  niemand beauftragt hat. Der Reviewer hat die Begründung selbst nachgeprüft.
- Nebenbefunde: keine.
- Schnittstellen: keine Signaturänderung, keine neue Datei unter `dist/` — die
  Dateiliste ist vor und nach dem Paket identisch. Neue Modulkante
  `utils/waitForMessageOfType.ts` → `worker/MessageRouter.js` für
  `isReadableMessageData`; zyklusfrei, `MessageRouter.ts` ist beim Import
  nebenwirkungsfrei, und der Zielbaum lag über `view/LocalShadowObjectEnv.ts`
  ohnehin im Hauptgraphen.

### [x] 8. Der Abbau einer ThreeRenderView kostet keine überzählige Ansicht
- Findings: BUG-014 (low)
- Ziel: `createView` und `destroyView` laufen je einmal statt je zweimal.
- Bereich: `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js`
- Hängt ab von: —
- Modell: mittlere Stufe
- Hash: `18461a8`
- Ergebnis: 1 Runde plus eine Changelog-Kürzung · BUG-014 behoben, Gegenprobe
  vom Reviewer selbst gefahren (Abbau-Zeilen wieder eingesetzt → exakt zwei
  Fälle rot, zwölf grün) · der Wächter, der das falsche Verhalten als
  »Measured, not endorsed« festhielt, hält jetzt das richtige; sein Kommentar
  hatte die Reihenfolge falsch herum und ist mitgezogen · ein zweiter Weg, den
  der Report nicht nennt, ist mit abgedeckt: der Tokenwechsel zeigt dieselbe
  Doppelung und hat jetzt einen eigenen Fall · geprüft, dass die Ansicht auf
  beiden Wegen sicher zurückgegeben wird — das Effekt-Cleanup hält sie in seiner
  Closure und braucht weder Signal noch Kontext
- Nebenbefunde: keine.
- Schnittstellen: keine. Der Konstruktor von `ThreeRenderView` nimmt `onDestroy`
  nicht mehr aus der Creation API entgegen — eine Innenangelegenheit, kein
  anderer Ort im Repo ruft ihn direkt.

### [x] 9. Der Abbau einer Entity hängt nicht an einem fremden Hörer
- Findings: keiner. Vorbestehender Defekt, aus den `Nebenbefunde:` von Paket 1
  hierher triagiert und im Lauf gehalten, statt ins nächste Audit zu wandern.
- Ziel: Ein werfender Hörer an der Entity kostet keinen Creation Scope seinen
  `tearDown()` und die Entity nicht ihren eigenen Aufräumlauf.
- Bereich: `Kernel.ts` (`destroyEntity`), `Entity.ts`
- Hängt ab von: —
- Modell: stärkste Stufe
- Hash: `8192f5a`
- Ergebnis: 2 Runden · Lücke für **beide** Hörergruppen geschlossen — der
  Report von Paket 1 nannte nur den Creation-API-Weg, ein Hörer auf
  `Priority.Max` (dort meldet sich die Auto-Destruktion eines Kindes an) reißt
  dieselbe · vier unterscheidende Fälle rot gesehen, zwei als Charakterisierung
  geführt · die Bedingung der Nutzerentscheidung ist gemessen eingehalten: eine
  Sonde über fünf Prioritätsstufen liefert auf beiden Ständen eine
  byte-identische Zustellfolge · der Nachlauf läuft unbedingt statt nur im
  `catch`, weil eine Zustellung auch ohne Wurf vorzeitig enden kann; die
  Doppelläufe sind gefahrlos, beide Einmaligkeits-Riegel verifiziert · für den
  Aufräumlauf der Entity ist eine Flagge gesetzt statt eines Falls, weil der
  zweite Aufruf damit der Normalfall jedes Abbaus wird
- Nebenbefunde: `Entity.ts:213-241` — der Aufräumlauf ist das einzige
  mehrstufige Teardown dieser Kette ohne Absicherung je Schritt; wirft eine
  Stufe, bleiben die dahinter dauerhaft liegen, und die neue Flagge verhindert
  einen zweiten Anlauf. Keine Regression, jetzt an der Stelle dokumentiert statt
  still. Vorbild wäre `ShadowObjectCreationScope.tearDown()`; dagegen steht,
  dass Einzelabsicherung aus `entity[onDestroy]()` eine Methode machte, die nie
  wirft — eine eigene Zusage mit eigener Doku-Folge. · Ein Hörer auf genau
  `Priority.Min` wird nie zugestellt: die Entity meldet sich dort als erste an
  (`Entity.ts:175`) und ihr `off(this)` nimmt jeden Nachfolger bei Gleichstand
  ab. Vorbestehend, untestiert; die Doku legt die Gegenannahme nicht mehr nahe.
  · `Kernel.ts:361` — `entity.removeFromParent()` steht ungesichert im selben
  `try`; ein Wurf von dort überspringt Benachrichtigung, `emit` und Nachlauf
  gleichermaßen. Vorbestehend. Alle drei beim Abschluss in den `Backlog.md`.
- Schnittstellen: keine Signaturänderung. Verhaltensänderung an einer
  erreichbaren Stelle: `entity[onDestroy]()` läuft genau einmal, ein
  wiederholter Aufruf tut nichts. Die Ausnahme, die
  `docs/api-reference.md:401` beschrieb, entfällt; die `destroyEntity`-Zeile der
  Kernel-Tabelle trägt die neue Zusage selbst.

### [x] 10. Die Ablehnung eines Change Trails sagt, was der Kernel hält
- Findings: keiner. Folge dieses Laufs aus Paket 2, gebunden an die
  Nutzerentscheidung vom 2026-08-21.
- Folge von: Paket 2
- Ziel: Nach einem abgelehnten Change Trail wissen View und Kernel dasselbe
  darüber, was angewandt ist.
- Bereich: `worker/MessageRouter.ts`, `view/ShadowEnv.ts`,
  `view/ComponentChanges.ts`, `view/ComponentContext.ts`,
  `view/RemoteWorkerEnv.ts`, `IShadowObjectEnvProxy.ts`
- Hängt ab von: Paket 2
- Modell: stärkste Stufe
- Hash: `56aa9da`
- Ergebnis: 2 Runden · Divergenz geschlossen, vom Reviewer gegengeprüft, indem
  er `appliedCount` auf die volle Trail-Länge setzte — der E2E-Zeuge wird rot ·
  36 neue Fälle · der Entwurf kommt mit einer einzigen Zahl aus, weil
  `Kernel.run()` beim ersten Wurf abbricht und der Kernel damit immer einen
  zusammenhängenden Präfix hält; eine Liste hätte die Einträge zurückgeschickt,
  deren transferierte Puffer ohnehin nicht mehr zu haben sind · sechs
  Abweichungen vom Detailplan, zwei davon korrigieren seinen Entwurf
- Was die Review gefunden hat und der Lauf noch geschlossen hat: das
  Auseinanderziehen von Bau und Commit öffnet ein Fenster von der Breite einer
  Worker-Rundreise, und zwei Entscheidungen saßen darin am falschen Ende. Eine
  im Fenster zerstörte Komponente verlor ihr `DestroyEntities` dauerhaft, weil
  das Urteil über ausscheidende Komponenten beim Commit statt beim Bau fiel —
  der Kernel hätte die Entity für immer behalten. Und eine Rücknahme auf den
  zuletzt bestätigten Wert wurde verschluckt, weil die vier Diff-Vergleiche auf
  der bis zum Commit veralteten geschriebenen Hälfte standen. Beides vom
  Reviewer mit eigenen Sonden reproduziert, beides geschlossen, beides mit
  eigenem Fall.
- Nebenbefunde: `ComponentChanges.ts:353` — ein `CreateEntities` trägt eine
  leere Property-Liste auf die Leitung. · `ComponentContext.ts:110` — kein
  lesendes Fenster in das Component Memory; Test und Diagnose nehmen den Umweg
  über `reCreateChanges()`. · `shadow-objects-e2e/src/sync-failure.js:141` — ein
  Testbezeichner nennt einen Trail verloren, der es nicht mehr ist. ·
  `view/ClassGraphOverview.drawio` — Stand von März 2025, nennt eine Signatur,
  die es nicht gibt. · `Kernel.ts:291` — `createEntity()` überschreibt eine
  bekannte uuid stillschweigend; die Wiederholzusage dieses Pakets steht darauf.
  Alle in `./audit.html` eingetragen.
- Grenze, ausdrücklich benannt: über einen Worker greift der Abgleich nur auf
  dem bestätigten Weg. `RemoteWorkerEnv.applyChangeTrail()` schickt nur mit
  `waitForConfirmation` eine Seriennummer, und der DOM-getriebene Weg ruft
  `ShadowEnv.sync()` ohne. Dort erfährt die View von einer Ablehnung weiterhin
  nichts. Schließen hieße eine Rundreise je Frame oder serialisierte Zyklen —
  beides ändert den Zeitvertrag von `sync()` und ist eine eigene Entscheidung.
  In `./audit.html` eingetragen.
- Schnittstellen: **neu und öffentlich** — `ChangeTrailRefusedError` mit
  `readonly appliedCount` und `readonly entryCount`, exportiert aus `index.ts`
  und `shadow-objects.ts`. Erste neue Datei unter `dist/src/` in diesem Lauf
  (202 → 206 Dateien inklusive Deklaration und Maps), `dist/package.json`
  unverändert. `syncWait()` und `SyncFailed` tragen bei einer Kernel-Ablehnung
  diesen Fehler statt einer Zeichenkette; lokal und über einen Worker gleich
  geformt, nur `cause` ist fern die Zeichenkette. Ein abgelehnter Trail ist
  nicht mehr verloren — was nicht ankam, geht mit dem nächsten Zyklus erneut
  raus. `ComponentContext.buildChangeTrails(commit = true)` schreibt das
  Component Memory nicht mehr selbst, wenn `commit` falsch ist; neu ist
  `commitChangeTrail(appliedCount, changeTrail?)`.
