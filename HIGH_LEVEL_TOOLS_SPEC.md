# High-Level MCP Tools Specification for Cocos Creator (`pts-cc-mcp`)

## 1. Executive Summary & Purpose
This specification defines **6 high-level intent tools and actions** required for the `pts-cc-mcp` extension.
During extensive game development, porting (Unity -> Cocos Creator 3.8.8), and debugging sessions, AI agents frequently had to fall back to ad-hoc Node.js scratch scripts (`scratch/deep_compare.js`, `scratch/inspect_level_3.js`, `scratch/diff_prefabs.js`) because existing MCP tools:
1. **Require Active Document Switching**: `prefab_manage` currently relies on `action: "enter"`, which opens the prefab in the Cocos Creator editor viewport. This is disruptive, slow (~3–5s per document), and cannot inspect or compare multiple prefabs simultaneously.
2. **Lack Offline Serialization Queries**: No capability to inspect internal node trees, component properties, or serialized array targets (`__id__` pointers) without loading the full editor GUI canvas.
3. **Lack Mass Batch Scanning**: Auditing 60+ level prefabs to find specific enemies, hazards, spawner configs, or broken UUIDs requires 60 sequential IPC roundtrips.
4. **Lack Deep Asset Diffing**: No tool exists to compare two prefabs (e.g. `bomb_1.prefab` vs `stone1_2.prefab`) side-by-side to detect diverging physics values, tags, or missing components.

Implementing these tools will grant AI agents 100% autonomous operation through the Model Context Protocol without relying on scratch scripts.

---

## 2. Specification: The 6 High-Level Tools

### Tool 1: `prefab_manage(action="diff")`
**Purpose**: Compare two `.prefab` assets side-by-side without opening either in the editor canvas.

#### Input Schema
```json
{
  "tool": "prefab_manage",
  "args": {
    "action": "diff",
    "sourcePrefab": "db://assets/game/game_play/prefabs/bombs/bomb_1.prefab",
    "targetPrefab": "db://assets/game/game_play/prefabs/stones/stone1_2.prefab",
    "ignoreProperties": ["_id", "fileId", "__prefab"],
    "filterComponents": ["cc.RigidBody2D", "Box2D_Shape", "Objective_Element_Base"]
  }
}
```

#### Expected Behavior
1. Headlessly parses both `.prefab` JSON files directly from disk or AssetDB cache.
2. Normalizes node hierarchies and component mappings.
3. Identifies:
   - **Components Added / Removed**: e.g., Source has `Objective_Element_Bomb` (`Objective_Element_Explosive`), Target has `Objective_Element_Stone` (`Objective_Element_Collectable`).
   - **Property Divergences**: Key-by-key comparison of transform values, Box2D settings (`gravity`, `restitution`, `density`, `friction`), and sprite frame UUIDs.
   - **Structural Differences**: Extra or missing child nodes.

#### Output Format
```json
{
  "success": true,
  "data": {
    "source": "bomb_1.prefab",
    "target": "stone1_2.prefab",
    "componentsDiff": {
      "sourceOnly": ["e832d7Q9Y1M9pSrVAJZfoCn (Objective_Element_Bomb)"],
      "targetOnly": ["09697eKarZP57wOEVWY7mDV (Objective_Element_Stone)"]
    },
    "propertyDiff": [
      {
        "component": "cc.Sprite",
        "property": "_spriteFrame",
        "sourceValue": "21e75282-0bf8-45c1-886e-e0236b4be686@f9941 (Bomb.png)",
        "targetValue": "8a31e892-38ef-49c0-990a-5c1203b87823@f9941 (stone1_2.png)"
      }
    ],
    "identicalComponents": ["cc.UITransform", "Box2D_Shape_Circle"]
  }
}
```

---

### Tool 2: `prefab_manage(action="inspect_headless")`
**Purpose**: Deeply inspect any `.prefab` node tree, components, and serialized properties offline without switching the editor's active scene or viewport.

#### Input Schema
```json
{
  "tool": "prefab_manage",
  "args": {
    "action": "inspect_headless",
    "prefabPath": "db://assets/game/level/fabs/level_3.prefab",
    "targetNode": "collection_pit",
    "includeComponents": true,
    "resolveReferences": true
  }
}
```

#### Expected Behavior
1. Reads and deserializes the `.prefab` file index array into a structured tree graph in memory.
2. If `targetNode` is provided, filters the inspection to that node and its sub-components.
3. Resolves local `{ "__id__": 67 }` index pointers to the actual target node name or component type (e.g. automatically revealing if a target points to a `Node` or mistakenly to a `cc.RigidBody2D` component).
4. Does **not** trigger `editor:open-document` or disrupt the user's active viewport.

#### Output Format
```json
{
  "success": true,
  "data": {
    "name": "collection_pit",
    "position": { "x": 0, "y": -1024, "z": 0 },
    "size": { "width": 1500, "height": 100 },
    "components": [
      {
        "type": "cc.UITransform",
        "properties": { "contentSize": { "width": 1500, "height": 100 } }
      },
      {
        "type": "aaa366zb7lLgJ7aZ9g1botZ (LM_Collector_Box2dContact)",
        "properties": {
          "targets": [
            { "id": 67, "resolvedTarget": "Node (collection_pit)" }
          ],
          "quests": ["c36909c1-f888-45e5-b619-d3eec2635c20 (Collect_75pc_Stone.pts)"],
          "useShapeOverlap": true
        }
      }
    ]
  }
}
```

---

### Tool 3: `nexus_manage(action="batch_query")`
**Purpose**: Batch-query properties across dozens or hundreds of prefabs in a single call (e.g., scanning all 60 level prefabs).

#### Input Schema
```json
{
  "tool": "nexus_manage",
  "args": {
    "action": "batch_query",
    "folder": "db://assets/game/level/fabs",
    "pattern": "level_*.prefab",
    "queries": [
      {
        "targetPath": "objectives/rocks",
        "extract": ["Box2D_Spawner.options", "_lpos"]
      },
      {
        "targetPath": "actors",
        "extract": ["children_names"]
      }
    ]
  }
}
```

#### Expected Behavior
1. Uses fast asynchronous filesystem I/O to parse matched `.prefab` files in parallel.
2. Traverses the serialized hierarchy to find requested node paths (e.g. `objectives/rocks`, `actors`).
3. Extracts component properties, spawner data, or child node names.
4. Returns a normalized dictionary mapping each file to its extracted data.

#### Output Format
```json
{
  "success": true,
  "data": {
    "totalScanned": 60,
    "results": {
      "level_1.prefab": {
        "rocks_pos": { "x": 0, "y": 960, "z": 0 },
        "spawner_data": "79aeb178 (Spawn_150m_10p.pts)",
        "spawner_fabs": "b808276b (Spawner_Stone_Fabs.pts)",
        "actors": ["Borrum_Stand_Strength"]
      },
      "level_3.prefab": {
        "rocks_pos": { "x": 0, "y": 960, "z": 0 },
        "spawner_data": "8cd56ab5 (Spawn_20_10p.pts)",
        "spawner_fabs": "4d046442 (Spawner_Bomb_Fabs.pts)",
        "actors": ["Borrum_Stand_Strength", "Boss"]
      }
    }
  }
}
```

---

### Tool 4: `asset_manage(action="trace_references")`
**Purpose**: Complete bidirectional reference graphing for any UUID (scenes, prefabs, `.pts`, `.meta`, and textures).

#### Input Schema
```json
{
  "tool": "asset_manage",
  "args": {
    "action": "trace_references",
    "target": "5912eaaf-feea-48ed-bbfa-5b026ad556e6",
    "deep": true,
    "detectBroken": true
  }
}
```

#### Expected Behavior
1. Queries the in-memory AssetDB and Nexus index.
2. Inbound Reference Lookup: Finds all files where this UUID appears (e.g. `Boss_Collision_Base.pts`, `Dog_Collision.pts`).
3. Outbound Reference Lookup: If target is an asset file, finds all external UUIDs referenced inside it.
4. Broken Reference Check: Verifies whether each referenced UUID exists in the current AssetDB registry.

#### Output Format
```json
{
  "success": true,
  "data": {
    "uuid": "5912eaaf-feea-48ed-bbfa-5b026ad556e6",
    "assetPath": "db://assets/game/game_play/characters/borrum/pTS/character/collision/collidable/Collision_Collidable_Hittable.pts",
    "inboundReferences": [
      {
        "file": "db://assets/game/game_play/characters/boss/pTS/Boss_Collision_Base.pts",
        "field": "conditions[1]"
      },
      {
        "file": "db://assets/game/game_play/characters/dog_robot/pTS/Dog_Collision.pts",
        "field": "conditions[1]"
      }
    ],
    "outboundReferences": [],
    "brokenReferences": []
  }
}
```

---

### Tool 5: `prefab_manage(action="batch_edit_headless")`
**Purpose**: Perform programmatic modifications across multiple background prefabs without opening each one in the editor GUI.

#### Input Schema
```json
{
  "tool": "prefab_manage",
  "args": {
    "action": "batch_edit_headless",
    "files": ["db://assets/game/level/fabs/level_*.prefab"],
    "operations": [
      {
        "type": "update_component_property",
        "nodePath": "objectives/collection_pit",
        "componentType": "LM_Collector_Box2dContact",
        "property": "targets",
        "valueMode": "self_node"
      },
      {
        "type": "set_transform",
        "nodePath": "actors/Borrum_Stand_Strength",
        "scale": { "x": 1.0, "y": 1.0, "z": 1.0 }
      }
    ],
    "dryRun": false
  }
}
```

#### Expected Behavior
1. If `dryRun: true`, validates queries and previews diffs without writing to disk.
2. Performs atomic updates directly on `.prefab` files.
3. Automatically fixes internal `{ "__id__": ... }` index pointers when `valueMode: "self_node"` is specified.
4. Triggers AssetDB re-import notification so Cocos Creator synchronizes without restarting.

#### Output Format
```json
{
  "success": true,
  "data": {
    "modifiedFilesCount": 58,
    "skippedFilesCount": 2,
    "details": [
      {
        "file": "level_3.prefab",
        "changes": [
          "Updated LM_Collector_Box2dContact.targets to point to self node (id: 67)",
          "Confirmed Borrum_Stand_Strength scale at (1.0, 1.0, 1.0)"
        ]
      }
    ]
  }
}
```

---

### Tool 6: `debug_manage(action="profiler_snapshot")`
**Purpose**: Capture real-time profiler metrics, draw calls, draw time, and detect thread hangs in preview browser or editor simulator.

#### Input Schema
```json
{
  "tool": "debug_manage",
  "args": {
    "action": "profiler_snapshot",
    "samples": 3,
    "detectStall": true
  }
}
```

#### Expected Behavior
1. Connects to active game preview instance (via Chrome DevTools Protocol / Playwright or Editor IPC).
2. Reads Cocos engine profiler stats (`cc.profiler` / Director stats):
   - `fps`, `frameTime` (ms)
   - `drawTime` (ms)
   - `physicsTime` (ms)
   - `drawCalls`, `triangles`
3. If `detectStall: true`, alerts if `drawTime > 100ms` or if Box2D contact solver is stuck in an infinite loop.

#### Output Format
```json
{
  "success": true,
  "data": {
    "fps": 59.8,
    "frameTimeMs": 16.7,
    "drawTimeMs": 2.1,
    "physicsTimeMs": 1.4,
    "drawCalls": 32,
    "triangles": 1280,
    "isHanging": false,
    "activePhysicsBodies": 42
  }
}
```

---

## 3. Implementation Blueprint for Developing Agent

To implement these tools into `extensions/pts-cc-mcp`:

1. **Routing Registration**:
   - Register the actions in [`source/tools/intent-dispatcher.ts`](file:///E:/__pTSern/KingdomMatch/extensions/pts-cc-mcp/source/tools/intent-dispatcher.ts).
   - Route `prefab_manage(diff | inspect_headless | batch_edit_headless)` to a new handler module: `source/tools/prefab/prefab-headless-tools.ts`.
   - Route `nexus_manage(batch_query)` to `source/tools/nexus-tools.ts`.
   - Route `asset_manage(trace_references)` to `source/tools/asset-tools.ts`.
   - Route `debug_manage(profiler_snapshot)` to `source/tools/debug-tools.ts`.

2. **Core Deserialization Utility (`source/utils/prefab-ast-parser.ts`)**:
   - Implement an array-indexed parser that reads raw `.prefab` JSON:
     ```ts
     export class PrefabAstParser {
         constructor(private raw: any[]) {}
         getNode(id: number): any { return this.raw[id]; }
         getRootNode(): any { return this.raw[1]; }
         findNodeByPath(path: string): { node: any; id: number } | null { ... }
         getComponents(nodeId: number): Array<{ comp: any; id: number }> { ... }
         resolveTarget(id: number): { type: string; name?: string } { ... }
     }
     ```

3. **Hot-Reload Verification**:
   - Compile TypeScript via `npm run build` inside `extensions/pts-cc-mcp`.
   - Trigger `POST http://127.0.0.1:3121/reload` to test new actions immediately without restarting Cocos Creator.

---

## 4. Acceptance Criteria & Test Matrix
| Action | Test Command | Success Condition |
|---|---|---|
| `diff` | `prefab_manage(action="diff", source="bomb_1.prefab", target="stone1_2.prefab")` | Detects `Objective_Element_Bomb` vs `Objective_Element_Stone` without opening editor document. |
| `inspect_headless` | `prefab_manage(action="inspect_headless", prefabPath="level_3.prefab", targetNode="collection_pit")` | Returns node 67 and components in < 20ms without switching active scene. |
| `batch_query` | `nexus_manage(action="batch_query", folder="level/fabs", pattern="level_*.prefab")` | Scans 60 levels in < 500ms and returns structured actor/spawner dictionary. |
| `trace_references` | `asset_manage(action="trace_references", target="<UUID>")` | Returns inbound list matching all `.pts` and `.prefab` files referencing target. |
| `profiler_snapshot`| `debug_manage(action="profiler_snapshot")` | Returns live FPS, DrawTime, and Physics latency. |
