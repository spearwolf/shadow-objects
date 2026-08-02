# shadow-objects

## a reactive entity-component framework that feels at home in the shadows

Dieser Subtitel bleibt. Er verpackt den Kern der Idee in Worte, und er ist die einzige Stelle,
an der das Wortspiel mit dem Schatten noch erlaubt ist.

---

## 1. Kurzbeschreibung

Shadow Objects ist ein Entity-Component-System für die Browser-Plattform. Es trennt die
Anwendungslogik von ihrer Darstellung, und zwar nicht nur logisch, sondern physisch: Die Logik
läuft in einem Shadow Environment, das wahlweise im Hauptthread (`LocalShadowObjectEnv`) oder in
einem Web Worker (`RemoteWorkerEnv`) sitzt. Der Code der Shadow Objects ist in beiden Fällen
identisch. Nur der Proxy wird getauscht.

Die Anwendungslogik steckt in Shadow Objects. Das sind ECS-Komponenten: kleine, zustandsbehaftete
Einheiten, die an eine Entity gebunden werden. Die Entities bilden einen Baum, der die Struktur der
Anwendung abbildet. Diese Struktur bestimmt der View.

Der View ist authoritativ für die Struktur, nicht für das Verhalten. Er legt fest, welche Entities
existieren, wie sie im Baum hängen und welche Properties sie bekommen. Welche Shadow Objects auf
einer Entity landen, entscheidet er nicht: Das macht die Registry über das Token und die
Routing-Regeln des Environments.

Der View ist im DOM verankert, aber nicht an die DOM-Struktur gebunden. Die Realität in Browser-Apps
ist, dass der DOM-Baum von React, Angular, Vue oder plain JavaScript selten der Struktur der
Anwendungslogik entspricht. Shadow Objects lässt die Logik in einer eigenen Hierarchie leben, die
vom View aufgespannt, gesteuert und abgefragt wird.

---

## 2. Von drei Säulen zu fünf Domänen

Die ursprüngliche Fassung nannte drei Säulen:

1. Der View mit den View Components
2. Das Shadow Environment (Lifecycle Management, Entity-Graph)
3. Die Shadow Objects (Logik, Routing, Registry)

Das ist als Merkbild richtig, packt aber jeweils zwei Verantwortlichkeiten in einen Topf. Säule 2
vermischt »wo läuft die Logik« mit »wer verwaltet den Lebenszyklus«. Säule 3 vermischt »was tut ein
Shadow Object« mit »welche Shadow Objects entstehen überhaupt«. Genau an diesen beiden Nähten
verläuft aber die wichtigste Grenze des Frameworks, nämlich die zwischen Komposition und Logik.

Sauber aufgeteilt sind es fünf Domänen:

| # | Domäne | Verantwortung | Ort |
|---|---|---|---|
| 1 | **View** | Struktur, Properties, Eingabe | immer Hauptthread |
| 2 | **Environment** | Ort der Ausführung, Transport | Hauptthread oder Worker |
| 3 | **Kernel** | Lifecycle, Entity Tree | im Environment |
| 4 | **Composition** | Registry, Token, Routing | im Environment |
| 5 | **Shadow Object** | Anwendungslogik, Reaktivität, Kommunikation | im Environment |

Domäne 1 ist die alte Säule 1. Die Domänen 2 und 3 waren Säule 2, die Domänen 4 und 5 waren Säule 3.

---

## 3. Die Domänen im Einzelnen

### 3.1 View — Struktur und Eingabe

Der View entscheidet, was existiert. Er ist der einzige Teil des Systems, der das darf.

**Besitzt:** die Menge der View Components, ihre Hierarchie, ihre Properties, das Token pro Node,
den Zeitpunkt von Erzeugung und Zerstörung, das Absenden von Events in Richtung Logik.

**Besitzt nicht:** Anwendungslogik, Entity-IDs, die Frage, welche Shadow Objects entstehen.

**Bausteine:** `ViewComponent` als programmatische API, die Custom Elements `<shae-ent>`,
`<shae-prop>` und `<shae-worker>` als deklarative Variante darüber. `ComponentContext` sammelt alle
View Components eines Namespace. `ComponentChanges` und `ComponentMemory` verbuchen, was sich seit
dem letzten Sync geändert hat.

Beide Zugänge, JavaScript-API und Web Components, lassen sich in derselben App mischen. Die Custom
Elements rufen intern nichts anderes als die `ViewComponent`-API auf. Damit funktioniert der View
genauso über einem GLTF-Szenengraph, einem Canvas-Renderer oder einem React-Tree wie über dem DOM.

**Grenze:** Der View kennt Tokens, nicht Konstruktoren. Er sagt »hier ist ein `player`«, nicht »hier
läuft `PlayerLogic`«.

---

### 3.2 Environment — Ort und Transport

Diese Domäne beantwortet eine einzige Frage: Wo läuft die Logik, und wie kommen die Nachrichten
dorthin?

**Besitzt:** die Wahl des Ausführungsorts, das Message-Protokoll, den Sync-Takt, das Marshalling der
Daten über die Thread-Grenze.

**Besitzt nicht:** irgendetwas Fachliches. Diese Domäne ist austauschbar, ohne dass eine Zeile
Anwendungscode sich ändert.

**Bausteine:** `ShadowEnv` als Fassade, die einen `ComponentContext` mit einem Proxy verheiratet.
`IShadowObjectEnvProxy` ist der Vertrag, `LocalShadowObjectEnv` und `RemoteWorkerEnv` sind die zwei
Implementierungen. Auf der Worker-Seite spiegeln `MessageRouter` und `WorkerRuntime` das Ganze.

Der Transport ist ein Change Trail: `ShadowEnv.sync()` sammelt die Änderungen seit dem letzten Lauf
zu einem Batch und schickt ihn hinüber. `<shae-worker auto-sync>` treibt das pro Frame, mit fester
Rate oder gar nicht. Für lokale Environments lässt sich das Structured Cloning abschalten, dann
wandern Referenzen statt Kopien.

Beide Modi sind erstklassig. Lokal ist kein Debug-Krückstock und Remote kein Optimierungstrick. Der
lokale Modus ist der einzige Weg, nicht-klonbare Objekte wie DOM-Referenzen oder Canvas-Kontexte
direkt an ein Shadow Object zu reichen.

**Ausblick:** Ein Shadow Environment auf einem Server ist denkbar, weil der Vertrag reines
Message-Passing ist. Implementiert ist es nicht.

**Grenze:** Zwei Environments reden nie direkt miteinander. Der Hauptthread ist der Bus.

---

### 3.3 Kernel — Lifecycle und Entity Tree

Der Kernel ist die Maschine im Environment. Er nimmt Change Trails entgegen und macht daraus einen
lebenden Baum.

**Besitzt:** den Entity Tree, die Identität der Entities, die vier Lebensphasen `create`, `mount`,
`active`, `destroy`, die Reihenfolge der Traversierung.

**Besitzt nicht:** die Zuordnung Token zu Konstruktor. Dafür fragt er die Registry.

**Bausteine:** `Kernel` mit `run()`, `getEntity()`, `traverseLevelOrderBFS()`, `getEntityGraph()`,
`upgradeEntities()`. `Entity` mit Parent-Child-Beziehung, `traverse()`, Properties und
Event-Emitter-Fähigkeit.

Eine Entity ist zustandsbehaftet und trotzdem ohne Logik. Das ist kein Widerspruch, sondern die
Kernaussage von ECS: Sie hält Properties, Contexts und einen Event-Bus, sie tut damit aber nichts.
Alles, was auf diesen Zustand reagiert, ist ein Shadow Object.

**Grenze:** Der Kernel erzeugt keine Struktur von sich aus. Er vollzieht, was der View ihm sagt.

---

### 3.4 Composition — Registry und Routing

Hier fällt die Entscheidung, die weder der View noch die Entity trifft: Welche Shadow Objects landen
auf dieser Entity?

**Besitzt:** die Abbildung von Token auf Konstruktoren und die Regeln, nach denen aus einem Token
mehrere werden.

**Besitzt nicht:** Zustand. Die Registry ist Konfiguration, kein Laufzeitobjekt der Anwendung.

**Bausteine:** `Registry` und das Modul-Objekt, auf das `<shae-worker src>` zeigt. Ein Modul kennt
vier Schlüssel:

- `define` bildet Token auf Konstruktoren ab.
- `routes` komponiert. Ein Token zieht weitere Tokens nach sich, rekursiv, und bedingt über
  `'@propName'`, sodass eine Property am Entity über zusätzliche Logik entscheidet.
- `extends` bindet weitere Module ein.
- `initialize` läuft asynchron beim Laden und darf Definitionen nachreichen, etwa nach einem
  Feature-Flag-Request.

Das ist die zweite Entkopplung des Frameworks, und die unterschätzte. Die erste trennt View von
Logik. Diese trennt die Komposition der Logik vom Ort ihrer Verwendung. Querschnittsverhalten wie
Logging, Analytics oder ein Debug-Overlay wird an Entities gehängt, ohne dass eine Zeile HTML sich
ändert.

**Grenze:** Routing entscheidet über Existenz, nicht über Verhalten. Was die Shadow Objects danach
miteinander tun, steht in ihnen selbst.

---

### 3.5 Shadow Object — Logik, Reaktivität, Kommunikation

Hier liegt die Anwendung.

**Besitzt:** Verhalten, lokalen Zustand, Reaktion auf Änderungen, Kommunikation nach oben, unten und
zur Seite, Aufräumen.

**Besitzt nicht:** die eigene Existenz und den eigenen Lebenszyklus.

Ein Shadow Object ist eine Funktion oder eine Klasse. Der Rumpf läuft genau einmal beim `mount` und
baut den reaktiven Graphen auf. Danach läuft nichts mehr von oben nach unten durch, es reagiert nur
noch. Die `ShadowObjectCreationAPI` liefert dafür vier Werkzeugkästen:

| Kasten | Werkzeuge | Wofür |
|---|---|---|
| Inputs | `useProperty`, `useProperties` | Properties aus dem View als Signale lesen |
| Reaktivität | `createSignal`, `createMemo`, `createEffect`, `createResource` | eigener Zustand, abgeleitete Werte, Seiteneffekte, externe Ressourcen mit Lebenszyklus |
| Context | `provideContext`, `provideGlobalContext`, `useContext`, `useParentContext` | Dependency Injection entlang des Entity Tree |
| Events | `onViewEvent`, `dispatchMessageToView`, `on`, `emit` | Kommunikation mit View, Geschwistern und Teilbaum |

Mehrere Shadow Objects auf derselben Entity teilen sich deren Properties, deren Contexts, deren
Event-Bus und deren Lebensdauer. Genau daraus entsteht Komposition: `player` ist nicht eine große
Klasse, sondern `PhysicsBody` plus `Health` plus `RenderMesh`, die über den Entity-Bus reden und
keinen Import voneinander brauchen.

Shadow Objects werden nie ineinander verschachtelt. Die Hierarchie ist Sache der Entities.

**Grenze:** Signale, Effekte, Memos und über die API registrierte Listener räumt das Framework beim
`destroy` selbst ab. Alles außerhalb, also Intervalle, Sockets, fremde Listener, gehört in
`onDestroy` oder in ein `createResource`.

---

## 4. Die Datenflüsse

Drei Richtungen, und sie kreuzen sich nie.

**Downstream, Properties.** View setzt Property, `ComponentChanges` verbucht sie, `sync()` schickt
den Change Trail, der Kernel schreibt sie an die Entity, das Signal aus `useProperty` feuert, die
abhängigen Effekte laufen. Der View schiebt Daten, er ruft keine Logik auf.

**Upstream, Messages.** Ein Shadow Object ruft `dispatchMessageToView`, der Kernel emittiert
`MessageToView`, der Proxy trägt es über die Thread-Grenze, die `ViewComponent` feuert es als
eventize-Event. Mit `forward-custom-events` wird daraus zusätzlich ein DOM-`CustomEvent` am
`<shae-ent>`. Die Logik kennt kein DOM, sie kennt nur Nachrichtentypen.

**Lateral, Context und Entity-Bus.** Contexts wandern von Vorfahren zu Nachfahren und sind Signale,
also aktualisieren sich Konsumenten von selbst. Events auf der Entity erreichen alle Shadow Objects
dieses Knotens, `entity.traverse()` erreicht den Teilbaum. Für Frame-Ticks, Resize-Events oder
globale Zustandswechsel ist das der Weg.

Was es nicht gibt: einen Kanal zwischen zwei Environments. View Components in verschiedenen
Namespaces sind vollständig isoliert, jeder Namespace hat eigenen Kernel, eigene Registry, eigenen
Entity Tree. Sollen sie voneinander wissen, vermittelt der View, und das ist Absicht.

---

## 5. Invarianten

Die Domänen halten, solange diese Sätze halten:

1. Struktur fließt nur vom View in das Environment, nie zurück.
2. Ein Shadow Object erzeugt oder zerstört keine Entity.
3. Eine Entity kennt ihre Shadow Objects nicht namentlich.
4. Der View kennt keine Konstruktoren, nur Tokens.
5. Environments kommunizieren ausschließlich über den View.
6. Was das Framework nicht angelegt hat, räumt das Framework nicht weg.

---

## 6. Terminologie

Die Kurzbeschreibung führte einige Begriffe ein, die in Code und Doku nicht existieren. Das ist die
gefährlichste Sorte Doku, weil sie plausibel klingt. Verbindlich ist die linke Spalte:

| Verbindlich | Verworfen | Grund |
|---|---|---|
| `RemoteWorkerEnv` | `RemoteShadowObjectEnv` | Klasse heißt so nicht |
| Entity | Shadow Entity | ECS-Term, und »Shadow« steckt schon im Environment |
| Entity Tree | Shadow-Entity-Graph | Es ist ein Baum, jeder Knoten hat genau einen Parent. `getEntityGraph()` bleibt als Methodenname |
| Namespace / `ComponentContext` | Shadow-Context | siehe unten |
| Token | Component Tag | »Component Tag« taucht in der Doku als Erklärung auf, im Code nirgends |

Und ein Fallstrick, der es bis in die Doku geschafft hat: Das Wort Context bezeichnet im Framework
zwei verschiedene Dinge. `ComponentContext` ist die View-seitige Registratur eines Namespace, also
der Anschluss an ein Environment. `provideContext` und `useContext` sind Dependency Injection
entlang des Entity Tree. Sie haben nichts miteinander zu tun. In der Doku gehört das an jeder
Fundstelle auseinandergehalten, am besten durch konsequentes Ausschreiben von `ComponentContext`
gegenüber »Entity Context«.

---

## 7. Was die Kurzbeschreibung noch nicht sagte

Vollständig ist das Bild erst mit diesen fünf Punkten, die in der ersten Fassung fehlten:

- **Reaktivität.** Properties, Signale, Effekte, Memos und Ressourcen sind kein Detail, sondern der
  Mechanismus, über den überhaupt etwas passiert. Ohne sie ist ein Shadow Object ein leerer Container.
- **Context als DI.** Der einzige Weg, Subsysteme wie eine Physik-Welt, eine Szene oder einen
  Audio-Kontext an einen ganzen Teilbaum zu geben, ohne sie durchzureichen.
- **Der Entity-Bus.** Shadow Objects auf derselben Entity reden über Events, nicht über Imports. Das
  ist die Voraussetzung dafür, dass Routing überhaupt sinnvoll komponieren kann.
- **Der Sync-Takt.** Der Change Trail ist gebatcht und getaktet, nicht sofortig. Wer synchrone
  Durchreiche erwartet, baut Race Conditions.
- **Der Lebenszyklus.** `create`, `mount`, `active`, `destroy`, und die Regel, dass der Rumpf genau
  einmal läuft. Wer das nicht weiß, schreibt den Rumpf so, als wäre er eine Render-Funktion.

Drei Säulen tragen ein Dach. Fünf Domänen tragen ein Framework.
