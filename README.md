# Cocos Creator MCP Server Plugin (pts-cc-mcp)

🌐 **English** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

A comprehensive, open-source Model Context Protocol (MCP) server plugin for Cocos Creator 3.8+ that empowers AI coding assistants (Claude CLI, Claude Desktop, Cursor, Windsurf, Antigravity) to inspect, author, validate, and manipulate Cocos Creator games through a standardized protocol.

**🚀 Featuring dual Streamable HTTP & SSE transport, 18 unified intent tools (231+ opcodes), ultra-fast headless direct-disk AST engine (<15ms), automated browser testing with Chromium, smart node-based viewport interaction, physics & contact auditing, broken GUID auto-healing, and multi-language support (English, Chinese, Vietnamese)!**

---

## 🙏 Acknowledgments & Credits

Forked from [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) by **LiDaxian**. Sincere thanks to LiDaxian and community contributors for pioneering Cocos Creator MCP integration.

---

## 🚀 Version 1.9.0 Changelog: Headless AST Speed Engine, Tool Pruning & Vietnamese i18n

### 1. Ultra-Fast Direct Disk AST Engine (< 15ms)
- `PrefabAstParser` & `HeadlessEditTools`: Direct file-system mutations on `.scene` and `.prefab` serialized JSON files without opening scenes in the editor viewport.
- Eliminates editor IPC serialization overhead, modal dialog blocking, and 409 Conflict locks.
- Supports single-pass atomic chains (`executeChain`) and glob-based batch multi-file modifications (`batch_edit_headless`).

### 2. Direct-to-Disk Node Search (`find_nodes_headless`)
- `node_manage(action="find_nodes_headless")`: High-speed node discovery from disk AST by substring pattern, exact name, or attached component type (e.g. `cc.BoxCollider2D`, `cc.Sprite`, custom `@ccclass`) in < 15ms.

### 3. Streamlined Registry & Tool Pruning
- Pruned obsolete, broken, and redundant tools (`game-tools.ts`, `server-tools.ts`).
- Fully replaced game simulation stubs with Playwright Chromium driver (`browser_manage`) and in-editor click simulation (`component_manage(action="simulate_click")`).
- Registry automatically purges dead configuration slots upon startup.

### 4. Native Vietnamese Language Support (i18n)
- Added comprehensive Vietnamese translation dictionary (`i18n/vi.js`) and UI language selector option for the control panel and tool tester.

---

## 🚀 Version 1.7.0 Changelog: Deep Diagnostics & Smart Automation

### 1. Automated Physics & Contact Matrix Auditor
- `validation_manage(action="check_physics")`: Recursive prefab/scene auditor scanning Box2D/Builtin colliders, detecting missing `RigidBody2D` components, disabled `enabledContactListener` flags, and sensor collider misconfigurations.

### 2. Smart Node-Based Viewport Automation
- `browser_manage(action="tap_node" | "swipe_nodes" | "load_scene")`: Converts Cocos Creator 2D/3D node world coordinates into DOM screen coordinates via active scene camera (`worldToScreen`), performing high-precision mouse taps, node-to-node swipe gestures, and instant scene loading without coordinates guessing.

### 3. Auto-Activating Profiler & Memory Telemetry
- `debug_manage(action="profiler_snapshot")`: Automatically enables engine profiler if hidden, computes fallback FPS from delta time, reports GPU texture & buffer memory usage, V8 JS heap statistics, and live Box2D active body & contact counts.

### 4. 1-Click Broken Reference Auto-Healer
- `asset_manage(action="repair_broken_references")`: Project-wide scanner & batch healer repairing missing asset GUIDs across `.prefab`, `.scene`, `.pts`, `.json`, and `.anim` assets with bidirectional UUID $\leftrightarrow$ compressed CID expansion and safe `dryRun` simulation mode.

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

## 🛠️ Unified Intent API Cheatsheet (18 Tools)

| Intent Tool | Key Arguments | Purpose & Best Practice |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create" \| "inspect_headless" \| "edit_headless"`, `scenePath`, `targetFile`, `chain` | Scene lifecycle, full tree inspection, scene scripts, and direct fs headless scene inspection/editing. |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent" \| "find_nodes" \| "find_nodes_headless" \| "create_headless" \| "delete_headless" \| "transform_headless" \| "reparent_headless" \| "edit_headless"`, `targetFile`, `nodeUuid`, `nodePath`, `position`, `size` | Universal node search, creation, transform, hierarchy manipulation, and direct fs headless editing. |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info" \| "add_headless" \| "remove_headless" \| "update_headless" \| "edit_headless"`, `targetFile`, `nodeUuid`, `nodePath`, `componentType`, `properties` | Add/remove components, deep property updates with auto-save, click binding, @ccclass reflection, and direct fs headless component authoring. |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit" \| "diff" \| "inspect_headless" \| "batch_edit_headless" \| "edit_headless"`, `prefabPath`, `targetFile`, `files`, `operations` | Complete prefab lifecycle, non-destructive editing sessions, atomic batch edits, headless diff, offline inspection, and batch headless edits. |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list" \| "build_tree_headless"`, `targetFile`, `tree`, `parent` | Declarative 1-shot UI generation with auto-UITransform, Widget constraints, Layouts, and headless disk output. |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | Timeline AnimationClip editing, property curves, easing modes, animation events, presets, FBX slicing, and AnimGraph state machines. |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies" \| "trace_references" \| "repair_broken_references"`, `folder`, `assetPath`, `target`, `replacementMap` | Asset discovery, dependency inspection, smart sub-asset resolution (`@spriteFrame`, `@texture`), bidirectional reference tracing, and broken GUID auto-healing. |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | Offline architecture reference for components, coordinates, rules, and live MCP documentation. |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "check_physics" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `target` | Automated audit for missing UITransforms, corrupt assets, out-of-bounds nodes, disabled physics contact listeners, and visual snapshot regression diffing. |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | In-process atomic batch execution running multiple operations in a single IPC transaction. |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | Build settings, preview server control, and TypeScript compilation watcher. |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | Viewport camera manipulation and editor overlays. |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | Rapid one-call Spine skeleton or FastSpine rig setup. |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats" \| "profiler_snapshot"` | Editor console monitoring, performance telemetry, and live runtime FPS/draw call profiler snapshots with memory metrics. |
| **`preferences_manage`** | `action: "open_panel" \| "get_config" \| "set_config" \| "reset_config"`, `category`, `path`, `value` | Editor preferences and configuration management. |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history" \| "clear"`, `channel`, `data` | Editor/Scene broadcast event bus for pub/sub telemetry. |
| **`nexus_manage`** | `action: "get_tree_graph" \| "list_scenes" \| "list_workflows" \| "scan_network" \| "query_event" \| "generate_html" \| "batch_query"`, `type`, `target`, `folder`, `pattern` | Tree graph query engine for scene node hierarchies with workflows, function execution pipelines, and mass multi-prefab property queries. |
| **`browser_manage`** | `action: "status" \| "launch" \| "navigate" \| "tap" \| "swipe" \| "tap_node" \| "swipe_nodes" \| "load_scene" \| "eval" \| "screenshot" \| "get_logs" \| "close"`, `url`, `nodePath`, `startNode`, `endNode`, `scene` | End-to-end automated browser game testing with Playwright Chromium: smart node-based taps/swipes, scene loading, JS eval, and telemetry. |

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
* Audit colliders and contact listeners: `validation_manage(action="check_physics", target="db://assets/game")`.
* Scan project and scene for broken GUID references: `validation_manage(action="check_assets")`.

### H. Querying Scene Flow & Function Architecture Trees (Nexus)
* Query complete scene node hierarchy with attached components & `(Workflow)` triggers:
  `nexus_manage(action="get_tree_graph", target="fast_test.scene", format="ascii")` or `scene_manage(action="tree_graph", scenePath="fast_test.scene")`.
* Query execution pipeline call graphs (GitNexus style):
  `nexus_manage(action="get_tree_graph", type="workflow", target="pipe_...")`.
* Query all indexed scenes or execution pipelines:
  `nexus_manage(action="list_scenes")` / `nexus_manage(action="list_workflows")`.
* Query JsonAsset & pTSAsset event networks:
  `nexus_manage(action="query_event", eventNameOrUuid="Event.UI.onOpenHomeScreen.json")`.

### I. Automated Browser Gameplay Testing (Playwright Chromium)
* Launch preview browser and wait for Cocos engine: `browser_manage(action="launch", url="http://127.0.0.1:7456")`.
* Tap UI button or canvas position: `browser_manage(action="tap", x=640, y=360)`.
* Tap UI node via world/screen conversion: `browser_manage(action="tap_node", nodePath="Canvas/StartBtn")`.
* Perform swipe between two nodes: `browser_manage(action="swipe_nodes", startNode=".../BlockA", endNode=".../BlockB")`.
* Switch scene directly: `browser_manage(action="load_scene", scene="game")`.
* Perform swipe/drag gesture: `browser_manage(action="swipe", startX=300, startY=400, endX=600, endY=400)`.
* Execute runtime JS query: `browser_manage(action="eval", code="cc.director.getScene().name")`.
* Capture screenshot for visual inspection: `browser_manage(action="screenshot")`.
* Check runtime logs & console errors: `browser_manage(action="get_logs")`.
* Close browser session: `browser_manage(action="close")`.

### J. Headless Prefab Manipulation, Asset Tracing & Reference Repair
* Compare two prefabs side-by-side without editor canvas: `prefab_manage(action="diff", sourcePrefab="db://assets/...", targetPrefab="db://assets/...")`.
* Deep offline inspect of node hierarchy & components: `prefab_manage(action="inspect_headless", prefabPath="db://assets/...", resolveReferences=true)`.
* Batch extract properties across multi-prefabs in parallel: `nexus_manage(action="batch_query", folder="db://assets/...", pattern="*.prefab", queries=[{ extract: ["position", "components"] }])`.
* Bidirectional reference tracer: `asset_manage(action="trace_references", target="db://assets/...")`.
* 1-Click batch reference healer: `asset_manage(action="repair_broken_references", targetPath="db://assets", replacementMap={"broken-uuid": "new-uuid"})`.
* Multi-prefab headless modification: `prefab_manage(action="batch_edit_headless", files=["db://assets/..."], operations=[...], dryRun=true)`.
* Live game profiler telemetry: `debug_manage(action="profiler_snapshot", samples=3)`.

### K. Fast Headless Direct-to-Disk Editing (Bypass Editor Viewport)
* Inspect scene without opening editor canvas: `scene_manage(action="inspect_headless", scenePath="db://assets/scenes/Game.scene")`.
* Search nodes headlessly from disk AST: `node_manage(targetFile="db://assets/scenes/Game.scene", action="find_nodes_headless", pattern="Enemy", component="cc.Sprite")`.
* Create node headlessly: `node_manage(targetFile="db://assets/scenes/Game.scene", action="create_headless", name="Enemy", parentPath="Canvas", position={x: 100, y: 50})`.
* Add component headlessly: `component_manage(targetFile="db://assets/scenes/Game.scene", nodePath="Canvas/Enemy", action="add_headless", componentType="cc.RigidBody2D", properties={enabledContactListener: true})`.
* Update component headlessly: `component_manage(targetFile="db://assets/prefabs/Hero.prefab", nodePath="Weapon", action="update_headless", componentType="WeaponController", properties={damage: 100})`.
* Execute chain of operations in 1 atomic pass: `scene_manage(action="edit_headless", scenePath="db://assets/scenes/Game.scene", chain=[{ action: "create_node", name: "Star", parentPath: "Canvas" }, { action: "add_component", nodePath: "Canvas/Star", componentType: "cc.Sprite" }])`.
* Build complete UI tree headlessly: `ui_builder(action="build_tree_headless", targetFile="db://assets/scenes/Game.scene", parent="Canvas", tree={...})`.

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
