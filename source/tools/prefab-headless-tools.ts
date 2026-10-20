import * as fs from 'fs';
import * as path from 'path';
import { ToolResponse } from '../types';
import { PrefabAstParser } from '../utils/prefab-ast-parser';
import { AssetResolver } from '../utils/asset-resolver';

declare const Editor: any;

export class PrefabHeadlessTools {
    private resolver: AssetResolver = new AssetResolver();

    private resolveToDiskPath(assetPathOrUrl: string): string {
        if (!assetPathOrUrl) return '';
        if (fs.existsSync(assetPathOrUrl)) return assetPathOrUrl;

        // Resolve db:// URL to absolute file path
        if (assetPathOrUrl.startsWith('db://')) {
            const projectRoot = this.getProjectRoot();
            const rel = assetPathOrUrl.replace(/^db:\/\//, '');
            const candidate = path.join(projectRoot, rel);
            if (fs.existsSync(candidate)) return candidate;
        }

        // Try direct relative to project root
        const candidate2 = path.join(this.getProjectRoot(), assetPathOrUrl);
        if (fs.existsSync(candidate2)) return candidate2;

        return assetPathOrUrl;
    }

    private getProjectRoot(): string {
        if (typeof Editor !== 'undefined' && Editor?.Project?.path) {
            return Editor.Project.path;
        }
        return path.resolve(__dirname, '../../../..');
    }

    /**
     * Tool 1: Diff two prefabs headlessly side-by-side
     */
    public async diff(args: {
        sourcePrefab?: string;
        targetPrefab?: string;
        prefabPathA?: string;
        prefabPathB?: string;
        sourcePath?: string;
        targetPath?: string;
        ignoreProperties?: string[];
        filterComponents?: string[];
        detailed?: boolean;
    }): Promise<ToolResponse> {
        try {
            const rawSource = args.sourcePrefab || args.prefabPathA || args.sourcePath;
            const rawTarget = args.targetPrefab || args.prefabPathB || args.targetPath;

            if (!rawSource) {
                return { success: false, error: 'diff requires sourcePrefab (or prefabPathA)' };
            }
            if (!rawTarget) {
                return { success: false, error: 'diff requires targetPrefab (or prefabPathB)' };
            }

            const sourceFile = this.resolveToDiskPath(rawSource);
            const targetFile = this.resolveToDiskPath(rawTarget);

            if (!fs.existsSync(sourceFile)) {
                return { success: false, error: `Source prefab not found: ${rawSource}` };
            }
            if (!fs.existsSync(targetFile)) {
                return { success: false, error: `Target prefab not found: ${rawTarget}` };
            }

            const [sourceParser, targetParser] = await Promise.all([
                PrefabAstParser.loadFromFile(sourceFile),
                PrefabAstParser.loadFromFile(targetFile)
            ]);

            const sourceRoot = sourceParser.getRootNode();
            const targetRoot = targetParser.getRootNode();

            if (!sourceRoot || !targetRoot) {
                return { success: false, error: 'Failed to parse root nodes from one or both prefabs' };
            }

            const ignored = new Set(args.ignoreProperties || ['_id', 'fileId', '__prefab', '_objFlags', '__editorExtras__']);
            const filterComp = args.filterComponents && args.filterComponents.length > 0
                ? new Set(args.filterComponents.map(c => c.toLowerCase()))
                : null;

            const sourceComps = sourceParser.getComponents(sourceRoot.id);
            const targetComps = targetParser.getComponents(targetRoot.id);

            const sourceCompMap = new Map<string, any>();
            for (const c of sourceComps) {
                const key = c.className || c.type;
                if (!filterComp || filterComp.has(key.toLowerCase()) || filterComp.has(c.type.toLowerCase())) {
                    sourceCompMap.set(key, c.comp);
                }
            }

            const targetCompMap = new Map<string, any>();
            for (const c of targetComps) {
                const key = c.className || c.type;
                if (!filterComp || filterComp.has(key.toLowerCase()) || filterComp.has(c.type.toLowerCase())) {
                    targetCompMap.set(key, c.comp);
                }
            }

            const sourceOnly: string[] = [];
            const targetOnly: string[] = [];
            const commonComponents: string[] = [];
            const propertyDiffs: Array<{ component: string; property: string; sourceValue: any; targetValue: any }> = [];

            for (const [key, comp] of sourceCompMap.entries()) {
                if (targetCompMap.has(key)) {
                    commonComponents.push(key);
                    const targetComp = targetCompMap.get(key);
                    const allKeys = new Set([...Object.keys(comp), ...Object.keys(targetComp)]);

                    for (const prop of allKeys) {
                        if (ignored.has(prop)) continue;
                        const sVal = comp[prop];
                        const tVal = targetComp[prop];
                        const sJson = JSON.stringify(sVal);
                        const tJson = JSON.stringify(tVal);

                        if (sJson !== tJson) {
                            propertyDiffs.push({
                                component: key,
                                property: prop,
                                sourceValue: sourceParser.resolveValueWithPointers(sVal),
                                targetValue: targetParser.resolveValueWithPointers(tVal)
                            });
                        }
                    }
                } else {
                    sourceOnly.push(key);
                }
            }

            for (const key of targetCompMap.keys()) {
                if (!sourceCompMap.has(key)) {
                    targetOnly.push(key);
                }
            }

            // Structure comparison (children)
            const sourceChildren = (sourceRoot.node._children || []).map((ref: any) => {
                const child = sourceParser.getItem(ref.__id__);
                return child?._name || `id_${ref.__id__}`;
            });
            const targetChildren = (targetRoot.node._children || []).map((ref: any) => {
                const child = targetParser.getItem(ref.__id__);
                return child?._name || `id_${ref.__id__}`;
            });

            return {
                success: true,
                message: `Compared ${path.basename(sourceFile)} with ${path.basename(targetFile)}`,
                data: {
                    source: path.basename(sourceFile),
                    target: path.basename(targetFile),
                    componentsDiff: {
                        sourceOnly,
                        targetOnly
                    },
                    identicalComponents: commonComponents.filter(c => !propertyDiffs.some(p => p.component === c)),
                    propertyDiff: propertyDiffs,
                    structureDiff: {
                        sourceChildren,
                        targetChildren,
                        childrenMatch: JSON.stringify(sourceChildren) === JSON.stringify(targetChildren)
                    }
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Prefab diff failed: ${error?.message || error}`
            };
        }
    }

    /**
     * Tool 2: Deeply inspect prefab node tree and components offline
     */
    public async inspectHeadless(args: {
        prefabPath?: string;
        path?: string;
        targetPrefab?: string;
        targetNode?: string;
        includeComponents?: boolean;
        resolveReferences?: boolean;
    }): Promise<ToolResponse> {
        try {
            const rawPath = args.prefabPath || args.path || args.targetPrefab;
            if (!rawPath) {
                return { success: false, error: 'inspect_headless requires prefabPath' };
            }
            const diskPath = this.resolveToDiskPath(rawPath);
            if (!fs.existsSync(diskPath)) {
                return { success: false, error: `Prefab file not found: ${rawPath}` };
            }

            const parser = await PrefabAstParser.loadFromFile(diskPath);
            const target = args.targetNode
                ? parser.findNodeByPath(args.targetNode)
                : parser.getRootNode();

            if (!target) {
                return {
                    success: false,
                    error: `Target node "${args.targetNode}" not found in prefab ${path.basename(diskPath)}`
                };
            }

            const node = target.node;
            const includeComps = args.includeComponents !== false;
            const resolveRefs = args.resolveReferences !== false;

            const componentsData: any[] = [];
            if (includeComps) {
                const components = parser.getComponents(target.id);
                for (const item of components) {
                    const compObj = item.comp;
                    const cleanedProps: Record<string, any> = {};

                    for (const [k, v] of Object.entries(compObj)) {
                        if (k === '__prefab' || k === 'fileId' || k === '_id' || k === '_objFlags') continue;
                        cleanedProps[k] = resolveRefs ? parser.resolveValueWithPointers(v) : v;
                    }

                    componentsData.push({
                        id: item.id,
                        type: item.type,
                        className: item.className || item.type,
                        properties: cleanedProps
                    });
                }
            }

            // Extract contentSize from UITransform if available
            let size = { width: 0, height: 0 };
            const uiTransform = componentsData.find(c => c.type === 'cc.UITransform');
            if (uiTransform?.properties?._contentSize) {
                size = uiTransform.properties._contentSize;
            }

            // Children summary
            const children = (node._children || []).map((ref: any) => {
                const child = parser.getItem(ref.__id__);
                return {
                    id: ref.__id__,
                    name: child?._name || `id_${ref.__id__}`,
                    active: child?._active !== false
                };
            });

            return {
                success: true,
                message: `Inspected node "${target.name}" in ${path.basename(diskPath)}`,
                data: {
                    id: target.id,
                    name: target.name,
                    path: target.path,
                    active: node._active !== false,
                    position: node._lpos || { x: 0, y: 0, z: 0 },
                    rotation: node._lrot || { x: 0, y: 0, z: 0, w: 1 },
                    scale: node._lscale || { x: 1, y: 1, z: 1 },
                    size,
                    components: componentsData,
                    children
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Prefab headless inspect failed: ${error?.message || error}`
            };
        }
    }

    /**
     * Tool 5: Batch edit background prefabs headlessly
     */
    public async batchEditHeadless(args: {
        files: string[];
        operations: Array<{
            type?: 'update_component_property' | 'set_component_property' | 'set_transform' | 'set_active' | string;
            action?: string;
            nodePath?: string;
            targetNode?: string;
            componentType?: string;
            property?: string;
            properties?: Record<string, any>;
            value?: any;
            valueMode?: 'self_node' | string;
            position?: { x?: number; y?: number; z?: number };
            scale?: { x?: number; y?: number; z?: number };
            rotation?: { x?: number; y?: number; z?: number; w?: number };
            active?: boolean;
        }>;
        dryRun?: boolean;
    }): Promise<ToolResponse> {
        try {
            if (!Array.isArray(args.files) || args.files.length === 0) {
                return { success: false, error: 'No target files specified for batch edit' };
            }
            if (!Array.isArray(args.operations) || args.operations.length === 0) {
                return { success: false, error: 'No operations specified for batch edit' };
            }

            const matchedFiles: string[] = [];
            for (const pattern of args.files) {
                const resolved = this.resolveToDiskPath(pattern);
                if (resolved.includes('*')) {
                    // Glob pattern
                    const dir = path.dirname(resolved);
                    const filePattern = path.basename(resolved);
                    const regex = new RegExp('^' + filePattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i');
                    if (fs.existsSync(dir)) {
                        const items = fs.readdirSync(dir);
                        for (const item of items) {
                            if (regex.test(item) && item.endsWith('.prefab')) {
                                matchedFiles.push(path.join(dir, item));
                            }
                        }
                    }
                } else if (fs.existsSync(resolved)) {
                    matchedFiles.push(resolved);
                }
            }

            if (matchedFiles.length === 0) {
                return { success: false, error: `No matching prefab files found for: ${args.files.join(', ')}` };
            }

            const dryRun = args.dryRun === true;
            let modifiedFilesCount = 0;
            let skippedFilesCount = 0;
            const details: Array<{ file: string; changes: string[] }> = [];

            for (const filePath of matchedFiles) {
                try {
                    const parser = await PrefabAstParser.loadFromFile(filePath);
                    const fileChanges: string[] = [];

                    for (const op of args.operations) {
                        const nodeSelector = op.nodePath || (op as any).targetNode;
                        const targetNode = nodeSelector
                            ? parser.findNodeByPath(nodeSelector)
                            : parser.getRootNode();

                        if (!targetNode) {
                            fileChanges.push(`Node "${nodeSelector || 'root'}" not found; skipped`);
                            continue;
                        }

                        const opType = op.type || (op as any).action;

                        if (opType === 'update_component_property' || opType === 'set_component_property') {
                            const compType = op.componentType || (op as any).component;
                            if (!compType) continue;

                            const propsDict = (op as any).properties;
                            if (propsDict && typeof propsDict === 'object') {
                                for (const [propName, propVal] of Object.entries(propsDict)) {
                                    const res = parser.setComponentProperty(
                                        targetNode.id,
                                        compType,
                                        propName,
                                        propVal,
                                        { valueMode: op.valueMode === 'self_node' ? 'self_node' : undefined }
                                    );
                                    fileChanges.push(res.message);
                                }
                            } else if (op.property !== undefined) {
                                const res = parser.setComponentProperty(
                                    targetNode.id,
                                    compType,
                                    op.property,
                                    op.value,
                                    { valueMode: op.valueMode === 'self_node' ? 'self_node' : undefined }
                                );
                                fileChanges.push(res.message);
                            }
                        } else if (opType === 'set_transform') {
                            const success = parser.setTransform(targetNode.id, {
                                position: op.position,
                                scale: op.scale,
                                rotation: op.rotation
                            });
                            if (success) {
                                fileChanges.push(`Updated transform on node ${targetNode.name}`);
                            }
                        } else if (opType === 'set_active') {
                            if (op.active !== undefined) {
                                targetNode.node._active = op.active;
                                fileChanges.push(`Set active = ${op.active} on node ${targetNode.name}`);
                            }
                        }
                    }

                    if (fileChanges.length > 0) {
                        if (!dryRun) {
                            await parser.save();
                            this.notifyAssetDb(filePath);
                        }
                        modifiedFilesCount++;
                        details.push({
                            file: path.basename(filePath),
                            changes: fileChanges
                        });
                    } else {
                        skippedFilesCount++;
                    }
                } catch (e: any) {
                    skippedFilesCount++;
                    details.push({
                        file: path.basename(filePath),
                        changes: [`Error: ${e?.message || e}`]
                    });
                }
            }

            return {
                success: true,
                message: `${dryRun ? '[DryRun] Simulated' : 'Successfully applied'} batch edit on ${modifiedFilesCount} files (${skippedFilesCount} skipped)`,
                data: {
                    dryRun,
                    totalTargeted: matchedFiles.length,
                    modifiedFilesCount,
                    skippedFilesCount,
                    details
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Batch edit headless failed: ${error?.message || error}`
            };
        }
    }

    private notifyAssetDb(filePath: string): void {
        try {
            if (typeof Editor !== 'undefined' && Editor?.Message?.send) {
                const projectRoot = this.getProjectRoot();
                const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/');
                Editor.Message.send('asset-db', 'refresh-asset', `db://${rel}`);
            }
        } catch {
            // Ignore if Editor IPC is not available
        }
    }
}
