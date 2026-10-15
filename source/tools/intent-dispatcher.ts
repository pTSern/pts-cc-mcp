import { ToolDefinition, ToolResponse } from '../types';
import { isNexusAvailable } from '../utils/nexus-checker';

export class IntentDispatcher {
    private tools: Record<string, any>;
    private toolMap: Map<string, any> = new Map();

    constructor(tools: Record<string, any>) {
        this.tools = tools;
        this.buildToolMap();
    }

    public buildToolMap(): void {
        this.toolMap.clear();
        for (const [cat, toolSet] of Object.entries(this.tools)) {
            if (!toolSet) continue;
            if (typeof toolSet.getTools === 'function') {
                try {
                    const defs = toolSet.getTools();
                    if (Array.isArray(defs)) {
                        for (const def of defs) {
                            if (def && def.name) {
                                this.toolMap.set(def.name, toolSet);
                                this.toolMap.set(`${cat}_${def.name}`, toolSet);
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[IntentDispatcher] Failed to index tools from ${cat}:`, e);
                }
            }
        }
    }

    public getIntentTools(): ToolDefinition[] {
        return [
            // 1. Scene Management
            {
                name: 'scene_manage',
                description: 'SCENE LIFECYCLE & HIERARCHY: Open, save, create, close, and inspect scenes; fetch scene hierarchy trees; and execute scene scripts or component methods.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_current', 'get_list', 'open', 'save', 'save_as', 'create', 'close', 'hierarchy', 'inspect', 'stats', 'execute_script', 'execute_component_method', 'tree_graph', 'flow'],
                            description: 'Scene action opcode'
                        },
                        format: { type: 'string', enum: ['both', 'ascii', 'json'], default: 'both', description: 'Result format for tree_graph/hierarchy ("ascii", "json", "both")' },
                        scenePath: { type: 'string', description: 'Scene asset path (e.g. "db://assets/scenes/Game.scene")' },
                        sceneName: { type: 'string', description: 'New scene name (for create action)' },
                        savePath: { type: 'string', description: 'Save location path (e.g. "db://assets/scenes/NewScene.scene")' },
                        path: { type: 'string', description: 'Destination path (for save_as action)' },
                        includeComponents: { type: 'boolean', default: false, description: 'Include component details in hierarchy' },
                        filterNode: { type: 'string', description: 'Filter hierarchy inspect to specific node name or UUID' },
                        maxDepth: { type: 'number', default: 10, description: 'Maximum depth for hierarchy tree' },
                        name: { type: 'string', description: 'Script target extension or method name' },
                        method: { type: 'string', description: 'Script method name to execute' },
                        uuid: { type: 'string', description: 'Component or node UUID' },
                        args: { type: 'array', default: [], description: 'Arguments array for script or method' }
                    },
                    required: ['action']
                }
            },

            // 2. Node Management
            {
                name: 'node_manage',
                description: 'NODE OPERATIONS: Query, create, delete, duplicate, transform (position, rotation, scale, size, anchor), reparent, and update node properties.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['query', 'create', 'delete', 'duplicate', 'transform', 'reparent', 'set_active', 'clipboard'],
                            description: 'Node action opcode'
                        },
                        nodeUuid: { type: 'string', description: 'Target node UUID (also accepts uuid)' },
                        uuid: { type: 'string', description: 'Target node UUID' },
                        queryType: { type: 'string', enum: ['find_by_name', 'find_by_path', 'get_children', 'get_parent', 'dump_tree', 'list_all'], default: 'find_by_name' },
                        name: { type: 'string', description: 'Node name or search pattern' },
                        path: { type: 'string', description: 'Node path query (e.g. "Canvas/Panel/Button")' },
                        parentUuid: { type: 'string', description: 'Parent node UUID for create or reparent' },
                        newParentUuid: { type: 'string', description: 'Destination parent UUID for reparent' },
                        position: {
                            type: 'object',
                            properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                            description: '3D/2D position coordinates'
                        },
                        rotation: {
                            type: 'object',
                            properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                            description: 'Euler rotation angles in degrees'
                        },
                        scale: {
                            type: 'object',
                            properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                            description: 'Scale factors'
                        },
                        size: {
                            type: 'object',
                            properties: { width: { type: 'number' }, height: { type: 'number' } },
                            description: '2D content size (updates cc.UITransform automatically)'
                        },
                        anchor: {
                            type: 'object',
                            properties: { x: { type: 'number' }, y: { type: 'number' } },
                            description: 'Anchor point (0.5, 0.5 is center)'
                        },
                        active: { type: 'boolean', description: 'Node active state' },
                        is2D: { type: 'boolean', default: true, description: 'Whether node is 2D UI element' },
                        clipboardAction: { type: 'string', enum: ['copy', 'cut', 'paste'], description: 'Clipboard operation' }
                    },
                    required: ['action']
                }
            },

            // 3. Component Management
            {
                name: 'component_manage',
                description: 'COMPONENT SYSTEM: Add, remove, query, inspect, deep-update properties, bind click events, and inspect @ccclass reflection schemas.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['add', 'remove', 'get', 'set_property', 'update', 'bind_event', 'list_types', 'query_class_info'],
                            description: 'Component action opcode'
                        },
                        nodeUuid: { type: 'string', description: 'Target node UUID' },
                        componentType: { type: 'string', description: 'Component class name (e.g. "cc.Sprite", "cc.Label", "cc.Button", "cc.Widget", "cc.Layout", "cc.UITransform")' },
                        componentIndex: { type: 'number', description: 'Index if multiple components of same type exist' },
                        property: { type: 'string', description: 'Property path (supports dot-notation, e.g. "spriteFrame", "contentSize.width")' },
                        propertyType: { type: 'string', description: 'Property type: "string"|"number"|"boolean"|"color"|"vec2"|"vec3"|"size"|"spriteFrame"|"asset"' },
                        value: { description: 'Value to assign to property' },
                        properties: { type: 'object', description: 'Deep property map for update action' },
                        targetNodeUuid: { type: 'string', description: 'Target node UUID for click event binding' },
                        targetComponent: { type: 'string', description: 'Target component name for click event handler' },
                        handler: { type: 'string', description: 'Target handler method name for click event' },
                        customEventData: { type: 'string', description: 'Custom event data string' },
                        className: { type: 'string', description: 'Class name to inspect for query_class_info' },
                        category: { type: 'string', description: 'Component category filter for list_types' },
                        autoSave: { type: 'boolean', default: true, description: 'Automatically save scene after update' }
                    },
                    required: ['action']
                }
            },

            // 4. Prefab Management
            {
                name: 'prefab_manage',
                description: 'PREFAB LIFECYCLE & EDITING: List, create, instantiate, enter/exit edit mode, save, unlink, apply/revert overrides, and atomic edit transactions.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['list', 'info', 'validate', 'create', 'delete', 'instantiate', 'unlink', 'apply', 'revert', 'enter', 'exit', 'save', 'atomic_edit'],
                            description: 'Prefab action opcode'
                        },
                        prefabPath: { type: 'string', description: 'Prefab asset path (e.g. "db://assets/prefabs/Hero.prefab")' },
                        folder: { type: 'string', default: 'db://assets', description: 'Folder to scan for prefabs' },
                        nodeUuid: { type: 'string', description: 'Target node UUID' },
                        parentUuid: { type: 'string', description: 'Parent node UUID for instantiation' },
                        savePath: { type: 'string', description: 'Asset path when creating new prefab' },
                        saveChanges: { type: 'boolean', default: true, description: 'Save changes upon exiting edit mode' },
                        position: {
                            type: 'object',
                            properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                            description: 'Instance position'
                        },
                        operations: {
                            type: 'array',
                            description: 'Batch operations array for atomic_edit action'
                        }
                    },
                    required: ['action']
                }
            },

            // 5. Declarative UI Builder
            {
                name: 'ui_builder',
                description: 'DECLARATIVE UI BUILDER: Build complete multi-level UI hierarchies from a single JSON tree. Automatically adds cc.UITransform, cc.Widget constraints, cc.Layout formatting, buttons, and labels.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['build_tree', 'create_dialog', 'create_button', 'create_list', 'apply_widget', 'apply_layout'],
                            description: 'UI Builder action opcode'
                        },
                        parent: { type: 'string', description: 'Parent node UUID, path, or "Canvas"' },
                        tree: { type: 'object', description: 'Declarative JSON tree node definition' },
                        title: { type: 'string', description: 'Dialog header title' },
                        width: { type: 'number', description: 'Container width' },
                        height: { type: 'number', description: 'Container height' },
                        bgSpriteFrame: { type: 'string', description: 'Background sprite frame path/UUID' },
                        buttons: { type: 'array', description: 'Dialog buttons definition array' },
                        name: { type: 'string', description: 'Node name' },
                        text: { type: 'string', description: 'Button text' },
                        position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
                        size: { type: 'object', properties: { width: { type: 'number' }, height: { type: 'number' } } },
                        nodeUuid: { type: 'string', description: 'Target node UUID' },
                        alignFlags: { type: 'number', description: 'Widget align flags (15: Full Stretch)' },
                        layoutType: { type: 'string', enum: ['NONE', 'HORIZONTAL', 'VERTICAL', 'GRID'] },
                        autoSave: { type: 'boolean', default: true }
                    },
                    required: ['action']
                }
            },

            // 6. Animation System
            {
                name: 'anim_manage',
                description: 'ANIMATION SYSTEM: Inspect and edit .animgraph state machines, author .anim AnimationClips, manipulate property tracks (position/rotation/scale/color), add keyframes, animation events, apply motion presets, and slice FBX animation takes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: [
                                'graph_inspect', 'graph_add_component', 'graph_update_component', 'graph_remove_component', 'graph_batch_replace',
                                'clip_inspect', 'clip_create', 'clip_add_track', 'clip_remove_track', 'clip_add_keyframe', 'clip_remove_keyframe',
                                'clip_add_event', 'clip_remove_event', 'clip_apply_preset', 'slice_fbx'
                            ],
                            description: 'Animation action opcode'
                        },
                        // Animgraph properties
                        animgraphPath: { type: 'string', description: 'Path to .animgraph asset' },
                        stateName: { type: 'string', description: 'Target state name in animgraph' },
                        componentType: { type: 'string', description: 'Component type to attach or update' },
                        properties: { type: 'object', description: 'Properties object' },
                        componentIndex: { type: 'number', description: 'Index of component' },
                        fromType: { type: 'string', description: 'Source component class name for batch migration' },
                        toType: { type: 'string', description: 'Target component class name for batch migration' },
                        // Clip & Timeline properties
                        animPath: { type: 'string', description: 'Path to .anim AnimationClip asset' },
                        name: { type: 'string', description: 'Animation clip or preset name' },
                        duration: { type: 'number', description: 'Duration in seconds' },
                        sample: { type: 'number', default: 60, description: 'Sample rate' },
                        speed: { type: 'number', default: 1, description: 'Playback speed' },
                        wrapMode: { type: 'number', description: 'Wrap mode (0: Normal, 1: Loop, 2: PingPong)' },
                        property: { type: 'string', enum: ['position', 'scale', 'eulerAngles', 'color', 'opacity'], description: 'Property track to edit' },
                        nodePath: { type: 'string', description: 'Target hierarchy child node path' },
                        time: { type: 'number', description: 'Keyframe timestamp in seconds' },
                        value: { description: 'Keyframe value (scalar or array)' },
                        interpolationMode: { type: 'string', enum: ['LINEAR', 'CONSTANT', 'CUBIC'] },
                        frame: { type: 'number', description: 'Event timestamp in seconds' },
                        func: { type: 'string', description: 'Event trigger function' },
                        params: { type: 'array', description: 'Event parameters' },
                        presetName: { type: 'string', enum: ['fade_in', 'fade_out', 'bounce_pop', 'shake', 'button_press', 'pulse', 'spin'] },
                        // FBX Slicing properties
                        fbxMetaPath: { type: 'string', description: 'Path to .fbx or .fbx.meta asset' },
                        animations: { type: 'array', description: 'Array of FBX take slices: [{ name, from, to, wrapMode, speed }]' }
                    },
                    required: ['action']
                }
            },

            // 7. Asset Management
            {
                name: 'asset_manage',
                description: 'ASSET MANAGEMENT: Query, search, resolve smart sub-assets (@spriteFrame, @texture), create, delete, import assets, analyze dependencies, and convert UUID to URL.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['query', 'resolve', 'create', 'delete', 'import', 'dependencies', 'uuid_to_url', 'url_to_uuid', 'save_meta'],
                            description: 'Asset action opcode'
                        },
                        assetPath: { type: 'string', description: 'Smart asset path to resolve (e.g. "db://assets/textures/hero.png@spriteFrame")' },
                        ccType: { type: 'string', description: 'Filter assets by Cocos class (e.g. "cc.ImageAsset", "cc.Prefab", "cc.Material")' },
                        pattern: { type: 'string', description: 'Search pattern (e.g. "db://assets/**/*.png")' },
                        folder: { type: 'string', default: 'db://assets', description: 'Folder to query' },
                        urls: { type: 'array', items: { type: 'string' }, description: 'URLs to delete' },
                        assets: { type: 'array', description: 'Assets to import [{ sourcePath, targetUrl }]' },
                        overwrite: { type: 'boolean', default: false, description: 'Overwrite existing files' },
                        uuid: { type: 'string', description: 'Asset UUID' },
                        url: { type: 'string', description: 'Asset URL' },
                        urlOrUUID: { type: 'string', description: 'Asset URL or UUID' },
                        content: { type: 'string', description: 'File content or meta content' }
                    },
                    required: ['action']
                }
            },

            // 8. Knowledge Base
            {
                name: 'knowledge_query',
                description: 'COCOS CREATOR 3.8 KNOWLEDGE BASE: Offline in-memory architecture reference, reflection tables, and MCP tool specification guides for AI agents. Eliminates API hallucinations and keeps AGENTS.md synchronized.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['query_component', 'query_rules', 'query_layout_patterns', 'query_coordinates', 'list_topics', 'get_mcp_guide', 'check_agents_doc', 'sync_agents_doc'],
                            description: 'Knowledge action opcode: "query_component" = component properties | "query_rules" = architecture rules | "query_layout_patterns" = UI patterns | "query_coordinates" = coordinates | "list_topics" = list topics | "get_mcp_guide" = get complete MCP tool specification markdown | "check_agents_doc" = check if AGENTS.md exists & has MCP explanation | "sync_agents_doc" = auto-write or append MCP guide into AGENTS.md'
                        },
                        className: { type: 'string', description: 'Component class name (e.g. "cc.Sprite", "cc.Label", "cc.Button", "cc.UITransform", "cc.Widget", "cc.Layout", "cc.ScrollView", "sp.Skeleton", "cc.Camera")' },
                        topic: { type: 'string', enum: ['coordinates', 'resolution', 'anchors', 'lifecycle', 'subassets'], description: 'Architectural topic' },
                        pattern: { type: 'string', enum: ['dialog', 'hud', 'list', 'grid'], description: 'UI pattern' },
                        autoWrite: { type: 'boolean', default: true, description: 'For sync_agents_doc: directly write or append to AGENTS.md' }
                    },
                    required: ['action']
                }
            },

            // 9. Validation & Diagnostics
            {
                name: 'validation_manage',
                description: 'SCENE & ASSET VALIDATION: Audit scene node hierarchies for missing UITransforms, duplicate names, zero-size containers, out-of-bounds nodes, broken asset GUID references, and capture/diff scene regression snapshots.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: [
                                'check_scene', 'check_assets', 'check_viewport', 'validate_json',
                                'capture_snapshot', 'diff_snapshot', 'list_snapshots', 'restore_snapshot'
                            ],
                            description: 'Validation action opcode: "check_scene" = audit hierarchy | "check_assets" = scan broken GUIDs | "check_viewport" = find out-of-bounds nodes | "capture_snapshot" = capture scene state snapshot | "diff_snapshot" = visual regression diff against snapshot | "list_snapshots" = list captured snapshots | "restore_snapshot" = restore scene to snapshot | "validate_json" = validate & auto-fix JSON'
                        },
                        threshold: { type: 'number', default: 3000, description: 'Out-of-bounds pixel threshold for viewport check' },
                        tag: { type: 'string', description: 'Label or tag for capture_snapshot' },
                        snapshotId: { type: 'string', description: 'Target snapshot ID for diff_snapshot or restore_snapshot' },
                        jsonString: { type: 'string', description: 'JSON string to validate/repair' }
                    },
                    required: ['action']
                }
            },

            // 10. Atomic Batch Transactions
            {
                name: 'batch_execute',
                description: 'IN-PROCESS ATOMIC BATCH TRANSACTION: Execute multiple tool operations in a single sequential in-process IPC transaction. Drastically reduces token usage and round-trips.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        operations: {
                            type: 'array',
                            description: 'Array of operations [{ tool: "node_manage", args: { ... } }]',
                            items: {
                                type: 'object',
                                properties: {
                                    tool: { type: 'string', description: 'Tool name' },
                                    args: { type: 'object', description: 'Tool arguments' }
                                },
                                required: ['tool', 'args']
                            }
                        },
                        stopOnError: { type: 'boolean', default: true, description: 'Halt sequence on error' },
                        autoSave: { type: 'boolean', default: true, description: 'Automatically save scene after batch completes' }
                    },
                    required: ['operations']
                }
            },

            // 11. Project Control & Compiler
            {
                name: 'project_manage',
                description: 'PROJECT CONTROL & BUILD: Inspect project info, build settings, trigger preview or production builds, open build panel, and await TypeScript compilation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_info', 'get_settings', 'update_settings', 'run', 'build', 'open_build_panel', 'compile_watch'],
                            description: 'Project action opcode'
                        },
                        category: { type: 'string', description: 'Settings category' },
                        platform: { type: 'string', description: 'Target platform (web-desktop, web-mobile, etc.)' },
                        debug: { type: 'boolean', default: true, description: 'Debug build flag' },
                        waitForCompile: { type: 'boolean', default: true, description: 'Await compilation completion' },
                        timeoutMs: { type: 'number', default: 15000, description: 'Compilation wait timeout' }
                    },
                    required: ['action']
                }
            },

            // 12. Scene View & Viewport Control
            {
                name: 'scene_view_control',
                description: 'SCENE VIEWPORT CONTROL: Camera focus on node, 2D/3D view mode toggle, grid toggle, gizmo transform mode, and reference image overlays.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['camera_focus', 'camera_view', 'grid_toggle', 'gizmo_mode', 'reference_image'],
                            description: 'Viewport control action opcode'
                        },
                        nodeUuid: { type: 'string', description: 'Node UUID to focus camera on' },
                        viewMode: { type: 'string', enum: ['2D', '3D', 'top', 'front', 'left'] },
                        visible: { type: 'boolean', description: 'Grid visibility' },
                        mode: { type: 'string', enum: ['position', 'rotation', 'scale', 'rect'], description: 'Gizmo transform mode' },
                        imagePath: { type: 'string', description: 'Reference image file path' },
                        opacity: { type: 'number', default: 0.5, description: 'Reference image opacity' }
                    },
                    required: ['action']
                }
            },

            // 13. Spine Character Rigging
            {
                name: 'spine_manage',
                description: 'SPINE RIGGING: One-call setup for sp.Skeleton or FastSpine with asset binding, default animation, skin, loop mode, and UITransform sizing.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['setup_rig', 'query_animations', 'set_animation', 'set_skin'],
                            default: 'setup_rig',
                            description: 'Spine action opcode'
                        },
                        nodeUuid: { type: 'string', description: 'Target node UUID' },
                        spineAssetPath: { type: 'string', description: 'Spine skeleton asset path (e.g. "db://assets/spine/hero.json")' },
                        defaultAnimation: { type: 'string', description: 'Initial animation name (e.g. "idle", "walk")' },
                        defaultSkin: { type: 'string', default: 'default', description: 'Initial skin name' },
                        loop: { type: 'boolean', default: true, description: 'Loop animation' },
                        premultipliedAlpha: { type: 'boolean', default: true },
                        useFastSpine: { type: 'boolean', default: false, description: 'Use high-performance FastSpine component' }
                    },
                    required: ['nodeUuid']
                }
            },

            // 14. Debug & Diagnostics
            {
                name: 'debug_manage',
                description: 'DEBUG & SYSTEM: Inspect editor console logs, search project log files, get system performance statistics, and evaluate expressions.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_logs', 'clear_logs', 'read_log_file', 'system_info', 'compile_status'],
                            description: 'Debug action opcode'
                        },
                        limit: { type: 'number', default: 50, description: 'Log count limit' },
                        filter: { type: 'string', description: 'Filter pattern or level (error, warn, info)' },
                        logType: { type: 'string', enum: ['project', 'editor'], default: 'project' },
                        lines: { type: 'number', default: 100 }
                    },
                    required: ['action']
                }
            },

            // 15. Preferences Management
            {
                name: 'preferences_manage',
                description: 'EDITOR PREFERENCES: Read, set, and backup Cocos Creator user preferences.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get', 'set', 'backup'],
                            description: 'Preferences action opcode'
                        },
                        key: { type: 'string', description: 'Preference key' },
                        value: { description: 'Preference value' },
                        category: { type: 'string', description: 'Preference category' }
                    },
                    required: ['action']
                }
            },

            // 16. Broadcast & Event Bus
            {
                name: 'broadcast_manage',
                description: 'BROADCAST EVENT BUS: Subscribe to editor/scene events, emit broadcast events, and view event transmission history.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['subscribe', 'emit', 'history', 'clear'],
                            description: 'Broadcast action opcode'
                        },
                        channel: { type: 'string', description: 'Event channel name' },
                        data: { description: 'Payload data to broadcast' },
                        limit: { type: 'number', default: 50 }
                    },
                    required: ['action']
                }
            },

            // 17. Project Architecture & Tree Graph (Nexus)
            {
                name: 'nexus_manage',
                description: 'PROJECT ARCHITECTURE & TREE GRAPHS: Query scene node flow trees with workflows/components, function execution call pipelines, and pEngine.Json/pTSAsset event dependency networks in ASCII or JSON format. Ideal for LLM reasoning.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_tree_graph', 'list_scenes', 'list_workflows', 'scan_network', 'query_event', 'generate_html'],
                            description: 'Nexus action opcode'
                        },
                        type: {
                            type: 'string',
                            enum: ['scene_flow', 'workflow', 'event_nexus', 'list_scenes', 'list_workflows'],
                            description: 'Graph type to query: "scene_flow" (Node hierarchy + workflows), "workflow" (Function call pipeline), "event_nexus" (Event & asset network), "list_scenes" (All indexed scenes/prefabs), "list_workflows" (All execution pipelines)'
                        },
                        target: {
                            type: 'string',
                            description: 'Target identifier: scene/prefab filename (e.g. "fast_test.scene" or "assets/test_bund/fast_test.scene"), workflow method, or event name'
                        },
                        nodePath: {
                            type: 'string',
                            description: 'Optional subpath filter in scene tree (e.g. "Canvas/GameLayer")'
                        },
                        format: {
                            type: 'string',
                            enum: ['both', 'ascii', 'json'],
                            default: 'both',
                            description: 'Result format. "ascii" is optimal for token-efficient LLM context; "json" for structured data; "both" includes both'
                        },
                        maxDepth: {
                            type: 'number',
                            default: 10,
                            description: 'Max tree traversal depth'
                        },
                        domainFilter: {
                            type: 'string',
                            description: 'Domain filter for scan_network (e.g. "ALL", "UI Navigation", etc.)'
                        },
                        eventNameOrUuid: {
                            type: 'string',
                            description: 'Event name or UUID for query_event'
                        },
                        outputPath: {
                            type: 'string',
                            description: 'Output HTML path for generate_html'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    public isIntentTool(toolName: string): boolean {
        const intentNames = new Set([
            'scene_manage', 'node_manage', 'component_manage', 'prefab_manage',
            'ui_builder', 'anim_manage', 'asset_manage', 'knowledge_query',
            'validation_manage', 'batch_execute', 'project_manage', 'scene_view_control',
            'spine_manage', 'debug_manage', 'preferences_manage', 'broadcast_manage',
            'nexus_manage', 'nexus_get_tree_graph'
        ]);
        return intentNames.has(toolName);
    }

    public async execute(toolName: string, args: any): Promise<ToolResponse> {
        // 1. Direct Intent Dispatch
        if (this.isIntentTool(toolName)) {
            return await this.dispatchIntent(toolName, args);
        }

        // 2. Backward Compatibility Router for Legacy Tool Names
        return await this.dispatchLegacyTool(toolName, args);
    }

    private async dispatchIntent(toolName: string, args: any): Promise<ToolResponse> {
        const action = args?.action;

        switch (toolName) {
            case 'scene_manage': {
                if (action === 'tree_graph' || action === 'flow') {
                    const nexusTools = this.tools['nexus'];
                    if (nexusTools) {
                        return await nexusTools.getTreeGraph({
                            type: 'scene_flow',
                            target: args?.scenePath || args?.sceneName || args?.name,
                            nodePath: args?.filterNode || args?.nodePath,
                            format: args?.format || 'both',
                            maxDepth: args?.maxDepth
                        });
                    }
                }

                const sceneTools = this.tools['scene'];
                if (!sceneTools) throw new Error('Scene tools not initialized');

                if (action === 'hierarchy') {
                    return await sceneTools.getSceneHierarchy(args?.includeComponents);
                }
                if (action === 'inspect') {
                    return await sceneTools.inspectScene(args);
                }
                if (action === 'stats') {
                    return await sceneTools.handleQuerySystem({ action: 'get_stats' });
                }
                if (action === 'execute_script' || action === 'execute_scene_script' || action === 'execute_component_method') {
                    return await sceneTools.handleExecutionControl(args);
                }
                return await sceneTools.handleSceneManagement(args);
            }

            case 'node_manage': {
                const nodeTools = this.tools['node'];
                if (!nodeTools) throw new Error('Node tools not initialized');

                const targetUuid = args?.nodeUuid || args?.uuid;

                if (action === 'query') {
                    const queryType = args?.queryType || 'find_by_name';
                    return await nodeTools.handleNodeQuery({
                        action: queryType,
                        name: args?.name,
                        pattern: args?.name || args?.path,
                        uuid: targetUuid,
                        maxDepth: args?.maxDepth
                    });
                }
                if (action === 'create' || action === 'delete' || action === 'duplicate') {
                    return await nodeTools.handleNodeLifecycle({
                        action,
                        name: args?.name,
                        parent: args?.parentUuid,
                        uuid: targetUuid,
                        is2D: args?.is2D
                    });
                }
                if (action === 'transform') {
                    return await nodeTools.handleNodeTransform({
                        uuid: targetUuid,
                        position: args?.position,
                        rotation: args?.rotation,
                        scale: args?.scale,
                        size: args?.size,
                        anchor: args?.anchor
                    });
                }
                if (action === 'reparent') {
                    return await nodeTools.handleNodeHierarchy({
                        action: 'move',
                        nodeUuid: targetUuid,
                        newParentUuid: args?.newParentUuid || args?.parentUuid
                    });
                }
                if (action === 'set_active') {
                    return await nodeTools.handleNodePropertyManagement({
                        action: 'set_active',
                        nodeUuid: targetUuid,
                        active: args?.active
                    });
                }
                if (action === 'clipboard') {
                    return await nodeTools.handleNodeClipboard({
                        action: args?.clipboardAction || 'copy',
                        nodeUuid: targetUuid
                    });
                }
                return await nodeTools.handleNodeTransform({ uuid: targetUuid, ...args });
            }

            case 'component_manage': {
                const compTools = this.tools['component'];
                if (!compTools) throw new Error('Component tools not initialized');

                if (action === 'add' || action === 'remove') {
                    return await compTools.handleComponentManage({
                        action,
                        nodeUuid: args?.nodeUuid,
                        componentType: args?.componentType,
                        componentIndex: args?.componentIndex
                    });
                }
                if (action === 'get' || action === 'list_types') {
                    return await compTools.handleComponentQuery({
                        action: action === 'list_types' ? 'available_types' : 'list',
                        nodeUuid: args?.nodeUuid,
                        componentType: args?.componentType,
                        category: args?.category
                    });
                }
                if (action === 'set_property') {
                    return await compTools.setComponentProperties(args);
                }
                if (action === 'update') {
                    return await compTools.updateComponent(args);
                }
                if (action === 'bind_event') {
                    return await compTools.configureClickEvent(args);
                }
                if (action === 'query_class_info') {
                    return await compTools.queryClassInfo(args);
                }
                return await compTools.updateComponent(args);
            }

            case 'prefab_manage': {
                const prefabTools = this.tools['prefab'];
                if (!prefabTools) throw new Error('Prefab tools not initialized');

                if (action === 'list' || action === 'info' || action === 'validate') {
                    return await prefabTools.handlePrefabBrowse(args);
                }
                if (action === 'create' || action === 'delete') {
                    return await prefabTools.handlePrefabLifecycle(args);
                }
                if (action === 'instantiate' || action === 'unlink' || action === 'apply' || action === 'revert') {
                    return await prefabTools.handlePrefabInstance(args);
                }
                if (action === 'enter' || action === 'exit' || action === 'save' || action === 'atomic_edit') {
                    return await prefabTools.handlePrefabEdit(args);
                }
                return await prefabTools.handlePrefabBrowse(args);
            }

            case 'ui_builder': {
                const uiTools = this.tools['uiBuilder'];
                if (!uiTools) throw new Error('UIBuilder tools not initialized');
                return await uiTools.execute('ui_builder', args);
            }

            case 'anim_manage': {
                if (action?.startsWith('graph_')) {
                    const animgraphTools = this.tools['animgraph'];
                    if (!animgraphTools) throw new Error('Animgraph tools not initialized');
                    const mappedAction = action.replace('graph_', '');
                    return await animgraphTools.execute('manage', { ...args, action: mappedAction });
                }

                // Clip timeline or FBX slicing operations
                const animationTools = this.tools['animation'];
                if (animationTools) {
                    return await animationTools.execute('animation_editor', args);
                }

                const animTools = this.tools['animgraph'];
                if (!animTools) throw new Error('Animation tools not initialized');
                return await animTools.execute('manage', args);
            }

            case 'asset_manage': {
                const assetTools = this.tools['assetAdvanced'];
                if (!assetTools) throw new Error('Asset tools not initialized');

                if (action === 'resolve') {
                    return await assetTools.handleAssetQuery({ action: 'resolve', assetPath: args?.assetPath || args?.url });
                }
                if (action === 'query') {
                    return await assetTools.handleAssetQuery(args);
                }
                if (action === 'create') {
                    return await assetTools.handleAssetOperations({ action: 'create', ...args });
                }
                if (action === 'delete' || action === 'import' || action === 'save_meta') {
                    return await assetTools.handleAssetManage(args);
                }
                if (action === 'dependencies' || action === 'uuid_to_url' || action === 'url_to_uuid') {
                    return await assetTools.handleAssetAnalyze(args);
                }
                if (action === 'refresh' || action === 'check_ready') {
                    return await assetTools.handleAssetSystem(args);
                }
                return await assetTools.handleAssetQuery(args);
            }

            case 'knowledge_query': {
                const knowTools = this.tools['knowledge'];
                if (!knowTools) throw new Error('Knowledge tools not initialized');
                return await knowTools.execute('knowledge_query', args);
            }

            case 'validation_manage': {
                const valTools = this.tools['validation'];
                if (!valTools) throw new Error('Validation tools not initialized');
                return await valTools.handleValidationManage(args);
            }

            case 'batch_execute': {
                const batchTools = this.tools['batch'];
                if (!batchTools) throw new Error('Batch tools not initialized');
                return await batchTools.execute('batch_execute', args);
            }

            case 'project_manage': {
                const projTools = this.tools['project'];
                const debugTools = this.tools['debug'];

                if (action === 'compile_watch') {
                    if (debugTools) return await debugTools.execute('compile_status', args);
                }
                if (action === 'open_build_panel') {
                    return await projTools.handleBuildSystem({ action: 'open_build_panel' });
                }
                return await projTools.handleProjectManage(args);
            }

            case 'scene_view_control': {
                const sceneView = this.tools['sceneView'];
                const refImg = this.tools['referenceImage'];

                if (action === 'reference_image') {
                    if (refImg) return await refImg.handleReferenceImageControl(args);
                }
                if (action === 'grid_toggle') {
                    return await sceneView.handleGridControl(args);
                }
                if (action === 'gizmo_mode') {
                    return await sceneView.handleGizmoControl(args);
                }
                return await sceneView.handleCameraControl(args);
            }

            case 'spine_manage': {
                const compTools = this.tools['component'];
                if (!compTools) throw new Error('Component tools not initialized');

                if (action === 'setup_rig' || !action) {
                    return await compTools.handleSpineSetup(args);
                }
                if (action === 'set_animation') {
                    return await compTools.setComponentProperties({
                        nodeUuid: args?.nodeUuid,
                        componentType: 'sp.Skeleton',
                        property: 'animation',
                        value: args?.animationName
                    });
                }
                if (action === 'set_skin') {
                    return await compTools.setComponentProperties({
                        nodeUuid: args?.nodeUuid,
                        componentType: 'sp.Skeleton',
                        property: 'defaultSkin',
                        value: args?.skinName
                    });
                }
                return await compTools.handleSpineSetup(args);
            }

            case 'debug_manage': {
                const debugTools = this.tools['debug'];
                if (!debugTools) throw new Error('Debug tools not initialized');

                if (action === 'get_logs' || action === 'clear_logs') {
                    return await debugTools.handleDebugConsole({ action: action === 'clear_logs' ? 'clear' : 'get_logs', ...args });
                }
                if (action === 'read_log_file') {
                    return await debugTools.handleDebugLogs(args);
                }
                if (action === 'system_info') {
                    return await debugTools.handleDebugSystem({ action: 'editor_info' });
                }
                if (action === 'compile_status') {
                    return await debugTools.getCompileStatus(args);
                }
                return await debugTools.handleDebugConsole(args);
            }

            case 'preferences_manage': {
                const prefTools = this.tools['preferences'];
                if (!prefTools) throw new Error('Preferences tools not initialized');
                return await prefTools.handlePreferencesManage(args);
            }

            case 'broadcast_manage': {
                const bcTools = this.tools['broadcast'];
                if (!bcTools) throw new Error('Broadcast tools not initialized');
                if (action === 'history' || action === 'get_log') {
                    return await bcTools.execute('broadcast_log_management', { action: 'get_log', limit: args?.limit });
                }
                if (action === 'clear' || action === 'clear_log') {
                    return await bcTools.execute('broadcast_log_management', { action: 'clear_log' });
                }
                if (action === 'subscribe' || action === 'start_listening') {
                    return await bcTools.execute('broadcast_listener_management', { action: 'start_listening', messageType: args?.channel });
                }
                if (action === 'listeners' || action === 'get_active_listeners') {
                    return await bcTools.execute('broadcast_listener_management', { action: 'get_active_listeners' });
                }
                return await bcTools.execute('broadcast_log_management', { action: 'get_log' });
            }

            case 'nexus_manage':
            case 'nexus_get_tree_graph': {
                if (!isNexusAvailable()) {
                    return {
                        success: false,
                        error: 'pts-nexus extension is not installed or is disabled in the project.'
                    };
                }
                const nexusTools = this.tools['nexus'];
                if (!nexusTools) throw new Error('Nexus tools not initialized');
                if (toolName === 'nexus_get_tree_graph') {
                    return await nexusTools.execute('nexus_get_tree_graph', args);
                }
                return await nexusTools.execute('nexus_manage', args);
            }

            default:
                throw new Error(`Unknown intent tool: ${toolName}`);
        }
    }

    private async dispatchLegacyTool(toolName: string, args: any): Promise<ToolResponse> {
        // Direct tool aliases
        if (toolName === 'nexus_get_tree_graph' || toolName === 'get_tree_graph' || toolName === 'query_tree') {
            return await this.dispatchIntent('nexus_manage', { action: 'get_tree_graph', ...args });
        }
        if (toolName === 'nexus_scan_network' || toolName === 'scan_network') {
            return await this.dispatchIntent('nexus_manage', { action: 'scan_network', ...args });
        }
        if (toolName === 'nexus_query_event' || toolName === 'query_event') {
            return await this.dispatchIntent('nexus_manage', { action: 'query_event', ...args });
        }
        if (toolName === 'nexus_generate_html' || toolName === 'generate_html') {
            return await this.dispatchIntent('nexus_manage', { action: 'generate_html', ...args });
        }
        if (toolName === 'batch_execute' || toolName === 'editor_batch_execute') {
            return await this.dispatchIntent('batch_execute', args);
        }
        if (toolName === 'animgraph_manage' || toolName === 'animation_editor') {
            return await this.dispatchIntent('anim_manage', args);
        }
        if (toolName === 'spine_setup') {
            return await this.dispatchIntent('spine_manage', { action: 'setup_rig', ...args });
        }
        if (toolName === 'compile_status' || toolName === 'editor_compile_status') {
            return await this.dispatchIntent('project_manage', { action: 'compile_watch', ...args });
        }
        if (toolName === 'inspect_scene' || toolName === 'scene_inspect_scene') {
            return await this.dispatchIntent('scene_manage', { action: 'inspect', ...args });
        }
        if (toolName === 'get_mcp_guide' || toolName === 'mcp_doc_query' || toolName === 'check_agents_doc' || toolName === 'sync_agents_doc') {
            return await this.dispatchIntent('knowledge_query', { action: toolName === 'mcp_doc_query' ? 'get_mcp_guide' : toolName, ...args });
        }
        if (toolName === 'check_scene' || toolName === 'check_assets' || toolName === 'check_viewport' ||
            toolName === 'capture_snapshot' || toolName === 'diff_snapshot' || toolName === 'list_snapshots' ||
            toolName === 'restore_snapshot' || toolName === 'validate_json_params') {
            return await this.dispatchIntent('validation_manage', { action: toolName === 'validate_json_params' ? 'validate_json' : toolName, ...args });
        }

        // 1. Direct match from registered tool definitions map (O(1))
        const directToolSet = this.toolMap.get(toolName);
        if (directToolSet && typeof directToolSet.execute === 'function') {
            try {
                return await directToolSet.execute(toolName, args);
            } catch (err: any) {
                if (err && err.message && (err.message.includes('Unknown') || err.message.includes('unknown')) && toolName.includes('_')) {
                    const method = toolName.split('_').slice(1).join('_');
                    try {
                        return await directToolSet.execute(method, args);
                    } catch {}
                }
                throw err;
            }
        }

        // 2. Gameplay driver alias matching (tap <-> game_tap, eval <-> game_eval, etc.)
        const gameTools = this.tools['game'];
        if (gameTools && typeof gameTools.execute === 'function') {
            const gameToolNames = new Set([
                'tap', 'swipe', 'tap_node', 'screenshot', 'query_state', 'eval',
                'game_tap', 'game_swipe', 'game_tap_node', 'game_screenshot', 'game_query_state', 'game_eval'
            ]);
            if (gameToolNames.has(toolName)) {
                return await gameTools.execute(toolName, args);
            }
        }

        // 3. Category prefix mapping fallback
        const parts = toolName.split('_');
        const prefix = parts[0];
        const method = parts.slice(1).join('_');

        const categoryMap: Record<string, string> = {
            scene: 'scene',
            node: 'node',
            component: 'component',
            prefab: 'prefab',
            project: 'project',
            debug: 'debug',
            preferences: 'preferences',
            server: 'server',
            broadcast: 'broadcast',
            sceneView: 'sceneView',
            scene_view: 'sceneView',
            referenceImage: 'referenceImage',
            reference_image: 'referenceImage',
            asset: 'assetAdvanced',
            assetAdvanced: 'assetAdvanced',
            validation: 'validation',
            game: 'game',
            animgraph: 'animgraph',
            animation: 'animation',
            batch: 'batch',
            knowledge: 'knowledge',
            ui: 'uiBuilder',
            uiBuilder: 'uiBuilder',
            nexus: 'nexus'
        };

        const targetCat = categoryMap[prefix] || prefix;
        const targetToolSet = this.tools[targetCat];

        if (targetToolSet && typeof targetToolSet.execute === 'function') {
            try {
                return await targetToolSet.execute(toolName, args);
            } catch (err: any) {
                if (err && err.message && (err.message.includes('Unknown') || err.message.includes('unknown'))) {
                    try {
                        return await targetToolSet.execute(method, args);
                    } catch {}
                } else {
                    throw err;
                }
            }
        }

        // 4. Defensive search across all registered tools
        for (const [catName, toolSet] of Object.entries(this.tools)) {
            if (typeof toolSet?.execute === 'function') {
                try {
                    return await toolSet.execute(toolName, args);
                } catch (err: any) {
                    if (err && err.message && (err.message.includes('Unknown') || err.message.includes('unknown'))) {
                        try {
                            return await toolSet.execute(method, args);
                        } catch {}
                    }
                }
            }
        }

        throw new Error(`Tool "${toolName}" not found in Unified Intent or Legacy registries`);
    }
}

