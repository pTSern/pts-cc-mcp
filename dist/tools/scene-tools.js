"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SceneTools {
    getTools() {
        return [
            // 1. Scene Management - Basic operations
            {
                name: 'scene_management',
                description: 'SCENE MANAGEMENT: Core scene operations for project workflow. COMMON TASKS: get_current for active scene info, get_list to see all scenes, open to switch scenes, save to persist changes, create for new scenes. WORKFLOW: Always save before switching scenes to avoid data loss.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_current', 'get_list', 'open', 'save', 'create', 'save_as', 'close'],
                            description: 'Scene operation: "get_current" = active scene details | "get_list" = all project scenes | "open" = switch to scene (requires scenePath) | "save" = save current changes | "create" = new scene file (requires sceneName+savePath) | "save_as" = copy scene (requires path) | "close" = close active scene'
                        },
                        // For open action
                        scenePath: {
                            type: 'string',
                            description: 'Scene file path to open (REQUIRED for open action). Use Cocos asset URLs. Examples: "db://assets/scenes/Game.scene", "db://assets/levels/Level1.scene". Get paths from get_list action first.'
                        },
                        // For create action
                        sceneName: {
                            type: 'string',
                            description: 'New scene name (REQUIRED for create action). Use descriptive names without extension. Examples: "MainMenu", "GameLevel1", "Settings". System adds .scene extension automatically.'
                        },
                        savePath: {
                            type: 'string',
                            description: 'Save location for new scene (REQUIRED for create action). Must include .scene extension. Examples: "db://assets/scenes/Tutorial.scene", "db://assets/levels/BossLevel.scene".'
                        },
                        // For save_as action
                        path: {
                            type: 'string',
                            description: 'Destination path for scene copy (REQUIRED for save_as action). Creates duplicate of current scene. Examples: "db://assets/scenes/GameBackup.scene", "db://assets/versions/v1_Game.scene".'
                        }
                    },
                    required: ['action']
                }
            },
            // 2. Scene Hierarchy - Get scene structure
            {
                name: 'scene_hierarchy',
                description: 'SCENE HIERARCHY: Get the complete hierarchy of current scene with optional component information. Use this to inspect scene structure.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        includeComponents: {
                            type: 'boolean',
                            description: 'Show component details in hierarchy output. true = full information including component types and properties (detailed but verbose), false = basic structure only (faster, cleaner output). Recommended: false for overview, true for analysis.',
                            default: false
                        }
                    }
                }
            },
            // 3. Scene Execution Control - Execute scripts and methods
            {
                name: 'scene_execution_control',
                description: 'EXECUTION CONTROL: Execute component methods, scene scripts, or restore prefab instances. Use this for running custom logic and managing prefab synchronization.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['execute_component_method', 'execute_scene_script', 'restore_prefab'],
                            description: 'Action: "execute_component_method" = call method on component | "execute_scene_script" = run scene plugin method | "restore_prefab" = sync prefab instance'
                        },
                        // For execute_component_method action
                        uuid: {
                            type: 'string',
                            description: 'Component UUID to execute method on (execute_component_method action only). Get from component tools.'
                        },
                        name: {
                            type: 'string',
                            description: 'Method name to execute. For execute_component_method: component method name. For execute_scene_script: plugin name'
                        },
                        method: {
                            type: 'string',
                            description: 'Script method name to call (execute_scene_script action only)'
                        },
                        args: {
                            type: 'array',
                            description: 'Arguments to pass to the method. Each element will be passed as a parameter to the method call.',
                            default: []
                        },
                        // For restore_prefab action
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID (restore_prefab action only). The node that should be synchronized with its prefab.'
                        },
                        assetUuid: {
                            type: 'string',
                            description: 'Prefab asset UUID (restore_prefab action only). The source prefab to restore from.'
                        }
                    },
                    required: ['action']
                }
            },
            // 4. Scene State Management - Snapshots and undo/redo
            {
                name: 'scene_state_management',
                description: 'STATE MANAGEMENT: Create snapshots, manage undo/redo operations, and control scene reload. Use this for version control and state tracking.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['create_snapshot', 'abort_snapshot', 'begin_undo', 'end_undo', 'cancel_undo', 'soft_reload'],
                            description: 'Action: "create_snapshot" = save scene state | "abort_snapshot" = cancel snapshot | "begin_undo" = start recording | "end_undo" = finish recording | "cancel_undo" = cancel recording | "soft_reload" = reload scene'
                        },
                        // For undo operations
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID to record for undo (begin_undo action only). Changes to this node will be tracked.'
                        },
                        undoId: {
                            type: 'string',
                            description: 'Undo recording ID from begin_undo operation (end_undo/cancel_undo actions only). Used to identify which recording to complete or cancel.'
                        }
                    },
                    required: ['action']
                }
            },
            // 5. Scene Query System - Scene status and information
            {
                name: 'scene_query_system',
                description: 'QUERY SYSTEM: Get scene status, available classes/components, and find nodes by asset usage. Use this for scene inspection and analysis.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['check_ready', 'check_dirty', 'list_classes', 'list_components', 'check_script', 'find_nodes_by_asset'],
                            description: 'Action: "check_ready" = is scene ready | "check_dirty" = has unsaved changes | "list_classes" = get registered classes | "list_components" = get available components | "check_script" = verify script exists | "find_nodes_by_asset" = find nodes using asset'
                        },
                        // For list_classes action
                        extends: {
                            type: 'string',
                            description: 'Filter classes that extend this base class (list_classes action only). Example: "cc.Component" shows all component classes'
                        },
                        // For check_script action
                        className: {
                            type: 'string',
                            description: 'Script class name to verify (check_script action only). Example: "PlayerController"'
                        },
                        // For find_nodes_by_asset action
                        assetUuid: {
                            type: 'string',
                            description: 'Asset UUID to search for usage (find_nodes_by_asset action only). Get UUID from asset tools.'
                        }
                    },
                    required: ['action']
                }
            },
            // 6. Inspect Scene - Deep inspection of scene structure and all component properties
            {
                name: 'inspect_scene',
                description: 'INSPECT SCENE: Deeply inspects and resolves the full scene hierarchy, nodes, components, and all property values (including nested objects like Helper_IdSelector, configs, asset UUIDs, and arrays). Can inspect the active open scene or any specific scene file. Returns a human/AI-readable indented tree or full structured JSON.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scenePath: {
                            type: 'string',
                            description: 'Optional. Scene asset path to inspect (e.g. "db://assets/scenes/game.scene" or "assets/scenes/game.scene"). If omitted, inspects currently active open scene in editor.'
                        },
                        format: {
                            type: 'string',
                            enum: ['tree', 'json', 'summary'],
                            default: 'tree',
                            description: 'Output format: "tree" = readable indented hierarchy with component properties summary (Recommended) | "json" = fully resolved recursive JSON object tree | "summary" = quick overview of node count and root structures'
                        },
                        filterNode: {
                            type: 'string',
                            description: 'Optional. Filter to only inspect a specific node (by name or UUID) and its children.'
                        },
                        maxDepth: {
                            type: 'number',
                            default: 20,
                            description: 'Maximum hierarchy depth to traverse. Default: 20.'
                        },
                        includeComponents: {
                            type: 'boolean',
                            default: true,
                            description: 'Whether to include component information. Default: true.'
                        },
                        includeProperties: {
                            type: 'boolean',
                            default: true,
                            description: 'Whether to include component property values in detail. Default: true.'
                        }
                    }
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'scene_management':
                return await this.handleSceneManagement(args);
            case 'scene_hierarchy':
                return await this.getSceneHierarchy(args.includeComponents);
            case 'scene_execution_control':
                return await this.handleExecutionControl(args);
            case 'scene_state_management':
                return await this.handleStateManagement(args);
            case 'scene_query_system':
                return await this.handleQuerySystem(args);
            case 'inspect_scene':
                return await this.inspectScene(args || {});
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async getCurrentScene() {
        try {
            // 直接使用 query-node-tree 来获取场景信息（这个方法已经验证可用）
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (tree && tree.uuid) {
                return {
                    success: true,
                    data: {
                        name: tree.name || 'Current Scene',
                        uuid: tree.uuid,
                        type: tree.type || 'cc.Scene',
                        active: tree.active !== undefined ? tree.active : true,
                        nodeCount: tree.children ? tree.children.length : 0
                    }
                };
            }
            else {
                return { success: false, error: 'No scene data available' };
            }
        }
        catch (err) {
            // 备用方案：使用场景脚本
            try {
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getCurrentSceneInfo',
                    args: []
                };
                const result = await Editor.Message.request('scene', 'execute-scene-script', options);
                return result;
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }
    async getSceneList() {
        try {
            const results = await Editor.Message.request('asset-db', 'query-assets', {
                pattern: 'db://assets/**/*.scene'
            });
            const scenes = results.map(asset => ({
                name: asset.name,
                path: asset.url,
                uuid: asset.uuid
            }));
            return { success: true, data: scenes };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async openScene(scenePath) {
        try {
            // 首先获取场景的UUID
            const uuid = await Editor.Message.request('asset-db', 'query-uuid', scenePath);
            if (!uuid) {
                return { success: false, error: 'Scene not found' };
            }
            // 使用正确的 scene API 打开场景 (需要UUID)
            await Editor.Message.request('scene', 'open-scene', uuid);
            return { success: true, message: `Scene opened: ${scenePath}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async saveScene() {
        try {
            await Editor.Message.request('scene', 'save-scene');
            return { success: true, message: 'Scene saved successfully' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async createScene(sceneName, savePath) {
        var _a;
        // 确保路径以.scene结尾
        const fullPath = savePath.endsWith('.scene') ? savePath : `${savePath}/${sceneName}.scene`;
        // 使用正确的Cocos Creator 3.8场景格式
        const sceneContent = JSON.stringify([
            {
                "__type__": "cc.SceneAsset",
                "_name": sceneName,
                "_objFlags": 0,
                "__editorExtras__": {},
                "_native": "",
                "scene": {
                    "__id__": 1
                }
            },
            {
                "__type__": "cc.Scene",
                "_name": sceneName,
                "_objFlags": 0,
                "__editorExtras__": {},
                "_parent": null,
                "_children": [],
                "_active": true,
                "_components": [],
                "_prefab": null,
                "_lpos": {
                    "__type__": "cc.Vec3",
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "_lrot": {
                    "__type__": "cc.Quat",
                    "x": 0,
                    "y": 0,
                    "z": 0,
                    "w": 1
                },
                "_lscale": {
                    "__type__": "cc.Vec3",
                    "x": 1,
                    "y": 1,
                    "z": 1
                },
                "_mobility": 0,
                "_layer": 1073741824,
                "_euler": {
                    "__type__": "cc.Vec3",
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "autoReleaseAssets": false,
                "_globals": {
                    "__id__": 2
                },
                "_id": "scene"
            },
            {
                "__type__": "cc.SceneGlobals",
                "ambient": {
                    "__id__": 3
                },
                "skybox": {
                    "__id__": 4
                },
                "fog": {
                    "__id__": 5
                },
                "octree": {
                    "__id__": 6
                }
            },
            {
                "__type__": "cc.AmbientInfo",
                "_skyColorHDR": {
                    "__type__": "cc.Vec4",
                    "x": 0.2,
                    "y": 0.5,
                    "z": 0.8,
                    "w": 0.520833
                },
                "_skyColor": {
                    "__type__": "cc.Vec4",
                    "x": 0.2,
                    "y": 0.5,
                    "z": 0.8,
                    "w": 0.520833
                },
                "_skyIllumHDR": 20000,
                "_skyIllum": 20000,
                "_groundAlbedoHDR": {
                    "__type__": "cc.Vec4",
                    "x": 0.2,
                    "y": 0.2,
                    "z": 0.2,
                    "w": 1
                },
                "_groundAlbedo": {
                    "__type__": "cc.Vec4",
                    "x": 0.2,
                    "y": 0.2,
                    "z": 0.2,
                    "w": 1
                }
            },
            {
                "__type__": "cc.SkyboxInfo",
                "_envLightingType": 0,
                "_envmapHDR": null,
                "_envmap": null,
                "_envmapLodCount": 0,
                "_diffuseMapHDR": null,
                "_diffuseMap": null,
                "_enabled": false,
                "_useHDR": true,
                "_editableMaterial": null,
                "_reflectionHDR": null,
                "_reflectionMap": null,
                "_rotationAngle": 0
            },
            {
                "__type__": "cc.FogInfo",
                "_type": 0,
                "_fogColor": {
                    "__type__": "cc.Color",
                    "r": 200,
                    "g": 200,
                    "b": 200,
                    "a": 255
                },
                "_enabled": false,
                "_fogDensity": 0.3,
                "_fogStart": 0.5,
                "_fogEnd": 300,
                "_fogAtten": 5,
                "_fogTop": 1.5,
                "_fogRange": 1.2,
                "_accurate": false
            },
            {
                "__type__": "cc.OctreeInfo",
                "_enabled": false,
                "_minPos": {
                    "__type__": "cc.Vec3",
                    "x": -1024,
                    "y": -1024,
                    "z": -1024
                },
                "_maxPos": {
                    "__type__": "cc.Vec3",
                    "x": 1024,
                    "y": 1024,
                    "z": 1024
                },
                "_depth": 8
            }
        ], null, 2);
        try {
            const result = await Editor.Message.request('asset-db', 'create-asset', fullPath, sceneContent);
            // Verify scene creation by checking if it exists
            try {
                const sceneList = await this.getSceneList();
                const createdScene = (_a = sceneList.data) === null || _a === void 0 ? void 0 : _a.find((scene) => scene.uuid === result.uuid);
                return {
                    success: true,
                    data: {
                        uuid: result.uuid,
                        url: result.url,
                        name: sceneName,
                        message: `Scene '${sceneName}' created successfully`,
                        sceneVerified: !!createdScene
                    },
                    verificationData: createdScene
                };
            }
            catch (_b) {
                return {
                    success: true,
                    data: {
                        uuid: result.uuid,
                        url: result.url,
                        name: sceneName,
                        message: `Scene '${sceneName}' created successfully (verification failed)`
                    }
                };
            }
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async getSceneHierarchy(includeComponents = false) {
        try {
            // 优先尝试使用 Editor API 查询场景节点树
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (tree) {
                const hierarchy = this.buildHierarchy(tree, includeComponents);
                return {
                    success: true,
                    data: hierarchy
                };
            }
            else {
                return { success: false, error: 'No scene hierarchy available' };
            }
        }
        catch (err) {
            // 备用方案：使用场景脚本
            try {
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getSceneHierarchy',
                    args: [includeComponents]
                };
                const result = await Editor.Message.request('scene', 'execute-scene-script', options);
                return result;
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }
    buildHierarchy(node, includeComponents) {
        const nodeInfo = {
            uuid: node.uuid,
            name: node.name,
            type: node.type,
            active: node.active,
            children: []
        };
        if (includeComponents && node.__comps__) {
            nodeInfo.components = node.__comps__.map((comp) => ({
                type: comp.__type__ || 'Unknown',
                enabled: comp.enabled !== undefined ? comp.enabled : true
            }));
        }
        if (node.children) {
            nodeInfo.children = node.children.map((child) => this.buildHierarchy(child, includeComponents));
        }
        return nodeInfo;
    }
    async saveSceneAs(path) {
        try {
            // save-as-scene API 不接受路径参数，会弹出对话框让用户选择
            await Editor.Message.request('scene', 'save-as-scene');
            return {
                success: true,
                data: {
                    path: path,
                    message: `Scene save-as dialog opened`
                }
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async closeScene() {
        try {
            await Editor.Message.request('scene', 'close-scene');
            return {
                success: true,
                message: 'Scene closed successfully'
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async executeComponentMethod(uuid, name, args) {
        try {
            const result = await Editor.Message.request('scene', 'execute-component-method', {
                uuid: uuid,
                name: name,
                args: args
            });
            return {
                success: true,
                data: result,
                message: `Component method ${name} executed successfully`
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async executeSceneScript(name, method, args) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: name,
                method: method,
                args: args
            });
            return {
                success: true,
                data: result,
                message: `Scene script ${name}.${method} executed successfully`
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async restorePrefab(nodeUuid, assetUuid) {
        try {
            const result = await Editor.Message.request('scene', 'restore-prefab', nodeUuid, assetUuid);
            return { success: true, data: result };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async sceneSnapshot() {
        try {
            const result = await Editor.Message.request('scene', 'snapshot');
            return {
                success: true,
                data: result,
                message: 'Scene snapshot created successfully'
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async sceneSnapshotAbort() {
        try {
            await Editor.Message.request('scene', 'snapshot-abort');
            return { success: true, message: 'Scene snapshot aborted' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async beginUndoRecording(nodeUuid) {
        try {
            const undoId = await Editor.Message.request('scene', 'begin-recording', nodeUuid);
            return {
                success: true,
                data: { undoId, nodeUuid },
                message: `Undo recording started for node ${nodeUuid}`
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async endUndoRecording(undoId) {
        try {
            await Editor.Message.request('scene', 'end-recording', undoId);
            return {
                success: true,
                data: { undoId },
                message: 'Undo recording ended successfully'
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async cancelUndoRecording(undoId) {
        try {
            await Editor.Message.request('scene', 'cancel-recording', undoId);
            return {
                success: true,
                data: { undoId },
                message: 'Undo recording cancelled successfully'
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async softReloadScene() {
        try {
            await Editor.Message.request('scene', 'soft-reload');
            return { success: true, message: 'Scene soft reloaded successfully' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async querySceneReady() {
        try {
            const result = await Editor.Message.request('scene', 'query-is-ready');
            return { success: true, data: { isReady: result }, message: `Scene ready status: ${result}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async querySceneDirty() {
        try {
            const result = await Editor.Message.request('scene', 'query-dirty');
            return { success: true, data: { isDirty: result }, message: `Scene dirty status: ${result}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async querySceneClasses(extendsClass) {
        try {
            const result = await Editor.Message.request('scene', 'query-classes', {});
            // Filter by extends class if provided
            let classes = result;
            if (extendsClass) {
                classes = result.filter((cls) => cls.extends === extendsClass);
            }
            return {
                success: true,
                data: { classes, total: classes.length },
                message: `Found ${classes.length} classes${extendsClass ? ` extending ${extendsClass}` : ''}`
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async querySceneComponents() {
        try {
            const result = await Editor.Message.request('scene', 'query-components');
            return {
                success: true,
                data: { components: result, total: result.length },
                message: `Found ${result.length} components in scene`
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryComponentHasScript(className) {
        try {
            const result = await Editor.Message.request('scene', 'query-component-has-script', className);
            return {
                success: true,
                data: { hasScript: result, className },
                message: `Script ${className} ${result ? 'exists' : 'does not exist'} in component list`
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryNodesByAssetUuid(assetUuid) {
        try {
            const result = await Editor.Message.request('scene', 'query-nodes-by-asset-uuid', assetUuid);
            return {
                success: true,
                data: { nodeUuids: result, assetUuid, count: result.length },
                message: `Found ${result.length} nodes using asset ${assetUuid}`
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    // New handler methods
    async handleSceneManagement(args) {
        const { action } = args;
        switch (action) {
            case 'get_current':
                return await this.getCurrentScene();
            case 'get_list':
                return await this.getSceneList();
            case 'open':
                return await this.openScene(args.scenePath);
            case 'save':
                return await this.saveScene();
            case 'create':
                return await this.createScene(args.sceneName, args.savePath);
            case 'save_as':
                return await this.saveSceneAs(args.path);
            case 'close':
                return await this.closeScene();
            default:
                return { success: false, error: `Unknown scene management action: ${action}` };
        }
    }
    async handleExecutionControl(args) {
        const { action } = args;
        switch (action) {
            case 'execute_component_method':
                return await this.executeComponentMethod(args.uuid, args.name, args.args);
            case 'execute_scene_script':
                return await this.executeSceneScript(args.name, args.method, args.args);
            case 'restore_prefab':
                return await this.restorePrefab(args.nodeUuid, args.assetUuid);
            default:
                return { success: false, error: `Unknown execution control action: ${action}` };
        }
    }
    async handleStateManagement(args) {
        const { action } = args;
        switch (action) {
            case 'create_snapshot':
                return await this.sceneSnapshot();
            case 'abort_snapshot':
                return await this.sceneSnapshotAbort();
            case 'begin_undo':
                return await this.beginUndoRecording(args.nodeUuid);
            case 'end_undo':
                return await this.endUndoRecording(args.undoId);
            case 'cancel_undo':
                return await this.cancelUndoRecording(args.undoId);
            case 'soft_reload':
                return await this.softReloadScene();
            default:
                return { success: false, error: `Unknown state management action: ${action}` };
        }
    }
    async handleQuerySystem(args) {
        const { action } = args;
        switch (action) {
            case 'check_ready':
                return await this.querySceneReady();
            case 'check_dirty':
                return await this.querySceneDirty();
            case 'list_classes':
                return await this.querySceneClasses(args.extends);
            case 'list_components':
                return await this.querySceneComponents();
            case 'check_script':
                return await this.queryComponentHasScript(args.className);
            case 'find_nodes_by_asset':
                return await this.queryNodesByAssetUuid(args.assetUuid);
            default:
                return { success: false, error: `Unknown query system action: ${action}` };
        }
    }
    async inspectScene(args) {
        try {
            const format = args.format || 'tree';
            const maxDepth = typeof args.maxDepth === 'number' ? args.maxDepth : 20;
            const includeComponents = args.includeComponents !== false;
            const includeProperties = args.includeProperties !== false;
            const filterNode = args.filterNode ? String(args.filterNode).trim() : null;
            let targetSceneFilePath = null;
            let sceneAssetUrl = args.scenePath || '';
            if (!sceneAssetUrl) {
                try {
                    const currentScene = await Editor.Message.request('scene', 'query-current-scene');
                    if (currentScene && currentScene.url) {
                        sceneAssetUrl = currentScene.url;
                    }
                }
                catch (_a) { }
            }
            if (sceneAssetUrl) {
                if (sceneAssetUrl.startsWith('db://')) {
                    try {
                        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', sceneAssetUrl);
                        if (assetInfo && assetInfo.file) {
                            targetSceneFilePath = assetInfo.file;
                        }
                    }
                    catch (_b) { }
                }
                else if (path.isAbsolute(sceneAssetUrl) && fs.existsSync(sceneAssetUrl)) {
                    targetSceneFilePath = sceneAssetUrl;
                }
                else {
                    const candidate = path.join(Editor.Project.path, sceneAssetUrl);
                    if (fs.existsSync(candidate)) {
                        targetSceneFilePath = candidate;
                    }
                }
            }
            if (!targetSceneFilePath) {
                const defaultCandidate = path.join(Editor.Project.path, 'assets', 'scenes', 'game.scene');
                if (fs.existsSync(defaultCandidate)) {
                    targetSceneFilePath = defaultCandidate;
                }
            }
            if (targetSceneFilePath && fs.existsSync(targetSceneFilePath)) {
                return this.inspectSceneFromFile(targetSceneFilePath, {
                    format,
                    maxDepth,
                    includeComponents,
                    includeProperties,
                    filterNode
                });
            }
            return await this.inspectSceneFromLiveEditor({
                format,
                maxDepth,
                includeComponents,
                includeProperties,
                filterNode
            });
        }
        catch (error) {
            console.error('[SceneTools] inspectScene error:', error);
            return {
                success: false,
                error: `Failed to inspect scene: ${error.message}`
            };
        }
    }
    inspectSceneFromFile(filePath, options) {
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(rawContent);
        const lookup = new Map();
        data.forEach((item, index) => lookup.set(index, item));
        const resolveValue = (val, visited = new Set()) => {
            if (val === null || val === undefined)
                return val;
            if (typeof val === 'object') {
                if (val.__id__ !== undefined) {
                    const refId = val.__id__;
                    if (visited.has(refId))
                        return `[Circular ref __id__: ${refId}]`;
                    visited.add(refId);
                    const target = lookup.get(refId);
                    if (!target)
                        return val;
                    return resolveValue(target, visited);
                }
                if (Array.isArray(val)) {
                    return val.map(item => resolveValue(item, new Set(visited)));
                }
                const result = {};
                for (const [k, v] of Object.entries(val)) {
                    if (k === '_objFlags' || k === '__editorExtras__')
                        continue;
                    result[k] = resolveValue(v, new Set(visited));
                }
                return result;
            }
            return val;
        };
        const describeComponent = (comp) => {
            const type = comp.__type__ || 'Unknown';
            if (!options.includeProperties) {
                return { type, enabled: comp._enabled !== false };
            }
            const props = {};
            for (const [k, v] of Object.entries(comp)) {
                if (['_name', '_objFlags', '__editorExtras__', 'node', '_enabled', '_materials', 'sharedMaterials', '_id', '_prefab', '_zid'].includes(k)) {
                    continue;
                }
                props[k] = resolveValue(v);
            }
            return {
                type,
                enabled: comp._enabled !== false,
                properties: props
            };
        };
        const buildNodeTree = (nodeIndex, currentDepth) => {
            if (currentDepth > options.maxDepth)
                return null;
            const node = lookup.get(nodeIndex);
            if (!node || node.__type__ !== 'cc.Node')
                return null;
            const name = node._name || 'Unnamed';
            const uuid = node._id || node.uuid || '';
            const active = node._active !== false;
            const components = [];
            if (options.includeComponents && Array.isArray(node._components)) {
                for (const c of node._components) {
                    if (c && c.__id__ !== undefined) {
                        const compObj = lookup.get(c.__id__);
                        if (compObj) {
                            components.push(describeComponent(compObj));
                        }
                    }
                }
            }
            const children = [];
            if (Array.isArray(node._children)) {
                for (const ch of node._children) {
                    if (ch && ch.__id__ !== undefined) {
                        const childTree = buildNodeTree(ch.__id__, currentDepth + 1);
                        if (childTree)
                            children.push(childTree);
                    }
                }
            }
            return {
                name,
                uuid,
                active,
                position: node._lpos || { x: 0, y: 0, z: 0 },
                components,
                children
            };
        };
        const sceneObj = data.find(item => item.__type__ === 'cc.Scene');
        const sceneName = (sceneObj === null || sceneObj === void 0 ? void 0 : sceneObj._name) || path.basename(filePath, '.scene');
        const rootNodes = [];
        if (sceneObj && Array.isArray(sceneObj._children)) {
            for (const ch of sceneObj._children) {
                if (ch && ch.__id__ !== undefined) {
                    const tree = buildNodeTree(ch.__id__, 0);
                    if (tree)
                        rootNodes.push(tree);
                }
            }
        }
        let targetTrees = rootNodes;
        if (options.filterNode) {
            const filter = options.filterNode.toLowerCase();
            const findFiltered = (nodes) => {
                const found = [];
                for (const n of nodes) {
                    if (n.name.toLowerCase().includes(filter) || n.uuid.toLowerCase() === filter) {
                        found.push(n);
                    }
                    else if (n.children && n.children.length > 0) {
                        found.push(...findFiltered(n.children));
                    }
                }
                return found;
            };
            targetTrees = findFiltered(rootNodes);
        }
        if (options.format === 'json') {
            return {
                success: true,
                data: {
                    scene: sceneName,
                    filePath,
                    totalEntities: data.length,
                    rootNodeCount: targetTrees.length,
                    nodes: targetTrees
                }
            };
        }
        if (options.format === 'summary') {
            let totalNodes = 0;
            let totalComponents = 0;
            const countStats = (nodes) => {
                var _a;
                for (const n of nodes) {
                    totalNodes++;
                    totalComponents += (((_a = n.components) === null || _a === void 0 ? void 0 : _a.length) || 0);
                    if (n.children)
                        countStats(n.children);
                }
            };
            countStats(rootNodes);
            return {
                success: true,
                data: {
                    scene: sceneName,
                    filePath,
                    totalNodes,
                    totalComponents,
                    rootNodes: rootNodes.map(r => ({ name: r.name, uuid: r.uuid, active: r.active, componentCount: r.components.length }))
                }
            };
        }
        const lines = [];
        lines.push(`## Scene: ${sceneName} (${filePath})`);
        lines.push(`Total root nodes: ${targetTrees.length}\n`);
        const formatTreeNode = (node, depth) => {
            const indent = '  '.repeat(depth);
            const status = node.active ? '' : ' [DISABLED]';
            lines.push(`${indent}* **${node.name}** (${node.uuid})${status}`);
            if (options.includeComponents && node.components && node.components.length > 0) {
                for (const c of node.components) {
                    if (options.includeProperties && c.properties && Object.keys(c.properties).length > 0) {
                        let propStr = JSON.stringify(c.properties);
                        if (propStr.length > 140)
                            propStr = propStr.substring(0, 140) + '...';
                        lines.push(`${indent}    - \`${c.type}\`: ${propStr}`);
                    }
                    else {
                        lines.push(`${indent}    - \`${c.type}\``);
                    }
                }
            }
            if (node.children && node.children.length > 0) {
                for (const ch of node.children) {
                    formatTreeNode(ch, depth + 1);
                }
            }
        };
        targetTrees.forEach(n => formatTreeNode(n, 0));
        return {
            success: true,
            data: {
                formattedText: lines.join('\n'),
                scene: sceneName,
                rootNodesCount: targetTrees.length
            }
        };
    }
    async inspectSceneFromLiveEditor(options) {
        try {
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No live scene tree available' };
            }
            return {
                success: true,
                data: tree
            };
        }
        catch (err) {
            return { success: false, error: `Live scene inspection failed: ${err.message}` };
        }
    }
}
exports.SceneTools = SceneTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUk3QixNQUFhLFVBQVU7SUFDbkIsUUFBUTtRQUNKLE9BQU87WUFDSCx5Q0FBeUM7WUFDekM7Z0JBQ0ksSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLHFSQUFxUjtnQkFDbFMsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDOzRCQUMvRSxXQUFXLEVBQUUsMlNBQTJTO3lCQUMzVDt3QkFDRCxrQkFBa0I7d0JBQ2xCLFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsK0xBQStMO3lCQUMvTTt3QkFDRCxvQkFBb0I7d0JBQ3BCLFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUxBQW1MO3lCQUNuTTt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLCtLQUErSzt5QkFDL0w7d0JBQ0QscUJBQXFCO3dCQUNyQixJQUFJLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDJMQUEyTDt5QkFDM007cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUN2QjthQUNKO1lBRUQsMkNBQTJDO1lBQzNDO2dCQUNJLElBQUksRUFBRSxpQkFBaUI7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T0FBWTtRQUNqRCxJQUFJLENBQUM7WUFDRCxNQUFNLElBQUksR0FBUSxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQzNFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDUixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsOEJBQThCLEVBQUUsQ0FBQztZQUNyRSxDQUFDO1lBQ0QsT0FBTztnQkFDSCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUUsSUFBSTthQUNiLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsaUNBQWlDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQ3JGLENBQUM7SUFDTCxDQUFDO0NBRUo7QUF2bUNELGdDQXVtQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIFNjZW5lSW5mbyB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmRlY2xhcmUgY29uc3QgRWRpdG9yOiBhbnk7XG5cbmV4cG9ydCBjbGFzcyBTY2VuZVRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIC8vIDEuIFNjZW5lIE1hbmFnZW1lbnQgLSBCYXNpYyBvcGVyYXRpb25zXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjZW5lX21hbmFnZW1lbnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU0NFTkUgTUFOQUdFTUVOVDogQ29yZSBzY2VuZSBvcGVyYXRpb25zIGZvciBwcm9qZWN0IHdvcmtmbG93LiBDT01NT04gVEFTS1M6IGdldF9jdXJyZW50IGZvciBhY3RpdmUgc2NlbmUgaW5mbywgZ2V0X2xpc3QgdG8gc2VlIGFsbCBzY2VuZXMsIG9wZW4gdG8gc3dpdGNoIHNjZW5lcywgc2F2ZSB0byBwZXJzaXN0IGNoYW5nZXMsIGNyZWF0ZSBmb3IgbmV3IHNjZW5lcy4gV09SS0ZMT1c6IEFsd2F5cyBzYXZlIGJlZm9yZSBzd2l0Y2hpbmcgc2NlbmVzIHRvIGF2b2lkIGRhdGEgbG9zcy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9jdXJyZW50JywgJ2dldF9saXN0JywgJ29wZW4nLCAnc2F2ZScsICdjcmVhdGUnLCAnc2F2ZV9hcycsICdjbG9zZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2NlbmUgb3BlcmF0aW9uOiBcImdldF9jdXJyZW50XCIgPSBhY3RpdmUgc2NlbmUgZGV0YWlscyB8IFwiZ2V0X2xpc3RcIiA9IGFsbCBwcm9qZWN0IHNjZW5lcyB8IFwib3BlblwiID0gc3dpdGNoIHRvIHNjZW5lIChyZXF1aXJlcyBzY2VuZVBhdGgpIHwgXCJzYXZlXCIgPSBzYXZlIGN1cnJlbnQgY2hhbmdlcyB8IFwiY3JlYXRlXCIgPSBuZXcgc2NlbmUgZmlsZSAocmVxdWlyZXMgc2NlbmVOYW1lK3NhdmVQYXRoKSB8IFwic2F2ZV9hc1wiID0gY29weSBzY2VuZSAocmVxdWlyZXMgcGF0aCkgfCBcImNsb3NlXCIgPSBjbG9zZSBhY3RpdmUgc2NlbmUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG9wZW4gYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZVBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NjZW5lIGZpbGUgcGF0aCB0byBvcGVuIChSRVFVSVJFRCBmb3Igb3BlbiBhY3Rpb24pLiBVc2UgQ29jb3MgYXNzZXQgVVJMcy4gRXhhbXBsZXM6IFwiZGI6Ly9hc3NldHMvc2NlbmVzL0dhbWUuc2NlbmVcIiwgXCJkYjovL2Fzc2V0cy9sZXZlbHMvTGV2ZWwxLnNjZW5lXCIuIEdldCBwYXRocyBmcm9tIGdldF9saXN0IGFjdGlvbiBmaXJzdC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGNyZWF0ZSBhY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTmV3IHNjZW5lIG5hbWUgKFJFUVVJUkVEIGZvciBjcmVhdGUgYWN0aW9uKS4gVXNlIGRlc2NyaXB0aXZlIG5hbWVzIHdpdGhvdXQgZXh0ZW5zaW9uLiBFeGFtcGxlczogXCJNYWluTWVudVwiLCBcIkdhbWVMZXZlbDFcIiwgXCJTZXR0aW5nc1wiLiBTeXN0ZW0gYWRkcyAuc2NlbmUgZXh0ZW5zaW9uIGF1dG9tYXRpY2FsbHkuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTYXZlIGxvY2F0aW9uIGZvciBuZXcgc2NlbmUgKFJFUVVJUkVEIGZvciBjcmVhdGUgYWN0aW9uKS4gTXVzdCBpbmNsdWRlIC5zY2VuZSBleHRlbnNpb24uIEV4YW1wbGVzOiBcImRiOi8vYXNzZXRzL3NjZW5lcy9UdXRvcmlhbC5zY2VuZVwiLCBcImRiOi8vYXNzZXRzL2xldmVscy9Cb3NzTGV2ZWwuc2NlbmVcIi4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHNhdmVfYXMgYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEZXN0aW5hdGlvbiBwYXRoIGZvciBzY2VuZSBjb3B5IChSRVFVSVJFRCBmb3Igc2F2ZV9hcyBhY3Rpb24pLiBDcmVhdGVzIGR1cGxpY2F0ZSBvZiBjdXJyZW50IHNjZW5lLiBFeGFtcGxlczogXCJkYjovL2Fzc2V0cy9zY2VuZXMvR2FtZUJhY2t1cC5zY2VuZVwiLCBcImRiOi8vYXNzZXRzL3ZlcnNpb25zL3YxX0dhbWUuc2NlbmVcIi4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gMi4gU2NlbmUgSGllcmFyY2h5IC0gR2V0IHNjZW5lIHN0cnVjdHVyZVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzY2VuZV9oaWVyYXJjaHknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU0NFTkUgSElFUkFSQ0hZOiBHZXQgdGhlIGNvbXBsZXRlIGhpZXJhcmNoeSBvZiBjdXJyZW50IHNjZW5lIHdpdGggb3B0aW9uYWwgY29tcG9uZW50IGluZm9ybWF0aW9uLiBVc2UgdGhpcyB0byBpbnNwZWN0IHNjZW5lIHN0cnVjdHVyZS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlQ29tcG9uZW50czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Nob3cgY29tcG9uZW50IGRldGFpbHMgaW4gaGllcmFyY2h5IG91dHB1dC4gdHJ1ZSA9IGZ1bGwgaW5mb3JtYXRpb24gaW5jbHVkaW5nIGNvbXBvbmVudCB0eXBlcyBhbmQgcHJvcGVydGllcyAoZGV0YWlsZWQgYnV0IHZlcmJvc2UpLCBmYWxzZSA9IGJhc2ljIHN0cnVjdHVyZSBvbmx5IChmYXN0ZXIsIGNsZWFuZXIgb3V0cHV0KS4gUmVjb21tZW5kZWQ6IGZhbHNlIGZvciBvdmVydmlldywgdHJ1ZSBmb3IgYW5hbHlzaXMuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gMy4gU2NlbmUgRXhlY3V0aW9uIENvbnRyb2wgLSBFeGVjdXRlIHNjcmlwdHMgYW5kIG1ldGhvZHNcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2NlbmVfZXhlY3V0aW9uX2NvbnRyb2wnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRVhFQ1VUSU9OIENPTlRST0w6IEV4ZWN1dGUgY29tcG9uZW50IG1ldGhvZHMsIHNjZW5lIHNjcmlwdHMsIG9yIHJlc3RvcmUgcHJlZmFiIGluc3RhbmNlcy4gVXNlIHRoaXMgZm9yIHJ1bm5pbmcgY3VzdG9tIGxvZ2ljIGFuZCBtYW5hZ2luZyBwcmVmYWIgc3luY2hyb25pemF0aW9uLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZXhlY3V0ZV9jb21wb25lbnRfbWV0aG9kJywgJ2V4ZWN1dGVfc2NlbmVfc2NyaXB0JywgJ3Jlc3RvcmVfcHJlZmFiJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBY3Rpb246IFwiZXhlY3V0ZV9jb21wb25lbnRfbWV0aG9kXCIgPSBjYWxsIG1ldGhvZCBvbiBjb21wb25lbnQgfCBcImV4ZWN1dGVfc2NlbmVfc2NyaXB0XCIgPSBydW4gc2NlbmUgcGx1Z2luIG1ldGhvZCB8IFwicmVzdG9yZV9wcmVmYWJcIiA9IHN5bmMgcHJlZmFiIGluc3RhbmNlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGVjdXRlX2NvbXBvbmVudF9tZXRob2QgYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgVVVJRCB0byBleGVjdXRlIG1ldGhvZCBvbiAoZXhlY3V0ZV9jb21wb25lbnRfbWV0aG9kIGFjdGlvbiBvbmx5KS4gR2V0IGZyb20gY29tcG9uZW50IHRvb2xzLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNZXRob2QgbmFtZSB0byBleGVjdXRlLiBGb3IgZXhlY3V0ZV9jb21wb25lbnRfbWV0aG9kOiBjb21wb25lbnQgbWV0aG9kIG5hbWUuIEZvciBleGVjdXRlX3NjZW5lX3NjcmlwdDogcGx1Z2luIG5hbWUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTY3JpcHQgbWV0aG9kIG5hbWUgdG8gY2FsbCAoZXhlY3V0ZV9zY2VuZV9zY3JpcHQgYWN0aW9uIG9ubHkpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZC4gRWFjaCBlbGVtZW50IHdpbGwgYmUgcGFzc2VkIGFzIGEgcGFyYW1ldGVyIHRvIHRoZSBtZXRob2QgY2FsbC4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHJlc3RvcmVfcHJlZmFiIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBpbnN0YW5jZSBub2RlIFVVSUQgKHJlc3RvcmVfcHJlZmFiIGFjdGlvbiBvbmx5KS4gVGhlIG5vZGUgdGhhdCBzaG91bGQgYmUgc3luY2hyb25pemVkIHdpdGggaXRzIHByZWZhYi4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgVVVJRCAocmVzdG9yZV9wcmVmYWIgYWN0aW9uIG9ubHkpLiBUaGUgc291cmNlIHByZWZhYiB0byByZXN0b3JlIGZyb20uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIDQuIFNjZW5lIFN0YXRlIE1hbmFnZW1lbnQgLSBTbmFwc2hvdHMgYW5kIHVuZG8vcmVkb1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzY2VuZV9zdGF0ZV9tYW5hZ2VtZW50JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NUQVRFIE1BTkFHRU1FTlQ6IENyZWF0ZSBzbmFwc2hvdHMsIG1hbmFnZSB1bmRvL3JlZG8gb3BlcmF0aW9ucywgYW5kIGNvbnRyb2wgc2NlbmUgcmVsb2FkLiBVc2UgdGhpcyBmb3IgdmVyc2lvbiBjb250cm9sIGFuZCBzdGF0ZSB0cmFja2luZy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2NyZWF0ZV9zbmFwc2hvdCcsICdhYm9ydF9zbmFwc2hvdCcsICdiZWdpbl91bmRvJywgJ2VuZF91bmRvJywgJ2NhbmNlbF91bmRvJywgJ3NvZnRfcmVsb2FkJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBY3Rpb246IFwiY3JlYXRlX3NuYXBzaG90XCIgPSBzYXZlIHNjZW5lIHN0YXRlIHwgXCJhYm9ydF9zbmFwc2hvdFwiID0gY2FuY2VsIHNuYXBzaG90IHwgXCJiZWdpbl91bmRvXCIgPSBzdGFydCByZWNvcmRpbmcgfCBcImVuZF91bmRvXCIgPSBmaW5pc2ggcmVjb3JkaW5nIHwgXCJjYW5jZWxfdW5kb1wiID0gY2FuY2VsIHJlY29yZGluZyB8IFwic29mdF9yZWxvYWRcIiA9IHJlbG9hZCBzY2VuZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgdW5kbyBvcGVyYXRpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIHRvIHJlY29yZCBmb3IgdW5kbyAoYmVnaW5fdW5kbyBhY3Rpb24gb25seSkuIENoYW5nZXMgdG8gdGhpcyBub2RlIHdpbGwgYmUgdHJhY2tlZC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdW5kb0lkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVbmRvIHJlY29yZGluZyBJRCBmcm9tIGJlZ2luX3VuZG8gb3BlcmF0aW9uIChlbmRfdW5kby9jYW5jZWxfdW5kbyBhY3Rpb25zIG9ubHkpLiBVc2VkIHRvIGlkZW50aWZ5IHdoaWNoIHJlY29yZGluZyB0byBjb21wbGV0ZSBvciBjYW5jZWwuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIDUuIFNjZW5lIFF1ZXJ5IFN5c3RlbSAtIFNjZW5lIHN0YXR1cyBhbmQgaW5mb3JtYXRpb25cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2NlbmVfcXVlcnlfc3lzdGVtJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1FVRVJZIFNZU1RFTTogR2V0IHNjZW5lIHN0YXR1cywgYXZhaWxhYmxlIGNsYXNzZXMvY29tcG9uZW50cywgYW5kIGZpbmQgbm9kZXMgYnkgYXNzZXQgdXNhZ2UuIFVzZSB0aGlzIGZvciBzY2VuZSBpbnNwZWN0aW9uIGFuZCBhbmFseXNpcy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2NoZWNrX3JlYWR5JywgJ2NoZWNrX2RpcnR5JywgJ2xpc3RfY2xhc3NlcycsICdsaXN0X2NvbXBvbmVudHMnLCAnY2hlY2tfc2NyaXB0JywgJ2ZpbmRfbm9kZXNfYnlfYXNzZXQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjdGlvbjogXCJjaGVja19yZWFkeVwiID0gaXMgc2NlbmUgcmVhZHkgfCBcImNoZWNrX2RpcnR5XCIgPSBoYXMgdW5zYXZlZCBjaGFuZ2VzIHwgXCJsaXN0X2NsYXNzZXNcIiA9IGdldCByZWdpc3RlcmVkIGNsYXNzZXMgfCBcImxpc3RfY29tcG9uZW50c1wiID0gZ2V0IGF2YWlsYWJsZSBjb21wb25lbnRzIHwgXCJjaGVja19zY3JpcHRcIiA9IHZlcmlmeSBzY3JpcHQgZXhpc3RzIHwgXCJmaW5kX25vZGVzX2J5X2Fzc2V0XCIgPSBmaW5kIG5vZGVzIHVzaW5nIGFzc2V0J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBsaXN0X2NsYXNzZXMgYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbmRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaWx0ZXIgY2xhc3NlcyB0aGF0IGV4dGVuZCB0aGlzIGJhc2UgY2xhc3MgKGxpc3RfY2xhc3NlcyBhY3Rpb24gb25seSkuIEV4YW1wbGU6IFwiY2MuQ29tcG9uZW50XCIgc2hvd3MgYWxsIGNvbXBvbmVudCBjbGFzc2VzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBjaGVja19zY3JpcHQgYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NjcmlwdCBjbGFzcyBuYW1lIHRvIHZlcmlmeSAoY2hlY2tfc2NyaXB0IGFjdGlvbiBvbmx5KS4gRXhhbXBsZTogXCJQbGF5ZXJDb250cm9sbGVyXCInXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGZpbmRfbm9kZXNfYnlfYXNzZXQgYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQgdG8gc2VhcmNoIGZvciB1c2FnZSAoZmluZF9ub2Rlc19ieV9hc3NldCBhY3Rpb24gb25seSkuIEdldCBVVUlEIGZyb20gYXNzZXQgdG9vbHMuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIDYuIEluc3BlY3QgU2NlbmUgLSBEZWVwIGluc3BlY3Rpb24gb2Ygc2NlbmUgc3RydWN0dXJlIGFuZCBhbGwgY29tcG9uZW50IHByb3BlcnRpZXNcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnaW5zcGVjdF9zY2VuZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJTlNQRUNUIFNDRU5FOiBEZWVwbHkgaW5zcGVjdHMgYW5kIHJlc29sdmVzIHRoZSBmdWxsIHNjZW5lIGhpZXJhcmNoeSwgbm9kZXMsIGNvbXBvbmVudHMsIGFuZCBhbGwgcHJvcGVydHkgdmFsdWVzIChpbmNsdWRpbmcgbmVzdGVkIG9iamVjdHMgbGlrZSBIZWxwZXJfSWRTZWxlY3RvciwgY29uZmlncywgYXNzZXQgVVVJRHMsIGFuZCBhcnJheXMpLiBDYW4gaW5zcGVjdCB0aGUgYWN0aXZlIG9wZW4gc2NlbmUgb3IgYW55IHNwZWNpZmljIHNjZW5lIGZpbGUuIFJldHVybnMgYSBodW1hbi9BSS1yZWFkYWJsZSBpbmRlbnRlZCB0cmVlIG9yIGZ1bGwgc3RydWN0dXJlZCBKU09OLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lUGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3B0aW9uYWwuIFNjZW5lIGFzc2V0IHBhdGggdG8gaW5zcGVjdCAoZS5nLiBcImRiOi8vYXNzZXRzL3NjZW5lcy9nYW1lLnNjZW5lXCIgb3IgXCJhc3NldHMvc2NlbmVzL2dhbWUuc2NlbmVcIikuIElmIG9taXR0ZWQsIGluc3BlY3RzIGN1cnJlbnRseSBhY3RpdmUgb3BlbiBzY2VuZSBpbiBlZGl0b3IuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsndHJlZScsICdqc29uJywgJ3N1bW1hcnknXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAndHJlZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPdXRwdXQgZm9ybWF0OiBcInRyZWVcIiA9IHJlYWRhYmxlIGluZGVudGVkIGhpZXJhcmNoeSB3aXRoIGNvbXBvbmVudCBwcm9wZXJ0aWVzIHN1bW1hcnkgKFJlY29tbWVuZGVkKSB8IFwianNvblwiID0gZnVsbHkgcmVzb2x2ZWQgcmVjdXJzaXZlIEpTT04gb2JqZWN0IHRyZWUgfCBcInN1bW1hcnlcIiA9IHF1aWNrIG92ZXJ2aWV3IG9mIG5vZGUgY291bnQgYW5kIHJvb3Qgc3RydWN0dXJlcydcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJOb2RlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcHRpb25hbC4gRmlsdGVyIHRvIG9ubHkgaW5zcGVjdCBhIHNwZWNpZmljIG5vZGUgKGJ5IG5hbWUgb3IgVVVJRCkgYW5kIGl0cyBjaGlsZHJlbi4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4RGVwdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAyMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gaGllcmFyY2h5IGRlcHRoIHRvIHRyYXZlcnNlLiBEZWZhdWx0OiAyMC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUNvbXBvbmVudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1doZXRoZXIgdG8gaW5jbHVkZSBjb21wb25lbnQgaW5mb3JtYXRpb24uIERlZmF1bHQ6IHRydWUuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGV0aGVyIHRvIGluY2x1ZGUgY29tcG9uZW50IHByb3BlcnR5IHZhbHVlcyBpbiBkZXRhaWwuIERlZmF1bHQ6IHRydWUuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnc2NlbmVfbWFuYWdlbWVudCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaGFuZGxlU2NlbmVNYW5hZ2VtZW50KGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnc2NlbmVfaGllcmFyY2h5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRTY2VuZUhpZXJhcmNoeShhcmdzLmluY2x1ZGVDb21wb25lbnRzKTtcbiAgICAgICAgICAgIGNhc2UgJ3NjZW5lX2V4ZWN1dGlvbl9jb250cm9sJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVFeGVjdXRpb25Db250cm9sKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnc2NlbmVfc3RhdGVfbWFuYWdlbWVudCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaGFuZGxlU3RhdGVNYW5hZ2VtZW50KGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnc2NlbmVfcXVlcnlfc3lzdGVtJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVRdWVyeVN5c3RlbShhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ2luc3BlY3Rfc2NlbmUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmluc3BlY3RTY2VuZShhcmdzIHx8IHt9KTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEN1cnJlbnRTY2VuZSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8g55u05o6l5L2/55SoIHF1ZXJ5LW5vZGUtdHJlZSDmnaXojrflj5blnLrmma/kv6Hmga/vvIjov5nkuKrmlrnms5Xlt7Lnu4/pqozor4Hlj6/nlKjvvIlcbiAgICAgICAgICAgIGNvbnN0IHRyZWU6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgaWYgKHRyZWUgJiYgdHJlZS51dWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogdHJlZS5uYW1lIHx8ICdDdXJyZW50IFNjZW5lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHRyZWUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHRyZWUudHlwZSB8fCAnY2MuU2NlbmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiB0cmVlLmFjdGl2ZSAhPT0gdW5kZWZpbmVkID8gdHJlZS5hY3RpdmUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvdW50OiB0cmVlLmNoaWxkcmVuID8gdHJlZS5jaGlsZHJlbi5sZW5ndGggOiAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBzY2VuZSBkYXRhIGF2YWlsYWJsZScgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIC8vIOWkh+eUqOaWueahiO+8muS9v+eUqOWcuuaZr+iEmuacrFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldEN1cnJlbnRTY2VuZUluZm8nLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEaXJlY3QgQVBJIGZhaWxlZDogJHtlcnIubWVzc2FnZX0sIFNjZW5lIHNjcmlwdCBmYWlsZWQ6ICR7ZXJyMi5tZXNzYWdlfWAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0U2NlbmVMaXN0KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHRzOiBhbnlbXSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHtcbiAgICAgICAgICAgICAgICBwYXR0ZXJuOiAnZGI6Ly9hc3NldHMvKiovKi5zY2VuZSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmVzOiBTY2VuZUluZm9bXSA9IHJlc3VsdHMubWFwKGFzc2V0ID0+ICh7XG4gICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZSxcbiAgICAgICAgICAgICAgICBwYXRoOiBhc3NldC51cmwsXG4gICAgICAgICAgICAgICAgdXVpZDogYXNzZXQudXVpZFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc2NlbmVzIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG9wZW5TY2VuZShzY2VuZVBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDpppblhYjojrflj5blnLrmma/nmoRVVUlEXG4gICAgICAgICAgICBjb25zdCB1dWlkOiBzdHJpbmcgfCBudWxsID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHNjZW5lUGF0aCk7XG4gICAgICAgICAgICBpZiAoIXV1aWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdTY2VuZSBub3QgZm91bmQnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIOS9v+eUqOato+ehrueahCBzY2VuZSBBUEkg5omT5byA5Zy65pmvICjpnIDopoFVVUlEKVxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnb3Blbi1zY2VuZScsIHV1aWQpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFNjZW5lIG9wZW5lZDogJHtzY2VuZVBhdGh9YCB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlU2NlbmUoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NhdmUtc2NlbmUnKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdTY2VuZSBzYXZlZCBzdWNjZXNzZnVsbHknIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVNjZW5lKHNjZW5lTmFtZTogc3RyaW5nLCBzYXZlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8g56Gu5L+d6Lev5b6E5LulLnNjZW5l57uT5bC+XG4gICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gc2F2ZVBhdGguZW5kc1dpdGgoJy5zY2VuZScpID8gc2F2ZVBhdGggOiBgJHtzYXZlUGF0aH0vJHtzY2VuZU5hbWV9LnNjZW5lYDtcblxuICAgICAgICAvLyDkvb/nlKjmraPnoa7nmoRDb2NvcyBDcmVhdG9yIDMuOOWcuuaZr+agvOW8j1xuICAgICAgICBjb25zdCBzY2VuZUNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlNjZW5lQXNzZXRcIixcbiAgICAgICAgICAgICAgICBcIl9uYW1lXCI6IHNjZW5lTmFtZSxcbiAgICAgICAgICAgICAgICBcIl9vYmpGbGFnc1wiOiAwLFxuICAgICAgICAgICAgICAgIFwiX19lZGl0b3JFeHRyYXNfX1wiOiB7fSxcbiAgICAgICAgICAgICAgICBcIl9uYXRpdmVcIjogXCJcIixcbiAgICAgICAgICAgICAgICBcInNjZW5lXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX2lkX19cIjogMVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlNjZW5lXCIsXG4gICAgICAgICAgICAgICAgXCJfbmFtZVwiOiBzY2VuZU5hbWUsXG4gICAgICAgICAgICAgICAgXCJfb2JqRmxhZ3NcIjogMCxcbiAgICAgICAgICAgICAgICBcIl9fZWRpdG9yRXh0cmFzX19cIjoge30sXG4gICAgICAgICAgICAgICAgXCJfcGFyZW50XCI6IG51bGwsXG4gICAgICAgICAgICAgICAgXCJfY2hpbGRyZW5cIjogW10sXG4gICAgICAgICAgICAgICAgXCJfYWN0aXZlXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgXCJfY29tcG9uZW50c1wiOiBbXSxcbiAgICAgICAgICAgICAgICBcIl9wcmVmYWJcIjogbnVsbCxcbiAgICAgICAgICAgICAgICBcIl9scG9zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcInpcIjogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCJfbHJvdFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5RdWF0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIFwid1wiOiAxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIl9sc2NhbGVcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjM1wiLFxuICAgICAgICAgICAgICAgICAgICBcInhcIjogMSxcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDEsXG4gICAgICAgICAgICAgICAgICAgIFwielwiOiAxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIl9tb2JpbGl0eVwiOiAwLFxuICAgICAgICAgICAgICAgIFwiX2xheWVyXCI6IDEwNzM3NDE4MjQsXG4gICAgICAgICAgICAgICAgXCJfZXVsZXJcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjM1wiLFxuICAgICAgICAgICAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIFwielwiOiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcImF1dG9SZWxlYXNlQXNzZXRzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwiX2dsb2JhbHNcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiAyXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIl9pZFwiOiBcInNjZW5lXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlNjZW5lR2xvYmFsc1wiLFxuICAgICAgICAgICAgICAgIFwiYW1iaWVudFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IDNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwic2t5Ym94XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX2lkX19cIjogNFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCJmb2dcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiA1XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIm9jdHJlZVwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IDZcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5BbWJpZW50SW5mb1wiLFxuICAgICAgICAgICAgICAgIFwiX3NreUNvbG9ySERSXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDAuNSxcbiAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDAuOCxcbiAgICAgICAgICAgICAgICAgICAgXCJ3XCI6IDAuNTIwODMzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIl9za3lDb2xvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWM0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgIFwieVwiOiAwLjUsXG4gICAgICAgICAgICAgICAgICAgIFwielwiOiAwLjgsXG4gICAgICAgICAgICAgICAgICAgIFwid1wiOiAwLjUyMDgzM1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCJfc2t5SWxsdW1IRFJcIjogMjAwMDAsXG4gICAgICAgICAgICAgICAgXCJfc2t5SWxsdW1cIjogMjAwMDAsXG4gICAgICAgICAgICAgICAgXCJfZ3JvdW5kQWxiZWRvSERSXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgXCJ3XCI6IDFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiX2dyb3VuZEFsYmVkb1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWM0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgIFwieVwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgIFwielwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgIFwid1wiOiAxXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuU2t5Ym94SW5mb1wiLFxuICAgICAgICAgICAgICAgIFwiX2VudkxpZ2h0aW5nVHlwZVwiOiAwLFxuICAgICAgICAgICAgICAgIFwiX2Vudm1hcEhEUlwiOiBudWxsLFxuICAgICAgICAgICAgICAgIFwiX2Vudm1hcFwiOiBudWxsLFxuICAgICAgICAgICAgICAgIFwiX2Vudm1hcExvZENvdW50XCI6IDAsXG4gICAgICAgICAgICAgICAgXCJfZGlmZnVzZU1hcEhEUlwiOiBudWxsLFxuICAgICAgICAgICAgICAgIFwiX2RpZmZ1c2VNYXBcIjogbnVsbCxcbiAgICAgICAgICAgICAgICBcIl9lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwiX3VzZUhEUlwiOiB0cnVlLFxuICAgICAgICAgICAgICAgIFwiX2VkaXRhYmxlTWF0ZXJpYWxcIjogbnVsbCxcbiAgICAgICAgICAgICAgICBcIl9yZWZsZWN0aW9uSERSXCI6IG51bGwsXG4gICAgICAgICAgICAgICAgXCJfcmVmbGVjdGlvbk1hcFwiOiBudWxsLFxuICAgICAgICAgICAgICAgIFwiX3JvdGF0aW9uQW5nbGVcIjogMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuRm9nSW5mb1wiLFxuICAgICAgICAgICAgICAgIFwiX3R5cGVcIjogMCxcbiAgICAgICAgICAgICAgICBcIl9mb2dDb2xvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5Db2xvclwiLFxuICAgICAgICAgICAgICAgICAgICBcInJcIjogMjAwLFxuICAgICAgICAgICAgICAgICAgICBcImdcIjogMjAwLFxuICAgICAgICAgICAgICAgICAgICBcImJcIjogMjAwLFxuICAgICAgICAgICAgICAgICAgICBcImFcIjogMjU1XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIl9lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwiX2ZvZ0RlbnNpdHlcIjogMC4zLFxuICAgICAgICAgICAgICAgIFwiX2ZvZ1N0YXJ0XCI6IDAuNSxcbiAgICAgICAgICAgICAgICBcIl9mb2dFbmRcIjogMzAwLFxuICAgICAgICAgICAgICAgIFwiX2ZvZ0F0dGVuXCI6IDUsXG4gICAgICAgICAgICAgICAgXCJfZm9nVG9wXCI6IDEuNSxcbiAgICAgICAgICAgICAgICBcIl9mb2dSYW5nZVwiOiAxLjIsXG4gICAgICAgICAgICAgICAgXCJfYWNjdXJhdGVcIjogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLk9jdHJlZUluZm9cIixcbiAgICAgICAgICAgICAgICBcIl9lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwiX21pblBvc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWMzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwieFwiOiAtMTAyNCxcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IC0xMDI0LFxuICAgICAgICAgICAgICAgICAgICBcInpcIjogLTEwMjRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiX21heFBvc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWMzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwieFwiOiAxMDI0LFxuICAgICAgICAgICAgICAgICAgICBcInlcIjogMTAyNCxcbiAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDEwMjRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiX2RlcHRoXCI6IDhcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgbnVsbCwgMik7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0JywgZnVsbFBhdGgsIHNjZW5lQ29udGVudCk7XG4gICAgICAgICAgICAvLyBWZXJpZnkgc2NlbmUgY3JlYXRpb24gYnkgY2hlY2tpbmcgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNjZW5lTGlzdCA9IGF3YWl0IHRoaXMuZ2V0U2NlbmVMaXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3JlYXRlZFNjZW5lID0gc2NlbmVMaXN0LmRhdGE/LmZpbmQoKHNjZW5lOiBhbnkpID0+IHNjZW5lLnV1aWQgPT09IHJlc3VsdC51dWlkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogcmVzdWx0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHNjZW5lTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTY2VuZSAnJHtzY2VuZU5hbWV9JyBjcmVhdGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZVZlcmlmaWVkOiAhIWNyZWF0ZWRTY2VuZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25EYXRhOiBjcmVhdGVkU2NlbmVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHJlc3VsdC51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBzY2VuZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2NlbmUgJyR7c2NlbmVOYW1lfScgY3JlYXRlZCBzdWNjZXNzZnVsbHkgKHZlcmlmaWNhdGlvbiBmYWlsZWQpYFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0U2NlbmVIaWVyYXJjaHkoaW5jbHVkZUNvbXBvbmVudHM6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDkvJjlhYjlsJ3or5Xkvb/nlKggRWRpdG9yIEFQSSDmn6Xor6LlnLrmma/oioLngrnmoJFcbiAgICAgICAgICAgIGNvbnN0IHRyZWU6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgaWYgKHRyZWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSB0aGlzLmJ1aWxkSGllcmFyY2h5KHRyZWUsIGluY2x1ZGVDb21wb25lbnRzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBoaWVyYXJjaHlcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBzY2VuZSBoaWVyYXJjaHkgYXZhaWxhYmxlJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgLy8g5aSH55So5pa55qGI77ya5L2/55So5Zy65pmv6ISa5pysXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0U2NlbmVIaWVyYXJjaHknLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbaW5jbHVkZUNvbXBvbmVudHNdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBidWlsZEhpZXJhcmNoeShub2RlOiBhbnksIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuKTogYW55IHtcbiAgICAgICAgY29uc3Qgbm9kZUluZm86IGFueSA9IHtcbiAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IG5vZGUudHlwZSxcbiAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICBjaGlsZHJlbjogW11cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaW5jbHVkZUNvbXBvbmVudHMgJiYgbm9kZS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgIG5vZGVJbmZvLmNvbXBvbmVudHMgPSBub2RlLl9fY29tcHNfXy5tYXAoKGNvbXA6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBjb21wLl9fdHlwZV9fIHx8ICdVbmtub3duJyxcbiAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXAuZW5hYmxlZCA6IHRydWVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBub2RlSW5mby5jaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PiBcbiAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkSGllcmFyY2h5KGNoaWxkLCBpbmNsdWRlQ29tcG9uZW50cylcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9kZUluZm87XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlU2NlbmVBcyhwYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gc2F2ZS1hcy1zY2VuZSBBUEkg5LiN5o6l5Y+X6Lev5b6E5Y+C5pWw77yM5Lya5by55Ye65a+56K+d5qGG6K6p55So5oi36YCJ5oupXG4gICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdzYXZlLWFzLXNjZW5lJyk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2NlbmUgc2F2ZS1hcyBkaWFsb2cgb3BlbmVkYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNsb3NlU2NlbmUoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2Nsb3NlLXNjZW5lJyk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1NjZW5lIGNsb3NlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlQ29tcG9uZW50TWV0aG9kKHV1aWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBhcmdzOiBhbnlbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtY29tcG9uZW50LW1ldGhvZCcsIHtcbiAgICAgICAgICAgICAgICB1dWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgYXJnczogYXJnc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0LFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgbWV0aG9kICR7bmFtZX0gZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjZW5lU2NyaXB0KG5hbWU6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgICAgICBhcmdzOiBhcmdzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFNjZW5lIHNjcmlwdCAke25hbWV9LiR7bWV0aG9kfSBleGVjdXRlZCBzdWNjZXNzZnVsbHlgXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZXN0b3JlUHJlZmFiKG5vZGVVdWlkOiBzdHJpbmcsIGFzc2V0VXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncmVzdG9yZS1wcmVmYWInLCBub2RlVXVpZCwgYXNzZXRVdWlkKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdCB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzY2VuZVNuYXBzaG90KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NuYXBzaG90Jyk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0LFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTY2VuZSBzbmFwc2hvdCBjcmVhdGVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNjZW5lU25hcHNob3RBYm9ydCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc25hcHNob3QtYWJvcnQnKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdTY2VuZSBzbmFwc2hvdCBhYm9ydGVkJyB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBiZWdpblVuZG9SZWNvcmRpbmcobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB1bmRvSWQ6IHN0cmluZyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2JlZ2luLXJlY29yZGluZycsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHVuZG9JZCwgbm9kZVV1aWQgfSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgVW5kbyByZWNvcmRpbmcgc3RhcnRlZCBmb3Igbm9kZSAke25vZGVVdWlkfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGVuZFVuZG9SZWNvcmRpbmcodW5kb0lkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZW5kLXJlY29yZGluZycsIHVuZG9JZCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1bmRvSWQgfSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnVW5kbyByZWNvcmRpbmcgZW5kZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY2FuY2VsVW5kb1JlY29yZGluZyh1bmRvSWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjYW5jZWwtcmVjb3JkaW5nJywgdW5kb0lkKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHVuZG9JZCB9LFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdVbmRvIHJlY29yZGluZyBjYW5jZWxsZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc29mdFJlbG9hZFNjZW5lKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzb2Z0LXJlbG9hZCcpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ1NjZW5lIHNvZnQgcmVsb2FkZWQgc3VjY2Vzc2Z1bGx5JyB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNjZW5lUmVhZHkoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktaXMtcmVhZHknKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgaXNSZWFkeTogcmVzdWx0IH0sIG1lc3NhZ2U6IGBTY2VuZSByZWFkeSBzdGF0dXM6ICR7cmVzdWx0fWAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlTY2VuZURpcnR5KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWRpcnR5Jyk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGlzRGlydHk6IHJlc3VsdCB9LCBtZXNzYWdlOiBgU2NlbmUgZGlydHkgc3RhdHVzOiAke3Jlc3VsdH1gIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2NlbmVDbGFzc2VzKGV4dGVuZHNDbGFzczogc3RyaW5nIHwgdW5kZWZpbmVkKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktY2xhc3NlcycsIHt9KTtcbiAgICAgICAgICAgIC8vIEZpbHRlciBieSBleHRlbmRzIGNsYXNzIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBsZXQgY2xhc3NlcyA9IHJlc3VsdDtcbiAgICAgICAgICAgIGlmIChleHRlbmRzQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICBjbGFzc2VzID0gcmVzdWx0LmZpbHRlcigoY2xzOiBhbnkpID0+IGNscy5leHRlbmRzID09PSBleHRlbmRzQ2xhc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgY2xhc3NlcywgdG90YWw6IGNsYXNzZXMubGVuZ3RoIH0sXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7Y2xhc3Nlcy5sZW5ndGh9IGNsYXNzZXMke2V4dGVuZHNDbGFzcyA/IGAgZXh0ZW5kaW5nICR7ZXh0ZW5kc0NsYXNzfWAgOiAnJ31gXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNjZW5lQ29tcG9uZW50cygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1jb21wb25lbnRzJyk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBjb21wb25lbnRzOiByZXN1bHQsIHRvdGFsOiByZXN1bHQubGVuZ3RoIH0sXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7cmVzdWx0Lmxlbmd0aH0gY29tcG9uZW50cyBpbiBzY2VuZWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5Q29tcG9uZW50SGFzU2NyaXB0KGNsYXNzTmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktY29tcG9uZW50LWhhcy1zY3JpcHQnLCBjbGFzc05hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgaGFzU2NyaXB0OiByZXN1bHQsIGNsYXNzTmFtZSB9LFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTY3JpcHQgJHtjbGFzc05hbWV9ICR7cmVzdWx0ID8gJ2V4aXN0cycgOiAnZG9lcyBub3QgZXhpc3QnfSBpbiBjb21wb25lbnQgbGlzdGBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5Tm9kZXNCeUFzc2V0VXVpZChhc3NldFV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGVzLWJ5LWFzc2V0LXV1aWQnLCBhc3NldFV1aWQpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgbm9kZVV1aWRzOiByZXN1bHQsIGFzc2V0VXVpZCwgY291bnQ6IHJlc3VsdC5sZW5ndGggfSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHtyZXN1bHQubGVuZ3RofSBub2RlcyB1c2luZyBhc3NldCAke2Fzc2V0VXVpZH1gXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTmV3IGhhbmRsZXIgbWV0aG9kc1xuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlU2NlbmVNYW5hZ2VtZW50KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHsgYWN0aW9uIH0gPSBhcmdzO1xuICAgICAgICBcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jdXJyZW50JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRDdXJyZW50U2NlbmUoKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9saXN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRTY2VuZUxpc3QoKTtcbiAgICAgICAgICAgIGNhc2UgJ29wZW4nOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLm9wZW5TY2VuZShhcmdzLnNjZW5lUGF0aCk7XG4gICAgICAgICAgICBjYXNlICdzYXZlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zYXZlU2NlbmUoKTtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlU2NlbmUoYXJncy5zY2VuZU5hbWUsIGFyZ3Muc2F2ZVBhdGgpO1xuICAgICAgICAgICAgY2FzZSAnc2F2ZV9hcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2F2ZVNjZW5lQXMoYXJncy5wYXRoKTtcbiAgICAgICAgICAgIGNhc2UgJ2Nsb3NlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jbG9zZVNjZW5lKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gc2NlbmUgbWFuYWdlbWVudCBhY3Rpb246ICR7YWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlRXhlY3V0aW9uQ29udHJvbChhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB7IGFjdGlvbiB9ID0gYXJncztcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdleGVjdXRlX2NvbXBvbmVudF9tZXRob2QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVDb21wb25lbnRNZXRob2QoYXJncy51dWlkLCBhcmdzLm5hbWUsIGFyZ3MuYXJncyk7XG4gICAgICAgICAgICBjYXNlICdleGVjdXRlX3NjZW5lX3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZVNjZW5lU2NyaXB0KGFyZ3MubmFtZSwgYXJncy5tZXRob2QsIGFyZ3MuYXJncyk7XG4gICAgICAgICAgICBjYXNlICdyZXN0b3JlX3ByZWZhYic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzdG9yZVByZWZhYihhcmdzLm5vZGVVdWlkLCBhcmdzLmFzc2V0VXVpZCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gZXhlY3V0aW9uIGNvbnRyb2wgYWN0aW9uOiAke2FjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZVN0YXRlTWFuYWdlbWVudChhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB7IGFjdGlvbiB9ID0gYXJncztcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGVfc25hcHNob3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNjZW5lU25hcHNob3QoKTtcbiAgICAgICAgICAgIGNhc2UgJ2Fib3J0X3NuYXBzaG90JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zY2VuZVNuYXBzaG90QWJvcnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2JlZ2luX3VuZG8nOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmJlZ2luVW5kb1JlY29yZGluZyhhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgIGNhc2UgJ2VuZF91bmRvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5lbmRVbmRvUmVjb3JkaW5nKGFyZ3MudW5kb0lkKTtcbiAgICAgICAgICAgIGNhc2UgJ2NhbmNlbF91bmRvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jYW5jZWxVbmRvUmVjb3JkaW5nKGFyZ3MudW5kb0lkKTtcbiAgICAgICAgICAgIGNhc2UgJ3NvZnRfcmVsb2FkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zb2Z0UmVsb2FkU2NlbmUoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBzdGF0ZSBtYW5hZ2VtZW50IGFjdGlvbjogJHthY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVRdWVyeVN5c3RlbShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB7IGFjdGlvbiB9ID0gYXJncztcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdjaGVja19yZWFkeSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTY2VuZVJlYWR5KCk7XG4gICAgICAgICAgICBjYXNlICdjaGVja19kaXJ0eSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTY2VuZURpcnR5KCk7XG4gICAgICAgICAgICBjYXNlICdsaXN0X2NsYXNzZXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U2NlbmVDbGFzc2VzKGFyZ3MuZXh0ZW5kcyk7XG4gICAgICAgICAgICBjYXNlICdsaXN0X2NvbXBvbmVudHMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U2NlbmVDb21wb25lbnRzKCk7XG4gICAgICAgICAgICBjYXNlICdjaGVja19zY3JpcHQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5Q29tcG9uZW50SGFzU2NyaXB0KGFyZ3MuY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIGNhc2UgJ2ZpbmRfbm9kZXNfYnlfYXNzZXQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5Tm9kZXNCeUFzc2V0VXVpZChhcmdzLmFzc2V0VXVpZCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gcXVlcnkgc3lzdGVtIGFjdGlvbjogJHthY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbnNwZWN0U2NlbmUoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdCA9IGFyZ3MuZm9ybWF0IHx8ICd0cmVlJztcbiAgICAgICAgICAgIGNvbnN0IG1heERlcHRoID0gdHlwZW9mIGFyZ3MubWF4RGVwdGggPT09ICdudW1iZXInID8gYXJncy5tYXhEZXB0aCA6IDIwO1xuICAgICAgICAgICAgY29uc3QgaW5jbHVkZUNvbXBvbmVudHMgPSBhcmdzLmluY2x1ZGVDb21wb25lbnRzICE9PSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IGluY2x1ZGVQcm9wZXJ0aWVzID0gYXJncy5pbmNsdWRlUHJvcGVydGllcyAhPT0gZmFsc2U7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXJOb2RlID0gYXJncy5maWx0ZXJOb2RlID8gU3RyaW5nKGFyZ3MuZmlsdGVyTm9kZSkudHJpbSgpIDogbnVsbDtcblxuICAgICAgICAgICAgbGV0IHRhcmdldFNjZW5lRmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgICAgICAgICAgbGV0IHNjZW5lQXNzZXRVcmw6IHN0cmluZyA9IGFyZ3Muc2NlbmVQYXRoIHx8ICcnO1xuXG4gICAgICAgICAgICBpZiAoIXNjZW5lQXNzZXRVcmwpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50U2NlbmUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1jdXJyZW50LXNjZW5lJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U2NlbmUgJiYgY3VycmVudFNjZW5lLnVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmVBc3NldFVybCA9IGN1cnJlbnRTY2VuZS51cmw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzY2VuZUFzc2V0VXJsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNjZW5lQXNzZXRVcmwuc3RhcnRzV2l0aCgnZGI6Ly8nKSkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHNjZW5lQXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFzc2V0SW5mbyAmJiBhc3NldEluZm8uZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNjZW5lRmlsZVBhdGggPSBhc3NldEluZm8uZmlsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aC5pc0Fic29sdXRlKHNjZW5lQXNzZXRVcmwpICYmIGZzLmV4aXN0c1N5bmMoc2NlbmVBc3NldFVybCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U2NlbmVGaWxlUGF0aCA9IHNjZW5lQXNzZXRVcmw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsIHNjZW5lQXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTY2VuZUZpbGVQYXRoID0gY2FuZGlkYXRlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXRhcmdldFNjZW5lRmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWZhdWx0Q2FuZGlkYXRlID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdhc3NldHMnLCAnc2NlbmVzJywgJ2dhbWUuc2NlbmUnKTtcbiAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhkZWZhdWx0Q2FuZGlkYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRTY2VuZUZpbGVQYXRoID0gZGVmYXVsdENhbmRpZGF0ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0YXJnZXRTY2VuZUZpbGVQYXRoICYmIGZzLmV4aXN0c1N5bmModGFyZ2V0U2NlbmVGaWxlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbnNwZWN0U2NlbmVGcm9tRmlsZSh0YXJnZXRTY2VuZUZpbGVQYXRoLCB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgbWF4RGVwdGgsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGVDb21wb25lbnRzLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlUHJvcGVydGllcyxcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyTm9kZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5pbnNwZWN0U2NlbmVGcm9tTGl2ZUVkaXRvcih7XG4gICAgICAgICAgICAgICAgZm9ybWF0LFxuICAgICAgICAgICAgICAgIG1heERlcHRoLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVDb21wb25lbnRzLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVQcm9wZXJ0aWVzLFxuICAgICAgICAgICAgICAgIGZpbHRlck5vZGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbU2NlbmVUb29sc10gaW5zcGVjdFNjZW5lIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gaW5zcGVjdCBzY2VuZTogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGluc3BlY3RTY2VuZUZyb21GaWxlKGZpbGVQYXRoOiBzdHJpbmcsIG9wdGlvbnM6IHtcbiAgICAgICAgZm9ybWF0OiBzdHJpbmc7XG4gICAgICAgIG1heERlcHRoOiBudW1iZXI7XG4gICAgICAgIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuO1xuICAgICAgICBpbmNsdWRlUHJvcGVydGllczogYm9vbGVhbjtcbiAgICAgICAgZmlsdGVyTm9kZTogc3RyaW5nIHwgbnVsbDtcbiAgICB9KTogVG9vbFJlc3BvbnNlIHtcbiAgICAgICAgY29uc3QgcmF3Q29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY29uc3QgZGF0YTogYW55W10gPSBKU09OLnBhcnNlKHJhd0NvbnRlbnQpO1xuXG4gICAgICAgIGNvbnN0IGxvb2t1cCA9IG5ldyBNYXA8bnVtYmVyLCBhbnk+KCk7XG4gICAgICAgIGRhdGEuZm9yRWFjaCgoaXRlbSwgaW5kZXgpID0+IGxvb2t1cC5zZXQoaW5kZXgsIGl0ZW0pKTtcblxuICAgICAgICBjb25zdCByZXNvbHZlVmFsdWUgPSAodmFsOiBhbnksIHZpc2l0ZWQgPSBuZXcgU2V0PG51bWJlcj4oKSk6IGFueSA9PiB7XG4gICAgICAgICAgICBpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdmFsO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbC5fX2lkX18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWZJZCA9IHZhbC5fX2lkX187XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aXNpdGVkLmhhcyhyZWZJZCkpIHJldHVybiBgW0NpcmN1bGFyIHJlZiBfX2lkX186ICR7cmVmSWR9XWA7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0ZWQuYWRkKHJlZklkKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gbG9va3VwLmdldChyZWZJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0KSByZXR1cm4gdmFsO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZVZhbHVlKHRhcmdldCwgdmlzaXRlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC5tYXAoaXRlbSA9PiByZXNvbHZlVmFsdWUoaXRlbSwgbmV3IFNldCh2aXNpdGVkKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyh2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrID09PSAnX29iakZsYWdzJyB8fCBrID09PSAnX19lZGl0b3JFeHRyYXNfXycpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRba10gPSByZXNvbHZlVmFsdWUodiwgbmV3IFNldCh2aXNpdGVkKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRlc2NyaWJlQ29tcG9uZW50ID0gKGNvbXA6IGFueSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9IGNvbXAuX190eXBlX18gfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLmluY2x1ZGVQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZSwgZW5hYmxlZDogY29tcC5fZW5hYmxlZCAhPT0gZmFsc2UgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHByb3BzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhjb21wKSkge1xuICAgICAgICAgICAgICAgIGlmIChbJ19uYW1lJywgJ19vYmpGbGFncycsICdfX2VkaXRvckV4dHJhc19fJywgJ25vZGUnLCAnX2VuYWJsZWQnLCAnX21hdGVyaWFscycsICdzaGFyZWRNYXRlcmlhbHMnLCAnX2lkJywgJ19wcmVmYWInLCAnX3ppZCddLmluY2x1ZGVzKGspKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcm9wc1trXSA9IHJlc29sdmVWYWx1ZSh2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLl9lbmFibGVkICE9PSBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBidWlsZE5vZGVUcmVlID0gKG5vZGVJbmRleDogbnVtYmVyLCBjdXJyZW50RGVwdGg6IG51bWJlcik6IGFueSA9PiB7XG4gICAgICAgICAgICBpZiAoY3VycmVudERlcHRoID4gb3B0aW9ucy5tYXhEZXB0aCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBjb25zdCBub2RlID0gbG9va3VwLmdldChub2RlSW5kZXgpO1xuICAgICAgICAgICAgaWYgKCFub2RlIHx8IG5vZGUuX190eXBlX18gIT09ICdjYy5Ob2RlJykgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBub2RlLl9uYW1lIHx8ICdVbm5hbWVkJztcbiAgICAgICAgICAgIGNvbnN0IHV1aWQgPSBub2RlLl9pZCB8fCBub2RlLnV1aWQgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBhY3RpdmUgPSBub2RlLl9hY3RpdmUgIT09IGZhbHNlO1xuXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnRzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaW5jbHVkZUNvbXBvbmVudHMgJiYgQXJyYXkuaXNBcnJheShub2RlLl9jb21wb25lbnRzKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYyBvZiBub2RlLl9jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjICYmIGMuX19pZF9fICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBPYmogPSBsb29rdXAuZ2V0KGMuX19pZF9fKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wT2JqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5wdXNoKGRlc2NyaWJlQ29tcG9uZW50KGNvbXBPYmopKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY2hpbGRyZW46IGFueVtdID0gW107XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlLl9jaGlsZHJlbikpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIG5vZGUuX2NoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCAmJiBjaC5fX2lkX18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGRUcmVlID0gYnVpbGROb2RlVHJlZShjaC5fX2lkX18sIGN1cnJlbnREZXB0aCArIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkVHJlZSkgY2hpbGRyZW4ucHVzaChjaGlsZFRyZWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgdXVpZCxcbiAgICAgICAgICAgICAgICBhY3RpdmUsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuX2xwb3MgfHwgeyB4OiAwLCB5OiAwLCB6OiAwIH0sXG4gICAgICAgICAgICAgICAgY29tcG9uZW50cyxcbiAgICAgICAgICAgICAgICBjaGlsZHJlblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBzY2VuZU9iaiA9IGRhdGEuZmluZChpdGVtID0+IGl0ZW0uX190eXBlX18gPT09ICdjYy5TY2VuZScpO1xuICAgICAgICBjb25zdCBzY2VuZU5hbWUgPSBzY2VuZU9iaj8uX25hbWUgfHwgcGF0aC5iYXNlbmFtZShmaWxlUGF0aCwgJy5zY2VuZScpO1xuXG4gICAgICAgIGNvbnN0IHJvb3ROb2RlczogYW55W10gPSBbXTtcbiAgICAgICAgaWYgKHNjZW5lT2JqICYmIEFycmF5LmlzQXJyYXkoc2NlbmVPYmouX2NoaWxkcmVuKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBzY2VuZU9iai5fY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggJiYgY2guX19pZF9fICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJlZSA9IGJ1aWxkTm9kZVRyZWUoY2guX19pZF9fLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRyZWUpIHJvb3ROb2Rlcy5wdXNoKHRyZWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0YXJnZXRUcmVlcyA9IHJvb3ROb2RlcztcbiAgICAgICAgaWYgKG9wdGlvbnMuZmlsdGVyTm9kZSkge1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gb3B0aW9ucy5maWx0ZXJOb2RlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBjb25zdCBmaW5kRmlsdGVyZWQgPSAobm9kZXM6IGFueVtdKTogYW55W10gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbiBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobi5uYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZmlsdGVyKSB8fCBuLnV1aWQudG9Mb3dlckNhc2UoKSA9PT0gZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZC5wdXNoKG4pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG4uY2hpbGRyZW4gJiYgbi5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZC5wdXNoKC4uLmZpbmRGaWx0ZXJlZChuLmNoaWxkcmVuKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvdW5kO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRhcmdldFRyZWVzID0gZmluZEZpbHRlcmVkKHJvb3ROb2Rlcyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5mb3JtYXQgPT09ICdqc29uJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc2NlbmU6IHNjZW5lTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsRW50aXRpZXM6IGRhdGEubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICByb290Tm9kZUNvdW50OiB0YXJnZXRUcmVlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVzOiB0YXJnZXRUcmVlc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5mb3JtYXQgPT09ICdzdW1tYXJ5Jykge1xuICAgICAgICAgICAgbGV0IHRvdGFsTm9kZXMgPSAwO1xuICAgICAgICAgICAgbGV0IHRvdGFsQ29tcG9uZW50cyA9IDA7XG4gICAgICAgICAgICBjb25zdCBjb3VudFN0YXRzID0gKG5vZGVzOiBhbnlbXSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbiBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbE5vZGVzKys7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsQ29tcG9uZW50cyArPSAobi5jb21wb25lbnRzPy5sZW5ndGggfHwgMCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuLmNoaWxkcmVuKSBjb3VudFN0YXRzKG4uY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb3VudFN0YXRzKHJvb3ROb2Rlcyk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHNjZW5lOiBzY2VuZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbE5vZGVzLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbENvbXBvbmVudHMsXG4gICAgICAgICAgICAgICAgICAgIHJvb3ROb2Rlczogcm9vdE5vZGVzLm1hcChyID0+ICh7IG5hbWU6IHIubmFtZSwgdXVpZDogci51dWlkLCBhY3RpdmU6IHIuYWN0aXZlLCBjb21wb25lbnRDb3VudDogci5jb21wb25lbnRzLmxlbmd0aCB9KSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGxpbmVzLnB1c2goYCMjIFNjZW5lOiAke3NjZW5lTmFtZX0gKCR7ZmlsZVBhdGh9KWApO1xuICAgICAgICBsaW5lcy5wdXNoKGBUb3RhbCByb290IG5vZGVzOiAke3RhcmdldFRyZWVzLmxlbmd0aH1cXG5gKTtcblxuICAgICAgICBjb25zdCBmb3JtYXRUcmVlTm9kZSA9IChub2RlOiBhbnksIGRlcHRoOiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluZGVudCA9ICcgICcucmVwZWF0KGRlcHRoKTtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IG5vZGUuYWN0aXZlID8gJycgOiAnIFtESVNBQkxFRF0nO1xuICAgICAgICAgICAgbGluZXMucHVzaChgJHtpbmRlbnR9KiAqKiR7bm9kZS5uYW1lfSoqICgke25vZGUudXVpZH0pJHtzdGF0dXN9YCk7XG5cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmluY2x1ZGVDb21wb25lbnRzICYmIG5vZGUuY29tcG9uZW50cyAmJiBub2RlLmNvbXBvbmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYyBvZiBub2RlLmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuaW5jbHVkZVByb3BlcnRpZXMgJiYgYy5wcm9wZXJ0aWVzICYmIE9iamVjdC5rZXlzKGMucHJvcGVydGllcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByb3BTdHIgPSBKU09OLnN0cmluZ2lmeShjLnByb3BlcnRpZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BTdHIubGVuZ3RoID4gMTQwKSBwcm9wU3RyID0gcHJvcFN0ci5zdWJzdHJpbmcoMCwgMTQwKSArICcuLi4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMucHVzaChgJHtpbmRlbnR9ICAgIC0gXFxgJHtjLnR5cGV9XFxgOiAke3Byb3BTdHJ9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKGAke2luZGVudH0gICAgLSBcXGAke2MudHlwZX1cXGBgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4gJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRyZWVOb2RlKGNoLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0YXJnZXRUcmVlcy5mb3JFYWNoKG4gPT4gZm9ybWF0VHJlZU5vZGUobiwgMCkpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFRleHQ6IGxpbmVzLmpvaW4oJ1xcbicpLFxuICAgICAgICAgICAgICAgIHNjZW5lOiBzY2VuZU5hbWUsXG4gICAgICAgICAgICAgICAgcm9vdE5vZGVzQ291bnQ6IHRhcmdldFRyZWVzLmxlbmd0aFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaW5zcGVjdFNjZW5lRnJvbUxpdmVFZGl0b3Iob3B0aW9uczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRyZWU6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgaWYgKCF0cmVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gbGl2ZSBzY2VuZSB0cmVlIGF2YWlsYWJsZScgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB0cmVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTGl2ZSBzY2VuZSBpbnNwZWN0aW9uIGZhaWxlZDogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbn0iXX0=