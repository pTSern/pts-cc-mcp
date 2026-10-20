import { ToolDefinition, ToolResponse, ToolExecutor, PrefabInfo } from '../types';
import { readSettings } from '../settings';
import { PrefabHeadlessTools } from './prefab-headless-tools';

export class PrefabTools implements ToolExecutor {
    private headlessTools: PrefabHeadlessTools = new PrefabHeadlessTools();
    private static activeSession: {
        previousSceneUrl: string | null;
        previousSceneUuid: string | null;
        editingPrefabPath: string | null;
    } = { previousSceneUrl: null, previousSceneUuid: null, editingPrefabPath: null };

    getTools(): ToolDefinition[] {
        return [
            // 1. Browse prefabs - Query and information
            {
                name: 'prefab_browse',
                description: 'PREFAB BROWSER: Query and analyze prefab files in your project. WORKFLOW: Use "list" to discover all prefabs → "info" to get detailed prefab data → "validate" to check file integrity. Essential for prefab management and debugging. Common use: finding prefabs before instantiation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['list', 'info', 'validate'],
                            description: 'Browse operation: "list" = get all prefabs in folder (optional folder parameter) | "info" = get detailed prefab data (requires prefabPath) | "validate" = check prefab file integrity (requires prefabPath)'
                        },
                        folder: {
                            type: 'string',
                            description: 'Search directory for prefabs (list action). Default: "db://assets" searches entire project. Examples: "db://assets/prefabs" for main prefabs, "db://assets/ui" for UI prefabs. Use specific folders for focused searches.',
                            default: 'db://assets'
                        },
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab file path (REQUIRED for info/validate actions). Must be valid Cocos asset path ending in .prefab. Examples: "db://assets/prefabs/Player.prefab", "db://assets/ui/MenuPanel.prefab". Get paths from list action first.'
                        }
                    },
                    required: ['action']
                }
            },

            // 2. Prefab lifecycle - Create, duplicate, delete
            {
                name: 'prefab_lifecycle',
                description: 'PREFAB LIFECYCLE: Create prefabs from existing nodes or delete prefab files. WORKFLOW: For create → select source node → specify name and save path → creates reusable prefab. For delete → specify prefab path → removes file permanently. Use with caution for delete operations.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['create', 'delete'],
                            description: 'Lifecycle operation: "create" = convert scene node into reusable prefab (requires nodeUuid+prefabName+savePath) | "delete" = permanently remove prefab file (requires prefabPath - WARNING: irreversible)'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Source node UUID for prefab creation (REQUIRED for create action). Use node_query to find target node UUID first. The node and all its children will be converted into a prefab. Format: "12345678-abcd-1234-5678-123456789abc"'
                        },
                        prefabName: {
                            type: 'string',
                            description: 'New prefab name (REQUIRED for create action). Choose descriptive names without .prefab extension. Examples: "PlayerCharacter", "UIButton", "EnemyTank". System adds .prefab extension automatically.'
                        },
                        savePath: {
                            type: 'string',
                            description: 'Destination path for new prefab (REQUIRED for create action). Must include .prefab extension. Examples: "db://assets/prefabs/Player.prefab", "db://assets/ui/CustomButton.prefab". Ensure parent folder exists.'
                        },
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab file to delete (REQUIRED for delete action). WARNING: This permanently removes the prefab file. Examples: "db://assets/prefabs/OldPlayer.prefab". Use prefab_browse list to find exact paths first.'
                        }
                    },
                    required: ['action']
                }
            },

            // 3. Scene prefab instances - Instantiate, unlink, apply, revert
            {
                name: 'prefab_instance',
                description: 'PREFAB INSTANCES: Manage prefab instances in the scene. WORKFLOW: "instantiate" to create instances → modify as needed → "apply" to save changes back to prefab OR "unlink" to break connection OR "revert" to restore original. Critical for prefab-based development.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['instantiate', 'unlink', 'apply', 'revert'],
                            description: 'Instance operation: "instantiate" = create prefab instance in scene (requires prefabPath+parentUuid) | "unlink" = break prefab connection, make independent (requires nodeUuid) | "apply" = save instance changes to prefab (requires nodeUuid) | "revert" = restore to prefab state (requires nodeUuid)'
                        },
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab file path (REQUIRED for instantiate action). Must be valid .prefab file. Examples: "db://assets/prefabs/Player.prefab", "db://assets/ui/MenuPanel.prefab". Use prefab_browse to find available prefabs.'
                        },
                        parentUuid: {
                            type: 'string',
                            description: 'Parent node UUID for new instance (REQUIRED for instantiate action). Use node_query to find parent node first. The prefab instance will be created as a child of this node. Format: "12345678-abcd-1234-5678-123456789abc"'
                        },
                        position: {
                            type: 'object',
                            properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                            description: 'Starting position for new instance (instantiate action). Sets initial transform after creation. Example: {"x": 100, "y": 200, "z": 0}. Optional - defaults to prefab\'s original position if omitted.'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID (REQUIRED for unlink/apply/revert actions). Must be a node that was created from a prefab. Use node_query to find prefab instance nodes. Format: "12345678-abcd-1234-5678-123456789abc"'
                        }
                    },
                    required: ['action']
                }
            },

            // 4. Prefab edit mode - IMPORTANT: Complete workflow for editing prefabs
            {
                name: 'prefab_edit',
                description: 'PREFAB EDIT WORKFLOW: Edit prefab content in dedicated editing mode. CRITICAL WORKFLOW: 1) "enter" edit mode (switches to prefab scene) → 2) make modifications using other tools → 3) "save" changes → 4) "exit" back to main scene. IMPORTANT: Always save before exit to persist changes. Alternatively, use "atomic_edit" to enter, execute operations, save, and exit in a single call.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['enter', 'save', 'exit', 'test', 'atomic_edit'],
                            description: 'Edit operation: "enter" = start editing prefab in dedicated scene | "save" = persist current changes to prefab file | "exit" = return to previous scene (auto-restores previous scene if omitted) | "test" = create test instance | "atomic_edit" = enter, execute operations, save, and exit safely in one transaction'
                        },
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab file path (REQUIRED for enter/save/atomic_edit). Examples: "db://assets/prefabs/Player.prefab".'
                        },
                        scenePath: {
                            type: 'string',
                            description: 'Scene path to return to on exit (optional - defaults to previously opened scene, or project primary scene).'
                        },
                        operations: {
                            type: 'array',
                            description: 'Array of operations for atomic_edit: [{ tool: string, args: object }].',
                            items: {
                                type: 'object',
                                properties: {
                                    tool: { type: 'string' },
                                    args: { type: 'object' }
                                },
                                required: ['tool', 'args']
                            }
                        },
                        parentUuid: {
                            type: 'string',
                            description: 'Parent node for test instance (test action only). Format: "12345678-abcd-1234-5678-123456789abc"'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'prefab_browse':
                return await this.handlePrefabBrowse(args);
            case 'prefab_lifecycle':
                return await this.handlePrefabLifecycle(args);
            case 'prefab_instance':
                return await this.handlePrefabInstance(args);
            case 'prefab_edit':
                return await this.handlePrefabEdit(args);
            case 'prefab_diff':
            case 'diff':
                return await this.headlessTools.diff(args);
            case 'prefab_inspect_headless':
            case 'inspect_headless':
                return await this.headlessTools.inspectHeadless(args);
            case 'prefab_batch_edit_headless':
            case 'batch_edit_headless':
                return await this.headlessTools.batchEditHeadless(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    public async diff(args: any): Promise<ToolResponse> {
        return await this.headlessTools.diff(args);
    }

    public async inspectHeadless(args: any): Promise<ToolResponse> {
        return await this.headlessTools.inspectHeadless(args);
    }

    public async batchEditHeadless(args: any): Promise<ToolResponse> {
        return await this.headlessTools.batchEditHeadless(args);
    }

    private async getPrefabList(folder: string = 'db://assets'): Promise<ToolResponse> {
        try {
            const pattern = folder.endsWith('/') ?
                `${folder}**/*.prefab` : `${folder}/**/*.prefab`;

            const results: any[] = await Editor.Message.request('asset-db', 'query-assets', {
                pattern: pattern
            });
            const prefabs: PrefabInfo[] = results.map(asset => ({
                name: asset.name,
                path: asset.url,
                uuid: asset.uuid,
                folder: asset.url.substring(0, asset.url.lastIndexOf('/'))
            }));
            return { success: true, data: prefabs };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async loadPrefab(prefabPath: string): Promise<ToolResponse> {
        try {
            const assetInfo: any = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }

            const prefabData: any = await Editor.Message.request('scene', 'load-asset', {
                uuid: assetInfo.uuid
            });
            return {
                success: true,
                data: {
                    uuid: prefabData.uuid,
                    name: prefabData.name,
                    message: 'Prefab loaded successfully'
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async instantiatePrefab(args: any): Promise<ToolResponse> {
        try {
            // Query prefab asset info
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath);
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }

            // Record undo operation
            await this.recordUndoOperation('instantiate-prefab', args.parentUuid || 'scene');

            // Use standard editor workflow
            const result = await this.instantiatePrefabStandard(args, assetInfo);
            if (result.success) {
                // Instantiating prefab does not require refreshing all assets
                return result;
            }

            // Fallback method
            console.log('Standard method failed, using simplified method...');
            const fallbackResult = await this.instantiatePrefabSimple(args, assetInfo);
            // Instantiating prefab does not require refreshing all assets
            return fallbackResult;

        } catch (err: any) {
            return {
                success: false,
                error: `Prefab instantiation failed: ${err.message}`,
                instruction: 'Please check that the prefab path is correct and ensure the prefab file format is valid'
            };
        }
    }

    /**
     * Establish relationship between node and prefab
     * This method creates necessary PrefabInfo and PrefabInstance structures
     */
    private async establishPrefabConnection(nodeUuid: string, prefabUuid: string, prefabPath: string): Promise<void> {
        try {
            // Read prefab file to obtain root node fileId
            const prefabContent = await this.readPrefabFile(prefabPath);
            if (!prefabContent || !prefabContent.data || !prefabContent.data.length) {
                throw new Error('Failed to read prefab file content');
            }

            // Find prefab root node fileId (typically the second object, i.e., index 1)
            const rootNode = prefabContent.data.find((item: any) => item.__type === 'cc.Node' && item._parent === null);
            if (!rootNode || !rootNode._prefab) {
                throw new Error('Failed to find prefab root node or its prefab info');
            }

            // Get root node PrefabInfo
            const rootPrefabInfo = prefabContent.data[rootNode._prefab.__id__];
            if (!rootPrefabInfo || rootPrefabInfo.__type !== 'cc.PrefabInfo') {
                throw new Error('Failed to find PrefabInfo for prefab root node');
            }

            const rootFileId = rootPrefabInfo.fileId;

            // Use scene API to establish prefab connection
            const prefabConnectionData = {
                node: nodeUuid,
                prefab: prefabUuid,
                fileId: rootFileId
            };

            // Try multiple API methods to establish prefab connection
            const connectionMethods = [
                () => Editor.Message.request('scene', 'connect-prefab-instance', prefabConnectionData),
                () => Editor.Message.request('scene', 'set-prefab-connection', prefabConnectionData),
                () => Editor.Message.request('scene', 'apply-prefab-link', prefabConnectionData)
            ];

            let connected = false;
            for (const method of connectionMethods) {
                try {
                    await method();
                    connected = true;
                    break;
                } catch (error) {
                    console.warn('Prefab connection method failed, trying next method:', error);
                }
            }

            if (!connected) {
                // If all API methods fail, try manually modifying scene data
                console.warn('All prefab connection APIs failed, attempting manual connection');
                await this.manuallyEstablishPrefabConnection(nodeUuid, prefabUuid, rootFileId);
            }

        } catch (error) {
            console.error('Failed to establish prefab connection:', error);
            throw error;
        }
    }

    /**
     * Manually establish prefab connection (fallback when API methods fail)
     */
    private async manuallyEstablishPrefabConnection(nodeUuid: string, prefabUuid: string, rootFileId: string): Promise<void> {
        try {
            // Try using dump API to modify node _prefab property
            const prefabConnectionData = {
                [nodeUuid]: {
                    '_prefab': {
                        '__uuid__': prefabUuid,
                        '__expectedType__': 'cc.Prefab',
                        'fileId': rootFileId
                    }
                }
            };

            await Editor.Message.request('scene', 'set-property', {
                uuid: nodeUuid,
                path: '_prefab',
                dump: {
                    value: {
                        '__uuid__': prefabUuid,
                        '__expectedType__': 'cc.Prefab'
                    }
                }
            });

        } catch (error) {
            console.error('Manual prefab connection also failed:', error);
            // Do not throw error because basic node creation already succeeded
        }
    }

    /**
     * Read prefab file content
     */
    private async readPrefabFile(prefabPath: string): Promise<any> {
        try {
            // Try using asset-db API to read file content
            let assetContent: any;
            try {
                assetContent = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
                if (assetContent && assetContent.source) {
                    // If source path exists, read file directly
                    const fs = require('fs');
                    const path = require('path');
                    const fullPath = path.resolve(assetContent.source);
                    const fileContent = fs.readFileSync(fullPath, 'utf8');
                    return JSON.parse(fileContent);
                }
            } catch (error) {
                console.warn('Failed to read using asset-db, trying alternative methods:', error);
            }

            // Fallback: convert db:// path to physical file path
            const fsPath = prefabPath.replace('db://assets/', 'assets/').replace('db://assets', 'assets');
            const fs = require('fs');
            const path = require('path');

            // Try multiple possible project root paths
            const possiblePaths = [
                path.resolve(process.cwd(), '../../NewProject_3', fsPath),
                path.resolve('/Users/lizhiyong/NewProject_3', fsPath),
                path.resolve(fsPath),
                // If file is directly under root directory, try direct path as well
                path.resolve('/Users/lizhiyong/NewProject_3/assets', path.basename(fsPath))
            ];

            console.log('Attempting to read prefab file, path resolution:', {
                originalPath: prefabPath,
                fsPath: fsPath,
                possiblePaths: possiblePaths
            });

            for (const fullPath of possiblePaths) {
                try {
                    console.log(`Checking path: ${fullPath}`);
                    if (fs.existsSync(fullPath)) {
                        console.log(`Found file: ${fullPath}`);
                        const fileContent = fs.readFileSync(fullPath, 'utf8');
                        const parsed = JSON.parse(fileContent);
                        console.log('File parsed successfully, data structure:', {
                            hasData: !!parsed.data,
                            dataLength: parsed.data ? parsed.data.length : 0
                        });
                        return parsed;
                    } else {
                        console.log(`File does not exist: ${fullPath}`);
                    }
                } catch (readError) {
                    console.warn(`Failed to read file ${fullPath}:`, readError);
                }
            }

            throw new Error('Failed to find or read prefab file');
        } catch (error) {
            console.error('Failed to read prefab file:', error);
            throw error;
        }
    }

    private async tryCreateNodeWithPrefab(args: any): Promise<ToolResponse> {
        try {
            const assetInfo: any = await Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath);
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }

            // Method 2: Use create-node specifying prefab asset
            const createNodeOptions: any = {
                assetUuid: assetInfo.uuid
            };

            // Set parent node
            if (args.parentUuid) {
                createNodeOptions.parent = args.parentUuid;
            }

            const nodeUuid: string | string[] = await Editor.Message.request('scene', 'create-node', createNodeOptions);
            const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;

            // Set node position if specified
            if (args.position && uuid) {
                try {
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: uuid,
                        path: 'position',
                        dump: { value: args.position }
                    });
                    return {
                        success: true,
                        data: {
                            nodeUuid: uuid,
                            prefabPath: args.prefabPath,
                            position: args.position,
                            message: 'Prefab instantiated successfully (fallback method) and position set'
                        }
                    };
                } catch {
                    return {
                        success: true,
                        data: {
                            nodeUuid: uuid,
                            prefabPath: args.prefabPath,
                            message: 'Prefab instantiated successfully (fallback method) but failed to set position'
                        }
                    };
                }
            } else {
                return {
                    success: true,
                    data: {
                        nodeUuid: uuid,
                        prefabPath: args.prefabPath,
                        message: 'Prefab instantiated successfully (fallback method)'
                    }
                };
            }
        } catch (err: any) {
            return {
                success: false,
                error: `Fallback prefab instantiation method also failed: ${err.message}`
            };
        }
    }

    private async tryAlternativeInstantiateMethods(args: any): Promise<ToolResponse> {
        try {
            // Method 1: Try using create-node then applying prefab
            const assetInfo = await this.getAssetInfo(args.prefabPath);
            if (!assetInfo) {
                return { success: false, error: 'Failed to get prefab info' };
            }

            // Create empty node
            const createResult = await this.createNode(args.parentUuid, args.position);
            if (!createResult.success) {
                return createResult;
            }

            // Try applying prefab to node
            const applyResult = await this.applyPrefabToNode(createResult.data.nodeUuid, assetInfo.uuid);
            if (applyResult.success) {
                return {
                    success: true,
                    data: {
                        nodeUuid: createResult.data.nodeUuid,
                        name: createResult.data.name,
                        message: 'Prefab instantiated successfully (using alternative method)'
                    }
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to apply prefab to node',
                    data: {
                        nodeUuid: createResult.data.nodeUuid,
                        message: 'Node created, but failed to apply prefab data'
                    }
                };
            }

        } catch (error) {
            return { success: false, error: `Alternative instantiation method failed: ${error}` };
        }
    }

    private async getAssetInfo(prefabPath: string): Promise<any> {
        try {
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
            return assetInfo;
        } catch {
            return null;
        }
    }

    private async createNode(parentUuid?: string, position?: any): Promise<ToolResponse> {
        try {
            const createNodeOptions: any = {
                name: 'PrefabInstance'
            };

            // Set parent node
            if (parentUuid) {
                createNodeOptions.parent = parentUuid;
            }

            // Set position
            if (position) {
                createNodeOptions.dump = {
                    position: position
                };
            }

            const nodeUuid: string | string[] = await Editor.Message.request('scene', 'create-node', createNodeOptions);
            const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;
            return {
                success: true,
                data: {
                    nodeUuid: uuid,
                    name: 'PrefabInstance'
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to create node' };
        }
    }

    private async applyPrefabToNode(nodeUuid: string, prefabUuid: string): Promise<ToolResponse> {
        // Try multiple methods to apply prefab data
        const methods = [
            () => Editor.Message.request('scene', 'apply-prefab', { node: nodeUuid, prefab: prefabUuid }),
            () => Editor.Message.request('scene', 'set-prefab', { node: nodeUuid, prefab: prefabUuid }),
            () => Editor.Message.request('scene', 'load-prefab-to-node', { node: nodeUuid, prefab: prefabUuid })
        ];

        for (const method of methods) {
            try {
                await method();
                return { success: true };
            } catch {
                // try next method
            }
        }
        return { success: false, error: 'Failed to apply prefab data' };
    }

    /**
     * New method to create prefab using asset-db API
     * Deeply integrates with engine asset management system to implement complete prefab creation flow
     */
    /**
     * New method to create prefab using asset-db API
     * Deeply integrates with engine asset management system to implement complete prefab creation flow
     */
    private async createPrefabWithAssetDB(nodeUuid: string, savePath: string, prefabName: string, includeChildren: boolean, includeComponents: boolean): Promise<ToolResponse> {
        try {
            console.log('=== Creating Prefab with Asset-DB API ===');
            console.log(`Node UUID: ${nodeUuid}`);
            console.log(`Save path: ${savePath}`);
            console.log(`Prefab name: ${prefabName}`);

            // Step 1: Query node data (including transform properties)
            const nodeData = await this.getNodeData(nodeUuid);
            if (!nodeData) {
                return {
                    success: false,
                    error: 'Failed to get node data'
                };
            }

            console.log('Obtained node data, child count:', nodeData.children ? nodeData.children.length : 0);

            // Step 2: Create asset file first to obtain engine-assigned UUID
            console.log('Creating prefab asset file...');
            const tempPrefabContent = JSON.stringify([{"__type__": "cc.Prefab", "_name": prefabName}], null, 2);
            const createResult = await this.createAssetWithAssetDB(savePath, tempPrefabContent);
            if (!createResult.success) {
                return createResult;
            }

            // Get actual UUID assigned by engine
            const actualPrefabUuid = createResult.data?.uuid;
            if (!actualPrefabUuid) {
                return {
                    success: false,
                    error: 'Failed to get engine-assigned prefab UUID'
                };
            }
            console.log('Engine-assigned UUID:', actualPrefabUuid);

            // Step 3: Regenerate prefab content using actual UUID
            const prefabContent = await this.createStandardPrefabContent(nodeData, prefabName, actualPrefabUuid, includeChildren, includeComponents);
            const prefabContentString = JSON.stringify(prefabContent, null, 2);

            // Step 4: Update prefab file content
            console.log('Updating prefab file content...');
            const updateResult = await this.updateAssetWithAssetDB(savePath, prefabContentString);

            // Step 5: Create corresponding meta file (using actual UUID)
            console.log('Creating prefab meta file...');
            const metaContent = this.createStandardMetaContent(prefabName, actualPrefabUuid);
            const metaResult = await this.createMetaWithAssetDB(savePath, metaContent);

            // Step 6: Reimport asset to update references
            console.log('Reimporting prefab asset...');
            const reimportResult = await this.reimportAssetWithAssetDB(savePath);

            // Step 7: Attempt to convert original node to prefab instance
            console.log('Attempting to convert original node to prefab instance...');
            const convertResult = await this.convertNodeToPrefabInstance(nodeUuid, actualPrefabUuid, savePath);

            return {
                success: true,
                data: {
                    prefabUuid: actualPrefabUuid,
                    prefabPath: savePath,
                    nodeUuid: nodeUuid,
                    prefabName: prefabName,
                    convertedToPrefabInstance: convertResult.success,
                    createAssetResult: createResult,
                    updateResult: updateResult,
                    metaResult: metaResult,
                    reimportResult: reimportResult,
                    convertResult: convertResult,
                    message: convertResult.success ? 'Prefab created and original node successfully converted' : 'Prefab created successfully, but node conversion failed'
                }
            };

        } catch (error) {
            console.error('Error occurred while creating prefab:', error);
            return {
                success: false,
                error: `Failed to create prefab: ${error}`
            };
        }
    }

    private async createPrefab(args: any): Promise<ToolResponse> {
        try {
            // Support both prefabPath and savePath parameter names
            const pathParam = args.prefabPath || args.savePath;
            if (!pathParam) {
                return {
                    success: false,
                    error: 'Missing prefab path parameter. Please provide prefabPath or savePath.'
                };
            }

            const prefabName = args.prefabName || 'NewPrefab';
            const fullPath = pathParam.endsWith('.prefab') ?
                pathParam : `${pathParam}/${prefabName}.prefab`;

            // Record undo operation
            await this.recordUndoOperation('create-prefab', args.nodeUuid);

            // Prioritize standard editor method: scene.create-prefab
            console.log('Creating prefab using standard editor method...');
            const sceneResult = await this.createPrefabWithScene(args.nodeUuid, fullPath, prefabName);

            if (sceneResult.success) {
                // Refresh asset immediately after creation
                await this.refreshAssets(fullPath);
                return sceneResult;
            }

            // Fallback to asset-db method
            console.log('scene method failed, using asset-db method...');
            const assetDbResult = await this.createPrefabWithAssetDB(
                args.nodeUuid,
                fullPath,
                prefabName,
                true, // includeChildren
                true  // includeComponents
            );

            if (assetDbResult.success) {
                await this.refreshAssets(fullPath);
                return assetDbResult;
            }

            // Finally fallback to custom implementation
            console.log('asset-db method failed, using custom implementation...');
            const customResult = await this.createPrefabCustom(args.nodeUuid, fullPath, prefabName);
            if (customResult.success) {
                await this.refreshAssets(fullPath);
            }
            return customResult;

        } catch (error) {
            return {
                success: false,
                error: `Error occurred while creating prefab: ${error}`
            };
        }
    }

    // Create prefab using standard editor scene.create-prefab method
    // Create prefab using standard editor scene.create-prefab method
    private async createPrefabWithScene(nodeUuid: string, prefabPath: string, prefabName: string): Promise<ToolResponse> {
        try {
            console.log(`[DEBUG] Creating prefab with scene API: nodeUuid=${nodeUuid}, prefabPath=${prefabPath}`);

            // Ensure directory exists
            const dirPath = prefabPath.substring(0, prefabPath.lastIndexOf('/'));
            console.log(`[DEBUG] Ensuring directory exists: ${dirPath}`);

            try {
                await Editor.Message.request('asset-db', 'create-asset', dirPath, null);
                console.log(`[DEBUG] Directory creation attempted: ${dirPath}`);
            } catch (dirError) {
                console.log(`[DEBUG] Directory creation failed or already exists: ${dirError}`);
            }

            const result = await Editor.Message.request('scene', 'create-prefab', {
                nodeUuid: nodeUuid,
                url: prefabPath
            });

            console.log('[DEBUG] scene.create-prefab result:', result);

            // Verify prefab was actually created successfully
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for filesystem synchronization

            try {
                const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
                console.log('[DEBUG] Asset verification result:', assetInfo);

                if (assetInfo && assetInfo.uuid) {
                    console.log('[DEBUG] Prefab creation verified successfully');
                    return {
                        success: true,
                        data: {
                            prefabPath: prefabPath,
                            prefabName: prefabName,
                            nodeUuid: nodeUuid,
                            assetUuid: assetInfo.uuid,
                            message: 'Prefab created successfully with scene API'
                        }
                    };
                } else {
                    console.log('[DEBUG] Prefab creation failed - asset not found after creation');
                    return {
                        success: false,
                        error: 'Prefab creation appeared successful but asset was not found. File may not have been created.'
                    };
                }
            } catch (verifyError) {
                console.log('[DEBUG] Asset verification failed:', verifyError);
                return {
                    success: false,
                    error: `Prefab creation verification failed: ${verifyError}`
                };
            }

        } catch (error: any) {
            console.log('[DEBUG] scene.create-prefab failed:', error);
            return {
                success: false,
                error: `Scene API prefab creation failed: ${error.message || error}`
            };
        }
    }

    // Record undo operation - temporarily disabled as API is unavailable
    private async recordUndoOperation(operation: string, nodeUuid: string): Promise<void> {
        try {
            // Temporarily comment out non-existent API call
            // await Editor.Message.request('scene', 'undo.record', {
            //     operation: operation,
            //     nodeUuid: nodeUuid,
            //     timestamp: Date.now()
            // });
            console.log(`Undo recording skipped (API unavailable): ${operation} for ${nodeUuid}`);
        } catch (error) {
            console.log(`Failed to save undo record: ${error}`);
            // Do not block main workflow
        }
    }

    // Refresh asset - optimized version avoiding unnecessary global refresh
    private async refreshAssets(assetPath?: string): Promise<void> {
        try {
            if (assetPath) {
                // Refresh specific asset
                await Editor.Message.request('asset-db', 'refresh-asset', assetPath);
                console.log(`Asset refreshed successfully: ${assetPath}`);
            } else {
                // Avoid global refresh, only refresh asset directory
                console.log('Skipping global asset refresh to avoid editor reload');
                // If refresh is explicitly required, can manually invoke:
                // await Editor.Message.request('asset-db', 'refresh');
            }
        } catch (error) {
            console.log(`Asset refresh failed: ${error}`);
            // Do not block main workflow
        }
    }

    // Instantiate prefab using standard editor workflow
    // Instantiate prefab using standard editor workflow
    private async instantiatePrefabStandard(args: any, assetInfo: any): Promise<ToolResponse> {
        try {
            const parentUuid = args.parentUuid || 'ae46a3bb-5483-43dc-8152-8c5e42a0a9aa'; // Default scene root node

            // 1. Begin recording
            await Editor.Message.request('scene', 'begin-recording', [parentUuid]);

            // 2. Create node (using assetUuid parameter)
            const createNodeOptions: any = {
                parent: parentUuid,
                assetUuid: assetInfo.uuid,
                name: args.name || assetInfo.name || 'PrefabInstance',
                type: 'cc.Prefab'
            };

            const nodeUuid = await Editor.Message.request('scene', 'create-node', createNodeOptions);
            const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;

            // 3. Adjust node position if position parameter is provided
            if (args.position) {
                await Editor.Message.request('scene', 'set-property', {
                    uuid: uuid,
                    path: 'position',
                    dump: { value: args.position }
                });
            }

            // 4. Adjust sibling index in parent node if required
            if (args.siblingIndex !== undefined && args.siblingIndex >= 0) {
                await Editor.Message.request('scene', 'move-array-element', {
                    uuid: parentUuid,
                    path: 'children',
                    target: args.siblingIndex,
                    offset: 0
                });
            }

            // 5. End recording
            await Editor.Message.request('scene', 'end-recording', [`instantiate-${Date.now()}`]);

            return {
                success: true,
                data: {
                    nodeUuid: uuid,
                    prefabPath: args.prefabPath,
                    parentUuid: parentUuid,
                    position: args.position,
                    message: 'Prefab instantiated successfully (using standard editor workflow)'
                }
            };

        } catch (error) {
            console.log('Standard editor workflow failed:', error);
            return {
                success: false,
                error: `Standard editor workflow failed: ${error}`
            };
        }
    }

    // Simplified instantiation method
    // Simplified instantiation method
    private async instantiatePrefabSimple(args: any, assetInfo: any): Promise<ToolResponse> {
        try {
            // Use simplified create-node API
            const createNodeOptions: any = {
                assetUuid: assetInfo.uuid
            };

            // Set parent node
            if (args.parentUuid) {
                createNodeOptions.parent = args.parentUuid;
            }

            // Set node name
            if (args.name) {
                createNodeOptions.name = args.name;
            } else if (assetInfo.name) {
                createNodeOptions.name = assetInfo.name;
            }

            // Set initial properties (e.g., position)
            if (args.position) {
                createNodeOptions.dump = {
                    position: {
                        value: args.position
                    }
                };
            }

            // Create node
            const nodeUuid = await Editor.Message.request('scene', 'create-node', createNodeOptions);
            const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;

            console.log('Simplified method created prefab node successfully:', {
                nodeUuid: uuid,
                prefabUuid: assetInfo.uuid,
                prefabPath: args.prefabPath
            });

            return {
                success: true,
                data: {
                    nodeUuid: uuid,
                    prefabPath: args.prefabPath,
                    parentUuid: args.parentUuid,
                    position: args.position,
                    message: 'Prefab instantiated successfully (using simplified method)'
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Simplified method failed: ${error}`
            };
        }
    }

    // 1. Prefab browse handler
    private async handlePrefabBrowse(args: any): Promise<ToolResponse> {
        try {
            const { action } = args;

            switch (action) {
                case 'list':
                    return await this.getPrefabList(args.folder);
                case 'info':
                    if (!args.prefabPath) {
                        return { success: false, error: 'prefabPath required for info action' };
                    }
                    return await this.getPrefabInfo(args.prefabPath);
                case 'validate':
                    if (!args.prefabPath) {
                        return { success: false, error: 'prefabPath required for validate action' };
                    }
                    return await this.validatePrefab(args.prefabPath);
                default:
                    return { success: false, error: `Unsupported browse action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: `Browse operation failed: ${error}` };
        }
    }

    // 2. Prefab lifecycle handler
    private async handlePrefabLifecycle(args: any): Promise<ToolResponse> {
        try {
            const { action } = args;

            switch (action) {
                case 'create':
                    if (!args.nodeUuid || !args.prefabName || !args.savePath) {
                        return { success: false, error: 'nodeUuid, prefabName, savePath required for create' };
                    }
                    const createResult = await this.createPrefab({
                        nodeUuid: args.nodeUuid,
                        prefabName: args.prefabName,
                        savePath: args.savePath
                    });
                    if (createResult.success) {
                        return {
                            success: true,
                            data: {
                                prefabPath: args.savePath,
                                message: '✅ Prefab created'
                            }
                        };
                    }
                    return createResult;
                case 'delete':
                    if (!args.prefabPath) {
                        return { success: false, error: 'prefabPath required for delete' };
                    }
                    try {
                        await Editor.Message.request('asset-db', 'delete-asset', args.prefabPath);
                        await this.refreshAssets();
                        return {
                            success: true,
                            data: { message: '✅ Prefab deleted' }
                        };
                    } catch (error) {
                        return { success: false, error: `Delete failed: ${error}` };
                    }
                default:
                    return { success: false, error: `Unsupported lifecycle action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: `Lifecycle operation failed: ${error}` };
        }
    }

    // 3. Prefab instance handler
    private async handlePrefabInstance(args: any): Promise<ToolResponse> {
        try {
            const { action } = args;

            switch (action) {
                case 'instantiate':
                    if (!args.prefabPath) {
                        return { success: false, error: 'prefabPath required for instantiate' };
                    }
                    const instantiateResult = await this.instantiatePrefab({
                        prefabPath: args.prefabPath,
                        parentUuid: args.parentUuid,
                        position: args.position
                    });
                    if (instantiateResult.success) {
                        return {
                            success: true,
                            data: {
                                nodeUuid: instantiateResult.data.nodeUuid,
                                message: '✅ Prefab instantiated'
                            }
                        };
                    }
                    return instantiateResult;
                case 'unlink':
                    if (!args.nodeUuid) {
                        return { success: false, error: 'nodeUuid required for unlink' };
                    }
                    const unlinkResult = await this.unlinkPrefab(args.nodeUuid);
                    if (unlinkResult.success) {
                        return {
                            success: true,
                            data: { message: '✅ Prefab unlinked' }
                        };
                    }
                    return unlinkResult;
                case 'apply':
                    if (!args.nodeUuid) {
                        return { success: false, error: 'nodeUuid required for apply' };
                    }
                    const applyResult = await this.applyPrefab(args.nodeUuid);
                    if (applyResult.success) {
                        return {
                            success: true,
                            data: { message: '✅ Changes applied to prefab' }
                        };
                    }
                    return applyResult;
                case 'revert':
                    if (!args.nodeUuid) {
                        return { success: false, error: 'nodeUuid required for revert' };
                    }
                    return await this.revertPrefab(args.nodeUuid);
                default:
                    return { success: false, error: `Unsupported instance action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: `Instance operation failed: ${error}` };
        }
    }

    // 4. Prefab edit workflow handler
    private async handlePrefabEdit(args: any): Promise<ToolResponse> {
        try {
            const { action, prefabPath } = args;

            switch (action) {
                case 'enter':
                    const enterResult = await this.enterPrefabEditMode(prefabPath);
                    if (enterResult.success) {
                        return {
                            success: true,
                            data: {
                                status: 'editing',
                                prefabPath: prefabPath,
                                message: '✅ Entered prefab edit mode',
                                reminder: '⚠️  IMPORTANT: After making changes, you MUST call save action, then exit action to return to scene'
                            }
                        };
                    }
                    return enterResult;
                case 'save':
                    const saveResult = await this.savePrefabDirect(prefabPath);
                    if (saveResult.success) {
                        return {
                            success: true,
                            data: {
                                status: 'saved',
                                prefabPath: prefabPath,
                                message: '✅ Prefab saved',
                                reminder: '⚠️  IMPORTANT: You MUST call exit action now to return to scene view'
                            }
                        };
                    }
                    return saveResult;
                case 'exit': {
                    const sceneTarget = args.scenePath || (prefabPath && prefabPath.endsWith('.scene') ? prefabPath : undefined);
                    const exitResult = await this.exitPrefabEditMode(sceneTarget);
                    if (exitResult.success) {
                        return {
                            success: true,
                            data: {
                                status: 'scene',
                                message: '✅ Returned to scene view',
                                scene: exitResult.data?.targetScene,
                                note: 'Prefab editing complete'
                            }
                        };
                    }
                    return exitResult;
                }
                case 'atomic_edit':
                    return await this.atomicEditPrefab(args);
                case 'test':
                    return await this.testPrefabChanges(prefabPath, args.parentUuid);
                default:
                    return { success: false, error: `Unsupported edit action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: `Prefab edit failed: ${error}` };
        }
    }

    // Parameter validation method
    private validatePrefabOperation(operation: string, args: any): { valid: boolean; error?: string } {
        const requiredParams: Record<string, string[]> = {
            'create': ['nodeUuid', 'prefabName'],
            'instantiate': ['prefabPath'],
            'update': ['prefabPath', 'nodeUuid'],
            'delete': ['prefabPath'],
            'revert': ['nodeUuid'],
            'get_info': ['prefabPath'],
            'validate': ['prefabPath'],
            'unlink': ['nodeUuid'],
            'apply': ['nodeUuid'],
            'edit': ['prefabPath'],
            'save': ['prefabPath'],
            'exit_edit': [],
            'test_changes': ['prefabPath']
        };

        const required = requiredParams[operation];
        if (!required) {
            return { valid: false, error: `Unsupported operation type: ${operation}` };
        }

        for (const param of required) {
            if (!args[param]) {
                return { valid: false, error: `Operation '${operation}' missing required parameter: ${param}` };
            }
        }

        // Special validation rules
        if (operation === 'create' && !args.savePath && !args.prefabPath) {
            return { valid: false, error: `Operation 'create' requires savePath or prefabPath parameter` };
        }

        return { valid: true };
    }

    // Unified prefab management method
    private async managePrefab(args: any): Promise<ToolResponse> {
        try {
            // Validate operation type
            const operation = args.operation;
            if (!operation) {
                return {
                    success: false,
                    error: 'Missing required parameter: operation'
                };
            }

            // Validate required parameters for each operation
            const validationResult = this.validatePrefabOperation(operation, args);
            if (!validationResult.valid) {
                return {
                    success: false,
                    error: validationResult.error
                };
            }

            switch (operation) {
                case 'create':
                    return await this.createPrefab({
                        nodeUuid: args.nodeUuid,
                        savePath: args.savePath || args.prefabPath,
                        prefabName: args.prefabName
                    });

                case 'instantiate':
                    return await this.instantiatePrefab({
                        prefabPath: args.prefabPath,
                        parentUuid: args.parentUuid,
                        position: args.position,
                        siblingIndex: args.siblingIndex
                    });

                case 'update':
                    return await this.updatePrefab(args.prefabPath, args.nodeUuid);

                case 'delete':
                    // Delete prefab asset
                    try {
                        await Editor.Message.request('asset-db', 'delete-asset', args.prefabPath);
                        await this.refreshAssets();
                        return {
                            success: true,
                            data: {
                                prefabPath: args.prefabPath,
                                message: 'Prefab deleted successfully'
                            }
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: `Failed to delete prefab: ${error}`
                        };
                    }

                case 'revert':
                    return await this.revertPrefab(args.nodeUuid);


                case 'get_info':
                    return await this.getPrefabInfo(args.prefabPath);

                case 'validate':
                    return await this.validatePrefab(args.prefabPath);

                case 'unlink':
                    return await this.unlinkPrefab(args.nodeUuid);

                case 'apply':
                    return await this.applyPrefab(args.nodeUuid);

                case 'edit':
                    return await this.enterPrefabEditMode(args.prefabPath);

                case 'save':
                    return await this.savePrefabDirect(args.prefabPath);

                case 'exit_edit':
                    return await this.exitPrefabEditMode(args.prefabPath);

                case 'test_changes':
                    return await this.testPrefabChanges(args.prefabPath, args.parentUuid);

                default:
                    return {
                        success: false,
                        error: `Unsupported prefab operation: ${operation}`
                    };
            }
        } catch (error) {
            return {
                success: false,
                error: `Prefab management operation failed: ${error}`
            };
        }
    }

    private async createPrefabCustom(nodeUuid: string, prefabPath: string, prefabName: string): Promise<ToolResponse> {
        try {
            // 1. Get complete data of source node
            const nodeData = await this.getNodeData(nodeUuid);
            if (!nodeData) {
                return {
                    success: false,
                    error: `Failed to find node: ${nodeUuid}`
                };
            }

            // 2. Generate prefab UUID
            const prefabUuid = this.generateUUID();

            // 3. Create prefab data structure
            const prefabData = this.createPrefabData(nodeData, prefabName, prefabUuid);

            // 4. Create prefab data structure based on official format
            console.log('=== Starting Prefab Creation ===');
            console.log('Node name:', nodeData.name?.value || 'Unknown');
            console.log('Node UUID:', nodeData.uuid?.value || 'Unknown');
            console.log('Prefab save path:', prefabPath);
            console.log(`Starting prefab creation, node data:`, nodeData);
            const prefabJsonData = await this.createStandardPrefabContent(nodeData, prefabName, prefabUuid, true, true);

            // 5. Create standard meta file data
            const standardMetaData = this.createStandardMetaData(prefabName, prefabUuid);

            // 6. Save prefab and meta files
            const saveResult = await this.savePrefabWithMeta(prefabPath, prefabJsonData, standardMetaData);

            if (saveResult.success) {
                // After saving successfully, convert original node to prefab instance
                const convertResult = await this.convertNodeToPrefabInstance(nodeUuid, prefabPath, prefabUuid);

                return {
                    success: true,
                    data: {
                        prefabUuid: prefabUuid,
                        prefabPath: prefabPath,
                        nodeUuid: nodeUuid,
                        prefabName: prefabName,
                        convertedToPrefabInstance: convertResult.success,
                        message: convertResult.success ?
                            'Custom prefab created successfully, original node converted to prefab instance' :
                            'Prefab created successfully, but node conversion failed'
                    }
                };
            } else {
                return {
                    success: false,
                    error: saveResult.error || 'Failed to save prefab file'
                };
            }

        } catch (error) {
            return {
                success: false,
                error: `Error occurred while creating prefab: ${error}`
            };
        }
    }

    private async getNodeData(nodeUuid: string): Promise<any> {
        try {
            // First get basic node info
            const nodeInfo = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeInfo) {
                return null;
            }

            console.log(`Successfully obtained basic info for node ${nodeUuid}`);

            // Use query-node-tree to get complete hierarchy including children
            const nodeTree = await this.getNodeWithChildren(nodeUuid);
            if (nodeTree) {
                console.log(`Successfully obtained complete tree structure for node ${nodeUuid}`);
                return nodeTree;
            } else {
                console.log(`Using basic node info`);
                return nodeInfo;
            }
        } catch (error) {
            console.warn(`Failed to get node data for ${nodeUuid}:`, error);
            return null;
        }
    }

    // Use query-node-tree to get complete node structure with child nodes
    private async getNodeWithChildren(nodeUuid: string): Promise<any> {
        try {
            // Query entire scene tree
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return null;
            }

            // Find target node in tree
            const targetNode = this.findNodeInTree(tree, nodeUuid);
            if (targetNode) {
                console.log(`Found node ${nodeUuid} in scene tree, child count: ${targetNode.children ? targetNode.children.length : 0}`);

                // Enhance node tree with correct component information for each node
                const enhancedTree = await this.enhanceTreeWithMCPComponents(targetNode);
                return enhancedTree;
            }

            return null;
        } catch (error) {
            console.warn(`Failed to get node tree structure for ${nodeUuid}:`, error);
            return null;
        }
    }

    // Recursively find node with specified UUID in node tree
    private findNodeInTree(node: any, targetUuid: string): any {
        if (!node) return null;

        // Check current node
        if (node.uuid === targetUuid || node.value?.uuid === targetUuid) {
            return node;
        }

        // Recursively check children
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                const found = this.findNodeInTree(child, targetUuid);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    /**
     * Enhance node tree using MCP interface to obtain correct component info
     */
    private async enhanceTreeWithMCPComponents(node: any): Promise<any> {
        if (!node || !node.uuid) {
            return node;
        }

        try {
            // Use MCP interface to get node component info
            const port = readSettings().port;
            const response = await fetch(`http://localhost:${port}/mcp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "jsonrpc": "2.0",
                    "method": "tools/call",
                    "params": {
                        "name": "component_get_components",
                        "arguments": {
                            "nodeUuid": node.uuid
                        }
                    },
                    "id": Date.now()
                })
            });

            const mcpResult = await response.json();
            if (mcpResult.result?.content?.[0]?.text) {
                const componentData = JSON.parse(mcpResult.result.content[0].text);
                if (componentData.success && componentData.data.components) {
                    // Update node component info with correct data returned by MCP
                    node.components = componentData.data.components;
                    console.log(`Node ${node.uuid} obtained ${componentData.data.components.length} components with correct types for script components`);
                }
            }
        } catch (error) {
            console.warn(`Failed to get MCP component info for node ${node.uuid}:`, error);
        }

        // Recursively process child nodes
        if (node.children && Array.isArray(node.children)) {
            for (let i = 0; i < node.children.length; i++) {
                node.children[i] = await this.enhanceTreeWithMCPComponents(node.children[i]);
            }
        }

        return node;
    }

    private async buildBasicNodeInfo(nodeUuid: string): Promise<any> {
        try {
            // Build basic node info
            const nodeInfo: any = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeInfo) {
                return null;
            }

            // Simplified version: only return basic node info without children and components
            // These details will be added as needed during subsequent prefab processing
            const basicInfo = {
                ...nodeInfo,
                children: [],
                components: []
            };
            return basicInfo;
        } catch {
            return null;
        }
    }

    // Validate if node data is valid
    private isValidNodeData(nodeData: any): boolean {
        if (!nodeData) return false;
        if (typeof nodeData !== 'object') return false;

        // Check basic properties - adapt to query-node-tree data format
        return nodeData.hasOwnProperty('uuid') ||
               nodeData.hasOwnProperty('name') ||
               nodeData.hasOwnProperty('__type__') ||
               (nodeData.value && (
                   nodeData.value.hasOwnProperty('uuid') ||
                   nodeData.value.hasOwnProperty('name') ||
                   nodeData.value.hasOwnProperty('__type__')
               ));
    }

    // Unified method to extract child node UUID
    private extractChildUuid(childRef: any): string | null {
        if (!childRef) return null;

        // Method 1: Direct string
        if (typeof childRef === 'string') {
            return childRef;
        }

        // Method 2: value property contains string
        if (childRef.value && typeof childRef.value === 'string') {
            return childRef.value;
        }

        // Method 3: value.uuid property
        if (childRef.value && childRef.value.uuid) {
            return childRef.value.uuid;
        }

        // Method 4: Direct uuid property
        if (childRef.uuid) {
            return childRef.uuid;
        }

        // Method 5: __id__ reference - requires special handling
        if (childRef.__id__ !== undefined) {
            console.log(`Found __id__ reference: ${childRef.__id__}, may need resolution from data structure`);
            return null; // Return null temporarily; reference resolution logic can be added later
        }

        console.warn('Unable to extract child node UUID:', JSON.stringify(childRef));
        return null;
    }

    // Get child node data to process
    private getChildrenToProcess(nodeData: any): any[] {
        const children: any[] = [];

        // Method 1: Get directly from children array (data returned from query-node-tree)
        if (nodeData.children && Array.isArray(nodeData.children)) {
            console.log(`Getting child nodes from children array, count: ${nodeData.children.length}`);
            for (const child of nodeData.children) {
                // Child nodes returned by query-node-tree are typically already full data structures
                if (this.isValidNodeData(child)) {
                    children.push(child);
                    console.log(`Adding child node: ${child.name || child.value?.name || 'Unknown'}`);
                } else {
                    console.log('Invalid child node data:', JSON.stringify(child, null, 2));
                }
            }
        } else {
            console.log('Node has no children or children array is empty');
        }

        return children;
    }

    private generateUUID(): string {
        // Generate UUID matching Cocos Creator format
        const chars = '0123456789abcdef';
        let uuid = '';
        for (let i = 0; i < 32; i++) {
            if (i === 8 || i === 12 || i === 16 || i === 20) {
                uuid += '-';
            }
            uuid += chars[Math.floor(Math.random() * chars.length)];
        }
        return uuid;
    }

    private createPrefabData(nodeData: any, prefabName: string, prefabUuid: string): any[] {
        // Create standard prefab data structure
        const prefabAsset = {
            "__type__": "cc.Prefab",
            "_name": prefabName,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {
                "__id__": 1
            },
            "optimizationPolicy": 0,
            "persistent": false
        };

        // Process node data to ensure compliance with prefab format
        const processedNodeData = this.processNodeForPrefab(nodeData, prefabUuid);

        return [prefabAsset, ...processedNodeData];
    }

    private processNodeForPrefab(nodeData: any, prefabUuid: string): any[] {
        // Process node data to conform to prefab format
        const processedData: any[] = [];
        let idCounter = 1;

        // Recursively process nodes and components
        const processNode = (node: any, parentId: number = 0): number => {
            const nodeId = idCounter++;

            // Create node object
            const processedNode = {
                "__type__": "cc.Node",
                "_name": node.name || "Node",
                "_objFlags": 0,
                "__editorExtras__": {},
                "_parent": parentId > 0 ? { "__id__": parentId } : null,
                "_children": node.children ? node.children.map(() => ({ "__id__": idCounter++ })) : [],
                "_active": node.active !== false,
                "_components": node.components ? node.components.map(() => ({ "__id__": idCounter++ })) : [],
                "_prefab": {
                    "__id__": idCounter++
                },
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
                "_id": ""
            };

            processedData.push(processedNode);

            // Process components
            if (node.components) {
                node.components.forEach((component: any) => {
                    const componentId = idCounter++;
                    const processedComponents = this.processComponentForPrefab(component, componentId);
                    processedData.push(...processedComponents);
                });
            }

            // Process child nodes
            if (node.children) {
                node.children.forEach((child: any) => {
                    processNode(child, nodeId);
                });
            }

            return nodeId;
        };

        processNode(nodeData);
        return processedData;
    }

    private processComponentForPrefab(component: any, componentId: number): any[] {
        // Process component data to conform to prefab format
        const processedComponent = {
            "__type__": component.type || "cc.Component",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {
                "__id__": componentId - 1
            },
            "_enabled": component.enabled !== false,
            "__prefab": {
                "__id__": componentId + 1
            },
            ...component.properties
        };

        // Add component-specific prefab info
        const compPrefabInfo = {
            "__type__": "cc.CompPrefabInfo",
            "fileId": this.generateFileId()
        };

        return [processedComponent, compPrefabInfo];
    }

    private generateFileId(): string {
        // Generate file ID (simplified version)
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
        let fileId = '';
        for (let i = 0; i < 22; i++) {
            fileId += chars[Math.floor(Math.random() * chars.length)];
        }
        return fileId;
    }

    private createMetaData(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "1.1.50",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName
            }
        };
    }

    private async savePrefabFiles(prefabPath: string, prefabData: any[], metaData: any): Promise<{ success: boolean; error?: string }> {
        try {
            // Save prefab file using Editor API
            const prefabContent = JSON.stringify(prefabData, null, 2);
            const metaContent = JSON.stringify(metaData, null, 2);

            // Try more reliable save method
            await this.saveAssetFile(prefabPath, prefabContent);
            // Then create meta file
            const metaPath = `${prefabPath}.meta`;
            await this.saveAssetFile(metaPath, metaContent);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to save prefab file' };
        }
    }

    private async saveAssetFile(filePath: string, content: string): Promise<void> {
        // Try multiple save methods
        const methods = [
            () => Editor.Message.request('asset-db', 'create-asset', filePath, content),
            () => Editor.Message.request('asset-db', 'save-asset', filePath, content),
            () => Editor.Message.request('asset-db', 'write-asset', filePath, content)
        ];

        for (const method of methods) {
            try {
                await method();
                return;
            } catch {
                // try next method
            }
        }
        throw new Error('All save methods failed');
    }

    private async updatePrefab(prefabPath: string, nodeUuid: string): Promise<ToolResponse> {
        try {
            console.log(`Starting prefab update: prefabPath=${prefabPath}, nodeUuid=${nodeUuid}`);

            // 1. Verify that node is a prefab instance first
            const nodeInfo = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeInfo || !(nodeInfo as any).__prefab__) {
                return {
                    success: false,
                    error: 'The specified node is not a prefab instance'
                };
            }

            const prefabInfo = (nodeInfo as any).__prefab__;
            console.log(`Prefab instance info:`, prefabInfo);

            // 2. Use correct apply-prefab API format (based on editor logs)
            console.log('Invoking scene.apply-prefab API...');
            const applyResult = await Editor.Message.request('scene', 'apply-prefab', [nodeUuid]);
            console.log('apply-prefab API call result:', applyResult);

            // 3. Wait for editor processing
            await new Promise(resolve => setTimeout(resolve, 200));

            // 4. Query prefab asset info and refresh
            try {
                const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
                if (assetInfo && assetInfo.source) {
                    // Refresh specific prefab asset
                    await this.refreshAssets(assetInfo.source);
                    console.log(`Prefab asset refreshed: ${assetInfo.source}`);
                }
            } catch (assetError) {
                console.log('Failed to query or refresh prefab asset:', assetError);
            }

            return {
                success: true,
                data: {
                    nodeUuid: nodeUuid,
                    prefabPath: prefabPath,
                    prefabAssetUuid: prefabInfo.asset,
                    message: 'Prefab instance modifications successfully applied to prefab asset',
                    applyResult: applyResult
                }
            };

        } catch (error: any) {
            console.error('Failed to update prefab:', error);
            return {
                success: false,
                error: `Failed to update prefab: ${error.message || error}`,
                instruction: 'Please confirm the node is a valid prefab instance with unapplied modifications'
            };
        }
    }

    private async revertPrefab(nodeUuid: string): Promise<ToolResponse> {
        try {
            // Query node info first to determine prefab asset UUID
            const nodeInfo = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeInfo || !nodeInfo.__prefab__) {
                return {
                    success: false,
                    error: 'Node is not a prefab instance'
                };
            }

            const prefabAssetUuid = nodeInfo.__prefab__.uuid;

            // Use correct API: restore-prefab
            (Editor.Message.request as any)('scene', 'restore-prefab', nodeUuid, prefabAssetUuid);

            return {
                success: true,
                data: {
                    message: 'Prefab reverted',
                    nodeUuid: nodeUuid
                }
            };
        } catch (error) {
            return { success: false, error: `Failed to get node info: ${error}` };
        }
    }

    private async getPrefabInfo(prefabPath: string): Promise<ToolResponse> {
        try {
            const assetInfo: any = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }

            const metaInfo: any = await Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
            const info: PrefabInfo = {
                name: metaInfo.name,
                uuid: metaInfo.uuid,
                path: prefabPath,
                folder: prefabPath.substring(0, prefabPath.lastIndexOf('/')),
                createTime: metaInfo.createTime,
                modifyTime: metaInfo.modifyTime,
                dependencies: metaInfo.depends || []
            };
            return { success: true, data: info };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async createPrefabFromNode(args: any): Promise<ToolResponse> {
        // Extract name from prefabPath
        const prefabPath = args.prefabPath;
        const prefabName = prefabPath.split('/').pop()?.replace('.prefab', '') || 'NewPrefab';

        // Call original createPrefab method
        return await this.createPrefab({
            nodeUuid: args.nodeUuid,
            savePath: prefabPath,
            prefabName: prefabName
        });
    }

    private async validatePrefab(prefabPath: string): Promise<ToolResponse> {
        try {
            // Read prefab file content
            const assetInfo: any = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
            if (!assetInfo) {
                return {
                    success: false,
                    error: 'Prefab file does not exist'
                };
            }

            // Query disk path of prefab file
            const diskPath: string | null = await Editor.Message.request('asset-db', 'query-path', prefabPath);
            if (!diskPath) {
                return {
                    success: false,
                    error: 'Cannot get prefab disk path'
                };
            }

            // Read file using Node.js fs
            const fs = require('fs');
            try {
                const content = fs.readFileSync(diskPath, 'utf8');
                const prefabData = JSON.parse(content);
                const validationResult = this.validatePrefabFormat(prefabData);

                return {
                    success: true,
                    data: {
                        isValid: validationResult.isValid,
                        issues: validationResult.issues,
                        nodeCount: validationResult.nodeCount,
                        componentCount: validationResult.componentCount,
                        message: validationResult.isValid ? 'Prefab format is valid' : 'Prefab format has issues'
                    }
                };
            } catch (parseError) {
                return {
                    success: false,
                    error: 'Prefab file format error, failed to parse JSON'
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Error validating prefab: ${error.message || error}`
            };
        }
    }

    private validatePrefabFormat(prefabData: any): { isValid: boolean; issues: string[]; nodeCount: number; componentCount: number } {
        const issues: string[] = [];
        let nodeCount = 0;
        let componentCount = 0;

        // Check basic structure
        if (!Array.isArray(prefabData)) {
            issues.push('Prefab data must be an array format');
            return { isValid: false, issues, nodeCount, componentCount };
        }

        if (prefabData.length === 0) {
            issues.push('Prefab data is empty');
            return { isValid: false, issues, nodeCount, componentCount };
        }

        // Check if first element is prefab asset
        const firstElement = prefabData[0];
        if (!firstElement || firstElement.__type__ !== 'cc.Prefab') {
            issues.push('First element must be of type cc.Prefab');
        }

        // Count nodes and components
        prefabData.forEach((item: any, index: number) => {
            if (item.__type__ === 'cc.Node') {
                nodeCount++;
            } else if (item.__type__ && item.__type__.includes('cc.')) {
                componentCount++;
            }
        });

        // Check required fields
        if (nodeCount === 0) {
            issues.push('Prefab must contain at least one node');
        }

        return {
            isValid: issues.length === 0,
            issues,
            nodeCount,
            componentCount
        };
    }


    private async readPrefabContent(prefabPath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            // Query disk path
            const diskPath: string | null = await Editor.Message.request('asset-db', 'query-path', prefabPath);
            if (!diskPath) {
                return { success: false, error: 'Cannot get prefab disk path' };
            }

            // Read file using fs
            const fs = require('fs');
            try {
                const content = fs.readFileSync(diskPath, 'utf8');
                const prefabData = JSON.parse(content);
                return { success: true, data: prefabData };
            } catch (parseError) {
                return { success: false, error: 'Prefab file format error' };
            }
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to read prefab file' };
        }
    }


    /**
     * Create asset file using asset-db API
     */
    /**
     * Create asset file using asset-db API
     */
    private async createAssetWithAssetDB(assetPath: string, content: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const assetInfo: any = await Editor.Message.request('asset-db', 'create-asset', assetPath, content, {
                overwrite: true,
                rename: false
            });
            console.log('Created asset file successfully:', assetInfo);
            return { success: true, data: assetInfo };
        } catch (error: any) {
            console.error('Failed to create asset file:', error);
            return { success: false, error: error.message || 'Failed to create asset file' };
        }
    }

    /**
     * Create meta file using asset-db API
     */
    /**
     * Create meta file using asset-db API
     */
    private async createMetaWithAssetDB(assetPath: string, metaContent: any): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const metaContentString = JSON.stringify(metaContent, null, 2);
            const assetInfo: any = await Editor.Message.request('asset-db', 'save-asset-meta', assetPath, metaContentString);
            console.log('Created meta file successfully:', assetInfo);
            return { success: true, data: assetInfo };
        } catch (error: any) {
            console.error('Failed to create meta file:', error);
            return { success: false, error: error.message || 'Failed to create meta file' };
        }
    }

    /**
     * Reimport asset using asset-db API
     */
    /**
     * Reimport asset using asset-db API
     */
    private async reimportAssetWithAssetDB(assetPath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const result: any = await Editor.Message.request('asset-db', 'reimport-asset', assetPath);
            console.log('Reimported asset successfully:', result);
            return { success: true, data: result };
        } catch (error: any) {
            console.error('Failed to reimport asset:', error);
            return { success: false, error: error.message || 'Failed to reimport asset' };
        }
    }

    /**
     * Update asset file content using asset-db API
     */
    /**
     * Update asset file content using asset-db API
     */
    private async updateAssetWithAssetDB(assetPath: string, content: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const result: any = await Editor.Message.request('asset-db', 'save-asset', assetPath, content);
            console.log('Updated asset file successfully:', result);
            return { success: true, data: result };
        } catch (error: any) {
            console.error('Failed to update asset file:', error);
            return { success: false, error: error.message || 'Failed to update asset file' };
        }
    }

    /**
     * Create prefab content compliant with Cocos Creator standard
     * Full recursive node tree handling matching engine standard format
     */
    private async createStandardPrefabContent(nodeData: any, prefabName: string, prefabUuid: string, includeChildren: boolean, includeComponents: boolean): Promise<any[]> {
        console.log('Starting creation of standard engine prefab content...');

        const prefabData: any[] = [];
        let currentId = 0;

        // 1. Create prefab asset object (index 0)
        const prefabAsset = {
            "__type__": "cc.Prefab",
            "_name": prefabName || "", // Ensure prefab name is not empty
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {
                "__id__": 1
            },
            "optimizationPolicy": 0,
            "persistent": false
        };
        prefabData.push(prefabAsset);
        currentId++;

        // 2. Recursively create complete node tree structure
        const context = {
            prefabData,
            currentId: currentId + 1, // Root node occupies index 1, children start from index 2
            prefabAssetIndex: 0,
            nodeFileIds: new Map<string, string>(), // Store mapping from node ID to fileId
            nodeUuidToIndex: new Map<string, number>(), // Store mapping from node UUID to index
            componentUuidToIndex: new Map<string, number>() // Store mapping from component UUID to index
        };

        // Create root node and entire node tree - Note: root node parent should be null, not prefab object
        await this.createCompleteNodeTree(nodeData, null, 1, context, includeChildren, includeComponents, prefabName);

        console.log(`Prefab content created, total ${prefabData.length} objects`);
        console.log('Node fileId mapping:', Array.from(context.nodeFileIds.entries()));

        return prefabData;
    }

    /**
     * Recursively create complete node tree including all child nodes and corresponding PrefabInfo
     */
    private async createCompleteNodeTree(
        nodeData: any,
        parentNodeIndex: number | null,
        nodeIndex: number,
        context: {
            prefabData: any[],
            currentId: number,
            prefabAssetIndex: number,
            nodeFileIds: Map<string, string>,
            nodeUuidToIndex: Map<string, number>,
            componentUuidToIndex: Map<string, number>
        },
        includeChildren: boolean,
        includeComponents: boolean,
        nodeName?: string
    ): Promise<void> {
        const { prefabData } = context;

        // Create node object
        const node = this.createEngineStandardNode(nodeData, parentNodeIndex, nodeName);

        // Ensure node is placed at specified index
        while (prefabData.length <= nodeIndex) {
            prefabData.push(null);
        }
        console.log(`Setting node at index ${nodeIndex}: ${node._name}, _parent:`, node._parent, `_children count: ${node._children.length}`);
        prefabData[nodeIndex] = node;

        // Generate fileId for current node and record UUID to index mapping
        const nodeUuid = this.extractNodeUuid(nodeData);
        const fileId = nodeUuid || this.generateFileId();
        context.nodeFileIds.set(nodeIndex.toString(), fileId);

        // Record node UUID to index mapping
        if (nodeUuid) {
            context.nodeUuidToIndex.set(nodeUuid, nodeIndex);
            console.log(`Recording node UUID mapping: ${nodeUuid} -> ${nodeIndex}`);
        }

        // Process child nodes first (matching manual creation index order)
        const childrenToProcess = this.getChildrenToProcess(nodeData);
        if (includeChildren && childrenToProcess.length > 0) {
            console.log(`Processing ${childrenToProcess.length} child nodes for ${node._name}`);

            // Allocate index for each child node
            const childIndices: number[] = [];
            console.log(`Preparing index allocation for ${childrenToProcess.length} children, current ID: ${context.currentId}`);
            for (let i = 0; i < childrenToProcess.length; i++) {
                console.log(`Processing child node #${i+1}, currentId: ${context.currentId}`);
                const childIndex = context.currentId++;
                childIndices.push(childIndex);
                node._children.push({ "__id__": childIndex });
                console.log(`✅ Added child node reference to ${node._name}: {__id__: ${childIndex}}`);
            }
            console.log(`✅ Final children array for node ${node._name}:`, node._children);

            // Recursively create child nodes
            for (let i = 0; i < childrenToProcess.length; i++) {
                const childData = childrenToProcess[i];
                const childIndex = childIndices[i];
                await this.createCompleteNodeTree(
                    childData,
                    nodeIndex,
                    childIndex,
                    context,
                    includeChildren,
                    includeComponents,
                    childData.name || `Child${i+1}`
                );
            }
        }

        // Then process components
        if (includeComponents && nodeData.components && Array.isArray(nodeData.components)) {
            console.log(`Processing ${nodeData.components.length} components for node ${node._name}`);

            const componentIndices: number[] = [];
            for (const component of nodeData.components) {
                const componentIndex = context.currentId++;
                componentIndices.push(componentIndex);
                node._components.push({ "__id__": componentIndex });

                // Record component UUID to index mapping
                const componentUuid = component.uuid || (component.value && component.value.uuid);
                if (componentUuid) {
                    context.componentUuidToIndex.set(componentUuid, componentIndex);
                    console.log(`Recording component UUID mapping: ${componentUuid} -> ${componentIndex}`);
                }

                // Create component object, passing context to handle references
                const componentObj = this.createComponentObject(component, nodeIndex, context);
                prefabData[componentIndex] = componentObj;

                // Create CompPrefabInfo for component
                const compPrefabInfoIndex = context.currentId++;
                prefabData[compPrefabInfoIndex] = {
                    "__type__": "cc.CompPrefabInfo",
                    "fileId": this.generateFileId()
                };

                // If component object has __prefab property, assign reference
                if (componentObj && typeof componentObj === 'object') {
                    componentObj.__prefab = { "__id__": compPrefabInfoIndex };
                }
            }

            console.log(`✅ Node ${node._name} added ${componentIndices.length} components`);
        }


        // Create PrefabInfo for current node
        const prefabInfoIndex = context.currentId++;
        node._prefab = { "__id__": prefabInfoIndex };

        const prefabInfo: any = {
            "__type__": "cc.PrefabInfo",
            "root": { "__id__": 1 },
            "asset": { "__id__": context.prefabAssetIndex },
            "fileId": fileId,
            "targetOverrides": null,
            "nestedPrefabInstanceRoots": null
        };

        // Special handling for root node
        if (nodeIndex === 1) {
            // Root node has no instance, but may have targetOverrides
            prefabInfo.instance = null;
        } else {
            // Child nodes normally have instance set to null
            prefabInfo.instance = null;
        }

        prefabData[prefabInfoIndex] = prefabInfo;
        context.currentId = prefabInfoIndex + 1;
    }

    /**
     * Convert UUID to Cocos Creator compressed format
     * Implemented based on real Cocos Creator editor compression algorithm
     * First 5 hex characters remain unchanged; remaining 27 characters compress into 18 characters
     */
    private uuidToCompressedId(uuid: string): string {
        const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

        // Remove hyphens and convert to lowercase
        const cleanUuid = uuid.replace(/-/g, '').toLowerCase();

        // Ensure UUID is valid
        if (cleanUuid.length !== 32) {
            return uuid; // If not a valid UUID, return original value
        }

        // Cocos Creator compression algorithm: first 5 characters unchanged, remaining 27 characters compress to 18 characters
        let result = cleanUuid.substring(0, 5);

        // Remaining 27 characters need compression into 18 characters
        const remainder = cleanUuid.substring(5);

        // Every 3 hex characters compress into 2 characters
        for (let i = 0; i < remainder.length; i += 3) {
            const hex1 = remainder[i] || '0';
            const hex2 = remainder[i + 1] || '0';
            const hex3 = remainder[i + 2] || '0';

            // Convert 3 hex characters (12 bits) to 2 base64 characters
            const value = parseInt(hex1 + hex2 + hex3, 16);

            // Split 12 bits into two 6-bit values
            const high6 = (value >> 6) & 63;
            const low6 = value & 63;

            result += BASE64_KEYS[high6] + BASE64_KEYS[low6];
        }

        return result;
    }

    /**
     * Create component object
     */
    private createComponentObject(componentData: any, nodeIndex: number, context?: {
        nodeUuidToIndex?: Map<string, number>,
        componentUuidToIndex?: Map<string, number>
    }): any {
        let componentType = componentData.type || componentData.__type__ || 'cc.Component';
        const enabled = componentData.enabled !== undefined ? componentData.enabled : true;

        // console.log(`Creating component object - original type: ${componentType}`);
        // console.log('Component complete data:', JSON.stringify(componentData, null, 2));

        // Handle script component - MCP interface already returns correct compressed UUID format
        if (componentType && !componentType.startsWith('cc.')) {
            console.log(`Using script component compressed UUID type: ${componentType}`);
        }

        // Base component structure
        const component: any = {
            "__type__": componentType,
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": { "__id__": nodeIndex },
            "_enabled": enabled
        };

        // Set __prefab property placeholder ahead of time; will be properly set later
        component.__prefab = null;

        // Add specific properties based on component type
        if (componentType === 'cc.UITransform') {
            const contentSize = componentData.properties?.contentSize?.value || { width: 100, height: 100 };
            const anchorPoint = componentData.properties?.anchorPoint?.value || { x: 0.5, y: 0.5 };

            component._contentSize = {
                "__type__": "cc.Size",
                "width": contentSize.width,
                "height": contentSize.height
            };
            component._anchorPoint = {
                "__type__": "cc.Vec2",
                "x": anchorPoint.x,
                "y": anchorPoint.y
            };
        } else if (componentType === 'cc.Sprite') {
            // Handle spriteFrame reference for Sprite component
            const spriteFrameProp = componentData.properties?._spriteFrame || componentData.properties?.spriteFrame;
            if (spriteFrameProp) {
                component._spriteFrame = this.processComponentProperty(spriteFrameProp, context);
            } else {
                component._spriteFrame = null;
            }

            component._type = componentData.properties?._type?.value ?? 0;
            component._fillType = componentData.properties?._fillType?.value ?? 0;
            component._sizeMode = componentData.properties?._sizeMode?.value ?? 1;
            component._fillCenter = { "__type__": "cc.Vec2", "x": 0, "y": 0 };
            component._fillStart = componentData.properties?._fillStart?.value ?? 0;
            component._fillRange = componentData.properties?._fillRange?.value ?? 0;
            component._isTrimmedMode = componentData.properties?._isTrimmedMode?.value ?? true;
            component._useGrayscale = componentData.properties?._useGrayscale?.value ?? false;

            // Debug: print all Sprite component properties (commented out)
            // console.log('Sprite component properties:', JSON.stringify(componentData.properties, null, 2));
            component._atlas = null;
            component._id = "";
        } else if (componentType === 'cc.Button') {
            component._interactable = true;
            component._transition = 3;
            component._normalColor = { "__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255 };
            component._hoverColor = { "__type__": "cc.Color", "r": 211, "g": 211, "b": 211, "a": 255 };
            component._pressedColor = { "__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255 };
            component._disabledColor = { "__type__": "cc.Color", "r": 124, "g": 124, "b": 124, "a": 255 };
            component._normalSprite = null;
            component._hoverSprite = null;
            component._pressedSprite = null;
            component._disabledSprite = null;
            component._duration = 0.1;
            component._zoomScale = 1.2;
            // Handle target reference for Button
            const targetProp = componentData.properties?._target || componentData.properties?.target;
            if (targetProp) {
                component._target = this.processComponentProperty(targetProp, context);
            } else {
                component._target = { "__id__": nodeIndex }; // Default points to self node
            }
            component._clickEvents = [];
            component._id = "";
        } else if (componentType === 'cc.Label') {
            component._string = componentData.properties?._string?.value || "Label";
            component._horizontalAlign = 1;
            component._verticalAlign = 1;
            component._actualFontSize = 20;
            component._fontSize = 20;
            component._fontFamily = "Arial";
            component._lineHeight = 25;
            component._overflow = 0;
            component._enableWrapText = true;
            component._font = null;
            component._isSystemFontUsed = true;
            component._spacingX = 0;
            component._isItalic = false;
            component._isBold = false;
            component._isUnderline = false;
            component._underlineHeight = 2;
            component._cacheMode = 0;
            component._id = "";
        } else if (componentData.properties) {
            // Process all component properties (including built-in components and custom script components)
            for (const [key, value] of Object.entries(componentData.properties)) {
                if (key === 'node' || key === 'enabled' || key === '__type__' ||
                    key === 'uuid' || key === 'name' || key === '__scriptAsset' || key === '_objFlags') {
                    continue; // Skip special properties, including _objFlags
                }

                // Special handling for properties prefixed with underscore
                if (key.startsWith('_')) {
                    // Ensure property name remains intact (including underscore)
                    const propValue = this.processComponentProperty(value, context);
                    if (propValue !== undefined) {
                        component[key] = propValue;
                    }
                } else {
                    // Normal handling for properties not starting with underscore
                    const propValue = this.processComponentProperty(value, context);
                    if (propValue !== undefined) {
                        component[key] = propValue;
                    }
                }
            }
        }

        // Ensure _id is positioned at the end
        const _id = component._id || "";
        delete component._id;
        component._id = _id;

        return component;
    }

    /**
     * Process component property value to match manually created prefab format
     */
    private processComponentProperty(propData: any, context?: {
        nodeUuidToIndex?: Map<string, number>,
        componentUuidToIndex?: Map<string, number>
    }): any {
        if (!propData || typeof propData !== 'object') {
            return propData;
        }

        const value = propData.value;
        const type = propData.type;

        // Handle null values
        if (value === null || value === undefined) {
            return null;
        }

        // Handle empty UUID objects, convert to null
        if (value && typeof value === 'object' && value.uuid === '') {
            return null;
        }

        // Handle node references
        if (type === 'cc.Node' && value?.uuid) {
            // In prefabs, node references need to be converted to __id__ form
            if (context?.nodeUuidToIndex && context.nodeUuidToIndex.has(value.uuid)) {
                // Internal reference: convert to __id__ format
                return {
                    "__id__": context.nodeUuidToIndex.get(value.uuid)
                };
            }
            // External reference: set to null because external nodes do not belong to prefab hierarchy
            console.warn(`Node reference UUID ${value.uuid} not found in prefab context, setting to null (external reference)`);
            return null;
        }

        // Handle asset references (prefab, texture, spriteFrame, etc.)
        if (value?.uuid && (
            type === 'cc.Prefab' ||
            type === 'cc.Texture2D' ||
            type === 'cc.SpriteFrame' ||
            type === 'cc.Material' ||
            type === 'cc.AnimationClip' ||
            type === 'cc.AudioClip' ||
            type === 'cc.Font' ||
            type === 'cc.Asset'
        )) {
            // Keep original UUID format for prefab references
            const uuidToUse = type === 'cc.Prefab' ? value.uuid : this.uuidToCompressedId(value.uuid);
            return {
                "__uuid__": uuidToUse,
                "__expectedType__": type
            };
        }

        // Handle component references (including specific component types like cc.Label, cc.Button, etc.)
        if (value?.uuid && (type === 'cc.Component' ||
            type === 'cc.Label' || type === 'cc.Button' || type === 'cc.Sprite' ||
            type === 'cc.UITransform' || type === 'cc.RigidBody2D' ||
            type === 'cc.BoxCollider2D' || type === 'cc.Animation' ||
            type === 'cc.AudioSource' || (type?.startsWith('cc.') && !type.includes('@')))) {
            // In prefabs, component references also need to be converted to __id__ form
            if (context?.componentUuidToIndex && context.componentUuidToIndex.has(value.uuid)) {
                // Internal reference: convert to __id__ format
                console.log(`Component reference ${type} UUID ${value.uuid} found in prefab context, converting to __id__`);
                return {
                    "__id__": context.componentUuidToIndex.get(value.uuid)
                };
            }
            // External reference: set to null because external components do not belong to prefab hierarchy
            console.warn(`Component reference ${type} UUID ${value.uuid} not found in prefab context, setting to null (external reference)`);
            return null;
        }

        // Handle complex types, add __type__ tag
        if (value && typeof value === 'object') {
            if (type === 'cc.Color') {
                return {
                    "__type__": "cc.Color",
                    "r": Math.min(255, Math.max(0, Number(value.r) || 0)),
                    "g": Math.min(255, Math.max(0, Number(value.g) || 0)),
                    "b": Math.min(255, Math.max(0, Number(value.b) || 0)),
                    "a": value.a !== undefined ? Math.min(255, Math.max(0, Number(value.a))) : 255
                };
            } else if (type === 'cc.Vec3') {
                return {
                    "__type__": "cc.Vec3",
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0,
                    "z": Number(value.z) || 0
                };
            } else if (type === 'cc.Vec2') {
                return {
                    "__type__": "cc.Vec2",
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0
                };
            } else if (type === 'cc.Size') {
                return {
                    "__type__": "cc.Size",
                    "width": Number(value.width) || 0,
                    "height": Number(value.height) || 0
                };
            } else if (type === 'cc.Quat') {
                return {
                    "__type__": "cc.Quat",
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0,
                    "z": Number(value.z) || 0,
                    "w": value.w !== undefined ? Number(value.w) : 1
                };
            }
        }

        // Handle array types
        if (Array.isArray(value)) {
            // Node array
            if (propData.elementTypeData?.type === 'cc.Node') {
                return value.map(item => {
                    if (item?.uuid && context?.nodeUuidToIndex?.has(item.uuid)) {
                        return { "__id__": context.nodeUuidToIndex.get(item.uuid) };
                    }
                    return null;
                }).filter(item => item !== null);
            }

            // Asset array
            if (propData.elementTypeData?.type && propData.elementTypeData.type.startsWith('cc.')) {
                return value.map(item => {
                    if (item?.uuid) {
                        return {
                            "__uuid__": this.uuidToCompressedId(item.uuid),
                            "__expectedType__": propData.elementTypeData.type
                        };
                    }
                    return null;
                }).filter(item => item !== null);
            }

            // Primitive type array
            return value.map(item => item?.value !== undefined ? item.value : item);
        }

        // Other complex object types: preserve as-is but ensure __type__ tag is present
        if (value && typeof value === 'object' && type && type.startsWith('cc.')) {
            return {
                "__type__": type,
                ...value
            };
        }

        return value;
    }

    /**
     * Create node object conforming to engine standards
     */
    private createEngineStandardNode(nodeData: any, parentNodeIndex: number | null, nodeName?: string): any {
        // Debug: print raw node data (commented out)
        // console.log('Raw node data:', JSON.stringify(nodeData, null, 2));

        // Extract basic node properties
        const getValue = (prop: any) => {
            if (prop?.value !== undefined) return prop.value;
            if (prop !== undefined) return prop;
            return null;
        };

        const position = getValue(nodeData.position) || getValue(nodeData.value?.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue(nodeData.value?.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue(nodeData.value?.scale) || { x: 1, y: 1, z: 1 };
        const active = getValue(nodeData.active) ?? getValue(nodeData.value?.active) ?? true;
        const name = nodeName || getValue(nodeData.name) || getValue(nodeData.value?.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue(nodeData.value?.layer) || 1073741824;

        // Debug output
        console.log(`Creating node: ${name}, parentNodeIndex: ${parentNodeIndex}`);

        const parentRef = parentNodeIndex !== null ? { "__id__": parentNodeIndex } : null;
        console.log(`Parent reference for node ${name}:`, parentRef);

        return {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": parentRef,
            "_children": [], // Child node references will be added dynamically during recursion
            "_active": active,
            "_components": [], // Component references will be added dynamically when processing components
            "_prefab": { "__id__": 0 }, // Temporary value, will be correctly set later
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": position.x,
                "y": position.y,
                "z": position.z
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rotation.x,
                "y": rotation.y,
                "z": rotation.z,
                "w": rotation.w
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": scale.x,
                "y": scale.y,
                "z": scale.z
            },
            "_mobility": 0,
            "_layer": layer,
            "_euler": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
            },
            "_id": ""
        };
    }

    /**
     * Extract UUID from node data
     */
    private extractNodeUuid(nodeData: any): string | null {
        if (!nodeData) return null;

        // Try multiple methods to retrieve UUID
        const sources = [
            nodeData.uuid,
            nodeData.value?.uuid,
            nodeData.__uuid__,
            nodeData.value?.__uuid__,
            nodeData.id,
            nodeData.value?.id
        ];

        for (const source of sources) {
            if (typeof source === 'string' && source.length > 0) {
                return source;
            }
        }

        return null;
    }

    /**
     * Create minimal node object without any components to avoid dependency issues
     */
    private createMinimalNode(nodeData: any, nodeName?: string): any {
        // Extract basic node properties
        const getValue = (prop: any) => {
            if (prop?.value !== undefined) return prop.value;
            if (prop !== undefined) return prop;
            return null;
        };

        const position = getValue(nodeData.position) || getValue(nodeData.value?.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue(nodeData.value?.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue(nodeData.value?.scale) || { x: 1, y: 1, z: 1 };
        const active = getValue(nodeData.active) ?? getValue(nodeData.value?.active) ?? true;
        const name = nodeName || getValue(nodeData.name) || getValue(nodeData.value?.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue(nodeData.value?.layer) || 33554432;

        return {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "_parent": null,
            "_children": [],
            "_active": active,
            "_components": [], // Empty components array to avoid component dependency issues
            "_prefab": {
                "__id__": 2
            },
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": position.x,
                "y": position.y,
                "z": position.z
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rotation.x,
                "y": rotation.y,
                "z": rotation.z,
                "w": rotation.w
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": scale.x,
                "y": scale.y,
                "z": scale.z
            },
            "_layer": layer,
            "_euler": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
            },
            "_id": ""
        };
    }

    /**
     * Create standard meta file content
     */
    private createStandardMetaContent(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "2.0.3",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName,
                "hasIcon": false
            }
        };
    }

    /**
     * Attempt to convert original node to prefab instance
     */
    /**
     * Attempt to convert original node to prefab instance
     */
    private async convertNodeToPrefabInstance(nodeUuid: string, prefabUuid: string, prefabPath: string): Promise<{ success: boolean; error?: string }> {
        // This feature requires deep scene editor integration; returning failure for now
        // In the actual engine, this involves complex prefab instantiation and node replacement logic
        console.log('Converting node to prefab instance requires deeper engine integration');
        return {
            success: false,
            error: 'Converting node to prefab instance requires deeper engine integration support'
        };
    }

    private async restorePrefabNode(nodeUuid: string, assetUuid: string): Promise<ToolResponse> {
        try {
            // Use official API restore-prefab to revert prefab node
            await (Editor.Message.request as any)('scene', 'restore-prefab', nodeUuid, assetUuid);
            return {
                success: true,
                data: {
                    nodeUuid: nodeUuid,
                    assetUuid: assetUuid,
                    message: 'Prefab node restored successfully'
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to restore prefab node: ${error.message}`
            };
        }
    }

    // New implementation based on official prefab format
    // New implementation based on official prefab format
    private async getNodeDataForPrefab(nodeUuid: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const nodeData: any = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData) {
                return { success: false, error: 'Node does not exist' };
            }
            return { success: true, data: nodeData };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async createStandardPrefabData(nodeData: any, prefabName: string, prefabUuid: string): Promise<any[]> {
        // Create prefab data structure based on official Canvas.prefab format
        const prefabData: any[] = [];
        let currentId = 0;

        // First element: cc.Prefab asset object
        const prefabAsset = {
            "__type__": "cc.Prefab",
            "_name": prefabName,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {
                "__id__": 1
            },
            "optimizationPolicy": 0,
            "persistent": false
        };
        prefabData.push(prefabAsset);
        currentId++;

        // Second element: root node
        const rootNode = await this.createNodeObject(nodeData, null, prefabData, currentId);
        prefabData.push(rootNode.node);
        currentId = rootNode.nextId;

        // Add PrefabInfo for root node - fix asset reference using UUID
        const rootPrefabInfo = {
            "__type__": "cc.PrefabInfo",
            "root": {
                "__id__": 1
            },
            "asset": {
                "__uuid__": prefabUuid
            },
            "fileId": this.generateFileId(),
            "instance": null,
            "targetOverrides": [],
            "nestedPrefabInstanceRoots": []
        };
        prefabData.push(rootPrefabInfo);

        return prefabData;
    }


    private async createNodeObject(nodeData: any, parentId: number | null, prefabData: any[], currentId: number): Promise<{ node: any; nextId: number }> {
        const nodeId = currentId++;

        // Extract basic node properties - adapt to query-node-tree data format
        const getValue = (prop: any) => {
            if (prop?.value !== undefined) return prop.value;
            if (prop !== undefined) return prop;
            return null;
        };

        const position = getValue(nodeData.position) || getValue(nodeData.value?.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue(nodeData.value?.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue(nodeData.value?.scale) || { x: 1, y: 1, z: 1 };
        const active = getValue(nodeData.active) ?? getValue(nodeData.value?.active) ?? true;
        const name = getValue(nodeData.name) || getValue(nodeData.value?.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue(nodeData.value?.layer) || 33554432;

        const node: any = {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": parentId !== null ? { "__id__": parentId } : null,
            "_children": [],
            "_active": active,
            "_components": [],
            "_prefab": parentId === null ? {
                "__id__": currentId++
            } : null,
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": position.x,
                "y": position.y,
                "z": position.z
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rotation.x,
                "y": rotation.y,
                "z": rotation.z,
                "w": rotation.w
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": scale.x,
                "y": scale.y,
                "z": scale.z
            },
            "_mobility": 0,
            "_layer": layer,
            "_euler": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
            },
            "_id": ""
        };

        // Temporarily skip UITransform component to avoid _getDependComponent error
        // Will be dynamically added later via Engine API
        console.log(`Node ${name} temporarily skipping UITransform component to avoid engine dependency error`);

        // Process other components (temporarily skipped to focus on fixing UITransform issue)
        const components = this.extractComponentsFromNode(nodeData);
        if (components.length > 0) {
            console.log(`Node ${name} contains ${components.length} other components, temporarily skipping to focus on UITransform fix`);
        }

        // Process child nodes - use complete structure from query-node-tree
        const childrenToProcess = this.getChildrenToProcess(nodeData);
        if (childrenToProcess.length > 0) {
            console.log(`=== Processing Child Nodes ===`);
            console.log(`Node ${name} contains ${childrenToProcess.length} child nodes`);

            for (let i = 0; i < childrenToProcess.length; i++) {
                const childData = childrenToProcess[i];
                const childName = childData.name || childData.value?.name || 'Unknown';
                console.log(`Processing child node #${i + 1}: ${childName}`);

                try {
                    const childId = currentId;
                    node._children.push({ "__id__": childId });

                    // Recursively create child nodes
                    const childResult = await this.createNodeObject(childData, nodeId, prefabData, currentId);
                    prefabData.push(childResult.node);
                    currentId = childResult.nextId;

                    // Child nodes do not need PrefabInfo, only root node does
                    // Child node _prefab should be set to null
                    childResult.node._prefab = null;

                    console.log(`✅ Successfully added child node: ${childName}`);
                } catch (error) {
                    console.error(`Error processing child node ${childName}:`, error);
                }
            }
        }

        return { node, nextId: currentId };
    }

    // Extract component information from node data
    private extractComponentsFromNode(nodeData: any): any[] {
        const components: any[] = [];

        // Attempt to get component data from different locations
        const componentSources = [
            nodeData.__comps__,
            nodeData.components,
            nodeData.value?.__comps__,
            nodeData.value?.components
        ];

        for (const source of componentSources) {
            if (Array.isArray(source)) {
                components.push(...source.filter(comp => comp && (comp.__type__ || comp.type)));
                break; // Exit once a valid component array is found
            }
        }

        return components;
    }

    // Create standard component object
    private createStandardComponentObject(componentData: any, nodeId: number, prefabInfoId: number): any {
        const componentType = componentData.__type__ || componentData.type;

        if (!componentType) {
            console.warn('Component missing type information:', componentData);
            return null;
        }

        // Base component structure - based on official prefab format
        const component: any = {
            "__type__": componentType,
            "_name": "",
            "_objFlags": 0,
            "node": {
                "__id__": nodeId
            },
            "_enabled": this.getComponentPropertyValue(componentData, 'enabled', true),
            "__prefab": {
                "__id__": prefabInfoId
            }
        };

        // Add specific properties based on component type
        this.addComponentSpecificProperties(component, componentData, componentType);

        // Add _id property
        component._id = "";

        return component;
    }

    // Add component-specific properties
    private addComponentSpecificProperties(component: any, componentData: any, componentType: string): void {
        switch (componentType) {
            case 'cc.UITransform':
                this.addUITransformProperties(component, componentData);
                break;
            case 'cc.Sprite':
                this.addSpriteProperties(component, componentData);
                break;
            case 'cc.Label':
                this.addLabelProperties(component, componentData);
                break;
            case 'cc.Button':
                this.addButtonProperties(component, componentData);
                break;
            default:
                // For unknown component types, copy all safe properties
                this.addGenericProperties(component, componentData);
                break;
        }
    }

    // UITransform component properties
    private addUITransformProperties(component: any, componentData: any): void {
        component._contentSize = this.createSizeObject(
            this.getComponentPropertyValue(componentData, 'contentSize', { width: 100, height: 100 })
        );
        component._anchorPoint = this.createVec2Object(
            this.getComponentPropertyValue(componentData, 'anchorPoint', { x: 0.5, y: 0.5 })
        );
    }

    // Sprite component properties
    private addSpriteProperties(component: any, componentData: any): void {
        component._visFlags = 0;
        component._customMaterial = null;
        component._srcBlendFactor = 2;
        component._dstBlendFactor = 4;
        component._color = this.createColorObject(
            this.getComponentPropertyValue(componentData, 'color', { r: 255, g: 255, b: 255, a: 255 })
        );
        component._spriteFrame = this.getComponentPropertyValue(componentData, 'spriteFrame', null);
        component._type = this.getComponentPropertyValue(componentData, 'type', 0);
        component._fillType = 0;
        component._sizeMode = this.getComponentPropertyValue(componentData, 'sizeMode', 1);
        component._fillCenter = this.createVec2Object({ x: 0, y: 0 });
        component._fillStart = 0;
        component._fillRange = 0;
        component._isTrimmedMode = true;
        component._useGrayscale = false;
        component._atlas = null;
    }

    // Label component properties
    private addLabelProperties(component: any, componentData: any): void {
        component._visFlags = 0;
        component._customMaterial = null;
        component._srcBlendFactor = 2;
        component._dstBlendFactor = 4;
        component._color = this.createColorObject(
            this.getComponentPropertyValue(componentData, 'color', { r: 0, g: 0, b: 0, a: 255 })
        );
        component._string = this.getComponentPropertyValue(componentData, 'string', 'Label');
        component._horizontalAlign = 1;
        component._verticalAlign = 1;
        component._actualFontSize = 20;
        component._fontSize = this.getComponentPropertyValue(componentData, 'fontSize', 20);
        component._fontFamily = 'Arial';
        component._lineHeight = 40;
        component._overflow = 1;
        component._enableWrapText = false;
        component._font = null;
        component._isSystemFontUsed = true;
        component._isItalic = false;
        component._isBold = false;
        component._isUnderline = false;
        component._underlineHeight = 2;
        component._cacheMode = 0;
    }

    // Button component properties
    private addButtonProperties(component: any, componentData: any): void {
        component.clickEvents = [];
        component._interactable = true;
        component._transition = 2;
        component._normalColor = this.createColorObject({ r: 214, g: 214, b: 214, a: 255 });
        component._hoverColor = this.createColorObject({ r: 211, g: 211, b: 211, a: 255 });
        component._pressedColor = this.createColorObject({ r: 255, g: 255, b: 255, a: 255 });
        component._disabledColor = this.createColorObject({ r: 124, g: 124, b: 124, a: 255 });
        component._duration = 0.1;
        component._zoomScale = 1.2;
    }

    // Add generic properties
    private addGenericProperties(component: any, componentData: any): void {
        // Only copy safe, known properties
        const safeProperties = ['enabled', 'color', 'string', 'fontSize', 'spriteFrame', 'type', 'sizeMode'];

        for (const prop of safeProperties) {
            if (componentData.hasOwnProperty(prop)) {
                const value = this.getComponentPropertyValue(componentData, prop);
                if (value !== undefined) {
                    component[`_${prop}`] = value;
                }
            }
        }
    }

    // Create Vec2 object
    private createVec2Object(data: any): any {
        return {
            "__type__": "cc.Vec2",
            "x": data?.x || 0,
            "y": data?.y || 0
        };
    }

    // Create Vec3 object
    private createVec3Object(data: any): any {
        return {
            "__type__": "cc.Vec3",
            "x": data?.x || 0,
            "y": data?.y || 0,
            "z": data?.z || 0
        };
    }

    // Create Size object
    private createSizeObject(data: any): any {
        return {
            "__type__": "cc.Size",
            "width": data?.width || 100,
            "height": data?.height || 100
        };
    }

    // Create Color object
    private createColorObject(data: any): any {
        return {
            "__type__": "cc.Color",
            "r": data?.r ?? 255,
            "g": data?.g ?? 255,
            "b": data?.b ?? 255,
            "a": data?.a ?? 255
        };
    }

    // Determine whether component property should be copied
    private shouldCopyComponentProperty(key: string, value: any): boolean {
        // Skip internal properties and already processed properties
        if (key.startsWith('__') || key === '_enabled' || key === 'node' || key === 'enabled') {
            return false;
        }

        // Skip functions and undefined values
        if (typeof value === 'function' || value === undefined) {
            return false;
        }

        return true;
    }


    // Get component property value - renamed to avoid collision
    private getComponentPropertyValue(componentData: any, propertyName: string, defaultValue?: any): any {
        // Attempt direct property retrieval
        if (componentData[propertyName] !== undefined) {
            return this.extractValue(componentData[propertyName]);
        }

        // Attempt retrieval from value property
        if (componentData.value && componentData.value[propertyName] !== undefined) {
            return this.extractValue(componentData.value[propertyName]);
        }

        // Attempt underscore-prefixed property name
        const prefixedName = `_${propertyName}`;
        if (componentData[prefixedName] !== undefined) {
            return this.extractValue(componentData[prefixedName]);
        }

        return defaultValue;
    }

    // Extract property value
    private extractValue(data: any): any {
        if (data === null || data === undefined) {
            return data;
        }

        // If value property exists, prioritize value
        if (typeof data === 'object' && data.hasOwnProperty('value')) {
            return data.value;
        }

        // If reference object, keep as-is
        if (typeof data === 'object' && (data.__id__ !== undefined || data.__uuid__ !== undefined)) {
            return data;
        }

        return data;
    }

    private createStandardMetaData(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "1.1.50",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName
            }
        };
    }

    private async savePrefabWithMeta(prefabPath: string, prefabData: any[], metaData: any): Promise<{ success: boolean; error?: string }> {
        try {
            const prefabContent = JSON.stringify(prefabData, null, 2);
            const metaContent = JSON.stringify(metaData, null, 2);

            // Ensure path ends with .prefab
            const finalPrefabPath = prefabPath.endsWith('.prefab') ? prefabPath : `${prefabPath}.prefab`;
            const metaPath = `${finalPrefabPath}.meta`;

            // Create prefab file using asset-db API
            await Editor.Message.request('asset-db', 'create-asset', finalPrefabPath, prefabContent);

            // Create meta file
            await Editor.Message.request('asset-db', 'create-asset', metaPath, metaContent);

            console.log(`=== Prefab Save Complete ===`);
            console.log(`Prefab file saved: ${finalPrefabPath}`);
            console.log(`Meta file saved: ${metaPath}`);
            console.log(`Total prefab array length: ${prefabData.length}`);
            console.log(`Prefab root node index: ${prefabData.length - 1}`);

            return { success: true };
        } catch (error: any) {
            console.error('Error saving prefab file:', error);
            return { success: false, error: error.message };
        }
    }

    // Unlink prefab, converting prefab instance to normal node
    // Unlink prefab, converting prefab instance to normal node
    private async unlinkPrefab(nodeUuid: string): Promise<ToolResponse> {
        try {
            console.log(`Starting to unlink prefab: ${nodeUuid}`);

            // Use Editor.Message.request to invoke scene API unlink-prefab method
            console.log('Attempting to unlink prefab, arguments: [nodeUuid, true]');
            try {
                const result: any = await Editor.Message.request('scene', 'unlink-prefab', [
                    nodeUuid,
                    true
                ]);
                console.log('unlink-prefab API call completed, return value:', result);

                // Wait briefly for editor to process changes
                await new Promise(resolve => setTimeout(resolve, 100));

                // Manually clear prefab properties
                try {
                    console.log('Manually clearing prefab properties...');
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: '__prefab__',
                        dump: { value: null }
                    });
                    console.log('Prefab properties cleared');
                } catch (clearError) {
                    console.log('Failed to clear prefab properties:', clearError);
                }

                // Wait again for processing
                await new Promise(resolve => setTimeout(resolve, 100));

                // Verify if node has actually unlinked from prefab
                try {
                    const nodeInfo = await Editor.Message.request('scene', 'query-node', nodeUuid);
                    console.log('Final verification - node prefab status:', nodeInfo && (nodeInfo as any).__prefab__ ? 'still a prefab' : 'unlinked');

                    // Check if node still has prefab properties
                    const isPrefabInstance = nodeInfo && (nodeInfo as any).__prefab__ && (nodeInfo as any).__prefab__.uuid;

                    return {
                        success: true,
                        data: {
                            nodeUuid: nodeUuid,
                            message: isPrefabInstance ?
                                'Prefab unlink may not have completed successfully, please check editor interface' :
                                'Prefab instance successfully converted to normal node',
                            result: result,
                            isPrefabInstance: isPrefabInstance,
                            nodeInfo: nodeInfo,
                            note: 'Node status verified'
                        }
                    };
                } catch (verifyError) {
                    console.log('Error verifying node status:', verifyError);
                    return {
                        success: true,
                        data: {
                            nodeUuid: nodeUuid,
                            message: 'Prefab unlink API call succeeded, but failed to verify final status',
                            result: result,
                            verifyError: String(verifyError)
                        }
                    };
                }
            } catch (error: any) {
                console.error('Failed to unlink prefab:', error);

                // Try fallback method: setting node prefab property to null
                const altResult = await this.tryAlternativeUnlink(nodeUuid);
                if (altResult.success) {
                    return altResult;
                } else {
                    return {
                        success: false,
                        error: `Failed to unlink prefab: ${error.message || error}`,
                        instruction: 'Please confirm the node is a prefab instance and exists in the current scene'
                    };
                }
            }
        } catch (error) {
            console.error('Exception unlinking prefab:', error);
            return {
                success: false,
                error: `Exception unlinking prefab: ${error}`
            };
        }
    }

    // Fallback unlink method: modify node properties
    // Fallback unlink method: modify node properties
    private async tryAlternativeUnlink(nodeUuid: string): Promise<ToolResponse> {
        try {
            // Try unlinking prefab by setting node properties
            await Editor.Message.request('scene', 'set-property', {
                uuid: nodeUuid,
                path: '_prefab',
                dump: { value: null }
            });
            // Also remove prefab instance tag
            await Editor.Message.request('scene', 'set-property', {
                uuid: nodeUuid,
                path: '_prefab.instance',
                dump: { value: null }
            });
            console.log('Fallback method unlinked prefab successfully');
            return {
                success: true,
                data: {
                    nodeUuid: nodeUuid,
                    message: 'Prefab instance converted to normal node via fallback method',
                    method: 'alternative'
                }
            };
        } catch (error: any) {
            console.error('Fallback method failed:', error);
            return {
                success: false,
                error: `Fallback method failed: ${error.message || error}`
            };
        }
    }

    // Apply prefab instance modifications back to prefab asset
    // Apply prefab instance modifications back to prefab asset
    private async applyPrefab(nodeUuid: string): Promise<ToolResponse> {
        try {
            console.log(`Starting to apply prefab instance modifications: ${nodeUuid}`);

            // 1. Verify that node is a prefab instance first
            const nodeInfo = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeInfo || !(nodeInfo as any).__prefab__) {
                return {
                    success: false,
                    error: 'The specified node is not a prefab instance'
                };
            }

            const prefabInfo = (nodeInfo as any).__prefab__;
            const prefabAssetUuid = prefabInfo.asset;

            console.log(`Prefab instance info:`, prefabInfo);
            console.log(`Associated prefab asset UUID: ${prefabAssetUuid}`);

            // 2. Invoke scene.apply-prefab API to apply changes
            console.log('Invoking scene.apply-prefab API...');
            const applyResult: any = await Editor.Message.request('scene', 'apply-prefab', [nodeUuid]);
            console.log('apply-prefab API call result:', applyResult);

            // 3. Wait for editor processing
            await new Promise(resolve => setTimeout(resolve, 200));

            // 4. Query prefab asset path to update
            try {
                const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefabAssetUuid);
                console.log('Prefab asset info:', assetInfo);

                if (assetInfo && assetInfo.source) {
                    const prefabPath = assetInfo.source;
                    console.log(`Prefab asset path: ${prefabPath}`);

                    // 5. Refresh specific prefab asset
                    await this.refreshAssets(prefabPath);

                    return {
                        success: true,
                        data: {
                            nodeUuid: nodeUuid,
                            prefabAssetUuid: prefabAssetUuid,
                            prefabPath: prefabPath,
                            message: 'Prefab instance modifications successfully applied to prefab asset',
                            applyResult: applyResult
                        }
                    };
                } else {
                    return {
                        success: true,
                        data: {
                            nodeUuid: nodeUuid,
                            prefabAssetUuid: prefabAssetUuid,
                            message: 'Prefab modifications applied, but failed to get asset path info',
                            applyResult: applyResult
                        }
                    };
                }
            } catch (assetError) {
                console.log('Failed to get prefab asset info:', assetError);
                return {
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        prefabAssetUuid: prefabAssetUuid,
                        message: 'Prefab modifications applied, but error occurred getting asset info',
                        applyResult: applyResult,
                        assetError: String(assetError)
                    }
                };
            }

        } catch (error: any) {
            console.error('Exception applying prefab modifications:', error);
            return {
                success: false,
                error: `Exception applying prefab modifications: ${error.message || error}`
            };
        }
    }

    // Enter prefab edit mode - implemented based on editor logs
    // Enter prefab edit mode - implemented based on editor logs
    private async enterPrefabEditMode(prefabPath: string): Promise<ToolResponse> {
        try {
            console.log(`Starting to enter prefab edit mode: ${prefabPath}`);

            // 0. Query and store current scene before entering prefab mode
            try {
                const currentSceneUuid: string | null = await Editor.Message.request('scene', 'query-current-scene');
                if (currentSceneUuid) {
                    const sceneAssetInfo = await Editor.Message.request('asset-db', 'query-asset-info', currentSceneUuid);
                    if (sceneAssetInfo && sceneAssetInfo.url) {
                        PrefabTools.activeSession.previousSceneUuid = currentSceneUuid;
                        PrefabTools.activeSession.previousSceneUrl = sceneAssetInfo.url;
                        console.log(`[PrefabTools] Stored previous scene: ${sceneAssetInfo.url} (${currentSceneUuid})`);
                    }
                }
            } catch (err) {
                console.warn('[PrefabTools] Could not query current scene before entering prefab mode:', err);
            }
            PrefabTools.activeSession.editingPrefabPath = prefabPath;

            // 1. Query prefab asset info
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
            if (!assetInfo) {
                return {
                    success: false,
                    error: 'Prefab asset does not exist'
                };
            }

            const prefabUuid = assetInfo.uuid;
            console.log(`Prefab UUID: ${prefabUuid}`);

            // 2. Based on editor logs, open prefab asset first (like double-clicking prefab file)
            try {
                await Editor.Message.request('asset-db', 'open-asset', prefabPath);
                console.log('Prefab asset open request sent');
            } catch (openError) {
                console.log('Failed to open prefab asset:', openError);
            }

            // 3. Wait for editor to process asset opening
            await new Promise(resolve => setTimeout(resolve, 800));

            // 4. Set prefab preview mode (based on call-preview-function in logs)
            try {
                await Editor.Message.request('scene', 'call-preview-function', [
                    'scene:prefab-preview',
                    'setPrefab',
                    prefabUuid
                ]);
                console.log('Prefab preview mode set successfully');
            } catch (previewError) {
                console.log('Failed to set prefab preview mode:', previewError);
            }

            // 5. Set hierarchy panel to prefab edit mode (based on hierarchy.staging in logs)
            try {
                await Editor.Message.request('hierarchy', 'staging', {
                    assetUuid: prefabUuid,
                    animationUuid: '',
                    expandLevels: ['0']
                });
                console.log('Hierarchy prefab edit mode set successfully');
            } catch (hierarchyError) {
                console.log('Failed to set Hierarchy prefab edit mode:', hierarchyError);
            }

            // 6. Wait for editor to completely process
            await new Promise(resolve => setTimeout(resolve, 500));

            return {
                success: true,
                data: {
                    prefabPath: prefabPath,
                    prefabUuid: prefabUuid,
                    message: 'Entered prefab edit mode',
                    mode: 'prefab-edit',
                    editSession: {
                        prefabPath: prefabPath,
                        prefabUuid: prefabUuid,
                        startTime: Date.now()
                    },
                    note: 'Editor interface should now be switched to prefab edit mode'
                }
            };

        } catch (error: any) {
            console.error('Failed to enter prefab edit mode:', error);
            return {
                success: false,
                error: `Failed to enter prefab edit mode: ${error.message || error}`
            };
        }
    }

    // Save prefab - based on save-asset call in editor logs
    // Save prefab - based on save-asset call in editor logs
    private async savePrefabDirect(prefabPath: string): Promise<ToolResponse> {
        try {
            console.log(`Starting to save prefab: ${prefabPath}`);

            // 1. Query prefab asset info
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
            if (!assetInfo) {
                return {
                    success: false,
                    error: 'Prefab asset does not exist'
                };
            }

            const prefabUuid = assetInfo.uuid;
            console.log(`Prefab UUID: ${prefabUuid}`);

            // 2. Call scene.save-scene to save current editing state (based on logs)
            // This saves the current scene editing state into memory
            try {
                await Editor.Message.request('scene', 'save-scene');
                console.log('Scene state saved to memory');
            } catch (saveSceneError) {
                console.log('Failed to save scene state:', saveSceneError);
            }

            // 3. Query prefab metadata
            try {
                const metaInfo = await Editor.Message.request('asset-db', 'query-asset-meta', prefabUuid);
                console.log('Prefab metadata:', metaInfo);
            } catch (metaError) {
                console.log('Failed to get prefab metadata:', metaError);
            }

            // 4. Trigger save operation directly based on editor logs
            // In prefab edit mode, scene.save-scene automatically handles saving prefab content
            // No need to manually invoke asset-db.save-asset; editor handles it automatically

            // 5. Wait for editor to process asset changes
            await new Promise(resolve => setTimeout(resolve, 500));

            return {
                success: true,
                data: {
                    prefabPath: prefabPath,
                    prefabUuid: prefabUuid,
                    message: 'Prefab save request sent; editor will automatically process the save flow',
                    timestamp: Date.now(),
                    note: 'Based on editor logs, scene.save-scene automatically saves prefab content in prefab edit mode'
                }
            };

        } catch (error: any) {
            console.error('Failed to save prefab:', error);
            return {
                success: false,
                error: `Failed to save prefab: ${error.message || error}`
            };
        }
    }

    // Exit prefab edit mode - switch back to scene
    // Exit prefab edit mode - switch back to scene
    private async exitPrefabEditMode(scenePath?: string): Promise<ToolResponse> {
        try {
            // 1. Determine target scene path: explicit arg -> stored session scene -> search project scenes
            let targetScene = scenePath;
            if (!targetScene && PrefabTools.activeSession.previousSceneUrl) {
                targetScene = PrefabTools.activeSession.previousSceneUrl;
            }

            if (!targetScene) {
                try {
                    const scenes = await Editor.Message.request('asset-db', 'query-assets', { pattern: 'db://assets/**/*.scene' });
                    if (Array.isArray(scenes) && scenes.length > 0) {
                        const preferred = scenes.find((s: any) => s.url && (s.url.includes('game.scene') || s.url.includes('main.scene'))) || scenes[0];
                        targetScene = preferred.url;
                        console.log(`[PrefabTools] Fallback discovered scene: ${targetScene}`);
                    }
                } catch (e) {
                    console.warn('[PrefabTools] Scene auto-discovery error:', e);
                }
            }

            if (!targetScene) {
                targetScene = 'db://assets/scenes/game.scene';
            }

            console.log(`Starting to exit prefab edit mode, switching to scene: ${targetScene}`);

            // 2. Query target scene info
            let sceneAssetInfo = await Editor.Message.request('asset-db', 'query-asset-info', targetScene);
            if (!sceneAssetInfo) {
                // Try searching by basename if full path failed
                const baseName = targetScene.split('/').pop() || '';
                if (baseName) {
                    const candidates = await Editor.Message.request('asset-db', 'query-assets', { pattern: `db://assets/**/${baseName}` });
                    if (Array.isArray(candidates) && candidates.length > 0) {
                        targetScene = candidates[0].url;
                        sceneAssetInfo = candidates[0];
                    }
                }
            }

            if (!sceneAssetInfo) {
                return {
                    success: false,
                    error: `Target scene '${targetScene}' does not exist`
                };
            }

            const sceneUuid = sceneAssetInfo.uuid;
            console.log(`Target scene UUID: ${sceneUuid}`);

            // 3. Call asset-db.open-asset to open scene asset
            try {
                await Editor.Message.request('asset-db', 'open-asset', targetScene);
                console.log('Scene asset open request sent');
            } catch (openError) {
                console.log('Failed to open scene asset:', openError);
            }

            // 4. Call scene.open-scene to switch scene
            try {
                await Editor.Message.request('scene', 'open-scene', sceneUuid);
                console.log('Scene switch request sent');
            } catch (openSceneError) {
                console.log('Failed to switch scene:', openSceneError);
            }

            // 5. Wait for editor to process scene switch
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 6. Query current scene state to confirm successful switch
            try {
                const currentScene = await Editor.Message.request('scene', 'query-current-scene');
                console.log('Current scene:', currentScene);
            } catch (queryError) {
                console.log('Failed to query current scene:', queryError);
            }

            PrefabTools.activeSession.editingPrefabPath = null;

            return {
                success: true,
                data: {
                    message: 'Exited prefab edit mode and switched to scene',
                    previousMode: 'prefab-edit',
                    currentMode: 'scene',
                    targetScene: targetScene,
                    sceneUuid: sceneUuid,
                    timestamp: Date.now()
                }
            };

        } catch (error: any) {
            console.error('Failed to exit prefab edit mode:', error);
            return {
                success: false,
                error: `Failed to exit prefab edit mode: ${error.message || error}`
            };
        }
    }

    private async atomicEditPrefab(args: any): Promise<ToolResponse> {
        const { prefabPath, operations } = args;
        if (!prefabPath) {
            return { success: false, error: 'prefabPath is required for atomic_edit' };
        }
        if (!Array.isArray(operations) || operations.length === 0) {
            return { success: false, error: 'operations array is required and must not be empty' };
        }

        // 1. Enter edit mode
        const enterRes = await this.enterPrefabEditMode(prefabPath);
        if (!enterRes.success) return enterRes;

        const results: any[] = [];
        let failed = false;
        let failError: any = null;

        // 2. Execute operations
        const { MCPServer } = require('../mcp-server');
        const mcp = MCPServer.getInstance ? MCPServer.getInstance() : null;

        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const startTime = Date.now();
            try {
                let opResult: any;
                if (mcp) {
                    opResult = await mcp.executeToolCall(op.tool, op.args);
                } else {
                    throw new Error('MCPServer instance unavailable to dispatch operation');
                }

                results.push({
                    index: i,
                    tool: op.tool,
                    success: opResult?.success !== false,
                    result: opResult,
                    durationMs: Date.now() - startTime
                });

                if (opResult?.success === false) {
                    failed = true;
                    failError = opResult.error || `Operation ${i} (${op.tool}) failed`;
                    break;
                }
            } catch (err: any) {
                failed = true;
                failError = err.message || err;
                results.push({
                    index: i,
                    tool: op.tool,
                    success: false,
                    error: err.message || String(err),
                    durationMs: Date.now() - startTime
                });
                break;
            }
        }

        // 3. Save if operations succeeded
        let saveRes: any = null;
        if (!failed) {
            saveRes = await this.savePrefabDirect(prefabPath);
        }

        // 4. Always exit back to scene
        const exitRes = await this.exitPrefabEditMode(args.scenePath);

        return {
            success: !failed && (saveRes ? saveRes.success : true),
            error: failError,
            data: {
                prefabPath,
                operationsTotal: operations.length,
                operationsExecuted: results.length,
                results,
                saved: !failed && (saveRes?.success || false),
                exited: exitRes.success,
                targetScene: exitRes.data?.targetScene
            }
        };
    }

    // Begin recording edit operation - based on begin-recording in logs
    // Begin recording edit operation - based on begin-recording in logs
    private async beginRecording(nodeUuids: string[]): Promise<ToolResponse> {
        try {
            console.log(`Starting to record edit operations, nodes: ${nodeUuids.join(', ')}`);

            const result = await Editor.Message.request('scene', 'begin-recording',
                nodeUuids,
                null
            );

            console.log('Begin recording result:', result);

            return {
                success: true,
                data: {
                    nodeUuids: nodeUuids,
                    recordingId: result,
                    message: 'Edit recording started',
                    timestamp: Date.now()
                }
            };

        } catch (error: any) {
            console.error('Failed to begin recording edit operation:', error);
            return {
                success: false,
                error: `Failed to begin recording edit operation: ${error.message || error}`
            };
        }
    }

    // End recording edit operation - based on end-recording in logs
    // End recording edit operation - based on end-recording in logs
    private async endRecording(recordingId: string): Promise<ToolResponse> {
        try {
            console.log(`Ending edit recording, recording ID: ${recordingId}`);

            const result = await Editor.Message.request('scene', 'end-recording', recordingId);

            console.log('End recording result:', result);

            return {
                success: true,
                data: {
                    recordingId: recordingId,
                    result: result,
                    message: 'Edit recording ended',
                    timestamp: Date.now()
                }
            };

        } catch (error: any) {
            console.error('Failed to end recording edit operation:', error);
            return {
                success: false,
                error: `Failed to end recording edit operation: ${error.message || error}`
            };
        }
    }

    // Test prefab modifications - instantiate prefab to verify modifications succeeded
    // Test prefab modifications - instantiate prefab to verify modifications succeeded
    private async testPrefabChanges(prefabPath: string, parentUuid?: string): Promise<ToolResponse> {
        try {
            console.log(`Starting to test prefab modifications: ${prefabPath}`);

            // 1. Ensure we are in scene mode first
            try {
                await this.exitPrefabEditMode();
                console.log('Ensured in scene mode');
            } catch (exitError) {
                console.log('Error switching to scene mode:', exitError);
            }

            // 2. Get scene root node as parent (if parentUuid was not specified)
            let targetParentUuid = parentUuid;
            if (!targetParentUuid) {
                try {
                    const nodeTree: any = await Editor.Message.request('scene', 'query-node-tree');
                    if (nodeTree && nodeTree.children && nodeTree.children.length > 0) {
                        // Use Canvas node as parent
                        const canvasNode = nodeTree.children.find((child: any) =>
                            child.name && (child.name.includes('Canvas') || (child.__comps__ && child.__comps__.some((comp: any) => comp.__type__ === 'cc.Canvas')))
                        );
                        if (canvasNode) {
                            targetParentUuid = canvasNode.uuid.value;
                            console.log(`Found Canvas node as parent: ${targetParentUuid}`);
                        } else {
                            targetParentUuid = nodeTree.uuid.value; // Use scene root node
                            console.log(`Using scene root node as parent: ${targetParentUuid}`);
                        }
                    }
                } catch (treeError) {
                    console.log('Failed to get node tree:', treeError);
                }
            }

            // 3. Instantiate prefab into scene
            console.log(`Instantiating prefab into node: ${targetParentUuid}`);
            const instantiateResult = await this.instantiatePrefab({
                prefabPath: prefabPath,
                parentUuid: targetParentUuid,
                position: { x: 0, y: 0, z: 0 }
            });

            if (!instantiateResult.success) {
                return {
                    success: false,
                    error: `Failed to instantiate prefab: ${instantiateResult.error}`
                };
            }

            const instanceNodeUuid = instantiateResult.data.nodeUuid;
            console.log(`Prefab instantiated successfully, node UUID: ${instanceNodeUuid}`);

            // 4. Wait for instantiation to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 5. Query instantiated node info to verify modifications
            try {
                const instanceInfo = await Editor.Message.request('scene', 'query-node', instanceNodeUuid);
                console.log('Instantiated node info:', JSON.stringify(instanceInfo, null, 2));

                // 6. Query node tree to get child node info
                const nodeTree = await Editor.Message.request('scene', 'query-node-tree');
                const findInstanceInTree = (tree: any, targetUuid: string): any => {
                    if (tree.uuid && tree.uuid.value === targetUuid) {
                        return tree;
                    }
                    if (tree.children) {
                        for (const child of tree.children) {
                            const found = findInstanceInTree(child, targetUuid);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const instanceNode = findInstanceInTree(nodeTree, instanceNodeUuid);
                console.log('Instance info in node tree:', JSON.stringify(instanceNode, null, 2));

                return {
                    success: true,
                    data: {
                        message: 'Test completed - prefab instantiated successfully',
                        instanceNodeUuid: instanceNodeUuid,
                        prefabPath: prefabPath,
                        note: 'Check editor Hierarchy panel to verify changes'
                    }
                };

            } catch (queryError) {
                console.log('Failed to query instance node info:', queryError);
                return {
                    success: true,
                    data: {
                        prefabPath: prefabPath,
                        instanceNodeUuid: instanceNodeUuid,
                        parentUuid: targetParentUuid,
                        message: 'Prefab instantiated successfully, but failed to query detailed info',
                        note: 'Please manually inspect the prefab instance in the editor'
                    }
                };
            }

        } catch (error: any) {
            console.error('Failed to test prefab modifications:', error);
            return {
                success: false,
                error: `Failed to test prefab modifications: ${error.message || error}`
            };
        }
    }
}
