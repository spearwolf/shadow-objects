# Konzept für die Shadow-Objects Entwickler-Dokumentation

Dieses Dokument dient als Leitfaden und Spezifikation für die Erstellung der neuen Entwickler-Dokumentation.

## 1. Ziele und Zielgruppen

### Primäre Ziele
1.  **Onboarding beschleunigen:** Neue Entwickler sollen das "Mental Model" (Trennung von View und Shadow World) innerhalb von 15 Minuten verstehen.
2.  **API-Sicherheit:** Erfahrene Entwickler benötigen eine präzise Referenz für die `ShadowObjectCreationAPI` und Konfigurationsoptionen.
3.  **Pattern-Etablierung:** Förderung von Best Practices (z.B. funktionale Shadow Objects vs. Klassen, Signal-Nutzung).

### Zielgruppen
-   **Einsteiger:** Benötigen High-Level-Konzepte, Diagramme und "Hello World".
-   **Architekten:** Interessieren sich für Lifecycle, Performance (Worker/Main Thread) und Integration.
-   **Maintainer:** Benötigen Details zu Internals (Kernel, Registry, Message Dispatch).

## 2. Struktur und Navigation

Die Dokumentation wird im Ordner `docs/` abgelegt und folgt einer flachen Hierarchie mit thematischen Gruppierungen.

### Verzeichnisstruktur (Vorschlag)

```text
docs/
├── 01-fundamentals/       # Konzepte & Mentales Modell
│   ├── 01-mental-model.md
│   ├── 02-architecture.md
│   └── 03-lifecycle.md
├── 02-guides/            # Praktische Anleitungen
│   ├── 01-getting-started.md
│   ├── 02-creating-shadow-objects.md
│   └── 03-view-integration.md
├── 03-api/               # Harte Referenz
│   ├── 01-shadow-object-api.md
│   ├── 02-registry-and-modules.md
│   └── 03-view-components.md
├── 04-patterns/          # Best Practices
│   ├── state-management.md
│   └── inter-object-communication.md
└── CONCEPT.md            # (Dieses Dokument)
```

## 3. Inhaltskonzept (Detail)

### Bereich 1: Fundamentals (Grundlagen)

*   **`01-mental-model.md`**:
    *   Erklärung der "Zwei Welten": *Light World* (View/DOM) vs. *Shadow World* (Logik).
    *   Analogie: "Das Schatten-Theater" (Die View ist nur die Projektion, die Logik passiert dahinter).
    *   Kernbegriffe: Entity, Shadow Object, Token.
*   **`02-architecture.md`**:
    *   Diagramm: Kernel, Registry, Message Router.
    *   Erklärung der Kommunikation (Change Trails, Events).
    *   Lokal vs. Remote (Worker) Ausführung.
*   **`03-lifecycle.md`**:
    *   Wann entsteht eine Entity?
    *   Wie instanziiert der Kernel Shadow Objects basierend auf Tokens?
    *   Zerstörung und Cleanup (`onDestroy`).

### Bereich 2: Guides (Anleitungen)

*   **`01-getting-started.md`**:
    *   Installation.
    *   Minimales Setup (`shae-worker-env`, ein einfaches Shadow Object).
*   **`02-creating-shadow-objects.md`**:
    *   Fokus auf funktionale API (Recommended).
    *   Schritt-für-Schritt: `useProperty` -> `createEffect` -> `return API`.
*   **`03-view-integration.md`**:
    *   Verwendung von Web Components (`<shae-ent>`, `<shae-prop>`).
    *   Synchronisation von Properties.

### Bereich 3: API Reference

*   **`01-shadow-object-api.md`** (Die wichtigste Referenz):
    *   Detaillierte Auflistung der `ShadowObjectCreationAPI`.
    *   **Inputs:** `useProperty`, `useProperties`, `useContext`, `useParentContext`.
    *   **Outputs:** `provideContext`, `provideGlobalContext`.
    *   **Reactivity:** `createSignal`, `createMemo`, `createEffect`, `createResource`.
    *   **Events:** `on`, `once`.
*   **`02-registry-and-modules.md`**:
    *   Wie definiert man ein Modul?
    *   Routing-Regeln (Composition, Conditional Routing).
*   **`03-view-components.md`**:
    *   API der JS-Klassen `ViewComponent` und `ComponentContext` (für Entwickler, die eigene View-Layer bauen).

### Bereich 4: Patterns & Best Practices

*   **`state-management.md`**:
    *   Wann lokalen State (`createSignal`) nutzen?
    *   Wann Context nutzen?
*   **`inter-object-communication.md`**:
    *   Kommunikation über Context (Parent -> Child).
    *   Kommunikation über Events.

## 4. Schreib-Leitfaden (Guidelines)

1.  **Sprache:** Englisch (Project Standard).
2.  **Format:** Markdown.
3.  **Code-First:** Jedes Konzept muss mit einem Code-Beispiel beginnen oder begleitet werden.
4.  **Diagramme:** Mermaid.js für Sequenz- und Flussdiagramme verwenden.
5.  **Callouts:** Wichtige Warnungen (z.B. "Daten werden geklont") explizit mit `> [!WARNING]` oder `> [!NOTE]` hervorheben.
6.  **Konsistenz:** Immer `Token` (String Identifier) vs `UUID` (Unique ID) unterscheiden.

## 5. Nächste Schritte

1.  Ordnerstruktur anlegen.
2.  Migration der Inhalte aus der bestehenden `README.md` in `01-mental-model.md` und `01-shadow-object-api.md`.
3.  Ergänzung der fehlenden Details aus `types.ts` (besonders die vollständige API-Liste).
