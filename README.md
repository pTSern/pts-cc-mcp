# Cocos Creator MCP Server Plugin (pts-cc-mcp)

🌐 **English** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

A comprehensive, open-source Model Context Protocol (MCP) server plugin for Cocos Creator 3.8+ that empowers AI coding assistants (Claude CLI, Claude Desktop, Cursor, Windsurf, Antigravity) to inspect, author, validate, and manipulate Cocos Creator games through a standardized protocol.

**🚀 Featuring dual Streamable HTTP & SSE transport, 16 unified intent tools (231 opcodes), declarative 1-shot UI generation, offline reflection knowledge base, timeline keyframe animation authoring, and scene/asset regression snapshot diffing!**

---

## 🙏 Acknowledgments & Credits

This project originated as an open-source fork of [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) created by **LiDaxian**. We express our sincere gratitude and appreciation to **LiDaxian** and all community contributors for laying the foundational architecture and opening the path for AI-driven Cocos Creator development.

`pts-cc-mcp` builds upon this foundation as a community-driven, 100% open-source extension, replacing all closed-source/commercial features with superior open-source equivalents.

---

## 🚀 Version 1.6.0 Changelog: The Unified Pro Architecture

### 1. Dual Streamable HTTP & Server-Sent Events (SSE) Transport (Phase 1)
- Full native support for `@modelcontextprotocol/sdk` Streamable HTTP (`/mcp`) and Server-Sent Events (`/sse` & `/messages`) on port `3121`.
- Per-client isolated session management, keep-alive heartbeat, and CORS headers for modern AI clients.

### 2. Intent-Level Unified Opcode Architecture (Phase 2)
- Replaced 50+ scattered schemas with **16 unified intent tools** covering 231 operations (`action` opcode dispatch).
- Reduces schema token consumption by over 70% in LLM context windows while maintaining backwards compatibility with legacy tool calls.

### 3. Declarative One-Shot UI & Scene Builder (Phase 3)
- `ui_builder`: Construct complex UI graphs (`build_tree`, `create_dialog`, `create_button`, `create_list`) with automatic `UITransform` creation, constraint solving (Widget anchors, Layout margins), and automatic rollback snapshotting on error.

### 4. Embedded Cocos Creator 3.8 Reflection Knowledge Base (Phase 4)
- `knowledge_query`: In-memory architectural rules and `@property` dictionaries for builtin 2D/3D components (`cc.Sprite`, `cc.Label`, `cc.Widget`, `cc.Layout`, `sp.Skeleton`), design resolution guides, and coordinate conversion formulas.
- Automated `AGENTS.md` verification and documentation generator (`get_mcp_guide`, `sync_agents_doc`).

### 5. Timeline Animation & Keyframe Curve Editor (Phase 5)
- `anim_manage`: Direct `.anim` (`cc.AnimationClip`) track authoring with Cubic Bezier / Linear / Constant curve interpolation.
- Animation event triggers, quick motion presets (`bounce_pop`, `fade_in`, `fade_out`, `shake`), and automated multi-take FBX animation take slicing.

### 6. Scene & Asset Diagnostics & Snapshot Diffing (Phase 6)
- `validation_manage`: Sibling name collision detection, missing `UITransform` diagnostics, and deep recursive asset scanner checking scene component `__uuid__` references against `asset-db`.
- SHA-256 scene state snapshotting (`capture_snapshot`) and visual Markdown regression diff tables (`diff_snapshot`).

---

## 🛠️ Unified Intent API Cheatsheet (16 Tools)

| Intent Tool | Key Arguments | Purpose & Best Practice |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | Scene lifecycle, full tree inspection, and scene scripts. |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | Universal node search, creation, transform, and hierarchy manipulation. |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | Add/remove components, deep property updates with auto-save, click binding, and @ccclass reflection. |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | Complete prefab lifecycle, non-destructive editing sessions, and atomic batch edits. |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | Declarative 1-shot UI generation with auto-UITransform, Widget constraints, and Layouts. |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | Timeline AnimationClip editing, property curves, easing modes, animation events, presets, FBX slicing, and AnimGraph state machines. |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | Asset discovery, dependency inspection, and smart sub-asset resolution (`@spriteFrame`, `@texture`). |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | Offline architecture reference for components, coordinates, rules, and live MCP documentation. |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | Automated audit for missing UITransforms, corrupt assets, out-of-bounds nodes, and visual snapshot regression diffing. |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | In-process atomic batch execution running multiple operations in a single IPC transaction. |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | Build settings, preview server control, and TypeScript compilation watcher. |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | Viewport camera manipulation and editor overlays. |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | Rapid one-call Spine skeleton or FastSpine rig setup. |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | Editor console monitoring and performance telemetry. |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | Editor preferences configuration. |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | Editor event monitoring and broadcasting. |

---

## 📖 Standard MCP Workflows

### A. Inspecting Scene or Prefab Graph
* Use `scene_manage(action="inspect")` to inspect scene hierarchy, components, and properties in formatted JSON or Markdown trees.
* Use `scene_manage(action="hierarchy", includeComponents=true)` to list live nodes in the active scene or open prefab.

### B. Modifying Components in Active Scene
* Use `component_manage(action="update")` for deep property updates (`config.sid`, `config.data`), nested `@ccclass` object instantiation, and asset arrays (`onUpdates`, `onChanged`).
* Use `scene_manage(action="save")` to persist scene changes.

### C. Modifying Components / Nodes in Prefabs
* **If Prefab is currently open / being inspected:**
  1. `node_manage(action="query")` to locate target node.
  2. `component_manage(action="add")` (to attach new scripts) or `component_manage(action="update")` (to set data).
  3. `prefab_manage(action="save")` to save.
* **If Prefab is in background (not open):**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")` to locate target node.
  3. `component_manage(action="update")` to apply changes.
  4. `prefab_manage(action="save")`
  5. `prefab_manage(action="exit")`
* Or use atomic edit: `prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. Class Reflection & Types
* Use `component_manage(action="query_class_info")` to inspect `@ccclass` reflection attributes, default values, and `@property` metadata before assigning values.

### E. Declarative UI Generation
* Use `ui_builder(action="build_tree", parent="Canvas", tree={...})` to construct complete UI hierarchies (Panels, Buttons, Labels, Sprites, ScrollViews) with auto-computed UITransforms and Widget constraints in a single atomic call.

### F. Timeline Keyframe Animation & FBX Slicing
* Author `.anim` clips with property curves: `anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`.
* Apply motion presets: `anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`.
* Slice multi-take FBX models: `anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`.

### G. Scene & Asset Diagnostics & Regression Diffing
* Capture baseline scene snapshot before modifications: `validation_manage(action="capture_snapshot", tag="PreEdit")`.
* Compare scene against snapshot after edits: `validation_manage(action="diff_snapshot")`.
* Audit scene hierarchy for layout bugs: `validation_manage(action="check_scene")`.
* Scan project and scene for broken GUID references: `validation_manage(action="check_assets")`.

---

## ⚡ Quick Start

`pts-cc-mcp` defaults to port `3121` with dual transport support: **Streamable HTTP** (`/mcp`) and **Server-Sent Events (SSE)** (`/sse`).

### 1. Claude CLI Configuration

```bash
# Streamable HTTP (Default)
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# Or via Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Claude Desktop Configuration

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

*Or configured with SSE transport:*

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

### 3. Cursor & Windsurf Configuration

In Cursor or Windsurf MCP Settings (`.cursor/mcp.json`):

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

## ⚠️ Prerequisites & Mandatory Peer Dependency

> **IMPORTANT: `pts-cc-mcp` requires the `pts-core` extension installed in your project.**
>
> **Why is `pts-core` mandatory?**  
> Cocos Creator 3.8+ utilizes a multi-process architecture where the **Editor Main Process** (where `pts-cc-mcp` runs) is completely separated from the **Scene Execution Process** (where the game scene, components, and live `@ccclass` engine runtime execute).  
>
> `pts-cc-mcp` executes scene commands by calling `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. The scene script (`src/_cc.js`) is hosted directly inside `pts-core`.  
>
> Without `pts-core`, tools that require the live scene runtime (such as `component_*`, `node_manage`, `scene_manage`, `ui_builder`, and `validation_manage`) cannot interact with scene nodes.

---

## Installation & Setup

### 1. Place Extension Files
Ensure BOTH `pts-core` and `pts-cc-mcp` are placed inside your Cocos Creator project's `extensions/` directory:

```
YourProject/
├── assets/
├── extensions/
│   ├── pts-core/                  <- REQUIRED: Core engine & scene script runtime (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- MCP Server & Tool provider
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. Install & Build Extensions
```bash
# 1. Setup pts-core (if building from source)
cd extensions/pts-core
npm install
npm run build

# 2. Setup pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Enable Extension in Cocos Creator
1. Restart Cocos Creator or reload Extension Manager (**Extensions > Extension Manager**).
2. Verify that both **pts-core** and **pts-cc-mcp** are enabled.
3. Click `Extensions > pTS MCP Server` to open the control panel.
4. The server runs on port `3121` by default (configurable in the panel).

---

## Project Structure

```
pts-cc-mcp/
├── source/                    # TypeScript source files
│   ├── main.ts               # Plugin entry point & bootstrap check
│   ├── mcp-server.ts         # Streamable HTTP & SSE transport layer
│   ├── settings.ts           # Settings & configuration management
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utilities
│   │   ├── agents-doc-generator.ts # AGENTS.md template & sync generator
│   │   ├── asset-resolver.ts       # Smart sub-asset UUID resolver
│   │   ├── json-utils.ts           # Defensive JSON parsing & repair
│   │   └── i18n.ts                 # Multi-language translation engine
│   ├── tools/                # Subsystem & Unified Tool implementations
│   │   ├── intent-dispatcher.ts    # 16 Intent APIs & Opcode Router
│   │   ├── ui-builder-tools.ts     # Declarative 1-shot UI builder
│   │   ├── knowledge-tools.ts      # Offline reflection knowledge base
│   │   ├── animation-tools.ts      # AnimationClip & FBX slicing editor
│   │   ├── validation-tools.ts     # Scene diagnostics & regression diffing
│   │   ├── batch-tools.ts          # Atomic batch execution engine
│   │   ├── scene-tools.ts          # Scene lifecycle management
│   │   ├── node-tools.ts           # Node transform & tree operations
│   │   ├── component-tools.ts      # Component reflection & property updater
│   │   ├── prefab-tools.ts         # Prefab session stack & atomic edit
│   │   ├── asset-advanced-tools.ts # Asset database search & resolution
│   │   ├── project-tools.ts        # Build & preview execution
│   │   ├── debug-tools.ts          # Console logs & TS compiler watcher
│   │   └── preferences-tools.ts    # User settings management
│   └── panels/               # Vue 3 UI panel implementation with Tool Tester
├── dist/                     # Compiled JavaScript output
├── static/                   # Static assets (icons, styles, templates)
├── i18n/                     # Internationalization dictionaries
├── package.json              # Extension manifest & contributions
└── tsconfig.json             # TypeScript build configuration
```

---

## License

This plugin is open-source under the MIT License and designed for Cocos Creator game development.
