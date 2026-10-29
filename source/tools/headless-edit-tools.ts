import * as fs from 'fs';
import * as path from 'path';
import { ToolResponse } from '../types';
import { PrefabAstParser } from '../utils/prefab-ast-parser';
import { ScriptMetaRegistry } from '../utils/uuid-utils';

declare const Editor: any;

export interface HeadlessChainOp {
    action?: string;
    type?: string;
    op?: string;
    nodePath?: string;
    targetNode?: string;
    name?: string;
    parentPath?: string;
    newParentPath?: string;
    componentType?: string;
    component?: string;
    componentIndex?: number;
    property?: string;
    properties?: Record<string, any>;
    value?: any;
    valueMode?: 'self_node' | string;
    position?: { x?: number; y?: number; z?: number };
    rotation?: { x?: number; y?: number; z?: number; w?: number };
    scale?: { x?: number; y?: number; z?: number };
    size?: { width?: number; height?: number };
    anchor?: { x?: number; y?: number };
    layer?: number;
    active?: boolean;
    is2D?: boolean;
    components?: Array<{ componentType: string; properties?: Record<string, any> }>;
}

export class HeadlessEditTools {
    private static instance: HeadlessEditTools | null = null;
    private metaRegistry: ScriptMetaRegistry = ScriptMetaRegistry.getInstance();

    public static getInstance(): HeadlessEditTools {
        if (!HeadlessEditTools.instance) {
            HeadlessEditTools.instance = new HeadlessEditTools();
        }
        return HeadlessEditTools.instance;
    }

    public resolveToDiskPath(assetPathOrUrl: string): string {
        if (!assetPathOrUrl) return '';
        if (fs.existsSync(assetPathOrUrl)) return path.resolve(assetPathOrUrl);

        // Resolve db:// URL to absolute file path
        if (assetPathOrUrl.startsWith('db://')) {
            const projectRoot = this.getProjectRoot();
            const rel = assetPathOrUrl.replace(/^db:\/\//, '');
            const candidate = path.join(projectRoot, rel);
            if (fs.existsSync(candidate)) return candidate;
        }

        // Relative to project root
        const candidate2 = path.join(this.getProjectRoot(), assetPathOrUrl);
        if (fs.existsSync(candidate2)) return candidate2;

        return assetPathOrUrl;
    }

    public getProjectRoot(): string {
        if (typeof Editor !== 'undefined' && Editor?.Project?.path) {
            return Editor.Project.path;
        }
        return path.resolve(__dirname, '../../../..');
    }

    public notifyAssetDb(filePath: string): void {
        try {
            if (typeof Editor !== 'undefined' && Editor?.Message?.send) {
                const projectRoot = this.getProjectRoot();
                const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/');
                Editor.Message.send('asset-db', 'refresh-asset', `db://${rel}`);
            }
        } catch {
            // Ignore if Editor IPC is not reachable
        }
    }

    /**
     * Inspect any .scene or .prefab file offline without opening in editor canvas.
     */
    public async inspectHeadless(args: {
        targetFile?: string;
        scenePath?: string;
        prefabPath?: string;
        file?: string;
        includeComponents?: boolean;
        targetNode?: string;
    }): Promise<ToolResponse> {
        try {
            const rawTarget = args.targetFile || args.scenePath || args.prefabPath || args.file;
            if (!rawTarget) {
                return { success: false, error: 'inspect_headless requires targetFile (or scenePath/prefabPath)' };
            }

            const diskPath = this.resolveToDiskPath(rawTarget);
            if (!fs.existsSync(diskPath)) {
                return { success: false, error: `Target file not found: ${rawTarget}` };
            }

            const parser = await PrefabAstParser.loadFromFile(diskPath);
            const root = parser.getRootNode();
            if (!root) {
                return { success: false, error: 'Failed to parse root node/scene from file' };
            }

            const includeComponents = args.includeComponents !== false;
            let hierarchy: any = null;

            if (args.targetNode) {
                const target = parser.resolveNode(args.targetNode);
                if (target) {
                    hierarchy = parser.getHierarchyTree(includeComponents);
                } else {
                    return { success: false, error: `Target node "${args.targetNode}" not found in file` };
                }
            } else {
                hierarchy = parser.getHierarchyTree(includeComponents);
            }

            const allNodes = parser.getAllNodes();

            return {
                success: true,
                message: `Successfully inspected ${parser.isScene() ? 'scene' : 'prefab'} headlessly (${allNodes.length} nodes)`,
                data: {
                    file: path.basename(diskPath),
                    type: parser.isScene() ? 'scene' : 'prefab',
                    totalNodes: allNodes.length,
                    rootNode: root.name,
                    hierarchy
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Headless inspect failed: ${error?.message || error}`
            };
        }
    }

    /**
     * Find nodes matching pattern, exact name, or component type headlessly from disk AST.
     */
    public async findNodesHeadless(args: {
        targetFile?: string;
        scenePath?: string;
        prefabPath?: string;
        file?: string;
        pattern?: string;
        name?: string;
        exact?: boolean;
        component?: string;
        activeOnly?: boolean;
        limit?: number;
    }): Promise<ToolResponse> {
        try {
            const rawTarget = args.targetFile || args.scenePath || args.prefabPath || args.file;
            if (!rawTarget) {
                return { success: false, error: 'find_nodes_headless requires targetFile (or scenePath/prefabPath)' };
            }

            const diskPath = this.resolveToDiskPath(rawTarget);
            if (!fs.existsSync(diskPath)) {
                return { success: false, error: `Target file not found: ${rawTarget}` };
            }

            const parser = await PrefabAstParser.loadFromFile(diskPath);
            const nodes = parser.findNodes({
                pattern: args.pattern,
                name: args.name,
                exact: args.exact,
                component: args.component,
                activeOnly: args.activeOnly,
                limit: args.limit
            });

            return {
                success: true,
                message: `Found ${nodes.length} nodes matching query in ${path.basename(diskPath)}`,
                data: {
                    file: path.basename(diskPath),
                    type: parser.isScene() ? 'scene' : 'prefab',
                    count: nodes.length,
                    nodes
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Headless find nodes failed: ${error?.message || error}`
            };
        }
    }

    /**
     * Execute a chain of headless mutations on a single .scene or .prefab file in a single atomic pass.
     */
    public async executeChain(args: {
        targetFile?: string;
        scenePath?: string;
        prefabPath?: string;
        file?: string;
        chain?: HeadlessChainOp[];
        operations?: HeadlessChainOp[];
        dryRun?: boolean;
    }): Promise<ToolResponse> {
        try {
            const rawTarget = args.targetFile || args.scenePath || args.prefabPath || args.file;
            if (!rawTarget) {
                return { success: false, error: 'execute_chain requires targetFile (or scenePath/prefabPath)' };
            }

            const diskPath = this.resolveToDiskPath(rawTarget);
            if (!fs.existsSync(diskPath)) {
                return { success: false, error: `Target file not found: ${rawTarget}` };
            }

            const ops = args.chain || args.operations;
            if (!Array.isArray(ops) || ops.length === 0) {
                return { success: false, error: 'No chain operations specified' };
            }

            const dryRun = args.dryRun === true;
            const parser = await PrefabAstParser.loadFromFile(diskPath);
            const changes: string[] = [];
            const results: any[] = [];

            for (let i = 0; i < ops.length; i++) {
                const op = ops[i];
                const action = op.action || op.type || op.op || '';
                const nodeSelector = op.nodePath || op.targetNode;

                switch (action) {
                    case 'create_node':
                    case 'add_node': {
                        const created = parser.createNode(op.parentPath, {
                            name: op.name || 'NewNode',
                            position: op.position,
                            rotation: op.rotation,
                            scale: op.scale,
                            layer: op.layer,
                            active: op.active,
                            is2D: op.is2D,
                            size: op.size,
                            anchor: op.anchor
                        });
                        const changeMsg = `Created node "${created.name}" (id: ${created.id}) under "${op.parentPath || 'root'}"`;
                        changes.push(changeMsg);
                        results.push({ opIndex: i, action, success: true, node: created });

                        // If initial components specified on created node
                        if (Array.isArray(op.components) && op.components.length > 0) {
                            for (const c of op.components) {
                                const addCompRes = parser.addComponent(created.id, c.componentType, c.properties || {});
                                changes.push(addCompRes.message);
                            }
                        }
                        break;
                    }

                    case 'delete_node':
                    case 'remove_node': {
                        if (!nodeSelector) {
                            changes.push(`Op ${i} [delete_node]: missing nodePath`);
                            results.push({ opIndex: i, action, success: false, error: 'missing nodePath' });
                            break;
                        }
                        const delRes = parser.deleteNode(nodeSelector);
                        changes.push(delRes.message);
                        results.push({ opIndex: i, action, success: delRes.success });
                        break;
                    }

                    case 'reparent_node': {
                        if (!nodeSelector || !op.newParentPath) {
                            changes.push(`Op ${i} [reparent_node]: missing nodePath or newParentPath`);
                            results.push({ opIndex: i, action, success: false, error: 'missing parameters' });
                            break;
                        }
                        const repRes = parser.reparentNode(nodeSelector, op.newParentPath);
                        changes.push(repRes.message);
                        results.push({ opIndex: i, action, success: repRes.success });
                        break;
                    }

                    case 'set_transform': {
                        if (!nodeSelector) {
                            changes.push(`Op ${i} [set_transform]: missing nodePath`);
                            results.push({ opIndex: i, action, success: false, error: 'missing nodePath' });
                            break;
                        }
                        const targetNode = parser.resolveNode(nodeSelector);
                        if (!targetNode) {
                            changes.push(`Op ${i} [set_transform]: node "${nodeSelector}" not found`);
                            results.push({ opIndex: i, action, success: false, error: 'node not found' });
                            break;
                        }
                        const transSuccess = parser.setTransform(targetNode.id, {
                            position: op.position,
                            rotation: op.rotation,
                            scale: op.scale,
                            size: op.size,
                            anchor: op.anchor
                        });
                        const msg = transSuccess ? `Updated transform on node "${targetNode.name}"` : `Failed to update transform on "${nodeSelector}"`;
                        changes.push(msg);
                        results.push({ opIndex: i, action, success: transSuccess });
                        break;
                    }

                    case 'set_active': {
                        if (!nodeSelector || op.active === undefined) {
                            changes.push(`Op ${i} [set_active]: missing nodePath or active value`);
                            results.push({ opIndex: i, action, success: false, error: 'missing parameters' });
                            break;
                        }
                        const targetNode = parser.resolveNode(nodeSelector);
                        if (!targetNode) {
                            changes.push(`Op ${i} [set_active]: node "${nodeSelector}" not found`);
                            results.push({ opIndex: i, action, success: false, error: 'node not found' });
                            break;
                        }
                        targetNode.node._active = op.active;
                        const msg = `Set active = ${op.active} on node "${targetNode.name}"`;
                        changes.push(msg);
                        results.push({ opIndex: i, action, success: true });
                        break;
                    }

                    case 'add_component': {
                        const compType = op.componentType || op.component;
                        if (!nodeSelector || !compType) {
                            changes.push(`Op ${i} [add_component]: missing nodePath or componentType`);
                            results.push({ opIndex: i, action, success: false, error: 'missing parameters' });
                            break;
                        }
                        const addRes = parser.addComponent(nodeSelector, compType, op.properties || {});
                        changes.push(addRes.message);
                        results.push({ opIndex: i, action, success: addRes.success, componentId: addRes.componentId });
                        break;
                    }

                    case 'remove_component': {
                        const compType = op.componentType || op.component || op.componentIndex;
                        if (!nodeSelector || compType === undefined) {
                            changes.push(`Op ${i} [remove_component]: missing nodePath or componentType`);
                            results.push({ opIndex: i, action, success: false, error: 'missing parameters' });
                            break;
                        }
                        const remRes = parser.removeComponent(nodeSelector, compType);
                        changes.push(remRes.message);
                        results.push({ opIndex: i, action, success: remRes.success });
                        break;
                    }

                    case 'update_component':
                    case 'update_component_property':
                    case 'set_component_property': {
                        const compType = op.componentType || op.component;
                        if (!nodeSelector || !compType) {
                            changes.push(`Op ${i} [update_component]: missing nodePath or componentType`);
                            results.push({ opIndex: i, action, success: false, error: 'missing parameters' });
                            break;
                        }
                        const targetNode = parser.resolveNode(nodeSelector);
                        if (!targetNode) {
                            changes.push(`Op ${i} [update_component]: node "${nodeSelector}" not found`);
                            results.push({ opIndex: i, action, success: false, error: 'node not found' });
                            break;
                        }

                        if (op.properties && typeof op.properties === 'object') {
                            const updRes = parser.updateComponentProperties(targetNode.id, compType, op.properties);
                            changes.push(updRes.message);
                            results.push({ opIndex: i, action, success: updRes.success, updatedCount: updRes.updatedCount });
                        } else if (op.property !== undefined) {
                            const updRes = parser.setComponentProperty(
                                targetNode.id,
                                compType,
                                op.property,
                                op.value,
                                { valueMode: op.valueMode === 'self_node' ? 'self_node' : undefined }
                            );
                            changes.push(updRes.message);
                            results.push({ opIndex: i, action, success: updRes.success });
                        }
                        break;
                    }

                    case 'set_node_property': {
                        if (!nodeSelector || !op.property) {
                            changes.push(`Op ${i} [set_node_property]: missing nodePath or property`);
                            results.push({ opIndex: i, action, success: false, error: 'missing parameters' });
                            break;
                        }
                        const targetNode = parser.resolveNode(nodeSelector);
                        if (!targetNode) {
                            changes.push(`Op ${i} [set_node_property]: node "${nodeSelector}" not found`);
                            results.push({ opIndex: i, action, success: false, error: 'node not found' });
                            break;
                        }
                        const propKey = op.property in targetNode.node
                            ? op.property
                            : ('_' + op.property in targetNode.node ? '_' + op.property : op.property);
                        targetNode.node[propKey] = op.value;
                        const msg = `Set node property "${propKey}" on "${targetNode.name}"`;
                        changes.push(msg);
                        results.push({ opIndex: i, action, success: true });
                        break;
                    }

                    default: {
                        changes.push(`Op ${i}: unknown action opcode "${action}"`);
                        results.push({ opIndex: i, action, success: false, error: `unknown action "${action}"` });
                        break;
                    }
                }
            }

            if (!dryRun && changes.length > 0) {
                await parser.save();
                this.notifyAssetDb(diskPath);
            }

            return {
                success: true,
                message: `${dryRun ? '[DryRun] Simulated' : 'Successfully applied'} ${changes.length} operations on ${path.basename(diskPath)}`,
                data: {
                    file: path.basename(diskPath),
                    diskPath,
                    dryRun,
                    totalOperations: ops.length,
                    changes,
                    results
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Headless chain execution failed: ${error?.message || error}`
            };
        }
    }

    /**
     * Batch edit across multiple files with glob support.
     */
    public async batchEditFiles(args: {
        files: string[];
        operations: HeadlessChainOp[];
        dryRun?: boolean;
    }): Promise<ToolResponse> {
        try {
            if (!Array.isArray(args.files) || args.files.length === 0) {
                return { success: false, error: 'No files specified for batch edit' };
            }
            if (!Array.isArray(args.operations) || args.operations.length === 0) {
                return { success: false, error: 'No operations specified for batch edit' };
            }

            const matchedFiles: string[] = [];
            for (const pattern of args.files) {
                const resolved = this.resolveToDiskPath(pattern);
                if (resolved.includes('*')) {
                    const dir = path.dirname(resolved);
                    const filePattern = path.basename(resolved);
                    const regex = new RegExp('^' + filePattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i');
                    if (fs.existsSync(dir)) {
                        const items = fs.readdirSync(dir);
                        for (const item of items) {
                            if (regex.test(item) && (item.endsWith('.prefab') || item.endsWith('.scene'))) {
                                matchedFiles.push(path.join(dir, item));
                            }
                        }
                    }
                } else if (fs.existsSync(resolved)) {
                    matchedFiles.push(resolved);
                }
            }

            if (matchedFiles.length === 0) {
                return { success: false, error: `No matching files found for: ${args.files.join(', ')}` };
            }

            const dryRun = args.dryRun === true;
            let modifiedCount = 0;
            let errorCount = 0;
            const details: Array<{ file: string; changes: string[] }> = [];

            for (const filePath of matchedFiles) {
                const res = await this.executeChain({
                    targetFile: filePath,
                    operations: args.operations,
                    dryRun
                });

                if (res.success && res.data?.changes) {
                    modifiedCount++;
                    details.push({
                        file: path.basename(filePath),
                        changes: res.data.changes
                    });
                } else {
                    errorCount++;
                    details.push({
                        file: path.basename(filePath),
                        changes: [`Failed: ${res.error || 'unknown error'}`]
                    });
                }
            }

            return {
                success: true,
                message: `${dryRun ? '[DryRun] Simulated' : 'Successfully executed'} batch edit on ${modifiedCount} files (${errorCount} failed/skipped)`,
                data: {
                    dryRun,
                    totalTargeted: matchedFiles.length,
                    modifiedCount,
                    errorCount,
                    details
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Batch edit files failed: ${error?.message || error}`
            };
        }
    }
}
