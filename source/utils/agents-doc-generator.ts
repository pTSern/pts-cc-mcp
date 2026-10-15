/**
 * Utility to generate standard AGENTS.md and MCP tool documentation snippets for Cocos Creator AI agents
 */

export const MCP_DOC_NOTICE = `> [!IMPORTANT]
> **AI Agent Self-Check Instruction (Mandatory)**:
> Check if this \`AGENTS.md\` file contains the complete explanation of the \`pts-cc-mcp\` tools (all 16 Unified Intent APIs, parameters, and workflows).
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
| **\`prefab_manage\`** | \`action: "list" \\| "info" \\| "validate" \\| "enter" \\| "exit" \\| "save" \\| "instantiate" \\| "atomic_edit"\`, \`prefabPath\`, \`nodeUuid\` | Complete prefab lifecycle, non-destructive editing sessions, and atomic batch edits. |
| **\`ui_builder\`** | \`action: "build_tree" \\| "create_dialog" \\| "create_button" \\| "create_list"\`, \`tree\`, \`parent\` | Declarative 1-shot UI generation with auto-UITransform, Widget constraints, and Layouts. |
| **\`anim_manage\`** | \`action: "clip_inspect" \\| "clip_create" \\| "clip_add_track" \\| "clip_add_keyframe" \\| "clip_apply_preset" \\| "slice_fbx" \\| "graph_inspect"\`, \`animPath\`, \`property\`, \`time\`, \`value\` | Timeline AnimationClip editing, property curves, easing modes, animation events, presets, FBX slicing, and AnimGraph state machines. |
| **\`asset_manage\`** | \`action: "query" \\| "resolve" \\| "import" \\| "delete" \\| "dependencies"\`, \`folder\`, \`assetPath\`, \`assets\` | Asset discovery, dependency inspection, and smart sub-asset resolution (\`@spriteFrame\`, \`@texture\`). |
| **\`knowledge_query\`** | \`action: "query_component" \\| "query_rules" \\| "query_layout_patterns" \\| "get_mcp_guide" \\| "list_topics"\`, \`className\`, \`topic\` | Offline architecture reference for components, coordinates, rules, and live MCP documentation. |
| **\`validation_manage\`**| \`action: "check_scene" \\| "check_assets" \\| "check_viewport"\`, \`threshold\` | Automated audit for missing UITransforms, corrupt assets, and out-of-bounds nodes. |
| **\`batch_execute\`** | \`operations: [{ tool, args }]\`, \`autoSave: true\` | In-process atomic batch execution running multiple operations in a single IPC transaction. |
| **\`project_manage\`** | \`action: "get_info" \\| "build" \\| "run" \\| "compile_watch"\` | Build settings, preview server control, and TypeScript compilation watcher. |
| **\`scene_view_control\`**| \`action: "camera_focus" \\| "camera_view" \\| "grid_toggle" \\| "gizmo_mode"\`, \`nodeUuid\`, \`viewMode\` | Viewport camera manipulation and editor overlays. |
| **\`spine_manage\`** | \`action: "setup_rig" \\| "query_animations" \\| "set_animation"\`, \`nodeUuid\`, \`spineAssetPath\`, \`defaultAnimation\` | Rapid one-call Spine skeleton or FastSpine rig setup. |
| **\`debug_manage\`** | \`action: "get_logs" \\| "search_logs" \\| "get_stats"\` | Editor console monitoring and performance telemetry. |

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
