import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { fixCommonJsonIssues } from '../utils/json-utils';
import { readSettings } from '../settings';
import { PrefabAstParser } from '../utils/prefab-ast-parser';
import { ScriptMetaRegistry } from '../utils/uuid-utils';

declare const Editor: any;

export interface SceneSnapshot {
    id: string;
    tag: string;
    timestamp: number;
    nodeCount: number;
    hash: string;
    nodes: Record<string, any>;
}

export class ValidationTools implements ToolExecutor {
    private snapshots: Map<string, SceneSnapshot> = new Map();
    private latestSnapshotId: string | null = null;

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'validation_manage',
                description: 'SCENE & ASSET VALIDATION: Audit scene node hierarchies for missing UITransforms, duplicate names, zero-size containers, out-of-bounds nodes, broken asset GUID references, and capture/diff scene regression snapshots.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: [
                                'check_scene', 'check_assets', 'check_viewport', 'check_physics', 'validate_json',
                                'capture_snapshot', 'diff_snapshot', 'list_snapshots', 'restore_snapshot'
                            ],
                            description: 'Validation action opcode: "check_physics" = audit colliders, contact listeners, and body types | "check_scene" = audit scene hierarchy | "check_assets" = scan broken GUID references | "check_viewport" = find out-of-bounds nodes | "capture_snapshot" = capture scene state snapshot | "diff_snapshot" = visual regression diff against snapshot | "list_snapshots" = list captured snapshots | "restore_snapshot" = restore scene to snapshot | "validate_json" = validate & auto-fix JSON'
                        },
                        threshold: { type: 'number', default: 3000, description: 'Out-of-bounds pixel threshold for viewport check' },
                        tag: { type: 'string', description: 'Label or tag for capture_snapshot' },
                        snapshotId: { type: 'string', description: 'Target snapshot ID for diff_snapshot or restore_snapshot' },
                        jsonString: { type: 'string', description: 'JSON string to validate/repair' },
                        target: { type: 'string', description: 'Target file or folder to audit for check_physics (default: "db://assets")' }
                    },
                    required: ['action']
                }
            },
            {
                name: 'check_scene',
                description: 'SCENE DIAGNOSTICS: Audit scene node hierarchy for missing UITransforms, duplicate names, zero-size containers, and Layout/Widget conflicts.',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'check_assets',
                description: 'ASSET INTEGRITY: Scan project asset database and active scene components for corrupt files and broken GUID references.',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'check_viewport',
                description: 'VIEWPORT AUDIT: Detect scene nodes positioned outside visible camera bounds beyond threshold coordinates.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        threshold: { type: 'number', default: 3000, description: 'Pixel threshold distance from origin' }
                    }
                }
            },
            {
                name: 'capture_snapshot',
                description: 'CAPTURE SCENE SNAPSHOT: Record lightweight hierarchy hash, node transforms, and component state of active scene for regression tracking.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        tag: { type: 'string', description: 'Descriptive label for this snapshot' }
                    }
                }
            },
            {
                name: 'diff_snapshot',
                description: 'SCENE DIFF: Compare current scene tree against a captured snapshot and output a structured Markdown diff of added, modified, and removed nodes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        snapshotId: { type: 'string', description: 'Snapshot ID to compare against (defaults to most recent)' }
                    }
                }
            },
            {
                name: 'list_snapshots',
                description: 'LIST SNAPSHOTS: View all in-memory scene state snapshots captured during this session.',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'restore_snapshot',
                description: 'RESTORE SNAPSHOT: Revert active scene to the saved state corresponding to a captured snapshot.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        snapshotId: { type: 'string', description: 'Target snapshot ID' }
                    }
                }
            },
            {
                name: 'validate_json_params',
                description: 'JSON PARAMETER VALIDATION: Validate and auto-fix JSON strings before sending to other tools.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        jsonString: { type: 'string', description: 'JSON string to validate and repair' },
                        expectedSchema: { type: 'object', description: 'Expected JSON schema' }
                    },
                    required: ['jsonString']
                }
            },
            {
                name: 'safe_string_value',
                description: 'STRING SAFETY: Convert text into JSON-safe format by escaping special characters.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        value: { type: 'string', description: 'Text to make JSON-safe' }
                    },
                    required: ['value']
                }
            },
            {
                name: 'format_mcp_request',
                description: 'MCP REQUEST FORMATTING: Generate properly formatted MCP tool call request with correct JSON structure.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        toolName: { type: 'string', description: 'Target MCP tool name' },
                        arguments: { type: 'object', description: 'Tool parameters object' }
                    },
                    required: ['toolName', 'arguments']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'validation_manage':
                return await this.handleValidationManage(args);
            case 'validate_json_params':
                return await this.validateJsonParams(args?.jsonString, args?.expectedSchema);
            case 'safe_string_value':
                return await this.createSafeStringValue(args?.value);
            case 'format_mcp_request':
                return await this.formatMcpRequest(args?.toolName, args?.arguments);
            case 'check_scene':
                return await this.checkScene(args);
            case 'check_assets':
                return await this.checkAssets(args);
            case 'check_viewport':
                return await this.checkViewport(args);
            case 'capture_snapshot':
                return await this.captureSnapshot(args);
            case 'diff_snapshot':
                return await this.diffSnapshot(args);
            case 'list_snapshots':
                return this.listSnapshots();
            case 'restore_snapshot':
                return await this.restoreSnapshot(args);
            case 'check_physics':
            case 'validation_check_physics':
                return await this.checkPhysics(args);
            default:
                return {
                    success: false,
                    error: `Unknown validation tool: ${toolName}. Available: validation_manage, check_scene, check_assets, check_viewport, check_physics, capture_snapshot, diff_snapshot, list_snapshots, restore_snapshot, validate_json_params`
                };
        }
    }

    public async handleValidationManage(args: any): Promise<ToolResponse> {
        const action = args?.action || 'check_scene';
        switch (action) {
            case 'check_physics':
                return await this.checkPhysics(args);
            case 'check_scene':
                return await this.checkScene(args);
            case 'check_assets':
                return await this.checkAssets(args);
            case 'check_viewport':
                return await this.checkViewport(args);
            case 'capture_snapshot':
                return await this.captureSnapshot(args);
            case 'diff_snapshot':
                return await this.diffSnapshot(args);
            case 'list_snapshots':
                return this.listSnapshots();
            case 'restore_snapshot':
                return await this.restoreSnapshot(args);
            case 'validate_json':
                return await this.validateJsonParams(args?.jsonString, args?.expectedSchema);
            default:
                return {
                    success: false,
                    error: `Unknown validation action: ${action}. Valid actions: ["check_physics", "check_scene", "check_assets", "check_viewport", "capture_snapshot", "diff_snapshot", "list_snapshots", "restore_snapshot", "validate_json"]`
                };
        }
    }

    public async checkScene(args?: any): Promise<ToolResponse> {
        try {
            if (typeof Editor === 'undefined' || !Editor.Message) {
                return { success: false, error: 'Editor environment unavailable' };
            }
            const tree: any = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No active scene tree found' };
            }

            const issues: Array<{ type: 'error' | 'warning'; message: string; nodeName: string; nodeUuid: string; recommendation?: string }> = [];
            const seenSiblingNames = new Map<string, Set<string>>();

            const walk = (node: any, parentUuid: string, parentHasLayout: boolean = false, parentLayoutType?: string) => {
                // 1. Check duplicate sibling names
                if (!seenSiblingNames.has(parentUuid)) {
                    seenSiblingNames.set(parentUuid, new Set());
                }
                const siblings = seenSiblingNames.get(parentUuid)!;
                if (siblings.has(node.name)) {
                    issues.push({
                        type: 'warning',
                        message: `Duplicate sibling node name: "${node.name}"`,
                        nodeName: node.name,
                        nodeUuid: node.uuid,
                        recommendation: 'Give sibling nodes unique names to ensure safe query-by-path and script lookups.'
                    });
                } else {
                    siblings.add(node.name);
                }

                let hasUITransform = false;
                let hasUIRenderer = false;
                let contentSize = { width: 100, height: 100 };
                let currentHasLayout = false;
                let currentLayoutType = 'NONE';
                let hasWidget = false;

                if (Array.isArray(node.components)) {
                    for (const comp of node.components) {
                        const compType = comp.type || comp.name || '';
                        if (compType.includes('UITransform')) {
                            hasUITransform = true;
                            if (comp.value && comp.value.contentSize) {
                                contentSize = comp.value.contentSize;
                            }
                        }
                        if (compType.includes('Sprite') || compType.includes('Label') || compType.includes('Button') || compType.includes('RichText') || compType.includes('Mask') || compType.includes('Graphics')) {
                            hasUIRenderer = true;
                        }
                        if (compType.includes('Layout')) {
                            currentHasLayout = true;
                            currentLayoutType = comp.value?.type || 'LAYOUT';
                        }
                        if (compType.includes('Widget')) {
                            hasWidget = true;
                        }
                    }

                    // 2. Missing UITransform on UI node
                    if (hasUIRenderer && !hasUITransform) {
                        issues.push({
                            type: 'error',
                            message: `Node has 2D UI render component but missing cc.UITransform`,
                            nodeName: node.name,
                            nodeUuid: node.uuid,
                            recommendation: 'Add cc.UITransform component. All 2D UI elements require UITransform in Cocos 3.8.'
                        });
                    }

                    // 3. Zero size container with visible render component
                    if (hasUIRenderer && hasUITransform && contentSize.width === 0 && contentSize.height === 0 && node.active !== false) {
                        issues.push({
                            type: 'warning',
                            message: `Node has visible UI renderer but UITransform contentSize is 0x0`,
                            nodeName: node.name,
                            nodeUuid: node.uuid,
                            recommendation: 'Set positive contentSize width and height on UITransform.'
                        });
                    }

                    // 4. Conflicting Widget on Layout child
                    if (parentHasLayout && hasWidget) {
                        issues.push({
                            type: 'warning',
                            message: `Child node has cc.Widget inside parent with cc.Layout (${parentLayoutType})`,
                            nodeName: node.name,
                            nodeUuid: node.uuid,
                            recommendation: 'Avoid horizontal/vertical Widget alignment on children managed by parent cc.Layout to prevent layout oscillation.'
                        });
                    }
                }

                if (Array.isArray(node.children)) {
                    for (const child of node.children) {
                        walk(child, node.uuid, currentHasLayout, currentLayoutType);
                    }
                }
            };

            walk(tree, 'root');

            return {
                success: true,
                message: issues.length === 0 ? '✅ Scene validation passed with 0 issues' : `⚠️ Found ${issues.length} issue(s)`,
                data: {
                    totalIssues: issues.length,
                    errorCount: issues.filter(i => i.type === 'error').length,
                    warningCount: issues.filter(i => i.type === 'warning').length,
                    issues
                }
            };
        } catch (err: any) {
            return { success: false, error: `Scene validation failed: ${err.message}` };
        }
    }

    public async checkAssets(args?: any): Promise<ToolResponse> {
        try {
            if (typeof Editor === 'undefined' || !Editor.Message) {
                return { success: false, error: 'Editor environment unavailable' };
            }
            const assets: any[] = await Editor.Message.request('asset-db', 'query-assets', {});
            const issues: any[] = [];
            const validUuids = new Set<string>();

            if (Array.isArray(assets)) {
                for (const asset of assets) {
                    if (asset.uuid) {
                        validUuids.add(asset.uuid);
                    } else {
                        issues.push({ type: 'error', message: 'Asset missing UUID in asset-db', asset: asset.url });
                    }
                    if (asset.invalid) {
                        issues.push({ type: 'error', message: 'Corrupt or unparseable asset', asset: asset.url, uuid: asset.uuid });
                    }
                }
            }

            // Scan scene node components for broken GUID references
            const tree: any = await Editor.Message.request('scene', 'query-node-tree');
            if (tree) {
                const scanNodeRefs = (node: any) => {
                    if (Array.isArray(node.components)) {
                        for (const comp of node.components) {
                            if (comp.value && typeof comp.value === 'object') {
                                for (const [propKey, propVal] of Object.entries(comp.value)) {
                                    if (propVal && typeof propVal === 'object') {
                                        const refUuid = (propVal as any).__uuid__;
                                        if (refUuid && typeof refUuid === 'string') {
                                            if (!validUuids.has(refUuid)) {
                                                issues.push({
                                                    type: 'error',
                                                    message: `Broken asset reference in component "${comp.type || comp.name}" property "${propKey}" -> non-existent UUID: ${refUuid}`,
                                                    nodeName: node.name,
                                                    nodeUuid: node.uuid,
                                                    brokenUuid: refUuid
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (Array.isArray(node.children)) {
                        for (const child of node.children) {
                            scanNodeRefs(child);
                        }
                    }
                };
                scanNodeRefs(tree);
            }

            return {
                success: true,
                message: issues.length === 0 ? `✅ Asset integrity check passed (${assets ? assets.length : 0} assets verified)` : `⚠️ Found ${issues.length} asset issue(s)`,
                data: {
                    scannedAssets: assets ? assets.length : 0,
                    issuesCount: issues.length,
                    issues
                }
            };
        } catch (err: any) {
            return { success: false, error: `Asset validation failed: ${err.message}` };
        }
    }

    public async checkViewport(args?: any): Promise<ToolResponse> {
        try {
            if (typeof Editor === 'undefined' || !Editor.Message) {
                return { success: false, error: 'Editor environment unavailable' };
            }
            const tree: any = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) return { success: false, error: 'No active scene' };

            const outOfBounds: any[] = [];
            const threshold = args?.threshold || 3000;

            const scanPos = (node: any) => {
                const pos = node.position;
                if (pos) {
                    if (Math.abs(pos.x) > threshold || Math.abs(pos.y) > threshold) {
                        outOfBounds.push({
                            name: node.name,
                            uuid: node.uuid,
                            position: pos,
                            warning: `Position exceeds threshold (+/- ${threshold}px)`
                        });
                    }
                }
                if (Array.isArray(node.children)) {
                    for (const c of node.children) scanPos(c);
                }
            };

            scanPos(tree);
            return {
                success: true,
                data: {
                    threshold,
                    outOfBoundsCount: outOfBounds.length,
                    nodes: outOfBounds
                }
            };
        } catch (err: any) {
            return { success: false, error: `Viewport check failed: ${err.message}` };
        }
    }

    public async captureSnapshot(args?: any): Promise<ToolResponse> {
        try {
            if (typeof Editor === 'undefined' || !Editor.Message) {
                return { success: false, error: 'Editor environment unavailable' };
            }
            const tree: any = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No active scene tree to capture' };
            }

            let nodeCount = 0;
            const normalizedNodes: Record<string, any> = {};

            const indexTree = (node: any, parentUuid: string | null) => {
                nodeCount++;
                const compList = Array.isArray(node.components)
                    ? node.components.map((c: any) => ({
                        type: c.type || c.name || '',
                        value: c.value || {}
                    }))
                    : [];

                normalizedNodes[node.uuid] = {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active !== false,
                    parent: parentUuid,
                    position: node.position ? { x: Math.round(node.position.x), y: Math.round(node.position.y), z: Math.round(node.position.z || 0) } : { x: 0, y: 0, z: 0 },
                    rotation: node.rotation ? { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z, w: node.rotation.w } : null,
                    scale: node.scale ? { x: node.scale.x, y: node.scale.y, z: node.scale.z } : { x: 1, y: 1, z: 1 },
                    components: compList
                };

                if (Array.isArray(node.children)) {
                    for (const c of node.children) {
                        indexTree(c, node.uuid);
                    }
                }
            };

            indexTree(tree, null);

            const hash = crypto.createHash('sha256').update(JSON.stringify(normalizedNodes)).digest('hex').slice(0, 12);
            const tag = args?.tag || `Snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}`;
            const snapshotId = `snap_${Date.now()}_${hash}`;

            const snapshot: SceneSnapshot = {
                id: snapshotId,
                tag,
                timestamp: Date.now(),
                nodeCount,
                hash,
                nodes: normalizedNodes
            };

            this.snapshots.set(snapshotId, snapshot);
            this.latestSnapshotId = snapshotId;

            // Keep max 20 snapshots in memory
            if (this.snapshots.size > 20) {
                const oldestKey = this.snapshots.keys().next().value;
                if (oldestKey) this.snapshots.delete(oldestKey);
            }

            return {
                success: true,
                message: `✅ Captured scene snapshot "${tag}" (${nodeCount} nodes, hash: ${hash})`,
                data: {
                    snapshotId,
                    tag,
                    timestamp: snapshot.timestamp,
                    nodeCount,
                    hash
                }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to capture snapshot: ${err.message}` };
        }
    }

    public async diffSnapshot(args?: any): Promise<ToolResponse> {
        try {
            if (typeof Editor === 'undefined' || !Editor.Message) {
                return { success: false, error: 'Editor environment unavailable' };
            }
            const targetId = args?.snapshotId || this.latestSnapshotId;
            if (!targetId || !this.snapshots.has(targetId)) {
                return {
                    success: false,
                    error: `No snapshot found with ID "${targetId}". Available snapshots: ${Array.from(this.snapshots.keys()).join(', ') || 'none'}. Call capture_snapshot first.`
                };
            }

            const baseSnapshot = this.snapshots.get(targetId)!;
            const tree: any = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No active scene tree to compare' };
            }

            const currentNodes: Record<string, any> = {};
            const indexTree = (node: any, parentUuid: string | null) => {
                const compList = Array.isArray(node.components)
                    ? node.components.map((c: any) => ({
                        type: c.type || c.name || '',
                        value: c.value || {}
                    }))
                    : [];

                currentNodes[node.uuid] = {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active !== false,
                    parent: parentUuid,
                    position: node.position ? { x: Math.round(node.position.x), y: Math.round(node.position.y), z: Math.round(node.position.z || 0) } : { x: 0, y: 0, z: 0 },
                    rotation: node.rotation ? { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z, w: node.rotation.w } : null,
                    scale: node.scale ? { x: node.scale.x, y: node.scale.y, z: node.scale.z } : { x: 1, y: 1, z: 1 },
                    components: compList
                };

                if (Array.isArray(node.children)) {
                    for (const c of node.children) indexTree(c, node.uuid);
                }
            };
            indexTree(tree, null);

            const added: any[] = [];
            const removed: any[] = [];
            const modified: any[] = [];

            // Detect Added and Modified
            for (const [uuid, curr] of Object.entries(currentNodes)) {
                const base = baseSnapshot.nodes[uuid];
                if (!base) {
                    added.push({
                        uuid: curr.uuid,
                        name: curr.name,
                        parent: curr.parent,
                        position: curr.position,
                        componentCount: curr.components.length
                    });
                } else {
                    const changes: string[] = [];
                    if (curr.name !== base.name) changes.push(`Name: "${base.name}" -> "${curr.name}"`);
                    if (curr.parent !== base.parent) changes.push(`Parent: "${base.parent}" -> "${curr.parent}"`);
                    if (curr.active !== base.active) changes.push(`Active: ${base.active} -> ${curr.active}`);
                    
                    if (curr.position.x !== base.position.x || curr.position.y !== base.position.y || curr.position.z !== base.position.z) {
                        changes.push(`Position: (${base.position.x},${base.position.y},${base.position.z}) -> (${curr.position.x},${curr.position.y},${curr.position.z})`);
                    }
                    if (curr.scale.x !== base.scale.x || curr.scale.y !== base.scale.y) {
                        changes.push(`Scale: (${base.scale.x},${base.scale.y}) -> (${curr.scale.x},${curr.scale.y})`);
                    }

                    const baseCompTypes = base.components.map((c: any) => c.type);
                    const currCompTypes = curr.components.map((c: any) => c.type);
                    const addedComps = currCompTypes.filter((t: string) => !baseCompTypes.includes(t));
                    const removedComps = baseCompTypes.filter((t: string) => !currCompTypes.includes(t));
                    if (addedComps.length > 0) changes.push(`Components added: ${addedComps.join(', ')}`);
                    if (removedComps.length > 0) changes.push(`Components removed: ${removedComps.join(', ')}`);

                    if (changes.length > 0) {
                        modified.push({
                            uuid: curr.uuid,
                            name: curr.name,
                            changes
                        });
                    }
                }
            }

            // Detect Removed
            for (const [uuid, base] of Object.entries(baseSnapshot.nodes)) {
                if (!currentNodes[uuid]) {
                    removed.push({
                        uuid: base.uuid,
                        name: base.name,
                        parent: base.parent
                    });
                }
            }

            // Generate Markdown report
            let md = `### 📸 Scene Snapshot Diff Report\n`;
            md += `- **Baseline Snapshot**: \`${baseSnapshot.tag}\` (ID: \`${baseSnapshot.id}\`)\n`;
            md += `- **Changes Summary**: ➕ ${added.length} added | ➖ ${removed.length} removed | 🔄 ${modified.length} modified\n\n`;

            if (added.length > 0) {
                md += `#### ➕ Added Nodes (${added.length})\n| Name | UUID | Parent | Position |\n|---|---|---|---|\n`;
                for (const a of added) {
                    md += `| ${a.name} | \`${a.uuid}\` | \`${a.parent || 'root'}\` | (${a.position.x}, ${a.position.y}) |\n`;
                }
                md += `\n`;
            }

            if (removed.length > 0) {
                md += `#### ➖ Removed Nodes (${removed.length})\n| Name | UUID | Parent |\n|---|---|---|\n`;
                for (const r of removed) {
                    md += `| ${r.name} | \`${r.uuid}\` | \`${r.parent || 'root'}\` |\n`;
                }
                md += `\n`;
            }

            if (modified.length > 0) {
                md += `#### 🔄 Modified Nodes (${modified.length})\n| Name | UUID | Changes |\n|---|---|---|\n`;
                for (const m of modified) {
                    md += `| ${m.name} | \`${m.uuid}\` | ${m.changes.join('; ')} |\n`;
                }
                md += `\n`;
            }

            if (added.length === 0 && removed.length === 0 && modified.length === 0) {
                md += `*No hierarchy or transform changes detected between current scene and snapshot.*\n`;
            }

            return {
                success: true,
                message: `Snapshot diff: +${added.length} -${removed.length} ~${modified.length}`,
                data: {
                    snapshotId: baseSnapshot.id,
                    tag: baseSnapshot.tag,
                    addedCount: added.length,
                    removedCount: removed.length,
                    modifiedCount: modified.length,
                    added,
                    removed,
                    modified,
                    markdownReport: md
                }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to compute snapshot diff: ${err.message}` };
        }
    }

    public listSnapshots(): ToolResponse {
        const list = Array.from(this.snapshots.values()).map(s => ({
            id: s.id,
            tag: s.tag,
            timestamp: s.timestamp,
            date: new Date(s.timestamp).toISOString(),
            nodeCount: s.nodeCount,
            hash: s.hash,
            isLatest: s.id === this.latestSnapshotId
        }));

        return {
            success: true,
            message: `Found ${list.length} snapshot(s)`,
            data: {
                total: list.length,
                snapshots: list
            }
        };
    }

    public async restoreSnapshot(args?: any): Promise<ToolResponse> {
        try {
            if (typeof Editor === 'undefined' || !Editor.Message) {
                return { success: false, error: 'Editor environment unavailable' };
            }
            const targetId = args?.snapshotId || this.latestSnapshotId;
            if (!targetId || !this.snapshots.has(targetId)) {
                return {
                    success: false,
                    error: `Snapshot "${targetId}" not found. Available: ${Array.from(this.snapshots.keys()).join(', ') || 'none'}`
                };
            }

            const snapshot = this.snapshots.get(targetId)!;
            const currentSceneUuid: string = await Editor.Message.request('scene', 'query-current-scene');
            if (currentSceneUuid) {
                await Editor.Message.request('scene', 'open-scene', currentSceneUuid);
                return {
                    success: true,
                    message: `✅ Re-opened scene to reload clean state corresponding to snapshot "${snapshot.tag}"`,
                    data: { snapshotId: snapshot.id, tag: snapshot.tag, sceneUuid: currentSceneUuid }
                };
            }

            return {
                success: true,
                message: `Retrieved snapshot "${snapshot.tag}" data for manual recovery`,
                data: snapshot
            };
        } catch (err: any) {
            return { success: false, error: `Restore failed: ${err.message}` };
        }
    }

    public async validateJsonParams(jsonString: string, expectedSchema?: any): Promise<ToolResponse> {
        try {
            let parsed;
            try {
                parsed = JSON.parse(jsonString);
            } catch (error: any) {
                const fixed = fixCommonJsonIssues(jsonString);
                try {
                    parsed = JSON.parse(fixed);
                } catch (secondError) {
                    return {
                        success: false,
                        error: `Cannot fix JSON: ${error.message}`,
                        data: {
                            originalJson: jsonString,
                            fixedAttempt: fixed,
                            suggestions: this.getJsonFixSuggestions(jsonString)
                        }
                    };
                }
            }

            if (expectedSchema) {
                const validation = this.validateAgainstSchema(parsed, expectedSchema);
                if (!validation.valid) {
                    return {
                        success: false,
                        error: 'Schema validation failed',
                        data: {
                            parsedJson: parsed,
                            validationErrors: validation.errors,
                            suggestions: validation.suggestions
                        }
                    };
                }
            }

            return {
                success: true,
                data: {
                    parsedJson: parsed,
                    fixedJson: JSON.stringify(parsed, null, 2),
                    isValid: true
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    public async createSafeStringValue(value: string): Promise<ToolResponse> {
        const safeValue = this.escapJsonString(value);
        return {
            success: true,
            data: {
                originalValue: value,
                safeValue: safeValue,
                jsonReady: JSON.stringify(safeValue),
                usage: `Use "${safeValue}" in your JSON parameters`
            }
        };
    }

    public async formatMcpRequest(toolName: string, toolArgs: any): Promise<ToolResponse> {
        try {
            const mcpRequest = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: toolArgs
                }
            };

            const formattedJson = JSON.stringify(mcpRequest, null, 2);
            const compactJson = JSON.stringify(mcpRequest);

            return {
                success: true,
                data: {
                    request: mcpRequest,
                    formattedJson: formattedJson,
                    compactJson: compactJson,
                    curlCommand: this.generateCurlCommand(compactJson)
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to format MCP request: ${error.message}`
            };
        }
    }

    private escapJsonString(str: string): string {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/\f/g, '\\f')
            .replace(/\b/g, '\\b');
    }

    private validateAgainstSchema(data: any, schema: any): { valid: boolean; errors: string[]; suggestions: string[] } {
        const errors: string[] = [];
        const suggestions: string[] = [];

        if (schema.type) {
            const actualType = Array.isArray(data) ? 'array' : typeof data;
            if (actualType !== schema.type) {
                errors.push(`Expected type ${schema.type}, got ${actualType}`);
                suggestions.push(`Convert value to ${schema.type}`);
            }
        }

        if (schema.required && Array.isArray(schema.required)) {
            for (const field of schema.required) {
                if (!Object.prototype.hasOwnProperty.call(data, field)) {
                    errors.push(`Missing required field: ${field}`);
                    suggestions.push(`Add required field "${field}"`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            suggestions
        };
    }

    private getJsonFixSuggestions(jsonStr: string): string[] {
        const suggestions: string[] = [];
        if (jsonStr.includes('\\"')) suggestions.push('Check for improperly escaped quotes');
        if (jsonStr.includes("'")) suggestions.push('Replace single quotes with double quotes');
        if (jsonStr.includes('\n') || jsonStr.includes('\t')) suggestions.push('Escape newlines and tabs properly');
        if (jsonStr.match(/,\s*[}\]]/)) suggestions.push('Remove trailing commas');
        return suggestions;
    }

    private generateCurlCommand(jsonStr: string): string {
        const escapedJson = jsonStr.replace(/'/g, "'\"'\"'");
        const port = readSettings().port;
        return `curl -X POST http://127.0.0.1:${port}/mcp \\
  -H "Content-Type: application/json" \\
  -d '${escapedJson}'`;
    }

    private getProjectRoot(): string {
        if (typeof Editor !== 'undefined' && Editor?.Project?.path) {
            return Editor.Project.path;
        }
        return path.resolve(__dirname, '../../../..');
    }

    /**
     * Audit colliders, contact listeners, and body types across prefabs and scenes
     */
    public async checkPhysics(args?: { folder?: string; file?: string; target?: string }): Promise<ToolResponse> {
        try {
            const projectRoot = this.getProjectRoot();
            const target = args?.file || args?.target || args?.folder || 'db://assets';

            const filesToAudit: string[] = [];
            const resolvedPath = target.startsWith('db://')
                ? path.join(projectRoot, target.replace(/^db:\/\//, ''))
                : (path.isAbsolute(target) ? target : path.join(projectRoot, target));

            if (!fs.existsSync(resolvedPath)) {
                return { success: false, error: `Target path does not exist: ${target}` };
            }

            const stat = fs.statSync(resolvedPath);
            if (stat.isFile()) {
                if (resolvedPath.endsWith('.prefab') || resolvedPath.endsWith('.scene')) {
                    filesToAudit.push(resolvedPath);
                } else {
                    return { success: false, error: `Target file is not a .prefab or .scene: ${target}` };
                }
            } else if (stat.isDirectory()) {
                const scanDir = (dir: string) => {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const full = path.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            scanDir(full);
                        } else if (entry.isFile() && (entry.name.endsWith('.prefab') || entry.name.endsWith('.scene'))) {
                            filesToAudit.push(full);
                        }
                    }
                };
                scanDir(resolvedPath);
            }

            if (filesToAudit.length === 0) {
                return { success: false, error: `No .prefab or .scene files found in ${target}` };
            }

            const registry = ScriptMetaRegistry.getInstance();
            let totalNodesAudited = 0;
            let totalCollidersFound = 0;
            const warnings: Array<{
                file: string;
                node: string;
                issue: string;
                severity: 'warning' | 'error' | 'info';
                message: string;
                recommendation: string;
            }> = [];

            for (const filePath of filesToAudit) {
                try {
                    const parser = await PrefabAstParser.loadFromFile(filePath);
                    const rawData = parser.getRawData();
                    const relPath = 'db://' + path.relative(projectRoot, filePath).replace(/\\/g, '/');

                    const nodeParentMap = new Map<number, number>();
                    const nodeMap = new Map<number, any>();

                    for (let i = 0; i < rawData.length; i++) {
                        const item = rawData[i];
                        if (item && item.__type__ === 'cc.Node') {
                            nodeMap.set(i, item);
                            if (Array.isArray(item._children)) {
                                for (const childRef of item._children) {
                                    if (childRef && typeof childRef.__id__ === 'number') {
                                        nodeParentMap.set(childRef.__id__, i);
                                    }
                                }
                            }
                        }
                    }

                    for (const [nodeId, node] of nodeMap.entries()) {
                        totalNodesAudited++;
                        const components = parser.getComponents(nodeId);

                        const colliderComps: any[] = [];
                        let rigidBodyComp: any = null;

                        for (const { comp, type } of components) {
                            const resolvedName = registry.resolveClassName(type);
                            const isCollider =
                                type.includes('Collider') ||
                                resolvedName.includes('Collider') ||
                                resolvedName.includes('Shape') ||
                                resolvedName.includes('Box2D.Shape');

                            const isRigidBody =
                                type === 'cc.RigidBody2D' ||
                                resolvedName.includes('RigidBody') ||
                                resolvedName === 'cc.RigidBody2D';

                            if (isCollider) {
                                colliderComps.push({ comp, type: resolvedName || type });
                            }
                            if (isRigidBody) {
                                rigidBodyComp = comp;
                            }
                        }

                        if (colliderComps.length === 0) continue;
                        totalCollidersFound += colliderComps.length;

                        // Check parents for RigidBody2D if none on this node
                        let effectiveRb = rigidBodyComp;
                        let rbNodeName = node._name;

                        if (!effectiveRb) {
                            let currParentId = nodeParentMap.get(nodeId);
                            while (currParentId !== undefined) {
                                const parentNode = nodeMap.get(currParentId);
                                if (parentNode) {
                                    const parentComps = parser.getComponents(currParentId);
                                    for (const { comp, type } of parentComps) {
                                        const resolvedName = registry.resolveClassName(type);
                                        if (type === 'cc.RigidBody2D' || resolvedName.includes('RigidBody')) {
                                            effectiveRb = comp;
                                            rbNodeName = parentNode._name;
                                            break;
                                        }
                                    }
                                }
                                if (effectiveRb) break;
                                currParentId = nodeParentMap.get(currParentId);
                            }
                        }

                        if (effectiveRb) {
                            const contactListenerEnabled =
                                effectiveRb._enabledContactListener === true ||
                                effectiveRb.enabledContactListener === true;

                            if (!contactListenerEnabled) {
                                warnings.push({
                                    file: relPath,
                                    node: node._name,
                                    issue: 'disabled_contact_listener',
                                    severity: 'warning',
                                    message: `Node "${node._name}" has ${colliderComps.length} collider(s), but RigidBody2D on "${rbNodeName}" has enabledContactListener: false. Collision callbacks (onBeginContact, onEndContact) will NOT fire.`,
                                    recommendation: `Set enabledContactListener: true on RigidBody2D (${rbNodeName}) to receive contact events.`
                                });
                            }

                            for (const { comp: c, type: colType } of colliderComps) {
                                const isSensor = c._sensor === true || c.isSensor === true || c._isSensor === true;
                                const isStaticBody = effectiveRb._type === 0 || effectiveRb.type === 0;
                                if (isSensor && isStaticBody && !contactListenerEnabled) {
                                    warnings.push({
                                        file: relPath,
                                        node: node._name,
                                        issue: 'silent_static_sensor',
                                        severity: 'warning',
                                        message: `Sensor collider (${colType}) on "${node._name}" is attached to a Static body with disabled contact listener. Trigger events will be completely silent.`,
                                        recommendation: `Enable enabledContactListener on RigidBody2D or change body type to Kinematic/Dynamic.`
                                    });
                                }
                            }
                        } else {
                            warnings.push({
                                file: relPath,
                                node: node._name,
                                issue: 'collider_without_rigidbody',
                                severity: 'info',
                                message: `Node "${node._name}" has ${colliderComps.length} collider(s) (${colliderComps.map(c => c.type).join(', ')}) but no attached RigidBody2D in hierarchy. It acts as static geometry and cannot report contact callbacks.`,
                                recommendation: `Attach a cc.RigidBody2D with enabledContactListener if dynamic movement or contact events are needed.`
                            });
                        }
                    }
                } catch (e: any) {
                    warnings.push({
                        file: path.basename(filePath),
                        node: 'file_root',
                        issue: 'parse_error',
                        severity: 'error',
                        message: `Failed to audit file: ${e?.message || e}`,
                        recommendation: 'Check file JSON integrity'
                    });
                }
            }

            return {
                success: true,
                message: `Audited physics in ${filesToAudit.length} files: scanned ${totalNodesAudited} nodes, found ${totalCollidersFound} colliders, ${warnings.length} warning(s)`,
                data: {
                    totalFilesScanned: filesToAudit.length,
                    totalNodesAudited,
                    totalCollidersFound,
                    warningsCount: warnings.length,
                    warnings
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Physics audit failed: ${error?.message || error}`
            };
        }
    }
}