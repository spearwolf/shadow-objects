# Remediation-Plan — shadow-objects

Quelle: ./audit.html vom 2026-08-19 · Branch: main · erstellt: 2026-08-19
Baseline: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test:ci` ✓
(908 Fälle: 556 shadow-objects, 345 shadow-objects-testing, 7 shae-offscreen-canvas)
Scope: 2 von 38 Findings (1 high, 1 medium), vom Nutzer namentlich benannt
Stand (2026-08-20): **Lauf abgeschlossen.** Alle sechs Pakete committet — 1
(`fe11219`), 2a (`510443e`), 2b-1 (`c5538e8`), 2b-2a (`6b2aeca`), 2b-2b
(`6502183`), 3 (`3a705dd`). Nichts blockiert, keine offenen Folgen. Voller
Verify-Lauf gegen die Baseline gefahren und gelesen: `pnpm lint` ✓
`pnpm typecheck` ✓ `pnpm build` ✓ `pnpm test:ci` ✓ mit 952 Fällen gegen 908 zu
Beginn. Semver: `@spearwolf/shadow-objects` bleibt bei `0.33.0`, die Bewertung
`0.33.0` → `0.34.0` (minor, weil unter 1.0.0 ein Bruch die Minor-Stelle hebt)
steht im Kopf des `[Unreleased]`-Blocks seines CHANGELOG; das Anheben selbst
gehört zum Release und ist eine eigene Entscheidung des Nutzers.
`@spearwolf/shae-offscreen-canvas` wurde nicht berührt. Der Report
`./audit.html` ist auf den Stand nach dem Lauf gebracht.

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

## Scope-Abgrenzung

Der Nutzer hat zwei Findings benannt: BUG-001 und CLEAN-001. Die übrigen 36
Findings des Reports bleiben draußen — nicht weil sie erledigt wären, sondern
weil sie nicht beauftragt sind. Sie stehen unverändert in `./audit.html` und
sind Sache eines späteren Laufs. `acknowledged` ist im Report leer.

Was dieser Lauf an Folgen erzeugt, gehört dazu: zieht ein Fix anderswo etwas
nach sich, wird es hier mit behoben, notfalls in zusätzlichen Paketen.

## Entscheidungen

- **Ein abgelehnter Change Trail wird auf zwei Wegen sichtbar** (2026-08-19):
  `syncWait()` lehnt ab, wenn der Zyklus, auf den es gewartet hat, seinen
  Trail nicht bestätigt bekam — ein Breaking Change für jeden Aufrufer ohne
  `catch`. Zusätzlich ein eigenes Ereignis neben `AfterSync`, das
  `ShaeWorkerElement` wie `proxyfailed` als DOM-`CustomEvent` spiegelt, damit
  auch der Zusehende ohne `syncWait()` den Fehlschlag bemerkt. Der Namens-
  vorschlag `ShadowEnv.SyncFailed` ist ein Vorschlag, kein Beschluss; der
  Paket-Planer darf ihn schärfen, solange beide Wege bleiben.
- **Kein automatisches `reCreateChanges()`** (2026-08-19): Der Fehlerfall wird
  sichtbar gemacht und dokumentiert, die Wiederherstellung ruft der Consumer
  im Listener auf — dieselbe Aufteilung wie bei `ProxyFailed`, wo die Erholung
  ein neuer `envProxy` ist. Ein automatischer Neuaufbau nach jedem abgelehnten
  Trail dreht bei dauerhaftem Fehler im Kreis. Der Weg zurück gehört
  stattdessen in die Dokumentation.
- **Gearbeitet wird direkt auf `main`** (2026-08-19), ein Commit je Paket,
  ohne GPG-Signatur. Kein Push, kein Tag, kein Publish.
- **Der Audit-Abschluss wurde vorab committet** (2026-08-19, `44891c2`): der
  neue Report plus das Entfernen der Arbeitspapiere abgeschlossener Läufe.
  Nicht Teil dieses Laufs, nur die Herstellung eines sauberen Baums.

## Konventionen

Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise:

- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs. Sie gehören diesem einen Audit und sind danach tot. Sie
  leben in diesem Plan und in `./audit.html`, sonst nirgends — auch nicht in
  Commit-Messages, Branch-Namen, Testnamen oder Kommentaren. (Die Vorlage des
  Skills lässt Commit-Messages zu; die globale Vorgabe des Nutzers in
  `~/.claude/CLAUDE.md` ist enger und gewinnt.) Was festgehalten werden soll,
  wird ausgeschrieben: die Regel als Satz, die Begründung daneben.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

Projektspezifisch, aus `AGENTS.md` und `CLAUDE.md`:

- Code, Kommentare und Dokumentation auf **Englisch**, Doku in Markdown.
- **ECS-Terminologie.** Verboten als Analogie: »shadow theater«, »puppet«,
  »puppeteer«, »light world«, »screen«. Verbindliche Begriffe:
  `RemoteWorkerEnv` (nicht `RemoteShadowObjectEnv`), Entity (nicht Shadow
  Entity), Entity Tree (nicht Shadow Entity Graph), `ComponentContext` /
  Namespace für die View-seitige Registrierung, »Entity Context« für die
  Dependency Injection entlang des Baums, Token (nicht Component Tag).
- **Doku ist Teil des öffentlichen API-Vertrags.** Eine Änderung an der
  öffentlichen API von `@spearwolf/shadow-objects` fasst im selben Zug
  `packages/shadow-objects/docs/`, `packages/shadow-objects/README.md` und
  `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`) an.
- Änderungen an Build, Testrunner, Lint, turbo/pnpm gehen in die
  Wurzel-`CHANGELOG.md` (datierter Abschnitt), nicht in die des Pakets.
- Nach dem Changelog den `Backlog.md` nachziehen: erledigte Punkte fliegen
  raus, stale gewordene Abschnitte werden korrigiert.
- Dependency-Versionen ausschließlich über den `catalog:`-Block in
  `pnpm-workspace.yaml`. In diesem Lauf ist ohnehin keine Änderung daran
  vorgesehen.
- Wird ein `TODO`-Kommentar angefasst, danach `pnpm make:todo`.
- Lint und Format sind Biome, Konfiguration nur in der Wurzel-`biome.json`.

## Vorbestehende Fehler

Keine. Lint, Typecheck, Build und `test:ci` sind auf `44891c2` vollständig
grün. Jeder rote Lauf ab hier gehört dem Paket, das ihn erzeugt hat.

## Pakete

### [x] 1. Ein abgelehnter Change Trail meldet sich

- Findings: BUG-001 (high, effort M)
- Ziel: Ein Sync-Zyklus, dessen Change Trail vom Proxy abgelehnt wurde, endet
  für jeden Beobachter erkennbar als Fehlschlag statt als Erfolg.
- Bereich: `packages/shadow-objects/src/view/ShadowEnv.ts`,
  `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`, deren Specs,
  `packages/shadow-objects/docs/` (api-reference, cheat-sheet, guides),
  `packages/shadow-objects/README.md`, `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: —
- Modell: stärkste Stufe — asynchroner Pfad, öffentliche API, Breaking Change
- Anmerkungen für den Planer: Der Fehlerfall hat in `ShadowEnv.spec.ts` keinen
  einzigen Wächter; ein rot gesehener Test kommt vor dem Fix. Zu bedenken sind
  der geteilte `#afterNextSync`-Cache (mehrere Aufrufer hängen an derselben
  Promise), der Pfad mit leerem Trail, bei dem `applyChangeTrail()` gar nicht
  läuft, und die Frage, ob das Ereignis auch dann feuern soll, wenn niemand
  auf Bestätigung wartete — der Trail ist in beiden Fällen verloren. Die
  E2E-Suite kennt in `packages/shadow-objects-e2e/src/worker-failure.js`
  bereits ein Muster für ein gespiegeltes DOM-Ereignis.
- Hash: `fe11219`
- Dateien: `packages/shadow-objects/src/view/ShadowEnv.ts`,
  `packages/shadow-objects/src/view/ShadowEnv.spec.ts`,
  `packages/shadow-objects/src/view/RemoteWorkerEnv.ts`,
  `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts`,
  `packages/shadow-objects/src/elements/ShaeWorkerElement.ts`,
  `packages/shadow-objects/docs/api-reference.md`,
  `packages/shadow-objects/docs/cheat-sheet.md`,
  `packages/shadow-objects/docs/guides.md`,
  `packages/shadow-objects/CHANGELOG.md`, `Backlog.md`
  (`packages/shadow-objects/README.md` erwähnt weder `syncWait()` noch die
  Ereignisse — nichts mitzuziehen.)
- Verify: `pnpm lint && pnpm typecheck && pnpm test:ci`
- Commit: `fix(view)!: a change trail the environment could not apply ends the cycle in failure`

#### Was heute passiert

`#syncNow()` (`ShadowEnv.ts:294-322`) umschließt `applyChangeTrail()` mit
`try/catch/finally`. Der `catch` schreibt `logger.error` und schluckt den
Fehler, der `finally` sendet `AfterSync` mit dem Trail. `syncWait()`
(`ShadowEnv.ts:233-256`) hört genau darauf und löst mit demselben Trail auf
wie nach einem geglückten Zyklus. Zu diesem Zeitpunkt hat
`buildChangeTrails()` jeden ausstehenden Wert bereits in seinen geschriebenen
Zustand gefaltet und die `ComponentChanges` geleert — kein späterer Trail
schickt das Verlorene noch einmal. Der Weg dorthin braucht keinen Absturz: ein
abgelaufener `changeTrailTimeout` und ein Kernel-Fehler, den `MessageRouter`
als `AppliedChangeTrail.error` zurückmeldet, lehnen beide ab, ohne
`onProxyFailed` auszulösen — der Proxy bleibt bereit, `ContextLost` kommt nie,
`reCreateChanges()` läuft nie. In Produktion ist der Vorgang vollständig
stumm: `ConsoleLogger.sharedConfig.enable` steht standardmäßig auf »die Seite
wird von localhost ausgeliefert«.

Beide Proxy-Implementierungen können ablehnen, und zwar nicht nur beim Warten
auf Bestätigung:

- `RemoteWorkerEnv.applyChangeTrail()` (`RemoteWorkerEnv.ts:317-330`) lehnt
  ohne Bestätigungswunsch nur ab, wenn der Worker schon weg ist
  (`WorkerDestroyedError`) oder die Fehler-`AbortSignal` bereits ausgelöst hat;
  mit Bestätigungswunsch zusätzlich bei Timeout und bei einem Kernel-Fehler,
  den der Worker unter derselben Seriennummer zurückmeldet.
- `LocalShadowObjectEnv.applyChangeTrail()` (`LocalShadowObjectEnv.ts:51-67`)
  gibt eine abgelehnte Promise auch dann zurück, wenn niemand auf Bestätigung
  wartet — `kernel.run()` läuft synchron und darf werfen.

Der Fehlerausgang darf deshalb **nicht** an `waitForConfirmation` hängen. Er
hängt daran, dass `applyChangeTrail()` abgelehnt hat.

#### Zielverhalten

Ein Sync-Zyklus endet in genau einem von zwei Ereignissen:

| Ausgang | Ereignis | `syncWait()` |
| --- | --- | --- |
| `applyChangeTrail()` erfüllt, oder leerer Trail (kein Aufruf) | `ShadowEnv.AfterSync` mit dem Trail | löst mit dem Trail auf |
| `applyChangeTrail()` lehnt ab | `ShadowEnv.SyncFailed` mit `(reason, changeTrail, env)` | lehnt mit `reason` ab |

`AfterSync` feuert im Fehlerfall also **nicht** mehr. Das ist der Kern: solange
beide feuern, kann kein Hörer die beiden Ausgänge auseinanderhalten, und
`syncWait()` hätte gegen sich selbst zu rennen.

Der Name `SyncFailed` steht mit dem Wert `'syncFailed'` in der Reihe von
`afterSync`, `contextLost`, `proxyFailed`. Das DOM-Ereignis heißt entsprechend
`syncfailed`.

#### Vorgehen

1. **Zuerst die Wächter, und rot sehen.** In `ShadowEnv.spec.ts` in den Block
   `describe('syncWait', …)` beziehungsweise einen neuen Block daneben. Es gibt
   dort bereits `makeEnv()` und `withTimeout()`; für die Fehlerfälle braucht es
   einen Proxy, dessen `applyChangeTrail()` ablehnt. Ein Muster für einen
   handgeschriebenen `IShadowObjectEnvProxy` steht in derselben Datei ab
   `ShadowEnv.spec.ts:420`. Diese Fälle:
   - `syncWait()` lehnt mit dem Grund des Proxys ab, wenn `applyChangeTrail()`
     ablehnt. **Das ist der Fall, der heute fälschlich auflöst** — er muss vor
     dem Fix rot laufen, und der rote Lauf gehört in den Report.
   - `AfterSync` feuert in diesem Zyklus nicht.
   - `SyncFailed` feuert genau einmal, mit dem Grund, dem verlorenen Change
     Trail und der `ShadowEnv`.
   - Ein `sync()` ohne wartenden `syncWait()`, dessen Trail abgelehnt wird,
     feuert `SyncFailed` trotzdem.
   - Nach einem abgelehnten Zyklus ist die Umgebung weiter benutzbar: der
     nächste `syncWait()` löst wieder auf. Damit ist belegt, dass der
     `#afterNextSync`-Cache geleert wurde und keine tote Promise zurückgibt.
   - Der Erfolgsfall bleibt, wie er ist: `AfterSync` feuert, `SyncFailed` nicht
     — auch beim leeren Trail, bei dem `applyChangeTrail()` gar nicht läuft.
   - `destroy()` schlägt weiter durch: ein `syncWait()`, das noch hängt, lehnt
     mit `ShadowEnvDestroyedError` ab, nicht mit einem Sync-Grund.
2. **`ShadowEnv.SyncFailed = 'syncFailed'`** als statisches Feld neben
   `AfterSync`, `ContextLost`, `ContextCreated`, `ProxyFailed`.
3. **`#syncNow()` umbauen.** Der `catch` bekommt seinen eigenen Ausgang: das
   `logger.error` bleibt stehen, dazu `emit(this, ShadowEnv.SyncFailed, error,
   data, this)`. Der `finally` verschwindet zugunsten eines `AfterSync`, das
   nur den Erfolgspfad verlässt. Der vorhandene Kommentar über `AfterSync` bei
   leerem Trail beschreibt weiterhin einen Erfolgspfad und bleibt sinngemäß
   erhalten. Zwei Dinge dabei:
   - Ein Listener, der wirft, darf den Zyklus nicht auf halbem Weg stehen
     lassen. `#onProxyFailed()` (`ShadowEnv.ts:331-346`) zeigt das Muster mit
     `try/finally`; ob es hier eines braucht, entscheidet, was nach dem `emit`
     noch zu tun ist.
   - Die Reihenfolge ist festzulegen und im Code zu begründen: erst der
     Log-Eintrag, dann das Ereignis.
4. **`syncWait()` erweitern** (`ShadowEnv.ts:233-256`). Das `Promise.race`
   bekommt einen dritten Teilnehmer: ein `onceAsync(this, SyncFailed)`, dessen
   Erfüllung in ein `throw` des Grundes übersetzt wird. Die vorhandene
   `then(onFulfilled, onRejected)`-Klammer leert `#afterNextSync` bereits in
   beiden Richtungen; das gilt es zu erhalten, nicht neu zu bauen.
   **Achtung Listener:** `onceAsync()` hinterlässt einen Abonnenten, solange
   sein Ereignis nicht kam. Nach einem erfolgreichen Zyklus bleibt der
   `SyncFailed`-Abonnent liegen und feuert irgendwann ins Leere — und
   umgekehrt. Das ist ein Leck, das mit jedem `syncWait()` wächst. Die
   Verlierer des Rennens sind abzuräumen, sobald es entschieden ist. Wie
   `#destroyedSignal()` das für sich löst, steht in derselben Datei; das
   gewählte Vorgehen gehört als Kommentar an die Stelle.
5. **`ShaeWorkerElement`** (`ShaeWorkerElement.ts:89-96`) spiegelt das Ereignis
   nach dem Muster von `proxyfailed`: `syncfailed`, `bubbles: false`, ohne
   `composed`, `detail: {shadowEnv, reason, changeTrail}`.
6. **Dokumentation.** Diese Stellen sagen heute etwas, das danach nicht mehr
   stimmt:
   - `docs/api-reference.md:1166` — der Abschnitt `syncWait()`. Der Satz »The
     Promise resolves on every cycle« ist danach falsch. Der Weg zurück gehört
     hierher: `reCreateChanges()` ist das Einzige, was den verlorenen Trail
     wiederherstellt, und der Aufruf ist Sache des Consumers — dieselbe
     Aufteilung wie bei `ProxyFailed`, wo die Erholung ein neuer `envProxy`
     ist. Ein Beispiel mit `try/catch` gehört dazu.
   - `docs/api-reference.md:1143` — die `ShadowEnv`-Ereignistabelle. `AfterSync`
     bekommt seine Einschränkung, `SyncFailed` eine eigene Zeile.
   - `docs/api-reference.md:1609` — »The element mirrors three of the
     `ShadowEnv` events« stimmt nicht mehr, und der Nachsatz, `AfterSync` sei
     nicht darunter, braucht seine Ergänzung. Die Tabelle darunter bekommt
     `syncfailed`.
   - `docs/cheat-sheet.md:399` — die Ereignistabelle, dieselben zwei Zeilen.
   - `docs/guides.md:521` — der `ProxyFailed`-Abschnitt. Prüfen, ob das
     Fehlerbild dort den neuen Ausgang nennen muss; die beiden sind
     verschiedene Fehler und dürfen nicht verschmelzen.
   - `packages/shadow-objects/README.md` — prüfen, ob `syncWait()` dort
     überhaupt vorkommt, und wenn ja, mitziehen.
   - Alles auf Englisch, ECS-Terminologie, verbindliche Begriffe wie im
     Abschnitt »Konventionen«.
7. **`packages/shadow-objects/CHANGELOG.md`**, unter `## [Unreleased]`: der
   Breaking Change an `syncWait()` und das neue Ereignis samt DOM-Spiegelung.
   Der Ton der vorhandenen Einträge ist die Vorlage — sie beschreiben den
   Fehler und den neuen Zustand, nicht den Diff. Ein Bruch gehört sichtbar
   markiert, so wie es die Datei bereits handhabt.
8. **`Backlog.md`** nachziehen, falls dort ein Punkt zu dieser Stelle steht.
9. Weder die Wurzel-`CHANGELOG.md` noch `pnpm-workspace.yaml` werden berührt:
   hier ändert sich nichts an Build, Testrunner oder Dependencies.

#### Was ausdrücklich nicht dazugehört

- **Kein automatisches `reCreateChanges()`.** Entscheidung vom 2026-08-19, sie
  steht im Kopf dieses Plans. Der Weg zurück wird dokumentiert, nicht
  eingebaut.
- Kein Anfassen von `ComponentChanges` oder `buildChangeTrails()`. Dass der
  Trail beim Bauen die ausstehenden Werte faltet, ist der Grund für den
  Verlust, aber nicht sein Fehler.
- Keine der übrigen 36 Findings, auch nicht die, die beim Lesen derselben
  Dateien auffallen. Melden statt beheben.

#### Das Finding im Wortlaut

**BUG-001 · high · `packages/shadow-objects/src/view/ShadowEnv.ts:312-321`** —
Ein abgelehnter Change Trail verschwindet, und `syncWait()` meldet Erfolg.

Empfehlung des Reports: »Der Fehlerfall braucht einen eigenen Ausgang. Zwei
Wege, beide vertretbar: `syncWait()` ablehnen lassen, wenn `waitForConfirmation`
gesetzt war — ein Breaking Change für jeden Aufrufer ohne `catch` —, oder ein
eigenes Ereignis neben `AfterSync`, das `ShaeWorkerElement` wie `ProxyFailed`
als DOM-Event weiterreicht. Was der Trail verloren hat, kann nur
`reCreateChanges()` zurückholen; ob das automatisch geschehen soll, gehört in
dieselbe Entscheidung. Ein Wächter für den Fall fehlt in `ShadowEnv.spec.ts`
vollständig — dort deckt kein Fall einen abgelehnten `applyChangeTrail()` ab.«

Der Nutzer hat beide Wege gewählt und die automatische Wiederherstellung
abgelehnt. Die Abweichung von der Empfehlung ist die Kopplung: nicht
`waitForConfirmation` entscheidet über die Ablehnung, sondern die abgelehnte
Promise selbst — siehe »Was heute passiert«, letzter Absatz.

Belegt wurde das Finding am 2026-08-19 mit einem Proxy, dessen
`applyChangeTrail()` ablehnt: »RESOLVED with 1 entries | applyCalls=1«. Auf
stderr stand allein »ShadowEnv failed to apply change trail Error: the worker
refused the trail«.

- Ergebnis: 2 Review-Runden · BUG-001 behoben, vom Reviewer an der Fundstelle
  bestätigt und gegen den gebauten `dist` nachgestellt · 10 Dateien, 10 neue
  Testfälle, 918 statt 908 Fälle · Verify vom Orchestrator selbst gelesen:
  lint ✓ typecheck ✓ `test:ci --force` ✓ · E2E Chromium 202/202 grün (nicht
  Teil von `test:ci`, vom Reviewer zusätzlich gefahren) · klein und offen
  gelassen: `ShadowEnv.spec.ts` ruft `env.destroy()` am Ende des Testkörpers
  statt in einem `afterEach`, ein roter Lauf verrauscht dadurch mit
  »overwrite a namespace already in use«
- Nebenbefunde:
  - `packages/shadow-objects/src/view/ShadowEnv.ts:294-300` — ein `syncWait()`
    aus einem `AfterSync`- oder `SyncFailed`-Hörer heraus bekommt die bereits
    gesettelte Promise des eben beendeten Zyklus zurück: `#settleAfterNextSync`
    wird synchron geleert, `#afterNextSync` erst einen Microtask später. Der
    innere Aufrufer löst mit dem alten Trail auf, der von ihm angestoßene
    Zyklus läuft ohne Resolver. Vorbestehend, durch diesen Umbau nur schärfer;
    keine Dokumentationsstelle führt dorthin.
  - `packages/shadow-objects/src/utils/waitForMessageOfType.ts:41` — ein
    abgelaufenes Zeitfenster lehnt mit einem nackten `Error` ab. Seit
    `syncWait()` diesen Grund durchreicht, ist ein Timeout von einem
    Kernel-Fehler nur per String-Vergleich zu unterscheiden. Eigene
    Fehlerklassen gibt es in `RemoteWorkerEnv.ts:68,83` bereits.
  - `packages/shadow-objects/src/view/ShadowEnv.ts:325-345` — `#syncNow()`
    prüft `#isDestroyed` nur vor dem `await`; auf dem asynchronen Pfad greift
    der Wächter am Methodenkopf nicht. Vorbestehend.
  - `packages/shadow-objects/CHANGELOG.md:154,155` — zwei Bugfix-Einträge
    tragen Laufnummern eines früheren Audits im Fließtext (`VIEW-23`,
    `VIEW-18`). Nach der Konvention gehören sie dort nicht hin. Nicht
    angefasst, weil außerhalb des Pakets.
- Folgen:
  - `packages/shadow-objects/src/view/ShadowEnv.ts:339-341` und `:363-366` —
    `#endSyncCycle()` hat keinen `#isDestroyed`-Wächter, obwohl
    `#onProxyFailed()` (`:384`) an der Nachbarstelle einen hat. Ein `destroy()`
    mit einem Change Trail in der Luft emittiert `SyncFailed` in eine Umgebung,
    deren Hörer `off(this)` schon abgeräumt hat. Folgenlos, aber der Emit ins
    Leere ist mit dieser Änderung entstanden. Der Log-Eintrag auf Error-Level
    an derselben Stelle ist vorbestehend.
  - `packages/shadow-objects-e2e/src/worker-failure.js:67` — `proxyfailed`
    wird über eine echte Worker-Strecke geprüft, `syncfailed` nicht. Es fehlt
    eine E2E-Seite, die einen Kernel-Fehler oder einen abgelaufenen
    `change-trail-timeout` über echtes `postMessage` fährt und
    `detail.changeTrail` prüft, samt Kennung in
    `packages/shadow-objects-e2e/TEST-PLAN.md`.
  - `packages/shadow-objects/docs/api-reference.md:1400-1403` — die
    Hörer-Wurf-Semantik ist für `RemoteWorkerEnv.WorkerLoaded` / `WorkerFailed`
    ausführlich beschrieben, für die `ShadowEnv`-Ereignisse jetzt in einem
    Absatz. Eine einheitliche Darstellung über beide Klassen wäre eine eigene
    Doku-Runde.
  - `packages/shadow-objects-e2e/src/worker-failure.js` insgesamt — das dortige
    `syncWait()` ist jetzt darauf angewiesen, dass die Bestätigung des Change
    Trails das `error`-Ereignis des sterbenden Workers schlägt. Die Reihenfolge
    ist durch `setTimeout(…, 0)` in `public/mod-crash.js` gesichert, aber sie
    ist jetzt tragend, wo sie es vorher nicht war. Suite läuft grün.
- Schnittstellen: `ShadowEnv.SyncFailed = 'syncFailed'` neu, emittiert mit
  `(reason, changeTrail, env)` · `ShadowEnv.AfterSync` feuert nicht mehr, wenn
  `applyChangeTrail()` ablehnt · `ShadowEnv.syncWait()` lehnt in diesem Fall
  ab, mit dem Grund des Proxys · `<shae-worker>` dispatcht `syncfailed` mit
  `detail: {shadowEnv, reason, changeTrail}`, `bubbles: false` · intern:
  `ShadowEnv.#endSyncCycle(changeTrail, failure?)` ist der einzige Ausgang
  eines Zyklus, `syncWait()` settelt über ein Resolverpaar statt über Hörer

#### Triage der Folgen und Nebenbefunde (2026-08-19, beim Planen von Paket 2)

Jeder Eintrag der beiden Listen oben, eingeordnet und verteilt. Was als
vorbestehend gilt, ist gegen `44891c2` nachgesehen, nicht geschätzt.

**Folgen.**

1. `#endSyncCycle()` ohne `#isDestroyed`-Wächter
   (`ShadowEnv.ts:360-375`, gerufen aus `:339` und `:344`) — **vorbestehend**.
   Auf `44891c2` stand an derselben Stelle in `#syncNow()` ein
   `finally { emit(this as ShadowEnv, ShadowEnv.AfterSync, data); }`: derselbe
   Emit nach demselben `await`, derselbe fehlende Wächter. Neu ist allein, wie
   das Ereignis heißt, das ins Leere geht. Ein doppeltes Settlen ist
   ausgeschlossen — `destroy()` (`ShadowEnv.ts:296-300`) räumt
   `#settleAfterNextSync` ab, bevor `off(this)` läuft, und `#endSyncCycle()`
   liest genau dieses Feld. → Nebenbefund, gemeinsam mit dem gleichlautenden
   Nebenbefund zu `#syncNow()` ins nächste Audit.
2. Keine E2E-Strecke für `syncfailed`
   (`packages/shadow-objects-e2e/src/worker-failure.js:67`, `TEST-PLAN.md`) —
   **echte Folge**. Ereignis und DOM-Spiegelung sind in diesem Lauf entstanden;
   über echtes `postMessage` ist keines von beiden je gelaufen. → Paket 3.
3. Ungleiche Darstellung der Hörer-Wurf-Semantik
   (`docs/api-reference.md:1400-1403` gegen den Absatz bei `:1159-1163`) —
   **vorbestehend**. Auf `44891c2` hatten die `ShadowEnv`-Ereignisse dazu
   überhaupt keinen Satz, die `RemoteWorkerEnv`-Ereignisse ihre drei Absätze.
   Der Abstand war größer, nicht kleiner. → Nebenbefund, nächstes Audit.
4. `worker-failure.js` verlässt sich auf die Reihenfolge zwischen
   Trail-Bestätigung und `error`-Ereignis (`worker-failure.js:67`, gesichert
   durch `setTimeout(…, 0)` in `public/mod-crash.js:7`) — **echte Folge**.
   Vorher konnte das dortige `syncWait()` nicht ablehnen, jetzt schon; die
   Suite ist grün, die Abhängigkeit ist ungeschrieben. → Paket 3, zusammen mit
   Eintrag 2: dieselbe Datei, dieselbe Strecke, ein Commit.

**Nebenbefunde.** Keiner von ihnen geht in diesen Lauf.

- `syncWait()` aus einem Hörer heraus (`ShadowEnv.ts:294-300`): vorbestehend,
  teilt mit keinem offenen Paket die Ursache und blockiert keines.
  → nächstes Audit.
- Nackter `Error` beim abgelaufenen Zeitfenster
  (`utils/waitForMessageOfType.ts:41`): vorbestehend. Ein eigener Fehlertyp
  ändert, was Konsumenten im `catch` sehen — eine eigene Entscheidung, kein
  Beifang eines Kernel-Refactorings. → nächstes Audit.
- `#syncNow()` prüft `#isDestroyed` nur vor dem `await` (`ShadowEnv.ts:317`
  gegenüber `:325-344`): vorbestehend, und der Sache nach dasselbe wie Folge 1.
  Beide gehören in eine Entscheidung darüber, was ein Zyklus tut, dessen
  Umgebung während des Fluges verschwindet. → nächstes Audit, als ein Punkt.
- Laufnummern im Fließtext (`packages/shadow-objects/CHANGELOG.md:154,155`):
  vorbestehend. Gleiche Sache, andere Stelle: `Kernel.spec.ts` trägt sie in
  sieben `describe`-Namen (am Stand von `510443e`: `:2523`, `:2599`, `:2633`,
  `:2682`, `:2704`, `:2746`, `:2780`). Zusammen ist das eine eigene
  Aufräumrunde über das Repository, kein
  Nebenzweig eines Pakets, das im selben File arbeitet. → nächstes Audit.

**Was sich dadurch am Restplan ändert.**

- Paket 2 wird in 2a und 2b geteilt: das Netz kommt als eigener Commit, damit
  der Umbau in 2b mit einer unveränderten Spec-Datei belegen kann, dass er das
  Verhalten nicht angefasst hat.
- Paket 3 kommt neu hinzu, aus den Folgen 2 und 4, und steht hinter 2b: was
  dort fehlt, ist Abdeckung, kein Verhalten — die Umgebung selbst ist durch
  zehn Fälle in `ShadowEnv.spec.ts` belegt und die E2E-Suite grün.

### [x] 2a. Ein Wächter für jedes Mitglied der Creation API

- Findings: CLEAN-001 (medium, effort L) — geteilt in 2a, 2b-1, 2b-2a und
  2b-2b
- Ziel: Jedes Mitglied von `ShadowObjectCreationAPI` und beide Teardown-Wege
  haben einen Fall, der sie einzeln festhält, bevor sich der Code bewegt.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`
- Hängt ab von: —
- Modell: mittlere Stufe — kein Produktionscode, aber jeder Fall muss die
  Semantik treffen, die Paket 2b zu bewahren hat
- Anmerkungen für den Planer (aus dem Grobplan, hier beantwortet): Als Netz
  dient der vorhandene Block »Shadow Object Creation API« in `Kernel.spec.ts`
  samt den Lifecycle- und `onDestroy`-Fällen; wo er Lücken hat, werden sie
  geschlossen, *bevor* umgebaut wird. Die Lücken stehen unter »Was heute
  abgedeckt ist« — es sind genug, um daraus ein eigenes Paket zu machen.
- Hash: `510443e`
- Dateien: `packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`. Sonst
  nichts. Kein Changelog-Eintrag: es entsteht keine Zeile, die ein Konsument
  je sieht, und `dist/` wächst nicht (Specs sind vom Transpile ausgenommen).
- Verify: `pnpm -F @spearwolf/shadow-objects exec vitest src/in-the-dark/Kernel.spec.ts --run`,
  danach `pnpm lint && pnpm typecheck && pnpm test:ci`
- Commit: `test(kernel): every member of the shadow-object creation api has a guard of its own`

#### Was heute abgedeckt ist

`ShadowObjectCreationAPI` (`types.ts:112-183`) hat siebzehn Mitglieder: das
Feld `entity` und sechzehn Methoden. Die Zahl »elf« im Report ist nachgezählt
falsch — am Befund ändert das nichts, am Umfang des Netzes schon.

Der Block `describe('Shadow Object Creation API', …)` (`Kernel.spec.ts:275`)
deckt dreizehn davon ab, `dispatchMessageToView` liegt außerhalb im Block
`describe('MessageToView with traverseChildren', …)` (`:182`):

| Mitglied | Fälle |
| --- | --- |
| `useProperty` | `:277`, `:303`, dazu `:1692`, `:1718`, `:1740` |
| `useProperties` | `:329`, `:357` |
| `provideContext` | `:394`, `:432`, `:472` |
| `provideGlobalContext` | `:589`, `:625` |
| `useContext` | `:394`, `:432`, `:472`, `:1762` |
| `useParentContext` | `:498`, `:533`, `:1788` |
| `createResource` | `:667`, `:697` |
| `createEffect` | `:721`, `:749` |
| `createSignal` | `:780`, `:806`, `:832`, `:859` |
| `createMemo` | `:887` |
| `on` | `:916`, `:1113` |
| `once` | `:946`, `:975` |
| `onDestroy` | `:1001` bis `:1284`, zehn Fälle |
| `dispatchMessageToView` | `:195`, `:221`, `:247` |

Ohne einen einzigen Fall, in dieser Datei und im ganzen Repository:
`entity`, `emit`, `onViewEvent`. Dazu vier Verhaltensweisen innerhalb
abgedeckter Mitglieder, die kein Fall festhält:

- Die Form von `on()`/`once()`, bei der das erste Argument ein Ereignisname ist
  und die Anmeldung auf der Entität landet (`Kernel.ts:733-737`, `:751-755`).
  Alle vorhandenen Fälle übergeben ein eigenes Zielobjekt.
- Die Abmeldefunktion, die `on()`/`once()` in der Form mit Zielobjekt
  zurückgeben und die sich selbst aus `unsubscribeSecondary` austrägt
  (`Kernel.ts:744-747`, `:762-765`).
- `clearOnDestroy` von `provideContext()`/`provideGlobalContext()`
  (`Kernel.ts:553-557`, `:594-598`), in beiden Ausprägungen.
- Der Teardown auf Weg B (siehe unten) für alles außer `onDestroy` und `on`.

Beide Teardown-Wege sind erreicht, aber ungleich tief:

- **Weg A**, die Entität wird zerstört (`Kernel.ts:859`, `once(entry.entity,
  onDestroy, Priority.Low, tearDown)`): breit abgedeckt.
- **Weg B**, das Shadow Object verlässt die Konstruktorenmenge einer weiter
  lebenden Entität (`Kernel.ts:454` → `destroyShadowObject()` → `:916`): `:1051`
  (Route), `:1084` (Token), `:1113` (`on`), `:1146`, `:1184`, `:1216`, `:1249`.
  Kein Fall sieht dort nach, ob die Signal-Schleifen des Teardowns gelaufen
  sind — `createEffect`, `createSignal`, `createMemo`, `createResource`,
  `useProperty`, `useContext` werden auf Weg B nie geprüft. Genau diese
  Schleifen zieht 2b in eine Methode; ohne einen Fall auf Weg B belegt ein
  grüner Lauf nur den halben Teardown.

#### Zielverhalten

Nach diesem Paket gilt: Zu jedem der siebzehn Mitglieder gibt es mindestens
einen Fall, der es einzeln anfasst, und zu jeder der vier oben genannten
Verhaltensweisen einen eigenen. Beide Teardown-Wege sind je einmal bis in die
Signal-Schleifen belegt. Die Implementierung ist unverändert.

#### Vorgehen

Alle neuen Fälle kommen in `describe('Shadow Object Creation API', …)`, in die
jeweils genannten Unterblöcke. Aufbau wie die Nachbarn: eigene `Registry`,
eigener `Kernel`, `@ShadowObject({registry, token: …})`, `generateUUID()`.
Titel im Ton der jüngeren Fälle der Datei (dritte Person, kein »should«).

1. **`describe('entity', …)`** als neuer erster Unterblock.
   - `it('hands out the entity the kernel holds for that uuid')` — der
     Konstruktor legt `entity` in eine `let`-Variable des Testkörpers;
     `expect(captured).toBe(kernel.getEntity(uuid))`.
2. **`describe('emit', …)`**, neu hinter `describe('once', …)` (`:945-999`).
   Beim Destrukturieren umbenennen — `emit` ist in dieser Datei bereits der
   Import aus `@spearwolf/eventize` (`:1`): `constructor({emit: emitFromApi}:
   ShadowObjectCreationAPI)`, die Klasse hebt ihn in einem Feld auf, der Test
   holt sich das Shadow Object über `kernel.findShadowObjects(uuid)[0] as any`.
   - `it('emits on the entity when the first argument is an event name')` —
     `on(kernel.getEntity(uuid), 'pong', spy)`, dann `so.emitFromApi('pong',
     42)`; `expect(spy).toHaveBeenCalledWith(42)`.
   - `it('emits on the target when the first argument is an object')` — ein
     leeres `target`-Objekt mit eigenem Hörer, dazu ein zweiter Hörer auf der
     Entität; nach `so.emitFromApi(target, 'pong', 42)` hat der erste den Wert
     gehört und der zweite nichts.
3. **`describe('onViewEvent', …)`**, neu hinter `emit`. Der Weg von außen ist
   `kernel.dispatchEventsToEntity(uuid, [{type, data}])` (`Kernel.ts:406`).
   - `it('hears the view events the kernel dispatches to the entity')` —
     Konstruktor meldet einen Spy an; nach
     `kernel.dispatchEventsToEntity(uuid, [{type: 'hello', data: {x: 1}}])`
     gilt `expect(spy).toHaveBeenCalledWith('hello', {x: 1})`.
   - `it('stops hearing them when the shadow-object leaves the set')` — zweites
     Token mit leerer Klasse, `kernel.changeToken(uuid, …)`, `spy.mockClear()`,
     erneut dispatchen, `expect(spy).not.toHaveBeenCalled()`.
4. **`describe('on', …)`** um zwei Fälle erweitern.
   - `it('subscribes on the entity when the first argument is an event name')`
     — Konstruktor `subscribe('ping', handler)`; `emit(kernel.getEntity(uuid),
     'ping', 'data1')` erreicht den Handler; nach `kernel.changeToken(uuid, …)`
     auf ein leeres zweites Token und `handler.mockClear()` erreicht ihn ein
     weiteres `emit` nicht mehr.
   - `it('hands back an unsubscribe that takes the listener off on its own')` —
     Form mit Zielobjekt, Rückgabewert in einem Feld. `getSubscriptionCount`
     (in `:1` bereits importiert) steht auf `1`, nach dem Aufruf der
     Abmeldefunktion auf `0`, ein `emit(emitter, 'ping')` erreicht nichts, und
     das anschließende `kernel.destroyEntity(uuid)` läuft ohne Wurf durch.
5. **`describe('once', …)`** um einen Fall erweitern:
   `it('subscribes on the entity when the first argument is an event name')` —
   wie 4, aber nach dem ersten `emit` ist der Hörer von sich aus weg.
6. **`clearOnDestroy`**, zwei Fälle in `describe('provideContext and
   useContext', …)`. Aufbau für beide: Elternentität mit einem Shadow Object,
   das `provideContext('ctxValue', 'first', …)` ruft; Kindentität ohne Shadow
   Object; gelesen wird über
   `value(kernel.getEntity(childUuid).useContext('ctxValue'))`. Der Teardown
   läuft über `kernel.changeToken(parentUuid, …)` auf ein leeres Token — Weg B,
   beide Entitäten bleiben am Leben.
   - `it('leaves the context in place when clearOnDestroy is false')` — nach dem
     Tokenwechsel steht der Wert noch beim Kind.
   - Der Standardfall: **erst messen, dann behaupten.** Die Reihenfolge im
     Teardown spricht dagegen, dass das Kind die Löschung sieht.
     `unsubscribeSecondary` ist ein `Set` und läuft in Einfügereihenfolge; die
     Verbindung zur Entität wird bei der Erzeugung eingetragen
     (`Kernel.ts:546-548`), der `set(undefined)`-Rückruf des `clearOnDestroy`
     erst danach (`:553-557`) — die Verbindung ist also abgeräumt, bevor
     gelöscht wird. Ergibt der Lauf das, wird der Fall auf das gemessene
     Verhalten gestellt, mit einem Kommentar, der die Reihenfolge benennt, und
     die Abweichung zu `docs/api-reference.md:133` (»the context is set to
     `undefined` and every consumer sees that«) geht als Nebenbefund in den
     Bericht.
- Ergebnis: 2 Runden plus Nachtrag · 78 → 107 Fälle in `Kernel.spec.ts`,
  947 statt 908 Fälle im Workspace · `Kernel.ts` byte-identisch, mit
  `git diff` belegt · jeder Fall mutationsgeprüft: die Zeile, die er
  verteidigt, wurde entfernt oder verschoben, der Fall wurde rot gesehen, die
  Mutation zurückgenommen · Reviewer hat neun Mutationen selbst nachgefahren,
  inklusive Gegenproben gegen Übertreibung (die fünf Signal-Schleifen
  untereinander vertauscht → grün, also reagiert der Reihenfolge-Fall auf die
  Position der Blöcke zueinander und nicht auf deren interne Ordnung) ·
  abgesichert sind alle drei Reihenfolgen, auf die sich der Detailplan von 2b
  festlegt · Verify vom Orchestrator selbst gelesen: Kernel-Spec 107/107,
  lint ✓ typecheck ✓ `test:ci --force` ✓
- Nebenbefunde:
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts:620`/`:823` (useContext)
    und `:647`/`:827` (useParentContext) — die explizite Link-Abmeldung in
    `unsubscribeSecondary` und die spätere `destroySignal`-Schleife sichern
    denselben Effekt doppelt ab: signalize zerstört einen Link, sobald eines
    seiner Enden fällt. Keine der beiden Zeilen ändert allein beobachtbares
    Verhalten. Keine Fehlfunktion, eine bislang unbelegte Redundanz.
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts:745`/`:763` — dieselbe
    Redundanz bei der Selbstaustragung von `on()`/`once()`: eventize nullt den
    Zustand der Abmeldefunktion beim ersten Aufruf, ein zweiter ist ein
    garantierter No-op. Die kernel-eigene Buchführung ist Hygiene gegen
    unbegrenztes Wachstum der Aufräum-Menge, nicht Korrektheit.
  - `packages/shadow-objects/docs/api-reference.md:133` verspricht, dass
    `clearOnDestroy` jeden Konsumenten `undefined` sehen lässt. Auf dem Weg
    »Shadow Object verlässt die Konstruktorenmenge« stimmt das nicht — siehe
    die beiden Fälle, die das gemessene Verhalten festhalten. Weder Code noch
    Doku angefasst; die Entscheidung, welche der beiden Seiten nachgibt,
    gehört nicht in ein Testpaket.
- Folgen: keine. Kein Produktionscode, kein Changelog, kein `dist/`.
- Schnittstellen: keine. Die Datei ist eine Spec und wird nicht transpiliert.

#### Triage der Nebenbefunde (2026-08-20, beim Planen von 2b)

Drei Einträge, keine Folgen. `Kernel.ts` ist auf `510443e` byte-identisch mit
`44891c2` — `git diff 44891c2 510443e -- packages/shadow-objects/src/in-the-dark/`
meldet allein `Kernel.spec.ts`. Alles, was diese drei Einträge beschreiben, ist
damit vorbestehend; 2a hat nur hingesehen.

1. **Doppelte Absicherung zwischen Link-Abmeldung und `destroySignal`-Schleife**
   (`Kernel.ts:620`/`:823`, `:647`/`:827`) — **vorbestehend**, und nur zur
   Hälfte redundant. Für die beiden Leser-Links (`useContext`, `useParentContext`)
   und den Property-Link (`:507`/`:830`) stimmt der Befund: signalize zerstört
   den Link ohnehin, sobald das Ziel-Signal fällt, und kein Fall des Netzes
   sieht einen Unterschied. Für die beiden **Provider**-Links (`:549`/`:834`,
   `:590`/`:838`) stimmt er nicht. Dort steht die Abmeldung in
   `#unsubscribeSecondary` **vor** dem `clearOnDestroy`-Rückruf (`:553-557`,
   `:594-598`); fiele sie weg, liefe die Schreibung auf `undefined` noch durch
   den lebenden Link zum entitätseigenen Kontextsignal, und das Kind sähe die
   Löschung — `Kernel.spec.ts:654` geht dann rot. → Vorgabe in 2b-1: **beide
   Seiten ziehen wörtlich mit um**, an jeder der fünf Stellen. Wer sie
   auflösen will, tut das in einem eigenen Paket mit eigenem Changelog-Eintrag.
2. **Selbstaustragung von `on()`/`once()`** (`Kernel.ts:745`/`:763`) —
   **vorbestehend**, kein Symptom. Der zweite Aufruf einer eventize-Abmeldung
   ist ein garantierter No-op; die kernel-eigene Buchführung hält allein
   `#unsubscribeSecondary` davon ab, über die Lebenszeit eines langlebigen
   Shadow Objects unbegrenzt zu wachsen. Das ist Speicherverhalten, nicht
   beobachtbares Verhalten, und das Netz kann den Verlust nicht bemerken.
   → Vorgabe in 2b-1: **bleibt**, samt einem Satz Kommentar, der den Zweck
   benennt.
3. **`docs/api-reference.md:133` gegen das gemessene `clearOnDestroy`-Verhalten**
   — **vorbestehend**. Die Zeile steht auf `44891c2` wortgleich an derselben
   Stelle, `Kernel.ts` ist unverändert; die Abweichung ist älter als dieser
   Lauf. Sie **bleibt bestehen**: 2b ist ein reines Refactoring und darf
   Verhalten nicht anfassen, und die Doku anzupassen, während der Code sich
   bewegt, macht aus zwei prüfbaren Diffs einen unprüfbaren. → **nächstes
   Audit**, nicht dieser Lauf. Grund: Welche Seite nachgibt, ist eine
   API-Entscheidung und keine Folge der beiden beauftragten Findings. Die Doku
   nachzuziehen verwandelt eine Zusage in eine wegabhängige Eigenheit; den Code
   nachzuziehen ändert, was jeder Konsument bei einem Token- oder Routenwechsel
   sieht. Beides braucht den Nutzer, nicht den Implementierer eines
   Refactorings. Festgehalten ist das gemessene Verhalten in
   `Kernel.spec.ts:654` und `:697`, mitsamt dem Kommentar, der die offene
   Entscheidung benennt.

**Was sich dadurch am Restplan ändert.** Paket 2b wird in 2b-1 und 2b-2
geteilt: der wörtliche Umzug und das Zusammenlegen der fast gleichen Mitglieder
sind verschiedene Risiken, und ein unverändertes `Kernel.spec.ts` belegt jedes
davon einzeln. Nummern werden dabei nicht neu vergeben — `2b` ist eine ID, die
in ihre beiden Nachfolger zerfällt.

### [x] 2b-1. Die Creation API zieht wörtlich in eine eigene Klasse

- Findings: CLEAN-001 (medium, effort L) — geteilt in 2a, 2b-1, 2b-2a und
  2b-2b
- Ziel: `Kernel.constructShadowObject` gibt Maps, API-Methoden und Teardown an
  eine eigene Einheit ab und wird wieder lesbar. Kein Zeichen Verhalten ändert
  sich dabei.
- Bereich: `packages/shadow-objects/src/in-the-dark/Kernel.ts`, die neue Datei
  daneben, `packages/shadow-objects/CHANGELOG.md`
- Hängt ab von: Paket 2a — das Netz steht grün (107 Fälle, `510443e`)
- Modell: stärkste Stufe — 406 Zeilen Closure mit einem Lebenszyklus an zwei
  unabhängigen Wegen, und drei Reihenfolgen, die beobachtbares Verhalten sind
- Hash: `c5538e8`
- Dateien: `packages/shadow-objects/src/in-the-dark/Kernel.ts`,
  `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts` (neu),
  `packages/shadow-objects/CHANGELOG.md`. Ausdrücklich **nicht**:
  `Kernel.spec.ts` (die unveränderte Datei ist der Beweis), `types.ts`
  (`ShadowObjectCreationAPI` bleibt Wort für Wort stehen), `index.ts`,
  `shadow-objects.ts`, `docs/`, `README.md`, `Backlog.md`.
- Verify: `pnpm -F @spearwolf/shadow-objects exec vitest src/in-the-dark/Kernel.spec.ts --run`
  (107/107), danach `pnpm lint && pnpm typecheck && pnpm test:ci`, und
  `git diff -- packages/shadow-objects/src/in-the-dark/Kernel.spec.ts` muss
  **leer** sein
- Commit: `refactor(kernel): the shadow-object creation api moves into a scope of its own`

#### Das Testnetz ist die Vorgabe, nicht der Beifang

`Kernel.spec.ts` hält 107 Fälle, jeder davon in Paket 2a mutationsgeprüft, und
**darf sich nicht ändern** — keine Zeile, kein Titel, keine Einrückung. Der leere Diff auf
dieser Datei ist die einzige Zusicherung, die dieses Paket überhaupt geben
kann: dass es Verhalten nicht angefasst hat, lässt sich nicht anders zeigen.

Die Prüfung gehört in denselben Zug wie der Testlauf:

```
git diff -- packages/shadow-objects/src/in-the-dark/Kernel.spec.ts   # muss leer sein
git diff --stat                                                      # ohne Kernel.spec.ts
```

Meint der Implementierer, ein Fall müsse sich zwangsläufig ändern, damit der
Umbau grün wird, dann ist der Umbau falsch — und wenn er das nach zweimaligem
Hinsehen weiter meint, ist das eine **Rückfrage an den Nutzer**, keine
Entscheidung, die er allein trifft. Die Fallzahl am Ende ist dieselbe wie am
Ende von 2a: 107 in `Kernel.spec.ts`, 947 im Workspace.

Drei Reihenfolgen hat 2a mutationsgeprüft festgenagelt. Sie sind keine
Implementierungsdetails, sondern das, was der Umbau zu erhalten hat:

| Reihenfolge | Wo sie heute steht | Wer sie hält |
| --- | --- | --- |
| Die `onDestroy`-Rückrufe laufen vor der Zerstörung der Signale | `Kernel.ts:814-816` vor `:822-840` | `Kernel.spec.ts:2019` |
| Die primäre Aufräum-Menge läuft vor der sekundären | `Kernel.ts:814-816` vor `:818-820` | `Kernel.spec.ts:2342` |
| Innerhalb der sekundären Menge steht die Verbindung zur Entität vor dem `clearOnDestroy`-Rückruf | `Kernel.ts:549` vor `:553-557`, `:590` vor `:594-598` | `Kernel.spec.ts:654`, Gegenprobe `:697` |

Die dritte hängt daran, dass `#unsubscribeSecondary` ein `Set` ist und in
Einfügereihenfolge läuft. Wer die Menge gegen ein Array, eine Map oder eine
umgekehrte Iteration tauscht, bricht sie. Sie bleibt ein `Set`, und die
Reihenfolge der `add()`-Aufrufe bleibt Zeichen für Zeichen die heutige.

Dazu vier Fälle, die beim Umbau leicht kippen und deshalb genannt sein wollen:

- `Kernel.spec.ts:1892` und `:1955` zählen Signale und Links über
  `getSignalsCount()`/`getLinksCount()` auf beiden Teardown-Wegen zurück auf
  ihre Grundlinie. Ein vergessener `destroySignal`-Aufruf oder eine vergessene
  Map fällt hier auf.
- `Kernel.spec.ts:2308` greift aus einem `onDestroy`-Rückruf über
  `kernel.changeToken()` in den Kernel zurück und verlässt sich darauf, dass
  das Shadow Object zu diesem Zeitpunkt noch in `entry.usedConstructors` steht.
  Siehe Schritt 8 — das ist der Punkt, an dem der ursprüngliche Entwurf dieses
  Pakets falsch lag.
- `Kernel.spec.ts:2781` erwartet `console.warn` **genau einmal**. Eine
  versehentlich mitausgelöste Deprecation-Warnung geht dort rot.
- `Kernel.spec.ts:622` und `:1113` halten fest, dass `clearOnDestroy` bei jedem
  Aufruf gelesen wird, nicht nur bei dem, der das Provider-Signal anlegt.

#### Was heute passiert

`constructShadowObject()` (`Kernel.ts:473-878`) legt in einem Rutsch an:

- zwei Rückruf-Mengen, `unsubscribePrimary` und `unsubscribeSecondary`
  (`:474-475`);
- sechs Kontext-Maps (`:477-482`) und zwei Property-Maps (`:484-485`);
- die lokale Funktion `getUseProperty` (`:487-515`), die als `useProperty` in
  die API geht (`:661`) und die `useProperties` (`:663-675`) mitbenutzt;
- das Objektliteral mit den sechzehn Methoden und dem Feld `entity`
  (`:517-789`), das direkt in `new construct(…)` läuft, umschlossen von
  `eventize(…)` (`:517`, `:790`);
- den Info-Log `create shadow-object` (`:792-794`);
- den Teardown als Closure (`:801-857`) über all das, dazu die Anmeldung auf
  `onDestroy` der Entität (`:859`), den Eintrag in `#shadowObjectTearDowns`
  (`:861`), die Buchführung in `entry.usedConstructors` (`:863-873`) und
  `attachShadowObject()` (`:875`).

Der Teardown wird auf zwei Wegen erreicht, und beide müssen bleiben:

- **Weg A:** `once(entry.entity, onDestroy, Priority.Low, tearDown)` (`:859`) —
  die Entität stirbt.
- **Weg B:** `destroyShadowObject()` (`:907-919`) holt ihn aus
  `#shadowObjectTearDowns` (`:916`), wenn das Shadow Object die
  Konstruktorenmenge einer weiter lebenden Entität verlässt (`:454`).

Die Einmaligkeit hängt heute daran, dass der Teardown als Erstes beide Griffe
löst (`:807-808`); der Kommentar darüber (`:802-806`) erklärt das. Fünf
`let`-Flaggen auf Modulebene (`:62-66`) sorgen dafür, dass jede der fünf
Deprecation-Warnungen einmal pro Realm erscheint.

Reihenfolge und Nebenwirkungen, die der Umbau nicht verschieben darf — über die
drei Tabellenzeilen oben hinaus:

- Die fünf Signal-Schleifen (`:822-840`) laufen nach beiden Rückruf-Mengen, in
  dieser Folge: `contextReaders`, `contextParentReaders`, `propertyReaders`,
  `contextProviders`, `contextRootProviders`. Das Leeren aller Mengen und Maps
  (`:842-848`) kommt danach.
- `entry.entity.provideContext(name)` bzw. `provideGlobalContext(name)` wird
  nur beim ersten Aufruf berührt (`:548`, `:589`), nicht bei jedem.
- Das Austragen aus `entry.usedConstructors` steht am **Ende** des Teardowns
  (`:850-856`), nicht am Anfang.
- `destroyShadowObject()` ruft den Teardown **nach** den Destroy-Meldungen an
  das Shadow Object (`:908-916`).

#### Zielaufbau

Eine neue, modulinterne Klasse `ShadowObjectCreationScope` in
`packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`.

**Modulintern, nicht exportiert nach außen.** Geprüft an
`packages/shadow-objects/package.json`: die `exports`-Map zählt zehn Einträge
auf und hat keinen Platzhalter — ein tiefer Import auf die neue Datei ist für
einen Konsumenten nicht auflösbar, und weder `index.ts` noch `shadow-objects.ts`
reichen sie weiter. Damit entfällt die Doku-Pflicht aus »Konventionen«.
Bleibt der Changelog: Der Transpile-Schritt legt
`dist/src/in-the-dark/ShadowObjectCreationScope.js` und `.d.ts` an, und der
Dateibestand von `dist/` ist laut `CLAUDE.md` eine bewusste Entscheidung mit
Changelog-Eintrag. Der Eintrag steht unter `## [Unreleased]` in einem
`### Internal`-Abschnitt.

Der Name der Klasse ist bewusst nicht `ShadowObjectCreationAPI` — so heißt der
Typ in `types.ts:112`, und zwei Dinge gleichen Namens in einem Aufrufpfad
verwirren mehr, als sie erklären. Die Klasse *hält* den Zustand und *reicht*
die API heraus.

Gestalt:

```ts
export class ShadowObjectCreationScope {
  constructor(entity: Entity, logger: ConsoleLogger, displayName: string);

  /** The object that goes into `new construct(…)`. */
  createAPI(): ShadowObjectCreationAPI;

  /**
   * Binds the scope to the shadow-object it made the API for, subscribes to the entity's
   * destruction, and takes the two releases the kernel needs while the teardown runs:
   * `releaseScope` at its start, `forgetShadowObject` at its end.
   */
  bindTo(shadowObject: ShadowObjectType, releaseScope: () => void, forgetShadowObject: () => void): void;

  /** Runs once, whichever of the two paths reaches it first. */
  tearDown(): void;
}
```

Fünf Festlegungen, jede mit ihrem Grund:

1. **Kein `implements ShadowObjectCreationAPI` an der Klasse.** Der Vertrag wird
   über den Rückgabetyp von `createAPI()` geprüft — das ist dieselbe
   kontextuelle Prüfung, die das heutige Objektliteral besteht, und sie kommt
   ohne die Frage aus, ob eine Methode mit `(...args: any[])` auf die
   überladenen Signaturen von `on`, `once`, `emit`, `createEffect` und
   `createSignal` passt.
2. **`createAPI()` gibt ein gewöhnliches Objektliteral zurück**, dessen
   Mitglieder `this.<methode>.bind(this)` sind. Nachgezählt: `Kernel.spec.ts`
   destrukturiert die API in 81 Konstruktoren, und jedes Modul unter
   `packages/shadow-objects-e2e/public/` tut dasselbe — eine Prototyp-Methode
   verlöre dabei ihr `this`. Gebundene Funktionen sind die einzige Form, die das
   unbeschadet übersteht. Kein `Object.freeze`: eingefroren war das Objekt nie,
   und ein Konsument, der hineinschreibt, soll das nicht in diesem Paket zum
   ersten Mal merken. Sollte `strictBindCallApply` bei `createEffect` oder
   `createSignal` gegen `.bind(this)` stehen (beide sind im Typ als
   `typeof createEffect` bzw. `typeof createSignal` deklariert,
   `types.ts:153-154`), ist der Ausweg eine Pfeilfunktion als Klassenfeld für
   genau diese beiden — nicht ein `as`-Cast über das ganze Literal.
3. **Die Klasseninstanz selbst geht nie an ein Shadow Object.** Sonst stünden
   `tearDown()` und `bindTo()` in der öffentlichen Reichweite jedes
   Konstruktors.
4. **`tearDown()` schützt sich mit einer eigenen Flagge** `#isTornDown` statt
   über das Lösen der beiden Griffe. Die Griffe werden weiterhin als Erstes
   gelöst — das beendet die Festhaltung in beide Richtungen —, aber die
   Einmaligkeit steht dann geschrieben, statt sich zu ergeben.
5. **Zwei Rückrufe an den Kernel, nicht einer.** Der Kernel löst heute an zwei
   entgegengesetzten Enden des Teardowns: den WeakMap-Eintrag ganz am Anfang
   (`:807`), den Eintrag in `entry.usedConstructors` ganz am Ende (`:850-856`).
   Ein einziger Rückruf zöge das zusammen und machte aus einem Refactoring eine
   Verhaltensänderung — ein `onDestroy`-Rückruf, der über `findShadowObjects()`
   oder `changeToken()` in den Kernel zurückgreift, fände sein Shadow Object
   dann bereits ausgetragen. `Kernel.spec.ts:2308` beschreibt genau diesen
   Rückgriff. Deshalb `releaseScope` und `forgetShadowObject` getrennt.

Aufteilung der Mitglieder in der Datei, in dieser Reihenfolge:

| Gruppe | Mitglieder |
| --- | --- |
| Lebenszyklus | `createAPI`, `bindTo`, `tearDown` |
| Properties | `useProperty`, `useProperties` |
| Kontexte | `provideContext`, `provideGlobalContext`, `useContext`, `useParentContext` |
| Signale | `createSignal`, `createEffect`, `createMemo`, `createResource` |
| Subscriptions | `on`, `once`, `emit`, `onViewEvent`, `onDestroy` |
| Durchreiche | `dispatchMessageToView` |

Was im `Kernel` bleibt: `constructShadowObject()` schrumpft auf das, was dem
Kernel gehört — Scope bauen, `eventize(new construct(scope.createAPI()))`, den
WeakMap-Eintrag, `bindTo()` mit den beiden Rückrufen, die Buchführung in
`entry.usedConstructors`, `attachShadowObject()` und `return`.
`attachShadowObject()` bleibt unverändert, `destroyShadowObject()` bis auf den
Zugriff auf die WeakMap.

#### Vorgehen

Der Umbau zerfällt in drei Etappen, die je für sich grün laufen — Etappe A und
B ergeben zusammen den Commit dieses Pakets, C ist die Abnahme. Wer zwischen
den Etappen anhält, hat einen übersetzbaren Baum.

**Etappe A — die neue Datei entsteht, `Kernel.ts` ruft sie noch nicht.**

1. **`ShadowObjectCreationScope.ts` anlegen.** Kopfzeilen: `import type {Entity}
   from './Entity.js'` — rein als Typ, weil `Entity.ts` seinerseits `Kernel.js`
   zur Laufzeit importiert (`Entity.ts:14`) und eine weitere Kante in diesem
   Kreis nicht sein muss. `verbatimModuleSyntax` steht in
   `packages/shadow-objects/tsconfig.json` auf `true`, also gehört an jeden
   reinen Typ-Import ein `import type`.
2. **Felder und Konstruktor.** Die zehn Mengen und Maps werden `#private`
   Felder mit den heutigen Namen: `#unsubscribePrimary`, `#unsubscribeSecondary`,
   `#contextReaders`, `#contextReaderCompares`, `#contextParentReaders`,
   `#contextParentReaderCompares`, `#contextProviders`, `#contextRootProviders`,
   `#propertyReaders`, `#propertyCompares`. Dazu `#entity`, `#logger`,
   `#displayName`, `#shadowObject`, `#releaseScope`, `#forgetShadowObject`,
   `#unsubscribeFromEntityDestroy`, `#isTornDown`. Die beiden Aufräum-Mengen
   bleiben `Set` — ihre Einfügereihenfolge ist beobachtbares Verhalten.
3. **Die sechzehn Methoden und das Feld `entity` wandern wörtlich.** Aus
   `entry.entity` wird `this.#entity`, aus `unsubscribeSecondary` wird
   `this.#unsubscribeSecondary`, sonst ändert sich kein Zeichen: die fünf
   `let`-Deprecation-Flaggen ziehen als Modulvariablen mit, `on` und `once`
   behalten ihre Fallunterscheidung und den
   `Object.assign(() => {…}, unsub)`-Rückgabewert samt der Austragung aus der
   Aufräum-Menge (`Kernel.ts:732-766`), `emit` seine Fallunterscheidung
   (`:768-777`), `createResource` seinen Effekt samt Aufräumen (`:677-706`),
   `createSignal`/`createEffect`/`createMemo` ihre `// @ts-ignore`-Zeilen,
   `getUseProperty` wird zur Methode `useProperty`, die `useProperties`
   weiterhin ruft. Alle Warntexte bleiben Zeichen für Zeichen. Die beiden
   auskommentierten `// return unsub;`-Zeilen (`:743`, `:761`) dürfen wegfallen
   — sie tragen nichts, und ein Rückblick auf einen Vorzustand gehört nach
   »Konventionen« ohnehin nicht in den Code.
   An `:745`/`:763` und an die fünf Link-Abmeldungen kommt je ein Satz
   Kommentar, warum sie dort stehen: die Selbstaustragung hält die Aufräum-Menge
   davon ab, über die Lebenszeit eines Shadow Objects unbegrenzt zu wachsen; die
   Abmeldung der beiden Provider-Links steht vor dem `clearOnDestroy`-Rückruf,
   damit die Schreibung auf `undefined` das entitätseigene Kontextsignal nicht
   mehr erreicht.
4. **`createAPI()`** gibt das Literal mit den siebzehn Mitgliedern zurück —
   `entity: this.#entity` und sechzehn `this.<methode>.bind(this)`. Der
   Rückgabetyp ist `ShadowObjectCreationAPI`, ohne Cast.
5. **`bindTo(shadowObject, releaseScope, forgetShadowObject)`** hält die drei
   Argumente fest, schreibt den Info-Log `create shadow-object` (heute
   `Kernel.ts:792-794`, Text und Nutzlast `{shadowObject, entity}` unverändert,
   weiterhin hinter `if (this.#logger.isInfo)`) und meldet Weg A an:
   `this.#unsubscribeFromEntityDestroy = once(this.#entity, onDestroy,
   Priority.Low, () => this.tearDown())`.
6. **`tearDown()`** in genau dieser Reihenfolge — sie ist die Liste, gegen die
   der Reviewer liest:
   1. `if (this.#isTornDown) return;` und `this.#isTornDown = true;`
   2. `this.#releaseScope?.()` — der Kernel vergisst den Scope (heute `:807`)
   3. `this.#unsubscribeFromEntityDestroy?.()` (heute `:808`)
   4. Info-Log `destroy shadow-object`, hinter `if (this.#logger.isInfo)`
      (heute `:810-812`)
   5. `#unsubscribePrimary` durchlaufen (heute `:814-816`)
   6. `#unsubscribeSecondary` durchlaufen (heute `:818-820`)
   7. die fünf `destroySignal`-Schleifen in der Folge `contextReaders`,
      `contextParentReaders`, `propertyReaders`, `contextProviders`,
      `contextRootProviders` (heute `:822-840`)
   8. alle Mengen und Maps leeren (heute `:842-848`)
   9. `this.#forgetShadowObject?.()` — der Kernel trägt das Shadow Object aus
      `entry.usedConstructors` aus (heute `:850-856`)

   Der Kommentar darüber erklärt, warum die Flagge und das frühe Lösen der
   Griffe beide nötig sind — die Flagge macht den Teardown zu einem einmaligen
   Akt, das Lösen beendet die Festhaltung in beide Richtungen: die WeakMap zeigt
   vom Shadow Object auf den Scope, die Anmeldung von der Entität auf denselben
   — und warum der zweite Rückruf ans Ende gehört: ein Destroy-Rückruf, der in
   den Kernel zurückgreift, findet sein Shadow Object dort noch verzeichnet.
   Kein Rückblick auf den Vorzustand, wie in »Konventionen« festgelegt.

**Etappe B — `Kernel.ts` gibt ab.**

7. **Das Feld umstellen.** `#shadowObjectTearDowns` wird zu
   `readonly #shadowObjectScopes = new WeakMap<object, ShadowObjectCreationScope>()`.
   Der Blockkommentar darüber (`:89-102`) wird neu geschrieben: Er beschreibt
   heute ausdrücklich eine Closure. Was bleiben muss, ist der Absatz über den
   Schlüssel — ein Konstruktor, der dieselbe Instanz zweimal herausgibt, hält
   nur den späteren Scope erreichbar.
8. **`constructShadowObject()` neu schreiben**, in dieser Reihenfolge:
   ```ts
   const scope = new ShadowObjectCreationScope(entry.entity, this.logger, getDisplayName(construct));
   const shadowObject = eventize(new construct(scope.createAPI()));
   this.#shadowObjectScopes.set(shadowObject, scope);
   scope.bindTo(
     shadowObject,
     () => { this.#shadowObjectScopes.delete(shadowObject); },
     () => { /* das Austragen aus entry.usedConstructors, heute :850-856 */ },
   );
   // die Buchführung von :863-873 samt ihrem Kommentar
   this.attachShadowObject(shadowObject, entry.entity);
   return shadowObject;
   ```
   Drei Reihenfolgen darin sind tragend: `set()` vor `bindTo()`, damit der
   Rückruf beim Löschen etwas vorfindet; die Buchführung vor
   `attachShadowObject()`, damit ein `onCreate`, das die Entität sofort
   zerstört, einen vollständigen Eintrag vorfindet; und `bindTo()` vor
   `attachShadowObject()`, damit dasselbe `onCreate` den Teardown überhaupt
   erreicht.
   `getDisplayName(construct)` wird dabei unbedingt gerufen statt wie heute nur
   hinter `logger.isInfo` — die Funktion (`:60`) liest zwei Felder und hat keine
   Nebenwirkung.
9. **`destroyShadowObject()`** ruft
   `this.#shadowObjectScopes.get(shadowObject)?.tearDown()` an der Stelle des
   heutigen `?.()` (`:916`). Der Kommentar darüber bleibt.
10. **`getDisplayName()`** (`:60`) bleibt in `Kernel.ts` und liefert das dritte
    Konstruktorargument des Scopes. Der Kernel gibt seinen eigenen Logger weiter
    (`this.logger`, `:78`), damit die Ausgaben denselben Namen tragen.
11. **Die verwaisten Importe aus `Kernel.ts` entfernen.** Nachgezählt am
    heutigen Stand sind das genau: `once` und `Priority` aus
    `@spearwolf/eventize`; `CompareFunc`, `createEffect`, `createMemo`,
    `createSignal`, `destroySignal`, `isSignal`, `link`, `Signal` und
    `SignalReader` aus `@spearwolf/signalize` — der Import schrumpft auf
    `{batch}`; `Maybe`, `ProvideContextOptions` und `SignalValueOptions` aus
    `../types.js`; `onViewEvent` aus `./events.js`; die Zeile
    `import {toMaybe} from '../utils/toMaybe.js'` fällt ganz weg. Stehen bleiben
    `emit`, `eventize`, `off`, `on`, `batch`, `Entity`, `ConsoleLogger`,
    `Registry`, `SignalsPath`, `onCreate`, `onDestroy`, `onParentChanged`,
    `OnCreate`, `OnDestroy` und die übrigen Typen. `noUnusedLocals` steht in der
    Wurzel-`tsconfig.json` auf `true` — `pnpm typecheck` findet jeden
    Übriggebliebenen, blindes Streichen ist trotzdem der falsche Weg.

**Etappe C — die Abnahme.**

12. **`pnpm typecheck`** ist hier der schärfere Wächter als der Testlauf. Meldet
    er die Zuweisung des Literals aus `createAPI()` an
    `ShadowObjectCreationAPI` an, wird die Signatur der betroffenen Methode
    gerade gezogen — kein `as`-Cast über das ganze Literal, der jede echte
    Abweichung mitverdeckt.
13. **`packages/shadow-objects/CHANGELOG.md`** unter `## [Unreleased]`, in
    einem `### Internal`-Abschnitt: die neue Einheit beim Namen, ihr Zweck in
    einem Satz, und dass das Paketausgabeverzeichnis um dieses Modul und seine
    Typen wächst. Keine Verhaltensänderung, also kein Eintrag unter Fixed oder
    Changed. Ton wie die Nachbarn: was gilt, nicht was war.
14. **Der Beleg.** `git diff -- packages/shadow-objects/src/in-the-dark/Kernel.spec.ts`
    ist leer, `git diff --stat` nennt drei Dateien.
    `pnpm lint && pnpm typecheck && pnpm test:ci` läuft vollständig grün, mit
    derselben Fallzahl wie am Ende von 2a (107 in `Kernel.spec.ts`, 947 im
    Workspace). Weicht sie ab, ist etwas verloren gegangen.

#### Was ausdrücklich nicht dazugehört

- **Keine Verhaltensänderung, keine einzige.** Auch nicht die naheliegende:
  Warntexte bleiben zeichengleich, Reihenfolgen bleiben, `clearOnDestroy` wird
  nicht »repariert«, die `// @ts-ignore`-Zeilen ziehen mit um, statt aufgelöst
  zu werden.
- **Keine der beiden Redundanzen wird aufgelöst.** Die fünf expliziten
  Link-Abmeldungen bleiben neben den `destroySignal`-Schleifen stehen, die
  Selbstaustragung von `on()`/`once()` bleibt neben dem No-op der zweiten
  eventize-Abmeldung. Begründung steht in der Triage über diesem Paket.
- **Kein Zusammenlegen der fast gleichen Mitglieder.** Die drei
  zwischengespeicherten Reader, die beiden Provider und die fünf
  Deprecation-Flaggen wandern in Etappe A wörtlich mit und werden erst in 2b-2
  zusammengefasst. Wer beides in einem Zug tut, hat am Ende einen Diff, in dem
  Umzug und Umbau nicht mehr auseinanderzuhalten sind.
- **Kein Anfassen von `Kernel.spec.ts`.** Muss ein Fall angepasst werden, damit
  der Umbau grün wird, ist der Umbau falsch, nicht der Fall — und die Frage
  geht an den Nutzer.
- **Keine öffentliche API.** Der Typ `ShadowObjectCreationAPI` in `types.ts`
  bleibt Zeichen für Zeichen, `index.ts` und `shadow-objects.ts` bleiben
  unberührt, `docs/` und `README.md` haben nichts zu melden. Insbesondere bleibt
  `docs/api-reference.md:133` stehen, wie es steht.
- Kein Aufteilen von `Kernel.ts` darüber hinaus. `Entity`, `Registry` und der
  Change-Trail-Teil des Kernels bleiben, wo sie sind, so groß sie sind.
- Keine der übrigen 36 Findings.

#### Das Finding im Wortlaut

**CLEAN-001 · medium · effort L ·
`packages/shadow-objects/src/in-the-dark/Kernel.ts:473-878`** —
`Kernel.constructShadowObject` ist eine Closure über 406 Zeilen.

»Die Methode legt sechs Kontext-Maps, zwei Property-Maps und elf Methoden der
Creation API in einer einzigen Closure an, baut darüber den Teardown und hängt
ihn an zwei unabhängige Wege. Sie ist damit die größte Funktion des
Repositories und zugleich die, an der jede neue Fähigkeit eines Shadow Objects
ansetzt. Getestet wird sie ausschließlich über ihr Ergebnis: keine der elf
API-Methoden ist für sich erreichbar, keine der Maps für sich prüfbar. Seit dem
letzten Lauf ist sie um zwanzig Zeilen gewachsen.«

Empfehlung des Reports: »Die Creation API als eigene Klasse führen, mit den
Maps als Feldern und je einer Methodengruppe für Kontexte, Properties, Signale
und Subscriptions. Der Teardown wird dann eine Methode statt einer Closure, und
der Kernel behält, was sein Name verspricht.«

Der Empfehlung wird in zwei Punkten nicht gefolgt, beide oben begründet: Die
Maps werden `#private` Felder statt lesbarer, und die Klasse selbst geht nicht
als API an das Shadow Object, sondern gibt sie über `createAPI()` heraus. Der
Report zählt elf Methoden; es sind sechzehn plus das Feld `entity`
(`types.ts:112-184`).

- Ergebnis: 1 Runde, kein Nachbessern nötig · `Kernel.ts` 952 → 564 Zeilen,
  `constructShadowObject` 406 → 37 · `ShadowObjectCreationScope.ts` neu,
  482 Zeilen, modulintern · `Kernel.spec.ts` unverändert, `git diff` leer —
  der Beweis, den dieses Paket als einzigen führen kann · Reviewer hat den
  Diff normalisiert (private Felder zurückbenannt, Whitespace und Kommentare
  entfernt) und Anweisung für Anweisung verglichen: keine abweichende
  Anweisung in den siebzehn Mitgliedern und im Teardown, alle Unterschiede
  sind Umbruch, Klammern und drei ergänzte `: void` · Verify vom Orchestrator
  selbst gelesen: Kernel-Spec 107/107, lint ✓ typecheck ✓ `test:ci --force` ✓
  947 Fälle, Spec-Diff 0 Zeilen · offen und klein, Eingabe für 2b-2, das
  dieselbe Datei anfasst:
  - `ShadowObjectCreationScope.ts:203`, `:330`, `:357` — den drei Reader-Links
    fehlt der Satz, warum die Abmeldung dort steht; die beiden Provider-Links
    (`:255`, `:298`) haben ihn. Die Begründung ist bei den Readern eine andere:
    der Link muss enden, damit das entitätsseitige Signal keinen zerstörten
    Reader mehr speist.
  - `ShadowObjectCreationScope.ts:121`, `:470` — acht Methodennamen decken sich
    mit den Modul-Importen, die sie aufrufen (`once(this.#entity, onDestroy, …)`
    im Rumpf einer Klasse mit `onDestroy()`-Methode). Korrekt, weil
    Methodennamen keine lexikalische Bindung sind, aber beim ersten Lesen
    wirkt es wie ein Selbstbezug. Ein Alias-Import oder ein Satz Kommentar.
  - `ShadowObjectCreationScope.ts:112` — `bindTo()` hat keinen Schutz gegen
    einen zweiten Aufruf; er überschriebe `#unsubscribeFromEntityDestroy` und
    ließe die erste Anmeldung liegen. Vom Kernel aus nicht erreichbar, aber
    `tearDown()` schützt sich und `bindTo()` nicht.
- Nebenbefunde:
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts:347` trägt eine
    Laufnummer eines früheren Audits im Kommentar (`KERN-5`), ebenso sieben
    `describe`-Titel in `Kernel.spec.ts` (`KERN-1` bis `KERN-8`), einer in
    `Registry.spec.ts` (`KERN-6`) und ein Eintrag in
    `packages/shadow-objects/CHANGELOG.md:271` (`VIEW-23` bis `VIEW-26`,
    `KERN-8`). Das ist der Gegenstand von CLEAN-002 im Report und damit
    außerhalb des Scopes dieses Laufs — eine eigene Runde übers Repository.
  - `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:180`
    — `useProperty` ist `<T = any>` deklariert, der Vertrag in `types.ts:139`
    sagt `<T = unknown>`. Wörtlich mitgezogen, vorbestehend.
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts:453` —
    `getDisplayName(construct)` läuft jetzt unbedingt statt nur hinter
    `logger.isInfo`. In der Sache kostenlos (`displayName` ist überall ein
    statischer String), aber der Name wird bei der Erzeugung eingefroren; ein
    zur Laufzeit umgeschriebener `displayName` erschiene im Abbau-Log mit dem
    alten Wert. Im Repo nirgends der Fall, vom Detailplan gedeckt.
- Folgen:
  - `packages/shadow-objects/CHANGELOG.md:269` ist neu und muss beim nächsten
    Release mit umziehen.
- Schnittstellen: `ShadowObjectCreationScope` in
  `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`, neu
  und modulintern — `createAPI()` gibt ein Literal gebundener Methoden heraus,
  `bindTo(releaseScope, forgetShadowObject)` hängt die beiden Teardown-Rückrufe
  ein, `tearDown()` ist der einzige Abbau und über `#isTornDown` einmalig ·
  `Kernel` hält `#shadowObjectScopes` (`WeakMap<object,
  ShadowObjectCreationScope>`) statt `#shadowObjectTearDowns`,
  `destroyShadowObject()` ruft `?.tearDown()` · `dist/` wächst um
  `dist/src/in-the-dark/ShadowObjectCreationScope.{js,js.map,d.ts,d.ts.map}`

#### Triage der offenen Punkte und Nebenbefunde (2026-08-20, beim Planen von 2b-2)

Sieben Einträge: drei offene Punkte, die 2b-1 ausdrücklich als Eingabe für das
nächste Paket hinterlegt hat, drei Nebenbefunde und eine Folge. Was als
vorbestehend gilt, ist gegen `44891c2` nachgesehen, nicht geschätzt.

**Die drei offenen Punkte.** Alle drei liegen in der Datei, die 2b-2 anfasst.

1. **Den drei Reader-Links fehlt der Satz, warum die Abmeldung dort steht**
   (`ShadowObjectCreationScope.ts:203`, `:330`, `:357`; die beiden
   Provider-Links `:255` und `:298` haben ihn) → **2b-2b**. Genau diese drei
   Zeilen fallen im Reader-Helfer auf eine einzige zusammen. Der Satz wird dort
   einmal geschrieben, statt dreimal an Stellen, die es danach nicht mehr gibt.
2. **Acht Methodennamen decken sich mit den Modul-Importen, die sie rufen**
   — `on`, `once`, `emit`, `onDestroy`, `onViewEvent`, `createSignal`,
   `createEffect`, `createMemo`, zu sehen an `:121`, `:370`, `:379`, `:385`,
   `:424`/`:429`, `:443`/`:448`, `:462`/`:465`, `:470` → **2b-2b**, und zwar als
   **ein Kommentar über der Klasse**, nicht als Alias-Import. Ein Rename fasst
   zehn Aufrufstellen an, um eine Leseirritation zu heilen; zwei Sätze über der
   Klasse leisten dasselbe und lassen den Diff bei der Sache, um die es geht.
3. **`bindTo()` ohne Schutz gegen einen zweiten Aufruf** (`:112`) → **nächstes
   Audit**. `Kernel.ts:459` ist die einzige Aufrufstelle, unmittelbar nach
   `new construct(…)` und in derselben Methode; weder der Scope noch `bindTo()`
   verlassen je den Kernel, ein zweiter Aufruf ist von außen nicht herstellbar.
   Ein Wächter dort wäre eine Zeile, die kein Fall rot bekommt — und in einem
   Paket, dessen einzige Zusicherung ein unveränderter Testbestand ist, wiegt
   eine ungedeckte Zeile schwerer als die Symmetrie zu `tearDown()`. Wer sie
   will, holt sie sich zusammen mit dem Fall, der den zweiten Aufruf herstellt.

**Nebenbefunde.**

- Laufnummern früherer Audits in Kommentaren und `describe`-Titeln
  (`Kernel.ts:347`, sieben Titel in `Kernel.spec.ts`, einer in
  `Registry.spec.ts`, `CHANGELOG.md:271`) — Gegenstand von CLEAN-002 und damit
  außerhalb des Scopes dieses Laufs. → eigene Runde über das Repository, wie
  schon bei der Triage zu Paket 1 entschieden.
- `useProperty<T = any>` gegen `types.ts:139`, das `<T = unknown>` zusagt
  (`ShadowObjectCreationScope.ts:187`; 2b-1 nannte `:180`) — **vorbestehend**,
  wortgleich in `git show 44891c2:packages/shadow-objects/src/in-the-dark/Kernel.ts`
  an `:487`. Für Konsumenten unsichtbar: sie typisieren gegen
  `ShadowObjectCreationAPI`, und die Klasse verlässt das Modul nicht.
  → **nächstes Audit**, zusammen mit der Frage, welche weiteren Stellen der
  Implementierung von ihrem Vertrag abweichen. Nicht in 2b-2b: ein
  Typparameter, dessen Wechsel `useProperties` und jeden Aufrufer im Typcheck
  mitzieht, ist kein Beifang einer Zusammenlegung.
- `getDisplayName(construct)` läuft unbedingt (`Kernel.ts:453`) — vom Detailplan
  zu 2b-1 gedeckt, kein offener Punkt.

**Folge.** `packages/shadow-objects/CHANGELOG.md:269` zieht beim nächsten
Release in den Versionsabschnitt um. Das ist ein Release-Schritt und kein Paket;
der Eintrag trägt sich selbst.

**Was sich dadurch am Restplan ändert.** Paket 2b-2 wird in 2b-2a und 2b-2b
geteilt: die fünf Zweige, die eine nackte Vergleichsfunktion annehmen, haben im
ganzen Repository keinen einzigen Fall, und genau sie legt 2b-2b auf einen
Helfer zusammen — das Netz kommt davor und als eigener Commit, wie schon bei 2a.
Nummern werden nicht neu vergeben. An Paket 3 ändert sich nichts.

### [x] 2b-2a. Ein Wächter für die abgekündigte Options-Form

- Findings: CLEAN-001 (medium, effort L) — geteilt in 2a, 2b-1, 2b-2a und 2b-2b
- Ziel: Die fünf Stellen, die eine nackte Vergleichsfunktion als Options-
  Argument annehmen, dafür einmal pro Realm warnen und sie in `{compare}`
  umschreiben, haben je einen Fall, bevor sie auf einen gemeinsamen Helfer
  fallen.
- Bereich: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`
  (neu)
- Hängt ab von: 2b-1 (`c5538e8`)
- Modell: mittlere Stufe — kein Produktionscode, aber jeder Fall muss die
  Semantik treffen, die 2b-2b zu bewahren hat
- Hash: `6b2aeca`
- Dateien: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`.
  Sonst nichts. Kein Changelog-Eintrag: Specs sind vom Transpile ausgenommen
  (`build.mjs:48`, `tsconfig.lib.json:4`), `dist/` wächst nicht, und kein
  Konsument sieht eine Zeile davon — dieselbe Begründung wie bei 2a.
  Ausdrücklich **nicht**: `Kernel.spec.ts`, `ShadowObjectCreationScope.ts`,
  `Kernel.ts`.
- Verify:
  `pnpm -F @spearwolf/shadow-objects exec vitest src/in-the-dark/ShadowObjectCreationScope.spec.ts --run`,
  danach `pnpm lint && pnpm typecheck && pnpm test:ci`;
  `git status --short packages/shadow-objects/src/in-the-dark/` nennt allein die
  neue Datei, `git diff -- packages/shadow-objects/src/in-the-dark/` ist leer
- Commit: `test(kernel): the deprecated compare-function argument keeps its warning and its meaning`

#### Warum das ein eigenes Paket ist

Die fünf Deprecation-Zweige (`ShadowObjectCreationScope.ts:188`, `:233`, `:276`,
`:315`, `:342`) haben im ganzen Repository keinen einzigen Fall. Nachgesehen am
2026-08-20: keine Spec und kein Modul unter `packages/shadow-objects-e2e/public/`
übergibt eine Vergleichsfunktion als nacktes Options-Argument, und `isEqual`
kommt unter `packages/shadow-objects/src/in-the-dark/` allein in den fünf
Warntexten selbst vor. Ungedeckt ist damit beides: die Warnung samt ihrer
Einmaligkeit pro Realm und Methodenname, und die Umschreibung `fn` →
`{compare: fn}`, die darüber entscheidet, ob eine übergebene Vergleichsfunktion
überhaupt wirkt.

2b-2b legt genau diese fünf Zweige zusammen. Ohne Netz wäre ein grüner Lauf
dort ohne Aussage. Dass das Netz einen eigenen Commit bekommt, ist dieselbe
Aufteilung wie bei 2a und aus demselben Grund: der Umbau soll mit unveränderten
Spec-Dateien belegen können, dass er Verhalten nicht angefasst hat.

Warum eine neue Datei und nicht `Kernel.spec.ts`: Der Prüfling heißt seit 2b-1
`ShadowObjectCreationScope` und hat eine Datei. Dort sucht, wer ihn ändert. Und
die Zahl aus 2a bleibt so, wie sie mutationsgeprüft wurde — 107 Fälle in
`Kernel.spec.ts`, unverändert über den ganzen Rest des Laufs.

#### Zielverhalten

Nach diesem Paket ist für jedes der fünf Mitglieder festgehalten, dass die
nackte Vergleichsfunktion genau eine Warnung erzeugt und beim zweiten Mal keine
mehr, und für `useProperty` und `provideContext` zusätzlich, dass die Funktion
tatsächlich als `compare` ankommt und die übrigen Voreinstellungen dabei
stehenbleiben. Die Implementierung ist unverändert.

#### Vorgehen

Neue Datei `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`.
Aufbau nach dem Vorbild von `Kernel.spec.ts`: ein `describe('ShadowObjectCreationScope', …)`,
darin `afterEach(() => { Registry.get().clear(); })`, je Fall eine eigene
`Registry` und ein eigener `Kernel`, `@ShadowObject({registry, token: …})`,
`generateUUID()`, am Ende `kernel.destroy()`. Titel in dritter Person, kein
»should«. Gefahren wird über den Kernel, nicht über die Klasse: der Scope
braucht eine echte `Entity`, und `createAPI()` ist der einzige Weg, auf dem ein
Konstruktor an die Mitglieder kommt.

**Eine Regel für diese Datei, und sie ist nicht optional.** Die Flaggen, die die
Warnung auf einmal pro Realm begrenzen, stehen auf Modulebene
(`ShadowObjectCreationScope.ts:19-23`). Innerhalb einer Datei ist die erste
Auslösung pro Methodenname die einzige, die warnt. Also gehört pro Mitglied
**ein einziger** `it`-Block, der beide Hälften in sich trägt — die erste Warnung
und das Ausbleiben der zweiten —, und keine andere Stelle der Datei ruft die
abgekündigte Form. Gegen `Kernel.spec.ts` ist die Datei abgeschottet, weil
vitest je Datei isoliert (`vitest.config.ts` setzt `isolate` nicht herab); gegen
sich selbst ist sie es nicht. Ein Kommentar am Kopf der Datei hält das fest,
damit der nächste Fall nicht arglos danebengestellt wird.

1. **Fünf Fälle, einer je Mitglied**, in einem `describe('the deprecated
   isEqual argument', …)`: `useProperty`, `provideContext`,
   `provideGlobalContext`, `useContext`, `useParentContext`. Aufbau je Fall:
   - `const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})`,
     am Ende `warnSpy.mockRestore()` — wie `Kernel.spec.ts:2784`;
   - ein Shadow Object, dessen Konstruktor das Mitglied **zweimal** mit
     derselben nackten Vergleichsfunktion und demselben Namen ruft. Dieselbe
     Funktionsinstanz ist Absicht: bei den drei Readern schlägt sonst zusätzlich
     die Cache-Warnung an (`:205`, `:332`, `:359`), und der Fall prüfte zwei
     Dinge auf einmal;
   - `expect(warnSpy).toHaveBeenCalledTimes(1)`, dazu
     `expect(warnSpy.mock.calls[0][0]).toMatch(/Deprecation Warning/)` und je
     ein `toMatch` auf den Methodennamen und auf `isEqual`. Der Methodenname im
     Text ist das, was 2b-2b aus einem Parameter erzeugt — er ist der Kern
     dieser fünf Fälle.
   - Titel im Ton: `it('warns once per realm when useProperty gets a bare
     compare function', …)`.
2. **Zwei Fälle für die Wirkung**, in einem eigenen Unterblock. Sie halten fest,
   dass die Funktion nicht nur eine Warnung auslöst, sondern ankommt:
   - `useProperty`: die nackte Funktion ist ein `vi.fn((a, b) => a === b)`. Nach
     `kernel.createEntity(uuid, token, undefined, 0, [['testProp', 'first']])`
     und `kernel.changeProperties(uuid, [['testProp', 'second']])` — die Route
     steht in `Kernel.spec.ts:317-321` — gilt
     `expect(compare).toHaveBeenCalled()`. Der Spy ist die robuste Variante:
     eine Behauptung darüber, *welche* Werte signalize vergleicht, hinge daran,
     ob der erste Schreibvorgang die Vergleichsfunktion überhaupt befragt. Wer
     schärfer will, misst das zuerst und schreibt das Gemessene mit einem
     Kommentar fest — nicht umgekehrt.
   - `provideContext`: die nackte Funktion als drittes Argument, der Provider
     wird im Konstruktor festgehalten. Nach einem `kernel.changeToken(uuid, …)`
     auf ein leeres Token gilt `expect(value(provider!)).toBeUndefined()`. Damit
     steht geschrieben, dass die abgekündigte Form ein Options-Objekt ohne
     `clearOnDestroy` erzeugt und die Voreinstellung `true` greift. Die Vorlage
     ist `Kernel.spec.ts:610-620`.
3. **Mutationsprüfung**, wie in 2a: zu jedem Fall die Zeile entfernen oder
   verbiegen, die er verteidigt, den Fall rot sehen, die Mutation zurücknehmen.
   Für die fünf Warnfälle sind das der Methodenname im jeweiligen Warntext und
   das Setzen der Flagge; für die beiden Wirkungsfälle die Umschreibung
   `typeof options === 'function' ? {compare: options} : options`. Der rote Lauf
   gehört in den Bericht.
4. **Der Beleg.** Die neue Datei ist die einzige Änderung.
   `pnpm lint && pnpm typecheck && pnpm test:ci` läuft grün, `Kernel.spec.ts`
   steht weiter bei 107 Fällen, der Workspace wächst um die Fallzahl dieser
   Datei.

#### Was ausdrücklich nicht dazugehört

- **Kein Produktionscode.** Weder `ShadowObjectCreationScope.ts` noch
  `Kernel.ts` werden angefasst. Fällt beim Schreiben der Fälle etwas auf, wird
  es gemeldet, nicht behoben.
- **Kein Anfassen von `Kernel.spec.ts`.** Die 107 Fälle bleiben, wo und wie sie
  sind; auch ein passender neuer Fall gehört in die neue Datei.
- Keine Fälle für Mitglieder, die 2b-2b nicht anfasst. Das Netz von 2a deckt
  sie ab, ein zweites daneben ist Wartungslast ohne Aussage.
- Keine der übrigen 36 Findings.

- Ergebnis: 1 Runde · neue Datei `ShadowObjectCreationScope.spec.ts`,
  235 Zeilen, 5 Fälle — je Mitglied einer, der Warnung, Einmaligkeit,
  Wortlaut und Wirkung zusammen festhält · Produktionscode und
  `Kernel.spec.ts` byte-identisch · der Reviewer hat den Wortlaut mit sechs
  zeichenweisen Varianten geprüft (Präfix, beide Anführungszeichenpaare, die
  Klammern hinter dem Methodennamen, der zweite Satz, `{compare}` → `compare`
  — jede macht alle fünf Fälle rot), 18 Shuffle-Seeds gefahren und jeden Fall
  einzeln über `-t`, und Etappe A von 2b-2b probeweise gebaut: der
  zusammengelegte Helfer läuft grün durch, eine gemeinsame Flagge statt fünf
  einzelner macht vier Fälle rot, ein vertauschter Name genau einen · Verify
  vom Orchestrator selbst gelesen, nach einem Eingriff des Reviewers in den
  Arbeitsbaum ein zweites Mal gegen den Blob `d66b74d`: lint ✓ typecheck ✓
  `test:ci --force` ✓ 952 Fälle, Produktionscode-Diff 0 Zeilen · offen und
  klein, Eingabe für 2b-2b:
  - `ShadowObjectCreationScope.spec.ts:52`, `:57` (und je Fall analog) —
    innerhalb eines `it` verdeckt eine fallende Behauptung die folgenden. Kein
    Deckungsverlust: für jede der drei Hälften existiert eine Mutation, die
    sie allein rot macht; ein Lauf nennt nur einen Grund statt drei.
  - `ShadowObjectCreationScope.spec.ts:150`, `:199` — die beiden
    Hilfs-Shadow-Objects reichen `sourceSignal.get` als zweites Argument
    durch; ein Argument weiter rechts wäre es die abgekündigte Form und würde
    die Flagge vorzeitig kippen. Ein halber Satz Kommentar hielte das fest.
  - `ShadowObjectCreationScope.spec.ts:175`, `:180`, `:224`, `:229` — die
    Mikrotask-Wartezeilen kopieren `Kernel.spec.ts:208` wörtlich, aber ohne
    dessen Kommentar.
- Nebenbefunde: keine neuen. Die Laufnummer in `Kernel.spec.ts:2779`
  (`describe`-Titel) gehört zu CLEAN-002 und damit in einen eigenen Lauf.
- Folgen: keine. Kein Produktionscode, kein Changelog, kein `dist/`.
- Schnittstellen: keine. Die Datei ist eine Spec und wird nicht transpiliert.

#### Triage der offenen Punkte (2026-08-20, beim Planen von 2b-2b)

Drei Einträge, alle drei in `ShadowObjectCreationScope.spec.ts`, alle drei
kosmetisch. Nebenbefunde und Folgen hat 2b-2a keine hinterlassen.

Die Datei, in der sie stehen, ist für 2b-2b eine der drei eingefrorenen: ihr
leerer Diff ist neben dem von `Kernel.spec.ts` und `Kernel.ts` die einzige
Zusicherung, die das nächste Paket überhaupt geben kann. Ein Kommentar, der dort
nachgetragen wird, kostet genau diese Zusicherung. Deshalb geht keiner der drei
in 2b-2b — und das ist die Begründung, die alle drei teilen.

1. **Eine fallende Behauptung verdeckt die folgenden im selben `it`**
   (`ShadowObjectCreationScope.spec.ts:51-57`, je Fall analog) → **nächstes
   Audit**. 2b-2a hat selbst nachgewiesen, dass kein Deckungsverlust
   dahintersteht: zu jeder der drei Hälften existiert eine Mutation, die sie
   allein rot macht. Aufteilen ist ohnehin verboten, solange die Warnung einmal
   pro Realm fällt — der Kopfkommentar der Datei (`:9-20`) schreibt das fest.
   Bliebe eine bessere Fehlermeldung ohne einen Fall mehr.
2. **`sourceSignal.get` als zweites Argument der beiden Hilfs-Shadow-Objects**
   (`:150`, `:199`) — ein Argument weiter rechts wäre es die abgekündigte Form
   und kippte die Modulflagge vorzeitig → **nächstes Audit**, zusammen mit 3.
3. **Die Mikrotask-Wartezeilen ohne den Kommentar ihrer Vorlage** (`:174`,
   `:178`, `:223`, `:227`; Vorlage `Kernel.spec.ts:208`) → **nächstes Audit**,
   zusammen mit 2.

2 und 3 sind zusammen eine Handvoll Kommentarzeilen in einer Testdatei. Will der
Nutzer sie früher, gehören sie in einen eigenen Commit **nach** 2b-2b; dann
bleibt der leere Diff, auf dem 2b-2b steht, unangetastet.

**Was sich dadurch am Restplan ändert.** Nichts. 2b-2b bleibt ungeteilt, Paket 3
bleibt dahinter.

### [x] 2b-2b. Die dreifachen und doppelten Mitglieder fallen auf je einen Helfer zusammen

- Findings: CLEAN-001 (medium, effort L) — geteilt in 2a, 2b-1, 2b-2a und 2b-2b
- Ziel: Was sich in `ShadowObjectCreationScope` nur in einer Map, einer Quelle
  und zwei Wörtern unterscheidet, steht einmal da statt drei- oder zweimal.
- Bereich: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`
- Hängt ab von: 2b-1 (`c5538e8`) und 2b-2a (`6b2aeca`)
- Modell: stärkste Stufe — acht Warntexte müssen zeichengleich herauskommen und
  nur fünf davon sind durch einen `toBe()`-Fall gedeckt, zwei der drei
  Reihenfolgen aus 2a laufen mitten durch die zusammengelegten Stellen, und drei
  Dateien dürfen sich nicht um eine Zeile bewegen
- Hash: `6502183`
- Dateien: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts`.
  Sonst nichts — kein Changelog: `dist/` bekommt keine Datei dazu, keine Signatur
  ändert sich, und kein Konsument sieht eine Zeile davon.
- Verify:
  `pnpm -F @spearwolf/shadow-objects exec vitest src/in-the-dark/Kernel.spec.ts --run`
  (107/107) und
  `pnpm -F @spearwolf/shadow-objects exec vitest src/in-the-dark/ShadowObjectCreationScope.spec.ts --run`
  (5/5), danach `pnpm lint && pnpm typecheck && pnpm test:ci` (952 Fälle); die
  drei `git diff`-Prüfungen des nächsten Abschnitts sind leer und
  `git diff --stat` nennt genau eine Datei
- Commit: `refactor(kernel): the cached readers, the providers and the deprecation notices each collapse onto one helper`

#### Drei Dateien, die sich nicht bewegen dürfen

Dieses Paket kann nur eine Zusicherung geben, und sie steht im Diff:

```
git diff -- packages/shadow-objects/src/in-the-dark/Kernel.spec.ts                      # leer
git diff -- packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts   # leer
git diff -- packages/shadow-objects/src/in-the-dark/Kernel.ts                           # leer
git diff --stat                                                                          # eine Datei
```

Die beiden Spec-Dateien sind das Netz: 107 mutationsgeprüfte Fälle aus 2a, fünf
aus 2b-2a. Keine Zeile, kein Titel, keine Einrückung.

Der leere Diff auf `Kernel.ts` trägt, und zwar nicht bloß als Vorsatz. Nachgesehen
am 2026-08-20: Der Kernel berührt den Scope an genau vier Stellen — der Import
(`Kernel.ts:16`), das Feld `#shadowObjectScopes` (`:81`), `new
ShadowObjectCreationScope(…)` samt `createAPI()` und `bindTo(…)` in
`constructShadowObject()` (`:452-489`) und `?.tearDown()` in
`destroyShadowObject()` (`:528`). Dieses Paket fasst keine davon an. Es bewegt
sich ausschließlich innerhalb der Mitglieder, die die Creation API herausreicht,
plus zwei neuen privaten Methoden, einem Modulhelfer und einer Modulvariablen.
Kein Konstruktorargument, keine Signatur, kein Rückgabetyp ändert sich; keine
der drei neuen Einheiten verlässt das Modul. Wandert etwas aus dem Scope in den
Kernel zurück, ist der Entwurf falsch abgebogen.

Meint der Implementierer, ein Fall müsse sich zwangsläufig ändern, damit der
Umbau grün wird, dann ist der Umbau falsch — und wenn er das nach zweimaligem
Hinsehen weiter meint, ist das eine **Rückfrage an den Nutzer**, keine
Entscheidung, die er allein trifft. Dasselbe gilt für eine Zeile in `Kernel.ts`,
die sich angeblich mitbewegen muss.

#### Was das Netz hält, und was es nicht hält

Wer die fünf Fälle aus 2b-2a nicht gelesen hat, weiß nicht, wie eng dieses Paket
geführt ist. Die Zeilenangaben sind die von
`packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts`:

| Was der Umbau anfasst | Wer es hält |
| --- | --- |
| Der Wortlaut der fünf Deprecation-Meldungen, ganzer Satz | `:52`, `:84`, `:124`, `:170`, `:219` — je ein `toBe()` auf den vollständigen String |
| Einmaligkeit pro Realm und Methodenname | dieselben fünf Fälle: zwei Aufrufe je Fall, `toHaveBeenCalledTimes(1)` an `:51`, `:83`, `:123`, `:169`, `:218` |
| Die Umschreibung `fn` → `{compare: fn}` | `:57`, `:96`, `:131`, `:180`, `:229` — `expect(compare).toHaveBeenCalled()` |
| `clearOnDestroy` fällt bei der abgekündigten Form auf `true` zurück | `:97`, `:132` — `value(provider!)` ist nach dem Tokenwechsel `undefined` |
| Der Link von der Quelle zum zwischengespeicherten Reader | `:175`/`:181` (`useContext`), `:224`/`:230` (`useParentContext`) |
| Der Wortlaut der **drei Cache-Meldungen** | **niemand vollständig.** `Kernel.spec.ts:2781`, `:2851`, `:2877` prüfen `toMatch` auf Methodennamen und Schlüssel und zählen die Aufrufe — kein Fall im Repository sieht den Satz als Ganzes an |

Daraus folgt die schärfste Einzelvorgabe dieses Pakets: **Der Wortlaut aus den
Fällen ist die Referenz, nicht der Code.** Für die fünf Deprecation-Meldungen
heißt das, dass ein grüner Lauf der fünf Fälle den Beweis führt — ein Zeichen
Unterschied im Template-Literal, und `toBe()` fällt. Für die drei
Cache-Meldungen heißt es das Gegenteil: dort führt kein Fall den Beweis, dort
wird Zeichen für Zeichen von Hand verglichen, bevor die drei Literale gelöscht
werden. Der Gedankenstrich in den drei Texten ist ein Geviert (U+2014,
nachgemessen am 2026-08-20) und wird kopiert, nicht getippt.

Die drei Reihenfolgen, die 2a mutationsgeprüft festgenagelt und 2b-1 erhalten
hat, gelten unverändert weiter. Zwei laufen durch die zusammengelegten Stellen:

| Reihenfolge | Wo sie heute steht | Wer sie hält |
| --- | --- | --- |
| Die `onDestroy`-Rückrufe laufen vor der Zerstörung der Signale | `ShadowObjectCreationScope.ts:148-150` vor `:156-174` | `Kernel.spec.ts:2019` |
| Die primäre Aufräum-Menge läuft vor der sekundären | `:148-150` vor `:152-154` | `Kernel.spec.ts:2342` |
| Innerhalb der sekundären Menge steht die Verbindung zur Entität vor dem `clearOnDestroy`-Rückruf | `:258` vor `:263`, `:301` vor `:306` | `Kernel.spec.ts:654`, Gegenprobe `:697` |

Die dritte fasst der Provider-Helfer unmittelbar an. Sie hängt daran, dass
`#unsubscribeSecondary` ein `Set` ist und in Einfügereihenfolge läuft. Was
stehenbleiben muss: die Menge bleibt ein `Set`; der Griff auf die Verbindung
zum entitätsseitigen Kontextsignal wird eingetragen, **bevor** der
`clearOnDestroy`-Rückruf eingetragen wird; und der Griff auf die Verbindung von
einer übergebenen Quelle (`:252`, `:295`) bleibt der erste der drei. Wer die
Menge gegen ein Array, eine Map oder eine umgekehrte Iteration tauscht oder die
drei `add()`-Aufrufe umstellt, bricht sie.

Dazu die beiden Aufrufstellen der Semantik »`clearOnDestroy` wird bei jedem
Aufruf gelesen, nicht nur bei dem, der das Provider-Signal anlegt«: heute
`ShadowObjectCreationScope.ts:262` und `:305`, jede für sich abgesichert durch
`Kernel.spec.ts:622` (`provideContext`) und `:1113` (`provideGlobalContext`),
seit 2b-2a zusätzlich in ihrer abgekündigten Form durch
`ShadowObjectCreationScope.spec.ts:97` und `:132`. Der gemeinsame Helfer führt
genau diese beiden Stellen zusammen. Die Prüfung bleibt deshalb **außerhalb**
des `if`, das das Signal anlegt.

#### Was heute dreifach und doppelt dasteht

Von 482 Zeilen der Datei entfallen 162 auf fünf Mitglieder, die einander bis auf
wenige Wörter gleichen, dazu fünf Zeilen Modulzustand:

- **Drei zwischengespeicherte Reader**, je 26 Zeilen: `useProperty`
  (`:187-212`), `useContext` (`:314-339`), `useParentContext` (`:341-366`). Sie
  unterscheiden sich in zwei Maps, der verlinkten Quelle und zwei Wörtern im
  Warntext.
- **Zwei Provider**, je 42 Zeilen: `provideContext` (`:228-269`),
  `provideGlobalContext` (`:271-312`). Sie unterscheiden sich in einer Map, der
  Zielmethode der Entität und einem Wort im Kommentar.
- **Fünf Deprecation-Zweige** von je sechs Zeilen (`:188-193`, `:233-238`,
  `:276-281`, `:315-320`, `:342-347`) samt fünf `let`-Flaggen auf Modulebene
  (`:19-23`). Sie unterscheiden sich in einem Wort im Warntext.

Das Finding CLEAN-001 nennt diese Dopplung nicht; seine 406-Zeilen-Closure ist
mit 2b-1 erledigt, seine Empfehlung umgesetzt. Dieses Paket führt sie trotzdem
zu Ende, und zwar aus dem Satz des Findings, der die Größe erst zum Problem
macht: dies ist die Stelle, »an der jede neue Fähigkeit eines Shadow Objects
ansetzt«. Eine neue Fähigkeit dieser Art ist heute ein Copy-and-paste von 26
oder 42 Zeilen.

#### Vorgehen

Vier Etappen, jede für sich grün. A bis C ergeben zusammen den Commit, D ist
die Abnahme. Nach jeder Etappe laufen beide Spec-Dateien; wer zwischendurch
anhält, hat einen übersetzbaren Baum.

**Etappe A — die Deprecation-Warnung fällt auf einen Modulhelfer.**

Diese Etappe ist gebaut worden. Der Reviewer von 2b-2a hat sie am 2026-08-20
probeweise umgesetzt und wieder verworfen: der Helfer unten läuft grün durch,
eine gemeinsame `boolean`-Flagge statt der Menge macht vier der fünf Fälle rot,
ein vertauschter Name in einem Aufruf genau einen. Die Machbarkeit ist damit
belegt, die Vorgabe »fünf einzelne Flaggen, nicht eine gemeinsame« auch.

1. Die fünf `let`-Flaggen (`:19-23`) werden zu einem
   `const isEqualDeprecationShown = new Set<string>()` auf Modulebene — fünf
   Einträge in einer Menge, keine gemeinsame Flagge. Daneben ein Modulhelfer:
   ```ts
   function warnDeprecatedIsEqualOption(options: unknown, apiName: string): void {
     if (typeof options !== 'function' || isEqualDeprecationShown.has(apiName)) return;
     console.warn(
       `[shadow-objects] Deprecation Warning: The "isEqual" option of "${apiName}()" is now passed as {compare} argument. Please update your code accordingly.`,
     );
     isEqualDeprecationShown.add(apiName);
   }
   ```
   Der Text ist damit Zeichen für Zeichen der heutige, mit `apiName` an der
   Stelle des Methodennamens; einmal pro Realm und Methodenname bleibt einmal
   pro Realm und Methodenname. Der Eintrag in die Menge steht **hinter** dem
   `console.warn`, wie heute die Zuweisung an die Flagge — ein `console.warn`,
   das wirft, hinterlässt denselben Zustand wie bisher.
   Der heutige Test lautet `!shown && options != null && typeof options ===
   'function'`; der Teil `options != null` ist neben dem `typeof`-Test
   wirkungslos (`typeof null` ist `'object'`) und fällt weg. Das ist die einzige
   tote Bedingung, die dieses Paket anfasst — sie fällt, weil der `typeof`-Test
   des Helfers sie ohnehin ersetzt. Andere tote Bedingungen, etwa das
   `ctxProvider != null` an `:262` und `:305`, bleiben stehen.
   Ein Satz Kommentar über der Menge sagt, warum es sie gibt: die Warnung ist
   pro Realm und Methodenname genau eine Zeile wert, sonst überschwemmt ein
   Shadow Object, das ein Mitglied in einer Schleife ruft, die Konsole.
2. Die fünf Aufrufstellen bekommen als erste Zeile
   `warnDeprecatedIsEqualOption(options, 'useProperty');` — mit dem jeweiligen
   Namen — und **behalten ihre Umschreibungszeile**
   `const opts = typeof options === 'function' ? {compare: options} : options;`.
   Begründung, weil es naheliegt, auch die einzusammeln: ihr Ergebnistyp ist an
   den beiden Provider-Stellen `ProvideContextOptions<T>` und an den drei
   Reader-Stellen `SignalValueOptions<T>`. Ein Helfer, der beides bedient,
   braucht entweder einen `as`-Cast auf den Rückgabewert oder eine
   Union-Rückgabe, an der `opts?.clearOnDestroy` scheitert. Eine Zeile
   einsparen ist das nicht wert. Wer es dennoch versucht, darf es nur, wenn
   `pnpm typecheck` es **ohne Cast** annimmt.
3. Fünf Namen, fünf Fälle: `'useProperty'`, `'provideContext'`,
   `'provideGlobalContext'`, `'useContext'`, `'useParentContext'`. Ein
   vertauschtes Paar macht laut Vorabbau genau einen Fall rot — der Lauf der
   fünf Fälle ist also der vollständige Beweis für diese Etappe.

**Etappe B — die drei Reader fallen auf einen Helfer.**

4. Neue private Methode, in der Gruppe »Properties« vor `useProperty`:
   ```ts
   #cachedReader<K extends string | symbol>(
     name: K,
     readers: Map<K, SignalReader<any>>,
     compares: Map<K, CompareFunc<any> | undefined>,
     linkSource: () => SignalReader<any>,
     opts: SignalValueOptions<any> | undefined,
     apiName: string,
     subject: string,
   ): SignalReader<any>
   ```
   Der Typparameter `K` hält `name` und die Schlüssel der beiden Maps
   zusammen. Er ist **nicht** nötig, damit `Map<string, …>` als
   `Map<string | symbol, …>` durchgeht — das nimmt TypeScript unter `strict`
   an, nachgemessen am 2026-08-20. Er ist nötig, damit der Helfer für
   `#propertyReaders` keinen Symbol-Schlüssel entgegennimmt, den diese Map nie
   enthalten darf.
   Der Rumpf ist der heutige, in dieser Reihenfolge: der Cache-Test
   `=== undefined` wie an `:199`, `:326`, `:353` (nicht `== null`, das ist die
   Schreibweise der Provider), dann
   `createSignal<any>(undefined, opts).get`, `readers.set(name, …)`,
   `compares.set(name, opts?.compare)`, `link(linkSource(), reader)`, der Griff
   in `#unsubscribeSecondary`. Der `else if`-Zweig mit der Cache-Warnung bleibt,
   wie er ist, mit dem Text ``[shadow-objects] ${apiName}("${String(name)}"):
   the cached signal already exists with a different (or no) {compare} function
   — the new options are ignored. Pass options only on the first call per
   ${subject}.`` und `subject` aus `'property'`, `'context'`,
   `'parent context'`. Das ergibt die drei heutigen Texte unverändert —
   `String(name)` über einem `string` ist derselbe `string`, und `:207`
   interpoliert heute `${name}` genau dort. **Diese drei Texte hält kein Fall
   als Ganzes** (siehe die Tabelle oben): vor dem Löschen der drei Literale
   werden die drei erzeugten Strings Zeichen für Zeichen gegen die heutigen
   gehalten, Geviertstrich eingeschlossen.
   `linkSource` ist ein Thunk, weil die Quelle heute innerhalb des `if` gelesen
   wird und nur dann gelesen werden darf, wenn wirklich ein neuer Reader
   entsteht.
   An den Griff kommt der Satz, der den drei Reader-Links bislang fehlt (offener
   Punkt aus 2b-1, `:203`, `:330`, `:357`): die Verbindung muss enden, damit das
   entitätsseitige Signal keinen zerstörten Reader mehr speist. Er wird hier
   einmal geschrieben statt dreimal an Stellen, die es danach nicht mehr gibt;
   die Begründung ist eine andere als die der beiden Provider-Links, deren Satz
   an `:255-256` und `:298-299` steht.
5. `useProperty`, `useContext` und `useParentContext` schrumpfen auf die
   Warnung, die Umschreibung und einen Aufruf des Helfers mit ihren beiden
   Maps, ihrer Quelle (`() => this.#entity.getPropertyReader(name)`,
   `() => this.#entity.useContext(name)`,
   `() => this.#entity.useParentContext(name)`) und ihren beiden Wörtern.
   Signaturen und Rückgabetypen bleiben Zeichen für Zeichen die heutigen,
   `useProperty` samt seinem `<T = any>` (siehe »Was ausdrücklich nicht
   dazugehört«). `useProperties` (`:214-226`) bleibt unangetastet und ruft
   weiterhin `this.useProperty`.

**Etappe C — die beiden Provider fallen auf einen Helfer.**

6. Neue private Methode, in der Gruppe »Kontexte« vor `provideContext`:
   ```ts
   #provideContextSignal(
     name: string | symbol,
     providers: Map<string | symbol, Signal<any>>,
     entitySignal: () => Signal<any>,
     sourceOrInitialValue: unknown,
     opts: ProvideContextOptions<any> | undefined,
   ): Signal<any>
   ```
   Auch hier ein Thunk: `entity.provideContext(name)` beziehungsweise
   `entity.provideGlobalContext(name)` steht heute innerhalb des `if` und darf
   nicht bei jedem Aufruf laufen. Beide liefern `Signal<unknown>` (`Entity.ts:432`,
   `:436`), was auf `Signal<any>` passt.
   Der Rumpf ist der heutige, in dieser Reihenfolge: `isSignal`-Prüfung und
   `toMaybe`, `createSignal(initialValue, opts?.compare ? {compare: opts.compare} : undefined)`,
   bei einer Signal-Quelle deren `link` samt Griff, dann der `link` auf
   `entitySignal()` samt Griff, dann `providers.set(name, ctxProvider)` — und
   **außerhalb** des `if` die `clearOnDestroy`-Prüfung mit ihrem Rückruf. Die
   beiden Kommentare der heutigen Stellen (`:255-256`, `:298-299`) werden zu
   einem, der beide Fälle trägt: der Griff auf diese Verbindung wird vor jedem
   `clearOnDestroy`-Rückruf eingetragen, damit die Schreibung auf `undefined`
   das Kontextsignal auf der Entitätsseite nicht mehr erreicht.
7. `provideContext` und `provideGlobalContext` schrumpfen auf die Warnung, die
   Umschreibung und einen Aufruf des Helfers mit ihrer Map und ihrer
   Zielmethode. Signaturen und Rückgabetypen bleiben die heutigen; beide sind
   heute abgeleitet und müssen weiterhin auf `Signal<Maybe<T>>` aus
   `types.ts:117` und `:123` passen, geprüft über `createAPI()`.
8. **Zwei Sätze an den Blockkommentar über der Klasse** (`:25-33`) räumen den
   letzten offenen Punkt aus 2b-1 ab: Acht Methoden tragen den Namen der
   Funktion, die sie aus `@spearwolf/eventize` beziehungsweise
   `@spearwolf/signalize` rufen — `on`, `once`, `emit`, `onDestroy`,
   `onViewEvent`, `createSignal`, `createEffect`, `createMemo`, zu sehen an
   `:121`, `:370`, `:379`, `:385`, `:424`/`:429`, `:443`/`:448`, `:462`/`:465`,
   `:470`. Gesagt wird zweierlei: dass der nackte Name im Rumpf immer der
   Modul-Import ist und der gleichnamige Methodenaufruf immer `this.` trägt, und
   dass die Methoden bewusst so heißen, weil ihre Namen im Vertrag
   `ShadowObjectCreationAPI` stehen. Keine Alias-Importe: das fasst zehn
   Aufrufstellen für eine Leseirritation an.

**Etappe D — die Abnahme.**

9. `pnpm typecheck` ist hier der schärfere Wächter als der Testlauf. Meldet er
   eine Zuweisung im Literal aus `createAPI()`, wird die Signatur der
   betroffenen Methode gerade gezogen — kein `as`-Cast, der jede echte
   Abweichung mitverdeckt. `createAPI()` selbst (`:75-100`) ändert sich nicht:
   die siebzehn Mitglieder heißen und binden wie bisher.
10. **Der Beleg.** Die vier `git diff`-Aufrufe vom Kopf dieses Pakets, dazu ein
    Lauf beider Spec-Dateien und `pnpm lint && pnpm typecheck && pnpm test:ci`
    vollständig grün, mit derselben Fallzahl wie am Ende von 2b-2a: 107 in
    `Kernel.spec.ts`, 5 in `ShadowObjectCreationScope.spec.ts`, 952 im
    Workspace. Weicht sie ab, ist etwas verloren gegangen. Empfohlen, weil
    dieses Paket außer dem Diff nichts vorzuweisen hat: den Diff normalisieren
    und Anweisung für Anweisung vergleichen, wie es der Reviewer in 2b-1 getan
    hat.

#### Was ausdrücklich nicht dazugehört

- Alles aus der gleichnamigen Liste von 2b-1 gilt hier weiter, insbesondere:
  keine Verhaltensänderung, keine Zeile in `Kernel.spec.ts`, keine der beiden
  Redundanzen aufgelöst, keine öffentliche API, `docs/api-reference.md:133`
  bleibt stehen, wie es steht.
- **Kein Anfassen von `Kernel.ts`.** Was dort nach 2b-1 steht, steht richtig.
- **Kein Anfassen von `ShadowObjectCreationScope.spec.ts`.** Was 2b-2a
  festgehalten hat, ist Vorgabe, nicht Material. Auch die drei kleinen
  Kommentarlücken, die 2b-2a selbst gemeldet hat, bleiben liegen — begründet in
  der Triage über diesem Paket.
- **Kein Wächter für `bindTo()`** (`:112`). Begründet in der Triage über 2b-2a:
  vom Kernel aus ist der zweite Aufruf nicht herstellbar, und eine Zeile, die
  kein Fall rot bekommt, gehört nicht in ein Paket, dessen einzige Zusicherung
  ein unveränderter Testbestand ist. → nächstes Audit.
- **Kein Angleichen von `useProperty<T = any>` (`:187`) an `types.ts:139`.**
  Vorbestehend seit `44891c2`, für Konsumenten unsichtbar, und ein Typparameter
  zieht im Typcheck mehr mit als diese Datei. → nächstes Audit.
- **Kein Aufräumen toter Bedingungen über die eine hinaus, die der
  Deprecation-Helfer ohnehin ersetzt.** `ctxProvider != null` an `:262` und
  `:305` bleibt stehen; wer dort mit aufräumt, mischt zwei Absichten in einen
  Diff, der nur aus Absicht besteht.
- Kein weiteres Zusammenlegen über diese drei Stellen hinaus. `on`, `once` und
  `emit` teilen zwar dieselbe Fallunterscheidung über das erste Argument, aber
  drei verschiedene Rückgabeverträge; ein gemeinsamer Helfer dafür ist eine
  eigene Entscheidung, kein Beifang. Ebenso bleiben `createSignal`,
  `createEffect`, `createMemo` und `createResource` einzeln stehen — sie teilen
  eine Zeile, nicht einen Rumpf.
- Keine der übrigen 36 Findings.

- Ergebnis: 1 Runde (nur ein Kommentarsatz) · vier Etappen, je grün
  geschlossen · `ShadowObjectCreationScope.ts` 482 → 499 Zeilen: die fünf
  Mitglieder schrumpfen von 162 auf 45 Zeilen Rumpf, dafür drei Helfer mit
  Doc-Kommentaren · fünf `let`-Flaggen → ein `Set<string>`, drei Reader →
  `#cachedReader`, zwei Provider → `#provideContextSignal` · alle acht
  Warntexte zeichengleich, von beiden Seiten codepoint-weise nachgerechnet ·
  `Kernel.ts`, `Kernel.spec.ts` und `ShadowObjectCreationScope.spec.ts`
  unverändert, alle drei Diff-Prüfungen 0 Bytes · Reviewer hat sieben
  Mutationen gefahren und die `.d.ts` beider Stände verglichen (zeichengleich
  bis auf den Kommentar) · Verify vom Orchestrator selbst gelesen: 107/107,
  5/5, lint ✓ typecheck ✓ `test:ci --force` ✓ 952 Fälle
- Nebenbefunde:
  - `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts:212`
    — der Typparameter `K` von `#cachedReader` hält nicht, was ihm zugedacht
    war: Methodenparameter von `Map` sind bivariant, `tsc` nimmt eine
    `useContext`-Verdrahtung auf die Property-Maps klaglos an. Schadet nicht,
    sichert aber nichts.
  - `ShadowObjectCreationScope.ts:245-253`, `:357-365`, `:373-381` — die
    Trennung der drei Cache-Schlüsselräume ist im Code korrekt, vom Netz aber
    nicht gehalten: `useParentContext` auf `#contextReaders` umgebogen lässt
    112/112 grün. Dasselbe für die beiden Thunks — sie bei jedem Aufruf statt
    nur beim Anlegen auszuwerten, macht keinen Fall rot.
  - `ShadowObjectCreationScope.ts:194-200` — `tearDown()` leert sieben
    Sammlungen, aber keine der drei Compare-Maps. Vorbestehend, harmlos
    solange der Kernel den Scope danach fallen lässt, aber eine Asymmetrie.
  - `ShadowObjectCreationScope.ts:240` steht auf `useProperty<T = any>`,
    `types.ts:139` auf `<T = unknown>`. Vorbestehend.
  - `ShadowObjectCreationScope.ts:307` — `ctxProvider != null` ist an dieser
    Stelle tot. Vom Detailplan ausdrücklich stehengelassen.
- Folgen: keine. Kein öffentlicher Name, keine Signatur, kein Rückgabetyp hat
  sich bewegt; `dist/` bekommt keine Datei dazu, kein Changelog wird fällig.
- Schnittstellen: keine nach außen. Modulintern neu:
  `isEqualDeprecationShown` (`Set<string>`), `warnDeprecatedIsEqualOption`,
  `ShadowObjectCreationScope.#cachedReader` und `#provideContextSignal`.

#### Triage der Nebenbefunde (2026-08-20, beim Planen von Paket 3)

Fünf Nebenbefunde, keine Folgen. Was als vorbestehend gilt, ist gegen `44891c2`
nachgesehen, nicht geschätzt.

1. **Der Typparameter `K` sichert nichts** (`ShadowObjectCreationScope.ts:212`)
   **und das Netz hält die Trennung der drei Schlüsselräume nicht**
   (`:245-253`, `:357-365`, `:373-381`, samt der beiden Thunks) — ein Befund von
   zwei Seiten gesehen: weder Typsystem noch Testbestand hindern jemanden daran,
   `useParentContext` auf `#contextReaders` zu verdrahten. **Vorbestehend**, und
   zwar auf der Deckungsseite. Beobachtbar wird eine gekreuzte Verdrahtung erst,
   wenn ein Fall denselben Namen über zwei der drei Wege liest *und* die Werte
   auseinanderhält. `Kernel.spec.ts:1907-1908` liest `signalCleanupCtxB` sowohl
   über `useContext` als auch über `useParentContext`, zählt danach aber nur
   Signale und Links auf ihre Grundlinie zurück; kein Fall im Repository
   vergleicht je zwei Werte gegeneinander. Dieselbe Mutation überlebt auf
   `44891c2` genauso, wo die drei Wege noch drei getrennte Rümpfe mit drei
   getrennten Maps hatten (`git show 44891c2:…/Kernel.ts`, `:500`, `:613`,
   `:645`). Die Zusammenlegung hat die Lücke billiger gemacht — eine Zeile statt
   drei —, sie hat sie nicht erzeugt. → **nächstes Audit**, als eine Frage:
   Wodurch ist die Trennung der drei Schlüsselräume gesichert, durch einen Typ
   oder durch einen Fall? Der Typparameter ist Teil der Antwort, kein eigener
   Punkt.
2. **`tearDown()` leert die drei Compare-Maps nicht** (`:194-200`) —
   **vorbestehend**. Auf `44891c2` legt `constructShadowObject()` dieselben drei
   Maps an (`Kernel.ts:478`, `:480`, `:485`), und der Teardown dort leert
   ebenfalls nur die Reader-Maps (`:844-846`). → **nächstes Audit**, zusammen
   mit 1: beide betreffen dieselben Sammlungen und gehören in eine Runde.
3. **`useProperty<T = any>` gegen `types.ts:139`** (`:240`) — zum dritten Mal
   derselbe Punkt, zum dritten Mal dieselbe Antwort: für Konsumenten unsichtbar,
   und ein Typparameter zieht im Typcheck mehr mit als diese Datei.
   → **nächstes Audit**.
4. **`ctxProvider != null` an `:307` ist tot** — vom Detailplan zu 2b-2b
   ausdrücklich stehengelassen, vorbestehend seit `44891c2`.
   → **nächstes Audit**.

**Folgen.** Keine. 2b-2b hat keinen öffentlichen Namen, keine Signatur und keinen
Rückgabetyp bewegt; `dist/` bekommt keine Datei dazu, kein Changelog wird fällig.
Damit ist die einzige noch offene Folge dieses Laufs die aus Paket 1 — die
fehlende E2E-Strecke — und die trägt Paket 3.

**Was sich dadurch am Restplan ändert.** Kein neues Paket. Paket 3 bleibt das
letzte und ändert sich in drei Punkten, alle beim Abgleich am Code entstanden:
die Modellstufe steigt von der mittleren auf die stärkste, der Bereich wächst um
`TEST-PLAN.md` und `Backlog.md`, und der Mechanismus ist entschieden statt
offengelassen.

### [x] 3. Der Fehlschlag eines Zyklus über eine echte Worker-Strecke

- Findings: — (kein Audit-Finding; aus der Triage der Folgen von Paket 1)
- Folge von: Paket 1
- Ziel: `syncfailed` ist über echtes `postMessage` belegt — Ereignis, Grund,
  verlorener Change Trail, das Ausbleiben von `AfterSync` und die Umgebung, die
  danach weiterläuft —, und die Reihenfolge, auf die sich `worker-failure.js`
  seit Paket 1 verlässt, steht an ihrer Aufrufstelle geschrieben.
- Bereich: `packages/shadow-objects-e2e/` — eine neue Seite samt Worker-Modul
  unter `public/`, die Playwright-Spec unter `tests/`, `TEST-PLAN.md`,
  `src/worker-failure.js` mit `public/mod-crash.js`, dazu `Backlog.md` im
  Wurzelverzeichnis (Fallzahlen)
- Hängt ab von: Paket 1 (`fe11219`)
- Einsortiert nach 2b-2b, weil hier Abdeckung fehlt und kein Verhalten: Die
  Umgebung selbst ist durch zehn Fälle in `ShadowEnv.spec.ts` belegt, die
  E2E-Suite ist grün.
- Modell: **stärkste Stufe** — angehoben gegenüber dem Grobplan. Die Seite steht
  und fällt mit einer Reihenfolge, die man ihr nicht ansieht: `ShaeElement`
  plant bei jeder Änderung von sich aus einen Sync in einem Microtask
  (`ShaeElement.ts:16-28`), und ein Trail, der auf diesem Weg hinausgeht, trägt
  keine Seriennummer — `RemoteWorkerEnv.applyChangeTrail()` löst dann sofort auf
  (`RemoteWorkerEnv.ts:327-330`), der Kernel-Fehler im Worker findet niemanden,
  der auf ihn wartet, und `syncfailed` feuert nie. Wer `syncWait()` einen Task
  zu spät ruft, bekommt eine Seite, die grün durchläuft und nichts beweist. Das
  ist der teure Fehler hier, und er sieht wie ein Erfolg aus.
- Dateien: `packages/shadow-objects-e2e/public/mod-refuse.js` (neu),
  `packages/shadow-objects-e2e/pages/sync-failure.html` (neu),
  `packages/shadow-objects-e2e/src/sync-failure.js` (neu),
  `packages/shadow-objects-e2e/tests/sync-failure.spec.ts` (neu),
  `packages/shadow-objects-e2e/src/worker-failure.js`,
  `packages/shadow-objects-e2e/public/mod-crash.js`,
  `packages/shadow-objects-e2e/TEST-PLAN.md`, `Backlog.md`.
  Ausdrücklich **nicht**: irgendetwas unter `packages/shadow-objects/src/`,
  `packages/shadow-objects/CHANGELOG.md` (kein Bibliothekscode, keine Zeile, die
  ein Konsument sieht), die Wurzel-`CHANGELOG.md` (Build, Testrunner, Lint und
  turbo/pnpm bleiben unberührt; eine zusätzliche Testseite ist keines davon),
  `packages/shadow-objects-e2e/KNOWN-DEFECTS.md` (kein neuer Framework-Defekt),
  `playwright.config.ts`.
- Verify:
  1. `pnpm exec turbo run test --filter=shadow-objects-e2e` von der Wurzel. Der
     Task baut `@spearwolf/shadow-objects` und die E2E-Seiten vorher (`turbo.json`,
     `test.dependsOn: ["^build", "build"]`) und startet `vite preview` auf 4174
     selbst. Chromium **und** Firefox müssen grün sein.
  2. Einzeln nachfahrbar mit
     `pnpm -F shadow-objects-e2e exec playwright test tests/sync-failure.spec.ts`
     und `… tests/worker-failure.spec.ts`.
  3. Fehlen die Browser, bricht Playwright mit »Executable doesn't exist« ab.
     Dann einmalig `pnpm -F shadow-objects-e2e exec playwright install chromium
     firefox` und den Lauf wiederholen; `pnpm install` bringt sie nicht mit. Auf
     diesem Rechner sind sie am 2026-08-20 vorhanden (`~/.cache/ms-playwright`,
     `chromium-1234` und `firefox-1538`) — ein »geht hier nicht« ist also keine
     Auskunft über die Suite, sondern über die Installation, und gehört als
     solches in den Bericht.
  4. Zusätzlich `pnpm lint && pnpm typecheck && pnpm test:ci`. Die E2E-Suite ist
     kein Teil von `test:ci`; der Lauf belegt, dass die 952 Fälle der übrigen
     Pakete unberührt sind.
  5. `git diff --stat` zeigt genau die acht Dateien oben und keine weitere.
- Commit: `test(e2e): a change trail the worker refuses ends the cycle in failure`
- Hash: `3a705dd`

#### Was heute dasteht

`packages/shadow-objects-e2e/` hält zehn Seiten und zehn Spec-Dateien, 202
Playwright-Fälle je Projekt, 404 über Chromium und Firefox. Die Specs enthalten
keine Logik: sie nennen eine Seite und eine Liste von Kennungen, `runPageTests`
(`tests/runPageTests.ts:38`) macht daraus je einen Test, der
`data-testresult="ok"` auf dem Knoten erwartet, den die Seite geschrieben hat.
Jeder Test lädt seine eigene Seite. Alle Behauptungen liegen in `src/*.js`.

`worker-failure` ist die einzige Seite, die einen Fehlerpfad fährt, und sie fährt
den anderen: `public/mod-crash.js` wirft aus einem `setTimeout(…, 0)` heraus
(`:7-9`), also **außerhalb** jedes `try/catch` der Worker-Seite. Daraus wird ein
unbehandelter Fehler, daraus das `error`-Ereignis am `Worker`-Objekt, daraus
`WorkerFailedError`, `ProxyFailed`, `ContextLost` und ein zerstörter Proxy. Für
`syncfailed` gibt es keine Entsprechung: das Ereignis und seine DOM-Spiegelung
(`ShaeWorkerElement.ts:99-106`) sind in Paket 1 entstanden und über echtes
`postMessage` nie gelaufen.

Der Weg dorthin ist im Code vollständig vorhanden und in drei Stationen zu lesen:

- **Worker.** `MessageRouter.#onChangeTrail()` (`MessageRouter.ts:133-145`) legt
  `kernel.run(data)` in ein `try/catch`. Läuft der Kernel auf einen Fehler und
  trug der Trail eine Seriennummer, geht ein `AppliedChangeTrail` mit `error`
  zurück. Der Fehler wird dabei zu einem String eingedampft: `` `${error}` ``
  (`:138`).
- **View.** `RemoteWorkerEnv.applyChangeTrail()` (`:318-353`) vergibt eine
  Seriennummer **nur**, wenn `waitForConfirmation` gesetzt ist. Die Bestätigung
  wird über `waitForMessageOfType` erwartet, und `if (data.error) throw
  data.error` (`:349`) macht daraus die Ablehnung. Ohne Bestätigungswunsch
  (`:327-330`) wird nur gepostet und sofort aufgelöst.
- **Umgebung.** `ShadowEnv.#syncNow()` (`:314-346`) liest den
  Bestätigungswunsch aus `#syncWaitForConfirmation` (`:328-329`) — gesetzt wird
  der ausschließlich von `syncWait()`. Die abgelehnte Promise endet in
  `#endSyncCycle(data, {reason: error})` (`:339`), und der settelt erst den
  Wartenden und emittiert dann `SyncFailed` (`:360-375`).

Daraus folgt die Bedingung, die die neue Seite tragen muss: **ein Fehlschlag ist
über einen echten Worker nur sichtbar, wenn genau der Zyklus, der den kaputten
Trail trägt, auf Bestätigung wartet.** `auto-sync` hilft dabei nicht — es
steuert die periodische Schleife, nicht die änderungsgetriebenen Syncs; das
steht bereits in `src/async-events.js:73-78` und stimmt.

Was den Kernel werfen lässt, ist kein Kunstgriff: `createEntity()`
(`Kernel.ts:272-303`) trägt die Entität ein und ruft am Ende
`createShadowObjects(entry)` (`:302`), was über `constructShadowObject()`
(`:452`) den Konstruktor des Shadow Objects synchron ausführt. Ein Wurf dort
verlässt `parse()`, verlässt `batch()` — signalize wirft einen einzeln
gesammelten Fehler unverändert weiter — und verlässt `run()`. Der `MessageRouter`
fängt ihn. Der Worker bleibt am Leben, und das ist der Unterschied zu
`worker-failure`.

Der zweite Teil dieses Pakets steht in `src/worker-failure.js:65`. Das dortige
`syncWait()` konnte vor Paket 1 nicht ablehnen; heute kann es. Ob es ablehnt,
entscheidet, welche der beiden Nachrichten des sterbenden Workers zuerst auf dem
Hauptthread ankommt: die Bestätigung des Change Trails, die `MessageRouter`
synchron nach `kernel.run()` postet, oder das `error`-Ereignis aus dem
verzögerten Wurf. `setTimeout(…, 0)` in `public/mod-crash.js:7` legt den Wurf in
eine spätere Aufgabe und entscheidet das Rennen — nur steht das an keiner der
beiden Stellen geschrieben, und `mod-crash.js` begründet seinen `setTimeout` mit
etwas anderem (dass der Wurf aus dem `try/catch` heraus muss). Die Suite ist
grün. Die Abhängigkeit ist ungeschrieben.

#### Zielverhalten

Eine neue Seite `pages/sync-failure.html` fährt über einen echten Worker den
Fehlerausgang, den Paket 1 gebaut hat, und hält beide Seiten der Unterscheidung
fest:

| Vorgang | Was die Seite belegt |
| --- | --- |
| Ein Trail, den der Kernel des Workers ablehnt, mit Bestätigungswunsch | `syncfailed` am `<shae-worker>`, `syncWait()` lehnt ab, `AfterSync` bleibt aus |
| Derselbe Vorgang, von der Proxy-Seite gesehen | kein `proxyfailed`, kein `contextlost`, `isReady` bleibt wahr, der Proxy lebt |
| Danach | der nächste Zyklus löst wieder auf und ein Rundlauf erreicht die View |

`worker-failure` bleibt, was es ist: die Seite über den sterbenden Worker. Sie
bekommt keine neue Kennung, nur die Zusicherung, auf der sie steht, in Worten —
an beiden Enden, der Aufrufstelle und dem Modul, das die Reihenfolge herstellt.

#### Vorgehen

1. **Das Fixture: `packages/shadow-objects-e2e/public/mod-refuse.js`** (neu).
   Ein Shadow Object, dessen Konstruktorfunktion synchron wirft — bewusst das
   Gegenteil von `mod-crash.js`:

   ```js
   function refuser() {
     throw new Error('this shadow object refuses to be created');
   }

   export const shadowObjects = {define: {refuser}};
   ```

   Dazu ein Kommentar, der den Weg benennt, ohne auf den Vorzustand zu zeigen:
   Der Kernel baut seine Shadow Objects innerhalb von `kernel.run()`; ein Wurf
   von hier verlässt den Lauf und wird vom `MessageRouter` als Fehler des
   Change Trails an die View zurückgemeldet. Ein `setTimeout` wie in
   `mod-crash.js` würde genau das verhindern — der Wurf muss **in** dem
   `try/catch` bleiben, das ihn meldet. Die Module unter `public/` werden
   unverändert ausgeliefert und im Worker importiert; sie können keine
   Bare-Specifier importieren, also bleibt es bei einer Funktion.
2. **Die Seite: `packages/shadow-objects-e2e/pages/sync-failure.html`** (neu),
   nach dem Muster von `pages/worker-failure.html`:
   `<shae-worker id="worker0" auto-sync="no"></shae-worker>`, kein `src`,
   `<section id="tests">`, Modul-Skript `/src/sync-failure.js`. Zwei Kommentare:
   kein `src`, damit das Modul registriert ist, bevor die Entität den Worker
   erreicht; `auto-sync="no"`, damit im Leerlauf keine weiteren Zyklen laufen —
   die Seite zählt `AfterSync`, und eine Bildschleife im Hintergrund macht diese
   Zählung wertlos. Ausdrücklich **nicht** als Schutz vor dem
   änderungsgetriebenen Sync: den schaltet das Attribut nicht ab (Schritt 3).
3. **Die Seite: `packages/shadow-objects-e2e/src/sync-failure.js`** (neu).
   Aufbau wie `src/worker-failure.js`: `runTestSuite(main)`, `testAsyncAction`,
   `testBooleanAction`, `watchCustomEvent`, `waitUntil`. Ein Zeitbudget von
   `3000` für alles, was auf den Fehlschlag wartet, mit derselben Begründung wie
   dort und einer zusätzlichen: der voreingestellte `changeTrailTimeout` ist
   `5000` (`constants.ts:45`), und ein Budget darunter trennt den Kernel-Fehler
   vom abgelaufenen Zeitfenster. Eine Seite, die nur besteht, weil sie lange
   genug gewartet hat, belegt hier den falschen Mechanismus.

   Der Ablauf, in dieser Reihenfolge:

   1. Zähler und Wächter **vor** allem anderen: ein `AfterSync`-Zähler über
      `on(shadowEnv, ShadowEnv.AfterSync, …)`, je ein Zähler für die
      DOM-Ereignisse `proxyfailed` und `contextlost` über schlichtes
      `addEventListener` (die negativen Behauptungen brauchen keinen Wächter mit
      Zeitbudget), und `watchCustomEvent(workerEl, 'syncfailed')` für die
      positive (`test-helpers/testCustomEvent.js:17` — armiert sofort, wartet
      später, die Warteschlange hält das Ereignis fest).
   2. `sync-failure-env-ready` — `shadowEnv.ready()`.
   3. `sync-failure-modules-imported` — `workerEl.importScript('/mod-hello.js')`
      und `workerEl.importScript('/mod-refuse.js')`. `mod-hello.js` liefert das
      Token `foo`, das die Seite als Überlebenden benutzt: es meldet sich beim
      Anlegen mit `helloFromFoo` und schickt bei jeder Änderung von `xyz` ein
      `fooEcho` zurück.
   4. `sync-failure-healthy-cycle-first` — ein Überlebender wird angelegt und
      erreicht den Worker: `<shae-ent id="survivor" token="foo">` über
      `innerHTML` in einen Container (der Markup-Weg, nicht
      `document.createElement` — siehe `KNOWN-DEFECTS.md`, DEFECT-1),
      `setProperty('xyz', 23)`, `syncWait()` löst auf, `helloFromFoo` kommt an.
      Dieser Schritt ist die Gegenprobe: Der Weg funktioniert, bevor er bricht.
   5. Der Fehlschlag, und hier liegt die ganze Schärfe des Pakets. In **einer**
      Aufgabe, ohne dazwischenliegendes `await`:

      ```js
      host.insertAdjacentHTML('beforeend', '<shae-ent id="refuser" token="refuser"></shae-ent>');

      // syncWait() muss in derselben Aufgabe stehen wie die DOM-Änderung: ShaeElement plant
      // bei jeder Änderung selbst einen Sync in einem Microtask, und ein Trail, der auf diesem
      // Weg hinausgeht, trägt keine Seriennummer -- der Worker meldet den Fehler dann an
      // niemanden, und der Zyklus endet als Erfolg.
      const refusedCycle = shadowEnv.syncWait().then(
        () => { throw new Error('expected syncWait() to reject, but it resolved'); },
        (error) => error,
      );
      ```

      Der `then` steht ebenfalls synchron da: eine abgelehnte Promise ohne
      Behandler wird sonst zur unbehandelten Ablehnung. Muster dafür:
      `worker-failure.js:88-93`.
   6. `sync-failure-syncwait-rejects` — `await refusedCycle` liefert einen
      Grund, der nicht `undefined` ist.
   7. `sync-failure-dom-event` — der `syncfailed`-Wächter feuert innerhalb des
      Budgets.
   8. `sync-failure-reason-names-the-refusal` — `detail.reason` ist derselbe
      Wert, mit dem `syncWait()` abgelehnt hat, und nennt die Botschaft des
      Fixtures. **Erst messen, dann behaupten:** über eine Worker-Strecke ist
      dieser Grund ein **String**, kein `Error` — `MessageRouter.ts:138` dampft
      ihn zu `` `${error}` `` ein und `RemoteWorkerEnv.ts:349` wirft genau den.
      Der Fall wird auf das gemessene Verhalten gestellt, mit einem Kommentar,
      der die Stelle benennt, an der die Eindampfung passiert. Die Asymmetrie zu
      `proxyfailed`, das eine `WorkerFailedError`-Instanz trägt, ist
      vorbestehend und gehört als Nebenbefund in den Bericht — nicht in einen
      Fix. Dazu `detail.shadowEnv === shadowEnv`.
   9. `sync-failure-detail-carries-the-lost-change-trail` —
      `detail.changeTrail` ist ein nicht-leeres Array und enthält den Eintrag,
      der die abgewiesene Entität anlegen wollte; abgeglichen wird über
      `document.getElementById('refuser').uuid`. Das ist der Kern des
      Ereignisses: Wer den Trail hat, weiß, was verloren ging.
   10. `sync-failure-aftersync-did-not-fire` — der `AfterSync`-Zähler steht auf
       demselben Wert wie unmittelbar vor Schritt 5.
   11. `sync-failure-is-not-a-proxy-failure` — beide Zähler auf `0`,
       `shadowEnv.isReady` wahr, `shadowEnv.envProxy.isDestroyed` falsch. Das
       ist der Unterschied, den die Seite gegenüber `worker-failure` zeigt.
   12. `sync-failure-environment-still-syncs` — das abgewiesene Element wird
       entfernt, `survivor.viewComponent.setProperty('xyz', 42)`, `syncWait()`
       löst auf, und ein `fooEcho` mit `42` erreicht die View. Damit ist belegt,
       dass eine abgelehnte Bestätigung weder den Proxy noch den Kernel des
       Workers hinterlässt.

   Zehn Kennungen, alle mit dem Präfix `sync-failure-`, wie es jede Seite dieser
   Suite hält.
4. **Die Spec: `packages/shadow-objects-e2e/tests/sync-failure.spec.ts`** (neu),
   nach dem Muster von `tests/worker-failure.spec.ts`: `test.describe`, die zehn
   Kennungen in der Reihenfolge der Seite, und `{allowConsoleErrors: true}` mit
   einem Kommentar, der sagt warum — die Seite provoziert einen Fehler mit
   Absicht, und beide Seiten schreiben ihn ins Log: der Worker über
   `MessageRouter.ts:136`, die View über `ShadowEnv.ts:338`. Der
   `ConsoleLogger` ist dabei aktiv, weil die Seite von `localhost` ausgeliefert
   wird. Damit entfällt für diese Seite der Fall `no uncaught or logged errors`
   (`runPageTests.ts:113-118`), und es bleiben elf Playwright-Fälle je Projekt:
   die zehn plus `test suite setup`.
5. **Zwei Mutationen, gefahren und im Bericht genannt.** Es gibt hier keinen
   Produktionscode, den ein roter Lauf herausträte; was belegt sein muss, ist,
   dass die Seite nicht aus Versehen besteht:
   - Den Wurf in `public/mod-refuse.js` entfernen. Die Kennungen 6 bis 11 müssen
     rot werden. Danach zurücknehmen.
   - Vor dem `syncWait()` in Schritt 5 ein `await Promise.resolve()` einfügen,
     sodass der änderungsgetriebene Sync den Trail ohne Seriennummer
     hinausschickt. Dieselben Kennungen müssen rot werden — **das** ist der
     Beweis, dass die Seite den Bestätigungsweg fährt und nicht irgendeinen.
     Danach zurücknehmen.

   Beide Mutationen sind zurückgenommen, bevor der Commit entsteht; `git diff`
   belegt das.
6. **`packages/shadow-objects-e2e/src/worker-failure.js`** — die Zusicherung an
   ihre Aufrufstelle schreiben. Bei `:65` steht heute ein nacktes
   `shadowEnv.syncWait()`. Es bekommt einen Kommentar, der die Reihenfolge
   benennt (die Bestätigung des Change Trails wird synchron nach `kernel.run()`
   gepostet, der Wurf liegt eine Aufgabe später, also kommt die Bestätigung
   zuerst), und einen `catch`, der eine Ablehnung mit `WorkerFailedError`
   durchgehen lässt. Begründung, die als Kommentar mitgeht: Dass die Entität den
   Worker erreicht hat, beweist diese Seite ohnehin weiter unten — der Worker
   stirbt an dem Shadow Object, das er aus ihr gebaut hat. Ein anderer Grund als
   `WorkerFailedError` wird weitergeworfen und macht den Fall rot. Ein Rennen
   zwischen zwei Nachrichten desselben sterbenden Workers ist keine Aussage über
   das Framework, und eine Seite, deren Gegenstand ein sterbender Worker ist,
   darf daran nicht kippen. Die Kennung bleibt, wie sie heißt.
7. **`packages/shadow-objects-e2e/public/mod-crash.js`** — die Gegenseite. Der
   vorhandene Kommentar (`:2-6`) erklärt, *warum* der Wurf verzögert wird; er
   bekommt einen Satz dazu, *was* die Verzögerung nebenbei entscheidet: dass die
   Bestätigung des Change Trails den Hauptthread vor dem `error`-Ereignis
   erreicht, und dass die Seite darauf steht.
8. **`packages/shadow-objects-e2e/TEST-PLAN.md`.** Die Kennungen dort sind
   projekteigene Testplan-Nummern und gehören in diese Datei — anders als die
   Laufnummern eines Audits. Sie sind nach Seite gruppiert (`MULTI`, `DOM`,
   `UPG`, `ASYNC`, `BUNDLE`, `H-FIX`), und implementierte Fälle tragen
   **Implemented** samt der Kennungen, die sie tragen (Muster: `MULTI-8`,
   `DOM-6`). Die neue Seite bekommt eine eigene Familie:
   - Neuer Abschnitt **`### 3.6 Page pages/sync-failure.html — a change trail
     the environment refuses`**, eingefügt vor den Harness-Fixes; der
     vorhandene Abschnitt `### 3.6 Harness fixes` (`:273`) wird zu `### 3.7`.
     Auf `3.6` verweist nichts, auf `§3.3` schon (`:14`) — der Verweis bleibt
     gültig.
   - Vier Kennungen `SYNC-1` bis `SYNC-4`, alle **Implemented**, je mit den
     `sync-failure-*`-Ids, die sie tragen: der Ausgang selbst (Ereignis, Grund,
     ausbleibendes `AfterSync`, ablehnendes `syncWait()`), der verlorene Change
     Trail im `detail`, die Abgrenzung gegen einen Proxy-Ausfall, und die
     Umgebung, die danach weitersyncht.
   - Eine fünfte, `SYNC-5`, **offen**, P3: `reCreateChanges()` als der
     dokumentierte Weg zurück nach einem abgewiesenen Trail. Warum offen, steht
     unter »Was ausdrücklich nicht dazugehört«.
   - Der Kopf-Blockzitat (`:6-14`): Fallzahlen, »ten spec files over ten pages«
     wird elf, und die Liste der offenen Kennungen bekommt `SYNC-5`.
   - Die Tabelle in §1 (`:28-40`) bekommt eine Zeile für
     `sync-failure.spec.ts`, und der Absatz darunter (`:41-43`) nennt
     `sync-failure` als dritte Seite, die einen Fehler mit Absicht provoziert
     und deshalb nur `test suite setup` aus dem Harness trägt.
   - §1.1 (`:50-58`): Der Satz, `mod-hello.js` habe seinen `fooEcho`-Pfad auf
     keiner Seite, stimmt danach nicht mehr — die neue Seite fährt ihn.
     Nachziehen.
   - §2.3 (`:127-135`): ein Satz, der `SYNC-1` gegen `ASYNC-10` abgrenzt. Ein
     abgewiesener Change Trail und ein mitten im Sync abgeschossener Worker sind
     zwei verschiedene Fehler, und der Unterschied ist genau das, was `SYNC-3`
     festhält.
   - §4 (`:288-303`): der Schlussabsatz nennt Fallzahlen. Nachrechnen, nicht
     schätzen — die Zahl steht im Playwright-Bericht.
9. **`Backlog.md`** (Wurzel) — die beiden Stellen mit Fallzahlen und
   Dateilisten: `:283` (»10 Dateien, 202 Fälle je Projekt und damit 404«, plus
   die Aufzählung der Seiten) und `:319` (»Stand: 404 Tests, 202 je Projekt«).
   Dazu `:299` und `:301`, wo die Deckung von `ShadowEnv` und `RemoteWorkerEnv`
   beschrieben ist: der abgelehnte Change Trail hat dort jetzt auch eine
   E2E-Strecke, und sie heißt `sync-failure`. Zahlen aus dem tatsächlichen Lauf,
   nicht aus dieser Rechnung.
10. Kein Changelog. `shadow-objects-e2e` ist `private` und führt keines; die
    Wurzel-`CHANGELOG.md` nimmt Build, Testrunner, Lint und turbo/pnpm auf, und
    eine zusätzliche Testseite ist keines davon.

#### Was ausdrücklich nicht dazugehört

- **Kein zweiter Fall über den abgelaufenen `change-trail-timeout`.** Der
  Mechanismus dieses Pakets ist der Kernel-Fehler, und nur er. Begründung: Das
  Zeitfenster ist auf der Unit-Ebene gegen eine gestellte Uhr belegt —
  `RemoteWorkerEnv.spec.ts:918` schneidet einen wartenden Trail an seinem
  `changeTrailTimeout` ab, `:895` prüft die Meldung —, und der einzige
  Unterschied, den der abgelaufene Weg auf der View-Seite macht, ist die Gestalt
  des Grundes: ein `Error` aus `waitForMessageOfType.ts:41` statt des Strings
  aus dem Worker. Dafür einen E2E-Fall mit Wanduhr zu bauen heißt, eine
  Flackerquelle gegen eine Behauptung einzutauschen, die anderswo schärfer
  steht. Der Kernel-Fehler dagegen ist deterministisch und derselbe, den auch
  `LocalShadowObjectEnv` erzeugt.
- **Kein WebKit.** `playwright.config.ts:52-55` bleibt auskommentiert. Die neue
  Seite fährt in den Projekten, die aktiv sind, und zieht in WebKit
  automatisch mit ein, sobald jemand H-FIX-8 entscheidet. Diese Entscheidung
  gehört nicht in ein Paket, das Abdeckung nachträgt — sie ist eine Aussage
  über die Suite als Ganzes und steht als eigene Kennung im Testplan.
- **Kein `reCreateChanges()` auf der neuen Seite** (`SYNC-5` bleibt offen). Der
  dokumentierte Weg zurück schickt den gesamten View-Zustand erneut, und die
  Entität, die der Worker abgewiesen hat, steht noch darin — die Erholung liefe
  in dieselbe Abweisung, solange das Element nicht vorher verschwindet. Damit
  würde der Fall eine Geschichte über das Fixture erzählen und nicht über
  `reCreateChanges()`. Wer ihn will, baut ihn mit einem Fixture, das beim
  zweiten Anlauf durchlässt, und das ist ein eigener Entwurf.
- **Kein Anfassen von Bibliothekscode.** Nichts unter
  `packages/shadow-objects/src/` bewegt sich. Fällt beim Bauen der Seite etwas
  auf — die Gestalt des Grundes, die Redundanz zwischen `syncfailed` und der
  Ablehnung, irgendetwas am Protokoll —, wird es gemeldet, nicht behoben.
- **Keine neue Kennung auf `worker-failure`.** Diese Seite behält ihre dreizehn
  Fälle; sie bekommt Kommentare und einen `catch`, sonst nichts. Ihr Gegenstand
  bleibt der sterbende Worker.
- **Kein Umbau des Harness.** `runPageTests`, `runTestSuite`, `testAsyncAction`,
  `testBooleanAction`, `watchCustomEvent` und `waitUntil` werden benutzt, wie sie
  sind. Fehlt der Seite etwas, ist das eine Rückfrage, kein Beifang.
- Keine der übrigen 36 Findings.

- Ergebnis: 1 Runde · 5 neue und 5 geänderte Dateien · neue Seite
  `sync-failure` mit 11 Fällen je Browser, E2E 404 → 426 · die Gegenprobe von
  beiden Seiten gefahren: Wurf im Fixture entfernt → 5 Kennungen rot; eine
  volle Aufgabe vor dem `syncWait()` eingeschoben → dieselben 5 rot, obwohl
  der Kernel unverändert wirft, also fährt die Seite belegbar den
  Bestätigungsweg · ein einzelner Microtask kippt sie nicht, weil `sync()`
  selbst einen einlegt — die Planvorgabe war an dieser Stelle falsch, die
  Abweichung des Implementierers richtig · Flackern ausgeschlossen
  (`--repeat-each=6 --workers=8` unter Last, 288/288) · Gegenseite geprüft:
  `mod-crash.js` synchron werfend macht 14 Fälle rot, der neue `catch` lässt
  nur `WorkerFailedError` durch · Verify vom Orchestrator selbst gelesen,
  zweimal, das zweite Mal nach einem Eingriff des Reviewers in den Arbeitsbaum
  und gegen einen zeilengleichen Diff: Playwright 426 über Chromium und
  Firefox, lint ✓ typecheck ✓ `test:ci --force` ✓ 952 Fälle
- Nebenbefunde:
  - `packages/shadow-objects-e2e/tests/sync-failure.spec.ts:22` —
    `allowConsoleErrors: true` streicht den Fall »no uncaught or logged
    errors« samt seiner `pageerror`-Prüfung. Auf einer Seite, deren Gegenstand
    abgelehnte Promises sind, wird damit gerade die unbehandelte Rejection
    unsichtbar. Eigenschaft des Harness, betrifft ebenso `worker-failure` und
    `create-element`; bewusst liegen gelassen, weil eine Änderung daran drei
    Seiten und die Harness-Semantik berührt.
  - `packages/shadow-objects/src/in-the-dark/Kernel.ts:285` — `createEntity()`
    trägt die Entität in `#entities` ein, bevor `createShadowObjects()`
    (`:302`) läuft. Wirft ein Konstruktor, bleibt im Worker-Kernel eine
    halbfertige Entität stehen: registriert, ohne Shadow Objects, der View
    unbekannt. Erst ein späteres `DestroyEntities` räumt sie weg.
  - `packages/shadow-objects/src/worker/MessageRouter.ts:138` — der Grund
    geht als String über die Leitung (`` `${error}` ``), während `ProxyFailed`
    eine `WorkerFailedError`-Instanz trägt. Die neue Seite ist auf das
    gemessene Verhalten gestellt.
  - `packages/shadow-objects-e2e/public/mod-hello.js:6` — `xyz((val) => …)`
    benutzt die abgekündigte `signalReader(callback)`-Form; signalize
    protokolliert im Worker eine Deprecation-Warnung, die jetzt bei jedem
    Laden der neuen Seite mitläuft.
  - `packages/shadow-objects-e2e/README.md:6` — der Einleitungssatz nennt die
    beiden Fehlerpfad-Seiten nicht, dieselbe Lücke wie in der Tabelle, eine
    Ebene höher.
- Folgen: keine offenen mehr. Die E2E-Strecke war die letzte Folge dieses
  Laufs; alles Übrige ist als vorbestehend belegt und geht ins nächste Audit.
- Schnittstellen: keine. Das Paket ändert keinen Bibliothekscode.
