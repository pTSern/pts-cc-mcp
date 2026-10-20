/**
 * Utility to generate standard AGENTS.md and MCP tool documentation snippets for Cocos Creator AI agents
 */

export const MCP_DOC_NOTICE = `> [!IMPORTANT]
> **AI Agent Self-Check Instruction (Mandatory)**:
> Check if this \`AGENTS.md\` file contains the complete explanation of the \`pts-cc-mcp\` tools (all 18 Unified Intent APIs, parameters, and workflows).
> - **If YES (Already Present)**: Proceed directly with your tasks using the MCP tools as documented below.
> - **If NO (Missing or Incomplete)**: Call the MCP tool \`knowledge_query(action="get_mcp_guide")\` to fetch the complete MCP tools explanation, and write/append it to this \`AGENTS.md\` file immediately before proceeding!`;

export function generateMcpToolExplanationSnippet(): string {
    return `## 🛠️ Cocos Creator MCP Integration (pts-cc-mcp)

### 1. Mandatory Rule: Prefer MCP for Cocos Creator Editor Interactions

Whenever you need to inspect, query, create, modify, or save Cocos Creator **Scenes**, **Nodes**, **Components**, **Prefabs**, or **Assets**:
**YOU MUST USE MCP TOOLS TO INTERACT WITH THE COCOS CREATOR EDITOR IF POSSIBLE.**

#### Definition of "If Possible":
Before performing any manual file editing on \`.scene\` or \`.prefab\` assets:
1. **Tool Existence:** Check if MCP tools for \`pts-cc-mcp\` (or \`cocos-creator\`) are registered in your active toolset.
2. **Server Connectivity:** Verify the MCP server is running and reachable (e.g. calling \`scene_manage\` or \`node_manage\`).
3. **Decision Rule:**
   * **If MCP is Available & Reachable:** Perform all Scene, Node, Component, and Prefab operations strictly via the Cocos Creator MCP tools. **NEVER manually edit \`.scene\` or \`.prefab\` JSON files directly if MCP is available.**
   * **If MCP is Offline / Unavailable:** Only then fallback to programmatic scripts or careful file edits.

---

### 2. Available Cocos MCP Tools Cheatsheet (Unified Intent API)

| Intent Tool | Key Arguments | Purpose & Best Practice |
| :--- | :--- | :--- |
| **\`scene_manage\`** | \`action: "get_current" \\| "hierarchy" \\| "inspect" \\| "open" \\| "save" \\| "create"\`, \`includeComponents: true\` | Scene lifecycle, full tree inspection, and scene scripts. |
| **\`node_manage\`** | \`action: "query" \\| "create" \\| "delete" \\| "duplicate" \\| "transform" \\| "reparent"\`, \`nodeUuid\`, \`position\`, \`size\`, \`queryType\` | Universal node search, creation, transform, and hierarchy manipulation. |
| **\`component_manage\`** | \`action: "add" \\| "remove" \\| "get" \\| "update" \\| "bind_event" \\| "query_class_info"\`, \`nodeUuid\`, \`componentType\`, \`properties\` | Add/remove components, deep property updates with auto-save, click binding, and @ccclass reflection. |
| **\`prefab_manage\`** | \`action: "list" \\| "info" \\| "validate" \\| "enter" \\| "exit" \\| "save" \\| "instantiate" \\| "atomic_edit" \\| "diff" \\| "inspect_headless" \\| "batch_edit_headless"\`, \`prefabPath\`, \`nodeUuid\` | Complete prefab lifecycle, non-destructive editing sessions, atomic batch edits, headless diff, offline inspection, and batch headless edits. |
| **\`ui_builder\`** | \`action: "build_tree" \\| "create_dialog" \\| "create_button" \\| "create_list"\`, \`tree\`, \`parent\` | Declarative 1-shot UI generation with auto-UITransform, Widget constraints, and Layouts. |
| **\`anim_manage\`** | \`action: "clip_inspect" \\| "clip_create" \\| "clip_add_track" \\| "clip_add_keyframe" \\| "clip_apply_preset" \\| "slice_fbx" \\| "graph_inspect"\`, \`animPath\`, \`property\`, \`time\`, \`value\` | Timeline AnimationClip editing, property curves, easing modes, animation events, presets, FBX slicing, and AnimGraph state machines. |
| **\`asset_manage\`** | \`action: "query" \\| "resolve" \\| "import" \\| "delete" \\| "dependencies" \\| "trace_references"\`, \`folder\`, \`assetPath\`, \`target\` | Asset discovery, dependency inspection, smart sub-asset resolution (\`@spriteFrame\`, \`@texture\`), and bidirectional reference tracing. |
| **\`knowledge_query\`** | \`action: "query_component" \\| "query_rules" \\| "query_layout_patterns" \\| "get_mcp_guide" \\| "list_topics"\`, \`className\`, \`topic\` | Offline architecture reference for components, coordinates, rules, and live MCP documentation. |
| **\`validation_manage\`**| \`action: "check_scene" \\| "check_assets" \\| "check_viewport" \\| "capture_snapshot" \\| "diff_snapshot" \\| "list_snapshots" \\| "restore_snapshot"\`, \`threshold\`, \`tag\`, \`snapshotId\` | Automated audit for missing UITransforms, corrupt assets, out-of-bounds nodes, and visual snapshot regression diffing. |
| **\`batch_execute\`** | \`operations: [{ tool, args }]\`, \`autoSave: true\` | In-process atomic batch execution running multiple operations in a single IPC transaction. |
| **\`project_manage\`** | \`action: "get_info" \\| "build" \\| "run" \\| "compile_watch"\` | Build settings, preview server control, and TypeScript compilation watcher. |
| **\`scene_view_control\`**| \`action: "camera_focus" \\| "camera_view" \\| "grid_toggle" \\| "gizmo_mode"\`, \`nodeUuid\`, \`viewMode\` | Viewport camera manipulation and editor overlays. |
| **\`spine_manage\`** | \`action: "setup_rig" \\| "query_animations" \\| "set_animation"\`, \`nodeUuid\`, \`spineAssetPath\`, \`defaultAnimation\` | Rapid one-call Spine skeleton or FastSpine rig setup. |
| **\`debug_manage\`** | \`action: "get_logs" \\| "search_logs" \\| "get_stats" \\| "profiler_snapshot"\` | Editor console monitoring, performance telemetry, and live runtime FPS/draw call profiler snapshots. |
| **\`preferences_manage\`** | \`action: "open_panel" \\| "get_config" \\| "set_config" \\| "reset_config"\`, \`category\`, \`path\`, \`value\` | Editor preferences and configuration management. |
| **\`broadcast_manage\`** | \`action: "subscribe" \\| "emit" \\| "history" \\| "clear"\`, \`channel\`, \`data\` | Editor/Scene broadcast event bus for pub/sub telemetry. |
| **\`nexus_manage\`** | \`action: "get_tree_graph" \\| "list_scenes" \\| "list_workflows" \\| "scan_network" \\| "query_event" \\| "generate_html" \\| "batch_query"\`, \`type\`, \`target\`, \`folder\`, \`pattern\` | Tree graph query engine for scene node hierarchies with workflows, function execution pipelines, and mass multi-prefab property queries. |
| **\`browser_manage\`** | \`action: "status" \\| "launch" \\| "navigate" \\| "tap" \\| "swipe" \\| "eval" \\| "screenshot" \\| "get_logs" \\| "close"\`, \`url\`, \`x\`, \`y\`, \`code\` | End-to-end automated browser game testing with Playwright Chromium: canvas taps, drags, JS eval, screenshots, and logs. |

---

### 3. Server Endpoints & Transports

- **Streamable HTTP Endpoint**: \`http://127.0.0.1:3121/mcp\` (Preferred JSON-RPC 2.0 transport)
- **SSE Endpoint**: \`http://127.0.0.1:3121/sse\`
- **Health Telemetry**: \`http://127.0.0.1:3121/health\`

---

### 4. Standard MCP Workflows

#### A. Inspecting Scene or Prefab Graph
* Use \`scene_manage(action="inspect")\` to inspect scene hierarchy, components, and properties in formatted JSON or Markdown trees.
* Use \`scene_manage(action="hierarchy", includeComponents=true)\` to list live nodes in the active scene or open prefab.

#### B. Modifying Components in Active Scene
* Use \`component_manage(action="update")\` for deep property updates (\`config.sid\`, \`config.data\`), nested \`@ccclass\` object instantiation, and asset arrays (\`onUpdates\`, \`onChanged\`).
* Use \`scene_manage(action="save")\` to persist scene changes.

#### C. Modifying Components / Nodes in Prefabs
* **If Prefab is currently open / being inspected:**
  1. \`node_manage(action="query")\` to locate target node.
  2. \`component_manage(action="add")\` (to attach new scripts) or \`component_manage(action="update")\` (to set data).
  3. \`prefab_manage(action="save")\` to save.
* **If Prefab is in background (not open):**
  1. \`prefab_manage(action="enter", prefabPath="db://assets/...")\`
  2. \`scene_manage(action="hierarchy")\` / \`node_manage(action="query")\` to locate target node.
  3. \`component_manage(action="update")\` to apply changes.
  4. \`prefab_manage(action="save")\`
  5. \`prefab_manage(action="exit")\`
* Or use atomic edit: \`prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])\`

#### D. Class Reflection & Types
* Use \`component_manage(action="query_class_info")\` to inspect \`@ccclass\` reflection attributes, default values, and \`@property\` metadata before assigning values.

#### E. Declarative UI Generation
* Use \`ui_builder(action="build_tree", parent="Canvas", tree={...})\` to construct complete UI hierarchies (Panels, Buttons, Labels, Sprites, ScrollViews) with auto-computed UITransforms and Widget constraints in a single atomic call.

#### F. Timeline Keyframe Animation & FBX Slicing
* Author \`.anim\` clips with property curves: \`anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])\`.
* Apply motion presets: \`anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")\`.
* Slice multi-take FBX models: \`anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])\`.

#### G. Scene & Asset Diagnostics & Regression Diffing
* Capture baseline scene snapshot before modifications: \`validation_manage(action="capture_snapshot", tag="PreEdit")\`.
* Compare scene against snapshot after edits: \`validation_manage(action="diff_snapshot")\`.
* Audit scene hierarchy for layout bugs: \`validation_manage(action="check_scene")\`.
* Scan project and scene for broken GUID references: \`validation_manage(action="check_assets")\`.

#### H. Querying Scene Flow & Function Architecture Trees (Nexus)
* Query complete scene node hierarchy with attached components & \`(Workflow)\` triggers:
  \`nexus_manage(action="get_tree_graph", target="fast_test.scene", format="ascii")\` or \`scene_manage(action="tree_graph", scenePath="fast_test.scene")\`.
* Query execution pipeline call graphs (GitNexus style):
  \`nexus_manage(action="get_tree_graph", type="workflow", target="pipe_...")\`.
* Query all indexed scenes or execution pipelines:
  \`nexus_manage(action="list_scenes")\` / \`nexus_manage(action="list_workflows")\`.
* Query JsonAsset & pTSAsset event networks:
  \`nexus_manage(action="query_event", eventNameOrUuid="Event.UI.onOpenHomeScreen.json")\`.

#### I. Automated Browser Gameplay Testing (Playwright Chromium)
* Launch preview browser and wait for Cocos engine: \`browser_manage(action="launch", url="http://127.0.0.1:7456")\`.
* Tap UI button or canvas position: \`browser_manage(action="tap", x=640, y=360)\`.
* Perform swipe/drag gesture: \`browser_manage(action="swipe", startX=300, startY=400, endX=600, endY=400)\`.
* Execute runtime JS query: \`browser_manage(action="eval", code="cc.director.getScene().name")\`.
* Capture screenshot for visual inspection: \`browser_manage(action="screenshot")\`.
* Check runtime logs & console errors: \`browser_manage(action="get_logs")\`.
* Close browser session: \`browser_manage(action="close")\`.

#### J. Headless Prefab Manipulation, Asset Tracing & Live Profiler
* Compare two prefabs side-by-side without editor canvas: \`prefab_manage(action="diff", sourcePrefab="db://assets/...", targetPrefab="db://assets/...")\`.
* Deep offline inspect of node hierarchy & components: \`prefab_manage(action="inspect_headless", prefabPath="db://assets/...", resolveReferences=true)\`.
* Batch extract properties across multi-prefabs in parallel: \`nexus_manage(action="batch_query", folder="db://assets/...", pattern="*.prefab", queries=[{ extract: ["position", "components"] }])\`.
* Bidirectional reference tracer: \`asset_manage(action="trace_references", target="db://assets/...")\`.
* Multi-prefab headless modification: \`prefab_manage(action="batch_edit_headless", files=["db://assets/..."], operations=[...], dryRun=true)\`.
* Live game profiler telemetry: \`debug_manage(action="profiler_snapshot", samples=3)\`.
`;
}

export function generateAgentsDocContent(): string {
    return `# AI Agent Operating Guidelines: Cocos Creator MCP Integration

${MCP_DOC_NOTICE}

## 🚨 Mandatory Rule: Always Generate Markdown (.md) Files for Summaries & Plans
Whenever creating plans, architecture proposals, or task summaries, **ALWAYS** generate them as dedicated Markdown (\`.md\`) files or artifacts.
- The user prefers opening and reading \`.md\` files in their external viewer app instead of reading long walls of text in the terminal.
- Never dump full multi-page summaries or plans directly into the chat text.
- Provide a clear, clickable \`file:///...\` link and concise high-level bullet points in the chat.

---

${generateMcpToolExplanationSnippet()}
`;
}
