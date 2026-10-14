# Cocos Creator MCP Server Plugin

🌐 **English** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

A comprehensive MCP (Model Context Protocol) server plugin for Cocos Creator 3.8+ that lets AI assistants interact with the Cocos Creator editor through a standardized protocol. One-click installation and use — no tedious environment setup or configuration required. Tested with Claude desktop client, Claude CLI, Cursor, and Windsurf; other MCP-compatible editors work seamlessly as well.

**🚀 Now featuring unified tool architecture, atomic batch execution, and native animation graph support for 99% editor control!**

## 🙏 Acknowledgments & Credits

This project originated as an open-source fork of [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) created by **LiDaxian**. We express our sincere gratitude and appreciation to **LiDaxian** and all community contributors for laying the foundational architecture and opening the path for AI-driven Cocos Creator development.

`pts-cc-mcp` builds upon this foundation as a fully open-source, community-driven extension with:
- **100% English Codebase** with multi-language i18n localization support
- **In-process Atomic Batch Execution Engine** (`batch_execute` / `editor_batch_execute`)
- **Native Animation Graph** (`.animgraph`) state machine inspection & editing
- **Safe Prefab Session Stack** with auto-recovery eliminating scene-exit crashes
- **Smart Recursive Asset Resolver** (`@spriteFrame`, `@texture`, raw paths, UUIDs)
- **Spine & FastSpine** automated character rig setup
- **TypeScript Compiler Watcher** (`compile_status`) eliminating script compilation race conditions

## Open-Source Version Changelog

## 🚀 Major Update v1.5.4

- **In-Process Atomic Batch Execution (`batch_execute` / `editor_batch_execute`)**: Run multiple tool operations in a single sequential in-process IPC transaction. Drastically reduces HTTP round-trips and token consumption, supporting `stopOnError` and automatic scene/prefab saving.
- **Animation Graph Engine (`animgraph_manage`)**: Native inspection and modification of `.animgraph` files. Inspect state machines, states, transitions, and parameters; attach, update, or remove `StateMachineComponent`s; and bulk migrate component class types with automatic asset database synchronization.
- **Prefab Session Stack & Safe Recovery**: Tracks active scene URL/UUID on `enter`, auto-restores previous scene on `exit`, and searches project scenes if missing — completely eliminating `"Target scene does not exist"` crashes. Includes `atomic_edit` for seamless enter $\to$ edit $\to$ save $\to$ exit cycles.
- **Smart Asset & Sub-Asset Resolver (`asset_query(action="resolve")`)**: Automatically resolves raw paths, UUIDs, and sub-assets (`@spriteFrame` $\to$ `@f9941`, `@texture` $\to$ `@6c48a`). Fully integrated into `set_component_property` and `update_component` for deep automatic resolution.
- **Spine & FastSpine Setup Helper (`spine_setup`)**: Rapid one-call character rig initialization. Attaches `FastSpine` or `sp.Skeleton`, binds skeleton data asset, configures default animation, loop mode, and synchronizes UITransform.
- **Compiler Watcher (`compile_status`) & Defensive Defaults**: Monitor and await Cocos Creator TypeScript/JavaScript compilation completion to eliminate race conditions after editing scripts. Added defensive defaults across debug and server tools with clear guidance on unknown actions.
- **100% English Codebase & Full i18n Architecture**: Standardized all extension source code, comments, error messages, and logs to professional English with seamless multi-language i18n localization support.

---

## Tool System & Opcodes

- All tools are named using a "category_operation" convention, with parameters following a unified schema and support for switching between multiple opcodes (`action`), greatly improving flexibility and extensibility.
- Comprehensive coverage across scenes, nodes, components, prefabs, assets, animation graphs, batch transactions, projects, debugging, preferences, server status, and message broadcasting.
- Example tool call:

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

## Main Feature Categories

- **batch_execute / editor_batch_execute**: Atomic batch execution engine running multiple tool operations in a single IPC transaction
- **animgraph_manage**: Native `.animgraph` inspection, state machine transitions, and component CRUD
- **scene_management / scene_hierarchy**: Scene lifecycle (get/open/save/create/close) and hierarchy trees
- **node_query / node_lifecycle / node_transform**: Node search, creation, deletion, hierarchy, and transforms
- **component_manage / set_component_property / spine_setup**: Component lifecycle, property setter, and FastSpine rig setup
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit**: Prefab management, instantiation, session stack, and atomic editing
- **asset_manage / asset_analyze / asset_query**: Asset CRUD, dependency tracing, and smart sub-asset resolution
- **debug_console / debug_logs / compile_status**: Console monitoring, project log search, and TS compiler watcher
- **project_manage / project_build_system**: Project execution, build panel control, and preview server
- **preferences_manage**: Editor preferences management
- **server_information / server_connectivity**: Server IP list, port inspection, and connectivity diagnostics
- **broadcast_log_management / broadcast_listener_management**: Editor event monitoring and broadcasting

---

## Quick Start

**Claude CLI Configuration:**

```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Claude Desktop Configuration:**

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

**Cursor or VS Code MCP Configuration:**

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

## ⚠️ Read Before Installing (Important)

> **Before installing for the first time or upgrading, please delete `mcp-server.json` and `tool-manager.json` under your project's `settings/` directory, otherwise tool list caching may cause display issues!**
>
> File paths: `<Project>/settings/mcp-server.json` and `<Project>/settings/tool-manager.json`
> Reopening the extension panel after deleting these two files will re-sync all tools cleanly.

## Installation

### 1. Copy Plugin Files

Copy the `pts-cc-mcp` folder into your Cocos Creator project's `extensions` directory:

```
YourProject/
├── assets/
├── extensions/
│   └── pts-cc-mcp/                <- Place plugin here
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. Install Dependencies

```bash
cd extensions/pts-cc-mcp
npm install
```

### 3. Build Plugin

```bash
npm run build
```

### 4. Enable Plugin

1. Restart Cocos Creator or reload Extension Manager
2. The plugin will appear in the Extensions menu
3. Click `Extensions > pTS MCP Server` to open the control panel

---

## Development

### Project Structure
```
pts-cc-mcp/
├── source/                    # TypeScript source files
│   ├── main.ts               # Plugin entry point
│   ├── mcp-server.ts         # MCP server implementation
│   ├── settings.ts           # Settings management
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utilities (asset resolver, schema compat, json utils)
│   ├── tools/                # Tool implementations
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
│   ├── panels/               # UI panel implementation
│   └── test/                 # Test files
├── dist/                     # Compiled JavaScript output
├── static/                   # Static assets (icons, etc.)
├── i18n/                     # Internationalization files
├── package.json              # Plugin configuration
└── tsconfig.json             # TypeScript configuration
```

### Building from Source

```bash
# Watch mode for development
npm run watch

# Production build
npm run build
```

---

## System Requirements

- Cocos Creator 3.8.6 or higher
- Node.js (bundled with Cocos Creator)
- TypeScript (installed as dev dependency)

## License

This plugin is designed for Cocos Creator projects with full source code included for learning and development.
