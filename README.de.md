# Cocos Creator MCP Server-Plugin

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · **Deutsch** · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Ein umfassendes MCP-(Model Context Protocol-)Server-Plugin für Cocos Creator 3.8+, das es KI-Assistenten ermöglicht, über ein standardisiertes Protokoll mit dem Cocos Creator Editor zu interagieren. Ein-Klick-Installation und -Nutzung – keine mühsame Einrichtung oder Konfiguration der Umgebung erforderlich. Getestet mit dem Claude Desktop-Client, Claude CLI, Cursor und Windsurf; andere MCP-kompatible Editoren funktionieren ebenfalls nahtlos.

**🚀 Jetzt mit vereinheitlichter Tool-Architektur, atomarer Batch-Ausführung und nativem Animation-Graph-Support für 99 % Editor-Kontrolle!**

## 🙏 Danksagungen und Anerkennung (Acknowledgments & Credits)

Dieses Projekt entstand als Open-Source-Fork von [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server), erstellt von **LiDaxian**. Wir sprechen **LiDaxian** und allen Mitwirkenden aus der Community unseren aufrichtigen Dank und unsere Anerkennung dafür aus, dass sie die fundamentale Architektur geschaffen haben, die die KI-gestützte Entwicklung in Cocos Creator ermöglicht hat.

`pts-cc-mcp` führt diese Mission als quelloffenes Community-Projekt fort und bietet standardmäßig:
- **100 % englische Codebasis** mit vollständiger mehrsprachiger i18n-Lokalisierung
- **Prozessinterne atomare Batch-Ausführung** (`batch_execute` / `editor_batch_execute`)
- **Native Animation-Graph-Zustandsautomaten-Bearbeitung** (`animgraph_manage`)
- **Sicherer Prefab-Sitzungsstapel** mit automatischer Wiederherstellung gegen Abstürze
- **Intelligenter rekursiver Asset- und Sub-Asset-Resolver** (`@spriteFrame`, `@texture`, Pfade, UUIDs)
- **Automatisiertes Setup für Spine- und FastSpine-Charakter-Rigs**
- **TypeScript-Compiler-Statusüberwachung** (`compile_status`) zur Beseitigung von Race Conditions

## Änderungsprotokoll der Open-Source-Version

## 🚀 Wichtiges Update v1.5.4

- **Prozessinterne atomare Batch-Ausführung (`batch_execute` / `editor_batch_execute`)**: Führt mehrere Tool-Operationen in einer einzigen sequenziellen prozessinternen IPC-Transaktion aus. Reduziert HTTP-Roundtrips und Token-Verbrauch drastisch, mit Unterstützung für `stopOnError` und automatisches Speichern von Szenen/Prefabs.
- **Animation-Graph-Engine (`animgraph_manage`)**: Native Inspektion und Änderung von `.animgraph`-Dateien. Zustandsautomaten, Zustände, Übergänge und Parameter untersuchen; `StateMachineComponent`s anhängen, aktualisieren oder entfernen; sowie Massenmigration von Komponentenklassen mit automatischer Synchronisierung der Asset-Datenbank.
- **Prefab-Sitzungsstapel und sichere Wiederherstellung**: Speichert die aktive Szenen-URL/UUID beim Betreten (`enter`), stellt die vorherige Szene beim Verlassen (`exit`) automatisch wieder her und sucht im Projekt nach gültigen Szenen, falls keine gefunden wird – verhindert Abstürze durch `"Target scene does not exist"` vollständig. Enthält `atomic_edit` für nahtlose Zyklen aus Betreten $\to$ Bearbeiten $\to$ Speichern $\to$ Verlassen.
- **Intelligente Asset- und Sub-Asset-Auflösung (`asset_query(action="resolve")`)**: Löst Rohpfade, UUIDs und Sub-Assets (`@spriteFrame` $\to$ `@f9941`, `@texture` $\to$ `@6c48a`) automatisch auf. Vollständig in `set_component_property` und `update_component` für eine tiefgehende rekursive automatische Auflösung integriert.
- **Spine- und FastSpine-Setup-Helfer (`spine_setup`)**: Schnelle Rig-Initialisierung von Charakteren mit nur einem Aufruf. Hängt `FastSpine` oder `sp.Skeleton` an, bindet das Skelettdaten-Asset, konfiguriert die Standardanimation, den Loop-Modus und synchronisiert den UITransform.
- **Compiler-Watcher (`compile_status`) und defensive Standardwerte**: Überwacht und wartet auf den Abschluss der TypeScript/JavaScript-Kompilierung von Cocos Creator, um Race Conditions nach der Bearbeitung von Skripten auszuschließen. Defensive Standardwerte für alle Debug- und Server-Tools mit klarer Benutzerführung bei unbekannten Aktionen hinzugefügt.
- **100 % englische Codebasis und vollständige i18n-Architektur**: Sämtlicher Quellcode der Erweiterung, Kommentare, Fehlermeldungen und Logs wurden auf professionelles Englisch standardisiert, mit nativer mehrsprachiger i18n-Lokalisierungsunterstützung.

---

## Tool-System und Operationscodes

- Alle Tools sind nach der Konvention „Kategorie_Operation" benannt, verwenden ein einheitliches Schema für Parameter und unterstützen den Wechsel zwischen mehreren Operationscodes (`action`), was Flexibilität und Erweiterbarkeit enorm verbessert.
- Umfassende Abdeckung aller Editor-Bereiche: Szenen, Nodes, Komponenten, Prefabs, Assets, Animationsgraphen, Batch-Transaktionen, Projekte, Debugging, Einstellungen, Server-Status und Nachrichten-Broadcasting.
- Beispiel für einen Tool-Aufruf:

```json
{
  "tool": "batch_execute",
  "arguments": {
    "operations": [
      {
        "tool": "node_node_transform",
        "args": { "nodeUuid": "node-uuid", "position": { "x": 100, "y": 50 } }
      },
      {
        "tool": "component_set_component_property",
        "args": {
          "nodeUuid": "node-uuid",
          "componentType": "cc.Sprite",
          "property": "spriteFrame",
          "propertyType": "spriteFrame",
          "value": "db://assets/textures/hero.png@spriteFrame"
        }
      }
    ],
    "autoSave": true
  }
}
```

---

## Hauptfunktionskategorien

- **batch_execute / editor_batch_execute**: Atomare Batch-Ausführungs-Engine, die mehrere Tool-Operationen in einer einzigen IPC-Transaktion ausführt
- **animgraph_manage**: Native Inspektion von `.animgraph`, Übergänge in Zustandsautomaten und Komponenten-CRUD
- **scene_management / scene_hierarchy**: Szenen-Lebenszyklus (Abrufen/Öffnen/Speichern/Erstellen/Schließen) und Hierarchiebäume
- **node_query / node_lifecycle / node_transform**: Node-Suche, -Erstellung, -Löschung, Hierarchie und Transformationen
- **component_manage / set_component_property / spine_setup**: Komponenten-Lebenszyklus, strenge Eigenschaftszuweisung und FastSpine-Setup
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit**: Prefab-Verwaltung, Instanziierung, Sitzungsstapel und atomare Bearbeitung
- **asset_manage / asset_analyze / asset_query**: Asset-CRUD, Abhängigkeitsverfolgung und intelligente Sub-Asset-Auflösung
- **debug_console / debug_logs / compile_status**: Konsolenüberwachung, Projekt-Log-Suche und TS-Compiler-Watcher
- **project_manage / project_build_system**: Projektausführung, Build-Panel-Steuerung und Vorschau-Server
- **preferences_manage**: Verwaltung der Editor-Einstellungen
- **server_information / server_connectivity**: Server-IP-Liste, Port-Inspektion und Konnektivitätsdiagnose
- **broadcast_log_management / broadcast_listener_management**: Editor-Ereignisüberwachung und Nachrichten-Broadcasting

---

## Schnellstart

**Claude CLI-Konfiguration:**

```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Claude Desktop-Konfiguration:**

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

**Cursor- oder VS Code MCP-Konfiguration:**

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

---

## ⚠️ Vor der Installation lesen (Wichtig)

> **Bitte löschen Sie vor der Erstinstallation oder einem Upgrade unbedingt die beiden Dateien `mcp-server.json` und `tool-manager.json` im Verzeichnis `settings/` Ihres Projekts, da sonst Zwischenspeicherungen der Tool-Liste zu Anzeigeproblemen führen können!**
>
> Dateipfade: `<Projekt>/settings/mcp-server.json` und `<Projekt>/settings/tool-manager.json`
> Wenn Sie das Erweiterungs-Panel nach dem Löschen dieser beiden Dateien erneut öffnen, werden alle Tools sauber neu synchronisiert.

## Installation

### 1. Plugin-Dateien kopieren

Kopieren Sie den Ordner `pts-cc-mcp` in das Verzeichnis `extensions` Ihres Cocos Creator Projekts:

```
IhrProjekt/
├── assets/
├── extensions/
│   └── pts-cc-mcp/                <- Plugin hier ablegen
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. Abhängigkeiten installieren

```bash
cd extensions/pts-cc-mcp
npm install
```

### 3. Plugin kompilieren

```bash
npm run build
```

### 4. Plugin aktivieren

1. Starten Sie Cocos Creator neu oder aktualisieren Sie den Erweiterungs-Manager
2. Das Plugin erscheint im Menü Erweiterungen
3. Klicken Sie auf `Erweiterungen > pTS MCP Server`, um das Bedienfeld zu öffnen

---

## Entwicklung

### Projektstruktur
```
pts-cc-mcp/
├── source/                    # TypeScript-Quelldateien
│   ├── main.ts               # Haupteinstiegspunkt des Plugins
│   ├── mcp-server.ts         # MCP-Server-Implementierung
│   ├── settings.ts           # Einstellungsverwaltung
│   ├── types/                # TypeScript-Typdefinitionen
│   ├── utils/                # Dienstprogramme (Asset-Resolver, Schema-Kompatibilität, JSON-Utils)
│   ├── tools/                # Tool-Implementierungen
│   │   ├── animgraph-tools.ts
│   │   ├── batch-tools.ts
│   │   ├── scene-tools.ts
│   │   ├── node-tools.ts
│   │   ├── component-tools.ts
│   │   ├── prefab-tools.ts
│   │   ├── project-tools.ts
│   │   ├── debug-tools.ts
│   │   ├── preferences-tools.ts
│   │   ├── server-tools.ts
│   │   ├── broadcast-tools.ts
│   │   ├── scene-view-tools.ts
│   │   ├── reference-image-tools.ts
│   │   └── asset-advanced-tools.ts
│   ├── panels/               # UI-Panel-Implementierung
│   └── test/                 # Testdateien
├── dist/                     # Kompilierte JavaScript-Ausgabe
├── static/                   # Statische Ressourcen (Icons usw.)
├── i18n/                     # Internationalisierungsdateien
├── package.json              # Plugin-Konfiguration
└── tsconfig.json             # TypeScript-Konfiguration
```

### Aus dem Quellcode bauen

```bash
# Entwicklungs-Überwachungsmodus (Watch)
npm run watch

# Produktions-Build
npm run build
```

---

## Systemanforderungen

- Cocos Creator 3.8.6 oder höher
- Node.js (in Cocos Creator integriert)
- TypeScript (als Entwicklungsabhängigkeit installiert)

## Lizenz

Dieses Plugin ist für Cocos Creator-Projekte gedacht und enthält den vollständigen Quellcode zu Lern- und Entwicklungszwecken.
