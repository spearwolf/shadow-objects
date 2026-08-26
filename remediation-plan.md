# Remediation-Plan — shadow-objects

Quelle: ./audit.html vom 2026-08-26 · Branch: main · erstellt: 2026-08-26
Baseline: `pnpm build` ✓ · `pnpm typecheck` ✓ · `pnpm lint` ✓ (1 info — das ist
BUILD-003 selbst) · `pnpm test` ✓ (erzwungener Lauf ohne Cache: 379 Tests in
shadow-objects-testing, 645 in shadow-objects-e2e, Kern-Suite grün, 1m01s)
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/4330786b-e3e3-43ca-ab76-3ae0412a90c4/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Verify-Kommandos (wörtlich, auch für den Abschluss): `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test`
Aggregat, das die CI fährt: `pnpm run ci`
Scope: 24 vom Nutzer gepickte Findings + 2 Punkte aus »Optimierungspotenzial« · SEC-002 wird als akzeptiert behandelt und aus dem Audit genommen
Scope-Regel: Was im Lauf auffällt und Build, CI, Tests, Werkzeugkonfiguration oder
deren Dokumentation betrifft, wird in diesem Lauf mit behoben. Alles, was in den
Bibliotheks-Quelltext greift, geht als neues, offenes Finding ins Audit.
Stand (2026-08-26): abgeschlossen · 20 Pakete, 20 Commits, keins blockiert · Befund-Queue leer · Abschluss-Verify grün (build, typecheck, lint, test) · audit.html nachgeführt: 81,5 → 86,5, 24 geschlossen, 3 neu, SEC-002 zurückgestellt

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen

- TYPE-002: Beide Strictness-Schalter kommen rein, in Teilpaketen nach
  Subsystem. Gemessen am 2026-08-26: `noUncheckedIndexedAccess` 139 Fehler in
  13 Dateien (5 Produktion, 8 Specs), `exactOptionalPropertyTypes` 134 Fehler
  in 20 Dateien (17 Produktion). (2026-08-26)
- TYPE-002, Vorgehen: Die Teilpakete prüfen ihr Subsystem mit dem Schalter auf
  der Kommandozeile (`tsc -p … --exactOptionalPropertyTypes`) und lassen
  `tsconfig.json` unberührt. Erst das letzte Teilpaket legt den Schalter in der
  Konfiguration um. So bleibt `pnpm typecheck` zwischen den Paketen grün und
  jeder Commit steht auf einem grünen Verify-Lauf. (2026-08-26)
- DX-001: »Component Tag« wird an allen neun Stellen gestrichen, AGENTS.md §2
  zieht mit. Die Terminologie-Tabelle bleibt, wie sie ist. (2026-08-26)
- DX-010: `ClassGraphOverview.drawio` und das exportierte SVG werden aus dem
  Quellbaum genommen statt aufgefrischt. (2026-08-26)
- SEC-002 (`allowedHosts: true` im Demo-Dev-Server) wird so akzeptiert, wie es
  ist. Kein Paket, keine Codeänderung; der Punkt verlässt beim Abschluss das
  Audit. (2026-08-26)
- Der Plan wandert am Ende in zwei Commits ins Repo und wieder aus dem
  Arbeitsbaum. (2026-08-26)
- Paket 4: Der Runner-Zug lief ab, während sein Implementierer noch arbeitete;
  Review, Verify und Commit fanden nie statt, 15 fertige Dateien lagen
  uncommittet im Arbeitsbaum. Entschieden: auf diesem Stand aufsetzen statt ihn
  zu verwerfen. Weil das Skript einen schmutzigen Arbeitsbaum und ein
  `[~]`-Paket als harte Vorbedingungen ablehnt, hat der Orchestrator die
  fehlenden Züge selbst nachgeholt: Diff gelesen, alle vier Verify-Kommandos
  selbst gefahren und gelesen, dann committet. Implementiert wurde dabei
  nichts. (2026-08-26)

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

Dazu die Regeln, die dieses Projekt selbst setzt (`AGENTS.md`, `CLAUDE.md`):

- Dokumentation und Code-Kommentare auf Englisch, Doku in Markdown.
- ECS-Terminologie. Verboten: »shadow theater«, »puppet«, »puppeteer«,
  »light world«, »screen« als Analogie. Die Tabelle verbindlicher Begriffe in
  `AGENTS.md` §4 gilt wörtlich.
- Changelog-Pflicht nach Zuständigkeit: Laufzeit-API, Verhalten und `dist/`-Form
  von `@spearwolf/shadow-objects` → `packages/shadow-objects/CHANGELOG.md`
  (unter `## [Unreleased]`); dasselbe für das Canvas-Paket in seinem eigenen
  CHANGELOG; Build, Testrunner, Lint, turbo/pnpm, devDeps, Monorepo-Skripte →
  Wurzel-`CHANGELOG.md` als datierter Abschnitt. Trifft eine Änderung mehrere,
  steht sie in jedem — je aus der Sicht dieser Datei, nicht kopiert.
- Eine Änderung der öffentlichen API zieht `docs/`, `README.md` und
  `CHANGELOG.md` desselben Pakets im selben Zug mit.
- Dependency-Versionen ausschließlich über den `catalog:` in
  `pnpm-workspace.yaml`, referenziert als `"<dep>": "catalog:"`.
- Wer einen TODO-Kommentar anfasst, fährt `pnpm make:todo`.
- Ändert sich die Dateiliste oder die Form von `dist/package.json`, ziehen
  `src/distContract.files.txt` und `src/distContract.package.json` im selben
  Commit mit.

## Vorbestehende Fehler

Keine. Alle vier Verify-Kommandos waren vor Lauf-Beginn grün. Das eine
Info-Diagnostikum von `pnpm lint` ist BUILD-003 und wird in Paket 2 behoben.

## Bereits erledigt, kein Paket

- DX-003 (vier tote `.eslintrc.json`): Die Dateien existieren weder im
  Arbeitsbaum noch in `git ls-files`. Beim Abschluss als erledigt buchen.

## Offene Befunde

Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

- [x] `biome.json:24-26` — → Paket 17, behoben in `47da67b` · — `!**/*.glsl`, `!**/*.vert`, `!**/*.frag` nehmen drei
  Dateiendungen aus `files.includes` heraus, die es in diesem Repository weder gibt
  noch je gab (`git log --all --name-only`: null Treffer) und die Biome 2.5.9 ohnehin
  nicht verarbeitet: ein Ausschluss, der in beide Richtungen wirkungslos ist und eine
  Struktur beschreibt, nach der jemand vergeblich sucht. · aus Paket 2, Zug 0 ·
  Severity: info · → Scope

  Nicht in Paket 2 mitgenommen, obwohl der Implementierer ohnehin in dieser Liste
  steht: die Schadensform ist eine andere als beim dortigen Pfad-Ausschluss — dort
  fällt ein später angelegtes Verzeichnis stillschweigend aus dem Lint, hier kann das
  nicht passieren. Ob die drei Zeilen in einem Paket, dessen Canvas-Teil auf `three`
  peert, als Vorgriff taugen oder ersatzlos gehören, entscheidet die Drain-Runde mit
  allen Befunden vor Augen besser als dieses Paket mit einem.

- [x] `packages/shadow-objects/docs/api-reference.md:636` — → Paket 18, behoben in `af966db` (Nutzer, 2026-08-26) · — Die Signaturzeile des
  `ViewComponent`-Konstruktors nennt den Typ `ViewComponentOptions`. Ein Typ dieses Namens existiert
  im Quelltext nicht und wird nirgends exportiert: der Konstruktor deklariert sein Optionsobjekt als
  anonymes Typliteral (`packages/shadow-objects/src/view/ViewComponent.ts:184-190`), und der Name
  kommt im ganzen Repository ausschließlich an dieser einen Doku-Stelle vor. Wer ihn importiert,
  bekommt einen Compilefehler; die Tabelle direkt darunter beschreibt die Form ohnehin vollständig.
  `AGENTS.md` §4 führt erfundene Namen ausdrücklich als die gefährlichste Sorte Doku. Zwei Ausgänge
  sind denkbar und beide vertretbar: den Typ exportieren und benennen, oder die Zeile auf das
  anonyme Literal bringen. Vorbestehend, nachgesehen und nicht vermutet: `git show bfcc54b:…` — der
  Stand vor dem ersten Commit dieses Laufs — trägt dieselbe Zeile 636 mit demselben Namen. · aus
  Paket 7, Zug 0 · Severity: low · → Rückfrage

  Die Scope-Regel greift hier nicht eindeutig, und das ist der Grund für die Rückfrage statt einer
  stillen Auslegung. Ihr erster Arm nennt Build, CI, Tests, Werkzeugkonfiguration »oder deren
  Dokumentation« — die Doku der Bibliothek ist damit nicht gemeint. Ihr zweiter Arm schickt ins
  Audit, »was in den Bibliotheks-Quelltext greift« — eine reine Doku-Korrektur tut das nicht. Der
  Befund fällt zwischen beide Arme. Dass die Pakete 11 bis 14 dieses Laufs sämtlich an der
  Bibliotheks-Doku arbeiten, spricht für den Verbleib im Lauf, entscheidet die Regel aber nicht.

- [x] `packages/shadow-objects/src/view/cloneChangeTrail.ts:7` — → Audit, als neues Finding eingetragen · — `structuredClone(data, {transfer:
  transferables as any})` castet einen Wert nach `any`, der an dieser Stelle bereits auf
  `TransferablesType` verengt ist, also auf genau den Typ, den `StructuredSerializeOptions.transfer`
  erwartet. Der Cast trägt nichts und schaltet die Prüfung auf einer Zeile ab, die Objekte an einen
  ablösenden Aufruf reicht: eine künftige Änderung an `IComponentChange.transferables` liefe hier
  ohne Warnung durch. Gemessen am 2026-08-26 an einer Kopie außerhalb des Arbeitsbaums: ohne das
  `as any` compiliert die Datei unverändert, mit und ohne `--exactOptionalPropertyTypes`, und die
  Fehlerzahl bewegt sich in keiner Richtung. Vorbestehend, nachgesehen und nicht vermutet:
  `git show bfcc54b:packages/shadow-objects/src/view/cloneChangeTrail.ts` trägt denselben Cast. · aus Paket 7, Zug 0 · Severity: info · → Audit

  Der Fix greift in den Bibliotheks-Quelltext. Damit ist die Scope-Regel eindeutig.

- [x] `packages/shadow-objects/src/elements/events.ts:22` — → Audit, als neues Finding eingetragen · — Das exportierte Interface
  `ShadowEntsEventMap` trägt den Projektnamen »shadow-ents«, unter dem dieses Paket nicht mehr
  erscheint. Es ist keine der realmweit sichtbaren Laufzeit-Stellen, die Paket 9 umbenennt, sondern
  ein Typname der öffentlichen API: `index.ts` re-exportiert ihn, `events.ts:31` hängt
  `HTMLElementEventMap` daran, und `packages/shadow-objects/docs/api-reference.md:2178,2180` führen
  ihn im Beispiel vor. Eine Umbenennung bricht deshalb jeden `import type {ShadowEntsEventMap}`
  eines Konsumenten — anderer Schaden und anderer Blast Radius als bei einem `globalThis`-Schlüssel,
  den nie jemand dokumentiert hat. Vorbestehend, nachgesehen und nicht vermutet:
  `git show bfcc54b:packages/shadow-objects/src/elements/events.ts` trägt denselben Namen. · aus
  Paket 9, Zug 0 · Severity: info · → Audit

  Der Fix benennt einen Export der Bibliothek um und greift damit in den Bibliotheks-Quelltext.
  Der zweite Arm der Scope-Regel ist eindeutig; eine Rückfrage wie bei `api-reference.md:636`
  braucht es hier nicht, weil der Befund nicht zwischen den beiden Armen liegt, sondern
  vollständig unter dem zweiten.

- [x] `packages/shae-offscreen-canvas/package.json:51` — → Paket 17, behoben in `47da67b` · — `esbuild-plugin-inline-worker` steht in den
  devDependencies des Canvas-Pakets, ohne dass in diesem Paket irgendetwas esbuild fährt. Sein Build ist
  eine Quelldistribution: `build.mjs` kopiert `README.md` und `src/` nach `.npm-pkg` und ruft sonst
  nichts auf, `vite.config.js` führt kein einziges Plugin, `vitest.config.ts` ebenso wenig. Gemessen am
  2026-08-26: der Name kommt im ganzen Paket ausschließlich in dieser einen Manifestzeile vor. Der
  Katalogeintrag `esbuild-plugin-inline-worker: ^0.1.1` bleibt in jedem Fall stehen —
  `packages/shadow-objects/package.json:86` referenziert ihn, und dort benutzt `build.mjs` den Plugin
  wirklich, für den inline-base64-Worker im Bundle. Vorbestehend, nachgesehen und nicht vermutet:
  `git show bfcc54b:packages/shae-offscreen-canvas/package.json` trägt die Zeile an Position 51. · aus
  Paket 10, Zug 0 · Severity: low · → Scope

  Nicht in Paket 10 mitgenommen, obwohl der Implementierer genau diese Liste ohnehin öffnet: DEP-003
  handelt von `lit-html` in derselben Datei, und die beiden Zeilen haben nichts miteinander gemein außer
  ihrer Form. Die eine benennt einen Template-Renderer, die andere ein Build-Plugin für einen Build, den
  dieses Paket nicht fährt — gleiche Gestalt, verschiedene Ursache. Für `lit-html` in
  `packages/shadow-objects-testing` liegt das anders, und deshalb kommt jene Zeile in das Paket: dort
  hängt der Ausgang von DEP-003 selbst daran, weil der Katalogeintrag nur so lange stehen kann, wie sie
  steht. Hier hängt nichts. Ein Nebenbefund bekommt sein Paket von der Drain-Runde, die alle Befunde
  dieses Laufs nebeneinander sieht. Wer ihn aufnimmt, fährt danach `pnpm install`, weil die Lockfile den
  Importeur führt.

- [x] `README.md:92` — → Paket 18, behoben in `af966db` (Nutzer, 2026-08-26) · — Die Zeile zu den Custom Elements beziffert deren Lifecycle-Logik mit »Over
  1,100 lines of robust lifecycle logic«. Gemessen am 2026-08-26: `packages/shadow-objects/src/elements/`
  trägt 2.732 Zeilen TypeScript ohne die Specs und 3.402 mit ihnen. Die Angabe ist wörtlich wahr und um
  den Faktor 2,5 zu klein — die Art Zahl, die ein Leser nachzählt und danach der ganzen Liste misstraut.
  Vorbestehend, nachgesehen und nicht vermutet: `git show bfcc54b:README.md` trägt dieselbe Zeile 92. ·
  aus Paket 11, Zug 0 · Severity: info · → Rückfrage

  Nicht in Paket 11 mitgenommen, obwohl dessen Implementierer genau diese Zeile anfasst: die Ursache ist
  eine andere. Paket 11 richtet Pfade, die ins Leere zeigen; hier steht eine Messung, die den Code einmal
  beschrieben hat und ihm nicht nachgewachsen ist — dieselbe Ursache, die Paket 13 für die Doku des
  Kernpakets behandelt. Die Scope-Regel greift nicht eindeutig: ihr erster Arm nennt Build, CI, Tests,
  Werkzeugkonfiguration »oder deren Dokumentation«, und eine Größenangabe zum Bibliotheks-Quelltext ist
  keins davon; ihr zweiter Arm schickt ins Audit, »was in den Bibliotheks-Quelltext greift«, und eine Zahl
  in der Wurzel-README tut das nicht. Der Befund fällt zwischen beide Arme — dieselbe Lücke, in die
  `packages/shadow-objects/docs/api-reference.md:636` gefallen ist. Beide lassen sich beim Abschluss mit
  einer Entscheidung erledigen.
- [x] `packages/shadow-objects/src/view/ShadowEnv.drawio:28` — → Paket 18, behoben in `af966db` (Nutzer, 2026-08-26) · und `ShadowEnv.drawio.svg:1` — Beide tragen die
  Beschriftung »shadow object enviroment«; das Wort ist falsch geschrieben, und es steht im Quell-Diagramm wie
  in seinem Export je einmal. Richtigstellen heißt hier: das `.drawio` in einem Zeichenwerkzeug öffnen und beide
  Dateien neu schreiben, denn das SVG ist ein Export und kein von Hand gepflegter Text. Von keiner Zeile dieses
  Repositories eingebunden. Vorbestehend, nachgesehen und nicht vermutet: `git ls-tree bfcc54b` führt beide
  Dateien, und `git show bfcc54b:packages/shadow-objects/src/view/ShadowEnv.drawio.svg | grep -c enviroment`
  meldet `1`. · aus Paket 12, Zug 0 · Severity: info · → Rückfrage

  Nicht in Paket 12 mitgenommen, obwohl dessen Schritt 4 zwei Dateien aus demselben Verzeichnis nimmt: die
  Ursache ist eine andere. Paket 12 entfernt ein Diagramm, das falsch orientiert, und eine Glosse, die eine
  verbindliche Regel verletzt; hier steht ein Buchstabe falsch in einem Diagramm, das nichts Unwahres sagt.
  Die Scope-Regel greift nicht eindeutig, und es ist dieselbe Lücke wie bei
  `packages/shadow-objects/docs/api-reference.md:636` und `README.md:92`: ihr erster Arm nennt Build, CI, Tests,
  Werkzeugkonfiguration »oder deren Dokumentation«, und ein Architekturdiagramm der Bibliothek ist keins davon;
  ihr zweiter Arm schickt ins Audit, »was in den Bibliotheks-Quelltext greift«, und eine Beschriftung in einer
  Zeichnung, die weder compiliert noch ausgeliefert wird, tut das nicht. Die drei Einträge dieser Lücke lassen
  sich beim Abschluss mit einer Entscheidung erledigen.

- [x] `CLAUDE.md:87` — → Paket 17, behoben in `47da67b` · und `:108` — Die Überschrift »## Changelogs and Backlog — keep them in sync« und der Absatz
  darunter (»After updating the changelogs, **sync `Backlog.md`**: cross off or remove items the change
  resolved …«) verpflichten jeden Beitragenden und jeden Agenten auf die Pflege einer Datei, die es nicht gibt.
  `bfcc54b` hat `Backlog.md` entfernt; die Anweisung ist stehengeblieben. Von den drei Changelogs, die derselbe
  Abschnitt regelt, stimmt jede Zeile — allein sein Titel und sein Schlussabsatz nennen ein viertes Dokument, das
  niemand mehr findet. Das ist die teuerste Sorte veralteter Anweisung: sie steht in genau der Datei, die ein
  Agent zuerst liest, und sie fordert eine Handlung statt eine Auskunft. Vorbestehend, nachgesehen und nicht
  vermutet: `git show bfcc54b:CLAUDE.md | grep -n Backlog` meldet beide Zeilen. · aus Paket 13, Zug 0 ·
  Severity: low · → Scope

  Nicht in Paket 13 mitgenommen: dort wird ein Zeiger auf eine Messreihe umgehängt, hier eine Arbeitsanweisung
  zurückgenommen — gleiche verschwundene Datei, verschiedene Ursache, und kein offenes Paket teilt sie. Die
  Scope-Regel greift über ihren ersten Arm: `CLAUDE.md` ist die Betriebsanleitung dieses Repositories für Build,
  Testrunner, Lint und Changelog-Pflege, und der Absatz greift in keine Zeile Bibliotheks-Quelltext. Der Befund
  bekommt sein Paket von der Drain-Runde. Wer ihn aufnimmt, entscheidet zugleich, ob der Abschnitt nur seinen
  Schlussabsatz und die Hälfte seines Titels verliert oder ob an die Stelle des Backlogs etwas anderes tritt.

- [x] `pnpm-workspace.yaml:114-115` — → Paket 19 · — `minimumReleaseAgeExclude` führt `@spearwolf/signalize@1.0.0-beta.0` und nimmt diese
  Version damit von der Karenzzeit aus, mit der pnpm 11 einen frisch kompromittierten Fremd-Release aus dem Baum hält
  (`minimumReleaseAge`, Vorgabe ein Tag). Der Kommentar über dem Block sagt selbst, wann der Eintrag gehen kann — »the entry
  is version-exact and can go once the release is a day old«. Die Version ist am 2026-08-15 erschienen (`npm view
  @spearwolf/signalize time`), gemessen am 2026-08-26 also elf Tage alt. Die Ausnahme hat ihren Anlass überlebt und steht
  jetzt als Dauerregel in einer Datei, in der jede andere Zeile eine trägt. Vorbestehend, nachgesehen und nicht vermutet:
  `git show bfcc54b:pnpm-workspace.yaml | grep -n -A2 minimumReleaseAgeExclude` trägt denselben Eintrag. · aus Paket 17,
  Zug 0 · Severity: info · → Scope

  Nicht in Paket 17 mitgenommen, obwohl dessen Implementierer die Datei durch `pnpm install` streift: die Ursache ist eine
  andere. Paket 17 streicht Konfiguration, die etwas nennt, das es nicht gibt — hier gibt es die genannte Version, ihre
  Ausnahme ist bloß abgelaufen. Die Scope-Regel greift über ihren ersten Arm: `pnpm-workspace.yaml` ist die
  Werkzeugkonfiguration des Paketmanagers, und der Eintrag greift in keine Zeile Bibliotheks-Quelltext. Wer ihn aufnimmt,
  entscheidet zugleich, ob mit dem Eintrag auch der Kommentar darüber geht oder ob dieser den Mechanismus weiter erklärt,
  und fährt danach `pnpm install`.

- [x] `README.md:96` — → Audit, mit `README.md:95` zu einem Finding gebündelt (Nutzer, 2026-08-26) · — »Massive test suite spanning unit tests (vitest), real DOM integration in Chromium, and E2E specs
  via Playwright«: »Massive« ist ein Wertadjektiv ohne Bezugsgröße und beschreibt dieselbe Sorte Behauptung, die in Zeile 92
  gerade gewichen ist — es kann nicht falsch werden und wird deshalb nie korrigiert. Der Satz dahinter trägt die Information
  bereits vollständig: drei Suiten, drei Werkzeuge, benannt. Vorbestehend: `git show bfcc54b:README.md:96` trägt den Satz
  wörtlich. · aus Paket 18, Zug 2 (Implementierer) · Severity: info · → Scope

  Die Scope-Regel greift über ihren ersten Arm: der Satz ist die Dokumentation der Testsuiten dieses Repositories, und keine
  Zeile Bibliotheks-Quelltext wird dabei angefasst. Nicht in Paket 18 mitgenommen, obwohl der Implementierer vier Zeilen
  darüber gearbeitet hat: der Detailplan schließt Zeile 96 ausdrücklich aus, und die Ursache ist eine andere — Zeile 92 nannte
  eine Zahl, die um den Faktor 2,5 danebenlag, hier steht gar keine.

- [x] `README.md:95` — → Audit, mit `README.md:96` zu einem Finding gebündelt (Nutzer, 2026-08-26) · — »A reference implementation demonstrating heavy lifting! Runs `three.js` in a Worker, proving the
  power of Transferables and Namespaces.«: Werbesprache in einer Strukturliste — ein Ausrufezeichen, »heavy lifting«,
  »proving the power of«. Was das Paket tut, steht im zweiten Halbsatz; der Rest bewertet es. Vorbestehend:
  `git show bfcc54b:README.md:95` trägt beide Sätze wörtlich, nur unter dem damaligen Pfad des Pakets. · aus Paket 18, Zug 2 (Implementierer) · Severity: info · → Rückfrage

  Die Scope-Regel trifft hier keine eindeutige Aussage, und deshalb steht sie hier statt eines stillen Urteils: Der Satz
  beschreibt weder Build, CI, Tests noch eine Werkzeugkonfiguration — er beschreibt ein veröffentlichtes Paket der
  Bibliothek —, greift aber auch in keine Zeile Bibliotheks-Quelltext, sodass der zweite Arm der Regel ebenso wenig trägt.
  Zu entscheiden ist, ob die Ton-Korrektur an einer Paketbeschreibung in diesen Lauf gehört oder als offenes Finding ins
  Audit. Vorschlag: zusammen mit `README.md:96` in dieselbe Drain-Runde nehmen — es ist dieselbe Datei, dieselbe Liste und
  derselbe Fehler, und getrennt behandelt kostet er zwei Commits an einem Absatz.

- [x] `CLAUDE.md:25` und `AGENTS.md:116` — → Paket 20, behoben in `f42750e` · — Beide Anleitungen beziffern den absichtlichen turbo-Holdback mit `2.10.9`;
  der Katalog führt `turbo: ^2.10.11` (`pnpm-workspace.yaml:91`), aufgelöst auf 2.10.11 in `pnpm-lock.yaml`. Die
  Begründung des Holdbacks stimmt weiterhin und ist nachgemessen — `npm view turbo dist-tags` meldet am 2026-08-26
  `latest: 2.10.12`, erschienen am 2026-08-25, der Katalog steht also tatsächlich einen Patch darunter. Falsch ist
  allein die Zahl, und sie steht an der Stelle, an der jemand nachsieht, bevor er den Katalog anfasst: `AGENTS.md` ist
  nach `CLAUDE.md` der maßgebliche Leitfaden, und beide Sätze warnen ausdrücklich davor, den Eintrag »zu reparieren«.
  Wer die beiden Zahlen nebeneinanderlegt, weiß nicht, welche gilt. Vorbestehend, nachgesehen und nicht vermutet:
  `git show bfcc54b:CLAUDE.md` trägt dieselbe `2.10.9`-Zeile, während `git show bfcc54b:pnpm-workspace.yaml` schon
  `^2.10.11` führt — die Lücke ist älter als der erste Commit dieses Laufs und stammt aus `92d3c14`. · aus Paket 19,
  Zug 0 · Severity: low · → Scope

  Nicht in Paket 19 mitgenommen, obwohl dessen Implementierer `CLAUDE.md` ohnehin öffnet und die falsche Zahl zwei
  Zeilen über der Zeile steht, die er ändert: die Ursache ist eine andere. Paket 19 nimmt eine Ausnahme zurück, deren
  Anlass verfallen ist; hier ist eine Versionsangabe einem Bump nicht nachgewachsen — das ist die Ursache, die Paket 17
  behandelt hat, und die ist committet. Die Scope-Regel greift über ihren ersten Arm: `CLAUDE.md` und `AGENTS.md` sind
  die Betriebsanleitung dieses Repositories für Build, Testrunner, Lint und Paketmanager, und der Satz greift in keine
  Zeile Bibliotheks-Quelltext. Sein Paket schneidet die Drain-Runde des Abschlusses. Wer ihn aufnimmt, entscheidet
  zugleich, ob dort künftig überhaupt eine Zahl steht oder nur die Regel — eine Versionsangabe in einer Anleitung
  veraltet bei jedem Bump erneut, die Regel »eine Version unter latest, siehe den Kommentar in der Datei« nie.

## Pakete

### [x] 1. Zeilenenden auf den POSIX-Standard bringen
- Findings: BUILD-003 (Teil `formatter.trailingNewline`)
- Ziel: Jede Textdatei, die ein Werkzeug dieses Repositories formatiert, endet mit einem Zeilenumbruch, und die Abweichung, die keine Datei begründet, verschwindet aus `biome.json`.
- Bereich: `biome.json`, `.editorconfig`, danach der gesamte Arbeitsbaum
- Hängt ab von: —
- Anmerkung: Repo-weite Umformatierung, deshalb ganz vorn und als eigener Commit — jeder spätere Diff wäre sonst unlesbar.
- Hash: c93a26e
- Modell: mittlere Stufe
- Effort: low
- Dateien: `biome.json` · `.editorconfig` · `CHANGELOG.md` (Wurzel) · 206 Dateien über `pnpm format` · 4 Dateien von Hand (Schritt 4)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler, sondern eine Werkzeugkonfiguration. Den Nachweis führen die beiden Zählproben in Schritt 6 und der Verify-Lauf.
- Vorgehen:
  1. In `biome.json` die Zeile `"trailingNewline": false` aus dem Block `formatter` streichen — heute Zeile 40, der letzte Schlüssel des Blocks. Das Komma am Ende der Vorzeile 39 (`"formatWithErrors": false`) fällt mit, sonst steht dort ein Trailing Comma und `formatWithErrors: false` lässt Biome die Datei danach nicht mehr formatieren. Es tritt nichts an die Stelle: der Vorgabewert von Biome 2.5.9 ist `true` (`configuration_schema.json`, `FormatterConfiguration.trailingNewline`). Alle übrigen Schlüssel des Blocks bleiben unverändert.
  2. In `.editorconfig` unter `[*]` den Wert `insert_final_newline = false` auf `true` setzen, sonst nichts an der Datei. Der Kommentar zwei Zeilen darüber sagt bereits »a newline ending every file« und stimmt danach. Der Schritt gehört hierher, weil ihn die eigene Änderung erzwingt: `biome.json` setzt `useEditorconfig` nicht, Biome liest die Datei also gar nicht — Editoren tun es, und `.vscode/settings.json` schaltet `editor.formatOnSave` ein. Bliebe der Wert auf `false`, nähme der nächste Speichervorgang den Zeilenumbruch wieder heraus.
  3. `pnpm format` fahren (`biome format . --write`). Gemessen am 2026-08-26: genau 206 Dateien ändern sich, jede um denselben einen Zeilenumbruch am Ende. Jede andere Formatregel steht bereits erfüllt im Baum — `biome format .` meldet vor der Änderung null Korrekturen —, es kann also keine zweite Art von Änderung entstehen. Taucht doch eine auf, ist das ein Befund für den Report und keine Nebensache.
  4. Vier Textdateien liegen außerhalb der Dateiliste von Biome und bekommen ihren Zeilenumbruch von Hand ans Ende:
     - `README.md`
     - `packages/shadow-objects/CHANGELOG.md`
     - `packages/shadow-objects/src/distContract.files.txt`
     - `packages/shae-offscreen-canvas/src/distContract.files.txt`

     Die beiden Markdown-Dateien erreicht Biome 2.5.9 nicht (es bringt keinen Markdown-Formatter mit, und `**/CHANGELOG.md` steht zusätzlich unter `files.includes` als Ausschluss). Die beiden `.txt` sind keine Sprache, die Biome kennt. Bei den `.txt` ist die Frage geprüft und nicht vermutet: `packages/shadow-objects/src/distContract.spec.ts:76-80` und `packages/shae-offscreen-canvas/src/distContract.spec.js:66-70` lesen sie mit `.split('\n')`, `.map((line) => line.trim())` und `.filter((line) => line.length > 0)` — eine leere Schlusszeile fällt heraus, die erwartete Dateiliste bleibt dieselbe.
  5. Neun Dateien bleiben ohne finalen Zeilenumbruch, und das ist das Ergebnis und kein Rest. Drei sind binär: `docs/what-is-shadow-objects.webp`, `packages/shadow-objects/docs/architecture@2x.png`, `packages/shadow-objects/docs/architecture.afdesign`. Sechs sind Exporte eines Zeichenwerkzeugs, das sie beim nächsten Export wieder ohne Umbruch schreibt, und `biome.json` schließt `**/*.svg` ausdrücklich aus: `packages/shadow-objects/docs/shadow-theater.svg`, `packages/shadow-objects-e2e/public/vite.svg`, `packages/shadow-objects/src/view/ClassGraphOverview.drawio`, `packages/shadow-objects/src/view/ClassGraphOverview.drawio.svg`, `packages/shadow-objects/src/view/ComponentContext.drawio.svg`, `packages/shadow-objects/src/view/ShadowEnv.drawio.svg`. Keine dieser neun Dateien anfassen.
  6. Zwei Zählproben, beide gehören mit ihrer Ausgabe in den Report:
     - `pnpm exec biome format .` meldet »Checked 206 files … No fixes applied« und keinen Fehler.
     - Die Dateien ohne finalen Zeilenumbruch sind genau die neun aus Schritt 5:
       ```bash
       git ls-files | while IFS= read -r f; do [ -s "$f" ] && [ "$(tail -c1 "$f" | od -An -c | tr -d ' \n')" != '\n' ] && echo "$f"; done
       ```
  7. In der Wurzel-`CHANGELOG.md` einen neuen datierten Abschnitt ganz oben einfügen, über `## 2026-08-26 — the e2e suite runs against WebKit`, im Muster der Datei: Überschrift `## 2026-08-26 — every text file ends with a newline`, darunter je ein Bullet für `biome.json` und `.editorconfig`, das mit dem fett gesetzten Pfad in Backticks öffnet, wie es jeder Eintrag der Datei tut. Beide nennen den Schalter beim Namen und sagen, warum er weg ist beziehungsweise warum die zweite Datei mitzieht. Ein Changelog hält einen Übergang fest — das ist sein Zweck, und die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben. Keine Finding-ID. Die Datei selbst steht unter den Ausschlüssen von Biome, wird also nicht umformatiert, und behält ihren vorhandenen Zeilenumbruch am Ende.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: `pnpm lint` meldet weiterhin genau ein Info-Diagnostikum — `biome.json` und den Migrationsbefehl. Das ist der andere Teil desselben Findings und gehört Paket 2; Exit 0 bleibt. Jede andere Meldung ist neu und blockiert.
- Commit: `build(format): every file ends with a newline`
- Ergebnis: 1 Runde · BUILD-003 (Teil `formatter.trailingNewline`) behoben · `formatter.trailingNewline` aus `biome.json` gestrichen, `.editorconfig` auf `insert_final_newline = true`, 206 Dateien über `pnpm format`, 4 von Hand, die 9 ausgenommenen unberührt · kein Regressionstest (Werkzeugkonfiguration); Nachweis sind die beiden Zählproben: `biome format .` meldet »Checked 206 files … No fixes applied«, und ohne finalen Zeilenumbruch stehen genau die 9 erwarteten Dateien da · Review ohne kritischen, wichtigen oder kleinen Befund
- Nebenbefunde: keine
- Folgen: keine

**BUILD-003 · info · biome.json:57-58** — biome.json benutzt ein Feld, dessen Entfernung angekündigt ist

`linter.rules.recommended` ist in Biome 2.5.9 als deprecated markiert; das Werkzeug nennt `preset` als Nachfolger und kündigt die Entfernung für den nächsten Major an. Jeder Lauf von `pnpm lint` meldet dafür ein Info-Diagnostikum — heute das einzige Ergebnis eines ansonsten vollständig grünen Laufs über 196 Dateien, und damit genau die Art Rauschen, an die man sich gewöhnt. Daneben steht `formatter.trailingNewline: false`, eine Abweichung vom POSIX-Zeilenende, die keine Datei des Repositories begründet.

Empfehlung: `biome migrate` ausführen — das Werkzeug schlägt den Befehl selbst vor. Für `trailingNewline` entweder einen Satz in `CLAUDE.md`, der die Entscheidung trägt, oder den Standard zurücknehmen.

Beleg im Audit: Gemessen (2026-08-19): `biome check .` meldet »Checked 196 files … Found 1 info«, das Diagnostikum benennt `biome.json:57:13` und die Migration.

Zu diesem Paket gehört ausschließlich der zweite Satz der Beschreibung: `formatter.trailingNewline`. Der Standard wird zurückgenommen, das ist die zweite der beiden angebotenen Varianten. Der erste Satz — `linter.rules.recommended` und `biome migrate` — ist Paket 2.

### [x] 2. Biome-Konfiguration migrieren, toten Ausschluss entfernen
- Findings: BUILD-003 (Teil `linter.rules.recommended`), BUILD-007 (Teil `biome.json`)
- Ziel: `pnpm lint` läuft ohne Diagnostikum, und `biome.json` schließt kein Verzeichnis mehr aus, das es in diesem Repository nie gab.
- Bereich: `biome.json`
- Hängt ab von: 1
- Anmerkung: `turbo.json` fällt aus dem Paket. Die Empfehlung von BUILD-007 nennt `tests/**` unter `tasks.test.inputs` als dieselbe Attrappe — das geht am Code vorbei. turbo wertet `inputs` je Paket aus, und `packages/shadow-objects-e2e/tests/` existiert mit zwölf Playwright-Specs. Gemessen am 2026-08-26: `pnpm exec turbo run test --dry=json -F shadow-objects-e2e` führt für `shadow-objects-e2e#test` genau diese zwölf Dateien im Hash-Input, und sie kommen ausschließlich über `tests/**` herein — keine der übrigen zwölf Eingaben greift auf das Verzeichnis. Das Muster zu streichen nähme die gesamte E2E-Suite aus dem Cache-Schlüssel: eine geänderte Spec liefe danach gegen ein zwischengespeichertes Grün. Derselbe Eintrag steht aus demselben Grund unter `build.inputs` und `typecheck.inputs` und bleibt dort ebenfalls. Diese Widerlegung gehört wörtlich in die `Ergebnis:`-Zeile, sonst verbucht der Abschluss BUILD-007 als ganz behoben.
- Anmerkung: `biome migrate` schreibt `biome.json` **nicht** als Ganzes neu — gemessen am 2026-08-26 an einer Kopie ändert es genau eine Zeile. Die Gegenprobe aus Schritt 5 bleibt trotzdem stehen: sie kostet nichts und ist der einzige Weg zu merken, wenn dieses Paket Paket 1 still zurücknimmt.
- Hash: 6309e46
- Modell: mittlere Stufe
- Effort: low
- Dateien: `biome.json` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler, sondern eine Werkzeugkonfiguration. Den Nachweis führen die beiden Zählproben in Schritt 5 und der Verify-Lauf.
- Vorgehen:
  1. Im Wurzelverzeichnis `pnpm exec biome migrate --write` fahren. Gemessen am 2026-08-26 an einer Kopie von `biome.json` mit derselben Biome-Version (2.5.9): das Werkzeug ersetzt genau eine Zeile, `"recommended": true` wird zu `"preset": "recommended"`, an derselben Stelle im Block `linter.rules` (heute Zeile 59, der erste Schlüssel des Blocks). Sonst nichts — der Block `formatter` bleibt unberührt, `$schema` bleibt auf `2.5.9`, Einrückung und Reihenfolge bleiben. Anschließend `git diff biome.json` lesen und in den Report nehmen. Steht dort mehr als diese eine Zeile, ist das ein Befund und keine Nebensache.
  2. In `biome.json` unter `files.includes` die Zeile `"!packages/shadow-objects/tests",` streichen, heute Zeile 20. Sie steht mitten in der Liste, das Komma gehört zu ihr und geht mit; die Nachbarzeilen (`"!**/.claude",` davor, `"!packages/shadow-objects-e2e/dist",` danach) bleiben unverändert. Sonst nichts an der Liste. Der Nachweis, dass die Zeile tot ist, ist geprüft und nicht vermutet: `packages/shadow-objects/tests` existiert im Arbeitsbaum nicht, und `git log --all --name-only --pretty=format:` liefert für diesen Pfad null Treffer über die ganze Historie. Die Specs des Kernpakets liegen als `*.spec.ts` neben ihrer Quelle unter `src/` — die Konvention steht in `CLAUDE.md` und gilt für jede Datei des Pakets, ein `tests/` kann dort also auch nicht nachwachsen. Was es gibt, ist `packages/shadow-objects-e2e/tests/`, und das ist ein anderes Paket und wird von Biome geprüft.
  3. Drei Ausschlüsse in derselben Liste sehen ebenso tot aus und sind es nicht. Nicht anfassen:
     - `"!**/build"` (Zeile 13) — `packages/shadow-objects-e2e` räumt `build` in seinem `clean`-Skript ab, und `turbo.json` führt `build/**` unter den Ausgaben des `build`-Tasks.
     - `"!**/build-tmp"` (Zeile 14) — `tsconfig.json:6` und `packages/shadow-objects/tsconfig.json:6` deklarieren beide `"outDir": "./build-tmp"`.
     - `"!**/*.glsl"`, `"!**/*.vert"`, `"!**/*.frag"` (Zeilen 24-26) — stehen als Nebenbefund unter »Offene Befunde« und werden dort beschlossen, nicht hier.
  4. `turbo.json` bleibt unverändert. Begründung in der ersten Anmerkung; die Datei wird in diesem Paket nicht geöffnet.
  5. Zwei Zählproben, beide mit ihrer Ausgabe in den Report:
     - `pnpm exec biome check . --max-diagnostics 1000` meldet »Checked 219 files … No fixes applied« und **kein** Diagnostikum mehr. Vor der Änderung sind es dieselben 219 Dateien und »Found 1 info« (gemessen am 2026-08-26). Die Zahl der geprüften Dateien darf sich nicht bewegen — täte sie es, hätte der gestrichene Ausschluss doch etwas ausgeschlossen, und der Befund gehört in den Report statt in den Commit.
     - `pnpm exec biome format .` meldet weiterhin »No fixes applied«. Das ist der Beleg, dass die Migration `formatter.trailingNewline` nicht zurückgebracht hat und Paket 1 steht.
  6. In der Wurzel-`CHANGELOG.md` einen neuen datierten Abschnitt ganz oben einfügen, über `## 2026-08-26 — every text file ends with a newline`, mit der Überschrift `## 2026-08-26 — the lint configuration names only what exists`. Darunter zwei Bullets. Beide eröffnen im Muster der Datei mit dem Pfad, fett gesetzt und in Backticks, gefolgt von einem Doppelpunkt — dieselbe Form, die jeder Eintrag der Datei hat, und in beiden Fällen ist der Pfad `biome.json`:
     - Der erste nennt den Schlüsselwechsel `linter.rules.recommended` → `linter.rules.preset: "recommended"`, dass Biome 2.5.9 den alten Schlüssel als deprecated führt und seine Entfernung für den nächsten Major ankündigt, und dass `biome migrate` den Ersatz selbst schreibt.
     - Der zweite nennt den entfallenen Ausschluss `packages/shadow-objects/tests`, dass dieser Pfad in diesem Repository nicht existiert, weil das Kernpaket seine Specs neben der Quelle unter `src/` hält, und worin der Schaden eines stehenbleibenden Ausschlusses liegt: er nimmt ein Verzeichnis dieses Namens am Tag seiner Entstehung ohne Vorwarnung aus dem Lint.

     Ein Changelog hält einen Übergang fest, das ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben, und der Abschnitt vom selben Tag darüber ist das Vorbild. Keine Finding-ID. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: `pnpm lint` läuft ab jetzt stumm — das eine Info-Diagnostikum, das der Lauf von Paket 1 noch gemeldet hat, ist der behobene Teil dieses Pakets. Jede andere Meldung ist neu und blockiert. `biome.json` steht in `globalDependencies` von `turbo.json`, die Änderung entwertet also jeden turbo-Cache: `build`, `typecheck` und `test` laufen vollständig durch (Baseline 1m01s), das ist erwartet und kein Fehlersignal.
- Commit: `build(lint): migrate the biome rule preset, drop a dead exclusion`
- Ergebnis: 1 Runde · BUILD-003 (Teil `linter.rules.recommended`) behoben, `linter.rules.recommended: true` → `linter.rules.preset: "recommended"` (`biome.json:58`) · BUILD-007 zur Hälfte behoben: der Ausschluss `packages/shadow-objects/tests` ist aus `files.includes` gestrichen · Die andere Hälfte der Empfehlung — `tests/**` unter `tasks.test.inputs` in `turbo.json` — ist **gemessen widerlegt und bleibt bewusst stehen**: turbo wertet `inputs` je Paket aus, `packages/shadow-objects-e2e/tests/` existiert mit zwölf Playwright-Specs, und `pnpm exec turbo run test --dry=json -F shadow-objects-e2e` führt genau diese zwölf Dateien im Hash-Input, ausschließlich über `tests/**`. Das Muster zu streichen nähme die gesamte E2E-Suite aus dem Cache-Schlüssel; dieselbe Zeile unter `build.inputs` und `typecheck.inputs` bleibt aus demselben Grund. BUILD-007 ist damit nicht ganz behoben, sondern zur Hälfte behoben und zur Hälfte widerlegt · kein Regressionstest (Werkzeugkonfiguration); Nachweis sind die beiden Zählproben: `biome check . --max-diagnostics 1000` meldet »Checked 219 files … No fixes applied« ohne Diagnostikum bei unveränderter Dateizahl, und `biome format .` meldet weiterhin »No fixes applied«, Paket 1 steht also · Review ohne kritischen, wichtigen oder kleinen Befund
- Nebenbefunde: keine neuen · der Eintrag aus Zug 0 (`biome.json:24-26`, drei tote Shader-Endungen) steht unter »Offene Befunde«
- Folgen: keine

**BUILD-003 · info · biome.json:57-58** — biome.json benutzt ein Feld, dessen Entfernung angekündigt ist

`linter.rules.recommended` ist in Biome 2.5.9 als deprecated markiert; das Werkzeug nennt `preset` als Nachfolger und kündigt die Entfernung für den nächsten Major an. Jeder Lauf von `pnpm lint` meldet dafür ein Info-Diagnostikum — heute das einzige Ergebnis eines ansonsten vollständig grünen Laufs über 196 Dateien, und damit genau die Art Rauschen, an die man sich gewöhnt. Daneben steht `formatter.trailingNewline: false`, eine Abweichung vom POSIX-Zeilenende, die keine Datei des Repositories begründet.

Empfehlung: `biome migrate` ausführen — das Werkzeug schlägt den Befehl selbst vor. Für `trailingNewline` entweder einen Satz in `CLAUDE.md`, der die Entscheidung trägt, oder den Standard zurücknehmen.

Beleg im Audit: Gemessen (2026-08-19): `biome check .` meldet »Checked 196 files … Found 1 info«, das Diagnostikum benennt `biome.json:57:13` und die Migration.

Zu diesem Paket gehört ausschließlich der erste Satz der Beschreibung: `linter.rules.recommended` und der Weg über `biome migrate`. Der zweite — `formatter.trailingNewline` — ist mit Paket 1 (c93a26e) erledigt und wird hier nicht noch einmal angefasst; die Zeilenangabe `57-58` stammt aus dem Audit und zeigt seither auf 56-57, weil Paket 1 eine Zeile darüber entfernt hat. Die Zahl 196 im Beleg ist vom 2026-08-19; heute prüft Biome 219 Dateien.

**BUILD-007 · low · biome.json:20; turbo.json (tasks.test.inputs)** — Zwei Konfigurationen schließen ein Verzeichnis aus, das es nie gab

`biome.json` nimmt `packages/shadow-objects/tests` aus `files.includes` heraus, und `turbo.json` führt dieselbe Attrappe als `tests/**` unter den Eingaben des `test`-Tasks. Das Verzeichnis existiert im Arbeitsbaum nicht und hat in der Historie dieses Repositories nie existiert. Beide Einträge kosten nichts und tragen nichts; sie beschreiben eine Struktur, nach der jemand vergeblich sucht, und ein Verzeichnis dieses Namens, das später wirklich angelegt wird, wäre ohne Vorwarnung von Lint und Testeingaben ausgenommen.

Empfehlung: Beide Einträge entfernen. Soll ein Ausschluss bleiben, weil ein solches Verzeichnis geplant ist, gehört ein Kommentar daneben, der das sagt.

Zu diesem Paket gehört ausschließlich die erste Hälfte: der Eintrag in `biome.json`. Die zweite Hälfte ist gemessen widerlegt und wird nicht umgesetzt — siehe die erste Anmerkung oben.

### [x] 3. Coverage über beide vitest-Suiten zu einer Zahl
- Findings: Optimierung »Den Coverage-Bericht zu einer Aussage machen«, DX-004
- Ziel: Ein zusammengeführter Bericht über alle drei vitest-Suiten beantwortet, was heute zwei getrennte Zahlen und eine fehlende offenlassen.
- Bereich: `packages/shadow-objects-testing/`, `packages/shadow-objects/vitest.config.ts`, `packages/shadow-objects/vitest.setup.ts`, `packages/shae-offscreen-canvas/vitest.config.ts`, `scripts/mergeCoverage.mjs`, `package.json`, `pnpm-workspace.yaml`, `.github/workflows/ci.yml`, `CLAUDE.md`, `AGENTS.md`, Wurzel-`CHANGELOG.md`
- Hängt ab von: 2
- Anmerkung: Dieses Paket ist zugleich das Sicherungsnetz für die Pakete 4 bis 9 — es macht sichtbar, was die Umbauten dort überhaupt abdecken.
- Anmerkung (Abgleich, 2026-08-26): Der Satz des Audits, `ShaeEntElement.ts` bekomme »zum ersten Mal« eine Zahl, ist gemessen falsch und wird nicht übernommen. Die Kern-Suite deckt die Datei heute zu 57,75 % der Statements ab (sie wird über `elements.ts` mitgeladen, ohne eigene Spec). Richtig ist die Größenordnung des Gewinns: mit der Browser-Suite dazu steht dieselbe Datei bei 97,06 % der Statements und 100 % der Zeilen. Auch die Zahl »drei« stimmt so nicht — es gibt heute zwei Berichte (Kern, Canvas) und eine Suite ohne jeden.
- Anmerkung (Weg, gemessen 2026-08-26): Die Empfehlung des Audits — »die Browser-Suite mit `--coverage` laufen lassen und beide Roh-Berichte zusammenführen« — trägt so nicht. Gemessen: `vitest --run --coverage` in `shadow-objects-testing` liefert genau vier Dateien, nämlich die eigenen Testhilfen unter `src/`; von der Bibliothek kommt nichts an. Zwei Sperren liegen davor, und beide müssen fallen. Erstens optimiert vite `@spearwolf/shadow-objects` als Dependency vor und bündelt sie in einen Chunk, für den es keine Zuordnung mehr gibt. Zweitens steht `coverage.allowExternal` auf `false`: `isIncluded()` verwirft jede Datei, die nicht unter dem Root des laufenden Pakets liegt, und die Bibliothek liegt im Nachbarpaket. Mit `optimizeDeps.exclude` und `allowExternal: true` kommen 46 Bibliotheksdateien im Bericht an — und zwar als `packages/shadow-objects/src/**/*.ts`, weil `build.mjs` mit `sourcemap: true` transpiliert und der v8-Provider über die Sourcemap zurückrechnet. Die Suite läuft dabei weiter gegen das gebaute `dist/`, testet also unverändert das, wofür es sie gibt.
- Anmerkung (verworfen): Die Alternative, `@spearwolf/shadow-objects` in der Testing-Suite per `resolve.alias` auf `packages/shadow-objects/src/*.ts` zu legen, wurde gebaut und gemessen: 379 Tests grün, 50 Dateien, Statement-Summe 3175 gegen 3176 auf dem gewählten Weg — im Ergebnis dasselbe. Sie fällt trotzdem weg, weil die Integrationssuite dann still aufhört, das Build-Ergebnis zu prüfen, während von außen alles unverändert aussieht. Ein Unterschied zwischen Quelle und esbuild-Ausgabe fiele danach nur noch der E2E-Strecke auf.
- Hash: 70d8464
- Modell: mittlere Stufe
- Effort: medium
- Dateien: `packages/shadow-objects-testing/vitest.config.ts` · `packages/shadow-objects-testing/package.json` · `packages/shadow-objects-testing/turbo.json` (entfällt) · `packages/shadow-objects/vitest.config.ts` · `packages/shadow-objects/vitest.setup.ts` · `packages/shae-offscreen-canvas/vitest.config.ts` · `scripts/mergeCoverage.mjs` (neu) · `package.json` · `pnpm-workspace.yaml` · `pnpm-lock.yaml` (über `pnpm install`) · `.github/workflows/ci.yml` · `CLAUDE.md` · `AGENTS.md` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler, sondern erweitert die Werkzeugkette. Den Nachweis führen die vier Zählproben in Schritt 12 und der Verify-Lauf.
- Vorgehen:
  1. In `pnpm-workspace.yaml` drei Einträge in den `catalog:`-Block aufnehmen. Der Block ist nach Zweck gruppiert und nicht alphabetisch; die drei gehören ans Ende der Gruppe `# --- test ---`, also hinter `'@esm-bundle/chai': 4.3.4-fix.0` und vor die Leerzeile, die `# --- e2e ---` einleitet. Mit einer Kommentarzeile darüber im Stil der Nachbargruppen, die sagt, wer sie benutzt — `scripts/mergeCoverage.mjs` — und dass die Ranges bewusst dieselben sind, die `@vitest/coverage-v8@4.1.10` selbst deklariert, damit die Installation auf die bereits im Baum liegenden Kopien auflöst statt eine zweite Version danebenzustellen:

     ```yaml
     istanbul-lib-coverage: ^3.2.2
     istanbul-lib-report: ^3.0.1
     istanbul-reports: ^3.2.0
     ```

     Keine der drei ist ein Holdback; der Kommentar sagt, wozu sie da sind, nicht wovon sie zurückgehalten werden.
  2. In der Wurzel-`package.json` dieselben drei als `"istanbul-lib-coverage": "catalog:"`, `"istanbul-lib-report": "catalog:"`, `"istanbul-reports": "catalog:"` unter `devDependencies` aufnehmen (alphabetisch, zwischen `happy-dom` und `leasot`). Sie liegen heute nur transitiv im Baum; ein Skript dieses Repositories, das sich darauf verlässt, hinge an der Abhängigkeitsliste eines fremden Pakets.
  3. In `packages/shadow-objects-testing/package.json` unter `devDependencies` `"@vitest/coverage-v8": "catalog:"` aufnehmen (hinter `@vitest/browser-playwright`, die Liste ist alphabetisch), und das `test`-Skript von `vitest --run` auf `vitest --run --coverage` setzen. `watch` bleibt ohne Coverage, wie in den beiden anderen Paketen auch. Die Deklaration folgt `packages/shae-offscreen-canvas`, das `@vitest/coverage-v8` ebenfalls selbst führt.
  4. `packages/shadow-objects-testing/vitest.config.ts`: einen `optimizeDeps`-Block auf oberster Ebene ergänzen (Geschwisterschlüssel von `test`), und in `test` einen `coverage`-Block. Exakt so, die Reihenfolge der Schlüssel wie hier:

     ```ts
     optimizeDeps: {
       // The library has to reach the browser as individual modules, not as a
       // pre-bundled dependency chunk: coverage is attributed per module, and a
       // chunk has no module to attribute it to. Excluding it hands its own
       // dependencies to vite as newly discovered ones mid-run, which reloads the
       // page and drops the specs that were importing at that moment — so they are
       // named up front. The `a > b` form is what reaches a dependency of a
       // dependency; a bare name does not resolve from this package.
       exclude: ['@spearwolf/shadow-objects'],
       include: [
         '@spearwolf/shadow-objects > @spearwolf/signalize',
         '@spearwolf/shadow-objects > @spearwolf/signalize/decorators',
         '@spearwolf/shadow-objects > @spearwolf/eventize',
       ],
     },
     ```

     ```ts
     coverage: {
       provider: 'v8',
       // Only the raw report: the merged one under `coverage/` in the repository
       // root is what this suite's numbers are for, and it is written by
       // `scripts/mergeCoverage.mjs`.
       reporter: ['json'],
       // turbo's `test.outputs`, the CI artifact upload, `.gitignore` and this path
       // all name the same directory — change one, change all four.
       reportsDirectory: './coverage',
       // The files under test live in the neighbouring package, and everything
       // outside this package's root is dropped without this.
       allowExternal: true,
       // The suite imports the built package, so the pattern names the build
       // output. What lands in the report are the `src/**/*.ts` the build was made
       // from — the v8 provider follows the source maps back. The four helpers
       // under this package's own `src/` are test scaffolding and stay out.
       include: ['packages/shadow-objects/dist/src/**/*.js'],
     },
     ```

     Sonst nichts an der Datei: `globals`, `include`, `globalSetup`, `setupFiles` und der `browser`-Block bleiben unverändert.
  5. `packages/shadow-objects-testing/turbo.json` löschen. Die Datei existiert allein, um `test.outputs` auf `[]` zu setzen, weil das Paket kein `coverage/**` schrieb; ab Schritt 4 schreibt es welches, und die Wurzel-Deklaration `outputs: ["coverage/**"]` ist die richtige. Bliebe die Überschreibung stehen, verlöre der Bericht bei jedem Cache-Treffer seinen Inhalt und der Zusammenführungsschritt liefe ins Leere. `packages/shadow-objects-e2e/turbo.json` bleibt, wie es ist. Die Wurzel-`turbo.json` wird in diesem Paket nicht angefasst: `test.outputs` nennt bereits `coverage/**`, und `test.inputs` braucht keinen Eintrag für das gebaute `dist/` des Kernpakets — `shadow-objects-testing#test` hängt über `dependsOn: ["^build", "build"]` an `@spearwolf/shadow-objects#build`, und dessen Hash steckt damit schon im Hash dieser Aufgabe (gemessen mit `turbo run test --dry=json -F shadow-objects-testing`).
  6. In `packages/shadow-objects/vitest.config.ts` und `packages/shae-offscreen-canvas/vitest.config.ts` je `coverage.reporter` von `['text', 'html']` auf `['text', 'html', 'json']` erweitern. Nur der eine Wert; alle übrigen Schlüssel und alle Kommentare bleiben unangetastet. Ohne den `json`-Reporter liegt kein `coverage-final.json` auf der Platte, und genau das ist die Eingabe der Zusammenführung — nachgesehen am 2026-08-26: in beiden `coverage/`-Verzeichnissen liegt heute ausschließlich der HTML-Bericht. `text` bleibt bewusst stehen: ein Lauf über ein einzelnes Paket ist ein normaler Arbeitsgang, und ihm die Konsolenausgabe zu nehmen, nur damit der Gesamtlauf aufgeräumter aussieht, wäre der schlechtere Tausch.
  7. `scripts/mergeCoverage.mjs` neu anlegen, mit genau diesem Inhalt (Hauskonvention der Nachbarskripte: ESM, `node:`-Protokoll, einfache Anführungszeichen, kein Bracket-Spacing, zwei Leerzeichen Einrückung):

     ```js
     // Merges the v8 coverage of the three vitest suites into one report for the whole
     // workspace. The suites run in different environments over overlapping files: the
     // unit specs of packages/shadow-objects exercise the library under happy-dom,
     // packages/shadow-objects-testing exercises the same files through the built
     // package in real Chromium, and packages/shae-offscreen-canvas covers its own
     // source. On its own none of the three says how much of the library any test
     // touches.
     //
     // Each suite writes a raw `coverage-final.json` next to its HTML report. Those are
     // declared turbo outputs, so they are on disk after a cache hit as well. The root
     // `test`, `test:ci`, `cbt` and `ci` scripts run this afterwards.
     //
     // A merged file can score a fraction below the better of its two inputs. The two
     // runs transform the same source through different pipelines, so their statement
     // maps differ slightly and the merge takes the union: a location only one side
     // knows enters the denominator with only that side's hits. Measured across the
     // library it costs 42 statements on 3182, and it is the price of one number
     // instead of two.

     import {existsSync, readFileSync} from 'node:fs';
     import path from 'node:path';
     // These three are CommonJS; a named import does not resolve against them.
     import libCoverage from 'istanbul-lib-coverage';
     import libReport from 'istanbul-lib-report';
     import reports from 'istanbul-reports';

     const projectRoot = path.resolve(process.cwd());

     const SUITES = [
       {dir: 'packages/shadow-objects', command: 'pnpm -F @spearwolf/shadow-objects test'},
       {dir: 'packages/shadow-objects-testing', command: 'pnpm -F shadow-objects-testing test'},
       {dir: 'packages/shae-offscreen-canvas', command: 'pnpm -F @spearwolf/shae-offscreen-canvas test'},
     ];

     const coverageMap = libCoverage.createCoverageMap({});

     for (const {dir, command} of SUITES) {
       const file = path.resolve(projectRoot, dir, 'coverage', 'coverage-final.json');
       if (!existsSync(file)) {
         console.error(`no coverage report at ${path.relative(projectRoot, file)} -- run \`${command}\` first`);
         process.exit(1);
       }
       const suite = libCoverage.createCoverageMap(JSON.parse(readFileSync(file, 'utf8')));
       console.log(`${dir}: ${suite.files().length} files`);
       coverageMap.merge(suite);
     }

     const context = libReport.createContext({
       dir: path.resolve(projectRoot, 'coverage'),
       coverageMap,
       defaultSummarizer: 'nested',
     });

     reports.create('text-summary').execute(context);
     reports.create('html').execute(context);
     ```

     Ein fehlender Bericht bricht ab und nennt das Kommando, das ihn erzeugt. Das ist Absicht: eine Zahl, der stillschweigend eine Suite fehlt, ist schlechter als keine. Der Abbruch trifft nur den Aufruf von Hand nach einem Teillauf — die Wurzel-Skripte verketten mit `&&` und kommen gar nicht erst hierher, wenn eine Suite rot war.
  8. In der Wurzel-`package.json` die Skripte anpassen. `"coverage": "node scripts/mergeCoverage.mjs"` neu aufnehmen, direkt hinter `"typecheck"`. Dann vier vorhandene Zeilen erweitern:
     - `"test": "turbo run test && pnpm coverage"`
     - `"test:ci": "turbo run test --filter=!shadow-objects-e2e && pnpm coverage"`
     - `"cbt": "pnpm clean && turbo run build test && pnpm coverage"`
     - `"ci": "turbo run build typecheck test --filter=!shadow-objects-e2e && pnpm coverage && turbo run typecheck --filter=shadow-objects-e2e && pnpm lint:ci"` — die Zusammenführung steht unmittelbar hinter dem Aufruf, der die Suiten fährt, und nicht am Ende: sie gehört zum Testschritt, nicht zum Lint.

     Außerdem `"clean"` um das neue Verzeichnis erweitern: `"clean": "turbo run clean && rimraf dist coverage node_modules/.cache .turbo"`. Ohne das räumt `pnpm clean` die drei Paketberichte ab und lässt den zusammengeführten als einzigen, dann falschen, stehen.
  9. In `.github/workflows/ci.yml` im Schritt »Upload coverage report« die Pfadliste um `coverage/` ergänzen, als erste Zeile über den beiden vorhandenen. Der Kommentar zwei Zeilen darüber bleibt richtig und unverändert.
  10. `.gitignore` bleibt unangetastet. Die vorhandene Zeile `coverage/` (Zeile 31) greift auf jeder Ebene und deckt das neue Wurzelverzeichnis mit ab — nachgesehen, keine zweite Zeile eintragen.
  11. `packages/shadow-objects/vitest.setup.ts`: den vorhandenen Kommentarblock über dem Storage-Ersatz stehen lassen und unter ihn, vor die Zeile `const isNode = …`, einen zweiten Absatz setzen. Er hält das fest, was heute nur an der Fundstelle sichtbar ist und nach einer Node-Aktualisierung sonst neu erforscht werden müsste — Inhalt, nicht Wortlaut:
      - Diese eine Datei ist `setupFiles` von drei vitest-Konfigurationen: `packages/shadow-objects` (happy-dom), `packages/shadow-objects-testing` (Browser-Modus) und `packages/shae-offscreen-canvas` (happy-dom).
      - Der Ersatz ist ein globaler Eingriff an einem Objekt, das die geprüfte Bibliothek selbst liest: `utils/ConsoleLogger.ts` sucht in einer IIFE auf Modulebene einmalig nach einem brauchbaren `Storage` und hält das Ergebnis in einer Modulkonstante. Ob er den Ersatz sieht, hängt daran, dass diese Datei vor dem ersten Import jenes Moduls läuft — das leistet `setupFiles`.
      - Die Bedingung `isNode && storageIsAccessor` ist die Stelle, an der eine Node-Aktualisierung ankommt. Legt Node sein `localStorage` eines Tages als Datenfeld statt als Getter an, wird `storageIsAccessor` falsch, der Ersatz unterbleibt wortlos, und jede Spec, die ein funktionierendes `localStorage` braucht, fällt auf einmal aus. Was dann zu tun ist, hängt davon ab, was Node dort ablegt: ein brauchbares `Storage` braucht keinen Ersatz und dieser Block kann gehen; ein weiterhin inertes, nur anders geformtes verlangt eine Bedingung, die auf Benutzbarkeit prüft statt auf die Form des Deskriptors.

      Keine Finding-ID, kein Rückblick auf einen Vorzustand. Englisch, wie die ganze Datei.
  12. Vier Zählproben, alle mit ihrer Ausgabe in den Report:
      - `pnpm -F shadow-objects-testing test` (nach einem `pnpm build` — die Suite importiert das gebaute Paket, und ohne turbo davor baut sie niemand) meldet 27 Testdateien und 379 Tests grün und schreibt `packages/shadow-objects-testing/coverage/coverage-final.json` mit genau 46 Einträgen. Jeder Schlüssel darin beginnt mit `<repo>/packages/shadow-objects/src/` und endet auf `.ts`; taucht auch nur ein Pfad mit `/dist/` darin auf, ist die Rückrechnung über die Sourcemaps nicht gelaufen und der Befund gehört in den Report statt in den Commit.
      - `pnpm coverage` meldet die drei Zeilen `packages/shadow-objects: 55 files`, `packages/shadow-objects-testing: 46 files`, `packages/shae-offscreen-canvas: 17 files` und darunter eine Zusammenfassung von 92,91 % Statements (3384/3642) und 94,63 % Lines. Gemessen am 2026-08-26 auf dem Stand von Paket 2. Abweichungen von wenigen Zehntelprozent sind kein Fehler — eine Abweichung um Größenordnungen oder eine andere Dateizahl schon.
      - `coverage/index.html` in der Wurzel führt zwei Einträge: `shadow-objects/src` bei 94,16 % und `shae-offscreen-canvas/src` bei 83,25 %.
      - `git status --porcelain` bleibt nach allen Läufen frei von `coverage`-Pfaden.
  13. In der Wurzel-`CHANGELOG.md` einen neuen datierten Abschnitt ganz oben einfügen, über `## 2026-08-26 — the lint configuration names only what exists`, mit der Überschrift `## 2026-08-26 — one coverage number for the whole workspace`. Darunter drei Bullets, jedes im Muster der Datei mit dem fett gesetzten Pfad in Backticks und einem Doppelpunkt eröffnet:
      - `scripts/mergeCoverage.mjs`: was es tut, wo der Bericht landet, und dass `test`, `test:ci`, `cbt` und `ci` es fahren.
      - `packages/shadow-objects-testing/vitest.config.ts`: dass die Suite jetzt Coverage erhebt, warum die Bibliothek dafür am Dependency-Vorbündeln vorbeigeführt wird, und dass die Zahlen über die Sourcemaps auf `src/**/*.ts` landen.
      - `package.json`: das neue `coverage`-Skript und die drei istanbul-Abhängigkeiten.

      Der Wegfall von `packages/shadow-objects-testing/turbo.json` gehört in den ersten oder zweiten Bullet, nicht in einen eigenen. Keine Finding-ID. Kein Eintrag in einem Paket-CHANGELOG: keine Laufzeit-API, kein Verhalten, keine `dist/`-Form bewegt sich.
  14. `CLAUDE.md` nachziehen, fünf Stellen:
      - Zeile 53, Aufzählungspunkt `packages/shadow-objects-testing`: `pnpm test` fährt jetzt `vitest --run --coverage`; der Roh-Bericht landet in `packages/shadow-objects-testing/coverage/` und geht in die Zusammenführung.
      - Zeile 57, Absatz »Coverage«: vollständig neu schreiben. Er sagt heute, eine Zusammenführung finde nicht statt; ab jetzt sagt er, wie sie zustande kommt — drei Suiten, drei Roh-Berichte, `pnpm coverage` als Zusammenführung, der Bericht in `coverage/` in der Wurzel, weiterhin keine Schwellwerte. Dazu die beiden Dinge, die sonst niemand herleitet: dass die Browser-Suite über `optimizeDeps.exclude` und `allowExternal` überhaupt erst Zahlen liefert, und dass ein zusammengeführter Wert um Bruchteile unter dem besseren seiner Eingaben liegen kann. `packages/shadow-objects-e2e` bleibt draußen, mit der bisherigen Begründung.
      - Zeile 59, Absatz zu `vitest.setup.ts`: um den Satz ergänzen, dass die Reihenfolge zwischen Setup und dem ersten Import von `ConsoleLogger` mitentscheidet und dass die Bedingung im Setup die Stelle ist, an der eine Node-Aktualisierung ankommt.
      - Zeile 123, Absatz über die beiden Paket-`turbo.json`: es ist nur noch eine, `packages/shadow-objects-e2e`. Der Rest des Absatzes — Feld-Merge, die beiden Warnungen — gilt unverändert und bleibt.
      - Die Kommandotabelle im Abschnitt »Commands«: eine Zeile `pnpm coverage` ergänzen, hinter `pnpm lint:ci`, und bei `pnpm cbt`, `pnpm test` und `pnpm test:ci` vermerken, dass die Zusammenführung mitläuft.
  15. `AGENTS.md`, Zeile 96 (Aufzählungspunkt »Coverage« unter »Testing«): neu schreiben, kürzer als der Absatz in `CLAUDE.md` und aus derselben Wahrheit — drei Suiten laufen mit `--coverage`, `pnpm coverage` führt sie zu einem Bericht in `coverage/` zusammen, keine Schwellwerte, `packages/shadow-objects-e2e` ist Playwright und bleibt außen vor. Danach `AGENTS.md` einmal ganz auf Aussagen zur Testabdeckung durchsehen, die dadurch schief geworden sind.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: `pnpm install` muss vor dem Verify gelaufen sein (Schritte 1-3 ändern Manifeste), und `pnpm-lock.yaml` wandert dabei mit in den Commit. Drei Dinge entwerten den turbo-Cache vollständig und lassen alles neu laufen — `pnpm-lock.yaml` und `pnpm-workspace.yaml` stehen in `globalDependencies`, und `scripts/**` ebenfalls, wohin die neue Datei kommt. Das ist erwartet und kein Fehlersignal. `pnpm test` endet ab jetzt mit den drei Dateizahlen und der zusammengeführten Zusammenfassung; die drei Paket-Textberichte davor bleiben. `pnpm lint` bleibt stumm — das neue Skript wird von Biome formatiert und geprüft, `**/coverage` steht bereits unter den Ausschlüssen. Der Quelltext in Schritt 7 ist auf Inhalt hin geschrieben, nicht auf Biomes Zeilenumbrüche: einmal `pnpm format` darüber, bevor der Verify läuft, und was Biome dabei umbricht, ist keine Abweichung. Die E2E-Strecke ist unberührt.
- Commit: `build(test): merge the coverage of all three vitest suites into one report`
- Ergebnis: 1 Runde · Optimierung »Den Coverage-Bericht zu einer Aussage machen« erfüllt: `scripts/mergeCoverage.mjs` führt die Roh-Berichte der drei vitest-Suiten zu einem Bericht unter `coverage/` in der Wurzel zusammen, `pnpm coverage` fährt ihn, und `test`, `test:ci`, `cbt` und `ci` hängen ihn an. Die Browser-Suite erhebt dafür erstmals Coverage — der Weg dorthin ist nicht der des Audits, sondern `optimizeDeps.exclude` plus `coverage.allowExternal: true`, siehe die Anmerkung (Weg) oben · DX-004 erfüllt ohne Codeänderung, wie die Empfehlung es verlangt: der Sachverhalt steht jetzt als Kommentarabsatz an der Fundstelle (`packages/shadow-objects/vitest.setup.ts`) und als Absatz in `CLAUDE.md` · kein Regressionstest (Werkzeugkette); Nachweis sind die vier Zählproben: `pnpm -F shadow-objects-testing test` 27 Testdateien / 379 Tests grün mit 46 Einträgen in `coverage-final.json`, alle unter `packages/shadow-objects/src/**/*.ts` und kein `/dist/`-Pfad; `pnpm coverage` meldet 55 / 46 / 17 Dateien und 92,91 % Statements (3384/3642), 94,63 % Lines; `coverage/index.html` führt `shadow-objects/src` mit 94,16 % und `shae-offscreen-canvas/src` mit 83,25 %; `git status --porcelain` bleibt frei von `coverage`-Pfaden · Review ohne kritischen oder wichtigen Befund · klein: der Wegfall von `packages/shadow-objects-testing/turbo.json` steht im dritten statt im ersten oder zweiten Bullet des CHANGELOG-Abschnitts; klein: die Zeile `pnpm coverage` steht in der Kommandotabelle von `CLAUDE.md` hinter `pnpm test:ci` statt hinter `pnpm lint:ci`. Beides ist inhaltlich richtig und nur anders platziert, als Schritt 13 und 14 es vorgaben
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `pnpm coverage` neu in der Wurzel (`node scripts/mergeCoverage.mjs`); `pnpm test`, `pnpm test:ci`, `pnpm cbt` und `pnpm ci` hängen die Zusammenführung an und brechen ab, wenn einer der drei Roh-Berichte fehlt · `pnpm clean` räumt zusätzlich `coverage` in der Wurzel ab · `packages/shadow-objects-testing` fährt sein `test`-Skript ab jetzt mit `--coverage` und führt `@vitest/coverage-v8` selbst; seine `turbo.json` ist entfallen, für dieses Paket gilt wieder die Wurzel-Deklaration `test.outputs: ["coverage/**"]` · `packages/shadow-objects` und `packages/shae-offscreen-canvas` schreiben neben dem HTML-Bericht ein `coverage-final.json` · drei neue devDependencies in der Wurzel: `istanbul-lib-coverage`, `istanbul-lib-report`, `istanbul-reports`, alle über den `catalog:`

**Optimierung · »Den Coverage-Bericht zu einer Aussage machen«**

Die Browser-Suite mit --coverage laufen lassen und beide Roh-Berichte zusammenführen. Danach beantwortet eine Zahl, was heute drei Zahlen offenlassen — und die 844 Zeilen von ShaeEntElement.ts bekommen zum ersten Mal eine.

Zum Abgleich am Code: Der Halbsatz über `ShaeEntElement.ts` und die Zahl »drei« stimmen nicht, siehe die erste Anmerkung. Der Kern der Empfehlung — eine Zahl statt mehrerer — trägt und wird umgesetzt; der Weg dorthin ist ein anderer als »einfach `--coverage` anschalten«, siehe die zweite.

**DX-004 · info · packages/shadow-objects/vitest.setup.ts:1-23** — Ein globaler localStorage-Patch in vitest.setup.ts

Die Setup-Datei ersetzt localStorage und sessionStorage auf globalThis durch die Storage-Objekte einer eigens gebauten happy-dom-Window-Instanz, weil Node ab 24 dort inerte Stubs mitbringt, die happy-doms Storage verdecken. Sie wird von drei Packages geteilt und läuft damit auch im Browser-Modus, wo sie durch die typeof-Prüfung fällt. Der Eingriff ist korrekt und kommentiert; er bleibt ein globaler Patch an einem Objekt, das die zu prüfende Bibliothek selbst benutzt — ConsoleLogger prüft die Storage-Fähigkeit beim Modulstart, also genau einmal, und die Reihenfolge zwischen Setup und erstem Import entscheidet mit.

Empfehlung: Keine Änderung nötig, solange die Suite grün ist. Der Punkt gehört ins Backlog, damit ein künftiger Fehlschlag, der nach einer Node-Aktualisierung genau hier ansetzt, nicht neu erforscht werden muss.

Zum Abgleich am Code: Der Sachverhalt besteht unverändert, die Zeilenangabe zeigt heute auf 3-28. Zwei Kleinigkeiten der Beschreibung sind überholt: die Bedingung ist keine `typeof`-Prüfung mehr, sondern `isNode && storageIsAccessor` über die Form des Property-Deskriptors, und ein Backlog gibt es in diesem Repository nicht mehr (`bfcc54b`). Die Empfehlung bleibt richtig — keine Codeänderung —, ihr Ablageort wird der Kommentar an der Fundstelle plus der Absatz in `CLAUDE.md`. Das ist der dauerhafteste Platz, den dieses Repository für den Punkt hat.

### [x] 4. `noUncheckedIndexedAccess` einschalten
- Findings: TYPE-002 (Teil 1)
- Ziel: Indexzugriffe, die der Typprüfer heute für sicher hält, tragen ihre Bedingung im Typ statt in der Schleife daneben.
- Bereich: `tsconfig.json`, `packages/shadow-objects/src/{in-the-dark,utils,view,worker}/` — 5 Produktionsdateien, 8 Specs
- Hängt ab von: 3
- Anmerkung (Abgleich, 2026-08-26): Der Sachverhalt besteht unverändert, und die Zahl aus »Entscheidungen« stimmt auf den Fehler genau. `pnpm exec tsc -p tsconfig.json --noEmit --noUncheckedIndexedAccess` in `packages/shadow-objects`: 139 Fehler in 13 Dateien. Fünf davon sind Produktion und tragen zusammen 12 Fehler — `view/RemoteWorkerEnv.ts` (4), `view/ComponentContext.ts` (3), `utils/generateUUID.ts` (2), `in-the-dark/Kernel.ts` (1), `in-the-dark/Entity.ts` (1). Die übrigen 127 verteilen sich auf acht Specs: `in-the-dark/Kernel.spec.ts` (58), `worker/MessageRouter.spec.ts` (26), `utils/FrameLoop.spec.ts` (13), `view/ComponentChanges.spec.ts` (8), `view/ShadowEnv.spec.ts` (6), `view/RemoteWorkerEnv.spec.ts` (6), `in-the-dark/ShadowObjectCreationScope.spec.ts` (6), `in-the-dark/Entity.spec.ts` (4). Die Beispielstelle des Audits — `this.#children[i - 1].order` in `Entity.#insertChildInOrder` — steht heute auf `Entity.ts:318` und ist einer der zwölf.
- Anmerkung (Reichweite, gemessen 2026-08-26): Der Schalter gehört in die Wurzel-`tsconfig.json` und kostet dort nichts über das Kernpaket hinaus. `packages/shadow-objects-e2e` erbt dieselbe Datei und ist unter dem Schalter bereits fehlerfrei — gemessen: 0 Fehler. `packages/shae-offscreen-canvas` und `packages/shadow-objects-testing` führen weder ein `typecheck`-Skript noch eine eigene `tsconfig.json`; kein `tsc` erfasst sie. Der Schalter erreicht damit genau zwei Projekte, und eins davon ist schon still.
- Anmerkung (Oberfläche, gemessen 2026-08-26): Der Schalter bewegt die ausgelieferten Deklarationen nicht. `tsc -p tsconfig.lib.json` einmal mit und einmal ohne ihn in zwei getrennte Verzeichnisse emittiert, `diff -r` darüber: identisch. Es ist also keine Änderung der öffentlichen API — kein `docs/`, kein `README.md`, und nach der Regel im Kopf von `packages/shadow-objects/CHANGELOG.md` (»Build-system, monorepo, lint/format, and dev-workflow changes that don't affect the shipped package are tracked in the top-level `CHANGELOG.md`«) auch kein Eintrag im Paket-Changelog. Der Eintrag geht ausschließlich in die Wurzel-`CHANGELOG.md`. Nachgesehen und nicht vermutet: keine Datei unter `docs/`, in `README.md`, `CLAUDE.md` oder `AGENTS.md` behauptet etwas über die Strictness-Schalter der `tsconfig.json`, es zieht also nichts nach.
- Anmerkung (Hausform, nachgesehen 2026-08-26): Die Nicht-Null-Assertion ist in diesem Repository die eingeführte Form und keine Notlösung, die dieses Paket einführen müsste. `biome.json` stellt `style.noNonNullAssertion` ausdrücklich auf `"off"`, und sechs Produktionsdateien des Kernpakets benutzen sie bereits — `view/ComponentChanges.ts`, `view/ViewComponent.ts`, `view/ShadowEnv.ts`, `view/ComponentMemory.ts`, `view/ComponentContext.ts`, `utils/waitForMessageOfType.ts` —, dazu ein halbes Dutzend Specs. Es ist nichts zu beschließen.
- Hash: 40d550b
- Ergebnis: Der Implementierer lief sauber durch (Exit 0), sein Runner-Zug war danach aufgebraucht. Review, Verify und Commit hat der Orchestrator nachgeholt. Verify grün: `pnpm build` ✓ · `pnpm typecheck` ✓ · `pnpm lint` »Checked 219 files … No fixes applied« · Tests 801/379/123/645, deckungsgleich mit der Baseline. Coverage 92,89 % (3385/3644) gegen 92,91 % (3384/3642) vor dem Paket — die zwei zusätzlichen Statements sind der neue `hex()`-Helfer. Keine Nebenbefunde, keine Folgen.
- Modell: mittlere Stufe
- Effort: medium
- Dateien: `tsconfig.json` · `packages/shadow-objects/src/in-the-dark/Entity.ts` · `packages/shadow-objects/src/in-the-dark/Kernel.ts` · `packages/shadow-objects/src/utils/generateUUID.ts` · `packages/shadow-objects/src/view/ComponentContext.ts` · `packages/shadow-objects/src/view/RemoteWorkerEnv.ts` · `packages/shadow-objects/src/in-the-dark/Entity.spec.ts` · `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts` · `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts` · `packages/shadow-objects/src/utils/FrameLoop.spec.ts` · `packages/shadow-objects/src/view/ComponentChanges.spec.ts` · `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts` · `packages/shadow-objects/src/view/ShadowEnv.spec.ts` · `packages/shadow-objects/src/worker/MessageRouter.spec.ts` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler, sondern schärft eine Compileroption. Kein Laufzeitverhalten bewegt sich — eine Assertion und eine Tupel-Annotation verschwinden beim Transpilieren rückstandslos. Den Nachweis führen die beiden Zählproben in Schritt 6 und der Verify-Lauf. Fällt beim Durchgehen doch ein echter Korrektheitsfehler an (Schritt 2 sagt, woran er erkennbar ist), gehört er in den Report und nicht in diesen Commit.
- Vorgehen:
  1. Die Fehlerliste erzeugen und als Arbeitsgrundlage behalten. Aus `packages/shadow-objects`:

     ```bash
     pnpm exec tsc -p tsconfig.json --noEmit --noUncheckedIndexedAccess
     ```

     Erwartet sind die 139 Fehler in 13 Dateien aus der Anmerkung oben. Eine andere Zahl heißt, dass sich der Code seit dem 2026-08-26 bewegt hat; dann gehört die neue Zahl in den Report, und die Regeln unten gelten unverändert weiter, weil sie an der Form der Fundstelle hängen und nicht an ihrer Zeilennummer. Dasselbe Kommando ist am Ende die Abnahme: es muss stumm werden. Der Schalter steht bis Schritt 5 ausschließlich auf der Kommandozeile — so bleibt `pnpm typecheck` zwischen den Schritten grün.
  2. **Die Regel, die über allen anderen steht.** Eine Nicht-Null-Assertion (`!`) setzt du nur dort, wo der Index an der Fundstelle nachweisbar innerhalb der Grenzen liegt: eine Schleifenbedingung, die ihn hält, eine Länge, aus der er gerechnet ist, ein Literal in einem Tupel bekannter Stelligkeit. Findest du eine Stelle, an der das nicht gilt, ist genau sie der Fund, für den dieser Schalter existiert. Sie kommt **nicht** als `!` in den Commit, sondern als Befund in den Report, mit Datei, Zeile und dem Fall, in dem der Zugriff danebengreift. Einhundertneununddreißig blind gesetzte Assertionen beheben dieses Finding nicht, sie bringen den Prüfer zum Schweigen. Für die zwölf Produktionsstellen ist die Frage bereits beantwortet — Schritt 3 nennt zu jeder die Bedingung, die sie trägt.
  3. Die fünf Produktionsdateien, zwölf Fehler, jede Stelle einzeln:
     - **`src/in-the-dark/Entity.ts:318`**, in `#insertChildInOrder`: `while (i > 0 && child.order < this.#children[i - 1].order) i--;` wird zu `this.#children[i - 1]!.order`. `i` startet bei `this.#children.length`, und die Bedingung `i > 0` steht links vom Zugriff, der Index liegt also in `[0, length-1]`. Der JSDoc-Block darüber erklärt den Scan bereits vollständig und bleibt unverändert.
     - **`src/in-the-dark/Kernel.ts:731`**, in `#rollbackFailedShadowObjectUpdate`: `this.destroyShadowObject(created[i], entry.entity)` wird zu `created[i]!`. Die Schleife ist `for (let i = created.length - 1; i >= 0; i--)`, beide Grenzen stehen darin.
     - **`src/utils/generateUUID.ts`**: 16 Zugriffe auf `_lut`, alle innerhalb von `_generateUUID`, alle mit einem auf ein Byte maskierten Index. Statt sechzehn Assertionen bekommt die Tabelle einen benannten Zugriff. Direkt über `const _generateUUID = () => {` (heute Zeile 263) einsetzen:

       ```ts
       // Every index is masked down to a byte, and the table holds an entry for all 256 of them.
       const hex = (byte: number): string => _lut[byte]!;
       ```

       Danach in `_generateUUID` jedes `_lut[X]` durch `hex(X)` ersetzen — 16 Stellen, sonst nichts. Die Tabelle selbst, ihr `// prettier-ignore` und der Quellenverweis darüber bleiben unangetastet. Der Grund für den Helfer statt der Assertionen ist das Ziel dieses Pakets: die Zusage steht damit einmal in einer Signatur statt sechzehnmal als Zeichen mitten im Ausdruck. `as const` an der Tabelle ist kein Ersatz — gemessen: ein Tupel, mit einem `number` indiziert, trägt unter dem Schalter weiterhin `| undefined`.
     - **`src/view/ComponentContext.ts:751`**: `owners[i].commitChange(entries[i]);` wird zu `owners[i]!.commitChange(entries[i]!);`. Beide Grenzen halten: `count` ist eine Zeile über der Schleife auf `entries.length` geklemmt, und `build()` (heute Zeilen 700-706) schreibt `owners[i]` für jeden Index, den `entries` dazugewinnt. Darüber eine Zeile Kommentar, die das sagt — warum, nicht was: dass `count` innerhalb des Trails liegt und `owners` für jeden Trail-Index einen Eintrag hat.
     - **`src/view/ComponentContext.ts:921`**: `this.#components.get(childUuids[i])?.component` wird zu `childUuids[i]!`. Die Schleife läuft `i < childUuids.length`; das `?.` dahinter behandelt bereits den fehlenden Eintrag und bleibt, wie es ist.
     - **`src/view/RemoteWorkerEnv.ts:40`**: `if (changeItem.transferables) {` wird zu `if (changeItem?.transferables) {`. Ein Zeichen. Die optionale Verkettung verengt `changeItem` im ganzen Block, und damit fallen alle vier Fehler dieser Funktion (40, 41, 45, 46) zusammen weg — an einem Nachbau gemessen. Keine Assertion, sonst nichts an der Funktion.
  4. Die acht Specs, 127 Fehler, drei Regeln. Sie stehen nach Wirkung: S1 arbeitet an der Quelle und nimmt den größten Teil weg, S2 und S3 arbeiten an der Fundstelle.

     **S1 — Fixture-Arrays bekommen ihren Tupeltyp.** Ein `const uuids = [generateUUID(), generateUUID(), generateUUID()]` ist dem Prüfer ein `string[]`, und jedes `uuids[0]` daran trägt danach `| undefined`. Eine Annotation am Deklarationsort nimmt den ganzen Rattenschwanz weg: gemessen sind an einem Tupel der literale Index, die Destrukturierung, die Weitergabe als Parameter und `for..of` alle vier sauber. Genau diese neun Stellen, mit der Stelligkeit, die dort steht:
     - `src/in-the-dark/Kernel.spec.ts:28` (in `makeEntityChain`) → `const uuids: [string, string, string] = [...]`
     - `src/in-the-dark/Kernel.spec.ts:4144` (in `makeRoots`) → dreistellig
     - `src/in-the-dark/Kernel.spec.ts:4449` → zweistellig
     - `src/in-the-dark/Kernel.spec.ts:5620` — hier ist es ein Parameter: `const makeTrail = (uuids: string[])` wird zu `(uuids: [string, string, string, string])`
     - `src/in-the-dark/Kernel.spec.ts:5630` und `5654` → je vierstellig
     - `src/in-the-dark/Entity.spec.ts:532`, `550` und `571` → je dreistellig

     Zwei Sorten Nachbarn bleiben ausdrücklich unangetastet, weil eine Annotation dort nichts bewirkt außer Rauschen im Diff. Erstens die übrigen `uuids`-Deklarationen derselben Dateien (`Entity.spec.ts:475`, `492`, `515`): sie erzeugen heute keinen Fehler. Zweitens jedes `const [aUuid, bUuid] = [generateUUID(), generateUUID()]` — die Destrukturierung eines Array-Literals liest der Prüfer bereits als Tupel, gemessen.

     **S2 — ein einzelner Index in ein eingesammeltes Ergebnis bekommt `!` an der Fundstelle.** Das sind die Zugriffe auf das, was ein Aufruf gerade zurückgegeben oder ein Spion gerade gesammelt hat; die Assertion ist dort die Zusage des Tests selbst: ist die Liste leer, soll er scheitern. Die vorkommenden Formen sind `graph[0]`, `kernel.getEntityGraph()[0]`, `posted[0]`, `frames[0]`, `frames[1]`, `second.frames[0]`, `proxy.trails[0]`, `(trail as ChangeTrailType)[0]`, `(changeTrail as ChangeTrailType)[0]` und `timestamps[i]`.

     Ein Sonderfall mit acht gleichen Fundstellen: in `src/view/ComponentChanges.spec.ts` (Zeilen 617, 650, 671, 682, 702, 715, 727, 739) wird `const [entry] = buildTrail(changes);` zu `const entry = buildTrail(changes)[0]!;`. `buildTrail` gibt ein `IComponentChangeType[]` zurück, dessen Länge davon abhängt, was der Aufbau erzeugt hat — ein Tupeltyp wäre dort eine Behauptung, die nicht trägt. Deshalb S2 und nicht S1.

     **S3 — der Zugriff auf den ersten Aufruf eines Spions bekommt `!`,** also jedes `mock.calls[0]`. Steht dieselbe Form innerhalb eines `it(...)` mehr als einmal, wird der Aufruf einmal vor dem ersten `expect` an eine Konstante gebunden und die wird indiziert; sonst `!` an Ort und Stelle. Betroffen sind `Kernel.spec.ts`, `MessageRouter.spec.ts`, `ShadowObjectCreationScope.spec.ts`, `RemoteWorkerEnv.spec.ts` und `ShadowEnv.spec.ts`. `ShadowEnv.spec.ts:269` ist dieselbe Sache in Destrukturierungsform — `const [gotReason, changeTrail, gotEnv] = syncFailedSpy.mock.calls[0];`, gemeldet als TS2488 — und bekommt die Assertion an derselben Stelle.

     Für alle drei Regeln gilt: keine Spec ändert ihre Aussage. Kein `expect` wird umformuliert, keins entfällt, keine Zusicherung wird weicher, kein Test bekommt ein `?.`, wo vorher ein Zugriff stand. Wer beim Durchgehen eine Spec findet, die etwas Falsches prüft, meldet das und ändert es nicht.
  5. Erst jetzt den Schalter in die Wurzel-`tsconfig.json` legen: `"noUncheckedIndexedAccess": true,` als neue Zeile direkt vor `"noUnusedLocals": true,` (heute Zeile 21). Der Strictness-Block ist bis auf zwei ans Ende gehängte Schlüssel alphabetisch sortiert, und dort steht die Zeile richtig. Sonst nichts an der Datei.
  6. Zwei Zählproben, beide mit ihrer Ausgabe in den Report:
     - `pnpm exec tsc -p packages/shadow-objects/tsconfig.json --noEmit` bleibt stumm. Das ist die Prüfung aus Schritt 1, jetzt ohne den Schalter auf der Kommandozeile, weil er in der Konfiguration steht.
     - `pnpm exec tsc -p packages/shadow-objects-e2e/tsconfig.json --noEmit` bleibt ebenfalls stumm. Diese Probe ist der Beleg, dass der Schalter in der Wurzel nichts umwirft, was nicht zu diesem Paket gehört: das Paket erbt die Wurzelkonfiguration und war unter dem Schalter schon vorher fehlerfrei. Meldet sie etwas, gehört das in den Report und nicht in den Commit.
  7. In der Wurzel-`CHANGELOG.md` einen neuen datierten Abschnitt ganz oben einfügen, über `## 2026-08-26 — one coverage number for the whole workspace`, mit der Überschrift `## 2026-08-26 — index access is checked`. Darunter zwei Bullets, beide im Muster der Datei mit dem fett gesetzten Pfad in Backticks und einem Doppelpunkt eröffnet:
     - `tsconfig.json`: der Schalter beim Namen, was er verlangt (ein Index in ein Array oder eine Index-Signatur liefert den Elementtyp mit `undefined` daneben), und dass er über die Wurzelkonfiguration für `packages/shadow-objects` und `packages/shadow-objects-e2e` gilt.
     - `packages/shadow-objects/src`: wie die Zusicherungen jetzt dastehen — die Fixture-Arrays der Specs tragen ihren Tupeltyp, die Byte-Tabelle in `generateUUID.ts` einen benannten Zugriff, und die übrigen Stellen eine Assertion dort, wo die Schleife die Grenze ohnehin hält. In denselben Bullet gehört, dass die ausgelieferten Deklarationen unverändert bleiben; das ist die Frage, die ein Leser hier als Erstes hat.

     Kein Eintrag in einem Paket-Changelog — die Begründung steht in der Anmerkung »Oberfläche« oben. Keine Finding-ID. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: `tsconfig.json` steht in `globalDependencies` von `turbo.json`, die Änderung entwertet also jeden turbo-Cache — `build`, `typecheck` und `test` laufen vollständig durch (Baseline 1m01s). Das ist erwartet und kein Fehlersignal. `pnpm build` fährt in `packages/shadow-objects` unter anderem `tsc -p tsconfig.lib.json --emitDeclarationOnly`, und diese Konfiguration erbt den Schalter; sie prüft nur die Produktion, weil die Specs dort ausgeschlossen sind, und ist nach Schritt 3 grün. Das emittierte `dist/src/**/*.d.ts` ist gemessen unverändert, `src/distContract.files.txt` und `src/distContract.package.json` bleiben deshalb unangetastet — bewegt sich dort doch etwas, ist das ein Befund und kein Nachziehen. `pnpm lint` bleibt stumm; Biome erlaubt die Assertion ausdrücklich. `pnpm test` bleibt bei den Zahlen der Baseline: vitest transpiliert mit esbuild und prüft keine Typen, und keine der Änderungen bewegt Laufzeitverhalten. Bewegt sich eine Testzahl, ist das ein Befund und keine Nebensache.
- Commit: `build(ts): enable noUncheckedIndexedAccess across the workspace`
- Verlauf:
  - 2026-08-26 Zug 0: Detailplan steht · TYPE-002 (Teil 1) unverändert, 139 Fehler in 13 Dateien wie unter »Entscheidungen« notiert, Beispielstelle des Audits heute `Entity.ts:318` · gemessen: `shadow-objects-e2e` unter dem Schalter bereits fehlerfrei, emittierte `.d.ts` identisch, die beiden Strictness-Schalter überschneiden sich in keiner Fundstelle · keine Folgen zu verteilen (Pakete 1-3 melden keine), offener Befund `biome.json:24-26` bleibt liegen (andere Ursache)
  - 2026-08-26 Zug 1: Implementierer beauftragt · mittlere Stufe (sonnet), Effort medium · Brief `paket-4.impl-1.brief.txt`, Report nach `paket-4.impl-1.json`
  - 2026-08-26 Zug 2: Report FERTIG (Exit 0, `paket-5.impl-1.json`) · 7 Dateien geändert wie in der Dateiliste · roter Lauf des Regressionstests belegt: 2 Verstöße (`constants.d.ts`, `elements/ShaeElement.d.ts`), danach 4/4 grün · Zählproben 134→114 Fehler, keiner mehr unter `src/elements/` · keine Abweichungen, Nebenbefunde, Folgen · Arbeitsbaum jetzt schmutzig
  - 2026-08-26 Zug 3: Reviewer beauftragt · mittlere Stufe (sonnet), Effort medium · Diff `paket-5.diff` (393 Zeilen), Report nach `paket-5.review-1.json`
  - 2026-08-26 Zug 4: keine Runde · Review (`paket-5.review-1.json`) meldet beide Findings behoben, unabhängig nachgerechnet (114 Fehler in 16 Dateien, null unter `src/elements/`; kein `.ts`-Spezifizierer mehr unter `dist/`) · kein kritischer, kein wichtiger Befund · ein kleiner: Artikelfehler in `packages/shadow-objects/CHANGELOG.md:369`
  - 2026-08-26 Zug 1 (zweiter Anlauf): Der erste Implementierer-Prozess wurde nach 10 min von der Frist des Aufrufs erschlagen (Exit 143), Report leer, 13 Dateien halb geändert · Arbeitsbaum mit `git checkout -- packages/` auf 70d8464 zurückgesetzt, Prozess neu gestartet ohne Frist · Report nach `paket-4.impl-1.json`
  - 2026-08-26 Zug 1 (Abbruch des Runners): Der Runner-Prozess B wurde zur Rückgabe gezwungen, während der Implementierer noch lief. Sein Prozess arbeitet weiter oder ist inzwischen fertig; sein Report liegt in `paket-4.impl-1.json`, sein Exit-Code in `paket-4.impl-1.exit` (beide erst nach seinem Ende gefüllt). Im Arbeitsbaum liegen 15 geänderte Dateien: `tsconfig.json`, die 13 Dateien aus der Dateiliste des Pakets und die Wurzel-`CHANGELOG.md`. Nicht committet, nicht reviewt, nicht verifiziert. Zug 2 bis 5 stehen aus.
  - 2026-08-26 Zug 2 (nach der Rückgabe nachgetragen): Implementierer-Prozess mit Exit 0 beendet, Report `paket-4.impl-1.json` · Status FERTIG · 15 Dateien wie in der Dateiliste des Pakets · Zählproben: Schritt 1 = 139 Fehler in 13 Dateien; `tsc -p packages/shadow-objects/tsconfig.json --noEmit` stumm; `tsc -p packages/shadow-objects-e2e/tsconfig.json --noEmit` stumm; `diff -r` über die emittierten `.d.ts` vor/nach leer · Verify des Implementierers grün (build, typecheck, lint »Checked 219 files … No fixes applied«, test 801/379/123/645 wie Baseline, Coverage 92,89 %) · keine Abweichungen, keine Nebenbefunde, keine Folgen · NICHT reviewt, NICHT von mir selbst verifiziert, NICHT committet — Zug 3 bis 5 stehen weiterhin aus

**TYPE-002 · low · tsconfig.json:5-45** — Die tsconfig kennt weder noUncheckedIndexedAccess noch exactOptionalPropertyTypes

Die Wurzelkonfiguration ist an vielen Stellen strenger als der Standard — strict, noImplicitOverride, noUnusedLocals, noPropertyAccessFromIndexSignature. Zwei Schalter fehlen, und beide treffen Muster, die dieser Code laufend benutzt: ohne noUncheckedIndexedAccess ist this.#children[i - 1].order in Entity.#insertChildInOrder ein Zugriff, den der Typprüfer für sicher hält, obwohl er es nur wegen der Schleifenbedingung daneben ist; ohne exactOptionalPropertyTypes ist ein optionales Feld, dem jemand explizit undefined zuweist, nicht von einem fehlenden zu unterscheiden — und das Datenmodell der Change Trails lebt genau von dieser Unterscheidung (siehe CONS-006).

Empfehlung: Einzeln einschalten und die Fehlerliste ansehen, bevor entschieden wird. noUncheckedIndexedAccess wird die längere Liste erzeugen; exactOptionalPropertyTypes ist der Schalter, der inhaltlich zu diesem Projekt gehört, weil »Schlüssel ohne Wert« hier eine eigene Bedeutung hat.

Beleg im Audit: Am Manifest nachgelesen (2026-08-19): beide Optionen fehlen in tsconfig.json, und keine der drei per-Paket-Konfigurationen setzt sie nach.

Zu diesem Paket gehört ausschließlich der erste der beiden Schalter, `noUncheckedIndexedAccess`. Die Empfehlung ist befolgt und ihr Ergebnis liegt vor: die Fehlerliste ist angesehen, und sie ist tatsächlich die längere von beiden (139 gegen 134). `exactOptionalPropertyTypes` ist Sache der Pakete 5 bis 8. Die Zeilenangabe `5-45` meint den `compilerOptions`-Block der Wurzeldatei und zeigt heute auf 4-43.

### [x] 5. `exactOptionalPropertyTypes`: die Custom Elements
- Findings: TYPE-002 (Teil 2a), TYPE-004
- Ziel: Die vier Element-Dateien unterscheiden »Schlüssel fehlt« von »Schlüssel trägt undefined«, und kein Import des Pakets trägt die Quell-Endung mehr in die ausgelieferten Deklarationen.
- Bereich: `packages/shadow-objects/src/elements/`, `packages/shadow-objects/src/constants.ts`, `packages/shadow-objects/src/distContract.spec.ts`, `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: 4
- Anmerkung (aus Paket 4, Zug 0): Die beiden Strictness-Schalter überschneiden sich in keiner
  einzigen Fundstelle. Gemessen am 2026-08-26 an `packages/shadow-objects`:
  `--exactOptionalPropertyTypes` allein 134 Fehler in 20 Dateien, beide Schalter zusammen 273 in
  28 — die Summe der Einzelläufe —, und jede der 134 Fundstellen steht auch im gemeinsamen Lauf,
  keine fällt weg. Die Zahlen unter »Entscheidungen« gelten also unverändert weiter, nachdem
  Paket 4 seinen Schalter in `tsconfig.json` gelegt hat, und der Kommandozeilen-Lauf der Pakete 5
  bis 8 zeigt ab dann genau das, was `exactOptionalPropertyTypes` beiträgt, und nichts sonst.
  Der Schnitt der vier Teilpakete bleibt, wie er ist.
- Anmerkung: Schalter nur auf der Kommandozeile, `tsconfig.json` bleibt bis Paket 8 unberührt.
- Anmerkung (Abgleich, 2026-08-26): Beide Sachverhalte bestehen unverändert, und die Zahl aus »Entscheidungen« stimmt nach Paket 4 auf den Fehler genau: `pnpm exec tsc -p tsconfig.json --noEmit --exactOptionalPropertyTypes` in `packages/shadow-objects` meldet 134 Fehler in 20 Dateien. Zwanzig davon liegen unter `src/elements/`, in vier Dateien — `ShaeEntElement.ts` (12), `ShaePropElement.ts` (5), `ShaeElement.ts` (2), `ShaeWorkerElement.ts` (1). TYPE-004 steht unverändert auf `ShaeElement.ts:3`.
- Anmerkung (Reichweite von TYPE-004, gemessen 2026-08-26): Das Finding ist keine Quelltext-Hygiene, sondern ein Defekt im ausgelieferten Paket, und es hat eine zweite Fundstelle, die das Audit nicht nennt. Der Spezifizierer überlebt die Deklarations-Emission wörtlich: `dist/src/elements/ShaeElement.d.ts:2` trägt `from '../types.ts'`, und `dist/src/constants.d.ts:1` trägt `from './types.ts'`. Ein Konsument unter `moduleResolution: NodeNext` oder `Node16` löst beide nicht auf — genau der Fall, den die Beschreibung des Findings als »an dem Tag teuer« benennt, nur trifft er heute schon jeden, der so compiliert. Über den ganzen Workspace sind es genau diese zwei Stellen (`grep` über `packages/*/src`). `src/constants.ts` wandert deshalb in dieses Paket: dieselbe Ursache, derselbe Fix von einem Zeichen, dieselbe ausgelieferte Datei-Familie. Die Fundstelle stehenzulassen hieße, das erklärte Ziel dieses Pakets zu verfehlen, während der Kontext offen ist, und im Abschluss ein Finding als behoben zu verbuchen, dessen Zwilling weiterläuft. Die `Ergebnis:`-Zeile muss beide Stellen nennen.
- Anmerkung (Form der Erweiterung, gemessen 2026-08-26): Alle zwanzig Typfehler haben dieselbe Gestalt — ein optionales Feld `#foo?: T`, dem der Code an anderer Stelle ausdrücklich `undefined` zuweist, um es zu leeren. Behoben wird ausschließlich an der Deklaration, durch `?: T | undefined`; keine Zuweisung, kein Aufruf, keine Signatur eines Verfahrens wird angefasst. `delete` ist kein Ausweg — auf einem `#`-privaten Feld ist es ein Syntaxfehler (TS18011) —, und das `?` fällt nicht weg, weil `strictPropertyInitialization` dann einen Initialisierer verlangt und `useDefineForClassFields: false` daraus eine Zuweisung im Konstruktor macht, also eine Laufzeitänderung für ein reines Typproblem. Bei einem Funktionstyp gehören Klammern um den Typ: `?: (() => void) | undefined`. Ohne sie liest der Prüfer `() => (void | undefined)`, also einen Rückgabetyp statt eines leeren Feldes. Gemessen an einer Kopie außerhalb des Arbeitsbaums: nach den zwanzig Erweiterungen meldet der Lauf mit dem Schalter 114 Fehler in 16 Dateien, keinen einzigen unter `src/elements/` und keinen neuen anderswo (134 − 20 = 114), und ohne den Schalter bleibt er stumm.
- Anmerkung (Oberfläche, gemessen 2026-08-26): Die ausgelieferten Deklarationen bewegen sich um genau eine Zeile. Neunzehn der zwanzig Felder sind `#`-privat und verschwinden hinter dem Marker `#private;`; sichtbar wird allein das öffentliche Feld `ShaeEntElement.entParentNode`, das in `dist/src/elements/ShaeEntElement.d.ts:19` künftig `ShaeEntElement | undefined` trägt. `diff -r` über zwei Emissionen von `tsconfig.lib.json`, einmal vor und einmal nach den Erweiterungen, zeigt diese eine Zeile und ihre `.d.ts.map`, sonst nichts. Für einen Konsumenten ohne `exactOptionalPropertyTypes` sind die beiden Formen derselbe Typ; mit dem Schalter darf er dem Feld jetzt `undefined` zuweisen — eine Lockerung, kein Bruch. Die Dateiliste unter `dist/` ist unverändert, `src/distContract.files.txt` und `src/distContract.package.json` bleiben deshalb unangetastet. `docs/api-reference.md:1897` beschreibt `entParentNode` in Prosa und nennt keinen TypeScript-Typ, `README.md` erwähnt das Feld nicht: es zieht keine Doku nach. Das Paket-Changelog zieht mit, weil sich die Form von `dist/` bewegt.
- Hash: 3131aed
- Modell: mittlere Stufe
- Effort: medium
- Dateien: `packages/shadow-objects/src/elements/ShaeElement.ts` · `packages/shadow-objects/src/elements/ShaeEntElement.ts` · `packages/shadow-objects/src/elements/ShaePropElement.ts` · `packages/shadow-objects/src/elements/ShaeWorkerElement.ts` · `packages/shadow-objects/src/constants.ts` · `packages/shadow-objects/src/distContract.spec.ts` · `packages/shadow-objects/CHANGELOG.md`
- Regressionstest: Für TYPE-004, in Schritt 4 — die Deklarationen unter `dist/` dürfen aus keinem Spezifizierer mit `.ts`-Endung importieren. Vor dem Fix meldet der Test zwei Verstöße, und dieser rote Lauf gehört mit seiner Ausgabe in den Report. Für TYPE-002 (Teil 2a) gibt es keinen: eine Typannotation an einem Feld verschwindet beim Transpilieren rückstandslos, und ein `import type` löscht esbuild unter `verbatimModuleSyntax` ganz. Kein Laufzeitverhalten bewegt sich. Fällt beim Durchgehen doch ein echter Korrektheitsfehler an, gehört er in den Report und nicht in diesen Commit.
- Vorgehen:
  1. Die Fehlerliste erzeugen und als Arbeitsgrundlage behalten. Aus `packages/shadow-objects`:

     ```bash
     pnpm exec tsc -p tsconfig.json --noEmit --exactOptionalPropertyTypes
     ```

     Erwartet sind die 134 Fehler in 20 Dateien aus der Anmerkung oben, davon 20 unter `src/elements/`. Eine andere Zahl heißt, dass sich der Code bewegt hat; dann gehört die neue Zahl in den Report, und die Regel aus Schritt 2 gilt unverändert weiter, weil sie an der Form der Fundstelle hängt und nicht an ihrer Zeilennummer. Der Schalter steht ausschließlich auf der Kommandozeile — `tsconfig.json` gehört Paket 8, und so bleibt `pnpm typecheck` zwischen den Paketen grün.
  2. Zwanzig Deklarationen erweitern, jede um ` | undefined`, sonst nichts an der Zeile und nichts an ihrem Kommentar. Die Klammern bei Funktionstypen sind Pflicht, siehe die Anmerkung »Form der Erweiterung«. Keine Zuweisung wird angefasst — die `= undefined`-Zeilen, die heute den Fehler auslösen, bleiben wörtlich stehen, denn sie sind die Aussage, die der Schalter erst prüfbar macht.

     `src/elements/ShaeElement.ts`
     - Zeile 80: `#pendingReflections?: Map<string, () => void>;` → `#pendingReflections?: Map<string, () => void> | undefined;`
     - Zeile 98: `#nsReflection?: () => void;` → `#nsReflection?: (() => void) | undefined;`

     `src/elements/ShaeEntElement.ts`
     - Zeile 108, im Interface `ReRequestParentData`: `newAncestor?: ShaeEntElement;` → `newAncestor?: ShaeEntElement | undefined;`. Das Interface ist modul-intern und wird nicht exportiert; es erreicht keine Deklaration.
     - Zeile 165: `entParentNode?: ShaeEntElement;` → `entParentNode?: ShaeEntElement | undefined;`. Das ist die eine öffentliche der zwanzig Stellen, siehe die Anmerkung »Oberfläche«.
     - Zeile 179: `#parentObserver?: MutationObserver;` → `| undefined`
     - Zeile 193: `#namespaceBinding?: () => void;` → `?: (() => void) | undefined`
     - Zeile 196: `#tokenReflection?: () => void;` → `?: (() => void) | undefined`
     - Zeile 199: `#forwardCustomEventsReflection?: () => void;` → `?: (() => void) | undefined`
     - Zeile 202: `#viewComponentListeners?: Effect;` → `| undefined`
     - Zeile 205: `#forwardCustomEventsPatch?: Effect;` → `| undefined`
     - Zeile 208: `#tokenToViewComponent?: () => void;` → `?: (() => void) | undefined`
     - Zeile 433: `#unsubscribeViewComponentEffect?: () => void;` → `?: (() => void) | undefined`
     - Zeile 493: `#shadowRootHost?: HTMLElement;` → `| undefined`
     - Zeile 820: `#unsubscribeFromParent?: () => void;` → `?: (() => void) | undefined`

     `src/elements/ShaePropElement.ts`
     - Zeile 107: `#hostBinding?: () => void;` → `?: (() => void) | undefined`
     - Zeile 110: `#declareProperty?: Effect;` → `| undefined`
     - Zeile 113: `#writePropertyValue?: Effect;` → `| undefined`
     - Zeile 116: `#convertValue?: Effect;` → `| undefined`
     - Zeile 435: `#reRequestHostTarget?: EventTarget;` → `| undefined`

     `src/elements/ShaeWorkerElement.ts`
     - Zeile 66: `#envViewBinding?: () => void;` → `?: (() => void) | undefined`

     Die Zeilennummern sind vom 2026-08-26; maßgeblich ist der Feldname. Genau zwanzig Zeilen ändern sich, jede um denselben Zusatz. Ändert sich eine einundzwanzigste, ist das ein Befund für den Report.
  3. Zwei Importe auf die Laufzeit-Endung bringen, je ein Zeichenwechsel, sonst nichts an der Zeile:
     - `src/elements/ShaeElement.ts:3` — `import type {NamespaceType} from '../types.ts';` → `'../types.js'`
     - `src/constants.ts:1` — `import type {NamespaceType} from './types.ts';` → `'./types.js'`
  4. Den Regressionstest schreiben und **vor** Schritt 2 und 3 rot sehen — er hängt an keiner der beiden Änderungen und lässt sich zuerst laufen. In `src/distContract.spec.ts` ein viertes `it` in das vorhandene `describe('the dist layout of @spearwolf/shadow-objects', …)`, hinter `it('every entry point in dist/package.json resolves to an existing file', …)`. Es liest jede `.d.ts` unter `dist/` und sammelt jeden Import-Spezifizierer, der auf `.ts` endet:

     ```ts
     it('no emitted declaration imports through a source extension', () => {
       // The declarations are what a consumer resolves against, and a `.ts` specifier in them
       // does not resolve under `moduleResolution: NodeNext` or `Node16`. The source extension
       // survives declaration emit verbatim, so the only place it can be caught is here.
       const offenders = collectFilesUnderDist()
         .filter((file) => file.endsWith('.d.ts'))
         .flatMap((file) => {
           const text = readFileSync(path.join(distDir, file), 'utf8');
           return [...text.matchAll(/from '([^']*\.ts)'/g)].map((match) => `${file}: ${match[1]!}`);
         });

       expect(offenders).toEqual([]);
     });
     ```

     Die Nicht-Null-Assertion trägt, weil eine Gruppe eines Treffers immer besetzt ist; sie ist unter `noUncheckedIndexedAccess` nötig und folgt der Form, die Paket 4 im Paket eingeführt hat. Der Test prüft ausdrücklich nur `.d.ts` und nicht jede Datei unter `dist/`: der eingebettete Worker-Bundle trägt beliebigen fremden Text, und die Aussage gilt den Deklarationen. Roter Lauf mit `pnpm -F @spearwolf/shadow-objects exec vitest src/distContract.spec.ts --run` gegen ein gebautes `dist/`; erwartet sind genau zwei Verstöße, `constants.d.ts` und `elements/ShaeElement.d.ts`. Braucht der rote Lauf ein `dist/`, das noch nicht steht: `pnpm -F @spearwolf/shadow-objects build`.
  5. In `packages/shadow-objects/CHANGELOG.md` zwei Bullets ans Ende des Abschnitts `### Types` unter `## [Unreleased]` — heute hinter Zeile 368, vor der Leerzeile, die `### Dependencies` einleitet. Form und Register wie die vier Bullets darüber:
     - `- **Types (public API):** …` — `ShaeEntElement.entParentNode` ist `ShaeEntElement | undefined` deklariert. Sagen, was das für einen Konsumenten heißt: wer mit `exactOptionalPropertyTypes` compiliert, darf dem Feld `undefined` zuweisen, und das Leerschreiben ist der Weg, auf dem eine Entity ihren Elternknoten abgibt; unter jeder anderen Konfiguration sind die beiden Formen derselbe Typ. Kein Bruch.
     - `- **Bugfix (types):** …` — die ausgelieferten Deklarationen lösen unter `moduleResolution: NodeNext` und `Node16` auf. Die beiden Dateien beim Namen nennen (`constants.d.ts`, `elements/ShaeElement.d.ts`) und sagen, woran es lag: ein `import type` mit der Quell-Endung `.ts` überlebt die Deklarations-Emission wörtlich und zeigt beim Konsumenten auf eine Datei, die das Paket nicht ausliefert.

     Die Zusammenfassung im Kopf von `## [Unreleased]` bleibt unangetastet: sie zählt, was bestehende Konsumenten bricht, und beide Bullets brechen nichts. Keine Finding-ID. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
  6. Zwei Zählproben, beide mit ihrer Ausgabe in den Report:
     - `pnpm exec tsc -p packages/shadow-objects/tsconfig.json --noEmit --exactOptionalPropertyTypes` meldet keine einzige Zeile unter `src/elements/` mehr, und in der Summe 114 Fehler in 16 Dateien. Die Zahl ist der Beleg, dass die Erweiterungen nichts an anderer Stelle aufgerissen haben: 134 − 20 = 114, und die verbleibenden Dateien sind die Arbeit der Pakete 6 bis 8.
     - `pnpm exec tsc -p packages/shadow-objects/tsconfig.json --noEmit` bleibt stumm — ohne den Schalter kostet dieses Paket nichts.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: `pnpm build` emittiert `dist/` neu; genau drei Zeilen bewegen sich — `dist/src/elements/ShaeEntElement.d.ts:19` gewinnt ` | undefined`, `dist/src/constants.d.ts:1` und `dist/src/elements/ShaeElement.d.ts:2` verlieren die `.ts`-Endung —, dazu die zugehörigen `.d.ts.map`. Die Dateiliste unter `dist/` und die Form von `dist/package.json` bleiben, wie sie sind; `src/distContract.files.txt` und `src/distContract.package.json` werden nicht angefasst. Bewegt sich dort etwas, ist das ein Befund und kein Nachziehen. `pnpm typecheck` bleibt stumm, weil der Schalter noch nicht in `tsconfig.json` steht. `pnpm lint` meldet »Checked 219 files … No fixes applied«. `pnpm test` bleibt bei den Zahlen der Baseline, bis auf den einen neuen Fall in der Kern-Suite: 802/379/123/645 statt 801/379/123/645. Bewegt sich eine andere Testzahl, ist das ein Befund und keine Nebensache. Die Coverage bewegt sich nicht nennenswert — Typannotationen erzeugen keine Statements, und Specs zählen nicht in den Bericht.
- Commit: `fix(types): optional fields declare undefined, type imports point at .js`
- Ergebnis: 1 Runde · TYPE-002 (Teil 2a) behoben: 20 Deklarationen unter `src/elements/` tragen `?: T | undefined`, keine Zuweisung angefasst · TYPE-004 behoben, und zwar an **beiden** Fundstellen — `src/elements/ShaeElement.ts:3` (die des Audits) und `src/constants.ts:1` (die zweite, die das Audit nicht nennt); beide erreichten die ausgelieferten Deklarationen und lösten unter `moduleResolution: NodeNext` und `Node16` nicht auf · Regressionstest `no emitted declaration imports through a source extension` (`src/distContract.spec.ts`), vor dem Fix rot mit genau zwei Verstößen (`src/constants.d.ts: ./types.ts`, `src/elements/ShaeElement.d.ts: ../types.ts`) · Zählproben: `tsc --exactOptionalPropertyTypes` 134 Fehler in 20 Dateien → 114 in 16, null unter `src/elements/`, keine neue Fundstelle; ohne den Schalter stumm · Verify grün (exit=0): `pnpm lint` »Checked 219 files … No fixes applied«, Tests 802/379/123/645 wie erwartet, Coverage 92,89 % (3385/3644) unverändert · Review ohne kritischen und ohne wichtigen Befund; ein kleiner, siehe `Folgen:`
- Nebenbefunde: keine
- Folgen: `packages/shadow-objects/CHANGELOG.md:370` — Artikelfehler im neuen Bugfix-Bullet, »a `import type` specifier« statt »an«. Von diesem Paket erzeugt, nicht vorbestehend; in veröffentlichter Doku, aber rein sprachlich. Vom Review als `klein` eingestuft und deshalb ohne eigene Runde. Zug 0 von Paket 6 hat sie diesem Paket zugeschlagen (2026-08-26): es fasst denselben Abschnitt derselben Datei im selben Commit an. → mit Paket 6 (03a026d) erledigt
- Schnittstellen: `ShaeEntElement.entParentNode` ist in `dist/src/elements/ShaeEntElement.d.ts` als `ShaeEntElement | undefined` deklariert — wer mit `exactOptionalPropertyTypes` compiliert, darf dem Feld jetzt `undefined` zuweisen; unter jeder anderen Konfiguration sind beide Formen derselbe Typ, es bricht nichts · `src/distContract.spec.ts` hat ein viertes `it`, das jede emittierte `.d.ts` auf Import-Spezifizierer mit `.ts`-Endung prüft: ein späteres Paket, das einen solchen Import einführt, sieht ihn sofort rot · Dateiliste unter `dist/` und Form von `dist/package.json` unverändert, `src/distContract.files.txt` und `src/distContract.package.json` unangetastet

**TYPE-002 · low · tsconfig.json:5-45** — Die tsconfig kennt weder noUncheckedIndexedAccess noch exactOptionalPropertyTypes

Die Wurzelkonfiguration ist an vielen Stellen strenger als der Standard — strict, noImplicitOverride, noUnusedLocals, noPropertyAccessFromIndexSignature. Zwei Schalter fehlen, und beide treffen Muster, die dieser Code laufend benutzt: ohne noUncheckedIndexedAccess ist this.#children[i - 1].order in Entity.#insertChildInOrder ein Zugriff, den der Typprüfer für sicher hält, obwohl er es nur wegen der Schleifenbedingung daneben ist; ohne exactOptionalPropertyTypes ist ein optionales Feld, dem jemand explizit undefined zuweist, nicht von einem fehlenden zu unterscheiden — und das Datenmodell der Change Trails lebt genau von dieser Unterscheidung (siehe CONS-006).

Empfehlung: Einzeln einschalten und die Fehlerliste ansehen, bevor entschieden wird. noUncheckedIndexedAccess wird die längere Liste erzeugen; exactOptionalPropertyTypes ist der Schalter, der inhaltlich zu diesem Projekt gehört, weil »Schlüssel ohne Wert« hier eine eigene Bedeutung hat.

Beleg im Audit: Am Manifest nachgelesen (2026-08-19): beide Optionen fehlen in tsconfig.json, und keine der drei per-Paket-Konfigurationen setzt sie nach.

Zu diesem Paket gehören ausschließlich die 20 Fundstellen unter `src/elements/`. Der erste Schalter ist mit Paket 4 (40d550b) erledigt; die übrigen 114 Fundstellen des zweiten gehören den Paketen 6 bis 8, und dort legt Paket 8 ihn dauerhaft in die Konfiguration. Die Zeilenangabe `5-45` meint den `compilerOptions`-Block der Wurzeldatei und zeigt heute auf 4-44.

**TYPE-004 · info · packages/shadow-objects/src/elements/ShaeElement.ts:3** — Ein Typ-Import trägt die Endung .ts statt .js

import type {NamespaceType} from '../types.ts' trägt als einziger Import der vier Element-Dateien die Quell-Endung. Unter moduleResolution: Bundler löst das auf, unter NodeNext bräche es — die Abweichung kostet heute nichts und wird an dem Tag teuer, an dem jemand die Auflösung umstellt.

Empfehlung: Auf '../types.js' bringen, wie in den drei Nachbardateien.

Der Satz »kostet heute nichts« ist gemessen falsch und wird nicht übernommen: der Spezifizierer überlebt die Deklarations-Emission wörtlich und steht in `dist/src/elements/ShaeElement.d.ts:2`. Wer das Paket unter `NodeNext` oder `Node16` compiliert, löst ihn heute schon nicht auf. Richtig ist die Empfehlung. Dazu kommt eine zweite Fundstelle derselben Ursache, die das Audit nicht nennt — `src/constants.ts:1`, ausgeliefert als `dist/src/constants.d.ts:1` —, und sie gehört in dieses Paket; die Begründung steht in der Anmerkung »Reichweite von TYPE-004«.

### [x] 6. `exactOptionalPropertyTypes`: Kernel und Entities
- Findings: TYPE-002 (Teil 2b)
- Ziel: `in-the-dark/` ist unter dem Schalter fehlerfrei.
- Bereich: `packages/shadow-objects/src/in-the-dark/` — `Entity`, `Kernel`, `Registry`, `ShadowObjectCreationScope`, `SignalsPath` — dazu `packages/shadow-objects/src/types.ts` und `packages/shadow-objects/CHANGELOG.md`. Warum `types.ts` mit dazugehört, steht in der Anmerkung »Zwei Deklarationen liegen außerhalb«.
- Hängt ab von: 5
- Anmerkung (Form der Erweiterung, aus Paket 5, Zug 0): Die Fundstellen dieses Schalters haben
  durchweg dieselbe Gestalt — ein optionales Feld, dem der Code an anderer Stelle ausdrücklich
  `undefined` zuweist, um es zu leeren. Behoben wird an der Deklaration (`?: T | undefined`) und
  nicht an der Zuweisung; bei einem Funktionstyp mit Klammern (`?: (() => void) | undefined`), sonst
  liest der Prüfer `() => (void | undefined)`, also einen Rückgabetyp statt eines leeren Feldes.
  `delete` ist kein Ausweg — auf einem `#`-privaten Feld ist es ein Syntaxfehler (TS18011) —, und
  das `?` wegzunehmen verlangt unter `strictPropertyInitialization` einen Initialisierer, den
  `useDefineForClassFields: false` in eine Zuweisung im Konstruktor übersetzt: eine Laufzeitänderung
  für ein reines Typproblem.
- Anmerkung (Oberfläche, aus Paket 5, Zug 0): Die emittierten Deklarationen folgen den Annotationen
  der Quelle, nicht dem Schalter. Bewegen kann sie allein ein `?:` an einem öffentlichen oder
  `protected` Member; `#`-private Felder verschwinden hinter dem Marker `#private;` und sind
  unsichtbar. Paket 5 hat so genau eine Zeile bewegt (`ShaeEntElement.entParentNode`) und dafür zwei
  Bullets in den Abschnitt `### Types` unter `## [Unreleased]` von
  `packages/shadow-objects/CHANGELOG.md` geschrieben.
- Anmerkung (Abgleich, 2026-08-26): Der Sachverhalt besteht unverändert, und die Zahl aus Paket 5 stimmt auf den Fehler genau: `pnpm exec tsc -p tsconfig.json --noEmit --exactOptionalPropertyTypes` in `packages/shadow-objects` meldet 114 Fehler in 16 Dateien. Elf davon gehören diesem Paket, verteilt auf vier Dateien unter `src/in-the-dark/` — `Entity.ts` (7), `SignalsPath.ts` (2), `Registry.ts` (1), `ShadowObjectCreationScope.ts` (1). Keine Spec unter `src/in-the-dark/` trägt eine Fundstelle. Der Rest gehört den Paketen 7 (100 Fehler, `src/view/`) und 8 (3 Fehler, `src/worker/`); der Schnitt der drei bleibt, wie er ist.
- Anmerkung (Zwei Deklarationen liegen außerhalb, gemessen 2026-08-26): Sieben Deklarationen tragen die elf Fundstellen, und zwei davon stehen nicht in der Datei, die den Fehler meldet. `ShadowObjectCreationScope.ts:146` reicht eine `Entity` an das Feld `entity` von `ShadowObjectCreationAPI`; dessen Typ `EntityApi` deklariert `parent?: EntityApi` und steht in `src/types.ts:110`. `Entity.ts:418` reicht `transferables` in ein `MessageToViewEvent`, dessen Feld in `in-the-dark/Kernel.ts:25` deklariert ist — das liegt im Bereich, aber in einer fünften Datei, die der Grobplan nicht aufzählte. Beide Fundstellen sind ohne ihre Deklaration nicht zu beheben: `in-the-dark/` bliebe unter dem Schalter rot, und das erklärte Ziel dieses Pakets wäre verfehlt. Ein `as`-Cast an der Fundstelle wäre der einzige Weg, der `types.ts` unberührt ließe, und er behauptete etwas, das nicht stimmt. Das ist keine Scope-Verschiebung, sondern dieselbe Ursache eine Datei weiter — derselbe Grund, aus dem Paket 5 `src/constants.ts` mitgenommen hat.
- Anmerkung (Oberfläche, gemessen 2026-08-26): Zwei der sieben Deklarationen sind öffentlich, fünf nicht. Öffentlich sind `MessageToViewEvent.transferables` (`in-the-dark/Kernel.ts`, ausgeliefert über den Unterpfad `./shadow-objects.js`) und `EntityApi.parent` (`types.ts`, ausgeliefert über beide Einstiegspunkte). Die übrigen fünf sind drei `#`-private Felder und ein Feld des modul-internen, nicht exportierten Interface `IContextValue`. Gemessen an zwei Emissionen von `tsconfig.lib.json` in getrennte Verzeichnisse, `diff -r` darüber: es bewegen sich genau zwei Zeilen, `in-the-dark/Kernel.d.ts:10` und `types.d.ts:85`, jede um denselben Zusatz ` | undefined`, dazu die beiden zugehörigen `.d.ts.map`. Sonst nichts — keine Datei kommt hinzu, keine fällt weg. `src/distContract.files.txt` und `src/distContract.package.json` bleiben deshalb unangetastet. Für einen Konsumenten ohne `exactOptionalPropertyTypes` sind die beiden Formen je derselbe Typ; mit dem Schalter darf er den Feldern jetzt `undefined` zuweisen — eine Lockerung, kein Bruch. Das Paket-Changelog zieht mit, weil sich die Form von `dist/` bewegt.
- Anmerkung (Doku, gemessen 2026-08-26): Es zieht keine Doku nach, und bei `EntityApi.parent` aus einem Grund, der es wert ist, dagestanden zu haben: `docs/api-reference.md:427` und `docs/cheat-sheet.md:350` beschreiben das Feld längst als `EntityApi | undefined`. Die Deklaration holt hier die Doku ein, nicht umgekehrt. `MessageToViewEvent` steht in keiner Feldtabelle der Doku; die Signaturen, die `transferables` nennen (`docs/api-reference.md:366`, `docs/cheat-sheet.md:80`), gehören zum Parameter der Methode `dispatchMessageToView` und bewegen sich nicht. `README.md` erwähnt weder das eine noch das andere.
- Hash: 03a026d
- Modell: mittlere Stufe
- Effort: medium
- Dateien: `packages/shadow-objects/src/in-the-dark/Entity.ts` · `packages/shadow-objects/src/in-the-dark/Kernel.ts` · `packages/shadow-objects/src/in-the-dark/Registry.ts` · `packages/shadow-objects/src/in-the-dark/SignalsPath.ts` · `packages/shadow-objects/src/types.ts` · `packages/shadow-objects/CHANGELOG.md`
- Kein Regressionstest: Das Paket bewegt kein Laufzeitverhalten. Alle sieben Änderungen sind Typannotationen an Deklarationen; esbuild löscht sie beim Transpilieren rückstandslos, und keine Zuweisung, kein Aufruf und keine Signatur eines Verfahrens wird angefasst. Ein Test, der die neue Form in einer `.d.ts` nachliest, hätte keinen Defekt hinter sich und wäre ein reiner Änderungsmelder. Den Nachweis führen die beiden Zählproben in Schritt 4 und der Verify-Lauf. Fällt beim Durchgehen doch ein echter Korrektheitsfehler an, gehört er in den Report und nicht in diesen Commit.
- Vorgehen:
  1. Die Fehlerliste erzeugen und als Arbeitsgrundlage behalten. Aus `packages/shadow-objects`:

     ```bash
     pnpm exec tsc -p tsconfig.json --noEmit --exactOptionalPropertyTypes
     ```

     Erwartet sind die 114 Fehler in 16 Dateien aus der Anmerkung »Abgleich«, davon elf unter `src/in-the-dark/`. Eine andere Zahl heißt, dass sich der Code bewegt hat; dann gehört die neue Zahl in den Report, und die Regel aus Schritt 2 gilt unverändert weiter, weil sie an der Form der Fundstelle hängt und nicht an ihrer Zeilennummer. Der Schalter steht ausschließlich auf der Kommandozeile — `tsconfig.json` gehört Paket 8, und so bleibt `pnpm typecheck` zwischen den Paketen grün.
  2. Sieben Deklarationen erweitern, jede um ` | undefined`, sonst nichts an der Zeile und nichts an ihrem Kommentar. Die Klammern bei Funktionstypen sind Pflicht, siehe die Anmerkung »Form der Erweiterung«. **Keine Zuweisung wird angefasst** — die `= undefined`-Zeilen, die heute den Fehler auslösen, bleiben wörtlich stehen, denn sie sind die Aussage, die der Schalter erst prüfbar macht. Die Zeilennummern sind vom 2026-08-26; maßgeblich ist der Feldname.

     `src/in-the-dark/Entity.ts`
     - Zeile 37, im Interface `IContextValue`: `unsubscribeFromParent?: () => void;` → `unsubscribeFromParent?: (() => void) | undefined;`. Das Interface ist modul-intern und wird nicht exportiert; es erreicht keine Deklaration. Trägt die Fundstelle Zeile 654.
     - Zeile 87: `#parent?: Entity;` → `#parent?: Entity | undefined;`. Trägt die drei Fundstellen 136, 246 und 354.
     - Zeile 373: `#autoDestructionSubscription?: () => void;` → `#autoDestructionSubscription?: (() => void) | undefined;`. Trägt die Fundstellen 388 und 396.

     `src/in-the-dark/Kernel.ts`
     - Zeile 25, im exportierten Interface `MessageToViewEvent`: `transferables?: Transferable[];` → `transferables?: Transferable[] | undefined;`. Trägt die Fundstelle `Entity.ts:418`. Eine der zwei öffentlichen Stellen, siehe die Anmerkung »Oberfläche«.

     `src/in-the-dark/Registry.ts`
     - Zeile 41: `readonly #truthyPropRoutes = new Map<string, {routes: Set<string>; token?: string}>();` → `readonly #truthyPropRoutes = new Map<string, {routes: Set<string>; token?: string | undefined}>();`. Trägt die Fundstelle Zeile 59. Die Erweiterung sagt die Wahrheit: `toPropRoute()` gibt für eine Route ohne Token ein Objekt ohne den Schlüssel zurück, Zeile 59 schreibt den Schlüssel aber immer und mit möglicherweise `undefined` als Wert.

     `src/in-the-dark/SignalsPath.ts`
     - Zeile 19: `#effect?: Effect;` → `#effect?: Effect | undefined;`. Trägt die Fundstellen 63 und 87.

     `src/types.ts`
     - Zeile 110, im exportierten Typ `EntityApi`: `parent?: EntityApi;` → `parent?: EntityApi | undefined;`. Trägt die Fundstelle `ShadowObjectCreationScope.ts:146`. Die zweite öffentliche Stelle. `ShadowObjectCreationScope.ts` selbst wird **nicht** angefasst — die Fundstelle dort ist ein Aufruf, kein Feld.

     Genau sieben Zeilen ändern sich. Ändert sich eine achte, ist das ein Befund für den Report.
  3. In `packages/shadow-objects/CHANGELOG.md` zwei Dinge, beide im Abschnitt `### Types` unter `## [Unreleased]`:
     - Ein neues Bullet ans Ende des Abschnitts — heute hinter Zeile 370, vor der Leerzeile, die `### Dependencies` einleitet. Form und Register wie die Bullets darüber, beginnend mit `- **Types (public API):**`. Inhalt: `MessageToViewEvent.transferables` ist `Transferable[] | undefined` deklariert und `EntityApi.parent` ist `EntityApi | undefined`. Sagen, was das für einen Konsumenten heißt: wer mit `exactOptionalPropertyTypes` compiliert, darf beiden Feldern `undefined` zuweisen; unter jeder anderen Konfiguration sind die Formen je derselbe Typ. Kein Bruch. Keine Finding-ID, kein Rückblick auf den Vorzustand.
     - Zeile 370, im Bugfix-Bullet aus dem Vorgängerpaket: der unbestimmte Artikel vor dem Wort »import« lautet dort »a« und muss »an« lauten. Der Satz beginnt mit »Both carried …«. Genau dieses eine Wort ändert sich, sonst nichts an der Zeile. Warum das hier geschieht und nicht in der Drain-Runde, steht in der Verlaufszeile.

     Die Zusammenfassung im Kopf von `## [Unreleased]` bleibt unangetastet: sie zählt, was bestehende Konsumenten bricht, und dieses Bullet bricht nichts. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
  4. Zwei Zählproben, beide mit ihrer Ausgabe in den Report:
     - `pnpm exec tsc -p packages/shadow-objects/tsconfig.json --noEmit --exactOptionalPropertyTypes` meldet keine einzige Zeile unter `src/in-the-dark/` mehr, und in der Summe 103 Fehler in 12 Dateien. Die Zahl ist der Beleg, dass die Erweiterungen nichts an anderer Stelle aufgerissen haben: 114 − 11 = 103, und die verbleibenden Dateien sind die Arbeit der Pakete 7 und 8.
     - `pnpm exec tsc -p packages/shadow-objects/tsconfig.json --noEmit` bleibt stumm — ohne den Schalter kostet dieses Paket nichts.
  5. Zwei Dinge ausdrücklich **nicht** tun, weil sie beim Lesen dieser Zeilen naheliegen und beide falsch sind:
     - `Kernel.ts:25` nicht auf den Alias `TransferablesType` aus `types.ts:9` umstellen. Der Alias ist `Transferable[]`, beide Formen sind derselbe Typ, und der Aliasname überlebt die Deklarations-Emission: die Umstellung bewegte eine öffentliche `.d.ts`-Zeile ohne jeden Gewinn. Gehört nicht in dieses Paket.
     - Keine der `= undefined`-Zuweisungen durch `delete`, durch einen bedingten Objektaufbau oder durch einen `as`-Cast ersetzen. Der Schalter existiert, um genau diese Zuweisungen sichtbar zu machen; sie wegzuformulieren wäre eine Laufzeitänderung für ein Typproblem.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: `pnpm build` emittiert `dist/` neu; genau zwei Zeilen bewegen sich — `dist/src/in-the-dark/Kernel.d.ts:10` und `dist/src/types.d.ts:85` gewinnen je ` | undefined` —, dazu die beiden zugehörigen `.d.ts.map`. Kein `.js` unter `dist/` bewegt sich, weil esbuild Typannotationen nicht emittiert. Die Dateiliste unter `dist/` und die Form von `dist/package.json` bleiben, wie sie sind; `src/distContract.files.txt` und `src/distContract.package.json` werden nicht angefasst. Bewegt sich dort etwas, ist das ein Befund und kein Nachziehen. `pnpm typecheck` bleibt stumm, weil der Schalter noch nicht in `tsconfig.json` steht. `pnpm lint` meldet »Checked 219 files … No fixes applied«. `pnpm test` bleibt bei den Zahlen des Vorgängerpakets: 802/379/123/645. Bewegt sich eine Testzahl, ist das ein Befund und keine Nebensache. Die Coverage bewegt sich nicht — es entsteht kein einziges Statement.
- Commit: `fix(types): the kernel's optional fields declare undefined`
- Ergebnis: 1 Runde · TYPE-002 (Teil 2b) behoben: die elf Fundstellen unter `src/in-the-dark/` sind weg, getragen von sieben Deklarationen, jede um ` | undefined` erweitert — `Entity.ts` (`IContextValue.unsubscribeFromParent`, `#parent`, `#autoDestructionSubscription`), `Kernel.ts` (`MessageToViewEvent.transferables`), `Registry.ts` (Wertform von `#truthyPropRoutes`), `SignalsPath.ts` (`#effect`), `types.ts` (`EntityApi.parent`). Keine achte Zeile bewegt sich, keine Zuweisung ist angefasst, `ShadowObjectCreationScope.ts` blieb unberührt · kein Regressionstest (reine Typannotationen, esbuild löscht sie rückstandslos; Begründung siehe oben) · zusätzlich der Artikelfehler aus Paket 5 behoben: `CHANGELOG.md` trägt jetzt »an `import type` specifier« · Zählproben: `tsc --exactOptionalPropertyTypes` 114 Fehler in 16 Dateien → 103 in 12, null unter `src/in-the-dark/`, keine neue Fundstelle; ohne den Schalter stumm · Verify grün (exit=0, `paket-6.verify.log`): `pnpm lint` »Checked 219 files … No fixes applied«, Tests 802/379/123/645 wie erwartet, Coverage 92,89 % (3385/3644) unverändert · Review ohne kritischen, wichtigen oder kleinen Befund
- Nebenbefunde: keine
- Folgen: keine · die Folge aus Paket 5 (Artikelfehler in `CHANGELOG.md`) ist mit diesem Commit erledigt
- Schnittstellen: `MessageToViewEvent.transferables` ist in `dist/src/in-the-dark/Kernel.d.ts` als `Transferable[] | undefined` deklariert, `EntityApi.parent` in `dist/src/types.d.ts` als `EntityApi | undefined` — wer mit `exactOptionalPropertyTypes` compiliert, darf beiden Feldern jetzt `undefined` zuweisen; unter jeder anderen Konfiguration sind die Formen je derselbe Typ, es bricht nichts · Dateiliste unter `dist/` und Form von `dist/package.json` unverändert, `src/distContract.files.txt` und `src/distContract.package.json` unangetastet

**TYPE-002 · low · tsconfig.json:5-45** — Die tsconfig kennt weder noUncheckedIndexedAccess noch exactOptionalPropertyTypes

Die Wurzelkonfiguration ist an vielen Stellen strenger als der Standard — strict, noImplicitOverride, noUnusedLocals, noPropertyAccessFromIndexSignature. Zwei Schalter fehlen, und beide treffen Muster, die dieser Code laufend benutzt: ohne noUncheckedIndexedAccess ist this.#children[i - 1].order in Entity.#insertChildInOrder ein Zugriff, den der Typprüfer für sicher hält, obwohl er es nur wegen der Schleifenbedingung daneben ist; ohne exactOptionalPropertyTypes ist ein optionales Feld, dem jemand explizit undefined zuweist, nicht von einem fehlenden zu unterscheiden — und das Datenmodell der Change Trails lebt genau von dieser Unterscheidung (siehe CONS-006).

Empfehlung: Einzeln einschalten und die Fehlerliste ansehen, bevor entschieden wird. noUncheckedIndexedAccess wird die längere Liste erzeugen; exactOptionalPropertyTypes ist der Schalter, der inhaltlich zu diesem Projekt gehört, weil »Schlüssel ohne Wert« hier eine eigene Bedeutung hat.

Beleg im Audit: Am Manifest nachgelesen (2026-08-19): beide Optionen fehlen in tsconfig.json, und keine der drei per-Paket-Konfigurationen setzt sie nach.

Zu diesem Paket gehören ausschließlich die elf Fundstellen unter `src/in-the-dark/` samt den sieben Deklarationen, die sie tragen — darunter eine in `src/types.ts`, also außerhalb dieses Verzeichnisses. Der erste Schalter ist mit Paket 4 (40d550b) erledigt, die Element-Dateien mit Paket 5 (3131aed); die übrigen 103 Fundstellen des zweiten gehören den Paketen 7 und 8, und dort legt Paket 8 ihn dauerhaft in die Konfiguration. Die Zeilenangabe `5-45` meint den `compilerOptions`-Block der Wurzeldatei und zeigt heute auf 4-44.

### [x] 7. `exactOptionalPropertyTypes`: die View-Seite
- Findings: TYPE-002 (Teil 2c)
- Ziel: `view/` ist unter dem Schalter fehlerfrei — das ist die Seite, an der das Datenmodell der Change Trails hängt.
- Bereich: `packages/shadow-objects/src/view/` — 7 Produktionsdateien, 2 Specs — dazu `packages/shadow-objects/src/in-the-dark/Kernel.ts` und `packages/shadow-objects/CHANGELOG.md`. Warum `Kernel.ts` mit dazugehört, steht in der Anmerkung »Eine Deklaration liegt außerhalb«.
- Hängt ab von: 6
- Anmerkung (Form der Erweiterung, aus Paket 5, Zug 0): Die Fundstellen dieses Schalters haben
  durchweg dieselbe Gestalt — ein optionales Feld, dem der Code an anderer Stelle ausdrücklich
  `undefined` zuweist, um es zu leeren. Behoben wird an der Deklaration (`?: T | undefined`) und
  nicht an der Zuweisung; bei einem Funktionstyp mit Klammern (`?: (() => void) | undefined`), sonst
  liest der Prüfer `() => (void | undefined)`, also einen Rückgabetyp statt eines leeren Feldes.
  `delete` ist kein Ausweg — auf einem `#`-privaten Feld ist es ein Syntaxfehler (TS18011) —, und
  das `?` wegzunehmen verlangt unter `strictPropertyInitialization` einen Initialisierer, den
  `useDefineForClassFields: false` in eine Zuweisung im Konstruktor übersetzt: eine Laufzeitänderung
  für ein reines Typproblem.
- Anmerkung (Abgleich, 2026-08-26): Der Sachverhalt besteht unverändert, und die Zahl aus Paket 6 stimmt auf den Fehler genau: `pnpm exec tsc -p tsconfig.json --noEmit --exactOptionalPropertyTypes` in `packages/shadow-objects` meldet 103 Fehler in 12 Dateien, davon 100 unter `src/view/` — `ShadowEnv.spec.ts` (24), `ViewComponent.spec.ts` (22), `ComponentContext.ts` (15), `ComponentChanges.ts` (13), `ShadowEnv.ts` (12), `ViewComponent.ts` (5), `RemoteWorkerEnv.ts` (4), `ComponentMemory.ts` (3), `LocalShadowObjectEnv.ts` (2). Die restlichen drei gehören Paket 8. Der Schnitt der beiden bleibt, wie er ist.
- Anmerkung (kein Teilen, gemessen 2026-08-26): Die Frage aus Paket 6 — ob dieses Paket geteilt gehört — ist mit dem Code vor Augen entschieden, und die Antwort ist nein. Die 100 Fundstellen sind nicht 100 Arbeitsschritte: sie werden von **28 Deklarationen und einer Aufrufstelle** getragen, verteilt auf 10 Dateien, gemessen an einer vollständig durchgeführten Kopie außerhalb des Arbeitsbaums. Das ist der Größenordnung nach Paket 5 (20 Zeilen, 7 Dateien) und nicht das Fünffache davon. Ein Schnitt entlang der Dateien liefe zudem quer zur Sache: 46 der 100 Fundstellen stehen in den beiden Specs, und keine einzige davon verschwindet durch eine Änderung *in* den Specs — sie hängen an den Deklarationen der Produktionsdateien, allen voran am Options-Literal des `ViewComponent`-Konstruktors. Zwei Teilpakete hießen: eines ändert Deklarationen, das andere sieht zu, wie seine Fehler dabei verschwinden.
- Anmerkung (Eine Deklaration liegt außerhalb, gemessen 2026-08-26): `LocalShadowObjectEnv.ts:43` reicht ein Objekt an `onMessageToView`, dessen Zielform `Omit<MessageToViewEvent, 'transferables'>` ist; das Feld `traverseChildren` ist in `in-the-dark/Kernel.ts:26` deklariert. Die Fundstelle ist ohne ihre Deklaration nicht zu beheben, `src/view/` bliebe unter dem Schalter rot, und das erklärte Ziel dieses Pakets wäre verfehlt. Das ist keine Scope-Verschiebung, sondern dieselbe Ursache eine Datei weiter — derselbe Grund, aus dem Paket 5 `src/constants.ts` und Paket 6 `src/types.ts` mitgenommen hat. Paket 6 hat in derselben Schnittstelle bereits `transferables` erweitert und `in-the-dark/` unter dem Schalter fehlerfrei hinterlassen; diese eine Zeile wird nicht rückgängig gemacht, sondern ergänzt.
- Anmerkung (Eine Fundstelle ist keine Deklaration, gemessen 2026-08-26): `LocalShadowObjectEnv.ts:40` ist die einzige der 100, die sich nicht an einer Deklaration beheben lässt. `structuredClone(message.data, {transfer: message.transferables})` reicht `Transferable[] | undefined` an `StructuredSerializeOptions.transfer`, und dieser Typ steht in `lib.dom.d.ts:2795-2797` als `transfer?: Transferable[]`, ohne `| undefined`. Eine Bibliotheksdeklaration von TypeScript ist nichts, was dieses Paket erweitert. Behoben wird deshalb an der Aufrufstelle, und zwar mit `?? []`: WebIDL deklariert das Feld als `sequence<object> transfer = []`, ein fehlender Schlüssel und eine leere Liste sind derselbe Aufruf. Nachgemessen unter Node 25.9.0 an drei `ArrayBuffer`n: ohne `options`, mit `{transfer: undefined}` und mit `{transfer: []}` bleibt die Quelle in allen drei Fällen bei `byteLength` 8, und nur `{transfer: [buffer]}` löst sie auf 0 ab. Die Zeile ist von der Kern-Suite abgedeckt (3 Durchläufe laut Bericht), der Verify-Lauf belegt sie also.
- Anmerkung (Oberfläche, gemessen 2026-08-26): Vier der 28 Deklarationen sind öffentlich, 24 nicht. Gemessen an zwei Emissionen von `tsconfig.lib.json` in getrennte Verzeichnisse, `diff -r -x '*.d.ts.map'` darüber: es bewegen sich genau zehn Zeilen in vier Dateien — `in-the-dark/Kernel.d.ts:11` (`MessageToViewEvent.traverseChildren`), `view/ComponentMemory.d.ts:4` und `:6` (`ComponentState.parentUuid`, `.properties`), `view/IShadowObjectEnvProxy.d.ts:33` und `:40` (`onMessageToView`, `onProxyFailed`), `view/ViewComponent.d.ts:70-74` (die fünf Felder des Konstruktor-Options-Literals). Sonst nichts — keine Datei kommt hinzu, keine fällt weg. `src/distContract.files.txt` und `src/distContract.package.json` bleiben deshalb unangetastet. Für einen Konsumenten ohne `exactOptionalPropertyTypes` ist jede der zehn Zeilen derselbe Typ wie vorher; mit dem Schalter darf er den Feldern jetzt `undefined` zuweisen — eine Lockerung, kein Bruch. Das Paket-Changelog zieht mit, weil sich die Form von `dist/` bewegt.
- Anmerkung (Warum alle fünf Konstruktor-Optionen, gemessen 2026-08-26): Um die 100 Fundstellen zu räumen, genügen zwei der fünf Felder — `parent` und `context`; mit nur diesen beiden meldet der Lauf ebenfalls 3 Restfehler, alle unter `src/worker/`. Erweitert werden trotzdem alle fünf, und der Grund ist die Ursache und nicht der Fehlerzähler. Der Konstruktor liest jedes der fünf Felder gleich: `options?.uuid ?? generateUUID()`, `options?.order ?? 0`, `options?.autoDestructionOnParentRemoval ?? false`, `options?.context ?? ComponentContext.get()`, und `parent` wandert in ein Feld, das selbst optional ist. Ein ausdrückliches `undefined` und ein fehlender Schlüssel sind für alle fünf dasselbe. Welche zwei davon heute rot sind, entscheidet allein, welche die Specs zufällig anfassen; zwei von fünf zu erweitern schriebe diese Zufälligkeit in eine öffentliche Deklaration. Es ist zudem ein Parametertyp — er existiert, um von Aufrufern zusammengesetzt zu werden, und `{order: vielleichtEineZahl}` ist genau dieselbe Lage wie das `{context: env.view}`, das die Specs vorführen. Nach der Triage-Regel wären die drei übrigen Felder ein Symptom derselben Ursache in demselben Literal, und ein Symptom, dessen Paket noch offen steht, wandert in dessen Detailplan.
- Anmerkung (Doku, gemessen 2026-08-26): Es zieht keine Doku nach, und bei `IShadowObjectEnvProxy` aus einem Grund, der es wert ist, dagestanden zu haben. `docs/api-reference.md:1409-1410` führt `onMessageToView` und `onProxyFailed` mit ihrer Signatur in einer Tabelle, deren dritte Spalte »Required« für beide `no` sagt — die Signatur der Callback-Funktion bewegt sich nicht, nur die Zuweisbarkeit von `undefined` an das Feld, und die steht dort längst: Zeile 1435 sagt ausdrücklich, dass ein losgelassener Proxy in beiden Feldern `undefined` vorfindet. Die Deklaration holt hier die Doku ein, nicht umgekehrt — dieselbe Lage wie bei `EntityApi.parent` in Paket 6. `ComponentState` kommt in `docs/` und `README.md` nicht vor. `MessageToViewEvent` steht in keiner Feldtabelle; die beiden Stellen, die `traverseChildren` nennen (`docs/api-reference.md:366`, `:375`), gehören zum Parameter der Methode `dispatchMessageToView` und bewegen sich nicht. Die Optionstabelle des `ViewComponent`-Konstruktors (`docs/api-reference.md:641-647`) beschreibt jede Option in Prosa und nennt keinen TypeScript-Typ. `README.md` erwähnt keine der vier Deklarationen.
- Hash: 37750d1
- Modell: mittlere Stufe
- Effort: medium
- Dateien: `packages/shadow-objects/src/in-the-dark/Kernel.ts` · `packages/shadow-objects/src/view/ComponentChanges.ts` · `packages/shadow-objects/src/view/ComponentContext.ts` · `packages/shadow-objects/src/view/ComponentMemory.ts` · `packages/shadow-objects/src/view/IShadowObjectEnvProxy.ts` · `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts` · `packages/shadow-objects/src/view/RemoteWorkerEnv.ts` · `packages/shadow-objects/src/view/ShadowEnv.ts` · `packages/shadow-objects/src/view/ShadowEnv.spec.ts` · `packages/shadow-objects/src/view/ViewComponent.ts` · `packages/shadow-objects/CHANGELOG.md`
- Kein Regressionstest: 28 der 29 geänderten Zeilen sind Typannotationen an Deklarationen; esbuild löscht sie beim Transpilieren rückstandslos, und keine Zuweisung, kein Aufruf und keine Signatur eines Verfahrens wird angefasst. Die 29. ist die Aufrufstelle in `LocalShadowObjectEnv.ts:40`, und sie ist gemessen verhaltensgleich — siehe die Anmerkung »Eine Fundstelle ist keine Deklaration«: ein fehlender `transfer`-Schlüssel, `undefined` und `[]` erzeugen denselben Aufruf, nur eine nichtleere Liste löst etwas ab. Ein Test darauf hätte keinen Defekt hinter sich und wäre ein reiner Änderungsmelder; die Zeile ist ohnehin von der Kern-Suite abgedeckt. Den Nachweis führen die drei Zählproben in Schritt 6 und der Verify-Lauf. Fällt beim Durchgehen doch ein echter Korrektheitsfehler an, gehört er in den Report und nicht in diesen Commit.
- Vorgehen:
  1. Die Fehlerliste erzeugen und als Arbeitsgrundlage behalten. Aus `packages/shadow-objects`:

     ```bash
     pnpm exec tsc -p tsconfig.json --noEmit --exactOptionalPropertyTypes
     ```

     Erwartet sind die 103 Fehler in 12 Dateien aus der Anmerkung »Abgleich«, davon 100 unter `src/view/`. Eine andere Zahl heißt, dass sich der Code bewegt hat; dann gehört die neue Zahl in den Report, und die Regel aus Schritt 2 gilt unverändert weiter, weil sie an der Form der Fundstelle hängt und nicht an ihrer Zeilennummer. Der Schalter steht ausschließlich auf der Kommandozeile — `tsconfig.json` gehört Paket 8, und so bleibt `pnpm typecheck` zwischen den Paketen grün.
  2. 28 Deklarationen erweitern, jede um ` | undefined`, sonst nichts an der Zeile und nichts an ihrem Kommentar. Die Klammern bei Funktionstypen sind Pflicht, siehe die Anmerkung »Form der Erweiterung«. **Keine Zuweisung wird angefasst** — die `= undefined`-Zeilen, die heute den Fehler auslösen, bleiben wörtlich stehen, denn sie sind die Aussage, die der Schalter erst prüfbar macht. Die Zeilennummern sind vom 2026-08-26; maßgeblich ist der Feldname.

     `src/in-the-dark/Kernel.ts`
     - Zeile 26, im exportierten Interface `MessageToViewEvent`: `traverseChildren?: boolean;` → `traverseChildren?: boolean | undefined;`. Trägt die Fundstelle `LocalShadowObjectEnv.ts:43`. Eine der vier öffentlichen Stellen. Die Zeile darüber (`transferables`) hat Paket 6 bereits erweitert und bleibt, wie sie ist.

     `src/view/ComponentChanges.ts`
     - Zeile 82: `#parentUuid?: string;` → `| undefined`. Trägt die Fundstellen 487 und 504.
     - Zeile 86: `#nextToken?: string;` → `| undefined`. Trägt 120 und 499.
     - Zeile 87: `#nextParentUuid?: string;` → `| undefined`. Trägt 121 und 506.
     - Zeile 88: `#nextOrder?: number;` → `| undefined`. Trägt 95, 122 und 513.
     - Zeile 178: `#travellingProperties?: Map<string, unknown>;` → `| undefined`. Trägt 126, 449, 468 und 490.

     `src/view/ComponentContext.ts`
     - Zeile 14, im Interface `ViewInstance`: `propIsEqual?: Map<string, (a: any, b: any) => boolean>;` → `| undefined`. Das Interface ist modul-intern und wird nicht exportiert; es erreicht keine Deklaration. Trägt die Fundstelle 215 und mit ihr die drei Folgefehler 221, 224 und 233, die allein daher rühren, dass die Zuweisung an `viewInstance` im `else`-Zweig scheitert.
     - Zeile 120: `#uncommittedTrail?: {entries: IComponentChangeType[]; owners: ComponentChanges[]; retiring: ComponentChanges[]};` → `…} | undefined;`. Das ` | undefined` steht hinter der schließenden geschweiften Klammer, vor dem Semikolon. Trägt 149, 746 und 818. Die Zeile ist danach 126 Zeichen lang und bleibt damit unter `lineWidth: 130`; Biome bricht sie nicht um.
     - Zeile 933: `#viewInstances?: ViewInstance[];` → `| undefined`. Trägt 239, 271, 303, 316, 337, 458, 816 und 896.

     `src/view/ComponentMemory.ts`
     - Zeile 16, im exportierten Interface `ComponentState`: `parentUuid?: string;` → `| undefined`. Trägt 96 und 109. Öffentlich.
     - Zeile 18, dasselbe Interface: `properties?: ComponentPropertiesType;` → `| undefined`. Trägt 83 und 109. Öffentlich.
     - `order?` und `autoDestructionOnParentRemoval?` in demselben Interface bleiben **unverändert**. Das ist kein Widerspruch zur Entscheidung beim `ViewComponent`-Konstruktor: hier schreibt der Code nie `undefined` in die beiden Felder — `order` wird als `order ?? 0` gesetzt beziehungsweise hinter `if (order !== undefined)`, und `autoDestructionOnParentRemoval` kommt über einen bedingten Spread ins Objekt, der den Schlüssel bei `false` gar nicht anlegt. Die enge Form sagt hier die Wahrheit.

     `src/view/IShadowObjectEnvProxy.ts`
     - Zeile 38: `onMessageToView?: (event: Omit<MessageToViewEvent, 'transferables'>) => any;` → `onMessageToView?: ((event: Omit<MessageToViewEvent, 'transferables'>) => any) | undefined;`. Klammern um den Funktionstyp sind Pflicht. Trägt die Fundstelle `ShadowEnv.ts:210`. Öffentlich.
     - Zeile 46: `onProxyFailed?: (reason: unknown) => any;` → `onProxyFailed?: ((reason: unknown) => any) | undefined;`. Trägt `ShadowEnv.ts:202`. Öffentlich.

     `src/view/RemoteWorkerEnv.ts`
     - Zeile 32, der Rückgabetyp der modul-internen Pfeilfunktion `splitTransferables`: `transferables?: TransferablesType` → `transferables?: TransferablesType | undefined`. Trägt die Fundstelle 50. Zum Umbruch dieser Zeile siehe Schritt 4.
     - Zeile 203: `#worker?: Worker;` → `| undefined`. Trägt 324, 416 und 461.

     `src/view/ShadowEnv.ts`
     - Zeile 45: `#comCtx?: ComponentContext;` → `| undefined`. Trägt 139.
     - Zeile 46: `#shaObjEnvProxy?: IShadowObjectEnvProxy;` → `| undefined`. Trägt 188.
     - Zeile 50: `#afterNextSync?: Promise<ChangeTrailType>;` → `| undefined`. Trägt 323, 328 und 359.
     - Zeile 51: `#settleAfterNextSync?: {resolve: (changeTrail: ChangeTrailType) => void; reject: (reason: unknown) => void};` → `…} | undefined;`. Trägt 322, 327, 360 und 453. Danach 122 Zeichen, bleibt unter `lineWidth: 130`.
     - Zeile 79: `#contextEffect?: Effect;` → `| undefined`. Trägt 369.

     `src/view/ViewComponent.ts`
     - Zeile 46: `#context?: ComponentContext;` → `| undefined`. Trägt 112, 119 und 287.
     - Zeile 48: `#parent?: ViewComponent;` → `| undefined`. Trägt 202 und 221.
     - Zeilen 185 bis 189, das Options-Literal des Konstruktors: **alle fünf** Felder bekommen ` | undefined`, in dieser Reihenfolge und ohne die Reihenfolge zu ändern:

       ```ts
       options?: {
         parent?: ViewComponent | undefined;
         order?: number | undefined;
         context?: ComponentContext | undefined;
         uuid?: string | undefined;
         autoDestructionOnParentRemoval?: boolean | undefined;
       },
       ```

       Warum alle fünf und nicht die zwei, die rot sind, steht in der Anmerkung »Warum alle fünf Konstruktor-Optionen«. Die fünf Zeilen tragen zusammen 45 der 46 Spec-Fundstellen. Öffentlich.

     `src/view/ShadowEnv.spec.ts`
     - Zeile 202: `refuseAfter?: number;` → `| undefined`. Ein Feld des Test-Doubles in derselben Datei, spec-lokal. Trägt die Fundstelle 404.

     Genau 28 Zeilen ändern sich. Ändert sich eine neunundzwanzigste, ist das ein Befund für den Report.
  3. Die eine Aufrufstelle, `src/view/LocalShadowObjectEnv.ts:40`:

     ```ts
     const data = structuredClone(message.data, {transfer: message.transferables ?? []});
     ```

     Genau dieser Zusatz, sonst nichts an der Zeile. Kein `as`-Cast, kein bedingter Aufruf, kein bedingter Spread — die Begründung samt Messung steht in der Anmerkung »Eine Fundstelle ist keine Deklaration«. Ein Kommentar darüber ist erwünscht und soll sagen, *warum* die leere Liste keine Änderung ist: WebIDL gibt dem Feld `[]` als Vorgabewert, ein fehlender Schlüssel und eine leere Liste erzeugen denselben Aufruf. Kein Rückblick auf den Vorzustand, keine Finding-ID.
  4. `src/view/RemoteWorkerEnv.ts:32` wird durch die Erweiterung 141 Zeichen lang und überschreitet damit als **einzige** Zeile dieses Pakets `lineWidth: 130`. Biome bricht die Signatur um; gemessen am 2026-08-26 über `biome format --stdin-file-path` genau so:

     ```ts
     const splitTransferables = (
       changeTrail: ChangeTrailType,
     ): {changeTrail: ChangeTrailType; transferables?: TransferablesType | undefined} => {
     ```

     Diese Form gleich schreiben, statt sie sich von `pnpm lint:fix` holen zu lassen. Die übrigen neun Dateien kommen aus derselben Formatprobe unverändert zurück.
  5. In `packages/shadow-objects/CHANGELOG.md` ein neues Bullet ans Ende des Abschnitts `### Types` unter `## [Unreleased]` — heute hinter Zeile 370, vor der Leerzeile, die `### Dependencies` einleitet. Form und Register wie die Bullets darüber, beginnend mit `- **Types (public API):**`. Inhalt: die vier Deklarationen beim Namen nennen — `MessageToViewEvent.traverseChildren`, `ComponentState.parentUuid` und `.properties`, `IShadowObjectEnvProxy.onMessageToView` und `.onProxyFailed`, und die fünf Optionen des `ViewComponent`-Konstruktors (`parent`, `order`, `context`, `uuid`, `autoDestructionOnParentRemoval`) — und sagen, was das für einen Konsumenten heißt: wer mit `exactOptionalPropertyTypes` compiliert, darf jedem dieser Felder `undefined` zuweisen, und beim Konstruktor heißt das, dass ein Optionsobjekt aus Werten gebaut werden darf, die fehlen dürfen; unter jeder anderen Konfiguration sind die Formen je derselbe Typ. Kein Bruch. Keine Finding-ID, kein Rückblick auf den Vorzustand.

     Die Zusammenfassung im Kopf von `## [Unreleased]` bleibt unangetastet: sie zählt, was bestehende Konsumenten bricht, und dieses Bullet bricht nichts. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
  6. Drei Zählproben, alle mit ihrer Ausgabe in den Report:
     - `pnpm exec tsc -p packages/shadow-objects/tsconfig.json --noEmit --exactOptionalPropertyTypes` meldet keine einzige Zeile unter `src/view/` mehr, und in der Summe 3 Fehler in 3 Dateien. Die Zahl ist der Beleg, dass die Erweiterungen nichts an anderer Stelle aufgerissen haben: 103 − 100 = 3, und die drei verbleibenden Dateien (`worker/MessageRouter.ts`, `worker/MessageRouter.spec.ts`, `worker/WorkerRuntime.ts`) sind die Arbeit von Paket 8.
     - `pnpm exec tsc -p packages/shadow-objects/tsconfig.json --noEmit` bleibt stumm — ohne den Schalter kostet dieses Paket nichts.
     - Nach `pnpm build`: die zehn erwarteten Zeilen stehen in `dist/`, und zwar dort und nirgends sonst.

       ```bash
       grep -rn '| undefined' packages/shadow-objects/dist/src/in-the-dark/Kernel.d.ts packages/shadow-objects/dist/src/view/ComponentMemory.d.ts packages/shadow-objects/dist/src/view/IShadowObjectEnvProxy.d.ts packages/shadow-objects/dist/src/view/ViewComponent.d.ts
       ```
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: `pnpm build` emittiert `dist/` neu; in den Deklarationen bewegen sich genau die zehn Zeilen aus der Anmerkung »Oberfläche« samt den vier zugehörigen `.d.ts.map`. Unter den `.js` bewegt sich `dist/src/view/LocalShadowObjectEnv.js` — das ist der `?? []` und die einzige Laufzeitänderung des Pakets — und mit ihm das gebündelte `dist/bundle.js`; `dist/src/view/RemoteWorkerEnv.js` kann seine Sourcemap bewegen, weil eine Quellzeile umgebrochen wurde. Alle übrigen `.js` bleiben stehen, weil esbuild Typannotationen nicht emittiert. Die Dateiliste unter `dist/` und die Form von `dist/package.json` bleiben, wie sie sind; `src/distContract.files.txt` und `src/distContract.package.json` werden nicht angefasst. Bewegt sich dort etwas, ist das ein Befund und kein Nachziehen. `pnpm typecheck` bleibt stumm, weil der Schalter noch nicht in `tsconfig.json` steht. `pnpm lint` meldet »Checked 219 files … No fixes applied«. `pnpm test` bleibt bei den Zahlen des Vorgängerpakets: 802/379/123/645. Bewegt sich eine Testzahl, ist das ein Befund und keine Nebensache. Die Coverage bewegt sich nicht nennenswert: es entsteht kein Statement, nur ein Zweig am `??`.
- Commit: `fix(types): the view layer's optional fields declare undefined`
- Ergebnis: 1 Runde · TYPE-002 (Teil 2c) behoben: die 100 Fundstellen unter `src/view/` sind weg, getragen von 28 Deklarationen, jede um ` | undefined` erweitert, und einer Aufrufstelle — `in-the-dark/Kernel.ts` (`MessageToViewEvent.traverseChildren`), `ComponentChanges.ts` (fünf `#`-private Felder), `ComponentContext.ts` (`ViewInstance.propIsEqual`, `#uncommittedTrail`, `#viewInstances`), `ComponentMemory.ts` (`ComponentState.parentUuid` und `.properties`, `order` und `autoDestructionOnParentRemoval` bewusst unangetastet), `IShadowObjectEnvProxy.ts` (`onMessageToView`, `onProxyFailed`, beide mit Klammern um den Funktionstyp), `RemoteWorkerEnv.ts` (Rückgabetyp von `splitTransferables` samt vorgegebenem Umbruch, `#worker`), `ShadowEnv.ts` (fünf Felder), `ViewComponent.ts` (`#context`, `#parent` und alle fünf Felder des Konstruktor-Options-Literals), `ShadowEnv.spec.ts` (`refuseAfter` am Test-Double) · die Aufrufstelle ist `LocalShadowObjectEnv.ts:40`, `structuredClone(…, {transfer: message.transferables ?? []})` mit Begründungskommentar; keine 29. Zeile bewegt sich, keine `= undefined`-Zuweisung ist angefasst · kein Regressionstest (28 reine Typannotationen, die esbuild rückstandslos löscht, plus eine gemessen verhaltensgleiche Aufrufstelle; Begründung siehe oben) · Zählproben: `tsc --exactOptionalPropertyTypes` 103 Fehler in 12 Dateien → 3 in 3, null unter `src/view/`, die drei Restfehler alle unter `src/worker/` (`MessageRouter.ts:124`, `MessageRouter.spec.ts:31`, `WorkerRuntime.ts:78`) und damit die Arbeit von Paket 8; ohne den Schalter stumm; im gebauten `dist/` stehen die zehn erwarteten `| undefined`-Zeilen in genau den vier `.d.ts` · Verify grün (exit=0, `paket-7.verify.log`): `pnpm lint` »Checked 219 files … No fixes applied«, Coverage 92,89 % (3385/3644) unverändert; die Testzahlen aus einem erzwungenen Lauf ohne Cache (`paket-7.tests-forced.log`, exit=0): 802/379/123/645 wie erwartet · Review ohne kritischen, wichtigen oder kleinen Befund
- Nebenbefunde: keine neuen · die beiden Einträge aus Zug 0 (`docs/api-reference.md:636`, `view/cloneChangeTrail.ts:7`) stehen unter »Offene Befunde«
- Folgen: keine
- Schnittstellen: Vier öffentliche Deklarationen tragen jetzt ` | undefined` und erreichen `dist/` in zehn Zeilen — `MessageToViewEvent.traverseChildren` (`dist/src/in-the-dark/Kernel.d.ts:11`) als `boolean | undefined` · `ComponentState.parentUuid` und `.properties` (`dist/src/view/ComponentMemory.d.ts:4` und `:6`) · `IShadowObjectEnvProxy.onMessageToView` und `.onProxyFailed` (`dist/src/view/IShadowObjectEnvProxy.d.ts:33` und `:40`, je der Funktionstyp in Klammern) · die fünf Felder des `ViewComponent`-Konstruktor-Options-Literals `parent`, `order`, `context`, `uuid`, `autoDestructionOnParentRemoval` (`dist/src/view/ViewComponent.d.ts:70-74`). Wer mit `exactOptionalPropertyTypes` compiliert, darf jedem dieser Felder `undefined` zuweisen; unter jeder anderen Konfiguration ist jede der zehn Zeilen derselbe Typ wie zuvor, es bricht nichts · Dateiliste unter `dist/` und Form von `dist/package.json` unverändert, `src/distContract.files.txt` und `src/distContract.package.json` unangetastet
- Ausdrücklich **nicht** tun, weil es beim Lesen dieser Zeilen naheliegt:
  - `src/view/cloneChangeTrail.ts:7` nicht anfassen. Das `transferables as any` dort steht als Nebenbefund unter »Offene Befunde« und ist gemessen tragfrei — es ist trotzdem nicht die Arbeit dieses Pakets.
  - `src/worker/MessageRouter.ts:124` und `src/worker/WorkerRuntime.ts:78` nicht anfassen. Die drei Fundstellen unter `src/worker/` gehören Paket 8, auch die, die genauso aussieht wie `LocalShadowObjectEnv.ts:40`.
  - Keine der `= undefined`-Zuweisungen durch `delete`, durch einen bedingten Objektaufbau oder durch einen `as`-Cast ersetzen. Der Schalter existiert, um genau diese Zuweisungen sichtbar zu machen; sie wegzuformulieren wäre eine Laufzeitänderung für ein Typproblem.
  - `docs/` und `README.md` nicht anfassen. Gemessen: keine der vier öffentlichen Deklarationen zieht Doku nach, die Begründung je Stelle steht in der Anmerkung »Doku«.
  - `ComponentState.order` und `ComponentState.autoDestructionOnParentRemoval` nicht erweitern, obwohl sie im selben Interface stehen wie die beiden, die erweitert werden. Begründung in Schritt 2.

**TYPE-002 · low · tsconfig.json:5-45** — Die tsconfig kennt weder noUncheckedIndexedAccess noch exactOptionalPropertyTypes

Die Wurzelkonfiguration ist an vielen Stellen strenger als der Standard — strict, noImplicitOverride, noUnusedLocals, noPropertyAccessFromIndexSignature. Zwei Schalter fehlen, und beide treffen Muster, die dieser Code laufend benutzt: ohne noUncheckedIndexedAccess ist this.#children[i - 1].order in Entity.#insertChildInOrder ein Zugriff, den der Typprüfer für sicher hält, obwohl er es nur wegen der Schleifenbedingung daneben ist; ohne exactOptionalPropertyTypes ist ein optionales Feld, dem jemand explizit undefined zuweist, nicht von einem fehlenden zu unterscheiden — und das Datenmodell der Change Trails lebt genau von dieser Unterscheidung (siehe CONS-006).

Empfehlung: Einzeln einschalten und die Fehlerliste ansehen, bevor entschieden wird. noUncheckedIndexedAccess wird die längere Liste erzeugen; exactOptionalPropertyTypes ist der Schalter, der inhaltlich zu diesem Projekt gehört, weil »Schlüssel ohne Wert« hier eine eigene Bedeutung hat.

Beleg im Audit: Am Manifest nachgelesen (2026-08-19): beide Optionen fehlen in tsconfig.json, und keine der drei per-Paket-Konfigurationen setzt sie nach.

Zu diesem Paket gehören ausschließlich die 100 Fundstellen unter `src/view/` samt den 28 Deklarationen und der einen Aufrufstelle, die sie tragen — darunter eine Deklaration in `src/in-the-dark/Kernel.ts`, also außerhalb dieses Verzeichnisses. Der erste Schalter ist mit Paket 4 (40d550b) erledigt, die Element-Dateien mit Paket 5 (3131aed), `in-the-dark/` mit Paket 6 (03a026d); die übrigen 3 Fundstellen des zweiten gehören Paket 8, und dort legt es ihn dauerhaft in die Konfiguration. Die Zeilenangabe `5-45` meint den `compilerOptions`-Block der Wurzeldatei und zeigt heute auf 4-44.

### [x] 8. `exactOptionalPropertyTypes`: die Worker-Seite und der Schalter
- Findings: TYPE-002 (Teil 2d)
- Ziel: `worker/` ist fehlerfrei, und der Schalter steht dauerhaft in `tsconfig.json`, wo ihn `pnpm typecheck` von jetzt an prüft — in beiden Projekten, die diese Konfiguration erben.
- Bereich: `packages/shadow-objects/src/worker/` (2 Deklarationen, 1 Aufrufstelle), `tsconfig.json` (der Schalter), `packages/shadow-objects-e2e/playwright.config.ts` (was der Schalter dort aufreißt), `packages/shadow-objects/CHANGELOG.md`, Wurzel-`CHANGELOG.md`
- Hängt ab von: 7
- Anmerkung (Form der Erweiterung, aus Paket 5, Zug 0): Die Fundstellen dieses Schalters haben
  durchweg dieselbe Gestalt — ein optionales Feld, dem der Code an anderer Stelle ausdrücklich
  `undefined` zuweist, um es zu leeren. Behoben wird an der Deklaration (`?: T | undefined`) und
  nicht an der Zuweisung; bei einem Funktionstyp mit Klammern (`?: (() => void) | undefined`), sonst
  liest der Prüfer `() => (void | undefined)`, also einen Rückgabetyp statt eines leeren Feldes.
  `delete` ist kein Ausweg — auf einem `#`-privaten Feld ist es ein Syntaxfehler (TS18011) —, und
  das `?` wegzunehmen verlangt unter `strictPropertyInitialization` einen Initialisierer, den
  `useDefineForClassFields: false` in eine Zuweisung im Konstruktor übersetzt: eine Laufzeitänderung
  für ein reines Typproblem.
- Anmerkung (Vollständigkeit, aus Paket 5, Zug 0, hier nachgemessen 2026-08-26): Die vier Teilpakete
  decken alle 134 Fundstellen ab. Keine Datei unmittelbar unter `packages/shadow-objects/src/` trägt
  eine — nachgesehen und nicht vermutet: die Fehlerliste dieses Pakets nennt drei Dateien, alle drei
  unter `src/worker/`. Die Frage ist damit beantwortet und fällt nicht durch.
- Anmerkung (Abgleich, 2026-08-26): Der Sachverhalt besteht unverändert und die Zahl aus Paket 7
  stimmt auf den Fehler genau. `pnpm exec tsc -p tsconfig.json --noEmit --exactOptionalPropertyTypes`
  in `packages/shadow-objects` meldet 3 Fehler in 3 Dateien: `worker/MessageRouter.spec.ts:31`
  (TS2379), `worker/MessageRouter.ts:124` (TS2769), `worker/WorkerRuntime.ts:78` (TS2412). Zwei sind
  die gewohnte Deklarationserweiterung, die dritte ist eine Aufrufstelle mit Vorbild in Paket 7.
- Anmerkung (Die dritte Fundstelle hat schon ein Vorbild, aus Paket 7, Zug 0): `MessageRouter.ts:124`
  ist `this.postMessage({type: MessageToView, data}, {transfer})` und meldet TS2769 — dieselbe Lage
  wie `view/LocalShadowObjectEnv.ts:40`, das Paket 7 behandelt hat. Das Ziel ist der zweite Parameter
  von `typeof self.postMessage`, unter `lib: ["ES2022", "DOM", "DOM.Iterable"]` also
  `WindowPostMessageOptions` mit `transfer?: Transferable[]` ohne `| undefined`; eine
  Bibliotheksdeklaration von TypeScript ist nichts, was ein Paket dieses Laufs erweitert. Behoben
  wird deshalb an der Aufrufstelle, mit `?? []`: WebIDL gibt dem Feld `[]` als Vorgabewert, ein
  fehlender Schlüssel und eine leere Liste erzeugen denselben Aufruf, und nur eine nichtleere Liste
  löst etwas ab (nachgemessen unter Node 25.9.0, Paket 7).
- Anmerkung (Der Schalter reicht weiter als dieses Verzeichnis, gemessen 2026-08-26): `tsconfig.json`
  in der Wurzel wird von genau zwei Projekten geerbt, und beide fahren ein `typecheck`-Skript —
  `packages/shadow-objects` und `packages/shadow-objects-e2e`. Die anderen beiden Workspace-Pakete
  haben weder eine `tsconfig.json` noch ein `typecheck`-Skript und tragen keine einzige
  TypeScript-Datei (`shae-offscreen-canvas`: 22 `.js`, `shadow-objects-testing`: 31 `.js`); der
  Schalter geht an ihnen vorbei, und das ist kein Loch, sondern die Sprachverteilung.
  **Im E2E-Projekt reißt er eine Stelle auf**, die dieses Paket mitzunehmen hat:
  `pnpm exec tsc -p packages/shadow-objects-e2e/tsconfig.json --noEmit --exactOptionalPropertyTypes`
  meldet genau einen Fehler, `playwright.config.ts:12` (TS2769) über
  `workers: process.env['CI'] ? 1 : undefined`. Playwright deklariert `workers?: number|string` ohne
  `| undefined`. Das ist kein Nebenbefund — ohne diesen Schalter ist die Zeile tadellos —, sondern
  das, was die eigene Änderung dieses Pakets umwirft, und damit gehört sie hierher. Ließe man sie
  liegen, wäre `pnpm typecheck` nach dem Commit rot und das erklärte Ziel des Pakets verfehlt.
  Dieselbe Prüfung hat Paket 4 für `noUncheckedIndexedAccess` bestanden, dort ohne Fund.
- Anmerkung (Warum die Zeile im E2E-Projekt so und nicht anders fällt, gemessen 2026-08-26): Der
  Schlüssel wird nur noch auf CI gesetzt, sonst gar nicht — `...(process.env['CI'] ? {workers: 1} : {})`.
  Das ist verhaltensgleich, und zwar nachgesehen statt vermutet: `lib/common/index.js:579` von
  playwright 1.62.1 löst den Wert über `takeFirst(…, userConfig.workers, "50%")` auf, und
  `takeFirst` (Zeile 515-521) überspringt jedes `undefined`. Ein ausdrückliches `undefined` und ein
  fehlender Schlüssel landen also beide auf `"50%"`, der dokumentierten Vorgabe »half of the number
  of logical CPU cores«. Auch der Validator prüft beides gleich: `if ("workers" in project &&
  project.workers !== void 0)` (Zeile 1508). Verworfen wurde, statt `undefined` den Wert `'50%'`
  hinzuschreiben: das friert eine Vorgabe ein, die Playwright selbst wählt.
- Anmerkung (Oberfläche, Frage aus Paket 4, 5 und 6, hier beantwortet, gemessen 2026-08-26): Zwei
  Fragen, zwei getrennte Antworten. **Der Schalter selbst formt die Deklarationen nicht.**
  `tsc -p packages/shadow-objects/tsconfig.lib.json` einmal mit und einmal ohne
  `--exactOptionalPropertyTypes` in zwei getrennte Verzeichnisse emittiert, `diff -r -x '*.d.ts.map'`
  darüber: identisch, auf der unveränderten wie auf der gefixten Quelle. Er gehört damit als
  Konfigurationsänderung in die Wurzel-`CHANGELOG.md`. **Die Quelländerung bewegt genau eine Zeile:**
  `dist/src/worker/WorkerRuntime.d.ts:5`, `router?: MessageRouter;` → `router?: MessageRouter | undefined;`.
  Sonst nichts; die Dateiliste unter `dist/` ist Zeichen für Zeichen dieselbe, also bleiben
  `src/distContract.files.txt` und `src/distContract.package.json` unangetastet.
- Anmerkung (Diese eine Zeile ist keine öffentliche API, gemessen 2026-08-26): Und deshalb steht ihr
  Bullet unter `### Internal` und nicht unter `### Types (public API)`, wo die Bullets der Pakete 5,
  6 und 7 stehen. `WorkerRuntime` ist von keinem Eintrag der `exports`-Karte aus erreichbar: eine
  Karte ohne Platzhalter (`src/distContract.package.json` führt zehn feste Einträge, keinen davon
  auf `./worker/…`), `dist/src/index.d.ts` fasst `worker/` nicht an, und
  `dist/src/shadow-objects.worker.d.ts` — der einzige Eintrag, der über den Worker-Einstieg führt —
  ist wörtlich `export {};`. Wer `#private` überspringt und die Datei trotzdem im Tarball liest,
  sieht die geänderte Zeile; importieren kann er sie nicht. »public API« darüberzuschreiben wäre
  eine Falschaussage in veröffentlichter Doku, und `AGENTS.md` §4 führt genau das als die
  gefährlichste Sorte. Weggelassen wird das Bullet trotzdem nicht: `CLAUDE.md` weist dem
  Paket-Changelog ausdrücklich die »output/contract changes« zu, und eine bewegte Zeile in einer
  ausgelieferten `.d.ts` ist eine.
- Anmerkung (aus Paket 7, Zug 0): `in-the-dark/Kernel.ts` ist von Paket 7 ein zweites Mal angefasst
  worden — `MessageToViewEvent.traverseChildren` trägt seither ` | undefined`, neben dem
  `transferables` aus Paket 6. Beide Zeilen bleiben, wie sie sind; dieses Paket hat in der Datei
  nichts zu tun.
- Hash: dcae46a
- Modell: mittlere Stufe
- Effort: medium
- Anmerkung (warum nicht `low`, Zug 0): Der Auftrag unten ist so exakt geschrieben, dass `low` naheläge — jede Zeile steht im Wortlaut da. Er bleibt trotzdem auf `medium`: dieses Paket legt den Schalter um, gegen den ab jetzt jedes Folgepaket compiliert, und es ist das einzige dieses Laufs, das ein zweites Projekt anfasst. Die drei Vorgängerpakete gleicher Bauart (5, 6, 7) sind auf `medium` je in einer Runde mit sauberem Review durchgekommen; an der Stelle, an der eine zusätzliche Runde am teuersten wäre, wird die Stufe nicht gesenkt.
- Dateien: `packages/shadow-objects/src/worker/WorkerRuntime.ts` · `packages/shadow-objects/src/worker/MessageRouter.ts` · `packages/shadow-objects/src/worker/MessageRouter.spec.ts` · `tsconfig.json` · `packages/shadow-objects-e2e/playwright.config.ts` · `packages/shadow-objects/CHANGELOG.md` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Zwei der vier Codezeilen sind Typannotationen an Deklarationen, die esbuild beim Transpilieren rückstandslos löscht. Die dritte ist die Aufrufstelle in `MessageRouter.ts:124` und gemessen verhaltensgleich — dieselbe Lage, dieselbe Messung wie in Paket 7 (`LocalShadowObjectEnv.ts:40`): ein fehlender `transfer`-Schlüssel, `undefined` und `[]` erzeugen denselben Aufruf, nur eine nichtleere Liste löst etwas ab. Die vierte ist `playwright.config.ts`, und ihre Verhaltensgleichheit steht an playwrights eigenem `takeFirst` in der Anmerkung oben; der Beleg ist der E2E-Lauf im Verify, der danach dieselbe Zahl meldet. Ein Test auf eine dieser Stellen hätte keinen Defekt hinter sich und wäre ein reiner Änderungsmelder. Den Nachweis führen die fünf Zählproben in Schritt 8 und der Verify-Lauf. Fällt beim Durchgehen doch ein echter Korrektheitsfehler an, gehört er in den Report und nicht in diesen Commit.
- Vorgehen:
  1. Die Fehlerliste erzeugen und als Arbeitsgrundlage behalten. Aus `packages/shadow-objects`:

     ```bash
     pnpm exec tsc -p tsconfig.json --noEmit --exactOptionalPropertyTypes
     ```

     Erwartet sind die 3 Fehler in 3 Dateien aus der Anmerkung »Abgleich«. Eine andere Zahl heißt, dass sich der Code bewegt hat; dann gehört die neue Zahl in den Report, und die Regel aus Schritt 2 gilt unverändert weiter, weil sie an der Form der Fundstelle hängt und nicht an ihrer Zeilennummer. In diesem Schritt steht der Schalter noch auf der Kommandozeile; in die Konfiguration wandert er in Schritt 4, und zwar erst, wenn die drei Fundstellen weg sind.
  2. Zwei Deklarationen erweitern, jede um ` | undefined`, sonst nichts an der Zeile und nichts an ihrem Kommentar. **Keine Zuweisung wird angefasst** — `WorkerRuntime.ts:78` (`this.router = undefined;`) bleibt wörtlich stehen, denn sie ist die Aussage, die der Schalter erst prüfbar macht. Die Zeilennummern sind vom 2026-08-26; maßgeblich ist der Feldname.

     `src/worker/WorkerRuntime.ts`
     - Zeile 6, das öffentliche Feld der exportierten Klasse `WorkerRuntime`: `router?: MessageRouter;` → `router?: MessageRouter | undefined;`. Trägt die Fundstelle 78. Das ist die einzige Zeile dieses Pakets, die eine emittierte Deklaration bewegt.

     `src/worker/MessageRouter.spec.ts`
     - Zeile 20, im modul-lokalen Interface `PostedMessage`: `options?: StructuredSerializeOptions;` → `options?: StructuredSerializeOptions | undefined;`. Trägt die Fundstelle 31, wo `posted.push({message, options})` den optionalen Parameter der Test-Double-Funktion `postMessage` weiterreicht. Spec-lokal, erreicht keine Deklaration.

     Genau 2 Zeilen ändern sich. Ändert sich eine dritte, ist das ein Befund für den Report.
  3. Die eine Aufrufstelle, `src/worker/MessageRouter.ts:124`, in der Methode `onMessageToView`:

     ```ts
     // WebIDL defaults `transfer` to `[]`, so a missing key and an empty list are the same call.
     this.postMessage({type: MessageToView, data}, {transfer: transfer ?? []});
     ```

     Genau dieser Zusatz und genau dieser Kommentar, sonst nichts an der Zeile. Der Kommentar ist wörtlich der, den Paket 7 an der gleichartigen Stelle `view/LocalShadowObjectEnv.ts:40` geschrieben hat — dieselbe Tatsache, dieselbe Formulierung, damit ein Leser dieser Datei sie nicht in der anderen suchen muss. Kein `as`-Cast, kein bedingter Aufruf, kein bedingter Spread. Die Zeile darüber (`const {transferables: transfer, ...data} = event;`) bleibt unverändert; der Name `transfer` kommt von dort.
  4. Erst jetzt der Schalter. In `tsconfig.json` in der Wurzel, im Block `compilerOptions`, eine Zeile einfügen:

     ```json
     "exactOptionalPropertyTypes": true,
     ```

     Sie kommt zwischen `"alwaysStrict": true,` (heute Zeile 16) und `"noImplicitAny": true,` (heute Zeile 17). Das ist die alphabetische Stelle, und die Nachbarschaft ist alphabetisch geführt — Paket 4 hat `noUncheckedIndexedAccess` aus demselben Grund zwischen `noImplicitThis` und `noUnusedLocals` gelegt. Sonst nichts an der Datei; insbesondere bleibt `"outDir": "./build-tmp"` stehen, das gehört Paket 10. Die per-Paket-Konfigurationen werden nicht angefasst: `packages/shadow-objects/tsconfig.json`, `packages/shadow-objects/tsconfig.lib.json` und `packages/shadow-objects-e2e/tsconfig.json` erben den Schalter über `extends`, und keine von ihnen soll ihn übersteuern.
  5. `packages/shadow-objects-e2e/playwright.config.ts`, heute die Zeilen 22 bis 24. Der Block

     ```ts
     /* Opt out of parallel tests on CI. */
     // biome-ignore lint/complexity/useLiteralKeys: process.env is typed via an index signature; noPropertyAccessFromIndexSignature (TS4111) requires the bracket form.
     workers: process.env['CI'] ? 1 : undefined,
     ```

     wird zu

     ```ts
     // One worker on CI. Everywhere else the key stays out of the object: `workers` is declared
     // `number | string`, and its absence is what hands the count to Playwright's own default of
     // half the logical cores.
     // biome-ignore lint/complexity/useLiteralKeys: process.env is typed via an index signature; noPropertyAccessFromIndexSignature (TS4111) requires the bracket form.
     ...(process.env['CI'] ? {workers: 1} : {}),
     ```

     Die `biome-ignore`-Zeile wird wörtlich übernommen und bleibt unmittelbar über der Codezeile stehen. Die dreizeilige `//`-Form des erklärenden Kommentars ist die Form, die diese Datei für mehrzeilige Kommentare selbst benutzt (siehe `preserveOutput` darunter); die Einzeiler des Playwright-Gerüsts bleiben `/* … */`. Gemessen an dieser exakten Fassung: `tsc` mit und ohne Schalter je stumm, und `biome format --stdin-file-path` gibt die Datei unverändert zurück. Sonst nichts an der Datei — die drei anderen `process.env['CI']`-Stellen bleiben, wie sie sind.
  6. In `packages/shadow-objects/CHANGELOG.md` ein Bullet in den Abschnitt `### Internal` unter `## [Unreleased]`, hinter das Bullet `- **Internal (lint):** …` und vor `- **Packaging:** …` (heute zwischen Zeile 421 und 422). Der Schwanz dieses Abschnitts ist nach dem fett gesetzten Präfix alphabetisch geführt, und `Internal (worker)` steht dort zwischen `Internal (lint)` und `Packaging`. Die Bullets dieser Datei sind je **eine** Zeile, sie werden nicht umgebrochen. Inhalt, in eigenen Worten und im Register der Nachbarn:

     - Öffnet mit `- **Internal (worker):**`.
     - Nennt `WorkerRuntime.router` beim Namen, dass es als `MessageRouter | undefined` deklariert ist und damit eine Zeile von `dist/src/worker/WorkerRuntime.d.ts` bewegt.
     - Sagt, warum das keine öffentliche API ist: das Modul steht in keinem Eintrag der `exports`-Karte, weder unter `.` noch unter `./shadow-objects.worker.js`, dessen Deklaration leer ist. Nichts, was ein Konsument importieren kann, ändert seine Form.

     Keine Finding-ID, kein Rückblick auf den Vorzustand. Die Zusammenfassung im Kopf von `## [Unreleased]` bleibt unangetastet: sie zählt, was bestehende Konsumenten bricht, und dieses Bullet bricht nichts. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
  7. In der Wurzel-`CHANGELOG.md` einen neuen datierten Abschnitt ganz oben einfügen, über `## 2026-08-26 — index access is checked`. Dieser Abschnitt ist die direkte Fortsetzung von jenem, und er nimmt dessen Form: Überschrift `## 2026-08-26 — optional properties say whether they may be undefined`, darunter drei Bullets, jedes mit dem fett gesetzten Pfad in Backticks eröffnend, Fließtext auf ~95 Zeichen umgebrochen wie die Nachbarn.

     - **`tsconfig.json`** — der Schalter ist an. Was er heißt: ein optionales Feld nimmt ein ausdrückliches `undefined` nur noch an, wenn sein Typ das sagt, womit »der Schlüssel fehlt« und »der Schlüssel ist da und hält nichts« zwei verschiedene Aussagen werden — die Unterscheidung, von der das Change-Trail-Datenmodell dieses Projekts lebt. Dazu die Reichweite: er sitzt in der Workspace-Wurzel und erreicht `packages/shadow-objects` und `packages/shadow-objects-e2e`, die beiden Projekte, die diese Konfiguration erben; die übrigen zwei Workspace-Pakete tragen keine TypeScript-Datei.
     - **`packages/shadow-objects/src`** — was der Schalter dort verlangt hat: `WorkerRuntime.router` und das Feld `options` des spec-lokalen `PostedMessage` in `worker/MessageRouter.spec.ts` tragen `| undefined`, und `MessageRouter.onMessageToView()` reicht `structuredClone` eine leere Transferliste statt einer fehlenden, was WebIDL als denselben Aufruf definiert. Dazu der Satz, der bei Paket 4 an dieser Stelle stand und hier anders ausfällt: eine ausgelieferte Deklarationszeile bewegt sich mit, und sie ist im eigenen `CHANGELOG.md` des Pakets vermerkt.
     - **`packages/shadow-objects-e2e/playwright.config.ts`** — die Worker-Zahl wird nur auf CI gesetzt; sonst bleibt der Schlüssel aus dem Konfigurationsobjekt heraus, und genau so wird Playwright seine eigene Vorgabe von der Hälfte der logischen Kerne überlassen. `workers` ist als `number | string` deklariert und nimmt kein `undefined`.

     Ein Changelog hält einen Übergang fest, das ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben, und der Abschnitt darunter ist das Vorbild. Keine Finding-ID.
  8. Fünf Zählproben, alle mit ihrer Ausgabe in den Report:
     - `pnpm exec tsc -p packages/shadow-objects/tsconfig.json --noEmit --exactOptionalPropertyTypes` bleibt stumm. 3 → 0, keine neue Fundstelle.
     - `pnpm exec tsc -p packages/shadow-objects-e2e/tsconfig.json --noEmit --exactOptionalPropertyTypes` bleibt stumm. 1 → 0.
     - `pnpm typecheck` ist grün — und ab jetzt ist das derselbe Lauf wie die beiden darüber, denn der Schalter steht in der Konfiguration. Das ist der eigentliche Beleg dieses Pakets.
     - Nach `pnpm build`: die eine erwartete Zeile steht in `dist/`, und zwar dort und nirgends sonst.

       ```bash
       grep -rn 'router?: MessageRouter' packages/shadow-objects/dist/src/worker/WorkerRuntime.d.ts
       ```

       Erwartet: `router?: MessageRouter | undefined;`.
     - Die Dateiliste unter `dist/` hat sich nicht bewegt:

       ```bash
       cd packages/shadow-objects && diff <(cd dist && find . -type f | sed 's|^\./||' | sort) <(sort src/distContract.files.txt)
       ```

       Erwartet: leer. Bewegt sich hier etwas, ziehen `src/distContract.files.txt` und `src/distContract.package.json` mit — und das wäre ein Befund für den Report, kein stilles Nachziehen.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: `tsconfig.json` steht in `globalDependencies` von `turbo.json` — die Änderung entwertet jeden turbo-Cache, `build`, `typecheck` und `test` laufen also vollständig durch (Baseline 1m01s). Das ist erwartet und kein Fehlersignal; ein erzwungener Lauf wie bei Paket 7 ist diesmal nicht nötig. `pnpm build` emittiert `dist/` neu: in den Deklarationen bewegt sich genau `dist/src/worker/WorkerRuntime.d.ts:5` samt zugehöriger `.d.ts.map`. Unter den `.js` bewegt sich `dist/src/worker/MessageRouter.js` — das ist der `?? []` und die einzige Laufzeitänderung des Pakets — samt Sourcemap, und mit ihm das gebündelte `dist/bundle.js`, in dem der Worker inline steht. `dist/src/worker/WorkerRuntime.js` bleibt stehen, weil esbuild Typannotationen nicht emittiert. Die Dateiliste unter `dist/` und die Form von `dist/package.json` bleiben, wie sie sind. `pnpm typecheck` ist grün, und zum ersten Mal in diesem Lauf mit dem Schalter — das ist die Aussage des Pakets. `pnpm lint` meldet »Checked 219 files … No fixes applied«. `pnpm test` bleibt bei den Zahlen des Vorgängerpakets: 802/379/123/645; die E2E-Zahl 645 ist die, an der die Änderung an `playwright.config.ts` hängt, und sie bewegt sich nicht. Bewegt sich eine Testzahl, ist das ein Befund und keine Nebensache. Die Coverage bewegt sich nicht nennenswert: es entsteht kein Statement, nur ein Zweig am `??` (Paket 7: 92,89 %, 3385/3644).
- Commit: `build(ts): enable exactOptionalPropertyTypes across the workspace`
- Ergebnis: 1 Runde · TYPE-002 (Teil 2d) behoben und TYPE-002 damit ganz erledigt — `exactOptionalPropertyTypes` steht seit diesem Commit in `tsconfig.json` und wird von `pnpm typecheck` in beiden erbenden Projekten geprüft · zwei Deklarationen erweitert (`worker/WorkerRuntime.ts:6` `router?: MessageRouter | undefined`, `worker/MessageRouter.spec.ts:20` `options?: StructuredSerializeOptions | undefined`), eine Aufrufstelle auf `{transfer: transfer ?? []}` gebracht (`worker/MessageRouter.ts`, `onMessageToView`), `playwright.config.ts` setzt `workers` nur noch auf CI (`...(process.env['CI'] ? {workers: 1} : {})`) · vom eigenen Umbau erzwungen und mitgezogen: die Assertion des Tests »forwards a kernel message to the view« in `MessageRouter.spec.ts` prüft `{transfer: []}` statt `{transfer: undefined}` · kein Regressionstest (Typprüfung scharfgeschaltet, alle vier Codezeilen gemessen verhaltensgleich); Nachweis sind die fünf Zählproben: `tsc --exactOptionalPropertyTypes` in beiden Projekten stumm (3 → 0 und 1 → 0), `pnpm typecheck` grün und ab jetzt derselbe Lauf, `dist/src/worker/WorkerRuntime.d.ts` trägt `router?: MessageRouter | undefined;`, und der Vergleich der `dist/`-Dateiliste gegen `src/distContract.files.txt` bleibt leer · Verify viermal grün, Testzahlen unbewegt bei 802/379/123/645, `pnpm lint` »Checked 219 files … No fixes applied«, Coverage 92,89 % (3385/3644) · Review ohne kritischen, wichtigen oder kleinen Befund
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: `exactOptionalPropertyTypes` ist in der Wurzel-`tsconfig.json` gesetzt und wird über `extends` von `packages/shadow-objects/tsconfig.json`, `packages/shadow-objects/tsconfig.lib.json` und `packages/shadow-objects-e2e/tsconfig.json` geerbt — jedes Folgepaket compiliert dagegen, und ein optionales Feld nimmt ein ausdrückliches `undefined` nur noch an, wenn sein Typ das sagt · `WorkerRuntime.router` ist in `dist/src/worker/WorkerRuntime.d.ts:5` als `MessageRouter | undefined` deklariert; das Modul ist von keinem Eintrag der `exports`-Karte erreichbar, es ist also keine öffentliche API und bricht nichts · Dateiliste unter `dist/` und Form von `dist/package.json` unverändert, `src/distContract.files.txt` und `src/distContract.package.json` unangetastet

**TYPE-002 · low · tsconfig.json:5-45** — Die tsconfig kennt weder noUncheckedIndexedAccess noch exactOptionalPropertyTypes

Die Wurzelkonfiguration ist an vielen Stellen strenger als der Standard — strict, noImplicitOverride, noUnusedLocals, noPropertyAccessFromIndexSignature. Zwei Schalter fehlen, und beide treffen Muster, die dieser Code laufend benutzt: ohne noUncheckedIndexedAccess ist this.#children[i - 1].order in Entity.#insertChildInOrder ein Zugriff, den der Typprüfer für sicher hält, obwohl er es nur wegen der Schleifenbedingung daneben ist; ohne exactOptionalPropertyTypes ist ein optionales Feld, dem jemand explizit undefined zuweist, nicht von einem fehlenden zu unterscheiden — und das Datenmodell der Change Trails lebt genau von dieser Unterscheidung (siehe CONS-006).

Empfehlung: Einzeln einschalten und die Fehlerliste ansehen, bevor entschieden wird. noUncheckedIndexedAccess wird die längere Liste erzeugen; exactOptionalPropertyTypes ist der Schalter, der inhaltlich zu diesem Projekt gehört, weil »Schlüssel ohne Wert« hier eine eigene Bedeutung hat.

Beleg im Audit: Am Manifest nachgelesen (2026-08-19): beide Optionen fehlen in tsconfig.json, und keine der drei per-Paket-Konfigurationen setzt sie nach.

Zu diesem Paket gehören die letzten 3 Fundstellen des zweiten Schalters — alle drei unter `src/worker/` — und der Schalter selbst, der hier dauerhaft in `tsconfig.json` wandert. Dazu die eine Stelle, die er dabei im E2E-Projekt aufreißt. Damit ist TYPE-002 ganz behoben: der erste Schalter mit Paket 4 (40d550b), die Element-Dateien mit Paket 5 (3131aed), `in-the-dark/` mit Paket 6 (03a026d), `view/` mit Paket 7 (37750d1). Die Zeilenangabe `5-45` meint den `compilerOptions`-Block der Wurzeldatei und zeigt heute auf 4-44.

- Ausdrücklich **nicht** tun, weil es beim Lesen dieser Zeilen naheliegt:
  - `src/view/cloneChangeTrail.ts:7` nicht anfassen. Das `transferables as any` dort sieht aus wie eine vierte Fundstelle desselben Schalters und ist keine: der Wert ist an der Stelle bereits auf `TransferablesType` verengt, der Cast ist gemessen tragfrei (Paket 7), und der Eintrag steht unter »Offene Befunde« mit dem Urteil `→ Audit`.
  - Keine der `= undefined`-Zuweisungen durch `delete`, durch einen bedingten Objektaufbau oder durch einen `as`-Cast ersetzen — `WorkerRuntime.ts:78` allen voran. Der Schalter existiert, um genau diese Zuweisungen sichtbar zu machen; sie wegzuformulieren wäre eine Laufzeitänderung für ein Typproblem.
  - Den Schalter nicht in einer per-Paket-`tsconfig.json` setzen und in keiner davon übersteuern. Er gehört in die Wurzel, dort steht auch `noUncheckedIndexedAccess` seit Paket 4, und die drei erbenden Konfigurationen werden in diesem Paket nicht geöffnet.
  - `docs/` und `README.md` nicht anfassen. Gemessen: die eine bewegte Deklaration kommt in `packages/shadow-objects/docs/` und in keinem `README.md` vor; die Textstellen, die `WorkerRuntime` erwähnen, beschreiben sein Verhalten und keine Feldtypen.
  - `AGENTS.md` und `CLAUDE.md` nicht anfassen. Keine der beiden nennt einen Strictness-Schalter der `tsconfig.json`; Paket 4 hat sie aus demselben Grund nicht angefasst.
  - Die drei übrigen `process.env['CI']`-Stellen in `playwright.config.ts` nicht anfassen. Nur `workers` fällt unter dem Schalter; `forbidOnly`, `retries` und `reuseExistingServer` sind unter ihm stumm.
  - Nicht nach weiteren Fundstellen in `packages/shae-offscreen-canvas` oder `packages/shadow-objects-testing` suchen. Beide sind reines JavaScript und haben weder `tsconfig.json` noch `typecheck`-Skript; dort gibt es nichts zu prüfen und nichts zu ändern.

### [x] 9. Globale Namen auf den Paketnamen bringen
- Findings: CONS-015 (info)
- Ziel: Kein realmweit sichtbarer Name dieses Pakets trägt mehr den Projektnamen, unter dem es nicht mehr erscheint.
- Bereich: `packages/shadow-objects/src/{view/ComponentContext.ts,bundle.ts,constants.ts}`, `packages/shadow-objects/docs/concepts.md`, `packages/shadow-objects/CHANGELOG.md`, `packages/shadow-objects-e2e/{src/bundle-tests.js,TEST-PLAN.md}`
- Hängt ab von: —
- Hash: 260965e
- Modell: mittlere Stufe
- Effort: low
- Anmerkung (Abgleich, 2026-08-26): Beide Fundstellen des Audits stehen unverändert im Baum, nur verschoben. `ComponentContext.ts:18` ist weiterhin Zeile 18 (die Deklaration im `declare global`-Block), `:84` ist heute 83, 84 und 86 — drei Zugriffe in `static getContextsMap()`. Die Angabe `src/bundle.ts:7,10` meint `packages/shadow-objects/src/bundle.ts` und steht heute auf 6 (Deklaration) und 9 (Zuweisung). Kein Vorgänger-Paket dieses Laufs hat eine der beiden Dateien angefasst.
- Anmerkung (dritte Fundstelle, gemessen 2026-08-26): `packages/shadow-objects/src/constants.ts:19` trägt `Symbol.for('ShadowEntsGlobalNS')` — derselbe tote Projektname an derselben Art Ort. Die globale Symbol-Registry ist genauso realmweit wie `globalThis`; das Audit zählt zwei Namen, weil es diesen dritten übersehen hat, nicht weil er anders läge. Er kommt in dieses Paket, aus zwei Gründen. Erstens ist die Ursache dieselbe, und drei Stellen einer Ursache sind ein Paket. Zweitens ist der Bruch beider Umbenennungen derselbe und wird hier ein einziges Mal bezahlt: zwei nebeneinander geladene Kopien der Bibliothek finden einander über einen umbenannten Schlüssel nicht mehr, gleich ob er `globalThis.__shadowEntsContexts` heißt oder `Symbol.for('ShadowEntsGlobalNS')`. Diese Stelle später nachzuziehen hieße, denselben Bruch ein zweites Mal auszuliefern. Vorbestehend, nachgesehen und nicht vermutet: `git show bfcc54b:packages/shadow-objects/src/constants.ts` trägt dieselbe Zeile.
- Anmerkung (die Namen): Ersetzt wird der tote Projektname durch den lebenden, sonst nichts — `shadowEnts` → `shadowObjects`, `SHADOW_ENTS` → `SHADOW_OBJECTS`, `ShadowEnts` → `ShadowObjects`. Die drei heißen danach `globalThis.__shadowObjectsContexts`, `globalThis.SHADOW_OBJECTS_BUNDLE_LOADED` und `Symbol.for('ShadowObjectsGlobalNS')`. Der zweite gangbare Weg wäre gewesen, dem Nachbarn `__shadowEnvs` zu folgen und nach der Klasse zu benennen (`__componentContexts`); er fällt weg, weil `ComponentContext` ohne Präfix ein Allerweltsname auf `globalThis` ist, während `ShadowEnv` von sich aus unverwechselbar ist. Das Finding verlangt Auffindbarkeit »unter dem Begriff, der auf der Packung steht« — den trägt das Präfix, nicht der Klassenname.
- Anmerkung (kein Übergangslauf): Kein alter Name bleibt daneben stehen, kein Alias, kein Deprecation-Pfad. Die Empfehlung des Audits sagt das ausdrücklich, und `packages/shadow-objects/package.json` steht auf `0.33.0`, also unter 1.0.
- Anmerkung (Historie im CHANGELOG): Vier Zeilen von `packages/shadow-objects/CHANGELOG.md` nennen die alten Namen in bereits veröffentlichten Abschnitten — 239 (`__shadowEntsContexts`), 244 und 415 (`ShadowEntsEventMap`), 445 (`SHADOW_ENTS_BUNDLE_LOADED`). Sie bleiben, wie sie sind: ein Changelog-Abschnitt beschreibt ein Release, das so stattgefunden hat, und ein Rückschreiben macht ihn zur Aussage über ein Release, das es nie gab. Was ein Leser braucht, steht im neuen `[Unreleased]`-Eintrag, der alte und neue Namen einander gegenüberstellt.
- Anmerkung (nicht dieses Paket): `packages/shadow-objects/src/elements/events.ts:22` exportiert das Interface `ShadowEntsEventMap` und trägt denselben toten Projektnamen. Es gehört trotzdem nicht hierher: CONS-015 handelt von realmweit sichtbaren Laufzeit-Namen, dieses ist ein Typname der öffentlichen API — zur Laufzeit nicht vorhanden, dafür aus `index.ts` re-exportiert und in `docs/api-reference.md:2178,2180` vorgeführt, sodass eine Umbenennung jedem TypeScript-Konsumenten den Import bricht. Anderer Schaden, anderer Blast Radius, eigenes Finding. Der Befund steht als Nebenbefund unter »Offene Befunde« mit dem Urteil `→ Audit`.
- Dateien: `packages/shadow-objects/src/view/ComponentContext.ts` · `packages/shadow-objects/src/bundle.ts` · `packages/shadow-objects/src/constants.ts` · `packages/shadow-objects/docs/concepts.md` · `packages/shadow-objects/CHANGELOG.md` · `packages/shadow-objects-e2e/src/bundle-tests.js` · `packages/shadow-objects-e2e/TEST-PLAN.md`
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler, sondern benennt drei Bezeichner um; es gibt kein falsches Verhalten, das ein Test vorher rot zeigen könnte. Gegen die eine Art, wie dieses Paket schiefgehen kann — eine halbe Umbenennung —, stehen zwei vorhandene Wächter im Verify-Kommando und die Zählproben aus Schritt 8. `pnpm typecheck` fängt jede vergessene Verwendung von `globalThis.__shadowEntsContexts`: die Zeile im `declare global`-Block ist die einzige Deklaration dieses Namens, ohne sie kennt `typeof globalThis` die Eigenschaft nicht. Der E2E-Test `bundle-flag-is-set` (`packages/shadow-objects-e2e/tests/bundle.spec.ts:7`) fängt eine vergessene Anpassung der Ladeanzeige: die Seite `pages/bundle.html` lädt über `packages/shadow-objects-e2e/src/bundle.ts` das gebaute `@spearwolf/shadow-objects/bundle.js`, und die Zusicherung vergleicht den Flag-Namen wörtlich. Für den Symbol-Schlüssel gibt es keinen solchen Wächter — kein Test vergleicht die Zeichenkette, alle vergleichen gegen den exportierten `GlobalNS` —, dafür die erste Zählprobe.
- Vorgehen:
  1. `packages/shadow-objects/src/view/ComponentContext.ts`: `__shadowEntsContexts` → `__shadowObjectsContexts` an allen vier Stellen, sonst nichts an der Datei. Zeile 18 ist die Deklaration (`var __shadowEntsContexts: Map<string | symbol, ComponentContext> | undefined;`), die Zeilen 83, 84 und 86 sind die drei Zugriffe in `static getContextsMap()`. Typ, Klammerung und Umbrüche bleiben unverändert.
  2. `packages/shadow-objects/src/bundle.ts`: `SHADOW_ENTS_BUNDLE_LOADED` → `SHADOW_OBJECTS_BUNDLE_LOADED` an beiden Stellen — Zeile 6 (`var SHADOW_ENTS_BUNDLE_LOADED: boolean;` im `declare global`-Block) und Zeile 9 (`globalThis.SHADOW_ENTS_BUNDLE_LOADED = true;`). Die drei `import`-Zeilen darüber bleiben.
  3. `packages/shadow-objects/src/constants.ts:19`: `Symbol.for('ShadowEntsGlobalNS')` → `Symbol.for('ShadowObjectsGlobalNS')`. Nur die Zeichenkette. Der exportierte Name `GlobalNS`, sein Typ `NamespaceType` und jede andere Zeile der Datei bleiben unverändert — `GlobalNS` ist öffentliche API, steht in `docs/api-reference.md:1115` und in Specs dreier Pakete, und sein Name ist nicht der Befund.
  4. `packages/shadow-objects/docs/concepts.md:113`: im Absatz unter »Shared Registries« `globalThis.__shadowEntsContexts` → `globalThis.__shadowObjectsContexts`. Ein Vorkommen in einer Zeile; der Rest des Absatzes — `globalThis.__shadowEnvs` daneben eingeschlossen — bleibt Wort für Wort stehen.
  5. `packages/shadow-objects-e2e/src/bundle-tests.js:14`: `globalThis.SHADOW_ENTS_BUNDLE_LOADED === true` → `globalThis.SHADOW_OBJECTS_BUNDLE_LOADED === true`. Der Testname `'bundle-flag-is-set'` bleibt; er steht so in `tests/bundle.spec.ts:7` und ist kein Teil dieses Pakets.
  6. `packages/shadow-objects-e2e/TEST-PLAN.md:275`: in der Zeile `| BUNDLE-3 | P2 | …` `globalThis.SHADOW_ENTS_BUNDLE_LOADED` → `globalThis.SHADOW_OBJECTS_BUNDLE_LOADED`. Sonst nichts an der Tabelle und nichts an der Datei.
  7. `packages/shadow-objects/CHANGELOG.md`, zwei Stellen im Abschnitt `## [Unreleased]`:
     - Ein neuer Bullet als letzter des Blocks `### ⚠️ Breaking Changes`, direkt hinter der heutigen Zeile 215 und vor der Leerzeile, die `### New` einleitet. Form wie bei jedem Nachbarn: `- **Breaking (globals):** ` und danach englischer Fließtext in einer Zeile. Er nennt alle drei Paare alt → neu (`globalThis.__shadowEntsContexts` → `globalThis.__shadowObjectsContexts`, `globalThis.SHADOW_ENTS_BUNDLE_LOADED` → `globalThis.SHADOW_OBJECTS_BUNDLE_LOADED`, `Symbol.for('ShadowEntsGlobalNS')` → `Symbol.for('ShadowObjectsGlobalNS')`), sagt, was einen Konsumenten trifft — ein Debug-Werkzeug oder eine Testhilfe, die an einem der Namen hängt, findet ihn nicht mehr, und zwei nebeneinander geladene Kopien der Bibliothek teilen über diese Grenze hinweg weder die Context-Registry noch den Default-Namespace —, und dass kein alter Name danebensteht. Ein Changelog hält einen Übergang fest; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben. Keine Finding-ID.
     - Der Zusammenfassungsblock oben zählt mit: Zeile 13 sagt »Fifty-two changes reach existing consumers«, die Aufzählung dahinter läuft bis Zeile 190 und endet mit »Everything else in this section is additive or a bugfix.« (Zeile 191). Genau eine Teilaussage kommt hinzu — die Umbenennung, in einem Satz, im Ton der Nachbarn, vor Zeile 191 —, also wird `Fifty-two` zu `Fifty-three`. Die Zahl bewegt sich um genau eins, weil genau eine Teilaussage hinzukommt; was die 52 im Einzelnen zählt, ist dafür gleichgültig.
  8. Vier Zählproben, alle mit ihrer Ausgabe in den Report:
     - Kein toter Projektname mehr außerhalb der bewusst stehengelassenen Stellen:

       ```bash
       grep -rnE 'shadowEnts|ShadowEnts|SHADOW_ENTS|shadow-ents' packages \
         --include='*.ts' --include='*.js' --include='*.md' \
         --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.npm-pkg --exclude=CHANGELOG.md
       ```

       Erwartet: genau vier Zeilen, alle `ShadowEntsEventMap` — `packages/shadow-objects/src/elements/events.ts:22` und `:31`, `packages/shadow-objects/docs/api-reference.md:2178` und `:2180`. Jede fünfte Zeile ist eine vergessene Stelle. Vor der Änderung sind es vierzehn (gemessen 2026-08-26).
     - Die neuen Namen stehen an zehn Stellen: dasselbe `grep` mit dem Muster `__shadowObjectsContexts|SHADOW_OBJECTS_BUNDLE_LOADED|ShadowObjectsGlobalNS` — vier in `ComponentContext.ts`, zwei in `bundle.ts`, je eine in `constants.ts`, `concepts.md`, `bundle-tests.js` und `TEST-PLAN.md`.
     - Im gebauten Paket tragen beide Deklarationen den neuen Namen: `grep -n 'shadowObjectsContexts' packages/shadow-objects/dist/src/view/ComponentContext.d.ts` und `grep -n 'SHADOW_OBJECTS_BUNDLE_LOADED' packages/shadow-objects/dist/src/bundle.d.ts packages/shadow-objects/dist/bundle.js`.
     - Die Dateiliste unter `dist/` bewegt sich nicht: `diff <(cd packages/shadow-objects/dist && find . -type f | sed 's|^\./||' | sort) packages/shadow-objects/src/distContract.files.txt` bleibt leer. Eine Umbenennung legt keine Datei an und entfernt keine; `src/distContract.files.txt` und `src/distContract.package.json` werden deshalb nicht angefasst.
- Ausdrücklich **nicht** tun, weil es beim Lesen dieser Zeilen naheliegt:
  - `globalThis.__shadowEnvs` nicht anfassen (`src/view/ShadowEnv.ts:19,42,142,143,148,152,169`, `src/view/ShadowEnv.spec.ts:1080,1081`, `packages/shadow-objects-testing/src/mount.js:23,42`, `docs/concepts.md:113`, Wurzel-`CHANGELOG.md:395`). Das ist der Name, den das Audit als bereits richtig anführt.
  - `ShadowEntsEventMap` nicht umbenennen — weder in `src/elements/events.ts:22,31` noch in `docs/api-reference.md:2178,2180`. Siehe die Anmerkung oben; der Befund steht unter »Offene Befunde«.
  - Die vier historischen Zeilen in `packages/shadow-objects/CHANGELOG.md` (239, 244, 415, 445) nicht umschreiben.
  - Den exportierten Namen `GlobalNS` nicht umbenennen. Nur die Zeichenkette in `Symbol.for(…)` ändert sich.
  - `globalThis.ConsoleLoggerStorage` und `Symbol.for(CONSOLE_LOGGER)` (`src/utils/ConsoleLogger.ts:3,4,47`) nicht anfassen. Beide sind nach ihrer Klasse benannt — `CONSOLE_LOGGER` ist `'ConsoleLogger'` —, kein toter Projektname steckt darin.
  - Keinen Eintrag in die Wurzel-`CHANGELOG.md` schreiben. Sie führt Build, Testrunner, Lint, turbo/pnpm, devDeps und Monorepo-Skripte; die beiden E2E-Dateien ändern sich hier als Folge einer Bibliotheksumbenennung und werden in deren CHANGELOG beschrieben.
  - `packages/shadow-objects/README.md`, `AGENTS.md` und `CLAUDE.md` nicht anfassen. Gemessen 2026-08-26: keiner der drei alten Namen kommt in einer dieser Dateien vor.
  - `docs/api-reference.md:1115-1125` nicht anfassen. Der Abschnitt beschreibt `GlobalNS` und `toNamespace()` und nennt die Zeichenkette hinter `Symbol.for` an keiner Stelle.
  - Nicht nach weiteren Vorkommen in `packages/shae-offscreen-canvas` oder `packages/shadow-objects-testing` suchen. Gemessen: dort steht keiner der drei alten Namen.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: Alle vier grün. `pnpm lint` meldet »Checked 219 files … No fixes applied« ohne Diagnostikum. Die Testzahlen bleiben bei 802/379/123/645 — insbesondere läuft `bundle-flag-is-set` in allen drei E2E-Projekten weiter grün, und genau dieser Test ginge rot, wenn Schritt 5 ausbliebe. Die Coverage bleibt bei 92,89 % (3385/3644): eine Umbenennung legt kein Statement an. Jede Bewegung in einer dieser Zahlen ist neu und blockiert.
- Commit: `fix(globals)!: the realm-wide names carry the package name`
- Ergebnis: 1 Runde · CONS-015 an allen drei Fundstellen behoben (`src/view/ComponentContext.ts` vier Stellen, `src/bundle.ts` zwei, `src/constants.ts:19`), Folgestellen in `docs/concepts.md:113`, `packages/shadow-objects-e2e/src/bundle-tests.js:14` und `TEST-PLAN.md:275` mitgezogen · kein Regressionstest, der Detailplan begründet das; an seiner Stelle vier Zählproben, alle erfüllt · Verify erzwungen ohne Cache: build, typecheck, lint und test grün, 802/379/123/645, `bundle-flag-is-set` in allen drei E2E-Projekten grün, Lint 219 Dateien ohne Diagnostikum, Coverage 92,89 % (3385/3644) · Reviewer ohne Befund
- Nebenbefunde: → Queue (`src/elements/events.ts:22`, aus Zug 0)
- Folgen: keine
- Schnittstellen: Drei realmweit sichtbare Namen heißen anders und haben keinen Vorgänger neben sich — `globalThis.__shadowObjectsContexts` (Registry der Component Contexts, deklariert in `dist/src/view/ComponentContext.d.ts`), `globalThis.SHADOW_OBJECTS_BUNDLE_LOADED` (Ladeanzeige des Bundles, `dist/src/bundle.d.ts` und `dist/bundle.js`) und der Schlüssel `Symbol.for('ShadowObjectsGlobalNS')` hinter dem unverändert exportierten `GlobalNS`. Wer an einem der alten Namen hängt, findet ihn nicht mehr; zwei nebeneinander geladene Kopien der Bibliothek teilen über die Versionsgrenze hinweg weder Registry noch Default-Namespace · Dateiliste unter `dist/` und Form von `dist/package.json` unverändert, `src/distContract.files.txt` und `src/distContract.package.json` unangetastet

**CONS-015 · info · packages/shadow-objects/src/view/ComponentContext.ts:18,84; src/bundle.ts:7,10** — Zwei globale Namen tragen noch den alten Projektnamen

Der realmweite Registrierungspunkt der Component Contexts heißt globalThis.__shadowEntsContexts, die Ladeanzeige des Bundles SHADOW_ENTS_BUNDLE_LOADED. Beide stammen aus der Zeit, als das Paket »shadow-ents« hieß. Der Nachbar in derselben Rolle heißt bereits __shadowEnvs. Wer im Debugger nach dem Zustand der Bibliothek sucht, findet zwei von drei Namen nicht unter dem Begriff, der auf der Packung steht.

Empfehlung: Umbenennen und im CHANGELOG nennen. Beide sind nicht dokumentiert, aber realmweit sichtbar, und ein Werkzeug oder eine Testhilfe eines Konsumenten kann daran hängen. Ein Übergangslauf, der beide Namen bedient, ist bei einem Paket unter 1.0 nicht nötig.

Zu diesem Paket gehören beide genannten Fundstellen und eine dritte, die das Audit nicht nennt: `packages/shadow-objects/src/constants.ts:19`. Die Begründung steht in der Anmerkung »dritte Fundstelle«. Der Satz »Beide sind nicht dokumentiert« stimmt nur zur Hälfte: `__shadowEntsContexts` steht in `packages/shadow-objects/docs/concepts.md:113` und wandert deshalb dort mit. Die Angabe `src/bundle.ts:7,10` meint `packages/shadow-objects/src/bundle.ts`; die Zeilenangaben des Audits zeigen heute auf 18 und 83-86 beziehungsweise auf 6 und 9.

### [x] 10. Manifeste ohne Benutzer
- Findings: DEP-001 (low), DEP-003 (low), BUILD-004 (low)
- Ziel: Kein Manifest deklariert mehr etwas, das keine Datei benutzt, und keine Compileroption trifft eine Aussage über eine Pipeline, die es so nicht gibt.
- Bereich: `package.json`, `tsconfig.json`, `packages/shadow-objects/tsconfig.lib.json`, `packages/shae-offscreen-canvas/package.json`, `packages/shadow-objects-testing/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, Wurzel-`CHANGELOG.md`
- Hängt ab von: 8
- Hash: 4f1d402
- Modell: mittlere Stufe
- Effort: low
- Anmerkung (Abgleich, 2026-08-26): Alle fünf Fundstellen der drei Findings stehen unverändert im Baum, nur verschoben, weil Paket 3 drei istanbul-Zeilen in die Wurzel-devDependencies eingefügt hat und Paket 1 eine Zeile aus der `tsconfig.json` genommen hat. `package.json:35` (`@types/sinon`) ist heute 36, `:40` (`sinon`) ist heute 45, `:41` (`tslib`) ist heute 46. `tsconfig.json:14` (`importHelpers: true`) ist heute 13. `packages/shae-offscreen-canvas/package.json:52` (`lit-html`) ist heute 54. Kein Vorgänger-Paket dieses Laufs hat eine dieser Zeilen angefasst; alle fünf sind vorbestehend, nachgesehen und nicht vermutet an `git show bfcc54b:<datei>`.
- Anmerkung (Lockfile): Nach den Manifest- und Katalogänderungen einmal `pnpm install --no-frozen-lockfile` fahren, damit `pnpm-lock.yaml` mitzieht. Die CI installiert mit `--frozen-lockfile` (`.github/workflows/ci.yml:42,80`), die Lockfile gehört also in denselben Commit. `sinon` bleibt in `packages/shadow-objects-testing` stehen — dort liegen seine drei Benutzer.
- Anmerkung (`lit-html`, die Prämisse des Audits ist gemessen falsch): DEP-003 begründet seine Empfehlung, den Katalogeintrag stehenzulassen, mit dem Satz »In shadow-objects-testing wird es tatsächlich benutzt, dort ist der Eintrag richtig«. Das stimmt nicht. Gemessen am 2026-08-26 über den gesamten Arbeitsbaum: `lit-html` kommt außerhalb von `node_modules` in genau drei Zeilen vor — `packages/shae-offscreen-canvas/package.json:54`, `packages/shadow-objects-testing/package.json:28` und `pnpm-workspace.yaml:62` —, dazu einmal in einem historischen Absatz der Wurzel-`CHANGELOG.md`. Keine `.js`-, `.ts`- oder `.html`-Datei des Repositories importiert es; das `html` in `packages/shadow-objects-testing/src/mount.js` und `src/render.js` ist ein Parametername für eine Zeichenkette, die per `innerHTML` gesetzt wird, kein Template-Tag. Auch die Historie kennt keinen Import: `git log --all -S"lit-html" -- packages/shadow-objects-testing` liefert einen einzigen Commit, und das ist die Umbenennung des Pakets (`b163699`), also die Manifestzeile selbst. Daraus folgen zwei Abweichungen von der Empfehlung, beide in diesem Paket: die Zeile in `packages/shadow-objects-testing/package.json` fällt mit, und der Katalogeintrag fällt mit ihr, weil er danach keinen Referenten mehr hat. Die zweite Zeile hängt an der ersten — solange sie steht, muss der Katalog stehen —, deshalb ist sie kein Nebenbefund für die Queue, sondern Teil desselben Befunds: DEP-003 lässt sich nicht richtig auflösen, ohne über sie zu entscheiden.
- Anmerkung (`@types/sinon` zieht um, statt zu verschwinden): DEP-001 stellt eine Frage und verlangt eine Festlegung — soll eine Testbibliothek an der Wurzel stehen, damit ein Editor die JS-Specs eines Unterpakets typisiert? Für `sinon` selbst ist sie schnell beantwortet: `packages/shadow-objects-testing` deklariert es selbst und benutzt es in drei Specs (`test/build-change-trail.test.js`, `test/prop-element-host.test.js`, `test/prop-element-types.test.js`), der Wurzeleintrag ist ein Duplikat und geht ersatzlos. Für `@types/sinon` liegt der Fall anders: es deklariert es niemand, und sein einziger möglicher Nutzen sind genau diese drei Specs. Gemessen am 2026-08-26: `node_modules/@types` in der Wurzel führt `node` und `sinon`, `packages/shadow-objects-testing/node_modules` hat gar kein `@types`-Verzeichnis — die Typen erreichen die Specs heute über den Aufstieg der Modulauflösung bis zur Wurzel. Die beiden Ausgänge, die das Audit anbietet, sind hier beide schlecht: ersatzlos streichen nimmt den drei Specs still ihre Typen, und stehenlassen braucht eine Begründung, die eine `package.json` nicht tragen kann (JSON kennt keine Kommentare). Der dritte Weg tut beides richtig und wird gegangen: der Eintrag zieht in `packages/shadow-objects-testing` um, neben seinen Benutzer. Danach hat die Wurzel keinen Eintrag ohne Benutzer mehr, `packages/shadow-objects` compiliert nicht länger gegen ein ambientes `@types/sinon`, das es nie anfasst, und der Katalogeintrag behält seinen Referenten.
- Anmerkung (`importHelpers` wirkt gemessen an keiner Stelle): Kein einziger `tsc`-Aufruf dieses Repositories emittiert JavaScript, und nur emittiertes JavaScript kann Helfer aus `tslib` importieren. `packages/shadow-objects/tsconfig.lib.json` — der einzige Aufruf, der überhaupt etwas schreibt — steht auf `emitDeclarationOnly: true` und setzt `importHelpers` in Zeile 13 zusätzlich ausdrücklich auf `false`. Die beiden übrigen Aufrufe laufen mit `--noEmit` (`packages/shadow-objects/package.json:79`, `packages/shadow-objects-e2e/package.json:9`; das bloße `tsc` in dessen `build`-Skript liest dieselbe Datei mit `noEmit: true`). Die Transpilation macht esbuild, das die Option nicht kennt. Gegenprobe am 2026-08-26: `tsc -p tsconfig.json --noEmit --importHelpers false` läuft in `packages/shadow-objects` wie in `packages/shadow-objects-e2e` stumm durch, Exit 0, gleiche Ausgabe wie ohne die Flagge; und `grep -rl tslib packages/shadow-objects/dist packages/shae-offscreen-canvas/.npm-pkg` findet nichts. Weil die Zeile in `tsconfig.lib.json` allein als Gegengewicht zur Wurzelzeile existiert, geht sie im selben Commit mit: bleibt sie stehen, behauptet sie einen Streit über Helferimporte, den es nach diesem Paket nirgends mehr gibt.
- Anmerkung (aus Paket 3, Zug 0): Vier Deklarationen kommen aus Paket 3 neu hinzu und sind
  benutzt, nicht übrig — `istanbul-lib-coverage`, `istanbul-lib-report` und `istanbul-reports`
  in der Wurzel für `scripts/mergeCoverage.mjs`, `@vitest/coverage-v8` in
  `packages/shadow-objects-testing` für dessen `test`-Skript. Wer hier nach Manifest-Einträgen
  ohne Benutzer sucht, prüft sie am Skript und am Skriptaufruf, nicht an einem `import` im
  Quelltext: die drei istanbul-Pakete importiert nur das Wurzelskript, und `@vitest/coverage-v8`
  lädt vitest selbst über die Flagge `--coverage`.
- Anmerkung (aus Paket 4 und 8, Zug 0): `tsconfig.json` trägt ab Paket 4 zusätzlich
  `"noUncheckedIndexedAccess": true` und ab Paket 8 `"exactOptionalPropertyTypes": true`. Beides
  sind keine Compileroptionen ohne Benutzer, und beide bleiben stehen: `pnpm typecheck` wertet sie
  in `packages/shadow-objects` und in `packages/shadow-objects-e2e` aus, und beide Projekte sind
  unter ihnen grün. Dass die anderen zwei Workspace-Pakete sie nicht auswerten, ist ebenfalls kein
  Befund für dieses Paket — sie tragen keine TypeScript-Datei (gemessen 2026-08-26,
  `shae-offscreen-canvas`: 22 `.js`, `shadow-objects-testing`: 31 `.js`) und haben aus diesem Grund
  weder `tsconfig.json` noch `typecheck`-Skript.
- Anmerkung (aus Paket 2, Zug 0): Fällt in diesem Paket `"outDir": "./build-tmp"` — es steht in `tsconfig.json:6` und in `packages/shadow-objects/tsconfig.json:6` —, dann verliert `biome.json:14` (`"!**/build-tmp"`) seinen Gegenstand und geht im selben Commit mit. Es fällt nicht: beide `outDir` bleiben unangetastet, dieses Paket entfernt aus der Wurzel-`tsconfig.json` genau eine Zeile, und das ist `importHelpers`. `biome.json` wird in diesem Paket nicht geöffnet.
- Dateien: `package.json` · `tsconfig.json` · `packages/shadow-objects/tsconfig.lib.json` · `packages/shae-offscreen-canvas/package.json` · `packages/shadow-objects-testing/package.json` · `pnpm-workspace.yaml` · `pnpm-lock.yaml` (über `pnpm install`) · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler, sondern nimmt fünf Deklarationen ohne Benutzer aus vier Manifesten und eine wirkungslose Compileroption aus zwei Konfigurationen. Es gibt kein falsches Verhalten, das ein Test vorher rot zeigen könnte. Den Nachweis führen die vier Zählproben aus Schritt 8 und der Verify-Lauf; die beiden `distContract`-Specs im `pnpm test` halten zusätzlich fest, dass sich an der Form der beiden veröffentlichten Pakete nichts bewegt.
- Vorgehen:
  1. `package.json`, Block `devDependencies`: drei Zeilen streichen — `"@types/sinon": "catalog:",` (heute Zeile 36), `"sinon": "catalog:",` (heute 45) und `"tslib": "catalog:",` (heute 46). Sonst nichts an der Datei; kein Skript, kein `engines`, kein `packageManager`. Die Liste bleibt alphabetisch und beginnt danach mit `@biomejs/biome`, `@playwright/test`, `@types/node`, `@vitest/coverage-v8`, `esbuild`, `happy-dom`, den drei istanbul-Paketen, `leasot`, `rimraf`, `turbo`, `typescript`, `vitest`. Der letzte Eintrag ist danach `vitest` und trägt kein Komma — er trug schon vorher keins, es ändert sich also nur die Länge der Liste.
  2. `packages/shadow-objects-testing/package.json`, Block `devDependencies`: `"lit-html": "catalog:",` streichen (heute Zeile 28) und `"@types/sinon": "catalog:",` einfügen, alphabetisch zwischen `"@playwright/test"` und `"@vitest/browser"`. Netto bleibt die Liste gleich lang. `"sinon": "catalog:"` bleibt unverändert stehen, ebenso jeder andere Eintrag der Datei.
  3. `packages/shae-offscreen-canvas/package.json`, Block `devDependencies`: `"lit-html": "catalog:",` streichen (heute Zeile 54). Sonst nichts an der Datei — insbesondere bleiben `three` in beiden Blöcken (`devDependencies` und `peerDependencies`), `lil-gui` (benutzt in `index.html`) und `esbuild-plugin-inline-worker` unangetastet; zu letzterem siehe »Ausdrücklich nicht tun«.
  4. `tsconfig.json:13`: die Zeile `"importHelpers": true,` streichen. Der Block `compilerOptions` geht danach von `"useDefineForClassFields": false,` direkt zu `"allowUnreachableCode": false,`. Keine andere Zeile der Datei anfassen, insbesondere nicht `"outDir": "./build-tmp"` (Zeile 6) und nicht die beiden Strictness-Schalter aus den Paketen 4 und 8.
  5. `packages/shadow-objects/tsconfig.lib.json:13`: die Zeile `"importHelpers": false,` streichen. Der Block geht danach von `"removeComments": false,` direkt zu `"noEmit": false,`. Die Begründung steht in der Anmerkung »importHelpers wirkt gemessen an keiner Stelle«; die Zeile ist das Gegengewicht zur eben entfernten Wurzelzeile und hat ohne sie keinen Gegenstand. `emitDeclarationOnly`, `declarationDir`, `types: []` und jede andere Zeile bleiben.
  6. `pnpm-workspace.yaml`, Block `catalog:`: zwei Zeilen streichen — `tslib: ^2.8.1` (heute Zeile 36, unter der Überschrift `# --- typescript ---`) und `lit-html: ^3.3.3` (heute 62, unter `# --- test ---`). Beide haben nach den Schritten 1 bis 3 keinen Referenten mehr; jeder andere Eintrag behält mindestens einen. Die beiden Kommentar-Überschriften bleiben stehen — `# --- typescript ---` führt danach noch `typescript`, `# --- test ---` noch neun Einträge. `sinon` und `@types/sinon` bleiben im Katalog, `packages/shadow-objects-testing` referenziert nach Schritt 2 beide. Nichts an `overrides`, `allowBuilds`, `catalogs:` oder `minimumReleaseAgeExclude` ändern.
  7. `pnpm install --no-frozen-lockfile` im Wurzelverzeichnis. Erwartet wird in `pnpm-lock.yaml` genau dies, und `git diff pnpm-lock.yaml` gehört mit in den Report:
     - unter `catalogs.default` fallen die Blöcke `lit-html` und `tslib` weg (je drei Zeilen),
     - unter dem Importeur `.` fallen `@types/sinon`, `sinon` und `tslib` weg,
     - unter `packages/shae-offscreen-canvas` fällt `lit-html` weg,
     - unter `packages/shadow-objects-testing` fällt `lit-html` weg und `@types/sinon` kommt hinzu,
     - in den Abschnitten `packages:` und `snapshots:` fallen `lit-html@3.3.3` und `tslib@2.8.1` weg.

     Keine `version:`-Zeile eines verbleibenden Pakets darf sich bewegen. Tut sie es, hat der Install still etwas aufgelöst, und das ist ein Befund für den Report und keine Nebensache. Ändert `pnpm install` außerdem `pnpm-workspace.yaml`, gilt genau eine Ausnahme: pnpm darf den Eintrag `minimumReleaseAgeExclude` mitsamt seinem erklärenden Kommentar darüber fallen lassen, sobald `@spearwolf/signalize@1.0.0-beta.0` älter als einen Tag ist — die Datei sagt an dieser Stelle selbst, dass der Eintrag dann gehen kann. Passiert das, bleibt es so und steht im Report; jede andere Bewegung in der Datei wird zurückgenommen und gemeldet.
  8. Vier Zählproben, alle mit ihrer Ausgabe in den Report:
     - `grep -rn 'tslib\|lit-html' package.json packages/*/package.json pnpm-workspace.yaml tsconfig.json packages/*/tsconfig*.json` meldet keinen einzigen Treffer. Vor der Änderung sind es fünf (gemessen 2026-08-26).
     - `grep -n importHelpers tsconfig.json packages/shadow-objects/tsconfig.lib.json` meldet keinen Treffer. Vorher zwei.
     - `grep -rn sinon package.json packages/*/package.json` meldet genau zwei Zeilen, beide in `packages/shadow-objects-testing/package.json`: `@types/sinon` und `sinon`. Vorher vier, davon zwei in der Wurzel.
     - `pnpm exec biome check . --max-diagnostics 1000` meldet weiterhin »Checked 219 files … No fixes applied« ohne Diagnostikum. Die Dateizahl darf sich nicht bewegen: es wird keine Datei angelegt und keine entfernt.
  9. In der Wurzel-`CHANGELOG.md` einen neuen datierten Abschnitt ganz oben einfügen, über `## 2026-08-26 — optional properties say whether they may be undefined`, mit der Überschrift `## 2026-08-26 — the manifests declare only what has a user`. Darunter fünf Bullets in der Form, die jeder Eintrag der Datei hat: eröffnend mit dem Pfad, fett gesetzt und in Backticks, gefolgt von einem Doppelpunkt.
     - `package.json` — `sinon`, `@types/sinon` und `tslib` verlassen die devDependencies der Wurzel. Nennt, wo die drei Benutzer von `sinon` liegen (drei Specs in `packages/shadow-objects-testing`, das die Abhängigkeit selbst deklariert), dass `@types/sinon` zu ihnen umzieht statt zu verschwinden, und dass `tslib` mit `importHelpers` zusammen geht.
     - `packages/shadow-objects-testing/package.json` — `@types/sinon` steht jetzt neben `sinon`, dort, wo die Specs es benutzen; `lit-html` geht, weil keine Datei des Pakets es importiert.
     - `packages/shae-offscreen-canvas/package.json` — `lit-html` geht aus demselben Grund. Der Eintrag berührt kein veröffentlichtes Manifest: `package.override.json` setzt `devDependencies` auf `null`, das Feld erreicht `.npm-pkg/package.json` also gar nicht erst.
     - `tsconfig.json` — `importHelpers` geht, und die Gegenzeile in `packages/shadow-objects/tsconfig.lib.json` mit ihr. Sagt in eigenen Worten, warum die Option in dieser Werkzeugkette nichts tun kann: der einzige emittierende `tsc`-Aufruf schreibt nur Deklarationen, die beiden anderen laufen mit `noEmit`, und die Transpilation macht esbuild, das die Option nicht kennt.
     - `pnpm-workspace.yaml` — `tslib` und `lit-html` verlassen den Katalog, weil sie nach den Manifeständerungen keinen Referenten mehr haben; `sinon` und `@types/sinon` bleiben.

     Ein Changelog hält einen Übergang fest, das ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben. Keine Finding-ID. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
- Ausdrücklich **nicht** tun, weil es beim Lesen dieser Zeilen naheliegt:
  - `esbuild-plugin-inline-worker` in `packages/shae-offscreen-canvas/package.json:51` nicht anfassen, obwohl es dieselbe Form hat und in derselben Liste steht wie `lit-html`. Der Befund ist gemessen und steht als Nebenbefund unter »Offene Befunde«; über ihn entscheidet die Drain-Runde des Abschlusses. Der Katalogeintrag `esbuild-plugin-inline-worker: ^0.1.1` bleibt in jedem Fall — `packages/shadow-objects/package.json:86` referenziert ihn, und dort fährt `build.mjs` den Plugin wirklich.
  - Kein weiteres Manifest durchsuchen und keinen weiteren Eintrag streichen. Sieben Deklarationen sehen bei einer naiven Textsuche unbenutzt aus und sind es nicht: `@vitest/coverage-v8` (Wurzel, Canvas, Testing — vitest lädt es über `--coverage`), `@playwright/test` in `packages/shadow-objects-testing` (der Provider `@vitest/browser-playwright` braucht es), `typescript` und `rimraf` in `packages/shadow-objects-e2e` (in dessen Skripten als `tsc` beziehungsweise `rimraf`), `@types/node` in `packages/shadow-objects` (`src/distContract.spec.ts` importiert `node:fs`, `node:path`, `node:url`) und in `packages/shadow-objects-e2e` (dessen `tsconfig.json` führt `"types": ["node"]`).
  - Die historische Zeile `CHANGELOG.md:421` der Wurzel nicht umschreiben. Sie zählt einen Katalog-Bump auf und nennt dabei `sinon`, `@types/sinon` und `lit-html`; ein Changelog-Abschnitt beschreibt einen Übergang, der so stattgefunden hat, und ein Rückschreiben macht ihn zur Aussage über etwas, das nie passiert ist.
  - `packages/shadow-objects/src/distContract.files.txt`, `src/distContract.package.json` und die beiden Gegenstücke im Canvas-Paket nicht anfassen. Weder die Dateiliste noch die Form eines veröffentlichten `package.json` bewegt sich: die Wurzel-`package.json` wird nicht ausgeliefert, `packages/shae-offscreen-canvas/package.override.json` streicht `devDependencies` aus dem veröffentlichten Manifest, und `importHelpers` berührt einen Emit, den es nicht gibt.
  - Keinen Eintrag in `packages/shadow-objects/CHANGELOG.md` oder `packages/shae-offscreen-canvas/CHANGELOG.md` schreiben. Beide führen Laufzeit-API, Verhalten und die Form des ausgelieferten Pakets; hier bewegt sich keins davon. Der Kopf des Paket-Changelogs sagt es selbst: Build, Monorepo, Lint und Dev-Workflow, die das ausgelieferte Paket nicht berühren, gehören in die Wurzel-`CHANGELOG.md`.
  - `AGENTS.md`, `CLAUDE.md` und die READMEs nicht anfassen. Gemessen 2026-08-26: keine dieser Dateien und keine Datei unter `docs/` nennt `tslib`, `importHelpers`, `lit-html` oder `sinon`.
  - Kein `pnpm make:todo` — es wird kein TODO-Kommentar angefasst.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: Alle vier grün. `pnpm typecheck` bleibt stumm — gegengeprobt am 2026-08-26 mit `--importHelpers false` und mit `--types node` (also ohne ambientes `@types/sinon`), beide Male Exit 0 und keine Ausgabe. `pnpm lint` meldet »Checked 219 files … No fixes applied« ohne Diagnostikum. Die Testzahlen bleiben bei 802/379/123/645, die Coverage bei 92,89 % (3385/3644): es ändert sich keine Zeile Quelltext. Beide `distContract`-Specs bleiben grün, ohne dass eine Erwartungsdatei angefasst wird. `pnpm build` und `pnpm test` laufen vollständig durch, weil `pnpm install` den turbo-Cache entwertet — erwartet und kein Fehlersignal. Jede Bewegung in einer dieser Zahlen ist neu und blockiert.
- Commit: `build(deps): the manifests declare only what has a user`
- Ergebnis: 1 Runde · DEP-001, DEP-003 und BUILD-004 behoben · fünf Deklarationen ohne Benutzer aus vier Manifesten (`sinon` und `tslib` aus der Wurzel, `lit-html` aus dem Canvas- und dem Testing-Paket), `@types/sinon` zu seinen drei Specs umgezogen, `importHelpers` aus `tsconfig.json` und die Gegenzeile aus `tsconfig.lib.json`, `tslib` und `lit-html` aus dem Katalog · kein Regressionstest, begründet im Detailplan; den Nachweis führen die vier Zählproben und der Verify-Lauf · kein Qualitätsbefund des Reviewers, auch kein kleiner
- Nebenbefunde: —
- Folgen: —
- Schnittstellen: Die Wurzel-`package.json` führt `sinon`, `@types/sinon` und `tslib` nicht mehr; wer an der Wurzel gegen ambiente sinon-Typen compiliert, hat sie dort nicht mehr, `packages/shadow-objects-testing` deklariert sie selbst · `pnpm-workspace.yaml` hat die Katalogeinträge `tslib` und `lit-html` nicht mehr — ein `"tslib": "catalog:"` oder `"lit-html": "catalog:"` in irgendeinem Manifest lässt den Install ab jetzt scheitern · `importHelpers` steht in keiner tsconfig des Workspace mehr und erbt damit den Vorgabewert `false`; ein künftiger emittierender `tsc`-Aufruf, der Helferimporte will, setzt die Option selbst und bringt `tslib` mit · Dateiliste unter `dist/` und `.npm-pkg/` sowie die Form beider veröffentlichter `package.json` unverändert, keine der vier `distContract`-Erwartungsdateien angefasst

**DEP-001 · low · package.json:35, :40** — sinon und @types/sinon stehen im Wurzelmanifest ohne Benutzer

Beide stehen in den devDependencies des Wurzelmanifests, ohne dass eine Datei der Wurzel sie benutzt. packages/shadow-objects-testing führt sinon selbst und benutzt es in drei Specs; damit ist die Abhängigkeit dort korrekt deklariert und an der Wurzel doppelt. Für einen Workspace, der Versionen ausschließlich über den catalog: führt, ist eine Deklaration ohne Benutzer die Art Eintrag, die beim nächsten Aufräumen jemand stehen lässt, weil sie so aussieht, als wüsste jemand anderes warum.

Empfehlung: Entscheiden statt aufräumen: ob eine Testbibliothek an der Wurzel stehen soll, damit ein Editor die JS-Specs eines Unterpakets typisiert, ist eine Festlegung. Danach entweder streichen oder mit einem Satz begründen — so, wie es die beiden zurückgehaltenen Majors in pnpm-workspace.yaml vormachen.

Beleg im Audit: Bestand aus dem Audit vom 2026-08-19; Benutzer nachgesucht (2026-08-19): drei Specs unter packages/shadow-objects-testing/test/, keine Datei an der Wurzel.

Die verlangte Festlegung ist getroffen und steht in der Anmerkung »@types/sinon zieht um«: `sinon` geht ersatzlos, `@types/sinon` wandert zu seinen Benutzern. Die Zeilenangaben `35` und `40` zeigen heute auf 36 und 45, weil Paket 3 drei istanbul-Einträge in die Liste eingefügt hat. Die drei Specs sind namentlich `test/build-change-trail.test.js`, `test/prop-element-host.test.js` und `test/prop-element-types.test.js`.

**DEP-003 · low · packages/shae-offscreen-canvas/package.json:52** — lit-html steht in den devDependencies des Canvas-Pakets ohne Benutzer

Weder src/ noch index.html noch eine der fünf Spec-Dateien des Pakets importiert lit-html; im gesamten Verzeichnis kommt der Name nur im Manifest vor. In shadow-objects-testing wird es tatsächlich benutzt, dort ist der Eintrag richtig. Hier bringt er einen Katalog-Eintrag und einen Baum-Knoten mit, die niemand anfasst — und, wie jede unbenutzte Abhängigkeit, eine Zeile, die beim nächsten Aufräumen jemanden fragen lässt, wofür sie da war.

Empfehlung: Den Eintrag entfernen. Der Katalog-Eintrag in pnpm-workspace.yaml bleibt, weil shadow-objects-testing ihn weiterhin referenziert.

Der zweite Satz der Beschreibung und der zweite Satz der Empfehlung sind gemessen falsch und werden nicht befolgt; die Messung steht in der Anmerkung »lit-html, die Prämisse des Audits ist gemessen falsch«. `packages/shadow-objects-testing` benutzt lit-html nicht und hat es nie benutzt, deshalb fallen dort die Manifestzeile und mit ihr der Katalogeintrag. Die Zeilenangabe `52` zeigt heute auf 54.

**BUILD-004 · low · tsconfig.json:14 (importHelpers); package.json:41 (tslib)** — importHelpers und tslib wirken in dieser Pipeline nicht

Die Wurzel-tsconfig schaltet importHelpers ein, tslib steht als devDependency daneben. Beides zielt auf einen tsc, der Code emittiert — den gibt es hier nicht: tsconfig.lib.json setzt emitDeclarationOnly, die Transpilation macht esbuild, und esbuild kennt die Option nicht. In packages/shadow-objects/dist kommt der Name tslib in keiner Datei vor. Die e2e-tsconfig setzt noEmit, emittiert also ebenfalls nichts. Was bleibt, sind zwei Einträge, die eine Aussage über die Build-Pipeline treffen, die nicht stimmt — und die beim nächsten Toolchain-Wechsel als gegeben gelesen werden.

Empfehlung: Beide entfernen, oder importHelpers mit einem Kommentar versehen, der sagt, für welchen künftigen Emit-Pfad es dort steht. Die Pipeline ist in CLAUDE.md genau beschrieben; diese zwei Zeilen widersprechen ihr.

Von den beiden Varianten wird die erste genommen: beide entfernen. Eine dritte Zeile kommt hinzu, die das Audit nicht nennt — `packages/shadow-objects/tsconfig.lib.json:13` setzt `importHelpers` ausdrücklich auf `false` und ist damit das Gegengewicht zur Wurzelzeile; sie geht mit. Die Begründung und die Gegenprobe stehen in der Anmerkung »importHelpers wirkt gemessen an keiner Stelle«. Die Zeilenangaben `14` und `41` zeigen heute auf 13 beziehungsweise 46.

### [x] 11. Wurzel-README und Agentenleitfaden
- Findings: DX-018 (low), DX-019 (low), DX-015 (low)
- Ziel: Wer der README folgt, landet im richtigen Verzeichnis und installiert eine Toolchain, die der Workspace annimmt; und der Leitfaden weist keinem Leser mehr eine fremde Rolle zu.
- Bereich: `README.md`, `AGENTS.md`
- Hängt ab von: —
- Hash: 5689d19
- Modell: mittlere Stufe
- Effort: low
- Anmerkung (Abgleich, 2026-08-26): Alle drei Findings stehen unverändert im Baum, und zwar auf genau den Zeilen, die das Audit nennt: `README.md:95` trägt `packages/shadow-offscreen-canvas/`, `README.md:289` trägt `Node.js >=20.12.2, pnpm >=9.1.2`, `AGENTS.md:120-127` tragen die Überschrift »General Context Information for the AI assistant« und die sechs Tonzeilen darunter. Kein Vorgänger-Paket dieses Laufs hat inhaltlich an einer der beiden Dateien gearbeitet: `git diff bfcc54b..HEAD -- README.md AGENTS.md` zeigt je eine geänderte Zeile, und das ist der finale Zeilenumbruch aus Paket 1. Vorbestehend, nachgesehen und nicht vermutet: `git show bfcc54b:README.md` und `git show bfcc54b:AGENTS.md` tragen alle drei Stellen an denselben Nummern.
- Anmerkung (vier weitere Fundstellen von DX-018, gemessen 2026-08-26): Derselbe Abschnitt »What's in the Box?« nennt vier Verzeichnisse, die sich von der Wurzel des Repositories aus ebenso wenig auflösen wie der falsch geschriebene Canvas-Pfad: `src/in-the-dark/` (Zeile 87), `src/worker/` (88), `src/view/` (89) und `src/elements/` (92). Ein `src/` gibt es an der Wurzel nicht; gemeint ist `packages/shadow-objects/src/`, und dort liegen alle vier. Daneben stehen in derselben Liste Einträge mit vollem Pfad — `packages/shadow-objects-testing/` und, ab diesem Paket, das Canvas-Paket —, ein Leser kann den Zeilen also nicht ansehen, welche Basis gerade gilt. Die vier kommen in dieses Paket, weil die Ursache dieselbe ist: die Pfade dieser Liste sind nie gegen den Baum geprüft worden. DX-018 ist diese Nachlässigkeit an einem Bullet, die vier sind sie an vier weiteren, und das Ziel dieses Pakets — wer der README folgt, landet im richtigen Verzeichnis — ist mit vier ins Leere zeigenden Pfaden in derselben Liste nicht erreicht. Vorbestehend, nachgesehen und nicht vermutet: `git show bfcc54b:README.md` trägt alle vier an denselben Zeilen.
- Anmerkung (DX-019, die Zahlen und ihre Quelle): Die Empfehlung des Audits will zweierlei — die Angaben aus `engines` übernehmen und den Satz zu einem Verweis auf die Quelle machen statt zu einer zweiten Zahl. Genommen wird beides zugleich, und das ist eine Entscheidung: die Zeile nennt die Zahlen (`>=24.13.0`, `>=11.0.0`), weil jemand unter »Prerequisites« wissen will, was er installieren soll, ohne erst ein Manifest zu öffnen, und sie sagt im selben Satz, dass sie `engines` aus der Wurzel-`package.json` zitiert und dieses Feld die Quelle ist. Wer die Zahlen später bewegt, liest im selben Satz, wo die verbindliche steht. Dazu `packageManager` — `pnpm@11.21.0` —, das von pnpm 10 an entscheidet, welches pnpm tatsächlich läuft; die Wurzel-`CHANGELOG.md:434` hält das für dieses Repository fest. Gemessen 2026-08-26: außer der `package.json` selbst und zwei historischen Zeilen der Wurzel-`CHANGELOG.md` (434, 443) nennt keine Datei dieses Repositories eine Node- oder pnpm-Version mit Patch-Stelle.
- Anmerkung (DX-015, was von dem Abschnitt bleibt): Die Fundstelle reicht von Zeile 120 bis 127, also von der Überschrift bis zur letzten Tonzeile. Darunter, in demselben `#`-Abschnitt und außerhalb der Fundstelle, steht der Block `**Documentation Strategy:**` (129-134). Er wird von der Streichung mitgerissen: bliebe er stehen, hinge er ohne eigene Überschrift unter `# Toolchain` und behauptete dort etwas, das mit der Toolchain nichts zu tun hat. Was der eigene Umbau umwirft, gehört zu ihm, deshalb wird er hier mitentschieden und nicht gemeldet. Drei seiner fünf Bullets stehen wörtlich woanders in derselben Datei — der Ort der Doku in §3 (»Docs location«) und §4 (»Authoritative Source«), `pnpm make:todo` in §4 (Zeile 91), und die zweite Hälfte von »Every change to the source code or public API …« im Bullet »Public API Changes« (65-71), dessen erste Hälfte obendrein falsch ist: eine private Umbenennung im Quelltext bewegt keine Zeile Doku. Die zwei Bullets ohne zweiten Ort ziehen nach §4 um. Danach trägt die Datei zwei `#`-Überschriften statt dreier und weist keinem Leser mehr eine Rolle zu.
- Anmerkung (Zuständigkeit des Changelogs): Der Eintrag geht ausschließlich in die Wurzel-`CHANGELOG.md`. Sie führt laut ihrem eigenen Kopf »build system, monorepo orchestration, lint/format, dev workflow«, und die beiden Einstiegsdokumente des Repositories sind dev workflow. Die zwei Paket-Changelogs führen Laufzeit-API, Verhalten und die Form des ausgelieferten Pakets; davon bewegt sich hier nichts. Präzedenz in derselben Datei: die Einträge zu `Root README.md` und `AGENTS.md` in den Zeilen 517-519.
- Dateien: `README.md` · `AGENTS.md` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler, sondern richtet fünf Pfade, eine Versionsangabe und einen Abschnitt in zwei Markdown-Dateien. Es gibt kein falsches Verhalten, das ein Test vorher rot zeigen könnte, und keine Spec des Repositories liest eine der beiden Dateien. Den Nachweis führen die fünf Zählproben aus Schritt 7 und der Verify-Lauf.
- Vorgehen:
  1. `README.md:95`: im Bullet unter »Examples & Testing« den Pfad `packages/shadow-offscreen-canvas/` durch `packages/shae-offscreen-canvas/` ersetzen. Nur die Zeichenkette zwischen den Backticks in der fett gesetzten Einleitung; der Satz dahinter (»A reference implementation demonstrating heavy lifting! …«) bleibt Wort für Wort stehen.
  2. `README.md:87`, `:88`, `:89` und `:92`: jedem der vier Pfade das Paket voranstellen, in dem er liegt. Es ändert sich je nur die Zeichenkette zwischen den Backticks in der fett gesetzten Einleitung der Zeile:
     - Zeile 87: `src/in-the-dark/` → `packages/shadow-objects/src/in-the-dark/`
     - Zeile 88: `src/worker/` → `packages/shadow-objects/src/worker/`
     - Zeile 89: `src/view/` → `packages/shadow-objects/src/view/`
     - Zeile 92: `src/elements/` → `packages/shadow-objects/src/elements/`

     Sonst nichts an den vier Zeilen; insbesondere bleibt die Angabe »Over 1,100 lines of robust lifecycle logic« in Zeile 92 unangetastet, siehe »Ausdrücklich nicht tun«. Die Zeilenzahl der Datei bewegt sich nicht: mit Schritt 1 sind es fünf Ersetzungen und keine Einfügung, die Datei hat vorher wie nachher 300 Zeilen.
  3. `README.md:289`: die Zeile vollständig durch diese ersetzen —

     ```markdown
     1. **Prerequisites:** Node.js `>=24.13.0` and pnpm `>=11.0.0`, quoted from `engines` in the root `package.json` — that field is the source of truth, and `packageManager` next to it (`pnpm@11.21.0`) decides which pnpm actually runs.
     ```

     Die Nummerierung `1.` und die fett gesetzte Einleitung `**Prerequisites:**` bleiben, damit die Schritte 2 (»Install Dependencies«) und 3 (»Install Playwright Browsers«) der Liste unberührt weiterzählen.
  4. `AGENTS.md`: die Zeilen 119 bis 134 ersatzlos streichen — die Leerzeile 119, die Überschrift `# General Context Information for the AI assistant` (120), die Leerzeile 121, die sechs Tonzeilen (122-127), die Leerzeile 128 und den Block `**Documentation Strategy:**` samt seinen fünf Bullets (129-134). Die Datei endet danach mit Zeile 118 (`**Run tasks via turbo …**`) und einem Zeilenumbruch. Übrig bleiben zwei `#`-Überschriften: `# Shadow Objects Framework - Agent Guide` (1) und `# Toolchain (post-2026-renewal)` (99).
  5. `AGENTS.md`: die beiden Regeln aus dem gestrichenen Block, die keine andere Stelle der Datei trägt, ziehen nach §4 um. Beide Einfügungen liegen oberhalb von Schritt 4 und sind von ihm unabhängig.
     - In `### Documentation` als neuer Bullet zwischen dem eingerückten Absatz, der auf Zeile 71 endet, und `- **Language:** Always use **English**.` (Zeile 72):

       ```markdown
       - **Concepts:** When a concept changes or a new one arrives, `packages/shadow-objects/docs/` changes in the same commit.
       ```

     - In `### Development Workflow` als neuer Bullet zwischen `- **TODOs:** …` (Zeile 91) und `- **Testing:**` (Zeile 92):

       ```markdown
       - **This guide:** After a change to source files or docs, read this file again and bring it back in line — take out what no longer holds, add what is new.
       ```

     Die drei übrigen Bullets des gestrichenen Blocks kehren nicht wieder; die Anmerkung »DX-015, was von dem Abschnitt bleibt« sagt, wo jeder von ihnen bereits steht.
  6. Wurzel-`CHANGELOG.md`: einen neuen datierten Abschnitt ganz oben einfügen, über `## 2026-08-26 — the manifests declare only what has a user` (Zeile 7), mit der Überschrift `## 2026-08-26 — the readme and the agent guide describe this repository`. Darunter drei Bullets in der Form, die jeder Eintrag der Datei hat: eröffnend mit dem Pfad, fett gesetzt und in Backticks, gefolgt von einem Doppelpunkt.
     - `README.md` — der Abschnitt »What's in the Box?« nennt jetzt Pfade, die sich von der Wurzel des Repositories aus auflösen: das Canvas-Paket liegt unter `packages/shae-offscreen-canvas/`, und die vier Verzeichnisse des Kernpakets tragen ihr Paket davor. Nennt, dass die »Project Structure«-Tabelle derselben Datei den Canvas-Pfad schon vorher richtig führte.
     - `README.md` — die Voraussetzungen des Development Setup zitieren `engines` aus der Wurzel-`package.json` (Node.js `>=24.13.0`, pnpm `>=11.0.0`) und nennen das Feld als Quelle, damit die beiden Angaben nicht wieder auseinanderlaufen. `packageManager` (`pnpm@11.21.0`) steht daneben und entscheidet, welches pnpm tatsächlich läuft.
     - `AGENTS.md` — der dritte Abschnitt der Datei ist weg. Er wies jedem Leser die Rolle »a professional developer advocate from Google« zu, samt Tonvorgaben, denen §4 derselben Datei widerspricht: dort steht präzise englische Fachdokumentation und eine Liste verbotener Analogien. Die zwei Regeln darunter, die keine andere Stelle trug, stehen jetzt in §4 — Doku folgt einem geänderten oder neuen Konzept, und der Leitfaden wird nach einer Änderung an Quelltext oder Doku noch einmal gelesen.

     Ein Changelog hält einen Übergang fest, das ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben. Keine Finding-ID. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
  7. Fünf Zählproben, alle mit ihrer Ausgabe in den Report:
     - `git grep -n 'shadow-offscreen-canvas' -- ':!audit.html'` meldet keinen Treffer. Vorher genau einen, `README.md:95` (gemessen 2026-08-26). Der Ausschluss gilt der `audit.html`, die den falschen Pfad zitiert und nicht angefasst wird; `remediation-plan.md` ist untracked und fällt von selbst heraus.
     - Jeder Verzeichnispfad des Abschnitts »What's in the Box?« löst sich auf:

       ```bash
       sed -n '86,96p' README.md | grep -o '`[^`]*`' | tr -d '`' | grep '/$' \
         | while IFS= read -r p; do [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"; done
       ```

       Erwartet: sechs Zeilen, alle `OK`, kein `MISS`. Vorher fünf `MISS` und ein `OK` (gemessen 2026-08-26).
     - Die drei Angaben in `README.md:289` sind dieselben Zeichenketten wie in der Wurzel-`package.json`: `grep -n '"node"\|"pnpm"\|"packageManager"' package.json` nennt `>=24.13.0`, `>=11.0.0` und `pnpm@11.21.0`, und `sed -n '289p' README.md` nennt genau diese drei und keine vierte Zahl.
     - Der Leitfaden trägt keine fremde Rolle mehr: `git grep -n 'developer advocate\|General Context Information\|Documentation Strategy' -- ':!audit.html'` meldet keinen Treffer (vorher drei, alle in `AGENTS.md`), `grep -c '^# ' AGENTS.md` meldet `2` (vorher `3`), und `tail -c1 AGENTS.md | od -An -c` zeigt `\n`.
     - `pnpm exec biome check . --max-diagnostics 1000` meldet weiterhin »Checked 219 files … No fixes applied« ohne Diagnostikum. Es wird keine Datei angelegt und keine entfernt; Biome 2.5.9 bringt keinen Markdown-Formatter mit, keine der drei geänderten Dateien ist unter den 219.
- Ausdrücklich **nicht** tun, weil es beim Lesen dieser Zeilen naheliegt:
  - Die Angabe »Over 1,100 lines of robust lifecycle logic« in `README.md:92` nicht anfassen, obwohl Schritt 2 genau diese Zeile ändert. Gemessen 2026-08-26: `packages/shadow-objects/src/elements/` trägt 2.732 Zeilen TypeScript ohne die Specs. Die Zahl ist wörtlich wahr und um den Faktor 2,5 zu klein; sie steht als Nebenbefund unter »Offene Befunde« und wird dort beschlossen, nicht hier — ihre Ursache ist eine andere als die der Pfade.
  - `README.md:265`, `:278` und `:279` nicht anfassen. Alle drei schreiben `shae-offscreen-canvas` bereits richtig.
  - Den übrigen Ton der README nicht glätten (»heavy lifting!«, »Massive test suite«). Dieses Paket richtet die Pfade und die Versionsangabe, es schreibt die Datei nicht um.
  - `AGENTS.md:18` (`- **Token (Component Tag):**`) und die Terminologie-Tabelle (`AGENTS.md:80-86`) nicht anfassen. Das ist DX-001 und gehört Paket 12; die Entscheidung vom 2026-08-26 im Kopf dieses Plans legt fest, wie sie ausgeht.
  - `CLAUDE.md` nicht anfassen. Gemessen 2026-08-26: es nennt weder den falschen Canvas-Pfad noch eine Node- oder pnpm-Version mit Patch-Stelle, und es wiederholt den gestrichenen Abschnitt nicht.
  - `packages/shadow-objects/docs/getting-started.md:7` und `packages/shadow-objects-e2e/README.md:36` nicht anfassen, obwohl beide »Prerequisites« überschrieben sind. Die erste richtet sich an einen Konsumenten der Bibliothek und sagt »Node.js (LTS version recommended)«, die zweite nennt Playwright-Browser und keine Version. Gemessen 2026-08-26: keine der beiden trägt eine Zahl, die mit `engines` auseinanderlaufen könnte.
  - Keinen Eintrag in `packages/shadow-objects/CHANGELOG.md` oder `packages/shae-offscreen-canvas/CHANGELOG.md` schreiben. Die Begründung steht in der Anmerkung »Zuständigkeit des Changelogs«.
  - Kein `pnpm make:todo` — es wird kein TODO-Kommentar angefasst.
  - Die vier `distContract`-Erwartungsdateien nicht anfassen. Weder unter `dist/` noch unter `.npm-pkg/` bewegt sich eine Datei; die Wurzel-`README.md` und `AGENTS.md` werden nicht ausgeliefert.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: Alle vier grün. Keine der drei geänderten Dateien steht in `globalDependencies` von `turbo.json` (`tsconfig.json`, `biome.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `scripts/**`) oder unter den `inputs` einer Task; `pnpm build`, `pnpm typecheck` und `pnpm test` sind deshalb vollständige Cache-Treffer und melden `FULL TURBO`, statt zu laufen. Das ist erwartet und kein Fehlersignal — und es ist auch keines, wenn sie doch vollständig durchlaufen, etwa nach einem geleerten Cache. Die Testzahlen bleiben bei 802/379/123/645 und die Coverage bei 92,89 % (3385/3644): es ändert sich keine Zeile Quelltext. `pnpm lint` läuft an turbo vorbei (`biome check . --max-diagnostics 1000`) und meldet »Checked 219 files … No fixes applied« ohne Diagnostikum. Jede Bewegung in einer dieser Zahlen ist neu und blockiert.
- Commit: `docs: the readme and the agent guide describe this repository`
- Ergebnis: 1 Runde · DX-018, DX-019 und DX-015 behoben · fünf Pfade in »What's in the Box?« lösen sich jetzt von der Wurzel des Repositories auf, `README.md:289` zitiert `engines` samt `packageManager`, der dritte `#`-Abschnitt von `AGENTS.md` ist weg und seine zwei allein getragenen Regeln stehen in §4 · kein Regressionstest, begründet im Detailplan; den Nachweis führen die fünf Zählproben (alle erfüllt) und der Verify-Lauf · Verify grün (exit=0, `paket-11.verify.log`): build, typecheck und test als vollständige Turbo-Cache-Treffer, `pnpm lint` »Checked 219 files … No fixes applied«, Coverage 92,89 % (3385/3644) unverändert · Review ohne kritischen und ohne wichtigen Befund · klein: der dritte Bullet des neuen `CHANGELOG.md`-Abschnitts paraphrasiert die gestrichene Rollenzuweisung, statt sie wörtlich zu zitieren — ein wörtliches Zitat hätte die Zählprobe »kein Treffer für `developer advocate`« selbst gerissen, weil `CHANGELOG.md` von deren Ausschluss nicht erfasst ist
- Nebenbefunde: keine neuen · der aus Zug 0 (`README.md:92`, → Rückfrage) steht unverändert in »Offene Befunde«
- Folgen: keine

**DX-018 · low · README.md:95** — Die Wurzel-README nennt das Canvas-Paket unter einem Verzeichnisnamen, den es nicht gibt

Der Abschnitt »What's in the Box?« nennt das Canvas-Paket packages/shadow-offscreen-canvas/. Das Verzeichnis heißt packages/shae-offscreen-canvas/, wie dieselbe Datei in :265 und die package.json des Pakets richtig schreiben. Wer dem Pfad folgt, findet nichts.

Empfehlung: Den Pfad korrigieren. Die Datei nennt ihn an zwei Stellen; nur eine ist falsch.

Zu diesem Paket gehören die genannte Fundstelle und vier weitere derselben Ursache — `README.md:87`, `:88`, `:89` und `:92`; die Begründung steht in der Anmerkung »vier weitere Fundstellen«. Die Angabe `:265` stimmt unverändert: dort steht der Pfad richtig und bleibt unangetastet.

**DX-019 · low · README.md:289 gegen package.json (engines, packageManager)** — Die Voraussetzungen der README verlangen eine Toolchain, die der Workspace ablehnt

»Prerequisites: Node.js >=20.12.2, pnpm >=9.1.2« steht gegen ein package.json, das engines.node auf >=24.13.0, engines.pnpm auf >=11.0.0 und packageManager auf pnpm@11.21.0 führt. Wer der README folgt und Node 20 mit pnpm 9 installiert, bekommt beim ersten Installationslauf einen Fehlschlag statt eines Projekts — an der Stelle, an der ein neuer Mitarbeiter am wenigsten Kontext hat.

Empfehlung: Die beiden Angaben aus den engines des Wurzel-package.json übernehmen. Damit sie nicht wieder auseinanderlaufen, ist der Satz der richtige Ort für einen Verweis auf die Quelle statt für eine zweite Zahl.

Beide Hälften der Empfehlung werden genommen, nicht eine von beiden: die neue Zeile nennt die Zahlen und sagt im selben Satz, aus welchem Feld welcher Datei sie stammen. Die Begründung steht in der Anmerkung »DX-019, die Zahlen und ihre Quelle«.

**DX-015 · low · AGENTS.md:120-127** — Der Agentenleitfaden weist jedem Leser eine fremde Rolle zu

Der Abschnitt »General Context Information for the AI assistant« weist jedem Agenten, der die Datei liest, eine Rolle zu, die mit dem Projekt nichts zu tun hat — »You are a professional developer advocate from Google« —, samt Tonvorgaben, die den übrigen Vorgaben derselben Datei widersprechen: sie verlangt an anderer Stelle englische, präzise technische Dokumentation und verbietet bestimmte Analogien. AGENTS.md ist laut CLAUDE.md der maßgebliche Agentenleitfaden, die Stelle wirkt also auf jede Sitzung und zieht sie in einen Ton, den das Projekt sonst nirgends will.

Empfehlung: Den Abschnitt entfernen oder durch Vorgaben ersetzen, die zu den übrigen Regeln der Datei passen. Was vom Ton wirklich gelten soll, gehört in dieselbe Sprache und dieselbe Form wie der Rest des Leitfadens.

Von den beiden Varianten wird die erste genommen: der Abschnitt geht ganz. Der Block `**Documentation Strategy:**` darunter, den die Fundstelle nicht mehr umfasst, wird von der Streichung mitgerissen und deshalb hier mitentschieden — zwei seiner fünf Bullets ziehen nach §4 um, die drei übrigen sind dort oder in §3 bereits abgedeckt. Die Begründung steht in der Anmerkung »DX-015, was von dem Abschnitt bleibt«.

### [x] 12. Terminologie durchsetzen, überholte Diagramme entfernen
- Findings: DX-001 (low), DX-010 (info)
- Ziel: Die Doku hält die Regeln ein, die sie selbst aufstellt, und kein Artefakt im Quellbaum orientiert mehr falsch.
- Bereich: `packages/shadow-objects/docs/`, `AGENTS.md`, `packages/shadow-objects/src/view/ClassGraphOverview.drawio{,.svg}`, `packages/shadow-objects/CHANGELOG.md`, `CHANGELOG.md` (Wurzel)
- Hängt ab von: 11
- Hash: 1cff638
- Modell: mittlere Stufe
- Effort: low
- Anmerkung (aus Paket 11, Zug 0 — Vorschau auf das Paket davor): Paket 11 fasst `AGENTS.md` an drei Stellen an, die DX-001 nicht berühren: §4 »Documentation« bekommt einen Bullet zu geänderten Konzepten, §4 »Development Workflow« einen zum Nachlesen dieser Datei, und der dritte `#`-Abschnitt am Dateiende (»General Context Information for the AI assistant«, heute Zeile 120-134) fällt ganz weg. Die beiden Fundstellen dieses Pakets liegen darüber: `AGENTS.md:18` (`**Token (Component Tag):**`) bleibt Zeile 18, die Terminologie-Tabelle steht danach auf 81-87 statt 80-86. Maßgeblich ist der eigene Abgleich in Zug 0, nicht diese Vorschau.
- Anmerkung (aus Paket 9, Zug 0): `packages/shadow-objects/docs/concepts.md:113` ist mit Paket 9 einmal angefasst worden — der globale Registrierungspunkt heißt dort jetzt `globalThis.__shadowObjectsContexts`. Ein Bezeichner in einer Zeile, kein Terminologie-Thema; der Absatz »Shared Registries« ist sonst unverändert, und die Zeilennummern der Datei bewegen sich nicht.
- Anmerkung (Abgleich, 2026-08-26): Beide Findings stehen unverändert im Baum, und beide Vorschauen oben haben gehalten. **DX-001:** `packages/shadow-objects/docs/shadow-theater.svg` liegt an seinem Platz, trägt die erste der verbotenen Analogien im Dateinamen und die zweite in seinen eigenen Kommentaren (Zeilen 15, 24, 36, 37), und keine Zeile dieses Repositories bindet ihn ein — `git grep -n 'shadow-theater' -- ':!audit.html'` meldet außer der Datei selbst nur die beiden Regelsätze `AGENTS.md:75` und `CLAUDE.md:114`, die die Analogien aufzählen, um sie zu verbieten. Die Glosse »(Component Tag)« steht an genau neun Stellen in fünf Doku-Dateien — `api-reference.md:466`, `:494`, `:1848`, `cheat-sheet.md:246`, `concepts.md:43`, `getting-started.md:50`, `:116`, `guides.md:143`, `:332` — und in `AGENTS.md:18`, das die Vorschau richtig vorhergesagt hat; die Terminologie-Tabelle trägt ihre `Token`-Zeile jetzt auf `AGENTS.md:87`, ebenfalls wie vorhergesagt. Insgesamt elf Treffer außerhalb von `audit.html` und den Changelogs. **DX-010:** `ClassGraphOverview.drawio` und `ClassGraphOverview.drawio.svg` liegen unverändert unter `src/view/`, zuletzt bewegt am 2025-03-15 (`9e2263d`), und beide führen die Zeile `buildChangeTrails(clearChanges = true) : ChangeTrailType`. Der Name kommt unter `packages/shadow-objects/src/` ausschließlich in diesen beiden Dateien vor: es fehlt nicht nur die Signatur, es fehlt die Methode. Auch dieses Paar bindet keine Zeile ein. Vorbestehend, nachgesehen und nicht vermutet: `git ls-tree bfcc54b` führt alle drei Dateien, `git show bfcc54b:AGENTS.md | sed -n '18p'` und `git show bfcc54b:packages/shadow-objects/docs/concepts.md | sed -n '43p'` tragen dieselbe Glosse, und `git diff --stat bfcc54b..HEAD` bewegt an den Dateien dieses Pakets nur zwei Zeilen — die Paket-11-Streichung in `AGENTS.md` und den Bezeichner in `concepts.md:113`.
- Anmerkung (die Terminologie-Tabelle behält ihre Regel und bekommt einen neuen Grund): Die Entscheidung vom 2026-08-26 sagt, die Tabelle bleibt, wie sie ist. Gemeint ist damit der Ausgang der Alternative, die das Audit anbietet: »Component Tag« wird **nicht** als zulässige Glosse aufgenommen, die Zeile verschwindet nicht, die Regel steht weiter. Die dritte Spalte derselben Zeile ist davon nicht gedeckt und zieht mit. Sie sagt heute »"Component Tag" appears in the docs as a gloss, nowhere in the code« — eine Aussage im Präsens über einen Zustand, den genau dieses Paket beendet. Nach dem Commit stünde in dem einen Dokument, an dem sich jeder Agent orientiert, ein Satz, der einen Leser in fünf Doku-Dateien nach etwas suchen lässt, das dort nicht mehr steht. Das ist kein Nebenbefund — ohne dieses Paket wäre die Zeile richtig —, sondern das, was die eigene Änderung umwirft, und es wird mitgezogen. Die neue Fassung nennt die Regel statt des Fundorts: »The code knows only `token`, and no gloss renames it.« Sie hält auch dann, wenn die Glosse nie wiederkommt, und sie verbietet ihre Rückkehr ausdrücklich.
- Anmerkung (die beiden übrigen Diagramm-Paare bleiben liegen): Unter `src/view/` liegen nach diesem Paket noch `ComponentContext.drawio{,.svg}` und `ShadowEnv.drawio{,.svg}`, zuletzt bewegt am 2024-07-21 und ebenfalls von keiner Zeile eingebunden. Sie gehen trotzdem nicht mit, und der Grund ist nachgesehen und nicht vermutet: DX-010 begründet die Entfernung damit, dass sich falsch orientiert, wer sich an dem Diagramm orientiert — auf die beiden trifft das nicht zu. Ihre Beschriftungen sind ausschließlich Klassennamen ohne Signaturen (`ComponentContext`, `ViewComponent`, `ShadowEnv`, `MessageRouter`, `Kernel`, `Registry`, dazu `root components`, `change trail`, `view components`, `shadow objects`), und jeder dieser Namen existiert heute unverändert. Ein Diagramm zu löschen, das nichts Falsches sagt, wäre eine Scope-Verschiebung ohne Finding und ohne Entscheidung. Was in `ShadowEnv.drawio` und seinem Export tatsächlich falsch steht, ist ein Buchstabe (»enviroment«); der steht als Nebenbefund unter »Offene Befunde« und wird dort beschlossen, nicht hier.
- Anmerkung (Zuständigkeit der beiden Changelogs): Die Änderung trifft zwei und steht deshalb in beiden, je aus der Sicht dieser Datei, nicht kopiert. In `packages/shadow-objects/CHANGELOG.md` gehören die neun Glossen der Paket-Doku und die beiden Löschungen unterhalb von `packages/shadow-objects/` — die Doku dieses Pakets ist laut `AGENTS.md` §4 Teil seines öffentlichen Vertrags. In die Wurzel-`CHANGELOG.md` gehört `AGENTS.md`: sie führt laut ihrem eigenen Kopf »dev workflow«, und die Präzedenz steht in derselben Datei einen Abschnitt weiter oben, im `AGENTS.md`-Bullet aus Paket 11. Von Laufzeit-API, Verhalten und `dist/`-Form bewegt sich nichts, deshalb keine der übrigen Kategorien und kein Eintrag im Canvas-Changelog.
- Dateien: `packages/shadow-objects/docs/api-reference.md` · `packages/shadow-objects/docs/cheat-sheet.md` · `packages/shadow-objects/docs/concepts.md` · `packages/shadow-objects/docs/getting-started.md` · `packages/shadow-objects/docs/guides.md` · `AGENTS.md` · `packages/shadow-objects/CHANGELOG.md` · `CHANGELOG.md` (Wurzel) · gelöscht: `packages/shadow-objects/docs/shadow-theater.svg`, `packages/shadow-objects/src/view/ClassGraphOverview.drawio`, `packages/shadow-objects/src/view/ClassGraphOverview.drawio.svg`
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler. Es streicht zehn Glossen aus Markdown, ersetzt einen Begründungssatz und nimmt drei nicht eingebundene Grafikdateien aus dem Baum; es gibt kein falsches Verhalten, das ein Test vorher rot zeigen könnte, und keine Spec dieses Repositories liest eine der sechs Markdown-Dateien oder eine der drei Grafiken. Den Nachweis führen die fünf Zählproben aus Schritt 6 und der Verify-Lauf.
- Vorgehen:
  1. Die neun Glossen in den fünf Doku-Dateien streichen. Es ändert sich je nur die genannte Zeichenkette innerhalb ihrer Zeile — keine Zeile kommt hinzu, keine fällt weg, kein Satz daneben wird angefasst.
     - `docs/api-reference.md:466` — `for a given Entity Token (Component Tag).` → `for a given Entity Token.`
     - `docs/api-reference.md:494` — `Maps Token (Component Tag) strings to` → `Maps Token strings to`
     - `docs/api-reference.md:1848` — `The Token (Component Tag) matching a registered` → `The Token matching a registered`
     - `docs/cheat-sheet.md:246` — `| Token (Component Tag) matching a Registry entry.` → `| Token matching a Registry entry.`
     - `docs/concepts.md:43` — `| **Token (Component Tag)** |` → `| **Token** |`
     - `docs/getting-started.md:50` — `token: Matches a definition in your logic module (Component Tag)` → `token: Matches a definition in your logic module` (das Leerzeichen vor der Klammer fällt mit)
     - `docs/getting-started.md:116` — `maps Token (Component Tags) to Shadow Objects` → `maps Tokens to Shadow Objects`. Die einzige der neun Stellen, an der ein Wort außerhalb der Klammer mitgeht: den Plural trug bisher die Glosse, und `Token` allein ergäbe hier keinen Satz. Die Folgezeile (` * (ECS components). This is the Registry (Component Manifest) for this module, and`) bleibt unangetastet.
     - `docs/guides.md:143` — `to a Token (Component Tag) in a module file:` → `to a Token in a module file:`
     - `docs/guides.md:332` — `| The Token (Component Tag) mapping to a Shadow Object` → `| The Token mapping to a Shadow Object`
  2. `AGENTS.md:18` — `- **Token (Component Tag):** String identifier linking View nodes to their shadow logic.` wird zu `- **Token:** String identifier linking View nodes to their shadow logic.` Die drei Bullets darüber (`View / Renderer`, `Entities (Game Objects)`, `Shadow Objects (ECS Components)`) und `Kernel (ECS System Runner)` darunter bleiben Wort für Wort stehen: ihre Klammern sind ECS-Begriffe und stehen in keiner Verbotszeile.
  3. `AGENTS.md:87` — in der Tabelle »Binding Terms« ausschließlich die dritte Spalte der `Token`-Zeile ersetzen. Die Zeile lautet danach vollständig:

     ```markdown
     | Token | Component Tag | The code knows only `token`, and no gloss renames it. |
     ```

     Die ersten beiden Spalten bleiben unverändert — »Use this: Token / Not this: Component Tag« ist der Punkt der Zeile und bleibt stehen. Die vier übrigen Zeilen der Tabelle, ihre Kopfzeile, der Satz »Documentation that invents plausible-sounding names is the most dangerous kind.« darüber und der Absatz `**The word "context" means two unrelated things.**` darunter werden nicht angefasst. Die Begründung steht in der Anmerkung »die Terminologie-Tabelle behält ihre Regel«.
  4. Drei Dateien aus dem Baum nehmen, mit `git rm`, damit die Löschung im Index steht:

     ```bash
     git rm packages/shadow-objects/docs/shadow-theater.svg \
            packages/shadow-objects/src/view/ClassGraphOverview.drawio \
            packages/shadow-objects/src/view/ClassGraphOverview.drawio.svg
     ```

     Nichts tritt an ihre Stelle, und keine Zeile ist nachzuziehen: keine der drei ist von irgendeiner Datei dieses Repositories eingebunden (gemessen 2026-08-26, `git grep` auf beide Basisnamen: null Treffer außerhalb der `audit.html`). Keine der drei erreicht das veröffentlichte Paket — die esbuild-Stufe des Builds globt `src/**/*.{ts,js}`, und `src/distContract.files.txt` führt weder eine `.svg` noch eine `.drawio`.
  5. Die beiden Changelogs.
     - `packages/shadow-objects/CHANGELOG.md`, Abschnitt `## [Unreleased]` → `### Internal`: zwei neue Bullets. Die Liste steht ab `- **Build:**` alphabetisch nach ihrem fett gesetzten Präfix; beide Einfügungen gehen an ihren alphabetischen Platz und werden über ihre Nachbarn im Text gefunden, nicht über eine Zeilennummer — die erste Einfügung verschiebt die zweite.
       - Unmittelbar hinter den **letzten** `- **Docs (correctness):**`-Bullet und vor `- **Docs (examples):**`:

         ```markdown
         - **Docs (diagrams):** two unreferenced illustrations are removed. `docs/shadow-theater.svg` was built on an analogy `AGENTS.md` §4 names as one not to use, and repeated two more of the listed words in its own comments; no documentation page embedded it. `src/view/ClassGraphOverview.drawio` and the SVG exported beside it showed `buildChangeTrails(clearChanges = true)`, a method the package does not have. Neither file reached the published package — the `dist/` file list is unchanged.
         ```

       - Unmittelbar hinter den vorhandenen `- **Docs (terminology):**`-Bullet und vor `- **Internal (elements):**`:

         ```markdown
         - **Docs (terminology):** the string identifier that links a View declaration to a Shadow Object is called Token, with no gloss beside it. The nine occurrences of "(Component Tag)" in `concepts.md`, `getting-started.md`, `guides.md`, `cheat-sheet.md` and `api-reference.md` are gone — `AGENTS.md` §4 lists the term among the names not to use, and the reference documentation is what a reader checks that rule against.
         ```

     - Wurzel-`CHANGELOG.md`: einen neuen datierten Abschnitt ganz oben einfügen, über `## 2026-08-26 — the readme and the agent guide describe this repository` (heute Zeile 7):

       ```markdown
       ## 2026-08-26 — the agent guide follows its own binding-terms table

       - **`AGENTS.md`:** the mental-model list in §2 names the Token with no gloss beside it. The
         binding-terms table in §4 lists "Component Tag" among the names not to use, and the bullet
         sixty-nine lines above it used exactly that name. The table keeps the rule and states it as
         one — the code knows only `token`, and no gloss renames it. The same gloss in the package
         documentation, and the two illustrations that leave the source tree with it, are recorded in
         [`packages/shadow-objects/CHANGELOG.md`](packages/shadow-objects/CHANGELOG.md).
       ```

     Ein Changelog hält einen Übergang fest, das ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben. Keine Finding-ID. Dass der Paket-Changelog die gelöschte Datei bei ihrem Pfad nennt und damit eine der verbotenen Analogien buchstabiert, ist keine Verwendung der Analogie, sondern die Angabe, welche Datei verschwunden ist — dieselbe Art Nennung wie in `AGENTS.md:75`. Beide Changelogs stehen unter den Ausschlüssen von Biome (`**/CHANGELOG.md`), werden also nicht umformatiert und behalten ihren Zeilenumbruch am Ende.
  6. Fünf Zählproben, alle mit ihrer Ausgabe in den Report:
     - `git grep -n 'Component Tag' -- ':!audit.html' ':!*CHANGELOG.md'` meldet genau einen Treffer: `AGENTS.md:87`, die Tabellenzeile, die den Begriff als den nicht zu verwendenden führt. Vorher elf (gemessen 2026-08-26). Der Ausschluss gilt den Changelogs — die Wurzel-`CHANGELOG.md` zitiert den Begriff in zwei historischen Einträgen (Zeile 402 und 535), und der neue Bullet im Paket-Changelog nennt ihn ebenfalls — sowie der `audit.html`, die das Finding zitiert; `remediation-plan.md` ist untracked und fällt von selbst heraus.
     - `git grep -niE 'shadow.theater|puppet|light world' -- ':!audit.html' ':!*CHANGELOG.md'` meldet genau zwei Treffer, `AGENTS.md:75` und `CLAUDE.md:114` — beides die Regelsätze, die die Analogien aufzählen. Vorher drei; der dritte war ein Kommentar in der gelöschten SVG-Datei.
     - Keine der drei Grafikdateien steht mehr im Index, und die beiden übrigen Paare stehen unverändert da: `git ls-files | grep -cE 'ClassGraphOverview|shadow-theater'` meldet `0` (vorher `3`), `git ls-files packages/shadow-objects/src/view/ | grep -c drawio` meldet `4` (vorher `6`).
     - Die sechs bearbeiteten Markdown-Dateien haben dieselbe Zeilenzahl wie zuvor: `wc -l AGENTS.md packages/shadow-objects/docs/{api-reference,cheat-sheet,concepts,getting-started,guides}.md` meldet `120`, `3052`, `507`, `445`, `174`, `623`. Jede Abweichung heißt, dass eine Zeile eingefügt oder entfernt wurde, und das tun die Schritte 1 bis 3 nicht.
     - `pnpm exec biome check . --max-diagnostics 1000` meldet weiterhin »Checked 219 files … No fixes applied« ohne Diagnostikum. Die Zahl bewegt sich nicht: Biome 2.5.9 bringt keinen Markdown-Formatter mit, und die drei gelöschten Dateien standen nie unter den 219 — gemessen 2026-08-26, `biome check` einzeln auf sie meldet »These paths were provided but ignored«.
- Ausdrücklich **nicht** tun, weil es beim Lesen dieser Zeilen naheliegt:
  - `ComponentContext.drawio{,.svg}` und `ShadowEnv.drawio{,.svg}` nicht anfassen, obwohl Schritt 4 ihre Nachbarn im selben Verzeichnis löscht und beide ebenso unverlinkt sind. Die Begründung steht in der Anmerkung »die beiden übrigen Diagramm-Paare bleiben liegen«.
  - Die Tabelle »Binding Terms« über die dritte Spalte der `Token`-Zeile hinaus nicht anfassen, insbesondere die Zeile nicht entfernen und »Component Tag« nicht als zulässige Glosse aufnehmen. Beides kehrte die Entscheidung vom 2026-08-26 um.
  - `packages/shadow-objects/docs/concepts.md:9` nicht anfassen — »The **renderer** draws what the player sees on screen.« Das ist der Bildschirm im ECS-Spielebild, nicht die verbotene Analogie, und wer nach `screen` greppt, landet zuerst hier.
  - `AGENTS.md:75` und `CLAUDE.md:114` nicht anfassen. Beide zählen die verbotenen Analogien auf, um sie zu verbieten; sie sind die Regel und nicht ihr Verstoß.
  - Die Glossen ohne Verbotszeile nicht mit-streichen: `Entity (Game Object)`, `Shadow Object (ECS Component)`, `Registry (Component Manifest)`, `Kernel (ECS System Runner)`. Sie stehen in `AGENTS.md` §2 selbst und in der Begriffstabelle von `concepts.md`; in der Verbotstabelle steht allein »Component Tag«.
  - Die beiden historischen Erwähnungen in der Wurzel-`CHANGELOG.md` (Zeile 402 und 535) nicht anfassen. Ein Changelog wird nicht rückwirkend umgeschrieben; die Historie ist konserviert.
  - `packages/shadow-objects/docs/README.md` nicht anfassen. Gemessen 2026-08-26: es bindet keine der drei gelöschten Dateien ein, seine Navigation zeigt auf die sieben Markdown-Seiten.
  - Den übrigen Text der sechs Markdown-Dateien nicht glätten. Dieses Paket streicht eine Glosse und einen Begründungssatz; es schreibt keine Doku um.
  - Kein `pnpm make:todo` — es wird kein TODO-Kommentar angefasst.
  - Die vier `distContract`-Erwartungsdateien nicht anfassen. Weder unter `dist/` noch unter `.npm-pkg/` bewegt sich eine Datei.
  - Keinen Eintrag in `packages/shae-offscreen-canvas/CHANGELOG.md`. Das Canvas-Paket wird nicht berührt.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: Alle vier grün. Anders als bei Paket 11 sind `build`, `typecheck` und `test` **keine** Cache-Treffer: `turbo.json` führt `src/**` unter den `inputs` aller drei Tasks, und Schritt 4 löscht zwei Dateien unterhalb von `packages/shadow-objects/src/view/`. Damit ändert sich der Hash von `shadow-objects#build`, `#typecheck` und `#test`, und über `dependsOn: ["^build"]` laufen auch die Tasks der drei übrigen Pakete neu. Ein vollständiger Lauf ist hier also das Erwartete und kein Fehlersignal. Die Zahlen darin bewegen sich nicht, weil sich keine Zeile Quelltext bewegt: 802/379/123/645 Tests und Coverage 92,89 % (3385/3644). `pnpm lint` läuft an turbo vorbei (`biome check . --max-diagnostics 1000`) und meldet »Checked 219 files … No fixes applied« ohne Diagnostikum. `src/distContract.spec.ts` und `src/distContract.spec.js` bleiben grün — Dateiliste und `package.json`-Form beider veröffentlichter Pakete sind unberührt. Jede Bewegung in einer dieser Zahlen ist neu und blockiert.
- Commit: `docs: the binding terms hold, and two unreferenced illustrations leave the source tree`
- Ergebnis: 1 Runde · DX-001 und DX-010 behoben · neun Glossen »(Component Tag)« in fünf Doku-Seiten und `AGENTS.md:18` gestrichen, die Begründungsspalte von `AGENTS.md:87` nennt jetzt die Regel statt des Fundorts · `docs/shadow-theater.svg` sowie `src/view/ClassGraphOverview.drawio{,.svg}` aus dem Baum genommen · beide Changelogs gepflegt · kein Regressionstest (kein Korrektheitsfehler, Nachweis über die fünf Zählproben) · Reviewer ohne Befund
- Nebenbefunde: keine neuen aus Zug 1–5; der Schreibfehler `ShadowEnv.drawio:28` aus Zug 0 steht unter »Offene Befunde«
- Folgen: keine
- Schnittstellen: keine — es bewegt sich keine Zeile Quelltext

**DX-001 · low · packages/shadow-objects/docs/shadow-theater.svg; docs/{concepts,guides,cheat-sheet,getting-started,api-reference}.md; AGENTS.md:18** — Die Dokumentation verletzt die eigenen verbindlichen Terminologieregeln

AGENTS.md §4 verbietet zwei Analogien ausdrücklich — im Dokumentationsverzeichnis liegt eine Datei, deren Name die erste trägt und deren Quelltext einen Kommentar mit der zweiten enthält. Sie wird von keiner Doku-Seite eingebunden. Dieselbe Sektion führt eine Tabelle verbindlicher Begriffe, in der »Component Tag« als nicht zu verwendende Variante von »Token« steht; die Glosse »Token (Component Tag)« erscheint an neun Stellen in fünf Doku-Dateien — und in AGENTS.md:18, fünfundsechzig Zeilen über der Tabelle, die sie verbietet. Positiv daneben: jedes in api-reference.md dokumentierte API-Symbol existiert im Quelltext, es gibt keine erfundene API.

Empfehlung: Die SVG-Datei löschen. Für »Component Tag« entscheiden: entweder als zulässige Glosse in die Tabelle aufnehmen, oder an allen neun Stellen streichen und §2 mitziehen. Eine Regel, die ihre eigene Referenzdokumentation verletzt, wird beim nächsten Zweifelsfall nicht befolgt.

Beleg im Audit: Nachgezählt (2026-08-19): eine SVG-Datei, neun Glossen-Fundstellen. Die Markdown-Dateien selbst sind ansonsten frei von den verbotenen Analogien.

Von den beiden angebotenen Varianten ist die zweite entschieden (2026-08-26, im Kopf dieses Plans): streichen und §2 mitziehen. Die Zeilenangabe »fünfundsechzig Zeilen« ist heute neunundsechzig — Paket 11 hat den dritten Abschnitt der Datei entfernt, die Tabelle steht jetzt auf Zeile 87.

**DX-010 · info · packages/shadow-objects/src/view/ClassGraphOverview.drawio** — Das Klassendiagramm zeigt einen Stand von März 2025

Das Diagramm samt exportiertem SVG führt unter anderem `buildChangeTrails(clearChanges = true)`, eine Signatur, die es nicht mehr gibt. Es ist seit März 2025 unberührt und an mehreren Stellen überholt; wer es zur Orientierung nimmt, orientiert sich falsch.

Empfehlung: Entweder in einem eigenen Durchgang auffrischen oder aus dem Quellbaum nehmen. Punktuelles Nachziehen einzelner Kästchen lohnt bei diesem Abstand nicht.

Von den beiden angebotenen Varianten ist die zweite entschieden (2026-08-26, im Kopf dieses Plans): aus dem Quellbaum nehmen. Das exportierte SVG geht mit — es ist derselbe Stand in einer zweiten Datei, und ein Diagramm ohne seine Quelle ließe sich nicht einmal mehr auffrischen. Der Abgleich schärft die Beschreibung: `buildChangeTrails` fehlt nicht nur in dieser Signatur, sondern gibt es unter `packages/shadow-objects/src/` überhaupt nicht mehr.

### [x] 13. Gemessene Größenordnungen in die Doku
- Findings: Optimierung »Die Größenordnungen dokumentieren, die gemessen wurden«, DX-011 (info)
- Ziel: Die Zahlen zur Elternauflösung stehen an genau einer Stelle in der Doku, auf dem Weg dessen, der über Namensräume entscheidet, und jeder Verweis darauf zeigt dorthin statt auf eine Datei, die es nicht gibt.
- Bereich: `packages/shadow-objects/docs/guides.md`, `packages/shadow-objects/docs/api-reference.md`, `packages/shadow-objects/src/view/ComponentContext.ts` (ein Kommentar), `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: 12
- Hash: 71aaa8d
- Modell: mittlere Stufe
- Effort: low
- Anmerkung (aus Paket 12, Zug 0 — Vorschau auf dieses Paket): Sie hat gehalten, soweit sie reichte. Paket 12 hat in `packages/shadow-objects/CHANGELOG.md` drei Zeilen unterhalb von `:281` eingefügt (`### Internal`, heute 409, 420, 425) und keine darüber; die Zeilennummern der fünf Doku-Seiten haben sich nicht bewegt. Die Fundstelle von DX-011 ist trotzdem gewandert, und zwar von Paket 9: `260965e` hat den Bullet `**Breaking (globals):**` auf Zeile 216 eingefügt, und alles darunter ist um eins nach hinten gerückt. Maßgeblich ist der Abgleich unten.
- Anmerkung (Abgleich, 2026-08-26): Beide Findings stehen im Baum, eins davon verschoben, das andere verschärft.

  **DX-011 — verschoben, sonst unverändert.** Der Eintrag liegt heute auf `packages/shadow-objects/CHANGELOG.md:281`, nicht auf `:280` (Ursache oben). Es ist der Bullet, der mit »a token change that fails halfway through is taken back.« beginnt; `git show bfcc54b:packages/shadow-objects/CHANGELOG.md | sed -n '280p'` trägt denselben Satz, es ist also dieselbe Zeile und keine Verwechslung mit dem Nachbarn, der jetzt auf `:280` steht (`[onCreate]`-Hook). Der Befund selbst trägt: der Eröffnungssatz nennt weder das Symbol noch die Folge für den Aufrufer, und »taken back« lässt offen, was zurückgenommen wird. Der ganze Abschnitt `[Unreleased]` reicht von Zeile 10 bis 429 — der Eintrag ist unveröffentlicht, seine Formulierung ist noch frei.

  **Die Optimierung — sie stimmt, aber ihre Begründung hat sich gedreht.** Das Audit sagt, die Zahlen stünden »im Quelltext und im Backlog, nicht in der Doku«. Ein Backlog gibt es nicht mehr: `Backlog.md` ist mit `bfcc54b` aus dem Baum genommen worden — »chore: remove outdated backlog«, dem Stand vor dem ersten Commit dieses Laufs —, und `git ls-tree bfcc54b --name-only | grep -i backlog` meldet nichts. Vier Stellen dieses Repositories verweisen weiterhin darauf, alle vier vorbestehend und je an `bfcc54b` nachgesehen: `packages/shadow-objects/src/view/ComponentContext.ts:588`, `packages/shadow-objects/CHANGELOG.md:390`, `packages/shadow-objects-e2e/TEST-PLAN.md:17` und `CLAUDE.md:87,108`. Die ersten beiden nennen genau die Messreihe, um die es hier geht; sie kommen in dieses Paket. Die anderen beiden haben eine andere Ursache und stehen unter »Offene Befunde«.

  **Und die Doku ist nicht ganz leer.** `packages/shadow-objects/docs/api-reference.md:2091-2097` (unter `#### Entity Hierarchy`) trägt die Aussage bereits, in Worten statt in Zahlen: »a bill that passes a frame at around 145 entities in one namespace and passes a quarter of a second at six hundred«. Es fehlen die Zahlen, die Messbedingungen und ein Datum — und die Stelle liegt auf Zeile 2091 von 3052, mitten in der Elternauflösung von `<shae-ent>`. Wer über Namensräume entscheidet, kommt dort nicht vorbei. Die Zeile steht wortgleich in `git show bfcc54b:…`, ist also vorbestehend und nicht von diesem Lauf entstanden.
- Anmerkung (warum ein Kommentar im Quelltext in ein Doku-Paket kommt): `src/view/ComponentContext.ts:588` verspricht »`Backlog.md`'s Performance section carries the size series and how to reproduce it«. Beide Hälften des Versprechens sind unhaltbar: die Datei ist weg, und eine Messvorrichtung, mit der sich die Reihe nachfahren ließe, gibt es in diesem Repository nicht — `packages/shadow-objects-e2e/` führt kein Benchmark, weder unter `src/` noch unter `public/`. Der Satz wandert nicht mit einem Nebenbefund ins Audit, sondern in dieses Paket, und zwar aus zwei Gründen. Erstens ist er der Quelltext-Zeiger auf genau die Messreihe, die dieses Paket in die Doku legt: bliebe er stehen, verwiese er auf nichts, während zwanzig Zeilen weiter ein Ziel entstünde. Zweitens ist er ausgeliefert — esbuild behält JSDoc, `packages/shadow-objects/dist/src/view/ComponentContext.js:444` trägt ihn, und `docs/` liegt nicht im npm-Paket. Ein Konsument bekommt also einen Verweis auf eine Datei, die nie mitgeliefert wurde. Geändert wird ein Satz in einem Kommentar; keine Anweisung, keine Signatur, kein `.d.ts` — `dist/src/view/ComponentContext.d.ts` trägt den Block nicht.
- Anmerkung (die Zahlen leben an einer Stelle, die Verweise sind Verweise): Drei Dateien reden über dieselbe Messung. Nur `guides.md` bekommt die Zahlen; `api-reference.md` und der Kommentar behalten ihr Argument und zeigen für die Reihe dorthin. Zwei Kopien einer Messung sind zwei Stellen, an denen sie veralten kann, und dieses Paket existiert, weil genau das passiert ist.
- Anmerkung (der Vergleich mit dem alten Verhalten bleibt, wo er hingehört): Die `n(n+1)/2`-Rechnung und der Kipppunkt bei rund 145 Wurzeln beschreiben einen Entwurf, den die Bibliothek nicht fährt. Im Kommentar und in `api-reference.md` ist das die Begründung des Codes und steht richtig — die Konventionen im Kopf dieses Plans wollen Kommentare, die das *Warum* erklären. In `guides.md` hat er nichts zu suchen: dort liest jemand, was ihn heute etwas kostet, und ein Rückblick auf einen Vorzustand ist dort genau das, was der Kopf dieses Plans verbietet. Der neue Abschnitt trägt deshalb nur die Zahlen des heutigen Verhaltens.
- Dateien: `packages/shadow-objects/docs/guides.md` · `packages/shadow-objects/docs/api-reference.md` · `packages/shadow-objects/src/view/ComponentContext.ts` · `packages/shadow-objects/CHANGELOG.md`
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler. Es fügt einen Abschnitt Markdown hinzu, ändert drei Sätze und einen Kommentar; es bewegt keine Anweisung, und keine Spec dieses Repositories liest eine der beiden Markdown-Dateien. Den Nachweis führen die drei Zählproben aus Schritt 6 und der Verify-Lauf.
- Vorgehen:
  1. `packages/shadow-objects/docs/guides.md` — einen neuen Abschnitt einfügen, zwischen Zeile 501 (der Leerzeile nach »Each namespace is a completely isolated Shadow Environment with its own Kernel (ECS System Runner) and entity tree.«) und Zeile 502 (`### Waiting for the Environment to be Ready`). Er gehört unter `## 4. Multi-Environment Setup` und hinter `### Multiple Isolated Shadow Environments`, weil dort steht, wer über Namensräume entscheidet. Wortlaut:

     ```markdown
     ### How Many Entities Fit in One Namespace

     Every entity joining a namespace asks it for the closest ancestor above it, and everything that joins within the same task is answered by a single round instead of one round each. What a build costs in parent resolution is therefore the number of entities coming up together, and it stays that way as the namespace grows.

     Measured in Chromium via Playwright 1.62.1 on 2026-08-22, over the sizes 100, 125, 150, 300 and 600 entities coming up in one task. At the top of that range:

     | What comes up | Entities | Messages | Build | Same build, parent resolution off |
     | :--- | ---: | ---: | ---: | ---: |
     | Roots of one namespace | 600 | 600 | 44.0 ms | 41.8 ms |
     | Children of one parent | 600 | 600 | 49.3 ms | 46.7 ms |

     Six hundred entities arriving at once cost two to three milliseconds of parent resolution, and the curve is flat over the whole range measured. At these sizes, splitting a namespace buys nothing in parent resolution.

     Read the numbers for their order of magnitude, not as a promise: one browser, one day, one machine. And they bound the parent resolution the View Layer runs and nothing else — what your Shadow Objects cost per entity is yours, and so is what the change trail carries across a worker boundary.

     Split a namespace for isolation instead: a part of the application that runs in a worker while another runs on the main thread, a feature that has to be torn down on its own, a tenant that must not meet another. Each namespace is a Kernel, a Registry and an entity tree of its own.
     ```

     Die Zahlen sind übernommen, nicht erhoben — Quelle ist der Bullet `**Performance (view):**` in `packages/shadow-objects/CHANGELOG.md:390`, der beide Kanäle mit Messreihe und Bedingungen führt. Es wird nichts nachgemessen. Dezimaltrenner ist der Punkt: der Abschnitt ist englische Prosa, und die Kommaschreibweise im CHANGELOG bleibt dort, wo sie steht. Absätze stehen je auf einer Zeile ohne harten Umbruch, wie die Nachbarabsätze 490 und 500 derselben Datei.
  2. `packages/shadow-objects/docs/api-reference.md` — an das Ende des Absatzes auf den Zeilen 2091-2097 (unter `#### Entity Hierarchy`, endet mit »…up to six hundred entities coming up together.«) einen Satz anhängen, im Umbruch dieses Absatzes bei rund 100 Zeichen:

     ```
     The measurement behind those figures — Chromium via Playwright 1.62.1, 2026-08-22, over the sizes
     100 to 600 — is in [guides.md → How Many Entities Fit in One
     Namespace](./guides.md#how-many-entities-fit-in-one-namespace).
     ```

     Der Absatz davor bleibt Wort für Wort stehen, samt `n(n+1)/2` und den 145 Entities. Er begründet den Entwurf und tut das richtig.
  3. `packages/shadow-objects/src/view/ComponentContext.ts` — im JSDoc-Block von `collectPeerReRequest()` die Zeilen 587-588

     ```
      * Numbers measured 2026-08-22 in Chromium via Playwright 1.62.1 — a snapshot, not a guarantee;
      * `Backlog.md`'s Performance section carries the size series and how to reproduce it.
     ```

     ersetzen durch

     ```
      * Numbers measured 2026-08-22 in Chromium via Playwright 1.62.1 — a snapshot, not a guarantee;
      * the size series is in `packages/shadow-objects/docs/guides.md`, under "How Many Entities Fit
      * in One Namespace".
     ```

     Der Pfad steht repo-relativ und nicht als relativer Sprung, weil der Kommentar in `dist/src/view/ComponentContext.js` mit ausgeliefert wird und `docs/` dort nicht liegt. Das Versprechen »how to reproduce it« fällt ersatzlos: eine Messvorrichtung gibt es nicht, und ein Kommentar, der auf eine nicht vorhandene verweist, ist derselbe Fehler noch einmal. Die Zeilen 575-585 desselben Blocks bleiben unangetastet.
  4. `packages/shadow-objects/CHANGELOG.md:390` — im Bullet `**Performance (view):**` den letzten Satz ändern. Aus

     ```
     The point where the round costs more than a frame moved from about 145 entities in one namespace — the two sizes that bracket it are in `Backlog.md` — to beyond the largest size measured.
     ```

     wird

     ```
     The point where the round costs more than a frame moved from about 145 entities in one namespace — it falls between the measured sizes 125 and 150 — to beyond the largest size measured.
     ```

     Die beiden Größen stehen zwei Sätze weiter oben im selben Bullet (»one run over the sizes 100/125/150/300/600«); der Verweis wird durch das ersetzt, worauf er zeigte. Der übrige Bullet bleibt Wort für Wort stehen.
  5. `packages/shadow-objects/CHANGELOG.md:281` — im Bullet `**Bugfix (kernel):**`, der mit »a token change that fails halfway through is taken back.« beginnt, die ersten drei Sätze ersetzen. Der Bullet beginnt danach so:

     ```
     - **Bugfix (kernel):** `Kernel.changeToken()` rolls an entity back to its previous token and shadow-objects when one of the new token's constructors throws, so it is not left carrying a token whose shadow-objects it is missing. The new token is written before the constructors run, because the constructor set is resolved from it; where a construction throws, the kernel puts the previous token back, takes the shadow-objects of the new token down and builds the ones of the previous token again, before the error reaches the caller. That holds as far as the way back gets: a rebuild that throws in its turn is reported through the `ConsoleLogger` rather than replacing the error the caller is waiting for, and the entity keeps what the rebuild managed.
     ```

     Alles ab »`changeProperties()` takes its shadow-objects back the same way.« bleibt Wort für Wort stehen. Drei Sätze bewegen sich und kein vierter: der erste nennt jetzt Symbol, Bedingung und Folge und steht allein; der zweite verliert die Wiederholung des Symbolnamens; der dritte verliert die Aussage, die der erste übernommen hat. Die Nachbar-Bullets werden nicht angefasst.
  6. `packages/shadow-objects/CHANGELOG.md` — in `### Internal` einen neuen Bullet direkt hinter Zeile 411 (dem vorhandenen `**Docs (guides):**`) einfügen. Der Abschnitt ist alphabetisch nach dem Klammerzusatz geordnet — consistency, correctness, diagrams, examples, guides, introduction, links, reference, security, terminology —, und ein zweiter `guides`-Eintrag hält diese Ordnung. Wortlaut:

     ```
     - **Docs (guides):** `guides.md` gained `### How Many Entities Fit in One Namespace` under §4, with the messages and milliseconds one namespace costs in parent resolution at sizes up to six hundred entities, the browser and the day they were measured on, and what they do not cover. `api-reference.md` §Entity Hierarchy and the `collectPeerReRequest()` comment in `src/view/ComponentContext.ts` name that section for the size series rather than carrying it a second time.
     ```

     Keine Finding-ID, kein Rückblick auf den Vorzustand, ein Bullet für eine Änderung.
  7. Nicht anfassen:
     - Die historischen `Backlog.md`-Erwähnungen in der Wurzel-`CHANGELOG.md` (Zeilen 148, 289, 411, 423, 505). Ein Changelog wird nicht rückwirkend umgeschrieben; sie berichten über eine Datei, die es gab, als der Eintrag entstand. Dieselbe Begründung, mit der Paket 12 die beiden historischen »Component Tag«-Erwähnungen stehengelassen hat.
     - `CLAUDE.md:87` und `:108` und `packages/shadow-objects-e2e/TEST-PLAN.md:17`. Beide nennen ebenfalls `Backlog.md`, aber aus anderer Ursache — dort steht eine Arbeitsanweisung beziehungsweise ein Verweis auf eine Coverage-Heuristik, hier ein Zeiger auf eine Messreihe. Beide stehen unter »Offene Befunde«, der zweite ist Paket 15 zugeteilt.
     - `README.md:92` in der Wurzel. Die Zeile trägt dieselbe Sorte Schaden wie dieses Paket — eine Messung, die dem Code nicht nachgewachsen ist —, aber ihr Urteil an der Scope-Regel ist `→ Rückfrage`, offen seit Paket 11. Sie mitzunehmen hieße, diese Rückfrage still zu beantworten. Sie bleibt liegen und wird beim Abschluss mit den beiden anderen Einträgen derselben Lücke entschieden.
     - Kein neuer Abschnitt und keine Zahl in `cheat-sheet.md`, `concepts.md` oder `best-practices.md`. Die Messreihe lebt an einer Stelle.
     - Keine Zahl neu erheben, keine Messvorrichtung bauen. Die Werte stehen oben; dieses Paket schreibt Doku und keinen Benchmark.
     - Die vier `distContract`-Erwartungsdateien nicht anfassen. Unter `dist/` und `.npm-pkg/` bewegt sich keine Datei, und die Form beider veröffentlichter `package.json` bleibt gleich.
     - Kein `pnpm make:todo` — es wird kein TODO-Kommentar angefasst.
     - Kein Eintrag in der Wurzel-`CHANGELOG.md` und keiner in `packages/shae-offscreen-canvas/CHANGELOG.md`. Es bewegt sich weder Build, Testrunner, Lint, turbo/pnpm noch eine devDependency, und das Canvas-Paket wird nicht berührt.
  8. Drei Zählproben, alle drei gehören mit ihrer Ausgabe in den Report:
     - `git grep -n 'Backlog' -- ':!audit.html' ':!remediation-plan.md' ':!CHANGELOG.md'` meldet nur noch `CLAUDE.md:87`, `CLAUDE.md:108` und `packages/shadow-objects-e2e/TEST-PLAN.md:17`; die beiden Treffer in `packages/shadow-objects/src/` und `packages/shadow-objects/CHANGELOG.md` sind weg.
     - `git diff --stat` bewegt genau vier Dateien.
     - Der Anker trägt: `grep -n 'How Many Entities Fit in One Namespace' packages/shadow-objects/docs/guides.md packages/shadow-objects/docs/api-reference.md packages/shadow-objects/src/view/ComponentContext.ts packages/shadow-objects/CHANGELOG.md` meldet vier Treffer, je einen pro Datei — die Überschrift, den Link, den Kommentar und den Changelog-Bullet.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: Alle vier grün. `build`, `typecheck` und `test` sind **keine** Cache-Treffer: `turbo.json` führt `src/**` unter den `inputs` aller drei Tasks, und Schritt 3 ändert eine Datei unter `packages/shadow-objects/src/view/`. Über `dependsOn: ["^build"]` laufen auch die Tasks der drei übrigen Pakete neu; ein vollständiger Lauf ist hier das Erwartete und kein Fehlersignal. Die Zahlen darin bewegen sich nicht, weil sich keine Anweisung bewegt: 802/379/123/645 Tests und Coverage 92,89 % (3385/3644). Ein Kommentar ist keine Anweisung, die Zählung kann sich davon nicht bewegen; tut sie es doch, ist das ein Befund für den Report. `pnpm lint` läuft an turbo vorbei (`biome check . --max-diagnostics 1000`) und meldet »Checked 219 files … No fixes applied« ohne Diagnostikum — die Dateizahl bleibt gleich, weil keine Datei entsteht oder verschwindet und Biome 2.5.9 ohnehin kein Markdown formatiert. `src/distContract.spec.ts` und `src/distContract.spec.js` bleiben grün. Jede Bewegung in einer dieser Zahlen ist neu und blockiert.
- Commit: `docs: the namespace guide carries the measured sizes, and a changelog entry stands on its own`
- Ergebnis: 1 Runde · DX-011 behoben (`packages/shadow-objects/CHANGELOG.md:281`, der erste Satz nennt jetzt `Kernel.changeToken()`, die Bedingung und die Folge und steht allein) · die Optimierung behoben: `packages/shadow-objects/docs/guides.md:502` trägt `### How Many Entities Fit in One Namespace` mit Tabelle, Messbedingungen und den gemessenen statt den gerundeten Werten, `docs/api-reference.md` und der `collectPeerReRequest()`-Kommentar in `src/view/ComponentContext.ts` zeigen dorthin · kein Regressionstest, das Paket bewegt keine Anweisung · klein: Zählprobe 3 des Detailplans erwartete vier `grep`-Treffer der Überschriftsphrase, es sind zwei — der Detailplan gibt für `api-reference.md` und `ComponentContext.ts` einen Wortlaut vor, der die Phrase über einen Zeilenumbruch bricht, was einzeiliges `grep` nicht findet; Implementierer und Reviewer haben den Wortlaut gehalten und die Probe als falsch gemeldet, der Zweck der Probe (Anker und Kommentarverweis treffen die neue Überschrift) ist unabhängig davon geprüft und erfüllt
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — es bewegt sich keine Signatur und kein Export, nur Prosa und ein Kommentar

**Optimierung · »Die Größenordnungen dokumentieren, die gemessen wurden«** — aus dem Abschnitt »Optimierungspotenzial« des Audits

Für die quadratische Wurzel-Runde liegen Zahlen vor — 600 Wurzeln, 270 Millisekunden, Chromium, August 2026. Sie stehen im Quelltext und im Backlog, nicht in der Doku. Wer die Bibliothek einsetzt, trifft die Entscheidung über Namensräume aber vorher.

Der Abgleich schärft das an drei Stellen. Erstens gibt es das Backlog nicht mehr, und die Verweise darauf sind stehengeblieben. Zweitens trägt `api-reference.md:2091-2097` die Aussage bereits in Worten, ohne Zahlen, ohne Bedingungen und an einer Stelle, an der niemand über Namensräume nachdenkt. Drittens sind »270 Millisekunden« die gerundete Differenz und nicht die gemessene Zahl: `CHANGELOG.md:390` führt 298,6 ms gegen einen Boden von 41,8 ms für den ungebündelten Entwurf und 44,0 ms für den gefahrenen; der Kommentar im Quelltext nennt dieselbe Differenz als »some 257 ms on top«. In die Doku gehen die gemessenen Werte, nicht die gerundeten.

**DX-011 · info · packages/shadow-objects/CHANGELOG.md:280** — Der Einstiegssatz eines CHANGELOG-Eintrags trägt ohne seine Nachbarn nicht

Der Eintrag beginnt mit einem Satz, der auf den Kontext der umstehenden Einträge baut. Für sich gelesen sagt er nicht, worum es geht — und genau so wird ein CHANGELOG gelesen: aufgeschlagen an der Stelle, zu der eine Versionsnummer führt, nicht am Stück von vorn.

Empfehlung: Den ersten Satz so umschreiben, dass er allein steht: was sich geändert hat, an welchem Symbol, mit welcher Folge für den Aufrufer. Die Nachbareinträge derselben Version bleiben unberührt.

Die Fundstelle liegt heute auf `:281`; die Empfehlung wird befolgt. Damit der erste Satz die Aussage des dritten übernehmen kann, ohne dass sie zweimal dasteht, bewegen sich drei Sätze statt einem — innerhalb desselben Bullets. »Die Nachbareinträge derselben Version bleiben unberührt« ist damit gewahrt: gemeint sind die Bullets daneben, und die werden nicht angefasst.

### [x] 14. Doku des Canvas-Pakets
- Findings: DX-016 (low), DX-014 (info)
- Ziel: Die einzige API-Referenz des Pakets beschreibt alle fünf ausgelieferten Shadow Objects, und ihr Inhaltsverzeichnis springt.
- Bereich: `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md`, `packages/shae-offscreen-canvas/CHANGELOG.md`
- Hängt ab von: —
- Hash: 4c2a94d
- Modell: mittlere Stufe
- Effort: low
- Anmerkung (Abgleich, 2026-08-26): Beide Findings stehen unverändert im Baum, und das ist nachgesehen und nicht vermutet: `git diff --stat bfcc54b..HEAD -- packages/shae-offscreen-canvas/` bewegt keine Zeile — dieser Lauf hat das Canvas-Paket bis hierher nicht angefasst, weder Quelltext noch Manifest noch Doku. Die Zeilennummern des Audits gelten also wörtlich. **DX-016:** `src/shadow-objects.js` importiert und definiert fünf Shadow Objects (`ShaeOffscreenCanvas`, `ThreeMultiViewRenderer`, `ThreeRenderView`, `Canvas2D`, `CanvasBitmapRenderer`), die Doku trägt vier `###`-Abschnitte; `ThreeRenderView` fehlt. Die `routes`-Angabe des Audits stimmt: `routes: {ThreeRenderView: ['CanvasBitmapRenderer', 'ThreeRenderView']}`, und `ShaeOffscreenCanvas.spec.js:61` hält genau diese Auflösung fest. **DX-014:** `[CanvasBitmapRenderer]()` steht auf Zeile 5, das Ziel `#canvasbitmaprenderer` gehört zur Überschrift auf Zeile 48.
- Anmerkung (drei Verweise derselben Ursache kommen hinzu): Der Abgleich hat die Datei ganz gelesen und dabei drei weitere Stellen gefunden, die alle dieselbe Ursache tragen wie DX-014 — ein Verweis, der ins Leere zeigt. Sie kommen in dieses Paket und nicht in »Offene Befunde«: gleiche Ursache, gleiche Datei, gleicher Commit, und das Ziel dieses Pakets nennt das Inhaltsverzeichnis ausdrücklich. Alle drei sind vorbestehend (die Datei ist seit `bfcc54b` unbewegt, siehe oben):
  - **Zeile 1 — `[TOC]`.** Eine Direktive für einen Markdown-Prozessor, den dieses Repository nicht hat: `git grep '\[TOC\]'` meldet genau dieses eine Vorkommen, es gibt keinen Site-Generator und keine Markdown-Pipeline. Auf GitHub und in jeder Editor-Vorschau steht damit als erste Zeile der Datei die Zeichenfolge `[TOC]`, und ein Inhaltsverzeichnis gibt es nicht.
  - **Zeile 13 — `[ShaeOffscreenCanvas](./ShaeOffscreenCanvas.js)`.** Relativer Pfad ab `docs/`, wo keine `.js` liegt; die Datei steht unter `../src/shadow-objects/`.
  - **Zeile 100 — `[ThreeMultiViewRenderer](./ThreeMultiViewRenderer.js)`.** Dasselbe.
- Anmerkung (was nicht in dieses Paket kommt): `packages/shae-offscreen-canvas/package.json:51` (`esbuild-plugin-inline-worker` ohne Benutzer) steht unter »Offene Befunde« und bleibt dort — dieses Paket öffnet kein Manifest, und die Ursache ist eine andere. Auf Zeile 19 der Doku steht ein Leerzeichen am Zeilenende; die Zeile gehört zu keinem Schritt dieses Pakets und wird nicht angefasst — Biome formatiert kein Markdown, es ist also auch kein Lint-Befund. `ASYNC-002` (der Frame-Listener von `ThreeRenderView` hat keine Wiedereintrittssperre) gehört nicht zum Scope dieses Laufs; der neue Doku-Abschnitt trifft deshalb keine Aussage über nebenläufige Frames, weder eine beruhigende noch eine warnende.
- Anmerkung (Zuständigkeit des Changelogs): Der Eintrag geht in `packages/shae-offscreen-canvas/CHANGELOG.md` und in keine andere Datei. `AGENTS.md` §4 zählt die `docs/` eines veröffentlichten Pakets zu seinem öffentlichen Vertrag; die Präzedenz steht in Paket 12, das die Doku des Kernpakets aus demselben Grund in dessen Changelog eingetragen hat. Von Laufzeit-API, Verhalten und der Form von `.npm-pkg/` bewegt sich nichts: `build.mjs` kopiert `README.md` und `src/`, `docs/` und `CHANGELOG.md` liegen nicht im veröffentlichten Paket, und `src/distContract.files.txt` führt keine der beiden Dateien. Keine der vier `distContract`-Erwartungsdateien wird angefasst.
- Dateien: `packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md` · `packages/shae-offscreen-canvas/CHANGELOG.md`
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler. Es fügt Markdown hinzu und richtet drei Verweise; es bewegt keine Anweisung, und keine Spec dieses Repositories liest eine der beiden Dateien. Den Nachweis führen die vier Zählproben aus Schritt 6.
- Vorgehen:
  1. `docs/01-shadow-objects-api.md`, **Zeile 1** — `[TOC]` ersetzen. An die Stelle der einen Zeile treten sieben:

     ```markdown
     The entry point `@spearwolf/shae-offscreen-canvas/shadow-objects.js` defines five Shadow Objects:

     - [ShaeOffscreenCanvas](#shaeoffscreencanvas)
     - [Canvas2D](#canvas2d)
     - [CanvasBitmapRenderer](#canvasbitmaprenderer)
     - [ThreeMultiViewRenderer](#threemultiviewrenderer)
     - [ThreeRenderView](#threerenderview)
     ```

     Die Leerzeile 2 und die Überschrift `### ShaeOffscreenCanvas` bleiben, wie sie sind. Die Reihenfolge der Liste ist die der Abschnitte in der Datei, nicht die des `define`-Objekts — die Liste ist ein Inhaltsverzeichnis und soll der Datei folgen. Ein hand gepflegtes Verzeichnis ist die zweite Stelle, an der die Struktur der Datei steht; das ist hier vertretbar und in Schritt 6 abgesichert, weil die Probe die Vollständigkeit prüft, statt sich auf Aufmerksamkeit zu verlassen.
  2. `docs/01-shadow-objects-api.md`, **Zeile 5** — im Satz `The [Canvas2D](#canvas2d) and [CanvasBitmapRenderer]() shadow objects should be used for this purpose.` das leere Klammerpaar füllen: `[CanvasBitmapRenderer](#canvasbitmaprenderer)`. Sonst nichts an der Zeile.
  3. `docs/01-shadow-objects-api.md`, **Zeile 13 und Zeile 100** — in beiden Zeilen im Linkziel `./` durch `../src/shadow-objects/` ersetzen, also `[ShaeOffscreenCanvas](../src/shadow-objects/ShaeOffscreenCanvas.js)` und `[ThreeMultiViewRenderer](../src/shadow-objects/ThreeMultiViewRenderer.js)`. Die Art des Ziels bleibt die, die der Verfasser gewählt hat — die Quelldatei und nicht die Sprungmarke: beide Zeilen stehen in der `provide context`-Tabelle des jeweils eigenen Abschnitts, ein Sprung auf den Abschnitt selbst wäre ein Kreis, und die Klasse ist das, was der Konsument über diesen Kontext in die Hand bekommt. Der übrige Zelleninhalt beider Zeilen bleibt unverändert.
  4. `docs/01-shadow-objects-api.md`, **ans Dateiende** — hinter die heutige Zeile 100 (die letzte Tabellenzeile des Abschnitts `ThreeMultiViewRenderer`) kommt eine Leerzeile, dann der Brückensatz, dann **zwei** Leerzeilen, dann der neue Abschnitt. Zwei Leerzeilen vor einer `###`-Überschrift und eine vor einer `####`-Überschrift ist die Trennung, die diese Datei durchgängig verwendet; sie wird eingehalten. Wortlaut ab der Leerzeile hinter Zeile 100:

     ```markdown
     [ThreeRenderView](#threerenderview) is what drives this API for a single entity: it takes one view, keeps it at the size of the canvas and renders it on every frame.


     ### ThreeRenderView

     The _ThreeRenderView_ shadow object owns one _RenderView_ of a [ThreeMultiViewRenderer](#threemultiviewrenderer) and transfers what that renderer draws into the [ImageBitmapRenderingContext](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmapRenderingContext) a [CanvasBitmapRenderer](#canvasbitmaprenderer) provides. It publishes the view as a context, so that other shadow objects on the same entity or below it set its `scene` and `camera`.

     The renderer is not part of the entity: it has to be in reach through the context, on the same entity or above it, and one renderer serves any number of render views. The rendering context comes with the token: the package routes `ThreeRenderView` to `CanvasBitmapRenderer` and `ThreeRenderView` together, so an entity carrying that token has both.

     #### provide context

     | context name | type | description |
     |------|------|-------------|
     | `ThreeRenderView` | [RenderView](#renderview-structure) | the render view of this entity. `undefined` for as long as no renderer or no canvas size is in reach |

     #### use context

     | context name | type | description |
     |------|------|-------------|
     | `ThreeMultiViewRenderer` | [ThreeMultiViewRenderer](#threemultiviewrenderer) | the renderer that creates, draws and destroys the view |
     | `ImageBitmapRenderingContext` | [ImageBitmapRenderingContext](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmapRenderingContext) | the rendering context the drawn frame is transferred into |
     | `canvasSize` | [**width**: _number_, **height**: _number_, **pixelRatio**: _number_] | the view takes its width and height from here, in _device pixels_, and follows every change |

     #### local entity events

     The shadow object listens to the `onFrame` event of its entity at `Priority.Low`, so that a shadow object setting `scene` and `camera` for this frame has run before it. It renders the view, transfers the resulting [ImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap) into the `ImageBitmapRenderingContext` and closes it. A frame the renderer answers with no image transfers nothing.

     The view goes back to the renderer through `destroyView()` exactly once — when the shadow object is torn down, and when the renderer leaves the context.
     ```

     Jede Aussage dieses Blocks ist am Quelltext geprüft und keine geht darüber hinaus: die drei gelesenen Kontexte stehen in `src/shadow-objects/ThreeRenderView.js:18-20`, die Erzeugung am ersten bekannten `canvasSize` und das Nachführen von `width`/`height` in `:24-48`, das Veröffentlichen des Views in `:68`, der Frame-Listener samt `Priority.Low`, `transferFromImageBitmap()` und `image.close()` in `:70-85`, die Rückgabe über `destroyView()` in `:57-66`. »runs later« für `Priority.Low` steht im README von `@spearwolf/eventize` 6.0.0. Die Route steht in `src/shadow-objects.js:17` und ist in `src/shadow-objects/ShaeOffscreenCanvas.spec.js:61` festgehalten. Kein Satz sagt etwas über nebenläufige Frames.
  5. `packages/shae-offscreen-canvas/CHANGELOG.md` — **ans Ende der Bullet-Liste unter `## [Unreleased]`**, also als neue Zeile 35 hinter dem Bullet, der mit »Importing `@spearwolf/shae-offscreen-canvas` writes nothing to the console« beginnt. Ein Bullet, ohne fett gesetztes Präfix — diese Datei führt keine, anders als das Changelog des Kernpakets:

     ```markdown
     - The package API reference (`docs/01-shadow-objects-api.md`) describes `ThreeRenderView`, the fifth Shadow Object the `./shadow-objects.js` entry point defines and the one an entity gets together with `CanvasBitmapRenderer` when it carries the `ThreeRenderView` token. The page opens with a list of all five, and the three links that reached nothing — `CanvasBitmapRenderer` in the first paragraph and the two source files in the context tables — find their targets.
     ```

     Der Blockquote `> **Next release: minor.**` am Kopf des Abschnitts bleibt unberührt: eine Doku-Änderung bewegt die Versionsstelle nicht. Ein Changelog hält einen Übergang fest, das ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben. Keine Finding-ID. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
  6. Vier Zählproben, alle mit ihrer Ausgabe in den Report. Sie laufen aus `packages/shae-offscreen-canvas/docs/`, und keine davon braucht ein Werkzeug außer `grep`, `sed`, `sort` und `comm`:
     - **Kein leeres Linkziel und kein `./`-Pfad mehr.** Erwartet danach: keine Zeile Ausgabe und `exit=1`. Heute meldet sie die drei Stellen aus Schritt 2 und 3 und `exit=0`.

       ```bash
       grep -n '](\s*)\|](\./' 01-shadow-objects-api.md; echo "exit=$?"
       ```
     - **Jede benutzte Sprungmarke hat ihre Überschrift.** Erwartet: keine Zeile Ausgabe. Diese Probe ist heute schon grün und steht für die neuen Ziele da — `#threerenderview`, `#renderview-structure`, `#canvasbitmaprenderer` und die fünf Einträge der Liste aus Schritt 1. Ein Tippfehler in einer davon fällt hier auf und sonst nirgends.

       ```bash
       comm -23 <(grep -o '](#[a-z0-9-]*)' 01-shadow-objects-api.md | sed 's/](#//;s/)$//' | sort -u) <(sed -n 's/^#\{2,5\} //p' 01-shadow-objects-api.md | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9 \n-' | tr ' ' '-' | sort -u)
       ```
     - **Jeder relative Pfad zeigt auf eine Datei, die es gibt.** Erwartet danach: keine Zeile Ausgabe. Heute meldet sie `DEAD ./ShaeOffscreenCanvas.js` und `DEAD ./ThreeMultiViewRenderer.js`.

       ```bash
       grep -o '](\.\.\?/[^)]*)' 01-shadow-objects-api.md | sed 's/](//;s/)$//' | while read -r p; do [ -e "$p" ] || echo "DEAD $p"; done
       ```
     - **Die `###`-Abschnitte der Doku sind genau die Shadow Objects, die `src/shadow-objects.js` definiert.** Aus `packages/shae-offscreen-canvas/` zu fahren. Erwartete Ausgabe: `same five`. Heute: `5d4` / `< ThreeRenderView` und Exit 1.

       ```bash
       diff <(sed -n "s/^import {\([A-Za-z0-9_]*\)} from '\.\/shadow-objects\/.*/\1/p" src/shadow-objects.js | sort) <(sed -n 's/^### //p' docs/01-shadow-objects-api.md | sort) && echo "same five"
       ```
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: Alle vier grün, und `build`, `typecheck` und `test` voll aus dem turbo-Cache (»FULL TURBO«). Das ist kein Fehlersignal, sondern die Vorhersage: `turbo.json` führt weder `docs/**` noch `CHANGELOG.md` in den `inputs` irgendeines Tasks, und `globalDependencies` nennt beide auch nicht. `pnpm lint` ist kein turbo-Task, sondern Biome an der Wurzel; Biome 2.5.9 verarbeitet kein Markdown und schließt `**/CHANGELOG.md` zusätzlich aus — die Meldung bleibt Wort für Wort die des letzten Laufs, ohne Diagnostikum. Der Verify-Lauf belegt damit, dass dieses Paket nichts kaputt macht, und nichts darüber hinaus; den Nachweis über die Änderung selbst führen die vier Zählproben aus Schritt 6.
- Commit: `docs(canvas): the api reference covers all five shadow objects and its links resolve`
- Ergebnis: 1 Runde · DX-016 und DX-014 behoben, dazu die drei Verweise derselben Ursache (`[TOC]` am Dateikopf, zwei `./`-Pfade in den Kontext-Tabellen) · kein Regressionstest, das Paket bewegt keine Anweisung; den Nachweis führen die vier Zählproben, alle vier vom Reviewer selbst nachgefahren und mit der erwarteten Ausgabe deckungsgleich · Review ohne Befund
- Nebenbefunde: keine
- Folgen: keine

**DX-016 · low · packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md** — Ein ausgeliefertes Shadow Object fehlt in der einzigen API-Referenz seines Pakets

Die Datei ist die einzige API-Referenz des Canvas-Pakets und beschreibt vier der fünf ausgelieferten Shadow Objects. ThreeRenderView fehlt vollständig, obwohl src/shadow-objects.js es exportiert und in seiner routes-Tabelle führt. Wer es benutzen will, findet den Namen im Code und nirgends eine Beschreibung.

Empfehlung: Einen Abschnitt für ThreeRenderView ergänzen, in der Machart der vier vorhandenen: wofür es da ist, welche Eigenschaften es liest, mit welchen anderen es zusammenspielt.

**DX-014 · info · packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md:5** — Ein leerer Markdown-Link in der Doku des Canvas-Pakets

[CanvasBitmapRenderer]() ist ein Link ohne Ziel; drei Zeilen tiefer steht mit #canvasbitmaprenderer die Sprungmarke, die er tragen müsste. Vorbestehend seit dem Stand vor diesem Remediation-Lauf.

Empfehlung: Das Ziel eintragen.

Die Sprungmarke `#canvasbitmaprenderer` gehört zur Überschrift auf Zeile 48, nicht drei Zeilen tiefer — die Angabe des Audits ist ungenau, das Ziel ist trotzdem eindeutig, und die Empfehlung wird befolgt.

### [x] 15. E2E-Suite: Fixture, Übersicht, Bezeichner
- Findings: DX-006 (info), DX-007 (info), TEST-010 (info), TEST-013 (info)
- Ziel: Kein Fixture führt eine abgekündigte Form vor, die Übersicht nennt alle Strecken, und Bezeichner wie Verweise sagen, was heute gilt.
- Bereich: `packages/shadow-objects-e2e/{public/*.js,README.md,src/sync-failure.js,tests/sync-failure.spec.ts,TEST-PLAN.md}`, `CHANGELOG.md` (Wurzel)
- Hängt ab von: —
- Hash: 9313251
- Modell: mittlere Stufe
- Effort: medium
- Anmerkung (aus Paket 9, Zug 0): Zwei Dateien dieses Pakets sind mit Paket 9 angefasst worden, weil dessen eigene Umbenennung sie umwarf: `TEST-PLAN.md:275` (Zeile `BUNDLE-3`) und `src/bundle-tests.js:14` nennen die Ladeanzeige des Bundles jetzt `globalThis.SHADOW_OBJECTS_BUNDLE_LOADED`. Keine der Stellen, die DX-007 oder TEST-013 meinen; die Zeilennummern der übrigen Tabelle bewegen sich nicht.
- Anmerkung (aus Paket 13, Zug 0 — ein Nebenbefund kommt hinzu): `TEST-PLAN.md:17` nennt unter »Companion documents« die Datei `Backlog.md` (Wurzel) als Trägerin der Coverage-Heuristik über alle Testschichten. Diese Datei gibt es nicht: `bfcc54b` — der Stand vor dem ersten Commit dieses Laufs — hat sie entfernt (»chore: remove outdated backlog«), und `git ls-tree bfcc54b --name-only | grep -i backlog` meldet nichts. Vorbestehend, nachgesehen und nicht vermutet: `git show bfcc54b:packages/shadow-objects-e2e/TEST-PLAN.md | sed -n '17p'` trägt denselben Satz. Der Eintrag kommt in dieses Paket, weil er dieselbe Ursache hat wie TEST-013 in derselben Datei — ein Verweis, der ins Leere zeigt — und dieses Paket sie ohnehin öffnet; sein Ziel nennt Verweise, die sagen, was heute gilt. Zwei Ausgänge sind vertretbar und der Abgleich in Zug 0 entscheidet: den Satz streichen, oder die Heuristik benennen, wo sie heute steht. Der Eintrag steht zusätzlich unter »Offene Befunde« und wird von dort abgeräumt, sobald dieses Paket committet ist.
- Anmerkung (Abgleich, 2026-08-26): Alle vier Findings stehen im Baum, zwei davon verschoben. **DX-006** unverändert auf `public/mod-hello.js:6` (`xyz((val) => {…})`). **DX-007** unverändert auf `README.md:5`. **TEST-010** ist von `:141` auf `src/sync-failure.js:156` gewandert; der Bezeichner `sync-failure-detail-carries-the-lost-change-trail` steht unverändert dort, und die Zusage, gegen die er läuft, steht zwölf Zeilen darunter: `sync-failure-refused-entry-is-sent-again` (`:178`) hält gerade fest, dass der abgelehnte Eintrag erneut gesendet wird. **TEST-013** ist von `TEST-PLAN.md:85` auf `:83` gewandert und stimmt inhaltlich weiterhin nicht: `#setParent` liegt auf `ShaeEntElement.ts:822`, nicht auf `:527-536`.
- Anmerkung (die abgekündigte Form steht fünfmal da, nicht einmal): Der Abgleich hat alle acht Fixtures unter `public/` gelesen. Die Reader-Callback-Form, die DX-006 an einer Stelle meldet, steht an fünf: `mod-hello.js:6`, `mod-multi-env.js:27`, `mod-async-events.js:8`, `mod-dynamic-dom.js:23` und `:28`. Alle fünf sind vorbestehend und stehen bei `bfcc54b` auf denselben Zeilen. Sie kommen in dieses Paket und nicht in »Offene Befunde«: gleiche Ursache, gleiches Verzeichnis, gleicher Commit. Der Grund ist nicht Ordnungssinn — signalize meldet die Abkündigung einmal je Name und Realm (`warnDeprecatedOnce('signalReader(callback)', …)`), also einmal je Worker. Vier von fünf Stellen zu lassen hieße, den Schaden, den DX-006 beschreibt — die Warnung in der Konsole der Strecken —, auf vier Seiten stehen zu lassen und ihn auf einer zu beheben.
- Anmerkung (Abweichung von der Empfehlung des Audits, und warum sie klein ist): DX-006 empfiehlt `createEffect()`; signalize selbst nennt in seiner Abkündigung `Signal.onChange(callback)`. Der Weg des Audits gilt, denn `useProperty()` gibt einen `SignalReader` heraus und kein `Signal` — die `onChange`-Methode ist von einem Shadow Object aus gar nicht erreichbar, `createEffect` dagegen steht in `ShadowObjectCreationAPI` und wird von der Creation Scope beim Abbau selbst zerstört (`ShadowObjectCreationScope.createEffect` legt `effect.destroy` in `#unsubscribeSecondary`). Genau das ist der Gewinn, den die Abkündigung meint.
- Anmerkung (die Abhängigkeitsliste ist nicht optional): `signalReader(callback)` baut intern `createEffect(cb, [signalReader])` — mit **ausdrücklicher** Abhängigkeitsliste, und damit ohne automatisches Mitverfolgen der Signale, die der Rumpf sonst noch liest. Ein `createEffect(cb)` ohne zweites Argument verfolgt jeden Lesezugriff im Rumpf. In `mod-multi-env.js` liest der Rumpf `envName()` mit; ohne die Liste liefe `probeValueChanged` künftig auch bei einer Änderung von `envName` los, und die Seite prüft ausdrücklich die Reihenfolge dieser Ereignisse. Jede der fünf Umstellungen trägt deshalb ihre Liste. Verhaltensgleich ist die Form im Übrigen auch beim Start: `createEffect` läuft sofort, so wie es die Reader-Callback-Form tut (`docs/cheat-sheet.md:128`).
- Anmerkung (kein zusätzlicher Log-Eintrag beim Abbau): Die Umstellung hängt die Effekte an den Abbau der Creation Scope. Deren Reihenfolge ist `onDestroy`-Rückrufe (primär) → `effect.destroy()` (sekundär) → `destroySignal` auf den Property-Readern (`ShadowObjectCreationScope`, Zeilen 259–280). Ein zerstörter Effekt läuft nicht noch einmal, und auf diesem Weg wird kein `undefined` in ein Property-Signal geschrieben. Der `destroyed`-Eintrag in `mod-dynamic-dom.js` steht damit weiterhin als letzter im Log, so wie er es heute tut.
- Anmerkung (vierzehn Zeilenverweise im Testplan stimmen nicht, nicht einer): Der Abgleich hat jeden `datei:zeile`-Verweis in `TEST-PLAN.md` nachgeschlagen — neunzehn Stück. Vierzehn stimmen nicht mehr; die Tabelle in Schritt 4 führt sie einzeln mit dem, was heute an der Stelle steht. Sie tragen dieselbe Ursache wie TEST-013 und kommen aus demselben Grund in dieses Paket wie die vier Fixture-Stellen oben. Die fünf, die heute stimmen, werden mitgenommen: eine Regel mit fünf Ausnahmen ist keine Regel, und erst wenn die Datei keine Zeilennummer mehr trägt, kann sie an keiner Stelle mehr veralten. Alle neunzehn sind vorbestehend, `git show bfcc54b:packages/shadow-objects-e2e/TEST-PLAN.md` trägt sie auf denselben Zeilen.
- Anmerkung (Zuständigkeit des Changelogs): Der Eintrag geht in die Wurzel-`CHANGELOG.md` und in keine andere. `packages/shadow-objects-e2e` ist `private` und führt kein eigenes Changelog (`CLAUDE.md`, Abschnitt »Changelogs and Backlog«); von der Laufzeit-API, dem Verhalten und der Form von `dist/` und `.npm-pkg/` der beiden veröffentlichten Pakete bewegt sich keine Zeile. Die Präzedenz steht im selben Changelog: der Abschnitt vom 2026-08-26 zu WebKit führt `packages/shadow-objects-e2e/TEST-PLAN.md` und `README.md` als eigene Bullets. Keine der vier `distContract`-Erwartungsdateien wird angefasst.
- Anmerkung (was nicht in dieses Paket kommt): Die übrigen Einträge unter »Offene Befunde« bleiben liegen, auch `CLAUDE.md:87`/`:108` — die zweite Hälfte desselben verschwundenen `Backlog.md`. Ihre Ursache ist eine andere: hier zeigt ein Verweis ins Leere, dort steht eine Arbeitsanweisung, und wer sie aufnimmt, entscheidet zugleich, was an die Stelle des Backlogs tritt. Das ist die Drain-Runde des Abschlusses und nicht dieses Paket. `KNOWN-DEFECTS.md` wird nicht angefasst: die Datei trägt keinen der beiden Bezeichner und keinen Zeilenverweis.
- Dateien: `packages/shadow-objects-e2e/public/mod-hello.js` · `packages/shadow-objects-e2e/public/mod-multi-env.js` · `packages/shadow-objects-e2e/public/mod-async-events.js` · `packages/shadow-objects-e2e/public/mod-dynamic-dom.js` · `packages/shadow-objects-e2e/src/sync-failure.js` · `packages/shadow-objects-e2e/tests/sync-failure.spec.ts` · `packages/shadow-objects-e2e/README.md` · `packages/shadow-objects-e2e/TEST-PLAN.md` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler. Die fünf Fixture-Umstellungen sind gemessen verhaltensgleich (siehe die beiden Anmerkungen zur Abhängigkeitsliste und zum Abbau), der Rest ist ein Bezeichner und Prosa. Der Nachweis, dass das Verhalten steht, ist die E2E-Suite selbst: sie fährt genau diese fünf Fixtures und muss unbewegt bei 645 Fällen grün bleiben. Dazu die sechs Zählproben aus Schritt 8.
- Vorgehen:
  1. **`public/mod-hello.js`** — `createEffect` in die Parameterliste von `foo` aufnehmen und die Zeilen 6–9 ersetzen. Danach lautet der Rumpf zwischen der `console.log`-Zeile und dem abschließenden `dispatchMessageToView('helloFromFoo', …)`:

     ```js
       createEffect(() => {
         const val = xyz();
         console.log('foo.xyz changed to', val);
         dispatchMessageToView('fooEcho', val);
       }, [xyz]);
     ```

     Die Parameterzeile wird zu `function foo({useProperty, createEffect, dispatchMessageToView}) {`.
  2. **`public/mod-multi-env.js`** — `createEffect` in die Parameterliste von `probe` aufnehmen (`function probe({entity, useProperty, createEffect, dispatchMessageToView, onViewEvent}) {`) und die Zeilen 25–29 ersetzen:

     ```js
       // Note: an effect runs once on creation, so the first `probeValueChanged` carries the initial
       // value. The page collects every event and asserts on the sequence.
       createEffect(() => {
         dispatchMessageToView('probeValueChanged', {envName: envName(), value: value()});
       }, [value]);
     ```

     Die Abhängigkeitsliste nennt `value` und nicht `envName`: der Rumpf liest beide, und nur die erste soll den Effekt auslösen.
  3. **`public/mod-async-events.js`** — `createEffect` in die Parameterliste von `counter` aufnehmen (`function counter({entity, useProperty, createEffect, dispatchMessageToView}) {`) und die Zeilen 8–11 ersetzen:

     ```js
       createEffect(() => {
         const value = n();
         updates += 1;
         dispatchMessageToView('counted', {uuid: entity.uuid, value, updates});
       }, [n]);
     ```
  4. **`public/mod-dynamic-dom.js`** — `createEffect` in die Parameterliste von `trackedEntity` aufnehmen (`function trackedEntity({entity, useProperty, createEffect, onDestroy}) {`) und die Zeilen 23–31 durch **zwei** Effekte ersetzen, je einer pro Signal; sie in einen zusammenzuziehen änderte die Zahl und die Reihenfolge der Log-Einträge:

     ```js
       createEffect(() => {
         const value = label();
         record.label = value;
         log.push({event: 'label', uuid: entity.uuid, label: value});
       }, [label]);

       createEffect(() => {
         const value = extra();
         record.extra = value;
         log.push({event: 'extra', uuid: entity.uuid, extra: value});
       }, [extra]);
     ```
  5. **Der Bezeichner des Testfalls.** `sync-failure-detail-carries-the-lost-change-trail` wird an allen vier Stellen zu `sync-failure-detail-carries-the-refused-change-trail`. »refused« ist das Wort, das diese Seite ohnehin führt (`ChangeTrailRefusedError`, `sync-failure-refused-entry-is-sent-again`), und es sagt, was gilt: der Trail ist abgelehnt, nicht verloren — er geht mit dem nächsten Zyklus erneut hinaus.
     - `src/sync-failure.js:156` — das Argument von `testBooleanAction`.
     - `tests/sync-failure.spec.ts:14` — der registrierte Bezeichner.
     - `TEST-PLAN.md:290` (Zeile `SYNC-2`) — der Bezeichner **und** die Prosa dahinter: »The event carries the trail that was lost« wird zu »The event carries the trail the kernel refused«. Der Rest der Zeile bleibt Wort für Wort stehen.
     - `README.md:26` — in der Tabellenzeile `sync-failure` wird »the lost trail« zu »the refused trail«.

     Der Kommentar auf `src/sync-failure.js:157` (»whoever holds the trail knows what went missing«) bleibt unangetastet: er sagt, wozu das Ereignis da ist, und die Einträge, die der Kernel nicht angewandt hat, fehlen tatsächlich. Die Zusage, die TEST-010 meint, steht im Bezeichner und nur dort.
  6. **`README.md:5`** — der Einleitungssatz nennt die beiden Fehlerpfad-Strecken. Die Zeile lautet danach:

     ```
     This package is not published to npm. It runs full browser tests against a Vite-served app, covering scenarios that require a real page load -- remote worker environments, bundle integrity, multi-entity interactions, and the two error paths: a worker that dies mid-run and a change trail the worker's kernel refuses.
     ```

     Die Formulierung der beiden Pfade ist die der Tabelle sechzehn Zeilen tiefer, und das doppelte `--` bleibt, wie es ist.
  7. **`TEST-PLAN.md`** — zwei Eingriffe, beide in derselben Datei.

     a) Die Zeilen 17–18 verlieren das Begleitdokument, das es nicht gibt, und behalten die Aussage über den Zuschnitt dieser Datei. Aus den beiden Zeilen wird eine:

     ```
     Scope: E2E only. This file names the pages, fixtures and assertions of the Playwright suite.
     ```

     Der Verweis wird nicht umgehängt, sondern gestrichen: die Coverage-Heuristik über alle Testschichten ist mit `Backlog.md` verschwunden und steht heute in keiner Datei dieses Repositories (`grep -rni "heuristic"` findet außer dieser einen Zeile nichts). Ein Zeiger auf eine Heuristik, die es nicht mehr gibt, ist derselbe Fehler wie der Zeiger auf die Datei.

     b) **Kein `datei:zeile`-Verweis bleibt stehen.** Neunzehn Stellen, in Dokumentreihenfolge; die Ersetzung nennt das Symbol statt der Zeile. Wo das Symbol im Satz schon steht, entfällt die Klammer ersatzlos:

     | Zeile | Steht da | Wird zu | Warum |
     |---|---|---|---|
     | 56 | ``**`src/remote-worker-env.js:36-37`**`` | ``**`src/remote-worker-env.js`**`` | Der Satz nennt `ViewComponent` `bar` und `plah` bereits. |
     | 76 | ``(`ShaeEntElement.ts:371-405`)`` | ``(`ShaeEntElement.ts`)`` | `#createParentObserver` liegt auf `:587`, `onParentChanged` auf `:608`; beide Namen stehen im Satz. |
     | 77 | ``(`ShaePropElement.ts:381`)`` | — Klammer streichen | ``ShaePropElement.#disconnectFromEntNode`` steht im Satz und liegt auf `:525`. |
     | 83 | ``(`ShaeEntElement.ts:527-536`)`` | — Klammer streichen | `#setParent` liegt auf `:822`. Der Satz nennt die Methode. |
     | 90 | ``(`ShaeWorkerElement.ts:204` refuses the return in `connectedCallback`)`` | ``(`ShaeWorkerElement.connectedCallback` refuses the return)`` | Die Absage steht auf `:257`, im `hibernate`-Rumpf von `connectedCallback` (`:246`). |
     | 105 | `` from `ShaePropElement.ts:305` `` | `` from `ShaePropElement.#findEntNode` `` | Der Aufruf steht auf `:449`, in `#findEntNode`. |
     | 106 | ``(`ShaeEntElement.ts:582-598`)`` | — Klammer streichen | `#onRequestParent` steht im Satz und liegt auf `:1005`. |
     | 108 | ``the property asks again (`ShaePropElement.ts:372`)`` | ``the property asks again (`ShaePropElement.#onReRequestHost`)`` | Der Rückruf liegt auf `:498`. |
     | 133 | ``(`ShaeWorkerElement.ts:97-107`)`` | ``(`ShaeWorkerElement.#importScript`)`` | Der Effekt entsteht auf `:178` und wird aus `attributeChangedCallback` erneut gefahren (`:305`). |
     | 156 | ``(`ShaeEntElement.ts:594`, `:573`)`` | — Klammer streichen | `#onRequestParent` und `#onReRequestParent` stehen im Satz; beide Zeilen zeigen heute auf anderen Code. |
     | 157 | ``(`ShaeEntElement.ts:531`)`` | — Klammer streichen | `#setParent` steht im Satz; `:531` trägt heute einen Kommentar. |
     | 163 | ``(`ShaeEntElement.ts:140-142`)`` | ``(`ShaeEntElement.syncShadowObjectsOf`, aus dem `ns$.onChange`-Rumpf in `#subscribe`)`` | Der Aufruf liegt auf `:279`; `:140-142` trägt heute zwei Signaldeklarationen. |
     | 170 | ``(`ShaeElement.ts:13-26`)`` | ``(`syncShadowObjects` in `ShaeElement.ts`)`` | `SyncNamespaces` und `nextSyncIsScheduled` stehen im Satz; der Block liegt auf `:15-30`. |
     | 174 | ``(`ShadowEnv.ts:94-102`)`` | ``(the `view` setter in `ShadowEnv.ts`)`` | Die Warnung steht auf `:146`; `:94-102` trägt heute einen Kommentar über `hibernate`. |
     | 301 | ``(`runPageTests.ts:107-109`)`` | ``(`tests/runPageTests.ts`)`` | Stimmt heute. Der Satz nennt `data-testoutput`. |
     | 302 | ``(`runPageTests.ts:62-81`)`` | ``(`tests/runPageTests.ts`, `loadPage`)`` | Stimmt heute. `loadPage` beginnt auf `:47`. |
     | 303 | ``(`src/test-helpers/testAsyncAction.js:5`)`` | ``(`src/test-helpers/testAsyncAction.js`)`` | Stimmt heute. Der Satz nennt `testAsyncAction`. |
     | 304 | ``(`runPageTests.ts:113-118`)`` | ``(`tests/runPageTests.ts`)`` | Stimmt heute. Der Satz nennt den Testnamen `no uncaught or logged errors`. |
     | 306 | ``(`tests/shae-worker.spec.ts:9`, `:13`)`` | ``(`tests/shae-worker.spec.ts`: `worker0-env-contextCreated`, `worker1-env-contextCreated`)`` | Falsch um eine Zeile: `:9` und `:13` tragen `worker0-timeouts-from-attributes` und `worker1-is-local-env`. |

     Außer der Klammer beziehungsweise dem Verweis ändert sich an keiner dieser Zeilen ein Wort. Der Bindestrich, das Komma und der Satzbau drumherum bleiben stehen; wo eine Klammer ersatzlos entfällt, entfällt auch das Leerzeichen davor.
  8. **Wurzel-`CHANGELOG.md`** — ein neuer datierter Abschnitt ganz oben, unmittelbar unter dem einleitenden Absatz und über `## 2026-08-26 — the agent guide follows its own binding-terms table`:

     ```markdown
     ## 2026-08-26 — the e2e fixtures and the test plan say what holds today
     ```

     Darunter vier Bullets, je einer pro Sache, in der Machart der Abschnitte darunter (fetter Dateipfad, dann der Satz), und **auf Englisch** wie der Rest der Datei — die Sätze hier sagen, was hineingehört, nicht in welcher Sprache:
     - die vier Fixture-Module unter `packages/shadow-objects-e2e/public/` nehmen an fünf Stellen ihre Property-Reaktionen über `createEffect(callback, [reader])` entgegen; die Callback-Form des Signal-Readers ist in signalize abgekündigt, ein Effekt wird mit dem Shadow Object abgebaut, und die ausdrückliche Abhängigkeitsliste hält den Auslöser bei genau dem Signal, das ihn vorher hatte.
     - `packages/shadow-objects-e2e/src/sync-failure.js`, `tests/sync-failure.spec.ts`, `TEST-PLAN.md`, `README.md`: der Testfall heißt `sync-failure-detail-carries-the-refused-change-trail`, weil der Trail abgelehnt und mit dem nächsten Zyklus erneut gesendet wird.
     - `packages/shadow-objects-e2e/README.md`: der Einleitungssatz nennt die beiden Fehlerpfad-Strecken.
     - `packages/shadow-objects-e2e/TEST-PLAN.md`: die Datei verweist auf Symbolnamen statt auf Zeilennummern, und der Absatz über die Begleitdokumente nennt nur noch den Zuschnitt dieser Datei.

     Die Konventionen im Kopf dieses Plans gelten hier wörtlich: keine Finding-ID, kein Rückblick auf den Vorzustand über das hinaus, was ein Changelog-Eintrag von Natur aus sagt.
  9. **Zählproben.** Alle sechs aus der Wurzel des Repositories, jede mit ihrer erwarteten Ausgabe. `E=packages/shadow-objects-e2e` kürzt die Pfade ab; die Suchpfade sind ausgeschrieben, damit kein `-r` in `node_modules/`, `dist/`, `playwright-report/` oder `test-results/` läuft.
     1. `grep -rnE '^[[:space:]]*(xyz|value|n|label|extra)\(\(' $E/public/` → kein Treffer (vorher fünf).
     2. `grep -c createEffect $E/public/mod-hello.js $E/public/mod-multi-env.js $E/public/mod-async-events.js $E/public/mod-dynamic-dom.js` → `2`, `2`, `2`, `3` (je einmal in der Parameterliste, dann je Umstellung einmal).
     3. `grep -cE '\.(ts|js|mjs|md):[0-9]+' $E/TEST-PLAN.md` → `0` (vorher `19`), und `grep -cE '[^A-Za-z0-9]:[0-9]+' $E/TEST-PLAN.md` → `0` (vorher `2`; das sind die beiden nachgestellten Verweise auf Zeile 156 und 306).
     4. `grep -rn 'lost-change-trail' $E/src $E/tests $E/public $E/README.md $E/TEST-PLAN.md $E/KNOWN-DEFECTS.md` → kein Treffer, ebenso `grep -n 'the lost trail' $E/README.md`; `grep -rln sync-failure-detail-carries-the-refused-change-trail $E/src $E/tests $E/TEST-PLAN.md` → genau drei Dateien.
     5. `grep -rn Backlog $E/src $E/tests $E/public $E/README.md $E/TEST-PLAN.md $E/KNOWN-DEFECTS.md` → kein Treffer.
     6. `sed -n '5p' $E/README.md` → der Satz nennt sowohl den sterbenden Worker als auch den abgelehnten Change Trail.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
  Erwartet: 802 / 379 / 123 / 645 Tests wie in der Baseline, `pnpm lint` »Checked 219 files … No fixes applied«, Coverage 92,89 % (3385/3644) unverändert — dieses Paket bewegt keine Zeile unter `packages/shadow-objects/src/`. Die E2E-Suite ist der eigentliche Nachweis und darf nicht aus dem Turbo-Cache kommen: `public/**`, `src/**` und `tests/**` stehen in `tasks.test.inputs`, die Änderung invalidiert den Schlüssel also von selbst. `README.md` und `TEST-PLAN.md` stehen in keinem `inputs` und wirken auf keinen Lauf.
- Commit: `test(e2e): the fixtures use effects, and the suite's docs name symbols instead of lines`
- Ergebnis: 1 Runde · DX-006, DX-007, TEST-010 und TEST-013 behoben · kein Regressionstest (kein Korrektheitsfehler; der Nachweis ist die unbewegte E2E-Suite mit 645 Fällen und die sechs Zählproben, alle wie erwartet) · dreiundzwanzig Stellen statt der vier gemeldeten: fünf Reader-Callback-Umstellungen in vier Fixtures, ein Bezeichner an vier Stellen, neunzehn Zeilenverweise in `TEST-PLAN.md`, der Einleitungssatz der README, der Verweis auf das verschwundene Begleitdokument · Reviewer hat alle neunzehn Symbolverweise gegen den Quelltext aufgeschlagen und die vier betroffenen Strecken selbst gefahren (107/107 Chromium) · klein: vier Absätze in `TEST-PLAN.md` (`:107`, `:162`, `:169`, `:172-173`) sprengen den Umbruch bei 100 Spalten, den die Datei sonst hält · klein: `TEST-PLAN.md:172-173` sagt »ShadowEnv's view setter« und in der Klammer noch einmal dasselbe · klein: `TEST-PLAN.md:162` schreibt `syncShadowObjectsOf` dem `ShaeEntElement` zu, deklariert ist die Methode auf `ShaeElement.ts:294`; der Zusatz »from the `ns$.onChange` body in `#subscribe`« trägt den Verweis trotzdem · klein: der Kommentar auf `src/sync-failure.js:157` sagt mit »what went missing« sinngemäß, was der umbenannte Bezeichner gerade abgelegt hat — bewusst stehengelassen, siehe Schritt 5
- Nebenbefunde: keine — der Implementierer hat alle neun Dateien ganz gelesen und nichts gemeldet, was auch ohne dieses Paket falsch gewesen wäre; der Reviewer hat in den Nachbardokumenten, den übrigen vier Fixtures und der Kern-Doku nachgesucht und ebenfalls nichts gefunden
- Folgen: keine — kein Aufrufer, Typ oder Test außerhalb des Bereichs hing an einem der geänderten Bezeichner
- Schnittstellen: keine — `packages/shadow-objects-e2e` ist `private`, es bewegt sich keine Zeile unter `packages/shadow-objects/src/` oder `packages/shae-offscreen-canvas/src/`, und keine der vier `distContract`-Erwartungsdateien ist angefasst. Wer die Suite liest: der Testfall heißt `sync-failure-detail-carries-the-refused-change-trail`, und `TEST-PLAN.md` verweist auf Symbolnamen statt auf Zeilennummern

**DX-006 · info · packages/shadow-objects-e2e/public/mod-hello.js:6** — Ein E2E-Fixture führt die abgekündigte Reader-Callback-Form vor

Das Modul ruft den Signal-Reader mit einem Callback; signalize protokolliert dafür im Worker eine Deprecation-Warnung. Sie läuft bei jedem Aufbau der Seiten mit, die dieses Modul laden, und steht damit in der Konsole jeder Strecke, die Konsolenausgaben prüft.

Empfehlung: Auf createEffect() umstellen. Die Form ist abgekündigt, und ein Fixture, das sie vorführt, ist eine Vorlage für jeden, der die Seiten liest.

**DX-007 · info · packages/shadow-objects-e2e/README.md:5** — Die E2E-README nennt die Seiten für die Fehlerpfade nicht

Der Einleitungssatz zählt auf, was die Suite abdeckt — Worker-Umgebungen, Bundle-Integrität, das Zusammenspiel mehrerer Entities — und lässt die beiden Seiten aus, die die Fehlerpfade fahren. Wer nach einer Strecke für einen fehlgeschlagenen Zyklus sucht, findet sie über die Übersicht nicht.

Empfehlung: Die beiden Fehlerpfad-Seiten in den Einleitungssatz aufnehmen. Zwei Wörter, und die Übersicht deckt wieder ab, was die Suite tut.

**TEST-010 · info · packages/shadow-objects-e2e/src/sync-failure.js:141** — Ein Testbezeichner nennt einen Trail verloren, der es nicht mehr ist

Der Bezeichner `sync-failure-detail-carries-the-lost-change-trail` stammt aus der Zeit, in der ein abgelehnter Change Trail nicht wieder gesendet wurde. Er ist als stabile ID absichtlich stehengeblieben, während die Prosa des Testplans mitgezogen ist — wer nach dem Namen sucht, findet eine Zusage, die es nicht mehr gibt.

Empfehlung: Beim nächsten Anlass, der die Datei ohnehin anfasst, umbenennen und den Testplan mitziehen.

**TEST-013 · info · packages/shadow-objects-e2e/TEST-PLAN.md:85** — Der Testplan verweist auf eine Zeilennummer, an der die Methode nicht liegt

Der Verweis auf ShaeEntElement.#setParent nennt ShaeEntElement.ts:527-536; die Methode liegt auf :810-855. Die Angabe war schon vor diesem Remediation-Lauf falsch. Ein Verweis auf eine Zeilennummer veraltet mit dem ersten Umbau darüber, ohne dass irgendetwas davon rot wird.

Empfehlung: Auf den Namen der Methode verweisen statt auf ihre Zeile. Wo eine Stelle genau benannt werden muss, trägt der Symbolname sie zuverlässiger als die Zeile.

### [x] 16. Kommentare in Testhilfen und Specs
- Findings: TEST-008 (info), DX-012 (info — gegenstandslos, siehe Abgleich)
- Ziel: Die vier tragenden Mikrotask-Wartezeilen der Scope-Spec und die zwei Provider-Hilfsobjekte ihrer Deprecation-Fälle sagen, worauf sie sich stützen; die drei Wartezeilen, die nichts tragen, verschwinden.
- Bereich: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`, `CHANGELOG.md` (Wurzel)
- Hängt ab von: —
- Hash: 4b083db
- Modell: mittlere Stufe
- Effort: low
- Anmerkung (Abgleich, 2026-08-26 — **DX-012 ist gegenstandslos**): Die Fundstelle `packages/shadow-objects-testing/src/mount.js:5-12` trägt keinen der beiden gemeldeten Sachverhalte mehr. Der Kommentar dort sagt heute, dass `mount()` den Markup-Pfad bedient und dass `document.createElement` ein ebenso lebendiges Element baut, dessen Fälle in `test/create-element.test.js` stehen; er behauptet weder einen abgebrochenen Upgrade noch ein `HTMLUnknownElement`, und der Verweis auf `packages/shadow-objects-e2e/KNOWN-DEFECTS.md` steht nicht mehr darin (`grep -rn KNOWN-DEFECTS packages/shadow-objects-testing/` → kein Treffer). Behoben hat das der Commit `7506b58` »fix(elements)!: the custom elements survive document.createElement()« vom 2026-08-23 — genau der Weg, den die Empfehlung des Findings nennt: fällt die Stilzuweisung im Konstruktor weg, fällt der Fehler mit und der Kommentar ebenfalls. Nachgesehen und nicht vermutet: `git merge-base --is-ancestor 7506b58 bfcc54b` trifft zu, `7506b58` liegt also vor dem ersten Commit dieses Laufs, und `git show bfcc54b:packages/shadow-objects-testing/src/mount.js` trägt bereits den heutigen Text. Kein Paket dieses Laufs hat daran mitgewirkt. `mount.js` verlässt damit den Bereich, und `KNOWN-DEFECTS.md` wird nicht angefasst: die Datei ist in sich stimmig (»Currently there is none« plus der Mechanismus für den nächsten Fall) und wird von `README.md:11`, `TEST-PLAN.md:8,14` und `tests/runPageTests.ts:18` sinnvoll geführt.
- Anmerkung (**für den Abschluss**): DX-012 wird im Audit als vor Lauf-Beginn erledigt gebucht, nicht als von diesem Lauf behoben — wie DX-003 unter »Bereits erledigt, kein Paket«. Der Unterschied zählt: ein Finding, das dieser Lauf gar nicht angefasst hat, gehört nicht in seine Bilanz.
- Anmerkung (Abgleich, 2026-08-26 — **TEST-008 steht, verschoben**): Beide Konstruktionen liegen im Baum. Die zwei Provider-Hilfsobjekte reichen den Signal-Reader als zweites Argument durch, auf `:192` (`bareCompareReadContext`) und `:241` (`bareCompareParentContext`); gemeldet waren `:150` und `:199`. Die vier Mikrotask-Wartezeilen stehen auf `:216`, `:220`, `:265` und `:269`; gemeldet waren `:174`, `:178`, `:223` und `:227`. Der Versatz beträgt für alle sechs Stellen exakt +42 und stammt fast ganz aus der Zeit vor diesem Lauf — bei `bfcc54b` lagen die Provider bereits auf `:191` und `:240`, dieser Lauf hat nur eine einzige Zeile hinzugefügt (`c93a26e`, Zeilenende am Dateiende, Paket 1; `40d550b` aus Paket 4 hat Nicht-Null-Zusicherungen gesetzt, ohne die Zeilenzahl zu bewegen).
- Anmerkung (die Begründung des Findings ist überholt, sein Befund nicht): TEST-008 schreibt, ein Argument weiter rechts kippe »die Modulflagge der Deprecation-Warnung« vorzeitig und »die fünf Fälle der Datei hängen daran«. Eine Modulflagge gibt es nicht: die Liste der bereits gemeldeten Namen gehört dem Kernel (`Kernel.ts:103` legt sie an, `:758` reicht sie an jede Creation Scope, `ShadowObjectCreationScope.ts:44` nimmt sie entgegen), und jeder der sechs Fälle unter `describe('the deprecated isEqual argument')` baut seinen eigenen Kernel — der Block trägt diese Zusage seit `bfcc54b` als eigenen Kommentar auf `:35-37`. Der Schaden ist also ein Fall, nicht fünf. Gemessen an einer Kopie außerhalb des Arbeitsbaums (2026-08-26): schiebt man den Reader auf `:192` ein Argument nach rechts, meldet `provideContext` seine eigene Abkündigung mit, und der Fall fällt mit `expected "error" to be called 1 times, but got 2 times`. Die Konstruktion ist damit genau so empfindlich, wie das Finding sagt, und der Kommentar wird gegen das gemessene Verhalten geschrieben, nicht gegen den Wortlaut des Findings.
- Anmerkung (gemessen: welche Wartezeile trägt was): Dieselbe Kopie, jede Zeile einzeln entfernt und die Datei gefahren. `:216` fehlt → `expected undefined to be 'first'`; `:220` fehlt → `expected 'first' to be 'second'`; `:265` und `:269` verhalten sich im Parent-Fall gleich. Alle vier tragen also, und sie warten auf dasselbe: die Entity reicht den Schreibvorgang ihres Providers eine Mikrotask später an ihr eigenes Kontext-Signal weiter und von dort an die Leser der Entities darunter. Das steht so auch im Quelltext, `ShadowObjectCreationScope.ts:57-59`. Genau das sagt der Kommentar.
- Anmerkung (drei Wartezeilen kommen hinzu, und warum sie in dieses Paket gehören): In derselben Datei stehen drei weitere Zeilen derselben Form — `:301`, `:344`, `:384`, je in einem Fall unter `describe('provideContext')`. Gemessen an derselben Kopie: ohne sie bleibt die Datei bei 13 Fällen grün und die Kern-Suite bei 802. Sie tragen nichts, und sie können nichts tragen: gelesen wird dort das Provider-Signal, das die Scope selbst angelegt hat, nicht das Kontext-Signal einer Entity darunter. Sie sind vorbestehend — `git show bfcc54b:…` trägt sie auf `:300`, `:343`, `:383` — und kämen für sich genommen als Nebenbefund in die Queue. Sie kommen trotzdem in dieses Paket, weil dieses Paket sie umwirft: sobald vier von sieben gleich aussehenden Zeilen einen Kommentar tragen, der sagt, worauf sie warten, behauptet das Schweigen der übrigen drei einen Unterschied, den niemand aufgeschrieben hat. Der Schaden entsteht hier und wird hier geschlossen. Die drei `it`-Rückrufe verlieren mit der Wartezeile ihr `async`, weil sonst ein Leser nach dem `await` sucht, das es nicht mehr gibt; Biome 2.5.9 stört sich an keiner der beiden Formen (gemessen, `check` grün).
- Anmerkung (die Nebenbefunde bleiben liegen): Keiner der acht Einträge unter »Offene Befunde« teilt die Ursache dieses Pakets. Sie handeln von einem wirkungslosen Lint-Ausschluss, einem erfundenen Typnamen in der Doku, einem `as any`, einem Typnamen mit altem Projektnamen, einer überzähligen devDependency, einer veralteten Größenangabe, einem Schreibfehler in einem Diagramm und einer Arbeitsanweisung auf eine verschwundene Datei — hier dagegen steht eine Spec-Konstruktion, deren Bedingung nicht dabeisteht. Sie gehen an die Drain-Runde des Abschlusses, die sie alle nebeneinander sieht. Auch die offenen Folgen sind verteilt: jede `Folgen:`-Zeile der fünfzehn erledigten Pakete steht auf »keine« oder »—«, bis auf die aus Paket 5, die mit Paket 6 (`03a026d`) erledigt ist.
- Anmerkung (Restplan): Paket 16 ist das letzte. Es hängt von nichts ab, nichts hängt an ihm, und es bewegt keine Zeile unter `packages/shadow-objects/src/**` außerhalb dieser einen Spec. Keine Umsortierung, kein neuer Schnitt. Nach dem Commit steht der Abschluss an: die acht offenen Befunde, die Rückgabe von SEC-002 und den drei `→ Audit`-Einträgen ins Audit, DX-003 und DX-012 als vor Lauf-Beginn erledigt.
- Anmerkung (Zuständigkeit des Changelogs): Der Eintrag geht in die Wurzel-`CHANGELOG.md` und in keine andere. Von der Laufzeit-API, dem Verhalten und der Form von `dist/` bewegt sich keine Zeile — Spec-Dateien werden nicht gebaut, und `src/distContract.files.txt` führt keine einzige (`grep -c spec` → `0`). Damit greift das Paket-Changelog nicht, das für konsumentensichtbare Änderungen da ist. Die Präzedenz für Spec-Arbeit in der Wurzel-Datei steht in derselben Datei: `:258` und `:263` führen `packages/shadow-objects/src/elements/elementReachability.spec.ts`, `:455` `propValueConverters.spec.ts`, `:453` eine reine Testmechanik-Änderung. Ein neuer datierter Abschnitt oben, wie bei den Paketen davor — mehrere Abschnitte desselben Datums sind in dieser Datei der Normalfall.
- Dateien: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler. Es schreibt Kommentare und entfernt drei Zeilen, die gemessen nichts tun. Der Nachweis, dass das Verhalten steht, ist die unbewegte Suite: 13 Fälle in dieser Datei, 802 in der Kern-Suite, beide gemessen gegen den fertigen Zielstand (siehe Verify).
- Vorgehen:
  1. **Die beiden Provider-Hilfsobjekte.** Über jede der beiden Zeilen kommt derselbe dreizeilige Kommentar, eingerückt auf zehn Spalten wie der Aufruf darunter. Die Zeilen sind eindeutig, ihre Nummern nicht: die Anker sind `provideContext('bareCompareReadContext', sourceSignal.get);` und `provideContext('bareCompareParentContext', sourceSignal.get);`.

     ```ts
               // The reader stands in the second argument, the source slot. One place further right is
               // the options slot, where a bare function is the deprecated form itself -- this provider
               // would report as well, and the case counts on exactly one report.
     ```

     Zur Einrückung in den drei Codeblöcken dieses Vorgehens: dieses Dokument rückt jede Fence um
     fünf Spalten ein, und was danach noch steht, ist die Einrückung im Quelltext. Hier sind es
     zehn Spalten — genau die des `provideContext(`-Aufrufs darunter —, in Schritt 2 und 3 sechs.
  2. **Die vier tragenden Wartezeilen.** Ein Kommentar je Fall, nicht je Zeile: er deckt beide Wartezeilen des Falls ab, und viermal derselbe Text wäre Lärm. Er steht über der ersten der beiden, eingerückt auf sechs Spalten. Anker ist das Paar aus Wartezeile und darauffolgender Zusicherung, einmal mit `capturedContext`, einmal mit `capturedParentContext`:

     ```ts
           // A provider's write reaches the context signal of the entity below one microtask later, so
           // both reads here wait a turn: without the first wait the context is still `undefined`,
           // without the second it still holds 'first'.
     ```

     Der Text passt wörtlich auf beide Fälle: beide lesen erst `'first'` und nach `sourceSignal.set('second')` den zweiten Wert.
  3. **Die drei Wartezeilen ohne Wirkung entfernen.** Je eine Zeile `await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));`, erkennbar an der Zeile davor: sie folgt auf `kernel.createEntity(uuid, 'repeatedProvideContext');`, `kernel.createEntity(uuid, 'stickyClearOnDestroy');` beziehungsweise `kernel.createEntity(uuid, 'sharedNameProviders');` und die Leerzeile dahinter. Die Leerzeile bleibt stehen, die Zusicherung darunter rückt auf. An die Stelle der **ersten** der drei — und nur dort — tritt der Kommentar, der für den ganzen `describe('provideContext')`-Block sagt, warum hier nicht gewartet wird, eingerückt auf sechs Spalten:

     ```ts
           // The provider signal is the one this scope created, so its value is there without a turn
           // of the microtask queue. Only the hand-over to the entities below is deferred, and no
           // case in this block reads that far.
     ```
  4. **Die drei `it`-Rückrufe verlieren ihr `async`.** In den drei Zeilen unten wird `, async () => {` zu `, () => {`; sonst ändert sich an ihnen kein Zeichen.
     - `it('registers the clearOnDestroy write once per provider, however often it is asked for', async () => {`
     - `it('does not let a later call take back an earlier clearOnDestroy opt-out', async () => {`
     - `it('keys the clearOnDestroy registration by provider signal, not by name, so a provideContext and a provideGlobalContext of the same name each still clear', async () => {`
  5. **Wurzel-`CHANGELOG.md`** — ein neuer datierter Abschnitt ganz oben, unmittelbar unter dem einleitenden Absatz und über `## 2026-08-26 — the e2e fixtures and the test plan say what holds today`:

     ```markdown
     ## 2026-08-26 — the creation-scope spec carries its own conditions

     - **`packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`:** the two
       provider helpers of the deprecation cases name why the signal reader stands in the source
       argument and not in the options slot one place to its right, and the four microtask waits
       name what they wait for -- a provider's write reaches the context signal of the entity below
       one microtask later. Three further waits in the `provideContext` cases are gone: they stood
       before a read of the provider signal the scope created itself, which is there without a turn
       of the queue. The file keeps its 13 cases and the core suite its 802.
     ```

     Die Konventionen im Kopf dieses Plans gelten hier wörtlich: keine Finding-ID, und kein Rückblick auf den Vorzustand über das hinaus, was ein Changelog-Eintrag von Natur aus sagt. Englisch wie der Rest der Datei.
  6. **Zählproben.** Alle aus der Wurzel des Repositories; `F=packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts` kürzt den Pfad ab.
     1. `grep -c queueMicrotask $F` → `4` (vorher `7`).
     2. `grep -c 'async () => {' $F` → `2` (vorher `5`).
     3. `grep -c "^    it(\|^      it(" $F` → `13`, unverändert.
     4. `grep -c "provideContext('bareCompare" $F` → `2`, und beide Zeilen tragen `sourceSignal.get` weiterhin als **zweites** Argument.
     5. `grep -cE '^\s*//' $F` → `45` (vorher `30`): fünf Kommentare à drei Zeilen, je einer an den zwei Provider-Stellen, je einer in den zwei Deprecation-Fällen, einer im `provideContext`-Block. `wc -l < $F` → `517` (vorher `505`): fünfzehn Kommentarzeilen hinzu, drei Wartezeilen fort.
     6. `grep -rn 'TEST-008\|DX-012' $F CHANGELOG.md` → kein Treffer.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
  Erwartet: 802 / 379 / 123 / 645 Tests wie in der Baseline, `pnpm lint` »Checked 219 files … No fixes applied«. Der fertige Zielstand ist am 2026-08-26 an einer Kopie außerhalb des Arbeitsbaums vorgefahren worden — Kern-Suite `24 passed (24)` / `802 passed (802)`, `tsc -p tsconfig.json --noEmit` Exit 0, `biome check` auf die Datei grün. Die Coverage-Zahl (92,89 %, 3385/3644) darf sich um Bruchteile bewegen: Spec-Dateien zählen nicht mit, aber drei entfernte Wartezeilen warten auch keine verzögerten Quellcode-Pfade mehr ab. Sie ist keine Schranke — grün oder rot entscheidet, nicht die Nachkommastelle. `pnpm build` bewegt sich nicht: Spec-Dateien werden nicht gebaut, und keine der vier `distContract`-Erwartungsdateien wird angefasst.
- Commit: `test(kernel): the creation-scope spec says what its waits and argument slots are for`
- Ergebnis: 1 Runde · TEST-008 behoben — die zwei Provider-Hilfsobjekte der Deprecation-Fälle (`ShadowObjectCreationScope.spec.ts:192`, `:241`) und die vier tragenden Mikrotask-Wartezeilen (`:216`, `:220`, `:265`, `:269`) tragen ihre Bedingung als Kommentar; die drei Wartezeilen ohne Wirkung im `provideContext`-Block sind fort, ihre drei `it`-Rückrufe ohne `async`, ein Kommentar an der ersten Stelle sagt, warum dort nicht gewartet wird · DX-012 entfallen, vor Lauf-Beginn von `7506b58` miterledigt, `mount.js` unangetastet · Datei 517 Zeilen, 13 Fälle, alle sechs Zählproben getroffen · kein Regressionstest (kein Korrektheitsfehler; Nachweis ist die unbewegte Suite: 802 / 379 / 123 / 645, Coverage 92,89 %) · Reviewer ohne kritischen oder wichtigen Befund
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — es bewegt sich keine Signatur, kein Export und keine Zeile unter `dist/`; die Änderung liegt in einer Spec-Datei und im Wurzel-CHANGELOG

**TEST-008 · info · packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts:150, :199 sowie :174, :178, :223, :227** — Zwei Konstruktionen der Scope-Spec tragen ihre Bedingung nicht bei sich

Die beiden Hilfs-Shadow-Objects reichen den Signal-Reader als zweites Argument an provideContext() durch. Ein Argument weiter rechts wäre es die abgekündigte Options-Form, und die Modulflagge der Deprecation-Warnung kippte vorzeitig — die fünf Fälle der Datei hängen daran. Die vier Mikrotask-Wartezeilen kopieren ihre Vorlage in Kernel.spec.ts:208 wörtlich, aber ohne deren Kommentar, der sagt, worauf gewartet wird.

Empfehlung: Je ein halber Satz an beiden Stellen. Wer die Datei erweitert, sieht sonst zwei Konstruktionen, deren Grund nicht dasteht.

*Der Abgleich hat die Stellen auf `:192`, `:241`, `:216`, `:220`, `:265` und `:269` verschoben gefunden und die Begründung zur »Modulflagge« widerlegt; die Anmerkungen oben tragen das gemessene Verhalten, und der Detailplan ist dagegen geschrieben, nicht gegen diesen Wortlaut. Die Vorlage in `Kernel.spec.ts` liegt heute auf `:218-219`, nicht auf `:208`, und ihr Kommentar steht an vier von sechzig gleichlautenden Wartezeilen jener Datei (elf tragen überhaupt einen Kommentar darüber, meist zur Zusicherung statt zur Wartezeit). Als Vorbild taugt sie damit nicht — als Beleg dafür, dass die Zeile ohne Erklärung nicht selbsterklärend ist, schon. `Kernel.spec.ts` wird nicht angefasst und geht auch nicht als Nebenbefund in die Queue: die Zeile ist dort idiomatisch und durchgehend, und »sechzig Wartezeilen hätten gern einen Kommentar« ist ein Geschmacksurteil, kein Befund. Widerlegt ist damit die Prämisse des Findings, jene Datei liefere eine kommentierte Vorlage — nicht der Zustand jener Datei.*

**DX-012 · info · packages/shadow-objects-testing/src/mount.js:5-12** — Ein Kommentar in der Test-Hilfe beschreibt das Verhalten falsch, das er erklärt

Der Kommentar behauptet, document.createElement('shae-ent') breche das Upgrade ab und hinterlasse ein HTMLUnknownElement. Gemessen kommt das Element brauchbar zurück; was tatsächlich passiert, ist ein unbehandelter NotSupportedError an window, ausgelöst von der Stilzuweisung im Konstruktor der Elemente. Wer die Hilfsfunktion anfasst, arbeitet also gegen eine Beschreibung, die nicht stimmt. Dazu verweist der Kommentar auf packages/shadow-objects-e2e/KNOWN-DEFECTS.md — eine dauerhafte Datei, die die Laufnummern eines einzelnen Reviews führt und damit auf etwas zeigt, dessen Auflösung mit diesem Review verschwindet.

Empfehlung: Den Kommentar auf das umschreiben, was gemessen passiert, und den Verweis auf die Symbolstelle richten statt auf eine Laufnummernliste. Fällt die Stilzuweisung im Konstruktor weg, fällt der Fehler mit — und der Kommentar ebenfalls.

*Gegenstandslos, siehe die Anmerkung zum Abgleich oben. **Der Implementierer fasst `packages/shadow-objects-testing/src/mount.js` nicht an.** Der Text steht hier, weil ein Finding nicht spurlos verschwindet, nicht als Auftrag.*

### [x] 17. Konfiguration und Anleitung nennen nur, was es gibt
- Nebenbefund: `biome.json:23-25` (info), `packages/shae-offscreen-canvas/package.json:51` (low), `CLAUDE.md:88` und `:109` (low)
- Ziel: Keine Werkzeugkonfiguration und keine Arbeitsanweisung dieses Repositories nennt mehr eine Datei, eine Endung oder ein Dokument, das es nicht gibt.
- Bereich: `biome.json`, `packages/shae-offscreen-canvas/package.json`, `pnpm-lock.yaml`, `CLAUDE.md`, `CHANGELOG.md` (Wurzel)
- Hängt ab von: —
- Hash: 47da67b
- Modell: mittlere Stufe
- Effort: low
- Anmerkung: Drei Fundstellen, eine Ursache — eine Konfiguration beschreibt etwas, das im Arbeitsbaum nicht existiert. Der Katalogeintrag `esbuild-plugin-inline-worker` bleibt stehen, `packages/shadow-objects/package.json` referenziert ihn und benutzt den Plugin wirklich; nach dem Entfernen des Importeurs einmal `pnpm install`, damit die Lockfile mitzieht.
- Anmerkung (Abgleich, 2026-08-26 — **alle drei Sachverhalte stehen**, zwei um eine Zeile verschoben):
  - `biome.json`: Die drei Muster `"!**/*.glsl"`, `"!**/*.vert"`, `"!**/*.frag"` liegen heute auf 23–25 statt auf den gemeldeten 24–26; Paket 2 (`6309e46`) hat eine Zeile darüber gestrichen. Dass sie nichts ausschließen, ist gemessen und nicht vermutet: `pnpm exec biome check .` gegen den echten Arbeitsbaum, einmal mit und einmal ohne die drei Zeilen, über eine Konfigurationskopie außerhalb des Baums mit `vcs.enabled: false` — eine Konfiguration außerhalb des Repositories findet die Ignore-Datei nicht, und abgeschaltet gilt für beide Läufe derselbe, größere Suchraum. Beide Male 493 Dateien. Dazu die Historie: `git log --all --name-only --pretty=format: | grep -Ei '\.(glsl|vert|frag)$'` meldet über alle Zweige null Treffer.
  - `packages/shae-offscreen-canvas/package.json:51`: unverändert an derselben Zeile. `grep -rn esbuild packages/shae-offscreen-canvas` (ohne `node_modules`) liefert genau diesen einen Treffer — `build.mjs` kopiert `README.md` und `src/` nach `.npm-pkg` und ruft keinen Bundler, `vite.config.js` führt nur `server.allowedHosts`, `vitest.config.ts` kein Plugin.
  - `CLAUDE.md`: Überschrift heute auf 88, Absatz auf 109 statt auf den gemeldeten 87 und 108. `git grep -n -i Backlog` außerhalb der Changelogs, der `audit.html` und dieses Plans meldet genau diese beiden Zeilen; `packages/shadow-objects-e2e/TEST-PLAN.md:17` ist mit Paket 15 (`9313251`) weg, `packages/shadow-objects/src/view/ComponentContext.ts` und `packages/shadow-objects/CHANGELOG.md` mit Paket 13 (`71aaa8d`).
- Anmerkung (**der Nachbar bleibt stehen, und das ist gemessen**): Direkt unter den drei Shader-Mustern steht `"!**/*.svg"` — gleiche Gestalt, gleicher Verdacht, und trotzdem wirksam. Dieselbe Messvorrichtung, dieselbe Konfiguration, nur diese eine Zeile entfernt: 498 statt 493 Dateien, also genau die fünf `.svg`-Dateien des Repositories (`packages/shadow-objects-e2e/public/vite.svg`, `packages/shadow-objects/docs/architecture.svg`, die beiden `.drawio.svg` unter `packages/shadow-objects/src/view/`, `spearwolf.svg`). Biome 2.5.9 liest SVG und liest kein GLSL. Die Zeile wird nicht angefasst, und der Unterschied gehört in den Changelog-Eintrag: er ist der Grund, warum hier drei Muster fallen und das vierte bleibt.
- Anmerkung (**Entscheidung zu `CLAUDE.md`: an die Stelle des Backlogs tritt nichts**): Der Absatz wird ersatzlos gestrichen und die Überschrift verliert ihre zweite Hälfte. Der Grund ist der Anlass der Fundstelle selbst: `bfcc54b` heißt »chore: remove outdated backlog«, das Repository hat die Datei bewusst aufgegeben, und ein Nachfolgedokument zu erfinden hieße, dieselbe Pflegepflicht unter neuem Namen wieder aufzumachen — die Anweisung, die niemand befolgt, war der Befund. Was der gestrichene Satz nebenbei mittrug (»update sections that became stale«), betrifft in diesem Repository nur noch Dokumente, für die es schon eine Regel gibt: `AGENTS.md` steht unter »When unsure«, die Changelogs stehen im Abschnitt selbst. Der Abschnitt trägt danach genau das, was er hält: drei Changelogs und die Tabelle, die sagt, welcher wofür zuständig ist. Der Satz »Three changelogs live in this repo …« bleibt unberührt und deckt die verkürzte Überschrift ohne Umformulierung.
- Anmerkung (**Zuständigkeit des Changelogs**): Der Eintrag geht in die Wurzel-`CHANGELOG.md` und in keine andere. Lint-Konfiguration, devDependency und pnpm-Setup stehen in der Tabelle in `CLAUDE.md` ausdrücklich dort, und das Canvas-Paket führt seinen eigenen Changelog für Laufzeit-API, Verhalten und die Form von `.npm-pkg/` — von allen dreien bewegt sich keine Zeile: `packages/shae-offscreen-canvas/package.override.json` setzt `devDependencies: null`, der Abschnitt verlässt das veröffentlichte Manifest also ohnehin nie, und `src/distContract.package.json` führt den Schlüssel gar nicht erst. Keine der vier `distContract`-Erwartungsdateien wird angefasst. Die Präzedenz für `CLAUDE.md` in der Wurzel-Datei steht in ihr selbst (`CHANGELOG.md:173`).
- Anmerkung (**ein Nebenbefund kommt hinzu und bleibt liegen**): `pnpm-workspace.yaml:114-115` führt `minimumReleaseAgeExclude: ['@spearwolf/signalize@1.0.0-beta.0']`. Der Kommentar darüber sagt selbst, wann der Eintrag gehen kann — »once the release is a day old« —, und die Version ist am 2026-08-15 erschienen (`npm view @spearwolf/signalize time`), also elf Tage alt gegen eine Karenz von einem Tag. Der Eintrag ist abgelaufen. Er kommt **nicht** in dieses Paket: seine Ursache ist eine andere — hier nennt eine Konfiguration etwas, das es nicht gibt, dort steht eine Ausnahme, deren Anlass verfallen ist —, und ein Nebenbefund bekommt sein Paket von der Drain-Runde. Er steht unter »Offene Befunde«. Für den Implementierer folgt daraus eine Grenze und keine Aufgabe: bewegt `pnpm install` die Datei, wird sie zurückgesetzt (siehe Vorgehen, Schritt 3).
- Anmerkung (**Restplan**): Keine Umsortierung, kein neuer Schnitt. Offen bleibt allein Paket 18, es hängt an diesem hier, und die Abhängigkeit ist reine Reihenfolge — beide schreiben in die Wurzel-`CHANGELOG.md`, sonst berührt sich keine Datei. Dieses Paket bewegt keine Zeile unter `packages/*/src/**` und keine Signatur; die `Schnittstellen:`-Zeile wird leer bleiben.
- Anmerkung (**für den Abschluss**): Nach diesem Paket nennt keine Zeile dieses Repositories mehr `Backlog.md`, außer den Changelogs, die über den Zustand von damals berichten, und der `audit.html` selbst. Dort stehen drei offene Findings, die alle auf diese Datei zeigen und schon vor diesem Lauf gegenstandslos waren, weil `bfcc54b` sie entfernt hat: DX-013 (`Backlog.md`, dazu die Regel in `CLAUDE.md`, deren zweite Hälfte dieses Paket streicht), DX-021 (`Backlog.md:314`) und DX-022 (`Backlog.md:213`). Keines davon gehört zum Scope dieses Laufs — der Nutzer hat sie nicht gepickt —, und keines wird hier aufgenommen; der Abschluss entscheidet, wie sie im Audit gebucht werden.
- Dateien: `biome.json` · `packages/shae-offscreen-canvas/package.json` · `pnpm-lock.yaml` · `CLAUDE.md` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler, sondern eine Werkzeugkonfiguration, ein Manifest und eine Arbeitsanweisung. Den Nachweis führen die vier Zählproben in Schritt 5 und der Verify-Lauf.
- Vorgehen:
  1. **`biome.json`.** Unter `files.includes` die drei Zeilen `"!**/*.glsl",`, `"!**/*.vert",` und `"!**/*.frag",` streichen — heute 23, 24, 25, zusammenhängend. Das Komma gehört jeweils zur Zeile und geht mit. Die Nachbarn bleiben unverändert: `"!packages/shadow-objects-e2e/test-results",` davor, `"!**/*.svg",` danach. Das Muster `"!**/*.svg"` wird **nicht** mitgestrichen — es sieht genauso aus und wirkt, siehe die Anmerkung dazu. Sonst nichts an der Datei; kein anderer Eintrag der Liste, kein Block darunter.
  2. **`packages/shae-offscreen-canvas/package.json`.** Aus `devDependencies` die Zeile `"esbuild-plugin-inline-worker": "catalog:",` streichen (heute 51). Der Block behält seine sechs übrigen Einträge in unveränderter Reihenfolge; das Komma gehört zur gestrichenen Zeile. `dependencies`, `peerDependencies` und der `catalog:`-Block in `pnpm-workspace.yaml` bleiben unberührt — `packages/shadow-objects/package.json:86` führt denselben Eintrag weiter, und `packages/shadow-objects/build.mjs:27` importiert den Plugin für den inline-base64-Worker im Bundle.
  3. **`pnpm install`** im Wurzelverzeichnis, damit die Lockfile mitzieht. Danach `git status --short` lesen. Erwartet bewegt sich genau eine Datei, `pnpm-lock.yaml`, und in ihr genau ein Block: der Eintrag `esbuild-plugin-inline-worker` unter `importers:` → `packages/shae-offscreen-canvas:` → `devDependencies:` (heute Zeile 225). Stehen bleiben der Katalogeintrag (Zeile 42), der Eintrag desselben Namens unter `packages/shadow-objects:` (Zeile 144) und beide Paket-Schnappschüsse (Zeilen 979 und 2018). `git diff pnpm-lock.yaml` gehört in den Report. Bewegt sich `pnpm-workspace.yaml` mit — pnpm schreibt `minimumReleaseAgeExclude` beim Installieren selbst —, dann `git checkout -- pnpm-workspace.yaml` und anschließend `git diff pnpm-lock.yaml` noch einmal lesen; die Einstellung steht nicht in der Lockfile, das Zurücksetzen kann die beiden also nicht auseinanderbringen. Der Grund für das Zurücksetzen steht in der Anmerkung zum Nebenbefund. Bewegt sich sonst etwas, ist das ein Befund und geht in den Report statt in den Commit.
  4. **`CLAUDE.md`.** Zwei Eingriffe, sonst keiner:
     - Die Überschrift auf Zeile 88 wird von `## Changelogs and Backlog — keep them in sync` zu `## Changelogs — keep them in sync`.
     - Der Absatz auf Zeile 109 — er beginnt mit »After updating the changelogs, sync `Backlog.md`« — wird ganz gestrichen, samt einer der beiden ihn umgebenden Leerzeilen. Danach folgt auf `**Keep entries short and precise.** …` eine Leerzeile und dann `## Conventions that bite`.

     An die Stelle des Absatzes tritt nichts, und kein Satz erzählt, dass dort etwas stand — die Konventionen im Kopf dieses Plans verbieten den Rückblick in Dokumentation. Die Begründung steht in der Anmerkung dazu.
  5. **Vier Zählproben**, jede mit ihrer Ausgabe in den Report:
     - `pnpm exec biome check . --max-diagnostics 1000` meldet »Checked 219 files … No fixes applied« und kein Diagnostikum. **Die Zahl muss auf 219 stehenbleiben.** Bewegte sie sich, hätten die drei gestrichenen Muster doch etwas ausgeschlossen, und der Befund gehört in den Report statt in den Commit.
     - `pnpm exec biome format .` meldet weiterhin »Checked 206 files … No fixes applied«.
     - `git grep -n -i Backlog -- ':!CHANGELOG.md' ':!*/CHANGELOG.md' ':!audit.html' ':!remediation-plan.md'` liefert keinen Treffer.
     - `grep -rn esbuild packages/shae-offscreen-canvas --exclude-dir=node_modules` liefert keinen Treffer.
  6. **Wurzel-`CHANGELOG.md`.** Ganz oben ein neuer datierter Abschnitt, über `## 2026-08-26 — the creation-scope spec carries its own conditions`, mit der Überschrift `## 2026-08-26 — the configuration and the agent guide name only what exists`. Darunter drei Bullets im Muster der Datei: der Pfad fett und in Backticks, Doppelpunkt, dann der Satz.
     - `biome.json` — `files.includes` nennt die drei Endungen `.glsl`, `.vert` und `.frag` nicht mehr. Keine Datei dieser Art liegt im Repository oder lag je darin, und Biome 2.5.9 liest sie nicht: mit und ohne die Muster prüft derselbe Lauf dieselbe Zahl Dateien. Der Nachbar `**/*.svg` bleibt und ist der Gegenbeweis — ohne ihn kommen fünf Dateien hinzu.
     - `packages/shae-offscreen-canvas/package.json`, `pnpm-lock.yaml` — das Canvas-Paket führt `esbuild-plugin-inline-worker` nicht mehr unter seinen devDependencies. Sein Build ist eine Quelldistribution: `build.mjs` kopiert `README.md` und `src/` nach `.npm-pkg`, `vite.config.js` und `vitest.config.ts` laden kein Plugin. Der Katalogeintrag bleibt — `packages/shadow-objects/build.mjs` benutzt den Plugin für den inline-base64-Worker im Bundle.
     - `CLAUDE.md` — der Abschnitt über die Changelogs nennt die drei Changelogs und sonst kein Dokument.

     Geschrieben wird **auf Englisch** — die drei Bullets oben beschreiben den Inhalt, nicht den Wortlaut — und in der Stimme der Datei: Gegenwart, ein Satz pro Sache, kein »früher«, keine Finding-ID. Ein Changelog darf den Übergang benennen, das ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: `biome.json`, `pnpm-lock.yaml` und `pnpm-workspace.yaml` stehen alle drei in `globalDependencies` von `turbo.json`. Der Cache ist damit vollständig entwertet, `build`, `typecheck` und `test` laufen von vorn durch (Baseline 1m01s) — das ist erwartet und kein Fehlersignal. `pnpm lint` bleibt stumm. Keine Testzahl bewegt sich: das Paket fasst keine Quelldatei und keine Spec an.
- Commit: `chore(config): configuration and instructions name only what exists`
- Ergebnis: 1 Runde · alle drei Sachverhalte behoben — `biome.json` ohne die drei Shader-Muster (`**/*.svg` steht weiter), `packages/shae-offscreen-canvas/package.json` ohne `esbuild-plugin-inline-worker` samt Lockfile-Nachzug, `CLAUDE.md` mit gekürzter Überschrift und ohne den Backlog-Absatz, neuer datierter Abschnitt in der Wurzel-`CHANGELOG.md` · kein Regressionstest, das Paket behebt keinen Korrektheitsfehler; die vier Zählproben stehen: `biome check` 219 Dateien, `biome format` 206 Dateien, `git grep -i Backlog` ohne Treffer, `grep -rn esbuild packages/shae-offscreen-canvas` ohne Treffer · Verify grün (exit 0) · Der erste Anlauf ließ Schritt 4 und 6 liegen; die Runde schloss beide. Zwei Befunde des Reviewers gehen nicht in die Arbeit ein und verschwinden deshalb nicht still: »kein Commit vorhanden« (kritisch) ist kein Befund am Paket — der Commit ist Sache dieses Zuges und kam danach; »die Bullets im Changelog formulieren eine Abwesenheit« (klein) läuft gegen die Konventionen nur scheinbar, der Detailplan hält ausdrücklich fest, dass ein Changelog den Übergang benennen darf, und die Nachbarabschnitte derselben Datei sprechen dieselbe Sprache.
- Nebenbefunde: → Queue (`pnpm-workspace.yaml:114-115`, in Zug 0 aufgenommen; die Runden brachten keinen weiteren)
- Folgen: keine
- Schnittstellen: keine — das Paket bewegt keine Zeile unter `packages/*/src/**` und keine Signatur

### [x] 18. Die Doku beschreibt den heutigen Code
- Nebenbefund: `packages/shadow-objects/docs/api-reference.md:636` (low), `README.md:92` (info), `packages/shadow-objects/src/view/ShadowEnv.drawio:28` samt `.drawio.svg` (info)
- Ziel: Kein Doku-Artefakt nennt mehr einen Typ, den es nicht gibt, eine Zahl, die nicht mehr stimmt, oder ein falsch geschriebenes Wort.
- Bereich: `packages/shadow-objects/docs/api-reference.md`, `README.md`, `packages/shadow-objects/src/view/ShadowEnv.drawio{,.svg}`, `packages/shadow-objects/CHANGELOG.md`, Wurzel-`CHANGELOG.md`
- Hängt ab von: 17
- Hash: af966db
- Modell: mittlere Stufe
- Effort: low
- Anmerkung: Der Nutzer hat diese drei am 2026-08-26 in den Lauf gezogen, obwohl die Scope-Regel sie nicht eindeutig deckt. Bei `api-reference.md:636` sind zwei Wege vertretbar: den Optionstyp benennen und exportieren, oder die Signaturzeile auf das anonyme Typliteral bringen — Letzteres ändert die öffentliche API nicht und ist deshalb der Vorzugsweg. Die Zeilenzahl in `README.md:92` wird neu gemessen und nicht geschätzt; ob die Zahl überhaupt stehenbleiben soll, entscheidet der Detailplan. Das SVG neben dem `.drawio` ist ein Export: beide Dateien müssen zueinander passen, wenn die Beschriftung sich ändert.
- Anmerkung (Abgleich, 2026-08-26 — **alle drei Sachverhalte stehen, keiner ist gewandert**):
  - `packages/shadow-objects/docs/api-reference.md:636` trägt unverändert `new ViewComponent(token: string, options?: ViewComponentOptions)`. `git grep -n ViewComponentOptions` meldet über das ganze Repository genau diesen einen Treffer — der Name ist nirgends deklariert und nirgends exportiert. Der Konstruktor deklariert sein Optionsobjekt als anonymes Typliteral, heute auf `packages/shadow-objects/src/view/ViewComponent.ts:184-190`; Paket 8 hat den fünf Feldern je ein ` | undefined` gegeben, das Literal selbst ist geblieben. Dass die Zeile trotz der Pakete 12 und 13 auf 636 steht, ist nachgesehen: Paket 12 hat in dieser Datei nur innerhalb bestehender Zeilen gestrichen, Paket 13 hat unterhalb von 2091 angefügt.
  - `README.md:92` trägt unverändert »Over 1,100 lines of robust lifecycle logic«. Neu gemessen am 2026-08-26: `packages/shadow-objects/src/elements/` trägt 2.732 Zeilen TypeScript ohne die Specs und 3.402 mit ihnen. Paket 11 hat in derselben Zeile den Pfad auf `packages/shadow-objects/src/elements/` gebracht und den Satz dahinter nicht angefasst.
  - `packages/shadow-objects/src/view/ShadowEnv.drawio:28` trägt `value="&lt;i&gt;shadow object&amp;nbsp;enviroment&lt;/i&gt;"`. Beide Dateien des Paars sind seit `8677db8` (der Umbenennung des Projekts) unberührt: `git diff --stat bfcc54b..HEAD -- 'packages/shadow-objects/src/view/ShadowEnv.drawio*'` ist leer. Kein anderes Artefakt des Repositories trägt das Wort — `git grep -i enviroment` meldet nur dieses Paar.
- Anmerkung (**Entscheidung `api-reference.md`: die Signaturzeile bekommt das anonyme Literal, der Typ wird nicht exportiert**): Von den beiden Wegen, die der Nutzer offengelassen hat, fällt die Wahl auf den zweiten, und der Grund ist nicht Bequemlichkeit, sondern die Scope-Regel dieses Laufs. Einen Typ `ViewComponentOptions` zu deklarieren und aus `index.ts` zu exportieren wäre eine Erweiterung der öffentlichen API — ein Eingriff in den Bibliotheks-Quelltext, und dessen Ausgang ist nach dem zweiten Arm der Regel das Audit, nicht dieses Paket. Der Nutzer hat drei Doku-Korrekturen in den Lauf gezogen, keine API-Erweiterung. Dazu kommt, dass der Weg nichts kostet: die Tabelle unter der Signatur beschreibt die fünf Optionen vollständig, und ein Leser, der die Form braucht, sieht sie ab jetzt in der Signatur selbst statt in einem Namen, den er vergeblich importiert.
- Anmerkung (**warum das ` | undefined` in die Doku mitkommt**): Die Signaturzeile gibt das Literal so wieder, wie die ausgelieferte Deklaration es trägt — `packages/shadow-objects/dist/src/view/ViewComponent.d.ts:69-75`, gemessen an einem gebauten `dist/`. Das ist kein Abschreibfehler und keine Redundanz: seit Paket 8 steht `exactOptionalPropertyTypes` in der Wurzel-`tsconfig.json`, und unter diesem Schalter sind `parent?: ViewComponent` und `parent?: ViewComponent | undefined` zwei verschiedene Verträge — nur der zweite nimmt ein ausdrückliches `undefined` an. Paket 8 hat genau diese fünf Felder in seiner `Schnittstellen:`-Zeile als konsumentensichtbar geführt. Eine Referenz, die die Form vereinfacht, erfindet einen dritten Typ neben dem erfundenen, den sie gerade loswird.
- Anmerkung (**Entscheidung `README.md`: die Zahl geht ganz, und das ist der Fix statt eines Aufschubs**): Die Zeile bekommt keine frische Zahl, sondern nennt, was die Lifecycle-Logik trägt. Der Grund steht im Befund selbst: die Angabe war »wörtlich wahr und um den Faktor 2,5 zu klein«. Eine Behauptung der Form »Over N lines« wird durch Wachstum nie falsch, nur nichtssagend — sie kippt nicht, sie driftet, und deshalb korrigiert sie nie jemand. Auf 2.732 hochzusetzen wechselt bloß die Zahl, die in zwei Jahren wieder um einen Faktor danebenliegt, und stellt dieselbe Uhr neu.
  Der Präzedenzfall von Paket 13 spricht nicht dagegen, sondern dafür: dort bleibt eine Messung stehen, weil sie Bedingungen und Datum bekommt und an der Stelle liegt, an der jemand eine Entscheidung trifft — im Namensraum-Kapitel von `guides.md`. Eine Zeilenzahl in einer Verzeichnisliste ist beides nicht: Messbedingungen wären dort absurd, und niemand entscheidet etwas daran. Die vier Nachbar-Bullets derselben Liste beschreiben ihren Inhalt und nicht ihre Größe; nach dieser Änderung tut es der fünfte auch.
- Anmerkung (**das SVG trägt die Beschriftung dreimal, und die dritte sieht `grep` nicht**): Der Befund verlangt, dass Diagramm und Export zueinander passen, und nennt als Weg ein Zeichenwerkzeug. Ein solches steht in diesem Lauf nicht zur Verfügung, und es braucht auch keins — gemessen am 2026-08-26 an einer Kopie außerhalb des Arbeitsbaums:
  - `ShadowEnv.drawio` ist unkomprimiertes XML. Das Wort steht dort einmal, auf Zeile 28.
  - `ShadowEnv.drawio.svg` trägt es zweimal sichtbar: einmal im `foreignObject`-`div` und einmal im `<text>`-Fallback desselben `<switch>`. Beide zentrieren sich selbst — das `div` über `text-align: center`, das `<text>` über `text-anchor="middle"` —, ein Zeichen mehr verschiebt also keine Geometrie, und keine Koordinate der Datei wird angefasst.
  - Dieselbe Datei trägt es ein drittes Mal, unsichtbar: das Attribut `content` des `<svg>`-Elements hält den vollständigen Diagramm-Quelltext, deflate-komprimiert und base64-kodiert. Das ist die Fassung, die ein Zeichenwerkzeug liest, wenn jemand das SVG statt des `.drawio` öffnet. Bliebe sie stehen, brächte der nächste echte Export den Tippfehler zurück, und der Befund käme mit ihm.

  Deshalb geht der dritte Ort über ein Skript und nicht über eine Textersetzung. Dass der Weg trägt, ist durchgerechnet: die Kopie ist danach wohlgeformtes XML, außerhalb des `content`-Attributs unterscheidet sie sich von der Vorlage in nichts als der Beschriftung, und das dekodierte Attribut trägt das Wort richtig. Der neu komprimierte Block ist byteweise ein anderer als der von draw.io erzeugte — Deflate hängt vom Kompressor ab —, semantisch aber derselbe Quelltext; nachgeprüft wird er durch Dekodieren, nicht durch Lesen des Diffs.
- Anmerkung (**das SVG endet ohne Zeilenumbruch, und das bleibt so**): Das letzte Byte von `ShadowEnv.drawio.svg` ist `>`, nicht `\n`; das `.drawio` dagegen endet mit `\n`. Paket 1 hat beide zu Recht in Ruhe gelassen — sein Ziel gilt »jeder Textdatei, die ein Werkzeug dieses Repositories formatiert«, und dieses Paar formatiert keines: `biome.json` schließt `**/*.svg` aus (in Paket 17 gemessen: ohne den Ausschluss kommen fünf Dateien hinzu), und `.drawio` kennt Biome gar nicht. Ein Werkzeug, das dem SVG beim Bearbeiten einen Zeilenumbruch anhängt, erzeugt eine Änderung, die niemand bestellt hat. Die Byte-Zielwerte in Schritt 3 fangen genau das ab.
- Anmerkung (**Zuständigkeit der beiden Changelogs**): Die Änderung trifft zwei und steht deshalb in beiden, je aus der Sicht dieser Datei, nicht kopiert. In `packages/shadow-objects/CHANGELOG.md` gehören `docs/api-reference.md` — die Doku dieses Pakets ist nach `AGENTS.md` §4 Teil seines öffentlichen Vertrags — und das Diagrammpaar unter `packages/shadow-objects/src/view/`; die Präzedenz für ein Diagramm steht in derselben Datei, im `**Docs (diagrams):**`-Bullet aus Paket 12. In die Wurzel-`CHANGELOG.md` gehört die Wurzel-`README.md`: sie führt nach ihrem eigenen Kopf »dev workflow«, und die Präzedenz ist der `README.md`-Bullet aus Paket 11. Von Laufzeit-API, Verhalten und `dist/`-Form bewegt sich nichts — weder `.drawio` noch `.svg` erreichen den Build, dessen Transpile-Glob `src/**/*.{ts,js}` lautet —, deshalb keine der übrigen Kategorien und kein Eintrag im Canvas-Changelog.
- Anmerkung (**`ViewComponentOptions` steht allein, gemessen**): Damit die Zielzeile dieses Pakets nicht mehr verspricht, als es hält, ist der Rest der Referenz gegengeprüft. Alle PascalCase-Bezeichner aus `docs/api-reference.md` gegen alle im Quelltext von `packages/shadow-objects/src/` vorkommenden gehalten, dann die Reste von Hand sortiert: übrig bleiben Beispielnamen (`MyLogic`, `PlayerController`, `FeatureLogic` und so fort), Plattformtypen (`MessagePort`) und drei echte Typnamen — `CreateMemoOptions`, `EffectCallback` und `SignalLikeDeps`. Alle drei existieren und werden exportiert, von `@spearwolf/signalize` (`lib/create-memo.d.ts:6`, `lib/EffectImpl.d.ts:5` und `:8`, re-exportiert über `lib/index.d.ts:3`), stehen also zu Recht in der Doku. `ViewComponentOptions` ist der einzige erfundene Name der Datei. Die übrigen sechs Doku-Seiten sind nicht gegengeprüft; sie tragen den Namen nicht, mehr ist über sie hier nicht behauptet.
- Anmerkung (**Restplan**): Keine Umsortierung, kein neuer Schnitt, kein neues Paket. Dies ist das letzte offene Paket; danach steht der Abschluss an. Alle erledigten Pakete melden `Folgen: keine` oder eine Folge, die inzwischen erledigt ist (die aus Paket 5 mit `03a026d`), es gibt also nichts zu verteilen. Unter »Offene Befunde« steht ein einziger Eintrag auf `[ ]` — `pnpm-workspace.yaml:114-115`, `→ Scope`, aus Paket 17. Er kommt **nicht** in dieses Paket: seine Ursache ist eine abgelaufene Karenz-Ausnahme in der Paketmanager-Konfiguration und hat mit einer Doku, die den Code falsch beschreibt, nichts gemein. Sein Paket schneidet die Drain-Runde des Abschlusses.
- Anmerkung (**für Zug 5, Plan fortschreiben**): Die drei Sachverhalte dieses Pakets stehen unter »Offene Befunde« als Einträge auf `[x]` mit dem Vermerk »→ Paket 18 (Nutzer, 2026-08-26)«. Nach dem Commit bekommt jeder der drei den Hash dazu, in der Form, die Paket 17 dort gesetzt hat: »→ Paket 18, behoben in `<hash>`«. Sonst steht am Ende des Laufs dreimal eine Zuweisung ohne Beleg da, und der Abschluss muss sie einzeln in `git log` nachschlagen.
- Dateien: `packages/shadow-objects/docs/api-reference.md` · `README.md` · `packages/shadow-objects/src/view/ShadowEnv.drawio` · `packages/shadow-objects/src/view/ShadowEnv.drawio.svg` · `packages/shadow-objects/CHANGELOG.md` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler. Es ändert eine Signaturzeile in Markdown, einen Satz in einer zweiten Markdown-Datei, ein Wort in einem Diagramm samt dessen Export und schreibt zwei Changelog-Einträge; es bewegt keine Anweisung, und keine Spec dieses Repositories liest eine der vier Dateien. Den Nachweis führen die sieben Zählproben aus Schritt 6 und der Verify-Lauf.
- Vorgehen:
  1. **`packages/shadow-objects/docs/api-reference.md`.** Unter `### Constructor` (heute Zeile 633) den Inhalt des ```` ```typescript ````-Blocks ersetzen. Aus der einen Zeile 636

     ```typescript
     new ViewComponent(token: string, options?: ViewComponentOptions)
     ```

     wird

     ```typescript
     new ViewComponent(token: string, options?: {
         parent?: ViewComponent | undefined;
         order?: number | undefined;
         context?: ComponentContext | undefined;
         uuid?: string | undefined;
         autoDestructionOnParentRemoval?: boolean | undefined;
     })
     ```

     Eingerückt wird mit vier Leerzeichen, wie jeder andere Code-Block dieser Datei; die Sprachauszeichnung `typescript` bleibt. Die Feldreihenfolge ist die der Deklaration in `packages/shadow-objects/src/view/ViewComponent.ts:185-189` und nicht die der Tabelle darunter — die Signatur gibt den Quelltext wieder, die Tabelle sortiert nach Wichtigkeit, und beide dürfen das. Sonst nichts an der Datei: der Satz zu `token` darunter (heute 639), die Optionstabelle (641-647) und der Absatz zur Kurzform (649) bleiben Wort für Wort stehen, und kein anderer Abschnitt wird angefasst.
  2. **`README.md`.** In Zeile 92, dem Bullet unter `### Integrations & Elements`, den letzten Satz ersetzen. Aus

     ```
     *   **`packages/shadow-objects/src/elements/` (Custom Elements):** The HTML bindings (`ShaeElement` base plus `<shae-ent>`, `<shae-prop>`, `<shae-worker>`). Over 1,100 lines of robust lifecycle logic.
     ```

     wird

     ```
     *   **`packages/shadow-objects/src/elements/` (Custom Elements):** The HTML bindings (`ShaeElement` base plus `<shae-ent>`, `<shae-prop>`, `<shae-worker>`). Lifecycle logic for the hard parts: re-parenting inside a single task, a namespace change that re-binds the entity, and a teardown that can be called off.
     ```

     Es bewegt sich genau ein Satz; der Pfad, die Klammer mit den vier Bezeichnern und die drei Leerzeichen hinter dem `*` bleiben unverändert, und keine Zeile kommt hinzu oder fällt weg. Die drei genannten Verhalten sind belegt und nicht ausgedacht: der aufschiebbare Teardown steht in `src/elements/deferredTeardown.ts`, das Neubinden beim Namensraumwechsel in `packages/shadow-objects/docs/api-reference.md` unter `#### Assigning a context`, und beide zusammen im `**Breaking (elements):**`-Bullet zu `<shae-ent>`/`<shae-prop>` in `packages/shadow-objects/CHANGELOG.md`. Keine andere Zeile der README wird angefasst — auch nicht »Massive test suite« zwei Bullets weiter unten: das ist keine Zahl und kein Befund dieses Pakets.
  3. **Das Diagrammpaar.** Beide Dateien liegen unter `packages/shadow-objects/src/view/`. Drei Fundstellen, ein Skript, weil die dritte komprimiert ist. Das Skript wird als Datei im Arbeitsverzeichnis angelegt und nicht im Arbeitsbaum: `/tmp/claude-1000/-home-spw-spaceland-shadow-objects/4330786b-e3e3-43ca-ab76-3ae0412a90c4/scratchpad/fix-shadowenv-diagram.mjs`. Der Block unten ist der Dateiinhalt; die Einrückung dieses Plans gehört nicht dazu, und ein Heredoc mit eingerücktem Abschlusswort schreibt die Datei nicht. Der Aufruf erfolgt aus dem Wurzelverzeichnis des Repositories, weil die Pfade im Skript repo-relativ stehen.

     ```javascript
     import {readFileSync, writeFileSync} from 'node:fs';
     import zlib from 'node:zlib';

     const dir = 'packages/shadow-objects/src/view/';

     // the drawing itself is plain XML -- one occurrence, byte-exact replacement
     const drawio = readFileSync(dir + 'ShadowEnv.drawio', 'utf8');
     writeFileSync(dir + 'ShadowEnv.drawio', drawio.replaceAll('enviroment', 'environment'));

     // the export carries the label twice in the rendered markup and once more inside its
     // `content` attribute, where the diagram source sits deflated and base64-encoded
     const svg = readFileSync(dir + 'ShadowEnv.drawio.svg', 'utf8');
     const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
     const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

     const attr = svg.match(/ content="([^"]*)"/);
     const mxfile = unesc(attr[1]);
     const blob = mxfile.match(/<diagram[^>]*>([\s\S]*?)<\/diagram>/)[1];
     const xml = decodeURIComponent(zlib.inflateRawSync(Buffer.from(blob, 'base64')).toString('utf8'));
     const fixedBlob = zlib
       .deflateRawSync(Buffer.from(encodeURIComponent(xml.replaceAll('enviroment', 'environment')), 'utf8'))
       .toString('base64');

     let out = svg.replace(attr[0], ` content="${esc(mxfile.replace(blob, fixedBlob))}"`);
     out = out.replaceAll('enviroment', 'environment');
     writeFileSync(dir + 'ShadowEnv.drawio.svg', out);
     ```

     **Danach die Byte-Zielwerte lesen, sie sind die eigentliche Probe** — durchgerechnet am 2026-08-26 an einer Kopie außerhalb des Arbeitsbaums. `wc -c` auf beide Dateien meldet für `ShadowEnv.drawio` **4462** Bytes (vorher 4461, ein Zeichen mehr) und für `ShadowEnv.drawio.svg` **12145** (vorher 12151: zwei Zeichen mehr in der Beschriftung, acht weniger im neu komprimierten Block). Weicht eine der beiden Zahlen ab, geht der Befund in den Report statt in den Commit. Das letzte Byte des SVG bleibt `>` und wird kein Zeilenumbruch — `tail -c1 packages/shadow-objects/src/view/ShadowEnv.drawio.svg | xxd -p` meldet weiterhin `3e`. Kein Editor, kein Formatierer und kein `sed -i` fasst diese beiden Dateien an; sie werden ausschließlich von diesem Skript geschrieben.
  4. **`packages/shadow-objects/CHANGELOG.md`**, Abschnitt `## [Unreleased]` → `### Internal`. Zwei neue Bullets. Die Liste steht alphabetisch nach ihrem fett gesetzten Präfix; beide Einfügungen gehen an ihren Platz und werden über ihre Nachbarn im Text gefunden, nicht über eine Zeilennummer — die erste Einfügung verschiebt die zweite. Je ein Bullet auf einer einzigen langen Zeile, wie jeder andere dieser Datei, und mit dem Geviertstrich `—` als Gedankenstrich, den sie durchgehend führt.
     - Direkt **hinter** den vorhandenen `- **Docs (diagrams):** two unreferenced illustrations are removed. …` (heute Zeile 409) und vor `- **Docs (examples):**`:

       ```
       - **Docs (diagrams):** the swimlane in `src/view/ShadowEnv.drawio` and in the SVG exported beside it is labelled `shadow object environment`. The export holds the word three times — twice in the markup it renders and once in the diagram source it keeps deflated inside its `content` attribute — and all three agree with the drawing, so a drawing tool that opens the SVG rather than the `.drawio` reads the same spelling. Neither file reaches the published package; the `dist/` file list is unchanged.
       ```

     - Direkt **hinter** dem letzten vorhandenen `- **Docs (reference):** …` (heute Zeile 418, der Bullet zu `#### Driving the Lookup by Hand`) und vor `- **Docs (security):**`:

       ```
       - **Docs (reference):** the `ViewComponent` constructor signature in `api-reference.md` spells out the option object the code declares — an anonymous type literal carrying `parent`, `order`, `context`, `uuid` and `autoDestructionOnParentRemoval`, each of them optional and each accepting an explicit `undefined`, exactly as `dist/src/view/ViewComponent.d.ts` states it. The signature named a type `ViewComponentOptions`, which no module of this package declares and no `import type` resolves. The option table under the signature is untouched and describes the same five fields.
       ```
  5. **Wurzel-`CHANGELOG.md`.** Ganz oben ein neuer datierter Abschnitt, über `## 2026-08-26 — the configuration and the agent guide name only what exists` (heute Zeile 7), mit der Überschrift

     ```
     ## 2026-08-26 — the readme says what the custom elements do
     ```

     Darunter ein Bullet in der Form, die jeder Eintrag der Datei hat: der Pfad fett und in Backticks, Doppelpunkt, dann die Sätze; umbrochen bei rund 95 Zeichen mit zwei Leerzeichen Einzug in den Folgezeilen, Gedankenstrich `—`.

     ```
     - **`README.md`:** the entry for `packages/shadow-objects/src/elements/` under "What's in the Box?"
       names what the lifecycle logic handles — re-parenting inside a single task, a namespace change
       that re-binds the entity, a teardown that can be called off — where it used to count the
       directory's lines. A line count in a structure list never turns false as the code grows, it
       only turns uninformative, so nothing ever prompts anyone to correct it; the four neighbouring
       entries describe what their domain contains, and this one now does too.
     ```

     Geschrieben wird **auf Englisch** — der Bullet oben ist der Wortlaut, nicht eine Beschreibung davon. Keine Finding-ID. Ein Changelog darf den Übergang benennen, das ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben. Beide Changelogs stehen unter den Ausschlüssen von Biome (`**/CHANGELOG.md`), werden also nicht umformatiert und behalten ihren Zeilenumbruch am Ende.
  6. **Sieben Zählproben**, jede mit ihrer Ausgabe in den Report:
     - `git grep -n ViewComponentOptions -- ':!audit.html' ':!remediation-plan.md' ':!*CHANGELOG.md'` liefert keinen Treffer. Vorher genau einen (`docs/api-reference.md:636`). Der Ausschluss gilt dem neuen Changelog-Bullet, der den Namen nennt, um zu sagen, welcher verschwunden ist.
     - `git grep -in enviroment` liefert keinen Treffer. Vorher zwei Dateien.
     - `grep -o environment packages/shadow-objects/src/view/ShadowEnv.drawio.svg | wc -l` meldet `2`, `… ShadowEnv.drawio | wc -l` meldet `1`.
     - Das `content`-Attribut trägt das Wort richtig. Ein Einzeiler aus dem Wurzelverzeichnis, seine Ausgabe gehört in den Report:

       ```bash
       node -e "const z=require('zlib'),fs=require('fs');const s=fs.readFileSync('packages/shadow-objects/src/view/ShadowEnv.drawio.svg','utf8');const u=x=>x.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'\"').replace(/&amp;/g,'&');const b=u(s.match(/ content=\"([^\"]*)\"/)[1]).match(/<diagram[^>]*>([\s\S]*?)<\/diagram>/)[1];const x=decodeURIComponent(z.inflateRawSync(Buffer.from(b,'base64')).toString('utf8'));console.log('enviroment:',/enviroment/.test(x),'environment:',/environment/.test(x))"
       ```

       Erwartet: `enviroment: false environment: true`.
     - `wc -c` auf das Paar meldet 4462 und 12145 (Schritt 3).
     - `grep -c '1,100 lines' README.md` meldet `0`.
     - `pnpm exec biome check . --max-diagnostics 1000` meldet weiterhin »Checked 219 files … No fixes applied« und kein Diagnostikum. Die Zahl muss auf 219 stehenbleiben: es entsteht keine Datei und es verschwindet keine.
     Dazu `git diff --stat`: genau sechs Dateien, keine mehr.
  7. **Nicht anfassen:**
     - Keinen Typ `ViewComponentOptions` deklarieren, exportieren oder in `types.ts` anlegen. Die Begründung steht in der Anmerkung dazu; ein Export wäre eine Erweiterung der öffentlichen API und gehört nach der Scope-Regel nicht in diesen Lauf.
     - `packages/shadow-objects/src/view/ViewComponent.ts` bleibt unberührt. Dieses Paket bringt die Doku zum Code, nicht umgekehrt.
     - Die Optionstabelle unter der Signatur (`api-reference.md:641-647`) und der Absatz zur Kurzform darunter bleiben Wort für Wort stehen. Sie sind richtig.
     - `packages/shadow-objects/src/view/ComponentContext.drawio` und `ComponentContext.drawio.svg` bleiben unberührt. Paket 12 hat für dieses Paar entschieden, dass es nichts Unwahres sagt, und es trägt den Tippfehler auch nicht.
     - Die vier `distContract`-Erwartungsdateien nicht anfassen. Unter `dist/` und `.npm-pkg/` bewegt sich keine Datei — der Transpile-Glob des Builds lautet `src/**/*.{ts,js}` und fasst weder `.drawio` noch `.svg` —, und die Form beider veröffentlichter `package.json` bleibt gleich.
     - Kein Eintrag in `packages/shae-offscreen-canvas/CHANGELOG.md`. Das Canvas-Paket wird nicht berührt.
     - Kein `pnpm make:todo` — es wird kein TODO-Kommentar angefasst. Kein `pnpm install` — kein Manifest und keine Lockfile bewegt sich.
     - `pnpm-workspace.yaml:114-115` nicht anfassen. Der Eintrag steht als offener Nebenbefund unter »Offene Befunde« und bekommt sein Paket von der Drain-Runde des Abschlusses.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: Alle vier grün. `build`, `typecheck` und `test` sind **keine** Cache-Treffer: `turbo.json` führt `src/**` unter den `inputs` aller drei Tasks, und Schritt 3 schreibt zwei Dateien unter `packages/shadow-objects/src/view/`. Über `dependsOn: ["^build"]` laufen auch die Tasks der übrigen Pakete neu; ein vollständiger Lauf ist hier das Erwartete und kein Fehlersignal. Die Zahlen darin bewegen sich nicht, weil sich keine Anweisung bewegt: 802/379/123/645 Tests und Coverage 92,89 % (3385/3644). Ein Diagramm ist kein Quelltext, die Zählung kann sich davon nicht bewegen; tut sie es doch, ist das ein Befund für den Report. `pnpm lint` läuft an turbo vorbei und meldet »Checked 219 files … No fixes applied« ohne Diagnostikum — Biome liest weder Markdown noch `.drawio`, und `**/*.svg` steht unter seinen Ausschlüssen. `src/distContract.spec.ts` und `src/distContract.spec.js` bleiben grün. Jede Bewegung in einer dieser Zahlen ist neu und blockiert.
- Commit: `docs: the api reference, the readme and the environment diagram describe today's code`
- Ergebnis: 1 Runde · alle drei Sachverhalte behoben — die Signaturzeile in `docs/api-reference.md` trägt das anonyme Optionsliteral mit den fünf Feldern statt des nirgends deklarierten Namens, die Zeile zu den Custom Elements in `README.md` nennt drei belegte Lifecycle-Verhalten statt einer Zeilenzahl, und `ShadowEnv.drawio` samt Export schreibt »environment« an allen drei Fundstellen, die komprimierte Diagrammquelle im `content`-Attribut eingeschlossen · kein Regressionstest, weil kein Korrektheitsfehler bewegt wurde; den Nachweis führen die sieben Zählproben, alle mit den im Detailplan vorausberechneten Werten (`wc -c` 4462 und 12145, letztes Byte des SVG `3e`, Biome 219 Dateien ohne Diagnostikum, sechs Dateien im Diff) · Review ohne Befund
- Nebenbefunde: → Queue (2 Einträge, `README.md:95` und `README.md:96`)
- Folgen: keine
- Schnittstellen: keine — es bewegt sich keine Signatur, kein Export und keine Zeile unter `dist/`; `.drawio` und `.svg` erreichen den Build nicht, dessen Transpile-Glob `src/**/*.{ts,js}` lautet

### [x] 19. Die Karenzzeit gilt wieder für jedes Paket
- Nebenbefund: `pnpm-workspace.yaml:114-115` (info)
- Ziel: Kein Paket ist mehr von `minimumReleaseAge` ausgenommen, und die Schranke, die einen frisch kompromittierten Fremd-Release aus dem Baum hält, wirkt wieder ohne Loch.
- Bereich: `pnpm-workspace.yaml`, `CLAUDE.md`, Wurzel-`CHANGELOG.md`
- Hängt ab von: 18
- Hash: 81b7f64
- Modell: mittlere Stufe
- Effort: low
- Anmerkung: `@spearwolf/signalize@1.0.0-beta.0` ist am 2026-08-15 erschienen und damit älter als die Vorgabe von einem Tag; der Kommentar über dem Block nennt genau diese Bedingung als Anlass zum Entfernen. Der Eintrag geht ersatzlos, der Kommentar zieht mit, soweit er nur ihn erklärt. Danach `pnpm install --frozen-lockfile` als Probe, dass die Auflösung ohne die Ausnahme durchgeht — läuft sie nicht durch, ist das der Befund und nicht der Commit.
- Anmerkung (Abgleich, 2026-08-26 — **der Sachverhalt steht unverändert an derselben Zeile**): `pnpm-workspace.yaml:114-115` trägt `minimumReleaseAgeExclude:` mit dem einen Eintrag `- '@spearwolf/signalize@1.0.0-beta.0'`, darüber auf 109-113 der fünfzeilige Kommentar. `git blame` weist beide dem Commit `1efde70d` vom 2026-08-15 zu, dem Tag des Release; kein Paket dieses Laufs hat die Stelle bewegt. Die Frist ist nachgemessen und nicht aus dem Befund übernommen: `npm view @spearwolf/signalize time --json` meldet für `1.0.0-beta.0` den 2026-08-15T12:18:46Z, gegen `date -u` am 2026-08-26T19:24Z sind das elf Tage und sieben Stunden gegen eine Karenz von einem Tag. Der Anlass der Ausnahme ist zehnfach überschritten.
- Anmerkung (**der Fix trägt, und das ist gemessen statt vermutet**): Die Probe lief am 2026-08-26 auf einem frischen Baum außerhalb des Arbeitsbaums — `git archive HEAD | tar -x` in ein Verzeichnis unter dem Arbeitsverzeichnis, dort die acht Zeilen entfernt, dann `pnpm install --frozen-lockfile` mit pnpm 11.21.0. Ergebnis: Exit 0 in 4,4 s, und in der Ausgabe steht die Zeile, auf die es ankommt — `✓ Lockfile passes supply-chain policies (254 entries in 1.5s)`. Das ist die Prüfung selbst: pnpm hat alle 254 Lockfile-Einträge gegen die Karenzzeit gehalten, ohne eine einzige Ausnahme, und keiner ist zu jung. Der zweite Beleg steht in der Historie dieses Laufs: Paket 17 hat am selben Tag `pnpm install` gefahren, und die Ausnahme deckte nur `@spearwolf/signalize` — jeder andere Eintrag der Lockfile hat die Altersprüfung heute also ohnehin schon bestanden.
- Anmerkung (**pnpm schreibt den Eintrag nicht zurück, ebenfalls gemessen**): Das ist die eine Frage, an der dieses Paket lautlos scheitern könnte, denn der Kommentar über dem Block sagt »Written by pnpm on install« und Paket 17 hat für genau diesen Fall eine Rücksetzregel in sein Vorgehen geschrieben. Im selben Probelauf: nach `pnpm install --frozen-lockfile` trägt die Datei weiterhin 107 Zeilen und 4470 Bytes, `grep -n '^minimumReleaseAgeExclude'` bleibt ohne Treffer, und ein anschließendes gewöhnliches `pnpm install` (der Weg des Entwicklers, nicht der der CI) ändert daran nichts. pnpm legt den Eintrag an, wenn ein Release jünger als die Karenz ist; ist keins mehr jünger, hat es nichts anzulegen. Die Rücksetzregel aus Paket 17 wird hier also nicht gebraucht — kommt der Eintrag beim Implementierer trotzdem zurück, ist das ein Befund für den Report und nicht für den Commit.
- Anmerkung (**`pnpm-lock.yaml` fällt aus dem Bereich, gemessen**): Der Grobplan führt die Lockfile unter »Bereich«; sie bewegt sich nicht und darf es nicht. Die Karenzausnahme ist eine Auflösungsregel und keine in der Lockfile festgehaltene Einstellung: deren `settings:`-Block (Zeilen 3-5) führt genau `autoInstallPeers` und `excludeLinksFromLockfile` und sonst nichts, `minimumReleaseAgeExclude` kommt in der ganzen Datei nicht vor. Im Probelauf war `pnpm-lock.yaml` nach beiden Installationen byteweise identisch mit dem Stand aus `HEAD` (`cmp` ohne Ausgabe). Erscheint sie beim Implementierer im `git status`, ist das ein Befund für den Report statt ein Nachziehen.
- Anmerkung (**die Probe des Grobplans greift im warmen Arbeitsbaum nicht**): `pnpm install --frozen-lockfile` im Arbeitsbaum selbst beweist nichts. Gemessen am 2026-08-26 vor jeder Änderung: pnpm meldet »Already up to date« und ist nach 193 ms fertig, ohne die Lieferketten-Prüfung überhaupt zu erreichen — passt `node_modules` zur Lockfile, kürzt pnpm den ganzen Durchgang ab. Der Anlass der Ausnahme war gerade der frische Runner, und dort gibt es keine Abkürzung. Die Probe gehört deshalb in einen frischen Baum, und genau so steht sie in Schritt 4.
- Anmerkung (**der Block geht ganz, der Kommentar über `turbo` bleibt**): Entfernt werden acht Zeilen — die Leerzeile 108, der fünfzeilige Kommentar 109-113 und die beiden Zeilen des Eintrags. Der Kommentar erklärt ausschließlich diesen Block: er sagt, wozu die Karenz da ist, warum die eigenen Pakete sie nicht brauchen und wann der Eintrag gehen kann. Ohne den Eintrag steht er über nichts, und ein Kommentar ohne Gegenstand ist genau die Sorte Text, die die Konventionen dieses Laufs verbieten. Das Wissen darin geht nicht verloren: `CHANGELOG.md:497` hält es datiert fest, und `CLAUDE.md:27` trägt die Betriebsregel für den nächsten Beta-Bump. Der Kommentar über `turbo` (88-90) bleibt Wort für Wort stehen — er erklärt den turbo-Pin und nennt `minimumReleaseAgeExclude` als das, was dieser Pin vermeiden will; nach dem Entfernen ist er die einzige Stelle der Datei, die den Mechanismus erklärt, und das genügt.
- Anmerkung (**`CLAUDE.md:27` ist eine Folge dieser Änderung und gehört deshalb in dieses Paket**): Der Satz endet heute mit »… and `minimumReleaseAgeExclude` carries whatever release is younger than pnpm's one-day cutoff«. Das ist eine Aussage im Präsens über einen Schlüssel, den die Datei nach Schritt 1 nicht mehr führt; wer ihn dort sucht, findet nichts. Kein Nebenbefund, sondern das, was der eigene Umbau umwirft, und damit nach der Regel des Laufs Teil des Pakets. Er wird nicht gestrichen, sondern auf den Mechanismus umgestellt: die Betriebsanleitung für den nächsten Beta-Bump ist das Wertvolle an ihm, und die gilt weiter. `AGENTS.md` braucht nichts — es nennt `minimumReleaseAge` nur im turbo-Absatz (Zeile 116), und der ist unberührt.
- Anmerkung (**ein Nebenbefund kommt hinzu und bleibt liegen**): `CLAUDE.md:25` und `AGENTS.md:116` beziffern den turbo-Holdback mit `2.10.9`, der Katalog führt seit `92d3c14` `turbo: ^2.10.11` (`pnpm-workspace.yaml:91`, aufgelöst auf 2.10.11 in der Lockfile). Vorbestehend, nachgesehen und nicht vermutet: `git show bfcc54b:CLAUDE.md` trägt dieselbe `2.10.9`-Zeile, während `git show bfcc54b:pnpm-workspace.yaml` schon `^2.10.11` führt — die Lücke ist älter als dieser Lauf. Er kommt **nicht** in dieses Paket, obwohl der Implementierer `CLAUDE.md` ohnehin öffnet und die falsche Zahl zwei Zeilen über der Zeile steht, die er ändert: die Ursache ist eine andere — hier ist eine Ausnahme abgelaufen, dort ist eine Versionsangabe einem Bump nicht nachgewachsen, und das ist die Ursache, die Paket 17 behandelt hat. Ein Nebenbefund bekommt sein Paket von der Drain-Runde, die alle Befunde des Laufs nebeneinander sieht. Er steht unter »Offene Befunde«, mit dem Urteil `→ Scope`. Die Begründung des Holdbacks selbst stimmt weiterhin und ist nachgemessen: `npm view turbo dist-tags` meldet `latest: 2.10.12` (erschienen 2026-08-25), der Katalog steht also tatsächlich einen Patch darunter — falsch ist allein die Zahl in den beiden Anleitungen.
- Anmerkung (**Zuständigkeit des Changelogs**): Der Eintrag geht in die Wurzel-`CHANGELOG.md` und in keine andere. Die Tabelle in `CLAUDE.md` weist turbo/pnpm-Setup und Arbeitsanweisungen ausdrücklich dorthin; die Präzedenz für beide Dateien in einem Abschnitt steht in Paket 17 (`47da67b`), das `pnpm`-Manifest und `CLAUDE.md` genauso gebündelt hat. Von Laufzeit-API, Verhalten und `dist/`-Form bewegt sich nichts — die Änderung fasst keine Zeile unter `packages/*/src/**` an —, deshalb kein Eintrag in `packages/shadow-objects/CHANGELOG.md` und keiner im Canvas-Changelog. `CHANGELOG.md:497`, der Abschnitt, der die Ausnahme seinerzeit eingeführt hat, bleibt Wort für Wort stehen: ein Changelog berichtet über den Tag, an dem er geschrieben wurde, und die Historie ist bereits konserviert.
- Anmerkung (**Restplan**): Keine Umsortierung, kein neuer Schnitt, kein neues Paket. Dies ist das letzte offene Paket; danach steht der Abschluss an. Alle erledigten Pakete melden `Folgen: keine` oder eine Folge, die inzwischen erledigt ist (die aus Paket 5 mit `03a026d`) — es gibt nichts zu verteilen. Unter »Offene Befunde« stand vor diesem Zug kein Eintrag mehr auf `[ ]`; mit dem turbo-Befund oben steht jetzt genau einer da, und die Drain-Runde des Abschlusses schneidet sein Paket. Dass der Lauf damit um ein Paket länger wird, ist der ehrliche Ausgang und kein Grund, den Befund hier mitzunehmen.
- Dateien: `pnpm-workspace.yaml` · `CLAUDE.md` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler. Es entfernt acht Zeilen aus einer Paketmanager-Konfiguration, stellt einen Satz in einer Arbeitsanweisung um und schreibt einen Changelog-Abschnitt; es bewegt keine Zeile Quelltext, und keine Spec dieses Repositories liest eine der drei Dateien. Den Nachweis führen die Installationsprobe aus Schritt 4, die sieben Zählproben aus Schritt 5 und der Verify-Lauf.
- Vorgehen:
  1. **`pnpm-workspace.yaml`.** Die Zeilen 108 bis 115 ersatzlos streichen, also den ganzen Schluss der Datei: die Leerzeile hinter `    three: '>=0.180.0'`, die fünf Kommentarzeilen 109-113, die den Block erklären (sie beginnen mit »# minimumReleaseAge (1 day, pnpm >=11 default) exists to keep a freshly« und enden mit »# entry is version-exact and can go once the release is a day old.«), die Zeile `minimumReleaseAgeExclude:` und die Eintragszeile `  - '@spearwolf/signalize@1.0.0-beta.0'`. Die Datei endet danach mit `    three: '>=0.180.0'` und einem Zeilenumbruch. Sonst nichts an der Datei — insbesondere bleibt der Kommentar über `turbo` (88-90) unverändert stehen, obwohl er `minimumReleaseAgeExclude` nennt, und der Katalogeintrag `'@spearwolf/signalize': 1.0.0-beta.0` (31) behält seine exakte Version; das ist ein anderer Mechanismus, und `CLAUDE.md:27` nennt seinen Grund.
  2. **`CLAUDE.md`, Zeile 27.** Nur der letzte Satz des Absatzes bewegt sich. Aus

     ```
     After a bump, `pnpm why -r @spearwolf/eventize` must report exactly one version. The signalize entry is pinned version-exact while it is a beta, and `minimumReleaseAgeExclude` carries whatever release is younger than pnpm's one-day cutoff.
     ```

     wird

     ```
     After a bump, `pnpm why -r @spearwolf/eventize` must report exactly one version. The signalize entry is pinned version-exact while it is a beta, and a release younger than pnpm's one-day `minimumReleaseAge` blocks the install until it is listed under `minimumReleaseAgeExclude` — pnpm writes that entry itself on install, it is version-exact, and it is removed again once the release has aged past the cutoff.
     ```

     Der Absatz bleibt eine einzige lange Zeile, wie jeder andere dieser Datei; der Satz davor (`After a bump, …`) und alles vor ihm bleiben Wort für Wort stehen. Keine andere Zeile der Datei wird angefasst — auch nicht die `2.10.9` in Zeile 25 zwei Zeilen darüber: sie ist ein Nebenbefund unter »Offene Befunde« und gehört nicht zu diesem Paket.
  3. **`AGENTS.md` bleibt unberührt.** Es nennt `minimumReleaseAge` nur im turbo-Absatz (116), und der beschreibt weiterhin den Zustand.
  4. **Die Installationsprobe, in einem frischen Baum.** Sie ist der eigentliche Nachweis dieses Pakets, und sie gehört nicht in den Arbeitsbaum: dort meldet pnpm »Already up to date« und erreicht die Lieferketten-Prüfung nie. Aus dem Wurzelverzeichnis des Repositories, der Pfad ist der aus dem Kopf dieses Plans:

     ```bash
     PROBE=/tmp/claude-1000/-home-spw-spaceland-shadow-objects/4330786b-e3e3-43ca-ab76-3ae0412a90c4/scratchpad/paket-19.install-probe
     rm -rf "$PROBE" && mkdir -p "$PROBE"
     git archive HEAD | tar -x -C "$PROBE"
     cp pnpm-workspace.yaml "$PROBE/pnpm-workspace.yaml"
     (cd "$PROBE" && pnpm install --frozen-lockfile)
     ```

     Erwartet, und jede Abweichung ist ein Befund für den Report statt ein Commit: Exit 0, in der Ausgabe die Zeile `✓ Lockfile passes supply-chain policies (254 entries in …)` — das ist die Karenzprüfung über alle Lockfile-Einträge, ohne eine einzige Ausnahme. Danach im Probebaum nachsehen und beides in den Report: `grep -n '^minimumReleaseAgeExclude' "$PROBE/pnpm-workspace.yaml"` bleibt ohne Treffer (pnpm hat nichts zurückgeschrieben), und `cmp "$PROBE/pnpm-lock.yaml" pnpm-lock.yaml` schweigt (die Lockfile ist byteweise dieselbe). Zum Schluss `rm -rf "$PROBE"` — der Baum trägt ein vollständiges `node_modules` und wird nach der Messung nicht mehr gebraucht.
  5. **Sieben Zählproben**, jede mit ihrer Ausgabe in den Report:
     - `grep -n '^minimumReleaseAgeExclude:' pnpm-workspace.yaml` liefert keinen Treffer. Vorher genau einen, auf Zeile 114.
     - `grep -c minimumReleaseAgeExclude pnpm-workspace.yaml` meldet `1` und **nicht** `0`: der Kommentar über `turbo` (Zeile 90) nennt den Mechanismus weiter und bleibt stehen. Eine `0` hieße, dass Schritt 1 zu viel genommen hat.
     - `wc -l -c pnpm-workspace.yaml` meldet `107 4470` (vorher `115 4917`), und `tail -c1 pnpm-workspace.yaml | xxd -p` meldet weiterhin `0a`. Weicht eine der drei Zahlen ab, geht der Befund in den Report statt in den Commit.
     - `git grep -n minimumReleaseAgeExclude -- ':!CHANGELOG.md' ':!*/CHANGELOG.md' ':!audit.html' ':!remediation-plan.md'` liefert genau zwei Treffer, beide in Text, der den Mechanismus erklärt statt ihn zu konfigurieren: `pnpm-workspace.yaml:90` und `CLAUDE.md:27`.
     - `git status --short` führt genau drei geänderte Dateien und die untrackte `remediation-plan.md`. `pnpm-lock.yaml` steht **nicht** darin.
     - `pnpm exec biome check . --max-diagnostics 1000` meldet weiterhin »Checked 219 files … No fixes applied« ohne Diagnostikum, `pnpm exec biome format .` weiterhin »Checked 206 files … No fixes applied«. Keine der beiden Zahlen bewegt sich: Biome ignoriert `pnpm-workspace.yaml` (gemessen am 2026-08-26 — `biome check pnpm-workspace.yaml` gibt den Pfad als »provided but ignored« zurück), liest kein Markdown und schließt `**/CHANGELOG.md` zusätzlich aus.
     - `git diff --stat`: genau drei Dateien, keine mehr.
  6. **Wurzel-`CHANGELOG.md`.** Ganz oben ein neuer datierter Abschnitt, über `## 2026-08-26 — the readme says what the custom elements do` (heute Zeile 7), mit der Überschrift

     ```
     ## 2026-08-26 — no package is exempt from the release-age cooling-off
     ```

     Darunter zwei Bullets in der Form, die der oberste Abschnitt der Datei führt: der Pfad fett und in Backticks, Doppelpunkt, dann die Sätze; umbrochen bei rund 95 Zeichen mit zwei Leerzeichen Einzug in den Folgezeilen, Gedankenstrich `—`. Der Wortlaut steht hier, er wird nicht umformuliert:

     ```
     - **`pnpm-workspace.yaml`:** `minimumReleaseAgeExclude` is gone, and with it the last package
       that stood outside pnpm's one-day `minimumReleaseAge`. A clean `pnpm install
       --frozen-lockfile` reports "Lockfile passes supply-chain policies (254 entries)" with no
       exemption in the file, so the cooling-off that keeps a freshly compromised third-party
       release out of the tree now covers every entry. pnpm writes such an entry itself while a
       release is younger than the cutoff; this one has aged past it.
     - **`CLAUDE.md`:** the paragraph on the eventize/signalize pair names what happens on a bump
       to a fresh beta — the install is blocked until the release is listed under
       `minimumReleaseAgeExclude`, and the entry is removed again once the release has aged past
       the cutoff — instead of describing the key as one the file carries.
     ```

     Geschrieben wird **auf Englisch** — der Block oben ist der Wortlaut, nicht eine Beschreibung davon. Keine Finding-ID. Ein Changelog darf den Übergang benennen, das ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreiben. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert und behält ihren Zeilenumbruch am Ende.
  7. **Nicht anfassen:**
     - `pnpm-lock.yaml`. Sie bewegt sich nicht und darf es nicht — die Begründung samt Messung steht in der Anmerkung dazu. Erscheint sie im `git status`, ist das ein Befund für den Report.
     - Der Kommentar über `turbo` in `pnpm-workspace.yaml:88-90` und der Katalogeintrag `turbo: ^2.10.11` darunter. Beide stimmen; nur die Zahl in `CLAUDE.md:25` und `AGENTS.md:116` stimmt nicht, und die ist ein Nebenbefund und keine Aufgabe dieses Pakets.
     - Der Katalogeintrag `'@spearwolf/signalize': 1.0.0-beta.0` (`pnpm-workspace.yaml:31`) samt seinem Kommentarblock. Die exakte Version ist ein anderer Mechanismus als die Karenzausnahme.
     - `CHANGELOG.md:497`, der Abschnitt, der die Ausnahme eingeführt hat. Ein Changelog berichtet über seinen Tag; die Historie ist konserviert.
     - `AGENTS.md`, `packages/shadow-objects/CHANGELOG.md`, `packages/shae-offscreen-canvas/CHANGELOG.md`.
     - Kein `pnpm make:todo` — es wird kein TODO-Kommentar angefasst. Kein `pnpm install` im Arbeitsbaum: er beweist nichts (siehe Anmerkung), und die Lockfile soll sich gerade nicht bewegen. Die Probe läuft im Baum aus Schritt 4.
     - Die vier `distContract`-Erwartungsdateien. Unter `dist/` und `.npm-pkg/` bewegt sich keine Datei.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: Alle vier grün. `build`, `typecheck` und `test` sind **keine** Cache-Treffer: `pnpm-workspace.yaml` steht in `globalDependencies` von `turbo.json`, die Änderung entwertet damit jeden turbo-Cache, und alle vier Pakete laufen von vorn durch (Baseline 1m01s). Das ist erwartet und kein Fehlersignal. Die Zahlen darin bewegen sich nicht, weil sich keine Zeile Quelltext bewegt: 802/379/123/645 Tests und Coverage 92,89 % (3385/3644). `pnpm lint` läuft an turbo vorbei und meldet »Checked 219 files … No fixes applied« ohne Diagnostikum — Biome ignoriert `pnpm-workspace.yaml`, liest kein Markdown und schließt `**/CHANGELOG.md` aus. `src/distContract.spec.ts` und `src/distContract.spec.js` bleiben grün. Jede Bewegung in einer dieser Zahlen ist neu und blockiert.
- Commit: `build(deps): no package is exempt from the release-age cooling-off`
- Ergebnis: 1 Runde · der Nebenbefund an `pnpm-workspace.yaml:114-115` behoben — `minimumReleaseAgeExclude` und sein Kommentarblock sind weg, die Datei endet nach 107 Zeilen mit `three: '>=0.180.0'`, `CLAUDE.md:27` beschreibt den Mechanismus statt eines Schlüssels, den die Datei nicht mehr führt, und die Wurzel-`CHANGELOG.md` trägt den datierten Abschnitt · Installationsprobe im frischen Baum: Exit 0, pnpm schreibt nichts zurück, `pnpm-lock.yaml` byteweise unverändert · alle sieben Zählproben getroffen · Review ohne kritische oder wichtige Befunde · kein Regressionstest, weil keine Zeile Quelltext bewegt wurde · klein: Die Installationsprobe meldete »Lockfile passes supply-chain policies (verified 7m ago)« statt der Zeile mit der Eintragszahl — pnpm hält seit Version 11 einen benutzerweiten Verifikationscache über Lockfile-Hash und Policy und gibt bei einem Treffer die kürzere Form aus. Die Prüfung selbst hat stattgefunden; wer die volle Zeile sehen will, braucht einen kalten Cache.
- Nebenbefunde: → Queue (einer, aus Zug 0)
- Folgen: keine
- Schnittstellen: keine — die Änderung bewegt keine Zeile unter `packages/*/src/**`, `dist/` und `.npm-pkg/` sind unberührt. Für den nächsten signalize-Beta-Bump gilt, was `CLAUDE.md:27` jetzt sagt: pnpm legt den Ausnahmeeintrag selbst an, solange der Release jünger als die Karenz ist, und er wird wieder entfernt, sobald er alt genug ist.

### [x] 20. Die Holdback-Begründungen nennen den Mechanismus statt einer Version
- Nebenbefund: `CLAUDE.md:25` und `AGENTS.md:116` (low)
- Ziel: Beide Anleitungen sagen für den turbo-Holdback, wo der Eintrag steht und warum er zurückgehalten wird, ohne daneben eine eigene Versionsangabe zu führen, die der Katalog widerlegen kann.
- Bereich: `CLAUDE.md`, `AGENTS.md`, Wurzel-`CHANGELOG.md`
- Hängt ab von: 19
- Hash: f42750e
- Modell: mittlere Stufe
- Effort: low
- Anmerkung (Abgleich, 2026-08-26 — **beide Fundstellen stehen unverändert an ihrer Zeile**): `CLAUDE.md:25` trägt die Aufzählungszeile, die mit ``- **`turbo: ^2.10.9`** — pnpm 11 defaults`` beginnt; `AGENTS.md:116` trägt im Absatz »Deliberate holdbacks« die Klammer ``` `turbo` (2.10.9 — pnpm's one-day `minimumReleaseAge`) ```. Der Katalog führt `turbo: ^2.10.11` (`pnpm-workspace.yaml:91`), und `pnpm-lock.yaml:1388` löst auf `turbo@2.10.11` auf — die Anleitungen liegen zwei Patches darunter. Kein Paket dieses Laufs hat eine der beiden Zeilen bewegt: Paket 19 (`81b7f64`) hat `CLAUDE.md:27` umgeschrieben und Zeile 25 zwei Zeilen darüber ausdrücklich stehen lassen. `git grep -n '2\.10\.9'` findet im ganzen Repository vier Treffer — diese beiden und `CHANGELOG.md:522` und `:526`, die dazu unten stehen.
- Anmerkung (**die Begründung des Holdbacks stimmt und wird nicht angefasst**): Nachgemessen am 2026-08-26 statt aus dem Befund übernommen — `npm view turbo dist-tags` meldet `latest: 2.10.12`, und `npm view turbo versions` endet auf `2.10.11`, `2.10.12`. Zwischen Katalogstand und neuester Veröffentlichung liegt genau ein Patch, der Kommentar in `pnpm-workspace.yaml:88-90` beschreibt den Zustand also richtig. Falsch ist allein die Zahl in den beiden Anleitungen; die Sätze, die den Grund tragen, bleiben Wort für Wort stehen.
- Anmerkung (**Entscheidung: die Zahl geht raus, statt korrigiert zu werden**): Der Grobplan-Block ließ diese Wahl offen und band sie an das Paket, das den Befund aufnimmt. Sie fällt gegen die Zahl, aus vier Gründen. Erstens ist sie eine Zweitschrift: beide Dateien erklären selbst, dass Versionen ausschließlich im `catalog:` von `pnpm-workspace.yaml` stehen (`CLAUDE.md:20`, `AGENTS.md:114`), und beide Sätze zeigen für die Begründung ohnehin auf genau diese Datei — die Zahl ist dort einen `grep` entfernt und geht durch das Streichen nirgends verloren. Zweitens ist sie einmal lautlos verrottet, zwei Patches tief, und die Korrektur auf `^2.10.11` stellt denselben Defekt in einem Bump wieder her; was nicht verrottet, ist die Regel, und die Regel ist das, wofür die Aufzählung existiert (»Don't "fix" them by bumping to latest«). Drittens steht der Beleg in der defekten Zeile selbst: `AGENTS.md:116` schreibt vite als »override at 7.x« — eine Linie, eine Regel — und turbo als »2.10.9« — einen Pin. Zwei Formulierungen in einem Satz, und die, die den Pin nannte, ist die, die dieses Paket repariert. Viertens gibt es die Präzedenz in diesem Lauf: Paket 18 (`af966db`) hat in `README.md` eine Zeilenzahl durch drei belegte Verhalten ersetzt, statt sie neu zu zählen, mit derselben Begründung — eine Zahl, die niemanden zur Korrektur auffordert, wenn sie falsch wird.
- Anmerkung (**`CLAUDE.md:24` behält seine Version, und das ist kein Versehen**): Die Zeile darüber führt ``**`overrides: {vite: ^7.3.6}`**`` und stimmt mit `pnpm-workspace.yaml:13` überein — nachgesehen, nicht angenommen. Sie ist kein Nebenbefund: Nebenbefund ist, was auch ohne dieses Paket falsch wäre, und diese Zeile ist richtig. Sie zitiert außerdem den vollständigen `overrides`-Block und macht damit die Aussage, auf die ihr eigener Schlusssatz hinausläuft (»hence an override rather than a catalog pin«) — das ist Struktur und nicht bloß eine Zahl. Der Implementierer lässt sie unverändert; dass die beiden Aufzählungspunkte danach verschieden aussehen, ist gewollt, weil sie zwei verschiedene Mechanismen beschreiben.
- Anmerkung (**die Wurzel-`CHANGELOG.md` bekommt einen Abschnitt — die Anmerkung des Grobplans ist gemessen falsch**): Dort stand, beide Dateien seien Anleitungen für Beitragende und die Wurzel-`CHANGELOG.md` führe Änderungen an ihnen nicht. `grep -n 'CLAUDE\.md\|AGENTS\.md' CHANGELOG.md` widerlegt das mit sechs Treffern (15, 40, 70, 87, 564, 605), und die beiden jüngsten stammen aus diesem Lauf: Paket 19 (`81b7f64`) hat `CLAUDE.md:27` in Zeile 15 eingetragen, Paket 17 (`47da67b`) den Changelog-Abschnitt in Zeile 40. Die Zuständigkeitstabelle in `CLAUDE.md:102` weist »turbo/pnpm setup« ausdrücklich der Wurzel-`CHANGELOG.md` zu, und die Holdback-Notiz ist genau das. Ein Eintrag in `packages/shadow-objects/CHANGELOG.md` oder im Canvas-Changelog entfällt: die Änderung fasst keine Zeile unter `packages/*/src/**` an.
- Anmerkung (**der übrige Versionsabgleich beider Dateien ist durchgeführt und ohne Befund**): Der Grobplan gab auf, im selben Zug zu prüfen, ob weitere Versionsangaben vom Katalog abweichen. Alle acht Zeilen der Toolchain-Tabellen (`CLAUDE.md:11-18`, `AGENTS.md:105-112`) sind gegen `pnpm-workspace.yaml` und `package.json` gehalten: `pnpm` 11 gegen `packageManager: pnpm@11.21.0`, `turborepo` 2.10 gegen `^2.10.11`, `tsc` 7.x gegen `typescript: ^7.0.2`, `esbuild` 0.28 gegen `^0.28.2`, `vitest` 4 gegen `4.1.10`, `@playwright/test` 1.62 gegen `^1.62.1`, `biome` 2.5 gegen `^2.5.9`, `vite` 7 gegen `^7.3.6`. Dazu `CLAUDE.md:24` gegen `overrides.vite`, `CLAUDE.md:27` (`1.0.x` auf `^6.0.0`) gegen die beiden spearwolf-Einträge, `CLAUDE.md:29` (»currently just `esbuild`«) gegen `allowBuilds`, und `AGENTS.md:114` (`three` als einziger benannter Katalog) gegen den `catalogs:`-Block. Keine weitere Abweichung. Das Paket bleibt damit bei zwei Fundstellen.
- Anmerkung (**`CHANGELOG.md:522` und `:526` bleiben Wort für Wort stehen**): Beide nennen `2.10.9`, und beide stehen in einem datierten Abschnitt, der über seinen eigenen Tag berichtet — Zeile 522 erklärt, warum der Katalog damals nicht auf `^2.10.10` ging, Zeile 526 listet den Bump `2.9.18 → 2.10.9`. Ein Changelog wird nicht nachgeführt, wenn die Welt weiterläuft; die Historie ist konserviert. Paket 19 hat für den identischen Fall (`CHANGELOG.md:497`) genauso entschieden. Wer sie anfasst, erzeugt einen Reviewbefund und keine Verbesserung.
- Anmerkung (**Restplan**): Keine Umsortierung, kein neuer Schnitt, kein neues Paket, keine Folge zu verteilen. Paket 20 ist das letzte und zugleich die Drain-Runde für den einzigen Eintrag, der unter »Offene Befunde« noch offen war; alle übrigen Einträge dort stehen auf `[x]` mit ihrem Ausgang. Zug 0 hat keinen neuen Nebenbefund erzeugt — die vier Treffer auf `2.10.9` sind vollständig eingeordnet, und der Versionsabgleich beider Dateien lief ohne weiteren Fund. Mit dem Commit dieses Pakets geht der Abschnitt auf null, und die Abschlussbedingung des Laufs ist erfüllt.
- Dateien: `CLAUDE.md` · `AGENTS.md` · `CHANGELOG.md` (Wurzel)
- Kein Regressionstest: Das Paket behebt keinen Korrektheitsfehler. Es tauscht in zwei Anleitungen je einen Textabschnitt innerhalb einer Zeile und hängt einen Changelog-Abschnitt an; es bewegt keine Zeile Quelltext, keine Konfiguration und keine Abhängigkeit, und keine Spec dieses Repositories liest eine der drei Dateien. Den Nachweis führen die acht Zählproben aus Schritt 4 und der Verify-Lauf.
- Vorgehen:
  1. **`CLAUDE.md`, Zeile 25.** Nur der fette Kopf der Aufzählungszeile bewegt sich, der Rest der Zeile bleibt Zeichen für Zeichen stehen. Aus

     ```
     - **`turbo: ^2.10.9`** — pnpm 11 defaults `minimumReleaseAge` to one day and re-applies it to every lockfile entry on install, so a lockfile pinning a release younger than that fails `--frozen-lockfile` on a clean runner.
     ```

     wird

     ```
     - **`turbo`, held back from the newest patch** — pnpm 11 defaults `minimumReleaseAge` to one day and re-applies it to every lockfile entry on install, so a lockfile pinning a release younger than that fails `--frozen-lockfile` on a clean runner.
     ```

     Die Backticks umschließen jetzt nur noch den Katalogschlüssel `turbo`, weil das der Eintrag ist, den der Leser in `pnpm-workspace.yaml` sucht; der Zusatz steht fett, aber ohne Backticks. Die Zeile bleibt eine einzige lange Zeile wie jede andere dieser Datei. Sonst wird an `CLAUDE.md` nichts angefasst — insbesondere nicht Zeile 24 mit `^7.3.6` (sie stimmt, siehe die Anmerkung dazu), nicht der Einleitungssatz in Zeile 22 und nicht die Toolchain-Tabelle.
  2. **`AGENTS.md`, Zeile 116.** Nur die Klammer hinter `turbo` bewegt sich, der übrige Absatz bleibt Zeichen für Zeichen stehen. Aus

     ```
     **Deliberate holdbacks.** `vite` (override at 7.x — Oxc does not lower the `@signal … accessor` decorators) and `turbo` (2.10.9 — pnpm's one-day `minimumReleaseAge`) are pinned below latest on purpose. Each carries its reason as a comment in `pnpm-workspace.yaml`; `CLAUDE.md` has the long form. Bumping one without reading the comment breaks the test suite or the install.
     ```

     wird

     ```
     **Deliberate holdbacks.** `vite` (override at 7.x — Oxc does not lower the `@signal … accessor` decorators) and `turbo` (catalog entry — pnpm's one-day `minimumReleaseAge`) are pinned below latest on purpose. Each carries its reason as a comment in `pnpm-workspace.yaml`; `CLAUDE.md` has the long form. Bumping one without reading the comment breaks the test suite or the install.
     ```

     Damit nennt jede der beiden Klammern dasselbe: wo der Holdback lebt, dann seinen Grund — vite in einem `overrides`-Block auf der 7er-Linie, turbo als Katalogeintrag. Wie weit unter »latest« beide stehen, sagt das Satzende (»are pinned below latest on purpose«) für beide zugleich. Sonst wird an `AGENTS.md` nichts angefasst, auch nicht die Toolchain-Tabelle darüber.
  3. **Wurzel-`CHANGELOG.md`.** Ganz oben ein neuer datierter Abschnitt, über `## 2026-08-26 — no package is exempt from the release-age cooling-off` (heute Zeile 7) und unter der Leerzeile 6. Der Wortlaut steht hier und wird nicht umformuliert; er ist auf rund 95 Zeichen umbrochen, mit zwei Leerzeichen Einzug in den Folgezeilen, wie die drei Abschnitte darunter:

     ```
     ## 2026-08-26 — the holdback notes name the mechanism, not a version

     - **`CLAUDE.md`, `AGENTS.md`:** the note on the deliberate `turbo` holdback names where the
       entry lives and why it is held — a `catalog:` entry kept off the newest patch, because pnpm's
       one-day `minimumReleaseAge` fails `--frozen-lockfile` on a clean runner for anything younger
       than the cutoff — instead of repeating the pinned range. `pnpm-workspace.yaml` is the single
       source of truth for dependency versions, and a second copy of a range in a contributor guide
       turns false at the next bump with nothing to prompt a correction. The `vite` half of the same
       sentence in `AGENTS.md` names the release line rather than a pin, and it has stayed true.
     ```

     Danach eine Leerzeile, dann folgt der bisherige oberste Abschnitt unverändert. Geschrieben wird auf Englisch — der Block oben ist der Wortlaut, keine Beschreibung davon. Keine Finding-ID. Dass ein Changelog den Übergang benennen darf, ist sein Zweck; die Regel gegen den Rückblick im Kopf dieses Plans gilt Code-Kommentaren und Dokumentation, die einen Zustand beschreibt. `**/CHANGELOG.md` steht unter den Ausschlüssen von Biome, die Datei wird also nicht umformatiert.
  4. **Acht Zählproben**, jede mit ihrer Ausgabe in den Report. Die erwarteten Werte sind nicht gerechnet, sondern gemessen: Zug 0 hat die drei Dateien am 2026-08-26 in eine Kopie außerhalb des Arbeitsbaums gelegt, die Schritte 1 bis 3 dort ausgeführt und jede Probe einmal laufen lassen. Trifft eine Zahl nicht, weicht die Änderung vom Wortlaut oben ab:
     - `git grep -n '2\.10\.9'` liefert genau zwei Treffer, beide in `CHANGELOG.md` (522 und 526). Vorher vier — die beiden zusätzlichen waren `CLAUDE.md:25` und `AGENTS.md:116`. Ein dritter Treffer außerhalb von `CHANGELOG.md` heißt, dass Schritt 1 oder 2 danebengegangen ist; null Treffer heißt, dass jemand die Historie angefasst hat.
     - `grep -n 'held back from the newest patch' CLAUDE.md` liefert genau einen Treffer, auf Zeile 25.
     - `grep -c '\^7\.3\.6' CLAUDE.md` meldet weiterhin `1` — Zeile 24 ist unberührt.
     - `grep -n 'catalog entry — pnpm' AGENTS.md` liefert genau einen Treffer, auf Zeile 116.
     - `wc -l -c CLAUDE.md AGENTS.md CHANGELOG.md` meldet `122 16837`, `120 8552` und `640 69952` (vorher `122 16813`, `120 8545`, `630 69214`). Weicht eine der sechs Zahlen ab, geht der Befund in den Report statt in den Commit.
     - `sed -n '7p' CHANGELOG.md` gibt die neue Überschrift aus, `sed -n '17p' CHANGELOG.md` die bisher oberste (`## 2026-08-26 — no package is exempt from the release-age cooling-off`).
     - `pnpm exec biome check . --max-diagnostics 1000` meldet weiterhin »Checked 219 files … No fixes applied« ohne Diagnostikum, `pnpm exec biome format .` weiterhin »Checked 206 files … No fixes applied«. Beide Zahlen sind am 2026-08-26 vor der Änderung gemessen; Biome liest kein Markdown und schließt `**/CHANGELOG.md` zusätzlich aus, also bewegt sich keine von beiden.
     - `git status --short` und `git diff --stat` führen genau drei geänderte Dateien, dazu die untrackte `remediation-plan.md`. `pnpm-lock.yaml` und `pnpm-workspace.yaml` stehen **nicht** darin.
  5. **Nicht anfassen:**
     - `pnpm-workspace.yaml`. Der Katalogeintrag `turbo: ^2.10.11` (91) und sein Kommentar (88-90) stimmen und sind nachgemessen. Dieses Paket ändert die Anleitungen, nicht die Konfiguration; ein Bump von turbo ist ausdrücklich nicht sein Gegenstand.
     - `CHANGELOG.md:522` und `:526`. Datierte Abschnitte berichten über ihren Tag, siehe die Anmerkung dazu.
     - `CLAUDE.md:24` (`overrides: {vite: ^7.3.6}`) und die Toolchain-Tabellen beider Dateien. Alle geprüft, alle in Übereinstimmung mit dem Katalog.
     - `packages/shadow-objects/CHANGELOG.md` und `packages/shae-offscreen-canvas/CHANGELOG.md`. Es bewegt sich keine Zeile unter `packages/*/src/**`.
     - Kein `pnpm make:todo` — es wird kein TODO-Kommentar angefasst. Kein `pnpm install` — es bewegt sich keine Abhängigkeit.
     - Die vier `distContract`-Erwartungsdateien. Unter `dist/` und `.npm-pkg/` bewegt sich nichts.
- Verify: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- Erwartet beim Verify: Alle vier grün. `build`, `typecheck` und `test` sind **Cache-Treffer** und das ist erwartet: `globalDependencies` in `turbo.json:4` führt `tsconfig.json`, `biome.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` und `scripts/**` — keine der drei geänderten Dateien steht darin, und keine liegt in den `inputs` einer Task. Turbo spielt die Ergebnisse aus dem Cache zurück, mit den Zahlen des letzten Laufs: 802/379/123/645 Tests, Coverage 92,89 % (3385/3644). `pnpm lint` läuft an turbo vorbei und meldet »Checked 219 files … No fixes applied« ohne Diagnostikum. Ein voller Neulauf statt der Cache-Treffer ist kein Fehler, sondern ein kalter Cache; abweichende Zahlen darin sind einer.
- Commit: `docs: the holdback notes name the mechanism instead of a version that ages`
- Ergebnis: 1 Runde · der Nebenbefund an `CLAUDE.md:25` und `AGENTS.md:116` ist behoben — beide Holdback-Notizen nennen jetzt den Mechanismus (`turbo`, held back from the newest patch; catalog entry) statt der Version `2.10.9`, die zwei Patches hinter dem Katalog zurücklag · Wurzel-`CHANGELOG.md` trägt den datierten Abschnitt dazu · kein Regressionstest, weil kein Korrektheitsfehler: den Nachweis führen die acht Zählproben des Detailplans, die alle treffen, und der eigene Verify-Lauf · der Reviewer meldet keinen Befund, weder kritisch noch wichtig noch klein · `git grep -n '2\.10\.9'` liefert nur noch die zwei historischen Treffer in `CHANGELOG.md`
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine — das Paket bewegt keine Zeile Quelltext, keine Konfiguration und keine Abhängigkeit
