# Remediation-Plan — shadow-objects

Quelle: ./audit.html vom 2026-08-20 · Branch: main · erstellt: 2026-08-20
Baseline: `pnpm lint` ✓ (1 info: Biome-Config-Migrationshinweis) · `pnpm typecheck` ✓ ·
`pnpm build` ✓ · `pnpm test:ci` ✓ 952 Fälle (600 shadow-objects, 345
shadow-objects-testing, 7 shae-offscreen-canvas) ·
`pnpm -F shadow-objects-e2e test` ✓ 426 Fälle
Scope: 7 von 53 Findings (0 critical, 0 high, 7 medium) · ausgenommen: 25 low, 21 info
Stand (2026-08-20): **Lauf abgeschlossen.** Zwölf Pakete, zwölf Commits auf
`main`: 1 (`2ef4911`), 2 (`95d2dab`), 3 (`1a092c0`), 4 (`5950e00`), 9
(`eb2339d`), 5 (`4f0056a`), 11 (`d434a3a`), 6 (`0739b59`), 7 (`2b38c05`), 8
(`6452b29`), 10 (`04e953c`), 12 (`29976d1`), dazu der Abschluss-Commit. Nichts
blockiert, nichts gestasht. Alle sieben Findings des Scopes sind geschlossen.
Verify auf `HEAD`, vom Orchestrator selbst gefahren: `pnpm lint` ✓ (der eine
bekannte Biome-Hinweis aus der Baseline) · `pnpm typecheck` ✓ · `pnpm build` ✓ ·
`pnpm test:ci --force` ✓ 1078 Fälle (632 shadow-objects, 101
shae-offscreen-canvas, 345 shadow-objects-testing) · `pnpm -F shadow-objects-e2e
test` ✓ 426 Fälle. Gegen die Baseline: 126 Fälle mehr, keiner verschwunden.

Semver: keine Versionsanhebung. Beide Pakete führen ihre Änderungen unter
`## [Unreleased]` und heben die Nummer erst beim Release — `git log --
package.json` zeigt das über mehrere brechende Änderungen hinweg. Der Vorspann
des Paket-CHANGELOG bewertet den nächsten Release bereits als minor (`0.33.0` →
`0.34.0`), und das trägt nach diesem Lauf unverändert: unter `1.0.0` hebt jede
Zahl brechender Änderungen dieselbe Stelle. `@spearwolf/shae-offscreen-canvas`
bekam nur Tests und keine Zeile Laufzeitcode, also weder Eintrag noch Anhebung.

`./audit.html` ist nachgeführt: Score 73,5 → 84,5, sieben Findings geschlossen,
sieben neu eingetragen. Die Datei ist nicht neu geprüft worden, sondern
neu gerechnet — das steht so in ihrer Methodik-Sektion.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

## Scope-Abgrenzung

Der Nutzer hat »alle Issues mit Schweregrad mittel oder höher« beauftragt. Der
Report kennt keine Befunde über `medium`, also sind es genau die sieben
mittleren: ARCH-001, TYPE-001, BUG-010, API-002, TEST-001, TEST-002, BUILD-001.
Die 25 `low` und 21 `info` bleiben draußen — nicht erledigt, sondern nicht
beauftragt. `acknowledged` ist im Report leer.

Zwei davon liegen quer zu diesem Schnitt und werden in den Test-Paketen 6 und 7
berührt, ohne behoben zu werden: die fehlende Wiedereintrittssperre im
Frame-Listener von `ThreeRenderView` (`low`) und die beiden Felder, die
`ShaeOffscreenCanvas` über seinen Teardown hinaus hält (`info`). Wächter, die
dort entstehen, halten das heutige Verhalten fest und beschreiben es im Klartext
— sie behaupten nicht, dass es richtig sei. Ein Fix dieser beiden ist Sache
eines späteren Laufs.

Was dieser Lauf an Folgen erzeugt, gehört dazu: zieht ein Fix anderswo etwas
nach sich, wird es hier mit behoben, notfalls in zusätzlichen Paketen.

## Entscheidungen

- **API-002 — das Verhalten gibt nach, nicht die Zusage** (2026-08-20): Die
  Aufräum-Menge in `ShadowObjectCreationScope` bekommt eine Ordnung. Erst laufen
  alle `clearOnDestroy`-Schreibungen, dann werden die Links gekappt, damit das
  `undefined` die entitätseigene Kontextleitung noch erreicht. Dann gilt die
  Zusage aus `docs/api-reference.md:133` auf beiden Wegen — Tokenwechsel wie
  zerstörte Entity. Die zwei Fälle in `Kernel.spec.ts`, die heute das Ausbleiben
  festhalten, werden umgeschrieben. Verhaltensänderung mit Changelog-Eintrag.
- **BUG-010 — der Eintrag wird im Fehlerfall zurückgenommen** (2026-08-20):
  Die Reihenfolge in `createEntity()` bleibt, damit ein Shadow-Object-Konstruktor
  seine Entity weiterhin im Kernel findet (Parent-Auflösung, Kontextkette).
  Wirft ein Konstruktor, räumt ein Aufräumpfad den Eintrag samt
  Root-Registrierung und Parent-Bindung wieder ab. Kein Verhaltensbruch für
  bestehende Konstruktoren.
- **TEST-002 — befundnahe Stellen und Attribut-Handling, kein Browser-Modus**
  (2026-08-20): Wächter für Frame-Listener und Teardown, dazu `fps`,
  `pixel-zoom` und der Canvas-Transfer über einen Stub. Bleibt in happy-dom; die
  vitest-Browser-Mode-Konfiguration nach dem Vorbild von `shadow-objects-testing`
  wird nicht aufgesetzt. Renderer-Kontextkette und Größenlogik von
  `ThreeMultiViewRenderer` nur so weit, wie sie ohne WebGL prüfbar sind.
- **BUILD-001 — `paths-ignore` fällt weg** (2026-08-20): Die Doku gilt laut
  `AGENTS.md` §4 als Teil des API-Vertrags, also darf ein reiner Doku-Push die
  CI nicht überspringen. `pull_request` kommt als zweiter Trigger dazu.
- **TEST-001 — gemessen werden die beiden Node-Suiten, nicht nur das Kernpaket**
  (2026-08-20): Die Empfehlung nennt das Kernpaket, aber `shae-offscreen-canvas`
  läuft auf demselben Runner (happy-dom, kein Browser-Modus) und kostet genau
  einen weiteren Config-Block und einen weiteren devDependency-Eintrag. Ohne es
  liefe die Abhängigkeit »Paket 6 hängt von Paket 2 ab« ins Leere: die Pakete 6
  und 7 schreiben Wächter für genau dieses Paket und sollen dabei sehen, wo
  keine sind. `shadow-objects-testing` bleibt draußen — sein `test`-Skript ruft
  kein `--coverage`, und als eigenes vitest-Projekt bekäme es einen eigenen
  Bericht über dieselben `src/`-Dateien; zwei Berichte addieren sich nicht ohne
  einen Merge-Schritt, den dieser Lauf nicht baut. (Der ursprünglich notierte
  Grund, die Zeilen landeten auf Build-Ausgabe, trägt nicht: `build.mjs:59`
  setzt `sourcemap: true`, der v8-Provider remappt über diese Kette zurück auf
  `src/`.) `shadow-objects-e2e` fährt Playwright und
  hat gar keine vitest-Konfiguration. Folge, die im Plan stehen bleiben muss: die
  Zahl des Kernpakets untertreibt um das, was die Browser-Suite abdeckt.
- **ARCH-001 — der Konstruktor liest, geschrieben wird nur über die
  Konsolen-Schnittstelle** (2026-08-20, Paket-Planer innerhalb der
  Audit-Empfehlung, nicht vom Nutzer entschieden): Von den zwei Wegen der Empfehlung fällt
  der erste weg. »Nur schreiben, wenn der Schlüssel fehlt« schriebe weiterhin
  ungefragt, bloß einmal je Namensraum und Origin statt bei jeder
  Instanziierung, und legte einen Schlüssel an, der danach nie wieder
  nachgeführt wird. Der Konstruktor liest deshalb nur noch; in die Storage des
  Hosts schreiben allein die vier Setter des Handles unter
  `globalThis.ConsoleLogger`. Verloren geht dabei die Auffindbarkeit: der
  Schalter `ConsoleLogger.<namespace>.enable` tauchte bisher von selbst in den
  Entwicklerwerkzeugen auf. Er wird dafür dokumentiert. Die Fähigkeitsprüfung
  beim Modulstart bleibt schreibend, weil nur ein Schreibversuch eine Storage,
  die Schreibvorgänge annimmt, von einer trennt, die dabei wirft; der Report
  nimmt sie ausdrücklich aus.
- **Die Logger werden nicht pro Namensraum zwischengespeichert**
  (2026-08-20, Paket-Planer, nicht vom Nutzer entschieden):
  Der Zusatz der Empfehlung geht nicht mit. Sein Argument war die Häufigkeit des
  Schreibvorgangs, und die fällt mit dem Schreibvorgang selbst weg; übrig bleibt
  eine Objektanlage. Der Preis wäre hoch: entweder eine neue öffentliche
  Fabrikmethode samt Doku, CHANGELOG und sieben Aufrufstellen in zwei Paketen,
  oder ein Konstruktor, der zwischengespeicherte Instanzen zurückgibt — dann
  hinge `logger.enable = false` bei einem Halter an allen Haltern desselben
  Namensraums. Eine Verhaltensfalle für einen Preis, den niemand gemessen hat.
- **Zwei Provider desselben Kontextnamens auf einer Entity: der bleibende
  gewinnt** (2026-08-20): Verlässt ein Shadow Object die Konstruktorenmenge und
  löscht seinen bereitgestellten Kontext, sollen die verbliebenen Provider
  derselben Entity und desselben Namens ihren Wert erneut durchdrücken. Gemessen
  wurde, dass keine der beiden billigen Varianten das leistet: mit Löschung liest
  ein Kind `undefined`, obwohl der bleibende Provider seinen Wert noch hält; ohne
  Löschung liest es den letzten Wert des verschwundenen Providers, und eine
  wertgleiche Neuschreibung des Bleibenden propagiert nicht. Es braucht daher
  eine Buchführung über die Provider je Entity und Name sowie eine Neuschreibung,
  die auch bei gleichem Wert durchkommt. Das ist eine echte Folge von Paket 4 und
  wird als Paket 9 gebaut, nicht in Paket 4 hineingezogen.
- **Bei mehreren bleibenden Providern gewinnt der zuletzt angehängte mit Wert**
  (2026-08-20): Geht ein Provider und drücken die verbliebenen ihren Wert
  erneut durch, entscheidet die Einfügereihenfolge — der letzte Treffer mit
  einem Wert `!= null` gewinnt, Provider ohne Wert werden übersprungen, nach
  derselben Regel, mit der `SignalsPath` heute Kontextketten auflöst. Genau
  dieser Wert stünde ohnehin im entitätsseitigen Signal, wären die Provider in
  dieser Reihenfolge konstruiert worden. Unter lebenden Providern bleibt »wer
  zuletzt schrieb, gewinnt« unangetastet; die Regel greift nur im Abbaumoment.
- **Ein werfender Teardown-Rückruf wird gemeldet, nicht weitergereicht**
  (2026-08-20, Paket-Planer auf Vorlage aus Paket 5, vom Orchestrator
  freigegeben, nicht vom Nutzer entschieden): Jede Stufe von
  `ShadowObjectCreationScope.tearDown()` wird je Rückruf isoliert; der gefangene
  Fehler geht über `logger.error` hinaus — ungegattet, in der Form, in der
  `Kernel.destroy()` eine gescheiterte Entity meldet (`Kernel.ts:597`) — und wird
  nicht erneut geworfen. Am Code bestätigt: die Scopes aller Shadow Objects einer
  Entity hängen als `once(entity, onDestroy, Priority.Low, …)` an derselben
  Zustellung, die Entity selbst mit `Priority.Min` dahinter, und eventize bricht
  eine Zustellung beim ersten Wurf ab — die Schleife hinter `store.forEach()`
  kennt kein `try`, ihr `finally` zählt nur einen Zähler zurück. Ein einziger
  werfender Rückruf kostet deshalb heute den Abbau aller übrigen Shadow Objects
  derselben Entity, den Abbau der Entity selbst und in `destroyEntity()` die drei
  Zeilen Buchführung hinter dem `emit`. Ein erneutes Werfen am Ende von
  `tearDown()` hielte genau diesen Schaden am Leben. Verhaltensänderung mit
  CHANGELOG-Eintrag: ein Fehler, der bisher aus `destroyEntity()` oder
  `changeToken()` heraus beim Aufrufer ankam, kommt dort nicht mehr an.
- **Gearbeitet wird direkt auf `main`** (2026-08-20), ein Commit je Paket, ohne
  GPG-Signatur. Kein Push, kein Tag, kein Publish.
- **`./remediation-plan.md` und `./audit.html` sind bereits versioniert**
  (2026-08-20): Beide liegen aus dem vorigen Lauf im Repo. Während dieses Laufs
  stehen sie deshalb als geändert im Arbeitsbaum, ohne in ein Paket zu gehören.
  Jeder Paket-Commit stagt ausschließlich benannte Pfade — nie `git add -A`,
  nie `git commit -a`. Beide Dateien nimmt erst der Abschluss-Commit mit.

## Konventionen

Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise:

- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs. Sie gehören diesem einen Audit und sind danach tot. Sie
  leben in diesem Plan und in `./audit.html`, sonst nirgends — auch nicht in
  Commit-Messages. Der `git log` dieses Projekts führt keine, und die
  Hausregeln des Nutzers schließen sie dort ausdrücklich aus.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

Dazu die Regeln des Zielprojekts, nachzulesen in `AGENTS.md` und `CLAUDE.md`:

- Code, Kommentare und Doku ausschließlich auf Englisch, Doku in Markdown.
- ECS-Terminologie. Verboten als Analogie: »shadow theater«, »puppet«,
  »puppeteer«, »light world«, »screen«. Bindend sind die Namenspaare aus
  `AGENTS.md` §4 — `RemoteWorkerEnv`, Entity, Entity Tree, `ComponentContext`
  gegenüber »Entity Context«, Token.
- Eine Änderung an der öffentlichen API von `@spearwolf/shadow-objects` fasst
  in derselben Änderung `packages/shadow-objects/docs/`, dessen `README.md` und
  dessen `CHANGELOG.md` an. Für `@spearwolf/shae-offscreen-canvas` gilt
  dasselbe in dessen eigenem Paket.
- CHANGELOG-Aufteilung: Laufzeit, Paket-API und `dist/`-Form gehen in das
  `CHANGELOG.md` des betroffenen Pakets unter `## [Unreleased]`;
  Build-Pipeline, Testrunner, Lint-Config, turbo/pnpm-Setup, devDeps und
  CI gehen in das datierte Root-`CHANGELOG.md`. Trifft eine Änderung beides,
  steht sie in beiden — je aus der eigenen Perspektive, nicht doppelt.
- Dependency-Versionen ausschließlich im `catalog:`-Block von
  `pnpm-workspace.yaml`, referenziert als `"<dep>": "catalog:"`.
- Formatierung und Lint sind Biome, Config nur im Repo-Root. Nach jeder
  Änderung `pnpm lint` sauber.
- Wird ein `TODO`-Kommentar angelegt, geändert oder entfernt, läuft
  `pnpm make:todo`.
- Nach Änderungen an Quelle oder Doku `AGENTS.md` auf Veraltetes prüfen.

## Vorbestehende Fehler

Keine. Die Baseline ist auf allen fünf Kommandos grün. Der eine `info` aus
`pnpm lint` ist ein Migrationshinweis von Biome zur eigenen Config, kein
Diagnosebefund im Projektcode, und blockiert nichts.

## Pakete

### [x] 1. Die CI prüft, bevor gemergt wird

- Findings: BUILD-001 (medium)
- Ziel: Ein Pull Request löst denselben Workflow aus wie ein Push, und ein
  reiner Doku-Push wird nicht mehr übersprungen.
- Hash: 2ef4911
- Ergebnis: 1 Runde · BUILD-001 behoben · der erste Kommentarsatz über dem
  `on:`-Block wurde nachgeschärft, weil er als unbedingte Behauptung las, ein
  Fork-PR könne keine Workflows ausführen
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `.github/workflows/ci.yml` löst auf `push` und auf
  `pull_request` aus, ohne `paths-ignore` — wer den Workflow anfasst, findet
  dort zwei Trigger. `deploy.yml` bleibt davon unberührt, weil sein `if:` auf
  `workflow_run.event == 'push'` und `branches: [main]` filtert.

### [x] 2. Die Testabdeckung wird gemessen

- Findings: TEST-001 (medium)
- Ziel: `vitest` misst die Abdeckung der beiden Node-Suiten — Kernpaket und
  `shae-offscreen-canvas` —, turbo kennt die Ausgabe als Artefakt, und die CI
  hebt sie auf. Keine Schwellenwerte.
- Hash: 95d2dab
- Ergebnis: 2 Runden · TEST-001 an allen vier Stellen behoben (vitest-Config,
  Skriptaufruf, turbo-Ausgabe, CI-Artefakt) · erste Messung: Kernpaket 69,21 %
  Statements / 62,12 % Branches, `shae-offscreen-canvas` 16,26 % / 6 % ·
  nachgebessert wurden ein sachlich falscher Ausschlussgrund für die
  Browser-Suite in drei Dokumenten sowie `Backlog.md` und zwei `README.md`
- Nebenbefunde: keine
- Folgen:
  - `pnpm-workspace.yaml:43` gegen `:56` — `vitest` steht als Caret-Range,
    `@vitest/coverage-v8` version-exakt. Ein künftiges `pnpm update` kann vitest
    heben, ohne den Provider mitzunehmen; erzwungen wird die Kopplung nur durch
    den Kommentar. Ob der Caret fällt oder eine Prüfung dazukommt, entscheidet
    der nächste Paket-Planer.
    → **echte Folge** (2026-08-20): `git show 5439845:pnpm-workspace.yaml` führt
    unter `# --- test ---` nur `vitest`, `@vitest/browser` und
    `@vitest/browser-playwright`; den version-exakten Eintrag hat Paket 2
    angelegt, mit ihm die Asymmetrie. Geht in **Paket 8**. Dabei kommt heraus,
    dass die beiden anderen Satelliten dasselbe Problem schon vorher hatten —
    alle drei peeren auf `vitest: 4.1.10`, exakt, ohne Range —, also fasst
    derselbe Handgriff sie mit an.
  - `Backlog.md`, Abschnitt »4.2 Testabdeckung« — die beiden gemessenen
    Prozentzahlen stehen ohne Datum, während der übrige Backlog seine Messwerte
    datiert (siehe die Chromium-Messungen in »3. Performance«).
    Sie veralten lautlos.
    → **echte Folge** (2026-08-20): `git show 5439845:Backlog.md` hat an dieser
    Stelle »### 4.2 Coverage-Heuristik« ohne jede Zahl; Prozentwerte und
    Abschnittstitel stammen aus Paket 2. Geht in **Paket 8**.
- Schnittstellen: `pnpm test` in `packages/shadow-objects` und
  `packages/shae-offscreen-canvas` fährt `vitest --run --coverage` und schreibt
  nach `<paket>/coverage/` · `turbo.json` führt `coverage/**` als `outputs` des
  `test`-Tasks · Catalog-Eintrag `'@vitest/coverage-v8': 4.1.10`, version-exakt
  an die aufgelöste `vitest`-Version gebunden · `clean` räumt `coverage` mit ab

### [x] 3. Eine gescheiterte Erzeugung lässt keine Entity zurück

- Findings: BUG-010 (medium)
- Ziel: Wirft der Konstruktor eines Shadow Objects, verlässt `createEntity()`
  den Kernel so, wie es ihn vorgefunden hat.
- Hash: 1a092c0
- Ergebnis: 3 Runden · BUG-010 behoben · fünf neue Wächter in `Kernel.spec.ts`
  unter `a creation that fails halfway through`, roter Lauf belegt und vom
  Reviewer gegen eine Kopie von `HEAD` nachgestellt · nachgebessert wurden vier
  Doku- und Kommentarstellen, die durch den Fix unwahr geworden waren. Die
  dritte Runde ging bewusst über die Zwei-Runden-Grenze und war dem Nutzer
  angesagt: der Befund wurde jede Runde enger, der korrigierte Wortlaut lag
  vor, und ein Blockieren hätte einen verifizierten Kernel-Fix für einen
  Nebensatz in den Stash geschoben.
- Nebenbefunde:
  - `Kernel.ts:444` (`updateShadowObjects()`) — kein Rücknahmepfad. Wirft ein
    Konstruktor über `changeToken()` oder `upgradeEntities()`, steht die Entity
    mit bereits gesetztem neuen `entry.token`, abgebauten alten und fehlenden
    neuen Shadow Objects. Vom Reviewer geprüft: andere Ursache, anderer Fix als
    BUG-010, deshalb kein halbes Paket — aber offen.
    → **nächstes Audit** (2026-08-20, Planung Paket 4): vorbestehend, kein
    Erzeugnis dieses Laufs, und die Rücknahme eines halb vollzogenen
    Tokenwechsels ist eine eigene Semantikentscheidung des Nutzers (halber
    Wechsel stehenlassen oder auf den alten Token zurückrollen) — dieselbe Klasse
    von Frage, die BUG-010 einen eigenen Eintrag unter »Entscheidungen« gekostet
    hat.
  - `Kernel.run()` — scheitert ein Change eines Trails, bleiben die davor
    angewandten stehen, und die Ablehnung meldet nur den Fehler. Betrifft den
    Change-Trail-Vertrag, nicht den Entity-Lebenszyklus.
    → **nächstes Audit** (2026-08-20, Planung Paket 4): vorbestehend und in einem
    anderen Vertrag als die sieben beauftragten Findings; Atomarität eines
    Change Trails berührt View, Worker und Protokoll auf einmal und passt in kein
    Paket dieser Reihe.
  - `ShadowObjectCreationScope.ts:163-165` — der ungebundene Teardown loggt auf
    Info-Level eine Zerstörungsmeldung für ein Shadow Object, das nie entstand.
    → **Paket 4** (2026-08-20): sitzt in `tearDown()`, genau der Methode, deren
    Aufräum-Reihenfolge Paket 4 umbaut — eine Zeile im selben Block, kein Umweg.
  - `Kernel.ts:530` — der `try` in `constructShadowObject()` endet vor
    `attachShadowObject()`. Ein werfendes `onCreate` fällt nicht unter den
    Scope-Teardown; über `changeToken()` bleibt dann ein gebundenes Shadow
    Object mit gescheitertem `onCreate` stehen. Vorbestehend, sitzt jetzt aber
    unmittelbar neben der Absicherung.
    → **nächstes Audit** (2026-08-20, Planung Paket 4): vorbestehend, und ob ein
    werfendes `onCreate` das Shadow Object mitreißen soll oder ob es angehängt
    bleibt, ist eine Vertragsfrage an der Lebenszyklus-API — nicht als Beifang
    einer Kontextänderung zu entscheiden.
  - `ShadowObjectCreationScope.ts` Docblock zu `tearDown()` — spricht von zwei
    optionalen Handles, es sind drei (`#forgetShadowObject` ist auf dem dritten
    Weg ebenfalls unbesetzt).
    → **Paket 4** (2026-08-20): derselbe Docblock beschreibt die Reihenfolge, die
    Paket 4 ändert, und wird dabei ohnehin angefasst.
- Folgen: keine
- Schnittstellen: `Kernel.createEntity()` wirft weiterhin, hinterlässt aber
  keine Entity mehr · neue private `Kernel.#rollbackFailedCreation(uuid)` ·
  `ShadowObjectCreationScope.tearDown()` hat einen dritten Aufrufer und
  verträgt einen nie gebundenen Scope · `onDestroy` aus der Creation API läuft
  jetzt auf drei Wegen statt zwei, der klassenseitige Symbol-Hook weiterhin
  nur auf zweien

### [x] 4. Die Löschung eines Kontexts erreicht das Kind auf beiden Wegen

- Findings: API-002 (medium)
- Ziel: `clearOnDestroy` setzt den Kontext auch dann für jeden Konsumenten auf
  `undefined`, wenn das Shadow Object bloß die Konstruktorenmenge verlässt.
- Hash: 5950e00
- Ergebnis: 3 Runden · API-002 behoben · genau ein Eintrag wechselt die Menge:
  der Link vom Provider-Signal zum entitätsseitigen Kontextsignal wandert in
  ein eigenes `#unsubscribeContextFeeds`, das nach den beiden bisherigen
  Mengen läuft. Zwei Fälle in `Kernel.spec.ts` umgeschrieben, zwei neue dazu
  (Spiegelfall für `provideGlobalContext`, Leckfreiheit nach einem werfenden
  Konstruktor) · die zwei Notizen aus Paket 3 mitgenommen · nachgebessert
  wurden drei Kommentare, die den Mechanismus des Zerstörungswegs falsch
  benannten, sowie `Backlog.md`
- Nebenbefunde:
  - `packages/shadow-objects/CHANGELOG.md` — vierzehn Einträge tragen
    Audit-Kürzel früherer Läufe im Titel (`VIEW-20`, `VIEW-23`, `VIEW-18`,
    `KERN-8` und weitere). Keiner aus diesem Lauf. Nach den Hausregeln des
    Nutzers gehören sie dort nicht hin.
    → **Paket 10** (2026-08-20, Planung Paket 9): eigenes Paket am Ende, weil es
    mit dem Coverage-Nachtrag aus Paket 8 nichts zu tun hat und ein Commit nicht
    zwei unverwandte Aufräumarbeiten tragen soll. Dabei kommt heraus, dass die
    Kürzel nicht nur im CHANGELOG stehen: `Kernel.spec.ts` führt sieben
    `describe`-Namen der Form `KERN-n: …` (Zeilen 2625, 2701, 2735, 2784, 2806,
    2848, 2882), und die Hausregel nennt Testnamen ausdrücklich.
  - `Backlog.md`, Abschnitt »4.1«, Eintrag `LOW-2` wurde gestrichen, weil seine
    offene Frage beantwortet ist — der beschriebene Code-Befund selbst
    (`ShadowObjectCreationScope.ts` legt bei jedem `provideContext`-Aufruf eine
    neue Closure an) besteht fort und ist nirgends als bewusster Preis notiert.
    → **nächstes Audit** (2026-08-20, Planung Paket 9): der Mechanismus ist
    `#provideContextSignal` außerhalb des Erzeugungszweigs — die
    `clearOnDestroy`-Closure wird bei *jedem* Aufruf in `#unsubscribeSecondary`
    gelegt, während das Provider-Signal nur beim ersten entsteht. Ein
    Shadow Object, das `provideContext` in einer Schleife ruft, lässt die Menge
    unbegrenzt wachsen. Ohne beobachtbare Wirkung (die Closures schreiben
    dasselbe `undefined`), und ob wiederholte Aufrufe ein getragenes Muster oder
    ein zu meldender Fehlgebrauch sind, ist eine Vertragsfrage an der Creation
    API — keine Nebenwirkung der Übergabe.
  - Die Zählwächter in `signal cleanup on teardown` können ein fehlendes oder
    falsch einsortiertes `#unsubscribeContextFeeds` bauartbedingt nicht sehen:
    das Zerstören der Signale kappt jeden noch zeigenden Link als Nebenwirkung.
    Die neue Ordnung hängt allein an den Verhaltensfällen.
    → **nächstes Audit** (2026-08-20, Planung Paket 9): Paket 9 hängt eine
    dritte Sache in dieselbe Menge, die diese Wächter ebenfalls nicht sehen —
    ihre Zahlen bleiben unverändert, weil der Feed-Link nur den Besitzer
    wechselt. Ein Wächter, der die Reihenfolge wirklich sieht, muss während des
    Teardowns beobachten statt danach zu zählen; das ist eine Testtechnik, die
    dieser Lauf nicht aufbaut. Bis dahin halten die Verhaltensfälle der Pakete 4
    und 9 die Ordnung.
  - Der Feldkommentar an `#unsubscribeContextFeeds` sagt »the write reaches the
    entity-side signal and stays there« — das gilt für `provideContext`, nicht
    für `provideGlobalContext`, wo das Ziel bis `Priority.Min` Mitglied des
    `SignalsPath` im Kernel bleibt und die Schreibung die `inherited`-Signale
    anderer Entities erreicht. Ohne beobachtbare Folge, weil `rootCtx.cleanup()`
    im selben Zug dasselbe `undefined` erzeugt. Geht an Paket 9, das dieselbe
    Datei öffnet.
- Folgen:
  - Zwei Shadow Objects auf einer Entity, die denselben Kontextnamen
    bereitstellen: die Löschung des gehenden wischt jetzt den Wert des
    bleibenden mit weg. Entschieden vom Nutzer, gebaut als Paket 9.
- Schnittstellen: `ShadowObjectCreationScope` hat eine dritte Aufräum-Menge
  `#unsubscribeContextFeeds`, die zuletzt läuft und an derselben Stelle geleert
  wird wie die anderen beiden · `clearOnDestroy` wirkt jetzt auf beiden
  Abbauwegen bis zum Konsumenten

### [x] 9. Der bleibende Provider setzt sich wieder durch

- Findings: — (Folge, kein Audit-Befund)
- Folge von: Paket 4
- Ziel: Verlässt ein Shadow Object die Konstruktorenmenge und löscht seinen
  bereitgestellten Kontext, sehen Konsumenten den Wert eines Providers, den
  dieselbe Entity noch hält — statt `undefined` oder eines veralteten Werts.
- Hash: eb2339d
- Ergebnis: 3 Runden · beide freigegebenen Regeln umgesetzt und je von einem
  Wächter gehalten · `Entity` führt jetzt Buch über die Provider-Feeds je Name
  und gibt beim Abgang eines Providers den Kontext an den zuletzt angehängten
  lebenden mit Wert weiter, durchgedrückt über `SignalLink.touch()` · dreizehn
  neue Fälle in `Kernel.spec.ts` und `Entity.spec.ts`, elf davon rot vor dem
  Fix · nachgebessert wurden eine dreifach stehende Falschbegründung der
  Rangfolge, ein toter Feed, der die Übergabe gewinnen konnte, und fünf
  weitere Text- und Doku-Stellen
- Nebenbefunde:
  - `Entity.ts` — `[onDestroy]()` zerstört jedes Signal in `#context`, ruft aber
    nie `#context.clear()`, während `#rootContexts.clear()` zwei Zeilen darüber
    steht. Vorbestehend.
    → **Paket 11** (2026-08-20, Planung Paket 5): dieselbe Abbaukette, eine
    Zeile, und seit Paket 9 hält jeder Eintrag zusätzlich sein
    `providerFeeds`-Set; ein eigener Commit für eine Zeile lohnt nicht.
  - `SignalLink.write()` ist `protected`; `touch()` ist der einzige öffentliche
    Weg, einen Link ohne Quelländerung erneut durchzudrücken. Kein Defekt, aber
    der Grund, warum die Umsetzung keine Alternative hatte.
    → **keine Aktion** (2026-08-20, Planung Paket 5): eine Eigenschaft der
    Oberfläche von signalize, nicht dieses Repositories; hier ist nichts zu
    ändern, und die Notiz erfüllt ihren Zweck bereits als Begründung der
    gewählten Umsetzung.
- Folgen:
  - `ShadowObjectCreationScope.tearDown()` bricht bei einem werfenden
    `onDestroy`- oder `clearOnDestroy`-Rückruf ab, bevor
    `#unsubscribeContextFeeds` läuft. Der Feed bleibt dann in der Buchführung
    der Entity und sein Provider-Signal unzerstört — ein totes Shadow Object
    kann die nächste Übergabe gewinnen und einen veralteten Wert durchdrücken.
    Als Leck vorbestehend, als Falschwert neu.
    → **echte Folge** (2026-08-20, Planung Paket 5): der Abbruch selbst ist
    vorbestehend und trifft alle acht Aufräumstufen von `tearDown()`, nicht nur
    die dritte Menge; Paket 9 hat ihn nicht erzeugt, sondern eine weitere Menge
    dahintergehängt und damit aus einem Leck einen Falschwert gemacht. Ein Fix,
    der nur die Feeds rettet, stünde gegen die in Paket 4 entschiedene
    Reihenfolge. Geht als eigenes Paket in **Paket 11**, direkt hinter Paket 5.
- Schnittstellen: `Entity` hat zwei neue Methoden für die Provider-Buchführung
  (`attachContextProvider`, sowie das Gegenstück für den globalen Kontext); sie
  geben eine Freigabe-Closure zurück, die der Scope in
  `#unsubscribeContextFeeds` hält · `EntityApi` in `types.ts` ist ein `Pick` und
  trägt sie nicht, die öffentliche Oberfläche ändert sich also nicht

### [x] 5. Der Logger fasst den Speicher des Consumers nicht mehr ungefragt an

- Findings: ARCH-001 (medium), TYPE-001 (medium)
- Ziel: `ConsoleLogger` schreibt nur noch, wenn tatsächlich gesetzt wird, und
  sein Zugriff auf den Storage-Slot ist typisiert statt unterdrückt.
- Hash: 4f0056a
- Ergebnis: 3 Runden · beide Findings behoben · der Konstruktor liest nur noch,
  geschrieben wird allein über die vier Setter des Handles unter
  `globalThis.ConsoleLogger` · `@ts-ignore` in `ConsoleLogger.ts` 14 → 0, im
  Repository 26 → 11 (der Rest liegt in `ShadowObjectCreationScope.ts`,
  `ShadowObject.ts`, `create-worker.bundle.ts`) · vier neue Wächter, drei davon
  rot vor dem Fix · nachgebessert wurde vor allem eine `declare global`-
  Deklaration, die über `dist/` in den Typraum jedes Consumers geraten wäre
- Nebenbefunde:
  - `packages/shadow-objects/CHANGELOG.md:145` — ein vorbestehender Eintrag
    führt ` -- ` statt des Em-Dashs, den die Datei sonst durchgängig benutzt.
    → **Paket 10** (2026-08-20, Planung Paket 11): trägt, und zwar genauer als
    gedacht. Es ist die einzige Zeile der Datei mit ` -- ` (121 Em-Dashes
    daneben), und derselbe Titel führt das Kürzel `LOW-4` — Paket 10 öffnet
    genau diese Zeile ohnehin, um die Nummer zu ersetzen. Zwei Handgriffe an
    einer Zeile, ein Commit.
  - `Backlog.md`, Abschnitt zu den `any`-Hotspots — die dort genannten Zahlen
    für `Kernel.ts` (~11) und `ShadowObject.ts` (~4) sind ungeprüft; gemessen
    sind es 3 und 2. Nur die Zeile zu `ConsoleLogger.ts` wurde korrigiert.
    → **Paket 8** (2026-08-20, Planung Paket 11): Paket 8 öffnet `Backlog.md`
    bereits, um zwei gemessene Zahlen zu datieren; zwei weitere gemessene Zahlen
    in derselben Datei sind derselbe Handgriff. Nachgemessen (`grep -o '\bany\b'`
    über die drei Dateien): `ConsoleLogger.ts` 6, `Kernel.ts` 3,
    `ShadowObject.ts` 2 — die Zeile zu `ConsoleLogger.ts` stimmt, die anderen
    beiden bekommen ihre Zahl und, wie die Prozentwerte, ihr Messdatum.
  - `ConsoleLogger.ts` — die Fähigkeitsprüfung beim Modulstart deckt den Fall
    »`setItem` gelingt, `removeItem` wirft« nicht ab; der Sondierungsschlüssel
    bliebe dann in der Storage des Hosts liegen. Im Kommentar benannt, nicht
    behoben.
    → **nächstes Audit** (2026-08-20, Planung Paket 11): der Schaden ist ein
    einzelner Schlüssel, und das `catch` außen herum stuft eine Storage, die
    nicht löschen kann, ohnehin als unbrauchbar ein — die offene Frage ist, ob
    das die richtige Einstufung ist, und die entscheidet niemand als Beifang
    eines Teardown-Fixes. Paket 5 hat sie bewusst dokumentiert statt behoben;
    sie jetzt aufzumachen hieße, ein geschlossenes Paket neu zu verhandeln.
- Folgen: keine
- Schnittstellen: neuer Export `setConsoleLoggerStorage(config)` über den
  Subpath `@spearwolf/shadow-objects/ConsoleLogger.js` — der Kopplungspunkt
  zwischen `WorkerRuntime` und dem Logger-Modul, ersetzt den direkten
  `globalThis`-Zugriff · `ConsoleLoggerConfig` und `ConsoleLoggerControl` sind
  über denselben Subpath exportiert · kein globaler Slot mehr in `dist/`

### [x] 11. Der Abbau läuft zu Ende, was immer ein Rückruf wirft

- Findings: — (Folge, kein Audit-Befund)
- Folge von: Paket 9
- Ziel: Ein werfender Rückruf hält den Abbau eines Shadow-Object-Scopes nicht
  mehr auf; der Fehler wird gemeldet statt weitergereicht.
- Hash: d434a3a
- Ergebnis: 3 Runden · alle elf Aufräumstufen laufen je Element isoliert über
  `#runGuarded`, die Reihenfolge aus Paket 4 bleibt unangetastet · zusätzlich
  abgesichert: das zusammengesetzte `createResource`-Cleanup und
  `emit(shadowObject, onDestroy, entity)` in `destroyShadowObject()` ·
  `Entity[onDestroy]()` leert jetzt auch `#context` · neun neue Wächter, acht
  davon rot vor dem Fix · der Fehlerbericht nennt den Namen aus dem Scope statt
  `Object` · nachgebessert wurden fünf zu enge Verweise auf `changeToken()` und
  mehrere Doku-Aussagen
- Nebenbefunde: keine neuen
- Folgen: keine
- Schnittstellen: `ShadowObjectCreationScope` hat einen öffentlichen Getter
  `displayName` (die Klasse ist nicht aus `index.ts` exportiert, die
  veröffentlichte Oberfläche wächst nicht) · `hasContext()` antwortet für eine
  zerstörte Entity jetzt mit `false` · ein werfender Teardown-Rückruf erreicht
  den Aufrufer nicht mehr, sondern den `ConsoleLogger`
- Offen gelassen und dokumentiert: ein Rückruf aus `api.on(onDestroy, …)` läuft
  mit Standardpriorität vor jedem Scope-Teardown; wirft er, fällt der ganze
  Abbau der Entity aus. Das steht in `docs/api-reference.md` und im CHANGELOG,
  behoben ist es nicht — ein Eingriff in die eventize-Semantik gehört nicht in
  dieses Paket. Ebenso der klassenseitige `[onDestroy]`-Hook.

### [x] 6. Das Canvas-Element bekommt Wächter für Transfer und Attribute

- Findings: TEST-002 (medium), erste Hälfte
- Ziel: Canvas-Transfer samt Wiederherstellung nach `contextlost` und das
  Attribut-Handling für `fps` und `pixel-zoom` sind geprüft.
- Hash: 0739b59
- Ergebnis: 2 Runden · Canvas-Suite 7 → 39 Fälle, `ShaeOffscreenCanvasElement.js`
  von 44,55 % auf 94,05 % Statements und von 18 % auf 86 % Branches, das Paket
  von 16,26 % auf 29,81 % · kein Stub nötig, happy-dom implementiert
  `transferControlToOffscreen()` echt · der Reviewer hat die Wächter durch
  Mutation des Produktivcodes geprüft statt durch Lesen und dabei einen
  kritischen Befund gefunden: der Transferblock blieb grün, wenn man den Canvas
  durch einen fremden ersetzte. Behoben über einen Spion, der die Nutzlast an
  den Rückgabewert genau des Aufrufs auf `el.canvas` bindet.
- Nebenbefunde:
  - `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`
    — `[FrameLoop.OnFrame]()` vergleicht `#lastPixelRatio !== pixelRatio`, legt
    in dasselbe Feld aber `pixelRatio / pixelZoom`. Ab `pixel-zoom` über eins
    läuft der Änderungszweig deshalb in jedem Frame: vier wirkungslose
    `setProperty` plus ein `syncShadowObjects()` pro Bild. Die Demo des Pakets
    fährt `pixel-zoom="8"`. Zwei Wächter halten das gemessene Verhalten fest,
    ohne es gutzuheißen; nicht behoben, weil außerhalb des Scopes.
  - Die Aufräum-Closure des Effekts (`:106-109`) ist in happy-dom nicht
    erreichbar — `viewComponent$` bleibt über `remove()`, Wiederverbinden und
    Namensraum-Tausch dieselbe ViewComponent. Als Kommentar in der Spec
    festgehalten, damit die Deckungslücke nicht wie ein Versäumnis aussieht.
- Folgen: keine
- Schnittstellen: keine (reine Testarbeit, kein Laufzeitcode berührt)

### [x] 7. Die Shadow Objects des Canvas-Pakets bekommen Wächter

- Findings: TEST-002 (medium), zweite Hälfte
- Ziel: Frame-Vergleich in der Schleife, Teardown von `ShaeOffscreenCanvas` und
  die Kontextkette der Renderer sind so weit geprüft, wie es ohne WebGL geht.
- Hash: `2b38c05`
- Ergebnis: vier neue Spec-Dateien in
  `packages/shae-offscreen-canvas/src/shadow-objects/`, kein Produktivcode
  berührt (alle acht Produktivdateien byte-identisch zur Baseline geprüft).
  Canvas-Suite 39 → 101 Fälle, `src/shadow-objects/` 0 % → 97,86 % Statements,
  das Paket 29,81 % → 79,67 %; unabgedeckt bleiben `sample/` (61 Statements,
  Vorführmaterial der Demo, über keinen `exports`-Eintrag erreichbar), drei
  Einstiegsmodule (4) und `ShaeOffscreenCanvas.js:125,135` sowie
  `ThreeMultiViewRenderer.js:83-84`. Gefahren wird gegen einen echten
  `LocalShadowObjectEnv` mit eigener Registry; ersetzt ist allein die
  WebGL-Hälfte von `three` (`vi.mock('three', importOriginal)`) und
  `requestAnimationFrame`. Der Reviewer hat 41 Mutanten nachgefahren, alle
  sterben weiterhin; Unabhängigkeit über drei Shuffle-Läufe und vier
  Einzelläufe belegt. Kein CHANGELOG-Eintrag: kein Laufzeitcode, keine
  öffentliche Oberfläche, und `build.mjs:17` filtert Spec-Dateien beim Kopieren
  nach `.npm-pkg` heraus.
- Drei Fälle tragen die Marke »Measured, not endorsed«, halten also heutiges
  Fehlverhalten fest statt richtiges Verhalten. Wer die betroffene Stelle
  repariert, macht sie rot und soll das absichtlich tun:
  1. Der Kanal zur View überlebt den Abbau: `dispatchMessageToView` ist danach
     weiterhin eine Funktion, `canvasRequested` trägt seinen letzten Wert.
  2. `ThreeMultiViewRenderer` gibt seinen WebGL-Renderer nie frei (siehe
     Nebenbefund unten).
  3. Der Abbau von `ThreeRenderView` kostet eine überzählige Ansicht:
     `createView` und `destroyView` laufen je zweimal statt je einmal, weil
     `ThreeRenderView.js:80-82` beim Abbau `undefined` ins Ansichtssignal
     schreibt, während Renderer- und Größenkontext noch stehen.
- Nebenbefunde (alle drei gemessen, keiner behoben, weil außerhalb des Scopes):
  - `ThreeMultiViewRenderer.onDestroy()` wird nie erreicht — der Kernel ruft den
    Symbol-Hook. Der WebGL-Renderer wird damit nie freigegeben.
  - Der explizite `onDestroy`-Block in `CanvasRenderingContext.js:29-31` ist von
    der Räumung, die der Kernel unter `clearOnDestroy` ohnehin vornimmt, durch
    keinen Wächter zu trennen: er bliebe grün, wenn man den Block löscht.
    Deshalb steht dort bewusst kein Fall »räumt seinen Kontext beim Abbau«.
  - `new FrameLoop(90)` in `ShaeOffscreenCanvas.js:26` ist tot. Der Effekt
    überschreibt `maxFps` schon bei der Konstruktion mit 60; die 90 sind nie
    wirksam und nur noch als Kontrast im fps-Wächter sichtbar.
- Folgen: keine
- Schnittstellen: keine (reine Testarbeit, kein Laufzeitcode berührt)
- Verlauf: Zug 3 fand 1 kritischen, 3 wichtige und 6 kleine Befunde; Runde 1
  erledigte sieben davon, zwei durch begründetes Streichen (der Implementierer
  wies mit eigenen Messungen nach, dass die Zeilen verhaltensneutral sind, weil
  `FrameLoop` selbst idempotent ist — vom Reviewer nachgefahren und bestätigt).
  Der letzte Befund kostete eine dritte Runde, weil Befund und Gegenprüfung
  verschiedene Stellen meinten; der Reviewer legte seine Sonde offen, ein
  frischer Implementierer reproduzierte sie und schrieb den dritten
  »Measured, not endorsed«-Fall. Ein kleiner, ausdrücklich nicht blockierender
  Befund bleibt offen: zwei benachbarte Kommentare in
  `ThreeRenderView.spec.js:187-192` und `:204-209` erklären denselben
  überzähligen Umlauf zweimal.
### [x] 8. Der Coverage-Nachtrag: gekoppelte Versionen, datierte Zahlen

- Findings: — · Folge von: Paket 2
- Ziel: Die vier vitest-Einträge im Catalog können nicht mehr auseinanderlaufen,
  und die gemessenen Zahlen im Backlog stimmen und tragen ihr Datum.
- Hash: `6452b29`
- Ergebnis: `vitest`, `@vitest/browser` und `@vitest/browser-playwright` wechseln
  vom Caret zur exakten Version und schließen zu `@vitest/coverage-v8` auf, das
  schon so dastand. Alle vier lösen vorher wie nachher auf 4.1.10 auf; der
  `pnpm-lock.yaml`-Diff ist exakt drei `specifier:`-Zeilen im Block
  `catalogs: default:`, keine Importer-Zeile und keine aufgelöste Version bewegt
  sich. Der lange Kommentar über `@vitest/coverage-v8` ist zu einem
  Gruppenkommentar über allen vieren geworden. In `Backlog.md` sind die Zahlen der
  Abschnitte 4.1, 4.2 und 5.3 neu gemessen statt datiert, 4.2 hat eine Zeile für
  `shae-offscreen-canvas` bekommen und 4.1 einen Eintrag für dessen Suite. Ein
  Punkt im Wurzel-`CHANGELOG.md`.
- Der Caret war ein offener Riss, kein Theoriefall. `latest` von `vitest` steht
  heute auf 4.1.11. Nachgestellt in einer Kopie unter dem Scratchpad (Caret
  zurückgesetzt, Lockfile gelöscht, `pnpm install --lockfile-only`): die Gruppe
  zerreißt über zwei Patch-Stände, `vitest` und die beiden Browser-Pakete landen
  auf 4.1.11, `@vitest/coverage-v8` bleibt auf 4.1.10, `@vitest/utils` steht
  zweimal im Lockfile, und pnpm verlinkt den außerhalb seiner Range liegenden
  Peer trotzdem — sein eigenes Wort dafür ist »unmet peer«. Mit allen vieren
  exakt: »No peer dependency issues found«.
- Korrigierte Zahlen (alle vom Reviewer unabhängig nachgemessen): Kernpaket
  69,88 % Statements bei 632 Fällen (stand als 69,21 % und 624 Fälle da),
  `shae-offscreen-canvas` 79,67 % bei 101 Fällen (stand als 16,26 % da),
  `any`-Hotspots 6/2/2 statt ~6/~11/~4, Biome 0 Warnungen und 1 Info statt
  ~30 Warnungen und 2 Infos.
- Nebenbefunde:
  - Die Zählregel für `any` gehört zur Zahl: gezählt werden Typvorkommen,
    Fließtext-Treffer bleiben draußen. Die frühere Nachmessung kam auf 3 statt 2
    für `Kernel.ts`, weil sie das englische Wort in einem Kommentar (`:317`)
    mitzählte. Die Regel steht jetzt neben der Zahl im Backlog.
  - `Backlog.md:277/279` führen zwei Absätze mit demselben fetten Vorspann
    `**vitest**`, während die beiden folgenden ihr Verzeichnis nennen. Rein
    optisch, vom Reviewer als nicht blockierend eingestuft, bewusst nicht
    behoben.
  - Die version-exakte Vierergruppe verhält sich funktional wie ein dritter
    Holdback, ist aber keiner: `AGENTS.md` und `CLAUDE.md` sprechen von
    Einträgen, die man nicht heben soll, während der Kommentar hier »Bump all
    four together« sagt. Kein Widerspruch, deshalb kein Nachzug in die beiden
    Dateien — was fehlt, ist die Entsprechung zum eventize/signalize-Absatz in
    `CLAUDE.md`: eine zweite gekoppelte Gruppe, von der ein Leser dieser Datei
    nichts erfährt. Außerhalb der Paketgrenze.
- Folgen: keine
- Schnittstellen: keine (kein Laufzeitcode, keine veröffentlichte Oberfläche)
- Entschieden (2026-08-20, Orchestrator): Die falschen Lint-Zahlen in den
  Abschnitten 5.3 und 7.3 gehen in dieses Paket, obwohl sie nicht im Grobplan
  standen. Derselbe Defekt, dieselbe Datei, zwei Zeilen unter den
  `any`-Hotspots. Ebenso der fehlende Eintrag der Canvas-Suite in 4.1.
- Entschieden (2026-08-20, Orchestrator): Die alten Laufnummern in der
  Wurzel-`CHANGELOG.md` (`:108`, `:231`) und die rund 25 nummerierten Zeilen im
  `Backlog.md` bleiben stehen. Der Backlog ist für seine eigenen Nummern das
  ausgebende Artefakt, und die Nummern in den alten CHANGELOG-Abschnitten tragen
  ihre Auflösung im selben Satz. Paket 10 nimmt sich die Stellen vor, an denen
  eine Nummer ohne ihre Auflösung dasteht — das ist eine andere Menge.
- Keine Kollision mit Paket 10 (2026-08-20, auf Zeilenebene geprüft): Paket 8
  schreibt in `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `Backlog.md` und die
  Wurzel-`CHANGELOG.md`; Paket 10 in `packages/shadow-objects/CHANGELOG.md` und
  in Specs unter `src/`. Kein gemeinsamer Pfad.
- Verlauf: Runde 0 lieferte die Konfiguration tadellos und legte sich zwei
  falsche Sätze daneben — der Kommentar behauptete, vitest deklariere alle vier
  Satelliten zurück (`@vitest/browser` steht nicht in seinen
  `peerDependencies`, es hängt als harte Dependency unter
  `@vitest/browser-playwright` und als optionaler Peer unter
  `@vitest/coverage-v8`), und der CHANGELOG-Eintrag sagte im selben Satz »vier
  Einträge wechseln vom Caret« und »drei `specifier:`-Zeilen«. Runde 1 hat
  beide sachlich behoben. Auf Ansage des Orchestrators hat der Reviewer danach
  die zwei Sätze nachgestellt, die er zuvor nur gelesen hatte.
### [x] 10. Tote Laufnummern verlassen die dauerhaften Dateien

- Findings: — · Folge von: Paket 4 (Nebenbefund), nachgeschärft in Paket 9
- Ziel: Kein Artefakt, das den Lauf überdauert, führt noch die Laufnummer eines
  Audits. Die Aussage dahinter steht ausgeschrieben da, wo die Nummer stand.
- Hash: `04e953c`
- Ergebnis: 39 Nummern auf 35 Zeilen in 6 Dateien entfernt —
  `packages/shadow-objects/CHANGELOG.md` (28 Nummern auf 25 Zeilen), sieben
  `describe`-Namen in `Kernel.spec.ts`, `Registry.spec.ts:59`, der Kommentar in
  `Kernel.ts:384-386` und zwei Stellen im e2e-Paket
  (`tests/auto-destruct.spec.ts`, `pages/auto-destruct.html`). Dazu die zwei
  einzigen ` -- ` der CHANGELOG-Datei, die sonst durchgängig Em-Dashes setzt.
  Verhaltensneutral belegt: jede geänderte Zeile unter `src/`, `tests/` und
  `pages/` ist Kommentar, `describe`-Argument oder `<title>`; die vier
  Fallzahlen stehen unverändert bei 632, 101, 345 und 426; die Ausgabe unter
  `dist/` ist identisch, weil esbuild den Kommentar ohnehin verwirft.
- Die sieben Stellen, an denen mehr als eine Streichung nötig war, hat der
  Paket-Planer ausgeschrieben und der Reviewer einzeln gegengeprüft:
  `Kernel.ts:384-386` begründet jetzt die Reihenfolge selbst (ein Wurf nach dem
  Ablösen ließe die Entity ohne jeden Elternteil zurück statt mit dem, mit dem
  sie hereinkam — am Code verifiziert); `CHANGELOG.md:201` verliert seinen
  Zeiger ersatzlos, weil die Tatsache dahinter im selben Satz schon dasteht;
  `:203` benennt statt der Nummer das Symbol der View-Seite
  (`ComponentMemory.setParent()`, am Code verifiziert); `:300` löst fünf
  referenzierte Fixes gegen den Text der Einträge auf, alle fünf vom Reviewer
  einzeln gegen ihre Zeile gehalten.
- Drei Mengen bleiben stehen, jede weil ihr ausgebendes Artefakt lebt und jede
  Nummer samt Auflösung im selben Satz nennt: die alten Abschnitte der
  Wurzel-`CHANGELOG.md`, die nummerierten Zeilen in `Backlog.md`, und das
  Fall-Register des e2e-Pakets (`TEST-PLAN.md` mit 143 Kennungen,
  `KNOWN-DEFECTS.md`, alle Verweise darauf in `src/`, `tests/`, `pages/` sowie
  `packages/shadow-objects-testing/src/mount.js`). `./audit.html` bleibt
  unangetastet und wird in Schritt 7 gesondert nachgeführt.
- Waisenprobe: jede im e2e-Paket verwendete Kennung gegen das Register gehalten
  (`comm`). Vor dem Paket eine Waise — `KERN-1`, das in `TEST-PLAN.md` null
  Treffer hat — an zwei Stellen. Danach keine.
- Nebenbefunde:
  - Zwei e2e-Fälle sind lastempfindlich: `multi-env-simultaneous-changes-*`
    fielen dem Reviewer unter Firefox mit einem `page.goto`-Timeout aus, als er
    die Suite parallel zu Lint, Typecheck und Build fuhr. Einzelnachlauf 34/34
    grün, saubere Gesamtläufe 426/426 grün, dreimal unabhängig (Reviewer,
    Orchestrator). Keine Regression dieses Pakets, aber eine Stelle, an der eine
    ausgelastete CI rot werden kann.
  - `Backlog.md` führt 67 Nummern auf 60 Zeilen, nicht die im Kopf dieses Blocks
    geschätzten »rund 25«. Menge B, nicht angefasst; nur damit ein künftiger
    Lauf die Größenordnung kennt.
  - `Kernel.ts:384` sagt »resolved«, während an genau dieser Zeile eine
    Existenzprüfung steht; die eigentliche Auflösung folgt im Block darunter.
    Beide liegen vor der Ablösung, die Aussage ist also nicht falsch, nur eine
    Spur weiter als der Code an dieser Stelle. Vom Reviewer als »kein
    Änderungsbedarf« eingestuft.
- Folgen: keine
- Schnittstellen: keine (kein Verhalten, keine öffentliche Oberfläche, `dist/`
  byte-gleich)
- Verlauf: eine Runde, keine Befunde über »klein« hinaus. Der Implementierer hat
  eine Nummer behoben, die die Umsetzungstabelle des Detailplans nicht führte
  (`KERN-8` im Vorspann von `CHANGELOG.md:203`), und das offengelegt statt es
  stillschweigend zu tun. Der Reviewer hat nachgerechnet: die gemessene
  Fundlage des Planers zählte 28 Nummern und hatte die Stelle erfasst, nur seine
  Tabelle nicht. Keine Paketgrenze überschritten, eine Tabellenlücke
  geschlossen — ohne sie hätte das Paket sein eigenes Ziel um eine Nummer
  verfehlt.

### [x] 12. Der Vorspann zählt, was unter ihm steht

- Findings: — · Folge von: Paket 11
- Ziel: Die Zahl im `[Unreleased]`-Vorspann des Paket-CHANGELOG nennt so viele
  Posten, wie darunter aufgezählt sind.
- Herkunft: im Abschluss gefunden, nicht im Review eines Pakets. `packages/
  shadow-objects/CHANGELOG.md:13` sagt »Thirty-five changes reach existing
  consumers«, die Aufzählung dahinter führt siebenunddreißig.
- Gemessen (2026-08-20, Orchestrator): Die Aufzählung im Blockzitat trennt ihre
  Posten mit Semikolon. Zählt man sie über sechs Commits hinweg, geht die Zahl
  im Vorspann exakt mit: `5439845` 32, `1a092c0` 32 (Paket 3 trug nichts in das
  Blockzitat ein), `5950e00` 33, `eb2339d` 34, `4f0056a` 35 — und dann
  `d434a3a` 37, während der Vorspann bei »Thirty-five« stehenblieb. Paket 11 hat
  zwei Posten ergänzt (den werfenden Teardown-Rückruf und den werfenden
  `onDestroy`-Listener eines fremden Shadow Objects) und die Zahl nicht
  mitgezogen.
- Vorgehen:
  1. Die Zählung **selbst** nachvollziehen, statt die obige zu übernehmen: der
     Umsetzer zählt die Posten im Blockzitat und prüft die Zahl an mindestens
     zwei der genannten Commits gegen, damit die Zählregel belegt ist und nicht
     bloß behauptet.
  2. `packages/shadow-objects/CHANGELOG.md:13`: das Zahlwort auf den gemessenen
     Wert setzen, in derselben ausgeschriebenen Form wie bisher.
  3. Sonst keine Zeile. Kein neuer Eintrag, keine Umformulierung der Posten,
     keine Änderung an der Semver-Aussage (»Next release: minor«, `0.33.0` →
     `0.34.0`) — die trägt unverändert, weil unter `1.0.0` jede Zahl brechender
     Änderungen dieselbe Stelle hebt.
- Verify: `pnpm lint`. Kein Test berührt, kein Laufzeitcode, `dist/` unverändert.
- Kein CHANGELOG-Eintrag über diese Änderung: das CHANGELOG korrigiert seine
  eigene Zahl, ein Eintrag darüber wäre eine Zeile über eine Zeile.
- Modell: günstigste Stufe (ein Zahlwort, die Fundstelle benannt, die Zählregel
  im Plan)
- Hash: `29976d1`
- Ergebnis: »Thirty-five« → »Thirty-seven«, eine Zeile, sonst nichts. Der
  Umsetzer hat unabhängig gezählt (36 Semikolons = 37 Posten) und die Zählregel
  an zwei älteren Ständen gegengeprüft: `eb2339d` 34 Posten bei »Thirty-four«,
  `4f0056a` 35 bei »Thirty-five«. Der Orchestrator hatte vorher denselben Wert
  über sechs Commits hergeleitet; zwei unabhängige Zählungen stimmen überein.
- Kein eigener Reviewer: die Änderung ist ein Zahlwort, ihre Grundlage sind zwei
  unabhängig gefahrene Zählungen mit historischen Gegenproben, und der
  Orchestrator hat den Diff selbst gelesen (`git diff` zeigt genau eine Zeile)
  und `pnpm lint` gefahren. Das ist im Plan vermerkt, damit niemand einen
  ausgefallenen Zug für ein Versehen hält.
- Nebenbefund, nicht behoben: `summary.scoreHistory` in `./audit.html` führt den
  Punkt vom 2026-08-20 mit `source: "remediation"`, obwohl er aus dem Audit
  dieses Datums stammt. Fremde Buchhaltung, gehört dem Audit-Skill.
- Folgen: keine
- Schnittstellen: keine
