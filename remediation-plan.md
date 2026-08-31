# Remediation-Plan — @spearwolf/shadow-objects (Monorepo)

Quelle: ./audit.html vom 2026-08-30 · Branch: main · erstellt: 2026-08-31
Baseline: `pnpm build` ✓ · `pnpm typecheck` ✓ · `pnpm lint` ✓ · `pnpm test` ✓
(7 turbo-Tasks, 654 E2E-Fälle, Coverage 93,63 % Statements) — nichts vorbestehend rot
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-shadow-objects/e1d046db-ac86-4a9d-afe9-ab8c348c0771/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Stand: 2026-08-31 · Lauf abgeschlossen · beide Pakete committet (f3f7bf1, 3fa2fa6) ·
Befund-Queue geleert, alle vier Einträge als neue Findings ins Audit übernommen ·
nichts blockiert · voller Verify-Lauf ohne Turbo-Cache grün
Scope: 1 von 45 Findings (DEP-001, medium) plus ein vom Nutzer beauftragter Dependency-Bump, der kein Finding ist
Scope-Regel: alles ab medium aufwärts, jede Kategorie — gilt für Befunde, die erst im Lauf auffallen. Aus dem bereits vorliegenden Audit-Backlog hat der Nutzer nur DEP-001 gezogen; Auswahl und Regel gehen hier absichtlich auseinander, und die Regel entscheidet allein über das, was das Audit noch nicht kennt.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen

- **Release-Age:** eventize 6.2.0 (veröffentlicht 2026-08-30 16:06 UTC) und
  signalize 1.0.0-beta.1 (2026-08-30 20:35 UTC) sind beide jünger als pnpms
  einen Tag langes `minimumReleaseAge`. Der Install darf sie über
  `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` hereinlassen; pnpm
  schreibt die versionsgenauen Einträge selbst und nimmt sie beim nächsten
  Install wieder weg, sobald die Releases über die Grenze gealtert sind. Das
  kehrt die im Root-CHANGELOG vom 2026-08-26 festgehaltene Linie für einen Tag
  um und gehört deshalb dorthin. (2026-08-31)
- **eventize-Range:** die Katalog-Range zieht auf `^6.2.0` mit, statt bei
  `^6.0.0` stehenzubleiben. Damit ändert sich die publizierte
  `dependencies`-Angabe beider Pakete, und beide CHANGELOGs sagen es.
  (2026-08-31)
- **signalize-Range:** der exakte Pin bleibt ein exakter Pin und wandert von
  `1.0.0-beta.0` auf `1.0.0-beta.1`. (2026-08-31)
- **Neu auffallende Befunde:** ab medium aufwärts werden sie in diesem Lauf mit
  behoben, gleich welcher Kategorie, auch wenn das Audit sie nicht kennt.
  Darunter gehen sie als neues, offenes Finding mit Fundstelle ins Audit
  zurück. Die zwei Pakete unten sind damit eine Untergrenze. (2026-08-31)
- **Semver:** keine Versionsanhebung in diesem Lauf. Beide Pakete sammeln unter
  `## [Unreleased]` und heben ihre Version beim Release, nicht je Änderung — die
  letzte Anhebung eines `version`-Feldes liegt im Juli 2024. Der Lauf bewegt
  keine öffentliche Oberfläche: `exports`, `main`, `module` und `types` bleiben,
  wie sie sind, und keine Quelldatei ist angefasst. Die deklarierten
  Dependency-Ranges wandern, standen aber im selben Unreleased-Abschnitt schon
  als breaking; die Einstufung beider Pakete bleibt damit »minor« — `0.33.0` →
  `0.34.0` und `0.6.0` → `0.7.0`, so wie die Blockquotes es tragen. (2026-08-31)
- **DEP-001 im Audit:** wandert nach Abschluss in die `acknowledged`-Sektion,
  nicht auf `resolved`. Der Beta-Pin ist eine bewusste Entscheidung des
  Projekts; ein späterer Audit-Lauf soll ihn nicht neu als Finding aufwerfen.
  Die Doku-Hälfte der Empfehlung — CHANGELOG-Ausblick und README-Hinweis —
  wird trotzdem umgesetzt. (2026-08-31)

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

Projektspezifisch, aus `CLAUDE.md` und `AGENTS.md`:

- Doku und Code-Kommentare in Englisch, Doku in Markdown. Commit-Messages in
  Englisch, im Stil, den `git log` zeigt.
- Verbotene Analogien: "shadow theater", "puppet", "puppeteer", "light world",
  "screen". ECS-Terminologie benutzen (Entity, Component, Kernel, View, Token).
- Dependency-Versionen leben ausschließlich in `pnpm-workspace.yaml` unter
  `catalog:`; die Manifeste referenzieren als `"<dep>": "catalog:"`. Keine
  Version in einer `package.json` eines Pakets.
- Drei CHANGELOGs, je nach Betroffenheit: `packages/shadow-objects/`,
  `packages/shae-offscreen-canvas/` (publizierte Pakete, unter
  `## [Unreleased]`) und die Wurzel (Monorepo, datierter Abschnitt).
- Doku ist Teil des öffentlichen API-Vertrags: eine Änderung daran fasst
  `docs/`, `README.md` und `CHANGELOG.md` desselben Pakets im selben Zug an.
- `AGENTS.md` wird nach einer Änderung auf Veralterung gegengelesen.

## Vorbestehende Fehler

Keine. Die Baseline ist auf allen vier Kommandos grün.

## Offene Befunde

Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.

- [x] `packages/shae-offscreen-canvas/CHANGELOG.md:10` — die Datei führt
  ausschließlich `## [Unreleased]`. Für die publizierte `0.6.0` und alles davor
  gibt es keinen Abschnitt, obwohl der Kopf auf Keep a Changelog verweist; wer
  `0.6.0` installiert hat, findet dort nichts über das, was er hat. Aus Paket 1.
  Severity low → Audit · übernommen als DX-034 (2026-08-31)
- [x] `packages/shadow-objects/CHANGELOG.md`, Bullet `**Size:**` — der Halbsatz
  »base64-inlined inside the worker« beschreibt das gebaute Artefakt nicht:
  `dist/bundle.js` enthält keinen base64-String, der Worker steckt als
  `new Blob(...)` plus `createObjectURL` darin. Die Kopie liegt 1:1 im Bundle,
  worauf die Größenrechnung derselben Zeile gerade beruht. Aus Paket 1.
  Severity low → Audit · übernommen als DX-035 (2026-08-31)
- [x] `packages/shadow-objects/README.md:17` — `dependencies` steht dreimal in
  zwei Sätzen, mit wechselndem Bezug. Vom Reviewer aus Paket 2, bewusst nicht
  behoben. Severity info → Audit · übernommen als DX-036 (2026-08-31)
- [x] `packages/shadow-objects/docs/getting-started.md:23` — ein »—«, wo die
  Datei sonst ` -- ` schreibt. Vom Reviewer aus Paket 2, bewusst nicht behoben.
  Severity info → Audit · übernommen als DX-037 (2026-08-31)

## Pakete

### [x] 1. eventize auf 6.2.0, signalize auf 1.0.0-beta.1

- Findings: — (vom Nutzer beauftragter Bump, kein Audit-Finding)
- Ziel: Beide Reaktivitäts-Abhängigkeiten stehen auf ihrer aktuellen Fassung,
  mit genau einer Kopie jeder von beiden im Baum, und die drei CHANGELOGs
  nennen die Ranges, die danach publiziert werden.
- Bereich: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, die drei CHANGELOGs
- Hängt ab von: —
- Hash: f3f7bf1
- Modell: stärkste Stufe (opus) — die Mechanik ist trivial, die drei
  CHANGELOG-Einträge sind es nicht: Hausstimme, kein Rückblick auf den
  Vorzustand, und eine verlorene Runde kostet hier den vollen Verify-Lauf
  samt E2E über drei Browser.
- Effort: medium

**Abgleich, 2026-08-31 — jede Zeile nachgemessen, nicht vermutet:**

- eventize 6.0.0 → 6.2.0 ist rein additiv. Der Diff über `lib/index.d.ts`
  besteht aus `emitSafe`, `emitSafeAsync`, `emitStrict`, `emitStrictAsync`
  samt ihren freien Funktionen; entfernt wird nichts, und `exports`, `main`,
  `module`, `types`, `sideEffects`, `engines` der `package.json` sind zwischen
  beiden Fassungen identisch. Keine Quelländerung im Repo zu erwarten.
- signalize beta.0 → beta.1 ist ein reines Dependency-Release. `lib/index.d.ts`
  und `lib/decorators.d.ts` identisch, der `dist/`-Chunk bis auf Versionsbanner
  und Chunk-Hash byte-identisch; geändert hat sich allein die devDependency auf
  eventize (`^6.0.0` → `^6.2.0`). Die **Peer-Range bleibt `^6.0.0`**, und
  `^6.2.0` erfüllt sie.
- Beide Releases liegen unter pnpms `minimumReleaseAge` von einem Tag: eventize
  6.2.0 seit 2026-08-30 16:06 UTC, signalize beta.1 seit 2026-08-30 20:35 UTC,
  Zug 0 lief am 2026-08-31 06:07 UTC. Der Exclude-Block ist Pflicht, nicht Kür.
- `src/distContract.package.json` beider publizierter Pakete prüft
  `dependencyNames`, nie eine Version. Die beiden Contract-Erwartungen bleiben
  unberührt — bestätigt der Verify-Lauf, nicht dieser Plan.
- Die Zeile `**Size:**` in `packages/shadow-objects/CHANGELOG.md` nennt
  189,7 kB minified und 58,1 kB gzipped. Gemessen an HEAD sind es 222 373 Byte
  (222,4 kB) und 68 091 Byte (68,1 kB): die Zahl ist schon vor diesem Paket
  veraltet. Der Bump verschiebt sie erneut, deshalb wird sie hier **gemessen
  und neu geschrieben**, nicht fortgerechnet.
- Vorlage für den ganzen Vorgang ist Commit `1efde70` (derselbe Bump eine Stufe
  tiefer) und `81b7f64` (die Entfernung des Exclude-Blocks). Beide anschauen.
- Dateien: `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
  `packages/shadow-objects/CHANGELOG.md`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`, `CHANGELOG.md`
- Vorgehen:
  1. `pnpm-workspace.yaml`, Block `catalog:` unter
     `# --- runtime deps (shipped) ---`: `'@spearwolf/eventize': ^6.0.0` wird
     `^6.2.0`, `'@spearwolf/signalize': 1.0.0-beta.0` wird `1.0.0-beta.1`. Der
     fünfzeilige Kommentar über dem Paar bleibt Wort für Wort stehen — er nennt
     die Peer-Range `^6.0.0` und die realm-weite Symbol-Kollision, und beides
     gilt unverändert.
  2. Ans Ende derselben Datei, hinter den `catalogs:`-Block, kommt wieder:

     ```yaml
     # `minimumReleaseAge` (1 day, pnpm >=11 default) exists to keep a freshly
     # compromised third-party release out of the tree. The @spearwolf packages
     # are first-party — published from this account, reviewed here — so the
     # cooling-off buys nothing and only blocks the install. Written by pnpm on
     # install; the entries are version-exact and can go once the releases are a
     # day old.
     minimumReleaseAgeExclude:
       - '@spearwolf/eventize@6.2.0'
       - '@spearwolf/signalize@1.0.0-beta.1'
     ```

     Schreibt `pnpm install` die beiden Einträge selbst, bleibt es bei dem, was
     pnpm schreibt, und nur der Kommentar kommt von Hand darüber.
  3. `pnpm install` laufen lassen. `pnpm-lock.yaml` ist danach mit geändert;
     das gehört dazu und wird mit committet.
  4. Pflichtprüfung, und sie ist die Regel, an der in diesem Repository der
     ganze Bump hängt: `pnpm why -r @spearwolf/eventize` und
     `pnpm why -r @spearwolf/signalize` melden je **genau eine** Version.
     Melden sie zwei, ist das Paket nicht fertig — dann zurück mit Befund,
     nicht weiterbauen.
  5. `pnpm -F @spearwolf/shadow-objects build`, danach messen:
     `stat -c%s packages/shadow-objects/dist/bundle.js` und
     `gzip -c packages/shadow-objects/dist/bundle.js | wc -c`. Beide Zahlen in
     kB (durch 1000, eine Nachkommastelle) landen in Schritt 6 — dort mit
     Punkt als Dezimaltrennzeichen, wie es die Nachbarzeilen im englischen
     CHANGELOG halten.
  6. `packages/shadow-objects/CHANGELOG.md`, Abschnitt `[Unreleased]` →
     `### Dependencies`:
     - Im Bullet `**Dependencies (breaking):**` werden die beiden Zielversionen
       ausgetauscht: `@spearwolf/eventize@^6.0.0` → `@spearwolf/eventize@^6.2.0`
       und `@spearwolf/signalize@1.0.0-beta.0` → `1.0.0-beta.1`. Die Herkunft
       (`^5.0.0` / `^0.30.0`, was `0.33.0` publiziert hat) stimmt und bleibt.
       Die Nennung der Peer-Range `^6.0.0` im selben Satz stimmt ebenfalls und
       bleibt. **Keine** neuen Verhaltens-Unterbullets: 6.0.0 → 6.2.0 ist
       additiv und beta.0 → beta.1 code-identisch, es gibt kein Verhalten zu
       melden.
     - Im Bullet `**Size:**` werden die beiden Bundle-Zahlen durch die in
       Schritt 5 gemessenen ersetzt. Die Ausgangszahlen (139,6 kB / 42,1 kB)
       bleiben. In der Klammer `(eventize 9.5 → 19.2 kB, signalize 14.7 →
       30.0 kB)` wird allein die eventize-Zahl auf **20.8** gesetzt; die
       signalize-Zahl bleibt bei 30.0, weil der Code zwischen beta.0 und beta.1
       byte-identisch ist und ein Neumessen dort eine Differenz ohne Ursache
       erzeugen würde. Reproduzierbar mit
       `node_modules/.pnpm/@esbuild+linux-x64@0.28.2/node_modules/@esbuild/linux-x64/bin/esbuild --bundle --minify --format=esm <paket>/lib/index.mjs | wc -c`
       (6.0.0: 19 108 Byte, 6.2.0: 20 800 Byte).
  7. `packages/shae-offscreen-canvas/CHANGELOG.md`, Abschnitt `[Unreleased]`:
     ein neues Bullet in der flachen Liste, das die publizierten Ranges dieses
     Pakets nennt. Es hat dort noch keines, und die Zahlen sind größer als bei
     shadow-objects: `0.6.0` hat `@spearwolf/eventize@^4.0.2` und
     `@spearwolf/signalize@^0.24.0` publiziert, das nächste Release publiziert
     `^6.2.0` und `1.0.0-beta.1`. Zwei eventize-Majors dazwischen, also
     breaking. Die Ein-Kopie-Regel gehört in denselben Satz — zwei Majors einer
     der beiden Bibliotheken in einem Consumer-Baum teilen sich einen Slot je
     Objekt. Die runtime-Folgen selbst nicht abschreiben, sondern auf
     `packages/shadow-objects/CHANGELOG.md` verweisen, so wie es der
     Wurzel-CHANGELOG vom 2026-08-15 vormacht.
     Der Blockquote `> **Next release: minor.**` am Kopf des Abschnitts zählt
     die Breaking Changes auf und kennt bisher zwei ("One reaches only
     consumers …", "The other — `three` moving to `peerDependencies` …"). Mit
     diesem Bullet sind es drei; der Blockquote wird entsprechend erweitert.
     Das ist Folgearbeit dieses Pakets, kein Nebenbefund.
  8. `CHANGELOG.md` (Wurzel): ein neuer datierter Abschnitt `## 2026-08-31 — …`
     ganz oben, unter der Formatzeile. Inhalt: der `catalog:`-Bump beider
     Einträge mit alter und neuer Range, und der `minimumReleaseAgeExclude`-
     Block mit seinen zwei versionsgenauen Einträgen und dem Grund — beide
     Releases sind jünger als pnpms Tagesgrenze, die Einträge gehen wieder,
     sobald sie darüber gealtert sind. Auf die Paket-CHANGELOGs für die
     Laufzeitfolgen verweisen. Vorlage für Ton, Länge und Aufbau ist der
     Abschnitt `## 2026-08-15 — the eventize holdback is lifted` in derselben
     Datei.
  9. Quelldateien werden nicht angefasst — nach dem Abgleich oben ist keine
     Änderung an `src/**` zu erwarten. Bricht wider Erwarten doch etwas
     (Typfehler, roter Test), gehört die Korrektur zu diesem Paket und wird in
     der Ergebniszeile benannt.
  10. `AGENTS.md` und `CLAUDE.md` gegenlesen: beide beschreiben das Paar auf
      Major-Ebene und nennen keine exakte Version, bleiben also stehen. Nur
      falls sich beim Lesen doch eine Aussage als falsch erweist, wird sie
      korrigiert.
- Verify: `pnpm cbt && pnpm typecheck && pnpm lint`
  Der Lauf ist clean + Build + alle Suiten inklusive der 654 E2E-Fälle über
  drei Browser und **überschreitet die Zehn-Minuten-Frist des Bash-Werkzeugs**.
  Also abgekoppelt starten und in Blöcken warten, sonst erschlägt die Frist
  mitten im Lauf die Prozessgruppe:

  ```bash
  LOG=/tmp/claude-1000/-home-spw-spaceland-shadow-objects/e1d046db-ac86-4a9d-afe9-ab8c348c0771/scratchpad/paket-1.verify.log
  setsid bash -c 'cd /home/spw/spaceland/shadow-objects && { pnpm cbt && pnpm typecheck && pnpm lint; } > "$1" 2>&1; echo "exit=$?" >> "$1"' _ "$LOG" &
  timeout 540 bash -c 'until grep -q "^exit=" "$0" 2>/dev/null; do sleep 10; done' "$LOG"
  ```

  Die Klammer um die drei Kommandos ist nicht Kosmetik: ohne sie leitet die
  Umlenkung nur `pnpm lint` um, und `pnpm cbt` schreibt seine Ausgabe ins
  Nichts. Der Block wird so oft wiederholt, bis die Zeile `exit=` in der Datei
  steht.

  Gegen die Baseline im Kopf halten: die ist auf allen vier Kommandos grün,
  also blockiert jeder rote Punkt.
- Commit: `deps: bump @spearwolf/eventize to 6.2.0 and @spearwolf/signalize to 1.0.0-beta.1`
- Ergebnis: 1 Runde · beide Katalog-Ranges gezogen, genau eine Kopie jeder
  Bibliothek im Baum (`pnpm why -r` je »Found 1 version«), drei CHANGELOGs
  geschrieben · keine Quelländerung nötig, wie im Abgleich vorhergesagt ·
  Bundle gemessen statt fortgerechnet: 225 675 Byte minified, 68 945 Byte
  gzipped · Review hob eine Ursachenzuschreibung in der Size-Zeile auf, die
  86 kB Zuwachs zwei Abhängigkeiten zuschrieb, die 53 kB davon verursachen;
  die Zeile macht die Attribution jetzt auf · klein und mitbehoben: zwei
  Aussagen im Wurzel-CHANGELOG, eine unbelegte Absolutaussage und eine
  nachzählbar falsche Projektzahl
- Klein und bewusst nicht behoben: der Reviewer schlug einen Halbsatz zu den
  neuen eventize-Funktionen `emitSafe`/`emitStrict` im Dependencies-Bullet vor.
  Der Detailplan schließt neue Verhaltensangaben dort aus (6.0.0 → 6.2.0 ist
  additiv), und die Entscheidung bleibt stehen.
- Nebenbefunde: → »Offene Befunde«
- Folgen: keine. Der `> **Next release: minor.**`-Blockquote in
  `packages/shae-offscreen-canvas/CHANGELOG.md` zählt jetzt drei statt zwei
  Breaking Changes — als Folgearbeit dieses Pakets mitgezogen.
- Schnittstellen: keine Signatur bewegt sich. Was ein späteres Paket betrifft:
  die publizierten `dependencies` beider Pakete nennen künftig
  `@spearwolf/eventize@^6.2.0` und `@spearwolf/signalize@1.0.0-beta.1`; die
  Ein-Kopie-Regel steht damit in beiden Paket-CHANGELOGs.

### [x] 2. Der Weg aus dem Beta heraus, und der Hinweis nach außen

- Findings: DEP-001 (medium)
- Ziel: Wer eines der beiden Pakete installiert, erfährt aus README und
  CHANGELOG, dass genau eine Kopie von signalize und eventize im Baum stehen
  darf und wohin die Beta-Bindung aufgelöst wird.
- Bereich: `packages/shadow-objects/README.md` + `CHANGELOG.md`,
  `packages/shae-offscreen-canvas/README.md` + `CHANGELOG.md`, ggf. `docs/`
- Hängt ab von: Paket 1 — der README-Satz nennt die Version, die danach dasteht
- Vorgefundene Lage: die Ein-Kopie-Regel steht heute nur in
  `pnpm-workspace.yaml` und `AGENTS.md`; beide werden nicht mitveröffentlicht.
  `packages/shae-offscreen-canvas/README.md` führt für `three` bereits genau so
  einen Absatz — er ist die Vorlage für Ton und Länge.
  `packages/shadow-objects/src/types.ts` importiert Typen von signalize, der
  öffentliche Typvertrag hängt also mit daran.
- Aus Zug 0 von Paket 1 nachgetragen: Paket 1 schreibt in
  `packages/shae-offscreen-canvas/CHANGELOG.md` bereits ein Bullet, das die
  Ein-Kopie-Regel und die publizierten Ranges nennt. Die CHANGELOG-Hälfte
  dieses Pakets darf das nicht ein zweites Mal sagen; hier geht es um die
  READMEs und darum, wohin die Beta-Bindung aufgelöst wird.
- Hash: 3fa2fa6
- Modell: stärkste Stufe (opus) — es entsteht keine Zeile Code, und genau daran
  hängt es: sechs Dateien Prosa in der Hausstimme, englisch, ohne Rückblick auf
  den Vorzustand, mit technisch exakten Aussagen über realm-weite Symbole und
  npm-Tags. Eine verlorene Runde kostet hier den vollen Verify-Lauf.
- Effort: medium
- Dateien: `packages/shadow-objects/README.md`,
  `packages/shadow-objects/docs/getting-started.md`,
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/CHANGELOG.md`,
  `packages/shae-offscreen-canvas/README.md`,
  `packages/shae-offscreen-canvas/CHANGELOG.md`

**Abgleich, 2026-08-31 — jede Zeile nachgemessen, nicht vermutet:**

- Das Finding steht unverändert; gewandert ist allein die Version. `pnpm-workspace.yaml:31`
  trägt `'@spearwolf/signalize': 1.0.0-beta.1`, und beide Publish-Artefakte tragen den
  exakten Pin: `packages/shadow-objects/dist/package.json:77` und
  `packages/shae-offscreen-canvas/.npm-pkg/package.json:44`. Paket 1 hat die Version
  bewegt, nicht die Bindung. Die Empfehlung des Audits gilt Wort für Wort weiter.
- `npm dist-tags` von signalize, am 2026-08-31 abgefragt: `latest` = `0.31.1`,
  `beta` = `1.0.0-beta.1`. Ein `npm install @spearwolf/signalize` ohne Versionsangabe
  zieht damit die 0.x-Linie, und die ist von der gepinnten `1.0.0-beta.1` disjunkt —
  zwei Kopien im Baum, die sich denselben realm-weiten Symbol-Slot teilen. Das ist der
  konkrete Hergang hinter der abstrakten Warnung des Findings.
- eventize: `latest` = `6.2.0`, deckungsgleich mit der publizierten Range `^6.2.0`. Ein
  Default-Install ist heute kompatibel; die scharfe Kante liegt allein bei signalize.
- Ein Konsument braucht signalize nie direkt. `src/index.ts` und `src/shadow-objects.ts`
  re-exportieren nichts daraus (nachgesehen: kein einziges `export … from '@spearwolf/signalize'`
  im ganzen `src/`), und die Primitive erreichen ein Shadow Object als Argumente der
  Creation-API — `createSignal`, `createEffect`, `createMemo`, deklariert in
  `src/types.ts:172`, das von signalize nur die Typen bindet. eventize dagegen importiert
  die Doku an sechs Stellen direkt (`import {on} from '@spearwolf/eventize'`, etwa
  `docs/api-reference.md:346`). Die beiden Bibliotheken brauchen deshalb verschiedene
  Sätze, keinen gemeinsamen.
- Der Hinweis erreicht npm-Konsumenten wirklich, und das war zu prüfen, weil `dist/`
  weder README noch CHANGELOG führt: `scripts/publishNpmPkg.mjs` kopiert `README.md`,
  `CHANGELOG.md` und `LICENSE` vor dem Publish ins Paketverzeichnis. Am veröffentlichten
  Tarball von `0.33.0` nachgesehen — `package/README.md` und `package/CHANGELOG.md`
  liegen darin. Beide Zieldateien dieses Pakets kommen also beim Installierenden an.
- `packages/shae-offscreen-canvas/src/distContract.files.txt` führt `README.md` bereits;
  es entsteht keine neue Datei, die Liste bewegt sich nicht. Beide Contract-Erwartungen
  bleiben unberührt.
- Biome fasst Markdown nicht an: `biome check` meldet die Doku-Pfade als »ignored«, und
  `**/CHANGELOG.md` steht ohnehin in den Ausschlüssen von `biome.json`. Es gibt also
  keinen Formatter, der den Zeilenumbruch entscheidet — jede Datei folgt ihrem eigenen
  Nachbarn. `packages/shae-offscreen-canvas/README.md` bricht bei rund 75 Zeichen um;
  `packages/shadow-objects/README.md`, die beiden `docs/`-Seiten und beide CHANGELOGs
  führen einen Absatz beziehungsweise ein Bullet als eine einzige lange Zeile.
- Vorlage für Ton und Länge ist der `three`-Absatz in
  `packages/shae-offscreen-canvas/README.md:13`: eine Regel, ihr Grund, und was passiert,
  wenn man sie bricht — acht Zeilen, keine Beschwörung.
- Paket 1 hat die Ein-Kopie-Regel in beiden CHANGELOGs schon gesagt
  (`packages/shadow-objects/CHANGELOG.md:421`, `packages/shae-offscreen-canvas/CHANGELOG.md:43`).
  Was dort fehlt, ist allein der Weg heraus.
- Triage der offenen Befunde: beide Einträge unter »Offene Befunde« stammen aus Paket 1,
  sind `low` und haben eine andere Ursache als dieses Paket — der fehlende
  Versionsabschnitt im shae-CHANGELOG ist Changelog-Pflege, die `base64`-Aussage im
  Size-Bullet eine falsche Artefaktbeschreibung. Keiner wird hier mitgenommen; beide
  bleiben für die Drain-Runde des Abschlusses liegen. Aus Paket 1 sind keine Folgen
  offen.
- Restplan: Paket 2 ist das letzte. Nichts umzusortieren, nichts neu zu schneiden.

- Vorgehen:
  1. `packages/shadow-objects/README.md`, direkt unter den Installations-Codeblock
     (nach Zeile 15), vor `## Quick Example`: ein Absatz mit drei Aussagen. (a) Genau
     eine Kopie von `@spearwolf/signalize` und `@spearwolf/eventize` darf im
     Abhängigkeitsbaum stehen — beide schlüsseln ihre Marker-Slots mit realm-weiten
     Symbolen, zwei Majors einer der beiden teilen sich einen Slot je Objekt und
     scheitern an der Grenze zwischen sich. (b) signalize muss man dafür nicht selbst
     installieren: die Reaktivitäts-Primitive erreichen ein Shadow Object als Argumente.
     Wer es doch daneben legt, nimmt die Version, die dieses Paket deklariert — der
     `latest`-Tag von signalize zeigt auf die 0.x-Linie, solange 1.0 im Beta ist, und
     die ist von der gepinnten Beta-Version disjunkt. (c) `npm ls @spearwolf/signalize`
     beziehungsweise `pnpm why @spearwolf/signalize` zeigt, ob es bei einer Kopie
     geblieben ist. Ein Absatz, kein Abschnitt, und keine Nennung dessen, was vorher
     dastand.
  2. `packages/shadow-objects/docs/getting-started.md`, unter den Install-Block in
     »1. Installation« (nach Zeile 21): zwei Sätze mit demselben Kern, kürzer als im
     README und mit Verweis dorthin. Wer diese Seite liest, will loslegen, nicht eine
     Regel studieren.
  3. `packages/shadow-objects/docs/api-reference.md:160`: der Satz »The framework
     re-exports reactivity primitives via @spearwolf/signalize« eröffnet »3. Reactivity
     Primitives« und ist die Stelle, an der ein Leser auf den eigenen signalize-Install
     kommt. Ergänzen, woher die Primitive tatsächlich kommen — als Argumente der
     Creation-API, `src/types.ts` bindet von signalize nur die Typen — und dass es dafür
     keinen eigenen Install braucht. Der übrige Abschnitt bleibt, wie er ist.
  4. `packages/shadow-objects/CHANGELOG.md`, Abschnitt `### Dependencies` (ab Zeile 419):
     ein neues Bullet zwischen dem `**Dependencies (breaking):**`-Bullet samt seinen
     Unterbullets und dem `**Size:**`-Bullet. Inhalt: die signalize-Range ist ein exakter
     Pin, solange 1.0 im Beta ist — ein Konsument kann ihn nicht auflösen und auch keine
     spätere Patch-Fassung des Betas wählen; die Fassung dieses Pakets, die auf ein
     finales signalize 1.0.0 trifft, zieht auf eine `^1.0.0`-Range um; die Regel für den
     Konsumenten-Baum steht jetzt im README. Die Ein-Kopie-Regel selbst nicht
     wiederholen, sie steht wenige Zeilen darüber.
  5. `packages/shae-offscreen-canvas/README.md`, direkt unter den `three`-Absatz (nach
     Zeile 20): derselbe Absatz wie in Schritt 1, auf dieses Paket zugeschnitten. Es
     hängt an denselben zwei Bibliotheken, und `@spearwolf/shadow-objects` bringt sie
     mit. Die Bauform des `three`-Absatzes daneben darf er aufnehmen; dessen Inhalt
     wiederholt er nicht.
  6. `packages/shae-offscreen-canvas/CHANGELOG.md`, flache Liste unter `## [Unreleased]`,
     direkt hinter dem Bullet aus Paket 1 (nach Zeile 43): ein Bullet mit demselben Kern
     wie Schritt 4 — exakter Pin, Weg heraus, und dass die Regel für den Konsumenten-Baum
     jetzt im README steht. Für die Laufzeitfolgen auf
     `packages/shadow-objects/CHANGELOG.md` verweisen, wie es das Bullet darüber vormacht.
     Der Blockquote `> **Next release: minor.**` bleibt unberührt: dieses Paket bringt
     keinen Breaking Change, nur Doku.
  7. `AGENTS.md` und `CLAUDE.md` gegenlesen. Beide beschreiben die Ein-Kopie-Regel für
     die Arbeit im Repository und bleiben stehen, solange keine Aussage darin durch die
     neuen Absätze falsch wird. Nur dann korrigieren.

  Grenzen, die dieses Paket nicht überschreitet:
  - Das `**Size:**`-Bullet in `packages/shadow-objects/CHANGELOG.md` steht als Befund
    unter »Offene Befunde« und wird hier weder korrigiert noch erneut gemeldet.
  - Keine Versionszahl in einen README-Satz nageln, die in einem Monat falsch ist.
    »solange signalize 1.0 im Beta ist« trägt, »`latest` steht auf 0.31.1« nicht.
  - Der Wurzel-`CHANGELOG.md` bleibt außen vor: die Änderung berührt weder Build noch
    Monorepo-Werkzeug, sie steht in zwei publizierten Paketen.
  - Keine Quelldatei wird angefasst. Bricht wider Erwarten etwas, gehört die Korrektur
    zu diesem Paket und wird in der Ergebniszeile benannt.
- Verify: `pnpm test:ci && pnpm typecheck && pnpm lint`
  Das Paket ändert ausschließlich Markdown; keine dieser Dateien steht in einem
  Ausführungspfad. `test:ci` zieht über turbo den Build beider publizierter Pakete mit
  und fährt die drei vitest-Suiten samt beider `distContract`-Specs — genau die Stellen,
  an denen eine Doku-Datei überhaupt in ein Artefakt hineinreicht. Die 654 E2E-Fälle
  über drei Browser bleiben draußen: sie prüfen Laufzeitverhalten, das Prosa nicht
  berührt. Fasst der Implementierer wider Erwarten Code an, ist das ein Befund und geht
  zurück in die Fehlerkette, statt hier nachträglich abgesichert zu werden.

  Die Laufzeit ist unbekannt und kann die Zehn-Minuten-Frist des Bash-Werkzeugs reißen,
  also abgekoppelt starten und in Blöcken warten:

  ```bash
  LOG=/tmp/claude-1000/-home-spw-spaceland-shadow-objects/e1d046db-ac86-4a9d-afe9-ab8c348c0771/scratchpad/paket-2.verify.log
  setsid bash -c 'cd /home/spw/spaceland/shadow-objects && { pnpm test:ci && pnpm typecheck && pnpm lint; } > "$1" 2>&1; echo "exit=$?" >> "$1"' _ "$LOG" &
  timeout 540 bash -c 'until grep -q "^exit=" "$0" 2>/dev/null; do sleep 10; done' "$LOG"
  ```

  Die Klammer um die drei Kommandos ist nicht Kosmetik: ohne sie leitet die Umlenkung
  nur `pnpm lint` um. Der Block wird so oft wiederholt, bis die Zeile `exit=` dasteht.
  Gegen die Baseline im Kopf halten: die ist auf allen vier Kommandos grün, also
  blockiert jeder rote Punkt.
- Commit: `docs: name the single-copy rule and the way out of the signalize beta pin`
- Ergebnis: 3 Runden · DEP-001 behoben — die Ein-Kopie-Regel und der Weg aus
  dem exakten signalize-Pin stehen jetzt in beiden publizierten READMEs und
  beiden Paket-CHANGELOGs, dazu zwei Doku-Ergänzungen · sechs Dateien, alle
  Markdown, keine Quelldatei · Review Runde 1 hob den Satz »these two need no
  install of their own« auf: für signalize richtig, für eventize falsch, weil
  die Doku dessen Free Functions an vierzehn Stellen direkt importiert und ein
  transitives Paket unter isoliertem `node_modules` kein auflösbarer Importpfad
  ist · Runde 2 hängte die Install-Bedingung ans Importieren statt an die View-
  Seite und nahm den Schlussstrich »That is the whole install« zurück, den der
  eigene Wegweiser der Seite nicht hält · nebenbei richtiggestellt: der Satz in
  `docs/api-reference.md:160`, das Paket re-exportiere die Reaktivitäts-
  Primitive über signalize — es bindet nur deren Typen
- Klein und bewusst nicht behoben: `packages/shadow-objects/README.md:17` sagt
  `dependencies` dreimal in zwei Sätzen, mit wechselndem Bezug — die Aussage ist
  richtig, der Leser muss die Referenten selbst sortieren. Dazu der einzige
  `—`-Gedankenstrich in `docs/getting-started.md:23`, dessen Datei sonst ` -- `
  schreibt. Beides Politur an korrekten Sätzen; eine vierte Runde dafür wäre
  eine Runde ohne Defekt.
- Nebenbefunde: keine
- Folgen: keine
- Schnittstellen: keine. Das Paket ändert ausschließlich Prosa. Was ein späterer
  Lauf wissen muss: die Ein-Kopie-Regel und die Beta-Bindung sind ab hier
  veröffentlicht — wer die signalize-Range von `1.0.0-beta.1` auf `^1.0.0` zieht,
  fasst dieselben vier Dateien wieder an, die diese Aussagen tragen.

**DEP-001 · medium · pnpm-workspace.yaml (`catalog:` `'@spearwolf/signalize'`), `packages/shadow-objects/package.json` (dependencies), `packages/shae-offscreen-canvas/package.json` (dependencies)** — Zwei veröffentlichte Pakete hängen versionsgenau an einem Beta

@spearwolf/signalize ist die Reaktivitäts-Grundlage und steht als Laufzeit-Abhängigkeit in beiden publizierten Paketen, versionsgenau auf 1.0.0-beta.0. Wer @spearwolf/shadow-objects@0.33.0 installiert, bekommt damit ein Prerelease ins Projekt, und ohne Ausweg: ein exakter Pin lässt keine spätere 1.0.0 zu, auch keine Patch-Fassung des Betas. Zusammen mit der Realm-Symbol-Regel, die dieses Repository selbst in pnpm-workspace.yaml und AGENTS.md dokumentiert, wird das scharf: ein Konsument, der signalize auch direkt benutzt und dabei auf ^1.0.0 steht, hat zwei Kopien im Baum, die sich denselben Symbol.for-Slot teilen und an der Grenze werfen statt nur Code zu verdoppeln.

Empfehlung: Der Pin ist richtig, solange es ein Beta ist, und seine Begründung steht im Manifest. Was fehlt, ist der Weg heraus und der Hinweis nach außen. Ein Eintrag unter ## [Unreleased] in beiden CHANGELOGs, der sagt, dass die nächste Minor auf die finale 1.0.0 geht, und ein Satz im Installationsabschnitt beider READMEs, der Konsumenten sagt, dass sie signalize nicht selbst danebenlegen dürfen. Die Regel steht heute nur im Agenten-Leitfaden, und der wird nicht mit veröffentlicht.

(Der Pin steht seit Paket 1 auf `1.0.0-beta.1`; die Aussage des Findings ist davon unberührt.)
