# Cocos Creator MCP Server-Plugin (pts-cc-mcp)

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · **Deutsch** · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Ein umfassendes, quelloffenes MCP-(Model Context Protocol-)Server-Plugin für Cocos Creator 3.8+, das es KI-Coding-Assistenten (Claude CLI, Claude Desktop, Cursor, Windsurf, Antigravity) ermöglicht, Cocos Creator-Spiele über ein standardisiertes Protokoll zu inspizieren, zu erstellen, zu validieren und zu bearbeiten.

**🚀 Mit dualem Streamable HTTP- und SSE-Transport, 16 vereinheitlichten Intent-Tools (231 Opcodes), deklarativer One-Shot-UI-Generierung, Offline-Reflexions-Wissensdatenbank, Timeline-Keyframe-Animationserstellung und Szenen-/Asset-Regressions-Snapshot-Diffing!**

---

## 🙏 Danksagungen und Credits

Dieses Projekt entstand als Open-Source-Fork von [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server), entwickelt von **LiDaxian**. Wir sprechen **LiDaxian** und allen Mitwirkenden der Community unseren aufrichtigen Dank und unsere Anerkennung dafür aus, die grundlegende Architektur geschaffen und den Weg für die KI-gestützte Entwicklung in Cocos Creator geebnet zu haben.

`pts-cc-mcp` baut auf diesem Fundament als vollständig quelloffene, community-getriebene Erweiterung auf und ersetzt alle proprietären/kommerziellen Funktionen durch überlegene Open-Source-Äquivalente.

---

## 🚀 Version 1.6.0 Changelog: Die vereinheitlichte Pro-Architektur

### 1. Dualer Streamable HTTP- und Server-Sent Events (SSE)-Transport (Phase 1)
- Vollständige native Unterstützung für `@modelcontextprotocol/sdk` Streamable HTTP (`/mcp`) und Server-Sent Events (`/sse` & `/messages`) auf Port `3121`.
- Isoliertes Sitzungsmanagement pro Client, Keep-Alive-Heartbeat und CORS-Header für moderne KI-Clients.

### 2. Intent-basierte vereinheitlichte Opcode-Architektur (Phase 2)
- Ersetzung von über 50 verstreuten Schemas durch **16 vereinheitlichte Intent-Tools**, die 231 Operationen abdecken (`action`-Opcode-Dispatch).
- Reduziert den Schema-Token-Verbrauch um über 70 % im Kontextfenster von LLMs bei vollständiger Abwärtskompatibilität mit älteren Tool-Aufrufen.

### 3. Deklarativer One-Shot UI- und Szenen-Builder (Phase 3)
- `ui_builder`: Erstellung komplexer UI-Graphen (`build_tree`, `create_dialog`, `create_button`, `create_list`) mit automatischer `UITransform`-Erstellung, Constraint-Auflösung (Widget-Anker, Layout-Abstände) und automatischem Rollback-Snapshotting bei Fehlern.

### 4. Eingebettete Cocos Creator 3.8 Reflexions-Wissensdatenbank (Phase 4)
- `knowledge_query`: In-Memory-Architekturregeln und `@property`-Wörterbücher für integrierte 2D/3D-Komponenten (`cc.Sprite`, `cc.Label`, `cc.Widget`, `cc.Layout`, `sp.Skeleton`), Design-Auflösungsleitfäden und Koordinaten-Konvertierungsformeln.
- Automatisierte `AGENTS.md`-Verifizierung und Dokumentationsgenerator (`get_mcp_guide`, `sync_agents_doc`).

### 5. Timeline-Animation und Keyframe-Kurven-Editor (Phase 5)
- `anim_manage`: Direkte `.anim` (`cc.AnimationClip`)-Spurerstellung mit kubischer Bézier-, linearer und konstanter Kurveninterpolation.
- Animations-Event-Trigger, schnelle Bewegungsvorlagen (`bounce_pop`, `fade_in`, `fade_out`, `shake`) und automatisches Slicing von Multi-Take-FBX-Animationen.

### 6. Szenen- und Asset-Diagnose & Snapshot-Diffing (Phase 6)
- `validation_manage`: Erkennung von Namenskollisionen zwischen Geschwister-Nodes, Diagnose fehlender `UITransform`s und tiefgehender rekursiver Asset-Scanner zum Abgleich von `__uuid__`-Referenzen von Szenenkomponenten gegen die `asset-db`.
- SHA-256-Szenenzustands-Snapshots (`capture_snapshot`) und visuelle Markdown-Regressions-Diff-Tabellen (`diff_snapshot`).

---

## 🛠️ Spickzettel der 16 vereinheitlichten Intent-Tools

| Intent-Tool | Wichtigste Argumente | Zweck & Best Practice |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | Szenen-Lifecycle, vollständige Bauminspektion und Szenenskripte. |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | Universelle Node-Suche, Erstellung, Transformation und Hierarchie-Manipulation. |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | Hinzufügen/Entfernen von Komponenten, tiefgehende Eigenschafts-Updates mit automatischem Speichern, Klick-Bindung und @ccclass-Reflexion. |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | Vollständiger Prefab-Lifecycle, zerstörungsfreie Bearbeitungssitzungen und atomare Batch-Bearbeitungen. |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | Deklarative One-Shot-UI-Generierung mit automatischer UITransform-Erstellung, Widget-Constraints und Layouts. |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | Timeline-AnimationClip-Bearbeitung, Eigenschaftskurven, Easing-Modi, Animations-Events, Presets, FBX-Slicing und AnimGraph-Zustandsautomaten. |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | Asset-Erkennung, Abhängigkeitsinspektion und intelligente Sub-Asset-Auflösung (`@spriteFrame`, `@texture`). |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | Offline-Architekturreferenz für Komponenten, Koordinaten, Regeln und Live-MCP-Dokumentation. |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | Automatisierte Prüfung auf fehlende UITransforms, beschädigte Assets, Nodes außerhalb des Viewports und visuelles Snapshot-Regressions-Diffing. |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | Prozessinterne atomare Batch-Ausführung mehrerer Operationen in einer einzigen IPC-Transaktion. |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | Build-Einstellungen, Steuerung des Vorschau-Servers und TypeScript-Kompilierungs-Watcher. |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | Viewport-Kamerasteuerung und Editor-Overlays. |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | Schnelle Spine-Skelett- oder FastSpine-Rig-Einrichtung mit nur einem Aufruf. |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | Editor-Konsolenüberwachung und Performance-Telemetrie. |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | Konfiguration der Editor-Einstellungen. |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | Überwachung und Verteilung von Editor-Events. |

---

## 📖 Standard-MCP-Workflows

### A. Inspektion von Szenen- oder Prefab-Graphen
* Verwenden Sie `scene_manage(action="inspect")`, um die Szenenhierarchie, Komponenten und Eigenschaften in formatierten JSON- oder Markdown-Bäumen zu untersuchen.
* Verwenden Sie `scene_manage(action="hierarchy", includeComponents=true)`, um aktive Nodes in der laufenden Szene oder im geöffneten Prefab aufzulisten.

### B. Ändern von Komponenten in der aktiven Szene
* Verwenden Sie `component_manage(action="update")` für tiefe Eigenschafts-Updates (`config.sid`, `config.data`), verschachtelte `@ccclass`-Objektinstanziierung und Asset-Arrays (`onUpdates`, `onChanged`).
* Verwenden Sie `scene_manage(action="save")`, um Szenenänderungen dauerhaft zu speichern.

### C. Ändern von Komponenten / Nodes in Prefabs
* **Wenn das Prefab aktuell geöffnet ist / inspiziert wird:**
  1. `node_manage(action="query")`, um die Ziel-Node zu lokalisieren.
  2. `component_manage(action="add")` (zum Anhängen neuer Skripte) oder `component_manage(action="update")` (zum Setzen von Daten).
  3. `prefab_manage(action="save")` zum Speichern.
* **Wenn das Prefab im Hintergrund liegt (nicht geöffnet):**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")`, um die Ziel-Node zu lokalisieren.
  3. `component_manage(action="update")`, um Änderungen anzuwenden.
  4. `prefab_manage(action="save")`
  5. `prefab_manage(action="exit")`
* Oder verwenden Sie Atomic Edit: `prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. Klassenreflexion & Typen
* Verwenden Sie `component_manage(action="query_class_info")`, um `@ccclass`-Reflexionsattribute, Standardwerte und `@property`-Metadaten vor der Zuweisung von Werten zu inspizieren.

### E. Deklarative UI-Generierung
* Verwenden Sie `ui_builder(action="build_tree", parent="Canvas", tree={...})`, um vollständige UI-Hierarchien (Panels, Buttons, Labels, Sprites, ScrollViews) mit automatisch berechneten UITransforms und Widget-Constraints in einem einzigen atomaren Aufruf zu erstellen.

### F. Timeline-Keyframe-Animation & FBX-Slicing
* `.anim`-Clips mit Eigenschaftskurven erstellen: `anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`.
* Bewegungsvorlagen anwenden: `anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`.
* Multi-Take-FBX-Modelle zuschneiden: `anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`.

### G. Szenen- & Asset-Diagnose & Snapshot-Diffing
* Baseline-Snapshot der Szene vor Änderungen erfassen: `validation_manage(action="capture_snapshot", tag="PreEdit")`.
* Szene nach Bearbeitung mit dem Snapshot vergleichen: `validation_manage(action="diff_snapshot")`.
* Szenenhierarchie auf Layout-Fehler prüfen: `validation_manage(action="check_scene")`.
* Projekt und Szene nach fehlerhaften GUID-Referenzen scannen: `validation_manage(action="check_assets")`.

---

## ⚡ Schnellstart

`pts-cc-mcp` läuft standardmäßig auf Port `3121` mit Unterstützung für dualen Transport: **Streamable HTTP** (`/mcp`) und **Server-Sent Events (SSE)** (`/sse`).

### 1. Claude CLI Konfiguration

```bash
# Streamable HTTP (Standard)
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# Oder über Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Claude Desktop Konfiguration

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "http",
      "url": "http://127.0.0.1:3121/mcp"
    }
  }
}
```

*Oder mit SSE-Transport konfiguriert:*

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "sse",
      "url": "http://127.0.0.1:3121/sse"
    }
  }
}
```

### 3. Cursor & Windsurf Konfiguration

In den Cursor- oder Windsurf-MCP-Einstellungen (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3121/mcp"
    }
  }
}
```

---

## ⚠️ Voraussetzungen & Zwingende Peer-Abhängigkeit

> **WICHTIG: `pts-cc-mcp` erfordert die installierte `pts-core`-Erweiterung in Ihrem Projekt.**
>
> **Warum ist `pts-core` zwingend erforderlich?**  
> Cocos Creator 3.8+ verwendet eine Multi-Prozess-Architektur, bei der der **Editor-Hauptprozess** (in dem `pts-cc-mcp` ausgeführt wird) vollständig vom **Szenen-Ausführungsprozess** (in dem die Spielszene, Komponenten und die Live-`@ccclass`-Engine-Runtime laufen) getrennt ist.  
>
> `pts-cc-mcp` führt Szenenbefehle über `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })` aus. Das Szenenskript (`src/_cc.js`) wird direkt in `pts-core` gehostet.  
>
> Ohne `pts-core` können Tools, die die Live-Szenen-Runtime erfordern (wie `component_*`, `node_manage`, `scene_manage`, `ui_builder` und `validation_manage`), nicht mit Szenen-Nodes interagieren.

---

## Installation & Einrichtung

### 1. Erweiterungsdateien platzieren
Stellen Sie sicher, dass SOWOHL `pts-core` als auch `pts-cc-mcp` im Verzeichnis `extensions/` Ihres Cocos Creator-Projekts abgelegt sind:

```
IhrProjekt/
├── assets/
├── extensions/
│   ├── pts-core/                  <- ERFORDERLICH: Kern-Engine & Szenenskript-Laufzeit (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- MCP-Server & Tool-Provider
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. Erweiterungen installieren und bauen
```bash
# 1. pts-core einrichten (falls aus dem Quellcode gebaut wird)
cd extensions/pts-core
npm install
npm run build

# 2. pts-cc-mcp einrichten
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Erweiterung in Cocos Creator aktivieren
1. Starten Sie Cocos Creator neu oder laden Sie den Erweiterungs-Manager neu (**Erweiterungen > Erweiterungs-Manager**).
2. Überprüfen Sie, ob sowohl **pts-core** als auch **pts-cc-mcp** aktiviert sind.
3. Klicken Sie auf `Erweiterungen > pTS MCP Server`, um das Bedienfeld zu öffnen.
4. Der Server läuft standardmäßig auf Port `3121` (im Panel konfigurierbar).

---

## Projektstruktur

```
pts-cc-mcp/
├── source/                    # TypeScript-Quelldateien
│   ├── main.ts               # Plugin-Einstiegspunkt & Bootstrap-Prüfung
│   ├── mcp-server.ts         # Streamable HTTP- & SSE-Transportschicht
│   ├── settings.ts           # Einstellungs- & Konfigurationsverwaltung
│   ├── types/                # TypeScript-Typdefinitionen
│   ├── utils/                # Dienstprogramme
│   │   ├── agents-doc-generator.ts # AGENTS.md-Vorlagen- & Synchronisations-Generator
│   │   ├── asset-resolver.ts       # Intelligenter Sub-Asset-UUID-Resolver
│   │   ├── json-utils.ts           # Defensive JSON-Analyse & Reparatur
│   │   └── i18n.ts                 # Mehrsprachige Übersetzungs-Engine
│   ├── tools/                # Subsystem- & einheitliche Tool-Implementierungen
│   │   ├── intent-dispatcher.ts    # Opcode-Router & 16 Intent-APIs
│   │   ├── ui-builder-tools.ts     # Deklarativer One-Shot-UI-Builder
│   │   ├── knowledge-tools.ts      # Offline-Reflexions-Wissensdatenbank
│   │   ├── animation-tools.ts      # AnimationClip- & FBX-Slicing-Editor
│   │   ├── validation-tools.ts     # Szenendiagnose & Regressions-Diffs
│   │   ├── batch-tools.ts          # Atomare Batch-Ausführungs-Engine
│   │   ├── scene-tools.ts          # Szenen-Lifecycle-Management
│   │   ├── node-tools.ts           # Node-Transformations- & Baumoperationen
│   │   ├── component-tools.ts      # Komponentenreflexion & Eigenschafts-Updater
│   │   ├── prefab-tools.ts         # Prefab-Sitzungsstapel & atomare Bearbeitung
│   │   ├── asset-advanced-tools.ts # Asset-Datenbanksuche & -auflösung
│   │   ├── project-tools.ts        # Build- & Vorschau-Ausführung
│   │   ├── debug-tools.ts          # Konsolen-Logs & TS-Compiler-Watcher
│   │   └── preferences-tools.ts    # Verwaltung der Benutzereinstellungen
│   └── panels/               # Vue 3 UI-Panel-Implementierung mit Tool-Tester
├── dist/                     # Kompilierte JavaScript-Ausgabe
├── static/                   # Statische Assets (Icons, Styles, Vorlagen)
├── i18n/                     # Internationalisierungs-Wörterbücher
├── package.json              # Erweiterungsmanifest & Beiträge
└── tsconfig.json             # TypeScript-Build-Konfiguration
```

---

## Lizenz

Dieses Plugin ist Open Source unter der MIT-Lizenz und für die Cocos Creator-Spieleentwicklung konzipiert.
