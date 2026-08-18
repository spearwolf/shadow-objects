# Remediation-Plan — @spearwolf/shadow-objects, View Layer (zweiter Lauf)

Quelle: `./view-layer-audit.html`, Buchhaltungsstand 2026-08-17 · Branch: `main` · erstellt: 2026-08-17
Basis-Commit vor dem ersten Paket: `4648d05` — alles danach stammt aus diesem Lauf.
Baseline (2026-08-17, sauberer Baum, gemessen vor Paket 1):
`pnpm lint` rc=0 (2 Infos zum `biome.json`-Schema, vorbestehend) ·
`pnpm build` ✓ · `pnpm typecheck` ✓ ·
`pnpm test:ci` **659** grün (`@spearwolf/shadow-objects` 349 in 15 Dateien, `shadow-objects-testing` 309 in 21 Dateien, `shae-offscreen-canvas` 1) ·
`pnpm -F shadow-objects-e2e test` **402** grün (Chromium + Firefox).
Scope: 11 von 11 Findings (0 critical, 0 high, 6 medium, 2 low, 3 info) · nichts acknowledged, nichts ausgenommen — der Nutzer hat ausdrücklich alle elf verlangt, also auch die `info`-Stufe.
Stand (2026-08-18): **Lauf abgeschlossen.** Alle zehn Pakete erledigt, zehn Commits von `d8d432e` bis `a46ab05` auf `main`, nichts blockiert, nichts mangels Beleg offen. Abschluss-Verify auf dem committeten Baum, alles mit `--force`: `pnpm lint` rc=0 / 190 Dateien · build ✓ · typecheck ✓ · `dist` **198** Dateien · Core+Integration **688** (`@spearwolf/shadow-objects` 364 in 15 Dateien, `shadow-objects-testing` 323 in 22 Dateien, `shae-offscreen-canvas` 1) · e2e **402** (Chromium + Firefox). Gegen die Baseline (659 / 402) ist nichts rot geworden, was grün war. Semver: **minor** (`0.33.0` → `0.34.0`) — Paket 7 ändert das Verhalten von `clear()`, `destroyComponent()` und `removeSubTree()` an der öffentlichen API, und unter `1.0.0` hebt breaking die Minor-Stelle. Die `package.json` bleibt unangetastet: dieses Projekt setzt die Version beim Release (`chore: release vX`), nicht beim Merge; die Bewertung steht im `## [Unreleased]`-Kopf von `packages/shadow-objects/CHANGELOG.md` und zählt dort zwanzig konsumentenrelevante Punkte. Kein Tag, kein Push, kein Publish — das entscheidet der Nutzer. `view-layer-audit.html` ist nachgeführt: 87 → 98,5, elf Findings geschlossen, sieben neu eingetragen (VIEW-018 bis VIEW-022, TEST-012, TEST-013).
Paket 9 ist nach der Nutzerentscheidung zu TEST-008 hinzugekommen und steht vor Paket 2,
Paket 10 nach der Nutzerentscheidung zu `biome.json` und steht vor Paket 6 — die
Reihenfolge ergibt sich aus der Stellung im Dokument, nicht aus der Nummer. Nummern werden
nie neu vergeben.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

Nicht zu verwechseln mit den beiden abgeschlossenen Läufen im selben
Verzeichnis: `./remediation-plan.md` gehört zum Gesamt-Audit `./audit.html`
vom 14. August 2026, `./view-layer-remediation-plan.md` zum ersten Lauf über
dasselbe Teilaudit (24 Pakete, `1efde70` bis `b2356be`). Beide werden hier
nicht angefasst. Dieser Lauf arbeitet die elf Befunde ab, die jener erste Lauf
als Nebenbefunde und Reviewer-Funde hinterlassen hat.

## Entscheidungen

- Der Plan liegt in `./view-layer-remediation-plan-2.md`. `./remediation-plan.md`
  und `./view-layer-remediation-plan.md` sind fertige Läufe und bleiben unberührt.
  (2026-08-17, Orchestrator)
- **VIEW-014:** `clear()` und `destroyComponent()` lösen ihre `ViewComponent`s ab,
  so wie `dispose()` es bereits tut. Danach gilt `isDestroyed === true`; der dritte
  Zustand verschwindet, statt einen eigenen Namen zu bekommen. Verhaltensänderung
  an der öffentlichen API, gehört ins Paket-CHANGELOG. (2026-08-17, Nutzerentscheidung)
- **VIEW-017:** Nicht umbauen, sondern erst messen. Das Paket bestimmt die
  Größenordnung gegen realistische Baumgrößen, schreibt Ergebnis und die
  Shadow-Grenzen-Einschränkung als Kommentar an beide Fundstellen und setzt eine
  Zeile in `Backlog.md`. Ein Umbau der Elternsuche erfolgt nur, wenn die Messung
  ihn trägt — dann als eigenes Paket mit Rückfrage. (2026-08-17, Nutzerentscheidung)
- **TEST-008 / `<shae-worker>`:** Ein Reconnect im selben Task **bricht den anstehenden
  Abbau ab**. `#shouldDestroy = false` wandert aus dem `#started`-Guard von `start()`
  heraus, damit die Wiedervorlage `if (this.#shouldDestroy)` im Microtask von
  `#deferDestroy()` einen erreichbaren Fall bekommt — ohne sie ist der Aufschub um einen
  Microtask ohne Wirkung. Gemessen wurde der Ausgangszustand vom Planer 2 in Chromium:
  nach Remove+Append im selben Task ist `shadowEnv.isDestroyed === true`,
  `envProxy === undefined`, `kernel.getEntity(uuid)` wirft, und `start()` lehnt mit
  `ShadowEnvDestroyedError` ab, den `#onUnobservedRejection` verschluckt. Der Quellkommentar
  an `ShaeWorkerElement.ts:238-239` (»Once destroyed, it's destroyed forever«) und der
  Testkommentar an `worker-element-attributes.test.js:403-404` widersprechen einander; nach
  dieser Änderung gilt der Testkommentar, der Quellkommentar wird ersetzt.
  Umgesetzt in **Paket 9**, das vor Paket 2 läuft — Paket 2 prüft danach beide Fälle so,
  wie das Audit sie verlangt. Verhaltensänderung an der öffentlichen API, gehört nach
  `docs/` und ins Paket-CHANGELOG. (2026-08-17, Nutzerentscheidung)

- **`biome.json` prüft `.claude/`:** `files.includes` nimmt den Ordner nicht aus, obwohl
  `.claude/settings.local.json` maschinengeschrieben und global gitignoriert ist. Jeder
  Arbeitsbaum, in dem Claude Code läuft, bekommt damit früher oder später ein rotes
  `pnpm lint` aus einer Datei, die nie committet wird — in dieser Session während Paket 5
  eingetreten, unabhängig davon vom Implementierer 5 gefunden. Wird als **Paket 10** behoben
  (eine Zeile `"!**/.claude"` plus Bullet im Wurzel-`CHANGELOG.md`), das **vor Paket 6** läuft,
  damit das Verify-Tor der restlichen Pakete wieder `pnpm lint` heißt. Bis dahin gilt als
  Ersatz `pnpm exec biome check packages scripts docs *.json *.md` (rc=0, 188 Dateien).
  Nicht aus dem Audit. (2026-08-17, Nutzerentscheidung)

- **VIEW-013, Reichweite:** Der Fix deckt den Umzug eines `<slot>` **in eine andere Entity**
  ab. Nicht abgedeckt bleiben zwei Fälle, beide vom Reviewer 6 in Chromium gemessen: ein Slot,
  der in einen entitylosen Bereich **derselben Shadow Root** zieht (`slotchange` ist nicht
  `composed`, es hört niemand zu), und ein projiziertes `<shae-ent>`, das im Ziel-Namespace
  keinen antwortenden Vorfahren findet — `broadcastEvent(ReRequestParent)` löst die vorhandene
  Bindung nicht, also bleibt der alte `entParentNode` stehen. **Der Code bleibt, wie er ist**;
  `docs/` und das Paket-`CHANGELOG.md` bekommen die Grenze benannt, die beim Ersetzen der
  Absätze verlorenging, dazu je eine Zeile in `Backlog.md`. Eine falsche Zusage in
  veröffentlichter Doku wiegt schwerer als eine benannte Lücke; der Umbau der Elternsuche
  bleibt eine eigene Entscheidung und ist kein Anhängsel dieses Pakets.
  (2026-08-18, Nutzerentscheidung)

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

- Code, Kommentare und Dokumentation **immer auf Englisch**, Doku in Markdown.
  Dieser Plan, die Reports und die Commit-Messages folgen `git log` des Projekts.
- ECS-Terminologie. Verboten als Analogie: »shadow theater«, »puppet«,
  »puppeteer«, »light world«, »screen«. Bindend außerdem: `RemoteWorkerEnv`
  (nicht `RemoteShadowObjectEnv`), Entity (nicht Shadow Entity), Entity Tree
  (nicht Shadow Entity Graph), Token (nicht Component Tag).
- »context« meint zwei verschiedene Dinge: `ComponentContext` immer ausgeschrieben,
  die Dependency Injection entlang des Entity-Baums heißt »Entity Context«.
- Änderungen am öffentlichen API gehen in **einem** Zug nach
  `packages/shadow-objects/docs/`, `packages/shadow-objects/README.md` **und**
  `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`).
- Changelog-Trennung: Laufzeit/API/`dist`-Form → `packages/shadow-objects/CHANGELOG.md`;
  Build, Testrunner, Lint, turbo/pnpm, devDeps, Monorepo-Skripte → Wurzel-`CHANGELOG.md`
  (datierter Abschnitt). Danach `Backlog.md` nachziehen.
- Abhängigkeitsversionen ausschließlich über den `catalog:`-Block in
  `pnpm-workspace.yaml`. Keine Version in einer Paket-`package.json`.
- Wird ein `TODO`-Kommentar angefasst, läuft `pnpm make:todo`.
- Nach Quell- oder Doku-Änderungen `AGENTS.md` auf Aktualität prüfen.

## Vorbestehende Fehler

Keine. Die Baseline ist auf allen vier Stufen grün. Die zwei `info`-Diagnosen
von Biome betreffen das Schema von `biome.json` selbst, sind vorbestehend und
kein Teil des Scopes.

## Verify-Kommandos

Wörtlich, für jedes Paket und für den Abschluss in Schritt 7:

```
pnpm lint
pnpm build
pnpm typecheck
pnpm test:ci
pnpm -F shadow-objects-e2e test
```

`pnpm lint` war bis einschließlich Paket 5 rot aus fremder Ursache — nicht aus Projektcode,
sondern aus `.claude/settings.local.json` (siehe »Entscheidungen« und Paket 10). Solange das galt,
trat als Ersatz `pnpm exec biome check packages scripts docs *.json *.md` an seine Stelle
(rc=0, 188 Dateien). **Mit dem Commit von Paket 10 entfällt dieser Ersatz.** Ab Paket 6 ist wieder
`pnpm lint` das Tor, und zwar mit rc=0 über **189** Dateien; wer den Ersatzbefehl danach noch
benutzt, prüft zwei Dateien weniger als das Tor. Die Zahl wächst mit jeder neuen Datei — Paket 6
legt eine Spec-Datei an und schließt bei **190** ab.

Davon unabhängig und weiterhin gültig: `pnpm test:ci -- --force` funktioniert **nicht**: das Skript reicht `--force` an vitest
durch, nicht an turbo, und bricht mit `CACError: Unknown option --force` ab. Wer den
Turbo-Cache umgehen will, ruft stattdessen
`pnpm exec turbo run test --filter='!shadow-objects-e2e' --force` — identischer Umfang.
(Gefunden vom Implementierer 5.)

Der Abschluss-Verify fährt zusätzlich mit `--force`, um den Turbo-Cache zu
umgehen, und zählt `packages/shadow-objects/dist` aus (Nullprobe des Vorlaufs:
198 Dateien).

## Pakete

### [x] 1. Testharness: Isolation und lesbare Diagnose
- Findings: TEST-009 (low), TEST-010 (info), TEST-011 (info)
- Ziel: Ein roter Lauf sagt, woran es lag, und ein Testfall erbt nichts vom vorigen.
- Hash: `d8d432e`
- Ergebnis: 1 Review-Runde · TEST-009, TEST-010 und TEST-011 je behoben und vom Reviewer
  mit Fundstelle bestätigt · 3× `wichtig` (Rückblick auf den Vorzustand in drei Zeilen des
  Wurzel-`CHANGELOG.md`, dazu »rimraf moves from the catalog into devDependencies« sachlich
  falsch) in Runde 1 behoben und nachgeprüft · Verify vom Orchestrator selbst gefahren:
  lint rc=0 · build ✓ · typecheck ✓ · `test:ci` 659 · e2e 402 — deckungsgleich mit der Baseline
- Nebenbefunde: keine
- Folgen: keine — alle sieben `it()`-Blöcke in `test/ComponentContext.test.js` stellten ihren
  Ausgangszustand bereits selbst her und blieben unter `afterEach(unmountAll)` ohne Anpassung grün
- Schnittstellen: keine öffentliche Oberfläche berührt. Für spätere Pakete relevant:
  `test/ComponentContext.test.js` räumt jetzt über `afterEach(() => unmountAll())` auf, und
  `unmountAll()` (`packages/shadow-objects-testing/src/mount.js:31-42`) ruft `clear()` auf jedem
  Context aus `ComponentContext.getContextsMap()` — **Paket 7 ändert genau dieses `clear()`**.

### [x] 9. `<shae-worker>`: der Reconnect im selben Task bricht den Abbau ab
- Findings: keins aus dem Audit; Nutzerentscheidung vom 2026-08-17, Voraussetzung für TEST-008 in Paket 2
- Ziel: Ein `<shae-worker>`, der das Dokument verlässt und im selben Task wieder darin steht,
  behält Umgebung, Proxy und Entities.
- Hash: `3a6dca7`
- Ergebnis: 2 Review-Runden · Entscheidung eingelöst, vom Reviewer in beide Richtungen selbst
  gemessen (Reconnect sagt ab; ein Element, das nicht wiederkommt, baut vollständig ab;
  `no-autostart` sauber) · 1× `wichtig` (`#shouldDestroy` trug zwei Bedeutungen, `destroy()` lief
  2× statt 1×) in Runde 1 behoben, 3× `klein` mit · 1 neuer `klein` aus Runde 1 (zweiter `destroy()`
  über zwei Abbau-Fenster hinweg, gegen `HEAD` als Folge dieses Laufs belegt) in Runde 2 behoben ·
  drei rote Läufe belegt (`expected true to be false`, 2× `expected 2 to equal 1`) · Verify vom
  Orchestrator selbst gefahren, mit `--force`: lint rc=0 · build ✓ · typecheck ✓ · `test:ci` **662**
  (Baseline 659 + 3 neue Fälle) · e2e **402** unverändert
- Nebenbefunde: `packages/shadow-objects/docs/cheat-sheet.md:191` führt den nach `AGENTS.md`
  verbotenen Gloss »(Component Tag)« · `Backlog.md` §4.1 nennt für vitest »14 Dateien, 327 Fälle«,
  die Baseline weist 15/349 aus. Beide vorbestehend, beide außerhalb dieses Pakets.
- Folgen: `packages/shadow-objects-testing/test/worker-element-attributes.test.js:403-404` — der
  Kommentar »this pins the delay, not the reconnect case itself« stimmt in seiner zweiten Hälfte
  nicht mehr. **Paket 2 zugewiesen**, dort im Vorgehen verankert.
- Schnittstellen: `<shae-worker>` — ein Reconnect im selben Task bricht den aufgeschobenen Abbau ab.
  `ShaeWorkerElement.destroy()` ist **idempotent**: jeder Aufruf nach dem ersten findet nichts mehr
  vor und ändert nichts (Wächter `#destroyed`, `ShaeWorkerElement.ts:236-247`). `#shouldDestroy` ist
  reiner DOM-Zustand mit den Besitzern `connectedCallback`/`disconnectedCallback`, `#destroyPending`
  bewacht allein das Einhängen des Microtasks. Verschlechtert: ein Element mit `no-autostart`, das
  den DOM verlässt und danach von Hand `start()` bekommt, endet in einer zerstörten Umgebung —
  im Paket-CHANGELOG benannt.

### [x] 2. `<shae-worker>`: der aufgeschobene Abbau, auf Entity-Ebene
- Findings: TEST-008 (medium)
- Ziel: Was der Reconnect im selben Task rettet und der Abbau nach der Taskgrenze mitnimmt,
  ist am Kernel und an den Entities abgelesen, nicht nur an der Umgebung.
- Hash: `a2456c9`
- Ergebnis: 1 Review-Runde · TEST-008 erfüllt — die Umgebungsachse war von Paket 9 abgedeckt,
  dieses Paket liefert die Entity-Achse mit zwei Fällen nach · **beide Gegenproben vom Reviewer
  selbst gefahren** statt geglaubt: mit deaktiviertem `#shouldDestroy = false` in
  `connectedCallback` fällt Fall 1 auf seiner eigenen Prämissenzeile, mit stillgelegtem
  `if (this.#shouldDestroy) this.destroy()` fällt Fall 2 auf seiner — keine Assertion ist
  vacuous · kein `kritisch`, kein `wichtig`, 1× `klein` (verunglückter Satz in `TEST-PLAN.md`)
  in Runde 1 behoben · Verify vom Orchestrator selbst gefahren, `test:ci` mit `--force`:
  lint rc=0 · build ✓ · typecheck ✓ · `test:ci` **664** · e2e **402**
- Nebenbefunde: keine neuen. Der aus Paket 9 übernommene Gloss »(Component Tag)« bleibt offen und
  geht **ins nächste Audit**: er steht an neun Stellen über fünf `docs/`-Dateien plus `AGENTS.md:18`,
  `Backlog.md:442` führt ihn bereits, und er braucht zuerst eine Entscheidung (überall streichen vs.
  die Tabelle in `AGENTS.md:83` ihn sanktionieren lassen) — ein Doku-Paket, kein Anhängsel an einen
  Testcommit.
- Folgen: keine. Die aus Paket 9 zugewiesene Folge (Kommentar `worker-element-attributes.test.js:403-404`)
  ist mit erledigt; der zweite Nebenbefund aus Paket 9 (`Backlog.md` §4.1, vitest-Inventar) ebenfalls,
  er stand in der Nachbarzeile.
- Schnittstellen: keine — reine Testarbeit.

### [x] 3. `RemoteWorkerEnv`: ein unlesbarer Storage-Wert reißt `start()` nicht mehr mit
- Findings: VIEW-016 (low)
- Ziel: `configureConsoleLogger` behandelt einen kaputten Storage-Wert wie einen fehlenden.
- Hash: `8060ccb`
- Ergebnis: 1 Review-Runde · VIEW-016 behoben, vom Reviewer gegen den per `git stash`
  wiederhergestellten Vorzustand nachgefahren · der Schaden war größer als das Audit sagte: der
  Wurf stand in `start()` zwischen `createWorker()` und dem Handshake-`try`, ließ also `#worker`
  gesetzt, den Thread laufen und `workerLoaded` für immer offen — der Reviewer hat die Aufrufkette
  zwischen beiden Punkten auf weitere synchrone Wurfpfade durchgesehen, es ist keiner übrig ·
  6 rote Läufe belegt aus zwei Ursachen (`SyntaxError` aus dem Parse; Indexschlüssel, die sich in
  die Worker-Nachricht spreizen) · kein `kritisch`, kein `wichtig` · 1× `klein` (Backlog-Zeile mit
  falscher Zahl stehen gelassen statt nach eigener Messung korrigiert) in Runde 1 behoben ·
  Verify vom Orchestrator selbst gefahren, `test:ci` mit `--force`: lint rc=0 · build ✓ ·
  typecheck ✓ · `test:ci` **670** · e2e **402**
- Offen (`klein`, bewusst nicht behoben): `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts:487-506`
  ist nach der Runde redundant zum `"debug"`-Unterfall des `it.each` bei `:508-541` — gleicher
  Schlüssel, gleicher Wert, und die `it.each`-Assertion ist die stärkere. Doppelte Abdeckung ist
  kein Defekt; eine weitere Runde dafür wäre teurer als der Nutzen.
- Nebenbefunde: keine
- Folgen: keine. `configureConsoleLogger` ist privat, ihre einzige Aufrufstelle
  (`RemoteWorkerEnv.ts:177`) bleibt in Signatur und Rückgabewert unverändert.
- Schnittstellen: keine öffentliche Signatur berührt. Verhalten: ein Wert unter dem
  Console-Logger-Storage-Schlüssel, der sich nicht als JSON-**Objekt** lesen lässt (kaputtes JSON,
  Array, `null`, Skalar), wirkt wie ein fehlender und wird über den `ConsoleLogger` gemeldet.

### [x] 4. Change Trails sind Werte, keine geteilten Puffer
- Findings: VIEW-015 (medium)
- Ziel: `applyPropsChanges` schreibt keinen bereits ausgelieferten Trail mehr fort.
- Hash: `df50b6d`
- Ergebnis: 2 Review-Runden · VIEW-015 behoben, vom Reviewer gegen den per `git stash`
  zurückgenommenen Fix nachgefahren · drei rote Fälle auf drei Ebenen belegt (`props-utils`,
  `ComponentMemory`, `ComponentContext` — letzterer hält die **ausgelieferte** Referenz fest und
  vergleicht nach einem zweiten Sync-Takt) · jeder Rückgabepfad der Funktion einzeln geprüft,
  beide Aufrufstellen nachgesehen, kein zweiter Adoptionsweg gefunden · 1× `wichtig` (der neue
  Doc-Kommentar behauptete eine Invariante, die der `curProps === changes`-Fast-Path bricht) in
  Runde 1 behoben, 2× `klein` (unlesbarer Satz, wirkungsloser innerer Cast) in Runde 2 ·
  Verify vom Orchestrator selbst gefahren, alles mit `--force`: lint rc=0 · build ✓ (`dist` 198
  Dateien) · typecheck ✓ · `test:ci` **673** · e2e **402**
- Nebenbefunde: `ComponentPropertiesType = [string, unknown][]` modelliert den von
  `filterUndefinedProps` bewusst durchgelassenen Eintrag der **Länge 1** nicht; deshalb braucht die
  Kopierstelle einen Cast, den es sonst nicht bräuchte. Vorbestehende Lücke im Typ, vom Reviewer
  durch drei `tsc`-Läufe eingegrenzt, außerhalb dieses Pakets. Gehört ins nächste Audit.
- Folgen: keine. Keine Signatur, kein Export, keine Konsumenten-API geändert.
- Schnittstellen: `applyPropsChanges` gibt kein Tupel mehr zurück, das dem übergebenen `changes`
  gehört — mit einer Ausnahme, die der Doc-Kommentar benennt: bei `curProps === changes` kommt
  `changes` unverändert zurück, Tupel eingeschlossen. Dieser Fast-Path ist durch
  `props-utils.spec.ts:40-43` auf Identität festgeschrieben.

### [x] 5. `forward-custom-events`: Attribut, Signal und Patch sagen dasselbe
- Findings: VIEW-011 (medium), VIEW-012 (medium)
- Ziel: Was das Element weiterleitet, ist am Signal ablesbar — und am Attribut, auch über
  ein Ab- und Wiedereinhängen hinweg.
- Hash: `fc27e70`
- Ergebnis: 1 Review-Runde · VIEW-011 und VIEW-012 behoben, beide vom Reviewer gegen den per
  `git stash` zurückgenommenen Fix nachgefahren, dazu eine eigens gebaute **Zwischenstufe**
  (nur VIEW-011 angewandt), die belegt, dass genau ein Fall unabhängig von VIEW-011 rot ist ·
  vier rote Läufe belegt · alle fünf Signalzustände und zwölf Reconnect-Kombinationen einzeln
  gemessen · doppelte Patch-Installation und Patch-Verlust mechanisch und messend ausgeschlossen
  (`Object.defineProperty` kann keine zweite eigene Property anlegen; das Original wird bei
  vorhandener eigener Property vom Prototyp gelesen) · 1× `wichtig` (ein CHANGELOG-Satz behauptete
  die Normalisierung unbedingt und war in einem von drei Fällen falsch), 2× `klein` in Runde 1
  behoben · Verify vom Orchestrator selbst gefahren, Tests mit `--force`: lint über die
  Projektquellen rc=0 (188 Dateien) · build ✓ · typecheck ✓ · Core+Integration **678** ·
  e2e **402** · `dist` 198 Dateien
- Nebenbefunde: `packages/shadow-objects/src/elements/ShaeEntElement.ts:660` endet ohne
  Zeilenumbruch (vorbestehend, auch in `HEAD`, von Biome nicht moniert) · ein gezielter
  `vitest`-Aufruf umgeht den `rimraf`-Vorlauf der `test`- und `watch`-Skripte, ungeräumte
  Aufnahmen in `packages/shadow-objects-testing/test/__screenshots__/` bleiben danach stehen ·
  `biome.json` prüft `.claude/` mit → **Paket 10**, siehe »Entscheidungen«
- Folgen: keine außerhalb des Pakets. Der Kommentar am Tabellenfall
  `ent-element-events.test.js:31-36` musste mit, weil seine Begründung die abgeschaffte Regel
  beschrieb — im Paket erledigt.
- Schnittstellen: `<shae-ent>` — `forwardCustomEvents$.set(true)` schreibt die Wahr-Form des
  Attributs **bedingungslos** zurück, auch über eine dort stehende Filterliste. Das Zurücklesen
  beim Verbinden läuft **ohne** `beQuiet` und schreibt nur bei echtem Inhaltsunterschied
  (neuer Helfer `isSameFilter`, `ShaeEntElement.ts:55-71`) — damit erreichen Signaländerungen
  über ein Wiedereinhängen hinweg sowohl die Abonnenten als auch den `dispatchEvent`-Patch.
  Ein Attributwert, der schon dasselbe sagt wie das Signal, behält seine Schreibweise;
  normalisiert wird nur, was den Signalwert bewegt.

### [x] 10. `pnpm lint` prüft nur noch, was das Projekt schreibt
- Findings: keins aus dem Audit; Nutzerentscheidung vom 2026-08-17
- Ziel: Das Verify-Tor der restlichen Pakete heißt wieder `pnpm lint`.
- Hash: `f4d0e6b`
- Ergebnis: 1 Review-Runde · eine Zeile `"!**/.claude"` in `files.includes` von `biome.json`,
  dazu ein Abschnitt im Wurzel-`CHANGELOG.md` · Ursache vom Planer eingegrenzt: Biomes
  `vcs.useIgnoreFile` liest nur die projekteigene `.gitignore`, die Regel für die Datei steht
  in der globalen `core.excludesFile` des Nutzers · Reviewer hat beide Läufe selbst gefahren
  (vorher rc=1 / 190 Dateien, nachher rc=0 / **189**), per `git ls-files` nachgewiesen, dass kein
  `.claude`-Pfad eingecheckt ist, und `.vscode/settings.json` als weiterhin geprüft bestätigt ·
  1× `klein` (eine unbelegte Zahl im CHANGELOG) in Runde 1 durch eigene Messung ersetzt, Datei
  byte-genau per SHA256 zurückgespielt · Verify vom Orchestrator selbst gefahren: `pnpm lint`
  **rc=0, 189 Dateien** · build ✓ · typecheck ✓ · `test:ci` **678** · e2e **402**
- Nebenbefunde: keine
- Folgen: keine
- Vormerkung (`klein`, bewusst so): Der Ausschluss ist auf Verzeichnisebene gezogen, nicht auf
  die eine Datei — genau so verlangt es die Nutzerentscheidung. Sollte das Repo je
  `.claude/agents/`, `.claude/skills/` oder ein nicht-lokales `.claude/settings.json`
  einchecken, wären die damit ungeprüft; dann ist `!**/.claude/settings.local.json` die
  engere Fassung. Heute ist unter `.claude` nichts getrackt.
- Schnittstellen: `pnpm lint` ist ab hier wieder das Verify-Tor, erwartet rc=0 bei
  **189** Dateien und den zwei vorbestehenden `biome.json`-Infos.

### [x] 6. Ein verschobener `<slot>` meldet sich auch dort ab, wo er herkommt
- Findings: VIEW-013 (medium)
- Ziel: Beide Kanäle — projizierte Property und `entParentNode` eines projizierten
  `<shae-ent>` — folgen dem Umzug an der abgebenden Seite.
- Hash: `5b0e896`
- Ergebnis: 2 Review-Runden, das gründlichste Paket des Laufs · VIEW-013 im entschiedenen
  Umfang erfüllt (siehe »Entscheidungen«, Reichweite) · der Planer hat drei Lösungswege
  gegeneinander gemessen und zwei verworfen: Weg 2 ist nicht umsetzbar, weil `<slot>` kein
  registriertes Element mit Lebenszyklus-Haken ist; Weg 1 kostet einen `MutationObserver` je
  Entity mit `subtree: true`, weil ein `MutationObserver` nicht nach Tag filtern kann ·
  gewählt: die vorhandene Re-Request-Maschinerie, mit einem Register davor · drei rote Läufe
  belegt, dazu zwei Torgegenproben mit stillgelegtem Tor · der Reviewer hat **sechs
  Umzugsvarianten** einzeln in Chromium gefahren, drei davon tragen nicht — daraus die
  Nutzerentscheidung, die Grenze zu benennen statt die Reichweite zu erweitern ·
  1× `kritisch` und 4× `wichtig` in Runde 1, 2× `klein` in Runde 2 behoben, darunter zweimal
  dasselbe Muster: eine Zusage in veröffentlichter Doku ohne Wächter · Verify vom Orchestrator
  selbst gefahren, mit `--force`: lint rc=0 / 190 Dateien · build ✓ · typecheck ✓ ·
  Core+Integration **682** (358 / 323 / 1) · e2e **402** · `dist` 198 Dateien
- Nebenbefunde: keine offenen. Der aus Paket 5 übernommene fehlende Zeilenumbruch ist
  **kein Defekt** — `biome.json:40` setzt `"trailingNewline": false` für alle Dateien.
- Folgen: keine offenen. Die zwei nicht abgedeckten Umzüge sind keine Folge dieses Laufs,
  sondern die benannte Grenze des Fixes; sie stehen in `Backlog.md` unter »Grenzen des
  Slot-Umzugs« und in `docs/`.
- Schnittstellen: neuer Signalname `ComponentContext.ReRequestEntHost` (`ComponentContext.ts:63`),
  dokumentiert in beiden Tabellen von `docs/api-reference.md` und in der
  Nicht-Weiterleitungsliste. `<shae-ent>` löst ihn über `broadcastEvent()` aus, der
  `ComponentContext` selbst verschickt ihn nicht. Das Register ist eine
  `WeakMap<HTMLSlotElement, WeakRef<ShaeEntElement>>` (`ShaeEntElement.ts:55`); die
  Torentscheidung ist GC-unabhängig, weil `deref() === this` nur für ein lebendes,
  gerade auf dem Stack liegendes Element gilt und jeder andere Ausgang konservativ auf
  »Runde« fällt.
- Für **Paket 8**: zweiter Auslöser der Re-Request-Runde ist `#onSlotChange`
  (`ShaeEntElement.ts:640`), er läuft **ohne** `newAncestor` und damit ohne `isBelow`, und er
  feuert erst ab der **zweiten** Meldung eines Slots — der Seitenaufbau kostet 0 Runden,
  gemessen. Vorabzahlen einer Runde vom Reviewer: 300 Entities → 1,2 ms synchron / 1,7 ms bis
  alles steht, 1200 → 6,6 / 8,8 ms. Fundstellen: `isBelow` unverändert
  `ShaeEntElement.ts:25-30`, die zweite `ComponentContext.ts:376-382`.

### [x] 7. `clear()` und `destroyComponent()` lassen nichts Lebendes zurück
- Findings: VIEW-014 (medium)
- Ziel: `isDestroyed` ist nach jedem Abbauweg eine verlässliche Auskunft; der dritte Zustand
  existiert nicht mehr.
- Hash: `606d77d`
- Ergebnis: 2 Review-Runden · VIEW-014 erfüllt · **das Audit lag an einer Stelle falsch**: es
  fasst `clear()` und `destroyComponent()` zusammen, aber nach `destroyComponent(vc)` gab
  `setProperty` `true` zurück, nicht `false` — vom Planer gemessen · der Blast Radius reichte
  weiter als der Audit-Text: `removeSubTree()` ist ein vierter öffentlicher Weg und ändert sich
  mit · sechs rote Läufe belegt, dazu drei Gegenproben mit stillgelegtem Wächter · der Reviewer
  hat die Rekursion **strukturell** bestätigt statt nur den Zähler nachzufahren (es gibt genau
  zwei Aufrufer mit lebendem `#context`, beide gehen über `destroy()`, das ihn nullt, und
  zwischen dem Nullen und dem Rückruf steht nichts) und die Quelle auf `HEAD` zurückgesetzt,
  um zu belegen, dass genau die neuen Fälle rot werden · 5× `klein` über zwei Runden behoben,
  darunter dreimal dasselbe Muster: eine Zusage in veröffentlichter Doku, die zu absolut ist
  oder keinen Wächter hat · Verify vom Orchestrator selbst gefahren, mit `--force`: lint rc=0 /
  190 Dateien · build ✓ · typecheck ✓ · Core+Integration **688** (364 / 323 / 1) · e2e **402** ·
  `dist` 198 Dateien
- Nebenbefunde: `ViewComponent.destroy()` ruft kein `off()` — ein `on(vc, …)` und der
  `dispatchEvent`-Patch aus `ShaeEntElement.ts` überleben jeden Abbau. Vorbestehend, in
  `docs/api-reference.md:821` so dokumentiert, außerhalb dieses Pakets.
- Folgen: keine offenen. Die uuid-Kollision (zwei `ViewComponent`s teilen sich eine uuid, die
  verdrängte überlebt die flächigen Abbauwege) ist keine Folge dieses Laufs, sondern die
  benannte Grenze der Ablösung; sie steht in `Backlog.md:225` und in `docs/`.
- Schnittstellen: **Breaking.** `clear()`, `destroyComponent()` und `removeSubTree()` lassen
  ihre `ViewComponent`s zerstört und abgelöst zurück — danach `isDestroyed === true`,
  `context === undefined`, `setProperty()` liefert `false`, und `addChild` bzw. `parent =`
  wirft einen `ViewComponentError`. `vc.context = ctx` nach einem `clear()` ist eine
  Wiederaufnahme und erzeugt einen `CreateEntities`-Eintrag. `dispose()` besteht nur noch aus
  `clear()` plus `#isDisposed` plus Namespace-Freigabe. Der `changeOrder`-Wächter
  (`ComponentContext.ts:337-338`) bleibt, jetzt für den uuid-Kollisionsfall. Die
  Breaking-Aufzählung der CHANGELOG-Präambel steht bei **Twenty**, zweimal nachgezählt.

### [x] 8. Die Re-Request-Runde: Größenordnung messen und festschreiben
- Findings: VIEW-017 (info)
- Ziel: Die quadratische Kante ist beziffert, ihre Grenze steht als Kommentar an beiden
  Fundstellen und als Zeile in `Backlog.md`.
- Hash: `a46ab05`
- Ergebnis: 2 Review-Runden · VIEW-017 im entschiedenen Umfang erfüllt: gemessen, nicht
  umgebaut · **das Audit stimmt in Zahl und Kurve, nicht in der Ursache** — `isBelow` ist die
  Milderung, nicht der Grund: bei 600 Geschwistern 72 ms mit Filter gegen 322,6 ms ohne,
  Faktor 4,5; der quadratische Term steckt in der Runde je verbindender Entity. Und der
  Wurzelkanal, den das Audit als Randnotiz führt, ist die **teurere Hälfte**: 273,8 gegen
  23,3 ms bei 600 Wurzeln, Verdopplungsquotient 3,5/3,7 **ohne jede Milderung**, während der
  gefilterte Geschwisterkanal bei denselben Größen mit 1,7/2,4 noch fast linear läuft ·
  Messreihe n ∈ {6, 50, 150, 300, 600} in echtem Chromium, Wegwerf-Spec, wieder entfernt ·
  Schwellen aus den Zeilenwerten herleitbar: **375** Geschwister bzw. **155** Wurzeln, bis der
  Überhang ein Bild (16,7 ms) kostet — letztere als konservative Extrapolation ausgewiesen,
  die eingerahmten Messpunkte deuten auf ~165 · **die größte Geschwisterschar im ganzen
  Repository hat sechs Mitglieder** (`packages/shadow-objects-e2e/pages/multi-env.html:24-68`),
  Faktor ≈62,5 bzw. ≈25,8 unter der Schwelle — der Umbau lohnt heute nicht · 2× `wichtig`
  (Zahlen ohne Messbedingung; Schwelle nicht herleitbar) und 2× `klein` über zwei Runden
  behoben · Verify vom Orchestrator selbst gefahren, mit `--force`: lint rc=0 / 190 Dateien ·
  build ✓ · typecheck ✓ · Core+Integration **688** (364 / 323 / 1) · e2e **402** · `dist` 198 —
  **keine Zahl hat sich bewegt**, der Diff enthält keine Logikzeile
- Nebenbefunde: zwei veraltete Zeilenreferenzen in `Backlog.md` (`#reRequestParentAsRoot`,
  `isInClosedShadowTree`) beim Ersetzen mitkorrigiert.
- Folgen: keine. Kein Verhalten, kein Export, keine Signatur berührt; kein CHANGELOG-Eintrag,
  weil es nichts zu melden gibt.
- Schnittstellen: keine. Was zurückbleibt, ist Wissen: beide Fundstellen tragen die gemessenen
  Zahlen samt Datum, Browser und Playwright-Version, dazu die zwei Wände, an die ein Umbau
  stößt — der Wurzelkanal kennt keinen Absender, und ein aufstiegsfreier Unterhalb-Test ist an
  geschlossenen Shadow-Grenzen blind (`isInClosedShadowTree`). `Backlog.md` trägt die Reihe und
  eine Reproduktionsanleitung, einschließlich der Falle, dass `mount()` in einen abgetrennten
  `<div>` parst und damit `#wasUpgradedInPlace` unterdrückt — wer so misst, sieht die
  Peer-Runde gar nicht laufen.
