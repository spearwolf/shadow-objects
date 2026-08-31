# Remediation-Plan — @spearwolf/shadow-objects (Monorepo)

Quelle: ./audit.html vom 2026-08-31 · Branch: main · erstellt: 2026-08-31
Baseline: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test` ✓
(zweimal gefahren, einmal mit `--force` gegen den Turbo-Cache; keine vorbestehenden Fehler)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/b4d54371-4b03-477b-afa6-ae6f7b1bca67/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 21 von 47 Findings (0 critical, 0 high, 4 medium, 4 low, 13 info) · ausgenommen: acknowledged, Doku- und Kosmetik-Findings
Scope-Regel: die vom Nutzer benannten IDs, plus jeder Befund, der im Lauf auffällt und Korrektheit, Ressourcen, Performance, Typsicherheit oder Wartbarkeit des Kernpakets betrifft — unabhängig von der Severity. Reine Doku-, DX- und Kosmetik-Befunde gehen als neues Finding ins Audit.
Ziel des Laufs: den Core in eine stabile, performante und wartbare Basis überführen.
Stand (2026-08-31): **abgeschlossen.** 15 Pakete, 15 Commits (4dc6e5b … b318a46), kein Paket blockiert, Befund-Queue leer, keine unverteilte Folge. Voller Verify-Lauf ohne Turbo-Cache grün (Lint, Typecheck, Build, Tests; Coverage 94,19 % der Anweisungen gegenüber 93,64 % zu Lauf-Beginn). Semver: die Änderungen heben die Minor-Stelle des Kernpakets, `0.33.0` → `0.34.0`; die Versionsfelder bleiben unangetastet, weil dieses Projekt erst beim Release anhebt und bis dahin unter `## [Unreleased]` sammelt. Das Canvas-Paket bleibt patch. `./audit.html` ist nachgeführt: Score 74,5 → 90, 22 Findings geschlossen, 3 neu.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen

- **Scope-Regel für neue Befunde** (2026-08-31): Core-Substanz, jede Severity —
  Korrektheit, Ressourcen, Performance, Typsicherheit, Wartbarkeit des
  Kernpakets werden mitgenommen; Doku, DX und Kosmetik gehen ins Audit zurück.
- **ConsoleLogger** (2026-08-31): Der Schalter wandert in die Methode. `debug()`
  prüft `isDebug`, `info()` prüft `isInfo`, `warn()` prüft `isWarn`, `error()`
  bleibt ungefiltert. Das ist eine Verhaltensänderung für Konsumenten des
  exportierten `ConsoleLogger`; Doku, README und CHANGELOG des Kernpakets ziehen
  mit, und die Klammern an den Aufrufstellen fallen weg, wo sie nur gaten.
- **Change Trail** (2026-08-31): Die dritte Eigenschaftsform »gesetzt, ohne
  Wert« wird in diesem Lauf darstellbar gemacht — eigenes Paket, mit Tests auf
  beiden Seiten des Protokolls.
- **Elementstruktur** (2026-08-31): Beide Architekturbefunde voll. Slot-Register
  und `dispatchEvent`-Patch verlassen `ShaeEntElement` je in ein eigenes Modul,
  und der Element-Lebenszyklus bekommt eine gemeinsame Basis, von der
  `ShaeElement` und `ShaePropElement` beide erben. Verhalten bleibt unverändert.
- **Paketschnitt nachgeschärft** (2026-08-31): Die beiden Extraktionen aus
  `ShaeEntElement` — Slot-Register und `dispatchEvent`-Patch — laufen als ein
  Paket statt als zwei. Beide sind reine Verschiebungen ohne Verhaltensänderung
  in derselben Datei; ein Commit trägt sie. Der gemeinsame Element-Lebenszyklus
  bleibt getrennt: er fasst andere Dateien an und ändert eine Vererbungslinie,
  unter der `ShaeEntElement` selbst steht.
- **Nebenbefund aus Paket 3 kommt in den Lauf** (2026-08-31): Der Provider-Wechsel
  ohne Umweg über `null` in `ThreeRenderView` wird als Paket 3a behoben, statt als
  neues Finding ins Audit zu gehen. Er liegt außerhalb der Scope-Regel — anderes
  Paket —, ist aber der Zwilling des Befunds, den Paket 3 geschlossen hat.
- **Zweiter Nebenbefund aus Paket 4 kommt in den Lauf** (2026-08-31): Die drei ins
  Leere zeigenden `{@link …}` in der TSDoc von `ComponentChanges` werden als Paket 10
  behoben, statt ins Audit zu gehen. Reine Doku-Kosmetik und damit außerhalb der
  Scope-Regel, aber billig und im selben Lauf erledigt.
- **Paket 5, CHANGELOG-Durchgang** (2026-08-31): Der Logger-Vertrag steht im
  `[Unreleased]`-Abschnitt des Kernpaket-CHANGELOGs an mindestens fünf Stellen, und
  die Review-Runden haben ihn schichtweise abgetragen statt am Stück. Er wird in
  einem einzigen geschlossenen Durchgang über den ganzen Abschnitt in Deckung
  gebracht, im selben Paket — nicht in einer weiteren Runde und nicht in einem
  eigenen Paket. Der geprüfte Code aus `stash@{0}` wird dafür zurückgeholt, nicht
  neu gebaut.
- **Drain der Befund-Queue vorgezogen** (2026-08-31): Die acht offenen Nebenbefunde
  sind beschlossen, statt bis Schritt 7 zu warten. Vier fallen unter die Scope-Regel
  und bekommen die Pakete 9a (Korrektheit in `ComponentContext`) und 9b (`forwardCustomEvents`).
  Drei Kosmetika gehen auf Nutzerwunsch nach Paket 10, obwohl die Regel Doku und Kosmetik
  nicht aufnimmt. Der letzte — die drei `WeakRef`-Zweige in `hostedSlots.ts` — bleibt beim
  Urteil »Audit«: kein Test kann eine Einsammlung durch die Garbage Collection erzwingen,
  und ein Test, der auf sie hofft, ist schlimmer als keiner.
- **Der Link-Durchgang wird geschnitten** (2026-08-31, Drain-Runde): Paket 10 hat vier
  tote `{@link}` in `ComponentChanges` geheilt; dieselbe Sorte steht dreizehnmal in sechs
  weiteren Dateien. Der Runner hatte »Audit« geurteilt, weil ein Durchgang über das ganze
  Paket ein eigener Schnitt ist und keine Zugabe zu einem Kosmetik-Paket. Das Argument
  trägt — und wird von seinem eigenen zweiten Satz geschlagen: wer eine von sieben gleichen
  Stellen heilt, hinterlässt sechs, die aussehen, als hätte sie jemand geprüft und behalten.
  Also Paket 11 statt Audit.
- **BUG-001 ist bereits behoben** (2026-08-31, vorgefunden): Das Audit führt den
  einzigen high-Befund — die ungeschützte Zustellung in `FrameLoop.#onFrame` —
  als offen. Commit 2d874fc hat ihn geschlossen; die Zeile steht heute auf
  `emitSafe()`. Kein Paket, aber ein Eintrag für den Abschluss in Schritt 7.

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

- **Sprache:** Code, Kommentare, Doku und Commit-Messages ausnahmslos Englisch.
  Der Stil der Commit-Messages steht in `git log`: Conventional-Commit-Präfix,
  danach ein aussagender Satz in Kleinschreibung, kein Telegrammstil
  (`feat: a listener that throws costs itself and nothing else`).
- **Terminologie:** ECS-Begriffe. Verboten sind »shadow theater«, »puppet«,
  »puppeteer«, »light world« und »screen« als Analogie. Bindend außerdem:
  `RemoteWorkerEnv` (nicht `RemoteShadowObjectEnv`), Entity (nicht Shadow
  Entity), Entity Tree (nicht Shadow Entity Graph), Token (nicht Component Tag).
  `ComponentContext` wird ausgeschrieben; das Dependency-Injection-Konzept heißt
  »Entity Context«.
- **Changelogs:** Jede Änderung trägt sich dort ein, wo sie hingehört —
  `packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]` für alles am
  Kernpaket, `packages/shae-offscreen-canvas/CHANGELOG.md` für das Canvas-Paket,
  das Wurzel-`CHANGELOG.md` (datierter Abschnitt) für Build, Testrunner, Lint
  und Monorepo-Werkzeug. Trifft eine Änderung mehrere, wird jede Seite aus ihrer
  eigenen Perspektive beschrieben.
- **Öffentliche API:** Eine Änderung daran fasst im selben Zug `docs/`,
  `README.md` und `CHANGELOG.md` des betroffenen Pakets an.
- **Auslieferungsvertrag:** Ändert sich die Dateiliste unter `dist/` oder die
  Gestalt von `dist/package.json`, werden `src/distContract.files.txt` und
  `src/distContract.package.json` mitgeführt.
- **TODOs:** Wird ein `TODO`-Kommentar angelegt, geändert oder entfernt, läuft
  `pnpm make:todo`.
- **`AGENTS.md`:** Nach einer Änderung an Quellen oder Doku gegenlesen und
  nachziehen, statt es später nachzurüsten.
- **Verify:** `pnpm lint && pnpm typecheck && pnpm build && pnpm test`. Bei
  Paketen, die nur eine Suite berühren, reicht der gezielte Lauf für die
  Zwischenrunden — vor dem Commit läuft die volle Kette.

## Vorbestehende Fehler

Keine. Lint, Typecheck, Build und die volle Testkette waren vor Lauf-Beginn grün,
die Testkette auch mit umgangenem Turbo-Cache.

## Offene Befunde

Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

**Ungeklärte Änderung an diesem Abschnitt und am Restplan (2026-08-31, notiert von Paket 9).**
Zu Beginn von Zug 1 an Paket 9 standen hier acht Einträge auf `[ ]`, und der Restplan kannte die
Pakete 9a und 9b nicht — beides ist geprüft, nicht erinnert. Nach Zug 4 standen sieben davon auf
`[x]`, die Pakete 9a und 9b existierten, und Paket 10 hatte drei Findings dazubekommen. Paket 9 hat
das nicht geschrieben, und keiner der vier Reports dieses Pakets erwähnt es. Zwei Dinge daran
brauchen eine Entscheidung, und zwar beim Abschluss, nicht hier: erstens schneidet ein Runner laut
Skill für einen Nebenbefund kein Paket — das tut die Drain-Runde, weil dort alle Befunde des Laufs
nebeneinanderliegen; zweitens nimmt Paket 10 jetzt drei Einträge auf, die ihr eigenes Urteil an der
Scope-Regel mit `→ Audit` aus dem Lauf hinausgebucht hatte. Umgekehrt sind 9a, 9b und 10 als Schnitt
plausibel und decken die sieben Einträge vollständig ab. Deshalb bleibt der Stand, wie er ist, statt
zurückgedreht zu werden: eine Rücknahme wäre selbst eine Entscheidung, die niemand getroffen hat.
Der Abschluss prüft die drei Pakete gegen die Scope-Regel und die Urteile in diesem Abschnitt.

**Nachtrag (2026-08-31, Zug 0 von Paket 9a).** Dasselbe ist während dieses Zuges noch einmal geschehen.
Paket 9c steht neu im Restplan, die beiden Einträge zu `ShaeElement.ts:201` und
`forwardCustomEvents.ts:77` sind von »Audit« auf »Scope, Paket 10« umgeschrieben, und Paket 10 führt sie
jetzt als (d) und (e). Zug 0 hat nichts davon geschrieben und mit niemandem darüber gesprochen; der Stand
ist übernommen, wie er dasteht, aus demselben Grund wie oben. Der Abschluss prüft Paket 9c und die beiden
umgeschriebenen Urteile mit. Was Zug 0 von Paket 9c dazu beitragen kann: der Schnitt trägt. Die beiden Befunde,
die 9c führt, stehen unverändert im Code, sie teilen die Datei nicht mit Paket 10 an derselben Stelle, und keiner
von beiden gehört in ein anderes offenes Paket. Über die Frage, ob ein Runner sie hätte schneiden dürfen, sagt das
nichts — nur darüber, ob der Schnitt hält.

- [x] `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js:41-47` — der Effekt,
  der die View hält, erneuert sie nur, wenn keine da ist. Wechselt `ThreeMultiViewRendererContext`
  von einem Renderer geradewegs auf einen anderen, ohne durch `null` zu gehen, bleibt die gehaltene
  View die des ersten Renderers, und nur ihre `width`/`height` werden geschrieben. Der
  Aufräum-Effekt darunter (Zeile 57-66) zerstört sie im selben Lauf beim alten Renderer, sodass von
  da an jeder Frame eine zerstörte fremde View an den neuen reicht — der sie mit `not my view`
  ablehnt. Erreichbar nur, wo ein näherer Provider auftaucht, während ein äußerer noch steht;
  nichts in diesem Repository stellt das her, und ein Token-Wechsel an der bereitstellenden Entity
  geht durch `null` und erneuert die View korrekt. Gefunden in Zug 0 von Paket 3, vorbestehend
  (`git show 78b2e64~1:…` zeigt dieselben Zeilen). Geschätzte Severity: low. → Scope, Paket 3a
  (Nutzerentscheidung vom 2026-08-31: der Befund ist der Zwilling des gerade behobenen und wird
  in diesem Lauf mit erledigt, obwohl die Scope-Regel nur das Kernpaket aufnimmt).
- [x] `packages/shadow-objects/src/view/ComponentChanges.ts:45`, `:46`, `:129` — die Klassen-TSDoc
  verlinkt `{@link ViewComponent}`, `{@link ComponentContext.addComponent}` und
  `{@link ComponentContext.reCreateChanges}`. Keines der beiden Symbole wird in dieses Modul
  importiert — die Abhängigkeit läuft in die andere Richtung —, also lösen die Links in einer
  generierten Referenz ins Leere. Gefunden in Paket 4, vorbestehend. Geschätzte Severity: info.
  → Scope, Paket 10 (Nutzerentscheidung vom 2026-08-31: mitnehmen, obwohl die Scope-Regel
  reine Doku-Kosmetik nicht aufnimmt).
- [x] `packages/shadow-objects/src/view/ComponentMemory.ts:17` — `order?: number` ist optional
  deklariert, obwohl kein Schreibpfad das Feld je auslässt: `createEntity()` und `updateOrder()`
  schreiben beide `order ?? 0`, `setParent()` überschreibt nur bei definiertem Wert. Der Typ
  verspricht ein `undefined`, das nie ankommt, und zwingt jeden Leser von `ComponentState` zu
  einem toten Zweig. Gefunden in Paket 4, vorbestehend (`git show f971e40:…` zeigt dieselbe
  Zeile). Geschätzte Severity: info. → Scope, Paket 6 (teilt die Ursache mit dessen sechs Findings:
  ein Typ, den das Projekt kennt, steht nicht da).
- [x] `packages/shadow-objects/src/utils/waitForMessageOfType.ts:28` — der optionale Guard nimmt seinen
  Payload als `(data: any) => boolean`, obwohl beide Aufrufer ihn typisiert übergeben:
  `view/RemoteWorkerEnv.ts:364` mit `AppliedChangeTrailEvent`, `:397` mit `ImportedModuleEvent`. Das `any`
  nimmt der einzigen Stelle die Prüfung, an der eine Änderung an einem der beiden Event-Typen auffiele.
  Gefunden in Zug 0 von Paket 6, vorbestehend (`git show f971e40:…` zeigt dieselbe Zeile). Geschätzte
  Severity: info. → Scope, Paket 6 (teilt dessen Ursache und steht in einer Datei, die es ohnehin aufmacht).
- [x] `packages/shadow-objects/src/utils/waitForMessageOfType.ts:46`, `:66` — das Timer-Handle ist als
  `number` deklariert, und der Rückgabewert von `setTimeout()` wird nach `any` gecastet, um in diese
  Deklaration zu passen. In diesem Projekt trifft `setTimeout` die Node-Signatur und liefert kein `number`;
  der Cast schaltet die Prüfung auf der Zeile ab, statt den Typ zu nennen, den die Funktion selbst schon
  angibt. Gefunden in Zug 0 von Paket 6, vorbestehend (`git show f971e40:…` zeigt dieselben Zeilen).
  Geschätzte Severity: info. → Scope, Paket 6 (dieselbe Ursache wie der Cast in `cloneChangeTrail.ts`).
- [x] `packages/shadow-objects/src/view/ComponentContext.ts:384-397` und `:400-406` — beide Methoden
  hängen die Komponente bedingungslos an `#rootComponents` an, nehmen sie aber nur bedingt aus der
  Kinderliste heraus, in der sie steht. In `removeFromParent(component, parent)` steht der Abgang
  unter `parentEntry.children.delete(...)`, das Anhängen darunter nicht: wird die öffentliche Methode
  mit einem `parent` gerufen, der nicht der Elternteil ist, bleibt die uuid in der Kinderliste ihres
  echten Elternteils stehen **und** steht zusätzlich unter den Wurzeln — danach sagen
  `isRootComponent(child)` und `isChildOf(child, echterElternteil)` beide `true`. `moveToRoot()` hat
  dieselbe Form ohne jede Bedingung. Über den bibliothekseigenen Weg
  (`ViewComponent.removeFromParent()`) ist es nicht erreichbar, denn der reicht immer den echten
  Elternteil durch; über die öffentliche Fläche des `ComponentContext` schon. Dieselbe Ursache trägt
  die Lücke, die `getChildren()` und `#appendToOrdered()` beide beschreiben: eine Kinderliste kann
  eine uuid halten, deren Komponente nicht auf sie zurückzeigt. Gefunden in Paket 7, vorbestehend
  (`git show f971e40:…` zeigt dieselbe Asymmetrie, nur mit `removeFrom()` statt `delete()`).
  Geschätzte Severity: low. → Scope, Paket 9a (Korrektheit des Kernpakets, und die Scope-Regel nimmt sie in
  jeder Severity auf).
- [x] `packages/shadow-objects/src/elements/forwardCustomEvents.ts:38` — `originalDispatchEvent`
  wird berechnet, bevor der frühe Ausstieg bei leerem Filter greift: ein `Object.hasOwn` und je
  nachdem ein `getPrototypeOf` laufen für nichts, sobald `forward-custom-events` ohne Wert
  dasteht. Folgenlos, aber tote Arbeit auf einem Pfad, den jede `<shae-ent>` ohne Weiterleitung
  nimmt. Gefunden in Paket 8, vorbestehend — die Zeilen sind aus `ShaeEntElement.ts:315-317`
  wörtlich mitgereist und stehen seit der Lauf-Basis `f971e40` unverändert. Geschätzte Severity:
  info. → Scope, Paket 9b (Ressourcen des Kernpakets, und die Scope-Regel nimmt sie in jeder Severity auf).
- [x] `packages/shadow-objects/src/elements/forwardCustomEvents.ts:17`, `:19` — die beiden
  Rückgabezweige von `isSameFilter` für »zwei Set-Filter mit unterschiedlichen Listen« werden von
  keiner Suite erreicht, Unit wie Integration je null Treffer. Der ganze Pfad »beim Connect steht
  im Attribut ein anderer Filter als im Signal« ist damit ungedeckt, obwohl zwei
  `<shae-ent>`-Attributschreibungen mit verschiedenen Listen genügen würden. Gefunden in Paket 8,
  vorbestehend (wörtlich aus `ShaeEntElement.ts:115-132` mitgereist). Geschätzte Severity: info.
  → Scope, Paket 9b (eine ungeprüfte Verzweigung im Kernpaket ist Wartbarkeit, und sie ist billig zu
  schließen).
- [x] `packages/shadow-objects/src/elements/forwardCustomEvents.ts:38`, wahre Seite der Ternäre —
  ein `ViewComponent`, der bereits eine eigene `dispatchEvent`-Eigenschaft trägt, kommt in keinem
  Test vor. Die Sicherung gegen den Doppelpatch — gepatcht wird die Instanz, nicht der Prototyp —
  ist damit unbelegt, und genau sie trägt den Fall, dass der Effekt zweimal läuft. Gefunden in
  Paket 8, vorbestehend (wörtlich aus `ShaeEntElement.ts:315` mitgereist). Geschätzte Severity:
  info. → Scope, Paket 9b (Korrektheitssicherung im Kernpaket ohne Wächter).
- [x] `packages/shadow-objects/src/elements/ShaePropElement.ts:117-121` — der `MicrotaskGate`
  hinter `#hostLookup` wird in `teardown()` nicht abbestellt, und `MicrotaskGate` kennt kein
  Abbestellen: sein Callback prüft nur `isConnected`, nicht `isDestroyed`. Für ein Element, das den
  Baum verlässt, greift der `isConnected`-Test; ein von Hand über `destroy()` zerstörtes, aber noch
  verbundenes `<shae-prop>` läuft dagegen durch — eine vor `destroy()` gebuchte Runde ruft
  `#findEntNode()`, das `entNode$` schreibt und über `#listenForHostChanges()` (`:428-433`) den
  Re-Request-Listener wieder anhängt, den `teardown()` gerade abgenommen hat. Damit hält ein
  zerstörtes Element wieder eine Registrierung am Host oder am Dokument. Gefunden in Paket 9,
  vorbestehend (`git show f971e40:…` zeigt dieselbe Konstruktion in Zeile 130). Geschätzte
  Severity: low. → Scope, Paket 9c (Korrektheit und Ressourcen des Kernpakets, und die Scope-Regel nimmt sie
  in jeder Severity auf).
- [x] `packages/shadow-objects/src/elements/ShaeElement.ts:33` gegen `:208` — die modulweite
  Funktion `syncShadowObjects` und die gleichnamige Methode teilen sich den Namen; im Rumpf der
  Methode löst der Aufruf auf die Modulfunktion auf. Das funktioniert und liest sich als Absicht,
  ist aber die Sorte Beschattung, die ein späterer Umbau still umdreht — ein `this.` davor oder ein
  umbenanntes Modulsymbol, und der Aufruf zeigt woandershin, ohne dass ein Test es merkt. Gefunden
  in Paket 9, vorbestehend (`git show f971e40:…` zeigt dieselben beiden Namen in Zeile 34 und 298).
  Geschätzte Severity: info. → Scope, Paket 9c (Wartbarkeit des Kernpakets, und die Scope-Regel nimmt sie in
  jeder Severity auf).
- [x] `packages/shadow-objects/src/elements/ShaeElement.ts:201` — die TSDoc zu
  `syncShadowObjectsOf()` setzt zwei Bindestriche (»`sync()` -- the unconfirmed path«), wo dieselbe
  Datei sonst durchgehend den Gedankenstrich schreibt. Gefunden in Paket 9, vorbestehend
  (`git show f971e40:…` zeigt dieselbe Zeile als 291). Geschätzte Severity: info. → Scope, Paket 10 (Nutzerentscheidung vom 2026-08-31: die Kosmetika dieses Laufs gehen
  gebündelt in das Doku-Paket).
- [x] `packages/shadow-objects/src/elements/forwardCustomEvents.ts:77` — die Kommentarzeile ist 102
  Zeichen lang, zwei über dem Handumbruch, den die Nachbardateien halten. Erzwungen ist davon
  nichts: `biome.json` steht auf `lineWidth: 130`, und `pnpm lint` ist grün. Gefunden in Paket 9,
  vorbestehend aus Paket 8 (`ee35144`). Geschätzte Severity: info. → Scope, Paket 10 (Nutzerentscheidung vom 2026-08-31).
- [x] `packages/shadow-objects/src/elements/hostedSlots.ts:90`, `:101`, `:155` — die drei Zweige,
  die einen von der Garbage Collection eingesammelten `WeakRef` behandeln (`el === undefined`,
  `ref.deref()?.`), sind ungedeckt. Anders als die Lücken darüber lässt sich dieser Zustand nicht
  deterministisch herstellen: kein Test kann eine Einsammlung erzwingen. Gefunden in Paket 8,
  vorbestehend (wörtlich aus `ShaeEntElement.ts:890-913` mitgereist). Geschätzte Severity: info.
  → Audit (als Lücke festgehalten, nicht als Arbeit — ein Fix-Weg, der die Zweige zuverlässig
  erreicht, existiert nicht, und ein Test, der auf die GC hofft, ist schlimmer als keiner).
- [x] `packages/shadow-objects-testing/test/worker-element-attributes.test.js:29-30` — der Kommentar
  über dem `before()`-Paar beschreibt den geteilten `enable`-Schalter als Voreinstellung
  `location.host.startsWith('localhost')`. Der Code prüft `location.hostname` gegen eine exakte
  Menge (`utils/ConsoleLogger.ts:12-15`), und `utils/ConsoleLogger.location.spec.ts` hält mit
  einem eigenen Fall fest, dass ein Host, der bloß mit »localhost« beginnt, gerade nicht zählt.
  Der Kommentar beschreibt damit ein Verhalten, gegen das ein Test läuft. Gefunden in Zug 0 von
  Paket 5, vorbestehend (`git show f971e40:…` zeigt dieselben Zeilen). Geschätzte Severity: info.
  → Scope, Paket 10 (Nutzerentscheidung vom 2026-08-31: mitnehmen, obwohl die Scope-Regel
  Kommentarkosmetik in einem privaten Paket nicht aufnimmt).
- [x] `packages/shadow-objects/CHANGELOG.md:281` — die Zeile nennt die globale Map
  `__shadowEntsContexts`, während `:254` im selben unveröffentlichten `## [Unreleased]`-Abschnitt
  die Umbenennung auf `__shadowObjectsContexts` protokolliert. Eine Release-Notiz, zwei Namen für
  dasselbe Ding; der Leser der kommenden Version findet den alten Namen im Code nicht wieder.
  Gefunden in Runde 1 der Wiederaufnahme von Paket 5, vorbestehend (`git show 2d874fc:…` führt
  `__shadowEntsContexts` zweimal und `__shadowObjectsContexts` einmal). Geschätzte Severity: info.
  → Scope, Paket 10 (Nutzerentscheidung vom 2026-08-31).
- [x] `packages/shadow-objects/CHANGELOG.md:219` — zwischen dem vierten und dem fünften Bullet
  unter »### ⚠️ Breaking Changes« steht eine Leerzeile. Markdown liest die Liste ab dort als
  »loose« und rendert jeden Punkt in einem eigenen Absatz, mitten in einer sonst durchgehend
  dichten Liste. Gefunden in Paket 5, vorbestehend (`git show 2d874fc:…` zeigt dieselbe Leerzeile).
  Geschätzte Severity: info. → Scope, Paket 10 (Nutzerentscheidung vom 2026-08-31).
- [x] `packages/shadow-objects/src/constants.ts:24`, `src/EntityUuidInUseError.ts:11`,
  `src/view/ComponentContext.ts:1025`, `src/view/IShadowObjectEnvProxy.ts:17,26,35`,
  `src/utils/MicrotaskCollector.ts:16-23`, `src/utils/MicrotaskGate.ts:9` — dieselbe Ursache wie der
  Befund, den Paket 10 in `view/ComponentChanges.ts` schließt: ein `{@link …}` auf ein Symbol, das
  das Modul weder importiert noch selbst deklariert, zeigt in einer generierten Referenz ins Leere.
  Dreizehn solche Ziele über diese sechs Dateien (`ChangeTrailRefusedError`, `ComponentContext`,
  `ViewComponent`, `ShadowEnv`, `RemoteWorkerEnv`, `Entity`, `DeferredTeardown`, `MicrotaskGate`,
  `MicrotaskCollector`), dazu ein Grenzfall in `in-the-dark/Entity.ts:609`, wo `{@link
  attachContextProvider}` den bloßen Membernamen setzt, während `:34` dasselbe Ziel qualifiziert
  schreibt. In Zug 0 von Paket 10 gefunden, maschinell über `src/**/*.ts` gezählt und stichprobenhaft
  nachgesehen; vorbestehend. Geschätzte Severity: info. → Scope, Paket 11 (Nutzerentscheidung vom 2026-08-31: der Durchgang über das ganze Paket
  wird geschnitten, statt sechs von sieben gleichen Stellen stehen zu lassen).
  Das Urteil des Runners lautete anders und ist hier festgehalten, weil sein Argument trägt:
  »reine Doku, und die Scope-Regel
  bucht Doku ins Audit. Die Nutzerentscheidung vom 2026-08-31 hat namentlich die Links in
  `ComponentChanges` in den Lauf geholt, nicht einen Durchgang über das ganze Paket; sechs weitere
  Dateien sind ein eigener Schnitt und keine Zugabe zu einem Kosmetik-Paket, und wer eine von sieben
  gleichen Stellen heilt, hinterlässt sechs, die aussehen, als habe sie jemand geprüft und behalten).«

- [x] `packages/shadow-objects-testing/test/worker-element-attributes.test.js:22` — die Kommentarzeile
  misst 102 Zeichen und steht drei Zeilen über der, die Paket 10 auf 97 gebrochen hat; im Blickfeld
  eines Lesers stehen zwei Kommentare unterschiedlichen Maßes nebeneinander. Erzwungen ist nichts:
  `biome.json` steht auf `lineWidth: 130`, `pnpm lint` ist grün, und diese Datei führt kein Maß von
  100 — 28 ihrer Zeilen liegen darüber, fast alles Code. Gefunden in Zug 3 von Paket 10,
  vorbestehend. Geschätzte Severity: info. → Audit (reine Kosmetik ohne Regel im Rücken, und die
  Scope-Regel bucht Kosmetik ins Audit. Die Nutzerentscheidung vom 2026-08-31 hat den Kommentar
  über dem `before()`-Paar namentlich in den Lauf geholt, nicht ein Zeilenmaß für diese Datei).
- [x] `packages/shadow-objects/CHANGELOG.md:283` — das Bullet erzählt mit »Until now a context could
  only be emptied with `clear()`, never released« den Vorzustand, während der Abschnitt
  `## [Unreleased]` heißt und sein Leser die Vorversion nie in der Hand hatte. Für ein CHANGELOG ist
  das die übliche Machart und kein Verstoß gegen die Konventionen dieses Laufs, die Kommentaren und
  Doku den Rückblick verbieten; festgehalten, damit die Stelle nicht still verschwindet. Gefunden in
  Zug 2 von Paket 10, vorbestehend. Geschätzte Severity: info. → Audit (reine Doku, und die
  Scope-Regel bucht Doku ins Audit).


## Pakete

### [x] 1. Spec-Zusicherungen, die etwas anderes prüfen als ihr Name sagt
- Findings: TEST-011 (info), TEST-018 (info), TEST-019 (info), TEST-020 (info) · TEST-004 (info) ist gegenstandslos, siehe Abgleich
- Ziel: Jede dieser Zusicherungen prüft die Zusage, die ihr Name behauptet, statt eine Zufälligkeit der Implementierung.
- Bereich: `packages/shadow-objects/src/in-the-dark/Entity.spec.ts`, `in-the-dark/Registry.spec.ts`, `view/ViewComponent.spec.ts`, `utils/props-utils.spec.ts` — reine Spec-Dateien, kein Produktivcode
- Hängt ab von: —
- Hash: 4dc6e5b
- Ergebnis: 1 Runde · TEST-011, TEST-018, TEST-019 und TEST-020 behoben · kein
  Regressionstest verlangt, das Paket schärft Testzusagen statt Produktivcode; die neue
  Zusicherung in `Entity.spec.ts` wurde gegen ein manipuliertes Label rot gesehen · TEST-004
  gegenstandslos seit `44e989b` · klein: der Kommentar über der Zusicherung in
  `Entity.spec.ts:1188` nennt weiterhin die internen Signalpfad-Namen statt der vier
  Log-Labels, gegen die direkt darunter geprüft wird
- Nebenbefunde: keine
- Folgen: keine

**TEST-011 · info · packages/shadow-objects/src/in-the-dark/Entity.spec.ts:978** — Eine Zusicherung in der Entity-Spec zählt Aufrufe, die eine Implementierungszufälligkeit bestimmt

Der Fall prüft mit toHaveBeenCalledTimes(4), dass der Abbau jeden Schritt einzeln absichert. Die Vier steht dort aber nicht, weil vier Schritte vorgesehen wären, sondern weil SignalsPath.dispose() an seinem eigenen value$.destroy() abbricht. Ändert sich dort etwas, wird der Test rot, ohne dass die geprüfte Zusage verletzt wäre. Eine Zahl als Zusicherung ist nur so haltbar wie das, was sie zufällig zählt.

Empfehlung: Auf die vier Schritt-Labels prüfen statt auf die Aufrufzahl — die Meldungen sagen, welcher Schritt gefangen wurde, und genau das ist die Zusage. Der Fall bleibt dann grün, solange die Absicherung trägt, und wird rot, wenn sie fällt.

**TEST-018 · info · packages/shadow-objects/src/view/ViewComponent.spec.ts:430,438** — Zwei Testnamen behaupten das Gegenteil ihrer eigenen Zusicherung

Die Fälle heißen »ignores a token change« und »ignores an order change«, prüfen aber beide, dass der Wert lokal ankommt: expect(c.token).toBe('other') und expect(c.order).toBe(5). Ignoriert wird allein die Meldung an den ComponentContext. Wer die Namen liest, um den Vertrag zu verstehen, liest ihn falsch herum.

Empfehlung: Die Namen auf das bringen, was sie prüfen — etwa »keeps a token change to itself«. Der Testname ist die Zusage, die ein Leser zuerst sieht.

**TEST-019 · info · packages/shadow-objects/src/in-the-dark/Registry.spec.ts:31** — new Set('x') in einer Spec hält nur, solange der Name ein Zeichen lang ist

Die Zeile übergibt einen String statt eines Arrays. Das ergibt hier zufällig Set {'x'}, weil der Property-Name aus einem Zeichen besteht; bei new Set('debug') stünden fünf Einzelbuchstaben in der Menge. Der Test prüft, was er meint, aber nur bis jemand den Namen verlängert. Die vier Nachbarn schreiben new Set([...]).

Empfehlung: new Set(['x']) schreiben, wie die Nachbarn.

**TEST-020 · info · packages/shadow-objects/src/utils/props-utils.spec.ts** — Ein Testname der props-utils-Spec verspricht mehr, als der Fall prüft

Der Fall heißt »reads a bare key the same way with and without curProps« und prüft dabei [] gegen undefined. Er ist damit enger als sein Name: die Gleichheit, die er zusagt, deckt er nur für diesen einen Wertvergleich ab.

Empfehlung: Den Namen auf den geprüften Vergleich verengen oder den Fall auf die Zusage erweitern.

### [x] 2. Kern-Lebenszyklus: der Wächter prüft, was er schützt
- Findings: BUG-003 (low), MEM-001 (low)
- Ziel: `Entity.removeChild()` entfernt nur das gemeinte Kind, und `Kernel.destroy()` kappt seine eigenen Leitungen wie jeder andere Teardown im Projekt — ohne die letzte Nachricht zu verschlucken, die der Abbau selbst noch losschickt.
- Bereich: `packages/shadow-objects/src/in-the-dark/Entity.ts`, `in-the-dark/Kernel.ts` samt Specs; `docs/api-reference.md` und `CHANGELOG.md` des Kernpakets
- Hängt ab von: —
- Hash: f13abdd
- Ergebnis: 4 Runden · BUG-003 und MEM-001 behoben · Regressionstest
  `leaves the children alone when the entity it is given is not among them` (vor dem Fix rot:
  `expected [ Array(1) ] to deeply equal [ …(2) ]`) und
  `takes its own subscriptions off once the queued messages are through` (vor dem Fix rot:
  `expected 1 to be +0`) · dazu zwei Wächter über dokumentierte Zusagen, beide vor wie nach der
  Änderung grün und beide gegen eine Mutationsprobe rot gesehen:
  `still delivers the message a destroy callback sends towards the view` fällt, wenn das `off()`
  synchron steht, und `takes off a listener registered in the window before the unsubscribe
  microtask has run` fällt, wenn im Fenster nichts registriert wird · die Mikrotask-Ordnung ist
  gemessen, nicht behauptet: ein vorhandener Fall der ShadowEnv-Spec fängt die synchrone Variante
  mit · klein: die beiden Nachbarfälle in `Kernel.spec.ts:4441` und `:4461` bauen ihren Kernel
  unterschiedlich — der erste hält eine `registry`-Bindung, die er nicht mehr braucht
- Nebenbefunde: keine
- Folgen: keine
- Modell: mittlere Stufe
- Effort: high
- Dateien: `packages/shadow-objects/src/in-the-dark/Entity.ts`, `packages/shadow-objects/src/in-the-dark/Entity.spec.ts`, `packages/shadow-objects/src/in-the-dark/Kernel.ts`, `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. **Zuerst rot sehen.** Zwei der drei neuen Fälle sind Regressionstests und werden vor der
     Korrektur geschrieben und rot gesehen (Schritt 2 und Schritt 5b); der dritte (5a) ist ein
     Wächter, der vorher **und** nachher grün ist. Das rote Log der beiden gehört in den Report,
     das grüne von 5a wird als solches benannt — ein roter Lauf ist dort nicht zu erwarten und
     wäre ein Befund.
  2. Regressionstest für `removeChild` in `packages/shadow-objects/src/in-the-dark/Entity.spec.ts`:
     neuer Block `describe('removeChild', …)` direkt hinter `describe('addChild', …)` (endet bei
     Zeile 604). Ein Fall, Name `leaves the children alone when the entity it is given is not among them`:

     ```ts
     const kernel = makeKernel();
     const other = makeKernel();
     const [parentUuid, firstUuid, lastUuid] = [generateUUID(), generateUUID(), generateUUID()];

     kernel.createEntity(parentUuid, 'parent');
     kernel.createEntity(firstUuid, 'child', parentUuid);
     kernel.createEntity(lastUuid, 'child', parentUuid);

     // Two entities under one uuid: a kernel refuses a second one of its own, so the namesake
     // comes from a second kernel. It is what tells the two guards apart -- the uuid says this
     // parent holds the child, the identity says it does not.
     other.createEntity(firstUuid, 'child');
     const namesake = other.getEntity(firstUuid);

     const parent = kernel.getEntity(parentUuid);
     parent.removeChild(namesake);

     expect(parent.children.map((child) => child.uuid), 'no child leaves for an entity this parent does not hold').toEqual([
       firstUuid,
       lastUuid,
     ]);
     expect(() => parent.addChild(kernel.getEntity(firstUuid)), 'and the parent still knows the uuid it holds').toThrow(
       /already exists/,
     );

     other.destroy();
     kernel.destroy();
     ```

     Vor der Korrektur schlägt die erste Zusicherung fehl: `indexOf` liefert `-1`, `splice(-1, 1)`
     schneidet das letzte Kind heraus, `children` steht auf `[firstUuid]`.
  3. `Entity.removeChild()` in `packages/shadow-objects/src/in-the-dark/Entity.ts:360` auf den
     Index umstellen — den einmal lesen, beide Zweige daran hängen:

     ```ts
     removeChild(child: Entity) {
       // The identity decides here, not the uuid: `indexOf` answers -1 for an entity this list
       // does not hold, and a `splice(-1, 1)` on that answer would cut the last child out
       // instead of none. `ComponentContext.removeFromParent()` reads its index the same way.
       const idx = this.#children.indexOf(child);
       if (idx !== -1) {
         this.#childrenUuids.delete(child.uuid);
         this.#children.splice(idx, 1);
       }
     }
     ```

     Sonst nichts an der Datei: `#childrenUuids` bleibt, `addChild()` braucht es weiterhin für
     seine Doppelbelegungs-Absage.
  4. `Kernel.destroy()` in `packages/shadow-objects/src/in-the-dark/Kernel.ts:970` bekommt als
     letzte Anweisung, hinter `this.#rootContexts.clear()`, das Kappen der eigenen Leitungen —
     **eine Mikrotask später, nicht synchron**:

     ```ts
     // One microtask later, not on this line: `dispatchMessageToView()` hands every message to a
     // microtask, and the teardown above queues its own -- what a shadow-object sends towards the
     // view from its `onDestroy`, which the creation API is open for. The queue is served in the
     // order it was filled, so those messages run ahead of this and reach their listeners, and
     // everything dispatched after them reaches nobody. What the kernel then holds is no
     // subscription that could keep it, or a listener, alive.
     queueMicrotask(() => {
       off(this);
     });
     ```

     `off` ist in `Kernel.ts:1` bereits importiert; `queueMicrotask` steht in derselben Datei
     schon in `dispatchMessageToView()`. Der Aufruf ist die Sammelform `off(ε)`: sie nimmt jeden
     Listener ab, gleich welcher Besitzer ihn gesetzt hat, und räumt zugleich jeden `retain`-Stand
     — der Kernel hält keinen, `retain()` steht im Paket nur in `SignalsPath.ts`. Der Kernel wird
     dadurch **nicht** versiegelt: ein `on()` nach diesem Zeitpunkt steht weiterhin.
  5. Zwei Fälle in `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`, im vorhandenen Block
     `describe('kernel teardown', …)` (Zeile 4315–4410), hinter dem letzten Fall. Die
     Mikrotask-Wartezeile in dieser Datei lautet
     `await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));` — kein Helfer,
     das ist hier das Idiom. `getSubscriptionCount`, `on`, `MessageToView`, `Registry`,
     `ShadowObject`, `generateUUID` und `MessageToViewEvent` sind in Zeile 1–23 bereits importiert.

     **5a — der Wächter, grün vor und nach der Änderung**, Name
     `still delivers the message a destroy callback sends towards the view`: eine eigene
     `Registry` im Fall, darin ein per `@ShadowObject({registry, token: 'farewell'})` registrierter
     Konstruktor, der in seinem `onDestroy(…)` aus der Creation-API `dispatchMessageToView('farewell')`
     aufruft. Danach `kernel.createEntity(uuid, 'farewell')`, ein Listener
     `on(kernel, MessageToView, (message: MessageToViewEvent) => seen.push(message.type))`,
     `kernel.destroy()`, eine Mikrotask warten, und
     `expect(seen, 'what an onDestroy hands to a microtask still reaches the listeners').toEqual(['farewell'])`.
     Muster für die dekorierte Klasse im Fall-Rumpf samt `expect(Klasse).toBeDefined()` gegen die
     Unused-Warnung: `describe('MessageToView with traverseChildren', …)`, Zeile 174–186.

     **5b — der Regressionstest, vor der Änderung rot**, Name
     `takes its own subscriptions off once the queued messages are through`: ein Kernel mit eigener
     `Registry`, ein Listener wie oben, `kernel.destroy()`, eine Mikrotask warten, dann
     `expect(getSubscriptionCount(kernel), 'a destroyed kernel holds no listener of its own').toBe(0)`.
     Danach `kernel.dispatchMessageToView({uuid: generateUUID(), type: 'after'})`, noch eine
     Mikrotask warten, und
     `expect(seen, 'and a message dispatched afterwards reaches nobody').toEqual([])`.
     Vor der Korrektur steht die Zahl auf `1` und die zweite Zusicherung sieht `['after']`.
  6. `packages/shadow-objects/docs/api-reference.md`, zwei Stellen:
     - Unter `#### destroy()` im Kernel-Abschnitt (Zeile 2876–2884), hinter dem vorhandenen Absatz
       über die freigegebenen Entities: ein Absatz, der sagt, dass der Kernel eine Mikrotask nach
       dem Teardown jede Subscription auf sich abnimmt — spät genug, dass eine Nachricht, die ein
       `onDestroy` in eine Mikrotask gelegt hat, ihre Listener noch erreicht, und dass danach
       nichts mehr ankommt. Dazu der Satz, dass die Kernel-Instanz damit nicht versiegelt ist: ein
       `on()` nach diesem Zeitpunkt steht weiterhin. Vorbild für Ton und Genauigkeit ist der
       entsprechende Absatz zu `ViewComponent.destroy()` in Zeile 868.
     - In der Tabelle unter `### Kernel Events` (Zeile 2887–2891) bekommt die Zeile `MessageToView`
       einen Halbsatz: die Subscription endet mit `destroy()`, eine Mikrotask danach.
  7. `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]` → `### Bugfixes` (Zeile 313):
     zwei Einträge im Stil der Nachbarn, jeder mit dem Präfix `**Bugfix (kernel):**` und in sich
     verständlich. Einer für `Entity.removeChild()` — die Zugehörigkeit wird an der Identität
     geprüft, nicht an der uuid, und nur das benannte Kind verlässt die Liste; erreichbar ist die
     Methode über die `Entity`-Instanz, die `kernel.getEntity(uuid)` herausgibt. Einer für
     `Kernel.destroy()` — der Kernel nimmt seine eigenen Subscriptions ab, eine Mikrotask nach dem
     Abbau, und was ein `onDestroy` in dieser Zeit Richtung View schickt, kommt noch an.
     **Der Rückblick auf den Vorzustand ist hier erlaubt und erwünscht** (»used to …«), so wie in
     jedem Nachbareintrag: die Konvention »kein Rückblick« gilt Code, Kommentaren und Doku, nicht
     dem CHANGELOG, dessen Aufgabe genau die Differenz ist.
     Der einleitende Absatz unter `## [Unreleased]` samt seiner Zählung (»Sixty changes«) bleibt
     unangetastet — keine der beiden Änderungen bricht eine zugesagte Oberfläche.
  8. `README.md` und `AGENTS.md` bleiben unberührt, und das ist geprüft, nicht vergessen: das
     README nennt den Kernel nur in der Schichtentabelle (Zeile 98), und der Abschnitt
     »Dispatching a notification« in `AGENTS.md` handelt von der Wahl zwischen den Emit-Varianten,
     die dieses Paket nicht anfasst. Kein `TODO` wird angelegt oder entfernt, also kein
     `pnpm make:todo`. Die Dateiliste unter `dist/` und die Gestalt von `dist/package.json` ändern
     sich nicht, also bleiben die beiden `distContract`-Erwartungsdateien, wie sie sind.
  9. Für den Reviewer, an dem dieses Paket wirklich hängt: die Mikrotask in Schritt 4 ist die eine
     Stelle, an der ein `off()` an der falschen Zeile still Verhalten zerstört. Er prüft die
     Ordnungsbehauptung gegen drei Stellen im Repo, die sie tragen und die alle drei falsch würden,
     stünde das `off(this)` synchron am Ende von `destroy()`:
     `docs/api-reference.md:1523` (»`onMessageToView` outlives it by one microtask«),
     `ShadowEnv.ts:234-241` (die Mikrotask, mit der die View-Seite genau darauf wartet) und
     `MessageRouter.ts:217-221` (»What an `onDestroy` sends to the view during a worker teardown is
     therefore dropped, where a local environment still delivers it«). Der Diff ist klein, die
     Behauptung ist es nicht — Modellstufe des Reviewers danach wählen, nicht nach der Diffgröße.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
  · Zwischenrunden: `pnpm -F @spearwolf/shadow-objects exec vitest src/in-the-dark --run` (geprüft, läuft; die gezielte Auswahl lässt `src/distContract.spec.ts` und damit den Build-Zwang aus)
- Commit: `fix: a kernel teardown takes its own subscriptions off, and removeChild cuts the child it was given`
- Schnittstellen: `Kernel.destroy()` — der Kernel nimmt eine Mikrotask nach dem Abbau jede
  Subscription auf sich ab. Was ein `onDestroy` in dieser Zeit über `dispatchMessageToView()`
  Richtung View schickt, kommt noch an; was danach dispatcht wird, erreicht niemanden. Ein `on()`
  im Fenster zwischen der Rückkehr aus `destroy()` und der Mikrotask wird still mit abgenommen,
  eines danach steht. `Entity.removeChild()` — die Zugehörigkeit entscheidet die Identität, nicht
  die uuid; eine Entity, die diese Liste nicht hält, entfernt nichts.

**BUG-003 · low · packages/shadow-objects/src/in-the-dark/Entity.ts:360-365** — Entity.removeChild() schneidet das letzte Kind heraus, wenn es das gemeinte nicht findet

Die Zugehörigkeit wird über die uuid geprüft (#childrenUuids.has(child.uuid)), das Entfernen über die Identität (#children.splice(#children.indexOf(child), 1)). Fallen die beiden auseinander, liefert indexOf −1, und splice(-1, 1) entfernt das letzte Element der Liste statt keines. Auseinanderfallen können sie, sobald zwei Entity-Instanzen dieselbe uuid tragen. Der Kernel lässt das nicht zu, und Entity steht in keinem Export, also ist der Fall über die öffentliche Oberfläche heute nicht erreichbar. Der Wächter davor ist trotzdem einer, und er prüft etwas anderes, als er schützt.

Empfehlung: Den Index einmal lesen und beide Zweige daran hängen: const idx = this.#children.indexOf(child); if (idx !== -1) { this.#childrenUuids.delete(child.uuid); this.#children.splice(idx, 1); }. ComponentContext.removeFromParent() macht es auf der View-Seite bereits genau so, und diese Zeile brächte die beiden Seiten wieder zur Deckung.

**MEM-001 · low · packages/shadow-objects/src/in-the-dark/Kernel.ts:961-992** — Kernel.destroy() löst als einziger Teardown seine eigenen Abonnements nicht

Der Kernel wird im Konstruktor eventized und sendet MessageToView. Sein destroy() räumt Entities, Wurzelkontexte und die Traversierungs-Caches, ruft aber kein off(this). ViewComponent.destroy(), ShadowEnv.destroy(), Entity[onDestroy]() und SignalsPath.dispose() tun das alle vier. Heute fällt es nicht auf, weil MessageRouter sich selbst mit off(this.kernel, this) abmeldet und der LocalShadowObjectEnv mitsamt seinem Kernel fallengelassen wird. Der Kernel ist aber öffentliche API und über shadow-objects.js exportiert: wer selbst on(kernel, MessageToView, …) schreibt, bleibt nach dem Teardown abonniert, hält den Kernel darüber am Leben und kann von einer Nachricht erreicht werden, die während des Abbaus über dispatchMessageToView() in eine Mikrotask gelegt wurde.

Empfehlung: off(this) an das Ende von destroy(), hinter das Aufräumen der Wurzelkontexte. Die Reihenfolge ist die von ShadowEnv.destroy(): erst zustellen, was noch zuzustellen ist, dann die Leitungen kappen. Ein Fall in der Kernel-Spec, der nach destroy() eine Nachricht auslöst und prüft, dass kein Listener sie sieht, hält die Regel danach fest.

### [x] 3. Ein fehlgeschlagener Render meldet sich, statt still zu wiederholen
- Findings: BUG-002 (medium)
- Ziel: Der `OnFrame`-Listener der Render-View fängt seine Rejection und meldet den Grund über den
  `ConsoleLogger` — einmal je Störung statt einmal je Frame. Der nächste Frame behält seinen Zug.
- Abweichung vom Grobplan-Ziel und von der Audit-Empfehlung: Beide verlangen, dass die Render-View
  den einmaligen Programmierfehler (`not my view`) vom wiederholbaren Kontextverlust unterscheidet
  und den ersten nach der Meldung stilllegt. Das kann sie nicht, ohne sich an die Fehlergestalt des
  Renderers zu binden, und ein falsches Urteil »dauerhaft« lässt die Leinwand schwarz, ohne Weg
  zurück: die beiden Fälle sehen von hier aus identisch aus — dieselbe View, derselbe Renderer,
  dieselbe abgelehnte Zusage. Unterschieden wird deshalb, was unterscheidbar ist: ob die Störung
  dieselbe ist wie die zuletzt gemeldete. Der Programmierfehler wiederholt sich unverändert und
  bekommt eine Zeile; der Kontextverlust endet mit einem Frame, der zurückkommt, und die nächste
  Störung ist eine eigene Episode mit eigener Zeile. Der Wiederholversuch bleibt in beiden Fällen
  offen, denn er ist das Einzige, was einen wiedergewonnenen Kontext je wieder zeichnen lässt.
- Bereich: `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js` samt Spec; Doku und
  CHANGELOG des Canvas-Pakets
- Hängt ab von: —
- Hash: 6ad12a1
- Modell: mittlere Stufe
- Effort: medium
- Dateien: `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js`,
  `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.spec.js`,
  `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`
- Vorgehen:
  1. **Zuerst rot sehen.** Alle drei neuen Fälle (Schritt 3 bis 5) sind vor der Korrektur rot, denn
     sie prüfen eine Meldung, die es noch nicht gibt. Der Regressionstest ist der aus Schritt 3: er
     hält fest, dass die Rejection den Listener nicht verlässt. Sein rotes Log gehört in den Report.
  2. Die `afterEach` der Spec-Datei (`ThreeRenderView.spec.js:89-92`) nimmt die Konsolen-Spies der
     Fälle unten wieder ab. Die Datei hat heute keinen solchen Aufruf, und die vitest-Konfiguration
     des Pakets setzt kein `restoreMocks` — ohne diese Zeile wirkt der erste Spy bis ans Dateiende:

     ```js
     afterEach(() => {
       env?.destroy();
       env = undefined;
       // the console spies of the failure cases below belong to their case, not to the file
       vi.restoreAllMocks();
     });
     ```

  3. **Der Regressionstest**, im vorhandenen Block `describe('rendering a frame', …)` hinter dem
     letzten Fall (endet Zeile 373). Name
     `reports a failed render instead of letting the rejection escape`:

     ```js
     it('reports a failed render instead of letting the rejection escape', async () => {
       const {child, renderer} = await setupRendering();
       const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

       renderer.renderView.mockRejectedValueOnce(new Error('the render failed'));

       const escaped = await captureUncaught(() => emit(child, OnFrame, {}));

       expect(escaped, 'the rejection stays inside the listener').toEqual([]);
       expect(consoleError, 'and the failure is reported').toHaveBeenCalledTimes(1);
     });
     ```

     Vor der Korrektur hält `escaped` die Rejection und `consoleError` ist nie gerufen worden; beide
     Zusicherungen fallen. `captureUncaught` steht in derselben Datei (Zeile 23-37) und ist an dieser
     Stelle erprobt — der vorhandene Fall in Zeile 360 fängt die heutige Rejection genau damit ab.
  4. **Wächter: die Meldung folgt der Störung, nicht dem Frame.** Name
     `reports a render that keeps failing the same way once, not once per frame`:

     ```js
     it('reports a render that keeps failing the same way once, not once per frame', async () => {
       const {child, renderer} = await setupRendering();
       const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

       renderer.renderView.mockRejectedValue(new Error('the render failed'));

       for (let frame = 0; frame < 3; frame++) {
         emit(child, OnFrame, {});
         await settle();
       }

       expect(renderer.renderView, 'every frame still takes its turn').toHaveBeenCalledTimes(3);
       expect(consoleError, 'and one report carries all three').toHaveBeenCalledTimes(1);
     });
     ```

     `mockRejectedValue` ohne `Once`: alle drei Frames scheitern. Die erste Zusicherung ist die
     wichtigere der beiden — sie hält fest, dass die Drosselung die Meldung betrifft und nicht das
     Rendern.
  5. **Wächter: ein Frame, der zurückkommt, beendet die Episode.** Name
     `reports again after a frame that came back`:

     ```js
     it('reports again after a frame that came back', async () => {
       const {child, renderer} = await setupRendering();
       const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

       renderer.renderView.mockRejectedValueOnce(new Error('the render failed'));
       emit(child, OnFrame, {});
       await settle();

       // the mock answers with a resolved promise again, which is its default
       emit(child, OnFrame, {});
       await settle();

       renderer.renderView.mockRejectedValueOnce(new Error('the render failed'));
       emit(child, OnFrame, {});
       await settle();

       expect(consoleError, 'a failure behind a frame that came back is its own episode').toHaveBeenCalledTimes(2);
     });
     ```

  6. **Der vorhandene Fall `takes the next frame after one whose render failed`** (Zeile 360-373)
     verliert seine `captureUncaught`-Klammer und den zweizeiligen Kommentar darüber: nach der
     Korrektur verlässt keine Rejection mehr den Listener, und der Kommentar sagt das Gegenteil.
     Statt der Klammer ein `emit` mit `await settle()` wie in den Nachbarfällen, und ein
     `vi.spyOn(console, 'error').mockImplementation(() => undefined);` am Anfang ohne Zusicherung
     darauf — der Fall prüft den nächsten Frame, nicht die Meldung, und soll die Suite nur nicht mit
     einer roten Zeile bedrucken. Vorbild dafür ist `MessageRouter.spec.ts:406`. Name und Zusicherung
     bleiben, wie sie sind.
  7. **Die Korrektur** in `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js`.
     Drei Stellen:

     - Der Import, neben den beiden vorhandenen. Er lautet wie in `ShaeOffscreenCanvas.js:1`:

       ```js
       import {ConsoleLogger} from '@spearwolf/shadow-objects/ConsoleLogger.js';
       ```

     - Ein Klassenfeld unter `static displayName`, in der Form von `ShaeOffscreenCanvas.js:33`:

       ```js
       logger = new ConsoleLogger(ThreeRenderView.displayName);
       ```

     - Der Frame-Listener (Zeile 75-101). Neben `frameInFlight` kommt eine zweite Variable, und der
       `try` bekommt einen `catch` vor sein `finally`:

       ```js
       let frameInFlight = false;

       // The failure that is already reported, and the view it belonged to. A render that keeps
       // failing the same way is one situation and not one per frame: the frames arrive at the rate
       // of the loop, and a report per frame would bury the first one, which is the one carrying
       // the news. A frame that comes back clears this, so the next failure is reported as its own.
       let reportedFailure;

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

               reportedFailure = undefined;
             } catch (error) {
               // eventize does not await this listener, so a rejection left uncaught here leaves
               // the realm as an unhandled one, once for every frame that fails. Reporting it is
               // all this does: whether a failure will pass is not knowable from here -- a drawing
               // context that is gone can come back, and a renderer that refuses this view can be
               // replaced -- so the next frame keeps its turn, and only the report is held to one
               // per failure.
               const message = String(error?.message ?? error);

               if (reportedFailure == null || reportedFailure.view !== view || reportedFailure.message !== message) {
                 reportedFailure = {view, message};
                 this.logger.error('rendering the view failed:', {viewId: view.viewId}, error);
               }
             } finally {
               // a render that failed frees the view for the next frame just as one that succeeded
               frameInFlight = false;
             }
           }
         }
       });
       ```

       Drei Feinheiten, die bewusst so stehen. `reportedFailure = undefined` steht **hinter** dem
       `if (image)`-Block und nicht darin — ein Frame, den der Renderer ohne Bild beantwortet, ist
       kein Fehlschlag, und die Kette steht danach nicht mehr quer. `logger.error` und nicht
       `logger.warn`: `error()` steht hinter keinem Schalter und bleibt auch nach Paket 5
       ungeklammert, `warn()` ist außerhalb von `localhost` aus, und ein Render, der jeden Frame
       scheitert, darf dort nicht schweigen — dasselbe Argument steht in
       `packages/shadow-objects/src/utils/runGuarded.ts:16-17` und in
       `elements/ShaeWorkerElement.ts:454-457`. Die Argumentfolge »Meldung, Subjekt, Fehler« ist die
       des ganzen Projekts, festgehalten in `runGuarded.ts:12-14` und angewandt in
       `ShaeEntElement.ts:463`.
  8. `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`, Abschnitt `### ThreeRenderView`
     → `#### local entity events`: hinter den Absatz, der mit »… passes without rendering.« endet,
     ein eigener Absatz. Er sagt, dass ein gescheiterter Render über den `ConsoleLogger` unter dem
     Namen `ThreeRenderView` gemeldet wird und nicht mehr als seinen eigenen Frame kostet — der
     nächste Frame rendert wieder —, und dass eine Störung, die sich für dieselbe View unverändert
     wiederholt, einmal gemeldet wird statt einmal je Frame; ein Frame, der zurückkommt, beendet die
     Meldung, und die nächste Störung bekommt eine eigene. Ton und Genauigkeit nach dem Absatz
     darüber. Kein Rückblick auf den Vorzustand: der Satz muss für jemanden tragen, der die alte
     Fassung nie gesehen hat.
  9. `packages/shae-offscreen-canvas/CHANGELOG.md`, unter `## [Unreleased]` als **erster** Eintrag
     der Liste, direkt hinter dem Blockzitat (Zeile 18) — dort hat `2d874fc` seinen Eintrag
     eingefügt, das ist die Konvention dieser Datei. Ein Aufzählungspunkt im Stil der Nachbarn: in
     sich verständlich, Gegenwartsform, und **hier ist der Rückblick auf den Vorzustand erwünscht**
     (»used to …«) wie in jedem Nachbareintrag — die Konvention »kein Rückblick« gilt Code,
     Kommentaren und Doku, nicht dem CHANGELOG, dessen Aufgabe genau die Differenz ist. Inhalt: ein
     gescheiterter Render meldet sich über den `ConsoleLogger`; der Listener ist `async` und eventize
     wartet ihn nicht ab, weshalb eine abgelehnte Zusage bisher als unbehandelte Rejection im Realm
     landete, einmal je gescheitertem Frame und damit im Takt der Frame-Schleife; der nächste Frame
     behält seinen Zug, und eine Störung, die sich unverändert wiederholt, wird einmal gemeldet statt
     einmal je Frame. Das Blockzitat »**Next release: minor.**« bleibt unangetastet — diese Änderung
     bricht keine zugesagte Oberfläche.
  10. Was unberührt bleibt, und das ist geprüft, nicht vergessen:
      `packages/shae-offscreen-canvas/README.md` nennt aus diesem Umfeld nur `ThreeMultiViewRenderer`
      in der `define`-Aufzählung (Zeile 17) und wird von der Änderung nicht falsch. `AGENTS.md`
      handelt im Abschnitt »Dispatching a notification« von der Wahl zwischen den Emit-Varianten;
      dieses Paket fasst keine an. Das Wurzel-`CHANGELOG.md` und
      `packages/shadow-objects/CHANGELOG.md` bleiben draußen — weder Werkzeug noch Kernpaket bewegen
      sich. Kein `TODO` entsteht oder fällt weg, also kein `pnpm make:todo`. Die Dateiliste unter
      `.npm-pkg/` und die Gestalt der veröffentlichten `package.json` ändern sich nicht, also bleiben
      `src/distContract.files.txt` und `src/distContract.package.json`, wie sie sind.
  11. Für den Reviewer: Der Diff ist klein, und die eine Stelle, an der er still falsch werden kann,
      ist die Episodenlogik. Drei Proben dagegen. Erstens die Stellung von
      `reportedFailure = undefined` — steht sie innerhalb von `if (image)`, meldet ein Renderer, der
      abwechselnd nichts und einen Fehler liefert, wieder je Frame. Zweitens der Vergleich: er muss
      **beide** Felder prüfen, sonst verschluckt eine stehende Episode eine Störung anderer Ursache,
      die zwischendurch auftritt. Drittens die Reichweite des `catch`: `transferFromImageBitmap()`
      und `image.close()` stehen mit im `try` und sollen es bleiben, denn auch sie erreichen sonst
      niemanden. Was der Reviewer **nicht** aufmachen soll, weil es hier entschieden ist und der
      Grund oben unter »Abweichung« steht: dass die Render-View nach einem `not my view` weiter
      rendert, statt sich stillzulegen.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
  · Zwischenrunden: `pnpm -F @spearwolf/shae-offscreen-canvas exec vitest src/shadow-objects/ThreeRenderView.spec.js --run` (geprüft, läuft in 0,4 s über 15 Fälle; die gezielte Auswahl lässt `src/distContract.spec.js` und damit den Build-Zwang aus)
- Commit: `fix(canvas): a failed render reports itself once and leaves the next frame its turn`
- Ergebnis: 1 Runde · BUG-002 behoben · Regressionstest
  `reports a failed render instead of letting the rejection escape` (vor dem Fix rot:
  `expected [ Error: the render failed ] to deeply equal []` und `expected "error" to be called
  1 times, but got 0 times`) · dazu zwei Wächter über die Episodenregel, beide vor der Korrektur
  ebenfalls rot: `reports a render that keeps failing the same way once, not once per frame` und
  `reports again after a frame that came back` · der Reviewer hat den roten Lauf selbst
  nachgemessen statt ihn zu übernehmen · der vorhandene Fall `takes the next frame after one whose
  render failed` verlor seine `captureUncaught`-Klammer, die nach der Korrektur nichts mehr fängt ·
  klein: `ThreeRenderView.js:117` hält im gemerkten Fehlschlag die View-Referenz, bis der nächste
  Frame sie ablöst — eine ID statt des Objekts täte dasselbe · klein: `ThreeRenderView.js:114`
  erkennt die Störung an `error.message`, zwei verschiedene Fehler mit gleichem Text an derselben
  View fallen zu einer Episode zusammen · klein: `ThreeRenderView.spec.js:355` schaltet die Konsole
  ohne einen Halbsatz dazu stumm, warum
- Nebenbefunde: keine über den bereits unter »Offene Befunde« geführten hinaus
- Folgen: keine
- Schnittstellen: `ThreeRenderView` trägt ein Instanzfeld `logger = new ConsoleLogger('ThreeRenderView')`
  und ruft es an einer Stelle ungeklammert als `logger.error(…)`. Die Argumentfolge ist die des
  Projekts: Meldung, Subjekt, Fehler.

**BUG-002 · medium · packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js:88-98** — Ein fehlgeschlagener Render endet als unbehandelte Rejection, Frame für Frame

Der OnFrame-Listener ist async und wartet auf multiViewRenderer.renderView(view), umschlossen von try/finally ohne catch. #renderViewNow() wirft bei einer fremden View ausdrücklich ('not my view'), und WebGLRenderer.render() wie createImageBitmap() können es ebenfalls. Eventize erwartet das zurückgegebene Promise nicht, also verlässt die Rejection den Listener und landet als unhandled rejection im Realm. Das finally setzt frameInFlight zurück, der nächste Frame versucht dasselbe, und die Meldung wiederholt sich mit der Frame-Rate. In der E2E-Strecke fiele das auf, denn zwei Seiten prüfen ausdrücklich auf unbehandelte Fehler; der Renderer wird dort nur nicht ausgeführt.

Empfehlung: Ein catch neben das finally, das den Grund über den ConsoleLogger meldet. Die eigentliche Entscheidung liegt dahinter: ein 'not my view' wiederholt sich bei jedem Frame und ist ein Programmierfehler, der einmal gemeldet und dann stillgelegt gehört; ein verlorener WebGL-Kontext ist etwas anderes und darf es erneut versuchen.

### [x] 3a. Ein Renderer-Wechsel ohne Umweg über null erneuert die gehaltene View
- Findings: Nebenbefund aus Paket 3 (low, vorbestehend, nicht im Audit)
- Ziel: Die gehaltene View gehört immer dem Renderer, der gerade in Reichweite ist, und sie geht immer
  an den zurück, der sie gemacht hat — auch wenn `ThreeMultiViewRendererContext` von einem Renderer
  geradewegs auf einen anderen springt.
- Bereich: `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js:27-69` samt Spec;
  Doku und CHANGELOG des Canvas-Pakets
- Hängt ab von: — · Der Fall ist über die heutige Oberfläche nicht erreichbar; der Regressionstest
  stellt den Provider-Wechsel selbst her (näherer Provider taucht auf, während ein äußerer noch steht)
  und verlässt sich nicht darauf, dass ein Token-Wechsel ihn auslöst — der geht durch `null` und ist
  bereits korrekt.
- Hash: 0c39ff9
- Modell: mittlere Stufe
- Effort: medium · Der Code steht unten vollständig da, das spräche für `low`. Die eine Stelle, an der
  eine naheliegende Verbesserung den Fix still wieder aufhebt, ist die Abhängigkeitsmenge des
  Aufräum-Effekts, und dafür braucht der Reviewer Luft zum Nachvollziehen — nicht der Implementierer
  zum Entwerfen.
- Dateien: `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.js`,
  `packages/shae-offscreen-canvas/src/shadow-objects/ThreeRenderView.spec.js`,
  `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`

- Ausgangslage, in Zug 0 gemessen — sie trägt den Schnitt und wird nicht neu aufgerollt. Gemessen
  wurde gegen `@spearwolf/signalize` 1.0.0-beta.1 mit Nachbauten der beiden Effekte, nicht am Text:

  1. **Ein Kontextwert erreicht seine Leser in einem synchronen `set()`.** `Entity.ts:70-88` sagt es
     selbst: der Microtask-Kollektor gibt die gesammelten Werte einzeln weiter, und `set()` fährt die
     lesenden Effekte synchron. Beide Effekte dieser Datei lesen `ThreeMultiViewRendererContext` —
     ein Renderer-Wechsel benachrichtigt also beide, in der Reihenfolge, in der sie dieses Signal
     abonniert haben.
  2. **Diese Reihenfolge steht nicht in der Quelltextfolge.** Effekt 1 abonniert den Renderer erst in
     einem Lauf, in dem `getCanvasSize()` etwas hergibt; sein erster Lauf hat nichts, weil
     Kontextwerte immer eine Mikrotask später kommen. Effekt 2 abonniert sofort und steht damit heute
     vorn. Beide Reihenfolgen wurden gefahren.
  3. **Heutiger Stand, Wechsel A→B ohne `null` dazwischen:** der Aufräum-Effekt gibt die View bei A
     zurück, Effekt 1 hält sie weiter (`view != null`), und die gehaltene View ist von da an eine
     zerstörte fremde. Genau der Befund.
  4. **Der halbe Fix trägt nicht.** Lernt nur Effekt 1 den Besitzer und bleibt Effekt 2, wie er ist,
     dann läuft Effekt 2 für einen Wechsel zweimal — einmal vom Renderer, einmal von der View, die
     Effekt 1 mitten in derselben Zustellung schreibt — und der spätere Lauf reißt die Paarung ab,
     die der frühere gerade angelegt hat. Gemessen: `B.destroyView(A#1)` läuft, und weil jeder
     Renderer seine Views ab 1 durchzählt und `destroyView()` nach `viewId` löscht
     (`ThreeMultiViewRenderer.js:50` und `:108-111`), trifft der Aufruf die frisch gemachte `B#1`.
     Ergebnis wieder: eine gehaltene View, die ihr Renderer nicht kennt.
  5. **Ein Besitzer-Wächter im Aufräum-Effekt trägt auch nicht.** `viewOwner === multiViewRenderer`
     als zusätzliche Bedingung überlebt die eine Abonnement-Reihenfolge und fällt in der anderen —
     gemessen, mit demselben Ausgang wie 4.
  6. **Was in beiden Reihenfolgen trägt:** der Aufräum-Effekt liest nur noch `renderView` und gibt
     die View über den Besitzer zurück, den er in seine Closure genommen hat. Eine Abhängigkeit, eine
     Benachrichtigung je View-Wechsel, und die Paarung kann nicht mehr auseinanderfallen. Fünf
     Abläufe gefahren — Renderer zuerst, Größe zuerst, Wechsel und danach eine neue Größe, Wechsel
     über `null`, Teardown nach einem Wechsel —, alle mit dem richtigen Ausgang.
  7. **`viewOwner` wird vor `renderView.set(view)` gesetzt, nicht danach.** Das `set()` fährt die
     Effekte synchron, Effekt 1 tritt dabei in sich selbst wieder ein, und mit der Zuweisung nach dem
     `set()` findet er den Renderer unverändert fremd, macht die nächste View und hört damit nicht
     auf: signalize bricht bei `maxDepth=256` mit einer benannten Fehlermeldung ab. Der Fehler ist
     laut, nicht still — aber er ist da.
  8. **Nebenbei geschlossen:** in der umgekehrten Abonnement-Reihenfolge zerstört der heutige Stand
     die View unmittelbar nach dem Anlegen (gemessen). Erreichbar ist das heute nicht, weil
     Kontextwerte immer verzögert ankommen und Effekt 1 in seinem ersten Lauf deshalb nie eine Größe
     sieht. Die neue Gestalt nimmt die Möglichkeit weg, statt sich auf diesen Umstand zu verlassen.

- Vorgehen:
  1. **Zuerst rot sehen.** Der Regressionstest ist der aus Schritt 3, und er wird geschrieben,
     *bevor* Schritt 4 die Quelle anfasst. Sein rotes Log gehört in den Report; die erste Zusicherung,
     die fällt, ist `expect(nearer.createView).toHaveBeenCalledTimes(1)` mit null Aufrufen.

     **Hält-an-Bedingung:** Ist der Fall vor der Korrektur grün, dann stellt der Aufbau den direkten
     Wechsel nicht her — der Kontextpfad ginge dann doch über `undefined`, und Effekt 1 erneuerte die
     View schon heute richtig. Dann **nicht** weiterbauen, sondern auf den zweiten Aufbau wechseln:
     ein einziger Provider, `host.multiViewRenderer$.set(other)` statt des näheren Providers. Das ist
     derselbe Schritt an der Grenze, die der Code liest, und er entsteht garantiert. Was davon
     gefahren wurde, gehört in den Report.
  2. **Spec: der nähere Provider.** In `ThreeRenderView.spec.js` hinter die Klasse `Host`
     (endet Zeile 52) eine zweite Klasse, und in `makeEnv()` (Zeile 77-84) hinter
     `env.registry.define('ThreeRenderView', ThreeRenderView);` die Zeile
     `env.registry.define('RendererProvider', RendererProvider);`:

     ```js
     /**
      * A provider of `ThreeMultiViewRendererContext` and nothing else. On an entity between the host
      * and the render view it makes the one situation the render view cannot otherwise be put in: the
      * renderer in reach is replaced by another without falling to `undefined` in between, because a
      * nearer provider takes the name over from the one above it.
      */
     class RendererProvider {
       static displayName = 'RendererProvider';

       constructor({provideContext}) {
         this.multiViewRenderer$ = provideContext(ThreeMultiViewRendererContext);
       }
     }
     ```

     Ein `provideContext()` ohne Wert verdeckt den äußeren Provider nicht: der `SignalsPath` einer
     Entity löst nach der Regel »der erste Eintrag, der etwas hält« auf, und ein leerer eigener
     Eintrag lässt den geerbten durch (`Entity.ts:679-700`, dazu die Begründung an
     `#handOverToRemainingProvider`).
  3. **Der Regressionstest**, hinter dem Fall `gives its view back when its entity changes token`
     (endet Zeile 241) und vor `describe('rendering a frame', …)` (Zeile 243). Name
     `takes a view of the renderer that takes over and gives the old one back to its maker`:

     ```js
     it('takes a view of the renderer that takes over and gives the old one back to its maker', async () => {
       env = makeEnv();
       const hostUuid = crypto.randomUUID();
       const providerUuid = crypto.randomUUID();
       const childUuid = crypto.randomUUID();

       env.kernel.createEntity(hostUuid, 'Host');
       env.kernel.createEntity(providerUuid, 'RendererProvider', hostUuid);
       env.kernel.createEntity(childUuid, 'ThreeRenderView', providerUuid);

       const [host] = env.kernel.findShadowObjects(hostUuid);
       const [provider] = env.kernel.findShadowObjects(providerUuid);
       const child = env.kernel.getEntity(childUuid);

       const outer = makeMockRenderer();
       const nearer = makeMockRenderer();

       host.multiViewRenderer$.set(outer);
       host.imageBitmapRenderer$.set(makeMockImageBitmapRenderer());
       host.canvasSize$.set([320, 240, 1]);
       await settle();

       const firstView = child.useContext(ThreeRenderViewContext)();
       expect(outer.createView, 'the outer provider is the one in reach to begin with').toHaveBeenCalledTimes(1);

       // The nearer provider takes the name over while the outer one still holds it: what the render
       // view reads goes from one renderer to the other in one step, with no `undefined` in between.
       provider.multiViewRenderer$.set(nearer);
       await settle();

       const secondView = child.useContext(ThreeRenderViewContext)();

       expect(nearer.createView, 'the renderer that takes over makes the view').toHaveBeenCalledTimes(1);
       expect(secondView).toBe(nearer.createView.mock.results[0].value);
       expect(outer.destroyView, 'the view goes back to the renderer that made it').toHaveBeenCalledWith(firstView);
       expect(nearer.destroyView, 'and not to the one that took over').not.toHaveBeenCalled();

       emit(child, OnFrame, {});
       await settle();

       expect(nearer.renderView, 'the frames go to the new renderer, with a view it owns').toHaveBeenCalledWith(secondView);
       expect(outer.renderView, 'and the renderer that left gets none').not.toHaveBeenCalled();
     });
     ```

     `emit`, `on`, `OnFrame`, `ThreeRenderViewContext`, `ThreeMultiViewRendererContext`, `settle`,
     `makeMockRenderer` und `makeMockImageBitmapRenderer` stehen in der Datei bereits (Zeile 1-14,
     54-75). Der Fall baut seinen Aufbau selbst, statt `setup()` (Zeile 96-107) um eine Ebene zu
     erweitern — `setup()` trägt fünfzehn andere Fälle.
  4. **`ThreeRenderView.js` — Effekt 1 lernt, wem die View gehört.** Direkt über `createEffect` in
     Zeile 27, hinter `const renderView = createSignal();`:

     ```js
     // The renderer that made the view `renderView` holds. A view belongs to one renderer: made by
     // it, drawn by it, handed back to it. The renderer in reach can be replaced by another without
     // falling to `null` in between -- a nearer provider of `ThreeMultiViewRendererContext` appearing
     // while an outer one still stands -- and a held view says nothing about which one is under it.
     let viewOwner;
     ```

     In Zeile 35-40 fällt der Besitzer mit der View weg, und in Zeile 44-50 entscheidet er mit über
     die Erneuerung:

     ```js
     if (multiViewRenderer == null) {
       if (view) {
         viewOwner = undefined;
         renderView.set(undefined);
       }
       return;
     }

     const [width, height] = canvasSize;

     if (view == null || viewOwner !== multiViewRenderer) {
       view = multiViewRenderer.createView(width, height);
       // The owner is set before the view is published, not after: `set()` runs the effect below
       // synchronously and that one reads this variable, and this effect re-enters itself on the
       // same `set()`. With the assignment the other way round it finds the renderer still foreign,
       // makes another view, and keeps doing so until the effect depth guard stops it.
       viewOwner = multiViewRenderer;
       renderView.set(view);
     } else {
       view.width = width;
       view.height = height;
     }
     ```

     Sonst nichts an diesem Effekt: `getCanvasSize()` bleibt die erste Abfrage samt vorzeitiger
     Rückkehr, und der `else`-Zweig bleibt die reine Größenänderung.
  5. **`ThreeRenderView.js` — der Aufräum-Effekt bekommt seine eine Abhängigkeit.** Der Block Zeile
     53-69 als Ganzes:

     ```js
     // The cleanup below is the only place a view is handed back. It runs when the view signal
     // changes and when the creation scope destroys the effects, and it carries both the view and
     // the renderer that made it in its closure, so it needs no context of its own. Nothing writes
     // the view signal on teardown: an `undefined` from there would run the effect above once more
     // while the renderer and size contexts are still standing, and it would take a view that is
     // destroyed in the same breath.
     //
     // The renderer comes from `viewOwner`, so this effect depends on the view signal and on nothing
     // else. A second dependency would be read at a moment of its own: the effect above writes the
     // view signal while a renderer change is still being handed out, so an effect reading both runs
     // twice for one change, and the later run tears down the pairing the earlier one registered.
     // Such a stray call does not go nowhere -- `destroyView()` deletes by view id and every renderer
     // numbers its views from one, so it takes the namesake view of the renderer it was aimed at.
     createEffect(() => {
       const view = renderView.get();
       const owner = viewOwner;

       if (view && owner) {
         return () => {
           owner.destroyView(view);
         };
       }
     });
     ```

     Was der Effekt damit **nicht** mehr tut: auf ein Verschwinden des Renderers reagieren. Das
     erledigt Effekt 1, der in dem Fall `renderView` leert, worauf hier die Aufräumfunktion mit dem
     alten Besitzer läuft — der vorhandene Fall
     `gives the view back and clears its context once the renderer context disappears` (Zeile 148)
     prüft genau das und bleibt grün. Der eine Ablauf, der sich dabei ändert, ist geprüft und nicht
     übersehen: verschwindet der Renderer, **während** keine Canvas-Größe bekannt ist, kehrt Effekt 1
     vorzeitig zurück und niemand gibt die View zurück. Das ist im Produktivcode nicht erreichbar —
     `ShaeOffscreenCanvas.js:63` legt `canvasSize$` mit `[0, 0, 0]` an und schreibt nur Tripel, nie
     `null` — und der heutige Stand ist an derselben Stelle nicht besser, sondern schlechter: dort
     wird die View zerstört und bleibt trotzdem im Kontext veröffentlicht.
  6. `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`, Zeile 147 — der Satz nennt heute
     zwei Anlässe, an denen die View zurückgeht, und es sind drei. Der dritte: ein anderer Renderer
     kommt in Reichweite. Dazu der Halbsatz, dass die neue View von dem stammt, der übernommen hat,
     und die alte an den zurückgeht, der sie gemacht hat. Ton und Genauigkeit nach den Absätzen
     darüber, ein Satz oder zwei, kein Rückblick auf den Vorzustand.
  7. `packages/shae-offscreen-canvas/CHANGELOG.md`, unter `## [Unreleased]` als **erster** Eintrag der
     Liste, direkt hinter dem Blockzitat (Zeile 18) — das ist die Konvention dieser Datei. Ein
     Aufzählungspunkt im Stil der Nachbarn: in sich verständlich, Gegenwartsform, und **hier ist der
     Rückblick erwünscht** (»used to …«) wie in jedem Nachbareintrag. Inhalt: `ThreeRenderView` nimmt
     eine View von dem Renderer, der gerade in Reichweite ist, und gibt eine alte an den zurück, der
     sie gemacht hat; wird der Renderer durch einen anderen ersetzt, ohne dass dazwischen keiner in
     Reichweite ist — ein näherer Provider von `ThreeMultiViewRendererContext` taucht auf, während ein
     äußerer noch steht —, behielt die View bisher ihren alten Renderer, wurde von diesem im selben
     Zug zurückgenommen und ging von da an als fremde, zerstörte View in jeden Frame des neuen. Das
     Blockzitat »**Next release: minor.**« bleibt unangetastet: die zugesagte Oberfläche bewegt sich
     nicht.
  8. Was unberührt bleibt, und das ist geprüft, nicht vergessen: `packages/shae-offscreen-canvas/README.md`
     nennt aus diesem Umfeld nur `ThreeMultiViewRenderer` in der `define`-Aufzählung (Zeile 17) und
     wird von der Änderung nicht falsch. `ThreeMultiViewRenderer.js` wird nicht angefasst — die
     Nummerierung der View-IDs je Renderer ist der Grund, warum ein falsch gerichteter
     `destroyView()`-Aufruf trifft, aber nicht die Ursache dieses Befunds. Der Kernpaket-CHANGELOG und
     das Wurzel-`CHANGELOG.md` bleiben draußen. `AGENTS.md` handelt in »Dispatching a notification«
     von der Wahl zwischen den Emit-Varianten; dieses Paket fasst keine an. Kein `TODO` entsteht oder
     fällt weg, also kein `pnpm make:todo`. Die Dateiliste unter `.npm-pkg/` und die Gestalt der
     veröffentlichten `package.json` ändern sich nicht, also bleiben `src/distContract.files.txt` und
     `src/distContract.package.json`, wie sie sind.
  9. Für den Reviewer: Der Diff ist klein, und die eine Stelle, an der er still falsch werden kann,
     ist die Abhängigkeitsmenge des Aufräum-Effekts. Drei Proben dagegen. Erstens: liest er wieder
     `getMultiViewRenderer()` — sei es als Bedingung, sei es als Wächter neben `viewOwner` —, ist der
     Fix aufgehoben; Punkt 4 und 5 der Ausgangslage sagen, was dann gemessen zurückkommt. Zweitens die
     Stellung von `viewOwner = multiViewRenderer`: steht sie hinter `renderView.set(view)`, läuft
     Effekt 1 in seine Tiefenbegrenzung. Drittens der `else`-Zweig: er bleibt die reine
     Größenänderung, sonst nimmt jede neue Canvas-Größe eine zweite View. Was der Reviewer **nicht**
     aufmachen soll, weil es hier entschieden ist: dass die View über einen näheren Provider den
     Renderer wechseln kann, ohne dass es im Repository heute jemand herstellt — der Befund ist als
     vorbestehend nachgewiesen und per Nutzerentscheidung vom 2026-08-31 in diesem Lauf.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
  · Zwischenrunden: `pnpm -F @spearwolf/shae-offscreen-canvas exec vitest src/shadow-objects/ThreeRenderView.spec.js --run`
  (in Paket 3 erprobt: 0,4 s über 15 Fälle; die gezielte Auswahl lässt `src/distContract.spec.js` und
  damit den Build-Zwang aus)
- Commit: `fix(canvas): a renderer that takes over gets a view of its own, and the old one goes back to its maker`
- Ergebnis: 1 Runde · der Nebenbefund aus Paket 3 behoben · Regressionstest
  `takes a view of the renderer that takes over and gives the old one back to its maker`
  (vor dem Fix rot: `expected "vi.fn()" to be called 1 times, but got 0 times` an
  `nearer.createView`) · die Hält-an-Bedingung aus Schritt 1 des Vorgehens griff nicht: der
  nähere Provider stellt den direkten Wechsel her · Umsetzung wortgetreu nach Detailplan, keine
  Abweichung · der Reviewer hat die drei Proben aus Punkt 9 selbst gefahren, jede reißt den Test
  wie vorhergesagt, und den roten Lauf gegen den unveränderten Quelltext nachgemessen statt ihn zu
  übernehmen · keine Qualitätsbefunde
- Nebenbefunde: keine
- Folgen: keine

### [x] 4. Der Change Trail unterscheidet »gesetzt, ohne Wert« von »Wert ist weg«
- Findings: CONS-021 (info), DX-009 (info)
- Ziel: Eine Eigenschaft, die nur ihren Schlüssel nennt, überlebt den Neuaufbau eines `ComponentContext`, und das Component Memory bekommt den lesenden Zugang, mit dem sich das prüfen lässt.
- Bereich: `packages/shadow-objects/src/view/ComponentChanges.ts`, `view/ComponentContext.ts`, `view/ViewComponent.ts`, `types.ts`, Kernel-Seite des Protokolls (nur Tests); Doku und CHANGELOG des Kernpakets
- Hängt ab von: —
- Hash: 97dab83
- Modell: stärkste Stufe
- Effort: high
- Dateien: `packages/shadow-objects/src/view/ComponentChanges.ts`,
  `packages/shadow-objects/src/view/ComponentChanges.spec.ts`,
  `packages/shadow-objects/src/view/ComponentContext.ts`,
  `packages/shadow-objects/src/view/ComponentContext.spec.ts`,
  `packages/shadow-objects/src/view/ViewComponent.ts`,
  `packages/shadow-objects/src/types.ts`,
  `packages/shadow-objects/src/in-the-dark/Entity.spec.ts`,
  `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`,
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/docs/cheat-sheet.md`,
  `packages/shadow-objects/CHANGELOG.md`

- Ausgangslage, gemessen in Zug 0 — sie entscheidet den Schnitt und wird nicht neu aufgerollt:
  `ComponentPropertiesType` (`types.ts:31`) führt drei Formen. `[key, value]` heißt »Wert ist da«,
  `[key, undefined]` heißt »Wert ist weg«, `[key]` heißt »gesetzt, ohne Wert«. `props-utils.ts` und
  `ComponentMemory` halten alle drei auseinander; `ComponentChanges` führt seine Eigenschaften als
  `Map<string, unknown>` und kennt nur zwei, weil `undefined` beide Randfälle besetzt. An dieser
  Grenze verliert `reCreateChanges()` die dritte Form: es destrukturiert `const [key, value]` aus
  einem einträgrigen Memory-Eintrag, ruft `changeProperty(key, undefined)`, und die Vergleichslogik
  wirft den Schlüssel als »hat sich nichts geändert« wieder heraus.
  Zweitens: **es gibt heute keinen Schreiber der dritten Form.** Der Kommentar in `types.ts` sagt
  das selbst. Damit ist die Form auf der View-Seite weder erzeugbar noch prüfbar, und eine Korrektur
  allein an `reCreateChanges()` wäre eine, die niemand auslösen kann. Dieses Paket legt den
  Schreiber deshalb mit an — das ist der Sinn von »darstellbar machen« in der Entscheidung vom
  2026-08-31 und die Voraussetzung dafür, dass das Ziel oben überhaupt einen Test hat.
  Drittens, und das ist die Grenze in die andere Richtung: **`setProperty(key, undefined)` bleibt
  eine Entfernung.** Diese Zusage steht dreifach im Repository — als benannter Fall
  (`ComponentContext.spec.ts:447`), in `docs/api-reference.md:782` und in `docs/cheat-sheet.md:382`,
  und `docs/api-reference.md:2448` baut das Verhalten von `<shae-prop>` bei `null`/`undefined`
  darauf auf. Sie umzudeuten wäre ein anderer Lösungsweg als der freigegebene und zöge
  `ShaePropElement` mit hinein. Die dritte Form bekommt darum einen eigenen Namen statt einer
  Zweitbedeutung.

- Vorgehen:
  1. **Reihenfolge, und was rot zu sehen ist.** Die Schritte 2 bis 6 legen eine neue Fähigkeit an;
     ihre Fälle sind grün, sobald sie geschrieben sind, und das ist richtig so — ein Test für
     Code, den es vorher nicht gab, kann nicht rot anfangen. **Der Regressionstest ist der aus
     Schritt 7**, und er wird geschrieben, *bevor* Schritt 8 `reCreateChanges()` anfasst: gegen den
     unveränderten `reCreateChanges()` fällt seine zweite Zusicherung, weil der Create-Eintrag
     `properties: [['value', 1]]` trägt statt `[['bare'], ['value', 1]]`. Dieses rote Log gehört in
     den Report. Wer Schritt 8 vorzieht, hat keinen Nachweis mehr und muss zurückrollen.

  2. **`ComponentChanges.ts` — die dritte Form bekommt einen Wert.** Ein Modul-Symbol, direkt unter
     `const ROOT = '#root';` (Zeile 16), exportiert, weil `ComponentContext` es liest:

     ```ts
     /**
      * The value a property carries in this bookkeeping when it is set without one — the third form
      * of {@link ComponentPropertiesType}, which travels as a one-element `[key]`. `undefined`
      * cannot say it: that is what a removal reads as, and the two have to stay apart all the way
      * to the entry.
      *
      * It never leaves the View Layer. A change trail runs through `structuredClone()` on its way
      * to a worker, and a symbol on that wire is a `DataCloneError` — so every method that builds
      * an entry turns it back into the one-element form, and the one reader outside this class,
      * `ComponentContext.transferPropertiesTo()`, tests for it before it hands a value on.
      */
     export const PropertyWithoutValue = Symbol('shadow-objects/property-without-value');
     ```

     Kein neues Modul: die Dateiliste unter `dist/` bleibt damit unverändert, und
     `src/distContract.files.txt` und `src/distContract.package.json` werden nicht angefasst.
     `PropertyWithoutValue` wird **nicht** aus `index.ts` re-exportiert — es ist ein Interna-Wert,
     kein Teil der öffentlichen Oberfläche.

  3. **`ComponentChanges.ts` — sechs Stellen, und keine mehr.** Der Marker darf an keiner anderen
     entstehen oder entkommen:

     - `changeProperty()` (Zeile 183), die Vergleichsfunktion. Eine registrierte Regel vergleicht
       Werte, und der Marker ist keiner:

       ```ts
       const equals = (a: T, b: T) =>
         // a registered rule compares values, and the marker is not one -- handed to it, a rule
         // would be asked about a property it never saw, and one that reaches into its arguments
         // throws on a symbol. Where either side is the marker the only question left is whether
         // it is still the same third form, and identity answers that.
         (a as unknown) === PropertyWithoutValue || (b as unknown) === PropertyWithoutValue
           ? (a as unknown) === (b as unknown)
           : isEqual == null
             ? a === b
             : isEqual(a, b);
       ```

       Sonst nichts an dieser Methode. Die Dreiteilung queued / travelling / confirmed bleibt Wort
       für Wort stehen; sie trägt den Marker, ohne ihn zu kennen.

     - Neue Methode direkt hinter `changeProperty()`:

       ```ts
       /**
        * Mark `key` as set without giving it a value: the next trail carries an entry that names
        * only the key. A later {@link ComponentChanges.changeProperty} replaces it with a value,
        * and {@link ComponentChanges.removeProperty} takes it away like any other property.
        *
        * @returns `true` if this differs from the last value this component asked for
        */
       setPropertyWithoutValue(key: string): boolean {
         return this.changeProperty(key, PropertyWithoutValue as unknown);
       }
       ```

     - `getProperties()` (Zeile 251), nur der Doc-Block: ein Satz, dass ein ohne Wert gesetzter
       Schlüssel mit `PropertyWithoutValue` im Ergebnis steht. Der Code bleibt, wie er ist — der
       Marker ist nicht `undefined` und läuft durch den vorhandenen Zweig.

     - `makeCreateEntityChange()` (Zeile 352-362). Der Filter wird eine Schleife, die die Form
       wählt; der vorhandene Kommentar bleibt und bekommt den dritten Fall dazu:

       ```ts
       if (this.#nextProperties.size > 0) {
         // a create carries only the keys that have a value or are set without one; where nothing
         // is left, the field stays off the entry — an absent `properties` and an empty one say
         // the same thing, and the shorter one is what travels. The note is taken either way: it
         // records what this entry carries, and an entry with no property is travelling with none
         const properties: ComponentPropertiesType = [];
         for (const [key, value] of this.#nextProperties) {
           if (value === PropertyWithoutValue) {
             properties.push([key]);
           } else if (value !== undefined) {
             properties.push([key, value]);
           }
         }
         this.#noteTravellingProperties(properties);
         if (properties.length > 0) {
           entry.properties = properties;
         }
       }
       ```

     - `makeChangePropertyChange()` (Zeile 412-424):

       ```ts
       // a key without a pending value is a removal, and so is a pending value of `undefined` --
       // `get()` answers the same for both, which is what the receiving side reads them as. A key
       // set without a value is the third form and travels as the bare key
       const properties: ComponentPropertiesType = this.#propsChangeOrder.map((key) => {
         const value = this.#nextProperties.get(key);
         return value === PropertyWithoutValue ? [key] : [key, value];
       });
       ```

     - `#noteTravellingProperties()` (Zeile 427-429). Die Arität muss zurück in den Marker
       übersetzt werden, sonst liest `changeProperty()` einen reisenden Schlüssel als Entfernung:

       ```ts
       #noteTravellingProperties(properties: ComponentPropertiesType): void {
         // the arity carries the meaning on the wire, the marker carries it in here
         this.#travellingProperties = new Map(
           properties.map((entry) => [entry[0], entry.length === 1 ? PropertyWithoutValue : entry[1]]),
         );
       }
       ```

     - `#commitProperties()` (Zeile 524-537). Dieselbe Übersetzung, damit die geschriebene Hälfte
       die dritte Form hält statt den Schlüssel zu vergessen:

       ```ts
       #commitProperties(properties: ComponentPropertiesType | undefined): void {
         for (const entry of properties ?? []) {
           const key = entry[0];
           // an entry that names only the key is the third form and not a removal: the written
           // half has to hold it, or the next diff reads the key as one that was never set
           const value = entry.length === 1 ? PropertyWithoutValue : entry[1];

           if (value === undefined) {
             this.#properties.delete(key);
           } else {
             this.#properties.set(key, value);
           }

           if (this.#nextProperties.get(key) === value) {
             this.#nextProperties.delete(key);
             removeFrom(this.#propsChangeOrder, key);
           }
         }
       }
       ```

     Die Tupel werden dabei jedes Mal neu gebaut und nie wiederverwendet — `docs/api-reference.md`
     sagt einem Konsumenten zu, dass an einem ausgegebenen Change Trail nichts mehr geschrieben
     wird, »not even the property tuples of its entries«.

  4. **`ComponentChanges.spec.ts` — sechs Fälle**, im vorhandenen Block `describe('properties', …)`
     (Zeile 324-457) hinter dem letzten Fall. `vi` in die Import-Zeile 1 aufnehmen. Die Helfer
     `created()`, `buildTrail()` und `flushTrail()` stehen in Zeile 8-32; die Gestalt eines
     Create-Eintrags in den Zusicherungen wird von den Nachbarn im Block `describe('create', …)`
     (Zeile 90) übernommen.

     - `emits a property set without a value as the bare key` — `created()`,
       `setPropertyWithoutValue('a')`, `flushTrail` liefert
       `properties: [['a']]`.
     - `keeps a property set without a value apart from a removed one` — ein bestätigtes
       `changeProperty('gone', 1)`, dann `setPropertyWithoutValue('bare')` und
       `changeProperty('gone', undefined)`; der Eintrag trägt `[['bare'], ['gone', undefined]]`.
       Dieser Fall ist der Kern des Findings und der wichtigste der sechs.
     - `carries a property set without a value in the create entry` — ein frisches
       `new ComponentChanges(UUID)` mit `create('a')`, dann `setPropertyWithoutValue('bare')` und
       `changeProperty('value', 1)`; der Create-Eintrag trägt `[['bare'], ['value', 1]]`.
     - `leaves a property set without a value alone when it is set again` — nach einem
       bestätigten `setPropertyWithoutValue('a')` gibt ein zweiter Aufruf `false` zurück und
       `buildTrail` liefert `[]`.
     - `removes a property that was set without a value` — nach einem bestätigten
       `setPropertyWithoutValue('a')` trägt `removeProperty('a')` den Eintrag
       `[['a', undefined]]`.
     - `does not ask a registered equality rule about a property that has no value` — nach einem
       bestätigten `setPropertyWithoutValue('a')` ein `changeProperty('a', 1, isEqual)` mit
       `const isEqual = vi.fn(() => false)`; `expect(isEqual, 'a rule is never handed the marker').not.toHaveBeenCalled()`,
       und der Eintrag trägt `[['a', 1]]`.

  5. **`ComponentContext.ts` — der Schreiber und die beiden Leser.** Import-Zeile 8 nimmt den
     Marker dazu (`import {ComponentChanges, PropertyWithoutValue} from './ComponentChanges.js';`),
     Zeile 9 den Typ (`import {ComponentMemory, type ComponentState} from './ComponentMemory.js';`).

     - Neue Methode direkt hinter `setProperty()` (endet Zeile 429), vor `removeProperty()`:

       ```ts
       /**
        * Mark `propKey` on `component` as set without giving it a value: the change trail carries
        * an entry that names only the key, and the entity behind it reads the property as
        * `undefined` with the key in place. {@link ComponentContext.setProperty} with `undefined`
        * is the other thing — a removal.
        *
        * An equality rule registered for the key is forgotten, the way it is for a
        * {@link ComponentContext.setProperty} that comes without one: there is no value here for a
        * rule to compare.
        *
        * @returns `true` when this differs from the last value written to a change trail, and
        *   `false` for an instance that does not own its entry
        */
       setPropertyWithoutValue(component: ViewComponent, propKey: string): boolean {
         const vi = this.#entryOf(component);
         if (vi != null) {
           vi.propIsEqual?.delete(propKey);
           return vi.changes.setPropertyWithoutValue(propKey);
         }
         return false;
       }
       ```

     - `transferPropertiesTo()` (Zeile 458-470), die Schleife. Ohne diese Verzweigung reicht der
       Marker als Wert an den Zielkontext weiter, reist im nächsten Trail mit und stirbt im Worker
       an einem `DataCloneError` — nachgemessen in Zug 0:
       `structuredClone({p: [['a', Symbol('x')]]})` wirft `DataCloneError: Symbol(x) could not be cloned.`

       ```ts
       for (const [key, value] of vi.changes.getProperties()) {
         if (value === PropertyWithoutValue) {
           target.setPropertyWithoutValue(component, key);
         } else {
           target.setProperty(component, key, value);
         }

         const isEqual = vi.propIsEqual?.get(key);
         if (isEqual != null) {
           target.#registerPropIsEqual(component, key, isEqual);
         }
       }
       ```

       Der Doc-Block darüber bekommt einen Satz: eine ohne Wert gesetzte Eigenschaft geht als
       ebensolche hinüber und nicht als Wert `undefined`, den das Ziel als Entfernung läse. Die
       vorhandene Begründung zur Schreibreihenfolge (erst der Wert, dann die Regel) bleibt und gilt
       unverändert auch für den neuen Zweig.

     - Zwei Leser, zwischen `commitChangeTrail()` (endet Zeile 796) und `reCreateChanges()`:

       ```ts
       /**
        * Whether the Component Memory holds a state for `uuid` — the state
        * {@link ComponentContext.reCreateChanges} would rebuild that component from.
        */
       hasComponentState(uuid: string): boolean {
         return this.#componentMemory.hasComponentState(uuid);
       }

       /**
        * The state the Component Memory holds for `uuid`, or `undefined` where it holds none.
        *
        * A snapshot, not the record: the property list of the record is rewritten in place as
        * trails come in, so a caller holding on to it would be reading a moving value — or
        * writing one. The memory is written by {@link ComponentContext.buildChangeTrails} and
        * {@link ComponentContext.commitChangeTrail} and by nothing else; this is the window a
        * test or a diagnosis needs, and the way that does not go through
        * {@link ComponentContext.reCreateChanges}, which rebuilds every component to answer.
        */
       getComponentState(uuid: string): ComponentState | undefined {
         const state = this.#componentMemory.getComponentState(uuid);
         if (state === undefined) return undefined;
         return {
           ...state,
           properties: state.properties?.map((entry) => (entry.length === 1 ? [entry[0]] : [entry[0], entry[1]])),
         };
       }
       ```

  6. **`ViewComponent.ts` — der Durchreicher**, direkt hinter `setProperty()` (Zeile 280-282), vor
     `removeProperty()`. Jede Eigenschaftsoperation dieses Kontextes hat hier ihr Gegenstück, und
     `ViewComponent` ist die Fläche, die eine Anwendung benutzt:

     ```ts
     /**
      * Mark a property as set without giving it a value. The entity holds the key and reads it as
      * `undefined`; {@link ViewComponent.setProperty} with `undefined` removes it instead.
      *
      * @returns `true` if this differs from the last value written to the change trail.
      *   A destroyed component always returns `false`.
      */
     setPropertyWithoutValue(name: string): boolean {
       return this.#context?.setPropertyWithoutValue(this, name) ?? false;
     }
     ```

  7. **Die Tests der View-Seite, und darunter der Regressionstest.** Alle in
     `packages/shadow-objects/src/view/ComponentContext.spec.ts`. Der Helfer `makeContext()` steht
     in Zeile 13, das `afterEach` mit `ctx?.clear()` in Zeile 20.

     - Im vorhandenen Block `describe('properties', …)` (Zeile 446), hinter dem letzten Fall:
       `sends a property set without a value as the bare key` — ein `ViewComponent`, darauf
       `setPropertyWithoutValue('foo')`, und der erste Trail trägt
       `{type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a', properties: [['foo']]}`.
     - Ebendort: `carries a property set without a value into the context a component joins` —
       zwei Kontexte aus `makeContext()`, `setPropertyWithoutValue` im ersten, ein Trail, dann
       `a.context = other`, und der Trail des zweiten trägt `properties: [['foo']]`. Muster für
       den zweiten Kontext samt Aufräumen: `ComponentContext.spec.ts:162-178`.
     - Neuer Block `describe('the component memory', …)` direkt vor
       `describe('reCreateChanges', …)` (Zeile 838), mit zwei Fällen:
       `answers whether the memory holds a state for a uuid` — vor dem ersten Trail `false`,
       danach `true`, und `getComponentState(uuid)?.token` ist `'a'`.
       `hands out a snapshot of the component state, not the record` — die `properties` des
       Ergebnisses leeren und danach erneut lesen; die zweite Antwort trägt weiterhin
       `[['foo', 'bar']]`.
     - **Der Regressionstest**, im Block `describe('reCreateChanges', …)` hinter dem letzten Fall
       (endet Zeile 887), Name `restores a property that was set without a value`:

       ```ts
       ctx = makeContext();
       const a = new ViewComponent('a', {context: ctx});
       a.setPropertyWithoutValue('bare');
       a.setProperty('value', 1);
       ctx.buildChangeTrails();

       expect(ctx.getComponentState(a.uuid)?.properties, 'the memory keeps the bare key').toEqual([
         ['bare'],
         ['value', 1],
       ]);

       ctx.reCreateChanges();

       expect(ctx.buildChangeTrails()).toEqual([
         {
           type: ComponentChangeType.CreateEntities,
           uuid: a.uuid,
           token: 'a',
           properties: [['bare'], ['value', 1]],
         },
       ]);
       ```

       Vor Schritt 8 hält die erste Zusicherung und die zweite fällt: der Create-Eintrag trägt
       `properties: [['value', 1]]`, weil `changeProperty('bare', undefined)` den Schlüssel als
       unverändert verwirft. Genau das ist der Befund.

  8. **Die Korrektur** in `ComponentContext.reCreateChanges()` (Zeile 825-829). Die Arität des
     Memory-Eintrags wählt den Weg:

     ```ts
     if (cMem.properties) {
       for (const entry of cMem.properties) {
         const key = entry[0];
         // the arity decides: a one-element entry is a property that is set without a value, and
         // reading it as `[key, undefined]` would hand a removal to a component that has nothing
         // to remove -- the key would fall out of the rebuild without a word
         if (entry.length === 1) {
           changes.setPropertyWithoutValue(key);
         } else {
           changes.changeProperty(key, entry[1], c.propIsEqual?.get(key));
         }
       }
     }
     ```

  9. **Die Kernel-Seite des Protokolls — zwei Fälle, kein Produktivcode.** Die dritte Form kommt
     dort heute schon an: `Kernel.#parse()` reicht `entry.properties` unverändert an
     `createEntity()` und `changeProperties()` weiter, und `Entity.setProperties()`
     (`Entity.ts:515-522`) destrukturiert `[key, val]`, sodass ein einträgriger Eintrag
     `setProperty(key, undefined)` ergibt und der Schlüssel als Signal entsteht. Das ist geprüft
     und nicht behauptet — es fehlen nur die Wächter darüber, und die zieht dieses Paket ein, weil
     die View-Seite ab jetzt wirklich solche Einträge sendet.

     - `packages/shadow-objects/src/in-the-dark/Entity.spec.ts`, neuer Block
       `describe('properties', …)` direkt vor `describe('truthy property cache', …)` (Zeile 323),
       ein Fall `sets a property that an entry names without a value`: Kernel aus `makeKernel()`
       (Zeile 16), `createEntity`, dann `entity.setProperties([['bare']])`, und
       `expect(entity.propKeys(), 'the key is there').toContain('bare')`,
       `expect(entity.getProperty('bare'), 'and the value is not').toBeUndefined()`,
       `expect(entity.propKeys(), 'a key nothing named is not').not.toContain('never')`.
       Kernel am Ende `destroy()`, wie die Nachbarn.
     - `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`, im vorhandenen Block
       `describe('entity lookup and the change trail', …)` (Zeile 4058), ein Fall
       `applies a property entry that names only its key`: ein Trail aus zwei Einträgen —
       `{type: ComponentChangeType.CreateEntities, uuid, token: 'node', properties: [['bare']]}` und
       `{type: ComponentChangeType.ChangeProperties, uuid, properties: [['second']]}` — durch
       `kernel.run({changeTrail})` (Muster: Zeile 5933), danach beide Schlüssel in
       `kernel.getEntity(uuid).propKeys()` und beide Werte `undefined`.

  10. **`types.ts`, der Doc-Block über `ComponentPropertiesType` (Zeile 22-30).** Der erste Absatz
      bleibt. Der zweite sagt heute »Nothing in this package writes the one-element form« und ist
      danach falsch. An seine Stelle kommt ein Absatz, der den Schreiber nennt —
      `ViewComponent.setPropertyWithoutValue()`, über `ComponentContext` bis in `ComponentChanges`,
      und dass `setProperty(name, undefined)` daneben die Entfernung bleibt — und der die zweite
      Herkunft stehen lässt: ein Change Trail, den ein Aufrufer selbst zusammensetzt und den
      `Kernel.createEntity()` und `Kernel.changeProperties()` entgegennehmen.

  11. **`docs/api-reference.md`**, vier Stellen:
      - Hinter `#### removeProperty(name)` (Zeile 784-790) ein eigener Abschnitt
        `#### setPropertyWithoutValue(name): boolean` im Ton der beiden Nachbarn: Der Schlüssel ist
        gesetzt, ein Wert steht nicht dahinter; die Entity liest die Eigenschaft als `undefined` und
        hat sie in ihren Schlüsseln. Der Change Trail trägt dafür einen Eintrag, der nur den
        Schlüssel nennt. Rückgabe wie bei `setProperty`. Der Satz »Setting a property to
        `undefined` is equivalent to `removeProperty(name)`« in Zeile 782 bleibt, wie er ist, und
        bekommt einen Verweis auf den neuen Abschnitt als die andere Sache.
      - In der Tabelle unter »After `destroy()`« (Zeile 908) wird die Zeile
        `` `setProperty`, `removeProperty` `` um den neuen Namen ergänzt.
      - In der Tabelle `#### Properties` des `ComponentContext`-Abschnitts (Zeile 1058-1064) eine
        Zeile für `setPropertyWithoutValue(component, propKey)` zwischen `setProperty` und
        `removeProperty`. Der Absatz darunter über `transferPropertiesTo()` bekommt einen Halbsatz:
        eine ohne Wert gesetzte Eigenschaft kommt als ebensolche an.
      - In der Tabelle `#### Change trails` (Zeile 1081-1087) zwei Zeilen für
        `hasComponentState(uuid)` und `getComponentState(uuid)`, mit dem Zusatz, dass die zweite
        einen Schnappschuss liefert. Der Eintrag zu `reCreateChanges()` bekommt einen Halbsatz: was
        die Memory ohne Wert hält, wird auch ohne Wert wieder aufgebaut.
  12. **`docs/cheat-sheet.md`**, zwei Stellen: im Codeblock »ViewComponent API (View Layer)«
      (Zeile 379-390) eine Zeile `vc.setPropertyWithoutValue('score');` mit einem Kommentar, der sie
      von der Zeile 382 darüber abgrenzt, und in der Tabelle »After `destroy()`« (Zeile 399) der
      neue Name in derselben Zelle wie `setProperty`.
  13. **`packages/shadow-objects/CHANGELOG.md`**, unter `## [Unreleased]` zwei Einträge im Stil der
      Nachbarn, jeder in sich verständlich, und **hier ist der Rückblick auf den Vorzustand
      erwünscht** (»used to …«) — die Konvention »kein Rückblick« gilt Code, Kommentaren und Doku,
      nicht dem CHANGELOG, dessen Aufgabe genau die Differenz ist:
      - Unter `### New` (Zeile 252): `ViewComponent.setPropertyWithoutValue(name)` und
        `ComponentContext.setPropertyWithoutValue(component, propKey)` setzen eine Eigenschaft ohne
        Wert, die als einträgriger Eintrag im Change Trail reist; dazu
        `ComponentContext.hasComponentState(uuid)` und `getComponentState(uuid)` als Fenster in die
        Component Memory, das zweite als Schnappschuss.
      - Unter `### Bugfixes` (Zeile 313), Präfix `**Bugfix (view):**`:
        `ComponentContext.reCreateChanges()` baut eine ohne Wert gesetzte Eigenschaft wieder als
        solche auf, statt sie als Entfernung zu lesen und den Schlüssel fallenzulassen.
      Der einleitende Absatz unter `## [Unreleased]` samt seiner Zählung (»Sixty changes«) bleibt
      unangetastet: beide Änderungen sind additiv und brechen keine zugesagte Oberfläche.
  14. **Was unberührt bleibt, und das ist geprüft, nicht vergessen:**
      `packages/shadow-objects/README.md` nennt Eigenschaften nur in zwei Prosazeilen (Zeile 9 und
      der Schichtentabelle Zeile 96) und führt keine Methodenliste — es wird von dieser Änderung
      nicht falsch. `AGENTS.md` handelt im einzigen berührbaren Abschnitt (»Dispatching a
      notification«) von der Wahl zwischen den Emit-Varianten, die dieses Paket nicht anfasst.
      `ComponentMemory.ts` bekommt keine Zeile: `hasComponentState()` und `getComponentState()`
      stehen dort bereits (Zeile 43-49), das Finding zielt auf den fehlenden Zugang von außen.
      `props-utils.ts` und `props-utils.spec.ts` decken die dritte Form schon ab. Das
      Wurzel-`CHANGELOG.md` und `packages/shae-offscreen-canvas/` bleiben draußen. Kein `TODO`
      entsteht oder fällt weg, also kein `pnpm make:todo`. Es entsteht keine neue Datei unter
      `src/`, also ändern sich weder die Dateiliste unter `dist/` noch die Gestalt von
      `dist/package.json`, und `src/distContract.files.txt` und `src/distContract.package.json`
      bleiben, wie sie sind.
  15. **Für den Reviewer**, an dem dieses Paket hängt. Der Diff ist mittelgroß, die Invarianten sind
      es nicht. Vier Proben:
      - **Der Marker darf die View-Seite nicht verlassen.** Ein Symbol im Change Trail stirbt in
        `cloneChangeTrail()` an einem `DataCloneError`, sobald der Trail zu einem Worker geht — in
        `LocalShadowObjectEnv` fiele es nie auf. Die Ausgänge aus `#nextProperties` und
        `#properties` sind genau drei: `makeCreateEntityChange()`, `makeChangePropertyChange()` und
        `getProperties()` → `transferPropertiesTo()`. Alle drei prüfen; ein vierter wäre ein Befund.
      - **`#noteTravellingProperties()` und `#commitProperties()` lesen beide die Arität.** Fehlt
        eine der beiden Übersetzungen, liest die geschriebene beziehungsweise die reisende Hälfte
        einen ohne Wert gesetzten Schlüssel als Entfernung, und der nächste Diff sendet ihn
        entweder erneut oder gar nicht mehr. Das ist die Stelle, an der ein Fehler still bleibt.
      - **Die Umdeutung von `setProperty(key, undefined)` steht nicht zur Debatte** und ist hier
        entschieden, mit dem Grund unter »Ausgangslage« oben. Der vorhandene Fall
        `ComponentContext.spec.ts:447` und die drei Doku-Stellen müssen unverändert grün
        beziehungsweise unverändert stehen bleiben; ändert der Diff eine davon, ist das ein Befund.
      - **Der Regressionstest muss vor Schritt 8 rot gewesen sein.** Der Report hat das Log; ohne
        es ist das Paket nicht fertig. Die anderen Fälle sind Wächter über eine neue Fähigkeit und
        vorher grün — das ist kein Mangel und wird als solcher auch nicht gemeldet.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
  · Zwischenrunden: `pnpm -F @spearwolf/shadow-objects exec vitest src/view src/in-the-dark --run` (in Zug 0 gefahren: 13 Dateien, 695 Fälle, 0,9 s; die gezielte Auswahl lässt `src/distContract.spec.ts` und damit den Build-Zwang aus)
- Commit: `feat(view): a property set without a value survives the rebuild from the component memory`
- Ergebnis: 3 Runden · CONS-021 und DX-009 behoben · Regressionstest
  `restores a property that was set without a value` (vor der Korrektur an `reCreateChanges()`
  rot: der Create-Eintrag trug `properties: [['value', 1]]` statt `[['bare'], ['value', 1]]`) ·
  dazu ein Wächter über die Klon-Invariante,
  `carries a property set without a value through the clone and into the entity` in
  `packages/shadow-objects-testing/test/change-props.test.js` — er läuft im echten Chromium
  gegen das gebaute `dist/` und wurde unter absichtlicher Sabotage rot gesehen
  (`DataCloneError: Symbol(shadow-objects/property-without-value) could not be cloned`);
  die Fälle der Schritte 2 bis 6 sind Wächter über eine neue Fähigkeit und vorher grün ·
  Verify `pnpm lint && pnpm typecheck && pnpm build && pnpm test` exit 0 (933 + 384 + 138
  vitest-Fälle, 654 E2E) · klein: der Kommentar über dem Klon-Wächter
  (`change-props.test.js:106-107`) sagt unbedingt, jeder Eintrag gehe durch den Klon —
  `no-structured-clone` an `<shae-worker>` hebt genau das auf, der Satz greift eine Stufe
  zu weit · Abweichung von der Commit-Message des Detailplans: sie nannte nur den Bugfix,
  das Fenster in die Component Memory fehlte; die committete Fassung nennt beide Hälften
  im Stil von `f13abdd`
- Nebenbefunde: → Queue (2)
- Folgen: keine
- Schnittstellen: `ViewComponent.setPropertyWithoutValue(name: string): boolean` — neu, setzt
  eine Eigenschaft, die nur ihren Schlüssel nennt; gibt `false` zurück, wenn die Komponente
  keinen Kontext mehr hat · `ComponentContext.setPropertyWithoutValue(component, propKey)` und
  `ComponentChanges.setPropertyWithoutValue(key)` tragen sie darunter ·
  `ComponentContext.hasComponentState(uuid: string): boolean` und
  `ComponentContext.getComponentState(uuid: string): ComponentState | undefined` — neu, das
  lesende Fenster in die Component Memory; `getComponentState()` gibt einen Schnappschuss
  heraus, nicht den Record: Zustandsobjekt, Eigenschaftsliste und deren Tupel sind kopiert,
  die Werte darin sind dieselben Referenzen · `ComponentState` war über `index.ts` bereits
  exportiert · `PropertyWithoutValue` ist ein Modul-Symbol in `ComponentChanges.ts` und
  **verlässt die View-Seite nicht** — ein Symbol im Change Trail stirbt in `cloneChangeTrail()`
  an einem `DataCloneError`; wer eine weitere Stelle anlegt, die aus `#properties` oder
  `#nextProperties` herausreicht, übersetzt dort in die einträgrige Form zurück

**CONS-021 · info · packages/shadow-objects/src/view/ComponentContext.ts:824; src/view/ComponentChanges.ts:357** — reCreateChanges() verliert eine Eigenschaft, die nur ihren Schlüssel nennt

ComponentPropertiesType führt zwei Formen, und types.ts:23-31 hält sie ausdrücklich auseinander: [name, value] heißt »Wert ist da«, das einträgrige [name] heißt »gesetzt, ohne Wert«. ComponentMemory bewahrt die einträgrige Form treu. reCreateChanges() destrukturiert dagegen const [key, value] und reicht einen solchen Eintrag als changeProperty(key, undefined, …) weiter — aus »gesetzt, ohne Wert« wird damit »Wert ist weg«. ComponentChanges führt seine Eigenschaften als Map<string, unknown> und nimmt beim Bauen des Create-Eintrags jeden undefined-Wert wieder heraus: der Schlüssel fällt ganz weg. Eine so gesetzte Eigenschaft überlebt den Neuaufbau eines Context also nicht.

Empfehlung: Zuerst die dritte Form darstellbar machen. Solange ComponentChanges seine Eigenschaften als Map<string, unknown> führt, kann sie »gesetzt, ohne Wert« von »Wert ist weg« nicht unterscheiden, und jede Korrektur allein an reCreateChanges() läuft eine Grenze weiter wieder auf. Das ist eine Entscheidung über die Darstellung im Change Trail und berührt beide Seiten des Protokolls — sie gehört in einen eigenen Durchgang, nicht in ein Aufräumpaket.

**DX-009 · info · packages/shadow-objects/src/view/ComponentContext.ts:109** — Kein Fenster in das Component Memory

Das Component Memory ist privat und hat keinen lesenden Zugang. Wer prüfen will, ob ein Zustand gespeichert wurde — im Test wie in der Diagnose —, muss den Umweg über `reCreateChanges()` nehmen und damit den ganzen Namespace neu aufbauen.

Empfehlung: Ein lesender Durchreicher, etwa `hasComponentState(uuid)`, kostet wenige Zeilen und ersetzt einen Umweg mit Nebenwirkungen.

### [x] 5. Der ConsoleLogger fragt seine eigenen Schalter
- Findings: API-001 (low)
- Ziel: `debug()`, `info()` und `warn()` fragen ihren eigenen Getter, `error()` bleibt ungefiltert, die 34 Schalterklammern an den Aufrufstellen fallen weg, und die zwei Meldungen, die heute bewusst ungeklammert stehen, behalten ihre Unbedingtheit über die Ebene.
- Bereich: `packages/shadow-objects/src/utils/ConsoleLogger.ts`, die 34 geklammerten Aufrufstellen in zwölf Dateien beider Pakete, drei Aufrufe in `RemoteWorkerEnv.readWorkerConfig()` und `generateUUID.ts`, fünf Quelltext-Kommentare, `docs/api-reference.md` und die CHANGELOGs beider Pakete
- Hängt ab von: —
- Hash: ad11734
- **Wiederaufnahme (2026-08-31, Nutzerentscheidung):** Der Umbau selbst ist fertig und war mit
  `pnpm lint && pnpm typecheck && pnpm build && pnpm test` grün; er liegt vollständig in
  `stash@{0}` (`paket-5-abgebrochen`, 20 Dateien, der Plan ist ausgenommen). Er wird
  **zurückgeholt, nicht neu gebaut.** Danach bleibt genau eine Aufgabe, und sie läuft **nicht**
  als weitere Review-Runde: ein einziger geschlossener Durchgang durch den gesamten Abschnitt
  `## [Unreleased]` von `packages/shadow-objects/CHANGELOG.md`, mit der Datei am Stück im Blick
  statt Stelle für Stelle. Die Regel des Durchgangs, wörtlich anzuwenden: **jede Aussage
  darüber, wer die Getter des `ConsoleLogger` fragt, muss den Vertrag nach diesem Paket
  beschreiben.** Das trifft drei Macharten — Sätze, die eine Aufruferklammer beschreiben, die es
  nicht mehr gibt; Sätze, die das Gaten als Aufruferpflicht darstellen; und Sätze, die eine
  einzelne Meldung einer Ebene zuordnen, die sie nicht mehr hat. Weil alles noch
  unveröffentlicht ist, landet dieser Abschnitt in **einer** Release-Notiz: zwei Sätze darin,
  die einander widersprechen, sind ein Fehler und keine Historie. Der neue Eintrag unter
  »Breaking Changes« bleibt, wie er im Stash steht.
- Modell: stärkste Stufe
- Effort: high
- **Warum die Stufe steigt** (Zug 0 der Wiederaufnahme): gescheitert ist nicht das Umbauen,
  sondern das Lesen. Drei Durchgänge über dieselbe Datei haben je eine weitere Schicht
  gefunden, und die letzte Runde hat die Zahl der offenen Befunde nicht gesenkt. Was hier hilft,
  ist ein stärkerer Leser über fünfhundert Zeilen dichte Prosa, kein billigerer. Der Umbau
  kommt fertig aus dem Stash und steht nicht mehr zur Debatte.
- Dateien: `packages/shadow-objects/src/utils/ConsoleLogger.ts`,
  `packages/shadow-objects/src/utils/ConsoleLogger.spec.ts`,
  `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`,
  `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`,
  `packages/shadow-objects/src/view/ShadowEnv.ts`,
  `packages/shadow-objects/src/view/ComponentContext.ts`,
  `packages/shadow-objects/src/worker/WorkerRuntime.ts`,
  `packages/shadow-objects/src/worker/WorkerRuntime.spec.ts`,
  `packages/shadow-objects/src/worker/MessageRouter.ts`,
  `packages/shadow-objects/src/worker/MessageRouter.spec.ts`,
  `packages/shadow-objects/src/elements/ShaePropElement.ts`,
  `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`,
  `packages/shadow-objects/src/in-the-dark/Kernel.ts`,
  `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`,
  `packages/shadow-objects/src/in-the-dark/importModule.ts`,
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/CHANGELOG.md`,
  `packages/shae-offscreen-canvas/src/shadow-objects/ShaeOffscreenCanvas.js`,
  `packages/shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`
- Vorgehen (Wiederaufnahme). In diesem Durchlauf ändert sich genau **eine** Datei:
  `packages/shadow-objects/CHANGELOG.md`. Alles andere kommt fertig aus dem Stash — was darin
  steht, ist unten unter »Bereits umgesetzt« aufgeführt und wird nicht noch einmal gebaut.
  1. **Der Arbeitsbaum ist beim Start dieses Pakets bereits schmutzig.** Der Runner holt vor
     Zug 1 den geprüften Umbau zurück:

     ```bash
     git stash apply 'stash@{0}'
     ```

     `apply` und nicht `pop`: die zwanzig Dateien bleiben bis zum Commit im Stash gesichert,
     falls eine Runde sie verliert. Nach dem Commit in Zug 5 wirft der Runner den Eintrag mit
     `git stash drop 'stash@{0}'` weg. Dass der Stash sauber greift, ist nachgesehen —
     `git stash show -p 'stash@{0}' | git apply --check -` lief ohne Ausgabe, und der Stash
     liegt auf `0c39ff9`, dem heutigen HEAD. Der Implementierer baut nichts davon neu und
     rührt die neunzehn anderen Dateien nicht an.
  2. **Der geschlossene Durchgang durch `## [Unreleased]`** — Zeile 10 bis 510 der Datei, wie
     sie nach Schritt 1 dasteht. Zug 0 hat den Abschnitt bereits zweimal durchgerecht (einmal
     über `isWarn|isDebug|isInfo|logger\.(warn|debug|info|error)|getter`, einmal über
     `ungated|gated|gates|stays silent|prints|printing|localhost|log level`) und jede Fundstelle
     einzeln beurteilt. Drei Stellen sind zu ändern. Sie werden **von unten nach oben**
     bearbeitet — `:483`, dann `:469`, dann `:419` —, damit die Zeilennummern gültig bleiben;
     der eigentliche Anker ist ohnehin der zitierte Wortlaut.

     - **`:483`**, im Eintrag »**Docs (correctness):** §Console Logger of `api-reference.md`
       gained a table …«. Der Schlusshalbsatz lautet heute:

       > and `remoteEnv.logger.warn` names the storage key without asking a getter at all, so it
       > hangs on no switch, the per-namespace one included.

       Er ist doppelt falsch: die Stelle ist nach Schritt 4 des Umbaus `logger.error`, und `warn`
       fragt seit Schritt 2 sehr wohl einen Getter. Ersatz, wörtlich:

       > and `remoteEnv.logger.error` names the storage key at the one level that checks no
       > getter, so it hangs on no switch, the per-namespace one included.

       Die erste Hälfte des Satzes (»it turns off the same three getters the shared switches
       also reach for that one logger, nothing that prints unconditionally among them«) bleibt
       unverändert — sie stimmt weiter.

     - **`:469`**, im Eintrag »**Docs (correctness):** §Namespacing and Contexts, §Kernel and
       §Advanced …«. Der Halbsatz über den Console-Logger-Abschnitt endet heute:

       > combined by the `isEnabled`/`isDebug`/`isInfo`/`isWarn` getters, and those getters are
       > the caller's job because `logger.debug(...)` prints whatever they say.

       Das ist die alte Vertragslage, und `docs/api-reference.md:3259` widerspricht ihr im selben
       Stash wörtlich. Ersatz, wörtlich:

       > combined by the `isEnabled`/`isDebug`/`isInfo`/`isWarn` getters, and `debug()`, `info()`
       > and `warn()` each check the getter of their own level before printing, while `error()`
       > checks none.

       Der Rest des Eintrags bleibt Zeile für Zeile stehen; er zählt Doku-Korrekturen auf, die
       mit dem Logger nichts zu tun haben.

     - **`:419`**, im Eintrag »**Bugfix (worker):** `MessageRouter` and `WorkerRuntime` report
       through a `ConsoleLogger` of their own …«. Der Satz in der Mitte lautet heute:

       > The seven debug lines ask `isDebug` before they print, the unknown-message warning asks
       > `isWarn`; the three error reports stay ungated, the way `RemoteWorkerEnv` keeps its own.

       Das Ergebnis stimmt weiter, die Zurechnung nicht: die Zeilen fragen nichts mehr, ihre
       Methode fragt. Das ist die zweite der drei Macharten (»Gaten als Aufruferpflicht«), und
       sie ist in keiner der bisherigen Runden aufgefallen. Ersatz, wörtlich:

       > The seven debug lines report at debug level and the unknown-message warning at warn
       > level, so each hangs on the getter its own method checks; the three error reports stay
       > ungated, the way `RemoteWorkerEnv` keeps its own.

     Die übrigen beurteilten Stellen bleiben, wie sie sind. Das Urteil steht hier, damit es
     nachprüfbar ist und niemand sie ein viertes Mal aufmacht:

     | Zeile | Was dort über den Vertrag steht | Urteil |
     | --- | --- | --- |
     | `:13` | »Sixty-one changes reach existing consumers« | richtig, in Runde 1 nachgezogen |
     | `:217`-`:219` | Vorbemerkung: die drei Methoden prüfen ihren Getter, `error()` nicht | richtig, beschreibt den neuen Vertrag |
     | `:227` | der neue Eintrag unter »Breaking Changes« | richtig, bleibt wörtlich stehen |
     | `:302` | `logger.error` »is not gated behind `ConsoleLogger.sharedConfig.enable`« | richtig, `error()` fragt keinen Getter |
     | `:313` | `logger.error`, »not gated behind `ConsoleLogger.sharedConfig.enable`« | richtig, dieselbe Aussage |
     | `:317` | `sharedConfig.enable` »gates every `debug`, `info` and `warn` line« | richtig, nach dem Umbau sogar strukturell statt per Konvention |
     | `:382` | der Storage-Key wird »through `logger.error`, at error level, the one level this library leaves ungated« genannt | richtig, in Runde 1 nachgezogen |
     | `:405` | die fehlende `Destroyed`-Quittung wird »through the logger« gemeldet | richtig, macht keine Aussage über Getter |
     | `:418` | `this.logger.error()` statt `logger.warn()`, »which stays silent outside `localhost`« | richtig, die Aussage ist ein Ergebnis und kein Mechanismus |
     | `:421` | die übersprungene Zweitimport-Meldung geht »through `kernel.logger.warn()` behind `isWarn`« | richtig, `warn()` liegt jetzt selbst hinter `isWarn`; »`error` is the one level this library leaves ungated« stimmt ebenfalls |
     | `:504` | `MessageRouter.logger` ist ein Getter ohne Setter | richtig, betrifft den Slot und nicht die Ebenen |
     | `:205`, `:208`, `:211`, `:239`, `:243`, `:253` | die Gruppe »`logger` slot is a getter without a setter« | unberührt, sie handelt vom Slot und nicht vom Gaten |

     Der Rückblick auf den Vorzustand (»used to print regardless«, »used to reach the console«)
     bleibt in `:217`-`:219` und `:227` stehen und ist **kein** Verstoß gegen die Konventionen
     im Kopf: ein Eintrag unter »Breaking Changes« richtet sich an den, der die Vorversion kennt,
     und ohne den Vorzustand sagt er nicht, was bricht. Die Regel gilt Code, Kommentaren und
     Doku; die Gattung CHANGELOG ist der eine Ort, an dem der Vorzustand die Information ist.
  3. **Danach den Abschnitt einmal am Stück lesen**, Zeile 10 bis 510, ohne `grep`. Die zwei
     Muster oben finden, was die Vokabeln des Vertrags nennt — sie finden nicht, was ihn
     umschreibt, und genau daran ist jede bisherige Runde vorbeigelaufen. Kommt dabei eine
     weitere Aussage zutage, wird sie nach derselben Regel geändert und im Report benannt.
     Kommt keine, steht auch das im Report: »der Durchgang am Stück hat nichts weiter gefunden«
     ist das Ergebnis, das dieser Schritt schuldet, und ohne diesen Satz ist er nicht belegt.
  4. `packages/shae-offscreen-canvas/CHANGELOG.md` ist in Zug 0 mitgeprüft. Der einzige Eintrag
     zum Thema — die sieben Log-Aufrufe verlieren ihre Klammer, weil der `ConsoleLogger` den
     Getter selbst fragt, und für Konsumenten des Canvas-Elements ändert sich nichts —
     beschreibt den Vertrag richtig. Dort ist nichts zu tun.
  5. Kein anderer Abschnitt des Kernpaket-CHANGELOGs wird angefasst. Alles unterhalb von
     `## [0.33.0]` ist veröffentlichte Historie und beschreibt den Vertrag, der zu seiner Zeit
     galt.
  6. Es wird **kein** Code, kein Test und keine Doku geändert. Ein Regressionstest gehört nicht
     zu diesem Durchlauf: die vier neuen Fälle in `ConsoleLogger.spec.ts` liegen im Stash, sie
     standen vor der Korrektur rot, und der Nachweis steht im Verlauf dieses Pakets.
- **Bereits umgesetzt und reviewt.** Das ist der Inhalt von `stash@{0}` und zugleich die
  Messlatte, gegen die der Reviewer den Diff über alle zwanzig Dateien hält. Die Schritte stehen
  unverändert in der Zeitform, in der sie beauftragt wurden — sie lesen sich als Auftrag und sind
  doch längst ausgeführt. Nichts davon wird noch einmal gebaut, nichts davon geändert, und kein
  Test wird noch einmal rot gesehen:
  1. **Zuerst rot sehen.** Die neuen Fälle in
     `packages/shadow-objects/src/utils/ConsoleLogger.spec.ts` werden vor Schritt 2 geschrieben
     und gefahren. Drei davon sind Regressionstests und stehen vorher rot; einer ist ein Wächter
     und ist vorher wie nachher grün — er wird als solcher benannt, ein roter Lauf dort wäre ein
     Befund. Das rote Log gehört in den Report.

     Neuer Block `describe('the switches of a level', …)` am Ende der bestehenden
     `describe('ConsoleLogger', …)`-Klammer. `ConsoleLogger.sharedConfig` ist ein prozessweites
     statisches Objekt: der Block sichert es in einem `beforeEach` und stellt es im `afterEach`
     wieder her, genau wie `worker/MessageRouter.spec.ts:75-87` es vormacht. Die Importzeile der Datei wächst dafür um
     `beforeEach` und `vi` aus `vitest` und um `type ConsoleLoggerConfig` aus `./ConsoleLogger.js`.

     ```ts
     describe('the switches of a level', () => {
       let snapshot: ConsoleLoggerConfig;

       beforeEach(() => {
         snapshot = {...ConsoleLogger.sharedConfig};
       });

       afterEach(() => {
         Object.assign(ConsoleLogger.sharedConfig, snapshot);
         vi.restoreAllMocks();
       });

       it('keeps a debug line off the console while the shared debug switch is off', () => {
         const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
         ConsoleLogger.sharedConfig.enable = true;
         ConsoleLogger.sharedConfig.debug = false;

         new ConsoleLogger('switch-namespace').debug('nobody asked for this');

         expect(debug).not.toHaveBeenCalled();
       });
       // … dasselbe für `info` gegen `sharedConfig.info` und für `warn` gegen `sharedConfig.warn`
     });
     ```

     Vier Fälle, die Namen wörtlich:
     - `keeps a debug line off the console while the shared debug switch is off` (rot)
     - `keeps an info line off the console while the shared info switch is off` (rot)
     - `keeps a warn line off the console while the shared warn switch is off` (rot)
     - `prints an error report while every switch is off` (Wächter, vorher wie nachher grün):
       `enable` und alle drei Ebenen auf `false`, `logger.error('this one always arrives')`,
       `expect(error).toHaveBeenCalledTimes(1)`.

     Dazu ein fünfter, der die andere Hälfte des Getters abdeckt — `isEnabled` kombiniert die
     Instanzflagge mit der geteilten. Name: `keeps every level but the error report off the
     console while the instance is disabled`. Alle drei geteilten Schalter auf `true`,
     `logger.enable = false`, dann je ein `debug`/`info`/`warn`/`error`-Aufruf: die ersten drei
     Spies leer, `console.error` einmal gerufen. Vor der Korrektur rot.
  2. `packages/shadow-objects/src/utils/ConsoleLogger.ts:307-321`: jede der drei Methoden fragt
     ihren Getter und kehrt sonst zurück. `error()` und `#print()` bleiben, wie sie sind —
     `#print()` bleibt der eine Formatierungsweg und bekommt keine Bedingung.

     ```ts
     debug(...args: any[]) {
       if (!this.isDebug) return;
       this.#print('debug', ConsoleLogger.sharedStyles.debug, args);
     }
     ```

     Ebenso `info()` gegen `this.isInfo` und `warn()` gegen `this.isWarn`. Über die drei einen
     Satz, der sagt, warum `error()` nicht dazugehört: ein Fehlerbericht nennt einen Fehler im
     aufrufenden Code, und sein Autor muss ihn sehen, wo die Anwendung läuft — nicht nur auf
     einem Loopback-Host.

     Die beiden `if (ConsoleLogger.isDebug)` in `loadConfig()` (Zeile 224 und 264) bleiben
     unangetastet: sie klammern ein direktes `console.debug`, keinen Methodenaufruf.
  3. **Die 34 Schalterklammern entfernen.** Jede ist von der Form
     `if (<logger>.isX) { <logger>.X(…); }` und wird zum nackten Aufruf. Kein einziges der
     Argumente ist teuer zusammengesetzt — nachgesehen sind alle 34: Feldzugriffe, `this`,
     kleine Objektliterale, Template-Strings, ein `Math.round`; `ComponentContext`s
     `#uncommittedTrail.entries` ist ein Array-Feld (`ComponentContext.ts:136`), nicht Getter,
     und `ShadowObjectCreationScope`s `#displayName` ist ein `readonly string`
     (`ShadowObjectCreationScope.ts:65`). Es bleibt also keine Klammer stehen.

     | Datei | Zeilen der Klammer |
     | --- | --- |
     | `view/RemoteWorkerEnv.ts` | 286, 526, 548 |
     | `view/ShadowEnv.ts` | 166, 557 |
     | `view/ComponentContext.ts` | 753 |
     | `worker/WorkerRuntime.ts` | 46, 55, 63 |
     | `worker/MessageRouter.ts` | 105, 116, 136, 157, 210 |
     | `elements/ShaePropElement.ts` | 244, 469, 541 |
     | `elements/ShaeWorkerElement.ts` | 247, 396, 407, 421, 430 |
     | `in-the-dark/Kernel.ts` | 313, 576 |
     | `in-the-dark/ShadowObjectCreationScope.ts` | 258, 314 |
     | `in-the-dark/importModule.ts` | 24 |
     | `shae-offscreen-canvas/src/shadow-objects/ShaeOffscreenCanvas.js` | 128, 137, 145, 172 |
     | `shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.js` | 134, 297, 304 |

     Vier davon sind keine reine Streichung:
     - `RemoteWorkerEnv.ts:526`, `ShaeWorkerElement.ts:407` und `ShaeWorkerElement.ts:430` stehen
       als `} else if (<logger>.isX) {` in einer Kette. Dort wird aus dem `else if` ein `else`,
       nicht ein gestrichener Zweig. Die drei Ketten sind danach Zeile für Zeile
       verhaltensgleich: der einzige Zweig, den die Bedingung heute überspringt, ist der
       Log-Aufruf selbst.
     - `ShadowObjectCreationScope.ts:314` ist zusammengesetzt:
       `if (this.#logger.isInfo && this.#shadowObject !== undefined)`. Die zweite Hälfte bleibt
       stehen — sie entscheidet, ob es überhaupt etwas zu melden gibt, und der Kommentar darüber
       erklärt genau sie.
  4. **Die zwei bewusst ungeklammerten Meldungen in `RemoteWorkerEnv.readWorkerConfig()`
     (Zeile 579 und 584) werden `logger.error`.** Sie melden einen Konfigurationsschlüssel, den
     jemand von Hand in seine Storage geschrieben hat und der nicht lesbar ist; der Kommentar
     darüber sagt, warum sie unbedingt sein müssen: wer diesen Schlüssel setzt, will den Worker
     reden hören, und ein stiller Rückfall schickt ihn in den Worker hinein, um dort nach einem
     Grund zu suchen, der davor liegt. Nach Schritt 2 kann eine Meldung nur noch als `error`
     unbedingt sein. Das Projekt kennt diese Begründung bereits dreimal wörtlich —
     `ShaeWorkerElement.ts:454-457`, `Kernel.ts:886-890`, `ShadowObjectCreationScope.ts:468-472`
     —, und diese beiden Stellen sind der vierte Fall derselben Regel. Der Kommentar über
     Zeile 579 wird entsprechend nachgezogen: nicht »ungated«, sondern die Ebene, die keinen
     Schalter fragt, und warum diese Meldung sie braucht.

     Der dritte ungeklammerte Aufruf, `RemoteWorkerEnv.ts:437` (»the worker did not acknowledge
     the teardown«), bleibt `warn` und ist ab Schritt 2 geschaltet. Er ist die Stelle, die das
     Audit als unbegründet führt: ein Worker, der den Abbau nicht quittiert, wird ohnehin
     terminiert, die Meldung ist Diagnose und gehört hinter den Schalter.
  5. **Specs, die Schritt 4 umwirft**, in `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`:
     - `starts when the stored worker config is not readable as JSON` (Zeile ~907) und die
       `it.each`-Reihe `treats a stored config of %s (%s) like a missing one` (Zeile ~941)
       greifen `console.warn` ab und prüfen, dass die Meldung den Storage-Key nennt. Beide
       wechseln auf `console.error`. Prüfausdruck und Formulierung bleiben sonst gleich.
     - `terminates the worker and reports it when the teardown is never acknowledged`
       (Zeile ~587) prüft, dass die Teardown-Meldung genau einmal kommt. Sie hängt ab Schritt 2
       an den geteilten Schaltern, und die Datei fasst `ConsoleLogger.sharedConfig` nirgends an:
       heute trägt sie eine stille Abhängigkeit von der Bind-Adresse des Testservers. Der Fall
       setzt `ConsoleLogger.sharedConfig.enable` und `.warn` selbst auf `true` und stellt beide
       im `finally` wieder her — dasselbe Muster wie das `before`/`after`-Paar in
       `packages/shadow-objects-testing/test/worker-element-attributes.test.js:28-41`.

     Die übrigen `console.warn`/`console.debug`-Zusicherungen des Repos setzen ihre Schalter
     bereits selbst (`worker/MessageRouter.spec.ts`, `worker/WorkerRuntime.spec.ts`,
     `shadow-objects-testing/test/worker-element-attributes.test.js`) oder schalten den Logger
     ausdrücklich ab (`shae-offscreen-canvas/src/elements/ShaeOffscreenCanvasElement.spec.js:116`).
     Sie bleiben, wie sie sind.
  6. **Vier Quelltext-Kommentare und zwei Spec-Kommentare** erzählen die Regel in ihrer alten
     Form und werden nachgezogen. Sie beschreiben durchweg *warum* eine Stelle `error` statt
     `warn` nimmt; dieser Grund bleibt gültig, nur die Mechanik wandert von der Aufrufstelle in
     die Methode. Keine Formulierung darf den Vorzustand erzählen (Konventionen im Kopf).
     - `in-the-dark/importModule.ts:20-23` — nennt die Klammer, die verschwindet, und verweist
       auf »die Tabelle von Aufruf gegen Getter«. Der Grund bleibt: diese Zeile beschreibt die
       Gestalt eines Modulgraphen und keinen Fehler, deshalb `warn` und nicht `error`.
     - `elements/ShaeWorkerElement.ts:454-457` — »a `warn` call on this element is checked
       against `isWarn` first«: stimmt weiter, fragt jetzt die Methode.
     - `in-the-dark/Kernel.ts:886-890` — dieselbe Formulierung, dieselbe Behandlung.
     - `in-the-dark/ShadowObjectCreationScope.ts:452-455` und `:468-472` — ebenso; die zweite
       verweist zusätzlich auf die Tabelle in `docs/api-reference.md`.
     - `worker/MessageRouter.spec.ts:325-328` — »The skip line is the one report of this branch
       that asks a getter first«: ab Schritt 2 fragt jede debug-, info- und warn-Zeile einen.
       Der Fall bleibt, was er ist — er prüft, dass die Instanzflagge die Zeile stilllegt —, der
       Satz davor sagt das dann auch.
     - `worker/WorkerRuntime.spec.ts:95-100` — »reading `this.logger.isDebug` right after
       installing the config builds the runtime's own `ConsoleLogger`«: den Logger baut ab
       Schritt 2 der `logger.debug(…)`-Aufruf statt des Getters. Der Mechanismus, den der
       Kommentar erklärt, bleibt derselbe; nur der Auslöser heißt anders.
  7. **`packages/shadow-objects/docs/api-reference.md`**, drei Stellen:
     - Zeile 3249-3256: Im Codebeispiel fällt die Klammer um `kernel.logger.debug(…)` weg. Der
       Absatz **»The getters are the caller's job.«** wird ersetzt: jede der drei Methoden fragt
       ihren eigenen Getter, `error` fragt keinen. Die Getter bleiben öffentlich und lohnen die
       Klammer weiterhin dort, wo das Zusammenstellen der Argumente selbst etwas kostet — und
       das Beispiel dieser Seite ist genau so ein Fall: `kernel.getEntityGraph()` läuft den Baum
       ab und läuft ihn auch dann ab, wenn die Zeile nichts druckt. Also beide Formen zeigen,
       die nackte als Normalfall und die geklammerte als die Ausnahme, für die es die Getter
       weiterhin gibt.
     - Dieselbe Tabelle: die Spalte »Ask first« heißt danach nicht mehr so. Die drei Zeilen
       nennen den Getter, den die Methode selbst fragt; die `error`-Zeile bleibt inhaltlich, wie
       sie ist.
     - Zeile 2099-2101 (`ShaeEntElement`, `protected logger`): »That switch decides the
       `isDebug`, `isInfo` and `isWarn` getters on this element's own logger, **not** the
       `debug`, `info` and `warn` calls themselves, which print whatever a caller passes to them
       regardless« — der Halbsatz ab »not« kehrt sich um. Der Schalter entscheidet die Aufrufe.
       Der Rest des Absatzes (`error` hat keinen Getter) bleibt.
     - Zeile 3272, der Absatz über den Worker-Config-Schlüssel: »the key is named once through
       `remoteEnv.logger.warn`, which asks no getter and so hangs on no switch, the
       per-namespace one included« — nach Schritt 4 ist es `remoteEnv.logger.error`, und die
       Begründung wird die des Projekts: `error` ist die eine Ebene, die dieses Projekt
       ungefiltert lässt. Im selben Absatz: »gate their debug and warn lines behind it the way
       every other logger in this library does« — die Klammer liegt jetzt in der Methode, der
       Satz sagt das.
     - Zeile 3241 und 3269 bleiben unverändert: beide beschreiben, was die Getter kombinieren,
       und das ändert sich nicht.
     `packages/shadow-objects/docs/cheat-sheet.md:339-340` bleibt ebenfalls stehen — »`warn` is
     gated behind `ConsoleLogger.sharedConfig.enable`, `error` is not« stimmt vorher wie nachher.
     Die `README.md` des Kernpakets erwähnt den `ConsoleLogger` nirgends; dort ist nichts zu tun,
     und es wird auch kein Abschnitt dafür erfunden.
  8. **CHANGELOGs.** `packages/shadow-objects/CHANGELOG.md` unter `## [Unreleased]`: ein
     Bullet, das die neue Zusage nennt und was ein Konsument des exportierten `ConsoleLogger`
     davon merkt — ein ungeklammertes `logger.debug()` schweigt jetzt, solange
     `sharedConfig.debug` aus ist. Dazu in der Vorbemerkung (`> **Next release: minor.**`) eine
     Teilaussage in der Aufzählung der Änderungen, die bestehende Konsumenten erreichen, und die
     ausgeschriebene Zahl dort von »Sixty« auf »Sixty-one«.
     `packages/shae-offscreen-canvas/CHANGELOG.md` unter `## [Unreleased]`: ein Bullet, dass die
     sieben Log-Aufrufe des Pakets ihre Klammer verlieren, weil der Logger die Prüfung selbst
     übernimmt — für Konsumenten des Canvas-Elements ändert sich nichts.
  9. `AGENTS.md` gegenlesen: der Abschnitt »Dispatching a notification« nennt den
     `ConsoleLogger`, aber keine Schalterregel. Steht dort nach der Änderung nichts Falsches,
     bleibt die Datei unangetastet.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test` — voll, weil die Änderung
  beide Pakete und alle drei vitest-Suiten berührt. Für die Zwischenrunden reicht
  `pnpm -F @spearwolf/shadow-objects test`.
- Commit: `fix(logger): each level of the ConsoleLogger asks its own switch, and an error report asks none`
- Ergebnis: 2 Runden vor dem Abbruch, 1 Runde nach der Wiederaufnahme · API-001 behoben:
  `debug()`, `info()` und `warn()` prüfen je den Getter ihrer eigenen Ebene, `error()` keinen; alle
  34 Schalterklammern in zwölf Dateien beider Pakete sind gefallen, die drei `else if`-Ketten zu
  `else` geworden · Regressionstests in `ConsoleLogger.spec.ts` (Block `the switches of a level`):
  `keeps a debug line off the console while the shared debug switch is off` und die beiden
  Geschwister für `info` und `warn` sowie `keeps every level but the error report off the console
  while the instance is disabled`, alle vier vor dem Fix rot gesehen; dazu der Wächter `prints an
  error report while every switch is off`, vor wie nach der Änderung grün · drei Meldungen, die vor
  dem Umbau ungeklammert und damit unbedingt waren, gehen auf `error`, weil nach dem Umbau nur diese
  Ebene noch unbedingt ist: die beiden in `RemoteWorkerEnv.readWorkerConfig()` und die
  Web-Crypto-Ankündigung in `generateUUID.ts` · die vierte, `RemoteWorkerEnv.ts:435`, bleibt `warn`
  und ist jetzt geschaltet — so vom Plan entschieden · der `## [Unreleased]`-Abschnitt des
  Kernpaket-CHANGELOGs ist in einem geschlossenen Durchgang in Deckung gebracht: drei Sätze geändert
  (`:419`, `:469`, `:483`), einer als Folge der `generateUUID`-Ebene (`:314`), fünfzehn weitere
  einzeln beurteilt und richtig befunden · die Zählung aus Zug 0 lag um eins daneben (37 statt 38
  Aufrufe, 3 statt 4 nackte); Implementierer und Reviewer haben unabhängig nachgezählt und kommen
  beide auf 38 = 34 geklammert + 4 nackt · klein: `docs/api-reference.md:3250` zeigt beide
  Aufrufformen am selben Beispiel, dessen Argument `kernel.getEntityGraph()` gerade der teure Fall
  ist, den der Kommentar zwei Zeilen darunter zur Ausnahme erklärt · klein:
  `ShaePropElement.ts:244` baut Template-String und Objektliteral je Eigenschaft und Wertänderung,
  auch wenn der Schalter aus ist
- Nebenbefunde: → »Offene Befunde«, zwei Einträge in `packages/shadow-objects/CHANGELOG.md`
- Folgen: keine
- Schnittstellen: `ConsoleLogger.debug()`, `.info()` und `.warn()` drucken nur noch, wenn
  `isDebug`/`isInfo`/`isWarn` es zulassen — ein ungeklammertes `logger.debug()` bei einem Konsumenten
  des exportierten `ConsoleLogger` schweigt jetzt, solange `sharedConfig.debug` aus ist. `error()`
  fragt keinen Getter und druckt weiterhin immer; `#print()` bleibt der eine Formatierungsweg ohne
  Bedingung. Die Getter bleiben öffentlich und lohnen eine Klammer weiterhin dort, wo das
  Zusammenstellen der Argumente selbst etwas kostet. Wer eine Meldung unbedingt braucht, nimmt
  `error()` — das ist die einzige Ebene, die dieses Projekt ungefiltert lässt.

**API-001 · low · packages/shadow-objects/src/utils/ConsoleLogger.ts:291-325** — debug(), info() und warn() des ConsoleLogger fragen ihre eigenen Schalter nicht

Die Klasse bietet isDebug, isInfo und isWarn, und #print() fragt keinen davon: jeder Aufruf landet auf der Konsole, gleichgültig wie die Schalter stehen. Die Gattung ist damit reine Aufruferpflicht. Im Repository wird sie fast überall erfüllt, jeweils als if (this.logger.isWarn) { … }, und die API-Referenz führt die Regel als Tabelle von Aufruf gegen Getter. Drei Aufrufe stehen ohne Klammer da: zwei mit einer Begründung im Kommentar, einer ohne (RemoteWorkerEnv.ts:437, die Meldung über einen Worker, der den Teardown nicht quittiert). Von außen ist Absicht nicht von Vergessen zu unterscheiden. ConsoleLogger ist als eigener Einstiegspunkt exportiert, also trifft die Falle auch Konsumenten: ein logger.debug() ohne Klammer protokolliert für immer in Produktion.

Empfehlung: Den Schalter in die Methode ziehen: debug() prüft isDebug, info() prüft isInfo, warn() prüft isWarn, error() bleibt ungefiltert und behält damit seine dokumentierte Rolle. Die Klammern an den Aufrufstellen dürfen bleiben, wo das Zusammenstellen der Argumente selbst teuer ist, und verschwinden überall sonst. Bleibt es beim heutigen Vertrag, gehört wenigstens die eine unbegründete Stelle in RemoteWorkerEnv.destroy() entweder hinter einen isWarn-Test oder hinter einen Kommentar, der sagt warum nicht.

### [x] 6. Typsicherheit: jede Stelle, an der ein bekannter Typ nicht dasteht
- Findings: TYPE-003 (info), TYPE-005 (low), TYPE-006 (info), TYPE-007 (info), TYPE-008 (info), TYPE-009 (info),
  dazu drei Nebenbefunde: `view/ComponentMemory.ts:17` deklariert `order?: number` optional, obwohl kein
  Schreibpfad das Feld je auslässt (aus Paket 4, info) · `utils/waitForMessageOfType.ts:28` nimmt den Guard
  als `(data: any) => boolean`, obwohl beide Aufrufer ihren Payload-Typ kennen (Zug 0, info) ·
  `utils/waitForMessageOfType.ts:46,66` hält das Timer-Handle als `number` und castet den Rückgabewert von
  `setTimeout` nach `any` (Zug 0, info). Alle drei teilen die Ursache des Pakets — ein Typ, den das Projekt
  kennt, steht nicht da — und die letzten beiden stehen in einer Datei, die dieses Paket ohnehin aufmacht.
- Ziel: Neun Stellen, an denen die Prüfung ohne Not aussetzt, tragen den Typ, den das Projekt an ihnen ohnehin schon kennt — samt der Aufrufer, die ein verengter Typparameter mitzieht. Kein Verhalten ändert sich.
- Bereich: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`, `elements/ShaeWorkerElement.ts`, `worker/MessageRouter.ts`, `view/cloneChangeTrail.ts`, `view/ComponentMemory.ts`, `utils/waitForMessageOfType.ts`, `utils/generateUUID.spec.ts`, `constants.ts`, `WorkerTimeoutError.ts`; dazu `docs/api-reference.md` und `CHANGELOG.md` des Kernpakets
- Hängt ab von: —
- Hash: b79d181
- Ergebnis: 1 Runde · alle sechs Findings behoben (TYPE-003 `ShadowObjectCreationScope.ts:511`
  und `:537` · TYPE-005 `ShaeWorkerElement.ts:227` samt der mitgezogenen Zeile in
  `attributeChangedCallback()` · TYPE-006 `MessageRouter.ts` mit neuem `DestroyPayloadData` ·
  TYPE-007 `cloneChangeTrail.ts:7` · TYPE-008 `constants.ts` + `WorkerTimeoutError.ts` +
  `waitForMessageOfType.ts` samt vierzehn Ersetzungen in der Spec · TYPE-009 im abweichenden Sinn:
  `generateUUID.ts` bleibt unangetastet, der Halt sitzt als Wächter in der Spec) · dazu die drei
  aufgenommenen Nebenbefunde `ComponentMemory.ts:17`, `waitForMessageOfType.ts:28` und `:46,66` ·
  kein Regressionstest im vitest-Sinn, das Paket ändert kein Laufzeitverhalten; die beiden Wächter
  sind vor der Änderung im **Typechecker** rot gesehen worden: `TS2322` in `generateUUID.spec.ts:27`
  gegen eine testweise gesetzte `: string`-Annotation, und `TS2345` in
  `waitForMessageOfType.spec.ts:37` samt sechs Geschwistern gegen die verengte Signatur · Review
  ohne jeden Befund, auch ohne kleinen · Verify mit umgangenem Turbo-Cache gefahren, 13 Tasks frisch,
  alle grün
- Nebenbefunde: keine neuen — die drei aus früheren Zügen aufgenommenen sind mit diesem Commit
  erledigt und in »Offene Befunde« abgehakt
- Folgen: keine
- Schnittstellen: `WorkerReplyType` — neuer exportierter Typ in `constants.ts`, die Union der vier
  Antwortkonstanten `Loaded | AppliedChangeTrail | ImportedModule | Destroyed`; über den
  Stern-Export in `index.ts` öffentlich, ein `switch` darüber ist vollständig ·
  `WorkerTimeoutError.messageType` und der Konstruktor tragen ihn statt `string` ·
  `ShaeWorkerElement`s `autoSync`-Setter nimmt `string | boolean | number` statt `any`; das
  Verhalten ist unverändert, aber eine Zuweisung anderer Gestalt compiliert nicht mehr ·
  `ComponentState.order` ist `number` und nicht mehr optional — jeder Schreibpfad setzt das Feld,
  ein Leser braucht den `undefined`-Zweig nicht · `waitForMessageOfType(type, …)` nimmt nur noch
  eine der vier Antwortkonstanten und ist über den Payload seines Guards generisch
  (`<T = unknown>`); intern, nicht re-exportiert · `useProperty()` in `ShadowObjectCreationScope`
  steht auf `<T = unknown>` wie sein Vertrag in `ShadowObjectCreationAPI`
- Modell: mittlere Stufe
- Effort: medium
- Dateien: `packages/shadow-objects/src/constants.ts`,
  `packages/shadow-objects/src/WorkerTimeoutError.ts`,
  `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`,
  `packages/shadow-objects/src/worker/MessageRouter.ts`,
  `packages/shadow-objects/src/view/cloneChangeTrail.ts`,
  `packages/shadow-objects/src/view/ComponentMemory.ts`,
  `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`,
  `packages/shadow-objects/src/utils/waitForMessageOfType.ts`,
  `packages/shadow-objects/src/utils/waitForMessageOfType.spec.ts`,
  `packages/shadow-objects/src/utils/generateUUID.spec.ts`,
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  0. **Was dieses Paket nicht ist.** Es behebt keinen Korrektheitsfehler, und keine Zeile ändert ihr
     Laufzeitverhalten. Einen Regressionstest im vitest-Sinn gibt es deshalb nicht. Zwei Wächter sind
     trotzdem neu, und beide gehen im Typechecker rot statt im Testlauf — Schritt 11 sagt, wie ihr roter
     Lauf nachgewiesen wird, und er gehört genauso in den Report wie sonst ein rotes Testlog.
     Die Schritte 1 bis 9 sind vollständig durchgemessen: Typecheck, Lint und der gezielte Testlauf waren
     mit allen Änderungen zusammen grün. Wo der Text einen Ausdruck wörtlich nennt, ist er so compiliert
     worden; Verbesserungen daran gehören nicht in dieses Paket.
  1. **`useProperty` steht auf `unknown` wie sein Vertrag** (TYPE-003), in
     `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`:
     - Zeile 511: `useProperty<T = any>(name: string, …)` wird `useProperty<T = unknown>(name: string, …)`.
       Der Vertrag in `types.ts:159` sagt `unknown` und bewegt sich nicht.
     - Zeile 537, in `useProperties()`: `result[key] = this.useProperty(props[key]);` wird
       `result[key] = this.useProperty<T[typeof key]>(props[key]);`. Ohne diesen zweiten Schritt
       compiliert der erste nicht — mit der Voreinstellung `unknown` liefert der Aufruf
       `SignalReader<Maybe<unknown>>`, und das ist kein `SignalReader<Maybe<T[K]>>`. Gemessen.
     Die übrigen `any` dieser Datei bleiben stehen und werden nicht aufgemacht: die Maps in Zeile 100–114,
     die Hilfsmethoden ab Zeile 434 und die Weiterreich-Signaturen ab Zeile 672 halten Signale
     heterogener Werttypen zusammen; `unknown` erzwänge dort an jeder Lesestelle einen Cast. Das Finding
     meint die eine Stelle, an der der Vertrag daneben bereits `unknown` sagt.
  2. **Der Cast auf der Transfer-Zeile fällt** (TYPE-007), in
     `packages/shadow-objects/src/view/cloneChangeTrail.ts:7`:
     `structuredClone(data, {transfer: transferables as any})` wird
     `structuredClone(data, {transfer: transferables})`. Sonst nichts an der Datei. `transferables` ist an
     dieser Stelle bereits auf `TransferablesType` verengt, also auf genau das, was
     `StructuredSerializeOptions.transfer` erwartet.
  3. **Der Destroy-Payload bekommt einen Namen** (TYPE-006), in
     `packages/shadow-objects/src/worker/MessageRouter.ts`:
     - Über `interface ConfigurePayloadData` (Zeile 19) ein zweites Interface:

       ```ts
       /**
        * The teardown request carries nothing but its own type: there is no field a sender could vary,
        * and the router reads none. Named all the same -- the three routes then read alike, and a
        * payload that says which message it is says more than one that says nothing at all.
        */
       interface DestroyPayloadData {
         type: typeof Destroy;
       }
       ```

     - Zeile 201: `#onDestroy(data: any)` wird `#onDestroy(data: DestroyPayloadData)`. Der Aufruf in
       `route()` (Zeile 128) bleibt unverändert, und die Zeile `this.logger.debug('on destroy', data)`
       ebenfalls.
     Bewusst mit `type` und nicht leer wie `ConfigurePayloadData`: ein leeres Interface nimmt jedes Objekt
     an und sagt nichts. `ConfigurePayloadData` lässt `type` weg, weil es andere Felder zu benennen hat;
     hier gibt es keine.
  4. **Die vier Antworten des Workers bekommen einen Typ** (TYPE-008):
     - `packages/shadow-objects/src/constants.ts`, direkt hinter `export const Destroyed = 'destroyed';`
       (Zeile 36), mit einer Leerzeile davor:

       ```ts
       /**
        * The four replies a `RemoteWorkerEnv` waits for, each behind a deadline of its own: the `Loaded`
        * greeting of the load handshake, the `ImportedModule` answer to an `importScript()`, the
        * `AppliedChangeTrail` confirmation of a change trail sent with `waitForConfirmation`, and the
        * `Destroyed` receipt of a teardown. A `switch` over the four is exhaustive.
        */
       export type WorkerReplyType = typeof Loaded | typeof AppliedChangeTrail | typeof ImportedModule | typeof Destroyed;
       ```

     - `packages/shadow-objects/src/WorkerTimeoutError.ts`: als erste Zeile der Datei
       `import type {WorkerReplyType} from './constants.js';` mit einer Leerzeile dahinter;
       `readonly messageType: string;` wird `readonly messageType: WorkerReplyType;`;
       `constructor(messageType: string, timeout: number)` wird
       `constructor(messageType: WorkerReplyType, timeout: number)`. Der Klassen-TSDoc zählt die vier
       Antworten bereits auf und bleibt Wort für Wort stehen.
     - `packages/shadow-objects/src/utils/waitForMessageOfType.ts`: `import type {WorkerReplyType} from '../constants.js';`
       über den vorhandenen Import von `WorkerTimeoutError`; Zeile 26 `type: string,` wird
       `type: WorkerReplyType,`.
     `verbatimModuleSyntax` ist an: beide Importe sind `import type` und nicht `import`.
  5. **Die beiden übrigen `any` derselben Datei fallen mit**, in
     `packages/shadow-objects/src/utils/waitForMessageOfType.ts`:
     - Zeile 24: `export const waitForMessageOfType = (` wird
       `export const waitForMessageOfType = <T = unknown>(`, und Zeile 28
       `guard?: (data: any) => boolean,` wird `guard?: (data: T) => boolean,`. Die beiden Aufrufer in
       `view/RemoteWorkerEnv.ts:364` und `:397` geben ihren Guard bereits mit `AppliedChangeTrailEvent`
       beziehungsweise `ImportedModuleEvent` an; `T` fällt aus ihnen heraus, und keiner der beiden ändert
       sich. Gemessen.
     - Zeile 46: `let timeoutId: number;` wird `let timeoutId: ReturnType<typeof setTimeout>;`, und
       Zeile 66 `}, timeout) as any;` wird `}, timeout);`. Der Cast überbrückte, dass `setTimeout` in
       diesem Projekt die Node-Signatur trifft und kein `number` liefert; der Rückgabetyp der Funktion
       selbst sagt dasselbe, ohne die Prüfung abzuschalten. `clearTimeout(timeoutId)` in `cleanup()`
       nimmt ihn unverändert.
  6. **Die Spec zieht mit** (TYPE-008), in
     `packages/shadow-objects/src/utils/waitForMessageOfType.spec.ts`:
     `import {Loaded} from '../constants.js';` über den vorhandenen Import von `WorkerTimeoutError`, und
     alle vierzehn Vorkommen von `'ready'` werden `Loaded` — die Aufrufe in Zeile 37, 46, 59, 82, 109,
     130, 151, die Antworten in Zeile 39, 51, 71, 139, 160, die Zusicherung in Zeile 91 und das nackte
     `worker.reply('ready')` in Zeile 65. Das letzte trägt den Fall »ignores a primitive payload« und
     bleibt ein nackter String — nur eben einer aus der Union. Fallnamen und Zusicherungstexte bleiben
     unverändert.
     Dass der Compiler diese vierzehn erzwingt, ist zugleich der Nachweis, dass die Verengung greift.
  7. **`order` verspricht kein `undefined` mehr** (Nebenbefund aus Paket 4), in
     `packages/shadow-objects/src/view/ComponentMemory.ts:17`: `order?: number;` wird `order: number;`.
     Kein Schreibpfad lässt das Feld aus: `createEntity()` schreibt `order ?? 0` (Zeile 112),
     `updateOrder()` ebenso (Zeile 91), und `setParent()` schreibt nur bei definiertem Wert und lässt den
     vorhandenen sonst stehen (Zeile 99–101). Zwei Fälle halten das schon heute fest —
     `ComponentMemory.spec.ts:55` und `:94`; beide bleiben, wie sie sind.
  8. **Der `autoSync`-Setter und der eine Aufrufer, den er mitzieht** (TYPE-005), in
     `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`:
     - Zeile 227: `set autoSync(val: any)` wird `set autoSync(val: string | boolean | number)`.
     - Damit bricht Zeile 311. Sie lautet heute
       `this.autoSync = this.hasAttribute(ATTR_AUTO_SYNC) ? this.getAttribute(ATTR_AUTO_SYNC) : true;`
       und liefert `string | true | null`, weil TypeScript aus `hasAttribute()` nichts über
       `getAttribute()` erfährt. Sie wird zu:

       ```ts
       this.autoSync = this.getAttribute(ATTR_AUTO_SYNC) ?? true;
       ```

       Derselbe Ausdruck — `getAttribute()` gibt `null` genau dann, wenn das Attribut fehlt —, nur ohne
       den zweiten Zugriff und ohne den Zweig, den der Compiler nicht sehen kann. Gemessen: ohne diese
       Zeile ist der Typecheck rot, mit ihr grün.
     - Der zweite Aufrufer, Zeile 280 in `connectedCallback()`, ist bereits auf `string` verengt und
       bleibt unberührt.
     Warum `string | boolean | number` und nichts Engeres: `docs/api-reference.md:1955` nennt
     `el.autoSync = 30` ausdrücklich als zulässigen Aufruf mit definiertem Ausgang, und
     `packages/shadow-objects-testing/test/worker-element-attributes.test.js:166–208` fährt genau diese
     drei Formen durch — `false`, `true`, `0`, `30`, `'  30FPS '`, `'off'`. Die Union ist die Menge, die
     das Projekt selbst schreibt.
  9. **Der Wächter für die uuid-Form** (TYPE-009) — hier wird von der Empfehlung des Audits abgewichen,
     und der Grund steht in der Datei selbst. Der Kommentar über `export const generateUUID`
     (`utils/generateUUID.ts:65–68`) hält fest, dass die fehlende Rückgabe-Annotation Absicht ist: ohne
     sie druckt `emitDeclarationOnly` die aufgelöste Template-Literal-Form in
     `dist/src/utils/generateUUID.d.ts`, mit ihr den Aliasnamen `UuidV4`, den ein Leser der Deklaration
     erst nachschlagen müsste. Die Annotation macht die veröffentlichte Deklaration schlechter, nicht
     besser. **Die Quelldatei wird deshalb nicht angefasst.**
     Was das Finding wirklich vermisst, ist der Halt — nichts hält die abgeleitete Form fest —, und den
     bekommt sie an anderer Stelle: ein Fall in `packages/shadow-objects/src/utils/generateUUID.spec.ts`,
     unmittelbar vor `it('asks crypto.randomUUID first', …)`:

     ```ts
     it('hands back the template-literal form, not a bare string', async () => {
       vi.stubGlobal('crypto', {randomUUID: () => '00000000-0000-4000-8000-000000000000'});

       const {generateUUID} = await importFresh();
       // The annotation is the guard: the shape rides on inference alone, and a later annotation or a
       // rewrite that widens the return to `string` has to get past this line first.
       const uuid: `${string}-${string}-${string}-${string}-${string}` = generateUUID();

       expect(uuid).toMatch(UUID_V4);
     });
     ```

     `vi`, `expect`, `importFresh` und `UUID_V4` stehen in der Datei bereits (Zeile 1–12), und das
     `afterEach` der Datei nimmt den Global-Stub wieder ab.
  10. **Doku** — `packages/shadow-objects/docs/api-reference.md`, vier Stellen:
      - Zeile 1106, Tabelle zu `ComponentState`, Zeile `order`: die Typ-Spalte `number \| undefined` wird
        `number`. Die Beschreibung bleibt (`0` für eine Komponente, die nie eine bekommen hat).
      - Zeile 1110, der Absatz unter dieser Tabelle: `order` steht dort in der Aufzählung der Felder, die
        leer als `undefined` lesen. Es gehört nicht mehr dazu. Der Satz nennt künftig `token`,
        `parentUuid` und `properties` als die Schlüssel, die immer dastehen und leer `undefined` lesen,
        und sagt für `order` dazu, dass es immer eine Zahl trägt. `autoDestructionOnParentRemoval` bleibt
        der eine, der ganz fehlt, solange er nicht `true` ist.
      - Zeile 1690, Tabelle zu `WorkerTimeoutError`, Zeile `messageType`: die Typ-Spalte `string` wird
        `WorkerReplyType`. Die Beschreibung zählt die vier Schreibweisen bereits auf und bleibt. Hinter
        der Tabelle, vor dem Codeblock, ein Satz: `WorkerReplyType` wird aus `@spearwolf/shadow-objects`
        mit exportiert, sodass ein `switch` über die vier Fälle vollständig sein kann.
      - Zeile 1955, Tabelle zu `ShaeWorkerElement`, Zeile `autoSync`: der Zelle einen Halbsatz
        voranstellen, der den angenommenen Typ nennt — `string | boolean | number`. Der vorhandene Text
        über die Flag-Lesung und über `el.autoSync = 30` bleibt Wort für Wort stehen; er beschreibt ein
        Verhalten, das sich nicht ändert.
      Kein Rückblick auf den Vorzustand: jeder dieser Sätze muss für jemanden tragen, der die alte
      Fassung nie gesehen hat.
  11. **CHANGELOG** — `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]`:
      - Vier Einträge ans **Ende** der Liste unter `### Types` (Zeile 427–439), im Stil der Nachbarn,
        jeder in sich verständlich, und **hier ist der Rückblick auf den Vorzustand erwünscht**
        (»used to …«) — die Konvention »kein Rückblick« gilt Code, Kommentaren und Doku, nicht dem
        CHANGELOG, dessen Aufgabe genau die Differenz ist:
        1. `**Types (public API):**` `WorkerTimeoutError.messageType` trägt `WorkerReplyType`, die Union
           der vier Antwortkonstanten, die aus dem Paket mit exportiert wird. Wer das Feld liest,
           compiliert weiter und bekommt einen `switch`, dessen Vollständigkeit der Compiler prüfen kann;
           wer einen `WorkerTimeoutError` mit einem anderen String selbst baut, nicht.
        2. `**Types (public API):**` Der `autoSync`-Setter von `ShaeWorkerElement` nimmt
           `string | boolean | number`. Das Verhalten ist unverändert — ein String ist der Wert, alles
           andere wird als Flagge gelesen —, aber eine Zuweisung anderer Gestalt compiliert nicht mehr.
        3. `**Types (public API):**` `ComponentState.order` ist `number`. Jeder Schreibpfad setzt das
           Feld; das `undefined`, das der Typ versprach, kam nie an, und ein Leser verliert einen toten
           Zweig.
        4. `**Types:**` die vier internen Stellen in einem Eintrag: `useProperty()` in
           `ShadowObjectCreationScope` steht auf `<T = unknown>` wie sein Vertrag in
           `ShadowObjectCreationAPI`; die Transfer-Zeile in `cloneChangeTrail()` reicht
           `TransferablesType` ohne Cast weiter; `MessageRouter` benennt den Destroy-Payload wie seine
           beiden Nachbarn; und `waitForMessageOfType()` nimmt nur noch eine der vier Antwortkonstanten,
           ist über den Payload seines Guards generisch und hält sein Timer-Handle als Rückgabetyp von
           `setTimeout`. Keine dieser Signaturen ist aus `index.ts` re-exportiert oder über die
           `exports`-Map erreichbar.
      - Der einleitende Blockquote unter `## [Unreleased]`: **genau eine** dieser Änderungen ändert die
        Bedeutung von Code, den ein Consumer heute schon geschrieben hat — die aus Punkt 2. Also ein
        Satz ans Ende des Blockquotes, im Muster des Satzes, den der Logger-Eintrag dort hinterlassen hat
        (»And `ConsoleLogger.debug()` …«), und die Zahl in der ersten Zeile von »Sixty-one« auf
        »Sixty-two«.
        Die beiden anderen öffentlichen Verengungen kommen **nicht** in den Blockquote, und die Zahl
        bewegt sich für sie nicht: sie verengen einen Lesetyp, und wer liest, compiliert weiter. Das ist
        dieselbe Grenze, an der Paket 4 die Zahl stehenließ und Paket 5 sie um eins bewegt hat.
  12. **Was rot gesehen wird.** Beide Nachweise laufen über den Typechecker, nicht über vitest, und beide
      gehören in den Report:
      - Für den Wächter aus Schritt 9: `export const generateUUID = (): string => {` vorübergehend
        annotieren, `pnpm -F @spearwolf/shadow-objects exec tsc -p tsconfig.json --noEmit` fahren, die
        Fehlerzeile aus `generateUUID.spec.ts` mitschreiben, die Annotation wieder herausnehmen.
      - Für die Verengung aus Schritt 4 und 6: ein `'ready'` in der Spec stehen lassen, `tsc` fahren, die
        Fehlerzeile mitschreiben, dann ersetzen. Der Compiler erzwingt die vierzehn Ersetzungen von
        selbst; genau das ist der Beleg.
  13. **Was unberührt bleibt, geprüft und nicht vergessen:**
      - `packages/shadow-objects/README.md` nennt keinen der geänderten Namen; `useProperty` steht dort
        nur in einem JavaScript-Beispiel ohne Typangabe.
      - `AGENTS.md` handelt an keiner Stelle von diesen Signaturen; der Abschnitt »Dispatching a
        notification« betrifft die Wahl zwischen den Emit-Varianten, die dieses Paket nicht anfasst.
      - `packages/shae-offscreen-canvas` und `packages/shadow-objects-testing` sind JavaScript; keine der
        Verengungen erreicht sie als Typ. Die sechs Zuweisungen an `el.autoSync` in
        `worker-element-attributes.test.js:166–208` liegen sämtlich in der neuen Union.
      - Das Wurzel-`CHANGELOG.md` und `packages/shae-offscreen-canvas/CHANGELOG.md` bleiben draußen:
        weder Werkzeug noch Canvas-Paket bewegen sich.
      - Kein `TODO` entsteht oder fällt weg, also kein `pnpm make:todo`.
      - Es kommt keine Datei unter `dist/` hinzu und keine weg — der neue Typ liegt in `constants.ts`,
        das es schon gibt —, und die Gestalt von `dist/package.json` ändert sich nicht.
        `src/distContract.files.txt` und `src/distContract.package.json` bleiben, wie sie sind;
        `src/distContract.spec.ts` bestätigt das im vollen Verify-Lauf.
  14. **Für den Reviewer.** Der Diff ist mechanisch, und die Stellen, an denen er still falsch werden
      kann, sind nicht die Typen, sondern drei andere:
      - Schritt 8, die umgeschriebene Zeile in `attributeChangedCallback()`. `getAttribute(x) ?? true`
        ist genau dann äquivalent zu `hasAttribute(x) ? getAttribute(x) : true`, wenn `getAttribute()`
        `null` allein für ein fehlendes Attribut liefert — das tut es. Ein leeres Attribut
        (`auto-sync=""`) gibt weiterhin den leeren String und geht als leerer String durch
        `normaliseAutoSync()`, nicht als Flagge.
      - Schritt 11, die Zahl im Blockquote. Sie bewegt sich um genau eins, weil genau ein Satz dazukommt.
      - Schritt 6, das vierzehnte Vorkommen: `worker.reply('ready')` in Zeile 65 ist der einzige Aufruf,
        der bewusst einen nackten String statt eines Objekts schickt, und er muss einer bleiben.
      **Nicht aufmachen** soll er zweierlei, weil es hier entschieden ist: die übrigen `any` in
      `ShadowObjectCreationScope.ts` (Grund in Schritt 1) und die Frage, ob `waitForMessageOfType()`
      seinen Payload-Typ aus dem Nachrichtentyp ableiten sollte — das wäre eine Abbildung von vier
      Konstanten auf vier Event-Typen und damit ein eigenes Paket, kein Befund an diesem.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
  · Zwischenrunden: `pnpm -F @spearwolf/shadow-objects exec tsc -p tsconfig.json --noEmit && pnpm -F @spearwolf/shadow-objects exec vitest src/utils src/view src/worker src/elements src/in-the-dark --run` (gemessen: Typecheck grün, 29 Dateien mit 934 Fällen in 1,5 s; die Verzeichnisauswahl lässt `src/distContract.spec.ts` und damit den Build-Zwang aus)
- Commit: `refactor(types): the places that let the check lapse name the type they already know, and a worker reply is one of four`
**TYPE-003 · info · packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:391 gegen packages/shadow-objects/src/types.ts:153** — useProperty steht auf <T = any>, sein Vertrag auf <T = unknown>

Die Implementierung deklariert den Typparameter mit any als Voreinstellung, der Typ ShadowObjectCreationAPI mit unknown. Für Konsumenten unsichtbar, weil sie gegen den Vertrag typisieren und die Klasse ihr Modul nicht verlässt. Innerhalb des Moduls fällt damit die Prüfung weg, die unknown erzwingen würde.

Empfehlung: Auf unknown angleichen und dabei useProperties und jeden internen Aufrufer mitziehen, den der Typcheck danach anspricht. Der Wechsel ist kein Beifang einer anderen Arbeit.

**TYPE-005 · low · packages/shadow-objects/src/elements/ShaeWorkerElement.ts:209** — Ein any in einem öffentlichen Setter, dessen Getter typisiert ist

set autoSync(val: any) nimmt alles an, während der zugehörige Getter typisiert ist. Der Aufrufer bekommt damit an der Schreibstelle keine Hilfe und an der Lesestelle einen genauen Typ — die beiden Hälften derselben Eigenschaft sagen Verschiedenes. Was tatsächlich erlaubt ist, sagt die Doku bereits: string | boolean | number.

Empfehlung: Den Setter auf string | boolean | number bringen. Das deckt sich mit der Zusage der Doku und mit dem, was der Setter ohnehin verarbeitet.

**TYPE-006 · info · packages/shadow-objects/src/worker/MessageRouter.ts:189** — Ein untypisierter Payload zwischen zwei typisierten Nachbarn

#onDestroy(data: any) nimmt einen untypisierten Payload, während die beiden Nachbarmethoden #configure(data: ConfigurePayloadData) und #onChangeTrail(data: SyncEvent) ihre Form benennen. Die Nachricht hat eine feste Gestalt, und wer sie ändert, bekommt an dieser Stelle keinen Widerspruch vom Compiler.

Empfehlung: Den Payload-Typ benennen wie bei den Nachbarn. Trägt die Nachricht keine Nutzdaten, ist das ebenfalls ein Typ und sagt mehr als any.

**TYPE-007 · info · packages/shadow-objects/src/view/cloneChangeTrail.ts:7** — Ein Cast nach any schaltet die Prüfung auf der Transfer-Zeile ab

structuredClone(data, {transfer: transferables as any}) castet einen Wert nach any, der an dieser Stelle bereits auf TransferablesType verengt ist — also auf genau den Typ, den StructuredSerializeOptions.transfer erwartet. Der Cast trägt nichts und schaltet die Prüfung auf einer Zeile ab, die Objekte an einen ablösenden Aufruf reicht: eine künftige Änderung an IComponentChange.transferables liefe hier ohne Warnung durch. Gemessen am 2026-08-26 an einer Kopie außerhalb des Arbeitsbaums: ohne das as any compiliert die Datei unverändert, mit und ohne --exactOptionalPropertyTypes, und die Fehlerzahl bewegt sich in keiner Richtung.

Empfehlung: Den Cast entfernen. Er kostet nichts und nimmt der Zeile ihre einzige Prüfung.

**TYPE-008 · info · packages/shadow-objects/src/utils/waitForMessageOfType.ts** — WorkerTimeoutError.messageType steht auf string statt auf der Union der vier Konstanten

Das Feld nennt die Nachricht, die ausgeblieben ist, und kann nur einen von vier Werten tragen. Deklariert ist string, weil der Wert aus dem type: string-Parameter von waitForMessageOfType() stammt. Wer den Fehler im catch auswertet, bekommt vom Typ keine Hilfe dabei, welche Fälle es zu behandeln gibt.

Empfehlung: Die Union führen und die Signatur von waitForMessageOfType() mit umstellen. Beides gehört in einen Zug, sonst wandert der breite Typ nur eine Stelle weiter.

**TYPE-009 · info · packages/shadow-objects/src/utils/generateUUID.ts** — Die Template-Literal-Form der uuid hängt allein an der Inferenz

Der Rückgabetyp trägt die Template-Literal-Form, weil TypeScript sie aus der Implementierung ableitet. Weder eine Typ-Assertion noch ein Contract-Check hält dist/src/utils/generateUUID.d.ts darauf fest. Eine spätere Annotation oder ein Umbau der Implementierung nimmt die Zusage zurück, ohne dass ein Lauf rot wird.

Empfehlung: Den Rückgabetyp ausschreiben, statt ihn ableiten zu lassen. Dann steht die Zusage da, wo sie gelesen wird, und ein Umbau muss sie ausdrücklich aufgeben.

### [x] 7. Die geordneten Listen der View-Seite: erst messen, dann umbauen
- Findings: PERF-001 (medium), PERF-002 (low)
- Ziel: Die quadratischen Einfügekosten der geordneten Listen und die dreifache lineare Suche pro Eigenschaft und Frame sind gemessen; trägt die Zahl den Umbau, bekommen beide Listen ihre Begleitstruktur, und die neue Zahl steht neben der alten im Quelltext.
- Bereich: `packages/shadow-objects/src/view/ComponentContext.ts`, `view/ComponentChanges.ts`, `utils/array-utils.ts`
- Hängt ab von: —
- Hash: 6be9933
- Modell: stärkste Stufe
- Effort: high
- Dateien: `packages/shadow-objects/src/view/ComponentContext.ts`,
  `packages/shadow-objects/src/view/ComponentContext.spec.ts`,
  `packages/shadow-objects/src/view/ComponentChanges.ts`,
  `packages/shadow-objects/CHANGELOG.md`
  (`utils/array-utils.ts` bleibt unangetastet: `ComponentChanges` benutzt `appendToEnd` und
  `removeFrom` weiter, und in `ComponentContext` verschwindet der Import, statt dass die Datei sich
  ändert. Keine neue Datei unter `src/` — siehe Schritt 5 —, also kein Anfassen von
  `src/distContract.files.txt` und `src/distContract.package.json`.)

- **Abgleich (2026-08-31).** Beide Findings bestehen unverändert, die Fundstellen sind gewandert:
  - PERF-001, im Audit `ComponentContext.ts:950-966, :329-380, :480-498`. Heute: `#appendToOrdered()`
    steht auf **1021-1037**, `removeFromParent()` auf **329-345**, `addToChildren()` auf **366-379**,
    `changeOrder()` auf **509-527**. Das `includes()` steht auf 1022, der lineare Scan mit einem
    `#components.get()` je Schritt auf 1026-1033, die fünf `removeFrom()` auf 375, 518, 521, 996, 1001.
    Der Kommentar mit den 42 ms steht auf 650-651.
  - PERF-002, im Audit `ComponentChanges.ts:183-221`. Heute: `#propsChangeOrder` deklariert auf **185**,
    `changeProperty()` auf **196-243** mit `includes` (208), `removeFrom` (236), `appendToEnd` (239),
    `removeProperty()` auf **256-273** mit denselben dreien (257, 263, 270). Wie der Grobplan
    vorhergesagt hat, hat Paket 4 mit `setPropertyWithoutValue()` (253) einen zweiten Eingang
    gelegt — die Zahl der linearen Suchen je Eigenschaft ist dieselbe, die Zahl der Aufrufer eine mehr.

- **Sondierung aus Zug 0.** Die Messstrecke ist gebaut und gefahren, damit die Schwellen unten an
  echten Zahlen hängen. Node 25.9.0, isolierter `ComponentContext` ohne DOM, n Wurzeln nacheinander
  angelegt, alle auf `order: 0` (der Normalfall: Kinder in Dokumentreihenfolge, Vorgabeordnung),
  Median aus fünf warmen Läufen, in Millisekunden:

  | n | wie es jetzt steht | + Anhäng-Schnellpfad | + O(1)-Mitgliedschaft (Obergrenze) |
  | ---: | ---: | ---: | ---: |
  | 150 | 0,63 | 0,55 | 0,32 |
  | 300 | 1,39 | 0,90 | 0,45 |
  | 600 | 4,62 | 2,50 | 0,93 |
  | 1200 | 17,07 | 8,06 | 1,82 |

  Die erste Spalte vervierfacht sich je Verdopplung, die dritte verdoppelt sich. Beide Hebel
  zusammen nehmen den quadratischen Term heraus, einer allein nicht. Die dritte Spalte ist eine
  **Obergrenze**: sie entstand, indem das `includes()` ersatzlos entfiel, nicht durch ein echtes Set
  — ein Set kostet `has`, `add` und `delete`. Die Zahl des echten Umbaus liegt zwischen Spalte zwei
  und drei und wird in Schritt 4 nachgemessen.

- **Entscheidungsschwellen.** Sie sind vor der Messung festgeschrieben und werden nicht nachgezogen.
  Die Latte skaliert mit dem, was der jeweilige Hebel kostet:
  1. **Anhäng-Schnellpfad** — sechs Zeilen, kein neuer Zustand, keine neue Zusicherung. Er wird
     umgesetzt, wenn er bei 600 mindestens **1 ms** spart.
  2. **Mitgliedschafts-Set in `ComponentContext`** — eine Parallelstruktur an zwölf Schreibstellen in
     einer Datei, deren bekannte Defekte allesamt Desynchronisationen sind (drei davon stehen als
     Kommentar in ihr drin). Es wird umgesetzt, wenn die Obergrenze aus Schritt 4 bei 600 noch einmal
     mindestens **1 ms** über dem Schnellpfad spart **und** das Paar die Kurve über 150/300/600/1200
     von quadratisch auf linear bringt (jede Verdopplung verdoppelt die Zeit, statt sie zu
     vervierfachen). Der zweite Halbsatz ist der eigentliche Test: einen konstanten Faktor rechtfertigt
     diese Struktur nicht, das Wegfallen des quadratischen Terms schon — er ist es, der die Größe eines
     Namensraums zur Klippe macht. Fällt die Zahl des echten `OrderedUuids` in Schritt 8 wieder unter
     1 ms Ersparnis bei 600, fliegt das Set raus und der Schnellpfad bleibt allein stehen.
  3. **Set neben `#propsChangeOrder`** — es wird umgesetzt, wenn es bei den Eigenschaftszahlen, die
     dieses Repository erzeugt, mindestens **0,5 ms je Sekunde Animation** spart. Der obere Anschlag
     dafür: 64 Schlüssel, alle in jedem Frame geändert, 60 fps, also 3840 Aufrufe je Sekunde.
     Erreicht es das nicht, bleibt das Array, und die gemessene Wechselstelle wird aufgeschrieben.

- **Vorgehen:**
  1. **Die Messstrecke aufbauen**, im Arbeitsverzeichnis, nicht im Projekt. Sie liegt außerhalb der
     Versionierung und wird nicht committet — genauso, wie die 42-ms-Reihe von 2026-08-22 entstanden
     ist, deren Harness ebenfalls nicht im Repository steht. Ein `.bench.ts` unter `src/` wäre der
     falsche Weg: der Lib-Transpile globt `src/**/*.{ts,js}`, die Datei landete in `dist/` und risse
     den Auslieferungsvertrag für etwas auf, das nichts ausliefert.

     ```bash
     PKG=packages/shadow-objects
     WORK=<Arbeitsverzeichnis>/p7-measure
     pnpm -F @spearwolf/shadow-objects build
     mkdir -p "$WORK"
     # ohne diesen Symlink findet node `@spearwolf/eventize` aus einer Kopie außerhalb des Pakets nicht
     ln -sfn "$PWD/$PKG/node_modules" "$WORK/node_modules"
     cp -r "$PKG/dist/src" "$WORK/baseline"
     ```

     Das Messskript `$WORK/series.mjs` nimmt das Verzeichnis als `process.argv[2]`, importiert daraus
     `view/ComponentContext.js` und `view/ViewComponent.js`, legt je Lauf einen frischen
     `new ComponentContext(Symbol('m'))` an, erzeugt n mal `new ViewComponent('t', {context: ctx, order: 0})`
     und misst mit `performance.now()` um die Schleife. Zwei warme Läufe verwerfen, dann fünf messen und
     den Median nehmen. Größen: 150, 300, 600, 1200 — dieselben Größenordnungen, in denen die
     vorhandene Reihe in `docs/guides.md` steht, plus einen Schritt darüber, damit die Kurve sichtbar wird.

  2. **Grundlinie messen** gegen `$WORK/baseline`. Weicht sie deutlich von der Tabelle oben ab
     (andere Maschine, andere Node-Version), gilt die eigene Messung; die Schwellen sind absolute
     Millisekunden und bleiben, wie sie sind.

  3. **Den Schnellpfad in einer Kopie messen.** `cp -r "$WORK/baseline" "$WORK/fastpath"` und in
     `$WORK/fastpath/view/ComponentContext.js` in `#appendToOrdered` direkt vor die `for`-Schleife
     einsetzen (das transpilierte JS ist bis auf `void 0` deckungsgleich mit dem TypeScript):

     ```js
     const last = childUuids.length > 0 ? this.#components.get(childUuids[childUuids.length - 1])?.component : void 0;
     if (last !== void 0 && order >= last.order) {
       childUuids.push(component.uuid);
       return;
     }
     ```

     Schwelle 1 anlegen.

  4. **Die Obergrenze der Mitgliedschaft messen.** `cp -r "$WORK/fastpath" "$WORK/membership"`, dort
     die drei Zeilen `if (childUuids.includes(component.uuid)) { return; }` ersatzlos streichen — im
     Messlauf wird keine uuid zweimal eingefügt, also ändert das kein Ergebnis und beziffert genau
     das, was ein O(1)-Test höchstens einbringen kann. Schwelle 2, erster Halbsatz, anlegen; den
     zweiten Halbsatz an der Kurve über alle vier Größen prüfen.

  5. **Erst jetzt TypeScript schreiben.** Der Arbeitsbaum war bis hierher sauber.

     Trägt Schwelle 2, kommt die Begleitstruktur — **als Klasse im Kopf von
     `view/ComponentContext.ts`, nicht als eigenes Modul.** Der Grund: sie hat genau einen Benutzer und
     keine öffentliche Fläche, und eine neue Datei unter `src/` zöge `src/distContract.files.txt`,
     `src/distContract.package.json` und einen Auslieferungs-Eintrag im CHANGELOG nach sich — der
     falsche Preis für einen Helfer, den außerhalb dieser Datei niemand anfassen darf. Sie steht hinter
     `ComponentContextDisposedError` und vor `interface ViewInstance`, ohne `export`:

     ```ts
     /**
      * A list of uuids that keeps its order and answers membership in one step.
      *
      * The order is what forbids a bare Set: the entity tree is walked in it, and a Set answers
      * membership but not position. So both are kept, and both are written only from here -- a
      * parallel set that any caller may write drifts from its list, and a uuid that one half knows
      * and the other does not is the defect this class exists to make impossible.
      */
     class OrderedUuids {
       readonly #uuids: string[] = [];
       readonly #members = new Set<string>();

       /** The uuids in their order. Read-only: every write goes through this class. */
       get uuids(): readonly string[] {
         return this.#uuids;
       }

       get size(): number {
         return this.#uuids.length;
       }

       has(uuid: string): boolean {
         return this.#members.has(uuid);
       }

       push(uuid: string): void {
         this.#uuids.push(uuid);
         this.#members.add(uuid);
       }

       insertAt(index: number, uuid: string): void {
         this.#uuids.splice(index, 0, uuid);
         this.#members.add(uuid);
       }

       /** @returns whether the uuid was in the list */
       delete(uuid: string): boolean {
         if (!this.#members.delete(uuid)) return false;
         const idx = this.#uuids.indexOf(uuid);
         // Both halves are written together and only here, so the index is always found. The guard is
         // what keeps a `splice(-1, 1)` from cutting the last uuid out, should that ever stop holding.
         if (idx !== -1) {
           this.#uuids.splice(idx, 1);
         }
         return true;
       }

       clear(): void {
         this.#uuids.length = 0;
         this.#members.clear();
       }
     }
     ```

  6. **Die Umstellung in `view/ComponentContext.ts`**, Stelle für Stelle. Die Zeilennummern sind die
     von heute und wandern, während gearbeitet wird — maßgeblich ist der genannte Ausdruck:
     - 3: `import {removeFrom} from '../utils/array-utils.js';` fällt weg (danach unbenutzt).
     - 14: `children: string[];` wird `children: OrderedUuids;`, der Kommentar dahinter wird ersetzt
       durch einen, der sagt, warum die Reihenfolge zählt.
     - 103: `#rootComponents: string[] = [];` wird `#rootComponents = new OrderedUuids();`, ebenso.
     - 223, 290, 398: `entry.children.slice(0)` wird `[...entry.children.uuids]`.
     - 229: `viewInstance.children = [];` wird `viewInstance.children.clear();`.
     - 233: `children: [],` wird `children: new OrderedUuids(),`.
     - 274: `this.#rootComponents.includes(component.uuid)` wird `.has(component.uuid)`.
     - 316-325 in `getChildren()`: `for (const uuid of children)` wird `for (const uuid of children.uuids)`.
     - 338-341 in `removeFromParent()`: das Paar `indexOf` / `splice` wird
       `if (parentEntry.children.delete(component.uuid)) { childEntry.changes.setParent(undefined); }`.
     - 362: `parentEntry.children.includes(child.uuid)` wird `.has(child.uuid)`.
     - 375, 518, 521, 996, 1001: `removeFrom(x, uuid)` wird `x.delete(uuid)`.
     - 576, 940: `this.#rootComponents.slice(0)` wird `[...this.#rootComponents.uuids]`.
     - 944: `this.#rootComponents.length !== 0` wird `.size !== 0`.
     - 1065: `for (const childUuid of viewInstance.children)` wird `… of viewInstance.children.uuids`.
     - 1070: `for (const uuid of this.#rootComponents)` wird `… of this.#rootComponents.uuids`.
     - 1021-1037 `#appendToOrdered()`: Signatur auf `childUuids: OrderedUuids`, `includes` → `has`,
       `length` → `size`, `childUuids[i]!` → `childUuids.uuids[i]!`, `splice(i, 0, …)` → `insertAt(i, …)`,
       der Schnellpfad aus Schritt 3 davor, mit diesem Kommentar:

       ```ts
       // The list is sorted by ascending order, so a component that sorts at or after its last member
       // sorts after every one of them: the scan below would walk to the end and push. Asking the last
       // member first turns the common case -- children arriving in document order, all on the default
       // order -- from a walk over the whole list into a single lookup. A last uuid whose entry is
       // already gone answers nothing, and then the scan runs as it did.
       ```

     Trägt Schwelle 2 **nicht**, entfallen Schritt 5 und dieser Schritt bis auf den Schnellpfad samt
     seinem Kommentar; `OrderedUuids` entsteht dann gar nicht.

  7. **Die Zahl in den Quelltext**, an die Doku von `#appendToOrdered()`, im Ton des Kommentars an
     `collectPeerReRequest()` (Zeile 637-663) und mit derselben Ehrlichkeit: was gemessen wurde, womit,
     wann, und wo die Aussage aufhört. Vorlage, mit den eigenen Zahlen zu füllen:

     ```
     Building n siblings under one parent used to cost n(n+1)/2 steps: a membership scan and a walk
     for the insertion point, each of them over the whole list. Both are answered in one step now, and
     the build is linear -- <a> ms instead of <b> ms for 600 siblings, <c> ms instead of <d> ms for 1200.
     Numbers measured <Datum> on node <version>, on the context alone with no DOM around it -- a
     snapshot, not a guarantee. The parent-resolution series in `packages/shadow-objects/docs/guides.md`
     was measured in a browser and covers a different question.
     ```

     `docs/guides.md` wird **nicht** angefasst. Der Abschnitt »How Many Entities Fit in One Namespace«
     misst die Elternauflösung, also die Differenz zwischen den beiden rechten Spalten seiner Tabelle,
     und die ändert sich hier nicht. Die absoluten Build-Spalten werden kleiner, aber sie sind mit Datum
     und Browser als Momentaufnahme ausgewiesen, und ohne den Chromium-Harness von damals lassen sie
     sich nicht ehrlich neu setzen. Eine erfundene Zahl wäre schlimmer als eine konservative.

  8. **Nachmessen.** `pnpm -F @spearwolf/shadow-objects build`, `dist/src` erneut ins
     Arbeitsverzeichnis kopieren, `series.mjs` dagegen laufen lassen. Das ist die Zahl, die in den
     Kommentar gehört — nicht die Obergrenze aus Schritt 4. Fällt sie unter Schwelle 2, wird das Set
     wieder ausgebaut und der Schnellpfad bleibt allein; das gehört als Abweichung in den Report.

  9. **Wächter in `view/ComponentContext.spec.ts`.** Das Paket behebt keinen Korrektheitsfehler, es
     baut eine Struktur um — es gibt also keinen Regressionstest, sondern Wächter, und die werden wie
     in Paket 2 und 6 gegen eine Mutationsprobe rot gesehen. Der rote Lauf jeder Probe gehört in den
     Report, mit Kommando und Ausgabe.

     Der vorhandene Block `describe('ordered insertion (children)', …)` (Zeile 211-300) deckt Anhängen,
     Voranstellen, Lücken, Gleichstand und negative Werte bereits ab; er bleibt und muss grün bleiben.
     Neu ist der eine Fall, den der Schnellpfad überhaupt erst riskant macht — eine Lücke am Ende der
     Liste, also eine uuid, hinter der kein Eintrag mehr steht. Er kommt hinter
     `'treats a null order as 0'`:

     ```ts
     it('inserts by order when the last uuid of the list has no component behind it any more', () => {
       ctx = makeContext();
       const parent = new ViewComponent('p', {context: ctx});
       new ViewComponent('a', {context: ctx, parent, order: 10});

       // A uuid with no entry behind it, at the end of the list: `addToChildren()` writes the uuid into
       // the children list without the child's own parent link following along, so the child's removal
       // takes it out of the list it does point at and leaves this one naming it.
       const stray = new ViewComponent('stray', {context: ctx, order: 99});
       ctx.addToChildren(parent, stray);
       stray.destroy();

       new ViewComponent('front', {context: ctx, parent, order: 1});

       expect(childTokens(parent), 'a uuid that answers nothing decides no place').toEqual(['front', 'a']);
     });
     ```

     Zwei Mutationsproben, beide am Schnellpfad:
     - Die Lücke als »anhängen« behandeln — `if (childUuids.size > 0 && (last === undefined || order >= last.order))`.
       Der neue Fall wird rot (`['a', 'front']` statt `['front', 'a']`). Diese Probe belegt zugleich, dass
       die Lücke wirklich entsteht; ohne sie wäre der Fall grün, ohne etwas zu beweisen.
     - Die Richtung umdrehen — `order <= last.order`. Der vorhandene Fall
       `'prepends a child with the lowest order'` wird rot.

     In `#rootComponents` kann diese Lücke nicht entstehen: `#deleteComponent()` nimmt jede uuid dort
     heraus (Zeile 1001), unabhängig vom Elternlink. Der Fall gehört deshalb nur zu den Kindern.

  10. **`#propsChangeOrder` in `view/ComponentChanges.ts`.** Gemessen wird die Wechselstelle zwischen
      `Array.prototype.includes` und `Set.prototype.has` über Schlüsselzahlen 4, 8, 16, 32, 64 auf
      Schlüsseln der Gestalt, die `<shae-prop>` erzeugt, und daraus die Ersparnis je Sekunde bei 60 fps
      gerechnet. Schwelle 3 anlegen.

      Der Zug-0-Blick sagt: das Set gewinnt je Aufruf ab etwa acht Schlüsseln, aber der Abstand liegt
      bei 5 ns (16 Schlüssel) bis 44 ns (64), und die Zahl der Aufrufe ist nicht durch die Listenlänge
      begrenzt, sondern durch die Eigenschaften je Frame — der obere Anschlag von 3840 Aufrufen je
      Sekunde landet damit bei 0,17 ms je Sekunde. Dazu kommt, was ein Set hier gar nicht anfassen kann:
      `removeFrom()` und `appendToEnd()` sind `indexOf` **plus** `splice`, und der `splice` bleibt
      linear. Erwartetes Ergebnis also: Schwelle 3 wird verfehlt, das Array bleibt, und der Kommentar
      auf Zeile 185 bekommt die gemessene Wechselstelle samt der Rechnung, die sagt, warum sie hier
      nicht zählt. Gemessen wird trotzdem — die Schwelle entscheidet, nicht diese Erwartung.

  11. **CHANGELOG.** `packages/shadow-objects/CHANGELOG.md`, Abschnitt `### Internal` unter
      `## [Unreleased]` (Zeile 459). Ein Bullet je gelandetem Hebel, mit der Zahl. Keine Änderung an
      `docs/` oder `README.md`: `#appendToOrdered()`, `#rootComponents`, `OrderedUuids` und
      `#propsChangeOrder` sind allesamt privat, die öffentliche Fläche bewegt sich nicht.
      Landet nichts, gibt es keinen CHANGELOG-Eintrag — ein Kommentar mit einer Messung ändert am
      Paket nichts, was ein Konsument merkt.

- Verify: Zwischenrunden `pnpm -F @spearwolf/shadow-objects exec vitest --run src/view` und
  `pnpm -F @spearwolf/shadow-objects typecheck`; vor dem Commit die volle Kette
  `pnpm lint && pnpm typecheck && pnpm build && pnpm test`.
- Commit: je nach Ausgang genau einer von dreien —
  beide Hebel: `perf(view): the ordered lists answer membership in one step, and a component that sorts last is appended without a search` ·
  nur der Schnellpfad: `perf(view): a component that sorts last is appended without searching for its place` ·
  keiner: `docs(view): the ordered lists carry the size at which their search starts to cost`
- Ergebnis: 1 Runde · PERF-001 behoben, PERF-002 gemessen und bewusst nicht umgebaut ·
  gemessen auf node v25.9.0 am 2026-08-31, Median aus fünf warmen Läufen, n Wurzeln nacheinander
  auf der Vorgabeordnung: 150/300/600/1200 kosten 0,60/1,41/4,44/16,04 ms unverändert, 0,43/0,81/2,29/7,36 ms
  mit dem Anhäng-Schnellpfad allein und 0,45/0,51/1,01/2,03 ms mit beiden Hebeln — jede Verdopplung
  verdoppelt die Zeit statt sie zu vervierfachen, der quadratische Term ist heraus · Schwelle 1
  (≥ 1 ms bei 600) mit 2,15 ms getragen, Schwelle 2 (noch einmal ≥ 1 ms **und** lineare Kurve) mit
  1,28 ms getragen · Schwelle 3 für `#propsChangeOrder` mit 0,128 von 0,5 ms je Sekunde Animation
  verfehlt: das Array bleibt, und die gemessene Wechselstelle — das Set gewinnt je Aufruf ab etwa
  acht Schlüsseln, 8,0 gegen 10,7 ns — steht samt der Rechnung, die sagt warum sie hier nicht zählt,
  als Kommentar an `ComponentChanges.ts:185` · kein Regressionstest, das Paket behebt keinen
  Korrektheitsfehler; der neue Wächter `inserts by order when the last uuid of the list has no
  component behind it any more` wurde gegen zwei Mutationen am Schnellpfad rot gesehen (die Lücke als
  »anhängen« behandeln: 1 Fall rot, `['a','front']` statt `['front','a']` · die Richtung umdrehen:
  9 Fälle rot), der Reviewer hat beide selbst nachgefahren und eine dritte Probe dazugestellt
  (`push()` ohne `#members.add`: 227 Fälle rot) · die Messstrecke liegt im Arbeitsverzeichnis unter
  `p7-measure/` und ist bewusst nicht committet · klein: die Methodendoku an `#appendToOrdered()`
  (`ComponentContext.ts:1077`) sagt den Schnellpfad für »every component that sorts at or after the
  last member« unbedingt zu, während der Kommentar zwanzig Zeilen darunter die eine Ausnahme nennt —
  ist der Eintrag zum letzten uuid weg, antwortet er nichts und der Suchlauf läuft doch
- Nebenbefunde: → Queue
- Folgen: keine · die öffentliche Fläche bewegt sich nicht: `OrderedUuids` steht ohne `export` im
  Kopf von `ComponentContext.ts`, beide umgestellten Listen sind privat, und `pnpm typecheck` hat die
  Verengung `children: string[]` → `OrderedUuids` über den ganzen Baum samt Specs mitgeprüft

**PERF-001 · medium · packages/shadow-objects/src/view/ComponentContext.ts:950-966, :329-380, :480-498** — Die geordneten Listen der View-Seite kosten pro Operation eine lineare Suche

#appendToOrdered() prüft zuerst mit includes(), ob die uuid schon dasteht, und sucht dann linear die Einfügestelle, wobei jeder Schritt einen Map-Lookup auf #components macht. addToChildren(), removeFromParent() und changeOrder() legen mit removeFrom() je eine weitere lineare Suche darüber. n Geschwister unter einem Elternteil aufzubauen ist damit O(n²), und für #rootComponents gilt dasselbe. Die Größenordnung steht im Repository selbst: der Kommentar an collectPeerReRequest() beziffert einen Build über 600 Wurzeln in einem Namensraum mit 42 ms bei abgeschaltetem Peer-Kanal, und das ist genau diese Rechnung.

Empfehlung: Der Preis liegt in der Datenstruktur, nicht im Code. Eine Map<uuid, index> neben jeder geordneten Liste macht includes und removeFrom konstant; die Einfügestelle bleibt linear, wird aber billiger, weil die order der Geschwister nicht mehr über #components geholt werden muss. Vorher messen und die Zahl neben die vorhandene aus collectPeerReRequest() schreiben: unterhalb einiger Dutzend Geschwister ist das Array die schnellere Struktur, und dann bleibt es besser, wie es ist.

> **Abweichung von der Empfehlung, entschieden in Zug 0.** Die `Map<uuid, index>` wird nicht gebaut.
> Beide geordneten Listen werden gesplict — `#appendToOrdered()` fügt in die Mitte ein, `delete()`
> schneidet aus der Mitte heraus —, und jeder Splice verschiebt sämtliche Indizes dahinter. Eine
> Index-Map müsste danach nachgezogen werden, und das ist selbst linear: die Struktur hielte genau
> das nicht, was sie verspricht. Was den Zweck erfüllt, ist ein **Set** für die Mitgliedschaft, das
> kein Splice etwas angeht. Und die Empfehlung übersieht den teureren der beiden Anteile: nicht das
> `includes()` ist der Hauptposten, sondern der Suchlauf mit seinem `#components.get()` je Schritt —
> gemessen 2,1 ms von 4,6 ms bei 600 Geschwistern. Den nimmt keine Begleitstruktur weg, sondern der
> Schnellpfad in Schritt 3, der den häufigsten Fall — alle auf der Vorgabeordnung, in
> Dokumentreihenfolge — mit einem einzigen Lookup beantwortet.

**PERF-002 · low · packages/shadow-objects/src/view/ComponentChanges.ts:183-221** — changeProperty() durchsucht dieselbe Liste dreimal, einmal pro Eigenschaft und Frame

#propsChangeOrder ist ein Array, weil die Reihenfolge der Änderungen zählt, und der Kommentar sagt das auch. Jeder Aufruf macht darauf ein includes(), und dann je nach Zweig ein removeFrom() oder ein appendToEnd(), die beide selbst indexOf plus splice sind. Das sind bis zu drei lineare Durchläufe für eine einzelne Eigenschaft. Der Pfad ist heiß: <shae-prop> schreibt darüber bei jeder Attributänderung, und ShaeOffscreenCanvasElement setzt in seinem OnFrame-Handler vier Eigenschaften pro Frame.

Empfehlung: Ein Set neben dem Array, das nur die Zugehörigkeit beantwortet, macht das includes konstant und kostet eine Zeile in jedem der drei Schreibpfade. Bei den heutigen Größenordnungen, eine Handvoll Eigenschaften pro Komponente, ist das Aufräumen und keine Rettung; es lohnt sich, sobald eine Komponente zweistellig viele Eigenschaften pro Frame bewegt. Erst messen, dann ändern.

### [x] 8. ShaeEntElement gibt ab, was nicht sein Lebenszyklus ist
- Findings: ARCH-001 (medium)
- Ziel: Das Register der beantworteten `<slot>`s und der Monkey-Patch auf `ViewComponent.dispatchEvent` stehen je in einem eigenen Modul; was in `ShaeEntElement` bleibt, ist Lebenszyklus und Elternauflösung.
- Bereich: `packages/shadow-objects/src/elements/ShaeEntElement.ts` → zwei neue Module unter `elements/`
- Hängt ab von: —
- Hash: ee35144
- Ergebnis: 1 Runde · ARCH-001 behoben · kein Regressionstest, und das ist eine Entscheidung: das
  Paket verschiebt Code und behebt keinen Korrektheitsfehler, es gibt nichts, was vorher rot sein
  könnte; die Wächter sind die vorhandenen Suiten an beiden Nähten
  (`ent-element-slot-move.test.js`, `ent-element-events.test.js`, `ent-element-upgrade.test.js`,
  `elementReachability.spec.ts`, `forward-custom-events.test.js`, `async-events.spec.ts`) · dass
  nur der Ort gewandert ist, wurde nicht behauptet, sondern nachgerechnet: nach Rück-Substitution
  der geplanten Umbenennungen sind die verschobenen Blöcke byteweise deckungsgleich mit
  `HEAD:elements/ShaeEntElement.ts`, der normalisierte Diff der sieben Member ist leer ·
  `ShaeEntElement.ts` 1060 → 848 Zeilen, kein Rückstand: keiner der acht verschobenen Member und
  keine der drei Modul-Konstanten ist dort noch zu finden · Verify ohne Turbo-Cache gefahren
  (`--force`, 0 von 13 Tasks cached), nachdem der erste Lauf vollständig aus dem Cache des
  Implementierers kam und damit dessen Beleg unter meinem Namen gewesen wäre · klein: die
  wörtlich mitgereisten Kommentare in `hostedSlots.ts:61`, `:72`, `:123` und `:136` sagen »this
  element«, wo in der neuen Heimat der Owner gemeint ist — der wörtliche Transport war verlangt,
  die Klassen-TSDoc auf `:51-57` fängt es ab · klein: `{@link HostedSlots}` in der `takeUp`-TSDoc
  (`hostedSlots.ts:150`) zeigt auf die eigene Klasse, gemeint ist der private `#onSlotChange`, den
  ein Link nicht erreicht
- Nebenbefunde: → Queue (4 Einträge, alle in den neuen Modulen und alle wörtlich mitgereist)
- Folgen: keine · kein Aufrufer außerhalb der drei geänderten Dateien war betroffen, die
  verschobenen Modul-Konstanten waren nie exportiert
- Schnittstellen: `packages/shadow-objects/src/elements/hostedSlots.ts` — `export class HostedSlots`
  mit `constructor(owner: ShaeEntElement)`, `collect()`, `takeUp(event: Event)` und `releaseAll()`;
  alles andere privat, `askEveryoneToReRequest` modulprivat ·
  `packages/shadow-objects/src/elements/forwardCustomEvents.ts` — `isEmptyFilter`, `isSameFilter`
  und `forwardCustomEventsFrom(vc: ViewComponent, target: EventTarget, filter: Set<string> |
  boolean): (() => void) | undefined` · **Keines der beiden Module wird aus `index.ts`
  re-exportiert und keine `exports`-Zeile zeigt darauf**; öffentlich sind sie nur als acht Zeilen
  in `src/distContract.files.txt`. Jedes weitere Modul unter `src/elements/` setzt dort wieder vier
  Zeilen, und das Regenerierungs-Kommando aus Schritt 6 reproduziert die Datei bitgleich.
- Modell: stärkste Stufe
- Effort: high · Nicht wegen des Implementierers — der Detailplan nennt jede Signatur, jede Fundstelle und jede Aufrufstelle, das allein wäre `medium`. Der Reviewer ist der Grund: er erbt den Wert, und die einzige Frage dieses Pakets ist, ob über rund 300 Diff-Zeilen wirklich nichts als der Ort gewandert ist. Eine still mitgereiste Verhaltensänderung ist hier der einzige mögliche Fehler und zugleich der, den nur Deliberation findet.
- Dateien: `packages/shadow-objects/src/elements/hostedSlots.ts` (neu), `packages/shadow-objects/src/elements/forwardCustomEvents.ts` (neu), `packages/shadow-objects/src/elements/ShaeEntElement.ts`, `packages/shadow-objects/src/distContract.files.txt`, `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. **Nichts als der Ort ändert sich.** Dieses Paket verschiebt Code, es verbessert ihn nicht.
     Kommentare und TSDoc reisen wörtlich mit dem Code, den sie erklären — die 368
     Kommentarzeilen dieser Datei sind der Grund, warum die Stellen überhaupt verständlich
     sind, und eine gekürzte Fassung wäre ein Verlust, den kein Test meldet. Keine Umbenennung
     über die hinaus, die dieser Plan nennt, keine Neuformatierung, keine zusätzliche
     Fehlerbehandlung, kein »wenn ich schon mal hier bin«. Die Zeilennummern unten stehen für
     den Stand `6be9933`, in dem `ShaeEntElement.ts` 1060 Zeilen hat und seit der Lauf-Basis
     `f971e40` unberührt ist; gesucht wird trotzdem am Symbol, nicht an der Nummer.
  2. **`packages/shadow-objects/src/elements/hostedSlots.ts` anlegen.** Modulweit und ohne
     `export`, in dieser Reihenfolge, je samt ihrer Doku:
     - `const entHostOfSlot` (Zeile 61–82, TSDoc ab 61, Deklaration auf 82)
     - `const reRequestedForSlotChange` (84–85)
     - `const askEveryoneToReRequest` (87–106)

     `askEveryoneToReRequest` wird **nicht** exportiert: seine beiden Aufrufstellen (953 und
     975) wandern beide in dieses Modul, danach hat es außerhalb keinen Rufer mehr.

     Darunter `export class HostedSlots` mit dem elementgebundenen Teil. Öffentlich sind genau
     vier Namen — `constructor`, `collect`, `takeUp`, `releaseAll` —, alles andere ist privat:

     ```ts
     export class HostedSlots {
       readonly #owner: ShaeEntElement;
       readonly #slots = new Set<WeakRef<Element>>();   // war #hostedSlots (888)

       constructor(owner: ShaeEntElement) { this.#owner = owner; }

       #isClosestEntAbove(slot: Element): boolean  // war #isClosestEntAbove (868–881)
       #watch(slot: Element): void                 // war #watchHostedSlot (890–898)
       #release(slot: Element): void               // war #releaseHostedSlot (900–906)
       #onSlotChange = (event: Event) => { … }     // war #onHostedSlotChange (939–954)

       collect(): void      // war #collectHostedSlots (915–937)
       takeUp(event: Event): void                  // neu, siehe unten
       releaseAll(): void   // war #releaseHostedSlots (908–913)
     }
     ```

     `#onSlotChange` bleibt **ein** Arrow-Function-Instanzfeld und wird keine Methode:
     `addEventListener` und `removeEventListener` finden einander über die Identität der
     Funktion, und eine Prototyp-Methode gäbe bei jedem `.bind()` eine andere. Genau daran
     hängen `#watch`, `#release` und `releaseAll`.

     `takeUp(event)` ist das neue Zuhause des Mittelblocks aus `ShaeEntElement.#onSlotChange`
     (963–977): erst `const slot = event.target as Element;`, dann der Block
     `if (this.#isClosestEntAbove(slot)) { … }` wörtlich samt seinem Kommentar über der
     Doppelschranke. Dass hier `event.target` gelesen wird und in `#onSlotChange` des Registers
     `event.currentTarget`, ist keine Unachtsamkeit, sondern der Unterschied zwischen dem
     blubbernden Kanal am Element und dem Listener am Slot selbst — beide Lesarten bleiben, wie
     sie sind, und stehen jetzt nebeneinander in einer Datei.

     `this` bedeutet in den verschobenen Rümpfen an sechs Stellen weiterhin das Element und wird
     zu `this.#owner`: `new WeakRef(this)` (934 und 966), `entHostOfSlot.get(slot)?.deref() === this`
     (950), `previous?.deref() !== this` (974), `this.findShadowRootHost()` (929),
     `this.querySelectorAll('slot')` (931) und `current === this` in `#isClosestEntAbove` (877).

     Importe: `import type {ShaeEntElement} from './ShaeEntElement.js'` — der reine Typ-Import
     zurück, den `requestEntAncestor.ts` schon trägt, und damit kein Zyklus zur Laufzeit — sowie
     `import {ComponentContext} from '../view/ComponentContext.js'` für die Runde.
  3. **`ShaeEntElement` an das Register anschließen.**
     - Feld `readonly #hostedSlots = new HostedSlots(this);` an die Stelle des alten
       `readonly #hostedSlots` (888). Der Name bleibt, der Typ ist ein anderer.
     - 577 `this.#collectHostedSlots()` → `this.#hostedSlots.collect()`
     - 637 und 709 `this.#releaseHostedSlots()` → `this.#hostedSlots.releaseAll()`
     - `#onSlotChange` (956–986) behält seinen Kopfkommentar und
       `this.#askPropertiesToReRequestHost()`, ruft dann `this.#hostedSlots.takeUp(event);` und
       fährt mit dem unveränderten `findShadowRootHost`-Block fort. `const slot = …` und der
       `if`-Block fallen hier weg.
     - Die acht verschobenen Member und die drei verschobenen Modul-Konstanten werden gelöscht.
       `#isClosestEntAbove` hat danach in dieser Datei keinen Rufer mehr (die drei standen auf
       933, 947 und 964) und darf nicht zurückbleiben.
     - Die Importe von `ComponentContext` und `ViewComponent` bleiben: beide werden in dieser
       Datei weiterhin an anderen Stellen gebraucht.
  4. **`packages/shadow-objects/src/elements/forwardCustomEvents.ts` anlegen.** Genau drei
     Exporte:
     - `isEmptyFilter` (111–113) wörtlich
     - `isSameFilter` (115–132) wörtlich, samt der TSDoc, die den Unterschied zum ersten erklärt
     - `forwardCustomEventsFrom(vc: ViewComponent, target: EventTarget, filter: Set<string> | boolean): (() => void) | undefined`
       — der Rumpf des Effekts ab `const originalDispatchEvent` (315) bis zum Ende der
       Cleanup-Funktion (361), mit zwei Ersetzungen: `this.dispatchEvent(…)` (338) wird
       `target.dispatchEvent(…)`, und `this.forwardCustomEvents$.get()` (319) wird der
       Parameter `filter`. Der frühe Ausstieg bei `!filter || isEmptyFilter(filter)` gibt
       `undefined` zurück, alles andere die Cleanup-Funktion — genau die Werte, die der Effekt
       heute an derselben Stelle liefert.

     `target` ist als `EventTarget` typisiert und nicht als `ShaeEntElement`: die Funktion
     braucht vom Element nichts als diesen einen Versand, und mit dem schmalen Typ kommt das
     Modul ohne den Rück-Import aus. Importe sind `ComponentContext` (Wert, für die drei
     internen Ereignisnamen) und `ViewComponent` (Typ).
  5. **Den Effekt in `#subscribe()` auf die Funktion setzen.** 307–363 wird zu:

     ```ts
     this.#forwardCustomEventsPatch = createEffect(() => {
       const vc = this.viewComponent$.get();
       // the teardown of a component drops an own `dispatchEvent` along with the subscriptions, so
       // the patch is set again on the same signal that puts those back
       this.#reSubscribe$.get();
       if (!vc) return;

       return forwardCustomEventsFrom(vc, this, this.forwardCustomEvents$.get());
     });
     ```

     Die drei Signal-Lesungen bleiben im Effekt und in dieser Reihenfolge — sie *sind* der
     Abhängigkeitsgraph. Dass `forwardCustomEvents$` hinter dem frühen Ausstieg steht, ist
     heutiges Verhalten und bleibt: ohne Komponente hängt dieser Effekt nicht am Filter. Der
     Filter wird als Wert übergeben und nicht in der Hilfsfunktion gelesen, damit jede
     Abhängigkeit dieses Effekts an der einen Stelle sichtbar ist, der er gehört.
     - 378 (`#reflectForwardCustomEvents`) und 535 (der Rücklesevorgang beim Connect) rufen
       `isEmptyFilter` und `isSameFilter` unverändert, jetzt aus dem Import.
  6. **Auslieferungsvertrag nachziehen.** Zwei neue Module unter `src/elements/` sind acht neue
     Dateien unter `dist/` — `.d.ts`, `.d.ts.map`, `.js`, `.js.map` je Modul. Nach
     `pnpm -F @spearwolf/shadow-objects build`:

     ```bash
     cd packages/shadow-objects && find dist -type f -printf '%P\n' | LC_ALL=C sort > src/distContract.files.txt
     ```

     Das Kommando ist gegen den aktuellen Stand geprüft und reproduziert die Datei bitgleich;
     es bildet nach, was `collectFilesUnderDist()` in `src/distContract.spec.ts` tut
     (`readdirSync` rekursiv, danach `.sort()`). Die acht Zeilen landen zwischen
     `src/elements/events.js.map` und `src/elements/propValueConverters.d.ts`.
     `src/distContract.package.json` bewegt sich **nicht**: keines der beiden Module wird aus
     `index.ts` re-exportiert, und kein Eintrag der `exports`-Map zeigt darauf.
  7. **CHANGELOG.** Ein Bullet unter `### Internal` im `## [Unreleased]`-Abschnitt von
     `packages/shadow-objects/CHANGELOG.md`. Das erste Bullet dieses Abschnitts — das über
     `MicrotaskCollector` und `MicrotaskGate` — ist die Form, an der du dich hältst: die Module
     benennen, sagen was in sie hineingewandert ist, die acht neuen Dateien der
     veröffentlichten Liste nennen, und den Satz mitführen, dass keines aus `index.ts`
     exportiert wird und keine `exports`-Zeile darauf zeigt, die Dateiliste also alles ist, was
     ein Konsument davon sieht. An die Stelle, an der jenes Bullet die Verhaltensänderung
     beschreibt, tritt hier ihr Gegenteil: es bewegt sich keine.
     Kein `docs/` und kein `README.md` — die öffentliche Fläche ändert sich nicht. `AGENTS.md`
     und `CLAUDE.md` beschreiben `elements/` weiterhin richtig und brauchen nichts.
  8. **Keine neuen Tests, und das ist eine Entscheidung, keine Auslassung.** Das Paket behebt
     keinen Korrektheitsfehler, sondern verschiebt Code — es gibt nichts, was vorher rot sein
     könnte. Der Wächter über die Verschiebung sind die vorhandenen Suiten, und sie sitzen
     dicht an beiden Nähten: `packages/shadow-objects-testing/test/ent-element-slot-move.test.js`
     fährt acht Fälle über genau die Zustandsübergänge des Registers (Slot wechselt die Entity,
     verlässt den Shadow Root, kommt nach einer Abwesenheit des Hosts zurück, Runde läuft nur
     beim Wechsel), dazu `ent-element-events.test.js`, `ent-element-upgrade.test.js` und
     `packages/shadow-objects/src/elements/elementReachability.spec.ts`; über den Patch laufen
     `packages/shadow-objects-testing/test/forward-custom-events.test.js` und der e2e-Fall
     `packages/shadow-objects-e2e/tests/async-events.spec.ts`. Ein frisch geschriebener Unit-Test
     auf ein gerade verschobenes Modul prüft, was der Verschiebende für richtig hielt, und
     bestätigt seinen eigenen Irrtum — er ersetzt keinen der vorhandenen Fälle. Dass die Deckung
     über `forwardCustomEventsFrom` mit einem Integrationsfall plus einem e2e-Fall dünner ist als
     über dem Register, ist gesehen und keine Aufgabe dieses Pakets; fällt beim Umbau eine
     ungedeckte Verzweigung auf, wird sie als Nebenbefund gemeldet, nicht getestet.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test` — voll, weil `build` das ist,
  woran `src/distContract.spec.ts` die Dateiliste misst; ohne den Build läuft der Vertragstest
  gegen ein altes `dist/`. Für Zwischenrunden reichen die beiden Suiten, die das Verhalten tragen:
  `pnpm -F @spearwolf/shadow-objects exec vitest --run src/elements` und
  `pnpm -F shadow-objects-testing test`.
- Commit: `refactor(elements): the slot register and the event forwarding each get a module, and the entity element keeps its lifecycle`

**ARCH-001 · medium · packages/shadow-objects/src/elements/ShaeEntElement.ts (1 060 Zeilen); daneben view/ComponentContext.ts (1 009) und in-the-dark/Kernel.ts (993)** — ShaeEntElement trägt sechs Zuständigkeiten in einer Klasse

In einer Datei liegen: der Custom-Element-Lebenszyklus, der Namensraumwechsel samt Umzug in einen anderen ComponentContext, das Auflösungsprotokoll für den Entity-Elternteil über drei CustomEvents, ein Register der beantworteten <slot>s mit WeakRef-Buchführung und modulweiter WeakMap, ein Monkey-Patch auf ViewComponent.dispatchEvent für forward-custom-events, und ein MutationObserver auf den Elternknoten. Jedes Stück ist für sich begründet; zusammen sind es 539 Zeilen Code und 368 Zeilen Kommentar, die niemand mehr am Stück im Kopf hält. Bezahlt wird das im Review: eine Änderung am Slot-Register muss gegen das Elternprotokoll geprüft werden, weil beide über dieselben Ereignisse laufen und beide in denselben Callback zurückführen.

Empfehlung: Zwei Nähte liegen frei. Das Slot-Register (entHostOfSlot, reRequestedForSlotChange, #hostedSlots, #watchHostedSlot, #releaseHostedSlot(s), #collectHostedSlots, #onHostedSlotChange, askEveryoneToReRequest) ist heute schon halb modulweit und trägt außer der Zugehörigkeit keinen Elementzustand: es passt in ein eigenes Modul mit einer Handvoll Funktionen und einem Register. Der dispatchEvent-Patch ist das zweite geschlossene Stück, rund 55 Zeilen mitsamt Cleanup. Was bleibt, ist ein Element mit Lebenszyklus und Elternauflösung, und das ist die Klasse, die der Name verspricht.

### [x] 9. Ein Element-Lebenszyklus für beide Elementklassen
- Findings: ARCH-002 (medium)
- Ziel: Die Regel »Flagge vor der Arbeit« samt `#destroyed`/`#subscribed`, `DeferredTeardown`, `restore()`/`teardown()` und `destroy()` steht an einer Stelle und wird an einer geprüft; `ShaeElement` ergänzt die Namensraum-Behandlung, `ShaePropElement` erbt ohne sie.
- Bereich: `packages/shadow-objects/src/elements/ShaeElement.ts`, `elements/ShaePropElement.ts`, neue gemeinsame Basis `elements/ShaeLifecycleElement.ts`
- Hängt ab von: — · Die Reihenfolge 8 vor 9 ist die billigere und bleibt: Paket 8 fasst nur `ShaeEntElement.ts` an, das Paket 9 gar nicht berührt, während umgekehrt Paket 8 gegen eine frisch verschobene Vererbungslinie hätte arbeiten müssen.
- Hash: c6bc107
- Ergebnis: 2 Runden · ARCH-002 behoben — der Lebenszyklus-Vertrag steht in
  `elements/ShaeLifecycleElement.ts` und wird in `elements/ShaeLifecycleElement.spec.ts` an acht
  Fällen geprüft; `ShaeElement` und `ShaePropElement` erben ihn, `ShaeElement.ts` 311 → 221 Zeilen,
  `ShaePropElement.ts` 548 → 484, die Basis 132 · kein Regressionstest verlangt, das Paket verschiebt Code und
  behebt keinen Korrektheitsfehler; der Wächter über »Flagge vor der Arbeit«
  (`runs the teardown once when releasing something reaches back into destroy`) wurde gegen eine
  Mutationsprobe rot gesehen — `this.#destroyed = true;` hinter `this.teardown()` geschoben ergibt
  `expected 2 to be 1` · die zweite Runde schloss fünf Textbefunde des Reviews: zwei Kommentare in
  `ShaeEntElement.ts:398` und `ShaeWorkerElement.ts:261` zeigten weiter auf `ShaeElement.connectedCallback`,
  wo der Grund nicht mehr steht; Fall 8 der neuen Spec traf eine Teilzeichenkette statt eines
  Selektor-Tokens; dazu ein Reflow in `docs/api-reference.md` und ein Bezugswort im CHANGELOG ·
  Verify voll grün ohne Cache-Treffer (948 / 384 / 139 / 654 Tests), Coverage 94,1 % Statements
- Nebenbefunde: → Queue (vier Einträge)
- Folgen: keine
- Modell: stärkste Stufe
- Effort: high · Der Detailplan nennt jede Fundstelle und jede Signatur, für sich genommen wäre das `medium`. Zwei Dinge heben es: die `hibernate()`-Klammer muss beim Umbau der `connectedCallback`-Kette an jeder der vier Stellen die gleiche Reichweite behalten wie heute, und der Reviewer erbt den Wert — dass über rund 400 Diff-Zeilen nichts als Ort und Vererbungslinie gewandert ist, findet nur Deliberation.
- Dateien: `packages/shadow-objects/src/elements/ShaeLifecycleElement.ts` (neu), `packages/shadow-objects/src/elements/ShaeLifecycleElement.spec.ts` (neu), `packages/shadow-objects/src/elements/ShaeElement.ts`, `packages/shadow-objects/src/elements/ShaePropElement.ts`, `packages/shadow-objects/src/distContract.files.txt`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. **Nichts als der Ort und die Vererbungslinie ändern sich.** Dieses Paket zieht doppelt
     dastehenden Code in eine gemeinsame Basis; es verbessert ihn nicht. Kommentare und TSDoc
     reisen wörtlich mit dem Code, den sie erklären — sie sind der Grund, warum die Stellen
     überhaupt verständlich sind. Keine Umbenennung über die hinaus, die dieser Plan nennt, keine
     Neuformatierung, keine zusätzliche Fehlerbehandlung. Die öffentliche Fläche bewegt sich
     nicht: `<shae-prop>` bekommt kein `ns`, kein `isShaeElement` und keinen Eintrag mehr in
     `observedAttributes`, und `instanceof ShaeElement` antwortet für ein `<shae-prop>` weiterhin
     `false`. Die Zeilennummern unten stehen für den Stand `ee35144` — `ShaeElement.ts` hat dort
     311 Zeilen und ist seit der Lauf-Basis `f971e40` unberührt, `ShaePropElement.ts` hat 548 und
     wurde zuletzt in `ad11734` an seinen Logger-Aufrufstellen angefasst, nicht am Lebenszyklus.
     Gesucht wird trotzdem am Symbol, nicht an der Nummer.

  2. **`packages/shadow-objects/src/elements/ShaeLifecycleElement.ts` anlegen.** Ein Export,
     `export class ShaeLifecycleElement extends HTMLElement`. Der Name nennt, was die Klasse
     trägt, und behält das `Shae…Element` der Elementfamilie dieses Pakets; sie bleibt ohne Tag
     und ohne `static observedAttributes`, damit die vier Attribute von `<shae-prop>` genau die
     vier bleiben. Importe: `hibernate` aus `@spearwolf/signalize`, `DeferredTeardown` aus
     `./deferredTeardown.js`, `ensureDisplayContentsRule` aus `./displayContentsRule.js`.

     **Klassen-TSDoc.** Die vier Absätze aus `ShaeElement.ts:41-61` wandern wörtlich hierher, mit
     `{@link ShaeElement.restore}` → `{@link ShaeLifecycleElement.restore}` an beiden Stellen (55
     und 61). Der Einleitungssatz (39) bleibt bei `ShaeElement` und wird hier ersetzt durch:

     ```
     The lifecycle every custom element of this library carries: when it starts listening, when it
     lets go, and what it keeps across the two.
     ```

     **Mitglieder, in dieser Reihenfolge, je samt ihrer Doku:**
     - `#destroyed = false;` (88)
     - die TSDoc über `#subscribed` samt Feld (90-99) — wörtlich, aber ohne den Rückverweis: der
       Satz »see `ShaeElement`, where the same pair carries the same reasoning« aus
       `ShaePropElement.ts:105-106` hatte genau hier seinen Grund und fällt mit ihm weg
     - `readonly #teardown = new DeferredTeardown(() => this.destroy());` (101)
     - `/** Whether this element has been torn down. */ get isDestroyed(): boolean` (106-109)
     - `connectedCallback()` aus 199-221 plus der schließenden Klammer:

       ```ts
       connectedCallback() {
         // <Kommentar 200-206 wörtlich>
         hibernate(() => {
           // <Kommentar 208-209 wörtlich>
           this.#teardown.cancel();

           // <Kommentar 212-214 wörtlich>
           this.#destroyed = false;
           if (!this.#subscribed) {
             this.#subscribed = true;
             this.restore();
           }

           ensureDisplayContentsRule(this.getRootNode(), this.localName);
         });
       }
       ```

       Der Aufruf steht hier ohne Kommentar, wie heute in `ShaeElement`. Der Kommentar, der ihn in
       `ShaePropElement.ts:341-342` begleitet (»called by hand because this class extends
       `HTMLElement` directly«), beschreibt einen Zustand, den dieses Paket beendet, und wird
       nicht mitgenommen.
     - `disconnectedCallback(): void { this.#teardown.schedule(); }` (242-244)
     - `destroy()` samt TSDoc (246-265) wörtlich, mit `{@link ShaeElement.teardown}` →
       `{@link ShaeLifecycleElement.teardown}`
     - `protected restore(): void` — der Erweiterungspunkt, mit leerem Rumpf und dieser TSDoc,
       zusammengesetzt aus dem allgemeinen Teil von `ShaeElement.ts:144-163` (die Absätze 145,
       147-150 und 159-162; der Nachhol-Absatz 152-157 ist `ShaeElement`s eigener und bleibt
       dort):

       ```ts
       /**
        * Take the subscriptions up.
        *
        * Called from `connectedCallback` and from nowhere else — a constructor in particular, where
        * the subclass fields these subscriptions read are not there yet. It runs at the first
        * connect, where the element has never listened to anything, and again for one that comes
        * back after a teardown; the two are the same job, and the element between them is in the
        * same state either way.
        *
        * A subclass overrides this, calls `super.restore()` first and takes its own subscriptions
        * up. Every subscription released in {@link ShaeLifecycleElement.teardown} has to come back
        * here — one that does not is gone for the rest of the element's life, silently.
        */
       protected restore(): void {
         // the extension point holds nothing of its own: what an element listens to belongs to the
         // element, and this class decides only when the subscriptions are taken up
       }
       ```
     - `protected teardown(): void` — ebenso, aus dem allgemeinen Teil von `ShaeElement.ts:267-278`
       (Absätze 268 und 270-273; der `#pendingReflections`-Absatz 275-277 gehört `ShaeElement` und
       bleibt dort):

       ```ts
       /**
        * Release what this element holds. The overridable half of
        * {@link ShaeLifecycleElement.destroy}.
        *
        * A subclass releases its own subscriptions and calls `super.teardown()` last, so the
        * element comes apart from the outside in. Whatever is released here has to be taken up
        * again in {@link ShaeLifecycleElement.restore} — the two are one pair, and a subscription
        * missing from either side is a leak or a silently dead element.
        */
       protected teardown(): void {
         // the counterpart of `restore()`, and empty for the same reason
       }
       ```

     Die Basis wird **nicht** aus `index.ts` re-exportiert und bekommt keine `exports`-Zeile: sie
     nennt kein Tag und trägt kein Mitglied, das ein Konsument beim Namen sucht — `isDestroyed`,
     `destroy()`, `restore()` und `teardown()` erreicht er über `ShaeElement` und
     `ShaePropElement`, die beide exportiert sind. Der `export` an der Klasse selbst ist trotzdem
     nötig: ohne ihn kann `tsc` die Deklaration von `ShaeElement` nicht emittieren.

  3. **`ShaeElement.ts` umbauen.**
     - `export class ShaeElement extends ShaeLifecycleElement`, Import
       `import {ShaeLifecycleElement} from './ShaeLifecycleElement.js';`
     - Die Klassen-TSDoc (38-62) schrumpft auf den Einleitungssatz plus einen Absatz, der die
       Naht benennt:

       ```
       /**
        * The base of the custom elements that pick an environment through their `ns` attribute.
        *
        * What it adds to {@link ShaeLifecycleElement} is the namespace: the `ns` attribute, the
        * signal behind it, the reflection back onto the attribute, and the two ways to hand an
        * environment on to the next sync. When such an element starts listening and when it lets
        * go is the base's answer, and it is the same answer `<shae-prop>` gets, which shares that
        * base without this layer.
        */
       ```
     - Gelöscht, weil geerbt: `#destroyed` (88), die TSDoc samt `#subscribed` (90-99), `#teardown`
       (101), der `isDestroyed`-Getter samt Doku (106-109), `disconnectedCallback` (242-244),
       `destroy()` samt TSDoc (246-265).
     - Die Importe von `DeferredTeardown` (11) und `ensureDisplayContentsRule` (12) fallen weg.
       `hibernate` (1) bleibt, siehe die nächsten beiden Punkte.
     - `restore()` wird `protected override restore(): void` und ruft `super.restore()` als
       Erstes, vor `this.#subscribe()`. Von seiner TSDoc bleibt der Nachhol-Absatz (152-157) und
       ein Kopf, der auf die Basis zeigt; der allgemeine Teil ist dort und wird hier nicht
       wiederholt.
     - `teardown()` wird `protected override teardown(): void` und ruft `super.teardown()` als
       Letztes, hinter den beiden `#nsReflection`-Zeilen. Von seiner TSDoc bleibt der
       `#pendingReflections`-Absatz (275-277) und ein Kopf, der auf die Basis zeigt.
     - `connectedCallback` wird `override connectedCallback()` und behält **seine eigene
       `hibernate()`-Klammer**:

       ```ts
       override connectedCallback() {
         // the whole body outside whatever reactive context the caller is in, for the reason
         // spelled out in `ShaeLifecycleElement.connectedCallback`. Nesting is fine:
         // `super.connectedCallback()` opens a frame of its own inside this one
         hibernate(() => {
           super.connectedCallback();

           // <Kommentar 223-229 wörtlich>
           this.#wasConnected = true;

           const pending = this.#pendingReflections;
           this.#pendingReflections = undefined;
           if (pending) {
             for (const write of pending.values()) {
               write();
             }
           }
         });
       }
       ```

       Die Klammer ist nicht Zeremonie und darf nicht wegfallen: die `write()`-Aufrufe lösen
       `setAttribute` und darüber `attributeChangedCallback` aus, und heute steht das alles im
       `hibernate()` dieser Methode. Die Klammer der Basis schließt vor dieser Schleife.
       Der Kommentar 223-229 spricht von »the flag falls behind that call« und meint `restore()`;
       das bleibt richtig, `restore()` läuft in `super.connectedCallback()`.
     - Unberührt: `static observedAttributes` (64), `isShaeElement` (66), `ns$` samt Accessoren
       (68-80), `#wasConnected`/`#pendingReflections` (82-86), `#nsReflection` (104), der
       Konstruktor (111-119), `#subscribe`/`#reflectNamespace` (121-142), `reflectAttribute`
       samt TSDoc (169-197), `attributeChangedCallback` (284-288, kein `override` — die Basis hat
       keins), `syncShadowObjects`/`syncShadowObjectsOf` (290-310).

  4. **`ShaePropElement.ts` umbauen.**
     - `export class ShaePropElement extends ShaeLifecycleElement`, Import
       `import {ShaeLifecycleElement} from './ShaeLifecycleElement.js';`
     - Gelöscht, weil geerbt: `#destroyed` (98), die TSDoc samt `#subscribed` (100-108),
       `#teardown` (110), der `isDestroyed`-Getter samt Doku (136-139), `destroy()` samt TSDoc
       (387-407).
     - Die Importe von `DeferredTeardown` (7) und `ensureDisplayContentsRule` (8) fallen weg.
       `hibernate` (1) bleibt.
     - `connectedCallback` wird `override connectedCallback()` und behält seine eigene
       `hibernate()`-Klammer aus demselben Grund wie oben — der `batch(…)`-Block steht hinter der
       Klammer der Basis:

       ```ts
       override connectedCallback() {
         // <Kommentar 324-326, mit `ShaeLifecycleElement.connectedCallback` als Fundstelle statt
         // `ShaeElement.connectedCallback`>
         hibernate(() => {
           super.connectedCallback();

           batch(() => {
             this.#findEntNode();
             this.#readNameAttribute();
             this.#readValueAttribute();
             this.#readTypeAttribute();
             this.#readNoTrimAttribute();
           });
         });
       }
       ```
     - `disconnectedCallback` wird `override disconnectedCallback()`; die beiden Aufrufe bleiben in
       ihrer Reihenfolge stehen, `this.#teardown.schedule()` wird `super.disconnectedCallback()`.
       Der Kommentar 379-383 über die Mikrotask-Reihenfolge bleibt und steht dann über dem
       `super`-Aufruf; sein Wort »the teardown« meint weiterhin dieselbe Buchung.
     - `restore()` wird `protected override restore(): void` und ruft `super.restore()` vor
       `this.#subscribe()`. Von seiner TSDoc (301-318) bleibt der Absatz über das Fehlen eines
       Nachholens (308-313) und ein Kopf, der auf die Basis zeigt; die allgemeinen Absätze
       (302-306 und 315-317) stehen dort und werden nicht wiederholt. Der Satz »`<shae-ent>`
       carries the same pair of methods — see `ShaeElement`« (306) fällt weg: das Paar kommt
       jetzt aus der geteilten Basis, und das sagt der Kopf.
     - `teardown()` wird `protected override teardown(): void` und ruft `super.teardown()` als
       Letztes, hinter den vier Freigaben. Von seiner TSDoc (409-420) bleibt der `link()`-Absatz
       (417-419) und ein Kopf, der auf die Basis zeigt.
     - Die Klassen-TSDoc (50-76): Der erste Satz (53-54) nennt heute `HTMLElement` als direkte
       Basis nur implizit über »does not extend `ShaeElement`«. Er wird zu einem Satz, der beides
       sagt — geteilte Basis, kein Namensraum —, etwa:

       ```
       Unlike `<shae-ent>` and `<shae-worker>`, this element does not extend `ShaeElement` and has
       no namespace of its own. It shares their lifecycle: `ShaeLifecycleElement` is the base of
       all three, and `destroy()`, `isDestroyed`, `restore()` and `teardown()` mean the same thing
       on every one of them. What it does not share is the layer above it.
       ```

       Der Rest des Absatzes (»`ShaeElement` exists for elements that pick an environment …« bis
       62) bleibt wörtlich stehen — er begründet weiterhin, warum diese Klasse den Namensraum
       nicht erbt. Ebenso die beiden folgenden Absätze (64-75).
     - Unberührt: `static observedAttributes` (78), `isShaePropElement` (80), die sieben Signale
       (82-89), `#logger` samt Getter (91-96), die übrigen privaten Felder (112-134), die
       Accessoren (141-167), der Konstruktor (169-180), `#subscribe` (182-299),
       `attributeChangedCallback` (355-373, kein `override`), und alles ab `#findEntNode` (437-547).

  5. **`packages/shadow-objects/src/elements/ShaeLifecycleElement.spec.ts` anlegen.** Das ist die
     zweite Hälfte des Auftrags: der Vertrag steht danach an einer Stelle und wird an einer
     geprüft. Vitest mit `happy-dom`, wie die Nachbarspecs; `describe`, `it`, `expect`,
     `beforeAll`, `afterEach` aus `vitest`.

     Zwei Probe-Klassen, in `beforeAll` je unter einem eigenen Tag registriert:

     ```ts
     class LifecycleProbe extends ShaeLifecycleElement {
       restoreCount = 0;
       teardownCount = 0;

       protected override restore(): void {
         this.restoreCount += 1;
         super.restore();
       }

       protected override teardown(): void {
         this.teardownCount += 1;
         super.teardown();
       }
     }

     class ReentrantProbe extends ShaeLifecycleElement {
       teardownCount = 0;
       #callsBack = true;

       protected override teardown(): void {
         this.teardownCount += 1;
         // the shape the guard is for: releasing something reaches back into the element. Only the
         // first pass calls back, so a guard that fell too late shows up as a second run instead of
         // an unbounded one
         if (this.#callsBack) {
           this.#callsBack = false;
           this.destroy();
         }
         super.teardown();
       }
     }
     ```

     Acht Fälle, jeder eine Zusage des Vertrags:
     1. `a freshly built element is listening to nothing and has been torn down by nobody` —
        `restoreCount` 0, `teardownCount` 0, `isDestroyed` `false`. Das ist genau die
        Meinungsverschiedenheit, wegen der `#destroyed` und `#subscribed` zwei Felder sind.
     2. `takes its subscriptions up at the first connect` — nach `document.body.append(el)`:
        `restoreCount` 1, `teardownCount` 0, `isDestroyed` `false`.
     3. `stays subscribed across a move within one task` — angehängt, dann in einen zweiten
        Elternknoten gehängt (das Anhängen entfernt es implizit aus dem ersten), danach
        `await new Promise((resolve) => setTimeout(resolve, 0))`: `restoreCount` 1,
        `teardownCount` 0, `isDestroyed` `false`.
     4. `tears down one microtask after it stays out` — `el.remove()`, dann
        `await Promise.resolve()`: `teardownCount` 1, `isDestroyed` `true`.
     5. `takes the same subscriptions up again on the way back` — wieder anhängen:
        `restoreCount` 2, `isDestroyed` `false`.
     6. `counts one teardown however often destroy is called` — anhängen, `destroy()` zweimal von
        Hand: `teardownCount` 1, `isDestroyed` `true`.
     7. `runs the teardown once when releasing something reaches back into destroy` — die
        `ReentrantProbe` anhängen und `destroy()` rufen: `teardownCount` 1, `isDestroyed` `true`.
     8. `carries the display rule for its own tag into the root it connects in` — nach dem Anhängen
        trägt `document.head` ein `<style>`, dessen `textContent` den Tag-Namen der Probe nennt.

     Ein `afterEach`, das `document.body.replaceChildren()` ruft, wie in
     `elementReachability.spec.ts`.

     **Fall 7 wird rot gesehen, bevor er grün gilt.** Er ist kein Regressionstest — dieses Paket
     behebt keinen Korrektheitsfehler —, sondern der Wächter über die eine Regel, die der Auftrag
     namentlich nennt, und ein Wächter, der nie gefallen ist, ist eine Behauptung. Die Probe: in
     `ShaeLifecycleElement.destroy()` die Zeile `this.#destroyed = true;` versuchsweise **hinter**
     `this.teardown()` schieben, den Fall laufen lassen, das rote Ergebnis
     (`expected 2 to be 1`) in den Report nehmen, die Zeile zurückschieben. Die übrigen sieben
     Fälle sind vor wie nach dem Umbau grün und werden als solche benannt; ein roter Lauf wäre
     dort ein Befund.

     Kein weiterer neuer Test. Die vorhandenen Suiten sind die Wächter über die Verschiebung und
     sitzen dicht an der Naht: `packages/shadow-objects/src/elements/elementReachability.spec.ts`
     fährt Aufbau, Abbau, Rückkehr und Einsammelbarkeit über alle drei Tags,
     `packages/shadow-objects-testing/test/create-element.test.js` prüft `display: contents` in
     echtem Chromium für alle drei, dazu `ent-element-teardown.test.js`,
     `worker-element-teardown.test.js`, `prop-element-lifecycle.test.js` und
     `prop-element-host.test.js`.

  6. **Auslieferungsvertrag nachziehen.** Ein neues Modul unter `src/elements/` sind vier neue
     Dateien unter `dist/` — `.d.ts`, `.d.ts.map`, `.js`, `.js.map`. Die Spec-Datei zählt nicht
     mit: der Lib-Transpile überspringt `*.spec.ts`. Nach
     `pnpm -F @spearwolf/shadow-objects build`:

     ```bash
     cd packages/shadow-objects && find dist -type f -printf '%P\n' | LC_ALL=C sort > src/distContract.files.txt
     ```

     Das Kommando bildet nach, was `collectFilesUnderDist()` in `src/distContract.spec.ts` tut,
     und reproduziert die Datei bitgleich. Die vier Zeilen landen zwischen
     `src/elements/ShaeEntElement.js.map` (heute Zeile 42) und `src/elements/ShaePropElement.d.ts`
     (43). `src/distContract.package.json` bewegt sich **nicht**: die Basis wird nicht aus
     `index.ts` re-exportiert, und kein Eintrag der `exports`-Map zeigt darauf.

  7. **CHANGELOG.** Ein Bullet unter `### Internal` im `## [Unreleased]`-Abschnitt von
     `packages/shadow-objects/CHANGELOG.md`. Das erste Bullet dieses Abschnitts — das über
     `hostedSlots.ts` und `forwardCustomEvents.ts` — ist die Form, an der du dich hältst: das
     Modul benennen, sagen was hineingewandert ist, die vier neuen Dateien der veröffentlichten
     Liste nennen, den Satz mitführen, dass es nicht aus `index.ts` exportiert wird und keine
     `exports`-Zeile darauf zeigt, und sagen, dass sich kein Verhalten bewegt. Konkret gehört
     hinein, was ein Konsument sonst selbst nachrechnen müsste: `<shae-prop>` hat weiterhin kein
     `ns`, kein `isShaeElement` und dieselben vier `observedAttributes`, `instanceof ShaeElement`
     antwortet für ein `<shae-prop>` weiterhin `false`, und `destroy()`, `isDestroyed`,
     `restore()` und `teardown()` bedeuten auf allen drei Elementen dasselbe wie zuvor.

  8. **Doku.** Zwei Stellen in `packages/shadow-objects/docs/api-reference.md`, beide im
     `<shae-prop>`-Abschnitt:
     - Die Zeile `isShaePropElement` (2479) sagt heute »This element does not extend
       `ShaeElement`, so there is no `isShaeElement` and no `ns` on it.« Das bleibt wahr und
       bleibt stehen; anzufügen ist, dass es die Lebenszyklus-Basis mit den beiden anderen teilt.
     - Der Absatz ab 2492 sagt »`teardown()` and `restore()` are `protected` and carry the
       lifecycle here exactly as they do on `ShaeElement`, which this element does not extend.«
       Aus dem »exactly as« ist inzwischen Gleichheit im Wortsinn geworden: beide Elemente erben
       dieselbe Basis. Der Satz wird darauf umgestellt und nennt `ShaeLifecycleElement` beim
       Namen, mit dem Zusatz, dass die Klasse nicht aus dem Paket-Einstiegspunkt exportiert wird
       — sie steht in der veröffentlichten Dateiliste und in den emittierten Deklarationen, aber
       ein Konsument erreicht sie nicht über `import {…} from '@spearwolf/shadow-objects'`.

     Sonst nichts: `README.md` nennt die Klassenhierarchie an keiner Stelle, `docs/guides.md:367`
     spricht von einer Unterklasse von `ShaeEntElement` und bleibt richtig, und die
     `<shae-ent>`-Abschnitte (2095-2170) beschreiben Lebenszyklus und Erweiterungspunkte
     unverändert zutreffend. `AGENTS.md` und `CLAUDE.md` beschreiben `elements/` weiterhin
     richtig und brauchen nichts.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test` — voll, weil `build` das ist,
  woran `src/distContract.spec.ts` die Dateiliste misst; ohne den Build läuft der Vertragstest
  gegen ein altes `dist/`. Kommt der Lauf vollständig aus dem Turbo-Cache, gilt er nicht: dann
  mit `--force` wiederholen, sonst steht der Cache des Implementierers unter fremdem Namen im
  Beleg. Für Zwischenrunden reichen
  `pnpm -F @spearwolf/shadow-objects exec vitest --run src/elements` und
  `pnpm -F shadow-objects-testing test`.
- Commit: `refactor(elements): one base carries the element lifecycle, and both the namespace element and the property element inherit it`
- Schnittstellen: `packages/shadow-objects/src/elements/ShaeLifecycleElement.ts` —
  `export class ShaeLifecycleElement extends HTMLElement` trägt den Lebenszyklus aller drei Tags:
  `isDestroyed`, `destroy()`, `connectedCallback()`, `disconnectedCallback()` und die beiden
  `protected` Erweiterungspunkte `restore()` und `teardown()`. `ShaeElement` und `ShaePropElement`
  erben sie beide; wer eine der vier Methoden überschreibt, ruft `super` — `restore()` als Erstes,
  `teardown()` als Letztes. Die Klasse nennt kein Tag, hat keine `static observedAttributes` und
  wird **nicht aus `index.ts` re-exportiert**; keine `exports`-Zeile zeigt darauf, öffentlich ist
  sie nur als vier Zeilen in `src/distContract.files.txt`. Das `export` an der Klasse selbst ist
  nötig, sonst kann `tsc` die Deklaration von `ShaeElement` nicht emittieren. Nichts an der
  Oberfläche der drei Elemente bewegt sich: `<shae-prop>` hat weiterhin kein `ns`, kein
  `isShaeElement` und dieselben vier `observedAttributes`, und `instanceof ShaeElement` antwortet
  für ein `<shae-prop>` weiterhin `false`.
**ARCH-002 · medium · packages/shadow-objects/src/elements/ShaeElement.ts:83-282 gegen elements/ShaePropElement.ts:98-437** — Der Element-Lebenszyklus steht zweimal im Repository

ShaePropElement erbt nicht von ShaeElement, und der Grund dafür steht ausführlich im Kopf der Datei: eine Property wählt keine Umgebung und hätte an einem ns-Attribut nichts. Die Folge ist, dass sie den ganzen Lebenszyklus-Vertrag nachbaut: das Feldpaar #destroyed/#subscribed samt der Begründung, warum es zwei sein müssen, den DeferredTeardown, das Paar restore()/teardown(), ein destroy(), das die Flagge vor die Arbeit setzt, den ensureDisplayContentsRule-Aufruf im connectedCallback und die hibernate()-Klammer darum. Die Doc-Kommentare stehen an beiden Stellen nahezu wortgleich, an einer Stelle mit dem ausdrücklichen Verweis auf die andere. Wer den Vertrag ändert, ändert ihn zweimal, und ein Auseinanderlaufen bleibt still: kein Test hält die beiden gegeneinander.

Empfehlung: Den Vertrag in eine gemeinsame Basis ohne Namensraum ziehen, aus der ShaeElement die ns-Behandlung ergänzt und von der ShaePropElement direkt erbt. Wo eine Klassenhierarchie nicht passt, tut es ein Mixin oder eine ElementLifecycle-Hilfsklasse, an die beide delegieren. Entscheidend ist nur, dass die Regel 'Flagge vor der Arbeit' an einer Stelle steht und an einer geprüft wird.

### [x] 9a. Wurzelliste und Kinderliste geraten nicht auseinander
- Findings: Nebenbefund aus Paket 7 (low, vorbestehend, nicht im Audit)
- Ziel: `removeFromParent()` und `moveToRoot()` hängen eine Komponente nur dann an `#rootComponents`, wenn die Kinderliste, in der sie steht, sie auch abgegeben hat — über diese beiden Methoden kann eine Komponente danach nicht mehr gleichzeitig unter den Wurzeln und in der Kinderliste ihres echten Elternteils stehen.
- Bereich: `packages/shadow-objects/src/view/ComponentContext.ts:384-407` samt Spec; `docs/api-reference.md` und `CHANGELOG.md` des Kernpakets
- Hängt ab von: — · Korrektheitsfehler, also Test zuerst: der fehlschlagende Fall ruft die öffentliche `removeFromParent(component, parent)` mit einem `parent`, der nicht der Elternteil ist, und muss vor der Änderung rot sein. Über den bibliothekseigenen Weg (`ViewComponent.removeFromParent()`) ist der Zustand nicht erreichbar — der reicht immer den echten Elternteil durch —, der Test muss also am `ComponentContext` selbst ansetzen.
- Hash: a1bd120
- Abweichung vom Grobplan: Der Grobplan sagte, dieselbe Ursache trage die Lücke, die `getChildren()` und `#appendToOrdered()` in ihrer TSDoc beschreiben, und beide Beschreibungen verlören mit dem Fix ihren Gegenstand. Das hält nicht. Beide beschreiben eine Kinderliste, die eine uuid hält, hinter der kein Eintrag mehr steht, und die Ursache dafür ist `addToChildren(parent, child)`: es schreibt die Kinderliste, ohne dass der Elternzeiger des Kindes mitgeht, worauf `#deleteComponent()` über `entry.component.parent?.uuid` keine Liste findet, aus der es die uuid nähme. Das ist ein anderer Defekt als der hier, er ist ohne beide Methoden erreichbar, und `docs/api-reference.md:1055` hält ihn ausdrücklich als gewollt fest (»It only appends … Both are the job of `ViewComponent.addChild()`«). Zwei Spec-Fälle bauen mit genau diesem Primitiv absichtlich kaputte Listen: `survives removeSubTree on a children list that contains a cycle` (`ComponentContext.spec.ts:1040`) und `terminates the breadth-first walk when a children list points back at an ancestor` (`:1053`). Ihn zu schließen hieße, einen dokumentierten Vertrag zu ändern und diesen beiden Fällen ihr Mittel zu nehmen — das ist ein eigenes Paket und nicht die Sache dieses hier. Beide TSDoc-Blöcke bleiben unangetastet. Aus demselben Grund ist die Zusicherung des Ziels auf diese beiden Methoden begrenzt: ein von Hand geschriebenes `ctx.addToChildren(b, a)` an einer Komponente mit Elternteil stellt weiterhin beide Listen gleichzeitig, ohne dass eine der beiden Methoden daran beteiligt wäre.
- Modell: mittlere Stufe
- Effort: medium · Der Detailplan trägt die Erreichbarkeits-Analyse und nennt die beiden vorhandenen Spec-Fälle, die den tragenden Pfad halten; der Reviewer prüft damit ein aufgeschriebenes Argument, statt es zu rekonstruieren, und der Quelldiff bleibt unter dreißig Zeilen.
- Dateien: `packages/shadow-objects/src/view/ComponentContext.ts`, `packages/shadow-objects/src/view/ComponentContext.spec.ts`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/CHANGELOG.md`
- Vorgehen:
  1. **Zuerst rot sehen.** Beide neuen Fälle (Schritt 2 und 3) sind Regressionstests, werden vor der
     Korrektur geschrieben und rot gesehen. Das rote Log gehört in den Report.
  2. **Regressionstest A**, in `packages/shadow-objects/src/view/ComponentContext.spec.ts` in den
     vorhandenen Block `describe('removeFromParent', …)` (Zeile 448–462), hinter dessen einzigen Fall
     (endet Zeile 461):

     ```ts
     it('promotes nobody when the parent it is given is not the one holding the component', () => {
       ctx = makeContext();
       const parent = new ViewComponent('p', {context: ctx});
       const stranger = new ViewComponent('s', {context: ctx});
       const child = new ViewComponent('c', {context: ctx, parent});

       ctx.removeFromParent(child, stranger);

       expect(ctx.isRootComponent(child), 'a detachment that did not happen promotes nobody').toBe(false);
       expect(ctx.isChildOf(child, parent), 'and the child stays in the list that holds it').toBe(true);
     });
     ```

     Vor der Korrektur fällt die erste Zusicherung: der Anhang an die Wurzeln läuft, gleich was die
     Entnahme geantwortet hat, also steht `child` unter den Wurzeln **und** unter `parent`.
  3. **Regressionstest B**, ein neuer Block `describe('moveToRoot', …)` direkt hinter dem
     `removeFromParent`-Block (also hinter Zeile 462):

     ```ts
     describe('moveToRoot', () => {
       it('takes a component out of the list it stands in before making it a root', () => {
         ctx = makeContext();
         const parent = new ViewComponent('p', {context: ctx});
         const child = new ViewComponent('c', {context: ctx, parent});

         ctx.moveToRoot(child);

         expect(ctx.isRootComponent(child), 'the component is a root').toBe(true);
         expect(ctx.isChildOf(child, parent), 'and it stands in no children list any more').toBe(false);
         expect(ctx.getChildren(parent), 'the parent has lost it').toEqual([]);
       });
     });
     ```

     Vor der Korrektur fallen die zweite und die dritte Zusicherung: `moveToRoot()` nimmt die
     Komponente aus gar keiner Kinderliste heraus.
  4. **Die Korrektur** in `packages/shadow-objects/src/view/ComponentContext.ts`. Genau diese beiden
     Methoden, sonst nichts an der Datei:

     ```ts
     removeFromParent(component: ViewComponent, parent: ViewComponent) {
       const parentEntry = this.#entryOf(parent);
       if (parentEntry === undefined) return;

       // the child may already be gone (destroyComponent, removeSubTree) while the component
       // still holds on to its parent -- detaching it must not resurrect it as a root
       const childEntry = this.#entryOf(component);
       if (childEntry === undefined) return;

       // the promotion follows the detachment: a parent that does not hold this uuid gives nothing
       // up, and a component appended to the roots regardless would stand under the roots and in
       // the children list of the parent that really holds it at the same time
       if (parentEntry.children.delete(component.uuid)) {
         childEntry.changes.setParent(undefined);
         this.#appendToOrdered(childEntry.component, this.#rootComponents);
         this.#viewInstances = undefined;
       }
     }

     moveToRoot(component: ViewComponent) {
       const childEntry = this.#entryOf(component);
       if (childEntry === undefined) return;

       // the parent link names the list this uuid stands in, the way `changeOrder()` and
       // `#deleteComponent()` read it; leaving it there would put the component under the roots
       // and under a parent at once. The link itself is left alone -- clearing it is the business
       // of `ViewComponent.removeFromParent()`, which is where the two are written together
       const parentEntry = component.parent ? this.#entryOf(component.parent) : undefined;
       parentEntry?.children.delete(component.uuid);

       childEntry.changes.setParent(undefined);
       this.#appendToOrdered(childEntry.component, this.#rootComponents);
       this.#viewInstances = undefined;
     }
     ```

     Drei Dinge daran sind Absicht und werden nicht »aufgeräumt«:
     - **Der Anhang in `moveToRoot()` bleibt bedingungslos.** Er ist der Pfad, der eine Komponente
       auf ihrem Weg hinaus von einer Wurzel aus erreichbar hält, damit ihre eigene
       `DestroyEntities`-Änderung noch in einen Change Trail kommt — `#traverseLevelOrderBFS()` läuft
       von `#rootComponents` los. Siehe Schritt 8.
     - **Die Cache-Verwerfung `#viewInstances = undefined` wandert mit unter die Bedingung.** Sie
       gehört dorthin, wo sich eine Liste bewegt hat; in `moveToRoot()` steht sie heute sogar
       außerhalb des Wächters, sodass ein Aufruf mit einer Komponente, die dieser Kontext nicht
       hält, den Cache verwirft, ohne dass sich etwas geändert hätte.
     - `addToChildren()`, `changeOrder()`, `#deleteComponent()` und die TSDoc von `getChildren()`
       und `#appendToOrdered()` werden **nicht** angefasst. Warum, steht oben unter »Abweichung vom
       Grobplan«.
  5. `packages/shadow-objects/docs/api-reference.md`, die beiden Tabellenzeilen unter
     `#### Components and hierarchy` (Zeile 1056 und 1057). Der Ton der Nachbarzeilen gilt:
     - `removeFromParent(component, parent)` bekommt den Halbsatz, dass die Beförderung zur Wurzel
       der Entnahme folgt: ein `parent`, dessen Kinderliste `component` nicht nennt, löst nichts und
       befördert nichts. Der vorhandene Satz über den uuid-Nachfolger bleibt stehen.
     - `moveToRoot(component)` bekommt, dass die Komponente aus der Kinderliste genommen wird, die
       ihr eigener `parent`-Zeiger nennt, und deshalb nie zugleich unter den Wurzeln und unter einem
       Elternteil steht; der Zeiger selbst bleibt, wie er ist — ihn zu räumen ist Sache von
       `ViewComponent.removeFromParent()`. Der vorhandene Satz über den uuid-Nachfolger bleibt.
  6. `packages/shadow-objects/CHANGELOG.md`, unter `## [Unreleased]` → `### Bugfixes` (Zeile 321):
     ein Eintrag im Stil der Nachbarn, mit dem Präfix `**Bugfix (view):**` und in sich verständlich.
     Er nennt beide Methoden und den Zustand, den sie herstellen konnten — eine Komponente, die
     `isRootComponent()` und `isChildOf()` gleichzeitig bejaht. **Der Rückblick auf den Vorzustand
     ist hier erlaubt und erwünscht** (»used to …«), wie in jedem Nachbareintrag: die Konvention
     »kein Rückblick« gilt Code, Kommentaren und Doku, nicht dem CHANGELOG, dessen Aufgabe genau die
     Differenz ist.
     Der einleitende Absatz unter `## [Unreleased]` samt seiner Zählung (»Sixty-two changes«) bleibt
     unangetastet: er zählt Änderungen an zugesagtem Verhalten, und der Vorzustand hier war ein
     widersprüchlicher interner Zustand, keine Zusage.
  7. Nicht angefasst, und das ist geprüft, nicht vergessen:
     - `README.md` und `docs/cheat-sheet.md` nennen nur `ViewComponent.removeFromParent()`
       (`cheat-sheet.md:388`, `:400`), und dessen Verhalten ändert sich nicht: der
       `ViewComponent`-Weg reicht immer den echten Elternteil durch, und `moveToRoot()` ruft er nur,
       wenn kein Elternteil da ist — dort ist die neue Entnahme ein Nichts. Aus demselben Grund
       bleibt `docs/api-reference.md:830` (`#### removeFromParent()` des `ViewComponent`) stehen.
     - Kein `TODO` entsteht oder fällt, also kein `pnpm make:todo`. Keine Datei unter `src/` kommt
       hinzu oder fällt weg, also bleiben `src/distContract.files.txt` und
       `src/distContract.package.json`, wie sie sind.
     - `AGENTS.md` beschreibt dieses Methodenpaar nicht.
  8. Für den Reviewer, an dem dieses Paket wirklich hängt: die eine Frage ist, ob die jetzt bedingte
     Beförderung in `removeFromParent()` eine Komponente in gar keiner Liste zurücklassen kann. Sie
     wäre dann für `#traverseLevelOrderBFS()` unerreichbar, das von `#rootComponents` aus läuft, und
     ihre eigene `DestroyEntities`-Änderung käme nie in einen Change Trail — ein stiller Verlust.
     Zwei vorhandene Fälle halten diesen Pfad und müssen grün bleiben:
     `detaches the component it destroys` (`ComponentContext.spec.ts:589`) schickt ein Blatt über
     `ViewComponent.destroy()` → `#leaveContext()` → `removeFromParent(child, echterElternteil)`
     hinaus und prüft, dass die Destroy-Änderung ankommt; `skips a child uuid whose entry is gone
     instead of dereferencing it` (`:1066`) tut dasselbe für eine Komponente, die ohne Elternzeiger
     in einer Kinderliste steht und deshalb über `moveToRoot()` hinausgeht. Wird einer von beiden
     rot, ist die Bedingung falsch und nicht der Test.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
  · Zwischenrunden: `pnpm -F @spearwolf/shadow-objects exec vitest src/view --run` (geprüft, läuft: 7 Dateien, 403 Fälle, 0,8 s; die gezielte Auswahl lässt `src/distContract.spec.ts` und damit den Build-Zwang aus)
- Commit: `fix(view): a promotion to the root components follows the detachment that earns it`
- Ergebnis: 2 Runden · beide Methoden hängen nur noch an die Wurzeln an, was die Kinderliste
  hergegeben hat · Regressionstests `promotes nobody when the parent it is given is not the one
  holding the component` und `takes a component out of the list it stands in before making it a
  root` (beide vor dem Fix rot, Ausgabe in `paket-9a.impl-1.json`) · Review Runde 1: 1× wichtig —
  die neue `moveToRoot()`-Zeile in `docs/api-reference.md` versprach das Invariant über alle
  Kinderlisten statt über die eine, die der `parent`-Zeiger nennt; in Runde 1 der Fehlerkette auf
  die Reichweite des Codes verengt und die Grenze ausdrücklich benannt · Verify exit=0
  (`paket-9a.verify.log`, Turbo-Cache umgangen)
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `ComponentContext.removeFromParent(component, parent)` — befördert nur noch zur
  Wurzel, wenn `parent` die Komponente auch tatsächlich hergegeben hat; ein Aufruf mit einem
  fremden `parent` ist ein Nichts · `ComponentContext.moveToRoot(component)` — nimmt die Komponente
  vorher aus der Kinderliste, die ihr `parent`-Zeiger nennt, und verwirft den `#viewInstances`-Cache
  nur noch, wenn der Kontext die Komponente kennt. Signaturen unverändert.

**Nebenbefund aus Paket 7 · low · packages/shadow-objects/src/view/ComponentContext.ts:384-398 und :400-407** — Wurzelliste und Kinderliste können dieselbe Komponente zugleich führen

Beide Methoden hängen die Komponente bedingungslos an `#rootComponents` an, nehmen sie aber nur bedingt aus der Kinderliste heraus, in der sie steht. In `removeFromParent(component, parent)` steht der Abgang unter `parentEntry.children.delete(...)`, das Anhängen darunter nicht: wird die öffentliche Methode mit einem `parent` gerufen, der nicht der Elternteil ist, bleibt die uuid in der Kinderliste ihres echten Elternteils stehen **und** steht zusätzlich unter den Wurzeln — danach sagen `isRootComponent(child)` und `isChildOf(child, echterElternteil)` beide `true`. `moveToRoot()` hat dieselbe Form ohne jede Bedingung: es nimmt die Komponente aus gar keiner Kinderliste heraus. Über den bibliothekseigenen Weg (`ViewComponent.removeFromParent()`) ist es nicht erreichbar, denn der reicht immer den echten Elternteil durch und ruft `moveToRoot()` nur, wenn gar kein Elternteil da ist; über die öffentliche Fläche des `ComponentContext` schon. Vorbestehend: `git show f971e40:…` zeigt dieselbe Asymmetrie, nur mit `removeFrom()` statt `delete()`.

Empfehlung: Die Beförderung zur Wurzel unter die Entnahme legen. In `removeFromParent()` wandert der Anhang samt `changes.setParent(undefined)` in den Zweig, den `parentEntry.children.delete(component.uuid)` öffnet. In `moveToRoot()` kommt die Entnahme aus der Kinderliste dazu, die der `parent`-Zeiger der Komponente nennt — dieselbe Lesart, die `changeOrder()` und `#deleteComponent()` in dieser Klasse schon benutzen —, während der Anhang bedingungslos bleibt.

### [x] 9b. forwardCustomEvents: keine tote Arbeit, und zwei Zweige bekommen ihren Wächter
- Findings: drei Nebenbefunde aus Paket 8 (je info, vorbestehend, nicht im Audit) — im Volltext am Ende dieses Blocks
- Ziel: `originalDispatchEvent` wird erst berechnet, wenn der frühe Ausstieg bei leerem Filter nicht greift; die beiden `return false`-Zweige von `isSameFilter` für zwei Set-Filter mit verschiedenen Listen und die Sicherung gegen den Doppelpatch stehen unter je einem Fall einer eigenen Unit-Spec.
- Bereich: `packages/shadow-objects/src/elements/forwardCustomEvents.ts:17,19,38` und eine neue Spec daneben
- Hängt ab von: 8 (`ee35144` ist der einzige Commit, den die Datei hat)
- Hash: 5a9b9da
- Abgleich (Zug 0, 2026-08-31): Alle drei Fundstellen stehen unverändert da. Zeile 38 berechnet
  `originalDispatchEvent`, der frühe Ausstieg steht zwei Zeilen darunter auf 40. Zeile 17
  (`a.size !== b.size`) und Zeile 19 (`!b.has(type)`) sind die beiden gesuchten `return false`.
  Eine Unit-Spec zu diesem Modul gibt es nicht — `src/elements/` führt vier Spec-Dateien, keine
  davon fasst `forwardCustomEvents.ts` an. Auf der Integrationsseite decken
  `forward-custom-events.test.js` und `ent-element-events.test.js` (497 Zeilen, ganz gelesen) den
  Patch breit ab, bringen aber nie zwei verschieden befüllte Sets in `isSameFilter` zusammen: jeder
  Re-Append-Fall dort steht auf `true`/`true` (`:389`, `:445`) oder auf `false`/`Set{}` (`:115`).
- Abweichung vom Grobplan: Der Grobplan nannte als Weg »zwei `<shae-ent>`-Attributschreibungen mit
  verschiedenen Listen« und »ein `ViewComponent` mit eigener `dispatchEvent`-Eigenschaft«, also die
  Integrationssuite. Beides gehört in eine Unit-Spec, und zwar aus drei nachgesehenen Gründen:
  1. **Die wahre Seite der Ternäre ist über `<shae-ent>` gar nicht erreichbar.** Der Effekt
     `#forwardCustomEventsPatch` (`ShaeEntElement.ts:240-248`) gibt den Rücknahme-Aufruf zurück, und
     signalize fährt diese Aufräumung, bevor der Effekt erneut läuft — die eigene Eigenschaft ist
     also weg, wenn `forwardCustomEventsFrom` das zweite Mal gerufen wird. Der Fall
     `two attribute changes in a row do not stack the patch on top of itself`
     (`ent-element-events.test.js:358`) fährt genau diese Folge und landet deshalb auf der
     **falschen** Seite. Die wahre Seite existiert nur an der eigenen Fläche des Moduls.
  2. **Die beiden `isSameFilter`-Zweige sind über das Element nur mit einem Kunstgriff zu
     erreichen.** Sie greifen an `ShaeEntElement.ts:422` erst, wenn Attribut und Signal beim Connect
     zwei verschiedene Listen tragen — und die Reflexion (`#reflectForwardCustomEvents`, `:263-280`)
     hält beide in Gleichschritt: jede Signalschreibung schreibt das Attribut zurück, jede
     Attributänderung schreibt das Signal. Auseinander bringt sie nur ein Wert, den der
     String-Umweg nicht trägt — ein Filtereintrag mit einem Komma darin. Ein Test darauf hielte den
     Verlust des Umwegs fest, nicht den Vergleich.
  3. Die Integrationssuite läuft in echtem Chromium, weil Upgrade-Reihenfolge und DOM-Bubbling das
     verlangen (`ent-element-events.test.js:7-12`). Keiner der drei Befunde hat mit einem von beiden
     etwas zu tun.
  Also eine neue Datei `forwardCustomEvents.spec.ts` neben der Quelle, wie
  `propValueConverters.spec.ts` neben ihrer.
- Modell: mittlere Stufe
- Effort: low · Der Detailplan trägt den Zielzustand der Quelle und den Spec-Text im Wortlaut; zu
  entscheiden ist nichts mehr, und der Beleg (Schritt 4) ist eine benannte Handfolge.
- Dateien: `packages/shadow-objects/src/elements/forwardCustomEvents.ts` (geändert),
  `packages/shadow-objects/src/elements/forwardCustomEvents.spec.ts` (neu)
- Vorgehen:
  1. **Die neue Spec anlegen**, `packages/shadow-objects/src/elements/forwardCustomEvents.spec.ts`,
     mit genau diesem Inhalt:

     ```ts
     import {afterEach, describe, expect, it} from 'vitest';
     import {ComponentContext} from '../view/ComponentContext.js';
     import {ViewComponent} from '../view/ViewComponent.js';
     import {forwardCustomEventsFrom, isSameFilter} from './forwardCustomEvents.js';

     /**
      * Creates a fresh, uniquely named context per test so that the global namespace singleton
      * map cannot leak state between specs.
      */
     let ctxCounter = 0;

     function makeContext(): ComponentContext {
       return ComponentContext.get(`forwardCustomEvents.spec-${++ctxCounter}`);
     }

     describe('isSameFilter', () => {
       it('answers no for two lists of different length', () => {
         expect(isSameFilter(new Set(['a']), new Set(['a', 'b']))).toBe(false);
       });

       it('answers no for two lists of the same length naming different types', () => {
         expect(isSameFilter(new Set(['a']), new Set(['b']))).toBe(false);
       });

       it('answers yes for two separate Sets carrying the same types', () => {
         // the case the two above are worth nothing without: a comparison that always says no
         // would pass both of them, and the read-back on connect writes the signal on every
         // reconnect instead of leaving an unchanged filter alone
         expect(isSameFilter(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
       });
     });

     describe('forwardCustomEventsFrom', () => {
       let ctx: ComponentContext;

       afterEach(() => {
         ctx?.clear();
       });

       it('sets no patch and answers with nothing where the filter forwards nothing', () => {
         ctx = makeContext();
         const vc = new ViewComponent('nothing', {context: ctx});
         const target = document.createElement('div');

         expect(forwardCustomEventsFrom(vc, target, false)).toBeUndefined();
         expect(forwardCustomEventsFrom(vc, target, new Set())).toBeUndefined();
         expect(Object.hasOwn(vc, 'dispatchEvent'), 'and it leaves the component as it found it').toBe(false);
       });

       it('carries one event per dispatch when a second patch lands on a component that already has one', () => {
         ctx = makeContext();
         const vc = new ViewComponent('twice', {context: ctx});
         const target = document.createElement('div');
         const seen: unknown[] = [];
         target.addEventListener('foo', (e) => seen.push((e as CustomEvent).detail));

         forwardCustomEventsFrom(vc, target, true);
         const undo = forwardCustomEventsFrom(vc, target, true);

         vc.dispatchEvent('foo', {n: 1}, false);

         expect(seen, 'the second patch calls through to the prototype, not to the first patch').toEqual([{n: 1}]);

         undo?.();
         expect(Object.hasOwn(vc, 'dispatchEvent'), 'and taking it back leaves nothing behind').toBe(false);
       });
     });
     ```

     Der Lauf ist grün — das ist der Ausgangspunkt, nicht das Ergebnis. Was die vier Fälle wert
     sind, entscheidet Schritt 4.
  2. **Die tote Arbeit aus dem leeren Pfad nehmen**, in
     `packages/shadow-objects/src/elements/forwardCustomEvents.ts`. Die heutigen Zeilen 37 und 38
     (Kommentar und `const originalDispatchEvent = …`) wandern unter den frühen Ausstieg, und der
     Kommentar sagt dabei, was die Ternäre entscheidet. Der Rumpf beginnt danach so:

     ```ts
     ): (() => void) | undefined => {
       if (!filter || isEmptyFilter(filter)) return;

       // the patch goes on the instance, so a component that already carries one shadows the very
       // method the new patch has to call through to: that original sits on the prototype
       const originalDispatchEvent = Object.hasOwn(vc, 'dispatchEvent') ? Object.getPrototypeOf(vc).dispatchEvent : vc.dispatchEvent;

       const allowedTypes = filter instanceof Set ? filter : undefined;
     ```

     Sonst nichts an der Datei. Die Zeile bleibt bei 128 Zeichen und damit unter `lineWidth: 130`.
  3. `pnpm -F @spearwolf/shadow-objects exec vitest src/elements --run` — geprüft, läuft in 0,6 s
     über vier Dateien und 90 Fälle; mit der neuen Spec sind es fünf Dateien.
  4. **Der Beleg.** Kein Befund dieses Pakets ist ein Korrektheitsfehler, es gibt also keinen
     Vorzustand, gegen den ein Regressionstest rot liefe. Was ein Wächter hier belegen muss, ist,
     dass er den Zweig wirklich hält — und das zeigt sich, indem der Zweig kurz fällt. Drei Griffe,
     jeder für sich, jeder mit anschließender Rücknahme; die Ausgabe jedes roten Laufs gehört in
     den Report:
     - `if (a.size !== b.size) return false;` (Zeile 17) herausnehmen →
       `answers no for two lists of different length` fällt. Zeile wieder herstellen.
     - `if (!b.has(type)) return false;` (Zeile 19) herausnehmen →
       `answers no for two lists of the same length naming different types` fällt. Wieder herstellen.
     - In der Ternäre `Object.hasOwn(vc, 'dispatchEvent') ? Object.getPrototypeOf(vc).dispatchEvent : vc.dispatchEvent`
       durch `vc.dispatchEvent` ersetzen → `carries one event per dispatch when a second patch lands
       on a component that already has one` fällt mit zwei Ereignissen statt einem. Wieder herstellen.
       (In Zug 0 an der gebauten Fassung nachgemessen: mit Wächter `[{"n":1}]`, ohne
       `[{"n":1},{"n":1}]`.)
     Nach dem dritten Griff steht die Datei wieder auf dem Stand aus Schritt 2, und der Lauf aus
     Schritt 3 ist wieder grün. Das ist zu prüfen, bevor es weitergeht — `git diff` zeigt dann genau
     die Verschiebung aus Schritt 2 und sonst nichts an der Quelle.
  5. Nicht angefasst, und das ist geprüft, nicht vergessen:
     - **Die Kommentarzeile 77** (102 Zeichen, die längste der Datei) bleibt, wie sie ist. Sie
       gehört Paket 10 als Eintrag (e); sie hier mitzunehmen nähme dem Paket seinen Gegenstand.
     - `packages/shadow-objects-testing/test/forward-custom-events.test.js` und
       `ent-element-events.test.js` bleiben unverändert. Sie decken den Patch über das Element ab,
       und an diesem Verhalten ändert sich nichts.
     - Kein CHANGELOG-Eintrag. Das Modul steht nicht in `src/index.ts` und in keiner Doku;
       `docs/api-reference.md` nennt nur das Signal `forwardCustomEvents$` am Element (`:2066-2082`),
       das unberührt bleibt. Die Verschiebung aus Schritt 2 ändert kein zugesagtes Verhalten, und
       eine neue Spec ist kein Changelog-Stoff. Aus demselben Grund keine Änderung an `README.md`,
       `docs/` oder `AGENTS.md`.
     - Eine Spec-Datei fällt aus dem Lib-Transpile heraus (`build.mjs:48`), `dist/` bekommt sie also
       nicht; `src/distContract.files.txt` und `src/distContract.package.json` bleiben, wie sie sind.
     - Kein `TODO` entsteht oder fällt, also kein `pnpm make:todo`.
  6. Für den Reviewer: die eine Frage ist, ob die Verschiebung aus Schritt 2 etwas beobachtbar
     ändert. `Object.hasOwn` und `Object.getPrototypeOf` haben keine Nebenwirkung, und
     `ViewComponent.dispatchEvent` ist eine gewöhnliche Prototyp-Methode (`ViewComponent.ts:303`),
     kein Getter — auf dem Pfad, der jetzt vorher zurückkehrt, wurde der Wert nie benutzt. Die
     zweite Frage ist, ob die vier Fälle die drei Fundstellen wirklich treffen; Schritt 4 ist die
     Antwort darauf und gehört in den Report.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
  · Zwischenrunden: `pnpm -F @spearwolf/shadow-objects exec vitest src/elements --run`
- Commit: `perf(elements): the original dispatch is looked up only when a patch follows, and the filter comparison and the patch guard get their specs`
- Ergebnis: 1 Runde · alle drei Nebenbefunde erledigt — die Berechnung des ursprünglichen
  Dispatch steht unter dem frühen Ausstieg, und die beiden `isSameFilter`-Zweige wie die Sicherung
  gegen den Doppelpatch stehen unter je einem Fall der neuen `forwardCustomEvents.spec.ts` · kein
  Regressionstest, weil kein Befund ein Korrektheitsfehler war; an seiner Stelle drei
  Mutationsgriffe, jeder mit dem gefallenen Fall belegt und zurückgenommen (Reviewer hat alle drei
  eigenhändig nachgefahren) · Review ohne Befund
- Nebenbefunde: keine
- Folgen: keine

**Nebenbefund aus Paket 8 · info · packages/shadow-objects/src/elements/forwardCustomEvents.ts:38** — `originalDispatchEvent` wird vor dem frühen Ausstieg berechnet

`originalDispatchEvent` wird berechnet, bevor der frühe Ausstieg bei leerem Filter greift: ein `Object.hasOwn` und je nachdem ein `getPrototypeOf` laufen für nichts, sobald `forward-custom-events` ohne Wert dasteht. Folgenlos, aber tote Arbeit auf einem Pfad, den jede `<shae-ent>` ohne Weiterleitung nimmt. Vorbestehend — die Zeilen sind aus `ShaeEntElement.ts:315-317` wörtlich mitgereist und stehen seit der Lauf-Basis `f971e40` unverändert.

Empfehlung: Die Berechnung unter den frühen Ausstieg legen.

**Nebenbefund aus Paket 8 · info · packages/shadow-objects/src/elements/forwardCustomEvents.ts:17, :19** — die beiden `return false` von `isSameFilter` für zwei verschieden befüllte Sets sind ungedeckt

Die beiden Rückgabezweige von `isSameFilter` für »zwei Set-Filter mit unterschiedlichen Listen« werden von keiner Suite erreicht, Unit wie Integration je null Treffer. Der ganze Pfad »beim Connect steht im Attribut ein anderer Filter als im Signal« ist damit ungedeckt. Vorbestehend, wörtlich aus `ShaeEntElement.ts:115-132` mitgereist.

Empfehlung: Beide Zweige unter einen Fall stellen.

**Nebenbefund aus Paket 8 · info · packages/shadow-objects/src/elements/forwardCustomEvents.ts:38, wahre Seite der Ternäre** — die Sicherung gegen den Doppelpatch ist unbelegt

Ein `ViewComponent`, der bereits eine eigene `dispatchEvent`-Eigenschaft trägt, kommt in keinem Test vor. Die Sicherung gegen den Doppelpatch — gepatcht wird die Instanz, nicht der Prototyp — ist damit unbelegt, und genau sie trägt den Fall, dass der Effekt zweimal läuft. Vorbestehend, wörtlich aus `ShaeEntElement.ts:315` mitgereist.

Empfehlung: Einen Fall schreiben, der zweimal patcht und prüft, dass die Weiterleitung ein Ereignis je Dispatch trägt.

### [x] 9c. Nachlese aus dem Lebenszyklus-Umbau
- Findings: zwei Nebenbefunde aus Paket 9 (low und info, beide vorbestehend, nicht im Audit) — im Volltext am Ende dieses Blocks
- Ziel: Ein `<shae-prop>`, das über `destroy()` zerstört wurde und noch im Baum hängt, holt sich seine Registrierungen nicht zurück; und der Aufruf von `syncShadowObjects` im Rumpf der gleichnamigen Methode zeigt sichtbar dorthin, wohin er zeigt.
- Bereich: `packages/shadow-objects/src/elements/ShaePropElement.ts:117-121`, `elements/ShaeElement.ts:33,209,219` samt Specs
- Hängt ab von: 9 (die Basis, in der der Teardown-Vertrag jetzt steht) · Zwei getrennte Arbeiten in einem Commit, in dieser Reihenfolge. **Zuerst der Korrektheitsfehler, Test zuerst:** der `MicrotaskGate` hinter `#hostLookup` wird in `teardown()` nicht abbestellt, und das Gate kennt kein Abbestellen — sein Callback prüft `isConnected`, nicht `isDestroyed`. Ein von Hand zerstörtes, aber noch verbundenes Element läuft deshalb durch: eine vor `destroy()` gebuchte Runde ruft `#findEntNode()`, das `entNode$` schreibt und über `#listenForHostChanges()` den Re-Request-Listener wieder anhängt, den `teardown()` gerade abgenommen hat. Der fehlschlagende Test muss genau diesen Weg gehen — `destroy()` am verbundenen Element, dann die gebuchte Mikrotask ablaufen lassen — und vor der Änderung rot sein. Ob die Flagge im Gate-Callback geprüft oder das Gate abbestellbar gemacht wird, entscheidet der Detailplan; der Vertrag »Flagge vor der Arbeit« aus der neuen Basis ist der Maßstab. **Danach die Beschattung:** die modulweite Funktion `syncShadowObjects` und die gleichnamige Methode teilen sich den Namen, der Aufruf im Methodenrumpf löst auf die Modulfunktion auf. Das ist heute Absicht und morgen eine Falle — ein `this.` davor, und der Aufruf zeigt woandershin, ohne dass ein Test es merkt. Eine Umbenennung, kein Verhaltenswechsel.
- Hash: f29f3dc
- Abgleich (Zug 0, 2026-08-31): Beide Sachverhalte stehen unverändert da, und die Zeilennummern
  stimmen bis auf eine. `ShaePropElement.ts:117-121` ist wörtlich der Gate-Callback mit dem
  einen `if (this.isConnected)`; nur `#listenForHostChanges` ist von `:428-433` auf `:434-443`
  gewandert (der Grobplan-Text nennt die alte Nummer, gesucht wird am Symbol). Die Kette ist
  nachgesehen und geschlossen: `#onReRequestHost` (`:430-432`) ist der einzige Bucher des Gates,
  `#findEntNode` (`:382-409`) endet auf `#listenForHostChanges()`, und dieses hängt den Listener
  an `entNode$.value ?? ownerDocument` an, sobald `#reRequestHostTarget` nicht mehr darauf steht —
  was `teardown()` über `#stopListeningForHostChanges()` gerade hergestellt hat. In `ShaeElement.ts`
  stehen beide Namen auf `:33` und `:208`; der Aufruf im Rumpf ist `:209`, und **eine zweite
  Aufrufstelle kommt hinzu**, die der Grobplan nicht nennt: `syncShadowObjectsOf()` ruft dieselbe
  Modulfunktion auf `:219`. Eine Umbenennung fasst beide an.
- Was nachgesehen und *nicht* aufgenommen wurde: (a) Der Zwilling des Gates,
  `ShaeEntElement.ts:136` (`#reSubscribe`), hat die Lücke nicht — sein Callback schreibt nur den
  Zähler `#reSubscribe$`, und die beiden Effekte, die ihn lesen (`:223`, `:244`), sind nach dem
  Teardown zerstört; gebucht wird er aus einem Effekt (`:232`), der dann ebenfalls weg ist. Kein
  Abonnement kehrt zurück, also kein Symptom derselben Ursache und kein Paket. (b)
  `#disconnectFromEntNode` (`:450-456`) bucht ebenfalls eine Mikrotask, prüft aber
  `!this.isConnected` — für ein von Hand zerstörtes, verbundenes Element läuft sie leer. Korrekt
  wie sie ist.
- Der Weg, und warum dieser: Geprüft wird die Flagge im Gate-Callback; das Gate bleibt, wie es ist.
  `MicrotaskGate` sagt in seiner eigenen TSDoc, dass eine Buchung, die sich abbestellen lässt,
  `DeferredTeardown` heißt — das Gate ist bewusst die andere Hälfte dieses Paars, und es
  abbestellbar zu machen hieße, den Unterschied zwischen beiden einzuebnen, für einen einzigen
  Aufrufer. Der Vertrag der neuen Basis trägt die andere Richtung ohnehin: `destroy()` setzt
  `#destroyed` **vor** `teardown()`, also liest jede später fällige Runde den Zustand, in dem das
  Element wirklich ist. Beide Terme bleiben stehen und beantworten zwei verschiedene Fragen —
  `isConnected` trennt »im Baum« von »auf dem Weg hinaus«, `isDestroyed` trennt »hört zu« von
  »von Hand beendet und steht noch da«.
- Doku: `cheat-sheet.md:274-275` sagt die Zusage bereits, gegen die der Code verstößt — »`destroy()`
  on an element that is still in the document also stops it answering … and it stays released until
  it has left and come back«, und `:309` überträgt sie auf `<shae-prop>`. Die Doku beschreibt also
  den Sollzustand; der Fix bringt den Code zu ihr, nicht umgekehrt. **`docs/` und `README.md`
  bleiben deshalb unangetastet**, und die öffentliche Fläche bewegt sich nicht: kein neues Symbol,
  keine geänderte Signatur, die Modulfunktion ist nicht exportiert.
- Modell: mittlere Stufe
- Effort: medium · Der Detailplan trägt Spec-Text, Quelltext-Zielzustand und CHANGELOG-Bullet im
  Wortlaut; für den Implementierer allein wäre das `low`. Der Reviewer hebt es: die einzige Frage
  dieses Pakets ist, ob der Test aus dem *richtigen* Grund rot war. Ein Fall, der die gebuchte
  Mikrotask nicht ablaufen lässt oder die Zusicherung neben den Weg setzt, ist grün ohne Aussage,
  und das findet nur, wer den Zeitablauf mitdenkt.
- Dateien: `packages/shadow-objects/src/elements/ShaePropElement.ts` (geändert),
  `packages/shadow-objects/src/elements/elementReachability.spec.ts` (geändert, ein Fall dazu),
  `packages/shadow-objects/src/elements/ShaeElement.ts` (geändert),
  `packages/shadow-objects/CHANGELOG.md` (geändert, ein Bullet dazu)
- Vorgehen:
  1. **Den Regressionstest schreiben und rot sehen.** Er kommt in
     `packages/shadow-objects/src/elements/elementReachability.spec.ts`, direkt hinter den Fall
     `takes <shae-ent> and <shae-prop> back after a teardown, while <shae-worker> stays down`.
     Diese Datei und keine neue: dort steht der Lebenszyklus von `<shae-prop>` samt `destroy()`
     und `isDestroyed`, sie hat das `afterEach`, das das Dokument leert, und der Schaden ist
     wörtlich eine Erreichbarkeitsfrage — ein zerstörtes Element, das wieder am Host hängt, ist
     von dort aus erreichbar. `ReRequestEntHostEventName` zur bestehenden Importliste aus
     `./constants.js` hinzufügen. Der Fall im Wortlaut:

     ```ts
     it('leaves a destroyed but still connected <shae-prop> alone when a booked host lookup comes due', async () => {
       const ent = document.createElement(SHAE_ENT) as ShaeEntElement;
       const prop = document.createElement(SHAE_PROP) as ShaePropElement;
       prop.setAttribute('name', 'foo');

       ent.append(prop);
       document.body.append(ent);

       expect(prop.entNode, 'the element found its host on connect').toBe(ent);

       // books a round on the gate: the re-request channel reaches this element over a listener
       // that sits on the host for as long as the host answers for it
       ent.dispatchEvent(new CustomEvent(ReRequestEntHostEventName, {detail: {requester: ent}}));

       // destroyed by hand while it is still in the document — the case `isConnected` alone does
       // not separate. The write straight after says what the teardown left behind: no host
       prop.destroy();
       prop.entNode = undefined;

       await new Promise((resolve) => setTimeout(resolve, 0));

       expect(prop.entNode, 'the round came due on a destroyed element and did nothing').toBeUndefined();

       // and it took no registration back on the way: a second re-request would only reach this
       // element over a listener the teardown took off, and a lookup that ran would have put one back
       ent.dispatchEvent(new CustomEvent(ReRequestEntHostEventName, {detail: {requester: ent}}));
       await new Promise((resolve) => setTimeout(resolve, 0));

       expect(prop.entNode, 'and it is still listening on nothing').toBeUndefined();
     });
     ```

     Der rote Lauf gehört in den Report, mit der Ausgabe:
     `pnpm -F @spearwolf/shadow-objects exec vitest --run src/elements/elementReachability.spec.ts`.
     Erwartet wird, dass die **erste** der drei Zusicherungen nach dem `await` bricht: ohne die
     Änderung läuft `#findEntNode()`, schreibt `entNode$` zurück auf `ent` und hängt den Listener
     wieder an. Bricht sie nicht, ist der Fall am Weg vorbei und nicht der Befund geheilt.
  2. **Den Gate-Callback in `ShaePropElement.ts:117-121` auf diesen Zielzustand bringen**, samt
     Kommentar — die Nachbarn dieser Datei kommentieren jede Bedingung dieser Art:

     ```ts
     // Two terms, and they answer two different questions. `isConnected` separates an element in
     // the tree from one on its way out: a round booked before the departure has nothing left to
     // say about a position the element no longer holds. `isDestroyed` separates one that is
     // listening from one that was ended by hand and is still standing where it was — a lookup
     // running there would write `entNode$` and register the re-request listener again that the
     // teardown just took off, and the element would be listening after it let go of everything.
     // The flag is up before `teardown()` runs, so a round that comes due afterwards reads the
     // state the element is actually in.
     //
     // The test stands here and not in the gate: a `MicrotaskGate` has no way to call a booking
     // off, and that is the whole of what tells it apart from `DeferredTeardown`.
     readonly #hostLookup = new MicrotaskGate(() => {
       if (this.isConnected && !this.isDestroyed) {
         this.#findEntNode();
       }
     });
     ```

     Sonst nichts an dieser Datei: `MicrotaskGate` bleibt unverändert, `teardown()` bleibt
     unverändert, `#findEntNode` bleibt unverändert.
  3. **Den Test grün sehen**, mit demselben Kommando aus Schritt 1. Ausgabe in den Report.
  4. **Die Beschattung in `ShaeElement.ts` auflösen.** Die modulweite Funktion auf `:33` heißt
     `collectForSync`, die Methode `syncShadowObjects()` behält ihren Namen:

     ```ts
     const collectForSync = (ns: NamespaceType) => {
       syncCollector.add(ns);
     };
     ```

     Beide Aufrufstellen ziehen mit — `:209` im Rumpf von `syncShadowObjects()` und `:219` im
     Rumpf von `syncShadowObjectsOf()`. Der Name bindet an `syncCollector` daneben und sagt, was
     die Zeile tut; ein Kommentar darüber ist nicht nötig und wird nicht gesetzt. Die Funktion
     wird **nicht** ersatzlos gestrichen — sie benennt eine Absicht, die `syncCollector.add(ns)`
     nur als Mechanik ausdrückt, und der freigegebene Weg ist die Umbenennung. Die TSDoc der
     beiden Methoden bleibt unverändert, die zwei Bindestriche auf `:201` eingeschlossen: die
     gehören Paket 10.
  5. **Ein Bullet ans Ende des Abschnitts `### Bugfixes` im `## [Unreleased]`-Block von
     `packages/shadow-objects/CHANGELOG.md`**, im Wortlaut:

     ```markdown
     - **Bugfix (elements):** a `<shae-prop>` that was destroyed by hand while it is still in the document stays released. A re-request of the host arriving before the `destroy()` books a lookup for the next microtask, and that lookup used to run on the destroyed element: it wrote `entNode` and registered the re-request listener again on the host or on the document, so an element that had just let go of everything was listening once more. The lookup now asks whether the element has been torn down, alongside the question whether it is still in the tree. `cheat-sheet.md` already states the rule this restores — a `destroy()` on a connected element leaves it released until it has left and come back.
     ```

     **Nur dieses eine Bullet.** Der Vorspann des `[Unreleased]`-Abschnitts wird nicht angefasst,
     die Zahl »Sixty-two changes reach existing consumers« bleibt stehen: der Fix bringt den Code
     zu einer Zusage, die die Doku schon macht, und bricht für niemanden etwas. Die Umbenennung aus
     Schritt 4 bekommt **keinen** Eintrag — sie bewegt kein Export, keine Deklaration, keine Datei
     unter `dist/` und kein Verhalten.
  6. **Was ausdrücklich nicht angefasst wird:** `docs/`, `README.md`, `AGENTS.md` (die
     Architektur bewegt sich nicht), `src/distContract.files.txt` und
     `src/distContract.package.json` (Spec-Dateien fallen nicht in den Build, es kommt keine
     Quelldatei hinzu), das Wurzel-`CHANGELOG.md`, `TODO.md`.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test` · Zwischenrunden reichen mit
  `pnpm -F @spearwolf/shadow-objects exec vitest --run src/elements`
- Commit: `fix(elements): a destroyed property element stays released, and the module-wide sync has a name of its own`
- Ergebnis: 1 Runde · beide Befunde behoben · Regressionstest `leaves a destroyed but still
  connected <shae-prop> alone when a booked host lookup comes due` in
  `elements/elementReachability.spec.ts` (vor dem Fix rot, an der ersten Zusicherung nach dem
  `await`: `entNode` stand wieder auf dem Host) · der Gate-Callback in `ShaePropElement.ts` fragt
  jetzt `isConnected && !isDestroyed`, die modulweite Funktion in `ShaeElement.ts` heißt
  `collectForSync` und beide Aufrufstellen ziehen mit · Review ohne Befund, die Erfüllung am
  zurückgenommenen Fix nachgestellt · Verify erzwungen gegen den Turbo-Cache gefahren: 9 Tasks,
  0 gecached, exit=0 · eine Abweichung vom Detailplan: im Testfall wird erst `ent` ins Dokument
  gehängt und dann `prop` daran, weil happy-dom `connectedCallback` bei einem in einem Zug
  verbundenen Teilbaum am Kind vor dem Elternteil feuert — der geprüfte Weg bleibt derselbe
- Nebenbefunde: keine
- Folgen: keine

**Nebenbefund aus Paket 9 · low · `packages/shadow-objects/src/elements/ShaePropElement.ts:117-121`** — der `MicrotaskGate` hinter `#hostLookup` wird in `teardown()` nicht abbestellt

Der `MicrotaskGate` hinter `#hostLookup` wird in `teardown()` nicht abbestellt, und `MicrotaskGate` kennt kein Abbestellen: sein Callback prüft nur `isConnected`, nicht `isDestroyed`. Für ein Element, das den Baum verlässt, greift der `isConnected`-Test; ein von Hand über `destroy()` zerstörtes, aber noch verbundenes `<shae-prop>` läuft dagegen durch — eine vor `destroy()` gebuchte Runde ruft `#findEntNode()`, das `entNode$` schreibt und über `#listenForHostChanges()` den Re-Request-Listener wieder anhängt, den `teardown()` gerade abgenommen hat. Damit hält ein zerstörtes Element wieder eine Registrierung am Host oder am Dokument. Vorbestehend (`git show f971e40:…` zeigt dieselbe Konstruktion in Zeile 130).

Empfehlung: Den Gate-Callback fragen lassen, ob das Element zerstört ist, und den Weg über einen Fall festhalten, der vor der Änderung rot ist.

**Nebenbefund aus Paket 9 · info · `packages/shadow-objects/src/elements/ShaeElement.ts:33` gegen `:208`** — die modulweite Funktion und die Methode teilen sich den Namen

Die modulweite Funktion `syncShadowObjects` und die gleichnamige Methode teilen sich den Namen; im Rumpf der Methode löst der Aufruf auf die Modulfunktion auf. Das funktioniert und liest sich als Absicht, ist aber die Sorte Beschattung, die ein späterer Umbau still umdreht — ein `this.` davor oder ein umbenanntes Modulsymbol, und der Aufruf zeigt woandershin, ohne dass ein Test es merkt. Vorbestehend (`git show f971e40:…` zeigt dieselben beiden Namen in Zeile 34 und 298).

Empfehlung: Die Modulfunktion umbenennen, sodass im Rumpf der Methode steht, wohin der Aufruf geht.

### [x] 10. Doku und Kommentare, die etwas anderes sagen als der Code
- Findings: Nebenbefund aus Paket 4 (info), dazu drei Nebenbefunde aus Paket 5 (je info, Nutzerentscheidung vom 2026-08-31) — alle vorbestehend und nicht im Audit:
  (a) `packages/shadow-objects-testing/test/worker-element-attributes.test.js:29-30` beschreibt den geteilten `enable`-Schalter als `location.host.startsWith('localhost')`, während der Code `location.hostname` gegen eine exakte Menge prüft und `utils/ConsoleLogger.location.spec.ts` mit einem eigenen Fall festhält, dass ein Host, der bloß mit »localhost« beginnt, gerade nicht zählt — der Kommentar beschreibt ein Verhalten, gegen das ein Test läuft;
  (b) `packages/shadow-objects/CHANGELOG.md:281` nennt die globale Map `__shadowEntsContexts`, während `:254` im selben unveröffentlichten Abschnitt die Umbenennung auf `__shadowObjectsContexts` protokolliert — eine Release-Notiz, zwei Namen für dasselbe Ding;
  (c) `packages/shadow-objects/CHANGELOG.md:219` trägt zwischen dem vierten und fünften Bullet unter »Breaking Changes« eine Leerzeile, die Markdown die Liste ab dort als »loose« lesen lässt.
  Dazu zwei Nebenbefunde aus Paket 9 (je info, Nutzerentscheidung vom 2026-08-31):
  (d) `elements/ShaeElement.ts:201` setzt in einer TSDoc zwei Bindestriche (»`sync()` -- the unconfirmed path«), wo dieselbe Datei sonst durchgehend den Gedankenstrich schreibt; die Stelle wird am Wortlaut gesucht und nicht an der Nummer. **Zug 0 korrigiert die Zuordnung:** der Absatz gehört zu `syncShadowObjects()` (Z. 208), nicht zu `syncShadowObjectsOf()` (Z. 218) — Paket 9 hat die falsche der beiden Methoden genannt, der zitierte Wortlaut ist eindeutig und steht unverändert auf Z. 201;
  (e) `elements/forwardCustomEvents.ts:77` trägt eine Kommentarzeile, die aus dem Zeilenmaß der Datei fällt — die gesuchte Zeile ist die zweite des Zweizeilers im Rücknahme-Aufruf (»the prototype: deleting the own property …«, 102 Zeichen); Paket 9b verschiebt Zeilen darüber, also wird sie am Wortlaut gesucht und nicht an der Nummer. Steht heute auf Z. 78.
  In Zug 0 an denselben Stellen dazugefunden — beide vorbestehend, je info, ohne eigene Nutzerentscheidung, weil sie die Ursache mit den Einträgen darüber teilen und in Dateien stehen, die dieses Paket ohnehin aufmacht:
  (f) `view/ComponentChanges.ts:47` trägt einen vierten toten Link, `{@link ComponentContext}`, den der Befund aus Paket 4 nicht mitgezählt hat — derselbe TSDoc-Absatz, dieselbe Ursache;
  (g) `view/ComponentChanges.ts:47` (113 Zeichen) und `:292` (106) sind die beiden einzigen Kommentarzeilen der Datei über 100 — dieselbe Ursache wie (e). Z. 47 wird für (f) ohnehin angefasst, Z. 292 ist eine Zeile daneben.
- Ziel: Jeder Kommentar dieses Pakets sagt, was der Code tut, jeder `{@link}` zeigt auf ein Symbol, das sein Modul auch benennen kann, und der unveröffentlichte CHANGELOG-Abschnitt führt ein Ding unter einem Namen.
- Bereich: `packages/shadow-objects/src/view/ComponentChanges.ts`, `src/elements/ShaeElement.ts`, `src/elements/forwardCustomEvents.ts`, `packages/shadow-objects/CHANGELOG.md`, `packages/shadow-objects-testing/test/worker-element-attributes.test.js` — ausschließlich Kommentare und Markdown, kein Produktivcode
- Hängt ab von: — · letztes Paket des Laufs, nichts hängt an ihm
- Hash: 1bd1525
- Modell: mittlere Stufe · sechs benannte Stellen mit vorgegebenem Ergebnis, aber vier davon schreiben englische Prosa in einer Codebasis mit strengen Wortregeln; die günstigste Stufe tauscht `{@link X}` mechanisch gegen `` `X` `` und lässt den Satz stolpern
- Dateien: `packages/shadow-objects/src/view/ComponentChanges.ts`, `packages/shadow-objects/src/elements/ShaeElement.ts`, `packages/shadow-objects/src/elements/forwardCustomEvents.ts`, `packages/shadow-objects/CHANGELOG.md`, `packages/shadow-objects-testing/test/worker-element-attributes.test.js`
- Vorgehen:
  1. `view/ComponentChanges.ts` — die vier `{@link}`, die dieses Modul nicht auflösen kann, werden zu Code-Spans: `{@link ViewComponent}` (Z. 45) → `` `ViewComponent` ``, `{@link ComponentContext.addComponent}` (Z. 46) → `` `ComponentContext.addComponent` ``, `{@link ComponentContext}` (Z. 47) → `` `ComponentContext` ``, `{@link ComponentContext.reCreateChanges}` (Z. 129) → `` `ComponentContext.reCreateChanges` ``. Der Satzbau bleibt lesbar: wo der Link mitten im Satz stand, steht jetzt der Code-Span an derselben Stelle, kein Wort mehr und keins weniger. Kein Import wird dafür angelegt — `view/ComponentContext.ts:7` importiert `ComponentChanges`, ein Rückimport wäre ein Zyklus im Typgraphen, und ein Import, der nur einen Doc-Kommentar bedient, ist der falsche Preis.
  2. Alle übrigen `{@link}` des Moduls bleiben stehen. In Zug 0 geprüft: `ComponentPropertiesType` (Z. 20) kommt aus dem Typ-Import in Z. 2-13, `PropertyWithoutValue` (Z. 295) ist in Z. 29 lokal deklariert, und die zwölf auf `ComponentChanges.*` zeigen auf die eigene Klasse (Z. 51). Sie alle lösen auf.
  3. Denselben TSDoc-Absatz (Z. 44-48) neu umbrechen, sodass keine Zeile über 100 Zeichen kommt — Z. 47 steht heute auf 113 und bleibt auch nach dem kürzeren Code-Span darüber. Ebenso Z. 292 (106 Zeichen), die einzige weitere Kommentarzeile der Datei über dem Maß; ihre beiden `{@link ComponentChanges.*}` bleiben unverändert, nur der Umbruch ändert sich.
  4. `elements/ShaeElement.ts:201` — aus »`sync()` -- the unconfirmed« wird »`sync()` — the unconfirmed«. Am Wortlaut suchen, nicht an der Nummer. Nur diese eine Zeile: sie ist der einzige doppelte Bindestrich der Datei gegen acht Gedankenstriche, und `src/elements/` schreibt sonst ausnahmslos den Gedankenstrich (`ShaeEntElement.ts` 36:0, `ShaePropElement.ts` 23:0, `ShaeLifecycleElement.ts` 10:0, `forwardCustomEvents.ts` 2:0). Außerhalb von `src/elements/` ist der doppelte Bindestrich die häufigere Form — rund 180 Stellen quer durch `view/`, `in-the-dark/`, `worker/` und `utils/` —, dort gibt es nichts anzugleichen und es wird nichts angeglichen.
  5. `elements/forwardCustomEvents.ts` — den Kommentar-Zweizeiler im Rücknahme-Aufruf (heute Z. 77-78, gesucht am Text »the prototype: deleting the own property«) so neu umbrechen, dass keine seiner Zeilen über 100 Zeichen kommt; Z. 78 steht auf 102. Der Wortlaut bleibt unverändert, nur der Umbruch wandert. Die Codezeilen 5 (107 Zeichen) und 41 (128) bleiben unangetastet — der Befund gilt Kommentaren, und `biome.json` steht auf `lineWidth: 130`, ist also grün.
  6. `CHANGELOG.md:283` — `__shadowEntsContexts` wird zu `__shadowObjectsContexts`. Z. 256 desselben `[Unreleased]`-Abschnitts protokolliert die Umbenennung, und im Quelltext steht kein alter Name mehr (in Zug 0 über `src/` geprüft: null Treffer für `__shadowEntsContexts`, `SHADOW_ENTS_BUNDLE_LOADED` und `ShadowEntsGlobalNS`). Z. 256 selbst bleibt unverändert — sie muss beide Namen nennen, das ist ihr Inhalt. Weitere Vorkommen der alten Namen gibt es im Abschnitt nicht; in Zug 0 über Z. 10-522 gezählt.
  7. `CHANGELOG.md:230` — die Leerzeile zwischen dem vierten und dem fünften Bullet unter `### ⚠️ Breaking Changes` (Z. 224) fällt weg. Es ist die einzige ihrer Art im ganzen `[Unreleased]`-Abschnitt; die Leerzeilen 225, 257, 259, 292 und 294 grenzen Überschriften ab und bleiben stehen.
  8. `worker-element-attributes.test.js:29-32` — der Kommentar nennt die Prüfung, die der Code führt. `ConsoleLogger.sharedConfig.enable` ist auf `IS_LOOPBACK_HOST` vorbelegt (`utils/ConsoleLogger.ts:14`), und das ist `LOOPBACK_HOSTNAMES.has(globalThis.location?.hostname ?? '')` über der Menge `['localhost', '127.0.0.1', '::1', '[::1]']` (`:12`). Neuer Wortlaut, im Zeilenmaß der Datei:

     ```js
       // `warn` is gated behind `ConsoleLogger.sharedConfig.enable`, which defaults to whether
       // `location.hostname` is one of `localhost`, `127.0.0.1`, `::1` and `[::1]` — true under the
       // Vitest browser provider, but a silent dependency on the dev server's bind address. Set both
       // explicitly instead of relying on it, and restore afterwards.
     ```

     Die Begründung der beiden Folgesätze trägt unverändert; falsch war allein der beschriebene Mechanismus.
  9. Kein CHANGELOG-Eintrag, keine Doku- und keine `AGENTS.md`-Änderung darüber hinaus. Das Paket bewegt kein Verhalten und keine öffentliche Fläche: fünf Kommentare und zwei Korrekturen innerhalb eines Abschnitts, der noch nicht veröffentlicht ist. Aus demselben Grund kein Regressionstest — es gibt keinen Korrektheitsfehler, gegen den einer rot laufen könnte. Kein `TODO` entsteht oder fällt weg, also kein `pnpm make:todo`; unter `dist/` kommt keine Datei hinzu und keine weg, also bleiben `src/distContract.files.txt` und `src/distContract.package.json` unberührt.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test` — voll, weil zwei Pakete betroffen sind. Der Lauf belegt allerdings nur, dass nichts kaputtgeht: das Zeilenmaß von 100 ist nirgends erzwungen (`biome.json` steht auf `lineWidth: 130`), und einen Kommentarwortlaut prüft kein Werkzeug. Der eigentliche Beleg dieses Pakets ist das Lesen in Zug 3 — der Reviewer bekommt das ausdrücklich gesagt.
- Commit: `docs: a doc link points only where its module can reach, a release note keeps one name per thing, and a setup comment names the gate it describes`
- Ergebnis: 1 Runde · alle sieben Stellen (a)–(g) geschlossen: vier tote `{@link}` in
  `view/ComponentChanges.ts` sind Code-Spans, der doppelte Bindestrich in `elements/ShaeElement.ts`
  ist ein Gedankenstrich, der Rücknahme-Kommentar in `elements/forwardCustomEvents.ts` und drei
  Kommentarabsätze in `ComponentChanges.ts` halten das Zeilenmaß, das CHANGELOG führt
  `__shadowObjectsContexts` unter einem Namen und die Breaking-Liste ist wieder dicht, und der
  `before()`-Kommentar in `worker-element-attributes.test.js` nennt die Hostname-Menge, die
  `IS_LOOPBACK_HOST` tatsächlich prüft · kein Regressionstest, weil kein Korrektheitsfehler behoben
  wurde · Review Runde 1 hob eine dritte Kommentarzeile über dem Maß (`ComponentChanges.ts:485`),
  die die Zählung in Zug 0 übersehen hatte; sie ist mitgenommen, weil (g) die Menge »alle
  Kommentarzeilen dieser Datei über 100« meint und sie nur falsch aufgezählt hatte · klein und
  liegengelassen: `worker-element-attributes.test.js:22` steht auf 102 Zeichen, aber diese Datei
  führt kein Maß von 100 — 28 ihrer Zeilen liegen darüber, fast alles Code · die Commit-Message aus
  dem Detailplan hat einen dritten Teilsatz bekommen: sie nannte zwei der drei Sorten von Änderung
  und ließ ausgerechnet den Kommentar weg, der ein Verhalten beschrieb, gegen das ein Spec-Fall läuft
- Nebenbefunde: → Queue
- Folgen: keine — das Paket ändert keine Signatur, kein Verhalten und keine öffentliche Fläche
- Schnittstellen: —

### [x] 11. Jedes {@link} zeigt auf etwas, das seine Datei erreichen kann
- Findings: Nebenbefund aus Paket 10 (info, vorbestehend, nicht im Audit)
- Ziel: Kein `{@link …}` in `packages/shadow-objects/src/**/*.ts` verweist mehr auf ein Symbol, das seine Datei weder importiert noch selbst deklariert. Damit löst jedes `{@link}` des Repositories auf — für ein Werkzeug wie für einen Leser, der das Ziel in der Datei sucht, in der er gerade steht.
- Bereich: `packages/shadow-objects/src/` — acht Dateien, ausschließlich Doc-Kommentare, keine Zeile ausführbarer Code
- Hängt ab von: 10 (dort steht die Regel, nach der entschieden wurde)
- Hash: b318a46
- Modell: mittlere Stufe · siebzehn benannte Stellen mit vorgegebenem Ergebnis, aber die günstigste Stufe tauscht `{@link X}` mechanisch und fasst dabei an, was danebensteht; unter Punkt 4 und in der Nicht-anfassen-Liste hängt je eine Entscheidung, die ein Muster-Ersetzer nicht trifft
- Effort: low · jede Stelle steht unten mit Datei, Zeile, Ist- und Soll-Wortlaut. Das ist Transkription, kein Entwurf, und mehr Nachdenken erhöht hier nur die Neigung, Sätze zu verbessern, die niemand zu verbessern verlangt hat
- Dateien: `packages/shadow-objects/src/EntityUuidInUseError.ts`, `src/constants.ts`, `src/in-the-dark/Entity.ts`, `src/utils/MicrotaskCollector.ts`, `src/utils/MicrotaskGate.ts`, `src/view/ComponentChanges.spec.ts`, `src/view/ComponentContext.ts`, `src/view/IShadowObjectEnvProxy.ts`

**Der Abgleich in Zug 0 korrigiert die Menge.** Die Queue-Zeile nannte »dreizehn Ziele über sechs Dateien« mit Zeilennummern aus einem älteren Stand (`IShadowObjectEnvProxy.ts:17,26,35`, `MicrotaskCollector.ts:16-23`). Maschinell neu erhoben über `packages/shadow-objects/src/**/*.ts` sind es **173 `{@link}` insgesamt, davon 17 unerreichbare in acht Dateien**. Neu gegenüber der Liste sind `view/ComponentChanges.spec.ts:8` und je zwei weitere Stellen in `IShadowObjectEnvProxy.ts` und `MicrotaskCollector.ts`; die Zeilennummern unten sind nachgesehen. Das Zählwerkzeug liegt als `paket-11.linkscan.mjs` im Arbeitsverzeichnis, wird aus der Repo-Wurzel gefahren und endet auf `exit=0`, wenn nichts mehr offen ist — heute meldet es `17`.

Zwei Gegenproben dazu, beide grün, damit niemand sie ein zweites Mal fahren muss: es gibt im Paket keine andere Link-Form (`{@linkcode}`, `{@linkplain}`, `[text]{@link …}` — null Treffer), und jedes `X.member`- und `X#member`-Ziel, dessen Basis auflöst, existiert auch wirklich auf `X`. Außerhalb von `packages/shadow-objects/src/` steht im ganzen Repository genau ein `{@link}` — `packages/shadow-objects-testing/test/view-component-context-switch.test.js:5` —, und der importiert seine beiden Ziele in Zeile 2. Er bleibt unangetastet; nach diesem Paket löst jedes `{@link}` des Repositories auf.

**Warum Code-Span und nicht Import.** Die Lösung ist dieselbe wie in Paket 10, und sie hat hier zwei Gründe statt einem. Erstens die Richtung: `constants.ts` wird von 39 Modulen importiert, `ShadowEnv.ts:15` importiert `ComponentContext`, `RemoteWorkerEnv` implementiert `IShadowObjectEnvProxy`, und `utils/` liegt unter `view/` und `in-the-dark/` — ein Rückimport wäre in fast jedem dieser Fälle ein Zyklus. Zweitens, und das gilt ausnahmslos: `biome.json` stellt `correctness.noUnusedImports` auf `warn`, und `pnpm lint:ci` läuft mit `--error-on-warnings`. Ein Import, den nur ein Doc-Kommentar benutzt, ist ein unbenutzter Import und bricht die Lint-Stufe. Der Verweis wird also ein Code-Span, überall.

- Vorgehen:
  1. **Sechzehn `{@link X}` werden zu `` `X` ``.** Nur die Markup-Form ändert sich: kein Wort mehr, keins weniger, keine Umstellung, kein Neuumbruch. Jede dieser Zeilen wird dadurch um sieben Zeichen kürzer; die längste (`constants.ts:24`, heute 114) landet bei 100, alle anderen darunter. Die Zeilen einzeln, mit ihrem heutigen Wortlaut:

     | Datei:Zeile | im Text steht heute | wird zu |
     | --- | --- | --- |
     | `EntityUuidInUseError.ts:11` | `underneath a {@link ChangeTrailRefusedError}: the trail is` | `` underneath a `ChangeTrailRefusedError`: the trail is `` |
     | `constants.ts:24` | `dispatched by {@link ComponentContext.reCreateChanges} and` | `` dispatched by `ComponentContext.reCreateChanges` and `` |
     | `constants.ts:24` | `forwarded to all {@link ViewComponent}.` | ``forwarded to all `ViewComponent`.`` |
     | `utils/MicrotaskCollector.ts:25` | `{@link Entity} delivers per entry, {@link ComponentContext} groups` | `` `Entity` delivers per entry, `ComponentContext` groups `` |
     | `utils/MicrotaskCollector.ts:28` | `see {@link DeferredTeardown}; for a single` | `` see `DeferredTeardown`; for a single `` |
     | `utils/MicrotaskCollector.ts:29` | `without a batch, {@link MicrotaskGate}.` | ``without a batch, `MicrotaskGate`.`` |
     | `utils/MicrotaskGate.ts:9` | `{@link MicrotaskCollector}, a booking … is {@link DeferredTeardown}.` | beide Ziele als Code-Span |
     | `view/ComponentChanges.spec.ts:8` | `same order as {@link ComponentContext.buildChangeTrails}. */` | `` same order as `ComponentContext.buildChangeTrails`. */ `` |
     | `view/ComponentContext.ts:1025` | `A {@link ShadowEnv} bound to this context` | `` A `ShadowEnv` bound to this context `` |
     | `view/IShadowObjectEnvProxy.ts:13` | ``{@link ChangeTrailRefusedError}: its `appliedCount` names`` | Code-Span |
     | `view/IShadowObjectEnvProxy.ts:14` | `applied, and {@link ShadowEnv} folds exactly` | Code-Span |
     | `view/IShadowObjectEnvProxy.ts:26` | `sent without it -- {@link RemoteWorkerEnv} is one of those.` | Code-Span |
     | `view/IShadowObjectEnvProxy.ts:34` | `{@link ShadowEnv} installs it on every proxy it is given` | Code-Span |
     | `view/IShadowObjectEnvProxy.ts:42` | `{@link ShadowEnv} installs it on every proxy it is given` | Code-Span |

  2. **`IShadowObjectEnvProxy.ts:34` und `:42` sind zeichengleich.** Derselbe Satzanfang steht zweimal in der Datei, in zwei verschiedenen Doc-Kommentaren (`onMessageToView` und `onProxyFailed`). Beide werden geändert. Ein Editierschritt, der auf Eindeutigkeit besteht, scheitert hier — entweder mit mehr Kontext greifen oder beide Vorkommen ersetzen. Wer nur eines erwischt, hinterlässt genau die Sorte halbe Arbeit, gegen die dieses Paket geschnitten wurde.
  3. **`view/ComponentChanges.spec.ts:8` gehört dazu.** Eine Spec-Datei steht in keiner generierten Referenz, aber sie steht in `src/**/*.ts`, sie trägt dieselbe Ursache, und ein Leser dieses Kommentars sucht `ComponentContext` in einer Datei, die es nicht importiert. Die Datei bleibt sonst unangetastet: kein Testfall, keine Zusicherung, kein Import ändert sich.
  4. **`in-the-dark/Entity.ts:609` ist der einzige Fall, der kein Code-Span wird.** Aus `{@link attachContextProvider}` wird `{@link Entity.attachContextProvider}` — der Verweis bleibt ein Verweis, er wird nur qualifiziert. Begründung: `attachContextProvider` ist eine Methode derselben Klasse (`:603`), der Link löst über die Klassenumgebung also auf, und `:34` schreibt dasselbe Ziel bereits qualifiziert. Der bloße Membername ist im ganzen Paket das einzige seiner Art — die fünf anderen `{@link kleinbuchstabe}` zeigen alle auf modulweite Funktionen in ihrer eigenen Datei (`forwardCustomEvents.ts:10`, `ShaeEntElement.ts:50` und zwei Spec-Helfer) und sind korrekt. Die Zeile wächst dadurch von 87 auf 94 Zeichen.
  5. **Was ausdrücklich nicht angefasst wird.** Diese Liste ist Teil des Auftrags, nicht Beiwerk:
     - Die 156 übrigen `{@link}` des Pakets. Sie lösen auf, und sie bleiben `{@link}` — ein Code-Span ist die Notlösung für den unerreichbaren Fall, nicht die neue Hausform.
     - Der Trennzeichen-Unterschied `{@link X#member}` gegen `{@link X.member}`. Fünfzehn Stellen in `view/ViewComponent.ts` und `view/ComponentContext.ts` schreiben `#`, der Rest schreibt `.`; beide Formen lösen auf, und `#` ist für Instanzmitglieder die genauere. In Zug 0 nachgesehen und für richtig befunden — hier wird nichts vereinheitlicht.
     - Der Umbruch. Keine Zeile wird neu gebrochen, kein Absatz neu gesetzt. Jede Ersetzung verkürzt ihre Zeile; keine Datei dieses Pakets führt ein Zeilenmaß, das dabei verletzt würde, und `biome.json` steht auf `lineWidth: 130`.
     - Der doppelte Bindestrich `--` (`IShadowObjectEnvProxy.ts:26`, `MicrotaskCollector.ts:16` und rund 180 weitere Stellen außerhalb von `src/elements/`). Paket 10 hat den Gedankenstrich für `src/elements/` durchgesetzt und für den Rest des Pakets ausdrücklich nicht; das gilt unverändert.
     - Der Wortlaut jedes betroffenen Satzes. Auch wo er sich holprig liest — »forwarded to all `ViewComponent`« —, bleibt er stehen. Dieses Paket ändert Markup, keine Prosa.
  6. **Kein CHANGELOG-Eintrag, keine Doku-, README- und keine `AGENTS.md`-Änderung.** Das Paket bewegt kein Verhalten, keine Signatur und keine öffentliche Fläche — siebzehn Doc-Kommentarstellen und sonst nichts. Kein Regressionstest: es gibt keinen Korrektheitsfehler, gegen den einer rot laufen könnte. Kein `TODO` entsteht oder fällt weg, also kein `pnpm make:todo`. Unter `dist/` kommt keine Datei hinzu und keine weg, also bleiben `src/distContract.files.txt` und `src/distContract.package.json` unberührt.
- Verify: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`, dazu `node <arbeitsdir>/paket-11.linkscan.mjs` aus der Repo-Wurzel, der auf `exit=0` und `unreachable from its own file: 0` stehen muss. Die volle Kette belegt nur, dass nichts kaputtgeht — einen Doc-Kommentar prüft kein Compiler. Der Zählerlauf ist der eigentliche Beleg des Pakets, und weil er heute genau die siebzehn Stellen meldet, die im Vorgehen aufgezählt sind, sind »null danach« und »genau diese siebzehn geändert« dieselbe Aussage. Er ist keine Erlaubnis: was er meldet, ist bereits im Vorgehen aufgezählt, und was dort nicht steht, wird auch dann nicht angefasst, wenn ein Lauf es anders sieht.
- Commit: `docs: every doc link names a symbol its own file can name`
- Ergebnis: 1 Runde · alle 17 unerreichbaren `{@link}` geschlossen — 16 als Code-Span, `in-the-dark/Entity.ts:609` als Qualifizierung `{@link Entity.attachContextProvider}` · Zählwerkzeug `paket-11.linkscan.mjs` meldet danach `total: 157 · unreachable from its own file: 0` · kein Regressionstest (keine Korrektheitsänderung, nur Doc-Kommentare) · klein: die Commit-Message beschreibt das Ziel des Nebenbefunds und nicht nur den Markup-Tausch dieses Commits — trägt, aber knapp
- Nebenbefunde: —
- Folgen: —

**Nebenbefund aus Paket 10 · info · vorbestehend · nicht im Audit** — `{@link …}` auf ein Symbol, das
sein Modul weder importiert noch selbst deklariert, zeigt in einer generierten Referenz ins Leere.
Im Wortlaut, wie er in »Offene Befunde« steht: »dieselbe Ursache wie der Befund, den Paket 10 in
`view/ComponentChanges.ts` schließt … Dreizehn solche Ziele über diese sechs Dateien
(`ChangeTrailRefusedError`, `ComponentContext`, `ViewComponent`, `ShadowEnv`, `RemoteWorkerEnv`,
`Entity`, `DeferredTeardown`, `MicrotaskGate`, `MicrotaskCollector`), dazu ein Grenzfall in
`in-the-dark/Entity.ts:609`, wo `{@link attachContextProvider}` den bloßen Membernamen setzt,
während `:34` dasselbe Ziel qualifiziert schreibt.« Die Zählung ist in Zug 0 neu erhoben worden und
steht oben; die Ziel-Liste stimmt, die Zahl und die Dateimenge waren zu klein.
Empfehlung: dieselbe Lösung wie in Paket 10 — der Verweis wird ein Code-Span, wo ein Import allein
für den Link der falsche Preis wäre. Der Grenzfall wird qualifiziert statt umgeschrieben.
